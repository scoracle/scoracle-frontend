import { describe, expect, it } from "vitest";
import { searchEntities } from "./entity-search";
import type { AutocompleteEntity } from "../types";

const entities: AutocompleteEntity[] = [
  {
    id: "1",
    name: "Estêvão Willian",
    type: "player",
    team: "Chelsea",
    _searchIndex: "estevao willian|chelsea",
  },
  {
    id: "2",
    name: "Detroit Pistons",
    type: "team",
    _searchIndex: "detroit pistons|det|pistons",
  },
];

describe("searchEntities", () => {
  it("matches diacritic-folded name tokens", () => {
    expect(searchEntities(entities, "este wil", { limit: 5 }).map((e) => e.id)).toEqual(["1"]);
  });

  it("can restrict player search to name-only metadata", () => {
    const result = searchEntities(entities, "chelsea", {
      limit: 5,
      mode: (entity) => entity.type === "team" ? "full" : "name",
    });
    expect(result).toEqual([]);
  });

  it("uses full search indexes for teams", () => {
    expect(searchEntities(entities, "det", { limit: 5 }).map((e) => e.id)).toEqual(["2"]);
  });
});
