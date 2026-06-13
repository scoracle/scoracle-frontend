/**
 * GemmaSummary — the grounded Gemma blurb, shown IN FULL at readable size. The AI
 * summary is the product's wow, so it gets the whole sentence (no teaser/clamp)
 * with comfortable typography. Shared by the profile Transfers/Suitors cards and
 * the /leaderboard Transfers board so it reads identically everywhere.
 */
import "./GemmaSummary.css";

export default function GemmaSummary(props: { text: string; class?: string }) {
  return <p class={`gemma-summary${props.class ? ` ${props.class}` : ""}`}>{props.text}</p>;
}
