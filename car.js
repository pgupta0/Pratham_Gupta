/* Shared 3D pieces for the home page and the Products page:
   an original open-wheel race car (built from simple shapes, no real team livery)
   and the garage it lives in. Every part of the car is its own group with an
   "explode" offset, so the car can come apart into an exploded view. */
import * as THREE from 'three';
import { RoundedBoxGeometry } from 'three/addons/geometries/RoundedBoxGeometry.js';

const canvasTex = (w, h, draw, srgb = true) => {
  const c = document.createElement('canvas'); c.width = w; c.height = h;
  draw(c.getContext('2d'), w, h);
  const t = new THREE.CanvasTexture(c); if (srgb) t.colorSpace = THREE.SRGBColorSpace;
  t.anisotropy = 4; return t;
};

// 2x2 twill weave, tiled small, so dark parts read as carbon fibre
function carbonTex() {
  const t = canvasTex(64, 64, (g) => {
    for (let y = 0; y < 8; y++) for (let x = 0; x < 8; x++) {
      const on = ((x + y) >> 1) % 2 === 0;
      const grd = g.createLinearGradient(x * 8, y * 8, x * 8 + 8, y * 8 + 8);
      grd.addColorStop(0, on ? '#26262b' : '#121215'); grd.addColorStop(1, on ? '#141417' : '#1d1d21');
      g.fillStyle = grd; g.fillRect(x * 8, y * 8, 8, 8);
    }
  });
  t.wrapS = t.wrapT = THREE.RepeatWrapping; t.repeat.set(6, 6); return t;
}

function numberTex(text, fill, stroke) {
  return canvasTex(256, 160, (g, w, h) => {
    g.font = '800 132px Arial Black, Helvetica, Arial, sans-serif'; g.textAlign = 'center'; g.textBaseline = 'middle';
    g.lineWidth = 10; g.strokeStyle = stroke; g.strokeText(text, w / 2, h / 2 + 6);
    g.fillStyle = fill; g.fillText(text, w / 2, h / 2 + 6);
  });
}

