// Draws the placeholder images used by the three example posts.
// Everything here is invented: the "report" is a made-up document with "XX" in place of
// numbers, and the artwork is an abstract picture drawn from shapes. Nothing is a real
// statistic, a real publication or a real artist.
//
//   npm run examples        (re-draws the images; the committed ones are already in posts/)
import fs from 'node:fs';
import path from 'node:path';
import { chromium } from 'playwright';
import { TOOL_ROOT } from '../src/tokens.js';

const posts = path.join(TOOL_ROOT, 'posts');
const PW = 1240, PH = 1754; // A4-ish page

const pageCss = `
*{box-sizing:border-box;margin:0}
body{width:${PW}px;height:${PH}px;background:#fff;color:#23282e;font:26px/1.5 'DejaVu Serif',Georgia,serif;position:relative;overflow:hidden}
.hd{position:absolute;left:90px;right:90px;top:60px;font:600 18px/1 'DejaVu Sans',Arial,sans-serif;letter-spacing:.12em;text-transform:uppercase;color:#6a7480;border-bottom:2px solid #d7dce1;padding-bottom:18px}
.ft{position:absolute;left:90px;right:90px;bottom:50px;font:18px/1 'DejaVu Sans',Arial,sans-serif;color:#8a929b;display:flex;justify-content:space-between}
h2{position:absolute;left:90px;right:90px;font:700 46px/1.15 'DejaVu Serif',Georgia,serif;color:#1d3f5f}
.l{position:absolute;height:15px;background:#dfe3e7;border-radius:3px}
.stat{position:absolute;font:700 120px/1 'DejaVu Sans',Arial,sans-serif;color:#2d6a9f}
.lab{position:absolute;font:22px/1.35 'DejaVu Sans',Arial,sans-serif;color:#4b5560}
.wm{position:absolute;right:90px;top:60px;font:700 17px/1 'DejaVu Sans',Arial,sans-serif;color:#b3452f;letter-spacing:.1em}
.bar{position:absolute;bottom:0;background:#9fbad3;width:90px}
.tbl{position:absolute;border-collapse:collapse;font:24px/1 'DejaVu Sans',Arial,sans-serif;color:#23282e}
.tbl td,.tbl th{border-bottom:2px solid #d7dce1;padding:16px 22px;text-align:left}.tbl th{color:#6a7480;font-size:19px;letter-spacing:.08em;text-transform:uppercase}
`;

const lines = (top, n, widths = [100, 96, 100, 92, 100, 60]) =>
  Array.from({ length: n }, (_, i) => `<div class="l" style="left:90px;top:${top + i * 38}px;width:${(PW - 180) * (widths[i % widths.length] / 100)}px"></div>`).join('');

const frame = (n, body) => `<style>${pageCss}</style>
<div class="hd">The Placeholder Report on Hunger</div><div class="wm">SAMPLE ONLY · NOT REAL DATA</div>${body}
<div class="ft"><span>[Publisher] · 2099</span><span>${n}</span></div>`;

