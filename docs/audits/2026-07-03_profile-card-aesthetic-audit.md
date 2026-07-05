# 2026-07-03 — Profile card aesthetic audit

Scope: the `/profile` page's card surfaces — EntityMeta, Stats, Rating, News,
Trends (Momentum), Sigil, Roster, plus the shared Shell/Card chrome and the
empty/loading states. Audited against `../scoracle-tokens/AESTHETIC_VISION.md`
and `../scoracle-wiki/PRODUCT_NARRATIVE.md`, code-level (backend unreachable
from this environment, so no rendered pass; the 2026-07-03 composition pass
covered rendered verification of the current state).

Each finding cites the doctrine line it hangs on. Severity legend:

- **[doctrine]** — conflicts with a written rule in AESTHETIC_VISION.
- **[coherence]** — no single rule broken, but the deck doesn't read as one
  hand-made system.
- **[opportunity]** — on-brand move the doctrine invites but the code hasn't
  taken yet.

---

## What already holds (don't churn)

The bones are right, and recent passes landed:

- Card chrome is genuinely tarot-object: cardstock surface, hairline edge,
  multi-layer paper-on-desk shadow, inset weathered frame, no hover growth,
  no glow (`global.css:140-193`).
- No pills, no gradients, no team-color chrome anywhere in the card layer.
- Color discipline is strong: chrome is neutral; color rides tier scores,
  compare tints, and category wedges — the sanctioned contexts.
- Typography roles are unified after the 2026-07-03 fonts pass (Fraunces
  display/body, DM Sans numeric, system UI for dense labels).
- EmptyCard-as-Veil is a standout: the null state reads as part of the deck.
- EntityMeta's Rating · Sigil · Vibe convergence row with the crowned center
  is the product narrative drawn in type.

---

## Cross-card system findings

These are the "FEEL" items — individually small, but together they're why the
deck can read as six separate implementations instead of one deck.

### S1. Corner expression defaults to decoration on five of seven cards — [doctrine]

> "Corner expression: data-bearing when possible." (Card Anatomy)

Only EntityMeta (entity id) and Sigil (archetype numeral) stamp corners.
Stats, Rating, News, Trends, and Roster all fall to the corner-dot fallback
(`Shell.tsx` → `.shell:not(.has-corner-label)::after`). The leaderboard pass
(2026-07-03) already set the precedent by stamping the season year on
season-scoped boards.

Suggested corners:

| Card | Corner label |
|---|---|
| Stats | resolved season year (`2025`) |
| Rating | resolved season year |
| Trends | resolved season year |
| Roster | resolved season year |
| News | active scope, compressed (`WK 27` or the scope label) |

One prop per card body; the chrome machinery already exists. This is the
cheapest highest-yield brand move on the page: every card's chrome starts
revealing something.

### S2. Hero-score treatment is accidental, not systematic — [coherence, one doctrine hit]

The same semantic object — a large tier-colored 0–100 read — renders four ways:

| Surface | Size | Weight |
|---|---|---|
| `.pw-score-value` (Meta) | 1.65rem | inherited 300 |
| `.rating-hero-pct` (Rating) | 2.4rem | inherited 300 |
| `.trends-score-val` (Trends) | 2.4rem | **500 (medium)** |
| `.vibe-score` (Sigil) | 4–5.25rem | 400 |

`.trends-score-val` bolding the display face is a direct hit on "Do not
bolden the display face. Use size, spacing, and placement."
(`MomentumCard.css:32`).

Recommend one hero-score idiom: display face, weight-regular, tabular-nums,
two sanctioned sizes — standard (content cards) and crown (Sigil only, which
deserves its extra scale). Worth expressing as shared values (tokens repo owns
type roles; at minimum an app-level custom-property pair).

### S3. The micro-label system has re-drifted — [coherence]

The fonts pass unified the *face* (everything uppercase now uses `--font-ui`),
but size and tracking are still a per-file coin flip: 0.6 / 0.62 / 0.64 /
0.66 / 0.68 / 0.7 / 0.72 / 0.75rem, tracking from 0.04em
(`.rating-grid-label`) to 0.18em, color split between secondary and tertiary
with no rule. The global `.eyebrow` idiom (0.75rem / 0.14em) exists and no
profile card uses it.

> "Tiny labels need breathing room. Small type only works with enough
> whitespace." (Typography rules)

Recommend collapsing to two cuts — eyebrow (section/scope labels) and
micro-eyebrow (score/axis captions) — as shared classes or tokens, then
deleting the per-card font-size/letter-spacing declarations. This is the
single biggest "one deck, one hand" unifier available.

### S4. Loading states are SaaS skeletons; the doctrine already assigned this job to the deck-back — [opportunity]

> "Deck-back art is the null/loading/fallback face for card-like
> uncertainty." (Sigil And Arcana)

