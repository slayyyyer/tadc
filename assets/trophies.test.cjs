// Runs from the repo root: node assets/trophies.test.cjs
// The Trophy Case is the only place a visitor's progress is shown back to them, so its
// data table, snapshot arithmetic, medals and dialog rendering are all pinned here.
const assert = require('node:assert/strict');
const fs = require('node:fs');
const vm = require('node:vm');

const manifestContext = { window: {} };
vm.runInNewContext(fs.readFileSync('assets/adventures.js', 'utf8'), manifestContext);
const acts = JSON.parse(JSON.stringify(manifestContext.window.CIRCUS_ADVENTURES));

function store(initial = {}) {
  const map = new Map(Object.entries(initial).map(([k, v]) => [k, JSON.stringify(v)]));
  return {
    map,
    getItem: (k) => (map.has(k) ? map.get(k) : null),
    setItem: (k, v) => map.set(k, String(v)),
    removeItem: (k) => map.delete(k),
  };
}

class El {
  constructor(id = '') {
    this.id = id; this.children = []; this.attrs = {}; this.style = {}; this.textContent = '';
    this._html = ''; this.className = ''; this.handlers = {}; this.q = {};
    this.open = false; this.focused = false;
    this.classList = {
      _set: new Set(),
      add: (...c) => c.forEach((x) => this.classList._set.add(x)),
      remove: (...c) => c.forEach((x) => this.classList._set.delete(x)),
      toggle: (cls, on) => { (on === undefined ? !this.classList._set.has(cls) : on) ? this.classList._set.add(cls) : this.classList._set.delete(cls); },
      contains: (cls) => this.classList._set.has(cls),
    };
  }
  set innerHTML(v) {
    this._html = v;
    for (const m of v.matchAll(/class="([^"]+)"/g)) {
      for (const cls of m[1].split(/\s+/)) {
        if (!this.children.some((c) => c.className === cls)) { const e = new El(); e.className = cls; this.children.push(e); }
      }
    }
  }
  get innerHTML() { return this._html; }
  appendChild(c) { this.children.push(c); if (c.id && this.owner) this.owner[c.id] = c; return c; }
  prepend(c) { this.children.unshift(c); }
  after(c) { this.afterNode = c; }
  setAttribute(k, v) { this.attrs[k] = v; }
  addEventListener(name, fn) { this.handlers[name] = fn; }
  find(cls) {
    for (const c of this.children) {
      if (String(c.className).split(/\s+/).includes(cls)) return c;
      const nested = c.find(cls);
      if (nested) return nested;
    }
    return null;
  }
  querySelector(sel) { return this.find(sel.replace(/^\./, '')); }
  querySelectorAll() { return []; }
  focus() { this.focused = true; }
  showModal() { this.open = true; }
  close() { this.open = false; this.handlers.close?.(); }
}

function load({ data = {}, dom = null } = {}) {
  const storage = store(data);
  const context = {
    window: { CIRCUS_ADVENTURES: acts },
    localStorage: storage,
    document: dom || { readyState: 'loading', addEventListener() {}, getElementById() { return null; } },
    console,
  };
  vm.createContext(context);
  vm.runInContext(fs.readFileSync('assets/trophies.js', 'utf8'), context);
  return { T: context.window.CircusTrophies, storage };
}

// ── table shape ──
const { T } = load();
assert.ok(Array.isArray(T.RECORDS) && T.RECORDS.length >= 20, 'record table exists');
assert.ok(Array.isArray(T.MEDALS) && T.MEDALS.length >= 20, 'medal table exists');
assert.equal(new Set(T.RECORDS.map((r) => r.num)).size, T.RECORDS.length, 'record numbers are unique');
assert.equal(new Set(T.RECORDS.map((r) => r.key)).size, T.RECORDS.length, 'record keys are unique');
const liveNums = acts.filter((a) => !a.soon).map((a) => a.num);
for (const row of T.RECORDS) assert.ok(liveNums.includes(row.num), `record ${row.num} belongs to a live act`);

// ── formatters: null when unplayed, text when played ──
for (const row of T.RECORDS) {
  assert.equal(row.show(null), null, `${row.num} renders nothing for null`);
  assert.equal(row.show({}), null, `${row.num} renders nothing for empty storage`);
}
const byNum = Object.fromEntries(T.RECORDS.map((r) => [r.num, r]));
assert.match(byNum['22'].show({ repaired: 3, best: 9 }), /3 ribbons repaired · fewest turns: 9/);
assert.match(byNum['25'].show({ endings: ['A', 'B'] }), /2 \/ 4 endings found/);
assert.match(byNum['28'].show({ games: 1, best: 51 }), /best: 50 \/ 50 pins/, 'pins are clamped to the alley');
assert.match(byNum['33'].show({ shows: 1, best: 16 }), /1 audition · best: 16 \/ 16 hearts/);
assert.match(byNum['32'].show(6.25), /Tallest fort: 6\.3 m/);

// ── snapshot arithmetic ──
const visited = load({ data: { 'tadc-passport-v1': { '01-find-the-exit': 1, '02-abstraction-meter': 1 } } });
const snap = visited.T.snapshot();
assert.equal(snap.acts.filter((a) => !a.soon).length, liveNums.length, 'snapshot counts live acts');
assert.equal(snap.visited, 2, 'passport stamps become the visited count');
assert.equal(snap.scenes, 0, 'no scenes seen yet');
assert.equal(snap.sceneTotal, 24, 'scene total falls back to 24 without the scene engine');

