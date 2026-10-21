// Reference for the website's verify page: how to open one record of certificates.json.
// This is the same code the browser runs (WebCrypto), and the tests run it under Node to prove
// that what the toolkit encrypts is what a browser can decrypt. The format is documented in README.md.
//
//   node verify-reference.mjs certificates.json "ph-zh 7k4q"      prints the record, or "not found"

const SALT = 'pharos-certificate-v1';
const ITERATIONS = 200000;
// Same as src/lib/certificateCode.ts on the site: whitespace and every dash lookalike removed, upper case.
const normalise = (code) => code.replace(/\s/g, '').replace(/[-‐‑‒–—−]/g, '').toUpperCase();

const enc = new TextEncoder();
const toHex = (buf) => [...new Uint8Array(buf)].map((b) => b.toString(16).padStart(2, '0')).join('');
const fromBase64 = (text) => Uint8Array.from(atob(text), (c) => c.charCodeAt(0));

/** records: the parsed certificates.json. Resolves to {name, award, edition, issued}, or null if the code is unknown. */
export async function openCertificate(records, code) {
  const normalised = normalise(code);
  const id = toHex(await crypto.subtle.digest('SHA-256', enc.encode(normalised)));
  const record = records.find((r) => r.id === id);
  if (!record) return null;
  const password = await crypto.subtle.importKey('raw', enc.encode(normalised), 'PBKDF2', false, ['deriveKey']);
  const key = await crypto.subtle.deriveKey(
    { name: 'PBKDF2', hash: 'SHA-256', salt: enc.encode(SALT), iterations: ITERATIONS },
    password,
    { name: 'AES-GCM', length: 256 },
    false,
    ['decrypt'],
  );
  try {
    const plain = await crypto.subtle.decrypt({ name: 'AES-GCM', iv: fromBase64(record.iv) }, key, fromBase64(record.data));
    return JSON.parse(new TextDecoder().decode(plain));
  } catch {
    return null; // right id but the data does not open: treat as not found
  }
}

// Command-line use, for checking a file by hand.
if (process.argv[1] && import.meta.url === new URL(`file://${process.argv[1]}`).href) {
  const { readFileSync } = await import('node:fs');
  const [file, code] = process.argv.slice(2);
  const result = await openCertificate(JSON.parse(readFileSync(file, 'utf8')), code ?? '');
  console.log(result ? JSON.stringify(result) : 'not found');
}
