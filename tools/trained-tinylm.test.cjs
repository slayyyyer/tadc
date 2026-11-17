'use strict';
// Validate the real, shipped weights separately from the trainer's tiny synthetic fixture.
const assert=require('node:assert/strict'),fs=require('node:fs'),path=require('node:path'),vm=require('node:vm');
const root=path.resolve(__dirname,'..'),context={console,Buffer,Float32Array,Uint8Array};
context.window=context;
for(const name of ['corpus','tinylm-weights','tinylm','castbrain'])
  vm.runInNewContext(fs.readFileSync(path.join(root,'assets',name+'.js'),'utf8'),context);
const lm=context.CircusTinyLM, weights=context.CIRCUS_TINYLM_WEIGHTS;
assert.ok(lm.ready);assert.equal(lm.info().speakers.length,8);
assert.ok(fs.statSync(path.join(root,'assets/tinylm-weights.js')).size<3*1024*1024);
for(const t of Object.values(weights.tensors)) {
  const buf=Buffer.from(t.data,'base64');assert.equal(buf.length,t.shape[0]*t.shape[1]*4);
  for(let i=0;i<buf.length;i+=4)assert.ok(Number.isFinite(buf.readFloatLE(i)));
}
const report=JSON.parse(fs.readFileSync(path.join(root,'assets/tinylm-training.json'),'utf8'));
const end=report.history.at(-1);
assert.ok(end.train<report.initial.train*.6);assert.ok(end.validation<report.initial.validation);
context.CircusBrain.setNeuralEnabled(true);
let accepted=0,total=0;const results={};
for(const who of weights.speakers) {
  let count=0;
  for(let seed=1;seed<=10;seed++) {
    const opts={seed},a=lm.generate(who,'',opts),b=lm.generate(who,'',opts);assert.equal(a,b);
    total++;if(a){count++;accepted++;assert.ok(!lm._blocked(a));assert.ok(a.length<=141);}
  }
  results[who]=count;
  assert.equal(typeof context.CircusBrain.improv(who),'string','User always receives a model or fallback line');
}
assert.ok(accepted>=total*.1,'At least 10% of seeded requests should yield accepted novel lines; other requests use fallback');
// Runtime rejection and missing-model fallback must keep conversation working.
context.CircusTinyLM={generate:()=>null};
assert.ok(context.CircusBrain.improv('pomni').length>0);
delete context.CircusTinyLM;assert.ok(context.CircusBrain.improv('jax').length>0);
console.log(JSON.stringify({passed:true,accepted,total,results,loss:end,bytes:report.bytes}));