export function buildF1Car({ livery = '#FF5A1F', accent = '#2EF2C3', number = '27' } = {}) {
  const root = new THREE.Group();            // nose points along +z
  const parts = {};
  const carbonMap = carbonTex();
  const MAT = {
    paint: () => new THREE.MeshPhysicalMaterial({ color: livery, metalness: .35, roughness: .3, clearcoat: 1, clearcoatRoughness: .05 }),
    carbon: () => new THREE.MeshPhysicalMaterial({ color: '#ffffff', map: carbonMap, metalness: .4, roughness: .38, clearcoat: .9, clearcoatRoughness: .1 }),
    matte: () => new THREE.MeshStandardMaterial({ color: '#0a0a0c', roughness: .85 }),
    titan: () => new THREE.MeshStandardMaterial({ color: '#2b2d31', metalness: .9, roughness: .3 }),
    rubber: () => new THREE.MeshStandardMaterial({ color: '#0b0b0c', roughness: .92 }),
    rim: () => new THREE.MeshStandardMaterial({ color: '#1c1d21', metalness: 1, roughness: .25 }),
  };
  // each part gets its own materials, so one part can glow without the others
  const part = (name, explode, spin = [0, 0, 0]) => {
    const g = new THREE.Group(); g.name = name; root.add(g);
    const mats = {}; const m = k => (mats[k] ||= MAT[k]());
    parts[name] = { g, explode: new THREE.Vector3(...explode), spin: new THREE.Vector3(...spin), mats, m, base: new THREE.Vector3() };
    return parts[name];
  };
  const add = (p, geo, matKey, [x, y, z] = [0, 0, 0], rot) => {
    const mesh = new THREE.Mesh(geo, typeof matKey === 'string' ? p.m(matKey) : matKey);
    mesh.position.set(x, y, z); if (rot) mesh.rotation.set(...rot); p.g.add(mesh); return mesh;
  };
  const box = (w, h, d) => new THREE.BoxGeometry(w, h, d);
  const rbox = (w, h, d, r) => new RoundedBoxGeometry(w, h, d, 4, r);
  const arm = (p, a, b, r = .014, matKey = 'titan') => {
    const A = new THREE.Vector3(...a), B = new THREE.Vector3(...b), len = A.distanceTo(B);
    const mesh = add(p, new THREE.CylinderGeometry(r, r, len, 6), matKey, A.clone().add(B).multiplyScalar(.5).toArray());
    mesh.quaternion.setFromUnitVectors(new THREE.Vector3(0, 1, 0), B.clone().sub(A).normalize());
  };

  /* chassis: floor, survival cell, cockpit, driver */
  const ch = part('chassis', [0, -.2, 0]);
  add(ch, rbox(1.5, .05, 3.9, .02), 'carbon', [0, .07, -.15]);                 // floor
  add(ch, rbox(1.62, .03, 1.3, .01), 'carbon', [0, .07, -.9]);                  // floor edges by the sidepods
  add(ch, rbox(.66, .46, 2.3, .15), 'carbon', [0, .34, .45]);                   // survival cell
  add(ch, box(.42, .05, .72), 'matte', [0, .58, .22]);                           // cockpit opening
  const helmet = add(ch, new THREE.SphereGeometry(.15, 24, 18), new THREE.MeshPhysicalMaterial({ color: '#f4f4f2', roughness: .25, clearcoat: 1 }), [0, .69, .08]);
  helmet.scale.set(1, .95, 1.1);
  add(ch, box(.26, .06, .05), new THREE.MeshPhysicalMaterial({ color: '#0d1820', metalness: .9, roughness: .1 }), [0, .71, .22]);
  add(ch, box(.3, .03, .2), new THREE.MeshBasicMaterial({ color: accent }), [0, .82, .06]); // helmet stripe
  [-1, 1].forEach(s => { add(ch, box(.13, .06, .04), 'carbon', [s * .48, .66, .78]); arm(ch, [s * .3, .52, .74], [s * .44, .64, .78], .01, 'carbon'); });

  /* nose cone */
  const nose = part('nose', [0, .05, 1.4]);
  const cone = add(nose, new THREE.CylinderGeometry(.075, .27, 1.55, 24), 'carbon', [0, .28, 2.2], [Math.PI / 2 - .06, 0, 0]);
  cone.scale.set(1, 1, .55);
  add(nose, new THREE.SphereGeometry(.078, 16, 12), 'paint', [0, .23, 2.98]).scale.set(1, .6, 1);
  add(nose, box(.18, .02, 1.1), 'paint', [0, .4, 2.0], [-.08, 0, 0]);          // painted stripe on top
  const nt = numberTex(number, '#ffffff', '#111');
  const num = add(nose, new THREE.PlaneGeometry(.26, .16), new THREE.MeshBasicMaterial({ map: nt, transparent: true }), [0, .4, 1.62], [-Math.PI / 2 + .1, 0, 0]);
  num.renderOrder = 2;

  /* front wing */
  const fw = part('frontWing', [0, -.15, 2.8]);
  add(fw, box(2.0, .025, .46), 'carbon', [0, .08, 2.8]);
  add(fw, box(1.78, .02, .2), 'paint', [0, .14, 2.72], [-.32, 0, 0]);
  add(fw, box(1.62, .018, .16), 'carbon', [0, .2, 2.63], [-.6, 0, 0]);
  [-1, 1].forEach(s => { add(fw, box(.025, .26, .58), 'carbon', [s * 1.0, .16, 2.76]); add(fw, box(.035, .2, .12), 'carbon', [s * .12, .17, 2.62]); });

  /* sidepods (with cooling inlets) */
  [['sidepodL', -1], ['sidepodR', 1]].forEach(([n, s]) => {
    const sp = part(n, [s * 1.9, .35, -.1], [0, 0, s * .25]);
    add(sp, rbox(.52, .42, 1.75, .16), 'paint', [s * .57, .33, -.25]);
    add(sp, box(.42, .27, .03), 'matte', [s * .57, .37, .63]);
    add(sp, box(.025, .018, 1.5), new THREE.MeshBasicMaterial({ color: new THREE.Color(accent).multiplyScalar(1.4) }), [s * .83, .5, -.25]);
  });

  /* power unit: engine cover, airbox, fin */
  const pw = part('power', [0, 1.7, -.5], [-.25, 0, 0]);
  {
    const sh = new THREE.Shape([[-.12, .2], [-.12, .62], [-.3, 1.0], [-.62, .99], [-1.2, .72], [-2.1, .5], [-2.25, .32], [-2.25, .2]].map(([u, v]) => new THREE.Vector2(u, v)));
    const g = new THREE.ExtrudeGeometry(sh, { depth: .5, bevelEnabled: true, bevelThickness: .05, bevelSize: .045, bevelSegments: 4, curveSegments: 6 });
    g.translate(0, 0, -.25); g.rotateY(-Math.PI / 2);
    add(pw, g, 'paint');
    add(pw, new THREE.CircleGeometry(.1, 24), 'matte', [0, .86, -.28]).scale.set(1.1, .85, 1);
    add(pw, box(.012, .33, 1.25), 'carbon', [0, .9, -1.35]);
    [-1, 1].forEach(s => add(pw, new THREE.PlaneGeometry(.42, .26), new THREE.MeshBasicMaterial({ map: nt, transparent: true }), [s * .305, .56, -1.05], [0, s * Math.PI / 2, 0]));
  }

  /* halo */
  const ha = part('halo', [0, 1.3, .5], [.3, 0, 0]);
  {
    const path = new THREE.CatmullRomCurve3([[-.3, .6, -.18], [-.33, .84, .02], [-.15, .9, .27], [0, .9, .32], [.15, .9, .27], [.33, .84, .02], [.3, .6, -.18]].map(p => new THREE.Vector3(...p)));
    add(ha, new THREE.TubeGeometry(path, 40, .032, 10, false), 'titan');
    add(ha, new THREE.TubeGeometry(new THREE.CatmullRomCurve3([new THREE.Vector3(0, .9, .32), new THREE.Vector3(0, .8, .48), new THREE.Vector3(0, .6, .58)]), 12, .026, 8, false), 'titan');
  }

  /* rear wing + diffuser + rain light */
  const rw = part('rearWing', [0, 1.5, -2.2], [.3, 0, 0]);
  add(rw, box(1.12, .03, .34), 'carbon', [0, .95, -2.62], [.12, 0, 0]);
  add(rw, box(1.12, .025, .22), 'paint', [0, 1.06, -2.5], [.55, 0, 0]);
  [-1, 1].forEach(s => add(rw, box(.025, .56, .62), 'carbon', [s * .57, .84, -2.56]));
  add(rw, box(.05, .52, .06), 'carbon', [0, .68, -2.48]);
  add(rw, box(.9, .02, .14), 'carbon', [0, .38, -2.6]);
  add(rw, box(1.2, .13, .32), 'carbon', [0, .13, -2.44]);
  const rain = add(rw, box(.16, .05, .03), new THREE.MeshBasicMaterial({ color: new THREE.Color('#ff1a12').multiplyScalar(3) }), [0, .36, -2.71]);

  /* suspension */
  const sf = part('suspF', [0, .2, 1.1]), sr = part('suspR', [0, .2, -1.2]);
  [-1, 1].forEach(s => {
    [[.5, 2.02], [.5, 1.55]].forEach(([y, z]) => arm(sf, [s * .3, y, z], [s * .72, .44, 1.78]));
    [[.2, 2.02], [.2, 1.55]].forEach(([y, z]) => arm(sf, [s * .3, y, z], [s * .72, .24, 1.78]));
    arm(sf, [s * .3, .45, 1.95], [s * .72, .3, 1.7], .02, 'carbon');
    [[.45, -1.38], [.45, -1.86]].forEach(([y, z]) => arm(sr, [s * .3, y, z], [s * .66, .46, -1.62]));
    [[.18, -1.38], [.18, -1.86]].forEach(([y, z]) => arm(sr, [s * .3, y, z], [s * .66, .24, -1.62]));
  });

  /* wheels: slicks with a coloured sidewall stripe */
  const wheels = [];
  [['wheelFL', -1, .86, .33, .32, 1.78], ['wheelFR', 1, .86, .33, .32, 1.78], ['wheelRL', -1, .84, .35, .42, -1.62], ['wheelRR', 1, .84, .35, .42, -1.62]].forEach(([n, s, x, r, w, z]) => {
    const p = part(n, [s * 2.7, .25, z > 0 ? .6 : -.6], [0, s * .6, 0]);
    p.g.position.set(s * x, r, z); p.base.copy(p.g.position);
    const spinG = new THREE.Group(); p.g.add(spinG);
    const tyre = new THREE.Mesh(new THREE.CylinderGeometry(r, r, w, 48), p.m('rubber')); tyre.rotation.z = Math.PI / 2;
    const rimM = new THREE.Mesh(new THREE.CylinderGeometry(r * .63, r * .63, w + .012, 32), p.m('rim')); rimM.rotation.z = Math.PI / 2;
    const stripeMat = new THREE.MeshBasicMaterial({ color: '#e8202a' });
    [-1, 1].forEach(o => { const st = new THREE.Mesh(new THREE.TorusGeometry(r * .82, .011, 6, 64), stripeMat); st.rotation.y = Math.PI / 2; st.position.x = o * (w / 2 + .002); spinG.add(st); });
    const cap = new THREE.Mesh(new THREE.CylinderGeometry(.06, .06, w + .03, 16), p.m('paint')); cap.rotation.z = Math.PI / 2;
    // rim spokes so the wheel visibly turns
    for (let k = 0; k < 5; k++) { const sp = new THREE.Mesh(box(w + .016, .03, r * 1.15), p.m('titan')); sp.rotation.x = k * Math.PI / 5; spinG.add(sp); }
    spinG.add(tyre, rimM, cap);
    wheels.push(spinG);
  });

  Object.values(parts).forEach(p => { if (!p.base.lengthSq()) p.base.copy(p.g.position); p.phase = Math.random() * Math.PI * 2; });

  // ex = 0 assembled, 1 fully exploded; focus = name of a part pulled further out
  function explode(ex, time = 0, focus = null) {
    Object.entries(parts).forEach(([n, p]) => {
      const f = ex * (focus && (n === focus || (Array.isArray(focus) && focus.includes(n))) ? 1.55 : 1);
      p.g.position.copy(p.base).addScaledVector(p.explode, f);
      p.g.position.y += Math.sin(time * .9 + p.phase) * .06 * ex;
      p.g.rotation.set(p.spin.x * f, p.spin.y * f, p.spin.z * f);
    });
  }
  function highlight(names, color) {
    const set = new Set([].concat(names || []));
    Object.entries(parts).forEach(([n, p]) => Object.values(p.mats).forEach(m => {
      if (!m.emissive) return;
      m.emissive.set(set.has(n) ? color : '#000000'); m.emissiveIntensity = set.has(n) ? .85 : 0;
    }));
  }
  return { car: root, parts, wheels, rain, explode, highlight };
}

