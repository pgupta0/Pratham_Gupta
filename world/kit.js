/* kit.js: shared materials, textures and builders for Pratham's Town.

   Conventions
   - Metres. +x east, +z south, +y up.
   - Every builder places the object's BASE at the given y (default 0), not its centre.
   - Builders return a THREE.Mesh or THREE.Group with castShadow/receiveShadow set.
     Pass { parent } to add it to a group directly.
   - Common placement options: { x, y, z, ry (rotation about Y), rx, rz, parent, name }.
   - Static geometry should be merged with kit.bake(group) at the end of a district build.
     Objects with userData.dynamic = true are left alone (use that for anything you animate).
   - Trees, bushes, lamps and benches go into shared instanced pools (one draw call each,
     town-wide); main.js flushes the pools after all districts are built.

   Exports
   PALETTE, setQuality(q), quality()
   canvasTex(w, h, draw, opts), noiseTex(), T (shared textures), M (shared materials)
   worldUV(geometry, sx, sy)
   box, rbox, cyl, sphere, cone, plane, extrude, place
   building(opts), roofUnits(...), windowRow(...), sign(text, opts), label(text, opts),
   paint(x, z, w, d, color, opts), stripes(...), fence(points, opts), railing(...)
   tree, bush, lamp, bench (pooled), flushPools(scene)
   person(opts), bus(opts), car(opts), van(opts), scooter(opts)
   bake(group), stats(object), rng(seed)
*/
import * as THREE from 'three';
import { RoundedBoxGeometry } from 'three/addons/geometries/RoundedBoxGeometry.js';
import { mergeGeometries } from 'three/addons/utils/BufferGeometryUtils.js';

export const PALETTE = {
  // toy-brick palette: bright, saturated, plastic
  grass: '#4FA83D', grassDark: '#2E8B3A', sand: '#E4CD9E', paving: '#A3A9AE', asphalt: '#5B5E62',
  kerb: '#C7CBCE', water: '#3E9BE0', cream: '#F2E6CC', white: '#F6F6F3', terracotta: '#C8502D',
  brick: '#C0392B', steel: '#9BA4AD', glass: '#9FD3F5', ink: '#1F2328',
};

let Q = 'high';
export const setQuality = q => (Q = q);
export const quality = () => Q;
const SEG = () => (Q === 'low' ? 1 : 2);

/* ------------------------------------------------------------------ random */
export function rng(seed = 1) {
  let s = (seed * 2654435761) >>> 0 || 1;
  const f = () => ((s = (s ^ (s << 13)) >>> 0, s = (s ^ (s >>> 17)) >>> 0, s = (s ^ (s << 5)) >>> 0) / 4294967296);
  f.range = (a, b) => a + (b - a) * f();
  f.pick = arr => arr[Math.floor(f() * arr.length)];
  return f;
}

/* ------------------------------------------------------------------ textures */
export function canvasTex(w, h, draw, { srgb = true, repeat = true } = {}) {
  const c = document.createElement('canvas'); c.width = w; c.height = h;
  const g = c.getContext('2d'); draw(g, w, h);
  const t = new THREE.CanvasTexture(c);
  if (srgb) t.colorSpace = THREE.SRGBColorSpace;
  if (repeat) t.wrapS = t.wrapT = THREE.RepeatWrapping;
  t.anisotropy = Q === 'low' ? 2 : 8;
  return t;
}
// tileable value noise into a canvas context
function noiseFill(g, w, h, { cells = 8, amp = 1, base = 128, seed = 1, octaves = 3 } = {}) {
  const img = g.getImageData(0, 0, w, h), d = img.data, R = rng(seed);
  const layers = [];
  for (let o = 0; o < octaves; o++) { const n = cells << o, grid = []; for (let i = 0; i < n * n; i++) grid.push(R()); layers.push({ n, grid, a: 1 / (1 << o) }); }
  const sm = t => t * t * (3 - 2 * t);
  for (let y = 0; y < h; y++) for (let x = 0; x < w; x++) {
    let v = 0, tot = 0;
    for (const { n, grid, a } of layers) {
      const fx = x / w * n, fy = y / h * n, x0 = Math.floor(fx), y0 = Math.floor(fy), tx = sm(fx - x0), ty = sm(fy - y0);
      const G = (i, j) => grid[((j % n + n) % n) * n + ((i % n + n) % n)];
      const top = G(x0, y0) * (1 - tx) + G(x0 + 1, y0) * tx, bot = G(x0, y0 + 1) * (1 - tx) + G(x0 + 1, y0 + 1) * tx;
      v += (top * (1 - ty) + bot * ty) * a; tot += a;
    }
    v = base + (v / tot - .5) * 2 * 127 * amp;
    const k = (y * w + x) * 4; d[k] = d[k + 1] = d[k + 2] = Math.max(0, Math.min(255, v)); d[k + 3] = 255;
  }
  g.putImageData(img, 0, 0);
}
export const noiseTex = (opts = {}) => canvasTex(128, 128, (g, w, h) => noiseFill(g, w, h, opts), { srgb: false });

