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
