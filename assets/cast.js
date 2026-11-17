/* 🎪 The Amazing Digital Circus — shared cast, confetti, speech bubbles, and calliope.
 * Fan-art nods only: simple original SVG shapes, original dialogue. */
(function () {
  'use strict';

  // ───────────────────────── QUIET MODE (global mute) ─────────────────────────
  // Every act loads this file first, so we wrap AudioContext here: each context's `destination`
  // becomes a master GainNode that one persistent 🔇 toggle can silence. Acts need no changes.
  const QUIET_KEY = 'tadc-quiet-v1';
  const readQuiet = () => { try { return localStorage.getItem(QUIET_KEY) === '1'; } catch (e) { return false; } };
  let quietOn = readQuiet();
  const masters = new Set();
  const NativeAC = window.AudioContext || window.webkitAudioContext;
  if (NativeAC && !NativeAC.__tadcQuiet) {
    class CircusAudioContext extends NativeAC {
      constructor(...args) {
        super(...args);
        const master = super.createGain();
        master.gain.value = quietOn ? 0 : 1;
        master.connect(super.destination);
        Object.defineProperty(this, '__tadcMaster', { value: master });
        masters.add(this);
      }
      get destination() { return this.__tadcMaster || super.destination; }
    }
    CircusAudioContext.__tadcQuiet = true;
    window.AudioContext = CircusAudioContext;
    if (window.webkitAudioContext) window.webkitAudioContext = CircusAudioContext;
  }
  const quietListeners = new Set();
  function applyQuiet() {
    masters.forEach((ctx) => {
      if (ctx.state === 'closed') { masters.delete(ctx); return; }
      ctx.__tadcMaster.gain.setTargetAtTime(quietOn ? 0 : 1, ctx.currentTime, 0.02);
    });
    quietListeners.forEach((fn) => fn(quietOn));
  }
  const quiet = {
    get: () => quietOn,
    set(on) { quietOn = !!on; try { localStorage.setItem(QUIET_KEY, quietOn ? '1' : '0'); } catch (e) { /* storage blocked: mute lasts this page only */ } applyQuiet(); },
    toggle() { quiet.set(!quietOn); return quietOn; },
    onChange(fn) { quietListeners.add(fn); },
  };
  // Audio unlock: some browsers (notably Safari, which lacks navigator.userActivation) leave a context
  // created before/outside a gesture stuck in 'suspended' forever. Any click/tap/key anywhere resumes
  // every circus AudioContext, so voices, sfx and every act's own synths start working right away.
  function unlockAudio() {
    masters.forEach((ctx) => { if (ctx.state === 'suspended') ctx.resume().catch(() => {}); });
  }
  ['pointerdown', 'keydown', 'touchend', 'click'].forEach((ev) => addEventListener(ev, unlockAudio, { capture: true, passive: true }));
  // keep other open circus tabs in sync
  addEventListener('storage', (e) => { if (e.key === QUIET_KEY) { quietOn = e.newValue === '1'; applyQuiet(); } });

  // ───────────────────────── CAST ART (original simple SVGs) ─────────────────────────
  const CAST = {};

  CAST.caine = `
<svg viewBox="0 0 140 190" class="caine-svg" xmlns="http://www.w3.org/2000/svg">
  <defs>
    <linearGradient id="cHat" x1="0" x2="1"><stop offset="0" stop-color="#1a1030"/><stop offset=".5" stop-color="#3a2a5a"/><stop offset="1" stop-color="#140c24"/></linearGradient>
    <linearGradient id="cCoat" x1="0" x2="1"><stop offset="0" stop-color="#9e0f1f"/><stop offset=".5" stop-color="#e3243b"/><stop offset="1" stop-color="#8a0c1a"/></linearGradient>
    <radialGradient id="cEye" cx=".4" cy=".35"><stop offset="0" stop-color="#fff"/><stop offset="1" stop-color="#d9dbe8"/></radialGradient>
  </defs>
  <!-- top hat -->
  <g class="caine-hat">
    <rect x="44" y="2" width="52" height="40" rx="4" fill="url(#cHat)"/>
    <rect x="44" y="30" width="52" height="8" fill="#e3243b"/>
    <ellipse cx="70" cy="43" rx="40" ry="6" fill="#140c24"/>
  </g>
  <!-- floating eyes -->
  <g class="caine-eyes">
    <circle cx="52" cy="62" r="13" fill="url(#cEye)" stroke="#2a1f3d" stroke-width="2"/>
    <circle cx="88" cy="62" r="13" fill="url(#cEye)" stroke="#2a1f3d" stroke-width="2"/>
    <circle class="pupil" cx="52" cy="63" r="5.5" fill="#2a1f3d"/>
    <circle class="pupil" cx="88" cy="63" r="5.5" fill="#2a1f3d"/>
    <rect class="lid" x="37" y="47" width="30" height="0" fill="#c9cbe0"/>
    <rect class="lid" x="73" y="47" width="30" height="0" fill="#c9cbe0"/>
  </g>
  <!-- the teeth (that's the head!) -->
  <g class="caine-mouth">
    <rect x="30" y="80" width="80" height="22" rx="10" fill="#5a0d18"/>
    <g class="jaw-top">
      <path d="M28 82 Q70 66 112 82 L112 92 L28 92 Z" fill="#fbfaf2" stroke="#b9b6a3" stroke-width="1.5"/>
      <path d="M42 77 V92 M56 74 V92 M70 73 V92 M84 74 V92 M98 77 V92" stroke="#c9c6b0" stroke-width="1.5"/>
    </g>
    <g class="jaw-bot">
      <path d="M28 96 L112 96 L112 104 Q70 118 28 104 Z" fill="#fbfaf2" stroke="#b9b6a3" stroke-width="1.5"/>
      <path d="M42 96 V108 M56 96 V111 M70 96 V112 M84 96 V111 M98 96 V108" stroke="#c9c6b0" stroke-width="1.5"/>
    </g>
  </g>
  <!-- tailcoat -->
  <g class="caine-body">
    <path d="M44 120 L96 120 L108 170 L84 162 L70 182 L56 162 L32 170 Z" fill="url(#cCoat)" stroke="#5a0710" stroke-width="2"/>
    <path d="M60 120 L70 140 L80 120 Z" fill="#fff"/>
    <path d="M64 121 L70 128 L76 121 L70 124 Z" fill="#1a1030"/>
    <circle cx="70" cy="148" r="3" fill="#ffd34d"/><circle cx="70" cy="158" r="3" fill="#ffd34d"/>
    <circle cx="26" cy="140" r="9" fill="#fff" stroke="#bbb" stroke-width="1.5"/>
    <g class="caine-cane">
      <line x1="118" y1="128" x2="128" y2="186" stroke="#1a1030" stroke-width="5" stroke-linecap="round"/>
      <path d="M118 128 Q110 112 124 110 Q136 110 132 122" fill="none" stroke="#1a1030" stroke-width="5" stroke-linecap="round"/>
      <circle cx="118" cy="132" r="9" fill="#fff" stroke="#bbb" stroke-width="1.5"/>
    </g>
  </g>
</svg>`;

  CAST.bubble = `
<svg viewBox="0 0 60 60" xmlns="http://www.w3.org/2000/svg">
  <defs><radialGradient id="bub" cx=".35" cy=".3"><stop offset="0" stop-color="#fff" stop-opacity=".95"/><stop offset=".45" stop-color="#bfe9ff" stop-opacity=".7"/><stop offset="1" stop-color="#6fb6ff" stop-opacity=".55"/></radialGradient></defs>
  <circle cx="30" cy="30" r="26" fill="url(#bub)" stroke="#e8f7ff" stroke-width="2"/>
  <ellipse cx="20" cy="18" rx="7" ry="4" fill="#fff" opacity=".9" transform="rotate(-30 20 18)"/>
  <circle cx="23" cy="28" r="3.2" fill="#1b1b2f"/><circle cx="37" cy="28" r="3.2" fill="#1b1b2f"/>
  <path d="M18 35 Q30 50 42 35 Q30 42 18 35 Z" fill="#1b1b2f"/>
  <path d="M22 37 L25 41 L28 38 L31 41 L34 38 L37 41 L39 37" fill="#fff"/>
</svg>`;

  CAST.pomni = `
<svg viewBox="0 0 100 150" xmlns="http://www.w3.org/2000/svg">
  <path d="M50 30 Q30 0 6 14 Q22 20 32 38 Z" fill="#e3243b" stroke="#7a0b17" stroke-width="2"/>
  <path d="M50 30 Q70 0 94 14 Q78 20 68 38 Z" fill="#2f5bd8" stroke="#142a73" stroke-width="2"/>
  <circle cx="6" cy="14" r="6" fill="#ffd34d" stroke="#b8901b" stroke-width="1.5"/>
  <circle cx="94" cy="14" r="6" fill="#ffd34d" stroke="#b8901b" stroke-width="1.5"/>
  <path d="M28 38 Q50 26 72 38 L72 44 L28 44 Z" fill="#e3243b"/><path d="M50 30 L72 38 L72 44 L50 44 Z" fill="#2f5bd8"/>
  <ellipse cx="50" cy="62" rx="24" ry="22" fill="#fbf7f0" stroke="#cfc6b8" stroke-width="1.5"/>
  <circle cx="40" cy="60" r="8" fill="#fff" stroke="#1b1b2f" stroke-width="2"/><circle cx="60" cy="60" r="8" fill="#fff" stroke="#1b1b2f" stroke-width="2"/>
  <circle cx="40" cy="61" r="3" fill="#1b1b2f"/><circle cx="60" cy="61" r="3" fill="#1b1b2f"/>
  <ellipse cx="50" cy="75" rx="4" ry="3" fill="#7a0b17"/>
  <circle cx="34" cy="70" r="3" fill="#ff9aa8" opacity=".6"/><circle cx="66" cy="70" r="3" fill="#ff9aa8" opacity=".6"/>
  <path d="M28 86 L36 80 L44 86 L50 80 L56 86 L64 80 L72 86 L64 92 L36 92 Z" fill="#ffd34d" stroke="#b8901b" stroke-width="1.5"/>
  <path d="M34 92 L50 92 L50 140 L30 140 Z" fill="#e3243b"/><path d="M50 92 L66 92 L70 140 L50 140 Z" fill="#2f5bd8"/>
  <circle cx="50" cy="106" r="3" fill="#ffd34d"/><circle cx="50" cy="120" r="3" fill="#ffd34d"/>
</svg>`;

  CAST.jax = `
<svg viewBox="0 0 100 170" xmlns="http://www.w3.org/2000/svg">
  <path d="M36 50 Q24 4 34 2 Q46 4 44 48 Z" fill="#8f5bd6" stroke="#4b2c80" stroke-width="2"/>
  <path d="M64 48 Q60 4 72 4 Q84 8 66 52 Z" fill="#8f5bd6" stroke="#4b2c80" stroke-width="2"/>
  <path d="M38 44 Q34 14 36 10 Q41 14 41 44 Z" fill="#e8c7ff"/>
  <ellipse cx="52" cy="66" rx="24" ry="22" fill="#8f5bd6" stroke="#4b2c80" stroke-width="2"/>
  <path d="M38 60 Q44 56 48 60" stroke="#1b1b2f" stroke-width="3" fill="none"/>
  <path d="M56 60 Q60 56 66 60" stroke="#1b1b2f" stroke-width="3" fill="none"/>
  <path d="M36 72 Q52 92 70 70 Q52 80 36 72 Z" fill="#fff6c9" stroke="#4b2c80" stroke-width="1.5"/>
  <path d="M46 76 V82 M52 77 V84 M58 76 V82" stroke="#d1c48e" stroke-width="1.2"/>
  <rect x="38" y="88" width="28" height="14" fill="#8f5bd6"/>
  <path d="M30 100 L74 100 L78 160 L56 160 L52 130 L48 160 L26 160 Z" fill="#3a6fd8" stroke="#1f3f87" stroke-width="2"/>
  <rect x="38" y="100" width="28" height="18" fill="#4a7fe8"/>
  <line x1="38" y1="100" x2="34" y2="90" stroke="#1f3f87" stroke-width="3"/><line x1="66" y1="100" x2="70" y2="90" stroke="#1f3f87" stroke-width="3"/>
</svg>`;

  CAST.ragatha = `
<svg viewBox="0 0 100 150" xmlns="http://www.w3.org/2000/svg">
  <g fill="#e3243b" stroke="#8a0c1a" stroke-width="1.5">
    <circle cx="28" cy="34" r="10"/><circle cx="40" cy="22" r="11"/><circle cx="56" cy="20" r="11"/><circle cx="70" cy="30" r="10"/><circle cx="76" cy="46" r="9"/><circle cx="24" cy="50" r="9"/>
    <path d="M24 56 Q14 90 26 110 L32 70 Z"/><path d="M76 52 Q88 90 74 110 L68 70 Z"/>
  </g>
  <ellipse cx="50" cy="56" rx="24" ry="24" fill="#ffd9c2" stroke="#d8a88a" stroke-width="1.5"/>
  <circle cx="40" cy="54" r="5.5" fill="#1b1b2f"/><circle cx="38.5" cy="52.5" r="1.6" fill="#fff"/>
  <circle cx="61" cy="54" r="7" fill="#2f5bd8" stroke="#142a73" stroke-width="1.5"/>
  <circle cx="59" cy="52" r="1.2" fill="#fff"/><circle cx="63" cy="52" r="1.2" fill="#fff"/><circle cx="59" cy="56" r="1.2" fill="#fff"/><circle cx="63" cy="56" r="1.2" fill="#fff"/>
  <path d="M40 66 Q50 76 60 66" stroke="#8a0c1a" stroke-width="2.5" fill="none" stroke-linecap="round"/>
  <circle cx="34" cy="64" r="3.5" fill="#ff8a9a" opacity=".55"/><circle cx="66" cy="64" r="3.5" fill="#ff8a9a" opacity=".55"/>
  <path d="M36 80 L64 80 L80 140 L20 140 Z" fill="#4a7fe8" stroke="#1f3f87" stroke-width="2"/>
  <path d="M36 80 L64 80 L58 96 L42 96 Z" fill="#fff"/>
  <path d="M26 122 L74 122" stroke="#fff" stroke-width="3" stroke-dasharray="4 4"/>
</svg>`;

  CAST.gangle = `
<svg viewBox="0 0 100 160" xmlns="http://www.w3.org/2000/svg">
  <path d="M50 70 Q20 90 50 110 Q80 130 46 156" fill="none" stroke="#ff7eb6" stroke-width="16" stroke-linecap="round"/>
  <path d="M50 70 Q20 90 50 110 Q80 130 46 156" fill="none" stroke="#fff" stroke-width="5" stroke-dasharray="6 10" stroke-linecap="round"/>
  <path d="M34 92 Q14 98 10 84" fill="none" stroke="#ff7eb6" stroke-width="7" stroke-linecap="round"/>
  <path d="M66 114 Q88 108 90 94" fill="none" stroke="#ff7eb6" stroke-width="7" stroke-linecap="round"/>
  <g class="mask-comedy">
    <path d="M24 26 Q50 10 76 26 Q80 60 50 74 Q20 60 24 26 Z" fill="#fff" stroke="#d6d0e0" stroke-width="2"/>
    <path d="M34 36 Q40 30 46 36" stroke="#1b1b2f" stroke-width="3" fill="none"/><path d="M54 36 Q60 30 66 36" stroke="#1b1b2f" stroke-width="3" fill="none"/>
    <path d="M34 50 Q50 68 66 50 Q50 58 34 50 Z" fill="#1b1b2f"/>
    <circle cx="32" cy="46" r="4" fill="#ff9aa8" opacity=".7"/><circle cx="68" cy="46" r="4" fill="#ff9aa8" opacity=".7"/>
  </g>
  <g class="mask-tragedy" style="display:none">
    <path d="M24 26 Q50 10 76 26 Q80 60 50 74 Q20 60 24 26 Z" fill="#fff" stroke="#d6d0e0" stroke-width="2"/>
    <path d="M34 34 Q40 40 46 34" stroke="#1b1b2f" stroke-width="3" fill="none"/><path d="M54 34 Q60 40 66 34" stroke="#1b1b2f" stroke-width="3" fill="none"/>
    <path d="M36 60 Q50 46 64 60 Q50 54 36 60 Z" fill="#1b1b2f"/>
    <path d="M40 40 Q38 50 40 56" stroke="#6fb6ff" stroke-width="3" fill="none" stroke-linecap="round"/>
    <path d="M60 40 Q62 50 60 56" stroke="#6fb6ff" stroke-width="3" fill="none" stroke-linecap="round"/>
  </g>
</svg>`;

  CAST.zooble = `
<svg viewBox="0 0 100 160" xmlns="http://www.w3.org/2000/svg">
  <rect x="30" y="8" width="40" height="36" rx="4" fill="#5fd38d" stroke="#2a7a4a" stroke-width="2" transform="rotate(-6 50 26)"/>
  <circle cx="44" cy="26" r="7" fill="#fff" stroke="#1b1b2f" stroke-width="2"/><circle cx="45" cy="27" r="3" fill="#1b1b2f"/>
  <path d="M54 22 L64 22" stroke="#1b1b2f" stroke-width="3" stroke-linecap="round"/>
  <path d="M42 38 L58 36" stroke="#1b1b2f" stroke-width="2.5" stroke-linecap="round"/>
  <path d="M66 8 L74 -2 M70 12 L82 6" stroke="#ffd34d" stroke-width="4" stroke-linecap="round"/>
  <rect x="44" y="44" width="10" height="24" fill="#b07cff" stroke="#5c3a99" stroke-width="2"/>
  <path d="M26 68 L74 68 L66 104 L34 104 Z" fill="#ff7eb6" stroke="#a03b6c" stroke-width="2"/>
  <path d="M26 72 Q8 70 10 52" fill="none" stroke="#ffd34d" stroke-width="6" stroke-linecap="round"/>
  <path d="M74 76 L92 96" stroke="#5fd38d" stroke-width="8" stroke-linecap="round"/>
  <circle cx="92" cy="96" r="6" fill="#b07cff"/>
  <path d="M36 104 L44 152 L28 152 Z" fill="#ffd34d" stroke="#b8901b" stroke-width="2"/>
  <rect x="54" y="104" width="12" height="44" rx="6" fill="#2f5bd8" stroke="#142a73" stroke-width="2"/>
</svg>`;

  CAST.kinger = `
<svg viewBox="0 0 100 170" xmlns="http://www.w3.org/2000/svg">
  <rect x="46" y="0" width="8" height="22" fill="#ffd34d"/><rect x="38" y="6" width="24" height="8" fill="#ffd34d"/>
  <path d="M28 40 L34 22 L44 32 L50 18 L56 32 L66 22 L72 40 Z" fill="#ffd34d" stroke="#b8901b" stroke-width="2"/>
  <ellipse cx="50" cy="58" rx="26" ry="22" fill="#8a5fd1" stroke="#4b2c80" stroke-width="2"/>
  <circle cx="40" cy="54" r="9" fill="#fff" stroke="#1b1b2f" stroke-width="2"/><circle cx="60" cy="54" r="9" fill="#fff" stroke="#1b1b2f" stroke-width="2"/>
  <circle class="kp" cx="41" cy="56" r="3.5" fill="#1b1b2f"/><circle class="kp" cx="58" cy="52" r="3.5" fill="#1b1b2f"/>
  <path d="M42 70 Q50 66 58 70" stroke="#1b1b2f" stroke-width="2.5" fill="none" stroke-linecap="round"/>
  <path d="M36 80 Q50 92 64 80 L70 130 L30 130 Z" fill="#8a5fd1" stroke="#4b2c80" stroke-width="2"/>
  <rect x="22" y="130" width="56" height="14" rx="4" fill="#6c45ad" stroke="#4b2c80" stroke-width="2"/>
  <rect x="16" y="144" width="68" height="16" rx="5" fill="#5a3796" stroke="#3b2066" stroke-width="2"/>
</svg>`;

  // ───────────────────────── LINES (all original) ─────────────────────────
  const LINES = {
    caine: [
      "Back from your little code-mines, are we? WONDERFUL! The circus missed you for exactly 47 minutes!",
      "Behold! The infinite checkered floor! I had it waxed. Infinitely!",
      "A break? From WORK? Why, that's practically an ADVENTURE! Let's make it official!",
      "Ladies, gentlemen, and assorted pixels: our favorite engineer has RETURNED!",
      "Did somebody say 'deploy'? No? Good. We don't say that word here. We say 'PERFORM!'",
      "I've prepared a delightful little adventure! It's only mildly existential!",
      "Remember, there are no bugs in the circus. Only surprise features!",
      "The tent is open twenty-four hours a day, eight days a week, and also on Gloomsday!",
      "I've alphabetized the void! It's all under V! Very tidy!",
      "Smile! You're on Ringmaster Cam! There is no Ringmaster Cam. Or IS there?",
    ],
    bubble: [
      "Hiii! I'm behind you! No, the other behind!",
      "I ate a semicolon! It tasted like syntax!",
      "What's a 'production'? Can I pop it?",
      "Caine says I can't eat the exit. There IS no exit. So I ate the sign.",
      "Pop quiz! Just kidding, I'm the only thing that pops here!",
      "I counted the floor tiles. It's a lot! Then I lost count. Then I ate the count.",
      "Your cursor tastes like blueberries! I licked it! Don't check!",
    ],
    pomni: [
      "Is... is there a way out of this sub-menu?",
      "Okay. Okay. Deep breaths. Pixels can't hurt me. Probably.",
      "Did anyone else just hear a door that isn't there?",
      "Why does my hat jingle every time I panic? WHY IS IT JINGLING NOW?",
      "You came in here ON PURPOSE? For FUN?",
    ],
    jax: [
      "Oh look, the code monkey's back. Ship anything, or just vibes?",
      "I'd help, but I'm extremely busy not helping.",
      "Nice break. Very productive. Love that for you.",
      "Fun fact: I've been standing here this whole time judging your commit messages.",
      "Click me again. I dare you. Nothing happens. That's the joke.",
    ],
    ragatha: [
      "You're doing amazing, sweetie! Even your merge conflicts are cute!",
      "Water break? Stretch break? Hug break? I offer all three!",
      "Don't mind Jax, he's like that with everyone! Mostly me!",
      "I sewed a little pocket for your worries. It's very small. Put ONE in.",
      "Everyone's so happy here! Aren't we? We ARE! Haha!",
    ],
    gangleHappy: [
      "Yay!! A visitor! Look, I'm smiling with my whole mask!",
      "I'm having the best day! Please don't touch my mask!",
      "Hee hee! Ribbons are great for hugging!",
    ],
    gangleSad: [
      "...my mask fell off again. Now I have to feel things.",
      "It's okay. I'll just be sad over here. Ribbonly.",
      "Please click me again so I can be happy...",
    ],
    zooble: [
      "Cool. A circus. Again. Wow.",
      "Don't make me be in an adventure today. Please.",
      "My left leg is a cone. My right leg is a pipe. Don't ask. I'm over it.",
      "If Caine announces one more 'surprise,' I'm detaching my head.",
      "You know you could just... go outside? Oh. Right. No exit. Never mind.",
    ],
    kinger: [
      "Have you seen my queen? She was right here in... what year is it?",
      "THE PILLOW FORT IS SECURE! Oh. Hello! Didn't see you there. For years.",
      "Is this a bishop? No. It's a sandwich. Carry on.",
      "I moved one square in any direction today. A personal best!",
      "Check! ...No wait, I'm the one who gets checked. Oh dear.",
    ],
    exitGuard: [
      "Ah-ah-AH! That's just a painted door, silly!",
      "The exit? Ha! That's decorative! Like my teeth!",
      "You don't want to leave! You want an ADVENTURE!",
      "Nope! That door's on a strict diet of nobody.",
    ],
  };

  // ───────────────────────── HELPERS ─────────────────────────
  const pick = (arr) => arr[Math.floor(Math.random() * arr.length)];
  const cycles = {};
  // Cycle through a character's lines without immediate repeats.
  function nextLine(key) {
    const arr = LINES[key];
    if (!cycles[key] || cycles[key].length === 0) {
      cycles[key] = arr.map((_, i) => i).sort(() => Math.random() - 0.5);
    }
    return arr[cycles[key].pop()];
  }

  // Speech bubbles anchored over an element. Live bubbles follow their anchor every frame (so they
  // don't get left behind when Caine glides or Bubble chases the cursor), stay inside the viewport,
  // and dodge earlier bubbles instead of stacking on top of them.
  const liveBubbles = [];
  let bubbleLoop = 0;
  const overlaps = (a, b) => a.left < b.right + 6 && a.right + 6 > b.left && a.top < b.bottom + 6 && a.bottom + 6 > b.top;
  function placeBubble(entry, placed) {
    const { bubble, anchor } = entry;
    let r = anchor.isConnected ? anchor.getBoundingClientRect() : null;
    if (!r || (r.width === 0 && r.height === 0)) r = entry.lastRect; // hidden/removed anchor: hold position
    if (!r) return;
    entry.lastRect = r;
    const vw = window.innerWidth, vh = window.innerHeight;
    const bw = bubble.offsetWidth, bh = bubble.offsetHeight;
    const cx = r.left + r.width / 2;
    const left = Math.max(8, Math.min(vw - bw - 8, cx - bw / 2));
    let top = r.top - bh - 14, below = false;
    if (top < 8) { top = r.bottom + 14; below = true; }
    top = Math.max(8, Math.min(vh - bh - 8, top));
    // Dodge bubbles placed earlier this frame (shift away from the anchor's side).
    for (let pass = 0; pass < 4; pass++) {
      const box = { left, right: left + bw, top, bottom: top + bh };
      const hit = placed.find((p) => overlaps(box, p));
      if (!hit) break;
      const up = hit.top - bh - 8, down = hit.bottom + 8;
      if (!below && up >= 8) top = up;
      else if (down + bh <= vh - 8) top = down;
      else if (up >= 8) top = up;
      else break;
    }
    bubble.classList.toggle('below', below);
    bubble.style.left = left + 'px';
    bubble.style.top = top + 'px';
    bubble.style.setProperty('--tail', Math.max(18, Math.min(bw - 18, cx - left)) + 'px');
    placed.push({ left, right: left + bw, top, bottom: top + bh });
  }
  function trackBubbles() {
    const placed = [];
    for (const entry of liveBubbles) placeBubble(entry, placed);
    bubbleLoop = liveBubbles.length ? requestAnimationFrame(trackBubbles) : 0;
  }
  function dropBubble(bubble) {
    const i = liveBubbles.findIndex((e) => e.bubble === bubble);
    if (i >= 0) liveBubbles.splice(i, 1);
  }
  function say(anchor, text, ms = 3800, opts = {}) {
    // voice it: explicit opts.voice ('jax', 'gangle:sad'), else data-voice, else a cast-named anchor id; opts.voice === false = silent
    const voice = opts.voice === false ? null : (opts.voice || (anchor && anchor.dataset && anchor.dataset.voice) || (anchor && VOICES[anchor.id] ? anchor.id : null));
    if (voice) { try { babble(voice, text, ms); } catch (e) { /* a voice hiccup must never block the bubble */ } }
    if (anchor._speech) { dropBubble(anchor._speech); anchor._speech.remove(); }
    const bubble = document.createElement('div');
    bubble.className = 'tadc-speech' + (opts.className ? ' ' + opts.className : '');
    bubble.innerHTML = text;
    document.body.appendChild(bubble);
    const entry = { bubble, anchor, lastRect: null };
    const placed = liveBubbles.map((e) => {
      const b = e.bubble.getBoundingClientRect();
      return { left: b.left, right: b.right, top: b.top, bottom: b.bottom };
    });
    liveBubbles.push(entry);
    placeBubble(entry, placed);
    if (!bubbleLoop) bubbleLoop = requestAnimationFrame(trackBubbles);
    anchor._speech = bubble;
    requestAnimationFrame(() => bubble.classList.add('show'));
    clearTimeout(anchor._speechTimer);
    anchor._speechTimer = setTimeout(() => {
      bubble.classList.remove('show');
      setTimeout(() => { dropBubble(bubble); bubble.remove(); }, 300);
      if (anchor._speech === bubble) anchor._speech = null;
    }, ms);
    return bubble;
  }

  // Make a non-button element act like one for keyboard and assistive tech (Enter / Space -> click).
  function clickable(el, label) {
    if (!el) return el;
    if (!el.hasAttribute('role')) el.setAttribute('role', 'button');
    if (!el.hasAttribute('tabindex')) el.tabIndex = 0;
    if (label) el.setAttribute('aria-label', label);
    el.addEventListener('keydown', (e) => {
      if (e.target !== el || e.repeat) return;
      if (e.key === 'Enter' || e.key === ' ') { e.preventDefault(); el.click(); }
    });
    return el;
  }

  // Confetti on a shared full-screen canvas.
  let confettiCanvas, confettiCtx, pieces = [], confettiRunning = false;
  const CONFETTI_COLORS = ['#e3243b', '#2f5bd8', '#ffd34d', '#5fd38d', '#ff7eb6', '#b07cff', '#ffffff'];
  function ensureConfetti() {
    if (confettiCanvas) return;
    confettiCanvas = document.createElement('canvas');
    confettiCanvas.className = 'tadc-confetti';
    Object.assign(confettiCanvas.style, { position: 'fixed', inset: '0', pointerEvents: 'none', zIndex: 9000 });
    document.body.appendChild(confettiCanvas);
    confettiCtx = confettiCanvas.getContext('2d');
    const resize = () => {
      confettiCanvas.width = innerWidth * devicePixelRatio;
      confettiCanvas.height = innerHeight * devicePixelRatio;
      confettiCtx.setTransform(devicePixelRatio, 0, 0, devicePixelRatio, 0, 0);
    };
    resize();
    addEventListener('resize', resize);
  }
  function confetti(x, y, count = 60, power = 1) {
    if (window.CircusCalm?.get()) return;
    ensureConfetti();
    for (let i = 0; i < count; i++) {
      const a = Math.random() * Math.PI * 2;
      const s = (3 + Math.random() * 7) * power;
      pieces.push({
        x, y, vx: Math.cos(a) * s, vy: Math.sin(a) * s - 4 * power,
        w: 5 + Math.random() * 6, h: 3 + Math.random() * 4,
        rot: Math.random() * 6, vr: (Math.random() - 0.5) * 0.4,
        color: pick(CONFETTI_COLORS), life: 0, ttl: 90 + Math.random() * 60,
        shape: Math.random() < 0.25 ? 'star' : 'rect',
      });
    }
    if (!confettiRunning) { confettiRunning = true; requestAnimationFrame(tickConfetti); }
  }
  function drawStar(ctx, r) {
    ctx.beginPath();
    for (let i = 0; i < 10; i++) {
      const rr = i % 2 ? r * 0.45 : r;
      const a = (i / 10) * Math.PI * 2 - Math.PI / 2;
      ctx.lineTo(Math.cos(a) * rr, Math.sin(a) * rr);
    }
    ctx.closePath();
    ctx.fill();
  }
  function tickConfetti() {
    const ctx = confettiCtx;
    ctx.clearRect(0, 0, innerWidth, innerHeight);
    pieces = window.CircusCalm?.get() ? [] : pieces.filter((p) => p.life < p.ttl);
    for (const p of pieces) {
      p.life++;
      p.vy += 0.18; p.vx *= 0.985; p.vy *= 0.985;
      p.x += p.vx; p.y += p.vy; p.rot += p.vr;
      ctx.save();
      ctx.globalAlpha = Math.max(0, 1 - p.life / p.ttl);
      ctx.translate(p.x, p.y);
      ctx.rotate(p.rot);
      ctx.fillStyle = p.color;
      if (p.shape === 'star') drawStar(ctx, p.w * 0.8);
      else ctx.fillRect(-p.w / 2, -p.h / 2, p.w, p.h * Math.abs(Math.cos(p.life * 0.2)) + 1);
      ctx.restore();
    }
    if (pieces.length) requestAnimationFrame(tickConfetti);
    else confettiRunning = false;
  }

  // ───────────────────────── CALLIOPE (original waltz, WebAudio) ─────────────────────────
  // An original oom-pah-pah melody in C major, 3/4 time. Not the show's theme.
  const NOTE = (n) => {
    const m = /^([A-G])(#?)(\d)$/.exec(n);
    const semis = { C: 0, D: 2, E: 4, F: 5, G: 7, A: 9, B: 11 }[m[1]] + (m[2] ? 1 : 0);
    return 440 * Math.pow(2, (semis + (parseInt(m[3], 10) - 4) * 12 - 9) / 12);
  };
  const MELODY = [
    ['E5', 1], ['G5', 1], ['E5', 1],    ['D5', 1], ['F5', 1], ['B4', 1],
    ['C5', 1], ['E5', 1], ['G5', 1],    ['C6', 2], [null, 1],
    ['A5', 1], ['F5', 1], ['C5', 1],    ['G5', 1], ['E5', 1], ['C5', 1],
    ['D5', 1], ['E5', .5], ['F5', .5], ['G5', 1], ['C5', 2], [null, 1],
    ['A5', 1], ['E5', 1], ['C5', 1],    ['F5', 1], ['A5', 1], ['C6', 1],
    ['E5', 1.5], ['D5', .5], ['C5', 1], ['B4', 1], ['D5', 1], ['G5', 1],
    ['G5', 1], ['A5', .5], ['G5', .5], ['E5', 1], ['F5', 1], ['D5', 1], ['A4', 1],
    ['G4', 1], ['B4', 1], ['D5', 1],    ['C5', 3],
  ];
  const CHORDS = {
    C: ['C3', ['E4', 'G4', 'C5']], G7: ['G2', ['F4', 'B4', 'D5']], F: ['F2', ['F4', 'A4', 'C5']],
    G: ['G2', ['G4', 'B4', 'D5']], Am: ['A2', ['E4', 'A4', 'C5']],
  };
  const PROGRESSION = ['C', 'G7', 'C', 'C', 'F', 'C', 'G', 'C', 'Am', 'F', 'C', 'G7', 'C', 'F', 'G7', 'C'];

  const calliope = { ctx: null, playing: false, timer: null, nextTime: 0, beat: 0, melIdx: 0, melBeat: 0, master: null };
  function pipe(freq, t, dur, vol, ctx, dest) {
    // A cheerful wheezy pipe: sine + 2nd + 3rd harmonics, with wobbly vibrato.
    const g = ctx.createGain();
    g.gain.setValueAtTime(0, t);
    g.gain.linearRampToValueAtTime(vol, t + 0.02);
    g.gain.setValueAtTime(vol, t + dur * 0.75);
    g.gain.linearRampToValueAtTime(0, t + dur);
    g.connect(dest);
    const lfo = ctx.createOscillator();
    const lfoGain = ctx.createGain();
    lfo.frequency.value = 6.2; lfoGain.gain.value = freq * 0.012;
    lfo.connect(lfoGain);
    [[1, 1], [2, 0.35], [3, 0.15]].forEach(([mult, amp]) => {
      const o = ctx.createOscillator();
      o.type = mult === 1 ? 'triangle' : 'sine';
      o.frequency.value = freq * mult;
      lfoGain.connect(o.frequency);
      const og = ctx.createGain(); og.gain.value = amp;
      o.connect(og); og.connect(g);
      o.start(t); o.stop(t + dur + 0.05);
    });
    lfo.start(t); lfo.stop(t + dur + 0.05);
  }
  function scheduleCalliope() {
    const c = calliope, ctx = c.ctx, beatLen = 60 / 168;
    while (c.nextTime < ctx.currentTime + 0.25) {
      const bar = Math.floor(c.beat / 3) % PROGRESSION.length;
      const inBar = c.beat % 3;
      const [bass, chord] = CHORDS[PROGRESSION[bar]];
      if (inBar === 0) pipe(NOTE(bass), c.nextTime, beatLen * 0.9, 0.16, ctx, c.master);
      else chord.forEach((n) => pipe(NOTE(n), c.nextTime, beatLen * 0.45, 0.045, ctx, c.master));
      // melody on its own clock (supports half-beats)
      const melStart = c.beat, melEnd = c.beat + 1;
      while (c.melBeat < melEnd) {
        const [n, len] = MELODY[c.melIdx];
        const t = c.nextTime + (c.melBeat - melStart) * beatLen;
        if (n) pipe(NOTE(n), t, len * beatLen * 0.92, 0.09, ctx, c.master);
        c.melBeat += len;
        c.melIdx = (c.melIdx + 1) % MELODY.length;
      }
      c.beat++;
      c.nextTime += beatLen;
    }
  }
  function toggleCalliope() {
    const c = calliope;
    if (!c.ctx) {
      c.ctx = new (window.AudioContext || window.webkitAudioContext)();
      c.master = c.ctx.createGain(); c.master.gain.value = 0.55;
      c.master.connect(c.ctx.destination);
    }
    if (c.playing) {
      c.playing = false; clearInterval(c.timer);
      c.master.gain.setTargetAtTime(0, c.ctx.currentTime, 0.05);
      return false;
    }
    c.ctx.resume();
    c.master.gain.cancelScheduledValues(c.ctx.currentTime);
    c.master.gain.setTargetAtTime(0.55, c.ctx.currentTime, 0.05);
    c.playing = true; c.beat = 0; c.melIdx = 0; c.melBeat = 0;
    c.nextTime = c.ctx.currentTime + 0.05;
    c.timer = setInterval(scheduleCalliope, 50);
    scheduleCalliope();
    return true;
  }

  // ───────────────────────── CHARACTER VOICES (babble) ─────────────────────────
  // Each cast member "talks" in synthesized syllable blips, timed to their speech bubble.
  // The vowels in the actual line pick each syllable's formant, so different lines sound different.
  // Routed through the wrapped AudioContext, so Quiet Mode mutes it like everything else.
  const VOICES = {
    //          wave        base Hz  syllable s  gap s   volume  vibrato Hz/depth   formant×  extras
    caine:   { wave: 'sawtooth', base: 210, syl: 0.075, gap: 0.022, vol: 0.055, vib: [6, 0.03], form: 1.35, swoop: 1.5 },
    bubble:  { wave: 'sine',     base: 760, syl: 0.048, gap: 0.018, vol: 0.07,  vib: [0, 0],    form: 2.2,  drop: 0.55, jitter: 0.25 },
    pomni:   { wave: 'triangle', base: 390, syl: 0.072, gap: 0.034, vol: 0.075, vib: [10, 0.06], form: 1.45, jitter: 0.12 },
    jax:     { wave: 'sawtooth', base: 118, syl: 0.105, gap: 0.05,  vol: 0.05,  vib: [0, 0],    form: 0.85, lowpass: 650, fall: 0.8 },
    ragatha: { wave: 'triangle', base: 300, syl: 0.08,  gap: 0.03,  vol: 0.08,  vib: [5, 0.02], form: 1.2,  lilt: 1.25 },
    gangle:  { wave: 'sine',     base: 450, syl: 0.088, gap: 0.04,  vol: 0.07,  vib: [4, 0.02], form: 1.5,  breath: 0.35 },
    zooble:  { wave: 'square',   base: 175, syl: 0.078, gap: 0.03,  vol: 0.032, vib: [0, 0],    form: 1.0,  lowpass: 1300, flat: true },
    kinger:  { wave: 'sine',     base: 245, syl: 0.1,   gap: 0.055, vol: 0.08,  vib: [3.5, 0.09], form: 1.1, jitter: 0.3, stagger: 0.05 },
  };
  const VOICE_GAIN = 2.2; // voices sat well below the sfx levels; this brings them up to match
  const VOWEL_F1 = { a: 820, e: 520, i: 320, o: 560, u: 360, y: 400 };
  let babbleNoise = null;
  function babble(who, text, ms) {
    const [name, mood] = String(who || '').split(':');
    const v = VOICES[name];
    if (!v || !text) return;
    const vol = v.vol * VOICE_GAIN;
    const ua = navigator.userActivation;
    if (ua && !ua.hasBeenActive) return; // browsers block audio until the first click/tap/key
    if (!calliope.ctx) {
      calliope.ctx = new (window.AudioContext || window.webkitAudioContext)();
      calliope.master = calliope.ctx.createGain(); calliope.master.gain.value = 0.55;
      calliope.master.connect(calliope.ctx.destination);
    }
    const ctx = calliope.ctx; ctx.resume().catch(() => {});
    // plain words only: drop markup, a leading "Name:" label, and *stage directions*
    const plain = String(text).replace(/<[^>]*>/g, ' ').replace(/^\s*[A-Za-z]+:\s*/, '').replace(/\*[^*]*\*/g, ' ').replace(/&[a-z]+;/g, ' ');
    const words = plain.toLowerCase().match(/[a-z']+|[!?.,]/g) || [];
    // ~1 syllable per 3 letters, punctuation becomes a pause; squeeze to fit the bubble's time
    const sylls = [];
    for (const w of words) {
      if (/^[!?.,]$/.test(w)) { sylls.push({ pause: w === ',' ? 1 : 2, emph: w === '!' || w === '?' ? w : null }); continue; }
      const n = Math.max(1, Math.ceil(w.length / 3));
      for (let i = 0; i < n; i++) { const chunk = w.slice(i * 3, i * 3 + 3); sylls.push({ vowel: (chunk.match(/[aeiouy]/) || ['e'])[0] }); }
    }
    const budget = Math.max(0.4, ((ms || 3000) / 1000) * 0.8);
    const slot = v.syl + v.gap;
    const maxSyl = Math.min(40, Math.floor(budget / slot));
    const voiced = sylls.filter((s) => !s.pause);
    const keep = voiced.length > maxSyl ? maxSyl / voiced.length : 1;
    const sadShift = name === 'gangle' && mood === 'sad' ? 0.78 : 1;
    let t = ctx.currentTime + 0.03, idx = 0, count = 0;
    const total = Math.max(1, Math.min(voiced.length, maxSyl));
    for (let k = 0; k < sylls.length; k++) {
      const s = sylls[k];
      if (s.pause) { t += v.gap * s.pause * 2.5; continue; }
      idx++;
      if (keep < 1 && Math.floor(idx * keep) === Math.floor((idx - 1) * keep)) continue; // thin out long lines evenly
      if (count >= maxSyl) break;
      count++;
      const progress = count / total;
      const nextEmph = (sylls.slice(k + 1).find((x) => x.pause) || {}).emph;
      let f = v.base * sadShift * (1 + (Math.random() - 0.5) * (v.jitter ?? 0.15));
      if (v.flat) f = v.base;
      if (v.swoop) f *= 1 + Math.sin(progress * Math.PI * 2.2) * 0.18 * v.swoop;
      if (v.lilt && progress > 0.75) f *= v.lilt;
      if (v.fall) f *= 1 - progress * 0.18 * v.fall;
      if (nextEmph === '?') f *= 1.18; else if (nextEmph === '!') f *= 1.1;
      const dur = v.syl * (0.85 + Math.random() * 0.3);
      const o = ctx.createOscillator(); o.type = v.wave;
      o.frequency.setValueAtTime(f, t);
      if (v.drop) o.frequency.exponentialRampToValueAtTime(f * v.drop, t + dur);
      if (v.vib[1]) {
        const lfo = ctx.createOscillator(), lg = ctx.createGain();
        lfo.frequency.value = v.vib[0]; lg.gain.value = f * v.vib[1];
        lfo.connect(lg); lg.connect(o.frequency); lfo.start(t); lfo.stop(t + dur + 0.02);
      }
      // vowel-shaped formant
      const bp = ctx.createBiquadFilter(); bp.type = 'bandpass';
      bp.frequency.value = (VOWEL_F1[s.vowel] || 500) * v.form; bp.Q.value = 2.2;
      const dry = ctx.createGain(); dry.gain.value = 0.45;
      const g = ctx.createGain();
      g.gain.setValueAtTime(0.0001, t);
      g.gain.exponentialRampToValueAtTime(vol, t + Math.min(0.012, dur / 4));
      g.gain.setValueAtTime(vol, t + dur * 0.6);
      g.gain.exponentialRampToValueAtTime(0.0001, t + dur);
      o.connect(bp); bp.connect(g); o.connect(dry); dry.connect(g);
      let out = g;
      if (v.lowpass) { const lp = ctx.createBiquadFilter(); lp.type = 'lowpass'; lp.frequency.value = v.lowpass; g.connect(lp); out = lp; }
      out.connect(ctx.destination);
      o.start(t); o.stop(t + dur + 0.02);
      if (v.breath) {
        if (!babbleNoise) {
          babbleNoise = ctx.createBuffer(1, ctx.sampleRate * 0.3, ctx.sampleRate);
          const d = babbleNoise.getChannelData(0); for (let i = 0; i < d.length; i++) d[i] = Math.random() * 2 - 1;
        }
        const n = ctx.createBufferSource(); n.buffer = babbleNoise;
        const nf = ctx.createBiquadFilter(); nf.type = 'bandpass'; nf.frequency.value = 2400; nf.Q.value = 0.8;
        const ng = ctx.createGain(); ng.gain.setValueAtTime(vol * v.breath, t); ng.gain.exponentialRampToValueAtTime(0.0001, t + dur);
        n.connect(nf); nf.connect(ng); ng.connect(ctx.destination); n.start(t, Math.random() * 0.2); n.stop(t + dur);
      }
      t += dur + v.gap + (v.stagger ? Math.random() * v.stagger : 0);
    }
  }

  // Called directly from a visitor's click to unlock and verify browser audio.
  async function testVoice(who = 'caine', text = 'Welcome to the circus! Can you hear me?') {
    if (!(window.AudioContext || window.webkitAudioContext)) return 'Audio is unavailable in this browser.';
    try {
      quiet.set(false);
      babble(who, text, 2600);
      if (!calliope.ctx) return 'Click the sound test button to enable browser audio.';
      await calliope.ctx.resume();
      return calliope.ctx.state === 'running'
        ? 'Character sound is playing. If silent, check the browser tab and device volume.'
        : 'Browser audio is still blocked. Try the sound test again after allowing audio.';
    } catch { return 'Audio could not start. Check the browser sound permission and try again.'; }
  }

  // Little one-shot sound effects.
  function sfx(kind) {
    // Browsers refuse to start audio before the first click/tap/key. Skip silently instead of
    // creating a blocked AudioContext (console warning) that later blurts a backlog of sounds.
    const ua = navigator.userActivation;
    if (ua && !ua.hasBeenActive) return;
    if (!calliope.ctx) {
      calliope.ctx = new (window.AudioContext || window.webkitAudioContext)();
      calliope.master = calliope.ctx.createGain(); calliope.master.gain.value = 0.55;
      calliope.master.connect(calliope.ctx.destination);
    }
    const ctx = calliope.ctx; ctx.resume().catch(() => {});
    const t = ctx.currentTime, o = ctx.createOscillator(), g = ctx.createGain();
    o.connect(g); g.connect(ctx.destination);
    const env = (v, d) => { g.gain.setValueAtTime(v, t); g.gain.exponentialRampToValueAtTime(0.0001, t + d); o.start(t); o.stop(t + d); };
    if (kind === 'honk') { o.type = 'sawtooth'; o.frequency.setValueAtTime(330, t); o.frequency.exponentialRampToValueAtTime(240, t + 0.25); env(0.12, 0.3); }
    else if (kind === 'pop') { o.type = 'sine'; o.frequency.setValueAtTime(900, t); o.frequency.exponentialRampToValueAtTime(200, t + 0.08); env(0.2, 0.1); }
    else if (kind === 'boing') { o.type = 'triangle'; o.frequency.setValueAtTime(180, t); o.frequency.exponentialRampToValueAtTime(620, t + 0.18); env(0.15, 0.35); }
    else if (kind === 'glitch') { o.type = 'square'; for (let i = 0; i < 8; i++) o.frequency.setValueAtTime(80 + Math.random() * 900, t + i * 0.03); env(0.06, 0.26); }
    else if (kind === 'ding') { o.type = 'sine'; o.frequency.setValueAtTime(1320, t); env(0.15, 0.6); }
    else if (kind === 'tick') { o.type = 'square'; o.frequency.setValueAtTime(1800 + Math.random() * 300, t); env(0.035, 0.03); }
    else if (kind === 'fanfare') {
      o.disconnect();
      ['C5', 'E5', 'G5', 'C6'].forEach((n, i) => pipe(NOTE(n), t + i * 0.11, i === 3 ? 0.5 : 0.12, 0.1, ctx, ctx.destination));
    }
  }

  // Inject shared styles for speech bubbles.
  const style = document.createElement('style');
  style.textContent = `
  .tadc-speech{position:fixed;z-index:9500;max-width:min(320px,80vw);padding:12px 16px;background:#fff;color:#1b1b2f;
    font:600 15px/1.35 'Fredoka',system-ui,sans-serif;border:3px solid #1b1b2f;border-radius:18px;box-shadow:5px 5px 0 #1b1b2f;
    opacity:0;transform:translateY(8px) scale(.9);transition:opacity .2s,transform .25s cubic-bezier(.3,1.6,.5,1);pointer-events:none}
  .tadc-speech.show{opacity:1;transform:none}
  .tadc-speech::after{content:'';position:absolute;left:calc(var(--tail,50%) - 10px);bottom:-14px;border:10px solid transparent;border-top:12px solid #1b1b2f}
  .tadc-speech.below::after{bottom:auto;top:-22px;border-top-color:transparent;border-bottom:12px solid #1b1b2f}
  .tadc-speech.caine{background:#fff7d6;border-color:#8a0c1a;box-shadow:5px 5px 0 #8a0c1a;font-size:16px}
  .tadc-speech.caine::after{border-top-color:#8a0c1a}
  .tadc-speech.caine.below::after{border-top-color:transparent;border-bottom-color:#8a0c1a}
  .tadc-speech a{color:#e3243b;font-weight:700;pointer-events:auto}
  [role="button"]:focus-visible{outline:3px dashed #ffd34d;outline-offset:4px;border-radius:8px}
  .caine-svg .jaw-top{animation:jawTop .35s ease-in-out infinite alternate;transform-origin:70px 92px}
  .caine-svg .jaw-bot{animation:jawBot .35s ease-in-out infinite alternate;transform-origin:70px 96px}
  .caine-svg.quiet .jaw-top,.caine-svg.quiet .jaw-bot{animation:none}
  @keyframes jawTop{to{transform:translateY(-3px)}}
  @keyframes jawBot{to{transform:translateY(5px)}}
  `;
  document.head.appendChild(style);

  // Caine helpers: chatter while talking, track pupils, blink.
  function wireCaine(root) {
    const svg = root.querySelector('.caine-svg');
    svg.classList.add('quiet');
    const pupils = svg.querySelectorAll('.pupil');
    const base = [[52, 63], [88, 63]];
    addEventListener('pointermove', (e) => {
      if (window.CircusCalm?.get()) return;
      const r = svg.getBoundingClientRect();
      const cx = r.left + r.width / 2, cy = r.top + r.height * 0.33;
      const a = Math.atan2(e.clientY - cy, e.clientX - cx);
      const d = Math.min(5, Math.hypot(e.clientX - cx, e.clientY - cy) / 40);
      pupils.forEach((p, i) => {
        p.setAttribute('cx', base[i][0] + Math.cos(a) * d);
        p.setAttribute('cy', base[i][1] + Math.sin(a) * d);
      });
    });
    const lids = svg.querySelectorAll('.lid');
    const blink = () => {
      if (window.CircusCalm?.get()) { setTimeout(blink, 3000); return; }
      lids.forEach((l) => l.setAttribute('height', 30));
      setTimeout(() => lids.forEach((l) => l.setAttribute('height', 0)), 120);
      setTimeout(blink, 2200 + Math.random() * 3500);
    };
    setTimeout(blink, 1500);
    return {
      talk(text, ms = 4200, opts = {}) {
        svg.classList.remove('quiet');
        clearTimeout(svg._q);
        svg._q = setTimeout(() => svg.classList.add('quiet'), Math.min(ms, 300 + text.length * 45));
        return say(root, text, ms, { className: 'caine', voice: 'caine', ...opts });
      },
    };
  }

  // ───────────────────────── CIRCUS PASSPORT ─────────────────────────
  // Every act page that loads this file stamps the visitor's passport (per-browser localStorage).
  // Keys are act folder names like "07-the-big-top-band"; the Big Top reads them to show SEEN stamps.
  const PASSPORT_KEY = 'tadc-passport-v1';
  const actKey = (path) => { const m = /acts\/(\d{2}-[^/]+)\//.exec(decodeURIComponent(path || '')); return m ? m[1] : null; };
  const passport = {
    list() { try { return JSON.parse(localStorage.getItem(PASSPORT_KEY)) || {}; } catch (e) { return {}; } },
    has(hrefOrKey) { return !!passport.list()[actKey(hrefOrKey) || hrefOrKey]; },
    count() { return Object.keys(passport.list()).length; },
    actKey,
  };
  (function stamp() {
    const key = actKey(location.pathname);
    if (!key) return;
    try {
      const all = passport.list();
      if (!all[key]) { all[key] = Date.now(); localStorage.setItem(PASSPORT_KEY, JSON.stringify(all)); }
    } catch (e) { /* storage blocked: no stamp, no problem */ }
  })();

  // ───────────────────────── IN-ACT NAVIGATION ─────────────────────────
  // On act pages, add "Next ▸" and "🎲" (random, unvisited first) pills beside the page's own back link.
  // The list comes from assets/adventures.js, loaded lazily so acts don't need to include it themselves.
  (function actNav() {
    const here = actKey(location.pathname);
    if (!here) return;
    const self = document.currentScript && document.currentScript.src;
    const base = self ? self.replace(/cast\.js(\?.*)?$/, '') : '../../assets/';
    function build() {
      const acts = (window.CIRCUS_ADVENTURES || []).filter((a) => !a.soon && actKey(a.href));
      const i = acts.findIndex((a) => actKey(a.href) === here);
      if (!acts.length || i < 0) return;
      const back = document.getElementById('back') || document.querySelector('a[href="../../index.html"]');
      if (!back) return;
      const next = acts[(i + 1) % acts.length];
      const others = acts.filter((a) => actKey(a.href) !== here);
      const unvisited = others.filter((a) => !passport.has(a.href));
      const css = document.createElement('style');
      css.textContent = `.tadc-nav{font:700 13px 'Fredoka',system-ui,sans-serif;color:#1b1b2f;background:#fff7d6;border:3px solid #1b1b2f;border-radius:999px;
        padding:6px 11px;box-shadow:2px 2px 0 #1b1b2f;text-decoration:none;white-space:nowrap;z-index:45;display:inline-block;line-height:1.2;min-height:0;min-width:0;height:auto;margin:0;vertical-align:middle}
        .tadc-nav:hover{background:#ffd34d}.tadc-nav.tadc-off{display:none!important}.tadc-nav:focus-visible{outline:3px dashed #ffd34d;outline-offset:2px}`;
      document.head.appendChild(css);
      const mk = (label, title, href) => {
        const a = document.createElement('a'); a.className = 'tadc-nav'; a.textContent = label; a.title = title; a.setAttribute('aria-label', title);
        a.href = '../../' + href; return a;
      };
      const nextA = mk('Next ▸', `Next adventure: ${next.title}`, next.href);
      const pool = unvisited.length ? unvisited : others;
      const randomHref = () => pool[Math.floor(Math.random() * pool.length)].href;
      const randA = mk('🎲', unvisited.length ? 'Random adventure you haven\'t visited yet' : 'Random adventure', randomHref());
      randA.addEventListener('click', (e) => { e.preventDefault(); location.href = '../../' + randomHref(); }); // re-roll on every click
      // 🔊/🔇 Quiet Mode pill (persists across every act and the Big Top)
      const quietA = document.createElement('button');
      quietA.type = 'button'; quietA.className = 'tadc-nav';
      quietA.style.cursor = 'pointer';
      const paintQuiet = (on) => { quietA.textContent = on ? '🔇' : '🔊'; quietA.title = on ? 'Quiet Mode is on: click to unmute the circus' : 'Click for Quiet Mode (mutes every act)'; quietA.setAttribute('aria-label', quietA.title); quietA.setAttribute('aria-pressed', on ? 'true' : 'false'); };
      paintQuiet(quiet.get()); quiet.onChange(paintQuiet);
      quietA.addEventListener('click', (e) => { e.stopPropagation(); quiet.toggle(); });
      quietA.addEventListener('keydown', (e) => e.stopPropagation()); // don't let Space/Enter reach game key handlers
      const pills = [nextA, randA, quietA];
      // ⏱ break-coach countdown chip (contract: localStorage 'tadc-break-v1' = {start, end, minutes[, nudged]})
      const breakChip = document.createElement('span');
      breakChip.className = 'tadc-nav tadc-off'; breakChip.setAttribute('role', 'timer');
      breakChip.title = 'Break time left (set from the Big Top break coach)';
      pills.push(breakChip);
      const BREAK_KEY = 'tadc-break-v1';
      const readBreak = () => { try { return JSON.parse(localStorage.getItem(BREAK_KEY)); } catch (e) { return null; } };
      const writeBreak = (b) => { try { if (b) localStorage.setItem(BREAK_KEY, JSON.stringify(b)); else { localStorage.removeItem(BREAK_KEY); localStorage.removeItem(NUDGED_KEY); } } catch (e) { /* storage blocked */ } };
      // one nudge per end time, shared with assets/breakcoach.js on the Big Top (it stores the end it already nudged for)
      const NUDGED_KEY = 'tadc-break-nudged-v1';
      const nudgedFor = () => { try { return Number(localStorage.getItem(NUDGED_KEY)) || 0; } catch (e) { return 0; } };
      const markNudged = (end) => { try { localStorage.setItem(NUDGED_KEY, String(end)); } catch (e) { /* storage blocked */ } };
      function breakNudge(b) {
        markNudged(b.end);
        const t = document.createElement('div');
        t.className = 'tadc-stub-toast'; t.setAttribute('role', 'alertdialog'); t.setAttribute('aria-label', 'Break is over');
        t.innerHTML = `<b>⏱️ Break's over!</b><p>“Back to the code mines, superstar! The circus will keep your seat warm. Forever. Hoo-hoo!” — Caine</p>`;
        const row = document.createElement('div'); row.style.cssText = 'display:flex;gap:8px;margin-top:6px';
        const mkB = (label, fn) => { const x = document.createElement('button'); x.type = 'button'; x.textContent = label; x.className = 'tadc-nav'; x.style.cursor = 'pointer'; x.addEventListener('click', (e) => { e.stopPropagation(); fn(); t.remove(); }); return x; };
        row.append(mkB('5 more minutes', () => { const nb = readBreak() || b; nb.end = Date.now() + 5 * 60000; nb.minutes = (nb.minutes || 0) + 5; writeBreak(nb); }), mkB('Done', () => writeBreak(null)));
        t.appendChild(row);
        ensureStubCss();
        document.body.appendChild(t); requestAnimationFrame(() => t.classList.add('show'));
        try { if (window.TADC && TADC.babble) TADC.babble('caine', "Break's over! Back to the code mines!", 2500); } catch (e) { /* voice optional */ }
      }
      function tickBreak() {
        const b = readBreak();
        if (!b || !b.end) { breakChip.classList.add('tadc-off'); return; }
        const left = b.end - Date.now();
        if (left <= 0) { breakChip.classList.add('tadc-off'); if (nudgedFor() !== b.end) breakNudge(b); return; }
        const m = Math.floor(left / 60000), sec = Math.floor(left / 1000) % 60;
        breakChip.textContent = `⏱ ${m}:${String(sec).padStart(2, '0')}`;
        breakChip.classList.remove('tadc-off');
      }
      tickBreak(); setInterval(tickBreak, 1000);
      addEventListener('storage', (e) => { if (e.key === BREAK_KEY || e.key === NUDGED_KEY) tickBreak(); });
      const pos = getComputedStyle(back).position;
      if (pos === 'fixed' || pos === 'absolute') {
        // float the pills just to the right of the back link, tracking it on resize
        pills.forEach((a) => { a.style.position = 'fixed'; document.body.appendChild(a); });
        const place = () => {
          const r = back.getBoundingClientRect(), hidden = getComputedStyle(back).display === 'none' || !r.width;
          pills.forEach((a) => { a.style.display = hidden ? 'none' : ''; });
          if (hidden) return;
          const rowWidth = () => pills.reduce((w, a) => w + a.offsetWidth + 6, 0);
          // narrow screens: shorten "Next ▸" to "▸" first; if the row still won't fit, put it on a line above the back link
          nextA.textContent = 'Next ▸';
          if (r.right + 8 + rowWidth() > innerWidth - 6) nextA.textContent = '▸';
          const fitsBeside = r.right + 8 + rowWidth() <= innerWidth - 6;
          let x = fitsBeside ? r.right + 8 : r.left;
          const h = pills[0].offsetHeight;
          const y = fitsBeside ? r.top + (r.height - h) / 2 : (r.top - h - 8 > 4 ? r.top - h - 8 : r.bottom + 8);
          pills.forEach((a) => { a.style.left = x + 'px'; a.style.top = y + 'px'; x += a.offsetWidth + 6; });
        };
        place(); addEventListener('resize', place); setTimeout(place, 600); // after webfonts settle
      } else {
        // group back + pills into one inline unit so flex/grid parents (e.g. space-between headers) treat them as one item
        const group = document.createElement('span');
        group.className = 'tadc-nav-group';
        group.style.cssText = 'display:inline-flex;align-items:center;gap:6px;flex-wrap:wrap';
        back.replaceWith(group);
        group.append(back, ...pills);
      }
    }
    const go = () => {
      if (window.CIRCUS_ADVENTURES) return build();
      const s = document.createElement('script'); s.src = base + 'adventures.js'; s.onload = build; document.head.appendChild(s);
    };
    if (document.readyState === 'loading') document.addEventListener('DOMContentLoaded', go); else go();
  })();

  // ───────────────────────── THE PAINTED DOOR MYSTERY ─────────────────────────
  // Eight torn ticket stubs hide in eight acts. Each carries a letter and a scrap of Caine's diary.
  // Acts report a find with TADC.mystery.find('stub-N'); the Big Top's EXIT sign opens the case file
  // (assets/mystery-casefile.js) and the solved password unlocks acts/00-backstage/.
  // Codex/others: optional BONUS stubs use ids 'bonus-<act>' and are counted separately.
  const MYSTERY_KEY = 'tadc-mystery-v1';
  const STUBS = [
    { id: 'stub-1', n: 1, letter: 'A', act: '01', where: 'Find the Exit', hint: 'A runaway door keeps something in its pocket. Chase it deep enough and it falls out.',
      note: 'Day one of the circus. I painted my first door. It looked lonely, so I painted a second.' },
    { id: 'stub-2', n: 2, letter: 'U', act: '13', where: "Pomni's Exit Interview", hint: 'Some hallways end. Walk far enough and the broom closet keeps a secret.',
      note: 'Note to self: every REAL door back here opens onto the same place. Keep it secret. No. Keep it a SURPRISE.' },
    { id: 'stub-3', n: 3, letter: 'D', act: '04', where: "Kinger's Chess Nightmare", hint: 'When one of your little pieces reaches the far side, it becomes something else. So does a clue.',
      note: 'Kinger asked me where the doors go. I said "checkmate!" He accepted this.' },
    { id: 'stub-4', n: 4, letter: 'I', act: '07', where: 'The Big Top Band', hint: 'Load the honkiest song and let the band play it all the way through.',
      note: 'The real door makes a sound when it opens. It sounds like... applause?' },
    { id: 'stub-5', n: 5, letter: 'E', act: '12', where: 'Build-a-Zooble', hint: 'Build something with at least ten parts and ask Zooble what they think.',
      note: "Zooble's spare parts come from the props room. The props room is right next to the real door. Nobody look in the props room." },
    { id: 'stub-6', n: 6, letter: 'N', act: '17', where: 'Bubble-gotchi', hint: 'Bubble will eat anything. Even a door. Especially a door.',
      note: 'Bubble ate one of my doors again. Behind where it was: rows and rows of seats. Painted three more doors, quickly.' },
    { id: 'stub-7', n: 7, letter: 'C', act: '19', where: "Caine's Pinball Spectacular", hint: 'Spell the four forbidden letters on the table and watch the door swing open.',
      note: "If anyone ever finds the keyhole, they'll need the word. The word is whoever is always watching." },
    { id: 'stub-8', n: 8, letter: 'E', act: '08', where: "Caine's Fireworks Spectacular", hint: 'Write a friendly reminder across the sky. In letters of fire.',
      note: "Fine. It's spelled out on the stubs. Eight letters, in order. I am TERRIBLE at secrets. — C." },
  ];
  const ANSWER = 'AUDIENCE';
  const readMystery = () => { try { return Object.assign({ found: {}, solved: false }, JSON.parse(localStorage.getItem(MYSTERY_KEY)) || {}); } catch (e) { return { found: {}, solved: false }; } };
  const writeMystery = (m) => { try { localStorage.setItem(MYSTERY_KEY, JSON.stringify(m)); } catch (e) { /* storage blocked: the hunt lasts this page only */ } };
  function ensureStubCss() {
    if (document.getElementById('tadc-stub-css')) return;
    {
      const css = document.createElement('style'); css.id = 'tadc-stub-css';
      css.textContent = `.tadc-stub-toast{position:fixed;right:16px;bottom:16px;z-index:9700;width:min(320px,86vw);background:#fff7d6;color:#1b1b2f;border:4px solid #1b1b2f;
        border-radius:6px 6px 14px 14px;box-shadow:6px 6px 0 #8a0c1a;padding:14px 16px 12px;font:500 14px/1.4 'Fredoka',system-ui,sans-serif;transform:translateY(140%) rotate(-3deg);
        transition:transform .55s cubic-bezier(.3,1.5,.5,1)}
        .tadc-stub-toast.show{transform:rotate(-2deg)}
        .tadc-stub-tear{position:absolute;left:-4px;right:-4px;top:-10px;height:12px;background:radial-gradient(circle at 8px 0,transparent 7px,#fff7d6 7.5px) -4px 0/16px 12px repeat-x}
        .tadc-stub-toast b{display:block;font-size:15px;color:#8a0c1a}
        .tadc-stub-letter{float:right;margin:4px 0 4px 10px;width:54px;height:54px;border:3px dashed #e3243b;border-radius:10px;display:flex;align-items:center;justify-content:center;
          font:400 34px 'Rye',Georgia,serif;color:#e3243b;background:#fff}
        .tadc-stub-toast p{margin:6px 0;font-style:italic}
        .tadc-stub-toast small{color:#5c3a99;font-weight:700}`;
      document.head.appendChild(css);
    }
  }
  function stubToast(stub, count) {
    const t = document.createElement('div');
    t.className = 'tadc-stub-toast'; t.setAttribute('role', 'status');
    t.innerHTML = `<div class="tadc-stub-tear"></div><b>🎟️ Torn ticket stub #${stub.n} found!</b>` +
      `<div class="tadc-stub-letter" aria-label="Letter ${stub.letter}">${stub.letter}</div>` +
      `<p>“${stub.note}”</p><small>${count}/${STUBS.length} stubs · the EXIT sign on the Big Top looks... different.</small>`;
    ensureStubCss();
    document.body.appendChild(t);
    requestAnimationFrame(() => t.classList.add('show'));
    setTimeout(() => { t.classList.remove('show'); setTimeout(() => t.remove(), 700); }, 7500);
    t.addEventListener('click', () => { t.classList.remove('show'); setTimeout(() => t.remove(), 700); });
  }
  const mystery = {
    STUBS, KEY: MYSTERY_KEY,
    state: readMystery,
    count() { const f = readMystery().found; return STUBS.filter((s) => f[s.id]).length; },
    has(id) { return !!readMystery().found[id]; },
    // returns true only on a NEW find (and shows the stub toast)
    find(id) {
      const m = readMystery();
      if (m.found[id]) return false;
      m.found[id] = Date.now(); writeMystery(m);
      const stub = STUBS.find((s) => s.id === id);
      if (stub) {
        stubToast(stub, STUBS.filter((s) => m.found[s.id]).length);
        try { sfx('ding'); } catch (e) { /* audio optional */ }
        try { confetti(innerWidth - 140, innerHeight - 160, 40, 0.7); } catch (e) { /* visuals optional */ }
      }
      return true;
    },
    solved() { return !!readMystery().solved; },
    solve(word) {
      const m = readMystery();
      const ok = String(word || '').trim().toUpperCase().replace(/[^A-Z]/g, '') === ANSWER && STUBS.every((s) => m.found[s.id]);
      if (ok) { m.solved = true; m.solvedAt = m.solvedAt || Date.now(); writeMystery(m); }
      return ok;
    },
  };

  window.TADC = { CAST, LINES, pick, nextLine, say, confetti, toggleCalliope, sfx, wireCaine, clickable, passport, quiet, babble, testVoice, VOICES, mystery };
})();
