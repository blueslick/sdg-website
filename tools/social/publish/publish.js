// Instagram publisher for the Pharos post maker.
//
// Posts ONLY rows in queue.yaml that say status: approved and whose publish_at has passed.
// Default is a dry run: it prints what it would do and posts nothing. Add --live to post.
//
//   node publish/publish.js prepare            # turn every queued post's PNGs into JPEGs (Instagram only takes JPEG)
//   node publish/publish.js                    # dry run: show what is due
//   node publish/publish.js --live             # post what is approved and due
//   node publish/publish.js --now=2026-11-16T08:30   # pretend it's this Malaysia time (for testing)
//
// --live needs three settings (GitHub Actions secrets, never written in a file):
//   IG_USER_ID        the Instagram professional account id
//   IG_ACCESS_TOKEN   a long-lived token with instagram_business_content_publish
//   MEDIA_BASE_URL    public web address where output/jpeg/ files are reachable, e.g.
//                     https://raw.githubusercontent.com/blueslick/sdg-website/social-media/tools/social/posts
//                     (Meta downloads each image from this address, so it must be public.)
import fs from 'node:fs';
import path from 'node:path';
import { fileURLToPath } from 'node:url';
import YAML from 'yaml';

const HERE = path.dirname(fileURLToPath(import.meta.url));
const POSTS = path.join(HERE, '..', 'posts');
const QUEUE = path.join(HERE, 'queue.yaml');
const GRAPH = 'https://graph.instagram.com/v23.0';

const args = process.argv.slice(2);
const live = args.includes('--live');
const cmd = args.find((a) => !a.startsWith('--')) ?? 'publish';
const nowArg = args.find((a) => a.startsWith('--now='))?.slice(6);

// publish_at is Malaysia time (UTC+8, no daylight saving).
const myt = (s) => new Date(s.replace(' ', 'T') + ':00+08:00');
const now = nowArg ? myt(nowArg.replace('T', ' ')) : new Date();

function readQueueDoc() {
  return YAML.parseDocument(fs.readFileSync(QUEUE, 'utf8'));
}
function readQueue() {
  return readQueueDoc().toJS();
}

function slidesOf(folder, ext) {
  const dir = path.join(POSTS, folder, 'output', ext === 'jpg' ? 'jpeg' : 'feed');
  if (!fs.existsSync(dir)) return [];
  return fs.readdirSync(dir).filter((f) => f.endsWith('.' + ext)).sort();
}

function captionOf(folder) {
  const file = path.join(POSTS, folder, 'output', 'caption.txt');
  if (!fs.existsSync(file)) throw new Error(`${folder}: no caption.txt. Run: npm run build-post posts/${folder}`);
  return fs.readFileSync(file, 'utf8').trim();
}

function altOf(folder) {
  const file = path.join(POSTS, folder, 'output', 'alt-text.txt');
  if (!fs.existsSync(file)) return [];
  // alt-text.txt has one block per slide, starting "Slide N:".
  return fs.readFileSync(file, 'utf8').split(/\n(?=Slide \d+)/).map((b) => b.replace(/^Slide \d+:\s*/, '').trim());
}

// ---- prepare: PNG -> JPEG with the browser the post maker already uses ----
async function prepare() {
  const { chromium } = await import('playwright');
  const browser = await chromium.launch();
  const page = await browser.newPage({ viewport: { width: 1080, height: 1350 } });
  for (const row of readQueue().posts) {
    const pngs = slidesOf(row.folder, 'png');
    if (!pngs.length) { console.log(`skip ${row.folder}: not built yet`); continue; }
    const out = path.join(POSTS, row.folder, 'output', 'jpeg');
    fs.mkdirSync(out, { recursive: true });
    for (const f of pngs) {
      const data = fs.readFileSync(path.join(POSTS, row.folder, 'output', 'feed', f)).toString('base64');
      await page.setContent(`<body style="margin:0"><img src="data:image/png;base64,${data}" width="1080" height="1350"></body>`);
      await page.screenshot({ path: path.join(out, f.replace('.png', '.jpg')), type: 'jpeg', quality: 92 });
    }
    console.log(`prepared ${row.folder}: ${pngs.length} JPEGs`);
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
    const res = await fetch(`${GRAPH}/${id}?fields=status_code&access_token=${process.env.IG_ACCESS_TOKEN}`);
    const { status_code } = await res.json();
    if (status_code === 'FINISHED') return;
    if (status_code === 'ERROR' || status_code === 'EXPIRED') throw new Error(`container ${id}: ${status_code}`);
    await new Promise((r) => setTimeout(r, 6000));
  }
  throw new Error(`container ${id}: not ready after a minute`);
}

