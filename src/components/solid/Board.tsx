/**
 * Board — the leaderboard's artifact, and the platform's second product
 * (Board session, 2026-08-10).
 *
 * The Board reveals hierarchy; the Card surfaces the voice of a character.
 * Two roles, two primitives, one world. **The Card is drawn; the Board is
 * printed** — that is the whole split: the Card is a made object, weathered
 * wobble and all, while the Board came off a press (dead-straight rules,
 * exact columns, set type). Same stock, same ink. The Board therefore never
 * borrows the card's frame, deck wash, deck back, or Veil.
 *
 * It supersedes the flat staging plate of 2026-08-08, which filed the rank
 * ledger as furniture and left /leaderboard with no artifact on it at all —
 * the page blurred to two grey bands, the well and the plate. The Board is
 * now `--bg-card` stock at `--board-width`, lifted by `--shadow-board`, and
 * it PINS the artifact palette exactly as the Card does (global.css): the
 * desk themes; the artifacts don't.
 *
 * Three pieces of furniture and nothing else:
 *
 *   masthead — the name, the scope line, closed by the Scotch rule (thick
 *              over thin). The Board's one ornament, once per board.
 *   register — the ranked rows, spined by the rank column. The metric is
 *              named ONCE, at the head of its column.
 *   foot     — one rule and the count. The sheet closes; it doesn't stop.
 *
 * Ownership contract: Board owns the sheet, the masthead, the register
 * rhythm (the row grid, the rules, the counting bands) and the rank spine —
 * the spine is the Board's signature and must not be re-implemented per
 * consumer. Consumers own what sits INSIDE a row: media, name, metric,
 * blurb. Board.css exposes `--board-grid` / `--board-gap` for cell
 * alignment.
 *
 * The three faces are ledger idioms, never card idioms (a card back
 * promises a flip — the wrong metaphor for a rank list). All three keep the
 * masthead, the rule and the foot: the sheet is always fully printed, only
 * the entries are missing.
 *
 * Pillar primitive — extract-ready for shared web UI.
 */

import { Show, type JSX } from "solid-js";
import { DECK_HUES, type CardId } from "../../lib/cards/card-meta";
import type { ProfileTab } from "../../contexts/profile";
import "./Board.css";

interface BoardProps {
  /** The board's name — set once, large, in the masthead. */
  title: string;
  /** Character deck this board ranks through — tints the sheet at
   *  --board-wash-alpha. Omit for the plain stock. */
  deck?: CardId;
  /** The masthead's second line: "NBA · players · 2026 regular season". */
  scope?: string | null;
  /** The metric column's head — named once here, never repeated per row. */
  metricLabel?: string | null;
  /** The foot's left side: "50 ranked". */
  count?: string | null;
  /** Render the title as the page's h1 (the standalone leaderboard page). */
  titleAsHeading?: boolean;
  ariaLabel?: string;
  children: JSX.Element;
}

/** The masthead + Scotch rule + column head, shared by the register and all
 *  three faces — the sheet is always fully printed. */
function Masthead(props: BoardProps & { deckId?: string }) {
  return (
    <>
      <header class="board-masthead">
        {/* The printer's device — the character's own drawing across the
            nameplate, behind the type. The asset is a MASK, not an image:
            the motifs bake a dark low-alpha stroke tuned for ivory cardstock,
            and the Board themes, so painting through the mask lets the
            drawing take the deck hue in either theme instead of vanishing on
            a dark sheet. It is STRETCHED, not cropped — these are full-field
            compositions marked preserveAspectRatio="none", and cropping a
            nameplate band out of one shows a few percent of the drawing
            (which is how Vibe and Momentum rendered blank). */}
        <Show when={props.deckId}>
          {(d) => (
            <span
              class="board-device"
              aria-hidden="true"
              style={{ "--board-device-src": `url(/deck-art/motif-${d()}.svg)` }}
            />
          )}
        </Show>
        <Show
          when={props.titleAsHeading}
          fallback={<span class="board-name">{props.title}</span>}
        >
          <h1 class="board-name">{props.title}</h1>
        </Show>
        <Show when={props.scope}>
          <span class="board-scope">{props.scope}</span>
        </Show>
      </header>
      {/* The Scotch rule: thick over thin, drawn as one element's two
          borders so the channel between them is exact. */}
      <div class="board-rule" aria-hidden="true" />
      <Show when={props.metricLabel}>
        <div class="board-colhead" aria-hidden="true">
          <span class="board-colhead-metric">{props.metricLabel}</span>
        </div>
      </Show>
    </>
  );
}

export default function Board(props: BoardProps) {
  const deck = (): ProfileTab | undefined =>
    props.deck && props.deck in DECK_HUES ? (props.deck as ProfileTab) : undefined;

  return (
    <section
      class="board"
      aria-label={props.ariaLabel}
      style={deck() ? { "--deck-hue": DECK_HUES[deck()!] } : undefined}
    >
      <Masthead {...props} deckId={deck()} />
      {props.children}
      <footer class="board-foot">
        <span>{props.count ?? ""}</span>
        <span>Scoracle</span>
      </footer>
    </section>
  );
}

/** The unwritten register: the ranks are already set — a ranking exists
 *  before it is fetched — and the entries are quiet bars. Nothing pulses. */
export function BoardLoading(props: { label?: string; rows?: number }) {
  const count = () => props.rows ?? 8;
  // Deterministic bar widths — a quiet stagger, no randomness, no motion.
  const widths = [58, 44, 52, 39, 55, 46, 41, 53, 43, 50];
  return (
    <ol
      class="board-register"
      role="status"
      aria-live="polite"
      aria-label={props.label ?? "Loading"}
    >
      {Array.from({ length: count() }, (_, i) => (
        <li class="board-row board-row-unwritten">
          <span class="board-rank">{String(i + 1).padStart(2, "0")}</span>
          <span class="board-bar board-bar-media" />
          <span class="board-bar" style={{ width: `${widths[i % widths.length]}%` }} />
          <span class="board-bar board-bar-metric" />
        </li>
      ))}
    </ol>
  );
}

/** The blank register: one italic line naming the conditions as the cause. */
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
