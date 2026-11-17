// Runs from the repo root: node tools/links.test.cjs
// Every local href/src in the pages, and every explicit local path string in the
// shipped scripts, must resolve on disk. Nothing here touches the network.
const assert = require('node:assert/strict');
const fs = require('node:fs');
const path = require('node:path');

const ROOT = process.cwd();
const SKIP_DIRS = new Set(['.git', 'node_modules', 'training-runs']);
const EXTERNAL = /^(?:[a-z]+:|\/\/|#)/i;

function walk(dir, out = []) {
  for (const entry of fs.readdirSync(dir, { withFileTypes: true })) {
    const rel = path.posix.join(dir === '.' ? '.' : dir, entry.name).replace(/^\.\//, '');
    if (entry.isDirectory()) {
      if (SKIP_DIRS.has(entry.name)) continue;
      walk(rel === '.' ? '.' : rel, out);
    } else {
      out.push(rel);
    }
  }
  return out;
}

const allFiles = walk('.');
const pages = allFiles.filter((f) => f.endsWith('.html')).sort();
// Generated weights and the tests themselves are not page wiring.
const scripts = allFiles
  .filter((f) => f.startsWith('assets/') && f.endsWith('.js'))
  .filter((f) => !f.endsWith('.test.cjs') && !/tinylm-weights\.js$/.test(f))
  .sort();

assert.ok(pages.length >= 30, `found the pages (${pages.length})`);
assert.ok(scripts.length >= 15, `found the shipped scripts (${scripts.length})`);
assert.ok(pages.includes('index.html'), 'index.html is part of the scan');

const broken = [];
const clean = (ref) => ref.split('#')[0].split('?')[0].trim();

// A shared script is loaded from the Big Top and from act pages alike, so its
// relative paths are resolved from whichever page pulls it in.
const PAGE_DIRS = [...new Set(pages.map((p) => path.dirname(path.resolve(ROOT, p))))];

function check(fromFile, lineNo, rawRef, bases = []) {
  const ref = clean(rawRef);
  if (!ref || EXTERNAL.test(ref) || ref.includes('${')) return;
  const dirs = ref.startsWith('/')
    ? [ROOT]
    : [...new Set([path.dirname(path.resolve(ROOT, fromFile)), ROOT, ...bases])];
  const target = (dir) => (ref.startsWith('/') ? path.resolve(dir, ref.slice(1)) : path.resolve(dir, ref));
  if (!dirs.some((dir) => fs.existsSync(target(dir)))) broken.push(`${fromFile}:${lineNo} -> ${rawRef}`);
}

// 1) Every href/src attribute in every page.
for (const page of pages) {
  const lines = fs.readFileSync(page, 'utf8').split(/\r?\n/);
  lines.forEach((line, i) => {
    for (const match of line.matchAll(/\b(?:href|src)\s*=\s*(?:"([^"]*)"|'([^']*)')/g)) {
      check(page, i + 1, match[1] ?? match[2]);
    }
  });
}

// 2) Every explicit relative path string in the shipped scripts
//    (require/import/fetch/src assignments all look the same from here).
const LOCAL_PATH = /['"`]((?:\.{1,2}\/|assets\/|acts\/|corpus-src\/|datasets\/)[^'"`\s]*?\.(?:html|js|cjs|css|json|jsonl|txt|md|svg|png|jpe?g|gif|webp|mp3|wav|ogg|woff2?))['"`]/g;
for (const script of scripts) {
  const lines = fs.readFileSync(script, 'utf8').split(/\r?\n/);
  lines.forEach((line, i) => {
    for (const match of line.matchAll(LOCAL_PATH)) check(script, i + 1, match[1], PAGE_DIRS);
  });
}

assert.deepEqual(broken, [], `broken local references:\n  ${broken.join('\n  ')}`);
console.log(`links.test.cjs: ${pages.length} pages and ${scripts.length} scripts, every local reference resolves`);
