// The Inaugural Edition's prompts and judging rubric are published on the Competition
// page. The wording below is the owner-approved text, written out here on purpose: if
// someone edits, shortens or "improves" src/site.ts, these tests fail.
import { existsSync } from 'node:fs';
import { test, expect } from '@playwright/test';

const intro = 'Write one essay, up to 800 words, on one of these three prompts.';
const sen = 'Starvation is the characteristic of some people not having enough food to eat.';
const prompts = [
  'The world produces enough food for everyone. Why do people still go hungry?',
  'Describe a meal you will never forget, and what it taught you about who gets to eat.',
  "The Universal Declaration of Human Rights says everyone has a right to food. If that's true, who is responsible when someone goes hungry, and what should they be made to do about it?",
];

const rubric = [
  { name: 'Response to the prompt', marks: 30, descriptors: [
    'Addresses the prompt directly and engages with its full implications.',
    'Sustains a clear and coherent line of argument throughout.',
    'Draws conclusions that follow logically from the evidence presented.',
  ] },
  { name: 'Insight and understanding', marks: 30, descriptors: [
    'Uses evidence that is relevant, accurate and appropriately credited.',
    'Demonstrates a secure understanding of the causes of hunger.',
    'Develops ideas beyond the obvious, showing independent thought.',
  ] },
  { name: 'Clarity and structure', marks: 20, descriptors: [
    'Expresses ideas clearly, so that meaning is readily understood.',
    'Purposefully structured: clear opening, development and conclusion.',
    'Spelling, punctuation and grammar accurate; errors do not impede meaning.',
  ] },
  { name: 'Voice and originality', marks: 20, descriptors: [
    'Offers a distinctive and well-considered perspective on the prompt.',
    'Writes in a confident, individual voice suited to audience and purpose.',
    'Leaves a lasting impression on the reader.',
  ] },
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

test('the rubric is real text: four criteria, exact descriptors, marks that add up to 100', async ({ page }) => {
  await page.goto('/competition/');
  const section = page.locator('#judging');
  await expect(section.getByRole('heading', { name: 'How essays are judged', level: 2 })).toBeVisible();
  await expect(section.getByText(
    'Each essay is marked out of 100 against the four criteria below. Clarity of expression is valued over complexity of vocabulary: judges reward the quality of thinking, not the length of words.',
    { exact: true },
  )).toBeVisible();
  await expect(section.getByText('All essays are assessed by human judges. AI is not used in scoring.', { exact: true })).toBeVisible();

  const criteria = section.locator('.criterion');
  await expect(criteria).toHaveCount(4);
  let total = 0;
  for (const [i, c] of rubric.entries()) {
    const row = criteria.nth(i);
    await expect(row.getByRole('heading', { level: 3 })).toContainText(c.name);
    const marksText = (await row.locator('.criterion__marks').innerText()).trim();
    expect(marksText).toBe(`${c.marks} marks`);
    total += Number.parseInt(marksText, 10);
    const bullets = row.locator('ul > li');
    await expect(bullets).toHaveCount(3);
    for (const [j, d] of c.descriptors.entries()) await expect(bullets.nth(j)).toHaveText(d);
  }
  expect(total).toBe(100);
  await expect(section.locator('.judging__total')).toHaveText('Total: 100 marks');
});

test('the rubric needs no image or PDF, and the PDF link appears only if the file is in public/', async ({ page }) => {
  await page.goto('/competition/');
  await expect(page.locator('#judging img, #judging object, #judging iframe')).toHaveCount(0);
  const link = page.getByRole('link', { name: 'Download the judging criteria (PDF)' });
  if (existsSync('public/pharos-judging-criteria.pdf')) {
    await expect(link).toHaveAttribute('href', '/pharos-judging-criteria.pdf');
  } else {
    await expect(link).toHaveCount(0);
  }
});

test('the prompts and rubric are readable on a phone: no sideways scroll, text 16px or larger', async ({ page }) => {
  await page.setViewportSize({ width: 360, height: 740 });
  await page.goto('/competition/');
  expect(await page.evaluate(() => document.documentElement.scrollWidth - window.innerWidth)).toBeLessThanOrEqual(0);
  const smallest = await page.evaluate(() =>
    Math.min(...[...document.querySelectorAll('#prompts p, #prompts cite, #judging p, #judging li, #judging span:not(.criterion__name)')]
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
