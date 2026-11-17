const assert=require('node:assert/strict');
const fs=require('node:fs');
const vm=require('node:vm');
const source=fs.readFileSync('assets/calm.js','utf8');
function setup(saved,system=false,blocked=false){
  const listeners={},events={},classes=new Set(),buttons={};let cancels=0,written;
  for(const id of ['calmBtn','confettiBtn']) buttons[id]={attrs:{},setAttribute(k,v){this.attrs[k]=v;},addEventListener(k,fn){this[k]=fn;}};
  const media={matches:system,addEventListener(k,fn){this[k]=fn;}};
  const window={matchMedia:()=>media,localStorage:{getItem(){if(blocked)throw Error('blocked');return saved;},setItem(k,v){if(blocked)throw Error('blocked');written=v;}},addEventListener(k,fn){events[k]=fn;}};
  const document={documentElement:{classList:{toggle(k,on){on?classes.add(k):classes.delete(k);}}},getElementById:id=>buttons[id],getAnimations:()=>[{cancel(){cancels++;}}],addEventListener(k,fn){listeners[k]=fn;}};
  vm.runInNewContext(source,{window,document});listeners.DOMContentLoaded();
  return {api:window.CircusCalm,buttons,media,events,classes,get written(){return written;},get cancels(){return cancels;}};
}
let state=setup(null,true);
assert.equal(state.api.get(),true);assert.ok(state.classes.has('circus-calm'));assert.ok(state.buttons.confettiBtn.disabled);
assert.equal(state.buttons.calmBtn.attrs['aria-pressed'],'true');assert.ok(state.cancels>0);
state.media.matches=false;state.media.change({matches:false});assert.equal(state.api.get(),false);
state.buttons.calmBtn.click();assert.equal(state.api.get(),true);assert.equal(state.written,'true');
state.media.change({matches:false});assert.equal(state.api.get(),true,'Manual choice overrides system changes');
state.api.set(false);assert.equal(state.buttons.confettiBtn.disabled,false);
assert.equal(setup('false',true).api.get(),false);assert.equal(setup('true',false).api.get(),true);
assert.equal(setup('garbage',true).api.get(),true);
state=setup(null,true,true);assert.doesNotThrow(()=>state.api.toggle());assert.equal(state.api.get(),false);
state=setup(null,false);state.events.storage({key:'tadc-big-top-calm-v1',newValue:'true'});assert.equal(state.api.get(),true);
state.events.storage({key:'unrelated',newValue:'false'});assert.equal(state.api.get(),true);
state.events.storage({key:'tadc-big-top-calm-v1',newValue:null});assert.equal(state.api.get(),false);
const html=fs.readFileSync('index.html','utf8');
const toolbar=html.match(/<nav id="circusControls"[\s\S]*?<\/nav>/)[0];
for(const id of ['hangoutLaunch','musicBtn','confettiBtn','quietBtn','sceneBtn','calmBtn','adventuresBtn']) {
  assert.equal((html.match(new RegExp(`id="${id}"`,'g'))||[]).length,1);
  assert.ok(toolbar.includes(`id="${id}"`));
}
assert.ok(html.indexOf('src="assets/calm.js"')<html.indexOf('src="assets/cast.js"'));
for(const match of html.matchAll(/<script(?:\s[^>]*)?>([\s\S]*?)<\/script>/g))if(match[1].trim())new vm.Script(match[1]);
console.log('PASS: reduced-motion default, explicit preferences, denied storage, live system changes, cross-tab sync, animation cancellation, button state, toolbar IDs and script integration.');
