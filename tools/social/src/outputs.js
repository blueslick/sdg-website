// Everything that is written next to the PNGs: caption.txt, alt-text.txt, preview.html.
import fs from 'node:fs';
import path from 'node:path';
import { cssVariables, fontFaceCss } from './tokens.js';

const esc = (s) => String(s).replace(/&/g, '&amp;').replace(/</g, '&lt;').replace(/>/g, '&gt;').replace(/"/g, '&quot;');
const plain = (s) => String(s ?? '').replace(/\*/g, '').replace(/\s+/g, ' ').trim();
const sentence = (s) => (/[.!?]$/.test(s) ? s : s + '.');

/** Alt text per slide, ready to paste into Instagram's "alt text" field for each image. */
export function altTexts(post) {
  return post.slides.map((s) => {
    switch (s.template) {
      case 'cover':
        return s.zone === 'image'
          ? `${sentence(s.image?.alt ?? '')} Headline: ${plain(s.hook)}`.trim()
          : [plain(s.hook), plain(s.subtitle), ...(s.facts ?? []).map((f) => `${f.label}: ${plain(f.value)}`), plain(s.cta)].filter(Boolean).map(sentence).join(' ');
      case 'annotated':
        return `${sentence(s.alt ?? '')} Marked with a ${s.annotations[0]?.type ?? 'shape'}. Comment: ${plain(s.comment)}`.trim();
      case 'piece':
        return `${sentence(s.alt ?? '')} ${s.title}, ${s.artist}, ${s.year}. Shown at ${s.shownAt}.`.trim();
      default:
        return `${sentence(plain(s.heading))} ${plain(s.body)}`;
    }
  });
}

export function writeText(post, outDir) {
  fs.mkdirSync(outDir, { recursive: true });
  fs.writeFileSync(path.join(outDir, 'caption.txt'), post.caption.text);
  const alts = altTexts(post).map((a, i) => `Slide ${i + 1}: ${a}`).join('\n\n');
  fs.writeFileSync(path.join(outDir, 'alt-text.txt'), alts + '\n');
}

const CHECKLIST = [
  'No photos of people in poverty or being served. Typography, shapes, food, hands and students only.',
  'The source credit (name, publisher, year) is on the cover or last slide, and there is an image credit line.',
  'Nothing calls us a charity, non-profit, NGO, foundation or society. We are "run by student volunteers".',
  'The soup kitchen is not named. The slide says [Soup Kitchen Name] until written permission arrives.',
  'No invented numbers, quotes, judges, past editions or fundraising target. Every statistic matches the source.',
];

/** One HTML page showing every slide, the caption, and every warning, for checking before posting. */
export function writePreview({ tokens, post, outDir, notes, files }) {
  const rel = (f) => path.relative(outDir, f).split(path.sep).join('/');
  const alts = altTexts(post);
  const slideCard = (f, i, w) => `<figure><a href="${rel(f)}"><img src="${rel(f)}" width="${w}" alt="${esc(alts[i])}"></a><figcaption>${i + 1} · ${esc(post.slides[i].template)} · ${esc(post.slides[i].tag)}</figcaption></figure>`;

  const warnLines = [
    ...post.warnings.map((w) => ({ slide: w.slide, level: 'warn', msg: w.msg })),
    ...notes.filter((n) => n.level !== 'info').map((n) => ({ slide: n.slide, level: n.level, msg: `[${n.format}] ${n.field}: ${n.msg}`, })),
  ];
  const infoLines = notes.filter((n) => n.level === 'info');
  const li = (w) => `<li class="${w.level}">${w.slide ? `<b>Slide ${w.slide}.</b> ` : ''}${esc(w.msg)}</li>`;

  const html = `<!doctype html><html lang="en"><head><meta charset="utf-8"><meta name="viewport" content="width=device-width,initial-scale=1">
<title>Preview: ${esc(post.name)}</title>
<style>
${fontFaceCss(tokens)}
${cssVariables(tokens, 'light')}
*{box-sizing:border-box}body{margin:0;background:var(--paper);color:var(--ink);font:16px/1.6 Inter,system-ui,sans-serif;padding:32px 16px 96px}
main{max-width:1500px;margin:0 auto}h1{font:500 32px/1.15 Fraunces,Georgia,serif;margin:0 0 4px}h2{font:500 20px/1.2 Fraunces,Georgia,serif;margin:48px 0 12px;padding-top:16px;border-top:2px solid var(--rule)}
.meta{color:var(--ink-muted);font:12px/16px "IBM Plex Mono",ui-monospace,monospace;text-transform:uppercase;letter-spacing:.08em}
.grid{display:flex;flex-wrap:wrap;gap:20px;align-items:flex-start}figure{margin:0}figure img{display:block;border:2px solid var(--rule);background:var(--paper-2)}
figcaption{font:12px/16px "IBM Plex Mono",ui-monospace,monospace;color:var(--ink-muted);margin-top:6px;text-transform:uppercase;letter-spacing:.08em}
ul{padding-left:20px}li.warn,li.error{color:var(--terracotta);font-weight:500}li.info{color:var(--ink-muted)}
.ok{background:var(--paper-2);padding:12px 16px}textarea{width:100%;max-width:760px;height:210px;font:16px/1.6 Inter,system-ui,sans-serif;padding:12px;background:var(--paper);color:var(--ink);border:2px solid var(--rule)}
button{font:500 16px Inter,system-ui,sans-serif;background:var(--coral);color:var(--on-accent);border:0;border-radius:var(--radius-round);padding:8px 20px;cursor:pointer}
.alts li{margin-bottom:8px}.alts{max-width:900px}
</style></head><body><main>
<p class="meta">Preview · ${esc(post.type)} · ${post.slides.length} slides · theme ${esc(post.theme)}</p>
<h1>${esc(post.name)}</h1>
<h2>Warnings</h2>
${warnLines.length ? `<ul>${warnLines.map(li).join('')}</ul>` : '<p class="ok">No warnings.</p>'}
${infoLines.length ? `<details><summary class="meta">Automatic fixes (${infoLines.length})</summary><ul>${infoLines.map((n) => li({ ...n, msg: `[${n.format}] ${n.field}: ${n.msg}` })).join('')}</ul></details>` : ''}
<h2>Feed posts (1080 × 1350)</h2><div class="grid">${files.feed?.map((f, i) => slideCard(f, i, 420)).join('') ?? ''}</div>
${files.story ? `<h2>Story versions (1080 × 1920)</h2><div class="grid">${files.story.map((f, i) => slideCard(f, i, 236)).join('')}</div>` : ''}
<h2>Caption</h2><textarea id="cap" readonly>${esc(post.caption.text)}</textarea><p><button onclick="var t=document.getElementById('cap');t.select();document.execCommand('copy');this.textContent='Copied'">Copy caption</button></p>
<h2>Alt text (paste into Instagram's alt text for each image)</h2><ol class="alts">${alts.map((a) => `<li>${esc(a)}</li>`).join('')}</ol>
<h2>Before you post</h2><ul>${CHECKLIST.map((x) => `<li>${esc(x)}</li>`).join('')}</ul>
</main></body></html>`;
  const file = path.join(outDir, 'preview.html');
  fs.writeFileSync(file, html);
  return file;
}
