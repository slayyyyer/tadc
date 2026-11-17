// Run inside the circus: node acts/15-kingers-pocket-observatory/observatory.test.cjs
// A minimal DOM and clock exercise game transitions without a browser or dependencies.
const {readFileSync} = require('node:fs');
const vm = require('node:vm');
const assert = require('node:assert/strict');
const elements = new Map();
class Element {
  constructor() {
    this.children = []; this.events = {}; this.style = {}; this.attributes = {};
    this.textContent = ''; this.disabled = false;
    const classes = new Set();
    this.classList = {add: value => classes.add(value), remove: value => classes.delete(value), contains: value => classes.has(value)};
  }
  set id(value) { elements.set(value,this); }
  setAttribute(key,value) { this.attributes[key] = value; }
  append(element) { this.children.push(element); }
  replaceChildren(...children) { this.children = children; }
  addEventListener(name,fn) { this.events[name] = fn; }
  click() { if (!this.disabled) this.events.click?.(); }
}
for (const id of ['kinger','dust','sky','stamps','trail','quote','status','progress','chapter','start','replay','sound','reset']) {
  elements.set(id,new Element());
}
const document = {hidden:false,events:{},getElementById:id => elements.get(id),createElement:() => new Element(),
  createTextNode:text => text,addEventListener(name,fn) { this.events[name] = fn; }};
let serial = 0;
const timers = new Map();
const context = {document,window:{TADC:{CAST:{kinger:'<svg></svg>'}}},
  setTimeout:fn => { timers.set(++serial,fn); return serial; },clearTimeout:id => timers.delete(id)};
vm.runInNewContext(readFileSync('acts/15-kingers-pocket-observatory/observatory.js','utf8'),context);
const $ = id => elements.get(id);
const stars = $('sky').children;
async function flush() {
  for (let i = 0; i < 100 && timers.size; i++) {
    const callbacks = [...timers.values()]; timers.clear();
    callbacks.forEach(fn => fn()); await Promise.resolve(); await Promise.resolve();
  }
  assert.equal(timers.size,0,'All animation timers settle');
}
(async () => {
  assert.equal(stars.length,9);
  assert.ok(stars.every(star => star.disabled));
  $('start').click(); assert.ok($('start').disabled);
  $('reset').click(); await flush();
  assert.ok(stars.every(star => star.disabled),'Reset cancels active playback');
  $('start').click(); await flush();
  stars[8].click(); assert.match($('status').textContent,/try again/);
  stars[0].click(); stars[8].click();
  assert.match($('status').textContent,/Keep your 1 remembered/,'Wrong guesses preserve progress');
  $('replay').click(); await flush();
  assert.match($('progress').textContent,/0 \/ 3/,'Replay starts the same chart from zero');
  const sequences = [[0,1,2],[3,6,7,8],[0,4,2,5,4],[6,3,1,5,8,6],[7,6,3,0,4,2,5]];
  for (let round = 0; round < sequences.length; round++) {
    if (round) { $('start').click(); await flush(); }
    for (const index of sequences[round]) {
      document.events.keydown({key:String(index + 1),preventDefault() {}});
    }
    assert.ok($(`stamp-${round}`).classList.contains('found'));
    assert.ok(stars.every(star => star.disabled),'Completed charts stop accepting input');
  }
  assert.match($('status').textContent,/All five/);
  $('start').click(); await flush();
  assert.match($('chapter').textContent,/01/,'Final replay returns to first chart');
  $('replay').click(); document.hidden = true; document.events.visibilitychange(); await flush();
  assert.match($('progress').textContent,/paused/,'Hidden tab cancels demonstration');
  $('reset').click(); await flush();
  assert.equal($('trail').attributes.points,'');
  assert.ok(!$('start').disabled);
  console.log('PASS: all five charts, repeated stars, keyboard input, mistake recovery, replay, reset cancellation, final restart, hidden-tab cancellation.');
})().catch(error => { console.error(error); process.exitCode = 1; });
