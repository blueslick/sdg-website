// Reads the website's design tokens (tokens.json) and fonts (fonts/) so social
// posts can never drift from the site. Nothing in this tool hard-codes a colour,
// a font or a type size: it all comes from here.
import fs from 'node:fs';
import path from 'node:path';

export const REPO_ROOT = path.resolve(import.meta.dirname, '..', '..', '..');
export const TOOL_ROOT = path.resolve(import.meta.dirname, '..');

const px = (v) => (typeof v === 'string' ? parseFloat(v) : v);

export function loadTokens() {
  const file = path.join(REPO_ROOT, 'tokens.json');
  if (!fs.existsSync(file)) {
    throw new Error(`Could not find tokens.json at ${file}. This tool expects to live in tools/social/ inside the website repo.`);
  }
  return JSON.parse(fs.readFileSync(file, 'utf8'));
}

/** The site name lives in src/site.ts (one value, one change to rename). */
export function loadSiteName() {
  try {
    const src = fs.readFileSync(path.join(REPO_ROOT, 'src', 'site.ts'), 'utf8');
    const m = src.match(/SITE_NAME\s*=\s*['"`]([^'"`]+)['"`]/);
    if (m) return m[1];
  } catch { /* fall through */ }
  return loadTokens().name;
}

export function colorValue(tokens, name, theme = 'light') {
  const t = tokens.color.tokens.find((c) => c.name === name);
  if (!t) throw new Error(`tokens.json has no colour called "${name}".`);
  return t.value[theme];
}

/** All colours, spacing and radii as CSS custom properties for one theme. */
export function cssVariables(tokens, theme = 'light') {
  const lines = [];
  for (const c of tokens.color.tokens) lines.push(`--${c.name}: ${c.value[theme]};`);
  for (const s of tokens.spacing.tokens) lines.push(`--${s.name}: ${s.value};`);
  for (const r of tokens.radius.tokens) lines.push(`--${r.name}: ${r.value};`);
  for (const [k, v] of Object.entries(tokens.type.families)) lines.push(`--font-${k}: ${v};`);
  return `:root{\n  ${lines.join('\n  ')}\n}`;
}

const MIME = { woff2: 'font/woff2', woff: 'font/woff', ttf: 'font/ttf', otf: 'font/otf' };

/** @font-face rules with the fonts embedded, so rendering needs no network and no installed fonts. */
export function fontFaceCss(tokens) {
  return tokens.type.fonts
    .map((f) => {
      const file = path.join(REPO_ROOT, f.file);
      if (!fs.existsSync(file)) throw new Error(`Font file missing: ${f.file} (listed in tokens.json).`);
      const ext = path.extname(file).slice(1).toLowerCase();
      const b64 = fs.readFileSync(file).toString('base64');
      return `@font-face{font-family:"${f.family}";src:url(data:${MIME[ext]};base64,${b64}) format("${ext}");font-weight:${f.weight};font-style:normal;font-display:block;}`;
    })
    .join('\n');
}

/** Look up a named type style (e.g. "display-xl") with the numbers parsed. */
export function typeStyle(tokens, name) {
  for (const g of tokens.type.groups) {
    const s = g.styles.find((x) => x.name === name);
    if (s) {
      return {
        name,
        family: g.family, // "display" | "sans" | "mono"
        fontSize: px(s.fontSize),
        lineHeight: typeof s.lineHeight === 'string' ? px(s.lineHeight) / px(s.fontSize) : s.lineHeight,
        fontWeight: s.fontWeight,
        letterSpacing: s.letterSpacing ?? 'normal',
        opticalSize: s.opticalSize ?? null,
      };
    }
  }
  throw new Error(`tokens.json has no type style called "${name}".`);
}

export function spacing(tokens, name) {
  const s = tokens.spacing.tokens.find((x) => x.name === name);
  if (!s) throw new Error(`tokens.json has no spacing token called "${name}".`);
  return px(s.value);
}
