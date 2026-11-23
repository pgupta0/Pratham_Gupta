/* Game 1: drive the F1 car round a night circuit. Nine glowing gates sit
   on the track; driving through one opens that chapter of the story. */
import * as THREE from 'three';
import { EffectComposer } from 'three/addons/postprocessing/EffectComposer.js';
import { RenderPass } from 'three/addons/postprocessing/RenderPass.js';
import { UnrealBloomPass } from 'three/addons/postprocessing/UnrealBloomPass.js';
import { OutputPass } from 'three/addons/postprocessing/OutputPass.js';
import { buildF1Car } from './car.js';
import { CHECKPOINTS } from './game-data.js';
import { keys, isPaused, bindTouch, showCard, showFinish, toast, intro, touchDevice } from './game-ui.js';

const V = (x, y, z) => new THREE.Vector3(x, y, z);
const clamp = (v, a, b) => Math.min(b, Math.max(a, v));
const mobile = innerWidth <= 900 || touchDevice;
const RM = matchMedia('(prefers-reduced-motion: reduce)').matches;
const $ = id => document.getElementById(id);
const canvasTex = (w, h, draw, srgb = true) => {
  const c = document.createElement('canvas'); c.width = w; c.height = h; draw(c.getContext('2d'), w, h);
  const t = new THREE.CanvasTexture(c); if (srgb) t.colorSpace = THREE.SRGBColorSpace; t.anisotropy = 8; return t;
};

/* ---------- renderer ---------- */
const canvas = $('gl');
const renderer = new THREE.WebGLRenderer({ canvas, antialias: !mobile, powerPreference: 'high-performance' });
renderer.setPixelRatio(Math.min(devicePixelRatio, mobile ? 1.5 : 1.75));
renderer.setSize(innerWidth, innerHeight, false);
renderer.toneMapping = THREE.ACESFilmicToneMapping;
renderer.toneMappingExposure = 1.05;
const scene = new THREE.Scene();
scene.background = new THREE.Color('#07080d');
scene.fog = new THREE.FogExp2('#090a11', .0065);
// night reflections: a dark dome with a warm city glow low on every side and a cool sky above
{
  const env = new THREE.Scene();
  env.add(new THREE.Mesh(new THREE.BoxGeometry(40, 40, 40), new THREE.MeshBasicMaterial({ color: '#06070b', side: THREE.BackSide })));
  const glow = (c, k) => new THREE.MeshBasicMaterial({ color: new THREE.Color(c).multiplyScalar(k), side: THREE.DoubleSide });
  [0, 1, 2, 3].forEach(i => { const m = new THREE.Mesh(new THREE.PlaneGeometry(40, 5), glow(i % 2 ? '#ff9a52' : '#ffc27a', .9)); m.rotation.y = i * Math.PI / 2; m.position.set(Math.sin(i * Math.PI / 2) * 19.5, -2, Math.cos(i * Math.PI / 2) * 19.5); env.add(m); });
  const sky = new THREE.Mesh(new THREE.PlaneGeometry(26, 26), glow('#3b4b80', .7)); sky.rotation.x = Math.PI / 2; sky.position.y = 19.5; env.add(sky);
  scene.environment = new THREE.PMREMGenerator(renderer).fromScene(env, .04).texture;
}
scene.add(new THREE.HemisphereLight('#8fa2ff', '#1c1008', .3));
const moon = new THREE.DirectionalLight('#d6deff', .55); moon.position.set(-50, 90, 160); scene.add(moon);
const camera = new THREE.PerspectiveCamera(mobile && innerWidth < innerHeight ? 70 : 58, innerWidth / innerHeight, .1, 900);

let composer = null;
if (!mobile) {
  composer = new EffectComposer(renderer);
  composer.addPass(new RenderPass(scene, camera));
  composer.addPass(new UnrealBloomPass(new THREE.Vector2(innerWidth, innerHeight), .55, .45, .82));
  composer.addPass(new OutputPass());
}

/* ---------- circuit ---------- */
const CTRL = [[0, -40], [0, 120], [30, 210], [120, 245], [205, 200], [215, 120], [160, 70], [170, -10], [255, -55], [265, -150], [190, -215], [70, -205], [-10, -160]];
const curve = new THREE.CatmullRomCurve3(CTRL.map(([x, z]) => V(x, 0, z)), true, 'centripetal');
const N = 1400, HW = 8;
const P = curve.getSpacedPoints(N).slice(0, N);
const TAN = P.map((_, i) => P[(i + 1) % N].clone().sub(P[(i - 1 + N) % N]).normalize());
const SIDE = TAN.map(t => V(t.z, 0, -t.x));
const LEN = curve.getLength();

