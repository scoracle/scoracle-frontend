import { CardVessel } from "./Card";
import "./content-cards.css";
interface LoadingCardProps {
    label: string;
    class?: string;
}
export default function LoadingCard(props: LoadingCardProps) {
    return (<CardVessel as="article" aria-label={`${props.label} loading`} class={props.class}>
      <div class="deck-back-loading">
        <img class="deck-back-loading-art" src="/vibe-art/deck-back.svg" alt="" aria-hidden="true"/>
      </div>
    </CardVessel>);
}
