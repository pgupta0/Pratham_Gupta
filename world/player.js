/* player.js: Pratham walking around town, and the camera that follows him.
   Keyboard (WASD / arrows, Shift to run), touch joystick (ui.js feeds setInput),
   click/tap-to-walk (goTo), drag to orbit, wheel/pinch to zoom, Q/E to turn the view. */
import * as THREE from 'three';
import { ISLAND, SPAWN } from './layout.js';

const V3 = THREE.Vector3;
const clamp = (v, a, b) => Math.min(b, Math.max(a, v));
const damp = (a, b, k, dt) => a + (b - a) * (1 - Math.exp(-k * dt));
const angDiff = (a, b) => Math.atan2(Math.sin(b - a), Math.cos(b - a));

/* ---------- character: try the CC0 model, fall back to a built one ---------- */
async function loadModel(ctx) {
  const url = 'world/assets/vendor/character.glb';
  try {
    const head = await fetch(url, { method: 'HEAD' });
    if (!head.ok) throw new Error('no model');
    const gltf = await ctx.loadGLTF(url);
    const root = gltf.scene;
    const box = new THREE.Box3().setFromObject(root), size = box.getSize(new V3());
    const s = 1.78 / (size.y || 1.78); root.scale.setScalar(s);
    box.setFromObject(root); root.position.y -= box.min.y;
    root.traverse(o => { if (o.isMesh) { o.castShadow = true; o.receiveShadow = false; o.frustumCulled = false; } });
    const mixer = new THREE.AnimationMixer(root), clips = gltf.animations || [];
    const find = (...names) => clips.find(c => names.some(n => c.name.toLowerCase().includes(n)));
    const acts = { idle: find('idle', 'stand'), walk: find('walk'), run: find('run', 'jog') };
    if (!acts.walk) throw new Error('model has no walk clip');
    Object.keys(acts).forEach(k => { if (acts[k]) acts[k] = mixer.clipAction(acts[k]); });
    if (!acts.run) acts.run = acts.walk; if (!acts.idle) acts.idle = acts.walk;
    acts.idle.play(); acts.walk.play(); acts.run.play();
    acts.walk.setEffectiveWeight(0); acts.run.setEffectiveWeight(0);
    const wrap = new THREE.Group(); wrap.add(root);
    let w = { idle: 1, walk: 0, run: 0 };
    return {
      object: wrap,
      animate(dt, speed) {
        const tw = speed < .2 ? { idle: 1, walk: 0, run: 0 } : speed < 5.2 ? { idle: 0, walk: 1, run: 0 } : { idle: 0, walk: 0, run: 1 };
        for (const k of ['idle', 'walk', 'run']) { w[k] = damp(w[k], tw[k], 10, dt); acts[k].setEffectiveWeight(w[k]); }
        acts.walk.timeScale = clamp(speed / 1.6, .6, 2.2) * .75; acts.run.timeScale = clamp(speed / 6, .8, 1.6);
        mixer.update(dt);
      },
    };
  } catch (_) { return buildModel(ctx); }
}

