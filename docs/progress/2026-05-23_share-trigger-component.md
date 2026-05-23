# 2026-05-23 — ShareTrigger component

## Goal

Build the small absolute-positioned button Cards drop inside their
Shell. ShareTrigger composes the runtime built in the previous
commit (`dispatch` + `buildShareText` + `ShareFallbackModal`) into
a one-liner Cards opt into:

```tsx
<Shell as="article" aria-label="Vibe" cornerLabel={…}>
  <ShareTrigger metadata={shareMeta()} />
  {cardBody()}
</Shell>
```

Shell stays pure — composition over inheritance — so it ports
cleanly to `@scoracle/ui` alongside ShareTrigger when sandbox lands.

## What Was Done

### NEW — `src/lib/share/ShareTrigger.tsx`

Renders the 32×32 button (same square-with-arrow glyph as the
legacy ShareButton). On click:

1. Build the PNG URL from `metadata.{cardType, entity, comparedEntity}`.
   - Solo: `/og/{cardType}/{sport}/{type}/{id}`
   - Compare: `/og/compare/{cardType}/{sport}/{type}/{id}/vs/{type2}/{id2}`
2. Build the post copy + URL via `buildShareText`.
3. Switch to loading state (spinner glyph swap, `aria-busy`,
   `disabled`).
4. Call `shareCard()` from `dispatch.ts`.
5. On `{kind: "shared"}` — done. OS sheet handled it.
6. On `{kind: "fallback", blob}` — mount `<ShareFallbackModal>` with
   the blob.
7. On `{kind: "error", message}` — console.error for now; production
   telemetry hook can land later.

Self-contained: imports nothing flagship-specific. Extract-ready
for `@scoracle/ui`.

### NEW — `src/lib/share/ShareTrigger.css`

Self-contained styling — does NOT depend on the legacy
ShareButton.css (which dies in commit 5). Includes:
- `.share-trigger-root` (absolute top-right of nearest positioned
  ancestor)
- `.share-trigger` button (transparent / tertiary-color border;
  tarot palette via `--text-*` tokens)
- `.share-trigger-spinner` (rotating ring during PNG fetch)
- `:disabled` and `:focus-visible` states

## Files Changed

```
src/lib/share/ShareTrigger.tsx                 (NEW)
src/lib/share/ShareTrigger.css                 (NEW)
docs/progress/2026-05-23_share-trigger-component.md  (this doc, NEW)
```

## Verification

- `npm run typecheck` — clean.
- `npm test` — 118/118 passing.

## Result

ShareTrigger is the single component Cards need to import for
share. Next commit migrates VibeCard from the legacy `ShareButton`
to `<ShareTrigger>` and deletes `ShareButton.tsx` + `intents.ts` +
`ShareButton.css`.

## What's NOT in this commit (intentional)

- **VibeCard migration** — commit 5.
- **Legacy ShareButton.tsx / intents.ts / ShareButton.css deletion**
  — commit 5.
- **Stats / Compare per-category wiring** — commits 6 + 7.
