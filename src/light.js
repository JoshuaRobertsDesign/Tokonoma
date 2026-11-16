// ── Light through paper ──────────────────────────────────────────────────────────
// A few times a second, the picture is shrunk onto a tiny canvas and averaged. The
// washi surfaces (seek door, title card, preview card, settings door) take on a
// little of that colour, as paper glows with whatever light is behind it. Only the
// paper is tinted, never the text. data-paper-light="off" turns it off.
//
// Reading pixels needs a CORS-clean video (Mux and same-origin files are); if the
// browser refuses, the paper simply stays plain.

const AMOUNT = '16%';
const EVERY = 400; // ms between samples while playing

export function initLight(container, video) {
  const canvas = document.createElement('canvas');
  canvas.width = 24;
  canvas.height = 14;
  let ctx = null;
  try { ctx = canvas.getContext('2d', { willReadFrequently: true }); } catch { /* no canvas */ }
  if (!ctx) return;

  let timer = 0;
  let blocked = false;
  const enabled = () => !blocked && container.getAttribute('data-paper-light') !== 'off';
  const setAmount = (on) => container.style.setProperty('--tk-light-amt', on ? AMOUNT : '0%');

  function sample() {
    if (!enabled()) return;
    if (video.readyState < 2 || !video.videoWidth) return;
    let data;
    try {
      ctx.drawImage(video, 0, 0, canvas.width, canvas.height);
      data = ctx.getImageData(0, 0, canvas.width, canvas.height).data;
    } catch {
      blocked = true; // a tainted canvas: leave the paper plain
      stop();
      setAmount(false);
      return;
    }
    let r = 0; let g = 0; let b = 0;
    const n = data.length / 4;
    for (let i = 0; i < data.length; i += 4) { r += data[i]; g += data[i + 1]; b += data[i + 2]; }
    r /= n * 255; g /= n * 255; b /= n * 255;
    // keep the hue, temper the saturation and lift it to a light, paper-safe tone
    const max = Math.max(r, g, b);
    const min = Math.min(r, g, b);
    const l = (max + min) / 2;
    const d = max - min;
    let h = 0;
    let s = 0;
    if (d > 0.0001) {
      s = d / (1 - Math.abs(2 * l - 1));
      if (max === r) h = 60 * (((g - b) / d) % 6);
      else if (max === g) h = 60 * ((b - r) / d + 2);
      else h = 60 * ((r - g) / d + 4);
    }
    if (h < 0) h += 360;
    const sat = Math.min(s * 1.25, 0.62) * 100;
    container.style.setProperty('--tk-light', `hsl(${h.toFixed(0)} ${sat.toFixed(0)}% 64%)`);
    setAmount(true);
  }

  function start() {
    if (!timer && enabled()) timer = setInterval(sample, EVERY);
    sample();
  }
  function stop() {
    clearInterval(timer);
    timer = 0;
  }

  video.addEventListener('play', start);
  video.addEventListener('pause', stop);
  video.addEventListener('ended', stop);
  video.addEventListener('seeked', sample);
  video.addEventListener('loadeddata', sample);
  document.addEventListener('visibilitychange', () => {
    if (document.hidden) stop();
    else if (!video.paused) start();
  });
  new MutationObserver(() => {
    if (enabled()) { if (!video.paused) start(); else sample(); }
    else { stop(); setAmount(false); }
  }).observe(container, { attributes: true, attributeFilter: ['data-paper-light'] });
  if (!video.paused) start(); else sample();
}
