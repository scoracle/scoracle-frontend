/**
 * VibeCard — The Influencer's card: the felt, emotional read of the room.
 * Serve-latest, uniform card contract (2026-09-06): ONE read — the tweet-sized
 * HOOK up top, the felt-read prose in short paragraphs below — exactly like
 * every sibling card.
 *
 * Two pieces of scar tissue retired here (Scott: "some aspect of the code
 * causing this is scar tissue and needs removal"):
 * - The 7-day multi-read FEED (up to four reads, latest first) — the old News
 *   hub's vibe-facet design from July, which made this the one card that
 *   scrolled a timeline while its six siblings served one hook + one body.
 * - The trigger-label title fallback ("Scheduled read" for periodic rows) —
 *   a pre-hook-era placeholder (mig 180). A read whose hook was dropped by
 *   the title guard now simply has no title, the same degrade every other
 *   seat's card already lives by ("a junk title costs the title, never the
 *   card") — never a bookkeeping label on the face.
 *
 * Hydrates from its own product endpoint (2026-08-22); the snapshots window
 * still arrives, and the lead read IS the card. deck-scores reads the same
 * lead for the ring, so the number and the prose can never disagree.
 */

import { Show } from "solid-js";
import { createAsync } from "@solidjs/router";

import { useProfile } from "../../contexts/profile";
import { getVibe, leadVibeRead } from "../../lib/data/vibe.server";
import GemmaSummary from "./GemmaSummary";
import { createDeckScoreReader } from "../../lib/cards/deck-scores";
import Card from "./Card";
import EmptyCard from "./EmptyCard";
import "./content-cards.css";
import "./VibeCard.css";

export default function VibeCard() {
  const ctx = useProfile();
  const { sport, type, id } = ctx;

  // No season param: her reads are a rolling 7-day window, not a season slice.
  const vibe = createAsync(() => getVibe(sport(), type(), id()));

  // Serve-latest with the hook-completeness rule: newest COMPLETE read
  // (hook + body), hookless only when the window holds no complete one.
  const lead = () => leadVibeRead(vibe()?.snapshots);

  // The Influencer's card score — the lead read's sentiment (deck-scores.ts,
  // read by the meta ring too).
  const leadSentiment = createDeckScoreReader(ctx, "vibe");

  const emptyMessage = () =>
    vibe() ? "No vibe reads this week." : "No vibe reads yet.";

  return (
    <Show when={lead()} fallback={<EmptyCard message={emptyMessage()} />}>
      {(r) => (
        <Card id="vibe" as="article" aria-label="Vibe" class="vibe-feed-card" score={leadSentiment}>
          <p class="card-identifier">The room's felt read</p>
          <Show when={r().headline}>
            <h2 class="card-hook">{r().headline}</h2>
          </Show>
          <GemmaSummary text={r().body!} class="vibe-felt-read" />
        </Card>
      )}
    </Show>
  );
}
