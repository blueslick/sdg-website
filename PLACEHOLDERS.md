# Placeholders

Everything on the site that is still a placeholder, so the owner can fill it in later.
Search the code for the bracketed text (for example `[month]`) to find each one.

## Launch-day switch

- [ ] **Open registration: set `REGISTRATION_OPEN` to `true` in `src/site.ts`.** It is `false` now. While it is `false` the site is in its pre-launch state: the closing arch on Home and Competition is the disabled waitlist ("Opening soon", collects nothing), `/register/` shows only an "Opening soon" notice (hidden from search engines, no fee or payment wording), and the Tally form link appears nowhere on the built site. Set it to `true` and the arch becomes "Entries are open" with a Register button, and `/register/` shows the full How to enter page with the "Enter now" button. Before you do: fill in `[month]`, `[date]`, the payment and fee-support values (see "Parked: the Register page" below), the consent tickboxes in Tally and the under-18 line, and check the fee wording matches the decided values.

## Before sharing the site

- [ ] **Publish the first real blog post.** Until there is one, the blog page says "First posts coming soon". `src/content/blog/sample-post.md` is the template (placeholder text such as `[Launch post title]`, lorem ipsum, `[Image]`, sources). It is marked `draft: true`, so it is not on the live site. To write a post, copy that file in the same folder, fill it in and leave `draft` out. Don't state facts or numbers without a source.

## Fill in anywhere it appears

| Placeholder | What it is | Where |
|---|---|---|
| `[Soup Kitchen Name]` | The partner soup kitchen. **Don't name it until written permission arrives.** | Home, Competition, About |
| `[month]` | Month entries open | Home, Competition, Register (while registration is closed) |
| `[date]` | Entry deadline | Competition (key facts, "How it works") |
| `[results date]` | When winners are announced | Competition ("How it works") |
| `[Founder's why paragraph]` | Why you started Pharos, in your words | About |
| `[date]` (Privacy) | "Last updated" date of the privacy notice | Privacy |
| `[retention period]` | How long you keep emails people send you | Privacy |
| `[How we handle the data of entrants under 18.]` | Your approach for under-18s, e.g. parent or guardian consent | Privacy |

## Filled in

| Item | Value | Where it's set |
|---|---|---|
| Contact email | pharosprize@gmail.com (a `mailto:` link) | `CONTACT_EMAIL` in `src/site.ts` |
| Instagram | @pharosprize (links to instagram.com/pharosprize) | `INSTAGRAM_HANDLE` and `INSTAGRAM_URL` in `src/site.ts` |

## Waiting on someone else

- **Waitlist form.** Disabled placeholder ("Opening soon") in `src/components/Waitlist.astro`. Nothing is collected. Replace it with the form embed (e.g. Tally) and keep the consent line and Privacy link next to it.
- **Volunteering** (Home, "What we do"). Goes live once [Soup Kitchen Name] agrees to be named.
- **Partner band** (Competition, About): "Partner announcement coming soon" until [Soup Kitchen Name] agrees. Then add their name, logo, endorsement and a link to their post.
- **Privacy notice.** A draft marked "Draft" on the page. Review it, and update it before the waitlist or entries open.

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

## The Register page (switched by `REGISTRATION_OPEN`)

The "How to enter" page (`src/pages/register/index.astro`) has the entry fee, fee support, a PayPal link and a link to the external Tally form. While `REGISTRATION_OPEN` is `false` (`src/site.ts`) it shows only an "Opening soon" notice, so none of that is on the pre-launch site. Nothing links to it either. Its settings are in `src/site.ts` (`REGISTRATION_URL`, `PAYMENT_URL`, `ENTRY_FEE`, `ENTRY_FEE_HALF`, `FEE_SUPPORT`, `RULES_URL`). Before you open registration: the fee and fee-support wording must match the decided values above (USD 10, 50% fee support = USD 5), and the payment route must be agreed with the soup kitchen. The full write-up (Tally setup and the page's placeholders) is in PR #3 and its branch `page/registration`.
