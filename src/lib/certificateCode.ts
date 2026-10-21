// How a certificate code is compared. The build and the browser both use this,
// so a code typed in any case, with spaces, or with any kind of dash matches.

// Hyphen-minus plus the lookalikes that turn up when a code is copied from a
// PDF or a phone: hyphen, non-breaking hyphen, figure dash, en dash, em dash,
// minus sign.
const DASHES = /[-‐‑‒–—−]/g;
const SPACES = /\s/g; // \s also covers non-breaking spaces

export function normalizeCode(input: string): string {
  return input.replace(SPACES, '').replace(DASHES, '').toUpperCase();
}
