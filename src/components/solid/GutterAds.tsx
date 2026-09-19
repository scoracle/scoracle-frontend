import AdSlot from "./AdSlot";
import "./GutterAds.css";

export interface GutterAdsProps {
  /** AdSense slot ID for the right rail. Undefined → reserved-space only. */
  slot?: string;
}

/* The right rail is the page's only ad surface (2026-09-19): the left side
   belongs to the AppTray, and there is no top or bottom ad. */
export default function GutterAds(props: GutterAdsProps) {
  return (
    <aside class="gutter-ads" aria-label="advertisement">
      <div class="gutter-ads-sticky">
        <AdSlot
          slot={props.slot}
          format="vertical"
          minHeight="600px"
          width="100%"
        />
      </div>
    </aside>
  );
}