function ribbon(inner, outer, y, vScale, mat) {
  const pos = [], uv = [], idx = [];
  let d = 0;
  for (let i = 0; i <= N; i++) {
    const k = i % N; if (i) d += P[k].distanceTo(P[i - 1]);
    for (const [o, u] of [[inner, 0], [outer, 1]]) { const p = P[k].clone().addScaledVector(SIDE[k], o); pos.push(p.x, y, p.z); uv.push(u, d / vScale); }
    if (i < N) { const a = i * 2; idx.push(a, a + 1, a + 2, a + 1, a + 3, a + 2); }
  }
  const g = new THREE.BufferGeometry();
  g.setAttribute('position', new THREE.Float32BufferAttribute(pos, 3)); g.setAttribute('uv', new THREE.Float32BufferAttribute(uv, 2));
  g.setIndex(idx); g.computeVertexNormals();
  const m = new THREE.Mesh(g, mat); scene.add(m); return m;
}
const roadTex = canvasTex(256, 512, (g, w, h) => {
  g.fillStyle = '#1b1d24'; g.fillRect(0, 0, w, h);
  for (let i = 0; i < 2600; i++) { const v = 22 + Math.random() * 22 | 0; g.fillStyle = `rgb(${v},${v},${v + 4})`; g.fillRect(Math.random() * w, Math.random() * h, 2, 2); }
  g.fillStyle = '#c9cad0'; g.fillRect(10, 0, 7, h); g.fillRect(w - 17, 0, 7, h);
  g.fillStyle = '#f3c14a'; g.fillRect(w / 2 - 3, 0, 6, h * .45);
});
roadTex.wrapT = THREE.RepeatWrapping;
ribbon(-HW, HW, .02, 24, new THREE.MeshStandardMaterial({ map: roadTex, roughness: .55, metalness: .1, side: THREE.DoubleSide }));
const kerbTex = canvasTex(32, 128, (g, w, h) => { g.fillStyle = '#a8191f'; g.fillRect(0, 0, w, h); g.fillStyle = '#b9b9bf'; g.fillRect(0, 0, w, h / 2); });
kerbTex.wrapT = THREE.RepeatWrapping;
const kerbM = new THREE.MeshStandardMaterial({ map: kerbTex, roughness: .6, envMapIntensity: .25, side: THREE.DoubleSide });
ribbon(HW, HW + 1.3, .035, 5, kerbM); ribbon(-HW - 1.3, -HW, .035, 5, kerbM);

const gridTex = canvasTex(256, 256, (g, w, h) => {
  g.fillStyle = '#0d1017'; g.fillRect(0, 0, w, h);
  g.strokeStyle = '#1a2030'; g.lineWidth = 2; g.strokeRect(0, 0, w, h);
  g.strokeStyle = '#141924'; g.lineWidth = 1; g.beginPath(); g.moveTo(w / 2, 0); g.lineTo(w / 2, h); g.moveTo(0, h / 2); g.lineTo(w, h / 2); g.stroke();
});
gridTex.wrapS = gridTex.wrapT = THREE.RepeatWrapping; gridTex.repeat.set(90, 90);
const ground = new THREE.Mesh(new THREE.PlaneGeometry(1800, 1800), new THREE.MeshStandardMaterial({ map: gridTex, color: '#6f7480', roughness: 1, envMapIntensity: .12 }));
ground.rotation.x = -Math.PI / 2; ground.position.set(130, 0, 15); scene.add(ground);

// start / finish line
const checker = canvasTex(256, 32, (g, w, h) => { for (let x = 0; x < 16; x++) for (let y = 0; y < 2; y++) { g.fillStyle = (x + y) % 2 ? '#111' : '#9a9aa0'; g.fillRect(x * 16, y * 16, 16, 16); } });
const sl = new THREE.Mesh(new THREE.PlaneGeometry(HW * 2, 2), new THREE.MeshStandardMaterial({ map: checker, roughness: .6 }));
sl.rotation.x = -Math.PI / 2; sl.rotation.z = Math.atan2(TAN[0].x, TAN[0].z); sl.position.copy(P[0]).setY(.04); scene.add(sl);

