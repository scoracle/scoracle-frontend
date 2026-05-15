# 2026-05-14 — Home Shell block layout + EmptyCard landscape art

## Goal

Two follow-ups after the padding work:

1. The home-search-shell's bottom chrome border wasn't rendering —
   only the top, left, and right edges of the tarot SVG were
   visible. The profile-nav-shell (same `<Shell unlockHeight>`
   primitive, same padding) rendered all four sides cleanly. The
   discriminating factor turned out to be `display: flex` on the
   home Shell; profile-nav uses default block layout.
2. The `<EmptyCard />` rendered its deck-back tarot illustration in
   portrait orientation inside a locked landscape Shell, so the art
   overflowed the silhouette and the card visibly bled past its
   chrome.

## What Was Done

### Home Shell drops `display: flex`

`src/routes/index.css`:

- `.home-search-shell` no longer sets `display: flex;
  flex-direction: column; align-items: center; justify-content:
  center; gap: 1rem`. Just `margin-top: -1.5rem` (pulls under the
  crystal ball).
- `.home-search-shell-search` now uses `margin: 1rem auto 0` to
  produce the gap above + horizontal centering. Replaces the
  flex `gap`. Width stays `min(80%, 480px)` so the search input +
  dropdown line up with the NavTabs above.
- Mobile override updated to match: `.home-search-shell-search
  { margin-top: 0.75rem }`.
- The change matches the profile-nav-shell pattern: no Shell-level
  flex, children center via their own `margin: 0 auto`, chrome
  pseudo-elements (`::before` tarot SVG + `::after` corner dots)
  render the same way as everywhere else.

The earlier band-aid (a `min-height: 200px` reservation on the home
Shell) is also gone — the underlying issue is solved.

### EmptyCard art rotates landscape

`src/components/solid/EmptyCard.css`:

- `.empty-card` is a flex column that fills the locked Shell's
  content area (`height: 100%; width: 100%`) with the art + caption
  centered.
- `.empty-card-art` is a 220×147 landscape container (3:2 aspect),
  positioned relatively.
- `.empty-card-art img` is positioned absolutely at the container's
  center with portrait dimensions (147×220, source aspect 2:3),
  then `transform: translate(-50%, -50%) rotate(-90deg)`. After
  rotation the visual fills the landscape container exactly.
- Source asset `/vibe-art/deck-back.svg` is untouched — single
  source of truth, rotation lives in CSS so we can swap to a real
  landscape SVG later by dropping the transform.
- Mobile override at 480px viewport shrinks the art to 180×120 (img
  120×180 pre-rotation) so the empty-state stays comfortable on
  small screens.

## Files Changed

```
src/routes/index.css
src/components/solid/EmptyCard.css
docs/progress/2026-05-14_home-shell-block-empty-landscape.md  (this doc, NEW)
```

## Verification

- `npm run typecheck` — clean.
- `npm test` — 101/101.
- Visual:
  - Home page: home-search-shell renders all four border sides
    cleanly, no min-height anchor needed.
  - Profile page (any sub-tab that hits empty state — Articles for
    an entity with no recent news, X for an entity without an X
    feed, Vibes when Gemma hasn't computed): EmptyCard sits inside
    a locked 600×348 Shell with the deck-back art rotated to
    landscape, "watching for mentions" caption below.

## Result

Two visual bugs gone. The home Shell now follows the same layout
convention as the profile-nav Shell — both use default block flow
with children centered via `margin: 0 auto`. EmptyCard's art finally
honors the locked landscape silhouette by rotating in place.
