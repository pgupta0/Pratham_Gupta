/* lss.js: Six Sigma Workshop (Lean Six Sigma Green Belt, certified 2026).
   Plot (-72, 74), 44 x 40 (x -94..-50, z 54..94). The spoke road arrives at the NE corner (-50, 54).
   Layout (default camera looks north, so the show faces look south):
   - north: bright light-industrial workshop with a north-light sawtooth roof, main door on the east face (spot main)
   - its south face: big roller door rolled up, green belt banner
   - yard: a DMAIC conveyor line out of the roller door, 5 stations, boxes moving, hi-vis crew      (spot dmaic)
   - south: certificate wall with three framed certificates and a reading bench                      (spot certs)
   - drive + loading on the east, racking + forklift in the south-west.
   Local helpers: text atlas (one texture, one draw call for all signs), sawtooth roof prism, forklift, racking. */

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
    if (cy + ph > SH) console.warn('[lss] atlas full');
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
  const signRegion = (lines, wm, hm, { bg = '#FFFFFF', fg, accent, accentH = .07, ppm, weight, size, align, pad } = {}) => region(wm, hm, (g2, W, H, k) => {
    g2.fillStyle = bg; g2.fillRect(0, 0, W, H);
    if (accent) { g2.fillStyle = accent; g2.fillRect(0, H - accentH * k, W, accentH * k); }
    text(lines, W, H - (accent ? accentH * k : 0), k, { fg, weight, size, align, pad });
  }, ppm);
  return { mat, tex, g, region, quad, text, signRegion };
}

