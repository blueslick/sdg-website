// The site's public address is https://pharosprize.org (the `site` setting in astro.config.mjs).
// Canonical links, Open Graph URLs, the sitemap and robots.txt must use it, and the old
// pharos-prize.web.app address must not appear in anything the site publishes.
// Port 4331 is the normal build, 4332 the noindex entries-open preview (see playwright.config.ts).
import { test, expect } from '@playwright/test';

const NORMAL = 'http://localhost:4331';
const OPEN = 'http://localhost:4332';
const DOMAIN = 'https://pharosprize.org';

test('indexable pages have a canonical link and og:url on pharosprize.org', async ({ request }) => {
  for (const path of ['/', '/competition/', '/rules/', '/faq/', '/about/', '/blog/', '/contact/', '/privacy/']) {
    const html = await (await request.get(`${NORMAL}${path}`)).text();
    expect(html, path).toContain(`<link rel="canonical" href="${DOMAIN}${path}">`);
    expect(html, path).toContain(`<meta property="og:url" content="${DOMAIN}${path}">`);
    expect(html, path).not.toContain('web.app');
  }
});

test('noindex pages (Verify, the entries-open preview) have no canonical link', async ({ request }) => {
  expect(await (await request.get(`${NORMAL}/verify/`)).text()).not.toContain('rel="canonical"');
  expect(await (await request.get(`${OPEN}/`)).text()).not.toContain('rel="canonical"');
});

test('robots.txt points at the sitemap on pharosprize.org', async ({ request }) => {
  const robots = await (await request.get(`${NORMAL}/robots.txt`)).text();
  expect(robots).toContain(`Sitemap: ${DOMAIN}/sitemap.xml`);
  expect(robots).not.toMatch(/Disallow:\s*\S/);
});

test('sitemap lists only indexable pages, all on pharosprize.org', async ({ request }) => {
  const xml = await (await request.get(`${NORMAL}/sitemap.xml`)).text();
  const locs = [...xml.matchAll(/<loc>([^<]+)<\/loc>/g)].map((m) => m[1]);
  expect(locs).toEqual([
    `${DOMAIN}/`, `${DOMAIN}/competition/`, `${DOMAIN}/rules/`, `${DOMAIN}/faq/`, `${DOMAIN}/about/`, `${DOMAIN}/blog/`, `${DOMAIN}/contact/`, `${DOMAIN}/privacy/`,
  ]);
  // Verify and the sample post are noindex, so they stay out.
  expect(xml).not.toContain('/verify/');
  expect(xml).not.toContain('sample-post');
});

test('the entries-open preview sitemap lists nothing', async ({ request }) => {
  expect(await (await request.get(`${OPEN}/sitemap.xml`)).text()).not.toContain('<loc>');
});
