// Instagram publisher for the Pharos post maker.
//
// The queue is a Google Sheet (see sheet.js and README.md in this folder). This script posts ONLY
// rows whose Status is "Approved" and whose "Post at" time (Malaysia time) has passed. It writes
// "Published", the Instagram id and the time back to the sheet. Default is a dry run: it prints
// what it would do and posts nothing. Add --live to post.
//
//   node publish/publish.js due                      # print the folders that are approved and due
//   node publish/publish.js prepare <folder> ...     # turn a post's PNGs into JPEGs (Instagram takes JPEG only)
//   node publish/publish.js                          # dry run: show what would be posted
//   node publish/publish.js --live                   # post what is approved and due
//   node publish/publish.js --now=2026-11-16T08:30   # pretend it is this Malaysia time (testing)
//   node publish/publish.js --fixture=rows.json      # use a local list of rows instead of the sheet (testing)
//   node publish/publish.js refresh-token --show     # on your own computer only: get a fresh 60-day token
//
// Settings (GitHub Actions secrets, never written in a file):
//   QUEUE_SHEET_ID   the queue sheet's id
//   GOOGLE_SA_KEY    the Google service account's JSON key (the sheet is shared with its email as Editor)
//   IG_USER_ID       the Instagram professional account id
//   IG_ACCESS_TOKEN  a long-lived token with instagram_business_content_publish
//   MEDIA_BASE_URL   public address where each post's output/jpeg/ files can be fetched (Meta downloads them)
import fs from 'node:fs';
import path from 'node:path';
import { fileURLToPath } from 'node:url';
import { getAccessToken, readQueue, writeResult } from './sheet.js';

const HERE = path.dirname(fileURLToPath(import.meta.url));
const POSTS = path.join(HERE, '..', 'posts');
const GRAPH = process.env.IG_GRAPH_URL || 'https://graph.instagram.com/v23.0';
const MAX_ATTEMPTS = 3; // a post that fails this many times before anything went out is set to "Failed"
const TIMEOUT = () => AbortSignal.timeout(30000);

const args = process.argv.slice(2);
const flag = (name) => args.find((a) => a.startsWith(`--${name}=`))?.split('=').slice(1).join('=');
const live = args.includes('--live');
const words = args.filter((a) => !a.startsWith('--'));
const cmd = words[0] ?? 'publish';
const fixture = flag('fixture');

// ---- "Post at" is Malaysia time (UTC+8, no daylight saving) ----
// Text like 2026-11-16 08:00 / 2026-11-16 8:00:00 / 2026-11-16T08:00, or a Sheets date serial number
// (days since 30 Dec 1899, read as Malaysia wall-clock time).
export function parseMyt(v) {
  if (typeof v === 'number' && Number.isFinite(v) && v > 40000) {
    const wallClockAsUtc = Math.round((v - 25569) * 86400000); // 25569 = days from 1899-12-30 to 1970-01-01
    return new Date(wallClockAsUtc - 8 * 3600000);
  }
  const m = String(v ?? '').trim().match(/^(\d{4})-(\d{2})-(\d{2})[ T](\d{1,2}):(\d{2})(?::\d{2})?$/);
  if (!m) return null;
  const [, y, mo, d, h, mi] = m;
  return new Date(`${y}-${mo}-${d}T${h.padStart(2, '0')}:${mi}:00+08:00`);
}
const nowArg = flag('now');
const now = nowArg ? parseMyt(nowArg) : new Date();

const isApproved = (r) => /^approved$/i.test(String(r.status ?? '').trim());
// A folder name may only be lower-case letters, digits and hyphens, and must be a real post folder.
// This is what keeps text typed into the sheet from ever reaching a shell command.
const validFolder = (f) => /^[0-9a-z][0-9a-z-]{0,63}$/.test(f) && fs.existsSync(path.join(POSTS, f, 'post.yaml'));

