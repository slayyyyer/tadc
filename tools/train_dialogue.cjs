#!/usr/bin/env node
'use strict';
// Isolated generic-dialogue pilot. Never overwrites the active cast model or opens the sealed test split.
const fs=require('node:fs'),path=require('node:path'),crypto=require('node:crypto');
const {Model,rng,shuffle}=require('./train_tinylm.cjs');
const {makeData,encode,pack}=require('./dialogue-format.cjs');
const {create}=require('./dialogue-runtime.cjs');
const ROOT=path.resolve(__dirname,'..'),DIR=path.join(ROOT,'datasets/openassistant-oasst1');
const hash=data=>crypto.createHash('sha256').update(data).digest('hex');
function readReviewed(split,review){
 const bytes=fs.readFileSync(path.join(DIR,'reviewed-'+split+'.jsonl'));
 if(hash(bytes)!==review.splits[split].output_sha256)throw new Error('Reviewed dataset changed: '+split);
 return bytes.toString('utf8').trim().split('\n').map(line=>JSON.parse(line));
}
function run({epochs=40,seed=20261006,hidden=64,embed=24}={}){
 if(!Number.isInteger(epochs)||epochs<1||epochs>200)throw new Error('Invalid epoch count');
 const review=JSON.parse(fs.readFileSync(path.join(DIR,'review.json'),'utf8'));
 const train=readReviewed('train',review),valid=readReviewed('validation',review);
 const trainTrees=new Set(train.map(p=>p.conversation_id));
 if(valid.some(p=>trainTrees.has(p.conversation_id)))throw new Error('Conversation split overlap');
 const data=makeData(train,valid),model=new Model(data,{hidden,embed,seed}),random=rng(seed);
 const shuffled=valid.map((pair,i)=>encode({...pair,prompt:valid[(i+1)%valid.length].prompt},data.vocab));
 const measure=epoch=>({epoch,train:model.loss(data.lines),validation:model.loss(data.validation),
   shuffledPromptLoss:model.loss(shuffled)});
 const initial=measure(0),report={task:'prompt-reply-v1',seed,epochs,hidden,embed,trainingPairs:train.length,
  validationPairs:valid.length,vocab:data.vocab.length,initial,history:[],
  dataset:{train:review.splits.train.output_sha256,validation:review.splits.validation.output_sha256},
  unknownValidationTargets:data.validation.reduce((n,l)=>n+l.ids.slice(l.lossStart+1).filter(i=>i===3).length,0),
  scope:'Generic assistant only. Public responses are not assigned to cast members. Sealed test split untouched.',
  limitations:'26 training pairs and 6 validation pairs: thanks-heavy, insufficient for broad dialogue claims. Validation is reused for selection. Positive shuffled-prompt gap alone does not prove useful comprehension.',
  promoted:false};
 const destination=path.join(ROOT,'tools/training-runs','dialogue-'+Date.now());fs.mkdirSync(destination,{recursive:true});
 let best=initial,bestWeights=pack(model),stale=0;
 console.log(JSON.stringify({initial,trainingPairs:train.length,validationPairs:valid.length}));
 for(let epoch=1;epoch<=epochs;epoch++){
  shuffle(data.lines,random);const rate=epoch>20?.001:.002;
  for(const line of data.lines){model.forward(line,true,.02);model.update(rate);}
  if(epoch===1||epoch%5===0||epoch===epochs){
   const result=measure(epoch);report.history.push(result);
   if(result.validation<best.validation){best=result;bestWeights=pack(model);stale=0;}else stale++;
   console.log(JSON.stringify(result));
   report.trainedThroughEpoch=epoch;report.selected=best;
   fs.writeFileSync(path.join(destination,'report.json'),JSON.stringify(report,null,2)+'\n');
   if(stale>=4){report.stoppedEarly=true;break;}
  }
 }
 const runtime=create(bestWeights);
 report.samples=valid.map(pair=>({prompt:pair.prompt,reference:pair.reply,
   generated:runtime.generate(pair.prompt,{seed:31,maxLen:140})}));
 report.selectedPromptGap=best.shuffledPromptLoss-best.validation;
 report.outputSha256=hash(JSON.stringify(bestWeights));
 fs.writeFileSync(path.join(destination,'weights.json'),JSON.stringify(bestWeights)+'\n');
 fs.copyFileSync(path.join(DIR,'LICENSE'),path.join(destination,'LICENSE'));
 fs.writeFileSync(path.join(destination,'ATTRIBUTION.txt'),
  'Experimental weights trained on a reviewed subset of OpenAssistant/oasst1 (Apache-2.0).\n'+
  'Source: https://huggingface.co/datasets/OpenAssistant/oasst1\n'+
  'Derived dataset review/provenance: datasets/openassistant-oasst1/.\n'+
  'Not original circus dialogue; not a production assistant. Test split was not used.\n');
 fs.writeFileSync(path.join(destination,'report.json'),JSON.stringify(report,null,2)+'\n');
 console.log(JSON.stringify({finished:true,run:path.relative(ROOT,destination),selected:best,promptGap:report.selectedPromptGap,promoted:false}));
 return report;
}
module.exports={run};
if(require.main===module){
 const options={};for(const arg of process.argv.slice(2)){
  const m=/^--epochs=(\d+)$/.exec(arg);if(!m)throw new Error('Usage: node tools/train_dialogue.cjs [--epochs=40]');
  options.epochs=Number(m[1]);
 }run(options);
}
