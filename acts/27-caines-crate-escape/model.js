(function(root){'use strict';
const levels=[
 ['#######','#     #','# @$ .#','#     #','#######'],
 ['#######','# . . #','# $ $ #','#  @  #','#     #','#######'],
 ['########','#   .  #','# $    #','#  #   #','# @ $. #','#      #','########'],
 ['########','# .  . #','# $  $ #','#  ##  #','# $ .  #','#  @   #','#      #','########']
];
function make(index){const map=levels[index],width=map[0].length,walls=[],goals=[],boxes=[];let player;
 map.forEach((row,y)=>[...row].forEach((c,x)=>{const id=y*width+x;if(c==='#')walls.push(id);if(c==='.')goals.push(id);if(c==='$')boxes.push(id);if(c==='@')player=id;}));return {width,height:map.length,walls,goals,boxes,player,moves:0,pushes:0};}
function won(s){return s.boxes.every(id=>s.goals.includes(id));}
function move(s,dx,dy){const x=s.player%s.width,y=Math.floor(s.player/s.width),nx=x+dx,ny=y+dy;if(nx<0||nx>=s.width||ny<0||ny>=s.height)return s;const next=ny*s.width+nx;if(s.walls.includes(next))return s;const boxes=[...s.boxes],box=boxes.indexOf(next);if(box>=0){const bx=nx+dx,by=ny+dy,beyond=by*s.width+bx;if(bx<0||bx>=s.width||by<0||by>=s.height||s.walls.includes(beyond)||boxes.includes(beyond))return s;boxes[box]=beyond;}return {...s,boxes,player:next,moves:s.moves+1,pushes:s.pushes+(box>=0?1:0)};}
// Incremental breadth-first search: shortest walking path, with safe corner pruning.
function planner(initial, limit=50000) {
 const key=s=>s.player+':'+[...s.boxes].sort((a,b)=>a-b).join(',');
 const directions=[[0,-1],[-1,0],[0,1],[1,0]];
 const queue=[{state:initial,first:null,depth:0}],seen=new Set([key(initial)]);let head=0,result;
 const corner=s=>s.boxes.some(b=>!s.goals.includes(b)&&
   (s.walls.includes(b-1)||s.walls.includes(b+1))&&(s.walls.includes(b-s.width)||s.walls.includes(b+s.width)));
 return {advance(budget=256) {
  if(result)return result;
  for(let count=0;count<budget&&head<queue.length;count++) {
   const node=queue[head++];
   if(won(node.state))return result={status:'solved',direction:node.first,distance:node.depth};
   for(const direction of directions) {
    const next=move(node.state,...direction);if(next===node.state||corner(next))continue;
    const k=key(next);if(seen.has(k))continue;
    if(seen.size>=limit)return result={status:'limit'};
    seen.add(k);queue.push({state:next,first:node.first||direction,depth:node.depth+1});
   }
  }
  if(head===queue.length)return result={status:'stuck'};
  return {status:'searching'};
 }};
}
const api={levels,make,move,won,planner};if(typeof module!=='undefined')module.exports=api;else root.Crates=api;
})(typeof window==='undefined'?globalThis:window);
