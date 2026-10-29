// The Malay Privacy notice (/ms/privacy/) and its links with the English one (/privacy/).
// Port 4331 is the normal build, 4332 the entries-open preview build (see playwright.config.ts).
import { test, expect, type Page } from '@playwright/test';
import AxeBuilder from '@axe-core/playwright';

const NORMAL = 'http://localhost:4331';
const OPEN = 'http://localhost:4332';
const DOMAIN = 'https://pharosprize.org';
const phone = { width: 390, height: 844 };
const desktop = { width: 1440, height: 900 };

async function headings(page: Page, path: string) {
  await page.goto(path);
  return page.locator('main h2').allTextContents();
}

test('/ms/privacy/ returns 200 and is in Malay', async ({ page, request }) => {
  expect((await request.get(`${NORMAL}/ms/privacy/`)).status()).toBe(200);
  expect((await request.get(`${OPEN}/ms/privacy/`)).status()).toBe(200);
  await page.goto('/ms/privacy/');
  await expect(page.locator('html')).toHaveAttribute('lang', 'ms');
  await expect(page).toHaveTitle('Privasi | Pharos');
  await expect(page.locator('meta[name="description"]')).toHaveAttribute(
    'content',
    'Apa yang dikumpul oleh Pharos tentang anda, dan apa yang kami lakukan dengannya.',
  );
  await expect(page.getByRole('heading', { level: 1, name: 'Privasi' })).toBeVisible();
});

test('every other page stays lang="en"', async ({ request }) => {
  for (const path of ['/', '/competition/', '/about/', '/blog/', '/contact/', '/privacy/', '/rules/', '/faq/', '/verify/']) {
    expect(await (await request.get(`${NORMAL}${path}`)).text(), path).toContain('<html lang="en">');
  }
});

test('has the same section headings as /privacy/, in the same number and order of sections', async ({ page }) => {
  const en = await headings(page, '/privacy/');
  const ms = await headings(page, '/ms/privacy/');
  expect(en).toHaveLength(13);
  expect(ms).toHaveLength(en.length);
  expect(ms).toEqual([
    'Siapa kami',
    'Apa yang dikumpul oleh laman web ini',
    'Jika anda menghantar e-mel kepada kami',
    'Instagram',
    'Senarai menunggu',
    'Jika anda berumur bawah 18 tahun dan menyertai senarai menunggu',
    'Borang penyertaan',
    'Pembayaran',
    'Jika anda disenarai pendek atau menang',
    'Jika anda berumur bawah 18 tahun dan menyertai pertandingan',
    'Berapa lama kami menyimpan data penyertaan',
    'Sijil dan penerbitan nama',
    'Hak anda',
  ]);
  // Same shape section by section: the same number of paragraphs and list items.
  const shape = (page: Page) =>
    page.locator('main section').evaluateAll((sections) => sections.map((s) => [s.querySelectorAll('p').length, s.querySelectorAll('li').length]));
  await page.goto('/privacy/');
  const enShape = await shape(page);
  await page.goto('/ms/privacy/');
  expect(await shape(page)).toEqual(enShape);
});

test('the two pages link to each other', async ({ page }) => {
  await page.goto('/privacy/');
  const toMalay = page.locator('main').getByRole('link', { name: 'Baca dalam Bahasa Melayu' });
  await expect(toMalay).toHaveAttribute('href', '/ms/privacy/');
  await expect(toMalay).toHaveAttribute('lang', 'ms');
  await toMalay.click();
  await expect(page).toHaveURL(/\/ms\/privacy\/$/);
  const toEnglish = page.locator('main').getByRole('link', { name: 'Read in English' });
  await expect(toEnglish).toHaveAttribute('href', '/privacy/');
  // "near the top": before the first section
  expect(await page.locator('main > *').first().locator('a').count()).toBe(1);
  await toEnglish.click();
  await expect(page).toHaveURL(/\/privacy\/$/);
  await expect(page.locator('html')).toHaveAttribute('lang', 'en');
});

