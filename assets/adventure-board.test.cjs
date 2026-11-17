const assert = require('node:assert/strict');
const fs = require('node:fs');
const vm = require('node:vm');
const board = require('./adventure-board.js');
const html = fs.readFileSync('index.html', 'utf8');
const manifestContext = {window:{}};
vm.runInNewContext(fs.readFileSync('assets/adventures.js', 'utf8'), manifestContext);
const acts = JSON.parse(JSON.stringify(manifestContext.window.CIRCUS_ADVENTURES));
const original = JSON.stringify(acts);
const live = acts.filter(a => !a.soon);
assert.equal(board.select(acts).length, live.length);
assert.equal(board.select(acts, '  KINGER   pocket ')[0].num, '15');
assert.ok(board.select(acts, '', 'Create').every(a => board.category(a) === 'Create'));
assert.equal(board.select(acts, 'Kinger', 'Stories').length, 0);
assert.equal(board.select(acts, 'zzzz-nothing').length, 0);
assert.equal(board.select(acts, '', 'All', 'newest')[0].num, String(Math.max(...live.map(a => Number(a.num)))));
assert.equal(board.choose([]), null);
const filtered = board.select(acts, '', 'Unwind');
assert.equal(board.choose(filtered, () => 0), filtered[0]);
assert.equal(board.choose(filtered, () => .99999), filtered.at(-1));
assert.equal(JSON.stringify(acts), original, 'Filtering must not mutate poster data');
const future = [{num:'99', title:'New toy', blurb:'Hello', href:'acts/new/index.html'}];
assert.equal(board.category(future[0]), 'Other');
assert.equal(board.select(future, '', 'Other').length, 1, 'Uncategorized future acts remain discoverable');
console.log('PASS: catalog, multiword case-insensitive search, combined filters, empty results, sorting, random picks, immutability, future acts.');
class Element {
  constructor() { this.children=[]; this.events={}; this.attrs={}; this.style={setProperty(){}}; this.value=''; this.textContent=''; }
  append(...children) { this.children.push(...children); }
  replaceChildren(...children) { this.children=children; }
  setAttribute(key,value) { this.attrs[key]=value; }
  addEventListener(name,fn) { this.events[name]=fn; }
  focus() { this.focused=true; }
}
const ids=['boardMoods','boardSearch','boardOrder','boardCount','boardEmpty','boardSurprise','boardReset','posters'];
const elements=Object.fromEntries(ids.map(id=>[id,new Element()]));
const $=id=>elements[id];
global.document={getElementById:$,createElement:()=>new Element()};
global.window={location:{href:''}};
board.mount(acts);
assert.equal($('posters').children.length,live.length);
$('boardSearch').value='zzzz-nothing'; $('boardSearch').events.input();
assert.equal($('posters').children.length,0);
assert.equal($('boardEmpty').hidden,false);
assert.equal($('boardSurprise').disabled,true);
$('boardReset').events.click();
assert.equal($('posters').children.length,live.length);
assert.equal($('boardSearch').focused,true);
const unwind=$('boardMoods').children.find(chip=>chip.textContent==='Unwind');
unwind.events.click();
assert.equal(unwind.attrs['aria-pressed'],'true');
assert.equal($('posters').children.length,filtered.length);
$('boardSearch').value='Kinger'; $('boardSearch').events.input();
// expected matches come from the board's own filter, so new Kinger/Unwind acts don't break this check
const kingerUnwind=board.select(acts,'Kinger','Unwind');
assert.ok(kingerUnwind.length>=1 && kingerUnwind.some(a=>a.num==='15'));
assert.equal($('posters').children.length,kingerUnwind.length);
$('boardSurprise').events.click();
assert.ok(kingerUnwind.some(a=>a.href===window.location.href));
$('boardReset').events.click(); $('boardOrder').value='newest'; $('boardOrder').events.change();
assert.equal($('posters').children[0].href,board.select(acts,'','All','newest')[0].href);
for(const id of ids) assert.ok(html.includes(`id="${id}"`),`Integrated control ${id} exists`);
for(const match of html.matchAll(/<script(?:\s[^>]*)?>([\s\S]*?)<\/script>/g)) {
  if(match[1].trim()) new vm.Script(match[1]);
}
console.log('PASS: DOM rendering, empty state, disabled random action, reset focus, mood selection, filtered navigation, ordering, HTML integration and script syntax.');
