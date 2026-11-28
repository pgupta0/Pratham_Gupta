/* bb.js: BigBasket store + dark store (plot centre (92, 8), 54 x 52, entrance on the west edge at (65, 8)).

   Plan (world metres, +x east, +z south):
     x 65..71   lawn strip (north) / asphalt driveway (from the spoke, turning south)
     x 71..80   pedestrian forecourt: produce stands, trolleys, bike stand, the live dashboard (north-west)
     x 80..96   the grocery store (glass shopfront west + south-west corner), fresh aisle under a canopy on its south side
     x 96..103  service lane: returns dock (south) and bin-audit bay (north) against the dark store's west side
     x 103..117 the dark store / mini DC, loading dock on its south face, yard + EV scooter row south-east
     z 25..31.5 service road from the driveway to the yard (the delivery scooter loops along it)

   Local helpers (kit has no equivalents): a shared text ATLAS (all signs in one draw call), instanced boxes
   (goods, bins, crates, date tags) and instanced produce, a trolley, a bicycle, a rack, a pallet. */

const GREEN = '#7DB928', GREEN_TXT = '#5E9E1A', INK = '#1F2328', FONT = '"Inter", system-ui, -apple-system, "Segoe UI", Arial, sans-serif';

export async function build(ctx) {
  const { THREE, kit, M, quality } = ctx;
  const low = quality === 'low', HI = !low;
  const G = new THREE.Group(); G.name = 'bb';
  const C = [];                                   // colliders
  const R = kit.rng(8128);

  /* ---------------- small placement helpers ---------------- */
  const O = (x, y, z, ex) => Object.assign({ x, y, z, parent: G }, ex);
  const box = (w, h, d, mat, x, y, z, ex) => kit.box(w, h, d, mat, O(x, y, z, ex));
  const rbox = (w, h, d, r, mat, x, y, z, ex) => kit.rbox(w, h, d, r, mat, O(x, y, z, ex));
  const cyl = (rt, rb, h, mat, x, y, z, ex) => kit.cyl(rt, rb, h, mat, O(x, y, z, ex));
  const colB = (x, z, w, d, rot) => C.push(rot ? { type: 'box', x, z, w, d, rot } : { type: 'box', x, z, w, d });
  const colC = (x, z, r) => C.push({ type: 'circle', x, z, r });
  // a thin bar between two points in the x-y plane at a given z, or any 3D pair (used for tie rods)
  const rod = (a, b, t, mat, parent = G) => {
    const dx = b[0] - a[0], dy = b[1] - a[1], dz = b[2] - a[2], L = Math.hypot(dx, dy, dz);
    const geo = new THREE.BoxGeometry(t, t, L); const m = new THREE.Mesh(geo, mat);
    m.position.set((a[0] + b[0]) / 2, (a[1] + b[1]) / 2, (a[2] + b[2]) / 2); m.lookAt(b[0], b[1], b[2]);
    m.castShadow = m.receiveShadow = true; parent.add(m); return m;
  };

  /* ---------------- materials ---------------- */
  const mGreen = M.std(GREEN, { rough: .55 }), mGreenFab = M.std('#86C232', { rough: .9, map: null });
  const mWhite = M.std('#F7F7F4', { rough: .6 }), mWhiteFab = M.std('#FBFAF5', { rough: .9, map: null });
  const mCream = M.std('#F6F6F3', { rough: .7 }), mFrame = M.std('#3E434A', { rough: .45, metal: .4, map: null });
  const mKerb = M.std('#C9C4BB', { rough: .9 }), mCoping = M.std('#DCD8D0', { rough: .7 }), mRoofTop = M.std('#9ED04A', { rough: .8 }), mRoofDC = M.std('#5B9BD5', { rough: .8 });
  const mClad = M.std('#F6F6F3', { rough: .6, map: 'roof' }), mRackBlue = M.std('#2F6FB0', { rough: .5, metal: .3, map: null });
  const mRackOrange = M.std('#F08A24', { rough: .5, metal: .2, map: null }), mYellow = M.std('#F2B705', { rough: .5, map: null });
  const mSteel = M.metal, mWood = M.wood, mCrateWood = M.std('#C99A66', { map: 'wood', rough: .85 }), mCard = M.std('#C49A6C', { rough: .9 });
  const mLight = M.emit('#FFFFFF', 1), mDark = M.dark, mRubber = M.rubber, mSoil = M.std('#6B4A33', { map: null, rough: 1 });
  const mShelf = M.std('#E9E9E6', { rough: .5, map: null }), mWrap = M.std('#E9EDF0', { rough: .25, map: null });
  const mSolar = M.std('#2E4B78', { rough: .2, metal: .5, map: null }), mSky = M.std('#EAF5FC', { rough: .2, map: null, studs: false });
  const mInterior = M.std('#3A4048', { rough: .9, map: null }), mSkirt = M.std('#A3A9AE', { rough: .8 });
  const glassT = new THREE.MeshPhysicalMaterial({ color: '#D5EAF4', roughness: .05, metalness: 0, transparent: true, opacity: .22, depthWrite: false, clearcoat: 1, envMapIntensity: 1.1 });
  const slatM = (() => {
    const t = kit.canvasTex(64, 64, (g, w, h) => { g.fillStyle = '#f2f2f2'; g.fillRect(0, 0, w, h); for (let y = 0; y < h; y += 8) { g.fillStyle = 'rgba(0,0,0,.16)'; g.fillRect(0, y, w, 2); g.fillStyle = 'rgba(255,255,255,.5)'; g.fillRect(0, y + 2, w, 1); } });
    const m = new THREE.MeshStandardMaterial({ color: '#E0452F', roughness: .35, metalness: 0, map: t }); m.userData.metres = 1.2; return m;
  })();

  /* ---------------- text atlas: every sign shares one texture + one draw call ---------------- */
  const ATL = 2048, ATH = 1024, atlC = document.createElement('canvas'); atlC.width = ATL; atlC.height = ATH;
  const atlG = atlC.getContext('2d');
  const atlTex = new THREE.CanvasTexture(atlC); atlTex.colorSpace = THREE.SRGBColorSpace; atlTex.anisotropy = low ? 2 : 8;
  const atlMat = new THREE.MeshBasicMaterial({ map: atlTex, alphaTest: .35, toneMapped: false, polygonOffset: true, polygonOffsetFactor: -1, polygonOffsetUnits: -1 });
  let ax = 0, ay = 0, aRow = 0;
  const alloc = (w, h) => { if (ax + w > ATL) { ax = 0; ay += aRow + 4; aRow = 0; } const r = { x: ax, y: ay, w, h }; ax += w + 4; aRow = Math.max(aRow, h); if (ay + h > ATH) console.warn('[bb] text atlas overflow'); return r; };
  function quad(r, w, h, ex) {
    const geo = new THREE.PlaneGeometry(w, h); geo.translate(0, h / 2, 0);
    const uv = geo.attributes.uv;
    for (let i = 0; i < uv.count; i++) { const u = uv.getX(i), v = uv.getY(i); uv.setXY(i, (r.x + 1 + u * (r.w - 2)) / ATL, 1 - (r.y + 1 + (1 - v) * (r.h - 2)) / ATH); }
    const m = new THREE.Mesh(geo, atlMat); kit.place(m, Object.assign({ parent: G, cast: false }, ex)); m.castShadow = false; return m;
  }
  // draw(w, h, ppm, fn(g, W, H, k)) -> returns a function that places copies
  function panel(w, h, ppm, fn) {
    const W = Math.round(w * ppm), H = Math.round(h * ppm), r = alloc(W, H);
    atlG.save(); atlG.beginPath(); atlG.rect(r.x, r.y, W, H); atlG.clip(); atlG.translate(r.x, r.y); fn(atlG, W, H, W / w); atlG.restore();
    return ex => quad(r, w, h, ex);
  }
  function textLines(g, W, H, k, lines, { bg = null, fg = INK, weight = 700, size = .4, align = 'center', pad = .12, radius = 0 } = {}) {
    if (bg) { g.fillStyle = bg; g.beginPath(); g.roundRect(0, 0, W, H, radius * k); g.fill(); }
    const arr = [].concat(lines).map(l => (typeof l === 'string' ? { text: l } : l));
    const total = arr.reduce((s, l) => s + (l.size || size) * 1.25, 0); let y = (H - total * k) / 2;
    g.textBaseline = 'middle'; g.textAlign = align;
    for (const L of arr) {
      const sz = (L.size || size) * k; let fs = sz; const font = f => `${L.weight || weight} ${f}px ${FONT}`; g.font = font(fs);
      while (g.measureText(L.text).width > W - pad * 2 * k && fs > 6) { fs -= 1; g.font = font(fs); }
      g.fillStyle = L.color || fg; const x = align === 'center' ? W / 2 : align === 'left' ? pad * k : W - pad * k;
      y += (L.size || size) * 1.25 * k / 2; g.fillText(L.text, x, y); y += (L.size || size) * 1.25 * k / 2;
    }
  }
  const text = (lines, w, h, ppm, opts, ex) => { const p = panel(w, h, ppm, (g, W, H, k) => textLines(g, W, H, k, lines, opts)); return ex ? p(ex) : p; };
  const tick = (g, x, y, s, c) => { g.strokeStyle = c; g.lineWidth = s * .22; g.lineCap = 'round'; g.lineJoin = 'round'; g.beginPath(); g.moveTo(x, y + s * .5); g.lineTo(x + s * .38, y + s * .85); g.lineTo(x + s, y + s * .1); g.stroke(); };

  /* ---------------- instanced boxes and produce ---------------- */
  const IB = [], IP = [];
  const ib = (x, y, z, w, h, d, c, ry = 0) => IB.push([x, y, z, w, h, d, c, ry]);
  const PAL_GOODS = ['#E23B2E', '#F2B705', '#3B82F6', '#7DB928', '#F08A24', '#D6336C', '#FFFFFF', '#8B5CF6', '#14B8A6', '#C49A6C', '#F4E3B2', '#2FA84F', '#FFFFFF'];
  const KIND = {
    tomato: { c: ['#D8342A', '#C92B22', '#E0473A'], r: .065 }, orange: { c: ['#F08A24', '#F39A35'], r: .075 },
    apple: { c: ['#C62F2F', '#B82A35', '#D23A3A'], r: .07 }, gapple: { c: ['#9BC13C', '#A9CB4A'], r: .07 },
    onion: { c: ['#B5546B', '#A84A60', '#C7697E'], r: .065 }, potato: { c: ['#C9A06A', '#B88F5C'], r: .07 },
    lemon: { c: ['#E9D84A', '#F0E060'], r: .055 }, capsicum: { c: ['#3E9B3A', '#E23B2E', '#F2C230'], r: .075 },
    greens: { c: ['#4F9A3A', '#5DAA43', '#3F8A33'], r: .09 }, cauli: { c: ['#F2EEDC', '#EDE6CF'], r: .11 },
    banana: { c: ['#F2D23A', '#EACB32'], r: .06, el: 2.4 }, brinjal: { c: ['#5B2A6E', '#4A2260'], r: .06, el: 1.8 },
    carrot: { c: ['#F07F2A', '#E8731F'], r: .045, el: 2.8 }, melon: { c: ['#3D7A35', '#4B8A3E'], r: .17 },
    grape: { c: ['#6A2C70', '#7C3A82'], r: .05 }, chilli: { c: ['#2E8B2E', '#C62F2F'], r: .035, el: 2.6 },
  };
  function fillCrate(x, y, z, w, d, K) {
    const r = K.r, nx = Math.max(1, Math.floor(w / (r * 2))), nz = Math.max(1, Math.floor(d / (r * 2)));
    const layers = HI ? 2 : 1;
    for (let L = 0; L < layers; L++) {
      const ix = L ? Math.max(1, nx - 1) : nx, iz = L ? Math.max(1, nz - 1) : nz;
      for (let i = 0; i < ix; i++) for (let j = 0; j < iz; j++) {
        const px = x + (i - (ix - 1) / 2) * (w / nx) + R.range(-r, r) * .25, pz = z + (j - (iz - 1) / 2) * (d / nz) + R.range(-r, r) * .25;
        const el = K.el || 1, s = R.range(.9, 1.1);
        IP.push([px, y + r * (.7 + L * 1.25), pz, r * s * (el > 1 ? .75 : 1), r * s * .88, r * s * el, R.pick(K.c), R() * 6.28]);
      }
    }
  }
  const TAGS = ['#7DB928', '#7DB928', '#F2B705', '#E0473A'];
  // a three-tier produce stand. (fx, fz) is the middle of its FRONT edge; dir 'w' = faces west, 's' = faces south
  function stand(fx, fz, len, dir, kinds, plastic) {
    const td = .5, base = .14, map = dir === 'w' ? (a, b) => [fx + b, fz + a] : (a, b) => [fx + a, fz - b];
    const dims = dir === 'w' ? (l, d) => [d, l] : (l, d) => [l, d];
    const n = Math.max(1, Math.floor(len / .62)), step = len / n; let ki = 0;
    for (let k = 0; k < 3; k++) {
      const h = .42 + k * .26, [cx, cz] = map(0, k * td + td / 2), [bw, bd] = dims(len, td);
      box(bw, h, bd, mWood, cx, base, cz);
      for (let i = 0; i < n; i++) {
        const a = -len / 2 + step * (i + .5), [x, z] = map(a, k * td + .25), [cw, cd] = dims(.56, .42), K = KIND[kinds[ki++ % kinds.length]], top = base + h;
        if (plastic) ib(x, top, z, cw, .17, cd, plastic); else box(cw, .17, cd, mCrateWood, x, top, z);
        fillCrate(x, top + .17, z, cw - .08, cd - .08, K);
        const [tx, tz] = map(a, k * td + .034), [tw, tdp] = dims(.17, .012), [sx2, sz2] = map(a, k * td + .028);
        ib(tx, top + .04, tz, tw, .09, tdp, '#FFFFFF'); ib(sx2, top + .1, sz2, tw, .03, tdp, TAGS[(i + k) % TAGS.length]);
      }
    }
  }
  function figure(x, z, ry, opts = {}, y = 0) {
    const g = new THREE.Group(); g.position.set(x, y, z); g.rotation.y = ry; G.add(g);
    const p = kit.person(Object.assign({ parent: g }, opts));
    const h = p.userData.height;
    if (opts.helmet) kit.sphere(.15, M.std(opts.helmet, { rough: .35, map: null }), { parent: g, y: h - .27, seg: 12, seg2: 8 });
    if (opts.tablet) { box(.26, .19, .025, mDark, 0, h * .6, .27, { parent: g, rx: -.7 }); box(.22, .15, .01, M.emit('#DFF1C8', 1), 0, h * .6 + .01, .285, { parent: g, rx: -.7 }); }
    if (opts.clip) { box(.24, .3, .02, mCard, .05, h * .58, .26, { parent: g, rx: -.5 }); box(.2, .24, .01, mWhite, .05, h * .58 + .02, .275, { parent: g, rx: -.5 }); }
    if (opts.crate) ib(x + Math.sin(ry) * .38, y + h * .5, z + Math.cos(ry) * .38, .5, .26, .36, opts.crate, ry);
    if (!opts.noCol) colC(x, z, .38);
    return g;
  }
  const STAFF = { shirt: GREEN, pants: '#2B3442' };

  /* =====================================================================================
     GROUND: paving, asphalt, kerbs, markings
     ===================================================================================== */
  const PAVE_H = .14;
  const pave = (x0, x1, z0, z1, mat = M.paving, h = PAVE_H) => box(x1 - x0, h, z1 - z0, mat, (x0 + x1) / 2, 0, (z0 + z1) / 2, { cast: false });
  const asph = (x0, x1, z0, z1, y = .03, mat = M.asphalt) => kit.plane(x1 - x0, z1 - z0, mat, { x: (x0 + x1) / 2, z: (z0 + z1) / 2, y, parent: G });
  const kerbX = (x, z0, z1) => box(.18, .17, z1 - z0, mKerb, x, 0, (z0 + z1) / 2, { cast: false });
  const kerbZ = (z, x0, x1) => box(x1 - x0, .17, .18, mKerb, (x0 + x1) / 2, 0, z, { cast: false });
  const paint = (x, z, w, d, c, ry = 0, y = .03) => kit.paint(x, z, w, d, c, { parent: G, ry, y });

  pave(71, 80, -16, 19.5);                         // forecourt
  pave(76.2, 79.9, 6.3, 9.7, M.tiles, .16);        // tiled entrance apron
  pave(65, 71, 1.6, 4.5);                          // path from the spoke's north footpath
  pave(80, 96, -16, -10);                          // north path
  pave(96, 103, -16, 15);                          // service lane
  pave(80, 96, 14, 25); pave(96, 99, 15, 25);      // fresh-aisle walkway
  asph(65, 71, 4.5, 31.5);                         // driveway from the spoke
  asph(71, 80, 19.5, 25);                          // customer parking
  asph(71, 99, 25, 31.5);                          // service road
  asph(99, 117, 15, 31.5);                         // yard
  kit.plane(14, 3.2, M.concrete, { x: 110, z: 18.8, y: .036, parent: G });   // dock apron
  // kerbs (raised paving edges facing asphalt)
  kerbX(71, -16, 1.6); kerbX(71, 13.9, 19.5); kerbZ(19.5, 71, 80); kerbZ(25, 80, 99); kerbX(99, 15, 25); kerbZ(15, 99, 103);
  kerbZ(4.5, 65, 71); kerbZ(1.6, 65, 71);
  // markings
  for (let z = 15; z < 31; z += 5) paint(68, z, .14, 2.6, '#F4F4F0');                        // driveway centre dashes
  for (let k = 0; k < 4; k++) paint(66.2 + k * 1.2, 12.7, .55, 2.4, '#F4F4F0');               // zebra from the spoke's south footpath
  [71.12, 74, 77, 79.88].forEach(x => paint(x, 22.25, .12, 5.3, '#F4F4F0'));                  // parking bays
  for (let x = 73; x < 98; x += 6) paint(x, 28.25, 3, .14, '#F4F4F0');                        // service road centre dashes
  // yard: loading zone box, van bay lines, painted pedestrian walkway to the dock
  [[110.3, 17.45, 13.4, .14], [110.3, 23.2, 13.4, .14], [103.66, 20.3, .14, 5.8], [116.95, 20.3, .14, 5.8]].forEach(([x, z, w, d]) => paint(x, z, w, d, '#F2C230', 0, .05));
  [108.7, 112.3].forEach(x => paint(x, 20.3, .12, 5.6, '#F4F4F0', 0, .05));
  for (let i = 0; i < 6; i++) paint(104.4 + i * .5, 22.3, .22, 1.4, '#F2C230', .6, .05);        // hatching beside the van bay
  paint(100.6, 19.6, 1.5, 9, GREEN, 0, .055); paint(102.9, 23.4, 4.6, 1.3, GREEN, 0, .055);
  for (let z = 16; z < 24; z += 1.6) paint(100.6, z, 1.1, .2, '#F7F7F4', 0, .06);              // walkway chevrons
  // lane: painted pedestrian route
  paint(98.4, -.5, .12, 30, '#F7F7F4', 0, PAVE_H + .01);

  /* =====================================================================================
     THE STORE  (x 80..96, z -10..14), glass shopfront on the west and the south-west corner
     ===================================================================================== */
  const SX0 = 80, SX1 = 96, SZ0 = -10, SZ1 = 14, SCX = 88, SCZ = 2, FL = .3;
  box(16, FL, 24, M.tiles, SCX, 0, SCZ);                                         // floor slab (tiled)
  box(15.4, .1, 23.4, mWhite, SCX, 4.6, SCZ, { cast: false });                   // ceiling
  box(15.6, .2, 23.6, mRoofTop, SCX, 6.4, SCZ, { cast: false });                 // roof deck
  // solid walls
  box(16, 6.6, .3, mCream, SCX, FL, SZ0 + .15);                                  // north
  box(.3, 6.6, 24, mCream, SX1 - .15, FL, SCZ);                                  // east
  box(9.5, 4.4, .3, mCream, 91.25, FL, SZ1 - .15);                               // south (solid part)
  // fascia + green band + coping on west and south, white trims north/east
  box(.42, 2.2, 24.4, mWhite, SX0 + .02, 4.7, SCZ); box(.46, .3, 24.44, mGreen, SX0 + .02, 4.7, SCZ);
  box(16.42, 2.2, .42, mWhite, SCX + .01, 4.7, SZ1 - .02); box(16.46, .3, .46, mGreen, SCX + .01, 4.7, SZ1 - .02);
  box(.52, .12, 24.5, mCoping, SX0 + .02, 6.9, SCZ); box(16.5, .12, .52, mCoping, SCX, 6.9, SZ1 - .02);
  box(16.4, .5, .36, mWhite, SCX, 6.5, SZ0 + .15); box(.36, .5, 24.4, mWhite, SX1 - .15, 6.5, SCZ);
  // west glazing: kick plate, glass, mullions, rails; sliding doors at z = 8
  const DZ0 = 6.7, DZ1 = 9.3;
  [[-9.85, DZ0], [DZ1, 13.85]].forEach(([a, b]) => { box(.3, .32, b - a, mFrame, SX0 + .15, FL, (a + b) / 2); box(.04, 4.0, b - a, glassT, SX0 + .1, FL + .32, (a + b) / 2, { cast: false }); });
  box(.04, 1.5, DZ1 - DZ0, glassT, SX0 + .1, 3.1, 8, { cast: false });
  for (let z = -9.85; z <= 13.9; z += 1.98) if (z < DZ0 - .3 || z > DZ1 + .3) box(.14, 4.32, .1, mFrame, SX0 + .12, FL, z);
  box(.16, .1, 23.8, mFrame, SX0 + .12, 3.0, SCZ); box(.16, .12, 23.8, mFrame, SX0 + .12, 4.58, SCZ);
  [DZ0, DZ1].forEach(z => box(.24, 2.85, .22, mGreen, SX0 + .1, FL, z)); box(.26, .26, DZ1 - DZ0 + .22, mGreen, SX0 + .1, 2.9, 8);
  [7.2, 8.8].forEach(z => { box(.05, 2.55, .95, glassT, SX0 - .02, FL + .02, z, { cast: false }); box(.07, 2.55, .05, mFrame, SX0 - .02, FL + .02, z + (z < 8 ? -.47 : .47)); });
  box(1.6, .02, 2.6, mDark, 79.0, .16, 8, { cast: false });                    // entrance mat
  // south glazing (x 80..86.5)
  box(6.5, .32, .3, mFrame, 83.25, FL, SZ1 - .15); box(6.5, 4.0, .04, glassT, 83.25, FL + .32, SZ1 - .1, { cast: false });
  for (let x = 80.15; x <= 86.6; x += 2.1) box(.1, 4.32, .14, mFrame, x, FL, SZ1 - .12);
  box(6.5, .1, .16, mFrame, 83.25, 3.0, SZ1 - .12); box(6.5, .12, .16, mFrame, 83.25, 4.58, SZ1 - .12);
  // west canopy over the shopfront, with tie rods
  box(2.4, .22, 24.2, mWhite, 78.75, 4.2, SCZ); box(.14, .42, 24.2, mGreen, 77.55, 4.05, SCZ);
  for (const z of [-9, -6, 9.6, 13]) rod([79.9, 6.0, z], [77.7, 4.42, z], .05, mSteel);
  if (HI) for (let z = -8; z <= 12; z += 2.5) box(.3, .02, .3, mLight, 78.7, 4.18, z, { cast: false });     // downlights
  // north + east wall details: clerestory windows, staff door, downpipes, condensers
  { const sg = new THREE.Group(); sg.position.set(SCX, 0, SZ0); sg.rotation.y = Math.PI; G.add(sg); kit.windowRow(sg, { len: 15, y: 3.0, bay: 3.6, winW: 2.4, winH: .9, glass: M.glass }); }
  { const sg = new THREE.Group(); sg.position.set(SX1, 0, SCZ); sg.rotation.y = Math.PI / 2; G.add(sg); kit.windowRow(sg, { len: 22, y: 3.0, bay: 5.2, winW: 1.6, winH: .9, glass: M.glass }); }
  box(.12, 2.3, 1.1, mFrame, SX1 + .05, FL, -3.5); box(.9, .12, 1.6, mWhite, SX1 + .45, 2.75, -3.5);
  text([{ text: 'STAFF ONLY', size: .1, color: '#fff' }], .7, .18, 200, { bg: '#3E434A', radius: .03 }, { x: SX1 + .13, y: 2.35, z: -3.5, ry: Math.PI / 2 });
  [[SX1 + .12, SZ0 + .2], [SX1 + .12, SZ1 - .2]].forEach(([x, z]) => cyl(.07, .07, 6.8, mCoping, x, 0, z, { seg: 8 }));
  if (HI) [1.5, 3.1].forEach(z => { rbox(.75, .85, 1.0, .05, M.std('#E2E2DE', { rough: .5 }), SX1 + .42, PAVE_H, z); cyl(.3, .3, .03, mDark, SX1 + .8, PAVE_H + .25, z, { rz: Math.PI / 2, seg: 14 }); });
  colB(SX1 + .42, 2.3, .9, 2.8);

  // fascia lettering (plain type, no mark)
  text([{ text: 'BigBasket', size: .98, weight: 800, color: GREEN_TXT }, { text: 'Groceries  ·  Fresh  ·  Every day', size: .24, weight: 600, color: '#59616B' }], 10, 1.75, 80, {}, { x: SX0 - .2, y: 5.03, z: 2, ry: -Math.PI / 2 });
  text([{ text: 'BigBasket', size: .8, weight: 800, color: GREEN_TXT }], 6.2, 1.2, 80, {}, { x: 83.6, y: 5.3, z: SZ1 + .2 });
  text([{ text: 'ENTRANCE  ·  WELCOME', size: .12, weight: 700, color: '#ffffff' }], 2.5, .22, 220, { bg: GREEN_TXT }, { x: SX0 - .03, y: 2.92, z: 8, ry: -Math.PI / 2 });
  // window posters (inside the glass)
  const poster = panel(1.1, 1.45, 150, (g, W, H, k) => {
    g.fillStyle = GREEN; g.beginPath(); g.roundRect(0, 0, W, H, .06 * k); g.fill();
    g.fillStyle = '#fff'; g.textAlign = 'center'; g.textBaseline = 'middle';
    g.font = `800 ${.26 * k}px ${FONT}`; g.fillText('FRESH', W / 2, H * .2); g.font = `600 ${.12 * k}px ${FONT}`; g.fillText('every morning', W / 2, H * .34);
    [['#E0473A', .3, .58], ['#F08A24', .5, .62], ['#F2D23A', .7, .58], ['#4F9A3A', .4, .74], ['#D6336C', .6, .74]].forEach(([c, x, y]) => { g.fillStyle = c; g.beginPath(); g.arc(W * x, H * y, .1 * k, 0, 7); g.fill(); });
    g.fillStyle = '#fff'; g.font = `700 ${.1 * k}px ${FONT}`; g.fillText('Fresh every morning', W / 2, H * .92);
  });
  poster({ x: SX0 + .16, y: .9, z: -7.4, ry: -Math.PI / 2 }); poster({ x: SX0 + .16, y: .9, z: 12.2, ry: -Math.PI / 2 }); poster({ x: 85.4, y: .9, z: SZ1 - .16 });

  // ---------- interior ----------
  const IY = FL;
  // gondolas, running east-west so you look down the aisles through the west glass
  const gondola = (x0, x1, z) => {
    const L = x1 - x0, cx = (x0 + x1) / 2;
    box(L, .12, 1.0, mFrame, cx, IY, z); box(L, 1.85, .05, mShelf, cx, IY, z);
    [x0, x1].forEach(x => box(.06, 1.95, 1.04, mGreen, x, IY, z));
    const levels = HI ? [.14, .55, .96, 1.37] : [.14, .75];
    for (const s of [-1, 1]) for (const ly of levels) {
      box(L, .03, .46, mShelf, cx, IY + ly, z + s * .26);
      let x = x0 + .06;
      while (x < x1 - .1) { const w = HI ? R.range(.12, .26) : R.range(.3, .5), h = HI ? R.range(.14, .33) : R.range(.25, .4); if (x + w > x1 - .05) break; ib(x + w / 2, IY + ly + .03, z + s * .27, w * .92, h, .32, R.pick(PAL_GOODS)); x += w; }
    }
  };
  [-7.6, -4.3, -1.0, 2.3, 5.6].forEach(z => gondola(86.6, 94.6, z));
  // chiller wall along the east side (white cabinet, lit band, goods)
  box(.8, 2.3, 21.5, mWhite, 95.25, IY, 1.6); box(.06, .12, 21.5, mLight, 94.86, IY + 2.0, 1.6, { cast: false });
  box(.02, .6, 23, mGreen, 95.68 - .82, IY + 2.5, 1.6);
  if (HI) for (const ly of [.3, .8, 1.3]) { let z = -9; while (z < 12.2) { const w = R.range(.1, .2); ib(94.95, IY + ly, z + w / 2, .3, R.range(.18, .32), w * .9, R.pick(['#FFFFFF', '#F4E3B2', '#3B82F6', '#7DB928', '#F2B705', '#E23B2E'])); z += w; } }
  // checkouts near the door
  [-1.6, 1.3, 4.2].forEach((z, i) => {
    box(2.3, .9, .75, mWhite, 82.6, IY, z); box(2.31, .12, .77, mGreen, 82.6, IY + .78, z);
    box(1.4, .02, .5, mDark, 82.95, IY + .9, z); box(.06, .32, .4, mDark, 81.7, IY + .92, z + .1, { rz: .2 });
    cyl(.025, .025, 1.5, mSteel, 81.5, IY + .9, z + .32, { seg: 6 }); box(.3, .3, .06, i === 0 ? mGreen : mWhite, 81.5, IY + 2.4, z + .32);
  });
  // fresh produce tables by the south-west corner glass
  [[83.0, 11.7], [85.4, 11.7], [83.0, 9.6]].forEach(([x, z], i) => {
    box(2.0, .68, 1.2, mCrateWood, x, IY, z);
    for (let a = 0; a < 3; a++) for (let b = 0; b < 2; b++) { const cx = x - .62 + a * .62, cz = z - .3 + b * .6; ib(cx, IY + .68, cz, .56, .15, .52, GREEN); fillCrate(cx, IY + .83, cz, .48, .44, KIND[['tomato', 'greens', 'orange', 'onion', 'gapple', 'banana', 'capsicum', 'potato', 'lemon'][(i * 6 + a * 2 + b) % 9]]); }
  });
  // ceiling light strips and hanging aisle signs (face the west glass)
  for (let z = -8; z <= 12; z += 4) box(12.5, .05, .22, mLight, 88.6, 4.52, z, { cast: false });
  const aisle = (t, z) => { text([{ text: t, size: .17, weight: 700, color: '#fff' }], 1.9, .38, 140, { bg: GREEN_TXT, radius: .05 }, { x: 86.5, y: 3.3, z, ry: -Math.PI / 2 }); cyl(.01, .01, 1, mSteel, 86.5, 3.68, z - .7, { seg: 4 }); cyl(.01, .01, 1, mSteel, 86.5, 3.68, z + .7, { seg: 4 }); };
  aisle('Fruits & vegetables', -5.9); aisle('Staples & grains', -2.65); aisle('Dairy & bakery', .65); aisle('Snacks & beverages', 3.95);
  // people inside
  if (HI) figure(83.2, -.1, -Math.PI / 2, Object.assign({ seed: 11, skin: '#A86B47' }, STAFF), IY);
  if (HI) { figure(84.3, 10.6, Math.PI, { seed: 12, shirt: '#D6336C', pants: '#2B3442', skin: '#C68A62', noCol: true }, IY); figure(90.4, 4.0, -Math.PI / 2, { seed: 13, shirt: '#3B6EA5', pants: '#6B5B4A', noCol: true }, IY); }
  colB(SCX, SCZ, 16.2, 24.2);

  // store roof: condensers, solar array
  if (HI) {
    [[83, -6.5], [86, -6.5], [89, -6.5], [92.5, -6]].forEach(([x, z], i) => { rbox(1.5, .9, 1.1, .05, M.std('#E2E2DE', { rough: .5 }), x, 6.6, z); cyl(.34, .34, .04, mDark, x, 7.5, z, { seg: 16 }); if (i === 3) cyl(.6, .6, 1.4, M.std('#D9D5CC', { rough: .7 }), x, 6.6, z + 2.4); });
    for (let row = 0; row < 3; row++) for (let i = 0; i < 6; i++) box(1.9, .05, 1.2, mSolar, 82.5 + i * 2.05, 7.0, 2 + row * 2.6, { rx: .32 });
    for (let row = 0; row < 3; row++) box(12.4, .5, .06, mSteel, 87.6, 6.6, 1.55 + row * 2.6);
  }

  /* ---------- the fresh aisle: market row under a striped canopy along the store's south wall ---------- */
  {
    const x0 = 86.6, x1 = 96, zw = SZ1, zf = 18.3, yb = 3.75, yf = 3.05;
    const L = Math.hypot(zf - zw, yb - yf), pitch = Math.atan2(yb - yf, zf - zw), n = Math.round((x1 - x0) / .5);
    for (let i = 0; i < n; i++) {
      const x = x0 + (i + .5) * (x1 - x0) / n, mat = i % 2 ? mWhiteFab : mGreenFab;
      const s = box((x1 - x0) / n + .005, .04, L, mat, x, (yb + yf) / 2, (zw + zf) / 2); s.rotation.x = pitch;
      if (HI || i % 2 === 0) box((x1 - x0) / n + .005, .32, .03, mat, x, yf - .3, zf + .02);
    }
    [x0 + .15, 91.3, x1 - .15].forEach(x => { cyl(.06, .06, yf, mFrame, x, PAVE_H, zf - .05, { seg: 8 }); colC(x, zf - .05, .2); });
    box(x1 - x0, .08, .08, mFrame, (x0 + x1) / 2, yf - .04, zf - .05);
    // three-tier produce stand facing the walkway, plastic green crates with date tags
    stand(90.2, 16.7, 6.8, 's', ['tomato', 'onion', 'potato', 'greens', 'orange', 'apple', 'banana', 'cauli', 'capsicum', 'carrot', 'lemon', 'brinjal', 'grape', 'gapple', 'chilli'], GREEN);
    // packaged-goods shelf with date tags on each row (FEFO: earliest date at the front)
    { const sx = 95.0, w = 1.8; box(w, 2.0, .6, mShelf, sx, PAVE_H, 14.6); box(.04, 2.0, .62, mGreen, sx - w / 2, PAVE_H, 14.6); box(.04, 2.0, .62, mGreen, sx + w / 2, PAVE_H, 14.6);
      for (const ly of [.35, .8, 1.25, 1.7]) { box(w, .03, .5, mShelf, sx, PAVE_H + ly, 15.05); let x = sx - w / 2 + .05; let k = 0; while (x < sx + w / 2 - .15) { const ww = R.range(.12, .2); ib(x + ww / 2, PAVE_H + ly + .03, 15.0, ww * .9, R.range(.14, .3), .3, R.pick(PAL_GOODS)); if (k++ % 2 === 0) { ib(x + ww / 2, PAVE_H + ly - .02, 15.31, .1, .05, .01, '#FFFFFF'); ib(x + ww / 2, PAVE_H + ly - .005, 15.316, .1, .012, .01, TAGS[k % 4]); } x += ww; } } }
    // sign on the canopy front
    text([{ text: 'FRESH AISLE', size: .3, weight: 800, color: GREEN_TXT }, { text: 'First expiry, first out', size: .17, weight: 600, color: '#3A4049' }], 4.8, .78, 120, { bg: '#FFFFFF', radius: .06 }, { x: 91.3, y: yf + .05, z: zf + .06 });
    box(4.9, .82, .08, mWhite, 91.3, yf + .03, zf + .01);
    // FEFO easel board on the walkway
    const easel = panel(1.0, 1.3, 170, (g, W, H, k) => {
      g.fillStyle = '#2F3A33'; g.beginPath(); g.roundRect(0, 0, W, H, .04 * k); g.fill();
      g.strokeStyle = '#C99A66'; g.lineWidth = .04 * k; g.strokeRect(.02 * k, .02 * k, W - .04 * k, H - .04 * k);
      g.fillStyle = '#fff'; g.textAlign = 'center'; g.textBaseline = 'middle';
      g.font = `800 ${.24 * k}px ${FONT}`; g.fillText('FEFO', W / 2, H * .15);
      g.font = `600 ${.08 * k}px ${FONT}`; g.fillStyle = '#DDE6DE'; g.fillText('first expiry, first out', W / 2, H * .27);
      [['Best before 02 Jun', '#E0473A', 'sell first'], ['Best before 05 Jun', '#F2B705', 'next'], ['Best before 09 Jun', '#7DB928', 'back row']].forEach(([t, c, s], i) => {
        const y = H * (.42 + i * .18); g.fillStyle = c; g.fillRect(.1 * k, y - .05 * k, .1 * k, .1 * k);
        g.textAlign = 'left'; g.fillStyle = '#fff'; g.font = `700 ${.07 * k}px ${FONT}`; g.fillText(t, .26 * k, y - .02 * k); g.fillStyle = '#B8C4BA'; g.font = `500 ${.055 * k}px ${FONT}`; g.fillText(s, .26 * k, y + .065 * k);
      });
      g.textAlign = 'center'; g.fillStyle = '#F2C230'; g.font = `700 ${.065 * k}px ${FONT}`; g.fillText('Checked daily · 22 cities', W / 2, H * .94);
    });
    easel({ x: 88.0, y: .55, z: 19.62, rx: -.12 });
    [-.42, .42].forEach(dx => box(.05, 1.95, .05, mWood, 88.0 + dx, PAVE_H, 19.5, { rx: -.12 })); box(.05, 1.6, .05, mWood, 88.0, PAVE_H, 19.15, { rx: .3 });
    colC(88.0, 19.4, .6);
    // a member of staff rotating stock, a shopper with a basket
    figure(92.6, 18.9, Math.PI + .3, Object.assign({ seed: 21, skin: '#8D5A3B', crate: GREEN }, STAFF));
    if (HI) { figure(89.4, 19.2, Math.PI - .4, { seed: 22, shirt: '#F2F2F2', pants: '#1F2A44', skin: '#E0B08A' }); ib(89.15, .78, 19.2, .3, .2, .42, '#E0473A', -.4); }
    colB(91.3, 16.2, 9.6, 4.4);
    kit.bench(85.2, 23.7, { ry: Math.PI }); kit.bench(95.0, 23.7, { ry: Math.PI }); colB(85.2, 23.75, 1.9, .7); colB(95.0, 23.75, 1.9, .7);
  }

  /* ---------- forecourt: produce stands by the door, melon bin, trolleys, bikes ---------- */
  stand(77.55, 4.4, 3.6, 'w', ['tomato', 'banana', 'orange', 'greens', 'apple', 'onion', 'capsicum', 'lemon', 'carrot']);
  stand(77.55, 11.6, 3.6, 'w', ['potato', 'onion', 'cauli', 'brinjal', 'gapple', 'tomato', 'grape', 'greens', 'orange']);
  colB(78.3, 4.4, 1.6, 3.7); colB(78.3, 11.6, 1.6, 3.7);
  // melon bin on a pallet
  { const x = 78.4, z = .9; box(1.2, .14, 1.0, mWood, x, PAVE_H, z); box(1.1, .62, .95, mCard, x, PAVE_H + .14, z); for (let i = 0; i < (HI ? 9 : 4); i++) IP.push([x + R.range(-.35, .35), PAVE_H + .82 + R() * .12, z + R.range(-.3, .3), .17, .15, .2, R.pick(KIND.melon.c), R() * 6]); colB(x, z, 1.3, 1.1); }
  text([{ text: "TODAY'S FRESH", size: .1, weight: 800, color: GREEN_TXT }, { text: 'Tomatoes', size: .075, weight: 600 }, { text: 'Bananas', size: .075, weight: 600 }], .62, .8, 180, { bg: '#FFFFFF', radius: .04 }, { x: 76.2, y: .3, z: 6.0, ry: -Math.PI / 2 - .5, rx: 0 });
  box(.05, .9, .66, mFrame, 76.24, PAVE_H, 6.0, { ry: -.5 + Math.PI }); colC(76.2, 6.0, .4);
  // shopping trolley (faces +z): local helper
  function trolley(x, z, ry, y = PAVE_H) {
    const g = new THREE.Group(); g.position.set(x, y, z); g.rotation.y = ry; G.add(g);
    const W = .56, L = .9, h0 = .45, h1 = .98, P = { parent: g };
    const b = (w, h, d, mat, px, py, pz) => kit.box(w, h, d, mat, Object.assign({ x: px, y: py, z: pz }, P));
    b(W, .015, L, mSteel, 0, h0, 0);                                     // basket floor
    [[-W / 2, 0], [W / 2, 0]].forEach(([px]) => { b(.018, .018, L, mSteel, px, h1, 0); b(.015, .015, L, mSteel, px, h0 + .26, 0); });
    [-L / 2, L / 2].forEach(pz => { b(W, .018, .018, mSteel, 0, h1, pz); b(W, .015, .015, mSteel, 0, h0 + .26, pz); });
    const nw = HI ? 6 : 2;
    for (let i = 0; i <= nw; i++) { const pz = -L / 2 + i * L / nw; [-W / 2, W / 2].forEach(px => b(.012, h1 - h0, .012, mSteel, px, h0, pz)); }
    for (let i = 0; i <= (HI ? 4 : 1); i++) { const px = -W / 2 + i * W / (HI ? 4 : 1); b(.012, h1 - h0, .012, mSteel, px, h0, L / 2); b(.012, h1 - h0, .012, mSteel, px, h0, -L / 2); }
    [-1, 1].forEach(s => { b(.025, h0, .025, mSteel, s * .2, .08, -L / 2 + .05); b(.025, .025, L - .1, mSteel, s * .2, .1, 0); });
    b(W + .04, .05, .05, mGreen, 0, h1 + .12, -L / 2 - .12); [-1, 1].forEach(s => b(.02, .16, .02, mSteel, s * (W / 2 - .02), h1, -L / 2 - .08));
    [[-.2, .38], [.2, .38], [-.2, -.38], [.2, -.38]].forEach(([px, pz]) => b(.04, .09, .09, mRubber, px, 0, pz));
    return g;
  }
  // trolley bay (nested trolleys under a little roof)
  { const x = 72.7, z0 = -3.2; box(1.5, .06, 4.8, mGreen, x, 2.2, z0 + 1.9); [[-0.7, -.4], [.7, -.4], [-.7, 4.2], [.7, 4.2]].forEach(([dx, dz]) => cyl(.04, .04, 2.2, mFrame, x + dx, PAVE_H, z0 + dz, { seg: 6 }));
    [-.7, .7].forEach(dx => box(.04, .04, 4.6, mSteel, x + dx, .9, z0 + 1.9));
    for (let i = 0; i < (HI ? 5 : 3); i++) trolley(x, z0 + .5 + i * .62, Math.PI);
    text([{ text: 'TROLLEYS', size: .1, weight: 800, color: '#fff' }], .9, .2, 200, { bg: GREEN_TXT, radius: .03 }, { x, y: 2.28, z: z0 + 4.33 });
    colB(x, z0 + 1.9, 1.6, 5.0); }
  trolley(74.3, 5.3, Math.PI / 2 + .25); trolley(75.1, 13.1, -Math.PI / 2 - .6);
  figure(73.5, 5.05, Math.PI / 2 + .25, { seed: 31, shirt: '#E07A2E', pants: '#2B3442', skin: '#C68A62', noCol: true }); colB(74.0, 5.2, 2.1, .9, .25);
  if (HI) figure(76.7, 12.1, Math.PI / 2, { seed: 32, shirt: '#14B8A6', pants: '#3A3A3A', skin: '#A86B47', noCol: true }); colB(75.6, 12.5, 2.2, 1.1, -.6);
  // bicycle stand
  if (HI) {
    const bike = (x, z, ry, c) => {
      const g = new THREE.Group(); g.position.set(x, PAVE_H, z); g.rotation.y = ry; G.add(g);
      const tor = new THREE.TorusGeometry(.33, .025, 6, 18); [-.52, .52].forEach(pz => { const m = new THREE.Mesh(tor, mRubber); m.position.set(0, .34, pz); m.rotation.y = Math.PI / 2; m.castShadow = true; g.add(m); });
      const fm = M.std(c, { rough: .4, metal: .3, map: null });
      rod([0, .34, -.52], [0, .62, -.05], .035, fm, g); rod([0, .62, -.05], [0, .34, .52], .035, fm, g); rod([0, .62, -.05], [0, .9, .38], .035, fm, g); rod([0, .62, -.05], [0, .88, -.18], .035, fm, g);
      kit.box(.1, .04, .22, mDark, { parent: g, y: .9, z: -.2 }); kit.box(.5, .03, .03, mDark, { parent: g, y: 1.02, z: .42 });
    };
    for (let i = 0; i < 4; i++) { const z = -8.2 + i * .9; rod([71.75, PAVE_H, z - .3], [71.75, .9, z - .3], .05, mSteel); rod([71.75, .9, z - .3], [71.75, .9, z + .3], .05, mSteel); rod([71.75, PAVE_H, z + .3], [71.75, .9, z + .3], .05, mSteel); }
    bike(72.0, -7.75, 0, '#3B6EA5'); bike(72.0, -5.95, 0, '#D6336C');
  }
  colB(72.0, -6.85, 1.2, 3.8);
  // planters along the forecourt edge
  const planter = (x, z, w, d) => { box(w, .45, d, M.concrete, x, PAVE_H, z); box(w - .2, .02, d - .2, mSoil, x, PAVE_H + .44, z, { cast: false }); colB(x, z, w, d); };
  planter(72.0, 17.6, 1.6, 3.0); kit.bush(72.0, 17.0, { s: .9 }); kit.bush(72.0, 18.3, { s: .8 });
  planter(79.0, 17.8, 1.8, 1.8); kit.bush(79.0, 17.8, { s: .9 });
  planter(72.0, -14.6, 1.6, 2.4); kit.bush(72.0, -14.6, { s: .9 });

  /* ---------- the live dashboard: an outdoor screen at the forecourt's north end ---------- */
  const dash = { SW: 6.4, SH: 3.6, cx: 75.6, y0: 2.0, z: -14.3 };
  const dashTex = kit.canvasTex(512, 288, (g, W, H) => drawDash(g, W, H), { repeat: false });
  {
    const { SW, SH, cx, y0, z } = dash;
    [-2.3, 2.3].forEach(dx => { box(.32, y0 + .6, .32, mSteel, cx + dx, PAVE_H, z - .45); box(.8, .3, .8, M.concrete, cx + dx, PAVE_H, z - .45); colC(cx + dx, z - .45, .5); });
    rbox(SW + .5, SH + .5, .4, .06, mWhite, cx, y0 - .25, z - .3);
    box(SW + .14, SH + .14, .06, mFrame, cx, y0 - .07, z - .07);
    const sm = new THREE.MeshBasicMaterial({ map: dashTex, toneMapped: false, color: new THREE.Color(.93, .93, .93) });
    const scr = new THREE.Mesh(new THREE.PlaneGeometry(SW, SH), sm); scr.position.set(cx, y0 + SH / 2, z - .03); G.add(scr);
    box(SW + .9, .14, 1.1, mWhite, cx, y0 + SH + .25, z - .3); box(SW + .9, .12, .05, mGreen, cx, y0 + SH + .25, z + .25);
    text([{ text: 'LIVE WRITE-OFF DASHBOARD', size: .16, weight: 800, color: '#fff' }], 3.4, .3, 150, { bg: GREEN_TXT, radius: .05 }, { x: cx, y: y0 - .62, z: z - .08 });
    box(SW + .4, .02, 1.6, M.tiles, cx, PAVE_H, z + 1.2, { cast: false });
    colB(cx, z - .3, SW + .6, .9);
    kit.bench(cx - 1.6, -10.6, { ry: Math.PI }); kit.bench(cx + 1.6, -10.6, { ry: Math.PI }); colB(cx - 1.6, -10.55, 1.9, .7); colB(cx + 1.6, -10.55, 1.9, .7);
    if (HI) figure(cx + 1.4, -10.4, Math.PI, { seed: 41, pose: 'sit', shirt: '#7C5CFF', pants: '#2B3442', skin: '#E0B08A', noCol: true }, 0);
  }
  // animated bits on the screen: a "ping" ring hopping between cities and a blinking LIVE dot
  const toScreen = (px, py, v) => v.set(dash.cx + (px / 512 - .5) * dash.SW, dash.y0 + (1 - py / 288) * dash.SH, dash.z - .015);
  const pingMat = new THREE.MeshBasicMaterial({ color: '#4E9A12', transparent: true, depthWrite: false, toneMapped: false });
  const ping = new THREE.Mesh(new THREE.RingGeometry(.07, .11, 24), pingMat); ping.userData.dynamic = true; G.add(ping);
  const liveDot = new THREE.Mesh(new THREE.CircleGeometry(.055, 16), new THREE.MeshBasicMaterial({ color: '#FF5A4A', toneMapped: false })); liveDot.userData.dynamic = true; G.add(liveDot);
  toScreen(454, 17, liveDot.position);
  const cityWorld = CITIES.map(([nx, ny]) => toScreen(MAP.x + nx * MAP.w, MAP.y + ny * MAP.h, new THREE.Vector3()));

  /* ---------- lawn strip by the entrance: wayfinding totem, trees ---------- */
  {
    const x = 69.4, z = -.2, ry = -Math.PI / 2 + .55;
    const g = new THREE.Group(); g.position.set(x, 0, z); g.rotation.y = ry; G.add(g);
    kit.box(1.9, .3, .7, M.concrete, { parent: g }); kit.rbox(1.6, 4.4, .36, .06, mGreen, { parent: g, y: .3 });
    const tot = panel(1.42, 4.0, 110, (g2, W, H, k) => {
      g2.fillStyle = '#FFFFFF'; g2.beginPath(); g2.roundRect(0, 0, W, H, .05 * k); g2.fill();
      g2.fillStyle = GREEN; g2.beginPath(); g2.roundRect(0, 0, W, .95 * k, [.05 * k, .05 * k, 0, 0]); g2.fill();
      g2.fillStyle = '#fff'; g2.textAlign = 'center'; g2.textBaseline = 'middle'; g2.font = `800 ${.3 * k}px ${FONT}`; g2.fillText('BigBasket', W / 2, .38 * k);
      g2.font = `600 ${.11 * k}px ${FONT}`; g2.fillText('store  ·  dark store', W / 2, .72 * k);
      [['The store', '→'], ['Fresh aisle', '↘'], ['Live dashboard', '↗'], ['Returns dock', '→'], ['Bin audit', '→'], ['Loading dock', '↘']].forEach(([t, a], i) => {
        const y = (1.25 + i * .45) * k; g2.fillStyle = INK; g2.textAlign = 'left'; g2.font = `700 ${.13 * k}px ${FONT}`; g2.fillText(t, .12 * k, y);
        g2.textAlign = 'right'; g2.fillStyle = GREEN_TXT; g2.font = `800 ${.18 * k}px ${FONT}`; g2.fillText(a, W - .12 * k, y);
        g2.fillStyle = '#E4E8DF'; g2.fillRect(.12 * k, y + .2 * k, W - .24 * k, .012 * k);
      });
    });
    tot({ parent: g, y: .5, z: .185 });
    colC(x, z, 1.0);
    [[67.6, -14], [69.8, -10.2], [67.6, -6.2]].forEach(([tx, tz], i) => { kit.tree(tx, tz, { s: 1 + i * .08 }); colC(tx, tz, .45); });
    for (let zz = -15; zz < -1; zz += 1.6) kit.bush(70.2, zz + R() * .4, { s: .7 });
    kit.bush(67.8, -2.2, { s: 1 }); kit.bush(68.9, -3.4, { s: .8 });
  }
  // lamps
  [[71.6, -11.5, Math.PI / 2], [71.6, -.5, Math.PI / 2], [71.6, 15.6, Math.PI / 2], [83.0, 24.6, Math.PI], [91.8, 24.6, Math.PI], [99.4, 30.9, 0], [103.4, -15.4, -Math.PI / 2], [96.4, 13.0, -Math.PI / 2]].forEach(([x, z, ry]) => { kit.lamp(x, z, { ry }); colC(x, z, .25); });
  // north path trees + hedges
  [[83.5, -14.8], [89.5, -14.8], [94.6, -14.8]].forEach(([x, z]) => { kit.tree(x, z, { s: .9 }); colC(x, z, .45); });
  for (let x = 81; x < 96; x += 1.5) kit.bush(x + .7, -15.6, { s: .6 });

  /* =====================================================================================
     DARK STORE / MINI DC  (x 103..117, z -16..15)
     ===================================================================================== */
  const DX0 = 103, DX1 = 117, DZ0b = -16, DZ1b = 15, DCX = 110, DCZ = -.5, DH = 8.5;
  box(14, .2, 31, M.concrete, DCX, 0, DCZ);
  box(14, DH - .2, .3, mClad, DCX, .2, DZ0b + .15); box(.3, DH - .2, 31, mClad, DX1 - .15, .2, DCZ); box(14, DH - .2, .3, mClad, DCX, .2, DZ1b - .15);
  const OPZ0 = -14, OPZ1 = 3;                                                // open bay on the west side
  box(.3, DH - .2, 2, mClad, DX0 + .15, .2, -15); box(.3, DH - .2, 12, mClad, DX0 + .15, .2, 9); box(.3, 1.8, OPZ1 - OPZ0, mClad, DX0 + .15, 6.7, (OPZ0 + OPZ1) / 2);
  // concrete skirts, green band, coping, roof
  box(14.1, 1.1, .36, mSkirt, DCX, 0, DZ0b + .15); box(.36, 1.1, 31.1, mSkirt, DX1 - .15, 0, DCZ);
  box(.36, 1.1, 2.1, mSkirt, DX0 + .15, 0, -15); box(.36, 1.1, 12.1, mSkirt, DX0 + .15, 0, 9);
  box(14.4, .42, .4, mGreen, DCX, 7.6, DZ1b - .15); box(.4, .42, 31.4, mGreen, DX0 + .15, 7.6, DCZ);
  box(14.5, .16, .5, mCoping, DCX, DH, DZ1b - .15); box(14.5, .16, .5, mCoping, DCX, DH, DZ0b + .15); box(.5, .16, 31.4, mCoping, DX0 + .15, DH, DCZ); box(.5, .16, 31.4, mCoping, DX1 - .15, DH, DCZ);
  box(13.5, .2, 30.5, mRoofDC, DCX, 8.1, DCZ, { cast: false });
  [106.5, 110, 113.5].forEach(x => box(1.2, .16, 26, mSky, x, 8.3, DCZ));
  if (HI) [[108.2, -12], [111.8, -12], [108.2, 10], [111.8, 6]].forEach(([x, z]) => { rbox(1.4, .9, 1.0, .05, M.std('#E2E2DE', { rough: .5 }), x, 8.3, z); cyl(.32, .32, .04, mDark, x, 9.2, z, { seg: 14 }); });
  // open bay: columns, header beam, rolled-up door drums
  [OPZ0, -8.33, -2.67, OPZ1].forEach(z => box(.36, 6.6, .36, mSteel, DX0 + .15, .2, z));
  box(.44, .42, OPZ1 - OPZ0 + .4, mSteel, DX0 + .15, 6.3, (OPZ0 + OPZ1) / 2);
  for (let i = 0; i < 3; i++) { const a = OPZ0 + i * (OPZ1 - OPZ0) / 3 + .25; cyl(.3, .3, (OPZ1 - OPZ0) / 3 - .5, mClad, DX0 + .05, 5.95, a, { rx: Math.PI / 2, seg: 12 }); }
  text([{ text: 'BIN AUDIT ZONE  ·  500 SKUs CHECKED DAILY', size: .2, weight: 800, color: '#fff' }], 6.4, .44, 110, { bg: GREEN_TXT, radius: .05 }, { x: DX0 - .08, y: 7.05, z: -5.5, ry: -Math.PI / 2 });
  // interior: floor lines, light strips, racking with bins
  [105.75, 108.85, 111.95, 115.2].forEach(x => paint(x, (OPZ0 + OPZ1) / 2, .1, 16.6, '#F2C230', 0, .2));
  paint(104.0, -5.5, .1, 17, '#F2C230', 0, .2);
  [105.8, 108.9, 112, 115.2].forEach(x => box(.18, .06, 16, mLight, x, 7.95, -5.5, { cast: false }));
  function rack(xc, z0, z1, labels, density = 1) {
    const D = 1.0, top = 6.1, n = 6, bay = (z1 - z0) / n, lv = [0, 1.3, 2.6, 3.9, 5.2], base = .2;
    for (let k = 0; k <= n; k++) { const z = z0 + k * bay; [-1, 1].forEach(s => box(.09, top, .09, mRackBlue, xc + s * D / 2, base, z)); if (HI) rod([xc - D / 2, base + .3, z], [xc + D / 2, base + 2.4, z], .04, mRackBlue); }
    for (const ly of lv) [-1, 1].forEach(s => box(.07, .13, z1 - z0, mRackOrange, xc + s * D / 2, base + ly, (z0 + z1) / 2));
    for (const ly of lv) for (let k = 0; k < n; k++) for (let j = 0; j < 4; j++) {
      if (R() > density) continue;
      const zc = z0 + k * bay + (j + .5) * bay / 4, c = R.pick(['#3B82F6', '#3B82F6', '#7DB928', '#7DB928', '#9AA3AD', '#F2B705', '#F4F4F0']);
      const hh = R.range(.26, .36); ib(xc, base + ly + .13, zc, .86, hh, bay / 4 - .08, c);
      if (labels) ib(xc - .435, base + ly + .13 + hh * .45, zc, .012, .09, .2, R() < .92 ? '#FFFFFF' : '#E0473A');
    }
  }
  rack(104.3, OPZ0 + .3, OPZ1 - .3, true); rack(107.4, OPZ0 + .3, OPZ1 - .3, HI);
  if (HI) { rack(110.5, OPZ0 + .3, OPZ1 - .3, false, .85); rack(113.6, OPZ0 + .3, OPZ1 - .3, false, .7); }
  // back of the dark store (behind the racks): pallet rows
  for (let i = 0; i < (HI ? 4 : 2); i++) pallet(108 + i * 2.4, 6.8, 0, i % 2 ? 'wrap' : 'crates', .2);
  // a picker with a trolley in the first aisle
  if (HI) figure(105.85, -6.5, Math.PI, Object.assign({ seed: 51, skin: '#6E4530', noCol: true }, STAFF), .2);
  if (HI) { box(.6, .06, 1.0, mSteel, 105.85, .45, -7.4); for (let i = 0; i < 2; i++) ib(105.85, .5 + i * .3, -7.4, .5, .28, .8, i ? '#3B82F6' : GREEN); }

  // supervisor with a tablet + checklist board in the lane (spot 'audit')
  figure(101.2, -6.6, Math.PI / 2 - .5, { seed: 52, shirt: '#F2F2F2', pants: '#2B3442', skin: '#A86B47', tablet: true, helmet: GREEN });
  {
    const bx = 101.6, bz = -10.6, ry = -Math.PI / 2 + .55;
    const g = new THREE.Group(); g.position.set(bx, PAVE_H, bz); g.rotation.y = ry; G.add(g);
    [-1.3, 1.3].forEach(dx => { kit.box(.07, 2.6, .07, mFrame, { parent: g, x: dx }); kit.box(.5, .05, .5, mFrame, { parent: g, x: dx }); });
    kit.box(2.75, 1.8, .06, mWhite, { parent: g, y: .75, z: -.02 });
    const board = panel(2.6, 1.68, 140, (c, W, H, k) => {
      c.fillStyle = '#FFFFFF'; c.fillRect(0, 0, W, H);
      c.fillStyle = GREEN; c.fillRect(0, 0, W, .3 * k); c.fillStyle = '#fff'; c.textBaseline = 'middle'; c.textAlign = 'left';
      c.font = `800 ${.16 * k}px ${FONT}`; c.fillText('BIN AUDIT · TODAY', .1 * k, .155 * k);
      c.textAlign = 'right'; c.font = `700 ${.12 * k}px ${FONT}`; c.fillText('500 SKUs', W - .1 * k, .155 * k);
      [['Zone A · ambient', '125 / 125', true], ['Zone B · chilled', '125 / 125', true], ['Zone C · fresh', '125 / 125', true], ['Zone D · staples', '85 / 125', false]].forEach(([t, v, ok], i) => {
        const y = (.46 + i * .22) * k; c.textAlign = 'left'; c.fillStyle = INK; c.font = `600 ${.11 * k}px ${FONT}`; c.fillText(t, .36 * k, y);
        c.textAlign = 'right'; c.fillStyle = '#59616B'; c.fillText(v, W - .12 * k, y);
        c.strokeStyle = '#C9CED6'; c.lineWidth = .012 * k; c.strokeRect(.1 * k, y - .08 * k, .16 * k, .16 * k);
        if (ok) tick(c, .11 * k, y - .1 * k, .16 * k, '#4E9A12'); else { c.fillStyle = '#F2B705'; c.fillRect(.14 * k, y - .04 * k, .08 * k, .08 * k); }
      });
      const y = 1.36 * k; c.fillStyle = '#E8ECE3'; c.fillRect(.1 * k, y, W - .2 * k, .14 * k); c.fillStyle = GREEN; c.fillRect(.1 * k, y, (W - .2 * k) * .92, .14 * k);
      c.fillStyle = INK; c.textAlign = 'left'; c.font = `800 ${.12 * k}px ${FONT}`; c.fillText('92% completion', .1 * k, 1.6 * k);
      c.textAlign = 'right'; c.fillStyle = '#59616B'; c.font = `600 ${.09 * k}px ${FONT}`; c.fillText('supervisor-led daily checks', W - .1 * k, 1.6 * k);
    });
    board({ parent: g, y: .81, z: .015 });
    colB(bx, bz, 2.9, .9, ry);
  }

  /* ---------- returns dock (spot 'returns') on the dark store's west wall ---------- */
  {
    const wx = DX0;                                     // wall face
    // counter hatch with half-raised shutter
    box(.1, 2.0, 2.6, mFrame, wx - .02, .9, 8.0); box(.06, 1.2, 2.2, mInterior, wx - .05, 1.05, 8.0); box(.06, .7, 2.2, slatM, wx - .06, 2.2, 8.0);
    box(.6, .08, 2.6, mSteel, wx - .3, 1.0, 8.0); box(.5, .9, 2.4, mWhite, wx - .25, PAVE_H, 8.0);
    box(.25, .14, .3, mDark, wx - .35, 1.08, 8.6); box(.2, .03, .14, M.emit('#DFF1C8', 1), wx - .35, 1.22, 8.6);
    for (let i = 0; i < 3; i++) ib(wx - .32, 1.08, 7.35 + i * .02, .38, .22, .5, '#C49A6C');
    text([{ text: 'RETURNS', size: .36, weight: 800, color: INK }, { text: 'Return to vendor (RTV)  ·  logged daily', size: .14, weight: 700, color: '#3A3F46' }], 3.6, .86, 110, { bg: '#F2B705', radius: .06 }, { x: wx - .06, y: 3.1, z: 9.0, ry: -Math.PI / 2 });
    // RETURNS cage
    const cx0 = wx - 1.75, cx1 = wx - .05, cz0 = 10.4, cz1 = 13.4, ch = 2.1;
    [[cx0, cz0], [cx0, cz1], [cx1, cz0], [cx1, cz1]].forEach(([x, z]) => box(.06, ch, .06, mYellow, x, PAVE_H, z));
    [PAVE_H + .05, PAVE_H + ch - .04].forEach(y => { box(.05, .05, cz1 - cz0, mYellow, cx0, y, (cz0 + cz1) / 2); box(cx1 - cx0, .05, .05, mYellow, (cx0 + cx1) / 2, y, cz0); box(cx1 - cx0, .05, .05, mYellow, (cx0 + cx1) / 2, y, cz1); });
    box(cx1 - cx0, .03, cz1 - cz0, mSteel, (cx0 + cx1) / 2, PAVE_H + ch, (cz0 + cz1) / 2);
    const bars = HI ? .14 : .4;
    for (let z = cz0 + bars; z < cz1 - .05; z += bars) box(.015, ch, .015, mSteel, cx0, PAVE_H, z);
    for (let x = cx0 + bars; x < cx1 - .05; x += bars) { box(.015, ch, .015, mSteel, x, PAVE_H, cz0); box(.015, ch, .015, mSteel, x, PAVE_H, cz1); }
    for (const y of [.7, 1.4]) box(.02, .02, cz1 - cz0, mSteel, cx0, PAVE_H + y, (cz0 + cz1) / 2);
    text([{ text: 'RETURNS', size: .14, weight: 800, color: INK }], 1.1, .3, 180, { bg: '#F2B705', radius: .03 }, { x: cx0 - .03, y: 1.3, z: (cz0 + cz1) / 2, ry: -Math.PI / 2 });
    // inside the cage: mixed crates and damaged cartons
    const cc = ['#7DB928', '#3B82F6', '#9AA3AD', '#E0473A'];
    for (let i = 0; i < 4; i++) for (let j = 0; j < (i < 2 ? 4 : 3); j++) ib(cx0 + .5 + (i % 2) * .7, PAVE_H + j * .3, cz0 + .6 + Math.floor(i / 2) * 1.5 + (j % 2) * .06, .55, .28, .4, cc[(i + j) % 4], (j % 2) * .1);
    ib(cx0 + .5, PAVE_H, cz0 + 2.3, .6, .5, .5, '#C49A6C', .2); ib(cx0 + .55, PAVE_H + .5, cz0 + 2.3, .5, .35, .45, '#B88F5C', -.3);
    colB((cx0 + cx1) / 2, (cz0 + cz1) / 2, cx1 - cx0 + .2, cz1 - cz0 + .2);
    colB(wx - .3, 8.0, .7, 2.7);
    // stacked crates beside the hatch, an RTV pallet
    for (let s = 0; s < 3; s++) for (let j = 0; j < (s === 1 ? 5 : 4); j++) ib(wx - .45, PAVE_H + j * .29, 4.9 + s * .5, .6, .28, .42, s === 1 ? '#3B82F6' : GREEN);
    colB(wx - .45, 5.4, .8, 1.7);
    pallet(wx - 1.2, 3.4, Math.PI / 2, 'cards', PAVE_H); colB(wx - 1.2, 3.4, 1.2, 1.4);
    text([{ text: 'RTV', size: .12, weight: 800, color: '#fff' }], .4, .2, 200, { bg: '#E0473A', radius: .03 }, { x: wx - 1.82, y: .75, z: 3.4, ry: -Math.PI / 2 });
    figure(100.8, 8.3, Math.PI / 2 - .35, Object.assign({ seed: 61, skin: '#C68A62', clip: true }, STAFF));
  }

  /* ---------- loading dock (spot 'dock') on the dark store's south face ---------- */
  const DOCK_H = 1.05, PZ = 17.2, doors = [106, 110.5, 114.9];
  box(13.7, DOCK_H, PZ - DZ1b, M.concrete, 110.15, 0, (DZ1b + PZ) / 2); box(13.7, .05, .16, mYellow, 110.15, DOCK_H, PZ - .08);
  for (let i = 0; i < 3; i++) box(1.0, DOCK_H - i * .35, .4, M.concrete, 102.8, 0, PZ - .35 - i * .4);
  colB(110.15, (DZ1b + PZ) / 2, 13.8, PZ - DZ1b + .1); colB(102.8, 16.5, 1.1, 1.3);
  doors.forEach((xd, i) => {
    const open = i === 1;
    [-1.75, 1.75].forEach(dx => box(.3, 3.75, .3, mFrame, xd + dx, DOCK_H, DZ1b + .1)); box(3.8, .35, .3, mFrame, xd, DOCK_H + 3.55, DZ1b + .1);
    if (open) { box(3.2, 3.45, .04, mInterior, xd, DOCK_H, DZ1b + .02); cyl(.32, .32, 3.2, mClad, xd - 1.6, DOCK_H + 3.85, DZ1b + .3, { rz: -Math.PI / 2, seg: 12 }); box(2.2, .05, 1.0, mSteel, xd, DOCK_H - .02, PZ + .3); }
    else box(3.2, 3.45, .05, slatM, xd, DOCK_H, DZ1b + .03);
    [-1.25, 1.25].forEach(dx => box(.28, .42, .16, mRubber, xd + dx, .45, PZ + .08));
    text([{ text: String(i + 1), size: .32, weight: 800, color: INK }], .55, .55, 160, { bg: '#F2B705', radius: .06 }, { x: xd + 1.15, y: DOCK_H + 3.0, z: DZ1b + .28 });
  });
  // crates on the platform by the open door, a dock hand carrying one
  for (let s = 0; s < 3; s++) for (let j = 0; j < 3; j++) ib(108.0 + (s % 2) * .5, DOCK_H + j * .29, 15.6 + Math.floor(s / 2) * .55, .44, .28, .6, j % 2 ? '#3B82F6' : GREEN);
  if (HI) figure(112.6, 16.2, Math.PI / 2 + .4, Object.assign({ seed: 71, skin: '#8D5A3B', crate: GREEN, noCol: true }, STAFF), DOCK_H);
  // dock canopy + lettering
  box(14.2, .2, 2.5, mYellow, DCX, 5.25, 16.2); box(14.2, .38, .12, mGreen, DCX, 5.1, 17.45);
  [103.8, 116.2].forEach(x => rod([x, 7.2, DZ1b], [x, 5.45, 17.4], .05, mSteel));
  text([{ text: 'BigBasket  ·  Dark store', size: .6, weight: 800, color: '#fff' }], 9.4, 1.0, 64, { bg: GREEN_TXT, radius: .08 }, { x: DCX, y: 6.15, z: DZ1b + .02 });
  // the van at door 2, rear to the dock, "BigBasket" in plain type on its sides
  kit.van({ x: 110.5, z: 19.75, color: '#F7F7F4', stripe: GREEN, parent: G });
  const vanTxt = text([{ text: 'BigBasket', size: .42, weight: 800, color: GREEN_TXT }], 2.9, .6, 100, {});
  vanTxt({ x: 111.51, y: 1.62, z: 19.05, ry: Math.PI / 2 }); vanTxt({ x: 109.49, y: 1.62, z: 19.05, ry: -Math.PI / 2 });
  colB(110.5, 19.75, 2.3, 5.3);
  // pallets in the yard
  pallet(104.6, 18.4, 0, 'crates', .04); colB(104.6, 18.4, 1.3, 1.1);
  pallet(113.9, 18.6, .1, 'wrap', .04); colB(113.9, 18.6, 1.3, 1.2);
  if (HI) { pallet(116.0, 17.4, 0, 'empty', .04); pallet(116.0, 17.4, 0, 'empty', .2); pallet(116.0, 17.4, 0, 'empty', .36); }
  colB(116.0, 17.4, 1.3, 1.1);
  // pallet jack
  { const g = new THREE.Group(); g.position.set(107.4, .04, 18.9); g.rotation.y = .4; G.add(g);
    [-.25, .25].forEach(dx => kit.box(.16, .08, 1.15, mRackOrange, { parent: g, x: dx, z: .2 })); kit.box(.6, .5, .25, mRackOrange, { parent: g, y: .05, z: -.45 });
    kit.box(.05, 1.1, .05, mDark, { parent: g, y: .5, z: -.5, rx: -.35 }); kit.box(.3, .05, .05, mDark, { parent: g, y: 1.5, z: -.85 }); colC(107.4, 18.9, .7); }

  /* ---------- EV scooter row with charging canopy ---------- */
  {
    const xr = 115.5, zs = [20.6, 22.1, 23.6, 25.1, 26.6, 28.1, 29.6];
    box(1.5, .1, 10.8, mWhite, 116.3, 2.75, 25.1); box(.08, .3, 10.8, mGreen, 115.55, 2.6, 25.1);
    [19.9, 25.1, 30.3].forEach(z => { box(.12, 2.75, .12, mFrame, 116.9, .04, z); colC(116.9, z, .2); });
    text([{ text: 'DELIVERY SCOOTERS  ·  EV CHARGING', size: .13, weight: 800, color: '#fff' }], 3.6, .26, 160, { bg: GREEN_TXT, radius: .03 }, { x: 115.49, y: 2.62, z: 25.1, ry: -Math.PI / 2 });
    zs.forEach((z, i) => {
      if (i === 3) return;                                         // the empty bay belongs to the scooter that's out on a run
      kit.scooter({ x: xr, z, ry: -Math.PI / 2, color: GREEN, boxColor: '#F7F7F4', parent: G });
      box(.22, 1.1, .2, mWhite, 116.85, .04, z); box(.05, .05, .02, M.emit(GREEN, 1.4), 116.73, .9, z, { cast: false });
    });
    paint(xr, 25.1, 2.6, .1, '#F4F4F0', 0, .05);
    zs.forEach(z => paint(xr, z + .75, 2.4, .08, '#F4F4F0', 0, .05));
    colB(115.7, 25.1, 2.7, 10.6);
    // riders between runs
    figure(113.6, 21.6, -Math.PI / 2 + .6, Object.assign({ seed: 81, skin: '#A86B47', helmet: '#F7F7F4' }, STAFF));
    if (HI) {
      figure(113.3, 27.7, -Math.PI / 2 - .4, Object.assign({ seed: 82, skin: '#6E4530', helmet: GREEN, tablet: true }, STAFF));
      const sg = new THREE.Group(); sg.position.set(xr, 0, 23.6 + 1.5 * 0); G.add(sg);
      figure(xr + .15, 22.1, -Math.PI / 2, Object.assign({ seed: 83, skin: '#C68A62', pose: 'sit', helmet: GREEN, noCol: true }, STAFF), .38);
    }
  }

  /* ---------- customer parking ---------- */
  kit.car({ x: 72.5, z: 22.3, ry: Math.PI, color: '#E5E5E2', parent: G }); colB(72.5, 22.3, 2.0, 4.6);
  kit.car({ x: 78.5, z: 22.5, ry: Math.PI, color: '#3A6EA5', parent: G }); colB(78.5, 22.5, 2.0, 4.6);
  text([{ text: 'P  Customer parking', size: .1, weight: 700, color: '#fff' }], 1.3, .24, 200, { bg: '#3B6EA5', radius: .03 }, { x: 75.5, y: 1.9, z: 19.35, ry: Math.PI });
  [-.5, .5].forEach(d => cyl(.03, .03, 2.0, mFrame, 75.5 + d, PAVE_H, 19.3, { seg: 6 }));

  /* =====================================================================================
     finish: instanced meshes, the moving scooter, bake
     ===================================================================================== */
  function pallet(x, z, ry, load, y = .04) {
    const g = new THREE.Group(); g.position.set(x, y, z); g.rotation.y = ry; G.add(g);
    kit.box(1.2, .03, 1.0, mWood, { parent: g, y: .11 }); [-.44, 0, .44].forEach(dz => kit.box(1.2, .11, .12, mWood, { parent: g, z: dz }));
    const wx = (lx, lz) => [x + lx * Math.cos(ry) + lz * Math.sin(ry), z - lx * Math.sin(ry) + lz * Math.cos(ry)];
    if (load === 'crates') for (let i = 0; i < 2; i++) for (let j = 0; j < 2; j++) for (let k = 0; k < 3; k++) { const [px, pz] = wx(-.3 + i * .6, -.24 + j * .48); ib(px, y + .14 + k * .29, pz, .56, .28, .44, (i + j + k) % 3 ? GREEN : '#3B82F6', ry); }
    if (load === 'wrap') { kit.box(1.16, 1.15, .96, mCard, { parent: g, y: .14 }); kit.box(1.19, 1.12, .99, mWrap, { parent: g, y: .155 }); }
    if (load === 'cards') for (let k = 0; k < 3; k++) for (let i = 0; i < 2; i++) { const [px, pz] = wx(-.28 + i * .56, 0); ib(px, y + .14 + k * .34, pz, .52, .33, .9 - k * .05, k === 2 && i ? '#B88F5C' : '#C49A6C', ry + (k === 2 ? .15 : 0)); }
    return g;
  }
  // instanced goods/bins/crates/tags (one draw call) and produce (one draw call)
  const instMat = new THREE.MeshStandardMaterial({ color: '#ffffff', roughness: .65 });
  const prodMat = new THREE.MeshStandardMaterial({ color: '#ffffff', roughness: .5, flatShading: true });
  const inst = (geo, mat, list) => {
    const im = new THREE.InstancedMesh(geo, mat, list.length), m4 = new THREE.Matrix4(), q = new THREE.Quaternion(), e = new THREE.Euler(), p = new THREE.Vector3(), s = new THREE.Vector3(), c = new THREE.Color();
    list.forEach((b, i) => { q.setFromEuler(e.set(0, b[7], 0)); m4.compose(p.set(b[0], b[1], b[2]), q, s.set(b[3], b[4], b[5])); im.setMatrixAt(i, m4); im.setColorAt(i, c.set(b[6])); });
    im.castShadow = im.receiveShadow = true; im.computeBoundingSphere(); im.computeBoundingBox && im.computeBoundingBox(); G.add(im); return im;
  };
  { const g = new THREE.BoxGeometry(1, 1, 1); g.translate(0, .5, 0); inst(g, instMat, IB); }
  inst(new THREE.DodecahedronGeometry(1, 0), prodMat, IP);

  // the delivery scooter that rides out of the yard, along the service road, U-turns and comes back (drives on the left)
  const rider = new THREE.Group(); rider.userData.dynamic = true; G.add(rider);
  kit.scooter({ parent: rider, color: GREEN, boxColor: '#F7F7F4' });
  { const p = kit.person({ parent: rider, pose: 'sit', seed: 91, skin: '#8D5A3B', shirt: GREEN, pants: '#2B3442', y: .38, z: -.22 }); kit.sphere(.15, M.std(GREEN, { rough: .35, map: null }), { parent: rider, y: .38 + p.userData.height - .27, z: -.22, seg: 12, seg2: 8 }); }
  kit.bake(rider);
  const V = (x, z) => new THREE.Vector3(x, .04, z);
  const route = new THREE.CatmullRomCurve3([V(104, 29.6), V(92, 29.7), V(80, 29.7), V(71, 29.6), V(67.7, 28.4), V(71, 26.7), V(80, 26.6), V(92, 26.6), V(102, 26.4), V(108.5, 25.6), V(111.6, 27.6), V(109.6, 29.9)], true, 'catmullrom', .5);
  const routeLen = route.getLength(), tmpP = new THREE.Vector3(), tmpT = new THREE.Vector3();
  let u = 0;

  atlTex.needsUpdate = true;
  if (low) {
    // phone tier: fold near-identical materials together so the district lands under ~60 draw calls
    const fold = new Map([[mCoping, mWhite], [mCream, mWhite], [mWhiteFab, mWhite], [mClad, mWhite], [mShelf, mWhite], [mWrap, mWhite], [mSky, mWhite], [M.white, mWhite],
      [mGreenFab, mGreen], [mKerb, mSkirt], [M.concrete, mSkirt], [M.tiles, mSkirt], [mCrateWood, mWood], [mCard, mWood], [mSoil, mWood], [mInterior, mDark], [mFrame, mDark], [mRubber, mDark],
      [mRackOrange, mYellow], [mSteel, mSkirt], [M.std(GREEN, { map: null }), mGreen], [M.std('#24272C', { map: null, rough: .5 }), mDark], [M.std('#C9CDD3', { rough: .3, metal: .8, map: null }), mSkirt], [M.std('#E2E2DE', { rough: .5 }), mWhite]]);
    G.traverse(o => { if (!o.isMesh || o.isInstancedMesh || !o.material) return; if (fold.has(o.material)) o.material = fold.get(o.material); if (o.material.isMeshStandardMaterial && !o.material.polygonOffset) o.castShadow = true; });
  }
  kit.bake(G);

  const spots = [
    { id: 'main', x: 75.2, z: 8, y: 5.2 },
    { id: 'shelves', x: 91.3, z: 21.3, y: 4.6 },
    { id: 'returns', x: 99.3, z: 9.8, y: 4.4 },
    { id: 'dashboard', x: 75.6, z: -8.6, y: 3.4 },
    { id: 'audit', x: 99.2, z: -5.6, y: 4.4 },
    { id: 'dock', x: 106.0, z: 21.6, y: 4.2 },
  ];

  let pingCity = -1;
  return {
    group: G, colliders: C, spots,
    update(dt, t) {
      // scooter loop
      u = (u + dt * 5.2 / routeLen) % 1;
      route.getPointAt(u, tmpP); route.getTangentAt(u, tmpT);
      rider.position.copy(tmpP); rider.rotation.y = Math.atan2(tmpT.x, tmpT.z);
      // dashboard: a ping ring hopping between the 22 cities, and the LIVE dot blinking
      const cyc = t / 1.4, k = Math.floor(cyc), ph = cyc - k;
      if (k !== pingCity) { pingCity = k; ping.position.copy(cityWorld[(k * 7) % cityWorld.length]); }
      const s = 1 + ph * 2.6; ping.scale.set(s, s, 1); pingMat.opacity = 1 - ph;
      liveDot.visible = (t % 1.2) < .75;
    },
  };
}

