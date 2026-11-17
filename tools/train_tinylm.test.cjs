'use strict';
const assert=require('node:assert/strict');
const {Model,dataset}=require('./train_tinylm.cjs');
const data=dataset({caine:['big top','big tent'],jax:['small top','small tent']});
const model=new Model(data,{embed:3,hidden:4,seed:7}),line=data.lines[0];
model.forward(line,true);
// Finite differences across EVERY tensor catch gate, reset and recurrent gradient errors.
for(const k of Object.keys(model.T)) {
  const w=model.T[k],g=Float64Array.from(model.G[k]);
  for(const i of new Set([0,Math.floor(w.length/2),w.length-1])) {
    const before=w[i],epsilon=1e-5;
    w[i]=before+epsilon;const plus=model.forward(line);
    w[i]=before-epsilon;const minus=model.forward(line);w[i]=before;
    const numeric=(plus-minus)/(2*epsilon);
    assert.ok(Math.abs(numeric-g[i])<2e-7,`${k}[${i}]: ${numeric} vs ${g[i]}`);
  }
}
const initial=model.loss(data.lines);
for(let epoch=0;epoch<120;epoch++)for(const row of data.lines){model.forward(row,true);model.update(.015);}
assert.ok(model.loss(data.lines)<initial*.35,'Training substantially reduces loss');
const a=new Model(data,{embed:3,hidden:4,seed:9}),b=new Model(data,{embed:3,hidden:4,seed:9});
for(const row of data.lines){a.forward(row,true);a.update();b.forward(row,true);b.update();}
assert.deepEqual(a.weights(),b.weights(),'Seeded training is exactly reproducible');
globalThis.CIRCUS_TINYLM_WEIGHTS=model.weights();globalThis.CIRCUS_CORPUS={};
const lm=require('../assets/tinylm.js');assert.ok(lm.ready);
const opts={seed:21,minLen:3,minWords:1,temperature:.4};
const result=lm.generate('caine','',opts);assert.ok(result);assert.equal(result,lm.generate('caine','',opts));
console.log('PASS: numerical gradients for all tensor families, learned loss reduction, deterministic training, v1 export/runtime generation.');

const restored=Model.fromWeights(data,model.weights());
assert.ok(Math.abs(restored.loss(data.lines)-model.loss(data.lines))<1e-6,'Float32 weights warm-start the same model');
assert.throws(()=>Model.fromWeights({...data,vocab:['wrong']},model.weights()));
const invalid=model.weights();invalid.tensors.emb.data='';assert.throws(()=>Model.fromWeights(data,invalid));
const smooth=new Model(data,{embed:3,hidden:4,seed:5});smooth.forward(line,true,.08);
for(const k of Object.keys(smooth.T)) {
 const w=smooth.T[k],i=Math.floor(w.length/2),g=smooth.G[k][i],v=w[i],epsilon=1e-5;
 w[i]=v+epsilon;const plus=smooth.forward(line,false,.08);
 w[i]=v-epsilon;const minus=smooth.forward(line,false,.08);w[i]=v;
 assert.ok(Math.abs((plus-minus)/(2*epsilon)-g)<2e-7,'Smoothed gradient: '+k);
}
assert.throws(()=>smooth.forward(line,true,1));
console.log('PASS: validated weight warm-start and numerical gradients with label smoothing.');
const {state:saveState,restoreOptimizer}=require('./continue_tinylm.cjs');
const saved=saveState(model,'fixture','corpus'),continued=Model.fromWeights(data,model.weights());
assert.ok(restoreOptimizer(continued,saved,'fixture','corpus'));
model.forward(line,true,.06);model.update(.00015);continued.forward(line,true,.06);continued.update(.00015);
assert.deepEqual(model.weights(),continued.weights(),'Optimizer resume reproduces the next update exactly');
assert.equal(restoreOptimizer(continued,saved,'different','corpus'),false,'Unrelated weights cannot reuse stale Adam state');
console.log('PASS: exact optimizer continuation and stale-state rejection.');
const corrupt=JSON.parse(JSON.stringify(saved));corrupt.Q.emb[0]=-1;
assert.throws(()=>restoreOptimizer(continued,corrupt,'fixture','corpus'),/variance/);
assert.equal(restoreOptimizer(continued,saved,'fixture','changed corpus'),false);
const {continueTraining}=require('./continue_tinylm.cjs');
assert.throws(()=>continueTraining({epochs:0}),/Invalid training options/);
console.log('PASS: corrupt optimizer and invalid continuation settings rejected.');
