# 2026-07-04 — Leaderboard aesthetic audit

Scope: the `/leaderboard` page — headline, board item rail, scoped-control
rail, the Shell-wrapped ranked list across all five boards (Rating, News,
Vibe, Trending, Transfers/Trades), and the loading/empty faces. Audited
against `../scoracle-tokens/AESTHETIC_VISION.md`, code-level plus a rendered
pass: production build (`vite build` + `vite preview`) driven headlessly at
1440×900 and 390×844 with live backend data on the Rating, News, Vibe, and
Transfers boards.

Companion to the same-day home/AppRail audit
(`2026-07-04_home-apprail-aesthetic-audit.md`). Severity legend as before:
**[doctrine]** conflicts with a written rule; **[coherence]** the system
doesn't read as one hand; **[opportunity]** an on-brand move not yet taken.

Environment note, not a finding: the dev server intermittently renders the
error boundary ("template2 is not a function") on blurb-carrying boards after
a Vite dep-cache clear — a dev-only optimize-deps artifact. The production
build hydrates all boards cleanly; that's what this audit's screenshots used.

---

## Verdict

This page is the product vocabulary working as written: an item rail for the
five product boards, dropdown/selects for every scope, one centered column
aligned to the card width, and a Shell whose corner numerals actually reveal
data. The drift is concentrated in three places: a bolded display-face title,
two rails that name the same five products differently, and wire-copy
attributions leaking through the Gemma blurbs.

---

## What already holds (don't churn)

- **Navigation doctrine is textbook.** Products (Rating/News/Vibe/Trending/
  Trades) ride a `tablist` item rail with the quiet 2px ink underline;
  scopes (Players/Teams, season, news window, trending metric, search) are
  all dropdown/select disclosures underneath, composed in one NavRailStack
  (`leaderboard.tsx:397-444`). No scope chips, no pills, no boxed toggles —
  exactly "item rails for unique product containers, dropdowns/selects for
  scopes."
- **Corner expression is data-bearing where the data exists.** Season-scoped
  boards stamp the resolved season (`2025`) in the corner slots; live boards
  fall back to the quiet corner dots (`leaderboard.tsx:446-457`). This is the
  S1 fix from the profile audit, landed and visible in render.
- **Color discipline is total.** Chrome is neutral ink-on-cream; color
  appears only in tier-mapped metrics (rating/vibe/impact/heat), the
  transfer-stage verdict text, and provider imagery in native colors — all
  sanctioned contexts. Fifty green-to-gold numbers down the right edge read
  as data, not decoration.
- **The list typography is role-correct.** Ranks and metrics in DM Sans with
  `tabular-nums`, names in the body serif at medium, metric labels as
  eyebrows, blurbs in editorial serif at text-secondary. The row grid
  (rank · avatar · name/sub · metric) is the "tabular reference row" the
  reference decks point at.
- **The single-column stack composes.** Headline → item rail → control rail →
  Shell all cap at `--card-width`, so the page reads as one object on the
  table. The share affordance is a quiet hairline box, gated off with the
  platform flag.
- **States behave.** Skeleton has a reduced-motion guard; empty rail states
  and the AppRail's new `aria-current` active treatment (from the home audit)
  render correctly against this page.

---

## Findings

### L1. The page title bolds the display face — [doctrine]

> "Do not bolden the display face. Use size, spacing, and placement."

`.lb-title` sets `font-weight: var(--weight-medium)` on Fraunces
(`leaderboard.css:27`). Rendered next to the home wordmark (regular weight,
tracked caps), the leaderboard title is visibly heavier — same class of hit
the profile audit logged for `.trends-score-val` (S2). Drop to
`--weight-regular`; if it then feels light, the sanctioned levers are size
and tracking, and `h1` already gets `letter-spacing: 0.02em` from global.

### L2. Two rails, two names for the same five products — [coherence]

The AppRail says **Rankings · News · Vibes · Risers · Trades**; this page's
item rail says **Rating · News · Vibe · Trending · Trades**
(`AppRail.tsx:153-157` vs `leaderboard.tsx:65-71`). Both rails are on screen
at once. A user who clicks "Risers" lands on a tab called "TRENDING";
"Rankings" opens "RATING". Same product, same click, different word — this is
the deck reading as two hands. Pick one vocabulary per product and use it on
both rails (and in `BOARD_BLURB`/share titles). No opinion on which set wins;
the vision's voice section ("precise, controlled labels") slightly favors the
singular nouns already on this page.

### L3. Hairline recipes multiply — [coherence]

The page draws thin lines four different ways:

| Line | Recipe |
|---|---|
| Row dividers | `color-mix(text-tertiary 16%, transparent)` (`leaderboard.css:87`) |
| Share button border | `color-mix(text-tertiary 35%, transparent)` (`leaderboard.css:51`) |
| Select dropdown panel + option rows | `var(--border)` (`Select.css:70,91`) |
| SearchControl panel, rail hairlines | `var(--hairline-medium)` / `var(--hairline-soft)` |