// shared albedo textures: all near-white so material colour tints them; 1 repeat = the metres in T_SIZE
const T_SIZE = { grain: 4, paving: 2.4, tiles: 1.2, brick: 1.6, concrete: 4, asphalt: 6, wood: 1.5, roof: 2, grass: 8, sand: 6, metal: 1 };
export const T = {};
const lazy = (name, make) => Object.defineProperty(T, name, { get() { const v = make(); Object.defineProperty(T, name, { value: v }); return v; }, configurable: true });
lazy('grain', () => canvasTex(128, 128, (g, w, h) => { noiseFill(g, w, h, { cells: 4, amp: .16, base: 238, seed: 3 }); }));
lazy('grass', () => canvasTex(256, 256, (g, w, h) => {
  noiseFill(g, w, h, { cells: 4, amp: .3, base: 225, seed: 5 });
  const R = rng(9); for (let i = 0; i < 2600; i++) { const v = 170 + R() * 85 | 0; g.fillStyle = `rgba(${v},${v + 10},${v - 30},.5)`; g.fillRect(R() * w, R() * h, 1.5, 3); }
}));
lazy('sand', () => canvasTex(128, 128, (g, w, h) => { noiseFill(g, w, h, { cells: 8, amp: .12, base: 240, seed: 6 }); const R = rng(2); for (let i = 0; i < 900; i++) { const v = 200 + R() * 55 | 0; g.fillStyle = `rgb(${v},${v},${v})`; g.fillRect(R() * w, R() * h, 1, 1); } }));
lazy('paving', () => canvasTex(256, 256, (g, w, h) => {
  noiseFill(g, w, h, { cells: 4, amp: .1, base: 236, seed: 7 });
  g.strokeStyle = 'rgba(120,110,100,.35)'; g.lineWidth = 2;
  for (let i = 0; i <= 4; i++) { g.beginPath(); g.moveTo(0, i * h / 4); g.lineTo(w, i * h / 4); g.stroke(); }
  for (let r = 0; r < 4; r++) for (let i = 0; i <= 2; i++) { const x = (i + (r % 2) * .5) * w / 2; g.beginPath(); g.moveTo(x, r * h / 4); g.lineTo(x, (r + 1) * h / 4); g.stroke(); }
}));
lazy('tiles', () => canvasTex(128, 128, (g, w, h) => { noiseFill(g, w, h, { cells: 4, amp: .08, base: 240, seed: 8 }); g.strokeStyle = 'rgba(110,105,100,.35)'; g.lineWidth = 2; g.strokeRect(1, 1, w - 2, h - 2); }));
lazy('brick', () => canvasTex(256, 256, (g, w, h) => {
  g.fillStyle = '#d9d2ca'; g.fillRect(0, 0, w, h);
  const R = rng(11), rows = 12, bw = w / 4;
  for (let r = 0; r < rows; r++) for (let i = -1; i < 5; i++) {
    const x = i * bw + (r % 2) * bw / 2, y = r * h / rows, v = 215 + R() * 40 | 0;
    g.fillStyle = `rgb(${v},${v - 4},${v - 8})`; g.fillRect(x + 2, y + 2, bw - 4, h / rows - 4);
  }
}));
lazy('concrete', () => canvasTex(256, 256, (g, w, h) => { noiseFill(g, w, h, { cells: 6, amp: .1, base: 238, seed: 12 }); g.strokeStyle = 'rgba(0,0,0,.08)'; g.lineWidth = 2; g.strokeRect(0, 0, w, h); }));
lazy('asphalt', () => canvasTex(256, 256, (g, w, h) => { noiseFill(g, w, h, { cells: 16, amp: .12, base: 232, seed: 13 }); const R = rng(4); for (let i = 0; i < 2400; i++) { const v = 180 + R() * 75 | 0; g.fillStyle = `rgb(${v},${v},${v})`; g.fillRect(R() * w, R() * h, 1.5, 1.5); } }));
lazy('wood', () => canvasTex(128, 128, (g, w, h) => { g.fillStyle = '#eee'; g.fillRect(0, 0, w, h); const R = rng(14); for (let y = 0; y < h; y += 2) { g.fillStyle = `rgba(120,90,60,${.05 + R() * .12})`; g.fillRect(0, y, w, 1); } g.fillStyle = 'rgba(80,60,40,.25)'; for (let i = 0; i < 4; i++) g.fillRect(0, i * h / 4, w, 2); }));
lazy('roof', () => canvasTex(128, 128, (g, w, h) => { g.fillStyle = '#eee'; g.fillRect(0, 0, w, h); for (let x = 0; x < w; x += 16) { const gr = g.createLinearGradient(x, 0, x + 16, 0); gr.addColorStop(0, '#d8d8d8'); gr.addColorStop(.5, '#fafafa'); gr.addColorStop(1, '#cfcfcf'); g.fillStyle = gr; g.fillRect(x, 0, 16, h); } }));
lazy('metal', () => canvasTex(64, 64, (g, w, h) => { noiseFill(g, w, h, { cells: 8, amp: .06, base: 240, seed: 15 }); }));
lazy('normalWater', () => canvasTex(256, 256, (g, w, h) => {
  // a soft ripple normal map
  const img = g.createImageData(w, h), d = img.data;
  for (let y = 0; y < h; y++) for (let x = 0; x < w; x++) {
    const a = Math.sin((x / w) * Math.PI * 6 + Math.sin((y / h) * Math.PI * 4) * 1.5), b = Math.sin((y / h) * Math.PI * 8 + Math.cos((x / w) * Math.PI * 2) * 2);
    const k = (y * w + x) * 4; d[k] = 128 + a * 40; d[k + 1] = 128 + b * 40; d[k + 2] = 255; d[k + 3] = 255;
  }
  g.putImageData(img, 0, 0);
}, { srgb: false }));

/* ------------------------------------------------------------------ materials */
const MAT = new Map();
const cached = (key, make) => { if (!MAT.has(key)) MAT.set(key, make()); return MAT.get(key); };
const texFor = (name, k = 1) => { const t = T[name]; t.userData.metres = T_SIZE[name] * k; return t; };
/* Toy-brick look, applied to every kit material: glossy plastic, round studs on upward faces,
   brick courses on walls. Done in the shader from world position, so any shape gets it for free.
   STUD = stud spacing in metres (a person is about 3.5 studs tall), BRICK = course height. */
