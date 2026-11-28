/* bitsom.js: BITS School of Management, Mumbai (MBA 2025-27).
   Plot centre (0, -90), 72 x 44 m; the spoke road arrives at the south edge (0, -68).
   Layout (north is -z): main white-and-glass academic block at the back centre, facing south onto a
   courtyard; Roar & Conclave stage (NW) with a crowd lawn; All India Deans Conference hall (SW) with
   flags; case arena drum (NE) with leaderboard + trophy cabinet; Operations Committee room + canteen
   (SE); PreQL glass room on the courtyard's west side.
   All signage and screens are drawn into ONE canvas atlas (one draw call). */
import * as THREE from 'three';

const ACC = '#D6336C', INK = '#1F2328', FONT = '"Inter", system-ui, -apple-system, "Segoe UI", Arial, sans-serif';

export async function build(ctx) {
  const { kit, M, quality, rng } = ctx;
  const low = quality === 'low';
  const G = new THREE.Group();
  const colliders = [], spots = [];
  const R = rng(4242);

  /* ---------------- materials ---------------- */
  const mWhite = M.std('#F7F7F4', { rough: .5 });
  const mOff = M.std('#E9E5DE', { rough: .85 });
  const mAcc = M.std(ACC, { rough: .5, map: null });
  const mAlu = M.std('#DCE0E5', { rough: .35, metal: .6, map: 'metal' });
  const mFrameD = M.std('#3B4048', { rough: .45, metal: .5, map: null });
  const mGold = M.std('#D9A93A', { rough: .22, metal: .9, map: null });
  const mSilver = M.std('#C9CED6', { rough: .2, metal: .9, map: null });
  const mKerb = M.std(kit.PALETTE.kerb, { rough: .9 });
  const mCarpet = M.std('#8E95A3', { rough: 1 });
  const mNavy = M.std('#3A4D74', { rough: .7, map: null });
  const mYellow = M.std('#F2B705', { rough: .7, map: null });
  const mTruss = M.std('#C4CAD1', { rough: .35, metal: .7, map: null });
  const mDeck = M.std('#5E636B', { rough: .8 });
  const mSolar = M.std('#2E4A78', { rough: .25, metal: .5, map: null });
  const mTrans = new THREE.MeshPhysicalMaterial({ color: '#7CC8F2', roughness: .08, metalness: 0, transparent: true, opacity: .62, clearcoat: 1, envMapIntensity: 1.3 });
  const mRoofBlue = M.std('#1E5AA8', { rough: .4 }), mYel = M.std('#F5CD2F', { rough: .4 }), mRed = M.std('#D0302A', { rough: .4 }), mGreen = M.std('#00852B', { rough: .4 });
  const mClear = new THREE.MeshPhysicalMaterial({ color: '#D3E8F3', roughness: .05, metalness: 0, transparent: true, opacity: .26, envMapIntensity: 1.2, depthWrite: false });

  /* ---------------- local helpers ---------------- */
  // centred box (pivot in the middle), for rotated parts
  const cb = (w, h, d, mat, o = {}) => { const g = new THREE.BoxGeometry(w, h, d); if (mat.map) kit.worldUV(g, (mat.userData && mat.userData.metres) || 1); return kit.place(new THREE.Mesh(g, mat), Object.assign({ parent: G }, o)); };
  const box = (w, h, d, mat, o = {}) => kit.box(w, h, d, mat, Object.assign({ parent: G }, o));
  const rbox = (w, h, d, r, mat, o = {}) => kit.rbox(w, h, d, r, mat, Object.assign({ parent: G }, o));
  const cyl = (rt, rb, h, mat, o = {}) => kit.cyl(rt, rb, h, mat, Object.assign({ parent: G }, o));
  // people use kit's low-poly tier on every quality (they are small on screen and numerous)
  const lowPoly = f => { const q = kit.quality(); kit.setQuality('low'); try { return f(); } finally { kit.setQuality(q); } };
  const person = o => lowPoly(() => kit.person(Object.assign({ parent: G, seed: Math.floor(R() * 1e6) }, o)));
  const lawn = (x0, z0, x1, z1) => {
    const w = x1 - x0, d = z1 - z0, x = (x0 + x1) / 2, z = (z0 + z1) / 2;
    box(w + .24, .07, d + .24, mKerb, { x, z, y: .13 });
    kit.plane(w, d, M.grass, { parent: G, x, z, y: .215 });
  };
  const txt = (g, s, x, y, size, { weight = 700, color = INK, align = 'center', maxW = 0 } = {}) => {
    g.font = `${weight} ${size}px ${FONT}`;
    if (maxW) while (g.measureText(s).width > maxW && size > 8) { size -= 1; g.font = `${weight} ${size}px ${FONT}`; }
    g.fillStyle = color; g.textAlign = align; g.textBaseline = 'middle'; g.fillText(s, x, y);
  };

  /* ---------------- the signage atlas (1024 x 1024, one material) ---------------- */
  const REG = {
    name: [0, 0, 1024, 96, (g, w, h) => {
      g.fillStyle = '#FFFFFF'; g.fillRect(0, 0, w, h);
      txt(g, 'BITS School of Management', w / 2, h * .46, 62, { weight: 800, maxW: w - 40 });
      g.fillStyle = ACC; g.fillRect(w * .36, h - 12, w * .28, 6);
    }],
    leader: [0, 96, 512, 416, (g, w, h) => {
      g.fillStyle = '#FBFBFD'; g.fillRect(0, 0, w, h);
      g.fillStyle = ACC; g.fillRect(0, 0, w, 54);
      txt(g, 'CASE LEADERBOARD', 22, 28, 28, { weight: 800, color: '#FFFFFF', align: 'left' });
      txt(g, 'LIVE', w - 22, 28, 20, { weight: 800, color: '#FFFFFF', align: 'right' });
      const rows = [['Tata Imagination Challenge 2026', 'Top 30'], ['Flipkart WiRED 9 & 10', 'Semi-final x2'], ['TCPL Grow Beyond Better', 'Top 13'], ['Case Consilium, BITS Goa', '1st in semis']];
      rows.forEach(([a, b], i) => {
        const y = 70 + i * 62;
        g.fillStyle = i % 2 ? '#F1F2F6' : '#E9ECF3'; g.fillRect(12, y, w - 24, 54);
        g.fillStyle = i === 0 ? '#D9A93A' : '#9AA3AD'; g.beginPath(); g.arc(42, y + 27, 18, 0, 6.29); g.fill();
        txt(g, String(i + 1), 42, y + 28, 22, { weight: 800, color: '#FFFFFF' });
        txt(g, a, 74, y + 27, 22, { weight: 600, align: 'left', maxW: 270 });
        txt(g, b, w - 24, y + 27, 22, { weight: 800, color: ACC, align: 'right' });
      });
    }],
    flow: [512, 96, 1024, 352, (g, w, h) => {
      g.fillStyle = '#F7F9FC'; g.fillRect(0, 0, w, h);
      txt(g, 'AI workflow optimiser', 20, 26, 22, { weight: 800, align: 'left' });
      txt(g, '48 man-hours saved / week', w - 20, h - 18, 18, { weight: 700, color: ACC, align: 'right' });
      const nodes = [['Request', 60, 110], ['Triage', 180, 110], ['AI optimiser', 320, 110], ['Done', 450, 110], ['Vendors', 180, 200], ['Mess menu', 320, 200]];
      g.strokeStyle = '#7A8494'; g.lineWidth = 4;
      [[0, 1], [1, 2], [2, 3], [1, 4], [4, 5], [5, 3]].forEach(([a, b]) => { g.beginPath(); g.moveTo(nodes[a][1], nodes[a][2]); g.lineTo(nodes[b][1], nodes[b][2]); g.stroke(); });
      nodes.forEach(([s, x, y], i) => {
        g.fillStyle = i === 2 ? ACC : '#FFFFFF'; g.strokeStyle = i === 2 ? ACC : '#5B6470'; g.lineWidth = 3;
        g.beginPath(); g.roundRect(x - 54, y - 22, 108, 44, 10); g.fill(); g.stroke();
        txt(g, s, x, y + 1, 17, { weight: 700, color: i === 2 ? '#FFFFFF' : INK, maxW: 100 });
      });
    }],
    led: [512, 352, 1024, 608, (g, w, h) => {
      const gr = g.createLinearGradient(0, 0, w, h); gr.addColorStop(0, '#E23D78'); gr.addColorStop(1, '#FF8A3D');
      g.fillStyle = gr; g.fillRect(0, 0, w, h);
      g.fillStyle = 'rgba(255,255,255,.18)'; for (let i = 0; i < 9; i++) { g.beginPath(); g.arc(w * (i / 8), h * 1.1, 60 + i * 9, 0, 6.29); g.fill(); }
      txt(g, 'ROAR & CONCLAVE', w / 2, h * .42, 54, { weight: 800, color: '#FFFFFF', maxW: w - 40 });
      txt(g, 'BITSoM cultural fest  ·  CXO leadership summit', w / 2, h * .66, 20, { weight: 600, color: '#FFFFFF', maxW: w - 40 });
    }],
    roarTop: [0, 416, 512, 480, (g, w, h) => {
      g.fillStyle = ACC; g.fillRect(0, 0, w, h);
      txt(g, 'ROAR & CONCLAVE', w / 2, h / 2 + 1, 40, { weight: 800, color: '#FFFFFF', maxW: w - 30 });
    }],
    vb1: [0, 480, 64, 800, (g, w, h) => { g.fillStyle = ACC; g.fillRect(0, 0, w, h); g.save(); g.translate(w / 2, h / 2); g.rotate(-Math.PI / 2); txt(g, 'ROAR', 0, 2, 40, { weight: 800, color: '#FFFFFF' }); g.restore(); }],
    vb2: [64, 480, 128, 800, (g, w, h) => { g.fillStyle = '#FFFFFF'; g.fillRect(0, 0, w, h); g.save(); g.translate(w / 2, h / 2); g.rotate(-Math.PI / 2); txt(g, 'CONCLAVE', 0, 2, 36, { weight: 800, color: ACC }); g.restore(); }],
    sponsor: [128, 480, 512, 736, (g, w, h) => {
      g.fillStyle = '#FFFFFF'; g.fillRect(0, 0, w, h);
      txt(g, 'OUR PARTNERS', w / 2, 30, 20, { weight: 800, color: ACC });
      txt(g, 'Title sponsor', w / 2, 72, 20, { weight: 600, color: '#5B6470' });
      txt(g, 'SBI', w / 2, 122, 64, { weight: 800 });
      g.fillStyle = '#E3E5EA'; g.fillRect(30, 166, w - 60, 2);
      txt(g, 'Sponsorship budget', w / 2, 192, 18, { weight: 600, color: '#5B6470' });
      txt(g, '₹25 L  ·  10 domains', w / 2, 224, 18, { weight: 700 });
    }],
    deansFascia: [0, 800, 512, 864, (g, w, h) => { g.fillStyle = '#FFFFFF'; g.fillRect(0, 0, w, h); txt(g, 'All India Deans Conference', w / 2, h / 2 + 1, 34, { weight: 800, maxW: w - 30 }); }],
    deansBack: [0, 864, 384, 1024, (g, w, h) => {
      g.fillStyle = '#26365A'; g.fillRect(0, 0, w, h);
      txt(g, 'ALL INDIA', w / 2, 46, 26, { weight: 700, color: '#F3C8D7' });
      txt(g, 'DEANS CONFERENCE', w / 2, 86, 34, { weight: 800, color: '#FFFFFF', maxW: w - 30 });
      g.fillStyle = ACC; g.fillRect(w / 2 - 50, 120, 100, 5);
    }],
    ch1: [512, 608, 640, 688, (g, w, h) => { g.fillStyle = '#FFFFFF'; g.fillRect(0, 0, w, h); const v = [30, 46, 38, 60, 52]; v.forEach((a, i) => { g.fillStyle = i === 3 ? ACC : '#7FA7D9'; g.fillRect(14 + i * 22, h - 8 - a, 16, a); }); }],
    ch2: [640, 608, 768, 688, (g, w, h) => { g.fillStyle = '#FFFFFF'; g.fillRect(0, 0, w, h); g.strokeStyle = ACC; g.lineWidth = 4; g.beginPath(); [62, 54, 58, 40, 44, 26, 18].forEach((y, i) => (i ? g.lineTo(10 + i * 18, y) : g.moveTo(10, y))); g.stroke(); g.strokeStyle = '#C8CED8'; g.lineWidth = 2; g.beginPath(); g.moveTo(8, h - 8); g.lineTo(w - 6, h - 8); g.stroke(); }],
    ch3: [768, 608, 896, 688, (g, w, h) => { g.fillStyle = '#FFFFFF'; g.fillRect(0, 0, w, h); const c = [ACC, '#7FA7D9', '#F2B705', '#2FA84F']; let a0 = -1.57; [.4, .25, .2, .15].forEach((f, i) => { g.fillStyle = c[i]; g.beginPath(); g.moveTo(44, 40); g.arc(44, 40, 30, a0, a0 + f * 6.283); g.fill(); a0 += f * 6.283; }); g.fillStyle = '#FFFFFF'; g.beginPath(); g.arc(44, 40, 13, 0, 6.29); g.fill(); txt(g, '', 104, 40, 18, { weight: 800, color: ACC }); }],
    preql: [512, 688, 896, 784, (g, w, h) => { g.fillStyle = '#FFFFFF'; g.fillRect(0, 0, w, h); txt(g, 'PreQL', w / 2, 38, 50, { weight: 800 }); g.fillStyle = ACC; g.beginPath(); g.arc(w / 2 + 84, 52, 6, 0, 6.29); g.fill(); txt(g, 'AI & Analytics Club', w / 2, 76, 20, { weight: 600, color: '#5B6470' }); }],
    opscom: [512, 784, 1024, 848, (g, w, h) => { g.fillStyle = '#FFFFFF'; g.fillRect(0, 0, w, h); txt(g, 'Operations Committee', w / 2, h / 2 + 1, 34, { weight: 800, maxW: w - 30 }); }],
    canteen: [896, 608, 1024, 672, (g, w, h) => { g.fillStyle = '#F2B705'; g.fillRect(0, 0, w, h); txt(g, 'CANTEEN', w / 2, h / 2 + 1, 24, { weight: 800, maxW: w - 12 }); }],
    menu: [896, 672, 1024, 784, (g, w, h) => {
      g.fillStyle = '#2F4A3A'; g.fillRect(0, 0, w, h);
      txt(g, "TODAY", w / 2, 16, 14, { weight: 800, color: '#F2B705' });
      ['Thali', 'Chai', 'Sandwich', 'Meal plan'].forEach((s, i) => txt(g, s, w / 2, 38 + i * 19, 14, { weight: 600, color: '#FFFFFF' }));
    }],
    arena: [384, 864, 640, 928, (g, w, h) => { g.fillStyle = '#FFFFFF'; g.fillRect(0, 0, w, h); txt(g, 'Case Arena', w / 2, h / 2 + 1, 36, { weight: 800 }); }],
    trophy: [384, 928, 640, 992, (g, w, h) => { g.fillStyle = '#2B2F35'; g.fillRect(0, 0, w, h); txt(g, 'Competitions', w / 2, h / 2 + 1, 26, { weight: 700, color: '#F3D58A' }); }],
    gate: [640, 848, 1024, 976, (g, w, h) => {
      g.fillStyle = '#FFFFFF'; g.fillRect(0, 0, w, h);
      g.fillStyle = ACC; g.fillRect(0, 0, 8, h);
      txt(g, 'BITS School', 28, 38, 38, { weight: 800, align: 'left' });
      txt(g, 'of Management', 28, 78, 38, { weight: 800, align: 'left' });
      txt(g, 'MUMBAI', 28, 112, 18, { weight: 700, color: '#5B6470', align: 'left' });
    }],
  };
  const atlasTex = kit.canvasTex(1024, 1024, g => {
    g.fillStyle = '#FFFFFF'; g.fillRect(0, 0, 1024, 1024);
    for (const k in REG) { const [x0, y0, x1, y1, fn] = REG[k]; g.save(); g.translate(x0, y0); g.beginPath(); g.rect(0, 0, x1 - x0, y1 - y0); g.clip(); fn(g, x1 - x0, y1 - y0); g.restore(); }
  }, { repeat: false });
  const mAtlas = new THREE.MeshBasicMaterial({ map: atlasTex, toneMapped: false });
  // a plane (base at y, facing +z before ry) showing one atlas region
  const sign = (key, w, h, o = {}) => {
    const [x0, y0, x1, y1] = REG[key], geo = new THREE.PlaneGeometry(w, h); geo.translate(0, h / 2, 0);
    const uv = geo.attributes.uv;
    for (let i = 0; i < uv.count; i++) { const u = uv.getX(i), v = uv.getY(i); uv.setXY(i, (x0 + u * (x1 - x0)) / 1024, 1 - (y1 - v * (y1 - y0)) / 1024); }
    const m = kit.place(new THREE.Mesh(geo, mAtlas), Object.assign({ parent: G, cast: false }, o)); m.castShadow = false; return m;
  };

  /* ---------------- ground ---------------- */
  box(70.6, .1, 42.6, mKerb, { x: 0, z: -90 });
  box(70, .14, 42, M.paving, { x: 0, z: -90 });
  box(12, .14, 1.2, M.paving, { x: 0, z: -68.6 });                                    // apron onto the spoke footpaths
  kit.plane(5, 27.4, M.tiles, { parent: G, x: 0, z: -82.5, y: .145 });                 // central walk
  kit.plane(21, 7.2, M.tiles, { parent: G, x: 0, z: -92.6, y: .145 });                // under the canopy
  [-2.6, 2.6].forEach(x => box(.14, .05, 27.4, mOff, { x, z: -82.5, y: .14 }));       // walk edging
  lawn(-13.5, -95, -4.2, -87.5);                                                       // west courtyard lawn
  lawn(5.2, -84.5, 14, -73.5);                                                         // east courtyard lawn
  lawn(-34, -101, -16, -90.5);                                                         // festival crowd lawn
  lawn(16, -111, 34, -108.6);                                                          // strip behind the arena

  /* ---------------- MAIN: white-and-glass academic block ---------------- */
  {
    const z0 = -103, D = 14, front = -96, st = 3.6, base = .3, H = 4 * st;
    box(26.8, .3, 14.8, M.concrete, { z: z0 });
    for (const sx of [-1, 1]) {
      const cx = sx * 9;
      rbox(8, H, D, .1, mWhite, { x: cx, y: base, z: z0 });
      for (let f = 0; f < 4; f++) {
        const y = base + f * st;
        box(7.3, 2.0, .06, mTrans, { x: cx, y: y + .85, z: front + .02 });                     // ribbon window
        if (!low) for (let k = 0; k <= 4; k++) box(.07, 2.0, .1, mFrameD, { x: cx - 3.65 + k * 1.825, y: y + .85, z: front + .06 });
        box(8.4, .14, 1.0, mWhite, { x: cx, y: y + 3.05, z: front + .5 });                       // sunshade fin
        // side windows (east / west faces)
        box(.06, 1.7, D - 2, mTrans, { x: cx + sx * 4.02, y: y + 1, z: z0 });
        if (!low) for (let k = 0; k <= 6; k++) box(.1, 1.7, .07, mFrameD, { x: cx + sx * 4.05, y: y + 1, z: z0 - (D - 2) / 2 + k * (D - 2) / 6 });
        // back (north) ribbon
        box(7.3, 1.7, .06, mTrans, { x: cx, y: y + 1, z: z0 - D / 2 - .02 });
      }
      // parapet + roof
      const top = base + H;
      box(8, .6, .2, mWhite, { x: cx, y: top, z: front - .1 }); box(8, .6, .2, mWhite, { x: cx, y: top, z: z0 - D / 2 + .1 });
      box(.2, .6, D, mWhite, { x: cx + sx * 3.9, y: top, z: z0 });
      box(7.6, .04, D - .4, M.std('#C8C3BB', { rough: 1 }), { x: cx, y: top, z: z0 });
      const ru = new THREE.Group(); ru.position.set(cx, 0, z0 + 2); G.add(ru);
      kit.roofUnits(ru, { w: 7, d: 7, y: top, seed: 17 + sx });
      if (!low && sx < 0) for (let r = 0; r < 3; r++) for (let c = 0; c < 2; c++) cb(3.0, .08, 1.6, mSolar, { x: cx - 1.7 + c * 3.4, y: top + .7, z: z0 - 5.2 + r * 2.4, rx: -.35 });
    }
    // glass atrium with a tall white portal frame
    box(10.2, 17.6, 12, mTrans, { y: base, z: z0 - .5 });
    if (!low) for (let k = 0; k <= 8; k++) box(.12, 17.6, .32, mAlu, { x: -5 + k * 1.25, y: base, z: front - .95 });
    for (let f = 1; f < 5; f++) box(10.2, .14, .34, mAlu, { y: base + f * st, z: front - .95 });
    for (let f = 1; f < 5; f++) box(10, .25, 11.6, f % 2 ? mWhite : mGreen, { y: base + f * st - .25, z: z0 - .5 });
    box(10, 17.4, .2, mAcc, { y: base, z: z0 - 6.3 });
    box(12.2, 1.3, 3.2, mWhite, { y: 17.9, z: -97.6 });
    [-1, 1].forEach(s => box(1, 19.2, 3.2, mWhite, { x: s * 5.6, y: 0, z: -97.6 }));
    [-1, 1].forEach(s => box(.08, 17.6, .08, mAcc, { x: s * 5.08, y: base, z: -96.05 }));    // thin accent reveal
    box(10.4, .3, 12.2, mWhite, { y: 17.9, z: z0 - .5 });
    // entrance: glass doors + revolving door
    box(8, 3.2, .14, mFrameD, { y: base, z: front - .9 });
    box(7.6, 2.9, .08, mTrans, { y: base, z: front - .82 });
    cyl(1.25, 1.25, 2.7, mClear, { y: base, z: front - .2, seg: 20 });
    cyl(1.32, 1.32, .25, mFrameD, { y: base + 2.7, z: front - .2, seg: 20 });
    box(.06, 2.7, 2.4, mAlu, { y: base, z: front - .2, ry: .6 }); box(.06, 2.7, 2.4, mAlu, { y: base, z: front - .2, ry: -.97 });
    // the canopy
    box(21, .42, 8, mWhite, { y: 5.0, z: -93 });
    box(21.02, .1, .04, mAcc, { y: 5.04, z: -88.99 });
    sign('name', 16, 1.5, { y: 5.42, z: -89.1 });
    box(16.2, 1.6, .12, mWhite, { y: 5.38, z: -89.2 });
    [-9, -4, 4, 9].forEach(x => { cyl(.17, .17, 5, mAlu, { x, z: -89.8, seg: 12 }); colliders.push({ type: 'circle', x, z: -89.8, r: .35 }); });
    // planters flanking the doors
    [-7.5, 7.5].forEach(x => { rbox(3.2, .7, 1.2, .1, mOff, { x, z: -94.6 }); kit.bush(x - .8, -94.6, { s: .8 }); kit.bush(x + .8, -94.6, { s: .8 }); });
    colliders.push({ type: 'box', x: 0, z: -103, w: 26.8, d: 14.8 });
    [-7.5, 7.5].forEach(x => colliders.push({ type: 'box', x, z: -94.6, w: 3.3, d: 1.3 }));
    spots.push({ id: 'main', x: 0, z: -86.8, y: 4.5 });
    // people at the entrance
    person({ x: -1.6, z: -91.5, ry: .4, shirt: '#F2F2F2' }); person({ x: -.8, z: -90.7, ry: 2.9 }); person({ x: 2.4, z: -93.2, ry: -.3, shirt: '#3B6EA5' });
  }

  /* ---------------- courtyard ---------------- */
  // seating steps (east), students sitting facing south
  {
    const sx = 9.2, w = 9;
    box(w, .45, 8, M.concrete, { x: sx, z: -91 }); box(w, .9, 7, M.concrete, { x: sx, z: -91.5 }); box(w, 1.35, 6, M.concrete, { x: sx, z: -92 });
    [[.45, -87, 1], [.9, -88, 1], [1.35, -89, 6]].forEach(([y, zf, d]) => kit.plane(w, d === 6 ? 6 : 1, M.wood, { parent: G, x: sx, z: zf - (d === 6 ? 3 : .5), y: y + .005 }));
    const seats = low ? [[6.5, 1], [10.5, 2], [8, 3]] : [[5.6, 1], [7.2, 1], [11.8, 1], [6.4, 2], [9.4, 2], [10.4, 2], [8.2, 3], [12.2, 3]];
    seats.forEach(([x, k], i) => person({ x, y: .45 * (k - 1), z: -87 - (k - 1) - .45, ry: (i % 3 - 1) * .3, pose: 'sit' }));
    colliders.push({ type: 'box', x: sx, z: -91, w: w + .2, d: 8.2 });
  }
  // palms in round planters along the walk, lamps between
  [-84, -78, -72].forEach(z => [-4.6, 4.6].forEach(x => {
    if (x > 0 && z < -83) return;
    cyl(.75, .8, .55, mOff, { x, z, seg: 16 }); kit.tree(x, z, { kind: 'palm', s: R.range(.9, 1.1) });
    colliders.push({ type: 'circle', x, z, r: .85 });
  }));
  [-75, -81].forEach(z => { kit.lamp(-3.2, z, { ry: Math.PI / 2 }); kit.lamp(3.2, z, { ry: -Math.PI / 2 }); });
  kit.tree(-10.5, -91.8, { s: 1.15 }); kit.tree(-6.6, -89.2, { kind: 'palm' }); kit.bench(-4.9, -91.5, { ry: Math.PI / 2 });
  colliders.push({ type: 'circle', x: -10.5, z: -91.8, r: .6 }, { type: 'circle', x: -6.6, z: -89.2, r: .4 });
  kit.tree(10, -79.5, { s: 1.35 }); kit.tree(12.6, -75.2, { kind: 'palm' }); kit.tree(6.8, -82.6, { kind: 'palm', s: .9 });
  colliders.push({ type: 'circle', x: 10, z: -79.5, r: .6 }, { type: 'circle', x: 12.6, z: -75.2, r: .4 }, { type: 'circle', x: 6.8, z: -82.6, r: .4 });
  kit.bush(13.4, -83.6); kit.bush(5.8, -74.2); kit.bush(-12.9, -87.9); kit.bush(-4.8, -94.4, { s: .8 });
  // students chatting on the east lawn
  [[7.6, -77.4, 2.2], [8.8, -76.6, 3.6], [8.9, -78.2, 5.2], [7.3, -76.2, 1.2]].forEach(([x, z, ry], i) => { if (!low || i < 2) person({ x, z, ry }); });
  // campus gate: pillars, name sign, bollards, parked scooters
  [-4.4, 4.4].forEach(x => { rbox(.9, 3.2, .9, .08, mWhite, { x, z: -69.9 }); box(1, .14, 1, mAcc, { x, y: 3.2, z: -69.9 }); colliders.push({ type: 'box', x, z: -69.9, w: 1, d: 1 }); });
  rbox(4.9, .55, .55, .06, mOff, { x: 9.6, z: -70.4 }); rbox(4.7, 1.6, .2, .05, mWhite, { x: 9.6, y: .5, z: -70.5 });
  sign('gate', 4.5, 1.5, { x: 9.6, y: .55, z: -70.39 });
  colliders.push({ type: 'box', x: 9.6, z: -70.4, w: 5, d: .7 });
  if (!low) {
    [-6, -7.6, 6, 7.4].forEach(x => cyl(.12, .14, .9, mFrameD, { x, z: -69.4, seg: 8 }));
    [13.2, 14.2, 15.2].forEach((x, i) => kit.scooter({ parent: G, x, z: -70.8, ry: Math.PI + (i - 1) * .08, box: false, color: ['#E5E5E2', '#3A6EA5', ACC][i] }));
    colliders.push({ type: 'box', x: 14.2, z: -70.8, w: 3.2, d: 1.5 });
  }

  /* ---------------- PREQL: small glass analytics room (courtyard west) ---------------- */
  {
    const x = -11, z = -81, w = 6, d = 6, h = 3.5;
    box(w + .4, .25, d + .4, M.concrete, { x, z });
    kit.plane(w, d, M.tiles, { parent: G, x, z, y: .26 });
    [[-1, -1], [1, -1], [-1, 1], [1, 1]].forEach(([a, b]) => box(.14, h, .14, mFrameD, { x: x + a * (w / 2 - .07), y: .25, z: z + b * (d / 2 - .07) }));
    box(w, h - .1, .05, mClear, { x, y: .25, z: z + d / 2 - .05 }); box(w, h - .1, .05, mClear, { x, y: .25, z: z - d / 2 + .05 });
    box(.05, h - .1, d, mClear, { x: x - w / 2 + .05, y: .25, z }); box(.05, h - .1, d, mClear, { x: x + w / 2 - .05, y: .25, z });
    box(.08, h - .1, .1, mFrameD, { x, y: .25, z: z + d / 2 - .02 });
    box(w + .1, .08, .1, mFrameD, { x, y: 2.5, z: z + d / 2 - .02 });
    box(w + 1, .4, d + 1, mAcc, { x, y: h + .25, z });
    sign('preql', 4, 1, { x, y: h + .65, z: z + d / 2 + .3 });
    box(4.1, 1.05, .08, mWhite, { x, y: h + .62, z: z + d / 2 + .24 });
    // screens of charts facing out, a table, the club at work
    ['ch1', 'ch2', 'ch3'].forEach((k, i) => {
      const sx = x - 1.9 + i * 1.9, sz = z + d / 2 - .9;
      box(.06, 1.0, .06, mFrameD, { x: sx, y: .25, z: sz - .05 });
      box(1.6, 1.0, .06, mFrameD, { x: sx, y: 1.2, z: sz - .06 });
      sign(k, 1.5, .94, { x: sx, y: 1.23, z: sz - .02 });
    });
    rbox(2.6, .1, 1.1, .03, M.wood, { x, y: .95, z: z - .8 }); box(.1, .7, .8, mFrameD, { x: x - 1, y: .25, z: z - .8 }); box(.1, .7, .8, mFrameD, { x: x + 1, y: .25, z: z - .8 });
    box(4.2, 1.9, .06, mWhite, { x, y: .9, z: z - d / 2 + .15 });
    rbox(.36, .02, .26, .01, mFrameD, { x: x - .5, y: 1.05, z: z - .9 }); rbox(.36, .02, .26, .01, mFrameD, { x: x + .6, y: 1.05, z: z - .7 });
    person({ x: x - .6, y: .25, z: z - 1.8, pose: 'sit', ry: 0 }); person({ x: x + .7, y: .25, z: z + .2, pose: 'sit', ry: Math.PI });
    person({ x: x + 2, y: .25, z: z + .9, ry: 2.6, shirt: ACC });
    colliders.push({ type: 'box', x, z, w: w + .5, d: d + .5 });
    spots.push({ id: 'preql', x, z: -75.7, y: 4.6 });
  }

  /* ---------------- DEANS: conference hall with a long glass front and flags ---------------- */
  {
    const x = -25.5, z = -80.5, w = 17, d = 11, h = 6;
    box(w, .3, d, M.concrete, { x, z });
    kit.plane(w - .7, d - .7, mCarpet, { parent: G, x, z, y: .31 });
    box(w, h, .35, mWhite, { x, y: .3, z: z - d / 2 + .175 });
    box(.35, h, d, mWhite, { x: x - w / 2 + .175, y: .3, z }); box(.35, h, d, mWhite, { x: x + w / 2 - .175, y: .3, z });
    box(.06, 2.4, 1.6, mTrans, { x: x + w / 2 + .01, y: .3, z: z + 2 });                       // side door
    box(w + 1.2, 1, d + 1.2, mRoofBlue, { x, y: h + .3, z });
    box(w + .6, .04, d + .6, M.std('#C8C3BB', { rough: 1 }), { x, y: h + 1.3, z });
    sign('deansFascia', 8, 1, { x, y: h + .3, z: z + d / 2 + .61 });
    box(w - .7, h - .05, .05, mClear, { x, y: .3, z: z + d / 2 - .15 });
    const nm = low ? 6 : 11;
    for (let k = 0; k < nm; k++) box(.09, h, .16, mFrameD, { x: x - w / 2 + .35 + k * (w - .7) / (nm - 1), y: .3, z: z + d / 2 - .1 });
    box(w - .4, .1, .16, mFrameD, { x, y: 3.1, z: z + d / 2 - .1 });
    // podium at the west end, backdrop, chairs facing it
    box(2.4, .35, 9, M.wood, { x: x - w / 2 + 1.6, y: .3, z });
    sign('deansBack', 4.8, 2, { x: x - w / 2 + .37, y: 1.5, z, ry: Math.PI / 2 });
    rbox(.6, 1.15, .7, .05, M.wood, { x: x - w / 2 + 2.3, y: .65, z: z + .6 });
    person({ x: x - w / 2 + 1.7, y: .65, z: z + .6, ry: Math.PI / 2, shirt: '#2B3442' });
    const cols = low ? 4 : 7, rows = low ? [-3.6, -2.4, 1.4, 2.6] : [-4.1, -3.1, -2.1, -1.1, 1.1, 2.1, 3.1, 4.1];
    rows.forEach((dz, ri) => { for (let c = 0; c < cols; c++) {
      const cx = x - 4.6 + c * (low ? 2 : 1.35), cz = z + dz;
      box(.5, .45, .5, mNavy, { x: cx, y: .3, z: cz }); box(.08, .5, .5, mNavy, { x: cx + .24, y: .75, z: cz });
      if ((ri * 7 + c) % (low ? 5 : 4) === 1) person({ x: cx + .15, y: .3, z: cz, ry: -Math.PI / 2, pose: 'sit', shirt: R.pick(['#2B3442', '#F2F2F2', '#3B6EA5']) });
    } });
    // flags on poles along the front
    const flagCols = ['#26365A', ACC, '#F4F4F2', '#14B8A6', '#26365A', ACC, '#F4F4F2'];
    for (let k = 0; k < 7; k++) {
      const fx = -32 + k * 2.15, fz = -73.2;
      cyl(.05, .06, 6.2, mAlu, { x: fx, z: fz, seg: 8 }); kit.sphere(.08, mGold, { parent: G, x: fx, y: 6.2, z: fz, seg: 8, seg2: 6 });
      const fm = M.std(flagCols[k], { rough: .8, map: null });
      cb(.72, .8, .02, fm, { x: fx + .38, y: 5.7, z: fz + .06, ry: -.25 }); cb(.72, .8, .02, fm, { x: fx + 1.06, y: 5.7, z: fz - .06, ry: .3 });
      colliders.push({ type: 'circle', x: fx, z: fz, r: .2 });
    }
    colliders.push({ type: 'box', x, z, w: w + .3, d: d + .3 });
    spots.push({ id: 'deans', x, z: -71.0, y: 4.6 });
  }

  /* ---------------- ROAR: outdoor festival stage, truss, banners, sponsor board, crowd ---------------- */
  {
    const sx = -27, sz = -106;
    box(13, 1.3, 7, mFrameD, { x: sx, z: sz });
    kit.plane(13, 7, mDeck, { parent: G, x: sx, z: sz, y: 1.31 });
    box(13.05, .12, .05, mAcc, { x: sx, y: 1.0, z: sz + 3.51 });
    box(1.8, .65, 1.2, mFrameD, { x: sx + 7.4, z: sz + 2.4 });                                  // stage stairs
    // truss towers and beams
    const truss = (x, y, z, len, axis) => {
      const g = new THREE.Group(); G.add(g); g.position.set(x, y, z);
      if (axis === 'x') g.rotation.z = -Math.PI / 2; if (axis === 'z') g.rotation.x = Math.PI / 2;
      const s = .38;
      [[-1, -1], [1, -1], [-1, 1], [1, 1]].forEach(([a, b]) => cb(.05, len, .05, mTruss, { parent: g, x: a * s / 2, y: len / 2, z: b * s / 2 }));
      const n = Math.max(2, Math.round(len / (low ? 1.2 : .6))), seg = len / n, L = Math.hypot(seg, s), ang = Math.atan2(s, seg);
      for (let i = 0; i < n; i++) {
        const y0 = (i + .5) * seg, sg = i % 2 ? 1 : -1;
        cb(.03, L, .03, mTruss, { parent: g, y: y0, z: s / 2, rz: sg * ang });
        cb(.03, L, .03, mTruss, { parent: g, y: y0, z: -s / 2, rz: -sg * ang });
        if (!low) { cb(.03, L, .03, mTruss, { parent: g, y: y0, x: s / 2, rx: sg * ang }); cb(.03, L, .03, mTruss, { parent: g, y: y0, x: -s / 2, rx: -sg * ang }); }
      }
    };
    const X0 = sx - 7, X1 = sx + 7, Z0 = sz - 3.6, Z1 = sz + 3.6, TH = 8.6;
    [[X0, Z0], [X1, Z0], [X0, Z1], [X1, Z1]].forEach(([x, z]) => { truss(x, 0, z, TH, 'y'); box(.7, .12, .7, mFrameD, { x, z }); colliders.push({ type: 'circle', x, z, r: .45 }); });
    truss(X0, TH, Z1, X1 - X0, 'x'); truss(X0, TH, Z0, X1 - X0, 'x'); truss(X0, TH, Z0, Z1 - Z0, 'z'); truss(X1, TH, Z0, Z1 - Z0, 'z');
    box(14.6, .3, 7.8, mRed, { x: sx, y: TH + .4, z: sz });
    // lights on the front truss
    for (let i = 0; i < (low ? 4 : 8); i++) {
      const lx = X0 + 1.2 + i * (X1 - X0 - 2.4) / ((low ? 4 : 8) - 1);
      cyl(.17, .22, .45, mFrameD, { x: lx, y: TH - .62, z: Z1 - .3, seg: 10 });
      cyl(.18, .18, .03, M.emit('#FFF1C9', 1.2), { x: lx, y: TH - .65, z: Z1 - .3, seg: 10, cast: false });
    }
    // LED backdrop + banners
    box(10.4, 5.4, .3, mFrameD, { x: sx, y: 1.3, z: Z0 + .4 });
    sign('led', 10, 5, { x: sx, y: 1.5, z: Z0 + .56 });
    sign('roarTop', 12, 1.5, { x: sx, y: TH - 2.2, z: Z1 + .26 });
    sign('vb1', 1, 5, { x: X0, y: 1.6, z: Z1 + .24 }); sign('vb2', 1, 5, { x: X1, y: 1.6, z: Z1 + .24 });
    // speakers, monitors, mic, host
    [X0 + 1.4, X1 - 1.4].forEach(x => { rbox(1.1, 2.3, .9, .05, mFrameD, { x, y: 1.3, z: Z1 - .9 }); cyl(.3, .3, .03, mDeck, { x, y: 2.6, z: Z1 - .44, rx: Math.PI / 2, seg: 12 }); });
    if (!low) [-2, 2].forEach(dx => cb(.8, .35, .5, mFrameD, { x: sx + dx, y: 1.5, z: Z1 - .5, rx: -.4 }));
    cyl(.02, .02, 1.5, mFrameD, { x: sx, y: 1.3, z: Z1 - 1.4, seg: 6 });
    person({ x: sx + .2, y: 1.3, z: Z1 - 1.9, ry: 0, shirt: ACC });
    // crowd barrier
    kit.fence(G, [[X0 + .6, Z1 + 1.6], [X1 - .6, Z1 + 1.6]], { h: 1.1, post: 2, color: '#C9CED6' });
    colliders.push({ type: 'box', x: sx, z: sz, w: 13.4, d: 7.4 }, { type: 'box', x: sx + 7.4, z: sz + 2.4, w: 2, d: 1.4 }, { type: 'box', x: sx, z: Z1 + 1.6, w: X1 - X0 - 1, d: .3 });
    // sponsor board (plain text)
    const sb = new THREE.Group(); sb.position.set(-17.7, 0, -103.6); sb.rotation.y = -.45; G.add(sb);
    [-1.9, 1.9].forEach(px => kit.cyl(.07, .07, 1.3, mAlu, { parent: sb, x: px, seg: 8 }));
    kit.rbox(4.8, 3.2, .18, .05, mWhite, { parent: sb, y: 1.2 });
    sign('sponsor', 4.5, 3, { parent: sb, y: 1.3, z: .1 });
    colliders.push({ type: 'box', x: -17.7, z: -103.6, w: 4.9, d: .6, rot: -.45 });
    // front-of-house tent
    { const tx = -31.6, tz = -93.2;
      [[-1, -1], [1, -1], [-1, 1], [1, 1]].forEach(([a, b]) => cyl(.04, .04, 2.6, mAlu, { x: tx + a * 1.3, z: tz + b * 1.3, seg: 6 }));
      kit.cone(2.05, 1.1, mWhite, { parent: G, x: tx, y: 2.6, z: tz, seg: 4, ry: Math.PI / 4 });
      box(2, .9, .8, mFrameD, { x: tx, z: tz - .4 }); cb(1.8, .06, .6, mDeck, { x: tx, y: .95, z: tz - .4, rx: .25 });
      person({ x: tx, z: tz + .5, ry: Math.PI, shirt: '#2B3442' });
      colliders.push({ type: 'box', x: tx, z: tz, w: 2.8, d: 2.8 }); }
    // the crowd (facing the stage, leaving an aisle down the middle to the marker)
    const N = low ? 6 : 16; let placed = 0, tries = 0;
    while (placed < N && tries++ < 400) {
      const px = R.range(-33.4, -17.2), pz = R.range(-100.4, -94.2);
      if (Math.abs(px - sx) < 2.6) continue;
      if (Math.hypot(px + 31.6, pz + 93.2) < 2.4) continue;
      person({ x: px, z: pz, ry: Math.PI + R.range(-.35, .35) }); placed++;
    }
    kit.tree(-34, -90.6, { kind: 'palm' }); kit.tree(-16.6, -91, { kind: 'palm', s: .95 });
    spots.push({ id: 'roar', x: sx, z: -97.4, y: 5 });
  }

  /* ---------------- CASES: rounded case arena with leaderboard + trophy cabinet ---------------- */
  {
    const ax = 25, az = -101, r = 7, sg = low ? 28 : 48;
    cyl(r + .4, r + .5, .3, M.concrete, { x: ax, z: az, seg: sg });
    cyl(r, r, 1.1, mWhite, { x: ax, z: az, y: .3, seg: sg });
    cyl(r - .15, r - .15, 3.6, mTrans, { x: ax, z: az, y: 1.4, seg: sg });
    const nm = low ? 14 : 28;
    for (let i = 0; i < nm; i++) { const a = i / nm * Math.PI * 2; box(.12, 3.6, .3, mAlu, { x: ax + Math.sin(a) * (r - .08), y: 1.4, z: az + Math.cos(a) * (r - .08), ry: a }); }
    cyl(r + .9, r + .5, 1.0, mWhite, { x: ax, z: az, y: 5.0, seg: sg });
    cyl(r + .93, r + .93, .12, mAcc, { x: ax, z: az, y: 5.62, seg: sg });
    cyl(r - 1.6, r - 1.2, 1.3, mRoofBlue, { x: ax, z: az, y: 6.0, seg: sg });
    const dome = kit.sphere(r - 1.7, mWhite, { parent: G, x: ax, z: az, y: 7.1, seg: low ? 16 : 28, seg2: low ? 8 : 14 }); dome.scale.y = .28;
    kit.sphere(1.0, mTrans, { parent: G, x: ax, z: az, y: 8.25, seg: 14, seg2: 8 }).scale.y = .4;
    // entrance portal
    box(4.6, 3.6, 3, mWhite, { x: ax, y: .3, z: az + r + .1 });
    box(2.8, 2.5, .08, mTrans, { x: ax, y: .3, z: az + r + 1.62 });
    box(.06, 2.5, .1, mFrameD, { x: ax, y: .3, z: az + r + 1.66 });
    sign('arena', 3.2, .8, { x: ax, y: 2.95, z: az + r + 1.62 });
    colliders.push({ type: 'circle', x: ax, z: az, r: r + .5 }, { type: 'box', x: ax, z: az + r + .1, w: 4.7, d: 3.1 });
    // leaderboard screen
    const lb = new THREE.Group(); lb.position.set(19.4, 0, -91.6); lb.rotation.y = .18; G.add(lb);
    [-1.9, 1.9].forEach(px => kit.box(.18, 1.2, .18, mFrameD, { parent: lb, x: px }));
    kit.rbox(5.1, 3.25, .3, .06, mFrameD, { parent: lb, y: 1.1 });
    sign('leader', 4.8, 3.0, { parent: lb, y: 1.22, z: .16 });
    colliders.push({ type: 'box', x: 19.4, z: -91.6, w: 5.2, d: .6, rot: .18 });
    // trophy cabinet with four trophies
    const tc = new THREE.Group(); tc.position.set(30.6, 0, -91.6); tc.rotation.y = -.18; G.add(tc);
    kit.rbox(3.4, .95, 1.0, .04, M.wood, { parent: tc });
    kit.box(3.4, 1.6, 1.0, mClear, { parent: tc, y: .95 });
    [[-1.68, -.48], [1.68, -.48], [-1.68, .48], [1.68, .48]].forEach(([a, b]) => kit.box(.06, 1.6, .06, mGold, { parent: tc, x: a, y: .95, z: b }));
    kit.box(3.46, .08, 1.06, mGold, { parent: tc, y: 2.55 });
    sign('trophy', 1.6, .4, { parent: tc, y: .3, z: .51 });
    const tro = (x, s, cup) => {
      kit.box(.26 * s, .14 * s, .26 * s, M.dark, { parent: tc, x, y: .95 });
      kit.cyl(.03 * s, .05 * s, .3 * s, cup, { parent: tc, x, y: .95 + .14 * s, seg: 8 });
      kit.cyl(.17 * s, .06 * s, .32 * s, cup, { parent: tc, x, y: .95 + .44 * s, seg: 14 });
      [-1, 1].forEach(q => kit.box(.05 * s, .16 * s, .03 * s, cup, { parent: tc, x: x + q * .19 * s, y: .95 + .58 * s }));
    };
    tro(-1.15, 1.25, mGold); tro(-.38, 1.05, mSilver); tro(.38, 1.5, mGold); tro(1.15, 1.1, mGold);
    colliders.push({ type: 'box', x: 30.6, z: -91.6, w: 3.6, d: 1.2, rot: -.18 });
    person({ x: 18.4, z: -89.6, ry: Math.PI + .3, shirt: '#3B6EA5' }); person({ x: 19.9, z: -89.4, ry: Math.PI - .2 });
    person({ x: 30.2, z: -89.9, ry: Math.PI, shirt: '#F2F2F2' });
    kit.tree(15.7, -110, { s: .9 }); kit.tree(33.6, -109.6); kit.bush(17.5, -94.5); kit.bush(33, -94.2);
    spots.push({ id: 'cases', x: ax, z: -89.0, y: 4.5 });
  }

  /* ---------------- OPSCOM: committee room with workflow screen + canteen counter ---------------- */
  {
    const x = 21, z = -80.5, w = 10, d = 7, h = 4.2, fz = z + d / 2;
    box(w + .3, .3, d + .3, M.concrete, { x, z });
    rbox(w, h, d, .08, mYel, { x, y: .3, z });
    box(w + .2, .7, .3, mOff, { x, y: h - .3, z: fz });
    sign('opscom', 6.4, .8, { x: x - 1.2, y: h - .25, z: fz + .16 });
    box(1.6, 2.5, .1, mFrameD, { x: x - 4, y: .3, z: fz }); box(1.36, 2.36, .08, mTrans, { x: x - 4, y: .32, z: fz + .04 });
    box(.12, 2.5, .12, mAcc, { x: x - 4.86, y: .3, z: fz + .02 });
    box(2.2, 1.9, .06, mTrans, { x: x - 1.9, y: 1.0, z: fz + .02 }); box(2.4, .1, .25, mWhite, { x: x - 1.9, y: .92, z: fz + .1 });
    rbox(4.7, 2.6, .14, .04, mFrameD, { x: x + 2.4, y: .9, z: fz + .02 });
    sign('flow', 4.4, 2.2, { x: x + 2.4, y: 1.1, z: fz + .1 });
    const ru = new THREE.Group(); ru.position.set(x, 0, z); G.add(ru); kit.roofUnits(ru, { w: 8, d: 6, y: h + .3, seed: 5 });
    colliders.push({ type: 'box', x, z, w: w + .4, d: d + .4 });
    spots.push({ id: 'opscom', x, z: -74.3, y: 4.5 });
    // canteen kiosk
    const kx = 30.6, kz = -81.2, kw = 6.6, kd = 5.4, kf = kz + kd / 2;
    box(kw + .3, .3, kd + .3, M.concrete, { x: kx, z: kz });
    rbox(kw, 3.6, kd, .08, mRed, { x: kx, y: .3, z: kz });
    box(4.8, 1.3, .1, mFrameD, { x: kx, y: 1.25, z: kf - .02 });
    box(5.2, .08, .7, M.wood, { x: kx, y: 1.2, z: kf + .25 });
    if (!low) for (let i = 0; i < 6; i++) kit.cyl(.12, .12, .25, M.std(['#E07A2E', '#F2F2F2', '#2FA84F'][i % 3], { map: null }), { parent: G, x: kx - 2 + i * .8, y: 1.28, z: kf + .25, seg: 8 });
    for (let i = 0; i < 8; i++) cb(.72, .05, 1.5, i % 2 ? mWhite : mYellow, { x: kx - 2.52 + i * .72, y: 2.95, z: kf + .62, rx: .38 });
    sign('canteen', 2.4, 1.2, { x: kx, y: 3.25, z: kf + .02 });
    sign('menu', 1.2, 1.05, { x: kx + kw / 2 + .01, y: 1.3, z: kz + .8, ry: Math.PI / 2 });
    [-1.4, 0, 1.4].forEach(dx => { cyl(.2, .2, .06, mFrameD, { x: kx + dx, y: .7, z: kf + .9, seg: 10 }); cyl(.04, .04, .7, mAlu, { x: kx + dx, z: kf + .9, seg: 6 }); });
    person({ x: kx - 1.4, z: kf + 1.35, ry: Math.PI, shirt: '#F2B705' }); person({ x: kx + .5, z: kf + 1.4, ry: Math.PI + .2 });
    person({ x: kx - .3, y: .3, z: kz + 1.6, ry: 0, shirt: '#F2F2F2' });
    colliders.push({ type: 'box', x: kx, z: kz + .2, w: kw + .4, d: kd + 1.2 });
    // outdoor tables with umbrellas
    [[28.2, -74.6], [32.3, -74.9]].forEach(([tx, tz], i) => {
      cyl(.5, .5, .05, mWhite, { x: tx, y: .74, z: tz, seg: 16 }); cyl(.05, .05, .74, mFrameD, { x: tx, z: tz, seg: 6 });
      cyl(.03, .03, 2.4, mAlu, { x: tx, y: .74, z: tz, seg: 6 });
      kit.cone(1.5, .55, i ? mYellow : mWhite, { parent: G, x: tx, y: 2.65, z: tz, seg: 8 });
      [[-.85, 0, Math.PI / 2], [.85, 0, -Math.PI / 2]].forEach(([dx, dz, ry], k) => {
        box(.42, .45, .42, mFrameD, { x: tx + dx, z: tz + dz });
        if (!low || k === 0) person({ x: tx + dx * 1.05, z: tz + dz, ry, pose: 'sit' });
      });
      colliders.push({ type: 'circle', x: tx, z: tz, r: 1.3 });
    });
    kit.tree(34, -87.5, { kind: 'palm' }); kit.bush(26.6, -84.6, { s: .8 });
  }

  /* ---------------- students walking (baked figures in dynamic holders) ---------------- */
  const walkers = [];
  const walker = (pts, speed, seed, shirt) => {
    const holder = new THREE.Group(); holder.userData.dynamic = true; G.add(holder);
    const p = lowPoly(() => kit.person({ seed, shirt })); kit.bake(p); holder.add(p);
    const segs = []; let tot = 0;
    for (let i = 0; i < pts.length; i++) { const a = pts[i], b = pts[(i + 1) % pts.length], L = Math.hypot(b[0] - a[0], b[1] - a[1]); segs.push({ a, b, L, s0: tot, h: Math.atan2(b[0] - a[0], b[1] - a[1]) }); tot += L; }
    walkers.push({ holder, p, segs, tot, s: R() * tot, speed });
  };
  walker([[1.3, -71.5], [1.3, -87.5], [-1.3, -87.5], [-1.3, -71.5]], 1.25, 901, '#F2F2F2');
  if (!low) {
    walker([[-15.5, -72.4], [15.5, -72.4], [15.5, -73.6], [-15.5, -73.6]], 1.1, 902, ACC);
    walker([[16.5, -88.2], [33, -88.2], [33, -87.2], [16.5, -87.2]], 1.0, 903, '#3B6EA5');
  }

  kit.bake(G);
  return {
    group: G, colliders, spots,
    update(dt, t) {
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
