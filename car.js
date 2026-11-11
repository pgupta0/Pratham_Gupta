/* Shared 3D pieces for the home page and the Products page:
   an original, modern open-wheel race car and the garage it lives in.
   The car is built from smooth lofted surfaces (cross-sections skinned
   together) and real aerofoil sections, at true scale in metres.
   No real team, livery or sponsor: midnight navy, an orange flare, a teal
   pinstripe and #27. Every part is its own group with an "explode" offset,
   so the car can come apart into an exploded view. Nose points along +z. */
import * as THREE from 'three';

const V = (x, y, z) => new THREE.Vector3(x, y, z);
const clamp = (v, a = 0, b = 1) => Math.min(b, Math.max(a, v));
const sstep = (a, b, v) => { const t = clamp((v - a) / (b - a)); return t * t * (3 - 2 * t); };
const lerp = (a, b, t) => a + (b - a) * t;

const canvasTex = (w, h, draw, srgb = true) => {
  const c = document.createElement('canvas'); c.width = w; c.height = h;
  draw(c.getContext('2d'), w, h);
  const t = new THREE.CanvasTexture(c); if (srgb) t.colorSpace = THREE.SRGBColorSpace;
  t.anisotropy = 8; return t;
};

/* ---------- surface helpers ---------- */
// interpolate a keyed table [[z, a, b, c...], ...] (z descending or ascending) with smooth steps
function keyed(table, z) {
  const t = table[0][0] > table[table.length - 1][0] ? table : [...table].reverse();
  if (z >= t[0][0]) return t[0].slice(1);
  const n = t.length;
  for (let i = 0; i < n - 1; i++) {
    const z0 = t[i][0], z1 = t[i + 1][0];
    if (z <= z0 && z >= z1) {
      const u = (z0 - z) / (z0 - z1), P = k => t[Math.max(0, Math.min(n - 1, k))];
      // Catmull-Rom through the keys, so the surface flows without flat spots
      return t[i].slice(1).map((_, c) => {
        const p0 = P(i - 1)[c + 1], p1 = P(i)[c + 1], p2 = P(i + 1)[c + 1], p3 = P(i + 2)[c + 1];
        return .5 * (2 * p1 + (-p0 + p2) * u + (2 * p0 - 5 * p1 + 4 * p2 - p3) * u * u + (-p0 + 3 * p1 - 3 * p2 + p3) * u ** 3);
      });
    }
  }
  return t[n - 1].slice(1);
}
// rounded-rectangle cross-section ("superellipse"), centred on (cx, cy) at depth z
function superRing(cx, cy, z, w, h, n = 3.2, N = 48, squashBottom = 1) {
  const pts = [];
  for (let i = 0; i < N; i++) {
    const t = (i / N) * Math.PI * 2, c = Math.cos(t), s = Math.sin(t);
    const x = Math.sign(c) * Math.pow(Math.abs(c), 2 / n) * w / 2;
    let y = Math.sign(s) * Math.pow(Math.abs(s), 2 / n) * h / 2;
    if (y < 0) y *= squashBottom;
    pts.push(V(cx + x, cy + y, z));
  }
  return pts;
}
// closed ring from a polyline in (x, y), smoothed, at depth z
function profileRing(pts2, z, N = 48) {
  const curve = new THREE.CatmullRomCurve3(pts2.map(([x, y]) => V(x, y, 0)), true, 'centripetal');
  return curve.getSpacedPoints(N).slice(0, N).map(p => V(p.x, p.y, z));
}
// skin consecutive rings into one mesh; vertex colours from colorFn(point)
function loft(rings, { capStart = true, capEnd = true, colorFn = null } = {}) {
  const nR = rings.length, nP = rings[0].length, cols = nP + 1;
  const pos = [], uv = [], col = [], idx = [], c = new THREE.Color();
  const push = (p, u, v) => { pos.push(p.x, p.y, p.z); uv.push(u, v); if (colorFn) { colorFn(p, c); col.push(c.r, c.g, c.b); } };
  let along = 0;
  for (let i = 0; i < nR; i++) {
    if (i) along += rings[i][0].distanceTo(rings[i - 1][0]);
    let arc = 0;
    for (let j = 0; j < cols; j++) { const p = rings[i][j % nP]; if (j) arc += p.distanceTo(rings[i][(j - 1) % nP]); push(p, arc * 4, along * 4); }
  }
  for (let i = 0; i < nR - 1; i++) for (let j = 0; j < nP; j++) { const a = i * cols + j, b = a + 1, d = a + cols, e = d + 1; idx.push(a, d, b, b, d, e); }
  const cap = (ring, flip) => {
    const ctr = ring.reduce((s, p) => s.add(p), V(0, 0, 0)).multiplyScalar(1 / ring.length);
    const base = pos.length / 3; push(ctr, 0, 0); ring.forEach(p => push(p, 0, 0));
    for (let j = 0; j < nP; j++) { const a = base + 1 + j, b = base + 1 + ((j + 1) % nP); flip ? idx.push(base, b, a) : idx.push(base, a, b); }
  };
  if (capStart) cap(rings[0], true);
  if (capEnd) cap(rings[nR - 1], false);
  const g = new THREE.BufferGeometry();
  g.setAttribute('position', new THREE.Float32BufferAttribute(pos, 3));
  g.setAttribute('uv', new THREE.Float32BufferAttribute(uv, 2));
  if (colorFn) g.setAttribute('color', new THREE.Float32BufferAttribute(col, 3));
  g.setIndex(idx); g.computeVertexNormals();
  return g;
}
// cambered aerofoil outline (NACA-4 style); chord runs from the leading edge (+z) back
function aerofoil(chord, thick = .12, camber = .06, N = 28) {
  const up = [], lo = [];
  for (let i = 0; i <= N; i++) {
    const x = (1 - Math.cos(Math.PI * i / N)) / 2;
    const yt = 5 * thick * (0.2969 * Math.sqrt(x) - 0.126 * x - 0.3516 * x * x + 0.2843 * x ** 3 - 0.1036 * x ** 4);
    const p = .4, yc = x < p ? camber / (p * p) * (2 * p * x - x * x) : camber / ((1 - p) ** 2) * ((1 - 2 * p) + 2 * p * x - x * x);
    up.push([x, yc + yt]); lo.push([x, yc - yt]);
  }
  return [...up, ...lo.reverse().slice(1, -1)].map(([x, y]) => [-x * chord, y * chord]);
}
// a wing: aerofoil sections along the span. f(s) -> {x, y, z, chord, angle (rad, + lifts the trailing edge), invert}
function wing(f, stations = 40, { thick = .12, camber = .06 } = {}) {
  const rings = [];
  for (let i = 0; i <= stations; i++) {
    const s = -1 + 2 * i / stations, o = f(s);
    const af = aerofoil(o.chord, thick, (o.invert ? -1 : 1) * camber);
    const ca = Math.cos(o.angle), sa = Math.sin(o.angle);
    rings.push(af.map(([z, y]) => V(o.x, o.y + y * ca - z * sa, o.z + y * sa + z * ca)));
  }
  return loft(rings);
}

