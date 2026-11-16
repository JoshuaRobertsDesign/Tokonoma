// ── Save a clip ──────────────────────────────────────────────────────────────────
// With data-clip="on": mark a start and an end (I and O as it plays, the Clip
// view in the settings door, or by dragging the two pegs in the groove), then
// Save clip. The stretch is played through once and recorded as it plays — so
// saving takes as long as the clip — and downloaded as MP4 or WebM, whichever the
// browser records.
//
// Chrome and Edge record the video element's own stream. Safari and Firefox
// can't, so there the frames are drawn to a canvas and the sound is routed
// through Web Audio. Either way the video must be CORS-clean (Mux and same-site
// files are). Clips run up to five minutes.

import { download, slug } from './still.js';

const MAX = 300;          // seconds
const MIN_LEN = 0.5;
const DEFAULT_LEN = 10;
const pad2 = (n) => String(n).padStart(2, '0');
const clock = (s) => {
  s = Math.max(0, Math.floor(s || 0));
  const h = Math.floor(s / 3600);
  const m = Math.floor((s % 3600) / 60);
  return h ? `${h}:${pad2(m)}:${pad2(s % 60)}` : `${pad2(m)}:${pad2(s % 60)}`;
};
// H.264 MP4 where the browser records it (opens everywhere), then WebM; a bare
// "video/mp4" last, since some browsers put VP9 in it, which fewer apps open
const TYPES = [
  'video/mp4;codecs=avc1.42E01E,mp4a.40.2',
  'video/mp4;codecs=avc1,mp4a',
  'video/webm;codecs=vp9,opus',
  'video/webm;codecs=vp8,opus',
  'video/webm',
  'video/mp4',
];
const pickType = () => (window.MediaRecorder ? TYPES.find((t) => MediaRecorder.isTypeSupported?.(t)) : null);
const audioGraphs = new WeakMap();   // one Web Audio route per video element, made once