// ---- the queue: the sheet, or a local file when testing ----
async function openQueue() {
  if (fixture) {
    const rows = JSON.parse(fs.readFileSync(fixture, 'utf8'));
    return {
      rows,
      write: async (row, fields) => {
        if (process.env.FIXTURE_FAIL_WRITE) throw new Error('fake sheet write failure');
        const r = rows.find((x) => x.row === row);
        for (const [k, v] of Object.entries(fields)) if (v !== undefined && v !== null) r[k] = v;
        fs.writeFileSync(fixture, JSON.stringify(rows, null, 1));
      },
    };
  }
  const { QUEUE_SHEET_ID, GOOGLE_SA_KEY } = process.env;
  if (!QUEUE_SHEET_ID || !GOOGLE_SA_KEY) throw new Error('Needs QUEUE_SHEET_ID and GOOGLE_SA_KEY (or --fixture=file.json for a test).');
  const token = await getAccessToken(GOOGLE_SA_KEY);
  return { rows: await readQueue(QUEUE_SHEET_ID, token), write: (row, fields) => writeResult(QUEUE_SHEET_ID, token, row, fields) };
}

/** Sort the Approved rows into the ones to post now and the ones with a problem (written to Last error). */
function sortRows(rows) {
  const due = [], problems = [], seen = new Set();
  const typeOf = (r) => String(r.type ?? '').trim().toLowerCase();
  // A post that has already gone out (or may have) is never posted again from another row.
  const alreadyOut = new Set(rows.filter((r) => /^(published|posting|check on instagram)$/i.test(String(r.status ?? '').trim())).map((r) => `${r.post}|${typeOf(r)}`));
  for (const r of rows) {
    if (!isApproved(r)) continue;
    const type = String(r.type ?? '').trim().toLowerCase();
    if (!validFolder(r.post)) { problems.push([r, `"${r.post}" isn't a post folder in tools/social/posts (lower-case letters, digits and hyphens only)`]); continue; }
    if (type !== 'feed' && type !== 'story') { problems.push([r, `Type must be feed or story, not "${r.type}"`]); continue; }
    const at = parseMyt(r.post_at);
    if (!at) { problems.push([r, `"Post at" is empty or not like 2026-11-16 08:00`]); continue; }
    if (at > now) continue;
    const key = `${r.post}|${type}`;
    if (alreadyOut.has(key)) { problems.push([r, `${r.post} has already been posted as ${type} (another row says Published, Posting or Check on Instagram)`]); continue; }
    if (seen.has(key)) { problems.push([r, `another Approved row already posts ${r.post} as ${type}; only the first is posted`]); continue; }
    seen.add(key);
    due.push({ ...r, type });
  }
  return { due, problems };
}

// ---- files the post maker built ----
const outDir = (folder, sub) => path.join(POSTS, folder, 'output', sub);
function files(folder, sub, ext) {
  const dir = outDir(folder, sub);
  return fs.existsSync(dir) ? fs.readdirSync(dir).filter((f) => f.endsWith('.' + ext)).sort() : [];
}
function captionOf(folder) {
  const file = path.join(POSTS, folder, 'output', 'caption.txt');
  if (!fs.existsSync(file)) throw new Error(`${folder}: no caption.txt. Run: npm run build-post posts/${folder}`);
  const caption = fs.readFileSync(file, 'utf8').trim();
  if (caption.length > 2200) throw new Error(`${folder}: caption is ${caption.length} characters; Instagram allows 2,200`);
  return caption;
}
function altOf(folder) {
  const file = path.join(POSTS, folder, 'output', 'alt-text.txt');
  if (!fs.existsSync(file)) return [];
  return fs.readFileSync(file, 'utf8').split(/\n(?=Slide \d+)/).map((b) => b.replace(/^Slide \d+:\s*/, '').trim());
}
// JPEGs made by "prepare": output/jpeg/feed-slide-01.jpg, output/jpeg/story-slide-01.jpg
const jpegs = (folder, kind) => files(folder, 'jpeg', 'jpg').filter((f) => f.startsWith(kind + '-'));

// ---- prepare: PNG -> JPEG with the browser the post maker already uses ----
async function prepare(folders) {
  const bad = folders.filter((f) => !validFolder(f));
  if (bad.length) throw new Error(`Not post folders: ${bad.join(', ')}`);
  const { chromium } = await import('playwright');
  const browser = await chromium.launch();
  for (const folder of folders) {
    const out = outDir(folder, 'jpeg');
    fs.mkdirSync(out, { recursive: true });
    let n = 0;
    for (const [kind, w, h] of [['feed', 1080, 1350], ['story', 1080, 1920]]) {
      const page = await browser.newPage({ viewport: { width: w, height: h } });
      for (const f of files(folder, kind, 'png')) {
        const data = fs.readFileSync(path.join(outDir(folder, kind), f)).toString('base64');
        await page.setContent(`<body style="margin:0"><img src="data:image/png;base64,${data}" width="${w}" height="${h}"></body>`);
        await page.screenshot({ path: path.join(out, `${kind}-${f.replace('.png', '.jpg')}`), type: 'jpeg', quality: 92 });
        n++;
      }
      await page.close();
    }
    console.log(n ? `prepared ${folder}: ${n} JPEGs` : `skip ${folder}: not built yet`);
  }
  await browser.close();
}

