/* ailab.js: the AI Lab. A glass-and-white pavilion lab with a green roof and solar panels,
   and an outdoor "product walk" of four display kiosks (Transit One, FinBuddy, Crave, Chhatri).
   Plot (74, -64), 48 x 44; the spoke road arrives at the south-west corner (50, -42).
   Local helpers (not in kit): ribbon(), bicycle(), screenMat(), dashTex(). */

import { mergeGeometries } from 'three/addons/utils/BufferGeometryUtils.js';

export async function build(ctx) {
  const { THREE, kit, M, quality } = ctx;
  const low = quality === 'low';
  const ACC = '#3B82F6', ACC_D = '#1D4ED8';
  const g = new THREE.Group();
  const dyn = new THREE.Group(); dyn.userData.dynamic = true; g.add(dyn);
  const colliders = [], spots = [];
  const R = kit.rng(4242);

  /* ---------------------------------------------------------------- materials */
  const white = M.std('#F7F7F4', { rough: .5 });
  const offWhite = M.std('#ECEDEA', { rough: .7 });
  const accent = M.std(ACC, { rough: .45, map: null });
  const accentDark = M.std(ACC_D, { rough: .45, map: null });
  const darkMetal = M.std('#30353C', { rough: .45, metal: .5, map: null });
  const steel = M.metal;
  const glassT = new THREE.MeshPhysicalMaterial({ color: '#D3E8F6', roughness: .04, metalness: .1, transparent: true, opacity: .26, clearcoat: 1, envMapIntensity: 1.6, depthWrite: false });
  const soil = M.std('#6B4A33', { map: null, rough: 1 });
  const glow = M.emit('#9CC8FF', 1.2);
  const tl = new THREE.TextureLoader();
  const screenMat = url => { const t = tl.load(url); t.colorSpace = THREE.SRGBColorSpace; t.anisotropy = low ? 2 : 8; return new THREE.MeshBasicMaterial({ map: t, toneMapped: false }); };
  // solar panel texture: dark blue cells
  const solarTex = kit.canvasTex(128, 128, (c, w, h) => {
    c.fillStyle = '#1C2C4C'; c.fillRect(0, 0, w, h);
    for (let y = 0; y < 4; y++) for (let x = 0; x < 4; x++) {
      const gr = c.createLinearGradient(0, y * 32, 0, y * 32 + 32); gr.addColorStop(0, '#2C4776'); gr.addColorStop(1, '#203660');
      c.fillStyle = gr; c.fillRect(x * 32 + 2, y * 32 + 2, 28, 28);
    }
    c.strokeStyle = 'rgba(200,215,240,.35)'; c.lineWidth = 1; for (let i = 0; i <= 128; i += 8) { c.beginPath(); c.moveTo(i, 0); c.lineTo(i, h); c.stroke(); }
  });
  const solarM = new THREE.MeshStandardMaterial({ map: solarTex, roughness: .22, metalness: .55, envMapIntensity: 1.2 }); solarM.userData.metres = 1.6;
  // a dashboard texture for the LED wall inside the lab
  const dashTex = kit.canvasTex(512, 256, (c, w, h) => {
    c.fillStyle = '#0F1B33'; c.fillRect(0, 0, w, h);
    c.fillStyle = '#16264A'; [[10, 10, 236, 112], [256, 10, 246, 112], [10, 132, 160, 114], [180, 132, 322, 114]].forEach(([x, y, a, b]) => c.fillRect(x, y, a, b));
    c.font = '700 15px Inter, Arial'; c.fillStyle = '#9CC8FF'; c.fillText('BUILD LOG', 22, 32); c.fillText('COMMITS', 268, 32); c.fillText('STACK', 22, 154);
    c.strokeStyle = '#4F9BFF'; c.lineWidth = 3; c.beginPath();
    for (let i = 0; i < 12; i++) { const x = 24 + i * 18, y = 104 - (Math.sin(i * .7) * 14 + i * 4.5); i ? c.lineTo(x, y) : c.moveTo(x, y); } c.stroke();
    for (let i = 0; i < 10; i++) { const bh = 18 + ((i * 37) % 60); c.fillStyle = i === 9 ? '#5EEAD4' : '#3B82F6'; c.fillRect(272 + i * 22, 112 - bh, 14, bh); }
    [['RAG', .82], ['Agents', .64], ['Vision', .41]].forEach(([t, v], i) => { c.fillStyle = '#C8DBFF'; c.font = '600 13px Inter, Arial'; c.fillText(t, 22, 180 + i * 22); c.fillStyle = '#26406E'; c.fillRect(84, 170 + i * 22, 76, 10); c.fillStyle = '#5EA0FF'; c.fillRect(84, 170 + i * 22, 76 * v, 10); });
    c.font = '800 44px Inter, Arial'; c.fillStyle = '#FFFFFF'; c.fillText('4', 200, 200); c.font = '600 14px Inter, Arial'; c.fillStyle = '#9CC8FF'; c.fillText('products built', 230, 196);
    c.font = '800 44px Inter, Arial'; c.fillStyle = '#5EEAD4'; c.fillText('1', 360, 200); c.font = '600 14px Inter, Arial'; c.fillStyle = '#9CC8FF'; c.fillText('live & public', 386, 196);
    c.fillStyle = '#4F9BFF'; c.fillRect(200, 220, 290, 3);
  }, { repeat: false });
  const dashM = new THREE.MeshBasicMaterial({ map: dashTex, toneMapped: false });
  const monTex = kit.canvasTex(128, 80, (c, w, h) => {
    c.fillStyle = '#13213D'; c.fillRect(0, 0, w, h);
    const cols = ['#5EA0FF', '#9CC8FF', '#5EEAD4', '#C8DBFF'];
    for (let i = 0; i < 9; i++) { c.fillStyle = cols[i % 4]; c.fillRect(8 + (i % 3) * 6, 8 + i * 7, 30 + ((i * 29) % 70), 3); }
  }, { repeat: false });
  const monM = new THREE.MeshBasicMaterial({ map: monTex, toneMapped: true, color: '#cfe0ff' });

  /* ---------------------------------------------------------------- local helpers */
  // a smooth flat strip along points [[x,z],...] (width w), base at y
  function ribbon(pts, w, y, mat, parent = g) {
    const curve = new THREE.CatmullRomCurve3(pts.map(([x, z]) => new THREE.Vector3(x, 0, z)));
    const n = Math.max(8, Math.round(curve.getLength() / 1.2)), P = curve.getSpacedPoints(n);
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
  // a parked bicycle facing +x (local), base at y
  function bicycle(o) {
    const b = new THREE.Group(), frameM = M.std(o.color || '#2E6FD8', { map: null, rough: .4, metal: .3 });
    [-.52, .52].forEach(x => { const t = new THREE.Mesh(new THREE.TorusGeometry(.33, .028, 6, low ? 12 : 18), M.rubber); t.position.set(x, .35, 0); b.add(t); });
    kit.box(1.0, .04, .04, frameM, { parent: b, y: .52, rz: .12 });
    kit.box(.04, .45, .04, frameM, { parent: b, x: -.15, y: .35, rz: -.25 });
    kit.box(.62, .04, .04, frameM, { parent: b, x: -.25, y: .42, rz: -.62 });
    kit.box(.22, .05, .1, darkMetal, { parent: b, x: -.22, y: .82 });
    kit.box(.04, .5, .04, frameM, { parent: b, x: .45, y: .4, rz: .3 });
    kit.box(.04, .04, .5, darkMetal, { parent: b, x: .38, y: .9 });
    return kit.place(b, o);
  }
  const person = o => (low && o.lowSkip) ? null : kit.person(Object.assign({ parent: g, seed: Math.floor(R() * 1e6) }, o));

  /* ---------------------------------------------------------------- ground */
  const X0 = 50, X1 = 98, Z0 = -86, Z1 = -42;
  kit.plane(X1 - X0 - 1, Z1 - Z0 - 1, M.grass, { parent: g, x: 74, z: -64, y: .025 });
  // plaza / product walk paving (south band) with kerb
  const pav = M.paving, kerbM = M.std('#C9C4BB', { rough: .9 });
  kit.box(47, .1, 22.6, pav, { parent: g, x: 74, z: -53.3 });
  kit.box(16, .14, .2, kerbM, { parent: g, x: 58.5, z: -64.6 });
  // walk strip in lighter tiles in front of the kiosks
  kit.box(40, .02, 4.2, M.tiles, { parent: g, x: 76, z: -48.6, y: .1 });
  kit.box(40, .025, .12, accent, { parent: g, x: 76, z: -46.45, y: .1 });
  // apron that joins the spoke road end to the plaza, with bollards across the road mouth
  {
    const ux = .766, uz = -.643, px = .643, pz = .766; // road direction and its perpendicular
    const E = t => [50 + px * t, -42 + pz * t];
    const E1 = E(-6.1), E2 = E(6.1);
    kit.extrude([E1, E2, [57, -42.3], [50.3, -53]], .1, pav, { parent: g, y: 0 });
    kit.extrude([E(-3.5), E(3.5), [50 + px * 3.5 + ux * 1.2, -42 + pz * 3.5 + uz * 1.2], [50 - px * 3.5 + ux * 1.2, -42 - pz * 3.5 + uz * 1.2]], .02, M.asphalt, { parent: g, y: .1 });
    for (let t = -3; t <= 3.01; t += 1.5) { const [bx, bz] = E(t); kit.cyl(.11, .13, .9, M.std('#3E434A', { map: null, rough: .5, metal: .4 }), { parent: g, x: bx + ux * 1.6, z: bz + uz * 1.6, y: .1, seg: 10 }); kit.cyl(.115, .115, .08, accent, { parent: g, x: bx + ux * 1.6, z: bz + uz * 1.6, y: .8, seg: 10 }); }
    // entrance monolith facing the road
    const mono = new THREE.Group(); kit.place(mono, { parent: g, x: 54.6, z: -49.8, y: .1, ry: Math.atan2(-ux, -uz) });
    kit.rbox(2.2, 4.6, .55, .1, white, { parent: mono });
    kit.box(2.22, .14, .57, accent, { parent: mono, y: 4.2 });
    kit.label([{ text: 'AI LAB', size: .55, weight: 800, color: ACC }, { text: 'Products by Pratham', size: .18, weight: 600, color: '#5B6470' }], { parent: mono, w: 2, h: 1.5, y: 2.4, z: .285 });
    kit.label([{ text: '→', size: .5, weight: 700, color: '#1F2328' }, { text: 'Product walk', size: .17, weight: 600, color: '#5B6470' }], { parent: mono, w: 2, h: 1.1, y: 1.0, z: .285 });
    colliders.push({ type: 'box', x: 54.6, z: -49.8, w: 2.4, d: .8, rot: Math.atan2(-ux, -uz) });
  }

  /* ---------------------------------------------------------------- the lab pavilion */
  const LX = 81, LZ = -74, LW = 26, LD = 16, GH = 4.8;   // ground floor x 68..94, z -82..-66
  {
    const lab = new THREE.Group(); g.add(lab);
    kit.box(LW + 3, .3, LD + 2.4, M.std('#E4DFD6', { map: 'tiles', rough: .8 }), { parent: lab, x: LX, z: LZ + .4 });  // terrace plinth
    kit.box(LW + 3.02, .06, .14, accent, { parent: lab, x: LX, z: LZ + .4 + (LD + 2.4) / 2, y: .26 });
    // interior floor
    kit.box(LW - .4, .04, LD - .4, M.std('#EEF1F4', { map: 'tiles', rough: .5 }), { parent: lab, x: LX, z: LZ, y: .3 });
    // glass curtain walls (transparent) with white mullions
    const fy = .34, wallH = GH - .3;
    [[LW, 0, LD / 2], [LW, 0, -LD / 2], [LD, Math.PI / 2, LW / 2], [LD, Math.PI / 2, -LW / 2]].forEach(([len, ry, off]) => {
      const s = new THREE.Group(); s.rotation.y = ry;
      if (ry) s.position.set(LX + off, 0, LZ); else s.position.set(LX, 0, LZ + off); lab.add(s);
      const front = !ry && off > 0;
      if (front) {
        // leave the door bay open (doors added below)
        const dx = 76 - LX;
        kit.box(dx + len / 2 - 1.6, wallH, .05, glassT, { parent: s, x: (-len / 2 + dx - 1.6) / 2, y: fy, cast: false });
        kit.box(len / 2 - dx - 1.6, wallH, .05, glassT, { parent: s, x: (len / 2 + dx + 1.6) / 2, y: fy, cast: false });
        kit.box(3.2, wallH - 2.6, .05, glassT, { parent: s, x: dx, y: fy + 2.6, cast: false });
      } else kit.box(len, wallH, .05, glassT, { parent: s, y: fy, cast: false });
      const n = Math.round(len / 2.2);
      for (let i = 0; i <= n; i++) kit.box(.09, wallH, .14, white, { parent: s, x: -len / 2 + i * len / n, y: fy });
      kit.box(len, .1, .14, white, { parent: s, y: fy + 2.7 });             // transom
      kit.box(len + .1, .12, .16, offWhite, { parent: s, y: fy });           // sill
    });
    // entrance doors (blue frames) under the cantilever
    const dz = LZ + LD / 2;
    kit.box(3.3, .14, .2, accentDark, { parent: lab, x: 76, y: fy + 2.5, z: dz });
    [-1.6, 0, 1.6].forEach(dx => kit.box(.1, 2.5, .2, accentDark, { parent: lab, x: 76 + dx, y: fy, z: dz }));
    kit.box(1.45, 2.4, .04, glassT, { parent: lab, x: 75.2, y: fy, z: dz + .3, ry: -.5, cast: false });   // one leaf open
    kit.box(1.45, 2.4, .04, glassT, { parent: lab, x: 76.8, y: fy, z: dz, cast: false });
    kit.box(3.4, .03, 1.6, M.std('#8A929C', { map: null, rough: 1 }), { parent: lab, x: 76, y: .3, z: dz + 1 });  // mat
    // ground-floor roof slab and white fascia
    kit.box(LW + .4, .45, LD + .4, white, { parent: lab, x: LX, z: LZ, y: GH });
    kit.box(LW + .46, .1, LD + .46, accent, { parent: lab, x: LX, z: LZ, y: GH + .02 });
    // green roof on the exposed parts
    kit.box(LW - .4, .12, LD - .4, M.std('#79AE4C', { map: 'grass', rough: 1 }), { parent: lab, x: LX, z: LZ, y: GH + .45 });
    if (!low) for (let i = 0; i < 9; i++) kit.sphere(.28 + R() * .15, M.std('#5E9B3C', { map: null, rough: 1, flat: true }), { parent: lab, x: 69.2 + R() * 3, z: -81 + R() * 14, y: GH + .5, seg: 6, seg2: 4 });
    // ---- upper floor: white box cantilevering south over the entrance
    const UX = 82.5, UZ = -71, UW = 20, UD = 15.5, UY = GH + .45, UH = 4.2;   // x 72.5..92.5, z -78.75..-63.25
    kit.rbox(UW, .5, UD, .06, white, { parent: lab, x: UX, z: UZ, y: UY });
    kit.rbox(UW, .7, UD, .06, white, { parent: lab, x: UX, z: UZ, y: UY + UH - .7 });
    kit.box(UW - .6, UH - 1.2, UD - .6, M.std('#DDE3EA', { rough: .6 }), { parent: lab, x: UX, z: UZ, y: UY + .5 });
    // ribbon windows (reflective) with fins all round
    [[UW, 0, UD / 2], [UW, Math.PI, UD / 2], [UD, Math.PI / 2, UW / 2], [UD, -Math.PI / 2, UW / 2]].forEach(([len, ry, off]) => {
      const s = new THREE.Group(); s.rotation.y = ry; s.position.set(UX + Math.sin(ry) * off, 0, UZ + Math.cos(ry) * off); lab.add(s);
      kit.box(len - .4, UH - 1.2, .06, M.glass, { parent: s, y: UY + .5, z: -.28 });
      const n = Math.round(len / 1.6);
      for (let i = 1; i < n; i++) kit.box(.12, UH - 1.2, .45, white, { parent: s, x: -len / 2 + i * len / n, y: UY + .5, z: -.1 });
    });
    kit.box(UW + .04, .16, UD + .04, accent, { parent: lab, x: UX, z: UZ, y: UY + UH - .45 });     // blue accent line
    // soffit lights under the cantilever
    for (let i = 0; i < 4; i++) kit.box(2.2, .04, .25, glow, { parent: lab, x: 74.5 + i * 2.6 + (i > 1 ? 6 : 0), z: -64.6, y: UY - .04 });
    // sign on the cantilever fascia
    kit.label([{ text: 'AI LAB', size: 1.25, weight: 800, color: ACC }], { parent: lab, w: 7, h: 1.6, x: 82.5, y: UY + 1.65, z: UZ + UD / 2 + .3 });
    kit.box(7.4, 1.9, .05, white, { parent: lab, x: 82.5, y: UY + 1.5, z: UZ + UD / 2 + .26 });
    kit.label([{ text: 'Products · Prototypes · Experiments', size: .3, weight: 600, color: '#44505E' }], { parent: lab, w: 7, h: .5, x: 82.5, y: UY + 1.0, z: UZ + UD / 2 + .31 });
    // roof: parapet, green roof and solar array
    const RY = UY + UH;
    kit.box(UW - .6, .1, UD - .6, M.std('#79AE4C', { map: 'grass', rough: 1 }), { parent: lab, x: UX, z: UZ, y: RY });
    const rows = low ? 3 : 4, cols = 5;
    for (let r = 0; r < rows; r++) for (let c = 0; c < cols; c++) {
      const px = UX - 7.2 + c * 3.6, pz = UZ - 5 + r * 3.1;
      kit.box(3.3, .06, 1.9, solarM, { parent: lab, x: px, z: pz, y: RY + .55, rx: -.32 });
      kit.box(.06, .5, .06, steel, { parent: lab, x: px - 1.4, z: pz + .7, y: RY + .1 }); kit.box(.06, .5, .06, steel, { parent: lab, x: px + 1.4, z: pz + .7, y: RY + .1 });
      kit.box(.06, .85, .06, steel, { parent: lab, x: px - 1.4, z: pz - .7, y: RY + .1 }); kit.box(.06, .85, .06, steel, { parent: lab, x: px + 1.4, z: pz - .7, y: RY + .1 });
    }
    kit.rbox(1.6, 1, 1.2, .05, M.std('#E2E2DE', { rough: .5 }), { parent: lab, x: UX + 8, z: UZ + 6.2, y: RY });
    // ---- interior: LED wall, desks with monitors, a round table, people
    kit.box(10, 4.1, .5, white, { parent: lab, x: 80, y: .3, z: -81.2 });          // back core wall
    const led = new THREE.Mesh(new THREE.PlaneGeometry(8.6, 3.0), dashM); led.position.set(80, 2.15, -80.92); lab.add(led);
    kit.box(8.9, 3.3, .1, darkMetal, { parent: lab, x: 80, y: .65, z: -80.98 });
    kit.box(.5, 4.1, 6, white, { parent: lab, x: 92.6, y: .3, z: -77 });            // side core
    const deskTop = M.std('#F4F2EE', { rough: .5, map: null }), monFrame = M.std('#22262C', { rough: .4, map: null });
    const desks = low ? [[72, -77], [78, -74], [86, -74]] : [[71.5, -78], [71.5, -74], [77.5, -76], [83.5, -76], [89.5, -74], [89.5, -70], [71.5, -70.5]];
    desks.forEach(([x, z], i) => {
      kit.box(3, .06, 1.2, deskTop, { parent: lab, x, z, y: 1.04 });
      [-1.4, 1.4].forEach(dx => kit.box(.06, .74, 1.0, steel, { parent: lab, x: x + dx, z, y: .3 }));
      [-.7, .7].forEach(dx => {
        kit.box(.7, .42, .04, monFrame, { parent: lab, x: x + dx, z: z - .35, y: 1.25 });
        const s = new THREE.Mesh(new THREE.PlaneGeometry(.64, .36), monM); s.position.set(x + dx, 1.46, z - .325); lab.add(s);
        kit.box(.05, .2, .05, monFrame, { parent: lab, x: x + dx, z: z - .38, y: 1.08 });
      });
      if (i % 2 === 0 || !low) person({ x: x - .7, z: z + .45, y: .3, ry: Math.PI, pose: 'sit', lowSkip: i > 1 });
    });
    // round table near the entrance and a standing pair in front of the LED wall
    kit.cyl(1, 1, .06, deskTop, { parent: lab, x: 82, z: -69.5, y: 1.0, seg: 24 }); kit.cyl(.08, .2, .7, steel, { parent: lab, x: 82, z: -69.5, y: .3, seg: 10 });
    person({ x: 81, z: -69.2, y: .3, ry: 1.2, lowSkip: true }); person({ x: 83.1, z: -69.9, y: .3, ry: -1.6, lowSkip: true });
    person({ x: 78.6, z: -78.6, y: .3, ry: Math.PI, shirt: ACC }); person({ x: 81.2, z: -78.3, y: .3, ry: Math.PI + .3, lowSkip: true });
    // plants inside
    if (!low) [[69.3, -81], [92.6, -67], [69.3, -67]].forEach(([x, z]) => { kit.cyl(.35, .28, .6, white, { parent: lab, x, z, y: .3, seg: 12 }); kit.sphere(.55, M.std('#5E9B3C', { map: null, rough: 1, flat: true }), { parent: lab, x, z, y: .8, seg: 7, seg2: 5 }); });
    colliders.push({ type: 'box', x: LX, z: LZ, w: LW + .4, d: LD + .4 });
    spots.push({ id: 'main', x: 76, z: -60.6, y: 4.2 });
  }

  /* ---------------------------------------------------------------- kiosks (the product walk) */
  const KZ = -53;
  const kiosk = (x, num, name, status, url, phone) => {
    const k = new THREE.Group(); kit.place(k, { parent: g, x, z: KZ, y: .1 });
    kit.rbox(phone ? 2.4 : 4.2, .22, 1.4, .06, M.concrete, { parent: k });                    // plinth
    if (phone) {
      // pedestal + a giant standing phone
      kit.rbox(1.9, 1.05, .8, .08, white, { parent: k, y: .2 });
      kit.box(1.92, .08, .82, accent, { parent: k, y: 1.2 });
      kit.rbox(1.56, 3.0, .2, .2, M.std('#1B1E23', { rough: .3, metal: .3, map: null }), { parent: k, y: 1.28, seg: 3 });
      const scr = new THREE.Mesh(new THREE.PlaneGeometry(1.36, 2.66), screenMat(url)); scr.position.set(0, 1.28 + 1.5, .105); k.add(scr);
      kit.rbox(.42, .07, .02, .03, M.std('#0E1013', { map: null }), { parent: k, y: 1.28 + 2.84, z: .1 });     // notch
      kit.box(.04, .3, .14, M.std('#1B1E23', { map: null }), { parent: k, x: .8, y: 3.4 });
      kit.label([{ text: num, size: .16, weight: 800, color: ACC }, { text: name, size: .24, weight: 800 }, { text: status, size: .13, weight: 600, color: '#5B6470' }], { parent: k, w: 1.8, h: .9, y: .27, z: .405, bg: '#FFFFFF' });
      kit.label([{ text: num, size: .5, weight: 800, color: ACC }], { parent: k, w: 1.2, h: .8, y: .3, z: -.405, ry: Math.PI });
    } else {
      // white monolith with a landscape screen
      kit.rbox(3.9, 4.1, .45, .12, white, { parent: k, y: .2 });
      kit.box(3.92, .12, .47, accent, { parent: k, y: 4.05 });
      kit.box(3.5, 2.42, .04, M.std('#14171C', { map: null, rough: .3 }), { parent: k, y: 1.53, z: .225 });
      const scr = new THREE.Mesh(new THREE.PlaneGeometry(3.4, 2.35), screenMat(url)); scr.position.set(0, 1.565 + 1.175, .25); k.add(scr);
      kit.label([{ text: num + '  ' + name, size: .3, weight: 800 }, { text: status, size: .17, weight: 600, color: ACC }], { parent: k, w: 3.5, h: .95, y: .45, z: .23, bg: '#FFFFFF' });
      kit.box(1.2, .9, .03, offWhite, { parent: k, y: 1.5, z: -.24 });       // back service panel
      kit.label([{ text: num, size: .9, weight: 800, color: ACC }], { parent: k, w: 2, h: 1.2, y: 2.6, z: -.235, ry: Math.PI });
    }
    colliders.push({ type: 'box', x, z: KZ, w: phone ? 2.4 : 4.2, d: 1.4 });
    return k;
  };
  const KX = [60, 70, 80, 90];
  kiosk(KX[0], '01', 'Transit One', 'Prototype', 'images/transit-one-preview.png', true);
  kiosk(KX[1], '02', 'FinBuddy', 'Live', 'images/finbuddy-preview.png');
  kiosk(KX[2], '03', 'Crave Command Center', 'Concept sim', 'images/crave-preview.png');
  kiosk(KX[3], '04', 'Chhatri', 'Concept deck', 'images/chhatri-preview.png');
  ['transit-one', 'finbuddy', 'crave', 'chhatri'].forEach((id, i) => spots.push({ id, x: KX[i], z: -50.4, y: 7.2 }));

  // themed objects, each on a small round display plinth to the east of its kiosk
  const plinth = (x, z, r = .9) => { kit.cyl(r, r + .05, .45, white, { parent: g, x, z, y: .1, seg: 24 }); kit.cyl(r + .02, r + .02, .05, accent, { parent: g, x, z, y: .5, seg: 24 }); colliders.push({ type: 'circle', x, z, r: r + .15 }); return .55; };
  {
    // 1. Transit One: a small coach model
    const y = plinth(KX[0] + 2.5, KZ + .3, .95);
    kit.bus({ parent: g, x: KX[0] + 2.5, z: KZ + .3, y, ry: -.6, text: 'TRANSIT ONE', stripe: ACC }).scale.setScalar(.15);
    // 2. FinBuddy: coin stack + rising bar chart; one coin spins
    const fx = KX[1] + 2.9, fz = KZ + .3; const fy = plinth(fx, fz, .95);
    const gold = M.std('#E8B931', { rough: .3, metal: .7, map: null }), green = M.std('#22A06B', { rough: .5, map: null });
    for (let i = 0; i < 6; i++) kit.cyl(.26, .26, .07, gold, { parent: g, x: fx - .45 + Math.sin(i) * .02, z: fz + .2, y: fy + i * .075, seg: 18 });
    for (let i = 0; i < 3; i++) kit.cyl(.26, .26, .07, gold, { parent: g, x: fx - .3, z: fz - .35, y: fy + i * .075, seg: 18 });
    [.35, .6, .9].forEach((h, i) => kit.box(.2, h, .2, i === 2 ? green : accent, { parent: g, x: fx + .05 + i * .26, z: fz, y: fy }));
    kit.box(.75, .07, .07, green, { parent: g, x: fx + .35, z: fz - .05, y: fy + 1.05, rz: .5 });
    kit.cone(.1, .2, green, { parent: g, x: fx + .7, z: fz - .05, y: fy + 1.18, rz: -1.07, seg: 8 });
    const coin = new THREE.Group(); coin.position.set(fx - .45, fy + 1.15, fz + .2); dyn.add(coin);
    const cm = new THREE.Mesh(new THREE.CylinderGeometry(.3, .3, .06, 24), gold); cm.rotation.x = Math.PI / 2; cm.castShadow = true; coin.add(cm);
    const cr = new THREE.Mesh(new THREE.CylinderGeometry(.18, .18, .07, 20), M.std('#F5D262', { rough: .3, metal: .6, map: null })); cr.rotation.x = Math.PI / 2; coin.add(cr);
    dyn.userData.coin = coin;
    // 3. Crave: a delivery scooter with a warm red box
    plinth(KX[2] + 2.9, KZ + .3, .95);
    kit.scooter({ parent: g, x: KX[2] + 2.9, z: KZ + .3, y: .55, ry: -.8, color: '#E8473B', boxColor: '#E8473B' });
    // 4. Chhatri: a small house with a bright white cool roof
    {
      const hx = KX[3] + 2.9, hz = KZ + .3, hy = plinth(hx, hz, .95);
      const hs = new THREE.Group(); kit.place(hs, { parent: g, x: hx, z: hz, y: hy, ry: -.35 });
      kit.box(1.1, .7, .85, M.std('#E9A35A', { rough: .9 }), { parent: hs });
      kit.box(1.22, .08, .97, M.std('#FFFFFF', { rough: .25, map: null }), { parent: hs, y: .7 });
      kit.box(1.18, .05, .93, M.emit('#FFFFFF', 1), { parent: hs, y: .78 });
      kit.box(.24, .42, .03, M.std('#7A4E2E', { map: null }), { parent: hs, x: -.2, z: .43 });
      kit.box(.26, .2, .03, M.glass, { parent: hs, x: .25, y: .3, z: .43 });
      // sun rays bouncing off the roof
      [-.3, 0, .3].forEach(dx => kit.box(.04, .45, .04, M.std('#FFC23D', { map: null, rough: .5 }), { parent: hs, x: dx, y: 1.0, rz: dx * .6 }));
    }
  }
  // visitors at the kiosks
  person({ x: 58.4, z: -50.2, ry: Math.PI, shirt: '#F2F2F2' });
  person({ x: 61, z: -50.6, ry: Math.PI + .4, lowSkip: true });
  person({ x: 68.5, z: -49.9, ry: Math.PI - .2 });
  person({ x: 78.3, z: -50.1, ry: Math.PI + .2, lowSkip: true }); person({ x: 81.6, z: -49.7, ry: Math.PI - .3 });
  person({ x: 91.3, z: -50.1, ry: Math.PI, lowSkip: true });
  person({ x: 66, z: -45.4, ry: 1.57, lowSkip: true }); person({ x: 79.5, z: -62.5, ry: -2.2 });

  /* ---------------------------------------------------------------- campus details */
  // lamps along the walk, benches and planters between kiosks and the lab
  [56, 65, 75, 85, 94].forEach(x => kit.lamp(x, -44.2, { ry: Math.PI }));
  // two raised lawn beds between the walk and the lab, leaving the centre (x 72..80) open toward the doors
  const bed = (x0, x1) => {
    const cx = (x0 + x1) / 2, w = x1 - x0, z = -58.6, d = 4.6;
    kit.rbox(w, .45, d, .06, M.concrete, { parent: g, x: cx, z, y: .1 });
    kit.box(w - .4, .06, d - .4, M.std('#86BC55', { map: 'grass', rough: 1 }), { parent: g, x: cx, z, y: .52 });
    colliders.push({ type: 'box', x: cx, z, w, d });
    return { cx, w, z };
  };
  const b1 = bed(55, 70.5), b2 = bed(81.5, 95);
  [[57.5, -58.4, 1], [66.5, -59.2, .9], [85, -59.1, 1.05], [92.5, -58.3, .95]].forEach(([x, z, s]) => kit.tree(x, z, { s }));
  [[60.5, -57.6], [62.2, -59.6], [69, -57.7], [83, -57.5], [88.5, -59.8], [90.2, -57.7], [55.8, -60.1], [94, -60.2]].forEach(([x, z]) => kit.bush(x, z, { s: .6 }));
  if (!low) {
    const fl = ['#F25C78', '#FFC23D', '#FFFFFF', '#8FB8FF'];
    for (let i = 0; i < 28; i++) { const bb = i % 2 ? b1 : b2, x = bb.cx + (R() - .5) * (bb.w - 1.5), z = bb.z + (R() - .5) * 3.4; kit.sphere(.16 + R() * .08, M.std(fl[i % 4], { map: null, rough: .8 }), { parent: g, x, z, y: .5, seg: 6, seg2: 4 }); }
  }
  // benches on the bed fronts, facing the kiosks
  kit.bench(63.5, -55.95, { ry: 0 }); kit.bench(87.5, -55.95, { ry: 0 });
  person({ x: 63.1, z: -56.2, pose: 'sit', ry: 0, lowSkip: true });
  colliders.push({ type: 'box', x: 63.5, z: -55.9, w: 1.9, d: .6 }, { type: 'box', x: 87.5, z: -55.9, w: 1.9, d: .6 });
  // inlaid accent lines in the paving leading to the doors
  [74.2, 77.8].forEach(x => kit.box(.12, .02, 10, accent, { parent: g, x, z: -57.4, y: .1 }));
  for (let z = -61; z <= -53.5; z += 2.5) kit.box(3.4, .02, .12, M.std('#E9E2D6', { rough: .8, map: null }), { parent: g, x: 76, z, y: .1 });
  // painted "start here" footprint arrow on the paving from the entrance
  if (!low) kit.label([{ text: 'PRODUCT WALK  →', size: .55, weight: 800, color: ACC }], { parent: g, w: 6, h: 1.1, x: 58.5, z: -45.6, y: .14, rx: -Math.PI / 2 });

  // solar-roofed bike shelter on the west lawn, opening south onto the plaza
  {
    const bx = 58.5, bz = -66.2;
    kit.box(11, .2, 4.4, M.paving, { parent: g, x: bx, z: bz });
    [-5, 0, 5].forEach(dx => kit.box(.14, 2.6, .14, steel, { parent: g, x: bx + dx, z: bz - 1.8, y: .2 }));
    [-5, 0, 5].forEach(dx => kit.box(.14, 2.95, .14, steel, { parent: g, x: bx + dx, z: bz + 1.8, y: .2 }));
    kit.box(11.2, .12, 4.8, white, { parent: g, x: bx, z: bz, y: 2.95, rx: -.08 });
    for (let i = 0; i < 4; i++) kit.box(2.6, .05, 4.4, solarM, { parent: g, x: bx - 4.1 + i * 2.75, z: bz, y: 3.1, rx: -.08 });
    kit.box(11.2, .1, .2, accent, { parent: g, x: bx, z: bz + 2.4, y: 3.05 });
    if (!low) {
      const cols = ['#2E6FD8', '#E8473B', '#22A06B', '#F2B705', '#2E6FD8', '#7C5CFF'];
      for (let i = 0; i < 6; i++) {
        const x = bx - 4.2 + i * 1.65;
        kit.box(.05, .7, .7, steel, { parent: g, x, z: bz - .2, y: .2 });
        bicycle({ parent: g, x: x + .3, z: bz - .1, y: .2, ry: Math.PI / 2 + .05, color: cols[i] });
      }
      kit.scooter({ parent: g, x: bx + 4.6, z: bz + 1.2, y: .2, ry: .3, color: '#F7F7F4', box: false });
    }
    colliders.push({ type: 'box', x: bx, z: bz - .4, w: 11, d: 3.4 });
  }
  // west lawn: trees, a path and a picnic table
  ribbon([[57, -63], [56.5, -70], [58, -76], [62, -80], [67, -83]], 1.8, .06, M.paving);
  [[53.5, -71], [54, -78], [60.5, -73], [53.5, -84], [63, -84.5], [96, -84.5], [96, -76.5], [96, -68.5]].forEach(([x, z], i) => kit.tree(x, z, { s: .9 + (i % 3) * .1 }));
  if (!low) for (let i = 0; i < 12; i++) kit.bush(70 + i * 2.2, -84.4, { s: .8 });
  if (!low) {
    const pt = new THREE.Group(); kit.place(pt, { parent: g, x: 61.5, z: -77.5, ry: .3 });
    kit.box(2, .06, .8, M.wood, { parent: pt, y: .72 });
    [-.55, .55].forEach(z => kit.box(2, .05, .3, M.wood, { parent: pt, z, y: .44 }));
    [-.8, .8].forEach(x => kit.box(.08, .72, 1.4, darkMetal, { parent: pt, x }));
    person({ x: 61.3, z: -76.8, pose: 'sit', ry: Math.PI + .3 });
    colliders.push({ type: 'box', x: 61.5, z: -77.5, w: 2.2, d: 1.6, rot: .3 });
  }
  // east side: a delivery drone pad (small, sells "lab")
  if (!low) {
    kit.cyl(1.6, 1.6, .06, M.std('#3E4652', { map: null }), { parent: g, x: 95, z: -63.5, y: .1, seg: 24 });
    kit.label([{ text: 'H', size: 1, weight: 800, color: '#FFFFFF' }], { parent: g, w: 1.6, h: 1.6, x: 95, z: -62.7, y: .17, rx: -Math.PI / 2 });
  }
  // a hovering drone (animated)
  const drone = new THREE.Group(); drone.position.set(95, 3.2, -63.5); dyn.add(drone);
  {
    const dm = M.std('#F7F7F4', { rough: .4, map: null });
    const body = new THREE.Mesh(new THREE.BoxGeometry(.5, .14, .5), dm); body.castShadow = true; drone.add(body);
    [[1, 1], [1, -1], [-1, 1], [-1, -1]].forEach(([a, b]) => { const arm = new THREE.Mesh(new THREE.BoxGeometry(.06, .05, .5), darkMetal); arm.position.set(a * .25, .03, b * .25); arm.rotation.y = Math.atan2(a, b); drone.add(arm); const r = new THREE.Mesh(new THREE.CylinderGeometry(.2, .2, .02, 12), M.std(ACC, { map: null, rough: .5 })); r.position.set(a * .4, .08, b * .4); drone.add(r); });
  }

  colorBake(THREE, kit, g);
  kit.bake(g);
  // bake removes nothing dynamic; keep references
  const coin = dyn.userData.coin;
  return {
    group: g, colliders, spots,
    update(dt, t) {
      coin.rotation.y = t * 1.6;
      coin.position.y = .55 + 1.15 + Math.sin(t * 2) * .06;
      drone.position.y = 3.2 + Math.sin(t * 1.3) * .5;
      drone.rotation.y = Math.sin(t * .4) * .8;
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
