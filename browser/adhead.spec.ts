import { test, expect } from "@playwright/test";

test("pages hydrate without loading advertising scripts", async ({ page }) => {
  const requests: string[] = [];
  const errors: string[] = [];
  page.on("request", r => { if (/googlesyndication|doubleclick|adtrafficquality/.test(r.url())) requests.push(r.url()); });
  page.on("pageerror", e => errors.push(e.message));
  const response = await page.goto("/", { waitUntil: "networkidle" });
  expect(await response!.text()).not.toContain("adsbygoogle");
  await page.locator(".search-bar input").fill("lebron");
  await expect(page.locator(".search-suggestion-item").first()).toBeVisible();
  expect(requests).toEqual([]);
  expect(errors).toEqual([]);
});
