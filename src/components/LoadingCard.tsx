import { CardVessel } from "./Card";
import type { JSX } from "solid-js";
import "./content-cards.css";
interface LoadingCardProps {
    label: string;
    class?: string;
    artwork?: JSX.Element;
}
export default function LoadingCard(props: LoadingCardProps) {
    return (<CardVessel as="article" aria-label={`${props.label} loading`} class={props.class}>
      <div class="deck-back-loading">
        <div class="deck-back-loading-art" aria-hidden="true">
          {props.artwork ?? <span class="deck-back-loading-mark"/>}
        </div>
      </div>
    </CardVessel>);
}
