// Encrypts the fake certificates into a git-ignored file that the test build
// reads (through CERTIFICATES_FILE). Run by playwright.config.ts before the build.
import { mkdirSync, writeFileSync } from 'node:fs';
import { encryptCertificate } from '../src/lib/certificateScheme.ts';
import { fakeCertificates } from './fixtures.mjs';

mkdirSync('test-results', { recursive: true });
const records = await Promise.all(fakeCertificates.map((c) => encryptCertificate(c.code, c)));
writeFileSync('test-results/certificates.json', JSON.stringify(records, null, 2));
