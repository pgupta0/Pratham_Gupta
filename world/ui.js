/* ui.js: markers over the world, the walk-up prompt, place panels, quick-travel map,
   phone joystick, progress, loader hand-off and the list view. */
import * as THREE from 'three';
import { PLACES, PRODUCTS, PERSON, placeById, spotById } from './content.js';
import { PLOTS, RING, ISLAND, SPOKES, arrivalFor } from './layout.js';

const $ = s => document.querySelector(s);
const esc = s => String(s ?? '').replace(/[&<>"]/g, c => ({ '&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;' }[c]));
const icons = () => window.lucide && window.lucide.createIcons();
const SPOT_ICON = {
  contracts: 'handshake', fleet: 'bus-front', dispatch: 'radio-tower', fuel: 'fuel', records: 'folder-open',
  econ: 'book-open', rotaract: 'users', dmaic: 'workflow', certs: 'scroll-text', cases: 'trophy', roar: 'mic',
  deans: 'presentation', opscom: 'settings-2', preql: 'database', shelves: 'shopping-cart', returns: 'undo-2',
  dashboard: 'monitor', audit: 'clipboard-check', dock: 'truck', 'transit-one': 'smartphone', finbuddy: 'coins',
  crave: 'bike', chhatri: 'home', techstars: 'award', theomi: 'message-circle', music: 'music', pool: 'circle-dot',
  food: 'utensils', travel: 'plane',
};
const TOTAL = PLACES.reduce((n, p) => n + p.spots.length, 0);

/* ---------- panel content ---------- */
export function spotHTML(place, spot, { inList = false } = {}) {
  const prod = spot.product && PRODUCTS[spot.product];
  let h = '';
  const kicker = spot.kicker || place.kicker || '';
  if (!inList) h += `<div class="phead"><span class="pico"><i data-lucide="${esc(place.icon)}" class="ic"></i></span><div><div class="pk">${esc(kicker)}</div><div class="pn">${esc(place.name)}</div></div></div>`;
  else h += `<div class="pk">${esc(place.name)}${kicker ? ' · ' + esc(kicker) : ''}</div>`;
  h += `<h2${inList ? '' : ' id="ptitle"'}>${esc(prod ? prod.name : spot.title)}</h2>`;
  if (spot.id === 'main' && place.role && !prod) h += `<div class="role">${esc(place.role)}</div>`;
  if (prod) {
    h += `<div class="status"><i></i>${esc(prod.status)} · ${esc(prod.kicker)}</div>`;
    h += `<p class="lead">${esc(prod.summary)}</p>`;
    h += `<div class="shot${prod.phone ? ' phone' : ''}"><img src="${esc(prod.image)}" alt="${esc(prod.name)} interface" loading="lazy" onerror="this.parentNode.remove()"></div>`;
    h += `<div class="qa"><h4>The question</h4><p>${esc(prod.problem)}</p></div><div class="qa"><h4>What I built</h4><p>${esc(prod.build)}</p></div><div class="qa"><h4>Where it stands</h4><p>${esc(prod.state)}</p></div>`;
    h += `<div class="lab">Built with</div><div class="chips">${prod.stack.map(s => `<span>${esc(s)}</span>`).join('')}</div>`;
    h += `<div class="links">${prod.links.map(([l, u], i) => `<a class="btn${i ? ' ghost' : ''}" href="${esc(u)}"${/^https?:/.test(u) ? ' target="_blank" rel="noopener"' : ''}>${esc(l)} <i data-lucide="arrow-up-right" class="ic"></i></a>`).join('')}</div>`;
    return h;
  }
  if (spot.lead) h += `<p class="lead">${esc(spot.lead)}</p>`;
  if (spot.image) h += `<div class="shot"><img src="${esc(spot.image)}" alt="${esc(spot.title)}" loading="lazy" onerror="this.parentNode.remove()"></div>`;
  if (spot.metrics) h += `<div class="lab">Result</div><div class="mets">${spot.metrics.map(([b, s]) => `<div class="met"><b>${esc(b)}</b><span>${esc(s)}</span></div>`).join('')}</div>`;
  if (spot.rows) h += `<div class="rows">${spot.rows.map(([a, b, c]) => `<div><b>${esc(a)}</b><span>${esc(b)}</span><em>${esc(c)}</em></div>`).join('')}</div>`;
  if (spot.bullets) h += `<div class="lab">${spot.metrics ? 'How' : 'What'}</div><ul class="bl">${spot.bullets.map(b => `<li>${esc(b)}</li>`).join('')}</ul>`;
  if (spot.skills) h += `<div class="lab">Skills</div><div class="chips">${spot.skills.map(s => `<span>${esc(s)}</span>`).join('')}</div>`;
  if (spot.contact) {
    h += `<div class="links">
      <a class="btn" href="mailto:${PERSON.email}"><i data-lucide="mail" class="ic"></i>${PERSON.email}</a>
      <a class="btn ghost" href="tel:${PERSON.tel}"><i data-lucide="phone" class="ic"></i>${PERSON.phone}</a>
      <a class="btn ghost" href="${PERSON.linkedin}" target="_blank" rel="noopener"><i data-lucide="linkedin" class="ic"></i>LinkedIn</a>
      <button class="btn ghost" type="button" data-copy="${PERSON.email}"><i data-lucide="copy" class="ic"></i>Copy email</button></div>`;
  }
  return h;
}

export function listHTML() {
  let h = `<section><div class="pk" style="--c:#FF6A2B">${esc(PERSON.status)} · MBA 2027, BITSoM</div><h2 style="margin-top:8px;font-size:30px;font-weight:800;letter-spacing:-.04em">${esc(PERSON.line)}</h2><p class="lead">${esc(PERSON.sub)}</p>
    <div class="links"><a class="btn" href="mailto:${PERSON.email}">${PERSON.email}</a><a class="btn ghost" href="${PERSON.linkedin}" target="_blank" rel="noopener">LinkedIn</a></div></section>`;
  for (const place of PLACES) {
    if (place.id === 'plaza') continue;
    for (const spot of place.spots) h += `<section class="panel-like" style="--c:${place.color}">${spotHTML(place, spot, { inList: true })}</section>`;
  }
  return h;
}

/* ---------- map svg ---------- */
function mapSVG() {
  const S = 300 / (ISLAND * 2 + 40), X = x => 150 + x * S, Z = z => 150 + z * S;
  let s = `<svg viewBox="0 0 300 300" role="img" aria-label="Map of the town"><defs><filter id="sh"><feDropShadow dx="0" dy="1" stdDeviation="1.2" flood-opacity=".25"/></filter></defs>`;
  s += `<rect x="${X(-ISLAND - 6)}" y="${Z(-ISLAND - 6)}" width="${(ISLAND * 2 + 12) * S}" height="${(ISLAND * 2 + 12) * S}" rx="${30 * S}" fill="#EADFC8"/>`;
  s += `<rect x="${X(-ISLAND + 6)}" y="${Z(-ISLAND + 6)}" width="${(ISLAND * 2 - 12) * S}" height="${(ISLAND * 2 - 12) * S}" rx="${24 * S}" fill="#A9D07C"/>`;
  for (const sp of SPOKES) s += `<line x1="${X(sp.from[0])}" y1="${Z(sp.from[1])}" x2="${X(sp.to[0])}" y2="${Z(sp.to[1])}" stroke="#7d828a" stroke-width="${sp.w * S}" stroke-linecap="round"/>`;
  s += `<circle cx="150" cy="150" r="${RING.r * S}" fill="none" stroke="#6b7078" stroke-width="${RING.w * S}"/>`;
  s += `<circle cx="150" cy="150" r="${16 * S}" fill="#E5DCCB"/>`;
  for (const p of PLACES) {
    const pl = PLOTS[p.id]; if (!pl) continue;
    s += `<g class="plot" data-place="${p.id}" filter="url(#sh)"><rect x="${X(pl.cx - pl.w / 2)}" y="${Z(pl.cz - pl.d / 2)}" width="${pl.w * S}" height="${pl.d * S}" rx="4" fill="${p.color}" fill-opacity=".9"/>`;
    s += `<text x="${X(pl.cx)}" y="${Z(pl.cz) + 3}" text-anchor="middle" font-family="Inter,system-ui" font-size="${p.id === 'team' ? 0 : 8.5}" font-weight="700" fill="#fff">${esc(p.label)}</text></g>`;
  }
  s += `<g id="mapme"><circle r="5.5" fill="#fff"/><circle r="3.6" fill="#16191D"/></g></svg>`;
  return { svg: s, X, Z };
}

/* ---------- UI ---------- */
export async function createUI({ spots, player, world, camera, scene }) {
  const html = document.documentElement;
  const touch = matchMedia('(hover: none), (pointer: coarse)').matches;
  if (touch) html.classList.add('touch');
  const setNarrow = () => html.classList.toggle('narrow', innerWidth < 760); setNarrow(); addEventListener('resize', setNarrow);
  let seen = new Set(); try { seen = new Set(JSON.parse(localStorage.getItem('pt-seen') || '[]')); } catch (_) {}
  const saveSeen = () => { try { localStorage.setItem('pt-seen', JSON.stringify([...seen])); } catch (_) {} };

  /* markers + ground rings */
  const layer = $('#markers');
  const items = spots.map(s => {
    const hit = spotById(s.id); if (!hit) return null;
    const { place, spot } = hit, main = spot.id === 'main';
    const el = document.createElement('button');
    el.type = 'button'; el.className = 'mk' + (main ? '' : ' sub'); el.style.setProperty('--c', place.color);
    const title = spot.product ? PRODUCTS[spot.product].name : spot.title;
    el.setAttribute('aria-label', `${place.name}: ${title}`);
    el.innerHTML = `<span class="tag">${esc(main ? place.label : title)}${main ? `<small>${esc(place.name)}</small>` : ''}</span><span class="pin"><i data-lucide="${main ? place.icon : (SPOT_ICON[spot.id] || 'sparkles')}" class="ic"></i></span>`;
    el.addEventListener('click', e => { e.stopPropagation(); visit(s.id); });
    layer.appendChild(el);
    return { s, el, place, spot, main, pos: new THREE.Vector3(s.x, s.y ?? 3.5, s.z), w: 0, h: 0 };
  }).filter(Boolean);
  icons();
  const ringGeo = new THREE.RingGeometry(.95, 1.25, 40); ringGeo.rotateX(-Math.PI / 2);
  const rings = new THREE.InstancedMesh(ringGeo, new THREE.MeshBasicMaterial({ transparent: true, opacity: .85, depthWrite: false, toneMapped: false }), items.length);
  const discGeo = new THREE.CircleGeometry(1.25, 40); discGeo.rotateX(-Math.PI / 2);
  const discs = new THREE.InstancedMesh(discGeo, new THREE.MeshBasicMaterial({ transparent: true, opacity: .22, depthWrite: false, toneMapped: false }), items.length);
  const m4 = new THREE.Matrix4(), col = new THREE.Color();
  items.forEach((it, i) => { m4.makeTranslation(it.s.x, .22, it.s.z); rings.setMatrixAt(i, m4); discs.setMatrixAt(i, m4); col.set(it.place.color); rings.setColorAt(i, col); discs.setColorAt(i, col); });
  rings.renderOrder = discs.renderOrder = 2; scene.add(rings, discs);
  const syncSeen = () => { items.forEach(it => it.el.classList.toggle('seen', seen.has(it.s.id))); updateFound(); };

  /* prompt */
  const prompt = $('#prompt');
  let near = null;
  prompt.querySelector('button').addEventListener('click', () => near && open(near.s.id));

  /* panel */
  const panel = $('#panel'), pScroll = panel.querySelector('.scroll'), pMore = panel.querySelector('.more');
  let current = null, lastFocus = null;
  function open(id, { travel = false } = {}) {
    const hit = spotById(id); if (!hit) return;
    const { place, spot } = hit;
    if (travel && player) {
      const it = items.find(x => x.s.id === id);
      if (spot.id === 'main' || !it) { const a = arrivalFor(place.id); if (it) player.teleport(it.s.x, it.s.z + (place.id === 'plaza' ? 2.5 : 0), a.heading); else player.teleport(a.x, a.z, a.heading); }
      else player.teleport(it.s.x, it.s.z);
    }
    if (!panel.classList.contains('on')) lastFocus = document.activeElement;
    current = id;
    panel.style.setProperty('--c', place.color);
    pScroll.innerHTML = spotHTML(place, spot); pScroll.scrollTop = 0;
    const others = place.spots;
    if (others.length > 1) {
      pMore.hidden = false;
      pMore.innerHTML = `<div class="lab">More at ${esc(place.label.toLowerCase() === place.name.toLowerCase() ? 'this place' : place.name)}</div><div class="list">${others.map(o => {
        const full = `${place.id}.${o.id}`, t = o.product ? PRODUCTS[o.product].name : (o.id === 'main' ? 'Overview' : o.title);
        return `<button type="button" data-go="${full}" class="${full === id ? 'cur' : ''} ${seen.has(full) ? 'seen' : ''}"><i class="v"></i>${esc(t)}</button>`;
      }).join('')}</div>`;
    } else pMore.hidden = true;
    panel.classList.add('on'); panel.setAttribute('aria-hidden', 'false'); document.body.classList.add('panel-open');
    icons();
    if (!seen.has(id)) { seen.add(id); saveSeen(); syncSeen(); if (seen.size === TOTAL) toast('You found every spot in town. Thank you for exploring!'); }
    setTimeout(() => panel.querySelector('.close').focus({ preventScroll: true }), 50);
  }
  function close() {
    if (!panel.classList.contains('on')) return;
    panel.classList.remove('on'); panel.setAttribute('aria-hidden', 'true'); document.body.classList.remove('panel-open'); current = null;
    if (lastFocus && lastFocus.focus && document.contains(lastFocus)) lastFocus.focus({ preventScroll: true }); else $('#world').focus({ preventScroll: true });
  }
  panel.querySelector('.close').addEventListener('click', close);
  pMore.addEventListener('click', e => { const b = e.target.closest('[data-go]'); if (!b) return; visit(b.dataset.go, { fromPanel: true }); });
  panel.addEventListener('click', async e => {
    const b = e.target.closest('[data-copy]'); if (!b) return;
    try { await navigator.clipboard.writeText(b.dataset.copy); toast('Email copied'); } catch (_) { toast(b.dataset.copy); }
  });

  // click a marker / a "more" chip: walk there if close, glide there if far, then open
  function visit(id, { fromPanel = false } = {}) {
    const it = items.find(x => x.s.id === id);
    if (!player || !it) { open(id); return; }
    const d = Math.hypot(it.s.x - player.position.x, it.s.z - player.position.z);
    if (d < 3.2) { open(id); return; }
    if (fromPanel) close();
    if (d > 70) { open(id, { travel: true }); return; }
    player.goTo(it.s.x, it.s.z, () => open(id));
    if (!fromPanel && d > 14) toast(`Walking to ${it.main ? it.place.label : (it.spot.product ? PRODUCTS[it.spot.product].name : it.spot.title)}…`);
  }

  /* map */
  const map = $('#map'), { svg, X, Z } = mapSVG();
  map.querySelector('.mapart').innerHTML = svg;
  map.querySelector('.places').innerHTML = PLACES.map(p => `<button class="place" type="button" data-place="${p.id}" style="--c:${p.color}"><span class="pi"><i data-lucide="${p.icon}" class="ic"></i></span><span><b>${esc(p.name)}</b><span>${esc(p.label)}</span></span><em data-count="${p.id}"></em></button>`).join('');
  const travelTo = pid => { closeMap(); close(); setTimeout(() => open(`${pid}.main`, { travel: true }), 120); };
  map.addEventListener('click', e => {
    const t = e.target.closest('[data-place]'); if (t) { travelTo(t.dataset.place); return; }
    if (e.target === map) closeMap();
  });
  map.querySelector('.close').addEventListener('click', () => closeMap());
  map.querySelector('[data-list]').addEventListener('click', () => { closeMap(); openList(); });
  let mapFocus = null;
  function openMap() {
    mapFocus = document.activeElement; map.classList.add('on'); map.setAttribute('aria-hidden', 'false');
    PLACES.forEach(p => { const n = p.spots.filter(s => seen.has(`${p.id}.${s.id}`)).length; const em = map.querySelector(`[data-count="${p.id}"]`); if (em) em.textContent = `${n} / ${p.spots.length}`; });
    if (player) { const me = map.querySelector('#mapme'); me.setAttribute('transform', `translate(${X(player.position.x)},${Z(player.position.z)})`); }
    icons(); setTimeout(() => map.querySelector('.place').focus({ preventScroll: true }), 60);
  }
  function closeMap() { if (!map.classList.contains('on')) return; map.classList.remove('on'); map.setAttribute('aria-hidden', 'true'); if (mapFocus && mapFocus.focus) mapFocus.focus({ preventScroll: true }); }
  $('#btn-map').addEventListener('click', openMap);
  $('#btn-contact').addEventListener('click', () => open('team.main'));

  /* found counter with a mini map */
  const fc = $('#found canvas'), fg = fc.getContext('2d');
  function updateFound() {
    $('#found b').textContent = `${seen.size} / ${TOTAL}`;
    const W = fc.width = fc.height = 192, k = W / (ISLAND * 2 + 30), P = (x) => W / 2 + x * k;
    fg.fillStyle = '#9ED2E6'; fg.fillRect(0, 0, W, W);
    fg.fillStyle = '#A9D07C'; fg.beginPath(); fg.roundRect(P(-ISLAND), P(-ISLAND), ISLAND * 2 * k, ISLAND * 2 * k, 20 * k); fg.fill();
    fg.strokeStyle = '#7d828a'; fg.lineWidth = RING.w * k; fg.beginPath(); fg.arc(W / 2, W / 2, RING.r * k, 0, Math.PI * 2); fg.stroke();
    for (const p of PLACES) { const pl = PLOTS[p.id]; if (!pl) continue; const all = p.spots.every(s => seen.has(`${p.id}.${s.id}`)); fg.fillStyle = p.color; fg.globalAlpha = all ? 1 : .55; fg.fillRect(P(pl.cx - pl.w / 2), P(pl.cz - pl.d / 2), pl.w * k, pl.d * k); }
    fg.globalAlpha = 1; drawMe();
  }
  const base = document.createElement('canvas');
  function drawMe() {
    if (!player) return;
    const W = 192, k = W / (ISLAND * 2 + 30);
    if (!base.width) { base.width = base.height = W; }
    const x = W / 2 + player.position.x * k, z = W / 2 + player.position.z * k;
    fg.save(); fg.fillStyle = '#fff'; fg.beginPath(); fg.arc(x, z, 7, 0, 7); fg.fill(); fg.fillStyle = '#16191D'; fg.beginPath(); fg.arc(x, z, 4.5, 0, 7); fg.fill(); fg.restore();
  }
  $('#found').addEventListener('click', openMap);
  $('#found').addEventListener('keydown', e => { if (e.key === 'Enter' || e.key === ' ') { e.preventDefault(); openMap(); } });
  syncSeen();

  /* joystick */
  if (touch && player) {
    const joy = $('#joy'), knob = joy.querySelector('i'); let jid = null, cx = 0, cy = 0;
    const set = (x, y) => { const R = 52, d = Math.hypot(x, y), k = d > R ? R / d : 1; knob.style.transform = `translate(${x * k}px,${y * k}px)`; player.setInput(x * k / R, -y * k / R); };
    joy.addEventListener('pointerdown', e => { jid = e.pointerId; const r = joy.getBoundingClientRect(); cx = r.left + r.width / 2; cy = r.top + r.height / 2; set(e.clientX - cx, e.clientY - cy); joy.setPointerCapture(e.pointerId); e.preventDefault(); });
    joy.addEventListener('pointermove', e => { if (e.pointerId === jid) set(e.clientX - cx, e.clientY - cy); });
    const end = e => { if (e.pointerId !== jid) return; jid = null; knob.style.transform = ''; player.setInput(0, 0); };
    joy.addEventListener('pointerup', end); joy.addEventListener('pointercancel', end);
  }

  /* hint fades once the visitor has moved a bit */
  const hint = $('#hint'); let moved = 0;
  const startHint = () => setTimeout(() => hint.classList.add('off'), 16000);
  if (document.body.classList.contains('entered')) startHint(); else addEventListener('world:enter', startHint, { once: true });

  /* list view */
  const list = $('#listview');
  const openList = () => window.__openList && window.__openList(false);

  /* keys */
  addEventListener('keydown', e => {
    if (e.target.closest && e.target.closest('input,textarea')) return;
    if (e.key === 'Escape') { if (map.classList.contains('on')) closeMap(); else if (list.classList.contains('on')) window.__closeList(); else close(); return; }
    if (list.classList.contains('on') || document.querySelector('.loader:not(.out)')) return;
    if (e.key === 'Tab' && map.classList.contains('on')) {
      const f = [...map.querySelectorAll('button')], i = f.indexOf(document.activeElement);
      if (e.shiftKey && i <= 0) { e.preventDefault(); f[f.length - 1].focus(); } else if (!e.shiftKey && (i === f.length - 1 || i < 0)) { e.preventDefault(); f[0].focus(); }
      return;
    }
    if (e.code === 'KeyM') { map.classList.contains('on') ? closeMap() : openMap(); return; }
    if ((e.code === 'KeyE' || e.code === 'Enter') && near && !panel.classList.contains('on') && !map.classList.contains('on') && document.activeElement.tagName !== 'BUTTON' && document.activeElement.tagName !== 'A') { e.preventDefault(); open(near.s.id); }
  });

  /* per frame: markers follow the world, nearest spot prompt */
  const v = new THREE.Vector3(); let pulse = 0, fcT = 0;
  function update(dt) {
    pulse += dt;
    const W = innerWidth, H = innerHeight, pp = player ? player.position : null;
    let best = null, bd = 2.8;
    for (const it of items) {
      v.copy(it.pos).project(camera);
      const dCam = camera.position.distanceTo(it.pos);
      const nearPlayer = pp ? Math.hypot(it.s.x - pp.x, it.s.z - pp.z) : 0;
      const show = v.z < 1 && Math.abs(v.x) < 1.15 && Math.abs(v.y) < 1.15 && dCam < 230 && (it.main || !pp || nearPlayer < 42);
      if (!show) { if (!it.el.classList.contains('hide')) it.el.classList.add('hide'); continue; }
      it.el.classList.remove('hide');
      const x = (v.x * .5 + .5) * W, y = (-v.y * .5 + .5) * H, s = Math.max(.7, Math.min(1.12, 46 / dCam + .45));
      it.el.style.transform = `translate(${x}px,${y}px) translate(-50%,-100%) scale(${s.toFixed(3)})`;
      if (pp && nearPlayer < bd) { bd = nearPlayer; best = it; }
    }
    if (best !== near) {
      items.forEach(it => it.el.classList.toggle('near', it === best));
      near = best;
      document.body.classList.toggle('near-spot', !!best);
      if (best) {
        prompt.style.setProperty('--c', best.place.color);
        prompt.querySelector('b').textContent = best.spot.product ? PRODUCTS[best.spot.product].name : (best.main ? best.place.name : best.spot.title);
        prompt.querySelector('small').textContent = best.main ? best.place.label : best.place.name;
      }
    }
    prompt.classList.toggle('on', !!near && !panel.classList.contains('on'));
    const sc = 1 + Math.sin(pulse * 3) * .06;
    items.forEach((it, i) => { m4.makeScale(sc, 1, sc).setPosition(it.s.x, .22, it.s.z); rings.setMatrixAt(i, m4); });
    rings.instanceMatrix.needsUpdate = true;
    if (player && player.speed > .5) { moved += dt; if (moved > 4) hint.classList.add('off'); }
    fcT += dt; if (fcT > .5 && player) { fcT = 0; updateFound(); }
  }

  const api = { open, close, openMap, closeMap, openList, update, visit, get near() { return near; }, get current() { return current; } };
  return api;
}

/* ---------- toasts (module level so the loader can use them too) ---------- */
let tt;
export function toast(text) {
  const t = $('#toast'); if (!t) return;
  t.textContent = text; t.classList.add('on'); clearTimeout(tt); tt = setTimeout(() => t.classList.remove('on'), 2400);
}
