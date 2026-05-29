# 2026-05-28 — Show posted time on article/tweet rows

## Goal

Surface *when* each article and tweet was published, not just the day. The
News tab previously rendered only "May 28"; users tracking publication
timing want the time of day too.

## What Was Done

- Added `formatDateTime()` to `src/lib/utils/date.ts` — renders
  `"May 28, 3:45 PM"` in the viewer's **local** timezone via
  `toLocaleString('en-US', { month, day, hour, minute })`. Returns `""` for
  missing/invalid input. Existing `formatDate()` (date-only) is untouched, so
  VibeCard and the OG-image cards keep their current look.
- `NewsCard.tsx` now shows date + time for the merged articles+tweets feed.
  Local time can't be known on the server (Cloudflare = UTC), so rendering is
  gated on a post-mount signal: SSR / first hydration render shows date-only
  (matching server HTML), then upgrades to date + local time `onMount`. This
  avoids a guaranteed per-row hydration mismatch — the same SSR-safety concern
  `TrendsCard` already handles by pinning UTC.
- Added `formatDateTime` tests (TZ-tolerant shape assertion + empty/invalid
  handling).

No CSS change needed — `.news-meta` already wraps via `flex-wrap: wrap`.

Note: the full publish timestamp already flowed end-to-end (RSS / X API →
`TIMESTAMPTZ` → ISO string → frontend); only the display truncated it. So this
is a frontend-only change. Article times come from Google News RSS `PubDate`,
whose granularity can be coarser than tweet times.

## Files Changed

- `src/lib/utils/date.ts` — new `formatDateTime()`
- `src/components/solid/NewsCard.tsx` — post-mount-gated date+time render
- `src/lib/utils/date.test.ts` — tests for `formatDateTime`

## Verification

- `npm run typecheck` — clean
- `npm test` — 139/139 pass

## Result

Article & tweet rows in the News tab now display local posted time
("May 28, 3:45 PM") via an SSR-safe `formatDateTime` helper.
