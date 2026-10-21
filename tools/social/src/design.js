// How the website's tokens are applied to a 1080px-wide Instagram canvas.
//
// The site's *mobile* sizes are the starting point, because a phone shows a 1080px post at
// about 390 points wide: that is exactly the width of the site's mobile layout. A fixed
// multiplier per role scales the mobile size up to the canvas. The style (family, weight,
// line height) and the base size still come from tokens.json; only the multiplier lives here.
import { typeStyle, spacing, cssVariables, fontFaceCss, grainSvg } from './tokens.js';

export const FORMATS = {
  feed: { name: 'feed', width: 1080, height: 1350, padTop: 64, padBottom: 64 },
  // Stories: Instagram covers the top and bottom ~250px with its own interface.
  story: { name: 'story', width: 1080, height: 1920, padTop: 250, padBottom: 250 },
};

// Canvas is 1080 wide; the site's mobile layout is 390 wide.
export const SPACE_SCALE = 2.5;

// role -> token style, multiplier, smallest size the text may shrink to (px)
export const ROLES = {
  hook: { token: 'display-xl', scale: 2.9, floor: 64 },
  display: { token: 'display', scale: 2.5, floor: 60 },
  title: { token: 'heading', scale: 1.9, floor: 40 },
  comment: { token: 'heading-sm', scale: 2.0, floor: 34 },
  lead: { token: 'lead', scale: 2.25, floor: 30 },
  body: { token: 'body-lg', scale: 2.4, floor: 30 },
  label: { token: 'label', scale: 2.0, floor: 24 },
  credit: { token: 'body', scale: 1.65, floor: 20 },
  wordmark: { token: 'wordmark', scale: 2.2, floor: 40 },
};

// Every box and circle in every post is drawn with this one style.
export const ANNOTATION = {
  color: 'coral', // a token name
  halo: 'cream', // thin outline under the stroke so it reads on any image
  stroke: 8, // px at 1080 wide, the same on every slide
  haloExtra: 6, // px added to the halo's width
  gap: 3, // px between the thing being marked and the stroke
};

// Fixed bands, so the comment and credits sit in the same place on every slide.
export const LAYOUT = {
  gap: 28,
  commentHeight: 250,
  footHeight: 104,
  slab: 470, // height of the plum slab below the top padding, on cover-style slides
  };

export function sizeOf(tokens, role) {
  const r = ROLES[role];
  return Math.round(typeStyle(tokens, r.token).fontSize * r.scale);
}

function roleCss(tokens) {
  const famVar = { display: 'var(--font-display)', sans: 'var(--font-sans)', script: 'var(--font-script)' };
  return Object.entries(ROLES)
    .map(([role, r]) => {
      const s = typeStyle(tokens, r.token);
      const size = Math.round(s.fontSize * r.scale);
      return `.r-${role}{font-family:${famVar[s.family]};font-size:${size}px;line-height:${s.lineHeight};font-weight:${s.fontWeight}}`;
    })
    .join('\n');
}

