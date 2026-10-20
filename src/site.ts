// The site name lives here and only here, so a rename is a single change.
export const SITE_NAME = 'Pharos';

export const CONTACT_EMAIL = 'pharosprize@gmail.com';
export const INSTAGRAM_HANDLE = '@pharosprize';
export const INSTAGRAM_URL = 'https://www.instagram.com/pharosprize/';

// Registration. Each value is a bracketed placeholder until the owner fills it
// in; the Register page shows a marked placeholder instead of a broken link
// while a value still starts with "[". No payment or form code lives on this site.
export const REGISTRATION_URL = '[registration link]'; // the external form where entrants submit their details and essay
export const PAYMENT_URL = '[payment link]'; // plain link; payments go straight to [Soup Kitchen Name]'s own account
export const ENTRY_FEE = '[fee]';
export const FEE_SUPPORT = '[fee support details]'; // how to get fee support approved

export const isPlaceholder = (value: string) => value.startsWith('[');

export const NAV = [
  { href: '/about/', label: 'About' },
  { href: '/competition/', label: 'Competition' },
  { href: '/blog/', label: 'Blog' },
] as const;
