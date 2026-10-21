# Placeholders

Everything on the site that is still a placeholder, so the owner can fill it in later.
Search the code for the bracketed text (for example `[month]`) to find each one.

## Before sharing the site

- [ ] **Replace the sample blog cards with real posts.** The blog index shows six sample titles marked "Sample titles". They don't link anywhere. They live in `sampleCards` in `src/pages/blog/index.astro`; delete them once real posts exist.
- [ ] **Replace the sample post.** `src/content/blog/sample-post.md` is placeholder text (`[Launch post title]`, `[Date]`, `[Category]`, lorem ipsum, `[Image]`, sources) that shows the post template. Write the real launch post as a new Markdown file in the same folder and delete the sample.

## Fill in anywhere it appears

| Placeholder | What it is | Where |
|---|---|---|
| `[Soup Kitchen Name]` | The partner soup kitchen. **Don't name it until written permission arrives.** | Home, Competition, About, Register |
| `[month]` | Month entries open | Home, Competition |
| `[date]` | Entry deadline | Competition (key facts, "How it works", Register button), Home (Register button), Register (the rules) |
| `[results date]` | When winners are announced | Competition ("How it works") |
| `[Founder's why paragraph]` | Why you started Pharos, in your words | About |
| `[date]` (Privacy) | "Last updated" date of the privacy notice | Privacy |
| `[retention period]` | How long you keep emails people send you | Privacy |
| `[How we handle the data of entrants under 18.]` | Your approach for under-18s, e.g. parent or guardian consent | Privacy |

## Registration (the "How to enter" page, `/register/`)

One plain information page. All entering happens in the external Tally form: the age check, consent tickboxes, PDF essay upload and proof of payment. There is no confirmation page on this site; Tally shows its own thank-you message.

| Placeholder | What it is | Where |
|---|---|---|
| `[payment link]` | A plain PayPal payment link that pays `[Soup Kitchen Name]`'s own account. No payment code on this site | `PAYMENT_URL` in `src/site.ts` |
| `[full rules link]` | Link to the full rules once they are published | `RULES_URL` in `src/site.ts` |
| `[fee support details]` | How to ask for fee support (e.g. "email the contact address") | `FEE_SUPPORT` in `src/site.ts` |
| `[Prompt 1]` to `[Prompt 3]` | The three prompts. They are not public, so the page only says they are published when entries open. A commented slot in `src/pages/register/index.astro` (under "The rules, in short") marks where to put them | Register |
| `[date]` | Entry deadline | Register ("Submit by") |
| `[Parent/guardian line to be confirmed]` | The under-18 consent wording, beside the "Enter now" button | Register ("Enter") |

Set in `src/site.ts`: `ENTRY_FEE` is `USD 10` and `ENTRY_FEE_HALF` is `USD 5` (the fee after the 50% fee support waiver). Check them before this goes live.

While `REGISTRATION_URL`, `PAYMENT_URL` or `RULES_URL` still starts with `[`, the page shows a dashed "Placeholder" card instead of a link. Paste the real address in `src/site.ts` and it becomes a link on its own.

### What to set up outside this website (in Tally)

- **The Tally form** should do all the entering: the age check (20 and under), the consent tickboxes (the rules, own work without AI, no refunds for unfinished or late essays, and "I agree to Pharos storing my details and essay to run this competition, as set out in our Privacy notice"), the under-18 line, and the questions: Name, Email, Country, School (optional), Which prompt, the essay as a **PDF upload** (up to 800 words), proof of payment (screenshot of the PayPal confirmation, always required, including with fee support) and an optional fee support code.
- **Thank-you message:** Tally shows its own. Set it in Tally ("After submit"). There is no `/register/done/` page on this site any more.
- **Fee support**: a 50% waiver only (the fee drops to `ENTRY_FEE_HALF`; proof of payment is still required). Requests close 5 days before the deadline. You reply within 72 hours with a code the entrant types into the form. You also promise to check payments and email entrants within 72 hours.
- **Entry references** and the design's emails (registered, payment not confirmed, fee support approved, not this time) are handled by you outside the site.
- **Judging:** the site does not promise anonymous judging. If you do remove names before marking, that is your own process; Tally collects the name.

## Filled in

| Item | Value | Where it's set |
|---|---|---|
| Contact email | pharosprize@gmail.com (a `mailto:` link) | `CONTACT_EMAIL` in `src/site.ts` |
| Instagram | @pharosprize (links to instagram.com/pharosprize) | `INSTAGRAM_HANDLE` and `INSTAGRAM_URL` in `src/site.ts` |

## Waiting on someone else

- **Waitlist.** Retired: Home and Competition both have a Register button (`src/components/Waitlist.astro`, which now holds only that button). Nothing is collected on those pages.
- **Volunteering** (Home, "What we do"). Goes live once [Soup Kitchen Name] agrees to be named.
- **Partner band** (Competition, About): "Partner announcement coming soon" until [Soup Kitchen Name] agrees. Then add their name, logo, endorsement and a link to their post.
- **Privacy notice.** A draft marked "Draft" on the page. Review it, and update it before entries open. It still mentions a waitlist; edit that wording.

## Slots for launch (marked with comments in `src/pages/competition.astro` and `about.astro`)

- Entry fee, fee support and grand prize as key facts
- PayPal payment link on the Competition page (the Register page already has its own `PAYMENT_URL`; payments go straight to the soup kitchen's own account; no payment code on this site)
- The three prompts (the page shows "A personal / policy / systemic prompt" until then)
- Published rubric link
- Rules and questions (FAQ: rules, rubric, fee support, refunds, who can enter, judging)
- "Where the money goes", meals per entry, "Raised so far" (no target), "Donate without entering", and About's money timeline and transparency note

## Decided values for launch (not shown on pre-launch pages)

| Item | Decided value |
|---|---|
| Entry fee | USD 10, with 50% fee support (USD 5) for anyone who can't afford it |
| Grand prize | USD 100 |

Pre-launch pages don't show fees, prizes or how the money flows, because the soup kitchen hasn't agreed the payment route yet.
