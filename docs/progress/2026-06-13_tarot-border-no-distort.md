# Tarot border: stop it distorting on tall cards (border-image)

## Goal
Fix the "wonky" tarot border Scott flagged on the Transfers card/board — distorted only
there, while Rating/Fantasy/Vibes looked clean.

## Root cause
`.card::before` painted the single `weathered-tarot-border.svg` (viewBox 0 0 100 100,
`preserveAspectRatio="none"`, one wobble `<path>`) via `background-size: 100% 100%` — i.e.
**stretched non-uniformly to the card box**. The wobble + corner curves are tuned for ~canonical
aspect. The leaderboard wraps the whole board in ONE `<Shell>`, and the Transfers board's rows
are ~5 lines each (headshot + full blurb) → the card is **~6,968px tall** (×398 wide) → a ~17×
vertical stretch → distorted corners + amplified top-edge wobble. Only Transfers because it's by
far the tallest card on the site (single-line boards stretch far less). Not a Shell-vs-Card issue.

## Fix
Repaint `.card::before` as a **CSS `border-image`** (`slice 18% / width 16px / stretch`): corners
render fixed-size and each edge stretches ONLY along its length, so card height never distorts the
corners or amplifies the wobble. Reuses the exact SVG art; global (every card benefits).

## Files Changed
- `src/global.css` (`.card::before`)

## Verification (Playwright, local dev, 430px mobile viewport)
Screenshotted three aspect ratios:
- Transfers board (6,968px tall) — **distortion gone**, clean crisp top edge + corners.
- Rating board (2,860px) — still clean (no regression).
- Canonical profile card (567px) — clean corners, border at the card edge (no regression).

## Result
One consistent, crisp tarot border at any card height. No content/height cap needed; full blurbs
stay. Next: finish the Card-pillar migration (Vibe/News/Roster → `<Card>`).
