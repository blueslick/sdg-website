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

// Preview channels only. The "entries-open" jobs build with
// PUBLIC_PREVIEW_REGISTRATION_OPEN=true, so the owner can see the open state (with
// the bank details) before launch: the per-PR open-state-pr-N channel
// (.github/workflows/firebase-hosting-pull-request.yml) and the fixed entries-open channel
// refreshed on every merge to main (.github/workflows/firebase-hosting-merge.yml).
// Those builds are also noindex on every page (see Base.astro). The live job never sets
// it, so the live site only changes when REGISTRATION_SWITCH above is flipped.
export const PREVIEW_REGISTRATION_OPEN = import.meta.env.PUBLIC_PREVIEW_REGISTRATION_OPEN === 'true';

// What the pages read. True on launch day, or in the entries-open PR preview.
export const REGISTRATION_OPEN = REGISTRATION_SWITCH || PREVIEW_REGISTRATION_OPEN;

// Registration. Values that are still bracketed placeholders show as marked
// placeholder cards on the Register page instead of broken links. No payment or
// form code lives on this site: the form is a plain link to somewhere else, and
// payment is a bank transfer made outside the site.
export const REGISTRATION_URL = 'https://tally.so/r/Ar7QeB'; // the entry form: the one place the form link is set
// The Rules and FAQ pages (src/pages/rules.astro, faq.astro). Both show whether or not REGISTRATION_OPEN is true.
// They are linked from the footer, Home, Competition and Register. The Register page reads RULES_URL
// for its "Read the full rules" link; if this is ever set back to a bracketed placeholder, it shows a marked placeholder again.
export const RULES_URL = '/rules/';
export const FAQ_URL = '/faq/';
// How to ask for fee support. Built from CONTACT_EMAIL; the Register page turns the address into a mailto link.
export const FEE_SUPPORT = `Email ${CONTACT_EMAIL} with your full name and school. You don't need to explain why.`;

// Entry fee. One wording, used everywhere a fee is mentioned.
export const ENTRY_FEE_USD = 'USD 10';
export const ENTRY_FEE_HALF_USD = 'USD 5';
export const ENTRY_FEE_RM = 'RM 40';
export const ENTRY_FEE_HALF_RM = 'RM 20';
export const ENTRY_FEE = `${ENTRY_FEE_RM} (about ${ENTRY_FEE_USD})`; // ringgit leads: entrants pay in RM by bank transfer; the USD figure is only a guide
export const ENTRY_FEE_HALF = `${ENTRY_FEE_HALF_RM} (about ${ENTRY_FEE_HALF_USD})`; // the fee at 50% fee support
export const MEALS_ESTIMATE = 'about 3 meals'; // figure from T.A.S.K; the FAQ's "Where does my fee go?" reads this too
export const MEALS_PER_ENTRY = `Every ${ENTRY_FEE_USD} entry funds ${MEALS_ESTIMATE} at T.A.S.K.`;

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

// The Inaugural Edition's three essay prompts, in order. The owner approved this wording
// for publishing: copy it exactly, never edit, shorten or "improve" it. Pages read it
// from here. Prompt 1 is a quotation (`quote`, shown with its `attribution`) followed by
// its question (`text`); the others are just `text`.
export const PROMPTS_INTRO = 'Write one essay, up to 800 words, on one of these three prompts.';
export const PROMPTS: ReadonlyArray<{ n: number; quote?: string; attribution?: string; text: string }> = [
  {
    n: 1,
    quote: 'Starvation is the characteristic of some people not having enough food to eat.',
    attribution: 'Amartya Sen',
    text: 'The world produces enough food for everyone. Why do people still go hungry?',
  },
  {
    n: 2,
    text: 'Describe a meal you will never forget, and what it taught you about who gets to eat.',
  },
  {
    n: 3,
    text: 'The Universal Declaration of Human Rights says everyone has a right to food. If that\'s true, who is responsible when someone goes hungry, and what should they be made to do about it?',
  },
];

// The judging rubric, marked out of 100. Each criterion has its marks and three descriptors.
// Same rule as the prompts: this wording is approved, so copy it exactly. The marks must add
// up to RUBRIC_TOTAL (a test checks this). The Competition page prints only the names and marks
// in one sentence (the full descriptors are in the PDF, JUDGING_PDF_URL); RUBRIC_INTRO is not shown now.
export const RUBRIC_TOTAL = 100;
export const RUBRIC_INTRO =
  'Each essay is marked out of 100 against the four criteria below. Clarity of expression is valued over complexity of vocabulary: judges reward the quality of thinking, not the length of words.';
