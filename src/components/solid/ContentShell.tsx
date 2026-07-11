/**
 * ContentShell — flat-nav layout container for the profile page.
 *
 * One `<NavRailStack>` over the registry's Card panes — Stats / Rating / News /
 * Momentum / Sigil, plus scoped controls when the active Card declares them.
 * Stats is the default landing tab.
 * NavRail is the platform's selection rail primitive; NavRailStack is the
 * page-level item rail + control rail composition. Each Card's body is wrapped
 * in its own `<Shell>` below. Tab set + order are driven entirely by CARD_REGISTRY —
 * this component renders whatever the registry declares, filtered by entity
 * type.
 *
 * Every pane mounts eagerly during SSR and hydration. Cards own their product
 * reads, while pane-local Suspense/ErrorBoundary instances keep a hidden product
 * outage from replacing the route shell or the active pane.
 */

import {
  Show, Suspense, For, ErrorBoundary,
} from "solid-js";
import { createAsync } from "@solidjs/router";
import { useProfile, type RatingScope, type RateMode, type ScoreModel, type NewsFacet, type NewsScope } from "../../contexts/profile";
import { CARD_REGISTRY } from "./card-registry";
import { pillarLabel, transferNoun, fantasySupported } from "../../lib/cards/card-meta";
import { getStats } from "../../lib/data/stats.server";
import NavRailStack from "./NavRailStack";
import Select from "./Select";
import CompareControl from "./CompareControl";
import "./ContentShell.css";

function PaneError(props: { label: string; err: unknown; reset: () => void }) {
  const message = props.err instanceof Error ? props.err.message : String(props.err);
  return (
    <div class="card-error" role="alert">
      <p class="card-error-title">Couldn't load {props.label}.</p>
      <p class="card-error-detail">{message}</p>
      <button type="button" class="card-error-retry" onClick={props.reset}>
        Try again
      </button>
    </div>
  );
}

