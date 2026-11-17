/* 🧠 Tier 2: the circus's own tiny language model. Inference runtime only, no APIs, no network.
 * Weights come from assets/tinylm-weights.js (window.CIRCUS_TINYLM_WEIGHTS), trained offline in pure Node by
 * tools/train_tinylm.cjs on assets/corpus.js. If the weights are missing, generate() returns null and
 * assets/castbrain.js falls back to its Markov voices, so this file is always safe to load.
 *
 * WEIGHTS CONTRACT (v1). The trainer and this runtime must agree exactly:
 *   {
 *     version: 1,
 *     vocab:    [ch, ...]         one entry per character; index 0 = BOS '\u0002', index 1 = EOS '\u0003'
 *     speakers: ['caine', ...]    speaker ids, a learned embedding added to every input char
 *     config:   { arch: 'gru', embed: E, hidden: H, maxLen: 140 }
 *     tensors:  { name: { shape: [rows, cols], data: '<base64 little-endian Float32, row-major>' } }
 *   }
 * Tensors (PyTorch GRU convention, all [rows, cols] row-major):
 *   emb [V,E]   spk [S,E]
 *   Wz, Wr, Wn [H,E]   Uz, Ur, Un [H,H]   bz, br, bn, bun [1,H]
 *   Wo [V,H]   bo [1,V]
 * Step, with x = emb[c] + spk[s]:
 *   z = σ(Wz·x + Uz·h + bz);  r = σ(Wr·x + Ur·h + br);  n = tanh(Wn·x + bn + r ⊙ (Un·h + bun))
 *   h' = (1 − z) ⊙ n + z ⊙ h;  logits = Wo·h' + bo
 * Generation starts from h = 0 and feeds BOS, then the seed's characters (if any), then samples until EOS or maxLen.
 *
 * API: window.CircusTinyLM = { ready, generate(who, seed?, opts?) -> string|null, info() }
 *   opts: { temperature = 0.65, topK = 8, tries = 6, minLen = 12, minWords = 3, seed (number, for tests) } */