/* ---------- nearest point on the circuit ---------- */
let hint = 0;
function nearest(p, full = false) {
  let best = 1e9, bi = hint;
  const span = full ? N : 60;
  for (let j = -span; j <= span; j++) {
    const i = ((hint + j) % N + N) % N, dx = P[i].x - p.x, dz = P[i].z - p.z, d = dx * dx + dz * dz;
    if (d < best) { best = d; bi = i; }
    if (full && j > N / 2) break;
  }
  hint = bi;
  const off = (p.x - P[bi].x) * SIDE[bi].x + (p.z - P[bi].z) * SIDE[bi].z;
  return { i: bi, off, dist: Math.sqrt(best) };
}

/* ---------- city around the circuit ---------- */
const winTex = canvasTex(64, 128, (g, w, h) => {
  g.fillStyle = '#000'; g.fillRect(0, 0, w, h);
  for (let y = 4; y < h; y += 8) for (let x = 4; x < w; x += 8) if (Math.random() < .35) { g.fillStyle = Math.random() < .8 ? '#ffb46a' : '#9fd6ff'; g.globalAlpha = .4 + Math.random() * .6; g.fillRect(x, y, 4, 4); }
});
const boxes = [];
{
  const count = mobile ? 150 : 260, geo = new THREE.BoxGeometry(1, 1, 1); geo.translate(0, .5, 0);
  const mat = new THREE.MeshStandardMaterial({ color: '#121622', roughness: .8, emissive: '#ffffff', emissiveMap: winTex, emissiveIntensity: .9 });
  const inst = new THREE.InstancedMesh(geo, mat, count);
  const m = new THREE.Matrix4(), q = new THREE.Quaternion(), s = new THREE.Vector3(), p = new THREE.Vector3();
  let n = 0, tries = 0;
  while (n < count && tries++ < 6000) {
    const x = -340 + Math.random() * 820, z = -420 + Math.random() * 860;
    const w = 10 + Math.random() * 16, d = 10 + Math.random() * 16, h = 8 + Math.random() * (Math.random() < .2 ? 70 : 34);
    let ok = true;
    for (let i = 0; i < N; i += 7) { if (Math.hypot(P[i].x - x, P[i].z - z) < HW + 14 + Math.max(w, d) * .7) { ok = false; break; } }
    if (ok) for (const b of boxes) if (Math.abs(b.x - x) < (b.w + w) / 2 + 3 && Math.abs(b.z - z) < (b.d + d) / 2 + 3) { ok = false; break; }
    if (!ok) continue;
    m.compose(p.set(x, 0, z), q, s.set(w, h, d)); inst.setMatrixAt(n++, m);
    boxes.push({ x, z, w, d });
  }
  inst.count = n; scene.add(inst);
  // light poles along the circuit
  const step = 30, poles = Math.floor(N / step);
  const pg = new THREE.CylinderGeometry(.12, .16, 7, 6); pg.translate(0, 3.5, 0);
  const bg = new THREE.SphereGeometry(.45, 10, 8);
  const pI = new THREE.InstancedMesh(pg, new THREE.MeshStandardMaterial({ color: '#2a2d36', metalness: .6, roughness: .4 }), poles);
  const bI = new THREE.InstancedMesh(bg, new THREE.MeshBasicMaterial({ color: new THREE.Color('#ffd49a').multiplyScalar(2.2) }), poles);
  for (let k = 0; k < poles; k++) {
    const i = k * step, sd = k % 2 ? 1 : -1, at = P[i].clone().addScaledVector(SIDE[i], sd * (HW + 3.2));
    m.compose(at, q, s.set(1, 1, 1)); pI.setMatrixAt(k, m);
    m.compose(at.clone().setY(7.1), q, s.set(1, 1, 1)); bI.setMatrixAt(k, m);
  }
  scene.add(pI, bI);
}

