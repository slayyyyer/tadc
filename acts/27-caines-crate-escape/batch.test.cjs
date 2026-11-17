const assert=require('node:assert/strict'),fs=require('node:fs'),vm=require('node:vm');
const folders=['27-caines-crate-escape','28-jaxs-backwards-bowling','29-ragathas-midnight-tea','30-zoobles-color-bureau','31-kingers-rain-garden'];
const [Crates,Bowling,Tea,Colors,Garden]=folders.map(folder=>require('../'+folder+'/model.js'));
function solve(initial){const queue=[{state:initial,path:[]}],seen=new Set();let head=0;
 while(head<queue.length&&head<300000){const {state,path}=queue[head++],key=state.player+':'+[...state.boxes].sort((a,b)=>a-b).join(',');if(seen.has(key))continue;seen.add(key);if(Crates.won(state))return path;
 for(const d of [[0,-1],[-1,0],[0,1],[1,0]]){const next=Crates.move(state,...d);if(next===state)continue;const stuck=next.boxes.some(b=>!next.goals.includes(b)&&(next.walls.includes(b-1)||next.walls.includes(b+1))&&(next.walls.includes(b-next.width)||next.walls.includes(b+next.width)));if(!stuck)queue.push({state:next,path:[...path,d]});}}
 throw Error('No solution found');}
const solutions=Crates.levels.map((_,i)=>{const initial=Crates.make(i),path=solve(initial);let state=initial;for(const d of path)state=Crates.move(state,...d);assert.ok(Crates.won(state));assert.equal(initial.moves,0,'Moves do not mutate history');return path;});
let shots=0,maxPins=0;
for(let angle=-55;angle<=55;angle+=5)for(const power of [170,270,360]){let ball=Bowling.ball(angle,power),down=new Set(),result;for(let i=0;i<1800;i++){result=Bowling.step(ball,down,1/240);ball=result.ball;down=result.down;assert.ok(Number.isFinite(ball.x)&&Number.isFinite(ball.y));assert.ok(down.size<=10);if(result.done)break;}assert.ok(result.done,'Every roll finishes');maxPins=Math.max(maxPins,down.size);shots++;}
assert.ok(maxPins>=5,'The alley permits meaningful scoring');
for(const order of Tea.orders){assert.equal(Tea.check({items:[...order.items],temperature:order.temperature,stir:order.stir},order),null);assert.ok(Tea.check({items:[],temperature:order.temperature,stir:order.stir},order));assert.ok(Tea.check({items:[...order.items],temperature:order.temperature==='warm'?'cold':'warm',stir:order.stir},order));}
assert.ok(Tea.check({items:['honey','tea'],temperature:'warm',stir:true},Tea.orders[0]));
for(const target of Colors.targets){assert.ok(Colors.compare(target.rgb,target.rgb).won);assert.ok(Colors.compare(target.rgb.map(v=>v+12),target.rgb).won);assert.equal(Colors.compare(target.rgb.map(v=>v+13),target.rgb).won,false);}
let garden=[];for(let i=0;i<30;i++)garden=Garden.plant(garden,'sunflower',i*50,500);assert.equal(garden.length,24);assert.ok(garden.every(p=>p.x>=40&&p.x<=760&&p.y===460));for(let i=0;i<8;i++)garden=Garden.water(garden);assert.ok(garden.every(p=>p.growth===4));assert.equal(Garden.plant(garden,'invalid',0,0),garden);assert.ok(Garden.svg(garden,true).includes('<svg'));assert.ok(Garden.svg(garden,false).includes('grown at your own pace'));
function boot(folder,name,model){
 const elements={},timers=new Map();let tid=0;
 const noop=()=>{};const ctx=new Proxy({}, {get:(obj,key)=>obj[key]||(obj[key]=noop),set:(obj,key,value)=>(obj[key]=value,true)});
 class Element{
  constructor(){this.children=[];this.style={};this.attrs={};this.dataset={};this.value='';this.disabled=false;}
  set innerHTML(text){this.children=[];for(const match of text.matchAll(/id="([^"]+)"[^>]*>/g)){const el=elements[match[1]] ||= new Element();const value=match[0].match(/value="([^"]+)"/);if(value)el.value=value[1];}}
  append(...children){this.children.push(...children);}replaceChildren(){this.children=[];}setAttribute(k,v){this.attrs[k]=v;}querySelector(){return new Element();}focus(){}click(){if(!this.disabled)this.onclick?.();}getContext(){return ctx;}getBoundingClientRect(){return {left:0,top:0,width:800,height:500};}
 }
 elements.app=new Element();const context={window:{},document:{hidden:false,getElementById:id=>elements[id],createElement:()=>new Element()},TADC:{CAST:{caine:'',jax:'',ragatha:'',zooble:'',kinger:''}},setTimeout:fn=>(timers.set(++tid,fn),tid),clearTimeout:id=>timers.delete(id),requestAnimationFrame:fn=>(timers.set(++tid,fn),tid),cancelAnimationFrame:id=>timers.delete(id),performance:{now:()=>0},Blob:class{},URL:{createObjectURL:()=>'',revokeObjectURL(){}}};context[name]=model;vm.runInNewContext(fs.readFileSync(`acts/${folder}/app.js`,'utf8'),context);return {elements,timers};
}
let ui=boot(folders[0],'Crates',Crates);const directionIndex={'0,-1':0,'-1,0':1,'0,1':2,'1,0':3};for(const path of solutions){for(const d of path)ui.elements.directions.children[directionIndex[d.join(',')]].click();assert.equal(ui.elements.next.disabled,false);ui.elements.next.click();}
ui=boot(folders[1],'Bowling',Bowling);ui.elements.roll.click();assert.equal(ui.elements.roll.disabled,true);ui.elements.reset.click();assert.equal(ui.elements.roll.disabled,false);assert.equal(ui.timers.size,0,'Reset cancels a rolling animation');
ui=boot(folders[2],'Tea',Tea);const keys=Object.keys(Tea.ingredients);for(const order of Tea.orders){for(const ingredient of order.items)ui.elements.ingredients.children[keys.indexOf(ingredient)].click();if(order.temperature==='cold')ui.elements.temperature.click();if(order.stir)ui.elements.stir.click();ui.elements.serve.click();}assert.match(ui.elements.score.textContent,/24 \/ 24/);assert.equal(ui.elements.serve.disabled,true);
ui=boot(folders[3],'Colors',Colors);for(const target of Colors.targets){ui.elements.sliders.children.forEach((label,i)=>{const slider=label.children[1];slider.value=target.rgb[i];slider.oninput();});ui.elements.check.click();assert.equal(ui.elements.next.disabled,false);ui.elements.next.click();}
ui=boot(folders[4],'Garden',Garden);ui.elements.plant.click();for(let i=0;i<4;i++)ui.elements.water.click();assert.match(ui.elements.grown.textContent,/1 fully/);ui.elements.clear.click();assert.match(ui.elements.count.textContent,/0 \/ 24/);ui.elements.undo.click();assert.match(ui.elements.count.textContent,/1 \/ 24/);ui.elements.save.click();
for(const folder of folders)for(const file of ['app.js','model.js'])new vm.Script(fs.readFileSync(`acts/${folder}/${file}`,'utf8'));
console.log(`PASS: all 4 crate rooms solved (${solutions.map(p=>p.length).join('/')} moves), ${shots} bowling trajectories (best ${maxPins} pins), all tea orders, color tolerance, garden growth/limits, and 5 actual app smoke tests.`);

