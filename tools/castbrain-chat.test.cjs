'use strict';
const assert=require('node:assert/strict'),vm=require('node:vm'),fs=require('node:fs'),path=require('node:path');
const timers=new Map(),storage=new Map(),voices=[];let id=0;
class Element {
  constructor(){this.parts={};this.events={};this.children=[];this.innerHTML='';this.value='';}
  querySelector(q){return this.parts[q] ||= new Element();}
  addEventListener(k,fn){this.events[k]=fn;}
  appendChild(el){this.children.push(el);}
  dispatchEvent(e){this.lastEvent=e;}
}
const root={console,document:{getElementById:()=>true,createElement:()=>new Element()},
  localStorage:{getItem:k=>storage.get(k)||null,setItem:(k,v)=>storage.set(k,v),removeItem:k=>storage.delete(k)},
  TADC:{babble:(...args)=>voices.push(args)},
  setTimeout:fn=>{timers.set(++id,fn);return id;},clearTimeout:i=>timers.delete(i),
  CustomEvent:class{constructor(type,opts){this.type=type;this.detail=opts.detail;}}};
vm.runInNewContext(fs.readFileSync(path.join(__dirname,'../assets/castbrain.js'),'utf8'),root);
const host=new Element(),chat=root.CircusBrain.mountChat(host,'pomni');
function submit(text){host.querySelector('input').value=text;host.querySelector('form').events.submit({preventDefault(){},stopPropagation(){}});}
function flush(){for(const [i,fn] of [...timers]){timers.delete(i);fn();}}
submit('hello <img onerror="boom">');chat.setWho('jax');flush();
assert.ok(host.querySelector('.cb-log').children[0].innerHTML.includes('&lt;img'));
assert.ok(host.querySelector('.cb-log').children[1].innerHTML.includes('<b>POMNI</b>'));
assert.equal(voices[0][0],'pomni');assert.equal(host.lastEvent.detail.who,'pomni');
submit('hi');chat.destroy();assert.equal(timers.size,0);flush();assert.equal(voices.length,1);
submit('hello');assert.equal(timers.size,0,'Destroyed widgets cannot submit');
const second=root.CircusBrain.mountChat(new Element(),'caine');assert.ok(second);
root.CircusBrain.reply('caine','call me Tester');assert.equal(root.CircusBrain.memory().name,'Tester');
root.CircusBrain.forget();assert.equal(root.CircusBrain.memory().name,'');
console.log('PASS: escaping, captured speaker across switching, cancellation on destroy, memory clear.');
let neuralCalls=0;
root.CircusTinyLM={generate(){neuralCalls++;return 'A tiny hat learns to dance.';}};
root.CircusBrain.improv('caine');assert.equal(neuralCalls,0,'Neural generation is opt-in');
root.CircusBrain.setNeuralEnabled(true);assert.equal(root.CircusBrain.improv('caine'),'A tiny hat learns to dance.');
assert.equal(neuralCalls,1);root.CircusBrain.setNeuralEnabled(false);
root.CircusBrain.improv('caine');assert.equal(neuralCalls,1,'Opting out restores word-chain improv');
console.log('PASS: explicit neural opt-in and opt-out.');