/* ---------- gates ---------- */
const textTex = (lines, color) => canvasTex(1024, 128, (g, w, h) => {
  g.fillStyle = '#0b0907'; g.fillRect(0, 0, w, h);
  g.fillStyle = color; g.fillRect(0, h - 8, w, 8);
  g.font = '700 64px "JetBrains Mono", ui-monospace, monospace'; g.textAlign = 'center'; g.textBaseline = 'middle';
  g.fillStyle = '#f2f4f8'; g.fillText(lines, w / 2, h / 2 - 2);
});
const gates = CHECKPOINTS.map((cp, k) => {
  const last = k === CHECKPOINTS.length - 1;
  const i = last ? N - 40 : Math.floor(N * (.075 + k * .108));
  const grp = new THREE.Group(); grp.position.copy(P[i]); grp.rotation.y = Math.atan2(TAN[i].x, TAN[i].z); scene.add(grp);
  const col = new THREE.Color(cp.color);
  const glow = new THREE.MeshStandardMaterial({ color: '#0d0d10', emissive: col, emissiveIntensity: 2.2, roughness: .4 });
  const span = HW + 1.8;
  [-1, 1].forEach(s => { const p = new THREE.Mesh(new THREE.BoxGeometry(.7, 8, .7), glow); p.position.set(s * span, 4, 0); grp.add(p); });
  const bar = new THREE.Mesh(new THREE.BoxGeometry(span * 2 + .7, 1.9, .7), new THREE.MeshStandardMaterial({ color: '#0b0907', roughness: .5 }));
  bar.position.y = 8.6; grp.add(bar);
  const trim = new THREE.Mesh(new THREE.BoxGeometry(span * 2 + .7, .18, .8), glow); trim.position.y = 7.6; grp.add(trim);
  const label = cp.finish ? 'FINISH · YOUR TEAM' : cp.n === '★' ? `★ ${cp.short}` : `PIT ${cp.n} · ${cp.short}`;
  const sm = new THREE.MeshBasicMaterial({ map: textTex(label, cp.color) });
  [1, -1].forEach(s => { const p = new THREE.Mesh(new THREE.PlaneGeometry(span * 2, span * 2 / 8), sm); p.position.set(0, 8.65, s * .37); if (s < 0) p.rotation.y = Math.PI; grp.add(p); });
  const pad = new THREE.Mesh(new THREE.PlaneGeometry(HW * 2, 5), new THREE.MeshBasicMaterial({ color: col, transparent: true, opacity: .32, blending: THREE.AdditiveBlending, depthWrite: false }));
  pad.rotation.x = -Math.PI / 2; pad.position.y = .05; grp.add(pad);
  const curtain = new THREE.Mesh(new THREE.PlaneGeometry(span * 2, 7.5), new THREE.MeshBasicMaterial({ color: col, transparent: true, opacity: .07, blending: THREE.AdditiveBlending, depthWrite: false, side: THREE.DoubleSide }));
  curtain.position.y = 3.75; grp.add(curtain);
  return { cp, i, grp, glow, pad, curtain, pos: P[i].clone(), seen: false, inside: false, finish: !!cp.finish };
});
const chapters = gates.filter(g => !g.finish);
const TOTAL = chapters.length;
$('dots').innerHTML = chapters.map(g => `<i style="--c:${g.cp.color}"></i>`).join('');
const dotEls = [...$('dots').children];

/* ---------- car ---------- */
const C = buildF1Car();
const carRoot = new THREE.Group(); carRoot.add(C.car); scene.add(carRoot);
// a soft key light from in front of the car, so its paint reads against the dark track
const key = new THREE.PointLight('#ffe8d0', 30, 24, 1.6); key.position.set(0, 6, 9); carRoot.add(key);
const brakeMat = C.rain && C.rain.material;
const brakeBase = brakeMat ? brakeMat.color.clone() : null;

const state = { x: 0, z: 0, h: 0, v: 0, steer: 0, locked: true, found: 0 };
function placeAt(i, back = 0) {
  const j = ((i - back) % N + N) % N;
  state.x = P[j].x; state.z = P[j].z; state.h = Math.atan2(TAN[j].x, TAN[j].z); state.v = 0; state.steer = 0; hint = j;
}
placeAt(0, 10);

