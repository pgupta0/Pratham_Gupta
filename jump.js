/* Game 2: a side-scrolling platformer. An original pixel runner in a black
   suit runs through eight zones, one per chapter. Hitting a zone's glowing
   block from below opens that chapter; skill tokens float along the way and
   "friction bugs" walk the ground, waiting to be stomped (fixed). */
import { CHECKPOINTS } from './game-data.js';
import { keys, isPaused, bindTouch, showCard, showFinish, toast, intro, touchDevice } from './game-ui.js';

const $ = id => document.getElementById(id);
const clamp = (v, a, b) => Math.min(b, Math.max(a, v));
const RM = matchMedia('(prefers-reduced-motion: reduce)').matches;

/* ---------- level ---------- */
const T = 48, ROWS = 14, GROUND = 12, ZW = 44, START = 12, FIN = 30;
const ZONES = CHECKPOINTS.filter(c => !c.finish);
const FINISH = CHECKPOINTS.find(c => c.finish);
const W = START + ZONES.length * ZW + FIN;
const map = Array.from({ length: ROWS }, () => new Array(W).fill(0));
const set = (x, y, t) => { if (x >= 0 && x < W && y >= 0 && y < ROWS) map[y][x] = t; };
const solid = t => t && t !== 0;
const tokens = [], bugs = [], blocks = [], buses = [], signs = [];
const zoneOfX = px => clamp(Math.floor((px / T - START) / ZW), -1, ZONES.length);

for (let x = 0; x < W; x++) { set(x, GROUND, 'g'); set(x, GROUND + 1, 'g'); }
// the walls at both ends
for (let y = 0; y < GROUND; y++) { set(0, y, 'w'); set(W - 1, y, 'w'); }

ZONES.forEach((cp, z) => {
  const x0 = START + z * ZW;
  signs.push({ x: (x0 + 2) * T, cp, z });
  // the chapter block
  set(x0 + 10, 8, 'i'); blocks.push({ tx: x0 + 10, ty: 8, cp, z, hit: false, bump: 0 });
  // a gap to clear (not in the first zone)
  if (z > 0) for (let x = x0 + 27; x <= x0 + 29; x++) { set(x, GROUND, 0); set(x, GROUND + 1, 0); }
  // step A (zone-flavoured) and step B, higher up
  let bY = 6;
  if (cp.id === 'htl') { for (let x = x0 + 16; x <= x0 + 21; x++) { set(x, 10, 'b'); set(x, 11, 'b'); } buses.push({ x: (x0 + 16) * T, y: 10 * T, w: 6 * T, h: 2 * T }); bY = 7; }
  else if (cp.id === 'bb') { [[17, 10], [17, 11], [18, 10], [18, 11], [19, 11], [20, 11], [16, 11]].forEach(([dx, y]) => set(x0 + dx, y, 'c')); bY = 7; }
  else if (cp.id === 'lss') { set(x0 + 15, 11, 'p'); set(x0 + 16, 10, 'p'); for (let x = x0 + 17; x <= x0 + 21; x++) set(x, 9, 'p'); }
  else for (let x = x0 + 17; x <= x0 + 21; x++) set(x, 9, 'p');
  for (let x = x0 + 23; x <= x0 + 26; x++) set(x, bY, 'p');
  // skills to collect
  const spots = [[x0 + 19, cp.id === 'htl' || cp.id === 'bb' ? 8 : 7.5], [x0 + 24.5, bY - 1.5], [x0 + 28, 9], [x0 + 35, 10.5]];
  cp.skills.forEach((s, k) => { const [tx, ty] = spots[k % spots.length]; tokens.push({ x: tx * T + T / 2, y: ty * T, label: s, color: cp.color, got: false, ph: k }); });
  // friction bugs
  if (z > 0) bugs.push({ x: (x0 + 13) * T, y: GROUND * T - 30, min: (x0 + 11.5) * T, max: (x0 + 15.5) * T, dir: -1, alive: true, sq: 0 });
  if (z > 2) bugs.push({ x: (x0 + 36) * T, y: GROUND * T - 30, min: (x0 + 31) * T, max: (x0 + 40) * T, dir: 1, alive: true, sq: 0 });
});
const FX = (START + ZONES.length * ZW) * T;      // finish zone starts here
const POLE = FX + 9 * T;
for (let x = FX / T + 3; x <= FX / T + 5; x++) set(x, 11, 'p');

