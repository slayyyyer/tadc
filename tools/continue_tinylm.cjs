#!/usr/bin/env node
'use strict';
// Warm-start the shipped model. Keep the current release unless validation AND runtime acceptance pass.
const fs=require('node:fs'),path=require('node:path'),vm=require('node:vm'),crypto=require('node:crypto');
const {Model,dataset,rng,shuffle}=require('./train_tinylm.cjs');
const ROOT=path.resolve(__dirname,'..'),RUNS=path.join(ROOT,'tools/training-runs');
const digest=s=>crypto.createHash('sha256').update(s).digest('hex');
const read=relative=>fs.readFileSync(path.join(ROOT,relative),'utf8');
function loadScript(source,key){const context={window:{}};vm.runInNewContext(source,context);return context.window[key];}
const serialize=weights=>'window.CIRCUS_TINYLM_WEIGHTS = '+JSON.stringify(weights)+';\n';
function atomic(file,text){fs.writeFileSync(file+'.tmp',text);fs.renameSync(file+'.tmp',file);}
function state(model,weightsText,corpusHash){
 return {version:1,weightsSha256:digest(weightsText),corpusSha256:corpusHash,steps:model.steps,
   T:Object.fromEntries(Object.entries(model.T).map(([k,v])=>[k,Array.from(v)])),
   M:Object.fromEntries(Object.entries(model.M).map(([k,v])=>[k,Array.from(v)])),
   Q:Object.fromEntries(Object.entries(model.Q).map(([k,v])=>[k,Array.from(v)]))};
}
function restoreOptimizer(model,saved,weightsText,corpusHash){
 if(saved?.version!==1||saved.weightsSha256!==digest(weightsText)||saved.corpusSha256!==corpusHash)return false;
 if(!Number.isSafeInteger(saved.steps)||saved.steps<0)throw new Error('Invalid optimizer step');
 for(const group of ['T','M','Q'])for(const k of Object.keys(model[group])) {
   const values=saved[group]?.[k];
   if(!Array.isArray(values)||values.length!==model[group][k].length||values.some(v=>!Number.isFinite(v)))
     throw new Error('Invalid optimizer tensor '+group+'.'+k);
   if(group==='Q'&&values.some(v=>v<0))throw new Error('Negative optimizer variance');
 }
 for(const group of ['T','M','Q'])for(const k of Object.keys(model[group]))model[group][k].set(saved[group][k]);
 model.steps=saved.steps;return true;
}
function evaluate(weights,corpus,runtime){
 const context={console,Buffer,Float32Array,Uint8Array,CIRCUS_CORPUS:corpus,CIRCUS_TINYLM_WEIGHTS:weights};
 context.window=context;vm.runInNewContext(runtime,context);
 if(!context.CircusTinyLM.ready)throw new Error('Runtime rejected weights');
 const results={},samples={};let accepted=0;
 for(const who of weights.speakers){results[who]=0;samples[who]=[];
  for(let seed=1;seed<=10;seed++){
   const text=context.CircusTinyLM.generate(who,'',{seed});
   if(text){accepted++;results[who]++;if(samples[who].length<2)samples[who].push(text);}
  }
 }
 return {accepted,requests:weights.speakers.length*10,results,samples};
}
function continueTraining({epochs=15,rate=.00015,smoothing=.06,seed=20261005}={}){
 if(!Number.isSafeInteger(epochs)||epochs<1||epochs>200||!Number.isFinite(rate)||rate<=0||rate>.01||
   !Number.isFinite(smoothing)||smoothing<0||smoothing>=1||!Number.isSafeInteger(seed))throw new Error('Invalid training options');
 const corpusText=read('assets/corpus.js'),corpusHash=digest(corpusText);
 const corpus=loadScript(corpusText,'CIRCUS_CORPUS'),data=dataset(corpus);
 const source=read('assets/tinylm-weights.js'),sourceReport=JSON.parse(read('assets/tinylm-training.json'));
 if(sourceReport.corpusSha256!==corpusHash)throw new Error('Corpus changed: do not reuse the old validation split');
 const weights=loadScript(source,'CIRCUS_TINYLM_WEIGHTS'),model=Model.fromWeights(data,weights);
 fs.mkdirSync(RUNS,{recursive:true});const run=path.join(RUNS,'continuation-'+Date.now());fs.mkdirSync(run);
 fs.writeFileSync(path.join(run,'baseline-weights.js'),source);
 fs.writeFileSync(path.join(run,'baseline-report.json'),JSON.stringify(sourceReport,null,2)+'\n');
 const optimizerPath=path.join(RUNS,'active-optimizer.json');let resumed=false;
 if(fs.existsSync(optimizerPath))resumed=restoreOptimizer(model,JSON.parse(fs.readFileSync(optimizerPath,'utf8')),source,corpusHash);
 // Reconstruct the ORIGINAL held-out split. Continuation shuffling uses an independent seed.
 const all=[...data.lines];shuffle(all,rng(sourceReport.seed));
 const valid=all.slice(0,sourceReport.validationLines),training=all.slice(sourceReport.validationLines);
 if(training.length!==sourceReport.trainingLines||!valid.length)throw new Error('Split mismatch');
 const random=rng(seed),runtime=read('assets/tinylm.js');
 const baseline={epoch:sourceReport.completedEpochs,train:model.loss(training),validation:model.loss(valid),
   generation:evaluate(weights,corpus,runtime)};
 const report={run:path.relative(ROOT,run),sourceSha256:digest(source),corpusSha256:corpusHash,
   options:{epochs,rate,smoothing,seed},optimizer:resumed?'resumed saved Adam state':'warm-start weights; fresh Adam state',
   baseline,history:[],selectedEpoch:baseline.epoch,promoted:false,
   selection:'Lowest held-out cross entropy with seeded runtime acceptance at least as high as the baseline. Acceptance is not fluency.',
   limitations:'Selection repeatedly uses the same 43 validation lines; this is not an independent final test. Tiny-corpus output remains experimental.'};
 let best=baseline,selectedText=null,selectedState=null;
 console.log(JSON.stringify({baseline,optimizer:report.optimizer}));
 for(let epoch=1;epoch<=epochs;epoch++){
  shuffle(training,random);
  for(const line of training){model.forward(line,true,smoothing);model.update(rate);}
  if(epoch===1||epoch%5===0||epoch===epochs){
   const w=model.weights(),entry={epoch:baseline.epoch+epoch,train:model.loss(training),validation:model.loss(valid),
     generation:evaluate(w,corpus,runtime)};
   report.history.push(entry);
   const text=serialize(w);fs.writeFileSync(path.join(run,'epoch-'+entry.epoch+'.js'),text);
   if(entry.validation<best.validation && entry.generation.accepted>=baseline.generation.accepted){
    best=entry;selectedText=text;selectedState=state(model,text,corpusHash);report.selectedEpoch=entry.epoch;
   }
   console.log(JSON.stringify({epoch:entry.epoch,train:entry.train,validation:entry.validation,
     accepted:entry.generation.accepted,selectedEpoch:report.selectedEpoch}));
   atomic(path.join(run,'comparison.json'),JSON.stringify(report,null,2)+'\n');
  }
 }
 fs.writeFileSync(path.join(run,'last-optimizer.json'),JSON.stringify(state(model,serialize(model.weights()),corpusHash)));
 if(selectedText){
  // Do not overwrite a release changed by another performer during this training run.
  if(digest(read('assets/tinylm-weights.js'))!==report.sourceSha256)throw new Error('Release changed during training; candidate retained only');
  const next={...sourceReport,epochs:best.epoch,completedEpochs:best.epoch,bytes:Buffer.byteLength(selectedText),
    history:[...sourceReport.history,{epoch:best.epoch,train:best.train,validation:best.validation}],
    runtimeCheck:{seedRange:[1,10],speakers:weights.speakers.length,accepted:best.generation.accepted,
      requests:best.generation.requests,note:'Passing runtime gates is not a fluency score.'},
    continuation:{run:report.run,trainedThroughEpoch:baseline.epoch+epochs,selectedEpoch:best.epoch,
      rate,smoothing,seed,optimizer:report.optimizer,baseline:{validation:baseline.validation,accepted:baseline.generation.accepted}}};
  atomic(path.join(ROOT,'assets/tinylm-weights.js'),selectedText);
  atomic(path.join(ROOT,'assets/tinylm-training.json'),JSON.stringify(next,null,2)+'\n');
  atomic(optimizerPath,JSON.stringify(selectedState));report.promoted=true;
 }
 atomic(path.join(run,'comparison.json'),JSON.stringify(report,null,2)+'\n');
 console.log(JSON.stringify({finished:true,promoted:report.promoted,selectedEpoch:report.selectedEpoch,run:report.run}));
 return report;
}
module.exports={continueTraining,evaluate,state,restoreOptimizer};
if(require.main===module){
 const options={};for(const arg of process.argv.slice(2)){
  const m=/^--(epochs|rate|smoothing|seed)=(\d+(?:\.\d+)?)$/.exec(arg);if(!m)throw new Error('Unknown option: '+arg);
  options[m[1]]=Number(m[2]);
 }continueTraining(options);
}
