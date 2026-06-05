/**
 * LeaderboardMenu — the home-page entry point into /leaderboard.
 *
 * A quiet body-font down-chevron sitting just under the search box. Tapping it
 * reveals the board tab rail (a <NavStrip> — the site's selector idiom: italic
 * labels on a hairline); picking a board heads to /leaderboard for the
 * currently-selected sport. The chevron flips to point up while open. No label —
 * the chevron alone is the affordance.
 *
 * Sport comes from the shared $currentSport store (driven by the home CrystalBall
 * + sport NavStrip), so the board opens scoped to what the user is already eyeing.
 *
 * SSR-safe: the outside-click / Escape listeners are attached in onMount (client
 * only) and torn down via an onMount-scoped onCleanup, so nothing touches
 * `document` during the Workers SSR pass.
 */

import { createSignal, onMount, onCleanup, Show } from "solid-js";
import { useNavigate } from "@solidjs/router";
import { useStore } from "@nanostores/solid";

import { $currentSport } from "../../stores/sport";
import NavStrip from "./NavStrip";
import "./LeaderboardMenu.css";

// `id: string` (not a literal union) so NavStrip's generic resolves to string and
// the no-active launcher state (`active=""`) type-checks.
const BOARD_ITEMS: ReadonlyArray<{ id: string; label: string }> = [
  { id: "composite", label: "Rating" },
  { id: "vibes", label: "Vibes" },
  { id: "news", label: "News" },
  { id: "transfers", label: "Transfers" },
];

export default function LeaderboardMenu() {
  const navigate = useNavigate();
  const sport = useStore($currentSport);
  const [open, setOpen] = createSignal(false);
  let root: HTMLDivElement | undefined;

  onMount(() => {
    const onDoc = (e: MouseEvent) => {
      if (root && !root.contains(e.target as Node)) setOpen(false);
    };
    const onKey = (e: KeyboardEvent) => {
      if (e.key === "Escape") setOpen(false);
    };
    document.addEventListener("click", onDoc);
    document.addEventListener("keydown", onKey);
    onCleanup(() => {
      document.removeEventListener("click", onDoc);
      document.removeEventListener("keydown", onKey);
    });
  });

  function go(boardId: string) {
    setOpen(false);
    const s = (sport() ?? "nba").toUpperCase();
    const board = boardId === "composite" ? "" : `&board=${boardId}`;
    navigate(`/leaderboard?sport=${s}${board}`);
  }

  return (
    <div class="lbm" ref={root}>
      <button
        type="button"
        class="lbm-trigger"
        classList={{ open: open() }}
        aria-haspopup="menu"
        aria-expanded={open()}
        aria-label="Open leaderboards"
        onClick={() => setOpen(!open())}
      >
        <span class="lbm-chevron" aria-hidden="true">⌄</span>
      </button>

      <Show when={open()}>
        <div class="lbm-sheet" role="menu">
          <NavStrip items={BOARD_ITEMS} active="" onSelect={go} ariaLabel="Select a leaderboard" />
        </div>
      </Show>
    </div>
  );
}
