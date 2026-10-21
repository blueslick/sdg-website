// Pins the certificate scheme (src/lib/certificateScheme.ts, documented in
// src/data/README.md). The judging tool must produce exactly this, so if one of
// these fails, the scheme changed and every real certificate file would break.
import { test, expect } from '@playwright/test';
import { readdirSync, readFileSync, statSync } from 'node:fs';
import { join } from 'node:path';
import { codeId, decryptCertificate, encryptCertificate, normalizeCode, formatIssued } from '../src/lib/certificateScheme';
import { fakeCertificates } from './fixtures.mjs';

const details = { name: 'Test Student One', award: 'Test Award: First Place', edition: 'Test Edition', issued: '2026-12-01' };

// The same vector is in src/data/README.md. It was also reproduced independently
// (Python: hashlib.pbkdf2_hmac + cryptography's AESGCM) to check the written scheme.
const VECTOR = {
  code: 'test-ab12-cd34',
  iv: Uint8Array.from({ length: 12 }, (_, i) => i),
  record: {
    id: 'ffb20b3b20c86ffe42924da1fd54b68439a9f921a992b2f0c9725fced2fe5fd4',
    iv: 'AAECAwQFBgcICQoL',
    data: 'Gz6lwgQtJLWEiq9a/X+x/veBn8112YiLKO5+/sUMDR5+PPL5gOVqniDtCYv/OOEKMSnrl2ZymOvbhjKTZxljF0J/QcoPcFoLQ+vcYcXELK2FzfWqmm6AiVogFF7yz2TTmN5k4ShxPeW70eD6FWTDlJDhqnNg3Nhf6JCkaw==',
  },
};

test.describe('certificate scheme', () => {
  test('matches the published test vector', async () => {
    expect(await encryptCertificate(VECTOR.code, details, VECTOR.iv)).toEqual(VECTOR.record);
  });

  test('the test vector decrypts with the code in any spelling', async () => {
    for (const typed of ['TEST-AB12-CD34', 'test ab12 cd34', ' TestAB12–CD34 ', 'TESTAB12CD34']) {
      expect(await codeId(typed)).toBe(VECTOR.record.id);
      expect(await decryptCertificate(VECTOR.record, typed)).toEqual(details);
    }
  });

  test('a wrong code, or damaged data, gives nothing', async () => {
    expect(await decryptCertificate(VECTOR.record, 'TEST-AB12-CD35')).toBeNull();
    const bytes = Buffer.from(VECTOR.record.data, 'base64');
    bytes[3] ^= 1;
    expect(await decryptCertificate({ ...VECTOR.record, data: bytes.toString('base64') }, VECTOR.code)).toBeNull();
    expect(await decryptCertificate({ ...VECTOR.record, data: 'not base64!' }, VECTOR.code)).toBeNull();
  });

  test('every encryption uses a fresh iv', async () => {
    const a = await encryptCertificate(VECTOR.code, details);
    const b = await encryptCertificate(VECTOR.code, details);
    expect(a.iv).not.toBe(b.iv);
    expect(a.data).not.toBe(b.data);
    expect(a.id).toBe(b.id);
  });

  test('codes are normalised: upper case, no spaces, no dashes of any kind', () => {
    expect(normalizeCode(' ab-12‐c‑d‒e–f—g−h 3 ')).toBe('AB12CDEFGH3');
  });

  test('issue dates are written out in full', () => {
    expect(formatIssued('2026-12-01')).toBe('1 December 2026');
    expect(formatIssued('2026-02-30')).toBe('2026-02-30');
    expect(formatIssued('Winter 2026')).toBe('Winter 2026');
  });
});

test('nothing readable is in the built site: no names, awards or codes', async () => {
  const secrets = fakeCertificates.flatMap((c) => [c.name, c.award, c.code, c.code.replace(/[-\s]/g, '')]).concat(['Test Student', 'Test Award']);
  const files: string[] = [];
  const walk = (dir: string) => {
    for (const entry of readdirSync(dir)) {
      const path = join(dir, entry);
      statSync(path).isDirectory() ? walk(path) : files.push(path);
    }
  };
  walk('dist-test');
  const text = files.filter((f) => /\.(html|js|json|css|txt|xml|svg)$/.test(f));
  expect(text.length).toBeGreaterThan(5);
  for (const file of text) {
    const content = readFileSync(file, 'utf8');
    for (const secret of secrets) expect(content, `${secret} found in ${file}`).not.toContain(secret);
  }
  // And the page does carry the encrypted records.
  expect(readFileSync('dist-test/verify/index.html', 'utf8')).toContain(
    (await encryptCertificate(fakeCertificates[0].code, fakeCertificates[0])).id,
  );
});
