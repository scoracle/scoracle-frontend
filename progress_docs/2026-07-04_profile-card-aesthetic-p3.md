# 2026-07-04 - Profile card aesthetic P3 continuation

## Goal

Continue the P3 items from the profile-card aesthetic audit conservatively:
strengthen Sigil hierarchy, widen Trends sparklines, inspect the Momentum
payload before changing the headline, compare the boxed avatar direction, and
finish the remaining frontend-owned restraint/voice polish.

## What Changed

- Increased the Sigil card's arcane hierarchy without changing Shell/Card
  ownership:
  - larger archetype art
  - display-scale archetype name using the archetype's source casing
  - slightly tighter Sigil-only frame inset
  - visible `Reversed` cue when the reversal mechanic is active
- Let Trends sparklines occupy more of the card width:
  - wider SVG viewBox
  - responsive full-width sparkline block
  - axis labels now follow the scaled chart width
- Compared a real football player headshot (`FOOTBALL/player/37700784`) in a
  temporary local visual sheet, then kept the existing free-floating avatar
  treatment in production.
- Restrained Stats chart hover:
  - pizza and butterfly charts no longer jump font weight on hover
  - hover radius and label-size boosts are smaller
- Cleaned the Sigil credit voice from raw model id to `read by Gemma` when the
  model version identifies Gemma, with a neutral Scoracle fallback.
- Ran a final shared chrome/frame review and cleaned stale comments that still
  described old ContentShell-as-Shell behavior, nested EmptyCard chrome, skeleton
  whole-card loading, or Shell owning share behavior.

## Momentum Contract Check

Checked the live backend contract in:

- `../scoracle-backend/ENDPOINTS.md`
- `../scoracle-backend/go/internal/db/db.go`
- `src/lib/data/momentum.server.ts`

Result: `/momentum` does not currently expose a trajectory direction or
momentum score. The backend docs still describe raw values only, and the Go
query emits state/series fields such as `entity_event_scores`,
`entity_season_score_*`, `vibes.snapshots`, and
`entity_season_sentiment_series`. The Trends headline was therefore left
state-based; deriving a direction client-side would violate the data-boundary
rule for this pass.

Noted mismatch for later: `ENDPOINTS.md` names the season vibe series
`entity_season_vibe_series`, while the live Go response and frontend type use
`entity_season_sentiment_series`.

## Boxed Avatar Comparison

No production avatar behavior changed. The comparison was documented, but the
free-floating image approach remains the chosen treatment for player photos,
team crests, crest fallbacks, monograms, and provider placeholders.

Current free avatar:

- best for transparent team crests and NBA/NFL player fallback-to-crest cases
- keeps the Meta card quiet and avoids cropping unknown provider images
- weaker for football player photos, which can float instead of reading as
  framed card content

Scoped boxed-player-photo mock direction:

```css
.pw-logo-boxed-photo {
  width: 92px;
  height: 112px;
  padding: 0;
  object-fit: cover;
  object-position: center top;
  background: var(--photo-placeholder);
  border: 1px solid var(--hairline-soft);
  border-radius: 4px;
}
```

Decision: keep the free-floating avatar treatment. The boxed crop gives real
photos more visual mass, but it adds a frame that does not fit the current Meta
card direction.

## Visual QA

- Static Sigil/Trends QA sheet showed the 124px Sigil art, display-scale
  archetype name, and `read by Gemma` footer fit the card hierarchy without
  changing Shell/Card chrome ownership.
- Static Trends QA sheet showed the 420px sparklines carry more visual mass
  without crowding the inset frame.
- Browser screenshot QA was not available in this environment because no
  Chromium/Playwright binary is installed.

## Files Changed

- `src/components/solid/SigilCard.tsx`
- `src/components/solid/SigilCard.css`
- `src/components/solid/MomentumCard.tsx`
- `src/components/solid/MomentumCard.css`
- `src/components/solid/EntityMeta.tsx`
- `src/components/solid/EntityMeta.css`
- `src/components/solid/PizzaChart.tsx`
- `src/components/solid/PizzaChart.css`
- `src/components/solid/ButterflyChart.tsx`
- `src/components/solid/ButterflyChart.css`
- `src/components/solid/StatsCard.css`
- `src/components/solid/ContentShell.css`
- `src/global.css`
- `progress_docs/2026-07-04_profile-card-aesthetic-p3.md`

## Verification

- `npm run typecheck` clean.
- `npm test` passes: 20 files / 130 tests.
- `npm run build` passes for client and SSR bundles.

## Result

P3 frontend-owned polish is now substantially complete: Sigil reads more like
the arcane peak, Trends sparklines carry more visual mass, Stats hover is
quieter, Sigil credit copy is product-facing, and avatar production behavior
stays on the free-floating image treatment. The final review left Shell/Card
chrome ownership clearer in code comments. Momentum headline work remains
blocked on an explicit backend direction/score contract.

## Follow-Up

- Backend/data-contract: add explicit Momentum direction and trajectory score
  before making the Trends headline trajectory-first.
- Backend docs: reconcile `entity_season_vibe_series` vs
  `entity_season_sentiment_series`.
- Browser QA real profile pages once a browser runner is available; this pass
  used local static visual sheets instead.
