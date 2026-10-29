// Reads a post folder (post.yaml + images), checks it against the social media
// strategy, and turns it into a flat list of slides the templates can draw.
import fs from 'node:fs';
import path from 'node:path';
import YAML from 'yaml';
import { loadSiteConfig, TOOL_ROOT } from './tokens.js';
import { lintText } from './lint.js';
import { loadHtmlPost } from './html-post.js';

export class PostError extends Error {
  constructor(problems) {
    super(problems.join('\n'));
    this.problems = problems;
  }
}

const TYPES = ['report', 'artwork', 'announcement', 'html'];
const KIND_TAGS = { 'entries-open': 'Entries open', deadline: 'Deadline', 'fee-support': 'Fee support' };
const pad2 = (n) => String(n).padStart(2, '0');
const isObj = (v) => v && typeof v === 'object' && !Array.isArray(v);
const isNum = (v) => typeof v === 'number' && Number.isFinite(v);

export function loadBrand() {
  const file = path.join(TOOL_ROOT, 'brand.yaml');
  const b = YAML.parse(fs.readFileSync(file, 'utf8')) ?? {};
  // The name and the Instagram handle come from src/site.ts, the same file the website reads.
  const site = loadSiteConfig();
  return {
    name: b.name || site.name,
    editionLabel: b.edition_label || '',
    footerNote: b.footer_note || '',
    handle: b.handle || site.handle,
  };
}

/** Find a post folder from what the owner typed: a path, or just the folder name inside posts/. */
export function resolvePostDir(arg) {
  const tries = [path.resolve(arg), path.resolve(TOOL_ROOT, arg), path.resolve(TOOL_ROOT, 'posts', arg)];
  for (const t of tries) if (fs.existsSync(path.join(t, 'post.yaml'))) return t;
  throw new PostError([
    `Could not find a post.yaml for "${arg}". Looked in:\n  ${tries.map((t) => path.join(t, 'post.yaml')).join('\n  ')}`,
  ]);
}

// ---- helpers ------------------------------------------------------------------

function daysBetween(from, to) {
  const a = Date.UTC(from.getFullYear(), from.getMonth(), from.getDate());
  const b = Date.UTC(to.getFullYear(), to.getMonth(), to.getDate());
  return Math.round((b - a) / 86400000);
}

function fillDeadline(text, deadline, today, warn, where) {
  if (typeof text !== 'string' || !/\{(days_left|deadline)\}/.test(text)) return text;
  const d = deadline ? new Date(deadline) : null;
  if (!d || Number.isNaN(d.getTime())) {
    warn(`${where} uses {days_left} or {deadline} but there is no valid "deadline: YYYY-MM-DD" on the slide or the post.`);
    return text;
  }
  const left = daysBetween(today, d);
  if (left < 0) warn(`${where}: the deadline (${deadline}) is in the past.`);
  const nice = d.toLocaleDateString('en-GB', { day: 'numeric', month: 'long', year: 'numeric', timeZone: 'UTC' });
  return text.replace(/\{days_left\}/g, String(Math.max(left, 0))).replace(/\{deadline\}/g, nice);
}

// ---- main ---------------------------------------------------------------------

