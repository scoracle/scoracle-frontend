import "./PageAtmosphere.css";
import type { TeamPalette } from "../../lib/utils/team-colors";

export type AtmospherePalette = TeamPalette;

/** Decorative ink stays on the desk, outside the cards and their exports. */
export default function PageAtmosphere(props: { palette?: AtmospherePalette }) {
  return (
    <div
      class="page-atmosphere"
      classList={{ "page-atmosphere--team": !!props.palette }}
      aria-hidden="true"
      style={props.palette ? {
        "--wash-primary": props.palette[0],
        "--wash-secondary": props.palette[1],
      } : undefined}
    />
  );
}