assert.equal(load({ data: { 'tadc-scenes-seen-v1': ['a', 'b', 'c'] } }).T.snapshot().scenes, 3);

const allFolders = Object.fromEntries(acts.filter((a) => !a.soon).map((a) => [a.href.split('/')[1], 1]));
assert.equal(load({ data: { 'tadc-passport-v1': allFolders } }).T.snapshot().visited, liveNums.length, 'every folder can be stamped');

// ── medals ──
const liveActs = acts.filter((a) => !a.soon);
const earnedNames = (s) => T.MEDALS.filter((m) => { try { return m[3](s); } catch (e) { return false; } }).map((m) => m[1]);
const none = earnedNames({ acts: [], visited: 0, scenes: 0, sceneTotal: 24, raw: {} });
for (const name of ['First Stamp', 'Half the Tent', 'Seen It All', 'Door Diver', 'Standing Ovation']) {
  assert.ok(!none.includes(name), `${name} is locked with no progress`);
}
const firstStamp = earnedNames({ acts: liveActs, visited: 1, scenes: 0, sceneTotal: 24, raw: {} });
assert.ok(firstStamp.includes('First Stamp'), 'one stamp earns First Stamp');
assert.ok(!firstStamp.includes('Half the Tent'), 'one stamp is not half the tent');
assert.ok(earnedNames({ acts: liveActs, visited: Math.ceil(liveNums.length / 2), scenes: 0, sceneTotal: 24, raw: {} }).includes('Half the Tent'));
const everything = earnedNames({ acts: liveActs, visited: liveNums.length, scenes: 24, sceneTotal: 24, raw: {} });
assert.ok(everything.includes('Seen It All') && everything.includes('Season Pass'));

const rawMedal = (num, value) => earnedNames({ acts: liveActs, visited: 0, scenes: 0, sceneTotal: 24, raw: { [num]: value } });
assert.ok(!rawMedal('01', 4).includes('Door Diver'));
assert.ok(rawMedal('01', 5).includes('Door Diver'));
assert.ok(!rawMedal('21', { bestStreak: 2 }).includes('Word Glutton'));
assert.ok(rawMedal('21', { bestStreak: 3 }).includes('Word Glutton'));
assert.ok(!rawMedal('33', { shows: 1, best: 15 }).includes('Standing Ovation'), '15 hearts is not a full house');
assert.ok(rawMedal('33', { shows: 1, best: 16 }).includes('Standing Ovation'));

// the mystery medals read the live TADC.mystery API, not storage
const withMystery = (count, solved) => {
  const ctx = {
    window: { CIRCUS_ADVENTURES: acts, TADC: { mystery: { count: () => count, solved: () => solved } } },
    localStorage: store(),
    document: { readyState: 'loading', addEventListener() {}, getElementById() { return null; } },
    console,
  };
  vm.createContext(ctx);
  vm.runInContext(fs.readFileSync('assets/trophies.js', 'utf8'), ctx);
  const s = ctx.window.CircusTrophies.snapshot();
  return ctx.window.CircusTrophies.MEDALS.filter((m) => { try { return m[3](s); } catch (e) { return false; } }).map((m) => m[1]);
};
assert.ok(!withMystery(3, false).includes('Ticket Collector'));
assert.ok(withMystery(4, false).includes('Ticket Collector'));
assert.ok(!withMystery(8, false).includes('Case Closed'));
assert.ok(withMystery(8, true).includes('Case Closed'));

// ── mount + render ──
const els = {};
const doc = {
  readyState: 'complete',
  head: new El('head'),
  body: new El('body'),
  getElementById: (id) => els[id] || null,
  createElement: () => new El(),
  addEventListener() {},
};
doc.body.owner = els;
els.passport = new El('passport');
els.adventuresBtn = new El('adventuresBtn');
const mounted = load({ dom: doc, data: { 'tadc-passport-v1': { '01-find-the-exit': 1 }, 'tadc-audition-v1': { shows: 2, best: 16 } } });
assert.ok(doc.head.children.some((c) => String(c.textContent).includes('#trophyOpen')), 'styles are injected');

const button = els.passport.afterNode;
assert.ok(button && button.id === 'trophyOpen', 'a Trophy Case button is added after the passport line');
assert.match(button.textContent, new RegExp(`Trophy Case · \\d+/${mounted.T.MEDALS.length} medals`));
button.handlers.click({ stopPropagation() {} });

const dialog = els.trophyCase;
assert.ok(dialog && dialog.open, 'the dialog opens on click');
const html = dialog.querySelector('.tc-body').innerHTML;
assert.ok(/Passport 1\/\d+/.test(html), 'summary shows the passport count');
assert.ok(html.includes('Medals '), 'summary shows the medal count');
assert.equal((html.match(/class="medal/g) || []).length, mounted.T.MEDALS.length, 'every medal is drawn');
assert.ok(html.includes('not played yet'), 'unplayed acts say so');
assert.ok(html.includes('2 auditions · best: 16 / 16 hearts'), 'act 33 record is rendered');
assert.equal((html.match(/<li>/g) || []).length, mounted.T.RECORDS.length, 'one row per record');
assert.ok(html.includes('Nothing is sent anywhere'), 'the privacy note is shown');

dialog.handlers.close();
assert.equal(button.focused, true, 'focus returns to the button when the dialog closes');

console.log(`PASS: ${mounted.T.RECORDS.length} records, ${mounted.T.MEDALS.length} medals, snapshot arithmetic, thresholds, mystery medals and dialog rendering.`);
