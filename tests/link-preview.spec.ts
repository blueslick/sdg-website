// Link previews (T78): every page carries Open Graph and Twitter tags, and the share image exists
// at 1200 x 630 on pharosprize.org. Port 4331 is the normal build, 4332 the entries-open preview.
import { test, expect } from '@playwright/test';

const NORMAL = 'http://localhost:4331';
const OPEN = 'http://localhost:4332';
const DOMAIN = 'https://pharosprize.org';
const IMAGE = `${DOMAIN}/og-image.png`;
const SITE_NAME = 'Pharos';
// The owner-approved wording, written out here so a change to it shows up as a failing test.
const ALT = 'Pharos, Inaugural Edition: Zero Hunger. An essay competition for students, a fundraiser for The Assembly Soup Kitchen (T.A.S.K).';

const PAGES = ['/', '/competition/', '/rules/', '/faq/', '/about/', '/blog/', '/contact/', '/privacy/', '/verify/', '/register/'];

test('every page has Open Graph and Twitter tags that match its own title and description', async ({ page }) => {
  for (const path of PAGES) {
    await page.goto(`${NORMAL}${path}`);
    const meta = (selector: string) => page.locator(`head meta[${selector}]`).getAttribute('content');
    const title = await page.title();
    const description = await meta('name="description"');

    expect(await meta('property="og:type"'), path).toBe('website');
    expect(await meta('property="og:site_name"'), path).toBe(SITE_NAME);
    expect(await meta('property="og:title"'), path).toBe(title);
    expect(await meta('property="og:description"'), path).toBe(description);
    expect(await meta('property="og:url"'), path).toBe(`${DOMAIN}${path}`);
    expect(await meta('property="og:image"'), path).toBe(IMAGE);
    expect(await meta('property="og:image:width"'), path).toBe('1200');
    expect(await meta('property="og:image:height"'), path).toBe('630');
    expect(await meta('property="og:image:alt"'), path).toBe(ALT);
    expect(await meta('name="twitter:card"'), path).toBe('summary_large_image');
    expect(await meta('name="twitter:title"'), path).toBe(title);
    expect(await meta('name="twitter:description"'), path).toBe(description);
    expect(await meta('name="twitter:image"'), path).toBe(IMAGE);
    expect(await meta('name="twitter:image:alt"'), path).toBe(ALT);
  }
});

test('the blog posts and the entries-open preview carry the same tags', async ({ page }) => {
  await page.goto(`${NORMAL}/blog/`);
  const links = await page.locator('main a[href^="/blog/"]').evaluateAll((as) => as.map((a) => a.getAttribute('href')));
  for (const path of [...new Set(links)]) {
    await page.goto(`${NORMAL}${path}`);
    expect(await page.locator('head meta[property="og:image"]').getAttribute('content'), path).toBe(IMAGE);
    expect(await page.locator('head meta[name="twitter:card"]').getAttribute('content'), path).toBe('summary_large_image');
  }
  await page.goto(`${OPEN}/`);
  expect(await page.locator('head meta[property="og:image"]').getAttribute('content')).toBe(IMAGE);
  expect(await page.locator('head meta[name="twitter:card"]').getAttribute('content')).toBe('summary_large_image');
});

test('og-image.png is served as a 1200 x 630 PNG under 300 KB', async ({ request }) => {
  const res = await request.get(`${NORMAL}/og-image.png`);
  expect(res.status()).toBe(200);
  expect(res.headers()['content-type']).toContain('image/png');
  const body = await res.body();
  expect(body.subarray(1, 4).toString()).toBe('PNG');
  // A PNG stores its width and height as two 32-bit numbers right after the "IHDR" label.
  expect(body.readUInt32BE(16)).toBe(1200);
  expect(body.readUInt32BE(20)).toBe(630);
  expect(body.length).toBeLessThan(300 * 1024);
});
