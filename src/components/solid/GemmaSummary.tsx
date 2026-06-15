/**
 * GemmaSummary — the grounded Gemma blurb, shown IN FULL at readable size. The AI
 * summary is the product's wow, so it gets the whole sentence (no teaser/clamp)
 * with comfortable typography. Optionally trails the cited source (NYT, ESPN, …)
 * at the END of the blurb. Shared by the profile Transfers card and the
 * /leaderboard Transfers board so it reads identically everywhere.
 */
import { Show } from "solid-js";
import "./GemmaSummary.css";

export default function GemmaSummary(props: { text: string; source?: string | null; class?: string }) {
  return (
    <p class={`gemma-summary${props.class ? ` ${props.class}` : ""}`}>
      {props.text}
      <Show when={props.source}>
        {(s) => <span class="gemma-summary-source"> — {s()}</span>}
      </Show>
    </p>
  );
}
