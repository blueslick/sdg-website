// Reads the website's design tokens (tokens.json), its fonts (the Fontsource packages in
// node_modules) and its site config (src/site.ts) so social posts can never drift from the
// site. Nothing in this tool hard-codes a colour, a font or a type size: it all comes from here.
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

/** Values from src/site.ts (the same file the website reads). */
export function loadSiteConfig() {
  const tokens = loadTokens();
  let src = '';
  try {
    src = fs.readFileSync(path.join(REPO_ROOT, 'src', 'site.ts'), 'utf8');
  } catch { /* fall back below */ }
  const get = (name) => src.match(new RegExp(`${name}\\s*=\\s*['"\`]([^'"\`]+)['"\`]`))?.[1];
  return {
    name: get('SITE_NAME') ?? tokens.name,
    handle: get('INSTAGRAM_HANDLE') ?? '',
  };
}

export function colorValue(tokens, name, theme = 'light') {
  const t = tokens.color.tokens.find((c) => c.name === name);
  if (!t) throw new Error(`tokens.json has no colour called "${name}".`);
  return t.value[theme] ?? t.value.light;
}

/** Colours, fonts, spacing and radii as CSS custom properties, named as the website names them. */
export function cssVariables(tokens) {
  const lines = [];
  for (const c of tokens.color.tokens) lines.push(`--c-${c.name}: ${c.value.light};`);
  for (const [k, v] of Object.entries(tokens.type.families)) lines.push(`--font-${k}: ${v};`);
  for (const s of [...tokens.spacing.tokens, ...tokens.radius.tokens]) lines.push(`--${s.name}: ${s.value};`);
  return `:root{\n  ${lines.join('\n  ')}\n}`;
}

/** Find the Latin .woff2 file for a font listed in tokens.json inside its Fontsource package. */
function fontFile(f) {
  const dir = path.join(REPO_ROOT, 'node_modules', ...f.package.split('/'), 'files');
  if (!fs.existsSync(dir)) {
    throw new Error(
      `The font package ${f.package} is not installed (needed for ${f.family}).\n  Run "npm install" in the repo root (the website folder, not tools/social), then try again.`
    );
  }
  const variable = /\s/.test(f.weight);
  const suffix = variable ? 'latin-wght-normal.woff2' : `latin-${f.weight}-normal.woff2`;
  const match = fs.readdirSync(dir).find((n) => n.endsWith(suffix));
  if (!match) throw new Error(`Could not find the ${suffix} file in ${f.package}.`);
  return path.join(dir, match);
}

/** @font-face rules with the fonts embedded, so drawing needs no network and no installed fonts. */
export function fontFaceCss(tokens) {
  return tokens.type.fonts
    .map((f) => {
      const b64 = fs.readFileSync(fontFile(f)).toString('base64');
      return `@font-face{font-family:"${f.family}";src:url(data:font/woff2;base64,${b64}) format("woff2");font-weight:${f.weight};font-style:normal;font-display:block;}`;
    })
    .join('\n');
}

/** Look up a named type style (e.g. "display-xl"). Sizes are the site's mobile sizes, which is
 *  how a phone shows a post, so they are the natural starting point. */
export function typeStyle(tokens, name) {
  for (const g of tokens.type.groups) {
    const s = g.styles.find((x) => x.name === name);
    if (s) {
      return {
        name,
        family: g.family, // "display" | "sans" | "script"
        fontSize: px(s.fontSize),
        lineHeight: typeof s.lineHeight === 'string' ? px(s.lineHeight) / px(s.fontSize) : s.lineHeight,
        fontWeight: s.fontWeight,
      };
    }
  }
  throw new Error(`tokens.json has no type style called "${name}".`);
}

export function spacing(tokens, name) {
  const s = [...tokens.spacing.tokens, ...tokens.radius.tokens].find((x) => x.name === name);
  if (!s) throw new Error(`tokens.json has no spacing or radius token called "${name}".`);
  return px(s.value);
}

/** The site's risograph grain, read from the page shell so the two stay identical. */
export function grainSvg() {
  try {
    const base = fs.readFileSync(path.join(REPO_ROOT, 'src', 'layouts', 'Base.astro'), 'utf8');
    const m = base.match(/const grainSvg = "(.*)";/);
    if (m) return m[1];
  } catch { /* no grain */ }
  return null;
}
