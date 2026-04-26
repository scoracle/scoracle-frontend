import { describe, it, expect } from "vitest";
import {
  normalizeText,
  entityMatchesText,
  findCoMentions,
  type Entity,
  type Article,
} from "./co-mentions";

describe("normalizeText", () => {
  it("strips diacritics", () => {
    expect(normalizeText("José María")).toBe("jose maria");
    expect(normalizeText("Estêvão")).toBe("estevao");
  });

  it("removes punctuation but keeps alphanumerics + spaces", () => {
    expect(normalizeText("LeBron's 30-pt night!")).toBe("lebron s 30 pt night");
  });

  it("collapses multiple spaces", () => {
    expect(normalizeText("Patrick   Mahomes")).toBe("patrick mahomes");
  });

  it("returns empty string on empty/falsy input", () => {
    expect(normalizeText("")).toBe("");
  });
});

describe("entityMatchesText", () => {
  it("requires 2-token match for multi-word names", () => {
    expect(entityMatchesText("Patrick Mahomes", "Patrick Mahomes threw a TD")).toBe(true);
    // Only one token matches → false
    expect(entityMatchesText("Patrick Mahomes", "Patrick threw a TD")).toBe(false);
  });

  it("requires exact word match for single-word names (4+ chars)", () => {
    expect(entityMatchesText("Cowboys", "The Cowboys won")).toBe(true);
    // Substring inside another word doesn't count.
    expect(entityMatchesText("Cowboys", "cowboyshat")).toBe(false);
  });

  it("rejects single-word names shorter than 4 chars", () => {
    // 'Cle' could match too many things — reject by length floor.
    expect(entityMatchesText("Cle", "Cle wins")).toBe(false);
  });

  it("ignores common name suffixes (Jr, Sr, II, etc.)", () => {
    // "Patrick Mahomes Jr" tokenizes to [patrick, mahomes]; same match path.
    expect(entityMatchesText("Patrick Mahomes Jr", "Mahomes and Patrick connect")).toBe(true);
  });

  it("is diacritic-insensitive", () => {
    expect(entityMatchesText("Estêvão Willian", "estevao willian shines")).toBe(true);
  });

  it("returns false for empty entity name", () => {
    expect(entityMatchesText("", "any text here")).toBe(false);
  });
});

describe("findCoMentions", () => {
  const entities: Entity[] = [
    { id: "1", name: "Patrick Mahomes", type: "player", team: "Chiefs" },
    { id: "2", name: "Travis Kelce", type: "player", team: "Chiefs" },
    { id: "3", name: "Tyreek Hill", type: "player", team: "Dolphins" },
    { id: "4", name: "Chiefs", type: "team" },
    { id: "5", name: "Dolphins", type: "team" },
  ];

  it("excludes the searched entity from results", () => {
    const articles: Article[] = [
      { title: "Patrick Mahomes and Travis Kelce connect for a TD" },
    ];
    const result = findCoMentions(articles, entities, "1", "player");
    const ids = result.map(r => r.entity.id);
    expect(ids).not.toContain("1");
    expect(ids).toContain("2");
  });

  it("counts mentions across multiple articles", () => {
    const articles: Article[] = [
      { title: "Patrick Mahomes and Travis Kelce connect" },
      { title: "Travis Kelce dominates the second half" },
    ];
    const result = findCoMentions(articles, entities, "1", "player");
    const kelce = result.find(r => r.entity.id === "2");
    expect(kelce?.mentionCount).toBe(2);
  });

  it("returns results sorted by mention count (desc)", () => {
    const articles: Article[] = [
      { title: "Travis Kelce big day" },
      { title: "Travis Kelce again" },
      { title: "Tyreek Hill scores" },
    ];
    const result = findCoMentions(articles, entities, "1", "player");
    // Kelce mentioned twice should appear before Hill (once)
    expect(result[0].entity.id).toBe("2");
  });

  it("ignores articles with empty or missing titles", () => {
    const articles: Article[] = [{ title: "" }];
    const result = findCoMentions(articles, entities, "1", "player");
    expect(result).toEqual([]);
  });
});