export const RUBRIC_CLOSING = 'All essays are assessed by human judges. AI is not used in scoring.';
export const RUBRIC: ReadonlyArray<{ name: string; marks: number; descriptors: readonly string[] }> = [
  {
    name: 'Response to the prompt',
    marks: 30,
    descriptors: [
      'Addresses the prompt directly and engages with its full implications.',
      'Sustains a clear and coherent line of argument throughout.',
      'Draws conclusions that follow logically from the evidence presented.',
    ],
  },
  {
    name: 'Insight and understanding',
    marks: 30,
    descriptors: [
      'Uses evidence that is relevant, accurate and appropriately credited.',
      'Demonstrates a secure understanding of the causes of hunger.',
      'Develops ideas beyond the obvious, showing independent thought.',
    ],
  },
  {
    name: 'Clarity and structure',
    marks: 20,
    descriptors: [
      'Expresses ideas clearly, so that meaning is readily understood.',
      'Purposefully structured: clear opening, development and conclusion.',
      'Spelling, punctuation and grammar accurate; errors do not impede meaning.',
    ],
  },
  {
    name: 'Voice and originality',
    marks: 20,
    descriptors: [
      'Offers a distinctive and well-considered perspective on the prompt.',
      'Writes in a confident, individual voice suited to audience and purpose.',
      'Leaves a lasting impression on the reader.',
    ],
  },
];
// The judging criteria as a PDF, in public/. The Competition page's "How essays are judged"
// section links it (instead of printing the descriptors) and a test checks the file exists.
// If you replace the PDF, update the page count to match.
export const JUDGING_PDF_URL = '/pharos-judging-criteria.pdf';
export const JUDGING_PDF_PAGES = 1;

// Every date on the site, as YYYY-MM-DD. Pages show them through formatDate().
export const DATES = {
  entriesOpen: '2026-11-16',
  deadline: '2027-01-17', // 23:59 Malaysia time (DEADLINE_TIME); also the date entrants' ages are counted on
  results: '2027-02-03', // winners are announced on this date
  entryDataDeleted: '2027-08-03', // by this date entry data we no longer need is deleted (see the Privacy page)
  privacyUpdated: '2026-10-28', // "Last updated" on the Privacy page (and its Malay version): change it whenever either notice changes
} as const;

// '2026-12-01' -> '1 December 2026'
export const formatDate = (iso: string) =>
  new Date(`${iso}T00:00:00Z`).toLocaleDateString('en-GB', { day: 'numeric', month: 'long', year: 'numeric', timeZone: 'UTC' });

// '2026-12-01' -> '1 Disember 2026' (Malay month names; written out so it doesn't depend on the server's locale data)
const MALAY_MONTHS = ['Januari', 'Februari', 'Mac', 'April', 'Mei', 'Jun', 'Julai', 'Ogos', 'September', 'Oktober', 'November', 'Disember'];
export const formatDateMs = (iso: string) => {
  const [year, month, day] = iso.split('-').map(Number);
  return `${day} ${MALAY_MONTHS[month - 1]} ${year}`;
};

// '2026-12-01' -> 'Tuesday 1 December 2026'
export const formatDateDay = (iso: string) =>
  `${new Date(`${iso}T00:00:00Z`).toLocaleDateString('en-GB', { weekday: 'long', timeZone: 'UTC' })} ${formatDate(iso)}`;

// '2027-01-17', -5 -> '2027-01-12'
export const addDays = (iso: string, days: number) =>
  new Date(Date.parse(`${iso}T00:00:00Z`) + days * 86_400_000).toISOString().slice(0, 10);

// Fee support requests close this many days before the deadline (Register and the FAQ both say so),
// and a payment we can't find must be sorted out this many days after it (the FAQ).
export const FEE_SUPPORT_DAYS_BEFORE_DEADLINE = 5;
export const PAYMENT_GRACE_DAYS_AFTER_DEADLINE = 7;

// The deadline is the end of the day in Malaysia.
export const DEADLINE_TIME_PLAIN = '23:59 Malaysia time'; // the Rules page wording
export const DEADLINE_TIME = `${DEADLINE_TIME_PLAIN} (MYT)`;
export const DEADLINE_TIME_SHORT = '23:59 MYT';
export const deadlineWithTime = () => `${formatDate(DATES.deadline)}, ${DEADLINE_TIME}`;

// The waitlist form (Tally). Swap forms by changing this one line: the share link
// and the embed address below are built from it.
export const WAITLIST_FORM_ID = 'kbdkBR';
export const WAITLIST_FORM_URL = `https://tally.so/r/${WAITLIST_FORM_ID}`;
export const WAITLIST_FORM_EMBED_URL = `https://tally.so/embed/${WAITLIST_FORM_ID}?alignLeft=1&hideTitle=1&transparentBackground=1&dynamicHeight=1`;

// The Privacy notice in English and Malay: each links to the other and lists both as hreflang alternates.
export const PRIVACY_PATH = '/privacy/';
export const PRIVACY_PATH_MS = '/ms/privacy/';
export const TALLY_PRIVACY_URL = 'https://tally.so/help/privacy-policy';

export const isPlaceholder = (value: string) => value.startsWith('[');

export const NAV = [
  { href: '/about/', label: 'About' },
  { href: '/competition/', label: 'Competition' },
  { href: '/blog/', label: 'Blog' },
] as const;
