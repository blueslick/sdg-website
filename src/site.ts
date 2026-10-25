// The site name lives here and only here, so a rename is a single change.
export const SITE_NAME = 'Pharos';

export const CONTACT_EMAIL = 'pharosprize@gmail.com';
export const INSTAGRAM_HANDLE = '@pharosprize';
export const INSTAGRAM_URL = 'https://www.instagram.com/pharosprize/';

// LAUNCH-DAY SWITCH. false: the Register buttons on Home, Competition and the
// How to enter page show a disabled "Opening soon" button, and the entry form
// link (REGISTRATION_URL below) and the bank details appear nowhere on the site.
// true: the buttons work, the form link is live and /register/ shows how to pay.
// Flip REGISTRATION_SWITCH to true when entries open (see PLACEHOLDERS.md). It stays a
// plain true/false so launch day is one change.
const REGISTRATION_SWITCH = false;

// Pull-request previews only. The "entries-open" preview job in
// .github/workflows/firebase-hosting-pull-request.yml builds with
// PUBLIC_PREVIEW_REGISTRATION_OPEN=true, so the owner can see the open state (with
// the bank details) before launch. That build is also noindex on every page (see
// Base.astro). The merge workflow never sets it, so the live site only changes when
// REGISTRATION_SWITCH above is flipped.
export const PREVIEW_REGISTRATION_OPEN = import.meta.env.PUBLIC_PREVIEW_REGISTRATION_OPEN === 'true';

// What the pages read. True on launch day, or in the entries-open PR preview.
export const REGISTRATION_OPEN = REGISTRATION_SWITCH || PREVIEW_REGISTRATION_OPEN;

// Registration. Values that are still bracketed placeholders show as marked
// placeholder cards on the Register page instead of broken links. No payment or
// form code lives on this site: the form is a plain link to somewhere else, and
// payment is a bank transfer made outside the site.
export const REGISTRATION_URL = 'https://tally.so/r/Ar7QeB'; // the entry form: the one place the form link is set
export const RULES_URL = '[full rules link]'; // the full rules, when they are published
export const FEE_SUPPORT = '[fee support details]'; // how to ask for fee support (for example, "email the contact address")

// Entry fee. One wording, used everywhere a fee is mentioned.
export const ENTRY_FEE_USD = 'USD 10';
export const ENTRY_FEE_HALF_USD = 'USD 5';
export const ENTRY_FEE_RM = 'RM 45';
export const ENTRY_FEE_HALF_RM = 'RM 22.50';
export const ENTRY_FEE = `${ENTRY_FEE_USD} (pay ${ENTRY_FEE_RM} by bank transfer)`;
export const ENTRY_FEE_HALF = `${ENTRY_FEE_HALF_USD} (pay ${ENTRY_FEE_HALF_RM})`; // the fee at 50% fee support
export const MEALS_PER_ENTRY = 'Every USD 10 entry funds about 3 meals at T.A.S.K.'; // figure from T.A.S.K

// Bank transfer details, shown on /register/ once REGISTRATION_OPEN is true.
// Payments go straight to the soup kitchen's account; this site never handles money.
export const BANK = {
  accountName: 'Assembly Ground Sdn Bhd',
  accountNote: 'the company behind T.A.S.K',
  bank: 'RHB Bank',
  accountNumber: '262111-00010155',
  reference: 'PHAROS + your full name',
} as const;

// The two prize categories. Age is the entrant's age on DATES.deadline.
// Both are for students only. Prizes are funded separately, not from entry fees.
export const CATEGORIES = [
  { id: 'junior', name: 'Junior', who: '14 and under', prize: 'USD 50' },
  { id: 'open', name: 'Open', who: 'Students of any age', prize: 'USD 100' },
] as const;
export const PRIZES_NOTE = 'Prizes are funded separately, not from entry fees.';

// The partner soup kitchen, named with its written permission (24 Oct 2026).
// This is the only place the name is written. Pages must use this constant,
// never hard-code or re-spell it.
export const SOUP_KITCHEN_NAME = 'The Assembly Soup Kitchen (T.A.S.K)';
// Their public pages, shown next to their logo on Competition and About (opened in a new tab).
export const SOUP_KITCHEN_FACEBOOK_URL = 'https://www.facebook.com/theassemblysoupkitchen/';
export const SOUP_KITCHEN_INSTAGRAM_URL = 'https://www.instagram.com/assemblysoupkitchen/';

// Every date on the site, as YYYY-MM-DD. Pages show them through formatDate().
export const DATES = {
  entriesOpen: '2026-11-16',
  deadline: '2027-01-17', // 23:59 Malaysia time (DEADLINE_TIME); also the date entrants' ages are counted on
  results: '2027-02-03', // winners are announced on this date
  entryDataDeleted: '2027-08-03', // by this date entry data we no longer need is deleted (see the Privacy page)
  privacyUpdated: '2026-10-25', // "Last updated" on the Privacy page: change it whenever the notice changes
} as const;

// '2026-12-01' -> '1 December 2026'
export const formatDate = (iso: string) =>
  new Date(`${iso}T00:00:00Z`).toLocaleDateString('en-GB', { day: 'numeric', month: 'long', year: 'numeric', timeZone: 'UTC' });

// The deadline is the end of the day in Malaysia.
export const DEADLINE_TIME = '23:59 Malaysia time (MYT)';
export const DEADLINE_TIME_SHORT = '23:59 MYT';
export const deadlineWithTime = () => `${formatDate(DATES.deadline)}, ${DEADLINE_TIME}`;

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
