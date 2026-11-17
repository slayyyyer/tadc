(function(root){'use strict';
const ingredients={tea:'🫖 Moon tea',milk:'🥛 Cloud milk',honey:'🍯 Honey',lemon:'🍋 Lemon',mint:'🌿 Mint',sugar:'🧊 Sugar cube'};
const orders=[
 {guest:'Pomni',items:['tea','honey'],temperature:'warm',stir:true,line:'Something warm and a little sweet. Stir it, please. I have done enough spinning today.'},
 {guest:'Kinger',items:['tea','mint'],temperature:'cold',stir:false,line:'Cold tea with one mint leaf. Do not stir! There may be a beetle sleeping on the spoon.'},
 {guest:'Gangle',items:['tea','milk','honey'],temperature:'warm',stir:true,line:'Warm moon tea, cloud milk, and honey. All mixed together, if that is okay.'},
 {guest:'Jax',items:['tea','lemon','lemon'],temperature:'cold',stir:false,line:'Cold. Two lemons. No sugar. No stirring. I like my tea as difficult as I am.'},
 {guest:'Zooble',items:['tea','mint','lemon'],temperature:'warm',stir:true,line:'Warm, mint, lemon. Stir. See? A perfectly normal request. For once.'},
 {guest:'Caine',items:['tea','sugar','sugar','milk'],temperature:'warm',stir:true,line:'TWO sugar cubes, cloud milk, and a GRAND stirring! Warm enough for a dramatic introduction!'},
 {guest:'Bubble',items:['tea','honey','mint'],temperature:'cold',stir:true,line:'Cold honey-mint tea! Stir it! Can I eat the cup? Fine, just the tea.'},
 {guest:'Ragatha',items:['tea','milk'],temperature:'warm',stir:false,line:'A warm tea with milk on top. No stirring for mine. You remembered to make a cup for yourself too, right?'}
];
function check(cup,order){if(cup.items[0]!=='tea')return 'Start with moon tea before adding the extras.';
 if([...cup.items].sort().join(',')!==[...order.items].sort().join(','))return 'The ingredients or quantities are not quite right. Read the order, then try a fresh cup.';
 if(cup.temperature!==order.temperature)return `This guest asked for ${order.temperature} tea.`;
 if(cup.stir!==order.stir)return order.stir?'This cup still needs a stir.':'This guest asked for an unstirred cup. Try a fresh cup.';
 return null;}
const api={ingredients,orders,check};if(typeof module!=='undefined')module.exports=api;else root.Tea=api;
})(typeof window==='undefined'?globalThis:window);