const pages = [
  // 1: big number, top right, beside text
  frame(14, `<h2 style="top:200px">1. A placeholder heading about food</h2>${lines(310, 5)}
    <div class="stat" id="stat" style="left:90px;top:560px">XX.X%</div>
    <div class="lab" style="left:90px;top:700px;width:520px">of an imaginary group of people in a made-up year (sample statistic, not real data)</div>
    ${lines(860, 14)}`),
  // 2: a number inside a table
  frame(22, `<h2 style="top:200px">2. A table of invented figures</h2>${lines(310, 3)}
    <table class="tbl" style="left:90px;top:470px;width:${PW - 180}px"><tr><th>Group</th><th>Year</th><th>Share</th></tr>
    <tr><td>Group A</td><td>2099</td><td>NN.N%</td></tr><tr><td>Group B</td><td>2099</td><td><span id="stat" style="font-weight:700;color:#2d6a9f;font-size:30px">NN.N%</span></td></tr>
    <tr><td>Group C</td><td>2099</td><td>NN.N%</td></tr><tr><td>Group D</td><td>2099</td><td>NN.N%</td></tr></table>
    ${lines(1000, 16)}`),
  // 3: a bar chart with a labelled bar
  frame(31, `<h2 style="top:200px">3. A chart with made-up bars</h2>${lines(310, 3)}
    <div style="position:absolute;left:110px;top:520px;width:1000px;height:520px;border-left:3px solid #6a7480;border-bottom:3px solid #6a7480">
      ${[40, 55, 35, 70, 62, 48].map((h, i) => `<div class="bar" style="left:${40 + i * 160}px;height:${h * 6}px;${i === 3 ? 'background:#2d6a9f' : ''}"></div>`).join('')}
      <div class="lab" id="stat" style="left:${40 + 3 * 160 - 20}px;bottom:${70 * 6 + 14}px;font:700 36px/1 'DejaVu Sans',Arial,sans-serif;color:#2d6a9f">XX%</div></div>
    <div class="lab" style="left:110px;top:1070px">Figure 3. Imaginary values by imaginary category.</div>${lines(1160, 12)}`),
  // 4: a number inline in a paragraph
  frame(40, `<h2 style="top:200px">4. A paragraph with one number in it</h2>
    ${lines(310, 6)}
    <div style="position:absolute;left:90px;right:90px;top:560px;font:36px/1.55 'DejaVu Serif',Georgia,serif;color:#23282e">This sentence stands in for a finding. It says that a made-up measure moved to <span id="stat" style="font-weight:700;color:#2d6a9f;padding:0 18px;margin:0">XX.X per cent</span> in an invented year, which is not a real number.</div>
    ${lines(880, 16)}`),
  // 5: a callout box with a number, lower on the page
  frame(47, `<h2 style="top:200px">5. A callout at the bottom</h2>${lines(310, 8)}
    <div style="position:absolute;left:90px;right:90px;top:760px;height:420px;background:#eef3f8;border-left:10px solid #2d6a9f;padding:48px 56px">
      <div class="lab" style="position:static;font-weight:700;letter-spacing:.1em;text-transform:uppercase;margin-bottom:12px">Key finding (invented)</div>
      <div class="stat" id="stat" style="position:static;display:inline-block">NN million</div>
      <div class="lab" style="position:static;margin-top:18px;font-size:26px">is a placeholder, and stands for a number a real report would give.</div></div>
    ${lines(1260, 10)}`),
];

const cover = `<style>${pageCss}body{background:#1d3f5f;color:#fff}.t{position:absolute;left:100px;right:100px;top:520px;font:700 104px/1.05 'DejaVu Serif',Georgia,serif}
.s{position:absolute;left:100px;top:420px;font:600 26px/1 'DejaVu Sans',Arial,sans-serif;letter-spacing:.2em;text-transform:uppercase;color:#9fbad3}
.p{position:absolute;left:100px;bottom:110px;font:26px/1.4 'DejaVu Sans',Arial,sans-serif;color:#dbe6f0}
.blk{position:absolute;left:100px;top:100px;width:200px;height:20px;background:#2d6a9f}
.x{position:absolute;left:100px;right:100px;top:1010px;font:700 30px/1.3 'DejaVu Sans',Arial,sans-serif;color:#e8a898;letter-spacing:.06em}</style>
<div class="blk"></div><div class="s">Annual report · sample</div><div class="t">The Placeholder Report on Hunger</div>
<div class="x">SAMPLE ONLY. AN INVENTED DOCUMENT USED TO TEST THE POST TOOL. NOT A REAL REPORT.</div>
<div class="p">[Publisher name]<br>2099</div>`;

