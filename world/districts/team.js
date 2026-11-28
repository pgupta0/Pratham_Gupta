/* team.js: "Your Team" tower, the contact point and the town's landmark.
   Plot (24, -22), 14 x 14, inside the ring road; the entrance faces the plaza (south-west).
   A slim chamfered glass tower (~46 m + mast) with a baked facade texture, an orange accent fin,
   an illuminated, empty top floor (one desk, one chair, a small "Your team?" sign),
   an entrance canopy on the south-west face and a forecourt with planters.
   Local helpers (not in kit): oct(), facadeTex. */

import { mergeGeometries } from 'three/addons/utils/BufferGeometryUtils.js';

export async function build(ctx) {
  const { THREE, kit, M, quality } = ctx;
  const low = quality === 'low';
  const ACC = '#FF5A1F';
  const g = new THREE.Group();
  const dyn = new THREE.Group(); dyn.userData.dynamic = true; g.add(dyn);
  const colliders = [], spots = [];

  const TX = 25, TZ = -23, H = 4.25, C = 2.2;           // tower centre, half size, chamfer
  const oct = (h, c) => [[h - c, -h], [h, -h + c], [h, h - c], [h - c, h], [-h + c, h], [-h, h - c], [-h, -h + c], [-h + c, -h]];
  const white = M.std('#F7F7F4', { rough: .5 });
  const accent = M.std(ACC, { rough: .45, map: null });
  const glowAcc = M.emit(ACC, 1.3);
  const warm = M.emit('#FFE9C2', 1.25);
  const glassT = new THREE.MeshPhysicalMaterial({ color: '#E3F1FA', roughness: .04, metalness: .1, transparent: true, opacity: .22, clearcoat: 1, envMapIntensity: 1.5, depthWrite: false });

  // facade texture: 8 m x 8 m tile = 4 panels x 2 floors (glass + spandrel), slight per-panel variation
  const facadeTex = kit.canvasTex(256, 256, (c, w, h) => {
    const R = kit.rng(31), fh = h / 2, pw = w / 4;
    for (let f = 0; f < 2; f++) for (let p = 0; p < 4; p++) {
      const x = p * pw, y = f * fh, k = R.range(-10, 10);
      const gr = c.createLinearGradient(0, y, 0, y + fh * .8);
      gr.addColorStop(0, `rgb(${120 + k},${178 + k},${222 + k / 2})`); gr.addColorStop(1, `rgb(${70 + k},${128 + k},${185 + k})`);
      c.fillStyle = gr; c.fillRect(x, y, pw, fh * .8);
      c.fillStyle = 'rgba(255,255,255,.18)'; c.beginPath(); c.moveTo(x + pw * .15, y); c.lineTo(x + pw * .45, y); c.lineTo(x + pw * .1, y + fh * .8); c.lineTo(x, y + fh * .8); c.lineTo(x, y + fh * .4); c.fill();
      c.fillStyle = '#E9EDF0'; c.fillRect(x, y + fh * .8, pw, fh * .2);
      c.fillStyle = '#F8F9FA'; c.fillRect(x, y, 3, fh); c.fillRect(x, y + fh * .8, pw, 2);
    }
  });
  const facadeM = new THREE.MeshStandardMaterial({ map: facadeTex, roughness: .14, metalness: .35, envMapIntensity: 1.3 });
  facadeM.userData.metres = 8;

  /* ---------------- forecourt */
  kit.plane(13.6, 13.6, M.grass, { parent: g, x: 24, z: -22, y: .025 });
  kit.box(13, .12, 13, M.paving, { parent: g, x: 24, z: -22 });
  kit.box(13.1, .16, .2, M.std('#C9C4BB', { rough: .9 }), { parent: g, x: 24, z: -15.5 });
  kit.box(.2, .16, 13.1, M.std('#C9C4BB', { rough: .9 }), { parent: g, x: 17.5, z: -22 });
  // an orange-inlaid welcome path on the diagonal toward the plaza
  {
    const ry = -Math.PI / 4;
    kit.box(3.4, .02, 4.6, M.tiles, { parent: g, x: 20.4, z: -18.2, y: .12, ry });
    [-1.8, 1.8].forEach(o => kit.box(.12, .025, 4.6, accent, { parent: g, x: 20.4 + o * Math.SQRT1_2, z: -18.2 + o * Math.SQRT1_2, y: .12, ry }));
  }

  /* ---------------- tower */
  const T = new THREE.Group(); kit.place(T, { parent: g, x: TX, z: TZ, y: .12 });
  const LOB = 6, TOP = 40, TOPH = 5;
  kit.extrude(oct(H + .5, C + .2), .3, M.concrete, { parent: T });                    // plinth
  // lobby: transparent glass, white columns, reception
  kit.extrude(oct(H - .3, C - .12), LOB - .2, glassT, { parent: T, y: .3, cast: false });
  oct(H, C).forEach(([x, z]) => kit.box(.35, LOB - .2, .35, white, { parent: T, x: x * .97, z: z * .97, y: .3 }));
  kit.extrude(oct(H - .4, C - .15), .04, M.std('#EFEAE2', { map: 'tiles', rough: .5 }), { parent: T, y: .3 });
  kit.rbox(3, 1.1, .8, .1, accent, { parent: T, x: .6, z: -.6, y: .3, ry: -Math.PI / 4 });
  kit.box(1.4, 3.2, .3, white, { parent: T, x: 1.6, z: -1.6, y: .3, ry: -Math.PI / 4 });   // lift core face
  kit.label([{ text: 'Your team.', size: .32, weight: 800, color: ACC }], { parent: T, w: 1.6, h: .6, x: 1.45, z: -1.45, y: 2.1, ry: -Math.PI / 4 });
  // shaft with facade texture
  kit.extrude(oct(H, C), TOP - LOB, facadeM, { parent: T, y: LOB });
  // floor bands every 8 m (white, chunky)
  for (let y = LOB; y <= TOP; y += 8.5) kit.extrude(oct(H + .12, C + .05), .3, white, { parent: T, y: y - .15 });
  // corner fins
  oct(H, C).forEach(([x, z]) => kit.box(.22, TOP - LOB + 1, .22, white, { parent: T, x: x * 1.02, z: z * 1.02, y: LOB }));
  // orange accent fin up the south-west face (faces the plaza)
  {
    const fx = -(H - C / 2) - .08, fz = H - C / 2 + .08;
    kit.box(.5, TOP - LOB + 6, .25, accent, { parent: T, x: fx, z: fz, y: LOB - 1, ry: -Math.PI / 4 });
    kit.box(.2, TOP - LOB + 6, .27, glowAcc, { parent: T, x: fx - .03, z: fz + .03, y: LOB - 1, ry: -Math.PI / 4 });
  }
  // top floor: lit, glass all round, one desk, one chair and a small sign
  kit.extrude(oct(H + .15, C + .05), .4, white, { parent: T, y: TOP - .2 });
  kit.extrude(oct(H - .25, C - .1), .05, M.std('#F2EDE6', { rough: .6, map: null }), { parent: T, y: TOP + .2 });
  kit.extrude(oct(H - .2, C - .1), TOPH - .4, glassT, { parent: T, y: TOP + .2, cast: false });
  oct(H, C).forEach(([x, z]) => kit.box(.18, TOPH, .18, white, { parent: T, x: x * .98, z: z * .98, y: TOP }));
  kit.extrude(oct(H - .4, C - .2), .06, warm, { parent: T, y: TOP + TOPH - .3 });      // glowing ceiling
  kit.extrude(oct(H - 3.0, 1), .05, glowAcc, { parent: T, y: TOP + TOPH - .36 });      // orange halo light
  {
    const d = new THREE.Group(); kit.place(d, { parent: T, x: -.6, z: .6, y: TOP + .25, ry: -Math.PI / 4 });
    kit.box(1.8, .08, .8, M.std('#F7F7F4', { rough: .4, map: null }), { parent: d, y: .72 });
    [-.8, .8].forEach(x => kit.box(.08, .72, .7, M.std('#3E434A', { map: null, rough: .5 }), { parent: d, x }));
    // chair, behind the desk (empty)
    const ch = new THREE.Group(); kit.place(ch, { parent: d, z: -.9 });
    kit.box(.55, .08, .55, accent, { parent: ch, y: .45 }); kit.box(.55, .6, .08, accent, { parent: ch, y: .5, z: -.26 });
    kit.cyl(.04, .04, .45, M.metal, { parent: ch, seg: 6 }); kit.cyl(.3, .3, .04, M.std('#3E434A', { map: null }), { parent: ch, seg: 10 });
    kit.sign([{ text: 'Your team?', size: .13, weight: 800, color: ACC }], { parent: d, w: .9, h: .3, depth: .05, y: .8, z: .25 });
    kit.box(.5, .02, .35, M.std('#2B2F35', { map: null }), { parent: d, x: .55, y: .8, z: -.05 });   // closed laptop
  }
  // crown: roof slab, parapet band with lettering, mast with a beacon
  const RY = TOP + TOPH;
  kit.extrude(oct(H + .2, C + .08), .5, white, { parent: T, y: RY });
  kit.extrude(oct(H + .22, C + .09), .25, accent, { parent: T, y: RY + .5 });
  kit.extrude(oct(H - .6, C - .3), 1.6, white, { parent: T, y: RY + .75 });
  [['YOUR TEAM.', 0], ['YOUR TEAM.', -Math.PI / 2]].forEach(([t, ry]) => {
    // south and west faces
    const L = kit.label([{ text: t, size: .62, weight: 800, color: ACC }], { w: 4.6, h: 1.1, y: RY + .82, ry });
    if (ry) L.position.set(-(H - .6) - .02, RY + .82, 0); else L.position.set(0, RY + .82, (H - .6) + .02);
    T.add(L);
  });
  kit.cyl(.22, .35, 2, white, { parent: T, y: RY + 2.35, seg: 12 });
  kit.cyl(.07, .1, 5, M.metal, { parent: T, y: RY + 4.3, seg: 8 });
  const beacon = new THREE.Mesh(new THREE.SphereGeometry(.28, 12, 8), M.emit(ACC, 2)); beacon.position.set(TX, .12 + RY + 9.45, TZ); dyn.add(beacon);
  // entrance canopy + doors on the south-west chamfer face
  {
    const e = new THREE.Group(); kit.place(e, { parent: T, x: -(H - C / 2), z: H - C / 2, ry: -Math.PI / 4 });
    kit.box(4.2, .3, 2.8, white, { parent: e, y: 3.4, z: 1.3 });
    kit.box(4.24, .12, 2.84, accent, { parent: e, y: 3.7, z: 1.3 });
    [-1.9, 1.9].forEach(x => kit.cyl(.09, .09, 3.4, M.metal, { parent: e, x, z: 2.55, seg: 10 }));
    kit.box(3.6, .06, .2, glowAcc, { parent: e, y: 3.36, z: 2.65 });
    kit.box(2.4, 2.5, .2, M.std('#2B2F35', { map: null, rough: .4 }), { parent: e, y: .3, z: .05 });
    kit.box(1.05, 2.3, .06, glassT, { parent: e, x: -.6, y: .35, z: .18, cast: false }); kit.box(1.05, 2.3, .06, glassT, { parent: e, x: .6, y: .35, z: .18, cast: false });
    kit.box(3.2, .03, 1.8, M.std('#8A929C', { map: null, rough: 1 }), { parent: e, y: 0, z: 1.2 });
    kit.label([{ text: 'Your team.', size: .34, weight: 800, color: '#FFFFFF' }], { parent: e, w: 3.6, h: .5, y: 3.45, z: 2.74 });
  }
  colliders.push({ type: 'circle', x: TX, z: TZ, r: 4.9 });

  /* ---------------- forecourt furniture */
  // big sign monolith on the west side, angled toward the plaza
  {
    const s = new THREE.Group(); kit.place(s, { parent: g, x: 19.2, z: -24.5, y: .12, ry: -Math.PI / 3 });
    kit.rbox(4.4, 2.2, .6, .12, white, { parent: s });
    kit.box(4.42, .2, .62, accent, { parent: s, y: 2.0 });
    kit.label([{ text: 'Your team.', size: .78, weight: 800, color: '#1F2328' }, { text: 'Strategy · Marketing · Operations', size: .19, weight: 600, color: ACC }], { parent: s, w: 4.2, h: 1.7, y: .2, z: .31 });
    colliders.push({ type: 'box', x: 19.2, z: -24.5, w: 4.6, d: 1, rot: -Math.PI / 3 });
  }
  // planters with bushes and a small tree, a bench and bollards
  const planter = (x, z, w, d) => {
    kit.rbox(w, .6, d, .1, M.std('#E9E3D8', { rough: .8 }), { parent: g, x, z, y: .12 });
    kit.box(w - .3, .04, d - .3, M.std('#6B4A33', { map: null, rough: 1 }), { parent: g, x, z, y: .7 });
    colliders.push({ type: 'box', x, z, w, d });
  };
  planter(26.5, -16.8, 5, 1.4); [24.8, 26.5, 28.2].forEach(x => kit.bush(x, -16.8, { s: .6 }));
  planter(29.3, -20.5, 1.4, 4); [-21.8, -19.2].forEach(z => kit.bush(29.3, z, { s: .6 }));
  planter(19, -28, 2.2, 2.2); kit.tree(19, -28, { s: .8 });
  planter(29, -28, 2.2, 2.2); kit.tree(29, -28, { s: .85 });
  kit.bench(24.2, -18.2, { ry: Math.PI }); colliders.push({ type: 'box', x: 24.2, z: -18.1, w: 1.9, d: .6 });
  if (!low) {
    const bm = M.std('#3E434A', { map: null, rough: .5, metal: .4 });
    [[18.2, -19.5], [18.5, -21], [21.5, -16.2], [23, -16.1]].forEach(([x, z]) => { kit.cyl(.1, .12, .85, bm, { parent: g, x, z, y: .12, seg: 10 }); kit.cyl(.105, .105, .08, accent, { parent: g, x, z, y: .85, seg: 10 }); });
    // flower pots on the planters
    const fl = ['#F25C78', '#FFC23D', '#FFFFFF'];
    for (let i = 0; i < 9; i++) kit.sphere(.14, M.std(fl[i % 3], { map: null, rough: .8 }), { parent: g, x: 24.4 + i * .5, z: -16.4 - (i % 2) * .6, y: .7, seg: 6, seg2: 4 });
    kit.person({ parent: g, x: 25.6, z: -19.3, ry: -Math.PI * .75 + Math.PI, seed: 51 });
    kit.person({ parent: g, x: 24.0, z: -18.45, pose: 'sit', ry: Math.PI, seed: 52 });
  }
  kit.person({ parent: g, x: 22.4, z: -19.6, ry: -Math.PI / 4 + Math.PI, seed: 53, shirt: ACC });
  kit.lamp(29.6, -16.4, { ry: Math.PI }); kit.lamp(30, -24.5, { ry: -Math.PI / 2 });

  spots.push({ id: 'main', x: 19.1, z: -17.1, y: 4.8 });

  colorBake(THREE, kit, g);
  kit.bake(g);
  return {
    group: g, colliders, spots,
    update(dt, t) { const k = .75 + .25 * Math.sin(t * 2.4); beacon.scale.setScalar(k); },
  };
}

