// Loads the certificate records at build time and checks their shape. The
// judging tool writes src/data/certificates.json as encrypted records (see
// certificateScheme.ts and src/data/README.md); this build cannot read them,
// and neither can anyone reading the page source. The matching and decrypting
// happen in the visitor's browser (see pages/verify.astro).
import { existsSync, readFileSync } from 'node:fs';
import { resolve } from 'node:path';
import realCertificates from '../data/certificates.json';
import { IV_BYTES, type CertificateRecord } from './certificateScheme';

// A git-ignored file with fake (encrypted) entries, used by `npm run dev` only
// (never by `npm run build`). The tests point CERTIFICATES_FILE at their own.
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

const base64Bytes = (text: unknown) =>
  typeof text === 'string' && text.length % 4 === 0 && /^[A-Za-z0-9+/]+={0,2}$/.test(text)
    ? Buffer.from(text, 'base64').length
    : -1;

export function loadCertificates(): CertificateRecord[] {
  const { data, label } = pickSource();
  if (!Array.isArray(data)) throw new Error(`${label} must be an array of certificate records.`);

  const seen = new Set<string>();
  return data.map((raw, i) => {
    const where = `${label}, entry ${i + 1}`;
    if (typeof raw !== 'object' || raw === null || Array.isArray(raw)) throw new Error(`${where} must be an object.`);

    // Plain details would end up readable in the page source, so stop the build.
    const extra = Object.keys(raw).filter((k) => !['id', 'iv', 'data'].includes(k));
    if (extra.length > 0) {
      throw new Error(
        `${where} has unexpected fields (${extra.join(', ')}). Records must be exactly { "id", "iv", "data" }, ` +
          `encrypted by the judging tool. Names and codes must never be put in this file as plain text.`,
      );
    }
    const { id, iv, data: sealed } = raw as Record<string, unknown>;
    if (typeof id !== 'string' || !/^[0-9a-f]{64}$/.test(id)) throw new Error(`${where}: "id" must be 64 lower-case hex characters (the SHA-256 of the code).`);
    if (base64Bytes(iv) !== IV_BYTES) throw new Error(`${where}: "iv" must be base64 for exactly ${IV_BYTES} bytes.`);
    if (base64Bytes(sealed) < 17) throw new Error(`${where}: "data" must be base64 for the encrypted details (at least 17 bytes).`);
    if (seen.has(id)) throw new Error(`${where}: "id" appears twice, so two certificates have the same code.`);
    seen.add(id);
    return { id, iv: iv as string, data: sealed as string };
  });
}
