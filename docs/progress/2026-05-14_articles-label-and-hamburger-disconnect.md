# 2026-05-14 — Articles tab label + hamburger disconnect

## Goal

Two small follow-ups after the NavTabs / Card rename pass:

1. The News sub-tab label still read **"News"** even though the
   underlying component is now `ArticlesCard`. Switch the visible
   label to match what the card actually is.
2. The hamburger dropdown shipped a Language `<select>` and a
   Light / Dark theme toggle, but neither feature is built out yet
   (no translations exist, no dark-mode CSS audit done). Disconnect
   both so they don't ship with initial roll-out.

## What Was Done

**`NEWS_SUB_ITEMS[0].label`: "News" → "Articles"** in
`ContentShell.tsx`. The id stays `"news"` (it's wired into the route
preload table, `NewsSubTab` type, and the `news:news` pane key — all
internal), only the visible string changes.

**Hamburger dropdown trimmed.** Removed the Language section
(`<select>` with English/Español/Français options + `LANG_STORAGE_KEY`
persistence) and the Theme section (Light / Dark buttons +
`THEME_STORAGE_KEY` persistence + `applyTheme` helper + `theme`
signal + `Theme` type + `langSelectRef`). The menu now contains just
Home / Terms / Privacy nav links plus the existing
click-outside-to-close + Escape-to-close handlers. Header.css lost
the now-dead `.menu-divider`, `.menu-section`, `.menu-section-title`,
`.select-wrapper`, `.menu-select`, and `.theme-toggle*` rule blocks.

Pre-existing infrastructure left **in place** so re-enabling is
mechanical, not a rebuild:

- `entry-server.tsx`'s `scoracle-theme` pre-paint script — no-op as
  long as no UI sets the localStorage key.
- `:global(.dark)` rules in `CrystalBall.css`, `routes/index.css`,
  `routes/profile.css` — dormant.

## Files Changed

- `src/components/solid/ContentShell.tsx` — label flip.
- `src/components/solid/Header.tsx` — Language + Theme sections out;
  unused state/refs/helpers/constants pruned; docstring notes the
  deliberate-defer.
- `src/components/solid/Header.css` — six dead rule blocks removed.

## Verification

- `npm run typecheck` — clean.
- `npm test` — 92/92 pass.
- `npm run dev` — Vite boots clean; home SSR 200; profile SSR 200.

## Result

The Articles card now reads correctly in the tab strip. The hamburger
ships with only the navigation we actually have. Dark-mode + i18n
infrastructure stays dormant, ready to re-light when those features
are real.
