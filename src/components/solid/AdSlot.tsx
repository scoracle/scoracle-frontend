import { Show, onMount } from "solid-js";
import { isServer } from "solid-js/web";
import "./AdSlot.css";

// AdSense publisher ID — set via env so future site rolls (sandbox,
// fantasy, etc.) can run with their own pub IDs if we ever pursue
// separate AdSense accounts. Falls back to the scoracle.com pub ID.
const PUBLISHER_ID =
  import.meta.env.PUBLIC_ADSENSE_PUBLISHER_ID ?? "ca-pub-9821466912189944";

declare global {
  interface Window {
    adsbygoogle?: unknown[];
  }
}

export interface AdSlotProps {
  /**
   * AdSense ad-slot ID (data-ad-slot). When undefined, the slot renders
   * as reserved-space only — no <ins> tag, no push. This is the
   * pre-approval state: layout is locked in for zero CLS at activation
   * time, but no ad code is in the DOM until a real slot ID is wired.
   */
  slot?: string;
  /** AdSense ad-format. "auto" | "vertical" | "horizontal" | "rectangle". */
  format?: string;
  /** Reserved min-height to prevent CLS at ad-load time. */
  minHeight?: string;
  /** Reserved width. */
  width?: string;
  /** Whether to enable AdSense's full-width-responsive behavior. */
  responsive?: boolean;
  /** Extra class on the outer container. */
  class?: string;
}

export default function AdSlot(props: AdSlotProps) {
  onMount(() => {
    if (isServer) return;
    if (!props.slot) return;
    try {
      (window.adsbygoogle = window.adsbygoogle ?? []).push({});
    } catch (e) {
      // AdSense loader may not be loaded yet (e.g. blocked by an ad blocker
      // or a slow network). Failing silently is the right behavior — the
      // reserved space stays, the user sees an empty gutter.
      // eslint-disable-next-line no-console
      console.warn("[AdSlot] adsbygoogle.push failed", e);
    }
  });

  return (
    <div
      class={`ad-slot ${props.class ?? ""}`}
      style={{
        "min-height": props.minHeight ?? "600px",
        width: props.width ?? "100%",
      }}
      aria-hidden={props.slot ? undefined : "true"}
    >
      <Show when={props.slot}>
        <ins
          class="adsbygoogle"
          style="display:block;width:100%;height:100%"
          data-ad-client={PUBLISHER_ID}
          data-ad-slot={props.slot}
          data-ad-format={props.format ?? "auto"}
          data-full-width-responsive={props.responsive ? "true" : "false"}
        />
      </Show>
    </div>
  );
}