test('hreflang tags are correct on both pages, in both builds', async ({ request }) => {
  for (const base of [NORMAL, OPEN]) {
    for (const path of ['/privacy/', '/ms/privacy/']) {
      const html = await (await request.get(`${base}${path}`)).text();
      expect(html, `${base}${path}`).toContain(`<link rel="alternate" hreflang="en" href="${DOMAIN}/privacy/">`);
      expect(html, `${base}${path}`).toContain(`<link rel="alternate" hreflang="ms" href="${DOMAIN}/ms/privacy/">`);
      expect(html, `${base}${path}`).toContain(`<link rel="alternate" hreflang="x-default" href="${DOMAIN}/privacy/">`);
      expect(html.match(/rel="alternate"/g)).toHaveLength(3);
    }
  }
  // Only the two Privacy pages carry them.
  expect(await (await request.get(`${NORMAL}/about/`)).text()).not.toContain('hreflang');
  // The Malay page names itself as canonical.
  expect(await (await request.get(`${NORMAL}/ms/privacy/`)).text()).toContain(`<link rel="canonical" href="${DOMAIN}/ms/privacy/">`);
});

test('is in the sitemap, but not in the nav or the footer', async ({ page, request }) => {
  expect(await (await request.get(`${NORMAL}/sitemap.xml`)).text()).toContain(`<loc>${DOMAIN}/ms/privacy/</loc>`);
  for (const path of ['/', '/about/', '/privacy/', '/ms/privacy/']) {
    await page.goto(path);
    await expect(page.locator('nav a[href="/ms/privacy/"], footer a[href="/ms/privacy/"]')).toHaveCount(0);
  }
});

test('shows no square brackets, the date in Malay, and the right links', async ({ page }) => {
  await page.goto('/ms/privacy/');
  const text = await page.locator('main').innerText();
  expect(text).not.toMatch(/[\[\]]/);
  expect(text).toContain('Kemas kini terakhir: 28 Oktober 2026');
  expect(text).toContain('Menjelang 3 Ogos 2027, kami memadamkan');

  const mailtos = page.locator('main a[href^="mailto:"]');
  expect(await mailtos.count()).toBe(4);
  for (const href of await mailtos.evaluateAll((as) => as.map((a) => a.getAttribute('href')))) {
    expect(href).toBe('mailto:pharosprize@gmail.com');
  }
  await expect(page.getByRole('link', { name: 'dasar privasi Tally' })).toHaveCount(2);
  for (const href of await page.getByRole('link', { name: 'dasar privasi Tally' }).evaluateAll((as) => as.map((a) => a.getAttribute('href')))) {
    expect(href).toBe('https://tally.so/help/privacy-policy');
  }
  await expect(page.getByRole('link', { name: 'https://tally.so/r/kbdkBR' })).toHaveAttribute('href', 'https://tally.so/r/kbdkBR');
  await expect(page.getByRole('link', { name: 'halaman Semak (Verify)' })).toHaveAttribute('href', '/verify/');
});

test('uses the site constants for the name and the soup kitchen, and none of the banned words', async ({ page }) => {
  await page.goto('/ms/privacy/');
  const text = await page.locator('main').innerText();
  expect(text).toContain('The Assembly Soup Kitchen (T.A.S.K)');
  expect(text).toContain('Pharos tidak pernah mengendalikan wang itu');
  for (const word of ['charity', 'non-profit', 'NGO', 'foundation', 'United Nations', 'Global Goals']) {
    expect(text.toLowerCase()).not.toContain(word.toLowerCase());
  }
});

for (const [name, viewport] of [['390px', phone], ['1440px', desktop]] as const) {
  test(`passes the accessibility check at ${name}, with no sideways scrolling`, async ({ page }) => {
    await page.setViewportSize(viewport);
    await page.goto('/ms/privacy/');
    expect((await new AxeBuilder({ page }).analyze()).violations).toEqual([]);
    expect(await page.evaluate(() => document.documentElement.scrollWidth <= window.innerWidth)).toBe(true);
  });
}
