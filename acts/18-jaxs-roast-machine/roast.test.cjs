const assert = require('node:assert/strict');
const fs = require('node:fs');
const vm = require('node:vm');
const html = fs.readFileSync('acts/18-jaxs-roast-machine/index.html','utf8');
const source = html.match(/<script>\s*([\s\S]*?)<\/script>/)[1];
class Element {
  constructor() { this.innerHTML=''; this.textContent=''; this.value=''; this.style={}; this.dataset={}; this.events={}; this.attrs={};
    const classes=new Set(); this.classList={add:x=>classes.add(x),remove:x=>classes.delete(x),toggle:(x,on)=>on?classes.add(x):classes.delete(x)}; }
  addEventListener(name,fn) { this.events[name]=fn; }
  setAttribute(key,value) { this.attrs[key]=value; }
  querySelector() { return this.meter ||= new Element(); }
  scrollIntoView() {}
  getBoundingClientRect() { return {left:0,top:0,width:100}; }
  click() { this.events.click?.(); }
}
const elements=new Map([...html.matchAll(/id="([^"]+)"/g)].map(m=>[m[1],new Element()]));
const heat=[0,1,2].map(n=>{const e=new Element();e.dataset.heat=String(n);return e;});
const $=id=>elements.get(id);
const sandbox={window:{TADC:{CAST:{},pick:a=>a[0],sfx(){},confetti(){},wireCaine:()=>({talk(){}}),say(){}}},
  document:{getElementById:$,querySelectorAll:()=>heat},setTimeout:()=>1,clearTimeout(){},requestAnimationFrame:fn=>fn(),
  matchMedia:()=>({matches:false})};
// Expose the rule table only in this test VM; shipped code has no test globals.
vm.runInNewContext(source.replace('  let heat = 1;', '  globalThis.rules = D; globalThis.samples = SAMPLES;\n  let heat = 1;'),sandbox);
function roast(text) { $('txt').value=text; $('roast').click(); return Number($('scoreNum').textContent.split('/')[0]); }
assert.doesNotThrow(()=>roast('fix stuff'),'Roasting must work when Web Audio is unavailable');
const cases=['','fix','wip','final_final_v3','Fix typo','Revert a silly hat','Refactor hats','please work','oops','URGENT HOTFIX','TODO: hats','Add tests','feat(circus): add hats','TADC-404','MAKE THE HATS BIGGER','hat','a'.repeat(141),'asdfghjkl','A sentence.','🎉','some things','Add a ridiculous hat'];
assert.equal(cases.length,sandbox.rules.length);
cases.forEach((text,i)=>assert.ok(sandbox.rules[i].test(text),`Detector ${i} handles its example`));
assert.ok(!sandbox.rules[17].test('HTTP'),'Short acronyms are not keyboard smashes');
for(const level of heat){level.click();for(const text of [...sandbox.samples,...cases]){
  const score=roast(text);assert.ok(score>=0&&score<=10,`Bounded score for ${text}`);
  assert.ok($('ragSays').textContent.length>0);
}}
roast('<img src=x onerror=alert(1)>');
assert.ok(!$('jaxSays').innerHTML.includes('<img'));
assert.ok(!$('hist').innerHTML.includes('<img'));
assert.ok($('hist').innerHTML.includes('&lt;img'));
assert.ok(($('hist').innerHTML.match(/<li>/g)||[]).length<=6);
let prevented=false;
$('txt').events.keydown({key:'Enter',shiftKey:true,preventDefault(){prevented=true;}});
assert.equal(prevented,false,'Shift+Enter preserves a newline');
$('txt').events.keydown({key:'Enter',preventDefault(){prevented=true;}});
assert.equal(prevented,true,'Enter submits');
$('sound').click();assert.doesNotThrow(()=>roast('oops'),'Unavailable audio cannot break an enabled-sound roast');
$('clear').click();assert.equal($('txt').value,'');assert.equal($('hist').innerHTML,'');
console.log('PASS: 22 detectors, 3 heat levels, sample messages, score bounds, escaping, six-item history, keyboard controls, unavailable audio, clear.');