/* ---------- minimap ---------- */
const mini = $('mini'), mg = mini.getContext('2d');
let minX = 1e9, maxX = -1e9, minZ = 1e9, maxZ = -1e9;
P.forEach(p => { minX = Math.min(minX, p.x); maxX = Math.max(maxX, p.x); minZ = Math.min(minZ, p.z); maxZ = Math.max(maxZ, p.z); });
const msc = (mini.width * .72) / Math.max(maxX - minX, maxZ - minZ), mcx = (minX + maxX) / 2, mcz = (minZ + maxZ) / 2;
// screen x is flipped so the map matches what you see from behind the car on the first straight
const mp = (x, z) => [mini.width / 2 - (x - mcx) * msc, mini.height / 2 - (z - mcz) * msc];
function drawMini() {
  const W = mini.width; mg.clearRect(0, 0, W, W);
  mg.lineWidth = W * .035; mg.lineJoin = 'round'; mg.strokeStyle = '#ffffff30'; mg.beginPath();
  P.forEach((p, i) => { const [x, y] = mp(p.x, p.z); i ? mg.lineTo(x, y) : mg.moveTo(x, y); }); mg.closePath(); mg.stroke();
  gates.forEach(g => {
    const [x, y] = mp(g.pos.x, g.pos.z);
    mg.fillStyle = g.cp.color; mg.globalAlpha = g.seen && !g.finish ? .35 : 1;
    mg.beginPath(); mg.arc(x, y, W * (g.finish ? .04 : .03), 0, Math.PI * 2); mg.fill(); mg.globalAlpha = 1;
  });
  const [cx, cy] = mp(state.x, state.z);
  mg.save(); mg.translate(cx, cy); mg.rotate(-state.h);
  mg.fillStyle = '#fff'; mg.shadowColor = '#FF5A1F'; mg.shadowBlur = 12;
  mg.beginPath(); mg.moveTo(0, -W * .05); mg.lineTo(W * .032, W * .035); mg.lineTo(-W * .032, W * .035); mg.closePath(); mg.fill(); mg.restore();
}

/* ---------- checkpoints ---------- */
function markSeen(g) {
  g.seen = true;
  g.glow.emissiveIntensity = .45; g.pad.material.opacity = .08; g.curtain.material.opacity = .02;
  state.found = chapters.filter(c => c.seen).length;
  $('cnt').textContent = `${state.found} / ${TOTAL}`;
  chapters.forEach((c, k) => dotEls[k].classList.toggle('got', c.seen));
}
async function enterGate(g) {
  state.v *= .25;
  if (g.finish) {
    const r = await showFinish({ found: state.found, total: TOTAL, other: 'jump.html', otherName: 'the platformer', again: null });
    if (r === 'again' && state.found >= TOTAL) resetGame();
    return;
  }
  markSeen(g);
  await showCard(g.cp, { found: state.found, total: TOTAL, verb: 'Keep driving' });
  if (state.found === TOTAL) toast('All chapters found. Head for the finish', '#FF5A1F');
}
function resetGame() {
  gates.forEach(g => { g.seen = false; g.glow.emissiveIntensity = 2.2; g.pad.material.opacity = .32; g.curtain.material.opacity = .07; });
  state.found = 0; $('cnt').textContent = `0 / ${TOTAL}`; dotEls.forEach(d => d.classList.remove('got'));
  placeAt(0, 10);
}

/* ---------- driving ---------- */
const MAXV = 72, OFFV = 24;
let offTimer = 0, resetHeld = false;
addEventListener('keydown', e => {
  if (e.code === 'KeyR' && !isPaused() && !state.locked && !resetHeld) { resetHeld = true; const n = nearest(V(state.x, 0, state.z), true); placeAt(n.i, 0); }
});
addEventListener('keyup', e => { if (e.code === 'KeyR') resetHeld = false; });

function physics(dt) {
  const on = !state.locked && !isPaused();
  const gas = on && keys.up, brk = on && keys.down;
  const want = on ? (keys.left ? 1 : 0) - (keys.right ? 1 : 0) : 0;
  state.steer += (want - state.steer) * Math.min(1, dt * 7);
  const n = nearest(V(state.x, 0, state.z));
  const off = Math.abs(n.off) > HW + 1.3;
  const vmax = off ? OFFV : MAXV;
  if (gas) state.v += (state.v < 0 ? 40 : 30 * (1 - state.v / vmax)) * dt;
  else if (brk) state.v -= (state.v > 0 ? 55 : 14) * dt;
  const drag = (3 + Math.abs(state.v) * .045 + (off ? 9 : 0)) * dt;
  if (!gas && !brk) state.v -= Math.sign(state.v) * Math.min(Math.abs(state.v), drag);
  else if (off && state.v > OFFV) state.v -= 30 * dt;
  state.v = clamp(state.v, -14, MAXV);
  const sp = Math.abs(state.v);
  const turn = state.steer * 1.75 * clamp(sp / 14, 0, 1) * (1 - .38 * clamp(sp / MAXV, 0, 1)) * Math.sign(state.v || 1);
  state.h += turn * dt;
  const nx = state.x + Math.sin(state.h) * state.v * dt, nz = state.z + Math.cos(state.h) * state.v * dt;
  // buildings are solid
  let hit = false;
  for (const b of boxes) {
    if (Math.abs(nx - b.x) < b.w / 2 + 1.6 && Math.abs(nz - b.z) < b.d / 2 + 1.6) { hit = true; break; }
  }
  if (hit) { state.v *= -.25; } else { state.x = clamp(nx, -380, 640); state.z = clamp(nz, -470, 500); }
  offTimer = off ? offTimer + dt : 0;
  $('off').classList.toggle('on', offTimer > 1.2);
  return { off, brk };
}

