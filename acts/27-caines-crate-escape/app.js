(()=>{const $=id=>document.getElementById(id);let level=0,state,history=[],hintTimer=0,hintVersion=0,credited=false;
$('app').innerHTML=`<div class="layout"><section class="panel"><div class="stat"><span id="level"></span><span id="moves"></span></div><div id="board" class="grid" tabindex="0" role="group" aria-label="Crate puzzle. Use arrow keys to move Caine." style="gap:3px;max-width:560px;margin:auto"></div><div class="controls" id="directions"></div><div class="controls"><button id="hint">Ask Caine for a hint</button><button id="undo">Undo</button><button id="restart">Restart room</button><button id="next" class="primary" disabled>Next stage</button></div><p id="status" class="status" role="status"></p></section><aside class="panel"><div class="host"><div class="host-art">${TADC.CAST.caine}</div><p class="quote">“A perfectly ordinary stage-management exercise! The boxes disagree!”</p></div><h2>Put on a show</h2><p>Push every 📦 crate onto a gold ● stage mark. You can push one crate, but you cannot pull it.</p><p>Move with arrows or WASD while the board is focused, or use the four buttons. Undo is unlimited.</p><p class="small">🎩 = you · 📦 = crate · ● = target. If a crate gets stuck in a corner, undo or restart.</p></aside></div>`;
function render(){ $('board').style.gridTemplateColumns=`repeat(${state.width},1fr)`;$('board').replaceChildren();for(let i=0;i<state.width*state.height;i++){const wall=state.walls.includes(i),goal=state.goals.includes(i),box=state.boxes.includes(i),you=state.player===i;const cell=document.createElement('div');cell.style.cssText=`aspect-ratio:1;display:grid;place-items:center;border-radius:5px;font-size:clamp(17px,4vw,32px);background:${wall?'#7a5663':goal?'#f4cd7955':'#ffffff08'}`;cell.textContent=you?'🎩':box?'📦':goal?'●':'';cell.setAttribute('role','img');cell.setAttribute('aria-label',`Row ${Math.floor(i/state.width)+1}, column ${i%state.width+1}: ${wall?'wall':you?'Caine':box?'crate':'floor'}${goal?', target':''}`);$('board').append(cell);}
 $('level').textContent=`Stage ${level+1} / ${Crates.levels.length}`;$('moves').textContent=`${state.moves} moves · ${state.pushes} pushes`;$('undo').disabled=!history.length;const won=Crates.won(state);if(won&&!credited){credited=true;TADC.records?.count('tadc-crates-v1','cleared');TADC.records?.best('tadc-crates-v1','best',state.pushes,'min');}$('next').disabled=!won;$('hint').disabled=won;$('next').textContent=level===3?'Play again':'Next stage';$('status').textContent=won?'The props are in place! Caine awards you one extremely official bow.':`${state.boxes.filter(id=>state.goals.includes(id)).length} of ${state.boxes.length} crates on their marks.`;}
function cancelHint(){clearTimeout(hintTimer);hintVersion++;if(state)$('hint').disabled=Crates.won(state);}
function step(dx,dy){cancelHint();if(Crates.won(state))return;const next=Crates.move(state,dx,dy);if(next!==state){history.push(state);state=next;}render();}
for(const [label,dx,dy] of [['↑ Up',0,-1],['← Left',-1,0],['↓ Down',0,1],['→ Right',1,0]]){const b=document.createElement('button');b.textContent=label;b.onclick=()=>{step(dx,dy);$('board').focus();};$('directions').append(b);}
$('board').onkeydown=e=>{const d={ArrowUp:[0,-1],w:[0,-1],ArrowDown:[0,1],s:[0,1],ArrowLeft:[-1,0],a:[-1,0],ArrowRight:[1,0],d:[1,0]}[e.key.length===1?e.key.toLowerCase():e.key];if(d){e.preventDefault();step(...d);}};
function start(){cancelHint();state=Crates.make(level);history=[];credited=false;render();$('board').focus();}$('undo').onclick=()=>{cancelHint();if(history.length){state=history.pop();render();}$('board').focus();};$('restart').onclick=start;$('next').onclick=()=>{level=(level+1)%4;start();};
$('hint').onclick=()=>{
 cancelHint();const version=hintVersion,search=Crates.planner(state);
 $('hint').disabled=true;$('status').textContent='Caine is rehearsing possible routes…';
 function batch(){
  if(version!==hintVersion)return;
  const result=search.advance();
  if(result.status==='searching'){hintTimer=setTimeout(batch,0);return;}
  $('hint').disabled=Crates.won(state);
  if(result.status==='solved'&&result.direction){
   const names={'0,-1':'up','-1,0':'left','0,1':'down','1,0':'right'};
   $('status').textContent=`Caine suggests moving ${names[result.direction.join(',')]}. A route finishes in ${result.distance} moves.`;
  }else if(result.status==='stuck')$('status').textContent='These props cannot reach their marks from here. Try Undo or Restart room.';
  else if(result.status==='limit')$('status').textContent='Caine ran out of rehearsal time. Try Undo, or move a little and ask again.';
  else $('status').textContent='Already perfectly staged!';
 }
 hintTimer=setTimeout(batch,0);$('board').focus();
};start();})();
