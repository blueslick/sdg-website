// The soup kitchen's logo and socials on Competition and About: <picture> with
// WebP first and PNG fallback, fixed width and height, the agreed alt text, social
// links that open in a new tab safely, nothing in the header or footer, and no
// horizontal scrolling on a phone.
import { test, expect } from '@playwright/test';
import AxeBuilder from '@axe-core/playwright';

const ALT = 'The Assembly Soup Kitchen (T.A.S.K) logo';
const pages = ['/competition/', '/about/'];

for (const path of pages) {
  test.describe(`soup kitchen logo on ${path}`, () => {
    test('shows the logo with WebP first, PNG fallback and fixed size', async ({ page }) => {
      await page.goto(path);
      const picture = page.locator('picture').filter({ has: page.getByAltText(ALT) });
      await expect(picture).toHaveCount(1);
      await expect(picture.locator('source')).toHaveAttribute('type', 'image/webp');
      await expect(picture.locator('source')).toHaveAttribute('srcset', '/images/task-logo-600.webp');
      const img = picture.locator('img');
      await expect(img).toHaveAttribute('src', '/images/task-logo-600.png');
      await expect(img).toHaveAttribute('width', '600');
      await expect(img).toHaveAttribute('height', '516');
      await img.scrollIntoViewIfNeeded();
      await expect.poll(() => img.evaluate((el: HTMLImageElement) => el.complete && el.naturalWidth)).toBe(600);
      // Same shape as the file: not stretched.
      const box = await img.boundingBox();
      expect(box!.width / box!.height).toBeCloseTo(600 / 516, 1);
    });

    test('says who the fundraiser is for and links to their socials', async ({ page }) => {
      await page.goto(path);
      await expect(page.getByText('A fundraiser for [Soup Kitchen Name]')).toBeVisible();
      for (const [name, href] of [
        ['Facebook', 'https://www.facebook.com/theassemblysoupkitchen/'],
        ['Instagram', 'https://www.instagram.com/assemblysoupkitchen/'],
      ]) {
        const link = page.locator('.sk').getByRole('link', { name: new RegExp(`^${name}`) });
        await expect(link).toHaveAttribute('href', href);
        await expect(link).toHaveAttribute('target', '_blank');
        await expect(link).toHaveAttribute('rel', /noopener/);
      }
    });

    test('keeps the logo out of the header and footer', async ({ page }) => {
      await page.goto(path);
      // Not in the footer, the nav bar or the Pharos wordmark area (on Competition the
      // partner band sits below the edition slab, which holds the wordmark).
      await expect(page.locator('footer img[src*="task-logo"], nav img[src*="task-logo"], .top__bar img[src*="task-logo"], .top__slab img[src*="task-logo"], a[href="/"] img[src*="task-logo"]')).toHaveCount(0);
      await expect(page.locator('img[src*="task-logo"]')).toHaveCount(1);
    });

    test('fits a phone screen and passes the accessibility check', async ({ page }) => {
      await page.setViewportSize({ width: 360, height: 740 });
      await page.goto(path);
      const overflow = await page.evaluate(() => document.documentElement.scrollWidth - window.innerWidth);
      expect(overflow).toBeLessThanOrEqual(0);
      const results = await new AxeBuilder({ page }).analyze();
      expect(results.violations).toEqual([]);
    });
  });
}

test('the logo appears only on Competition and About', async ({ page }) => {
  for (const path of ['/', '/contact/', '/privacy/', '/blog/']) {
    await page.goto(path);
    await expect(page.locator('img[src*="task-logo"]')).toHaveCount(0);
  }
});