export function loadPost(dirArg, { today = new Date() } = {}) {
  const dir = resolvePostDir(dirArg);
  const errors = [];
  const warnings = []; // { slide: number|null, msg }
  const texts = []; // our own words, for the red-line check: { where, text }
  let curSlide = null;
  const warn = (msg, slide = curSlide) => warnings.push({ slide, msg });
  const err = (msg) => errors.push(msg);

  let raw;
  try {
    raw = YAML.parse(fs.readFileSync(path.join(dir, 'post.yaml'), 'utf8'));
  } catch (e) {
    throw new PostError([`post.yaml could not be read: ${e.message}`]);
  }
  if (!isObj(raw)) throw new PostError(['post.yaml is empty or is not a list of "key: value" lines.']);

  // Finished HTML slides (from the Claude Design canvas) have their own, simpler checks.
  if (raw.type === 'html') return loadHtmlPost(dir, raw);

  const brand = loadBrand();
  const type = raw.type;
  if (!TYPES.includes(type)) err(`"type" must be one of: ${TYPES.join(', ')} (got ${JSON.stringify(type)}).`);
  const theme = 'light'; // the Pharos design is light only
  if (raw.theme && raw.theme !== 'light') warn('"theme" is ignored: the Pharos design has only a light theme.', null);
  if (!raw.hook || typeof raw.hook !== 'string') err('"hook" is missing. It is the big line on the cover.');
  const clean = (s) => (typeof s === 'string' ? s.replace(/\*/g, '') : s);

  // credits ---------------------------------------------------------------
  const credits = raw.credits ?? {};
  const src = credits.source;
  let sourceLine = null;
  if (src !== undefined && src !== null) {
    if (!isObj(src) || !src.name || !src.publisher || !src.year) {
      err('credits.source needs a name, a publisher and a year, e.g.\n    source: { name: "Report title", publisher: "Publisher", year: 2025 }');
    } else sourceLine = `Source: ${src.name}, ${src.publisher}, ${src.year}`;
  } else if (type === 'report' || type === 'artwork') {
    err('credits.source is missing. Every post needs the source credit (name, publisher, year) on the cover or last slide.');
  }
  const imageCredit = credits.image ? `Image: ${String(credits.image).replace(/^image:\s*/i, '')}` : null;

  const deadlineTop = raw.deadline;

  // image + annotation helpers -------------------------------------------
  const usedImages = [];
  function image(spec, where, { mode = 'contain', anchor = 'center' } = {}) {
    if (!spec?.image) { err(`${where}: "image" is missing.`); return null; }
    const file = path.resolve(dir, String(spec.image));
    if (!fs.existsSync(file)) { err(`${where}: image file not found: ${spec.image} (looked in ${dir})`); return null; }
    if (!spec.alt) warn(`${where}: no "alt" text for ${spec.image}. Every image needs alt text (it also goes into alt-text.txt for Instagram).`);
    let crop = null;
    if (spec.crop !== undefined) {
      const c = spec.crop;
      if (!isObj(c) || ![c.x, c.y, c.w, c.h].every(isNum)) err(`${where}: crop needs numbers x, y, w, h (percent), e.g. crop: { x: 5, y: 20, w: 60, h: 30 }.`);
      else if (c.w <= 0 || c.h <= 0 || c.x < 0 || c.y < 0 || c.x + c.w > 100.01 || c.y + c.h > 100.01) err(`${where}: crop goes outside the image (all numbers are percent, 0 to 100).`);
      else crop = { x: c.x, y: c.y, w: c.w, h: c.h };
    }
    usedImages.push(file);
    return { file, alt: spec.alt ?? '', crop, mode, anchor };
  }

  function annotations(spec, where) {
    const out = [];
    const list = (v) => (v === undefined || v === null ? [] : Array.isArray(v) ? v : [v]);
    for (const b of list(spec.box)) {
      if (!isObj(b) || ![b.x, b.y, b.w, b.h].every(isNum)) { err(`${where}: each box needs numbers x, y, w, h (percent). Use the coordinate helper (npm run coords).`); continue; }
      if (b.x < 0 || b.y < 0 || b.x + b.w > 100.01 || b.y + b.h > 100.01 || b.w <= 0 || b.h <= 0) warn(`${where}: a box runs outside the image (numbers are percent of the whole image).`);
      out.push({ type: 'box', x: b.x, y: b.y, w: b.w, h: b.h });
    }
    for (const c of list(spec.circle)) {
      if (!isObj(c) || ![c.cx, c.cy, c.r].every(isNum)) { err(`${where}: each circle needs numbers cx, cy, r (percent). Use the coordinate helper (npm run coords).`); continue; }
      if (c.cx < 0 || c.cx > 100 || c.cy < 0 || c.cy > 100 || c.r <= 0) warn(`${where}: a circle's centre is outside the image.`);
      out.push({ type: 'circle', cx: c.cx, cy: c.cy, r: c.r });
    }
    return out;
  }

  const slides = [];
  const addText = (where, text) => { if (text) texts.push({ where, text: String(text) }); };

  // ---- type-specific slide lists ----------------------------------------------
  if (type === 'report') {
    const stats = Array.isArray(raw.slides) ? raw.slides : [];
    if (stats.length !== 5) err(`A report post is a cover plus exactly 5 statistic slides. Found ${stats.length} under "slides:".`);
    curSlide = 1;
    const cover = image(raw.cover, 'cover', { mode: 'contain' });
    addText('cover hook', raw.hook); addText('cover subtitle', raw.subtitle);
    slides.push({ template: 'cover', zone: 'image', hook: raw.hook, subtitle: raw.subtitle, image: cover, tag: 'Report or study', swipe: true, source: true, imageCredit: true });
    stats.forEach((s, i) => {
      curSlide = i + 2;
      const where = `slide ${curSlide} (stat ${i + 1})`;
      const img = image(s, where, { mode: 'contain' });
      const ann = annotations(s, where);
      if (!ann.length) err(`${where}: add a box (or circle) around the number.`);
      if (!s.comment) err(`${where}: "comment" is missing (one line saying why the number matters).`);
      else if (String(s.comment).length > 110) warn(`${where}: the comment is long (${String(s.comment).length} characters). Keep it to one line if you can.`);
      addText(where + ' comment', s.comment);
      slides.push({ template: 'annotated', image: img, annotations: ann, comment: s.comment, tag: s.label ?? `Stat ${i + 1} / ${stats.length}`, imageCredit: true, source: i === stats.length - 1, alt: img?.alt });
    });
  } else if (type === 'artwork') {
    const aw = raw.artwork;
    const details = Array.isArray(raw.details) ? raw.details : [];
    if (!isObj(aw)) err('"artwork:" section is missing (title, artist, year, shown_at, image, alt).');
    if (details.length < 2 || details.length > 3) err(`An artwork post needs 2 or 3 zoom-in slides under "details:" (found ${details.length}), so the whole post is 5 or 6 slides.`);
    if (!isObj(raw.argument) || !raw.argument.heading || !raw.argument.body) err('"argument:" needs a heading and a body (what the work argues about hunger).');
    curSlide = 1;
    if (isObj(aw)) {
      for (const k of ['title', 'artist', 'year', 'shown_at']) if (!aw[k]) err(`artwork.${k} is missing.`);
      const coverImg = image(aw, 'cover (artwork)', { mode: 'contain' });
      addText('cover hook', raw.hook); addText('cover subtitle', raw.subtitle);
      slides.push({ template: 'cover', zone: 'image', hook: raw.hook, subtitle: raw.subtitle, image: coverImg, tag: 'Artwork', swipe: true, source: true, imageCredit: true });
      curSlide = 2;
      slides.push({ template: 'piece', image: image(aw, 'slide 2 (the work)', { mode: 'contain' }), title: aw.title, artist: aw.artist, year: aw.year, shownAt: aw.shown_at, tag: 'The work', imageCredit: true, alt: aw.alt });
    }
    details.forEach((d, i) => {
      curSlide = slides.length + 1;
      const where = `slide ${curSlide} (zoom-in ${i + 1})`;
      const img = image({ ...d, image: d.image ?? aw?.image, alt: d.alt ?? aw?.alt }, where, { mode: 'contain' });
      const ann = annotations(d, where);
      if (!ann.length) err(`${where}: add a circle (or box) around the detail.`);
      if (!d.comment) err(`${where}: "comment" is missing (your interpretation of the detail).`);
      addText(where + ' comment', d.comment);
      slides.push({ template: 'annotated', image: img, annotations: ann, comment: d.comment, tag: d.label ?? `Zoom-in ${i + 1} / ${details.length}`, imageCredit: true, alt: img?.alt });
    });
    curSlide = slides.length + 1;
    if (isObj(raw.argument)) {
      addText('final slide heading', raw.argument.heading); addText('final slide body', raw.argument.body); addText('final slide closing', raw.argument.closing);
      slides.push({ template: 'text', heading: raw.argument.heading, body: raw.argument.body, closing: raw.argument.closing, tag: 'What it argues', source: true, imageCredit: false });
    }
  } else if (type === 'announcement') {
    const list = Array.isArray(raw.slides) ? raw.slides : [];
    if (list.length < 1) err('An announcement needs at least one entry under "slides:".');
    if (list.length > 6) warn(`This announcement has ${list.length} slides. Shorter is better.`, null);
    list.forEach((s, i) => {
      curSlide = i + 1;
      const where = `slide ${curSlide}`;
      const kind = s.kind;
      if (kind && !KIND_TAGS[kind]) warn(`${where}: unknown kind "${kind}". Use entries-open, deadline or fee-support.`);
      const deadline = s.deadline ?? deadlineTop;
      const f = (t, w) => fillDeadline(t, deadline, today, (m) => warn(m), `${where} ${w}`);
      const hook = f(s.hook ?? raw.hook, 'hook');
      const subtitle = f(s.subtitle, 'subtitle');
      const facts = (Array.isArray(s.facts) ? s.facts : []).map((x) => ({ label: x.label, value: f(x.value, 'fact') }));
      const cta = f(s.cta, 'cta');
      if (!facts.length && !cta) err(`${where}: add "facts:" (label and value rows) and/or a "cta:" line for the panel.`);
      if (!subtitle) warn(`${where}: no "subtitle". Whatever the big line says should also appear as plain text on the same screen.`);
      if (facts.some((x) => !x.label || !x.value)) err(`${where}: every fact needs a label and a value.`);
      [['hook', hook], ['subtitle', subtitle], ['cta', cta], ...facts.map((x) => ['fact', `${x.label} ${x.value}`])].forEach(([w, t]) => addText(`${where} ${w}`, t));
      slides.push({ template: 'cover', zone: 'panel', hook, subtitle, facts, cta, tag: KIND_TAGS[kind] ?? 'Announcement', swipe: list.length > 1 && i === 0, source: Boolean(sourceLine), imageCredit: false });
    });
  }

  // ---- finish: tags, footers, alt text ---------------------------------------------
  if (usedImages.length && !imageCredit) err('credits.image is missing. Every post with an image needs an image credit line, e.g. image: "Screenshots from the report, shown for commentary."');
  const total = slides.length;
  slides.forEach((s, i) => {
    s.index = i + 1;
    s.total = total;
    s.tag = (s.tag ?? '') + (s.swipe ? ' · swipe' : '');
    const foot = [];
    if (s.source && sourceLine) foot.push(sourceLine);
    if (s.imageCredit && imageCredit) foot.push(imageCredit);
    if (!foot.length) foot.push([brand.footerNote, brand.handle].filter(Boolean).join(' · '));
    s.foot = foot;
  });

  // red-line check on our own words (credits are other people's names, so skipped)
  addText('hashtags', (raw.hashtags ?? []).join(' '));
  const caption = buildCaption(raw, { sourceLine, imageCredit, warn: (m) => warn(m, null), addText, fill: (s, w) => fillDeadline(s, deadlineTop, today, (m) => warn(m, null), w) });
  for (const t of texts) for (const m of lintText(t.where === 'cover hook' ? clean(t.text) : t.text)) warn(`${t.where}: ${m}`, null);

  if (errors.length) throw new PostError(errors);
  return { dir, name: path.basename(dir), type, theme, hook: raw.hook, slides, caption, credits: { sourceLine, imageCredit }, warnings, brand };
}

