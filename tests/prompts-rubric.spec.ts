// The Inaugural Edition's prompts and judging rubric are published on the Competition
// page. The wording below is the owner-approved text, written out here on purpose: if
// someone edits, shortens or "improves" src/site.ts, these tests fail.
import { existsSync } from 'node:fs';
import { test, expect } from '@playwright/test';
import AxeBuilder from '@axe-core/playwright';

const intro = 'Write one essay, up to 800 words, on one of these three prompts.';
const sen = 'Starvation is the characteristic of some people not having enough food to eat.';
const prompts = [
  'The world produces enough food for everyone. Why do people still go hungry?',
  'Describe a meal you will never forget, and what it taught you about who gets to eat.',
  "The Universal Declaration of Human Rights says everyone has a right to food. If that's true, who is responsible when someone goes hungry, and what should they be made to do about it?",
];

// Names and marks of the four criteria (the descriptors are in the PDF, not on the page).
const rubric = [
  { name: 'Response to the prompt', marks: 30 },
  { name: 'Insight and understanding', marks: 30 },
  { name: 'Clarity and structure', marks: 20 },
  { name: 'Voice and originality', marks: 20 },
];

test('Competition shows the intro line and the three prompts, in order, with the exact wording', async ({ page }) => {
  await page.goto('/competition/');
  const section = page.locator('#prompts');
  await expect(section.getByRole('heading', { name: 'The prompts', level: 2 })).toBeVisible();
  await expect(section.getByText(intro, { exact: true })).toBeVisible();

  const items = section.locator('ol > li');
  await expect(items).toHaveCount(3);
  await expect(items.nth(0).locator('.prompt__n')).toHaveText('1');
  await expect(items.nth(1).locator('.prompt__n')).toHaveText('2');
  await expect(items.nth(2).locator('.prompt__n')).toHaveText('3');
  for (const [i, text] of prompts.entries()) {
    await expect(items.nth(i).locator('.prompt__text')).toHaveText(text);
  }
});

test('Prompt 1 renders the Sen line as a quotation with its attribution', async ({ page }) => {
  await page.goto('/competition/');
  const quote = page.locator('#prompts blockquote');
  await expect(quote).toHaveCount(1);
  await expect(quote.locator('p')).toHaveText(`“${sen}”`);
  await expect(quote.locator('cite')).toHaveText('Amartya Sen');
  // The quotation belongs to prompt 1 only.
  await expect(page.locator('#prompts li').first().locator('blockquote')).toHaveCount(1);
});

test('the judging section is one sentence built from the rubric, the human-judges line and a PDF download', async ({ page }) => {
  await page.goto('/competition/');
  const section = page.locator('#judging');
  await expect(section.getByRole('heading', { name: 'How essays are judged', level: 2 })).toBeVisible();
  expect(rubric.reduce((sum, c) => sum + c.marks, 0)).toBe(100);
  await expect(section.getByText(
    'Every essay is marked out of 100 against four criteria: response to the prompt (30), insight and understanding (30), clarity and structure (20), and voice and originality (20).',
    { exact: true },
  )).toBeVisible();
  await expect(section.getByText('All essays are assessed by human judges. AI is not used in scoring.', { exact: true })).toBeVisible();
  // The criteria cards, descriptors, total line and old intro are gone.
  await expect(section.locator('.criterion, .rubric, .judging__total')).toHaveCount(0);
  await expect(section).not.toContainText('Addresses the prompt directly');
  await expect(section).not.toContainText('Total: 100 marks');
  await expect(section).not.toContainText('Clarity of expression is valued');
});

test('the judging criteria PDF exists in public/ and the button downloads it', async ({ page, request }) => {
  expect(existsSync('public/pharos-judging-criteria.pdf')).toBe(true);
  await page.goto('/competition/');
  const link = page.locator('#judging').getByRole('link', { name: 'Download the judging criteria (PDF)' });
  await expect(link).toHaveAttribute('href', '/pharos-judging-criteria.pdf');
  await expect(link).toHaveAttribute('download', '');
  await expect(link).toHaveClass(/btn/);
  await expect(page.locator('#judging')).toContainText('PDF, 1 page');
  await expect(page.locator('#judging img, #judging object, #judging iframe')).toHaveCount(0);
  const res = await request.get('/pharos-judging-criteria.pdf');
  expect(res.ok()).toBe(true);
  expect(res.headers()['content-type']).toContain('pdf');
});

test('the prompts and rubric are readable on a phone: no sideways scroll, text 16px or larger', async ({ page }) => {
  await page.setViewportSize({ width: 360, height: 740 });
  await page.goto('/competition/');
  expect(await page.evaluate(() => document.documentElement.scrollWidth - window.innerWidth)).toBeLessThanOrEqual(0);
  const smallest = await page.evaluate(() =>
    Math.min(...[...document.querySelectorAll('#prompts p, #prompts cite, #judging p, #judging li, #judging span, #judging a')]
      .map((el) => parseFloat(getComputedStyle(el).fontSize))),
  );
  expect(smallest).toBeGreaterThanOrEqual(16);
});

test('About links to the judging section on the Competition page, and that anchor exists', async ({ page }) => {
  await page.goto('/about/');
  const link = page.getByRole('link', { name: 'See how essays are judged' });
  await expect(link).toHaveAttribute('href', '/competition/#judging');
  await link.click();
  await expect(page).toHaveURL(/\/competition\/#judging$/);
  await expect(page.locator('#judging')).toBeVisible();
});

test('no placeholder prompt or rubric wording is left on any page', async ({ page }) => {
  for (const path of ['/', '/about/', '/competition/', '/register/', '/contact/', '/privacy/', '/blog/']) {
    const html = await (await page.goto(path))!.text();
    expect(html, path).not.toMatch(/\[Prompt|A personal prompt|A policy prompt|A systemic prompt|Published when entries open/);
    expect(html, path).not.toMatch(/rubric (coming soon|published before)|published before entries open/i);
  }
});

test('Home does not carry the prompt text', async ({ page }) => {
  const html = await (await page.goto('/'))!.text();
  expect(html).not.toContain('Starvation is the characteristic');
  expect(html).not.toContain('Describe a meal you will never forget');
});

test('the judging section has no accessibility problems', async ({ page }) => {
  await page.goto('/competition/');
  const results = await new AxeBuilder({ page }).include('#judging').analyze();
  expect(results.violations.map((v) => v.id)).toEqual([]);
});
