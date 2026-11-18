(()=>{const $=id=>document.getElementById(id);let order=[],round=0,hearts=0,missed=false,answered=false,finished=false;
const PRAISE={comedy:'Comedy! Gangle snaps the grinning mask down. “The punchline was load-bearing.”',tragedy:'Tragedy. “Let it be sad for a moment. That is allowed.”',both:'Both at once. “The hardest mask, and the one you already know how to wear.”'};
$('app').innerHTML=`<div class="layout"><section class="panel"><div class="stat"><span id="round"></span><span id="score"></span></div><blockquote id="line" style="font:italic 19px/1.6 Georgia,serif;margin:12px 0;padding:4px 0 4px 14px;border-left:4px solid #f9a6c0"></blockquote><p class="small">Which mask does this monologue want?</p><div class="grid" id="masks" style="grid-template-columns:repeat(3,1fr)"></div><div class="controls"><button id="hint">Gangle’s read</button><button id="next" class="primary" disabled>Next monologue →</button></div><p id="status" class="status" role="status"></p><button id="again" class="primary" hidden>New audition</button></section><aside class="panel"><div class="host"><div class="host-art">${TADC.CAST.gangle}</div><p class="quote">“You do not have to get it right. You only have to be here.”</p></div><h2>House notes</h2><p>Each monologue wants one mask: <b>Comedy</b>, <b>Tragedy</b>, or both at once. A first-try call earns two hearts; a second look still earns one.</p><p class="small">Eight monologues. No clock and no buzzer. Gangle will always read the line again with you.</p><div id="calls"></div></aside></div>`;
Object.entries(Audition.masks).forEach(([id,mask])=>{const b=document.createElement('button');b.innerHTML=`<span style="display:block;font-size:28px">${mask.icon}</span>${mask.label}`;b.setAttribute('aria-label',`Call the ${mask.label} mask`);b.onclick=()=>call(id);$('masks').append(b);});
function current(){return Audition.scripts[order[round]];}
function render(){const script=finished?null:current();
 $('round').textContent=finished?'Curtain call':`Monologue ${round+1} / ${order.length}`;
 $('score').textContent=`${hearts} / ${Audition.MAX_HEARTS} hearts`;
 $('line').textContent=finished?'':`${script.guest}: “${script.line}”`;
 $('next').disabled=!answered||finished;$('next').textContent=round===order.length-1?'Finish the audition':'Next monologue →';
 $('hint').disabled=finished;[...$('masks').children].forEach(b=>b.disabled=finished||answered);
 $('again').hidden=!finished;}
function call(id){if(finished||answered)return;const script=current();
 if(Audition.judge(script,id)){answered=true;const gain=missed?1:2;hearts+=gain;
  const badge=document.createElement('div');badge.className='badge found';badge.textContent=`${Audition.icon(script.mask)} ${script.guest} · ${gain} ♥`;$('calls').append(badge);
  $('status').textContent=PRAISE[script.mask]+(missed?' (Second read, still a heart.)':'');render();return;}
 missed=true;$('status').textContent='Not that one yet. Try the other side of the ribbon, or ask for Gangle’s read.';}
function finish(){finished=true;TADC.records?.count('tadc-audition-v1','shows');TADC.records?.best('tadc-audition-v1','best',hearts,'max');
 $('status').textContent=`The audition is over: ${hearts} of ${Audition.MAX_HEARTS} hearts. ${hearts>=12?'Gangle is doing a very small, very proud dance.':'Gangle keeps every call sheet. “We can try again whenever you like.”'}`;render();}
$('next').onclick=()=>{if(!answered||finished)return;if(round===order.length-1){finish();return;}round++;missed=false;answered=false;$('status').textContent='';render();$('masks').children[0].focus();};
$('hint').onclick=()=>{if(finished)return;$('status').textContent=`Gangle’s read: ${current().note}`;};
function start(){order=Audition.scripts.map((_,i)=>i);for(let i=order.length-1;i>0;i--){const j=Math.floor(Math.random()*(i+1));[order[i],order[j]]=[order[j],order[i]];}
 round=0;hearts=0;missed=false;answered=false;finished=false;$('calls').replaceChildren();$('status').textContent='Eight monologues. Take your time.';render();$('masks').children[0].focus();}
$('again').onclick=start;start();})();
