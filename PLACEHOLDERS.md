# Placeholders

Everything on the site that is still a placeholder, so the owner can fill it in later.
Search the code for the bracketed text (for example `[full rules link]`) to find each one.

## Launch-day switch

- [ ] **Open registration: set `REGISTRATION_SWITCH` to `true` in `src/site.ts`.** It is `false` now. (`REGISTRATION_OPEN`, which the pages read, is `REGISTRATION_SWITCH` or the pull-request-preview variable below.) While `REGISTRATION_OPEN` is `false` the site is in its pre-launch state: the closing arch on Home and Competition is the waitlist (the Tally form set by `WAITLIST_FORM_ID`), `/register/` shows only an "Opening soon" notice (hidden from search engines, no fee or bank details), and the entry form link (`REGISTRATION_URL`) appears nowhere on the built site. Set `REGISTRATION_SWITCH` to `true` and the arch becomes "Entries are open" with a Register button, and `/register/` shows the full How to enter page with the "How to pay" bank details and the "Enter now" button. **To see the open state before launch:** every pull request gets a second preview link, "Entries-open preview (bank details visible; not the live site)", built with `PUBLIC_PREVIEW_REGISTRATION_OPEN=true`. It shows the open state, is `noindex` on every page, and never reaches the live site (the merge workflow does not set the variable). Before you do: check the dates in `DATES` (`src/site.ts`), the Rules and FAQ pages (see "Slots for launch" below) and check the Tally entry form (see "The entry form (Tally)" below).

## Before sharing the site

- [ ] **Publish the first real blog post.** Until there is one, the blog page says "First posts coming soon". `src/content/blog/sample-post.md` is the template (placeholder text such as `[Launch post title]`, lorem ipsum, `[Image]`, sources). It is marked `draft: true`, so it is not on the live site. To write a post, copy that file in the same folder, fill it in and leave `draft` out. Don't state facts or numbers without a source.

## Fill in anywhere it appears

| Placeholder | What it is | Where |
|---|---|---|
| Soup kitchen name (was a placeholder) | **Done.** The soup kitchen gave written permission (24 Oct 2026): it is The Assembly Soup Kitchen (T.A.S.K). Set once as `SOUP_KITCHEN_NAME` in `src/site.ts`; the site shows it on Home, the Register page, the Volunteering card on Home, and the "A fundraiser for ..." line next to its logo on Competition and About. Never hard-code or re-spell it on the site. | `src/site.ts`, Home, Register, Competition, About |

## Certificate verification (`/verify/`)

The page works already, but `src/data/certificates.json` is an empty array, so every code shows "We couldn't find that code" until the judging tool produces the real file.

| Item | What it is | Where |
|---|---|---|
| `src/data/certificates.json` | The real list, **encrypted** by the judging tool: `[{ "id", "iv", "data" }]`. Nobody can read names from the page source; each record opens only with its own code. The exact scheme, a test vector and how to try it are in `src/data/README.md`. The build stops if the file holds anything readable | `src/data/` |
| Certificate codes | 8 characters shown as `XXXX-XXXX` (Crockford base32: 0-9 and A-Z without I, L, O, U), random. `node scripts/encrypt-certificates.mjs` can generate them; the scheme is version 2 (slow, salted ids, 100,000 rounds). 8 characters are 40 bits: fine against casual guessing, but a determined attacker with rented hardware could eventually find some codes. See "How safe are 8-character codes?" in `src/data/README.md` | judging tool |
| Entry form consent (Tally) | Add a tickbox so entrants agree that **their name may be published if they are shortlisted or win** (the Privacy page says they agree on the entry form) | Tally form |
| Privacy notice | Updated for the certificate check and publishing names. The "Draft" banner is gone (approved, Q23) | Privacy |

## Judging toolkit (`tools/judging/`)

