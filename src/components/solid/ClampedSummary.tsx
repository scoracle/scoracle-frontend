/**
 * ClampedSummary — a Gemma blurb that BREATHES. The grounded one-liner is the
 * product's wow, so it renders by default at readable size (not hidden behind a
 * tap), clamped to two lines, with a "more"/"less" toggle that appears only when
 * the text actually overflows. Shared by the profile Transfers card and the
 * /leaderboard Transfers board so the AI summary reads identically on both.
 */
import { Show, createSignal, onMount } from "solid-js";
import "./ClampedSummary.css";

export default function ClampedSummary(props: { text: string; class?: string }) {
  const [open, setOpen] = createSignal(false);
  const [overflow, setOverflow] = createSignal(false);
  let ref: HTMLParagraphElement | undefined;

  // Measure once mounted (client-only — scrollHeight needs layout). The 2-line
  // clamp is pure CSS, so the text truncates during SSR too; only the toggle
  // waits for this measurement, so there is no hydration mismatch.
  onMount(() => {
    if (ref) setOverflow(ref.scrollHeight > ref.clientHeight + 1);
  });

  return (
    <div class={`clamped-summary${props.class ? ` ${props.class}` : ""}`}>
      <p ref={ref} class="clamped-summary-text" classList={{ open: open() }}>
        {props.text}
      </p>
      <Show when={overflow() || open()}>
        <button
          type="button"
          class="clamped-summary-toggle"
          aria-expanded={open()}
          onClick={(e) => {
            e.preventDefault();
            e.stopPropagation();
            setOpen((v) => !v);
          }}
        >
          {open() ? "less" : "more"}
        </button>
      </Show>
    </div>
  );
}
