# Pharos Essay Prize

**Draft design system for the youth SDG essay competition.** "Untitled Essay Prize" is a placeholder until the real name is chosen; the wordmark will be redrawn then.

The idea in one line: **an editorial magazine about justice.** Big, characterful type and bold shapes hook people on the first screen; everything that matters (prompts, deadline, fee, waiver, where the money goes) sits right underneath in calm, plain, readable text.

Built from the organiser's Cosmos moodboard: the aurea poster and the big "A" (giant serif letters as graphics), A_R_T and Visual Systems (sparse layouts, tiny corner labels, lots of empty space), the two geometric posters (circles and blocks), the eye mosaic (an image built from small tiles), the colour grid (warm coral palette) and the nature overlay (floating cards over an image).

## Two modes: hook, then facts

Every page has two jobs, and they get two different treatments.

| | Hook mode | Facts mode |
|---|---|---|
| Where | Home hero, page headers, social posts | Competition page facts, rules, FAQ, waiver, money section, About text, blog body |
| Type | `display-xl`, `display` in Fraunces, may crop off the edge | `body-lg`, `body` in Inter, never cropped, never under 16px |
| Shapes | Slabs, the edition disc, the word mosaic | None, or a single hairline `rule` |
| Colour | `coral`, `edition`, `ink` slabs | `paper`, `paper-2`, `ink`, `terracotta` for links |

**The rule that protects clarity:** anything said in hook mode (giant cropped letters) is also said in plain text within the same screen. A teacher skimming on a phone must learn what this is, who runs it, the fee and the deadline in a few seconds.

## Site map: separate pages, one job each

The homepage does not scroll into the details. Each page has one job, so nothing competes for attention.

| Page | Its one job |
|---|---|
| Home | Say what this is in seconds, then send people to the right page. |
| Competition | Everything an entrant, parent or teacher needs for the current edition. |
| About | Who runs it ("run by student volunteers") and why. |
| Blog | Essays and explainers on the SDGs; credibility and things to share. |
| Contact, Privacy | Footer-level pages. |

### Home (short, about one to two phone screens)

1. **Cover.** Corner labels in `label` (INAUGURAL EDITION / SDG 02, the deadline). One huge cropped line in `display-xl`. The word mosaic behind or beside it: a bowl or plate made from tiny fragments of words about hunger, in `coral`, `terracotta` and `peach` tiles. One `edition` disc. One plain-text line in `body-lg`: "A student essay competition on justice. This edition is a fundraiser for [Soup Kitchen Name]."
2. **Edition strip.** One line, not a section: "Inaugural Edition · Zero Hunger · Entries close [date]" with a pill button "See the competition" (`radius-round`, `coral`). It links to the Competition page and holds no details itself, so a teacher still gets the basics in seconds.
3. **Doorways.** Two or three large square panels, each one word plus an arrow: Competition →, About →, Blog →. Hook-mode type, `paper-2` or `ink` fills.
4. **Footer.** "Run by student volunteers." Contact email, privacy notice.

### Competition page

1. **Edition header.** "Zero Hunger" in `display`, the `edition` disc, `label` metadata (SDG 02, ENTRIES CLOSE [DATE]).
2. **Key facts row.** Deadline · Fee USD 10, free waiver · Prize USD 200 · Age 20 and under · 800 words. Plain `body-lg`, mono labels.
3. **The three prompts.**
4. **How it works.** Enter, Write, Judged anonymously, Results, with mono step numbers.
5. **Where the money goes.** "Every USD 10 entry funds about [X] meals" in `display`; "raised so far" counter once live.
6. **Rules, rubric, refund and waiver policy, FAQ.** Expandable rows separated by `rule` hairlines.
7. **Enter button** repeated at the end.

Pre-launch, this page shows the edition theme, "opening [month]" and the waitlist signup in place of the Enter button.

### About page

"Run by student volunteers," why the competition exists, how judging works (anonymous, published rubric, humans not AI), and the soup kitchen's endorsement once they give permission. No invented team members, photos or titles; real roles only if real people hold them.

## Content fundamentals

- **Voice:** direct, warm, student-to-student. Short sentences. Concrete numbers over slogans ("funds about [X] meals", not "fighting global hunger").
- **Honest status words:** "run by student volunteers" and "a fundraiser for [Soup Kitchen Name]". Never "charity", "non-profit", "NGO" or "foundation".
- **Dignity:** no photos of people being served, no faces of the people who are helped. Typography, shapes, food, hands and students carry the imagery.
- **Labels:** `label` text is uppercase mono and short: `DEADLINE 15 FEB`, `SDG 02`, `800 WORDS`.

## Visual foundations

**Colour.** Light-first: `paper` ground, `ink` text. Warm accents come from the colour grid: `coral` for fills and buttons, `peach` for relief, `terracotta` when an accent has to be readable text. Text on `coral` or `edition` is always `on-accent`. Use at most two accent colours per screen besides ink.

**The edition colour.** `edition` is the only token that changes between editions (SDG 2 mustard now; SDG 4 red, SDG 5 orange, SDG 10 magenta, SDG 16 navy later). It appears as one shape per screen, usually the disc, never as text. Check the UN's SDG colour and icon guidelines before using official icons; borrowing the hue as an accent is the safe default.

**Type.** Fraunces for display (a free, high-contrast serif with quirky curves, standing in for the paid specimen fonts from the moodboard). For more character, turn on its "WONK" and "SOFT" axes in hero type: `font-variation-settings: "WONK" 1, "SOFT" 50`. Inter for all reading text. IBM Plex Mono only for small labels and step numbers.

**Layout.** Asymmetric grids with lots of empty space (`space-12` between sections). Corner labels pinned to edges. Square corners by default (`radius-none`); `radius-card` only for cards floating over an image; `radius-round` for discs and pill buttons. No shadows, no gradients: depth comes from overlap and solid blocks.

**The word mosaic.** The signature motif, adapted from the eye mosaic. A simple picture (plate, bowl, wheat, an open book) made from a grid of `space-4` tiles, each tile a fragment of text or a solid `coral` / `terracotta` / `peach` square. Later editions keep the technique and change the picture and the `edition` colour.

## Accessibility

Body text passes 4.5:1 on `paper` and `paper-2` in both themes; `ink-muted` and `terracotta` are tuned to pass too. `coral` and `edition` are fills, not text colours. Cropped display type is decorative and must be repeated as real text. Every image gets alt text; the mosaic gets a one-line description.

## Iconography

None yet. Prefer typographic markers (mono numbers, arrows like →) over an icon set. No logo yet: the name is set in Fraunces until a wordmark exists.
