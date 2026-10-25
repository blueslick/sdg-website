// Content red lines from CLAUDE.md, checked against the owner's own words.
// These are warnings, not blocks: a word like "society" can be fine in a sentence,
// so a person decides. Third-party credits (a report's publisher, an artist) are
// not checked, because they name other people's organisations.
// The soup kitchen's name, as approved in writing. Keep in step with SOUP_KITCHEN_NAME in src/site.ts.
const SOUP_KITCHEN_NAME = 'The Assembly Soup Kitchen (T.A.S.K)';

const CHECKS = [
  {
    re: /\b(charit(?:y|ies|able)|non-?profit|not-for-profit|ngos?|foundation|society)\b/i,
    msg: (m) => `Red line: "${m}". Never call us a charity, non-profit, not-for-profit, NGO, foundation or society. Say "run by student volunteers" or "a fundraiser for ${SOUP_KITCHEN_NAME}". (Ignore this if the word is not describing us.)`,
  },
  {
    re: /\b(united nations|global goals|UN)\b/,
    msg: (m) => `Check "${m}": it may only name a source, never be part of our name or branding. Name SDGs in text only.`,
  },
  {
    re: /\b(?:usd|rm|\$)\s?\d[\d,.]*\s*(?:\w+\s+){0,4}(?:target|goal|raised|raise)\b|\b(?:target|goal|raising|aim to raise)\b(?:\s+\w+){0,4}\s+(?:usd|rm|\$)\s?\d/i,
    msg: () => 'Red line: this looks like a public fundraising target. We do not publish one.',
  },
];

/** Returns a list of warning strings for one piece of text. */
export function lintText(text) {
  const out = [];
  // The approved spelling is allowed; take it out before looking for a variant.
  const plain = String(text).split(SOUP_KITCHEN_NAME).join('');
  for (const c of CHECKS) {
    const m = plain.match(c.re);
    if (m) out.push(c.msg(m[0]));
  }
  if (/assembly soup kitchen|\bt\.a\.s\.k/i.test(plain)) {
    out.push(`Spell the soup kitchen exactly as "${SOUP_KITCHEN_NAME}" (same as SOUP_KITCHEN_NAME in src/site.ts).`);
  }
  return out;
}
