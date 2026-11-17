(function(root){'use strict';
const shapes={
 moth:{name:'Moth',art:'<ellipse cx="-20" cy="-12" rx="24" ry="30"/><ellipse cx="20" cy="-12" rx="24" ry="30"/><ellipse cx="-17" cy="22" rx="18" ry="22"/><ellipse cx="17" cy="22" rx="18" ry="22"/><rect x="-5" y="-30" width="10" height="75" rx="5"/>'},
 crown:{name:'Chess monarch',art:'<path d="M-28-35L-16-18L0-43L16-18L28-35L22-4H-22Z"/><path d="M-15 0H15L21 30H-21Z"/><rect x="-30" y="30" width="60" height="12" rx="5"/>'},
 rabbit:{name:'Smug rabbit',art:'<ellipse cx="-12" cy="-42" rx="9" ry="28"/><ellipse cx="12" cy="-42" rx="9" ry="28"/><circle cy="-7" r="25"/><ellipse cy="29" rx="23" ry="31"/><circle cx="25" cy="38" r="10"/>'},
 oddball:{name:'Odd little friend',art:'<path d="M-28-30L25-20L16 17L-20 23Z"/><circle cx="-18" cy="-38" r="15"/><rect x="-18" y="14" width="12" height="40"/><path d="M8 14H19L33 54H17Z"/><circle cx="-38" cy="2" r="13"/><path d="M25-8L50 18L21 14Z"/>'},
 mushroom:{name:'Mushroom',art:'<path d="M-45 0Q-35-65 0-60Q35-65 45 0Z"/><path d="M-12 0H12L20 45Q0 58-20 45Z"/>'}
};
const backgrounds={dusk:['#efb18d','#755991'],lagoon:['#b8eadb','#3f799a'],moon:['#d1c7f7','#49477a']};
const escape=text=>String(text).replace(/[&<>"']/g,c=>({'&':'&amp;','<':'&lt;','>':'&gt;','"':'&quot;',"'":'&apos;'}[c]));
function move(item,x,y){return {...item,x:Math.max(45,Math.min(755,x)),y:Math.max(85,Math.min(420,y))};}
function svg(items,background,title,selected=null){const colors=backgrounds[background]||backgrounds.dusk;return `<svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 800 500" role="img" aria-label="Shadow theater"><defs><linearGradient id="sky" x2="0" y2="1"><stop stop-color="${colors[0]}"/><stop offset="1" stop-color="${colors[1]}"/></linearGradient></defs><rect width="800" height="500" fill="url(#sky)"/><circle cx="635" cy="100" r="48" fill="#fff6df" opacity=".65"/><path d="M0 420Q180 380 350 424T800 405V500H0Z" fill="#271c3b" opacity=".3"/><path d="M0 0H85L55 365L0 440ZM800 0H715L745 365L800 440Z" fill="#2c173f"/><path d="M0 0H800V38Q700 100 600 38Q500 100 400 38Q300 100 200 38Q100 100 0 38Z" fill="#432052"/>${items.map(item=>`<g data-id="${item.id}" transform="translate(${item.x} ${item.y}) scale(${item.flip?-item.scale:item.scale} ${item.scale})" fill="#21182f" stroke="${selected===item.id?'#fff6df':'none'}" stroke-width="2">${shapes[item.type].art}</g>`).join('')}<text x="400" y="480" text-anchor="middle" fill="#fff6df" font-family="Georgia,serif" font-size="22">${escape(title)}</text></svg>`;}
const api={shapes,backgrounds,move,svg};if(typeof module!=='undefined')module.exports=api;else root.Theater=api;
})(typeof window==='undefined'?globalThis:window);