export default function ContentShell() {
  const ctx = useProfile();

  // Tabs visible for this entity type — reactive, so navigating player↔team in
  // place updates the tab set.
  const visibleTabs = () => CARD_REGISTRY.filter((t) => !t.showFor || t.showFor(ctx.type()));
  // Pillar tabs get client labels from the card metadata; everything else uses
  // the registry's static label.
  const navItems = () =>
    visibleTabs().map((t) => ({
      id: t.id,
      label: pillarLabel(t.id, ctx.type()) ?? t.label,
    }));

  const activeControls = () =>
    visibleTabs().find((t) => t.id === ctx.activeTab())?.controls ?? [];
  const hasStatControls = () =>
    activeControls().some((control) =>
      control === "model" ||
      control === "rate" ||
      control === "scope" ||
      control === "season",
    );

  // Control rail (below the tabs, above the cards) — the convention for scoped
  // controls. Year selector first; season affects every card (cards read
  // ctx.season()). available_seasons rides the stats payload, whose query()
  // cache is shared with the cards, so it lands warm. Only create the stats
  // read for tabs whose controls actually depend on it; News/Sigil SSR should
  // not accidentally pull Stats into the crawler-critical path.
  const stats = createAsync(async () => {
    if (!hasStatControls()) return null;
    try {
      return await getStats(ctx.sport(), ctx.type(), ctx.id(), ctx.season());
    } catch {
      return null;
    }
  });
  const seasons = () => stats()?.available_seasons ?? [];
  // Season picker uses the shared <Select> (string options); map the numeric
  // seasons and parse back on change.
  const seasonOptions = () => seasons().map((s) => ({ value: String(s), label: String(s) }));

  // Scope options from the entity's cohort re-ranks (rating_scoped_ranks):
  // position (players); conference / division / league (teams). Hide the redundant
  // 'league' for NBA/NFL (uniform league_id → = positionless).
  const SCOPE_LABEL: Record<string, string> = {
    position: "By Position", conference: "By Conference",
    division: "By Division", league: "By League",
  };
  const scopeOptions = () => {
    const sr = stats()?.rating?.rating_scoped_ranks ?? {};
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

  // News hub facet options — Narratives first, Transfers/Trades as a scoped
  // news view. Scopes use Select, not item rails.
  const NEWS_FACET_OPTIONS = [
    { value: "narratives", label: "Narratives" },
    { value: "transfers", label: transferNoun(ctx.sport()) },
  ];

  // Historical scopes shared by News narratives and Transfers/Trades. Values map
  // directly to the backend `scope=` query parameter.
  const NEWS_SCOPE_OPTIONS = [
    { value: "current_week", label: "Current" },
    { value: "last_week", label: "Last week" },
    { value: "two_weeks_ago", label: "2 weeks" },
    { value: "three_weeks_ago", label: "3 weeks" },
    { value: "last_month", label: "Month" },
  ];

  // Each active-card control (registry-declared) shows only when its data exists —
  // declarative intent + graceful self-hide: rate → players with per-X modes;
  // scope → entity has >1 cohort re-rank; season → >1 rated season.
  const showModel = () =>
    activeControls().includes("model") && ctx.type() === "player" &&
    fantasySupported(ctx.sport()) && stats()?.rating?.fantasy != null;
  const showRate = () =>
    activeControls().includes("rate") && ctx.type() === "player" &&
    stats()?.rating?.rating_modes != null && rateOptions().length > 1;
  const showScope = () => activeControls().includes("scope") && scopeOptions().length > 1;
  const showSeason = () => activeControls().includes("season") && seasons().length > 0;
  const showNewsFacet = () => activeControls().includes("newsFacet");
  const showNewsScope = () => activeControls().includes("newsScope");
  // Compare (CompareSearch + the dual Composite butterfly) works for players AND
  // teams — both carry a rating breakdown to mirror, and CompareView already
  // branches on type (magnitude score for players, rank for teams). Shown so a
  // comparison can be started (no data gate — it's the entry point).
  const showCompare = () => activeControls().includes("compare");
  const anyControl = () => showModel() || showRate() || showScope() || showSeason() || showNewsFacet() || showNewsScope() || showCompare();

  // The control rail reads stats() (season list, per-X modes, cohort scopes),
  // an API-backed query. Contain that suspension here — behind the route's
  // shared reveal boundary the rail would otherwise become a second long pole
  // and hold the whole meta+panes swap on a stats round-trip. An empty
  // control rail renders zero-height chrome, so the wrapper is invisible
  // until the controls resolve and pop in.
  const ControlRail = () => (
    <Show when={anyControl()}>
      <>
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
        <Show when={showNewsFacet()}>
          <Select
            options={NEWS_FACET_OPTIONS}
            value={ctx.newsFacet()}
            onChange={(n) => ctx.setNewsFacet(n as NewsFacet)}
            ariaLabel="News view"
          />
        </Show>
        <Show when={showNewsScope()}>
          <Select
            options={NEWS_SCOPE_OPTIONS}
            value={ctx.newsScope()}
            onChange={(n) => ctx.setNewsScope(n as NewsScope)}
            ariaLabel="News scope"
          />
        </Show>
        <Show when={showCompare()}>
          <CompareControl />
        </Show>
      </>
    </Show>
  );

  // Eager mount-all. Every card pane is part of the Solid tree from SSR through
  // hydration, so there is no client-only pane gate and no first-click product
  // mount. ctx.activeTab() reads the URL directly, so it is synchronously
  // correct on every frame — including the first one after an entity change —
  // and only decides which mounted pane is visible (the `.active` CSS class +
  // the nav highlight).
  return (
    <section class="content-shell" aria-label="Profile content">
      <NavRailStack
        items={navItems()}
        active={ctx.activeTab()}
        onSelect={ctx.setActiveTab}
        ariaLabel="Profile section"
        controlsAriaLabel="Profile view controls"
        controls={
          <Suspense fallback={null}>
            <ControlRail />
          </Suspense>
        }
      />
      <div class="content-shell-panes">
        <For each={visibleTabs()}>
          {(pane) => (
            <div
              class="content-shell-pane"
              classList={{ active: ctx.activeTab() === pane.id }}
              aria-hidden={ctx.activeTab() === pane.id ? undefined : "true"}
              role="tabpanel"
            >
              <ErrorBoundary fallback={(err, reset) => <PaneError label={pane.label} err={err} reset={reset} />}>
                <Suspense fallback={pane.fallback()}>{pane.body()}</Suspense>
              </ErrorBoundary>
            </div>
          )}
        </For>
      </div>
    </section>
  );
}
