/* The Route — Pratham Gupta's journey as a 3D transit line.
   One loop: GSAP's ticker drives Lenis smooth scroll and the three.js render.
   Scroll position picks the chapter; a damped camera rides the route. */
import * as THREE from 'three';
import { EffectComposer } from 'three/addons/postprocessing/EffectComposer.js';
import { RenderPass } from 'three/addons/postprocessing/RenderPass.js';
import { UnrealBloomPass } from 'three/addons/postprocessing/UnrealBloomPass.js';
import { OutputPass } from 'three/addons/postprocessing/OutputPass.js';

const gsap = window.gsap, ScrollTrigger = window.ScrollTrigger;
const RM = matchMedia('(prefers-reduced-motion: reduce)').matches;
const FINE = matchMedia('(pointer: fine)').matches;
const isMobile = () => innerWidth <= 900;
const $ = s => document.querySelector(s), $$ = s => [...document.querySelectorAll(s)];
const clamp = (v, a = 0, b = 1) => Math.min(b, Math.max(a, v));
const lerp = (a, b, t) => a + (b - a) * t;
const ease = u => (u < .5 ? 4 * u * u * u : 1 - Math.pow(-2 * u + 2, 3) / 2);
const smooth = (a, b, v) => { const t = clamp((v - a) / (b - a)); return t * t * (3 - 2 * t); };

window.lucide && window.lucide.createIcons();
gsap.registerPlugin(ScrollTrigger);
ScrollTrigger.config({ ignoreMobileResize: true });

/* ---------------- smooth scroll ---------------- */
let lenis = null;
if (!RM && window.Lenis) {
  lenis = new window.Lenis({ lerp: 0.085, smoothWheel: true });
  lenis.on('scroll', ScrollTrigger.update);
}
window.__lenis = lenis;
function scrollToY(y) { lenis ? lenis.scrollTo(y, { duration: 1.4 }) : scrollTo({ top: y, behavior: RM ? 'auto' : 'smooth' }); }
document.addEventListener('click', e => {
  const a = e.target.closest('a[href^="#"]'); if (!a) return;
  const el = document.querySelector(a.getAttribute('href')); if (!el) return;
  e.preventDefault(); scrollToY(el.getBoundingClientRect().top + scrollY);
});

/* =====================================================================
   THREE.JS SCENE
   ===================================================================== */
const C_SIGNAL = new THREE.Color('#FF5A1F'), C_FIX = new THREE.Color('#2EF2C3'), C_INK = new THREE.Color('#05060A');
const UP = new THREE.Vector3(0, 1, 0);
const canvas = $('#gl');
let gl = null;

try { gl = buildScene(); } catch (err) { console.warn('WebGL off:', err); canvas.style.display = 'none'; }

function glowTexture() {
  const c = document.createElement('canvas'); c.width = c.height = 64;
  const g = c.getContext('2d'), r = g.createRadialGradient(32, 32, 0, 32, 32, 32);
  r.addColorStop(0, 'rgba(255,255,255,1)'); r.addColorStop(.25, 'rgba(255,255,255,.75)'); r.addColorStop(1, 'rgba(255,255,255,0)');
  g.fillStyle = r; g.fillRect(0, 0, 64, 64);
  const t = new THREE.CanvasTexture(c); t.colorSpace = THREE.SRGBColorSpace; return t;
}

