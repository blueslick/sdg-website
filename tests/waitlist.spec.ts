// The waitlist (Tally embed) on Home and Competition: loads Tally only there,
// falls back to a plain link, keeps the consent line and Privacy link beside the
// form, and fits a phone screen. Tally itself is never contacted: its script is
// mocked or blocked.
import { test, expect, type Page } from '@playwright/test';
import AxeBuilder from '@axe-core/playwright';

const FORM = 'https://tally.so/r/kbdkBR';
const SCRIPT = 'https://tally.so/widgets/embed.js';
const pages = ['/', '/competition/'];

// Stand-in for Tally's script: like the real one, it sets each iframe's src.
const fakeTally = `window.Tally = { loadEmbeds() { document.querySelectorAll('iframe[data-tally-src]:not([src])').forEach(f => { f.src = 'about:blank#' + f.dataset.tallySrc; }); } };`;

async function mockTally(page: Page) {
  await page.route(SCRIPT, (route) => route.fulfill({ contentType: 'text/javascript', body: fakeTally }));
}

for (const path of pages) {
  test.describe(`waitlist on ${path}`, () => {
    test('embeds the Tally form, with the consent line and Privacy link next to it', async ({ page }) => {
      await mockTally(page);
      await page.goto(path);
      const frame = page.locator('iframe[data-tally-src]');
      await expect(frame).toHaveCount(1);
      await expect(frame).toHaveAttribute('data-tally-src', /^https:\/\/tally\.so\/embed\/kbdkBR\?/);
      await expect(frame).toHaveAttribute('title', 'Pharos waitlist');
      await expect(frame).toHaveAttribute('src', /kbdkBR/);
      const consent = page.getByText('We will only email you once, when entries open.');
      await expect(consent).toBeVisible();
      await expect(consent.getByRole('link', { name: 'Privacy notice' })).toHaveAttribute('href', '/privacy/');
      await expect(page.getByText("The form didn't load.")).toBeHidden();
    });

    test("shows a plain link if Tally's script fails to load", async ({ page }) => {
      await page.route(SCRIPT, (route) => route.abort());
      await page.goto(path);
      await expect(page.locator('iframe[data-tally-src]')).toBeHidden();
      const link = page.getByRole('link', { name: 'Open the waitlist form' });
      await expect(link).toBeVisible();
      await expect(link).toHaveAttribute('href', FORM);
    });

    test('fits a phone screen without sideways scrolling', async ({ page }) => {
      await mockTally(page);
      await page.setViewportSize({ width: 360, height: 740 });
      await page.goto(path);
      await page.locator('.tally').scrollIntoViewIfNeeded();
      const box = await page.locator('.tally').boundingBox();
      expect(box!.x).toBeGreaterThanOrEqual(0);
      expect(box!.x + box!.width).toBeLessThanOrEqual(360);
      expect(await page.evaluate(() => document.documentElement.scrollWidth)).toBeLessThanOrEqual(360);
    });

    test('has no accessibility problems in the waitlist section', async ({ page }) => {
      await mockTally(page);
      await page.goto(path);
      const results = await new AxeBuilder({ page }).include('.waitlist').exclude('iframe').analyze();
      expect(results.violations).toEqual([]);
    });
  });
}

test('Tally is loaded only on pages that show the form', async ({ page }) => {
  const requested: string[] = [];
  await page.route(SCRIPT, (route) => {
    requested.push(route.request().url());
    return route.fulfill({ contentType: 'text/javascript', body: fakeTally });
  });
  for (const path of ['/about/', '/blog/', '/contact/', '/privacy/', '/verify/', '/register/']) {
    await page.goto(path);
    await expect(page.locator('iframe[data-tally-src]')).toHaveCount(0);
  }
  expect(requested).toEqual([]);
  await page.goto('/');
  await expect.poll(() => requested.length).toBe(1);
});

test('the dates and soup kitchen name come from site.ts', async ({ page }) => {
  await page.goto('/competition/');
  await expect(page.locator('.top__opens')).toHaveText('Opens 1 December 2026');
  await expect(page.locator('.fact', { hasText: 'Deadline' })).toContainText('31 January 2027');
  await expect(page.getByText('Winners are announced by 28 February 2027.')).toBeVisible();
  await page.goto('/');
  await expect(page.getByText('fundraiser for The Assembly Soup Kitchen (T.A.S.K). Opens 1 December 2026.')).toBeVisible();
});

test('the Privacy page covers the waitlist', async ({ page }) => {
  await page.goto('/privacy/');
  await expect(page.getByText('Last updated 22 October 2026.')).toBeVisible();
  await expect(page.getByRole('link', { name: "Tally's privacy policy" })).toHaveAttribute('href', 'https://tally.so/help/privacy-policy');
  await expect(page.getByText('12 months after our last reply')).toBeVisible();
  await expect(page.getByText('Nothing that we can see')).toHaveCount(0);
  await expect(page.locator('main')).not.toContainText(/\[(date|retention period|How we handle)/);
});
