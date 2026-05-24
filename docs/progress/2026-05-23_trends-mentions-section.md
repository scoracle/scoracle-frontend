# 2026-05-23 — TrendsCard: fold CoMentions in as a Mentions section

## Goal

The standalone Co-Mentions tab/card had been pulled from the nav but
kept around the codebase as latent code. The matching algorithm
(`findCoMentions`) is genuinely useful, but a whole tab for it
overweighted what's really a small "who's being talked about alongside
this entity" signal. Fold it into TrendsCard as a `Mentions · Last 48
Hours` section so the signal survives without the tab tax.

## What Was Done

`src/components/solid/TrendsCard.tsx`:

- New `news` / `twitter` / `entities` createAsync resources, all
  reading the same `query()`-cached server-fns / bundled-JSON loaders
  the other cards use (so the route's existing `firePreloads` warming
  covers them — no extra requests).
- `tweetToArticle` adapter lifted verbatim from the retired
  CoMentionsCard. `articleAgeMs` helper computes age against
  `published_at` (or legacy `pub_date`).
- `mentions` memo flattens news + (when available) tweets into an
  `Article[]`, filters to items published within the last 48h, then
  hands them to `findCoMentions` with the current entity excluded.
- `showMentions` flag folds the new section into the existing
  `isEmpty` check + divider gating, matching the Record pattern.
- `MAX_MENTION_ROWS = 5` mirrors the other section caps.
  `MENTION_WINDOW_MS = 48 * 60 * 60 * 1000` carries the section's
  promised window so the label and the data stay honest.
- New section block at the bottom of the Card body — `Mentions ·
  Last 48 Hours` header, then a flat list of `[entity name]
  [count]` rows. No expand/collapse, no nested article list — if the
  user wants source articles, Articles / X tabs are one click away.

`src/components/solid/TrendsCard.css`:

- New `.trends-mention-row` (2-col grid: `1fr auto`), `.trends-
  mention-name`, `.trends-mention-count`. Same typographic register
  as the Vibes row so the section reads as a quiet sibling.

`src/routes/profile.tsx`:

- Added `void getEntities(sport);` to `firePreloads` so the bundled
  entity directory is warm by the time TrendsCard's Mentions memo
  reads it.
- Replaced the "co-mentions disconnected" header comment with the
  current reality (lives inside TrendsCard now).

`src/lib/data/entities.ts`,
`src/components/solid/ArticlesCard.tsx`,
`src/components/solid/XCard.tsx`:

- Stale docstring references to `CoMentionsCard` retargeted to "the
  Mentions section in TrendsCard."

### Deleted

- `src/components/solid/CoMentionsCard.tsx`
- `src/components/solid/CoMentionsCard.css`

Both were already disconnected from the nav (no entry in `PANES` /
`NAV_ITEMS`, no member in the `ProfileTab` union) — this removal just
catches the codebase up to that decision.

### Kept

- `src/lib/utils/co-mentions.ts` — the matching algorithm (token /
  surname / "best match wins" logic), now imported by TrendsCard.
- `src/lib/utils/co-mentions.test.ts` — protects the matcher.
- `src/lib/data/entities.ts` — `getEntities` is now an active
  dependency rather than a dormant one.

## Files Changed

- `src/components/solid/TrendsCard.tsx`
- `src/components/solid/TrendsCard.css`
- `src/routes/profile.tsx`
- `src/lib/data/entities.ts`
- `src/components/solid/ArticlesCard.tsx`
- `src/components/solid/XCard.tsx`
- `src/components/solid/CoMentionsCard.tsx` (deleted)
- `src/components/solid/CoMentionsCard.css` (deleted)

## Verification

- `npm run typecheck` — clean
- `npm test` — 137/137 (the co-mentions matcher suite is unchanged
  and still passing as a leaf import).
- `grep -rn CoMentions src` returns only the intentional references
  inside TrendsCard (the `findCoMentions` import + the "retired
  CoMentionsCard" historical note in the tweet-adapter docstring).

UI not opened in the browser this commit — Mentions renders inline
with the rest of Trends; once verified manually a follow-up tweak
might cap the row count differently or relabel the window.

## Result

Net change: ~50 lines added across TrendsCard + CSS, ~190 lines
deleted (CoMentionsCard + CSS), small docstring cleanups elsewhere.
Co-mentions signal survives, the tab tax doesn't.
