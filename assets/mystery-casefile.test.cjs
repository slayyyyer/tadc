// Runs from the repo root: node assets/mystery-casefile.test.cjs
// The case file is the payoff of the whole stub hunt: the EXIT sign evolves, the letters
// spell out, and the password opens the backstage. Its two exports are pinned here.
const assert = require('node:assert/strict');
const fs = require('node:fs');
const vm = require('node:vm');

const manifestContext = { window: {} };
vm.runInNewContext(fs.readFileSync('assets/adventures.js', 'utf8'), manifestContext);
const acts = JSON.parse(JSON.stringify(manifestContext.window.CIRCUS_ADVENTURES));

const LETTERS = ['A', 'U', 'D', 'I', 'E', 'N', 'C', 'E'];
const STUBS = LETTERS.map((letter, i) => ({
  id: `stub-${i + 1}`, n: i + 1, letter, act: ['01', '13', '04', '07', '12', '17', '19', '08'][i],
  where: `Act ${i + 1}`, hint: `hint ${i + 1}`, note: `note ${i + 1}`,
}));

class El {
  constructor(id = '') {
    this.id = id; this.children = []; this.attrs = {}; this.style = {}; this.textContent = '';
    this._html = ''; this.className = ''; this.handlers = {}; this.q = {};
    this.open = false; this.focused = false; this.value = '';
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
  remove() { this.removed = true; }
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
  querySelector(sel) {
    if (sel.startsWith('#')) return this.q[sel] || (this.q[sel] = new El(sel));
    return this.find(sel.replace(/^\./, ''));
  }
  querySelectorAll() { return []; }
  focus() { this.focused = true; }
  select() { this.selected = true; }
  showModal() { this.open = true; }
  close() { this.open = false; this.handlers.close?.(); }
}

function load({ found = [], solved = false } = {}) {
  const els = { exit: new El('exit') };
  const state = { found: Object.fromEntries(found.map((id) => [id, 1])), solved };
  const calls = [];
  const mystery = {
    KEY: 'tadc-mystery-v1',
    STUBS,
    state: () => ({ found: state.found, solved: state.solved }),
    count: () => STUBS.filter((s) => state.found[s.id]).length,
    has: (id) => !!state.found[id],
    solved: () => state.solved,
    solve(word) {
      calls.push(String(word));
      if (String(word).trim().toUpperCase() === 'AUDIENCE') { state.solved = true; return true; }
      return false;
    },
  };
  const location = { href: '' };
  const doc = {
    readyState: 'complete',
    activeElement: null,
    body: Object.assign(new El('body'), { owner: els }),
    head: { children: [], appendChild(c) { this.children.push(c); } },
    createElement: () => new El(),
    getElementById: (id) => els[id] || null,
    addEventListener() {},
    querySelector: () => null,
  };
  const context = {
    window: { CIRCUS_ADVENTURES: acts, TADC: { mystery, sfx() {}, confetti() {} } },
    document: doc,
    location,
    localStorage: { getItem: () => null, setItem() {} },
    setTimeout: (fn) => { fn(); return 0; },
    addEventListener() {},
    innerWidth: 800,
    innerHeight: 600,
    console,
  };
  vm.createContext(context);
  vm.runInContext(fs.readFileSync('assets/mystery-casefile.js', 'utf8'), context);
  return { api: context.window.CircusMystery, els, doc, location, state, calls };
}

// ── exports and mount ──
const base = load();
assert.equal(typeof base.api.open, 'function');
assert.equal(typeof base.api.paintSign, 'function');
assert.equal(base.doc.head.children.length, 1, 'mount injects one style block');

// ── the EXIT sign tracks progress ──
const exit = base.els.exit;
assert.equal(exit.classList.contains('mys-1'), false);
assert.equal(exit.title ?? 'EXIT', 'EXIT');
assert.equal(exit.querySelector('.mys-count'), null, 'no badge before the first stub');

const three = load({ found: ['stub-1', 'stub-2', 'stub-3'] });
const sign = three.els.exit;
assert.ok(sign.classList.contains('mys-1') && sign.classList.contains('mys-3'), 'found stubs light the sign up');
assert.equal(sign.classList.contains('mys-4'), false, 'missing stubs stay dark');
assert.equal(sign.classList.contains('mys-solved'), false);
assert.equal(sign.querySelector('.mys-count').textContent, '🎟️ 3/8');
assert.match(sign.title, /3\/8 ticket stubs found/);

const solvedSign = load({ found: STUBS.map((s) => s.id), solved: true });
assert.ok(solvedSign.els.exit.classList.contains('mys-solved'));
assert.equal(solvedSign.els.exit.querySelector('.mys-count').textContent, '✓ case closed');

// ── a partial case file hides the keyhole ──
const partial = load({ found: ['stub-1', 'stub-4'] });
partial.api.open();
const partialDialog = partial.els.caseFile;
assert.ok(partialDialog, 'the case file is created on first open');
assert.ok(partialDialog.open, 'it opens as a modal');
const partialHtml = partialDialog.querySelector('.cf-body').innerHTML;
assert.equal((partialHtml.match(/<li class="/g) || []).length, 8, 'all eight stubs are listed');
assert.ok(partialHtml.includes('?'), 'missing letters are hidden');
assert.ok(partialHtml.includes('🔒 Find all eight stubs'), 'the keyhole stays locked');
assert.ok(!partialHtml.includes('cfPass'), 'no password box yet');
assert.ok(partialHtml.includes('Last seen near:'), 'missing stubs point at their act');
assert.match(partialHtml, /href="acts\/13-/, 'the act link comes from the manifest');

// ── all stubs found: the keyhole accepts the word ──
const full = load({ found: STUBS.map((s) => s.id) });
full.api.open();
const fullDialog = full.els.caseFile;
const fullHtml = fullDialog.querySelector('.cf-body').innerHTML;
assert.ok(fullHtml.includes('The keyhole is glowing'), 'the password box appears');
assert.ok(!fullHtml.includes('MISSING'), 'nothing is missing');

const input = fullDialog.querySelector('#cfPass');
input.value = 'EXIT';
fullDialog.querySelector('.cf-try').handlers.click();
assert.equal(full.state.solved, false, 'a wrong word does not solve it');
assert.equal(full.location.href, '', 'and does not navigate');
assert.ok(fullDialog.querySelector('.cf-msg').textContent.length > 0, 'it answers with a nudge');
assert.equal(input.selected, true, 'the wrong word is selected for retyping');

input.value = 'audience';
fullDialog.querySelector('.cf-try').handlers.click();
assert.deepEqual(full.calls, ['EXIT', 'audience'], 'the typed word is handed to the engine');
assert.equal(full.state.solved, true, 'the case is solved');
assert.equal(full.location.href, 'acts/00-backstage/index.html', 'the door leads backstage');
assert.equal(full.els.exit.querySelector('.mys-count').textContent, '✓ case closed', 'the sign updates immediately');

// ── an already-solved case offers the door ──
const solved = load({ found: STUBS.map((s) => s.id), solved: true });
solved.api.open();
const solvedHtml = solved.els.caseFile.querySelector('.cf-body').innerHTML;
assert.ok(solvedHtml.includes('The keyhole is already open'), 'solved state is acknowledged');
assert.ok(!solvedHtml.includes('cfPass'), 'no password needed twice');
assert.ok(solvedHtml.includes('Return backstage'), 'the door is offered');

console.log('PASS: sign evolution, missing/found stubs, locked keyhole, wrong and right password, solved state and backstage redirect.');
