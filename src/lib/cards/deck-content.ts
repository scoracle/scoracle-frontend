/**
 * deck-content — per-deck content presence: does this character have anything
 * to say about this entity?
 *
 * Sibling to deck-scores.ts, same contract: ONE rule per deck, riding the SAME
 * server query() the card pane already fetches, so asking costs no network
 * beyond what the eagerly-mounted panes pull anyway.
 *
 * ReadingTable deals only the cards that answer true (Dynamic deck,
 * 2026-08-16). An entity with three readable cards gets a three-card deck and
 * a three-tab rail; an entity with none gets no rail and no deck at all — its
 * meta card sits alone on the desk. The deck is what the entity HAS, not a
 * fixed six with holes punched in it.
 *
 * Each rule mirrors its card's own top-level <Show> so the two can't disagree:
 * if the card would render the Veil (<EmptyCard>), it is not dealt. The Veil
 * stays as the backstop for the card in hand — a conditions change that empties
 * the card being read shows the Veil rather than yanking it off the table
 * mid-turn (ReadingTable holds the active card).
 */
import type { ProfileReads } from "../data/profile-data";
import type { ProfileContextValue, ProfileTab } from "../../contexts/profile";
import { hasDeckContent, type ProfileResults } from "./deck-presence";
export async function deckHasContent(ctx: ProfileContextValue, reads: ProfileReads, deck: ProfileTab): Promise<boolean> {
    const mode = ctx.rateMode();
    const keys: Record<ProfileTab, (keyof ProfileReads)[]> = {
        profile: ['stats'], scouting: ['report'], narratives: ['news'], transfers: ['transfers'],
        vibe: ['vibe'], momentum: ['stats', 'momentum', 'summary'], sigil: ['sigil'],
    };
    const entries = await Promise.all(keys[deck].map(async key => [key, await reads[key]()]));
    return hasDeckContent(Object.fromEntries(entries) as ProfileResults, mode, deck);
}
