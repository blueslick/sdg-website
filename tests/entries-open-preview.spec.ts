// The entries-open pull-request preview: the same site built with
// PUBLIC_PREVIEW_REGISTRATION_OPEN=true (served on its own port, see playwright.config.ts).
// /register/ must show the bank details from BANK in src/site.ts, and every page must be noindex.
// The normal build (the other tests) has the variable unset and stays in the pre-launch state.
import { test, expect } from '@playwright/test';
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

const OPEN = 'http://localhost:4332';
const NORMAL = 'http://localhost:4331';

test('entries-open preview: /register/ shows the bank account name, bank and account number', async ({ page }) => {
  await page.goto(`${OPEN}/register/`);
  await expect(page.getByText(BANK.accountName).first()).toBeVisible();
  await expect(page.getByText(BANK.bank).first()).toBeVisible();
  await expect(page.getByText(BANK.accountNumber).first()).toBeVisible();
  await expect(page.getByText(BANK.reference).first()).toBeVisible();
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
