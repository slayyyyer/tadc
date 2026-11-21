const assert = require('node:assert/strict');
const fs = require('node:fs');
const vm = require('node:vm');
const {cast,advance,mount} = require('./hangouts.js');
const context={window:{}};
vm.runInNewContext(fs.readFileSync('assets/adventures.js','utf8'),context);
const acts=context.window.CIRCUS_ADVENTURES;
for(const [id,person] of Object.entries(cast)){
  assert.equal(person.frames.length,person.replies.length);
  assert.ok(person.lines.length>=3);
  for(const num of person.picks) assert.ok(acts.some(a=>a.num===num&&!a.soon),`${id} links a live act`);
  for(let i=0;i<person.replies.length*3;i++){
    const next=advance(id,i);
    assert.equal(next.count,i+1);assert.equal(next.reply,person.replies[i%person.replies.length]);
    assert.ok(next.frame);
  }
}
class Element {
  constructor(){this.events={};this.children=[];this.dataset={};this.attrs={};this.open=false;this.innerHTML='';}
  addEventListener(name,fn){this.events[name]=fn;}
  append(...items){this.children.push(...items);}
  replaceChildren(){this.children=[];}
  setAttribute(key,value){this.attrs[key]=value;}
  querySelector(selector){this.parts ||= {};return this.parts[selector] ||= {style:{}};}
  focus(){global.document.activeElement=this;}
  getClientRects(){return this.hidden?[]:[{}];}
  showModal(){this.open=true;}
  close(){this.open=false;this.events.close?.();}
  click(){this.events.click?.();}
}
const html=fs.readFileSync('index.html','utf8');
const elements=Object.fromEntries([...html.matchAll(/id="([^"]+)"/g)].map(m=>[m[1],new Element()]));
const $=id=>elements[id];
// Script loads are requested through document.head; nothing executes here.
const requested=[];
function flush(){
  for(let i=0;i<requested.length;i++){
    const el=requested[i];
    if(!el.flushed){el.flushed=true;el.onload?.();}
  }
}
global.document={getElementById:$,createElement:()=>new Element(),head:{appendChild(el){requested.push(el);}}};
global.TADC={CAST:Object.fromEntries(Object.keys(cast).map(id=>[id,'<svg><defs><linearGradient id="paint"/></defs><path fill="url(#paint)"/></svg>']))};
mount(acts);
assert.equal($('hangoutCast').children.length,8);
assert.deepEqual(requested,[]);
for(const src of ['assets/corpus.js','assets/tinylm-weights.js','assets/tinylm.js','assets/castbrain.js'])
  assert.ok(!html.includes(`src="${src}"`),`${src} is not preloaded by the hub`);
$('hangoutLaunch').click();assert.ok($('hangout').open);assert.equal($('hangoutName').textContent,'Pomni');
// Opening the lounge starts the chat stack only; the tiny model waits for its opt-in.
assert.deepEqual(requested.map(el=>el.src),['assets/corpus.js']);
flush();
assert.deepEqual(requested.map(el=>el.src),['assets/corpus.js','assets/castbrain.js']);
assert.ok(!requested.some(el=>/tinylm/.test(el.src)),'the tiny model is not part of the chat stack');
assert.equal(document.activeElement,$('hangoutClose'));
assert.ok($('hangoutPortrait').innerHTML.includes('url(#hangout-paint)'));
$('hangoutTalk').click();assert.equal($('hangoutLine').textContent,cast.pomni.lines[1]);
for(const button of $('hangoutCast').children){
  button.click();const id=button.dataset.person;
  assert.equal($('hangoutName').textContent,cast[id].name);
  assert.equal(button.attrs['aria-pressed'],'true');
  assert.equal($('hangoutCast').children.filter(b=>b.attrs['aria-pressed']==='true').length,1);
  for(let i=0;i<cast[id].replies.length+1;i++){
    $('hangoutAction').click();assert.equal($('hangoutReply').textContent,cast[id].replies[i%cast[id].replies.length]);
  }
  assert.equal($('hangoutPicks').children.length,cast[id].picks.length);
}
$('hangoutClose').click();assert.equal(document.activeElement,$('hangoutLaunch'));
$('kinger').click();assert.ok($('hangout').open);assert.equal($('hangoutName').textContent,'Kinger');
$('hangoutClose').click();assert.equal(document.activeElement,$('kinger'));
$('jax').click();$('jax').hidden=true;$('hangoutClose').click();assert.equal(document.activeElement,$('hangoutLaunch'));
for(const [,src] of html.matchAll(/<script src="([^"]+)"/g)) assert.ok(fs.existsSync(src));
for(const match of html.matchAll(/<script(?:\s[^>]*)?>([\s\S]*?)<\/script>/g)) if(match[1].trim())new vm.Script(match[1]);
console.log('PASS: eight cast profiles, live recommendations, repeated activities, switching, dialogue, SVG IDs, stage entry, modal focus and hidden-opener fallback; script integration.');

let scenesStarted=0;
global.CircusScenes={active:false,playNext(){scenesStarted++;this.active=true;}};
$('gangle').click();
// Prior loop ended at an odd count for Gangle; switching preserves the selected mask.
assert.equal($('hangoutPortrait').querySelector('.mask-comedy').style.display,'none');
assert.equal($('hangoutPortrait').querySelector('.mask-tragedy').style.display,'');
$('hangoutAction').click();
assert.equal($('hangoutPortrait').querySelector('.mask-comedy').style.display,'');
assert.equal($('hangoutPortrait').querySelector('.mask-tragedy').style.display,'none');
$('hangoutWatch').click();
assert.equal($('hangout').open,false);
assert.equal(scenesStarted,1);
assert.equal(document.activeElement,$('sceneBtn'));
$('hangoutLaunch').click();
assert.equal($('hangoutWatch').textContent,'🎬 Return to the scene');
$('hangoutWatch').click();
assert.equal(scenesStarted,1,'Watching an active scene must not skip it');
console.log('PASS: portrait mask alternation and retained state, scene launch, focus restoration, active-scene resume without restart.');

let voiced=[];
global.TADC.babble=(who,text)=>voiced.push({who,text});
global.TADC.quiet={get:()=>false};
$('pomni').click();$('hangoutTalk').click();
assert.equal(voiced.at(-1).who,'pomni');
assert.equal(voiced.at(-1).text,$('hangoutLine').textContent);
$('hangoutAction').click();assert.equal(voiced.at(-1).text,$('hangoutReply').textContent);
const voicedCount=voiced.length;
global.TADC.quiet.get=()=>true;$('hangoutTalk').click();
assert.equal(voiced.length,voicedCount,'Quiet Mode prevents hangout babble');
console.log('PASS: hangout dialogue and activities voiced, Quiet Mode respected.');

// The lounge owns widget lifecycle; the brain owns transcript escaping and reply delivery.
$('hangoutClose').click();let chatMounts=0,chatDestroys=0,chatWho=[],forgot=0;
global.CircusBrain={
  mountChat(el,who){chatMounts++;chatWho.push(who);return {setWho(w){chatWho.push(w);},destroy(){chatDestroys++;}};},
  improv:who=>`${who} invents a little hat.`,forget(){forgot++;}
};
$('pomni').click();assert.equal(chatMounts,1);assert.equal(chatWho.at(-1),'pomni');
$('hangoutCast').children.find(b=>b.dataset.person==='jax').click();
assert.equal(chatMounts,1);assert.equal(chatWho.at(-1),'jax');assert.equal($('hangoutChatName').textContent,'Jax');
$('hangoutImprov').click();assert.equal($('hangoutImprovLine').textContent,'Jax: jax invents a little hat.');
$('hangoutForget').click();assert.equal(forgot,1);assert.equal(chatDestroys,1);assert.equal(chatMounts,2);
$('hangoutClose').click();assert.equal(chatDestroys,2);
$('hangoutLaunch').click();assert.equal(chatMounts,3);assert.equal(chatWho.at(-1),'jax');
console.log('PASS: lazy chat mount, character routing, improv, forget and close/reopen lifecycle.');
let neural=false;
global.CircusBrain.setNeuralEnabled=value=>{neural=value;};
$('hangoutClose').click();$('hangoutLaunch').click();assert.equal($('hangoutNeural').disabled,false);
// Ticking the box is what fetches the weights and the runtime.
$('hangoutNeural').checked=true;$('hangoutNeural').events.change();
assert.equal(requested.at(-1).src,'assets/tinylm-weights.js','the first opt-in fetches the weights');
flush();
assert.deepEqual(requested.slice(-2).map(el=>el.src),['assets/tinylm-weights.js','assets/tinylm.js'],'weights load before the runtime');
assert.equal(neural,false,'no neural opt-in without a working model');

(async () => {
  await Promise.resolve(); // let the change handler resume after the load attempt
  assert.equal($('hangoutNeural').disabled,false);
  assert.equal($('hangoutNeural').checked,false,'a model that cannot load unchecks the box');
  assert.match($('hangoutImprovLine').textContent,/could not load/);
  global.CircusTinyLM={ready:true};
  $('hangoutNeural').checked=true;$('hangoutNeural').events.change();assert.equal(neural,true);
  $('hangoutNeural').checked=false;$('hangoutNeural').events.change();assert.equal(neural,false);
  console.log('PASS: chat stack and tiny model load on first use, with fallback and explicit opt-in/opt-out.');
})().catch((err) => { console.error(err); process.exitCode = 1; });
