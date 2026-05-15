# 2026-05-15 — EntityMeta migrates to cornerLabel prop

## Goal

Drop the `useShell()` / `setCornerLabel()` context-publish pattern from
EntityMeta in favor of a static `cornerLabel={ctx.id}` prop on its own Shell.
EntityMeta was the only consumer of the `useShell()` context path; everyone
else (VibeCard) already used the prop. Collapsing to one canonical mechanism
removes the second corner-label path and prepares Shell for the slim down in
step 5 (the `useShell` context + provider + the createSignal/setPublishedLabel
wiring inside Shell.tsx all become dead code after this commit).

Step 2a of the Shell retool sequence.

## What Was Done

`src/components/solid/EntityMeta.tsx`:

- Dropped `useShell` from the Shell import.
- Dropped `onCleanup` from the solid-js import — only used by the corner-label
  cleanup pair, now unused.
- Added `cornerLabel={ctx.id}` to the outer `<Shell>`. `ctx.id` is from
  `ProfileContext` which the route sets synchronously, so the prop lands at
  mount without waiting on async meta resolution.
- Removed the `createEffect(() => shell?.setCornerLabel(id))` and the matching
  `onCleanup(() => shell?.setCornerLabel(undefined))` from `EntityMetaBody`.

Subtle improvement: the corner ID now renders synchronously on first mount
instead of after `EntityMetaBody`'s effect runs — eliminates a brief
accent-dots-to-ID flash on cold loads.

## Files Changed

```
src/components/solid/EntityMeta.tsx
docs/progress/2026-05-15_entitymeta-corner-label-prop.md  (this doc, NEW)
```

## Verification

- `npm run typecheck` — clean.
- `npm test` — 101/101.
- Visual on dev server (`http://localhost:5174`):
  - Profile page with a player entity (e.g., `?sport=NBA&type=player&id=237`):
    entity ID renders in MetaShell's top-left + bottom-right corners exactly
    as before — italic Soft-sand, BR rotated 180°.
  - No flash of accent-dots before the ID lands on cold loads.
  - VibeCard's archetype numeral (which already used the prop path) unchanged.
- User confirmed visually.

## Result

EntityMeta is on the canonical `cornerLabel` prop path; the `useShell()`
context path now has zero consumers. The context provider + signal + setter
in `Shell.tsx` survive as dead code for one more iteration — they get removed
together with the rest of Shell's slim-down in step 5 so Shell.tsx's diff
stays single-concern.

## What's NOT in this commit (intentional)

- **`Shell.tsx` is unchanged.** The `useShell()` export + `ShellContext`
  provider + `[publishedLabel, setPublishedLabel]` signal + `effectiveLabel`
  reconciliation all stay until step 5.
- No other Cards touched — every other Shell consumer (VibeCard, ContentShell,
  ArticlesCard, etc.) was already on the prop path or doesn't use a corner
  label at all.