Every card's fallback is pulsing gray bars (`Skeleton.tsx`) — the exact
"generic SaaS dashboard" texture the vision positions against. Meanwhile
`public/vibe-art/deck-back.svg` ships and is used nowhere on the profile.

A loading card is a card that hasn't been turned over yet: render the
deck-back art centered in the canonical silhouette (a slow opacity pulse is
fine, `prefers-reduced-motion` respected) for whole-card fallbacks. Keep line
skeletons only for in-card partials (e.g. the meta score row). This converts
a dead moment into a signature brand moment — and it's the moment every user
sees first.

### S5. EmptyCard's default note leaks news vocabulary onto every surface — [voice bug]

`EmptyCard` defaults `note` to `"(no mentions found)"` (`EmptyCard.tsx:55-59`).
Stats/Rating/Roster pass only `message`, so their empty states read:

> No rating yet. *(no mentions found)*

"Mentions" is a news-rail concept; on a stats surface it's noise — precisely
the "weak signal decorated into importance" the vision warns about. Fix:
default the note to empty and let News-family callers opt in, or derive a
per-card default.

### S6. No shared card-identifier idiom; the bare pizza fails the self-contained test — [coherence + doctrine]

> "Shareable cards should read as considered objects outside the app. The
> card should survive a screenshot… without relying on the surrounding
> page." (Share Artifacts)