// ---- caption --------------------------------------------------------------------

export function buildCaption(raw, { sourceLine, imageCredit, warn, addText, fill = (s) => s }) {
  let paras = raw.caption;
  if (isObj(paras)) paras = [paras.one ?? paras.first, paras.two ?? paras.second];
  if (!Array.isArray(paras) || paras.length !== 2 || paras.some((p) => !p)) {
    warn('caption: write exactly two short paragraphs under "caption:" (a list of two). Using a stand-in so you can still preview.');
    paras = [String(raw.hook ?? '').replace(/\*/g, ''), '[Write a one-sentence call to action.]'];
  }
  paras = paras.map((p, i) => fill(String(p).trim().replace(/\s+/g, ' '), `caption paragraph ${i + 1}`));
  paras.forEach((p, i) => {
    addText(`caption paragraph ${i + 1}`, p);
    const words = p.split(' ').length;
    if (words > 45) warn(`caption paragraph ${i + 1} is ${words} words. The strategy asks for two short paragraphs, so aim for about 45 or fewer.`);
  });
  const lines = [paras.join('\n\n')];
  const credit = [sourceLine, imageCredit].filter(Boolean).join('\n');
  if (credit && raw.caption_credits !== false) lines.push(credit);
  const tags = (raw.hashtags ?? []).map((h) => '#' + String(h).replace(/^#/, ''));
  if (tags.length) lines.push(tags.join(' '));
  return { paragraphs: paras, text: lines.join('\n\n') + '\n' };
}