export function initClip(container, video, host = video) {
  const layer = container.querySelector('.tk-clip');
  const band = layer?.querySelector('.tk-clip-band');
  const pegs = { in: layer?.querySelector('[data-edge="in"]'), out: layer?.querySelector('[data-edge="out"]') };
  const card = container.querySelector('.tk-clipcard');
  const panel = container.querySelector('.tk-mm');
  const row = panel?.querySelector('[data-goto="clip"]');
  const keyHelp = panel?.querySelector('[data-clip-key]');
  const note = (label, value, fill) => container.tkReadout?.('note', { icon: 'clip', label, value, fill });

  let a = null; // start (s)
  let b = null; // end (s)
  let job = null; // the recording in progress

  const enabled = () => container.getAttribute('data-clip') === 'on';
  const dur = () => (isFinite(video.duration) ? video.duration : 0);
  const isSet = () => a != null && b != null && b - a >= MIN_LEN;

  // ── Drawing ───────────────────────────────────────────────────────────────────
  function render() {
    const on = enabled();
    if (row) row.hidden = !on;
    if (keyHelp) keyHelp.hidden = !on;
    const d = dur();
    const set = on && isSet() && d > 0;
    container.toggleAttribute('data-clip-set', set);
    if (set) {
      container.style.setProperty('--tk-clip-a', `${(a / d) * 100}%`);
      container.style.setProperty('--tk-clip-b', `${(b / d) * 100}%`);
      for (const [edge, t] of [['in', a], ['out', b]]) {
        const peg = pegs[edge];
        peg.setAttribute('aria-valuemax', String(Math.floor(d)));
        peg.setAttribute('aria-valuenow', String(Math.floor(t)));
        peg.setAttribute('aria-valuetext', clock(t));
      }
    }
    const len = set ? clock(b - a) : '';
    const put = (sel, text) => { const el = panel?.querySelector(sel); if (el) el.textContent = text; };
    put('[data-value="clip"]', set ? `${clock(a)}–${clock(b)}` : 'Not set');
    put('[data-value="clip-in"]', a != null ? clock(a) : '--:--');
    put('[data-value="clip-out"]', b != null ? clock(b) : '--:--');
    put('[data-value="clip-len"]', len);
    const save = panel?.querySelector('[data-action="clip-save"]');
    if (save) {
      save.disabled = !set && !job;
      save.querySelector('.tk-mm-label').textContent = job ? 'Cancel' : 'Save clip';
    }
    const clear = panel?.querySelector('[data-action="clip-clear"]');
    if (clear) clear.disabled = a == null && b == null;
    if (card) {
      card.querySelector('.tk-clipcard-len').textContent = job ? '' : len;
      card.querySelector('.tk-clipcard-label').textContent = job ? 'Cancel' : 'Save clip';
    }
  }

  // ── Marks ─────────────────────────────────────────────────────────────────────
  function setEdge(edge, t, { announce = true } = {}) {
    const d = dur();
    if (!d || job) return;
    t = Math.max(0, Math.min(d, t));
    if (edge === 'in') {
      a = t;
      if (b == null || b - a < MIN_LEN) b = Math.min(d, a + DEFAULT_LEN);
      if (b - a < MIN_LEN) a = Math.max(0, b - MIN_LEN);
    } else {
      b = t;
      if (a == null || b - a < MIN_LEN) a = Math.max(0, b - DEFAULT_LEN);
      if (b - a < MIN_LEN) b = Math.min(d, a + MIN_LEN);
    }
    if (b - a > MAX) {
      if (edge === 'in') b = a + MAX; else a = b - MAX;
    }
    render();
    if (announce) note(edge === 'in' ? 'Clip start' : 'Clip end', `${clock(a)}–${clock(b)} · ${clock(b - a)}`, d ? b / d : 1);
  }
  function clear() {
    if (job) return;
    a = b = null;
    render();
  }

  // dragging a peg along the groove (it doesn't seek: the pegs sit above the slider)
  for (const [edge, peg] of Object.entries(pegs)) {
    if (!peg) continue;
    peg.addEventListener('pointerdown', (e) => {
      if (job) return;
      e.preventDefault();
      e.stopPropagation();
      peg.setPointerCapture(e.pointerId);
      peg.toggleAttribute('data-dragging', true);
      const move = (m) => {
        const r = layer.getBoundingClientRect();
        const t = ((m.clientX - r.left) / r.width) * dur();
        // a peg can't pass the other one
        if (edge === 'in') a = Math.max(0, Math.min(t, b - MIN_LEN));
        else b = Math.min(dur(), Math.max(t, a + MIN_LEN));
        render();
      };
      const up = () => {
        peg.removeEventListener('pointermove', move);
        peg.removeAttribute('data-dragging');
        note(edge === 'in' ? 'Clip start' : 'Clip end', `${clock(a)}–${clock(b)} · ${clock(b - a)}`, b / (dur() || 1));
      };
      peg.addEventListener('pointermove', move);
      peg.addEventListener('pointerup', up, { once: true });
      peg.addEventListener('pointercancel', up, { once: true });
    });
    // arrows: a second (Shift: five) at a time
    peg.addEventListener('keydown', (e) => {
      const step = e.shiftKey ? 5 : 1;
      const dir = { ArrowLeft: -1, ArrowDown: -1, ArrowRight: 1, ArrowUp: 1 }[e.key];
      if (!dir || job) return;
      e.preventDefault();
      e.stopPropagation();
      if (edge === 'in') a = Math.max(0, Math.min(a + dir * step, b - MIN_LEN));
      else b = Math.min(dur(), Math.max(b + dir * step, a + MIN_LEN));
      render();
    });
  }

  // ── Recording ─────────────────────────────────────────────────────────────────
  function streamFor() {
    // Chrome / Edge: the element's own stream (Firefox's version mutes the page, so not there)
    if (typeof video.captureStream === 'function') {
      return { stream: video.captureStream(), stop() {} };
    }
    // Safari / Firefox: frames through a canvas, sound through Web Audio
    const w = video.videoWidth;
    const h = video.videoHeight;
    const scale = Math.min(1, 1920 / Math.max(w, h));
    const canvas = document.createElement('canvas');
    canvas.width = Math.round(w * scale);
    canvas.height = Math.round(h * scale);
    const ctx = canvas.getContext('2d');
    let raf = 0;
    const paint = () => { ctx.drawImage(video, 0, 0, canvas.width, canvas.height); raf = requestAnimationFrame(paint); };
    paint();
    const stream = canvas.captureStream(30);
    try {
      let g = audioGraphs.get(video);
      if (!g) {
        const ac = new (window.AudioContext || window.webkitAudioContext)();
        const src = ac.createMediaElementSource(video);
        src.connect(ac.destination);          // keep it audible on the page
        const dest = ac.createMediaStreamDestination();
        src.connect(dest);
        g = { ac, dest };
        audioGraphs.set(video, g);
      }
      g.ac.resume?.();
      for (const t of g.dest.stream.getAudioTracks()) stream.addTrack(t);
    } catch { /* no sound in this browser's clip */ }
    return { stream, stop() { cancelAnimationFrame(raf); } };
  }

  async function save() {
    if (job) { finish(false); return; }
    if (!isSet()) { note('Save clip', 'Mark a start and an end first'); return; }
    const type = pickType();
    if (!type) { note('Save clip', 'Not supported in this browser'); return; }
    if (!video.videoWidth) { note('Save clip', 'Play the video first'); return; }

    const restore = { rate: video.playbackRate, loop: video.loop };
    const ext = type.startsWith('video/mp4') ? 'mp4' : 'webm';
    const name = `${slug(container.querySelector('.tk-title')?.textContent)}-${pad2(Math.floor(a / 60))}m${pad2(Math.floor(a % 60))}s-${pad2(Math.floor(b / 60))}m${pad2(Math.floor(b % 60))}s.${ext}`;

    video.pause();
    video.currentTime = a;
    await new Promise((r) => video.addEventListener('seeked', r, { once: true }));

    let source;
    let rec;
    try {
      source = streamFor();
      rec = new MediaRecorder(source.stream, { mimeType: type, videoBitsPerSecond: 8_000_000 });
    } catch {
      source?.stop();
      note('Save clip', "This video can't be recorded here");
      return;
    }
    const chunks = [];
    rec.ondataavailable = (e) => { if (e.data && e.data.size) chunks.push(e.data); };
    job = { rec, source, restore, name, type, chunks, ok: false, ending: false };
    container.toggleAttribute('data-clip-recording', true);
    render();

    // stop when the end is reached; stop (without saving) if anyone else seeks or pauses
    const watch = () => {
      if (!job) return;
      const t = video.currentTime;
      container.style.setProperty('--tk-clip-p', String(Math.min(1, Math.max(0, (t - a) / (b - a)))));
      if (t >= b - 0.02 || video.ended) { finish(true); return; }
      job.raf = requestAnimationFrame(watch);
    };
    job.onPause = () => { if (job && !job.ending) finish(false); };
    job.onSeek = () => { if (job && !job.ending) finish(false); };
    job.tick = setInterval(() => {
      if (job) note('Recording clip', `${clock(video.currentTime - a)} / ${clock(b - a)}`, (video.currentTime - a) / (b - a));
    }, 500);

    rec.start(250);
    video.loop = false;
    video.playbackRate = 1;
    try { await video.play(); } catch { finish(false); return; }
    video.addEventListener('pause', job.onPause);
    video.addEventListener('seeking', job.onSeek);
    job.raf = requestAnimationFrame(watch);
  }

  function finish(ok) {
    if (!job || job.ending) return;
    const j = job;
    j.ending = true;
    j.ok = ok;
    cancelAnimationFrame(j.raf);
    clearInterval(j.tick);
    video.removeEventListener('pause', j.onPause);
    video.removeEventListener('seeking', j.onSeek);
    video.pause();
    video.playbackRate = j.restore.rate;
    video.loop = j.restore.loop;
    j.rec.onstop = () => {
      j.source.stop();
      job = null;
      container.removeAttribute('data-clip-recording');
      container.style.removeProperty('--tk-clip-p');
      render();
      if (!j.ok) { note('Clip cancelled', 'Nothing was saved', 0); return; }
      const blob = new Blob(j.chunks, { type: j.type.split(';')[0] });
      if (!blob.size) { note('Save clip', "Couldn't record this video"); return; }
      download(blob, j.name);
      note('Clip saved', `Downloaded as ${j.name.split('.').pop().toUpperCase()}`);
    };
    if (j.rec.state !== 'inactive') j.rec.stop(); else j.rec.onstop();
  }

  // ── Wiring ────────────────────────────────────────────────────────────────────
  card?.querySelector('.tk-clipcard-save')?.addEventListener('click', save);
  card?.querySelector('.tk-clipcard-clear')?.addEventListener('click', clear);
  video.addEventListener('loadedmetadata', () => { a = b = null; render(); });
  video.addEventListener('durationchange', render);
  new MutationObserver(() => {
    if (!enabled()) { if (job) finish(false); a = b = null; }
    render();
  }).observe(container, { attributes: true, attributeFilter: ['data-clip'] });
  render();

  container.tkClip = {
    mark: (edge) => { if (enabled()) setEdge(edge, video.currentTime); },
    save: () => { if (enabled()) save(); },
    clear,
    enabled,
  };
  return container.tkClip;
}
