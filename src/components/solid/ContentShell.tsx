/**
 * ContentShell — flat-nav layout container for the profile page.
 *
 * One `<NavRailStack>` over the registry's Card panes — Stats / Rating / News /
 * Trends / Sigil, plus scoped controls when the active Card declares them.
 * Roster is gated to teams via `showFor`. Stats is the default landing tab.
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
  Show, Suspense, createSignal, createEffect, For, ErrorBoundary,
} from "solid-js";
import { createAsync, useSearchParams } from "@solidjs/router";
import { useProfile, type ProfileTab, type RatingScope, type RateMode, type ScoreModel, type NewsScope } from "../../contexts/profile";
import { deriveInitialTab } from "../../lib/utils/profile-tabs";
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

  // Tabs visible for this entity type (e.g. Roster is team-only) — reactive, so
  // navigating player↔team in place updates the tab set.
  const visibleTabs = () => CARD_REGISTRY.filter((t) => !t.showFor || t.showFor(ctx.type()));
  // Pillar tabs get client labels from the card metadata; everything else uses
  // the registry's static label.
  const navItems = () =>
    visibleTabs().map((t) => ({
      id: t.id,
      label: pillarLabel(t.id, ctx.type()) ?? t.label,
    }));

  // Control rail (below the tabs, above the cards) — the convention for all
  // scope selectors, which are dropdowns. Year selector first; season affects every card
  // (cards read ctx.season()). available_seasons rides the stats payload, whose
  // query() cache is shared with the cards, so it lands warm.
  const stats = createAsync(() => getStats(ctx.sport(), ctx.type(), ctx.id(), ctx.season()));
  const seasons = () => stats()?.available_seasons ?? [];
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

  // News scope options — News narratives, Transfers/Trades heat list, or Headlines.
  const NEWS_SCOPE_OPTIONS = [
    { value: "news", label: "News" },
    { value: "transfers", label: transferNoun(ctx.sport()) },
    { value: "headlines", label: "Headlines" },
  ];

  // Each active-card control (registry-declared) shows only when its data exists —
  // declarative intent + graceful self-hide: rate → players with per-X modes;
  // scope → entity has >1 cohort re-rank; season → >1 rated season.
  const activeControls = () =>
    visibleTabs().find((t) => t.id === ctx.activeTab())?.controls ?? [];
  const showModel = () =>
    activeControls().includes("model") && ctx.type() === "player" &&
    fantasySupported(ctx.sport()) && stats()?.rating?.fantasy != null;
  const showRate = () =>
    activeControls().includes("rate") && ctx.type() === "player" &&
    stats()?.rating?.rating_modes != null && rateOptions().length > 1;
  const showScope = () => activeControls().includes("scope") && scopeOptions().length > 1;
  const showSeason = () => activeControls().includes("season") && seasons().length > 0;
  const showNewsScope = () => activeControls().includes("newsScope");
  // Compare (CompareSearch + the dual Composite butterfly) works for players AND
  // teams — both carry a rating breakdown to mirror, and CompareView already
  // branches on type (magnitude score for players, rank for teams). Shown so a
  // comparison can be started (no data gate — it's the entry point).
  const showCompare = () => activeControls().includes("compare");
  const anyControl = () => showModel() || showRate() || showScope() || showSeason() || showNewsScope() || showCompare();

  // Eager mount-all. Every card pane is part of the Solid tree from SSR through
  // hydration, so there is no client-only pane gate and no first-click product
  // mount. The epoch only decides which mounted pane is visible — the `.active`
  // CSS class + the nav highlight.
  const [searchParams] = useSearchParams<{ tab?: string }>();
  const entityKey = () => `${ctx.sport()}|${ctx.type()}|${ctx.id()}`;
  // The tab a fresh navigation lands on, read straight from the URL (tab clicks
  // don't write the URL, so this is the deep-link tab or the default). It's the
  // only synchronously-correct "active tab" during an entity transition, since the
  // activeTab signal is reset a beat later by profile.tsx's effect.
  const landingTab = () => deriveInitialTab(searchParams.tab);

  // The entity epoch the activeTab signal currently belongs to. Updated by a
  // deferred effect, so during the first render after an entity change it still
  // holds the OLD key — and effectiveActive falls back to landingTab() until it
  // catches up, keeping the active pane + nav highlight correct on the first frame.
  const [epoch, setEpoch] = createSignal(entityKey());
  const effectiveActive = (): ProfileTab =>
    epoch() === entityKey() ? ctx.activeTab() : landingTab();

  createEffect(() => {
    const key = entityKey();
    ctx.activeTab(); // re-run once activeTab settles for the new entity
    setEpoch((prev) => (prev === key ? prev : key));
  });

  return (
    <section class="content-shell" aria-label="Profile content">
      <NavRailStack
        items={navItems()}
        active={effectiveActive()}
        onSelect={ctx.setActiveTab}
        ariaLabel="Profile section"
        controlsAriaLabel="Profile view controls"
        controls={anyControl() && (
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
        )}
      />
      <div class="content-shell-panes">
        <For each={visibleTabs()}>
          {(pane) => (
            <div
              class="content-shell-pane"
              classList={{ active: effectiveActive() === pane.id }}
              aria-hidden={effectiveActive() === pane.id ? undefined : "true"}
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
