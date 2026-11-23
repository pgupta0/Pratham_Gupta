/* Shared pieces for both games: keyboard + touch input, the chapter card
   that opens at each checkpoint, the finish card and small toasts. */
import { CHECKPOINTS, CONTACT } from './game-data.js';

export const keys = { left: false, right: false, up: false, down: false, jump: false };
let paused = false;
export const isPaused = () => paused;

const MAP = { ArrowLeft: 'left', KeyA: 'left', ArrowRight: 'right', KeyD: 'right', ArrowUp: 'up', KeyW: 'up', ArrowDown: 'down', KeyS: 'down', Space: 'jump' };
addEventListener('keydown', e => {
  const k = MAP[e.code];
  if (!k) return;
  if (!e.target.closest || !e.target.closest('input,textarea')) e.preventDefault();
  if (paused) return;
  keys[k] = true;
});
addEventListener('keyup', e => { const k = MAP[e.code]; if (k) keys[k] = false; });
addEventListener('blur', () => Object.keys(keys).forEach(k => (keys[k] = false)));

// on-screen buttons: <button data-k="left">…
export function bindTouch(root = document) {
  root.querySelectorAll('[data-k]').forEach(b => {
    const k = b.dataset.k;
    const on = e => { e.preventDefault(); if (!paused) { keys[k] = true; b.classList.add('on'); } try { b.setPointerCapture(e.pointerId); } catch (_) {} };
    const off = () => { keys[k] = false; b.classList.remove('on'); };
    b.addEventListener('pointerdown', on);
    ['pointerup', 'pointercancel', 'lostpointercapture'].forEach(t => b.addEventListener(t, off));
    b.addEventListener('contextmenu', e => e.preventDefault());
  });
}
export const touchDevice = matchMedia('(hover: none), (pointer: coarse)').matches;

