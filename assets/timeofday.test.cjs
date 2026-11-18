// Runs from the repo root: node assets/timeofday.test.cjs
// The tent's clock decides the mood, the decorations and Caine's "welcome back" recap.
// Every branch is reachable through the documented ?tod/?dow/?month/?hour overrides,
// so each one is pinned here without waiting for a real calendar.
const assert = require('node:assert/strict');
const fs = require('node:fs');
const vm = require('node:vm');

const src = fs.readFileSync('assets/timeofday.js', 'utf8');

class El {
  constructor(id = '') {
    this.id = id; this.children = []; this.attrs = {}; this.textContent = ''; this._html = '';
    this.style = { setProperty(k, v) { this[k] = v; } };
    this.parentNode = null;
    this.classList = {
      _set: new Set(),
      add: (...c) => c.forEach((x) => this.classList._set.add(x)),
      remove: (...c) => c.forEach((x) => this.classList._set.delete(x)),
      toggle: (c, on) => { (on === undefined ? !this.classList._set.has(c) : on) ? this.classList._set.add(c) : this.classList._set.delete(c); },
      contains: (c) => this.classList._set.has(c),
    };
  }
  set innerHTML(v) { this._html = v; } get innerHTML() { return this._html; }
  appendChild(c) { c.parentNode = this; this.children.push(c); return c; }
  prepend(c) { c.parentNode = this; this.children.unshift(c); }
  insertBefore(c) { c.parentNode = this; this.children.push(c); return c; }
  setAttribute(k, v) { this.attrs[k] = v; }
  querySelector() { return null; }
  querySelectorAll() { return []; }
}

function fakeDate(isoNow) {
  const base = new Date(isoNow);
  return class {
    constructor() { this._d = new Date(base.getTime()); }
    getHours() { return this._d.getHours(); }
    getDay() { return this._d.getDay(); }
    getMonth() { return this._d.getMonth(); }
    static now() { return base.getTime(); }
  };
}

const pad = (n) => String(n).padStart(2, '0');
const isoAt = (d, hour) => `${d.getFullYear()}-${pad(d.getMonth() + 1)}-${pad(d.getDate())}T${pad(hour)}:00:00`;
function weekdayIn(monthIdx, weekday, hour = 9) {
  const d = new Date(2026, monthIdx, 1, hour, 0, 0);
  while (d.getDay() !== weekday) d.setDate(d.getDate() + 1);
  return d;
}

function load(search, isoNow, { savedVisit = null, ready = true } = {}) {
  const els = {};
  const made = [];
  const visits = [];
  const body = new El('body');
  body.insertBefore = (node) => { body.children.push(node); return node; };
  for (const id of ['stage', 'tent', 'caine', 'kinger', 'bubble']) {
    els[id] = new El(id);
    els[id].parentNode = body;
  }
  const doc = {
    readyState: ready ? 'complete' : 'loading',
    body,
    head: { children: [], appendChild(c) { this.children.push(c); } },
    hidden: false,
    createElement: () => { const e = new El(); made.push(e); return e; },
    getElementById: (id) => els[id] || null,
    addEventListener() {},
    querySelector: () => null,
  };
  const context = {
    window: { TADC: { say() { return {}; }, confetti() {}, sfx() {} } },
    document: doc,
    localStorage: {
      getItem: (k) => (k === 'tadc-lastvisit-v1' && savedVisit !== null ? String(savedVisit) : null),
      setItem: (k, v) => { if (k === 'tadc-lastvisit-v1') visits.push(Number(v)); },
    },
    location: { search },
    URLSearchParams,
    Date: fakeDate(isoNow),
    setTimeout: () => 0,
    clearTimeout: () => {},
    addEventListener() {},
    console,
  };
  vm.createContext(context);
  vm.runInContext(src, context);
  return { time: context.window.CircusTime, els, doc, body, made, visits };
}

const morningIso = '2026-06-10T09:00:00';

// ── clock: tod overrides ──
const morning = load('?tod=morning', morningIso, { ready: false });
assert.equal(morning.time.period, 'morning');
assert.equal(morning.time.hour, 9, 'a tod override uses its representative hour');
assert.equal(morning.time.mounted, undefined, 'mount waits for the DOM');
assert.equal(load('?tod=night', morningIso, { ready: false }).time.hour, 22);
assert.equal(load('?tod=evening', morningIso, { ready: false }).time.hour, 18);
assert.equal(load('?tod=afternoon', morningIso, { ready: false }).time.hour, 15);

// an unknown tod is ignored; the real hour decides
assert.equal(load('?tod=lunch', morningIso, { ready: false }).time.period, 'morning');
for (const [hour, period] of [[7, 'morning'], [13, 'afternoon'], [18, 'evening'], [23, 'night'], [3, 'night'], [6, 'morning'], [12, 'afternoon'], [17, 'evening'], [20, 'night']]) {
  assert.equal(load('', `2026-06-10T${pad(hour)}:30:00`, { ready: false }).time.period, period, `hour ${hour} is ${period}`);
}

