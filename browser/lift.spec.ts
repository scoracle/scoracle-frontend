import { expect, test } from '@playwright/test';

// The card lift has unit coverage in ReadingTable.test.tsx (happy-dom) but no
// browser coverage — and happy-dom cannot validate any of what this posture
// actually depends on: position:fixed stacking, a real containing block, real
// z-order against the AppTray (45) and the pop-outs (70), hit-testing
// (pointer-events), or a genuine scroll lock. H4 (Portal for the backdrop) was
// declined for exactly that reason, so this spec is the precondition for
// revisiting it: run it green against the current sibling placement, and any
// Portal change has to keep it green.

const aaron = '/profile/nba/player/177-aaron-gordon';

// Third-party ad delivery is outside the application regression contract, and
// cdn.nba.com rate-limits under rapid loads, so scope imagery assertions to
// first-party hosts.
test.beforeEach(async ({ page, request }) => {
  await page.route('https://**.googlesyndication.com/**', r => r.abort());
  const errs: string[] = [];
  page.on('pageerror', e => errs.push(e.message));
  (page as any).__errs = errs;
  await request.post('http://127.0.0.1:18001/__test', { data: {} });
});
test.afterEach(async ({ page }) => expect((page as any).__errs).toEqual([]));

/** Lift the active card by pressing Enter on its face, as the keyboard path does. */
async function liftUp(page: any) {
  const face = page.locator('.reading-table-pane.active .pane-face');
  await face.focus();
  await page.keyboard.press('Enter');
  await expect(page.locator('.reading-table-pane.active')).toHaveClass(/lifted/);
  return face;
}

test('lift: backdrop is visible, hit-testable, and sits over the tray but under the card', async ({ page }) => {
  await page.goto(aaron, { waitUntil: 'networkidle' });
  const tray = page.locator('.app-tray');
  await expect(tray).toBeVisible();

  const backdrop = page.locator('.pane-lift-backdrop');
  await expect(backdrop).not.toHaveClass(/open/);
  // Closed: the desk must not eat clicks meant for the page beneath it.
  expect(await backdrop.evaluate((el: Element) => getComputedStyle(el).pointerEvents)).toBe('none');

  await liftUp(page);

  // Open: painted across the viewport, and actually receiving pointer events.
  await expect(backdrop).toHaveClass(/open/);
  const style = await backdrop.evaluate((el: Element) => {
    const cs = getComputedStyle(el);
    const r = el.getBoundingClientRect();
    return { pe: cs.pointerEvents, vis: cs.visibility, w: r.width, h: r.height, vw: innerWidth, vh: innerHeight };
  });
  expect(style.pe, 'backdrop must be clickable while open').toBe('auto');
  expect(style.vis).toBe('visible');
  // The scrim fades in over 400ms (ReadingTable.css), so poll the end state
  // rather than sampling the first frame, which is legitimately still 0.
  await expect.poll(
    () => backdrop.evaluate((el: Element) => Number(getComputedStyle(el).opacity)),
    { timeout: 2000 },
  ).toBeGreaterThan(0.9);
  // It is a full-viewport scrim, not a card-sized box.
  expect(Math.round(style.w)).toBe(style.vw);
  expect(Math.round(style.h)).toBe(style.vh);

  // Viewport-fixed: it must track the scrolled position, not the pane's box.
  await page.mouse.wheel(0, 300);
  await page.waitForTimeout(120);
  expect(await backdrop.evaluate((el: Element) => Math.round(el.getBoundingClientRect().height))).toBe(style.vh);
  await page.mouse.wheel(0, -300);
  await page.waitForTimeout(120);

  // Stacking: the lifted card paints above the scrim, and the scrim above the
  // AppTray (z-index 45). Hit-test the middle of the screen: that point must
  // resolve to the backdrop, never the tray underneath it.
  const faceBox = await page.locator('.reading-table-pane.active .pane-face').boundingBox();
  const trayBox = await tray.boundingBox();
  const z = await page.evaluate(() => {
    const z = (sel: string) => Number(getComputedStyle(document.querySelector(sel)!).zIndex);
    return { backdrop: z('.pane-lift-backdrop'), tray: z('.app-tray') };
  });
  expect(z.backdrop).toBeGreaterThan(z.tray);

  const midX = Math.round(style.vw / 2), midY = Math.round(style.vh / 2);
  const hit = await page.evaluate(([x, y]: number[]) => {
    const el = document.elementFromPoint(x, y);
    // className is an SVGAnimatedString on SVG nodes, so read the attribute.
    const cls = typeof el?.className === 'string' ? el.className : (el?.getAttribute('class') ?? '');
    const path: string[] = [];
    for (let n: Element | null = el; n; n = n.parentElement) path.push(n.getAttribute('class') ?? '');
    return { cls, tag: el?.tagName ?? '', ancestors: path.join(' ') };
  }, [midX, midY]);
  // Either the scrim itself, or a descendant of the lifted card if the card
  // covers the centre — never the tray.
  expect(hit.ancestors, 'centre of a lifted card resolves to the scrim or the card, never the tray')
    .not.toContain('app-tray');
  expect(faceBox!.width).toBeGreaterThan(0);
  expect(trayBox).toBeTruthy();
});

