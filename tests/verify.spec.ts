import { test, expect, type Page } from '@playwright/test';
import AxeBuilder from '@axe-core/playwright';
import { fakeCertificates } from './fixtures.mjs';

const CONTACT_EMAIL = 'pharosprize@gmail.com';
const [first, second] = fakeCertificates;

const codeField = (page: Page) => page.getByLabel('Certificate code');
const checkButton = (page: Page) => page.getByRole('button', { name: 'Check' });
const verified = (page: Page) => page.getByRole('heading', { name: 'Certificate verified' });
const notFound = (page: Page) => page.getByRole('heading', { name: "We couldn't find that code" });

async function check(page: Page, code: string) {
  await codeField(page).fill(code);
  await checkButton(page).click();
}

test.describe('Verify a certificate', () => {
  test.beforeEach(async ({ page }) => {
    await page.goto('/verify/');
  });

  test('a valid code shows the name, award, edition and issue date', async ({ page }) => {
    await check(page, first.code);
    await expect(verified(page)).toBeVisible();
    const result = page.locator('#result-found');
    await expect(result).toContainText(first.name);
    await expect(result).toContainText(first.award);
    await expect(result).toContainText(first.edition);
    await expect(result).toContainText('1 December 2026');
    await expect(notFound(page)).toBeHidden();
  });

  for (const [label, typed] of [
    ['lower case', first.code.toLowerCase()],
    ['spaces instead of dashes', 'test ab12 cd34'],
    ['spaces around and inside', '  Test  AB12   CD34  '],
    ['no dashes at all', 'testab12cd34'],
    ['en dashes, as pasted from a PDF', 'TEST–AB12–CD34'],
  ]) {
    test(`a code typed with ${label} still matches`, async ({ page }) => {
      await check(page, typed);
      await expect(verified(page)).toBeVisible();
      await expect(page.locator('#result-found')).toContainText(first.name);
      // The certificate's own code is shown, not what was typed.
      await expect(page.locator('#found-code')).toHaveText(first.code);
    });
  }

  test('an unknown code says it was not found and gives the contact email', async ({ page }) => {
    await check(page, 'NOPE-0000-1111');
    await expect(notFound(page)).toBeVisible();
    await expect(page.locator('#result-missing').getByRole('link', { name: CONTACT_EMAIL })).toHaveAttribute('href', `mailto:${CONTACT_EMAIL}`);
    await expect(verified(page)).toBeHidden();
    await expect(page.locator('#result-missing')).toContainText(`email us at ${CONTACT_EMAIL} and we'll look into it`);
  });

  test('a near miss is not accepted', async ({ page }) => {
    await check(page, 'TEST-AB12-CD3');
    await expect(notFound(page)).toBeVisible();
  });

  test('an empty field asks for a code instead of saying not found', async ({ page }) => {
    await checkButton(page).click();
    await expect(page.getByText('Type the code from your certificate')).toBeVisible();
    await expect(notFound(page)).toBeHidden();
    await expect(verified(page)).toBeHidden();
  });

  test('a new check replaces the old result', async ({ page }) => {
    await check(page, first.code);
    await expect(page.locator('#found-name')).toHaveText(first.name);
    await check(page, second.code);
    await expect(page.locator('#found-name')).toHaveText(second.name);
    await check(page, 'NOPE');
    await expect(notFound(page)).toBeVisible();
    await expect(verified(page)).toBeHidden();
  });

  test('details from the data are shown as text, never as HTML', async ({ page }) => {
    await check(page, 'test <b>x</b>');
    await expect(verified(page)).toBeVisible();
    await expect(page.locator('#found-name')).toHaveText('Test <i>Markup</i> & "Quotes"');
    await expect(page.locator('#result-found i')).toHaveCount(0);
  });

  test('what was typed is shown as text, never as HTML', async ({ page }) => {
    await check(page, '<img src=x onerror="window.pwned=1">');
    await expect(notFound(page)).toBeVisible();
    await expect(page.locator('#result-missing img')).toHaveCount(0);
    expect(await page.evaluate(() => 'pwned' in window)).toBe(false);
  });
});

test.describe('?code= links', () => {
  test('a valid code in the link is checked on load', async ({ page }) => {
    await page.goto(`/verify/?code=${encodeURIComponent(first.code)}`);
    await expect(verified(page)).toBeVisible();
    await expect(page.locator('#result-found')).toContainText(first.name);
    await expect(codeField(page)).toHaveValue(first.code);
  });

  test('the code in the link is matched like a typed one', async ({ page }) => {
    await page.goto('/verify/?code=test-ef56-gh78');
    await expect(verified(page)).toBeVisible();
    await expect(page.locator('#found-name')).toHaveText(second.name);
  });

  test('an unknown code in the link shows the not-found message', async ({ page }) => {
    await page.goto('/verify/?code=NOPE-0000');
    await expect(notFound(page)).toBeVisible();
    await expect(page.locator('#result-missing').getByRole('link', { name: CONTACT_EMAIL })).toBeVisible();
  });

  test('no code in the link shows no result', async ({ page }) => {
    await page.goto('/verify/');
    await expect(codeField(page)).toHaveValue('');
    await expect(verified(page)).toBeHidden();
    await expect(notFound(page)).toBeHidden();
  });

  test('checking a code puts a shareable link in the address bar', async ({ page }) => {
    await page.goto('/verify/');
    await check(page, 'test ab12 cd34');
    await expect(page).toHaveURL(/\/verify\/\?code=TESTAB12CD34$/);
    await page.reload();
    await expect(verified(page)).toBeVisible();
  });
});