// tod + hour together, and hour alone
const combo = load('?tod=morning&hour=3', morningIso, { ready: false });
assert.equal(combo.time.period, 'morning', 'an explicit tod keeps its period');
assert.equal(combo.time.hour, 3, 'while the hour override still applies');
const hourOnly = load('?hour=3', morningIso, { ready: false });
assert.equal(hourOnly.time.period, 'night', 'an hour alone re-derives the period');
assert.equal(load('?hour=99', morningIso, { ready: false }).time.hour, 9, 'an out-of-range hour is ignored');
assert.equal(load('?hour=abc', morningIso, { ready: false }).time.hour, 9);

// day and month overrides, including invalid values
const wednesday = weekdayIn(5, 3);
const wedIso = isoAt(wednesday, 9);
assert.equal(load('?dow=7&month=12', wedIso, { ready: false }).time.dow, 7);
assert.equal(load('?dow=7&month=12', wedIso, { ready: false }).time.month, 12);
assert.equal(load('?dow=9&month=13', wedIso, { ready: false }).time.dow, wednesday.getDay() || 7, 'invalid dow falls back');
assert.equal(load('?dow=9&month=13', wedIso, { ready: false }).time.month, wednesday.getMonth() + 1, 'invalid month falls back');
assert.equal(load('?month=0', wedIso, { ready: false }).time.month, wednesday.getMonth() + 1);
assert.equal(load('?dow=0', wedIso, { ready: false }).time.dow, wednesday.getDay() || 7);

// ── mount: classes and decorations ──
// A recent last-visit keeps Caine's welcome/recap out of the applied log we assert on.
const recentVisit = new Date(morningIso).getTime() - 5 * 60000;
const afternoon = load('?tod=afternoon&dow=3&month=6', morningIso, { savedVisit: recentVisit });
assert.equal(afternoon.time.mounted, true);
assert.ok(afternoon.body.classList.contains('tod-afternoon'));
assert.ok(afternoon.body.classList.contains('dow-3'));
assert.ok(afternoon.body.classList.contains('month-6'));
assert.deepEqual(Array.from(afternoon.time.applied), ['tod-afternoon', 'dow-3', 'month-6'], 'afternoon needs no mood overlay');
assert.equal(afternoon.made.some((e) => e.id === 'todMood'), false, 'no overlay in daylight');

const night = load('?tod=night&dow=3&month=6', morningIso, { savedVisit: recentVisit });
assert.deepEqual(Array.from(night.time.applied),
  ['tod-night', 'dow-3', 'month-6', 'mood-night', 'night-zzz', 'night-lantern']);
assert.ok(night.made.some((e) => e.id === 'todMood'), 'night adds the mood overlay');
assert.equal(night.els.kinger.children.length, 1, 'Kinger sleeps at night');
assert.equal(night.els.bubble.children.length, 1, 'Bubble sleeps at night');
assert.equal(night.els.caine.children.length, 1, 'Caine gets a lantern');

const october = load('?tod=afternoon&dow=3&month=10', morningIso, { savedVisit: recentVisit });
assert.ok(october.time.applied.includes('october-pumpkins'));
assert.equal(october.els.tent.children.length, 1, 'pumpkins hang on the tent');
assert.equal(october.els.tent.children[0].children.length, 7, 'every third bulb gets one');

const december = load('?tod=afternoon&dow=3&month=12', morningIso, { savedVisit: recentVisit });
assert.ok(december.time.applied.includes('december-snow'));
const snow = december.made.find((e) => e.id === 'todSnow');
assert.ok(snow && snow.children.length === 22, 'snow has flakes');

// ── weekday events ──
const monday = load('?tod=morning&dow=1&month=6', morningIso, { savedVisit: recentVisit });
assert.ok(monday.time.applied.includes('monday-reboot'), 'Monday morning reboots Caine');
const mondayEvening = load('?tod=evening&dow=1&month=6', morningIso, { savedVisit: recentVisit });
assert.ok(!mondayEvening.time.applied.includes('monday-reboot'), 'Monday evening does not');

const fridayLate = load('?tod=evening&dow=5&month=6', morningIso, { savedVisit: recentVisit });
assert.ok(fridayLate.time.applied.includes('friday-finale'), 'Friday evening throws the finale');
const fridayMorning = load('?tod=morning&dow=5&month=6', morningIso, { savedVisit: recentVisit });
assert.ok(!fridayMorning.time.applied.includes('friday-finale'), 'Friday morning is not the finale');

// ── last-visit recap ──
const firstVisit = load('?tod=afternoon&dow=3&month=6', morningIso);
assert.ok(firstVisit.time.applied.includes('welcome'), 'a first visit gets the welcome');
assert.equal(firstVisit.visits.length, 1, 'the visit is stamped once');

const now = new Date(morningIso).getTime();
const returning = load('?tod=afternoon&dow=3&month=6', morningIso, { savedVisit: now - 45 * 60000 });
assert.ok(returning.time.applied.includes('recap'), 'a long absence gets a recap');
assert.equal(Math.round(returning.time.awayMs / 60000), 45, 'the absence is measured');

const brief = load('?tod=afternoon&dow=3&month=6', morningIso, { savedVisit: now - 5 * 60000 });
assert.ok(!brief.time.applied.includes('recap'), 'a short absence is not worth a recap');
assert.ok(!brief.time.applied.includes('welcome'), 'and it is not a first visit');

console.log('PASS: period boundaries, tod/hour/dow/month overrides, night and holiday decorations, Monday reboot, Friday finale, welcome and recap.');