// ---- Instagram calls ----
async function api(pathname, params) {
  const body = new URLSearchParams({ ...params, access_token: process.env.IG_ACCESS_TOKEN });
  const res = await fetch(`${GRAPH}/${pathname}`, { method: 'POST', body, signal: TIMEOUT() });
  const json = await res.json().catch(() => ({}));
  if (!res.ok || json.error) throw new Error(`${pathname}: ${json.error?.message ?? `HTTP ${res.status}`}`);
  return json;
}
async function waitReady(id) {
  // Meta suggests checking once a minute for up to 5 minutes; images are usually ready in seconds.
  const pause = Number(process.env.IG_POLL_MS ?? 10000);
  for (let i = 0; i < 30; i++) {
    const res = await fetch(`${GRAPH}/${id}?fields=status_code`, { headers: { authorization: `Bearer ${process.env.IG_ACCESS_TOKEN}` }, signal: TIMEOUT() });
    const json = await res.json().catch(() => ({}));
    if (!res.ok || json.error) throw new Error(`checking container ${id}: ${json.error?.message ?? `HTTP ${res.status}`}`);
    if (json.status_code === 'FINISHED') return;
    if (json.status_code === 'ERROR' || json.status_code === 'EXPIRED') throw new Error(`container ${id}: ${json.status_code}`);
    await new Promise((r) => setTimeout(r, pause));
  }
  throw new Error(`container ${id}: not ready after 5 minutes`);
}
const mediaUrl = (folder, f) => `${process.env.MEDIA_BASE_URL.replace(/\/$/, '')}/${folder}/output/jpeg/${f}`;

// state.publishCalled is set just before any media_publish call. If that call (or anything after it)
// fails, Instagram may already have posted, so the row is never retried automatically.
async function publishContainer(user, creation, state) {
  await waitReady(creation);
  state.publishCalled = true;
  const id = (await api(`${user}/media_publish`, { creation_id: creation })).id;
  state.ids.push(id);
}
async function postFeed(r, state) {
  const user = process.env.IG_USER_ID;
  const slides = jpegs(r.post, 'feed');
  if (slides.length > 10) throw new Error(`${r.post} has ${slides.length} slides; an Instagram carousel takes 10 at most`);
  const caption = captionOf(r.post);
  const alts = altOf(r.post);
  let creation;
  if (slides.length === 1) {
    creation = (await api(`${user}/media`, { image_url: mediaUrl(r.post, slides[0]), caption, alt_text: alts[0] ?? '' })).id;
  } else {
    const children = [];
    for (const [i, f] of slides.entries()) {
      children.push((await api(`${user}/media`, { image_url: mediaUrl(r.post, f), is_carousel_item: 'true', alt_text: alts[i] ?? '' })).id);
    }
    creation = (await api(`${user}/media`, { media_type: 'CAROUSEL', children: children.join(','), caption })).id;
  }
  await publishContainer(user, creation, state);
}
async function postStories(r, state) {
  const user = process.env.IG_USER_ID;
  for (const f of jpegs(r.post, 'story')) {
    const creation = (await api(`${user}/media`, { image_url: mediaUrl(r.post, f), media_type: 'STORIES' })).id;
    await publishContainer(user, creation, state);
  }
}

