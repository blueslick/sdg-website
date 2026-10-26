// The entries-open pull-request preview: the same site built with
// PUBLIC_PREVIEW_REGISTRATION_OPEN=true (served on its own port, see playwright.config.ts).
// /register/ must show the bank details from BANK in src/site.ts, and every page must be noindex.
// The normal build (the other tests) has the variable unset and stays in the pre-launch state.
import { test, expect } from '@playwright/test';
import AxeBuilder from '@axe-core/playwright';
import { readFileSync } from 'node:fs';

// src/site.ts uses import.meta.env (Astro/Vite only), so read BANK from the file's text
// rather than importing it. This keeps the test tied to the one place the details are set.
const siteSource = readFileSync('src/site.ts', 'utf8');
const bankBlock = siteSource.match(/export const BANK = \{([\s\S]*?)\} as const;/)![1];
const bankField = (name: string) => bankBlock.match(new RegExp(`${name}:\\s*'([^']+)'`))![1];
const BANK = {
  accountName: bankField('accountName'),
  bank: bankField('bank'),
  accountNumber: bankField('accountNumber'),
  reference: bankField('reference'),
};

const CONTACT_EMAIL = siteSource.match(/export const CONTACT_EMAIL = '([^']+)'/)![1];

const OPEN = 'http://localhost:4332';
const NORMAL = 'http://localhost:4331';

test('entries-open preview: /register/ shows the bank account name, bank and account number', async ({ page }) => {
  await page.goto(`${OPEN}/register/`);
  await expect(page.getByText(BANK.accountName).first()).toBeVisible();
  await expect(page.getByText(BANK.bank).first()).toBeVisible();
  await expect(page.getByText(BANK.accountNumber).first()).toBeVisible();
  await expect(page.getByText(BANK.reference).first()).toBeVisible();
});

test('entries-open preview: /register/ is three steps: pay, fill in the form, we confirm', async ({ page }) => {
  await page.goto(`${OPEN}/register/`);
  await expect(page.getByRole('heading', { name: 'How to enter', level: 1 })).toBeVisible();
  await expect(page.getByText('Three steps: pay, fill in the form, and we confirm.')).toBeVisible();
  const main = page.locator('main');
  await expect(main.getByRole('heading', { level: 2 })).toHaveText([
    'At a glance',
    'Before you start',
    'Step 1: Pay RM 40 to The Assembly Soup Kitchen (T.A.S.K)',
    'Step 2: Fill in the entry form',
    'Step 3: We confirm',
  ]);
});

test('entries-open preview: /register/ shows the bank number, reference, fee support note, consent line and Enter now', async ({ page }) => {
  await page.goto(`${OPEN}/register/`);
  const pay = page.locator('section#how-to-pay');
  await expect(page.locator('#how-to-pay')).toHaveCount(1);
  await expect(pay.getByText(BANK.accountNumber)).toHaveCount(1);
  await expect(pay.getByText(BANK.reference)).toHaveCount(1);
  await expect(pay).toContainText('Any method is fine as long as the full RM 40 arrives');
  await expect(pay).toContainText('Keep a screenshot');
  // Fee support is a note inside step 1, with a mailto link built from CONTACT_EMAIL.
  const note = pay.locator('#fee-support');
  await expect(note).toHaveCount(1);
  await expect(note).toContainText("Can't afford RM 40? Ask for fee support before you pay and you'll pay RM 20 (about USD 5).");
  await expect(note).toContainText("with your full name and school. You don't need to explain why.");
  await expect(note).toContainText('Requests close 5 days before the deadline; we reply within 72 hours with a code for the form.');
  await expect(note.getByRole('link', { name: CONTACT_EMAIL })).toHaveAttribute('href', `mailto:${CONTACT_EMAIL}`);
  await expect(page.getByText('[fee support details]')).toHaveCount(0);
  // The Enter section keeps the consent line and the Privacy link right next to the button.
  const enter = page.locator('section.enter');
  await expect(enter).toContainText("The form asks for your consent to how we handle your details (and a parent or guardian's if you're under 18).");
  await expect(enter.getByRole('link', { name: 'Privacy notice' })).toHaveAttribute('href', '/privacy/');
  await expect(enter.getByRole('link', { name: 'Enter now' })).toBeVisible();
  await expect(page.getByText('We check payments with The Assembly Soup Kitchen (T.A.S.K) once a week and email you within a week of entering.')).toBeVisible();
});

