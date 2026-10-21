# Social post maker

You write the words in a plain text file. The tool does the design and gives you finished Instagram images in the Pharos look.

It draws every colour, font and size from the website's own `tokens.json` and from the same font packages the site uses (Gloock, Instrument Sans and Kaushan Script, from `node_modules`), so posts always match the site. If a token changes, the next post you build changes with it.

## One-time setup

You need Node.js 20 or newer (the website needs it too). Then, in a terminal, from the project folder:

```
npm install              # the website's own install: this also fetches the fonts the posts use
cd tools/social
npm install
npm run setup
```

The first `npm install` (in the project folder, not in `tools/social`) fetches the website's fonts; the tool reads them from there. The second fetches the tool's two helpers. `npm run setup` downloads the browser the tool uses to draw the images (about 150 MB, once). If you skip it, the build will tell you to run it.

## Making a post

1. **Copy an example folder** from `posts/` and rename it, for example `posts/hunger-report-2026`.
   - `example-report`: a report or study (cover + 5 statistic slides)
   - `example-artwork`: an artwork (cover, the work, 2 or 3 zoom-ins, what it argues)
   - `example-announcement`: competition announcements (entries open, deadline countdown, fee support)
2. **Put your images in that folder** (screenshots, the artwork) and edit `post.yaml`. Every line has a comment saying what it is.
3. **Find box and circle positions** with the helper: `npm run coords`. Drag on your image and paste the numbers it gives you (see below).
4. **Check it:** `npm run preview posts/hunger-report-2026`. This builds everything and opens one page showing every slide, the caption, the alt text and any warnings.
5. **Post it:** use the PNGs in `posts/hunger-report-2026/output/`.

```
output/
  feed/slide-01.png ...    1080 x 1350, for the Instagram feed
  story/slide-01.png ...   1080 x 1920, for Stories (kept clear of Instagram's top and bottom buttons)
  caption.txt              two short paragraphs, the source credit, hashtags
  alt-text.txt             alt text for each slide, to paste into Instagram's alt-text box
  preview.html             everything on one page
```

The `output/` folders are not saved to GitHub. They are rebuilt any time.

Commands (run inside `tools/social`):

| Command | What it does |
|---|---|
| `npm run build-post posts/my-post` | Make the images, caption and alt text |
| `npm run preview posts/my-post` | The same, then open the preview page |
| `npm run coords` | Open the coordinate helper (`npm run coords posts/my-post/page.png` loads an image straight away) |
| `node src/cli.js check posts/my-post` | Check `post.yaml` and the wording only, without drawing |
| `npm test` | Rebuild the three examples and check the results |

Add `--no-story` to skip the story versions, `--strict` to make any warning count as a failure.

## The three post types

**Report or study (6 slides).** A cover with the report's front page and your hook line, then 5 slides, each a cropped screenshot with the number boxed and a one-line comment. Needs `cover:` and exactly 5 `slides:`.

**Artwork (5 or 6 slides).** A cover with the whole piece, a slide with the whole piece large plus title, artist and where it's shown, then 2 or 3 zoom-ins with the detail circled and your interpretation, then a final slide on what it argues about hunger. Needs `artwork:`, 2 or 3 `details:`, and `argument:`.

**Announcements (1 to 6 slides).** Each slide has a big line, a plain sentence under it, a panel of facts and a button-shaped line. The `kind` (`entries-open`, `deadline`, `fee-support`) sets the small label at the top. For a countdown, add `deadline: 2027-02-15` and write `{days_left}` in your text. The tool works out the days on the day you build. Use `{deadline}` for the date written out.

In any text, put `*stars*` around words to highlight them (peach on the plum slab, bold elsewhere): `"Five numbers about hunger, *explained*"`.

## Box, circle and crop coordinates

Every position is in **percent of the whole original image**, so it keeps working if you resize the picture or change the crop. Run `npm run coords`, drop your image on the page, choose a tool and drag:

- **Box:** drag corner to opposite corner. Gives `box: { x, y, w, h }`.
- **Circle:** press on the centre of the detail and drag outwards. Gives `circle: { cx, cy, r }`.
- **Crop:** drag over the part you want to show. Gives `crop: { x, y, w, h }`.

Click **Copy** and paste under the slide in `post.yaml`. Need two boxes on one slide? Draw both and the helper writes a list.

Tips: crop close to the number so it is big on a phone, and try for a shape close to a square or 4:3 so it fills the slide. The tool warns if a crop is too small and would look blurry.

