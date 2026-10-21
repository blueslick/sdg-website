// The certificate scheme (version 2), in one place. The page (in the browser),
// the build check, the encrypt script and the tests all use this file, and the
// judging tool must produce records that match it exactly. Documented in
// src/data/README.md.
//
// A certificate code is 8 characters shown as XXXX-XXXX, from the 32-character
// alphabet CODE_ALPHABET (Crockford base32: 0-9 and A-Z without I, L, O, U).
//
// A record in src/data/certificates.json is
//   { "id": "<64 hex>", "iv": "<base64, 12 bytes>", "data": "<base64>" }
// where, for a certificate code C:
//   n    = normalizeCode(C)       upper case; spaces and dashes removed; O -> 0; I, L -> 1
//   id   = hex(PBKDF2-HMAC-SHA-256(password = utf8(n), salt = utf8(ID_SALT),  KDF_ITERATIONS, 32 bytes))
//          how the page finds the record. It is slow on purpose: the ids are public.
//   key  =     PBKDF2-HMAC-SHA-256(password = utf8(n), salt = utf8(KEY_SALT), KDF_ITERATIONS, 32 bytes)
//   data = base64(AES-256-GCM(key, iv, utf8(JSON), no extra data))
//          i.e. the ciphertext followed by the 16-byte tag, as Web Crypto gives it
// and JSON is {"name","award","edition","issued"}, all strings.
//
// Only Web Crypto, so it runs unchanged in browsers and Node 20+.

export const SCHEME_VERSION = 2;
export const ID_SALT = 'pharos-certificate-id-v2';
export const KEY_SALT = 'pharos-certificate-key-v2';
export const KDF_ITERATIONS = 100_000;
export const IV_BYTES = 12;

export const CODE_ALPHABET = '0123456789ABCDEFGHJKMNPQRSTVWXYZ';
export const CODE_LENGTH = 8;

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

/** Upper case, no spaces or dashes, and the look-alikes read as Crockford does: O as 0, I and L as 1. */
export function normalizeCode(input: string): string {
  return input.replace(SPACES, '').replace(DASHES, '').toUpperCase().replace(/O/g, '0').replace(/[IL]/g, '1');
}

/** True for a normalised code that could have been issued: 8 characters from the alphabet. */
export function isCodeFormat(normalized: string): boolean {
  return normalized.length === CODE_LENGTH && [...normalized].every((c) => CODE_ALPHABET.includes(c));
}

/** A new random code, shown as XXXX-XXXX. 32 divides 256, so every character is equally likely. */
export function generateCode(): string {
  const bytes = crypto.getRandomValues(new Uint8Array(CODE_LENGTH));
  const chars = Array.from(bytes, (b) => CODE_ALPHABET[b & 31]).join('');
  return `${chars.slice(0, 4)}-${chars.slice(4)}`;
}

const utf8 = new TextEncoder();

const toBase64 = (bytes: Uint8Array) => btoa(Array.from(bytes, (b) => String.fromCharCode(b)).join(''));
const fromBase64 = (text: string) => Uint8Array.from(atob(text), (c) => c.charCodeAt(0));
const toHex = (bytes: Uint8Array) => Array.from(bytes, (b) => b.toString(16).padStart(2, '0')).join('');

async function pbkdf2Bits(code: string, salt: string): Promise<ArrayBuffer> {
  const base = await crypto.subtle.importKey('raw', utf8.encode(normalizeCode(code)), 'PBKDF2', false, ['deriveBits']);
  return crypto.subtle.deriveBits({ name: 'PBKDF2', hash: 'SHA-256', salt: utf8.encode(salt), iterations: KDF_ITERATIONS }, base, 256);
}

/** How the page finds the record for a code. */
export async function codeId(code: string): Promise<string> {
  return toHex(new Uint8Array(await pbkdf2Bits(code, ID_SALT)));
}

/** The key that locks the record for a code. */
export async function deriveKey(code: string): Promise<CryptoKey> {
  const bits = await pbkdf2Bits(code, KEY_SALT);
  return crypto.subtle.importKey('raw', bits, 'AES-GCM', false, ['encrypt', 'decrypt']);
}

/** What the judging tool does for each certificate. `iv` is only for the test vector. */
export async function encryptCertificate(code: string, details: CertificateDetails, iv?: Uint8Array): Promise<CertificateRecord> {
  const nonce = iv ?? crypto.getRandomValues(new Uint8Array(IV_BYTES));
  const { name, award, edition, issued } = details;
  const plain = utf8.encode(JSON.stringify({ name, award, edition, issued }));
  const [id, key] = await Promise.all([codeId(code), deriveKey(code)]);
  const sealed = await crypto.subtle.encrypt({ name: 'AES-GCM', iv: nonce }, key, plain);
  return { id, iv: toBase64(nonce), data: toBase64(new Uint8Array(sealed)) };
}

/** Opens a record with its key. Returns the details, or null if the key is wrong or the record is damaged. */
export async function decryptRecord(record: Pick<CertificateRecord, 'iv' | 'data'>, key: CryptoKey): Promise<CertificateDetails | null> {
  try {
    const plain = await crypto.subtle.decrypt({ name: 'AES-GCM', iv: fromBase64(record.iv) }, key, fromBase64(record.data));
    const { name, award, edition, issued } = JSON.parse(new TextDecoder().decode(plain));
    if ([name, award, edition, issued].some((v) => typeof v !== 'string')) return null;
    return { name, award, edition, issued };
  } catch {
    return null;
  }
}

/** Same, starting from the code. */
export async function decryptCertificate(record: Pick<CertificateRecord, 'iv' | 'data'>, code: string): Promise<CertificateDetails | null> {
  return decryptRecord(record, await deriveKey(code));
}

/** An ISO date (2026-12-01) becomes "1 December 2026"; anything else is shown as it is. */
export function formatIssued(issued: string): string {
  if (!/^\d{4}-\d{2}-\d{2}$/.test(issued)) return issued;
  const date = new Date(`${issued}T00:00:00Z`);
  if (Number.isNaN(date.getTime()) || date.toISOString().slice(0, 10) !== issued) return issued;
  return new Intl.DateTimeFormat('en-GB', { dateStyle: 'long', timeZone: 'UTC' }).format(date);
}
