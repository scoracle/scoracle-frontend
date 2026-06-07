/**
 * og-bodies — the server-side OG/share render map, keyed by CardId.
 *
 * The OG route is a thin pass-through: it looks the cardType up here, calls the
 * body fn (which fetches the card's data and renders the shared `bodies/*` SVG),
 * and composes the result into the tarot frame. No per-card logic in the handler
 * (the "thin handler" Scott always pictured). Server-safe — imports only pure
 * SVG body modules + `*.server` data fns, NO Solid components.
 *
 * Canvas cards render their own body; cards without a bespoke body (sparkline for
 * now; any ledger / profile share) fall to the Meta score-row. Adding a bespoke
 * body later = swap one entry here. See ~/scoracleWiki/wiki/Architecture/Card Pillar.md.
 */
import { getVibe } from "@lib/data/vibe.server";
import { getSparkline } from "@lib/data/sparkline.server";
import { getTrends } from "@lib/data/trends.server";
import {
  getLeaderboard,
  getVibesLeaderboard,
  getNewsLeaderboard,
  getTransfersLeaderboard,
} from "@lib/data/leaderboard.server";
import { scoreToArchetype } from "@lib/vibe/archetypes";
import { loadVibeArt, svgToDataUri } from "@lib/og/load-vibe-art";
import type { AssetFetch } from "@lib/utils/cloudflare-env";
import { vibeBodySvg } from "./bodies/vibe";
import { metaBodySvg, type MetaScore } from "./bodies/meta";
import { compositeBodySvg, type CompositeStat } from "./bodies/composite";
import { specialistBodySvg } from "./bodies/specialist";
import { sparklineBodySvg } from "./bodies/sparkline";
import { leaderboardBodySvg, type LeaderboardBodyRow } from "./bodies/leaderboard";
import { tierHex } from "./bodies/tier";
import { scarcity } from "./scarcity";
import { pillarLabel } from "./card-meta";
import type { EntityType } from "../types";

export interface OgBody {
  innerSvg: string;
  cornerLabel?: string;
  /** Title block for non-entity cards (e.g. the leaderboard) that have no entity
   *  header — the handler uses it as the centered header when there's no entity. */
  header?: { name: string; subtitle?: string };
}

export interface OgBodyCtx {
  sport: string;
  type: string;
  id: string;
  fetchAsset: AssetFetch;
}

// Composite pizza membership mirrors CompositeCard: composite contributors
// (in_comp) + pure-display datapoints (!in_spec), pizza facets only, GK-only
// slices dropped for outfielders (NULL value).
const PIZZA_FACETS = ["offense", "defense", "special", "all"];
const GK_LABELS = new Set(["Shot-Stopping", "Penalty Saves", "Punching", "High Claims"]);

async function vibeBody(ctx: OgBodyCtx): Promise<OgBody | null> {
  const vibe = await getVibe(ctx.sport, ctx.type, ctx.id);
  if (!vibe || vibe.sentiment == null) return null;
  const archetype = scoreToArchetype(vibe.sentiment);
  if (!archetype) return null;
  const artSvg = await loadVibeArt(archetype.slug, ctx.fetchAsset);
  return {
    innerSvg: vibeBodySvg({
      score: vibe.sentiment,
      archetype,
      vibeArtDataUri: svgToDataUri(artSvg),
      modelVersion: vibe.model_version,
      generatedAt: vibe.generated_at,
    }),
    cornerLabel: archetype.numeral,
  };
}

async function compositeBody(ctx: OgBodyCtx): Promise<OgBody | null> {
  const sparkline = await getSparkline(ctx.sport, ctx.type, ctx.id);
  const r = sparkline?.rating;
  if (!r || r.rating_composite_rank == null) return metaBody(ctx);
  const stats: CompositeStat[] = (r.rating_breakdown ?? [])
    .filter(
      (d) =>
        (d.in_comp || !d.in_spec) &&
        PIZZA_FACETS.includes(d.facet) &&
        !(GK_LABELS.has(d.label) && d.value == null),
    )
    .map((d) => ({ label: d.label, pct: d.pct, value: d.value == null ? "—" : String(d.value) }));
  if (stats.length === 0) return metaBody(ctx);
  const heading = (pillarLabel("composite", ctx.type as EntityType) ?? "Composite").toUpperCase();
  return { innerSvg: compositeBodySvg({ composite: r.rating_composite_rank, heading, stats }) };
}

async function specialistBody(ctx: OgBodyCtx): Promise<OgBody | null> {
  const sparkline = await getSparkline(ctx.sport, ctx.type, ctx.id);
  const peak = (sparkline?.rating?.rating_breakdown ?? []).find((d) => d.is_specialty);
  if (!peak || peak.pct == null) return null;
  return {
    innerSvg: specialistBodySvg({ label: peak.label, pct: peak.pct, scarcity: scarcity(peak.pct) }),
  };
}

/** Season Trends artifact: two stacked sparklines (General/Rating + Vibe) with
 *  their tier-colored scores — the share twin of the in-app TrendsCard. Reads
 *  getSparkline (per-event composite line) + getTrends (daily vibe line). Falls
 *  to the Meta default when neither series has data. */