function buildScene() {
  const mobile = isMobile();
  const renderer = new THREE.WebGLRenderer({ canvas, antialias: !mobile, powerPreference: 'high-performance' });
  renderer.setPixelRatio(Math.min(devicePixelRatio, mobile ? 1.5 : 1.75));
  renderer.setSize(innerWidth, innerHeight, false);
  renderer.setClearColor(C_INK);
  renderer.toneMapping = THREE.ACESFilmicToneMapping;

  const scene = new THREE.Scene();
  scene.fog = new THREE.FogExp2(C_INK, 0.019);
  const camera = new THREE.PerspectiveCamera(50, innerWidth / innerHeight, 0.1, 500);
  const sprite = glowTexture();

  /* ---- the route: one line through six stops ---- */
  const STOPS = [
    new THREE.Vector3(-8, 0, 4),     // Delhi
    new THREE.Vector3(9, 1.5, -18),  // the fleet
    new THREE.Vector3(-7, 3, -40),   // BITSoM
    new THREE.Vector3(8, 1, -62),    // BigBasket
    new THREE.Vector3(-4, 4, -84),   // AI products
    new THREE.Vector3(3, 6.5, -104)  // next stop
  ];
  const ctrl = [
    new THREE.Vector3(6, -1, 26), new THREE.Vector3(-3, -.5, 14), STOPS[0],
    new THREE.Vector3(-4, .5, -6), new THREE.Vector3(4, 1, -12), STOPS[1],
    new THREE.Vector3(10, 2, -27), new THREE.Vector3(0, 2.5, -34), STOPS[2],
    new THREE.Vector3(-9, 2, -49), new THREE.Vector3(1, 1, -56), STOPS[3],
    new THREE.Vector3(11, 2, -72), new THREE.Vector3(3, 3.5, -79), STOPS[4],
    new THREE.Vector3(-9, 5, -92), new THREE.Vector3(-3, 6, -99), STOPS[5],
    new THREE.Vector3(7, 7.5, -110)
  ];
  const curve = new THREE.CatmullRomCurve3(ctrl, false, 'centripetal');
  const SAMPLES = 2400, samples = [];
  for (let i = 0; i <= SAMPLES; i++) samples.push(curve.getPointAt(i / SAMPLES));
  const nearestT = v => { let b = 0, bd = Infinity; samples.forEach((p, i) => { const d = p.distanceToSquared(v); if (d < bd) { bd = d; b = i; } }); return b / SAMPLES; };
  const stopT = STOPS.map(nearestT);

  const SEG = 1400, RAD = 8;
  const tubeGeo = new THREE.TubeGeometry(curve, SEG, 0.055, RAD, false);
  const baseTube = new THREE.Mesh(tubeGeo, new THREE.MeshBasicMaterial({ color: '#7a2a10', transparent: true, opacity: .75 }));
  const doneTube = new THREE.Mesh(tubeGeo, new THREE.MeshBasicMaterial({ color: C_FIX.clone().multiplyScalar(1.15) }));
  doneTube.scale.setScalar(1.0); doneTube.renderOrder = 2;
  scene.add(baseTube, doneTube);
  // the finished part of the line gets its own copy so its draw range can grow
  doneTube.geometry = tubeGeo.clone();
  const drawDone = t => doneTube.geometry.setDrawRange(0, Math.floor(clamp(t) * SEG) * RAD * 6);

  // dotted rail ties under the line, like a transit map
  const tieGeo = new THREE.BufferGeometry(), ties = [];
  for (let i = 0; i <= 600; i++) { const p = curve.getPointAt(i / 600); ties.push(p.x, p.y - .5, p.z); }
  tieGeo.setAttribute('position', new THREE.Float32BufferAttribute(ties, 3));
  scene.add(new THREE.Points(tieGeo, new THREE.PointsMaterial({ color: '#3b4258', size: .09, sizeAttenuation: true })));

  /* ---- stations ---- */
  const stations = STOPS.map((p, i) => {
    const g = new THREE.Group(); g.position.copy(p);
    const tan = curve.getTangentAt(stopT[i]);
    const ringMat = new THREE.MeshBasicMaterial({ color: C_SIGNAL.clone(), transparent: true, opacity: .95 });
    const ring = new THREE.Mesh(new THREE.TorusGeometry(1.25, .035, 8, 72), ringMat);
    ring.lookAt(p.clone().add(tan)); ring.position.set(0, 0, 0);
    ring.quaternion.copy(new THREE.Quaternion().setFromUnitVectors(new THREE.Vector3(0, 0, 1), tan));
    const ring2 = new THREE.Mesh(new THREE.TorusGeometry(1.6, .012, 6, 72), new THREE.MeshBasicMaterial({ color: '#ffffff', transparent: true, opacity: .18 }));
    ring2.quaternion.copy(ring.quaternion);
    const core = new THREE.Mesh(new THREE.SphereGeometry(.2, 20, 20), new THREE.MeshBasicMaterial({ color: '#ffffff' }));
    const beam = new THREE.Mesh(new THREE.CylinderGeometry(.018, .018, 40, 6, 1, true),
      new THREE.MeshBasicMaterial({ color: C_SIGNAL.clone(), transparent: true, opacity: .28, blending: THREE.AdditiveBlending, depthWrite: false }));
    beam.position.y = 20;
    const halo = new THREE.Sprite(new THREE.SpriteMaterial({ map: sprite, color: C_SIGNAL.clone(), transparent: true, opacity: .55, blending: THREE.AdditiveBlending, depthWrite: false }));
    halo.scale.setScalar(2.4);
    g.add(ring, ring2, core, beam, halo); scene.add(g);
    return { g, ring, ring2, ringMat, beam, halo, tan, fix: 0, glowNow: 0 };
  });

  /* ---- friction particles: a jam at every stop that straightens into lanes ---- */
  const PER = mobile ? 140 : 240, JN = PER * STOPS.length;
  const jPos = new Float32Array(JN * 3), jCol = new Float32Array(JN * 3);
  const chaos = [], phase = [];
  for (let k = 0; k < JN; k++) {
    const v = new THREE.Vector3().randomDirection().multiplyScalar(1.2 + Math.random() * 1.9);
    v.y *= .7; chaos.push(v); phase.push(Math.random() * Math.PI * 2);
  }
  const jamGeo = new THREE.BufferGeometry();
  jamGeo.setAttribute('position', new THREE.BufferAttribute(jPos, 3));
  jamGeo.setAttribute('color', new THREE.BufferAttribute(jCol, 3));
  const jam = new THREE.Points(jamGeo, new THREE.PointsMaterial({ size: mobile ? .2 : .17, map: sprite, vertexColors: true, transparent: true, depthWrite: false, blending: THREE.AdditiveBlending }));
  scene.add(jam);
  const sideOf = tan => new THREE.Vector3().crossVectors(tan, UP).normalize();
  stations.forEach(s => { s.side = sideOf(s.tan); });

  /* ---- traffic pulses on the line ---- */
  const PN = 46, pT = [], pS = [];
  const pPos = new Float32Array(PN * 3), pCol = new Float32Array(PN * 3);
  for (let k = 0; k < PN; k++) { pT.push(Math.random()); pS.push(.006 + Math.random() * .012); }
  const pulseGeo = new THREE.BufferGeometry();
  pulseGeo.setAttribute('position', new THREE.BufferAttribute(pPos, 3));
  pulseGeo.setAttribute('color', new THREE.BufferAttribute(pCol, 3));
  scene.add(new THREE.Points(pulseGeo, new THREE.PointsMaterial({ size: .5, map: sprite, vertexColors: true, transparent: true, depthWrite: false, blending: THREE.AdditiveBlending })));

  /* ---- the pod (that's me, riding the route) ---- */
  const pod = new THREE.Group();
  const podBody = new THREE.Mesh(new THREE.CapsuleGeometry(.2, .75, 6, 16), new THREE.MeshBasicMaterial({ color: '#E9FFF9' }));
  podBody.rotation.x = Math.PI / 2;
  const podHalo = new THREE.Sprite(new THREE.SpriteMaterial({ map: sprite, color: C_FIX, transparent: true, opacity: .9, blending: THREE.AdditiveBlending, depthWrite: false }));
  podHalo.scale.setScalar(1.3);
  const podLight = new THREE.PointLight(C_FIX, 26, 16, 2);
  pod.add(podBody, podHalo, podLight); scene.add(pod);
  const TRAIL = 60, trailPos = new Float32Array(TRAIL * 3), trailCol = new Float32Array(TRAIL * 3);
  const trailGeo = new THREE.BufferGeometry();
  trailGeo.setAttribute('position', new THREE.BufferAttribute(trailPos, 3));
  trailGeo.setAttribute('color', new THREE.BufferAttribute(trailCol, 3));
  scene.add(new THREE.Points(trailGeo, new THREE.PointsMaterial({ size: .32, map: sprite, vertexColors: true, transparent: true, depthWrite: false, blending: THREE.AdditiveBlending })));

  /* ---- city at night: instanced blocks + a map grid ---- */
  const N_B = mobile ? 300 : 620;
  const blocks = new THREE.InstancedMesh(new THREE.BoxGeometry(1, 1, 1), new THREE.MeshLambertMaterial({ color: '#1a2236' }), N_B);
  const m4 = new THREE.Matrix4(), q = new THREE.Quaternion(), sc = new THREE.Vector3(), pos = new THREE.Vector3();
  const GROUND = -5;
  let placed = 0, guard = 0;
  while (placed < N_B && guard++ < 20000) {
    pos.set((Math.random() - .5) * 110, 0, 34 - Math.random() * 160);
    let near = Infinity;
    for (let i = 0; i < samples.length; i += 12) { const s = samples[i]; const d = (s.x - pos.x) ** 2 + (s.z - pos.z) ** 2; if (d < near) near = d; }
    if (near < 16) continue;
    const h = .8 + Math.pow(Math.random(), 2.2) * (near < 80 ? 6 : 14);
    sc.set(.9 + Math.random() * 2.2, h, .9 + Math.random() * 2.2);
    pos.y = GROUND + h / 2;
    q.setFromAxisAngle(UP, (Math.random() < .5 ? 0 : Math.PI / 2) + (Math.random() - .5) * .1);
    blocks.setMatrixAt(placed++, m4.compose(pos, q, sc));
  }
  blocks.count = placed; scene.add(blocks);
  // lit windows: tiny points on block faces
  const W = mobile ? 500 : 1400, wPos = [], wCol = [];
  for (let k = 0; k < W; k++) {
    blocks.getMatrixAt(Math.floor(Math.random() * placed), m4); m4.decompose(pos, q, sc);
    const face = Math.random() < .5 ? 1 : -1, alongX = Math.random() < .5;
    const lx = alongX ? (Math.random() - .5) * sc.x : face * (sc.x / 2 + .02);
    const lz = alongX ? face * (sc.z / 2 + .02) : (Math.random() - .5) * sc.z;
    const v = new THREE.Vector3(lx, (Math.random() - .5) * sc.y * .9, lz).applyQuaternion(q).add(pos);
    wPos.push(v.x, v.y, v.z);
    const c = Math.random() < .18 ? new THREE.Color('#FFB27A') : new THREE.Color('#8FA2FF').multiplyScalar(.6 + Math.random() * .4);
    wCol.push(c.r, c.g, c.b);
  }
  const winGeo = new THREE.BufferGeometry();
  winGeo.setAttribute('position', new THREE.Float32BufferAttribute(wPos, 3));
  winGeo.setAttribute('color', new THREE.Float32BufferAttribute(wCol, 3));
  scene.add(new THREE.Points(winGeo, new THREE.PointsMaterial({ size: .07, vertexColors: true, transparent: true, opacity: .8 })));
  const grid = new THREE.GridHelper(260, 130, '#1c2133', '#11141f');
  grid.position.set(0, GROUND, -40); grid.material.transparent = true; grid.material.opacity = .45;
  scene.add(grid);
  scene.add(new THREE.HemisphereLight('#3a4470', '#05060A', 1.1));
  const dir = new THREE.DirectionalLight('#8B7CFF', .8); dir.position.set(-20, 30, 10); scene.add(dir);

  /* ---- stars ---- */
  const SN = mobile ? 900 : 2200, sPos = [];
  for (let k = 0; k < SN; k++) sPos.push((Math.random() - .5) * 300, 10 + Math.random() * 90, 60 - Math.random() * 300);
  const starGeo = new THREE.BufferGeometry(); starGeo.setAttribute('position', new THREE.Float32BufferAttribute(sPos, 3));
  const stars = new THREE.Points(starGeo, new THREE.PointsMaterial({ color: '#c9ccff', size: .35, map: sprite, transparent: true, opacity: .55, depthWrite: false, fog: false }));
  scene.add(stars);

  /* ---- bloom (desktop only) ---- */
  let composer = null;
  if (!mobile) {
    composer = new EffectComposer(renderer);
    composer.addPass(new RenderPass(scene, camera));
    composer.addPass(new UnrealBloomPass(new THREE.Vector2(innerWidth, innerHeight), .62, .5, .22));
    composer.addPass(new OutputPass());
  }

  return { renderer, scene, camera, composer, curve, stopT, stations, drawDone, jPos, jCol, jamGeo, chaos, phase, PER,
    pT, pS, pPos, pCol, pulseGeo, pod, podLight, trailPos, trailCol, trailGeo, TRAIL, stars };
}