/* ---------- textures ---------- */
function carbonTex() {
  const t = canvasTex(128, 128, (g) => {
    for (let y = 0; y < 16; y++) for (let x = 0; x < 16; x++) {
      const on = ((x + y) >> 1) % 2 === 0;
      const grd = g.createLinearGradient(x * 8, y * 8, x * 8 + 8, y * 8 + 8);
      grd.addColorStop(0, on ? '#2a2b31' : '#111215'); grd.addColorStop(1, on ? '#15161a' : '#202127');
      g.fillStyle = grd; g.fillRect(x * 8, y * 8, 8, 8);
    }
  });
  t.wrapS = t.wrapT = THREE.RepeatWrapping; t.repeat.set(3, 3); return t;
}
function textTex(text, { w = 512, h = 192, font = '900 150px Arial Black, Helvetica, Arial, sans-serif', fill = '#fff', stroke = null, lw = 10, italic = false } = {}) {
  return canvasTex(w, h, (g) => {
    g.font = (italic ? 'italic ' : '') + font; g.textAlign = 'center'; g.textBaseline = 'middle';
    if (stroke) { g.lineWidth = lw; g.strokeStyle = stroke; g.strokeText(text, w / 2, h / 2 + 4); }
    g.fillStyle = fill; g.fillText(text, w / 2, h / 2 + 4);
  });
}
function wheelCoverTex(accent) {
  return canvasTex(256, 256, (g) => {
    const c = 128;
    const grd = g.createRadialGradient(c, c, 10, c, c, 128); grd.addColorStop(0, '#2b2d33'); grd.addColorStop(1, '#141519');
    g.fillStyle = grd; g.beginPath(); g.arc(c, c, 128, 0, Math.PI * 2); g.fill();
    g.strokeStyle = 'rgba(255,255,255,.12)'; g.lineWidth = 6;
    for (let k = 0; k < 6; k++) { const a = k * Math.PI / 3; g.beginPath(); g.moveTo(c + Math.cos(a) * 30, c + Math.sin(a) * 30); g.lineTo(c + Math.cos(a + .35) * 112, c + Math.sin(a + .35) * 112); g.stroke(); }
    g.strokeStyle = accent; g.lineWidth = 7; g.beginPath(); g.arc(c, c, 116, 0, Math.PI * 2); g.stroke();
    g.fillStyle = '#c9ccd2'; g.beginPath(); g.arc(c, c, 18, 0, Math.PI * 2); g.fill();
  });
}

