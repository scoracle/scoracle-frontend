# 2026-06-07 — ScopeStrip selector consolidation + component test system

## Goal
Lens-B consolidation for #23: make one shared selector vocabulary across the platform —
a single `<Disclosure>` behavior + one `<Select>` option-picker + a thin `<ScopeStrip>`
control-strip layout primitive — replacing the hand-rolled `ScopeSelect`/`SeasonSelect`
and the bespoke open/close logic in `LeaderboardMenu`. Groundwork for the Per-X rate
control (which lands with the `rating_modes` backend). Also stand up a basic component
test system, since the codebase had none.

## What Was Done
- **`Disclosure.tsx`** (+`.css`) — the platform's single disclosure behavior: toggle,
  outside-`mousedown`, `Escape` (with focus-return), aria wiring. Render-prop trigger +
  panel; exposes `{ open, toggle, close, focusTrigger, panelId }`. Pillar primitive
  (no flagship imports, extract-ready for `@scoracle/ui`).
- **`Select.tsx`** (+`.css`) — one option-picker on `Disclosure`, adding listbox
  arrow/Enter navigation + highlight. String-valued; unifies the former `ScopeSelect`
  (`{value,label}`) and `SeasonSelect` (numbers, mapped at the call site). CSS migrated
  verbatim from `SeasonSelect.css` (`.season-select*` → `.select*`) — visually identical.
- **`ScopeStrip.tsx`** (+`.css`) — thin centered/wrapping control-strip layout (fork A:
  dumb layout, like NavStrip; consumer composes controls + gates visibility). `.scope-row`
  CSS moved here from `ContentShell.css`.
- **Migrated** `ContentShell` → `<ScopeStrip>` + two `<Select>`s (behavior-identical
  visibility conditions); `LeaderboardMenu` → `<Disclosure>` (chevron flip now keys off
  `aria-expanded`).
- **Deleted** `ScopeSelect.tsx`, `SeasonSelect.tsx`, `SeasonSelect.css`; removed the dead
  `.scope-row` rule.
- **Basic component test system:** `vite-plugin-solid` + `@solidjs/testing-library` in
  `vitest.config.ts`, a `vitest.setup.ts` cleanup hook, include broadened to `.tsx`.
  Existing pure-logic `.test.ts` suites unaffected. (Header `<details>` + `ShareTrigger`
  intentionally NOT folded in — native/different concern; reuse not worth the complexity.)

## Files Changed
New: `Disclosure.{tsx,css,test.tsx}`, `Select.{tsx,css,test.tsx}`,
`ScopeStrip.{tsx,css,test.tsx}`, `vitest.setup.ts`.
Modified: `ContentShell.{tsx,css}`, `LeaderboardMenu.{tsx,css}`, `vitest.config.ts`,
`package.json`/`package-lock.json` (test deps).
Deleted: `ScopeSelect.tsx`, `SeasonSelect.{tsx,css}`.

## Verification
- `npm run typecheck` clean; `npm test` → 15 files / 108 tests pass (11 new component tests).
- Browser (headless Chromium against `npm run dev`, prod public API): home page
  `LeaderboardMenu` opens (chevron flips, board rail reveals); a player profile
  (Nikola Jokić) renders the `ScopeStrip` with scope ("All") + season ("2025") `<Select>`s,
  scope opens to All / By Position. No page/SSR errors. (Playwright was a one-off for this
  check and was uninstalled.)

## Result
One `Disclosure`/`Select`/`ScopeStrip` vocabulary platform-wide, extract-ready, fully
behavior-preserving. Per-X rate control + per-card `controls` registry follow with the
`rating_modes` engine work (migration 042).