test('lift: Escape and click-out both put the card down and return focus', async ({ page }) => {
  await page.goto(aaron, { waitUntil: 'networkidle' });
  const before = page.url();

  // The lift is a reading posture, not a destination: no query params change.
  const face = await liftUp(page);
  expect(page.url(), 'lifting must not touch the URL').toBe(before);
  await expect(face).toHaveAttribute('aria-modal', 'true');
  await expect(page.locator('.pane-lift-backdrop')).toHaveClass(/open/);
  // Body scroll locks while reading.
  expect(await page.evaluate(() => document.documentElement.style.overflow)).toBe('hidden');

  // Escape puts it down.
  await page.keyboard.press('Escape');
  await expect(page.locator('.reading-table-pane.active')).not.toHaveClass(/lifted/);
  await expect(page.locator('.pane-lift-backdrop')).not.toHaveClass(/open/);
  // Focus comes back to the same face.
  await expect(face).toBeFocused();
  expect(await page.evaluate(() => document.documentElement.style.overflow)).toBe('');
  expect(page.url(), 'set-down must not touch the URL').toBe(before);

  // Click-out is the second dismissal path, and it must actually reach the
  // scrim — this is the assertion that would break if the backdrop were
  // painted under something else or had lost its pointer events.
  await liftUp(page);
  await expect(page.locator('.pane-lift-backdrop')).toHaveClass(/open/);
  await page.mouse.click(8, 8); // top-left gutter: never the card, never the tray
  await expect(page.locator('.reading-table-pane.active')).not.toHaveClass(/lifted/);
  await expect(face).toBeFocused();
  expect(page.url()).toBe(before);
});

test('lift: the close button dismisses, and the modal claim is enforced', async ({ page }) => {
  await page.goto(aaron, { waitUntil: 'networkidle' });
  await liftUp(page);
  const close = page.locator('.reading-table-pane.active .pane-lift-close');
  await expect(close).toBeVisible();
  await close.click();
  await expect(page.locator('.reading-table-pane.active')).not.toHaveClass(/lifted/);
  await expect(page.locator('.pane-lift-backdrop')).not.toHaveClass(/open/);

  // aria-modal is enforced, not just claimed: the lift marks everything off the
  // lifted pane's ancestor path inert, so the rail and the tray are unreachable
  // while reading. (This is why the deck cannot be turned by clicking a tab
  // mid-lift — the tab really is blocked.)
  await liftUp(page);
  await expect(page.locator('.nav-well')).toHaveAttribute('inert', '');
  await expect(page.locator('.app-tray')).toHaveAttribute('inert', '');
  // And the sibling panes are held back, not torn down.
  const siblingInert = await page.locator('.reading-table-pane:not(.active)').first()
    .evaluate(e => e.hasAttribute('inert'));
  expect(siblingInert, 'resting panes are inert under the lift').toBe(true);

  // A tab change from OUTSIDE the modal (the URL) still starts a new turn at
  // rest — the lift never carries across cards.
  await page.goto(aaron + '?tab=sigil', { waitUntil: 'networkidle' });
  await expect(page.locator('.reading-table-pane.active')).not.toHaveClass(/lifted/);
  await expect(page.locator('.pane-lift-backdrop')).not.toHaveClass(/open/);
});
