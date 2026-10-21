// Loads the certificate list at build time and checks it. The judging tool
// writes src/data/certificates.json: an array of
// { "code", "name", "award", "edition", "issued" }.
// The matching itself happens in the visitor's browser (see pages/verify.astro).
import { existsSync, readFileSync } from 'node:fs';
import { resolve } from 'node:path';
import realCertificates from '../data/certificates.json';
import { normalizeCode } from './certificateCode';

export interface CertificateEntry {
  /** The code as printed on the certificate. */
  code: string;
  name: string;
  award: string;
  edition: string;
  /** Ready to show: an ISO date (2026-12-01) becomes "1 December 2026". */
  issued: string;
  /** The code as compared: upper case, no spaces or dashes. */
  key: string;
}

const FIELDS = ['code', 'name', 'award', 'edition', 'issued'] as const;

// A git-ignored file with fake entries, used by `npm run dev` only (never by
// `npm run build`). The tests point CERTIFICATES_FILE at their own fake data.
const EXAMPLE_FILE = 'src/data/certificates.example.json';

function pickSource(): { data: unknown; label: string } {
  const override = process.env.CERTIFICATES_FILE;
  if (override) {
    console.warn(`[certificates] Using ${override} instead of src/data/certificates.json (CERTIFICATES_FILE is set).`);
    return { data: JSON.parse(readFileSync(resolve(override), 'utf8')), label: override };
  }
  const example = resolve(EXAMPLE_FILE);
  if (import.meta.env.DEV && existsSync(example)) {
    console.warn(`[certificates] Dev server: showing the fake entries in ${EXAMPLE_FILE}.`);
    return { data: JSON.parse(readFileSync(example, 'utf8')), label: EXAMPLE_FILE };
  }
  return { data: realCertificates, label: 'src/data/certificates.json' };
}

function formatIssued(issued: string): string {
  if (!/^\d{4}-\d{2}-\d{2}$/.test(issued)) return issued;
  const date = new Date(`${issued}T00:00:00Z`);
  if (Number.isNaN(date.getTime()) || date.toISOString().slice(0, 10) !== issued) return issued;
  return new Intl.DateTimeFormat('en-GB', { dateStyle: 'long', timeZone: 'UTC' }).format(date);
}

export function loadCertificates(): CertificateEntry[] {
  const { data, label } = pickSource();
  if (!Array.isArray(data)) throw new Error(`${label} must be an array of certificates.`);

  const seen = new Map<string, string>();
  return data.map((raw, i) => {
    const where = `${label}, entry ${i + 1}`;
    if (typeof raw !== 'object' || raw === null) throw new Error(`${where} must be an object.`);
    const entry = {} as Record<(typeof FIELDS)[number], string>;
    for (const field of FIELDS) {
      const value = (raw as Record<string, unknown>)[field];
      if (typeof value !== 'string' || value.trim() === '') {
        throw new Error(`${where} needs a "${field}" with some text in it.`);
      }
      entry[field] = value.trim();
    }
    const key = normalizeCode(entry.code);
    if (key === '') throw new Error(`${where} has a code with no letters or numbers in it.`);
    const clash = seen.get(key);
    if (clash) throw new Error(`${where}: code "${entry.code}" is the same as "${clash}" once spaces, dashes and capitals are ignored.`);
    seen.set(key, entry.code);
    return { ...entry, issued: formatIssued(entry.issued), key };
  });
}
