const fs=require('node:fs');
const vm=require('node:vm');
const assert=require('node:assert/strict');
class Element{
  constructor(){this.style={};this.attrs={};this.children=[];this.events={};this.offsetParent={};this.open=false;}
  setAttribute(k,v){this.attrs[k]=v;}
  appendChild(el){this.children.push(el);}
  append(el){this.children.push(el);}
  addEventListener(k,fn){this.events[k]=fn;}
  querySelector(){return null;}
  getBoundingClientRect(){return {width:100};}
  getClientRects(){return [{}];}
  animate(){}
  focus(){document.activeElement=this;}
  showModal(){this.open=true;}
  close(){this.open=false;this.events.close?.();}
  click(){this.events.click?.();}
}
const html=fs.readFileSync('index.html','utf8');
const elements=Object.fromEntries([...html.matchAll(/id="([^"]+)"/g)].map(m=>[m[1],new Element()]));
const $=id=>elements[id];
const document={body:new Element(),createElement:()=>new Element(),getElementById:$};
let now=0,serial=0,allowed=true;
const timers=new Map(),spoken=[];
const context={window:{},document,getComputedStyle:()=>({visibility:'visible'}),localStorage:{getItem:()=>'{"malformed":true}',setItem(){}},
  setTimeout(fn,ms){timers.set(++serial,{fn,due:now+ms});return serial;},clearTimeout(id){timers.delete(id);}};
vm.createContext(context);vm.runInContext(fs.readFileSync('assets/conversations.js','utf8'),context);
const api=context.window.CircusScenes;
api.mount({actors:{},fallbackAnchor:new Element(),say:(anchor,text)=>spoken.push(text),canPlay:()=>allowed&&!$('sceneLibrary').open,firstDelay:1000000});
vm.runInContext(fs.readFileSync('assets/scene-controls.js','utf8'),context);
async function tick(ms){for(let i=0;i<ms;i+=100){now+=100;for(const [id,t] of [...timers])if(t.due<=now){timers.delete(id);t.fn();}for(let n=0;n<8;n++)await Promise.resolve();}}
(async()=>{
  assert.equal(api.progress().heard,0,'Malformed stored history must be ignored');
  assert.equal($('sceneLibraryList').children.length,24);
  $('sceneBtn').click();assert.equal($('sceneLibrary').open,true);
  $('sceneLibraryList').children[0].click();assert.equal($('sceneLibrary').open,false);
  await tick(1000);assert.equal(api.state().index,1);assert.equal(spoken.length,1);
  assert.equal($('sceneCaption').textContent,api.state().line);
  $('scenePause').click();assert.equal(api.paused,true);
  await tick(10000);assert.equal(api.state().index,1,'Pause must preserve the current line');
  assert.equal($('scenePause').textContent,'▶ Resume');
  $('scenePause').click();await tick(8000);assert.ok(api.state().index>=2);
  allowed=false;const before=spoken.length;await tick(10000);assert.equal(spoken.length,before,'Hidden/modal state must suspend progression');
  allowed=true;
  api.playScene(api.SCENES[0].id);await tick(1000);assert.equal(api.progress().heard,1,'Replay must not duplicate heard count');
  api.playScene(api.SCENES[1].id);await tick(1000);assert.equal(api.state().index,1);
  assert.ok(api.state().title.includes(api.SCENES[1].title));
  api.stop();const stopped=spoken.length;await tick(1000);assert.equal(api.active,false);assert.equal(spoken.length,stopped);
  assert.equal(api.playScene('missing'),false);
  api.playScene(api.SCENES[2].id);await tick(90000);
  assert.ok(api.progress().heard>=3); // May have started the next automatic scene after completion.
  api.stop();
  assert.equal($('scenePlayback').hidden,true);
  for(const match of html.matchAll(/<script(?:\s[^>]*)?>([\s\S]*?)<\/script>/g))if(match[1].trim())new vm.Script(match[1]);
  console.log('PASS: library selection, captions, pause/resume, hidden/modal waits, replay history, interruption, stop cancellation, invalid scene, full playback and script syntax.');
})().catch(error=>{console.error(error);process.exitCode=1;});
