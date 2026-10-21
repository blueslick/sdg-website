// The edition cover: a plate of nasi lemak drawn as a 36 x 36 grid of patterned
// tiles, ported from the design's nasi-lemak-cover.js. It renders to an SVG at
// build time, so the page needs no JavaScript. The egg yolk takes the edition
// colour; everything else maps light-to-dark values onto the mosaic ramp.
import { editionColor, mosaic } from './tokens';

const N = 36;

type Tile = { t: number; yolk: boolean };

function lcg(seed: number) {
  return () => (seed = (seed * 16807) % 2147483647) / 2147483647;
}

// Tone (0 dark to 1 light) for every tile, row by row.
function buildGrid(): Tile[] {
  const rnd = lcg(5);
  const clamp = (v: number) => Math.max(0, Math.min(1, v));
  const nz = (i: number, j: number) =>
    (Math.sin(i * 1.9 + j * 0.7) + Math.sin(i * 0.6 - j * 1.4) + Math.sin((i + j) * 0.43)) / 6;
  const E = (u: number, v: number, cx: number, cy: number, rx: number, ry: number) =>
    ((u - cx) / rx) ** 2 + ((v - cy) / ry) ** 2;
  const nuts = [[.47,.14],[.53,.11],[.59,.13],[.65,.16],[.71,.20],[.50,.20],[.56,.18],[.62,.22],[.68,.26],[.44,.24],[.53,.25],[.59,.28],[.76,.25]];
  const cukes = [[.07,.50],[.08,.60],[.10,.69],[.14,.77],[.19,.84],[.26,.89],[.34,.92]];
  const out: Tile[] = [];

  for (let j = 0; j < N; j++) for (let i = 0; i < N; i++) {
    const u = (i + 0.5) / N, v = (j + 0.5) / N, n = nz(i, j) + (rnd() - 0.5) * 0.25;
    // banana leaf: dark, diagonal veins, light sheen top-left
    let t = 0.08 + 0.06 * Math.sin((u * 0.7 + v) * 46) + 0.1 * clamp(1 - Math.hypot(u - 0.15, v - 0.1) / 0.6) + n * 0.05;
    let yolk = false;
    // contact shadows
    if (E(u, v, .56, .62, .34, .30) < 1) t -= 0.06;
    if (E(u, v, .90, .55, .16, .32) < 1) t -= 0.04;
    // peanuts
    for (const [x, y] of nuts) {
      if (Math.hypot(u - x, (v - y) * 1.15) < 0.036) t = 0.3 + 0.2 * clamp(1 - Math.hypot(u - x + 0.012, v - y + 0.012) / 0.04) + n * 0.04;
    }
    // sambal, top left
    const s1 = E(u, v, .19, .30, .21, .15) + n * 0.35;
    if (s1 < 1) t = 0.46 + 0.1 * (1 - s1) + 0.12 * n + (rnd() < 0.15 ? 0.1 : 0);
    // anchovy sambal, bottom
    const s2 = E(u, v, .66, .85, .26, .11) + n * 0.35;
    if (s2 < 1) t = 0.34 + 0.12 * (1 - s2) + 0.16 * n + (Math.sin((u * 3 - v) * 40) > 0.7 ? 0.14 : 0);
    // eggs
    for (const [cx, cy, rx, ry] of [[.87, .37, .15, .12], [.89, .63, .13, .15]]) {
      const e = E(u, v, cx, cy, rx, ry);
      if (e < 1) {
        const ye = E(u, v, cx + 0.01, cy, rx * 0.58, ry * 0.58);
        if (ye < 1) { yolk = true; t = 0.45 + 0.45 * (1 - ye) + n * 0.1; }
        else t = 0.95 + 0.05 * (1 - Math.hypot(u - cx + 0.05, v - cy + 0.04) / 0.2) - (e > 0.85 ? 0.14 : 0);
      }
    }
    // cucumber slices, bottom left, later ones overlap
    for (const [cx, cy] of cukes) {
      const d = Math.hypot(u - cx, (v - cy) * 1.25) / 0.085;
      if (d < 1) { yolk = false; t = d > 0.8 ? 0.2 + n * 0.05 : 0.74 - 0.14 * d + n * 0.04; }
    }
    // rice dome
    const dome = v < 0.66 ? Math.hypot(u - 0.48, v - 0.5) / 0.28 : E(u, v, .48, .66, .27, .10);
    if (dome < 1) {
      yolk = false;
      const l = Math.hypot(u - 0.39, v - 0.36) / 0.42;
      t = 1.02 - 0.26 * clamp(l) - (dome > 0.9 ? 0.08 : 0) + (rnd() - 0.5) * 0.08;
      if (v > 0.62) t -= (0.06 * (v - 0.62)) / 0.1;
    }
    out.push({ t: clamp(t), yolk });
  }
  return out;
}

// One of eight small patterns drawn on a 10 x 10 tile, in the foreground colour.
function pattern(k: number, x: number, y: number, fg: string): string {
  const f = `fill="${fg}"`;
  const s = `fill="none" stroke="${fg}"`;
  switch (k) {
    case 1: return `<circle cx="${x + 5}" cy="${y + 5}" r="2.2" ${f}/>`;
    case 2: return [[2.5, 2.5], [7.5, 2.5], [2.5, 7.5], [7.5, 7.5]].map(([a, b]) => `<circle cx="${x + a}" cy="${y + b}" r="1.3" ${f}/>`).join('');
    case 3: return `<path d="M${x + 4} ${y + 1}h2v8h-2zM${x + 1} ${y + 4}h8v2h-8z" ${f}/>`;
    case 4: return `<path d="M${x + 5} ${y + 1}L${x + 9} ${y + 5}L${x + 5} ${y + 9}L${x + 1} ${y + 5}z" ${f}/>`;
    case 5: return `<path d="M${x} ${y}h5v5h-5zM${x + 5} ${y + 5}h5v5h-5z" ${f}/>`;
    case 6: return `<path d="M${x + 1} ${y + 1}L${x + 9} ${y + 9}M${x + 9} ${y + 1}L${x + 1} ${y + 9}" ${s} stroke-width="1.4"/>`;
    case 7: return `<rect x="${x + 2.2}" y="${y + 2.2}" width="5.6" height="5.6" ${s} stroke-width="1.5"/>`;
    default: return '';
  }
}

export function nasiLemakSvg(accent: string = editionColor): string {
  const grid = buildGrid();
  const rnd = lcg(11);
  const ramp = mosaic.ramp;
  const yramp = mosaic['edition-ramp'].map((c) => (c === 'edition' ? accent : c));
  const parts: string[] = [];

  for (let j = 0; j < N; j++) for (let i = 0; i < N; i++) {
    const o = grid[j * N + i], R = o.yolk ? yramp : ramp, L = R.length;
    const idx = Math.max(0, Math.min(L - 1, Math.round(o.t * (L - 1) + (rnd() - 0.5) * 0.5)));
    const f = Math.max(0, Math.min(L - 1, idx + (rnd() < 0.5 ? -1 : 1)));
    const x = i * 10, y = j * 10;
    // 10.05 wide so neighbouring tiles overlap slightly and no hairline seams show
    parts.push(`<rect x="${x}" y="${y}" width="10.05" height="10.05" fill="${R[idx]}"/>`);
    parts.push(pattern(Math.floor(rnd() * 8), x, y, R[f]));
  }

  return `<svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 360 360" width="720" height="720" shape-rendering="crispEdges">${parts.join('')}</svg>`;
}
