# 2026-05-23 — Share dispatch + share-text + categories + fallback modal

## Goal

Build the client-side runtime for "share this card." Cards (next
commit) hand a small metadata object to `<ShareTrigger>`; this
commit lays the runtime that ShareTrigger calls into:

- `shareCard()` — fetches the PNG, tries Web Share API with file
  attachment, falls back to a modal on Firefox / old browsers.
- `buildShareText()` — composes "Check out {entity}'s {category}
  report" with sport-aware category mapping.
- `<ShareFallbackModal>` — desktop / Firefox path. Preview + download
  + open X + open FB + copy link.

## What Was Done

### NEW — `src/lib/share/categories.ts`

`categoryFor(cardType, sport)` maps the canonical card-type union
(`vibe | stats:{slot} | compare:{slot} | traits | trends`) to the
lowercase phrase that fits inside "Check out X's __ report."

Pulls `ChartSlotId` from `~/lib/utils/stats-categorizer.ts` so the
slot vocabulary stays in lockstep with the chart layer. Sport-aware
override mirrors the chart-label override:
- football: `setpiece → "set pieces"`
- nfl: `setpiece → "special teams"`
- nba: `setpiece → "dead ball"`

Compare cards append `" comparison"` so the share copy reads
"defensive comparison report."

### NEW — `src/lib/share/text.ts`

`buildShareText({ entityName, cardType, entity, tab })` returns
`{ text, url }`. Composes the canonical "Check out X's Y report"
copy via `categoryFor`, builds the canonical URL via the existing
`buildShareUrl`. Returned separately so the dispatcher can hand
each as its own field to `navigator.share({ text, url, files })` —
apps that respect `url` render their own link card from it; apps
that ignore it still get the URL because Web Share joins them
at send-time.

### NEW — `src/lib/share/dispatch.ts`

`shareCard({ pngUrl, text, url, title? })` — the single client
entry point. Fetches the PNG, packages it as a `File`, runs
`navigator.canShare({ files })` capability check, calls
`navigator.share()` if supported. Returns one of three results:
- `{ kind: "shared" }` — OS sheet completed or user dismissed.
- `{ kind: "fallback", blob }` — Web Share unavailable; caller
  renders ShareFallbackModal with the blob.
- `{ kind: "error", message }` — PNG fetch failed; caller surfaces.

Coverage: mobile Safari/Chrome, desktop Safari/Chrome/Edge → OS
sheet with image attached (zero extra steps). Firefox → fallback
modal.

### NEW — `src/components/solid/ShareFallbackModal.tsx`

Renders centered over a dimmed backdrop. Shows the actual tarot
PNG preview (so the user sees what they'd share), the pre-filled
post copy, and four routes out:
- Download image (anchor click on object URL)
- Open X (intent URL in new tab)
- Open Facebook (sharer URL in new tab)
- Copy link (clipboard API)

Italic hint at the bottom: "Attach the downloaded image when
your composer opens." The intent URLs and copy/download don't
require the user to glue them together themselves — they pick
the path that fits.

CSS uses the locked antique-tarot palette (Bone surface, paper
shadow, 6px rounded corners, italic PT Serif) so it reads as
part of the card system.

### NEW — tests

- `categories.test.ts` — 5 cases: vibe label, sport-neutral
  defaults, setpiece sport overrides, compare-suffix, case-
  insensitive sport.
- `text.test.ts` — 3 cases: canonical "Check out X's Y report"
  shape, sport-aware setpiece in copy, compare suffix.

## Files Changed

```
src/lib/share/categories.ts                              (NEW)
src/lib/share/categories.test.ts                         (NEW)
src/lib/share/text.ts                                    (NEW)
src/lib/share/text.test.ts                               (NEW)
src/lib/share/dispatch.ts                                (NEW)
src/components/solid/ShareFallbackModal.tsx              (NEW)
src/components/solid/ShareFallbackModal.css              (NEW)
docs/progress/2026-05-23_share-dispatch-and-fallback.md  (this doc, NEW)
```

## Verification

- `npm run typecheck` — clean.
- `npm test` — 118/118 passing (8 new cases added).

## Result

Client runtime is ready. Next commit wires `<ShareTrigger>` as the
small button Cards drop inside their Shell. The Shell primitive is
not touched — composition over inheritance, keeping Shell pure for
the eventual `@scoracle/ui` extraction.

## What's NOT in this commit (intentional)

- **ShareTrigger component** — commit 4. The button + state machine
  (loading spinner during PNG fetch, fallback modal mount on
  `dispatch()` returning `kind: "fallback"`).
- **VibeCard migration** — commit 5. Drop legacy `ShareButton`,
  delete `intents.ts` (the popover-based path that opens X/FB
  intents instead of attaching the PNG).
- **Stats / compare card wiring** — commits 6 + 7. Need ShareTrigger
  first.
