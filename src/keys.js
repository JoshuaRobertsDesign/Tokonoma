// ── Keys the skin adds to Video.js's hotkeys ─────────────────────────────────────
//   P / N   previous / next chapter
//   S       open or close the settings door
//   Z       magnifier on / off
//   , / .   one frame back / forward (pausing first)
// and a washi readout that wipes in over the picture when volume, mute, speed or
// chapter change from the keyboard. Video.js handles the volume and speed keys
// itself; this only watches for them so it can show the result.

const RATE_LABEL = (r) => (r === 1 ? 'Normal' : `${r}×`);
const READOUT_KEYS = new Set(['ArrowUp', 'ArrowDown', '<', '>', 'm', 'M']);
const SEEK_KEYS = { ArrowLeft: -5, ArrowRight: 5, j: -10, J: -10, l: 10, L: 10 };
const pad2 = (n) => String(n).padStart(2, '0');
const clock = (s) => {
  s = Math.max(0, Math.floor(s || 0));
  const h = Math.floor(s / 3600);
  const m = Math.floor((s % 3600) / 60);
  return h ? `${h}:${pad2(m)}:${pad2(s % 60)}` : `${pad2(m)}:${pad2(s % 60)}`;
};
const HOLD = 1100;   // how long the readout stays after the last change
const EDITABLE = 'input:not([type="range"]):not([type="checkbox"]):not([type="radio"]):not([type="button"]), textarea, select, [contenteditable=""], [contenteditable="true"]';

