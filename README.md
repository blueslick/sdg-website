# Pharos

**The website for Pharos, an essay competition for students aged 20 and under, built around the UN Sustainable Development Goals.** Each edition takes one goal; the inaugural edition is Goal 2, Zero Hunger, and is a fundraiser for The Assembly Soup Kitchen (T.A.S.K). Run by student volunteers.

The name comes from the lighthouse of Alexandria, which guided ships in beside the greatest library of the ancient world. The name is stored once, in `src/site.ts`.

## Running it

```sh
npm install      # once
npm run dev      # local preview at http://localhost:4321
npm run build    # writes the finished site to dist/
```

Changes go live through pull requests: see "Branch, pull request, review" in `CLAUDE.md`.

## Where things are

| Path | What |
|---|---|
| `tokens.json` | Every colour, type size, space and radius. Turned into CSS custom properties by `src/lib/tokens.ts`. |
| `src/pages/` | One file per page. |
| `src/components/` | Shared pieces: header (`Hero`), footer, waitlist, edition cover. |
| `src/lib/nasiLemak.ts` | Draws the edition cover mosaic at build time. |
| `public/images/` | The two lighthouse pixel mosaics. |
| `PLACEHOLDERS.md` | Everything still waiting to be filled in. |

## Two modes: hook, then facts

Every page has two jobs. Big Gloock headlines, slabs, arches and rings hook people on the first screen; everything that matters sits right underneath in calm, plain Instrument Sans. Anything said in giant type is also said in plain text on the same screen, so a teacher skimming on a phone learns what this is and who runs it in a few seconds.

## Visual foundations

**Colour.** Light only, on a peach ground. Plum for text and the big dark slabs, slate for the second slab colour, cream for text on slabs and as the reading ground for blog posts. Coral and dusty pink are fills (buttons, cards, rings), never text on cream or peach. Two sea blues from the lighthouse images are used sparingly.

**The edition colour.** `edition` is the only token that changes between editions (SDG 2 mustard now). It appears in the egg yolk of the edition cover and as the "Now" goal on About, never as text.

**Type.** Gloock for display, Instrument Sans for all reading text and labels (sentence case, never tracked-out capitals). Kaushan Script only for the Pharos wordmark: a decorative accent, never body text or essential information. All self-hosted.

**Shapes.** Slabs with one big rounded corner, half-round cards, arches and concentric rings, with a risograph grain over every page.

**The edition cover.** A circle holding a mosaic of patterned tiles in the brand palette. The frame stays the same every edition; only the picture inside changes. This edition's picture is a plate of nasi lemak.

## Content rules

- Never call the organisation a charity, non-profit, NGO or foundation. Use "run by student volunteers" and "a fundraiser for The Assembly Soup Kitchen (T.A.S.K)".
- The soup kitchen is named with written permission. On the site, always use `SOUP_KITCHEN_NAME` in `src/site.ts`; never hard-code or re-spell it.
- No invented people, quotes, statistics, testimonials or past editions.
- No official SDG icons, UN logo or colour wheel. Name goals in text only.
- No photos of people being served or in poverty.

## Accessibility

Body text is never under 16px and every text colour pair passes 4.5:1. Buttons are at least 48px tall. Every image has alt text, including the edition cover.
