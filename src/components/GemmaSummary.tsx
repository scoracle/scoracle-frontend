import { For, Show, createMemo } from "solid-js";
import "./GemmaSummary.css";
const SENTENCE_BREAK = /(?<=[.!?…][")’”\]]?)\s+(?=[A-Z0-9"(‘“[])/;
const MAX_SENTENCES = 3;
export function proseParagraphs(text: string): string[] {
    const explicit = text
        .split(/\n{2,}|\r\n{2,}|\n/)
        .map((p) => p.trim())
        .filter(Boolean);
    if (explicit.length > 1)
        return explicit;
    const sentences = (explicit[0] ?? text.trim()).split(SENTENCE_BREAK).filter(Boolean);
    if (sentences.length <= MAX_SENTENCES)
        return [sentences.join(" ")].filter(Boolean);
    const paragraphCount = Math.ceil(sentences.length / MAX_SENTENCES);
    const base = Math.floor(sentences.length / paragraphCount);
    let extra = sentences.length % paragraphCount;
    const out: string[] = [];
    let i = 0;
    for (let p = 0; p < paragraphCount; p++) {
        const take = base + (extra > 0 ? 1 : 0);
        if (extra > 0)
            extra--;
        out.push(sentences.slice(i, i + take).join(" "));
        i += take;
    }
    return out;
}
export default function GemmaSummary(props: {
    text: string;
    source?: string | null;
    class?: string;
}) {
    // Memoized: proseParagraphs walks the whole string, and this was a plain
    // closure re-run on every read — twice per render (the <For> each, and
    // last() inside each row's <Show>).
    const paragraphs = createMemo(() => proseParagraphs(props.text));
    const last = () => paragraphs().length - 1;
    return (<div class={`gemma-summary-block ${props.class ?? ""}`}>
      <For each={paragraphs()}>
        {(p, i) => (<p class="gemma-summary">
            {p}
            <Show when={props.source && i() === last()}>
              {(_s) => <span class="gemma-summary-source"> — {props.source}</span>}
            </Show>
          </p>)}
      </For>
    </div>);
}
