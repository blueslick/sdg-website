// The Rules (/rules/) and FAQ (/faq/) pages, the links to them (footer, Home, Competition, Register)
// and the Privacy page fixes made with them. Port 4331 is the normal (pre-launch) build, 4332 the
// entries-open preview build (see playwright.config.ts). The pages must work in both, hold no bank
// details and no form link, and use none of the words the site never uses for itself.
import { test, expect, type Page } from '@playwright/test';
import AxeBuilder from '@axe-core/playwright';

const NORMAL = 'http://localhost:4331';
const OPEN = 'http://localhost:4332';
const builds = [['normal', NORMAL], ['entries-open', OPEN]] as const;
const phone = { width: 390, height: 844 };
const desktop = { width: 1440, height: 900 };

// Words the site never uses for itself. Checked in each page's <main> (the footer's
// "not affiliated with the United Nations" disclaimer is the one place that phrase is allowed).
const redLines = ['charity', 'non-profit', 'nonprofit', 'not-for-profit', 'ngo', 'foundation', 'society', 'united nations', 'global goals', 'refund'];

const footerPages = ['/', '/competition/', '/about/', '/blog/', '/contact/', '/privacy/', '/verify/', '/rules/', '/faq/'];

const rulesText = [
  'Students only, from any country. Junior is 14 and under; Open is students of any age. Your age is your age on 17 January 2027.',
  'One essay per person, answering one of the three prompts.',
  "Up to 800 words, in English, uploaded as a PDF. Don't put your name or school in the file.",
  "It must be your own work. Don't use AI tools to write, rewrite, expand or translate any of it, and don't enter an essay that's been published or entered somewhere else.",
  'Pay the entry fee, RM 40 (or RM 20 with approved fee support), straight to The Assembly Soup Kitchen (T.A.S.K) before you submit, and upload proof on the form.',
  'Under 18? A parent or guardian must agree to you entering.',
  'Submit by Sunday 17 January 2027, 23:59 Malaysia time. No extensions.',
  "Essays are read and judged by people, against the published judging criteria. The judges' decisions are final.",
  'Winners and shortlisted entrants may be named (name only) on pharosprize.org and Instagram. Prizes: USD 50 (Junior) and USD 100 (Open).',
];

