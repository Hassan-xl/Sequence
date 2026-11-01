// Power Cards variant: screens, card art, announcements and board effects.
// app.js calls into this file only when a game has a `pw` block, so classic games are untouched.
const PowerUI = (() => {
  const P = Power, E = Engine;
  const $ = s => document.querySelector(s);
  const reduced = matchMedia('(prefers-reduced-motion: reduce)').matches;
  const canHover = matchMedia('(hover: hover)').matches;
  let C = null;             // context handed over by app.js
  let aim = null;           // { id, cell } while a power card is being aimed at the board
  let queue = [], playing = false, skipAnn = null;
  let vote = null;          // the table-flip vote this screen is showing
  let sheetSwap = false;    // Team Swap seat picker open in the sheet
  let armed = null;         // two-tap confirmations in the sheet
  const esc = s => String(s == null ? '' : s).replace(/[&<>"']/g, c => ({ '&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;', "'": '&#39;' }[c]));
  const sleep = ms => new Promise(r => setTimeout(r, ms));

  /* ---------------- card art ---------------- */
  function star(n, r1, r2, rot = -90) { let d = ''; for (let i = 0; i < n * 2; i++) { const r = i % 2 ? r2 : r1, a = (rot + i * 180 / n) * Math.PI / 180; d += (i ? 'L' : 'M') + (50 + r * Math.cos(a)).toFixed(1) + ' ' + (50 + r * Math.sin(a)).toFixed(1); } return d + 'Z'; }
  let spikes = ''; for (let k = 0; k < 8; k++) spikes += `<rect x="44.5" y="13" width="11" height="17" rx="3" transform="rotate(${k * 45} 50 54)"/>`;
  const ICON = {
    explosion: `<path d="${star(11, 47, 24)}" opacity=".45"/><path d="${star(9, 36, 17, -70)}"/><circle cx="50" cy="50" r="11" class="hot"/>`,
    color: '<circle cx="50" cy="50" r="23" class="half"/><path d="M50 27 A23 23 0 0 1 50 73Z"/><path d="M50 8 A42 42 0 0 1 90 44" fill="none" stroke="currentColor" stroke-width="7" stroke-linecap="round"/><path d="M80 34 L92 47 L98 30Z"/><path d="M50 92 A42 42 0 0 1 10 56" fill="none" stroke="currentColor" stroke-width="7" stroke-linecap="round"/><path d="M20 66 L8 53 L2 70Z"/>',
    table: '<g transform="rotate(-24 50 50)"><rect x="10" y="56" width="80" height="11" rx="3"/><rect x="18" y="20" width="9" height="37" rx="2"/><rect x="73" y="20" width="9" height="37" rx="2"/></g><path d="M18 86 Q50 100 84 82" fill="none" stroke="currentColor" stroke-width="5" stroke-linecap="round" opacity=".7"/><circle cx="74" cy="12" r="5"/><circle cx="88" cy="24" r="4"/><circle cx="62" cy="6" r="3"/>',
    skip: '<path d="M8 22 L44 50 L8 78Z"/><path d="M44 22 L80 50 L44 78Z"/><rect x="82" y="22" width="10" height="56" rx="3"/>',
    swap: '<path d="M14 34 H70" stroke="currentColor" stroke-width="9" stroke-linecap="round"/><path d="M64 18 L88 34 L64 50Z"/><path d="M86 66 H30" stroke="currentColor" stroke-width="9" stroke-linecap="round"/><path d="M36 50 L12 66 L36 82Z"/>',
    mine: `${spikes}<circle cx="50" cy="54" r="28"/><circle cx="40" cy="44" r="7" class="hot"/><path d="M62 24 Q70 8 84 12" fill="none" stroke="currentColor" stroke-width="5" stroke-linecap="round"/><path d="${star(6, 9, 4)}" transform="translate(37 -42)" class="hot"/>`
  };
  const BOLT = '<path d="M58 4 L22 56 H46 L38 96 L80 38 H54Z"/>';
  const typeLine = id => P.INFO[id].type;
  function art(id, cls = '') {
    const I = P.INFO[id];
    return `<div class="pcard pc-${id} ${cls}"><div class="pc-in"><span class="pc-type">${esc(typeLine(id))}</span><svg class="pc-ico" viewBox="0 0 100 100" aria-hidden="true">${ICON[id]}</svg><span class="pc-name">${esc(I.name)}</span></div><i class="pc-shine"></i></div>`;
  }
  const back = (cls = '') => `<div class="pcard pc-back ${cls}"><div class="pc-in"><svg class="pc-ico" viewBox="0 0 100 100" aria-hidden="true">${BOLT}</svg></div></div>`;
  const fanHTML = () => P.IDS.map((id, i) => `<span class="vf" style="--i:${i}">${art(id, 'xs')}</span>`).join('');

  /* ---------------- helpers ---------------- */
  const G = () => C.G;
  const on = () => !!(C && C.G && C.G.pw);
  // The team whose secret this screen may show (local games: only while the hand is revealed).
  function viewTeam() {
    const g = G(); if (!g || !g.players[C.seat]) return -1;
    if (C.mode === 'local' && !C.visible) return -1;
    return g.players[C.seat].team;
  }
  const pname = pi => { const p = G().players[pi]; return p ? p.name : 'Someone'; };
  const cellBox = i => { const el = C.cells()[i]; return { x: el.offsetLeft, y: el.offsetTop, w: el.offsetWidth, h: el.offsetHeight }; };
  const cellCenter = i => { const r = C.cells()[i].getBoundingClientRect(); return [r.left + r.width / 2, r.top + r.height / 2]; };
  const teamColor = t => getComputedStyle(document.documentElement).getPropertyValue('--t' + t).trim() || '#fff';
  function layer() {
    let l = $('#grid .pw-layer');
    if (!l) { l = document.createElement('div'); l.className = 'pw-layer'; $('#grid').appendChild(l); }
    return l;
  }
  function ghost(i, t, cls = '') {
    const b = cellBox(i), d = document.createElement('div');
    d.className = 'pw-ghost ' + cls;
    d.style.cssText = `left:${b.x}px;top:${b.y}px;width:${b.w}px;height:${b.h}px`;
    d.innerHTML = C.chipHTML(t, false);
    layer().appendChild(d);
    return d;
  }

  /* ---------------- sounds ---------------- */
  const SFX = {
    ann() { C.Sound.tone(392, 0, .18, 'triangle', .08, 784); C.Sound.tone(784, .12, .3, 'triangle', .07); },
    boom(big) { C.Sound.noise(0, big ? .9 : .6, 140, big ? 1 : .8); C.Sound.tone(110, 0, .6, 'sine', .35, 35); C.Sound.noise(.04, .3, 900, .35); },
    color() { [440, 554, 659, 880, 1109].forEach((f, i) => C.Sound.tone(f, i * .05, .3, 'sine', .1)); },
    skip() { C.Sound.tone(660, 0, .08, 'square', .05); C.Sound.tone(990, .1, .12, 'square', .05); C.Sound.tone(1320, .22, .14, 'square', .04); },
    swap() { C.Sound.tone(300, 0, .35, 'sine', .12, 900); C.Sound.tone(900, .05, .35, 'sine', .1, 300); },
    mine() { C.Sound.tone(1200, 0, .06, 'square', .05); C.Sound.tone(1200, .16, .06, 'square', .05); C.Sound.tone(1500, .32, .1, 'square', .05); },
    flip() { C.Sound.noise(0, .3, 400, .5); C.Sound.tone(220, 0, .6, 'sawtooth', .08, 60); C.Sound.noise(.5, .8, 220, .9); },
    tick() { C.Sound.tone(1000, 0, .04, 'sine', .05); }
  };

  /* ---------------- DOM ---------------- */
  function init(ctx) {
    C = ctx;
    const add = html => { const d = document.createElement('div'); d.innerHTML = html.trim(); const el = d.firstElementChild; document.body.appendChild(el); return el; };
    add('<div class="pw-ann" id="pwAnn" hidden aria-live="assertive"><div class="pw-ann-bg"></div><div class="pw-rays"></div><div class="pw-ann-box"><div class="pw-ann-card" id="pwAnnCard"></div><div class="pw-ann-txt"><div class="pw-ann-who" id="pwAnnWho"></div><div class="pw-ann-title" id="pwAnnTitle"></div><div class="pw-ann-sub" id="pwAnnSub"></div></div></div><div class="pw-ann-skip">Tap to continue</div></div>');
    add('<div class="overlay pw-ov" id="pwSheet" hidden><div class="modal pw-sheet" id="pwSheetBody"></div></div>');
    add('<div class="overlay pw-ov" id="pwVote" hidden><div class="modal center pw-vote" id="pwVoteBody"></div></div>');
    add('<div class="overlay pw-ov" id="pwRules" hidden><div class="modal pw-rules" id="pwRulesBody"></div></div>');
    $('#pwAnn').addEventListener('click', () => skipAnn && skipAnn());
    $('#pwSheet').addEventListener('click', onSheetClick);
    $('#pwRules').addEventListener('click', e => { if (e.target.id === 'pwRules' || e.target.closest('[data-close]')) $('#pwRules').hidden = true; });
    $('#pwVote').addEventListener('click', onVoteClick);
    document.addEventListener('keydown', e => { if (e.key === 'Escape') { if (!$('#pwSheet').hidden) closeSheet(); if (!$('#pwRules').hidden) $('#pwRules').hidden = true; } });
    $('#grid').addEventListener('mouseover', e => { if (!canHover || !aim || aim.id !== 'explosion' || aim.cell != null) return; const c = e.target.closest('.cell'); if (c) previewZone(+c.dataset.i); });
    $('#grid').addEventListener('mouseleave', () => { if (aim && aim.cell == null) previewZone(-1); });
    setInterval(tickTimers, 30000);
  }

  /* ---------------- rules ---------------- */
  function openRules() {
    $('#pwRulesBody').innerHTML = `<h2>Power Cards</h2>
      <p>Standard Sequence rules, plus six special cards. Every team is dealt <b>one at random</b> at the start; the rest wait in a hidden pool.</p>
      <ul class="pw-gen">
        <li>Only your team sees your card until it is played. Every card is revealed when the game ends.</li>
        <li>Once, before your team's first move, you may swap your card blind for a random one from the pool.</li>
        <li>Any teammate can play it on their own turn. Each card is single use, and you can discard it instead.</li>
        <li>Playing a card uses your turn (you place no chip), except Turn Skipper.</li>
        <li>Chips in a finished sequence and the four corners are never affected.</li>
      </ul>
      <div class="pw-grid">${P.IDS.map(id => `<div class="pw-rc">${art(id, 'md')}<div><h3>${esc(P.INFO[id].name)} <span class="pw-tag pc-${id}">${esc(P.INFO[id].type)}</span></h3><ul>${P.INFO[id].rules.map(r => `<li>${esc(r)}</li>`).join('')}</ul></div></div>`).join('')}</div>
      <button class="btn primary" data-close>Got it</button>`;
    $('#pwRules').hidden = false;
  }

  /* ---------------- hand slot, team badges, status ---------------- */
  function handCard() {
    if (!on()) return '';
    const t = viewTeam(); if (t < 0) return '';
    const c = G().pw.cards[t];
    const ready = c.st === 'held' && G().turn === C.seat && !P.why(G(), C.seat, c.id) && C.canAct();
    const label = c.st === 'held' ? `Your team's power card: ${P.INFO[c.id].name}` : 'Your team has no power card left';
    return `<button class="hcard pwh pc-${c.id}${c.st !== 'held' ? ' spent' : ''}${ready ? ' ready' : ''}${aim ? ' sel' : ''}" aria-label="${esc(label)}"><span class="badge pwb">${c.st === 'held' ? 'Power' : c.st === 'used' ? 'Used' : 'Gone'}</span>${art(c.id)}</button>`;
  }
  function teamBadge(t) {
    if (!on()) return '';
    const g = G(), c = g.pw.cards[t], mine = t === viewTeam(), over = g.winner !== -1;
    let face, txt;
    if (c.st === 'held' && !mine && !over) { face = back('mini'); txt = 'Hidden power card'; }
    else { face = art(c.id, 'mini'); txt = c.st === 'held' ? (over ? `${P.INFO[c.id].name} · never played` : P.INFO[c.id].name) : c.st === 'used' ? `${P.INFO[c.id].name} · used` : `${P.INFO[c.id].name} · discarded`; }
    return `<div class="pw-tl ${c.st}">${face}<span>${esc(txt)}</span></div>`;
  }
  function statusPills() {
    if (!on()) return '';
    const g = G(), out = [];
    if (g.pw.mine && g.winner === -1) out.push(`<span class="pw-pill mine">${svgIco('mine')}1 mine active</span>`);
    if (g.pw.skip && g.winner === -1) out.push(`<span class="pw-pill skip">${svgIco('skip')}Bonus move</span>`);
    if (g.pw.flip) out.push(`<span class="pw-pill table">${svgIco('table')}Table flip vote</span>`);
    return out.length ? `<div class="pw-pills">${out.join('')}</div>` : '';
  }
  const svgIco = id => `<svg viewBox="0 0 100 100" aria-hidden="true">${ICON[id]}</svg>`;

  /* ---------------- board paint (targets, mine marker) ---------------- */
  function paintBoard() {
    const grid = $('#grid'); if (!grid) return;
    const cells = C.cells();
    const g = G();
    const ts = new Set();
    if (aim && on() && C.canAct()) P.targets(g, C.seat, aim.id).forEach(i => ts.add(i));
    else if (aim) aim = null;
    grid.classList.toggle('pw-aim', !!aim);
    grid.dataset.pw = aim ? aim.id : '';
    for (let i = 0; i < cells.length; i++) {
      cells[i].classList.toggle('pw-t', ts.has(i));
      cells[i].classList.toggle('pw-pick', !!aim && aim.cell === i);
    }
    previewZone(aim && aim.id === 'explosion' && aim.cell != null ? aim.cell : -1);
    // mine marker: only the owner team sees the square
    layer().querySelectorAll('.pw-mk').forEach(n => n.remove());
    const m = on() && g.pw.mine;
    if (m && g.winner === -1 && m.team === viewTeam()) {
      const b = cellBox(m.cell), d = document.createElement('div');
      d.className = 'pw-mk'; d.style.cssText = `left:${b.x}px;top:${b.y}px;width:${b.w}px;height:${b.h}px`;
      d.innerHTML = `<svg viewBox="0 0 100 100">${ICON.mine}</svg>`;
      layer().appendChild(d);
    }
    const fr = $('#frame');
    let bd = fr.querySelector('.pw-minebadge');
    if (m && g.winner === -1) { if (!bd) { bd = document.createElement('div'); bd.className = 'pw-minebadge'; bd.innerHTML = `${svgIco('mine')}<span>1 mine active</span>`; fr.appendChild(bd); } }
    else if (bd) bd.remove();
  }
  function previewZone(c) {
    const cells = C.cells();
    cells.forEach(el => el.classList.remove('pw-zone', 'pw-zc'));
    if (c < 0 || !aim || aim.id !== 'explosion') return;
    if (!P.targets(G(), C.seat, 'explosion').includes(c)) return;
    cells[c].classList.add('pw-zc');
    P.zone(c).forEach(i => cells[i].classList.add('pw-zone'));
  }

  /* ---------------- aiming ---------------- */
  const active = () => !!aim;
  function cancel(silent) { if (!aim) return; aim = null; if (!silent) C.rerender(); }
  function startAim(id) { C.clearSel(); aim = { id, cell: null }; closeSheet(); C.rerender(); }
  function onCell(i) {
    if (!aim) return false;
    if (!C.canAct()) { aim = null; return false; }
    if (!P.targets(G(), C.seat, aim.id).includes(i)) return true;
    if (aim.cell === i) { commitAim(); return true; }
    aim.cell = i; SFX.tick(); C.rerender();
    return true;
  }
  function commitAim() {
    if (!aim || aim.cell == null) return;
    const { id, cell } = aim; aim = null;
    act(() => P.use(G(), C.seat, id, { cell }));
  }
  function act(fn) {
    let ns; try { ns = fn(); } catch (e) { C.toast(e.message || 'That is not allowed right now.'); C.rerender(); return; }
    C.push(ns);
  }
  // Fills the action bar while a card is being aimed. Returns true if it took over the bar.
  function actions(el) {
    if (!aim || !C.canAct()) return false;
    const msgs = { explosion: 'Tap a chip to blow up its 3×3 zone', color: 'Tap a rival chip to turn it your colour', mine: 'Tap an empty square to hide your mine' };
    const verbs = { explosion: 'Detonate', color: 'Change colour', mine: 'Plant mine' };
    el.innerHTML = aim.cell == null
      ? `<span class="hint pw-hint">${svgIco(aim.id)}${msgs[aim.id]}</span><button class="btn" data-pwact="cancel">Cancel</button>`
      : `<button class="btn primary big pw-go pc-${aim.id}" data-pwact="go">${verbs[aim.id]}</button><button class="btn" data-pwact="cancel">Cancel</button>`;
    el.querySelectorAll('[data-pwact]').forEach(b => b.onclick = () => (b.dataset.pwact === 'go' ? commitAim() : cancel()));
    return true;
  }

  /* ---------------- the sheet (your team's card) ---------------- */
  function openSheet() { if (!on() || viewTeam() < 0) return; sheetSwap = false; armed = null; renderSheet(); $('#pwSheet').hidden = false; }
  function closeSheet() { $('#pwSheet').hidden = true; sheetSwap = false; armed = null; }
  function renderSheet() {
    const g = G(), t = viewTeam(); if (t < 0) { closeSheet(); return; }
    const c = g.pw.cards[t], I = P.INFO[c.id];
    const myTurn = C.canAct();
    const no = c.st === 'held' ? P.why(g, C.seat, c.id) : '';
    let btns = '';
    if (c.st === 'held') {
      if (sheetSwap) {
        const seats = P.targets(g, C.seat, 'swap');
        btns = `<div class="pw-seats"><div class="label">Swap seats with</div>${seats.map(j => `<button class="pw-seat" data-seat="${j}"><span class="mini-chip">${C.chipHTML(g.players[j].team)}</span><b>${esc(g.players[j].name)}</b><span class="note">${esc(C.teamName(g.players[j].team))}</span>${armed === 'seat' + j ? '<em>Tap again to swap</em>' : ''}</button>`).join('')}</div><button class="btn" data-pw="back">Back</button>`;
      } else {
        btns = `<button class="btn primary big pw-use pc-${c.id}" data-pw="use"${no || !myTurn ? ' disabled' : ''}>${c.id === 'table' ? (armed === 'use' ? 'Tap again to call the vote' : 'Flip the table') : c.id === 'skip' ? 'Play it now' : 'Use ' + esc(I.name)}</button>`;
        if (no) btns += `<p class="note pw-why">${esc(myTurn || no.startsWith('Only') || no.startsWith('Your team') ? no : 'You can play it on your own turn.')}</p>`;
        if (P.canPoolSwap(g, C.seat)) btns += `<button class="btn" data-pw="pool">${armed === 'pool' ? 'Tap again: swap blind (final)' : 'Swap blind with the pool'}</button><p class="note">Once, before your team's first move. You get a random card from the ${g.pw.pool.length}-card pool and can't swap back.</p>`;
        if (myTurn) btns += `<button class="btn danger" data-pw="discard">${armed === 'discard' ? 'Tap again to throw it away' : 'Discard this card'}</button>`;
      }
    } else btns = `<p class="note">Your team's card has been ${c.st === 'used' ? 'played' : 'discarded'}. No replacement is dealt.</p>`;
    const others = [];
    for (let k = 0; k < g.teams; k++) if (k !== t) { const o = g.pw.cards[k]; others.push(`<div class="pw-oth"><span class="mini-chip">${C.chipHTML(k)}</span>${o.st === 'held' ? back('mini') : art(o.id, 'mini')}<span>${esc(C.teamName(k))}: ${o.st === 'held' ? 'hidden card' : esc(P.INFO[o.id].name) + (o.st === 'used' ? ' (used)' : ' (discarded)')}</span></div>`); }
    $('#pwSheetBody').innerHTML = `<div class="pw-sh-top">${art(c.id, 'lg float')}<div class="pw-sh-txt"><div class="label">${c.st === 'held' ? "Your team's power card" : 'Spent'}</div><h2>${esc(I.name)}</h2><span class="pw-tag pc-${c.id}">${esc(I.type)} · ${I.turn ? 'uses your turn' : "doesn't use your turn"}</span><ul>${I.rules.map(r => `<li>${esc(r)}</li>`).join('')}</ul></div></div>
      <div class="pw-sh-btns">${btns}</div>
      <div class="pw-others">${others.join('')}</div>
      <div class="row" style="justify-content:space-between"><button class="btn" data-pw="rules">All power cards</button><button class="btn" data-pw="close">Close</button></div>`;
  }
  function onSheetClick(e) {
    if (e.target.id === 'pwSheet') { closeSheet(); return; }
    const seat = e.target.closest('[data-seat]');
    const g = G();
    if (seat) {
      const j = +seat.dataset.seat;
      if (armed !== 'seat' + j) { armed = 'seat' + j; renderSheet(); return; }
      closeSheet(); act(() => P.use(g, C.seat, 'swap', { seat: j })); return;
    }
    const b = e.target.closest('[data-pw]'); if (!b || b.disabled) return;
    const a = b.dataset.pw, t = viewTeam(), id = t >= 0 && g.pw.cards[t].id;
    if (a === 'close') closeSheet();
    else if (a === 'rules') { closeSheet(); openRules(); }
    else if (a === 'back') { sheetSwap = false; armed = null; renderSheet(); }
    else if (a === 'pool') { if (armed !== 'pool') { armed = 'pool'; renderSheet(); return; } closeSheet(); act(() => P.poolSwap(g, C.seat)); }
    else if (a === 'discard') { if (armed !== 'discard') { armed = 'discard'; renderSheet(); return; } closeSheet(); act(() => P.discard(g, C.seat)); }
    else if (a === 'use') {
      if (id === 'explosion' || id === 'color' || id === 'mine') startAim(id);
      else if (id === 'swap') { sheetSwap = true; armed = null; renderSheet(); }
      else if (id === 'table') { if (armed !== 'use') { armed = 'use'; renderSheet(); return; } closeSheet(); act(() => P.use(g, C.seat, 'table')); }
      else { closeSheet(); act(() => P.use(g, C.seat, id)); }
    }
  }

  /* ---------------- history lines ---------------- */
  function logText(e, n) {
    if (e.kind === 'kick') return `${n} left the table · the computer took the seat`;
    if (e.kind !== 'pw') return null;
    const nm = t => esc(C.teamName(t));
    const fell = e.fell ? ` · ${e.fell.length} chip${e.fell.length === 1 ? '' : 's'} fell` : '';
    switch (e.p) {
      case 'explosion': return `${n} set off an <b class="pwk pc-explosion">Explosion</b>${fell}`;
      case 'boom': return `${n} stepped on ${nm(e.owner)}'s <b class="pwk pc-mine">Mine</b>${fell}`;
      case 'color': return `${n} used <b class="pwk pc-color">Color Change</b> on a ${nm(e.victim)} chip${e.seq ? ' and completed a sequence' : ''}`;
      case 'skip': return `${n} played <b class="pwk pc-skip">Turn Skipper</b>`;
      case 'swap': return `${n} used <b class="pwk pc-swap">Team Swap</b> with ${esc(e.bn)}`;
      case 'mine': return `${n} planted a <b class="pwk pc-mine">Mine</b>`;
      case 'flipask': return `${n} called a <b class="pwk pc-table">Table Flip</b> vote`;
      case 'flipno': return 'The table flip was turned down';
      case 'table': return `${n} <b class="pwk pc-table">flipped the table</b>`;
      case 'pool': return `${nm(e.team)} swapped their power card blind`;
      case 'discard': return `${nm(e.team)} discarded their power card`;
    }
    return null;
  }

  /* ---------------- announcements + board effects ---------------- */
  // Called by app.js after a new state lands and the board has been redrawn.
  function effects(prev, ns) {
    if (!ns.pw) return;
    const items = ns.log.filter(e => e.n >= prev.moveNo && e.kind === 'pw').reverse();
    for (const e of items) {
      if (e.p === 'flipno') { C.toast('The table flip was turned down. The game goes on.'); continue; }
      if (e.p === 'pool') { C.toast(`${C.teamName(e.team)} swapped their power card blind.`); C.Sound.card(); continue; }
      if (e.p === 'discard') { C.toast(`${C.teamName(e.team)} threw their power card away.`); continue; }
      // hold the board as it looked before the blast so the effect plays after the announcement
      const held = [];
      if ((e.p === 'explosion' || e.p === 'boom') && e.fell) e.fell.forEach((f, k) => held.push(ghost(f.c, f.t, 'hold' + (e.p === 'boom' && k === 0 ? ' fresh' : ''))));
      if (e.p === 'color') held.push(ghost(e.cell, e.victim, 'hold'));
      queue.push({ e, held, prevTeam: prev.players[e.pi] ? prev.players[e.pi].team : -1 });
    }
    if (queue.length && !playing) run();
  }
  const busyMs = () => (playing || queue.length ? 400 : 0);
  async function run() {
    playing = true;
    while (queue.length) {
      const it = queue.shift();
      try { await announce(it); await boardFx(it); } catch (err) { console.error(err); }
      it.held.forEach(h => h.remove());
    }
    playing = false;
  }
  function annText(e) {
    const g = G(), who = g.players[e.pi], wn = who ? esc(who.name) : 'Someone';
    const tn = t => esc(C.teamName(t));
    const vt = viewTeam();
    switch (e.p) {
      case 'explosion': return { id: 'explosion', t: 'Explosion!', w: `${wn} · ${tn(e.team)}`, s: `${e.fell.length} chip${e.fell.length === 1 ? '' : 's'} blown off the board` };
      case 'boom': return { id: 'mine', t: 'Mine!', w: `${wn} stepped on ${tn(e.owner)}'s mine`, s: `${e.fell.length} chip${e.fell.length === 1 ? '' : 's'} blown away`, cls: 'boom' };
      case 'color': return { id: 'color', t: 'Color Change', w: `${wn} · ${tn(e.team)}`, s: `A ${tn(e.victim)} chip turns ${tn(e.team)}${e.seq ? ' and completes a sequence!' : ''}` };
      case 'skip': {
        const solo = g.players.filter(p => p.team === e.team).length < 2;
        return { id: 'skip', t: 'Turn Skipper', w: `${wn} · ${tn(e.team)}`, s: solo ? `${wn} takes two turns in a row` : `Opponents are skipped. ${tn(e.team)} moves twice in a row` };
      }
      case 'swap': return { id: 'swap', t: 'Team Swap', w: `${esc(e.an)} ⇄ ${esc(e.bn)}`, s: `${esc(e.an)} joins ${tn(e.tb)}. ${esc(e.bn)} joins ${tn(e.ta)}.`, swap: e };
      case 'mine': return { id: 'mine', t: 'Mine planted', w: `${wn} · ${tn(e.team)}`, s: e.team === vt ? 'Only your team knows where. It is marked on your board.' : 'Somewhere on the board. Step carefully.' };
      case 'flipask': return { id: 'table', t: 'Table flip incoming', w: `${wn} · ${tn(e.team)}`, s: `${tn(e.team)} is voting. Everyone on the team must accept.` };
      case 'table': return { id: 'table', t: 'Table flipped!', w: `${wn} · ${tn(e.team)}`, s: 'The game is over. Nobody wins.', cls: 'flip' };
    }
    return null;
  }
  function announce(it) {
    const a = annText(it.e); if (!a) return Promise.resolve();
    const el = $('#pwAnn');
    el.className = `pw-ann pc-${a.id}${a.cls ? ' ' + a.cls : ''}`;
    $('#pwAnnCard').innerHTML = a.swap
      ? `<div class="pw-swapfx"><span class="sa">${C.chipHTML(a.swap.ta)}</span>${art('swap', 'lg')}<span class="sb">${C.chipHTML(a.swap.tb)}</span></div>`
      : art(a.id, 'lg');
    $('#pwAnnWho').innerHTML = a.w; $('#pwAnnTitle').textContent = a.t; $('#pwAnnSub').innerHTML = a.s;
    el.hidden = false;
    void el.offsetWidth; el.classList.add('in');
    SFX.ann();
    const sfx = { explosion: 0, swap: 'swap', skip: 'skip', mine: it.e.p === 'boom' ? 0 : 'mine', color: 0, table: 0 }[a.id];
    if (sfx) setTimeout(() => SFX[sfx](), 250);
    return new Promise(res => {
      const done = () => { clearTimeout(tm); skipAnn = null; el.classList.remove('in'); el.classList.add('out'); setTimeout(() => { el.hidden = true; el.classList.remove('out'); res(); }, reduced ? 10 : 260); };
      const tm = setTimeout(done, reduced ? 1100 : it.e.p === 'flipask' ? 1600 : 1750);
      skipAnn = done;
    });
  }
  async function boardFx(it) {
    const e = it.e, frame = $('#frame');
    if (!frame || $('#game').hidden) return;
    if (e.p === 'explosion' || e.p === 'boom') {
      const big = e.p === 'boom';
      const fresh = it.held.find(h => h.classList.contains('fresh'));
      if (fresh) { fresh.classList.add('drop'); await sleep(reduced ? 0 : 380); }
      const b = cellBox(e.cell);
      const wave = document.createElement('div');
      wave.className = 'pw-wave' + (big ? ' big' : '');
      wave.style.cssText = `left:${b.x + b.w / 2}px;top:${b.y + b.h / 2}px`;
      layer().appendChild(wave);
      const [cx, cy] = cellCenter(e.cell);
      it.held.forEach(h => {
        const hx = h.offsetLeft + h.offsetWidth / 2 - (b.x + b.w / 2), hy = h.offsetTop + h.offsetHeight / 2 - (b.y + b.h / 2);
        const ang = (hx || hy) ? Math.atan2(hy, hx) : Math.random() * Math.PI * 2, dist = (big ? 3.2 : 2.4) * b.w + Math.random() * b.w;
        h.style.setProperty('--dx', Math.cos(ang) * dist + 'px'); h.style.setProperty('--dy', (Math.sin(ang) * dist - b.w) + 'px'); h.style.setProperty('--rot', (Math.random() * 540 - 270) + 'deg');
        h.classList.remove('hold'); h.classList.add('blown');
      });
      if (!reduced) { frame.classList.remove('pw-shake', 'big'); void frame.offsetWidth; frame.classList.add('pw-shake'); if (big) frame.classList.add('big'); }
      SFX.boom(big);
      C.FX.burst(cx, cy, ['#ffd166', '#ff8c1a', '#ff3d2e', '#fff3c4', ...e.fell.map(f => teamColor(f.t))], big ? 70 : 46);
      if (big) flash('#ff2a2a');
      else flash('#ffb347');
      await sleep(reduced ? 50 : 750);
      wave.remove(); frame.classList.remove('pw-shake', 'big');
    } else if (e.p === 'color') {
      const h = it.held[0];
      const real = C.cells()[e.cell].querySelector('.slot .chip');
      if (real) { real.classList.remove('pw-flipin'); void real.offsetWidth; real.classList.add('pw-flipin'); }
      if (h) h.classList.add('pw-flipout');
      SFX.color();
      const [cx, cy] = cellCenter(e.cell);
      C.FX.burst(cx, cy, [teamColor(e.team), '#ffffff', '#d58bff', '#ff7ac8'], 30);
      await sleep(reduced ? 50 : 650);
    } else if (e.p === 'table') {
      SFX.flip();
      if (!reduced) { frame.classList.add('pw-tableflip'); }
      C.FX.rain([0, 1, 2].slice(0, G().teams).map(teamColor).concat(['#f2c14e', '#ffffff']), 1600);
      await sleep(reduced ? 50 : 1500);
      frame.classList.remove('pw-tableflip');
    } else if (e.p === 'swap') {
      const tb = $('#teams'); tb.classList.remove('pw-flash'); void tb.offsetWidth; tb.classList.add('pw-flash');
      await sleep(reduced ? 50 : 500);
    } else if (e.p === 'skip') {
      const st = $('#status'); st.classList.remove('pw-flash'); void st.offsetWidth; st.classList.add('pw-flash');
      await sleep(reduced ? 50 : 300);
    } else if (e.p === 'mine') {
      const mk = layer().querySelector('.pw-mk'); if (mk) { mk.classList.remove('arm'); void mk.offsetWidth; mk.classList.add('arm'); }
      const bd = frame.querySelector('.pw-minebadge'); if (bd) { bd.classList.remove('arm'); void bd.offsetWidth; bd.classList.add('arm'); }
      await sleep(reduced ? 50 : 400);
    }
  }
  function flash(color) {
    if (reduced) return;
    const f = document.createElement('div'); f.className = 'pw-flashscreen'; f.style.background = `radial-gradient(circle, ${color}66, transparent 70%)`;
    document.body.appendChild(f); setTimeout(() => f.remove(), 600);
  }

  /* ---------------- state changes: votes, penalties ---------------- */
  function onState(prev, ns, fresh) {
    if (fresh || !prev || prev.moveNo !== ns.moveNo) { aim = null; if (!$('#pwSheet').hidden) { if (ns.pw && viewTeam() >= 0 && ns.winner === -1) renderSheet(); else closeSheet(); } }
    if (fresh) { queue.length = 0; layer().innerHTML = ''; }
    syncVote(ns);
    if (ns.pw && ns.winner === -4) applyPenalty(ns);
  }
  function syncVote(ns) {
    const f = ns && ns.pw && ns.pw.flip;
    if (!f || ns.winner !== -1) { closeVote(); return; }
    if (!vote || vote.id !== f.id) { closeVote(); vote = { id: f.id, start: Date.now(), timers: [] }; armVoteTimers(f); }
    renderVote(f);
  }
  function armVoteTimers(f) {
    const v = vote, me = C.seat, mode = C.mode;
    const later = (ms, fn) => v.timers.push(setTimeout(() => { if (vote === v && G() && G().pw && G().pw.flip && G().pw.flip.id === v.id) fn(); }, ms));
    if (mode === 'online') {
      if (f.need.includes(me)) later(15000, () => { const ff = G().pw.flip; if (!ff.votes[me]) C.push(P.flipVote(G(), me, false), true); });
      later(f.by === me ? 16500 : 21000, () => C.push(P.flipExpire(G()), true));
    } else later(15000, () => C.push(P.flipExpire(G())));
    v.tick = setInterval(() => { const n = $('#pwVoteBody .pw-count b'); if (n) n.textContent = Math.max(0, Math.ceil((v.start + 15000 - Date.now()) / 1000)); }, 250);
  }
  function closeVote() { if (vote) { vote.timers.forEach(clearTimeout); clearInterval(vote.tick); } vote = null; $('#pwVote').hidden = true; }
  function renderVote(f) {
    const g = G(), me = C.seat, mode = C.mode;
    const left = Math.max(0, Math.ceil((vote.start + 15000 - Date.now()) / 1000));
    const ring = `<div class="pw-count"><svg viewBox="0 0 64 64" aria-hidden="true"><circle cx="32" cy="32" r="28" class="bg"/><circle cx="32" cy="32" r="28" class="fg" pathLength="100" style="animation-duration:${Math.max(0, vote.start + 15000 - Date.now())}ms"/></svg><b>${left}</b></div>`;
    const initiator = esc(g.players[f.by].name);
    let body = '';
    if (mode === 'local') {
      body = `<h2>Table flip incoming</h2><p>${initiator} wants to flip the table. Everyone on ${esc(C.teamName(f.team))} must accept within 15 seconds. If you accept, the game ends with no winner and each of you gets a 7-day Table Flipper timer.</p>
        <ul class="pw-voters">${f.need.map(k => `<li><b>${esc(g.players[k].name)}</b>${f.votes[k] ? '<span class="ok">Accepted</span>' : `<span class="row"><button class="btn primary" data-v="yes" data-k="${k}">Accept</button><button class="btn" data-v="no" data-k="${k}">Decline</button></span>`}</li>`).join('')}</ul>`;
    } else if (f.need.includes(me) && !f.votes[me]) {
      body = `<h2>Table flip incoming, accept?</h2><p>${initiator} wants to flip the table. The game ends with no winner, and everyone on your team gets a 7-day Table Flipper timer. No answer counts as no.</p>
        <div class="row" style="justify-content:center"><button class="btn primary big" data-v="yes" data-k="${me}">Accept</button><button class="btn big" data-v="no" data-k="${me}">Decline</button></div>`;
    } else if (f.team === (g.players[me] || {}).team) {
      body = `<h2>Waiting for your team</h2><p>${f.by === me ? 'You called' : initiator + ' called'} a table flip. Waiting for ${f.need.filter(k => !f.votes[k]).map(k => esc(g.players[k].name)).join(', ')} to answer.</p>`;
    } else { $('#pwVote').hidden = true; return; }
    $('#pwVoteBody').innerHTML = `${art('table', 'md wob')}${ring}${body}`;
    $('#pwVote').hidden = false;
  }
  function onVoteClick(e) {
    const b = e.target.closest('[data-v]'); if (!b) return;
    const k = +b.dataset.k, yes = b.dataset.v === 'yes';
    if (C.mode === 'online' && k !== C.seat) return;
    let ns; try { ns = P.flipVote(G(), k, yes); } catch (err) { return; }
    b.disabled = true;
    C.push(ns);
  }
  // Everyone on the flipping team gets a 7-day timer.
  function applyPenalty(ns) {
    const entry = ns.log.find(e => e.kind === 'pw' && e.p === 'table'); if (!entry) return;
    const key = 'ff-flipdone-' + ns.gid;
    try { if (localStorage.getItem(key)) return; } catch (e) {}
    const until = Date.now() + P.FLIP_DAYS * 864e5;
    const mark = k => { try { localStorage.setItem(k, String(until)); } catch (e) {} };
    let hit = false;
    if (C.mode === 'local') ns.players.forEach(p => { if (p.team === entry.team) { mark('ff-flip-name-' + p.name.toLowerCase()); hit = true; } });
    else {
      const myId = C.mode === 'online' ? C.myId() : 's0';
      if (entry.ids.includes(myId)) {
        hit = true;
        const uid = C.myId();
        mark('ff-flip-' + (uid || 'guest'));
        const sb = C.sb();
        if (sb && uid) sb.rpc('apply_table_flip').then(({ error }) => { if (error) console.warn('Table Flipper timer saved on this device only:', error.message); });
      }
    }
    try { localStorage.setItem(key, '1'); } catch (e) {}
    if (hit && C.mode !== 'local') setTimeout(() => C.toast('Table Flipper timer: you can\'t be dealt Table Flipper for 7 days.'), 2600);
  }
  // Timer for one player, in ms since epoch (0 if none). Uses the account value when we have it.
  function localTimer(key) { try { return +(localStorage.getItem(key) || 0); } catch (e) { return 0; } }
  const myTimer = (uid, server) => Math.max(server ? Date.parse(server) || 0 : 0, localTimer('ff-flip-' + (uid || 'guest')));
  const nameTimer = name => localTimer('ff-flip-name-' + String(name || '').toLowerCase());
  function left(until) {
    const ms = until - Date.now(); if (ms <= 0) return '';
    const d = Math.floor(ms / 864e5), h = Math.floor((ms % 864e5) / 36e5), m = Math.max(1, Math.floor((ms % 36e5) / 6e4));
    return d ? `${d}d ${h}h` : h ? `${h}h ${m}m` : `${m}m`;
  }
  function timerHTML(until, self) {
    const l = left(until); if (!l) return '';
    return `<div class="pw-timer" data-until="${until}">${art('table', 'mini')}<div><b>Table Flipper timer · <span class="tl">${l}</span> left</b><span class="note">${self ? 'You' : 'This player'} can't be dealt Table Flipper until it runs out.</span></div></div>`;
  }
  function tickTimers() { document.querySelectorAll('.pw-timer[data-until]').forEach(el => { const l = left(+el.dataset.until); if (!l) el.remove(); else el.querySelector('.tl').textContent = l; }); }

  /* ---------------- end of game ---------------- */
  function revealHTML() {
    const g = G(); if (!g || !g.pw) return '';
    const rows = g.pw.cards.map((c, t) => `<div class="pw-rv ${c.st}"><span class="mini-chip">${C.chipHTML(t)}</span>${art(c.id, 'mini')}<span><b>${esc(C.teamName(t))}</b> · ${esc(P.INFO[c.id].name)} <em>${c.st === 'held' ? 'never played' : c.st === 'used' ? 'played' : 'discarded'}</em></span></div>`).join('');
    return `<div class="pw-reveal"><div class="label">Power cards revealed</div>${rows}<div class="pw-pool"><span class="note">Left in the pool:</span>${g.pw.pool.map(id => art(id, 'mini')).join('')}</div></div>`;
  }

  return {
    init, art, back, fanHTML, openRules,
    handCard, openSheet, teamBadge, statusPills, paintBoard, active, cancel, onCell, actions,
    logText, effects, onState, busyMs, revealHTML, timerHTML, myTimer, nameTimer, left
  };
})();
