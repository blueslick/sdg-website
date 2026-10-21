// How the website's tokens are applied to a 1080px-wide Instagram canvas.
//
// The tokens are sized for a web page (16px body). A phone shows a 1080px post at
// about a third of its width, so type is scaled up by a fixed multiplier per role.
// The *style* (family, weight, line height, tracking, optical size) and the *base
// size* still come from tokens.json; only the multiplier lives here.
import { typeStyle, spacing, cssVariables, fontFaceCss } from './tokens.js';

export const FORMATS = {
  feed: { name: 'feed', width: 1080, height: 1350, padTop: 64, padBottom: 64 },
  // Stories: Instagram covers the top and bottom ~250px with its own interface.
  story: { name: 'story', width: 1080, height: 1920, padTop: 250, padBottom: 250 },
};

// role -> token style, multiplier, smallest size the text may shrink to (px)
export const ROLES = {
  hook: { token: 'display-xl', scale: 1.35, floor: 72 },
  display: { token: 'display', scale: 1.4, floor: 56 },
  title: { token: 'heading', scale: 1.6, floor: 40 },
  comment: { token: 'heading', scale: 1.5, floor: 32 },
  body: { token: 'body-lg', scale: 2, floor: 30 },
  label: { token: 'label', scale: 2.25, floor: 22 },
  credit: { token: 'label', scale: 2, floor: 20 },
};

// Every box and circle in every post is drawn with this one style.
export const ANNOTATION = {
  color: 'coral', // token name: coral or terracotta
  halo: 'paper', // thin outline under the stroke so it reads on any image
  stroke: 8, // px at 1080 wide, the same on every slide
  haloExtra: 6, // px added to the halo's width
  gap: 3, // px between the thing being marked and the stroke
};

// Fixed bands, so the comment and credits sit in the same place on every slide.
export const LAYOUT = {
  gap: 28,
  commentHeight: 250,
  footHeight: 112,
  coverZoneHeight: { feed: 500, story: 560 },
};

export function sizeOf(tokens, role) {
  const r = ROLES[role];
  return Math.round(typeStyle(tokens, r.token).fontSize * r.scale);
}

function roleCss(tokens) {
  const famVar = { display: 'var(--font-display)', sans: 'var(--font-sans)', mono: 'var(--font-mono)' };
  return Object.entries(ROLES)
    .map(([role, r]) => {
      const s = typeStyle(tokens, r.token);
      const size = Math.round(s.fontSize * r.scale);
      // Fraunces' optical-size axis and the README's WONK/SOFT hero settings.
      const fvs =
        s.family === 'display'
          ? `font-variation-settings:${s.opticalSize ? `"opsz" ${s.opticalSize},` : ''} "WONK" ${role === 'hook' ? 1 : 0}, "SOFT" ${role === 'hook' ? 50 : 0};`
          : '';
      const upper = role === 'label' ? 'text-transform:uppercase;' : '';
      return `.r-${role}{font-family:${famVar[s.family]};font-size:${size}px;line-height:${s.lineHeight};font-weight:${s.fontWeight};letter-spacing:${s.letterSpacing};${fvs}${upper}}`;
    })
    .join('\n');
}

