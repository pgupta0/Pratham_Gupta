/* The Route — Pratham Gupta's journey as a night drive through the city.
   One loop: GSAP's ticker drives Lenis smooth scroll and the three.js render.
   Scroll picks the stop; a damped camera follows an original street-racing car
   along an elevated neon highway, with a cinematic shot at every stop. */
import * as THREE from 'three';
import { EffectComposer } from 'three/addons/postprocessing/EffectComposer.js';
import { RenderPass } from 'three/addons/postprocessing/RenderPass.js';
import { UnrealBloomPass } from 'three/addons/postprocessing/UnrealBloomPass.js';
import { OutputPass } from 'three/addons/postprocessing/OutputPass.js';
import { ShaderPass } from 'three/addons/postprocessing/ShaderPass.js';
import { RoomEnvironment } from 'three/addons/environments/RoomEnvironment.js';

const gsap = window.gsap, ScrollTrigger = window.ScrollTrigger;
const RM = matchMedia('(prefers-reduced-motion: reduce)').matches;
const FINE = matchMedia('(pointer: fine)').matches;
const isMobile = () => innerWidth <= 900;
const $ = s => document.querySelector(s), $$ = s => [...document.querySelectorAll(s)];
const clamp = (v, a = 0, b = 1) => Math.min(b, Math.max(a, v));
const lerp = (a, b, t) => a + (b - a) * t;
const ease = u => (u < .5 ? 4 * u * u * u : 1 - Math.pow(-2 * u + 2, 3) / 2);
const smooth = (a, b, v) => { const t = clamp((v - a) / (b - a)); return t * t * (3 - 2 * t); };

window.lucide && window.lucide.createIcons();
gsap.registerPlugin(ScrollTrigger);
ScrollTrigger.config({ ignoreMobileResize: true });

/* ---------------- smooth scroll ---------------- */
let lenis = null;
if (!RM && window.Lenis) {
  lenis = new window.Lenis({ lerp: 0.085, smoothWheel: true });
  lenis.on('scroll', ScrollTrigger.update);
}
window.__lenis = lenis;
function scrollToY(y) { lenis ? lenis.scrollTo(y, { duration: 1.6 }) : scrollTo({ top: y, behavior: RM ? 'auto' : 'smooth' }); }
document.addEventListener('click', e => {
  const a = e.target.closest('a[href^="#"]'); if (!a) return;
  const el = document.querySelector(a.getAttribute('href')); if (!el) return;
  e.preventDefault(); scrollToY(el.getBoundingClientRect().top + scrollY);
});

/* ---------------- the stops ---------------- */
const STOP_NAMES = ['Delhi Technological University', 'Himanshu Travel Line', 'Lean Six Sigma', 'BITSoM', 'BigBasket', 'Building with AI', 'Next stop'];
const ACC_HEX = ['#FF8A3D', '#FFC23D', '#6BE675', '#FF4F7B', '#9B7BFF', '#3DA9FF', '#2EF2C3'];
const N = ACC_HEX.length;
const ACC = ACC_HEX.map(c => new THREE.Color(c));
const C_INK = new THREE.Color('#070503'), C_JAM = new THREE.Color('#FF2A1F'), C_LAMP = new THREE.Color('#FFB257');
const UP = new THREE.Vector3(0, 1, 0);
const ROAD_W = 3.8, GROUND = -6;

const canvas = $('#gl');
let gl = null;
try { gl = buildScene(); } catch (err) { console.warn('WebGL off:', err); canvas.style.display = 'none'; }

function glowTexture() {
  const c = document.createElement('canvas'); c.width = c.height = 64;
  const g = c.getContext('2d'), r = g.createRadialGradient(32, 32, 0, 32, 32, 32);
  r.addColorStop(0, 'rgba(255,255,255,1)'); r.addColorStop(.22, 'rgba(255,255,255,.7)'); r.addColorStop(1, 'rgba(255,255,255,0)');
  g.fillStyle = r; g.fillRect(0, 0, 64, 64);
  const t = new THREE.CanvasTexture(c); t.colorSpace = THREE.SRGBColorSpace; return t;
}

/* An original low-slung street-racing coupe, built from simple shapes. */
function buildCar() {
  const car = new THREE.Group(), body = new THREE.Group();
  const paint = new THREE.MeshPhysicalMaterial({ color: '#D9440F', metalness: .45, roughness: .32, clearcoat: 1, clearcoatRoughness: .06 });
  const carbon = new THREE.MeshPhysicalMaterial({ color: '#0c0c0e', metalness: .5, roughness: .35, clearcoat: .6 });
  const glass = new THREE.MeshPhysicalMaterial({ color: '#05070a', metalness: .9, roughness: .05, clearcoat: 1 });
  const extrude = (pts, depth, mat, bevel = .06) => {
    const sh = new THREE.Shape(pts.map(([x, y]) => new THREE.Vector2(x, y)));
    const g = new THREE.ExtrudeGeometry(sh, { depth, bevelEnabled: true, bevelThickness: bevel, bevelSize: bevel * .8, bevelSegments: 4, curveSegments: 8 });
    g.translate(0, 0, -depth / 2); return new THREE.Mesh(g, mat);
  };
  // side profile (x = length, y = height), wedge nose, long hood, short tail
  body.add(extrude([[2.15, .26], [2.12, .44], [1.7, .55], [.85, .64], [-1.55, .7], [-2.02, .72], [-2.12, .52], [-2.1, .26], [-1.9, .16], [1.95, .16]], 1.72, paint, .09));
  body.add(extrude([[.95, .62], [.38, .98], [-.62, 1.02], [-1.45, .72], [-1.5, .66], [.95, .62]], 1.36, glass, .07));
  // stripe over hood and roof
  const stripe = extrude([[2.05, .5], [1.6, .6], [.88, .67], [.4, 1.02], [-.6, 1.06], [-1.45, .76], [-2.0, .76], [-2.0, .7], [-1.45, .7], [-.6, 1.0], [.38, .96], [.86, .61], [1.6, .54], [2.05, .44]], .26, new THREE.MeshPhysicalMaterial({ color: '#111114', metalness: .3, roughness: .3, clearcoat: 1 }), .02);
  stripe.position.y = .02; body.add(stripe);
  // rear wing
  const wing = new THREE.Mesh(new THREE.BoxGeometry(.42, .05, 1.78), carbon); wing.position.set(-1.92, 1.02, 0);
  [-.55, .55].forEach(z => { const st = new THREE.Mesh(new THREE.BoxGeometry(.08, .28, .05), carbon); st.position.set(-1.9, .86, z); body.add(st); });
  // front splitter + side skirts
  const split = new THREE.Mesh(new THREE.BoxGeometry(.3, .04, 1.84), carbon); split.position.set(2.08, .18, 0);
  [-.9, .9].forEach(z => { const sk = new THREE.Mesh(new THREE.BoxGeometry(2.6, .1, .06), carbon); sk.position.set(0, .22, z); body.add(sk); });
  body.add(wing, split);
  // wheels
  const tyre = new THREE.MeshStandardMaterial({ color: '#0a0a0b', roughness: .9 });
  const rim = new THREE.MeshPhysicalMaterial({ color: '#d7d9de', metalness: 1, roughness: .2 });
  const wheels = [];
  [[1.32, .86], [1.32, -.86], [-1.38, .86], [-1.38, -.86]].forEach(([x, z]) => {
    const w = new THREE.Group();
    const t = new THREE.Mesh(new THREE.CylinderGeometry(.36, .36, .3, 24), tyre); t.rotation.x = Math.PI / 2;
    const r = new THREE.Mesh(new THREE.CylinderGeometry(.24, .24, .32, 10), rim); r.rotation.x = Math.PI / 2;
    w.add(t, r); w.position.set(x, .36, z); body.add(w); wheels.push(w);
  });
  // lights
  const head = new THREE.MeshBasicMaterial({ color: new THREE.Color('#ffffff').multiplyScalar(3) });
  [-.58, .58].forEach(z => { const h = new THREE.Mesh(new THREE.BoxGeometry(.06, .07, .46), head); h.position.set(2.13, .45, z); body.add(h); });
  const tailMat = new THREE.MeshBasicMaterial({ color: new THREE.Color('#ff1a12').multiplyScalar(3) });
  const tail = new THREE.Mesh(new THREE.BoxGeometry(.05, .06, 1.6), tailMat); tail.position.set(-2.13, .6, 0); body.add(tail);
  body.rotation.y = -Math.PI / 2; // length along +z, so lookAt() points the nose forward
  body.scale.setScalar(.6);
  car.add(body);
  return { car, body, wheels, paint };
}

