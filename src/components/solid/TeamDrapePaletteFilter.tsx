import type { TeamPalette } from "../../lib/utils/team-colors";
/** Recolors the original curtain art for entity pages while retaining its luminance and alpha. */
export default function TeamDrapePaletteFilter(props: {
    id: string;
    palette: TeamPalette;
}) {
    return (<svg class="page-atmosphere-filters" width="0" height="0" style={{
            "--wash-primary": props.palette[0],
            "--wash-secondary": props.palette[1],
        }}>
      <defs>
        <filter id={props.id} x="0" y="0" width="100%" height="100%" color-interpolation-filters="sRGB">
          <feColorMatrix in="SourceGraphic" type="saturate" values="0" result="neutral"/>
          {/* Both compositions keep one panel per half with a transparent opening. */}
          <feFlood class="page-atmosphere-primary" x="0" y="0" width="50%" height="100%" result="primary"/>
          <feFlood class="page-atmosphere-secondary" x="50%" y="0" width="50%" height="100%" result="secondary"/>
          <feMerge result="palette">
            <feMergeNode in="primary"/>
            <feMergeNode in="secondary"/>
          </feMerge>
          <feBlend in="palette" in2="neutral" mode="multiply" result="tintedTexture"/>
          <feComposite in="tintedTexture" in2="SourceAlpha" operator="in"/>
        </filter>
      </defs>
    </svg>);
}
