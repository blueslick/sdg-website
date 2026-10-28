// Tests the publisher end to end against a fake Instagram and a fake Google Sheet.
// Nothing real is called. Run from tools/social:  node publish/test-publish.js
// Needs the posts used below to be built first (npm run build-post posts/01-launch, posts/04-fee-support).
import http from 'node:http';
import fs from 'node:fs';
import os from 'node:os';
import path from 'node:path';
import crypto from 'node:crypto';
import { execFile } from 'node:child_process';
import { promisify } from 'node:util';
const execFileP = promisify(execFile);
import { fileURLToPath } from 'node:url';

const HERE = path.dirname(fileURLToPath(import.meta.url));
const TOOL = path.join(HERE, '..');
let failures = 0;
const ok = (cond, msg) => { console.log(`${cond ? 'ok  ' : 'FAIL'} ${msg}`); if (!cond) failures++; };

// ---- a fake Instagram Graph API ----
const calls = [];
let failNextMedia = false;
const ig = http.createServer((req, res) => {
  let body = '';
  req.on('data', (c) => { body += c; });
  req.on('end', () => {
    const p = new URLSearchParams(body);
    calls.push({ method: req.method, url: req.url, params: Object.fromEntries(p) });
    res.setHeader('content-type', 'application/json');
    if (req.method === 'GET') return res.end(JSON.stringify({ status_code: 'FINISHED' }));
    if (req.url.endsWith('/media') && failNextMedia) { failNextMedia = false; res.statusCode = 400; return res.end(JSON.stringify({ error: { message: 'fake failure' } })); }
    if (req.url.endsWith('/media')) return res.end(JSON.stringify({ id: `c${calls.length}` }));
    if (req.url.endsWith('/media_publish')) return res.end(JSON.stringify({ id: `pub${calls.length}` }));
    res.statusCode = 404; res.end('{}');
  });
});
await new Promise((r) => ig.listen(0, r));
const IG = `http://127.0.0.1:${ig.address().port}/v23.0`;

const env = { ...process.env, IG_GRAPH_URL: IG, IG_USER_ID: '123', IG_ACCESS_TOKEN: 'test-token', MEDIA_BASE_URL: 'https://example.test/posts', IG_POLL_MS: '1' };
// Async on purpose: the fake servers live in this process, so it must keep answering while the publisher runs.
const run = async (...a) => { const r = await execFileP('node', ['publish/publish.js', ...a], { cwd: TOOL, env, encoding: 'utf8', timeout: 120000 }); return a.includes('due') ? r.stdout : r.stdout + r.stderr; };

// ---- fixture queue rows (what the sheet would hold) ----
const fixture = path.join(fs.mkdtempSync(path.join(os.tmpdir(), 'pharos-q-')), 'rows.json');
const rows = [
  { row: 2, post: '01-launch', type: 'feed', post_at: '2026-11-16 08:00', status: 'Approved' },
  { row: 3, post: '02-pinned-rules', type: 'feed', post_at: '2026-11-16 08:05', status: 'Draft' },
  { row: 4, post: '05-where-your-fee-goes', type: 'feed', post_at: '2026-11-19 19:00', status: 'Approved' },
  { row: 5, post: '04-fee-support', type: 'story', post_at: '2026-11-16 9:00:00', status: 'approved' },
  { row: 6, post: '03-essay-tips', type: 'feed', post_at: '2026-11-16 08:10', status: 'Rejected' },
  { row: 7, post: '06a-2-weeks-left', type: 'feed', post_at: '', status: 'Approved' },
];
fs.writeFileSync(fixture, JSON.stringify(rows));
const F = `--fixture=${fixture}`, NOW = '--now=2026-11-16T09:30';
const read = () => JSON.parse(fs.readFileSync(fixture, 'utf8'));

await run('prepare', '01-launch', '04-fee-support');
const jp = (f) => fs.readdirSync(path.join(TOOL, 'posts', f, 'output', 'jpeg'));
ok(jp('01-launch').filter((x) => x.startsWith('feed-')).length === 4, 'prepare makes 4 feed JPEGs for the launch post');
ok(jp('04-fee-support').some((x) => x.startsWith('story-')), 'prepare makes story JPEGs too');

const due = (await run('due', F, NOW)).trim();
ok(due === '01-launch 04-fee-support', `"due" lists only approved rows whose time has passed (got "${due}")`);

const dry = await run(F, NOW);
ok(/would post 01-launch as feed \(4 images\)/.test(dry), 'dry run would post the launch carousel');
ok(/would post 04-fee-support as story/.test(dry), 'dry run would post the story');
ok(!/05-where|02-pinned|03-essay/.test(dry.split('Not posting')[0] + (dry.split('\n').filter((l) => l.startsWith('would')).join('\n'))), 'dry run skips future, draft and rejected rows');
ok(/"Post at" is empty/.test(dry), 'an approved row with no time is skipped and says why');
ok(calls.length === 0, 'dry run calls Instagram 0 times');

