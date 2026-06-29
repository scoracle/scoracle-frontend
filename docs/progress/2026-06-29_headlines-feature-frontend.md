# Headlines Feature — Frontend v1

**Date:** 2026-06-29
**Plan:** `planning_docs/HEADLINES_MASTER_PLAN.md` + `planning_docs/HEADLINES_FEATURE.md`
**Status:** Headlines scope wired end-to-end in the News card. Eager fetch, instant scope
switching, client-safe relative time, empty state.

## What was built

### Types & URL plumbing

- `src/contexts/profile.ts` — extended `NewsScope` to `"news" | "transfers" | "headlines"`.
- `src/routes/profile.tsx` — added `"headlines"` to `VALID_NEWS_SCOPES` so URL deep-links
  round-trip correctly.
- `src/components/solid/ContentShell.tsx` — added `"Headlines"` to `NEWS_SCOPE_OPTIONS`.
- `src/lib/utils/data-sources.ts` — added `"headlines"` to the `entityProductUrl` product
  union.

### Data layer

- `src/lib/data/headlines.server.ts` (new)
  - `Headline` + `HeadlinesResponse` interfaces matching the backend payload.
  - `fetchHeadlinesImpl` with `"use server"`.
  - `getHeadlines` wrapped in `query()` for deduplication.
- `src/components/solid/card-registry.tsx` — preloads `getHeadlines` alongside `getNews` /
  `getTransfers` so the Headlines scope is warm on profile open.

### Rendering

- `src/components/solid/NewsCard.tsx`
  - Eager `createAsync(() => getHeadlines(...))`.
  - Third `Show when={newsScope() === "headlines"}` branch.
  - Each headline renders title, category badge, relative time (client-only, post-mount),
    and source name/link.
  - Empty state: "No breaking news this cycle."
  - Scope identifier updates to "Breaking Headlines" for the new scope.
- `src/components/solid/NewsCard.css`
  - Added `.news-headlines`, `.headline`, `.headline-title`, `.headline-meta`,
    `.headline-category`, `.headline-time`, `.headline-source`, plus category-tinted
    badge variants.

### Relative-time utility

- `src/lib/utils/date.ts`
  - Added `formatRelativeTime(dateStr)` returning `"2h ago"`, `"3d ago"`, etc.
  - Returns `""` for missing/invalid input.
- `src/lib/utils/date.test.ts`
  - Added unit tests covering just-now, minutes, hours, days, weeks, months, years,
    and invalid input.

## Verification

```bash
npm run typecheck   # tsc --noEmit, passes
npm run build       # Vite client + SSR build, passes
npm test            # 121 passed (was 113), 0 failed
```

## File layout delta

```
src/contexts/profile.ts                  + "headlines" NewsScope
src/routes/profile.tsx                   + "headlines" VALID_NEWS_SCOPES
src/components/solid/ContentShell.tsx    + "Headlines" NEWS_SCOPE_OPTIONS
src/lib/utils/data-sources.ts            + "headlines" entityProductUrl union
src/lib/data/headlines.server.ts         NEW
src/components/solid/card-registry.tsx   + getHeadlines preload
src/components/solid/NewsCard.tsx        + headlines branch + eager fetch
src/components/solid/NewsCard.css        + headline styles
src/lib/utils/date.ts                    + formatRelativeTime
src/lib/utils/date.test.ts               + relative-time tests
docs/progress/2026-06-29_headlines-feature-frontend.md  NEW (this doc)
```

## Carry

- Backend endpoint `GET /api/v1/{sport}/{entityType}/{id}/headlines` must be live for
  the scope to populate in production; the frontend falls back to empty state if the
  response is 404/null.