One judge (the owner). Nothing is left as a placeholder in the code: the rubric is the real one (a test keeps `tools/judging/rubric.yaml` identical to `RUBRIC` in `src/site.ts`), and the soup kitchen name and the site address are read from `src/site.ts` and `astro.config.mjs`. What the owner supplies when judging starts:

| Item | What it is | Where |
|---|---|---|
| `Category` column | Add `Junior` or `Open` to every row of `key.xlsx` (the entry-admin pack does not make it) | `tools/judging/data/key.xlsx` |
| Shortlist and Winner | The owner types `yes`/`no` himself; the toolkit never chooses | `data/results.xlsx` |
| Issue date | `--issued YYYY-MM-DD` when making certificates (default: today) | `python3 judging.py certificates` |
| Real certificate list | `--write-site` writes the encrypted records to `src/data/certificates.json` (still `[]` until then) | `src/data/certificates.json` |
| Delete the data | Delete `tools/judging/data/` except the published names and certificate records by 3 August 2027 | `DATES.entryDataDeleted` |

## Filled in

| Item | Value | Where it's set |
|---|---|---|
| Entries open | 16 November 2026 | `DATES.entriesOpen` in `src/site.ts` (Home, Competition, Register) |
| Entry deadline | 17 January 2027, 23:59 Malaysia time (MYT). Ages are counted on this date | `DATES.deadline` and `DEADLINE_TIME` in `src/site.ts` (Competition, Register, the "Entries are open" arch) |
| Results | 3 February 2027 | `DATES.results` in `src/site.ts` (Competition, "How it works") |
| Waitlist form | Tally form `kbdkBR`, share link https://tally.so/r/kbdkBR | `WAITLIST_FORM_ID` in `src/site.ts` (one line; the share link and embed address are built from it) |
| Privacy "Last updated" | 28 October 2026 | `DATES.privacyUpdated` in `src/site.ts`. Change it whenever the notice's wording changes |
| Email retention (Privacy) | 12 months after our last reply | `src/pages/privacy.astro` |
| Under-18s (Privacy) | Waitlist: only an email is collected; parent or guardian should know; a parent can ask us to delete it any time. Entry form: a parent or guardian must agree to the entry, and we may contact the secondary email about this | `src/pages/privacy.astro` |
| Entry data deleted by | 3 August 2027 (emails, ages, essays, payment screenshots, fee support emails; published names and certificate records are kept) | `DATES.entryDataDeleted` in `src/site.ts` (Privacy) |
| Entry form | Tally form `Ar7QeB`, https://tally.so/r/Ar7QeB (shown nowhere while `REGISTRATION_OPEN` is `false`) | `REGISTRATION_URL` in `src/site.ts` (one value) |
| Entry fee wording | RM 40 (about USD 10); with 50% fee support RM 20 (about USD 5). Ringgit leads; the USD figure is only a guide | `ENTRY_FEE`, `ENTRY_FEE_HALF` and the `ENTRY_FEE_*` values in `src/site.ts` |
| Categories and prizes | Junior: 14 and under, prize USD 50. Open: students of any age, prize USD 100. Age is counted on 17 January 2027. Both are for students only. "Prizes are funded separately, not from entry fees." | `CATEGORIES`, `PRIZES_NOTE` in `src/site.ts` (Competition, Register) |
| Bank details | Assembly Ground Sdn Bhd (the company behind T.A.S.K), RHB Bank, account 262111-00010155, reference "PHAROS + your full name". Shown only on `/register/` once `REGISTRATION_OPEN` is `true` (launch day, or the entries-open PR preview) | `BANK` in `src/site.ts` |
| Meals per entry | "Every USD 10 entry funds about 3 meals at T.A.S.K." (figure from T.A.S.K) | `MEALS_PER_ENTRY` in `src/site.ts` (Competition, "Where the money goes") |
| Volunteering card (Home) | Switched on: links to T.A.S.K's Instagram | `SOUP_KITCHEN_INSTAGRAM_URL` in `src/site.ts` |
| About: "Why we started this" | Draft copy written for the owner's review | `src/pages/about.astro` |
| Contact email | pharosprize@gmail.com (a `mailto:` link) | `CONTACT_EMAIL` in `src/site.ts` |
| Soup kitchen logo | `public/images/task-logo-600.webp` and `.png`, used with the soup kitchen's written permission. Shown only on Competition and About (component `src/components/SoupKitchenCard.astro`); never in the header, footer or Pharos wordmark. Alt text: "The Assembly Soup Kitchen (T.A.S.K) logo" | `SoupKitchenCard.astro` |
| Soup kitchen socials | Facebook https://www.facebook.com/theassemblysoupkitchen/ and Instagram https://www.instagram.com/assemblysoupkitchen/ (open in a new tab) | `SOUP_KITCHEN_FACEBOOK_URL` and `SOUP_KITCHEN_INSTAGRAM_URL` in `src/site.ts` |
| Instagram | @pharosprize (links to instagram.com/pharosprize) | `INSTAGRAM_HANDLE` and `INSTAGRAM_URL` in `src/site.ts` |