function buildScene() {
  const mobile = isMobile();
  const renderer = new THREE.WebGLRenderer({ canvas, antialias: !mobile, powerPreference: 'high-performance' });
  renderer.setPixelRatio(Math.min(devicePixelRatio, mobile ? 1.5 : 1.75));
  renderer.setSize(innerWidth, innerHeight, false);
  renderer.setClearColor(C_INK);
  renderer.toneMapping = THREE.ACESFilmicToneMapping;
  renderer.toneMappingExposure = 1.05;

  const scene = new THREE.Scene();
  scene.fog = new THREE.FogExp2('#160d07', 0.0135);
  const camera = new THREE.PerspectiveCamera(46, innerWidth / innerHeight, 0.1, 900);
  const sprite = glowTexture();
  const pmrem = new THREE.PMREMGenerator(renderer);
  scene.environment = pmrem.fromScene(new RoomEnvironment(), .04).texture;

  /* ---- sky: amber haze on the horizon, the colour of sodium streetlights ---- */
  const sky = new THREE.Mesh(new THREE.SphereGeometry(700, 32, 16), new THREE.ShaderMaterial({
    side: THREE.BackSide, depthWrite: false, fog: false,
    uniforms: { uTop: { value: new THREE.Color('#06050a') }, uHor: { value: new THREE.Color('#7a3a10') }, uLow: { value: new THREE.Color('#120a05') } },
    vertexShader: 'varying vec3 vP; void main(){ vP = position; gl_Position = projectionMatrix * modelViewMatrix * vec4(position,1.0); }',
    fragmentShader: `uniform vec3 uTop,uHor,uLow; varying vec3 vP;
      void main(){ float h = normalize(vP).y;
        vec3 c = mix(uHor, uTop, smoothstep(0.0, 0.42, h));
        c = mix(uLow, c, smoothstep(-0.12, 0.0, h));
        c += uHor * 0.35 * exp(-pow(h / 0.035, 2.0));
        gl_FragColor = vec4(c, 1.0);
        #include <tonemapping_fragment>
        #include <colorspace_fragment>
      }`
  }));
  scene.add(sky);

  /* ---- the route ---- */
  const STOPS = [
    new THREE.Vector3(-8, 0, 4), new THREE.Vector3(9, 1, -20), new THREE.Vector3(-7, 2, -44), new THREE.Vector3(8, 2.6, -68),
    new THREE.Vector3(-6, 3.2, -92), new THREE.Vector3(7, 4, -116), new THREE.Vector3(-2, 5.4, -140)
  ];
  const ctrl = [new THREE.Vector3(5, -.4, 30), new THREE.Vector3(-3, -.2, 16)];
  STOPS.forEach((p, i) => {
    ctrl.push(p);
    const nx = STOPS[i + 1]; if (!nx) return;
    const side = i % 2 ? -1 : 1;
    ctrl.push(new THREE.Vector3(p.x + side * -4, lerp(p.y, nx.y, .3), lerp(p.z, nx.z, .28)));
    ctrl.push(new THREE.Vector3(nx.x + side * -6, lerp(p.y, nx.y, .7), lerp(p.z, nx.z, .7)));
  });
  ctrl.push(new THREE.Vector3(6, 6.2, -154), new THREE.Vector3(12, 6.6, -168));
  const curve = new THREE.CatmullRomCurve3(ctrl, false, 'centripetal');
  const SAMPLES = 3000, samples = [];
  for (let i = 0; i <= SAMPLES; i++) samples.push(curve.getPointAt(i / SAMPLES));
  const nearestT = v => { let b = 0, bd = Infinity; samples.forEach((p, i) => { const d = p.distanceToSquared(v); if (d < bd) { bd = d; b = i; } }); return b / SAMPLES; };
  const stopT = STOPS.map(nearestT);
  const sideAt = (t, out = new THREE.Vector3()) => out.crossVectors(curve.getTangentAt(clamp(t, 0, 1)), UP).normalize();
  const palAt = (x, out) => { out.copy(ACC[0]); for (let i = 0; i < N - 1; i++) out.lerp(ACC[i + 1], smooth(stopT[i], stopT[i + 1], x)); return out; };

  /* ---- road + guardrails: one shader paints asphalt, wet reflections, lane lines and the neon edge ---- */
  const LAMPS = 70;
  const roadVert = `
    #include <fog_pars_vertex>
    varying vec2 vUv;
    void main(){ vUv = uv; vec4 mvPosition = modelViewMatrix * vec4(position, 1.0); gl_Position = projectionMatrix * mvPosition;
      #include <fog_vertex>
    }`;
  const roadFrag = `
    #include <fog_pars_fragment>
    #define NS ${N}
    uniform float uProgress, uTime, uReveal, uCarU, uMode;
    uniform vec3 uCols[NS]; uniform float uStops[NS];
    varying vec2 vUv;
    vec3 pal(float x){ vec3 c = uCols[0]; for(int i = 0; i < NS - 1; i++) c = mix(c, uCols[i+1], smoothstep(uStops[i], uStops[i+1], x)); return c; }
    float hash(vec2 p){ return fract(sin(dot(p, vec2(127.1, 311.7))) * 43758.5453); }
    void main(){
      float x = vUv.x, y = vUv.y;
      if (x > uReveal) discard;
      float done = 1.0 - smoothstep(uProgress - 0.002, uProgress, x);
      vec3 col = pal(x);
      float flow = pow(0.5 + 0.5 * sin(x * 230.0 - uTime * 6.0), 14.0);
      float head = exp(-pow((x - uProgress) / 0.006, 2.0));
      vec3 lit = col * (1.4 + flow * 1.6) + vec3(1.0) * head * 2.2;
      vec3 c;
      if (uMode < 0.5) {
        float n = hash(floor(vec2(x * 5000.0, y * 50.0)));
        vec3 asphalt = vec3(0.03, 0.026, 0.026) * (0.75 + 0.5 * n);
        float lamp = exp(-pow((fract(x * ${LAMPS}.0) - 0.5) * 5.0, 2.0));
        asphalt += vec3(1.0, 0.55, 0.2) * lamp * 0.12 * (0.7 + 0.3 * sin(y * 40.0 + x * 1500.0));   // wet road
        asphalt += col * done * 0.05;
        float ahead = exp(-pow((x - uCarU - 0.0075) / 0.006, 2.0)) * exp(-pow((y - 0.5) / 0.26, 2.0));
        float behind = exp(-pow((x - uCarU + 0.002) / 0.003, 2.0)) * exp(-pow((y - 0.5) / 0.3, 2.0));
        asphalt += vec3(1.0, 0.88, 0.7) * ahead * 0.6 + vec3(1.0, 0.08, 0.04) * behind * 0.5;
        float edge = step(y, 0.035) + step(0.965, y);
        float lane = step(abs(y - 0.5), 0.012) * step(fract(x * 340.0), 0.5);
        c = mix(asphalt, mix(vec3(0.12, 0.11, 0.13), lit, done), edge);
        c = mix(c, mix(vec3(0.2, 0.18, 0.16), vec3(0.95, 0.85, 0.6), done), lane);
      } else {
        float strip = smoothstep(0.72, 0.86, y);
        c = mix(vec3(0.035, 0.032, 0.034), mix(vec3(0.09, 0.08, 0.1), lit, done), strip);
      }
      gl_FragColor = vec4(c, 1.0);
      #include <tonemapping_fragment>
      #include <colorspace_fragment>
      #include <fog_fragment>
    }`;
  const roadMat = mode => {
    const u = THREE.UniformsUtils.merge([THREE.UniformsLib.fog, { uProgress: { value: 0 }, uTime: { value: 0 }, uReveal: { value: 0 }, uCarU: { value: 0 }, uMode: { value: mode } }]);
    u.uCols = { value: ACC }; u.uStops = { value: stopT };
    return new THREE.ShaderMaterial({ uniforms: u, vertexShader: roadVert, fragmentShader: roadFrag, fog: true, side: THREE.DoubleSide });
  };
  const SEG = mobile ? 900 : 1600;
  const strip = (fn) => {
    const pos = [], uv = [], idx = [], a = new THREE.Vector3(), b = new THREE.Vector3(), s = new THREE.Vector3();
    for (let i = 0; i <= SEG; i++) {
      const u = i / SEG, p = curve.getPointAt(u); sideAt(u, s);
      fn(p, s, a, b); pos.push(a.x, a.y, a.z, b.x, b.y, b.z); uv.push(u, 0, u, 1);
      if (i < SEG) { const k = i * 2; idx.push(k, k + 1, k + 2, k + 1, k + 3, k + 2); }
    }
    const g = new THREE.BufferGeometry();
    g.setAttribute('position', new THREE.Float32BufferAttribute(pos, 3)); g.setAttribute('uv', new THREE.Float32BufferAttribute(uv, 2));
    g.setIndex(idx); g.computeVertexNormals(); return g;
  };
  const road = new THREE.Mesh(strip((p, s, a, b) => { a.copy(p).addScaledVector(s, -ROAD_W / 2); b.copy(p).addScaledVector(s, ROAD_W / 2); }), roadMat(0));
  const railL = new THREE.Mesh(strip((p, s, a, b) => { a.copy(p).addScaledVector(s, -ROAD_W / 2 - .05); b.copy(a).addScaledVector(UP, .5); }), roadMat(1));
  const railR = new THREE.Mesh(strip((p, s, a, b) => { a.copy(p).addScaledVector(s, ROAD_W / 2 + .05); b.copy(a).addScaledVector(UP, .5); }), roadMat(1));
  // the deck's thickness, seen from the side
  const deck = new THREE.Mesh(strip((p, s, a, b) => { a.copy(p).addScaledVector(s, -ROAD_W / 2 - .05).addScaledVector(UP, -.45); b.copy(p).addScaledVector(s, ROAD_W / 2 + .05).addScaledVector(UP, -.45); }), new THREE.MeshLambertMaterial({ color: '#0d0b0a', side: THREE.DoubleSide }));
  scene.add(road, railL, railR, deck);
  const roadU = [road, railL, railR].map(m => m.material.uniforms);

  /* ---- pillars and streetlights ---- */
  const concrete = new THREE.MeshLambertMaterial({ color: '#1b1714' });
  const PIL = Math.floor(SEG / 55);
  const pillars = new THREE.InstancedMesh(new THREE.BoxGeometry(1, 1, 1), concrete, PIL);
  const m4 = new THREE.Matrix4(), q = new THREE.Quaternion(), sc = new THREE.Vector3(), pos = new THREE.Vector3();
  for (let k = 0; k < PIL; k++) {
    const p = curve.getPointAt((k + .5) / PIL), h = p.y - .45 - GROUND;
    pos.set(p.x, GROUND + h / 2, p.z); sc.set(.9, h, .9); q.identity();
    pillars.setMatrixAt(k, m4.compose(pos, q, sc));
  }
  scene.add(pillars);
  const poles = new THREE.InstancedMesh(new THREE.BoxGeometry(1, 1, 1), new THREE.MeshLambertMaterial({ color: '#2a2420' }), LAMPS);
  const lampPos = [], s2 = new THREE.Vector3();
  for (let k = 0; k < LAMPS; k++) {
    const u = (k + .5) / LAMPS, p = curve.getPointAt(u), sd = k % 2 ? 1 : -1; sideAt(u, s2);
    const base = p.clone().addScaledVector(s2, sd * (ROAD_W / 2 + .35));
    pos.copy(base).addScaledVector(UP, 1.9); sc.set(.08, 3.8, .08); q.identity();
    poles.setMatrixAt(k, m4.compose(pos, q, sc));
    const lamp = base.clone().addScaledVector(UP, 3.8).addScaledVector(s2, -sd * .55);
    lampPos.push(lamp.x, lamp.y, lamp.z);
  }
  scene.add(poles);
  const lampGeo = new THREE.BufferGeometry(); lampGeo.setAttribute('position', new THREE.Float32BufferAttribute(lampPos, 3));
  scene.add(new THREE.Points(lampGeo, new THREE.PointsMaterial({ color: C_LAMP.clone().multiplyScalar(1.2), size: 1.1, map: sprite, transparent: true, depthWrite: false, blending: THREE.AdditiveBlending })));
  // cones of light under each lamp
  const coneGeo = new THREE.ConeGeometry(1.15, 3.8, 24, 1, true); coneGeo.translate(0, -1.9, 0);
  const coneMat = new THREE.ShaderMaterial({ transparent: true, blending: THREE.AdditiveBlending, depthWrite: false, side: THREE.DoubleSide,
    uniforms: { uCol: { value: C_LAMP.clone() } },
    vertexShader: 'varying float vV; void main(){ vV = uv.y; gl_Position = projectionMatrix * modelViewMatrix * instanceMatrix * vec4(position,1.0); }',
    fragmentShader: 'uniform vec3 uCol; varying float vV; void main(){ float a = 0.07 * pow(vV, 1.8); gl_FragColor = vec4(uCol * a, a); }' });
  const cones = new THREE.InstancedMesh(coneGeo, coneMat, LAMPS);
  for (let k = 0; k < LAMPS; k++) { pos.set(lampPos[k * 3], lampPos[k * 3 + 1], lampPos[k * 3 + 2]); sc.set(1, 1, 1); q.identity(); cones.setMatrixAt(k, m4.compose(pos, q, sc)); }
  scene.add(cones);

  /* ---- checkpoints: a light gate at every stop ---- */
  const stations = STOPS.map((p, i) => {
    const g = new THREE.Group(); g.position.copy(p);
    const tan = curve.getTangentAt(stopT[i]);
    g.quaternion.setFromUnitVectors(new THREE.Vector3(0, 0, 1), tan);
    const mat = new THREE.MeshBasicMaterial({ color: C_JAM.clone() });
    const W = ROAD_W + 1, H = 3.4, T = .09;
    const parts = [[T, H, T, -W / 2, H / 2], [T, H, T, W / 2, H / 2], [W + T, T, T, 0, H]];
    parts.forEach(([w, h, d, x, y]) => { const m = new THREE.Mesh(new THREE.BoxGeometry(w, h, d), mat); m.position.set(x, y, 0); g.add(m); });
    const curtain = new THREE.Mesh(new THREE.PlaneGeometry(W, H), new THREE.ShaderMaterial({
      transparent: true, depthWrite: false, blending: THREE.AdditiveBlending, side: THREE.DoubleSide,
      uniforms: { uCol: { value: C_JAM.clone() }, uA: { value: .25 }, uTime: { value: 0 } },
      vertexShader: 'varying vec2 vUv; void main(){ vUv = uv; gl_Position = projectionMatrix * modelViewMatrix * vec4(position,1.0); }',
      fragmentShader: `uniform vec3 uCol; uniform float uA, uTime; varying vec2 vUv;
        void main(){ float scan = 0.55 + 0.45 * sin(vUv.y * 60.0 - uTime * 4.0);
          float a = uA * pow(vUv.y, 1.6) * scan; gl_FragColor = vec4(uCol * a, a); }`
    }));
    curtain.position.y = H / 2;
    const beam = new THREE.Mesh(new THREE.CylinderGeometry(.03, .03, 60, 6, 1, true),
      new THREE.MeshBasicMaterial({ color: C_JAM.clone(), transparent: true, opacity: .3, blending: THREE.AdditiveBlending, depthWrite: false }));
    beam.position.y = 30 + H;
    const waves = [0, 1].map(() => {
      const w = new THREE.Mesh(new THREE.RingGeometry(1.9, 2.02, 96),
        new THREE.MeshBasicMaterial({ color: ACC[i].clone().multiplyScalar(2), transparent: true, opacity: 0, blending: THREE.AdditiveBlending, depthWrite: false, side: THREE.DoubleSide }));
      w.position.y = H / 2; g.add(w); return w;
    });
    g.add(curtain, beam); scene.add(g);
    return { g, mat, curtain, beam, waves, tan, acc: ACC[i], side: sideAt(stopT[i]), fix: 0, glowNow: 0, kick: 0 };
  });

  /* ---- traffic: red brake lights jammed at each stop, which straighten into flowing lanes ---- */
  const PER = mobile ? 110 : 200, JN = PER * N;
  const jPos = new Float32Array(JN * 3), jCol = new Float32Array(JN * 3), chaos = [], phase = [];
  for (let k = 0; k < JN; k++) { chaos.push(new THREE.Vector3((Math.random() - .5) * 5.5, .25 + Math.random() * 2.2, (Math.random() - .5) * 6)); phase.push(Math.random() * Math.PI * 2); }
  const jamGeo = new THREE.BufferGeometry();
  jamGeo.setAttribute('position', new THREE.BufferAttribute(jPos, 3));
  jamGeo.setAttribute('color', new THREE.BufferAttribute(jCol, 3));
  scene.add(new THREE.Points(jamGeo, new THREE.PointsMaterial({ size: mobile ? .22 : .2, map: sprite, vertexColors: true, transparent: true, depthWrite: false, blending: THREE.AdditiveBlending })));

  /* ---- the car ---- */
  const C = buildCar();
  const carLight = new THREE.PointLight('#ffd7a0', 14, 12, 2); carLight.position.set(0, .8, 4.2); C.car.add(carLight);
  const under = new THREE.Mesh(new THREE.PlaneGeometry(2, 3.2), new THREE.MeshBasicMaterial({ map: sprite, color: ACC[0].clone(), transparent: true, opacity: .32, blending: THREE.AdditiveBlending, depthWrite: false }));
  under.rotation.x = -Math.PI / 2; under.position.y = .03; C.car.add(under);
  const beamMat = new THREE.MeshBasicMaterial({ color: new THREE.Color('#ffe8c4').multiplyScalar(.06), transparent: true, blending: THREE.AdditiveBlending, depthWrite: false, side: THREE.DoubleSide });
  const hb = new THREE.Mesh(new THREE.ConeGeometry(1.1, 6, 24, 1, true), beamMat);
  hb.rotation.x = -Math.PI / 2; hb.position.set(0, .35, 4.4); C.car.add(hb);
  scene.add(C.car);

  // tail-light streaks: two ribbons rebuilt behind the car every frame
  const TL = 70;
  const trail = [-1, 1].map(sd => {
    const g = new THREE.BufferGeometry(), p = new Float32Array((TL + 1) * 2 * 3), c = new Float32Array((TL + 1) * 2 * 3), idx = [];
    for (let i = 0; i < TL; i++) { const k = i * 2; idx.push(k, k + 1, k + 2, k + 1, k + 3, k + 2); }
    g.setAttribute('position', new THREE.BufferAttribute(p, 3)); g.setAttribute('color', new THREE.BufferAttribute(c, 3)); g.setIndex(idx);
    const m = new THREE.Mesh(g, new THREE.MeshBasicMaterial({ vertexColors: true, transparent: true, blending: THREE.AdditiveBlending, depthWrite: false, side: THREE.DoubleSide }));
    m.frustumCulled = false; scene.add(m); return { g, p, c, sd };
  });

  /* ---- speed lines ---- */
  const SL = mobile ? 70 : 160, slPos = new Float32Array(SL * 6), slCol = new Float32Array(SL * 6), slSeed = [];
  for (let k = 0; k < SL; k++) slSeed.push(new THREE.Vector3());
  const slGeo = new THREE.BufferGeometry();
  slGeo.setAttribute('position', new THREE.BufferAttribute(slPos, 3)); slGeo.setAttribute('color', new THREE.BufferAttribute(slCol, 3));
  const speedLines = new THREE.LineSegments(slGeo, new THREE.LineBasicMaterial({ vertexColors: true, transparent: true, blending: THREE.AdditiveBlending, depthWrite: false }));
  speedLines.frustumCulled = false; scene.add(speedLines);

  /* ---- city: blocks with lit windows, distant skyline against the haze ---- */
  const N_B = mobile ? 320 : 700;
  const blocks = new THREE.InstancedMesh(new THREE.BoxGeometry(1, 1, 1), new THREE.MeshLambertMaterial({ color: '#221a16' }), N_B);
  let placed = 0, guard = 0;
  while (placed < N_B && guard++ < 30000) {
    pos.set((Math.random() - .5) * 150, 0, 40 - Math.random() * 230);
    let near = Infinity;
    for (let i = 0; i < samples.length; i += 15) { const s = samples[i]; const d = (s.x - pos.x) ** 2 + (s.z - pos.z) ** 2; if (d < near) near = d; }
    if (near < 30) continue;
    const h = 1.5 + Math.pow(Math.random(), 2) * (near < 120 ? 9 : 26);
    sc.set(1.4 + Math.random() * 3.2, h, 1.4 + Math.random() * 3.2); pos.y = GROUND + h / 2;
    q.setFromAxisAngle(UP, (Math.random() < .5 ? 0 : Math.PI / 2) + (Math.random() - .5) * .08);
    blocks.setMatrixAt(placed++, m4.compose(pos, q, sc));
  }
  blocks.count = placed; scene.add(blocks);
  const W = mobile ? 900 : 2600, wPos = [], wCol = [];
  for (let k = 0; k < W; k++) {
    blocks.getMatrixAt(Math.floor(Math.random() * placed), m4); m4.decompose(pos, q, sc);
    const face = Math.random() < .5 ? 1 : -1, alongX = Math.random() < .5;
    const lx = alongX ? (Math.random() - .5) * sc.x : face * (sc.x / 2 + .02), lz = alongX ? face * (sc.z / 2 + .02) : (Math.random() - .5) * sc.z;
    const v = new THREE.Vector3(lx, (Math.random() - .5) * sc.y * .9, lz).applyQuaternion(q).add(pos);
    wPos.push(v.x, v.y, v.z);
    const c = Math.random() < .7 ? new THREE.Color('#FFB46A').multiplyScalar(.5 + Math.random() * .6) : new THREE.Color('#bcd2ff').multiplyScalar(.45);
    wCol.push(c.r, c.g, c.b);
  }
  const winGeo = new THREE.BufferGeometry();
  winGeo.setAttribute('position', new THREE.Float32BufferAttribute(wPos, 3)); winGeo.setAttribute('color', new THREE.Float32BufferAttribute(wCol, 3));
  scene.add(new THREE.Points(winGeo, new THREE.PointsMaterial({ size: .09, vertexColors: true })));
  const FAR = 140, far = new THREE.InstancedMesh(new THREE.BoxGeometry(1, 1, 1), new THREE.MeshBasicMaterial({ color: '#0d0806', fog: false }), FAR);
  for (let k = 0; k < FAR; k++) {
    const ang = (k / FAR) * Math.PI * 2 + Math.random() * .03, r = 260 + Math.random() * 60, h = 18 + Math.random() * 70;
    pos.set(Math.cos(ang) * r, GROUND + h / 2, -60 + Math.sin(ang) * r); sc.set(8 + Math.random() * 18, h, 8 + Math.random() * 18);
    q.setFromAxisAngle(UP, ang); far.setMatrixAt(k, m4.compose(pos, q, sc));
  }
  scene.add(far);
  const ground = new THREE.Mesh(new THREE.PlaneGeometry(800, 800), new THREE.MeshLambertMaterial({ color: '#0e0a08' }));
  ground.rotation.x = -Math.PI / 2; ground.position.set(0, GROUND, -60); scene.add(ground);
  const grid = new THREE.GridHelper(400, 160, '#2a1c12', '#1a120c');
  grid.position.set(0, GROUND + .02, -60); grid.material.transparent = true; grid.material.opacity = .5; scene.add(grid);
  scene.add(new THREE.HemisphereLight('#a8622c', '#060403', .9));
  const dir = new THREE.DirectionalLight('#ffb070', .9); dir.position.set(-30, 40, -80); scene.add(dir);

  /* ---- post: bloom + a warm, grainy colour grade (desktop) ---- */
  let composer = null, grade = null;
  if (!mobile) {
    composer = new EffectComposer(renderer);
    composer.addPass(new RenderPass(scene, camera));
    composer.addPass(new UnrealBloomPass(new THREE.Vector2(innerWidth, innerHeight), .55, .45, .42));
    composer.addPass(new OutputPass());
    grade = new ShaderPass({
      uniforms: { tDiffuse: { value: null }, uTime: { value: 0 } },
      vertexShader: 'varying vec2 vUv; void main(){ vUv = uv; gl_Position = projectionMatrix * modelViewMatrix * vec4(position,1.0); }',
      fragmentShader: `uniform sampler2D tDiffuse; uniform float uTime; varying vec2 vUv;
        float h(vec2 p){ return fract(sin(dot(p, vec2(12.9898, 78.233))) * 43758.5453); }
        void main(){
          vec2 d = (vUv - 0.5) * 0.0016;
          vec3 c = vec3(texture2D(tDiffuse, vUv + d).r, texture2D(tDiffuse, vUv).g, texture2D(tDiffuse, vUv - d).b);
          float l = dot(c, vec3(0.299, 0.587, 0.114));
          c = mix(c, c * vec3(1.08, 0.97, 0.84) + vec3(0.012, 0.006, 0.0), 0.6);   // warm grade
          c = mix(vec3(l), c, 1.08);
          float v = smoothstep(1.15, 0.35, length(vUv - 0.5) * 1.35);
          c *= mix(0.55, 1.0, v);
          c += (h(vUv * 900.0 + uTime) - 0.5) * 0.035;                        // film grain
          gl_FragColor = vec4(c, 1.0);
        }`
    });
    composer.addPass(grade);
  }

  function burst(i) {
    const s = stations[i]; if (!s) return;
    s.kick = 1;
    s.waves.forEach((w, k) => {
      gsap.fromTo(w.scale, { x: 1, y: 1, z: 1 }, { x: 5 + k * 3, y: 5 + k * 3, z: 5 + k * 3, duration: 2, delay: k * .2, ease: 'expo.out', overwrite: true });
      gsap.fromTo(w.material, { opacity: .9 }, { opacity: 0, duration: 2, delay: k * .2, ease: 'power2.out', overwrite: true });
    });
  }

  return { renderer, scene, camera, composer, grade, curve, stopT, sideAt, palAt, stations, roadU, burst, car: C, under, carLight,
    jPos, jCol, jamGeo, chaos, phase, PER, trail, TL, slPos, slCol, slGeo, slSeed, SL };
}

