// Content red lines from CLAUDE.md, checked against the owner's own words.
// These are warnings, not blocks: a word like "society" can be fine in a sentence,
// so a person decides. Third-party credits (a report's publisher, an artist) are
// not checked, because they name other people's organisations.
const CHECKS = [
  {
    re: /\b(charit(?:y|ies|able)|non-?profit|not-for-profit|ngos?|foundation|society)\b/i,
    msg: (m) => `Red line: "${m}". Never call us a charity, non-profit, not-for-profit, NGO, foundation or society. Say "run by student volunteers" or "a fundraiser for [real name]". (Ignore this if the word is not describing us.)`,
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
  // The approved placeholder is allowed; take it out before looking for a real name.
  const plain = String(text).replace(/\[real name\]/gi, '');
  for (const c of CHECKS) {
    const m = plain.match(c.re);
    if (m) out.push(c.msg(m[0]));
  }
  if (/soup kitchen/i.test(plain)) {
    out.push('Do not name the soup kitchen. Use the placeholder [real name], which stands for the name of the soup kitchen (check you have not written the actual name).');
  }
  return out;
}