## Prompts and rubric (published)

The Inaugural Edition's three prompts and the judging rubric are live, whether or not `REGISTRATION_OPEN` is true. Both are set once in `src/site.ts` (`PROMPTS`, `PROMPTS_INTRO`, `RUBRIC`, `RUBRIC_CLOSING`, `RUBRIC_TOTAL`) and read by the Competition page ("The prompts" and "How essays are judged", anchors `#prompts` and `#judging`) and the link on About. The How to enter page no longer repeats the prompts: it links to `/competition/#prompts`. The Competition page shows the rubric as one sentence built from `RUBRIC` (names and marks) plus the PDF download; the descriptors and `RUBRIC_INTRO` are no longer shown on the page (the descriptors are in the PDF). Change the wording in `site.ts` only; the owner-approved text must be copied exactly.

- **Judging criteria PDF.** Done: the PDF is at `public/pharos-judging-criteria.pdf` and the Competition page's "How essays are judged" section has a "Download the judging criteria (PDF)" button to it (a test checks the file exists). If you replace the PDF, keep the same file name, keep it in step with `RUBRIC` in `src/site.ts`, and update `JUDGING_PDF_PAGES` (the page count shown beside the button; the file size is read automatically).
- [ ] **The Tally entry form's prompt question** must list the same three prompts, word for word.
- Next edition: replace `PROMPTS` and `RUBRIC`. The rubric descriptor "causes of hunger" is specific to this edition.

## Waiting on someone else

- **Volunteering details** (Home, "What we do"). The card is live and sends people to T.A.S.K's Instagram. If T.A.S.K wants its own volunteering page or sign-up link, swap the link and wording on the card.
- **Partner band** (Competition, About): shows T.A.S.K's logo, "A fundraiser for The Assembly Soup Kitchen (T.A.S.K)" and links to their Facebook and Instagram. Still to add when their announcement is ready: an endorsement and a link to their post.
- **Privacy notice.** No longer marked "Draft" (approved, Q23). It covers the waitlist and the entry form (Tally), payments, publishing names, proof of student status for winners, publishing a winning essay, fee support emails, under-18s and retention. I could not open Tally's privacy policy from the build environment: the "stored in the European Union" wording comes from search results about Tally's own pages, so please read https://tally.so/help/privacy-policy and check it.
- **Waitlist form settings in Tally.** The form itself is set up in Tally, not on this site: keep a consent tickbox on it, and keep it on a light theme (it sits on a cream card). Delete the waitlist emails once entries close, as the Privacy page promises.

## Slots for launch (marked with comments in `src/pages/competition.astro`, `about.astro` and `register/index.astro`)