export function buildCss(tokens, format) {
  const margin = Math.round(spacing(tokens, 'gutter') * SPACE_SCALE);
  const card = Math.round(spacing(tokens, 'radius-card') * SPACE_SCALE);
  const f = FORMATS[format];
  const L = LAYOUT;
  const barH = Math.round(sizeOf(tokens, 'wordmark') * 1.25);
  const slabH = f.padTop + L.slab;
  const grain = grainSvg();
  return `
${fontFaceCss(tokens)}
${cssVariables(tokens)}
:root{${grain ? `--grain:url("data:image/svg+xml;utf8,${encodeURIComponent(grain)}");` : ''}--grain-opacity:${tokens.effects['grain-opacity']}}
${roleCss(tokens)}
*{box-sizing:border-box;margin:0;padding:0}
html,body{width:${f.width}px;height:${f.height}px;background:var(--c-peach);overflow:hidden}
body{color:var(--c-plum);font-family:var(--font-sans);-webkit-font-smoothing:antialiased}
.slide{position:relative;width:${f.width}px;height:${f.height}px;padding:${f.padTop}px ${margin}px ${f.padBottom}px;display:flex;flex-direction:column;overflow:hidden;background:var(--c-peach)}
/* the site's risograph grain, over everything except the pictures */
.grain{position:absolute;inset:0;pointer-events:none;background-image:var(--grain);mix-blend-mode:multiply;opacity:var(--grain-opacity);z-index:10}
.muted{color:var(--c-plum-muted)}
em.hl{font-style:normal;color:var(--c-peach)}
.sub em.hl,.bodytext em.hl,.cap em.hl{color:inherit;font-weight:600}
.fit{overflow:hidden;min-height:0;min-width:0}
.balance{text-wrap:balance}.pretty{text-wrap:pretty}
/* descenders in the display face poke below the line box; keep them inside the fit check */
.r-hook,.r-display,.r-title,.r-comment{padding-bottom:.12em}

/* the site's concentric rings */
.rings{position:absolute;border-radius:50%;background:repeating-radial-gradient(circle,transparent 0 20px,var(--ring) 20px 24px);pointer-events:none}

/* wordmark: the script face, decorative, for the site name only */
.wm{font-family:var(--font-script);line-height:1;white-space:nowrap}

/* top: compact slides show the wordmark and a label on peach */
.top{flex:0 0 ${barH}px;display:flex;justify-content:space-between;align-items:center;position:relative;z-index:2}
.top .wm{color:var(--c-plum)}
.top .tag{display:flex;align-items:center;gap:14px;color:var(--c-plum-muted);white-space:nowrap;min-width:0}
.dot{flex:0 0 auto;width:${Math.round(sizeOf(tokens, 'label') * 1.2)}px;height:${Math.round(sizeOf(tokens, 'label') * 1.2)}px;border-radius:var(--radius-round);background:var(--c-edition)}

.main{flex:1 1 0;min-height:0;display:flex;flex-direction:column;margin-top:${L.gap}px}
.foot{flex:0 0 ${L.footHeight}px;margin-top:20px;border-top:2px solid var(--c-plum-rule);padding-top:12px;color:var(--c-plum-muted)}
.foot .credit{text-wrap:balance}.foot .credit+.credit{margin-top:.25em}

/* cover-style slides: the plum slab with the big rounded corner, as on the site's hero */
.slab{position:relative;flex:0 0 ${slabH}px;height:${slabH}px;margin:-${f.padTop}px 0 0 -${margin}px;padding:${f.padTop}px ${margin}px 74px ${margin}px;background:var(--c-plum);color:var(--c-cream);border-radius:0 0 ${Math.round(f.width * 0.29)}px 0;overflow:hidden;display:flex;flex-direction:column;z-index:2}
.slab .rings{--ring:var(--c-pink);width:520px;height:520px;right:-230px;bottom:-230px}
.slab .bar{position:relative;flex:0 0 ${barH}px;display:flex;justify-content:space-between;align-items:center;gap:24px}
.slab .bar .wm{color:var(--c-peach)}
.slab .bar .lab{color:var(--c-peach);white-space:nowrap}
.slab .head{position:relative;flex:1 1 0;min-height:0;margin-top:${L.gap - 6}px;margin-right:90px;color:var(--c-cream)}
/* the edition disc: one per screen, tucked into the notch under the slab's curve */
.disc{position:absolute;right:96px;top:${slabH - 96}px;width:190px;height:190px;border-radius:var(--radius-round);background:var(--c-edition);z-index:3}
.under{flex:0 0 auto;margin-top:26px;display:flex;flex-direction:column;align-items:flex-start;gap:14px;max-width:760px}
.chip{background:var(--c-cream);color:var(--c-plum);border-radius:var(--radius-round);padding:.12em .7em .16em;font-weight:600;white-space:nowrap}
.sub{flex:0 0 auto;max-height:${Math.round(sizeOf(tokens, 'lead') * 1.42 * 3 + 4)}px;color:var(--c-plum)}
.hookspace{flex:1 1 0;min-height:12px}
.zone{flex:1 1 0;min-height:0;margin:${L.gap}px -${margin}px 0 0;position:relative;display:flex}
.zone .imgarea{flex:1 1 0;background:var(--c-plum-deep)}
.zone.panel{margin-right:0;background:var(--c-slate);color:var(--c-cream);border-radius:${card}px;padding:${Math.round(card * 0.42)}px ${Math.round(card * 0.55)}px;flex-direction:column;justify-content:space-between}
.facts{flex:1 1 0;min-height:0;display:flex;flex-direction:column}
.fact{display:grid;grid-template-columns:6.6em 1fr;gap:.6em;align-items:baseline;padding:.3em 0;border-top:2px solid var(--c-plum-rule)}
.fact:first-child{border-top:0;padding-top:0}
.fact .k{font-weight:600;font-size:.78em;color:var(--c-peach)}
.fact .v{font-size:1em;line-height:1.3}
.pill{flex:0 0 auto;align-self:flex-start;margin-top:12px;background:var(--c-coral);color:var(--c-plum-deep);border-radius:var(--radius-round);padding:.32em 1.1em .38em;font-weight:600;font-size:${sizeOf(tokens, 'label')}px;line-height:1.2;white-space:nowrap}

/* images */
.imgarea{position:relative;flex:1 1 0;min-height:0;display:flex;align-items:center;justify-content:center}
.main>.imgarea{align-items:flex-end} /* image sits next to its comment; any spare room goes above it */
.frame{position:relative;flex:0 0 auto;z-index:20}
.frame .clip{position:absolute;inset:0;overflow:hidden;background:var(--c-cream);outline:2px solid var(--c-plum-rule);outline-offset:-2px}
.frame img{position:absolute;max-width:none;max-height:none;display:block}
.frame svg.annot{position:absolute;inset:0;overflow:visible;pointer-events:none;clip-path:inset(-16px)} /* strokes on the image edge stay whole; stray shapes far outside are cut */

/* the comment: a plum card, same size and position on every annotated slide */
.comment{flex:0 0 ${L.commentHeight}px;margin-top:${L.gap}px;display:flex;gap:26px;align-items:flex-start;background:var(--c-plum);color:var(--c-cream);border-radius:${card}px;padding:${Math.round(card * 0.5)}px ${Math.round(card * 0.6)}px}
.comment .mk{flex:0 0 auto;margin-top:.3em;width:30px;height:30px;background:var(--c-coral)}
.comment .mk.circle{border-radius:var(--radius-round)}
.comment .txt{flex:1 1 0;height:100%;font-family:var(--font-display)}

/* piece caption */
.cap{flex:0 0 ${L.commentHeight}px;margin-top:${L.gap}px;background:var(--c-cream);color:var(--c-plum);border-radius:${card}px;padding:${Math.round(card * 0.5)}px ${Math.round(card * 0.6)}px}
.cap .t{font-family:var(--font-display);font-size:1.45em;line-height:1.05;margin-bottom:.25em}
.cap .a{line-height:1.3}
.cap .w{font-size:.8em;color:var(--c-plum-muted);margin-top:.45em;line-height:1.35}

/* closing text slide */
.bodytext{flex:1 1 0;min-height:0;margin-top:26px}
.closing{flex:0 0 auto;margin-top:18px}
`;
}