// Every FAQ answer (the ones that differ between builds are checked separately).
const faqAnswers: Record<string, string> = {
  'who-is-a-student': 'Anyone studying at a school, college or university on 17 January 2027. We may ask for proof, such as a student card or a letter from your school, before we award a prize.',
  'which-category': "Your age on 17 January 2027. If you're 14 or under, you're Junior. Otherwise you're Open. Open has no upper age limit.",
  'enter-more-than-once': 'No, one essay per person.',
  'under-18': 'A parent or guardian has to agree to you entering and to us handling your details. The entry form asks for a second email address; we suggest theirs.',
  'open-and-close': "Entries open on Monday 16 November 2026 and close on Sunday 17 January 2027 at 23:59 Malaysia time (MYT). Late entries aren't judged.",
  'fix-a-mistake': "Yes, until entries close (17 January 2027, 23:59 Malaysia time). Email pharosprize@gmail.com with your full name, the email address you entered with, and what needs fixing. If it's your essay, attach the corrected PDF. After the deadline we can't accept changes.",
  'word-count': "Everything from the first word of your essay to the last, including footnotes. Your title and your reference list don't count. Essays over 800 words aren't judged.",
  'references': "If you use someone else's words, ideas or numbers, credit them. Any clear, consistent style is fine.",
  'other-languages': 'No, essays must be in English.',
  'name-in-the-pdf': 'So we can judge essays without knowing who wrote them. The form collects your name separately.',
  'make-a-pdf': 'In Google Docs or Word, use File, then Download (or Save as), then PDF. Open the file before you submit to check it works.',
  'ai-use': 'Not to write, rewrite, expand or translate any part of your essay. Spelling and grammar checkers that only fix mistakes are fine. Using AI to find sources is fine, but read the sources yourself and write every word yourself.',
  'ai-suspected': "We contact you first and may ask to see your notes or drafts. We never disqualify an essay because of a detection tool's result alone.",
  'where-the-fee-goes': 'Straight to The Assembly Soup Kitchen (T.A.S.K). Pharos never handles the money. T.A.S.K tells us every USD 10 is about 3 meals.',
  'pay-from-abroad': 'Use a service such as Wise, Remitly or Western Union that pays into a Malaysian bank account in ringgit. Any method is fine as long as the full amount arrives. Transfer fees are yours.',
  'payment-arrived': "We check payments with T.A.S.K once a week and email you within a week of your entry. If we can't find your payment, we'll email you. You have until Sunday 24 January 2027 to sort it out. If we still can't find it by then, your entry is disqualified.",
  'fee-support-what': 'If RM 40 is hard for you to afford, you can pay half: RM 20 (about USD 5).',
  'fee-support-who': "Any student who finds the fee hard to afford. You don't need to explain why, and we don't ask for proof.",
  'fee-support-how': "Before you pay, email pharosprize@gmail.com with your full name and school. You don't need to explain why. We reply within 72 hours with a code. Pay RM 20, then choose fee support on the entry form and type in your code.",
  'fee-support-deadline': 'Yes: ask at least 5 days before entries close, so by Tuesday 12 January 2027.',
  'who-judges': 'The Pharos organisers, against the published judging criteria: response to the prompt (30), insight and understanding (30), clarity and structure (20) and voice and originality (20). You can download the criteria from the Competition page. AI is never used to score, rank or shortlist essays.',
  'feedback': "No. We can't give individual scores or feedback.",
  'results': 'Wednesday 3 February 2027, on pharosprize.org and Instagram (@pharosprize). Winners are also told by email.',
  'prizes-paid': "By bank transfer or Wise to the winner, or to a parent or guardian if the winner is under 18, within 2 weeks of the results. Prizes are funded separately, not from entry fees. If we can't reach a winner within 14 days of the results, we may award the prize to the next-placed essay.",
  'certificate': 'Winners and shortlisted entrants get a certificate with a code anyone can check at pharosprize.org/verify/.',
  'who-owns-my-essay': 'You do. You let us store and read it to run the competition.',
  'essay-published': "Only if it wins and you (and a parent or guardian, if you're under 18) give separate permission after the results.",
  'what-we-publish': "If you're shortlisted or win: your name only (no school, country or age), on pharosprize.org and Instagram, as you agreed on the entry form.",
  'your-data': 'See our Privacy notice: pharosprize.org/privacy/.',
  'follow-or-tag': 'No.',
  'who-runs-it': 'Student volunteers. This edition is a fundraiser for The Assembly Soup Kitchen (T.A.S.K).',
};

const faqQuestions = [
  'Who counts as a student?', 'Which category am I in?', 'Can I enter more than once?', "I'm under 18. What do I need?",
  'When do entries open and close?', 'I made a mistake in my entry. Can I fix it?',
  'What counts towards the 800 words?', 'Do I need references?', 'Can I write in another language?',
  "Why can't I put my name in the PDF?", 'How do I make a PDF?',
  'Can I use AI at all?', 'What happens if you think an essay used AI?',
  'Where does my fee go?', 'How do I pay?', "I'm not in Malaysia. How do I pay?", 'How do I know my payment arrived?',
  'What is fee support?', 'Who can ask for it?', 'How do I ask?', 'Is there a deadline?',
  'Who judges the essays?', 'Will I get feedback or a score?', 'When are the results?', 'How are prizes paid?', 'Do I get a certificate?',
  'Who owns my essay?', 'Will my essay be published?', 'What do you publish about me?', 'How do you handle my data?',
  'Do I have to follow or tag Pharos to enter?', 'Who runs Pharos?',
];

const accountNumber = '262111-00010155';

