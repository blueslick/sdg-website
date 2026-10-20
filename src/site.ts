// The site name lives here and only here, so a rename is a single change.
export const SITE_NAME = 'Pharos';

// Placeholders until the owner supplies them (see PLACEHOLDERS.md).
export const CONTACT_EMAIL = 'hello@[domain]';
export const INSTAGRAM_HANDLE = '@[handle]';

export const NAV = [
  { href: '/about/', label: 'About' },
  { href: '/competition/', label: 'Competition' },
  { href: '/blog/', label: 'Blog' },
] as const;
