# 2026-05-14 — Shell API expansion: template + share metadata

## Goal

Lay the foundation for the "Shell as platform primitive" refactor.
After this commit, `<Shell>` is the only thing a Card needs to import —
the rest (chrome, share button, modal, share frame, snapshot pipeline)
lives inside Shell. Commit A is the API expansion; Commit B has every
Card adopt; Commit C slims ShareFrame + adds Compare's dual-meta.

No consumer changes here. Default `template="dynamic"` makes the
expansion byte-equivalent at runtime for existing call sites.

## What Was Done

**`<Shell>` props expanded** (`src/components/solid/Shell.tsx`):

- `template?: "standard" | "dynamic"` — sizing variant. `standard` =
  uniform compact ~380px tarot-card silhouette (used by VibeCard,
  MetaShell, EmptyCard, future Stats categories). `dynamic` = no
  width cap (used by nav strips, list-style cards). Default `dynamic`
  so unchanged consumers keep their current behavior.
- `cornerLabel?: string` — static-prop alternative to the existing
  `useShell()?.setCornerLabel(...)` publish pattern. Takes priority
  over context publish when both are set. EntityMeta's existing
  publish pattern still works.
- `ref?: (el: HTMLElement) => void` — forwarded to the Shell's root
  via `Dynamic`'s ref support. Useful for external measurement /
  focus / snapshot.
- `share?: ShellShareMeta` — single grouped prop that opts the Shell
  into the entire share apparatus. When set, Shell internally mounts
  `<ShareButton>` with a default preview function constructing
  `<ShareFrame {primary, name, cardType, canonicalUrl, computedAt, cornerLabel}>{props.children}</ShareFrame>`.
  Cards never touch ShareButton, ShareModal, ShareFrame, or
  html-to-image directly.

**CSS** (`src/global.css`):

- `.shell.shell-standard` — `width: 100%; max-width: 380px; margin-inline: auto`.
- `.shell.shell-dynamic` — marker class, no sizing rules (caller owns).
- `.shell > .share-btn` — `position: absolute; top: 14px; right: 14px; z-index: 3`
  (above `.card::before`, `.card > *`, and corner numerals). Single
  global rule means every shareable Shell positions its share
  affordance identically.

**`<ShareButton>`** — `tab` prop made optional. Cards without a
specific deep-link target (e.g., generic share with no `?tab=...`)
can now pass `undefined` cleanly. Behavior unchanged for callers
that supply a tab.

## Files Changed

- `src/components/solid/Shell.tsx` — props expanded; internal share
  composition wired in; corner-label resolution (prop > publish).
- `src/global.css` — new `.shell-standard` / `.shell-dynamic` /
  `.shell > .share-btn` rules.
- `src/components/solid/ShareButton.tsx` — `tab` optional.

## Verification

- `npm run typecheck` — clean.
- `npm test` — 102/102 pass.
- Home + profile SSR return 200.
- Manual: existing VibeCard share modal still works (it still uses
  the old direct-ShareButton path until Commit B; the new Shell-share
  path is dormant).

## Result

Foundation laid. Adding share to a new card is now (post-Commit B):

```tsx
<Shell template="standard" cornerLabel={maybeLabel} share={{
  cardType: "thing",
  entity: { sport, type, id },
  tab: "thing",
  name: entityName,
  text: shareText,
  primary: { imageUrl, context },
  computedAt: data()?.generated_at,
}}>
  {cardBody()}
</Shell>
```

Set-and-forget. Commit B has every Card adopt this pattern + dissolves
the ContentShell outer chrome.