/* ---------- canvas ---------- */
const cv = $('cv'), g = cv.getContext('2d');
let dpr = 1, scale = 1, offY = 0, viewW = 0, viewH = 0;
function resize() {
  dpr = Math.min(devicePixelRatio || 1, 2);
  cv.width = Math.round(innerWidth * dpr); cv.height = Math.round(innerHeight * dpr);
  const padB = document.documentElement.classList.contains('touch') ? 150 : 0;
  scale = Math.min(innerHeight / (ROWS * T), innerWidth / (9 * T));
  offY = innerHeight - padB - ROWS * T * scale;
  viewW = innerWidth / scale; viewH = innerHeight / scale;
}
resize(); addEventListener('resize', resize);

/* ---------- the runner (original pixel sprite, black suit, orange pocket square) ---------- */
const PAL = { H: '#1b1411', S: '#c98e6b', s: '#a8724f', E: '#1b1411', W: '#f3f3f3', K: '#17181e', k: '#2a2c35', A: '#FF5A1F', B: '#0a0a0b' };
const TOP = [
  '....HHHH....',
  '...HHHHHH...',
  '..HHHHHHHH..',
  '..HHSSSSHH..',
  '..HSSSSESS..',
  '..HSSSSSSS..',
  '...SSSSsS...',
  '....SSSS....',
  '..KKKWWkKK..',
  '.KKKKWWkKKK.',
  '.KKKKWkKAKK.',
  '.KKKKKkKKKK.',
  '.SKKKKkKKKS.',
  '..KKKKKKKK..',
];
const LEGS = {
  stand: ['..KKKKKKKK..', '...KKK.KKK..', '...KKK.KKK..', '...KKK.KKK..', '...KKK.KKK..', '..BBBB.BBBB.'],
  a: ['..KKKKKKKK..', '..KKK..KKK..', '.KKK....KKK.', '.KKK....KKK.', 'KKK......KKK', 'BBB......BBB'],
  b: ['..KKKKKKKK..', '...KKKKKK...', '....KKKK....', '....KKKK....', '....KKKK....', '...BBBBBB...'],
  jump: ['..KKKKKKKK..', '..KKK.KKKK..', '.KKK...KKK..', '.BBK....KK..', '........BB..', '............'],
};
const PX = 3; // world pixels per sprite pixel
function drawRunner(x, y, face, frame, blink) {
  const rows = TOP.concat(LEGS[frame]);
  g.save(); g.translate(Math.round(x), Math.round(y));
  if (face < 0) { g.translate(12 * PX, 0); g.scale(-1, 1); }
  if (blink) g.globalAlpha = .45;
  // soft outline so he reads on any background
  g.fillStyle = '#00000066';
  rows.forEach((r, j) => { for (let i = 0; i < 12; i++) if (r[i] !== '.') g.fillRect(i * PX - 1, j * PX - 1, PX + 2, PX + 2); });
  rows.forEach((r, j) => { for (let i = 0; i < 12; i++) { const c = r[i]; if (c !== '.') { g.fillStyle = PAL[c]; g.fillRect(i * PX, j * PX, PX, PX); } } });
  g.restore();
}

/* ---------- state ---------- */
const P = { x: 3 * T, y: GROUND * T - 60, w: 28, h: 60, vx: 0, vy: 0, face: 1, ground: false, coyote: 0, buffer: 0, inv: 0, run: 0, respawn: 3 * T };
const S = { found: 0, skills: 0, fixed: 0, finishArmed: true, started: false };
const TOTAL = ZONES.length;
const particles = [];
$('dots').innerHTML = ZONES.map(c => `<i style="--c:${c.color}"></i>`).join('');
const dotEls = [...$('dots').children];
function hud() {
  $('cnt').textContent = `${S.found} / ${TOTAL}`; $('sk').textContent = `${S.skills} / ${tokens.length}`; $('fx').textContent = S.fixed;
  blocks.forEach((b, k) => dotEls[k].classList.toggle('got', b.hit));
}
hud();

