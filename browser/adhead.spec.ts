import { test, expect } from "@playwright/test";
// Count ONLY our loader. Once adsbygoogle.js executes it pulls its own
// /pagead/managed/js/adsense/... child script, so two googlesyndication tags in
// the head is the healthy steady state, not a duplicate.
const LOADER = 'script[src*="pagead/js/adsbygoogle.js"]';

test("useHead injects the AdSense loader exactly once, hydration intact", async ({ page }) => {
  const errs: string[] = [];
  page.on("pageerror", e => errs.push(e.message));
  await page.goto("/", { waitUntil: "networkidle" });
  await page.waitForTimeout(2500);
  const tags = await page.evaluate((sel) =>
    [...document.querySelectorAll(sel)].map(s => ({
      async: s.async, co: s.getAttribute("crossorigin"), parent: s.parentElement?.tagName,
    })), LOADER);
  console.log("  our loaders:", tags.length, JSON.stringify(tags));
  expect(tags.length, "exactly one AdSense loader").toBe(1);
  expect(tags[0].async).toBe(true);
  expect(tags[0].co).toBe("anonymous");
  expect(tags[0].parent).toBe("HEAD");

  // The failure mode the original comment guarded: a head mutation mid-hydration
  // kills every delegated handler. Prove handlers are live.
  await page.locator(".app-tray-toggle-row, .app-tray-toggle").first().click();
  await expect(page.locator(".app-tray-icon").first()).toBeVisible();
  expect(errs, "no uncaught JS").toEqual([]);
});

test("the loader does not accumulate across client-side navigation", async ({ page }) => {
  await page.goto("/", { waitUntil: "networkidle" });
  await page.waitForTimeout(1200);
  await page.locator(".search-bar input").first().fill("lebron");
  await page.waitForTimeout(1200);
  const n = await page.evaluate((sel) => document.querySelectorAll(sel).length, LOADER);
  console.log("  our loaders after client activity:", n);
  expect(n, "still exactly one").toBe(1);
});
