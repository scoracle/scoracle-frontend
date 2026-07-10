# 2026-07-04 — Home page + AppRail aesthetic audit

Scope: the `/` home page (wordmark, crystal-ball hero, hero search, footer)
and the AppRail — surface, posture, brand mark, and the six board icons.
Audited against `../scoracle-tokens/AESTHETIC_VISION.md` (the operating
north-star; the wiki's `Aesthetic Vision.md` is archive). This pass includes a
rendered verification: dev server + headless Chromium at 1440×900 and 390×844,
including the rail hover/tooltip state.

Severity legend (same as the 2026-07-03 profile audit):

- **[doctrine]** — conflicts with a written rule in AESTHETIC_VISION.
- **[coherence]** — no single rule broken, but the system doesn't read as one
  hand-made object.
- **[opportunity]** — on-brand move the doctrine invites but the code hasn't
  taken yet.

---

## Verdict

The AppRail is the most doctrine-aligned chrome on the page — arguably in the
app. The icons are a genuine system, not a borrowed icon set. The drift on
this page lives at the edges: a gradient on the hero search input (an explicit
anti-pattern), radius jitter (6/7/8px) across chrome, an imperceptible third
surface under the rail, and circular recents marks in a rigid-over-soft
system.

---

## What already holds (don't churn)

- **Rail posture is quiet.** Transparent buttons, hairline right border,
  neutral hover (`--surface-active` + hairline, no growth, no glow, stable
  6px radii), 0.15s ease transitions with a `prefers-reduced-motion` guard
  (`AppRail.css:38-66,253-259`). This is "NavRail … visual posture stays
  quiet" and "Rigid over soft" done correctly.
- **The icons speak one stroke language.** All six board icons share a 24
  viewBox, 1.3 stroke, round caps/joins, `currentColor` (`AppRail.css:101-109`),
  and each carries one small secondary hairline detail — the ticks beside the
  Rankings waveform, the page fold on News, the inner bar on Search, the
  dashes behind Risers. That signature makes them read hand-made rather than
  Lucide-default, which is exactly "arcana lives in format, not costume."
- **The brand mark anchors.** The linework crystal ball renders larger with a
  heavier effective stroke (~1.85px rendered vs the icons' 1.3px), so the rail
  has hierarchy without color or weight tricks (`AppRail.tsx:59-76`,
  `AppRail.css:79-99`). It mirrors the favicon and the home-page hero — one
  brand object at three fidelities.
- **Color discipline is total.** The only color on the home page is provider
  imagery (sport logos cycling inside the ball) — a sanctioned context. Rail,
  tooltips, search, footer: all neutral ink on cream.
- **Product vocabulary is respected.** The rail is an item rail of unique
  product containers (Rankings / News / Vibes / Risers / Transfers). Search is
  treated as a control and suppressed on home where the hero search is the
  single search affordance (`AppRail.tsx:159,263`). No scope chips, no tabs.
- **Wordmark obeys the type rules.** Fraunces display at regular weight, caps
  with 0.045em tracking — size and spacing doing the work, no bolding
  (`index.css:23-33`).
- **Tooltips read as editorial black panels.** Ink surface, cream type, UI
  sans, quiet slide-in (`AppRail.css:146-167`). Restrained and correct.
- **Voice.** Labels are single controlled words; the transfer noun adapts per
  sport; placeholder copy is concise with no hype.

---

## Findings

### H1. Hero search input carries a gradient — [doctrine]

> "Gradients, glows, bokeh, or decorative color washes" are drift.
> (Anti-Patterns)

`.search-bar-hero .search-bar-input` backgrounds a `linear-gradient` from
98% to 94% card-mix (`SearchBar.css:46-51`). It is nearly imperceptible at
render — which is the worst position: it breaks the written rule while buying
nothing. Flatten to a single surface (`--bg-card` or the existing 94% mix).

Adjacent, same block: the input wears the full card lift stack
(`0 12px 24px` ambient, `SearchBar.css:55-58`) — "Shadow: only subtle
paper-on-desk lift **on card artifacts**." The hero search is a control, not a
card. If the intent is that the home search reads as an artifact on the table,
that's a defensible reading — but then it should be stated somewhere, and the
input should commit to card chrome rules (6px radius, see H3) rather than
borrowing half of them.

### H2. Radius jitter across home chrome — [coherence]

The token contract has one radius: `--card-radius: 6px`. On this page:
rail buttons and search popover are 6px, the rail tooltip is 7px
(`AppRail.css:161`), the base search input is 7px (`SearchBar.css:16`), and
the hero input is 8px (`SearchBar.css:53`). Nobody will consciously see 1–2px,
but off-grid radii are exactly the drift-by-a-thousand-cuts the vision exists
to stop. Pick 6px (or `var(--card-radius)`) everywhere.

### H3. The rail sits on an invented third surface — [coherence]

The vision defines a two-surface world: `bg` (the table) and `bg-card`
(cardstock). The rail backgrounds
`color-mix(in srgb, var(--bg) 90%, var(--bg-card))` (`AppRail.css:13`) —
a third surface ~1 hex step from `bg` (#EBE6DF vs #EAE5DD), invisible in the
rendered pass. Either commit to `var(--bg)` and let the hairline do the
separation (it already does), or make the step deliberate and visible. Same
note applies to the button ink `color-mix(--text-secondary 88%, --bg)`
(`AppRail.css:46,119`) — plain `--text-secondary` is one step away and
on-contract.

### H4. Recents marks are circles in a rigid system — [coherence]

> "Rigid over soft. Boxes, modest radii, hairlines." / "Pills as the default
> shape" are drift.

`.app-rail-recent-mark` is a `border-radius: 50%` letter-circle
(`AppRail.css:130-144`) — the one round shape in the rail, and it reads
generic-avatar rather than Scoracle. A 6px boxed mark with the same initial
(or, more on-brand, the entity's corner-numeral treatment in miniature) would
make the recents strip feel like small cards from the same deck. The P3 pass
already decided against boxed avatars on the profile hero; this is a different
object — chrome, not imagery — so the boxed form is still worth a look here.

### H5. Fog vapor and logo drop-shadow inside the crystal ball — [coherence, judgment call]

`.sport-fog-vapor` is a blurred radial-gradient white glow under `screen`
blending, and `.sport-logo` carries a `drop-shadow`
(`CrystalBall.css:74-101`). Read literally, that's three anti-pattern words in
one block (gradient, glow, blur). Read as illustration, it's the mist inside
the ball — part of the brand object, like the deck-back art, and it does real
work blending provider logos into the linework hero. Recommendation: keep it,
but document it in AESTHETIC_VISION's imagery section as a sanctioned
exception (brand-illustration interiors may use atmospheric treatment; chrome
may not). Undocumented, it will be cited as precedent for gradients elsewhere.

### H6. Rail items never show selection — [coherence, adjacent scope]

`app-rail-btn-active` exists but is only wired to the search toggle
(`AppRail.tsx:268`). On `/leaderboard?board=news` the News item renders
identically to its siblings — a selection rail that never shows selection.
Correct on home (no board is active); visible the moment the user lands
anywhere else. The quiet active treatment already designed (surface +
hairline) is sitting unused for its primary purpose.

### H7. Stale stroke-weight comments — [hygiene]

`AppRail.css:76-78` says the brand mark's stroke contrasts "the icons'
lighter **1.65**"; the icons are 1.3 (`AppRail.css:107`). The rendered claim
(brand heavier than icons) is true — via render scale, not stroke value — but
the number is stale and will mislead the next tuning pass. `AppRail.tsx:59-63`
carries a cousin of the same comment.

### H8. Icon metaphor notes — [opportunity]

Two of six icons are worth a second look; neither breaks doctrine:

- **Rankings** (waveform + baseline + ticks) is the most abstract of the set —
  at 24px it reads seismograph/signature before it reads "composite
  rankings." It is distinctive, and it does carry the derived-signal idea; if
  it ever tests poorly, a laurel/numeral form could say "ranked" faster.
- **Vibes** (flame) borrows sports-media's "🔥 on fire" urgency semiotics —
  the register the voice section deliberately avoids. Something more
  atmospheric (smoke wisp, hand, moon phase) would say *sentiment read* rather
  than *hot streak*. The current draw is at least a quiet flame with the
  inner-zigzag detail, so this is a refinement, not a violation.

The remaining icons (News, Risers, Transfers, Search) are legible and quiet.

### H9. Gutter ads are undoctrined — [opportunity, note]

`GutterAds` flanks the home composition on ≥1100px viewports
(`GutterAds.css`). The rails themselves are invisible positioning shells —
fine — but live ad creative will be the loudest color on the page in a system
where "color belongs to data." Nothing to change in this repo now; the vision
doc should eventually say what monetization surfaces are allowed to look like
(boxed, hairline-framed, labeled) so the first ad integration doesn't get
designed ad-hoc.

---

## Suggested order

1. H1 gradient flatten + H2 radius alignment — trivial diffs, pure doctrine.
2. H7 comment fixes alongside whichever of the above touches `AppRail.css`.
3. H3 surface simplification (one-line, verify rendered before/after).
4. H6 active-state wiring (small TSX change, biggest UX yield off-home).
5. H4 recents box treatment (visual judgment; screenshot compare).
6. H5 — no code change; add the illustration-exception language to
   AESTHETIC_VISION.md in the tokens repo.
7. H8/H9 — backlog candidates, only if they keep itching.