export function initKeys(container, video, { settings } = {}) {
  const osd = container.querySelector('.tk-osd');
  const label = osd?.querySelector('.tk-osd-label');
  const value = osd?.querySelector('.tk-osd-value');
  const announcer = document.createElement('p');
  announcer.className = 'tk-sr';
  announcer.setAttribute('aria-live', 'polite');
  container.append(announcer);

  // ── Readout ─────────────────────────────────────────────────────────────────
  let hideTimer = 0;
  let resetTimer = 0;
  let kind = null;
  const rates = () => {
    const list = [...container.querySelectorAll('[data-rate]')].map((b) => Number(b.dataset.rate));
    return list.length ? list : [0.5, 2];
  };
  const chapters = () => {
    const t = video.textTracks ? [...video.textTracks].find((x) => x.kind === 'chapters') : null;
    if (!t) return [];
    if (t.mode === 'disabled') t.mode = 'hidden';
    return [...(t.cues || [])].map((c) => ({ start: c.startTime, end: c.endTime, title: c.text }));
  };
  const chapterAt = (list, time) => {
    const i = list.findIndex((c) => time >= c.start && time < c.end);
    return i < 0 ? (time >= (list.at(-1)?.end ?? Infinity) ? list.length - 1 : 0) : i;
  };

  function paint(what, extra) {
    if (!osd) return;
    let icon;
    let text;
    let fill;
    if (what === 'volume') {
      const v = video.muted ? 0 : video.volume;
      icon = v === 0 ? 'vol-off' : v < 0.5 ? 'vol-low' : 'vol-high';
      text = ['Volume', video.muted ? 'Muted' : `${Math.round(v * 100)}%`];
      fill = v;
    } else if (what === 'speed') {
      const list = rates();
      const lo = Math.min(...list);
      const hi = Math.max(...list);
      icon = 'speed';
      text = ['Speed', RATE_LABEL(video.playbackRate)];
      fill = (video.playbackRate - lo) / (hi - lo || 1);
    } else if (what === 'seek') {
      icon = extra.dir < 0 ? 'back' : 'forward';
      text = [`${extra.dir < 0 ? 'Back' : 'Forward'} ${extra.step} s`, clock(video.currentTime)];
      fill = video.duration ? video.currentTime / video.duration : 0;
    } else if (what === 'frame') {
      const fps = Math.round(1 / frameDur);
      const t = video.currentTime;
      icon = 'frame';
      text = ['Frame', `${clock(t)} · ${pad2(Math.floor((t % 1) * fps + 1e-3) + 1)}`];
      fill = video.duration ? t / video.duration : 0;
    } else if (what === 'note') {
      icon = extra.icon;
      text = [extra.label, extra.value];
      fill = extra.fill ?? 1;
    } else {
      const { i, list } = extra;
      icon = 'chapter';
      text = [`Chapter ${i + 1} / ${list.length}`, list[i].title];
      fill = (i + 1) / list.length;
    }
    osd.dataset.icon = icon;
    label.textContent = text[0];
    value.textContent = text[1];
    osd.style.setProperty('--tk-osd-fill', String(Math.min(Math.max(fill, 0), 1)));
  }

  function show(what, extra) {
    if (!osd) return;
    kind = what;
    paint(what, extra);
    // Video.js announces volume and speed itself; the skin's own readouts are announced here
    if (what === 'seek' || what === 'frame' || what === 'note') announcer.textContent = `${label.textContent}, ${value.textContent}`;
    clearTimeout(hideTimer);
    clearTimeout(resetTimer);
    osd.dataset.state = 'in';
    hideTimer = setTimeout(() => {
      osd.dataset.state = 'out';
      kind = null;
      // once it has wiped away, park it on the left so the next one wipes in again
      resetTimer = setTimeout(() => { osd.dataset.state = ''; }, 420);
    }, HOLD);
  }

  // other parts of the skin (resume, save still) show their notes here too
  container.tkReadout = (what, extra) => show(what, extra);

  // keep a visible readout in step if the value settles a moment later
  video.addEventListener('volumechange', () => { if (kind === 'volume') paint('volume'); });
  video.addEventListener('seeked', () => { if (kind === 'seek' || kind === 'frame') paint(kind, lastExtra); });

  // ── Frames ──────────────────────────────────────────────────────────────────
  // the frame rate is read from the video as it plays (where the browser can
  // report frames); until then, 30 fps
  let frameDur = 1 / 30;
  if (typeof video.requestVideoFrameCallback === 'function') {
    let prev = null;
    const onFrame = (_now, meta) => {
      if (prev && video.playbackRate === 1) {
        const frames = meta.presentedFrames - prev.presentedFrames;
        const d = (meta.mediaTime - prev.mediaTime) / (frames || 1);
        if (frames > 0 && d > 0.008 && d < 0.1) frameDur = frameDur * 0.8 + d * 0.2;
      }
      prev = meta;
      video.requestVideoFrameCallback(onFrame);
    };
    video.requestVideoFrameCallback(onFrame);
  }
  function stepFrame(dir) {
    if (!video.duration) return;
    video.pause();
    const n = Math.round(video.currentTime / frameDur) + dir;
    video.currentTime = Math.min(Math.max((n + 0.1) * frameDur, 0), video.duration - 0.001);
    lastExtra = null;
    show('frame');
  }
  let lastExtra = null;

  // ── Double-tap (or double-click) to the sides: Video.js seeks 10 s; show it ──
  let tapAt = 0;
  let tapSide = 0;
  let pending = null;
  container.addEventListener('pointerup', (e) => {
    const alcove = container.querySelector('.tk-alcove');
    if (!alcove || !alcove.contains(e.target) || e.target.closest('button, input, a, .tk-mm, .tk-floor')) { tapAt = 0; return; }
    const r = alcove.getBoundingClientRect();
    const x = (e.clientX - r.left) / r.width;
    const side = x < 0.35 ? -1 : x > 0.65 ? 1 : 0;
    const now = performance.now();
    if (side && side === tapSide && now - tapAt < 400) {
      pending = { dir: side, at: now };
      tapAt = 0;
    } else { tapAt = now; tapSide = side; }
  });
  video.addEventListener('seeking', () => {
    if (pending && performance.now() - pending.at < 600) {
      lastExtra = { dir: pending.dir, step: 10 };
      show('seek', lastExtra);
    }
    pending = null;
  });
  video.addEventListener('ratechange', () => { if (kind === 'speed') paint('speed'); });

  // ── Chapters ────────────────────────────────────────────────────────────────
  function skipChapter(dir) {
    const list = chapters();
    if (!list.length) return false;
    const t = video.currentTime;
    const i = chapterAt(list, t);
    let to;
    if (dir > 0) to = Math.min(i + 1, list.length - 1);
    // back: to the start of this chapter, or the one before if we're near its start
    else to = t - list[i].start > 3 ? i : Math.max(i - 1, 0);
    if (dir > 0 && to === i) { show('chapter', { i, list }); return true; }
    video.currentTime = list[to].start + 0.01;
    show('chapter', { i: to, list });
    announcer.textContent = `Chapter ${to + 1} of ${list.length}: ${list[to].title}`;
    return true;
  }

  // ── Keys ────────────────────────────────────────────────────────────────────
  container.addEventListener('keydown', (e) => {
    if (e.ctrlKey || e.metaKey || e.altKey) return;
    if (e.target.closest?.(EDITABLE)) return;
    const key = e.key;

    // Video.js's hotkeys mark the events they act on; show what changed
    if (key in SEEK_KEYS) {
      setTimeout(() => {
        if (!e.defaultPrevented) return;
        lastExtra = { dir: Math.sign(SEEK_KEYS[key]), step: Math.abs(SEEK_KEYS[key]) };
        show('seek', lastExtra);
      }, 0);
      return;
    }
    if (READOUT_KEYS.has(key)) {
      setTimeout(() => {
        if (!e.defaultPrevented) return;
        show(key === '<' || key === '>' ? 'speed' : 'volume');
      }, 0);
      return;
    }
    if (e.defaultPrevented) return;

    const k = key.toLowerCase();
    if (key === ',' || key === '.') {
      e.preventDefault();
      stepFrame(key === '.' ? 1 : -1);
    } else if (k === 'n' || k === 'p') {
      if (skipChapter(k === 'n' ? 1 : -1)) e.preventDefault();
    } else if (k === 'z' && !e.repeat) {
      e.preventDefault();
      container.toggleAttribute('data-magnifier');
      if (container.hasAttribute('data-magnifier')) settings?.close({ returnFocus: true });
    } else if (k === 's' && settings && !e.repeat) {
      e.preventDefault();
      if (settings.isOpen()) settings.close({ returnFocus: true });
      else settings.open();
    }
  });
}
