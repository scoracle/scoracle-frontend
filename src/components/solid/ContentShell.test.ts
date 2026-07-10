import { describe, it, expect } from "vitest";
import { readFileSync } from "node:fs";
import { fileURLToPath } from "node:url";
import { dirname, join } from "node:path";

const here = dirname(fileURLToPath(import.meta.url));
const source = () => readFileSync(join(here, "ContentShell.tsx"), "utf8");

function showBlock(src: string, guard: string): string {
  const match = src.match(new RegExp(`<Show when=\\{${guard}\\(\\)\\}>[\\s\\S]*?</Show>`));
  expect(match, `${guard} block not found`).toBeTruthy();
  return match?.[0] ?? "";
}

describe("ContentShell scope controls", () => {
  it("keeps News scopes as dropdown Select controls, not item rails", () => {
    const src = source();
    const newsFacet = showBlock(src, "showNewsFacet");
    const newsScope = showBlock(src, "showNewsScope");

    expect(newsFacet).toContain("<Select");
    expect(newsScope).toContain("<Select");
    expect(newsFacet).not.toContain("<NavRail");
    expect(newsScope).not.toContain("<NavRail");
  });
});

describe("ContentShell pane mounting", () => {
  it("renders all visible panes without a post-hydration mount gate", () => {
    const src = source();

    expect(src).toContain("<For each={visibleTabs()}>");
    expect(src).not.toContain("mountAllPanes");
    expect(src).not.toContain("onMount(() => setMountAllPanes");
  });
});
