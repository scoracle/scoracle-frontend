# 2026-05-23 — VibeCard → ShareTrigger; delete legacy ShareButton

## Goal

Cut VibeCard over to the new `<ShareTrigger>` and delete the legacy
share plumbing (`ShareButton.tsx`, `ShareButton.css`, `intents.ts`).
This commit makes the new pattern THE share pattern — no parallel
paths, no compat shims.

## What Was Done

### MODIFIED — `src/components/solid/VibeCard.tsx`

- Dropped `import { ShareButton } from "../../lib/share"`.
- Added `import ShareTrigger from "../../lib/share/ShareTrigger"`.
- Added `import { readShareEntity } from "../../lib/utils/share-entity"`
  to resolve the primary entity's display name (needed for the post
  copy: "Check out {name}'s vibes report").
- Replaced the `<ShareButton url={…} text={…} />` body with
  `<ShareTrigger metadata={{ cardType: "vibe", entity, entityName,
  tab: "vibes" }} />`.
- Removed the no-op `shareText()` and `canonicalUrl()` helpers —
  ShareTrigger builds both internally via `buildShareText`.
- Moved `<ShareTrigger>` above `{cardBody()}` in the Shell — order
  doesn't affect layout (it's absolute-positioned) but reads cleaner
  with the trigger first.

### REWRITTEN — `src/lib/share/index.ts`

New public surface:
- `ShareTrigger` (default export from `./ShareTrigger`)
- `shareCard` + types from `./dispatch`
- `buildShareText` + types from `./text`
- `categoryFor` + `CardType` from `./categories`

Old surface (`ShareButton`, `buildXIntentUrl`,
`buildFacebookShareUrl`, `copyToClipboard`, `tryWebShare`,
`canWebShare`) is gone — anything still importing those would have
broken typecheck, and grep confirms VibeCard was the only consumer.

### MODIFIED — `src/components/solid/Shell.tsx`

Updated the comment that referenced `<ShareButton>` to point at
`<ShareTrigger>` and the new attach-via-Web-Share approach. No code
changes — Shell stays pure.

### DELETED

```
src/lib/share/ShareButton.tsx
src/lib/share/ShareButton.css
src/lib/share/intents.ts
```

Per the user's directive ("junk the existing structure for the
card"), no fallback paths preserved. The legacy popover-based flow
that opened X/FB intents (and relied on platform crawlers to fetch
og:image — which was failing in practice) is gone.

`src/lib/utils/share-entity.ts` stays — VibeCard imports
`readShareEntity` from it, and the Stats/Compare wiring commits
will use it too.

## Files Changed

```
src/components/solid/VibeCard.tsx                               (ShareTrigger swap)
src/components/solid/Shell.tsx                                  (comment update)
src/lib/share/index.ts                                          (new surface)
src/lib/share/ShareButton.tsx                                   (DELETED)
src/lib/share/ShareButton.css                                   (DELETED)
src/lib/share/intents.ts                                        (DELETED)
docs/progress/2026-05-23_vibecard-share-trigger-migration.md    (this doc, NEW)
```

## Verification

- `npm run typecheck` — clean.
- `npm test` — 118/118 passing.
- Grep for `ShareButton`, `buildXIntentUrl`, `buildFacebookShareUrl`,
  `tryWebShare`, `canWebShare`, `intents` — no stale references in
  `src/`.

## Result

VibeCard is the first Card on the new share pipeline. Click the
share glyph → PNG fetched from `/og/vibe/{sport}/{type}/{id}` →
attached to the OS share sheet → user picks app → posts with the
image already attached.

The legacy share infra is gone. No parallel paths.

## What's NOT in this commit (intentional)

- **StatsCard per-category wiring** — commit 6. Each Phase D
  category Shell gets its own ShareTrigger with `cardType:
  "stats:{slot}"` metadata; the OG route adds the pizza body
  renderer.
- **CompareCard per-category wiring + compare OG route** —
  commit 7 (route) + 8 (CompareCard wiring), or merged.
- **Manual browser verification** of the OS share-sheet flow —
  requires running the local dev server + a real entity with vibe
  data. Deferred to the user.