/* =====================================================================
   STATE DRIVEN BY SCROLL
   ===================================================================== */
const N = 6;
const S = { hero: 0, journey: 0, after: 0, mx: 0, my: 0 };
const chaps = $$('.chap'), railBtns = $$('#rail button');
const story = $('#story');
story.style.height = (N * 100 + 100) + 'svh';

ScrollTrigger.create({ trigger: '.hero', start: 'top top', end: 'bottom top', onUpdate: s => { S.hero = s.progress; } });
const jST = ScrollTrigger.create({ trigger: story, start: 'top top', end: 'bottom bottom', onUpdate: s => { S.journey = s.progress; } });
ScrollTrigger.create({ trigger: '#leadership', start: 'top bottom', end: 'top 20%', onUpdate: s => { S.after = s.progress; } });

// where along the line the camera sits for a given journey progress
function camT(p) {
  const x = p * N, st = gl ? gl.stopT : [0, .2, .4, .6, .8, 1];
  const kx = [0, .45, 1.45, 2.45, 3.45, 4.45, 5.45, 6];
  const kt = [Math.max(st[0] - .045, 0), ...st, st[5]];
  for (let i = 0; i < kx.length - 1; i++) if (x <= kx[i + 1]) return lerp(kt[i], kt[i + 1], ease(clamp((x - kx[i]) / (kx[i + 1] - kx[i]))));
  return st[5];
}

