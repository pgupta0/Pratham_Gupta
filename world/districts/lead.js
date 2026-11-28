/* lead.js: Leadership Square / town hall.
   Plot centre (0, 94), 60 x 36 m; the spoke road arrives at the NORTH edge (0, 76).
   The town hall sits at the south end and faces north onto the square. In the square: a flagpole
   ringed by 7 violet banners naming the leadership roles, two reflecting pools with jets, the
   Techstars award plinth (west) and the Theomi mentoring corner under a pergola (south-east).
   All signage is one canvas atlas (one draw call). */
import * as THREE from 'three';

const ACC = '#7C5CFF', INK = '#1F2328', FONT = '"Inter", system-ui, -apple-system, "Segoe UI", Arial, sans-serif';

export async function build(ctx) {
  const { kit, M, quality, rng } = ctx;
  const low = quality === 'low';
  const G = new THREE.Group();
  const colliders = [], spots = [], dyn = [];
  const R = rng(777);

  /* ---------------- materials (bright toy palette) ---------------- */
  const mWhite = M.std('#F7F7F4', { rough: .45 });
  const mCream = M.std('#F2E3C2', { rough: .5 });
  const mTan = M.std('#E4CD9E', { rough: .5 });
  const mAcc = M.std(ACC, { rough: .4, map: null });
  const mRoof = M.std('#1E5AA8', { rough: .4 });
  const mRed = M.std('#D0302A', { rough: .4 });
  const mGreen = M.std('#00852B', { rough: .45 });
  const mStone = M.std('#D9D6CF', { rough: .6 });
  const mKerb = M.std(kit.PALETTE.kerb, { rough: .9 });
  const mDark = M.std('#3B4048', { rough: .45, metal: .4, map: null });
  const mGold = M.std('#E8B422', { rough: .2, metal: .85, map: null });
  const mAlu = M.std('#DCE0E5', { rough: .35, metal: .6, map: 'metal' });
  const mWood = M.std('#A0663A', { rough: .6 });
  const mPool = M.std('#2F7FB8', { rough: .5, map: null });
  const nTex = kit.T.normalWater.clone(); nTex.needsUpdate = true; nTex.wrapS = nTex.wrapT = THREE.RepeatWrapping; nTex.repeat.set(3, 1.5);
  const mWater = new THREE.MeshPhysicalMaterial({ color: '#5FC0EA', roughness: .06, normalMap: nTex, normalScale: new THREE.Vector2(.25, .25), clearcoat: 1, transparent: true, opacity: .85, envMapIntensity: 1.3 });
  const mJet = new THREE.MeshBasicMaterial({ color: '#E9F7FF', transparent: true, opacity: .6, depthWrite: false });

  const cb = (w, h, d, mat, o = {}) => { const g = new THREE.BoxGeometry(w, h, d); if (mat.map) kit.worldUV(g, (mat.userData && mat.userData.metres) || 1); return kit.place(new THREE.Mesh(g, mat), Object.assign({ parent: G }, o)); };
  const box = (w, h, d, mat, o = {}) => kit.box(w, h, d, mat, Object.assign({ parent: G }, o));
  const rbox = (w, h, d, r, mat, o = {}) => kit.rbox(w, h, d, r, mat, Object.assign({ parent: G }, o));
  const cyl = (rt, rb, h, mat, o = {}) => kit.cyl(rt, rb, h, mat, Object.assign({ parent: G }, o));
  // people use kit's low-poly tier on every quality (they are small on screen and numerous)
  const lowPoly = f => { const q = kit.quality(); kit.setQuality('low'); try { return f(); } finally { kit.setQuality(q); } };
  const person = o => lowPoly(() => kit.person(Object.assign({ parent: G, seed: Math.floor(R() * 1e6) }, o)));
  const lawn = (x0, z0, x1, z1) => { const w = x1 - x0, d = z1 - z0, x = (x0 + x1) / 2, z = (z0 + z1) / 2; box(w + .24, .07, d + .24, mKerb, { x, z, y: .13 }); kit.plane(w, d, M.grass, { parent: G, x, z, y: .215 }); };
  const txt = (g, s, x, y, size, { weight = 700, color = INK, align = 'center', maxW = 0 } = {}) => {
    g.font = `${weight} ${size}px ${FONT}`;
    if (maxW) while (g.measureText(s).width > maxW && size > 8) { size -= 1; g.font = `${weight} ${size}px ${FONT}`; }
    g.fillStyle = color; g.textAlign = align; g.textBaseline = 'middle'; g.fillText(s, x, y);
  };

  /* ---------------- signage atlas ---------------- */
  const ROLES = [['Roar &', 'Conclave', 'Sponsorship'], ['Deans', 'Conference', 'Ops & Logistics'], ['Operations', 'Committee', 'Senior Member'], ['PreQL', '', 'Senior member'], ['Theomi', '', 'Mentor'], ['Techstars', '', 'Award'], ['Rotaract', '', 'Vice President']];
  const REG = {};
  ROLES.forEach((r, i) => (REG['b' + i] = [i * 128, 0, i * 128 + 128, 384, (g, w, h) => {
    g.fillStyle = ACC; g.fillRect(0, 0, w, h);
    g.fillStyle = '#FFFFFF'; g.fillRect(0, 0, w, 14); g.fillRect(0, h - 14, w, 14);
    g.beginPath(); g.arc(w / 2, 70, 26, 0, 6.29); g.fill();
    txt(g, String(i + 1), w / 2, 71, 30, { weight: 800, color: ACC });
    txt(g, r[0], w / 2, r[1] ? 160 : 180, 26, { weight: 800, color: '#FFFFFF', maxW: w - 14 });
    if (r[1]) txt(g, r[1], w / 2, 196, 22, { weight: 800, color: '#FFFFFF', maxW: w - 14 });
    txt(g, r[2], w / 2, 290, 15, { weight: 600, color: '#E4DDFF', maxW: w - 12 });
  }]));
  Object.assign(REG, {
    clock: [896, 0, 1024, 128, (g, w, h) => {
      g.fillStyle = '#FFFFFF'; g.fillRect(0, 0, w, h);
      g.strokeStyle = INK; g.lineWidth = 6; g.beginPath(); g.arc(64, 64, 58, 0, 6.29); g.stroke();
      for (let i = 0; i < 12; i++) { const a = i / 12 * 6.283; g.fillStyle = INK; g.fillRect(64 + Math.sin(a) * 46 - 3, 64 - Math.cos(a) * 46 - 3, 6, 6); }
    }],
    clockS: [896, 128, 1024, 256, (g, w, h) => {
      g.fillStyle = '#FFFFFF'; g.fillRect(0, 0, w, h);
      g.strokeStyle = INK; g.lineWidth = 6; g.beginPath(); g.arc(64, 64, 58, 0, 6.29); g.stroke();
      for (let i = 0; i < 12; i++) { const a = i / 12 * 6.283; g.fillStyle = INK; g.fillRect(64 + Math.sin(a) * 46 - 3, 64 - Math.cos(a) * 46 - 3, 6, 6); }
      g.lineCap = 'round'; g.lineWidth = 7; g.beginPath(); g.moveTo(64, 64); g.lineTo(40, 48); g.stroke();
      g.lineWidth = 5; g.beginPath(); g.moveTo(64, 64); g.lineTo(92, 34); g.stroke();
    }],
    frieze: [0, 384, 512, 448, (g, w, h) => { g.fillStyle = '#F2E3C2'; g.fillRect(0, 0, w, h); txt(g, 'TOWN HALL', w / 2, h / 2 + 2, 40, { weight: 800, color: '#4A3B22' }); }],
    tech: [512, 384, 768, 448, (g, w, h) => { g.fillStyle = '#2B2F35'; g.fillRect(0, 0, w, h); txt(g, 'Techstars Startup Weekend', w / 2, 20, 17, { weight: 800, color: '#F3D58A', maxW: w - 12 }); txt(g, 'Outstanding Professional Development Award', w / 2, 44, 12, { weight: 600, color: '#FFFFFF', maxW: w - 12 }); }],
    theomi: [768, 384, 1024, 448, (g, w, h) => { g.fillStyle = '#FFFFFF'; g.fillRect(0, 0, w, h); g.fillStyle = ACC; g.fillRect(0, 0, 8, h); txt(g, 'Theomi', 22, 22, 24, { weight: 800, align: 'left' }); txt(g, 'mentoring corner', 22, 46, 16, { weight: 600, color: '#5B6470', align: 'left' }); }],
    square: [0, 448, 512, 512, (g, w, h) => { g.fillStyle = '#FFFFFF'; g.fillRect(0, 0, w, h); g.fillStyle = ACC; g.fillRect(0, h - 8, w, 8); txt(g, 'Leadership Square', w / 2, h / 2 - 2, 36, { weight: 800 }); }],
  });
  const atlasTex = kit.canvasTex(1024, 512, g => {
    g.fillStyle = '#FFFFFF'; g.fillRect(0, 0, 1024, 512);
    for (const k in REG) { const [x0, y0, x1, y1, fn] = REG[k]; g.save(); g.translate(x0, y0); g.beginPath(); g.rect(0, 0, x1 - x0, y1 - y0); g.clip(); fn(g, x1 - x0, y1 - y0); g.restore(); }
  }, { repeat: false });
  const mAtlas = new THREE.MeshBasicMaterial({ map: atlasTex, toneMapped: false });
  const mapUV = (geo, key, flip) => {
    const [x0, y0, x1, y1] = REG[key], uv = geo.attributes.uv;
    for (let i = 0; i < uv.count; i++) { let u = uv.getX(i); const v = uv.getY(i); if (flip) u = 1 - u; uv.setXY(i, (x0 + u * (x1 - x0)) / 1024, 1 - (y1 - v * (y1 - y0)) / 512); }
    return geo;
  };
  const sign = (key, w, h, o = {}) => {
    const geo = new THREE.PlaneGeometry(w, h); geo.translate(0, h / 2, 0); mapUV(geo, key, o.flip);
    const m = kit.place(new THREE.Mesh(geo, mAtlas), Object.assign({ parent: G, cast: false }, o)); m.castShadow = false; return m;
  };
  const disc = (key, r, o = {}) => {
    const geo = mapUV(new THREE.CircleGeometry(r, 32), key);
    const m = kit.place(new THREE.Mesh(geo, mAtlas), Object.assign({ parent: G, cast: false }, o)); m.castShadow = false; return m;
  };

  /* ---------------- ground ---------------- */
  box(59.6, .1, 35.6, mKerb, { x: 0, z: 94 });
  box(59, .14, 35, M.paving, { x: 0, z: 94 });
  box(12, .14, 1.2, M.paving, { x: 0, z: 76.6 });
  kit.plane(7, 14, M.tiles, { parent: G, x: 0, z: 85, y: .145 });                    // central promenade
  kit.paint(0, 83, 12.4, 12.4, '#E9E2F7', { parent: G, y: .13 });                    // medallion under the banner ring
  lawn(-28, 96, -14.5, 110); lawn(14.5, 107, 28, 110);
  lawn(-28.5, 78, -25.5, 94); lawn(25.5, 78, 28.5, 94);
  for (let z = 80; z <= 92; z += 6) { kit.tree(-27, z, { s: 1.05 }); kit.tree(27, z, { s: 1.05 }); colliders.push({ type: 'circle', x: -27, z, r: .6 }, { type: 'circle', x: 27, z, r: .6 }); }
  [-23.5, 23.5].forEach(x => [80, 88].forEach(z => kit.lamp(x, z, { ry: x < 0 ? Math.PI / 2 : -Math.PI / 2 })));

  /* ---------------- MAIN: town hall facing north ---------------- */
  {
    const hg = new THREE.Group(); hg.position.set(0, 0, 104.5); hg.rotation.y = Math.PI; G.add(hg);
    const hb = (w, h, d, mat, o) => kit.box(w, h, d, mat, Object.assign({ parent: hg }, o));
    hb(25, 1.2, 11.6, mStone, {});
    hb(18, 1.2, 4, mStone, { z: 7.5 });
    for (let k = 1; k <= 6; k++) hb(17, k * .2, (7 - k) * .45, mStone, { z: 9.5 + (7 - k) * .45 / 2 });
    for (let k = 1; k <= 6; k++) kit.plane(2.2, .45, mAcc, { parent: hg, y: k * .2 + .005, z: 9.5 + (6 - k) * .45 + .225 });   // violet runner
    kit.plane(2.2, 4, mAcc, { parent: hg, y: 1.205, z: 7.5 });
    kit.building({ parent: hg, y: 1.2, w: 24, d: 11, floors: 2, storey: 4.2, wall: '#F2E3C2', trim: '#FFFFFF', band: '#D0302A', door: 'front', doorW: 2.4, doorGlass: false, canopy: false, winW: 1.4, winH: 2.4, bay: 3, roofUnits: false });
    // columns
    for (let i = 0; i < 6; i++) {
      const x = -7.5 + i * 3;
      kit.box(1.1, .3, 1.1, mWhite, { parent: hg, x, y: 1.2, z: 9 });
      kit.cyl(.4, .46, 6.4, mWhite, { parent: hg, x, y: 1.5, z: 9, seg: 16 });
      kit.box(1.1, .35, 1.1, mWhite, { parent: hg, x, y: 7.9, z: 9 });
    }
    hb(18.4, 1.1, 4.6, mCream, { y: 8.25, z: 7.5 });
    hb(18.6, .2, 4.8, mRed, { y: 9.3, z: 7.5 });
    { const g2 = sign('frieze', 8, 1, { parent: hg, y: 8.3, z: 9.82 }); void g2; }
    // pediment with clock
    const sh = new THREE.Shape([new THREE.Vector2(-9.2, 0), new THREE.Vector2(9.2, 0), new THREE.Vector2(0, 2.8)]);
    const pg = new THREE.ExtrudeGeometry(sh, { depth: 4.6, bevelEnabled: false }); kit.worldUV(pg, 2);
    kit.place(new THREE.Mesh(pg, mCream), { parent: hg, y: 9.5, z: 5.2 });
    const ang = Math.atan2(2.8, 9.2), L = Math.hypot(9.6, 2.9);
    [-1, 1].forEach(s => { const m = new THREE.Mesh(new THREE.BoxGeometry(L, .35, 5.0), mRoof); m.rotation.z = -s * ang; m.position.set(s * 4.6, 9.5 + 1.4 + .2, 7.5); kit.place(m, { parent: hg, x: s * 4.6, y: 10.95, z: 7.5, rz: -s * ang }); });
    disc('clock', .85, { parent: hg, y: 10.45, z: 9.82 });
    kit.cyl(.95, .95, .1, mGold, { parent: hg, y: 10.45, z: 9.62, rx: Math.PI / 2, seg: 24 });
    // clock hands (dynamic, real time)
    const hands = new THREE.Group(); hands.userData.dynamic = true; hands.position.set(0, 10.45, 9.86); hg.add(hands);
    const mkHand = (len, w) => { const g = new THREE.BoxGeometry(w, len, .03); g.translate(0, len / 2, 0); const m = new THREE.Mesh(g, M.std('#1F2328', { map: null })); hands.add(m); return m; };
    const hHour = mkHand(.42, .09), hMin = mkHand(.66, .06);
    dyn.push({ hHour, hMin });
    // cupola on the roof, clock face on its south side
    kit.box(3.6, 2.6, 3.6, mCream, { parent: hg, y: 10.4 });
    kit.box(4.0, .3, 4.0, mWhite, { parent: hg, y: 13.0 });
    const dome = kit.sphere(1.8, mRoof, { parent: hg, y: 13.3, seg: 20, seg2: 12 }); dome.scale.y = .8;
    kit.cyl(.06, .06, 1.2, mGold, { parent: hg, y: 16.1, seg: 6 }); kit.sphere(.16, mGold, { parent: hg, y: 17.2, seg: 10, seg2: 8 });
    disc('clockS', .95, { parent: hg, y: 11.7, z: -1.82, ry: Math.PI });
    disc('clockS', .95, { parent: hg, y: 11.7, z: 1.82 });
    // lanterns by the door
    [-2.3, 2.3].forEach(x => { kit.box(.3, .5, .3, mGold, { parent: hg, x, y: 3.6, z: 5.75 }); });
    colliders.push({ type: 'box', x: 0, z: 104.6, w: 25.2, d: 11.8 }, { type: 'box', x: 0, z: 95.65, w: 18.2, d: 6.8 });
    spots.push({ id: 'main', x: 0, z: 90.3, y: 4.5 });
    person({ x: -5.5, y: .4, z: 94.4, ry: Math.PI, pose: 'sit' }); person({ x: 6, y: .4, z: 94.2, ry: Math.PI, pose: 'sit', shirt: ACC });
  }

  /* ---------------- flagpole ringed by 7 role banners ---------------- */
  {
    const fx = 0, fz = 83;
    cyl(1.3, 1.4, .4, mStone, { x: fx, z: fz, seg: 24 }); cyl(.8, .85, .35, mWhite, { x: fx, z: fz, y: .4, seg: 20 });
    cyl(.06, .1, 12, mAlu, { x: fx, z: fz, y: .75, seg: 10 }); kit.sphere(.16, mGold, { parent: G, x: fx, y: 12.75, z: fz, seg: 10, seg2: 8 });
    colliders.push({ type: 'circle', x: fx, z: fz, r: 1.45 });
    // waving flag: a segmented plane, vertices moved in update
    const fgeo = new THREE.PlaneGeometry(2.6, 1.6, low ? 6 : 12, 3); fgeo.translate(1.3 + .08, 0, 0);
    const flag = new THREE.Mesh(fgeo, M.std(ACC, { rough: .7, map: null, side: THREE.DoubleSide }));
    flag.position.set(fx, 11.6, fz); flag.userData.dynamic = true; flag.castShadow = true; G.add(flag);
    const base = Float32Array.from(fgeo.attributes.position.array);
    dyn.push({ flag, base });
    // banners on a heptagon (gap facing the entrance)
    const r = 5.6;
    for (let i = 0; i < 7; i++) {
      const a = Math.PI / 7 + i * 2 * Math.PI / 7;                     // a = 0 would be due north: leave a gap there for the entrance
      const bx = fx + Math.sin(a) * r, bz = fz - Math.cos(a) * r, ry = Math.atan2(bx - fx, bz - fz);
      cyl(.07, .08, 4.6, mAlu, { x: bx, z: bz, seg: 8 }); kit.sphere(.1, mGold, { parent: G, x: bx, y: 4.6, z: bz, seg: 8, seg2: 6 });
      box(1.25, .07, .07, mAlu, { x: bx, y: 4.35, z: bz, ry });
      sign('b' + i, 1.1, 3.3, { x: bx + Math.sin(ry) * .06, y: .95, z: bz + Math.cos(ry) * .06, ry });
      sign('b' + i, 1.1, 3.3, { x: bx - Math.sin(ry) * .06, y: .95, z: bz - Math.cos(ry) * .06, ry: ry + Math.PI });
      colliders.push({ type: 'circle', x: bx, z: bz, r: .25 });
    }
  }

  /* ---------------- reflecting pools with jets ---------------- */
  const jets = new THREE.Group(); jets.userData.dynamic = true; G.add(jets);
  {
    const jg = [];
    [-1, 1].forEach(s => {
      const px = s * 16.5, pz = 83, w = 11, d = 6;
      box(w + .6, .55, .3, mStone, { x: px, z: pz - d / 2 - .15 }); box(w + .6, .55, .3, mStone, { x: px, z: pz + d / 2 + .15 });
      box(.3, .55, d, mStone, { x: px - w / 2 - .15, z: pz }); box(.3, .55, d, mStone, { x: px + w / 2 + .15, z: pz });
      box(w, .2, d, mPool, { x: px, z: pz });
      kit.plane(w, d, mWater, { parent: G, x: px, z: pz, y: .42 });
      for (let k = 0; k < 5; k++) {
        const g = new THREE.CylinderGeometry(.03, .09, 1.4, 8, 1, true); g.translate(px - 4 + k * 2, .42 + .7, pz); jg.push(g);
      }
      colliders.push({ type: 'box', x: px, z: pz, w: w + .6, d: d + .6 });
    });
    const merged = new THREE.Mesh(mergeG(jg), mJet); jets.add(merged);
  }
  function mergeG(list) {
    let n = 0; list.forEach(g => (n += g.index.count));
    const pos = [], out = new THREE.BufferGeometry();
    list.forEach(g => { const p = g.attributes.position, ix = g.index.array; for (let i = 0; i < ix.length; i++) pos.push(p.getX(ix[i]), p.getY(ix[i]), p.getZ(ix[i])); });
    out.setAttribute('position', new THREE.Float32BufferAttribute(pos, 3)); out.computeVertexNormals(); void n; return out;
  }

  /* ---------------- TECHSTARS: award plinth ---------------- */
  {
    const px = -17.5, pz = 91.2;
    box(2.6, .3, 2.6, mStone, { x: px, z: pz }); rbox(1.8, 1.3, 1.8, .06, mWhite, { x: px, y: .3, z: pz });
    box(2.0, .15, 2.0, mRoof, { x: px, y: 1.6, z: pz });
    sign('tech', 1.6, .4, { x: px, y: .75, z: pz - .91, ry: Math.PI });
    sign('tech', 1.6, .4, { x: px, y: .75, z: pz + .91 });
    const sc = new THREE.Group(); sc.userData.dynamic = true; sc.position.set(px, 2.75, pz); G.add(sc);
    const knot = new THREE.Mesh(new THREE.TorusKnotGeometry(.48, .14, low ? 48 : 96, low ? 6 : 10, 2, 3), mGold); knot.castShadow = true; sc.add(knot);
    const gem = new THREE.Mesh(new THREE.OctahedronGeometry(.28), M.std(ACC, { rough: .15, metal: .3, map: null })); gem.position.y = 1.0; gem.castShadow = true; sc.add(gem);
    dyn.push({ sc });
    colliders.push({ type: 'box', x: px, z: pz, w: 2.7, d: 2.7 });
    spots.push({ id: 'techstars', x: px, z: 88.2, y: 4.5 });
    person({ x: px + 1.8, z: 89.2, ry: Math.PI + .9 });
  }

  /* ---------------- THEOMI: pergola corner, table, two people talking ---------------- */
  {
    const x0 = 16.5, x1 = 24.5, z0 = 99, z1 = 105, cx = (x0 + x1) / 2, cz = (z0 + z1) / 2;
    kit.plane(x1 - x0 + 1, z1 - z0 + 1, M.wood, { parent: G, x: cx, z: cz, y: .15 });
    for (const x of [x0, cx, x1]) for (const z of [z0, z1]) { box(.25, 3, .25, mWood, { x, z }); colliders.push({ type: 'circle', x, z, r: .25 }); }
    [z0, z1].forEach(z => box(x1 - x0 + .8, .25, .2, mWood, { x: cx, y: 3, z }));
    for (let i = 0; i < (low ? 6 : 11); i++) box(.15, .18, z1 - z0 + .8, mGreen, { x: x0 - .2 + i * (x1 - x0 + .4) / ((low ? 6 : 11) - 1), y: 3.25, z: cz });
    // table + chairs + mentor and mentee
    const tx = cx, tz = cz - .4;
    cyl(.55, .55, .05, mWhite, { x: tx, y: .74, z: tz, seg: 18 }); cyl(.06, .2, .74, mDark, { x: tx, z: tz, seg: 8 });
    cyl(.06, .05, .1, mRed, { x: tx - .2, y: .79, z: tz + .1, seg: 8 }); cyl(.06, .05, .1, mWhite, { x: tx + .2, y: .79, z: tz - .1, seg: 8 });
    box(.3, .02, .22, M.std('#F5CD2F', { map: null }), { x: tx + .05, y: .79, z: tz + .2 });
    [[-1, Math.PI / 2], [1, -Math.PI / 2]].forEach(([s, ry], k) => {
      box(.45, .45, .45, mAcc, { x: tx + s * .95, z: tz }); box(.08, .5, .45, mAcc, { x: tx + s * 1.17, y: .45, z: tz });
      person({ x: tx + s * 1.0, z: tz, ry, pose: 'sit', shirt: k ? '#F2F2F2' : '#2B3442' });
    });
    colliders.push({ type: 'circle', x: tx, z: tz, r: 1.5 });
    kit.bench(x0 + .9, cz + .8, { ry: Math.PI / 2 }); kit.bench(x1 - .9, cz + .8, { ry: -Math.PI / 2 });
    kit.tree(26.5, 98.5, { s: 1.2 }); kit.tree(26.3, 108, { s: 1.1 }); kit.tree(15.2, 108.6);
    colliders.push({ type: 'circle', x: 26.5, z: 98.5, r: .6 });
    kit.bush(x0 - .8, z0 + .2); kit.bush(x1 + .9, z1 - .5);
    box(.1, 1.1, .1, mDark, { x: x0 - 1.2, z: z0 - 1.0 }); sign('theomi', 1.7, .45, { x: x0 - 1.2, y: 1.05, z: z0 - .96 });
    spots.push({ id: 'theomi', x: cx, z: 96.2, y: 4.5 });
  }

  /* ---------------- south-west garden, entrance sign ---------------- */
  kit.tree(-25, 99, { s: 1.15 }); kit.tree(-19.5, 107.5); kit.tree(-26, 107.6, { kind: 'cone' }); kit.tree(-16.2, 99.8, { kind: 'cone', s: .9 });
  kit.bench(-21, 102.5, { ry: Math.PI }); kit.bench(-22, 98.5, {});
  person({ x: -21.4, y: 0, z: 102.25, ry: Math.PI, pose: 'sit' }); person({ x: -20.6, z: 102.25, ry: Math.PI, pose: 'sit', shirt: '#F5CD2F' });
  colliders.push({ type: 'circle', x: -25, z: 99, r: .6 }, { type: 'circle', x: -19.5, z: 107.5, r: .6 });
  rbox(4.4, .5, .5, .05, mStone, { x: 8.6, z: 77.8 }); rbox(4.2, .7, .16, .04, mWhite, { x: 8.6, y: .45, z: 77.8 });
  sign('square', 4, .5, { x: 8.6, y: .55, z: 77.71, ry: Math.PI });
  colliders.push({ type: 'box', x: 8.6, z: 77.8, w: 4.6, d: .7 });
  [-8.6, 12.5].forEach(x => { rbox(1.6, .6, 1.6, .1, mRed, { x, z: 78.4 }); kit.bush(x, 78.4, { s: .8 }); colliders.push({ type: 'box', x, z: 78.4, w: 1.7, d: 1.7 }); });
  // people around the square
  [[-10, 89.5, 2.4], [-9.2, 90.4, -2.2], [11.2, 89, .4], [20, 78.8, 3.3], [-20, 79, 0]].forEach(([x, z, ry], i) => { if (!low || i < 2) person({ x, z, ry }); });

  /* ---------------- strollers ---------------- */
  const walkers = [];
  const walker = (pts, speed, seed, shirt) => {
    const holder = new THREE.Group(); holder.userData.dynamic = true; G.add(holder);
    const p = lowPoly(() => kit.person({ seed, shirt })); kit.bake(p); holder.add(p);
    const segs = []; let tot = 0;
    for (let i = 0; i < pts.length; i++) { const a = pts[i], b = pts[(i + 1) % pts.length], L = Math.hypot(b[0] - a[0], b[1] - a[1]); segs.push({ a, b, L, s0: tot, h: Math.atan2(b[0] - a[0], b[1] - a[1]) }); tot += L; }
    walkers.push({ holder, p, segs, tot, s: R() * tot, speed });
  };
  { const pts = []; for (let i = 0; i < 12; i++) { const a = i / 12 * Math.PI * 2; pts.push([Math.sin(a) * 7.6, 83 - Math.cos(a) * 7.6]); } walker(pts, 1.1, 501, '#F5CD2F'); }
  if (!low) walker([[-22, 89.6], [22, 89.6], [22, 90.8], [-22, 90.8]], 1.0, 502, '#3B6EA5');

  kit.bake(G);
  const t0 = Date.now() / 1000;
  const fd = dyn.find(d => d.flag), hd = dyn.find(d => d.hHour), sd = dyn.find(d => d.sc);
  return {
    group: G, colliders, spots,
    update(dt, t) {
      nTex.offset.set(t * .02, t * .012);
      jets.scale.y = 1 + Math.sin(t * 5) * .08;
      if (sd) sd.sc.rotation.y = t * .4;
      if (hd) { const s = (t0 + t + 19800) % 43200; hd.hHour.rotation.z = -s / 43200 * Math.PI * 2; hd.hMin.rotation.z = -(s % 3600) / 3600 * Math.PI * 2; }
      if (fd) {
        const p = fd.flag.geometry.attributes.position, b = fd.base;
        for (let i = 0; i < p.count; i++) { const x = b[i * 3]; p.array[i * 3 + 2] = Math.sin(x * 2.2 - t * 5) * .16 * (x / 2.6); }
        p.needsUpdate = true;
        fd.flag.rotation.y = Math.sin(t * .3) * .3;
      }
      for (const w of walkers) {
        w.s = (w.s + dt * w.speed) % w.tot;
        let sg = w.segs[0]; for (let i = 0; i < w.segs.length; i++) if (w.s >= w.segs[i].s0) sg = w.segs[i];
        const k = (w.s - sg.s0) / sg.L;
        w.holder.position.set(sg.a[0] + (sg.b[0] - sg.a[0]) * k, 0, sg.a[1] + (sg.b[1] - sg.a[1]) * k);
        w.holder.rotation.y = sg.h; w.p.position.y = Math.abs(Math.sin(w.s * 4.2)) * .05;
      }
    },
  };
}
