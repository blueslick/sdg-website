# Placeholders

Everything on the site that is still a placeholder, so the owner can fill it in later.
Search the code for the bracketed text (for example `[month]`) to find each one.

## Before sharing the site

- [ ] **Replace the sample blog cards with real posts.** The blog index shows six sample titles marked "Sample titles". They don't link anywhere.

## Fill in anywhere it appears

| Placeholder | What it is | Where |
|---|---|---|
| `[Soup Kitchen Name]` | The partner soup kitchen. **Don't name it until written permission arrives.** | Home, Competition, About |
| `[month]` | Month entries open | Home, Competition |
| `hello@[domain]` | Contact email. Once known, set `CONTACT_EMAIL` in `src/site.ts` and make it a `mailto:` link in `src/components/SiteFooter.astro`. | Footer, Contact |
| `@[handle]` | Instagram handle. Set `INSTAGRAM_HANDLE` in `src/site.ts` and make it a link. | Footer, waitlist |

## Waiting on someone else

- **Waitlist form.** Disabled placeholder ("Opening soon") in `src/components/Waitlist.astro`. Nothing is collected. Replace it with the form embed (e.g. Tally) and keep the consent line and Privacy link next to it.
- **Volunteering** (Home, "What we do"). Goes live once [Soup Kitchen Name] agrees to be named.

## Decided values for launch (not shown on pre-launch pages)

| Item | Decided value |
|---|---|
| Entry fee | USD 10, with a free fee waiver for anyone who can't afford it |
| Grand prize | USD 100 |

Pre-launch pages don't show fees, prizes or how the money flows, because the soup kitchen hasn't agreed the payment route yet.
