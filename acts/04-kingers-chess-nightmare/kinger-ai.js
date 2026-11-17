// Kinger's brain. Minimax + alpha-beta over the game's OWN circus move generator.
// No APIs, no engines, no network: just a dear, scattered king counting on his fingers.
// The search only ever touches a cloned board (apply/undo); the live board is never mutated.
(() => {
  'use strict';
  const WIN = 100000;
  const INF = 1e9;
  const ABORT = { aborted: true };
  const now = () => performance.now();

  // Difficulty presets. noise is in centipawns; forget = chance he "forgets" and wings it;
  // wild = share of those forgets that are a truly random move (else a random non-blunder).
  const PRESETS = {
    pillow: { label: 'Pillow', maxDepth: 1, budget: 60, noise: 220, forget: 0.3, wild: 0.6 },
    fort: { label: 'Fort', maxDepth: 3, budget: 110, noise: 45, forget: 0.08, wild: 0 },
    grandmaster: { label: 'Grandmaster (allegedly)', maxDepth: 3, budget: 150, noise: 8, forget: 0.02, wild: 0 },
  };
  const SENTIMENT = 14; // he likes the piece he moved last, a little

  function create({ gen, value }) {
    // gen(side, B) -> [{fr, fc, r, c, cap?}] using the game's own rules
    const cp = (t) => (t === 'K' ? 0 : Math.round((value[t] || 0) * 100));
    const opp = (s) => (s === 'w' ? 'b' : 'w');
    let nodes = 0, deadline = INF;

    const clone = (B) => B.map((row) => row.map((p) => (p ? { t: p.t, s: p.s } : null)));

    function make(B, m) {
      const p = B[m.fr][m.fc], v = B[m.r][m.c];
      B[m.r][m.c] = p; B[m.fr][m.fc] = null;
      let promo = false;
      // the real promotion is a random circus piece; the search assumes the chicken (the only one that bites)
      if (p.t === 'P' && (m.r === 0 || m.r === 7)) { p.t = 'chicken'; promo = true; }
      return { p, v, promo };
    }
    function undo(B, m, u) {
      B[m.fr][m.fc] = u.p; B[m.r][m.c] = u.v;
      if (u.promo) u.p.t = 'P';
    }

    // score from `side`'s point of view, in centipawns
    function evaluate(B, side) {
      let s = 0;
      const kings = [];
      for (let r = 0; r < 8; r++) for (let c = 0; c < 8; c++) {
        const p = B[r][c];
        if (!p || p.s === 'n') continue;
        let v = cp(p.t);
        const centre = 7 - (Math.abs(3.5 - r) + Math.abs(3.5 - c)); // 0 (corner) .. 6 (centre)
        if (p.t === 'N' || p.t === 'B' || p.t === 'chicken') v += centre * 5;
        else if (p.t === 'Q' || p.t === 'R') v += centre;
        else if (p.t === 'P') {
          const adv = p.s === 'w' ? 6 - r : r - 1; // 0..5
          v += adv * adv * 3 + (c >= 2 && c <= 5 ? centre * 2 : 0);
        } else if (p.t === 'K') kings.push([r, c, p.s]);
        s += p.s === side ? v : -v;
      }
      // king safety: friends huddled around the king
      for (const [r, c, ks] of kings) {
        let friends = 0;
        for (let dr = -1; dr <= 1; dr++) for (let dc = -1; dc <= 1; dc++) {
          if (!dr && !dc) continue;
          const rr = r + dr, cc = c + dc;
          if (rr >= 0 && rr < 8 && cc >= 0 && cc < 8 && B[rr][cc] && B[rr][cc].s === ks) friends++;
        }
        const safety = Math.min(friends, 4) * 10;
        s += ks === side ? safety : -safety;
      }
      return s;
    }

    // MVV-LVA: captures first, the juiciest victim by the cheapest attacker
    function order(B, moves) {
      for (const m of moves) {
        m.k = m.cap ? 100000 + (B[m.r][m.c].t === 'K' ? 1e6 : cp(B[m.r][m.c].t) * 16) - cp(B[m.fr][m.fc].t) : 0;
      }
      return moves.sort((a, b) => b.k - a.k);
    }

    function tick() {
      if ((++nodes & 511) === 0 && now() > deadline) throw ABORT;
    }

    function quiesce(B, side, alpha, beta, ply, qd) {
      tick();
      const stand = evaluate(B, side);
      if (stand >= beta) return stand;
      if (stand > alpha) alpha = stand;
      if (qd >= 4) return stand;
      const caps = order(B, gen(side, B).filter((m) => m.cap));
      for (const m of caps) {
        if (B[m.r][m.c].t === 'K') return WIN - ply - 1;
        const u = make(B, m);
        const score = -quiesce(B, opp(side), -beta, -alpha, ply + 1, qd + 1);
        undo(B, m, u);
        if (score >= beta) return score;
        if (score > alpha) alpha = score;
      }
      return alpha;
    }

    function negamax(B, side, depth, alpha, beta, ply) {
      tick();
      if (depth <= 0) return quiesce(B, side, alpha, beta, ply, 0);
      const moves = gen(side, B);
      if (!moves.length) return 0; // a picnic is declared
      order(B, moves);
      let best = -INF;
      for (const m of moves) {
        if (m.cap && B[m.r][m.c].t === 'K') return WIN - ply - 1; // king capture ends the game
        const u = make(B, m);
        const score = -negamax(B, opp(side), depth - 1, -beta, -alpha, ply + 1);
        undo(B, m, u);
        if (score > best) best = score;
        if (score > alpha) alpha = score;
        if (alpha >= beta) break;
      }
      return best;
    }

    // Iterative deepening at the root. Every root move inside `margin` of the best gets an exact score,
    // so the personality noise has honest numbers to wobble.
    function search(live, side, { maxDepth = 3, budget = 150, margin = 300 } = {}) {
      const B = clone(live);
      const t0 = now();
      nodes = 0;
      let rootMoves = gen(side, B).map((m) => ({ fr: m.fr, fc: m.fc, r: m.r, c: m.c, cap: m.cap }));
      if (!rootMoves.length) return null;
      order(B, rootMoves);
      let done = null, depthDone = 0;
      for (let d = 1; d <= maxDepth; d++) {
        deadline = d === 1 ? INF : t0 + budget; // depth 1 always finishes
        const scored = [];
        let best = -INF;
        try {
          for (const m of rootMoves) {
            let score;
            if (m.cap && B[m.r][m.c].t === 'K') score = WIN;
            else {
              const alpha = best === -INF ? -INF : best - margin;
              const u = make(B, m);
              try { score = -negamax(B, opp(side), d - 1, -INF, -alpha, 1); } finally { undo(B, m, u); }
            }
            scored.push({ m, score });
            if (score > best) best = score;
          }
        } catch (e) {
          if (e !== ABORT) throw e;
          break;
        }
        scored.sort((a, b) => b.score - a.score);
        done = scored; depthDone = d;
        rootMoves = scored.map((x) => x.m); // best-first for the next iteration
        if (best >= WIN - 10) break; // a king capture is on the table; no need to look further
        if (now() - t0 > budget * 0.45) break; // the next depth would blow the budget
      }
      deadline = INF;
      return { scored: done, depth: depthDone, ms: now() - t0, nodes, staticScore: evaluate(B, side) };
    }

    // Kinger's actual decision: search, then let his personality get a word in.
    function decide(live, side, preset, prefer, rand = Math.random) {
      const res = search(live, side, { maxDepth: preset.maxDepth, budget: preset.budget, margin: Math.max(150, preset.noise * 3) });
      if (!res) return null;
      const { scored } = res;
      const best = scored[0].score;
      let pickd, mood = 'plan';
      if (rand() < preset.forget) {
        mood = 'forgot';
        if (rand() < preset.wild) pickd = scored[Math.floor(rand() * scored.length)];
        else {
          const okay = scored.filter((x) => x.score >= best - 150 && x.score > -WIN / 2);
          pickd = okay[Math.floor(rand() * okay.length)] || scored[0];
        }
      } else {
        let top = -INF;
        for (const x of scored) {
          const noise = (rand() + rand() + rand() - 1.5) * preset.noise; // a lumpy little bell curve
          const fond = prefer && x.m.fr === prefer[0] && x.m.fc === prefer[1] ? SENTIMENT : 0;
          const v = x.score + noise + fond;
          if (v > top) { top = v; pickd = x; }
        }
      }
      if (mood === 'plan') {
        if (pickd.score >= WIN - 50) mood = 'forced';
        else if (best <= -WIN + 50) mood = 'doom';
        else if (pickd.score - res.staticScore >= 300) mood = 'swing';
        else if (prefer && pickd.m.fr === prefer[0] && pickd.m.fc === prefer[1]) mood = 'fond';
      }
      const out = { move: pickd.m, score: pickd.score, best, mood, depth: res.depth, ms: res.ms, nodes: res.nodes, staticScore: res.staticScore };
      api.lastStats = out;
      api.history.push(Math.round(res.ms * 10) / 10);
      if (api.history.length > 200) api.history.shift();
      return out;
    }

    return { search, decide, evaluate, clone };
  }

  const api = { WIN, PRESETS, create, lastStats: null, history: [] };
  window.KingerAI = api;
})();
