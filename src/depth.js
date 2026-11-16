// ── Parallax depth ───────────────────────────────────────────────────────────────
// The wall drifts a few pixels against the frame as the pointer moves over the
// player (or as a phone tilts), so the alcove reads as a real recess. It holds
// still while the floor is rising or sinking, and is off with reduced motion or
// data-depth="off". On iOS, tilt needs permission, and asking pops up a prompt:
// so there depth starts off, and asks only when it's switched on (askTilt, from
// the settings door's Depth toggle or the demo's switch).

const clamp = (n) => Math.max(-1, Math.min(1, n));
// only iPhone and iPad ask with a prompt (other browsers may have the method too)
const appleTouch = () => /iP(hone|ad|od)/.test(navigator.userAgent)
  || (navigator.platform === 'MacIntel' && navigator.maxTouchPoints > 1);
const needsAsk = () => typeof window.DeviceOrientationEvent?.requestPermission === 'function' && appleTouch();
let tiltAllowed = false;

// call from a tap: iOS only shows its prompt in answer to one
export function askTilt() {
  if (!needsAsk() || tiltAllowed) return;
  window.DeviceOrientationEvent.requestPermission()
    .then((state) => { tiltAllowed = state === 'granted'; })
    .catch(() => {});
}

export function initDepth(container) {
  const alcove = container.querySelector('.tk-alcove');
  if (!alcove) return;
  const reduce = matchMedia('(prefers-reduced-motion: reduce)');
  const enabled = () => container.getAttribute('data-depth') !== 'off' && !reduce.matches;
  const amplitude = () => (container.clientWidth <= 600 ? 2.5 : 4);
  // iPhone and iPad: off until asked for
  if (needsAsk() && !tiltAllowed) container.setAttribute('data-depth', 'off');

  let tx = 0; let ty = 0; // target offset (px)
  let cx = 0; let cy = 0; // current offset (px)
  let raf = 0;
  let holdUntil = 0;

  const write = () => {
    container.style.setProperty('--tk-px', `${cx.toFixed(2)}px`);
    container.style.setProperty('--tk-py', `${cy.toFixed(2)}px`);
  };
  const tick = (now) => {
    raf = 0;
    if (now < holdUntil) { raf = requestAnimationFrame(tick); return; }
    // ease towards the target: quick at first, settling gently (ease-out)
    cx += (tx - cx) * 0.09;
    cy += (ty - cy) * 0.09;
    if (Math.abs(tx - cx) < 0.01 && Math.abs(ty - cy) < 0.01) { cx = tx; cy = ty; write(); return; }
    write();
    raf = requestAnimationFrame(tick);
  };
  const aim = (nx, ny) => {
    const a = amplitude();
    // the wall moves away from the pointer, so the frame seems to sit nearer
    tx = -nx * a;
    ty = -ny * a;
    if (!raf) raf = requestAnimationFrame(tick);
  };

  const sync = () => {
    const on = enabled();
    container.toggleAttribute('data-depth-active', on);
    if (!on) { tx = ty = cx = cy = 0; write(); }
  };
  sync();
  reduce.addEventListener?.('change', sync);
  new MutationObserver(sync).observe(container, { attributes: true, attributeFilter: ['data-depth'] });

  container.addEventListener('pointermove', (e) => {
    if (e.pointerType === 'touch' || !enabled()) return;
    const r = alcove.getBoundingClientRect();
    aim(clamp(((e.clientX - r.left) / r.width) * 2 - 1), clamp(((e.clientY - r.top) / r.height) * 2 - 1));
  });
  container.addEventListener('pointerleave', () => aim(0, 0));

  // while the floor moves, hold the wall where it is
  new MutationObserver(() => {
    holdUntil = performance.now() + 650;
    if (!raf) raf = requestAnimationFrame(tick);
  }).observe(container, { attributes: true, attributeFilter: ['data-floor-up'] });

  // tilt, relative to how the phone is being held (the rest pose slowly re-centres)
  let base = null;
  window.addEventListener('deviceorientation', (e) => {
    if (!enabled() || e.gamma == null || e.beta == null) return;
    if (!base) base = { g: e.gamma, b: e.beta };
    base.g += (e.gamma - base.g) * 0.01;
    base.b += (e.beta - base.b) * 0.01;
    aim(clamp((e.gamma - base.g) / 18), clamp((e.beta - base.b) / 18));
  });
}