/* =====================================================================
   STATE DRIVEN BY SCROLL
   ===================================================================== */
const S = { hero: 0, journey: 0, after: 0, mx: 0, my: 0 };
const chaps = $$('.chap');
const story = $('#story');
story.style.height = (N * 100 + 100) + 'svh';

ScrollTrigger.create({ trigger: '.hero', start: 'top top', end: 'bottom top', onUpdate: s => { S.hero = s.progress; } });
ScrollTrigger.create({ trigger: story, start: 'top top', end: 'bottom bottom', onUpdate: s => { S.journey = s.progress; } });
ScrollTrigger.create({ trigger: '#cases', start: 'top bottom', end: 'top 20%', onUpdate: s => { S.after = s.progress; } });

const KX = [0, ...Array.from({ length: N }, (_, i) => i + .45), N];
function camT(p) {
  const x = p * N, st = gl ? gl.stopT : Array.from({ length: N }, (_, i) => i / (N - 1));
  const kt = [Math.max(st[0] - .035, 0), ...st, st[N - 1]];
  for (let i = 0; i < KX.length - 1; i++) if (x <= KX[i + 1]) return lerp(kt[i], kt[i + 1], ease(clamp((x - KX[i]) / (KX[i + 1] - KX[i]))));
  return st[N - 1];
}

