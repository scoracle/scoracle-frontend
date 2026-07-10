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

  it("renders Momentum and Sigil as visible product boards", () => {
    expect(source()).toContain('{ id: "momentum", label: "Momentum" }');
    expect(source()).toContain('{ id: "sigil", label: "Sigil" }');
    expect(source()).not.toContain('label: "Trending"');
  });

  it("does not render the retired leaderboard-local SearchControl", () => {
    expect(source()).not.toContain("SearchControl");
  });

  it("requests momentum leaderboards with metric before entity type", () => {
    expect(source()).toContain("getTrendingLeaderboard(s, metric(), et, LIMIT");
    expect(source()).not.toContain("getTrendingLeaderboard(s, et, metric(), LIMIT)");
  });

  it("maps URL cohort controls into leaderboard query params", () => {
    expect(source()).toContain("leagueId: leagueId()");
    expect(source()).toContain("teamId: teamId()");
    expect(source()).toContain("positionGroup: positionGroup()");
    expect(source()).toContain("c.leagueId, c.teamId, null, c.positionGroup, c.conference, c.division");
  });

  it("keeps board fetch failures local to the leaderboard shell", () => {
    const src = source();

    expect(src).toContain("ErrorBoundary fallback={(err, reset) => <LeaderboardErrorFace");
    expect(src).toContain("function LeaderboardErrorFace");
    expect(src).toContain("role=\"alert\"");
  });
});
