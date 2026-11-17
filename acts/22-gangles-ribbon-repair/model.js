(function(root){
'use strict';
const directions=[[-1,0],[0,1],[1,0],[0,-1]];
function rotate(mask){return ((mask<<1)&15)|(mask>>3);}
function make(size,random=Math.random){
 const path=[];
 for(let r=0;r<size;r++)for(let c=0;c<size;c++)path.push(r*size+(r%2?size-1-c:c));
 const base=Array(size*size).fill(0);
 function join(a,b){const ar=Math.floor(a/size),ac=a%size,br=Math.floor(b/size),bc=b%size;
  const d=directions.findIndex(([dr,dc])=>ar+dr===br&&ac+dc===bc);base[a]|=1<<d;base[b]|=1<<((d+2)%4);}
 for(let i=1;i<path.length;i++)join(path[i-1],path[i]);
 base[0]|=8;const end=path.at(-1),out=size%2?1:3;base[end]|=1<<out;
 const tiles=base.map(mask=>{for(let i=0,n=Math.floor(random()*4);i<n;i++)mask=rotate(mask);return mask;});
 const game={size,base,tiles,end,out,moves:0};if(check(game).won)tiles[0]=rotate(tiles[0]);return game;
}
function check(game){
 const {size,tiles,end,out}=game,seen=new Set(),queue=[];
 if(tiles[0]&8){queue.push(0);seen.add(0);}
 while(queue.length){const cell=queue.shift(),r=Math.floor(cell/size),c=cell%size;
  directions.forEach(([dr,dc],d)=>{const nr=r+dr,nc=c+dc,n=nr*size+nc;
   if(nr>=0&&nr<size&&nc>=0&&nc<size&&(tiles[cell]&(1<<d))&&(tiles[n]&(1<<((d+2)%4)))&&!seen.has(n)){seen.add(n);queue.push(n);}});}
 return {seen,won:seen.size===tiles.length&&seen.has(end)&&!!(tiles[end]&(1<<out))};
}
const api={rotate,make,check};if(typeof module!=='undefined')module.exports=api;else root.Ribbon=api;
})(typeof window==='undefined'?globalThis:window);
