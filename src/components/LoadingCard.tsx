import { CardVessel } from "./Card";
import "./content-cards.css";
interface LoadingCardProps {
    label: string;
    class?: string;
}
export function CelestialOrbit() {
    return <div class="celestial-orbit" aria-hidden="true">
      <img src="/deck-art/sun-back.svg" alt="" />
      <img src="/deck-art/moon-back.svg" alt="" />
    </div>;
}
export default function LoadingCard(props: LoadingCardProps) {
    return (<CardVessel as="article" aria-label={`${props.label} loading`} title="loading..." class={`celestial-back ${props.class ?? ""}`} artwork={
      <div class="deck-back-loading">
        <CelestialOrbit />
      </div>
    }>{null}</CardVessel>);
}