const tileAt = (px, py) => { const tx = Math.floor(px / T), ty = Math.floor(py / T); if (tx < 0 || tx >= W) return 'w'; if (ty < 0 || ty >= ROWS) return 0; return map[ty][tx]; };

function burst(x, y, color, n = 10, sp = 220) {
  if (RM) return;
  for (let i = 0; i < n; i++) { const a = Math.random() * Math.PI * 2, v = sp * (.4 + Math.random() * .6); particles.push({ x, y, vx: Math.cos(a) * v, vy: Math.sin(a) * v - 120, life: .6 + Math.random() * .3, color }); }
}

async function hitBlock(b) {
  if (b.hit) { b.bump = 1; return; }
  b.hit = true; b.bump = 1; map[b.ty][b.tx] = 'u';
  burst((b.tx + .5) * T, b.ty * T, b.cp.color, 16, 260);
  S.found = blocks.filter(x => x.hit).length; hud();
  await showCard(b.cp, { found: S.found, total: TOTAL, verb: 'Keep running' });
  if (S.found === TOTAL) toast('All chapters found. Run for the finish', '#FF5A1F');
}

/* ---------- physics ---------- */
const GRAV = 2600, JUMP = 1060, RUN = 340;
let jumpHeld = false;
function step(dt) {
  const L = keys.left, R = keys.right, J = keys.jump || keys.up;
  // run
  const acc = P.ground ? 2000 : 1300;
  if (L && !R) { P.vx -= acc * dt; P.face = -1; } else if (R && !L) { P.vx += acc * dt; P.face = 1; }
  else { const f = (P.ground ? 2400 : 500) * dt; P.vx = Math.abs(P.vx) <= f ? 0 : P.vx - Math.sign(P.vx) * f; }
  P.vx = clamp(P.vx, -RUN, RUN);
  // jump with a little forgiveness either side of leaving a ledge
  P.coyote = P.ground ? .1 : P.coyote - dt;
  if (J && !jumpHeld) P.buffer = .12; else P.buffer -= dt;
  jumpHeld = J;
  if (P.buffer > 0 && P.coyote > 0) { P.vy = -JUMP; P.buffer = 0; P.coyote = 0; P.ground = false; }
  P.vy += GRAV * (P.vy < 0 && !J ? 2.3 : 1) * dt;
  P.vy = Math.min(P.vy, 1400);

  // move x, then y, against the tiles
  P.x += P.vx * dt;
  for (const yy of [P.y + 2, P.y + P.h / 2, P.y + P.h - 2]) {
    if (P.vx > 0 && solid(tileAt(P.x + P.w, yy))) { P.x = Math.floor((P.x + P.w) / T) * T - P.w - .01; P.vx = 0; }
    if (P.vx < 0 && solid(tileAt(P.x, yy))) { P.x = (Math.floor(P.x / T) + 1) * T + .01; P.vx = 0; }
  }
  P.y += P.vy * dt; P.ground = false;
  const xs = [P.x + 3, P.x + P.w - 3];
  if (P.vy >= 0) {
    for (const xx of xs) if (solid(tileAt(xx, P.y + P.h))) { P.y = Math.floor((P.y + P.h) / T) * T - P.h; P.vy = 0; P.ground = true; break; }
  } else {
    // head hit: pick the block nearest the middle of the runner
    const hx = [P.x + P.w / 2, ...xs];
    for (const xx of hx) {
      const t = tileAt(xx, P.y);
      if (solid(t)) {
        P.y = (Math.floor(P.y / T) + 1) * T; P.vy = 60;
        const tx = Math.floor(xx / T), ty = Math.floor((P.y - 1) / T);
        const b = blocks.find(b => b.tx === tx && b.ty === ty);
        if (b) hitBlock(b);
        break;
      }
    }
  }
  P.run += Math.abs(P.vx) * dt;

  // fell into a gap: back to the start of this zone
  if (P.y > ROWS * T + 200) {
    const z = zoneOfX(P.x);
    P.x = z < 0 ? 3 * T : z >= ZONES.length ? FX + T : (START + z * ZW + 1) * T; P.y = GROUND * T - P.h - 40; P.vx = P.vy = 0; P.inv = 1;
    toast('Missed the jump. Back to the pit', '#FFC857');
  }
  P.inv = Math.max(0, P.inv - dt);

  // skills
  for (const t of tokens) {
    if (t.got) continue;
    if (Math.abs(t.x - (P.x + P.w / 2)) < 26 && Math.abs(t.y - (P.y + P.h / 2)) < 48) {
      t.got = true; S.skills++; hud(); burst(t.x, t.y, t.color, 10, 180); toast('+ ' + t.label, t.color);
    }
  }
  // friction bugs
  for (const b of bugs) {
    if (!b.alive) { b.sq += dt; continue; }
    b.x += b.dir * 70 * dt; if (b.x < b.min) { b.x = b.min; b.dir = 1; } if (b.x > b.max) { b.x = b.max; b.dir = -1; }
    const bw = 38, bh = 30;
    if (P.x < b.x + bw && P.x + P.w > b.x && P.y < b.y + bh && P.y + P.h > b.y) {
      if (P.vy > 50 && P.y + P.h - b.y < 26) {
        b.alive = false; P.vy = -680; S.fixed++; hud(); burst(b.x + bw / 2, b.y + 10, '#2EF2C3', 14, 240); toast('Friction fixed', '#2EF2C3');
      } else if (!P.inv) {
        P.inv = 1.3; P.vx = (P.x + P.w / 2 < b.x + bw / 2 ? -1 : 1) * 420; P.vy = -480; toast('Ouch. That was friction', '#FF5A1F');
      }
    }
  }
  // finish
  if (P.x > POLE && S.finishArmed) { S.finishArmed = false; finish(); }
  if (P.x < POLE - 4 * T) S.finishArmed = true;
}