/* ---- minimap ---- */
const mini = $('#minimap');
let miniCar = null, miniDone = null, miniLen = 1;
if (gl && mini) {
  const pts = []; for (let i = 0; i <= 300; i++) { const p = gl.curve.getPointAt(i / 300); pts.push([p.x, p.z]); }
  const xs = pts.map(p => p[0]), zs = pts.map(p => p[1]);
  const minX = Math.min(...xs), maxX = Math.max(...xs), minZ = Math.min(...zs), maxZ = Math.max(...zs);
  const sc = 120 / Math.max(maxX - minX, maxZ - minZ);
  const map = (x, z) => [95 + (x - (minX + maxX) / 2) * sc, 95 + (z - (minZ + maxZ) / 2) * sc];
  const d = pts.map((p, i) => (i ? 'L' : 'M') + map(p[0], p[1]).map(v => v.toFixed(1)).join(' ')).join('');
  const ns = 'http://www.w3.org/2000/svg';
  const mk = (tag, at) => { const e = document.createElementNS(ns, tag); Object.entries(at).forEach(([k, v]) => e.setAttribute(k, v)); mini.appendChild(e); return e; };
  mk('path', { d, fill: 'none', stroke: '#ffffff26', 'stroke-width': 3, 'stroke-linecap': 'round' });
  miniDone = mk('path', { d, fill: 'none', stroke: '#FFC23D', 'stroke-width': 3, 'stroke-linecap': 'round' });
  miniLen = miniDone.getTotalLength(); miniDone.style.strokeDasharray = miniLen; miniDone.style.strokeDashoffset = miniLen;
  gl.stopT.forEach((t, i) => {
    const p = gl.curve.getPointAt(t), [x, y] = map(p.x, p.z);
    const c = mk('circle', { cx: x, cy: y, r: 5, fill: '#070503', stroke: ACC_HEX[i], 'stroke-width': 2, class: 'stopdot', tabindex: 0 });
    const go = () => { const top = story.offsetTop, len = story.offsetHeight - innerHeight; scrollToY(top + len * ((i + .45) / N)); };
    c.addEventListener('click', go); c.addEventListener('keydown', e => { if (e.key === 'Enter') go(); });
  });
  miniCar = mk('circle', { r: 4.5, fill: '#fff' });
  miniCar.map = map;
}

