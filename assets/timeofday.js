/* 🌙 A living Big Top: time of day, day of week and season.
 * Self-mounting on the Big Top (index.html). Plain JS; reads window.TADC, window.CircusCalm and window.CircusScenes if present.
 * Test overrides: ?tod=night|morning|afternoon|evening&dow=1..7&month=1..12 (optional &hour=0..23). dow: 1 = Monday … 7 = Sunday.
 * Exposes window.CircusTime = { period, dow, month, hour, applied }.
 * All dialogue is original. */
(function () {
  'use strict';
  const LAST_VISIT_KEY = 'tadc-lastvisit-v1';
  const AWAY_MS = 30 * 60 * 1000;

  // ───────────── clock + overrides ─────────────
  const PERIODS = ['night', 'morning', 'afternoon', 'evening'];
  const PERIOD_HOUR = { night: 22, morning: 9, afternoon: 15, evening: 18 }; // representative hour for a ?tod= override
  function periodFor(hour) {
    if (hour >= 6 && hour < 12) return 'morning';
    if (hour >= 12 && hour < 17) return 'afternoon';
    if (hour >= 17 && hour < 20) return 'evening';
    return 'night';
  }
  function readClock() {
    const now = new Date();
    let hour = now.getHours();
    let dow = now.getDay() || 7; // ISO: Monday 1 … Sunday 7
    let month = now.getMonth() + 1;
    let period = periodFor(hour);
    let params;
    try { params = new URLSearchParams(location.search); } catch (e) { params = new URLSearchParams(); }
    const tod = (params.get('tod') || '').toLowerCase();
    const int = (name, lo, hi) => {
      const n = Number.parseInt(params.get(name), 10);
      return Number.isInteger(n) && n >= lo && n <= hi ? n : null;
    };
    const hourOverride = int('hour', 0, 23);
    if (PERIODS.includes(tod)) { period = tod; hour = hourOverride ?? PERIOD_HOUR[tod]; }
    else if (hourOverride !== null) { hour = hourOverride; period = periodFor(hour); }
    dow = int('dow', 1, 7) ?? dow;
    month = int('month', 1, 12) ?? month;
    return { period, dow, month, hour };
  }

  const clock = readClock();
  const applied = [];
  window.CircusTime = { period: clock.period, dow: clock.dow, month: clock.month, hour: clock.hour, applied };

  const calm = () => !!(window.CircusCalm && window.CircusCalm.get());
  const pick = (list) => list[Math.floor(Math.random() * list.length)];

  // ───────────── injected styles ─────────────
  const CSS = `
  #todMood{position:fixed;inset:0;z-index:2;pointer-events:none;transition:opacity 1.5s}
  .tod-night #todMood{background:linear-gradient(180deg,rgba(8,14,48,.42),rgba(10,18,60,.30) 55%,rgba(6,10,36,.38))}
  .tod-morning #todMood{background:linear-gradient(180deg,rgba(255,190,120,.10),rgba(255,214,150,.06));mix-blend-mode:screen}
  .tod-evening #todMood{background:linear-gradient(180deg,rgba(255,120,90,.08),rgba(120,60,160,.08))}
  .tod-night .member svg{filter:drop-shadow(0 8px 6px rgba(0,0,0,.45)) brightness(.82) saturate(.85)}
  .tod-zzz{position:absolute;right:-6px;top:-18px;font:700 14px 'Fredoka',system-ui,sans-serif;color:#cfe0ff;text-shadow:0 0 6px #6f8cff;
    pointer-events:none;white-space:nowrap;letter-spacing:2px}
  .tod-zzz i{display:inline-block;font-style:normal;animation:todZ 2.8s ease-in-out infinite;opacity:.9}
  .tod-zzz i:nth-child(2){font-size:.8em;animation-delay:.5s}.tod-zzz i:nth-child(3){font-size:.65em;animation-delay:1s}
  #bubble .tod-zzz{right:-14px;top:-14px;font-size:11px}
  @keyframes todZ{0%{transform:translateY(4px);opacity:0}30%{opacity:.95}100%{transform:translate(6px,-12px);opacity:0}}
  .circus-calm .tod-zzz i{opacity:.8}
  .tod-lantern{position:absolute;left:-14%;top:44%;width:30px;height:30px;pointer-events:none;font-size:22px;line-height:30px;text-align:center}
  .tod-lantern::before{content:'';position:absolute;left:50%;top:50%;width:170px;height:170px;transform:translate(-50%,-50%);border-radius:50%;
    background:radial-gradient(circle,rgba(255,196,92,.45),rgba(255,160,60,.16) 45%,rgba(255,160,60,0) 70%);z-index:-1;animation:todGlow 3.4s ease-in-out infinite}
  @keyframes todGlow{50%{opacity:.7}}
  #todLights{position:absolute;inset:0;pointer-events:none}
  #todLights span{position:absolute;transform:translate(-50%,-50%);font-size:clamp(11px,1.5vw,19px);line-height:1;filter:drop-shadow(0 0 5px rgba(255,140,30,.85))}
  #todSnow{position:fixed;inset:0;z-index:2;pointer-events:none;overflow:hidden}
  #todSnow i{position:absolute;top:-24px;color:#fff;opacity:.75;font-style:normal;animation:todSnow linear infinite;text-shadow:0 0 4px #9fc3ff}
  @keyframes todSnow{to{transform:translate(var(--drift,20px),110vh) rotate(200deg)}}
  .circus-calm #todSnow{display:none}
  #caine.tod-reboot .float{animation:todBoot 1.3s steps(1) 1}
  @keyframes todBoot{0%{opacity:.1;filter:grayscale(1)}10%{opacity:.9}18%{opacity:.2}30%{opacity:1;filter:grayscale(1) brightness(1.6)}42%{opacity:.4}
    55%{opacity:1;filter:hue-rotate(120deg)}70%{opacity:.6}100%{opacity:1;filter:none}}
  #todFinale{position:fixed;left:50%;top:6px;z-index:7;transform:translateX(-50%);pointer-events:none;
    font:400 clamp(12px,1.7vw,18px) 'Rye',Georgia,serif;letter-spacing:.06em;color:#1b1b2f;background:#ffd34d;border:2px solid #1b1b2f;
    padding:2px 12px;border-radius:8px;box-shadow:3px 3px 0 #8a0c1a;white-space:nowrap;transition:opacity .8s}
  #todFinale.drop{animation:todDrop .7s cubic-bezier(.3,1.6,.5,1)}
  #todFinale.gone{opacity:0}
  @keyframes todDrop{from{transform:translate(-50%,-80px) rotate(-6deg);opacity:0}to{transform:translateX(-50%);opacity:1}}
  `;

  // ───────────── Caine helpers ─────────────
  function caineEl() { return document.getElementById('caine'); }
  function caineTalk(html, ms) {
    const el = caineEl();
    if (!el || !window.TADC) return null;
    const svg = el.querySelector('.caine-svg');
    if (svg) {
      svg.classList.remove('quiet');
      clearTimeout(svg._q);
      svg._q = setTimeout(() => svg.classList.add('quiet'), Math.min(ms, 300 + html.length * 45));
    }
    return window.TADC.say(el, html, ms, { className: 'caine', voice: 'caine' });
  }
  const bootGone = () => !document.getElementById('boot');
  const caineFree = () => {
    const el = caineEl();
    return el && !el._speech && !(window.CircusScenes && window.CircusScenes.active) && !document.hidden &&
      !document.querySelector('#board.open') && !document.querySelector('dialog[open]');
  };
  // Lines wait for the boot overlay to clear, then ~4 s, then for Caine to be free (no running scene, no bubble).
  const queue = [];
  let queueRunning = false;
  function enqueue(fn) { queue.push(fn); if (!queueRunning) runQueue(); }
  function runQueue() {
    queueRunning = true;
    let bootSeenAt = 0, waited = 0;
    const tick = () => {
      if (!queue.length) { queueRunning = false; return; }
      if (!bootGone()) { setTimeout(tick, 500); return; }
      if (!bootSeenAt) bootSeenAt = Date.now();
      if (Date.now() - bootSeenAt < 4000) { setTimeout(tick, 500); return; }
      if (!caineFree()) {
        // Never talk over a running scene or an open dialog: wait, and after two minutes skip this line.
        waited += 700;
        if (waited > 120000) { queue.shift(); waited = 0; }
        setTimeout(tick, 700); return;
      }
      waited = 0;
      const ms = queue.shift()() || 0;
      setTimeout(tick, ms + 900);
    };
    tick();
  }

  // ───────────── recap content (all original) ─────────────
  const AWAY_EVENTS = [
    'Kinger lost the queen twice. Both times she was in his crown.',
    'Bubble ate a Tuesday. We are running on a six-day week until it digests.',
    'Zooble reassembled backwards and refused to discuss it.',
    'Jax replaced every "Push" sign with "Pull." Then every "Pull" sign with "Pomni."',
    'Gangle\'s comedy mask went on vacation. It sent a postcard. The postcard was sad.',
    'Ragatha knitted a scarf for the void. The void says it\'s a little itchy.',
    'Pomni found an exit! It was a drawing of an exit. She took it hard.',
    'The checkered floor gained one extra square. Nobody can find it.',
    'I promoted a rubber chicken to Assistant Ringmaster. It has already unionized.',
    'Kinger held a funeral for a pillow. It was a lovely service. The pillow is fine.',
    'Bubble swallowed the moon for a dare and gave it back slightly chewed.',
    'Jax challenged gravity to a staring contest. Gravity won. Jax claims it cheated.',
    'Zooble filed a complaint about the complaints department. It has been forwarded to itself.',
    'The calliope learned a new song. It refuses to play it in front of anyone.',
    'Ragatha hosted a tea party for the tent poles. Three of them RSVP\'d.',
    'Gangle and Kinger built a bridge out of ribbons. It led back to the same room.',
    'A tile went missing. We found it later, pretending to be a different tile.',
    'Pomni counted every star in the sky. She got to "a lot" and lay down.',
    'The EXIT sign blinked in Morse code. It said "NOPE."',
    'Bubble tried to pop itself to see what would happen. Then I happened. Very loudly.',
    'Kinger declared war on a coat rack and then apologized to it, at length.',
    'Jax sold Zooble its own left arm. Zooble bought it. Twice.',
    'I rehearsed my bow 412 times. Number 288 was transcendent.',
  ];
  function gapText(ms) {
    const min = Math.round(ms / 60000);
    if (min < 90) return `${min} minutes`;
    const hours = Math.round(ms / 3600000);
    if (hours < 36) return `${hours} hour${hours === 1 ? '' : 's'}`;
    const days = Math.round(ms / 86400000);
    if (days < 14) return `${days} day${days === 1 ? '' : 's'}`;
    const weeks = Math.round(days / 7);
    return `${weeks} weeks`;
  }
  function recapLine(gapMs) {
    const h = gapMs / 3600000;
    const span = gapText(gapMs);
    let open;
    if (h < 1.5) open = pick([`You were gone ${span}! I counted every one of them. Out loud.`, `Ah, back after ${span}! A brisk little intermission!`]);
    else if (h < 8) open = pick([`You were gone ${span}! An ETERNITY in circus time! Let me catch you up!`, `${span}! You were gone ${span}! So much happened! Brace yourself!`]);
    else if (h < 36) open = pick([`You were gone ${span}! I had to fill in for you. I played you. You were magnificent.`, `Welcome back! ${span} away! Did you sleep? We don't. Here's the news!`]);
    else if (h < 24 * 14) open = pick([`${span}?! I put up MISSING posters! They were mostly of me, for visibility, but still!`, `You were gone ${span}! The cast held a vigil! Briefly! Then a talent show!`]);
    else open = `You were gone ${span}! I'd assumed you'd become abstract! I'm so relieved you're merely absent-minded!`;
    const pool = AWAY_EVENTS.slice();
    const n = h >= 8 ? 2 : 1 + Math.round(Math.random());
    const events = [];
    for (let i = 0; i < n && pool.length; i++) events.push(pool.splice(Math.floor(Math.random() * pool.length), 1)[0]);
    return `${open}<br><small>While you were away: ${events.map((e) => '• ' + e).join('<br>')}</small>`;
  }
  const WELCOME_LINES = [
    'A brand-new face! Welcome to the Big Top! I\'ll keep a diary of everything that happens while you\'re gone. Mostly nonsense. LOVINGLY curated nonsense.',
    'First visit?! Splendid! From now on I\'ll tell you what you missed between breaks. Spoiler: chaos.',
  ];

  // ───────────── last-visit bookkeeping ─────────────
  function readLastVisit() {
    try { const v = Number(localStorage.getItem(LAST_VISIT_KEY)); return Number.isFinite(v) && v > 0 ? v : null; } catch (e) { return null; }
  }
  function stampVisit() { try { localStorage.setItem(LAST_VISIT_KEY, String(Date.now())); } catch (e) { /* storage blocked: no recap, no problem */ } }

  // ───────────── mount ─────────────
  function mount() {
    if (!document.getElementById('stage') || window.CircusTime.mounted) return;
    window.CircusTime.mounted = true;
    const style = document.createElement('style');
    style.id = 'todStyles';
    style.textContent = CSS;
    document.head.appendChild(style);

    const body = document.body;
    body.classList.add(`tod-${clock.period}`, `dow-${clock.dow}`, `month-${clock.month}`);
    applied.push(`tod-${clock.period}`, `dow-${clock.dow}`, `month-${clock.month}`);

    // Mood tint: above the tent and floor, below the marquee, cast, Bubble, controls and dialogs.
    if (clock.period !== 'afternoon') {
      const mood = document.createElement('div');
      mood.id = 'todMood';
      mood.setAttribute('aria-hidden', 'true');
      const tent = document.getElementById('tent');
      if (tent && tent.nextSibling) tent.parentNode.insertBefore(mood, tent.nextSibling); else body.appendChild(mood);
      applied.push('mood-' + clock.period);
    }

    if (clock.period === 'night') {
      const zzz = () => {
        const s = document.createElement('span');
        s.className = 'tod-zzz'; s.setAttribute('aria-hidden', 'true');
        s.innerHTML = '<i>z</i><i>z</i><i>z</i>';
        return s;
      };
      document.getElementById('kinger')?.appendChild(zzz());
      document.getElementById('bubble')?.appendChild(zzz());
      const lantern = document.createElement('span');
      lantern.className = 'tod-lantern'; lantern.setAttribute('aria-hidden', 'true'); lantern.textContent = '🏮';
      caineEl()?.appendChild(lantern);
      applied.push('night-zzz', 'night-lantern');
    }

    // October: jack-o'-lanterns on every third bulb of the tent's string lights (same geometry as drawTent in index.html).
    if (clock.month === 10) {
      const tent = document.getElementById('tent');
      if (tent) {
        const layer = document.createElement('div');
        layer.id = 'todLights'; layer.setAttribute('aria-hidden', 'true');
        const lights = 22;
        for (let i = 3; i < lights; i += 3) {
          const y = 262 + Math.sin((i / lights) * Math.PI * 6) * 6 + 30;
          const s = document.createElement('span');
          s.textContent = '🎃';
          s.style.left = (i / lights * 100).toFixed(2) + '%';
          s.style.top = (y / 340 * 100).toFixed(2) + '%';
          layer.appendChild(s);
        }
        tent.appendChild(layer);
        applied.push('october-pumpkins');
      }
    }

    // December: gentle snow (CSS hides it whenever Calm Mode is on, including mid-visit toggles).
    if (clock.month === 12) {
      const snow = document.createElement('div');
      snow.id = 'todSnow'; snow.setAttribute('aria-hidden', 'true');
      for (let i = 0; i < 22; i++) {
        const f = document.createElement('i');
        f.textContent = i % 3 ? '•' : '❄';
        f.style.left = (Math.random() * 100).toFixed(1) + '%';
        f.style.fontSize = (8 + Math.random() * 10).toFixed(0) + 'px';
        f.style.animationDuration = (9 + Math.random() * 10).toFixed(1) + 's';
        f.style.animationDelay = (-Math.random() * 18).toFixed(1) + 's';
        f.style.setProperty('--drift', ((Math.random() - 0.5) * 80).toFixed(0) + 'px');
        snow.appendChild(f);
      }
      const tent = document.getElementById('tent');
      if (tent && tent.nextSibling) tent.parentNode.insertBefore(snow, tent.nextSibling); else body.appendChild(snow);
      applied.push('december-snow');
    }

    // Monday before noon: Caine reboots.
    if (clock.dow === 1 && clock.hour < 12) {
      applied.push('monday-reboot');
      enqueue(() => {
        const el = caineEl();
        if (el && !calm()) {
          el.classList.remove('tod-reboot'); void el.offsetWidth; el.classList.add('tod-reboot');
          setTimeout(() => el.classList.remove('tod-reboot'), 1400);
        }
        caineTalk(pick([
          '<small>REBOOTING… Monday detected… loading enthusiasm… 4%… 61%…</small><br><b>300%! GOOD MORNING!</b> Mondays are just Fridays that haven\'t found themselves yet!',
          '<small>SYSTEM RESTORE COMPLETE. Weekend memories archived.</small><br>Monday! The day I like to call <b>"Sunday\'s Sequel"!</b> Sequels are always better! Usually!',
        ]), 6000);
        return 6400;
      });
    }

    // Friday after 15:00: the finale.
    if (clock.dow === 5 && clock.hour >= 15) {
      applied.push('friday-finale');
      enqueue(() => {
        const banner = document.createElement('div');
        banner.id = 'todFinale';
        banner.textContent = '🎉 FRIDAY FINALE 🎉';
        if (!calm()) banner.classList.add('drop');
        body.appendChild(banner);
        setTimeout(() => banner.classList.add('gone'), 11000);
        setTimeout(() => banner.remove(), 12000);
        if (!calm() && window.TADC) {
          const r = banner.getBoundingClientRect();
          for (let i = 0; i < 3; i++) setTimeout(() => window.TADC.confetti(r.left + r.width * (0.2 + 0.3 * i), r.bottom, 60, 1), i * 160);
          window.TADC.sfx?.('fanfare');
        }
        caineTalk(pick([
          'It\'s the <b>FRIDAY FINALE!</b> Everybody take a bow! You too! Especially you! Bow harder!',
          '<b>FRIDAY FINALE!</b> The week is ending! Not the circus, the circus never ends, but the WEEK! Party!',
        ]), 5200);
        return 5600;
      });
    }

    // "While you were away" recap.
    const last = readLastVisit();
    stampVisit();
    if (last === null) {
      applied.push('welcome');
      enqueue(() => { caineTalk(pick(WELCOME_LINES), 6200); return 6400; });
    } else if (Date.now() - last > AWAY_MS) {
      const gap = Date.now() - last;
      applied.push('recap');
      window.CircusTime.awayMs = gap;
      enqueue(() => { caineTalk(recapLine(gap), 8500); return 8700; });
    }
    addEventListener('pagehide', stampVisit);
    addEventListener('beforeunload', stampVisit);
    document.addEventListener('visibilitychange', stampVisit);
  }

  if (document.readyState === 'loading') document.addEventListener('DOMContentLoaded', mount);
  else mount();
})();
