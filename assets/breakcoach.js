/* ⏱️ Break coach for the Big Top. Self-mounting.
 * A "⏱️ Break" pill (top-left) opens a dialog: pick 2/5/10/15/30 minutes, Caine suggests acts that fit, Start timer.
 * CONTRACT: localStorage['tadc-break-v1'] = JSON {start, end, minutes} (ms timestamps). assets/cast.js reads it inside acts.
 * When the timer ends on the Big Top, Caine nudges once per end time, with "5 more minutes" (extends end) and "Done" (clears).
 * Exposes window.CircusBreak = { DURATIONS, get, start, extend, clear, open, suggest }.
 * All dialogue is original. */
(function () {
  'use strict';
  const KEY = 'tadc-break-v1';
  const NUDGED_KEY = 'tadc-break-nudged-v1'; // the `end` we already nudged for, so a reload never nags twice
  const CHOICES = [2, 5, 10, 15, 30];

  // Typical minutes per act (keyed by act number). Unknown/new acts fall back to DEFAULT_MINUTES.
  const DURATIONS = {
    '01': 3,  // Find the Exit: quick chase
    '02': 5,  // Abstraction Meter
    '03': 2,  // Adventure Generator: one spin
    '04': 15, // Chess Nightmare: a whole (strange) game
    '05': 5,  // Snack Attack: arcade run
    '06': 10, // Lunar Midway dating sim
    '07': 8,  // Big Top Band: compose a tune
    '08': 3,  // Fireworks: click the sky
    '09': 8,  // Toaster Showdown puzzle
    '10': 5,  // Infinite Toaster rhythm
    '11': 8,  // Sticky Reading Room story
    '12': 5,  // Build-a-Zooble
    '13': 12, // Exit Interview text adventure
    '14': 10, // Patchwork quilt toy (5-15)
    '15': 4,  // Pocket Observatory
    '16': 8,  // Spreadsheet Mansion
    '17': 3,  // Bubble-gotchi check-in
    '18': 2,  // Roast Machine
    '19': 5,  // Pinball
    '20': 3,  // Whack-a-Door
    '21': 3,  // Word Snack
    '22': 6,  // Ribbon Repair
    '23': 4,  // Beetle Bureau
    '24': 6,  // Cloud Kitchen
    '25': 10, // Department of Doors story
    '26': 7,  // Shadow Theater
    '27': 10, // Crate Escape
    '28': 5,  // Backwards Bowling
    '29': 8,  // Midnight Tea
    '30': 8,  // Color Bureau
    '31': 6,  // Rain Garden
    '32': 5,  // Pillow Fort
  };
  const DEFAULT_MINUTES = 5;

  const calm = () => !!(window.CircusCalm && window.CircusCalm.get());
  const pick = (list) => list[Math.floor(Math.random() * list.length)];
  const esc = (s) => String(s).replace(/[&<>"']/g, (c) => ({ '&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;', "'": '&#39;' }[c]));

  // ───────────── storage ─────────────
  function get() {
    try {
      const v = JSON.parse(localStorage.getItem(KEY));
      if (v && Number.isFinite(v.start) && Number.isFinite(v.end) && Number.isFinite(v.minutes)) return v;
    } catch (e) { /* blocked or malformed */ }
    return null;
  }
  function write(v) { try { localStorage.setItem(KEY, JSON.stringify({ start: v.start, end: v.end, minutes: v.minutes })); } catch (e) { /* storage blocked */ } }
  function nudgedFor() { try { return Number(localStorage.getItem(NUDGED_KEY)) || 0; } catch (e) { return 0; } }
  function setNudged(end) { try { localStorage.setItem(NUDGED_KEY, String(end)); } catch (e) { /* storage blocked */ } }
  function forgetNudge() { try { localStorage.removeItem(NUDGED_KEY); } catch (e) { /* storage blocked */ } }

  function start(minutes) {
    const now = Date.now();
    const v = { start: now, end: now + minutes * 60000, minutes };
    write(v); forgetNudge(); hideNudge(); render();
    return v;
  }
  function extend(minutes = 5) {
    const v = get();
    const now = Date.now();
    const next = v ? { start: v.start, end: Math.max(v.end, now) + minutes * 60000, minutes: v.minutes + minutes }
      : { start: now, end: now + minutes * 60000, minutes };
    write(next); hideNudge(); render();
    return next;
  }
  function clear() {
    try { localStorage.removeItem(KEY); } catch (e) { /* storage blocked */ }
    forgetNudge(); hideNudge(); render();
  }

  // ───────────── suggestions ─────────────
  function actMinutes(a) { return DURATIONS[a.num] ?? DEFAULT_MINUTES; }
  function suggest(minutes, count) {
    const acts = (window.CIRCUS_ADVENTURES || []).filter((a) => !a.soon && a.href && a.href !== '#');
    const visited = (a) => { try { return !!window.TADC?.passport?.has(a.href); } catch (e) { return false; } };
    const fits = acts.filter((a) => actMinutes(a) <= minutes);
    const n = count || (minutes <= 2 ? 2 : 3);
    // Best fit first: fill most of the break, prefer unvisited, then shuffle within the top band so it isn't always the same three.
    const scored = fits.map((a) => ({ a, score: actMinutes(a) / minutes + (visited(a) ? 0 : 0.2) + Math.random() * 0.2 }));
    scored.sort((x, y) => y.score - x.score);
    return scored.slice(0, n).map((s) => s.a);
  }
  const CAINE_PITCH = {
    2: ['Two minutes! A speed-break! Blink and you\'ll... keep going, actually, there\'s no exit!', 'Two minutes? Perfect for a tiny dose of nonsense!'],
    5: ['Five minutes! Just enough time for one spectacular detour!', 'Five minutes! I\'ve hand-picked these. With my hands. I have hands now.'],
    10: ['Ten whole minutes! Practically a vacation! Here\'s your itinerary!', 'Ten minutes! Long enough for a story, short enough to pretend you were thinking!'],
    15: ['Fifteen minutes! Ooh, you can finish something! How rare! How thrilling!', 'A quarter hour! I\'ve reserved the good seats!'],
    30: ['THIRTY minutes?! Clear the stage! Here are the deluxe adventures!', 'Half an hour! Pack a snack! Bubble will eat it, but pack one anyway!'],
  };
  const NUDGE_LINES = [
    'Break\'s over! Back to the code mines! The bugs won\'t squash themselves! (They might. Don\'t count on it.)',
    'Ding ding! That\'s time! Your keyboard misses you! I can hear it weeping softly!',
    'The break has concluded! Off you go! Not OUT, obviously. Just... back to the other window!',
  ];

  // ───────────── styles ─────────────
  const CSS = `
  #breakPill{position:fixed;left:max(10px,env(safe-area-inset-left));top:10px;z-index:8;font:700 13px 'Fredoka',system-ui,sans-serif;color:#1b1b2f;
    background:#fff7d6;border:2px solid #1b1b2f;border-radius:999px;padding:6px 12px;min-height:34px;box-shadow:2px 2px 0 #1b1b2f;cursor:pointer;
    font-variant-numeric:tabular-nums;white-space:nowrap}
  #breakPill:hover{background:#ffd34d}
  #breakPill:focus-visible{outline:3px dashed #ffd34d;outline-offset:3px}
  #breakPill.running{background:#ffd34d}
  #breakPill.over{background:#e3243b;color:#fff}
  html:not(.circus-calm) #breakPill.over{animation:breakPulse 2s ease-in-out 3}
  @keyframes breakPulse{50%{transform:scale(1.08)}}
  @media(max-width:700px){#breakPill{top:8px;left:8px;font-size:12px;padding:5px 10px;min-height:30px}}
  #breakCoach{width:min(460px,calc(100vw - 24px));max-height:calc(100dvh - 24px);overflow:auto;padding:0;border:4px solid #1b1b2f;border-radius:16px;
    background:#fff7d6;color:#1b1b2f;font:500 15px/1.4 'Fredoka',system-ui,sans-serif;box-shadow:6px 6px 0 #8a0c1a}
  #breakCoach::backdrop{background:rgba(11,7,24,.7)}
  #breakCoach .bc-head{display:flex;justify-content:space-between;align-items:center;gap:8px;padding:12px 14px;
    background:repeating-linear-gradient(90deg,#e3243b 0 22px,#fff 22px 44px);border-bottom:4px solid #1b1b2f}
  #breakCoach h2{margin:0;font:400 20px 'Rye',Georgia,serif;background:#fff7d6;border:2px solid #1b1b2f;border-radius:8px;padding:2px 10px}
  #breakCoach .bc-body{padding:14px 16px 16px}
  #breakCoach button{font:700 14px 'Fredoka',system-ui,sans-serif;color:#1b1b2f;background:#fff;border:2px solid #1b1b2f;border-radius:999px;
    padding:8px 14px;min-height:44px;cursor:pointer}
  #breakCoach button:hover{background:#ffe9a3}
  #breakCoach button:focus-visible,#breakCoach a:focus-visible{outline:3px dashed #2f5bd8;outline-offset:2px}
  #breakCoach .bc-close{background:#e3243b;color:#fff;min-height:40px;padding:6px 12px}
  #breakCoach .bc-choices{display:grid;grid-template-columns:repeat(5,minmax(0,1fr));gap:6px;margin:0 0 12px}
  #breakCoach .bc-choices button{padding:8px 2px;white-space:nowrap;font-size:13px}
  #breakCoach .bc-choices button[aria-pressed="true"]{background:#ffd34d;box-shadow:inset 0 0 0 2px #1b1b2f}
  #breakCoach .bc-caine{display:flex;gap:10px;align-items:flex-start;background:#fff;border:2px solid #1b1b2f;border-radius:12px;padding:10px 12px;margin:0 0 10px}
  #breakCoach .bc-caine b.who{flex:none;color:#8a0c1a}
  #breakCoach ul{list-style:none;margin:0 0 12px;padding:0;display:grid;gap:8px}
  #breakCoach li a{display:flex;gap:10px;align-items:center;text-decoration:none;color:#1b1b2f;background:#fff;border:2px solid #1b1b2f;border-radius:10px;padding:8px 10px;min-height:44px}
  #breakCoach li a:hover{background:#ffe9a3}
  #breakCoach li .ico{font-size:22px;flex:none}
  #breakCoach li .mins{margin-left:auto;font-size:12px;color:#5c3a99;white-space:nowrap}
  #breakCoach .bc-actions{display:flex;flex-wrap:wrap;gap:8px}
  #breakCoach .bc-start{background:#2f5bd8;color:#fff}
  #breakCoach .bc-start:hover{background:#244bb8}
  #breakCoach .bc-start:disabled{opacity:.5;cursor:default}
  #breakCoach .bc-status{margin:0 0 10px;font-weight:700;color:#8a0c1a}
  #breakCoach .bc-status:empty{display:none}
  #breakCoach .bc-tip{font-size:12px;color:#5c3a99;margin:0 0 12px}
  #breakNudge{position:fixed;left:max(10px,env(safe-area-inset-left));top:54px;z-index:8;max-width:calc(100vw - 20px);background:#fff7d6;color:#1b1b2f;
    border:3px solid #1b1b2f;border-radius:14px;box-shadow:4px 4px 0 #8a0c1a;padding:10px 12px;font:500 14px/1.35 'Fredoka',system-ui,sans-serif}
  #breakNudge[hidden]{display:none}
  #breakNudge p{margin:0 0 8px}
  #breakNudge .bn-actions{display:flex;gap:8px;flex-wrap:wrap}
  #breakNudge button{font:700 13px 'Fredoka',system-ui,sans-serif;border:2px solid #1b1b2f;border-radius:999px;padding:6px 12px;min-height:40px;cursor:pointer;background:#ffd34d;color:#1b1b2f}
  #breakNudge button.bn-done{background:#2f5bd8;color:#fff}
  #breakNudge button:focus-visible{outline:3px dashed #2f5bd8;outline-offset:2px}
  @media(max-width:700px){#breakNudge{top:46px;left:8px}}
  `;

  // ───────────── DOM ─────────────
  let pill, dialog, nudge, chosen = null, tickTimer = 0, liveSuggestions = [];
  const fmt = (ms) => {
    const s = Math.max(0, Math.ceil(ms / 1000));
    return `${Math.floor(s / 60)}:${String(s % 60).padStart(2, '0')}`;
  };

  function render() {
    if (!pill) return;
    const v = get();
    const now = Date.now();
    pill.classList.remove('running', 'over');
    if (!v) {
      pill.textContent = '⏱️ Break';
      pill.setAttribute('aria-label', 'Plan a break');
    } else if (v.end > now) {
      const left = fmt(v.end - now);
      pill.textContent = `⏱️ ${left}`;
      pill.classList.add('running');
      const [m, s] = left.split(':');
      pill.setAttribute('aria-label', `Break timer: ${Number(m)} minutes ${Number(s)} seconds left. Open break options.`);
    } else {
      pill.textContent = '⏱️ 0:00';
      pill.classList.add('over');
      pill.setAttribute('aria-label', 'Break is over. Open break options.');
      if (nudgedFor() !== v.end) showNudge(v);
    }
    if (dialog && dialog.open) renderStatus();
  }

  function caineSay(html, ms) {
    const el = document.getElementById('caine');
    if (!el || !window.TADC) return;
    const svg = el.querySelector('.caine-svg');
    if (svg) { svg.classList.remove('quiet'); clearTimeout(svg._q); svg._q = setTimeout(() => svg.classList.add('quiet'), Math.min(ms, 300 + html.length * 45)); }
    window.TADC.say(el, html, ms, { className: 'caine', voice: 'caine' });
  }
  function whenCaineFree(fn, tries = 0) {
    const el = document.getElementById('caine');
    if (document.hidden) { setTimeout(() => whenCaineFree(fn, tries), 1500); return; } // wait for the viewer to come back
    // wait out the boot sequence and Caine's arrival greeting
    if (document.getElementById('boot') || document.body.classList.contains('falling')) { setTimeout(() => whenCaineFree(fn, tries), 1000); return; }
    const busy = (window.CircusScenes && window.CircusScenes.active) || (el && el._speech);
    if (busy) { if (tries < 80) setTimeout(() => whenCaineFree(fn, tries + 1), 1500); return; } // never talk over a scene; give up after ~2 min
    fn();
  }

  // A direct reply to a click: speak now (replacing Caine's current bubble) unless a cast scene is running.
  function caineReply(html, ms) {
    if (window.CircusScenes && window.CircusScenes.active) whenCaineFree(() => caineSay(html, ms));
    else caineSay(html, ms);
  }
  function showNudge(v) {
    setNudged(v.end); // one nudge per end time, even across reloads and tabs
    const line = pick(NUDGE_LINES);
    nudge.querySelector('.bn-line').textContent = `⏱️ Break's over! (${v.minutes} min)`;
    nudge.hidden = false;
    whenCaineFree(() => { if (!nudge.hidden) caineSay(line, 5200); });
    if (!calm()) window.TADC?.sfx?.('ding');
  }
  function hideNudge() {
    if (!nudge || nudge.hidden) return;
    const hadFocus = nudge.contains(document.activeElement);
    nudge.hidden = true;
    if (hadFocus && pill) pill.focus();
  }

  function renderStatus() {
    const v = get();
    const status = dialog.querySelector('.bc-status');
    const startBtn = dialog.querySelector('.bc-start');
    const stopBtn = dialog.querySelector('.bc-stop');
    if (v && v.end > Date.now()) status.textContent = `Break in progress: ${fmt(v.end - Date.now())} left.`;
    else if (v) status.textContent = 'Your break timer has finished.';
    else status.textContent = '';
    stopBtn.hidden = !v;
    startBtn.disabled = !chosen;
    startBtn.textContent = v ? (chosen ? `Restart: ${chosen} min` : 'Restart timer') : (chosen ? `Start timer: ${chosen} min` : 'Start timer');
  }

  function choose(minutes, voice) {
    chosen = minutes;
    dialog.querySelectorAll('.bc-choices button').forEach((b) => b.setAttribute('aria-pressed', String(Number(b.dataset.min) === minutes)));
    liveSuggestions = suggest(minutes);
    const line = pick(CAINE_PITCH[minutes] || CAINE_PITCH[5]);
    dialog.querySelector('.bc-line').textContent = line;
    const list = dialog.querySelector('.bc-list');
    list.innerHTML = liveSuggestions.map((a) =>
      `<li><a href="${esc(a.href)}" data-num="${esc(a.num)}"><span class="ico" aria-hidden="true">${esc(a.icon || '🎪')}</span>` +
      `<span><b>${esc(a.title)}</b></span><span class="mins">≈${actMinutes(a)} min</span></a></li>`).join('');
    renderStatus();
    if (voice && window.TADC?.babble && !window.TADC.quiet?.get()) { try { window.TADC.babble('caine', line, 2400); } catch (e) { /* voice is optional */ } }
  }

  function open() {
    if (!dialog) return;
    if (!chosen) choose(5, false); else choose(chosen, false);
    renderStatus();
    if (!dialog.open) dialog.showModal();
    const pressed = dialog.querySelector('.bc-choices button[aria-pressed="true"]');
    (pressed || dialog.querySelector('.bc-choices button')).focus();
  }

  function build() {
    const style = document.createElement('style');
    style.id = 'breakCoachStyles';
    style.textContent = CSS;
    document.head.appendChild(style);

    pill = document.createElement('button');
    pill.type = 'button';
    pill.id = 'breakPill';
    pill.setAttribute('aria-haspopup', 'dialog');
    pill.setAttribute('aria-controls', 'breakCoach');
    pill.title = 'Plan a break with Caine';
    pill.addEventListener('click', (e) => { e.stopPropagation(); open(); });

    nudge = document.createElement('section');
    nudge.id = 'breakNudge';
    nudge.hidden = true;
    nudge.setAttribute('aria-label', 'Break reminder');
    nudge.innerHTML = '<p class="bn-line" role="status" aria-live="polite"></p>' +
      '<div class="bn-actions"><button type="button" class="bn-more">5 more minutes</button><button type="button" class="bn-done">Done</button></div>';
    nudge.addEventListener('click', (e) => e.stopPropagation());
    nudge.querySelector('.bn-more').addEventListener('click', () => {
      extend(5);
      caineReply('Five more minutes, granted! I\'ll pretend I didn\'t see that.', 3200);
    });
    nudge.querySelector('.bn-done').addEventListener('click', () => {
      clear();
      caineReply('Off you go, superstar! The tent will be right here. It literally cannot leave.', 3600);
    });

    dialog = document.createElement('dialog');
    dialog.id = 'breakCoach';
    dialog.setAttribute('aria-labelledby', 'breakCoachTitle');
    dialog.innerHTML =
      '<div class="bc-head"><h2 id="breakCoachTitle">How long is your break?</h2><button type="button" class="bc-close" aria-label="Close">✕</button></div>' +
      '<div class="bc-body">' +
      '<p class="bc-status" role="status" aria-live="polite"></p>' +
      `<div class="bc-choices" role="group" aria-label="Break length">${CHOICES.map((m) => `<button type="button" data-min="${m}" aria-pressed="false">${m} min</button>`).join('')}</div>` +
      '<div class="bc-caine" aria-live="polite"><b class="who">Caine:</b><span class="bc-line"></span></div>' +
      '<ul class="bc-list" aria-label="Suggested adventures"></ul>' +
      '<p class="bc-tip">Picking an adventure starts the timer too. The countdown follows you into every act.</p>' +
      '<div class="bc-actions"><button type="button" class="bc-start">Start timer</button><button type="button" class="bc-stop" hidden>End break timer</button></div>' +
      '</div>';
    dialog.addEventListener('click', (e) => {
      e.stopPropagation();
      if (e.target === dialog) dialog.close(); // backdrop click
    });
    dialog.querySelector('.bc-close').addEventListener('click', () => dialog.close());
    dialog.querySelectorAll('.bc-choices button').forEach((b) => b.addEventListener('click', () => choose(Number(b.dataset.min), true)));
    dialog.querySelector('.bc-list').addEventListener('click', (e) => {
      const a = e.target.closest('a');
      if (!a || !chosen) return;
      const v = get();
      if (!v || v.end <= Date.now()) start(chosen); // the link then navigates as normal
    });
    dialog.querySelector('.bc-start').addEventListener('click', () => {
      if (!chosen) return;
      start(chosen);
      dialog.close();
      const titles = liveSuggestions.map((a) => `<b>${esc(a.title)}</b>`);
      caineReply(`Timer set: <b>${chosen} minutes</b>! ${titles.length ? 'May I suggest ' + titles.join(' or ') + '?' : 'Enjoy!'} I'll ring the bell when it's time.`, 5200);
    });
    dialog.querySelector('.bc-stop').addEventListener('click', () => { clear(); renderStatus(); pill.focus(); });
    dialog.addEventListener('close', () => { if (pill && document.body.contains(pill)) pill.focus(); });
    dialog.addEventListener('keydown', (e) => e.stopPropagation()); // keep page shortcuts (Konami etc.) out of the dialog

    // Put the pill and nudge early in the tab order (right after any skip content), before the stage.
    document.body.prepend(nudge);
    document.body.prepend(pill);
    document.body.appendChild(dialog);

    addEventListener('storage', (e) => { if (e.key === KEY || e.key === NUDGED_KEY || e.key === null) { if (!get()) hideNudge(); render(); } });
    render();
    tickTimer = setInterval(render, 1000);
  }

  function mount() {
    if (document.getElementById('breakPill') || !document.getElementById('stage')) return;
    build();
  }

  window.CircusBreak = { DURATIONS, CHOICES, get, start, extend, clear, open, suggest, minutesFor: actMinutes };
  if (document.readyState === 'loading') document.addEventListener('DOMContentLoaded', mount);
  else mount();
})();
