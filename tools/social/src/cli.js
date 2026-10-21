#!/usr/bin/env node
// Command line for the social post tool. See tools/social/README.md.
import fs from 'node:fs';
import path from 'node:path';
import { spawn } from 'node:child_process';
import { pathToFileURL } from 'node:url';
import { loadTokens, cssVariables, fontFaceCss, TOOL_ROOT } from './tokens.js';
import { loadPost, PostError } from './load-post.js';
import { renderPost, launchBrowser } from './render.js';
import { writeText, writePreview } from './outputs.js';

const HELP = `Social posts for the Pharos design

  npm run build-post posts/my-post      Make the feed (1080x1350) and story (1080x1920) PNGs, caption.txt and alt-text.txt
  npm run preview posts/my-post         Same, then open one page showing every slide for checking
  npm run coords                        Open the page where you drag on an image to get box/circle coordinates
  node src/cli.js check posts/my-post   Check post.yaml and the wording only (no images drawn)

Options for build / preview:
  --no-story     skip the 1080x1920 story versions
  --strict       treat every warning as a failure (exit code 1)
  --today=DATE   pretend today is DATE (YYYY-MM-DD) when working out {days_left}
`;

function openFile(fileOrUrl) {
  const url = fileOrUrl.startsWith('file:') ? fileOrUrl : pathToFileURL(fileOrUrl).href;
  const [cmd, args] =
    process.platform === 'darwin' ? ['open', [url]] : process.platform === 'win32' ? ['cmd', ['/c', 'start', '', url]] : ['xdg-open', [url]];
  try {
    const p = spawn(cmd, args, { stdio: 'ignore', detached: true });
    p.on('error', () => {});
    p.unref();
  } catch { /* the path is printed anyway */ }
  return url;
}

function mergeNotes(notes) {
  // The same note usually shows up in feed and story; show it once.
  const seen = new Map();
  for (const n of notes) {
    const key = `${n.slide}|${n.field}|${n.level}|${n.msg}`;
    if (seen.has(key)) seen.get(key).formats.push(n.format);
    else seen.set(key, { ...n, formats: [n.format] });
  }
  return [...seen.values()];
}

async function buildOne(dirArg, opts, browser) {
  const tokens = loadTokens();
  const today = opts.today ? new Date(opts.today + 'T00:00:00') : new Date();
  const post = loadPost(dirArg, { today });
  const outDir = path.join(post.dir, 'output');
  let result = { files: {}, notes: [] };
  if (!opts.checkOnly) {
    for (const f of ['feed', 'story']) fs.rmSync(path.join(outDir, f), { recursive: true, force: true });
    result = await renderPost({ tokens, post, outDir, formats: opts.noStory ? ['feed'] : ['feed', 'story'], browser });
  }
  writeText(post, outDir);
  const preview = opts.checkOnly ? null : writePreview({ tokens, post, outDir, notes: result.notes, files: result.files });

  const rel = (p) => path.relative(process.cwd(), p) || p;
  console.log(`\n${opts.checkOnly ? 'Checked' : 'Built'} ${post.name} (${post.type}, ${post.slides.length} slides)`);
  if (!opts.checkOnly) {
    console.log(`  feed:   ${rel(path.join(outDir, 'feed'))}/slide-01.png ... (1080 x 1350)`);
    if (!opts.noStory) console.log(`  story:  ${rel(path.join(outDir, 'story'))}/slide-01.png ... (1080 x 1920)`);
  }
  console.log(`  text:   ${rel(path.join(outDir, 'caption.txt'))}, ${rel(path.join(outDir, 'alt-text.txt'))}`);
  if (preview) console.log(`  check:  ${rel(preview)}`);

  const merged = mergeNotes(result.notes);
  const lines = [
    ...post.warnings.map((w) => ({ slide: w.slide, msg: w.msg })),
    ...merged.filter((n) => n.level !== 'info').map((n) => ({ slide: n.slide, msg: `${n.field}: ${n.msg}${n.formats.length === 1 ? ` (${n.formats[0]} only)` : ''}` })),
  ];
  for (const n of merged.filter((x) => x.level === 'info')) console.log(`  note:   slide ${n.slide}, ${n.field}: ${n.msg}${n.formats.length === 1 ? ` (${n.formats[0]} only)` : ''}`);
  for (const w of lines) console.log(`  WARNING${w.slide && !w.msg.startsWith(`slide ${w.slide}`) ? ` (slide ${w.slide})` : ''}: ${w.msg}`);
  if (!lines.length) console.log('  No warnings.');
  return { post, preview, warnings: lines.length };
}

async function main() {
  const argv = process.argv.slice(2);
  const cmd = argv.shift();
  const flags = new Set(argv.filter((a) => a.startsWith('--')));
  const opts = {
    noStory: flags.has('--no-story'),
    strict: flags.has('--strict'),
    noOpen: flags.has('--no-open'),
    checkOnly: cmd === 'check',
    today: argv.find((a) => a.startsWith('--today='))?.slice(8),
  };
  const args = argv.filter((a) => !a.startsWith('--'));

  if (!cmd || cmd === 'help' || cmd === '--help') return console.log(HELP);

  if (cmd === 'coords') {
    // The page is made fresh each time so its colours and fonts come from tokens.json.
    const tokens = loadTokens();
    const tpl = fs.readFileSync(path.join(TOOL_ROOT, 'helper', 'coords.template.html'), 'utf8');
    const file = path.join(TOOL_ROOT, 'helper', 'coords.html');
    fs.writeFileSync(file, tpl.replace('/*TOKENS*/', `${fontFaceCss(tokens)}\n${cssVariables(tokens, 'light')}`));
    const helper = pathToFileURL(file).href;
    const url = openFile(args[0] ? `${helper}?img=${encodeURIComponent(pathToFileURL(path.resolve(args[0])).href)}` : helper);
    console.log(`Opened the coordinate helper:\n  ${url}\nIf no browser window appeared, copy that address into your browser.`);
    return;
  }

  if (!['build', 'preview', 'check'].includes(cmd)) {
    console.error(`Unknown command "${cmd}".\n\n${HELP}`);
    process.exitCode = 1;
    return;
  }
  if (!args.length) {
    console.error(`Tell me which post folder, for example:  npm run ${cmd === 'check' ? 'build-post' : cmd} posts/example-report`);
    process.exitCode = 1;
    return;
  }

  let browser;
  let failed = false;
  let warnTotal = 0;
  try {
    if (!opts.checkOnly) browser = await launchBrowser();
    for (const a of args) {
      try {
        const r = await buildOne(a, opts, browser);
        warnTotal += r.warnings;
        if (cmd === 'preview' && !opts.noOpen && r.preview) console.log(`\nOpening ${openFile(r.preview)}`);
      } catch (e) {
        failed = true;
        if (e instanceof PostError) {
          console.error(`\nCould not build "${a}". Fix these and run it again:`);
          for (const p of e.problems) console.error(`  - ${p}`);
        } else throw e;
      }
    }
  } catch (e) {
    console.error(`\n${e.message}`);
    process.exitCode = 1;
    return;
  } finally {
    await browser?.close();
  }
  if (failed) process.exitCode = 1;
  else if (opts.strict && warnTotal) {
    console.error(`\n--strict: ${warnTotal} warning(s) found, so this counts as a failure.`);
    process.exitCode = 1;
  }
}

main();
