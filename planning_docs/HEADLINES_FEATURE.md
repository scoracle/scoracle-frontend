# Headlines Feature - Frontend Implementation Plan

**Status:** Approved
**Date:** 2026-06-28
**Author:** Scotty Heneveld / Scoracle
**Related:** Backend plan in scoracle-backend/planning_docs/HEADLINES_FEATURE.md

---

## Overview

Add headlines as a third scope option in the existing NewsCard ScopeRail dropdown, alongside news (narratives) and transfers. Headlines are entity-scoped breaking news bulletins - one-sentence blurbs about high-impact events for the specific player or team being viewed.

### Key Decisions
- Scope: Entity-scoped (same as narratives/transfers)
- Display: One-sentence blurb format
- Sorting: published_at DESC (recency)
- Time Format: Relative (2h ago)
- Source Display: Same prominence as transfers
- Entity Links: Clickable if in DB
- Related Entities: NO for v1
- Heat Score: Not displayed

---

## Current State

NewsCard component (src/components/solid/NewsCard.tsx) currently displays narratives by default and shows transfers when newsScope equals transfers. Uses ScopeRail dropdown controlled by newsScope state in ProfileContext. Fetches data via getNews() and getTransfers() from server-side loaders.

Current NewsScope type in src/contexts/profile.ts: export type NewsScope = "news" | "transfers"

---

## Implementation Tasks

### Phase 1: Type Updates (1 hour)
- Extend NewsScope type in src/contexts/profile.ts to include headlines

### Phase 2: Data Layer (2-3 hours)
- Create src/lib/data/headlines.server.ts
- Define Headline interface with: id, title, category, source_url, source_name, published_at
- Define HeadlinesResponse interface
- Implement fetchHeadlinesImpl function
- Export getHeadlines query wrapper
- Verify entityProductUrl supports headlines product

### Phase 3: NewsCard Component Updates (4-6 hours)
- Add headlines state using createAsync
- Update scopeIdentifier function to handle headlines case
- Add Show when={newsScope() === "headlines"} branch
- Implement headline rendering with title, category, relative time, source
- Add empty state fallback
- Add formatRelativeTime utility if not exists

### Phase 4: CSS Styling (2-3 hours)
- Add .news-headlines container styles
- Add .headline article styles
- Add .headline-text styles
- Add .headline-meta styles
- Add .headline-category styles
- Add .headline-time styles
- Add .headline-source styles

### Phase 5: ScopeRail Integration (1-2 hours)
- Locate ScopeRail dropdown implementation
- Add Headlines option to dropdown
- Test scope switching between all three options
- Verify URL param updates correctly

### Phase 6: Entity Linking (Optional - 2-3 hours)
- Make entity names in headlines clickable
- Add navigation to entity profile on click
- Only link if entity exists in DB

---

## Data Flow

User selects Headlines in ScopeRail -> newsScope() === headlines -> NewsCard renders Show when={newsScope() === "headlines"} -> createAsync getHeadlines executes -> GET /api/v1/{sport}/{entityType}/{id}/headlines -> Response updates headlines state -> For each headline, render article.headline

---

## Performance
1. Lazy loading: Only fetched when scope is selected
2. Cache: Leverage backend cache headers (5 min TTL)
3. Bundle size: Minimal impact
4. Prefetch: Optional future optimization

---

## Testing
- ScopeRail dropdown shows Headlines option
- Selecting Headlines fetches and displays data
- Switching between all three scopes works smoothly
- Empty state when entity has no headlines
- Error handling for failed fetch
- Test with both player and team entities
- Responsive design on mobile
- Verify no regression in existing news/transfers functionality
- Entity links work (if implemented)

---

## Timeline
Phase | Time
------|------
Type updates | 1h
Data layer | 2-3h
NewsCard component updates | 4-6h
CSS styling | 2-3h
ScopeRail integration | 1-2h
Entity linking (optional) | 2-3h
Testing and polish | 4-6h
Total | 14-22 hours

---

## Dependencies
- Backend: /api/v1/{sport}/{entityType}/{id}/headlines endpoint must exist
- Types: scoracle-types repo may need updates (if used)

---

## Success Criteria
- Headlines option visible in ScopeRail dropdown
- Selecting Headlines displays breaking news for current entity
- Headlines render with title, category, relative time, source
- Switching between scopes is smooth and instant
- Empty state shows appropriate message
- All existing news/transfers functionality unchanged
- Mobile responsive design works correctly
- Entity links work (if implemented)
- All tests passing

---

## File Changes Summary

New files: src/lib/data/headlines.server.ts

Modified files:
- src/contexts/profile.ts (extend NewsScope type)
- src/components/solid/NewsCard.tsx (add rendering)
- src/components/solid/NewsCard.css (add styles)
- ScopeRail component or parent (add dropdown option)