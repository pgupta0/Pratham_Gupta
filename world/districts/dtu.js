/* dtu.js: Delhi Technological University campus corner (BA (Hons) Economics, 2023).
   Plot (-74, -64), 48 x 44 (x -98..-50, z -86..-42). The spoke road arrives at the SE corner (-50, -42).
   Layout (default camera looks north, so the main faces look south):
   - north: red-brick academic block with a central clock tower, broad steps        (spot main)
   - centre: lawn with a footpath cross, students on the grass
   - west: library + glass data-lab wing, chalkboard of charts behind the glass      (spot econ)
   - east: Rotaract club house with banner, little open-air stage, notice board      (spot rotaract)
   - SE corner: gateway arch with the university name, forecourt, low boundary walls
   Local helpers: a text atlas (all signs share one texture + one draw call), half-disc arches. */

const FONT = '"Inter", system-ui, -apple-system, "Segoe UI", Arial, sans-serif';

/* ---------- local helper: one canvas atlas for every sign / board in this district ---------- */
function makeAtlas(THREE, kit, SW = 2048, SH = 1024) {
  const cv = document.createElement('canvas'); cv.width = SW; cv.height = SH;
  const g = cv.getContext('2d');
  const tex = new THREE.CanvasTexture(cv); tex.colorSpace = THREE.SRGBColorSpace; tex.anisotropy = 8;
  const mat = new THREE.MeshBasicMaterial({ map: tex, toneMapped: false, polygonOffset: true, polygonOffsetFactor: -1, polygonOffsetUnits: -1 });
  let cx = 0, cy = 0, rh = 0;
  const alloc = (pw, ph) => {
    if (cx + pw > SW) { cx = 0; cy += rh + 4; rh = 0; }
    const r = { x: cx, y: cy, w: pw, h: ph }; cx += pw + 4; rh = Math.max(rh, ph);
    if (cy + ph > SH) console.warn('[dtu] atlas full');
    return r;
  };
  const text = (lines, W, H, k, { fg = '#1F2328', weight = 700, size = .5, align = 'center', pad = .15, x0 = 0 } = {}) => {
    const arr = [].concat(lines), total = arr.reduce((s, l) => s + ((typeof l === 'object' && l.size) || size) * 1.25, 0);
    let y = (H - total * k) / 2; g.textBaseline = 'middle'; g.textAlign = align;
    for (const l of arr) {
      const L = typeof l === 'string' ? { text: l } : l, sz = (L.size || size) * k;
      let fs = sz; g.font = `${L.weight || weight} ${fs}px ${FONT}`;
      const maxW = W - pad * 2 * k - x0; while (g.measureText(L.text).width > maxW && fs > 6) { fs -= 1; g.font = `${L.weight || weight} ${fs}px ${FONT}`; }
      g.fillStyle = L.color || fg;
      const x = align === 'center' ? x0 + (W - x0) / 2 : align === 'left' ? x0 + pad * k : W - pad * k;
      y += (L.size || size) * 1.25 * k / 2; g.fillText(L.text, x, y); y += (L.size || size) * 1.25 * k / 2;
    }
  };
  // region(wm, hm, draw(g, W, H, k), ppm) -> r ; quad(r, wm, hm, placeOpts) -> mesh (faces +z, base at y)
  const region = (wm, hm, draw, ppm = 110) => {
    const pw = Math.ceil(wm * ppm), ph = Math.ceil(hm * ppm), r = alloc(pw, ph);
    g.save(); g.translate(r.x, r.y); g.beginPath(); g.rect(0, 0, pw, ph); g.clip(); draw(g, pw, ph, pw / wm); g.restore();
    tex.needsUpdate = true; return r;
  };
  const quad = (r, wm, hm, o = {}) => {
    const geo = new THREE.PlaneGeometry(wm, hm); geo.translate(0, hm / 2, 0);
    const uv = geo.attributes.uv, e = .5;
    for (let i = 0; i < uv.count; i++) { const u = uv.getX(i), v = uv.getY(i); uv.setXY(i, (r.x + e + u * (r.w - 2 * e)) / SW, 1 - (r.y + e + (1 - v) * (r.h - 2 * e)) / SH); }
    const m = kit.place(new THREE.Mesh(geo, mat), Object.assign({ cast: false }, o)); m.castShadow = false; return m;
  };
  // a plain sign face: background, optional accent bar, text lines
  const signRegion = (lines, wm, hm, { bg = '#FFFFFF', fg, accent, accentH = .07, ppm, weight, size, align, pad, radius = 0 } = {}) => region(wm, hm, (g2, W, H, k) => {
    g2.fillStyle = bg; g2.fillRect(0, 0, W, H);
    if (accent) { g2.fillStyle = accent; g2.fillRect(0, H - accentH * k, W, accentH * k); }
    text(lines, W, H - (accent ? accentH * k : 0), k, { fg, weight, size, align, pad });
    void radius;
  }, ppm);
  return { mat, tex, g, region, quad, text, signRegion };
}

