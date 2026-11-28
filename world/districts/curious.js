/* curious.js: "Still Curious" park (what Pratham does off the clock).
   Plot (72, 74), 48 x 44; the spoke road arrives at the north-west corner (50, 54).
   Entrance arch, a lake with a jetty and a rowing boat, a bandstand with a mic (music),
   an open pavilion with a pool table (pool), food stalls with umbrellas (food) and
   a signpost + suitcase by the jetty (travel). Accent #14B8A6.
   Local helpers (not in kit): ribbon(), umbrella(), stall(). */

import { mergeGeometries } from 'three/addons/utils/BufferGeometryUtils.js';

export async function build(ctx) {
  const { THREE, kit, M, quality } = ctx;
  const low = quality === 'low';
  const ACC = '#14B8A6', ACC_D = '#0F8F82';
  const g = new THREE.Group();
  const dyn = new THREE.Group(); dyn.userData.dynamic = true; g.add(dyn);
  const colliders = [], spots = [];
  const R = kit.rng(777);
  const accent = M.std(ACC, { rough: .45, map: null }), accentD = M.std(ACC_D, { rough: .5, map: null });
  const white = M.std('#F7F7F4', { rough: .5 });
  const wood = M.wood, dark = M.std('#3E434A', { map: null, rough: .5, metal: .3 });
  const pathM = M.std('#EBDDBF', { map: 'paving', rough: .95 });
  const soil = M.std('#6B4A33', { map: null, rough: 1 });
  const FL = ['#F25C78', '#FFC23D', '#FFFFFF', '#B86BF2', '#FF8A3D'];
  const person = o => (low && o.lowSkip) ? null : kit.person(Object.assign({ parent: g, seed: Math.floor(R() * 1e6) }, o));

  function ribbon(pts, w, y, mat, parent = g) {
    const curve = new THREE.CatmullRomCurve3(pts.map(([x, z]) => new THREE.Vector3(x, 0, z)));
    const n = Math.max(8, Math.round(curve.getLength() / 1.0)), P = curve.getSpacedPoints(n);
    const pos = [], idx = [];
    for (let i = 0; i <= n; i++) {
      const a = P[Math.max(0, i - 1)], b = P[Math.min(n, i + 1)], tx = b.x - a.x, tz = b.z - a.z, L = Math.hypot(tx, tz) || 1;
      const nx = -tz / L * w / 2, nz = tx / L * w / 2;
      pos.push(P[i].x + nx, y, P[i].z + nz, P[i].x - nx, y, P[i].z - nz);
      if (i < n) { const k = i * 2; idx.push(k, k + 1, k + 2, k + 1, k + 3, k + 2); }
    }
    const geo = new THREE.BufferGeometry(); geo.setAttribute('position', new THREE.Float32BufferAttribute(pos, 3)); geo.setIndex(idx); geo.computeVertexNormals();
    if (geo.attributes.normal.getY(0) < 0) { const ix = geo.index.array; for (let i = 0; i < ix.length; i += 3) { const t = ix[i + 1]; ix[i + 1] = ix[i + 2]; ix[i + 2] = t; } geo.computeVertexNormals(); }
    kit.worldUV(geo, (mat.userData && mat.userData.metres) || 2);
    const m = new THREE.Mesh(geo, mat); m.receiveShadow = true; parent.add(m); return m;
  }
  const path = (pts, w = 3) => { ribbon(pts, w + .5, .05, M.std('#D8CBB0', { rough: .95 })); ribbon(pts, w, .08, pathM); };
  const flowerBed = (x, z, r) => {
    kit.cyl(r, r + .1, .35, white, { parent: g, x, z, y: 0, seg: 20 });
    kit.cyl(r - .15, r - .15, .06, soil, { parent: g, x, z, y: .33, seg: 20 });
    if (!low) for (let i = 0; i < Math.round(r * r * 3); i++) { const a = R() * 6.28, rr = R() * (r - .4); kit.sphere(.18 + R() * .08, M.std(FL[i % 5], { map: null, rough: .8 }), { parent: g, x: x + Math.cos(a) * rr, z: z + Math.sin(a) * rr, y: .35, seg: 6, seg2: 4 }); }
    colliders.push({ type: 'circle', x, z, r: r + .1 });
  };

  /* ---------------- ground + paths */
  kit.plane(47, 43, M.grass, { parent: g, x: 72, z: 74, y: .025 });
  // apron joining the spoke road end to the park entrance
  const ux = .679, uz = .734, px = -.734, pz = .679;
  const E = t => [50 + px * t, 54 + pz * t];
  kit.extrude([E(6.1), E(-6.1), [58, 54.3], [50.3, 62]], .1, M.paving, { parent: g });
  path([[52.5, 56.5], [55.5, 59.5], [59, 62.5], [62, 64.5]], 4);
  path([[62, 64.5], [67, 66.5], [74, 66.8], [80, 66.5], [85, 67.5]], 3);           // north: food row and bandstand
  path([[62, 64.5], [61.5, 70], [63.2, 76.5], [63.5, 83], [67, 88], [74, 90], [82, 89.5], [88, 87]], 3);  // west + south shore
  path([[85, 67.5], [89.5, 72], [91.5, 79], [88, 87]], 2.6);                       // east side of the lake

  /* ---------------- entrance arch ("Still curious") */
  {
    const ry = Math.atan2(ux, uz), a = new THREE.Group(); kit.place(a, { parent: g, x: 55.5, z: 59.5, ry });
    const red = M.std('#E8473B', { rough: .45, map: null }), yel = M.std('#FFC23D', { rough: .45, map: null });
    [-3.1, 3.1].forEach((x, i) => {
      kit.box(1.4, .5, 1.4, white, { parent: a, x });
      for (let k = 0; k < 5; k++) kit.cyl(.5, .5, .8, k % 2 ? white : accent, { parent: a, x, y: .5 + k * .8, seg: 16 });
      kit.cyl(.6, .6, .3, i ? yel : red, { parent: a, x, y: 4.5, seg: 16 });
      kit.sphere(.4, i ? red : yel, { parent: a, x, y: 4.8, seg: 12, seg2: 8 });
      colliders.push({ type: 'circle', x: 55.5 + Math.cos(-ry) * x, z: 59.5 + Math.sin(-ry) * x, r: .85 });
    });
    kit.rbox(7.6, 1.2, .7, .1, accent, { parent: a, y: 3.9 });
    kit.box(7.62, .2, .72, white, { parent: a, y: 3.9 });
    [1, -1].forEach(s => kit.label([{ text: 'Still curious', size: .62, weight: 800, color: '#FFFFFF' }], { parent: a, w: 6.4, h: .95, y: 4.08, z: s * .36, ry: s > 0 ? 0 : Math.PI }));
    // little flower boxes at the feet
    [-4.6, 4.6].forEach(x => { kit.box(1.4, .5, 1, white, { parent: a, x }); if (!low) for (let i = 0; i < 4; i++) kit.sphere(.2, M.std(FL[i], { map: null, rough: .8 }), { parent: a, x: x - .45 + i * .3, y: .5, z: (i % 2 - .5) * .4, seg: 6, seg2: 4 }); });
    spots.push({ id: 'main', x: 50 + ux * 3.8, z: 54 + uz * 3.8, y: 5.6 });
  }

  /* ---------------- lake, jetty, boat */
  const LX = 78, LZ = 78, RX = 10, RZ = 7;
  {
    const sh = new THREE.Shape(); sh.absellipse(0, 0, RX, RZ, 0, Math.PI * 2, false);
    const nTex = kit.T.normalWater.clone(); nTex.needsUpdate = true; nTex.wrapS = nTex.wrapT = THREE.RepeatWrapping; nTex.repeat.set(.12, .12);
    const waterM = new THREE.MeshPhysicalMaterial({ color: '#3FB0E6', roughness: .08, metalness: 0, normalMap: nTex, normalScale: new THREE.Vector2(.3, .3), clearcoat: 1, envMapIntensity: 1.3 });
    const wg = new THREE.ShapeGeometry(sh, 48); wg.rotateX(-Math.PI / 2);
    const water = new THREE.Mesh(wg, waterM); water.position.set(LX, .12, LZ); water.receiveShadow = true; g.add(water);
    dyn.userData.nTex = nTex;
    // round-brick rim
    const n = low ? 40 : 56;
    for (let i = 0; i < n; i++) { const a = i / n * Math.PI * 2; kit.cyl(.5, .5, .38, i % 2 ? white : M.std('#B9C2CA', { rough: .7 }), { parent: g, x: LX + Math.cos(a) * (RX + .3), z: LZ + Math.sin(a) * (RZ + .3), seg: 12 }); }
    // lily pads
    if (!low) [[73, 75], [74, 76.3], [84, 80], [83, 74.5]].forEach(([x, z]) => kit.cyl(.45, .45, .03, M.std('#4FA33A', { map: null }), { parent: g, x, z, y: .12, seg: 10 }));
    // lake colliders (chain of circles)
    [[70, 4.2], [74, 6.2], [78, 7], [82, 6.2], [86, 4.2]].forEach(([x, r]) => colliders.push({ type: 'circle', x, z: LZ, r: r + .5 }));
    // jetty from the south shore
    const JX = 81;
    kit.box(2, .14, 7, wood, { parent: g, x: JX, z: 82.6, y: .4 });
    for (let z = 79.6; z <= 85.6; z += 2) [-.9, .9].forEach(dx => kit.cyl(.12, .12, .9, M.std('#8A6440', { map: null }), { parent: g, x: JX + dx, z, seg: 8 }));
    kit.box(2.4, .3, 1.2, wood, { parent: g, x: JX, z: 86.2, y: .1 });
    // rowing boat (bobs)
    const boat = new THREE.Group(); boat.position.set(JX + 2.3, .12, 81); dyn.add(boat);
    {
      const red = M.std('#E8473B', { rough: .45, map: null });
      const hull = kit.rbox(1.3, .55, 3.2, .25, red, { parent: boat, y: -.1 }); hull.scale.set(1, 1, 1);
      kit.box(1.1, .05, 2.9, wood, { parent: boat, y: .3 });
      kit.box(1.32, .08, 3.22, white, { parent: boat, y: .42 });
      [-.5, .6].forEach(z => kit.box(1.2, .06, .3, wood, { parent: boat, y: .42, z }));
      [-1, 1].forEach(s => kit.box(.06, .06, 2.4, wood, { parent: boat, x: s * .9, y: .45, z: .1, ry: s * .25 }));
    }
    dyn.userData.boat = boat;
    // ducks
    if (!low) [[75, 80], [76, 80.8]].forEach(([x, z]) => { kit.sphere(.18, white, { parent: g, x, z, y: .1, seg: 8, seg2: 6 }); kit.sphere(.1, white, { parent: g, x: x + .15, z, y: .3, seg: 8, seg2: 6 }); kit.box(.08, .04, .06, M.std('#FF8A3D', { map: null }), { parent: g, x: x + .27, z, y: .36 }); });
  }

  /* ---------------- travel: signpost + suitcase by the jetty */
  {
    const sx = 76.2, sz = 87.6;
    kit.cyl(.12, .14, 3.8, white, { parent: g, x: sx, z: sz, seg: 10 });
    kit.sphere(.18, accent, { parent: g, x: sx, z: sz, y: 3.75, seg: 10, seg2: 8 });
    const dests = [['Tokyo  6,700 km', '#E8473B', .9], ['Paris  6,600 km', '#3B82F6', -.5], ['Cape Town  8,200 km', '#FFC23D', 2.3], ['Rio  14,000 km', '#22A06B', -2.0]];
    dests.forEach(([t, c, ry], i) => {
      const arm = new THREE.Group(); kit.place(arm, { parent: g, x: sx, z: sz, y: 1.5 + i * .55, ry });
      const board = M.std(c, { rough: .5, map: null });
      kit.box(2.1, .4, .08, board, { parent: arm, x: 1.15 });
      kit.extrude([[0, -.04], [.35, -.04], [.35, .04], [0, .04]], .01, board, { parent: arm, y: 0 });
      kit.cone(.24, .32, board, { parent: arm, x: 2.35, y: .2, rz: -Math.PI / 2, seg: 4 });
      [1, -1].forEach(s => kit.label([{ text: t, size: .2, weight: 800, color: c === '#FFC23D' ? '#1F2328' : '#FFFFFF' }], { parent: arm, w: 2, h: .36, x: 1.15, y: .02, z: s * .045, ry: s > 0 ? 0 : Math.PI }));
    });
    colliders.push({ type: 'circle', x: sx, z: sz, r: .5 });
    // suitcase with stickers, on the jetty foot
    const sc = new THREE.Group(); kit.place(sc, { parent: g, x: 79.4, z: 86.4, y: .1, ry: .4 });
    kit.rbox(.75, .55, .3, .06, M.std('#F2B705', { rough: .45, map: null }), { parent: sc });
    kit.box(.3, .1, .05, dark, { parent: sc, y: .58 });
    [[-.2, .3, '#E8473B'], [.15, .2, '#3B82F6'], [.05, .4, '#FFFFFF']].forEach(([x, y, c]) => kit.box(.14, .1, .02, M.std(c, { map: null }), { parent: sc, x, y, z: .16 }));
    kit.rbox(.45, .3, .25, .05, M.std('#3B82F6', { rough: .45, map: null }), { parent: g, x: 78.8, z: 86.8, y: .1, ry: -.2 });
    colliders.push({ type: 'circle', x: 79.2, z: 86.6, r: .6 });
    spots.push({ id: 'travel', x: 76.8, z: 90.6, y: 4.8 });
    person({ x: 82.2, z: 88.7, ry: Math.PI * .9, lowSkip: true });
  }

  /* ---------------- music: bandstand with mic, speakers and listeners */
  {
    const bx = 88.5, bz = 60.8, b = new THREE.Group(); kit.place(b, { parent: g, x: bx, z: bz, ry: -Math.PI / 4 }); // front (+z) faces south-west
    kit.cyl(4.2, 4.3, .9, white, { parent: b, seg: 8 });
    kit.cyl(4.25, 4.25, .18, accent, { parent: b, y: .72, seg: 8 });
    kit.cyl(4, 4, .05, wood, { parent: b, y: .9, seg: 8 });
    for (let i = 0; i < 3; i++) kit.box(3, .3, .5, white, { parent: b, y: i * .3, z: 4.1 + (2 - i) * .45 });   // steps
    for (let i = 0; i < 8; i++) { const a = (i + .5) / 8 * Math.PI * 2; kit.cyl(.16, .16, 3.4, white, { parent: b, x: Math.sin(a) * 3.75, z: Math.cos(a) * 3.75, y: .9, seg: 10 }); }
    kit.cyl(4.5, 4.5, .35, white, { parent: b, y: 4.3, seg: 8 });
    kit.cone(4.6, 2.3, accent, { parent: b, y: 4.65, seg: 8 });
    kit.sphere(.35, M.std('#E8473B', { map: null, rough: .4 }), { parent: b, y: 6.8, seg: 12, seg2: 8 });
    // mic stand
    kit.cyl(.25, .25, .04, dark, { parent: b, z: 1.8, y: .95, seg: 12 });
    kit.cyl(.025, .025, 1.5, dark, { parent: b, z: 1.8, y: .95, seg: 6 });
    kit.box(.03, .03, .35, dark, { parent: b, z: 1.95, y: 2.4, rx: .4 });
    kit.sphere(.06, M.std('#9BA4AD', { map: null, rough: .3, metal: .6 }), { parent: b, z: 2.1, y: 2.38, seg: 8, seg2: 6 });
    // speakers
    [-2.4, 2.4].forEach(x => { kit.rbox(.8, 1.3, .6, .06, M.std('#2B2F35', { map: null, rough: .6 }), { parent: b, x, z: 1.6, y: .95 }); [.35, .85].forEach(y => kit.cyl(.22, .22, .04, M.std('#555B63', { map: null }), { parent: b, x, z: 1.92, y: .95 + y, rx: Math.PI / 2, seg: 12 })); });
    // keyboard and a stool
    kit.box(1.3, .12, .4, dark, { parent: b, x: -1.2, z: -.6, y: 1.75 }); kit.box(1.24, .03, .2, white, { parent: b, x: -1.2, z: -.53, y: 1.87 });
    [-.6, .6].forEach(dx => kit.box(.06, .85, .06, dark, { parent: b, x: -1.2 + dx, z: -.6, y: .9 }));
    kit.cyl(.22, .22, .7, accent, { parent: b, x: 1.2, z: -.8, y: .9, seg: 10 });
    // bunting between columns
    if (!low) for (let i = 0; i < 8; i++) { const a = (i + 1) / 8 * Math.PI * 2; kit.cone(.18, .3, M.std(FL[i % 5], { map: null }), { parent: b, x: Math.sin(a) * 3.8, z: Math.cos(a) * 3.8, y: 3.75, rx: Math.PI, seg: 3 }); }
    colliders.push({ type: 'circle', x: bx, z: bz, r: 4.4 });
    spots.push({ id: 'music', x: 83.6, z: 65.4, y: 5 });
    person({ x: 82, z: 64.2, ry: -2.3 }); person({ x: 81.6, z: 66.7, ry: -2.5, lowSkip: true });
    person({ x: 85.6, z: 67.9, ry: -2.8 }); person({ x: 84.9, z: 69.2, ry: -2.7, lowSkip: true }); person({ x: 80.4, z: 65.4, ry: -2.2, lowSkip: true });
    kit.bench(80.5, 69.5, { ry: -2.4 });
  }

  /* ---------------- pool: open-sided pavilion with a pool table under pendant lights */
  {
    const px0 = 57, pz0 = 76.5, p = new THREE.Group(); kit.place(p, { parent: g, x: px0, z: pz0 });
    const W = 7, D = 6.4;
    kit.box(W + .6, .3, D + .6, M.std('#E9E3D8', { map: 'tiles', rough: .7 }), { parent: p });
    [[-1, -1], [1, -1], [-1, 1], [1, 1]].forEach(([a, b]) => kit.box(.4, 3.3, .4, white, { parent: p, x: a * W / 2, z: b * D / 2, y: .3 }));
    kit.box(.3, 1.1, D, M.std('#E9E3D8', { rough: .7 }), { parent: p, x: -W / 2, y: .3 });             // low back wall (west)
    [-1, 1].forEach(b => { kit.box(W + .6, .45, .3, accentD, { parent: p, y: 3.6, z: b * D / 2 }); kit.box(.3, .45, D + .6, accentD, { parent: p, y: 3.6, x: b * W / 2 }); });
    // slatted pergola roof so the table stays visible from above
    for (let k = 0; k < 9; k++) kit.box(.3, .25, D + 1.2, k % 2 ? accent : white, { parent: p, x: -W / 2 - .1 + k * (W + .2) / 8, y: 4.05 });
    kit.label([{ text: 'POOL', size: .32, weight: 800, color: '#FFFFFF' }], { parent: p, w: 2.2, h: .42, x: W / 2 + .31, y: 3.62, ry: Math.PI / 2 });
    // the table
    const felt = M.std('#1E8C4E', { rough: .9, map: null }), rail = M.std('#7A4A2A', { rough: .5, map: null });
    kit.box(2.6, .14, 1.4, felt, { parent: p, y: 1.0 });
    kit.box(2.9, .2, .16, rail, { parent: p, y: .98, z: .78 }); kit.box(2.9, .2, .16, rail, { parent: p, y: .98, z: -.78 });
    kit.box(.16, .2, 1.4, rail, { parent: p, y: .98, x: 1.37 }); kit.box(.16, .2, 1.4, rail, { parent: p, y: .98, x: -1.37 });
    kit.box(2.5, .6, 1.2, rail, { parent: p, y: .35 });
    [[-1.3, -.7], [1.3, -.7], [-1.3, .7], [1.3, .7]].forEach(([x, z]) => kit.box(.25, .35, .25, rail, { parent: p, x, z, y: .3 }));
    if (!low) { const bc = ['#FFFFFF', '#E8473B', '#FFC23D', '#3B82F6', '#1F2328', '#FF8A3D', '#7C5CFF']; bc.forEach((c, i) => kit.sphere(.05, M.std(c, { map: null, rough: .3 }), { parent: p, x: i ? .4 + (i % 3) * .11 : -.7, z: i ? ((i % 2) - .5) * .12 + (i > 3 ? .1 : 0) : 0, y: 1.14, seg: 8, seg2: 6 })); }
    // pendant lights
    [-.8, 0, .8].forEach(x => { kit.box(.02, 1.2, .02, dark, { parent: p, x, y: 2.4 }); kit.cone(.28, .25, accent, { parent: p, x, y: 2.2, seg: 12 }); kit.cyl(.16, .16, .03, M.emit('#FFF1C9', 1.4), { parent: p, x, y: 2.19, seg: 10 }); });
    // cue rack on the back wall, two players
    kit.box(.08, .9, 1.2, wood, { parent: p, x: -W / 2 + .2, y: 1.6 });
    for (let i = 0; i < 4; i++) kit.box(.03, 1.3, .03, rail, { parent: p, x: -W / 2 + .26, z: -.45 + i * .3, y: 1.0, rz: .05 });
    const cueM = M.std('#D9B98A', { map: null, rough: .5 });
    person({ x: px0 + 1.9, z: pz0 + .9, ry: -2.2, shirt: ACC });
    kit.box(.04, .04, 1.4, cueM, { parent: g, x: px0 + 1.5, z: pz0 + .5, y: 1.2, ry: -.75, rx: .12 });
    person({ x: px0 - 2.0, z: pz0 - 1.4, ry: .6, lowSkip: true });
    colliders.push({ type: 'box', x: px0, z: pz0, w: 3.2, d: 1.8 }, { type: 'box', x: px0 - W / 2, z: pz0, w: .6, d: D + .4 });
    [[-1, -1], [1, -1], [-1, 1], [1, 1]].forEach(([a, b]) => colliders.push({ type: 'circle', x: px0 + a * W / 2, z: pz0 + b * D / 2, r: .35 }));
    spots.push({ id: 'pool', x: 62.6, z: 76.8, y: 5.4 });
  }

  /* ---------------- food: a row of colourful stalls with umbrellas and tables */
  {
    const stalls = [['Ramen', '#E8473B'], ['Tacos', '#FFC23D'], ['Dim sum', '#3B82F6'], ['Falafel', '#22A06B']];
    stalls.forEach(([name, c], i) => {
      const sx = 65.5 + i * 5, sz = 57.8, s = new THREE.Group(); kit.place(s, { parent: g, x: sx, z: sz });
      const cm = M.std(c, { rough: .45, map: null });
      kit.box(4, 1.1, 1.2, cm, { parent: s, z: .4 });
      kit.box(4.1, .1, 1.35, white, { parent: s, y: 1.1, z: .4 });
      kit.box(4, 2.6, .2, white, { parent: s, z: -1 });                          // back wall
      [-1.9, 1.9].forEach(x => kit.box(.14, 2.7, .14, white, { parent: s, x, z: .9 }));
      // striped awning
      for (let k = 0; k < 8; k++) kit.box(.52, .1, 2.4, k % 2 ? white : cm, { parent: s, x: -1.82 + k * .52, y: 2.85, z: .4, rx: .2 });
      kit.sign([{ text: name, size: .3, weight: 800, color: '#FFFFFF' }], { parent: s, w: 2.4, h: .5, y: 3.15, z: -.85, bg: c, board: c });
      if (!low) { [-1.1, -.3, .5].forEach((x, k) => kit.cyl(.2, .16, .2, M.std(FL[(i + k) % 5], { map: null }), { parent: s, x, y: 1.2, z: .5, seg: 10 })); }
      person({ x: sx + .3, z: sz - .3, ry: 0, shirt: '#FFFFFF', lowSkip: i % 2 === 1 });
      colliders.push({ type: 'box', x: sx, z: sz, w: 4.2, d: 2.6 });
    });
    const umbrella = (x, z, c) => {
      kit.cyl(.5, .5, .06, white, { parent: g, x, z, y: .75, seg: 14 }); kit.cyl(.06, .06, .75, dark, { parent: g, x, z, seg: 6 });
      kit.cyl(.03, .03, 2.4, white, { parent: g, x, z, y: .8, seg: 6 });
      kit.cone(1.4, .6, M.std(c, { rough: .5, map: null }), { parent: g, x, z, y: 2.6, seg: 8 });
      [[0, .9], [0, -.9]].forEach(([dx, dz]) => kit.box(.4, .45, .4, M.std('#F7F7F4', { map: null, rough: .5 }), { parent: g, x: x + dx, z: z + dz }));
      colliders.push({ type: 'circle', x, z, r: 1.2 });
    };
    umbrella(66.6, 62.2, '#E8473B'); umbrella(77.8, 62.2, '#3B82F6'); umbrella(61.2, 60.3, '#FFC23D');
    person({ x: 66.6, z: 61.3, pose: 'sit', ry: 0, y: 0, lowSkip: true }); person({ x: 77.8, z: 63.1, pose: 'sit', ry: Math.PI });
    person({ x: 71, z: 60.2, ry: Math.PI, lowSkip: true }); person({ x: 74.6, z: 60.4, ry: Math.PI + .3 });
    spots.push({ id: 'food', x: 72.4, z: 63.4, y: 5.2 });
  }

  /* ---------------- planting: trees, flower beds, benches, lamps */
  const trees = [[52.5, 66], [53, 72], [52.5, 85], [55, 91], [60, 92.5], [66, 93], [93.5, 92], [93.8, 84], [94, 70], [93.5, 56.5], [60.5, 69.5], [67.5, 71], [90, 76.5], [84, 92.5], [71, 93.5], [52.5, 79]];
  trees.forEach(([x, z], i) => kit.tree(x, z, { s: .9 + (i % 4) * .08, kind: i % 5 === 3 ? 'cone' : 'round' }));
  flowerBed(57.5, 86.5, 1.8); flowerBed(90, 92, 1.4); flowerBed(68.5, 84.2, 1.2); flowerBed(91.8, 66, 1.2);
  [[58.5, 66.8], [66.5, 88.9], [88.8, 69.2], [93, 80.5], [55, 64], [70.5, 70]].forEach(([x, z]) => kit.bush(x, z, { s: .8 }));
  kit.bench(65.8, 85.6, { ry: Math.PI * .75 }); kit.bench(92.4, 74.5, { ry: -Math.PI / 2 }); kit.bench(70, 91.6, { ry: Math.PI });
  [[59.5, 61.2], [64.8, 80], [72, 91.5], [86.3, 88.5], [92.6, 77.5], [82, 69]].forEach(([x, z]) => kit.lamp(x, z, { ry: 0 }));
  if (!low) { person({ x: 69.9, z: 91.3, pose: 'sit', ry: Math.PI }); person({ x: 89.6, z: 73.8, ry: 1.2 }); }
  // a kite-flyer and a balloon seller on the south lawn (bright, toy-like)
  if (!low) {
    const bx = 62.6, bz = 91.2;
    person({ x: bx, z: bz, ry: .4 });
    ['#E8473B', '#FFC23D', '#3B82F6', ACC, '#B86BF2'].forEach((c, i) => { const a = i * 1.26; kit.sphere(.3, M.std(c, { map: null, rough: .35 }), { parent: g, x: bx + .3 + Math.cos(a) * .35, z: bz + Math.sin(a) * .35, y: 2.8 + (i % 2) * .3, seg: 10, seg2: 8 }); kit.box(.01, 1.4, .01, white, { parent: g, x: bx + .3 + Math.cos(a) * .2, z: bz + Math.sin(a) * .2, y: 1.35 }); });
  }

  colorBake(THREE, kit, g);
  kit.bake(g);
  const boat = dyn.userData.boat, nTex = dyn.userData.nTex;
  return {
    group: g, colliders, spots,
    update(dt, t) {
      boat.position.y = .12 + Math.sin(t * 1.4) * .05;
      boat.rotation.z = Math.sin(t * 1.1) * .04; boat.rotation.y = .1 + Math.sin(t * .3) * .05;
      nTex.offset.set(t * .01, t * .006);
    },
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
