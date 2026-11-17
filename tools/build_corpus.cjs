#!/usr/bin/env node
/* 🧠 Builds assets/corpus.js: every original cast line in the circus, grouped by speaker.
 * Sources (loaded for real, not regex-scraped): assets/cast.js (TADC.LINES), assets/conversations.js
 * (CircusScenes.SCENES), assets/hangouts.js (cast lounge lines), castbrain REPLIES and corpus-src/<who>.txt. Used by the Tier 1 Markov voices in
 * assets/castbrain.js and as training text for the Tier 2 tiny language model.
 * Run from anywhere:  node tools/build_corpus.cjs        (no dependencies, no network) */
'use strict';
const fs = require('fs');
const path = require('path');
const vm = require('vm');

const ROOT = path.resolve(__dirname, '..');
const SPEAKERS = ['caine', 'bubble', 'pomni', 'jax', 'ragatha', 'gangle', 'zooble', 'kinger'];

// A forgiving fake browser: any property is a callable stub, so DOM-touching setup code runs harmlessly.
function stub() {
  const fn = function () { return stub(); };
  return new Proxy(fn, {
    get(t, k) {
      if (k === Symbol.toPrimitive) return () => '';
      if (k === 'then') return undefined;
      if (k === 'length') return 0;
      return stub();
    },
    apply() { return stub(); },
    construct() { return stub(); },
  });
}
function loadBrowserScript(file, extra = {}) {
  const store = {};
  const sandbox = {
    console, setTimeout: () => 0, clearTimeout() {}, setInterval: () => 0, clearInterval() {},
    requestAnimationFrame: () => 0, addEventListener() {}, removeEventListener() {},
    localStorage: { getItem: (k) => (k in store ? store[k] : null), setItem: (k, v) => { store[k] = String(v); }, removeItem: (k) => { delete store[k]; } },
    location: { pathname: '/index.html', search: '', href: '' },
    navigator: { userActivation: { hasBeenActive: false } },
    innerWidth: 1280, innerHeight: 800, devicePixelRatio: 1,
    document: new Proxy({ readyState: 'complete', currentScript: null, hidden: false }, {
      get(t, k) { return k in t ? t[k] : stub(); },
    }),
    AudioContext: undefined, webkitAudioContext: undefined, getComputedStyle: () => stub(),
    ...extra,
  };
  sandbox.window = sandbox; sandbox.globalThis = sandbox; sandbox.self = sandbox;
  vm.createContext(sandbox);
  vm.runInContext(fs.readFileSync(path.join(ROOT, file), 'utf8'), sandbox, { filename: file });
  return sandbox;
}

const clean = (s) => String(s)
  .replace(/<[^>]*>/g, '')            // markup
  .replace(/\*[^*]*\*/g, ' ')         // *stage directions*
  .replace(/\{[A-Za-z]+\}/g, 'it')    // template slots like {L}
  .replace(/&[a-z]+;/g, ' ')
  .replace(/\s+/g, ' ').trim();

const corpus = Object.fromEntries(SPEAKERS.map((s) => [s, new Set()]));
const add = (who, text) => {
  const w = String(who || '').split(':')[0];
  if (!corpus[w]) return;
  const t = clean(text);
  if (t.length >= 4 && /[a-z]/i.test(t)) corpus[w].add(t);
};
const sources = {};

// 1) shared one-liners in cast.js
const castBox = loadBrowserScript('assets/cast.js');
const LINES = castBox.TADC && castBox.TADC.LINES;
if (!LINES) throw new Error('cast.js did not expose TADC.LINES');
const LINE_MAP = { caine: 'caine', exitGuard: 'caine', bubble: 'bubble', pomni: 'pomni', jax: 'jax', ragatha: 'ragatha', gangleHappy: 'gangle', gangleSad: 'gangle', zooble: 'zooble', kinger: 'kinger' };
let n = 0;
for (const [k, arr] of Object.entries(LINES)) if (LINE_MAP[k] && Array.isArray(arr)) arr.forEach((l) => { add(LINE_MAP[k], l); n++; });
sources['assets/cast.js'] = n;

// 2) the 24 scenes
const sceneBox = loadBrowserScript('assets/conversations.js');
const SCENES = sceneBox.CircusScenes && sceneBox.CircusScenes.SCENES;
if (!SCENES) throw new Error('conversations.js did not expose CircusScenes.SCENES');
n = 0;
for (const sc of SCENES) for (const [who, text] of sc.lines) { (Array.isArray(text) ? text : [text]).forEach((t) => { add(who, t); n++; }); }
sources['assets/conversations.js'] = n;

// 3) the hangout lounges (CommonJS export)
const hang = require(path.join(ROOT, 'assets/hangouts.js'));
n = 0;
for (const [who, p] of Object.entries(hang.cast || {})) {
  for (const l of p.lines || []) { add(who, l); n++; }
  for (const l of p.replies || []) { add(who, l); n++; }
}
sources['assets/hangouts.js'] = n;

// 4) the cast brain's hand-written replies (assets/castbrain.js), minus template lines with {name}/{other}
const brain = require(path.join(ROOT, 'assets/castbrain.js'));
n = 0;
for (const [who, intents] of Object.entries(brain.REPLIES || {})) {
  for (const arr of Object.values(intents)) for (const l of arr) { if (!/\{name\}|\{other\}/.test(l)) { add(who, l); n++; } }
}
sources['assets/castbrain.js'] = n;

// 5) hand-written training lines in corpus-src/<who>.txt (one per row; # comments and blanks ignored).
//    Strict: a bad line fails the build, so the model never trains on something the runtime would refuse.
const ALLOWED = /^[A-Za-z047 !"',\-.:?]+$/;
const lm = require(path.join(ROOT, 'assets/tinylm.js'));
const problems = [];
n = 0;
for (const who of SPEAKERS) {
  const file = path.join(ROOT, 'corpus-src', who + '.txt');
  if (!fs.existsSync(file)) continue;
  fs.readFileSync(file, 'utf8').split(/\r?\n/).forEach((raw, i) => {
    const l = raw.trim();
    if (!l || l.startsWith('#')) return;
    const where = `corpus-src/${who}.txt:${i + 1}`;
    if (!ALLOWED.test(l)) problems.push(`${where} has characters outside the model vocabulary: ${l}`);
    else if (l.length < 8 || l.length > 140) problems.push(`${where} is ${l.length} chars (8-140 allowed)`);
    else if (lm._blocked(l)) problems.push(`${where} contains a blocked word`);
    else { add(who, l); n++; }
  });
}
if (problems.length) { console.error(problems.join('\n')); process.exit(1); }
sources['corpus-src/'] = n;

const out = Object.fromEntries(SPEAKERS.map((s) => [s, [...corpus[s]].sort()]));
const total = SPEAKERS.reduce((a, s) => a + out[s].length, 0);
const header = `/* Generated by tools/build_corpus.cjs. Do not hand-edit; regenerate with: node tools/build_corpus.cjs\n` +
  ` * Every original cast line in the circus, by speaker (${total} unique lines). Sources: ${Object.entries(sources).map(([f, c]) => `${f} (${c})`).join(', ')}. */\n`;
fs.writeFileSync(path.join(ROOT, 'assets/corpus.js'), header + 'window.CIRCUS_CORPUS = ' + JSON.stringify(out, null, 1) + ';\n');
console.log(`wrote assets/corpus.js: ${total} lines`, Object.fromEntries(SPEAKERS.map((s) => [s, out[s].length])));
