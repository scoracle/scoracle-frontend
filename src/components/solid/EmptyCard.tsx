/**
 * EmptyCard — shared "no data" card for the News-mode tabs.
 *
 * Built around the same tarot deck-back illustration the Vibes null-state
 * uses, so Articles, X, and Vibes all read with one visual language when
 * there's nothing to show. The default message — "watching for mentions" —
 * matches the original Vibes null-card copy; consumers can override.
 */

import "./EmptyCard.css";

interface EmptyTabCardProps {
  /** Subtext under the deck-back illustration. */
  message?: string;
}

export default function EmptyCard(props: EmptyTabCardProps) {
  return (
    <article class="empty-card">
      <div class="empty-card-art">
        <img src="/vibe-art/deck-back.svg" alt="" />
      </div>
      <div class="empty-card-text">
        {props.message ?? "watching for mentions"}
      </div>
    </article>
  );
}
