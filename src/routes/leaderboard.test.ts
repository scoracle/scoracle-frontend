import { describe, it, expect } from "vitest";
import { readFileSync } from "node:fs";
import { fileURLToPath } from "node:url";
import { dirname, join } from "node:path";

const here = dirname(fileURLToPath(import.meta.url));
const source = () => readFileSync(join(here, "leaderboard.tsx"), "utf8");

function showBlock(src: string, guard: string): string {
  const match = src.match(new RegExp(`<Show when=\\{${guard}\\(\\)\\}>[\\s\\S]*?</Show>`));
  expect(match, `${guard} block not found`).toBeTruthy();
  return match?.[0] ?? "";
}

describe("leaderboard controls", () => {
  it("keeps News and Transfers time scopes as a dropdown Select, not an item rail", () => {
    const newsScope = showBlock(source(), "showNewsScopeToggle");

    expect(newsScope).toContain("<Select");
    expect(newsScope).not.toContain("<NavRail");
  });

  it("requests trending leaderboards with metric before entity type", () => {
    expect(source()).toContain("getTrendingLeaderboard(s, metric(), et, LIMIT)");
    expect(source()).not.toContain("getTrendingLeaderboard(s, et, metric(), LIMIT)");
  });
});