for (const [buildName, base] of builds) {
  test.describe(`${buildName} build`, () => {
    for (const path of ['/rules/', '/faq/']) {
      test(`${path} returns 200 with no bank details, no entry form link and no scripts`, async ({ request }) => {
        const res = await request.get(`${base}${path}`);
        expect(res.status()).toBe(200);
        const html = await res.text();
        expect(html).not.toContain(accountNumber);
        expect(html).not.toMatch(/RHB Bank|Assembly Ground/);
        expect(html).not.toMatch(/tally\.so|Ar7QeB/i);
        expect(html).not.toMatch(/<script/i);
      });

      test(`${path} uses none of the words the site never uses for itself`, async ({ page }) => {
        await page.goto(`${base}${path}`);
        const text = (await page.locator('main').evaluate((el) => el.textContent ?? '')).toLowerCase();
        for (const word of redLines) expect(text, `${path} should not say "${word}"`).not.toMatch(new RegExp(`\\b${word}\\b`));
      });

      for (const [size, viewport] of [['390px', phone], ['1440px', desktop]] as const) {
        test(`${path} passes the accessibility check and does not scroll sideways at ${size}`, async ({ page }) => {
          await page.setViewportSize(viewport);
          await page.goto(`${base}${path}`);
          expect(await page.evaluate(() => document.documentElement.scrollWidth - window.innerWidth)).toBeLessThanOrEqual(0);
          // Open every FAQ row too, so the answers are checked for contrast as well as the questions.
          await page.evaluate(() => document.querySelectorAll('details').forEach((d) => (d.open = true)));
          const results = await new AxeBuilder({ page }).analyze();
          expect(results.violations.map((v) => `${v.id}: ${v.nodes.map((n) => n.target).join(' ')}`)).toEqual([]);
        });
      }
    }
  });
}

test.describe('indexing', () => {
  test('in the normal build both pages are indexable, with a canonical link and in the sitemap', async ({ request }) => {
    for (const path of ['/rules/', '/faq/']) {
      const html = await (await request.get(`${NORMAL}${path}`)).text();
      expect(html, path).toContain(`<link rel="canonical" href="https://pharosprize.org${path}">`);
      expect(html, path).not.toMatch(/name="robots"/);
    }
    const xml = await (await request.get(`${NORMAL}/sitemap.xml`)).text();
    expect(xml).toContain('<loc>https://pharosprize.org/rules/</loc>');
    expect(xml).toContain('<loc>https://pharosprize.org/faq/</loc>');
  });

  test('in the entries-open preview both pages are noindex and the sitemap stays empty', async ({ request }) => {
    for (const path of ['/rules/', '/faq/']) {
      expect(await (await request.get(`${OPEN}${path}`)).text(), path).toMatch(/<meta name="robots" content="noindex, nofollow"/);
    }
    expect(await (await request.get(`${OPEN}/sitemap.xml`)).text()).not.toContain('<loc>');
  });
});

test.describe('Rules page', () => {
  test('is a numbered list of nine rules with the approved wording', async ({ page }) => {
    await page.goto('/rules/');
    await expect(page.getByRole('heading', { level: 1, name: 'Rules' })).toBeVisible();
    await expect(page.getByText('Nine rules. The FAQ explains the details.', { exact: true })).toBeVisible();
    const items = page.locator('main ol > li');
    await expect(items).toHaveCount(9);
    await expect(items).toHaveText(rulesText);
    await expect(page.locator('main ol')).toHaveCount(1);
    const main = page.locator('main');
    await expect(main.getByText("An essay that breaks these rules isn't judged.", { exact: true })).toBeVisible();
    await expect(main.getByText('Questions? Read the FAQ or email pharosprize@gmail.com.', { exact: true })).toBeVisible();
  });

  test('"judging criteria" opens the criteria PDF, "the FAQ" opens /faq/, and the email is a mailto link', async ({ page, request }) => {
    await page.goto('/rules/');
    const link = page.locator('main ol').getByRole('link', { name: 'judging criteria' });
    await expect(link).toHaveAttribute('href', '/pharos-judging-criteria.pdf');
    expect((await request.get(`${NORMAL}/pharos-judging-criteria.pdf`)).status()).toBe(200);
    await expect(page.locator('main').getByRole('link', { name: 'the FAQ' })).toHaveAttribute('href', '/faq/');
    await expect(page.locator('main').getByRole('link', { name: 'pharosprize@gmail.com' })).toHaveAttribute('href', 'mailto:pharosprize@gmail.com');
  });

  test('is the same in the entries-open build', async ({ page }) => {
    await page.goto(`${OPEN}/rules/`);
    await expect(page.locator('main ol > li')).toHaveText(rulesText);
  });

  test('stays short on a phone', async ({ page }) => {
    await page.setViewportSize(phone);
    await page.goto('/rules/');
    // About one phone screen of rules after the title; the whole page, with the footer, well under four screens.
    expect(await page.locator('main').evaluate((el) => el.getBoundingClientRect().height)).toBeLessThan(1500);
    expect(await page.evaluate(() => document.documentElement.scrollHeight)).toBeLessThan(2900);
  });
});