/* local helper: merge all plain (untextured, opaque, non-emissive) toy-plastic meshes into a few
   vertex-coloured meshes, grouped by brick flags / gloss / metal, so a colourful scene costs few draw calls. */
function colorBake(THREE, kit, root) {
  root.updateMatrixWorld(true);
  const inv = new THREE.Matrix4().copy(root.matrixWorld).invert(), groups = new Map(), done = [], m4 = new THREE.Matrix4();
  root.traverse(o => {
    if (!o.isMesh || o.isInstancedMesh || o.userData.label || Array.isArray(o.material)) return;
    for (let p = o; p && p !== root; p = p.parent) if (p.userData.dynamic) return;
    const mt = o.material;
    if (!mt.isMeshStandardMaterial || mt.isMeshPhysicalMaterial || mt.map || mt.transparent || !mt.userData.brick) return;
    if (mt.emissive && (mt.emissive.r + mt.emissive.g + mt.emissive.b) > 0) return;
    const b = mt.userData.brick, key = `${b.studs ? 1 : 0}${b.courses ? 1 : 0}|${mt.roughness < .4 ? 'g' : 'm'}|${mt.metalness > .2 ? 1 : 0}|${mt.flatShading ? 1 : 0}|${mt.side}|${o.castShadow ? 1 : 0}`;
    let geo = o.geometry.index ? o.geometry.toNonIndexed() : o.geometry.clone();
    for (const k of Object.keys(geo.attributes)) if (!['position', 'normal'].includes(k)) geo.deleteAttribute(k);
    if (!geo.attributes.normal) geo.computeVertexNormals();
    geo.applyMatrix4(m4.multiplyMatrices(inv, o.matrixWorld));
    const n = geo.attributes.position.count, col = new Float32Array(n * 3);
    for (let i = 0; i < n; i++) { col[i * 3] = mt.color.r; col[i * 3 + 1] = mt.color.g; col[i * 3 + 2] = mt.color.b; }
    geo.setAttribute('color', new THREE.BufferAttribute(col, 3));
    if (!groups.has(key)) groups.set(key, { geos: [], mt, b, cast: o.castShadow });
    groups.get(key).geos.push(geo); done.push(o);
  });
  done.forEach(o => o.parent && o.parent.remove(o));
  const out = new THREE.Group(); out.userData.dynamic = true; root.add(out);   // keep kit.bake from stripping the colour attribute
  for (const { geos, mt, b, cast } of groups.values()) {
    const merged = mergeGeometries(geos, false); geos.forEach(x => x.dispose()); if (!merged) continue;
    merged.computeBoundingSphere();
    const mat = kit.brickify(new THREE.MeshStandardMaterial({ vertexColors: true, roughness: mt.roughness, metalness: mt.metalness, flatShading: mt.flatShading, side: mt.side, envMapIntensity: mt.envMapIntensity }), b);
    const mesh = new THREE.Mesh(merged, mat); mesh.castShadow = cast; mesh.receiveShadow = true; mesh.userData.baked = true; out.add(mesh);
  }
  return root;
}