/* ---- chapter cards ---- */
let active = -1;
function chapterAlpha(i, p) {
  const x = p * N - i;
  const inA = i === 0 ? 1 : smooth(-.02, .14, x), outA = i === N - 1 ? 1 : 1 - smooth(.84, .98, x);
  return inA * outA;
}
function countUp(el) {
  const to = parseFloat(el.dataset.to); if (isNaN(to)) return;
  const pre = el.dataset.pre || '', suf = el.dataset.suf || '', dec = +(el.dataset.dec || 0), o = { v: 0 };
  gsap.to(o, { v: to, duration: RM ? 0 : 1.2, ease: 'power3.out', onUpdate: () => { el.textContent = pre + o.v.toFixed(dec) + suf; } });
}
function enterChapter(i) {
  const c = chaps[i]; if (!c) return;
  const parts = c.querySelectorAll('.stop, h3, .body, .ff > div, .met, .prods a, .card .btn');
  gsap.fromTo(parts, { y: 26, autoAlpha: 0 }, { y: 0, autoAlpha: 1, duration: RM ? 0 : .7, stagger: RM ? 0 : .05, ease: 'power3.out', overwrite: true });
  gsap.fromTo(c.querySelector('.num'), { y: 30, autoAlpha: 0 }, { y: 0, autoAlpha: 1, duration: .9, ease: 'power3.out' });
  c.querySelectorAll('[data-to]').forEach(countUp);
}
function updateChapters() {
  const p = S.journey;
  const idx = Math.min(N - 1, Math.floor(p * N + .0001));
  chaps.forEach((c, i) => {
    const a = chapterAlpha(i, p), x = p * N - i;
    c.style.visibility = a > .01 ? 'visible' : 'hidden';
    c.style.opacity = a;
    c.firstElementChild.style.transform = `translate3d(0,${(1 - a) * (x < .5 ? 40 : -40)}px,0)`;
  });
  if (idx !== active) {
    active = idx; enterChapter(idx);
    $('#jstop').textContent = `Stop ${String(idx + 1).padStart(2, '0')} / 0${N}`;
  }
  railBtns.forEach((b, i) => { b.classList.toggle('on', i === idx); b.classList.toggle('done', i < idx); });
  $('#jfill').style.width = (p * 100) + '%';
}
railBtns.forEach(b => b.addEventListener('click', () => {
  const i = +b.dataset.go, top = story.offsetTop, len = story.offsetHeight - innerHeight;
  scrollToY(top + len * ((i + .5) / N));
}));