/* ---------- loop ---------- */
const camPos = V(0, 6, -20), look = V(), tmp = V();
let last = performance.now(), hudT = 0, t0 = 0;
function frame(now) {
  requestAnimationFrame(frame);
  const dt = Math.min((now - last) / 1000, .05); last = now; t0 += dt;
  const { off, brk } = isPaused() ? { off: false, brk: false } : physics(dt);
  carRoot.position.set(state.x, off ? Math.sin(t0 * 40) * .02 * Math.min(1, Math.abs(state.v) / 10) : 0, state.z);
  carRoot.rotation.y = state.h;
  C.car.rotation.z = -state.steer * .035 * Math.min(1, Math.abs(state.v) / MAXV);
  C.wheels.forEach(w => (w.rotation.x += state.v * dt / .36));
  ['wheelFL', 'wheelFR'].forEach(k => { const p = C.parts[k]; if (p) p.g.rotation.y = state.steer * .38; });
  if (brakeMat) brakeMat.color.copy(brakeBase).multiplyScalar(brk ? 2.4 : 1);

  // gates
  if (!isPaused() && !state.locked) {
    for (const g of gates) {
      const d = Math.hypot(g.pos.x - state.x, g.pos.z - state.z), inside = d < HW + 1.2;
      if (inside && !g.inside && (g.finish || !g.seen)) { g.inside = true; enterGate(g); break; }
      g.inside = inside;
    }
  }
  gates.forEach(g => { if (!g.seen || g.finish) g.curtain.material.opacity = (g.finish ? .06 : .07) + Math.sin(t0 * 3 + g.i) * .03; });

  // chase camera
  const dir = V(Math.sin(state.h), 0, Math.cos(state.h));
  const back = 9.5 + Math.abs(state.v) * .03;
  tmp.set(state.x, 0, state.z).addScaledVector(dir, -back); tmp.y = 3.6 + Math.abs(state.v) * .008;
  const k = window.__snap ? 1 : 1 - Math.exp(-dt * 5);
  camPos.lerp(tmp, k);
  look.lerp(V(state.x, 1.1, state.z).addScaledVector(dir, 7), window.__snap ? 1 : 1 - Math.exp(-dt * 8));
  camera.position.copy(camPos); camera.lookAt(look);
  const fov = (mobile && innerWidth < innerHeight ? 70 : 58) + (RM ? 0 : Math.abs(state.v) / MAXV * 8);
  if (Math.abs(camera.fov - fov) > .05) { camera.fov += (fov - camera.fov) * Math.min(1, dt * 4); camera.updateProjectionMatrix(); }

  hudT += dt;
  if (hudT > .08) { hudT = 0; $('spd').textContent = Math.round(Math.abs(state.v) * 3.6); drawMini(); }
  composer ? composer.render() : renderer.render(scene, camera);
}
addEventListener('resize', () => {
  camera.aspect = innerWidth / innerHeight; camera.updateProjectionMatrix();
  renderer.setSize(innerWidth, innerHeight, false); composer && composer.setSize(innerWidth, innerHeight);
});

bindTouch();
if (window.lucide) window.lucide.createIcons(); else addEventListener('load', () => window.lucide && window.lucide.createIcons());
requestAnimationFrame(t => { last = t; frame(t); });

// start lights: five reds, then lights out
intro().then(async () => {
  const L = $('lights'), dots = [...L.children];
  if (RM || window.__snap) { state.locked = false; return; }
  L.classList.add('on');
  for (const d of dots) { await new Promise(r => setTimeout(r, 420)); d.classList.add('lit'); }
  await new Promise(r => setTimeout(r, 500 + Math.random() * 500));
  dots.forEach(d => d.classList.remove('lit')); L.classList.add('go'); state.locked = false;
  setTimeout(() => { L.classList.remove('on'); }, 700);
  setTimeout(() => $('hint').classList.add('off'), 6000);
});

// for automated checks
window.__drive = { state, gates, P, placeAt, nearest };
