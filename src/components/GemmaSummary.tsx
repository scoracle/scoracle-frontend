import { For, Show, createMemo } from "solid-js";
import "./GemmaSummary.css";

const MAX_PARAGRAPHS = 5;
const sentences = new Intl.Segmenter("en", { granularity: "sentence" });

export function proseParagraphs(text: string, headline?: string | null): string[] {
    const blocks = text.split(/\r?\n/).map(block => block.trim()).filter(Boolean);
    const last = blocks.at(-1)?.replace(/^\*\*|\*\*$/g, "");
    if (blocks.length > 1 && headline && last === headline.trim()) blocks.pop();

    return blocks.flatMap(block => {
        const parts = Array.from(sentences.segment(block), item => item.segment.trim());
        if (parts.length <= 4) return [block];
        const count = Math.ceil(parts.length / (parts.length > MAX_PARAGRAPHS * 3 ? 4 : 3));
        const paragraphs: string[] = [];
        let start = 0;
        for (let i = 0; i < count; i++) {
            const size = Math.ceil((parts.length - start) / (count - i));
            paragraphs.push(parts.slice(start, start + size).join(" "));
            start += size;
        }
        return paragraphs;
    });
}

export default function GemmaSummary(props: {
    text: string;
    headline?: string | null;
    source?: string | null;
    class?: string;
}) {
    const paragraphs = createMemo(() => proseParagraphs(props.text, props.headline));
    const renderParagraph = (body: string, index: number) => (
        <p class="gemma-summary">
            {body}
            <Show when={props.source && index === paragraphs().length - 1}>
                <span class="gemma-summary-source"> — {props.source}</span>
            </Show>
        </p>
    );
    return (<div class={`gemma-summary-block ${props.class ?? ""}`}>
        <For each={paragraphs().slice(0, MAX_PARAGRAPHS)}>
            {(body, i) => renderParagraph(body, i())}
        </For>
        <Show when={paragraphs().length > MAX_PARAGRAPHS}>
            <details class="gemma-summary-more">
                <summary>Read more</summary>
                <For each={paragraphs().slice(MAX_PARAGRAPHS)}>
                    {(body, i) => renderParagraph(body, MAX_PARAGRAPHS + i())}
                </For>
            </details>
        </Show>
    </div>);
}
