import Icon from "./Icon";
import { useProfileReads, useProfileProducts } from "../lib/profile-products";
import ProductPane from "./ProductPane";

import type { JSX } from "solid-js";
import { createMemo } from "solid-js";
import { Show, For, createEffect, createSignal, onCleanup, on, untrack, } from "solid-js";
import { useProfile, type ProfileTab, type RatingScope, type RateMode, type ScoreModel, } from "../lib/profile-context";
import { CARD_REGISTRY, type CardDef } from "./card-registry";
import { pillarLabel, transferNoun, characterName, fantasySupported } from "../lib/cards/card-meta";
import { hasDeckContent } from "../lib/cards/deck-presence";
import { deckProducts } from "./ProductPane";
import LoadingCard from "./LoadingCard";
import NavWell from "./NavWell";
import Select from "./Select";
import CompareControl from "./CompareControl";
import "./ReadingTable.css";
import { createArrival } from "../lib/arrival";
export default function ReadingTable(props: { loading?: JSX.Element; preview?: boolean } = {}) {
    const ctx = useProfile();
    const data = useProfileReads();
    const products = useProfileProducts();
    const [ready, setReady] = createSignal(false);
    createEffect(() => { if (products.settled()) setReady(true); });
    const registryTabs = createMemo(() => CARD_REGISTRY.filter((t) => !t.showFor || t.showFor(ctx.type())));
    const pending = (tab: ProfileTab) => deckProducts[tab].some(key => products.resources[key].state().status === 'pending');
    const dealt = createMemo<ProfileTab[]>(previous => {
        const results = Object.fromEntries(Object.entries(data).map(([key, read]) => [key, read()]));
        return registryTabs().filter(tab => pending(tab.id)
            ? previous?.includes(tab.id)
            : deckProducts[tab.id].some(key => products.resources[key].state().status === 'error') || hasDeckContent(results, ctx.rateMode(), tab.id)).map(tab => tab.id);
    });
    const heldCard = createMemo<ProfileTab | null>(previous => {
        const active = ctx.activeTab();
        return dealt().includes(active) ? active : previous === active ? previous : null;
    }, null);
    // Keep a requested card's seat while it loads, without hiding readable siblings.
    const visibleTabs = createMemo(() => registryTabs().filter(tab => dealt().includes(tab.id) || tab.id === heldCard()
        || (dealt().length > 0 && tab.id === ctx.activeTab() && pending(tab.id))));
    const activeTab = createMemo((): ProfileTab => {
        const tabs = visibleTabs();
        const current = ctx.activeTab();
        return tabs.some((t) => t.id === current) ? current : tabs[0]?.id ?? current;
    });
    createEffect(on(() => [activeTab(), ctx.activeTab(), !pending(ctx.activeTab())] as const, ([top, requested, settled]) => {
        if (settled && top !== requested)
            ctx.setActiveTab(top);
    }));
    const tabLabel = (t: CardDef) => t.id === "transfers"
        ? transferNoun(ctx.sport())
        : pillarLabel(t.id) ?? t.label;
    /* Memoized for identity, not just cost: this mints a fresh {id,label} per
       CALL, which is what forced NavWell into a joined-string dependency
       signature and an explicit `keyed` prop. Stable objects mean NavWell's
       effect can depend on the array and <For> can use default keying. */
    const navItems = createMemo(() => visibleTabs().map((t) => ({ id: t.id, label: tabLabel(t) })));
    const activeControls = createMemo(() => visibleTabs().find((t) => t.id === activeTab())?.controls ?? []);
    const Conditions = () => {
    const stats = createMemo(data.stats);
    const seasons = () => stats()?.available_seasons ?? [];
    const seasonOptions = () => seasons().map((s) => ({ value: String(s), label: String(s) }));
    const SCOPE_LABEL: Record<string, string> = {
        position: "By Position", conference: "By Conference",
        division: "By Division", league: "By League",
    };
    const scopeOptions = () => {
        const sr = stats()?.rating?.rating_scoped_ranks ?? {};
        const keys = Object.keys(sr).filter((k) => !(k === "league" && "conference" in sr));
        return [{ value: "all", label: "All" }, ...keys.map((k) => ({ value: k, label: SCOPE_LABEL[k] ?? k }))];
    };
    const RATE_OPTIONS: Record<string, {
        value: string;
        label: string;
    }[]> = {
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
    const MODEL_OPTIONS = [
        { value: "regular", label: "Regular" },
        { value: "fantasy", label: "Fantasy" },
    ];
    const showModel = () => activeControls().includes("model") && ctx.type() === "player" &&
        fantasySupported(ctx.sport()) && stats()?.rating?.fantasy != null;
    const showRate = () => activeControls().includes("rate") && ctx.type() === "player" &&
        stats()?.rating?.rating_modes != null && rateOptions().length > 1;
    const showScope = () => activeControls().includes("scope") && scopeOptions().length > 1;
    const showSeason = () => activeControls().includes("season") && seasons().length > 0;
    const showCompare = () => activeControls().includes("compare");
    const anyControl = () => showModel() || showRate() || showScope() || showSeason() || showCompare();
    return (<Show when={anyControl()}>
      <>
        <Show when={showModel()}>
          <Select options={MODEL_OPTIONS} value={ctx.scoreModel()} onChange={(m) => ctx.setScoreModel(m as ScoreModel)} ariaLabel="Model"/>
        </Show>
        <Show when={showRate()}>
          <Select options={rateOptions()} value={ctx.rateMode()} onChange={(r) => ctx.setRateMode(r as RateMode)} ariaLabel="Rate"/>
        </Show>
        <Show when={showScope()}>
          <Select options={scopeOptions()} value={ctx.scope()} onChange={(s) => ctx.setScope(s as RatingScope)} ariaLabel="Scope"/>
        </Show>
        <Show when={showSeason()}>
          <Select options={seasonOptions()} value={String(ctx.season() ?? seasons()[0] ?? "")} onChange={(v) => ctx.setSeason(Number(v))} ariaLabel="Season"/>
        </Show>
        <Show when={showCompare()}>
          <CompareControl />
        </Show>
      </>
    </Show>);
    };
    const faceRefs = new Map<ProfileTab, HTMLElement>();
    let pendingFocus: ProfileTab | null = null;
    const bringUp = (id: ProfileTab) => {
        pendingFocus = id;
        ctx.setActiveTab(id);
    };
    createEffect(on(activeTab, (tab) => {
        if (pendingFocus !== tab)
            return;
        pendingFocus = null;
        faceRefs.get(tab)?.focus();
    }, { defer: true }));
    const [lifted, setLifted] = createSignal(false);
    const [liftStyle, setLiftStyle] = createSignal<JSX.CSSProperties>();
    const [settling, setSettling] = createSignal(false);
    const paneRefs = new Map<ProfileTab, HTMLElement>();
    const cardRefs = new Map<ProfileTab, HTMLElement>();
    let backdropEl: HTMLElement | undefined;
    let restoreFocus: HTMLElement | null = null;
    let settleTimer: ReturnType<typeof setTimeout> | undefined;
    const finishSetDown = () => {
        if (lifted())
            return;
        setSettling(false);
        setLiftStyle(undefined);
        clearTimeout(settleTimer);
    };
    onCleanup(() => clearTimeout(settleTimer));
    let liftEntryPushed = false;
    onCleanup(() => {
        if (liftEntryPushed && window.history.state?.scoracleLift) {
            const { scoracleLift: _lift, ...state } = window.history.state;
            window.history.replaceState(state, '', window.location.href);
        }
    });
    const applyLiftZoom = () => {
        const card = cardRefs.get(activeTab());
        if (!card)
            return;
        const rect = card.getBoundingClientRect();
        const w = card.offsetWidth || rect.width;
        const h = card.offsetHeight || rect.height;
        if (w <= 0 || h <= 0)
            return;
        const vw = window.innerWidth;
        const vh = window.innerHeight;
        const styles = getComputedStyle(card);
        const cssMargin = parseFloat(styles.getPropertyValue("--lift-margin"));
        const cssScaleMax = parseFloat(styles.getPropertyValue("--lift-scale-max"));
        const margin = Number.isFinite(cssMargin) ? cssMargin : vw < 1140 ? 16 : 48;
        const scaleMax = Number.isFinite(cssScaleMax) ? cssScaleMax : 1.5;
        const scale = Math.min(scaleMax, (vw - margin) / w, (vh - margin) / h);
        const dpr = window.devicePixelRatio || 1;
        const snap = (value: number) => Math.round(value * dpr) / dpr;
        const left = snap((vw - w * scale) / 2);
        const top = snap((vh - h * scale) / 2);
        setLiftStyle({
            width: `${w}px`, height: `${h}px`, zoom: scale,
            left: `${(left - rect.left) / scale}px`,
            top: `${(top - rect.top) / scale}px`,
        });
    };
    const liftUp = () => {
        if (lifted())
            return;
        restoreFocus = document.activeElement instanceof HTMLElement ? document.activeElement : null;
        clearTimeout(settleTimer);
        setSettling(false);
        applyLiftZoom();
        setLifted(true);
        faceRefs.get(activeTab())?.focus({ preventScroll: true });
    };
    const setDown = (opts?: {
        viaHistory?: boolean;
    }) => {
        if (!lifted())
            return;
        setLifted(false);
        setLiftStyle((style) => style ? { ...style, zoom: 1, left: '0px', top: '0px' } : undefined);
        setSettling(true);
        settleTimer = setTimeout(finishSetDown, 500);
        if (!opts?.viaHistory && liftEntryPushed) {
            liftEntryPushed = false;
            window.history.back();
        }
    };
    const pickUp = (e: MouseEvent) => {
        if (lifted())
            return;
        const target = e.target as HTMLElement;
        if (target.closest("a, button, input, select, textarea, summary, [role='button']"))
            return;
        if (target.classList.contains("card-band-body") &&
            (e.offsetX >= target.clientWidth || e.offsetY >= target.clientHeight))
            return; // the scrollbar, not the surface
        const selection = window.getSelection();
        if (selection && !selection.isCollapsed)
            return;
        liftUp();
    };
    createEffect(on(lifted, isLifted => {
        const tab = untrack(activeTab);
        if (!isLifted)
            return;
        const html = document.documentElement;
        const scrollbar = window.innerWidth - html.clientWidth;
        const prevOverflow = html.style.overflow;
        const prevPadding = document.body.style.paddingRight;
        html.style.overflow = "hidden";
        if (scrollbar > 0) {
            document.body.style.paddingRight = `calc(env(safe-area-inset-right) + ${scrollbar}px)`;
        }
        const marked: Element[] = [];
        let node = paneRefs.get(tab) ?? null;
        while (node && node.parentElement && node !== document.body) {
            for (const sibling of node.parentElement.children) {
                if (sibling === node || sibling === backdropEl || sibling.hasAttribute("inert"))
                    continue;
                sibling.setAttribute("inert", "");
                marked.push(sibling);
            }
            node = node.parentElement;
        }
        const onKeyDown = (e: KeyboardEvent) => {
            if (e.key === "Escape")
                setDown();
        };
        const onResize = () => applyLiftZoom();
        const onPopState = () => {
            liftEntryPushed = false;
            setDown({ viaHistory: true });
        };
        document.addEventListener("keydown", onKeyDown);
        window.addEventListener("resize", onResize);
        window.addEventListener("popstate", onPopState);
        window.history.pushState({ ...(window.history.state ?? {}), scoracleLift: true }, "", window.location.href);
        liftEntryPushed = true;
        onCleanup(() => {
            document.removeEventListener("keydown", onKeyDown);
            window.removeEventListener("resize", onResize);
            window.removeEventListener("popstate", onPopState);
            for (const el of marked)
                el.removeAttribute("inert");
            html.style.overflow = prevOverflow;
            document.body.style.paddingRight = prevPadding;
            const target = restoreFocus && restoreFocus.isConnected ? restoreFocus : faceRefs.get(tab);
            restoreFocus = null;
            target?.focus({ preventScroll: true });
        });
    }));
    createEffect(on(activeTab, () => setDown(), { defer: true }));
    const activeIdx = () => Math.max(0, visibleTabs().findIndex((t) => t.id === activeTab()));
    const stepTo = (delta: number) => {
        const next = visibleTabs()[activeIdx() + delta];
        if (!next)
            return;
        ctx.setActiveTab(next.id);
    };
    const SWIPE_COMMIT = 48; // px of horizontal travel that reads as a turn
    let swipeStart: {
        x: number;
        y: number;
    } | null = null;
    const onTouchStart = (e: TouchEvent) => {
        const t = e.changedTouches[0];
        swipeStart = t ? { x: t.clientX, y: t.clientY } : null;
    };
    const onTouchEnd = (e: TouchEvent) => {
        const start = swipeStart;
        swipeStart = null;
        if (!start || lifted())
            return;
        const t = e.changedTouches[0];
        if (!t)
            return;
        const dx = t.clientX - start.x;
        const dy = t.clientY - start.y;
        if (Math.abs(dx) < SWIPE_COMMIT || Math.abs(dx) <= Math.abs(dy))
            return;
        stepTo(dx > 0 ? -1 : 1);
    };
    const arrival = createArrival(() => !props.preview && (dealt().length > 0 || products.settled()));
    const holding = () => props.preview || arrival() === 'waiting' || arrival() === 'closing';
    return (<section class="reading-table" aria-label="Profile content" data-turn={arrival() === 'done' ? undefined : arrival()}>
      <Show when={!holding() && visibleTabs().length > 0} fallback={<>
          <div class="nav-well reading-table-pending-nav" aria-hidden="true">
            <div class="nav-well-scroll"><div class="nav-well-rail"><span class="nav-well-tab">Reading</span></div></div>
            <div class="nav-well-conds"><span class="select-trigger">Reading</span></div>
          </div>
          <div class="reading-table-deck" aria-hidden={!holding() && ready() ? "true" : undefined} style={{ visibility: !holding() && ready() ? "hidden" : undefined }}><div class="deck-stage"><div class="reading-table-panes">
            {props.loading ?? <LoadingCard label="Reading"/>}
          </div></div></div>
        </>}>
          <NavWell items={navItems()} active={activeTab()} onSelect={ctx.setActiveTab} ariaLabel="Profile section" conditionsAriaLabel="Profile view controls" conditions={<Conditions />}/>
          <div class="reading-table-deck">
            <div class="deck-stage" onTouchStart={onTouchStart} onTouchEnd={onTouchEnd}>
              <div class="reading-table-panes">
            <For each={visibleTabs()}>
              {(pane, i) => {
            const isActive = () => activeTab() === pane.id;
            const side = () => (isActive() ? null : i() < activeIdx() ? "before" : "after");
            const depth = () => Math.abs(i() - activeIdx());
            return (<div style={side() ? { "--depth": String(depth()) } : undefined} ref={(el) => paneRefs.set(pane.id, el)} class="reading-table-pane" classList={{
                        active: isActive(),
                        lifted: isActive() && lifted(),
                        settling: isActive() && settling(),
                        "pane-before": side() === "before",
                        "pane-after": side() === "after",
                    }}>
                    <div class="pane-card" ref={(el) => cardRefs.set(pane.id, el)}>
                      <div class="pane-face" style={isActive() ? liftStyle() : undefined} onTransitionEnd={(e) => {
                    if (e.target === e.currentTarget && e.propertyName === 'zoom')
                        finishSetDown();
                }} role={isActive() && lifted() ? "dialog" : "tabpanel"} aria-modal={isActive() && lifted() ? "true" : undefined} aria-label={isActive() && lifted()
                    ? `${tabLabel(pane)} — ${characterName(pane.id)}`
                    : undefined} aria-hidden={isActive() ? undefined : "true"} inert={!isActive()} tabindex="-1" onClick={(e) => {
                    if (isActive())
                        pickUp(e);
                }} onKeyDown={(e) => {
                    if (isActive() && !lifted() && e.key === "Enter" && e.target === e.currentTarget) {
                        liftUp();
                    }
                }} ref={(el) => faceRefs.set(pane.id, el)}>
                        <ProductPane deck={pane.id} label={pane.label}>{pane.body()}</ProductPane>
                        <Show when={isActive() && lifted()}>
                          <button type="button" class="pane-lift-close" aria-label="Close zoomed card" onClick={(e) => { e.stopPropagation(); setDown(); }}>
                            <Icon name="close" size={18}/>
                          </button>
                        </Show>
                      </div>
                      <button type="button" class="pane-bring" inert={isActive()} aria-hidden={isActive() ? "true" : undefined} aria-label={`Bring the ${tabLabel(pane)} card forward — ${characterName(pane.id)}`} title={`${tabLabel(pane)} — ${characterName(pane.id)}`} onClick={() => {
                    bringUp(pane.id);
                }}/>
                    </div>
                  </div>);
        }}
              </For>
              </div>
            </div>
          </div>
          <div aria-hidden="true" onClick={() => setDown()} ref={(el) => (backdropEl = el)} class="pane-lift-backdrop" classList={{ open: lifted() }}/>
      </Show>
    </section>);
}
