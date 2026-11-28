/* main.js: boots Pratham's Town. Renderer, quality tier, districts, life, player, UI, loop.
   Test hooks (see PLAN.md): ?only=<id,id> ?cam=x,z,dist,yaw,pitch ?quality=low|high ?nopost ?noui ?spot=<place.spot> */
import * as THREE from 'three';
import { EffectComposer } from 'three/addons/postprocessing/EffectComposer.js';
import { RenderPass } from 'three/addons/postprocessing/RenderPass.js';
import { ShaderPass } from 'three/addons/postprocessing/ShaderPass.js';
import { OutputPass } from 'three/addons/postprocessing/OutputPass.js';
import { GTAOPass } from 'three/addons/postprocessing/GTAOPass.js';
import { HorizontalTiltShiftShader } from 'three/addons/shaders/HorizontalTiltShiftShader.js';
import { VerticalTiltShiftShader } from 'three/addons/shaders/VerticalTiltShiftShader.js';
import { GLTFLoader } from 'three/addons/loaders/GLTFLoader.js';
import * as kit from './kit.js';
import * as content from './content.js';
import * as layout from './layout.js';
import { buildEnv } from './env.js';

const params = new URLSearchParams(location.search);
const progress = (p, label) => dispatchEvent(new CustomEvent('world:progress', { detail: { p, label } }));
const DISTRICTS = ['plaza', 'htl', 'bb', 'dtu', 'lss', 'bitsom', 'lead', 'ailab', 'curious', 'team'].filter(id => id !== 'plaza');

function detectQuality() {
  const q = params.get('quality'); if (q === 'low' || q === 'high') return q;
  const coarse = matchMedia('(pointer: coarse)').matches, small = Math.min(innerWidth, innerHeight) < 700;
  const mem = navigator.deviceMemory || 8, cores = navigator.hardwareConcurrency || 8;
  return coarse || small || mem < 4 || cores < 4 ? 'low' : 'high';
}

