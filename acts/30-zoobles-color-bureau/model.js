(function(root){'use strict';
const targets=[{name:'Emergency Peach',rgb:[235,150,100]},{name:'Suspicious Mint',rgb:[95,205,160]},{name:'After-hours Violet',rgb:[155,95,215]},{name:'Extremely Official Gold',rgb:[240,200,65]},{name:'Borrowed Sky',rgb:[80,160,230]},{name:'Raspberry Complaint',rgb:[210,65,120]}];
function compare(rgb,target){const delta=rgb.map((v,i)=>target[i]-v);return {won:delta.every(d=>Math.abs(d)<=12),score:Math.max(0,Math.round(100-delta.reduce((sum,d)=>sum+Math.abs(d),0)/765*100)),hints:delta.map((d,i)=>`${['Red','Green','Blue'][i]}: ${Math.abs(d)<=12?'close enough':d>0?'add more':'use less'}`)};}
const api={targets,compare};if(typeof module!=='undefined')module.exports=api;else root.Colors=api;
})(typeof window==='undefined'?globalThis:window);
