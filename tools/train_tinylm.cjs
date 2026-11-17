#!/usr/bin/env node
'use strict';
// Dependency-free, speaker-conditioned GRU. Full backpropagation through each line; Adam + gradient clipping.
const fs = require('node:fs');
const path = require('node:path');
const vm = require('node:vm');
const crypto = require('node:crypto');
const ROOT = path.resolve(__dirname, '..');
const rng = seed => { let a = seed >>> 0; return () => {
  a = (a + 0x6D2B79F5) >>> 0; let t = a;
  t = Math.imul(t ^ t >>> 15, t | 1); t ^= t + Math.imul(t ^ t >>> 7, t | 61);
  return ((t ^ t >>> 14) >>> 0) / 4294967296;
}; };
const zeros = n => new Float64Array(n);
const sig = x => 1 / (1 + Math.exp(-x));
function dataset(corpus) {
  const speakers = Object.keys(corpus), vocab = ['\u0002', '\u0003'];
  const lines = speakers.flatMap((who, s) => corpus[who].map(text => ({s, text: text.normalize('NFC')})));
  vocab.push(...[...new Set(lines.flatMap(l => [...l.text]))].filter(c => !vocab.includes(c)).sort());
  const ix = new Map(vocab.map((c, i) => [c, i]));
  return {speakers, vocab, lines: lines.map(l => ({s: l.s, ids: [0, ...[...l.text].map(c => ix.get(c)), 1]}))};
}
class Model {
  constructor(data, {embed = 24, hidden = 64, seed = 20261004} = {}) {
    this.data = data; this.E = embed; this.H = hidden; this.V = data.vocab.length;
    const E = embed, H = hidden, V = this.V, S = data.speakers.length;
    this.shapes = {emb:[V,E], spk:[S,E], Wz:[H,E], Wr:[H,E], Wn:[H,E],
      Uz:[H,H], Ur:[H,H], Un:[H,H], bz:[1,H], br:[1,H], bn:[1,H], bun:[1,H], Wo:[V,H], bo:[1,V]};
    this.T = {}; this.G = {}; this.M = {}; this.Q = {}; this.steps = 0;
    const random = rng(seed);
    for (const [k, [r,c]] of Object.entries(this.shapes)) {
      const scale = Math.sqrt(6 / (r + c));
      this.T[k] = Float64Array.from({length:r*c}, () => k.startsWith('b') ? 0 : (random()*2-1)*scale);
      this.G[k] = zeros(r*c); this.M[k] = zeros(r*c); this.Q[k] = zeros(r*c);
    }
  }
  static fromWeights(data, weights) {
    if(weights.version!==1 || weights.config?.arch!=='gru' ||
      JSON.stringify(data.vocab)!==JSON.stringify(weights.vocab) ||
      JSON.stringify(data.speakers)!==JSON.stringify(weights.speakers)) throw new Error('Weights/corpus contract mismatch');
    const model=new Model(data,{embed:weights.config.embed,hidden:weights.config.hidden});
    for(const [k,shape] of Object.entries(model.shapes)) {
      const tensor=weights.tensors[k];
      if(!tensor || JSON.stringify(tensor.shape)!==JSON.stringify(shape))throw new Error('Invalid tensor shape: '+k);
      const bytes=Buffer.from(tensor.data,'base64');
      if(bytes.length!==model.T[k].length*4)throw new Error('Invalid tensor bytes: '+k);
      for(let i=0;i<model.T[k].length;i++) {
        const value=bytes.readFloatLE(i*4);if(!Number.isFinite(value))throw new Error('Nonfinite tensor: '+k);
        model.T[k][i]=value;
      }
    }
    return model;
  }
  forward(line, backward = false, smoothing = 0) {
    if(!Number.isFinite(smoothing)||smoothing<0||smoothing>=1)throw new Error('Invalid label smoothing');
    const {E,H,V,T,G} = this, cache = []; let h = zeros(H), loss = 0;
    const lossStart=line.lossStart ?? 0;
    if(!Number.isInteger(lossStart)||lossStart<0||lossStart>=line.ids.length-1)throw new Error('Invalid response loss boundary');
    const length=line.ids.length-1-lossStart;
    for (let t = 0; t < line.ids.length - 1; t++) {
      const c = line.ids[t], target = line.ids[t+1], x = zeros(E);
      for (let j=0;j<E;j++) x[j]=T.emb[c*E+j]+T.spk[line.s*E+j];
      const z=zeros(H), r=zeros(H), n=zeros(H), u=zeros(H), next=zeros(H);
      for(let i=0;i<H;i++) {
        let az=T.bz[i], ar=T.br[i], an=T.bn[i], au=T.bun[i];
        for(let j=0;j<E;j++) { const q=i*E+j; az+=T.Wz[q]*x[j]; ar+=T.Wr[q]*x[j]; an+=T.Wn[q]*x[j]; }
        for(let j=0;j<H;j++) { const q=i*H+j; az+=T.Uz[q]*h[j]; ar+=T.Ur[q]*h[j]; au+=T.Un[q]*h[j]; }
        z[i]=sig(az); r[i]=sig(ar); u[i]=au; n[i]=Math.tanh(an+r[i]*au);
        next[i]=(1-z[i])*n[i]+z[i]*h[i];
      }
      const p=zeros(V); let max=-Infinity, sum=0;
      for(let i=0;i<V;i++) { let a=T.bo[i]; for(let j=0;j<H;j++) a+=T.Wo[i*H+j]*next[j]; p[i]=a; max=Math.max(max,a); }
      const logit=(1-smoothing)*p[target]+smoothing*p.reduce((a,b)=>a+b,0)/V;
      for(let i=0;i<V;i++) {p[i]=Math.exp(p[i]-max);sum+=p[i];}
      if(t>=lossStart)loss+=max+Math.log(sum)-logit;
      for(let i=0;i<V;i++) p[i]/=sum;
      if(backward) cache.push({c,target,x,z,r,n,u,h,next,p,supervised:t>=lossStart});
      h=next;
    }
    if(backward) {
      for(const g of Object.values(G)) g.fill(0);
      let dh=zeros(H);
      for(let t=cache.length-1;t>=0;t--) {
        const a=cache[t], {c,target,x,z,r,n,u,h,next,p}=a;
        for(let i=0;i<V;i++) {
          const d=a.supervised?(p[i]-((i===target?1-smoothing:0)+smoothing/V))/length:0; G.bo[i]+=d;
          for(let j=0;j<H;j++) {const q=i*H+j;G.Wo[q]+=d*next[j];dh[j]+=T.Wo[q]*d;}
        }
        const dx=zeros(E), prev=zeros(H);
        for(let i=0;i<H;i++) {
          const dn=dh[i]*(1-z[i])*(1-n[i]*n[i]);
          const dz=dh[i]*(h[i]-n[i])*z[i]*(1-z[i]);
          const dr=dn*u[i]*r[i]*(1-r[i]), du=dn*r[i];
          prev[i]+=dh[i]*z[i]; G.bz[i]+=dz;G.br[i]+=dr;G.bn[i]+=dn;G.bun[i]+=du;
          for(let j=0;j<E;j++) {
            const q=i*E+j; G.Wz[q]+=dz*x[j];G.Wr[q]+=dr*x[j];G.Wn[q]+=dn*x[j];
            dx[j]+=T.Wz[q]*dz+T.Wr[q]*dr+T.Wn[q]*dn;
          }
          for(let j=0;j<H;j++) {
            const q=i*H+j;G.Uz[q]+=dz*h[j];G.Ur[q]+=dr*h[j];G.Un[q]+=du*h[j];
            prev[j]+=T.Uz[q]*dz+T.Ur[q]*dr+T.Un[q]*du;
          }
        }
        for(let j=0;j<E;j++){G.emb[c*E+j]+=dx[j];G.spk[line.s*E+j]+=dx[j];}
        dh=prev;
      }
    }
    return loss/length;
  }
  update(rate=0.002) {
    let norm=0; for(const g of Object.values(this.G))for(const v of g)norm+=v*v;
    const scale=Math.min(1,5/(Math.sqrt(norm)||1));
    this.steps++; const mCorrection=1-Math.pow(.9,this.steps), qCorrection=1-Math.pow(.999,this.steps);
    for(const k of Object.keys(this.T)) {
      const w=this.T[k],g=this.G[k],m=this.M[k],q=this.Q[k];
      for(let i=0;i<w.length;i++) {const d=g[i]*scale;m[i]=.9*m[i]+.1*d;q[i]=.999*q[i]+.001*d*d;
        w[i]-=rate*(m[i]/mCorrection)/(Math.sqrt(q[i]/qCorrection)+1e-8);}
    }
  }
  loss(lines) {let total=0,count=0;for(const l of lines){const n=l.ids.length-1-(l.lossStart??0);total+=this.forward(l)*n;count+=n;}return total/count;}
  weights() {
    const tensors={};
    for(const [k,values] of Object.entries(this.T)) {
      const bytes=Buffer.alloc(values.length*4);
      values.forEach((v,i)=>{if(!Number.isFinite(v))throw new Error('Nonfinite weights');bytes.writeFloatLE(v,i*4);});
      tensors[k]={shape:this.shapes[k],data:bytes.toString('base64')};
    }
    return {version:1,vocab:this.data.vocab,speakers:this.data.speakers,
      config:{arch:'gru',embed:this.E,hidden:this.H,maxLen:140},tensors};
  }
}
function shuffle(items, random) {for(let i=items.length-1;i>0;i--){const j=Math.floor(random()*(i+1));[items[i],items[j]]=[items[j],items[i]];}}
function train({epochs=60,hidden=64,embed=24,seed=20261004}={}) {
  const context={window:{}};vm.runInNewContext(fs.readFileSync(path.join(ROOT,'assets/corpus.js'),'utf8'),context);
  const data=dataset(context.window.CIRCUS_CORPUS),random=rng(seed), all=[...data.lines];shuffle(all,random);
  const valid=all.slice(0,Math.max(1,Math.floor(all.length*.1))), training=all.slice(valid.length);
  const model=new Model(data,{hidden,embed,seed});
  const initial={train:model.loss(training),validation:model.loss(valid)};
  const report={seed,epochs,embed,hidden,corpusSha256:crypto.createHash('sha256').update(fs.readFileSync(path.join(ROOT,'assets/corpus.js'))).digest('hex'),trainingLines:training.length,validationLines:valid.length,initial,history:[]};
  console.log(JSON.stringify({initial,lines:data.lines.length,hidden,embed}));
  for(let epoch=1;epoch<=epochs;epoch++) {
    shuffle(training,random);const rate=.002*(epoch>epochs*.75?.5:1);
    for(const line of training){model.forward(line,true);model.update(rate);}
    if(epoch===1||epoch%5===0||epoch===epochs) {
      const result={epoch,train:model.loss(training),validation:model.loss(valid)};
      report.history.push(result);
      report.bestValidation=report.history.reduce((best,row)=>row.validation<best.validation?row:best);
      report.limitations='Small original-dialogue corpus; held-out loss can worsen as training loss falls. The final checkpoint is an opt-in experimental toy, not fluent conversation. Runtime quality gates and word-chain fallback remain necessary.';
      console.log(JSON.stringify(result));
      // Save progress atomically; an interrupted training run leaves a usable completed checkpoint.
      const weights=model.weights();const out='window.CIRCUS_TINYLM_WEIGHTS = '+JSON.stringify(weights)+';\n';
      const dest=path.join(ROOT,'assets/tinylm-weights.js');fs.writeFileSync(dest+'.tmp',out);fs.renameSync(dest+'.tmp',dest);
      report.completedEpochs=epoch;report.bytes=Buffer.byteLength(out);
      fs.writeFileSync(path.join(ROOT,'assets/tinylm-training.json'),JSON.stringify(report,null,2)+'\n');
    }
  }
  return report;
}
module.exports={Model,dataset,rng,shuffle,train};
if(require.main===module) {
  const options={};
  for(const arg of process.argv.slice(2)) {
    const match=/^--(epochs|hidden|embed|seed)=(\d+)$/.exec(arg);
    if(!match)throw new Error('Usage: node tools/train_tinylm.cjs [--epochs=60 --hidden=64 --embed=24 --seed=20261004]');
    options[match[1]]=Number(match[2]);
  }
  for(const k of ['epochs','hidden','embed'])if(k in options && (options[k]<1||options[k]>1000))throw new Error('Invalid '+k);
  train(options);
}
