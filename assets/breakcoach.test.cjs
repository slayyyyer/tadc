// Runs from the repo root: node assets/breakcoach.test.cjs
// The break coach owns the timer contract every act reads, so the storage schema,
// the suggestion filter and the pill/nudge states are all checked here.
const assert = require('node:assert/strict');
const fs = require('node:fs');
const vm = require('node:vm');

const manifestContext = { window: {} };
vm.runInNewContext(fs.readFileSync('assets/adventures.js', 'utf8'), manifestContext);
const acts = JSON.parse(JSON.stringify(manifestContext.window.CIRCUS_ADVENTURES));

class El {
  constructor(id = '') {
    this.id = id; this.children = []; this.attrs = {}; this.style = {}; this.dataset = {};
    this.textContent = ''; this._html = ''; this.className = ''; this.handlers = {}; this.q = {};
    this.hidden = false; this.disabled = false; this.open = false; this.focused = false;
    this.classList = {
      _set: new Set(),
      add: (...c) => c.forEach((x) => this.classList._set.add(x)),
      remove: (...c) => c.forEach((x) => this.classList._set.delete(x)),
      toggle: (c, on) => { (on === undefined ? !this.classList._set.has(c) : on) ? this.classList._set.add(c) : this.classList._set.delete(c); },
      contains: (c) => this.classList._set.has(c),
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
  prepend(c) { this.children.unshift(c); if (c.id && this.owner) this.owner[c.id] = c; }
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
    if (sel.includes('bc-choices')) return this.choices()[0];
    return this.find(sel.replace(/^\./, ''));
  }
  choices() {
    return this._choices || (this._choices = [2, 5, 10, 15, 30].map((m) => { const b = new El(); b.dataset = { min: String(m) }; return b; }));
  }
  querySelectorAll(sel) { return sel.includes('bc-choices') ? this.choices() : []; }
  contains() { return false; }
  focus() { this.focused = true; }
  showModal() { this.open = true; }
  close() { this.open = false; this.handlers.close?.(); }
}

function load({ initial = {}, now = 1_800_000_000_000 } = {}) {
  const map = new Map(Object.entries(initial));
  const els = {};
  const body = new El('body');
  body.owner = els;
  const doc = {
    readyState: 'complete',
    hidden: false,
    body,
    head: { children: [], appendChild(c) { this.children.push(c); } },
    createElement: () => new El(),
    getElementById: (id) => els[id] || null,
    addEventListener() {},
    querySelector: () => null,
  };
  els.stage = new El('stage');
  const context = {
    window: {
      CIRCUS_ADVENTURES: acts,
      TADC: { say() {}, sfx() {}, babble() {}, quiet: { get: () => true }, passport: { has: (href) => href.includes('01-') } },
      CircusCalm: { get: () => true },
      CircusScenes: { active: false },
    },
    document: doc,
    localStorage: {
      getItem: (k) => (map.has(k) ? map.get(k) : null),
      setItem: (k, v) => map.set(k, String(v)),
      removeItem: (k) => map.delete(k),
    },
    Date: class { constructor() { this._t = now; } static now() { return now; } getTime() { return this._t; } },
    setTimeout: () => 0,
    setInterval: () => 1,
    clearTimeout: () => {},
    addEventListener() {},
    console,
  };
  vm.createContext(context);
  vm.runInContext(fs.readFileSync('assets/breakcoach.js', 'utf8'), context);
  return { break: context.window.CircusBreak, els, map, context };
}

// ── the per-act duration table must cover the whole poster ──
const base = load();
for (const act of acts.filter((a) => !a.soon)) {
  const minutes = base.break.DURATIONS[act.num];
  assert.ok(Number.isFinite(minutes) && minutes > 0, `act ${act.num} has a break duration`);
}
assert.equal(base.break.minutesFor({ num: '99' }), 5, 'unknown acts fall back to the default');
assert.equal(base.break.minutesFor({ num: '04' }), base.break.DURATIONS['04']);
assert.deepEqual(Array.from(base.break.CHOICES), [2, 5, 10, 15, 30]);

// ── storage contract: {start, end, minutes} ──
const timer = load();
const started = timer.break.start(10);
assert.equal(started.end - started.start, 600000, 'ten minutes is ten minutes');
const written = JSON.parse(timer.map.get('tadc-break-v1'));
assert.deepEqual(Object.keys(written).sort(), ['end', 'minutes', 'start'], 'only the documented fields are stored');
assert.equal(written.minutes, 10);
assert.equal(JSON.stringify(timer.break.get()), JSON.stringify(written), 'get() returns the stored timer');
assert.equal(timer.map.has('tadc-break-nudged-v1'), false, 'a fresh timer clears the old nudge');

const extended = timer.break.extend(5);
assert.equal(extended.minutes, 15, 'extend adds to the total');
assert.equal(extended.end - written.end, 300000, 'extend adds five minutes to the end');
assert.equal(timer.break.get().minutes, 15);

const fresh = load();
assert.equal(fresh.break.extend(5).minutes, 5, 'extending with no timer starts one');

timer.break.clear();
assert.equal(timer.break.get(), null, 'clear removes the timer');
assert.equal(timer.map.has('tadc-break-v1'), false);

// malformed storage is ignored rather than trusted
for (const bad of ['not json', '[]', '{"start":1}', '{"start":"a","end":2,"minutes":3}']) {
  assert.equal(load({ initial: { 'tadc-break-v1': bad } }).break.get(), null, `malformed timer ignored: ${bad}`);
}

// ── suggestions fit the break and come from the poster ──
const suggester = load();
const live = acts.filter((a) => !a.soon);
for (const minutes of [2, 5, 10, 15, 30]) {
  const picks = suggester.break.suggest(minutes);
  assert.ok(picks.length > 0 && picks.length <= 3, `a ${minutes} minute break offers one to three acts`);
  for (const act of picks) {
    assert.ok(live.includes(act), 'suggestions come from the live poster');
    assert.ok(suggester.break.minutesFor(act) <= minutes, `a ${minutes} minute break never suggests a longer act`);
  }
  assert.equal(new Set(picks.map((a) => a.num)).size, picks.length, 'no duplicate suggestions');
}
assert.equal(suggester.break.suggest(10, 2).length, 2, 'the count argument is honoured');
assert.deepEqual(suggester.break.suggest(2).map((a) => a.num).sort(), ['03', '18'], 'two minutes only fits the shortest acts');

// ── pill states ──
const idle = load();
const pill = idle.els.breakPill;
assert.ok(pill, 'the break pill is mounted');
assert.equal(pill.textContent, '⏱️ Break');
assert.equal(pill.attrs['aria-label'], 'Plan a break');
assert.equal(idle.els.breakNudge.hidden, true, 'no nudge without a finished timer');

const running = load({ initial: { 'tadc-break-v1': JSON.stringify({ start: 1, end: 1_800_000_090_000, minutes: 10 }) } });
assert.equal(running.els.breakPill.textContent, '⏱️ 1:30', 'the pill counts down');
assert.ok(running.els.breakPill.classList.contains('running'));
assert.match(running.els.breakPill.attrs['aria-label'], /1 minutes 30 seconds left/);

const overdue = load({ initial: { 'tadc-break-v1': JSON.stringify({ start: 1, end: 1_799_999_000_000, minutes: 10 }) } });
assert.equal(overdue.els.breakPill.textContent, '⏱️ 0:00');
assert.ok(overdue.els.breakPill.classList.contains('over'));
assert.equal(overdue.els.breakNudge.hidden, false, 'a finished timer shows the nudge');
assert.equal(overdue.map.get('tadc-break-nudged-v1'), '1799999000000', 'the nudge is recorded once');

// ── dialog ──
const dialogRun = load();
dialogRun.break.open();
const dialog = dialogRun.els.breakCoach;
assert.ok(dialog && dialog.open, 'the dialog opens');
assert.equal(dialogRun.els.breakPill.attrs['aria-controls'], 'breakCoach');
const choices = dialog.choices();
assert.equal(choices.length, 5);
assert.equal(choices.find((b) => b.attrs['aria-pressed'] === 'true').dataset.min, '5', 'five minutes is preselected');
assert.match(dialog.querySelector('.bc-line').textContent, /./, 'Caine pitches the chosen length');
assert.match(dialog.querySelector('.bc-list').innerHTML, /data-num=/, 'suggested acts are listed');
assert.match(dialog.querySelector('.bc-start').textContent, /Start timer: 5 min/);

choices[3].handlers.click(); // 15 minutes
assert.equal(choices[3].attrs['aria-pressed'], 'true');
dialog.querySelector('.bc-start').handlers.click();
assert.equal(dialog.open, false, 'starting closes the dialog');
assert.equal(JSON.parse(dialogRun.map.get('tadc-break-v1')).minutes, 15, 'the chosen length is started');
assert.match(dialogRun.els.breakPill.textContent, /^⏱️ /, 'the pill picks up the new timer');

console.log(`PASS: ${Object.keys(base.break.DURATIONS).length} act durations, timer schema/extend/clear, malformed storage, suggestion fit, pill countdown and overdue nudge, dialog start.`);
