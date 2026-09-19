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
    const art = () => props.palette
        ? "/images/impasto-drapes-threaded-3.webp"
        : "/images/impasto-drapes-threaded-default-4.webp";
    return (<div aria-hidden="true" class={["page-atmosphere", { "page-atmosphere--team": !!props.palette }]}>
      <Show when={props.palette}>
        {(palette) => <TeamDrapePaletteFilter id={filterId} palette={palette()}/>}
      </Show>
      {(["left", "right"] as const).map((side) => <div class={`page-atmosphere-art page-atmosphere-art--${side}`}>
        <img src={art()} alt="" width="1536" height="1024" decoding="async" style={props.palette ? { filter: `url(#${filterId})` } : undefined}/>
      </div>)}
    </div>);
}
