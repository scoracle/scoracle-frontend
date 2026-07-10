# 2026-07-10 - Solid Cleanup Pass

## Goal

Continue the post-AdSense cleanup toward a SolidStart-native shape: useful SSR,
normal `StartClient` hydration for real users, eager product panes, and local
product failures.

## What Changed

- Removed `ContentShell`'s post-hydration pane mount gate.
- Profile now renders every visible card pane through Solid SSR/hydration; tab
  changes only switch the active CSS state.
- Kept pane-local `Suspense` and `ErrorBoundary` wrappers so hidden product
  failures stay inside their own pane.
- Added a local `/leaderboard` board error face inside the leaderboard `Shell`,
  preventing selected-board fetch failures from replacing the whole route.
- Added source-level tests that guard both architecture choices.

## Verification

- `npm run typecheck`
- `npm test`
- `npm run cf:build`