await run('--live', F, NOW);
let after = read();
ok(after[0].status === 'Published' && /^pub\d+$/.test(after[0].instagram_id), 'live: launch post marked Published with its Instagram id');
ok(after[3].status === 'Published', 'live: story marked Published');
ok(after[2].status === 'Approved' && !after[2].instagram_id, 'live: the 19 Nov post is untouched until its time');
ok(after[1].status === 'Draft' && after[4].status === 'Rejected', 'live: draft and rejected rows untouched');
const carousel = calls.find((c) => c.params.media_type === 'CAROUSEL');
ok(carousel && carousel.params.children.split(',').length === 4, 'live: carousel built from 4 slides');
ok(carousel && carousel.params.caption.startsWith('Pharos is an essay competition'), 'live: caption sent with the carousel');
ok(calls.some((c) => c.params.media_type === 'STORIES' && c.params.image_url.includes('/04-fee-support/output/jpeg/story-')), 'live: story uses the 1080x1920 story image');
ok(calls.filter((c) => c.params.is_carousel_item).every((c) => c.params.alt_text), 'live: every carousel slide has alt text');

const before = calls.length;
await run('--live', F, NOW);
ok(calls.length === before, 'running again posts nothing twice');

// a failure before anything goes out puts the row back to Approved with the error
fs.writeFileSync(fixture, JSON.stringify([{ row: 2, post: '01-launch', type: 'feed', post_at: '2026-11-16 08:00', status: 'Approved' }]));
failNextMedia = true;
try { await run('--live', F, NOW); } catch {}
after = read();
ok(after[0].status === 'Approved' && /fake failure/.test(after[0].last_error), 'a failed post goes back to Approved with the error written down');

// ---- sheet.js against a fake Google: sign-in token, read, write ----
const { privateKey, publicKey } = crypto.generateKeyPairSync('rsa', { modulusLength: 2048 });
let wrote = null, jwtOk = false;
const g = http.createServer((req, res) => {
  let body = '';
  req.on('data', (c) => { body += c; });
  req.on('end', () => {
    res.setHeader('content-type', 'application/json');
    if (req.url === '/token') {
      const [h, c, s] = new URLSearchParams(body).get('assertion').split('.');
      const v = crypto.createVerify('RSA-SHA256'); v.update(`${h}.${c}`);
      jwtOk = v.verify(publicKey, Buffer.from(s.replace(/-/g, '+').replace(/_/g, '/'), 'base64'));
      return res.end(JSON.stringify({ access_token: 'g-token' }));
    }
    if (req.headers.authorization !== 'Bearer g-token') { res.statusCode = 401; return res.end('{}'); }
    if (req.method === 'GET') return res.end(JSON.stringify({ values: [['Post', 'What', 'Type', 'Post at', 'Status'], ['01-launch', 'Launch', 'feed', '2026-11-16 8:00:00', 'Approved'], [], ['02-pinned-rules', 'Rules', 'feed', '', 'Draft']] }));
    if (req.method === 'PUT') { wrote = { url: decodeURIComponent(req.url), body: JSON.parse(body) }; return res.end('{}'); }
  });
});
await new Promise((r) => g.listen(0, r));
const G = `http://127.0.0.1:${g.address().port}`;
process.env.SHEETS_API_URL = `${G}/sheets`;
const sheet = await import('./sheet.js?' + Date.now());
const key = { client_email: 'bot@test.iam.gserviceaccount.com', private_key: privateKey.export({ type: 'pkcs8', format: 'pem' }), token_uri: `${G}/token` };
const tok = await sheet.getAccessToken(JSON.stringify(key));
ok(tok === 'g-token' && jwtOk, 'Google sign-in token is signed correctly with the service account key');
const q = await sheet.readQueue('SHEET', tok);
ok(q.length === 2 && q[0].row === 2 && q[0].status === 'Approved' && q[1].row === 4, 'reads queue rows with their sheet row numbers, skipping blank rows');
await sheet.writeResult('SHEET', tok, 2, { status: 'Published', instagram_id: 'pub1' });
ok(wrote && wrote.url.includes('Queue!E2:K2') && wrote.body.values[0][0] === 'Published' && wrote.body.values[0][3] === 'pub1' && wrote.body.values[0][1] === null, 'writes only the result columns (E to K) and leaves the rest alone');

ig.close(); g.close();
console.log(failures ? `\n${failures} failed` : '\nall passed');
process.exit(failures ? 1 : 0);
