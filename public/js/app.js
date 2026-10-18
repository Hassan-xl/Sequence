(() => {
const $ = s => document.querySelector(s);
const E = Engine;
const store = {
  get(k, d) { try { const v = localStorage.getItem('ff-' + k); return v == null ? d : JSON.parse(v); } catch (e) { return d; } },
  set(k, v) { try { if (v == null) localStorage.removeItem('ff-' + k); else localStorage.setItem('ff-' + k, JSON.stringify(v)); } catch (e) {} }
};
const esc = s => String(s == null ? '' : s).replace(/[&<>"']/g, c => ({ '&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;', "'": '&#39;' }[c]));
const sleep = ms => new Promise(r => setTimeout(r, ms));
const shuffle = a => { for (let i = a.length - 1; i > 0; i--) { const j = Math.floor(Math.random() * (i + 1)); [a[i], a[j]] = [a[j], a[i]]; } return a; };
const reduced = matchMedia('(prefers-reduced-motion: reduce)').matches;

const SKINS = {
  iron: { name: 'Iron Realm', teams: ['House of Embers', 'House of Frost', 'House of Gold'], cpu: ['Lord Varric', 'Lady Sera', 'Bram the Smith', 'Captain Rhoswen', 'Brother Edric'], court: { K: 'bladecrown', Q: 'flame' }, free: 'snow', chip: 'sword', log: 'The ravens', tag: 'Iron · Frost · Five in a row' },
  pirate: { name: 'Pirate Cove', teams: ['Crimson Corsairs', 'Blue Buccaneers', 'Emerald Privateers'], cpu: ['Salty Meg', 'Redbeard Jo', 'Barnacle Bram', 'Gunner Nell', 'Old Quill'], court: { K: 'tricorn', Q: 'wheel' }, free: 'compass', chip: 'skull', log: "Captain's log", tag: 'Two decks · One board · Five in a row' },
  casino: { name: 'Royal Casino', teams: ['Ruby House', 'Sapphire House', 'Emerald House'], cpu: ['The Dealer', 'Lady Luck', 'High Roller', 'Pit Boss', 'Ace Delacroix'], court: { K: 'crown', Q: 'tiara' }, free: 'star5', chip: 'star5', log: 'Table history', tag: 'High stakes · Low lights · Five in a row' },
  egypt: { name: 'Ancient Egypt', teams: ['House of Ra', 'House of the Nile', 'House of Osiris'], cpu: ['Scribe Ahmose', 'Priestess Nefer', 'Vizier Ptahmes', 'Merit the Wise', 'Kha the Mason'], court: { K: 'ankh', Q: 'horus' }, free: 'sun', chip: 'ankh', log: 'The scrolls', tag: 'Lapis · Gold · Five in a row' },
  medieval: { name: 'Medieval Kingdom', teams: ['Order of the Rose', 'Azure Order', 'Order of the Oak'], cpu: ['Sir Aldric', 'Lady Maude', 'Brother Tomas', 'Dame Isolde', 'Squire Wat'], court: { K: 'crown', Q: 'shield' }, free: 'castle', chip: 'crown', log: 'The chronicle', tag: 'Banners · Seals · Five in a row' }
};
let skin = store.get('skin', 'iron'); if (!SKINS[skin]) skin = 'iron';
document.documentElement.dataset.skin = skin;

/* ---------------- SVG sprite ---------------- */
function starPath(n, r1, r2, rot = -90) {
  let d = '';
  for (let i = 0; i < n * 2; i++) { const r = i % 2 ? r2 : r1; const a = (rot + i * 180 / n) * Math.PI / 180; d += (i ? 'L' : 'M') + (50 + r * Math.cos(a)).toFixed(1) + ' ' + (50 + r * Math.sin(a)).toFixed(1); }
  return d + 'Z';
}
const sym = (id, inner) => `<symbol id="${id}" viewBox="0 0 100 100">${inner}</symbol>`;
let wheel = '<circle cx="50" cy="50" r="27" fill="none" stroke="currentColor" stroke-width="7"/><circle cx="50" cy="50" r="9"/>';
for (let k = 0; k < 8; k++) wheel += `<rect x="47.5" y="7" width="5" height="43" rx="2" transform="rotate(${k * 45} 50 50)"/><circle cx="50" cy="6" r="5" transform="rotate(${k * 45} 50 50)"/>`;
let snow = '<circle cx="50" cy="50" r="9"/>';
for (let k = 0; k < 6; k++) snow += `<g transform="rotate(${k * 60} 50 50)"><rect x="46.5" y="5" width="7" height="45" rx="3"/><path d="M50 21 L37 11 L41.5 6.5 L50 14 L58.5 6.5 L63 11Z"/></g>`;
let blades = '<path d="M8 72 H92 L87 90 H13Z"/>';
[[13, 38], [26, 24], [38, 14], [50, 4], [62, 14], [74, 24], [87, 38]].forEach(([x, top]) => { blades += `<path d="M${x - 4.5} 73 L${x} ${top} L${x + 4.5} 73Z"/>`; });
const SWORD = '<path d="M50 3 L57 13 V61 H43 V13Z"/><path d="M19 61 H81 Q81 70 72 70 H28 Q19 70 19 61Z"/><rect x="45" y="70" width="10" height="17" rx="2"/><circle cx="50" cy="92" r="6.5"/>';
const CROWN = '<path d="M13 74 L8 32 L30 50 L50 20 L70 50 L92 32 L87 74Z"/><rect x="11" y="78" width="78" height="11" rx="3"/><circle cx="8" cy="28" r="6"/><circle cx="50" cy="15" r="7"/><circle cx="92" cy="28" r="6"/>';
let sun = '<circle cx="50" cy="50" r="20"/>';
for (let k = 0; k < 12; k++) sun += `<path d="M46 24 L50 6 L54 24Z" transform="rotate(${k * 30} 50 50)"/>`;
$('#sprite').innerHTML = [
  sym('su-S', '<path d="M50 4 C38 22 8 38 8 60 C8 74 19 82 31 82 C39 82 45 78 48 72 C47 82 43 90 35 96 L65 96 C57 90 53 82 52 72 C55 78 61 82 69 82 C81 82 92 74 92 60 C92 38 62 22 50 4Z"/>'),
  sym('su-H', '<path d="M50 92 C22 68 5 50 5 30 C5 15 16 5 30 5 C40 5 47 11 50 20 C53 11 60 5 70 5 C84 5 95 15 95 30 C95 50 78 68 50 92Z"/>'),
  sym('su-D', '<path d="M50 3 C60 20 74 36 90 50 C74 64 60 80 50 97 C40 80 26 64 10 50 C26 36 40 20 50 3Z"/>'),
  sym('su-C', '<circle cx="50" cy="27" r="20"/><circle cx="26" cy="57" r="20"/><circle cx="74" cy="57" r="20"/><rect x="40" y="38" width="20" height="24"/><path d="M47 55 C47 76 42 88 34 96 L66 96 C58 88 53 76 53 55Z"/>'),
  sym('em-crown', CROWN),
  sym('em-sword', SWORD),
  sym('em-flame', '<path d="M50 3 C56 20 78 32 78 58 C78 80 64 96 50 96 C36 96 22 82 22 61 C22 47 30 38 37 29 C37 41 41 49 47 52 C43 36 44 18 50 3Z"/>'),
  sym('em-snow', snow),
  sym('em-bladecrown', blades),
  sym('rk-bastard', '<path fill-rule="evenodd" d="M18 8 H82 V44 Q82 74 50 94 Q18 74 18 44Z M70 15 L24 61 L24 72 L79 17 L79 15Z"/>'),
  sym('rk-civilian', '<rect x="16" y="12" width="68" height="25" rx="5"/><rect x="43" y="35" width="14" height="58" rx="6"/>'),
  sym('rk-knight', SWORD),
  sym('rk-hand', '<rect x="25" y="44" width="50" height="48" rx="16"/><rect x="26" y="16" width="11" height="42" rx="5.5"/><rect x="39" y="7" width="11" height="47" rx="5.5"/><rect x="52" y="10" width="11" height="44" rx="5.5"/><rect x="64" y="20" width="10" height="36" rx="5"/><rect x="70" y="50" width="13" height="30" rx="6.5" transform="rotate(-38 76 65)"/>'),
  sym('rk-king', CROWN),
  sym('em-tiara', '<path d="M8 82 Q50 70 92 82 L86 56 Q70 64 62 50 Q56 40 50 26 Q44 40 38 50 Q30 64 14 56Z"/><circle cx="50" cy="17" r="7"/><circle cx="12" cy="50" r="5"/><circle cx="88" cy="50" r="5"/>'),
  sym('em-tricorn', '<path d="M3 66 Q18 40 50 34 Q82 40 97 66 Q74 55 50 70 Q26 55 3 66Z"/><path fill-rule="evenodd" d="M25 52 Q27 18 50 16 Q73 18 75 52 Q62 45 50 47 Q38 45 25 52Z M43 33 a7 7 0 1 0 14 0 a7 7 0 1 0 -14 0Z"/>'),
  sym('em-wheel', wheel),
  sym('em-ankh', '<ellipse cx="50" cy="27" rx="14" ry="18" fill="none" stroke="currentColor" stroke-width="9"/><rect x="45" y="42" width="10" height="52" rx="2"/><rect x="20" y="44" width="60" height="10" rx="2"/>'),
  sym('em-horus', '<path d="M8 46 Q50 14 92 46 Q50 72 8 46Z" fill="none" stroke="currentColor" stroke-width="6"/><circle cx="50" cy="44" r="11"/><path d="M10 26 Q50 2 90 24" fill="none" stroke="currentColor" stroke-width="6" stroke-linecap="round"/><path d="M40 62 L34 92" stroke="currentColor" stroke-width="6" stroke-linecap="round"/><path d="M58 62 Q64 88 80 86 Q92 82 84 70" fill="none" stroke="currentColor" stroke-width="5" stroke-linecap="round"/>'),
  sym('em-shield', '<path fill-rule="evenodd" d="M18 8 H82 V44 Q82 74 50 94 Q18 74 18 44Z M26 60 L50 40 L74 60 L74 70 L50 50 L26 70Z"/>'),
  sym('em-castle', '<path d="M16 92 V38 H28 V26 H38 V38 H45 V26 H55 V38 H62 V26 H72 V38 H84 V92 H60 V72 Q50 58 40 72 V92Z"/>'),
  sym('em-compass', `<circle cx="50" cy="50" r="40" fill="none" stroke="currentColor" stroke-width="3"/><path d="${starPath(4, 30, 8, -45)}" opacity=".6"/><path d="${starPath(4, 48, 10)}"/><circle cx="50" cy="50" r="5" style="fill:var(--free)"/>`),
  sym('em-sun', sun),
  sym('em-star5', `<path d="${starPath(5, 47, 20)}"/>`),
  sym('em-skull', '<path fill-rule="evenodd" d="M50 10 C27 10 14 27 14 46 C14 58 20 66 29 70 L29 84 H71 L71 70 C80 66 86 58 86 46 C86 27 73 10 50 10Z M26 46 a10 10 0 1 0 20 0 a10 10 0 1 0 -20 0Z M54 46 a10 10 0 1 0 20 0 a10 10 0 1 0 -20 0Z M50 58 L44 67 H56Z M38 76 h4 v8 h-4Z M48 76 h4 v8 h-4Z M58 76 h4 v8 h-4Z"/>'),
  sym('em-eye', '<path d="M3 50 Q50 6 97 50 Q50 94 3 50Z"/><circle cx="50" cy="50" r="19" style="fill:var(--card)"/><circle cx="50" cy="50" r="9"/>'),
  sym('em-patch', '<path d="M-6 18 L106 74" stroke="currentColor" stroke-width="6"/><ellipse cx="50" cy="50" rx="34" ry="27"/>')
].join('');

/* ---------------- card faces ---------------- */
const PIPS = {
  '2': [[.5, 0], [.5, 1]], '3': [[.5, 0], [.5, .5], [.5, 1]],
  '4': [[0, 0], [1, 0], [0, 1], [1, 1]], '5': [[0, 0], [1, 0], [.5, .5], [0, 1], [1, 1]],
  '6': [[0, 0], [1, 0], [0, .5], [1, .5], [0, 1], [1, 1]],
  '7': [[0, 0], [1, 0], [.5, .25], [0, .5], [1, .5], [0, 1], [1, 1]],
  '8': [[0, 0], [1, 0], [.5, .25], [0, .5], [1, .5], [.5, .75], [0, 1], [1, 1]],
  '9': [[0, 0], [1, 0], [0, 1 / 3], [1, 1 / 3], [.5, .5], [0, 2 / 3], [1, 2 / 3], [0, 1], [1, 1]],
  '10': [[0, 0], [1, 0], [.5, 1 / 6], [0, 1 / 3], [1, 1 / 3], [0, 2 / 3], [1, 2 / 3], [.5, 5 / 6], [0, 1], [1, 1]]
};
const RN = { A: 'Ace', J: 'Jack', Q: 'Queen', K: 'King' };
const SN = { S: 'spades', H: 'hearts', D: 'diamonds', C: 'clubs' };
const SCH = { S: '♠︎', H: '♥︎', D: '♦︎', C: '♣︎' };
const suitSvg = (s, cls = '') => `<svg class="${cls}" viewBox="0 0 100 100" aria-hidden="true"><use href="#su-${s}"/></svg>`;
const pip = (x, y, s, cls) => `<svg class="pip ${cls}" style="left:${x * 100}%;top:${y * 100}%" viewBox="0 0 100 100"><use href="#su-${s}"/></svg>`;
const cardName = c => c === 'XX' ? 'Free corner' : `${RN[E.rankOf(c)] || E.rankOf(c)} of ${SN[E.suitOf(c)]}`;
function cardHTML(code, k = skin) {
  const S = SKINS[k];
  if (code === 'XX') return `<div class="cf k-${k} free"><svg class="free-emb" viewBox="0 0 100 100"><use href="#em-${S.free}"/></svg><span class="free-lbl">FREE</span></div>`;
  const r = E.rankOf(code), s = E.suitOf(code), red = s === 'H' || s === 'D';
  let face = '';
  if (r === 'A') face = `<div class="pips">${pip(.5, .5, s, 'ace')}</div>`;
  else if (PIPS[r]) face = `<div class="pips">${PIPS[r].map(([x, y]) => pip(x, y, s, y > .5 ? 'flip' : '')).join('')}</div>`;
  else if (r === 'J') {
    const two = E.isTwoEyed(code);
    face = `<div class="court"><svg class="jack-eyes court-emb" viewBox="0 0 100 50"><use href="#em-eye" x="0" y="0" width="48" height="50"/><use href="#em-${two ? 'eye' : 'patch'}" x="52" y="0" width="48" height="50"/></svg><span class="jl">${two ? 'WILD' : 'REMOVE'}</span></div>`;
  } else face = `<div class="court"><svg class="court-emb" viewBox="0 0 100 100"><use href="#em-${S.court[r]}"/></svg>${suitSvg(s, 'court-suit')}</div>`;
  return `<div class="cf k-${k} ${red ? 'red' : 'blk'} r-${r}"><div class="idx tl"><b>${r}</b>${suitSvg(s)}</div><div class="idx br"><b>${r}</b>${suitSvg(s)}</div>${face}${suitSvg(s, 'mid')}</div>`;
}
const chipHTML = (t, locked, extra = '', k = skin) => `<div class="chip k-${k} t${t}${locked ? ' locked' : ''}${extra}"><svg viewBox="0 0 100 100"><use href="#em-${SKINS[k].chip}"/></svg></div>`;
const teamName = t => SKINS[skin].teams[t] || 'Team ' + (t + 1);
const tagHTML = c => `<span class="cardtag ${E.suitOf(c) === 'H' || E.suitOf(c) === 'D' ? 'red' : ''}">${E.rankOf(c)}${SCH[E.suitOf(c)]}</span>`;

/* ---------------- sound ---------------- */
const Sound = {
  ctx: null, on: store.get('sound', true),
  ac() { if (!this.on) return null; try { if (!this.ctx) this.ctx = new (window.AudioContext || window.webkitAudioContext)(); if (this.ctx.state === 'suspended') this.ctx.resume(); return this.ctx; } catch (e) { return null; } },
  tone(f, t0, dur, type = 'sine', vol = .2, f2) {
    const c = this.ac(); if (!c) return;
    const o = c.createOscillator(), g = c.createGain(), t = c.currentTime + t0;
    o.type = type; o.frequency.setValueAtTime(f, t); if (f2) o.frequency.exponentialRampToValueAtTime(f2, t + dur);
    g.gain.setValueAtTime(.0001, t); g.gain.exponentialRampToValueAtTime(vol, t + .01); g.gain.exponentialRampToValueAtTime(.0001, t + dur);
    o.connect(g).connect(c.destination); o.start(t); o.stop(t + dur + .05);
  },
  noise(t0, dur, freq, vol = .25) {
    const c = this.ac(); if (!c) return;
    const len = Math.floor(c.sampleRate * dur), b = c.createBuffer(1, len, c.sampleRate), d = b.getChannelData(0);
    for (let i = 0; i < len; i++) d[i] = (Math.random() * 2 - 1) * Math.pow(1 - i / len, 3);
    const src = c.createBufferSource(); src.buffer = b;
    const f = c.createBiquadFilter(); f.type = 'bandpass'; f.frequency.value = freq; f.Q.value = 1.2;
    const g = c.createGain(); g.gain.value = vol;
    src.connect(f).connect(g).connect(c.destination); src.start(c.currentTime + t0);
  },
  chip() { this.noise(0, .07, 2000, .55); this.tone(230, 0, .14, 'triangle', .2, 130); },
  card() { this.noise(0, .07, 3800, .3); },
  tick() { this.tone(900, 0, .05, 'sine', .05); },
  remove() { this.tone(540, 0, .28, 'sine', .15, 170); this.noise(0, .1, 900, .3); },
  seq() { [523, 659, 784, 1047].forEach((f, i) => this.tone(f, i * .09, .38, 'triangle', .15)); },
  win() { [392, 523, 659, 784, 659, 784, 1047].forEach((f, i) => this.tone(f, i * .12, .5, 'triangle', .15)); }
};

/* ---------------- particles ---------------- */
const FX = {
  cv: $('#fx'), parts: [], running: false, spawner: null,
  colors() { const cs = getComputedStyle(document.documentElement); return ['--t0', '--t1', '--t2', '--accent', '--accent-hi'].map(v => cs.getPropertyValue(v).trim()); },
  add(x, y, c, power = 1) { this.parts.push({ x, y, vx: (Math.random() - .5) * 9 * power, vy: (-Math.random() * 7 - 2) * power, life: 70 + Math.random() * 40, c, s: 3 + Math.random() * 4, r: Math.random() * 6, vr: (Math.random() - .5) * .35, coin: Math.random() < .55 }); },
  burst(x, y, colors, n = 50) { if (reduced) return; for (let i = 0; i < n; i++) this.add(x, y, colors[i % colors.length]); this.run(); },
  rain(colors, ms = 2600) {
    if (reduced) return;
    const end = performance.now() + ms;
    this.spawner = () => { if (performance.now() > end) { this.spawner = null; return; } for (let i = 0; i < 3; i++) { const p = { x: Math.random() * innerWidth, y: -10 }; this.add(p.x, p.y, colors[Math.floor(Math.random() * colors.length)], .5); this.parts[this.parts.length - 1].vy = Math.random() * 2 + 1; } };
    this.run();
  },
  run() {
    if (this.running) return; this.running = true;
    const cv = this.cv, ctx = cv.getContext('2d'), dpr = devicePixelRatio || 1;
    cv.width = innerWidth * dpr; cv.height = innerHeight * dpr;
    const step = () => {
      ctx.setTransform(dpr, 0, 0, dpr, 0, 0); ctx.clearRect(0, 0, innerWidth, innerHeight);
      if (this.spawner) this.spawner();
      this.parts = this.parts.filter(p => p.life > 0 && p.y < innerHeight + 30);
      for (const p of this.parts) {
        p.vy += .2; p.x += p.vx; p.y += p.vy; p.vx *= .99; p.r += p.vr; p.life--;
        ctx.save(); ctx.globalAlpha = Math.min(1, p.life / 30); ctx.translate(p.x, p.y); ctx.rotate(p.r); ctx.fillStyle = p.c;
        if (p.coin) { ctx.beginPath(); ctx.ellipse(0, 0, p.s * 1.3, Math.max(.5, p.s * 1.3 * Math.abs(Math.cos(p.r * 2))), 0, 0, 7); ctx.fill(); }
        else ctx.fillRect(-p.s, -p.s / 3, p.s * 2, p.s / 1.5);
        ctx.restore();
      }
      if (this.parts.length || this.spawner) requestAnimationFrame(step); else { this.running = false; ctx.clearRect(0, 0, innerWidth, innerHeight); }
    };
    requestAnimationFrame(step);
  }
};

/* ---------------- state ---------------- */
let mode = null;          // 'cpu' | 'local' | 'online'
let cfg = null;           // how to restart
let G = null;             // engine state
let viewSeat = 0;         // whose hand this screen shows
let handVisible = true;
let sel = null;           // {hi, cell}
let busy = false;
let cpuTimer = null;
let victoryFor = null;
let linesDrawn = { gid: null, n: 0 };
let prevHandKey = '';
const grid = $('#grid');
let cells = [], renderedKey = [];

const phone = () => !matchMedia('(min-width: 960px)').matches;
const myTeam = () => G.players[viewSeat] ? G.players[viewSeat].team : -1;
const myHand = () => (G && G.hands[viewSeat]) || [];
function canActNow() {
  if (!G || G.winner !== -1 || busy || G.turn !== viewSeat || !handVisible) return false;
  return !G.players[G.turn].cpu;
}

/* ---------------- board ---------------- */
function buildBoard() {
  grid.innerHTML = E.LAYOUT.map((c, i) => `<div class="cell${c === 'XX' ? ' free' : ''}" data-i="${i}" role="gridcell" aria-label="${cardName(c)}">${cardHTML(c)}<div class="slot"></div></div>`).join('') + '<svg class="lines" id="lines"></svg>';
  cells = [...grid.querySelectorAll('.cell')];
  renderedKey = Array(100).fill('');
  linesDrawn = { gid: null, n: 0 };
  sizeBoard();
}
function sizeBoard() {
  const area = $('#boardArea'), frame = $('#frame');
  if (!area || $('#game').hidden) return;
  const aw = area.clientWidth;
  let cw;
  if (!phone()) cw = Math.floor(Math.min(aw / 11.5, (innerHeight - area.getBoundingClientRect().top - 24) / 14.7));
  else {
    // phones: fill the width, but shrink a little if that keeps the whole board above the card dock
    const dock = document.querySelector('.hand-box').offsetHeight || 160;
    const room = innerHeight - (area.getBoundingClientRect().top + scrollY) - dock - 12;
    const byW = aw / 11.5, byH = room / 14;
    cw = Math.floor(byH >= byW * 0.74 ? Math.min(byW, byH) : byW);
  }
  cw = Math.max(24, cw);
  document.documentElement.style.setProperty('--cell', cw + 'px');
  grid.classList.toggle('compact', cw < 50);
  frame.classList.toggle('small', cw < 42);
  drawLines(false);
}
function drawLines(animate) {
  const svg = $('#lines'); if (!svg || !G) { if (svg) svg.innerHTML = ''; return; }
  const W = grid.clientWidth, H = grid.clientHeight;
  svg.setAttribute('viewBox', `0 0 ${W} ${H}`);
  const freshN = animate && G.last ? G.last.n : -1;
  const center = i => { const el = cells[i]; return [el.offsetLeft + el.offsetWidth / 2, el.offsetTop + el.offsetHeight / 2]; };
  svg.innerHTML = G.lines.map(l => {
    const [x1, y1] = center(l.cells[0]), [x2, y2] = center(l.cells[4]);
    return `<line class="${l.m != null && l.m === freshN ? 'new' : ''}" x1="${x1}" y1="${y1}" x2="${x2}" y2="${y2}" style="stroke:var(--t${l.t})"/>`;
  }).join('');
}
function renderBoard(newMove) {
  if (!G) return;
  const tset = new Set(), rset = new Set();
  let selecting = false, ghost = -1, picked = -1;
  if (sel && canActNow()) {
    const card = myHand()[sel.hi];
    if (card) {
      const ts = E.targets(G, card, myTeam());
      selecting = ts.length > 0;
      if (E.isOneEyed(card)) { ts.forEach(i => rset.add(i)); if (sel.cell != null) picked = sel.cell; }
      else { ts.forEach(i => tset.add(i)); if (sel.cell != null) ghost = sel.cell; }
    }
  }
  grid.classList.toggle('selecting', selecting);
  const L = G.last;
  for (let i = 0; i < 100; i++) {
    const el = cells[i];
    el.classList.toggle('target', tset.has(i));
    el.classList.toggle('rtarget', rset.has(i));
    el.classList.toggle('picked', i === picked);
    el.classList.toggle('last', !!L && L.kind === 'place' && L.cell === i);
    const isT = tset.has(i) || rset.has(i);
    if (el.tabIndex !== (isT ? 0 : -1)) el.tabIndex = isT ? 0 : -1;
    const ch = G.chips[i];
    const key = i === ghost ? 'g' : ch < 0 ? '' : ch + (G.locked[i] ? 'L' : '');
    if (renderedKey[i] === key) continue;
    const slot = el.lastElementChild;
    const old = slot.firstElementChild;
    if (key === '') {
      if (old && newMove && L && L.kind === 'remove' && L.cell === i && !reduced) {
        const fly = old.cloneNode(true); fly.classList.remove('drop'); fly.classList.add('out'); el.appendChild(fly); setTimeout(() => fly.remove(), 600);
      }
      slot.innerHTML = '';
    } else if (key === 'g') {
      slot.innerHTML = chipHTML(myTeam(), false, ' ghost');
    } else {
      const drop = newMove && L && L.kind === 'place' && L.cell === i && renderedKey[i] !== 'g' ? ' drop' : (renderedKey[i] === 'g' ? ' drop' : '');
      slot.innerHTML = chipHTML(ch, !!G.locked[i], drop);
    }
    renderedKey[i] = key;
  }
  drawLines(newMove);
}

/* ---------------- side panels ---------------- */
const DOTS = '<span class="dots"><span></span><span></span><span></span></span>';
function renderStatus() {
  const el = $('#status');
  if (!G) { el.innerHTML = ''; return; }
  const p = G.players[G.turn];
  let t1, t2, who = p.team, mine = false;
  if (G.winner === -2) { t1 = 'Stalemate'; t2 = 'Nobody can move'; who = -1; }
  else if (G.winner === -3) { t1 = 'Tied game'; t2 = 'Game over'; who = -1; }
  else if (G.winner >= 0) { t1 = `${teamName(G.winner)} win`; t2 = 'Game over'; who = G.winner; }
  else if (mode === 'local' && !handVisible) { t1 = `Pass to ${p.name}`; t2 = esc(teamName(p.team)); }
  else if (canActNow()) { t1 = mode === 'local' ? `${p.name}, your turn` : 'Your turn'; t2 = 'Pick a card, then a square'; mine = true; }
  else if (p.cpu) { t1 = p.name; t2 = `is thinking${DOTS}`; }
  else { t1 = `${p.name}'s turn`; t2 = `${esc(teamName(p.team))} · waiting${DOTS}`; }
  el.classList.toggle('mine', mine);
  el.innerHTML = `<div class="who">${who >= 0 ? chipHTML(who) : ''}</div><div class="txt"><div class="t1l">${esc(t1)}</div><div class="t2l">${t2}</div></div>`;
}
function renderTeams() {
  const el = $('#teams'); if (!G) { el.innerHTML = ''; return; }
  const cur = G.players[G.turn];
  let h = '';
  for (let t = 0; t < G.teams; t++) {
    const members = G.players.map((p, i) => ({ p, i })).filter(x => x.p.team === t)
      .map(x => (x.i === G.turn && G.winner === -1 ? `<b>${esc(x.p.name)}</b>` : esc(x.p.name)) + (mode === 'online' && x.p.wins != null ? `<span class="rk-${rankFor(x.p.wins).key}" title="${esc(rankFor(x.p.wins).name)}">${rankIcon(rankFor(x.p.wins).key, 'mini-rank')}</span>` : '') + (x.i === viewSeat && mode !== 'local' && x.p.name !== 'You' ? ' (you)' : ''));
    let pips = '';
    if (G.rule === 'full') pips = `<span class="score"><i></i>${G.seqs[t]}</span>`;
    else for (let k = 0; k < G.seqToWin; k++) pips += `<i class="${k < G.seqs[t] ? 'on' : ''}"></i>`;
    h += `<div class="team ${cur.team === t && G.winner === -1 ? 'now' : ''}"><div class="sw">${chipHTML(t)}</div><div style="min-width:0"><div class="tn">${esc(teamName(t))}</div><div class="tm">${members.join(', ')}</div></div><div class="seqs" title="${G.seqs[t]} sequence${G.seqs[t] === 1 ? '' : 's'}">${pips}</div></div>`;
  }
  el.innerHTML = h;
}
function renderPile() {
  const el = $('#pile'); if (!G) { el.innerHTML = ''; return; }
  const top = G.discard[G.discard.length - 1];
  el.innerHTML = `<div class="deck" aria-hidden="true"></div>${top ? `<div class="pc">${cardHTML(top)}</div>` : ''}<div class="meta"><div><b>${G.deck.length}</b> cards in the deck</div><div>${G.rule === 'full' ? `Full board · <b>${E.openSquares(G)}</b> open squares` : `First to <b>${G.seqToWin}</b> sequence${G.seqToWin > 1 ? 's' : ''}`}</div></div>`;
}
function renderLog() {
  const el = $('#log'); if (!G) { el.innerHTML = ''; return; }
  el.innerHTML = G.log.slice(0, 25).map(e => {
    const p = G.players[e.pi]; const n = `<b>${esc(p.name)}</b>`;
    let txt;
    if (e.kind === 'place') txt = `${n} played ${tagHTML(e.card)}${e.seq ? ` and completed ${e.seq > 1 ? e.seq + ' sequences' : 'a sequence'}` : ''}`;
    else if (e.kind === 'remove') txt = `${n} used ${tagHTML(e.card)} to knock off a ${esc(teamName(e.victim))} chip`;
    else if (e.kind === 'swap') txt = `${n} swapped a dead ${tagHTML(e.card)}`;
    else if (e.kind === 'end') txt = `${n} ended the game`;
    else txt = `${n} had no move`;
    return `<li><span class="ld" style="background:var(--t${p.team})"></span><span>${txt}</span></li>`;
  }).join('') || '<li class="note">No moves yet.</li>';
}
function renderHand(fresh) {
  const el = $('#hand');
  const hand = myHand();
  el.classList.toggle('hidden', !handVisible);
  const n = hand.length;
  const avail = el.clientWidth || 320;
  const w = Math.min(phone() ? 50 : 76, Math.max(44, avail / Math.max(4.2, n * 0.82)));
  el.style.setProperty('--w', w + 'px');
  const overlap = n > 1 ? Math.max(0, (n * w - avail + 8) / (n - 1)) : 0;
  el.style.setProperty('--overlap', overlap + 'px');
  const key = hand.join(',') + '|' + viewSeat + '|' + (G && G.gid);
  const changed = key !== prevHandKey;
  const prevLen = prevHandKey.split('|')[0].split(',').filter(Boolean).length;
  el.innerHTML = hand.map((c, i) => {
    const mid = (n - 1) / 2, rot = (i - mid) * 2.6, dy = Math.abs(i - mid) * 2.5;
    let badge = '';
    if (E.isTwoEyed(c)) badge = '<span class="badge">Wild</span>';
    else if (E.isOneEyed(c)) badge = '<span class="badge">Remove</span>';
    else if (G && E.isDead(G, c)) badge = '<span class="badge dead">Dead</span>';
    const dealt = handVisible && changed && (fresh || (i === n - 1 && n >= prevLen)) ? ' dealt' : '';
    return `<button class="hcard${sel && sel.hi === i ? ' sel' : ''}${dealt}" data-hi="${i}" style="--rot:${rot}deg;--dy:${sel && sel.hi === i ? -18 : dy}px;${fresh ? `animation-delay:${i * 70}ms` : ''}" aria-label="${handVisible ? cardName(c) : 'Hidden card'}">${badge}${cardHTML(c)}</button>`;
  }).join('');
  prevHandKey = key;
  $('#handLabel').innerHTML = mode === 'local' && G ? `<b>${esc(G.players[viewSeat].name)}</b>'s hand` : 'Your hand';
  $('#handNote').textContent = G ? `${n} cards` : '';
}
function renderActions() {
  const el = $('#actions'); if (!G) { el.innerHTML = ''; return; }
  if (G.winner !== -1) { el.innerHTML = `<button class="btn primary" data-act="result">See the result</button>`; return; }
  if (mode === 'local' && !handVisible) { el.innerHTML = `<button class="btn primary" data-act="reveal">Show ${esc(G.players[G.turn].name)}'s hand</button>`; return; }
  if (!canActNow()) { el.innerHTML = `<span class="hint">Tap a card to see where it goes.</span>`; return; }
  if (sel) {
    const card = myHand()[sel.hi];
    if (E.isDead(G, card)) {
      el.innerHTML = !E.canSwap(G, viewSeat)
        ? `<span class="hint">Both squares are taken. ${G.swapped ? 'You already swapped a card this turn.' : 'There are no cards left to swap it for.'}</span>`
        : `<span class="hint">Both ${tagHTML(card)} squares are taken.</span><button class="btn primary" data-act="swap">Swap for a new card</button>`;
      return;
    }
    const ts = E.targets(G, card, myTeam());
    if (!ts.length) { el.innerHTML = `<span class="hint">No rival chips can be removed right now.</span><button class="btn" data-act="cancel">Cancel</button>`; return; }
    if (sel.cell != null) {
      el.innerHTML = `<button class="btn primary big" data-act="place">${E.isOneEyed(card) ? 'Remove chip' : 'Place chip'}</button><button class="btn" data-act="cancel">Cancel</button>`;
      return;
    }
    const msg = E.isOneEyed(card) ? 'Tap a rival chip to knock it off' : E.isTwoEyed(card) ? 'Wild card: tap any open square' : 'Tap a glowing square';
    el.innerHTML = `<span class="hint">${msg}</span><button class="btn" data-act="cancel">Cancel</button>`;
    return;
  }
  if (!E.hasMove(G, viewSeat) && !E.canSwap(G, viewSeat)) { el.innerHTML = `<span class="hint">None of your cards can be played.</span><button class="btn primary" data-act="pass">Pass the turn</button>`; return; }
  el.innerHTML = `<span class="hint">Pick a card to play</span>`;
}
function renderAll(newMove, fresh) {
  renderBoard(newMove); renderHand(fresh); renderActions(); renderStatus(); renderTeams(); renderPile(); renderLog();
  $('#logLabel') && ($('#logLabel').textContent = SKINS[skin].log);
  const isHost = mode !== 'online' || (onlineDoc && onlineDoc.host === myId);
  $('#btnRestart').hidden = !isHost;
  $('#btnEnd').hidden = !isHost || !G || G.winner !== -1;
}

/* ---------------- flow ---------------- */
function applyState(ns, opts = {}) {
  const prev = G;
  G = ns; sel = null;
  const fresh = !prev || prev.gid !== ns.gid;
  const newMove = !fresh && ns.moveNo !== prev.moveNo;
  if (fresh) { renderedKey = Array(100).fill(''); cells.forEach(c => (c.lastElementChild.innerHTML = '')); victoryFor = null; linesDrawn = { gid: ns.gid, n: ns.lines.length }; }
  renderAll(newMove, fresh);
  if (newMove) effects(prev, ns);
  if (fresh) Sound.card();
  if (mode === 'cpu' || mode === 'local') store.set('local', { mode, cfg, G });
  if (ns.winner !== -1) {
    if (mode === 'online') recordOnlineResult();
    if (victoryFor !== ns.gid) setTimeout(showVictory, ns.last && ns.last.seq ? 1300 : 500);
    return;
  }
  if (mode === 'cpu') scheduleCpu();
  if (mode === 'local' && !fresh && ns.turn !== viewSeat) showHandoff();
}
function effects(prev, ns) {
  const since = ns.log.filter(e => e.n >= prev.moveNo);
  if (since.some(e => e.kind === 'swap')) Sound.card();
  const L = ns.last;
  if (!L || L.n < prev.moveNo) return;
  if (L.kind === 'place') {
    Sound.chip();
    if (L.seq) setTimeout(() => {
      Sound.seq();
      const made = ns.lines.filter(l => l.m === L.n);
      const col = getComputedStyle(document.documentElement);
      (made.length ? made : ns.lines.slice(-1)).forEach(line => {
        const r = cells[line.cells[2]].getBoundingClientRect();
        FX.burst(r.left + r.width / 2, r.top + r.height / 2, [col.getPropertyValue('--t' + line.t).trim(), col.getPropertyValue('--accent-hi').trim(), '#ffffff'], 60);
      });
      if (L.seq > 1) toast(`${G.players[L.pi].name} made ${L.seq} sequences in one move!`);
    }, 380);
  } else if (L.kind === 'remove') Sound.remove();
}
function scheduleCpu() {
  clearTimeout(cpuTimer);
  if (!G || G.winner !== -1 || !G.players[G.turn].cpu) return;
  const gid = G.gid;
  cpuTimer = setTimeout(() => {
    if (!G || G.gid !== gid || G.winner !== -1 || !G.players[G.turn].cpu || mode !== 'cpu') return;
    try { applyState(E.aiApply(G, G.turn)); } catch (e) { console.error(e); }
  }, 850 + Math.random() * 650);
}
async function commit() {
  if (!sel || sel.cell == null || !canActNow()) return;
  let ns;
  try { ns = E.play(G, viewSeat, sel.hi, sel.cell); } catch (e) { toast('That move is not allowed.'); return; }
  await pushState(ns);
}
async function doSwap() {
  if (!sel || !canActNow()) return;
  let ns; try { ns = E.swapDead(G, viewSeat, sel.hi); } catch (e) { toast('You can swap one dead card per turn.'); return; }
  await pushState(ns);
}
async function doPass() {
  if (!canActNow()) return;
  await pushState(E.pass(G, viewSeat));
}
async function pushState(ns) {
  if (mode !== 'online') { applyState(ns); return; }
  busy = true;
  const before = G;
  applyState(ns);
  try {
    await saveMove(before, ns);
  } catch (e) {
    toast(e && e.conflict ? 'The table changed before your move landed. Showing the latest board.' : 'Your move did not reach the table. Check your connection and try again.');
    G = null; applyState(before);
    if (onlineCode) fetchGame(onlineCode);
  }
  busy = false; renderAll(false);
}

/* ---------------- overlays ---------------- */
const show = id => { $(id).hidden = false; };
const hide = id => { $(id).hidden = true; };
let toastTimer;
function toast(msg) { const t = $('#toast'); t.textContent = msg; t.hidden = false; clearTimeout(toastTimer); toastTimer = setTimeout(() => (t.hidden = true), 3200); }
function showHandoff() {
  const p = G.players[G.turn];
  handVisible = false; sel = null; renderAll(false);
  $('#handoffBody').innerHTML = `<div class="big-chip">${chipHTML(p.team)}</div><h2>Pass to ${esc(p.name)}</h2><p class="note">${esc(teamName(p.team))}. Keep your cards hidden from the others.</p><button class="btn primary big" id="btnReveal">Show my hand</button>`;
  show('#handoff');
  $('#btnReveal').onclick = reveal;
  setTimeout(() => $('#btnReveal') && $('#btnReveal').focus(), 50);
}
function reveal() { hide('#handoff'); viewSeat = G.turn; handVisible = true; prevHandKey = ''; renderAll(false, true); Sound.card(); }
function showVictory() {
  if (!G || G.winner === -1) return;
  const first = victoryFor !== G.gid;
  victoryFor = G.gid;
  const w = G.winner;
  let title, sub, rec = '';
  const full = G.rule === 'full' || G.endReason === 'ended';
  const ender = G.log.find(e => e.kind === 'end');
  const why = { board: 'The board is full.', cards: 'All the cards have been played.', stuck: 'Nobody can make another move.', ended: `${ender && G.players[ender.pi] ? G.players[ender.pi].name : 'The host'} ended the game.` }[G.endReason] || '';
  if (w === -2) { title = 'Stalemate'; sub = 'Every square that matters is taken and nobody can move.'; }
  else if (w === -3) { title = 'Tied game'; sub = `${why} Same number of sequences and chips on the board.`; }
  else {
    const members = G.players.filter(p => p.team === w).map(p => p.name);
    const mine = mode !== 'local' && G.players[viewSeat] && G.players[viewSeat].team === w;
    title = mode === 'local' ? `${teamName(w)} win` : mine ? 'Victory!' : `${teamName(w)} win`;
    sub = full
      ? `${why} ${members.join(' & ')} ${G.tiebreak ? `${members.length > 1 ? 'win' : 'wins'} on chips on the board (tied at ${G.seqs[w]} sequence${G.seqs[w] === 1 ? '' : 's'})` : 'finished with the most sequences'}.`
      : `${members.join(' & ')} linked ${G.seqs[w]} sequence${G.seqs[w] > 1 ? 's' : ''}.`;
    if (mode === 'cpu' && G.endReason !== 'ended') {
      const rk = recordKey(), r = store.get(rk, { w: 0, l: 0, gids: [] });
      if (!r.gids.includes(G.gid)) { mine ? r.w++ : r.l++; r.gids = [G.gid].concat(r.gids).slice(0, 30); store.set(rk, r); }
      rec = `<p class="note">Your record against the computer: ${r.w} won, ${r.l} lost</p>`;
    }
  }
  let board = '';
  if (full) {
    const order = Array.from({ length: G.teams }, (_, t) => t).sort((x, y) => G.seqs[y] - G.seqs[x] || E.chipCount(G, y) - E.chipCount(G, x));
    board = `<div class="final">${order.map(t => `<div class="${t === w ? 'win' : ''}"><span class="mini-chip">${chipHTML(t)}</span><span>${esc(teamName(t))}</span><b>${G.seqs[t]} seq · ${E.chipCount(G, t)} chips</b></div>`).join('')}</div>`;
  }
  const canAgain = mode !== 'online' || (onlineDoc && onlineDoc.host === myId);
  $('#victoryBody').innerHTML = `${w >= 0 ? `<div class="big-chip">${chipHTML(w, true)}</div>` : ''}<h2>${esc(title)}</h2><p>${esc(sub)}</p>${board}${rec}${mode === 'online' ? '<div id="rankedSlot" style="display:grid;justify-items:center;width:100%"></div>' : ''}
    <div class="row" style="justify-content:center">${canAgain ? `<button class="btn primary big" data-v="again">${mode === 'online' ? 'Rematch' : 'Play again'}</button>` : '<span class="note">Waiting for the host to start a rematch.</span>'}<button class="btn" data-v="board">View the board</button><button class="btn" data-v="menu">Main menu</button></div>`;
  show('#victory');
  paintResult();
  if (first) { Sound.win(); FX.rain(FX.colors()); }
}
$('#victoryBody').addEventListener('click', e => {
  const b = e.target.closest('button'); if (!b) return;
  hide('#victory');
  if (b.dataset.v === 'again') restart();
  else if (b.dataset.v === 'menu') toMenu();
});

/* ---------------- starting games ---------------- */
function segVal(id) { const b = document.querySelector(`#${id} [aria-pressed="true"]`); return b ? b.dataset.v : null; }
function startCpu(c) {
  const match = c ? c.match : segVal('cpuMatch'), level = c ? c.level : segVal('cpuLevel'), rule = c ? c.rule : segVal('cpuRule');
  const nm = (c ? c.name : me ? me.display_name : $('#cpuName').value.trim()) || 'You';
  if (!me) store.set('name', nm);
  const bots = shuffle([...SKINS[skin].cpu]);
  const bot = k => ({ name: bots[k], cpu: true, level });
  let players;
  if (match === '2v2') players = [{ name: nm }, bot(0), bot(1), bot(2)];
  else if (match === '3way') players = [{ name: nm }, bot(0), bot(1)];
  else players = [{ name: nm }, bot(0)];
  players.forEach((p, i) => (p.id = 's' + i));
  begin('cpu', E.create(players, { rule }), { match, level, name: nm, rule });
}
function localCount() { return +segVal('localCount'); }
function renderLocalNames() {
  const n = localCount(), teams = E.teamsFor(n), saved = store.get('localNames', []);
  $('#localNames').innerHTML = Array.from({ length: n }, (_, i) => `<label class="name-row"><span class="dot" style="background:var(--t${i % teams})"></span><input class="input" id="ln${i}" maxlength="16" value="${esc(saved[i] || '')}" placeholder="Player ${i + 1}" aria-label="Player ${i + 1} name"></label>`).join('');
}
function startLocal(c) {
  let names, rule = c ? c.rule : segVal('localRule');
  if (c) names = c.names;
  else {
    const n = localCount();
    names = Array.from({ length: n }, (_, i) => $('#ln' + i).value.trim() || `Player ${i + 1}`);
    store.set('localNames', Array.from({ length: n }, (_, i) => $('#ln' + i).value.trim()));
  }
  begin('local', E.create(names.map((name, i) => ({ id: 's' + i, name })), { rule }), { names, rule });
}
function begin(m, state, c) {
  leaveOnlineWatch();
  mode = m; cfg = c; G = null; viewSeat = 0; handVisible = m !== 'local'; busy = false;
  hide('#victory'); hide('#handoff');
  showScreen('game');
  applyState(state);
  if (m === 'local') showHandoff();
}
function restart() {
  if (mode === 'cpu') startCpu(cfg);
  else if (mode === 'local') startLocal(cfg);
  else if (mode === 'online') onlineRematch();
}
function toMenu() {
  clearTimeout(cpuTimer);
  if (mode === 'online') leaveOnlineWatch();
  mode = null; G = null;
  hide('#handoff'); hide('#victory');
  showScreen('menu');
}
function showScreen(name) {
  ['auth', 'menu', 'hall', 'game'].forEach(s => { $('#' + s).hidden = s !== name; });
  document.body.dataset.screen = name;
  if (name === 'game') requestAnimationFrame(() => { renderHand(); sizeBoard(); });
  else if (name === 'menu') refreshMenu();
  scrollTo(0, 0);
}
const recordKey = () => 'record-' + (myId || 'guest');
function refreshMenu() {
  const saved = store.get('local', null);
  const ok = saved && saved.G && saved.G.winner === -1 && saved.G.v === 1;
  $('#continueBox').hidden = !ok;
  if (ok) $('#continueNote').textContent = saved.mode === 'cpu'
    ? `Against the computer · ${saved.G.rule === 'full' ? 'Full board' : 'First to ' + saved.G.seqToWin} · move ${saved.G.moveNo + 1}`
    : `Same device · ${saved.G.rule === 'full' ? 'Full board' : 'First to ' + saved.G.seqToWin} · ${saved.G.players.map(p => p.name).join(', ')}`;
  const r = store.get(recordKey(), null);
  $('#cpuRecord').textContent = r ? `Your record: ${r.w} won, ${r.l} lost` : '';
  $('#cpuName').value = $('#cpuName').value || store.get('name', '');
  renderFan(); renderTiles(); renderOnlinePanel();
}
function continueSaved() {
  const saved = store.get('local', null); if (!saved) return;
  leaveOnlineWatch();
  mode = saved.mode; cfg = saved.cfg; G = null; viewSeat = 0; handVisible = mode !== 'local';
  showScreen('game');
  applyState(saved.G);
  if (mode === 'local') showHandoff();
}

/* ---------------- menu visuals ---------------- */
function renderFan() {
  const cards = ['AS', 'KH', 'QD', 'JC', '10S'];
  $('#fan').innerHTML = cards.map((c, i) => `<div class="fc" style="left:${i * 50}px;transform:rotate(${(i - 2) * 9}deg) translateY(${Math.abs(i - 2) * 6}px)">${cardHTML(c)}</div>`).join('')
    + `<div class="chip-demo" style="position:absolute">${chipHTML(0, false)}</div>`;
}
function renderTiles() {
  $('#themeTiles').innerHTML = Object.entries(SKINS).map(([k, S]) => `<button class="theme-tile" data-skin="${k}" data-k="${k}" aria-pressed="${k === skin}"><span class="tt-name">${S.name}</span><span class="tt-row"><span class="tt-card">${cardHTML('KS', k)}</span><span class="tt-chip">${chipHTML(0, false, '', k)}</span><span class="tt-chip">${chipHTML(1, false, '', k)}</span><span class="tt-chip">${chipHTML(2, false, '', k)}</span></span></button>`).join('');
}
function setSkin(k) {
  if (!SKINS[k]) return;
  skin = k; store.set('skin', k);
  document.documentElement.dataset.skin = k;
  document.querySelectorAll('.skin-dot').forEach(b => b.setAttribute('aria-pressed', b.dataset.k === k));
  $('#heroEyebrow').textContent = SKINS[k].tag;
  buildBoard();
  if (G) { renderedKey = Array(100).fill(''); renderAll(false); }
  if (!$('#menu').hidden) { renderFan(); renderTiles(); }
  const jd = $('#jackDemo');
  jd.innerHTML = `<div class="jd"><div class="jc">${cardHTML('JD')}</div><p><b>Two-eyed Jacks</b> (♦ ♣) are wild. Place a chip on any open square.</p></div><div class="jd"><div class="jc">${cardHTML('JS')}</div><p><b>One-eyed Jacks</b> (♠ ♥) remove one rival chip.</p></div>`;
}

/* ---------------- accounts, ranks and profiles (Supabase) ---------------- */
const CFG = window.FIVEFOLD || {};
const RANKS = (CFG.ranks && CFG.ranks.length ? CFG.ranks : [{ key: 'bastard', name: 'Bastard', wins: 0 }]).slice().sort((a, b) => a.wins - b.wins);
const CRESTS = { sword: 'em-sword', crown: 'em-crown', flame: 'em-flame', frost: 'em-snow', blades: 'em-bladecrown', tower: 'em-castle', skull: 'em-skull', star: 'em-star5', sun: 'em-sun', shield: 'em-shield', ankh: 'em-ankh', wheel: 'em-wheel' };
const COLORS = { ember: '#a3201b', frost: '#3c6e9a', gold: '#b8862a', forest: '#2e6e36', violet: '#5b3a8a', ash: '#4b5058', rose: '#a8456a', teal: '#1f7a7a' };
const PROFILE_COLS = 'id,username,display_name,crest,color,motto,wins,games,created_at';
const rankFor = w => { let r = RANKS[0]; for (const x of RANKS) if ((w || 0) >= x.wins) r = x; return r; };
const nextRank = w => RANKS.find(x => x.wins > (w || 0)) || null;
const rankIcon = (key, cls = '') => `<svg class="${cls}" viewBox="0 0 100 100" aria-hidden="true"><use href="#rk-${key}"/></svg>`;
const rankHTML = (w, small) => { const r = rankFor(w); return `<span class="rank rk-${r.key}${small ? ' sm' : ''}">${rankIcon(r.key)}${esc(r.name)}</span>`; };
const crestHTML = (crest, color) => `<span class="crest" style="--cc:${COLORS[color] || COLORS.ember}"><svg viewBox="0 0 100 100" aria-hidden="true"><use href="#${CRESTS[crest] || CRESTS.sword}"/></svg></span>`;
const pct = (a, b) => (b ? Math.round((a * 100) / b) + '%' : '–');
const plural = (n, w) => `${n} ${w}${n === 1 ? '' : 's'}`;
function ago(iso) {
  const s = Math.max(1, (Date.now() - new Date(iso).getTime()) / 1000);
  if (s < 3600) return Math.max(1, Math.round(s / 60)) + 'm ago';
  if (s < 86400) return Math.round(s / 3600) + 'h ago';
  if (s < 86400 * 30) return Math.round(s / 86400) + 'd ago';
  return new Date(iso).toLocaleDateString();
}
const sess = {
  get(k) { try { return sessionStorage.getItem(k); } catch (e) { return null; } },
  set(k, v) { try { if (v == null) sessionStorage.removeItem(k); else sessionStorage.setItem(k, v); } catch (e) {} }
};

let sb = null, user = null, me = store.get('me', null), myId = null, setupMissing = false;
let boardData = null, boardAt = 0, myPlace = null, recentData = null, hallTab = 'me';

function initSupabase() {
  try {
    if (!window.supabase || !CFG.supabaseUrl || !CFG.supabaseAnonKey) throw new Error('Supabase settings are missing.');
    sb = window.supabase.createClient(CFG.supabaseUrl, CFG.supabaseAnonKey, {
      auth: { persistSession: true, autoRefreshToken: true, detectSessionInUrl: false, storageKey: 'ff-auth' }
    });
  } catch (e) { sb = null; console.warn('Accounts unavailable:', e); }
}
function setUser(u) {
  user = u || null; myId = user ? user.id : null;
  if (!user) { me = null; store.set('me', null); }
  else if (me && me.id !== user.id) me = null;
  renderMe();
}
async function initAccounts() {
  initSupabase();
  if (!sb) { setUser(null); return; }
  try { const { data } = await sb.auth.getSession(); setUser(data.session ? data.session.user : null); }
  catch (e) { setUser(null); }
  sb.auth.onAuthStateChange((ev, session) => {
    const u = session ? session.user : null;
    if ((u && u.id) === (user && user.id)) return;
    setTimeout(() => { setUser(u); if (u) { loadMe(); initOnline(); } else onSignedOut(); }, 0);
  });
  if (user) await loadMe();
}
async function loadMe() {
  if (!sb || !user) return me;
  let { data, error } = await sb.from('profiles').select(PROFILE_COLS).eq('id', user.id).maybeSingle();
  if (!error && !data) {
    // account made before the database was set up: create the profile now
    await sb.rpc('ensure_profile');
    ({ data, error } = await sb.from('profiles').select(PROFILE_COLS).eq('id', user.id).maybeSingle());
  }
  if (error) { if (/relation|schema cache|does not exist/i.test(error.message || '')) { setupMissing = true; renderMe(); } return me; }
  if (data) { me = data; setupMissing = false; store.set('me', me); renderMe(); }
  return me;
}

/* --- sign in / create account --- */
let authMode = 'in', pickCrest = 'sword', pickColor = 'ember';
const cleanUser = v => String(v || '').trim().toLowerCase();
const emailFor = u => (u.includes('@') ? u : `${u}@${CFG.loginDomain || 'players.fivefold.app'}`);
function setAuthMode(m) {
  authMode = m;
  $('#au-in').setAttribute('aria-selected', m === 'in');
  $('#au-up').setAttribute('aria-selected', m === 'up');
  $('#upOnly').hidden = m !== 'up';
  $('#authGo').textContent = m === 'up' ? 'Create my account' : 'Sign in';
  $('#auPass').setAttribute('autocomplete', m === 'up' ? 'new-password' : 'current-password');
  authMsg('');
}
function authMsg(msg, ok) { const el = $('#authErr'); el.textContent = msg || ''; el.hidden = !msg; el.classList.toggle('ok', !!ok); }
function friendlyAuthError(e) {
  const m = (e && (e.message || e.error_description)) || String(e || '');
  if (/invalid login/i.test(m)) return 'Wrong username or password.';
  if (/already (been )?registered|user already exists|taken/i.test(m)) return 'That username is taken. Pick another one.';
  if (/password/i.test(m) && /(least|short|weak|characters)/i.test(m)) return 'Pick a longer password (at least 6 characters).';
  if (/database error|relation|function .* does not exist|schema cache|could not find the function/i.test(m)) return 'The game database is not set up yet. Run supabase-setup.sql in the Supabase SQL Editor, then try again.';
  if (/signups? not allowed|signup.* disabled/i.test(m)) return 'New accounts are switched off in Supabase (Authentication → Sign In / Providers → Allow new users to sign up).';
  if (/email.*(invalid|not authorized)|invalid.*email/i.test(m)) return 'Supabase rejected the sign-in address. Make sure "Confirm email" is off (see the README).';
  if (/rate limit|too many/i.test(m)) return 'Too many tries. Wait a minute and try again.';
  if (/fetch|network|load failed|failed to/i.test(m)) return "Can't reach the server. Check your connection and try again.";
  return m || 'Something went wrong. Try again.';
}
async function submitAuth(e) {
  e.preventDefault();
  if (!sb) { authMsg("Accounts can't be reached right now. You can still play as a guest."); return; }
  const u = cleanUser($('#auUser').value), pw = $('#auPass').value;
  if (authMode === 'up' && !/^[a-z0-9_]{3,20}$/.test(u)) return authMsg('Usernames are 3 to 20 characters: letters, numbers or _ (no spaces).');
  if (!u) return authMsg('Type your username.');
  if (pw.length < 6) return authMsg('Passwords need at least 6 characters.');
  const go = $('#authGo'); go.disabled = true; authMsg('');
  try {
    if (authMode === 'in') {
      const { data, error } = await sb.auth.signInWithPassword({ email: emailFor(u), password: pw });
      if (error) throw error;
      setUser(data.user); await loadMe();
      toast(me ? `Welcome back, ${me.display_name}.` : 'Signed in.');
    } else {
      const name = $('#auName').value.trim().slice(0, 24) || u;
      const { data: free, error: e1 } = await sb.rpc('username_available', { p_username: u });
      if (e1) throw e1;
      if (!free) throw new Error('taken');
      const { data, error } = await sb.auth.signUp({ email: emailFor(u), password: pw, options: { data: { username: u, display_name: name, crest: pickCrest, color: pickColor } } });
      if (error) throw error;
      if (!data.session) {
        authMsg('Your account was made, but Supabase is waiting for an email confirmation that can never arrive. In Supabase open Authentication → Sign In / Providers → Email, turn off "Confirm email", then sign in here.');
        go.disabled = false; setAuthMode('in'); return;
      }
      setUser(data.user); await loadMe();
      toast(`Welcome, ${name}. Every legend starts as a ${RANKS[0].name}.`);
    }
    $('#auPass').value = '';
    sess.set('ff-guest', null);
    enterAfterAuth();
  } catch (err) { authMsg(friendlyAuthError(err)); }
  go.disabled = false;
}
function enterAfterAuth() {
  showScreen('menu');
  initOnline().then(() => {
    const inv = sess.get('ff-invite');
    if (inv) { sess.set('ff-invite', null); selectTab('online'); $('#joinCode').value = inv; joinTable(inv); }
  });
}
function playAsGuest() { sess.set('ff-guest', '1'); onlineState = 'signin'; showScreen('menu'); }
async function signOut() {
  if (mode === 'online') toMenu();
  leaveOnlineWatch();
  try { if (sb) await sb.auth.signOut({ scope: 'local' }); } catch (e) {}
  setUser(null); onSignedOut();
}
function onSignedOut() {
  boardData = null; recentData = null; myPlace = null; onlineState = 'signin';
  sess.set('ff-guest', null);
  if (mode === 'online') toMenu();
  if (!mode) showScreen('auth'); else toast('You were signed out. Sign in again to play online.');
}
function renderAuthExtras() {
  $('#authLadder').innerHTML = ladderItems(null, true);
  renderPickers('#auCrest', '#auColor', pickCrest, pickColor, (c, k) => { pickCrest = c; pickColor = k; });
}
function renderPickers(crestSel, colorSel, crest, color, onChange) {
  const cp = $(crestSel), kp = $(colorSel);
  const draw = () => {
    cp.innerHTML = Object.keys(CRESTS).map(k => `<button type="button" data-c="${k}" aria-pressed="${k === crest}" aria-label="${k} crest">${crestHTML(k, color)}</button>`).join('');
    kp.innerHTML = Object.entries(COLORS).map(([k, v]) => `<button type="button" data-k="${k}" style="--sw:${v}" aria-pressed="${k === color}" aria-label="${k}"></button>`).join('');
  };
  cp.onclick = e => { const b = e.target.closest('[data-c]'); if (!b) return; crest = b.dataset.c; onChange(crest, color); draw(); };
  kp.onclick = e => { const b = e.target.closest('[data-k]'); if (!b) return; color = b.dataset.k; onChange(crest, color); draw(); };
  draw();
}

/* --- the little "who am I" bits --- */
function renderMe() {
  const b = $('#meBtn');
  if (me) { b.className = 'me-btn'; b.innerHTML = `${crestHTML(me.crest, me.color)}<span class="nm">${esc(me.display_name)}</span>`; b.setAttribute('aria-label', 'Your profile and the leaderboard'); }
  else if (user) { b.className = 'me-btn'; b.innerHTML = `${crestHTML('sword', 'ash')}<span class="nm">Profile</span>`; }
  else { b.className = 'me-btn guest'; b.textContent = 'Sign in'; b.setAttribute('aria-label', 'Sign in'); }
  const st = $('#meStrip');
  st.innerHTML = me
    ? `${crestHTML(me.crest, me.color)}<span class="who"><b>${esc(me.display_name)}</b><span class="sub">${rankHTML(me.wins, true)}<span>${plural(me.wins, 'win')}</span></span></span><span class="go">Profile & ranks ›</span>`
    : user
      ? `${crestHTML('sword', 'ash')}<span class="who"><b>Signed in</b><span class="sub">${setupMissing ? 'Database not set up yet' : 'Loading your profile…'}</span></span><span class="go">Profile ›</span>`
      : `<span class="crest" style="--cc:#4b5058"><svg viewBox="0 0 100 100"><use href="#rk-bastard"/></svg></span><span class="who"><b>Playing as a guest</b><span class="sub">Sign in to play online and earn a rank</span></span><span class="go">Sign in ›</span>`;
  $('#cpuNameField').hidden = !!me;
  if (!$('#hall').hidden) renderHall();
}

/* --- hall: profile + leaderboard --- */
function openHall(tab) {
  if (!user) { showScreen('auth'); return; }
  showScreen('hall');
  setHallTab(tab || hallTab);
  renderHall(); renderBoardList();
  loadMe(); loadBoard(); loadRecent();
}
function setHallTab(t) {
  hallTab = t; $('#hall').dataset.tab = t;
  $('#hall-me').setAttribute('aria-selected', t === 'me');
  $('#hall-board').setAttribute('aria-selected', t === 'board');
}
function places(list) {
  const out = []; let place = 0;
  list.forEach((p, i) => { if (i === 0 || p.wins !== list[i - 1].wins) place = i + 1; out.push(place); });
  return out;
}
async function loadBoard(force) {
  if (!sb || !user) return;
  if (!force && boardData && Date.now() - boardAt < 30000) return;
  const { data, error } = await sb.from('profiles').select('id,username,display_name,crest,color,motto,wins,games')
    .order('wins', { ascending: false }).order('games', { ascending: true }).order('created_at', { ascending: true }).limit(100);
  if (error) { $('#boardNote').textContent = 'Could not load the leaderboard. Tap refresh to try again.'; return; }
  boardData = data; boardAt = Date.now(); myPlace = null;
  if (me) {
    const i = data.findIndex(p => p.id === me.id);
    if (i >= 0) myPlace = places(data)[i];
    else {
      const { count } = await sb.from('profiles').select('id', { count: 'exact', head: true }).gt('wins', me.wins);
      if (count != null) myPlace = count + 1;
    }
  }
  renderBoardList(); renderHall();
}
function renderBoardList() {
  const el = $('#boardList');
  if (!boardData) { el.innerHTML = '<li class="skel"></li>'.repeat(6); return; }
  if (!boardData.length) { el.innerHTML = '<li class="note" style="cursor:default;display:block">No players yet. Invite your friends.</li>'; return; }
  const pl = places(boardData);
  el.innerHTML = boardData.map((p, i) => `<li data-id="${esc(p.id)}" class="${me && p.id === me.id ? 'me' : ''}"><span class="pos">${pl[i]}</span>${crestHTML(p.crest, p.color)}<span class="nm"><b>${esc(p.display_name)}</b>${rankHTML(p.wins, true)}</span><span class="wn"><b>${p.wins}</b><span>${p.games} played</span></span></li>`).join('');
  $('#boardNote').textContent = `Ranked by online wins · ${plural(boardData.length, 'player')}${myPlace ? ` · You are #${myPlace}` : ''}`;
}
async function loadRecent() {
  if (!sb || !user) return;
  const { data, error } = await sb.from('game_results').select('code,gid,winner,ranked,rule,moves,players,finished_at')
    .contains('player_ids', [user.id]).order('finished_at', { ascending: false }).limit(8);
  if (!error) { recentData = data || []; renderHall(); }
}
function ladderItems(wins, mini) {
  const cur = wins == null ? null : rankFor(wins);
  return RANKS.slice().reverse().map(x => `<li class="rk-${x.key}${cur && cur.key === x.key ? ' now' : ''}${cur && x.wins > wins ? ' locked' : ''}">${rankIcon(x.key)}<b>${esc(x.name)}</b><span>${x.wins === 0 ? (mini ? 'Start here' : 'Where everyone starts') : `${x.wins}+ wins`}</span></li>`).join('');
}
function recentHTML() {
  if (!recentData) return '<ul class="recent"><li class="skel"></li><li class="skel"></li></ul>';
  if (!recentData.length) return '<p class="note">No online games yet. Open a table and send your friends the link.</p>';
  return `<ul class="recent">${recentData.map(g => {
    const mine = (g.players || []).find(p => p.id === user.id), t = mine ? mine.team : -9;
    const res = g.winner < 0 ? ['t', 'Tie'] : g.winner === t ? ['w', 'Won'] : ['l', 'Lost'];
    const others = (g.players || []).filter(p => p.id !== user.id).map(p => esc(p.name)).join(', ');
    return `<li><span class="res ${res[0]}">${res[1]}</span><span class="vs">vs ${others}${g.ranked ? '' : ' · unranked'}</span><span class="when">${ago(g.finished_at)}</span></li>`;
  }).join('')}</ul>`;
}
function renderHall() {
  const el = $('#hallMe');
  if (!me) {
    el.innerHTML = `<p class="note">${setupMissing ? 'The game database is not set up yet. Run supabase-setup.sql in the Supabase SQL Editor, then reload.' : 'Loading your profile…'}</p><div class="prof-actions"><button class="btn danger" data-h="out">Sign out</button></div>`;
    return;
  }
  const r = rankFor(me.wins), nx = nextRank(me.wins);
  const prog = nx ? Math.max(3, Math.round(((me.wins - r.wins) * 100) / (nx.wins - r.wins))) : 100;
  el.innerHTML = `
    <div class="prof-head">${crestHTML(me.crest, me.color)}<div style="min-width:0"><h2>${esc(me.display_name)}</h2><div class="handle">@${esc(me.username)}</div>${me.motto ? `<div class="motto">“${esc(me.motto)}”</div>` : ''}<div class="tagrow">${rankHTML(me.wins)}</div></div></div>
    <div class="stats"><div class="stat"><b>${me.wins}</b><span>Wins</span></div><div class="stat"><b>${me.games}</b><span>Played</span></div><div class="stat"><b>${pct(me.wins, me.games)}</b><span>Win rate</span></div><div class="stat"><b>${myPlace ? '#' + myPlace : '–'}</b><span>Place</span></div></div>
    <div class="progress"><div class="lbl"><span>${esc(r.name)}</span><span>${nx ? `${plural(nx.wins - me.wins, 'more win')} to ${esc(nx.name)}` : 'Top of the ladder'}</span></div><div class="bar"><i style="width:${prog}%"></i></div></div>
    <div class="field"><span class="label">The ladder</span><ol class="ladder">${ladderItems(me.wins)}</ol></div>
    <div class="field"><span class="label">Recent online games</span>${recentHTML()}</div>
    <div class="prof-actions">${mode && G ? '<button class="btn primary" data-h="back">Back to the game</button>' : '<button class="btn primary" data-h="play">Play</button>'}<button class="btn" data-h="edit">Edit profile</button><button class="btn danger" data-h="out">Sign out</button></div>`;
}
function showPlayerCard(id) {
  const list = boardData || [], i = list.findIndex(p => p.id === id); if (i < 0) return;
  const p = list[i], nx = nextRank(p.wins);
  $('#cardBody').innerHTML = `${crestHTML(p.crest, p.color)}<h2>${esc(p.display_name)}</h2><div class="note">@${esc(p.username)}</div>${p.motto ? `<p style="font-style:italic">“${esc(p.motto)}”</p>` : ''}${rankHTML(p.wins)}
    <div class="stats" style="width:100%"><div class="stat"><b>${p.wins}</b><span>Wins</span></div><div class="stat"><b>${p.games}</b><span>Played</span></div><div class="stat"><b>${pct(p.wins, p.games)}</b><span>Win rate</span></div><div class="stat"><b>#${places(list)[i]}</b><span>Place</span></div></div>
    <p class="note">${nx ? `${plural(nx.wins - p.wins, 'more win')} to ${esc(nx.name)}` : 'Sits at the top of the ladder.'}</p>
    <button class="btn primary" data-close>Close</button>`;
  $('#cardBody .crest').style.setProperty('--cs', '84px');
  show('#cardModal');
}
function openEdit() {
  if (!me) return;
  let crest = me.crest, color = me.color;
  $('#edName').value = me.display_name; $('#edMotto').value = me.motto || ''; $('#edErr').hidden = true;
  renderPickers('#edCrest', '#edColor', crest, color, (c, k) => { crest = c; color = k; });
  $('#editForm').onsubmit = async e => {
    e.preventDefault();
    const name = $('#edName').value.trim(), motto = $('#edMotto').value.trim();
    if (!name) { $('#edErr').textContent = 'Your name cannot be empty.'; $('#edErr').hidden = false; return; }
    $('#edSave').disabled = true;
    const { data, error } = await sb.from('profiles').update({ display_name: name.slice(0, 24), motto: motto.slice(0, 60), crest, color }).eq('id', user.id).select(PROFILE_COLS).single();
    $('#edSave').disabled = false;
    if (error) { $('#edErr').textContent = 'Could not save. Check your connection and try again.'; $('#edErr').hidden = false; return; }
    me = data; store.set('me', me); boardAt = 0;
    hide('#editProf'); renderMe(); renderHall(); loadBoard(true); toast('Profile saved.');
  };
  show('#editProf');
  setTimeout(() => $('#edName').focus(), 60);
}

/* ---------------- online tables (Supabase) ---------------- */
let onlineState = 'init', offReason = '', onlineCode = null, onlineChan = null, onlinePoll = null, onlineDoc = null, openGames = [], openTimer = null;
let recordedGid = null, lastResult = null;
const CODE_CH = 'ABCDEFGHJKMNPQRSTUVWXYZ23456789';
const genCode = () => Array.from({ length: 5 }, () => CODE_CH[Math.floor(Math.random() * CODE_CH.length)]).join('');
const cleanCode = raw => String(raw || '').toUpperCase().replace(/[^A-Z0-9]/g, '').slice(0, 5);
const inviteCode = cleanCode(new URLSearchParams(location.search).get('table'));
const inviteLink = code => `${location.origin}${location.pathname}?table=${code}`;
async function initOnline() {
  if (!sb) { onlineState = 'off'; offReason = ''; renderOnlinePanel(); return; }
  if (!user) { onlineState = 'signin'; renderOnlinePanel(); return; }
  if (onlineState === 'ready') { renderOnlinePanel(); return; }
  onlineState = 'init'; renderOnlinePanel();
  const { error } = await sb.from('games').select('code').limit(1);
  if (error) { onlineState = 'off'; offReason = error.message || ''; console.warn('Online play unavailable:', error); }
  else onlineState = 'ready';
  renderOnlinePanel();
  if (onlineState !== 'ready') return;
  refreshOpen();
  if (!openTimer) openTimer = setInterval(refreshOpen, 7000);
}
async function refreshOpen() {
  if (!sb || onlineState !== 'ready' || document.hidden || $('#menu').hidden || $('#p-online').hidden) return;
  const since = new Date(Date.now() - 12 * 3600e3).toISOString();
  const { data, error } = await sb.from('games').select('doc').eq('status', 'lobby').gte('created_at', since).order('created_at', { ascending: false }).limit(30);
  if (error || !data) return;
  openGames = data.map(r => r.doc).filter(d => d && d.players && d.players.length < 6);
  renderOnlinePanel();
}
function renderOnlinePanel() {
  $('#onlineWait').hidden = onlineState !== 'init';
  $('#onlineSignin').hidden = onlineState !== 'signin';
  $('#onlineOff').hidden = onlineState !== 'off';
  if (onlineState === 'off') $('#onlineOff').textContent = /games|relation|schema|does not exist/i.test(offReason)
    ? 'Online tables are not set up yet. Run supabase-setup.sql in your Supabase SQL Editor, then reload this page.'
    : 'Online tables cannot be reached right now. Check your internet connection and reload. Computer and same-device games still work.';
  const inLobby = onlineState === 'ready' && onlineDoc && onlineDoc.status === 'lobby';
  $('#onlineHome').hidden = onlineState !== 'ready' || inLobby;
  $('#lobby').hidden = !inLobby;
  if (onlineState !== 'ready') return;
  const saved = store.get('online', null);
  $('#rejoinBox').hidden = !saved || inLobby;
  if (saved) $('#rejoinCode').textContent = saved;
  $('#openList').innerHTML = openGames.length
    ? openGames.map(g => `<li><span><span class="code">${esc(g.code)}</span> <span class="note">· ${esc(g.players[0] ? g.players[0].name : '')} · ${g.players.length} seated</span></span><button class="btn" data-join="${esc(g.code)}">Join</button></li>`).join('')
    : '<li class="note">No open tables right now. Open one and send the invite link.</li>';
  if (inLobby) renderLobby();
}
function renderLobby() {
  const d = onlineDoc, n = d.players.length, teams = E.teamsFor(n);
  $('#lobbyCode').textContent = d.code;
  $('#lobbyPlayers').innerHTML = d.players.map((p, i) => `<li><span class="mini-chip">${chipHTML(i % teams)}</span>${crestHTML(p.crest, p.color)}<span style="min-width:0;overflow:hidden;text-overflow:ellipsis;white-space:nowrap">${esc(p.name)}</span>${rankHTML(p.wins, true)}<span class="tag">${p.id === d.host ? 'Host' : ''}${p.id === myId ? (p.id === d.host ? ' · you' : 'You') : ''}</span></li>`).join('');
  const ok = [2, 3, 4, 6].includes(n), host = d.host === myId;
  setSeg('onlineRule', d.rule === 'full' ? 'full' : 'race');
  $('#onlineRule').querySelectorAll('button').forEach(b => (b.disabled = !host));
  ruleNote('onlineRule', n);
  $('#btnStartOnline').hidden = !host;
  $('#btnStartOnline').disabled = !ok;
  $('#lobbyHint').textContent = !ok
    ? (n < 2 ? 'Waiting for at least one more player.' : 'Fivefold plays with 2, 3, 4 or 6 players.')
    : host ? `${n} players · ${teams} teams. Start whenever everyone is in. Games of 10+ moves are ranked.` : 'Waiting for the host to start the game.';
}
function tableErr(e, code) {
  const m = (e && e.message) || '';
  if (/not_found/.test(m)) return `No table with code ${code || ''}.`.replace(' .', '.');
  if (/started/.test(m)) return 'That game has already started.';
  if (/full/.test(m)) return 'That table is full.';
  if (/no_profile/.test(m)) return 'Your profile is missing. Sign out and sign in again.';
  if (/does not exist|schema cache|could not find/i.test(m)) return 'Online tables are not set up yet. Run supabase-setup.sql in Supabase.';
  return 'Could not reach the table. Check your connection and try again.';
}
async function createTable() {
  if (!sb || !user) { showScreen('auth'); return; }
  const btn = $('#btnCreate'); btn.disabled = true;
  try {
    for (let k = 0; k < 5; k++) {
      const code = genCode();
      const { error } = await sb.rpc('create_game', { p_code: code, p_rule: store.get('rule', 'race') });
      if (!error) { watchGame(code); return; }
      if (error.code !== '23505') { toast(tableErr(error)); return; }
    }
    toast('Could not open a table. Try again.');
  } finally { btn.disabled = false; }
}
async function joinTable(raw) {
  const code = cleanCode(raw);
  if (code.length !== 5) { toast('Table codes are 5 letters or numbers.'); return; }
  if (!sb || !user) { sess.set('ff-invite', code); showScreen('auth'); authMsg(`Sign in or create an account to join table ${code}.`, true); return; }
  const { error } = await sb.rpc('join_game', { p_code: code });
  if (error) { toast(tableErr(error, code)); if (/not_found|started/.test(error.message || '') && store.get('online', null) === code) { store.set('online', null); renderOnlinePanel(); } return; }
  watchGame(code);
}
async function fetchGame(code) {
  const { data, error } = await sb.from('games').select('doc').eq('code', code).maybeSingle();
  if (error || code !== onlineCode) return;
  onOnlineDoc(data ? data.doc : null);
}
function watchGame(code) {
  leaveOnlineWatch();
  store.set('online', code);
  onlineCode = code;
  onlineChan = sb.channel('table-' + code)
    .on('postgres_changes', { event: '*', schema: 'public', table: 'games', filter: 'code=eq.' + code }, p => {
      if (code !== onlineCode) return;
      if (p.eventType === 'DELETE') onOnlineDoc(null);
      else if (p.new && p.new.doc) onOnlineDoc(p.new.doc);
    })
    .subscribe(st => { if (st === 'SUBSCRIBED') fetchGame(code); });
  fetchGame(code);
  onlinePoll = setInterval(() => { if (!document.hidden) fetchGame(code); }, 8000);
}
function leaveOnlineWatch() {
  if (onlineChan && sb) sb.removeChannel(onlineChan);
  onlineChan = null; clearInterval(onlinePoll); onlinePoll = null; onlineCode = null; onlineDoc = null;
}
function onOnlineDoc(d) {
  if (!d) { toast('This table was closed.'); store.set('online', null); leaveOnlineWatch(); if (mode === 'online') toMenu(); else renderOnlinePanel(); return; }
  // ignore stale copies that arrive after a newer one
  if (onlineDoc && onlineDoc.state && d.state && d.state.gid === onlineDoc.state.gid && d.state.moveNo < onlineDoc.state.moveNo) return;
  if ((d.status === 'lobby' || !d.state) && mode === 'online' && G) return;
  onlineDoc = d;
  if (d.status === 'lobby' || !d.state) {
    if (!$('#game').hidden) showScreen('menu');
    selectTab('online'); renderOnlinePanel(); return;
  }
  const seat = d.state.players.findIndex(p => p.id === myId);
  if (seat < 0) { toast('This game started without you.'); store.set('online', null); leaveOnlineWatch(); renderOnlinePanel(); return; }
  if (mode !== 'online' || !G || G.gid !== d.state.gid) {
    mode = 'online'; cfg = null; viewSeat = seat; handVisible = true; busy = false;
    hide('#victory'); hide('#handoff');
    if ($('#game').hidden && $('#hall').hidden) showScreen('game');
    G = null; applyState(d.state);
  } else if (d.state.moveNo > G.moveNo) applyState(d.state);
  else if (!busy) renderAll(false);
}
async function saveMove(before, ns) {
  const doc = Object.assign({}, onlineDoc, { state: ns, status: ns.winner !== -1 ? 'over' : 'playing', updated: Date.now() });
  const { data, error } = await sb.from('games')
    .update({ doc, status: doc.status, updated_at: new Date().toISOString() })
    .eq('code', onlineCode).eq('doc->state->>gid', before.gid).eq('doc->state->>moveNo', String(before.moveNo))
    .select('code');
  if (error) throw error;
  if (!data || !data.length) throw { conflict: true };
  onlineDoc = doc;
}
const seatOf = p => ({ id: p.id, name: p.name, crest: p.crest, color: p.color, wins: p.wins });
async function startOnline() {
  const d = onlineDoc; if (!d || d.host !== myId || ![2, 3, 4, 6].includes(d.players.length)) return;
  const doc = Object.assign({}, d, { status: 'playing', state: E.create(d.players.map(seatOf), { rule: d.rule }), updated: Date.now() });
  const { error } = await sb.from('games').update({ doc, status: 'playing', updated_at: new Date().toISOString() }).eq('code', onlineCode).eq('status', 'lobby');
  if (error) toast(tableErr(error)); else fetchGame(onlineCode);
}
async function onlineRematch() {
  const d = onlineDoc; if (!d || d.host !== myId || !d.state) return;
  // refresh everyone's rank badge for the new game
  let players = d.state.players.map(seatOf);
  const { data } = await sb.from('profiles').select('id,display_name,crest,color,wins').in('id', players.map(p => p.id));
  if (data) players = players.map(p => { const q = data.find(x => x.id === p.id); return q ? { id: p.id, name: q.display_name, crest: q.crest, color: q.color, wins: q.wins } : p; });
  const doc = Object.assign({}, d, { status: 'playing', state: E.create(players, { rule: d.state.rule }), updated: Date.now() });
  const { error } = await sb.from('games').update({ doc, status: 'playing', updated_at: new Date().toISOString() }).eq('code', onlineCode);
  if (error) toast(tableErr(error)); else fetchGame(onlineCode);
}
async function leaveLobby() {
  const code = onlineCode;
  store.set('online', null);
  leaveOnlineWatch();
  renderOnlinePanel();
  if (code && sb) { await sb.rpc('leave_game', { p_code: code }); refreshOpen(); }
}
// Every player's browser reports the finished game; the database only counts it once.
async function recordOnlineResult() {
  if (!sb || !user || !onlineCode || !G || G.winner === -1 || recordedGid === G.gid) return;
  const gid = G.gid, code = onlineCode; recordedGid = gid;
  const before = me ? me.wins : 0, oldRank = rankFor(before);
  lastResult = { gid, html: '<p class="note">Recording the result…</p>' }; paintResult();
  let res;
  for (let k = 0; k < 3; k++) { res = await sb.rpc('record_result', { p_code: code }); if (!res.error) break; await sleep(1500); }
  if (res.error) { recordedGid = null; lastResult = { gid, html: '<p class="note">The result could not be saved yet. It will be saved when you open this table again.</p>' }; paintResult(); return; }
  await loadMe(); boardAt = 0; recentData = null;
  const data = res.data || {};
  let html;
  if (!data.ranked) html = '<p class="note">Unranked game. Ranked games need at least 10 moves between two or more accounts.</p>';
  else {
    const now = me ? me.wins : before, nr = rankFor(now), nx = nextRank(now);
    if (now > before && nr.key !== oldRank.key) {
      html = `<div class="rankup rk-${nr.key}">${rankIcon(nr.key, 'rk')}<div class="note">You rose to a new rank</div><div class="big">${esc(nr.name)}</div><div class="note">${plural(now, 'ranked win')}${nx ? ` · ${nx.wins - now} more to ${esc(nx.name)}` : ''}</div></div>`;
      setTimeout(() => { Sound.seq(); FX.rain(FX.colors(), 1800); }, 600);
    } else if (now > before) html = `<p class="note">+1 ranked win · ${plural(now, 'win')} total · ${rankHTML(now, true)}${nx ? ` · ${nx.wins - now} more to ${esc(nx.name)}` : ''}</p>`;
    else html = `<p class="note">Ranked game recorded · ${rankHTML(now, true)} · ${plural(now, 'win')}</p>`;
  }
  lastResult = { gid, html }; paintResult();
}
function paintResult() { const slot = $('#rankedSlot'); if (slot && lastResult && G && lastResult.gid === G.gid) slot.innerHTML = lastResult.html; }

/* ---------------- events ---------------- */
function selectTab(id) {
  ['cpu', 'local', 'online'].forEach(t => { $('#tab-' + t).setAttribute('aria-selected', t === id); $('#p-' + t).hidden = t !== id; });
  store.set('tab', id);
  if (id === 'online') { if (onlineState === 'ready') refreshOpen(); else if (onlineState !== 'init' || user) initOnline(); }
}
document.querySelector('#menu .tabs').addEventListener('click', e => { const b = e.target.closest('button'); if (b) selectTab(b.id.slice(4)); });
['cpuMatch', 'cpuLevel', 'localCount', 'cpuRule', 'localRule'].forEach(id => $('#' + id).addEventListener('click', e => {
  const b = e.target.closest('button'); if (!b) return;
  setSeg(id, b.dataset.v);
  if (id === 'localCount') { renderLocalNames(); ruleNote('localRule', localCount()); }
  if (id === 'cpuMatch') ruleNote('cpuRule', b.dataset.v === '3way' ? 3 : 2);
  if (id === 'cpuRule' || id === 'localRule') { store.set('rule', b.dataset.v); ruleNote(id, id === 'cpuRule' ? (segVal('cpuMatch') === '3way' ? 3 : 2) : localCount()); }
}));
$('#onlineRule').addEventListener('click', e => {
  const b = e.target.closest('button'); if (!b || b.disabled || !onlineDoc || onlineDoc.host !== myId) return;
  setOnlineRule(b.dataset.v);
});
function setSeg(id, v) { $('#' + id).querySelectorAll('button').forEach(x => x.setAttribute('aria-pressed', x.dataset.v === v)); }
function ruleNote(id, players) {
  const three = E.teamsFor(players) === 3;
  $('#' + id).parentElement.querySelector('.rule-note').textContent = segVal(id) === 'full'
    ? 'Keep playing until the board is full or the cards run out. Most sequences wins; a tie goes to the team with more chips on the board.'
    : `The first team to finish ${three ? 'one sequence' : 'two sequences'} wins${three ? ' (three teams need one)' : ''}.`;
}
async function setOnlineRule(v) {
  setSeg('onlineRule', v); ruleNote('onlineRule', onlineDoc.players.length);
  const { error } = await sb.rpc('set_game_rule', { p_code: onlineCode, p_rule: v });
  if (error) toast('Could not change the game length. Run the latest supabase-setup.sql, then try again.');
  fetchGame(onlineCode);
}
$('#btnStartCpu').onclick = () => startCpu();
$('#btnStartLocal').onclick = () => startLocal();
$('#btnContinue').onclick = continueSaved;
$('#btnCreate').onclick = createTable;
$('#btnJoin').onclick = () => joinTable($('#joinCode').value);
$('#joinCode').addEventListener('keydown', e => { if (e.key === 'Enter') joinTable($('#joinCode').value); });
$('#openList').addEventListener('click', e => { const b = e.target.closest('[data-join]'); if (b) joinTable(b.dataset.join); });
$('#btnRejoin').onclick = () => { const c = store.get('online', null); if (c) joinTable(c); };
$('#btnStartOnline').onclick = startOnline;
$('#btnLeaveLobby').onclick = leaveLobby;
$('#btnCopy').onclick = () => {
  const code = onlineDoc ? onlineDoc.code : '';
  const link = inviteLink(code);
  const fail = () => { selectText($('#lobbyCode')); toast('Copy this link: ' + link); };
  try { navigator.clipboard.writeText(link).then(() => toast('Invite link copied. Send it to your friends.'), fail); }
  catch (e) { fail(); }
};
function selectText(el) { const r = document.createRange(); r.selectNodeContents(el); const s = getSelection(); s.removeAllRanges(); s.addRange(r); }
$('#themeTiles').addEventListener('click', e => { const b = e.target.closest('.theme-tile'); if (b) setSkin(b.dataset.k); });
$('#skinDots').addEventListener('click', e => { const b = e.target.closest('.skin-dot'); if (b) setSkin(b.dataset.k); });
$('#soundBtn').onclick = () => { Sound.on = !Sound.on; store.set('sound', Sound.on); $('#soundBtn').classList.toggle('off', !Sound.on); if (Sound.on) Sound.tick(); };
$('#soundBtn').classList.toggle('off', !Sound.on);
$('#rulesBtn').onclick = () => show('#rules');
$('#rulesClose').onclick = () => hide('#rules');
$('#rules').addEventListener('click', e => { if (e.target.id === 'rules') hide('#rules'); });
$('#brandBtn').onclick = () => {
  if (!$('#game').hidden) toMenu();
  else if (!$('#hall').hidden) { if (mode && G) showScreen('game'); else showScreen('menu'); }
  else if (!$('#auth').hidden && (user || sess.get('ff-guest') === '1')) showScreen('menu');
};
$('#btnMenu').onclick = toMenu;
let restartArmed = null;
$('#btnRestart').onclick = () => {
  const b = $('#btnRestart');
  if (G && G.winner !== -1) { restart(); return; }
  if (restartArmed) { clearTimeout(restartArmed); restartArmed = null; b.textContent = 'New game'; restart(); return; }
  b.textContent = 'Tap again to deal a new game';
  restartArmed = setTimeout(() => { restartArmed = null; b.textContent = 'New game'; }, 3000);
};

$('#hand').addEventListener('click', e => {
  const b = e.target.closest('.hcard'); if (!b || !G) return;
  if (!handVisible) return;
  const hi = +b.dataset.hi;
  if (!canActNow()) { peek(hi); return; }
  sel = sel && sel.hi === hi ? null : { hi, cell: null };
  Sound.tick();
  clearPeek(); renderBoard(false); renderHand(); renderActions();
});
const canHover = matchMedia('(hover: hover)').matches;
$('#hand').addEventListener('mouseover', e => { if (!canHover) return; const b = e.target.closest('.hcard'); if (b && handVisible && !sel) peek(+b.dataset.hi); });
$('#hand').addEventListener('mouseleave', clearPeek);
function peek(hi) {
  clearPeek();
  const c = myHand()[hi]; if (!c || E.isJack(c)) return;
  (E.POS[c] || []).forEach(i => cells[i].classList.add('peek'));
}
function clearPeek() { cells.forEach(c => c.classList.remove('peek')); }
grid.addEventListener('click', e => {
  const c = e.target.closest('.cell'); if (!c || !sel || !canActNow()) return;
  const i = +c.dataset.i, card = myHand()[sel.hi];
  if (!card || !E.targets(G, card, myTeam()).includes(i)) return;
  if (sel.cell === i) { commit(); return; }
  sel.cell = i; Sound.tick();
  renderBoard(false); renderActions();
});
grid.addEventListener('keydown', e => { if ((e.key === 'Enter' || e.key === ' ') && e.target.classList.contains('cell')) { e.preventDefault(); e.target.click(); } });
$('#actions').addEventListener('click', e => {
  const b = e.target.closest('[data-act]'); if (!b) return;
  const a = b.dataset.act;
  if (a === 'place') commit();
  else if (a === 'cancel') { sel = null; renderBoard(false); renderHand(); renderActions(); }
  else if (a === 'swap') doSwap();
  else if (a === 'pass') doPass();
  else if (a === 'result') showVictory();
  else if (a === 'reveal') reveal();
});
document.addEventListener('keydown', e => {
  if (e.key === 'Escape') {
    const open = ['#rules', '#editProf', '#cardModal'].find(id => !$(id).hidden);
    if (open) hide(open); else if (sel) { sel = null; renderBoard(false); renderHand(); renderActions(); }
  }
  if (e.key === 'Enter' && sel && sel.cell != null && !(e.target.closest && e.target.closest('input'))) commit();
});
let rz, lastW = innerWidth;
addEventListener('resize', () => {
  if (innerWidth === lastW) return; // phones fire resize when the address bar slides; ignore height-only changes
  lastW = innerWidth;
  clearTimeout(rz); rz = setTimeout(() => { sizeBoard(); if (G) renderHand(); }, 80);
});
addEventListener('orientationchange', () => setTimeout(() => { lastW = innerWidth; sizeBoard(); if (G) renderHand(); }, 250));
document.addEventListener('visibilitychange', () => { if (!document.hidden && onlineCode && sb) fetchGame(onlineCode); });
// accounts, profile and leaderboard
$('#meBtn').onclick = () => (user ? openHall('me') : showScreen('auth'));
$('#meStrip').onclick = () => (user ? openHall('me') : showScreen('auth'));
$('#au-in').onclick = () => setAuthMode('in');
$('#au-up').onclick = () => setAuthMode('up');
$('#authForm').addEventListener('submit', submitAuth);
$('#btnGuest').onclick = playAsGuest;
$('#btnOnlineSignin').onclick = () => { showScreen('auth'); setAuthMode('in'); };
$('#hall-me').onclick = () => setHallTab('me');
$('#hall-board').onclick = () => { setHallTab('board'); loadBoard(); };
$('#hallMe').addEventListener('click', e => {
  const b = e.target.closest('[data-h]'); if (!b) return;
  const h = b.dataset.h;
  if (h === 'edit') openEdit();
  else if (h === 'out') signOut();
  else if (h === 'play') showScreen('menu');
  else if (h === 'back') showScreen('game');
});
$('#boardList').addEventListener('click', e => { const li = e.target.closest('li[data-id]'); if (li) showPlayerCard(li.dataset.id); });
$('#btnBoardRefresh').onclick = () => loadBoard(true);
$('#edCancel').onclick = () => hide('#editProf');
$('#editProf').addEventListener('click', e => { if (e.target.id === 'editProf') hide('#editProf'); });
$('#cardModal').addEventListener('click', e => { if (e.target.id === 'cardModal' || e.target.closest('[data-close]')) hide('#cardModal'); });
let dockH = 0;
if (window.ResizeObserver) new ResizeObserver(() => { const hb = document.querySelector('.hand-box'); if (hb.offsetHeight === dockH) return; dockH = hb.offsetHeight; document.documentElement.style.setProperty('--dock', dockH + 'px'); if (phone()) sizeBoard(); }).observe(document.querySelector('.hand-box'));
let endArmed = null;
$('#btnEnd').onclick = async () => {
  const b = $('#btnEnd');
  if (!G || G.winner !== -1) return;
  if (!endArmed) { b.textContent = 'Tap again to end now'; endArmed = setTimeout(() => { endArmed = null; b.textContent = 'End game'; }, 3000); return; }
  clearTimeout(endArmed); endArmed = null; b.textContent = 'End game';
  clearTimeout(cpuTimer);
  sel = null;
  await pushState(E.endNow(G, viewSeat));
};


/* ---------------- boot ---------------- */
buildBoard();
setSkin(skin);
renderLocalNames();
['cpuRule', 'localRule'].forEach(id => setSeg(id, store.get('rule', 'race')));
ruleNote('cpuRule', 2); ruleNote('localRule', localCount());
$('#rulesLadder').innerHTML = ladderItems(null);
renderAuthExtras();
setAuthMode('in');
renderMe();
renderOnlinePanel();
selectTab(store.get('tab', 'cpu'));
if (inviteCode) { history.replaceState(null, '', location.pathname); sess.set('ff-invite', inviteCode); }
showScreen(document.documentElement.dataset.boot === 'menu' ? 'menu' : 'auth');
document.documentElement.classList.add('ready');
initAccounts().then(() => {
  if (user) {
    if (!$('#auth').hidden) showScreen('menu');
    initOnline().then(() => {
      const inv = sess.get('ff-invite');
      if (inv) { sess.set('ff-invite', null); selectTab('online'); $('#joinCode').value = inv; joinTable(inv); }
    });
  } else {
    onlineState = sb ? 'signin' : 'off'; renderOnlinePanel();
    const inv = sess.get('ff-invite');
    if (inv) { showScreen('auth'); authMsg(`Sign in or create an account to join table ${inv}.`, true); }
    else if (sess.get('ff-guest') !== '1' && !$('#menu').hidden) showScreen('auth');
    if (!sb) authMsg("Accounts can't be reached right now. You can still play as a guest.");
  }
});
})();
