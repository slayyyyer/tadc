/* 🏆 The Trophy Case: a read-only view of everything the circus remembers about you.
 * Reads the per-act localStorage records (nothing new is stored), shows per-act bests and a set of
 * achievement medals. Self-mounting: adds a "🏆 Trophy Case" button under the poster board's passport line.
 * To add an act: give it a row in RECORDS (and optionally a medal in MEDALS). */
(function () {
  'use strict';

  const read = (key, fallback = null) => {
    try { const v = localStorage.getItem(key); return v === null ? fallback : JSON.parse(v); } catch (e) { return fallback; }
  };
  const num = (v) => (Number.isFinite(+v) ? +v : 0);
  const fmt = (n) => num(n).toLocaleString();

  // Each record reads one act's storage and returns a short display string (or null = not played yet).
  const RECORDS = [
    { num: '01', key: 'tadc-exit-best', show: (v) => (num(v) > 1 ? `Deepest door: depth ${fmt(v)}` : null) },
    { num: '03', key: 'tadc-episode', show: (v) => (num(v) ? `${fmt(v)} episode${num(v) === 1 ? '' : 's'} pitched` : null) },
    { num: '04', key: 'tadc-kinger-stats', show: (v) => (v && (v.wins || v.claims || v.queens) ? `${fmt(v.wins)} win${v.wins === 1 ? '' : 's'} · Kinger's "checkmates": ${fmt(v.claims)} · queens misplaced: ${fmt(v.queens)}` : null) },
    { num: '05', key: 'tadc-snack-best', show: (v) => (num(v) ? `Best snack score: ${fmt(v)}` : null) },
    { num: '10', key: 'tadc-toaster-ep2', show: (v) => { const best = v ? Math.max(0, ...Object.values(v).map(num)) : 0; return best ? `Top showdown score: ${fmt(best)}` : null; } },
    { num: '17', key: 'tadc-bubblegotchi-v1', show: (v) => (v && v.born ? `${stageName(v.care)} · ${fmt(Math.floor(v.care || 0))} care points` : null) },
    { num: '19', key: 'tadc-pinball-best', show: (v) => (num(v) ? `High score: ${fmt(v)}` : null) },
    { num: '20', key: 'tadc-whackadoor-best', show: (v) => (num(v) ? `Best round: ${fmt(v)}` : null) },
    { num: '22', key: 'tadc-ribbons-v1', show: (v) => (num(v && v.repaired) ? `${fmt(v.repaired)} ribbon${num(v.repaired) === 1 ? '' : 's'} repaired${v.best != null ? ` · fewest turns: ${fmt(v.best)}` : ''}` : null) },
    { num: '23', key: 'tadc-beetles-v1', show: (v) => (num(v && v.filed) ? `All eight pairs filed ${fmt(v.filed)}×${v.best != null ? ` · best: ${fmt(v.best)} guesses` : ''}` : null) },
    { num: '24', key: 'tadc-kitchen-v1', show: (v) => (num(v && v.notebooks) ? `${fmt(v.notebooks)} full recipe notebook${num(v.notebooks) === 1 ? '' : 's'}${v.best != null ? ` · fewest batches: ${fmt(v.best)}` : ''}` : null) },
    { num: '25', key: 'tadc-doors-v1', show: (v) => (v && Array.isArray(v.endings) && v.endings.length ? `${fmt(v.endings.length)} / 4 endings found` : null) },
    { num: '26', key: 'tadc-shadow-v1', show: (v) => (num(v && v.saved) ? `${fmt(v.saved)} shadow play${num(v.saved) === 1 ? '' : 's'} saved` : null) },
    { num: '27', key: 'tadc-crates-v1', show: (v) => (num(v && v.cleared) ? `${fmt(Math.min(4, v.cleared))} / 4 rooms cleared${v.best != null ? ` · best: ${fmt(v.best)} pushes` : ''}` : null) },
    { num: '28', key: 'tadc-bowling-v1', show: (v) => (num(v && v.games) ? `${fmt(v.games)} game${num(v.games) === 1 ? '' : 's'} · best: ${fmt(Math.min(50, num(v.best)))} / 50 pins` : null) },
    { num: '29', key: 'tadc-tea-v1', show: (v) => (num(v && v.services) ? `${fmt(v.services)} tea service${num(v.services) === 1 ? '' : 's'} · best: ${fmt(Math.min(24, num(v.best)))} / 24 hearts` : null) },
    { num: '30', key: 'tadc-colors-v1', show: (v) => (num(v && v.matched) ? `${fmt(v.matched)} sample${num(v.matched) === 1 ? '' : 's'} approved${v.best != null ? ` · fewest submissions: ${fmt(v.best)}` : ''}` : null) },
    { num: '31', key: 'tadc-garden-v1', show: (v) => (num(v && v.saved) ? `${fmt(v.saved)} garden${num(v.saved) === 1 ? '' : 's'} saved${v.best ? ` · fullest bloom: ${fmt(v.best)} plants` : ''}` : null) },
    { num: '32', key: 'tadc-pillowfort-best', show: (v) => (num(v) ? `Tallest fort: ${num(v).toFixed(1)} m` : null) },
    { num: '21', key: 'tadc-wordsnack-v1', show: (v) => (v && v.played ? `${fmt(v.wins)}/${fmt(v.played)} solved · streak ${fmt(v.streak)} · best streak ${fmt(v.bestStreak)}` : null) },
  ];
  function stageName(care) {
    const c = num(care);
    return c >= 200 ? 'Bubble Prime' : c >= 80 ? 'Big Bubble' : c >= 25 ? 'Bubble' : 'Bubblet';
  }

  function snapshot() {
    const acts = (window.CIRCUS_ADVENTURES || []).filter((a) => !a.soon);
    const stamps = read('tadc-passport-v1', {}) || {};
    const visited = acts.filter((a) => { const m = /acts\/(\d{2}-[^/]+)\//.exec(a.href); return m && stamps[m[1]]; }).length;
    const scenes = (read('tadc-scenes-seen-v1', []) || []).length;
    const sceneTotal = (window.CircusScenes && window.CircusScenes.SCENES && window.CircusScenes.SCENES.length) || 24;
    const raw = Object.fromEntries(RECORDS.map((r) => [r.num, read(r.key)]));
    return { acts, visited, scenes, sceneTotal, raw };
  }

  // Medals: [icon, name, how-to-earn, test(snapshot)]
  const MEDALS = [
    ['🎟️', 'First Stamp', 'Visit any adventure', (s) => s.visited >= 1],
    ['🗺️', 'Half the Tent', 'Visit half of the adventures', (s) => s.acts.length > 0 && s.visited >= Math.ceil(s.acts.length / 2)],
    ['🏆', 'Seen It All', 'Stamp every adventure', (s) => s.acts.length && s.visited >= s.acts.length],
    ['🎬', 'Regular Audience', 'Hear 12 cast scenes', (s) => s.scenes >= 12],
    ['🎭', 'Season Pass', 'Hear every cast scene', (s) => s.scenes >= s.sceneTotal],
    ['🚪', 'Door Diver', 'Reach depth 5 in Find the Exit', (s) => num(s.raw['01']) >= 5],
    ['♚', 'Regicide (Polite)', "Beat Kinger at chess", (s) => num(s.raw['04'] && s.raw['04'].wins) >= 1],
    ['🫧', 'Bottomless', 'Score 1,000 in Snack Attack', (s) => num(s.raw['05']) >= 1000],
    ['🍞', 'Golden Brown', 'Score 50,000 in a Toaster Showdown song', (s) => s.raw['10'] && Object.values(s.raw['10']).some((v) => num(v) >= 50000)],
    ['🥚', 'Bubble Prime', 'Raise Bubble-gotchi to its final form', (s) => num(s.raw['17'] && s.raw['17'].care) >= 200],
    ['🎰', 'Painted Wall Enthusiast', 'Score 100,000 in pinball', (s) => num(s.raw['19']) >= 100000],
    ['🔨', 'Hinge Menace', 'Score 500 in Whack-a-Door', (s) => num(s.raw['20']) >= 500],
    ['🏰', 'The Fort Is Secure', 'Build a 6 m pillow fort for Kinger', (s) => num(s.raw['32']) >= 6],
    ['🎟️', 'Ticket Collector', 'Find 4 torn ticket stubs', () => { const m = window.TADC && window.TADC.mystery; return !!m && m.count() >= 4; }],
    ['🔍', 'Case Closed', 'Solve the mystery of the painted exit', () => { const m = window.TADC && window.TADC.mystery; return !!m && m.solved(); }],
    ['🔤', 'Word Glutton', 'Reach a 3-day Word Snack streak', (s) => num(s.raw['21'] && s.raw['21'].bestStreak) >= 3],
    ['🎀', 'Ribbon Wrangler', 'Repair all three ribbons in one set', (s) => num(s.raw['22'] && s.raw['22'].repaired) >= 3],
    ['🐞', 'Filed Properly', 'File all eight pairs in 30 guesses or fewer', (s) => num(s.raw['23'] && s.raw['23'].best) > 0 && num(s.raw['23'].best) <= 30],
    ['🥣', 'Cloud Chef', 'Fill a notebook with all six recipes', (s) => num(s.raw['24'] && s.raw['24'].notebooks) >= 1],
    ['🗂️', 'Paper Trail', 'Find all four Department of Doors endings', (s) => (s.raw['25'] && Array.isArray(s.raw['25'].endings) ? s.raw['25'].endings.length : 0) >= 4],
    ['🎭', 'Shadow Auteur', 'Save three shadow plays', (s) => num(s.raw['26'] && s.raw['26'].saved) >= 3],
    ['📦', 'Stage Manager', 'Clear all four crate rooms', (s) => num(s.raw['27'] && s.raw['27'].cleared) >= 4],
    ['🎳', 'House Champion', 'Score 40 pins in Backwards Bowling', (s) => num(s.raw['28'] && s.raw['28'].best) >= 40],
    ['🫖', 'Perfect Service', 'Serve all eight guests with 24 hearts', (s) => num(s.raw['29'] && s.raw['29'].best) >= 24],
    ['🎨', 'Approved Sample', 'Match all six colors', (s) => num(s.raw['30'] && s.raw['30'].matched) >= 6],
    ['🌱', 'In Full Bloom', 'Save a garden with 12 fully grown plants', (s) => num(s.raw['31'] && s.raw['31'].best) >= 12],
  ];

  const CSS = `
  #trophyOpen{margin:8px 0 0;font:700 13px 'Fredoka',system-ui,sans-serif;color:#1b1b2f;background:#ffd34d;border:3px solid #1b1b2f;border-radius:999px;padding:5px 12px;cursor:pointer;box-shadow:2px 2px 0 #1b1b2f}
  #trophyOpen:focus-visible,#trophyCase button:focus-visible,#trophyCase a:focus-visible{outline:3px dashed #ffd34d;outline-offset:2px}
  #trophyCase{width:min(760px,94vw);max-height:88vh;padding:0;border:5px solid #1b1b2f;border-radius:18px;background:#fff7d6;color:#1b1b2f;box-shadow:8px 8px 0 #8a0c1a;font-family:'Fredoka',system-ui,sans-serif}
  #trophyCase::backdrop{background:rgba(11,7,24,.78);backdrop-filter:blur(3px)}
  #trophyCase .tc-head{display:flex;align-items:center;justify-content:space-between;gap:10px;padding:12px 16px;border-bottom:4px solid #1b1b2f;
    background:repeating-linear-gradient(90deg,#e3243b 0 22px,#fff 22px 44px);position:sticky;top:0;z-index:1}
  #trophyCase h2{margin:0;font:400 clamp(20px,3.4vw,30px) 'Rye',Georgia,serif;background:#fff7d6;border:3px solid #1b1b2f;border-radius:10px;padding:2px 12px}
  #trophyCase .tc-close{font:700 14px 'Fredoka',system-ui,sans-serif;background:#e3243b;color:#fff;border:3px solid #1b1b2f;border-radius:999px;padding:6px 12px;cursor:pointer}
  #trophyCase .tc-body{padding:14px 16px 18px;overflow:auto}
  #trophyCase .tc-sum{display:flex;flex-wrap:wrap;gap:8px;margin-bottom:12px}
  #trophyCase .tc-pill{background:#1b1b2f;color:#ffd34d;border-radius:999px;padding:4px 12px;font-weight:700;font-size:14px}
  #trophyCase h3{font:400 18px 'Rye',Georgia,serif;margin:14px 0 8px}
  #trophyCase .tc-medals{display:grid;grid-template-columns:repeat(auto-fill,minmax(122px,1fr));gap:8px}
  #trophyCase .medal{border:3px solid #1b1b2f;border-radius:12px;padding:8px;background:#fff;text-align:center;box-shadow:2px 2px 0 #1b1b2f}
  #trophyCase .medal .ico{font-size:28px;display:block}
  #trophyCase .medal b{display:block;font-size:13px;margin-top:2px}
  #trophyCase .medal small{display:block;font-size:11px;color:#5c3a99;margin-top:2px}
  #trophyCase .medal.locked{background:#ece5d8;opacity:.6;filter:grayscale(1)}
  #trophyCase .medal.locked .ico::after{content:' 🔒';font-size:14px}
  #trophyCase .tc-records{list-style:none;margin:0;padding:0;display:grid;gap:6px}
  #trophyCase .tc-records li{display:flex;align-items:center;gap:10px;border:2px solid rgba(27,27,47,.25);border-radius:10px;padding:6px 10px;background:#fff}
  #trophyCase .tc-records .ico{font-size:22px;width:30px;text-align:center}
  #trophyCase .tc-records a{color:#8a0c1a;font-weight:700;text-decoration:none}
  #trophyCase .tc-records .stat{margin-left:auto;font-size:13px;text-align:right}
  #trophyCase .tc-records .none{color:#8f84b3;font-style:italic}
  #trophyCase .tc-note{font-size:12px;color:#5c3a99;margin-top:12px}
  @media (max-width:520px){#trophyCase .tc-records li{flex-wrap:wrap}#trophyCase .tc-records .stat{margin-left:40px;text-align:left}}`;

  const esc = (s) => String(s).replace(/[&<>"]/g, (c) => ({ '&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;' }[c]));

  function render(dialog) {
    const s = snapshot();
    const earned = MEDALS.filter((m) => { try { return m[3](s); } catch (e) { return false; } });
    const byNum = Object.fromEntries(s.acts.map((a) => [a.num, a]));
    const records = RECORDS.filter((r) => byNum[r.num]).sort((a, b) => a.num.localeCompare(b.num)).map((r) => {
      const a = byNum[r.num]; let text = null;
      try { text = r.show(s.raw[r.num]); } catch (e) { text = null; }
      return `<li><span class="ico" aria-hidden="true">${a.icon}</span><a href="${esc(a.href)}">${esc(a.title)}</a>` +
        `<span class="stat${text ? '' : ' none'}">${esc(text || 'not played yet')}</span></li>`;
    }).join('');
    dialog.querySelector('.tc-body').innerHTML =
      `<div class="tc-sum"><span class="tc-pill">🛂 Passport ${s.visited}/${s.acts.length}</span><span class="tc-pill">🎬 Scenes heard ${Math.min(s.scenes, s.sceneTotal)}/${s.sceneTotal}</span>` +
      `<span class="tc-pill">🏅 Medals ${earned.length}/${MEDALS.length}</span></div>` +
      `<h3>Medals</h3><div class="tc-medals">${MEDALS.map((m) => {
        const got = earned.includes(m);
        return `<div class="medal${got ? '' : ' locked'}" aria-label="${esc(m[1])}: ${got ? 'earned' : 'locked'}. ${esc(m[2])}"><span class="ico" aria-hidden="true">${m[0]}</span><b>${esc(m[1])}</b><small>${esc(m[2])}</small></div>`;
      }).join('')}</div>` +
      `<h3>Personal records</h3><ul class="tc-records">${records}</ul>` +
      `<p class="tc-note">Everything here lives only in this browser. Nothing is sent anywhere. Caine keeps the original copies in a drawer that does not exist.</p>`;
    return earned.length;
  }

  function mount() {
    const passport = document.getElementById('passport');
    if (!passport || document.getElementById('trophyOpen')) return;
    const style = document.createElement('style'); style.textContent = CSS; document.head.appendChild(style);
    const dialog = document.createElement('dialog');
    dialog.id = 'trophyCase';
    dialog.setAttribute('aria-labelledby', 'trophyTitle');
    dialog.innerHTML = `<div class="tc-head"><h2 id="trophyTitle">🏆 Trophy Case</h2><button type="button" class="tc-close">Back to the board ✕</button></div><div class="tc-body"></div>`;
    document.body.appendChild(dialog);
    const btn = document.createElement('button');
    btn.type = 'button'; btn.id = 'trophyOpen'; btn.setAttribute('aria-haspopup', 'dialog'); btn.setAttribute('aria-controls', 'trophyCase');
    btn.textContent = '🏆 Trophy Case';
    passport.after(btn);
    const refreshLabel = () => { const n = render(dialog); btn.textContent = `🏆 Trophy Case · ${n}/${MEDALS.length} medals`; };
    btn.addEventListener('click', (e) => {
      e.stopPropagation();
      refreshLabel();
      if (typeof dialog.showModal === 'function') dialog.showModal(); else dialog.setAttribute('open', '');
      if (window.TADC && window.TADC.sfx) window.TADC.sfx('ding');
    });
    dialog.querySelector('.tc-close').addEventListener('click', () => dialog.close());
    dialog.addEventListener('click', (e) => { if (e.target === dialog) dialog.close(); }); // click the backdrop to close
    dialog.addEventListener('close', () => btn.focus());
    // keep the medal count fresh whenever the poster board opens
    const adv = document.getElementById('adventuresBtn');
    if (adv) adv.addEventListener('click', refreshLabel);
    refreshLabel();
  }

  window.CircusTrophies = { RECORDS, MEDALS, snapshot, mount };
  if (document.readyState === 'loading') document.addEventListener('DOMContentLoaded', mount); else mount();
})();
