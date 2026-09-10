import "./PageAtmosphere.css";
import { createUniqueId, Show } from "solid-js";
import type { TeamPalette } from "../../lib/utils/team-colors";

export type AtmospherePalette = TeamPalette;

/** Fixed drapery stays behind the artifacts; profile tints retain the painted folds. */
export default function PageAtmosphere(props: { palette?: AtmospherePalette }) {
  const filterId = `drape-palette-${createUniqueId()}`;
  return (
    <div
      class="page-atmosphere"
      classList={{ "page-atmosphere--team": !!props.palette }}
      aria-hidden="true"
      style={props.palette ? {
        "--wash-primary": props.palette[0],
        "--wash-secondary": props.palette[1],
      } : undefined}
    >
      <svg class="page-atmosphere-filters" width="0" height="0">
        <defs>
          <filter id={filterId} x="0" y="0" width="100%" height="100%" color-interpolation-filters="sRGB">
            <Show when={props.palette} fallback={<>
              {/* Color-only grading leaves the approved artwork and alpha untouched. */}
              <feColorMatrix in="SourceGraphic" type="matrix" x="0" y="0" width="50%" height="100%"
                values="0.9 0 0 0 0  0 0.9 0 0 0  0 0 0.9 0 0  0 0 0 1 0" result="dustyBlue" />
              <feColorMatrix in="SourceGraphic" type="matrix" x="50%" y="0" width="50%" height="100%"
                values="0.6 0.1 0.12 0 0  0.15 0.1 0.57 0 0  0.42 0.28 0.12 0 0  0 0 0 1 0" result="dustyMauve" />
              <feMerge>
                <feMergeNode in="dustyBlue" />
                <feMergeNode in="dustyMauve" />
              </feMerge>
            </>}>
              <feColorMatrix in="SourceGraphic" type="saturate" values="0" result="neutral" />
              {/* Both compositions keep one panel per half with a transparent opening. */}
              <feFlood class="page-atmosphere-primary" x="0" y="0" width="50%" height="100%" result="primary" />
              <feFlood class="page-atmosphere-secondary" x="50%" y="0" width="50%" height="100%" result="secondary" />
              <feMerge result="palette">
                <feMergeNode in="primary" />
                <feMergeNode in="secondary" />
              </feMerge>
              <feBlend in="palette" in2="neutral" mode="multiply" result="tintedTexture" />
              <feComposite in="tintedTexture" in2="SourceAlpha" operator="in" />
            </Show>
          </filter>
        </defs>
      </svg>
      <picture class="page-atmosphere-art">
        <source media="(max-width: 768px)" srcset="/images/impasto-drapes-threaded-mobile-3.webp" />
        <img
          src="/images/impasto-drapes-threaded-3.webp"
          alt=""
          width="1536"
          height="1024"
          decoding="async"
          style={{ filter: `url(#${filterId})` }}
        />
      </picture>
    </div>
  );
}