async function start() {
  const quality = detectQuality(); kit.setQuality(quality);
  const low = quality === 'low', usePost = !low && !params.has('nopost');
  const canvas = document.getElementById('world');
  let renderer;
  try {
    renderer = new THREE.WebGLRenderer({ canvas, antialias: !usePost, powerPreference: 'high-performance', preserveDrawingBuffer: params.has('cam') });
  } catch (e) { dispatchEvent(new CustomEvent('world:fail', { detail: e })); return; }
  renderer.setPixelRatio(Math.min(devicePixelRatio || 1, low ? 1.3 : 1.75));
  renderer.setSize(innerWidth, innerHeight, false);
  renderer.toneMapping = THREE.ACESFilmicToneMapping; renderer.toneMappingExposure = 1.02;
  renderer.shadowMap.enabled = true; renderer.shadowMap.type = THREE.PCFSoftShadowMap;
  const scene = new THREE.Scene();
  const camera = new THREE.PerspectiveCamera(low && innerWidth < innerHeight ? 40 : 30, innerWidth / innerHeight, 1, 3000);
  camera.position.set(0, 60, 80); camera.lookAt(0, 0, 0);

  try { await Promise.race([Promise.all(['800 64px Inter', '700 64px Inter', '500 64px Inter'].map(f => document.fonts.load(f))), new Promise(r => setTimeout(r, 2500))]); } catch (_) {}
  progress(.08, 'Laying the roads');

  const env = buildEnv({ scene, renderer, quality });
  const gltfCache = new Map(), loader = new GLTFLoader();
  const loadGLTF = url => { if (!gltfCache.has(url)) gltfCache.set(url, loader.loadAsync(url)); return gltfCache.get(url); };
  const ctxBase = { THREE, kit, M: kit.M, content, layout, quality, rng: kit.rng, scene, renderer, camera, loadGLTF };

  const only = params.get('only') ? params.get('only').split(',') : null;
  const want = id => !only || only.includes(id);
  const colliders = [...env.colliders], spots = [...env.spots], updaters = [env.update], districtGroups = {};
  const ids = DISTRICTS.filter(want);
  let done = 0;
  await Promise.all(ids.map(async id => {
    try {
      const mod = await import(`./districts/${id}.js`);
      const res = await mod.build(Object.assign({}, ctxBase, { plot: layout.PLOTS[id] }));
      res.group.name = id; scene.add(res.group); districtGroups[id] = res.group;
      (res.colliders || []).forEach(c => colliders.push(Object.assign({ owner: id }, c)));
      (res.spots || []).forEach(s => spots.push(Object.assign({}, s, { id: s.id.includes('.') ? s.id : `${id}.${s.id}` })));
      if (res.update) updaters.push(res.update);
    } catch (e) { console.warn(`[world] district ${id} not built:`, e); }
    progress(.1 + .65 * (++done / ids.length), 'Building the town');
  }));
  if (!only || only.includes('life')) {
    try {
      const mod = await import('./life.js');
      const res = await mod.build(Object.assign({}, ctxBase, { colliders, spots }));
      if (res.group) { res.group.name = 'life'; scene.add(res.group); districtGroups.life = res.group; }
      (res.colliders || []).forEach(c => colliders.push(Object.assign({ owner: 'life' }, c)));
      if (res.update) updaters.push(res.update);
    } catch (e) { console.warn('[world] life not built:', e); }
  }
  districtGroups.pools = kit.flushPools(scene);
  // validate spot ids against content
  for (const s of spots) if (!content.spotById(s.id)) console.warn('[world] spot without content:', s.id);
  progress(.82, 'Waking everyone up');

  /* ---------- post effects ---------- */
  let composer = null, tilt = null;
  if (usePost) {
    const rt = new THREE.WebGLRenderTarget(innerWidth, innerHeight, { samples: 4, type: THREE.HalfFloatType });
    composer = new EffectComposer(renderer, rt);
    composer.setPixelRatio(renderer.getPixelRatio());
    composer.addPass(new RenderPass(scene, camera));
    if (!params.has('noao')) {
      const ao = new GTAOPass(scene, camera, innerWidth, innerHeight);
      ao.updateGtaoMaterial({ radius: 1.6, distanceExponent: 1.6, thickness: 2, scale: 1, samples: 12 });
      ao.blendIntensity = .9; composer.addPass(ao);
    }
    const h = new ShaderPass(HorizontalTiltShiftShader), v = new ShaderPass(VerticalTiltShiftShader);
    composer.addPass(h); composer.addPass(v); tilt = { h, v };
    composer.addPass(new OutputPass());
  }
  const setTilt = () => { if (!tilt) return; const k = 1.6; tilt.h.uniforms.h.value = k / innerWidth; tilt.v.uniforms.v.value = k / innerHeight; tilt.h.uniforms.r.value = tilt.v.uniforms.r.value = .52; };
  setTilt();

  /* ---------- camera helper (used when there's no player, and by tests) ---------- */
  const look = (x, z, dist = 40, yaw = 0, pitch = 42) => {
    const p = THREE.MathUtils.degToRad(pitch), y = THREE.MathUtils.degToRad(yaw);
    camera.position.set(x + Math.sin(y) * Math.cos(p) * dist, Math.sin(p) * dist, z + Math.cos(y) * Math.cos(p) * dist);
    camera.lookAt(x, 0, z); env.follow(x, z);
    if (player) player.freeCam = true;
  };

  /* ---------- player and UI (optional modules) ---------- */
  const world = { scene, renderer, camera, quality, colliders, spots, districts: districtGroups, look, env, layout, content, kit };
  let player = null, ui = null;
  if (!params.has('cam')) {
    try { const m = await import('./player.js'); player = await m.createPlayer(Object.assign({}, ctxBase, { colliders, spots, env, canvas })); world.player = player; }
    catch (e) { console.warn('[world] player not loaded:', e); }
  }
  if (!params.has('noui')) {
    try { const m = await import('./ui.js'); ui = await m.createUI(Object.assign({}, ctxBase, { spots, player, world })); world.ui = ui; }
    catch (e) { console.warn('[world] ui not loaded:', e); }
  }
  if (params.get('cam')) { const [x, z, d, yw, pt] = params.get('cam').split(',').map(Number); look(x, z, d || 40, yw || 0, isNaN(pt) ? 42 : pt); }
  else if (!player) look(0, 0, 150, 0, 50);

  /* ---------- intro: the town snaps together, brick by brick ---------- */
  const drops = [];
  addEventListener('world:enter', () => {
    if (matchMedia('(prefers-reduced-motion: reduce)').matches) return;
    const order = ['pools', 'life', ...DISTRICTS];
    order.map(k => districtGroups[k]).filter(Boolean).forEach((g, i) => {
      const y0 = g.position.y; g.position.y = y0 + 70;
      drops.push({ g, y0, start: .25 + i * .16 + Math.random() * .08, dur: .95 });
    });
  });
  const bounce = x => { const n = 7.5625, d = 2.75; if (x < 1 / d) return n * x * x; if (x < 2 / d) return n * (x -= 1.5 / d) * x + .75; if (x < 2.5 / d) return n * (x -= 2.25 / d) * x + .9375; return n * (x -= 2.625 / d) * x + .984375; };
  let introT = 0;
  updaters.push(dt => {
    if (!drops.length) return; introT += dt;
    for (let i = drops.length - 1; i >= 0; i--) {
      const d = drops[i], k = Math.min(1, Math.max(0, (introT - d.start) / d.dur));
      d.g.position.y = d.y0 + 70 * (1 - bounce(k));
      if (k >= 1) { d.g.position.y = d.y0; drops.splice(i, 1); }
    }
  });

  /* ---------- loop ---------- */
  let last = performance.now(), t = 0, lastStats = { calls: 0, tris: 0 }, frames = 0;
  const focus = new THREE.Vector3();
  function frame(now) {
    requestAnimationFrame(frame);
    const dt = Math.min((now - last) / 1000, .05); last = now; t += dt; frames++;
    if (player) { player.update(dt, t); if (!player.freeCam) { focus.copy(player.position); env.follow(focus.x, focus.z); } }
    for (const u of updaters) { try { u(dt, t); } catch (e) { console.warn(e); updaters.splice(updaters.indexOf(u), 1); } }
    if (ui) ui.update(dt, t);
    if (composer) composer.render(); else renderer.render(scene, camera);
    lastStats = { calls: renderer.info.render.calls, tris: renderer.info.render.triangles };
  }
  addEventListener('resize', () => {
    camera.aspect = innerWidth / innerHeight; camera.updateProjectionMatrix();
    renderer.setSize(innerWidth, innerHeight, false); if (composer) composer.setSize(innerWidth, innerHeight); setTilt();
  });

  let resolveReady; const ready = new Promise(r => (resolveReady = r));
  Object.assign(world, {
    ready, open: id => ui && ui.open(id),
    stats: () => Object.assign({ frames }, lastStats, { districts: Object.fromEntries(Object.entries(districtGroups).map(([k, g]) => [k, kit.stats(g)])), pools: kit.poolCounts() }),
  });
  window.__world = world;
  requestAnimationFrame(n => { last = n; frame(n); });
  // let a couple of frames render (shaders compile) before saying we're ready
  await new Promise(r => requestAnimationFrame(() => requestAnimationFrame(r)));
  progress(1, 'Ready');
  dispatchEvent(new CustomEvent('world:ready'));
  resolveReady(world);
  if (params.get('spot') && ui) ui.open(params.get('spot'), { travel: !params.has('cam') });
}

start().catch(e => { console.error(e); dispatchEvent(new CustomEvent('world:fail', { detail: e })); });