/* =====================================================================
   THE LOOP
   ===================================================================== */
const camPos = new THREE.Vector3(26, 34, 44), camLook = new THREE.Vector3(0, -2, -40);
const tgtPos = new THREE.Vector3(), tgtLook = new THREE.Vector3();
const fP = new THREE.Vector3(), fL = new THREE.Vector3(), tmp = new THREE.Vector3(), tan = new THREE.Vector3();
let viewShift = 0, last = performance.now(), introCam = 1;
const OVER_P = new THREE.Vector3(24, 30, 46), OVER_L = new THREE.Vector3(-2, -3, -38);
const END_P = new THREE.Vector3(-38, 46, -18), END_L = new THREE.Vector3(1, 0, -52);

// each stop gets its own camera angle: [behind, height, side]
const SHOTS = [[12, 4.5, 4.5], [10, 7, -6], [13, 3.2, 5.5], [9, 8, -5], [12, 5, 7], [15, 9, -3]];
function followPose(t, outP, outL, x = 0) {
  const { curve } = gl;
  // blend between the shot of the stop we just left and the next one
  const seg = Math.floor(x - .45), f = x < .45 ? 0 : ease(clamp(x - .45 - seg));
  const a0 = SHOTS[clamp(seg, 0, 5)], a1 = SHOTS[clamp(seg + 1, 0, 5)];
  const back = lerp(a0[0], a1[0], f), up = lerp(a0[1], a1[1], f), sd = lerp(a0[2], a1[2], f);
  curve.getPointAt(t, fP); curve.getTangentAt(t, tan);
  const side = tmp.crossVectors(tan, UP).normalize();
  outP.copy(fP).addScaledVector(tan, -back).addScaledVector(UP, up).addScaledVector(side, sd);
  curve.getPointAt(Math.min(t + .012, 1), outL); outL.y += .2;
}