test.describe('FAQ page', () => {
  test('has the seven groups as h2 headings and every question as a closed <details>', async ({ page }) => {
    await page.goto('/faq/');
    await expect(page.getByRole('heading', { level: 1, name: 'Questions' })).toBeVisible();
    await expect(page.locator('main h2')).toHaveText(['Entering', 'The essay', 'AI', 'Paying', 'Fee support', 'Judging and results', 'Your details and your essay']);
    const rows = page.locator('main details');
    await expect(rows).toHaveCount(faqQuestions.length);
    await expect(rows.locator('> summary')).toHaveText(faqQuestions);
    const open = await rows.evaluateAll((els) => els.filter((el) => (el as HTMLDetailsElement).open).length);
    expect(open).toBe(0);
    await expect(page.getByText('Still stuck? Email pharosprize@gmail.com.', { exact: true })).toBeVisible();
  });

  test('every question has a unique, stable id', async ({ page }) => {
    await page.goto('/faq/');
    const ids = await page.locator('main details > div').evaluateAll((els) => els.map((el) => el.id));
    expect(ids.every(Boolean)).toBe(true);
    expect(new Set(ids).size).toBe(ids.length);
    expect(ids).toContain('fee-support-how');
    expect(ids.sort()).toEqual([...Object.keys(faqAnswers), 'pay-how'].sort());
  });

  test('every answer has the approved wording', async ({ page }) => {
    await page.goto('/faq/');
    for (const [id, answer] of Object.entries(faqAnswers)) {
      await expect(page.locator(`details > div#${id}`), id).toHaveText(answer);
    }
  });

  test('a row opens on click and closes again, and a link to its id opens it', async ({ page }) => {
    await page.goto('/faq/');
    const row = page.locator('details:has(> div#feedback)');
    await expect(row.locator('> div')).toBeHidden();
    await row.locator('> summary').click();
    await expect(row).toHaveAttribute('open', '');
    await expect(row.locator('> div')).toBeVisible();
    await row.locator('> summary').click();
    await expect(row).not.toHaveAttribute('open', '');
    // The ids are on the answers, so following #fee-support-how opens the row (no script needed).
    await page.goto('/faq/#fee-support-how');
    await expect(page.locator('details:has(> div#fee-support-how)')).toHaveAttribute('open', '');
    await expect(page.locator('div#fee-support-how')).toBeInViewport();
  });

  test('has a visible focus ring and tap targets of at least 44px', async ({ page }) => {
    await page.setViewportSize(phone);
    await page.goto('/faq/');
    const summaries = page.locator('main details > summary');
    const heights = await summaries.evaluateAll((els) => els.map((el) => el.getBoundingClientRect().height));
    expect(Math.min(...heights)).toBeGreaterThanOrEqual(44);
    const widths = await summaries.evaluateAll((els) => els.map((el) => el.getBoundingClientRect().width));
    expect(Math.min(...widths)).toBeGreaterThanOrEqual(44);
    await page.keyboard.press('Tab'); // skip link
    let focused = false;
    for (let i = 0; i < 20 && !focused; i++) {
      await page.keyboard.press('Tab');
      focused = await page.evaluate(() => document.activeElement?.tagName === 'SUMMARY');
    }
    expect(focused).toBe(true);
    const ring = await page.evaluate(() => { const s = getComputedStyle(document.activeElement!); return { style: s.outlineStyle, width: parseFloat(s.outlineWidth) }; });
    expect(ring.style).not.toBe('none');
    expect(ring.width).toBeGreaterThanOrEqual(2);
    // Enter opens the focused row without a mouse.
    await page.keyboard.press('Enter');
    expect(await page.evaluate(() => (document.activeElement!.parentElement as HTMLDetailsElement).open)).toBe(true);
  });

  test('"How do I pay?" says when the details go up before launch, with no link and no bank details', async ({ page }) => {
    await page.goto('/faq/');
    const answer = page.locator('div#pay-how');
    await expect(answer).toHaveText(
      `By bank transfer in ringgit to T.A.S.K's account. The details go up on the How to enter page when entries open on 16 November 2026. Use the reference "PHAROS + your full name", and keep a screenshot to upload on the form.`,
    );
    await expect(answer.locator('a')).toHaveCount(0);
    await expect(page.locator('main a[href^="/register"]')).toHaveCount(0);
  });

  test('"How do I pay?" links to the How to enter page once entries are open, still with no bank details', async ({ page }) => {
    await page.goto(`${OPEN}/faq/`);
    const answer = page.locator('div#pay-how');
    await expect(answer).toHaveText(
      `By bank transfer in ringgit to T.A.S.K's account. The details are on the How to enter page. Use the reference "PHAROS + your full name", and keep a screenshot to upload on the form.`,
    );
    await expect(answer.locator('a', { hasText: 'How to enter page' })).toHaveAttribute('href', '/register/#how-to-pay');
    expect(await page.content()).not.toContain(accountNumber);
  });

  test('the fee support answer links the email, and other FAQ links go where they say', async ({ page }) => {
    await page.goto('/faq/');
    // The rows are closed, so check the links by attribute rather than by what is visible.
    await expect(page.locator('div#fee-support-how a')).toHaveAttribute('href', 'mailto:pharosprize@gmail.com');
    await expect(page.locator('div#who-judges a')).toHaveAttribute('href', '/competition/#judging');
    await expect(page.locator('div#certificate a')).toHaveAttribute('href', '/verify/');
    await expect(page.locator('div#your-data a')).toHaveAttribute('href', '/privacy/');
  });
});

