'use strict';
const assert=require('node:assert/strict');
const {Model}=require('./train_tinylm.cjs'),{makeData,encode,pack,SPECIAL}=require('./dialogue-format.cjs');
const {create}=require('./dialogue-runtime.cjs');
const pairs=[{prompt:'red?',reply:'hat'},{prompt:'blue?',reply:'tea'}],data=makeData(pairs,[]);
assert.deepEqual(data.vocab.slice(0,4),SPECIAL);
const row=encode(pairs[0],data.vocab);assert.equal(row.lossStart,5);
assert.equal(row.ids[row.lossStart],2);assert.equal(row.ids.length-1-row.lossStart,4);
assert.equal(encode({prompt:'snowman ☃',reply:'hat'},data.vocab).ids.includes(3),true);
assert.throws(()=>encode({prompt:'x'.repeat(241),reply:'hat'},data.vocab));
const m=new Model(data,{hidden:12,embed:8,seed:4});m.forward(row,true,.03);
for(const k of Object.keys(m.T)){
 const w=m.T[k],i=Math.floor(w.length/2),gradient=m.G[k][i],v=w[i],e=1e-5;
 w[i]=v+e;const plus=m.forward(row,false,.03);w[i]=v-e;const minus=m.forward(row,false,.03);w[i]=v;
 assert.ok(Math.abs(gradient-(plus-minus)/(2*e))<2e-7,'Masked gradient '+k);
}
const promptCharacter=data.vocab.indexOf('r');
assert.ok(m.G.emb.slice(promptCharacter*m.E,(promptCharacter+1)*m.E).some(v=>Math.abs(v)>1e-10),
 'Response loss must backpropagate into prompt-only characters');
const initial=m.loss(data.lines);
for(let epoch=0;epoch<400;epoch++)for(const line of data.lines){m.forward(line,true);m.update(.015);}
assert.ok(m.loss(data.lines)<initial*.05);
const runtime=create(pack(m));
assert.equal(runtime.generate('red?',{temperature:0}),'hat');
assert.equal(runtime.generate('blue?',{temperature:0}),'tea');
assert.equal(runtime.generate('red?',{seed:17}),runtime.generate('red?',{seed:17}));
assert.throws(()=>create(m.weights()),/Unsupported/);
// Cross-check runtime reply likelihood against teacher-forced trainer loss.
for(const pair of pairs){let out=runtime.prefix(pair.prompt),loss=0;
 for(const c of [...pair.reply,'\u0003']){const target=data.vocab.indexOf(c),max=Math.max(...out.logits);
  loss+=max+Math.log([...out.logits].reduce((sum,v)=>sum+Math.exp(v-max),0))-out.logits[target];
  out=runtime.step(out.h,target);}
 assert.ok(Math.abs(loss/(pair.reply.length+1)-m.forward(encode(pair,data.vocab)))<1e-6);
}
console.log('PASS: reply-only boundaries, unknown/length handling, masked numerical gradients, prompt gradient flow, learned prompt-dependent replies, runtime/trainer parity and v2 isolation.');
const fs=require('node:fs'),path=require('node:path'),vm=require('node:vm');
const context={CIRCUS_TINYLM_WEIGHTS:pack(m),console};context.window=context;
vm.runInNewContext(fs.readFileSync(path.join(__dirname,'../assets/tinylm.js'),'utf8'),context);
assert.equal(context.CircusTinyLM.ready,false,'Legacy browser runtime refuses experimental version-2 weights');
const root=path.join(__dirname,'../datasets/openassistant-oasst1');
const train=fs.readFileSync(path.join(root,'reviewed-train.jsonl'),'utf8').trim().split('\n').map(JSON.parse);
const valid=fs.readFileSync(path.join(root,'reviewed-validation.jsonl'),'utf8').trim().split('\n').map(JSON.parse);
const trainTrees=new Set(train.map(p=>p.conversation_id));
assert.ok(valid.every(p=>!trainTrees.has(p.conversation_id)));
const reviewedData=makeData(train,valid);assert.equal(reviewedData.speakers.join(','),'assistant');
assert.equal(reviewedData.lines.length,26);assert.equal(reviewedData.validation.length,6);
console.log('PASS: actual reviewed split separation, generic-only identity and legacy runtime isolation.');