/* ---- chapter text ---- */
let active = -1, introDone = false;
function chapterAlpha(i, p) {
  const x = p * N - i;
  const inA = i === 0 ? 1 : smooth(-.02, .14, x), outA = i === N - 1 ? 1 : 1 - smooth(.84, .98, x);
  return inA * outA;
}
function countUp(el) {
  const to = parseFloat(el.dataset.to); if (isNaN(to)) return;
  const pre = el.dataset.pre || '', suf = el.dataset.suf || '', dec = +(el.dataset.dec || 0), o = { v: 0 };
  gsap.to(o, { v: to, duration: RM ? 0 : 1.3, ease: 'power3.out', onUpdate: () => { el.textContent = pre + o.v.toFixed(dec) + suf; } });
}
function enterChapter(i) {
  const c = chaps[i]; if (!c) return;
  const parts = c.querySelectorAll('.brandrow, h3, .role, .why, .met, .prods a, .ct .btn');
  gsap.fromTo(parts, { y: 34, autoAlpha: 0 }, { y: 0, autoAlpha: 1, duration: RM ? 0 : .9, stagger: RM ? 0 : .07, ease: 'expo.out', overwrite: true });
  gsap.fromTo(c.querySelector('.bignum'), { xPercent: -8, autoAlpha: 0 }, { xPercent: 0, autoAlpha: 1, duration: 1.4, ease: 'expo.out' });
  gsap.fromTo(c.querySelector('.logo'), { scale: .5, rotate: -12 }, { scale: 1, rotate: 0, duration: .9, ease: 'back.out(2)' });
  c.querySelectorAll('[data-to]').forEach(countUp);
  if (gl && !RM && introDone) gl.burst(i);
}
const hudN = $('#hudn'), hudName = $('#hudname');
function updateChapters() {
  const p = S.journey, idx = Math.min(N - 1, Math.floor(p * N + .0001));
  chaps.forEach((c, i) => {
    const a = chapterAlpha(i, p), x = p * N - i;
    c.style.visibility = a > .01 ? 'visible' : 'hidden';
    c.style.opacity = a;
    c.firstElementChild.style.transform = `translate3d(0,${(1 - a) * (x < .5 ? 50 : -50)}px,0)`;
  });
  if (idx !== active) {
    active = idx; enterChapter(idx);
    $('#jstop').textContent = `Stop ${String(idx + 1).padStart(2, '0')} / ${String(N).padStart(2, '0')}`;
    if (hudN) { hudN.innerHTML = `${String(idx + 1).padStart(2, '0')}<span> / ${String(N).padStart(2, '0')}</span>`; hudN.style.color = ACC_HEX[idx]; hudName.textContent = STOP_NAMES[idx]; }
    if (miniDone) miniDone.style.stroke = ACC_HEX[idx];
  }
  $('#jfill').style.width = (p * 100) + '%';
}