test.describe('links to Rules and FAQ', () => {
  for (const path of footerPages) {
    test(`the footer on ${path} links to Rules and FAQ, just before Privacy`, async ({ page }) => {
      await page.goto(path);
      const labels = await page.locator('footer .footer__links a').allInnerTexts();
      expect(labels.indexOf('Rules')).toBeGreaterThan(-1);
      expect(labels.indexOf('FAQ')).toBe(labels.indexOf('Rules') + 1);
      expect(labels.indexOf('Privacy')).toBe(labels.indexOf('FAQ') + 1);
      await expect(page.locator('footer').getByRole('link', { name: 'Rules', exact: true })).toHaveAttribute('href', '/rules/');
      await expect(page.locator('footer').getByRole('link', { name: 'FAQ', exact: true })).toHaveAttribute('href', '/faq/');
    });
  }

  test('the Competition page has one short line and two links, keeps the email line, and drops the "go up when entries open" sentence', async ({ page }) => {
    await page.goto('/competition/');
    const section = page.locator('section.rules');
    await expect(section.getByRole('heading', { level: 2, name: 'Rules and questions' })).toBeVisible();
    await expect(section.getByRole('link', { name: 'Read the rules' })).toHaveAttribute('href', '/rules/');
    await expect(section.getByRole('link', { name: 'Questions and answers' })).toHaveAttribute('href', '/faq/');
    await expect(section.getByRole('link', { name: 'pharosprize@gmail.com' })).toHaveAttribute('href', 'mailto:pharosprize@gmail.com');
    await expect(section).toContainText('Email pharosprize@gmail.com');
    await expect(section).not.toContainText('go up when entries open');
  });

  for (const [name, viewport] of [['a phone', phone], ['desktop', desktop]] as const) {
    test(`Home has one visible "Questions? Read the FAQ" link on ${name}`, async ({ page }) => {
      await page.setViewportSize(viewport);
      await page.goto('/');
      const link = page.locator('main').getByRole('link', { name: 'Read the FAQ' });
      await expect(link).toHaveCount(1); // the other copy is display: none at this width
      await expect(link).toBeVisible();
      await expect(link).toHaveAttribute('href', '/faq/');
      await expect(link.locator('xpath=..')).toHaveText('Questions? Read the FAQ');
      expect((await link.boundingBox())!.height).toBeGreaterThanOrEqual(44);
    });
  }

  test('Home does not add a nav item', async ({ page }) => {
    await page.goto('/');
    await expect(page.getByRole('navigation', { name: 'Main' }).first().getByRole('link')).toHaveText(['About', 'Competition', 'Blog']);
  });

  test('Register (entries-open build): the rules link goes to /rules/, with a FAQ link and a fee support link to the FAQ answer', async ({ page }) => {
    await page.goto(`${OPEN}/register/`);
    await expect(page.getByRole('link', { name: 'Read the full rules' })).toHaveAttribute('href', '/rules/');
    await expect(page.getByRole('link', { name: 'Questions? Read the FAQ' })).toHaveAttribute('href', '/faq/');
    await expect(page.locator('#fee-support').getByRole('link', { name: 'fee support' })).toHaveAttribute('href', '/faq/#fee-support-how');
    await expect(page.getByText('[full rules link]')).toHaveCount(0);
    await expect(page.locator('.pill', { hasText: 'Placeholder' })).toHaveCount(0);
  });

  test('Register link to the rules lands on the Rules page', async ({ page }) => {
    await page.goto(`${OPEN}/register/`);
    await page.getByRole('link', { name: 'Read the full rules' }).click();
    await expect(page).toHaveURL(`${OPEN}/rules/`);
    await expect(page.getByRole('heading', { level: 1, name: 'Rules' })).toBeVisible();
  });
});