function frame() {
  const now = performance.now(), dt = Math.min((now - last) / 1000, .05); last = now;
  updateChapters();
  if (!gl) return;
  const { renderer, scene, camera, composer, stations, stopT, curve } = gl;
  const time = now / 1000;

  // camera target: overview (hero) -> riding (journey) -> wide shot (after)
  const jp = S.journey, t = camT(jp);
  followPose(t, tgtPos, tgtLook, jp * N);
  const h = ease(clamp(S.hero));
  if (jp <= 0.0001 && h < 1) { tgtPos.lerpVectors(OVER_P, tgtPos, h); tgtLook.lerpVectors(OVER_L, tgtLook, h); }
  const a = ease(clamp(S.after));
  if (a > 0) { tgtPos.lerp(END_P, a); tgtLook.lerp(END_L, a); }
  // gentle drift + pointer parallax
  tgtPos.x += Math.sin(time * .25) * .4 + S.mx * 1.6;
  tgtPos.y += Math.cos(time * .2) * .3 - S.my * 1.0;
  if (introCam > 0) tgtPos.y += introCam * 30, tgtPos.z += introCam * 40;
  const k = 1 - Math.exp(-dt * (RM ? 60 : 3.2));
  camPos.lerp(tgtPos, k); camLook.lerp(tgtLook, k);
  camera.position.copy(camPos); camera.lookAt(camLook);

  // push the 3D to the right while a chapter card sits on the left (desktop)
  const wantShift = !isMobile() && jp > 0 && jp < 1 ? .2 * (1 - a) : 0;
  viewShift = lerp(viewShift, wantShift, 1 - Math.exp(-dt * 4));
  const w = innerWidth, hh = innerHeight;
  camera.setViewOffset(w, hh, -w * viewShift, 0, w, hh);

  // the pod and the finished part of the line
  const podT = Math.min(1, t + .006) + (a > 0 ? (1 - Math.min(1, t + .006)) * a : 0);
  curve.getPointAt(Math.min(podT, 1), tmp); gl.pod.position.copy(tmp);
  curve.getTangentAt(Math.min(podT, .999), tan); gl.pod.lookAt(tmp.clone().add(tan));
  gl.drawDone(podT);
  // trail
  for (let i = 0; i < gl.TRAIL; i++) {
    const tt = Math.max(0, podT - i * .0016); curve.getPointAt(tt, tmp);
    gl.trailPos.set([tmp.x, tmp.y, tmp.z], i * 3);
    const f = (1 - i / gl.TRAIL) * .8; gl.trailCol.set([.18 * f, .95 * f, .76 * f], i * 3);
  }
  gl.trailGeo.attributes.position.needsUpdate = gl.trailGeo.attributes.color.needsUpdate = true;

  // stations: the one you're at glows; visited ones turn teal; jams clear
  const x = jp * N;
  stations.forEach((s, i) => {
    const target = a > 0 ? 1 : (x >= i + .22 || jp >= 1 ? 1 : 0);
    s.fix = lerp(s.fix, target, 1 - Math.exp(-dt * 2.2));
    const here = a > .5 ? 0 : clamp(1 - Math.abs(x - (i + .45)) * 1.4);
    s.glowNow = lerp(s.glowNow, here, 1 - Math.exp(-dt * 5));
    const col = C_SIGNAL.clone().lerp(C_FIX, s.fix);
    s.ringMat.color.copy(col).multiplyScalar(.85 + s.glowNow * .35);
    s.beam.material.color.copy(col); s.beam.material.opacity = .18 + s.glowNow * .35;
    s.halo.material.color.copy(col); s.halo.scale.setScalar(2.2 + s.glowNow * 1.1 + Math.sin(time * 2 + i) * .12);
    s.ring.scale.setScalar(1 + s.glowNow * .15);
    s.ring2.rotation.z = time * .3 + i; s.ring2.scale.setScalar(1 + s.glowNow * .5);
  });

  // friction particles: chaotic swarm -> four calm lanes flowing along the line
  const { jPos, jCol, chaos, phase, PER } = gl;
  for (let si = 0; si < stations.length; si++) {
    const s = stations[si], m = ease(clamp(s.fix)), base = s.g.position;
    const cJ = C_SIGNAL, cF = C_FIX;
    for (let j = 0; j < PER; j++) {
      const kk = si * PER + j, c = chaos[kk], ph = phase[kk];
      const jx = base.x + c.x + Math.sin(time * 2.1 + ph) * .22, jy = base.y + c.y + Math.cos(time * 1.7 + ph) * .22, jz = base.z + c.z + Math.sin(time * 1.3 + ph * 2) * .22;
      const lane = j % 4, slot = Math.floor(j / 4), slots = PER / 4;
      const along = (((slot / slots) + time * .06) % 1 - .5) * 7;
      const lx = base.x + s.tan.x * along + s.side.x * (lane - 1.5) * .34;
      const ly = base.y - .9 + s.tan.y * along;
      const lz = base.z + s.tan.z * along + s.side.z * (lane - 1.5) * .34;
      jPos[kk * 3] = lerp(jx, lx, m); jPos[kk * 3 + 1] = lerp(jy, ly, m); jPos[kk * 3 + 2] = lerp(jz, lz, m);
      const fl = .55 + .45 * Math.sin(time * 6 + ph) * (1 - m);
      jCol[kk * 3] = lerp(cJ.r * fl, cF.r, m); jCol[kk * 3 + 1] = lerp(cJ.g * fl, cF.g, m); jCol[kk * 3 + 2] = lerp(cJ.b * fl, cF.b, m);
    }
  }
  gl.jamGeo.attributes.position.needsUpdate = gl.jamGeo.attributes.color.needsUpdate = true;

  // traffic pulses: teal behind the pod, orange ahead of it
  for (let i = 0; i < gl.pT.length; i++) {
    gl.pT[i] = (gl.pT[i] + gl.pS[i] * dt * (RM ? 0 : 1)) % 1;
    curve.getPointAt(gl.pT[i], tmp); gl.pPos.set([tmp.x, tmp.y, tmp.z], i * 3);
    const c = gl.pT[i] < podT ? C_FIX : C_SIGNAL; gl.pCol.set([c.r * .9, c.g * .9, c.b * .9], i * 3);
  }
  gl.pulseGeo.attributes.position.needsUpdate = gl.pulseGeo.attributes.color.needsUpdate = true;
  gl.stars.rotation.y = time * .004;

  composer ? composer.render() : renderer.render(scene, camera);
}

gsap.ticker.add(t => { lenis && lenis.raf(t * 1000); frame(); });
gsap.ticker.lagSmoothing(0);

addEventListener('resize', () => {
  if (!gl) return;
  gl.camera.aspect = innerWidth / innerHeight; gl.camera.updateProjectionMatrix();
  gl.renderer.setSize(innerWidth, innerHeight, false);
  gl.composer && gl.composer.setSize(innerWidth, innerHeight);
});
addEventListener('pointermove', e => { S.mx = e.clientX / innerWidth - .5; S.my = e.clientY / innerHeight - .5; }, { passive: true });

// dim the 3D once the route is done, so the rest of the page reads clean
gsap.to('#gl', { opacity: .16, ease: 'none', scrollTrigger: { trigger: '#leadership', start: 'top 70%', end: 'top 10%', scrub: true } });

