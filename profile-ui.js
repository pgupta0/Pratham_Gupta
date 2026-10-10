'use strict';
window.profileDialog = (() => {
  let active = null, opener = null, previousOverflow = '', siblings = [];
  const focusable = () => [...active.querySelectorAll('a[href],button:not([disabled]),[tabindex="0"]')].filter(el => el.getClientRects().length);
  function open(dialog, trigger) {
    active = dialog; opener = trigger || document.activeElement;
    previousOverflow = document.body.style.overflow;
    document.body.style.overflow = 'hidden';
    siblings = [...document.body.children].filter(el => el !== dialog).map(el => [el, el.inert]);
    siblings.forEach(([el]) => { el.inert = true; });
    dialog.setAttribute('aria-hidden', 'false');
    focusable()[0]?.focus({preventScroll:true});
  }
  function close() {
    if (!active) return;
    active.setAttribute('aria-hidden', 'true');
    siblings.forEach(([el, inert]) => { el.inert = inert; });
    document.body.style.overflow = previousOverflow;
    active = null;
    opener?.focus({preventScroll:true});
  }
  document.addEventListener('keydown', event => {
    if (!active || event.key !== 'Tab') return;
    const items = focusable();
    if (!items.length) return;
    const index = items.indexOf(document.activeElement);
    if (event.shiftKey && index <= 0) { event.preventDefault(); items.at(-1).focus(); }
    else if (!event.shiftKey && (index < 0 || index === items.length - 1)) { event.preventDefault(); items[0].focus(); }
  });
  return {open, close};
})();