async function finish() {
  burst(POLE, 5 * T, '#FF5A1F', 24, 320);
  const r = await showFinish({ found: S.found, total: TOTAL, other: 'drive.html', otherName: 'the driving game', again: null });
  if (r === 'again' && S.found >= TOTAL) location.reload();
}

/* ---------- drawing ---------- */
const mix = (a, b, t) => { const p = h => [1, 3, 5].map(i => parseInt(h.slice(i, i + 2), 16)); const A = p(a), B = p(b); return `rgb(${A.map((v, i) => Math.round(v + (B[i] - v) * t)).join(',')})`; };
const rnd = s => { const x = Math.sin(s * 127.1) * 43758.5453; return x - Math.floor(x); };
function zoneColor(px) {
  const f = (px / T - START) / ZW - .5, z = clamp(Math.floor(f), 0, ZONES.length - 1), t = clamp(f - z, 0, 1);
  if (px / T < START + ZW / 2) return ZONES[0].color;
  if (f >= ZONES.length - 1) return px >= FX ? FINISH.color : ZONES[ZONES.length - 1].color;
  return mix(ZONES[z].color, ZONES[Math.min(z + 1, ZONES.length - 1)].color, t * t * (3 - 2 * t));
}

function drawBackground(camX, time) {
  const col = zoneColor(camX + viewW / 2);
  const top = -offY / scale - 10;
  const sky = g.createLinearGradient(0, top, 0, ROWS * T);
  sky.addColorStop(0, '#060509'); sky.addColorStop(1, '#130d0a');
  g.fillStyle = sky; g.fillRect(camX - 10, top, viewW + 20, viewH + 20);
  // a glow on the horizon in the zone's colour
  const hz = g.createRadialGradient(camX + viewW / 2, GROUND * T, 20, camX + viewW / 2, GROUND * T, Math.max(viewW, 700) * .8);
  hz.addColorStop(0, hexA(col, .3)); hz.addColorStop(1, hexA(col, 0));
  g.fillStyle = hz; g.fillRect(camX - 10, top, viewW + 20, viewH + 20);
  // stars
  g.fillStyle = '#ffffff';
  for (let i = 0; i < 60; i++) { const sx = camX * .05 + rnd(i) * viewW * 1.2, sy = rnd(i + 99) * GROUND * T * .55; g.globalAlpha = .15 + rnd(i + 7) * .4; g.fillRect(((sx - camX * .05) % (viewW * 1.2)) + camX - 20, sy, 2, 2); }
  g.globalAlpha = 1;
  // two layers of skyline, slower than the ground
  [[.25, 70, 260, '#0f0b0c', .5], [.5, 110, 200, '#151012', .8]].forEach(([par, step, maxH, fill, win], L) => {
    const base = camX * par, i0 = Math.floor(base / step) - 1, i1 = i0 + Math.ceil(viewW / step) + 3;
    for (let i = i0; i < i1; i++) {
      const h = 60 + rnd(i * 3.1 + L * 50) * maxH, w = step * (.65 + rnd(i + L * 9) * .3);
      const x = camX + (i * step - base), y = GROUND * T - h;
      g.fillStyle = fill; g.fillRect(x, y, w, h);
      g.fillStyle = hexA(col, .18 * win);
      for (let wy = y + 12; wy < GROUND * T - 14; wy += 16) for (let wx = x + 8; wx < x + w - 8; wx += 14) if (rnd(wx * .13 + wy * .7 + i) < .35) g.fillRect(wx, wy, 6, 7);
    }
  });
}
const hexA = (hex, a) => { if (hex[0] !== '#') return hex.replace('rgb(', 'rgba(').replace(')', `,${a})`); const n = parseInt(hex.slice(1), 16); return `rgba(${n >> 16},${(n >> 8) & 255},${n & 255},${a})`; };