/* =====================================================================
   UI MOTION
   ===================================================================== */
// split-line headings
$$('.split:not(.hero h1)').forEach(h => {
  gsap.from(h.querySelectorAll('.ln > span'), { yPercent: 110, duration: 1.1, ease: 'power4.out', stagger: .08,
    scrollTrigger: { trigger: h, start: 'top 85%' } });
});
ScrollTrigger.batch('.reveal:not(.hero .reveal)', {
  start: 'top 88%', once: true,
  onEnter: els => gsap.fromTo(els, { y: 30, autoAlpha: 0 }, { y: 0, autoAlpha: 1, duration: .9, ease: 'power3.out', stagger: .08 })
});
gsap.set('.reveal:not(.hero .reveal)', { autoAlpha: 0 });

// leadership: horizontal track on desktop
const mm = gsap.matchMedia();
mm.add('(min-width: 901px)', () => {
  const track = $('#htrack');
  const dist = () => Math.max(0, track.scrollWidth - innerWidth);
  const tw = gsap.to(track, { x: () => -dist(), ease: 'none',
    scrollTrigger: { trigger: '#leadership', start: 'top top', end: () => '+=' + dist(), pin: true, scrub: 1, invalidateOnRefresh: true, anticipatePin: 1 } });
  $$('.lcard').forEach((c, i) => gsap.from(c, { y: 60 + i * 12, rotate: 2, autoAlpha: 0, duration: 1, ease: 'power3.out', scrollTrigger: { trigger: '#leadership', start: 'top 70%' }, delay: i * .06 }));
  const img = $('.lcard.photo img');
  if (img) gsap.to(img, { xPercent: 6, ease: 'none', scrollTrigger: { trigger: '#leadership', start: 'top top', end: () => '+=' + dist(), scrub: true } });
  return () => tw.kill();
});
mm.add('(max-width: 900px)', () => {
  $$('.lcard').forEach(c => gsap.from(c, { y: 40, autoAlpha: 0, duration: .9, ease: 'power3.out', scrollTrigger: { trigger: c, start: 'top 88%' } }));
});

// recognition rows slide in
gsap.from('.wrow', { x: -40, autoAlpha: 0, stagger: .08, duration: .9, ease: 'power3.out', scrollTrigger: { trigger: '.wlist', start: 'top 80%' } });

// topbar goes solid after the hero starts scrolling
ScrollTrigger.create({ start: 40, onUpdate: s => $('#topbar').classList.toggle('solid', s.scroll() > 40) });

/* ---- hero portrait: 3D tilt + depth on the chips ---- */
if (FINE && !RM) {
  const pimg = $('#pimg'), chips = $$('.chip');
  const rx = gsap.quickTo(pimg, 'rotationX', { duration: .8, ease: 'power3' }), ry = gsap.quickTo(pimg, 'rotationY', { duration: .8, ease: 'power3' });
  gsap.set('#portrait', { perspective: 900 });
  const cx = chips.map((c, i) => [gsap.quickTo(c, 'x', { duration: 1, ease: 'power3' }), gsap.quickTo(c, 'y', { duration: 1, ease: 'power3' }), (i % 2 ? 1 : -1) * (18 + i * 6)]);
  $('.hero').addEventListener('pointermove', e => {
    const x = e.clientX / innerWidth - .5, y = e.clientY / innerHeight - .5;
    ry(x * 10); rx(-y * 8); cx.forEach(([fx, fy, d]) => { fx(x * d); fy(y * d * .6); });
  });
}
// portrait drifts up and fades as you scroll into the route
gsap.to('#portrait', { yPercent: -12, autoAlpha: .0, ease: 'none', scrollTrigger: { trigger: '.hero', start: 'top top', end: 'bottom top', scrub: true } });
gsap.to('.hero .hgrid > div:first-child', { yPercent: -18, autoAlpha: 0, ease: 'none', scrollTrigger: { trigger: '.hero', start: '30% top', end: 'bottom top', scrub: true } });

/* ---- magnetic buttons + cursor ---- */
if (FINE && !RM) {
  $$('.magnet').forEach(el => {
    const mx = gsap.quickTo(el, 'x', { duration: .6, ease: 'power3' }), my = gsap.quickTo(el, 'y', { duration: .6, ease: 'power3' });
    el.addEventListener('pointermove', e => { const r = el.getBoundingClientRect(); mx((e.clientX - r.left - r.width / 2) * .3); my((e.clientY - r.top - r.height / 2) * .35); });
    el.addEventListener('pointerleave', () => { mx(0); my(0); });
  });
  const cur = $('#cur'), dot = cur.querySelector('.dot'), ring = cur.querySelector('.ring');
  const dx = gsap.quickTo(dot, 'x', { duration: .08 }), dy = gsap.quickTo(dot, 'y', { duration: .08 });
  const rx2 = gsap.quickTo(ring, 'x', { duration: .45, ease: 'power3' }), ry2 = gsap.quickTo(ring, 'y', { duration: .45, ease: 'power3' });
  addEventListener('pointermove', e => { cur.classList.add('on'); dx(e.clientX); dy(e.clientY); rx2(e.clientX); ry2(e.clientY); });
  document.addEventListener('pointerover', e => cur.classList.toggle('big', !!e.target.closest('a,button,[role="button"]')));
}

