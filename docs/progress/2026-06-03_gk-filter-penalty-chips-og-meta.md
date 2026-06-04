# 2026-06-03 — Non-GK pizza filter + penalty chips + OG meta card

## Goal

(1) Hide goalkeeper stats from non-keepers' pizzas. (2) Render the new NFL penalty
`discipline` datapoints as chips. (3) Fix the empty profile-share OG card — show the
meta-widget contents (no URL).

## What Was Done

- **GK filter** (`CompositeCard`): drop GK-exclusive slices (Shot-Stopping / Penalty
  Saves / Punching / High Claims) when the entity has no value there (NULL → outfielder).
  Keepers keep them.
- **Penalty chips**: relaxed the `chips()` filter to all non-pizza facets (discipline /
  squad), so the now-rated NFL Penalty Yards For/Against show as chips (football
  cards/injuries unchanged).
- **OG meta card** (task 3): the `/og` route's `resolveCardContent` now defaults to a
  **meta-widget body** (Composite / Specialist / Vibe score row) for `composite` / any
  unwired card type — previously it fell through to an empty body. Rendered **inline in
  the handler** (no dedicated card module — the handler renders the existing meta widget
  as an image; a card someone actually shares renders that card). Specialist uses the
  specialty's own pct + name (matches the card). `build-card` gains `hideFooter`; the
  meta card sets it → **no URL/footer, just header + scores** (per Scott).

## Files Changed

`components/solid/CompositeCard.tsx`, `routes/og/[cardType]/[sport]/[type]/[id].ts`
(inline meta body + default), `lib/og/build-card.ts` (hideFooter).

## Verification

`npm run typecheck` clean. (OG PNG verified post-deploy.)

## Result

Outfielders' pizzas drop GK slices; NFL penalty discipline shows as chips; sharing a
profile renders the meta card (name + logo + 3 scores), no URL — all in the handler.
Uniform card-sharability (all cards) remains the roadmap seam; the handler renders
whichever card's link is shared.
