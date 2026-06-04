/**
 * Share-card OG image route — server-rendered vertical PNG attached
 * directly to social posts via the Web Share API client dispatcher
 * (`src/lib/share/dispatch.ts`).
 *
 * Pipeline: fetch entity meta + per-card data in parallel → resolve
 * the per-card SVG body → compose into the vertical 5:7 frame via
 * `buildCardSvg` → rasterize via resvg-wasm → return PNG with
 * stale-while-revalidate cache headers.
 *
 * URL: /og/{cardType}/{sport}/{type}/{id}
 *   - cardType "vibe" — VibeCard
 *   - cardType "stats:{slot}" — StatsCard per-category (attack /
 *     possession / defense / discipline / setpiece)
 *
 * Compare cards live at /og/compare/... (separate route) so the
 * two-entity URL shape stays explicit.
 */
import type { APIEvent } from "@solidjs/start/server";
import { buildCardSvg } from "@lib/og/build-card";
import { rasterizeSvg } from "@lib/og/rasterize";
import { loadFrameInner } from "@lib/og/load-frame";
import { loadVibeArt, svgToDataUri } from "@lib/og/load-vibe-art";
import { loadImageAsDataUri } from "@lib/og/load-image";
import { getOgEntityFacts } from "@lib/og/entity-facts.server";
import { vibeBodySvg } from "@lib/og/cards/vibe";
import { pizzaBodySvg, type PizzaStat } from "@lib/og/cards/pizza";
import { escapeXml } from "@lib/og/escape-xml";
import { getVibe } from "@lib/data/vibe.server";
import { getStarline } from "@lib/data/starline.server";
import { getStats } from "@lib/data/stats.server";
import { scoreToArchetype } from "@lib/vibe/archetypes";
import { formatDate } from "@lib/utils/date";
import {
  categorizeForCharts,
  pickPercentiles,
  pickCohortPosition,
  CHART_SLOTS,
  type ChartSlotId,
} from "@lib/utils/stats-categorizer";
import { assetFetchForEvent, type AssetFetch } from "@lib/utils/cloudflare-env";

export async function GET(event: APIEvent) {
  const params = event.params as Record<string, string | undefined>;
  const cardType = params.cardType;
  const sport = params.sport;
  const type = params.type;
  const id = params.id;

  if (!cardType || !sport || !type || !id) {
    return new Response("Missing path params", { status: 400 });
  }

  try {
    // Read bundled assets via the ASSETS binding (prod) — never a self-origin
    // fetch, which loops back through the edge inside a Worker and 522s.
    const fetchAsset = assetFetchForEvent(event);

    const [frameInnerSvg, entityFacts] = await Promise.all([
      loadFrameInner(fetchAsset),
      getOgEntityFacts(sport, type, id),
    ]);

    const entityImageDataUri = entityFacts?.imageUrl
      ? await loadImageAsDataUri(entityFacts.imageUrl)
      : null;
    const primary = entityFacts
      ? {
          name: entityFacts.name,
          subtitle: entityFacts.subtitle,
          imageDataUri: entityImageDataUri,
        }
      : null;

    const resolved = await resolveCardContent(cardType, sport, type, id, fetchAsset);

    const canonicalUrl = `scoracle.com/profile?sport=${sport.toUpperCase()}&type=${type}&id=${id}&tab=${tabForCard(cardType)}`;
    const footerRight = [resolved.date, cardType].filter(Boolean).join(" · ");

    const svg = buildCardSvg({
      innerSvg: resolved.innerSvg,
      frameInnerSvg,
      primary,
      canonicalUrl,
      footerRight,
      cornerLabel: resolved.cornerLabel,
      hideFooter: resolved.hideFooter,
    });
    const png = await rasterizeSvg(svg, fetchAsset);
    // Cast: TS sees Uint8Array<ArrayBufferLike>, BodyInit accepts ArrayBufferView
    // at runtime — pure typing quirk in TS 5.7+ generic Uint8Array.
    return new Response(png as unknown as BodyInit, {
      headers: {
        "Content-Type": "image/png",
        "Cache-Control": "public, max-age=300, stale-while-revalidate=86400",
      },
    });
  } catch (err) {
    const message = err instanceof Error ? err.message : String(err);
    return new Response(`OG render failed: ${message}`, {
      status: 500,
      headers: { "Content-Type": "text/plain" },
    });
  }
}

interface ResolvedCardContent {
  innerSvg?: string;
  date?: string;
  cornerLabel?: string;
  hideFooter?: boolean;
}

