const assert=require('node:assert/strict'),fs=require('node:fs'),vm=require('node:vm');
const folders=['22-gangles-ribbon-repair','23-kingers-beetle-bureau','24-ragathas-cloud-kitchen','25-pomnis-department-of-doors','26-zoobles-shadow-theater'];
const [Ribbon,Beetles,Kitchen,Doors,Theater]=folders.map(folder=>require('../'+folder+'/model.js'));
for(const size of [3,4,5])for(let seed=0;seed<30;seed++){
 let n=seed+1;const random=()=>((n=(n*1664525+1013904223)>>>0)/4294967296);
 const game=Ribbon.make(size,random);assert.equal(Ribbon.check(game).won,false);
 for(let i=0;i<game.tiles.length;i++){let spins=0;while(game.tiles[i]!==game.base[i]&&spins++<4)game.tiles[i]=Ribbon.rotate(game.tiles[i]);assert.equal(game.tiles[i],game.base[i]);}
 assert.equal(Ribbon.check(game).won,true,`Solvable ribbon ${size}/${seed}`);
}
let game=Beetles.make(()=>.4);assert.equal(new Set(game.cards).size,8);
assert.equal(Beetles.flip(game,0),'first');assert.equal(Beetles.flip(game,0),false);
let wrong=game.cards.findIndex(c=>c!==game.cards[0]);assert.equal(Beetles.flip(game,wrong),'miss');assert.equal(Beetles.flip(game,2),false);game.open=[];
for(const insect of new Set(game.cards)){const pair=game.cards.map((c,i)=>c===insect?i:-1).filter(i=>i>=0);assert.equal(pair.length,2);Beetles.flip(game,pair[0]);assert.equal(Beetles.flip(game,pair[1]),'match');}
assert.equal(game.matched.length,16);
assert.equal(Kitchen.mix([]),null);for(const recipe of Kitchen.recipes){assert.equal(Kitchen.mix(recipe.pair),recipe);assert.equal(Kitchen.mix([...recipe.pair].reverse()),recipe);}
assert.equal(Kitchen.mix([0,0]).name,'A Very Interesting Experiment');
const queue=[{room:'lobby',items:{}}],seen=new Set(),endings=new Set();
while(queue.length){const state=queue.shift(),key=JSON.stringify([state.room,Object.keys(state.items).sort()]);if(seen.has(key))continue;seen.add(key);const room=Doors.rooms[state.room];assert.ok(room);if(room.ending)endings.add(room.ending);room.choices.forEach((_,i)=>queue.push(Doors.choose(state,i)));}
assert.equal(endings.size,4,'Every story ending is reachable');
const locked={room:'archive',items:{}};assert.equal(Doors.choose(locked,0),locked);
const item=Theater.move({id:1,type:'moth',scale:1,flip:false},-100,999);assert.equal(item.x,45);assert.equal(item.y,420);
const picture=Theater.svg([item],'dusk','<script>alert("test")</script>');assert.ok(!picture.includes('<script>'));assert.ok(picture.includes('&lt;script&gt;'));assert.ok(!picture.includes('stroke="#fff6df"'));
// Lightweight DOM smoke tests run the actual app code without any browser or packages.
function boot(folder,model){
 const elements={},timers=new Map();let timerId=0;
 class Element{
  constructor(){this.children=[];this.style={};this.value='';this.dataset={};this.disabled=false;this.attrs={};this._html='';}
  set innerHTML(text){this._html=text;this.children=[];for(const match of text.matchAll(/id="([^"]+)"/g))elements[match[1]]??=new Element();}
  get innerHTML(){return this._html;}
  append(child){this.children.push(child);}
  replaceChildren(){this.children=[];}
  setAttribute(k,v){this.attrs[k]=v;}
  querySelector(){return new Element();}
  focus(){}
  click(){if(!this.disabled)this.onclick?.();}
  getBoundingClientRect(){return {left:0,top:0,width:800,height:500};}
 }
 elements.app=new Element();
 const document={getElementById:id=>elements[id],createElement:()=>new Element()};
 const context={window:{},document,TADC:{CAST:{gangle:'',kinger:'',ragatha:'',pomni:'',zooble:''}},setTimeout(fn){timers.set(++timerId,fn);return timerId;},clearTimeout(id){timers.delete(id);},Blob:class{},URL:{createObjectURL:()=>'',revokeObjectURL(){}}};
 context[model[0]]=model[1];
 vm.runInNewContext(fs.readFileSync(`acts/${folder}/app.js`,'utf8'),context);
 return {elements,flush:()=>{for(const fn of timers.values())fn();timers.clear();}};
}
let ui=boot(folders[0],['Ribbon',Ribbon]);for(let round=0;round<3;round++){for(let i=0;i<30;i++)ui.elements.hint.click();assert.equal(ui.elements.next.disabled,false);ui.elements.next.click();}
ui=boot(folders[1],['Beetles',Beetles]);assert.equal(ui.elements.cards.children.length,16);ui.elements.cards.children[0].click();ui.elements.cards.children[1].click();ui.elements.again.click();ui.flush();assert.match(ui.elements.turns.textContent,/0 guesses/);
ui=boot(folders[2],['Kitchen',Kitchen]);for(const recipe of Kitchen.recipes){recipe.pair.forEach(i=>ui.elements.pantry.children[i].click());ui.elements.mix.click();}assert.match(ui.elements.count.textContent,/6 \/ 6/);ui.elements.reset.click();assert.match(ui.elements.count.textContent,/0 \/ 6/);
ui=boot(folders[3],['Doors',Doors]);ui.elements.choices.children[0].click();ui.elements.choices.children[0].click();ui.elements.choices.children[1].click();assert.match(ui.elements.chapter.textContent,/BREAK/);
ui=boot(folders[4],['Theater',Theater]);assert.equal(ui.elements.puppets.children.length,2);ui.elements.add.children[0].click();assert.equal(ui.elements.puppets.children.length,3);ui.elements.remove.click();assert.equal(ui.elements.puppets.children.length,2);ui.elements.undo.click();assert.equal(ui.elements.puppets.children.length,3);ui.elements.save.click();
for(const folder of folders){for(const file of ['model.js','app.js'])new vm.Script(fs.readFileSync(`acts/${folder}/${file}`,'utf8'));}
console.log('PASS: 90 solvable ribbon boards, all beetle pairs and locking, recipes/order independence, all four reachable story endings, SVG escaping/bounds, and five actual app smoke tests.');
