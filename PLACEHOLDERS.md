# Placeholders

Everything on the site that is still a placeholder, so the owner can fill it in later.
Search the code for the bracketed text (for example `[month]`) to find each one.

## Before sharing the site

- [ ] **Replace the sample blog cards with real posts.** The blog index shows six sample titles marked "Sample titles". They don't link anywhere. They live in `sampleCards` in `src/pages/blog/index.astro`; delete them once real posts exist.
- [ ] **Replace the sample post.** `src/content/blog/sample-post.md` is placeholder text (`[Launch post title]`, `[Date]`, `[Category]`, lorem ipsum, `[Image]`, sources) that shows the post template. Write the real launch post as a new Markdown file in the same folder and delete the sample.

## Fill in anywhere it appears

| Placeholder | What it is | Where |
|---|---|---|
| `[Soup Kitchen Name]` | The partner soup kitchen. **Don't name it until written permission arrives.** | Home, Competition, About |
| `[month]` | Month entries open | Home, Competition |
| `[date]` | Entry deadline | Competition (key facts, "How it works", Register button), Register (steps 2 and 5) |
| `[results date]` | When winners are announced | Competition ("How it works"), Register (step 2) |
| `[Founder's why paragraph]` | Why you started Pharos, in your words | About |
| `[date]` (Privacy) | "Last updated" date of the privacy notice | Privacy |
| `[retention period]` | How long you keep emails people send you | Privacy |
| `[How we handle the data of entrants under 18.]` | Your approach for under-18s, e.g. parent or guardian consent | Privacy |

## Registration (the Register pages, `/register/` and `/register/done/`)

| Placeholder | What it is | Where |
|---|---|---|
| `[registration link]` | The external form (Tally, Google Form, etc.) where entrants submit their details and essay | `REGISTRATION_URL` in `src/site.ts` |
| `[payment link]` | A plain PayPal payment link that pays `[Soup Kitchen Name]`'s own account. No payment code on this site | `PAYMENT_URL` in `src/site.ts` |
| `[full rules link]` | Link to the full rules once they are published | `RULES_URL` in `src/site.ts` |
| `[fee support details]` | How to ask for fee support (e.g. "email the contact address") | `FEE_SUPPORT` in `src/site.ts` |
| `[Prompt 1]` to `[Prompt 3]` | The three prompts (the page shows the design's short descriptions until they are published) | Register step 1, `src/pages/register/index.astro` |
| `[date]` | Entry deadline | Register step 2 ("Submit by"), Register done page |
| `[dates]` | Judging dates | Register done page |
| `[date]` (results) | Results date | Register done page |
| `[Parent/guardian line to be confirmed]` | The under-18 consent wording, beside the registration form link | Register step 4 |

Set in `src/site.ts` from the registration design: `ENTRY_FEE` is `USD 10` and `ENTRY_FEE_HALF` is `USD 5` (the half-fee support amount). Check them before this goes live.

While `REGISTRATION_URL`, `PAYMENT_URL` or `RULES_URL` still starts with `[`, the page shows a dashed "Placeholder" card instead of a link. Paste the real address in `src/site.ts` and it becomes a link on its own.

### What to set up outside this website

- **The registration form** should ask for: Name (removed before judging), Email, Country, School (optional), Which prompt, the essay (pasted text, or a Word document or PDF up to 800 words), proof of payment (PayPal confirmation screenshot, transaction ID, email used to pay; not needed if the fee is fully covered) and an optional fee support code. It should also carry the consent tickbox ("I agree to Pharos storing my details and essay to run this competition, as set out in our Privacy notice") and the under-18 line.
- **Form redirect:** set the form's "redirect on completion" to `/register/done/` (the "Your essay is in" page).
- **Entry references** (the design's `ZH-0427`) are not on the site: it can't issue them. If you want them, the form tool needs to create them.
- **Fee support**: requests, approval, codes and the emails in the design (registered, payment not confirmed, fee support approved, not this time) are handled by you outside the site.

## Filled in

| Item | Value | Where it's set |
|---|---|---|
| Contact email | pharosprize@gmail.com (a `mailto:` link) | `CONTACT_EMAIL` in `src/site.ts` |
| Instagram | @pharosprize (links to instagram.com/pharosprize) | `INSTAGRAM_HANDLE` and `INSTAGRAM_URL` in `src/site.ts` |

## Waiting on someone else

- **Waitlist form (Home only).** The Competition page now has a Register button instead. Disabled placeholder ("Opening soon") in `src/components/Waitlist.astro`. Nothing is collected. Replace it with the form embed (e.g. Tally) and keep the consent line and Privacy link next to it.
- **Volunteering** (Home, "What we do"). Goes live once [Soup Kitchen Name] agrees to be named.
- **Partner band** (Competition, About): "Partner announcement coming soon" until [Soup Kitchen Name] agrees. Then add their name, logo, endorsement and a link to their post.
- **Privacy notice.** A draft marked "Draft" on the page. Review it, and update it before the waitlist or entries open.

## Slots for launch (marked with comments in `src/pages/competition.astro` and `about.astro`)

- Entry fee, fee waiver and grand prize as key facts
- PayPal payment link on the Competition page (the Register page already has its own `PAYMENT_URL`; payments go straight to the soup kitchen's own account; no payment code on this site)
- The three prompts (the page shows "A personal / policy / systemic prompt" until then)
- Published rubric link
- Rules and questions (FAQ: rules, rubric, fee waiver, refunds, who can enter, judging)
- "Where the money goes", meals per entry, "Raised so far" (no target), "Donate without entering", and About's money timeline and transparency note

## Decided values for launch (not shown on pre-launch pages)

| Item | Decided value |
|---|---|
| Entry fee | USD 10, with a free fee waiver for anyone who can't afford it |
| Grand prize | USD 100 |

Pre-launch pages don't show fees, prizes or how the money flows, because the soup kitchen hasn't agreed the payment route yet.
