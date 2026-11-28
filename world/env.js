/* env.js: sky, sun, reflections, island, beach, sea, roads, footpaths and the town square. */
import * as THREE from 'three';
import { Sky } from 'three/addons/objects/Sky.js';
import * as kit from './kit.js';
import { M, PALETTE } from './kit.js';
import { ISLAND, RING, PLAZA, SPOKES, PATHS, PLOTS } from './layout.js';

export const SUN_DIR = new THREE.Vector3(-0.42, 0.78, -0.46).normalize(); // sun in the north-west: shadows fall toward the viewer's lower right

export function buildEnv({ scene, renderer, quality }) {
  const low = quality === 'low';
  const root = new THREE.Group(); root.name = 'env'; scene.add(root);
  const updaters = [];

  /* ---------- sky + reflections ---------- */
  const sky = new Sky(); sky.scale.setScalar(4000);
  const u = sky.material.uniforms;
  u.turbidity.value = 2.2; u.rayleigh.value = 1.1; u.mieCoefficient.value = .0035; u.mieDirectionalG.value = .82;
  u.sunPosition.value.copy(SUN_DIR).multiplyScalar(1000);
  scene.add(sky);
  {
    const envScene = new THREE.Scene();
    const sky2 = new Sky(); sky2.scale.setScalar(900); Object.assign(sky2.material.uniforms.sunPosition.value, SUN_DIR.clone().multiplyScalar(400));
    ['turbidity', 'rayleigh', 'mieCoefficient', 'mieDirectionalG'].forEach(k => (sky2.material.uniforms[k].value = u[k].value));
    envScene.add(sky2);
    // warm ground bounce for the lower hemisphere
    const gnd = new THREE.Mesh(new THREE.CircleGeometry(800, 32), new THREE.MeshBasicMaterial({ color: '#b9b08f' })); gnd.rotation.x = -Math.PI / 2; gnd.position.y = -2; envScene.add(gnd);
    const pm = new THREE.PMREMGenerator(renderer);
    scene.environment = pm.fromScene(envScene, .02).texture;
    scene.environmentIntensity = .5;
    pm.dispose();
  }
  scene.fog = new THREE.Fog('#d7e9f4', 260, 1100);

  /* ---------- lights ---------- */
  const hemi = new THREE.HemisphereLight('#dcefff', '#a89470', .55); scene.add(hemi);
  const sun = new THREE.DirectionalLight('#fff0d9', 2.6);
  sun.castShadow = true;
  const SH = low ? 1024 : 2048, EXT = low ? 55 : 70;
  sun.shadow.mapSize.set(SH, SH);
  Object.assign(sun.shadow.camera, { left: -EXT, right: EXT, top: EXT, bottom: -EXT, near: 20, far: 420 });
  sun.shadow.bias = -.0004; sun.shadow.normalBias = .045; sun.shadow.radius = low ? 1 : 3;
  scene.add(sun, sun.target);
  const texel = EXT * 2 / SH;
  function follow(fx, fz) {
    // snap the shadow camera to whole texels so shadows don't shimmer while walking
    const x = Math.round(fx / texel) * texel, z = Math.round(fz / texel) * texel;
    sun.target.position.set(x, 0, z); sun.position.set(x + SUN_DIR.x * 200, SUN_DIR.y * 200, z + SUN_DIR.z * 200);
  }
  follow(0, 0);

  /* ---------- island, beach, sea ---------- */
  const rounded = (half, r) => {
    const s = new THREE.Shape(), a = half, k = r;
    s.moveTo(-a + k, -a); s.lineTo(a - k, -a); s.quadraticCurveTo(a, -a, a, -a + k); s.lineTo(a, a - k); s.quadraticCurveTo(a, a, a - k, a);
    s.lineTo(-a + k, a); s.quadraticCurveTo(-a, a, -a, a - k); s.lineTo(-a, -a + k); s.quadraticCurveTo(-a, -a, -a + k, -a); return s;
  };
  const slab = (half, r, top, depth, mat, bevel) => {
    const g = new THREE.ExtrudeGeometry(rounded(half, r), { depth, bevelEnabled: true, bevelThickness: bevel, bevelSize: bevel, bevelSegments: low ? 2 : 4, curveSegments: low ? 8 : 16 });
    g.rotateX(-Math.PI / 2); g.translate(0, top - depth - bevel, 0); g.computeVertexNormals();
    kit.worldUV(g, mat.userData.metres || 4);
    const m = new THREE.Mesh(g, mat); m.receiveShadow = true; root.add(m); return m;
  };
  slab(ISLAND - 6, 26, 0, 2, M.grass, .6);
  slab(ISLAND + 4, 32, -.32, 2, M.sand, 3.5);
  const shallow = new THREE.Mesh(new THREE.ShapeGeometry(rounded(ISLAND + 26, 50), 16), new THREE.MeshStandardMaterial({ color: '#86D3E3', roughness: .2, transparent: true, opacity: .55, depthWrite: false }));
  shallow.rotation.x = -Math.PI / 2; shallow.position.y = -.85; root.add(shallow);
  const nTex = kit.T.normalWater.clone(); nTex.needsUpdate = true; nTex.wrapS = nTex.wrapT = THREE.RepeatWrapping; nTex.repeat.set(90, 90);
  const sea = new THREE.Mesh(new THREE.PlaneGeometry(4000, 4000), new THREE.MeshPhysicalMaterial({ color: PALETTE.water, roughness: .14, metalness: .05, normalMap: nTex, normalScale: new THREE.Vector2(.32, .32), clearcoat: .6, clearcoatRoughness: .2, envMapIntensity: 1.1 }));
  sea.rotation.x = -Math.PI / 2; sea.position.y = -.9; sea.receiveShadow = true; root.add(sea);
  updaters.push((dt, t) => { nTex.offset.set(t * .006, t * .004); });

  /* ---------- roads ---------- */
  const roadGroup = new THREE.Group(); root.add(roadGroup);
  // a horizontal ribbon along a centre line between lateral offsets a..b (left is +offset)
  function ribbon(pts, closed, a, b, y, mat, vScale = 4) {
    const pos = [], uv = [], idx = [], n = pts.length, N = closed ? n + 1 : n; let dist = 0;
    for (let i = 0; i < N; i++) {
      const p = pts[i % n], q = pts[closed ? (i + 1) % n : Math.min(i + 1, n - 1)], o = pts[closed ? (i - 1 + n) % n : Math.max(i - 1, 0)];
      if (i) dist += Math.hypot(p[0] - pts[(i - 1) % n][0], p[1] - pts[(i - 1) % n][1]);
      let tx = q[0] - o[0], tz = q[1] - o[1]; const L = Math.hypot(tx, tz) || 1; tx /= L; tz /= L;
      const nx = -tz, nz = tx;
      pos.push(p[0] + nx * a, y, p[1] + nz * a, p[0] + nx * b, y, p[1] + nz * b);
      uv.push(a / vScale, dist / vScale, b / vScale, dist / vScale);
      if (i < N - 1) { const k = i * 2; idx.push(k, k + 2, k + 1, k + 1, k + 2, k + 3); }
    }
    const g = new THREE.BufferGeometry();
    g.setAttribute('position', new THREE.Float32BufferAttribute(pos, 3)); g.setAttribute('uv', new THREE.Float32BufferAttribute(uv, 2)); g.setIndex(idx); g.computeVertexNormals();
    if (g.attributes.normal.getY(0) < 0) { const ix = g.index.array; for (let i = 0; i < ix.length; i += 3) { const t = ix[i + 1]; ix[i + 1] = ix[i + 2]; ix[i + 2] = t; } g.computeVertexNormals(); }
    const m = new THREE.Mesh(g, mat); m.receiveShadow = true; roadGroup.add(m); return m;
  }
  // a vertical kerb face along a centre line at lateral offset
  function kerbFace(pts, closed, off, y0, y1, mat) {
    const pos = [], idx = [], n = pts.length, N = closed ? n + 1 : n;
    for (let i = 0; i < N; i++) {
      const p = pts[i % n], q = pts[closed ? (i + 1) % n : Math.min(i + 1, n - 1)], o = pts[closed ? (i - 1 + n) % n : Math.max(i - 1, 0)];
      let tx = q[0] - o[0], tz = q[1] - o[1]; const L = Math.hypot(tx, tz) || 1; tx /= L; tz /= L;
      const x = p[0] - tz * off, z = p[1] + tx * off; pos.push(x, y0, z, x, y1, z);
      if (i < N - 1) { const k = i * 2; idx.push(k, k + 2, k + 1, k + 1, k + 2, k + 3); }
    }
    const g = new THREE.BufferGeometry(); g.setAttribute('position', new THREE.Float32BufferAttribute(pos, 3)); g.setIndex(idx); g.computeVertexNormals();
    const m = new THREE.Mesh(g, mat); m.material.side = THREE.DoubleSide; roadGroup.add(m); return m;
  }
  const kerbM = M.std(PALETTE.kerb, { rough: .9 }).clone(); kerbM.side = THREE.DoubleSide;
  const circle = (r, n = low ? 96 : 192) => Array.from({ length: n }, (_, i) => [Math.cos(i / n * Math.PI * 2) * r, Math.sin(i / n * Math.PI * 2) * r]);
  const ringPts = circle(RING.r);
  const hw = RING.w / 2, F = RING.foot, KH = .14;
  ribbon(ringPts, true, -hw, hw, .035, M.asphalt, 6);
  ribbon(ringPts, true, hw, hw + F, KH, M.paving, 2.4);
  ribbon(ringPts, true, -hw - F, -hw, KH, M.paving, 2.4);
  kerbFace(ringPts, true, hw, 0, KH, kerbM); kerbFace(ringPts, true, -hw, 0, KH, kerbM);
  kerbFace(ringPts, true, hw + F, 0, KH, kerbM); kerbFace(ringPts, true, -hw - F, 0, KH, kerbM);
  // markings: dashed centre line, solid edge lines
  const marks = new THREE.Group(); roadGroup.add(marks);
  const white = M.paint('#F4F4F0'), yellow = M.paint('#F2C230');
  ribbon(ringPts, true, hw - .45, hw - .3, .045, white); ribbon(ringPts, true, -hw + .3, -hw + .45, .045, white);
  { const C = 2 * Math.PI * RING.r, n = Math.floor(C / 6); for (let i = 0; i < n; i++) { const a = i / n * Math.PI * 2; kit.paint(Math.cos(a) * RING.r, Math.sin(a) * RING.r, .14, 3, '#F4F4F0', { parent: marks, ry: -a, y: .02 }); } }
  // spokes (roads out to each place) and their footpaths
  for (const s of SPOKES) {
    const pts = [s.from, s.to], w = s.w / 2;
    ribbon(pts, false, -w, w, .03, M.asphalt, 6);
    const [ax, az] = s.from, [bx, bz] = s.to, L = Math.hypot(bx - ax, bz - az), dx = (bx - ax) / L, dz = (bz - az) / L;
    const start = [ax + dx * (hw + F + .2), az + dz * (hw + F + .2)];
    const fp = [start, s.to];
    ribbon(fp, false, w, w + 2.4, KH, M.paving, 2.4); ribbon(fp, false, -w - 2.4, -w, KH, M.paving, 2.4);
    kerbFace(fp, false, w, 0, KH, kerbM); kerbFace(fp, false, -w, 0, KH, kerbM);
    kerbFace(fp, false, w + 2.4, 0, KH, kerbM); kerbFace(fp, false, -w - 2.4, 0, KH, kerbM);
    // centre dashes
    for (let d = hw + 4; d < L - 2; d += 6) kit.paint(ax + dx * d, az + dz * d, .14, 3, '#F4F4F0', { parent: marks, ry: Math.atan2(dx, dz), y: .015 });
    // zebra crossing where the spoke meets the ring
    for (let k = -2; k <= 2; k++) { const px = ax + dx * (hw + F + 1.6) - dz * k * 1.2, pz = az + dz * (hw + F + 1.6) + dx * k * 1.2; kit.paint(px, pz, .6, 2.6, '#F4F4F0', { parent: marks, ry: Math.atan2(dx, dz), y: .015 }); }
  }
  // paths from the square to the ring
  for (const p of PATHS) ribbon([p.from, p.to], false, -p.w / 2, p.w / 2, .06, M.paving, 2.4);
  // footpath from the square to the Your Team tower
  ribbon([[11.6, -10.2], [17.6, -15.6]], false, -1.6, 1.6, .06, M.paving, 2.4);
  // a little stub road into the Your Team tower's forecourt
  void yellow;

  /* ---------- town square ---------- */
  const sq = new THREE.Group(); root.add(sq);
  kit.cyl(PLAZA.r, PLAZA.r + .1, .16, M.paving, { parent: sq, seg: low ? 48 : 96 });
  kit.cyl(PLAZA.r * .55, PLAZA.r * .55, .17, M.std('#E5DCCB', { map: 'tiles' }), { parent: sq, seg: 64 });
  // fountain
  const stone = M.std('#EEE8DC', { rough: .7 });
  kit.cyl(4.4, 4.5, .6, stone, { parent: sq, y: .1, seg: 48 });
  const waterM = new THREE.MeshPhysicalMaterial({ color: '#7FCBE3', roughness: .05, metalness: 0, normalMap: nTex, normalScale: new THREE.Vector2(.25, .25), clearcoat: 1, envMapIntensity: 1.4 });
  const pool = new THREE.Mesh(new THREE.CircleGeometry(4.05, 48), waterM); pool.rotation.x = -Math.PI / 2; pool.position.y = .71; sq.add(pool);
  kit.cyl(.55, .7, 1.7, stone, { parent: sq, y: .6 });
  kit.cyl(1.7, 1.1, .35, stone, { parent: sq, y: 2.2, seg: 32 });
  kit.cyl(.25, .32, .9, stone, { parent: sq, y: 2.5 });
  kit.cyl(.8, .5, .22, stone, { parent: sq, y: 3.35, seg: 24 });
  const jetM = new THREE.MeshBasicMaterial({ color: '#E9F7FF', transparent: true, opacity: .55, depthWrite: false });
  const jet = new THREE.Mesh(new THREE.CylinderGeometry(.06, .16, 1.2, 10, 1, true), jetM); jet.position.y = 4.15; jet.userData.dynamic = true; sq.add(jet);
  const sheet = new THREE.Mesh(new THREE.CylinderGeometry(1.75, 1.95, .5, 32, 1, true), new THREE.MeshBasicMaterial({ color: '#DDF3FF', transparent: true, opacity: .25, depthWrite: false, side: THREE.DoubleSide })); sheet.position.y = 2.1; sheet.userData.dynamic = true; sq.add(sheet);
  // droplets
  const DROPS = low ? 40 : 110, dropGeo = new THREE.SphereGeometry(.05, 6, 4), drops = new THREE.InstancedMesh(dropGeo, new THREE.MeshBasicMaterial({ color: '#F2FBFF', transparent: true, opacity: .8 }), DROPS);
  const dropState = Array.from({ length: DROPS }, (_, i) => ({ a: Math.random() * 6.28, t: Math.random(), r: .6 + Math.random() * .4 }));
  sq.add(drops);
  const dm = new THREE.Matrix4();
  updaters.push((dt, t) => {
    jet.scale.y = 1 + Math.sin(t * 6) * .06; sheet.scale.set(1 + Math.sin(t * 3) * .015, 1, 1 + Math.sin(t * 3) * .015);
    dropState.forEach((d, i) => { d.t += dt * .7; if (d.t > 1) { d.t -= 1; d.a = Math.random() * 6.28; } const r = d.t * 2.1 * d.r, y = 4.7 + d.t * 1.6 - d.t * d.t * 4.1; dm.makeTranslation(Math.cos(d.a) * r, Math.max(.6, y), Math.sin(d.a) * r); drops.setMatrixAt(i, dm); });
    drops.instanceMatrix.needsUpdate = true;
  });
  // flower beds and benches around the square
  const beds = low ? 6 : 8;
  for (let i = 0; i < beds; i++) {
    const a = (i + .5) / beds * Math.PI * 2; if (Math.abs(Math.sin(a)) > .92 || Math.abs(Math.cos(a)) > .92) continue;
    const x = Math.cos(a) * 12, z = Math.sin(a) * 12;
    kit.cyl(2.1, 2.2, .45, stone, { parent: sq, x, z, y: .1, seg: 24 });
    kit.cyl(1.9, 1.9, .1, M.std('#6B4A33', { map: null, rough: 1 }), { parent: sq, x, z, y: .5, seg: 24 });
    const R = kit.rng(i + 3);
    for (let k = 0; k < (low ? 5 : 11); k++) { const aa = R() * 6.28, rr = R() * 1.5; kit.sphere(.22 + R() * .12, M.std(R.pick(['#F25C78', '#FFC23D', '#FFFFFF', '#B86BF2', '#FF8A3D']), { map: null, rough: .8 }), { parent: sq, x: x + Math.cos(aa) * rr, z: z + Math.sin(aa) * rr, y: .5, seg: 8, seg2: 6 }); }
    kit.bench(Math.cos(a) * 8.6, Math.sin(a) * 8.6, { ry: -a - Math.PI / 2 });
  }
  // welcome board (spot plaza.main), facing the spawn point to the south
  const board = new THREE.Group(); board.position.set(0, .16, 13.2); sq.add(board);
  kit.rbox(7.4, 3.6, .4, .12, M.std('#FFFFFF', { rough: .5 }), { parent: board, y: .9 });
  kit.label([
    { text: "PRATHAM'S TOWN", size: .3, weight: 800, color: '#FF6A2B' },
    { text: "Hi, I'm Pratham.", size: .62, weight: 800 },
    { text: 'Walk to any building to see my story', size: .26, weight: 500, color: '#5B6470' },
  ], { parent: board, w: 7, h: 3.2, y: 1.1, z: .21 });
  [-1, 1].forEach(s => kit.rbox(.3, .95, .3, .05, M.std('#3E434A', { rough: .5, metal: .4, map: null }), { parent: board, x: s * 3, y: 0 }));
  kit.bake(sq);

  /* ---------- ground details: grass verges inside plots stay grass; nothing else here ---------- */
  void PLOTS;

  const colliders = [
    { type: 'circle', x: 0, z: 0, r: 4.7 },
    { type: 'box', x: 0, z: 13.2, w: 7.6, d: .7 },
  ];
  for (let i = 0; i < beds; i++) { const a = (i + .5) / beds * Math.PI * 2; if (Math.abs(Math.sin(a)) > .92 || Math.abs(Math.cos(a)) > .92) continue; colliders.push({ type: 'circle', x: Math.cos(a) * 12, z: Math.sin(a) * 12, r: 2.3 }); }

  return {
    sun, hemi, sky, follow, colliders,
    spots: [{ id: 'plaza.main', x: 0, z: 15.6, y: 5.6 }],
    update(dt, t) { for (const f of updaters) f(dt, t); },
  };
}
