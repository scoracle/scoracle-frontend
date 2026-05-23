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
 *   - cardType: "vibe" today; "stats:attack" / "stats:defense" / etc.
 *     land in the StatsCard wiring commit.
 *
 * Compare cards have their own route at /og/compare/... (separate
 * commit) so the two-entity URL shape stays explicit.
 */
import type { APIEvent } from "@solidjs/start/server";
import { buildCardSvg } from "@lib/og/build-card";
import { rasterizeSvg } from "@lib/og/rasterize";
import { loadFrameInner } from "@lib/og/load-frame";
import { loadVibeArt, svgToDataUri } from "@lib/og/load-vibe-art";
import { loadImageAsDataUri } from "@lib/og/load-image";
import { getOgEntityFacts } from "@lib/og/entity-facts.server";
import { vibeBodySvg } from "@lib/og/cards/vibe";
import { getVibe, type VibeRow } from "@lib/data/vibe.server";
import { scoreToArchetype } from "@lib/vibe/archetypes";
import { formatDate } from "@lib/utils/date";

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
    const baseUrl = new URL(event.request.url);

    const [frameInnerSvg, entityFacts, vibe] = await Promise.all([
      loadFrameInner(baseUrl),
      getOgEntityFacts(sport, type, id),
      cardType === "vibe" ? getVibe(sport, type, id) : Promise.resolve<VibeRow | null>(null),
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

    const resolved = await resolveCardContent(cardType, vibe, baseUrl);

    const canonicalUrl = `scoracle.com/profile?sport=${sport.toUpperCase()}&type=${type}&id=${id}&tab=${tabForCard(cardType)}`;
    const footerRight = [resolved.date, cardType].filter(Boolean).join(" · ");

    const svg = buildCardSvg({
      innerSvg: resolved.innerSvg,
      frameInnerSvg,
      primary,
      canonicalUrl,
      footerRight,
      cornerLabel: resolved.cornerLabel,
    });
    const png = await rasterizeSvg(svg, baseUrl);
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
}

async function resolveCardContent(
  cardType: string,
  vibe: VibeRow | null,
  baseUrl: URL,
): Promise<ResolvedCardContent> {
  if (cardType === "vibe") {
    if (!vibe || vibe.sentiment == null) return {};
    const archetype = scoreToArchetype(vibe.sentiment);
    if (!archetype) return {};
    const artSvg = await loadVibeArt(archetype.slug, baseUrl);
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
  return {};
}

function tabForCard(cardType: string): string {
  if (cardType === "vibe") return "vibes";
  if (cardType.startsWith("stats")) return "stats";
  if (cardType.startsWith("compare")) return "compare";
  if (cardType === "traits") return "traits";
  return cardType;
}