function rr(x, y, w, h, r) { g.beginPath(); g.moveTo(x + r, y); g.arcTo(x + w, y, x + w, y + h, r); g.arcTo(x + w, y + h, x, y + h, r); g.arcTo(x, y + h, x, y, r); g.arcTo(x, y, x + w, y, r); g.closePath(); }

function drawSign(s) {
  const x = s.x, cp = s.cp, bw = 330, bh = 92, by = 4.4 * T;
  g.fillStyle = '#2a2420'; g.fillRect(x + 24, by + bh, 8, GROUND * T - by - bh); g.fillRect(x + bw - 32, by + bh, 8, GROUND * T - by - bh);
  rr(x, by, bw, bh, 12); g.fillStyle = '#0b0907ee'; g.fill(); g.lineWidth = 3; g.strokeStyle = cp.color; g.stroke();
  g.fillStyle = cp.color; g.font = '700 15px "JetBrains Mono", ui-monospace, monospace'; g.textBaseline = 'top';
  g.fillText((cp.rows ? 'BONUS · ' : `PIT STOP ${cp.n} · `) + cp.when.toUpperCase(), x + 18, by + 16);
  g.fillStyle = '#F2F4F8'; let f = 26; g.font = `700 ${f}px "Bricolage Grotesque", system-ui, sans-serif`;
  while (g.measureText(cp.title).width > bw - 36 && f > 15) { f--; g.font = `700 ${f}px "Bricolage Grotesque", system-ui, sans-serif`; }
  g.fillText(cp.title, x + 18, by + 44);
}

