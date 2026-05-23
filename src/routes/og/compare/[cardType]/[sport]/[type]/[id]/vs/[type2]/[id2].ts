/**
 * Compare-card OG image route — server-rendered vertical PNG with
 * both entities' meta in the header (primary top-left, compared
 * top-right) and a pizza chart with the primary stats as solid
 * wedges + the compared stats as a dashed overlay in the same
 * slice.
 *
 * URL: /og/compare/{cardType}/{sport}/{type}/{id}/vs/{type2}/{id2}
 *   - cardType: "compare:{slot}" where slot ∈ CHART_SLOTS
 *   - sport / type / id: primary entity
 *   - type2 / id2: compared entity (same sport)
 *
 * Stats for both entities are scoped to "all" percentiles + per-
 * game (rate-mode share variants can land later). Both entities
 * must share the same `slot` config in `stats-categorizer.ts` for
 * the overlay keys to align.
 */
import type { APIEvent } from "@solidjs/start/server";
import { buildCardSvg } from "@lib/og/build-card";
import { rasterizeSvg } from "@lib/og/rasterize";
import { loadFrameInner } from "@lib/og/load-frame";
import { loadImageAsDataUri } from "@lib/og/load-image";
import { getOgEntityFacts } from "@lib/og/entity-facts.server";
import { pizzaBodySvg, type PizzaStat } from "@lib/og/cards/pizza";
import { getStats } from "@lib/data/stats.server";
import { formatDate } from "@lib/utils/date";
import {
  categorizeForCharts,
  pickPercentiles,
  pickCohortPosition,
  CHART_SLOTS,
  type ChartSlotId,
  type Category,
} from "@lib/utils/stats-categorizer";

export async function GET(event: APIEvent) {
  const params = event.params as Record<string, string | undefined>;
  const cardType = params.cardType;
  const sport = params.sport;
  const type = params.type;
  const id = params.id;
  const type2 = params.type2;
  const id2 = params.id2;

  if (!cardType || !sport || !type || !id || !type2 || !id2) {
    return new Response("Missing path params", { status: 400 });
  }
  if (!cardType.startsWith("compare:")) {
    return new Response(`Expected compare:{slot}, got ${cardType}`, { status: 400 });
  }

  const slot = cardType.slice("compare:".length) as ChartSlotId;
  if (!CHART_SLOTS.includes(slot)) {
    return new Response(`Unknown slot ${slot}`, { status: 400 });
  }

  try {
    const baseUrl = new URL(event.request.url);

    // Five parallel fetches: frame asset, two entity-fact pulls,
    // two stats pulls. Image data URIs depend on entity facts so
    // those resolve after.
    const [frameInnerSvg, primaryFacts, comparedFacts, primaryStats, comparedStats] =
      await Promise.all([
        loadFrameInner(baseUrl),
        getOgEntityFacts(sport, type, id),
        getOgEntityFacts(sport, type2, id2),
        getStats(sport, type, id),
        getStats(sport, type2, id2),
      ]);

    const [primaryImg, comparedImg] = await Promise.all([
      primaryFacts?.imageUrl ? loadImageAsDataUri(primaryFacts.imageUrl) : null,
      comparedFacts?.imageUrl ? loadImageAsDataUri(comparedFacts.imageUrl) : null,
    ]);

    const primary = primaryFacts
      ? {
          name: primaryFacts.name,
          subtitle: primaryFacts.subtitle,
          imageDataUri: primaryImg,
        }
      : null;
    const compared = comparedFacts
      ? {
          name: comparedFacts.name,
          subtitle: comparedFacts.subtitle,
          imageDataUri: comparedImg,
        }
      : null;

    // Per-entity categorization → find the requested slot for each.
    const primaryCat = pickSlot(primaryStats, slot, sport, type);
    const comparedCat = pickSlot(comparedStats, slot, sport, type2);

    const innerSvg = pizzaBodySvg({
      title: primaryCat?.label ?? slot,
      stats: toPizzaStats(primaryCat),
      compared: toPizzaStats(comparedCat),
      cohort: type === "player" ? pickCohortPosition(primaryStats, "all") : null,
    });

    const canonicalUrl = `scoracle.com/profile?sport=${sport.toUpperCase()}&type=${type}&id=${id}&tab=compare&vs=${id2}`;
    const footerRight = [formatDate(new Date().toISOString()), cardType]
      .filter(Boolean)
      .join(" · ");

    const svg = buildCardSvg({
      innerSvg,
      frameInnerSvg,
      primary,
      compared,
      canonicalUrl,
      footerRight,
    });
    const png = await rasterizeSvg(svg, baseUrl);
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

function pickSlot(
  data: Awaited<ReturnType<typeof getStats>>,
  slot: ChartSlotId,
  sport: string,
  type: string,
): Category | null {
  if (!data || !data.stats) return null;
  const percentiles = pickPercentiles(data, "all");
  const cats = categorizeForCharts(
    data.stats,
    percentiles,
    sport,
    type as "player" | "team",
  );
  return cats.find((c) => c.id === slot) ?? null;
}

function toPizzaStats(category: Category | null): PizzaStat[] {
  if (!category) return [];
  const out: PizzaStat[] = [];
  for (const s of category.stats) {
    if (s.percentile != null) {
      out.push({
        key: s.key,
        label: s.label,
        value: s.value ?? "-",
        percentile: s.percentile,
      });
    }
  }
  return out;
}