// a hand-built Pratham: black suit, white shirt, dark hair. Limbs pivot at hips and shoulders.
function buildModel({ kit }) {
  const M = kit.M, g = new THREE.Group();
  const suit = M.std('#1E2128', { rough: .6, map: null }), shirt = M.std('#F4F4F2', { rough: .7, map: null });
  const skin = M.std('#B57A55', { rough: .65, map: null }), hair = M.std('#17120F', { rough: .8, map: null }), shoe = M.std('#0E0F12', { rough: .35, map: null });
  const pocket = M.std('#FF6A2B', { rough: .6, map: null });
  const limb = (w, h, d, mat, parent, y = 0) => { const m = kit.rbox(w, h, d, Math.min(w, d) * .45, mat, { parent }); m.position.y = y - h; return m; };
  const legs = [-1, 1].map(s => {
    const hip = new THREE.Group(); hip.position.set(s * .1, .92, 0); g.add(hip);
    limb(.15, .88, .17, suit, hip); const sh = kit.rbox(.14, .1, .28, .05, shoe, { parent: hip }); sh.position.set(0, -.92, .05);
    return hip;
  });
  kit.rbox(.42, .62, .25, .1, suit, { parent: g, y: .86 });                     // jacket
  kit.box(.12, .38, .02, shirt, { parent: g, y: 1.1, z: .125 });               // shirt opening
  kit.box(.06, .04, .02, pocket, { parent: g, x: -.12, y: 1.32, z: .126 });    // pocket square
  const arms = [-1, 1].map(s => {
    const sh = new THREE.Group(); sh.position.set(s * .26, 1.43, 0); g.add(sh);
    limb(.12, .6, .13, suit, sh); const hand = kit.sphere(.055, skin, { parent: sh }); hand.position.y = -.68;
    return sh;
  });
  kit.cyl(.055, .065, .08, skin, { parent: g, y: 1.48 });
  const head = kit.sphere(.12, skin, { parent: g, y: 1.53 }); head.scale.set(.95, 1.12, 1.02);
  const hr = kit.sphere(.128, hair, { parent: g, y: 1.6 }); hr.scale.set(1, .72, 1.06); hr.position.z = -.01;
  g.traverse(o => { if (o.isMesh) { o.castShadow = true; o.receiveShadow = false; } });
  let phase = 0;
  return {
    object: g,
    animate(dt, speed, t) {
      phase += dt * (speed > .2 ? 2.2 + speed * .9 : 0);
      const amp = clamp(speed / 4, 0, 1) * (speed > 5.2 ? .75 : .5);
      legs[0].rotation.x = Math.sin(phase) * amp; legs[1].rotation.x = -Math.sin(phase) * amp;
      arms[0].rotation.x = -Math.sin(phase) * amp * .8; arms[1].rotation.x = Math.sin(phase) * amp * .8;
      g.position.y = Math.abs(Math.cos(phase)) * .04 * amp + (speed < .2 ? Math.sin(t * 2) * .004 : 0);
    },
  };
}

/* ---------- collision ---------- */
function resolve(p, colliders, r) {
  for (let iter = 0; iter < 2; iter++) for (const c of colliders) {
    if (c.type === 'circle') {
      const dx = p.x - c.x, dz = p.z - c.z, d = Math.hypot(dx, dz), m = c.r + r;
      if (d < m && d > 1e-4) { p.x = c.x + dx / d * m; p.z = c.z + dz / d * m; }
    } else {
      const rot = c.rot || 0, cs = Math.cos(-rot), sn = Math.sin(-rot);
      let lx = (p.x - c.x) * cs - (p.z - c.z) * sn, lz = (p.x - c.x) * sn + (p.z - c.z) * cs;
      const hx = c.w / 2 + r, hz = c.d / 2 + r;
      if (Math.abs(lx) < hx && Math.abs(lz) < hz) {
        const ox = hx - Math.abs(lx), oz = hz - Math.abs(lz);
        if (ox < oz) lx = Math.sign(lx || 1) * hx; else lz = Math.sign(lz || 1) * hz;
        const cb = Math.cos(rot), sb = Math.sin(rot);
        p.x = c.x + lx * cb - lz * sb; p.z = c.z + lx * sb + lz * cb;
      }
    }
  }
  const lim = ISLAND - 9; p.x = clamp(p.x, -lim, lim); p.z = clamp(p.z, -lim, lim);
}