export function buildF1Car({ livery = '#FF5A1F', accent = '#2EF2C3', number = '27', name = 'PRATHAM' } = {}) {
  const root = new THREE.Group();
  const parts = {};
  const carbonMap = carbonTex();
  const NAVY = new THREE.Color('#1b2546'), DARK = new THREE.Color('#07080c');
  const ORANGE = new THREE.Color(livery), AMBER = new THREE.Color('#FFB224'), TEAL = new THREE.Color(accent);

  // livery: navy body, an orange flare sweeping back along the top, a teal pinstripe on its edge
  const paintFn = (p, out) => {
    const k = p.y + .17 * p.z;
    out.copy(NAVY);
    const fl = sstep(.6, .66, k);
    out.lerp(ORANGE, fl).lerp(AMBER, fl * sstep(1.9, 2.8, p.z) * .7);
    if (p.y < .125) out.copy(DARK);
  };
  const phys = (o) => new THREE.MeshPhysicalMaterial(Object.assign({ metalness: .3, roughness: .32, clearcoat: 1, clearcoatRoughness: .04 }, o));
  const MAT = {
    paint: () => phys({ color: '#ffffff', vertexColors: true }),
    navy: () => phys({ color: NAVY }),
    orange: () => phys({ color: ORANGE }),
    carbon: () => phys({ color: '#ffffff', map: carbonMap, metalness: .45, roughness: .4, clearcoat: .8 }),
    matte: () => new THREE.MeshStandardMaterial({ color: '#08090b', roughness: .85 }),
    titan: () => new THREE.MeshStandardMaterial({ color: '#3a3d44', metalness: .95, roughness: .28 }),
    rubber: () => new THREE.MeshStandardMaterial({ color: '#101012', roughness: .78 }),
    cover: () => new THREE.MeshStandardMaterial({ map: wheelCoverTex(livery), metalness: .7, roughness: .35 }),
    helmet: () => phys({ color: '#f2f3f5', metalness: .1 }),
  };
  const part = (name, explode, spin = [0, 0, 0]) => {
    const g = new THREE.Group(); g.name = name; root.add(g);
    const mats = {}; const m = k => (mats[k] ||= MAT[k]());
    return (parts[name] = { g, explode: new THREE.Vector3(...explode), spin: new THREE.Vector3(...spin), mats, m, base: new THREE.Vector3() });
  };
  const add = (p, geo, mat, pos, rot) => {
    const mesh = new THREE.Mesh(geo, typeof mat === 'string' ? p.m(mat) : mat);
    if (pos) mesh.position.set(...pos); if (rot) mesh.rotation.set(...rot);
    p.g.add(mesh); return mesh;
  };
  // tapered rounded prism between two depths
  const pod = (p, mat, { z0, z1, cx = 0, cy, w, h, w1 = w, h1 = h, cy1 = cy, n = 3, N = 32 }) =>
    add(p, loft([superRing(cx, cy, z0, w, h, n, N), superRing(cx, cy1, z1, w1, h1, n, N)]), mat);
  // flat plate cut from a side profile (z, y), given thickness, centred at x
  const plate = (p, mat, pts, x, thick = .016, curved = null) => {
    const sh = new THREE.Shape(); sh.moveTo(pts[0][0], pts[0][1]);
    pts.slice(1).forEach(q => (q.length === 4 ? sh.quadraticCurveTo(q[0], q[1], q[2], q[3]) : sh.lineTo(q[0], q[1])));
    const g = new THREE.ExtrudeGeometry(sh, { depth: thick, bevelEnabled: true, bevelThickness: .004, bevelSize: .004, bevelSegments: 2, curveSegments: 12 });
    g.translate(0, 0, -thick / 2); g.rotateY(-Math.PI / 2); g.translate(x, 0, 0);
    return add(p, g, mat);
  };
  const strut = (p, a, b, r = .0075, mat = 'carbon', flat = 3.2) => {
    const A = V(...a), B = V(...b), len = A.distanceTo(B);
    const g = new THREE.CylinderGeometry(r, r, len, 10); g.scale(flat, 1, 1);
    const mesh = add(p, g, mat, A.clone().add(B).multiplyScalar(.5).toArray());
    mesh.quaternion.setFromUnitVectors(V(0, 1, 0), B.clone().sub(A).normalize());
  };
  const decal = (p, tex, w, h, pos, rot) => {
    const m = add(p, new THREE.PlaneGeometry(w, h), new THREE.MeshBasicMaterial({ map: tex, transparent: true, depthWrite: false, polygonOffset: true, polygonOffsetFactor: -2 }), pos, rot);
    m.renderOrder = 3; return m;
  };
  const numTex = textTex(number, { w: 256, h: 160, font: '900 140px Arial Black, Helvetica, Arial, sans-serif', fill: '#ffffff', stroke: '#0a0c12', lw: 12, italic: true });
  const nameTex = textTex(name, { w: 1024, h: 160, font: '900 120px Arial Black, Helvetica, Arial, sans-serif', fill: '#ffffff', italic: true });

  /* ---------- chassis: survival cell, floor, plank, diffuser, crash structure, cockpit ---------- */
  const ch = part('chassis', [0, -.25, 0]);
  {
    const T = [[1.3, .37, .38, .33], [1.0, .42, .47, .42], [.6, .45, .58, .5], [.2, .46, .66, .56], [-.2, .44, .67, .55], [-.5, .4, .6, .48]];
    const rings = []; for (let z = 1.3; z >= -.5; z -= .06) { const [cy, w, h] = keyed(T, z); rings.push(superRing(0, cy, z, w, h, 3, 56, .8)); }
    add(ch, loft(rings, { colorFn: paintFn }), 'paint');
    // cockpit opening, headrest, steering wheel, driver
    pod(ch, 'matte', { z0: .78, z1: -.16, cy: .727, w: .42, h: .05, w1: .46, n: 2.4 });
    [-1, 1].forEach(s => pod(ch, 'navy', { z0: .1, z1: -.32, cx: s * .19, cy: .74, w: .1, h: .1, w1: .12, h1: .12, n: 2.2 }));
    const wheel = add(ch, new THREE.BoxGeometry(.27, .11, .035), 'matte', [0, .78, .5], [-.5, 0, 0]);
    add(ch, new THREE.BoxGeometry(.09, .045, .01), new THREE.MeshBasicMaterial({ color: '#2EF2C3' }), [0, .785, .487], [-.5, 0, 0]);
    void wheel;
    const helmet = add(ch, new THREE.SphereGeometry(.135, 32, 24), 'helmet', [0, .84, .08]); helmet.scale.set(1, 1.02, 1.14);
    add(ch, new THREE.SphereGeometry(.137, 32, 12, -1.0, 2.0, 1.25, .42), phys({ color: '#0c141c', metalness: .9, roughness: .06 }), [0, .84, .09]).scale.set(1, 1.02, 1.14);
    const stripe = add(ch, new THREE.TorusGeometry(.137, .012, 8, 48, Math.PI), new THREE.MeshBasicMaterial({ color: TEAL }), [0, .84, .08], [0, Math.PI / 2, 0]); stripe.scale.set(1.14, 1.02, 1);
    // floor: plan shape with a raised edge, plank underneath
    const fs = new THREE.Shape(); fs.moveTo(-.42, -1.25);
    [[-.72, -.95], [-.82, -.3], [-.84, .9], [-.74, 1.6], [-.56, 2.0], [-.48, 2.25]].forEach(([x, z]) => fs.lineTo(x, -z));
    [[.48, 2.25], [.56, 2.0], [.74, 1.6], [.84, .9], [.82, -.3], [.72, -.95], [.42, -1.25]].forEach(([x, z]) => fs.lineTo(x, -z));
    fs.closePath();
    const fg = new THREE.ExtrudeGeometry(fs, { depth: .022, bevelEnabled: true, bevelThickness: .005, bevelSize: .01, bevelSegments: 2 });
    fg.rotateX(-Math.PI / 2); fg.translate(0, .045, 0);
    // the shape's y was -z, so flip back; floor runs from z=+1.25 (front) to z=-2.25
    add(ch, fg, 'carbon');
    [-1, 1].forEach(s => { pod(ch, 'carbon', { z0: .9, z1: -1.6, cx: s * .835, cy: .085, w: .018, h: .07, w1: .018, h1: .1, cy1: .1, n: 2 }); });
    pod(ch, 'matte', { z0: 1.0, z1: -1.9, cy: .03, w: .3, h: .025, n: 6 });
    // diffuser ramps + fences
    const dz0 = -1.75, dz1 = -2.42;
    const dif = new THREE.PlaneGeometry(1.0, Math.hypot(dz0 - dz1, .26), 1, 1);
    const d = add(ch, dif, phys({ color: '#ffffff', map: carbonMap, side: THREE.DoubleSide, metalness: .45, roughness: .4 }), [0, .18, (dz0 + dz1) / 2], [-Math.PI / 2 + Math.atan2(.26, dz0 - dz1) * -1, 0, 0]);
    void d;
    [-.48, -.25, 0, .25, .48].forEach(x => plate(ch, 'carbon', [[-1.75, .05], [-2.42, .32], [-2.42, .05]], x, .008));
    // rear crash structure + rain light
    pod(ch, 'carbon', { z0: -1.95, z1: -2.62, cy: .32, w: .22, h: .17, w1: .13, h1: .1, cy1: .34 });
    const rain = add(ch, new THREE.BoxGeometry(.11, .05, .02), new THREE.MeshBasicMaterial({ color: new THREE.Color('#ff1a12').multiplyScalar(3) }), [0, .34, -2.64]);
    ch.rain = rain;
    // mirrors on the sidepods
    [-1, 1].forEach(s => {
      strut(ch, [s * .55, .62, .5], [s * .6, .74, .52], .008, 'navy');
      const mh = add(ch, new THREE.SphereGeometry(.07, 20, 14), 'navy', [s * .62, .76, .52]); mh.scale.set(1.5, .55, .55);
    });
  }

  /* ---------- nose ---------- */
  const nose = part('nose', [0, .05, 1.5]);
  {
    const T = [[2.97, .2, .1, .07], [2.85, .21, .16, .1], [2.5, .26, .23, .16], [2.1, .31, .28, .22], [1.7, .35, .33, .28], [1.28, .37, .385, .335]];
    const rings = []; for (let z = 2.97; z >= 1.28; z -= .05) { const [cy, w, h] = keyed(T, z); rings.push(superRing(0, cy, z, w, h, 2.8, 48, .75)); }
    add(nose, loft(rings, { colorFn: paintFn }), 'paint');
    decal(nose, numTex, .2, .125, [0, .385, 2.05], [-Math.PI / 2 + .12, 0, 0]);
    // front wing pylons
    [-1, 1].forEach(s => plate(nose, 'carbon', [[2.62, .2], [2.86, .19], [2.82, .1], [2.66, .1]], s * .07, .012));
  }

  /* ---------- front wing: four elements rising outboard to the endplates ---------- */
  const fw = part('frontWing', [0, -.2, 2.6]);
  {
    const E = [[.3, .075, 3.03, .04], [.17, .108, 2.86, .24], [.14, .14, 2.77, .42], [.12, .17, 2.68, .6]];
    E.forEach(([c, y, z, a], e) => {
      const g = wing(s => {
        const o = Math.abs(s), rise = sstep(.22, 1, o);
        return { x: s * 1.0, chord: c * (1 - .15 * rise), y: y + rise * (.025 + .045 * e) - (e ? .02 * (1 - sstep(.1, .3, o)) : 0), z: z - rise * .04 * e, angle: a + .18 * rise, invert: true };
      }, 60, { thick: .1, camber: .07 });
      add(fw, g, e === 3 ? 'orange' : e === 0 ? 'carbon' : 'navy');
    });
    [-1, 1].forEach(s => plate(fw, 'orange', [[3.08, .03], [3.08, .14], [3.04, .23, 2.9, .24], [2.6, .24], [2.56, .14], [2.62, .03]], s * 1.0, .016));
  }

  /* ---------- sidepods: high slim inlets, coke-bottle waist, undercut ---------- */
  [['sidepodL', -1], ['sidepodR', 1]].forEach(([n, s]) => {
    const sp = part(n, [s * 1.9, .35, -.1], [0, 0, s * .25]);
    const T = [[.64, .73, .63, .44], [.35, .8, .65, .43], [-.2, .79, .63, .41], [-.8, .64, .58, .37], [-1.35, .47, .5, .32], [-1.8, .34, .42, .27], [-2.05, .27, .36, .23]];
    const rings = [];
    for (let z = .64; z >= -2.05; z -= .05) {
      const [sw, top, mid] = keyed(T, z);
      const half = [[.26, top + .005], [sw - .14, top], [sw - .02, top - .08], [sw, mid], [sw - .1, .2], [sw - .3, .13], [.32, .11], [.26, .2]];
      let pts = half.map(([x, y]) => [s * x, y]); if (s < 0) pts = pts.reverse();
      rings.push(profileRing(pts, z, 40));
    }
    add(sp, loft(rings, { colorFn: paintFn }), 'paint');
    pod(sp, 'matte', { z0: .66, z1: .5, cx: s * .52, cy: .55, w: .4, h: .13, w1: .36, h1: .1, n: 2.6 });   // inlet
    pod(sp, 'navy', { z0: .9, z1: .52, cx: s * .62, cy: .12, w: .26, h: .03, w1: .34, n: 3 });            // bargeboard-style floor fence
  });

  /* ---------- power unit cover: airbox over the driver's head, shark fin, number ---------- */
  const pw = part('power', [0, 1.7, -.5], [-.25, 0, 0]);
  {
    const T = [[-.02, .76, .25], [-.2, 1.02, .2], [-.45, .99, .22], [-.85, .86, .27], [-1.35, .72, .25], [-1.8, .58, .19], [-2.15, .47, .13]];
    const rings = [];
    for (let z = -.02; z >= -2.15; z -= .05) {
      const [top, hw] = keyed(T, z), mid = Math.min(.45, top - .12);
      rings.push(profileRing([[0, top], [hw * .5, top - .015], [hw * .95, top - .09], [hw * 1.04, mid], [hw, .22], [0, .2], [-hw, .22], [-hw * 1.04, mid], [-hw * .95, top - .09], [-hw * .5, top - .015]], z, 44));
    }
    add(pw, loft(rings, { colorFn: paintFn }), 'paint');
    pod(pw, 'matte', { z0: -.17, z1: -.24, cy: .93, w: .2, h: .15, w1: .16, h1: .12, n: 2.3 });          // airbox intake
    pod(pw, 'matte', { z0: -.26, z1: -.4, cy: 1.04, w: .2, h: .028, n: 4 });                              // camera pod
    plate(pw, 'navy', [[-.5, 1.0], [-1.95, .97], [-2.15, .62], [-1.3, .74], [-.6, .9]], 0, .012);          // shark fin
    decal(pw, numTex, .36, .22, [0, .78, -1.25], [0, Math.PI / 2, 0]).position.x = .14;
    decal(pw, numTex, .36, .22, [-.14, .78, -1.25], [0, -Math.PI / 2, 0]);
    const n1 = pw.g.children[pw.g.children.length - 2]; n1.position.set(.012, .8, -1.25);
    const n2 = pw.g.children[pw.g.children.length - 1]; n2.position.set(-.012, .8, -1.25);
  }

  /* ---------- halo ---------- */
  const ha = part('halo', [0, 1.4, .6], [.3, 0, 0]);
  {
    const loop = new THREE.CatmullRomCurve3([[-.29, .72, -.3], [-.33, .9, -.06], [-.22, .96, .3], [0, .965, .4], [.22, .96, .3], [.33, .9, -.06], [.29, .72, -.3]].map(p => V(...p)));
    add(ha, new THREE.TubeGeometry(loop, 64, .033, 14, false), 'navy');
    add(ha, new THREE.TubeGeometry(new THREE.CatmullRomCurve3([V(0, .965, .4), V(0, .9, .55), V(0, .74, .66)]), 16, .03, 12, false), 'navy');
  }

  /* ---------- rear wing: curved-tip main plane + DRS flap, endplates, beam wing, swan neck ---------- */
  const rw = part('rearWing', [0, 1.5, -2.2], [.3, 0, 0]);
  {
    const tip = s => Math.pow(sstep(.55, 1, Math.abs(s)), 1.4);
    add(rw, wing(s => ({ x: s * .5, chord: .33, y: .84 - .2 * tip(s), z: -2.36, angle: .1 + .2 * tip(s), invert: true }), 50, { thick: .11, camber: .08 }), 'navy');
    add(rw, wing(s => ({ x: s * .5, chord: .2, y: .99 - .16 * tip(s), z: -2.62, angle: .55 + .15 * tip(s), invert: true }), 50, { thick: .1, camber: .07 }), 'orange');
    [-1, 1].forEach(s => {
      plate(rw, 'navy', [[-2.3, .46], [-2.3, .9], [-2.3, 1.1, -2.52, 1.1], [-2.86, 1.1], [-2.94, 1.1, -2.94, 1.0], [-2.86, .56], [-2.8, .44, -2.6, .44]], s * .52, .016);
      const t = decal(rw, nameTex, .48, .075, [s * .53, .9, -2.62], [0, s * Math.PI / 2, 0]); t.position.x = s * .5305;
    });
    add(rw, wing(s => ({ x: s * .42, chord: .15, y: .38, z: -2.43, angle: .18, invert: true }), 20, { thick: .1, camber: .06 }), 'carbon');
    add(rw, wing(s => ({ x: s * .42, chord: .11, y: .45, z: -2.56, angle: .45, invert: true }), 20, { thick: .1, camber: .06 }), 'carbon');
    plate(rw, 'carbon', [[-2.4, .36], [-2.52, .36], [-2.6, .66], [-2.5, .84], [-2.42, .82], [-2.48, .64]], 0, .03);
  }

  /* ---------- suspension: aero-faired wishbones and push/pull rods ---------- */
  const sf = part('suspF', [0, .2, 1.1]), sr = part('suspR', [0, .2, -1.2]);
  [-1, 1].forEach(s => {
    strut(sf, [s * .22, .44, 2.08], [s * .66, .47, 1.86]); strut(sf, [s * .22, .44, 1.62], [s * .66, .47, 1.86]);
    strut(sf, [s * .2, .2, 2.12], [s * .68, .24, 1.86]); strut(sf, [s * .2, .2, 1.56], [s * .68, .24, 1.86]);
    strut(sf, [s * .23, .26, 1.8], [s * .64, .45, 1.92], .009);
    strut(sr, [s * .3, .42, -1.5], [s * .64, .5, -1.75]); strut(sr, [s * .3, .42, -1.98], [s * .64, .5, -1.75]);
    strut(sr, [s * .3, .18, -1.45], [s * .66, .22, -1.75]); strut(sr, [s * .3, .18, -2.02], [s * .66, .22, -1.75]);
  });

  /* ---------- wheels: 18" slicks with rounded shoulders, wheel covers, brake ducts ---------- */
  const wheels = [];
  [['wheelFL', -1, .8, .305, 1.86], ['wheelFR', 1, .8, .305, 1.86], ['wheelRL', -1, .79, .405, -1.75], ['wheelRR', 1, .79, .405, -1.75]].forEach(([n, s, x, w, z]) => {
    const p = part(n, [s * 2.7, .25, z > 0 ? .6 : -.6], [0, s * .6, 0]);
    const R = .36, Rr = .232;
    p.g.position.set(s * x, R, z); p.base.copy(p.g.position);
    const spin = new THREE.Group(); p.g.add(spin);
    const prof = [[Rr, -w / 2 + .035], [Rr + .03, -w / 2 + .008], [R - .07, -w / 2], [R - .02, -w / 2 + .014], [R, -w / 2 + .05], [R, w / 2 - .05], [R - .02, w / 2 - .014], [R - .07, w / 2], [Rr + .03, w / 2 - .008], [Rr, w / 2 - .035]];
    const tyre = new THREE.Mesh(new THREE.LatheGeometry(prof.map(([r, y]) => new THREE.Vector2(r, y)), 96), p.m('rubber'));
    tyre.rotation.z = Math.PI / 2; spin.add(tyre);
    const band = new THREE.MeshBasicMaterial({ color: '#e8202a' }), band2 = new THREE.MeshBasicMaterial({ color: '#d9d9d9' });
    [-1, 1].forEach(o => {
      const b = new THREE.Mesh(new THREE.TorusGeometry(.305, .007, 6, 96), band); b.rotation.y = Math.PI / 2; b.position.x = o * (w / 2 + .001); spin.add(b);
      const b2 = new THREE.Mesh(new THREE.TorusGeometry(.272, .0035, 6, 96), band2); b2.rotation.y = Math.PI / 2; b2.position.x = o * (w / 2 - .004); spin.add(b2);
      const cov = new THREE.Mesh(new THREE.CircleGeometry(Rr + .004, 48), o === s ? p.m('cover') : p.m('matte'));
      cov.rotation.y = o * Math.PI / 2; cov.position.x = o * (w / 2 - .02); spin.add(cov);
    });
    // brake duct drum (doesn't spin) and, at the front, the wheel-wake winglet over the tyre
    const duct = new THREE.Mesh(new THREE.CylinderGeometry(.2, .2, w * .7, 24), p.m('carbon')); duct.rotation.z = Math.PI / 2; duct.position.x = -s * .02; p.g.add(duct);
    if (z > 0) { const wl = new THREE.Mesh(new THREE.TorusGeometry(.4, .011, 6, 32, 1.1), p.m('carbon')); wl.rotation.set(0, Math.PI / 2, .9); wl.scale.set(1, 1, 3); p.g.add(wl); }
    wheels.push(spin);
  });

  Object.values(parts).forEach(p => { if (!p.base.lengthSq()) p.base.copy(p.g.position); p.phase = Math.random() * Math.PI * 2; });
  root.traverse(o => { if (o.isMesh) { o.castShadow = true; } });

  function explode(ex, time = 0, focus = null) {
    const fset = new Set([].concat(focus || []));
    Object.entries(parts).forEach(([n, p]) => {
      const f = ex * (fset.has(n) ? 1.55 : 1);
      p.g.position.copy(p.base).addScaledVector(p.explode, f);
      p.g.position.y += Math.sin(time * .9 + p.phase) * .06 * ex;
      p.g.rotation.set(p.spin.x * f, p.spin.y * f, p.spin.z * f);
    });
  }
  function highlight(names, color) {
    const set = new Set([].concat(names || []));
    Object.entries(parts).forEach(([n, p]) => Object.values(p.mats).forEach(m => {
      if (!m.emissive) return;
      m.emissive.set(set.has(n) ? color : '#000000'); m.emissiveIntensity = set.has(n) ? .6 : 0;
    }));
  }
  return { car: root, parts, wheels, rain: parts.chassis.g.children.find(o => o.material && o.material.color && o.geometry.type === 'BoxGeometry' && o.position.z < -2.6), explode, highlight };
}
export function buildGarage({ accent = '#FF5A1F' } = {}) {
  const g = new THREE.Group();
  const floorTex = canvasTex(1024, 1024, (c, w, h) => {
    c.fillStyle = '#121012'; c.fillRect(0, 0, w, h);
    for (let i = 0; i < 9000; i++) { c.fillStyle = `rgba(255,255,255,${Math.random() * .025})`; c.fillRect(Math.random() * w, Math.random() * h, 2, 2); }
    c.strokeStyle = 'rgba(255,255,255,.05)'; c.lineWidth = 2;
    for (let i = 0; i <= 16; i++) { c.beginPath(); c.moveTo(i * 64, 0); c.lineTo(i * 64, h); c.stroke(); c.beginPath(); c.moveTo(0, i * 64); c.lineTo(w, i * 64); c.stroke(); }
    // pit box (floor is 32 x 32 units -> 32 px per unit)
    c.strokeStyle = '#b8901f'; c.lineWidth = 6; c.strokeRect(512 - 72, 512 - 128, 144, 256);
    c.setLineDash([22, 16]); c.strokeStyle = 'rgba(255,255,255,.55)'; c.lineWidth = 4; c.strokeRect(512 - 104, 512 - 168, 208, 336); c.setLineDash([]);
    c.save(); c.translate(512, 512 + 220); c.fillStyle = 'rgba(184,144,31,.4)'; c.font = '800 54px Arial Black, Arial'; c.textAlign = 'center'; c.fillText('PIT 27', 0, 0); c.restore();
  });
  const floor = new THREE.Mesh(new THREE.PlaneGeometry(32, 32), new THREE.MeshStandardMaterial({ map: floorTex, roughness: .22, metalness: .25 }));
  floor.rotation.x = -Math.PI / 2; g.add(floor);

  const wallTex = canvasTex(2048, 512, (c, w, h) => {
    c.fillStyle = '#151316'; c.fillRect(0, 0, w, h);
    c.strokeStyle = 'rgba(255,255,255,.05)'; c.lineWidth = 3;
    for (let x = 0; x < w; x += 128) { c.beginPath(); c.moveTo(x, 0); c.lineTo(x, h); c.stroke(); }
    // pegboard with tool outlines
    const bx = 700, by = 90, bw = 650, bh = 250;
    c.fillStyle = '#1c1a1e'; c.fillRect(bx, by, bw, bh);
    c.fillStyle = 'rgba(255,255,255,.08)'; for (let y = by + 12; y < by + bh; y += 22) for (let x = bx + 12; x < bx + bw; x += 22) c.fillRect(x, y, 3, 3);
    c.strokeStyle = 'rgba(255,255,255,.28)'; c.lineWidth = 4;
    for (let k = 0; k < 9; k++) { const x = bx + 40 + k * 66; c.strokeRect(x, by + 40, 18, 120 + (k % 3) * 20); c.beginPath(); c.arc(x + 9, by + 40, 18, 0, Math.PI * 2); c.stroke(); }
    c.fillStyle = accent; c.fillRect(0, 380, w, 10);
    c.fillStyle = 'rgba(255,255,255,.1)'; c.font = '800 120px Arial Black, Arial'; c.fillText('GARAGE 27', 80, 300);
  });
  const wall = new THREE.Mesh(new THREE.PlaneGeometry(32, 8), new THREE.MeshStandardMaterial({ map: wallTex, roughness: .8 }));
  wall.position.set(0, 4, -9); g.add(wall);
  [-1, 1].forEach(s => { const sw = new THREE.Mesh(new THREE.PlaneGeometry(22, 8), new THREE.MeshStandardMaterial({ color: '#111013', roughness: .9 })); sw.position.set(s * 13, 4, 2); sw.rotation.y = -s * Math.PI / 2; g.add(sw); });
  const ceil = new THREE.Mesh(new THREE.PlaneGeometry(32, 22), new THREE.MeshStandardMaterial({ color: '#0b0a0c', roughness: 1 }));
  ceil.position.set(0, 7.6, 2); ceil.rotation.x = Math.PI / 2; g.add(ceil);
  const stripMat = new THREE.MeshBasicMaterial({ color: new THREE.Color('#fff4e6').multiplyScalar(2.2) });
  for (let k = 0; k < 6; k++) { const s = new THREE.Mesh(new THREE.BoxGeometry(14, .05, .16), stripMat); s.position.set(0, 7.5, -7 + k * 2.4); g.add(s); }
  [-3.5, 3.5].forEach(x => { const sp = new THREE.SpotLight('#fff1dc', 70, 22, .75, .7, 1.6); sp.position.set(x, 7.2, 2); sp.target.position.set(0, 0, 0); g.add(sp, sp.target); });
  const fill = new THREE.PointLight('#ffb070', 30, 18, 2); fill.position.set(-6, 3, -5); g.add(fill);

  // tyre stacks
  const rub = new THREE.MeshStandardMaterial({ color: '#0d0d0e', roughness: .9 });
  [['#e8202a', -9.5, -6.5], ['#f2c230', -8.3, -7.6], ['#f4f4f2', 9.6, -6]].forEach(([col, x, z]) => {
    for (let k = 0; k < 4; k++) {
      const t = new THREE.Mesh(new THREE.CylinderGeometry(.36, .36, .34, 32), rub); t.position.set(x, .17 + k * .35, z); g.add(t);
      const st = new THREE.Mesh(new THREE.TorusGeometry(.3, .012, 6, 48), new THREE.MeshBasicMaterial({ color: col })); st.rotation.x = Math.PI / 2; st.position.set(x, .35 + k * .35, z); g.add(st);
    }
  });
  // tool cart
  const cart = new THREE.Group();
  const cm = new THREE.MeshPhysicalMaterial({ color: accent, metalness: .5, roughness: .35, clearcoat: .6 });
  const cb = new THREE.Mesh(new THREE.BoxGeometry(1.5, .95, .65), cm); cb.position.y = .6; cart.add(cb);
  for (let k = 0; k < 4; k++) { const d = new THREE.Mesh(new THREE.BoxGeometry(1.42, .015, .02), new THREE.MeshStandardMaterial({ color: '#111' })); d.position.set(0, .3 + k * .22, .33); cart.add(d); }
  cart.position.set(8.4, 0, -7.9); g.add(cart);
  // workbench
  const bench = new THREE.Mesh(new THREE.BoxGeometry(6, .08, 1), new THREE.MeshStandardMaterial({ color: '#2a2622', roughness: .7 })); bench.position.set(-1, 1, -8.4); g.add(bench);
  // telemetry screens
  const scr = canvasTex(512, 288, (c, w, h) => {
    c.fillStyle = '#05080a'; c.fillRect(0, 0, w, h);
    c.strokeStyle = 'rgba(46,242,195,.15)'; for (let y = 0; y < h; y += 24) { c.beginPath(); c.moveTo(0, y); c.lineTo(w, y); c.stroke(); }
    [['#2EF2C3', 40], ['#FF5A1F', 120], ['#FFC23D', 200]].forEach(([col, base]) => {
      c.strokeStyle = col; c.lineWidth = 3; c.beginPath();
      for (let x = 0; x <= w; x += 8) { const y = base + Math.sin(x / 30 + base) * 18 + Math.sin(x / 9) * 6; x ? c.lineTo(x, y) : c.moveTo(x, y); }
      c.stroke();
    });
    c.fillStyle = '#2EF2C3'; c.font = '600 22px monospace'; c.fillText('LAP 27  S1 28.4  S2 31.1', 16, 270);
  });
  const scrMat = new THREE.MeshBasicMaterial({ map: scr, color: new THREE.Color(1.4, 1.4, 1.4) });
  [-4.2, 4.2].forEach(x => { const s = new THREE.Mesh(new THREE.PlaneGeometry(2.6, 1.46), scrMat); s.position.set(x, 4.3, -8.95); g.add(s); });
  return g;
}
