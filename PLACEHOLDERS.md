# Placeholders

Everything on the site that is still a placeholder, so the owner can fill it in later.
Search the code for the bracketed text (for example `[payment link]`) to find each one.

## Launch-day switch

- [ ] **Open registration: set `REGISTRATION_OPEN` to `true` in `src/site.ts`.** It is `false` now. While it is `false` the site is in its pre-launch state: the closing arch on Home and Competition is the waitlist (the Tally form set by `WAITLIST_FORM_ID`), `/register/` shows only an "Opening soon" notice (hidden from search engines, no fee or payment wording), and the entry form link (`REGISTRATION_URL`) appears nowhere on the built site. Set it to `true` and the arch becomes "Entries are open" with a Register button, and `/register/` shows the full How to enter page with the "Enter now" button. Before you do: check the dates in `DATES` (`src/site.ts`), fill in the payment and fee-support values (see "Parked: the Register page" below), the consent tickboxes in Tally and the under-18 line, and check the fee wording matches the decided values.

## Before sharing the site

- [ ] **Publish the first real blog post.** Until there is one, the blog page says "First posts coming soon". `src/content/blog/sample-post.md` is the template (placeholder text such as `[Launch post title]`, lorem ipsum, `[Image]`, sources). It is marked `draft: true`, so it is not on the live site. To write a post, copy that file in the same folder, fill it in and leave `draft` out. Don't state facts or numbers without a source.

## Fill in anywhere it appears

| Placeholder | What it is | Where |
|---|---|---|
| `[Soup Kitchen Name]` | The partner soup kitchen. **Don't name it until written permission arrives.** Set once as `SOUP_KITCHEN_NAME` in `src/site.ts` (used on Home and the Register page). Not wired to it, on purpose: the Volunteering card on Home, the "Partner announcement coming soon" lines on Competition and About, and the marked comments for launch. Replace those by hand when the name is agreed | `src/site.ts`, Home, Register |

## Certificate verification (`/verify/`)

The page works already, but `src/data/certificates.json` is an empty array, so every code shows "We couldn't find that code" until the judging tool produces the real file.

| Item | What it is | Where |
|---|---|---|
| `src/data/certificates.json` | The real list, **encrypted** by the judging tool: `[{ "id", "iv", "data" }]`. Nobody can read names from the page source; each record opens only with its own code. The exact scheme, a test vector and how to try it are in `src/data/README.md`. The build stops if the file holds anything readable | `src/data/` |
| Certificate codes | 8 characters shown as `XXXX-XXXX` (Crockford base32: 0-9 and A-Z without I, L, O, U), random. `node scripts/encrypt-certificates.mjs` can generate them; the scheme is version 2 (slow, salted ids, 100,000 rounds). 8 characters are 40 bits: fine against casual guessing, but a determined attacker with rented hardware could eventually find some codes. See "How safe are 8-character codes?" in `src/data/README.md` | judging tool |
| Entry form consent (Tally) | Add a tickbox so entrants agree that **their name may be published if they are shortlisted or win** (the Privacy page says they agree on the entry form) | Tally form |
| Privacy notice | Updated for the certificate check and publishing names. Still a draft for the owner to review | Privacy |

## Filled in

| Item | Value | Where it's set |
|---|---|---|
| Entries open | 1 December 2026 | `DATES.entriesOpen` in `src/site.ts` (Home, Competition, Register) |
| Entry deadline | 31 January 2027 | `DATES.deadline` in `src/site.ts` (Competition, Register, the "Entries are open" arch) |
| Results | by 28 February 2027 | `DATES.results` in `src/site.ts` (Competition, "How it works") |
| Waitlist form | Tally form `kbdkBR`, share link https://tally.so/r/kbdkBR | `WAITLIST_FORM_ID` in `src/site.ts` (one line; the share link and embed address are built from it) |
| Privacy "Last updated" | 22 October 2026 | `DATES.privacyUpdated` in `src/site.ts`. Change it whenever the notice's wording changes |
| Email retention (Privacy) | 12 months after our last reply | `src/pages/privacy.astro` |
| Under-18s (Privacy) | Only an email is collected for the waitlist; parent or guardian should know; a parent can ask us to delete it any time | `src/pages/privacy.astro` |
| About: "Why we started this" | Draft copy written for the owner's review | `src/pages/about.astro` |
| Contact email | pharosprize@gmail.com (a `mailto:` link) | `CONTACT_EMAIL` in `src/site.ts` |
| Instagram | @pharosprize (links to instagram.com/pharosprize) | `INSTAGRAM_HANDLE` and `INSTAGRAM_URL` in `src/site.ts` |

## Waiting on someone else