/* ---- copy email ---- */
const toast = (msg) => { const t = $('#toast'); t.textContent = msg; t.classList.add('on'); clearTimeout(toast.t); toast.t = setTimeout(() => t.classList.remove('on'), 2200); };
document.addEventListener('click', e => {
  const b = e.target.closest('[data-copy]'); if (!b) return;
  (navigator.clipboard ? navigator.clipboard.writeText(b.dataset.copy) : Promise.reject()).then(() => toast('Email copied')).catch(() => toast(b.dataset.copy));
});

/* ---- business card ---- */
(() => {
  const overlay = $('#biz-overlay'), card = $('#biz-card');
  const reset = () => { card.style.setProperty('--rx', 0); card.style.setProperty('--ry', 0); card.style.setProperty('--mx', 50); card.style.setProperty('--my', 50); };
  const open = e => { e.preventDefault(); overlay.classList.add('active'); lenis && lenis.stop(); window.profileDialog ? window.profileDialog.open(overlay, e.currentTarget) : overlay.setAttribute('aria-hidden', 'false'); };
  const close = () => { overlay.classList.remove('active'); window.profileDialog ? window.profileDialog.close() : overlay.setAttribute('aria-hidden', 'true'); lenis && lenis.start(); reset(); };
  $$('.biz-card-trigger').forEach(t => t.addEventListener('click', open));
  $('#biz-close').addEventListener('click', close);
  overlay.addEventListener('click', e => { if (e.target === overlay || e.target.classList.contains('biz-card-wrapper')) close(); });
  addEventListener('keydown', e => { if (e.key === 'Escape' && overlay.classList.contains('active')) close(); });
  card.addEventListener('mousemove', e => {
    const r = card.getBoundingClientRect(), x = e.clientX - r.left, y = e.clientY - r.top;
    card.style.setProperty('--mx', x / r.width * 100); card.style.setProperty('--my', y / r.height * 100);
    card.style.setProperty('--rx', (y / r.height - .5) * -5); card.style.setProperty('--ry', (x / r.width - .5) * 5);
  });
  card.addEventListener('mouseleave', reset);
})();

/* =====================================================================
   INTRO: loader -> curtain -> hero
   ===================================================================== */
function intro() {
  const heroIn = gsap.timeline({ paused: true })
    .from('.hero h1 .ln > span', { yPercent: 115, duration: 1.2, ease: 'power4.out', stagger: .1 })
    .from('.hero .reveal', { y: 30, autoAlpha: 0, duration: .9, ease: 'power3.out', stagger: .08 }, '-=.8')
    .from('#portrait', { scale: .9, autoAlpha: 0, duration: 1.3, ease: 'power3.out' }, '-=1.2')
    .from('.chip', { scale: .6, autoAlpha: 0, duration: .7, ease: 'back.out(2)', stagger: .09 }, '-=.7');
  const camIn = () => gsap.to({ v: 1 }, { v: 0, duration: RM ? 0 : 2.6, ease: 'power3.out', onUpdate() { introCam = this.targets()[0].v; } });

  if (RM) { $('#loader').remove(); introCam = 0; heroIn.progress(1); return; }
  lenis && lenis.stop();
  const o = { v: 0 }, lc = $('#lcount'), lb = $('#lbar');
  const ready = Promise.race([Promise.all([document.fonts ? document.fonts.ready : 0, new Promise(r => (document.readyState === 'complete' ? r() : addEventListener('load', r)))]), new Promise(r => setTimeout(r, 3500))]);
  gsap.to(o, { v: 86, duration: 1.4, ease: 'power2.out', onUpdate: () => { lc.textContent = Math.round(o.v); lb.style.width = o.v + '%'; } });
  gsap.from('.loader .lname span', { yPercent: 110, duration: 1, ease: 'power4.out', stagger: .08 });
  Promise.all([ready, new Promise(r => setTimeout(r, 1500))]).then(() => {
    gsap.timeline()
      .to(o, { v: 100, duration: .35, ease: 'power1.in', onUpdate: () => { lc.textContent = Math.round(o.v); lb.style.width = o.v + '%'; } })
      .to('.loader .lname span, .loader .lrow', { yPercent: -110, autoAlpha: 0, duration: .6, ease: 'power3.in', stagger: .04 })
      .to('#loader', { clipPath: 'inset(0 0 100% 0)', duration: .9, ease: 'power4.inOut' }, '-=.15')
      .add(() => { camIn(); heroIn.play(); lenis && lenis.start(); ScrollTrigger.refresh(); }, '-=.55')
      .add(() => $('#loader').remove());
  });
}
intro();
