import { describe, it, expect } from "vitest";
import { readFileSync } from "node:fs";
import { fileURLToPath } from "node:url";
import { dirname, join } from "node:path";

const here = dirname(fileURLToPath(import.meta.url));
const source = () => readFileSync(join(here, "leaderboard.tsx"), "utf8");

describe("leaderboard route", () => {
  it("keeps board fetch failures local to the leaderboard shell", () => {
    const src = source();

    expect(src).toContain("ErrorBoundary fallback={(err, reset) => <LeaderboardErrorFace");
    expect(src).toContain("function LeaderboardErrorFace");
    expect(src).toContain("role=\"alert\"");
  });
});
