# 2026-05-28 — Prune client share to a single crawler-rendered OG image

## Goal

With SSR OG card sharing now working, shares were producing **two** images: the
in-app share button fetched the server-rendered `/og/...` PNG and attached it as a
`File` to the Web Share API, *and* the share target's crawler independently rendered
the OG card from the URL. Collapse to just the one crawler-rendered OG image, then
sweep the share module for leftover code from the earlier image-generation attempts.

## What Was Done

- **Dispatch** (`lib/share/dispatch.ts`): dropped the PNG `fetch`, `File` creation,
  and `canShareFiles`/`canShare` check. `shareCard` now hands only
  `{ title, text, url }` to `navigator.share`; the crawler renders the single image
  from the URL's `og:image`.
- **ShareTrigger** (`lib/share/ShareTrigger.tsx`): removed the `pngUrl` builder, the
  now-dead `comparedEntity` metadata field, and the loading spinner (no network wait
  remains).
- **Fallback modal** (`components/solid/ShareFallbackModal.tsx`): removed the PNG
  preview, download button, and blob-URL plumbing. Now: post copy + Open X / Open
  Facebook / Copy link, each carrying the URL so those platforms render the OG card.
- **De-junk sweep:**
  - Deleted `lib/share/index.ts` — a barrel imported by nobody (VibeCard imports
    `ShareTrigger` directly).
  - Slimmed `lib/utils/share-entity.ts` → `lib/utils/entity-name.ts`: the old
    `readShareEntity` returned `{name, imageUrl, context}` (incl. a second team-meta
    lookup) for the removed client share *frame*; only the name is used now.
  - Removed dead `.share-trigger-spinner` / keyframes / `:disabled` CSS.
  - Fixed stale `ShareFrame` / `readShareEntity` references in `global.css` and
    `lib/og/entity-facts.server.ts`.
- **Docs** (`CLAUDE.md`): rewrote the stale Card-convention share section — it still
  described `<Shell share={…}>` with an html-to-image snapshot pipeline. Now documents
  the `<ShareTrigger>` sibling + crawler-OG model and notes the old approach was
  removed.

Kept untouched: `lib/og/*` (the server OG renderer — the one image), and
`text.ts`/`categories.ts`/`share-url.ts` (share copy + URL; tested, Phase-D forward
design, not image-attempt junk).

## Files Changed

`lib/share/dispatch.ts`, `lib/share/ShareTrigger.tsx`, `lib/share/ShareTrigger.css`,
`lib/share/index.ts` (deleted), `lib/share/text.ts`,
`components/solid/ShareFallbackModal.tsx` (+`.css`), `components/solid/Shell.tsx`,
`components/solid/VibeCard.tsx`, `lib/utils/share-entity.ts` → `lib/utils/entity-name.ts`,
`lib/og/entity-facts.server.ts`, `global.css`, `CLAUDE.md`. Net ≈ −250/+150 lines,
one file deleted, one renamed.

## Verification

- `npm run typecheck` — clean.
- `npm test` — 137/137 pass.
- Grep sweep — zero dangling references to `readShareEntity`, `share-entity`,
  `ShareEntityFacts`, `pngUrl`, `share-trigger-spinner`, `ShareFrame`, or the deleted
  barrel.

## Result

In-app share now sends only `{title, text, url}`; the redundant client-attached PNG is
gone, so a share renders exactly one image — the crawler's OG card. The client share
module is down to its handler (`dispatch.ts`) + UI, with `lib/og/*` as the single image
source.
