# 2026-05-15 — NavTabs decouples from Shell corner-dot assumption

## Goal

Drop the `width: min(80%, 480px); margin: 0 auto` cap on `.nav-tabs`. That cap
existed only so the active-fill on the rightmost button wouldn't collide with
the Shell's bottom-right corner dot (14px from the chrome edge). With Shell's
uniform `padding: 1.25rem 1.5rem` (~24px horizontal inset) on every Shell
instance, the buttons already sit clear of the corner dots without the
primitive having to know about Shell's chrome layout. NavTabs goes back to
being a pure tab-strip primitive with no host-shape assumptions — extract-
ready for `@scoracle/ui` without carrying flagship Shell-shape knowledge along.

Step 2b of the Shell retool sequence.

## What Was Done

`src/components/solid/NavTabs.css`:

- Dropped `width: min(80%, 480px)` and `margin: 0 auto` from `.nav-tabs`.
- Rewrote the comment to explain *why* width is parent-driven: Shell's padding
  inset handles the corner-dot clearance, NavTabs stays host-agnostic.
- Dropped `width: min(85%, 380px)` from the `@media (max-width: 480px)`
  override. The reduced `gap: 0.125rem` and the button-sizing block stay.

Net effect: NavTabs fills its parent (the wrapping Shell's content area) at
every viewport size. Profile page buttons get ~552px of width to share at 6
siblings (~92px each) instead of the old 480px cap (~80px each) — more
breathing room for letter spacing without truncation risk. Same on the home-
page sport row.

## Files Changed

```
src/components/solid/NavTabs.css
docs/progress/2026-05-15_navtabs-decouple-shell-shape.md  (this doc, NEW)
```

## Verification

- `npm run typecheck` — clean.
- `npm test` — 101/101.
- Visual on dev server (`http://localhost:5174`):
  - Profile page (Articles / X / Vibes / Stats / Traits / Compare): tabs fill
    Shell content area, slightly wider, more letter-spacing room. Active fill
    on the rightmost (Compare) button doesn't visually touch the bottom-right
    corner dot.
  - Home page sport row (NBA / NFL / Football): same fill behavior; sport
    buttons get more room.
  - Mobile viewports (<480px): NavTabs fills the Shell's content area at full
    width; tap targets stay at `min-height: 44px`.
- User confirmed visually.

## Result

NavTabs.tsx and NavTabs.css have zero references to Shell's chrome layout.
The primitive is independent of host-shape assumptions — when sandbox /
fantasy / stats sites import NavTabs from `@scoracle/ui` later, they don't
inherit any flagship-specific width quirks. The seam between NavTabs (pure
tab strip) and Shell (host providing the chrome + content area) is clean.

## What's NOT in this commit (intentional)

- `Shell.tsx` is still carrying the share apparatus + useShell context.
  Slim-down comes in step 5.
- ContentShell.css's `min-height: 800px` reservation still in place; the
  proper CLS fix lands in step 7.
