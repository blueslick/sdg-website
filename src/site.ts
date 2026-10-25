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
export const PAYMENT_URL = '[payment link]'; // plain link; payments go straight to the soup kitchen's own account
export const RULES_URL = '[full rules link]'; // the full rules, when they are published
export const ENTRY_FEE = 'USD 10'; // from the registration design; fee support halves it (step 3)
export const ENTRY_FEE_HALF = 'USD 5'; // the fee after 50% fee support
export const FEE_SUPPORT = '[fee support details]'; // how to ask for fee support (for example, "email the contact address")

// The partner soup kitchen, named with its written permission (24 Oct 2026).
// This is the only place the name is written. Pages must use this constant,
// never hard-code or re-spell it.
export const SOUP_KITCHEN_NAME = 'The Assembly Soup Kitchen (T.A.S.K)';
// Their public pages, shown next to their logo on Competition and About (opened in a new tab).
export const SOUP_KITCHEN_FACEBOOK_URL = 'https://www.facebook.com/theassemblysoupkitchen/';
export const SOUP_KITCHEN_INSTAGRAM_URL = 'https://www.instagram.com/assemblysoupkitchen/';

// Every date on the site, as YYYY-MM-DD. Pages show them through formatDate().
export const DATES = {
  entriesOpen: '2026-12-01',
  deadline: '2027-01-31',
  results: '2027-02-28', // winners are announced by this date
  privacyUpdated: '2026-10-22', // "Last updated" on the Privacy page: change it whenever the notice changes
} as const;

// '2026-12-01' -> '1 December 2026'
export const formatDate = (iso: string) =>
  new Date(`${iso}T00:00:00Z`).toLocaleDateString('en-GB', { day: 'numeric', month: 'long', year: 'numeric', timeZone: 'UTC' });

// The waitlist form (Tally). Swap forms by changing this one line: the share link
// and the embed address below are built from it.
export const WAITLIST_FORM_ID = 'kbdkBR';
export const WAITLIST_FORM_URL = `https://tally.so/r/${WAITLIST_FORM_ID}`;
export const WAITLIST_FORM_EMBED_URL = `https://tally.so/embed/${WAITLIST_FORM_ID}?alignLeft=1&hideTitle=1&transparentBackground=1&dynamicHeight=1`;

export const isPlaceholder = (value: string) => value.startsWith('[');

export const NAV = [
  { href: '/about/', label: 'About' },
  { href: '/competition/', label: 'Competition' },
  { href: '/blog/', label: 'Blog' },
] as const;
