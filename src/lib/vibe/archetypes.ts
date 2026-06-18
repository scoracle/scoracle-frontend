/**
 * Major-arcana band mapping for the SigilCard.
 *
 * Backend (Gemma) emits a numeric sentiment score 1-100. The frontend maps
 * the score to one of eleven major-arcana archetypes — the visual + textual
 * representation on the vibe card. Boundaries are discrete: a score of 84
 * is The Star, 85 is The Sun (same player, hard cliff). The score number
 * provides the granularity; the archetype provides the meaning.
 *
 * Source-of-truth: ~/scoracleWiki/wiki/Architecture/Vibe Score Surface.md
 *
 * Keep this list in score-descending order (95-100 first). scoreToArchetype()
 * returns the first matching band when scanning top-down.
 */

export interface Archetype {
  /** Inclusive lower bound of the score range. */
  min: number;
  /** Inclusive upper bound of the score range. */
  max: number;
  /** The archetype name (sentence-case for display in caps). */
  name: string;
  /** Roman numeral as it appears on a traditional tarot card. */
  numeral: string;
  /** Short italic subtext describing the archetype's vibe. */
  vibe: string;
  /** Slug for asset filenames (matches the Claude Design SVG outputs). */
  slug: string;
}

export const ARCHETYPES: ReadonlyArray<Archetype> = [
  { min: 95, max: 100, name: 'The World',    numeral: 'XXI',   vibe: 'completion, peak alignment',  slug: 'the-world' },
  { min: 85, max: 94,  name: 'The Sun',      numeral: 'XIX',   vibe: 'radiant, ascending',          slug: 'the-sun' },
  { min: 75, max: 84,  name: 'The Star',     numeral: 'XVII',  vibe: 'hopeful, well-regarded',      slug: 'the-star' },
  { min: 65, max: 74,  name: 'Strength',     numeral: 'VIII',  vibe: 'confident, in control',       slug: 'strength' },
  { min: 55, max: 64,  name: 'The Magician', numeral: 'I',     vibe: 'capable, focused',            slug: 'the-magician' },
  { min: 45, max: 54,  name: 'Temperance',   numeral: 'XIV',   vibe: 'balanced, steady',            slug: 'temperance' },
  { min: 35, max: 44,  name: 'The Hermit',   numeral: 'IX',    vibe: 'quiet, withdrawn',            slug: 'the-hermit' },
  { min: 25, max: 34,  name: 'The Moon',     numeral: 'XVIII', vibe: 'uncertain, shadowed',         slug: 'the-moon' },
  { min: 15, max: 24,  name: 'The Tower',    numeral: 'XVI',   vibe: 'disrupted, collapsing',       slug: 'the-tower' },
  { min: 5,  max: 14,  name: 'Death',        numeral: 'XIII',  vibe: 'ending, transformation',      slug: 'death' },
  { min: 1,  max: 4,   name: 'The Devil',    numeral: 'XV',    vibe: 'bound, lowest',               slug: 'the-devil' },
];

/**
 * The Veil — null-state variant of the vibe card. Not a score band; rendered
 * any time a card resolves with no result (no vibe yet for this entity, no
 * articles indexed yet, no X mentions yet, etc.). Sentinel min/max of -1 keeps
 * it out of `scoreToArchetype`'s coverage scan — there's no score that can
 * map to The Veil.
 */
export const VEIL_ARCHETYPE: Archetype = {
  min: -1,
  max: -1,
  name: 'The Veil',
  numeral: '0',
  vibe: 'drawn but unread',
  slug: 'the-veil',
};

/**
 * Map a score 1-100 to its archetype. Returns null for out-of-range or
 * non-finite input — the caller should render the Veil null state via
 * `<EmptyCard>` (which uses `VEIL_ARCHETYPE` above).
 */
export function scoreToArchetype(score: number | null | undefined): Archetype | null {
  if (score == null || !Number.isFinite(score)) return null;
  for (const a of ARCHETYPES) {
    if (score >= a.min && score <= a.max) return a;
  }
  return null;
}
