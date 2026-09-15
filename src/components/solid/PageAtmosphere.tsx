import "./PageAtmosphere.css";
import { createUniqueId, Show } from "solid-js";
import type { TeamPalette } from "../../lib/utils/team-colors";
import TeamDrapePaletteFilter from "./TeamDrapePaletteFilter";
export type AtmospherePalette = TeamPalette;
/** Fixed drapery stays behind the artifacts; profile tints retain the painted folds. */
export default function PageAtmosphere(props: {
    palette?: AtmospherePalette;
}) {
    const filterId = `drape-palette-${createUniqueId()}`;
    const desktopArt = () => props.palette
        ? "/images/impasto-drapes-threaded-3.webp"
        : "/images/impasto-drapes-threaded-default-4.webp";
    const mobileArt = () => props.palette
        ? "/images/impasto-drapes-threaded-mobile-5.webp"
        : "/images/impasto-drapes-threaded-mobile-default-5.webp";
    return (<div aria-hidden="true" class={["page-atmosphere", { "page-atmosphere--team": !!props.palette }]}>
      <Show when={props.palette}>
        {(palette) => <TeamDrapePaletteFilter id={filterId} palette={palette()}/>}
      </Show>
      <picture class="page-atmosphere-art">
        <source media="(max-width: 768px)" srcset={mobileArt()}/>
        <img src={desktopArt()} alt="" width="1536" height="1024" decoding="async" style={props.palette ? { filter: `url(#${filterId})` } : undefined}/>
      </picture>
    </div>);
}
