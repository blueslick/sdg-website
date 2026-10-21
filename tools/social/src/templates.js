// One function per slide template. Each returns a full HTML document for one slide.
// All sizes come from design.js (which reads tokens.json); there are no numbers
// for colour, type or radius in here.
import fs from 'node:fs';
import path from 'node:path';
import { buildCss, ANNOTATION, FORMATS, ROLES, sizeOf } from './design.js';
import { colorValue } from './tokens.js';

const RUNTIME = fs.readFileSync(path.join(import.meta.dirname, 'runtime.js'), 'utf8');
const MIME = { png: 'image/png', jpg: 'image/jpeg', jpeg: 'image/jpeg', webp: 'image/webp', gif: 'image/gif', svg: 'image/svg+xml' };
const dataUriCache = new Map();

function dataUri(file) {
  if (!dataUriCache.has(file)) {
    const ext = path.extname(file).slice(1).toLowerCase();
    dataUriCache.set(file, `data:${MIME[ext] ?? 'application/octet-stream'};base64,${fs.readFileSync(file).toString('base64')}`);
  }
  return dataUriCache.get(file);
}

const esc = (s) => String(s).replace(/&/g, '&amp;').replace(/</g, '&lt;').replace(/>/g, '&gt;').replace(/"/g, '&quot;');

/** Escape, then turn *word* into a highlight and newlines into line breaks. */
export function markup(text) {
  return esc(String(text ?? '').trim())
    .replace(/\*([^*\n]+)\*/g, '<em class="hl">$1</em>')
    .replace(/\n/g, '<br>');
}

const paragraphs = (text) =>
  String(text ?? '').trim().split(/\n\s*\n/).map((p) => `<p style="margin-bottom:.55em">${markup(p)}</p>`).join('');

const floorAttr = (role, floor) => `data-floor="${floor ?? ROLES[role].floor}"`;

function fitDiv(cls, role, field, inner, extra = '', floor) {
  return `<div class="${cls} r-${role} fit" data-fit ${floorAttr(role, floor)} data-field="${field}" ${extra}>${inner}</div>`;
}

function frame(slideImage, annotations = []) {
  const { file, alt, crop, mode, anchor } = slideImage;
  return `<div class="frame" data-frame data-mode="${mode}" data-anchor="${anchor}" data-crop='${JSON.stringify(crop ?? { x: 0, y: 0, w: 100, h: 100 })}' data-annot='${JSON.stringify(annotations)}'>
    <div class="clip"><img src="${dataUri(file)}" alt="${esc(alt)}"></div><svg class="annot" xmlns="http://www.w3.org/2000/svg" role="presentation"></svg></div>`;
}

function top(ctx) {
  const { brand, slide } = ctx;
  // tags like "Stat 2 / 5" already count the slides; the others get "2 of 6" added
  const num = /\d/.test(slide.tag) ? '' : ` · ${slide.index} of ${slide.total}`;
  return `<div class="top"><span class="wm r-wordmark">${esc(brand.name)}</span>
    <div class="tag r-label"><span>${esc(slide.tag)}${num}</span><span class="dot"></span></div></div>`;
}

/** The plum slab with the big rounded corner (as on the site's hero), holding the wordmark, the
 *  edition label and the big line. */
function slab(ctx, headHtml) {
  const { brand } = ctx;
  return `<div class="slab"><span class="rings" aria-hidden="true"></span>
    <div class="bar"><span class="wm r-wordmark">${esc(brand.name)}</span>${fitDiv('lab', 'label', 'edition label', esc(brand.editionLabel))}</div>
    ${headHtml}</div><div class="disc"></div>`;
}

function foot(slide) {
  return fitDiv('foot', 'credit', 'credit lines', slide.foot.map((l) => `<div class="credit">${esc(l)}</div>`).join(''));
}

// ---- templates ------------------------------------------------------------------

function cover(ctx) {
  const { slide } = ctx;
  const sub = slide.subtitle ? fitDiv('sub pretty', 'lead', 'subtitle', markup(slide.subtitle)) : '';
  let zone;
  if (slide.zone === 'image' && slide.image) {
    zone = `<div class="zone"><div class="imgarea">${frame(slide.image)}</div></div>`;
  } else {
    const rows = (slide.facts ?? [])
      .map((f) => `<div class="fact"><div class="k">${esc(f.label)}</div><div class="v">${markup(f.value)}</div></div>`)
      .join('');
    zone = `<div class="zone panel">
      ${rows ? fitDiv('facts', 'body', 'facts panel', rows, '', 26) : '<div class="facts"></div>'}
      ${slide.cta ? `<div class="pill">${esc(slide.cta)}</div>` : ''}</div>`;
  }
  return `${slab(ctx, fitDiv('head hook balance', 'hook', 'hook', markup(slide.hook)))}
    <div class="under"><div class="chip r-label">${esc(slide.tag)}</div>${sub}</div>${zone}${foot(slide)}`;
}

function annotated(ctx) {
  const { slide } = ctx;
  const circle = slide.annotations.length && slide.annotations.every((a) => a.type === 'circle');
  return `${top(ctx)}<div class="main">
    <div class="imgarea">${frame(slide.image, slide.annotations)}</div>
    <div class="comment"><div class="mk${circle ? ' circle' : ''}"></div>${fitDiv('txt pretty', 'comment', 'comment', markup(slide.comment))}</div>
    </div>${foot(slide)}`;
}

function piece(ctx) {
  const { slide } = ctx;
  return `${top(ctx)}<div class="main">
    <div class="imgarea">${frame(slide.image)}</div>
    ${fitDiv('cap', 'body', 'caption block', `<div class="t">${esc(slide.title)}</div><div class="a">${esc(slide.artist)}, ${esc(slide.year)}</div><div class="w">Shown at: ${esc(slide.shownAt)}</div>`)}
    </div>${foot(slide)}`;
}

function text(ctx) {
  const { slide } = ctx;
  return `${slab(ctx, fitDiv('head balance', 'display', 'heading', markup(slide.heading)))}
    <div class="under"><div class="chip r-label">${esc(slide.tag)}</div></div>
    ${fitDiv('bodytext pretty', 'body', 'body text', paragraphs(slide.body))}
    ${slide.closing ? `<div class="pill closing">${esc(slide.closing)}</div>` : ''}
    ${foot(slide)}`;
}

const TEMPLATES = { cover, annotated, piece, text };

export function slideHtml({ tokens, post, slide, format }) {
  const css = buildCss(tokens, format);
  const ctx = { tokens, post, slide, brand: post.brand };
  const body = TEMPLATES[slide.template](ctx);
  const cfg = {
    format,
    annot: {
      color: colorValue(tokens, ANNOTATION.color),
      halo: colorValue(tokens, ANNOTATION.halo),
      stroke: ANNOTATION.stroke,
      haloExtra: ANNOTATION.haloExtra,
      gap: ANNOTATION.gap,
    },
  };
  return `<!doctype html><html lang="en"><head><meta charset="utf-8"><title>${esc(post.name)} ${slide.index}</title><style>${css}</style></head>
<body><div class="slide">${body}<div class="grain" aria-hidden="true"></div></div>
<script>window.__CFG=${JSON.stringify(cfg)};${RUNTIME}</script></body></html>`;
}

export { FORMATS, sizeOf };
