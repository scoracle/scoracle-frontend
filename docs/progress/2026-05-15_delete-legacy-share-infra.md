# 2026-05-15 — Delete legacy share infrastructure

## Goal

Remove the unused legacy client-side share apparatus now that the OG-only
strategy has replaced it: the `Shell.tsx`-internal modal preview +
`html-to-image` snapshot pipeline (steps 1-5 in the Shell retool
sequence introduced the OG route, the og:image meta tags, and the new
`src/lib/share/` button + popover; this commit clears the deadwood).

Step 6 of the Shell retool sequence.

## What Was Done

### Legacy files deleted

- `src/components/solid/ShareButton.tsx` (~166 lines)
- `src/components/solid/ShareModal.tsx` (~186 lines)
- `src/components/solid/ShareFrame.tsx` (~130 lines)
- `src/components/solid/ShareButton.css` (~27 lines)
- `src/components/solid/ShareModal.css` (~116 lines)
- `src/components/solid/ShareFrame.css` (~164 lines)

All six files were already unreferenced after step 5 (Shell.tsx stopped
importing them, VibeCard switched to `src/lib/share/ShareButton`).
Together with the dependency drop below, the client-side share surface
shrinks by ~790 lines + ~200 KB of `html-to-image` transitive deps.

### Dependency dropped

- `html-to-image` removed via `npm uninstall`. The only consumer was
  the legacy ShareButton's `toBlob` snapshot call.

### Orphan comment cleanup

Three comments still referenced the retired `useShell()?.setCornerLabel`
context path; rewritten to point at the canonical `cornerLabel` prop:

- `src/global.css` — corner-dot fallback comment.
- `src/components/solid/EntityMeta.css` — corner numerals comment.
- `src/routes/profile.tsx` — ContentShell / EntityMeta import comment.

### Wiki updated

`~/scoracleWiki/wiki/Architecture/Component Hierarchy.md`:

- Position bullets rewritten: Shell is "pure chrome, ~80 lines, no share
  apparatus, no behavior." Cards import `<Shell>` + (when shareable)
  `<ShareButton>` from `src/lib/share/`. Dropped the dimension typo
  (`380×320` → `600×348`).
- Rule 0 rewritten to drop the share-ownership claim and the
  `useShell()` fallback path. Aspect ratio framed as "preferred, not
  strictly capped" — locked Cards grow rather than clip.
- Rule 3 fully rewritten: the share apparatus now lives in
  `src/lib/share/`; Cards opt in by rendering `<ShareButton>` and
  exporting a `<cardType>ArtifactSvg(input)` SVG-renderer alongside
  their DOM render. The OG route at `src/routes/og/...` calls those
  renderers server-side for social previews. The capability table is
  updated accordingly.
- Mapping table replaces the "private-to-Shell" entries
  (`ShareFrame.tsx`, `ShareButton.tsx`, `ShareModal.tsx`) with the new
  module paths (`src/lib/share/`, `src/routes/og/...`).
- `@scoracle/ui` exports paragraph adds `ShareButton` as a separate
  pillar primitive; removes the "internal-to-Shell" Share* exports.

## Files Changed

```
package.json                                              (dep drop)
package-lock.json                                         (dep drop)
src/global.css                                            (comment cleanup)
src/components/solid/EntityMeta.css                       (comment cleanup)
src/routes/profile.tsx                                    (comment cleanup)
src/components/solid/ShareButton.tsx                      DELETED
src/components/solid/ShareButton.css                      DELETED
src/components/solid/ShareModal.tsx                       DELETED
src/components/solid/ShareModal.css                       DELETED
src/components/solid/ShareFrame.tsx                       DELETED
src/components/solid/ShareFrame.css                       DELETED
docs/progress/2026-05-15_delete-legacy-share-infra.md     (this doc, NEW)
~/scoracleWiki/wiki/Architecture/Component Hierarchy.md   (wiki update)
```

## Verification

- `npm run typecheck` — clean.
- `npm test` — 101/101.
- `git status` confirms 6 D-state files + html-to-image gone from
  `package.json` dependencies.

## Result

The Shell retool sequence (steps 1-6) is now complete at the code
level. Shell is ~80 lines of pure chrome. Share has a dedicated
`src/lib/share/` module + a server-side OG route. The wiki narrative
matches the codebase reality. Remaining work in the original plan:

- **Step 7 (next)** — CLS investigation: drop the `min-height: 800px`
  reservation in `ContentShell.css` (the other 2026-05-14 bandaid),
  diagnose the actual layout shifters on X / Compare / Stats panes,
  and fix at the root.
- **Step 4d (post-step-7)** — production deploy of the bundled steps
  1-7 + verification on X. Confirms that pasting a Scoracle profile
  URL into the X composer shows the OG preview pulled from the new
  `/og/...` route.

## What's NOT in this commit (intentional)

- **`src/lib/utils/share-url.ts` + its tests** — not deleted. The
  helper is currently uncalled (VibeCard and the OG route both build
  canonical URLs inline), but it's a clean public API + 6 tests; left
  as-is to avoid scope creep. Future Cards that become shareable can
  adopt it.
- **`src/lib/utils/share-entity.ts`** — kept. Used by `VibeCard` for
  the in-app `shareText()` builder (the entity name component of the
  X composer pre-fill).