- [x] **Rules page link.** Done: `RULES_URL` in `src/site.ts` is `/rules/` (and `FAQ_URL` is `/faq/`). The Register page's "Read the full rules" link and "Questions? Read the FAQ" link, the footer, Home and Competition all read them. The Rules page is `src/pages/rules.astro` (nine numbered rules) and the FAQ is `src/pages/faq.astro` (one native `<details>` per question, each with a stable id such as `#fee-support-how`). Both are indexable, in the sitemap, and show before and after launch. Dates, fees, prizes, the soup kitchen's name and the contact email are built from `src/site.ts`; the wording itself is owner-approved, so edit it only on the owner's say-so. The FAQ's "How do I pay?" links to the How to enter page only once `REGISTRATION_OPEN` is true.
- **Fee support details.** Done: `FEE_SUPPORT` in `src/site.ts` says "Email {CONTACT_EMAIL} with your full name and school. You don't need to explain why." It is built from `CONTACT_EMAIL`, so changing the contact email changes it too, and the Register page shows the address as a mailto link. It sits in a small note inside Step 1 (`id="fee-support"`).
- [x] Rules and questions (FAQ: rules, fee support, who can enter). Done: the Competition page's "Rules and questions" section links to `/rules/` and `/faq/`. There is no refunds question yet; add one to `src/pages/faq.astro` once the owner decides the refund wording.
- [x] **Malay privacy notice (T50).** `/ms/privacy/` is built from `src/pages/ms/privacy.astro` and linked both ways with `/privacy/`. **Keep the two pages in step:** whenever the English Privacy wording changes, the Malay page needs the matching change, and `DATES.privacyUpdated` in `src/site.ts` (shared by both) must be updated.
- "Raised so far" (no target), "Donate without entering", and About's money timeline and transparency note
- Whether a Junior-age entrant can also enter the Open category: the site doesn't say yet. Decide, then add one line to Competition and Register
- "Entries are open" with the Enter button, in place of the waitlist (switched by `REGISTRATION_OPEN`)

## The entry form (Tally, `Ar7QeB`)

The form is set up in Tally, not on this site. I could not open it from the build environment, so please check it matches the Privacy page and the Register page:

- Questions: full name, email, country, school (optional), age on 17 January 2027, chosen prompt, essay (PDF), fee choice, fee support code (if any), payment screenshot, transfer reference, the name on the paying account, and a secondary email for under-18s.
- The fee options must read exactly "RM 40 (about USD 10)" and "Fee support at 50%: RM 20 (about USD 5)" (or update `[fees]` in `tools/entry-admin/config.toml` to match).
- Tickboxes: agree to us storing details and the essay (as set out in the Privacy notice); name may be published if shortlisted or winning (name only, and it stays published after the competition); for under-18s, a parent or guardian agrees. The Register page's under-18 line says the same.
- Ask T.A.S.K to share its list of incoming transfers (date, amount, reference), as the Privacy page says.

## Decided values for launch

| Item | Decided value |
|---|---|
| Entry fee | RM 40 (about USD 10), with 50% fee support: RM 20 (about USD 5). Fee support is 50% only: there is no free waiver |
| Prizes | Junior (14 and under): USD 50. Open (students of any age): USD 100. Funded separately, not from entry fees |
| Payment | Bank transfer in ringgit directly to T.A.S.K's account. Pharos never handles the money. No payment code or link on the site |

## Social post maker (`tools/social/`)

The three folders in `tools/social/posts/example-*` are samples with invented content. Copy one to start a real post, and don't publish the examples. These are the bracketed placeholders inside them, to replace in a real post:

