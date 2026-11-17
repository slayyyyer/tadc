(function(root){'use strict';
const ingredients=[['☀️','Sunbeam'],['❄️','Frost'],['☁️','Cloud fluff'],['😄','Giggle'],['💧','Raindrop'],['⭐','Stardust']];
const recipes=[{pair:[0,2],name:'Sunrise Soufflé',icon:'🌅',clue:'A little warmth meets something soft.'},{pair:[2,4],name:'Rainy-Day Pudding',icon:'🍮',clue:'Give a cloud something to drizzle.'},{pair:[0,1],name:'Rainbow Steam',icon:'🌈',clue:'Warm and cold should probably not share a bowl.'},{pair:[3,5],name:'Laughing Star Biscuits',icon:'🍪',clue:'Make the night sky laugh.'},{pair:[1,5],name:'Midnight Sorbet',icon:'🍧',clue:'The stars would like something frozen.'},{pair:[3,3],name:'Double-Giggle Jam',icon:'🫙',clue:'A joke is better when you tell it twice.'}];
function mix(pair){if(pair.length!==2)return null;const key=[...pair].sort().join(',');return recipes.find(r=>[...r.pair].sort().join(',')===key)||{name:'A Very Interesting Experiment',icon:'🫧',clue:'Ragatha calls it “promising.” The spoon calls it “wobbly.”'};}
const api={ingredients,recipes,mix};if(typeof module!=='undefined')module.exports=api;else root.Kitchen=api;
})(typeof window==='undefined'?globalThis:window);
