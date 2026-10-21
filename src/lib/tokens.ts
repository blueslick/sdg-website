// Turns tokens.json into CSS custom properties, so every colour, size, space
// and radius used by the site comes from that one file.
import tokens from '../../tokens.json';

const DESKTOP = tokens.breakpoints.desktop;

// Above the breakpoint, large sizes scale with the window up to the 1440px
// design, so a 1000px-wide laptop doesn't get 104px headlines.
const fluid = (mobile: string, desktop: string) => {
  const m = parseFloat(mobile);
  const d = parseFloat(desktop);
  return d >= 30 ? `clamp(${m}px, ${+(d / 14.4).toFixed(3)}vw, ${d}px)` : desktop;
};

export function tokensCss(): string {
  const base: string[] = [];
  const wide: string[] = [];

  for (const t of tokens.color.tokens) base.push(`--c-${t.name}: ${t.value.light};`);

  for (const [key, value] of Object.entries(tokens.type.families)) base.push(`--font-${key}: ${value};`);

  for (const group of tokens.type.groups) {
    for (const s of group.styles) {
      base.push(`--fs-${s.name}: ${s.fontSize};`, `--lh-${s.name}: ${s.lineHeight};`, `--fw-${s.name}: ${s.fontWeight};`);
      if (s.fontSizeDesktop) wide.push(`--fs-${s.name}: ${fluid(s.fontSize, s.fontSizeDesktop)};`);
    }
  }

  for (const t of [...tokens.spacing.tokens, ...tokens.radius.tokens]) {
    base.push(`--${t.name}: ${t.value};`);
    if ('valueDesktop' in t && t.valueDesktop) wide.push(`--${t.name}: ${t.valueDesktop};`);
  }

  base.push(`--grain-opacity: ${tokens.effects['grain-opacity']};`);

  return `:root{${base.join('')}}@media (min-width: ${DESKTOP}){:root{${wide.join('')}}}`;
}

export const editionColor = tokens.color.tokens.find((t) => t.name === 'edition')!.value.light;
export const mosaic = tokens.mosaic;