async function resolveCardContent(
  cardType: string,
  sport: string,
  type: string,
  id: string,
  fetchAsset: AssetFetch,
): Promise<ResolvedCardContent> {
  if (cardType === "vibe") {
    const vibe = await getVibe(sport, type, id);
    if (!vibe || vibe.sentiment == null) return {};
    const archetype = scoreToArchetype(vibe.sentiment);
    if (!archetype) return {};
    const artSvg = await loadVibeArt(archetype.slug, fetchAsset);
    return {
      innerSvg: vibeBodySvg({
        score: vibe.sentiment,
        archetype,
        vibeArtDataUri: svgToDataUri(artSvg),
        modelVersion: vibe.model_version,
        generatedAt: vibe.generated_at,
      }),
      date: formatDate(vibe.generated_at),
      cornerLabel: archetype.numeral,
    };
  }

  if (cardType.startsWith("stats:")) {
    const slot = cardType.slice("stats:".length) as ChartSlotId;
    if (!CHART_SLOTS.includes(slot)) return {};
    return resolveStatsSlot(slot, sport, type, id);
  }

  // Default (composite + any profile tab without a dedicated artifact): the
  // meta-widget score row, so a shared profile never renders an empty card.
  const [starline, vibe] = await Promise.all([
    getStarline(sport, type, id),
    getVibe(sport, type, id),
  ]);
  const r = starline?.rating;
  const scores: MetaScore[] = [];
  if (r) {
    if (r.rating_composite_rank != null) {
      scores.push({ label: "Composite", value: r.rating_composite_rank });
    }
    // Specialist = the specialty skill's own percentile (matches the card), with
    // the specialty name as the sub-label.
    const peak = r.rating_breakdown?.find((d) => d.is_specialty);
    if (peak?.pct != null) {
      scores.push({ label: "Specialist", value: peak.pct, sublabel: r.rating_specialty });
    }
  }
  if (vibe && vibe.sentiment != null) {
    scores.push({ label: "Vibe", value: vibe.sentiment });
  }
  if (scores.length === 0) return {};
  // Clean profile-share card: just the entity header + score row, no footer/URL.
  return {
    innerSvg: metaBodySvg(scores),
    hideFooter: true,
  };
}

async function resolveStatsSlot(
  slot: ChartSlotId,
  sport: string,
  type: string,
  id: string,
): Promise<ResolvedCardContent> {
  const data = await getStats(sport, type, id);
  if (!data || !data.stats) return {};
  const percentiles = pickPercentiles(data, "all");
  const categories = categorizeForCharts(
    data.stats,
    percentiles,
    sport,
    type as "player" | "team",
  );
  const cat = categories.find((c) => c.id === slot);
  if (!cat) return {};

  const stats: PizzaStat[] = [];
  for (const s of cat.stats) {
    if (s.percentile != null) {
      stats.push({
        key: s.key,
        label: s.label,
        value: s.value ?? "-",
        percentile: s.percentile,
      });
    }
  }

  const cohort =
    type === "player" ? pickCohortPosition(data, "all") : null;

  return {
    innerSvg: pizzaBodySvg({
      title: cat.label,
      stats,
      cohort,
    }),
    date: formatDate(new Date().toISOString()),
  };
}

function tabForCard(cardType: string): string {
  if (cardType === "vibe") return "vibes";
  if (cardType.startsWith("stats")) return "stats";
  if (cardType.startsWith("compare")) return "compare";
  if (cardType === "traits") return "traits";
  return cardType;
}

// ── Meta-widget body (the default profile-share card) ───────────────────────
// The entity's three pillar scores (Composite / Specialist / Vibe), mirroring
// EntityMeta. Rendered inline here — the handler renders the meta widget as an
// OG image; no dedicated card module.
interface MetaScore {
  label: string;
  /** 0-100 percentile (Composite/Specialist) or 0-100 sentiment (Vibe). */
  value: number;
  /** Optional sub-label under the score (e.g. the specialty name). */
  sublabel?: string | null;
}

const META_TIER_HEX: Record<string, string> = {
  elite: "#7a9b76", above: "#6b8fc7", average: "#c9a04a", below: "#c47a5d", poor: "#a85252",
};
function metaTierColor(p: number): string {
  if (p >= 81) return META_TIER_HEX.elite;
  if (p >= 61) return META_TIER_HEX.above;
  if (p >= 41) return META_TIER_HEX.average;
  if (p >= 21) return META_TIER_HEX.below;
  return META_TIER_HEX.poor;
}

function metaBodySvg(scores: MetaScore[]): string {
  const valid = scores.filter((s) => s.value != null);
  if (valid.length === 0) {
    return `<g><text x="400" y="380" font-family="PT Serif" font-style="italic"
      font-size="28" fill="#9C9890" text-anchor="middle">No rating yet</text></g>`;
  }
  const n = valid.length;
  const cells = valid
    .map((s, i) => {
      const cx = (800 * (i + 1)) / (n + 1);
      const color = metaTierColor(s.value);
      const sub = s.sublabel
        ? `<text x="${cx}" y="510" font-family="PT Serif" font-style="italic"
            font-size="24" fill="#5C5853" text-anchor="middle">${escapeXml(s.sublabel)}</text>`
        : "";
      return `
      <text x="${cx}" y="410" font-family="PT Serif" font-size="110" font-weight="700"
        fill="${color}" text-anchor="middle">${Math.round(s.value)}</text>
      <text x="${cx}" y="465" font-family="PT Serif" font-size="28" fill="#171717"
        text-anchor="middle" letter-spacing="2">${escapeXml(s.label.toUpperCase())}</text>
      ${sub}`;
    })
    .join("\n");
  return `<g>
    <text x="400" y="150" font-family="PT Serif" font-size="32" fill="#171717"
      text-anchor="middle" letter-spacing="3">SEASON RATING</text>
    ${cells}
  </g>`;
}
