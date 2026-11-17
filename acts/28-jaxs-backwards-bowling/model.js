(function(root){'use strict';
const pins=Array.from({length:4},(_,row)=>Array.from({length:row+1},(_,col)=>({x:200+(col-row/2)*35,y:100-row*27}))).flat();
function ball(angle,power){const radians=angle*Math.PI/180;return {x:200,y:555,vx:Math.sin(radians)*power,vy:-Math.cos(radians)*power,age:0};}
function step(b,down,dt){let x=b.x+b.vx*dt,y=b.y+b.vy*dt,vx=b.vx,vy=b.vy;if(x<18){x=18;vx=Math.abs(vx)*.93;}if(x>382){x=382;vx=-Math.abs(vx)*.93;}
 // Two rubber islands invite bank shots and keep the alley delightfully unhelpful.
 for(const obstacle of [{x:130,y:340,r:32},{x:270,y:265,r:32}]){const dx=x-obstacle.x,dy=y-obstacle.y,length=Math.hypot(dx,dy);if(length<obstacle.r+12&&length>0){const nx=dx/length,ny=dy/length,dot=vx*nx+vy*ny;x=obstacle.x+nx*(obstacle.r+12);y=obstacle.y+ny*(obstacle.r+12);if(dot<0){vx-=1.9*dot*nx;vy-=1.9*dot*ny;}}}
 const hit=new Set(down);pins.forEach((p,i)=>{if(Math.hypot(p.x-x,p.y-y)<24)hit.add(i);});
 return {ball:{x,y,vx,vy,age:b.age+dt},down:hit,done:y< -20||y>600||b.age+dt>7};}
const api={pins,ball,step};if(typeof module!=='undefined')module.exports=api;else root.Bowling=api;
})(typeof window==='undefined'?globalThis:window);