const esc = s => String(s).replace(/[&<>"]/g, c => ({ '&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;' }[c]));
const icons = () => { if (window.lucide) window.lucide.createIcons(); };

let layer;
function getLayer() {
  if (!layer) { layer = document.createElement('div'); layer.className = 'glayer'; document.body.appendChild(layer); }
  return layer;
}

function openModal(html, color, actions) {
  return new Promise(resolve => {
    paused = true; Object.keys(keys).forEach(k => (keys[k] = false));
    const L = getLayer();
    L.innerHTML = `<div class="gcard" role="dialog" aria-modal="true" aria-labelledby="gct" style="--c:${color}">${html}</div>`;
    L.classList.add('on'); icons();
    const card = L.firstElementChild;
    const prevFocus = document.activeElement;
    const first = card.querySelector('[data-primary]') || card.querySelector('button,a');
    setTimeout(() => first && first.focus({ preventScroll: true }), 60);
    let opened = performance.now();
    let closed = false;
    const close = (val) => {
      if (closed) return; closed = true;
      removeEventListener('keydown', onKey, true);
      L.classList.remove('on');
      setTimeout(() => { if (!L.classList.contains('on')) L.innerHTML = ''; }, 260);
      paused = false; prevFocus && prevFocus.focus && prevFocus.focus({ preventScroll: true });
      resolve(val);
    };
    const onKey = e => {
      if (performance.now() - opened < 350) { if (e.code === 'Enter' || e.code === 'Space') e.preventDefault(); return; }
      if (e.code === 'Escape' || ((e.code === 'Enter' || e.code === 'Space') && document.activeElement === first && first.tagName === 'BUTTON')) {
        e.preventDefault(); e.stopPropagation(); close(first && first.dataset.act || 'close');
      } else if (e.code === 'Tab') {
        const f = [...card.querySelectorAll('button,a')]; if (!f.length) return;
        const i = f.indexOf(document.activeElement);
        if (e.shiftKey && i <= 0) { e.preventDefault(); f[f.length - 1].focus(); }
        else if (!e.shiftKey && i === f.length - 1) { e.preventDefault(); f[0].focus(); }
      }
    };
    addEventListener('keydown', onKey, true);
    card.querySelectorAll('[data-act]').forEach(b => b.addEventListener('click', e => {
      const a = b.dataset.act;
      if (actions && actions[a]) { e.preventDefault(); actions[a](); }
      if (b.tagName === 'BUTTON') close(a);
    }));
    card.querySelectorAll('[data-copy]').forEach(b => b.addEventListener('click', async () => {
      try { await navigator.clipboard.writeText(b.dataset.copy); toast('Email copied', color); } catch (_) { toast(b.dataset.copy, color); }
    }));
  });
}

export function showCard(cp, { found, total, verb = 'Keep driving' }) {
  let body = '';
  const kick = cp.rows ? `Bonus · ${esc(cp.when)}` : `Pit stop ${esc(cp.n)} · ${esc(cp.when)}`;
  if (cp.mets) body += `<div class="glab">Result</div><div class="gmets">${cp.mets.map(([b, s]) => `<div><b>${esc(b)}</b><span>${esc(s)}</span></div>`).join('')}</div>`;
  if (cp.rows) body += `<ul class="grows">${cp.rows.map(([a, b, c]) => `<li><b>${esc(a)}</b><span>${esc(b)}</span><em>${esc(c)}</em></li>`).join('')}</ul>`;
  if (cp.skills) body += `<div class="glab">Skills unlocked</div><div class="gups">${cp.skills.map(s => `<span>+ ${esc(s)}</span>`).join('')}</div>`;
  if (cp.link) body += `<a class="glink" href="${esc(cp.link[1])}">${esc(cp.link[0])} <i data-lucide="arrow-up-right" class="ic"></i></a>`;
  const html = `
    <div class="ghead"><span class="gico"><i data-lucide="${esc(cp.icon)}" class="ic"></i></span><span class="gk">${kick}</span></div>
    <h2 id="gct">${esc(cp.title)}</h2>
    <div class="grole">${esc(cp.role)}</div>
    <p class="gwhy">${esc(cp.why)}</p>
    ${body}
    <div class="gfoot"><span class="gcount">${found} / ${total} found</span>
      <button class="gbtn" data-primary data-act="close" type="button">${esc(verb)} <kbd>Enter</kbd></button></div>`;
  return openModal(html, cp.color);
}

export function showFinish({ found, total, other, otherName, again }) {
  const cp = CHECKPOINTS[CHECKPOINTS.length - 1];
  const all = found >= total;
  const html = `
    <div class="ghead"><span class="gico"><i data-lucide="flag" class="ic"></i></span><span class="gk">Finish · ${found} / ${total} found</span></div>
    <h2 id="gct">${esc(cp.title)}</h2>
    <p class="gwhy">${all ? "You've seen the whole story." : 'You can go back for the ones you missed.'} ${esc(cp.why)}</p>
    <div class="gcontact">
      <a class="gbtn" data-primary href="mailto:${CONTACT.email}"><i data-lucide="mail" class="ic"></i>${CONTACT.email}</a>
      <a class="gbtn ghost" href="tel:${CONTACT.tel}"><i data-lucide="phone" class="ic"></i>${CONTACT.phone}</a>
      <a class="gbtn ghost" href="${CONTACT.linkedin}" target="_blank" rel="noopener"><i data-lucide="linkedin" class="ic"></i>LinkedIn</a>
      <button class="gbtn ghost" type="button" data-copy="${CONTACT.email}"><i data-lucide="copy" class="ic"></i>Copy email</button>
    </div>
    <div class="gfoot wrap2">
      <button class="gtext" type="button" data-act="again"><i data-lucide="rotate-ccw" class="ic"></i>${all ? 'Play again' : 'Keep exploring'}</button>
      <a class="gtext" href="${other}" data-act="other"><i data-lucide="gamepad-2" class="ic"></i>Try ${esc(otherName)}</a>
      <a class="gtext" href="index.html?visit" data-act="visit"><i data-lucide="compass" class="ic"></i>Visit the site</a>
    </div>`;
  return openModal(html, cp.color, { again });
}

let tt;
export function toast(text, color = '#2EF2C3') {
  let t = document.querySelector('.gtoast');
  if (!t) { t = document.createElement('div'); t.className = 'gtoast'; t.setAttribute('role', 'status'); t.setAttribute('aria-live', 'polite'); document.body.appendChild(t); }
  t.textContent = text; t.style.setProperty('--c', color);
  t.classList.remove('on'); void t.offsetWidth; t.classList.add('on');
  clearTimeout(tt); tt = setTimeout(() => t.classList.remove('on'), 1600);
}

// intro screen: resolves when the player starts
export function intro() {
  return new Promise(resolve => {
    const el = document.getElementById('gintro');
    if (!el) return resolve();
    paused = true; icons();
    const btn = el.querySelector('[data-start]');
    setTimeout(() => btn && btn.focus({ preventScroll: true }), 80);
    const go = () => { el.classList.add('off'); paused = false; removeEventListener('keydown', onKey, true); setTimeout(() => el.remove(), 500); resolve(); };
    const onKey = e => { if (e.code === 'Enter' || e.code === 'Space') { e.preventDefault(); e.stopPropagation(); go(); } };
    addEventListener('keydown', onKey, true);
    btn && btn.addEventListener('click', go);
  });
}
