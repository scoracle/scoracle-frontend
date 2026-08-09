/**
 * Board — the leaderboard's own vessel (Tray/Well/Board session, 2026-08-08).
 *
 * The card's missing sibling primitive: the board ranks; the cards tell the
 * story. Materially it is a flat plate of `--surface-staging` recessed into
 * the desk — 1px `--border` edge, square, landscape, capped at
 * `--board-width` (960px, deliberately unrelated to `--card-width`), and it
 * casts nothing. It themes with the desk: it is furniture, not artifact.
 *
 * The plate is named once in its own header line (board · count · sport) —
 * the columns below are self-evident, so there are no column headers. Three
 * weights of line, each meaning one thing: the header rule is 1px `--text`,
 * row separators are 1px `--hairline-soft` (its one surviving chrome use),
 * and the last row has none.
 *
 * The three non-card faces (no Veil art, no deck back — a card back promises
 * a flip, the wrong metaphor for a rank list):
 *   <BoardLoading> — the ledger with its ranks already set and the entries
 *                    not yet written. Ranks are real; nothing pulses.
 *   <BoardEmpty>   — one italic line naming the conditions as the cause.
 *   <BoardError>   — one italic line + a Try-again chip in
 *                    `--surface-active` (a button, not a selection).
 *
 * Pillar primitive — extract-ready for shared web UI. Consumers own row
 * content; Board.css owns the vessel, the header line and the faces.
 */

import { Show, type JSX } from "solid-js";
import "./Board.css";

interface BoardProps {
  /** The board's name — set once, in the plate's own header line. */
  title: string;
  /** The header line's right side: "50 ranked · NFL". */
  meta?: string | null;
  /** Render the title as the page's h1 (the standalone leaderboard page). */
  titleAsHeading?: boolean;
  ariaLabel?: string;
  children: JSX.Element;
}

export default function Board(props: BoardProps) {
  return (
    <section class="board" aria-label={props.ariaLabel}>
      <header class="board-head">
        <Show
          when={props.titleAsHeading}
          fallback={<span class="board-title">{props.title}</span>}
        >
          <h1 class="board-title">{props.title}</h1>
        </Show>
        <Show when={props.meta}>
          <span class="board-meta">{props.meta}</span>
        </Show>
      </header>
      {props.children}
    </section>
  );
}

/** The unwritten ledger: real ranks, entry bars in `--surface-active`,
 *  nothing pulses. */
export function BoardLoading(props: { label?: string; rows?: number }) {
  const count = () => props.rows ?? 8;
  // Deterministic bar widths — a quiet stagger, no randomness, no motion.
  const widths = [64, 48, 56, 42, 60, 50, 44, 58, 46, 54];
  return (
    <div class="board-face-loading" role="status" aria-live="polite" aria-label={props.label ?? "Loading"}>
      {Array.from({ length: count() }, (_, i) => (
        <div class="board-row board-row-unwritten">
          <span class="board-rank">{String(i + 1).padStart(2, "0")}</span>
          <span class="board-bar" style={{ width: `${widths[i % widths.length]}%` }} />
          <span class="board-bar board-bar-metric" />
        </div>
      ))}
    </div>
  );
}

/** The empty plate: the header rule stays; one italic line names the
 *  conditions as the cause. */
export function BoardEmpty(props: { message?: string; ariaLabel?: string }) {
  return (
    <div class="board-face" aria-label={props.ariaLabel ?? "No entries"}>
      <span class="board-face-line">
        {props.message ?? "No entity clears the conditions set above."}
      </span>
    </div>
  );
}

/** The unreadable board: one line, one chip — a button, not a selection. */
export function BoardError(props: { detail?: string | null; onRetry: () => void }) {
  return (
    <div class="board-face" role="alert" aria-label="Board unavailable">
      <span class="board-face-line">The board could not be read.</span>
      <Show when={props.detail}>
        <span class="board-face-detail">{props.detail}</span>
      </Show>
      <button type="button" class="board-retry" onClick={props.onRetry}>
        Try again
      </button>
    </div>
  );
}