export const STUD = .5, BRICK = .6;
const SMOOTH = new Set(['asphalt', 'paving', 'tiles']);           // road/path plates are smooth tiles
const plastic = r => Math.min(.62, r * .42 + .14);
export function brickify(m, { studs = true, courses = true } = {}) {
  m.userData.brick = { studs, courses };
  m.onBeforeCompile = sh => {
    sh.vertexShader = sh.vertexShader
      .replace('#include <common>', '#include <common>\nvarying vec3 bkWP; varying vec3 bkWN;')
      .replace('#include <project_vertex>', `#include <project_vertex>
        #ifdef USE_INSTANCING
          bkWP = (modelMatrix * instanceMatrix * vec4(transformed, 1.0)).xyz; bkWN = normalize(mat3(modelMatrix) * mat3(instanceMatrix) * objectNormal);
        #else
          bkWP = (modelMatrix * vec4(transformed, 1.0)).xyz; bkWN = normalize(mat3(modelMatrix) * objectNormal);
        #endif`);
    sh.fragmentShader = sh.fragmentShader
      .replace('#include <common>', '#include <common>\nvarying vec3 bkWP; varying vec3 bkWN;')
      .replace('#include <color_fragment>', `#include <color_fragment>
        float bkFade = 1.0 - smoothstep(30.0, 115.0, length(bkWP - cameraPosition));
        vec3 bkN = normalize(bkWN); float bkShade = 1.0, bkRim = 0.0; vec2 bkC = vec2(0.0);
        ${studs ? `if (bkN.y > 0.85 && bkFade > 0.0) {
          bkC = fract(bkWP.xz / ${STUD.toFixed(3)}) - 0.5; float d = length(bkC), r = 0.3;
          bkRim = smoothstep(r - 0.08, r - 0.01, d) * (1.0 - smoothstep(r - 0.01, r + 0.01, d)) * bkFade;
          float ring = smoothstep(r, r + 0.03, d) * (1.0 - smoothstep(r + 0.03, r + 0.16, d));
          bkShade *= 1.0 - ring * 0.26 * bkFade;
          bkShade *= 1.0 + (1.0 - smoothstep(r - 0.03, r, d)) * 0.05 * bkFade;
        }` : ''}
        ${courses ? `if (abs(bkN.y) < 0.35 && bkFade > 0.0) {
          float fy = fract(bkWP.y / ${BRICK.toFixed(3)});
          float g = 1.0 - smoothstep(0.0, 0.04, fy);
          bkShade *= 1.0 - g * 0.2 * bkFade;
        }` : ''}
        diffuseColor.rgb *= bkShade;`)
      .replace('#include <normal_fragment_maps>', `#include <normal_fragment_maps>
        if (bkRim > 0.0) { vec3 pn = normalize(vec3(bkC.x, 0.25, bkC.y)); normal = normalize(mix(normal, (viewMatrix * vec4(pn, 0.0)).xyz, bkRim * 0.85)); }`);
  };
  m.customProgramCacheKey = () => `brick${studs ? 1 : 0}${courses ? 1 : 0}`;
  return m;
}
export const M = {
  std(hex, { rough = .85, metal = 0, map = 'grain', emissive = null, ei = 1, side = THREE.FrontSide, flat = false, studs, courses } = {}) {
    return cached(`std|${hex}|${rough}|${metal}|${map}|${emissive}|${ei}|${side}|${flat}|${studs}|${courses}`, () => {
      const m = new THREE.MeshStandardMaterial({ color: hex, roughness: plastic(rough), metalness: metal * .6, side, flatShading: flat, envMapIntensity: 1.15 });
      if (emissive) { m.emissive = new THREE.Color(emissive); m.emissiveIntensity = ei; }
      m.userData.metres = 1;
      return brickify(m, { studs: studs ?? !SMOOTH.has(map), courses: courses ?? !SMOOTH.has(map) });
    });
  },
  tex(name, hex = '#ffffff', { rough = .9, metal = 0 } = {}) { return M.std(hex, { rough, metal, map: name }); },
  get grass() { return M.std(PALETTE.grass, { map: 'grass', rough: 1 }); },
  get grassDark() { return M.std(PALETTE.grassDark, { map: 'grass', rough: 1 }); },
  get sand() { return M.std(PALETTE.sand, { map: 'sand', rough: 1 }); },
  get paving() { return M.std(PALETTE.paving, { map: 'paving', rough: .95 }); },
  get tiles() { return M.std('#ECE6DC', { map: 'tiles', rough: .8 }); },
  get asphalt() { return M.std(PALETTE.asphalt, { map: 'asphalt', rough: .95 }); },
  get concrete() { return M.std('#D7D3CC', { map: 'concrete', rough: .95 }); },
  get brick() { return M.std(PALETTE.brick, { map: 'brick', rough: .95 }); },
  get wood() { return M.std('#B9875A', { map: 'wood', rough: .8 }); },
  get roof() { return M.std('#8E959D', { map: 'roof', rough: .6, metal: .3 }); },
  get metal() { return M.std(PALETTE.steel, { map: 'metal', rough: .35, metal: .8 }); },
  get dark() { return M.std('#2B2F35', { rough: .6 }); },
  get rubber() { return M.std('#1E1F22', { rough: .9, map: null }); },
  get white() { return M.std(PALETTE.white, { rough: .7 }); },
  get cream() { return M.std(PALETTE.cream, { rough: .9 }); },
  get glass() {
    return cached('glass', () => new THREE.MeshPhysicalMaterial({ color: '#8CCBF2', roughness: .05, metalness: 0, clearcoat: 1, clearcoatRoughness: .04, envMapIntensity: 1.5 }));
  },
  glassTint(hex) { return cached('glass|' + hex, () => new THREE.MeshPhysicalMaterial({ color: hex, roughness: .08, metalness: .2, clearcoat: 1, envMapIntensity: 1.3 })); },
  emit(hex, k = 1.5) { return cached(`emit|${hex}|${k}`, () => new THREE.MeshBasicMaterial({ color: new THREE.Color(hex).multiplyScalar(k), toneMapped: k <= 1 })); },
  paint(hex) { return cached('paint|' + hex, () => new THREE.MeshStandardMaterial({ color: hex, roughness: .7, polygonOffset: true, polygonOffsetFactor: -2, polygonOffsetUnits: -2 })); },
  carPaint(hex) { return cached('car|' + hex, () => brickify(new THREE.MeshPhysicalMaterial({ color: hex, roughness: .28, metalness: 0, clearcoat: .6, clearcoatRoughness: .1 }), { courses: false })); },
};

/* ------------------------------------------------------------------ geometry helpers */
// box-projected UVs in metres, so textures keep their real size on any shape
export function worldUV(geo, sx = 1, sy = sx) {
  const p = geo.attributes.position, n = geo.attributes.normal; if (!p || !n) return geo;
  const uv = new Float32Array(p.count * 2);
  for (let i = 0; i < p.count; i++) {
    const ax = Math.abs(n.getX(i)), ay = Math.abs(n.getY(i)), az = Math.abs(n.getZ(i));
    let u, v;
    if (ay >= ax && ay >= az) { u = p.getX(i); v = p.getZ(i); }
    else if (ax >= az) { u = p.getZ(i); v = p.getY(i); }
    else { u = p.getX(i); v = p.getY(i); }
    uv[i * 2] = u / sx; uv[i * 2 + 1] = v / sy;
  }
  geo.setAttribute('uv', new THREE.BufferAttribute(uv, 2));
  return geo;
}
const metresOf = mat => (mat && mat.userData && mat.userData.metres) || 1;
export function place(obj, o = {}) {
  obj.position.set(o.x || 0, o.y || 0, o.z || 0);
  obj.rotation.set(o.rx || 0, o.ry || 0, o.rz || 0);
  if (o.name) obj.name = o.name;
  if (o.parent) o.parent.add(obj);
  obj.traverse(m => { if (m.isMesh) { m.castShadow = o.cast !== false; m.receiveShadow = true; } });
  return obj;
}
const mesh = (geo, mat, o) => {
  if (mat && mat.map && !o.keepUV) worldUV(geo, metresOf(mat));
  return place(new THREE.Mesh(geo, mat), o);
};
export function box(w, h, d, mat, o = {}) { const g = new THREE.BoxGeometry(w, h, d); g.translate(0, h / 2, 0); return mesh(g, mat, o); }
export function rbox(w, h, d, r, mat, o = {}) {
  const rr = Math.min(r, w / 2 - .001, h / 2 - .001, d / 2 - .001);
  const g = new RoundedBoxGeometry(w, h, d, o.seg || SEG(), Math.max(.001, rr)); g.translate(0, h / 2, 0); return mesh(g, mat, o);
}
export function cyl(rt, rb, h, mat, o = {}) { const g = new THREE.CylinderGeometry(rt, rb, h, o.seg || (Q === 'low' ? 10 : 20), 1, !!o.open); g.translate(0, h / 2, 0); return mesh(g, mat, o); }
export function cone(r, h, mat, o = {}) { const g = new THREE.ConeGeometry(r, h, o.seg || (Q === 'low' ? 8 : 16)); g.translate(0, h / 2, 0); return mesh(g, mat, o); }
export function sphere(r, mat, o = {}) { const g = new THREE.SphereGeometry(r, o.seg || (Q === 'low' ? 10 : 20), o.seg2 || (Q === 'low' ? 8 : 14)); g.translate(0, r, 0); return mesh(g, mat, o); }
// flat horizontal plane (w along x, d along z), lifted to y (default .02)
export function plane(w, d, mat, o = {}) { const g = new THREE.PlaneGeometry(w, d); g.rotateX(-Math.PI / 2); return mesh(g, mat, Object.assign({ y: .02, cast: false }, o)); }
// footprint polygon [[x,z],...] (local), extruded upwards by h
export function extrude(pts, h, mat, o = {}) {
  const s = new THREE.Shape(pts.map(([x, z]) => new THREE.Vector2(x, -z)));
  const g = new THREE.ExtrudeGeometry(s, { depth: h, bevelEnabled: !!o.bevel, bevelThickness: o.bevel || 0, bevelSize: o.bevel || 0, bevelSegments: 2, curveSegments: 12 });
  g.rotateX(-Math.PI / 2); g.computeVertexNormals();
  return mesh(g, mat, o);
}
// painted ground marking (parking lines, zebra, lettering backgrounds): sits just above y
export function paint(x, z, w, d, color, o = {}) { return plane(w, d, M.paint(color), Object.assign({ x, z, y: (o.y || 0) + .03 }, o)); }
// a row of parallel stripes (parking bay lines, zebra crossings)
export function stripes(group, { x = 0, z = 0, y = 0, count = 5, gap = 3, w = .15, d = 5, color = '#ffffff', ry = 0 }) {
  const g = new THREE.Group(); place(g, { x, z, y, ry, parent: group });
  for (let i = 0; i < count; i++) paint((i - (count - 1) / 2) * gap, 0, w, d, color, { parent: g });
  return g;
}

