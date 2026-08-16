/**
 * ReadingTable — the profile's reading table (Characters Phase 2).
 *
 * Named for the doctrine section it implements (@scoracle/tokens
 * AESTHETIC_VISION.md, "The Reading Table"). It was `ContentShell` until the
 * Board session (2026-08-10) retired the last of the `<Shell>` vocabulary —
 * the Shell primitive itself was absorbed into `<Card>` on 2026-08-04.
 *
 * One `<NavWell>` over the registry's Card panes — the six character cards
 * (Scouting / Narratives / Transfers / Vibe / Momentum / Sigil), plus the
 * conditions line when the active Card declares scoped controls. Scouting is
 * the default landing tab.
 *
 * The panes are the table: ALL SIX cards lie face-up (the flip is retired
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
  type NewsScope,
} from "../../contexts/profile";
import { CARD_REGISTRY, type CardDef } from "./card-registry";
import { pillarLabel, transferNoun, characterName, fantasySupported } from "../../lib/cards/card-meta";
import { getStats } from "../../lib/data/stats.server";
import { NEWS_SCOPE_OPTIONS } from "../../lib/utils/news-display";
import LoadingCard from "./LoadingCard";
import NavWell from "./NavWell";
import Select from "./Select";
import CompareControl from "./CompareControl";
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

  // Tabs visible for this entity type — reactive, so navigating player↔team in
  // place updates the tab set.
  const visibleTabs = () => CARD_REGISTRY.filter((t) => !t.showFor || t.showFor(ctx.type()));
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
    visibleTabs().find((t) => t.id === ctx.activeTab())?.controls ?? [];
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

  // Historical scopes shared by Narratives and Transfers/Trades — the shared
  // NEWS_SCOPE_OPTIONS from lib/utils/news-display.ts.

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
  const showNewsScope = () => activeControls().includes("newsScope");
  // Compare (CompareSearch + the dual Composite butterfly) works for players AND
  // teams — both carry a rating breakdown to mirror, and CompareView already
  // branches on type (magnitude score for players, rank for teams). Shown so a
  // comparison can be started (no data gate — it's the entry point).
  const showCompare = () => activeControls().includes("compare");
  const anyControl = () => showModel() || showRate() || showScope() || showSeason() || showNewsScope() || showCompare();

  // The conditions line reads stats() (season list, per-X modes, cohort scopes),
  // an API-backed query. Contain that suspension here — behind the route's
  // shared reveal boundary the line would otherwise become a second long pole
  // and hold the whole meta+panes swap on a stats round-trip. An empty
  // conditions line renders zero-height chrome, so the wrapper is invisible
  // until the controls resolve and pop in.
  const Conditions = () => (
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
    () => ctx.activeTab(),
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
    const card = cardRefs.get(ctx.activeTab());
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
    faceRefs.get(ctx.activeTab())?.focus({ preventScroll: true });
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
    let node = paneRefs.get(ctx.activeTab()) ?? null;
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
        restoreFocus && restoreFocus.isConnected ? restoreFocus : faceRefs.get(ctx.activeTab());
      restoreFocus = null;
      target?.focus({ preventScroll: true });
    });
  }));

  // A tab change while lifted (URL edit, Back to another tab) starts a new
  // turn at rest — the lift never carries across cards.
  createEffect(on(() => ctx.activeTab(), () => setDown(), { defer: true }));

  // Eager mount-all. Every card pane is part of the Solid tree from SSR through
  // hydration, so there is no client-only pane gate and no first-click product
  // mount. ctx.activeTab() reads the URL directly, so it is synchronously
  // correct on every frame — including the first one after an entity change —
  // and only decides which card sits on top of the pile. Every pane is a
  // full card box stacked in ONE grid cell; the other cards slide sideways
  // by depth × peek (clamped at --pile-cap) so only a face-up edge strip
  // shows — six cards mostly overlapping, one on top. --before-n/--after-n
  // size the container's wings so the pile centers itself (ReadingTable.css).
  const activeIdx = () =>
    Math.max(0, visibleTabs().findIndex((t) => t.id === ctx.activeTab()));

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
  // Touch only. A horizontal drag turns the reading; the page keeps every
  // vertical gesture (`touch-action: pan-y`), and the card's own scroll
  // region keeps working inside it.
  //
  // Tap and drag share the same surface, so the gesture has to be claimed
  // before it does anything: the first CLAIM px of travel decide whether
  // this is a swipe or a lift, and once claimed the pending click is
  // swallowed so the card doesn't also come up in the reader's hands.
  const SWIPE_CLAIM = 10; // px of travel before the gesture is ours
  const SWIPE_COMMIT = 56; // px that turns a drag into a step
  const SWIPE_FLICK = 0.5; // px/ms — a fast flick commits short
  const SWIPE_FLICK_MIN = 24; // px a flick still has to cover to count
  // iOS reads a drag that starts at the screen edge as Safari's Back, so
  // the deck's gesture surface deliberately stops short of both edges.
  const EDGE_GUARD = 28;

  const [dragging, setDragging] = createSignal(false);
  const [drag, setDrag] = createSignal(0);
  let gesture: { id: number; x: number; y: number; t: number; claimed: boolean } | null = null;
  // Set the moment a drag is claimed; consumed by whichever click the
  // browser synthesizes on release (the card's lift, or a strip's
  // bring-forward), and cleared by the next press either way.
  let swallowClick = false;
  const consumedBySwipe = () => {
    if (!swallowClick) return false;
    swallowClick = false;
    return true;
  };
  const calmed = () =>
    typeof window !== "undefined" &&
    window.matchMedia?.("(prefers-reduced-motion: reduce)").matches === true;

  // The pile is bounded, not a carousel — tab order is the registry's
  // order. Dragging past either end meets resistance instead of wrapping.
  const damped = (dx: number) => {
    const past =
      (dx > 0 && activeIdx() === 0) || (dx < 0 && activeIdx() === visibleTabs().length - 1);
    return past ? dx * 0.25 : dx;
  };

  const onPointerDown = (e: PointerEvent) => {
    swallowClick = false;
    if (lifted() || e.pointerType === "mouse") return;
    if (e.clientX < EDGE_GUARD || e.clientX > window.innerWidth - EDGE_GUARD) return;
    gesture = { id: e.pointerId, x: e.clientX, y: e.clientY, t: e.timeStamp, claimed: false };
  };

  const onPointerMove = (e: PointerEvent) => {
    if (!gesture || e.pointerId !== gesture.id) return;
    const dx = e.clientX - gesture.x;
    const dy = e.clientY - gesture.y;
    if (!gesture.claimed) {
      // Mostly vertical: this was a scroll, and it isn't ours.
      if (Math.abs(dy) > Math.abs(dx)) {
        gesture = null;
        return;
      }
      if (Math.abs(dx) < SWIPE_CLAIM) return;
      gesture.claimed = true;
      swallowClick = true;
      // Keep the rest of the drag even if the finger leaves the deck.
      // Throws if the pointer is already gone (and is absent under jsdom),
      // which costs the capture but not the gesture.
      try {
        (e.currentTarget as HTMLElement).setPointerCapture?.(e.pointerId);
      } catch { /* the drag still tracks through the document */ }
      // Reduced motion gets the turn, never the follow — the pile does not
      // track the finger, it just lands on the card the swipe asked for.
      if (!calmed()) setDragging(true);
    }
    if (!calmed()) setDrag(damped(dx));
  };

  const endGesture = (e: PointerEvent, commit: boolean) => {
    if (!gesture || e.pointerId !== gesture.id) return;
    const { claimed, x, t } = gesture;
    gesture = null;
    setDragging(false);
    setDrag(0);
    if (!claimed || !commit) return;
    const dx = e.clientX - x;
    const travel = Math.abs(dx);
    const speed = travel / Math.max(1, e.timeStamp - t);
    // A long pull commits on distance; a short one only on a genuine flick,
    // and a flick still has to travel far enough to read as a turn rather
    // than a jittery tap.
    const flicked = speed >= SWIPE_FLICK && travel >= SWIPE_FLICK_MIN;
    if (travel < SWIPE_COMMIT && !flicked) return;
    stepTo(dx > 0 ? -1 : 1);
  };

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
      <NavWell
        items={navItems()}
        active={ctx.activeTab()}
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
        <div
          class="reading-table-panes"
          classList={{ "is-dragging": dragging() }}
          style={{
            "--before-n": String(activeIdx()),
            "--after-n": String(visibleTabs().length - activeIdx() - 1),
            ...(drag() ? { "--pile-drag": `${Math.round(drag())}px` } : {}),
          }}
          onPointerDown={onPointerDown}
          onPointerMove={onPointerMove}
          onPointerUp={(e) => endGesture(e, true)}
          onPointerCancel={(e) => endGesture(e, false)}
        >
        <For each={visibleTabs()}>
          {(pane, i) => {
            const isActive = () => ctx.activeTab() === pane.id;
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
                      if (consumedBySwipe()) return; // the drag turned the deck
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
                        {pane.body()}
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
                      if (consumedBySwipe()) return; // the drag turned the deck
                      bringUp(pane.id);
                    }}
                  />
                </div>
              </div>
            );
          }}
        </For>
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
    </section>
  );
}
