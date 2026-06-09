/**
 * LeaderboardMenu — the home-page entry point into /leaderboard.
 *
 * A quiet "Rankings" control sitting just under the search box, wearing the same
 * trigger look as the leaderboard/profile scope Selects (italic display label +
 * CSS chevron on a hairline underline) so it reads as one family with the rest
 * of the site's view controls. Tapping it reveals the board tab rail (a
 * <NavStrip> — the site's selector idiom: italic labels on a hairline); picking
 * a board heads to /leaderboard for the currently-selected sport. The chevron
 * flips to point up while open.
 *
 * It borrows Select's trigger styling (`.select-trigger` / `.select-value` /
 * `.select-chevron`) rather than the Select component itself: Select is a
 * listbox value-picker, whereas this is a navigation menu (the label stays
 * "Rankings"; picks route away). Same appearance, different behavior — so we
 * reuse the look, not the component.
 *
 * Sport comes from the shared $currentSport store (driven by the home CrystalBall
 * + sport NavStrip), so the board opens scoped to what the user is already eyeing.
 *
 * Open/close/outside-click/Escape are owned by the shared <Disclosure> primitive
 * (the platform's single disclosure behavior) — this component supplies only the
 * trigger and the board-rail sheet. The chevron flip keys off the trigger's
 * aria-expanded (Disclosure wires it).
 */

import { useNavigate } from "@solidjs/router";
import { useStore } from "@nanostores/solid";

import { $currentSport } from "../../stores/sport";
import Disclosure from "./Disclosure";
import NavStrip from "./NavStrip";
import "./Select.css";
import "./LeaderboardMenu.css";

// `id: string` (not a literal union) so NavStrip's generic resolves to string and
// the no-active launcher state (`active=""`) type-checks.
const BOARD_ITEMS: ReadonlyArray<{ id: string; label: string }> = [
  { id: "composite", label: "Rating" },
  { id: "vibes", label: "Vibes" },
  { id: "transfers", label: "Transfers" },
];

export default function LeaderboardMenu() {
  const navigate = useNavigate();
  const sport = useStore($currentSport);

  function go(boardId: string) {
    const s = (sport() ?? "nba").toUpperCase();
    const board = boardId === "composite" ? "" : `&board=${boardId}`;
    navigate(`/leaderboard?sport=${s}${board}`);
  }

  return (
    <Disclosure
      class="lbm"
      triggerClass="select-trigger"
      haspopup="menu"
      ariaLabel="Open leaderboards"
      trigger={() => (
        <>
          <span class="select-value">Rankings</span>
          <span class="select-chevron" aria-hidden="true" />
        </>
      )}
    >
      {(api) => (
        <div class="lbm-sheet" role="menu" id={api.panelId}>
          <NavStrip
            items={BOARD_ITEMS}
            active=""
            onSelect={(id) => {
              api.close();
              go(id);
            }}
            ariaLabel="Select a leaderboard"
          />
        </div>
      )}
    </Disclosure>
  );
}
