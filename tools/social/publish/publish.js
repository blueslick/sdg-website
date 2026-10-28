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

const args = process.argv.slice(2);
const flag = (name) => args.find((a) => a.startsWith(`--${name}=`))?.split('=').slice(1).join('=');
const live = args.includes('--live');
const words = args.filter((a) => !a.startsWith('--'));
const cmd = words[0] ?? 'publish';
const fixture = flag('fixture');

// "Post at" is Malaysia time (UTC+8, no daylight saving). Accepts 2026-11-16 08:00, 2026-11-16 8:00:00, 2026-11-16T08:00.
export function parseMyt(s) {
  const m = String(s ?? '').trim().match(/^(\d{4})-(\d{2})-(\d{2})[ T](\d{1,2}):(\d{2})(?::\d{2})?$/);
  if (!m) return null;
  const [, y, mo, d, h, mi] = m;
  return new Date(`${y}-${mo}-${d}T${h.padStart(2, '0')}:${mi}:00+08:00`);
}
const nowArg = flag('now');
const now = nowArg ? parseMyt(nowArg) : new Date();

const isApproved = (r) => /^approved$/i.test(r.status);
const isStory = (r) => /^story$/i.test(r.type);

// ---- the queue: the sheet, or a local file when testing ----
async function openQueue() {
  if (fixture) {
    const rows = JSON.parse(fs.readFileSync(fixture, 'utf8'));
    return {
      rows,
      write: async (row, fields) => {
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

function dueRows(rows) {
  const out = [];
  for (const r of rows) {
    if (!isApproved(r)) continue;
    const at = parseMyt(r.post_at);
    // stderr, so "due" output (read by the workflow as a list of folders) stays clean
    if (!at) { console.error(`skip ${r.post} (row ${r.row}): "Post at" is empty or not like 2026-11-16 08:00`); continue; }
    if (at <= now) out.push(r);
  }
  return out;
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
  return fs.readFileSync(file, 'utf8').trim();
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
  const res = await fetch(`${GRAPH}/${pathname}`, { method: 'POST', body });
  const json = await res.json();
  if (!res.ok || json.error) throw new Error(`${pathname}: ${json.error?.message ?? res.status}`);
  return json;
}
async function waitReady(id) {
  for (let i = 0; i < 10; i++) {
    const res = await fetch(`${GRAPH}/${id}?fields=status_code&access_token=${encodeURIComponent(process.env.IG_ACCESS_TOKEN)}`);
    const { status_code } = await res.json();
    if (status_code === 'FINISHED') return;
    if (status_code === 'ERROR' || status_code === 'EXPIRED') throw new Error(`container ${id}: ${status_code}`);
    await new Promise((r) => setTimeout(r, Number(process.env.IG_POLL_MS ?? 6000)));
  }
  throw new Error(`container ${id}: not ready after a minute`);
}
const mediaUrl = (folder, f) => `${process.env.MEDIA_BASE_URL.replace(/\/$/, '')}/${folder}/output/jpeg/${f}`;

async function postFeed(r) {
  const user = process.env.IG_USER_ID;
  const slides = jpegs(r.post, 'feed').slice(0, 10); // Instagram allows 10 per carousel
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
  await waitReady(creation);
  return [(await api(`${user}/media_publish`, { creation_id: creation })).id];
}
async function postStories(r, done) {
  const user = process.env.IG_USER_ID;
  for (const f of jpegs(r.post, 'story')) {
    const creation = (await api(`${user}/media`, { image_url: mediaUrl(r.post, f), media_type: 'STORIES' })).id;
    await waitReady(creation);
    done.push((await api(`${user}/media_publish`, { creation_id: creation })).id);
  }
  return done;
}

// ---- publish ----
async function publish() {
  const q = await openQueue();
  const due = dueRows(q.rows);
  const drafts = q.rows.filter((r) => /^draft$/i.test(r.status) || !r.status).map((r) => r.post);
  console.log(`${live ? 'LIVE' : 'DRY RUN'} at ${now.toISOString()}`);
  if (drafts.length) console.log(`Not posting (not approved yet): ${drafts.join(', ')}`);
  if (!due.length) { console.log('Nothing approved and due.'); return; }
  if (live && !(process.env.IG_USER_ID && process.env.IG_ACCESS_TOKEN && process.env.MEDIA_BASE_URL)) {
    throw new Error('--live needs IG_USER_ID, IG_ACCESS_TOKEN and MEDIA_BASE_URL.');
  }
  for (const r of due) {
    const kind = isStory(r) ? 'story' : 'feed';
    const slides = jpegs(r.post, kind);
    if (!slides.length) { console.log(`skip ${r.post}: no ${kind} JPEGs. Run "prepare ${r.post}" first.`); continue; }
    if (!live) { console.log(`would post ${r.post} as ${kind} (${slides.length} image${slides.length > 1 ? 's' : ''})`); continue; }
    // Mark it first, so a crash halfway can never lead to the same post going out twice.
    // A row left on "Posting" is never retried: a person checks Instagram and fixes the row.
    await q.write(r.row, { status: 'Posting', last_error: '' });
    const ids = [];
    try {
      if (kind === 'story') await postStories(r, ids); else ids.push(...(await postFeed(r)));
      await q.write(r.row, { status: 'Published', instagram_id: ids.join(', '), published_at: new Date().toISOString(), last_error: '' });
      console.log(`posted ${r.post}: ${ids.join(', ')}`);
    } catch (e) {
      // Nothing went out: back to Approved so the next run tries again. Something went out: stop, a person checks.
      const status = ids.length ? 'Check: partly posted' : 'Approved';
      await q.write(r.row, { status, instagram_id: ids.join(', '), last_error: e.message.slice(0, 300) });
      console.error(`failed ${r.post}: ${e.message}`);
    }
  }
}

async function refreshToken() {
  // Instagram long-lived tokens last 60 days. Run this on your own computer before they expire,
  // then paste the new token into the IG_ACCESS_TOKEN secret. Never run it in GitHub Actions (it prints the token).
  const res = await fetch(`${GRAPH.replace(/\/v[\d.]+$/, '')}/refresh_access_token?grant_type=ig_refresh_token&access_token=${encodeURIComponent(process.env.IG_ACCESS_TOKEN ?? '')}`);
  const json = await res.json();
  if (!res.ok || json.error) throw new Error(`refresh failed: ${json.error?.message ?? res.status}`);
  const days = Math.round((json.expires_in ?? 0) / 86400);
  console.log(`New token valid for about ${days} days.`);
  if (args.includes('--show')) console.log(json.access_token); else console.log('Add --show to print it (on your own computer only).');
}

const run = {
  due: async () => console.log([...new Set(dueRows((await openQueue()).rows).map((r) => r.post))].join(' ')),
  prepare: () => prepare(words.slice(1)),
  'refresh-token': refreshToken,
  publish,
}[cmd];
if (!run) { console.error(`Unknown command "${cmd}". Use due, prepare, refresh-token, or no command to publish.`); process.exit(1); }
run().catch((e) => { console.error(e.message); process.exit(1); });
