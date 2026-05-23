/**
 * SeasonSelect — native <select> for picking the displayed season.
 *
 * Shared by StatsCard (left-aligned under the toolbar) and CompareCard
 * (middle slot of the entity header). Options come from the entity's
 * `meta.available_seasons` — the backend guarantees every entry resolves
 * to a populated stats payload for this entity in the current league
 * scope, so the picker never offers a dead season.
 *
 * Native element by design: zero-bundle, accessible via the platform,
 * matches the lightweight aesthetic of the surrounding NavStrips.
 * Wrapped in a styled span to harmonize typography (italic display
 * font, secondary text colour) with the rate/scope toggles next to it.
 */

import { For } from "solid-js";
import "./SeasonSelect.css";

export interface SeasonSelectProps {
  /** Available seasons in newest-first order (from `meta.available_seasons`). */
  seasons: readonly number[];
  /** Currently selected season — must appear in `seasons` for the
   *  native select to reflect it. Null falls through to the newest. */
  value: number | null;
  onChange: (next: number) => void;
  ariaLabel?: string;
}

export default function SeasonSelect(props: SeasonSelectProps) {
  const resolved = () => props.value ?? props.seasons[0] ?? null;
  return (
    <span class="season-select">
      <select
        class="season-select-native"
        aria-label={props.ariaLabel ?? "Season"}
        value={resolved() ?? ""}
        onChange={(e) => {
          const n = Number(e.currentTarget.value);
          if (Number.isFinite(n)) props.onChange(n);
        }}
      >
        <For each={props.seasons}>
          {(s) => <option value={s}>{s}</option>}
        </For>
      </select>
    </span>
  );
}
