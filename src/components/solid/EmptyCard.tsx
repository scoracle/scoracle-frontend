/**
 * EmptyCard — shared "no data" card. Used in two patterns:
 *
 *   1. As an *alternative* to a Card's own Shell — e.g., VibeCard's
 *      empty state replaces the VibeCard's Shell with this one. The
 *      EmptyCard's Shell carries the chrome.
 *   2. As an *inside* fallback within another Card's Shell — e.g.,
 *      ArticlesCard's Show-fallback when the article list is empty.
 *      In that case the parent's Shell provides chrome and the
 *      EmptyCard's Shell sits inside, which yields a nested chrome.
 *      Most consumers should prefer pattern 1 (put EmptyCard outside
 *      the data-show), but pattern 2 is tolerated for cards where the
 *      empty fallback is only one of several states.
 *
 * The default message — "watching for mentions" — matches the
 * original Vibes null-card copy; consumers can override.
 */

import Shell from "./Shell";
import "./EmptyCard.css";

interface EmptyCardProps {
  /** Subtext under the deck-back illustration. */
  message?: string;
}

export default function EmptyCard(props: EmptyCardProps) {
  return (
    <Shell as="article" template="standard" class="empty-card-shell" aria-label="No data">
      <div class="empty-card">
        <div class="empty-card-art">
          <img src="/vibe-art/deck-back.svg" alt="" />
        </div>
        <div class="empty-card-text">
          {props.message ?? "watching for mentions"}
        </div>
      </div>
    </Shell>
  );
}
