import { describe, expect, it } from "vitest";
import { render } from "../../tests/render";
import GemmaSummary, { proseParagraphs } from "./GemmaSummary";

describe("card paragraph layout", () => {
    it("fits twenty sentences into five readable paragraphs", () => {
        const sentences = Array.from({ length: 20 }, (_, i) => `Observation ${i + 1}.`);
        const paragraphs = proseParagraphs(sentences.join(" "));
        expect(paragraphs).toHaveLength(5);
        expect(paragraphs.join(" ")).toBe(sentences.join(" "));
        expect(paragraphs.every(p => p.split("Observation").length === 5)).toBe(true);
    });

    it("preserves explicit paragraphs and drops a repeated trailing headline", () => {
        expect(proseParagraphs("First point.\n\nSecond point.\n\n**The verdict**", "The verdict"))
            .toEqual(["First point.", "Second point."]);
    });

    it("keeps overflow accessible after the five visible paragraphs", () => {
        const text = Array.from({ length: 6 }, (_, i) => `Point ${i + 1}.`).join("\n\n");
        const { container } = render(() => <GemmaSummary text={text} />);
        expect(container.querySelectorAll(".gemma-summary-block > p")).toHaveLength(5);
        expect(container.querySelector("details")?.open).toBe(false);
        expect(container.querySelector("details p")?.textContent?.trim()).toBe("Point 6.");
    });
});