(function (root) {
  'use strict';

  // FNV-1a hashes of words the model must never say. Add fnv(word) values here; a hit means "resample".
  const BLOCK = new Set([]);
  const fnv = (s) => { let x = 0x811c9dc5; for (const c of s) { x ^= c.charCodeAt(0); x = Math.imul(x, 16777619) >>> 0; } return x.toString(36); };
  const words = (s) => (String(s).toLowerCase().match(/[a-z0-9]+/g) || []);
  const blocked = (s) => words(s).some((w) => BLOCK.has(fnv(w)));

  function decode(b64) {
    let bytes;
    if (typeof atob === 'function') { const bin = atob(b64); bytes = new Uint8Array(bin.length); for (let i = 0; i < bin.length; i++) bytes[i] = bin.charCodeAt(i); }
    else { bytes = new Uint8Array(Buffer.from(b64, 'base64')); }
    return new Float32Array(bytes.buffer, bytes.byteOffset, bytes.byteLength >> 2);
  }

  function build(W) {
    if (!W || W.version !== 1 || !W.config || W.config.arch !== 'gru') return null;
    const E = W.config.embed, H = W.config.hidden, V = W.vocab.length, S = W.speakers.length;
    const T = {};
    const need = { emb: [V, E], spk: [S, E], Wz: [H, E], Wr: [H, E], Wn: [H, E], Uz: [H, H], Ur: [H, H], Un: [H, H],
      bz: [1, H], br: [1, H], bn: [1, H], bun: [1, H], Wo: [V, H], bo: [1, V] };
    for (const [k, shape] of Object.entries(need)) {
      const t = W.tensors && W.tensors[k];
      if (!t || t.shape[0] !== shape[0] || t.shape[1] !== shape[1]) throw new Error(`tinylm: tensor ${k} missing or not [${shape}]`);
      T[k] = decode(t.data);
      if (T[k].length !== shape[0] * shape[1]) throw new Error(`tinylm: tensor ${k} has ${T[k].length} values, expected ${shape[0] * shape[1]}`);
    }
    const charIx = new Map(W.vocab.map((c, i) => [c, i]));
    const known = new Set(), contractions = new Set();
    const corpus = root.CIRCUS_CORPUS || {};
    Object.values(corpus).forEach((lines) => lines.forEach((l) => { words(l).forEach((w) => known.add(w));
      (l.match(/[a-z]+['’][a-z]+/ig) || []).forEach(w => contractions.add(w.toLowerCase().replace(/’/g, "'"))); }));
    return { W, T, E, H, V, S, charIx, known, contractions, maxLen: W.config.maxLen || 140 };
  }

  const sig = (v) => 1 / (1 + Math.exp(-v));
  // out[i] = Σ_j M[i, j]·v[j], M is [rows, cols]
  function addMatVec(out, M, v, rows, cols) {
    for (let i = 0; i < rows; i++) { let s = 0; const o = i * cols; for (let j = 0; j < cols; j++) s += M[o + j] * v[j]; out[i] += s; }
  }

  function step(m, h, c, s) {
    const { T, E, H, V } = m;
    const x = new Float32Array(E);
    for (let j = 0; j < E; j++) x[j] = T.emb[c * E + j] + T.spk[s * E + j];
    const z = Float32Array.from(T.bz), r = Float32Array.from(T.br), n = Float32Array.from(T.bn), uh = Float32Array.from(T.bun);
    addMatVec(z, T.Wz, x, H, E); addMatVec(z, T.Uz, h, H, H);
    addMatVec(r, T.Wr, x, H, E); addMatVec(r, T.Ur, h, H, H);
    addMatVec(n, T.Wn, x, H, E); addMatVec(uh, T.Un, h, H, H);
    const h2 = new Float32Array(H);
    for (let i = 0; i < H; i++) {
      const zi = sig(z[i]), ri = sig(r[i]), ni = Math.tanh(n[i] + ri * uh[i]);
      h2[i] = (1 - zi) * ni + zi * h[i];
    }
    const logits = Float32Array.from(T.bo);
    addMatVec(logits, T.Wo, h2, V, H);
    return { h: h2, logits };
  }

  function sample(logits, temperature, topK, rand, banned) {
    const idx = [];
    for (let i = 0; i < logits.length; i++) if (!banned.has(i)) idx.push(i);
    idx.sort((a, b) => logits[b] - logits[a]);
    const top = idx.slice(0, Math.max(1, topK));
    const t = Math.max(0.05, temperature);
    const mx = logits[top[0]];
    const p = top.map((i) => Math.exp((logits[i] - mx) / t));
    let u = rand() * p.reduce((a, b) => a + b, 0);
    for (let k = 0; k < top.length; k++) { u -= p[k]; if (u <= 0) return top[k]; }
    return top[top.length - 1];
  }

  // Seeded RNG for tests (mulberry32); default is Math.random.
  const rng = (seed) => { let a = seed >>> 0; return () => { a = (a + 0x6D2B79F5) >>> 0; let t = a; t = Math.imul(t ^ (t >>> 15), t | 1); t ^= t + Math.imul(t ^ (t >>> 7), t | 61); return ((t ^ (t >>> 14)) >>> 0) / 4294967296; }; };

  // A line is good when it isn't blocked, isn't gibberish (all words are real circus words), and isn't a verbatim copy.
  function acceptable(m, who, text, minLen, minWords) {
    const t = text.trim();
    if (t.length < minLen || blocked(t)) return false;
    if (/\b([a-z]+)(?:\s+\1){3,}\b/i.test(t)) return false;
    if (m.contractions && (t.match(/[a-z]+['’][a-z]+/ig) || []).some(w =>
      !m.contractions.has(w.toLowerCase().replace(/’/g, "'")))) return false;
    const ws = words(t);
    if (ws.length < minWords) return false;
    if (m.known.size) {
      const real = ws.filter((w) => m.known.has(w)).length;
      if (real !== ws.length) return false;
      const own = (root.CIRCUS_CORPUS && root.CIRCUS_CORPUS[who]) || [];
      if (own.includes(t)) return false;
    }
    return /[a-z]/i.test(t);
  }

  let model; // undefined = not built yet, null = unavailable
  function load() {
    if (model !== undefined) return model;
    try { model = build(root.CIRCUS_TINYLM_WEIGHTS); } catch (e) { model = null; if (root.console) console.warn(String(e.message || e)); }
    return model;
  }

  function generate(who, seed, opts = {}) {
    const m = load();
    if (!m) return null;
    const s = m.W.speakers.indexOf(String(who || '').toLowerCase());
    if (s < 0) return null;
    const temperature = opts.temperature ?? 0.65, topK = opts.topK ?? 8, tries = opts.tries ?? 6, minLen = opts.minLen ?? 12, minWords = opts.minWords ?? 3;
    const rand = typeof opts.seed === 'number' ? rng(opts.seed) : Math.random;
    const prefix = String(seed || '').split('').filter((ch) => m.charIx.has(ch)).join('').slice(0, 40);
    for (let attempt = 0; attempt < tries; attempt++) {
      let h = new Float32Array(m.H);
      let out = step(m, h, 0, s);
      for (const ch of prefix) { h = out.h; out = step(m, h, m.charIx.get(ch), s); }
      let text = prefix;
      for (let i = prefix.length; i < m.maxLen; i++) {
        const banned = new Set([0]);
        if (text.length < minLen) banned.add(1); // no EOS before the line says something
        const c = sample(out.logits, temperature, topK, rand, banned);
        if (c === 1) break;
        text += m.W.vocab[c];
        out = step(m, out.h, c, s);
      }
      text = text.replace(/\s+/g, ' ').trim();
      // Trim a trailing half-word if we hit maxLen.
      if (text.length >= m.maxLen - 1) text = text.replace(/\s+\S*$/, '…');
      if (acceptable(m, who, text, minLen, minWords)) return text;
    }
    return null;
  }

  const api = {
    get ready() { return !!load(); },
    generate,
    info() { const m = load(); return m ? { vocab: m.V, speakers: m.W.speakers, embed: m.E, hidden: m.H, params: Object.values(m.T).reduce((a, t) => a + t.length, 0) } : null; },
    _blocked: blocked, // for tests
  };
  root.CircusTinyLM = api;
  if (typeof module !== 'undefined' && module.exports) module.exports = api;
})(typeof window !== 'undefined' ? window : globalThis);