## One style, everywhere

These are fixed so every post looks like the same account, and like the website:

- **Annotations:** every box and circle is coral, 8 px thick, with a thin cream outline so it shows on any image. (Change it in `src/design.js`, the `ANNOTATION` block.)
- **Comment:** the same plum card with cream Gloock text, in the same place (under the image) on every annotated slide, with a small coral square or circle that matches the shape you drew.
- **Cover:** the same layout every time: the plum slab with the rounded corner, the Pharos wordmark and the edition label, the big line in cream, the edition disc, a label and one plain line, then a picture or facts panel, then credits.
- **Credits:** the source credit (`Source: name, publisher, year`) goes on the cover and the last slide. An image credit line (`Image: ...`) goes on every slide with an image.
- **Look:** peach ground with the site's grain, plum text, cream, slate and coral cards, labels in sentence case, and no shadows.

## What the tool checks

It will not build if a post is missing the **source credit** (name, publisher and year), the **image credit**, an image file, the right number of slides, or its coordinates.

It **warns** (you decide) about:

| Warning | Why |
|---|---|
| Text too long | Text shrinks to fit first, down to a readable minimum. If it still doesn't fit, you're told which words to shorten. |
| Missing alt text | Every image needs it. |
| "charity", "non-profit", "NGO", "foundation", "society" | We are never called these. Say "run by student volunteers" or "a fundraiser for [Soup Kitchen Name]". |
| "soup kitchen" | The soup kitchen is not named. Use `[Soup Kitchen Name]`. |
| A fundraising target, such as "raise USD 500" | We don't publish a target. |
| "UN", "United Nations", "Global Goals" | Fine when naming a source, never as part of our name or branding. |
| A box or circle outside the cropped area | It would be cut off. |
| A low-resolution crop | It would look blurry. |
| A caption paragraph over about 45 words | The strategy asks for two short paragraphs. |

The tool cannot see inside your images. **You** must check that none show people in poverty or being served. The preview page ends with a checklist for this and the other rules.

Third-party names in credits (a report's publisher, an artist) are not checked for the red-line words.

## Where the design comes from

| Thing | Comes from |
|---|---|
| All colours (peach, cream, plum, slate, coral, pink, the edition disc, ...) | `tokens.json` |
| Fonts: Gloock (headlines), Instrument Sans (text), Kaushan Script (the Pharos wordmark only) | The Fontsource packages listed in `tokens.json`, in `node_modules`, built into every image |
| Type styles (weight, line height, base sizes) | `tokens.json` |
| Radii, margins and the grain | `tokens.json` and the page shell (`src/layouts/Base.astro`) |
| Site name (the script wordmark) and Instagram handle (footer of announcements) | `src/site.ts` (`SITE_NAME`, `INSTAGRAM_HANDLE`) |
| Edition label ("Inaugural edition: Goal 2"), footer line | `brand.yaml` here |

The site is light only, so posts are too.

The token sizes are the site's *mobile* sizes. A phone shows a 1080 px post at about the width of the site's mobile layout, so type is scaled up by a fixed amount per role (about 2 to 3 times). Those multipliers, the smallest sizes text may shrink to, and the layout bands are in `src/design.js` (`ROLES` and `LAYOUT`). The sizes themselves still come from the tokens.

When a new edition changes the `edition` colour in `tokens.json`, every post picks up the new disc colour.

## Files

```
tools/social/
  brand.yaml              edition label, footer line, handle
  posts/                  one folder per post (post.yaml + images)
  helper/                 the coordinate helper page
  scripts/                example-image maker, smoke test
  src/
    cli.js                the commands
    load-post.js          reads and checks post.yaml
    templates.js          the HTML for each slide
    design.js             how tokens become sizes; the annotation style
    runtime.js            fitting text, cropping images, drawing boxes and circles
    render.js             draws the slides in a headless browser and saves PNGs
    outputs.js            caption, alt text, preview page
    lint.js               the wording checks
    tokens.js             reads tokens.json, the font packages and src/site.ts
```

## If something goes wrong

- **"The font package ... is not installed"**: run `npm install` in the project folder (not `tools/social`).
- **"Chromium is not installed"**: run `npm run setup`.
- **"Could not find a post.yaml"**: give the folder, like `posts/my-post`. The folder must contain a file called `post.yaml`.
- **The images look blurry**: the screenshot is too small for the crop. Take a bigger screenshot.
- **A word is cut off**: the tool warned you; shorten that text. Nothing is ever silently dropped.
