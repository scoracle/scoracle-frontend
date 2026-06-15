# Per-product fetchers — cards own their data

## Goal
Replace the two bundled "rail" fetchers (`getNewsRail`, `getSparkline`) with one
fetcher per card product, matching the backend's per-product endpoints. "News" and
"stats" are the two sources; each card is a self-contained product with its own
endpoint, its own fetcher, and zero shaping on the client.

## What Was Done
- **New data layer** (`src/lib/data/`): `getNews` (/news), `getTransfers`
  (/transfers), `getVibes` (/vibes), `getStats` (/stats), `getSpecial` (/special).
  `getTrends` + `getRoster` kept. One URL helper `entityProductUrl(sport,type,id,
  product,season?)` builds every per-entity product path. Deleted `news-rail.server.ts`,
  `sparkline.server.ts`, `vibe.server.ts` and the old per-endpoint URL builders.
- **Stats split**: `getStats` carries the full season rating (breakdown, modes,
  fantasy, template, scoped ranks) + `events` (the per-event series for Trends) +
  `available_seasons`. `getSpecial` is the lean specialist projection + the Gemma
  commentary. The rating types (`RatingDatapoint`, `RatingModeBlock`, …) live in
  `stats.server.ts`; `special.server.ts` re-uses them.
- **Cards repointed**: Composite→`getStats`, Special→`getSpecial`, Trends→`getStats`+
  `getTrends`, Vibe→`getVibes`, News→`getNews` (**narratives only — transfers scope
  dropped**, since news is a post-transfers pipeline layer), Transfers→`getTransfers`.
  ContentShell (control strip)→`getStats`; EntityMeta→`getStats`+`getVibes`; OG bodies
  →`getStats`/`getVibes`. `card-registry` preloads warm each card's exact product.
- **Vibe unified**: one `/vibes` product feeds both the Vibe card and the meta corner
  score (`.current.sentiment`) — the old narrow `getVibe` is gone.

## Files Changed
New: data/{news,transfers,vibes,stats,special}.server.ts. Deleted: data/{news-rail,
sparkline,vibe}.server.ts; sparkline.test.ts→stats.test.ts. Modified: every profile
card, ContentShell, EntityMeta, og-bodies, card-registry, data-sources, the og route.

## Verification
`npm run typecheck` clean · `npm run build` clean · `npm test` 113/113 · dev-server
SSR of /profile (team + player) renders 200 with no errors against the live backend's
per-product endpoints.

## Result
Each card fetches exactly its own product. No rail bundling, no client-side shaping —
the data layer is one clean `get<Product>` per card, ready for the iOS app to mirror
the same contracts 1:1.
