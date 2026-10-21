// Writes the fake certificates to a git-ignored file that the test build reads
// (through CERTIFICATES_FILE). Run by playwright.config.ts before the build.
import { mkdirSync, writeFileSync } from 'node:fs';
import { fakeCertificates } from './fixtures.mjs';

mkdirSync('test-results', { recursive: true });
writeFileSync('test-results/certificates.json', JSON.stringify(fakeCertificates, null, 2));
