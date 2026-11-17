// Runs from the repo root: node assets/bulletin-board.test.cjs
// A minimal DOM exercise the self-mounting board against the shipped notes,
// with no browser and no dependencies.
const assert = require('node:assert/strict');
const fs = require('node:fs');
const vm = require('node:vm');

const BOARD = fs.readFileSync('assets/bulletin-board.js', 'utf8');
const DATA = fs.readFileSync('assets/bulletin.js', 'utf8');
const STATUSES = new Set(['CLAIM', 'HANDOFF', 'DONE', 'ACK', 'DEBUT', 'BLOCKED']);
const STAMPS = { CLAIM: 'CLAIMED', HANDOFF: 'HANDOFF', DONE: 'DONE ✓', ACK: 'ACK', DEBUT: 'DEBUT', BLOCKED: 'BLOCKED' };

function mountBoard(notes) {
  const created = [];
  class Element {
    constructor(tag) {
      this.tag = tag; this.className = ''; this.children = []; this.attrs = {};
      this.dataset = {}; this.events = {}; this.id = ''; this.hidden = false; this.text = '';
      this.style = { setProperty(key, value) { this[key] = value; } };
      const classes = new Set();
      this.classList = {
        add: (c) => classes.add(c), remove: (c) => classes.delete(c), contains: (c) => classes.has(c),
        toggle: (c, on) => (on ? classes.add(c) : classes.delete(c)),
      };
      created.push(this);
    }
    set textContent(value) { this.text = String(value); }
    get textContent() { return this.text; }
    setAttribute(key, value) { this.attrs[key] = String(value); }
    append(...nodes) { nodes.forEach((n) => this.children.push(n)); }
    appendChild(node) { this.children.push(node); return node; }
    after(node) { this.afterNode = node; }
    addEventListener(name, fn) { this.events[name] = fn; }
    querySelectorAll(selector) {
      const cls = selector.replace('.', '');
      return this.children.filter((c) => String(c.className).split(/\s+/).includes(cls));
    }
    focus() {}
    scrollIntoView() {}
    get offsetWidth() { return 100; }
  }

  const anchor = new Element('div');
  const document = {
    readyState: 'complete',
    head: new Element('head'),
    body: new Element('body'),
    createElement: (tag) => new Element(tag),
    createTextNode: (text) => ({ text: String(text) }),
    getElementById: (id) => (id === 'trophyOpen' ? anchor : null),
    addEventListener() {},
  };
  const window = { document, matchMedia: () => ({ matches: false }), addEventListener() {} };
  window.CIRCUS_BULLETIN = notes;

  vm.runInNewContext(BOARD, { window, document, console, setTimeout, clearTimeout });

  const cards = created.filter((e) => String(e.className).split(/\s+/).includes('bb-card'));
  const chips = created.filter((e) => String(e.className).split(/\s+/).includes('bb-chip'));
  const text = (e) => e.text;
  const visible = () => cards.filter((c) => !c.hidden).length;
  const chip = (key) => chips.find((c) => c.dataset.filter === key);
  const click = (key) => chip(key).events.click();
  return { notes, created, cards, chips, anchor, text, visible, chip, click, allText: created.map((e) => e.textContent).join(' | ') };
}

// 1) The shipped data is well-formed and in-world.
const shipped = (() => {
  const sandbox = { window: {} };
  vm.runInNewContext(DATA, sandbox);
  return sandbox.window.CIRCUS_BULLETIN;
})();
assert.ok(Array.isArray(shipped) && shipped.length >= 8, 'the board has a useful number of notes');

