// ── Magnifier ────────────────────────────────────────────────────────────────────
// A round lens over the picture that shows the live frame enlarged. Turned on from
// the settings door's toggle strip, or with Z; Esc turns it off. It follows the
// mouse; on touch, press and drag on the picture and the lens rides above your
// finger, showing what's under the lens itself (not under the finger). The wheel (or trackpad) over the lens changes the zoom, 1.5× to 5×; with Ctrl
// (⌘, or a pinch) it changes the lens's size.

const MIN = 1.5;
const MAX = 5;

export function initMagnifier(container, video, { host = video } = {}) {
  const alcove = container.querySelector('.tk-alcove');
  if (!alcove) return;
  const posterImg = container.querySelector('.tk-poster img');

  const lens = document.createElement('div');
  lens.className = 'tk-lens';
  lens.setAttribute('aria-hidden', 'true');
  const canvas = document.createElement('canvas');
  const tag = document.createElement('span');
  tag.className = 'tk-lens-zoom';
  lens.append(canvas, tag);
  alcove.append(lens);
  const ctx = canvas.getContext('2d');

  let zoom = 2.5;
  let x = 0; // lens centre, relative to the alcove (CSS px)
  let y = 0; // (on touch, already lifted above the finger)
  let lift = 0; // on touch, the lens sits above the finger
  let visible = false;
  let raf = 0;
  let last = null; // last pointer position over the picture

  const on = () => container.hasAttribute('data-magnifier');
  const showZoom = () => { tag.textContent = `${zoom.toFixed(1).replace(/\.0$/, '')}×`; };
  showZoom();

  function place(px, py) {
    const r = alcove.getBoundingClientRect();
    x = Math.max(0, Math.min(r.width, px));
    // the lens shows exactly the picture beneath it, so sample where it sits
    y = Math.max(0, Math.min(r.height, py - lift));
    lens.style.translate = `${x}px ${y}px`;
  }
  function show(v) {
    visible = v;
    lens.toggleAttribute('data-visible', v);
    if (v && !raf) raf = requestAnimationFrame(draw);
  }

  // what's under the lens centre, mapped through object-fit into source pixels
  function draw() {
    raf = 0;
    if (!visible) return;
    const D = lens.offsetWidth;
    const dpr = Math.min(window.devicePixelRatio || 1, 2);
    const px = Math.max(1, Math.round(D * dpr));
    if (canvas.width !== px) { canvas.width = px; canvas.height = px; }
    ctx.clearRect(0, 0, px, px);

    const live = video.readyState >= 2 && video.videoWidth > 0 && container.hasAttribute('data-started');
    const el = live ? video : (posterImg?.complete && posterImg.naturalWidth ? posterImg : null);
    if (el) {
      const sw = el.videoWidth || el.naturalWidth;
      const sh = el.videoHeight || el.naturalHeight;
      const r = el.getBoundingClientRect();
      const a = alcove.getBoundingClientRect();
      const fit = getComputedStyle(el).objectFit;
      const scale = fit === 'cover' ? Math.max(r.width / sw, r.height / sh) : Math.min(r.width / sw, r.height / sh);
      const left = r.left + (r.width - sw * scale) / 2;
      const top = r.top + (r.height - sh * scale) / 2;
      const sx = (a.left + x - left) / scale;
      const sy = (a.top + y - top) / scale;
      const span = D / zoom / scale;
      // the picture adjustments (brightness, warmth…) apply inside the lens too
      const filter = getComputedStyle(host).filter;
      canvas.style.filter = filter && filter !== 'none' ? filter : '';
      try { ctx.drawImage(el, sx - span / 2, sy - span / 2, span, span, 0, 0, px, px); } catch { /* not drawable yet */ }
    }
    raf = requestAnimationFrame(draw);
  }

  const local = (e) => {
    const r = alcove.getBoundingClientRect();
    return { px: e.clientX - r.left, py: e.clientY - r.top };
  };

  alcove.addEventListener('pointermove', (e) => {
    last = local(e);
    if (!on()) return;
    if (e.pointerType === 'touch' && !e.pressure && e.buttons === 0) return;
    lift = e.pointerType === 'touch' ? lens.offsetWidth * 0.75 : 0;
    place(last.px, last.py);
    show(true);
  });
  alcove.addEventListener('pointerdown', (e) => {
    if (!on() || e.pointerType !== 'touch') return;
    last = local(e);
    lift = lens.offsetWidth * 0.75;
    place(last.px, last.py);
    show(true);
  });
  const hide = (e) => { if (e.pointerType === 'touch' || e.type === 'pointerleave') show(false); };
  alcove.addEventListener('pointerup', hide);
  alcove.addEventListener('pointercancel', hide);
  alcove.addEventListener('pointerleave', (e) => { last = null; hide(e); });

  // the wheel zooms; with Ctrl (or ⌘, or a trackpad pinch) it grows or shrinks the lens
  let sizeTimer = 0;
  alcove.addEventListener('wheel', (e) => {
    if (!on() || !visible) return;
    e.preventDefault();
    if (e.ctrlKey || e.metaKey) {
      const r = alcove.getBoundingClientRect();
      const max = Math.max(120, Math.min(440, Math.min(r.width, r.height) * 0.9));
      const size = Math.round(Math.max(88, Math.min(max, lens.offsetWidth * (e.deltaY < 0 ? 1.08 : 1 / 1.08))));
      lens.style.setProperty('--tk-lens', `${size}px`);
      tag.textContent = `${size}px`;
      clearTimeout(sizeTimer);
      sizeTimer = setTimeout(showZoom, 900);
      if (!raf) raf = requestAnimationFrame(draw);
      return;
    }
    zoom = Math.max(MIN, Math.min(MAX, zoom * (e.deltaY < 0 ? 1.12 : 1 / 1.12)));
    clearTimeout(sizeTimer);
    showZoom();
  }, { passive: false });

  // Esc puts the lens away (the settings door takes Esc first when it's open)
  container.addEventListener('keydown', (e) => {
    if (e.key === 'Escape' && on() && !e.defaultPrevented) {
      container.removeAttribute('data-magnifier');
      e.preventDefault();
    }
  });

  new MutationObserver(() => {
    const active = on();
    container.toggleAttribute('data-lens-touch', active);
    if (!active) { show(false); return; }
    // switched on: appear where the pointer is, or in the middle of the picture
    const r = alcove.getBoundingClientRect();
    lift = 0;
    place(last ? last.px : r.width / 2, last ? last.py : r.height / 2);
    show(true);
  }).observe(container, { attributes: true, attributeFilter: ['data-magnifier'] });
}
