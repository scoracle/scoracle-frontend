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
      {/* Written out rather than .map'd over ["left","right"]: a literal array
          expression is a new array on every evaluation, so `insert` recreated
          BOTH panels — and re-read art() twice — on every render. */}
      <div class="page-atmosphere-art page-atmosphere-art--left">
        <img src={art()} alt="" width="1536" height="1024" decoding="async" fetchpriority="low" style={props.palette ? { filter: `url(#${filterId})` } : undefined}/>
      </div>
      <div class="page-atmosphere-art page-atmosphere-art--right">
        <img src={art()} alt="" width="1536" height="1024" decoding="async" fetchpriority="low" style={props.palette ? { filter: `url(#${filterId})` } : undefined}/>
      </div>
    </div>);
}
