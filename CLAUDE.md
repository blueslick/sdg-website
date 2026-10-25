# CLAUDE.md — Youth SDG Essay Competition website

Read this at the start of every session. It sets the rules for this repo.

## What this is

The website for an independently run online essay competition for students, in two prize categories (Junior: 14 and under, USD 50; Open: any age, USD 100; age counted on the deadline), built around the UN Sustainable Development Goals with a social-justice focus. Each edition features one SDG. The Inaugural Edition is SDG 2 (Zero Hunger) and is a fundraiser for a local soup kitchen.

The site owner is a student. Explain technical steps in plain language and don't assume prior setup knowledge.

## Working alongside other sessions
- Several Claude sessions may run at once. Each works only on its own new branch, created from the latest main.
- Never push to, rebase, or merge into another session's branch or any branch you didn't create.
- Never merge a pull request. Only the owner merges.
- If your task needs work from another open PR, stop and tell the owner instead of merging it in.
- Expect conflicts in PLACEHOLDERS.md, site.ts and .gitignore; keep both sides when resolving.

## Current phase: pre-launch

Build only these pages:

| Page | Job |
|---|---|
| Home | Say what this is in seconds, then send people to the right page. Waitlist signup. |
| Competition | Edition theme (Zero Hunger), "opening [month]", waitlist signup. |
| About | Who runs it ("run by student volunteers") and why. |
| Blog | Index page plus one sample post template. Posts are Markdown files. |
| Contact | One contact email (placeholder until the owner supplies it). |
| Privacy | Privacy notice (draft, marked for owner review). |
| Verify | Certificate check at `/verify/`: type a code, see the name, award, edition and issue date. Fully static: the encrypted records in `src/data/certificates.json` are built into the page; the browser derives the id and key from the typed 8-character code (PBKDF2), finds the record and decrypts it with Web Crypto (scheme in `src/lib/certificateScheme.ts`, documented in `src/data/README.md`). No plain-text names anywhere in the site. Linked from the footer only, `noindex`. The judging tool will produce the real file; until then it is an empty array. |

Not yet: prompts, rules, rubric, fees, payment, "raised so far" counter, results. Leave clearly marked slots where these will go.

## Tech decisions

- **Framework:** Astro, building a fully static site. Blog posts are Markdown in a content collection.
- **Hosting:** Firebase Hosting, in a **new, dedicated Firebase project** for this site.
  - Never deploy to, modify or reuse the owner's other Firebase project. The Firebase project is `pharos-prize`. GitHub Actions does every deploy (a pull request = a preview link, a merge to `main` = the live site). Never run any `firebase` CLI command (deploy, use, login, init, hosting:channel:deploy). Cloud sessions are not logged in to Firebase and must not try.
- **Fonts:** self-host Gloock (display), Instrument Sans (body) and Kaushan Script (wordmark) via Fontsource. No external font requests. Kaushan Script is for small decorative accents only (the Pharos wordmark), never body text or essential information.
- **No analytics, trackers or third-party scripts** unless the owner asks. The one approved exception: Tally's embed script (`tally.so`), loaded only on pages that show the waitlist form. Add no others.
- **Site name:** take the working name from the design handoff and store it in one config value, so a rename is a single change.

## Design

- The design comes from the Claude Design handoff bundle (or the `design/` folder). It is the source of truth for layout and style.
- Use `tokens.json` for every colour, type size, space and radius as CSS custom properties. No hard-coded colours.
- Light only: there is no dark theme. Coral and dusty pink are fills, never text on cream or peach.
- `edition` is the only token that changes between editions. Use it for one shape per screen (the disc), never for text.
- **Hook mode vs facts mode:** anything said in giant cropped display type must also appear as plain readable text on the same screen.
- Mobile first. Body text never under 16px. Text must meet 4.5:1 contrast. Every image gets alt text, including the word mosaic.
- Apply the owner's wording changes when they give them.

## Content red lines (never break these)

