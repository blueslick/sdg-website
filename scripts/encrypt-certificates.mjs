// Turns a plain list of certificates into the encrypted records the site reads.
//   node scripts/encrypt-certificates.mjs <plain.json> <output.json>
// <plain.json> is an array of { "code", "name", "award", "edition", "issued" }.
// Keep it OUT of the repo: only the encrypted output belongs in src/data/.
// This is also the reference for the judging tool (scheme: src/lib/certificateScheme.ts).
import { readFileSync, writeFileSync } from 'node:fs';
import { encryptCertificate } from '../src/lib/certificateScheme.ts';

const [input, output] = process.argv.slice(2);
if (!input || !output) {
  console.error('Usage: node scripts/encrypt-certificates.mjs <plain.json> <output.json>');
  process.exit(1);
}

const plain = JSON.parse(readFileSync(input, 'utf8'));
const records = [];
for (const [i, entry] of plain.entries()) {
  for (const field of ['code', 'name', 'award', 'edition', 'issued']) {
    if (typeof entry[field] !== 'string' || entry[field].trim() === '') {
      throw new Error(`${input}, entry ${i + 1} needs a "${field}" with some text in it.`);
    }
  }
  records.push(await encryptCertificate(entry.code, entry));
}
const ids = new Set(records.map((r) => r.id));
if (ids.size !== records.length) throw new Error('Two certificates have the same code once spaces, dashes and capitals are ignored.');

writeFileSync(output, JSON.stringify(records, null, 2) + '\n');
console.log(`Wrote ${records.length} encrypted record(s) to ${output}`);
