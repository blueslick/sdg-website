// "html" posts: each slide is a finished 1080 x 1350 HTML page (usually exported from the
// Claude Design canvas), drawn as it is. post.yaml only adds the caption, hashtags and alt text.
//
//   type: html
//   caption:
//     - "First paragraph."
//     - "Second paragraph."
//   hashtags: [EssayCompetition]
//   slides:
//     - file: slide-01.html
//       alt: "What the slide shows, in a sentence or two."
//
// Rules the loader checks:
//   - every slide file exists and has alt text;
//   - nothing loads from the internet (images are local files, fonts are added when drawing);
//   - every colour is one of the tokens.json colours;
//   - the words on the slides and in the caption pass the red-line check (lint.js).
import fs from 'node:fs';
import path from 'node:path';
import { lintText } from './lint.js';
import { loadTokens, colorValue, fontFaceCss } from './tokens.js';
import { buildCaption, loadBrand, PostError } from './load-post.js';

const isObj = (v) => v && typeof v === 'object' && !Array.isArray(v);

/** The words a person sees on a slide, for the red-line check. */
export function visibleText(html) {
  return html
    .replace(/<(style|script|title)[\s\S]*?<\/\1>/gi, ' ')
    .replace(/<!--[\s\S]*?-->/g, ' ')
    .replace(/<[^>]+>/g, ' ')
    .replace(/&amp;/g, '&').replace(/&lt;/g, '<').replace(/&gt;/g, '>').replace(/&quot;/g, '"').replace(/&#39;/g, "'")
    .replace(/\s+/g, ' ')
    .trim();
}

export function loadHtmlPost(dir, raw) {
  const errors = [];
  const warnings = [];
  const warn = (msg, slide = null) => warnings.push({ slide, msg });
  const texts = [];
  const tokens = loadTokens();
  const tokenHex = new Set(tokens.color.tokens.map((t) => colorValue(tokens, t.name).toLowerCase()));

  const list = Array.isArray(raw.slides) ? raw.slides : [];
  if (!list.length) errors.push('"slides" is empty. List each slide as  - file: slide-01.html  with an  alt:  line.');
  if (list.length > 10) errors.push(`Instagram allows 10 images in a carousel; this post has ${list.length}.`);

  const slides = [];
  list.forEach((s, i) => {
    const n = i + 1;
    const where = `slide ${n}`;
    if (!isObj(s) || !s.file) { errors.push(`${where}: needs "file: slide-0${n}.html".`); return; }
    const file = path.resolve(dir, String(s.file));
    if (!file.startsWith(dir + path.sep) || !fs.existsSync(file)) { errors.push(`${where}: file not found in the post folder: ${s.file}`); return; }
    if (!s.alt || typeof s.alt !== 'string') errors.push(`${where}: "alt" is missing. Every image needs alt text (it goes into alt-text.txt for Instagram).`);
    const html = fs.readFileSync(file, 'utf8');
    if (/(?:src|href)\s*=\s*["']?\s*(?:https?:)?\/\//i.test(html) || /url\(\s*["']?(?:https?:)?\/\//i.test(html) || /@import/i.test(html)) {
      errors.push(`${where}: ${s.file} loads something from the internet. Use local image files; fonts are added when the slide is drawn.`);
    }
    for (const m of html.matchAll(/<img\b[^>]*>/gi)) {
      const src = (m[0].match(/\ssrc\s*=\s*"([^"]*)"/i) ?? [])[1];
      if (!/\salt\s*=\s*"[^"]+"/i.test(m[0])) warn(`${where}: an image has no alt text inside ${s.file}.`, n);
      if (src && !src.startsWith('data:') && !fs.existsSync(path.resolve(path.dirname(file), src))) errors.push(`${where}: image not found: ${src}`);
    }
    const odd = [...new Set([...html.matchAll(/#[0-9a-f]{6}\b/gi)].map((m) => m[0].toLowerCase()))].filter((h) => !tokenHex.has(h));
    if (odd.length) warn(`${where}: colours that are not in tokens.json: ${odd.join(', ')}. Use the token colours only.`, n);
    texts.push({ where, text: visibleText(html) });
    slides.push({ index: n, total: list.length, template: 'html', tag: `Slide ${n}`, file, alt: s.alt ?? '' });
  });

  const addText = (where, text) => texts.push({ where, text });
  addText('hashtags', (raw.hashtags ?? []).join(' '));
  const caption = buildCaption(raw, { warn: (m) => warn(m), addText });
  for (const s of slides) addText(`slide ${s.index} alt`, s.alt);
  for (const t of texts) for (const m of lintText(t.text)) warn(`${t.where}: ${m}`);

  if (errors.length) throw new PostError(errors);
  return { dir, name: path.basename(dir), type: 'html', theme: 'light', hook: '', slides, caption, credits: {}, warnings, brand: loadBrand() };
}

/** Draws each slide as it is (feed), then the same picture centred on a plum-deep story. */
export async function renderHtmlPost({ tokens, post, outDir, formats, browser }) {
  const files = {};
  const notes = [];
  const fonts = fontFaceCss(tokens);
  const ground = colorValue(tokens, 'plum-deep');
  const ctx = await browser.newContext({ viewport: { width: 1080, height: 1350 }, deviceScaleFactor: 1 });
  const page = await ctx.newPage();
  const feedDir = path.join(outDir, 'feed');
  fs.mkdirSync(feedDir, { recursive: true });
  files.feed = [];
  for (const slide of post.slides) {
    await page.goto(new URL(`file://${slide.file}`).href, { waitUntil: 'load' });
    await page.addStyleTag({ content: fonts });
    await page.evaluate(() => document.fonts.ready);
    // Anything that runs past the bottom or right edge of the slide gets cut off on Instagram.
    const cut = await page.evaluate(() => {
      const root = document.body.firstElementChild;
      if (!root) return ['the slide is empty'];
      const r = root.getBoundingClientRect();
      const out = [];
      if (Math.round(r.width) !== 1080 || Math.round(r.height) !== 1350) out.push(`the slide is ${Math.round(r.width)} x ${Math.round(r.height)}, not 1080 x 1350`);
      for (const el of root.querySelectorAll('h1,h2,h3,p,span,div,li')) {
        if (!el.childNodes.length || ![...el.childNodes].some((c) => c.nodeType === 3 && c.textContent.trim())) continue;
        const b = el.getBoundingClientRect();
        if (b.bottom > r.bottom + 1 || b.right > r.right + 1) out.push(`text runs off the slide: "${el.textContent.trim().slice(0, 40)}"`);
      }
      return out;
    });
    for (const msg of cut) notes.push({ slide: slide.index, format: 'feed', level: 'warn', field: 'layout', msg });
    const file = path.join(feedDir, `slide-${String(slide.index).padStart(2, '0')}.png`);
    await page.screenshot({ path: file, clip: { x: 0, y: 0, width: 1080, height: 1350 } });
    files.feed.push(file);
  }
  await ctx.close();

  if (formats.includes('story')) {
    const storyDir = path.join(outDir, 'story');
    fs.mkdirSync(storyDir, { recursive: true });
    const sctx = await browser.newContext({ viewport: { width: 1080, height: 1920 }, deviceScaleFactor: 1 });
    const sp = await sctx.newPage();
    files.story = [];
    for (const [i, f] of files.feed.entries()) {
      const b64 = fs.readFileSync(f).toString('base64');
      await sp.setContent(`<!doctype html><html><body style="margin:0;width:1080px;height:1920px;background:${ground};display:flex;align-items:center;justify-content:center"><img src="data:image/png;base64,${b64}" width="1080" height="1350" alt=""></body></html>`, { waitUntil: 'load' });
      const file = path.join(storyDir, `slide-${String(i + 1).padStart(2, '0')}.png`);
      await sp.screenshot({ path: file, clip: { x: 0, y: 0, width: 1080, height: 1920 } });
      files.story.push(file);
    }
    await sctx.close();
  }
  return { files, notes };
}
