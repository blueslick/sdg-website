// The site name lives here and only here, so a rename is a single change.
export const SITE_NAME = 'Pharos';

export const CONTACT_EMAIL = 'pharosprize@gmail.com';
export const INSTAGRAM_HANDLE = '@pharosprize';
export const INSTAGRAM_URL = 'https://www.instagram.com/pharosprize/';

// LAUNCH-DAY SWITCH. false: the Register buttons on Home, Competition and the
// How to enter page show a disabled "Opening soon" button, and the entry form
// link (REGISTRATION_URL below) appears nowhere on the site. true: the buttons
// work and the form link is live. Flip it when entries open (see PLACEHOLDERS.md).
export const REGISTRATION_OPEN = false;

// Registration. Values that are still bracketed placeholders show as marked
// placeholder cards on the Register page instead of broken links. No payment or
// form code lives on this site: both are plain links to somewhere else.
export const REGISTRATION_URL = 'https://tally.so/r/OQD718'; // the external form where entrants submit their details and essay
export const PAYMENT_URL = '[payment link]'; // plain link; payments go straight to [real name]'s own account
export const RULES_URL = '[full rules link]'; // the full rules, when they are published
export const ENTRY_FEE = 'USD 10'; // from the registration design; fee support halves it (step 3)
export const ENTRY_FEE_HALF = 'USD 5'; // the fee after 50% fee support
export const FEE_SUPPORT = '[fee support details]'; // how to ask for fee support (for example, "email the contact address")

export const isPlaceholder = (value: string) => value.startsWith('[');

export const NAV = [
  { href: '/about/', label: 'About' },
  { href: '/competition/', label: 'Competition' },
  { href: '/blog/', label: 'Blog' },
] as const;