/* ------------------------------------------------------------------ text */
const FONT = '"Inter", system-ui, -apple-system, "Segoe UI", Arial, sans-serif';
function textCanvas(lines, { pxPerM = 160, w, h, bg = null, fg = PALETTE.ink, weight = 700, size = .5, align = 'center', pad = .18, accent = null, radius = 0 }) {
  const W = Math.min(2048, Math.round(w * pxPerM)), H = Math.min(1024, Math.round(h * pxPerM)), k = W / w;
  return canvasTex(W, H, (g) => {
    if (bg) { g.fillStyle = bg; if (radius) { g.beginPath(); g.roundRect(0, 0, W, H, radius * k); g.fill(); } else g.fillRect(0, 0, W, H); }
    if (accent) { g.fillStyle = accent; g.fillRect(0, H - .07 * k * Math.min(1, h), W, .07 * k * Math.min(1, h)); }
    const arr = [].concat(lines); g.fillStyle = fg; g.textBaseline = 'middle'; g.textAlign = align;
    const total = arr.reduce((s, l) => s + (l.size || size) * 1.25, 0); let y = (H - total * k) / 2;
    for (const l of arr) {
      const L = typeof l === 'string' ? { text: l } : l, sz = (L.size || size) * k;
      let fs = sz; g.font = `${L.weight || weight} ${fs}px ${FONT}`;
      const maxW = W - pad * 2 * k; while (g.measureText(L.text).width > maxW && fs > 8) { fs -= 2; g.font = `${L.weight || weight} ${fs}px ${FONT}`; }
      g.fillStyle = L.color || fg;
      const x = align === 'center' ? W / 2 : align === 'left' ? pad * k : W - pad * k;
      y += (L.size || size) * 1.25 * k / 2; g.fillText(L.text, x, y); y += (L.size || size) * 1.25 * k / 2;
    }
  }, { repeat: false });
}
// a text plane (no board). lines: string or [{text, size, weight, color}] ; size in metres (cap height-ish)
export function label(lines, o = {}) {
  const w = o.w || 4, h = o.h || 1;
  const tex = textCanvas(lines, Object.assign({ w, h }, o));
  const mat = new THREE.MeshBasicMaterial({ map: tex, transparent: !o.bg, toneMapped: false, side: o.double ? THREE.DoubleSide : THREE.FrontSide, polygonOffset: true, polygonOffsetFactor: -1 });
  if (o.lit) { mat.toneMapped = true; }
  const g = new THREE.PlaneGeometry(w, h); g.translate(0, h / 2, 0);
  const m = place(new THREE.Mesh(g, mat), Object.assign({ cast: false }, o));
  m.castShadow = false; m.userData.label = true;
  return m;
}
// a sign board: rounded panel with text on the front (faces +z before rotation). bg/fg/accent colours.
export function sign(lines, o = {}) {
  const w = o.w || 4, h = o.h || 1, depth = o.depth || .12, grp = new THREE.Group();
  rbox(w, h, depth, Math.min(.08, h / 4), M.std(o.board || o.bg || PALETTE.white, { rough: .6 }), { parent: grp, z: 0 });
  const face = label(lines, Object.assign({}, o, { x: 0, y: 0, z: depth / 2 + .004, ry: 0, rx: 0, rz: 0, parent: grp, w: w - .02, h: h - .02, bg: o.bg || PALETTE.white, name: undefined }));
  face.position.y = .01;
  if (o.posts) { const ph = o.posts; [-1, 1].forEach(s => cyl(.05, .05, ph, M.metal, { parent: grp, x: s * (w / 2 - .25), y: -ph, z: -depth / 2 - .03 })); }
  return place(grp, o);
}

/* ------------------------------------------------------------------ buildings */
// one storey of windows along a wall. wall runs along local x, facing +z.
export function windowRow(group, { len, y, z = 0, bay = 3, winW = 1.6, winH = 1.7, frame = PALETTE.white, glass = null, sill = true, inset = .06, x0 = 0, gap = 0 }) {
  const n = Math.max(1, Math.floor(len / bay)), off = (len - n * bay) / 2;
  const fm = M.std(frame, { rough: .5 }), gm = glass || M.glass;
  for (let i = 0; i < n; i++) {
    const cx = x0 - len / 2 + off + bay * (i + .5);
    if (gap && Math.abs(cx) < gap + winW / 2) continue;
    box(winW, winH, .08, gm, { parent: group, x: cx, y, z: z - inset });
    box(winW + .16, .1, .14, fm, { parent: group, x: cx, y: y + winH, z });
    box(.08, winH, .12, fm, { parent: group, x: cx - winW / 2 - .04, y, z });
    box(.08, winH, .12, fm, { parent: group, x: cx + winW / 2 + .04, y, z });
    box(.05, winH, .06, fm, { parent: group, x: cx, y, z: z - inset + .03 });
    if (sill) box(winW + .3, .08, .26, fm, { parent: group, x: cx, y: y - .08, z: z + .06 });
  }
}
/* a complete building: plinth, walls, windows on all four sides, parapet roof, roof units.
   opts: { w, d, floors=2, storey=3.2, wall, trim, glass, roof ('flat'|'gable'|'none'), roofColor,
           bay=3, winW, winH, door: 'front'|null, doorW=2, entrance canopy: canopy=true,
           sides: which sides get windows (default 'nsew'), band: accent band colour, x, z, ry, parent } */
