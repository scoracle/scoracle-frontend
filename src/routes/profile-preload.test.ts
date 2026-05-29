/**
 * Profile tab-registry completeness guard.
 *
 * PROFILE_TABS (components/solid/profile-tabs.tsx) is the single source of
 * truth for the profile page's tabs: each entry co-locates the Card, its
 * skeleton, and the preload that warms the exact query the Card reads. Because
 * the preload lives in the same object as the Card, the old drift class —
 * firePreloads warming a query no Card consumes — can't recur: you can't add a
 * pane without its preload.
 *
 * The one thing TypeScript still can't enforce is that the registry is
 * EXHAUSTIVE over the ProfileTab union (arrays aren't checked for union
 * coverage). So this test catches the "added a tab to the union + nav but
 * forgot its PROFILE_TABS entry" mistake — which would leave that tab with no
 * pane and no preload.
 *
 * Source-inspection rather than import: the registry is a .tsx that pulls in
 * Card components + "use server" queries, and this vitest config deliberately
 * runs without the Solid/SolidStart plugins (pure data-utility tests). So we
 * compare the two declarations as text, which is enough for a coverage check.
 */
import { describe, it, expect } from "vitest";
import { readFileSync } from "node:fs";
import { fileURLToPath } from "node:url";
import { dirname, join } from "node:path";

const here = dirname(fileURLToPath(import.meta.url));
const read = (rel: string) => readFileSync(join(here, rel), "utf8");

/** Tab ids declared in the `export type ProfileTab` union. */
function unionTabs(): string[] {
  const src = read("../contexts/profile.ts");
  const start = src.indexOf("export type ProfileTab");
  expect(start, "ProfileTab union not found").toBeGreaterThan(-1);
  const block = src.slice(start, src.indexOf(";", start));
  return [...block.matchAll(/"([a-z]+)"/g)].map((m) => m[1]).sort();
}

/** Tab ids declared as `id: "..."` entries in PROFILE_TABS. */
function registryTabs(): string[] {
  const src = read("../components/solid/profile-tabs.tsx");
  return [...src.matchAll(/\bid:\s*"([a-z]+)"/g)].map((m) => m[1]).sort();
}

describe("profile tab registry", () => {
  it("has exactly one entry per ProfileTab (no missing, no duplicates)", () => {
    const union = unionTabs();
    const registry = registryTabs();
    expect(union.length).toBeGreaterThan(0);
    // No duplicate ids in the registry.
    expect(new Set(registry).size).toBe(registry.length);
    // Registry covers the union exactly.
    expect(registry).toEqual(union);
  });
});
