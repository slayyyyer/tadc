// Runs from the repo root: node tools/roster.test.cjs
// The act roster lives in three places: the acts/ folders, the poster manifest
// (assets/adventures.js) and the README bullet list. They must agree.
const assert = require('node:assert/strict');
const fs = require('node:fs');
const path = require('node:path');
const vm = require('node:vm');

// 00-backstage is a credits page, not an adventure on the poster board.
const OFF_POSTER = '00-backstage';

const context = { window: {} };
vm.runInNewContext(fs.readFileSync('assets/adventures.js', 'utf8'), context);
const manifest = context.window.CIRCUS_ADVENTURES;
assert.ok(Array.isArray(manifest) && manifest.length > 10, 'the poster manifest parsed');

const folders = fs.readdirSync('acts', { withFileTypes: true })
  .filter((entry) => entry.isDirectory())
  .map((entry) => entry.name)
  .filter((name) => fs.existsSync(path.posix.join('acts', name, 'index.html')))
  .sort();
const adventures = folders.filter((name) => name !== OFF_POSTER);

assert.ok(fs.existsSync(path.posix.join('acts', OFF_POSTER, 'index.html')), 'the backstage page still exists');
assert.ok(!manifest.some((a) => a.href && a.href.includes(OFF_POSTER)), 'backstage is not advertised as an adventure');

const live = manifest.filter((a) => !a.soon);
const upcoming = manifest.filter((a) => a.soon);
assert.equal(live.length, adventures.length, `${adventures.length} adventure folders vs ${live.length} poster entries`);
assert.equal(upcoming.length, 1, 'exactly one "coming soon" card');
assert.equal(manifest[manifest.length - 1], upcoming[0], 'the coming-soon card sits at the end of the manifest');

// Every adventure folder has exactly one poster entry, pointing at its page.
const byFolder = new Map();
for (const entry of live) {
  assert.equal(typeof entry.num, 'string', `entry ${entry.num} has a number`);
  assert.match(entry.num, /^\d{2}$/, `entry number ${entry.num} is two digits`);
  const href = String(entry.href || '');
  assert.match(href, /^acts\/(\d{2}-[a-z0-9-]+)\/index\.html$/, `${entry.num} links to an act page`);
  const folder = href.split('/')[1];
  assert.ok(!byFolder.has(folder), `${folder} is listed twice on the poster`);
  byFolder.set(folder, entry);
  assert.ok(fs.existsSync(href), `${href} exists on disk`);
  assert.equal(entry.num, folder.slice(0, 2), `${folder} is numbered ${folder.slice(0, 2)}, not ${entry.num}`);
  assert.ok(String(entry.title || '').trim(), `${folder} has a title`);
  assert.ok(String(entry.blurb || '').trim(), `${folder} has a blurb`);
  assert.ok(String(entry.icon || '').trim(), `${folder} has an icon`);
}

assert.deepEqual([...byFolder.keys()].sort(), adventures, 'one poster entry per adventure folder');

// Numbers are unique and the board is ordered by act number.
// Copy out of the vm realm: strict deep-equality compares array prototypes.
const nums = Array.from(live, (a) => String(a.num));
assert.deepEqual([...nums].sort(), nums, 'poster entries are sorted by act number');
assert.equal(new Set(nums).size, nums.length, 'act numbers are unique');
assert.deepEqual(adventures.map((f) => f.slice(0, 2)).sort(), nums.slice().sort(), 'folder prefixes match act numbers');

// The README bullet list describes the same acts, in the same order.
const readme = fs.readFileSync('README.md', 'utf8');
const listed = [...readme.matchAll(/^\s+- `(\d{2}-[a-z0-9-]+)\/`:/gm)].map((m) => m[1]);
assert.equal(listed.length, adventures.length, `README lists ${listed.length} acts, disk has ${adventures.length}`);
assert.deepEqual(listed, adventures, 'the README lists every act once, in act order');
assert.equal(new Set(listed).size, listed.length, 'the README has no duplicate act bullets');

console.log(`roster.test.cjs: ${adventures.length} acts agree across acts/, adventures.js and README.md`);
