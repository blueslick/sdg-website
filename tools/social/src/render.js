// Draws each slide in headless Chromium (Playwright) and saves PNGs.
import fs from 'node:fs';
import path from 'node:path';
import { chromium } from 'playwright';
import { FORMATS } from './design.js';
import { slideHtml } from './templates.js';

export async function launchBrowser() {
  try {
    return await chromium.launch();
  } catch (e) {
    if (/Executable doesn't exist|browserType\.launch/i.test(e.message)) {
      throw new Error(
        "Chromium (the browser this tool draws with) is not installed yet.\n  Run this once:  npm run setup   (inside tools/social)\n  Then try again."
      );
    }
    throw e;
  }
}

/**
 * Renders every slide in the given formats.
 * Returns { files: { feed: [paths], story: [paths] }, notes: [{ slide, format, level, field, msg }] }
 */
export async function renderPost({ tokens, post, outDir, formats = ['feed', 'story'], browser }) {
  const own = !browser;
  browser ??= await launchBrowser();
  const files = {};
  const notes = [];
  try {
    for (const format of formats) {
      const { width, height } = FORMATS[format];
      const dir = format === 'feed' ? path.join(outDir, 'feed') : path.join(outDir, 'story');
      fs.mkdirSync(dir, { recursive: true });
      const ctx = await browser.newContext({ viewport: { width, height }, deviceScaleFactor: 1 });
      const page = await ctx.newPage();
      files[format] = [];
      for (const slide of post.slides) {
        await page.setContent(slideHtml({ tokens, post, slide, format }), { waitUntil: 'load' });
        const issues = await page.evaluate(() => window.__runLayout());
        for (const i of issues) notes.push({ slide: slide.index, format, ...i });
        const file = path.join(dir, `slide-${String(slide.index).padStart(2, '0')}.png`);
        await page.screenshot({ path: file, clip: { x: 0, y: 0, width, height } });
        files[format].push(file);
      }
      await ctx.close();
    }
  } finally {
    if (own) await browser.close();
  }
  return { files, notes };
}