- Never call the organisation a charity, non-profit, not-for-profit, NGO, foundation or society. Approved wording: "run by student volunteers" and "a fundraiser for The Assembly Soup Kitchen (T.A.S.K)".
- The beneficiary is The Assembly Soup Kitchen (T.A.S.K), named with written permission (24 Oct 2026). Use SOUP_KITCHEN_NAME; never hard-code or re-spell it.
- No invented team members, testimonials, past editions, judges, statistics or partner logos.
- No public fundraising target.
- Don't use "UN", "United Nations" or "Global Goals" in the site name or branding. Name SDGs in text only. Don't use official SDG icons or the colour wheel.
- No photos of people in poverty or being served. Typography, shapes, food, hands and students only.
- Don't write blog post content that states facts or numbers unless the owner supplies the source. Placeholder text is fine.

## Placeholders to leave (clearly marked)

- **Waitlist form:** the signup section shows the owner's Tally form (before launch it was a disabled "Opening soon" placeholder that collected nothing). The owner supplied the Tally waitlist form (`WAITLIST_FORM_ID` in `src/site.ts`), shown by `Waitlist.astro`. The consent line and a link to the Privacy page must sit next to it: entrants may be under 18, and Malaysia's PDPA applies.
- **Payment:** by bank transfer, directly to the soup kitchen's account (details in `BANK` in `src/site.ts`, shown on the Register page once `REGISTRATION_OPEN` is true). No payment code, no payment links, and the site never handles money. Fee wording: "USD 10 (pay RM 45 by bank transfer)", fee support "USD 5 (pay RM 22.50)". Don't say prizes come from entry fees: "Prizes are funded separately, not from entry fees."
- **Contact email, opening month, deadline:** bracketed placeholders like `[month]`.

Keep a list of every placeholder in `PLACEHOLDERS.md` so the owner can fill them in later.

## How to work

- Work in small chunks. Finish one page, run the site locally, tell the owner what to check, then move on.
- Commit after each finished chunk with a clear message.
- If the repo already has files, look at them and tell the owner what's there before changing or deleting anything.

### Branch, pull request, review (how changes go live)

The Firebase project is `pharos-prize`. GitHub Actions deploys the site automatically (workflows are in `.github/workflows/`):

- A pull request builds the site and posts a **preview link** on the PR.
- A merge into `main` deploys the **live site**. That merge is how the owner approves a live deploy.

So:

1. **Never commit or push directly to `main`.** Start every chunk of work on a new branch (e.g. `page/home`, `fix/footer-link`). Run `git branch --show-current` before committing, and if it says `main`, switch to a new branch first.
2. Commit on the branch and push the branch to GitHub.
3. Open a pull request into `main` and give the owner the link. Wait for the preview link to appear on the PR, and give the owner that too, with what to check. Each PR gets two preview links (normal, and entries-open with the bank details visible): give the owner both, and say what to check on each.
4. **Never merge a pull request yourself**, and never enable auto-merge. Do not run `firebase deploy` or `firebase hosting:channel:deploy` by hand either: the owner merges the PR when they are happy, and that is the approval for the live site.
5. Apply the owner's requested changes as new commits on the same branch. The preview link updates itself.
6. After the owner merges, switch back to `main`, pull, and start the next chunk on a fresh branch.

## Things Claude must not do (walk the owner through them instead)

- Type passwords, create accounts, or accept terms of service.
- Buy a domain or enter payment details.
- Change billing or upgrade the Firebase plan. The free Spark plan is enough for this site.

## Setup check and walkthrough

At the start of the first session, check each item below. Report the results as a short checklist. For anything missing, walk the owner through fixing it **one step at a time**: say what the step does and why, give the exact thing to click or type, and wait for the owner to confirm before the next step.

1. **Node.js** installed (`node -v`, version 20 or newer). If missing, guide the owner to install the LTS version from nodejs.org.
2. **Git** installed and the repo connected to GitHub (`git remote -v`). If pushing fails on login, guide the owner through signing in to GitHub, e.g. with `gh auth login` or the browser prompt.

Firebase and the GitHub Actions deploys are already set up, so there is nothing to check or install for them. The only checks are Node, Git, and that the repo is connected to GitHub.

Only start building once items 1 and 2 pass, or the owner says to continue without one.
