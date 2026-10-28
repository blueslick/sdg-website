// The "Partner with us" section on About (#partner-with-us), its footer link on every page that
// has the footer, and the line on Contact. About must not use any of the words the site never
// uses for itself, and must pass the accessibility check on a phone and a desktop screen.
// (/register/ is a focused page with no footer, so it is not in the footer list.)
import { test, expect } from '@playwright/test';
import AxeBuilder from '@axe-core/playwright';

const footerPages = ['/', '/competition/', '/about/', '/blog/', '/contact/', '/privacy/', '/verify/'];

test.describe('Partner with us on About', () => {
  test('is a section with the agreed heading and wording, after "Our partner" and before "Contact"', async ({ page }) => {
    await page.goto('/about/');
    const section = page.locator('section#partner-with-us');
    await expect(section).toHaveCount(1);
    await expect(section.getByRole('heading', { level: 2, name: 'Partner with us' })).toBeVisible();
    await expect(section.locator('h2')).toHaveClass(/t-heading/);
    await expect(section.getByText('Pharos is run by student volunteers.', { exact: true })).toBeVisible();
    await expect(
      section.getByText(
        "We'd like to hear from schools, youth groups and organisations that want to help: sharing the competition with students, sponsoring a prize, or partnering on a future edition.",
        { exact: true },
      ),
    ).toBeVisible();
    await expect(section.getByText(/^Email pharosprize@gmail\.com with the subject "Partnership"\. Tell us who you are and what you have in mind\.$/)).toBeVisible();
    // The sentence "Our partner" already says directly above is not repeated.
    await expect(section).not.toContainText('fundraiser');
    // Order: Our partner, Partner with us, Contact.
    const ids = await page.locator('.partner-row > section').evaluateAll((els) => els.map((el) => el.querySelector('h2')!.textContent));
    expect(ids).toEqual(['Our partner', 'Partner with us', 'Contact']);
  });

  test('has an email link with the subject "Partnership"', async ({ page }) => {
    await page.goto('/about/');
    const link = page.locator('#partner-with-us').getByRole('link', { name: 'pharosprize@gmail.com' });
    await expect(link).toHaveAttribute('href', /^mailto:pharosprize@gmail\.com\?subject=Partnership$/);
  });

  test('uses none of the words the site never uses for itself', async ({ page }) => {
    await page.goto('/about/');
    const text = (await page.locator('main').innerText()).toLowerCase();
    for (const word of ['charity', 'non-profit', 'nonprofit', 'not-for-profit', 'ngo', 'foundation', 'society', 'united nations', 'global goals']) {
      expect(text, `About should not say "${word}"`).not.toMatch(new RegExp(`\\b${word}\\b`));
    }
  });

  for (const [name, size] of [['390px', { width: 390, height: 844 }], ['1440px', { width: 1440, height: 900 }]] as const) {
    test(`passes the accessibility check and does not scroll sideways at ${name}`, async ({ page }) => {
      await page.setViewportSize(size);
      await page.goto('/about/');
      const overflow = await page.evaluate(() => document.documentElement.scrollWidth - window.innerWidth);
      expect(overflow).toBeLessThanOrEqual(0);
      const results = await new AxeBuilder({ page }).analyze();
      expect(results.violations).toEqual([]);
    });
  }
});

