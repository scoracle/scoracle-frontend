import { Dynamic } from "solid-js/web";
import type { JSX } from "solid-js";
import { useProfile } from "../lib/profile-context";
import { children } from "solid-js";
import { Show } from "solid-js";
import CardScoreSlot from "./CardScoreSlot";
import type { EntityType } from "../../../src/lib/types";
import { DECK_HUES, type CardId } from "../../../src/lib/cards/card-meta";
import { deckIllustrationStyle } from "../../../src/lib/cards/deck-illustration";
import { cardSky } from "../../../src/lib/cards/card-sky";
import { drawCard, displayScore, VEIL_CARD } from "../../../src/lib/cards/tarot-deck";
import { cardScoreColor } from "../../../src/lib/utils/tier-color";
import "../../../src/components/solid/content-cards.css";
type HostTag = "div" | "section" | "nav" | "main" | "aside" | "article";
function CardFrame() {
    return (<svg class="card-frame" viewBox="0 0 100 100" preserveAspectRatio="none" fill="none" stroke-width="1.3" stroke-linecap="round" stroke-linejoin="round" aria-hidden="true">
      <path vector-effect="non-scaling-stroke" d="M 2.00 2.00 Q 17.21 1.95 33.62 1.99 Q 50.00 2.01 65.29 1.96 Q 80.59 1.95 93.69 1.99 Q 96.42 2.00 98.00 2.00 Q 98.05 17.21 98.02 33.62 Q 97.99 50.00 98.04 65.29 Q 98.05 80.59 98.02 93.69 Q 98.00 96.42 98.00 98.00 Q 82.76 98.05 66.38 98.02 Q 50.00 97.99 34.71 98.04 Q 19.38 98.05 6.31 98.02 Q 3.58 98.00 2.00 98.00 Q 1.95 82.76 1.99 66.38 Q 2.01 50.00 1.96 34.71 Q 1.95 19.38 1.99 6.31 Q 2.00 3.58 2.00 2.00 Z"/>
      <path vector-effect="non-scaling-stroke" d="M 2.00 90.22 Q 34.71 90.05 66.38 90.24 Q 82.76 90.30 98.00 90.20"/>
    </svg>);
}
export interface CardVesselProps {
    illustrationScore?: number | null;
    artwork?: JSX.Element;
    as?: HostTag;
    "aria-label"?: string;
    class?: JSX.HTMLAttributes<HTMLElement>["class"];
    classList?: Record<string, boolean>;
    deck?: CardId;
    title?: string;
    ref?: (el: HTMLElement) => void;
    children: JSX.Element;
}
export function CardVessel(props: CardVesselProps) {
    const artwork = children(() => props.artwork);
    const deck = (): keyof typeof DECK_HUES | undefined => props.deck && props.deck in DECK_HUES ? (props.deck as keyof typeof DECK_HUES) : undefined;
    const hostProps = {
        ref: props.ref,
        get "aria-label"() { return props["aria-label"]; },
        get style() { return deck() ? { "--deck-hue": DECK_HUES[deck()!] } : undefined; },
        get class() { return `card ${props.class ?? ""}`; },
        get classList() { return props.classList; },
    };
    const content = () => <>
      <div aria-hidden="true" class="card-wash" classList={{ "card-wash-deck": !!deck() }}>
        {artwork()}
        {/* Transparent engraving masks keep the approved linework in the
            stock's own ink in both themes and in the light-pinned capture. */}
        <Show when={deck()}>
          {(d) => (<span class="card-motif" style={deckIllustrationStyle(d(), props.illustrationScore)}/>)}
        </Show>
      </div>
      <CardFrame />
      {props.children}
      <div class="card-foot" aria-hidden={props.title ? undefined : "true"}>
        <Show when={props.title}>
          <span class="card-foot-name">{props.title}</span>
        </Show>
      </div>
    </>;
    return <Dynamic component={props.as ?? "div"} {...hostProps}>{content()}</Dynamic>;
}
interface CardProps {
    type?: EntityType;
    artwork?: JSX.Element;
    id: CardId;
    as?: HostTag;
    "aria-label"?: string;
    class?: JSX.HTMLAttributes<HTMLElement>["class"];
    classList?: Record<string, boolean>;
    score?: () => number | null | undefined;
    children: JSX.Element;
}
export default function Card(props: CardProps) {
    const ctx = useProfile();
    const score = () => {
        const raw = props.score?.();
        return raw == null || !Number.isFinite(raw) ? null : displayScore(raw);
    };
    const drawn = () => drawCard(props.id, score());
    const sky = () => cardSky(props.id, score(), props.type ?? ctx.type());
    const scoreColor = () => {
        const s = score();
        return s == null ? undefined : cardScoreColor(props.id, s, props.type ?? ctx.type());
    };
        const title = () => (props.score ? (drawn()?.name ?? VEIL_CARD.name) : undefined);
    return (<CardVessel as={props.as} aria-label={props["aria-label"]} deck={props.id} illustrationScore={score()} artwork={<>
        <Show when={sky()}>{weather => <span class="card-sky" data-sky={weather()} style={{ "--card-sky-src": `var(--delivery-engraving-profile-${weather()})` }}/>}</Show>
        {props.artwork}
      </>} title={title()} class={props.class} classList={props.classList}>
      <div class="card-band-body">
        <Show when={props.score}>
          <CardScoreSlot score={score()} drawn={drawn()} color={scoreColor()}/>
        </Show>
        {props.children}
      </div>
    </CardVessel>);
}
