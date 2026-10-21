// The certificate scheme, in one place. The page (in the browser), the build
// check and the tests all use this file, and the judging tool must produce
// records that match it exactly. Documented in src/data/README.md.
//
// A certificate record in src/data/certificates.json is
//   { "id": "<64 hex>", "iv": "<base64, 12 bytes>", "data": "<base64>" }
// where, for a certificate code C:
//   n    = normalizeCode(C)             upper case, no spaces, no dashes
//   id   = hex(SHA-256(utf8(n)))        how the page finds the record
//   key  = PBKDF2-HMAC-SHA-256(password = utf8(n), salt = utf8(KDF_SALT),
//          iterations = KDF_ITERATIONS) -> 256 bits
//   data = base64(AES-256-GCM(key, iv, utf8(JSON), no extra data))
//          i.e. the ciphertext followed by the 16-byte tag, as Web Crypto gives it
// and JSON is {"name","award","edition","issued"}, all strings.
//
// No imports and only Web Crypto, so it runs unchanged in browsers and Node 20+.

export const KDF_SALT = 'pharos-certificate-v1';
export const KDF_ITERATIONS = 100_000;
export const IV_BYTES = 12;

export interface CertificateDetails {
  name: string;
  award: string;
  edition: string;
  issued: string;
}

export interface CertificateRecord {
  id: string;
  iv: string;
  data: string;
}

// Hyphen-minus plus the lookalikes that turn up when a code is copied from a
// PDF or a phone: hyphen, non-breaking hyphen, figure dash, en dash, em dash,
// minus sign.
const DASHES = /[-‐‑‒–—−]/g;
const SPACES = /\s/g; // \s also covers non-breaking spaces

export function normalizeCode(input: string): string {
  return input.replace(SPACES, '').replace(DASHES, '').toUpperCase();
}

const utf8 = new TextEncoder();

const toBase64 = (bytes: Uint8Array) => btoa(Array.from(bytes, (b) => String.fromCharCode(b)).join(''));
const fromBase64 = (text: string) => Uint8Array.from(atob(text), (c) => c.charCodeAt(0));
const toHex = (bytes: Uint8Array) => Array.from(bytes, (b) => b.toString(16).padStart(2, '0')).join('');

export async function codeId(code: string): Promise<string> {
  const digest = await crypto.subtle.digest('SHA-256', utf8.encode(normalizeCode(code)));
  return toHex(new Uint8Array(digest));
}

async function deriveKey(code: string): Promise<CryptoKey> {
  const base = await crypto.subtle.importKey('raw', utf8.encode(normalizeCode(code)), 'PBKDF2', false, ['deriveKey']);
  return crypto.subtle.deriveKey(
    { name: 'PBKDF2', hash: 'SHA-256', salt: utf8.encode(KDF_SALT), iterations: KDF_ITERATIONS },
    base,
    { name: 'AES-GCM', length: 256 },
    false,
    ['encrypt', 'decrypt'],
  );
}

/** What the judging tool does for each certificate. `iv` is only for the test vector. */
export async function encryptCertificate(code: string, details: CertificateDetails, iv?: Uint8Array): Promise<CertificateRecord> {
  const nonce = iv ?? crypto.getRandomValues(new Uint8Array(IV_BYTES));
  const { name, award, edition, issued } = details;
  const plain = utf8.encode(JSON.stringify({ name, award, edition, issued }));
  const sealed = await crypto.subtle.encrypt({ name: 'AES-GCM', iv: nonce }, await deriveKey(code), plain);
  return { id: await codeId(code), iv: toBase64(nonce), data: toBase64(new Uint8Array(sealed)) };
}

/** Returns the details, or null if the code is wrong or the record is damaged. */
export async function decryptCertificate(record: Pick<CertificateRecord, 'iv' | 'data'>, code: string): Promise<CertificateDetails | null> {
  try {
    const plain = await crypto.subtle.decrypt({ name: 'AES-GCM', iv: fromBase64(record.iv) }, await deriveKey(code), fromBase64(record.data));
    const parsed = JSON.parse(new TextDecoder().decode(plain));
    const { name, award, edition, issued } = parsed;
    if ([name, award, edition, issued].some((v) => typeof v !== 'string')) return null;
    return { name, award, edition, issued };
  } catch {
    return null;
  }
}

/** An ISO date (2026-12-01) becomes "1 December 2026"; anything else is shown as it is. */
export function formatIssued(issued: string): string {
  if (!/^\d{4}-\d{2}-\d{2}$/.test(issued)) return issued;
  const date = new Date(`${issued}T00:00:00Z`);
  if (Number.isNaN(date.getTime()) || date.toISOString().slice(0, 10) !== issued) return issued;
  return new Intl.DateTimeFormat('en-GB', { dateStyle: 'long', timeZone: 'UTC' }).format(date);
}
