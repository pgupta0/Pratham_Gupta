/* Products page: the garage. The car sits up on a lift, partly dismantled.
   Each product is one part of the car; when a product is in view (or hovered),
   that part slides further out and glows in the product's colour. */
import * as THREE from 'three';
import { EffectComposer } from 'three/addons/postprocessing/EffectComposer.js';
import { RenderPass } from 'three/addons/postprocessing/RenderPass.js';
import { UnrealBloomPass } from 'three/addons/postprocessing/UnrealBloomPass.js';
import { OutputPass } from 'three/addons/postprocessing/OutputPass.js';
import { RoomEnvironment } from 'three/addons/environments/RoomEnvironment.js';
import { buildF1Car, buildGarage } from './car.js';

const RM = matchMedia('(prefers-reduced-motion: reduce)').matches;
const mobile = innerWidth <= 900;
const canvas = document.getElementById('gl');
const clamp = (v, a = 0, b = 1) => Math.min(b, Math.max(a, v));
const lerp = (a, b, t) => a + (b - a) * t;

let api = { focus() {} };
try {
  const renderer = new THREE.WebGLRenderer({ canvas, antialias: !mobile, powerPreference: 'high-performance' });
  renderer.setPixelRatio(Math.min(devicePixelRatio, mobile ? 1.5 : 1.75));
  renderer.setSize(innerWidth, innerHeight, false);
  renderer.toneMapping = THREE.ACESFilmicToneMapping;
  renderer.setClearColor('#070503');
  const scene = new THREE.Scene();
  scene.fog = new THREE.FogExp2('#0d0907', .03);
  const pmrem = new THREE.PMREMGenerator(renderer);
  scene.environment = pmrem.fromScene(new RoomEnvironment(), .04).texture;
  scene.add(new THREE.HemisphereLight('#a8622c', '#060403', .7));
  const camera = new THREE.PerspectiveCamera(42, innerWidth / innerHeight, .1, 200);

  scene.add(buildGarage());
  // two-post lift: the car is "up on the lift"
  const liftM = new THREE.MeshStandardMaterial({ color: '#2a2724', metalness: .6, roughness: .4 });
  [-1, 1].forEach(s => {
    const post = new THREE.Mesh(new THREE.BoxGeometry(.35, 3.2, .35), liftM); post.position.set(s * 2.2, 1.6, 0); scene.add(post);
    const armM = new THREE.Mesh(new THREE.BoxGeometry(1.5, .08, .16), liftM); armM.position.set(s * 1.5, .72, 0); scene.add(armM);
  });
  const C = buildF1Car();
  C.car.position.y = .75; C.car.rotation.y = -.55; scene.add(C.car);

  let composer = null;
  if (!mobile) {
    composer = new EffectComposer(renderer);
    composer.addPass(new RenderPass(scene, camera));
    composer.addPass(new UnrealBloomPass(new THREE.Vector2(innerWidth, innerHeight), .5, .45, .5));
    composer.addPass(new OutputPass());
  }

  let focus = null, focusCol = '#ffffff', ex = RM ? .55 : 0, mx = 0, my = 0, shift = 0, rotY = -.55;
  // turn the car so the part being talked about faces the camera
  const FACE = { chassis: -.95, power: 1.45, frontWing: -.3, sidepodL: 1.15 };
  const glow = new THREE.PointLight('#ffffff', 0, 6, 2); glow.position.set(0, 2.2, 0); scene.add(glow);
  api.focus = (names, color) => { focus = names; focusCol = color || '#ffffff'; C.highlight(names, focusCol); glow.color.set(focusCol); };
  addEventListener('pointermove', e => { mx = e.clientX / innerWidth - .5; my = e.clientY / innerHeight - .5; }, { passive: true });
  addEventListener('resize', () => {
    camera.aspect = innerWidth / innerHeight; camera.updateProjectionMatrix();
    renderer.setSize(innerWidth, innerHeight, false); composer && composer.setSize(innerWidth, innerHeight);
  });

  const camPos = new THREE.Vector3(8, 4, 10), look = new THREE.Vector3(0, 1, 0), tgt = new THREE.Vector3();
  let last = performance.now();
  (function loop() {
    requestAnimationFrame(loop);
    const now = performance.now(), dt = Math.min((now - last) / 1000, .05), t = now / 1000; last = now;
    const h = document.documentElement, p = clamp(h.scrollTop / ((h.scrollHeight - h.clientHeight) || 1));
    // the car comes apart as the page opens, then each part waits to be picked
    ex = lerp(ex, focus ? .62 : .42, 1 - Math.exp(-dt * 2));
    C.explode(ex, RM ? 0 : t, focus);
    const want = focus ? (FACE[[].concat(focus)[0]] ?? -.55) : -.55 + p * 1.1;
    rotY = lerp(rotY, want, 1 - Math.exp(-dt * 2.2));
    C.car.rotation.y = rotY + (RM ? 0 : Math.sin(t * .15) * .06);
    glow.intensity = lerp(glow.intensity, focus ? 18 : 0, 1 - Math.exp(-dt * 3));
    const th = lerp(-.35, .35, p), r = lerp(12.5, 11, p);
    tgt.set(Math.sin(th) * r - mx * 1.4, 4.2 + Math.sin(p * Math.PI) * 1.0 + my * .8, Math.cos(th) * r);
    const k = window.__snap ? 1 : 1 - Math.exp(-dt * 2.5);
    camPos.lerp(tgt, k); camera.position.copy(camPos); camera.lookAt(look);
    shift = lerp(shift, mobile ? 0 : .22, 1 - Math.exp(-dt * 3));
    camera.setViewOffset(innerWidth, innerHeight, -innerWidth * shift, 0, innerWidth, innerHeight);
    C.wheels.forEach((w, i) => { w.rotation.x += dt * (focus ? .6 : .2) * (i % 2 ? 1 : -1); });
    composer ? composer.render() : renderer.render(scene, camera);
  })();
} catch (err) { console.warn('WebGL off:', err); canvas.style.display = 'none'; }
window.garage = api;
