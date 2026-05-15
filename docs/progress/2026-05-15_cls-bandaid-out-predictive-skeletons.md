# 2026-05-15 — Drop the CLS bandaid; predictive skeletons

## Goal

Per the user's direction on step 7: "make sure we remove the former
bandaid fix of having a max card size built in. We want the page truly
reactive to the shell sizes."

Removes the page-level `min-height: 800px` reservation in
`ContentShell.css` that absorbed first-activation height differences
between Cards. That value was a guess: short Cards (locked VibeCard
at ~400 px including frame + padding) sat with 400 px of empty
reserved space below them; tall Cards (X feed > 800 px) still grew
past the reservation and shifted the footer down. Non-scalable bandaid.

Pairs the reservation removal with **predictive skeleton sizing per
Card**. Each unlocked Card's skeleton now matches its typical resolved
content's height, so first-activation skeleton → content swap shifts
the page by tens of pixels (the delta between skeleton and final
content) rather than hundreds (the 240 px skeletons vs 700-2800 px
resolved content gap before this commit).

Step 7 of the Shell retool sequence. Closes the original 8-step plan
at the code level.

## What Was Done

### `ContentShell.css` — page-level reservation gone

Dropped `min-height: 800px` from `.content-shell-panes`. The pane
container now uses the natural height of whatever active pane is
displayed (`display: flex` on `.content-shell-pane.active`; others
`display: none`).

### Predictive skeleton sizing (5 Cards updated)

| Card | Before | After | Approx resolved |
|---|---|---|---|
| `ArticlesCard` | 3 × 80 px = 240 px | 8 × 88 px = 704 px | ~700 px (8 news items × ~88 px) |
| `XCard` | 3 × 80 px = 240 px | 8 × 140 px = 1120 px | ~1500–2800 px (10–20 tweets × 140 px) |
| `TraitsCard` | 5 rows ≈ 280 px | 12 rows ≈ 700 px | ~600–900 px (~10–14 trait rows × 56 px) |
| `StatsCard` | 1 × 180 px circle | 4 × 260 px in 2×2 grid | ~600 px (4 pizza charts) |
| `CompareCard` | 1 × 180 px circle | search-row + 4 × 260 px grid | ~600–700 px (header + chart grid) |

Locked Cards (`VibeCard`, `EmptyCard`, `EntityMeta`) already have a
stable Shell silhouette (600 × 348 + chrome) — their skeletons match
that silhouette by inheriting the locked Shell shape, so they didn't
need this pass.

## Files Changed

```
src/components/solid/ContentShell.css
src/components/solid/ArticlesCard.tsx
src/components/solid/XCard.tsx
src/components/solid/TraitsCard.tsx
src/components/solid/StatsCard.tsx
src/components/solid/CompareCard.tsx
docs/progress/2026-05-15_cls-bandaid-out-predictive-skeletons.md (this doc, NEW)
```

## Verification

- `npm run typecheck` — clean.
- `npm test` — 101/101.
- Visual on dev server: tab swaps no longer reserve 800 px of empty
  space below short Cards; skeleton→content swap on first activation
  shifts the page by small amounts (tens of pixels rather than
  hundreds). User confirmed visually.

**Caveat:** the proper measurement is a Chrome DevTools Performance
trace with Layout Shift regions captured, comparing pre/post CLS
score. The fix is principled (no fixed reservation, predictive
skeletons), but quantified validation depends on browser-side
profiling that lives outside this commit. The original session-
ending feedback ("sporadic Cloudflare-deploy regression") may also
have been deploy-environment-specific; production re-validation
after the bundled steps-1-7 deploy is the final word.

## Result

The original 8-step Shell retool plan is complete at the code level:

| Step | Status | Summary |
|---|---|---|
| 1  | ✅ | Strict-lock CSS dropped |
| 2a | ✅ | EntityMeta cornerLabel migration |
| 2b | ✅ | NavTabs decouple from Shell shape |
| 3  | ✅ | OG image route foundation (resvg-wasm + PT Serif) |
| 4a | ✅ | OG dispatcher + VibeCard.vibeArtifactSvg |
| 4b | ✅ | OG three-band composition (header + frame + footer) |
| 4c | ✅ | og:image meta tags via @solidjs/meta |
| 4d | pending | Production deploy + X verification |
| 5  | ✅ | Slim Shell + new src/lib/share/ module |
| 6  | ✅ | Delete legacy ShareButton/Modal/Frame + drop html-to-image |
| 7  | ✅ | CLS bandaid out + predictive skeletons |

Ready for `git push` + `npm run cf:deploy`.

## What's NOT in this commit (intentional)

- **Production CLS profile.** Improvements are principled but not
  quantitatively measured. After deploy, a Lighthouse run on
  scoracle.com would give the real number.
- **Skeleton size tuning per real entity data.** The X feed skeleton
  predicts 8 tweets × 140 px = 1120 px. If real data routinely returns
  20 tweets averaging 200 px = 4000 px, there's still a delta. Tune
  with real-world feedback rather than guessing further now.
