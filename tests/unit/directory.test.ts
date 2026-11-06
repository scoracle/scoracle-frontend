import { expect, it } from "vitest";
import { normalizeDirectory } from "../../scripts/normalize-directory.mjs";

it("does not confuse world-person IDs with sport-player IDs", () => {
    const player = { id: "237", sport: "nba", type: "player", name: "LeBron James" };
    expect(normalizeDirectory([
        { id: "237", sport: "nba", type: "person", name: "Mark Pope" }, player,
        { id: "237", sport: "football", type: "player", name: "Pablo Zabaleta" },
    ])).toEqual([player, { id: "237", sport: "football", type: "player", name: "Pablo Zabaleta" }]);
});

it("deduplicates only matching identities, retains aliases, and omits blank names", () => {
    expect(normalizeDirectory([
        { id: "1", sport: "nba", type: "team", name: "Team", aliases: ["first"] },
        { id: "1", sport: "nba", type: "team", name: "Team", aliases: ["second"] },
        { id: "2", sport: "nba", type: "player", name: "" },
    ])).toEqual([{ id: "1", sport: "nba", type: "team", name: "Team", aliases: ["first", "second"] }]);
});
