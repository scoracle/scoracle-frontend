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
import { getSigil } from "@lib/data/sigil.server";
import { getStats, ratingForMode, type RatingDatapoint, type RatingView } from "@lib/data/stats.server";
import { getMomentum } from "@lib/data/momentum.server";
import {
  getLeaderboard,
  getVibesLeaderboard,
  getTransfersLeaderboard,
} from "@lib/data/leaderboard.server";
import { scoreToArchetype } from "@lib/vibe/archetypes";
import { loadVibeArt, svgToDataUri } from "@lib/og/load-vibe-art";
import type { AssetFetch } from "@lib/utils/cloudflare-env";
import { vibeBodySvg } from "./bodies/vibe";
import { metaBodySvg, type MetaScore } from "./bodies/meta";
import { compositeBodySvg, type CompositeStat } from "./bodies/composite";
import { compareBodySvg, type CompareBodyStat } from "./bodies/compare";
import { sigilBodySvg } from "./bodies/sigil";
import { sparklineBodySvg } from "./bodies/sparkline";
import { leaderboardBodySvg, type LeaderboardBodyRow } from "./bodies/leaderboard";
import { tierHex } from "./bodies/tier";
import { scarcity } from "./scarcity";
import { pillarLabel, transferNoun } from "./card-meta";
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
  /** Per-X rate mode (migration 042): "per_36" | "per_90" | "per_game". Default
   *  ("default" / absent) → the season-total columns. */
  rate?: string;
  /** Cohort re-rank scope: "position" | "conference" | "division" | "league".
   *  Absent / "all" → the positionless composite rank. */
  scope?: string;
  /** Compare-target entity id (compare card) — the entity shown beside the primary. */
  vs?: string;
}

// Composite pizza membership mirrors StatsCard: composite contributors
// (in_comp) + pure-display datapoints (!in_spec), pizza facets only, GK-only
// slices dropped for outfielders (NULL value).
const PIZZA_FACETS = ["offense", "defense", "special", "all"];
const GK_LABELS = new Set(["Shot-Stopping", "Penalty Saves", "Punching", "High Claims"]);
const SCOPE_COHORT: Record<string, string> = {
  position: "their position", conference: "their conference",
  division: "their division", league: "their league",
};

/** Pizza/butterfly membership — mirrors StatsCard's `eligible`. */
const eligibleStat = (d: RatingDatapoint): boolean =>
  (d.in_comp || !d.in_spec) && PIZZA_FACETS.includes(d.facet) && !(GK_LABELS.has(d.label) && d.value == null);

/** The scoped composite for the selected cohort; "all"/absent → positionless rank. */
const scopedComposite = (v: RatingView, scope?: string): number =>
  scope && scope !== "all" && v.scoped_ranks?.[scope] != null ? v.scoped_ranks[scope] : (v.composite_rank ?? 0);

/** Per-datapoint percentile honoring the cohort scope (backend migration 043) —
 *  the slice re-rank parallel to scopedComposite; falls back to the positionless
 *  pct when the player has no cohort. Mirrors StatsCard's `slicePct`. */
const slicePct = (d: RatingDatapoint, scope?: string): number =>
  scope && scope !== "all" && d.scoped_pct?.[scope] != null ? d.scoped_pct[scope] : d.pct;

async function vibeBody(ctx: OgBodyCtx): Promise<OgBody | null> {
  const vibe = (await getSigil(ctx.sport, ctx.type, ctx.id))?.current;
  if (!vibe || vibe.score == null) return null;
  const archetype = scoreToArchetype(vibe.score);
  if (!archetype) return null;
  const artSvg = await loadVibeArt(archetype.slug, ctx.fetchAsset);
  return {
    innerSvg: vibeBodySvg({
      score: vibe.score,
      archetype,
      vibeArtDataUri: svgToDataUri(artSvg),
      modelVersion: vibe.model_version,
      generatedAt: vibe.generated_at,
    }),
    cornerLabel: archetype.numeral,
  };
}

async function compositeBody(ctx: OgBodyCtx): Promise<OgBody | null> {
  const sparkline = await getStats(ctx.sport, ctx.type, ctx.id);
  const r = sparkline?.rating;
  if (!r || r.rating_composite_rank == null) return metaBody(ctx);
  const view = ratingForMode(r, ctx.rate ?? "default"); // per-X mode
  const stats: CompositeStat[] = (view.breakdown ?? [])
    .filter(eligibleStat)
    .map((d) => ({ label: d.label, pct: slicePct(d, ctx.scope), value: d.value == null ? "—" : String(d.value) }));
  if (stats.length === 0) return metaBody(ctx);
  const heading = (pillarLabel("stats", ctx.type as EntityType) ?? "Stats").toUpperCase();
  const cohort = ctx.scope && ctx.scope !== "all" ? SCOPE_COHORT[ctx.scope] ?? null : null;
  return {
    innerSvg: compositeBodySvg({ composite: scopedComposite(view, ctx.scope), heading, stats, cohort }),
  };
}

async function sigilBody(ctx: OgBodyCtx): Promise<OgBody | null> {
  const sparkline = await getStats(ctx.sport, ctx.type, ctx.id);
  const r = sparkline?.rating;
  const peak = r ? ratingForMode(r, ctx.rate ?? "default").breakdown.find((d) => d.is_specialty) : undefined;
  if (!peak || peak.pct == null) return null;
  return {
    innerSvg: sigilBodySvg({ label: peak.label, pct: peak.pct, scarcity: scarcity(peak.pct) }),
  };
}

