# 2026-05-14 — ShareFrame slim + dual-meta header

## Goal

Finish the **Shell-as-vessel** refactor: ShareFrame becomes a band
wrapper with no chrome of its own; chrome inside the modal preview
comes from a fresh inner `<Shell>` provided by the outer Shell. Add
dual-meta header support so Compare's share artifact renders both
entities side-by-side when a comparison is selected.

## What Was Done

### ShareFrame becomes a band wrapper

`ShareFrame.tsx`:

- Dropped `.card` class from the body div — the inner Shell now
  draws chrome.
- Removed the `cornerLabel` prop — the inner Shell handles corner
  numerals via its own `cornerLabel` prop.
- Renamed `.share-frame-body` → `.share-frame-card-slot` so the name
  reflects the new role (it holds a Shell, doesn't draw a card).
- Added a `template: ShellTemplate` prop so the frame's max-width
  matches the artifact's silhouette (standard → 380px, dynamic →
  540px).
- Added a `secondaryEntity` prop (`{name, imageUrl, context}`) plus
  a dual-meta header layout: primary entity left, "vs" pill, secondary
  entity right-aligned. Layout flips to `space-between` when
  `secondaryEntity` is populated.

### Shell wraps preview children in a fresh inner Shell

`Shell.tsx`:

- Inside the preview function, the JSX is now
  `<ShareFrame template={template()} …><Shell template={template()} cornerLabel={props.cornerLabel}>{props.children}</Shell></ShareFrame>`.
- That inner Shell has no `share` prop — no recursion, no second
  share button in the modal.
- Passes `share.secondary` straight through to ShareFrame's
  `secondaryEntity`.
- Dropped the `cornerLabel` prop from the ShareFrame call site
  (inner Shell carries it).

### ShareFrame.css rewritten

- Drops every `.card` chrome rule that previously lived on
  `.share-frame-body`.
- Adds per-template max-widths: `.share-frame-standard` (380px),
  `.share-frame-dynamic` (540px).
- Adds dual-meta layout (`.share-frame.share-frame-dual` →
  `space-between` header, right-aligned secondary entity text).
- Tightens entity-name/context typography for the dual-meta case
  (max-widths to keep both heads from overflowing).
- Keeps the in-frame `.vibe-card { min-height: 0 }` rule so the share
  artifact is content-driven height regardless of the in-app
  minimum.
- Cards-inside-frame surrender any `margin-inline: auto` from their
  template-driven sizing — the share frame centers the slot itself.

### Wiki note

No vault edits in this commit — the Component Hierarchy doc already
captures the "ShareFrame is internal to Shell" pattern (locked in
the previous commit). The dual-meta artifact is a Phase D enabler
worth a callout in [[Share Frame]] later, but that doc lives in the
vault and can land independently.

## Files Changed

```
src/components/solid/Shell.tsx
src/components/solid/ShareFrame.tsx
src/components/solid/ShareFrame.css
docs/progress/2026-05-14_shareframe-slim-dual-meta.md (this doc, NEW)
```

## Verification

- `npm run typecheck` — clean.
- `npm test` — 102/102 passing.
- `pkill -f vite && npm run dev`, then SSR smoke-check:
  - `GET /` → 200
  - `GET /?tab=…` for every sub-tab → 200
  - `GET /profile?sport=football&type=player&id=1100&tab=…` for every
    sub-tab → 200
- No errors / warnings in the dev log (just the benign workerd
  `--localstorage-file` notice).

After commit, manual:

- Open the Vibes share modal — preview should show the band-wrapped
  inner Shell with the tarot border drawn by the inner Shell, not
  the frame.
- Open the Compare share modal with a comparison selected — header
  band should show two entity heads with a "vs" pill between them;
  unselected compare reverts to single-meta.
- Download from each modal → non-blank PNG, content-driven height,
  ~380px standard / ~540px dynamic.

## Result

The full Shell-as-vessel refactor lands. ShareFrame's only job is
to add the identification + attribution bands; the Card silhouette
inside the modal is identical to the in-app card because it IS the
same `<Shell>` primitive, rendering the same `cardBody`. Add a new
shareable Card → write the body, write the `share` metadata, hand
both to Shell. No share infrastructure ever appears in a Card file.

Phase D (Stats split into four `<Shell template="standard" share={…}>`
category cards) is now a straight feature add — no Shell, ShareFrame,
or ShareButton API change required.
