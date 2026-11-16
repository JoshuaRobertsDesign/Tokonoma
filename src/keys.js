// ── Keys the skin adds to Video.js's hotkeys ─────────────────────────────────────
//   P / N   previous / next chapter
//   S       open or close the settings door
//   Z       magnifier on / off
// and a washi readout that wipes in over the picture when volume, mute, speed or
// chapter change from the keyboard. Video.js handles the volume and speed keys
// itself; this only watches for them so it can show the result.

const RATE_LABEL = (r) => (r === 1 ? 'Normal' : `${r}×`);
const READOUT_KEYS = new Set(['ArrowUp', 'ArrowDown', '<', '>', 'm', 'M']);
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

  // keep a visible readout in step if the value settles a moment later
  video.addEventListener('volumechange', () => { if (kind === 'volume') paint('volume'); });
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
    if (READOUT_KEYS.has(key)) {
      setTimeout(() => {
        if (!e.defaultPrevented) return;
        show(key === '<' || key === '>' ? 'speed' : 'volume');
      }, 0);
      return;
    }
    if (e.defaultPrevented) return;

    const k = key.toLowerCase();
    if (k === 'n' || k === 'p') {
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
