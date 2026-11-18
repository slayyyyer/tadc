(function(root){
'use strict';
// Three masks, eight monologues. Every line is original to this fan project.
const masks={comedy:{icon:'😄',label:'Comedy'},tragedy:{icon:'😢',label:'Tragedy'},both:{icon:'🎭',label:'Both at once'}};
const scripts=[
 {guest:'Jax',mask:'comedy',line:'I swapped every chess piece for a rubber chicken. Kinger has been playing for four hours. He is winning.',note:'Nobody is upset and something ridiculous happened. That is comedy.'},
 {guest:'Caine',mask:'comedy',line:'I have prepared a surprise! The surprise is more circus. Please do not ask follow-up questions.',note:'A gift that is also a threat, delivered with a grin. Comedy.'},
 {guest:'Bubble',mask:'comedy',line:'I ate the script. It was delicious. It said not to eat the script. I read that part afterwards.',note:'The consequences arrive late and cheerfully. Comedy.'},
 {guest:'Pomni',mask:'tragedy',line:'I keep a list of every door I have tried. It is very long. I read it at night in case it turns into a map.',note:'Hope is doing all the work and getting nothing back. Tragedy.'},
 {guest:'Kinger',mask:'tragedy',line:'The pillow fort held all night. Nobody needed me to defend it. I stayed awake anyway, just in case.',note:'Something was guarded that did not need guarding. Tragedy.'},
 {guest:'Ragatha',mask:'tragedy',line:'You are okay. You are SO okay. I tell everyone that, mostly so I keep believing it.',note:'The reassurance is for the person giving it. Tragedy.'},
 {guest:'Gangle',mask:'both',line:'I made a happy mask and a sad mask. Today I wore both, and nobody asked which one was real.',note:'It is funny how much that stings. Both masks, one heart.'},
 {guest:'Zooble',mask:'both',line:'I keep taking myself apart to see what is left. Turns out it is mostly me. That is either reassuring or the problem.',note:'A joke with the floor missing. Both at once.'}
];
const MAX_HEARTS=scripts.length*2;
function judge(script,choice){return !!script&&Object.prototype.hasOwnProperty.call(masks,choice)&&script.mask===choice;}
function icon(id){return masks[id]?masks[id].icon:'';}
const api={masks,scripts,MAX_HEARTS,judge,icon};if(typeof module!=='undefined')module.exports=api;else root.Audition=api;
})(typeof window==='undefined'?globalThis:window);
