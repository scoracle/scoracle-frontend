import { test, expect } from "@playwright/test";

// registerDismissal (src/lib/utils/dismissal.ts) is shared by <Disclosure> and
// the AppTray's settings menu. The AppTray had NO browser coverage at all, so
// this is the only thing standing behind that refactor.
test("Disclosure-driven Select dismisses on outside press and Escape", async ({ page }) => {
  await page.goto("/leaderboard?sport=NBA", { waitUntil: "networkidle" });
  const trigger = page.getByRole("button", { name: "Players or teams", exact: true });
  await trigger.click();
  await expect(page.locator(".select-dropdown")).toBeVisible();
  await page.mouse.click(700, 900);
  await expect(page.locator(".select-dropdown")).toHaveCount(0);
  await trigger.click();
  await expect(page.locator(".select-dropdown")).toBeVisible();
  await page.keyboard.press("Escape");
  await expect(page.locator(".select-dropdown")).toHaveCount(0);
});

test("AppTray settings menu opens, dismisses outside, and on Escape", async ({ page }) => {
  await page.goto("/", { waitUntil: "networkidle" });
  // Expand the tray so the foot (and its Settings gear) is present.
  const expand = page.locator(".app-tray-toggle-row");
  if (await expand.count()) await expand.first().click();
  const gear = page.getByRole("button", { name: "Settings" });
  await expect(gear).toBeVisible();

  await gear.click();
  await expect(page.locator(".app-tray-settings-menu")).toBeVisible();
  // Outside press closes it. Bottom-centre: the top-left is the brand link.
  await page.mouse.click(700, 900);
  await expect(page.locator(".app-tray-settings-menu")).toHaveCount(0);

  await gear.click();
  await expect(page.locator(".app-tray-settings-menu")).toBeVisible();
  await page.keyboard.press("Escape");
  await expect(page.locator(".app-tray-settings-menu")).toHaveCount(0);

  // And the theme rows still render with their own anchored icons.
  await gear.click();
  const icons = await page.locator(".app-tray-theme-option .app-tray-icon svg").evaluateAll(
    e => e.map(x => x.innerHTML));
  expect(new Set(icons).size, "three distinct theme icons").toBe(3);
});
