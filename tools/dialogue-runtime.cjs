'use strict';
// Research-only inference for version-2 prompt/reply weights. Not loaded by the circus pages.
const {Model,rng}=require('./train_tinylm.cjs');
const {SPECIAL,checked}=require('./dialogue-format.cjs');
function create(weights){
 if(weights.version!==2||weights.config?.task!=='prompt-reply-v1'||
  JSON.stringify(weights.vocab.slice(0,4))!==JSON.stringify(SPECIAL)||
  JSON.stringify(weights.config.special)!==JSON.stringify({bos:0,eos:1,sep:2,unk:3})||
  JSON.stringify(weights.speakers)!=='["assistant"]')throw new Error('Unsupported dialogue format');
 const model=Model.fromWeights({vocab:weights.vocab,speakers:weights.speakers},{...weights,version:1});
 const {T,E,H,V}=model,ix=new Map(weights.vocab.map((c,i)=>[c,i]));
 function step(h,c){
  const x=Float64Array.from({length:E},(_,j)=>T.emb[c*E+j]+T.spk[j]);
  const next=new Float64Array(H);
  for(let i=0;i<H;i++){
   let z=T.bz[i],r=T.br[i],n=T.bn[i],u=T.bun[i];
   for(let j=0;j<E;j++){const q=i*E+j;z+=T.Wz[q]*x[j];r+=T.Wr[q]*x[j];n+=T.Wn[q]*x[j];}
   for(let j=0;j<H;j++){const q=i*H+j;z+=T.Uz[q]*h[j];r+=T.Ur[q]*h[j];u+=T.Un[q]*h[j];}
   z=1/(1+Math.exp(-z));r=1/(1+Math.exp(-r));next[i]=(1-z)*Math.tanh(n+r*u)+z*h[i];
  }
  const logits=Float64Array.from(T.bo);
  for(let i=0;i<V;i++)for(let j=0;j<H;j++)logits[i]+=T.Wo[i*H+j]*next[j];
  return {h:next,logits};
 }
 function prefix(prompt){
  const text=checked(prompt,weights.config.promptLimit);
  const tokens=[0,...[...text].map(c=>ix.get(c)??3),2];let out={h:new Float64Array(H)};
  for(const token of tokens)out=step(out.h,token);
  return out;
 }
 function generate(prompt,{seed=1,temperature=.6,maxLen=140}={}){
  if(!Number.isFinite(temperature)||temperature<0||!Number.isInteger(maxLen)||maxLen<1||maxLen>weights.config.maxLen)
   throw new Error('Invalid generation options');
  let out=prefix(prompt),text='';const random=rng(seed);
  for(let t=0;t<maxLen;t++){
   const ids=Array.from({length:V},(_,i)=>i).filter(i=>i===1||i>3).sort((a,b)=>out.logits[b]-out.logits[a]);
   let c=ids[0];
   if(temperature>0){const top=ids.slice(0,8),max=out.logits[top[0]],p=top.map(i=>Math.exp((out.logits[i]-max)/temperature));
    let sample=random()*p.reduce((a,b)=>a+b,0);for(let i=0;i<top.length;i++){sample-=p[i];if(sample<=0){c=top[i];break;}}}
   if(c===1)break;text+=weights.vocab[c];out=step(out.h,c);
  }
  return text;
 }
 return {generate,prefix,step};
}
module.exports={create};
