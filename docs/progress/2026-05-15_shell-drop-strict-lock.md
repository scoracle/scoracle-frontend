# 2026-05-15 — Drop strict-lock CSS from .shell

## Goal

Remove the `max-height` + `overflow: hidden` "strict-lock" bandaid from `.shell`
in `src/global.css`. The bandaid was added 2026-05-14 to force locked Cards to
hold the 19:11 aspect-derived height, but it clipped content that didn't fit
(VibeCard's credit footer, MetaShell's long venue names) — non-scalable. Restore
`aspect-ratio` as a *preference*: locked Cards push past 19:11 when content
demands, which makes the redesign owed on each locked Card a visible nudge
instead of a hidden clip.

Step 1 of the Shell retool sequence. Independent of share work and Shell.tsx
itself — CSS only.

## What Was Done

`src/global.css` `.shell`:

- Dropped `max-height: calc(var(--card-width) * 11 / 19)` and `overflow: hidden`.
- Rewrote the surrounding comment: `aspect-ratio: 19/11` is now described as a
  *preferred* silhouette; content that exceeds the aspect-derived height grows
  the box rather than being clipped.
- Dropped the now-redundant `max-height: none` and `overflow: visible` from
  `.shell.shell-unlocked` (with strict-lock gone there's nothing to reset).

Width still locks to `--card-width` (600px). Uniform `padding: 1.25rem 1.5rem`
still on the base `.shell` rule — verified no consumer (`.meta-widget`,
`.profile-nav-shell`, `.home-search-shell`, `.vibe-card-shell`, etc.) overrides
it. `unlockHeight` opt-out semantics unchanged.

## Files Changed

```
src/global.css
docs/progress/2026-05-15_shell-drop-strict-lock.md  (this doc, NEW)
```

## Verification

- `npm run typecheck` — clean.
- `npm test` — 101/101.
- Visual on dev server (`http://localhost:5174`):
  - VibeCard's `gemma4:e4b · May 14` credit footer renders inside the chrome
    (was clipped at the box edge with `overflow: hidden`).
  - MetaShell on entities with long venue names no longer clips.
  - Locked Cards visibly grow past 19:11 when content demands it. The visible
    growth is the deliberate nudge that the content redesigns for VibeCard's
    inner layout + MetaShell's detail grid are owed.
- User confirmed visually: "Looks good! Everything is working as planned."

## Result

`.shell` is back to a single source of truth on shape (`aspect-ratio: 19/11`
preferred), width (`--card-width`), and padding (`1.25rem 1.5rem`). No content
clipping. The locked Shells fit-or-grow honestly; no bandaid.

## What's NOT in this commit (intentional)

- **`Shell.tsx` is unchanged.** It still carries the `share` prop, the
  `useShell()` context path, the render-double pattern, and the ShareButton /
  ShareFrame imports. Slimming `Shell.tsx` is step 5, after the OG image route
  (step 3) + new client share handler (step 5) give the share apparatus
  somewhere to go.
- **`.content-shell-panes { min-height: 800px }` reservation in
  `ContentShell.css` is unchanged.** That's the other 2026-05-14 bandaid (partial
  CLS mitigation); comes out in step 7 (CLS investigation) once a root-cause fix
  replaces it.