/** Compare card: the butterfly twin of the in-app comparison. Fetches the vs
 *  entity, applies the SAME per-X mode + scope to both, renders the mirror chart.
 *  Falls back to the single composite when there's no vs target. */
async function compareBody(ctx: OgBodyCtx): Promise<OgBody | null> {
  if (!ctx.vs) return compositeBody(ctx);
  // Names + meta render in the card's dual header (composed by the route from
  // entity facts); here we only need the ratings for the butterfly + composites.
  const [aSpark, bSpark] = await Promise.all([
    getStats(ctx.sport, ctx.type, ctx.id),
    getStats(ctx.sport, ctx.type, ctx.vs),
  ]);
  const ar = aSpark?.rating;
  const br = bSpark?.rating;
  if (!ar || !br) return compositeBody(ctx);
  const av = ratingForMode(ar, ctx.rate ?? "default");
  const bv = ratingForMode(br, ctx.rate ?? "default");
  const aMap = new Map(av.breakdown.filter(eligibleStat).map((d) => [d.label, d]));
  const bMap = new Map(bv.breakdown.filter(eligibleStat).map((d) => [d.label, d]));
  const labels = [...new Set([...aMap.keys(), ...bMap.keys()])];
  const stats: CompareBodyStat[] = labels.map((label) => {
    const da = aMap.get(label);
    const db = bMap.get(label);
    return {
      label,
      leftValue: da?.value == null ? "—" : String(da.value), leftPct: da ? slicePct(da, ctx.scope) : null,
      rightValue: db?.value == null ? "—" : String(db.value), rightPct: db ? slicePct(db, ctx.scope) : null,
    };
  });
  return {
    innerSvg: compareBodySvg({
      aComposite: scopedComposite(av, ctx.scope),
      bComposite: scopedComposite(bv, ctx.scope),
      stats,
    }),
  };
}

/** Season Trends artifact: two stacked sparklines (General/Rating + Vibe) with
 *  their tier-colored scores — the share twin of the in-app MomentumCard. Reads
 *  getStats (per-event composite line) + getMomentum (daily vibe line). Falls
 *  to the Meta default when neither series has data. */
async function trendsBody(ctx: OgBodyCtx): Promise<OgBody | null> {
  const [sparkline, trends] = await Promise.all([
    getStats(ctx.sport, ctx.type, ctx.id),
    getMomentum(ctx.sport, ctx.type, ctx.id),
  ]);
  const type = ctx.type as EntityType;

  const generalSeries = [...(sparkline?.events ?? [])]
    .filter((e) => e.rating_composite_pct != null)
    .sort((a, b) => new Date(a.start_time).getTime() - new Date(b.start_time).getTime())
    .map((e) => e.rating_composite_pct);
  const generalScore = sparkline?.rating?.rating_composite_rank ?? null;

  const vibeRows = [...(trends?.entity_season_sentiment_series ?? [])].sort(
    (a, b) => new Date(a.date).getTime() - new Date(b.date).getTime(),
  );
  const vibeSeries = vibeRows.map((v) => v.sentiment_avg);
  const vibeScore = vibeSeries.length ? vibeSeries[vibeSeries.length - 1] : null;

  if (generalSeries.length === 0 && vibeSeries.length === 0) return metaBody(ctx);

  return {
    innerSvg: sparklineBodySvg({
      generalScore,
      generalLabel: pillarLabel("rating", type) ?? "Rating",
      generalSeries,
      vibeScore,
      vibeLabel: "Vibe",
      vibeSeries,
    }),
  };
}

/** Default profile-share artifact: the three pillar scores, no footer/URL. */
async function metaBody(ctx: OgBodyCtx): Promise<OgBody | null> {
  const [sparkline, vibe] = await Promise.all([
    getStats(ctx.sport, ctx.type, ctx.id),
    getSigil(ctx.sport, ctx.type, ctx.id),
  ]);
  const type = ctx.type as EntityType;
  const r = sparkline?.rating;
  const scores: MetaScore[] = [];
  if (r) {
    if (r.rating_composite_rank != null) {
      scores.push({ label: pillarLabel("rating", type)!, value: r.rating_composite_rank });
    }
    // Specialist pillar is player-only (no specialist teams).
    if (type === "player") {
      const peak = r.rating_breakdown?.find((d) => d.is_specialty);
      if (peak?.pct != null) {
        scores.push({ label: pillarLabel("sigil", type)!, value: peak.pct, sublabel: r.rating_peak_label});
      }
    }
  }
  if (vibe?.current && vibe.current.score != null) {
    scores.push({ label: "Vibe", value: vibe.current.score });
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
  } else if (board === "transfers") {
    boardLabel = transferNoun(ctx.sport);
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
  // Sigil-convergence cardTypes (with back-compat aliases for cached links):
  stats: compositeBody, // the Stats card (composite + scopes)
  composite: compositeBody, // alias (old cardType)
  rating: sigilBody, // the Rating card (Gemma's statistical read — the old strength body)
  specialist: sigilBody, // alias (old cardType)
  sigil: vibeBody, // the crown Sigil (synthesis — the old "vibes" body)
  vibes: vibeBody, // alias (old cardType)
  vibe: vibeBody, // alias (old cardType)
  momentum: trendsBody, // the Momentum card (rating + vibe trajectory)
  trends: trendsBody, // alias (old cardType)
  starline: trendsBody, // alias (old cardType)
  compare: compareBody, // butterfly vs-comparison (needs ?vs=)
  leaderboard: leaderboardBody, // sport-wide top-N snapshot (non-entity card)
};

/** The fallback body when a cardType has no bespoke entry (profile share, ledgers). */
export const OG_DEFAULT_BODY = metaBody;