/* ---------------- the dashboard picture (512 x 288 canvas) ---------------- */
// India-ish silhouette (abstract), normalised 0..1 (x east, y south)
const INDIA = [[.36, .0], [.45, .04], [.47, .12], [.53, .2], [.6, .26], [.7, .28], [.78, .3], [.84, .25], [.96, .28], [.93, .36], [.84, .38], [.8, .44], [.74, .44], [.72, .5],
  [.66, .56], [.6, .62], [.56, .7], [.5, .8], [.47, .9], [.43, .98], [.39, .9], [.35, .8], [.31, .68], [.27, .58], [.2, .55], [.12, .5], [.14, .44], [.22, .41], [.2, .33], [.26, .25], [.3, .17], [.33, .08]];
const CITIES = [[.4, .28], [.3, .6], [.42, .8], [.5, .79], [.45, .66], [.7, .47], [.33, .63], [.26, .46], [.35, .33], [.5, .33], [.39, .2], [.38, .9], [.41, .86], [.39, .83],
  [.58, .64], [.63, .55], [.62, .38], [.36, .48], [.45, .52], [.28, .52], [.84, .33], [.29, .49]];
const MAP = { x: 22, y: 52, w: 176, h: 222 };
function drawDash(g, W, H) {
  const F = (w, s) => `${w} ${s}px ${FONT}`;
  g.fillStyle = '#F6F9F1'; g.fillRect(0, 0, W, H);
  g.fillStyle = GREEN; g.fillRect(0, 0, W, 34);
  g.fillStyle = '#fff'; g.textBaseline = 'middle'; g.textAlign = 'left'; g.font = F(800, 16); g.fillText('SKU WRITE-OFF  ·  22 CITIES', 12, 18);
  g.textAlign = 'right'; g.font = F(800, 13); g.fillText('LIVE', W - 12, 18);
  const card = (x, y, w, h) => { g.fillStyle = '#FFFFFF'; g.beginPath(); g.roundRect(x, y, w, h, 8); g.fill(); g.strokeStyle = '#E1E8D8'; g.lineWidth = 1; g.stroke(); };
  card(8, 42, 200, 238);
  // dot-matrix map
  const inside = (px, py) => { let c = false; for (let i = 0, j = INDIA.length - 1; i < INDIA.length; j = i++) { const [xi, yi] = INDIA[i], [xj, yj] = INDIA[j]; if ((yi > py) !== (yj > py) && px < (xj - xi) * (py - yi) / (yj - yi) + xi) c = !c; } return c; };
  g.fillStyle = '#D3DEC6';
  for (let y = 0; y <= 1; y += 6 / MAP.h) for (let x = 0; x <= 1; x += 6 / MAP.w) if (inside(x, y)) { g.beginPath(); g.arc(MAP.x + x * MAP.w, MAP.y + y * MAP.h, 1.7, 0, 7); g.fill(); }
  CITIES.forEach(([x, y], i) => { const px = MAP.x + x * MAP.w, py = MAP.y + y * MAP.h; g.fillStyle = 'rgba(125,185,40,.22)'; g.beginPath(); g.arc(px, py, 8, 0, 7); g.fill(); g.fillStyle = i % 9 === 4 ? '#F2B705' : '#5E9E1A'; g.beginPath(); g.arc(px, py, 3.6, 0, 7); g.fill(); g.strokeStyle = '#fff'; g.lineWidth = 1.2; g.stroke(); });
  g.fillStyle = '#59616B'; g.textAlign = 'left'; g.font = F(700, 11); g.fillText('22 cities · updated same day', 16, 60);
  // chart
  card(216, 42, 288, 160);
  g.fillStyle = '#1F2328'; g.font = F(700, 13); g.fillText('Write-off, % of sales', 228, 58);
  const cx0 = 252, cx1 = 492, cy0 = 76, cy1 = 184, yv = v => cy1 - (v - .8) / (1.3 - .8) * (cy1 - cy0);
  g.strokeStyle = '#E6EBE0'; g.lineWidth = 1; g.fillStyle = '#8A929C'; g.font = F(600, 10); g.textAlign = 'right';
  [.8, 1.0, 1.2].forEach(v => { const y = yv(v); g.beginPath(); g.moveTo(cx0, y); g.lineTo(cx1, y); g.stroke(); g.fillText(v.toFixed(1) + '%', cx0 - 5, y); });
  g.textAlign = 'center'; ['Apr', 'May', 'Jun'].forEach((m, i) => g.fillText(m, cx0 + 30 + i * 85, cy1 + 10));
  const D = [1.21, 1.2, 1.17, 1.18, 1.13, 1.09, 1.07, 1.03, 1.0, .97, .94, .91, .88], xv = i => cx0 + i * (cx1 - cx0) / (D.length - 1);
  const grad = g.createLinearGradient(0, cy0, 0, cy1); grad.addColorStop(0, 'rgba(125,185,40,.32)'); grad.addColorStop(1, 'rgba(125,185,40,0)');
  g.beginPath(); g.moveTo(xv(0), cy1); D.forEach((v, i) => g.lineTo(xv(i), yv(v))); g.lineTo(xv(D.length - 1), cy1); g.closePath(); g.fillStyle = grad; g.fill();
  g.beginPath(); D.forEach((v, i) => (i ? g.lineTo(xv(i), yv(v)) : g.moveTo(xv(i), yv(v)))); g.strokeStyle = '#4E9A12'; g.lineWidth = 3; g.lineJoin = 'round'; g.stroke();
  [[0, '1.21%'], [D.length - 1, '0.88%']].forEach(([i, t]) => { g.fillStyle = '#fff'; g.beginPath(); g.arc(xv(i), yv(D[i]), 4.5, 0, 7); g.fill(); g.strokeStyle = '#4E9A12'; g.lineWidth = 2.5; g.stroke(); g.fillStyle = '#1F2328'; g.font = F(800, 12); g.textAlign = i ? 'right' : 'left'; g.fillText(t, xv(i) + (i ? -2 : 8), yv(D[i]) - 11); });
  // KPI tiles
  [['~₹20 L', 'saved'], ['−60%', 'RTV loss'], ['Same day', 'was a 2-day lag']].forEach(([a, b], i) => {
    const x = 216 + i * 98; card(x, 210, 92, 70);
    g.textAlign = 'left'; g.fillStyle = i === 2 ? '#1F2328' : '#4E9A12'; g.font = F(800, i === 2 ? 17 : 20); g.fillText(a, x + 9, 236);
    g.fillStyle = '#59616B'; g.font = F(600, 10.5); g.fillText(b, x + 9, 262);
  });
}