test('entries-open preview: /register/ links to the prompts instead of repeating them, and drops the old sections', async ({ page, request }) => {
  await page.goto(`${OPEN}/register/`);
  await expect(page.getByRole('link', { name: 'See the prompts' })).toHaveAttribute('href', '/competition/#prompts');
  const html = await (await request.get(`${OPEN}/register/`)).text();
  for (const text of [
    'Starvation is the characteristic', 'The world produces enough food for everyone', 'Describe a meal you will never forget',
    'The Universal Declaration of Human Rights',
  ]) expect(html).not.toContain(text);
  const main = page.locator('main');
  for (const gone of ['Our AI policy', 'The rules, in short', 'Who can enter', 'Prizes are funded separately', 'Prize USD', 'One essay per person.']) {
    await expect(main).not.toContainText(gone);
  }
  await expect(main).toContainText('Open to students only: Junior is 14 and under, Open is any age (your age on 17 January 2027).');
  await expect(main).toContainText('Deadline: 17 January 2027, 23:59 Malaysia time (MYT).');
  // The anchor it points to exists on the Competition page of the same build.
  await page.goto(`${OPEN}/competition/#prompts`);
  await expect(page.locator('#prompts')).toBeVisible();
});

test('entries-open preview: the account number and reference are selectable text that does not break', async ({ page }) => {
  await page.goto(`${OPEN}/register/`);
  const number = page.locator('.bank__value--number');
  await expect(number).toHaveText(BANK.accountNumber);
  const style = await number.evaluate((el) => { const s = getComputedStyle(el); return { ws: s.whiteSpace, fs: parseFloat(s.fontSize) }; });
  expect(style.ws).toBe('nowrap');
  expect(style.fs).toBeGreaterThanOrEqual(20);
});

test('entries-open preview: the three steps are numbered, and the page is short with no sideways scroll on a phone', async ({ page }) => {
  await page.setViewportSize({ width: 390, height: 800 });
  await page.goto(`${OPEN}/register/`);
  await expect(page.locator('.step__n')).toHaveText(['1', '2', '3']);
  expect(await page.evaluate(() => document.documentElement.scrollWidth - window.innerWidth)).toBeLessThanOrEqual(0);
  expect(await page.evaluate(() => document.documentElement.scrollHeight)).toBeLessThan(2600);
});

test('entries-open preview: on desktop the plum summary panel stays in view while the steps scroll', async ({ page }) => {
  await page.setViewportSize({ width: 1440, height: 900 });
  await page.goto(`${OPEN}/register/`);
  await expect(page.locator('.glance')).toContainText('RM 40 (about USD 10)');
  await expect(page.locator('.glance')).toContainText('17 January 2027, 23:59 Malaysia time (MYT)');
  await expect(page.locator('.glance')).toContainText('Students only, two categories');
  await expect(page.locator('.reg__summary').getByRole('link', { name: 'Enter now' })).toHaveCount(0);
  await page.evaluate(() => window.scrollTo(0, 600));
  const top = await page.locator('.reg__summary').evaluate((el) => el.getBoundingClientRect().top);
  expect(top).toBeGreaterThanOrEqual(0);
  expect(top).toBeLessThanOrEqual(1);
});

test('entries-open preview: every page is noindex; the normal build has no bank details and Home stays indexable', async ({ request }) => {
  for (const path of ['/', '/about/', '/blog/', '/competition/', '/contact/', '/privacy/', '/register/', '/verify/']) {
    const html = await (await request.get(`${OPEN}${path}`)).text();
    expect(html, path).toMatch(/<meta name="robots" content="noindex, nofollow"/);
  }
  const normalRegister = await (await request.get(`${NORMAL}/register/`)).text();
  expect(normalRegister).not.toContain(BANK.accountNumber);
  const normalHome = await (await request.get(`${NORMAL}/`)).text();
  expect(normalHome).not.toMatch(/name="robots"/);
});

test('entries-open preview: /register/ has no accessibility problems, on a phone and on desktop', async ({ page }) => {
  for (const [width, height] of [[390, 800], [1440, 900]]) {
    await page.setViewportSize({ width, height });
    await page.goto(`${OPEN}/register/`);
    const results = await new AxeBuilder({ page }).analyze();
    expect(results.violations.map((v) => v.id), `${width}px`).toEqual([]);
  }
});