async function postOne(row) {
  const user = process.env.IG_USER_ID;
  const base = process.env.MEDIA_BASE_URL.replace(/\/$/, '');
  const jpgs = slidesOf(row.folder, 'jpg').slice(0, 10); // Instagram allows 10 per carousel
  const caption = captionOf(row.folder);
  const alts = altOf(row.folder);
  const url = (f) => `${base}/${row.folder}/output/jpeg/${f}`;
  let creation;
  if (jpgs.length === 1) {
    creation = (await api(`${user}/media`, { image_url: url(jpgs[0]), caption, alt_text: alts[0] ?? '' })).id;
  } else {
    const children = [];
    for (const [i, f] of jpgs.entries()) {
      children.push((await api(`${user}/media`, { image_url: url(f), is_carousel_item: 'true', alt_text: alts[i] ?? '' })).id);
    }
    creation = (await api(`${user}/media`, { media_type: 'CAROUSEL', children: children.join(','), caption })).id;
  }
  await waitReady(creation);
  return (await api(`${user}/media_publish`, { creation_id: creation })).id;
}

// ---- publish ----
async function publish() {
  const doc = readQueueDoc();
  const q = doc.toJS();
  const due = q.posts.filter((r) => r.status === 'approved' && r.publish_at && myt(r.publish_at) <= now);
  const noDate = q.posts.filter((r) => r.status === 'approved' && !r.publish_at);
  if (noDate.length) console.log(`Approved but no publish_at, so not posting: ${noDate.map((r) => r.folder).join(', ')}`);
  const waiting = q.posts.filter((r) => r.status === 'draft');
  console.log(`${live ? 'LIVE' : 'DRY RUN'} at ${now.toISOString()}`);
  if (waiting.length) console.log(`Not posting (still draft, needs Daniel): ${waiting.map((r) => r.folder).join(', ')}`);
  if (!due.length) { console.log('Nothing approved and due.'); return; }
  if (live && !(process.env.IG_USER_ID && process.env.IG_ACCESS_TOKEN && process.env.MEDIA_BASE_URL)) {
    throw new Error('--live needs IG_USER_ID, IG_ACCESS_TOKEN and MEDIA_BASE_URL.');
  }
  for (const row of due) {
    const jpgs = slidesOf(row.folder, 'jpg');
    if (!jpgs.length) { console.log(`skip ${row.folder}: run "prepare" first`); continue; }
    if (!live) { console.log(`would post ${row.folder} (${jpgs.length} slides)`); continue; }
    const i = q.posts.indexOf(row);
    try {
      const id = await postOne(row);
      doc.setIn(['posts', i, 'status'], 'published');
      doc.setIn(['posts', i, 'instagram_id'], id);
      doc.setIn(['posts', i, 'published_at'], new Date().toISOString());
      console.log(`posted ${row.folder}: ${id}`);
    } catch (e) {
      doc.setIn(['posts', i, 'last_error'], e.message); // stays "approved", so the next run tries again
      console.error(`failed ${row.folder}: ${e.message}`);
    }
    fs.writeFileSync(QUEUE, doc.toString()); // save after each post, so a crash never double-posts
  }
}

(cmd === 'prepare' ? prepare() : publish()).catch((e) => { console.error(e.message); process.exit(1); });