/* =====================================================================
   THE LOOP
   ===================================================================== */
const camPos = new THREE.Vector3(30, 26, 52), camLook = new THREE.Vector3(0, -2, -40);
const tgtPos = new THREE.Vector3(), tgtLook = new THREE.Vector3();
const fP = new THREE.Vector3(), tan = new THREE.Vector3(), side = new THREE.Vector3(), tmp = new THREE.Vector3(), tmp2 = new THREE.Vector3();
const bankA = new THREE.Vector3(), bankB = new THREE.Vector3(), palC = new THREE.Color(), fwd = new THREE.Vector3();
let viewShift = 0, last = performance.now(), introCam = 1, roll = 0, reveal = 0, lastCarT = 0, speed = 0, carRoll = 0;
const OVER_P = new THREE.Vector3(26, 20, 44), OVER_L = new THREE.Vector3(-6, -1, -20);
const END_P = new THREE.Vector3(-70, 52, -20), END_L = new THREE.Vector3(0, 0, -70);

// photo-mode shots at each stop, relative to the car: [behind, height, side]  (negative behind = in front)
const SHOTS = [[-6.5, 1.3, 4.2], [8, 3.2, -3.5], [3.2, 1.8, 6], [6, 1, 3.6], [-5.6, 2.2, -4.6], [3.5, 9, 3], [10, 4, -7]];
const CHASE = [7.5, 2.4, 0];

