const Engine = (() => {
  const SUITS = ['S', 'H', 'D', 'C'];
  const RANKS = ['A', '2', '3', '4', '5', '6', '7', '8', '9', '10', 'J', 'Q', 'K'];
  // Layout transcribed from the physical board (top row first).
  const LAYOUT = [
    'XX','2S','3S','4S','5S','6S','7S','8S','9S','XX',
    '6C','5C','4C','3C','2C','AH','KH','QH','10H','10S',
    '7C','AS','2D','3D','4D','5D','6D','7D','9H','QS',
    '8C','KS','6C','5C','4C','3C','2C','8D','8H','KS',
    '9C','QS','7C','6H','5H','4H','AH','9D','7H','AS',
    '10C','10S','8C','7H','2H','3H','KH','10D','6H','2D',
    'QC','9S','9C','8H','9H','10H','QH','QD','5H','3D',
    'KC','8S','10C','QC','KC','AC','AD','KD','4H','4D',
    'AC','7S','6S','5S','4S','3S','2S','2H','3H','5D',
    'XX','AD','KD','QD','10D','9D','8D','7D','6D','XX'
  ];
  const CORNER = new Set([0, 9, 90, 99]);
  const POS = {};
  LAYOUT.forEach((c, i) => { if (c !== 'XX') (POS[c] = POS[c] || []).push(i); });

  // All 5-cell windows and the windows touching each cell (used by the AI).
  const WINDOWS = [];
  const DIRS = [[0, 1], [1, 0], [1, 1], [1, -1]];
  for (let r = 0; r < 10; r++) for (let c = 0; c < 10; c++) for (const [dr, dc] of DIRS) {
    const er = r + dr * 4, ec = c + dc * 4;
    if (er < 0 || er > 9 || ec < 0 || ec > 9) continue;
    const w = []; for (let k = 0; k < 5; k++) w.push((r + dr * k) * 10 + (c + dc * k));
    w.step = dr * 10 + dc;
    WINDOWS.push(w);
  }
  // Every full board line (row, column, both diagonals) that is long enough to hold a sequence.
  const LINES = [];
  for (const [dr, dc] of DIRS) for (let r = 0; r < 10; r++) for (let c = 0; c < 10; c++) {
    const pr = r - dr, pc = c - dc;
    if (pr >= 0 && pr <= 9 && pc >= 0 && pc <= 9) continue; // not the start of a line
    const cells = []; let rr = r, cc = c;
    while (rr >= 0 && rr <= 9 && cc >= 0 && cc <= 9) { cells.push(rr * 10 + cc); rr += dr; cc += dc; }
    if (cells.length >= 5) LINES.push({ step: dr * 10 + dc, cells });
  }
  const stepOf = cells => cells[1] - cells[0];
  // All ways to pick sequence start offsets in a run of length L, where two sequences on the
  // same line may share at most one chip (starts at least 4 apart).
  const PACKS = {};
  function packings(L) {
    if (PACKS[L]) return PACKS[L];
    const out = [];
    const rec = (from, cur) => {
      if (cur.length) out.push(cur.slice());
      for (let st = from; st <= L - 5; st++) { cur.push(st); rec(st + 4, cur); cur.pop(); }
    };
    rec(0, []);
    return (PACKS[L] = out);
  }
  const CELL_WIN = Array.from({ length: 100 }, () => []);
  WINDOWS.forEach(w => w.forEach(i => CELL_WIN[i].push(w)));

  const rankOf = c => c.slice(0, -1);
  const suitOf = c => c.slice(-1);
  const isJack = c => rankOf(c) === 'J';
  const isTwoEyed = c => c === 'JD' || c === 'JC';
  const isOneEyed = c => c === 'JS' || c === 'JH';

  function shuffle(a) {
    for (let i = a.length - 1; i > 0; i--) { const j = Math.floor(Math.random() * (i + 1)); [a[i], a[j]] = [a[j], a[i]]; }
    return a;
  }
  function newDeck() {
    const d = [];
    for (let k = 0; k < 2; k++) for (const s of SUITS) for (const r of RANKS) d.push(r + s);
    return shuffle(d);
  }
  const handSize = n => n <= 2 ? 7 : n <= 4 ? 6 : n <= 6 ? 5 : n <= 9 ? 4 : 3;
  const teamsFor = n => (n % 3 === 0 ? 3 : 2);
  const clone = s => JSON.parse(JSON.stringify(s));

  function create(players, opts = {}) {
    const n = players.length;
    const teams = opts.teams || teamsFor(n);
    const deck = newDeck();
    const hs = handSize(n);
    const ps = players.map((p, i) => Object.assign({}, p, { team: i % teams }));
    const hands = ps.map(() => deck.splice(0, hs));
    return {
      v: 1, teams, rule: opts.rule === 'full' ? 'full' : 'race', seqToWin: opts.seqToWin || (teams === 2 ? 2 : 1),
      players: ps, hands, deck, discard: [],
      chips: Array(100).fill(-1), locked: Array(100).fill(0),
      lines: [], seqs: Array(teams).fill(0),
      turn: opts.first != null ? opts.first : Math.floor(Math.random() * n), swapped: false, winner: -1, last: null, log: [], moveNo: 0, passes: 0,
      gid: Math.random().toString(36).slice(2, 10)
    };
  }

  const own = (s, i, t) => CORNER.has(i) || s.chips[i] === t;

  function targets(s, card, team) {
    const out = [];
    if (isTwoEyed(card)) { for (let i = 0; i < 100; i++) if (!CORNER.has(i) && s.chips[i] < 0) out.push(i); }
    else if (isOneEyed(card)) { for (let i = 0; i < 100; i++) if (s.chips[i] >= 0 && s.chips[i] !== team && !s.locked[i]) out.push(i); }
    else for (const i of POS[card] || []) if (s.chips[i] < 0) out.push(i);
    return out;
  }
  const isDead = (s, card) => !isJack(card) && (POS[card] || []).every(i => s.chips[i] >= 0);
  const hasMove = (s, pi) => s.hands[pi].some(c => targets(s, c, s.players[pi].team).length > 0);
  const canSwap = (s, pi) => !s.swapped && (s.rule !== 'full' || s.deck.length > 0) && s.hands[pi].some(c => isDead(s, c));
  const openSquares = s => { let n = 0; for (let i = 0; i < 100; i++) if (!CORNER.has(i) && s.chips[i] < 0) n++; return n; };
  const chipCount = (s, t) => s.chips.filter(c => c === t).length;
  // Full-board games: most sequences wins, then most chips on the board; otherwise a tie (-3).
  function finish(s, why) {
    s.endReason = why;
    let best = -1, top = [];
    for (let t = 0; t < s.teams; t++) { if (s.seqs[t] > best) { best = s.seqs[t]; top = [t]; } else if (s.seqs[t] === best) top.push(t); }
    if (top.length > 1) {
      let bc = -1, byChips = [];
      for (const t of top) { const c = chipCount(s, t); if (c > bc) { bc = c; byChips = [t]; } else if (c === bc) byChips.push(t); }
      s.tiebreak = byChips.length === 1; top = byChips;
    }
    s.winner = top.length === 1 ? top[0] : -3;
  }

  // Re-reads the whole board for team t and adds every sequence it is owed.
  // Rules:
  //  * A sequence is 5 of your chips (or free corners) in a straight line.
  //  * Sequences that CROSS each other (different directions) may share chips freely.
  //  * Two sequences on the SAME line may share at most one chip, so a run of 9 or 10
  //    in a row counts as two sequences no matter which five were completed first.
  // When a longer run allows more sequences than are currently counted, the sequences on
  // that run are re-packed (earlier ones are kept where possible). Locked chips stay locked.
  function scanSeqs(s, t) {
    let added = 0;
    const tag = s.moveNo;
    for (const line of LINES) {
      let i = 0;
      while (i < line.cells.length) {
        if (!own(s, line.cells[i], t)) { i++; continue; }
        const run = [];
        while (i < line.cells.length && own(s, line.cells[i], t)) run.push(line.cells[i++]);
        const L = run.length;
        if (L < 5) continue;
        const max = Math.floor((L - 1) / 4);
        const inRun = new Set(run);
        const existing = [];
        s.lines.forEach((l, k) => { if (l.t === t && stepOf(l.cells) === line.step && inRun.has(l.cells[0])) existing.push(k); });
        if (existing.length >= max) continue;
        const oldStarts = new Set(existing.map(k => run.indexOf(s.lines[k].cells[0])));
        let best = null, bestKey = null;
        for (const pk of packings(L)) {
          const kept = pk.filter(st => oldStarts.has(st)).length;
          let cover = 0;
          for (const st of pk) for (let k = 0; k < 5; k++) if (s.locked[run[st + k]]) cover++;
          const key = [pk.length, kept, cover];
          if (!best || key[0] > bestKey[0] || (key[0] === bestKey[0] && (key[1] > bestKey[1] || (key[1] === bestKey[1] && key[2] > bestKey[2])))) { best = pk; bestKey = key; }
        }
        if (!best || best.length <= existing.length) continue;
        const keep = existing.filter(k => best.includes(run.indexOf(s.lines[k].cells[0])));
        const drop = new Set(existing.filter(k => !keep.includes(k)));
        const keptStarts = new Set(keep.map(k => run.indexOf(s.lines[k].cells[0])));
        s.lines = s.lines.filter((l, k) => !drop.has(k));
        for (const st of best) {
          if (keptStarts.has(st)) continue;
          const w = run.slice(st, st + 5);
          w.forEach(c => { if (!CORNER.has(c)) s.locked[c] = 1; });
          s.lines.push({ t, cells: w, m: tag });
        }
        added += best.length - existing.length;
      }
    }
    for (let k = 0; k < s.teams; k++) s.seqs[k] = s.lines.filter(l => l.t === k).length;
    return added;
  }

  function draw(s, pi) {
    if (!s.deck.length) {
      if (s.rule === 'full' || !s.discard.length) return;
      s.deck = shuffle(s.discard); s.discard = [];
    }
    s.hands[pi].push(s.deck.pop());
  }
  function pushLog(s, e) { s.log.unshift(e); s.log = s.log.slice(0, 40); }

  function play(s0, pi, hi, cell) {
    const s = clone(s0);
    if (s.winner !== -1 || s.turn !== pi) throw new Error('Not your turn');
    const card = s.hands[pi][hi];
    const t = s.players[pi].team;
    if (!card || !targets(s, card, t).includes(cell)) throw new Error('Illegal move');
    let entry;
    if (isOneEyed(card)) {
      const victim = s.chips[cell];
      s.chips[cell] = -1;
      entry = { pi, card, cell, kind: 'remove', victim, n: s.moveNo };
    } else {
      s.chips[cell] = t;
      const added = scanSeqs(s, t);
      entry = { pi, card, cell, kind: 'place', seq: added, n: s.moveNo };
    }
    s.hands[pi].splice(hi, 1);
    s.discard.push(card);
    draw(s, pi);
    s.last = entry; pushLog(s, entry); s.passes = 0;
    if (s.rule !== 'full' && s.seqs[t] >= s.seqToWin) s.winner = t;
    else if (s.rule === 'full' && openSquares(s) === 0) finish(s, 'board');
    else if (s.rule === 'full' && s.hands.every(h => !h.length)) finish(s, 'cards');
    else { s.turn = (pi + 1) % s.players.length; s.swapped = false; }
    s.moveNo++;
    return s;
  }
  function swapDead(s0, pi, hi) {
    const s = clone(s0);
    const card = s.hands[pi][hi];
    if (s.turn !== pi || !canSwap(s, pi) || !isDead(s, card)) throw new Error('Cannot swap');
    s.hands[pi].splice(hi, 1); s.discard.push(card); draw(s, pi);
    s.swapped = true;
    pushLog(s, { pi, card, kind: 'swap', n: s.moveNo });
    s.moveNo++;
    return s;
  }
  // The host (or anyone, in local games) can stop the game; it is scored like a full-board finish.
  function endNow(s0, pi) {
    const s = clone(s0);
    if (s.winner !== -1) throw new Error('Game is over');
    pushLog(s, { pi, kind: 'end', n: s.moveNo });
    finish(s, 'ended');
    s.moveNo++;
    return s;
  }
  function pass(s0, pi) {
    const s = clone(s0);
    if (s.turn !== pi) throw new Error('Not your turn');
    pushLog(s, { pi, kind: 'pass', n: s.moveNo });
    s.passes = (s.passes || 0) + 1;
    if (s.rule === 'full') { if (s.passes >= s.players.length) finish(s, s.hands.every(h => !h.length) ? 'cards' : 'stuck'); }
    else if (s.passes >= s.players.length * 2) s.winner = -2;
    s.turn = (pi + 1) % s.players.length; s.swapped = false; s.moveNo++;
    return s;
  }

  // ---------- AI ----------
  // For each team, which cells are already part of a sequence running in each direction.
  const covCache = new WeakMap();
  function coverage(s) {
    let cv = covCache.get(s);
    if (cv) return cv;
    cv = Array.from({ length: s.teams }, () => new Set());
    for (const l of s.lines) { const st = stepOf(l.cells); for (const c of l.cells) cv[l.t].add(st * 1000 + c); }
    covCache.set(s, cv);
    return cv;
  }
  function countWin(s, w, t) {
    const cv = coverage(s)[t];
    let n = 0, lk = 0;
    for (const i of w) {
      if (cv.has(w.step * 1000 + i)) lk++;
      if (CORNER.has(i)) { n++; continue; }
      const ch = s.chips[i];
      if (ch === t) n++;
      else if (ch >= 0) return -1;
    }
    return lk >= 2 ? -1 : n;
  }
  const MINE = [1, 4, 18, 90, 6000];
  const BLOCK = [0, 1, 6, 45, 2000];
  const THREAT = [0, 0, 3, 35, 900, 0];
  function scoreMove(s, t, card, cell, level) {
    if (isOneEyed(card)) {
      const o = s.chips[cell];
      let v = 0;
      for (const w of CELL_WIN[cell]) { const c = countWin(s, w, o); if (c >= 0) v += THREAT[c]; }
      return v - 70;
    }
    let v = 0;
    for (const w of CELL_WIN[cell]) {
      const m = countWin(s, w, t); if (m >= 0) v += MINE[Math.min(m, 4)];
      for (let o = 0; o < s.teams; o++) {
        if (o === t) continue;
        const c = countWin(s, w, o); if (c >= 0) v += BLOCK[Math.min(c, 4)] * (level === 'easy' ? 0.4 : 1);
      }
    }
    const r = Math.floor(cell / 10), c = cell % 10;
    v += 4 - (Math.abs(r - 4.5) + Math.abs(c - 4.5)) * 0.4;
    if (isTwoEyed(card) && v < 3000) v -= 110;
    return v;
  }
  function aiChoose(s, pi) {
    const p = s.players[pi], t = p.team, level = p.level || 'normal';
    if (canSwap(s, pi)) {
      const di = s.hands[pi].findIndex(c => isDead(s, c));
      if (di >= 0) return { type: 'swap', hi: di };
    }
    const moves = [];
    s.hands[pi].forEach((card, hi) => {
      for (const cell of targets(s, card, t)) {
        let sc = scoreMove(s, t, card, cell, level);
        if (level === 'easy') sc += Math.random() * 60;
        else if (level === 'normal') sc *= 0.9 + Math.random() * 0.2;
        moves.push({ type: 'play', hi, cell, sc });
      }
    });
    if (!moves.length) return { type: 'pass' };
    moves.sort((a, b) => b.sc - a.sc);
    if (level === 'easy' && moves[0].sc < 5000 && Math.random() < 0.35) return moves[Math.floor(Math.random() * Math.min(6, moves.length))];
    return moves[0];
  }
  function aiApply(s, pi) {
    let st = s;
    let m = aiChoose(st, pi);
    if (m.type === 'swap') { st = swapDead(st, pi, m.hi); m = aiChoose(st, pi); if (m.type === 'swap') m = { type: 'pass' }; }
    return m.type === 'pass' ? pass(st, pi) : play(st, pi, m.hi, m.cell);
  }

  return {
    LAYOUT, CORNER, POS, rankOf, suitOf, isJack, isTwoEyed, isOneEyed,
    create, targets, scanSeqs, isDead, hasMove, canSwap, openSquares, chipCount, endNow, play, swapDead, pass, aiChoose, aiApply, teamsFor, handSize
  };
})();
if (typeof module !== 'undefined') module.exports = Engine;