// ---- artwork: "Empty Table" (abstract, no people) -------------------------------
const AW = 2000, AH = 1500;
const artwork = `<style>*{margin:0}body{width:${AW}px;height:${AH}px;overflow:hidden}</style>
<svg xmlns="http://www.w3.org/2000/svg" width="${AW}" height="${AH}" viewBox="0 0 ${AW} ${AH}">
<rect width="${AW}" height="${AH}" fill="#d9cdb8"/>
<rect y="860" width="${AW}" height="640" fill="#5a3b2e"/>
<rect y="840" width="${AW}" height="30" fill="#3f291f"/>
<!-- window -->
<rect x="1280" y="140" width="480" height="560" fill="#f1e6cf"/><rect x="1280" y="140" width="480" height="560" fill="none" stroke="#3f291f" stroke-width="22"/>
<line x1="1520" y1="140" x2="1520" y2="700" stroke="#3f291f" stroke-width="16"/><line x1="1280" y1="420" x2="1760" y2="420" stroke="#3f291f" stroke-width="16"/>
<!-- plate -->
<ellipse cx="760" cy="1090" rx="470" ry="150" fill="#2b1c15"/>
<ellipse cx="760" cy="1070" rx="470" ry="150" fill="#efe7d6"/>
<ellipse cx="760" cy="1072" rx="340" ry="98" fill="#e2d8c2"/>
<ellipse cx="760" cy="1076" rx="270" ry="72" fill="#ece3d0"/>
<!-- a hairline crack in the rim -->
<path d="M1128 1004 l-26 18 l14 22 l-30 26" fill="none" stroke="#a8402c" stroke-width="5" stroke-linejoin="round"/>
<!-- fork and knife, laid straight -->
<rect x="130" y="960" width="26" height="330" fill="#9aa0a6"/><rect x="104" y="940" width="78" height="26" fill="#9aa0a6"/>
<rect x="104" y="880" width="12" height="70" fill="#9aa0a6"/><rect x="134" y="880" width="12" height="70" fill="#9aa0a6"/><rect x="164" y="880" width="12" height="70" fill="#9aa0a6"/>
<rect x="1330" y="940" width="28" height="360" fill="#9aa0a6"/><path d="M1358 940 q70 80 0 200 z" fill="#b6bbc0"/>
<!-- spilled grains, far from the plate -->
${Array.from({ length: 46 }, (_, i) => {
  const a = i * 2.399963; const r = 14 + i * 4.2;
  return `<ellipse cx="${1560 + Math.cos(a) * r * 1.5}" cy="${1210 + Math.sin(a) * r * 0.5}" rx="9" ry="4.5" transform="rotate(${(i * 37) % 180} ${1560 + Math.cos(a) * r * 1.5} ${1210 + Math.sin(a) * r * 0.5})" fill="#e8c36a"/>`;
}).join('')}
<!-- long shadow of an empty chair on the wall -->
<polygon points="260,140 380,140 420,600 300,600" fill="#c3b79f"/><polygon points="300,600 420,600 440,840 280,840" fill="#c3b79f"/>
<text x="1990" y="1488" font-family="DejaVu Sans, Arial, sans-serif" font-size="28" fill="#d9cdb8" text-anchor="end" opacity=".9">PLACEHOLDER ARTWORK · NOT A REAL WORK</text>
</svg>`;

const browser = await chromium.launch();
const ctx = await browser.newContext({ viewport: { width: PW, height: PH } });
const page = await ctx.newPage();

async function shot(html, file, w, h) {
  await page.setViewportSize({ width: w, height: h });
  await page.setContent(`<!doctype html><html><body>${html}</body></html>`);
  await page.waitForTimeout(100);
  fs.mkdirSync(path.dirname(file), { recursive: true });
  await page.screenshot({ path: file, clip: { x: 0, y: 0, width: w, height: h } });
}

const rep = path.join(posts, 'example-report');
await shot(cover, path.join(rep, 'cover.png'), PW, PH);
for (const [i, html] of pages.entries()) {
  await shot(html, path.join(rep, `page-${i + 1}.png`), PW, PH);
  const r = await page.evaluate(() => {
    const e = document.getElementById('stat').getBoundingClientRect();
    return { x: e.x, y: e.y, w: e.width, h: e.height };
  });
  const pc = (v, t) => Math.round((v / t) * 1000) / 10;
  console.log(`page-${i + 1}: box { x: ${pc(r.x, PW)}, y: ${pc(r.y, PH)}, w: ${pc(r.w, PW)}, h: ${pc(r.h, PH)} }`);
}
await shot(artwork, path.join(posts, 'example-artwork', 'artwork.png'), AW, AH);
await browser.close();
console.log('Example images written.');
