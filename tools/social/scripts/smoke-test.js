// Quick end-to-end check: npm test
// Builds the three example posts, checks the image sizes and the caption, and checks that a
// post with a missing source credit is refused.
import fs from 'node:fs';
import os from 'node:os';
import path from 'node:path';
import assert from 'node:assert/strict';
import { spawnSync } from 'node:child_process';
import { TOOL_ROOT } from '../src/tokens.js';

const cli = path.join(TOOL_ROOT, 'src', 'cli.js');
const run = (...args) => spawnSync(process.execPath, [cli, ...args], { cwd: TOOL_ROOT, encoding: 'utf8' });
const pngSize = (f) => { const b = fs.readFileSync(f); return [b.readUInt32BE(16), b.readUInt32BE(20)]; };

const examples = { 'example-report': 6, 'example-artwork': 6, 'example-announcement': 3 };
for (const [name, count] of Object.entries(examples)) {
  const r = run('build', `posts/${name}`, '--strict');
  assert.equal(r.status, 0, `${name} failed:\n${r.stdout}\n${r.stderr}`);
  const out = path.join(TOOL_ROOT, 'posts', name, 'output');
  for (let i = 1; i <= count; i++) {
    const n = `slide-${String(i).padStart(2, '0')}.png`;
    assert.deepEqual(pngSize(path.join(out, 'feed', n)), [1080, 1350], `${name} feed ${n}`);
    assert.deepEqual(pngSize(path.join(out, 'story', n)), [1080, 1920], `${name} story ${n}`);
  }
  const caption = fs.readFileSync(path.join(out, 'caption.txt'), 'utf8');
  assert.ok(caption.split('\n\n').length >= 2, `${name}: caption should have two paragraphs`);
  console.log(`ok  ${name}: ${count} slides, feed and story sizes correct`);
}

// a post with no source credit must be refused
const tmp = fs.mkdtempSync(path.join(os.tmpdir(), 'social-test-'));
fs.writeFileSync(path.join(tmp, 'post.yaml'), 'type: report\nhook: "x"\nslides: []\n');
const bad = run('check', tmp);
assert.notEqual(bad.status, 0, 'a post with no credits should fail');
assert.match(bad.stderr, /credits\.source/);
console.log('ok  missing source credit is refused');
