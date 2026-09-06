/**
 * ReadingTable — the profile's reading table (Characters Phase 2).
 *
 * Named for the doctrine section it implements (@scoracle/tokens
 * AESTHETIC_VISION.md, "The Reading Table"). It was `ContentShell` until the
 * Board session (2026-08-10) retired the last of the `<Shell>` vocabulary —
 * the Shell primitive itself was absorbed into `<Card>` on 2026-08-04.
 *
 * One `<NavWell>` over the registry's Card panes — the character cards this
 * entity HOLDS, drawn from the six that exist (Scouting / Narratives /
 * Transfers / Vibe / Momentum / Sigil), plus the conditions line when the
 * active Card declares scoped controls. Scouting is the default landing tab
 * when the entity holds it.
 *
 * The deck is dealt, not fixed (Dynamic deck, 2026-08-16): lib/cards/
 * deck-content answers "has this character anything to say about this
 * entity?" per card, on the SAME query() the panes already fetch, and only
 * the cards that answer yes get a pane and a tab. Three cards → a three-card
 * deck and a three-tab rail. NO cards → no rail, no deck, no arrows: the
 * entity's meta card sits alone on the desk (profile.css). The Veil
 * (<EmptyCard>) stays as the backstop for the card in hand — a conditions
 * change that empties the card being read shows it rather than pulling the
 * card off the table mid-turn.
 *
 * The panes are the table: every dealt card lies face-up (the flip is retired
 * — Scott, 2026-08-04); the active card sits on top and the others peek out
 * as face-up edge strips to either side. One character speaks at a time —
 * clicking a peeked card brings it forward, and clicking the rail drives
 * the SAME `?tab=` URL state through ctx.setActiveTab, so the marker and
 * the table can never disagree. The pile is presentation only: every card
 * body stays in the DOM exactly as SSR delivered it (peeked = aria-hidden
 * + inert on the face), preserving the one-contract rendering rule and the
 * crawler view.
 *
 * Four ways to move through the reading (Deck Navigation, 2026-08-10), all
 * writing the same one `?tab=`: the tab rail (authoritative for keyboard and
 * AT), a peeked strip, the step arrows either side of the pile on the wide
 * spread, and a horizontal swipe on touch. The swipe is why the pile now
 * runs sideways at EVERY size — the vertical stack, and the --pile-peek-y
 * token with it, is retired. Only the strips within --pile-peek-cap show,
 * so the deck's width no longer grows with the number of cards it holds.
 *
 * Clicking the face-up card picks it up (Characters Phase 3): the SAME node
 * lifts to the viewport center, scaled up to read — the desk dims, the rest
 * of the page goes inert, Esc / click-out / Back sets it back down. The lift
 * is the same turn held closer, not a new destination: it never touches the
 * URL, and the card's internal scroll position survives because no second
 * render is involved.
 *
 * Every pane mounts eagerly during SSR and hydration. Cards own their product
 * reads, while pane-local Suspense/ErrorBoundary instances keep a hidden product
 * outage from replacing the route shell or the active pane.
 */

import {
  Show, Suspense, For, ErrorBoundary, createEffect, createSignal, on, onCleanup,
} from "solid-js";
import { createAsync } from "@solidjs/router";
import {
  useProfile,
  type ProfileTab,
  type RatingScope,
  type RateMode,
  type ScoreModel,
} from "../../contexts/profile";
import { CARD_REGISTRY, type CardDef } from "./card-registry";
import { pillarLabel, transferNoun, characterName, fantasySupported } from "../../lib/cards/card-meta";
import { deckHasContent } from "../../lib/cards/deck-content";
import { getStats } from "../../lib/data/stats.server";
import LoadingCard from "./LoadingCard";
import NavWell from "./NavWell";
import Select from "./Select";
import CompareControl from "./CompareControl";
import WeekCard from "./WeekCard";
import { getHeadlines } from "../../lib/data/headlines.server";
import { getWeeks } from "../../lib/data/weeks.server";
import { parseWeekKey, weekOptionsFrom } from "../../lib/utils/week";
import "./ReadingTable.css";

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