test.describe('links to Partner with us', () => {
  for (const path of footerPages) {
    test(`the footer on ${path} links to it, before Contact`, async ({ page }) => {
      await page.goto(path);
      const links = page.locator('footer .footer__links a');
      const labels = await links.allInnerTexts();
      expect(labels).toContain('Partner with us');
      expect(labels.indexOf('Partner with us')).toBe(labels.indexOf('Contact') - 1);
      await expect(page.locator('footer').getByRole('link', { name: 'Partner with us' })).toHaveAttribute('href', '/about/#partner-with-us');
    });
  }

  test('the footer link lands on the section', async ({ page }) => {
    await page.goto('/contact/');
    await page.locator('footer').getByRole('link', { name: 'Partner with us' }).click();
    await expect(page).toHaveURL(/\/about\/#partner-with-us$/);
    await expect(page.locator('#partner-with-us')).toBeInViewport();
  });

  test('Contact has the Organisations line under the email', async ({ page }) => {
    await page.goto('/contact/');
    const line = page.locator('#email-title').locator('xpath=..').getByText(/^Organisations: see Partner with us\.$/);
    await expect(line).toBeVisible();
    await expect(line.getByRole('link', { name: 'Partner with us' })).toHaveAttribute('href', '/about/#partner-with-us');
  });

  for (const [name, size] of [['390px', { width: 390, height: 844 }], ['1440px', { width: 1440, height: 900 }]] as const) {
    test(`Contact still passes the accessibility check at ${name}`, async ({ page }) => {
      await page.setViewportSize(size);
      await page.goto('/contact/');
      const results = await new AxeBuilder({ page }).analyze();
      expect(results.violations).toEqual([]);
    });
  }
});

// The "Our partner" card (SoupKitchenCard inside .partner__band) used to squeeze the soup
// kitchen's name into a sliver and break words in the middle ("fundrais-er"). Whatever the
// width: every word stays on one line, nothing spills out of the band, the band never gets
// wider than about 760px, and the logo sits beside the text only when there is room.
test.describe('Our partner card on About', () => {
  for (const width of [390, 960, 1440, 1920, 2560, 3000]) {
    test(`keeps every word whole and inside the band at ${width}px`, async ({ page }) => {
      await page.setViewportSize({ width, height: 1200 });
      await page.goto('/about/');
      await page.evaluate(() => document.fonts.ready);
      const r = await page.evaluate(() => {
        const band = document.querySelector('.partner__band')!;
        const broken: string[] = [];
        let words = 0;
        const walker = document.createTreeWalker(band, NodeFilter.SHOW_TEXT);
        while (walker.nextNode()) {
          const node = walker.currentNode as Text;
          if (node.parentElement!.closest('.visually-hidden')) continue; // screen-reader-only text
          for (const m of node.data.matchAll(/\S+/g)) {
            const range = document.createRange();
            range.setStart(node, m.index!);
            range.setEnd(node, m.index! + m[0].length);
            words++;
            if (range.getClientRects().length !== 1) broken.push(m[0]);
          }
        }
        return {
          broken,
          words,
          overflow: band.scrollWidth - band.clientWidth,
          width: band.getBoundingClientRect().width,
          wrap: getComputedStyle(document.querySelector('.sk__line')!).overflowWrap,
          pageOverflow: document.documentElement.scrollWidth - window.innerWidth,
        };
      });
      expect(r.words).toBeGreaterThan(20); // the name, the links and the description were all checked
      expect(r.broken).toEqual([]);
      expect(r.overflow).toBeLessThanOrEqual(0);
      expect(r.pageOverflow).toBeLessThanOrEqual(0);
      expect(r.wrap).not.toBe('anywhere');
      expect(r.width).toBeLessThanOrEqual(761);
    });
  }

  test('the logo sits beside the name when there is room and above it when there is not', async ({ page }) => {
    const layout = async (width: number) => {
      await page.setViewportSize({ width, height: 1200 });
      await page.goto('/about/');
      const logo = (await page.locator('.partner__band .sk__logo').boundingBox())!;
      const text = (await page.locator('.partner__band .sk__text').boundingBox())!;
      return logo.x + logo.width <= text.x + 0.5 ? 'beside' : logo.y + logo.height <= text.y + 0.5 ? 'above' : 'overlapping';
    };
    expect(await layout(390)).toBe('beside');
    expect(await layout(960)).toBe('above'); // the band is only half the page here
    expect(await layout(1440)).toBe('beside');
    expect(await layout(2560)).toBe('beside');
  });

  test('the two columns start on the same line on desktop', async ({ page }) => {
    for (const width of [960, 1440, 2560, 3000]) {
      await page.setViewportSize({ width, height: 1200 });
      await page.goto('/about/');
      const tops = await page.locator('.partner-row > section > h2').evaluateAll((els) => els.slice(0, 2).map((el) => Math.round(el.getBoundingClientRect().top)));
      expect(tops[0], `at ${width}px`).toBe(tops[1]);
    }
  });
});