test.describe('Privacy page fixes', () => {
  async function main(page: Page) {
    await page.goto('/privacy/');
    return page.locator('main');
  }

  test('has no Draft banner and shows today\'s "Last updated" date', async ({ page }) => {
    const m = await main(page);
    await expect(m).not.toContainText('Draft');
    await expect(m).not.toContainText('waiting for review');
    await expect(page.locator('.pill')).toHaveCount(0);
    await expect(m).toContainText('Last updated 28 October 2026.');
  });

  test('the three new lines are in the right sections', async ({ page }) => {
    await main(page);
    const section = (title: string) => page.locator('main section', { has: page.getByRole('heading', { level: 2, name: title, exact: true }) });
    await expect(section('The entry form')).toContainText(
      "If you win, we may ask for proof that you're a student, such as a student card or a school letter. We use it only to check eligibility and delete it once the prize is paid.",
    );
    await expect(section('If you are shortlisted or win')).toContainText(
      "We'll only publish a winning essay if its writer (and a parent or guardian, if under 18) gives separate permission after the results.",
    );
    await expect(section('If you email us')).toContainText(
      "If you ask for fee support, we use your email only to send you a code, and we don't ask why you need it.",
    );
  });

  test('the missing space after "Tally\'s privacy policy" is fixed, and the payments sentence reads the new way', async ({ page, request }) => {
    const m = await main(page);
    const html = await (await request.get(`${NORMAL}/privacy/`)).text();
    expect(html).not.toContain('policyfor');
    expect(html).not.toMatch(/policy<\/a>for/);
    await expect(m).not.toContainText('policyfor');
    await expect(m).toContainText("Tally's privacy policy for the details");
    await expect(m).toContainText('directly to the bank account of The Assembly Soup Kitchen (T.A.S.K).');
    await expect(m).not.toContainText("T.A.S.K)'s bank account");
  });

  test('links the Malay version (its tests are in privacy-ms.spec.ts)', async ({ page }) => {
    await main(page);
    await expect(page.locator('a[href*="/ms/"]')).toHaveAttribute('href', '/ms/privacy/');
  });

  for (const [name, viewport] of [['390px', phone], ['1440px', desktop]] as const) {
    test(`still passes the accessibility check at ${name}`, async ({ page }) => {
      await page.setViewportSize(viewport);
      await page.goto('/privacy/');
      expect((await new AxeBuilder({ page }).analyze()).violations).toEqual([]);
    });
  }
});