export async function build(ctx) {
  const { THREE, kit, M, quality, rng } = ctx;
  const low = quality === 'low';
  const root = new THREE.Group();
  const G = new THREE.Group(); root.add(G);              // static, baked at the end
  const A = makeAtlas(THREE, kit);
  const colliders = [], spots = [];

  /* ---------- materials (few, shared) ---------- */
  const brick = M.brick;
  const trim = M.std('#F7F7F4', { rough: .6 });
  const stone = M.std('#ECE4D6', { rough: .8 });
  const kerbM = M.std('#D2CCC2', { rough: .9 });
  const paving = M.paving, grass = M.grass;
  const terracotta = M.std('#E8572B', { rough: .8, map: 'roof' });
  const darkWood = M.std('#5A3B28', { rough: .7 });
  const wood = M.wood;
  const dark = M.dark;
  const steel = M.metal;
  const accent = M.std('#E07A2E', { rough: .6 });
  const screenM = M.emit('#BFE3FF', .95);
  const lightM = M.emit('#FFF6DF', 1);
  const glassT = new THREE.MeshPhysicalMaterial({ color: '#CFE6F2', roughness: .04, metalness: 0, transparent: true, opacity: .22, depthWrite: false, envMapIntensity: 1.2, clearcoat: 1 });
  const chairM = M.std('#F4F1EA', { rough: .5, map: null });
  const chairM2 = M.std('#1F7BD8', { rough: .5, map: null });
  const corkM = M.std('#B98A5E', { rough: .9, map: null });

  /* ---------- small local helpers ---------- */
  const mk = (geo, mat, o = {}) => { if (mat.map) kit.worldUV(geo, mat.userData.metres || 1); return kit.place(new THREE.Mesh(geo, mat), Object.assign({ parent: G }, o)); };
  const B = (w, h, d, mat, x, y, z, o = {}) => kit.box(w, h, d, mat, Object.assign({ parent: G, x, y, z }, o));
  const slab = (x0, x1, z0, z1, h, mat, y = 0, o = {}) => kit.box(x1 - x0, h, z1 - z0, mat, Object.assign({ parent: G, x: (x0 + x1) / 2, z: (z0 + z1) / 2, y, cast: false }, o));
  // half disc (arch top) of radius r, thickness d along z, flat side down at y
  const halfDisc = (r, d, mat, o) => { const geo = new THREE.CylinderGeometry(r, r, d, low ? 10 : 18, 1, false, -Math.PI / 2, Math.PI); geo.rotateX(-Math.PI / 2); return mk(geo, mat, o); };
  const disc = (r, d, mat, o) => { const geo = new THREE.CylinderGeometry(r, r, d, low ? 16 : 32); geo.rotateX(Math.PI / 2); return mk(geo, mat, o); };
  const addBox = (x, z, w, d, rot) => colliders.push(rot ? { type: 'box', x, z, w, d, rot } : { type: 'box', x, z, w, d });
  const addCircle = (x, z, r) => colliders.push({ type: 'circle', x, z, r });

  /* ---------- people ---------- */
  const SH = ['#3B6EA5', '#F2F2F2', '#E07A2E', '#2FA84F', '#7C5CFF', '#D6336C', '#F2B705'], PA = ['#2B3442', '#3A3A3A', '#6B5B4A'], SK = ['#8D5A3B', '#A86B47', '#C68A62'];
  const bookM = M.std('#3E6FB0', { rough: .7, map: null }), bookM2 = M.std('#C8463A', { rough: .7, map: null }), bagM = M.std('#2E3440', { rough: .8, map: null });
  let pseed = 31;
  const student = (x, z, o = {}) => {
    const R = rng(pseed++);
    const p = kit.person({ seed: pseed * 13 + 5, x, z, y: o.y || 0, ry: o.ry || 0, pose: o.pose, shirt: o.shirt || R.pick(SH), pants: R.pick(PA), skin: R.pick(SK), parent: o.parent || G });
    if (o.book) kit.box(.2, .27, .05, R() < .5 ? bookM : bookM2, { parent: p, x: .08, y: 1.02, z: .16, rx: -.25 });
    if (o.bag) kit.rbox(.32, .4, .16, .04, bagM, { parent: p, y: 1.0, z: -.2 });
    if (o.lapbook) kit.box(.3, .03, .22, R() < .5 ? bookM : bookM2, { parent: p, y: .62, z: .32, rx: -.4 });
    return p;
  };

  /* ================================================================== ground */
  slab(-98, -50, -86, -42, .02, grass, .01);                                 // fresh lawn base for the whole plot
  // paved walks (top y = .12)
  slab(-94, -59, -75, -68, .12, paving);                                     // apron in front of the main block
  slab(-86, -83, -68, -46, .12, paving);                                     // west walk
  slab(-96, -86, -58, -46, .12, paving);                                     // data-lab plaza
  slab(-96, -63, -50, -46, .12, paving);                                     // south walk
  slab(-67, -63, -75, -46, .12, paving);                                     // east walk
  slab(-63, -52, -65, -58, .12, M.tiles);                                    // audience court
  slab(-63, -50, -58, -42, .12, paving);                                     // forecourt
  slab(-59, -52, -75, -65, .12, paving);                                     // side of the club house
  slab(-63, -52, -69, -65, .12, paving);                                     // around the stage
  // diagonal apron that meets the spoke road at the corner
  {
    const geo = new THREE.BufferGeometry(); const y = .125;
    geo.setAttribute('position', new THREE.Float32BufferAttribute([-50, y, -42, -50, y, -50, -58, y, -42], 3));
    geo.setAttribute('uv', new THREE.Float32BufferAttribute([0, 0, 0, 3, 3, 0], 2)); geo.computeVertexNormals();
    if (geo.attributes.normal.getY(0) < 0) geo.setIndex([0, 2, 1]);
    geo.computeVertexNormals();
    const m = new THREE.Mesh(geo, paving); m.receiveShadow = true; G.add(m);
  }
  // lawn: raised grass with a stone kerb, and a footpath cross
  const LX0 = -83, LX1 = -67, LZ0 = -68, LZ1 = -50, LC = -75, LT = .2;
  slab(LX0, LX1, LZ0, LZ1, LT, grass, 0, { cast: false });
  [[LX0, LX1, LZ0 - .1, LZ0 + .1], [LX0, LX1, LZ1 - .1, LZ1 + .1], [LX0 - .1, LX0 + .1, LZ0, LZ1], [LX1 - .1, LX1 + .1, LZ0, LZ1]].forEach(([a, b, c, d]) => slab(a, b, c, d, .26, kerbM));
  slab(LC - 1.5, LC + 1.5, LZ0, LZ1, LT + .02, paving);                       // N-S path
  slab(LX0, LX1, -60.25, -57.75, LT + .02, paving);                           // E-W path
  // round flower bed at the crossing
  kit.cyl(2.2, 2.3, .45, stone, { parent: G, x: LC, z: -59, y: 0, seg: low ? 16 : 32 });
  kit.cyl(2.0, 2.0, .06, M.std('#6B4A33', { map: null, rough: 1 }), { parent: G, x: LC, z: -59, y: .45, seg: low ? 16 : 32 });
  addCircle(LC, -59, 2.3);
  {
    const R = rng(4), cols = ['#F25C78', '#FFC23D', '#FFFFFF', '#FF8A3D'].map(c => M.std(c, { map: null, rough: .8 }));
    for (let k = 0; k < (low ? 6 : 16); k++) { const a = R() * 6.28, rr = .3 + R() * 1.4; kit.sphere(.2 + R() * .1, cols[k % 4], { parent: G, x: LC + Math.cos(a) * rr, z: -59 + Math.sin(a) * rr, y: .45, seg: 7, seg2: 5 }); }
    kit.sphere(.55, M.std('#5E9B3C', { map: null, rough: 1, flat: true }), { parent: G, x: LC, z: -59, y: .4, seg: 8, seg2: 6 });
  }
  // trees on the lawn corners, the south strip and the NE garden
  [[-80.8, -65.6, 1.35], [-69.2, -65.8, 1.25], [-80.8, -52.4, 1.2], [-69.2, -52.2, 1.3]].forEach(([x, z, s]) => { kit.tree(x, z, { s }); addCircle(x, z, .5); });
  for (let x = -93; x <= -66; x += 6.5) { kit.tree(x, -44.6, { s: 1.1 }); }
  [[-55.5, -78.5], [-55, -83.5], [-60.5, -83.3]].forEach(([x, z]) => { kit.tree(x, z, { s: 1.2 }); addCircle(x, z, .5); });
  [[-97, -84.5], [-94, -84.8]].forEach(([x, z]) => kit.tree(x, z, { s: 1, kind: 'cone' }));

  /* ================================================================== main academic block + clock tower */
  const MX = -75, MZ = -79.5, MW = 32, MD = 9;
  kit.building({ parent: G, x: MX, z: MZ, w: MW, d: MD, floors: 3, storey: 3.4, wall: brick, trim: '#F7F7F4', band: '#F7F7F4', door: null, bay: 3.2, winW: 1.5, winH: 1.9, seed: 5 });
  const topY = .3 + 3 * 3.4;
  B(MW + .7, .3, MD + .7, trim, MX, topY - .3, MZ);                                    // cornice under the parapet
  // white pilasters on the south face and the corners
  [-16, -9.6, 9.6, 16].forEach(dx => B(.5, topY - .3, .3, trim, MX + dx, .3, MZ + MD / 2 + .1));
  [-16, 16].forEach(dx => B(.3, topY - .3, .5, trim, MX + dx + Math.sign(dx) * .1, .3, MZ - MD / 2 + .2));
  // planting beds along the facade
  [[-90.5, -81], [-69, -61]].forEach(([a, b]) => { slab(a, b, -74.9, -73.6, .32, stone); for (let x = a + 1; x < b; x += 2.2) kit.bush(x, -74.2, { s: .55 }); });
  addBox(MX, MZ, MW + .6, MD + .6);
  // the tower
  const TX = MX, TZ = -74.5, TS = 6, TH = 15;
  B(TS + .5, .6, TS + .5, stone, TX, 0, TZ);
  kit.rbox(TS, TH, TS, .05, brick, { parent: G, x: TX, z: TZ, y: .6 });
  [3.7, 7.0, 10.6, 14.6].forEach(y => B(TS + .25, .3, TS + .25, trim, TX, y, TZ));
  [[-1, -1], [-1, 1], [1, -1], [1, 1]].forEach(([sx, sz]) => B(.55, TH, .55, trim, TX + sx * (TS / 2 - .2), .6, TZ + sz * (TS / 2 - .2)));
  const CS = 5.3, CY = TH + .6;                                                     // clock stage
  kit.rbox(CS, 4.4, CS, .05, brick, { parent: G, x: TX, z: TZ, y: CY });
  [[-1, -1], [-1, 1], [1, -1], [1, 1]].forEach(([sx, sz]) => B(.5, 4.4, .5, trim, TX + sx * (CS / 2 - .18), CY, TZ + sz * (CS / 2 - .18)));
  B(CS + .9, .45, CS + .9, trim, TX, CY + 4.4, TZ);
  B(CS + .5, .25, CS + .5, trim, TX, CY - .05, TZ);
  // lantern + pyramid roof
  const LY = CY + 4.85;
  B(4.2, .3, 4.2, trim, TX, LY, TZ);
  [[-1, -1], [-1, 1], [1, -1], [1, 1]].forEach(([sx, sz]) => B(.35, 2.1, .35, trim, TX + sx * 1.75, LY + .3, TZ + sz * 1.75));
  kit.box(2.6, 2.1, 2.6, M.std('#E9DDC8', { rough: .8 }), { parent: G, x: TX, z: TZ, y: LY + .3 });
  B(4.6, .3, 4.6, trim, TX, LY + 2.4, TZ);
  kit.cone(3.35, 3.2, terracotta, { parent: G, x: TX, z: TZ, y: LY + 2.7, seg: 4, ry: Math.PI / 4 });
  kit.cyl(.05, .05, 1.4, steel, { parent: G, x: TX, z: TZ, y: LY + 5.8, seg: 6 });
  kit.sphere(.16, accent, { parent: G, x: TX, z: TZ, y: LY + 5.7, seg: 10, seg2: 8 });
  // four faces: clock, arched windows; the south face also gets the entrance
  const clockFace = M.std('#FBFAF5', { rough: .4, map: null }), handM = M.std('#22262B', { rough: .5, map: null }), winDark = M.std('#3A4A57', { rough: .15, metal: .4, map: null });
  for (let f = 0; f < 4; f++) {
    const ry = [0, Math.PI / 2, Math.PI, -Math.PI / 2][f];
    const F = new THREE.Group(); F.position.set(TX, 0, TZ); F.rotation.y = ry; G.add(F);
    const zc = CS / 2, zt = TS / 2;
    disc(1.62, .1, handM, { parent: F, y: CY + 2.2, z: zc + .03 });
    disc(1.48, .12, clockFace, { parent: F, y: CY + 2.2, z: zc + .06 });
    if (!low) for (let i = 0; i < 12; i++) { const a = i / 12 * Math.PI * 2; kit.box(.07, i % 3 ? .16 : .3, .03, handM, { parent: F, x: Math.sin(a) * 1.22, y: CY + 2.2 + Math.cos(a) * 1.22 - .08, z: zc + .13, rz: -a }); }
    kit.box(.09, .95, .03, handM, { parent: F, x: 0, y: CY + 2.2, z: zc + .15, rz: -.52 });     // minute hand
    kit.box(.11, .65, .03, handM, { parent: F, x: 0, y: CY + 2.2, z: zc + .16, rz: -2.2 });     // hour hand
    // tall arched window (y 7.6..12.4)
    kit.box(1.5, 3.6, .1, winDark, { parent: F, y: 7.6, z: zt - .02 });
    halfDisc(.75, .1, winDark, { parent: F, y: 11.2, z: zt - .02 });
    kit.box(1.9, .16, .3, trim, { parent: F, y: 7.45, z: zt });
    [-1, 1].forEach(s => kit.box(.2, 3.6, .2, trim, { parent: F, x: s * .85, y: 7.6, z: zt }));
    halfDisc(.95, .16, trim, { parent: F, y: 11.2, z: zt - .04 });
    halfDisc(.75, .2, winDark, { parent: F, y: 11.2, z: zt - .02 });
    kit.box(.06, 3.6, .14, trim, { parent: F, y: 7.6, z: zt + .02 });
    if (f !== 0) { kit.box(1.4, 2.2, .1, winDark, { parent: F, y: 1.6, z: zt - .02 }); kit.box(1.8, .14, .3, trim, { parent: F, y: 1.5, z: zt }); halfDisc(.7, .2, winDark, { parent: F, y: 3.8, z: zt - .02 }); halfDisc(.88, .14, trim, { parent: F, y: 3.8, z: zt - .05 }); }
  }
  // grand arched entrance on the south face
  {
    const ez = TZ + TS / 2;
    B(4.2, 4.2, .35, stone, TX, .6, ez + .02);
    halfDisc(2.1, .35, stone, { x: TX, y: 4.8, z: ez + .02 });
    B(2.6, 3.4, .1, darkWood, TX, .6, ez + .2);
    halfDisc(1.3, .12, winDark, { x: TX, y: 4.0, z: ez + .2 });
    B(.06, 3.4, .14, M.std('#C9A24A', { rough: .3, metal: .7, map: null }), TX, .6, ez + .26);
    [-1, 1].forEach(s => { kit.cyl(.26, .3, 4.2, trim, { parent: G, x: TX + s * 2.45, z: ez + .45, y: .6, seg: 14 }); B(.75, .3, .75, trim, TX + s * 2.45, 4.8, ez + .45); });
    // name plaque above the arch
    const r = A.signRegion([{ text: 'ACADEMIC BLOCK', size: .34, weight: 800 }, { text: 'Delhi Technological University', size: .2, weight: 600, color: '#8A5A3C' }], 4.2, .95, { bg: '#FBF7EF', accent: '#E07A2E', accentH: .05, ppm: 150 });
    B(4.5, 1.15, .12, trim, TX, 7.4 - 1.3, ez + .05);
    A.quad(r, 4.2, .95, { parent: G, x: TX, y: 6.2, z: ez + .12 });
  }
  // broad steps
  [[11, 3.2, 0], [9.6, 2.3, .2], [8.2, 1.4, .4]].forEach(([w, d, y]) => B(w, .2, d, stone, TX, y, TZ + TS / 2 + .2 + d / 2));
  [-1, 1].forEach(s => { B(.7, .9, 3.2, stone, TX + s * 5.85, 0, TZ + TS / 2 + 1.8); kit.cyl(.35, .25, .55, M.std('#D9CBB2', { rough: .7 }), { parent: G, x: TX + s * 5.85, z: TZ + TS / 2 + 2.6, y: .9, seg: 12 }); kit.sphere(.36, M.std('#5E9B3C', { map: null, rough: 1, flat: true }), { parent: G, x: TX + s * 5.85, z: TZ + TS / 2 + 2.6, y: 1.35, seg: 8, seg2: 6 }); });
  addBox(TX, TZ, TS + .6, TS + .6);
  addBox(TX - 5.85, TZ + TS / 2 + 1.8, .9, 3.3); addBox(TX + 5.85, TZ + TS / 2 + 1.8, .9, 3.3);

  /* ================================================================== library + data lab (west) */
  const DX = -91;                                                                     // x -96..-86
  kit.building({ parent: G, x: DX, z: -70.5, w: 10, d: 9, floors: 2, storey: 3.7, wall: brick, trim: '#F7F7F4', band: '#F7F7F4', door: null, sides: 'ew', roofUnits: false });
  addBox(DX, -66.5, 10.6, 17.6);
  // glass reading room: x -96..-86, z -66..-58, double height
  const GZ0 = -66, GZ1 = -58, GH = 7.4;
  B(10, .3, 8, M.tiles, DX, 0, -62);
  B(.45, GH + .3, 8, brick, -95.78, .0, -62);                                         // west wall
  B(10.5, .5, 8.5, trim, DX, GH + .3, -62.1);                                         // roof slab
  B(10.5, .25, .2, accent, DX, GH + .3, GZ1 + .16);                                    // thin accent line on the fascia
  B(10, .35, 8, M.std('#BFBAB2', { rough: 1 }), DX, GH + .8, -62);
  // glass + mullions (south and east)
  kit.box(9.6, GH, .04, glassT, { parent: G, x: DX + .2, y: .3, z: GZ1 - .06, cast: false });
  kit.box(.04, GH, 7.8, glassT, { parent: G, x: -86.06, y: .3, z: -62.1, cast: false });
  for (let i = 0; i <= 4; i++) B(.16, GH, .22, trim, -95.6 + i * 2.4, .3, GZ1);
  for (let i = 0; i <= 4; i++) B(.22, GH, .16, trim, -86, .3, GZ1 - i * 2);
  B(10, .16, .22, trim, DX, 3.85, GZ1); B(.22, .16, 8, trim, -86, 3.85, -62);
  B(10, .2, .3, trim, DX, .3, GZ1); B(.3, .2, 8, trim, -86, .3, -62);
  // lab sign on the roof edge
  {
    const r = A.signRegion([{ text: 'LIBRARY & DATA LAB', size: .44, weight: 800 }], 6.2, .8, { bg: '#FFFFFF', accent: '#E07A2E', accentH: .06, ppm: 130 });
    B(6.4, .95, .14, trim, DX, GH + .85, GZ1 - .15);
    A.quad(r, 6.2, .8, { parent: G, x: DX, y: GH + .92, z: GZ1 - .07 });
  }
  // the chalkboard of charts on the library's south wall, facing the glass
  {
    const r = A.region(6, 2.6, (g, W, H, k) => {
      g.fillStyle = '#25443A'; g.fillRect(0, 0, W, H);
      const R = rng(21); for (let i = 0; i < 260; i++) { g.fillStyle = `rgba(255,255,255,${R() * .05})`; g.fillRect(R() * W, R() * H, 3 + R() * 30, 2 + R() * 6); }
      g.strokeStyle = 'rgba(245,245,235,.92)'; g.fillStyle = 'rgba(245,245,235,.92)'; g.lineWidth = .025 * k; g.lineCap = 'round';
      const axes = (x, y, w, h) => { g.beginPath(); g.moveTo(x, y); g.lineTo(x, y + h); g.lineTo(x + w, y + h); g.stroke(); };
      // 1. supply and demand
      let x = .3 * k, y = .45 * k, w = 1.5 * k, h = 1.5 * k;
      axes(x, y, w, h);
      g.strokeStyle = '#FFD27A'; g.beginPath(); g.moveTo(x + .1 * w, y + .1 * h); g.lineTo(x + .9 * w, y + .9 * h); g.stroke();
      g.strokeStyle = '#9FE2FF'; g.beginPath(); g.moveTo(x + .1 * w, y + .9 * h); g.lineTo(x + .9 * w, y + .1 * h); g.stroke();
      g.strokeStyle = 'rgba(245,245,235,.6)'; g.setLineDash([.06 * k, .05 * k]); g.beginPath(); g.moveTo(x, y + .5 * h); g.lineTo(x + .5 * w, y + .5 * h); g.lineTo(x + .5 * w, y + h); g.stroke(); g.setLineDash([]);
      g.font = `600 ${.17 * k}px ${FONT}`; g.fillStyle = 'rgba(245,245,235,.9)'; g.fillText('P', x - .2 * k, y + .1 * k); g.fillText('Q', x + w - .05 * k, y + h + .2 * k);
      g.fillStyle = '#FFD27A'; g.fillText('D', x + .92 * w, y + .9 * h); g.fillStyle = '#9FE2FF'; g.fillText('S', x + .92 * w, y + .12 * h);
      // 2. regression scatter
      g.strokeStyle = 'rgba(245,245,235,.92)'; x = 2.25 * k; axes(x, y, w, h);
      for (let i = 0; i < 18; i++) { const px = .08 + R() * .84, py = .85 - px * .7 + (R() - .5) * .25; g.beginPath(); g.arc(x + px * w, y + py * h, .03 * k, 0, 6.28); g.fill(); }
      g.strokeStyle = '#FF9F6B'; g.beginPath(); g.moveTo(x + .05 * w, y + .84 * h); g.lineTo(x + .95 * w, y + .2 * h); g.stroke();
      // 3. bell curve
      g.strokeStyle = 'rgba(245,245,235,.92)'; x = 4.2 * k; axes(x, y, w, h);
      g.strokeStyle = '#B9F59A'; g.beginPath(); for (let i = 0; i <= 40; i++) { const u = i / 40, v = Math.exp(-((u - .5) ** 2) / .02); i ? g.lineTo(x + u * w, y + h - v * .85 * h) : g.moveTo(x + u * w, y + h - v * .85 * h); } g.stroke();
      g.strokeStyle = 'rgba(245,245,235,.6)'; g.setLineDash([.05 * k, .05 * k]); g.beginPath(); g.moveTo(x + .5 * w, y + .12 * h); g.lineTo(x + .5 * w, y + h); g.stroke(); g.setLineDash([]);
      // formula + headings
      g.fillStyle = 'rgba(245,245,235,.95)'; g.textAlign = 'left'; g.textBaseline = 'middle';
      g.font = `600 ${.2 * k}px ${FONT}`; g.fillText('Demand & supply', .3 * k, .24 * k); g.fillText('OLS fit', 2.25 * k, .24 * k); g.fillText('Normal dist.', 4.2 * k, .24 * k);
      g.font = `italic 600 ${.22 * k}px Georgia, serif`; g.fillText('y = β₀ + β₁x + ε', 2.1 * k, 2.35 * k);
      g.font = `600 ${.17 * k}px ${FONT}`; g.fillText('Who gains? Who pays?', .35 * k, 2.35 * k);
      g.fillText('μ = 0, σ = 1', 4.5 * k, 2.35 * k);
    }, 120);
    const bz = GZ0 + .02;
    B(6.4, 3.0, .08, darkWood, DX + .3, 1.2, bz);
    A.quad(r, 6, 2.6, { parent: G, x: DX + .3, y: 1.4, z: bz + .09 });
    B(6.4, .06, .14, darkWood, DX + .3, 1.32, bz + .1);
    // bookshelves above the board (mezzanine wall) and on the west wall
    const shelf = A.region(3.2, 1, (g, W, H, k) => {
      g.fillStyle = '#6E4A32'; g.fillRect(0, 0, W, H); const R = rng(8), cols = ['#C8463A', '#3E6FB0', '#E0B04A', '#2F8F5B', '#E9E2D0', '#7C5CFF', '#8C5A3C', '#D97C4A'];
      for (let row = 0; row < 3; row++) { const y0 = row * H / 3 + .05 * k, y1 = (row + 1) * H / 3 - .03 * k; let x = .04 * k; while (x < W - .1 * k) { const bw = (.035 + R() * .05) * k, bh = (y1 - y0) * (.72 + R() * .26); g.fillStyle = cols[Math.floor(R() * cols.length)]; g.fillRect(x, y1 - bh, bw, bh); x += bw + 2; } g.fillStyle = '#4E3322'; g.fillRect(0, y1, W, .03 * k); }
    }, 120);
    [-2.9, .3, 3.5].forEach(dx => A.quad(shelf, 3.2, 2.2, { parent: G, x: DX + dx, y: 4.6, z: bz + .1 }));
    B(9.8, .15, .5, darkWood, DX, 4.45, bz + .25);
    A.quad(shelf, 3.2, 2.4, { parent: G, x: -95.5, y: .9, z: -60, ry: Math.PI / 2 });
    A.quad(shelf, 3.2, 2.4, { parent: G, x: -95.5, y: .9, z: -63.3, ry: Math.PI / 2 });
    // desks with monitors
    for (const z of [-62.6, -60.2]) for (const x of [-93.3, -89]) {
      B(3.2, .05, .8, M.std('#E9E4DA', { rough: .5 }), x, .3 + .74, z);
      [-1.45, 1.45].forEach(dx => B(.06, .74, .7, steel, x + dx, .3, z));
      if (!low) [-.8, .8].forEach(dx => { B(.55, .36, .04, dark, x + dx, .3 + .95, z - .25); B(.5, .31, .01, screenM, x + dx, .3 + .975, z - .225); B(.1, .16, .08, dark, x + dx, 1.08, z - .25); });
    }
    // ceiling lights
    for (const z of [-63.5, -60.5]) for (const x of [-93.5, -88.5]) B(1.6, .05, .5, lightM, x, GH + .24, z, { cast: false });
    // people: a student explaining at the board, three at the desks facing it
    student(-88.2, -64.9, { ry: Math.PI * .9, shirt: '#F2F2F2' });
    if (!low) {
      student(-93.9, -61.8, { pose: 'sit', y: .3, ry: Math.PI });
      student(-89.6, -61.8, { pose: 'sit', y: .3, ry: Math.PI });
      student(-88.4, -59.4, { pose: 'sit', y: .3, ry: Math.PI, shirt: '#E07A2E' });
      [[-93.9, -61.6], [-89.6, -61.6], [-88.4, -59.2]].forEach(([x, z]) => B(.42, .45, .42, chairM2, x, .3, z + .05));
    }
  }
  // plaza in front of the lab: benches, bike stand, planters
  kit.bench(-94.2, -51.8, { ry: Math.PI / 2 }); kit.bench(-87.6, -51.8, { ry: -Math.PI / 2 });
  slab(-95.5, -93.5, -57.4, -55.4, .5, stone); kit.bush(-94.5, -56.4, { s: .6 });
  if (!low) {
    // bicycles at a stand along the south walk
    const tyre = M.rubber, frame = M.std('#2F5D8A', { rough: .4, map: null }), frame2 = M.std('#C8463A', { rough: .4, map: null });
    for (let i = 0; i < 4; i++) {
      const bx = -79.6 + i * .9, bz = -47.3, fm = i % 2 ? frame2 : frame;
      for (const dz of [-.52, .52]) { const t = new THREE.Mesh(new THREE.TorusGeometry(.33, .03, 5, 16), tyre); t.rotation.y = Math.PI / 2; kit.place(t, { parent: G, x: bx, y: .45, z: bz + dz }); }
      kit.box(.04, .04, 1.0, fm, { parent: G, x: bx, y: .72, z: bz });
      kit.box(.04, .5, .04, fm, { parent: G, x: bx, y: .45, z: bz - .1, rx: .3 });
      kit.box(.12, .04, .22, dark, { parent: G, x: bx, y: .95, z: bz - .18 });
      kit.box(.5, .03, .03, dark, { parent: G, x: bx, y: 1.0, z: bz + .45 });
    }
    B(3.8, .06, .06, steel, -78.25, .55, -47.85);
    addBox(-78.3, -47.3, 3.9, 1.3);
  }
  spots.push({ id: 'econ', x: DX, z: -54.2, y: 4.2 });

  /* ================================================================== Rotaract club house + stage (east) */
  const CX = -58, CZ = -71.5;                                                         // club house x -63..-53, z -74..-69
  kit.building({ parent: G, x: CX, z: CZ, w: 10, d: 5, floors: 1, storey: 4, wall: '#F7C948', trim: '#F7F7F4', door: null, sides: 'nwe', bay: 2.8, winH: 1.6, roofUnits: false, seed: 9 });
  B(10.6, .3, 5.6, trim, CX, 4.25, CZ);
  // side door on the east face
  B(.1, 2.3, 1.1, darkWood, -52.96, .3, -71.3); B(.3, .12, 1.6, trim, -52.9, 2.6, -71.3); B(1, .3, 1.6, M.concrete, -52.6, 0, -71.3);
  // banner across the front facade
  {
    const r = A.region(9.2, 1.3, (g, W, H, k) => {
      g.fillStyle = '#FFF8EE'; g.fillRect(0, 0, W, H);
      g.fillStyle = '#E07A2E'; g.fillRect(0, 0, W, .12 * k); g.fillRect(0, H - .12 * k, W, .12 * k);
      g.beginPath(); g.arc(.75 * k, H / 2, .38 * k, 0, 6.28); g.fill();
      g.fillStyle = '#FFF8EE'; g.font = `800 ${.36 * k}px ${FONT}`; g.textAlign = 'center'; g.textBaseline = 'middle'; g.fillText('R', .75 * k, H / 2 + .02 * k);
      A.text([{ text: 'Rotaract Club of USME', size: .52, weight: 800, color: '#2A2F36' }], W, H, k, { x0: 1.2 * k, pad: .2 });
    }, 110);
    [-1, 1].forEach(s => B(.06, .06, .3, steel, CX + s * 4.4, 4.0, CZ + 2.6));
    A.quad(r, 9.2, 1.3, { parent: G, x: CX, y: 2.75, z: CZ + 2.56 });
  }
  addBox(CX, CZ, 10.6, 5.6);
  // little open-air stage in front, with a light truss and bunting
  const SZ = -67.6;                                                                    // stage z -69..-66.2
  B(7, .6, 2.8, M.std('#8A5A3C', { rough: .7 }), CX, 0, SZ);
  B(7.1, .06, 2.9, M.std('#5A3B28', { rough: .6 }), CX, .6, SZ);
  B(1.6, .3, .6, stone, CX, 0, SZ + 1.7);
  [[-3.4, -1.3], [3.4, -1.3], [-3.4, 1.3], [3.4, 1.3]].forEach(([dx, dz]) => kit.cyl(.06, .06, 3.6, steel, { parent: G, x: CX + dx, z: SZ + dz, y: .6, seg: 8 }));
  [-1.3, 1.3].forEach(dz => B(6.9, .12, .12, steel, CX, 4.15, SZ + dz));
  [-3.4, 3.4].forEach(dx => B(.12, .12, 2.7, steel, CX + dx, 4.15, SZ));
  if (!low) {
    const bunt = ['#E07A2E', '#FFFFFF', '#F2B705'].map(c => new THREE.MeshStandardMaterial({ color: c, roughness: .8, side: THREE.DoubleSide }));
    const tri = new THREE.BufferGeometry(); tri.setAttribute('position', new THREE.Float32BufferAttribute([-.17, 0, 0, .17, 0, 0, 0, -.36, 0], 3)); tri.computeVertexNormals();
    for (let i = 0; i < 16; i++) { const t = new THREE.Mesh(tri.clone(), bunt[i % 3]); kit.place(t, { parent: G, x: CX - 3.2 + i * .43, y: 4.08 - Math.sin(i / 15 * Math.PI) * .25, z: SZ + 1.3 }); }
  }
  // speaker cabinets, mic, a member speaking
  [-1, 1].forEach(s => { kit.rbox(.55, .9, .5, .04, dark, { parent: G, x: CX + s * 3, y: .66, z: SZ + .8 }); });
  kit.cyl(.02, .02, 1.45, steel, { parent: G, x: CX + .4, z: SZ + .6, y: .66, seg: 6 }); kit.sphere(.05, dark, { parent: G, x: CX + .4, z: SZ + .6, y: 2.08, seg: 8, seg2: 6 });
  student(CX - .1, SZ + .2, { y: .66, shirt: '#F2F2F2' });
  student(CX - 2, SZ - .4, { y: .66, shirt: '#E07A2E' });
  addBox(CX, SZ, 7.2, 3.0);
  // audience chairs (two rows) facing the stage
  {
    const rows = low ? [-64.6] : [-64.8, -63.2];
    rows.forEach((z, ri) => { for (let i = 0; i < 5; i++) {
      const x = CX - 2.8 + i * 1.4, cm = (i + ri) % 2 ? chairM : chairM2;
      B(.48, .05, .46, cm, x, .45, z); B(.48, .42, .05, cm, x, .5, z + .22);
      if (!low) [[-.2, -.18], [.2, -.18], [-.2, .2], [.2, .2]].forEach(([a, b]) => B(.03, .45, .03, steel, x + a, .12, z + b));
      if ((i + ri * 2) % 3 !== 1 && !(low && i % 2)) student(x, z + .02, { pose: 'sit', y: .1, ry: Math.PI });
    } });
    addBox(CX, -64.1, 7.4, rows.length > 1 ? 2.6 : 1.4);
  }
  // notice board
  {
    const NX = -61.9, NZ = -61.2;
    const r = A.region(2.2, 1.3, (g, W, H, k) => {
      g.fillStyle = '#C99A68'; g.fillRect(0, 0, W, H);
      const R = rng(12); for (let i = 0; i < 300; i++) { g.fillStyle = `rgba(90,60,30,${R() * .25})`; g.fillRect(R() * W, R() * H, 2, 2); }
      g.fillStyle = '#2A2F36'; g.font = `800 ${.13 * k}px ${FONT}`; g.textAlign = 'center'; g.textBaseline = 'middle'; g.fillText('NOTICE BOARD', W / 2, .12 * k);
      const notes = [['#FFFFFF', 'Club Day', 'Sat, 10 am'], ['#FFE58A', 'Blood drive', 'Volunteers!'], ['#BFE6FF', 'Members', 'meet Fri 4 pm'], ['#FFD0C2', 'Tree plant', 'Sunday'], ['#D9F2C4', 'Teach a kid', 'sign up']];
      notes.forEach(([c, a, b], i) => {
        const x = (.12 + (i % 3) * .7) * k, y = (.3 + Math.floor(i / 3) * .5) * k + (i % 2) * .04 * k, w = .58 * k, h = .42 * k;
        g.save(); g.translate(x + w / 2, y + h / 2); g.rotate((R() - .5) * .12); g.fillStyle = c; g.fillRect(-w / 2, -h / 2, w, h);
        g.fillStyle = '#2A2F36'; g.font = `700 ${.09 * k}px ${FONT}`; g.fillText(a, 0, -.06 * k); g.font = `500 ${.07 * k}px ${FONT}`; g.fillText(b, 0, .08 * k);
        g.fillStyle = '#D6336C'; g.beginPath(); g.arc(0, -h / 2 + .04 * k, .02 * k, 0, 6.28); g.fill(); g.restore();
      });
    }, 150);
    B(2.4, 1.5, .1, darkWood, NX, .95, NZ);
    A.quad(r, 2.2, 1.3, { parent: G, x: NX, y: 1.05, z: NZ + .06 });
    [-1.05, 1.05].forEach(dx => B(.1, 2.5, .1, darkWood, NX + dx, 0, NZ - .02));
    B(2.6, .12, .4, darkWood, NX, 2.45, NZ + .05);
    addBox(NX, NZ, 2.6, .5);
    if (!low) { student(NX - .5, NZ + 1.0, { ry: Math.PI, book: true, bag: true }); student(NX + .55, NZ + 1.05, { ry: Math.PI * .92 }); }
  }
  spots.push({ id: 'rotaract', x: CX, z: -60.2, y: 4.8 });

  /* ================================================================== gateway arch at the SE corner */
  {
    const ry = Math.atan2(.766, .643);                         // faces the arriving road (SE)
    const gx = -56.1, gz = -47.7, half = 4.1;
    const Gt = new THREE.Group(); Gt.position.set(gx, 0, gz); Gt.rotation.y = ry; G.add(Gt);
    [-1, 1].forEach(s => {
      kit.box(1.5, .5, 1.5, stone, { parent: Gt, x: s * half });
      kit.rbox(1.3, 6.2, 1.3, .04, brick, { parent: Gt, x: s * half, y: .5 });
      kit.box(1.55, .25, 1.55, trim, { parent: Gt, x: s * half, y: 3.1 });
      kit.box(1.7, .35, 1.7, trim, { parent: Gt, x: s * half, y: 6.7 });
      kit.cone(.7, .7, terracotta, { parent: Gt, x: s * half, y: 7.05, seg: 4, ry: Math.PI / 4 });
      kit.sphere(.12, accent, { parent: Gt, x: s * half, y: 7.72, seg: 8, seg2: 6 });
    });
    kit.box(2 * half + 1.3, 1.25, .8, brick, { parent: Gt, y: 5.2 });
    kit.box(2 * half + 1.5, .16, 1.0, trim, { parent: Gt, y: 6.45 });
    kit.box(2 * half + 1.5, .16, 1.0, trim, { parent: Gt, y: 5.05 });
    const r = A.signRegion([{ text: 'DELHI TECHNOLOGICAL UNIVERSITY', size: .42, weight: 800 }], 7.2, .9, { bg: '#FFFFFF', accent: '#E07A2E', accentH: .06, ppm: 135 });
    [1, -1].forEach(s => { kit.box(7.4, 1.0, .06, trim, { parent: Gt, y: 5.32, z: s * .43 }); A.quad(r, 7.2, .9, { parent: Gt, y: 5.37, z: s * .47, ry: s > 0 ? 0 : Math.PI }); });
    const c = Math.cos(ry), sn = Math.sin(ry);
    [-1, 1].forEach(s => addCircle(gx + s * half * c, gz - s * half * sn, 1.0));
    // low brick boundary walls along the south and east edges, with white coping and piers
    const wallRun = (x0, z0, x1, z1) => {
      const L = Math.hypot(x1 - x0, z1 - z0), ang = Math.atan2(x1 - x0, z1 - z0) - Math.PI / 2, mx = (x0 + x1) / 2, mz = (z0 + z1) / 2;
      B(L, .95, .35, brick, mx, 0, mz, { ry: ang }); B(L, .1, .5, trim, mx, .95, mz, { ry: ang });
      const n = Math.max(1, Math.round(L / 4.5));
      for (let i = 0; i <= n; i++) { const x = x0 + (x1 - x0) * i / n, z = z0 + (z1 - z0) * i / n; B(.6, 1.3, .6, brick, x, 0, z); B(.72, .12, .72, trim, x, 1.3, z); }
      addBox(mx, mz, Math.abs(x1 - x0) + .5, Math.abs(z1 - z0) + .5);
    };
    const pAx = gx + half * c, pAz = gz - half * sn, pBx = gx - half * c, pBz = gz + half * sn;
    wallRun(-96.5, -44.4, pBx - .8, -44.4);
    wallRun(-52.4, pAz - .8, -52.4, -84.5);
    void pAx; void pBz;
    // a small guard booth just inside the gate
    if (!low) {
      kit.rbox(2, 2.6, 2, .06, M.std('#F7F7F4', { rough: .7 }), { parent: G, x: -54.2, z: -55.2 });
      B(1.6, 1, .05, M.glass, -54.2, 1.2, -54.18); B(2.4, .2, 2.4, accent, -54.2, 2.6, -55.2);
      addBox(-54.2, -55.2, 2.1, 2.1);
    }
  }
  // wayfinding post in the forecourt
  {
    const px = -60.4, pz = -51.2;
    kit.cyl(.07, .07, 3.2, M.std('#3E434A', { rough: .4, metal: .5, map: null }), { parent: G, x: px, z: pz, seg: 8 });
    const items = [['←  Academic Block', '#FFFFFF'], ['←  Library & Data Lab', '#FFFFFF'], ['Rotaract Club  ↑', '#E07A2E']];
    items.forEach(([t, bg], i) => {
      const r = A.signRegion([{ text: t, size: .17, weight: 700, color: bg === '#FFFFFF' ? '#1F2328' : '#FFFFFF' }], 1.7, .32, { bg, ppm: 160, align: 'left' });
      A.quad(r, 1.7, .32, { parent: G, x: px - .1, y: 2.6 - i * .42, z: pz + .08 });
      A.quad(r, 1.7, .32, { parent: G, x: px - .1, y: 2.6 - i * .42, z: pz - .08, ry: Math.PI });
      B(1.75, .34, .1, trim, px - .1, 2.59 - i * .42, pz);
    });
    addCircle(px, pz, .3);
  }

  /* ================================================================== street furniture */
  [[-84.5, -66], [-84.5, -56], [-65, -66], [-65, -56], [-90, -47], [-72, -47], [-61.8, -53], [-56, -57.5]].forEach(([x, z]) => kit.lamp(x, z, { ry: x < -75 ? Math.PI / 2 : -Math.PI / 2 }));
  [[-81, -47.4, 0], [-70, -47.4, 0], [-65.5, -62, -Math.PI / 2], [-84.6, -62, Math.PI / 2]].forEach(([x, z, ry]) => kit.bench(x, z, { ry }));
  // bins
  if (!low) [[-83.7, -49.2], [-63.8, -49.6]].forEach(([x, z]) => kit.cyl(.25, .22, .85, M.std('#3E7A4A', { rough: .6 }), { parent: G, x, z, y: .12, seg: 10 }));

  /* ================================================================== students on the lawn and walks */
  const L = LT - .36;                                                              // seated on the grass
  student(-80.2, -63.9, { pose: 'sit', y: L, ry: .5, lapbook: true });
  student(-78.9, -63.2, { pose: 'sit', y: L, ry: -2.2, bag: true });
  student(-71.3, -55.8, { pose: 'sit', y: L, ry: 2.6 });
  student(-72.6, -54.9, { pose: 'sit', y: L, ry: -.9, lapbook: true });
  student(-70.4, -54.4, { pose: 'sit', y: L, ry: 2.0 });
  if (!low) {
    student(-80.4, -53.6, { pose: 'sit', y: L, ry: Math.PI * .85, lapbook: true });
    student(-70.6, -64.6, { pose: 'sit', y: L, ry: -.4 });
    student(-69.7, -63.7, { pose: 'sit', y: L, ry: 2.8, lapbook: true });
    kit.box(.4, .03, .3, bookM, { parent: G, x: -71.4, y: LT + .01, z: -55.1, ry: .4 });
    kit.box(.36, .25, .5, bagM, { parent: G, x: -79.6, y: LT, z: -62.6, ry: .2 });
  }
  // standing and walking (static) with books
  student(-73.2, -66.6, { ry: Math.PI * .1, book: true, bag: true });
  student(-72.5, -66.2, { ry: -Math.PI * .7, book: true });
  student(-88.6, -48.1, { ry: Math.PI / 2, book: true, bag: true });
  student(-65.2, -52.2, { ry: Math.PI, book: true });
  if (!low) {
    student(-56.4, -50.5, { ry: -2.4, bag: true });
    student(-77.6, -71.2, { ry: .2, book: true });
    student(-84.4, -59.8, { ry: Math.PI, book: true, bag: true });
    student(-92.2, -53, { pose: 'sit', y: .12, ry: Math.PI / 2 });
  }
  spots.push({ id: 'main', x: TX, z: -66.4, y: 5 });

  /* ---------- animated walkers (high only): baked into one small group each ---------- */
  const walkers = [];
  if (!low) {
    const paths = [
      { ax: -74.3, az: -66.8, bx: -74.3, bz: -50.8, y: LT, speed: 1.15, ph: 0 },
      { ax: -94, az: -48.2, bx: -66, bz: -48.2, y: .12, speed: 1.3, ph: .4 },
    ];
    for (const p of paths) {
      const W = new THREE.Group();
      student(0, 0, { parent: W, book: true, bag: true });
      kit.bake(W); W.userData.dynamic = true; root.add(W);
      const L2 = Math.hypot(p.bx - p.ax, p.bz - p.az);
      walkers.push(Object.assign(p, { W, L: L2, ang: Math.atan2(p.bx - p.ax, p.bz - p.az) }));
    }
  }

  kit.bake(G);

  return {
    group: root, colliders, spots,
    update(dt, t) {
      for (const w of walkers) {
        const T = (t * w.speed / w.L + w.ph) % 2, f = T < 1 ? T : 2 - T, s = f * f * (3 - 2 * f) * .15 + f * .85;
        w.W.position.set(w.ax + (w.bx - w.ax) * s, w.y + Math.abs(Math.sin(t * 7.5)) * .03, w.az + (w.bz - w.az) * s);
        w.W.rotation.y = T < 1 ? w.ang : w.ang + Math.PI;
      }
    },
  };
}
