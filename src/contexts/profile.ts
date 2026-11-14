import { type Accessor } from "solid-js";
import type { EntityType } from "../lib/types";
// Rendered profile tabs — the character cards in table order (locked
// 2026-07-22; the Scouting/Profile split, 2026-09-05): Scouting is the
// Scout's PROSE report; Profile is his chart — the pizza with the per-x
// scopes, "just a visual tool" (Scott). Share/OG-only card ids live in
// `lib/cards/card-meta.ts`.
export type ProfileTab = "scouting" | "profile" | "narratives" | "transfers" | "vibe" | "momentum" | "sigil";
/**
 * Rating scope (cohort re-rank). `all` = positionless rating_rank;
 * the others re-rank the composite WITHIN the cohort (from rating_scoped_ranks):
 * position (players); conference / division (NBA/NFL teams); league (football
 * teams). Applies to Composite + Leaders only.
 */
export type RatingScope = "all" | "position" | "conference" | "division" | "league";
/**
 * Per-X rate mode (PLAYERS). `default` is the sport's base column set — for NBA
 * that's per-game averages, for NFL/football season totals. The alternates re-rate
 * within the per-X population, served in the rating_modes block: NBA `per_36` +
 * `per_season` (migration 045), football `per_90` + `per_game` (045), NFL `per_game`
 * (042). The uniform Per Season / Per Game / Per-X vocabulary maps onto these per
 * sport (see ReadingTable RATE_OPTIONS). URL-synced via `?rate=`; the Composite/
 * Specialist cards switch which rating_modes block they render. Teams have no rate mode.
 */
export type RateMode = "default" | "per_36" | "per_90" | "per_game" | "per_season";
/**
 * Scoring model (PLAYERS) — the orthogonal Regular | Fantasy axis (backend migration
 * 046). `regular` = the z-rating composite headline; `fantasy` = box-score fantasy
 * points (PPR NFL / DraftKings NBA) as the headline, ranked by percentile. The per-X
 * rate selector cross-applies (fantasy points total / per game / per-x). URL-synced
 * via `?model=`; only the Composite headline switches — the Specialist pillar stays
 * z-based. Shown only for fantasy-supported sports (nba/nfl).
 */
export type ScoreModel = "regular" | "fantasy";
export interface ProfileContextValue {
    /** Lowercase sport id, e.g. "nba". Fixed for the document lifetime. */
    sport: Accessor<string>;
    /** Entity discriminator. Reactive (see `sport`). */
    type: Accessor<EntityType>;
    /** Entity id from the URL. Reactive (see `sport`). */
    id: Accessor<string>;
    /** Currently selected destination card. URL-owned (`?tab=`). */
    activeTab: Accessor<ProfileTab>;
    setActiveTab: (next: ProfileTab) => void;
    /**
     * Selected season. `null` means "let the backend serve the entity's
     * most recent season"; numeric values must come from a stats response's
     * `meta.available_seasons` to be guaranteed valid. Setter syncs to
     * `?season=` on the URL so reload + share preserve selection.
     */
    season: Accessor<number | null>;
    setSeason: (next: number | null) => void;
    /** Selected rating scope (cohort re-rank); URL-synced via `?scope=`. */
    scope: Accessor<RatingScope>;
    setScope: (next: RatingScope) => void;
    /** Selected per-X rate mode (players); URL-synced via `?rate=`. "default" = totals. */
    rateMode: Accessor<RateMode>;
    setRateMode: (next: RateMode) => void;
    /** Selected scoring model (Regular | Fantasy); URL-synced via `?model=`. "regular" = z-rating. */
    scoreModel: Accessor<ScoreModel>;
    setScoreModel: (next: ScoreModel) => void;
    /** Compare-target entity id; URL-synced via `?vs=`. null = no comparison. When
     *  set, the Composite renders this entity beside the primary. */
    vs: Accessor<string | null>;
    setVs: (next: string | null) => void;
}
