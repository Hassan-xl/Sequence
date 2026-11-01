// Power Cards variant: rules engine.
// Sits on top of engine.js. Classic games never touch this file; a game is a Power Cards game
// only when its state has `variant: 'power'` and a `pw` block.
const Power = (() => {
  const E = Engine;
  const IDS = ['explosion', 'color', 'table', 'skip', 'swap', 'mine'];
  const INFO = {
    explosion: { name: 'Explosion', type: 'Instant', turn: true, line: 'Center chip plus up to 2 random chips in a 3×3 zone fall.',
      rules: ['Tap any square that holds a chip. It becomes the center of a 3×3 zone.', 'The center chip always falls, plus up to 2 more chosen at random from the zone.', 'It hits every team, including yours.', 'Chips in a finished sequence and the corners are never hit.'] },
    color: { name: 'Color Change', type: 'Instant', turn: true, line: 'Turn one rival chip into your colour.',
      rules: ['Pick one rival chip that is not in a finished sequence.', 'It changes to your team colour.', 'It can complete a sequence for you.'] },
    table: { name: 'Table Flipper', type: 'Comeback', turn: true, line: 'Ends the game with no winner. 7-day card timer.',
      rules: ['Only playable while your team has fewer sequences than at least one other team.', 'Every teammate must accept within 15 seconds. No answer counts as no. A solo player needs no vote.', 'If accepted, the board flips and the game ends. Nobody wins.', 'Penalty: everyone on the flipping team gets a 7-day timer. While it runs they cannot be dealt Table Flipper.'] },
    skip: { name: 'Turn Skipper', type: 'Free action', turn: false, line: 'Skip the opponents so your team moves twice in a row.',
      rules: ['Play it at the start of your turn, then play your card as normal.', 'Every opponent between you and your next teammate is skipped.', 'No teammate? You take two turns in a row.', 'It does not use your turn. The bonus move can be any card, Jacks included.'] },
    swap: { name: 'Team Swap', type: 'Instant', turn: true, line: 'Trade seats (colour and turn position) with one opponent.',
      rules: ['Choose any one opponent and swap seats with them.', 'You take their colour and their place in the turn order. They take yours.', 'The board and everyone\'s hands stay exactly as they are.', 'Back-to-back turns after the swap are allowed.'] },
    mine: { name: 'Mine', type: 'Trap', turn: true, line: 'Hidden bomb. Center plus up to 4 chips fall when stepped on.',
      rules: ['Mark any empty square that is not a corner. Only your team sees where.', 'Everyone is told a mine is active.', 'It goes off when anyone, your team included, places a chip there with a normal card or a two-eyed Jack.', 'The placed chip falls, plus up to 4 random chips in the 3×3 zone. One-eyed Jacks, Color Change and Explosion never set it off.'] }
  };
  const FLIP_DAYS = 7;
  const clone = s => JSON.parse(JSON.stringify(s));
  const isPower = s => !!(s && s.pw);
  const teamOf = (s, pi) => s.players[pi].team;
  const held = (s, t) => { const c = s.pw && s.pw.cards[t]; return c && c.st === 'held' ? c.id : null; };
  const blockedTeam = (s, t, now = Date.now()) => s.players.some(p => p.team === t && p.flipUntil && p.flipUntil > now);
  const zone = c => { const r = Math.floor(c / 10), k = c % 10, out = []; for (let dr = -1; dr <= 1; dr++) for (let dk = -1; dk <= 1; dk++) { const rr = r + dr, kk = k + dk; if (rr >= 0 && rr <= 9 && kk >= 0 && kk <= 9 && !(dr === 0 && dk === 0)) out.push(rr * 10 + kk); } return out; };
  const hittable = (s, i) => !E.CORNER.has(i) && s.chips[i] >= 0 && !s.locked[i];

  function create(players, opts = {}) {
    const s = E.create(players, opts);
    s.variant = 'power';
    const deck = E.shuffle(IDS.slice()), cards = [];
    for (let t = 0; t < s.teams; t++) {
      let k = deck.findIndex(id => !(id === 'table' && blockedTeam(s, t)));
      if (k < 0) k = 0;
      cards.push({ id: deck[k], st: 'held' });
      deck.splice(k, 1);
    }
    s.pw = { cards, pool: deck, swapOpen: Array(s.teams).fill(true), skip: null, mine: null, flip: null, lock: -1 };
    return s;
  }

  // ---------- turn order ----------
  // Moves the turn on from seat pi. With Turn Skipper active, the next seat of that team plays (or pi again).
  function advance(s, pi) {
    const n = s.players.length;
    let nx = (pi + 1) % n;
    if (s.pw.skip) {
      const t = s.pw.skip.team;
      for (let k = 1; k <= n; k++) { const j = (pi + k) % n; if (s.players[j].team === t) { nx = j; break; } }
    }
    s.pw.skip = null; s.pw.lock = -1;
    s.turn = nx; s.swapped = false;
  }
  function guard(s, pi) {
    if (s.winner !== -1) throw new Error('Game is over');
    if (s.pw.flip) throw new Error('A table flip vote is running');
    if (s.turn !== pi) throw new Error('Not your turn');
  }
  function log(s, e) { e.n = s.moveNo; E.pushLog(s, e); return e; }

  // Removes the center plus up to `extra` random hittable chips around it. Returns [{c, t}].
  function blast(s, center, extra, centerTeam) {
    const fell = [{ c: center, t: centerTeam != null ? centerTeam : s.chips[center] }];
    s.chips[center] = -1;
    const pool = E.shuffle(zone(center).filter(i => hittable(s, i)));
    pool.slice(0, extra).forEach(i => { fell.push({ c: i, t: s.chips[i] }); s.chips[i] = -1; });
    return fell;
  }

  // ---------- normal moves (wrapped so mines, Turn Skipper and the start swap work) ----------
  function play(s0, pi, hi, cell) {
    if (!isPower(s0)) return E.play(s0, pi, hi, cell);
    if (s0.pw.flip) throw new Error('A table flip vote is running');
    const card = s0.hands[pi] && s0.hands[pi][hi];
    const t = s0.players[pi] ? s0.players[pi].team : -1;
    const m = s0.pw.mine;
    if (m && cell === m.cell && card && !E.isOneEyed(card)) return detonate(s0, pi, hi, cell);
    const s = E.play(s0, pi, hi, cell); // also checks turn and legality
    s.pw.swapOpen[t] = false;
    if (s.winner === -1) advance(s, pi);
    return s;
  }
  function detonate(s0, pi, hi, cell) {
    const s = clone(s0);
    guard(s, pi);
    const card = s.hands[pi][hi], t = teamOf(s, pi);
    if (!card || !E.targets(s, card, t).includes(cell)) throw new Error('Illegal move');
    const owner = s.pw.mine.team;
    s.hands[pi].splice(hi, 1); s.discard.push(card); E.draw(s, pi);
    const fell = blast(s, cell, 4, t);
    s.pw.mine = null; s.pw.swapOpen[t] = false;
    s.last = log(s, { pi, kind: 'pw', p: 'boom', card, cell, fell, owner, team: t });
    s.passes = 0;
    if (s.rule === 'full' && s.hands.every(h => !h.length)) E.finish(s, 'cards');
    else advance(s, pi);
    s.moveNo++;
    return s;
  }
  function pass(s0, pi) {
    if (!isPower(s0)) return E.pass(s0, pi);
    if (s0.pw.flip) throw new Error('A table flip vote is running');
    const t = teamOf(s0, pi);
    const s = E.pass(s0, pi);
    s.pw.swapOpen[t] = false;
    if (s.winner === -1) advance(s, pi); else { s.pw.skip = null; }
    return s;
  }
  const swapDead = (s, pi, hi) => E.swapDead(s, pi, hi);
  const endNow = (s, pi) => { const ns = E.endNow(s, pi); if (ns.pw) ns.pw.flip = null; return ns; };

  // ---------- power cards ----------
  // Why the card can't be used right now ('' if it can). arg-free check, used by the UI.
  function why(s, pi, id) {
    if (!isPower(s) || s.winner !== -1) return 'The game is over.';
    if (s.pw.flip) return 'A table flip vote is running.';
    if (s.turn !== pi) return 'You can only play it on your own turn.';
    const t = teamOf(s, pi);
    if (held(s, t) !== id) return 'Your team does not hold this card.';
    if (id === 'skip' && s.pw.skip) return 'Turn Skipper is already active.';
    if (id === 'table') {
      const best = Math.max(...s.seqs.filter((_, k) => k !== t));
      if (!(s.seqs[t] < best)) return 'Only playable while your team has fewer sequences than another team.';
      if (s.pw.lock === pi) return 'Your team turned the flip down this turn.';
    }
    if (id === 'explosion' && !targets(s, pi, id).length) return 'There are no chips that can be hit.';
    if (id === 'color' && !targets(s, pi, id).length) return 'No rival chip can be changed right now.';
    if (id === 'mine' && (s.pw.mine || !targets(s, pi, id).length)) return 'There is nowhere to plant it.';
    if (id === 'swap' && !s.players.some(p => p.team !== t)) return 'There is nobody to swap with.';
    return '';
  }
  // Squares (or seats, for Team Swap) the card can be aimed at.
  function targets(s, pi, id) {
    const t = teamOf(s, pi), out = [];
    if (id === 'explosion') { for (let i = 0; i < 100; i++) if (hittable(s, i)) out.push(i); }
    else if (id === 'color') { for (let i = 0; i < 100; i++) if (hittable(s, i) && s.chips[i] !== t) out.push(i); }
    else if (id === 'mine') { for (let i = 0; i < 100; i++) if (!E.CORNER.has(i) && s.chips[i] < 0) out.push(i); }
    else if (id === 'swap') s.players.forEach((p, j) => { if (p.team !== t) out.push(j); });
    return out;
  }
  function use(s0, pi, id, arg = {}) {
    const s = clone(s0);
    const no = why(s, pi, id);
    if (no) throw new Error(no);
    const t = teamOf(s, pi);
    const card = s.pw.cards[t];
    const done = e => {
      card.st = 'used'; s.pw.swapOpen[t] = false;
      s.last = log(s, Object.assign({ pi, kind: 'pw', p: id, team: t }, e));
      s.passes = 0;
    };
    if (id === 'skip') {
      card.st = 'used';
      s.pw.skip = { team: t, by: pi };
      s.last = log(s, { pi, kind: 'pw', p: 'skip', team: t });
      s.moveNo++;
      return s;
    }
    if (id === 'table') return flipStart(s, pi);
    if (id === 'explosion') {
      if (!targets(s, pi, id).includes(arg.cell)) throw new Error('Pick a chip that is not in a sequence.');
      done({ cell: arg.cell, fell: blast(s, arg.cell, 2) });
    } else if (id === 'color') {
      if (!targets(s, pi, id).includes(arg.cell)) throw new Error('Pick a rival chip.');
      const victim = s.chips[arg.cell];
      s.chips[arg.cell] = t;
      const added = E.scanSeqs(s, t);
      done({ cell: arg.cell, victim, seq: added });
      if (s.rule !== 'full' && s.seqs[t] >= s.seqToWin) { s.winner = t; s.moveNo++; return s; }
    } else if (id === 'mine') {
      if (!targets(s, pi, id).includes(arg.cell)) throw new Error('Pick an empty square.');
      s.pw.mine = { cell: arg.cell, team: t, by: pi };
      done({}); // the square is not written into the public log entry
    } else if (id === 'swap') {
      const j = arg.seat;
      if (!targets(s, pi, id).includes(j)) throw new Error('Pick an opponent.');
      const a = s.players[pi], b = s.players[j];
      s.players[pi] = Object.assign({}, b, { team: a.team });
      s.players[j] = Object.assign({}, a, { team: b.team });
      const h = s.hands[pi]; s.hands[pi] = s.hands[j]; s.hands[j] = h;
      if (s.pw.skip && s.pw.skip.by === pi) s.pw.skip.by = j;
      // keep the history pointing at the right people after they change seats
      s.log.forEach(e => { if (e.pi === pi) e.pi = j; else if (e.pi === j) e.pi = pi; });
      done({ pi: j, from: pi, seat: j, a: a.id, b: b.id, an: a.name, bn: b.name, ta: a.team, tb: b.team });
    }
    advance(s, pi);
    s.moveNo++;
    return s;
  }

  // Table Flipper vote
  function flipStart(s, pi) {
    const t = teamOf(s, pi);
    s.pw.swapOpen[t] = false;
    const need = s.players.map((p, k) => k).filter(k => k !== pi && s.players[k].team === t && !s.players[k].cpu);
    if (!need.length) { flipDo(s, pi); s.moveNo++; return s; }
    s.pw.flip = { team: t, by: pi, need, votes: {}, id: s.gid + ':' + s.moveNo, at: Date.now() };
    s.last = log(s, { pi, kind: 'pw', p: 'flipask', team: t });
    s.moveNo++;
    return s;
  }
  function flipDo(s, pi) {
    const t = teamOf(s, pi);
    s.pw.cards[t].st = 'used';
    s.pw.flip = null;
    s.last = log(s, { pi, kind: 'pw', p: 'table', team: t, ids: s.players.filter(p => p.team === t).map(p => p.id) });
    s.winner = -4; s.endReason = 'flip'; s.flipTeam = t;
  }
  function flipVote(s0, k, yes) {
    const s = clone(s0), f = s.pw && s.pw.flip;
    if (!f || !f.need.includes(k)) throw new Error('No vote for you');
    if (!yes) return flipNo(s, k);
    f.votes[k] = 1;
    if (f.need.every(x => f.votes[x])) flipDo(s, f.by);
    s.moveNo++;
    return s;
  }
  function flipNo(s, k) {
    const f = s.pw.flip;
    s.pw.flip = null; s.pw.lock = f.by;
    s.last = log(s, { pi: f.by, kind: 'pw', p: 'flipno', team: f.team, who: k });
    s.moveNo++;
    return s;
  }
  function flipExpire(s0) { const s = clone(s0); if (!s.pw || !s.pw.flip) throw new Error('No vote'); return flipNo(s, -1); }

  // Free extras: blind swap with the pool (once, before the team's first move) and discarding.
  function canPoolSwap(s, pi) {
    if (!isPower(s) || s.winner !== -1 || s.pw.flip || s.turn !== pi) return false;
    const t = teamOf(s, pi);
    if (!s.pw.swapOpen[t] || !held(s, t)) return false;
    return s.pw.pool.some(id => !(id === 'table' && blockedTeam(s, t)));
  }
  function poolSwap(s0, pi) {
    const s = clone(s0);
    if (!canPoolSwap(s, pi)) throw new Error('You cannot swap now');
    const t = teamOf(s, pi), old = s.pw.cards[t].id;
    const choices = s.pw.pool.filter(id => !(id === 'table' && blockedTeam(s, t)));
    const pick = choices[Math.floor(Math.random() * choices.length)];
    s.pw.pool.splice(s.pw.pool.indexOf(pick), 1); s.pw.pool.push(old);
    s.pw.cards[t] = { id: pick, st: 'held', was: old };
    s.pw.swapOpen[t] = false;
    log(s, { pi, kind: 'pw', p: 'pool', team: t });
    s.moveNo++;
    return s;
  }
  function discard(s0, pi) {
    const s = clone(s0);
    if (!isPower(s) || s.winner !== -1 || s.pw.flip || s.turn !== pi) throw new Error('Not now');
    const t = teamOf(s, pi);
    if (!held(s, t)) throw new Error('No card');
    s.pw.cards[t].st = 'gone';
    s.pw.swapOpen[t] = false;
    log(s, { pi, kind: 'pw', p: 'discard', team: t });
    s.moveNo++;
    return s;
  }

  // ---------- computer players ----------
  const W_THREAT = [0, 0, 3, 35, 900, 0];
  const W_MINE = [1, 4, 18, 90, 6000, 0];
  function threatAt(s, cell, o) { let v = 0; for (const w of E.CELL_WIN[cell]) { const c = E.countWin(s, w, o); if (c >= 0) v += W_THREAT[Math.min(c, 5)]; } return v; }
  function strength(s, t) { let v = s.seqs[t] * 4000; for (let i = 0; i < 100; i++) if (s.chips[i] === t) for (const w of E.CELL_WIN[i]) { const c = E.countWin(s, w, t); if (c >= 0) v += W_MINE[Math.min(c, 5)] / 5; } return v; }
  // Picks a normal move, staying off the bot's own mine unless it is the only move.
  function aiNormal(s, pi) {
    const t = teamOf(s, pi), m = s.pw.mine;
    let st = s;
    if (E.canSwap(st, pi)) { const di = st.hands[pi].findIndex(c => E.isDead(st, c)); if (di >= 0) st = E.swapDead(st, pi, di); }
    const view = clone(st); view.swapped = true;
    if (m && m.team === t) { view.chips[m.cell] = st.teams + 5; view.locked[m.cell] = 1; }
    let mv = E.aiChoose(view, pi);
    if (mv.type !== 'play' && E.hasMove(st, pi)) { const v2 = clone(st); v2.swapped = true; mv = E.aiChoose(v2, pi); } // only the mine square is left
    return mv.type === 'play' ? play(st, pi, mv.hi, mv.cell) : pass(st, pi);
  }
  function bestNormalScore(s, pi) { const mv = E.aiChoose(s, pi); return mv.type === 'play' ? mv.sc : 0; }
  function aiPlan(s, pi) {
    const p = s.players[pi], t = p.team, id = held(s, t);
    if (!id || why(s, pi, id)) return null;
    if (p.level === 'easy' && Math.random() < .5) return null;
    const best = bestNormalScore(s, pi);
    const foes = s.players.map(q => q.team).filter((x, k, a) => x !== t && a.indexOf(x) === k);
    if (id === 'skip') return (best >= 800 || (best >= 90 && Math.random() < .5) || (s.moveNo > 14 && Math.random() < .2)) ? { id } : null;
    if (id === 'explosion' || id === 'color') {
      if (best >= 2000) return null;
      let top = null;
      for (const c of targets(s, pi, id)) {
        const o = s.chips[c];
        if (o === t) continue;
        let v = threatAt(s, c, o);
        if (id === 'color') { const tmp = clone(s); tmp.chips[c] = t; if (E.scanSeqs(tmp, t) > 0) v += 8000; else v += threatAt(tmp, c, t) / 4; }
        if (!top || v > top.v) top = { v, c };
      }
      if (top && (top.v >= 900 || (top.v >= 70 && s.moveNo > 10 && Math.random() < .3))) return { id, arg: { cell: top.c } };
      return null;
    }
    if (id === 'mine') {
      if (best >= 2000) return null;
      let top = null;
      for (const c of targets(s, pi, id)) { let v = 0; for (const o of foes) v += threatAt(s, c, o); if (!top || v > top.v) top = { v, c }; }
      return top && (top.v >= 900 || (top.v >= 70 && Math.random() < .2)) ? { id, arg: { cell: top.c } } : null;
    }
    if (id === 'swap') {
      const mine = strength(s, t);
      let top = null;
      for (const o of foes) { const v = strength(s, o); if (!top || v > top.v) top = { v, o }; }
      if (!top || top.v < mine * 1.35 + 300) return null;
      const seats = targets(s, pi, id).filter(j => s.players[j].team === top.o);
      return seats.length ? { id, arg: { seat: seats[Math.floor(Math.random() * seats.length)] } } : null;
    }
    if (id === 'table') {
      if (best >= 6000) return null;
      const danger = foes.some(o => (s.rule === 'full' ? E.openSquares(s) < 10 : s.seqs[o] >= s.seqToWin - 1) && [...Array(100).keys()].some(c => s.chips[c] < 0 && !E.CORNER.has(c) && threatAt(s, c, o) >= 900));
      return danger && best < 2000 ? { id } : null;
    }
    return null;
  }
  function aiApply(s, pi) {
    if (!isPower(s)) return E.aiApply(s, pi);
    let st = s;
    const t = teamOf(st, pi);
    if (canPoolSwap(st, pi) && (held(st, t) === 'table' || Math.random() < .2)) st = poolSwap(st, pi);
    const plan = aiPlan(st, pi);
    if (plan) {
      st = use(st, pi, plan.id, plan.arg);
      if (plan.id !== 'skip') return st;
    }
    return aiNormal(st, pi);
  }

  return {
    IDS, INFO, FLIP_DAYS, isPower, held, zone, blockedTeam,
    create, play, pass, swapDead, endNow, aiApply,
    why, targets, use, flipVote, flipExpire, canPoolSwap, poolSwap, discard
  };
})();
if (typeof module !== 'undefined') module.exports = Power;