for(let level=0;level<Crates.levels.length;level++) {
 let state=Crates.make(level),steps=0;
 while(!Crates.won(state)&&steps<40){
  const search=Crates.planner(state);let result;
  do{result=search.advance(32);}while(result.status==='searching');
  assert.equal(result.status,'solved');assert.ok(result.direction);
  state=Crates.move(state,...result.direction);steps++;
 }
 assert.ok(Crates.won(state));assert.equal(steps,solutions[level].length,'Hints follow a shortest solution');
}
let trapped=Crates.make(0);trapped={...trapped,boxes:[trapped.width+1]};
let result,search=Crates.planner(trapped);do{result=search.advance();}while(result.status==='searching');
assert.equal(result.status,'stuck');assert.equal(Crates.planner(Crates.make(3),1).advance().status,'limit');
ui=boot(folders[0],'Crates',Crates);ui.elements.hint.click();assert.equal(ui.elements.hint.disabled,true);
const stale=[...ui.timers.values()][0];ui.elements.restart.click();stale();
assert.equal(ui.timers.size,0);assert.equal(ui.elements.hint.disabled,false);assert.ok(!ui.elements.status.textContent.includes('suggests'));
ui.elements.hint.click();for(const [id,fn] of [...ui.timers]){ui.timers.delete(id);fn();}
assert.match(ui.elements.status.textContent,/moving right/);
ui.elements.board.onkeydown({key:'D',preventDefault(){}});assert.match(ui.elements.moves.textContent,/1 moves/);
console.log('PASS: shortest-path hints in all rooms, dead-end and search-limit distinction, stale cancellation, uppercase WASD.');