News opens with a quiet scope line ("Current week narratives, impact
ranked"); Rating opens with "{name}'s rating — strongest in:". Stats and
Trends open with nothing — and since the redundant per-card rating readout
was dropped (2026-06-10), the common single-facet Stats card is a naked chart:
no title, no scope, corner dots. Screenshot it and nothing says what it is.

Recommend promoting the News identifier into a shared convention — one quiet
line, body serif 0.8rem, secondary, centered — stating the read and its lens
("Season composite, league scope" / "Season trajectory — rating and vibe").
It unifies the deck's opening beat, restores content mass to the sparse
cards (Card Doctrine: "enough content mass that the card reads as an object
rather than a label wrapped in chrome"), and each card becomes screenshot-
complete.

---

## Per-card findings

### EntityMeta — strongest card on the page

- **[opportunity]** The avatar floats free above the name. The vision:
  "Boxed crops and framed images fit the system better than full-bleed
  sports hero imagery." For player *photos* (football), a quiet boxed crop on
  the `--photo-placeholder` surface with a hairline would sit deeper in the
  system; transparent team crests can plausibly stay free. Judgment call —
  worth one mocked comparison, not a blind change.
- Monogram fallback, season-aware team link, convergence row: all on-brand.
  No other findings.

### StatsCard

- **[doctrine]** Single-facet card is a bare chart — see S6.
- **[doctrine, mild]** The hover "pop" scales slice text 10→14px (19/24px in
  intense mode) *and* jumps weight (`PizzaChart.css:50-95`). "Rigid over
  soft… stable hover states" — a 1.9× springing label with a weight change is
  the loudest interaction on the page. A single restrained size step (no
  weight jump), or a fixed readout row under the chart that fills on hover,
  would deliver the legibility without the bounce.
- Compare view: italic display names, sanctioned compare tints, mirrored
  layout — on-brand. No findings.

### RatingCard

- **[doctrine]** `.rating-grid`'s `border-top` hairline separating hero from
  grid (`RatingCard.css:65`) is a decorative divider: "Avoid decorative row
  dividers inside content cards. Use whitespace and rhythm." Whitespace
  (existing 1rem gap, slightly widened) does the same job.
- **[coherence]** `.rating-grid-label` tracking is 0.04em — a third the
  system's eyebrow tracking (S3's worst offender).
- **[coherence, mild]** The trajectory line colors the whole sentence
  green/red (`data-trajectory` rules). Color-belongs-to-data allows it, but
  it's the largest run of colored *prose* on the page. Consider confining the
  color to a small marker (▲/▼ or dot) and keeping the sentence secondary.
- **[note for later]** Grid art is placeholder circles (known). When real art
  lands, keep it data-adjacent illustration — the vision reserves tattoo-flash
  linework for the brand mark, deck-back, and archetype assets. Skill icons
  shouldn't creep into tarot costume.

### NewsCard

- **[doctrine, mild]** `.news-identifier` is `position: sticky`
  (`NewsCard.css:99`). A band that detaches and floats over the rows while
  the page scrolls is app-toolbar behavior, not something a physical card
  does — it breaks the artifact illusion mid-scroll. The card grows to its
  content, so the identifier can simply be static; if long feeds genuinely
  need a persistent scope cue, that's the control rail's job (it's already
  where scope selection lives as of today's change).
- Otherwise the strongest ledger card: gap-based rows, no dividers,
  tier-colored impact as the only color, voice on-brief ("impact ranked",
  "No stories forming in this scope.").

### MomentumCard (Trends)

- **[product/aesthetic]** The card doesn't express momentum. The narrative:
  "a momentum score should mean directional force, not overall quality."
  Both headline numbers are *state* (season composite, latest sentiment) —
  the same values as the meta header's chips, a redundancy the Stats card
  already removed for itself. The trajectory — the card's entire reason to
  exist — appears only implicitly in two small polylines. Recommend the
  headline become directional: direction glyph + the momentum product's
  direction/trajectory score, with the state numbers demoted or dropped.
  Surface it from the momentum payload (the product owns direction and
  trajectory score per the narrative); if the payload doesn't ship it yet,
  that's a data-contract gap to raise, not a client-side derivation to
  sneak in (Data Boundary).
- **[doctrine]** `.trends-score-val` bolds the display face (S2).
- **[coherence]** Sparklines are fixed 300×60 inside a 684px landscape card —
  thin visual mass floating in cardstock ("healthy visual weight"). Let the
  SVG scale to the content width.
- **[hygiene]** The file-header comment still documents the retired fixed
  blue/red series colors; the implementation is tierColor. Update alongside
  any pass.

### SigilCard

- **[doctrine]** The crown card doesn't peak. "The more ordinary cards stay
  restrained so the Sigil can carry the arcane peak" — but the Sigil's layout
  is pixel-identical to EmptyCard (same 96px art slot, same name/subtext
  stack). The one surface *licensed* to lean into the tarot system has the
  same visual weight as the null state. Directions worth exploring, in
  restraint order: larger archetype art (it's the only card whose art IS the
  content), archetype name at display scale rather than 0.95rem caps, a
  slightly more present interior frame on this card only, a more deliberate
  reversal cue than silent 180° rotation.
- **[vocabulary]** User-facing strings call the Sigil "Vibe":
  `aria-label="Vibe"` on the Card and `aria-label="Vibe score N of 100"` on
  the score (`SigilCard.tsx:77,110`). Vibe is the news-rail end product; the
  Sigil is the synthesis — the two are distinct pillars in the narrative and
  in the meta row sitting directly above this card. Fix the aria strings now;
  the `vibe-*` class names and the file's "sentiment" header comment are a
  follow-on rename.
- **[voice, mild]** The credit line renders a raw model id
  ("gemma-3-27b · Jun 12") — debug texture on the most arcane surface. "The
  product can admit that it is divination from data" — "read by Gemma ·
  Jun 12" admits it in voice; keep the raw version string for the OG/debug
  path if needed.

### RosterCard

- **[coherence]** Header/value color mismatch: `RatingList.css` colors the
  Comp/Spec *headers* in fixed series blue/green, but the row values override
  inline with `tierColorScore` (`RosterCard.tsx:64-65`). The header promises
  a series legend the values don't honor. Since the values are tier-colored
  (correct — that's the data), the headers should go neutral tertiary; the
  stale "same series colors as the Trends sparkline" comment goes with them.
- Table hairlines between rows are fine — "tabular reference rows" are in
  the reference family; this is a ledger, not decoration.

### Shared chrome

- **[verify]** The weathered-tarot frame carries a live "crisp-tarot"
  follow-up in `global.css:170-179` ("renders faint / washed out"), but the
  SVG's v7 header says the clipping that caused the wash was fixed and 1.3
  stroke tuned. Someone should eyeball it at 1× and 2× DPR and either close
  the follow-up or thicken the source stroke — the frame is the single most
  load-bearing arcane element on every card, and its current status is
  ambiguous in the code.

---

## Priority order

**P1 — small diffs, immediate brand payoff**

1. Data-bearing corner labels on Stats/Rating/News/Trends/Roster (S1).
2. EmptyCard note default — stop "(no mentions found)" leaking onto
   non-news cards (S5).
3. Un-bolden `.trends-score-val`; align hero-score weights (S2).
4. Roster header/value color coherence.
5. Un-stick the News identifier.
6. Sigil aria strings: "Vibe" → "Sigil".

**P2 — system passes**

7. Micro-label consolidation to two eyebrow cuts (S3) — coordinate with
   `scoracle-tokens` since type roles live there.
8. Shared card-identifier idiom; gives the bare Stats pizza its opening
   line (S6).
9. Deck-back loading face replacing whole-card skeletons (S4).
10. Rating grid divider → whitespace; grid label tracking.

**P3 — bigger swings, mock before building**

11. Sigil arcane-peak pass (art scale, name scale, reversal cue).
12. Trends headline becomes trajectory (direction + momentum score) —
    includes a data-contract check with the backend.
13. Sparkline width/mass; boxed meta avatar exploration.

None of these are redesigns. The silhouette, chrome, palette, and voice are
already the brand; the gap is that the seven cards were finished at different
times by different hands and it shows in the millimeters — corner slots,
label cuts, hero weights, opening lines. Close those and the profile reads as
one dealt deck.