export async function createPlayer(ctx) {
  const { scene, camera, colliders, canvas, quality } = ctx;
  const model = await loadModel(ctx);
  const root = new THREE.Group(); root.add(model.object); scene.add(root);
  // soft contact shadow so he sits on the ground even where the sun shadow is faint
  const blob = new THREE.Mesh(new THREE.CircleGeometry(.55, 24), new THREE.MeshBasicMaterial({ color: '#000', transparent: true, opacity: .18, depthWrite: false }));
  blob.rotation.x = -Math.PI / 2; blob.position.y = .2; root.add(blob);

  const pos = new V3(SPAWN.x, 0, SPAWN.z);
  let heading = SPAWN.heading, speed = 0;
  const keys = new Set(), input = new THREE.Vector2();      // joystick: x right, y forward
  let target = null, onArrive = null;
  const cam = { yaw: 0, pitch: 46, dist: quality === 'low' && innerWidth < innerHeight ? 40 : 34, yawT: 0, pitchT: 46, distT: quality === 'low' && innerWidth < innerHeight ? 40 : 34, k: 4 };
  const camPos = new V3(), look = new V3(), lookT = new V3();
  const api = {
    position: pos, freeCam: false, get heading() { return heading; }, get speed() { return speed; }, cam,
    setInput(x, y) { input.set(x, y); if (input.lengthSq() > .01) { target = null; onArrive = null; } },
    goTo(x, z, cb) { target = new V3(x, 0, z); onArrive = cb || null; api.freeCam = false; },
    stop() { target = null; onArrive = null; },
    // jump somewhere far (quick travel): the camera glides across town to catch up
    teleport(x, z, h) { pos.set(x, 0, z); if (h !== undefined) { heading = h; cam.yawT = h + Math.PI; } target = null; onArrive = null; if (matchMedia('(prefers-reduced-motion: reduce)').matches) { look.set(x, 1.2, z); } else { cam.k = .9; setTimeout(() => (cam.k = 4), 2600); } api.freeCam = false; },
    update,
  };

  /* keyboard */
  const MOVE = ['KeyW', 'KeyA', 'KeyS', 'KeyD', 'ArrowUp', 'ArrowDown', 'ArrowLeft', 'ArrowRight', 'ShiftLeft', 'ShiftRight', 'KeyQ', 'KeyE'];
  addEventListener('keydown', e => {
    if (e.target.closest && e.target.closest('input,textarea,select,[contenteditable]')) return;
    if (!MOVE.includes(e.code)) return;
    if (document.querySelector('.listview.on, .map.on, .loader:not(.out)')) return;
    if (document.body.classList.contains('panel-open') && e.code !== 'ShiftLeft' && e.code !== 'ShiftRight' && e.code !== 'KeyE') return;
    if (e.code.startsWith('Arrow')) e.preventDefault();
    keys.add(e.code); if (!e.code.startsWith('Shift') && e.code !== 'KeyE') { target = null; onArrive = null; api.freeCam = false; }
  });
  addEventListener('keyup', e => keys.delete(e.code));
  addEventListener('blur', () => keys.clear());

  /* pointer: drag to orbit, click to walk, wheel/pinch to zoom */
  const ray = new THREE.Raycaster(), ndc = new THREE.Vector2(), ground = new THREE.Plane(new V3(0, 1, 0), 0);
  const pts = new Map(); let drag = null, pinch = null;
  canvas.addEventListener('pointerdown', e => {
    pts.set(e.pointerId, { x: e.clientX, y: e.clientY });
    if (pts.size === 1) drag = { x: e.clientX, y: e.clientY, sx: e.clientX, sy: e.clientY, moved: false, id: e.pointerId };
    if (pts.size === 2) { const [a, b] = [...pts.values()]; pinch = { d: Math.hypot(a.x - b.x, a.y - b.y), dist: cam.distT }; drag = null; }
    try { canvas.setPointerCapture(e.pointerId); } catch (_) {}
  });
  canvas.addEventListener('pointermove', e => {
    if (!pts.has(e.pointerId)) return; pts.set(e.pointerId, { x: e.clientX, y: e.clientY });
    if (pinch && pts.size === 2) { const [a, b] = [...pts.values()]; cam.distT = clamp(pinch.dist * pinch.d / Math.max(20, Math.hypot(a.x - b.x, a.y - b.y)), 16, 90); return; }
    if (!drag || drag.id !== e.pointerId) return;
    const dx = e.clientX - drag.x, dy = e.clientY - drag.y; drag.x = e.clientX; drag.y = e.clientY;
    if (Math.hypot(e.clientX - drag.sx, e.clientY - drag.sy) > 6) drag.moved = true;
    if (drag.moved) { cam.yawT -= dx * .006; cam.pitchT = clamp(cam.pitchT + dy * .18, 22, 78); api.freeCam = false; }
  });
  const up = e => {
    const was = drag && drag.id === e.pointerId && !drag.moved && pts.size === 1;
    pts.delete(e.pointerId); if (pts.size < 2) pinch = null;
    if (was) {
      ndc.set(e.clientX / innerWidth * 2 - 1, -(e.clientY / innerHeight) * 2 + 1); ray.setFromCamera(ndc, camera);
      const hit = new V3(); if (ray.ray.intersectPlane(ground, hit)) { api.goTo(hit.x, hit.z); dispatchEvent(new CustomEvent('world:walkto', { detail: { x: hit.x, z: hit.z } })); }
    }
    if (!pts.size) drag = null;
  };
  canvas.addEventListener('pointerup', up); canvas.addEventListener('pointercancel', up);
  canvas.addEventListener('wheel', e => { e.preventDefault(); cam.distT = clamp(cam.distT * (1 + Math.sign(e.deltaY) * .1), 16, 90); }, { passive: false });

  const tmp = new V3();
  function update(dt, t) {
    // desired direction, relative to the camera's view
    let ix = 0, iy = 0;
    if (keys.has('KeyW') || keys.has('ArrowUp')) iy += 1;
    if (keys.has('KeyS') || keys.has('ArrowDown')) iy -= 1;
    if (keys.has('KeyA') || keys.has('ArrowLeft')) ix -= 1;
    if (keys.has('KeyD') || keys.has('ArrowRight')) ix += 1;
    if (keys.has('KeyQ')) cam.yawT += dt * 1.6;
    if (keys.has('KeyE') && !document.body.classList.contains('near-spot')) cam.yawT -= dt * 1.6;
    ix += input.x; iy += input.y;
    let mag = Math.min(1, Math.hypot(ix, iy)), dirX = 0, dirZ = 0;
    const fwdX = -Math.sin(cam.yaw), fwdZ = -Math.cos(cam.yaw), rightX = Math.cos(cam.yaw), rightZ = -Math.sin(cam.yaw);
    if (mag > .05) { const n = Math.hypot(ix, iy); dirX = (fwdX * iy + rightX * ix) / n; dirZ = (fwdZ * iy + rightZ * ix) / n; }
    else if (target) {
      const dx = target.x - pos.x, dz = target.z - pos.z, d = Math.hypot(dx, dz);
      if (d < .35) { target = null; const cb = onArrive; onArrive = null; if (cb) cb(); }
      else { dirX = dx / d; dirZ = dz / d; mag = clamp(d / 1.2, .25, 1); }
    }
    const running = keys.has('ShiftLeft') || keys.has('ShiftRight') || (target && Math.hypot(target.x - pos.x, target.z - pos.z) > 18);
    const vmax = (running ? 7.2 : 4.2) * mag;
    speed = damp(speed, dirX || dirZ ? vmax : 0, 8, dt);
    if (dirX || dirZ) { const h = Math.atan2(dirX, dirZ); heading += angDiff(heading, h) * (1 - Math.exp(-12 * dt)); }
    if (speed > .01) {
      const before = tmp.copy(pos);
      pos.x += Math.sin(heading) * speed * dt; pos.z += Math.cos(heading) * speed * dt;
      const bx = before.x, bz = before.z;
      resolve(pos, colliders, .42);
      // stuck against something while walking to a target: give up rather than jitter
      if (target && Math.hypot(pos.x - bx, pos.z - bz) < speed * dt * .15) { target.stuck = (target.stuck || 0) + dt; if (target.stuck > .6) { target = null; onArrive = null; } }
    }
    root.position.set(pos.x, 0, pos.z); root.rotation.y = heading;
    model.animate(dt, speed, t);

    // camera
    if (api.freeCam) return;
    cam.yaw = cam.yaw + angDiff(cam.yaw, cam.yawT) * (1 - Math.exp(-6 * dt)); cam.yawT = cam.yaw + angDiff(cam.yaw, cam.yawT);
    cam.pitch = damp(cam.pitch, cam.pitchT, 6, dt); cam.dist = damp(cam.dist, cam.distT, 6, dt);
    lookT.set(pos.x, 1.2, pos.z);
    look.x = damp(look.x, lookT.x, cam.k * 1.4, dt); look.y = lookT.y; look.z = damp(look.z, lookT.z, cam.k * 1.4, dt);
    const p = THREE.MathUtils.degToRad(cam.pitch);
    camPos.set(look.x + Math.sin(cam.yaw) * Math.cos(p) * cam.dist, look.y + Math.sin(p) * cam.dist, look.z + Math.cos(cam.yaw) * Math.cos(p) * cam.dist);
    camera.position.copy(camPos); camera.lookAt(look);
  }
  // start looking north from behind the spawn point
  cam.yaw = cam.yawT = 0; look.set(pos.x, 1.2, pos.z);
  update(0, 0);
  return api;
}
