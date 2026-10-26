// Bank-transfer payment, the two prize categories, the soup kitchen wording and the
// entry-form Privacy section. REGISTRATION_OPEN is false in src/site.ts, so the
// built site must not show the entry form link or the bank details yet.
import { test, expect } from '@playwright/test';
import AxeBuilder from '@axe-core/playwright';

const pages = ['/', '/about/', '/blog/', '/competition/', '/contact/', '/privacy/', '/register/', '/verify/'];

test('no PayPal, no old form link, no "20 and under" and no entry form or bank details while registration is closed', async ({ page }) => {
  for (const path of pages) {
    const res = await page.goto(path);
    const html = await res!.text();
    expect(html, path).not.toMatch(/paypal/i);
    expect(html, path).not.toMatch(/OQD718/);
    expect(html, path).not.toMatch(/20 and under|aged 20/i);
    expect(html, path).not.toMatch(/Ar7QeB/);
    expect(html, path).not.toMatch(/262111-00010155|RHB Bank/);
    expect(html, path).not.toMatch(/Partner announcement/);
  }
});

test('Competition shows both categories, the prizes and where the money goes', async ({ page }) => {
  await page.goto('/competition/');
  const junior = page.locator('.cat--junior');
  await expect(junior).toContainText('Junior');
  await expect(junior).toContainText('14 and under');
  await expect(junior).toContainText('USD 50');
  const open = page.locator('.cat--open');
  await expect(open).toContainText('Open');
  await expect(open).toContainText('Students of any age');
  await expect(open).toContainText('USD 100');
  await expect(page.getByText('Prizes are funded separately, not from entry fees.')).toBeVisible();
  await expect(page.getByText('Your age is your age on 17 January 2027.')).toBeVisible();
  await expect(page.getByText('Every USD 10 entry funds about 3 meals at T.A.S.K.')).toBeVisible();
  await expect(page.getByText('RM 40 (about USD 10)').first()).toBeVisible();
  await expect(page.getByText('RM 20 (about USD 5)').first()).toBeVisible();
  await expect(page.getByText('Pharos never handles the money.')).toBeVisible();
  await expect(page.locator('.fact', { hasText: 'Deadline' })).toContainText('17 January 2027');
  await expect(page.getByText('23:59 Malaysia time (MYT)').first()).toBeVisible();
  await expect(page.getByText('Winners are announced by 3 February 2027.')).toBeVisible();
});

test('Competition fits a phone and passes the accessibility check', async ({ page }) => {
  await page.setViewportSize({ width: 360, height: 740 });
  await page.goto('/competition/');
  expect(await page.evaluate(() => document.documentElement.scrollWidth - window.innerWidth)).toBeLessThanOrEqual(0);
  expect((await new AxeBuilder({ page }).analyze()).violations).toEqual([]);
});

test('the Volunteering card on Home is live, links to the soup kitchen Instagram and has no Placeholder tag', async ({ page }) => {
  await page.goto('/');
  const card = page.locator('.doing--volunteer');
  await expect(card).toContainText('Volunteering with The Assembly Soup Kitchen (T.A.S.K)');
  await expect(card).not.toContainText('Placeholder');
  await expect(card).not.toContainText('coming soon');
  const link = card.getByRole('link');
  await expect(link).toHaveAttribute('href', 'https://www.instagram.com/assemblysoupkitchen/');
  await expect(link).toHaveAttribute('target', '_blank');
  await expect(link).toHaveAttribute('rel', /noopener/);
});

test('About names the soup kitchen instead of "a local soup kitchen"', async ({ page }) => {
  for (const path of ['/competition/', '/about/']) {
    await page.goto(path);
    await expect(page.locator('main')).not.toContainText('a local soup kitchen');
    await expect(page.locator('main')).not.toContainText('coming soon', { ignoreCase: true });
  }
});

test('the Register page is only an "Opening soon" notice while closed', async ({ page }) => {
  await page.goto('/register/');
  await expect(page.getByText('Entries open 16 November 2026.')).toBeVisible();
  await expect(page.getByRole('button', { name: 'Opening soon' })).toBeDisabled();
  await expect(page.locator('meta[name="robots"]')).toHaveAttribute('content', /noindex/);
});

test('the Privacy page covers the entry form, payments, publishing, under-18s and retention', async ({ page }) => {
  await page.goto('/privacy/');
  const main = page.locator('main');
  await expect(main).toContainText('Last updated 25 October 2026.');
  await expect(main).toContainText('Draft');
  for (const item of [
    'your full name, email and country', 'your school (optional) and your age', 'your essay (a PDF)',
    'fee support code', 'the transfer reference and the name on the account you paid from', 'a second email address',
  ]) {
    await expect(main).toContainText(item);
  }
  await expect(main).toContainText('directly to The Assembly Soup Kitchen (T.A.S.K)');
  await expect(main).toContainText('shares a list of incoming transfers (date, amount and reference)');
  await expect(main).toContainText('your name only (not your school, country or age)');
  await expect(main).toContainText('@pharosprize');
  await expect(main).toContainText('stay published after the competition ends');
  await expect(main).toContainText('A parent or guardian must agree to you entering');
  await expect(main).toContainText('By 3 August 2027 we delete');
  await expect(main).toContainText('We keep the published names of shortlisted entrants and winners, and the certificate records');
  await expect(main).not.toContainText(/PayPal|before entries open, we'll update this notice|\bAI\b/i);
  await expect(page.getByRole('link', { name: "Tally's privacy policy" })).toHaveCount(2);
});