export function building(o) {
  const g = new THREE.Group();
  const { w, d } = o, floors = o.floors || 2, st = o.storey || 3.2, H = floors * st;
  const wallM = typeof o.wall === 'object' ? o.wall : M.std(o.wall || PALETTE.cream, { rough: .92 });
  const trimHex = o.trim || PALETTE.white, trimM = M.std(trimHex, { rough: .6 });
  box(w + .3, .35, d + .3, M.concrete, { parent: g });                     // plinth
  rbox(w, H, d, .08, wallM, { parent: g, y: .3 });                            // body
  if (o.band) for (let f = 1; f < floors; f++) box(w + .06, .22, d + .06, M.std(o.band, { rough: .6 }), { parent: g, y: .3 + f * st - .11 });
  const sides = o.sides || 'nsew';
  const rows = (len, place2) => { for (let f = 0; f < floors; f++) { const y = .3 + f * st + (st - (o.winH || 1.7)) / 2 + .15; place2(len, y, f); } };
  const sideGroup = (ry, len, dist) => { const sg = new THREE.Group(); sg.rotation.y = ry; sg.position.set(Math.sin(ry) * dist, 0, Math.cos(ry) * dist); g.add(sg); return sg; };
  const doorOn = o.door === undefined ? 'front' : o.door;
  if (sides.includes('s')) { const sg = sideGroup(0, w, d / 2); rows(w, (len, y, f) => { if (!(f === 0 && doorOn)) windowRow(sg, { len, y, bay: o.bay, winW: o.winW, winH: o.winH, frame: trimHex, glass: o.glass }); else windowRow(sg, { len, y, bay: o.bay, winW: o.winW, winH: o.winH, frame: trimHex, glass: o.glass, gap: (o.doorW || 2.2) / 2 + .6 }); }); }
  if (sides.includes('n')) { const sg = sideGroup(Math.PI, w, d / 2); rows(w, (len, y) => windowRow(sg, { len, y, bay: o.bay, winW: o.winW, winH: o.winH, frame: trimHex, glass: o.glass })); }
  if (sides.includes('e')) { const sg = sideGroup(Math.PI / 2, d, w / 2); rows(d, (len, y) => windowRow(sg, { len, y, bay: o.bay, winW: o.winW, winH: o.winH, frame: trimHex, glass: o.glass })); }
  if (sides.includes('w')) { const sg = sideGroup(-Math.PI / 2, d, w / 2); rows(d, (len, y) => windowRow(sg, { len, y, bay: o.bay, winW: o.winW, winH: o.winH, frame: trimHex, glass: o.glass })); }
  if (doorOn) {
    const dw = o.doorW || 2.2;
    box(dw + .5, 2.7, .3, trimM, { parent: g, y: .3, z: d / 2 - .05 });
    box(dw, 2.4, .1, o.doorGlass === false ? M.dark : M.glass, { parent: g, y: .32, z: d / 2 + .08 });
    box(.05, 2.4, .12, trimM, { parent: g, y: .32, z: d / 2 + .1 });
    if (o.canopy !== false) { box(dw + 1.6, .16, 1.4, trimM, { parent: g, y: 3, z: d / 2 + .7 }); }
    box(dw + 1.2, .3, 1.4, M.concrete, { parent: g, y: 0, z: d / 2 + .7 });   // step
  }
  const roof = o.roof || 'flat', topY = .3 + H;
  if (roof === 'flat') {
    box(w + .2, .5, .25, trimM, { parent: g, y: topY, z: d / 2 - .02 });
    box(w + .2, .5, .25, trimM, { parent: g, y: topY, z: -d / 2 + .02 });
    box(.25, .5, d, trimM, { parent: g, y: topY, x: w / 2 - .02 });
    box(.25, .5, d, trimM, { parent: g, y: topY, x: -w / 2 + .02 });
    box(w - .3, .05, d - .3, M.std('#BFBAB2', { rough: 1 }), { parent: g, y: topY });
    if (o.roofUnits !== false) roofUnits(g, { w, d, y: topY, seed: o.seed || w * 7 + d });
  } else if (roof === 'gable') {
    const rh = o.roofH || Math.min(w, d) * .32, overhang = .5, rm = M.std(o.roofColor || PALETTE.terracotta, { rough: .8, map: 'roof' });
    const along = w >= d; const L = (along ? w : d) + overhang * 2, S = (along ? d : w) / 2 + overhang;
    const pitch = Math.atan2(rh, S - overhang), slab = Math.hypot(S, rh * S / (S - overhang));
    [-1, 1].forEach(s => {
      const geo = new THREE.BoxGeometry(along ? L : .22, .22, along ? slab : L);
      const m2 = mesh(geo, rm, { parent: g });
      if (along) { m2.rotation.x = s * pitch; m2.position.set(0, topY + rh / 2 + .05, -s * Math.cos(pitch) * slab / 2 * .98); }
      else { m2.rotation.z = -s * pitch; m2.position.set(-s * Math.cos(pitch) * slab / 2 * .98, topY + rh / 2 + .05, 0); }
    });
    // gable ends
    const tri = along ? [[-d / 2, 0], [d / 2, 0], [0, rh]] : [[-w / 2, 0], [w / 2, 0], [0, rh]];
    [-1, 1].forEach(s => {
      const sh = new THREE.Shape(tri.map(([a, b]) => new THREE.Vector2(a, b)));
      const geo = new THREE.ExtrudeGeometry(sh, { depth: .2, bevelEnabled: false });
      const m3 = mesh(geo, wallM, { parent: g });
      if (along) { m3.rotation.y = Math.PI / 2; m3.position.set(s * (w / 2) - (s > 0 ? .2 : 0), topY, 0); }
      else { m3.position.set(0, topY, s * (d / 2) - (s > 0 ? .2 : 0)); }
    });
  }
  g.userData.height = topY + (roof === 'gable' ? (o.roofH || Math.min(w, d) * .32) : .5);
  return place(g, o);
}
// AC units, vents and a water tank on a flat roof
export function roofUnits(g, { w, d, y, seed = 1 }) {
  if (Q === 'low') return;
  const R = rng(seed), n = Math.max(1, Math.floor(w * d / 90));
  for (let i = 0; i < n; i++) {
    const x = R.range(-w / 2 + 2, w / 2 - 2), z = R.range(-d / 2 + 2, d / 2 - 2);
    if (R() < .6) { rbox(1.4, .9, 1, .05, M.std('#E2E2DE', { rough: .5 }), { parent: g, x, y, z }); cyl(.32, .32, .05, M.dark, { parent: g, x, y: y + .9, z }); }
    else { cyl(.6, .6, 1.4, M.std('#D9D5CC', { rough: .7 }), { parent: g, x, y, z }); }
  }
}