function drawTiles(camX, time) {
  const x0 = Math.max(0, Math.floor(camX / T) - 1), x1 = Math.min(W - 1, Math.ceil((camX + viewW) / T) + 1);
  for (let ty = 0; ty < ROWS; ty++) for (let tx = x0; tx <= x1; tx++) {
    const t = map[ty][tx]; if (!t) continue;
    const x = tx * T, y = ty * T, col = zoneColor(x);
    if (t === 'g') {
      g.fillStyle = '#17110e'; g.fillRect(x, y, T, T);
      g.fillStyle = '#1f1713'; if ((tx + ty) % 2) g.fillRect(x + 6, y + 14, 14, 8);
      if (ty === GROUND && map[ty - 1][tx] !== 'g') { g.fillStyle = col; g.fillRect(x, y, T, 7); g.fillStyle = '#00000040'; g.fillRect(x, y + 7, T, 3); }
    } else if (t === 'p') {
      rr(x + 1, y + 2, T - 2, T - 6, 8); g.fillStyle = '#211915'; g.fill();
      g.fillStyle = col; g.fillRect(x + 4, y + 2, T - 8, 6);
    } else if (t === 'c') {
      g.fillStyle = '#5b3d22'; g.fillRect(x + 1, y + 1, T - 2, T - 2); g.strokeStyle = '#3b2615'; g.lineWidth = 4; g.strokeRect(x + 4, y + 4, T - 8, T - 8);
      g.beginPath(); g.moveTo(x + 6, y + 6); g.lineTo(x + T - 6, y + T - 6); g.stroke();
    } else if (t === 'w') {
      g.fillStyle = '#0d0a08'; g.fillRect(x, y, T, T);
    } else if (t === 'i' || t === 'u') {
      const b = blocks.find(b => b.tx === tx && b.ty === ty), by = y - (b ? Math.sin(b.bump * Math.PI) * 10 : 0), c2 = b ? b.cp.color : col;
      if (t === 'i') {
        const pulse = .55 + Math.sin(time * 4 + tx) * .25;
        g.save(); g.shadowColor = c2; g.shadowBlur = 24 * pulse; rr(x + 2, by + 2, T - 4, T - 4, 10); g.fillStyle = c2; g.fill(); g.restore();
        rr(x + 6, by + 6, T - 12, T - 12, 7); g.strokeStyle = '#0b090755'; g.lineWidth = 2; g.stroke();
        // an "i" for info
        g.fillStyle = '#0b0907'; g.beginPath(); g.arc(x + T / 2, by + 15, 3.6, 0, Math.PI * 2); g.fill(); rr(x + T / 2 - 3.5, by + 21, 7, 16, 2); g.fill();
      } else {
        rr(x + 2, by + 2, T - 4, T - 4, 10); g.fillStyle = '#2a2420'; g.fill(); g.strokeStyle = hexA(c2, .7); g.lineWidth = 2; g.stroke();
        g.strokeStyle = c2; g.lineWidth = 4; g.lineCap = 'round'; g.beginPath(); g.moveTo(x + 15, by + 25); g.lineTo(x + 22, by + 32); g.lineTo(x + 34, by + 17); g.stroke();
      }
    }
  }
  // buses (solid, drawn as one vehicle)
  for (const b of buses) {
    if (b.x > camX + viewW || b.x + b.w < camX) continue;
    rr(b.x, b.y + 4, b.w, b.h - 18, 14); g.fillStyle = '#FFC23D'; g.fill();
    g.fillStyle = '#d99a17'; g.fillRect(b.x + 4, b.y + b.h - 34, b.w - 8, 8);
    g.fillStyle = '#1d2433'; for (let k = 0; k < 5; k++) rr(b.x + 14 + k * 54, b.y + 14, 44, 26, 5), g.fill();
    g.fillStyle = '#0b0907'; g.font = '700 13px "JetBrains Mono", monospace'; g.textBaseline = 'middle'; g.fillText('TRAVEL LINE', b.x + 16, b.y + 54);
    [b.x + 50, b.x + b.w - 50].forEach(wx => { g.fillStyle = '#0b0b0d'; g.beginPath(); g.arc(wx, b.y + b.h - 10, 15, 0, Math.PI * 2); g.fill(); g.fillStyle = '#6b6f7a'; g.beginPath(); g.arc(wx, b.y + b.h - 10, 6, 0, Math.PI * 2); g.fill(); });
    g.fillStyle = '#fff6cf'; g.fillRect(b.x + b.w - 8, b.y + 52, 6, 10);
  }
}