function frame() {
  const now = performance.now(), dt = Math.min((now - last) / 1000, .05); last = now;
  updateChapters();
  if (!gl) return;
  const { renderer, scene, camera, composer, stations, curve } = gl;
  const time = now / 1000, jp = S.journey, x = jp * N;
  const a = ease(clamp(S.after));

  // where the car is
  let carT = camT(jp);
  if (a > 0) carT = lerp(carT, Math.min(1, gl.stopT[N - 1] + .04), a);
  speed = lerp(speed, Math.abs(carT - lastCarT) / Math.max(dt, 1e-3), 1 - Math.exp(-dt * 6)); lastCarT = carT;
  const sp = clamp(speed * 9);
  curve.getPointAt(carT, fP); curve.getTangentAt(clamp(carT, 0, .999), tan); gl.sideAt(carT, side);

  // camera: blend the stop's photo-mode shot with a chase cam while driving
  const k0 = clamp(Math.round(x - .45), 0, N - 1), dist = Math.abs(x - (k0 + .45));
  const dwell = jp > 0 ? 1 - smooth(.16, .42, dist) : 1;
  const shot = SHOTS[k0];
  const b = lerp(CHASE[0], shot[0], dwell), u = lerp(CHASE[1], shot[1], dwell), sd = lerp(CHASE[2], shot[2], dwell);
  tgtPos.copy(fP).addScaledVector(tan, -b).addScaledVector(UP, u + .3).addScaledVector(side, sd);
  curve.getPointAt(Math.min(carT + .02, 1), tmp);
  tgtLook.copy(fP).addScaledVector(UP, .7).lerp(tmp.addScaledVector(UP, .8), 1 - dwell);
  const h = ease(clamp(S.hero));
  if (jp <= 0.0001 && h < 1) { tgtPos.lerpVectors(OVER_P, tgtPos, h); tgtLook.lerpVectors(OVER_L, tgtLook, h); }
  if (a > 0) { tgtPos.lerp(END_P, a); tgtLook.lerp(END_L, a); }
  tgtPos.x += Math.sin(time * .25) * .25 + S.mx * 1.2;
  tgtPos.y += Math.cos(time * .2) * .2 - S.my * .7;
  if (introCam > 0) { tgtPos.y += introCam * 24; tgtPos.z += introCam * 30; }
  const k = window.__snap ? 1 : 1 - Math.exp(-dt * (RM ? 60 : 3));
  camPos.lerp(tgtPos, k); camLook.lerp(tgtLook, k);
  camera.position.copy(camPos); camera.lookAt(camLook);
  curve.getTangentAt(clamp(carT, 0, .999), bankA); curve.getTangentAt(clamp(carT + .02, 0, .999), bankB);
  const turn = bankA.clone().cross(bankB).y;
  roll = lerp(roll, jp > 0 && jp < 1 && !RM ? clamp(-turn * 3, -.07, .07) * (1 - dwell) * (1 - a) : 0, 1 - Math.exp(-dt * 2.5));
  camera.rotateZ(roll);
  camera.fov = lerp(camera.fov, 46 + sp * 12, 1 - Math.exp(-dt * 3)); camera.updateProjectionMatrix();

  const wantShift = !isMobile() && jp > 0 && jp < 1 ? .17 * (1 - a) : 0;
  viewShift = lerp(viewShift, wantShift, 1 - Math.exp(-dt * 4));
  const w = innerWidth, hh = innerHeight;
  camera.setViewOffset(w, hh, -w * viewShift, 0, w, hh);

  // the car: on the road, leaning into turns, wheels spinning
  const Cc = gl.car;
  Cc.car.position.copy(fP).addScaledVector(UP, .02);
  Cc.car.lookAt(tmp.copy(fP).add(tan));
  carRoll = lerp(carRoll, clamp(turn * 6, -.08, .08) * sp, 1 - Math.exp(-dt * 4));
  Cc.body.rotation.z = carRoll; Cc.body.position.y = Math.sin(time * 14) * .006 * (1 - sp);
  Cc.wheels.forEach(wh => { wh.rotation.z -= speed * dt * 900; });
  gl.palAt(carT, palC); gl.under.material.color.copy(palC);

  gl.roadU.forEach(U => { U.uProgress.value = carT; U.uTime.value = time; U.uReveal.value = reveal; U.uCarU.value = carT; });

  // tail-light streaks, longer the faster you go
  const len = .0005 + sp * .0016;
  gl.trail.forEach(tr => {
    for (let i = 0; i <= gl.TL; i++) {
      const tt = Math.max(0, carT - .0012 - i * len); curve.getPointAt(tt, tmp); gl.sideAt(tt, tmp2);
      tmp.addScaledVector(tmp2, tr.sd * .48).addScaledVector(UP, .36);
      const f = Math.pow(1 - i / gl.TL, 1.5) * (.25 + sp * 1.6);
      tr.p.set([tmp.x, tmp.y - .035, tmp.z, tmp.x, tmp.y + .035, tmp.z], i * 6);
      tr.c.set([f * 1.4, f * .08, f * .05, f * 1.4, f * .08, f * .05], i * 6);
    }
    tr.g.attributes.position.needsUpdate = tr.g.attributes.color.needsUpdate = true;
  });

  // speed lines streaming past the camera
  camera.getWorldDirection(fwd);
  for (let i = 0; i < gl.SL; i++) {
    const s = gl.slSeed[i];
    tmp.copy(s).sub(camPos);
    if (s.lengthSq() === 0 || tmp.dot(fwd) < 1 || tmp.length() > 45) {
      tmp2.set(Math.random() - .5, Math.random() - .5, Math.random() - .5).cross(fwd).normalize().multiplyScalar(2.5 + Math.random() * 7);
      s.copy(camPos).addScaledVector(fwd, 8 + Math.random() * 36).add(tmp2);
    }
    const l = .5 + sp * 5, f = sp * .9;
    gl.slPos.set([s.x, s.y, s.z, s.x - tan.x * l, s.y - tan.y * l, s.z - tan.z * l], i * 6);
    gl.slCol.set([f, f * .8, f * .55, 0, 0, 0], i * 6);
  }
  gl.slGeo.attributes.position.needsUpdate = gl.slGeo.attributes.color.needsUpdate = true;

  // checkpoints: red until you reach them, then the stop's colour
  stations.forEach((s, i) => {
    const target = a > 0 ? 1 : (x >= i + .22 || jp >= 1 ? 1 : 0);
    s.fix = lerp(s.fix, target, 1 - Math.exp(-dt * 2.2));
    s.glowNow = lerp(s.glowNow, a > .5 ? 0 : clamp(1 - Math.abs(x - (i + .45)) * 1.4), 1 - Math.exp(-dt * 5));
    s.kick = lerp(s.kick, 0, 1 - Math.exp(-dt * 1.6));
    const col = C_JAM.clone().multiplyScalar(.8).lerp(s.acc, s.fix);
    s.mat.color.copy(col).multiplyScalar(1.4 + s.glowNow * 1.2 + s.kick * 2);
    s.curtain.material.uniforms.uCol.value.copy(col);
    s.curtain.material.uniforms.uA.value = .18 + s.glowNow * .25 + s.kick * .6;
    s.curtain.material.uniforms.uTime.value = time;
    s.beam.material.color.copy(col); s.beam.material.opacity = .16 + s.glowNow * .3;
  });

  // traffic: a red jam at each checkpoint that blows apart, then flows in four lanes
  const { jPos, jCol, chaos, phase, PER } = gl;
  for (let si = 0; si < N; si++) {
    const s = stations[si], m = ease(clamp(s.fix)), base = s.g.position, kick = s.kick * 2;
    for (let j = 0; j < PER; j++) {
      const kk = si * PER + j, c = chaos[kk], ph = phase[kk];
      const jx = base.x + s.side.x * c.x + s.tan.x * c.z + Math.sin(time * 2.1 + ph) * .12;
      const jy = base.y + c.y + Math.cos(time * 1.7 + ph) * .1;
      const jz = base.z + s.side.z * c.x + s.tan.z * c.z + Math.sin(time * 1.3 + ph * 2) * .12;
      const lane = j % 4, slot = Math.floor(j / 4), slots = PER / 4;
      const along = (((slot / slots) + time * (lane < 2 ? .05 : -.05)) % 1 + 1) % 1 * 12 - 6;
      const lx = base.x + s.tan.x * along + s.side.x * (lane - 1.5) * .82;
      const ly = base.y + .32 + s.tan.y * along;
      const lz = base.z + s.tan.z * along + s.side.z * (lane - 1.5) * .82;
      jPos[kk * 3] = lerp(jx, lx, m) + c.x * kick; jPos[kk * 3 + 1] = lerp(jy, ly, m) + c.y * kick * .5; jPos[kk * 3 + 2] = lerp(jz, lz, m) + c.z * kick;
      const fl = .5 + .5 * Math.sin(time * 6 + ph) * (1 - m);
      const cF = lane < 2 ? s.acc : palC.setRGB(1, .9, .75);
      jCol[kk * 3] = lerp(C_JAM.r * fl, cF.r, m); jCol[kk * 3 + 1] = lerp(C_JAM.g * fl, cF.g, m); jCol[kk * 3 + 2] = lerp(C_JAM.b * fl, cF.b, m);
    }
  }
  gl.jamGeo.attributes.position.needsUpdate = gl.jamGeo.attributes.color.needsUpdate = true;

  // minimap car
  if (miniCar) { const [mx, my] = miniCar.map(fP.x, fP.z); miniCar.setAttribute('cx', mx); miniCar.setAttribute('cy', my); miniDone.style.strokeDashoffset = miniLen * (1 - carT); }

  if (gl.grade) gl.grade.uniforms.uTime.value = time % 100;
  composer ? composer.render() : renderer.render(scene, camera);
}

gsap.ticker.add(t => { lenis && lenis.raf(t * 1000); frame(); });
gsap.ticker.lagSmoothing(0);

addEventListener('resize', () => {
  if (!gl) return;
  gl.camera.aspect = innerWidth / innerHeight; gl.camera.updateProjectionMatrix();
  gl.renderer.setSize(innerWidth, innerHeight, false);
  gl.composer && gl.composer.setSize(innerWidth, innerHeight);
});
addEventListener('pointermove', e => { S.mx = e.clientX / innerWidth - .5; S.my = e.clientY / innerHeight - .5; }, { passive: true });

// dim the 3D once the drive is done, so the rest of the page reads clean
gsap.to('#gl', { opacity: .14, ease: 'none', scrollTrigger: { trigger: '#cases', start: 'top 75%', end: 'top 15%', scrub: true } });

/* =====================================================================
   UI MOTION
   ===================================================================== */
$$('.split:not(.hero h1)').forEach(h => {
  gsap.from(h.querySelectorAll('.ln > span'), { yPercent: 110, duration: 1.1, ease: 'power4.out', stagger: .08, scrollTrigger: { trigger: h, start: 'top 85%' } });
});
ScrollTrigger.batch('.reveal:not(.hero .reveal)', {
  start: 'top 88%', once: true,
  onEnter: els => gsap.fromTo(els, { y: 30, autoAlpha: 0 }, { y: 0, autoAlpha: 1, duration: .9, ease: 'power3.out', stagger: .08 })
});
gsap.set('.reveal:not(.hero .reveal)', { autoAlpha: 0 });

// case competitions: results board rows slide in like a leaderboard
gsap.from('.brow', { x: -60, autoAlpha: 0, stagger: .1, duration: 1, ease: 'expo.out', scrollTrigger: { trigger: '.board', start: 'top 80%' } });
gsap.from('.bhead', { autoAlpha: 0, duration: .8, scrollTrigger: { trigger: '.board', start: 'top 85%' } });

// leadership: horizontal filmstrip on desktop
const mm = gsap.matchMedia();
mm.add('(min-width: 901px)', () => {
  const track = $('#htrack');
  const dist = () => Math.max(0, track.scrollWidth - innerWidth);
  const tw = gsap.to(track, { x: () => -dist(), ease: 'none',
    scrollTrigger: { trigger: '#leadership', start: 'top top', end: () => '+=' + dist(), pin: true, scrub: 1, invalidateOnRefresh: true, anticipatePin: 1 } });
  gsap.from('#htrack .fr', { y: 70, autoAlpha: 0, duration: 1, ease: 'expo.out', stagger: .07, scrollTrigger: { trigger: '#leadership', start: 'top 70%' } });
  $$('#htrack .frame img').forEach(img => gsap.fromTo(img, { xPercent: -4, scale: 1.12 }, { xPercent: 4, scale: 1.12, ease: 'none', scrollTrigger: { trigger: '#leadership', start: 'top top', end: () => '+=' + dist(), scrub: true } }));
  return () => tw.kill();
});
mm.add('(max-width: 900px)', () => {
  $$('#htrack .fr').forEach(c => gsap.from(c, { y: 40, autoAlpha: 0, duration: .9, ease: 'power3.out', scrollTrigger: { trigger: c, start: 'top 88%' } }));
});