| Placeholder | What it is | Where |
|---|---|---|
| Soup kitchen name (was a placeholder) | **Done.** Now spelled The Assembly Soup Kitchen (T.A.S.K) in the sample post. Copy that spelling exactly; the lint warns about any other spelling. | `posts/example-announcement/post.yaml` |
| Fee wording | The sample's fee-support slide says fee support is 50% (RM 20, about USD 5, instead of RM 40, about USD 10), never a free waiver. Keep it in step with `ENTRY_FEE` and `ENTRY_FEE_HALF` in `src/site.ts` if the fee changes. The sample caption says "two categories (Junior, 14 and under, and Open, any age)". | `posts/example-announcement/post.yaml` |
| `[month]`, `[deadline date]`, `[word limit]`, `[fee]`, `[contact email]`, `[link in bio]`, `[N] days left` | Real dates, fee and contact once decided. For the countdown use `deadline: YYYY-MM-DD` and `{days_left}` instead of `[N]`. | `posts/example-announcement/post.yaml` |
| `[Publisher]`, `[Artist Name]`, `[Gallery or website]`, `[the artist or owner]` | Real credits for a real post. | `posts/example-report/`, `posts/example-artwork/` |

Already filled in: the Instagram handle on the posts is read from `INSTAGRAM_HANDLE` in `src/site.ts`, and the edition label ("Inaugural edition: Goal 2", matching the Competition page) is `edition_label` in `tools/social/brand.yaml`. Change the label when a new edition starts.

## Entry-admin toolkit (`tools/entry-admin/`)

Settings and wording for the entry-processing tools (tracker, email drafts, judging pack). All of it is in `tools/entry-admin/config.toml` and `tools/entry-admin/templates/`; `tools/entry-admin/README.md` explains the tools.

| Placeholder | Where | What to put |
|---|---|---|
| Soup kitchen name | `config.toml`, `[email] soup_kitchen` | Set to The Assembly Soup Kitchen (T.A.S.K) (written permission, 24 Oct 2026). Keep it in step with `SOUP_KITCHEN_NAME` in `src/site.ts`. |
| Site name `Pharos` | `config.toml`, `[email] site_name` | Keep in step with `SITE_NAME` in `src/site.ts` if the name changes. |
| Contact email `pharosprize@gmail.com` | `config.toml`, `[email] contact_email` | Must match `CONTACT_EMAIL` in `src/site.ts`. A toolkit test fails if the two differ. |
| Edition wording | `config.toml`, `[email] edition` | Check it reads right. |
| Fee answers | `config.toml`, `[fees]` | Set to "RM 40 (about USD 10)" and "Fee support at 50%: RM 20 (about USD 5)". Must match the Tally fee options word for word. If you edit the form's wording or prices, update this or every entry is flagged. |
| Question titles | `config.toml`, `[columns]` | Checked against the live Tally form on 26 October 2026. Payment columns are "Proof of payment", "Transfer reference or transaction ID" and "Name on the account you paid from"; the age column is "Age on 17 January 2027". If you rename a question in Tally, change the matching title here. The secondary-email question is not read by the toolkit. |
| Word limit, entry ID prefix | `config.toml`, `[entry]` | Confirm 800 words and `ZH`. There is no age limit any more (Open is for any age); the toolkit now flags only an age it can't read. |
| Email wording | `templates/*.txt`, `templates/flag_messages.toml` | Read through and adjust the drafts' wording before first use. |

## The Register page (switched by `REGISTRATION_OPEN`: `REGISTRATION_SWITCH` on launch day, or the entries-open PR preview)

The "How to enter" page (`src/pages/register/index.astro`) is three numbered steps: "Before you start" (one sentence and links to the prompts and the full rules), Step 1 pay (the bank transfer details, with fee support as a note inside it), Step 2 the external Tally form, Step 3 "We confirm". On desktop a sticky plum panel holds the title and an "At a glance" list. While `REGISTRATION_OPEN` is `false` (`src/site.ts`; the pre-launch site) it shows only an "Opening soon" notice, so none of that is on the pre-launch site. Nothing links to it either. Its settings are in `src/site.ts` (`REGISTRATION_URL`, `BANK`, `ENTRY_FEE*`, `FEE_SUPPORT`, `RULES_URL`, `FAQ_URL`, `CATEGORIES`). There is no payment code and no payment link: entrants pay by bank transfer outside the site.
