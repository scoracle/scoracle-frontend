/**
 * og-bodies — the server-side OG/share render map, keyed by CardId.
 *
 * The OG route is a thin pass-through: it looks the cardType up here, calls the
 * body fn (which fetches the card's data and renders the shared `bodies/*` SVG),
 * and composes the result into the tarot frame. No per-card logic in the handler
 * (the "thin handler" Scott always pictured). Server-safe — imports only pure
 * SVG body modules + `*.server` data fns, NO Solid components.
 *
 * Canvas cards render their own body; cards without a bespoke body (starline for
 * now; any ledger / profile share) fall to the Meta score-row. Adding a bespoke
 * body later = swap one entry here. See ~/scoracleWiki/wiki/Architecture/Card Pillar.md.
 */
import { getVibe } from "@lib/data/vibe.server";
import { getStarline } from "@lib/data/starline.server";
import { scoreToArchetype } from "@lib/vibe/archetypes";
import { loadVibeArt, svgToDataUri } from "@lib/og/load-vibe-art";
import type { AssetFetch } from "@lib/utils/cloudflare-env";
import { vibeBodySvg } from "./bodies/vibe";
import { metaBodySvg, type MetaScore } from "./bodies/meta";
import { compositeBodySvg, type CompositeStat } from "./bodies/composite";
import { specialistBodySvg } from "./bodies/specialist";
import { scarcity } from "./scarcity";
import { pillarLabel } from "./card-meta";
import type { EntityType } from "../types";

export interface OgBody {
  innerSvg: string;
  cornerLabel?: string;
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
  const starline = await getStarline(ctx.sport, ctx.type, ctx.id);
  const r = starline?.rating;
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
  const starline = await getStarline(ctx.sport, ctx.type, ctx.id);
  const peak = (starline?.rating?.rating_breakdown ?? []).find((d) => d.is_specialty);
  if (!peak || peak.pct == null) return null;
  return {
    innerSvg: specialistBodySvg({ label: peak.label, pct: peak.pct, scarcity: scarcity(peak.pct) }),
  };
}

/** Default profile-share artifact: the three pillar scores, no footer/URL. */
async function metaBody(ctx: OgBodyCtx): Promise<OgBody | null> {
  const [starline, vibe] = await Promise.all([
    getStarline(ctx.sport, ctx.type, ctx.id),
    getVibe(ctx.sport, ctx.type, ctx.id),
  ]);
  const type = ctx.type as EntityType;
  const r = starline?.rating;
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
  starline: metaBody, // interim — bespoke sparkline body is the fast-follow
};

/** The fallback body when a cardType has no bespoke entry (profile share, ledgers). */
export const OG_DEFAULT_BODY = metaBody;