export function buildCss(tokens, theme, format) {
  const margin = spacing(tokens, 'space-4') * 2; // page margin, scaled like the type
  const f = FORMATS[format];
  const L = LAYOUT;
  const labelLine = Math.round(sizeOf(tokens, 'label') * 1.45);
  const heroTop = labelLine * 2;
  return `
${fontFaceCss(tokens)}
${cssVariables(tokens, theme)}
${roleCss(tokens)}
*{box-sizing:border-box;margin:0;padding:0}
html,body{width:${f.width}px;height:${f.height}px;background:var(--paper);overflow:hidden}
body{color:var(--ink);font-family:var(--font-sans);-webkit-font-smoothing:antialiased}
.slide{position:relative;width:${f.width}px;height:${f.height}px;padding:${f.padTop}px ${margin}px ${f.padBottom}px;display:flex;flex-direction:column;overflow:hidden;background:var(--paper)}
.muted{color:var(--ink-muted)}
em.hl{font-style:normal;color:var(--terracotta)}
.fit{overflow:hidden;min-height:0;min-width:0}
.balance{text-wrap:balance}.pretty{text-wrap:pretty}
/* descenders in the display face poke below the line box; keep them inside the fit check */
.r-hook,.r-display,.r-title,.r-comment{padding-bottom:.12em}

/* top band */
.top{flex:0 0 auto;display:flex;justify-content:space-between;align-items:center;height:${labelLine}px;position:relative;z-index:2}
.top.hero{height:${heroTop}px;flex-direction:column;align-items:flex-start;justify-content:flex-start}
.top .l{display:flex;align-items:center;gap:14px;white-space:nowrap}
.top .l.fit,.top .tag.fit{overflow:hidden}
.top .tag{white-space:nowrap;color:var(--ink-muted);height:${labelLine}px;display:flex;align-items:center}
.dot{flex:0 0 auto;width:${Math.round(sizeOf(tokens, 'label') * 1.0)}px;height:${Math.round(sizeOf(tokens, 'label') * 1.0)}px;border-radius:var(--radius-round);background:var(--edition)}
/* the one edition disc on hero slides: bleeds off the top-right corner */
.disc{position:absolute;right:-70px;top:-70px;width:230px;height:230px;border-radius:var(--radius-round);background:var(--edition);z-index:1}

.main{flex:1 1 0;min-height:0;display:flex;flex-direction:column;margin-top:${L.gap}px}
.foot{flex:0 0 ${L.footHeight}px;margin-top:20px;border-top:2px solid var(--rule);padding-top:12px;color:var(--ink-muted);line-height:1.3}
.foot .credit{text-wrap:balance}.foot .credit+.credit{margin-top:.3em}

/* images */
.imgarea{position:relative;flex:1 1 0;min-height:0;display:flex;align-items:center;justify-content:center}
.main>.imgarea{align-items:flex-end} /* image sits next to its comment; any spare room goes above it */
.frame{position:relative;flex:0 0 auto}
.frame .clip{position:absolute;inset:0;overflow:hidden;background:var(--paper-2);outline:2px solid var(--rule);outline-offset:-2px}
.frame img{position:absolute;max-width:none;max-height:none;display:block}
.frame svg.annot{position:absolute;inset:0;overflow:visible;pointer-events:none;clip-path:inset(-16px)} /* strokes on the image edge stay whole; stray shapes far outside are cut */

/* the comment band: same size and position on every annotated slide */
.comment{flex:0 0 ${L.commentHeight}px;margin-top:${L.gap}px;display:flex;gap:24px;align-items:flex-start}
.comment .mk{flex:0 0 auto;margin-top:.34em;width:30px;height:30px;background:var(--coral)}
.comment .mk.circle{border-radius:var(--radius-round)}
.comment .txt{flex:1 1 0;height:100%;font-family:var(--font-display)}

/* cover / announcement */
.hookzone{flex:1 1 0;min-height:0;display:flex;flex-direction:column;gap:20px}
.hook{flex:1 1 0;min-height:0}
.sub{flex:0 0 auto;max-height:${Math.round(sizeOf(tokens, 'body') * 1.5 * 3)}px;color:var(--ink)}
.zone{flex:0 0 ${L.coverZoneHeight[format]}px;margin:${L.gap}px -${margin}px 0 0;position:relative;display:flex}
.zone .imgarea{flex:1 1 0;background:var(--paper-2)}
.zone.panel{background:var(--paper-2);padding:${spacing(tokens, 'space-4')}px ${margin}px ${spacing(tokens, 'space-4')}px ${spacing(tokens, 'space-4')}px;flex-direction:column;justify-content:space-between}
.facts{flex:1 1 0;min-height:0;display:flex;flex-direction:column}
.fact{display:grid;grid-template-columns:7.2em 1fr;gap:.6em;align-items:baseline;padding:.45em 0;border-top:2px solid var(--rule)}
.fact:first-child{border-top:0;padding-top:0}
.fact .k{font-family:var(--font-mono);font-size:.62em;text-transform:uppercase;letter-spacing:.08em;color:var(--ink-muted)}
.fact .v{font-family:var(--font-sans);font-size:1em;line-height:1.3}
.pill{flex:0 0 auto;align-self:flex-start;margin-top:20px;background:var(--coral);color:var(--on-accent);border-radius:var(--radius-round);padding:.4em 1.2em;font-family:var(--font-sans);font-weight:500;font-size:${sizeOf(tokens, 'body')}px;line-height:1.2;white-space:nowrap}

/* piece caption */
.cap{flex:0 0 ${L.commentHeight}px;margin-top:${L.gap}px;border-top:2px solid var(--rule);padding-top:20px}
.cap .t{font-family:var(--font-display);font-weight:500;font-size:1.2em;line-height:1.1;font-variation-settings:"opsz" 36;margin-bottom:.3em}
.cap .a{font-family:var(--font-sans);line-height:1.3}
.cap .w{font-family:var(--font-mono);font-size:.6em;text-transform:uppercase;letter-spacing:.08em;color:var(--ink-muted);margin-top:.5em;line-height:1.35}

/* closing text slide */
.heading{flex:0 1 auto;max-height:46%}
.rulehair{flex:0 0 2px;background:var(--rule);margin:28px 0}
.bodytext{flex:1 1 0;min-height:0}
.closing{flex:0 0 auto;margin-top:20px;font-family:var(--font-mono);color:var(--ink-muted)}
`;
}
