/**
 * ContentShell — flat-nav layout container for the profile page.
 *
 * One `<NavStrip>` over the registry's Card panes — for players:
 * Composite / Specialist / Trends / Vibes / News / Leaders; teams add
 * Roster (gated via `showFor`). Composite is the default landing tab (the
 * rating engine's datapoint pizza, the platform's headline output).
 * NavStrip is the platform's thin nav primitive — bare typographic surface
 * with a bottom hairline, NOT a card. Each Card's body is wrapped in its own
 * `<Shell>` below. Tab set + order are driven entirely by CARD_REGISTRY —
 * this component renders whatever the registry declares, filtered by entity
 * type.
 *
 * Sticky-mount: a Card body mounts the first time its tab becomes
 * active, then stays in the DOM with CSS hiding it when inactive.
 * Re-activation is instant — no re-mount, no Suspense fallback flash,
 * query() cache hits are warm.
 */

import {
  Show, Suspense, createSignal, createEffect, For,
} from "solid-js";
import { createAsync } from "@solidjs/router";
import { useProfile, type ProfileTab, type RatingScope, type RateMode, type ScoreModel } from "../../contexts/profile";
import { CARD_REGISTRY } from "./card-registry";
import { pillarLabel, transferNoun, fantasySupported } from "../../lib/cards/card-meta";
import { getSparkline } from "../../lib/data/sparkline.server";
import NavStrip from "./NavStrip";
import ScopeStrip from "./ScopeStrip";
import Select from "./Select";
import CompareControl from "./CompareControl";
import "./ContentShell.css";