/* ------------------------------------------------------------------ fences & rails */
export function fence(group, pts, { h = 1.1, post = 2.5, color = '#E9E6E0', solid = false } = {}) {
  const pm = M.std(color, { rough: .6 });
  for (let i = 0; i < pts.length - 1; i++) {
    const [ax, az] = pts[i], [bx, bz] = pts[i + 1], L = Math.hypot(bx - ax, bz - az), ry = Math.atan2(bx - ax, bz - az) - Math.PI / 2;
    const n = Math.max(1, Math.round(L / post));
    for (let k = 0; k <= n; k++) { if (k === n && i < pts.length - 2) continue; cyl(.05, .05, h, pm, { parent: group, x: ax + (bx - ax) * k / n, z: az + (bz - az) * k / n, seg: 6 }); }
    const mx = (ax + bx) / 2, mz = (az + bz) / 2;
    if (solid) box(L, h * .9, .06, pm, { parent: group, x: mx, z: mz, ry });
    else [h * .45, h * .95].forEach(y => box(L, .06, .05, pm, { parent: group, x: mx, y, z: mz, ry }));
  }
}

/* ------------------------------------------------------------------ pooled nature & street furniture */
const POOLS = { tree: [], cone: [], palm: [], bush: [], lamp: [], bench: [] };
const R0 = rng(77);
export function tree(x, z, { s = 1, kind = 'round', tint = 0 } = {}) { POOLS[kind === 'cone' ? 'cone' : kind === 'palm' ? 'palm' : 'tree'].push({ x, z, s: s * R0.range(.85, 1.15), ry: R0() * 6.28, tint: tint || R0.range(-.08, .08) }); }
export function bush(x, z, { s = 1 } = {}) { POOLS.bush.push({ x, z, s: s * R0.range(.8, 1.2), ry: R0() * 6.28, tint: R0.range(-.06, .06) }); }
export function lamp(x, z, { ry = 0, h = 5 } = {}) { POOLS.lamp.push({ x, z, ry, s: h / 5 }); }
export function bench(x, z, { ry = 0 } = {}) { POOLS.bench.push({ x, z, ry, s: 1 }); }
export const poolCounts = () => Object.fromEntries(Object.entries(POOLS).map(([k, v]) => [k, v.length]));

function partsTree() {
  const trunk = new THREE.CylinderGeometry(.16, .24, 2.2, 7); trunk.translate(0, 1.1, 0);
  const crowns = [];
  const add = (r, x, y, z) => { const s = new THREE.IcosahedronGeometry(r, 1); s.translate(x, y, z); crowns.push(s); };
  add(1.6, 0, 3.4, 0); add(1.15, .9, 3.0, .3); add(1.1, -.8, 3.1, -.4); add(1.0, .1, 4.4, -.2);
  return [{ geo: trunk, mat: M.std('#7A5A40', { rough: 1, map: null }) }, { geo: mergeGeometries(crowns.map(c => c.toNonIndexed())), mat: M.std('#6DAA45', { rough: .95, map: null, flat: Q !== 'low' }), tint: true }];
}
function partsCone() {
  const trunk = new THREE.CylinderGeometry(.13, .18, 1.2, 6); trunk.translate(0, .6, 0);
  const c = [new THREE.ConeGeometry(1.5, 2.6, 9).translate(0, 2.2, 0), new THREE.ConeGeometry(1.15, 2.2, 9).translate(0, 3.4, 0), new THREE.ConeGeometry(.8, 1.8, 9).translate(0, 4.5, 0)];
  return [{ geo: trunk, mat: M.std('#6B4E37', { rough: 1, map: null }) }, { geo: mergeGeometries(c.map(x => x.toNonIndexed())), mat: M.std('#4E8F45', { rough: .95, map: null, flat: true }), tint: true }];
}
function partsPalm() {
  const trunk = new THREE.CylinderGeometry(.12, .2, 5, 7); trunk.translate(0, 2.5, 0);
  const leaves = [];
  for (let i = 0; i < 7; i++) { const l = new THREE.BoxGeometry(.5, .06, 2.4); l.translate(0, 0, 1.2); l.rotateX(.45); l.rotateY(i / 7 * Math.PI * 2); l.translate(0, 5, 0); leaves.push(l); }
  return [{ geo: trunk, mat: M.std('#9A7B55', { rough: 1, map: null }) }, { geo: mergeGeometries(leaves.map(x => x.toNonIndexed())), mat: M.std('#5E9E3E', { rough: .9, map: null, side: THREE.DoubleSide }), tint: true }];
}
function partsBush() {
  const s = [new THREE.IcosahedronGeometry(.7, 1).translate(0, .5, 0), new THREE.IcosahedronGeometry(.55, 1).translate(.5, .4, .2), new THREE.IcosahedronGeometry(.5, 1).translate(-.45, .38, -.15)];
  return [{ geo: mergeGeometries(s.map(x => x.toNonIndexed())), mat: M.std('#5E9B3C', { rough: 1, map: null, flat: true }), tint: true }];
}
function partsLamp() {
  const pole = new THREE.CylinderGeometry(.06, .09, 5, 8); pole.translate(0, 2.5, 0);
  const arm = new THREE.BoxGeometry(.08, .08, 1.1); arm.translate(0, 4.95, .5);
  const head = new THREE.BoxGeometry(.32, .12, .55); head.translate(0, 4.9, 1.0);
  const base = new THREE.CylinderGeometry(.16, .2, .4, 8); base.translate(0, .2, 0);
  return [{ geo: mergeGeometries([pole, arm, head, base].map(x => x.toNonIndexed())), mat: M.std('#4A4F57', { rough: .4, metal: .6, map: null }) }];
}
function partsBench() {
  const parts = [];
  for (let i = 0; i < 3; i++) parts.push(new THREE.BoxGeometry(1.8, .05, .12).translate(0, .45, -.18 + i * .16));
  for (let i = 0; i < 2; i++) parts.push(new THREE.BoxGeometry(1.8, .12, .04).translate(0, .62 + i * .16, -.27).rotateX(0));
  const legs = [-.75, .75].map(x => new THREE.BoxGeometry(.06, .45, .5).translate(x, .225, -.05));
  return [{ geo: mergeGeometries(parts.map(x => x.toNonIndexed())), mat: M.std('#B98A5E', { map: null, rough: .8 }) }, { geo: mergeGeometries(legs.map(x => x.toNonIndexed())), mat: M.std('#3E434A', { map: null, rough: .5, metal: .5 }) }];
}
export function flushPools(scene) {
  const makers = { tree: partsTree, cone: partsCone, palm: partsPalm, bush: partsBush, lamp: partsLamp, bench: partsBench };
  const out = new THREE.Group(); out.name = 'pools';
  const m4 = new THREE.Matrix4(), q = new THREE.Quaternion(), e = new THREE.Euler(), s = new THREE.Vector3(), p = new THREE.Vector3(), c = new THREE.Color();
  for (const [kind, list] of Object.entries(POOLS)) {
    if (!list.length) continue;
    for (const part of makers[kind]()) {
      const mat = part.tint ? part.mat.clone() : part.mat, base = part.mat.color.clone();
      const im = new THREE.InstancedMesh(part.geo, mat, list.length);
      list.forEach((it, i) => {
        q.setFromEuler(e.set(0, it.ry, 0)); m4.compose(p.set(it.x, it.y || 0, it.z), q, s.set(it.s, it.s, it.s)); im.setMatrixAt(i, m4);
        if (part.tint) { c.copy(base).offsetHSL(it.tint * .3, 0, it.tint); im.setColorAt(i, c); }
      });
      if (part.tint) mat.color.set('#ffffff');
      im.castShadow = true; im.receiveShadow = true; im.computeBoundingSphere();
      out.add(im);
    }
    list.length = 0;
  }
  scene.add(out); return out;
}
// lamp heads light up as small emissive squares (separate so they can glow)
export function lampHeads() { return POOLS.lamp; }

