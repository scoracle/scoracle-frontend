import AdSlot from "./AdSlot";
import "./GutterAds.css";

export interface GutterAdsProps {
  /** AdSense slot ID for the left rail. Undefined → reserved-space only. */
  leftSlot?: string;
  /** AdSense slot ID for the right rail. Undefined → reserved-space only. */
  rightSlot?: string;
}

export default function GutterAds(props: GutterAdsProps) {
  return (
    <>
      <aside class="gutter-ads gutter-ads-left" aria-label="advertisement">
        <div class="gutter-ads-sticky">
          <AdSlot
            slot={props.leftSlot}
            format="vertical"
            minHeight="600px"
            width="100%"
          />
        </div>
      </aside>
      <aside class="gutter-ads gutter-ads-right" aria-label="advertisement">
        <div class="gutter-ads-sticky">
          <AdSlot
            slot={props.rightSlot}
            format="vertical"
            minHeight="600px"
            width="100%"
          />
        </div>
      </aside>
    </>
  );
}
