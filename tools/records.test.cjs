// Runs from the repo root: node tools/records.test.cjs
// The Trophy Case reads one localStorage key per act. That only works if some act
// actually writes the key, in the act the row claims. This test guards both directions
// so a row can never point at storage nobody fills (the state acts 22–31 shipped in).
const assert = require('node:assert/strict');
const fs = require('node:fs');
const vm = require('node:vm');

// ── the manifest, so "this act exists" means something ──
const manifestContext = { window: {} };
vm.runInNewContext(fs.readFileSync('assets/adventures.js', 'utf8'), manifestContext);
const live = manifestContext.window.CIRCUS_ADVENTURES.filter((a) => !a.soon);

// ── the trophy definitions (mount is inert with readyState "loading") ──
const trophyContext = {
  window: { CIRCUS_ADVENTURES: live },
  localStorage: { getItem: () => null, setItem() {} },
  document: { readyState: 'loading', addEventListener() {}, getElementById() { return null; } },
};
vm.createContext(trophyContext);
vm.runInContext(fs.readFileSync('assets/trophies.js', 'utf8'), trophyContext);
const { RECORDS, MEDALS } = trophyContext.window.CircusTrophies;

assert.ok(Array.isArray(RECORDS) && RECORDS.length > 10, 'the record table parsed');

// ── every act page's source, grouped by act folder ──
const folders = fs.readdirSync('acts', { withFileTypes: true })
  .filter((e) => e.isDirectory() && fs.existsSync(`acts/${e.name}/index.html`))
  .map((e) => e.name);
const byFolder = new Map();
const allSource = [];
for (const folder of folders) {
  const texts = [];
  for (const file of fs.readdirSync(`acts/${folder}`)) {
    if (/\.(html|js)$/.test(file)) texts.push(fs.readFileSync(`acts/${folder}/${file}`, 'utf8'));
  }
  const text = texts.join('\n');
  byFolder.set(folder, text);
  allSource.push(text);
}
const everything = allSource.join('\n');

const problems = [];
for (const row of RECORDS) {
  assert.match(row.num, /^\d{2}$/, `record number ${row.num} is two digits`);
  assert.match(row.key, /^tadc-[a-z0-9-]+$/, `record ${row.num} uses a tadc- storage key`);
  assert.equal(typeof row.show, 'function', `record ${row.num} has a show() formatter`);

  const act = live.find((a) => a.num === row.num);
  if (!act) problems.push(`${row.num}: no live act on the poster`);
  else {
    const folder = act.href.split('/')[1];
    if (!byFolder.has(folder)) problems.push(`${row.num}: folder ${folder} is missing`);
    else if (!byFolder.get(folder).includes(row.key)) {
      problems.push(`${row.num}: ${row.key} is not written anywhere in acts/${folder}/`);
    }
  }
  if (!everything.includes(row.key)) problems.push(`${row.num}: ${row.key} is written by no act at all`);
}
assert.deepEqual(problems, [], `records without a writer:\n  ${problems.join('\n  ')}`);

// Unique numbers and keys, so two rows cannot silently share one source of truth.
assert.equal(new Set(RECORDS.map((r) => r.num)).size, RECORDS.length, 'record numbers are unique');
assert.equal(new Set(RECORDS.map((r) => r.key)).size, RECORDS.length, 'record keys are unique');

// ── medals must hang off a record that exists ──
const referenced = new Set();
for (const medal of MEDALS) {
  const source = String(medal[3]);
  for (const match of source.matchAll(/s\.raw\['(\d{2})'\]/g)) referenced.add(match[1]);
}
const orphaned = [...referenced].filter((num) => !RECORDS.some((r) => r.num === num));
assert.deepEqual(orphaned, [], `medals read records that do not exist: ${orphaned.join(', ')}`);

// ── every record's formatter survives empty and populated data ──
for (const row of RECORDS) {
  assert.equal(row.show(null), null, `record ${row.num} shows nothing when unplayed`);
  assert.equal(row.show({}), null, `record ${row.num} shows nothing for empty storage`);
}

console.log(`records.test.cjs: ${RECORDS.length} records each written by their own act, ${MEDALS.length} medals wired to real records`);
