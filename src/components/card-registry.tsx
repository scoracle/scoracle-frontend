/** Profile card order, presentation and declared conditions. */
import type { JSX } from "solid-js";
import type { ProfileTab } from "../lib/profile-context";
import type { EntityType } from "../lib/types";
/** A view control this card declares for the NavWell conditions line below the tab rail. */
export type CardControl = "model" | "rate" | "scope" | "season" | "compare" | "view";
import ScoutingCard from "./ScoutingCard";
import NarrativesCard from "./NarrativesCard";
import TransfersCard from "./TransfersCard";
import VibeCard from "./VibeCard";
import { useProfileProducts } from "../lib/profile-products";
import { useProfile } from "../lib/profile-context";
import { Show } from "solid-js";
import EmptyCard from "./EmptyCard";
function VibeReading() { const products = useProfileProducts(); const ctx = useProfile(); return <Show when={products.current()} fallback={<EmptyCard message="No vibe reading yet." />}>{current => <VibeCard current={current()} score={products.vibeScore()} type={ctx.type()} />}</Show>; }
import MomentumCard from "./MomentumCard";
import SigilCard from "./SigilCard";
export interface CardDef {
    id: ProfileTab;
    label: string;
    body: () => JSX.Element;
    /** Pane Loading fallback. Omit for the default whole-card loading face
     *  (`<LoadingCard label={label} />` — ReadingTable supplies it). */
    fallback?: () => JSX.Element;
    showFor?: (type: EntityType) => boolean;
    controls?: readonly CardControl[];
}
export const CARD_REGISTRY: ReadonlyArray<CardDef> = [
    {
        id: "scouting",
        label: "Scouting",
        body: () => <ScoutingCard />,
        controls: ["model", "rate", "scope", "season", "compare"],
    },
    {
        id: "narratives",
        label: "Narratives",
        body: () => <NarrativesCard />,
    },
    {
        id: "transfers",
        label: "Transfers",
        body: () => <TransfersCard />,
    },
    {
        id: "vibe",
        label: "Vibe",
        body: () => <VibeReading />,
    },
    {
        // One face (2026-09-06): hook → sparklines → verdict, always. The View
        // posture flip retired with its control.
        id: "momentum",
        label: "Momentum",
        body: () => <MomentumCard />,
    },
    {
        id: "sigil",
        label: "Sigil",
        body: () => <SigilCard />,
    },
];