async function trendsBody(ctx: OgBodyCtx): Promise<OgBody | null> {
  const [sparkline, trends] = await Promise.all([
    getSparkline(ctx.sport, ctx.type, ctx.id),
    getTrends(ctx.sport, ctx.type, ctx.id),
  ]);
  const type = ctx.type as EntityType;

  const generalSeries = [...(sparkline?.events ?? [])]
    .filter((e) => e.rating_composite_pct != null)
    .sort((a, b) => new Date(a.start_time).getTime() - new Date(b.start_time).getTime())
    .map((e) => e.rating_composite_pct);
  const generalScore = sparkline?.rating?.rating_composite_rank ?? null;

  const vibeRows = [...(trends?.entity_season_vibe_series ?? [])].sort(
    (a, b) => new Date(a.date).getTime() - new Date(b.date).getTime(),
  );
  const vibeSeries = vibeRows.map((v) => v.sentiment_avg);
  const vibeScore = vibeSeries.length ? vibeSeries[vibeSeries.length - 1] : null;

  if (generalSeries.length === 0 && vibeSeries.length === 0) return metaBody(ctx);

  return {
    innerSvg: sparklineBodySvg({
      generalScore,
      generalLabel: pillarLabel("composite", type) ?? "General",
      generalSeries,
      vibeScore,
      vibeLabel: pillarLabel("vibes", type) ?? "Vibe",
      vibeSeries,
    }),
  };
}

/** Default profile-share artifact: the three pillar scores, no footer/URL. */
async function metaBody(ctx: OgBodyCtx): Promise<OgBody | null> {
  const [sparkline, vibe] = await Promise.all([
    getSparkline(ctx.sport, ctx.type, ctx.id),
    getVibe(ctx.sport, ctx.type, ctx.id),
  ]);
  const type = ctx.type as EntityType;
  const r = sparkline?.rating;
  const scores: MetaScore[] = [];
  if (r) {
    if (r.rating_composite_rank != null) {
      scores.push({ label: pillarLabel("composite", type)!, value: r.rating_composite_rank });
    }
    // Specialist pillar is player-only (no specialist teams).
    if (type === "player") {
      const peak = r.rating_breakdown?.find((d) => d.is_specialty);
      if (peak?.pct != null) {
        scores.push({ label: pillarLabel("specialist", type)!, value: peak.pct, sublabel: r.rating_specialty });
      }
    }
  }
  if (vibe && vibe.sentiment != null) {
    scores.push({ label: pillarLabel("vibes", type)!, value: vibe.sentiment });
  }
  if (scores.length === 0) return null;
  return { innerSvg: metaBodySvg(scores) };
}

/** Leaderboard snapshot artifact: the sport's top-N for a board, rendered as a
 *  ranked list. URL convention: /og/leaderboard/{sport}/{type}/{board} — `type`
 *  is the entity_type (player|team), `id` is the board (composite|vibes|news|
 *  transfers). The title rides in the header (no entity). Null when the board is
 *  empty. */
async function leaderboardBody(ctx: OgBodyCtx): Promise<OgBody | null> {
  const board = ctx.id;
  const et = ctx.type === "team" ? "team" : "player";
  const sportUpper = ctx.sport.toUpperCase();

  let rows: LeaderboardBodyRow[] = [];
  let boardLabel = "Rating";

  if (board === "vibes") {
    boardLabel = "Vibes";
    const r = await getVibesLeaderboard(ctx.sport, et, 10);
    rows = (r?.leaders ?? []).map((e) => ({
      rank: e.rank, name: e.name, metric: String(e.score), metricColor: tierHex(e.score),
    }));
  } else if (board === "news") {
    boardLabel = "News";
    const r = await getNewsLeaderboard(ctx.sport, et, 30, 10);
    rows = (r?.leaders ?? []).map((e) => ({
      rank: e.rank, name: e.name, metric: e.score.toLocaleString(), metricColor: null,
    }));
  } else if (board === "transfers") {
    boardLabel = "Transfers";
    const r = await getTransfersLeaderboard(ctx.sport, 10);
    rows = (r?.rumors ?? []).map((t) => ({
      rank: t.rank, name: t.player_name, metric: String(t.heat), metricColor: tierHex(t.heat),
    }));
  } else {
    const r = await getLeaderboard(ctx.sport, et, "composite", null, 10);
    rows = (r?.leaders ?? []).map((e) => ({
      rank: e.rank, name: e.name, metric: e.rating_composite_rank.toFixed(1),
      metricColor: tierHex(e.rating_composite_rank),
    }));
  }

  if (rows.length === 0) return null;
  return {
    innerSvg: leaderboardBodySvg(rows),
    header: { name: `${sportUpper} ${boardLabel}`, subtitle: "LEADERBOARD" },
  };
}

/**
 * Dispatch map. Keys are CardIds (== the OG `:cardType`). `vibe` is an alias for
 * `vibes` so any in-the-wild cached `/og/vibe/...` links keep resolving. Card
 * types absent here fall to the Meta default in the handler.
 */
export const OG_BODIES: Record<string, (ctx: OgBodyCtx) => Promise<OgBody | null>> = {
  vibes: vibeBody,
  vibe: vibeBody,
  composite: compositeBody,
  specialist: specialistBody,
  trends: trendsBody, // bespoke season sparkline (General/Rating + Vibe)
  starline: trendsBody, // alias for cached /og/starline/... links (renamed → trends)
  leaderboard: leaderboardBody, // sport-wide top-N snapshot (non-entity card)
};

/** The fallback body when a cardType has no bespoke entry (profile share, ledgers). */
export const OG_DEFAULT_BODY = metaBody;
