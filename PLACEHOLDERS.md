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

- Entry fee, fee waiver and grand prize as key facts
- PayPal payment link (payments go straight to the soup kitchen's own account; no payment code on this site)
- The three prompts (the page shows "A personal / policy / systemic prompt" until then)
- Published rubric link
- Rules and questions (FAQ: rules, rubric, fee waiver, refunds, who can enter, judging)
- "Where the money goes", meals per entry, "Raised so far" (no target), "Donate without entering", and About's money timeline and transparency note
- "Entries are open" with the Enter button, in place of the waitlist

## Decided values for launch (not shown on pre-launch pages)

| Item | Decided value |
|---|---|
| Entry fee | USD 10, with a free fee waiver for anyone who can't afford it |
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

## Parked: the Register page

A "How to enter" page (`/register/`) with the entry fee, fee support, a PayPal link and a link to the external Tally form was built, but it is **not part of the live site** yet. Its code is kept, switched off, in `src/pages/_register/` (a leading underscore makes Astro skip it; rename the folder to `register` to bring it back), with its settings in `src/site.ts` (`REGISTRATION_URL`, `PAYMENT_URL`, `ENTRY_FEE`, `ENTRY_FEE_HALF`, `FEE_SUPPORT`, `RULES_URL`). Nothing on the site links to it. Before it goes live: the fee and fee-support wording must match the decided values above, the payment route must be agreed with the soup kitchen, and the Home and Competition closing arch must change from the waitlist placeholder to a Register button. The full write-up (Tally setup and the page's placeholders) is in PR #3 and its branch `page/registration`.
