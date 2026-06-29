# Headlines Feature - Frontend Implementation Plan

**Status:** Approved - Revised
**Date:** 2026-06-29
**Author:** Scotty Heneveld / Scoracle
**Related:** Backend plan in `scoracle-backend/planning_docs/HEADLINES_FEATURE.md`

---

## Overview

Add headlines as a third scope in the existing `NewsCard`, alongside narratives and transfers. Headlines are entity-scoped breaking-news bulletins — one-sentence blurbs about high-impact events for the current player or team.

This plan was revised during audit to match the frontend’s eager-mount model and to prune v1 scope.

### Key Decisions (Locked)

| Aspect | Decision |
|--------|----------|
| Scope | Entity-scoped (same as narratives/transfers) |
| Display | One-sentence blurb + category + relative time + source |
| Sorting | `published_at DESC` (recency) |
| Time format | Relative (e.g. "2h ago"), client-only to avoid SSR hydration mismatch |
| Source display | Same prominence as transfers |
| Entity links | **Deferred to v2** (backend does not return entity spans) |
| Related entities | NO for v1 |
| Heat score | Not displayed |
| Fetch model | Eager (matches existing News/Transfers scopes) |

---

## Current State

`NewsCard.tsx` renders narratives by default and transfers when `newsScope() === "transfers"`. It eagerly fetches both products via `createAsync` on mount. The scope selector is a `<Select>` inside `<ScopeStrip>` in `ContentShell.tsx`, driven by `newsScope` in `ProfileContext`.

Current `NewsScope` type: `"news" | "transfers"`.

---

## Implementation Tasks

### Phase 1: Types & URL plumbing (1h)
- [ ] Extend `NewsScope` in `src/contexts/profile.ts` to `"news" | "transfers" | "headlines"`
- [ ] Add `"headlines"` to `VALID_NEWS_SCOPES` in `src/routes/profile.tsx`
- [ ] Add Headlines option to `NEWS_SCOPE_OPTIONS` in `src/components/solid/ContentShell.tsx`
- [ ] Add `"headlines"` to the `entityProductUrl` product union in `src/lib/utils/data-sources.ts`

### Phase 2: Data Layer (1–2h)
- [ ] Create `src/lib/data/headlines.server.ts`:
  - `Headline` interface: `id, title, category, source_url, source_name, published_at`
  - `HeadlinesResponse` interface
  - `fetchHeadlinesImpl` with `"use server"`
  - `getHeadlines` query wrapper
- [ ] Preload `getHeadlines` in `src/components/solid/card-registry.tsx` alongside `getNews`/`getTransfers`

### Phase 3: NewsCard Rendering (3–4h)
- [ ] Add eager `createAsync(() => getHeadlines(...))` in `NewsCard.tsx`
- [ ] Add a third `Show when={newsScope() === "headlines"}` branch
- [ ] Render each headline as an `<article class="headline">`:
  - title
  - category badge
  - relative time (client-only)
  - source name / link
- [ ] Update outer `Show` condition to include headlines for empty-state logic
- [ ] Add empty state: "No breaking news this cycle."

### Phase 4: CSS (1–2h)
- [ ] Add `.news-headlines`, `.headline`, `.headline-title`, `.headline-meta`, `.headline-category`, `.headline-time`, `.headline-source` to `NewsCard.css`

### Phase 5: Relative Time Utility (1h)
- [ ] Add `formatRelativeTime(dateStr)` in `src/lib/utils/date.ts`
- [ ] Render relative time only after client mount to avoid hydration mismatch

### Phase 6: Testing (2–3h)
- [ ] Scope dropdown shows Headlines
- [ ] Selecting Headlines displays data
- [ ] Switching between all three scopes works smoothly
- [ ] Empty state when no headlines
- [ ] No regression in news/transfers
- [ ] Mobile responsive

---

## Data Flow

```
User selects Headlines in scope dropdown
        ↓
newsScope() === "headlines"
        ↓
NewsCard renders headlines branch (data already fetched eagerly)
        ↓
GET /api/v1/{sport}/{entityType}/{id}/headlines
        ↓
Render one article.headline per row
```

---

## Performance

- Eager fetch + `query()` deduplication keeps scope switching instant.
- Leverages backend 10-minute cache.
- Minimal bundle impact.

---

## Dependencies

- Backend `GET /{sport}/{type}/{id}/headlines` endpoint.

---

## Success Criteria

- Headlines option visible in scope dropdown.
- Selecting Headlines displays breaking news for the current entity.
- Headlines render with title, category, relative time, and source.
- Scope switching is instant.
- Empty state shows an appropriate message.
- Existing news/transfers functionality unchanged.
- Mobile responsive.
- All tests passing.
