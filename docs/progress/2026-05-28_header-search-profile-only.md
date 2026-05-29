# Header search bar — profile page only

## Goal

Stop showing the header search bar on about / contact / terms / privacy
pages (it looked out of place). Match the clean solid header used on the
home page everywhere except where search actually belongs.

## What Was Done

Flipped the route-aware `showSearch` logic in `HeaderForRoute`. Previously
the header search showed on every route except `/` (home). Now it shows
**only** on `/profile` — the one page where searching to pivot between
entities makes sense. Every other route (home, about, contact, terms,
privacy, 404) renders the clean solid bar (hamburger + home button, no
search). The home page keeps its own CrystalBall `SearchBar` as before.

## Files Changed

- `src/app.tsx` — `HeaderForRoute`: `showSearch={location.pathname === "/profile"}`
  (was `!== "/"`); updated the explanatory comment.

## Verification

- `npm run typecheck` — passes.

## Result

Header search bar appears only on `/profile`; all other pages show the
home-page-style solid bar.