/* ------------------------------------------------------------------ people */
const SKIN = ['#8D5A3B', '#A86B47', '#C68A62', '#E0B08A', '#6E4530'], HAIR = ['#1B1512', '#2E221B', '#4A3426', '#141414'];
export function person(o = {}) {
  const R = rng(o.seed || Math.floor(Math.random() * 1e6)), g = new THREE.Group();
  const skin = M.std(o.skin || R.pick(SKIN), { rough: .7, map: null }), shirt = M.std(o.shirt || R.pick(['#3B6EA5', '#E07A2E', '#F2F2F2', '#2FA84F', '#D6336C', '#7C5CFF', '#F2B705', '#14B8A6']), { rough: .9, map: null });
  const pants = M.std(o.pants || R.pick(['#2B3442', '#3A3A3A', '#6B5B4A', '#1F2A44']), { rough: .9, map: null }), hair = M.std(R.pick(HAIR), { rough: .9, map: null });
  const sit = o.pose === 'sit', h = o.h || R.range(1.62, 1.82), k = h / 1.75;
  const legH = .82 * k, torsoH = .58 * k;
  if (sit) {
    [-1, 1].forEach(s => { rbox(.15 * k, .15 * k, .45 * k, .05, pants, { parent: g, x: s * .1 * k, y: .42, z: .2 * k }); rbox(.14 * k, .42, .15 * k, .05, pants, { parent: g, x: s * .1 * k, y: 0, z: .42 * k }); });
  } else [-1, 1].forEach(s => rbox(.15 * k, legH, .17 * k, .06, pants, { parent: g, x: s * .1 * k, y: 0 }));
  const hipY = sit ? .45 : legH;
  rbox(.42 * k, torsoH, .24 * k, .09, shirt, { parent: g, y: hipY });
  [-1, 1].forEach(s => rbox(.11 * k, .55 * k, .12 * k, .05, shirt, { parent: g, x: s * .27 * k, y: hipY + torsoH - .58 * k, rz: s * .06 }));
  sphere(.06 * k, skin, { parent: g, x: .27 * k, y: hipY + torsoH - .66 * k }); sphere(.06 * k, skin, { parent: g, x: -.27 * k, y: hipY + torsoH - .66 * k });
  cyl(.05 * k, .06 * k, .08 * k, skin, { parent: g, y: hipY + torsoH });
  const head = sphere(.115 * k, skin, { parent: g, y: hipY + torsoH + .06 * k }); head.scale.set(1, 1.12, 1.05);
  const hr = sphere(.122 * k, hair, { parent: g, y: hipY + torsoH + .1 * k, seg: 12, seg2: 8 }); hr.scale.set(1.02, .75, 1.05);
  g.userData.height = hipY + torsoH + .32 * k;
  return place(g, o);
}