function drawBug(b, time) {
  const bw = 38, bh = 30, x = b.x, y = b.y;
  if (!b.alive) {
    if (b.sq > .5) return;
    g.globalAlpha = 1 - b.sq * 2; g.fillStyle = '#7a1d14'; rr(x, y + bh - 8, bw, 8, 4); g.fill(); g.globalAlpha = 1; return;
  }
  const bob = Math.sin(time * 10 + x) * 2;
  g.fillStyle = '#b8321f';
  g.beginPath(); for (let k = 0; k <= 8; k++) { const a = Math.PI + k * Math.PI / 8, r = k % 2 ? 22 : 17; g.lineTo(x + bw / 2 + Math.cos(a) * r, y + bh + bob * .2 + Math.sin(a) * r * 1.05); } g.closePath(); g.fill();
  g.fillStyle = '#7a1d14'; g.fillRect(x + 4, y + bh - 6, bw - 8, 6);
  g.fillStyle = '#fff'; const ex = b.dir > 0 ? 4 : -4;
  [-7, 7].forEach(o => { g.beginPath(); g.arc(x + bw / 2 + o + ex * .5, y + 13 + bob * .2, 5, 0, Math.PI * 2); g.fill(); });
  g.fillStyle = '#0b0907'; [-7, 7].forEach(o => { g.beginPath(); g.arc(x + bw / 2 + o + ex, y + 14 + bob * .2, 2.4, 0, Math.PI * 2); g.fill(); });
  g.strokeStyle = '#0b0907'; g.lineWidth = 2; g.beginPath(); g.moveTo(x + bw / 2 - 12, y + 6); g.lineTo(x + bw / 2 - 3, y + 9); g.moveTo(x + bw / 2 + 12, y + 6); g.lineTo(x + bw / 2 + 3, y + 9); g.stroke();
  // legs
  g.strokeStyle = '#7a1d14'; g.lineWidth = 3; const lp = Math.sin(time * 14 + x) * 3;
  g.beginPath(); g.moveTo(x + 10, y + bh); g.lineTo(x + 8 + lp, y + bh + 4); g.moveTo(x + bw - 10, y + bh); g.lineTo(x + bw - 8 - lp, y + bh + 4); g.stroke();
}

function drawToken(t, time) {
  if (t.got) return;
  const y = t.y + Math.sin(time * 3 + t.ph) * 5;
  g.save(); g.shadowColor = t.color; g.shadowBlur = 16;
  g.fillStyle = t.color; g.beginPath(); g.arc(t.x, y, 14, 0, Math.PI * 2); g.fill(); g.restore();
  g.strokeStyle = '#0b0907'; g.lineWidth = 3.2; g.lineCap = 'round';
  g.beginPath(); g.moveTo(t.x - 6, y); g.lineTo(t.x + 6, y); g.moveTo(t.x, y - 6); g.lineTo(t.x, y + 6); g.stroke();
}

function drawFinish(time) {
  if (FX > camLastX + viewW + 100) return;
  // "Your team." office
  const bx = FX + 13 * T, bw = 10 * T, bh = 7.5 * T, by = GROUND * T - bh;
  g.fillStyle = '#1a1412'; g.fillRect(bx, by, bw, bh);
  g.fillStyle = '#FF5A1F'; g.fillRect(bx, by, bw, 6);
  for (let r = 0; r < 5; r++) for (let c = 0; c < 8; c++) { g.fillStyle = rnd(r * 9 + c) < .6 ? '#ffcf8a55' : '#ffffff10'; g.fillRect(bx + 22 + c * 56, by + 26 + r * 52, 34, 30); }
  rr(bx + bw / 2 - 40, GROUND * T - 92, 80, 92, 6); g.fillStyle = '#FF5A1F'; g.fill();
  g.fillStyle = '#F2F4F8'; g.font = '800 34px "Bricolage Grotesque", system-ui, sans-serif'; g.textBaseline = 'alphabetic'; g.fillText('Your team.', bx + 22, by - 18);
  // flag
  g.fillStyle = '#d8dbe2'; g.fillRect(POLE - 3, 3 * T, 6, GROUND * T - 3 * T);
  g.beginPath(); g.arc(POLE, 3 * T - 6, 8, 0, Math.PI * 2); g.fill();
  const wv = RM ? 0 : Math.sin(time * 5) * 6;
  g.fillStyle = '#FF5A1F'; g.beginPath(); g.moveTo(POLE + 3, 3 * T + 4); g.quadraticCurveTo(POLE + 50, 3 * T + 16 + wv, POLE + 96, 3 * T + 22 + wv); g.lineTo(POLE + 3, 3 * T + 62); g.closePath(); g.fill();
  g.fillStyle = '#0b0907'; g.font = '700 18px "JetBrains Mono", monospace'; g.fillText('07', POLE + 14, 3 * T + 34);
}

