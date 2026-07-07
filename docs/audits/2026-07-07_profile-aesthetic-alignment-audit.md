# 2026-07-07 — Profile Aesthetic Alignment Audit

Fine-toothed-comb scan of the `/profile` page against
`../scoracle-tokens/AESTHETIC_VISION.md`. Scope: the route, both Shells
(MetaShell + ContentShell), every registry card (Stats, Rating, News,
Trends, Sigil, Roster, plus the Transfers scope), the shared primitives
they compose (Shell/Card, NavRail, Select, EmptyCard, Skeleton, charts),
and the token wiring underneath.

Verdict up front: the vessel is right. Card chrome, silhouette, color
discipline, and rail semantics all match doctrine. The drift is almost
entirely in **typography** (the brand faces never actually load; the
numeric role is never used; the display face gets boldened in spots),
plus one real surface bug, one voice leak, a fragmented hairline
vocabulary, and a pile of dead CSS.

Findings are ranked. Each is independent; nothing here blocks anything
else.

---

## P1 — Doctrine violations visible on screen

### 1. Brand faces are declared but never loaded
**[RESOLVED for Fraunces, same day — see addendum below]**

`@scoracle/tokens/css` emits `--font-display`/`--font-body` as
`'Fraunces', Georgia, …` and `--font-numeric` as `'DM Sans', system-ui, …`,
but this repo shipped **no `@font-face` and no font files** — no Fraunces,
no DM Sans, anywhere (`grep -ri fraunces src/ public/` → nothing; the
only bundled font was PT Serif for the OG rasterizer). Visitors without
Fraunces installed locally silently got the Georgia fallback.

The sneaky part: on machines that *do* have Fraunces installed (designer
machines), the bare family name in the token stack resolves against the
local font library, so the site *appears* fully Fraunces — the classic
local-font illusion. Production was only "on brand" for the people
closest to the brand.

**Addendum (2026-07-07):** Fraunces is now self-hosted — variable
woff2 (full `wght` + `opsz` axes, upright + italic, latin + latin-ext)
vendored from `@fontsource-variable/fraunces` 5.2.5 into
`public/fonts/`, declared in `global.css`, preloaded in `app.tsx`,
immutable-cached via `public/_headers`. Every visitor now gets the
display face's optical warmth. Still open from this finding: DM Sans
stays unloaded on purpose until finding 2's `--font-numeric` adoption
sweep gives it somewhere to land, and AESTHETIC_VISION's "current web
reality" column is accurate again but worth a governance-order touch
when DM Sans lands.

### 2. `--font-numeric` is used zero times

The numeric role owns "tables, small scores, stat values, jersey
numbers" — exactly the profile's densest data surfaces — yet no rule in
`src/` references it. Everything tabular rides `--font-body` +
`font-variant-numeric: tabular-nums`:

- `RatingList.css` — Roster/Transfers rank + score columns (`.rating-row`,
  `.rating-row-score`, `.rating-row-rank`)
- `NewsCard.css:100` — `.headline-time`
- `NewsCard.css:36-42` — `.narrative-impact` (a small score)
- `Select.css:43` — `.select-value` (season numerals)
- Pizza/Butterfly SVG labels inherit body (no explicit family;
  `PizzaChart.css`, `ButterflyChart.css`)

Once DM Sans is actually loaded (finding 1), sweep the small-numeral
surfaces onto `var(--font-numeric)`. Large scores (meta chips, vibe
score, rating hero) correctly stay on the display face — the doctrine
gives "large scores" to Display.

### 3. NewsCard scope identifier — wrong surface, sticky chrome, heaviest weight

`NewsCard.css:114-126` (`.news-identifier`):

- `background: var(--bg)` paints the **page** cream onto the card's
  bone (`--bg-card`) surface — a visibly mismatched strip across the
  card.
- `position: sticky; top: 0` makes a label inside a tarot artifact
  cling to the viewport and slide over the card's own content as the
  page scrolls. The card is an object on the table; its parts shouldn't
  detach from it. No other card has sticky internals.
- `font-weight: var(--weight-semibold)` — semibold on the body face,
  the heaviest weight on the whole page, spent on a label ("restraint
  is the brand" says spend weight on nothing, size/spacing on
  hierarchy).

Suggested fix: transparent background, no sticky, `weight-regular` (or
recast as the shared small-caps label style the other cards use, e.g.
`.rating-list-title`).

