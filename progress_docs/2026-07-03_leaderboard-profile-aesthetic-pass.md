# 2026-07-03 — Leaderboard + profile aesthetic pass

## Goal

Dedicated composition pass on `/leaderboard` and `/profile`, reviewed with
both pages fully rendered (mock Go-API fixtures on `localhost:8000` feeding
the dev server, SSR screenshots via a script-stripping proxy — the backend
is unreachable from this environment).

## What Changed

- **EntityMeta avatar fallback.** The meta card's logo/photo is a
  third-party URL (team crests are Wikipedia-hosted; provider CDNs can
  403/404). A failed load rendered a raw broken-image glyph + alt text at
  the top of the brand's flagship card. Now: no-URL and failed-load states
  render a display-serif monogram on the `--photo-placeholder` surface
  (mirrors the leaderboard's `.lb-avatar-mono` idiom). Load failures that
  fire before hydration attaches the error listener are caught by reading
  `img.complete && naturalWidth === 0` off the element, deferred a tick so
  the swap can't desync hydration keys.
- **Meta detail wrap.** `.pw-detail-item`'s fixed 92px flex-basis wrapped
  multi-token values mid-value ("2014 · R1 ·" / "#4"). Items are now
  content-sized with a 92px floor and 11rem cap — short values keep the
  column rhythm, long values hold one line or wrap at word boundaries.
- **News identifier band.** `.news-identifier` (sticky scope header) painted
  `var(--bg)` — the page cream — inside the lighter `bg-card` surface,
  rendering as a gray band across the card. Now `var(--bg-card)`.
- **Leaderboard corner expression.** The board Shell rendered the corner-dot
  fallback; per the Card anatomy ("data-bearing when possible") the
  season-scoped boards (Rating / Fantasy) now stamp the active season year
  into the corner slots via `cornerLabel`. Live boards (News / Vibe /
  Trending / Transfers) have no season and keep the dots.

## Files Changed

- `src/components/solid/EntityMeta.tsx` / `EntityMeta.css`
- `src/components/solid/NewsCard.css`
- `src/routes/leaderboard.tsx`

## Verification

- `npm run typecheck` clean; `npm test` 18 files / 127 tests pass.
- Rendered before/after with fixture data: rating + transfers boards, and
  the profile's stats/rating/news/trends/sigil tabs. Verified the monogram
  fallback with JS enabled (hydration intact), the one-line draft value,
  the band-free News card, and the "2025" corner numerals on the board.
- Note: client hydration of data routes is flaky under the dev server in
  headless Chromium (pre-existing — reproduced identically on the
  pre-change commit via a scratch worktree; production async SSR is
  unaffected).

## Result

Both pages now hold the card doctrine under real data: the meta card
survives dead image URLs as a composed object, tables keep their rhythm,
and the board shell's corners reveal data instead of decoration.

## Follow-Up

- Consider self-hosting or proxying entity crest imagery — Wikipedia
  hotlinks are fragile (rate-limited/403-prone), and the monogram fallback,
  while composed, shouldn't become the common case.
- RatingCard's hero art is still the placeholder circle glyph ("plumbing;
  refine once real illustrations land" per the component comment).