function drawStartSign() {
  const x = 4 * T, y = 4.6 * T, w = 300, h = 120;
  rr(x, y, w, h, 12); g.fillStyle = '#0b0907e6'; g.fill(); g.strokeStyle = '#ffffff30'; g.lineWidth = 2; g.stroke();
  g.fillStyle = '#9AA1B2'; g.font = '700 14px "JetBrains Mono", monospace'; g.textBaseline = 'top'; g.fillText('HOW TO PLAY', x + 18, y + 16);
  g.fillStyle = '#F2F4F8'; g.font = '600 17px Inter, system-ui, sans-serif';
  g.fillText('Run right →', x + 18, y + 42); g.fillText('Hit glowing blocks from below', x + 18, y + 66); g.fillText('Stomp the friction bugs', x + 18, y + 90);
}

/* ---------- loop ---------- */
let camX = 0, camLastX = 0, last = performance.now(), time = 0;
function frame(now) {
  requestAnimationFrame(frame);
  const dt = Math.min((now - last) / 1000, 1 / 30); last = now; time += dt;
  if (S.started && !isPaused()) step(dt);
  blocks.forEach(b => (b.bump = Math.max(0, b.bump - dt * 4)));
  for (let i = particles.length - 1; i >= 0; i--) { const p = particles[i]; p.life -= dt; p.x += p.vx * dt; p.y += p.vy * dt; p.vy += 900 * dt; if (p.life <= 0) particles.splice(i, 1); }

  const want = clamp(P.x + P.w / 2 - viewW * .4, 0, W * T - viewW);
  camX += (want - camX) * (window.__snap ? 1 : Math.min(1, dt * 8)); camLastX = camX;

  g.setTransform(1, 0, 0, 1, 0, 0); g.clearRect(0, 0, cv.width, cv.height);
  g.setTransform(dpr * scale, 0, 0, dpr * scale, -camX * dpr * scale, offY * dpr);
  g.imageSmoothingEnabled = false;
  drawBackground(camX, time);
  if (camX < 12 * T) drawStartSign();
  signs.forEach(s => { if (s.x < camX + viewW && s.x + 340 > camX) drawSign(s); });
  drawFinish(time);
  drawTiles(camX, time);
  // fill under the world down to the bottom of the screen
  g.fillStyle = '#17110e'; g.fillRect(camX - 10, ROWS * T, viewW + 20, Math.max(0, viewH));
  tokens.forEach(t => { if (t.x > camX - 30 && t.x < camX + viewW + 30) drawToken(t, time); });
  bugs.forEach(b => { if (b.x > camX - 60 && b.x < camX + viewW + 60) drawBug(b, time); });
  const frameName = !P.ground ? 'jump' : Math.abs(P.vx) < 20 ? 'stand' : (Math.floor(P.run / 26) % 2 ? 'a' : 'b');
  drawRunner(P.x - 4, P.y, P.face, frameName, P.inv > 0 && Math.floor(time * 16) % 2 === 0);
  particles.forEach(p => { g.globalAlpha = Math.max(0, p.life * 1.4); g.fillStyle = p.color; g.fillRect(p.x - 3, p.y - 3, 6, 6); });
  g.globalAlpha = 1;
}

bindTouch();
if (window.lucide) window.lucide.createIcons(); else addEventListener('load', () => window.lucide && window.lucide.createIcons());
requestAnimationFrame(t => { last = t; frame(t); });
intro().then(() => { S.started = true; });

// for automated checks
window.__jump = { P, S, blocks, tokens, bugs, T, START, ZW, FX, POLE, map };
