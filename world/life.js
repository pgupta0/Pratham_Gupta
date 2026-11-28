/* life.js: ambient life for Pratham's Town, everywhere outside the district plots.
   Traffic on the ring (left-hand traffic: outer lane clockwise seen from above, inner lane anticlockwise),
   cars turning into a few spokes and back, buses stopping at bus stops, pedestrians walking the footpaths,
   trees / bushes / hedges / flower meadows / grass patches, lamps, benches, bins, bus shelters,
   parked cars, the beach (palms, umbrellas, loungers, lifeguard tower, pier), boats and a ferry,
   clouds and birds.
   Everything that repeats is instanced (one draw call per part, town-wide); static one-offs are baked.
   Moving vehicles are instances in per-type pools (not baked), animated in update() with no allocations. */
import { RoundedBoxGeometry } from 'three/addons/geometries/RoundedBoxGeometry.js';
import { mergeGeometries } from 'three/addons/utils/BufferGeometryUtils.js';

export async function build(ctx) {
  const { THREE, kit, M, layout, quality } = ctx;
  const { RING, SPOKES, PATHS, PLAZA, inPlot, onRoad } = layout;
  const low = quality === 'low';
  const TAU = Math.PI * 2;
  const R = kit.rng(9001);
  const group = new THREE.Group(); group.name = 'life';
  const statics = new THREE.Group(); group.add(statics);
  const colliders = [];
  const spots = ctx.spots || [], prior = ctx.colliders || [];
  const info = {};

  /* ------------------------------------------------------------ helpers */
  const wrap = a => ((a % TAU) + TAU) % TAU;
  const wrapS = a => { a = wrap(a); return a > Math.PI ? a - TAU : a; };
  const hash = (i, j, s) => { let h = (Math.imul(i, 374761393) + Math.imul(j, 668265263) + Math.imul(s, 982451653)) | 0; h = Math.imul(h ^ (h >>> 13), 1274126177); return ((h ^ (h >>> 16)) >>> 0) / 4294967296; };
  function vnoise(x, z, s) {
    const i = Math.floor(x), j = Math.floor(z), fx = x - i, fz = z - j, u = fx * fx * (3 - 2 * fx), v = fz * fz * (3 - 2 * fz);
    const a = hash(i, j, s), b = hash(i + 1, j, s), c = hash(i, j + 1, s), d = hash(i + 1, j + 1, s);
    return a + (b - a) * u + (c - a) * v + (a - b - c + d) * u * v;
  }
  const fbm = (x, z, s = 1) => vnoise(x / 34, z / 34, s) * .6 + vnoise(x / 13, z / 13, s + 7) * .3 + vnoise(x / 5, z / 5, s + 13) * .1;
  // signed distance to a rounded square (negative inside)
  const rsq = (x, z, half, r) => { const qx = Math.abs(x) - (half - r), qz = Math.abs(z) - (half - r); return Math.hypot(Math.max(qx, 0), Math.max(qz, 0)) + Math.min(Math.max(qx, qz), 0) - r; };
  const grassSdf = (x, z) => rsq(x, z, layout.ISLAND - 6, 26);
  const sandSdf = (x, z) => rsq(x, z, layout.ISLAND + 4, 32);

  // occupancy: things I placed (spatial hash), plus everyone else's colliders and spots
  const OCC = new Map(), CELL = 6;
  const occAdd = (x, z, r) => { const k = Math.floor(x / CELL) * 4096 + Math.floor(z / CELL); let a = OCC.get(k); if (!a) OCC.set(k, a = []); a.push(x, z, r); };
  const occHit = (x, z, r) => {
    const i0 = Math.floor(x / CELL), j0 = Math.floor(z / CELL);
    for (let i = i0 - 1; i <= i0 + 1; i++) for (let j = j0 - 1; j <= j0 + 1; j++) {
      const a = OCC.get(i * 4096 + j); if (!a) continue;
      for (let k = 0; k < a.length; k += 3) { const dx = a[k] - x, dz = a[k + 1] - z, rr = a[k + 2] + r; if (dx * dx + dz * dz < rr * rr) return true; }
    }
    return false;
  };
  const hitsPrior = (x, z, r) => {
    for (const c of prior) {
      if (c.type === 'circle') { const dx = x - c.x, dz = z - c.z, rr = c.r + r; if (dx * dx + dz * dz < rr * rr) return true; }
      else if (c.type === 'box') {
        const dx = x - c.x, dz = z - c.z, co = Math.cos(c.rot || 0), si = Math.sin(c.rot || 0);
        // test both rotation senses (cheap, conservative)
        const lx = dx * co - dz * si, lz = dx * si + dz * co, lx2 = dx * co + dz * si, lz2 = -dx * si + dz * co;
        if ((Math.abs(lx) < c.w / 2 + r && Math.abs(lz) < c.d / 2 + r) || (Math.abs(lx2) < c.w / 2 + r && Math.abs(lz2) < c.d / 2 + r)) return true;
      }
    }
    return false;
  };
  const nearSpot = (x, z, r) => { for (const s of spots) { const dx = x - s.x, dz = z - s.z, rr = 3 + r; if (dx * dx + dz * dz < rr * rr) return true; } return false; };
  // free: not in a plot, not on a road (unless roadMargin is null), not near a spot / collider / my stuff
  function free(x, z, r, roadMargin = .5) {
    if (inPlot(x, z, r + 1)) return false;
    if (roadMargin !== null && onRoad(x, z, r + roadMargin)) return false;
    if (nearSpot(x, z, r)) return false;
    if (hitsPrior(x, z, r)) return false;
    if (occHit(x, z, r)) return false;
    return true;
  }
  const nearWalk = (x, z) => onRoad(x, z, 9) || sandSdf(x, z) > -14;
  const addCircle = (x, z, r, force = false) => { if (force || nearWalk(x, z)) colliders.push({ type: 'circle', x: +x.toFixed(2), z: +z.toFixed(2), r: +r.toFixed(2) }); };

  const _m = new THREE.Matrix4(), _q = new THREE.Quaternion(), _e = new THREE.Euler(), _p = new THREE.Vector3(), _s = new THREE.Vector3(), _c = new THREE.Color();
  // a static instanced prop: items [{x,y,z,ry,rx,rz,s|sx,sy,sz,c}]
  function staticInst(geo, mat, items, { cast = true, parent = group } = {}) {
    if (!items.length) return null;
    const im = new THREE.InstancedMesh(geo, mat, items.length);
    items.forEach((it, i) => {
      _q.setFromEuler(_e.set(it.rx || 0, it.ry || 0, it.rz || 0, 'YXZ'));
      const s = it.s || 1; _m.compose(_p.set(it.x, it.y || 0, it.z), _q, _s.set(it.sx || s, it.sy || s, it.sz || s));
      im.setMatrixAt(i, _m); if (it.c) im.setColorAt(i, _c.set(it.c));
    });
    im.castShadow = cast; im.receiveShadow = true; im.computeBoundingSphere(); parent.add(im);
    return im;
  }
  const flatMat = (hex, o = {}) => new THREE.MeshStandardMaterial(Object.assign({ color: hex, roughness: .85 }, o));
  // collapse untextured parts into one vertex-coloured geometry (toy plastic look, one draw call)
  const plastic = new THREE.MeshStandardMaterial({ color: '#ffffff', vertexColors: true, roughness: .42, metalness: .05 });
  plastic.userData.collapsed = true;
  const collapsible = m => m && !m.map && !m.transparent && !m.vertexColors && m.color && m.side !== THREE.DoubleSide;
  function collapse(list) {   // list: [{geo, mat}] (geometries already in the same space)
    const geos = list.map(({ geo, mat }) => {
      let g = geo.index ? geo.toNonIndexed() : geo.clone();
      for (const k of Object.keys(g.attributes)) if (k !== 'position' && k !== 'normal') g.deleteAttribute(k);
      const n = g.attributes.position.count, c = new Float32Array(n * 3), col = mat.color.clone();
      if (mat.isMeshBasicMaterial) col.multiplyScalar(1 / Math.max(1, col.r, col.g, col.b));
      for (let i = 0; i < n; i++) { c[i * 3] = col.r; c[i * 3 + 1] = col.g; c[i * 3 + 2] = col.b; }
      g.setAttribute('color', new THREE.BufferAttribute(c, 3)); return g;
    });
    return mergeGeometries(geos);
  }

  const LANE = [RING.r + RING.w / 4, RING.r - RING.w / 4];          // 0: outer (clockwise), 1: inner (anticlockwise)
  const FOOT_OUT = RING.r + RING.w / 2 + RING.foot / 2, FOOT_IN = RING.r - RING.w / 2 - RING.foot / 2; // 54, 42
  const KH = .14;                                                     // footpath top
  const spokeAng = SPOKES.map(s => Math.atan2(s.to[1], s.to[0]));
  const nearSpokeMouth = (a, r, extra) => spokeAng.some(sa => Math.abs(wrapS(a - sa)) * r < 3.5 + 2.4 + extra);
  const pathAng = PATHS.map(p => Math.atan2(p.to[1], p.to[0]));
  const nearPath = (a, r, extra) => pathAng.some(pa => Math.abs(wrapS(a - pa)) * r < 2 + extra);
  const faceIn = a => Math.atan2(-Math.cos(a), -Math.sin(a));        // ry so local +z points to the centre
  const STOPS = [-115, -16, 110].map(d => d * Math.PI / 180);         // bus stop angles (outer side)

  /* ============================================================ 1. street furniture */
  // ---- lamps along the ring (both sides) and the spokes
  let lamps = 0;
  const lampAt = (x, z, ry) => { kit.lamp(x, z, { ry }); occAdd(x, z, .5); addCircle(x, z, .25, true); lamps++; };
  {
    const rO = RING.r + RING.w / 2 + .45, rI = RING.r - RING.w / 2 - .45;
    const nO = Math.round(TAU * rO / 18), nI = Math.round(TAU * rI / 18);
    for (let i = 0; i < nO; i++) { const a = (i + .5) / nO * TAU; if (nearSpokeMouth(a, rO, 2) || STOPS.some(s => Math.abs(wrapS(a - s)) * rO < 7)) continue; lampAt(Math.cos(a) * rO, Math.sin(a) * rO, faceIn(a)); }
    for (let i = 0; i < nI; i++) { const a = (i + .25) / nI * TAU; if (nearPath(a, rI, 2.5)) continue; lampAt(Math.cos(a) * rI, Math.sin(a) * rI, faceIn(a) + Math.PI); }
    for (const sp of SPOKES) {
      const [ex, ez] = sp.to, L = Math.hypot(ex, ez), ux = ex / L, uz = ez / L, tx = -uz, tz = ux;
      for (let s = 60; s < L - 3.5; s += 15) for (const side of [-1, 1]) {
        const off = side * (sp.w / 2 + .45), x = ux * s + tx * off, z = uz * s + tz * off;
        if (inPlot(x, z, .8)) continue;
        lampAt(x, z, Math.atan2(-tx * side, -tz * side));
      }
    }
  }
  info.lamps = lamps;

  // ---- materials for static props
  const binM = M.std('#3E6B4F', { rough: .6, map: null }), binLid = M.std('#2F343A', { rough: .5, map: null });
  const steelM = M.std('#8E979F', { rough: .35, metal: .7, map: null });
  const shelterRoof = M.std('#F3F1EC', { rough: .5 });
  const glassPanel = M.std('#BFD8E6', { rough: .08, metal: .3, map: null });
  // bins (instanced body + lid)
  const bins = [];
  const binAt = (x, z) => { if (!free(x, z, .4, null)) return; bins.push({ x, z }); occAdd(x, z, .4); addCircle(x, z, .32, true); };

  // ---- benches: in the inner park beside the footpath, facing in, and along the square's paths
  let benches = 0;
  const benchAt = (x, z, ry, withBin = true) => {
    if (!free(x, z, 1, null)) return;
    kit.bench(x, z, { ry }); occAdd(x, z, 1.05); addCircle(x, z, .85, true); benches++;
    if (withBin) { const bx = x + Math.cos(ry) * 1.45, bz = z - Math.sin(ry) * 1.45; binAt(bx, bz); }
  };
  {
    const rB = RING.r - RING.w / 2 - RING.foot - .8;       // on the grass just inside the inner footpath
    const n = low ? 8 : 14;
    for (let i = 0; i < n; i++) { const a = (i + .5) / n * TAU + .07; if (nearPath(a, rB, 3)) continue; const x = Math.cos(a) * rB, z = Math.sin(a) * rB; if (inPlot(x, z, 2)) continue; benchAt(x, z, faceIn(a), i % 2 === 0); }
    // along the paths into the square, facing the path
    for (const p of PATHS) {
      const [ax, az] = p.from, [bx, bz] = p.to, L = Math.hypot(bx - ax, bz - az), dx = (bx - ax) / L, dz = (bz - az) / L;
      if (az > 1) continue;                                  // the south path is the spawn approach: keep it clear
      for (const t of [.35, .72]) for (const side of [-1, 1]) {
        const off = side * (p.w / 2 + .75), x = ax + dx * L * t - dz * off, z = az + dz * L * t + dx * off;
        benchAt(x, z, Math.atan2(dz * side, -dx * side), side > 0);
      }
    }
  }
  info.benches = benches;

  // ---- bus stops: shelter on the verge outside the outer footpath, bay marking on the road
  const shelters = new THREE.Group(); statics.add(shelters);
  const busStopNames = ['Campus Gate', 'Market Road', 'Town Hall'];
  const stopPeople = [];
  STOPS.forEach((a, si) => {
    const rS = RING.r + RING.w / 2 + RING.foot + 1.35, x = Math.cos(a) * rS, z = Math.sin(a) * rS, ry = faceIn(a);
    const g = new THREE.Group(); g.position.set(x, 0, z); g.rotation.y = ry; shelters.add(g);
    kit.box(5.2, .12, 2.7, M.paving, { parent: g, z: -.05 });
    [-2.25, 2.25].forEach(px => [-.85, .55].forEach(pz => kit.box(.09, 2.55, .09, steelM, { parent: g, x: px, z: pz, y: .1 })));
    kit.rbox(5.0, .14, 2.0, .05, shelterRoof, { parent: g, y: 2.62, z: -.15 });
    kit.box(5.0, .06, .3, M.std('#FF6A2B', { rough: .5, map: null }), { parent: g, y: 2.6, z: .82 });
    kit.box(4.4, 1.75, .04, glassPanel, { parent: g, y: .55, z: -.86 });
    [-2.25, 2.25].forEach(px => kit.box(.04, 1.75, 1.3, glassPanel, { parent: g, x: px, y: .55, z: -.2 }));
    kit.box(4.3, .12, .45, M.wood, { parent: g, y: .48, z: -.55 });
    [-1.8, 0, 1.8].forEach(px => kit.box(.06, .48, .4, binLid, { parent: g, x: px, y: .1, z: -.55 }));
    // route map panel on the side
    kit.box(.06, 1.3, .9, M.std('#FFFFFF', { rough: .5, map: null }), { parent: g, x: -2.2, y: .8, z: .1 });
    kit.sign(['BUS STOP', { text: busStopNames[si], size: .16, weight: 600, color: '#5B6470' }], { parent: g, w: 1.3, h: .8, x: 2.9, y: 2.0, z: 1.2, posts: 2.0, size: .26, accent: '#FF6A2B' });
    [-2.3, 0, 2.3].forEach(px => { const wx = x + Math.cos(ry) * px, wz = z - Math.sin(ry) * px; occAdd(wx, wz, 1.6); addCircle(wx + Math.cos(a) * .3, wz + Math.sin(a) * .3, 1.0, true); });
    // bay marking: yellow box on the outer lane
    const rl = LANE[0], half = 7 / rl;
    for (let k = -7; k < 7; k++) {
      const aa = a + (k + .5) / rl;
      [rl - 1.6, rl + 1.6].forEach(rr => kit.paint(Math.cos(aa) * rr, Math.sin(aa) * rr, .15, 1.02, '#F2C230', { parent: statics, ry: Math.atan2(-Math.sin(aa), Math.cos(aa)), y: .02 }));
    }
    [-half, half].forEach(da => { const aa = a + da; kit.paint(Math.cos(aa) * rl, Math.sin(aa) * rl, 3.3, .15, '#F2C230', { parent: statics, ry: Math.atan2(-Math.sin(aa), Math.cos(aa)), y: .02 }); });
    // people waiting under the shelter
    const nP = low ? 1 : 2 + (si % 2);
    for (let k = 0; k < nP; k++) { const px = -1.4 + k * 1.3, pz = -.1; stopPeople.push({ x: x + Math.cos(ry) * px + Math.sin(ry) * pz, z: z - Math.sin(ry) * px + Math.cos(ry) * pz, y: .12, h: ry + (k - 1) * .3 }); }
  });

  /* ============================================================ 2. hedges along the outer footpath */
  {
    const rH = RING.r + RING.w / 2 + RING.foot + .75, segL = 3.1, n = Math.floor(TAU * rH / segL), items = [];
    for (let i = 0; i < n; i++) {
      const a = (i + .5) / n * TAU;
      if (nearSpokeMouth(a, rH, 2)) continue;
      if (STOPS.some(s => Math.abs(wrapS(a - s)) * rH < 4.5)) continue;
      if (i % 9 === 4) continue;                              // openings onto the lawns
      const x = Math.cos(a) * rH, z = Math.sin(a) * rH;
      if (!free(x, z, 1.2, null)) continue;
      items.push({ x, z, y: 0, ry: faceIn(a), sx: segL * 1.02, sy: .95 + hash(i, 3, 1) * .2, sz: .85 });
      occAdd(x, z, 1.6);
      for (const k of [-1, 0, 1]) { const aa = a + k * 1.05 / rH; colliders.push({ type: 'circle', x: +(Math.cos(aa) * rH).toFixed(2), z: +(Math.sin(aa) * rH).toFixed(2), r: .55 }); }
    }
    const hg = new RoundedBoxGeometry(1, 1, 1, 2, .3); hg.translate(0, .5, 0);
    staticInst(hg, M.std('#5D9A3F', { rough: 1, map: 'grass' }), items);
    info.hedges = items.length;
  }

  /* ============================================================ 3. beach, pier, lifeguard tower */
  const SANDY = -.32;
  const beachPeople = [];
  {
    const umbrellas = [], poles = [], loungers = [], cushions = [], towels = [];
    const cols = ['#FF6A2B', '#F2B705', '#3B82F6', '#14B8A6', '#D6336C', '#FFFFFF', '#7C5CFF'];
    const onSand = (x, z, m = 1.2) => sandSdf(x, z) < -m && grassSdf(x, z) > m;
    const pierX = 34;
    const setAt = (x, z, ry, ci) => {
      if (!onSand(x, z, 1.6) || Math.abs(x - pierX) < 6 || occHit(x, z, 1.6)) return false;
      const c = cols[ci % cols.length];
      umbrellas.push({ x, z, y: SANDY + 2.05, c, ry: R() * 6 }); poles.push({ x, z, y: SANDY, rz: (R() - .5) * .12 });
      occAdd(x, z, 1.8); addCircle(x, z, .25, true);
      // 1-2 loungers facing the sea
      const k = 1 + (R() < .6 ? 1 : 0);
      for (let j = 0; j < k; j++) {
        const off = (j - (k - 1) / 2) * 1.1 + (R() - .5) * .2;
        const lx = x + Math.cos(ry) * off, lz = z - Math.sin(ry) * off;
        loungers.push({ x: lx, z: lz, y: SANDY, ry }); cushions.push({ x: lx, z: lz, y: SANDY, ry, c: j ? '#FFFFFF' : c });
      }
      if (R() < .5) towels.push({ x: x + Math.cos(ry) * 2.4, z: z - Math.sin(ry) * 2.4, y: SANDY + .012, ry: ry + (R() - .5) * .4, c: cols[(ci + 3) % cols.length] });
      return true;
    };
    // south beach (main), then east and west shores; loungers face the sea
    let ci = 0;
    for (const zr of low ? [133.6] : [132.4, 135.9]) for (let x = -96 + (zr > 134 ? 3.5 : 0); x <= 98; x += low ? 12 : 7) { if (R() < .18) continue; setAt(x + (R() - .5) * 2.5, zr + (R() - .5) * .6, 0, ci++); }
    for (let z = -60; z <= 95; z += low ? 22 : 13) { if (R() < .3) continue; setAt(133.6 + (R() - .5), z, Math.PI / 2, ci++); }
    for (let z = -40; z <= 95; z += low ? 26 : 16) { if (R() < .35) continue; setAt(-133.6 + (R() - .5), z, -Math.PI / 2, ci++); }
    const canopy = new THREE.ConeGeometry(1.45, .5, low ? 8 : 12, 1, true); canopy.translate(0, .25, 0);
    const canopyTop = new THREE.ConeGeometry(.12, .12, 6); canopyTop.translate(0, .55, 0);
    staticInst(mergeGeometries([canopy.toNonIndexed(), canopyTop.toNonIndexed()]), M.std('#FFFFFF', { rough: .7, map: null, side: THREE.DoubleSide }), umbrellas);
    const pole = new THREE.CylinderGeometry(.03, .035, 2.3, 6); pole.translate(0, 1.15, 0);
    staticInst(pole, M.std('#F4F2EE', { rough: .5, map: null }), poles);
    // lounger frame + cushion (face +z = towards the sea after ry)
    const lf = [new THREE.BoxGeometry(.62, .06, 1.5).translate(0, .3, -.1), new THREE.BoxGeometry(.62, .06, .7).rotateX(-.9).translate(0, .52, .85)];
    [-.27, .27].forEach(x => [-.75, .55].forEach(z => lf.push(new THREE.BoxGeometry(.04, .3, .04).translate(x, .15, z))));
    staticInst(mergeGeometries(lf.map(g => g.toNonIndexed())), M.std('#F7F5F0', { rough: .5, map: null }), loungers);
    const cu = [new THREE.BoxGeometry(.56, .06, 1.45).translate(0, .36, -.1), new THREE.BoxGeometry(.56, .06, .65).rotateX(-.9).translate(0, .57, .83)];
    staticInst(mergeGeometries(cu.map(g => g.toNonIndexed())), M.std('#FFFFFF', { rough: .9, map: null }), cushions);
    const tw = new THREE.PlaneGeometry(.95, 1.85); tw.rotateX(-Math.PI / 2);
    staticInst(tw, M.paint('#FFFFFF'), towels, { cast: false });
    info.umbrellas = umbrellas.length;
    // a few people on the beach
    for (let i = 0; i < (low ? 2 : 10); i++) { const u = umbrellas[Math.floor(R() * umbrellas.length)]; if (!u) break; const x = u.x + (R() - .5) * 3, z = u.z + 1.5 + R() * 2; if (onSand(x, z, 1)) beachPeople.push({ x, z, y: SANDY, h: R() * 6 }); }

    // lifeguard tower
    const t = new THREE.Group(); t.position.set(-14, SANDY, 135); statics.add(t);
    const red = M.std('#D9412B', { rough: .6, map: null }), wht = M.std('#F7F5F0', { rough: .6 });
    [-.85, .85].forEach(x => [-.85, .85].forEach(z => kit.box(.14, 2.6, .14, M.wood, { parent: t, x, z })));
    kit.box(.1, .1, 1.9, M.wood, { parent: t, x: -.85, y: 1.2, rx: .9 }); kit.box(.1, .1, 1.9, M.wood, { parent: t, x: .85, y: 1.2, rx: -.9 });
    kit.box(2.4, .16, 2.4, M.wood, { parent: t, y: 2.6 });
    kit.box(1.9, 1.3, 1.7, wht, { parent: t, y: 2.76, z: -.2 });
    kit.box(1.92, .3, 1.72, red, { parent: t, y: 3.3, z: -.2 });
    kit.box(1.3, .5, .04, glassPanel, { parent: t, y: 3.1, z: .66 });
    kit.box(2.5, .12, 2.5, red, { parent: t, y: 4.06, z: -.1 });
    [-1.1, 1.1].forEach(x => kit.box(.05, .9, .05, wht, { parent: t, x, y: 2.76, z: 1.1 })); kit.box(2.25, .05, .05, wht, { parent: t, y: 3.6, z: 1.1 });
    kit.box(.8, .08, 3.6, M.wood, { parent: t, y: 1.25, z: 2.6, rx: .78 });
    kit.cyl(.035, .035, 3.2, wht, { parent: t, x: .95, y: 4.1, z: -.9, seg: 6 });
    kit.box(.7, .22, .03, red, { parent: t, x: 1.32, y: 6.95, z: -.9 }); kit.box(.7, .22, .03, M.std('#F2C230', { rough: .6, map: null }), { parent: t, x: 1.32, y: 7.15, z: -.9 });
    occAdd(-14, 135, 3); addCircle(-14, 135, 1.6, true);
    // beach volleyball net
    if (!low) {
      const vx = -62, vz = 134;
      [-4.2, 4.2].forEach(dx => kit.cyl(.05, .05, 2.5, wht, { parent: statics, x: vx + dx, y: SANDY, z: vz, seg: 6 }));
      kit.box(8.4, .9, .02, M.std('#EDEDE8', { rough: .9, map: null }), { parent: statics, x: vx, y: SANDY + 1.5, z: vz });
      occAdd(vx, vz, 5);
    }
    // pier: deck on posts from the beach into the sea, with railings and bollards
    const pz0 = 129.5, pz1 = low ? 168 : 174, pw = 3.6, deckY = .42;
    const pierG = new THREE.Group(); statics.add(pierG);
    kit.box(pw, .22, pz1 - pz0, M.std('#B48A60', { map: 'wood', rough: .85 }), { parent: pierG, x: pierX, y: deckY - .22, z: (pz0 + pz1) / 2 });
    kit.box(pw + 3, .22, 6, M.std('#B48A60', { map: 'wood', rough: .85 }), { parent: pierG, x: pierX, y: deckY - .22, z: pz1 - 3 });
    for (let z = pz0 + 2; z <= pz1; z += 4) [-1, 1].forEach(s => kit.cyl(.14, .16, 4, M.std('#7A6048', { rough: 1, map: null }), { parent: pierG, x: pierX + s * (pw / 2 - .15), y: deckY - 4.2, z, seg: 7 }));
    const fenceG = new THREE.Group(); fenceG.position.y = deckY; pierG.add(fenceG);
    [-1, 1].forEach(s => kit.fence(fenceG, [[pierX + s * (pw / 2 - .08), pz0 + 1], [pierX + s * (pw / 2 - .08), pz1 - 6]], { h: 1.0, post: 3, color: '#F2EFE8' }));
    [-1, 1].forEach(s => [pz1 - 5, pz1 - 1].forEach(z => kit.cyl(.16, .2, .55, M.std('#3E434A', { rough: .5, map: null }), { parent: pierG, x: pierX + s * (pw / 2 + 1.2), y: deckY, z, seg: 8 })));
    info.pier = { x: pierX, z0: pz0, z1: pz1 };
  }

  /* ============================================================ 4. nature: trees, bushes, meadows, grass patches */
  let nRound = 0, nCone = 0, nPalm = 0, nBush = 0;
  const treeCap = low ? { round: 70, cone: 60, palm: 26, bush: 110 } : { round: 175, cone: 130, palm: 50, bush: 300 };
  const addTree = (x, z, kind, s) => {
    if (kind === 'round' && nRound >= treeCap.round) kind = 'cone';
    if (kind === 'cone' && nCone >= treeCap.cone) return false;
    if (kind === 'palm' && nPalm >= treeCap.palm) return false;
    kit.tree(x, z, { kind, s }); occAdd(x, z, kind === 'palm' ? 1.6 : 2.0 * s);
    if (onRoad(x, z, 6) || sandSdf(x, z) > -14) colliders.push({ type: 'circle', x: +x.toFixed(2), z: +z.toFixed(2), r: kind === 'palm' ? .3 : +(.32 * s).toFixed(2) });
    if (kind === 'round') nRound++; else if (kind === 'cone') nCone++; else nPalm++;
    return true;
  };
  const addBush = (x, z, s = 1) => { if (nBush >= treeCap.bush) return false; kit.bush(x, z, { s }); occAdd(x, z, .9 * s); nBush++; return true; };
  // coastal palms first (they own the shoreline), then the clustered woods
  {
    const step = low ? 9 : 6;
    for (let i = 0; i < 2000 && nPalm < treeCap.palm; i++) {
      const a = R() * TAU, x0 = Math.cos(a) * 160, z0 = Math.sin(a) * 160;
      // project onto the grass rim, a few metres in
      const k = (layout.ISLAND - 6) / Math.max(Math.abs(x0), Math.abs(z0)), x = x0 * k * (1 - (2 + R() * 7) / 129), z = z0 * k * (1 - (2 + R() * 7) / 129);
      if (grassSdf(x, z) > -1.5) continue;
      if (!free(x, z, 1.6)) continue;
      if (fbm(x, z, 5) < .38) continue;
      addTree(x, z, 'palm', .9 + R() * .35); void step;
    }
  }
  {
    const step = low ? 5.6 : 4.2, cand = [];
    for (let gx = -128; gx <= 128; gx += step) for (let gz = -128; gz <= 128; gz += step) {
      const x = gx + (R() - .5) * step * .95, z = gz + (R() - .5) * step * .95;
      const coast = -grassSdf(x, z); if (coast < 3) continue;
      const r = Math.hypot(x, z), n = fbm(x, z, 1);
      const park = r < RING.r;                                  // the park inside the ring: more open lawn
      const thr = park ? .58 : .5;
      cand.push({ x, z, n, thr, park, coast, k: fbm(x, z, 3) });
    }
    cand.sort((a, b) => (b.n - b.thr) - (a.n - a.thr));
    for (const c of cand) {
      const { x, z, n, thr, park, coast, k } = c;
      if (n > thr) {
        const s = .85 + (n - thr) * 1.6 + R() * .2;
        if (!free(x, z, 1.7 * Math.min(s, 1.2), 1.3)) continue;
        const kind = coast < 16 && R() < .55 ? 'palm' : (k > .56 && !park) || (park && k > .66) ? 'cone' : 'round';
        if (!addTree(x, z, kind, Math.min(s, 1.35))) addTree(x, z, 'round', Math.min(s, 1.3));
      } else if (n > thr - .09) {
        if (!free(x, z, .9, .4)) continue;
        addBush(x, z, .8 + R() * .5);
        if (R() < .5) { const bx = x + (R() - .5) * 2.4, bz = z + (R() - .5) * 2.4; if (free(bx, bz, .7, .4)) addBush(bx, bz, .7 + R() * .3); }
      }
    }
  }
  // bushes in front of the hedge gaps and around bus stops / benches look planted
  for (let i = 0; i < 400 && nBush < treeCap.bush; i++) {
    const a = R() * TAU, r = RING.r + RING.w / 2 + RING.foot + 2.2 + R() * 2.5, x = Math.cos(a) * r, z = Math.sin(a) * r;
    if (free(x, z, .8, .3)) addBush(x, z, .7 + R() * .4);
  }
  info.trees = { round: nRound, cone: nCone, palm: nPalm, bush: nBush };

  // ---- flower meadows (instanced heads + leafy tufts) and grass patches
  {
    const flowers = [], tufts = [];
    const fc = ['#F25C78', '#FFC23D', '#FFFFFF', '#B86BF2', '#FF8A3D', '#FFE45C', '#F7A8C8'];
    const meadows = low ? 10 : 26;
    let made = 0;
    for (let i = 0; i < 600 && made < meadows; i++) {
      const inside = i % 3 === 0;
      const a = R() * TAU, r = inside ? 19 + R() * 19 : 58 + R() * 70, cx = Math.cos(a) * r, cz = Math.sin(a) * r;
      const rad = 2.5 + R() * 4;
      if (grassSdf(cx, cz) > -rad - 2 || inPlot(cx, cz, rad + 1) || onRoad(cx, cz, rad + .5) || nearSpot(cx, cz, rad)) continue;
      made++;
      const palette = [fc[Math.floor(R() * fc.length)], fc[Math.floor(R() * fc.length)], '#FFFFFF'];
      const nf = Math.floor(rad * rad * (low ? 2.2 : 5));
      for (let k = 0; k < nf; k++) {
        const aa = R() * TAU, rr = Math.sqrt(R()) * rad, x = cx + Math.cos(aa) * rr, z = cz + Math.sin(aa) * rr;
        if (occHit(x, z, .2)) continue;
        flowers.push({ x, z, y: .18 + R() * .14, s: .8 + R() * .6, ry: R() * 6, c: palette[k % 3] });
        if (k % 2 === 0) tufts.push({ x: x + (R() - .5) * .3, z: z + (R() - .5) * .3, y: 0, s: .8 + R() * .7, ry: R() * 6, c: R() < .5 ? '#6FAE45' : '#5E9B3C' });
      }
    }
    const fg = new THREE.OctahedronGeometry(.085, 0); fg.scale(1, .6, 1);
    staticInst(fg, M.std('#FFFFFF', { rough: .8, map: null }), flowers, { cast: false });
    const tg = new THREE.ConeGeometry(.16, .34, 5); tg.translate(0, .17, 0);
    staticInst(tg, M.std('#FFFFFF', { rough: 1, map: null, flat: true }), tufts, { cast: false });
    info.flowers = flowers.length;
  }
  {
    const pm = ['#7FB44E', '#87B954', '#91BE58'].map((hex, i) => new THREE.MeshStandardMaterial({ color: hex, map: kit.T.grass, roughness: 1, polygonOffset: true, polygonOffsetFactor: -1 - i * .2, polygonOffsetUnits: -2 - i }));
    pm.forEach(m => (m.userData.metres = 8));
    const geos = [[], [], []];
    const n = low ? 40 : 90;
    for (let i = 0, made = 0; i < 1500 && made < n; i++) {
      const x = (R() - .5) * 250, z = (R() - .5) * 250;
      let rad = 3.5 + R() * 7;
      if (grassSdf(x, z) > -3) continue;
      while (rad > 2.5 && (onRoad(x, z, rad - 1.2) || inPlot(x, z, rad - 1) || grassSdf(x, z) > -rad)) rad -= 1;
      if (rad <= 2.5) continue;
      made++;
      const sh = new THREE.Shape(), m = 18, seed = i * 7;
      for (let k = 0; k < m; k++) { const aa = k / m * TAU, rr = rad * (.72 + vnoise(Math.cos(aa) * 1.5 + seed, Math.sin(aa) * 1.5, 2) * .5) * (k % 2 ? 1 : .96); const px = x + Math.cos(aa) * rr, pz = z + Math.sin(aa) * rr; k ? sh.lineTo(px, -pz) : sh.moveTo(px, -pz); }
      const g = new THREE.ShapeGeometry(sh, 2); g.rotateX(-Math.PI / 2); g.translate(0, .006, 0);
      kit.worldUV(g, 8); geos[made % 3].push(g);
    }
    geos.forEach((list, i) => { if (!list.length) return; const mg = mergeGeometries(list); const mm = new THREE.Mesh(mg, pm[i]); mm.receiveShadow = true; group.add(mm); });
  }

  /* ============================================================ 5. vehicles */
  // build one template per type from kit, pull its wheels off, bake the rest, then instance every part
  function template(obj, paintHex) {
    const wheels = [];
    for (const wg of obj.userData.wheels || []) {
      const t = wg.children[0].geometry.parameters; wheels.push({ x: wg.position.x, y: wg.position.y, z: wg.position.z, r: t.radiusTop, w: t.height });
      wg.parent.remove(wg);
    }
    kit.bake(obj);
    const paint = paintHex ? M.carPaint(paintHex) : null, parts = [], rest = [];
    for (const m of obj.children) {
      if (!m.isMesh) continue;
      if (m.material !== paint && collapsible(m.material)) rest.push({ geo: m.geometry, mat: m.material });
      else parts.push({ geo: m.geometry, mat: m.material, cast: m.castShadow, paint: m.material === paint });
    }
    if (rest.length) parts.push({ geo: collapse(rest), mat: plastic, cast: true, paint: false });
    return { wheels, parts };
  }
  function pool(tpl, n) {
    if (!n) return null;
    const meshes = tpl.parts.map(p => {
      let mat = p.mat; if (p.paint) { mat = p.mat.clone(); mat.color.set('#ffffff'); }
      const im = new THREE.InstancedMesh(p.geo, mat, n); im.castShadow = p.cast; im.receiveShadow = true; im.frustumCulled = false;
      im.instanceMatrix.setUsage(THREE.DynamicDrawUsage);
      if (p.paint) for (let i = 0; i < n; i++) im.setColorAt(i, _c.set('#ffffff'));
      im.userData.paint = p.paint; group.add(im); return im;
    });
    return { meshes, paint: meshes.filter(m => m.userData.paint), next: 0, n };
  }
  const scooterTpl = () => { const g = kit.scooter({ color: '#FFFFFF', box: false }); kit.person({ pose: 'sit', seed: 12, parent: g, y: .36, z: -.18, shirt: '#3B6EA5' }); kit.sphere(.13, M.std('#E9E6E0', { rough: .4, map: null }), { parent: g, y: 1.5, z: -.12 }); return g; };
  const TYPES = {
    car: { make: () => kit.car({ color: '#FFFFFF' }), paint: '#FFFFFF', len: 4.4, cruise: [8.2, 10], turn: true },
    van: { make: () => kit.van({ color: '#FFFFFF' }), paint: '#FFFFFF', len: 4.9, cruise: [7.5, 8.8], turn: true },
    school: { make: () => kit.bus({ kind: 'school', text: 'SCHOOL BUS' }), len: 11.6, cruise: [6.8, 7.6] },
    coach: { make: () => kit.bus({ kind: 'coach', text: 'HIMANSHU TRAVEL LINE', stripe: '#F2B705' }), len: 11.6, cruise: [7.2, 8] },
    scooter: { make: scooterTpl, paint: '#FFFFFF', len: 1.9, cruise: [7.5, 9], turn: true },
  };
  const CAR_COLS = ['#E3262B', '#0B6FD1', '#FFCD03', '#00A850', '#F57E20', '#FFFFFF', '#E4479A', '#2CB7E8', '#9AD13A', '#7E3FB0'];
  const VAN_COLS = ['#FFFFFF', '#0B6FD1', '#F57E20'];
  const SC_COLS = ['#E3262B', '#FFCD03', '#00A850', '#2CB7E8', '#E4479A'];
  // the fleet: [type, lane]
  const fleet = low
    ? [['school', 0], ['car', 0], ['car', 0], ['van', 0], ['coach', 1], ['car', 1], ['car', 1]]
    : [['school', 0], ['coach', 0], ['car', 0], ['car', 0], ['scooter', 0], ['car', 0], ['van', 0], ['car', 0], ['car', 0],
       ['coach', 1], ['car', 1], ['scooter', 1], ['car', 1], ['van', 1], ['car', 1], ['scooter', 1], ['car', 1]];
  // parked cars along the diagonal spokes (traffic turns only into the straight ones)
  const parkSpots = [];
  for (const sp of SPOKES) {
    if (!['dtu', 'ailab', 'lss', 'curious'].includes(sp.id)) continue;
    const [ex, ez] = sp.to, L = Math.hypot(ex, ez), ux = ex / L, uz = ez / L, tx = -uz, tz = ux;
    for (let s = 60; s < L - 5; s += 6.4) for (const side of [-1, 1]) {
      if (low && side > 0) continue;
      if (hash(Math.round(s), side + 5, sp.id.length) < .3) continue;
      const off = side * 2.35, x = ux * s + tx * off, z = uz * s + tz * off;
      if (inPlot(x, z, 1.5) || nearSpot(x, z, 1) || hitsPrior(x, z, 1.5)) continue;
      // keep left: outbound cars park on the -t side facing out, inbound on the +t side facing in
      const h = side < 0 ? Math.atan2(ux, uz) : Math.atan2(-ux, -uz);
      parkSpots.push({ x, z, h });
      [-1.3, 1.3].forEach(k => colliders.push({ type: 'circle', x: +(x + Math.sin(h) * k).toFixed(2), z: +(z + Math.cos(h) * k).toFixed(2), r: 1.05 }));
    }
  }
  const counts = {}; fleet.forEach(([t]) => (counts[t] = (counts[t] || 0) + 1)); counts.car = (counts.car || 0) + parkSpots.length;
  const tpls = {}, pools = {};
  for (const [t, n] of Object.entries(counts)) { tpls[t] = template(TYPES[t].make(), TYPES[t].paint); pools[t] = pool(tpls[t], n); }
  // shared wheel pool: tyre (with dark cross on the hub so spin reads) + hub
  let wheelTotal = 0; for (const [t, n] of Object.entries(counts)) wheelTotal += tpls[t].wheels.length * n;
  const tyreGeo = mergeGeometries([new THREE.CylinderGeometry(1, 1, 1, low ? 12 : 16).rotateZ(Math.PI / 2), new THREE.BoxGeometry(1.08, .95, .14), new THREE.BoxGeometry(1.08, .14, .95)].map(g => g.toNonIndexed()));
  const hubGeo = new THREE.CylinderGeometry(.56, .56, 1.04, 10).rotateZ(Math.PI / 2);
  const tyres = new THREE.InstancedMesh(tyreGeo, M.rubber, wheelTotal), hubs = new THREE.InstancedMesh(hubGeo, M.std('#C9CDD3', { rough: .3, metal: .8, map: null }), wheelTotal);
  [tyres, hubs].forEach(im => { im.castShadow = true; im.receiveShadow = true; im.frustumCulled = false; im.instanceMatrix.setUsage(THREE.DynamicDrawUsage); group.add(im); });
  let wheelNext = 0;
  const veh = [];
  const mkVeh = (type, extra) => {
    const T = TYPES[type], P = pools[type], idx = P.next++, tpl = tpls[type];
    const v = Object.assign({ type, P, idx, tpl, len: T.len, cruise: T.cruise[0] + R() * (T.cruise[1] - T.cruise[0]), v: 0, a: 0, lane: 0, state: 'ring', x: 0, y: .035, z: 0, h: 0, dist: R() * 10, wheel0: wheelNext, cool: 2 + R() * 6, canTurn: !!T.turn, occLane: -1, occA: 0, s: 0, paused: false, dwell: 0, dwellT: 3, lastStop: -1, stopDwell: 0, path: null, spoke: null }, extra);
    wheelNext += tpl.wheels.length;
    const col = type === 'car' ? CAR_COLS[(idx * 7 + 3) % CAR_COLS.length] : type === 'van' ? VAN_COLS[idx % VAN_COLS.length] : type === 'scooter' ? SC_COLS[idx % SC_COLS.length] : null;
    if (col) for (const m of P.paint) m.setColorAt(idx, _c.set(col));
    veh.push(v); return v;
  };
  // place the moving fleet evenly around each lane
  [0, 1].forEach(lane => {
    const list = fleet.filter(f => f[1] === lane), n = list.length;
    list.forEach(([type], i) => { const v = mkVeh(type, { lane, stops: lane === 0 && (type === 'school' || type === 'coach') }); v.a = wrap((i + .2 * R()) / n * TAU + lane * .4); v.v = v.cruise * .7; });
  });
  parkSpots.forEach(p => mkVeh('car', { state: 'parked', x: p.x, z: p.z, h: p.h, y: .03 }));
  for (const P of Object.values(pools)) for (const m of P.paint) if (m.instanceColor) m.instanceColor.needsUpdate = true;

  // ---- spoke excursions: precomputed routes (left turn in, drop-off, U-turn, give way, left turn out)
  function resample(raw, closed, step = .5) {
    const pts = closed ? raw.concat([raw[0]]) : raw, cum = [0];
    for (let i = 1; i < pts.length; i++) cum.push(cum[i - 1] + Math.hypot(pts[i][0] - pts[i - 1][0], pts[i][1] - pts[i - 1][1]));
    const L = cum[cum.length - 1], N = Math.max(2, Math.round(L / step)), st = L / N, cnt = closed ? N : N + 1;
    const X = new Float32Array(cnt), Z = new Float32Array(cnt), Y = new Float32Array(cnt), H = new Float32Array(cnt);
    let seg = 0;
    for (let k = 0; k < cnt; k++) {
      const d = Math.min(L, k * st); while (seg < cum.length - 2 && cum[seg + 1] < d) seg++;
      const t = (d - cum[seg]) / ((cum[seg + 1] - cum[seg]) || 1), A = pts[seg], B = pts[seg + 1];
      X[k] = A[0] + (B[0] - A[0]) * t; Z[k] = A[1] + (B[1] - A[1]) * t; Y[k] = (A[2] || 0) + ((B[2] || 0) - (A[2] || 0)) * t;
    }
    for (let k = 0; k < cnt; k++) {
      const a = closed ? (k - 1 + cnt) % cnt : Math.max(0, k - 1), b = closed ? (k + 1) % cnt : Math.min(cnt - 1, k + 1);
      H[k] = Math.atan2(X[b] - X[a], Z[b] - Z[a]);
    }
    return { X, Z, Y, H, N: cnt, L, st, cum, closed };
  }
  const tSpokes = [];
  for (const sp of SPOKES) {
    if (!['bitsom', 'htl', 'bb', 'lead'].includes(sp.id)) continue;
    const [ex, ez] = sp.to, ang = Math.atan2(ez, ex), L = Math.hypot(ex, ez), ux = Math.cos(ang), uz = Math.sin(ang), tx = -uz, tz = ux;
    const off = 1.75, rL = LANE[0], lead = 6.5;
    const aIn = wrap(ang - (off + lead) / rL), aOut = wrap(ang + (off + lead) / rL);
    const ringPt = a => [Math.cos(a) * rL, Math.sin(a) * rL], cwT = a => [-Math.sin(a), Math.cos(a)];
    const outL = s => [ux * s - tx * off, uz * s - tz * off], inL = s => [ux * s + tx * off, uz * s + tz * off];
    const raw = [], marks = {};
    const bez = (P0, C0, C1, P1, n) => { for (let i = raw.length ? 1 : 0; i <= n; i++) { const t = i / n, a = (1 - t) ** 3, b = 3 * (1 - t) ** 2 * t, c = 3 * (1 - t) * t * t, d = t ** 3; raw.push([a * P0[0] + b * C0[0] + c * C1[0] + d * P1[0], a * P0[1] + b * C0[1] + c * C1[1] + d * P1[1]]); } };
    const s1 = rL + lead + 1, P0 = ringPt(aIn), T0 = cwT(aIn), P1 = outL(s1);
    bez(P0, [P0[0] + T0[0] * 4, P0[1] + T0[1] * 4], [P1[0] - ux * 4, P1[1] - uz * 4], P1, 18);
    const sP = Math.max(s1 + 1, L - 7.5), A = outL(sP); raw.push(A); marks.pause = raw.length - 1;
    const B = inL(sP); bez(A, [A[0] + ux * 4.6, A[1] + uz * 4.6], [B[0] + ux * 4.6, B[1] + uz * 4.6], B, 18);
    const P2 = inL(s1); raw.push(P2); marks.hold = raw.length - 1;
    const P3 = ringPt(aOut), T3 = cwT(aOut);
    bez(P2, [P2[0] - ux * 4, P2[1] - uz * 4], [P3[0] - T3[0] * 4, P3[1] - T3[1] * 4], P3, 18);
    const path = resample(raw, false);
    path.sPause = path.cum[marks.pause]; path.sHold = path.cum[marks.hold];
    for (let k = 0; k < path.N; k++) { const r = Math.hypot(path.X[k], path.Z[k]); path.Y[k] = r > RING.r + RING.w / 2 - .05 && r < RING.r + RING.w / 2 + RING.foot + .05 ? KH : .035; }
    tSpokes.push({ id: sp.id, aIn, aOut, path, busy: null, last: -99 });
  }

  /* ============================================================ 6. people */
  const SKIN = ['#8D5A3B', '#A86B47', '#C68A62', '#E0B08A', '#6E4530', '#B97C55'];
  const SHIRT = ['#3B6EA5', '#E07A2E', '#F2F2F2', '#2FA84F', '#D6336C', '#7C5CFF', '#F2B705', '#14B8A6', '#FF6A2B', '#E9E2D0', '#9B3D3D', '#5B8DD6'];
  const PANTS = ['#2B3442', '#3A3A3A', '#6B5B4A', '#1F2A44', '#C9B79C', '#4A5568', '#F2F2F2'];
  const STEP = .5;
  const circle = (r, y, a0 = 0, a1 = TAU, n = 0) => { n = n || Math.max(8, Math.ceil(Math.abs(a1 - a0) * r / 1.5)); const out = []; for (let i = 0; i <= n; i++) { const a = a0 + (a1 - a0) * i / n; out.push([Math.cos(a) * r, Math.sin(a) * r, y]); } return out; };
  const routes = {
    outer: resample(circle(FOOT_OUT, KH).slice(0, -1), true, STEP),
    inner: resample(circle(FOOT_IN, KH).slice(0, -1), true, STEP),
    plaza: resample(circle(7.2, .17).slice(0, -1), true, STEP),
  };
  // loops: inner footpath -> path in -> round the square -> path out -> back along the footpath
  const loop = (aIn, aOut) => {
    const pts = [];
    pts.push([Math.cos(aIn) * FOOT_IN, Math.sin(aIn) * FOOT_IN, KH], [Math.cos(aIn) * (PLAZA.r + .5), Math.sin(aIn) * (PLAZA.r + .5), .06]);
    pts.push(...circle(7.2, .17, aIn, aOut));
    pts.push([Math.cos(aOut) * (PLAZA.r + .5), Math.sin(aOut) * (PLAZA.r + .5), .06], [Math.cos(aOut) * FOOT_IN, Math.sin(aOut) * FOOT_IN, KH]);
    pts.push(...circle(FOOT_IN, KH, aOut, aIn).slice(1, -1));
    return resample(pts, true, STEP);
  };
  routes.loopNE = loop(-Math.PI / 2, 0);
  routes.loopWN = loop(Math.PI, Math.PI * 1.5);
  const plan = low
    ? [['outer', 4], ['inner', 4], ['plaza', 2], ['loopNE', 1], ['loopWN', 1]]
    : [['outer', 12], ['inner', 10], ['plaza', 5], ['loopNE', 4], ['loopWN', 4]];
  const people = [];
  for (const [rid, n] of plan) for (let i = 0; i < n; i++) {
    const rt = routes[rid], dir = R() < .5 ? 1 : -1;
    people.push({ rt, dir, s: (i + R() * .6) / n * rt.L, v: 1.05 + R() * .5, off: .35 + R() * .5, h: 0, ph: R() * 6, k: .9 + R() * .16, walk: true });
  }
  const walkers = people.length;
  const idleSpots = [...stopPeople, ...beachPeople];
  // a few people standing in the park chatting (pairs facing each other)
  for (let i = 0; i < (low ? 1 : 4); i++) {
    for (let tries = 0; tries < 50; tries++) {
      const a = R() * TAU, r = 20 + R() * 16, x = Math.cos(a) * r, z = Math.sin(a) * r;
      if (!free(x, z, 1.2, .2)) continue;
      const hh = R() * TAU; idleSpots.push({ x, z, y: 0, h: hh }, { x: x + Math.sin(hh) * 1.1, z: z + Math.cos(hh) * 1.1, y: 0, h: hh + Math.PI }); occAdd(x, z, 1.5); break;
    }
  }
  for (const p of idleSpots) people.push({ rt: null, x: p.x, z: p.z, y: p.y, h: p.h, ph: R() * 6, k: .92 + R() * .14, walk: false, v: 0 });
  const NP = people.length;
  const pMat = flatMat('#ffffff'), pMatV = flatMat('#ffffff', { vertexColors: true });
  const rb = (w, h, d, r) => new RoundedBoxGeometry(w, h, d, low ? 1 : 2, Math.min(r, w / 2 - .001, h / 2 - .001, d / 2 - .001));
  const legGeo = rb(.15, .84, .17, .06).translate(0, -.42 + .02, 0);
  const armGeo = rb(.11, .6, .12, .05).translate(0, -.29, 0);
  const torsoGeo = rb(.42, .6, .24, .09).translate(0, .82 + .3, 0);
  const tint = (g, r, gg, b) => { const n = g.attributes.position.count, c = new Float32Array(n * 3); for (let i = 0; i < n; i++) { c[i * 3] = r; c[i * 3 + 1] = gg; c[i * 3 + 2] = b; } g.setAttribute('color', new THREE.BufferAttribute(c, 3)); return g; };
  const headGeo = mergeGeometries([
    tint(new THREE.SphereGeometry(.115, low ? 8 : 12, low ? 6 : 9).scale(1, 1.12, 1.05).translate(0, 1.585, 0).toNonIndexed(), 1, 1, 1),
    tint(new THREE.CylinderGeometry(.05, .06, .1, 6).translate(0, 1.44, 0).toNonIndexed(), 1, 1, 1),
    tint(new THREE.SphereGeometry(.123, low ? 8 : 10, 6, 0, TAU, 0, Math.PI * .56).scale(1.02, .95, 1.06).translate(0, 1.6, -.012).toNonIndexed(), .16, .12, .1),
  ]);
  const imTorso = new THREE.InstancedMesh(torsoGeo, pMat, NP), imHead = new THREE.InstancedMesh(headGeo, pMatV, NP);
  const imLeg = new THREE.InstancedMesh(legGeo, pMat, NP * 2), imArm = new THREE.InstancedMesh(armGeo, pMat, NP * 2);
  [imTorso, imHead, imLeg, imArm].forEach(im => { im.castShadow = true; im.receiveShadow = true; im.frustumCulled = false; im.instanceMatrix.setUsage(THREE.DynamicDrawUsage); group.add(im); });
  people.forEach((p, i) => {
    const sh = SHIRT[Math.floor(R() * SHIRT.length)], pa = PANTS[Math.floor(R() * PANTS.length)], sk = SKIN[Math.floor(R() * SKIN.length)];
    imTorso.setColorAt(i, _c.set(sh)); imHead.setColorAt(i, _c.set(sk));
    imLeg.setColorAt(i * 2, _c.set(pa)); imLeg.setColorAt(i * 2 + 1, _c.set(pa));
    const armC = R() < .4 ? sk : sh; imArm.setColorAt(i * 2, _c.set(armC)); imArm.setColorAt(i * 2 + 1, _c.set(armC));
  });

  /* ============================================================ 7. sea: sailing boats and a ferry */
  function boatTpl() {
    const g = new THREE.Group();
    const hull = [[-1.05, -3.3], [1.05, -3.3], [1.25, .8], [.7, 2.9], [0, 3.8], [-.7, 2.9], [-1.25, .8]];
    kit.extrude(hull, 1.1, M.std('#F7F7F4', { rough: .4, map: null }), { parent: g, y: -.5 });
    kit.extrude(hull.map(([x, z]) => [x * .86, z * .9]), .06, M.std('#C49A6C', { rough: .7, map: null }), { parent: g, y: .6 });
    kit.box(2.4, .12, 5.5, M.std('#2F5D8A', { rough: .5, map: null }), { parent: g, y: .3, z: -.3 });
    kit.cyl(.06, .07, 8.4, steelM, { parent: g, y: .6, z: .7, seg: 6 });
    kit.box(.06, .06, 3.4, steelM, { parent: g, y: 1.6, z: -.9 });
    const tri = (a, b, c) => { const geo = new THREE.BufferGeometry(); geo.setAttribute('position', new THREE.Float32BufferAttribute([...a, ...b, ...c], 3)); geo.computeVertexNormals(); return geo; };
    const sailM = M.std('#FBF8F0', { rough: .8, map: null, side: THREE.DoubleSide });
    const ms = new THREE.Mesh(tri([0, 1.7, .62], [0, 8.8, .62], [0, 1.7, -2.6]), sailM); ms.rotation.y = .12; g.add(ms);
    const js = new THREE.Mesh(tri([0, 1.2, .8], [0, 8, .8], [0, 1.0, 3.5]), sailM); js.rotation.y = -.1; g.add(js);
    g.traverse(m => { if (m.isMesh) { m.castShadow = true; m.receiveShadow = true; } });
    return g;
  }
  function ferryTpl() {
    const g = new THREE.Group();
    const hull = [[-2.4, -8.2], [2.4, -8.2], [2.5, 4], [1.4, 7.4], [0, 8.6], [-1.4, 7.4], [-2.5, 4]];
    kit.extrude(hull, 1.3, M.std('#2F5D8A', { rough: .5, map: null }), { parent: g, y: -.7 });
    kit.extrude(hull, .7, M.std('#F7F7F4', { rough: .5, map: null }), { parent: g, y: .6 });
    kit.extrude(hull.map(([x, z]) => [x * .96, z * .97]), .05, M.std('#C9C4BB', { rough: .8, map: null }), { parent: g, y: 1.3 });
    kit.rbox(4.0, 2.2, 9.5, .2, M.std('#F7F7F4', { rough: .5, map: null }), { parent: g, y: 1.3, z: -1.2 });
    kit.box(4.06, .75, 9.0, M.std('#26323E', { rough: .08, metal: .5, map: null }), { parent: g, y: 2.1, z: -1.2 });
    kit.box(4.08, .16, 9.6, M.std('#F2B705', { rough: .5, map: null }), { parent: g, y: 1.4, z: -1.2 });
    kit.rbox(3.1, 1.4, 3.6, .15, M.std('#F7F7F4', { rough: .5, map: null }), { parent: g, y: 3.5, z: .6 });
    kit.box(3.16, .5, 3.0, M.std('#26323E', { rough: .08, metal: .5, map: null }), { parent: g, y: 4.15, z: .75 });
    kit.cyl(.42, .5, 1.7, M.std('#F2B705', { rough: .5, map: null }), { parent: g, y: 3.5, z: -3.4 });
    kit.cyl(.43, .43, .3, M.std('#2B2F35', { rough: .6, map: null }), { parent: g, y: 5.2, z: -3.4 });
    kit.cyl(.03, .03, 2, steelM, { parent: g, y: 4.9, z: 1.6, seg: 5 });
    const lbl = kit.label([{ text: 'TOWN FERRY', size: .42, weight: 800, color: '#2F5D8A' }], { w: 4, h: .6, bg: '#F7F7F4' });
    const l1 = lbl.clone(); l1.position.set(2.04, 2.9, -1.2); l1.rotation.y = Math.PI / 2; g.add(l1);
    const l2 = lbl.clone(); l2.position.set(-2.04, 2.9, -1.2); l2.rotation.y = -Math.PI / 2; g.add(l2);
    return g;
  }
  const NB = low ? 2 : 3;
  const boatPool = pool(template(boatTpl()), NB), ferryPool = pool(template(ferryTpl()), 1);
  const CR = THREE.CatmullRomCurve3, V3 = (x, z) => new THREE.Vector3(x, 0, z);
  const boatRoutes = [
    new CR([V3(-190, 60), V3(-230, -40), V3(-180, -170), V3(-120, -205), V3(-160, -60)], true, 'centripetal'),
    new CR([V3(180, -150), V3(240, -60), V3(215, 60), V3(170, -30)], true, 'centripetal'),
    new CR([V3(-80, 205), V3(-180, 190), V3(-205, 150), V3(-120, 175)], true, 'centripetal'),
  ];
  const pierEnd = info.pier.z1;
  const px0 = info.pier.x;
  const ferryRoute = new CR([V3(px0 + 6.5, pierEnd - 8), V3(px0 + 15, pierEnd - 15), V3(px0 + 30, pierEnd + 2), V3(110, 250), V3(210, 282), V3(262, 205), V3(180, 208), V3(px0 + 11, pierEnd + 26)], true, 'centripetal');
  const boats = boatRoutes.slice(0, NB).map((c, i) => ({ c, L: c.getLength(), u: i * .37, sp: 2.6 + i * .5, ph: i * 2 }));
  const ferry = { c: ferryRoute, L: ferryRoute.getLength(), u: .02, dwell: 6 };

  /* ============================================================ 8. sky: clouds and birds */
  const NC = low ? 6 : 12;
  const cloudGeo = (() => { const parts = [], r = kit.rng(31); for (let i = 0; i < 7; i++) { const s = .7 + r() * .7; parts.push(new THREE.IcosahedronGeometry(1, 1).scale(s, s * .8, s).translate((r() - .5) * 4.2, r() * .6, (r() - .5) * 1.8)); } return mergeGeometries(parts).scale(1, .62, 1); })();
  const clouds = new THREE.InstancedMesh(cloudGeo, new THREE.MeshStandardMaterial({ color: '#ffffff', roughness: 1, emissive: '#eef4fa', emissiveIntensity: .35, flatShading: true }), NC);
  clouds.frustumCulled = false; clouds.castShadow = false; group.add(clouds);
  const cloudState = Array.from({ length: NC }, (_, i) => ({ a: i / NC * TAU + R() * .4, r: 165 + R() * 150, y: 62 + R() * 40, s: 6 + R() * 6, ry: R() * 6 }));
  const birdGeo = (() => {
    const v = [
      0, 0, .32, -.09, 0, -.2, .09, 0, -.2,                 // body
      -.08, 0, .14, -.42, .1, .02, -.08, 0, -.12, -.42, .1, .02, -.82, .3, -.12, -.08, 0, -.12,   // left wing
      .08, 0, .14, .08, 0, -.12, .42, .1, .02, .42, .1, .02, .08, 0, -.12, .82, .3, -.12,           // right wing
      0, 0, -.2, -.14, 0, -.42, .14, 0, -.42,              // tail
    ];
    const g = new THREE.BufferGeometry(); g.setAttribute('position', new THREE.Float32BufferAttribute(v, 3)); g.computeVertexNormals(); return g;
  })();
  const flocks = low ? [{ n: 7, cx: 10, cz: -30, y: 30, r: 22 }] : [{ n: 12, cx: 10, cz: -30, y: 30, r: 22 }, { n: 6, cx: -30, cz: 128, y: 16, r: 14 }];
  const birdState = [];
  flocks.forEach((f, fi) => { for (let i = 0; i < f.n; i++) birdState.push({ f, fi, a: i / f.n * TAU + R() * .5, r: f.r * (.7 + R() * .5), dy: (R() - .5) * 5, w: (.22 + R() * .06) * (fi ? -1 : 1), fl: 7 + R() * 3, ph: R() * 6 }); });
  const birds = new THREE.InstancedMesh(birdGeo, new THREE.MeshStandardMaterial({ color: '#4A4F57', roughness: .9, side: THREE.DoubleSide }), birdState.length);
  birds.frustumCulled = false; birds.castShadow = true; group.add(birds);

  /* ============================================================ bake statics */
  kit.bake(statics);
  {
    const rest = [], drop = [];
    for (const m of statics.children) if (m.isMesh && m.castShadow && collapsible(m.material)) { rest.push({ geo: m.geometry, mat: m.material }); drop.push(m); }
    drop.forEach(m => { statics.remove(m); m.geometry.dispose(); });
    if (rest.length) { const mm = new THREE.Mesh(collapse(rest), plastic); mm.castShadow = mm.receiveShadow = true; statics.add(mm); }
  }
  bins.length && (() => {
    const bg = mergeGeometries([new THREE.CylinderGeometry(.26, .23, .85, 10).translate(0, .425, 0).toNonIndexed()]);
    staticInst(bg, binM, bins.map(b => ({ x: b.x, z: b.z })));
    staticInst(new THREE.CylinderGeometry(.29, .29, .08, 10).translate(0, .89, 0), binLid, bins.map(b => ({ x: b.x, z: b.z })));
  })();

  /* ============================================================ update */
  const UP = new THREE.Vector3(0, 1, 0), XAX = new THREE.Vector3(1, 0, 0), ONE = new THREE.Vector3(1, 1, 1);
  const mV = new THREE.Matrix4(), mW = new THREE.Matrix4(), mL = new THREE.Matrix4(), qW = new THREE.Quaternion(), pW = new THREE.Vector3(), sW = new THREE.Vector3(), tmpV = new THREE.Vector3(), tmpT = new THREE.Vector3();
  const band = LANE.map(() => 1.5);
  const approach = (v, tgt, dt) => { v.v = tgt < v.v ? Math.max(tgt, v.v - 8 * dt) : Math.min(tgt, v.v + 2.4 * dt); };
  function writeVehicle(v) {
    _q.setFromAxisAngle(UP, v.h); mV.compose(_p.set(v.x, v.y, v.z), _q, ONE);
    for (const m of v.P.meshes) m.setMatrixAt(v.idx, mV);
    const W = v.tpl.wheels;
    for (let k = 0; k < W.length; k++) {
      const w = W[k]; qW.setFromAxisAngle(XAX, v.dist / w.r); mW.compose(pW.set(w.x, w.y, w.z), qW, sW.set(w.w, w.r, w.r)); mW.premultiply(mV);
      tyres.setMatrixAt(v.wheel0 + k, mW); hubs.setMatrixAt(v.wheel0 + k, mW);
    }
  }
  veh.forEach(v => { if (v.state === 'ring') { const rL = LANE[v.lane]; v.x = Math.cos(v.a) * rL; v.z = Math.sin(v.a) * rL; v.h = v.lane ? Math.atan2(Math.sin(v.a), -Math.cos(v.a)) : Math.atan2(-Math.sin(v.a), Math.cos(v.a)); } writeVehicle(v); });
  const clearToMerge = (sp, self) => {
    for (const o of veh) { if (o === self || o.occLane !== 0) continue; const behind = wrap(sp.aOut - o.occA), ahead = wrap(o.occA - sp.aOut); if (behind < .45 || ahead < .16) return false; }
    return true;
  };
  const pathVeh = [];
  function updateVehicles(dt) {
    pathVeh.length = 0;
    for (const v of veh) {
      if (v.state === 'parked') { v.occLane = -1; continue; }
      if (v.state === 'ring') { v.occLane = v.lane; v.occA = v.a; continue; }
      pathVeh.push(v);
      const r = Math.hypot(v.x, v.z); v.occLane = -1;
      for (let l = 0; l < 2; l++) if (Math.abs(r - LANE[l]) < band[l]) { v.occLane = l; v.occA = wrap(Math.atan2(v.z, v.x)); }
    }
    for (const v of veh) {
      if (v.state === 'parked') continue;
      if (v.state === 'ring') {
        const rL = LANE[v.lane], sgn = v.lane ? -1 : 1;
        let tgt = v.cruise, best = 1e9;
        for (const o of veh) {
          if (o === v || o.occLane !== v.lane) continue;
          const arc = wrap((o.occA - v.a) * sgn) * rL - (v.len + o.len) / 2;
          if (arc < best) best = arc;
        }
        if (best < 1e8) tgt = Math.min(tgt, Math.max(0, (best - 2.2) * .8));
        if (v.stops) {
          for (let k = 0; k < STOPS.length; k++) {
            if (k === v.lastStop) continue;
            const d = wrapS(STOPS[k] - v.a) * rL;
            if (d > -1 && d < 40) {
              tgt = Math.min(tgt, Math.sqrt(2 * 1.5 * Math.max(0, d)));
              if (d < .7 && v.v < .3) { v.stopDwell += dt; if (v.stopDwell > 5) { v.lastStop = k; v.stopDwell = 0; } }
            }
          }
        }
        approach(v, tgt, dt);
        const da = v.v * dt / rL, aPrev = v.a; v.a = wrap(v.a + da * sgn);
        v.cool -= dt;
        if (v.lane === 0 && v.canTurn && v.cool <= 0) {
          for (const sp of tSpokes) {
            const d = wrap(sp.aIn - aPrev);
            if (d <= da) {
              if (!sp.busy && R() < .4) { v.state = 'path'; v.spoke = sp; v.path = sp.path; v.s = (da - d) * rL; v.paused = false; v.dwell = 0; v.dwellT = 2.5 + R() * 4; sp.busy = v; }
              else v.cool = 4;
              break;
            }
          }
        }
        if (v.state === 'ring') { v.x = Math.cos(v.a) * rL; v.z = Math.sin(v.a) * rL; v.y = .035; v.h = v.lane ? Math.atan2(Math.sin(v.a), -Math.cos(v.a)) : Math.atan2(-Math.sin(v.a), Math.cos(v.a)); }
      }
      if (v.state === 'path') {
        const P = v.path; let tgt = 5.8;
        if (!v.paused) tgt = Math.min(tgt, Math.sqrt(2 * 2.2 * Math.max(0, P.sPause - v.s)));
        else if (v.s < P.sHold && !clearToMerge(v.spoke, v)) tgt = Math.min(tgt, Math.sqrt(2 * 3 * Math.max(0, P.sHold - v.s)));
        approach(v, tgt, dt);
        v.s += v.v * dt;
        if (!v.paused && P.sPause - v.s < .45 && v.v < .2) { v.dwell += dt; if (v.dwell > v.dwellT) v.paused = true; }
        if (v.s >= P.L) {
          v.state = 'ring'; v.lane = 0; v.a = wrap(v.spoke.aOut + (v.s - P.L) / LANE[0]); v.spoke.busy = null; v.spoke = null; v.cool = 10 + R() * 10;
          const rL = LANE[0]; v.x = Math.cos(v.a) * rL; v.z = Math.sin(v.a) * rL; v.y = .035; v.h = Math.atan2(-Math.sin(v.a), Math.cos(v.a));
        } else {
          const f = v.s / P.st, k = Math.min(P.N - 2, Math.floor(f)), t = f - k;
          v.x = P.X[k] + (P.X[k + 1] - P.X[k]) * t; v.z = P.Z[k] + (P.Z[k + 1] - P.Z[k]) * t; v.y = P.Y[t < .5 ? k : k + 1];
          let dh = P.H[k + 1] - P.H[k]; dh = dh > Math.PI ? dh - TAU : dh < -Math.PI ? dh + TAU : dh; v.h = P.H[k] + dh * t;
        }
      }
      v.dist += v.v * dt;
      writeVehicle(v);
    }
    for (const P of Object.values(pools)) for (const m of P.meshes) m.instanceMatrix.needsUpdate = true;
    tyres.instanceMatrix.needsUpdate = true; hubs.instanceMatrix.needsUpdate = true;
  }

  const mB = new THREE.Matrix4();
  function updatePeople(dt, t) {
    for (let i = 0; i < NP; i++) {
      const p = people[i];
      let swing = 0, bob = 0, x, z, y, h;
      if (p.walk) {
        const rt = p.rt;
        let blocked = false;
        for (const v of pathVeh) { const dx = v.x - p.x, dz = v.z - p.z; if (dx * dx + dz * dz < 12) { blocked = true; break; } }
        const sp = blocked ? 0 : p.v;
        p.s += sp * p.dir * dt; if (p.s < 0) p.s += rt.L; else if (p.s >= rt.L) p.s -= rt.L;
        const f = p.s / rt.st, k = Math.floor(f) % rt.N, k2 = (k + 1) % rt.N, tt = f - Math.floor(f);
        const rh = rt.H[k] + (p.dir < 0 ? Math.PI : 0);
        x = rt.X[k] + (rt.X[k2] - rt.X[k]) * tt + Math.cos(rh) * p.off; z = rt.Z[k] + (rt.Z[k2] - rt.Z[k]) * tt - Math.sin(rh) * p.off; y = rt.Y[k];
        let dh = rh - p.h; dh = Math.atan2(Math.sin(dh), Math.cos(dh)); p.h += dh * Math.min(1, dt * 7); h = p.h;
        p.x = x; p.z = z;
        if (sp > 0) p.ph += dt * sp * 4.6;
        const s = Math.sin(p.ph); swing = s * (sp > 0 ? .48 : 0); bob = Math.abs(Math.cos(p.ph)) * .035 * (sp > 0 ? 1 : 0);
      } else {
        x = p.x; z = p.z; y = p.y; h = p.h + Math.sin(t * .5 + p.ph) * .15; swing = Math.sin(t * 1.3 + p.ph) * .05;
      }
      _q.setFromAxisAngle(UP, h); mB.compose(_p.set(x, y + bob, z), _q, _s.set(p.k, p.k, p.k));
      imTorso.setMatrixAt(i, mB); imHead.setMatrixAt(i, mB);
      for (let sd = 0; sd < 2; sd++) {
        const sx = sd ? 1 : -1;
        mL.makeRotationX(swing * sx); mL.elements[12] = sx * .1; mL.elements[13] = .82; mL.elements[14] = 0; mW.multiplyMatrices(mB, mL); imLeg.setMatrixAt(i * 2 + sd, mW);
        mL.makeRotationX(-swing * sx * .8); const e = mL.elements; e[12] = sx * .27; e[13] = 1.38; e[14] = 0;
        // arms hang slightly out from the body
        mW.makeRotationZ(sx * .07); mL.multiply(mW); mW.multiplyMatrices(mB, mL); imArm.setMatrixAt(i * 2 + sd, mW);
      }
    }
    imTorso.instanceMatrix.needsUpdate = imHead.instanceMatrix.needsUpdate = imLeg.instanceMatrix.needsUpdate = imArm.instanceMatrix.needsUpdate = true;
  }

  function updateSea(dt, t) {
    for (let i = 0; i < boats.length; i++) {
      const b = boats[i]; b.u = (b.u + b.sp * dt / b.L) % 1;
      b.c.getPointAt(b.u, tmpV); b.c.getTangentAt(b.u, tmpT);
      _e.set(Math.sin(t * 1.1 + b.ph) * .04, Math.atan2(tmpT.x, tmpT.z), .12 + Math.sin(t * .8 + b.ph) * .05, 'YXZ'); _q.setFromEuler(_e);
      mV.compose(_p.set(tmpV.x, -.9 + Math.sin(t * 1.3 + b.ph) * .07, tmpV.z), _q, ONE);
      for (const m of boatPool.meshes) m.setMatrixAt(i, mV);
    }
    for (const m of boatPool.meshes) m.instanceMatrix.needsUpdate = true;
    // ferry: dwell at the pier, ease out and in
    const f = ferry;
    if (f.dwell > 0) f.dwell -= dt;
    else {
      const s = f.u * f.L, sp = Math.max(.7, Math.min(5.5, Math.min(s, f.L - s) / 9 + .7));
      f.u += sp * dt / f.L; if (f.u >= 1) { f.u -= 1; f.dwell = 9; }
    }
    f.c.getPointAt(f.u, tmpV); f.c.getTangentAt(f.u, tmpT);
    _e.set(Math.sin(t * .9) * .015, Math.atan2(tmpT.x, tmpT.z), Math.sin(t * .7) * .02, 'YXZ'); _q.setFromEuler(_e);
    mV.compose(_p.set(tmpV.x, -.9 + Math.sin(t * 1.1) * .05, tmpV.z), _q, ONE);
    for (const m of ferryPool.meshes) { m.setMatrixAt(0, mV); m.instanceMatrix.needsUpdate = true; }
  }

  function updateSky(dt, t) {
    for (let i = 0; i < NC; i++) {
      const c = cloudState[i]; c.a += dt * .0035;
      _q.setFromAxisAngle(UP, c.ry + c.a); mV.compose(_p.set(Math.cos(c.a) * c.r, c.y, Math.sin(c.a) * c.r), _q, _s.set(c.s, c.s, c.s));
      clouds.setMatrixAt(i, mV);
    }
    clouds.instanceMatrix.needsUpdate = true;
    for (let i = 0; i < birdState.length; i++) {
      const b = birdState[i], f = b.f; b.a += dt * b.w;
      const cx = f.cx + Math.cos(t * .03) * 12, cz = f.cz + Math.sin(t * .03) * 12;
      const x = cx + Math.cos(b.a) * b.r, z = cz + Math.sin(b.a) * b.r, y = f.y + b.dy + Math.sin(t * .6 + b.ph) * 1.5;
      const hh = b.w > 0 ? Math.atan2(-Math.sin(b.a), Math.cos(b.a)) : Math.atan2(Math.sin(b.a), -Math.cos(b.a));
      _e.set(0, hh, (b.w > 0 ? -1 : 1) * .35, 'YXZ'); _q.setFromEuler(_e);
      const flap = Math.sin(t * b.fl + b.ph);
      mV.compose(_p.set(x, y, z), _q, _s.set(.95, .95 * (flap * 1.1 + .15), .95));
      birds.setMatrixAt(i, mV);
    }
    birds.instanceMatrix.needsUpdate = true;
  }
  updateSea(0, 0); updateSky(0, 0); updatePeople(0, 0);
  [imTorso, imHead, imLeg, imArm].forEach(im => im.instanceColor && (im.instanceColor.needsUpdate = true));

  info.vehicles = veh.length; info.moving = fleet.length; info.parked = parkSpots.length; info.walkers = walkers; info.people = NP; info.colliders = colliders.length;
  group.userData.info = info;
  if (typeof window !== 'undefined') window.__life = { info, veh, people, tSpokes };

  const update = (dt, t) => { updateVehicles(dt); updatePeople(dt, t); updateSea(dt, t); updateSky(dt, t); };
  if (typeof window !== 'undefined') window.__life.update = update;
  return { group, colliders, update };
}
