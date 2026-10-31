// Opens every record in an encrypted certificates.json with the SITE'S OWN decryptCertificate
// (src/lib/certificateScheme.ts), using the codes from the private code list.
//   node tests/decrypt_check.mjs <certificates.json> <certificate-codes.json>
// Prints JSON: { "<code>": { name, award, edition, issued } | null } for every code, and
// { "_ids": true/false } saying whether each record id matches codeId(code).
import { readFileSync } from 'node:fs';
import { codeId, decryptCertificate } from '../../../src/lib/certificateScheme.ts';

const [recordsPath, codesPath] = process.argv.slice(2);
const records = JSON.parse(readFileSync(recordsPath, 'utf8'));
const ledger = Object.values(JSON.parse(readFileSync(codesPath, 'utf8')));
const out = {};
let idsOk = true;
for (const { code } of ledger) {
  const id = await codeId(code);
  const record = records.find((r) => r.id === id);
  if (!record) { idsOk = false; out[code] = null; continue; }
  out[code] = await decryptCertificate(record, code);
}
out._ids = idsOk && records.length === ledger.length;
console.log(JSON.stringify(out));
