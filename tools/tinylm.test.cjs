#!/usr/bin/env node
/* Tests for assets/tinylm.js against the v1 weights contract. No deps:  node tools/tinylm.test.cjs */
'use strict';
const assert = require('assert');
const path = require('path');
const ROOT = path.resolve(__dirname, '..');
const fresh = () => { delete require.cache[require.resolve(path.join(ROOT, 'assets/tinylm.js'))]; return require(path.join(ROOT, 'assets/tinylm.js')); };
const b64 = (arr) => Buffer.from(new Float32Array(arr).buffer).toString('base64');
const T = (rows, cols, fill) => ({ shape: [rows, cols], data: b64(Array.from({ length: rows * cols }, (_, i) => fill(Math.floor(i / cols), i % cols))) });

// 1) No weights: unavailable, returns null (castbrain then falls back to Markov).
delete globalThis.CIRCUS_TINYLM_WEIGHTS;
let lm = fresh();
assert.strictEqual(lm.ready, false);
assert.strictEqual(lm.generate('caine'), null);

// 2) Hand-wired GRU: embeddings are one-hot, z≈0 so h ≈ tanh(10·onehot(prev char)), Wo maps prev char → next char.
//    A correct runtime must spell the phrase exactly at low temperature.
const phrase = 'big top';
const vocab = ['\u0002', '\u0003', ...new Set(phrase)];
const V = vocab.length, E = V, H = V;
const ix = (c) => vocab.indexOf(c);
const next = new Map([[0, ix(phrase[0])]]);
for (let i = 0; i < phrase.length; i++) next.set(ix(phrase[i]), i + 1 < phrase.length ? ix(phrase[i + 1]) : 1);
const zero = (r, c) => T(r, c, () => 0);
globalThis.CIRCUS_TINYLM_WEIGHTS = {
  version: 1, vocab, speakers: ['caine', 'jax'], config: { arch: 'gru', embed: E, hidden: H, maxLen: 40 },
  tensors: {
    emb: T(V, E, (r, c) => (r === c ? 1 : 0)), spk: zero(2, E),
    Wz: zero(H, E), Wr: zero(H, E), Wn: T(H, E, (r, c) => (r === c ? 10 : 0)),
    Uz: zero(H, H), Ur: zero(H, H), Un: zero(H, H),
    bz: T(1, H, () => -10), br: zero(1, H), bn: zero(1, H), bun: zero(1, H),
    Wo: T(V, H, (r, c) => (next.get(c) === r ? 20 : 0)), bo: zero(1, V),
  },
};
globalThis.CIRCUS_CORPUS = {}; // no corpus: skip the real-word check
lm = fresh();
assert.strictEqual(lm.ready, true);
const opts = { temperature: 0.1, topK: 3, minLen: 3, minWords: 2, seed: 7 };
assert.strictEqual(lm.generate('caine', '', opts), 'big top');
assert.strictEqual(lm.generate('jax', '', opts), 'big top');
assert.strictEqual(lm.generate('kinger', '', opts), null, 'unknown speaker → null');
// Seeded generation is deterministic even at high temperature.
const hot = { temperature: 3, topK: V, minLen: 1, minWords: 0, seed: 42, tries: 1 };
assert.strictEqual(lm.generate('caine', '', hot), lm.generate('caine', '', hot));
// Seed prefix is fed through the model: starting at "big" continues to " top".
assert.strictEqual(lm.generate('caine', 'big', opts), 'big top');

// 3) Real-word gate: with a corpus that lacks "big"/"top", the line is rejected.
globalThis.CIRCUS_CORPUS = { caine: ['the circus is grand'] };
lm = fresh();
assert.strictEqual(lm.generate('caine', '', opts), null);
// ...and a verbatim corpus line is rejected too (it should improvise, not recite).
globalThis.CIRCUS_CORPUS = { caine: ['big top'] };
lm = fresh();
assert.strictEqual(lm.generate('caine', '', opts), null);

// 4) Shape mismatches are caught, not silently mis-read.
globalThis.CIRCUS_TINYLM_WEIGHTS.tensors.Wo = T(V, H - 1, () => 0);
lm = fresh();
const warn = console.warn; console.warn = () => {};
assert.strictEqual(lm.ready, false);
console.warn = warn;

// 5) Blocklist: ordinary circus words pass.
assert.strictEqual(lm._blocked('Welcome to the big top'), false);

console.log('tinylm: all tests passed');
// Exercise the private quality gate directly at the former 75% boundary.
const vm = require('node:vm'), fs = require('node:fs');
const gateContext = { console };
vm.runInNewContext(fs.readFileSync(path.join(ROOT, 'assets/tinylm.js'), 'utf8')
  .replace('const api = {', 'const api = { _acceptable: acceptable,'), gateContext);
const gate = gateContext.CircusTinyLM._acceptable;
const known = new Set(['the', 'big', 'top', 'dances']);
assert.equal(gate({known}, 'caine', 'the big top glorp', 3, 3), false, 'One invented word in four must be rejected');
assert.equal(gate({known}, 'caine', 'the big top dances', 3, 3), true);
console.log('tinylm: strict known-word boundary passed');

assert.equal(gate({known}, 'caine', 'the the the the big top', 3, 3), false, 'Repeated-word loops rejected');
assert.equal(gate({known:new Set(['we','m','the','big','top']),contractions:new Set(["I'm"])},
  'caine', "We'm the big top", 3, 3), false, 'Invented contractions rejected');
