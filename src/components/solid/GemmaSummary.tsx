/**
 * GemmaSummary — the grounded Gemma prose, shown IN FULL at readable size. The
 * AI writing is the product's wow, so it gets every sentence (no teaser/clamp)
 * with comfortable typography.
 *
 * Paragraph-aware since the weekly format (Scott, 2026-09-05): "easy to read
 * paragraphs… 2-3 sentences per paragraph tops. No run on text blocks." When
 * the text carries its own paragraph breaks (the prompt-structured output),
 * they are respected verbatim; a single unbroken block is split into
 * paragraphs of at most three sentences here, so legacy generations read
 * cleanly without regeneration. Optionally trails the cited source (NYT,
 * ESPN, …) at the END of the final paragraph. Shared by every card body, the
 * week archive, and the /leaderboard boards so prose reads identically
 * everywhere.
 */
import { For, Show } from "solid-js";
import "./GemmaSummary.css";

/** Sentence boundary: terminal punctuation, optional close-quote, whitespace,
 *  then an upper/quote/paren opener. Imperfect on abbreviations, which costs a
 *  short paragraph at worst — never lost text (split, not filtered). */
const SENTENCE_BREAK = /(?<=[.!?…][")’”\]]?)\s+(?=[A-Z0-9"(‘“[])/;

const MAX_SENTENCES = 3;

/** Split prose into display paragraphs: explicit breaks win; otherwise group
 *  sentences ≤3 per paragraph, balancing the tail so no paragraph strands a
 *  lone sentence after a full one (4 → 2+2, 7 → 3+2+2). */
export function proseParagraphs(text: string): string[] {
  const explicit = text
    .split(/\n{2,}|\r\n{2,}|\n/)
    .map((p) => p.trim())
    .filter(Boolean);
  if (explicit.length > 1) return explicit;

  const sentences = (explicit[0] ?? text.trim()).split(SENTENCE_BREAK).filter(Boolean);
  if (sentences.length <= MAX_SENTENCES) return [sentences.join(" ")].filter(Boolean);

  const paragraphCount = Math.ceil(sentences.length / MAX_SENTENCES);
  const base = Math.floor(sentences.length / paragraphCount);
  let extra = sentences.length % paragraphCount;
  const out: string[] = [];
  let i = 0;
  for (let p = 0; p < paragraphCount; p++) {
    const take = base + (extra > 0 ? 1 : 0);
    if (extra > 0) extra--;
    out.push(sentences.slice(i, i + take).join(" "));
    i += take;
  }
  return out;
}

export default function GemmaSummary(props: { text: string; source?: string | null; class?: string }) {
  const paragraphs = () => proseParagraphs(props.text);
  const last = () => paragraphs().length - 1;
  return (
    <div class={`gemma-summary-block${props.class ? ` ${props.class}` : ""}`}>
      <For each={paragraphs()}>
        {(p, i) => (
          <p class="gemma-summary">
            {p}
            <Show when={props.source && i() === last()}>
              {(_s) => <span class="gemma-summary-source"> — {props.source}</span>}
            </Show>
          </p>
        )}
      </For>
    </div>
  );
}