ScrollTrigger.create({ start: 40, onUpdate: s => $('#topbar').classList.toggle('solid', s.scroll() > 40) });

/* ---- hero portrait: 3D tilt + depth on the chips ---- */
if (FINE && !RM) {
  const pimg = $('#pimg'), chips = $$('.chip');
  const rx = gsap.quickTo(pimg, 'rotationX', { duration: .8, ease: 'power3' }), ry = gsap.quickTo(pimg, 'rotationY', { duration: .8, ease: 'power3' });
  gsap.set('#portrait', { perspective: 900 });
  const cx = chips.map((c, i) => [gsap.quickTo(c, 'x', { duration: 1, ease: 'power3' }), gsap.quickTo(c, 'y', { duration: 1, ease: 'power3' }), (i % 2 ? 1 : -1) * (18 + i * 6)]);
  $('.hero').addEventListener('pointermove', e => {
    const x = e.clientX / innerWidth - .5, y = e.clientY / innerHeight - .5;
    ry(x * 10); rx(-y * 8); cx.forEach(([fx, fy, d]) => { fx(x * d); fy(y * d * .6); });
  });
}
gsap.to('#portrait', { yPercent: -12, autoAlpha: 0, ease: 'none', scrollTrigger: { trigger: '.hero', start: 'top top', end: 'bottom top', scrub: true } });
gsap.to('.hero .hgrid > div:first-child', { yPercent: -18, autoAlpha: 0, ease: 'none', scrollTrigger: { trigger: '.hero', start: '30% top', end: 'bottom top', scrub: true } });

/* ---- magnetic buttons + cursor ---- */
if (FINE && !RM) {
  $$('.magnet').forEach(el => {
    const mx = gsap.quickTo(el, 'x', { duration: .6, ease: 'power3' }), my = gsap.quickTo(el, 'y', { duration: .6, ease: 'power3' });
    el.addEventListener('pointermove', e => { const r = el.getBoundingClientRect(); mx((e.clientX - r.left - r.width / 2) * .3); my((e.clientY - r.top - r.height / 2) * .35); });
    el.addEventListener('pointerleave', () => { mx(0); my(0); });
  });
  const cur = $('#cur'), dot = cur.querySelector('.dot'), ring = cur.querySelector('.ring');
  const dx = gsap.quickTo(dot, 'x', { duration: .08 }), dy = gsap.quickTo(dot, 'y', { duration: .08 });
  const rx2 = gsap.quickTo(ring, 'x', { duration: .45, ease: 'power3' }), ry2 = gsap.quickTo(ring, 'y', { duration: .45, ease: 'power3' });
  addEventListener('pointermove', e => { cur.classList.add('on'); dx(e.clientX); dy(e.clientY); rx2(e.clientX); ry2(e.clientY); });
  document.addEventListener('pointerover', e => cur.classList.toggle('big', !!e.target.closest('a,button,[role="button"],.stopdot')));
}

/* ---- copy email ---- */
const toast = (msg) => { const t = $('#toast'); t.textContent = msg; t.classList.add('on'); clearTimeout(toast.t); toast.t = setTimeout(() => t.classList.remove('on'), 2200); };
document.addEventListener('click', e => {
  const b = e.target.closest('[data-copy]'); if (!b) return;
  (navigator.clipboard ? navigator.clipboard.writeText(b.dataset.copy) : Promise.reject()).then(() => toast('Email copied')).catch(() => toast(b.dataset.copy));
});

/* ---- business card ---- */
(() => {
  const overlay = $('#biz-overlay'), card = $('#biz-card');
  const reset = () => { card.style.setProperty('--rx', 0); card.style.setProperty('--ry', 0); card.style.setProperty('--mx', 50); card.style.setProperty('--my', 50); };
  const open = e => { e.preventDefault(); overlay.classList.add('active'); lenis && lenis.stop(); window.profileDialog ? window.profileDialog.open(overlay, e.currentTarget) : overlay.setAttribute('aria-hidden', 'false'); };
  const close = () => { overlay.classList.remove('active'); window.profileDialog ? window.profileDialog.close() : overlay.setAttribute('aria-hidden', 'true'); lenis && lenis.start(); reset(); };
  $$('.biz-card-trigger').forEach(t => t.addEventListener('click', open));
  $('#biz-close').addEventListener('click', close);
  overlay.addEventListener('click', e => { if (e.target === overlay || e.target.classList.contains('biz-card-wrapper')) close(); });
  addEventListener('keydown', e => { if (e.key === 'Escape' && overlay.classList.contains('active')) close(); });
  card.addEventListener('mousemove', e => {
    const r = card.getBoundingClientRect(), x = e.clientX - r.left, y = e.clientY - r.top;
    card.style.setProperty('--mx', x / r.width * 100); card.style.setProperty('--my', y / r.height * 100);
    card.style.setProperty('--rx', (y / r.height - .5) * -5); card.style.setProperty('--ry', (x / r.width - .5) * 5);
  });
  card.addEventListener('mouseleave', reset);
})();

/* =====================================================================
   INTRO: loader -> curtain -> hero (the road paves itself in)
   ===================================================================== */
function intro() {
  const heroIn = gsap.timeline({ paused: true })
    .from('.hero h1 .ln > span', { yPercent: 115, duration: 1.2, ease: 'power4.out', stagger: .1 })
    .from('.hero .reveal', { y: 30, autoAlpha: 0, duration: .9, ease: 'power3.out', stagger: .08 }, '-=.8')
    .from('#portrait', { scale: .9, autoAlpha: 0, duration: 1.3, ease: 'power3.out' }, '-=1.2')
    .from('.chip', { scale: .6, autoAlpha: 0, duration: .7, ease: 'back.out(2)', stagger: .09 }, '-=.7');
  const camIn = () => {
    gsap.to({ v: 1 }, { v: 0, duration: RM ? 0 : 2.8, ease: 'power3.out', onUpdate() { introCam = this.targets()[0].v; }, onComplete: () => { introDone = true; } });
    gsap.to({ v: 0 }, { v: 1, duration: RM ? 0 : 3.4, ease: 'power2.inOut', onUpdate() { reveal = this.targets()[0].v; } });
  };
  if (RM) { $('#loader').remove(); introCam = 0; reveal = 1; introDone = true; heroIn.progress(1); return; }
  lenis && lenis.stop();
  const o = { v: 0 }, lc = $('#lcount'), lb = $('#lbar');
  const ready = Promise.race([Promise.all([document.fonts ? document.fonts.ready : 0, new Promise(r => (document.readyState === 'complete' ? r() : addEventListener('load', r)))]), new Promise(r => setTimeout(r, 3500))]);
  gsap.to(o, { v: 86, duration: 1.4, ease: 'power2.out', onUpdate: () => { lc.textContent = Math.round(o.v); lb.style.width = o.v + '%'; } });
  gsap.from('.loader .lname span', { yPercent: 110, duration: 1, ease: 'power4.out', stagger: .08 });
  Promise.all([ready, new Promise(r => setTimeout(r, 1500))]).then(() => {
    gsap.timeline()
      .to(o, { v: 100, duration: .35, ease: 'power1.in', onUpdate: () => { lc.textContent = Math.round(o.v); lb.style.width = o.v + '%'; } })
      .to('.loader .lname span, .loader .lrow', { yPercent: -110, autoAlpha: 0, duration: .6, ease: 'power3.in', stagger: .04 })
      .to('#loader', { clipPath: 'inset(0 0 100% 0)', duration: .9, ease: 'power4.inOut' }, '-=.15')
      .add(() => { camIn(); heroIn.play(); lenis && lenis.start(); ScrollTrigger.refresh(); }, '-=.55')
      .add(() => $('#loader').remove());
  });
}
intro();
