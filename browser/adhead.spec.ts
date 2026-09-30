import { test, expect } from "@playwright/test";
// Count ONLY our loader. Once adsbygoogle.js executes it pulls its own
// /pagead/managed/js/adsense/... child script, so two googlesyndication tags in
// the head is the healthy steady state, not a duplicate.
const LOADER = 'script[src*="pagead/js/adsbygoogle.js"]';
const INERT = 'script[data-adsense-loader]';

test("the AdSense loader is in the server HTML, so crawlers can see it", async ({ page }) => {
  // The ownership check Google runs reads the HTML. A crawler executes no JS, so
  // a client-injected loader is invisible to it — which is how the tag ended up
  // absent from production entirely (2026-09-19..2026-09-29).
  await page.route('https://**.googlesyndication.com/**', r => r.abort());
  const response = await page.goto("/", { waitUntil: "domcontentloaded" });
  const html = await response!.text();
  expect(html, "loader tag must be in the served HTML").toContain("pagead/js/adsbygoogle.js");
  expect(html).toContain("ca-pub-9821466912189944");
});

test("the server tag ships inert, then loads once after hydration", async ({ page }) => {
  const errs: string[] = [];
  page.on("pageerror", e => errs.push(e.message));
  await page.route('https://**.googlesyndication.com/**', r => r.abort());
  // Before hydration finishes the tag must NOT be executable, or a third-party
  // script can mutate <head> while the compiled template walks it positionally.
  const early = await page.goto("/", { waitUntil: "commit" }).then(async (r) => {
    const html = await r!.text();
    return /<script[^>]*data-adsense-loader[^>]*type="text\/plain"/.test(html);
  });
  expect(early, "server tag must ship inert").toBe(true);

  await page.waitForLoadState("networkidle");
  await page.waitForTimeout(2500);
  const tags = await page.evaluate((sel) =>
    [...document.querySelectorAll(sel)].map(s => ({
      async: s.async, co: s.getAttribute("crossorigin"), parent: s.parentElement?.tagName,
      type: s.type,
    })), LOADER);
  console.log("  our loaders:", tags.length, JSON.stringify(tags));
  expect(tags.length, "exactly one AdSense loader").toBe(1);
  expect(tags[0].async).toBe(true);
  expect(tags[0].co).toBe("anonymous");
  expect(tags[0].parent).toBe("HEAD");
  // Armed: the inert tag was flipped to an executable one, and not left behind
  // as a second copy.
  expect(tags[0].type, "loader must be armed after hydration").toBe("text/javascript");
  expect(await page.locator(INERT).count(), "one tag total, not a duplicate").toBe(1);

  // The failure mode the original comment guarded: a head mutation mid-hydration
  // kills every delegated handler. Prove handlers are live.
  await page.locator(".app-tray-toggle-row, .app-tray-toggle").first().click();
  await expect(page.locator(".app-tray-icon").first()).toBeVisible();
  expect(errs, "no uncaught JS").toEqual([]);
});

test("the loader does not accumulate across client-side navigation", async ({ page }) => {
  await page.route('https://**.googlesyndication.com/**', r => r.abort());
  await page.goto("/", { waitUntil: "networkidle" });
  await page.waitForTimeout(1200);
  await page.locator(".search-bar input").first().fill("lebron");
  await page.waitForTimeout(1200);
  const n = await page.evaluate((sel) => document.querySelectorAll(sel).length, LOADER);
  console.log("  our loaders after client activity:", n);
  expect(n, "still exactly one").toBe(1);
});
