// The build refuses a certificates file that could leak details or that is
// malformed, with a message the owner can act on.
import { test, expect } from '@playwright/test';
import { spawnSync } from 'node:child_process';
import { mkdirSync, writeFileSync } from 'node:fs';
import { encryptCertificate } from '../src/lib/certificateScheme';

test.describe.configure({ mode: 'serial' });
test.setTimeout(120_000);

const good = await encryptCertificate('K7QM-4TXD', { name: 'N', award: 'A', edition: 'E', issued: '2026-01-01' });

function buildWith(name: string, data: unknown) {
  mkdirSync('test-results', { recursive: true });
  const file = `test-results/${name}.json`;
  writeFileSync(file, JSON.stringify(data));
  return spawnSync('npx', ['astro', 'build'], {
    encoding: 'utf8',
    env: { ...process.env, CERTIFICATES_FILE: file, ASTRO_OUT_DIR: `./test-results/${name}-out` },
  });
}

const cases: [string, unknown, RegExp][] = [
  ['plain-details', [{ code: 'ABC-123', name: 'Plain Name', award: 'A', edition: 'E', issued: '2026-01-01' }], /unexpected fields \(code, name, award, edition, issued\).*never be put in this file as plain text/s],
  ['plain-details-alongside', [{ ...good, name: 'Plain Name' }], /unexpected fields \(name\)/],
  ['not-an-array', { id: 'x' }, /must be an array/],
  ['bad-id', [{ ...good, id: 'ABC' }], /"id" must be 64 lower-case hex/],
  ['bad-iv', [{ ...good, iv: 'AAAA' }], /"iv" must be base64 for exactly 12 bytes/],
  ['bad-data', [{ ...good, data: 'AAAA' }], /"data" must be base64/],
  ['missing-field', [{ id: good.id, iv: good.iv }], /"data" must be base64/],
  ['duplicate', [good, good], /entry 2: "id" appears twice/],
];

for (const [name, data, message] of cases) {
  test(`the build stops: ${name}`, () => {
    const result = buildWith(name, data);
    expect(result.status).not.toBe(0);
    expect(result.stdout + result.stderr).toMatch(message);
  });
}

test('the build accepts good records, and an empty list', () => {
  expect(buildWith('good', [good]).status).toBe(0);
  expect(buildWith('empty', []).status).toBe(0);
});