export default function ReadingTable() {
  const ctx = useProfile();

  // ── What the entity actually holds (Dynamic deck, 2026-08-16) ───────────
  // The registry says which cards EXIST; the entity says which it HAS. First
  // the cards this entity TYPE can wear (reactive, so navigating player↔team
  // in place updates the set), then only those with something to say. The
  // rail, the pile, the arrows and the swipe all read the one list, so a
  // three-card entity gets a three-card deck and a three-tab rail — no empty
  // seats. deckHasContent rides the SAME query() the panes fetch
  // (lib/cards/deck-content), so asking costs no network of its own.
  //
  // A failed read DEALS the card: an outage is not an absence, and the pane's
  // own ErrorBoundary is the place that says so.
  const registryTabs = () => CARD_REGISTRY.filter((t) => !t.showFor || t.showFor(ctx.type()));
  const dealt = createAsync(async () => {
    const tabs = registryTabs();
    const answers = await Promise.all(
      tabs.map((t) => deckHasContent(ctx, t.id).catch(() => true)),
    );
    return tabs.filter((_, i) => answers[i]).map((t) => t.id);
  });

  // The card in hand keeps its seat. Presence is asked under the CURRENT
  // conditions, so choosing a news scope with no stories in it would otherwise
  // pull the card out from under the reader mid-turn. Instead the card stays
  // and shows its Veil, and leaves the table once they move on.
  const [heldCard, setHeldCard] = createSignal<ProfileTab | null>(null);
  createEffect(() => {
    if (dealt()?.includes(ctx.activeTab())) setHeldCard(ctx.activeTab());
  });

  // NOTHING is dealt until the answer is in — NOT a provisional full deck.
  // Solid's server resources are keyed by TREE POSITION (createResource →
  // sharedConfig.getNextContextId, one id per component, nested), and async
  // SSR renders the tree more than once. Dealing six panes on the first pass
  // and four on the second re-seats every pane after the gap, so pane N reads
  // the resource pane M already fetched — the Momentum card renders the
  // Journalist's news payload and throws. An empty first pass keeps each
  // pass's pane list a prefix of the next, which is stable. (The reader sees
  // the loading deck below, not a flash of six cards, which is also what the
  // dealt deck should look like.)
  // Week mode deals by the ARCHIVE's presence (the deck-of-cards rule, Scott
  // 2026-08-24): the deck is the same deck, and a card is dealt for the
  // selected week exactly when its seat filed a headline in it. One fetch for
  // the whole table — the six WeekCard panes read the SAME query() key.
  const weekArchive = createAsync(async () => {
    const r = parseWeekKey(ctx.week());
    if (!r) return null;
    return getHeadlines(ctx.sport(), ctx.type(), ctx.id(), r.year, r.week);
  });

  const visibleTabs = () => {
    if (ctx.week() != null) {
      // Same nothing-until-answered discipline as `dealt` (the SSR
      // tree-position rule above): an unanswered archive deals nothing.
      const archive = weekArchive();
      if (!archive) return [];
      const seats = new Set(archive.entries.map((e) => e.card));
      return registryTabs().filter((t) => seats.has(t.id));
    }
    const ids = dealt();
    if (!ids) return [];
    return registryTabs().filter((t) => ids.includes(t.id) || t.id === heldCard());
  };

  // The card actually on top. A `?tab=` naming a card this entity doesn't hold
  // (a deep link from an entity that does, an aliased retired id) lands on the
  // first card it does — resolved here rather than in an effect so SSR, where
  // effects never run, deals the same table the browser does.
  const activeTab = (): ProfileTab => {
    const tabs = visibleTabs();
    const current = ctx.activeTab();
    return tabs.some((t) => t.id === current) ? current : tabs[0]?.id ?? current;
  };
  // …and once hydrated the URL says so, so the canonical, the share link and
  // the card on the table can't disagree.
  createEffect(() => {
    if (!dealt()) return;
    const top = activeTab();
    if (top !== ctx.activeTab()) ctx.setActiveTab(top);
  });

  // Pillar tabs get client labels from the card metadata; The Insider's tab
  // is sport-aware (Transfers for football, Trades for NBA/NFL); everything
  // else uses the registry's static label. Shared by the rail and the backs
  // so the two surfaces always name a card identically.
  const tabLabel = (t: CardDef) =>
    t.id === "transfers"
      ? transferNoun(ctx.sport())
      : pillarLabel(t.id, ctx.type()) ?? t.label;
  const navItems = () =>
    visibleTabs().map((t) => ({ id: t.id, label: tabLabel(t) }));

  const activeControls = () =>
    visibleTabs().find((t) => t.id === activeTab())?.controls ?? [];
  const hasStatControls = () =>
    activeControls().some((control) =>
      control === "model" ||
      control === "rate" ||
      control === "scope" ||
      control === "season",
    );

  // The conditions line (below the tabs, above the cards) — the convention for
  // scoped controls. Year selector first; season affects every card (cards read
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
  // Compare (CompareSearch + the dual Composite butterfly) works for players AND
  // teams — both carry a rating breakdown to mirror, and CompareView already
  // branches on type (magnitude score for players, rank for teams). Shown so a
  // comparison can be started (no data gate — it's the entry point).
  const showCompare = () => activeControls().includes("compare");
  const anyControl = () =>
    showModel() || showRate() || showScope() || showSeason() || showCompare();


  // The conditions line reads stats() (season list, per-X modes, cohort scopes),
  // an API-backed query. Contain that suspension here — behind the route's
  // shared reveal boundary the line would otherwise become a second long pole
  // and hold the whole meta+panes swap on a stats round-trip. An empty
  // conditions line renders zero-height chrome, so the wrapper is invisible
  // until the controls resolve and pop in.
  // The rail's time axis (the week-archive convention, 2026-08-24; re-anchored
  // to the sport's reporting calendar 2026-09-04): Today = the live deck; a
  // week = the merged archive of every seat's headlines. Always shown, every
  // card — it is the table's clock, not a card control. The options come from
  // /{sport}/weeks (week 1 = opening day, ET); until the grid resolves the
  // dropdown shows just "Today", which is also the empty-grid rendering.
  const sportWeeks = createAsync(() => getWeeks(ctx.sport()));
  const weekSelectOptions = () => weekOptionsFrom(sportWeeks()?.weeks);
  const weekMode = () => ctx.week() != null;

  const Conditions = () => (
    <>
      <Select
        options={weekSelectOptions()}
        value={ctx.week() ?? ""}
        onChange={(w) => ctx.setWeek(w || null)}
        ariaLabel="Week"
      />
    <Show when={anyControl() && !weekMode()}>
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
        <Show when={showCompare()}>
          <CompareControl />
        </Show>
      </>
    </Show>
    </>
  );

  // Bringing a card forward moves focus to it once the router has applied
  // the new tab — the clicked strip goes inert, so focus must not be left
  // on it. Rail clicks keep the tablist's own focus behavior.
  const faceRefs = new Map<ProfileTab, HTMLElement>();
  let pendingFocus: ProfileTab | null = null;
  const bringUp = (id: ProfileTab) => {
    pendingFocus = id;
    ctx.setActiveTab(id);
  };
  createEffect(on(
    () => activeTab(),
    (tab) => {
      if (pendingFocus !== tab) return;
      pendingFocus = null;
      faceRefs.get(tab)?.focus();
    },
    { defer: true },
  ));

  // ── Pick up the card (Characters Phase 3) ──────────────────────────────
  // Clicking the already-face-up card lifts it: the SAME node animates to
  // the viewport center, scaled up to min(1.5×, viewport fit) — scaling the
  // node grows the type, which is the readability point. No portal and no
  // position: fixed on the card: the pane's perspective (and even the
  // pile's rotate: 0deg) are containing blocks that would re-anchor fixed
  // descendants, so the lift is a pure transform from the card's in-pile
  // box, riding .pane-card's existing 400ms curve. The transform lives on
  // the flipper ancestor, never inside .card-band-body, so ShadowCard's
  // capture clone stays transform-free.
  const [lifted, setLifted] = createSignal(false);
  const [liftTransform, setLiftTransform] = createSignal<string>();
  // Set-down keeps the pane's raised z (.settling) until the card lands —
  // otherwise it would dip under the still-fading backdrop mid-flight.
  const [settling, setSettling] = createSignal(false);
  const paneRefs = new Map<ProfileTab, HTMLElement>();
  const cardRefs = new Map<ProfileTab, HTMLElement>();
  let backdropEl: HTMLElement | undefined;
  let restoreFocus: HTMLElement | null = null;
  // The translate last applied — subtracted out when re-measuring, because
  // the rect of a lifted card is the transformed box (scale is about the
  // center, so the center only carries the translate).
  let liftDx = 0;
  let liftDy = 0;
  // The lift is a reading posture, not a destination: it NEVER touches the
  // URL or the canonical logic. But mobile users press Back to dismiss
  // overlays, so lifting pushes ONE same-URL history entry — Back sets the
  // card down, and Esc / click-out consume the entry via history.back().
  let liftEntryPushed = false;

  const applyLiftTransform = () => {
    const card = cardRefs.get(activeTab());
    if (!card) return;
    const rect = card.getBoundingClientRect();
    const homeX = rect.left + rect.width / 2 - liftDx;
    const homeY = rect.top + rect.height / 2 - liftDy;
    // Layout size, not rect size — the rect narrows mid-flip / mid-lift.
    const w = card.offsetWidth || rect.width;
    const h = card.offsetHeight || rect.height;
    const vw = window.innerWidth;
    const vh = window.innerHeight;
    // Near-full-screen below the grid break; a visible desk margin above.
    // Both values are token contract (@scoracle/tokens v0.9.0):
    // --lift-margin resolves the 1140px grid break in ReadingTable.css,
    // --lift-scale-max caps the reading scale.
    const styles = getComputedStyle(card);
    const cssMargin = parseFloat(styles.getPropertyValue("--lift-margin"));
    const cssScaleMax = parseFloat(styles.getPropertyValue("--lift-scale-max"));
    const margin = Number.isFinite(cssMargin) ? cssMargin : vw < 1140 ? 16 : 48;
    const scaleMax = Number.isFinite(cssScaleMax) ? cssScaleMax : 1.5;
    const scale = Math.min(scaleMax, (vw - margin) / w, (vh - margin) / h);
    // Whole-pixel translate: a fractional offset resamples the freshly
    // re-rastered text and hands the blur right back.
    liftDx = Math.round(vw / 2 - homeX);
    liftDy = Math.round(vh / 2 - homeY);
    setLiftTransform(`translate(${liftDx}px, ${liftDy}px) scale(${scale})`);
  };

  const liftUp = () => {
    if (lifted()) return;
    restoreFocus = document.activeElement instanceof HTMLElement ? document.activeElement : null;
    applyLiftTransform();
    setLifted(true);
    faceRefs.get(activeTab())?.focus({ preventScroll: true });
  };

  const setDown = (opts?: { viaHistory?: boolean }) => {
    if (!lifted()) return;
    // The lift effect's cleanup below unlocks scroll, un-inerts the page,
    // and restores focus.
    setLifted(false);
    setLiftTransform(undefined);
    liftDx = 0;
    liftDy = 0;
    setSettling(true);
    // transitionend on .pane-card clears this sooner; the timeout covers
    // prefers-reduced-motion, where no transition event ever fires.
    window.setTimeout(() => setSettling(false), 500);
    if (!opts?.viaHistory && liftEntryPushed) {
      liftEntryPushed = false;
      window.history.back();
    }
  };

  // The card's surface is the lift trigger — links, the copy button, text
  // selection, and the internal scrollbar keep working without lifting.
  const pickUp = (e: MouseEvent) => {
    if (lifted()) return;
    const target = e.target as HTMLElement;
    if (target.closest("a, button, input, select, textarea, summary, [role='button']")) return;
    if (
      target.classList.contains("card-band-body") &&
      (e.offsetX >= target.clientWidth || e.offsetY >= target.clientHeight)
    ) return; // the scrollbar, not the surface
    const selection = window.getSelection();
    if (selection && !selection.isCollapsed) return;
    liftUp();
  };

  // Everything the lifted state touches lives in this one client-only
  // effect (createEffect never runs during SSR, so document/window and the
  // cleanup below are SSR-safe), and unmount-while-lifted restores it all.
  createEffect(on(lifted, (isLifted) => {
    if (!isLifted) return;

    // Body scroll locks; the card's internal scroll keeps working. The
    // page scrollbar disappears with the lock, and global.css deliberately
    // reserves no scrollbar-gutter — compensate with the measured width or
    // the whole centered deck jumps as the card lifts.
    const html = document.documentElement;
    const scrollbar = window.innerWidth - html.clientWidth;
    const prevOverflow = html.style.overflow;
    const prevPadding = document.body.style.paddingRight;
    html.style.overflow = "hidden";
    if (scrollbar > 0) {
      document.body.style.paddingRight = `calc(env(safe-area-inset-right) + ${scrollbar}px)`;
    }

    // aria-modal is enforced, not just claimed: everything off the lifted
    // pane's ancestor path (backs, NavWell, meta card, tray, gutters) goes
    // inert. Only attributes this pass sets get removed on the way out.
    const marked: Element[] = [];
    let node = paneRefs.get(activeTab()) ?? null;
    while (node && node.parentElement && node !== document.body) {
      for (const sibling of node.parentElement.children) {
        if (sibling === node || sibling === backdropEl || sibling.hasAttribute("inert")) continue;
        sibling.setAttribute("inert", "");
        marked.push(sibling);
      }
      node = node.parentElement;
    }

    const onKeyDown = (e: KeyboardEvent) => {
      if (e.key === "Escape") setDown();
    };
    const onResize = () => applyLiftTransform();
    const onPopState = () => {
      liftEntryPushed = false;
      setDown({ viaHistory: true });
    };
    document.addEventListener("keydown", onKeyDown);
    window.addEventListener("resize", onResize);
    window.addEventListener("popstate", onPopState);
    window.history.pushState(
      { ...(window.history.state ?? {}), scoracleLift: true },
      "",
      window.location.href,
    );
    liftEntryPushed = true;

    onCleanup(() => {
      document.removeEventListener("keydown", onKeyDown);
      window.removeEventListener("resize", onResize);
      window.removeEventListener("popstate", onPopState);
      for (const el of marked) el.removeAttribute("inert");
      html.style.overflow = prevOverflow;
      document.body.style.paddingRight = prevPadding;
      const target =
        restoreFocus && restoreFocus.isConnected ? restoreFocus : faceRefs.get(activeTab());
      restoreFocus = null;
      target?.focus({ preventScroll: true });
    });
  }));

  // A tab change while lifted (URL edit, Back to another tab) starts a new
  // turn at rest — the lift never carries across cards.
  createEffect(on(() => activeTab(), () => setDown(), { defer: true }));

  // Eager mount-all. Every card pane is part of the Solid tree from SSR through
  // hydration, so there is no client-only pane gate and no first-click product
  // mount. ctx.activeTab() reads the URL directly, so it is synchronously
  // correct on every frame — including the first one after an entity change —
  // and only decides which card sits on top of the pile. Every pane is a
  // full card box stacked in ONE grid cell; the other cards slide sideways
  // by depth × peek (clamped at --pile-cap) so only a face-up edge strip
  // shows — six cards mostly overlapping, one on top. The pile lives inside
  // .deck-stage, a fixed-width placement box, so the whole arrangement holds
  // still no matter which card is up (ReadingTable.css).
  const activeIdx = () =>
    Math.max(0, visibleTabs().findIndex((t) => t.id === activeTab()));

  // ── Stepping the deck (Deck Navigation, 2026-08-10) ────────────────────
  // The arrows and the swipe both land here. Deliberately NOT bringUp():
  // that hands focus to the newly face-up card, which is right for a strip
  // (the strip's own button goes inert the instant the card comes forward)
  // and wrong for a control that stays exactly where it was — a reader
  // stepping twice would find the arrow gone from under the cursor.
  const stepTo = (delta: number) => {
    const next = visibleTabs()[activeIdx() + delta];
    if (!next) return;
    ctx.setActiveTab(next.id);
  };
  const stepTarget = (delta: number) => visibleTabs()[activeIdx() + delta];

  // ── Swipe the deck ─────────────────────────────────────────────────────
  // Touch only, and deliberately simple (Scott, 2026-08-21): a mostly-
  // horizontal touch that travels SWIPE_COMMIT px before lifting turns the
  // deck one card in the direction of travel. No finger-tracking, no drag
  // visuals, no pointer capture — vertical gestures scroll the page natively
  // (`touch-action: pan-y` on .deck-stage), taps never come near the
  // threshold, and the browser suppresses the click after a travelled touch,
  // so a swipe can't also lift or bring-forward a card.
  const SWIPE_COMMIT = 48; // px of horizontal travel that reads as a turn

  let swipeStart: { x: number; y: number } | null = null;

  const onTouchStart = (e: TouchEvent) => {
    const t = e.changedTouches[0];
    swipeStart = t ? { x: t.clientX, y: t.clientY } : null;
  };

  const onTouchEnd = (e: TouchEvent) => {
    const start = swipeStart;
    swipeStart = null;
    if (!start || lifted()) return;
    const t = e.changedTouches[0];
    if (!t) return;
    const dx = t.clientX - start.x;
    const dy = t.clientY - start.y;
    // Horizontal intent only: enough travel, and flatter than it is tall.
    if (Math.abs(dx) < SWIPE_COMMIT || Math.abs(dx) <= Math.abs(dy)) return;
    stepTo(dx > 0 ? -1 : 1);
  };
  onCleanup(() => {
    swipeStart = null;
  });

  // One chevron either side of the pile. It names the card it would turn
  // to, so the control reads as part of the reading rather than as generic
  // pagination. With no card that way it LEAVES rather than greying out —
  // a disabled arrow at the end of the deck is indistinguishable from a
  // broken one (Scott, 2026-08-10, having found exactly that on Sigil).
  const DeckStep = (props: { delta: -1 | 1 }) => {
    const target = () => stepTarget(props.delta);
    const direction = () => (props.delta < 0 ? "Previous" : "Next");
    const label = () => {
      const t = target();
      return t
        ? `${direction()} card: ${tabLabel(t)} — ${characterName(t.id)}`
        : `${direction()} card`;
    };
    return (
      <button
        type="button"
        class="deck-step"
        classList={{ "is-spent": !target() }}
        disabled={!target()}
        aria-label={label()}
        title={label()}
        onClick={() => stepTo(props.delta)}
      >
        {/* The seat is the visible mark; the button around it stays the
            full height of the deck, so the target is the size of the card
            beside it while the ink stays small. */}
        <span class="deck-step-seat">
          <svg class="deck-step-mark" viewBox="0 0 16 16" fill="none" aria-hidden="true">
            <path
              d={props.delta < 0 ? "M10.25 2.75 5 8l5.25 5.25" : "M5.75 2.75 11 8l-5.25 5.25"}
              stroke="currentColor"
              stroke-width="1.75"
              stroke-linecap="round"
              stroke-linejoin="round"
            />
          </svg>
        </span>
      </button>
    );
  };

  return (
    <section class="reading-table" aria-label="Profile content">
      {/* Which cards the entity holds is itself a read, so it suspends — and
          it suspends HERE, not to the route's shared boundary, or the meta
          card would be held behind every product fetch on the page. The
          fallback is a card-shaped deck: the table is being dealt, not
          missing. An entity that holds nothing renders neither rail nor
          deck, and profile.css drops the spread to the meta card alone. */}
      <Suspense
        fallback={
          <div class="reading-table-deck">
            <LoadingCard label="Reading" />
          </div>
        }
      >
        <Show when={visibleTabs().length > 0}>
          <NavWell
            items={navItems()}
            active={activeTab()}
            onSelect={ctx.setActiveTab}
            ariaLabel="Profile section"
            conditionsAriaLabel="Profile view controls"
            conditions={
              <Suspense fallback={null}>
                <Conditions />
              </Suspense>
            }
          />
          <div class="reading-table-deck">
            <DeckStep delta={-1} />
            {/* The stage: a uniform, invisible placement box (Scott,
                2026-08-21). The pile centers inside it and the arrows flank
                IT, so neither the pile's center nor either arrow moves when
                the active card changes. The swipe rides here too. */}
            <div class="deck-stage" onTouchStart={onTouchStart} onTouchEnd={onTouchEnd}>
              <div class="reading-table-panes">
            <For each={visibleTabs()}>
              {(pane, i) => {
                const isActive = () => activeTab() === pane.id;
                const side = () => (isActive() ? null : i() < activeIdx() ? "before" : "after");
                // Pile depth: how many cards sit between this back and the top of
                // the pile (1 = directly under the face-up card). Drives the
                // peek offset and the z-order — nearer cards lie higher.
                const depth = () => Math.abs(i() - activeIdx());
                return (
                  <div
                    class="reading-table-pane"
                    classList={{
                      active: isActive(),
                      lifted: isActive() && lifted(),
                      settling: isActive() && settling(),
                      "pane-before": side() === "before",
                      "pane-after": side() === "after",
                    }}
                    style={side() ? { "--depth": String(depth()) } : undefined}
                    ref={(el) => paneRefs.set(pane.id, el)}
                  >
                    <div
                      class="pane-card"
                      style={isActive() && liftTransform() ? { transform: liftTransform() } : undefined}
                      onTransitionEnd={(e) => {
                        if (e.target === e.currentTarget && e.propertyName === "transform" && !lifted()) {
                          setSettling(false);
                        }
                      }}
                      ref={(el) => cardRefs.set(pane.id, el)}
                    >
                      <div
                        class="pane-face"
                        role={isActive() && lifted() ? "dialog" : "tabpanel"}
                        aria-modal={isActive() && lifted() ? "true" : undefined}
                        aria-label={
                          isActive() && lifted()
                            ? `${tabLabel(pane)} — ${characterName(pane.id)}`
                            : undefined
                        }
                        aria-hidden={isActive() ? undefined : "true"}
                        inert={!isActive()}
                        tabindex="-1"
                        onClick={(e) => {
                          if (isActive()) pickUp(e);
                        }}
                        onKeyDown={(e) => {
                          if (isActive() && !lifted() && e.key === "Enter" && e.target === e.currentTarget) {
                            liftUp();
                          }
                        }}
                        ref={(el) => faceRefs.set(pane.id, el)}
                      >
                        <ErrorBoundary fallback={(err, reset) => <PaneError label={pane.label} err={err} reset={reset} />}>
                          <Suspense
                            fallback={pane.fallback ? pane.fallback() : <LoadingCard label={pane.label} />}
                          >
                            {/* The time axis (2026-08-24, the deck-of-cards rule):
                                Today deals the live card; a selected week deals the
                                SAME card holding that week's headlines — the deck is
                                never replaced, its faces are. */}
                            <Show when={!weekMode()} fallback={<WeekCard id={pane.id} label={tabLabel(pane)} />}>
                              {pane.body()}
                            </Show>
                          </Suspense>
                        </ErrorBoundary>
                      </div>
                      <button
                        type="button"
                        class="pane-bring"
                        inert={isActive()}
                        aria-hidden={isActive() ? "true" : undefined}
                        aria-label={`Bring the ${tabLabel(pane)} card forward — ${characterName(pane.id)}`}
                        title={`${tabLabel(pane)} — ${characterName(pane.id)}`}
                        onClick={() => {
                          bringUp(pane.id);
                        }}
                      />
                    </div>
                  </div>
                );
              }}
             </For>
              </div>
            </div>
            <DeckStep delta={1} />
          </div>
          {/* The desk dims. Chrome, not content — hidden from AT (Esc and the
              lifted dialog carry the a11y contract). Sits under the lifted pane
              and over everything else, clearing GutterAds and the AppTray. Its
              fixed position is real viewport-fixed: this sibling sits outside
              the panes' perspective/rotate containing blocks. */}
          <div
            class="pane-lift-backdrop"
            classList={{ open: lifted() }}
            aria-hidden="true"
            onClick={() => setDown()}
            ref={(el) => (backdropEl = el)}
          />
        </Show>
      </Suspense>
    </section>
  );
}
