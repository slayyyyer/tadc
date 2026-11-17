/* 🔍 Case File: "Who Painted the Exit?": the Big Top side of the Painted Door Mystery.
 * Clicking the EXIT sign opens this dialog. The sign itself slowly changes as stubs are found
 * (classes .mys-1 … .mys-8 on #exit). With all 8 stubs, a keyhole asks for the password;
 * the right word marks the mystery solved and opens acts/00-backstage/.
 * Stub data and storage live in assets/cast.js (TADC.mystery). */
(function () {
  'use strict';
  const M = () => window.TADC && window.TADC.mystery;
  const esc = (s) => String(s).replace(/[&<>"]/g, (c) => ({ '&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;' }[c]));

  const CSS = `
  /* EXIT sign evolution, one step per stub found */
  #exit.mys-1 .sign{animation:flick 1.6s infinite}
  #exit.mys-2 .sign::after{content:'';display:inline-block;width:6px;height:6px;margin-left:4px;border-radius:50%;background:#ffd34d;box-shadow:0 0 8px #ffd34d;vertical-align:middle}
  #exit.mys-3 .door{background:linear-gradient(115deg,transparent 46%,#0b0718 47%,#0b0718 49%,transparent 50%),linear-gradient(#4a3a6a,#2b2140)}
  #exit.mys-4 .door::after{animation:knob 1.4s ease-in-out infinite}
  @keyframes knob{40%{transform:rotate(0)}50%{transform:translateY(-2px)}60%{transform:translateY(1px)}}
  #exit.mys-5 .door{box-shadow:0 0 0 2px #ffd34d,0 0 18px rgba(255,211,77,.5)}
  #exit.mys-6 .door{outline:2px dashed rgba(255,211,77,.7);outline-offset:4px}
  #exit.mys-7 .door::before{content:'🗝️';position:absolute;left:50%;top:-22px;transform:translateX(-50%);font-size:16px;animation:float 2s ease-in-out infinite}
  #exit.mys-8 .door::before{content:'';position:absolute;left:50%;top:44%;width:10px;height:16px;transform:translateX(-50%);
    background:radial-gradient(circle at 50% 30%,#fff7b0 0 4px,transparent 4.5px),linear-gradient(#fff7b0,#fff7b0) 50% 70%/4px 9px no-repeat;
    filter:drop-shadow(0 0 6px #ffd34d);animation:keyhole 1.8s ease-in-out infinite}
  @keyframes keyhole{50%{filter:drop-shadow(0 0 14px #ffd34d)}}
  #exit .mys-count{display:block;text-align:center;margin-top:4px;font:700 11px 'Fredoka',system-ui,sans-serif;color:#ffd34d;text-shadow:0 1px 2px #000}
  #exit.mys-solved .sign{color:#ffd34d;border-color:#ffd34d;text-shadow:0 0 8px #ffd34d;box-shadow:0 0 14px rgba(255,211,77,.6)}
  /* the case file */
  #caseFile{width:min(720px,94vw);max-height:90vh;padding:0;border:5px solid #1b1b2f;border-radius:10px;background:#f3e6c4;color:#1b1b2f;
    box-shadow:8px 8px 0 #8a0c1a;font-family:'Fredoka',system-ui,sans-serif}
  #caseFile::backdrop{background:rgba(11,7,24,.8);backdrop-filter:blur(3px)}
  #caseFile .cf-head{position:sticky;top:0;z-index:1;display:flex;align-items:center;justify-content:space-between;gap:10px;padding:12px 16px;
    background:#c9a96e;border-bottom:4px solid #1b1b2f}
  #caseFile h2{margin:0;font:400 clamp(18px,3.2vw,28px) 'Rye',Georgia,serif}
  #caseFile .cf-stamp{display:inline-block;margin-left:8px;padding:0 8px;border:3px solid #8a0c1a;color:#8a0c1a;border-radius:6px;transform:rotate(-6deg);font:700 12px 'Fredoka';vertical-align:middle}
  #caseFile .cf-close{font:700 14px 'Fredoka',system-ui,sans-serif;background:#e3243b;color:#fff;border:3px solid #1b1b2f;border-radius:999px;padding:6px 12px;cursor:pointer}
  #caseFile .cf-body{padding:14px 16px 18px}
  #caseFile .cf-intro{font-style:italic;margin:0 0 12px}
  #caseFile .cf-word{display:flex;gap:6px;justify-content:center;margin:6px 0 14px;flex-wrap:wrap}
  #caseFile .cf-word span{width:42px;height:50px;display:flex;align-items:center;justify-content:center;font:400 28px 'Rye',Georgia,serif;
    background:#fff;border:3px dashed #8a6a2a;border-radius:6px;color:#e3243b}
  #caseFile .cf-word span.empty{color:#c9b58a}
  #caseFile ol{list-style:none;margin:0;padding:0;display:grid;gap:8px}
  #caseFile li{display:grid;grid-template-columns:44px 1fr;gap:10px;align-items:start;background:#fffaf0;border:2px solid #1b1b2f;border-radius:8px;padding:8px 10px}
  #caseFile li.missing{background:#efe2bf;border-style:dashed}
  #caseFile .cf-l{width:40px;height:40px;display:flex;align-items:center;justify-content:center;font:400 24px 'Rye',Georgia,serif;border:2px solid #1b1b2f;border-radius:6px;background:#fff7d6}
  #caseFile li.missing .cf-l{color:#a8946a}
  #caseFile .cf-t{font-size:14px;line-height:1.4}
  #caseFile .cf-t b{display:block;font-size:12px;letter-spacing:.08em;color:#5c3a99}
  #caseFile .cf-t a{color:#8a0c1a;font-weight:700}
  #caseFile .cf-key{margin-top:14px;padding:12px;border:3px solid #1b1b2f;border-radius:10px;background:#1b1b2f;color:#fff7d6;text-align:center}
  #caseFile .cf-key input{font:400 22px 'Rye',Georgia,serif;letter-spacing:.2em;text-transform:uppercase;width:min(260px,70vw);text-align:center;padding:6px;border:3px solid #ffd34d;border-radius:8px;background:#fff7d6;color:#1b1b2f}
  #caseFile .cf-key button{font:700 15px 'Fredoka',system-ui,sans-serif;margin:8px 4px 0;background:#ffd34d;color:#1b1b2f;border:3px solid #fff7d6;border-radius:999px;padding:7px 16px;cursor:pointer}
  #caseFile .cf-msg{min-height:1.4em;margin-top:6px;color:#ffd34d}
  #caseFile button:focus-visible,#caseFile a:focus-visible,#caseFile input:focus-visible{outline:3px dashed #e3243b;outline-offset:2px}
  @media (max-width:520px){#caseFile .cf-word span{width:32px;height:40px;font-size:22px}}`;

  const WRONG = [
    "Ooh, close! (It wasn't close.) Try again!",
    "That's not it! It's never 'EXIT'. Exits are painted.",
    'Nope! Read the stubs in order. Slowly. Out loud. Dramatically.',
  ];

  function paintSign() {
    const m = M(), exit = document.getElementById('exit');
    if (!m || !exit) return;
    const n = m.count();
    for (let i = 1; i <= 8; i++) exit.classList.toggle('mys-' + i, n >= i);
    exit.classList.toggle('mys-solved', m.solved());
    let tag = exit.querySelector('.mys-count');
    if (n > 0) {
      if (!tag) { tag = document.createElement('span'); tag.className = 'mys-count'; exit.appendChild(tag); }
      tag.textContent = m.solved() ? '✓ case closed' : `🎟️ ${n}/8`;
    } else if (tag) tag.remove();
    exit.title = n ? `EXIT (${n}/8 ticket stubs found, click to open the case file)` : 'EXIT';
  }

  function render(dialog) {
    const m = M(), st = m.state(), found = st.found || {};
    const all = m.STUBS.every((s) => found[s.id]);
    const word = m.STUBS.map((s) => `<span class="${found[s.id] ? '' : 'empty'}" aria-hidden="true">${found[s.id] ? s.letter : '?'}</span>`).join('');
    const items = m.STUBS.map((s) => {
      const got = !!found[s.id];
      const act = (window.CIRCUS_ADVENTURES || []).find((a) => a.num === s.act);
      const link = act ? `<a href="${esc(act.href)}">${esc(act.icon || '')} ${esc(act.title)}</a>` : esc(s.where);
      return `<li class="${got ? '' : 'missing'}"><div class="cf-l" aria-hidden="true">${got ? esc(s.letter) : '?'}</div>` +
        `<div class="cf-t"><b>STUB #${s.n} · ${got ? 'FOUND' : 'MISSING'}</b>` +
        (got ? `“${esc(s.note)}”` : `${esc(s.hint)}<br>Last seen near: ${link}`) + `</div></li>`;
    }).join('');
    const key = st.solved
      ? `<div class="cf-key"><div>🗝️ The keyhole is already open.</div><button type="button" class="cf-go">Return backstage ▸</button></div>`
      : all
        ? `<div class="cf-key"><label for="cfPass">🗝️ The keyhole is glowing. Speak the word:</label><br><input id="cfPass" autocomplete="off" maxlength="16" spellcheck="false">` +
          `<br><button type="button" class="cf-try">Unlock the door</button><div class="cf-msg" role="status" aria-live="polite"></div></div>`
        : `<div class="cf-key">🔒 Find all eight stubs and the keyhole will wake up.</div>`;
    dialog.querySelector('.cf-body').innerHTML =
      `<p class="cf-intro">Exhibit A: one EXIT door, painted. Exhibit B: everyone insists it's painted. Exhibit C: eight torn ticket stubs scattered around the circus. Who painted the exit, and why?</p>` +
      `<div class="cf-word" aria-label="Letters found: ${m.STUBS.map((s) => (found[s.id] ? s.letter : 'blank')).join(' ')}">${word}</div>` +
      `<ol>${items}</ol>${key}`;
    const tryBtn = dialog.querySelector('.cf-try');
    if (tryBtn) {
      const inp = dialog.querySelector('#cfPass'), msg = dialog.querySelector('.cf-msg');
      const attempt = () => {
        if (m.solve(inp.value)) {
          msg.textContent = '…click. The painted door swings open. It was never painted at all.';
          try { window.TADC.sfx('fanfare'); window.TADC.confetti(innerWidth / 2, innerHeight / 2, 160, 1.2); } catch (e) { /* optional */ }
          paintSign();
          setTimeout(() => { location.href = 'acts/00-backstage/index.html'; }, 1600);
        } else {
          msg.textContent = WRONG[Math.floor(Math.random() * WRONG.length)];
          try { window.TADC.sfx('honk'); } catch (e) { /* optional */ }
          inp.select();
        }
      };
      tryBtn.addEventListener('click', attempt);
      inp.addEventListener('keydown', (e) => { if (e.key === 'Enter') { e.preventDefault(); attempt(); } });
    }
    const go = dialog.querySelector('.cf-go');
    if (go) go.addEventListener('click', () => { location.href = 'acts/00-backstage/index.html'; });
  }

  let dialog = null, opener = null;
  function open() {
    if (!M()) return;
    if (!dialog) {
      const style = document.createElement('style'); style.textContent = CSS; document.head.appendChild(style);
      dialog = document.createElement('dialog'); dialog.id = 'caseFile'; dialog.setAttribute('aria-labelledby', 'caseTitle');
      dialog.innerHTML = `<div class="cf-head"><h2 id="caseTitle">🔍 Case File: Who Painted the Exit?<span class="cf-stamp">CONFIDENTIAL-ish</span></h2>` +
        `<button type="button" class="cf-close">Close ✕</button></div><div class="cf-body"></div>`;
      document.body.appendChild(dialog);
      dialog.querySelector('.cf-close').addEventListener('click', () => dialog.close());
      dialog.addEventListener('click', (e) => { if (e.target === dialog) dialog.close(); });
      dialog.addEventListener('close', () => { if (opener && opener.focus) opener.focus(); });
    }
    opener = document.activeElement;
    render(dialog);
    if (typeof dialog.showModal === 'function') dialog.showModal(); else dialog.setAttribute('open', '');
    const inp = dialog.querySelector('#cfPass'); if (inp) inp.focus();
    try { window.TADC.sfx('tick'); } catch (e) { /* optional */ }
  }

  function mount() {
    if (!document.getElementById('mys-style')) {
      const s = document.createElement('style'); s.id = 'mys-style'; s.textContent = CSS.split('/* the case file */')[0]; document.head.appendChild(s);
    }
    paintSign();
    addEventListener('storage', (e) => { if (M() && e.key === M().KEY) paintSign(); });
    document.addEventListener('visibilitychange', () => { if (!document.hidden) paintSign(); });
  }

  window.CircusMystery = { open, paintSign };
  if (document.readyState === 'loading') document.addEventListener('DOMContentLoaded', mount); else mount();
})();
