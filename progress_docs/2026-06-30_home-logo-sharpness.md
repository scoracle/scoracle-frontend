# 2026-06-30 - Home logo sharpness

## Goal

Restore the main Scoracle crystal-ball logo to a sharper web render after prior file-size optimization left the linework looking rough.

## What Changed

- Restored `public/images/scoracle_crystal_ball.png` from the pre-optimization RGBA source.
- Removed `image-rendering: -webkit-optimize-contrast` and `image-rendering: crisp-edges` from the home crystal-ball images so the browser uses normal high-quality interpolation.

## Files Changed

- `public/images/scoracle_crystal_ball.png`
- `src/components/solid/CrystalBall.css`
- `progress_docs/2026-06-30_home-logo-sharpness.md`

## Verification

- `npm run typecheck`
- `npm run build`
- Local dev server at `http://127.0.0.1:5173/`
- Browser DOM check confirmed the logo renders from `/images/scoracle_crystal_ball.png` with natural size `1378x1309`, displayed at `560x532`, and computed `image-rendering: auto`.
- Generated a local 560px render against the page background to verify smooth linework at desktop display size.

## Result

The home logo trades about 185 KB back into the critical brand asset and removes hard-edged scaling. The displayed linework is visibly cleaner while the asset remains small enough for a first-screen image.