- **Volunteering** (Home, "What we do"). Goes live once [Soup Kitchen Name] agrees to be named.
- **Partner band** (Competition, About): "Partner announcement coming soon" until [Soup Kitchen Name] agrees. Then add their name, logo, endorsement and a link to their post.
- **Privacy notice.** A draft marked "Draft" on the page. It now covers the waitlist (Tally). Review it, and update it before entries open (the entry form collects more).
- **Waitlist form settings in Tally.** The form itself is set up in Tally, not on this site: keep a consent tickbox on it, and keep it on a light theme (it sits on a cream card). Delete the waitlist emails once entries close, as the Privacy page promises.

## Slots for launch (marked with comments in `src/pages/competition.astro` and `about.astro`)

- Entry fee, fee support and grand prize as key facts
- PayPal payment link (payments go straight to the soup kitchen's own account; no payment code on this site)
- The three prompts (the page shows "A personal / policy / systemic prompt" until then)
- Published rubric link
- Rules and questions (FAQ: rules, rubric, fee support, refunds, who can enter, judging)
- "Where the money goes", meals per entry, "Raised so far" (no target), "Donate without entering", and About's money timeline and transparency note
- "Entries are open" with the Enter button, in place of the waitlist

## Decided values for launch (not shown on pre-launch pages)

| Item | Decided value |
|---|---|
| Entry fee | USD 10, with 50% fee support (USD 5) for anyone who can't afford it. Fee support is 50% only: there is no free waiver |
| Grand prize | USD 100 |

Pre-launch pages don't show fees, prizes or how the money flows, because the soup kitchen hasn't agreed the payment route yet.

## Social post maker (`tools/social/`)

The three folders in `tools/social/posts/example-*` are samples with invented content. Copy one to start a real post, and don't publish the examples. These are the bracketed placeholders inside them, to replace in a real post:

| Placeholder | What it is | Where |
|---|---|---|
| `[Soup Kitchen Name]` | The partner soup kitchen. **Don't name it until written permission arrives.** | `posts/example-announcement/post.yaml` |
| `[month]`, `[deadline date]`, `[word limit]`, `[fee]`, `[contact email]`, `[link in bio]`, `[N] days left` | Real dates, fee and contact once decided. For the countdown use `deadline: YYYY-MM-DD` and `{days_left}` instead of `[N]`. | `posts/example-announcement/post.yaml` |
| `[Publisher]`, `[Artist Name]`, `[Gallery or website]`, `[the artist or owner]` | Real credits for a real post. | `posts/example-report/`, `posts/example-artwork/` |

Already filled in: the Instagram handle on the posts is read from `INSTAGRAM_HANDLE` in `src/site.ts`, and the edition label ("Inaugural edition: Goal 2", matching the Competition page) is `edition_label` in `tools/social/brand.yaml`. Change the label when a new edition starts.

## Entry-admin toolkit (`tools/entry-admin/`)

Settings and wording for the entry-processing tools (tracker, email drafts, judging pack). All of it is in `tools/entry-admin/config.toml` and `tools/entry-admin/templates/`; `tools/entry-admin/README.md` explains the tools.

| Placeholder | Where | What to put |
|---|---|---|
| `[Soup Kitchen Name]` | `config.toml`, `[email] soup_kitchen` | Leave as is until written permission to name the soup kitchen arrives. |
| Site name `Pharos` | `config.toml`, `[email] site_name` | Keep in step with `SITE_NAME` in `src/site.ts` if the name changes. |
| Contact email `pharosprize@gmail.com` | `config.toml`, `[email] contact_email` | Must match `CONTACT_EMAIL` in `src/site.ts`. A toolkit test fails if the two differ. |
| Edition wording | `config.toml`, `[email] edition` | Check it reads right. |
| Fee answers | `config.toml`, `[fees]` | Must match the Tally fee options word for word. If you edit the form's wording or prices, update this or every entry is flagged. |
| Question titles | `config.toml`, `[columns]` | Set to the final Tally form; change if a question is renamed. |
| Word limit, age limit, entry ID prefix | `config.toml`, `[entry]` | Confirm 800 words, 20 and under, `ZH`. |
| Email wording | `templates/*.txt`, `templates/flag_messages.toml` | Read through and adjust the drafts' wording before first use. |

## The Register page (switched by `REGISTRATION_OPEN`)

The "How to enter" page (`src/pages/register/index.astro`) has the entry fee, fee support, a PayPal link and a link to the external Tally form. While `REGISTRATION_OPEN` is `false` (`src/site.ts`) it shows only an "Opening soon" notice, so none of that is on the pre-launch site. Nothing links to it either. Its settings are in `src/site.ts` (`REGISTRATION_URL`, `PAYMENT_URL`, `ENTRY_FEE`, `ENTRY_FEE_HALF`, `FEE_SUPPORT`, `RULES_URL`). Before you open registration: the fee and fee-support wording must match the decided values above (USD 10, 50% fee support = USD 5), and the payment route must be agreed with the soup kitchen. The full write-up (Tally setup and the page's placeholders) is in PR #3 and its branch `page/registration`.