export default function ContentShell() {
  const ctx = useProfile();

  // Tabs visible for this entity type (e.g. Roster is team-only) — reactive, so
  // navigating player↔team in place updates the tab set.
  const visibleTabs = () => CARD_REGISTRY.filter((t) => !t.showFor || t.showFor(ctx.type()));
  // Pillar tabs get entity-type-aware client labels (General/Special/Rating/Vibe);
  // the Transfers tab gets a sport-aware label ("Transfers" football / "Trades"
  // nba+nfl); everything else uses the registry's static label.
  const navItems = () =>
    visibleTabs().map((t) => ({
      id: t.id,
      label:
        t.id === "transfers"
          ? transferNoun(ctx.sport())
          : pillarLabel(t.id, ctx.type()) ?? t.label,
    }));

  // Scope row (below the tabs, above the cards) — the convention for all scope
  // selectors, which are dropdowns. Year selector first; season affects every card
  // (cards read ctx.season()). available_seasons rides the sparkline payload, whose
  // query() cache is shared with the cards, so it lands warm.
  const sparkline = createAsync(() => getSparkline(ctx.sport(), ctx.type(), ctx.id(), ctx.season()));
  const seasons = () => sparkline()?.available_seasons ?? [];
  // Season picker uses the shared <Select> (string options); map the numeric
  // seasons and parse back on change.
  const seasonOptions = () => seasons().map((s) => ({ value: String(s), label: String(s) }));

  // Scope dropdown options from the entity's cohort re-ranks (rating_scoped_ranks):
  // position (players); conference / division / league (teams). Hide the redundant
  // 'league' for NBA/NFL (uniform league_id → = positionless).
  const SCOPE_LABEL: Record<string, string> = {
    position: "By Position", conference: "By Conference",
    division: "By Division", league: "By League",
  };
  const scopeOptions = () => {
    const sr = sparkline()?.rating?.rating_scoped_ranks ?? {};
    const keys = Object.keys(sr).filter((k) => !(k === "league" && "conference" in sr));
    return [{ value: "all", label: "All" }, ...keys.map((k) => ({ value: k, label: SCOPE_LABEL[k] ?? k }))];
  };

  // Per-X rate options per sport (PLAYERS) — a UNIFORM Per Season / Per Game / Per-X
  // vocabulary mapped onto each sport's backend modes (migrations 042 + 045). The
  // "default" column set differs by sport: NBA base stats are per-game averages (so
  // default = "Per Game" and the new per_season block carries totals); NFL/football
  // base stats are season totals (default = "Per Season"). NFL has no per-x — a
  // box-score-only feed ships no snap/possession denominator. Order: Season → Game → X.
  const RATE_OPTIONS: Record<string, { value: string; label: string }[]> = {
    nba: [
      { value: "per_season", label: "Per Season" },
      { value: "default", label: "Per Game" },
      { value: "per_36", label: "Per 36" },
    ],
    football: [
      { value: "default", label: "Per Season" },
      { value: "per_game", label: "Per Game" },
      { value: "per_90", label: "Per 90" },
    ],
    nfl: [
      { value: "default", label: "Per Season" },
      { value: "per_game", label: "Per Game" },
    ],
  };
  const rateOptions = () => RATE_OPTIONS[ctx.sport()] ?? [];

  // Regular | Fantasy scoring model (players). Fantasy = box-score fantasy points
  // (PPR NFL / DraftKings NBA / FPL football — backend migrations 046 + 057) as the
  // Composite headline; the per-X rate selector cross-applies. Only sports with a
  // fantasy preset show it (fantasySupported, card-meta SSOT). Same <Select> shape.
  const MODEL_OPTIONS = [
    { value: "regular", label: "Regular" },
    { value: "fantasy", label: "Fantasy" },
  ];

  // Each active-card control (registry-declared) shows only when its data exists —
  // declarative intent + graceful self-hide: rate → players with per-X modes;
  // scope → entity has >1 cohort re-rank; season → >1 rated season.
  const activeControls = () =>
    visibleTabs().find((t) => t.id === ctx.activeTab())?.controls ?? [];
  const showModel = () =>
    activeControls().includes("model") && ctx.type() === "player" &&
    fantasySupported(ctx.sport()) && sparkline()?.rating?.fantasy != null;
  const showRate = () =>
    activeControls().includes("rate") && ctx.type() === "player" &&
    sparkline()?.rating?.rating_modes != null && rateOptions().length > 1;
  const showScope = () => activeControls().includes("scope") && scopeOptions().length > 1;
  const showSeason = () => activeControls().includes("season") && seasons().length > 0;
  // Compare is players-only (CompareSearch + the dual Composite render); shown so
  // a comparison can be started (no data gate — it's the entry point).
  const showCompare = () => activeControls().includes("compare") && ctx.type() === "player";
  const anyControl = () => showModel() || showRate() || showScope() || showSeason() || showCompare();

  // Sticky-mount: track which tabs have ever been activated. Once
  // activated, a pane stays in the DOM (CSS-hidden when inactive) so
  // switching back is instant.
  const [mounted, setMounted] = createSignal<Set<ProfileTab>>(
    new Set([ctx.activeTab()]),
  );

  createEffect(() => {
    const t = ctx.activeTab();
    setMounted((current) => {
      if (current.has(t)) return current;
      const next = new Set(current);
      next.add(t);
      return next;
    });
  });

  return (
    <section class="content-shell" aria-label="Profile content">
      <NavStrip
        items={navItems()}
        active={ctx.activeTab()}
        onSelect={ctx.setActiveTab}
        ariaLabel="Profile section"
      />
      <Show when={anyControl()}>
        <ScopeStrip>
          <Show when={showModel()}>
            <Select
              options={MODEL_OPTIONS}
              value={ctx.scoreModel()}
              onChange={(m) => ctx.setScoreModel(m as ScoreModel)}
              ariaLabel="Model"
            />
          </Show>
          <Show when={showRate()}>
            <Select
              options={rateOptions()}
              value={ctx.rateMode()}
              onChange={(r) => ctx.setRateMode(r as RateMode)}
              ariaLabel="Rate"
            />
          </Show>
          <Show when={showScope()}>
            <Select
              options={scopeOptions()}
              value={ctx.scope()}
              onChange={(s) => ctx.setScope(s as RatingScope)}
              ariaLabel="Scope"
            />
          </Show>
          <Show when={showSeason()}>
            <Select
              options={seasonOptions()}
              value={String(ctx.season() ?? seasons()[0] ?? "")}
              onChange={(v) => ctx.setSeason(Number(v))}
              ariaLabel="Season"
            />
          </Show>
          <Show when={showCompare()}>
            <CompareControl />
          </Show>
        </ScopeStrip>
      </Show>
      <div class="content-shell-panes">
        <For each={visibleTabs()}>
          {(pane) => (
            <Show when={mounted().has(pane.id)}>
              <div
                class="content-shell-pane"
                classList={{ active: ctx.activeTab() === pane.id }}
                role="tabpanel"
              >
                <Suspense fallback={pane.fallback()}>{pane.body()}</Suspense>
              </div>
            </Show>
          )}
        </For>
      </div>
    </section>
  );
}