Four adjacent grays with no semantic difference. The app-local system
(`--hairline-soft`/`--hairline-medium`, global.css:81-82) already exists —
route the row dividers and share border through it, and reconcile Select vs
SearchControl panels (they sit in the same toolbar and should share one
border value).

On the dividers themselves: the vision says "avoid decorative row dividers
inside content cards," and a 50-row ranked table is the strongest case for
calling them functional (row tracking in dense data). Keeping them is
defensible; keeping them at a bespoke opacity is not.

### L4. Wire-copy attributions leak through the blurbs — [coherence, voice]

> "Raw feed/passthrough presentation when the product should be a derived
> read" is drift.

Rendered transfers blurbs end in raw sourcing: *"…attributed to Fenerbahce"*,
*"…- sources (ESPN Singapore)"*, *"…(Tribuna.com, We Ain't Got No History)"*.
GemmaSummary already has the designed answer — a trailing italic
`source` slot (`GemmaSummary.tsx:12-20`) — but the leaderboard mapper passes
only `blurb: r.summary ?? r.gemma_summary` (`leaderboard.tsx:241`) and no
source, so attribution arrives baked into the sentence in whatever format the
upstream text used. If the payload carries a source field, wire it through;
if the attribution is embedded upstream, that's a backend/prompt cleanup to
log. Either way the card should read "derived read — *cited quietly*," not
wire copy.

### L5. `capitalize` retitles the narrative headlines — [coherence]

`.lb-sub { text-transform: capitalize }` (`leaderboard.css:178`) Title-Cases
every word of the News board's headline sub-lines — rendered: "Potential
Destinations **For** LeBron James". It also cosmetically hides the true
casing of team names and directions. Capitalize the enum-ish values
(direction, trajectory) at the formatting layer if needed, and let real
headlines keep their editorial casing.

### L6. Eyebrow variants drift from the shared one — [coherence]

Global defines `.eyebrow` (0.75rem, 0.14em tracking, `--weight-medium`).
This page hand-rolls three cousins: `.lb-blurb` (0.72rem/0.12em),
`.lb-share` (0.72rem/0.1em), `.lb-metric-label` (0.58rem/0.1em). The metric
label earns its smaller size (it's a data annotation), but the page eyebrow
under the title is exactly what `.eyebrow` is for. Converge where the role is
the same.

### L7. Trending board: green is direction, not tier — [opportunity, note]

Trending rows hardcode `metricColor: tierColor(85)` — elite green for every
riser regardless of magnitude — plus a `▲` glyph in the label
(`leaderboard.tsx:309-311`). Everywhere else on the page, color encodes tier;
here it encodes "up," which quietly breaks the palette's semantics. Two
honest options: tier the color by the actual delta magnitude, or keep
green-as-direction deliberately and note it in the vision's data-color
section. The current state reads as the first option half-done.

### L8. Empty and loading faces don't speak deck-back — [opportunity]

> "Deck-back art is the null/loading/fallback face for card-like
> uncertainty."

The empty board is a bare tertiary sentence ("Nothing on this board yet.",
`leaderboard.tsx:462`) centered in an otherwise blank Shell; loading is a
generic pulse skeleton (`BoardSkeleton`, `leaderboard.tsx:532-547`). The
profile deck already has the standout EmptyCard-as-Veil, and `LoadingCard`
exists as of this branch. The leaderboard is card-shaped uncertainty when a
board is empty — the veil treatment would make the null state part of the
deck instead of a collapsed placeholder. Low urgency; the empty state is rare
in production.

### L9. Voice nits — [opportunity]

- `BOARD_BLURB` leads two boards with "Hottest…" ("Hottest narratives by
  impact", "Hottest rumors by heat index"). "Heat" is legitimately the
  product's metric noun, but "hottest" twice over is the one place the page
  edges toward sports-media urgency. "Leading narratives by impact" /
  "Rumors by heat index" would say the same thing cooler.
- Player avatars are circle-cropped (`.lb-round`) while team marks sit in
  6px boxes. Defensible (portrait vs crest), but it's the same
  circles-in-a-rigid-system thread as the AppRail recents marks (home audit
  H4) — if those go boxed, revisit these together.

---

## Suggested order

1. L1 title weight — one token, pure doctrine.
2. L2 rail vocabulary — small string change, biggest daily-feel win; touch
   AppRail labels and BOARD_BLURB/share copy together.
3. L3 hairline consolidation + L6 eyebrow convergence — mechanical CSS pass.
4. L5 drop `capitalize` from `.lb-sub`.
5. L4 source-slot wiring (needs a look at the transfers/news payload fields).
6. L7 trending color decision, L8 veil faces, L9 voice — backlog.