/* ------------------------------------------------------------------ vehicles (face +z, base at y) */
function wheelSet(g, positions, r, w, spin) {
  const tyre = M.rubber, hub = M.std('#C9CDD3', { rough: .3, metal: .8, map: null });
  for (const [x, z] of positions) {
    const wg = new THREE.Group(); wg.position.set(x, r, z); g.add(wg);
    const t = new THREE.Mesh(new THREE.CylinderGeometry(r, r, w, Q === 'low' ? 12 : 20), tyre); t.rotation.z = Math.PI / 2; wg.add(t);
    const hb = new THREE.Mesh(new THREE.CylinderGeometry(r * .55, r * .55, w + .02, 12), hub); hb.rotation.z = Math.PI / 2; wg.add(hb);
    spin.push(wg);
  }
}
/* bus: { kind: 'school'|'coach'|'city', color, stripe, text, length=11.5, premium } */
export function bus(o = {}) {
  const g = new THREE.Group(), L = o.length || 11.5, W = 2.5, H = 3.1;
  const kind = o.kind || 'coach', col = o.color || (kind === 'school' ? '#F2B705' : '#F4F4F2');
  const body = M.carPaint(col), glass = M.std('#24313D', { rough: .08, metal: .5, map: null }), trim = M.std('#2A2D33', { rough: .5, map: null });
  rbox(W, H - .45, L, .32, body, { parent: g, y: .45 });
  box(W - .3, .25, L - .6, trim, { parent: g, y: .3 });                                                   // skirt
  // window band both sides
  [-1, 1].forEach(s => box(.04, 1.05, L - 2.6, glass, { parent: g, x: s * (W / 2 + .005), y: 1.75, z: -.5 }));
  // windscreen + rear window
  box(W - .3, 1.35, .05, glass, { parent: g, y: 1.45, z: L / 2 + .005 });
  box(W - .5, .8, .05, glass, { parent: g, y: 1.9, z: -L / 2 - .005 });
  // door (right side, +x... buses in India drive on the left: door on the left/-x)
  box(.05, 2.1, 1.1, glass, { parent: g, x: -W / 2 - .01, y: .55, z: L / 2 - 1.6 });
  if (o.stripe || kind !== 'school') [-1, 1].forEach(s => box(.03, .2, L - .8, M.std(o.stripe || '#FF6A2B', { map: null, rough: .5 }), { parent: g, x: s * (W / 2 + .01), y: 1.15 }));
  if (kind === 'school') [-1, 1].forEach(s => box(.03, .08, L - .8, M.std('#1F2328', { map: null }), { parent: g, x: s * (W / 2 + .01), y: 1.3 }));
  // destination board + headlights + bumper
  const dest = label([{ text: o.text || (kind === 'school' ? 'SCHOOL BUS' : 'HIMANSHU TRAVEL LINE'), size: .2, color: '#FFB21A', weight: 800 }], { w: 1.9, h: .3, bg: '#111418', parent: g, y: 2.55, z: L / 2 + .03 });
  void dest;
  [-1, 1].forEach(s => { rbox(.42, .2, .06, .04, M.emit('#FFF6D8', 1), { parent: g, x: s * .85, y: .75, z: L / 2 + .02 }); rbox(.3, .18, .06, .04, M.emit('#E8342A', 1), { parent: g, x: s * .95, y: .8, z: -L / 2 - .02 }); });
  box(W + .04, .28, .18, trim, { parent: g, y: .38, z: L / 2 - .05 }); box(W + .04, .28, .18, trim, { parent: g, y: .38, z: -L / 2 + .05 });
  // mirrors
  [-1, 1].forEach(s => { box(.05, .05, .5, trim, { parent: g, x: s * 1.35, y: 2.3, z: L / 2 - .15, ry: s * .3 }); rbox(.12, .4, .22, .03, trim, { parent: g, x: s * 1.55, y: 1.9, z: L / 2 + .05 }); });
  // roof AC + hatch
  if (kind !== 'school') rbox(1.5, .3, 2.6, .12, M.std('#E8E8E6', { rough: .5, map: null }), { parent: g, y: H, z: -1 });
  if (o.premium) box(.03, .32, 2.2, M.std('#C9A227', { map: null, rough: .3, metal: .7 }), { parent: g, x: W / 2 + .02, y: 2.5, z: 0 });
  const spin = []; wheelSet(g, [[-1.08, L / 2 - 2.2], [1.08, L / 2 - 2.2], [-1.08, -L / 2 + 2.6], [1.08, -L / 2 + 2.6]], .5, .32, spin);
  g.userData.wheels = spin; g.userData.size = [W, H, L];
  return place(g, o);
}
export function car(o = {}) {
  const g = new THREE.Group(), col = o.color || rng(o.seed || 3).pick(['#E5E5E2', '#2B2F36', '#B83A2E', '#3A6EA5', '#C9CED6', '#E9B44C', '#3C7A5A']);
  const body = M.carPaint(col), glass = M.std('#26323E', { rough: .06, metal: .5, map: null });
  rbox(1.8, .75, 4.4, .25, body, { parent: g, y: .32 });
  rbox(1.6, .62, 2.3, .26, glass, { parent: g, y: .95, z: -.25 });
  rbox(1.64, .1, 2.0, .05, body, { parent: g, y: 1.53, z: -.3 });
  [-1, 1].forEach(s => { rbox(.38, .14, .05, .04, M.emit('#FFF6D8', 1), { parent: g, x: s * .6, y: .78, z: 2.2 }); rbox(.36, .12, .05, .04, M.emit('#D92B22', 1), { parent: g, x: s * .62, y: .82, z: -2.21 }); });
  const spin = []; wheelSet(g, [[-.82, 1.35], [.82, 1.35], [-.82, -1.35], [.82, -1.35]], .34, .24, spin);
  g.userData.wheels = spin; g.userData.size = [1.8, 1.55, 4.4];
  return place(g, o);
}
export function van(o = {}) {
  const g = new THREE.Group(), col = o.color || '#F4F4F2', body = M.carPaint(col), glass = M.std('#26323E', { rough: .06, metal: .5, map: null });
  rbox(1.95, 2.0, 3.4, .14, body, { parent: g, y: .4, z: -.7 });                          // box
  rbox(1.95, 1.4, 1.7, .25, body, { parent: g, y: .4, z: 1.7 });                           // cab
  rbox(1.75, .65, .08, .06, glass, { parent: g, y: 1.1, z: 2.56 });
  [-1, 1].forEach(s => box(.03, .5, .8, glass, { parent: g, x: s * .99, y: 1.2, z: 1.8 }));
  if (o.stripe) [-1, 1].forEach(s => box(.03, .5, 3.3, M.std(o.stripe, { map: null }), { parent: g, x: s * .99, y: 1.0, z: -.7 }));
  if (o.text) [-1, 1].forEach(s => label([{ text: o.text, size: .32, weight: 800, color: o.textColor || '#1F2328' }], { w: 3, h: .6, parent: g, x: s * 1.0, y: 1.6, z: -.7, ry: s * Math.PI / 2 }));
  const spin = []; wheelSet(g, [[-.88, 1.6], [.88, 1.6], [-.88, -1.5], [.88, -1.5]], .38, .26, spin);
  g.userData.wheels = spin; g.userData.size = [1.95, 2.4, 4.9];
  return place(g, o);
}
export function scooter(o = {}) {
  const g = new THREE.Group(), col = M.carPaint(o.color || '#7DB928'), dark = M.std('#24272C', { map: null, rough: .5 });
  rbox(.36, .35, 1.2, .12, col, { parent: g, y: .3 });
  rbox(.3, .12, .55, .05, dark, { parent: g, y: .7, z: -.15 });                              // seat
  box(.06, .7, .06, dark, { parent: g, y: .5, z: .55, rx: -.25 });
  box(.6, .05, .05, dark, { parent: g, y: 1.15, z: .68 });
  if (o.box !== false) rbox(.46, .42, .42, .04, M.std(o.boxColor || '#7DB928', { map: null, rough: .6 }), { parent: g, y: .78, z: -.45 });
  const spin = []; wheelSet(g, [[0, .55], [0, -.5]], .22, .1, spin);
  g.userData.wheels = spin; return place(g, o);
}

/* ------------------------------------------------------------------ baking */
// merge every static mesh under `root` into one mesh per material. Keeps userData.dynamic subtrees and labels intact.
export function bake(root) {
  root.updateMatrixWorld(true);
  const inv = new THREE.Matrix4().copy(root.matrixWorld).invert();
  const byMat = new Map(), keep = [];
  root.traverse(o => {
    if (o === root) return;
    let p = o, dyn = false; while (p && p !== root) { if (p.userData.dynamic) { dyn = true; break; } p = p.parent; }
    if (dyn) return;
    if (!o.isMesh || o.isInstancedMesh || o.isSkinnedMesh || Array.isArray(o.material)) return;
    let g = o.geometry.index ? o.geometry.toNonIndexed() : o.geometry.clone();
    for (const k of Object.keys(g.attributes)) if (!['position', 'normal', 'uv'].includes(k)) g.deleteAttribute(k);
    if (!g.attributes.uv) g.setAttribute('uv', new THREE.BufferAttribute(new Float32Array(g.attributes.position.count * 2), 2));
    if (!g.attributes.normal) g.computeVertexNormals();
    g.applyMatrix4(new THREE.Matrix4().multiplyMatrices(inv, o.matrixWorld));
    const key = o.material.uuid + (o.castShadow ? 'c' : 'n');
    if (!byMat.has(key)) byMat.set(key, { mat: o.material, cast: o.castShadow, geos: [] });
    byMat.get(key).geos.push(g); keep.push(o);
  });
  keep.forEach(o => o.parent && o.parent.remove(o));
  // drop now-empty groups (not dynamic ones)
  const empty = []; root.traverse(o => { if (o !== root && o.isGroup && !o.userData.dynamic && o.children.length === 0) empty.push(o); });
  empty.forEach(o => o.parent && o.parent.remove(o));
  for (const { mat, cast, geos } of byMat.values()) {
    const merged = mergeGeometries(geos, false); geos.forEach(x => x.dispose());
    if (!merged) continue;
    merged.computeBoundingSphere();
    const m = new THREE.Mesh(merged, mat); m.castShadow = cast; m.receiveShadow = true; m.userData.baked = true;
    root.add(m);
  }
  return root;
}
export function stats(obj) {
  let calls = 0, tris = 0;
  obj.traverse(o => {
    if (!o.isMesh) return; calls++;
    const g = o.geometry, n = g.index ? g.index.count / 3 : g.attributes.position.count / 3;
    tris += n * (o.isInstancedMesh ? o.count : 1);
  });
  return { calls, tris: Math.round(tris) };
}
