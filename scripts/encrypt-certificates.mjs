// Turns a plain list of certificates into the encrypted records the site reads.
//   node scripts/encrypt-certificates.mjs <plain.json> <output.json>
//   node scripts/encrypt-certificates.mjs <plain.json> <output.json> --generate-codes --plain-out <with-codes.json>
// <plain.json> is an array of { "code", "name", "award", "edition", "issued" }.
// With --generate-codes, entries without a "code" get a new random one (XXXX-XXXX),
// and the full list, codes included, is saved to --plain-out: that is the only
// place the codes exist, so print the certificates from it.
// Keep the plain files OUT of the repo: only the encrypted output belongs in src/data/.
// This is also the reference for the judging tool (scheme: src/lib/certificateScheme.ts).
import { readFileSync, writeFileSync } from 'node:fs';
import { encryptCertificate, generateCode, isCodeFormat, normalizeCode } from '../src/lib/certificateScheme.ts';

const args = process.argv.slice(2);
const flag = (name) => args.includes(name);
const value = (name) => (args.includes(name) ? args[args.indexOf(name) + 1] : undefined);
const generate = flag('--generate-codes');
const plainOut = value('--plain-out');
const files = args.filter((a, i) => !a.startsWith('--') && args[i - 1] !== '--plain-out');
const [input, output] = files;

if (!input || !output || (generate && !plainOut)) {
  console.error(
    'Usage: node scripts/encrypt-certificates.mjs <plain.json> <output.json> [--generate-codes --plain-out <with-codes.json>]',
  );
  process.exit(1);
}

const plain = JSON.parse(readFileSync(input, 'utf8'));
const used = new Set();
for (const entry of plain) {
  if (typeof entry.code === 'string' && entry.code.trim() !== '') used.add(normalizeCode(entry.code));
}

const records = [];
const complete = [];
const seen = new Set();
for (const [i, entry] of plain.entries()) {
  const where = `${input}, entry ${i + 1}`;
  let code = entry.code;
  if (code === undefined || code === '') {
    if (!generate) throw new Error(`${where} has no "code". Add one, or run with --generate-codes.`);
    do code = generateCode(); while (used.has(normalizeCode(code)));
    used.add(normalizeCode(code));
  }
  for (const field of ['name', 'award', 'edition', 'issued']) {
    if (typeof entry[field] !== 'string' || entry[field].trim() === '') {
      throw new Error(`${where} needs a "${field}" with some text in it.`);
    }
  }
  if (typeof code !== 'string' || !isCodeFormat(normalizeCode(code))) {
    throw new Error(`${where}: code "${code}" must be 8 letters and numbers from 0-9 and A-Z without I, L, O, U (shown as XXXX-XXXX).`);
  }
  if (seen.has(normalizeCode(code))) throw new Error(`${where}: code "${code}" is used twice.`);
  seen.add(normalizeCode(code));
  complete.push({ ...entry, code });
  records.push(await encryptCertificate(code, entry));
}

writeFileSync(output, JSON.stringify(records, null, 2) + '\n');
console.log(`Wrote ${records.length} encrypted record(s) to ${output}`);
if (generate) {
  writeFileSync(plainOut, JSON.stringify(complete, null, 2) + '\n');
  console.log(`Wrote the full list with codes to ${plainOut}. Keep it private and out of the repo.`);
}
