'use strict';
// Separate generic-assistant experiment: BOS prompt SEP reply EOS. Only reply + EOS are supervised.
const SPECIAL=['\u0002','\u0003','\u001e','\ufffd'];
const LIMITS={prompt:240,reply:600};
function normalize(text){
 if(typeof text!=='string')throw new Error('Dialogue text must be a string');
 return text.normalize('NFC').replace(/\s+/g,' ').trim();
}
function checked(text,limit){
 const value=normalize(text);
 if(!value||[...value].length>limit||SPECIAL.some(c=>value.includes(c))||/[\u0000-\u001f]/.test(value))
  throw new Error('Invalid, reserved or overlength dialogue text');
 return value;
}
function vocabulary(pairs){
 const chars=new Set();for(const pair of pairs)for(const key of ['prompt','reply']){
  for(const c of checked(pair[key],LIMITS[key]))chars.add(c);
 }
 return [...SPECIAL,...[...chars].sort()];
}
function encode(pair,vocab){
 const ix=new Map(vocab.map((c,i)=>[c,i]));
 const prompt=[...checked(pair.prompt,LIMITS.prompt)].map(c=>ix.get(c)??3);
 const reply=[...checked(pair.reply,LIMITS.reply)].map(c=>ix.get(c)??3);
 return {s:0,ids:[0,...prompt,2,...reply,1],lossStart:prompt.length+1};
}
function makeData(training,validation){
 const vocab=vocabulary(training);
 return {vocab,speakers:['assistant'],lines:training.map(p=>encode(p,vocab)),validation:validation.map(p=>encode(p,vocab))};
}
function pack(model){
 const weights=model.weights();
 return {...weights,version:2,config:{...weights.config,task:'prompt-reply-v1',promptLimit:LIMITS.prompt,maxLen:LIMITS.reply,
  special:{bos:0,eos:1,sep:2,unk:3}}};
}
module.exports={SPECIAL,LIMITS,normalize,checked,vocabulary,encode,makeData,pack};