### 4. EmptyCard's default note leaks Vibe vocabulary onto every card

`EmptyCard.tsx:55-58` defaults the parenthetical to
`"(no mentions found)"`. Stats/Rating/Roster pass `message` ("No rating
yet.", "No roster ratings yet.") but not `note`, so an unrated player's
Stats card reads:

> THE VEIL — No rating yet. *(no mentions found)*

"Mentions" is the sentiment pipeline's word; it's false context on a
rating surface (voice doctrine: precise, controlled labels). Default the
note to `""` and let the Sigil/News callers opt in, or derive it from
the message.

---

## P2 — Type discipline inside the cards

### 5. The display face gets boldened

Doctrine: "Do not bolden the display face. Use size, spacing, and
placement."

- `RatingCard.css:48` — `.rating-hero-label` (display) `weight-medium`
- `MomentumCard.css:31` — `.trends-score-val` (display) `weight-medium`
- `routes/profile.css:39` — `.card-error-title` raw `font-weight: 600`

Meanwhile the sibling large scores (`.pw-score-value`, `.vibe-score`,
`.rating-hero-pct`) sit at light/regular. Pick one score spec (see 6)
and drop the medium/semibold from display-face text.

### 6. The "score" is one product idea with five typographic dialects

Tier-colored scores across the cards:

| Surface | Family | Weight | Size |
| --- | --- | --- | --- |
| Meta chips (`.pw-score-value`) | display | inherits 300 | 1.9 / 2.5rem |
| Trends (`.trends-score-val`) | display | 500 | 2.4rem |
| Rating hero (`.rating-hero-pct`) | display | inherits 300 | 2.4rem |
| Sigil (`.vibe-score`) | display italic | 400 | clamp(4–5.25rem) |
| Compare headline (`.compare-score`) | **body (unset)** | 500 | 1.6rem |
| Transfers heat (`.transfers-heat`) | display | inherits | 1.1rem |

The Sigil is allowed its peak treatment (italic, huge) — that's the
arcane apex by doctrine. The rest should converge on one family +
weight (display, regular-or-lighter), sizes stepped by placement. The
compare headline not even declaring a family is an accident, not a
choice. This is exactly the "two controls expressing the same product
idea" case the README says to converge through shared vocabulary — a
small `.score-value` utility (or token-documented spec) would harden it.

### 7. Two eyebrow dialects

`global.css` defines `.eyebrow` on `--font-ui`, but every card-internal
micro-label (`.pw-score-label`, `.pw-detail-label`, `.trends-score-label`,
`.rating-grid-label`, `.rating-list-title`, `.headline-category`,
`.compare-pill-label`) hand-rolls uppercase+tracking on `--font-body`.
Consistent *within* the cards today (and invisible while body falls
back to Georgia), but it's a fork in the label vocabulary that will
surface the day Fraunces loads — serif uppercase at 0.6rem is a
different animal. Decide once — cards keep serif eyebrows or adopt the
UI role — and encode it where `.eyebrow` lives.

---

## P3 — Hairline + control vocabulary

### 8. Four ad-hoc hairline recipes beside the shared tokens

`global.css` establishes `--hairline-soft` (text 10%) and
`--hairline-medium` (text 18%), used by Shell chrome, NavRail, and the
stats toolbar. But the cards mix their own:

- `RatingCard.css:68` — grid divider, `text-tertiary 25%`
- `RatingList.css:45` — table head rule, `text-tertiary 30%`
- `RatingList.css:66` — row dividers, `text-tertiary 18%`
- `TransfersCard.css:23` — avatar placeholder wash, `text-tertiary 12%`
  (this one should arguably be `--photo-placeholder`, which exists for
  exactly this and is used nowhere on the profile)

Same intent, five recipes. Converge on the two tokens (or promote a
third to `scoracle-tokens` if a genuinely distinct weight is needed —
doctrine puts shared visual values there, not in local CSS).

### 9. RatingList row dividers vs. the line-quiet rule

Doctrine: "Avoid decorative row dividers inside content cards. Use
whitespace and rhythm." NewsCard's own header comment brags "Line-quiet:
gap-based separation, no per-item dividers" — while the Roster and
Transfers lists (`RatingList.css:66`) rule every row. Tabular reference
rows are a sanctioned reference cousin, so this is a judgement call, but
at ~0.32rem row padding the lines are doing rhythm's job. Worth a pass
with dividers off and slightly more row air; keep the head rule (that
one is functional).

### 10. Corner-radius fork inside one control rail

Sibling disclosure surfaces in the same NavRail control row:

- `Select.css:72` dropdown + `CompareControl.css:19` panel — **6px**
- `CompareSearch.css:34,54,117` input / suggestions / selected chip — **2px**

One family, two silhouettes. 6px is the card-vocabulary radius; the
compare-search trio should join it. (Also: `.compare-pill` is a box, not
a pill — good — but the class name invites pill drift; rename when
touched.)

---

## P4 — Lean/durable housekeeping (dead weight in the greatest artifacts)

### 11. Dead CSS confirmed by grep (no `.tsx` references)

- `EntityMeta.css:20-42` — `.pw-compare-btn` (compare moved to the rail)
- `NewsCard.css:128-156` — `.news-scope*` block, kept "for reference"
  (the note itself admits it's retired)
- `StatsCard.css` — the bulk of the file: `.stats-card`,
  `.stats-season-row`, `.stats-toolbar` (+ divider rules),
  `.compare-header-slot/-primary/-season/-secondary`,
  `.compare-season-pair/-sep/-placeholder`, `.compare-pill-cohort`,
  `.butterfly-legend*`, `.compare-score-row`, `.butterfly-skeleton*`,
  `.chart-skeleton`, `.stats-error`
- `content-cards.css:14-19` — `.card-empty`

Delete on sight; git is the archive ("simple and durable beats clever
and fragile" applies to stylesheets too).

### 12. Stale comments that no longer tell the truth

- `MomentumCard.tsx:1-19` header says Composite = blue
  `--compare-primary`, Vibes = red `--category-scoring`; the
  implementation colors both lines dynamically via `tierColor`.
- `SigilCard css` `.vibe-score` comment: "Big italic Georgia" —
  pre-Fraunces doctrine.
- `StatsCard.css` header narrates the retired toolbar/season-row layout
  (goes away with finding 11).

### 13. Raw weight numbers bypass the tokens

`PizzaChart.css:46,53,68`, `ButterflyChart.css:62,70,92`,
`routes/profile.css:39` use literal `500`/`600` instead of
`var(--weight-*)`. SVG label weights are still CSS — no renderer excuse
here (the documented exception is for hex values in OG paths only).

---

## Aligned — do not touch

Confirmed clean against doctrine, for the record:

- **Shell/Card chrome**: token-driven silhouette (`--card-*`), modest
  6px radius, inset weathered tarot frame (SVG byte-identical to
  `scoracle-tokens/assets/chrome/`), quiet multi-layer paper shadow, no
  hover growth, data-bearing corner numerals with the dot fallback.
- **Color discipline**: chrome is fully neutral; every hue on the page
  arrives through `tierColor`/`tierColorScore` (percentile tokens),
  compare tints, category tokens, or provider imagery. No brand accent
  anywhere. `vibe-art` assets byte-identical to the tokens repo.
- **Rail semantics**: products are item rails, scopes are `<Select>`
  dropdowns composed in the control rail — the News scope and per-X /
  cohort / season / compare controls all landed on the right side of
  the item-rail/dropdown line. No scope chips or pills anywhere live.
- **Arcana budget**: tarot peak correctly concentrated in Sigil
  (archetypes, reversal mechanic, corner numeral) and the Veil empty
  state; the ordinary cards stay restrained. Empty states render as
  full cards, not collapsed placeholders.
- **Voice**: archetype subtexts read as score states, not verdicts;
  blurbs are short and divinatory-lite; no hype copy, no monikers.
- **Cards are never nested**; the one risk (EmptyCard-inside-a-Card,
  pattern 2 in its header) is documented and avoided on the profile.

## Suggested execution order

1. Finding 3 + 4 (one-line-ish fixes, visible today)
2. Finding 11 + 12 + 13 (pure deletion/cleanup, zero risk)
3. Finding 8 + 10 (token/radius convergence, small diffs)
4. Finding 5 + 6 + 7 (one type-spec decision, then mechanical)
5. Finding 1 + 2 (font self-hosting — its own session; update
   `AESTHETIC_VISION.md` in the same stroke, per governance order)
6. Finding 9 (judgement call; try it behind a screenshot compare)
