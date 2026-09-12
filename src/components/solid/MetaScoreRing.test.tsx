import { createSignal } from "solid-js";
import { render } from "@solidjs/testing-library";
import { describe, expect, it } from "vitest";
import MetaScoreRing from "./MetaScoreRing";
import type { MetaScores } from "../../lib/cards/meta-score-layout";

describe("MetaScoreRing", () => {
  it("reflows on arrivals and removals, retaining zero and rendering no connectors", () => {
    const [scores, setScores] = createSignal<MetaScores>({ scouting: 56, vibe: 0, sigil: null });
    const { container } = render(() => <MetaScoreRing scores={scores()} sport="NBA" type="player" />);
    const slots = () => [...container.querySelectorAll<HTMLElement>(".pw-ring-slot")];
    expect(slots().map(s => s.dataset.deck)).toEqual(["scouting", "vibe"]);
    expect(slots()[1].querySelector(".pw-ring-value")?.textContent.trim()).toBe("0");
    expect(slots()[1].style.top).toBe("85%");
    setScores({ scouting: 56, vibe: 0, sigil: 55 });
    expect(slots()).toHaveLength(3);
    expect(slots()[1].style.top).not.toBe("85%");
    setScores({ scouting: null, vibe: 0, sigil: 55 });
    expect(slots()[0].dataset.deck).toBe("vibe");
    expect(slots()[0].style.top).toBe("15%");
    expect(container.querySelector("svg")).toBeNull();
    expect(container.textContent).not.toContain("—");
    setScores({});
    expect(slots()).toHaveLength(0);
  });
  it("keeps the sport-aware Transfers/Trades label", () => {
    const [sport, setSport] = createSignal("NBA");
    const { container } = render(() => <MetaScoreRing scores={{ transfers: 1 }} sport={sport()} type="team" />);
    expect(container.querySelector(".pw-ring-label")?.textContent.trim()).toBe("Trades");
    setSport("football");
    expect(container.querySelector(".pw-ring-label")?.textContent.trim()).toBe("Transfers");
  });
});
