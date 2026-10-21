// Pins the certificate scheme (src/lib/certificateScheme.ts, documented in
// src/data/README.md). The judging tool must produce exactly this, so if one of
// these fails, the scheme changed and every real certificate file would break.
import { test, expect } from '@playwright/test';
import { mkdirSync, readdirSync, readFileSync, statSync, writeFileSync } from 'node:fs';
import { spawnSync } from 'node:child_process';
import { join } from 'node:path';
import {
  CODE_ALPHABET, KDF_ITERATIONS, SCHEME_VERSION, codeId, decryptCertificate, encryptCertificate, formatIssued, generateCode, isCodeFormat, normalizeCode,
} from '../src/lib/certificateScheme';
import { createHash } from 'node:crypto';
import { fakeCertificates } from './fixtures.mjs';

const details = { name: 'Test Student One', award: 'Test Award: First Place', edition: 'Test Edition', issued: '2026-12-01' };

// The same vector is in src/data/README.md. It was also reproduced independently
// (Python: hashlib.pbkdf2_hmac + cryptography's AESGCM) to check the written scheme.
const VECTOR = {
  code: 'k7qm-4txd',
  iv: Uint8Array.from({ length: 12 }, (_, i) => i),
  record: {
    id: 'bd10365842b7e9a68c264095a94d962f12423b0ba3305dab620178ece7c94377',
    iv: 'AAECAwQFBgcICQoL',
    data: 'mMJoco65aim+H0NVniCufwmk4uECmuphQ0QqhWj0jHwAsXmwlVQoxyIq9z1Grya23G+kIIp0dSc6fQher4oa4C65JUNw6wxTMD3GuQawi6YnsC6fd+oeeBo6XGcg//IS7Aq6u9zeUwqwNnFtAA/CBQM/+kRZHjF70NCp+A==',
  },
};

test.describe('certificate scheme', () => {
  test('is version 2 with 100,000 PBKDF2 iterations', () => {
    expect(SCHEME_VERSION).toBe(2);
    expect(KDF_ITERATIONS).toBe(100_000);
  });

  test('matches the published test vector', async () => {
    expect(await encryptCertificate(VECTOR.code, details, VECTOR.iv)).toEqual(VECTOR.record);
  });

  test('the id is slow to compute: it is not a plain SHA-256 of the code', async () => {
    expect(VECTOR.record.id).not.toBe(createHash('sha256').update('K7QM4TXD').digest('hex'));
  });

  test('the test vector decrypts with the code in any spelling', async () => {
    for (const typed of ['K7QM-4TXD', 'k7qm 4txd', ' K7qm\u20134Txd ', 'K7QM4TXD']) {
      expect(await codeId(typed)).toBe(VECTOR.record.id);
      expect(await decryptCertificate(VECTOR.record, typed)).toEqual(details);
    }
  });

  test('a wrong code, or damaged data, gives nothing', async () => {
    expect(await decryptCertificate(VECTOR.record, 'K7QM-4TXE')).toBeNull();
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

  test('codes are normalised: upper case, no spaces or dashes of any kind, O as 0, I and L as 1', () => {
    expect(normalizeCode(' ab-12\u2010c\u2011d\u2012e\u2013f\u2014g\u2212h\u00a03 ')).toBe('AB12CDEFGH3');
    expect(normalizeCode('o0-iI-lL')).toBe('001111');
    expect(normalizeCode('k7qm 4txd')).toBe('K7QM4TXD');
  });

  test('the alphabet is Crockford base32: 32 characters, no I, L, O or U', () => {
    expect(CODE_ALPHABET).toHaveLength(32);
    expect(new Set(CODE_ALPHABET).size).toBe(32);
    for (const c of 'ILOU') expect(CODE_ALPHABET).not.toContain(c);
    expect(CODE_ALPHABET).toBe('0123456789ABCDEFGHJKMNPQRSTVWXYZ');
  });

  test('only 8 characters from the alphabet count as a code', () => {
    expect(isCodeFormat('K7QM4TXD')).toBe(true);
    for (const bad of ['', 'K7QM4TX', 'K7QM4TXDD', 'K7QM4TXU', 'K7QM-TXD', 'k7qm4txd']) expect(isCodeFormat(bad)).toBe(false);
  });

  test('generated codes look like XXXX-XXXX, are valid, and vary', () => {
    const codes = new Set(Array.from({ length: 200 }, generateCode));
    expect(codes.size).toBe(200);
    for (const code of codes) {
      expect(code).toMatch(/^[0-9A-HJKMNP-TV-Z]{4}-[0-9A-HJKMNP-TV-Z]{4}$/);
      expect(isCodeFormat(normalizeCode(code))).toBe(true);
      expect(normalizeCode(code)).toBe(code.replace('-', ''));
    }
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

test.describe('scripts/encrypt-certificates.mjs', () => {
  const run = (...args: string[]) => spawnSync('node', ['scripts/encrypt-certificates.mjs', ...args], { encoding: 'utf8' });
  const write = (name: string, data: unknown) => {
    mkdirSync('test-results', { recursive: true });
    writeFileSync(`test-results/${name}`, JSON.stringify(data));
    return `test-results/${name}`;
  };
  const people = [
    { name: 'Gen One', award: 'A', edition: 'E', issued: '2026-01-01' },
    { name: 'Gen Two', award: 'A', edition: 'E', issued: '2026-01-01' },
    { name: 'Kept Code', award: 'A', edition: 'E', issued: '2026-01-01', code: 'k7qm-4txd' },
  ];

  test('--generate-codes gives new codes, keeps given ones, and the output opens with them', async () => {
    const input = write('gen-in.json', people);
    const result = run(input, 'test-results/gen-out.json', '--generate-codes', '--plain-out', 'test-results/gen-plain.json');
    expect(result.status, result.stderr).toBe(0);
    const plain = JSON.parse(readFileSync('test-results/gen-plain.json', 'utf8'));
    const records = JSON.parse(readFileSync('test-results/gen-out.json', 'utf8'));
    expect(plain).toHaveLength(3);
    expect(plain[2].code).toBe('k7qm-4txd');
    for (const entry of plain) expect(isCodeFormat(normalizeCode(entry.code))).toBe(true);
    expect(new Set(plain.map((p: { code: string }) => normalizeCode(p.code))).size).toBe(3);
    for (const [i, entry] of plain.entries()) {
      expect(records[i].id).toBe(await codeId(entry.code));
      expect(await decryptCertificate(records[i], entry.code)).toMatchObject({ name: entry.name });
    }
    expect(Object.keys(records[0]).sort()).toEqual(['data', 'id', 'iv']);
  });

  test('it refuses a missing code without --generate-codes, a bad format, a repeat, or no --plain-out', () => {
    expect(run(write('a.json', people), 'test-results/x.json').stderr).toMatch(/entry 1 has no "code"/);
    const bad = (code: string) => run(write('b.json', [{ ...people[0], code }]), 'test-results/x.json').stderr;
    expect(bad('K7QM-4TX')).toMatch(/must be 8 letters and numbers/);
    expect(bad('K7QM-4TXU')).toMatch(/must be 8 letters and numbers/);
    expect(run(write('c.json', [{ ...people[0], code: 'K7QM-4TXD' }, { ...people[1], code: 'k7qm 4txd' }]), 'test-results/x.json').stderr).toMatch(/used twice/);
    expect(run(write('d.json', people), 'test-results/x.json', '--generate-codes').stderr).toMatch(/Usage/);
  });
});
