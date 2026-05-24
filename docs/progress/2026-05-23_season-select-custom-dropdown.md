# 2026-05-23 — SeasonSelect: custom dropdown matching SearchBar aesthetic

## Goal

The season picker was rendering as a native `<select>` — system font,
OS highlight color, OS-rendered options panel. Read as foreign next
to the rest of the deck. The SearchBar suggestion list already
establishes the platform's dropdown language (opaque card surface,
1px tarot border, hairline-separated rows, hover/keyboard highlight).
Bring SeasonSelect into the same family.

## What Was Done

`src/components/solid/SeasonSelect.tsx`:

- Replaced the native `<select>` with a button trigger + custom
  listbox dropdown.
- Trigger keeps the italic display-font typography that anchored
  the picker against the rate/scope NavStrips (color, weight,
  border-bottom underline + chevron), so the *closed* state is
  visually identical to before.
- Dropdown panel mirrors `.search-suggestions-dropdown`'s
  composition — opaque card bg, 1px tarot border, hairline row
  separators, hover/keyboard highlight, scrollable past 280px.
- Keyboard: Space / Enter / Down open the dropdown; Up/Down
  navigate options; Enter commits; Escape closes; Tab moves on
  normally.
- Mouse: trigger toggles; option `onMouseDown` commits (prevents
  the trigger's blur racing the click); `onMouseEnter` highlights.
- Click-outside closes via a window mousedown listener that's only
  registered while the dropdown is open (cleaned up by `onCleanup`).
- ARIA: trigger gets `aria-haspopup="listbox"`, `aria-expanded`,
  `aria-controls={listboxId}`. Options get `role="option"` +
  `aria-selected`. `createUniqueId` for the listbox id so multiple
  SeasonSelects on one page (CompareCard renders two) don't collide.

`src/components/solid/SeasonSelect.css`:

- Full rewrite. New `.season-select-trigger` carries the legacy
  italic typography; `.season-select-chevron` draws the down arrow
  as a pure-CSS shape tied to `currentColor` so it picks up the
  trigger's hover/focus color.
- `.season-select-dropdown` is positioned with
  `left: 50%; transform: translateX(-50%)` so the panel sits
  centered on the trigger's vertical axis — a `left: 0` panel that
  was wider than the trigger read as visually shifted right.
- `.season-select-option` matches `.search-suggestion-item`'s
  hairline separators + hover/highlight palette so the two
  dropdowns visually read as one family.

## Files Changed

- `src/components/solid/SeasonSelect.tsx`
- `src/components/solid/SeasonSelect.css`

## Verification

- `npm run typecheck` — clean
- `npm test` — 137/137
- UI checked in browser: dropdown opens, options select via click +
  keyboard, escape closes, centered under the trigger.

## Follow-up

User raised the right question: "could we build one dropdown
primitive that works across all sites?" Answer is "yes, but staged."
Today's two consumers (SearchBar with typeahead/async/badges,
SeasonSelect with synchronous static list) have meaningfully
different interaction models — a single behavior primitive would
end up bloated or leaky. The right next step (not in this commit)
is extracting the shared *visual shell* — a `.app-dropdown-panel` /
`.app-dropdown-option` module both consumers import — so they can't
drift visually while each owns its own behavior. The behavior
abstraction belongs to a sandbox-era cleanup once 3-4 dropdown
shapes inform the right primitive shape.

## Result

The closed state is visually unchanged. The open state now reads
as a sibling of the SearchBar suggestion list rather than an OS
intrusion. Two surfaces, same dropdown language.