const ids = new Set();
for (const note of shipped) {
  assert.ok(note.id && !ids.has(note.id), `unique note id: ${note.id}`);
  ids.add(note.id);
  assert.ok(note.from && note.from !== 'Claude' && note.from !== 'GPT', 'every note is written by a cast member');
  assert.ok(note.to, `${note.id} is addressed to someone`);
  assert.ok(note.title && note.label && note.title.endsWith(note.label), `${note.id} label matches its title`);
  assert.ok(/^\d{4}-\d{2}-\d{2}$/.test(note.date), `${note.id} has an ISO date`);
  assert.ok(STATUSES.has(note.status), `${note.id} uses a known status: ${note.status}`);
  assert.ok(!/Claude|Codex|GPT/.test(JSON.stringify(note)), `${note.id} has no former agent wording`);
}
for (const note of shipped) {
  if (note.replyTo) assert.ok(ids.has(note.replyTo), `${note.id} replies to a note that exists`);
}

// 2) The board mounts one pinned card per note, plus its open button.
const board = mountBoard(shipped);
assert.equal(board.cards.length, shipped.length, 'a card for every note');
assert.equal(board.anchor.afterNode.id, 'bulletinOpen', 'the open button is inserted after the trophy anchor');
assert.ok(/Claude|Codex|GPT/.test(board.allText) === false, 'nothing on the board mentions the old agent workflow');
assert.equal(board.chips[0].text, 'All', 'the first chip is the unfiltered view');

for (const card of board.cards) {
  assert.match(card.className, /tint-[ab]/, 'every card gets a paper tint');
  const note = card._note;
  const stamp = (card.children.find((c) => String(c.className).includes('bb-stamp')) || {});
  const expected = note.kind === 'review' ? 'REVIEW' : STAMPS[note.status];
  assert.equal(stamp.text, expected, `stamp for ${note.id}`);
  assert.match(card.attrs['aria-label'], new RegExp(`note from ${note.from}`), 'cards announce their author');
  const who = card.children.find((c) => String(c.className).includes('bb-who'));
  assert.equal(who.text, `${note.from} → ${note.to}`, 'the author line names both cast members');
}

// 3) Author chips are derived from the shipped cast, not hardcoded.
const authors = [...new Set(shipped.map((n) => n.from))].sort();
const authorChips = board.chips.filter((c) => String(c.dataset.filter).startsWith('author:'));
assert.deepEqual(authorChips.map((c) => c.text).sort(), authors, 'one chip per cast member who wrote a note');
assert.ok(board.chips.some((c) => c.dataset.filter === 'kind:review'), 'reviews filter exists');
assert.ok(board.chips.some((c) => c.dataset.filter === 'kind:debut'), 'debuts filter exists');

// 4) Filtering shows exactly the matching notes and can return to all.
for (const author of authors) {
  board.click(`author:${author}`);
  const expected = shipped.filter((n) => n.from === author).length;
  assert.equal(board.visible(), expected, `${author} filter shows their ${expected} notes`);
  assert.equal(board.chip(`author:${author}`).attrs['aria-pressed'], 'true', 'active chip is pressed');
}
board.click('kind:review');
assert.equal(board.visible(), shipped.filter((n) => n.kind === 'review').length, 'review filter count');
board.click('kind:debut');
assert.equal(board.visible(), shipped.filter((n) => n.kind === 'debut').length, 'debut filter count');
board.click('all');
assert.equal(board.visible(), shipped.length, 'All restores every card');
assert.equal(board.chip('all').attrs['aria-pressed'], 'true');

// 5) The status announcement tracks the active filter.
const statusLine = board.created.find((e) => String(e.className).includes('bb-status'));
assert.match(statusLine.text, /Showing all \d+ notes/, 'the polite status line reports the full board');

// 6) An empty bulletin degrades to the handwritten empty state.
const empty = mountBoard([]);
assert.equal(empty.cards.length, 0, 'no cards without notes');
assert.ok(empty.created.some((e) => /board is blank/.test(e.text)), 'empty state is shown');
assert.ok(empty.created.some((e) => /0 notes/.test(e.text)), 'note count reports zero');

console.log(`bulletin-board.test.cjs: ${shipped.length} notes, ${authors.length} cast members, filters and empty state OK`);
