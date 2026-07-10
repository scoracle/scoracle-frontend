import { describe, it, expect } from "vitest";
import { readFileSync } from "node:fs";
import { fileURLToPath } from "node:url";
import { dirname, join } from "node:path";

const here = dirname(fileURLToPath(import.meta.url));
const source = () => readFileSync(join(here, "ContentShell.tsx"), "utf8");

describe("ContentShell scope controls", () => {
  it("keeps News scope as a dropdown Select control, not an item rail", () => {
    const src = source();
    const match = src.match(/<Show when=\{showNewsScope\(\)\}>[\s\S]*?<\/Show>/);
    expect(match, "showNewsScope block not found").toBeTruthy();
    const newsScope = match?.[0] ?? "";

    expect(newsScope).toContain("<Select");
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

  it("keeps each pane failure local to its pane", () => {
    const src = source();

    expect(src).toContain("ErrorBoundary fallback={(err, reset) => <PaneError");
    expect(src).toContain("function PaneError");
    expect(src).toContain("role=\"alert\"");
  });
});