export async function build(ctx) {
  const { THREE, kit, M, quality, rng } = ctx;
  const low = quality === 'low';
  const root = new THREE.Group();
  const G = new THREE.Group(); root.add(G);
  const A = makeAtlas(THREE, kit);
  const colliders = [], spots = [];

  /* ---------- materials: bright, saturated, plastic ---------- */
  const GREEN = '#2FA84F';
  const clad = M.std('#F4F6F5', { rough: .55 });
  const greenM = M.std(GREEN, { rough: .5 });
  const roofM = M.std('#C7D0D8', { rough: .5, map: 'roof' });
  const trim = M.std('#F7F7F4', { rough: .6 });
  const steel = M.metal;
  const dark = M.dark;
  const yellow = M.std('#F2B705', { rough: .5, map: null });
  const orange = M.std('#FF7A1A', { rough: .5, map: null });
  const blue = M.std('#1F7BD8', { rough: .5, map: null });
  const red = M.std('#E0392B', { rough: .5, map: null });
  const cardM = M.std('#D2A066', { rough: .8, map: null });
  const wrapM = M.std('#7FD39A', { rough: .3, map: null });
  const wood = M.wood;
  const interior = M.std('#5D6670', { rough: .8, map: null });
  const floorM = M.std('#DADDDF', { map: 'concrete', rough: .9 });
  const lightM = M.emit('#FFF6DF', 1);
  const reflM = M.std('#D8DCE0', { rough: .2, metal: .6, map: null });
  const pvM = M.std('#24427A', { rough: .2, metal: .3, map: null });

  const mk = (geo, mat, o = {}) => { if (mat.map) kit.worldUV(geo, mat.userData.metres || 1); return kit.place(new THREE.Mesh(geo, mat), Object.assign({ parent: G }, o)); };
  const B = (w, h, d, mat, x, y, z, o = {}) => kit.box(w, h, d, mat, Object.assign({ parent: G, x, y, z }, o));
  const slab = (x0, x1, z0, z1, h, mat, y = 0, o = {}) => kit.box(x1 - x0, h, z1 - z0, mat, Object.assign({ parent: G, x: (x0 + x1) / 2, z: (z0 + z1) / 2, y, cast: false }, o));
  const paintR = (x0, x1, z0, z1, col, y = .1) => kit.paint((x0 + x1) / 2, (z0 + z1) / 2, x1 - x0, z1 - z0, col, { parent: G, y });
  const addBox = (x, z, w, d) => colliders.push({ type: 'box', x, z, w, d });
  const addCircle = (x, z, r) => colliders.push({ type: 'circle', x, z, r });

  /* ---------- people in hi-vis ---------- */
  const SK = ['#8D5A3B', '#A86B47', '#C68A62', '#6E4530'];
  const hatGeo = new THREE.SphereGeometry(.15, low ? 8 : 12, 5, 0, Math.PI * 2, 0, Math.PI / 2);
  let pseed = 7;
  const worker = (x, z, o = {}) => {
    const R = rng(pseed++);
    const p = kit.person({ seed: pseed * 17 + 3, x, z, y: o.y || 0, ry: o.ry || 0, pose: o.pose, h: 1.75, shirt: o.shirt || '#DDF23A', pants: o.pants || '#2B3442', skin: R.pick(SK), parent: o.parent || G });
    const hy = o.pose === 'sit' ? .45 : .82;
    if (!o.noVest) [hy + .17, hy + .38].forEach(y => kit.box(.45, .05, .27, reflM, { parent: p, y }));
    if (o.hat !== false) { const h = new THREE.Mesh(hatGeo, o.hatM || (R() < .5 ? yellow : trim)); kit.place(h, { parent: p, y: hy + .79 }); kit.cyl(.18, .18, .02, h.material, { parent: p, y: hy + .78, z: .03, seg: 12 }); }
    if (o.clip) kit.box(.22, .3, .03, trim, { parent: p, x: .1, y: 1.0, z: .17, rx: -.3 });
    return p;
  };

  /* ================================================================== ground */
  slab(-94, -50, 54, 94, .02, M.grass, .01);
  slab(-64, -50, 54, 74, .1, M.asphalt);                                           // drive + loading
  slab(-92, -50, 74, 92, .1, floorM);                                              // painted concrete yard
  slab(-64, -61.6, 56, 74, .14, M.paving);                                           // footpath along the east face
  slab(-92, -64, 74, 75.2, .14, M.paving);                                         // apron strip along the south face
  // drive markings: bays, edge line, arrows
  for (let i = 0; i < 4; i++) paintR(-57.6, -52.4, 59 + i * 3, 59.12 + i * 3, '#FFFFFF');
  paintR(-57.7, -57.55, 59, 68.1, '#FFFFFF');
  paintR(-63.8, -63.6, 56, 74, '#F2C230');
  // yard: yellow safety lines, green walkway, coloured station zones
  paintR(-92, -56, 77.05, 77.2, '#F2C230');                                        // crew walkway edge (north of the line)
  paintR(-90, -56, 81.6, 81.75, '#F2C230');
  paintR(-90, -54, 82.1, 83.7, '#7CC98F');                                         // green pedestrian walkway
  if (!low) for (let x = -89.5; x < -54; x += 1.4) paintR(x, x + .5, 82.3, 83.5, '#E8F6EC', .105);
  paintR(-90, -54, 84.15, 84.3, '#F2C230');
  // hatched keep-clear box at the roller door
  paintR(-89, -83, 75.2, 77, '#F2C230', .1);
  if (!low) for (let x = -88.6; x < -83.2; x += .9) paintR(x, x + .45, 75.3, 76.9, '#2B2F35', .105);
  // north verge with bushes, south-east lawn corner
  if (!low) for (let x = -90; x <= -66; x += 3) kit.bush(x, 55.6, { s: .7 });
  [[-53.6, 89.6], [-56.8, 91.2]].forEach(([x, z]) => { kit.tree(x, z, { s: 1.05 }); addCircle(x, z, .5); });
  kit.tree(-93, 92.5, { s: .9, kind: 'cone' });

  /* ================================================================== the workshop */
  const BX0 = -92, BX1 = -64, BZ0 = 57, BZ1 = 74, EAVE = 6.5, BW = BX1 - BX0, BXc = (BX0 + BX1) / 2;
  const DOORX = -86, DOORW = 5.2, DOORH = 4.8, RECESS = 3;
  B(BW + .3, .35, BZ1 - BZ0 + .3, M.concrete, BXc, 0, (BZ0 + BZ1) / 2);
  // body: a rear block plus a front strip split around the roller door opening
  B(BW, EAVE, BZ1 - BZ0 - RECESS, clad, BXc, .3, (BZ0 + BZ1 - RECESS) / 2);
  const fz = BZ1 - RECESS / 2, dl = DOORX - DOORW / 2, dr = DOORX + DOORW / 2;
  B(dl - BX0, EAVE, RECESS, clad, (BX0 + dl) / 2, .3, fz);
  B(BX1 - dr, EAVE, RECESS, clad, (dr + BX1) / 2, .3, fz);
  B(DOORW, EAVE - DOORH, RECESS, clad, DOORX, .3 + DOORH, fz);
  // opening: interior back wall, floor, light, rolled-up door drum, yellow frame
  B(DOORW, DOORH, .05, interior, DOORX, .3, BZ1 - RECESS + .03);
  B(DOORW, .05, RECESS, floorM, DOORX, .3, fz);
  B(DOORW - .4, .05, 1.2, lightM, DOORX, .3 + DOORH - .06, fz, { cast: false });
  kit.cyl(.35, .35, DOORW, M.std('#E3E6E8', { rough: .4, map: null }), { parent: G, x: DOORX, y: .3 + DOORH + .05, z: BZ1 + .3, rz: Math.PI / 2, seg: 14 }).position.x = DOORX + DOORW / 2;
  [-1, 1].forEach(s => B(.3, DOORH, .3, yellow, DOORX + s * (DOORW / 2 + .15), .3, BZ1 + .05));
  B(DOORW + .9, .3, .3, yellow, DOORX, .3 + DOORH, BZ1 + .05);
  if (!low) { // interior shelving and a parcel hatch the boxes come out of
    for (let i = 0; i < 2; i++) { B(1.8, 2.6, .5, steel, DOORX - 1.4 + i * 2.8, .35, BZ1 - RECESS + .35); [.9, 1.8].forEach(y => B(1.6, .35, .4, i ? wrapM : cardM, DOORX - 1.4 + i * 2.8, .35 + y, BZ1 - RECESS + .4)); }
    B(1.2, 1.0, .06, dark, DOORX, .9, BZ1 - RECESS + .08);
  }
  // green band, corner trims, plinth
  [[BW + .1, .5, .1, BXc, BZ1 + .02], [BW + .1, .5, .1, BXc, BZ0 - .02]].forEach(([w, h, d, x, z]) => B(w, h, d, greenM, x, EAVE - .4, z));
  [[.1, .5, BZ1 - BZ0 + .1, BX0 - .02], [.1, .5, BZ1 - BZ0 + .1, BX1 + .02]].forEach(([w, h, d, x]) => B(w, h, d, greenM, x, EAVE - .4, (BZ0 + BZ1) / 2));
  [[BX0, BZ0], [BX0, BZ1], [BX1, BZ0], [BX1, BZ1]].forEach(([x, z]) => B(.36, EAVE + .3, .36, trim, x, 0, z));
  // window strips (transparent-looking panels with white frames)
  const winStrip = (x, z, len, y, h, ry) => {
    const g2 = new THREE.Group(); g2.position.set(x, 0, z); g2.rotation.y = ry; G.add(g2);
    kit.box(len, h, .08, M.glass, { parent: g2, y, z: .02 });
    kit.box(len + .2, .14, .2, trim, { parent: g2, y: y - .1, z: .05 }); kit.box(len + .2, .12, .16, trim, { parent: g2, y: y + h, z: .05 });
    for (let i = 0; i <= Math.round(len / 1.5); i++) kit.box(.1, h, .14, trim, { parent: g2, x: -len / 2 + i * len / Math.round(len / 1.5), y, z: .05 });
  };
  winStrip(-74.5, BZ1, 14, 1.3, 2.1, 0);                         // south, right of the door
  winStrip(BX1, 67.5, 9, 2.4, 2.0, Math.PI / 2);                 // east
  winStrip(-78, BZ0, 22, 2.6, 1.8, Math.PI);                     // north (faces the road)
  winStrip(BX0, 65.5, 12, 2.6, 1.8, -Math.PI / 2);               // west
  // main entrance on the east face (glass door, green canopy, steps), name sign above
  const MDZ = 61;
  B(.08, 2.5, 2.2, M.glass, BX1 + .16, .35, MDZ); B(.06, 2.5, .3, trim, BX1 + .2, .35, MDZ - 1.15); B(.06, 2.5, .3, trim, BX1 + .2, .35, MDZ + 1.15); B(.06, .3, 2.6, trim, BX1 + .2, 2.85, MDZ);
    B(.1, 2.5, .08, trim, BX1 + .22, .35, MDZ);
  B(1.8, .2, 3.4, greenM, BX1 + .9, 3.05, MDZ);
  B(1.4, .14, 3, M.concrete, BX1 + .7, .1, MDZ);
  {
    const r = A.signRegion([{ text: 'SIX SIGMA WORKSHOP', size: .5, weight: 800 }], 6.4, .95, { bg: '#FFFFFF', accent: GREEN, accentH: .1, ppm: 140 });
    B(.14, 1.05, 6.6, greenM, BX1 + .06, 3.6, MDZ + 1.4);
    A.quad(r, 6.4, .95, { parent: G, x: BX1 + .14, y: 3.65, z: MDZ + 1.4, ry: Math.PI / 2 });
    // and on the north face for people arriving from the road
    B(8.6, 1.15, .14, greenM, -72, 3.9, BZ0 - .07);
    A.quad(r, 8.4, 1.05, { parent: G, x: -72, y: 3.95, z: BZ0 - .15, ry: Math.PI });
  }
  // bollards at the door
  [-1.6, 1.6].forEach(dz => kit.cyl(.12, .12, .9, yellow, { parent: G, x: BX1 + 2, z: MDZ + dz, y: .1, seg: 10 }));
  addBox(BXc, (BZ0 + BZ1) / 2, BW + .5, BZ1 - BZ0 + .5);
  // the green belt banner across the south face
  {
    const r = A.region(13.5, 1.6, (g, W, H, k) => {
      g.fillStyle = GREEN; g.fillRect(0, 0, W, H);
      g.fillStyle = 'rgba(255,255,255,.22)'; g.fillRect(0, .1 * k, W, .05 * k); g.fillRect(0, H - .15 * k, W, .05 * k);
      // a belt buckle on the left
      g.fillStyle = '#1F6B35'; g.fillRect(.35 * k, .32 * k, 1.5 * k, .96 * k);
      g.strokeStyle = '#F2D27A'; g.lineWidth = .1 * k; g.strokeRect(.55 * k, .45 * k, 1.1 * k, .7 * k);
      g.fillStyle = '#F2D27A'; g.fillRect(1.05 * k, .45 * k, .1 * k, .7 * k);
      A.text([{ text: 'LEAN SIX SIGMA  ·  GREEN BELT', size: .7, weight: 800, color: '#FFFFFF' }], W, H, k, { x0: 2.0 * k, pad: .3 });
    }, 75);
    B(13.9, .12, .12, steel, -73, 6.15, BZ1 + .12);
    A.quad(r, 13.5, 1.6, { parent: G, x: -73, y: 4.45, z: BZ1 + .09 });
  }
  // north-light sawtooth roof: glazing faces north, slopes face south
  {
    const n = 3, s = (BZ1 - BZ0) / n, rise = 2.2;
    const pts = [[BZ1, 0], [BZ0, 0]];
    for (let i = 0; i < n; i++) { const z0 = BZ0 + i * s; pts.push([z0, rise], [z0 + s, 0]); }
    const sh = new THREE.Shape(pts.map(([z, y]) => new THREE.Vector2(-z, y)));
    const geo = new THREE.ExtrudeGeometry(sh, { depth: BW, bevelEnabled: false });
    geo.rotateY(Math.PI / 2); geo.translate(BX0, .3 + EAVE, 0); geo.computeVertexNormals();
    mk(geo, roofM);
    const pitch = Math.atan2(rise, s), sl = Math.hypot(s, rise);
    for (let i = 0; i < n; i++) {
      const z0 = BZ0 + i * s;
      B(BW - .4, rise - .25, .06, M.glass, BXc, .3 + EAVE + .1, z0 - .04);
      for (let k = 0; k <= 9; k++) B(.08, rise - .2, .1, trim, BX0 + .3 + k * (BW - .6) / 9, .3 + EAVE + .1, z0 - .06);
      B(BW + .1, .12, .14, greenM, BXc, .3 + EAVE + rise - .06, z0 - .05);
      if (!low) [-1, 1].forEach(sx => { const p = kit.box(BW / 2 - 5, .06, sl * .6, pvM, { parent: G, x: BXc + sx * (BW / 4 - .5), y: .3 + EAVE + rise / 2 + .04, z: z0 + s / 2, rx: pitch }); p.position.y -= sl * .72 / 2 * Math.sin(0); });
    }
    // gable end caps in cladding colour (saw profile reads from east and west)
    [BX0 - .06, BX1 + .06 - .12].forEach(x => { const g2 = new THREE.ExtrudeGeometry(sh, { depth: .12, bevelEnabled: false }); g2.rotateY(Math.PI / 2); g2.translate(x, .3 + EAVE, 0); g2.computeVertexNormals(); mk(g2, clad); });
  }
  spots.push({ id: 'main', x: -60.4, z: MDZ, y: 4.2 });

  /* ================================================================== DMAIC conveyor line */
  const LZ = 79, LX0 = -86, LX1 = -57.8, FZ0 = BZ1 - RECESS + .3, TOP = .95;
  const beltTex = kit.canvasTex(64, 16, (g, w, h) => { g.fillStyle = '#34393F'; g.fillRect(0, 0, w, h); g.fillStyle = '#4A5058'; for (let x = 0; x < w; x += 16) g.fillRect(x, 0, 5, h); }, { srgb: true });
  const beltM = new THREE.MeshStandardMaterial({ map: beltTex, roughness: .75 });
  const belt = (len, x, z, ry) => {
    const geo = new THREE.BoxGeometry(len, .08, .8); geo.translate(0, .04, 0);
    const uv = geo.attributes.uv; for (let i = 0; i < uv.count; i++) uv.setX(i, uv.getX(i) * len / .5);
    kit.place(new THREE.Mesh(geo, beltM), { parent: G, x, y: TOP - .08, z, ry });
  };
  const frame = (len, x, z, ry) => {
    const g2 = new THREE.Group(); g2.position.set(x, 0, z); g2.rotation.y = ry; G.add(g2);
    [-1, 1].forEach(s => kit.box(len, .2, .08, greenM, { parent: g2, y: TOP - .15, z: s * .46 }));
    for (let i = 0; i <= Math.round(len / 2); i++) { const lx = -len / 2 + .2 + i * (len - .4) / Math.round(len / 2); [-1, 1].forEach(s => kit.box(.08, TOP - .15, .08, steel, { parent: g2, x: lx, z: s * .42 })); kit.box(.06, .06, .84, steel, { parent: g2, x: lx, y: .25 }); }
  };
  const mainLen = LX1 - LX0, feedLen = LZ - FZ0;
  belt(mainLen, (LX0 + LX1) / 2, LZ, 0); frame(mainLen, (LX0 + LX1) / 2, LZ, 0);
  belt(feedLen - .5, LX0, (FZ0 + LZ - .5) / 2, -Math.PI / 2); frame(feedLen - .5, LX0, (FZ0 + LZ - .5) / 2, -Math.PI / 2);
  kit.cyl(.52, .52, .1, M.std('#4A5058', { rough: .6, map: null }), { parent: G, x: LX0, z: LZ, y: TOP - .1, seg: 20 });
  B(1.2, TOP - .1, 1.2, greenM, LX0, 0, LZ);
  addBox((LX0 + LX1) / 2 - .3, LZ, mainLen + 1.4, 1.3);
  addBox(LX0, (BZ1 + LZ) / 2, 1.4, LZ - BZ1 + 1);
  // dispatch booth at the end of the line
  {
    const bx = -57.2;
    kit.rbox(2.6, 2.5, 2.6, .1, clad, { parent: G, x: bx + .5, z: LZ, y: .1 });
    B(.06, 1.6, 1.2, dark, bx - .82, .3, LZ);
    B(3, .25, 3, greenM, bx + .5, 2.6, LZ);
    const r = A.signRegion([{ text: 'DISPATCH', size: .3, weight: 800, color: '#FFFFFF' }], 2.2, .5, { bg: GREEN, ppm: 150 });
    A.quad(r, 2.2, .5, { parent: G, x: bx + .5, y: 1.85, z: LZ + 1.32 });
    addBox(bx + .5, LZ, 2.8, 2.8);
  }
  // the five stations
  const STN = [
    ['D', 'DEFINE', 'Agree the problem', '#1F7BD8', '#E3F0FC'],
    ['M', 'MEASURE', 'Get the baseline', '#0FA3A3', '#DDF5F3'],
    ['A', 'ANALYSE', 'Find the root cause', '#E8A400', '#FFF3CC'],
    ['I', 'IMPROVE', 'Test the fix small', '#FF6A1A', '#FFE6D6'],
    ['C', 'CONTROL', 'Make the fix stick', '#2FA84F', '#DDF3E3'],
  ];
  const SX = [-81, -76, -71, -66, -61];
  STN.forEach(([letter, name, sub, col, tint], i) => {
    const x = SX[i], cm = M.std(col, { rough: .5, map: null });
    // floor zone in the station colour on the crew side
    if (!low) { paintR(x - 2.2, x + 2.2, 75.4, 77.0, tint, .1); paintR(x - 2.2, x + 2.2, 76.95, 77.05, col, .105); }
    // number disc on the floor in front (south side)
    if (!low) kit.cyl(.42, .42, .03, cm, { parent: G, x, z: 80.6, y: .1, seg: 20, cast: false });
    // sign board on two coloured posts, tilted towards the camera
    const r = A.region(3.2, 1.25, (g, W, H, k) => {
      g.fillStyle = '#FFFFFF'; g.fillRect(0, 0, W, H);
      g.fillStyle = col; g.fillRect(0, 0, 1.2 * k, H); g.fillRect(0, H - .1 * k, W, .1 * k);
      g.fillStyle = '#FFFFFF'; g.font = `900 ${.95 * k}px ${FONT}`; g.textAlign = 'center'; g.textBaseline = 'middle'; g.fillText(letter, .6 * k, H / 2 + .04 * k);
      g.textAlign = 'left'; g.fillStyle = col; g.font = `800 ${.17 * k}px ${FONT}`; g.fillText(`STEP ${i + 1}`, 1.38 * k, .3 * k);
      g.fillStyle = '#1F2328'; let fs = .44; g.font = `900 ${fs * k}px ${FONT}`; while (g.measureText(name).width > 1.6 * k) { fs -= .02; g.font = `900 ${fs * k}px ${FONT}`; } g.fillText(name, 1.38 * k, .64 * k);
      g.fillStyle = '#4B5563'; g.font = `600 ${.17 * k}px ${FONT}`; g.fillText(sub, 1.38 * k, .97 * k);
    }, 118);
    const Sg = new THREE.Group(); Sg.position.set(x, 0, 76.4); G.add(Sg);
    [-1.45, 1.45].forEach(dx => kit.box(.14, 3.5, .14, cm, { parent: Sg, x: dx }));
    const panel = new THREE.Group(); panel.position.y = 2.25; panel.rotation.x = -.22; Sg.add(panel);
    kit.rbox(3.4, 1.4, .14, .05, cm, { parent: panel, y: -.07 });
    A.quad(r, 3.2, 1.25, { parent: panel, y: 0, z: .08 });
    kit.box(3.1, .12, .12, cm, { parent: Sg, y: 3.38 });
    addCircle(x - 1.45, 76.4, .2); addCircle(x + 1.45, 76.4, .2);
    // the crew member at the station, facing the line (and the camera)
    worker(x + (i % 2 ? .6 : -.5), 77.95, { ry: 0, clip: i === 0 || i === 4, hatM: i % 2 ? trim : yellow });
  });
  // station props
  if (!low) {
    // Define: a stand-up desk with a laptop and the problem statement
    B(1.0, 1.05, .6, wood, -82.6, .1, 77.7); B(.42, .02, .3, dark, -82.6, 1.16, 77.7); B(.42, .28, .02, M.emit('#BFE3FF', .95), -82.6, 1.18, 77.56, { rx: -.3 });
    // Measure: a gauge arch over the belt with a sensor light
    [-1, 1].forEach(s => B(.12, 1.9, .12, steel, -76 + s * .2, .1, LZ + s * .62));
    B(.12, .12, 1.36, steel, -75.8, 1.95, LZ); B(.3, .16, .3, M.emit('#7CF0C8', 1.2), -75.8, 1.8, LZ, { cast: false });
    // Analyse: a monitor on a pole showing a Pareto chart
    {
      const r = A.region(1.1, .7, (g, W, H, k) => {
        g.fillStyle = '#10243A'; g.fillRect(0, 0, W, H); const v = [.9, .62, .38, .22, .12, .07];
        v.forEach((h, j) => { g.fillStyle = j === 0 ? '#F2B705' : '#5FB4D9'; g.fillRect((.08 + j * .16) * k, H - (.08 + h * .5) * k, .12 * k, h * .5 * k); });
        g.strokeStyle = '#FFFFFF'; g.lineWidth = .02 * k; g.beginPath(); let c = 0; const tot = v.reduce((a, b) => a + b);
        v.forEach((h, j) => { c += h / tot; const px = (.14 + j * .16) * k, py = H - (.08 + c * .5) * k; j ? g.lineTo(px, py) : g.moveTo(px, py); }); g.stroke();
        g.fillStyle = '#FFFFFF'; g.font = `700 ${.09 * k}px ${FONT}`; g.textAlign = 'left'; g.textBaseline = 'top'; g.fillText('Pareto: defects by cause', .07 * k, .05 * k);
      }, 160);
      kit.cyl(.04, .04, 1.6, steel, { parent: G, x: -72.6, z: 77.8, y: .1, seg: 8 });
      B(1.2, .8, .08, dark, -72.6, 1.55, 77.8);
      A.quad(r, 1.1, .7, { parent: G, x: -72.6, y: 1.6, z: 77.85 });
    }
    // Improve: a tool cart
    B(.9, .9, .55, red, -67.6, .1, 77.6); [.35, .6].forEach(y => B(.92, .03, .57, dark, -67.6, .1 + y, 77.6));
    B(.3, .12, .12, yellow, -67.7, 1.0, 77.6);
    // Control: andon light tower beside the belt
    kit.cyl(.05, .05, 1.3, steel, { parent: G, x: -62.3, z: 78.2, y: .1, seg: 8 });
    [['#2FA84F', 1.4, 1.4], ['#F2B705', 1.62, .35], ['#E0392B', 1.84, .35]].forEach(([c, y, k]) => kit.cyl(.12, .12, .2, M.emit(c, k), { parent: G, x: -62.3, z: 78.2, y, seg: 12, cast: false }));
  }
  // the control chart board (easel), east of the Control station
  {
    const r = A.region(2.0, 1.3, (g, W, H, k) => {
      g.fillStyle = '#FFFFFF'; g.fillRect(0, 0, W, H);
      g.fillStyle = '#1F2328'; g.font = `800 ${.12 * k}px ${FONT}`; g.textAlign = 'left'; g.textBaseline = 'middle';
      g.fillText('CONTROL CHART', .1 * k, .13 * k); g.fillStyle = '#6B7280'; g.font = `600 ${.08 * k}px ${FONT}`; g.fillText('cycle time per box (s)', .1 * k, .27 * k);
      const x0 = .2 * k, x1 = W - .12 * k, yc = .78 * k, d = .3 * k;
      g.lineWidth = .015 * k; g.setLineDash([.05 * k, .04 * k]); g.strokeStyle = '#E0392B';
      [yc - d, yc + d].forEach(y => { g.beginPath(); g.moveTo(x0, y); g.lineTo(x1, y); g.stroke(); });
      g.setLineDash([]); g.strokeStyle = GREEN; g.beginPath(); g.moveTo(x0, yc); g.lineTo(x1, yc); g.stroke();
      g.fillStyle = '#E0392B'; g.font = `700 ${.07 * k}px ${FONT}`; g.fillText('UCL', x1 - .2 * k, yc - d - .06 * k); g.fillText('LCL', x1 - .2 * k, yc + d + .07 * k);
      const R = rng(5); g.strokeStyle = '#1F7BD8'; g.fillStyle = '#1F7BD8'; g.beginPath(); const N = 16, pts = [];
      for (let j = 0; j < N; j++) { const amp = j < 6 ? .85 : .4; pts.push([x0 + j * (x1 - x0) / (N - 1), yc + (R() - .5) * 2 * d * amp]); }
      pts.forEach(([x, y], j) => (j ? g.lineTo(x, y) : g.moveTo(x, y))); g.stroke();
      pts.forEach(([x, y]) => { g.beginPath(); g.arc(x, y, .025 * k, 0, 6.28); g.fill(); });
    }, 140);
    const cx = -57.6, cz = 76.0;
    B(2.2, 1.5, .08, M.std('#E9ECEF', { rough: .4, map: null }), cx, 1.0, cz);
    A.quad(r, 2.0, 1.3, { parent: G, x: cx, y: 1.1, z: cz + .05 });
    [-1, 1].forEach(s => B(.08, 2.6, .08, steel, cx + s * 1.05, 0, cz - .05));
    B(2.2, .06, .14, steel, cx, 1.0, cz + .08);
    addBox(cx, cz, 2.4, .4);
    worker(-56.4, 77.0, { ry: -2.6, clip: true, hatM: trim });
  }
  spots.push({ id: 'dmaic', x: -71, z: 82.7, y: 4.4 });

  /* ---------- moving boxes (instanced, cheap) ---------- */
  const NBOX = low ? 10 : 15, PATH_L = feedLen + mainLen - .2, SPEED = .55;
  const boxGeo = new THREE.BoxGeometry(.55, .42, .48); boxGeo.translate(0, .21, 0);
  const boxes = new THREE.InstancedMesh(boxGeo, cardM, NBOX); boxes.castShadow = true; boxes.receiveShadow = true;
  const tagGeo = new THREE.BoxGeometry(.3, .03, .3); tagGeo.translate(0, .435, 0);
  const tags = new THREE.InstancedMesh(tagGeo, greenM, NBOX);
  const tapeGeo = new THREE.BoxGeometry(.08, .015, .49); tapeGeo.translate(0, .425, 0);
  const tapes = new THREE.InstancedMesh(tapeGeo, M.std('#B8874E', { rough: .5, map: null }), NBOX);
  const dyn = new THREE.Group(); dyn.userData.dynamic = true; dyn.add(boxes, tags); if (!low) dyn.add(tapes); root.add(dyn);
  const m4 = new THREE.Matrix4();
  const placeBoxes = t => {
    for (let i = 0; i < NBOX; i++) {
      const s = (t * SPEED + i * PATH_L / NBOX) % PATH_L;
      let x, z;
      if (s < feedLen) { x = LX0; z = FZ0 + s; } else { x = LX0 + (s - feedLen); z = LZ; }
      m4.makeTranslation(x, TOP, z); boxes.setMatrixAt(i, m4); tapes.setMatrixAt(i, m4);
      const k = x > -61 ? 1 : 0.0001; m4.makeScale(k, k, k); m4.setPosition(x, TOP, z); tags.setMatrixAt(i, m4);
    }
    boxes.instanceMatrix.needsUpdate = true; tags.instanceMatrix.needsUpdate = true; tapes.instanceMatrix.needsUpdate = true;
  };
  placeBoxes(0); boxes.computeBoundingSphere(); [boxes, tags, tapes].forEach(m => { m.frustumCulled = false; });

  /* ================================================================== certificate wall (south) */
  {
    const WX = -65, WZ = 86;
    slab(-71, -59, 85.2, 91.2, .16, M.tiles);
    B(10, 3.2, .4, trim, WX, .16, WZ);
    B(10.4, .3, .6, greenM, WX, 3.36, WZ);
    B(10.6, .18, 1.6, greenM, WX, 3.5, WZ + .55);                                        // short eave
    [-1, 1].forEach(s => { B(.4, 3.5, .5, greenM, WX + s * 5.1, .16, WZ); });
    const head = A.signRegion([{ text: 'LEARNING I WENT LOOKING FOR', size: .26, weight: 800, color: '#FFFFFF' }], 6, .45, { bg: GREEN, ppm: 150 });
    A.quad(head, 6, .45, { parent: G, x: WX, y: 2.6, z: WZ + .21 });
    const certs = [
      ['LEAN SIX SIGMA', 'Green Belt', 'Certified 2026', GREEN],
      ['GOOGLE', 'Advanced Data Analytics', 'Professional Certificate', '#1F7BD8'],
      ['WHARTON (UPENN)', 'Marketing', 'Business Foundations', '#7C5CFF'],
    ];
    certs.forEach(([a, b, c, col], i) => {
      const r = A.region(1.6, 1.15, (g, W, H, k) => {
        g.fillStyle = '#FFFDF6'; g.fillRect(0, 0, W, H);
        g.strokeStyle = col; g.lineWidth = .04 * k; g.strokeRect(.06 * k, .06 * k, W - .12 * k, H - .12 * k);
        g.lineWidth = .01 * k; g.strokeRect(.11 * k, .11 * k, W - .22 * k, H - .22 * k);
        g.textAlign = 'center'; g.textBaseline = 'middle';
        g.fillStyle = '#6B7280'; g.font = `600 ${.07 * k}px ${FONT}`; g.fillText('CERTIFICATE', W / 2, .24 * k);
        g.fillStyle = col; g.font = `800 ${.11 * k}px ${FONT}`; g.fillText(a, W / 2, .42 * k);
        g.fillStyle = '#1F2328'; g.font = `800 ${.12 * k}px ${FONT}`; g.fillText(b, W / 2, .6 * k);
        g.fillStyle = '#4B5563'; g.font = `600 ${.08 * k}px ${FONT}`; g.fillText(c, W / 2, .76 * k);
        g.fillStyle = '#1F2328'; g.font = `700 ${.07 * k}px ${FONT}`; g.fillText('Pratham Gupta', W / 2 - .3 * k, .96 * k);
        g.fillStyle = col; g.beginPath(); g.arc(W - .32 * k, .94 * k, .1 * k, 0, 6.28); g.fill();
        g.fillStyle = '#FFFFFF'; g.beginPath(); g.arc(W - .32 * k, .94 * k, .05 * k, 0, 6.28); g.fill();
      }, 150);
      const x = WX + (i - 1) * 2.7;
      B(1.82, 1.37, .08, M.std('#3A2A20', { rough: .5, map: null }), x, .99, WZ + .22);
      A.quad(r, 1.6, 1.15, { parent: G, x, y: 1.1, z: WZ + .27 });
      if (!low) kit.cyl(.03, .03, .15, M.emit('#FFF1C9', 1), { parent: G, x, z: WZ + .45, y: 2.32, rz: Math.PI / 2, seg: 8, cast: false });
    });
    // reading bench in front, a reader on it, planters at the ends
    kit.bench(WX, WZ + 2.3, { ry: Math.PI });
    worker(WX - .3, WZ + 2.15, { pose: 'sit', y: 0, ry: Math.PI, shirt: '#F2F2F2', pants: '#1F2A44', noVest: true, hat: false });
    [-1, 1].forEach(s => { kit.rbox(1, .6, 1, .1, M.std('#F7F7F4', { rough: .6 }), { parent: G, x: WX + s * 4.6, z: WZ + 1.3, y: .16 }); kit.sphere(.5, M.std('#4FA348', { map: null, rough: 1, flat: true }), { parent: G, x: WX + s * 4.6, z: WZ + 1.3, y: .55, seg: 8, seg2: 6 }); addCircle(WX + s * 4.6, WZ + 1.3, .7); });
    addBox(WX, WZ, 10.6, .9);
    addBox(WX, WZ + 2.3, 2, .7);
    spots.push({ id: 'certs', x: WX, z: 90.2, y: 4.2 });
  }

  /* ================================================================== racking, pallets, forklift (south-west) */
  {
    const rz = 90.3, x0 = -91.5, bay = 2.8, nb = 4;
    for (let i = 0; i <= nb; i++) { const x = x0 + i * bay; [-.5, .5].forEach(dz => B(.1, 4.2, .1, orange, x, .1, rz + dz)); [1, 2.4, 3.8].forEach(y => B(.08, .06, 1.0, orange, x, .1 + y, rz)); }
    [1.25, 2.65, 4.05].forEach(y => [-.5, .5].forEach(dz => B(bay * nb, .14, .1, blue, x0 + bay * nb / 2, .1 + y - .14, rz + dz)));
    const R = rng(3);
    for (let i = 0; i < nb; i++) for (const y of [.1, 1.39, 2.79]) {
      if (low && y > 2) continue;
      const x = x0 + bay * (i + .5);
      if (R() < .15 && y > .5) continue;
      B(1.2, .15, 1.0, wood, x, y + .02, rz);
      if (R() < .5) B(1.1, .85, .9, wrapM, x, y + .17, rz); else { B(1.1, .45, .9, cardM, x, y + .17, rz); B(.9, .4, .8, cardM, x - .05, y + .62, rz); }
    }
    addBox(x0 + bay * nb / 2, rz, bay * nb + .6, 1.4);
    // loose pallet stacks by the building
    for (let k = 0; k < 6; k++) B(1.2, .14, 1.0, wood, -90.6, .1 + k * .16, 76.2);
    B(1.1, .9, .9, cardM, -90.6, 1.06, 76.2);
    addBox(-90.6, 76.2, 1.4, 1.2);
    // forklift (local helper), facing west towards the racking
    const F = new THREE.Group(); F.position.set(-79.5, .1, 87.2); F.rotation.y = -Math.PI / 2; G.add(F);
    kit.rbox(1.15, .9, 2.0, .12, yellow, { parent: F, y: .3 });
    kit.rbox(1.15, .5, .5, .1, dark, { parent: F, y: .55, z: -.85 });
    [[-.5, .6], [.5, .6], [-.5, -.6], [.5, -.6]].forEach(([x, z]) => kit.cyl(.28, .28, .22, M.rubber, { parent: F, x: x * 1.12, z, y: .28, rz: Math.PI / 2, seg: 14 }).position.setY(.28));
    [[-.5, .3], [.5, .3], [-.5, -.75], [.5, -.75]].forEach(([x, z]) => kit.box(.07, 1.5, .07, dark, { parent: F, x, z, y: 1.2 }));
    kit.box(1.15, .07, 1.2, dark, { parent: F, y: 2.7, z: -.22 });
    [-.3, .3].forEach(x => kit.box(.09, 2.5, .09, steel, { parent: F, x, z: 1.1, y: .1 }));
    kit.box(.8, .5, .06, steel, { parent: F, z: 1.15, y: .4 });
    [-.25, .25].forEach(x => kit.box(.1, .05, 1.1, steel, { parent: F, x, y: .35, z: 1.7 }));
    B(1.2, .14, 1.0, wood, 0, 0, 0, { parent: F, y: .42, z: 1.7 });
    kit.box(1.0, .7, .8, cardM, { parent: F, y: .56, z: 1.7 });
    worker(0, -.15, { parent: F, pose: 'sit', y: .75, ry: 0, hatM: yellow });
    addBox(-79.1, 87.2, 3.8, 1.5);
  }

  /* ================================================================== drive: van, totem, lamps */
  kit.van({ parent: G, x: -54.8, z: 65, ry: Math.PI, color: '#F4F6F5', stripe: GREEN });
  addBox(-54.8, 65, 2.2, 5.2);
  {
    const tx = -53.6, tz = 57.4, ry = 2.39;
    const T = new THREE.Group(); T.position.set(tx, 0, tz); T.rotation.y = ry; G.add(T);
    kit.rbox(1.7, 3.6, .45, .1, greenM, { parent: T, y: .1 });
    const r = A.region(1.5, 2.6, (g, W, H, k) => {
      g.fillStyle = '#FFFFFF'; g.fillRect(0, 0, W, H);
      g.fillStyle = GREEN; g.fillRect(0, 0, W, .5 * k);
      g.fillStyle = '#FFFFFF'; g.font = `900 ${.24 * k}px ${FONT}`; g.textAlign = 'center'; g.textBaseline = 'middle'; g.fillText('σ', W / 2, .26 * k);
      g.save(); g.translate(0, .5 * k);
      A.text([{ text: 'SIX SIGMA', size: .22, weight: 900 }, { text: 'WORKSHOP', size: .22, weight: 900 }, { text: 'Green Belt', size: .14, weight: 700, color: GREEN }, { text: 'Entrance →', size: .12, weight: 600, color: '#6B7280' }], W, H - .5 * k, k);
      g.restore();
    }, 120);
    // the text block sits below the green header: draw region offsets handled by quad placement
    [1, -1].forEach(s => A.quad(r, 1.5, 2.6, { parent: T, y: .6, z: s * .235, ry: s > 0 ? 0 : Math.PI }));
    addCircle(tx, tz, 1);
  }
  [[-62.5, 58], [-62.5, 70], [-52.6, 72], [-52.6, 86]].forEach(([x, z]) => kit.lamp(x, z, { ry: x < -60 ? Math.PI / 2 : -Math.PI / 2 }));
  if (!low) {
    // a visitor walking in from the road, a supervisor at the door
    worker(-58.2, 57.8, { ry: -2.3, shirt: '#3B6EA5', noVest: true, hat: false });
    worker(-61.6, 62.6, { ry: Math.PI / 2, clip: true, hatM: trim });
    // spill kit + fire point by the yard
    B(.7, .9, .6, yellow, -63.2, .1, 76.2); B(.4, .6, .3, red, -63.2, 1.0, 76.2);
    kit.cyl(.17, .17, .7, red, { parent: G, x: -64.4, z: 76.2, y: .1, seg: 12 });
    addBox(-63.6, 76.2, 1.8, .8);
  }

  kit.bake(G);

  return {
    group: root, colliders, spots,
    update(dt, t) {
      beltTex.offset.x = -(t * SPEED / .5) % 1;
      placeBoxes(t);
    },
  };
}
