# 2026-05-14 — Locked Shell strict enforcement + session-end notes

## Goal

Force the locked Shell silhouette to hold even when content's
min-content exceeds the aspect-derived height. `aspect-ratio` alone
is only a *preferred* ratio — content can push the box past it.
VibeCard's art + score + name + subtext + credit stack was tall
enough to override the lock; MetaShell did the same on entities
with long venue names (Real Madrid).

## What Was Done

`src/global.css`:

- Locked `.shell` now also has:
  - `max-height: calc(var(--card-width) * 11 / 19)` — strict cap at
    the aspect-derived height (348px when `--card-width: 600px`).
  - `overflow: hidden` — content beyond the cap gets clipped at the
    chrome edge instead of pushing the box taller.
- `.shell.shell-unlocked` resets both:
  - `max-height: none`
  - `overflow: visible`

Net: locked Shells (Vibes, MetaShell, EmptyCard, future Phase D
children) hold at exactly 600×348 regardless of content. Unlocked
Shells (profile-nav, Articles, X, Traits, Stats, Compare,
home-search) keep their content-driven sizing.

## Files Changed

```
src/global.css
docs/progress/2026-05-14_shell-strict-lock-and-open-issues.md  (this doc, NEW)
```

## Verification

- `npm run typecheck` — clean.
- `npm test` — 101/101.
- Visual: VibeCard, MetaShell, and EmptyCard all sit at strict
  600×348 on profile pages. Unlocked surfaces unchanged.

## Open issues — pick up next session

### 1. CLS regression — needs proper resolution

Status: **partial mitigation, not a full fix.**

The `.content-shell-panes { min-height: 800px }` reservation in
`src/components/solid/ContentShell.css` absorbs SOME pane-swap
shift, but the underlying CLS hasn't been fully eliminated:

- Cards taller than 800px (long Articles/X lists, Stats/Compare
  with full charts) still grow past the reservation and shift the
  footer below.
- The active-pane container's height jumps abruptly between tabs
  when content heights differ — sticky-mount only helps on the
  *second* visit to each tab; the first activation of each tab is
  still a fresh content arrival.
- User reported the CLS as a sporadic Cloudflare-deploy regression
  earlier in the session. The DevTools trace pointed at
  `div.content-shell-pane.active` as the shift source (~496ms in
  the captured Performance trace).

Possible directions for next session:
- Reserve `100vh` or scale the pocket per-card-type (locked vs
  unlocked) rather than a single 800px value.
- Skeleton heights that match the resolved card so first
  activation doesn't shift.
- Internal scroll inside long-list cards (Articles/X) with a fixed
  pane height, so the pane never grows past the reservation.

### 2. Shell mental-model gap — user feedback

> "I feel like the <Shell> is not fully being grasped by you in
> this session (at least not the way I see it), which is fine.
> I'll fix it later." — 2026-05-14 session end.

For the next session: re-read `~/scoracleWiki/wiki/Architecture/
Component Hierarchy.md` carefully, ask clarifying questions before
proposing structural changes, and confirm the user's mental model
of locked / unlocked / share / chrome BEFORE writing code.

### 3. Card-content redesigns for the strict-locked silhouette

The 380×220 → 600×348 transition landed the strict locked Shell
shape, but the inner content layouts of the locked Cards still
overflow:

- **VibeCard** — art + score + archetype + subtext + credit stack is
  taller than the 308px content area inside Shell padding. The
  `vibe-credit` footer (`gemma4:e4b · May 14`) gets clipped under
  the new `overflow: hidden` rule. Likely needs a more horizontal
  layout (art on left, score+name+subtext on right) or compressed
  vertical with smaller art + tighter margins.
- **MetaShell** — long venue names (Real Madrid → "Estadio
  Santiago Bernabéu") wrap and overflow. Detail grid likely needs
  to be two-column with tighter rows, or content abbreviated.
- **EmptyCard** — already fits comfortably (landscape art + caption,
  ~190px content). No changes needed.

User explicitly chose "keep locked + redesign inner layout to fit"
for both MetaShell and VibeCard. That work is queued for the user
to drive in a follow-up.

### 4. `display: flex` on Shell — confirmed problematic

Removing `display: flex` from `.home-search-shell` fixed the missing
bottom border. Same chrome-pseudo-element rendering bug would
likely surface on any other Shell that goes flex. Convention going
forward: don't set `display: flex` on the Shell itself; use flex on
inner wrappers if needed, OR rely on block flow + `margin: 0 auto`
on children (the profile-nav-shell + home-search-shell pattern).

## Result

Locked Shell silhouette is now strictly enforced (600×348). The
remaining gap is content redesigns inside locked Cards + the CLS
resolution — both are queued for the user's next session.

## Branch state

15 commits ahead of `origin/main` at session end. Ready to push.