// ---- publish ----
async function publish() {
  const q = await openQueue();
  const { due, problems } = sortRows(q.rows);
  const drafts = q.rows.filter((r) => /^draft$/i.test(String(r.status ?? '').trim()) || !r.status).map((r) => r.post);
  console.log(`${live ? 'LIVE' : 'DRY RUN'} at ${now.toISOString()}`);
  if (drafts.length) console.log(`Not posting (not approved yet): ${drafts.join(', ')}`);
  for (const [r, why] of problems) {
    console.error(`skip ${r.post} (row ${r.row}): ${why}`);
    if (live) await q.write(r.row, { last_error: `Not posted: ${why}` });
  }
  if (problems.length) process.exitCode = 1; // shows as a failed run, so someone notices
  if (!due.length) { console.log('Nothing approved and due.'); return; }
  if (live && !(process.env.IG_USER_ID && process.env.IG_ACCESS_TOKEN && process.env.MEDIA_BASE_URL)) {
    throw new Error('--live needs IG_USER_ID, IG_ACCESS_TOKEN and MEDIA_BASE_URL.');
  }
  for (const r of due) {
    const slides = jpegs(r.post, r.type);
    if (!slides.length) { console.error(`skip ${r.post}: no ${r.type} JPEGs (its build failed, or run "prepare ${r.post}").`); process.exitCode = 1; continue; }
    if (!live) { console.log(`would post ${r.post} as ${r.type} (${slides.length} image${slides.length > 1 ? 's' : ''})`); continue; }
    // Mark it first, so a crash halfway can never lead to the same post going out twice.
    // A row left on "Posting" is never retried: a person checks Instagram and fixes the row.
    await q.write(r.row, { status: 'Posting', last_error: '' });
    const state = { ids: [], publishCalled: false };
    try {
      if (r.type === 'story') await postStories(r, state); else await postFeed(r, state);
      await q.write(r.row, { status: 'Published', instagram_id: state.ids.join(', '), published_at: new Date().toISOString(), last_error: '' });
      console.log(`posted ${r.post}: ${state.ids.join(', ')}`);
    } catch (e) {
      process.exitCode = 1;
      const msg = String(e.message).replace(/access_token=[^&\s]+/g, 'access_token=…').slice(0, 300);
      if (state.publishCalled) {
        // Instagram may have posted it. Never retry on its own: a person checks Instagram first.
        await q.write(r.row, { status: 'Check on Instagram', instagram_id: state.ids.join(', '), last_error: `May have posted: ${msg}` });
      } else {
        const attempts = (parseInt(r.attempts, 10) || 0) + 1;
        await q.write(r.row, { status: attempts >= MAX_ATTEMPTS ? 'Failed' : 'Approved', attempts: String(attempts), last_error: msg });
      }
      console.error(`failed ${r.post}: ${msg}`);
    }
  }
}

async function refreshToken() {
  // Instagram long-lived tokens last 60 days. Run this on your own computer before they expire,
  // then paste the new token into the IG_ACCESS_TOKEN secret. Never run it in GitHub Actions (it prints the token).
  const res = await fetch(`${GRAPH.replace(/\/v[\d.]+$/, '')}/refresh_access_token?grant_type=ig_refresh_token&access_token=${encodeURIComponent(process.env.IG_ACCESS_TOKEN ?? '')}`, { signal: TIMEOUT() });
  const json = await res.json();
  if (!res.ok || json.error) throw new Error(`refresh failed: ${json.error?.message ?? res.status}`);
  const days = Math.round((json.expires_in ?? 0) / 86400);
  console.log(`New token valid for about ${days} days.`);
  if (args.includes('--show')) console.log(json.access_token); else console.log('Add --show to print it (on your own computer only).');
}

async function listDue() {
  const { due, problems } = sortRows((await openQueue()).rows);
  for (const [r, why] of problems) console.error(`skip ${r.post} (row ${r.row}): ${why}`);
  // In GitHub Actions, tell the workflow how many Approved rows have a problem, so the publish step
  // still runs to write the reason into each row's Last error and mark the run as failed.
  if (process.env.GITHUB_OUTPUT) fs.appendFileSync(process.env.GITHUB_OUTPUT, `problems=${problems.length}\n`);
  // Only validated folder names ever reach stdout, which the workflow reads.
  console.log([...new Set(due.map((r) => r.post))].join(' '));
}

const run = { due: listDue, prepare: () => prepare(words.slice(1)), 'refresh-token': refreshToken, publish }[cmd];
if (!run) { console.error(`Unknown command "${cmd}". Use due, prepare, refresh-token, or no command to publish.`); process.exit(1); }
run().catch((e) => { console.error(e.message); process.exit(1); });
