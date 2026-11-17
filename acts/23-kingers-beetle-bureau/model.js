(function(root){'use strict';
const insects=['🐞','🦋','🐝','🪲','🐛','🦗','🕷️','🐜'];
function make(random=Math.random){const cards=[...insects,...insects];for(let i=cards.length-1;i>0;i--){const j=Math.floor(random()*(i+1));[cards[i],cards[j]]=[cards[j],cards[i]];}return {cards,open:[],matched:[],turns:0};}
function flip(game,index){if(index<0||index>=game.cards.length||game.open.length===2||game.open.includes(index)||game.matched.includes(index))return false;
 game.open.push(index);if(game.open.length===2){game.turns++;if(game.cards[game.open[0]]===game.cards[game.open[1]]){game.matched.push(...game.open);game.open=[];return 'match';}return 'miss';}return 'first';}
const api={make,flip};if(typeof module!=='undefined')module.exports=api;else root.Beetles=api;
})(typeof window==='undefined'?globalThis:window);