test.describe('keyboard use', () => {
  test('the whole check can be done without a mouse', async ({ page }) => {
    await page.goto('/verify/');

    // Tab from the top of the page until the code field is reached.
    for (let i = 0; i < 20 && !(await codeField(page).evaluate((el) => el === document.activeElement)); i++) {
      await page.keyboard.press('Tab');
    }
    await expect(codeField(page)).toBeFocused();
    // The focus ring is visible.
    expect(await codeField(page).evaluate((el) => getComputedStyle(el).outlineStyle)).not.toBe('none');

    await page.keyboard.type(first.code.toLowerCase());
    await page.keyboard.press('Enter');
    await expect(verified(page)).toBeVisible();
    await expect(page.locator('#found-name')).toHaveText(first.name);

    // Enter on a field must not reload the page, and the code stays in the field.
    await expect(codeField(page)).toHaveValue(first.code.toLowerCase());

    // Tab to the Check button and press it with Space, then again with Enter.
    await page.keyboard.press('Tab');
    await expect(checkButton(page)).toBeFocused();
    await codeField(page).fill('NOPE');
    await checkButton(page).focus();
    await page.keyboard.press('Space');
    await expect(notFound(page)).toBeVisible();
    await codeField(page).fill(second.code);
    await checkButton(page).focus();
    await page.keyboard.press('Enter');
    await expect(page.locator('#found-name')).toHaveText(second.name);
  });

  test('results are announced to screen readers', async ({ page }) => {
    await page.goto('/verify/');
    const live = page.getByRole('status');
    await expect(live).toHaveCount(1);
    await check(page, first.code);
    await expect(live).toContainText(first.name);
  });
});

test.describe('page rules', () => {
  test('it is kept out of search results', async ({ page }) => {
    await page.goto('/verify/');
    await expect(page.locator('meta[name="robots"]')).toHaveAttribute('content', /noindex/);
  });

  test('it is linked from the footer and not from the main nav', async ({ page }) => {
    await page.goto('/about/');
    await expect(page.locator('footer').getByRole('link', { name: 'Verify a certificate' })).toHaveAttribute('href', '/verify/');
    await expect(page.locator('header a[href="/verify/"]')).toHaveCount(0);
    await page.locator('footer').getByRole('link', { name: 'Verify a certificate' }).click();
    await expect(page).toHaveURL(/\/verify\/$/);
    await expect(page.getByRole('heading', { level: 1, name: 'Verify a certificate' })).toBeVisible();
  });

  test('it makes no requests to other sites', async ({ page }) => {
    const origins = new Set<string>();
    page.on('request', (req) => origins.add(new URL(req.url()).origin));
    await page.goto('/verify/?code=TEST-AB12-CD34');
    await expect(verified(page)).toBeVisible();
    expect([...origins]).toEqual([new URL(page.url()).origin]);
  });

  test('without JavaScript it shows a note with the contact email', async ({ browser }) => {
    const context = await browser.newContext({ javaScriptEnabled: false });
    const page = await context.newPage();
    await page.goto('/verify/');
    // (getByText skips <noscript> content, so look for the paragraph directly.)
    await expect(page.locator('main p', { hasText: 'needs JavaScript' })).toBeVisible();
    await expect(page.locator('main').getByRole('link', { name: CONTACT_EMAIL })).toHaveAttribute('href', `mailto:${CONTACT_EMAIL}`);
    await expect(codeField(page)).toBeHidden();
    await context.close();
  });

  for (const [name, width, height] of [['phone', 390, 844], ['desktop', 1440, 900]] as const) {
    test(`no sideways scroll and no text under 16px on a ${name}`, async ({ page }) => {
      await page.setViewportSize({ width, height });
      await page.goto('/verify/?code=TEST-AB12-CD34');
      await expect(verified(page)).toBeVisible();
      const overflow = await page.evaluate(() => document.documentElement.scrollWidth - document.documentElement.clientWidth);
      expect(overflow).toBeLessThanOrEqual(0);
      const small = await page.evaluate(() => {
        const out: string[] = [];
        const walker = document.createTreeWalker(document.body, NodeFilter.SHOW_TEXT);
        for (let n = walker.nextNode(); n; n = walker.nextNode()) {
          const el = n.parentElement!;
          if (!n.textContent!.trim() || el.closest('noscript, script, style, [hidden]')) continue;
          const size = parseFloat(getComputedStyle(el).fontSize);
          if (size < 16) out.push(`${size}px: ${n.textContent!.trim().slice(0, 40)}`);
        }
        return out;
      });
      expect(small).toEqual([]);
    });
  }

  for (const [label, url] of [['empty', '/verify/'], ['valid result', '/verify/?code=TEST-AB12-CD34'], ['not-found result', '/verify/?code=NOPE']] as const) {
    test(`no accessibility problems found (${label})`, async ({ page }) => {
      await page.goto(url);
      await expect(codeField(page)).toBeVisible();
      const { violations } = await new AxeBuilder({ page }).withTags(['wcag2a', 'wcag2aa', 'wcag21aa']).analyze();
      expect(violations.map((v) => `${v.id}: ${v.nodes.map((n) => n.target.join(' ')).join(', ')}`)).toEqual([]);
    });
  }
});