/* The garage: epoxy floor with a painted pit box, tool wall, light strips,
   tyre stacks, a tool cart and telemetry screens. Origin = where the car sits. */
export function buildGarage({ accent = '#FF5A1F' } = {}) {
  const g = new THREE.Group();
  const floorTex = canvasTex(1024, 1024, (c, w, h) => {
    c.fillStyle = '#121012'; c.fillRect(0, 0, w, h);
    for (let i = 0; i < 9000; i++) { c.fillStyle = `rgba(255,255,255,${Math.random() * .025})`; c.fillRect(Math.random() * w, Math.random() * h, 2, 2); }
    c.strokeStyle = 'rgba(255,255,255,.05)'; c.lineWidth = 2;
    for (let i = 0; i <= 16; i++) { c.beginPath(); c.moveTo(i * 64, 0); c.lineTo(i * 64, h); c.stroke(); c.beginPath(); c.moveTo(0, i * 64); c.lineTo(w, i * 64); c.stroke(); }
    // pit box (floor is 32 x 32 units -> 32 px per unit)
    c.strokeStyle = '#b8901f'; c.lineWidth = 6; c.strokeRect(512 - 72, 512 - 128, 144, 256);
    c.setLineDash([22, 16]); c.strokeStyle = 'rgba(255,255,255,.55)'; c.lineWidth = 4; c.strokeRect(512 - 104, 512 - 168, 208, 336); c.setLineDash([]);
    c.save(); c.translate(512, 512 + 220); c.fillStyle = 'rgba(184,144,31,.4)'; c.font = '800 54px Arial Black, Arial'; c.textAlign = 'center'; c.fillText('PIT 27', 0, 0); c.restore();
  });
  const floor = new THREE.Mesh(new THREE.PlaneGeometry(32, 32), new THREE.MeshStandardMaterial({ map: floorTex, roughness: .22, metalness: .25 }));
  floor.rotation.x = -Math.PI / 2; g.add(floor);

  const wallTex = canvasTex(2048, 512, (c, w, h) => {
    c.fillStyle = '#151316'; c.fillRect(0, 0, w, h);
    c.strokeStyle = 'rgba(255,255,255,.05)'; c.lineWidth = 3;
    for (let x = 0; x < w; x += 128) { c.beginPath(); c.moveTo(x, 0); c.lineTo(x, h); c.stroke(); }
    // pegboard with tool outlines
    const bx = 700, by = 90, bw = 650, bh = 250;
    c.fillStyle = '#1c1a1e'; c.fillRect(bx, by, bw, bh);
    c.fillStyle = 'rgba(255,255,255,.08)'; for (let y = by + 12; y < by + bh; y += 22) for (let x = bx + 12; x < bx + bw; x += 22) c.fillRect(x, y, 3, 3);
    c.strokeStyle = 'rgba(255,255,255,.28)'; c.lineWidth = 4;
    for (let k = 0; k < 9; k++) { const x = bx + 40 + k * 66; c.strokeRect(x, by + 40, 18, 120 + (k % 3) * 20); c.beginPath(); c.arc(x + 9, by + 40, 18, 0, Math.PI * 2); c.stroke(); }
    c.fillStyle = accent; c.fillRect(0, 380, w, 10);
    c.fillStyle = 'rgba(255,255,255,.1)'; c.font = '800 120px Arial Black, Arial'; c.fillText('GARAGE 27', 80, 300);
  });
  const wall = new THREE.Mesh(new THREE.PlaneGeometry(32, 8), new THREE.MeshStandardMaterial({ map: wallTex, roughness: .8 }));
  wall.position.set(0, 4, -9); g.add(wall);
  [-1, 1].forEach(s => { const sw = new THREE.Mesh(new THREE.PlaneGeometry(22, 8), new THREE.MeshStandardMaterial({ color: '#111013', roughness: .9 })); sw.position.set(s * 13, 4, 2); sw.rotation.y = -s * Math.PI / 2; g.add(sw); });
  const ceil = new THREE.Mesh(new THREE.PlaneGeometry(32, 22), new THREE.MeshStandardMaterial({ color: '#0b0a0c', roughness: 1 }));
  ceil.position.set(0, 7.6, 2); ceil.rotation.x = Math.PI / 2; g.add(ceil);
  const stripMat = new THREE.MeshBasicMaterial({ color: new THREE.Color('#fff4e6').multiplyScalar(2.2) });
  for (let k = 0; k < 6; k++) { const s = new THREE.Mesh(new THREE.BoxGeometry(14, .05, .16), stripMat); s.position.set(0, 7.5, -7 + k * 2.4); g.add(s); }
  [-3.5, 3.5].forEach(x => { const sp = new THREE.SpotLight('#fff1dc', 70, 22, .75, .7, 1.6); sp.position.set(x, 7.2, 2); sp.target.position.set(0, 0, 0); g.add(sp, sp.target); });
  const fill = new THREE.PointLight('#ffb070', 30, 18, 2); fill.position.set(-6, 3, -5); g.add(fill);

  // tyre stacks
  const rub = new THREE.MeshStandardMaterial({ color: '#0d0d0e', roughness: .9 });
  [['#e8202a', -9.5, -6.5], ['#f2c230', -8.3, -7.6], ['#f4f4f2', 9.6, -6]].forEach(([col, x, z]) => {
    for (let k = 0; k < 4; k++) {
      const t = new THREE.Mesh(new THREE.CylinderGeometry(.36, .36, .34, 32), rub); t.position.set(x, .17 + k * .35, z); g.add(t);
      const st = new THREE.Mesh(new THREE.TorusGeometry(.3, .012, 6, 48), new THREE.MeshBasicMaterial({ color: col })); st.rotation.x = Math.PI / 2; st.position.set(x, .35 + k * .35, z); g.add(st);
    }
  });
  // tool cart
  const cart = new THREE.Group();
  const cm = new THREE.MeshPhysicalMaterial({ color: accent, metalness: .5, roughness: .35, clearcoat: .6 });
  const cb = new THREE.Mesh(new THREE.BoxGeometry(1.5, .95, .65), cm); cb.position.y = .6; cart.add(cb);
  for (let k = 0; k < 4; k++) { const d = new THREE.Mesh(new THREE.BoxGeometry(1.42, .015, .02), new THREE.MeshStandardMaterial({ color: '#111' })); d.position.set(0, .3 + k * .22, .33); cart.add(d); }
  cart.position.set(8.4, 0, -7.9); g.add(cart);
  // workbench
  const bench = new THREE.Mesh(new THREE.BoxGeometry(6, .08, 1), new THREE.MeshStandardMaterial({ color: '#2a2622', roughness: .7 })); bench.position.set(-1, 1, -8.4); g.add(bench);
  // telemetry screens
  const scr = canvasTex(512, 288, (c, w, h) => {
    c.fillStyle = '#05080a'; c.fillRect(0, 0, w, h);
    c.strokeStyle = 'rgba(46,242,195,.15)'; for (let y = 0; y < h; y += 24) { c.beginPath(); c.moveTo(0, y); c.lineTo(w, y); c.stroke(); }
    [['#2EF2C3', 40], ['#FF5A1F', 120], ['#FFC23D', 200]].forEach(([col, base]) => {
      c.strokeStyle = col; c.lineWidth = 3; c.beginPath();
      for (let x = 0; x <= w; x += 8) { const y = base + Math.sin(x / 30 + base) * 18 + Math.sin(x / 9) * 6; x ? c.lineTo(x, y) : c.moveTo(x, y); }
      c.stroke();
    });
    c.fillStyle = '#2EF2C3'; c.font = '600 22px monospace'; c.fillText('LAP 27  S1 28.4  S2 31.1', 16, 270);
  });
  const scrMat = new THREE.MeshBasicMaterial({ map: scr, color: new THREE.Color(1.4, 1.4, 1.4) });
  [-4.2, 4.2].forEach(x => { const s = new THREE.Mesh(new THREE.PlaneGeometry(2.6, 1.46), scrMat); s.position.set(x, 4.3, -8.95); g.add(s); });
  return g;
}
