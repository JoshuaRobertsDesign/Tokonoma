// ── Remembered choices ───────────────────────────────────────────────────────────
// Speed, volume (and mute), colour scheme and sound are kept in localStorage and
// brought back on the next visit, and so is where you left off in each video.
// (Picture settings are kept by menu.js.) Without
// storage — private windows, blocked site data — everything simply starts fresh.

const KEY = 'tokonoma.prefs';

const read = () => {
  try { return JSON.parse(localStorage.getItem(KEY) || '{}') || {}; } catch { return {}; }
};
const write = (patch) => {
  try { localStorage.setItem(KEY, JSON.stringify({ ...read(), ...patch })); } catch { /* not available */ }
};

export function initPrefs(container, video) {
  // a page with several players can leave some out: data-remember="off"
  if (container.dataset.remember === 'off') return;
  const saved = read();
  if (saved.theme) container.setAttribute('data-theme', saved.theme);
  if (saved.sound) container.setAttribute('data-sound', saved.sound);

  // media settings: applied now, and again whenever a source (re)loads, since a
  // new source resets the playback rate
  let restoring = false;
  const restore = () => {
    const p = read();
    restoring = true;
    if (Number.isFinite(p.volume)) video.volume = Math.min(1, Math.max(0, p.volume));
    if (typeof p.muted === 'boolean') video.muted = p.muted;
    if (Number.isFinite(p.rate) && p.rate > 0) {
      video.defaultPlaybackRate = p.rate;
      video.playbackRate = p.rate;
    }
    setTimeout(() => { restoring = false; }, 0);
  };
  restore();
  video.addEventListener('loadedmetadata', restore);

  video.addEventListener('volumechange', () => {
    if (!restoring) write({ volume: video.volume, muted: video.muted });
  });
  video.addEventListener('ratechange', () => {
    if (restoring) return;
    video.defaultPlaybackRate = video.playbackRate;
    write({ rate: video.playbackRate });
  });
  new MutationObserver(() => {
    write({ theme: container.getAttribute('data-theme') || undefined, sound: container.getAttribute('data-sound') || 'off' });
  }).observe(container, { attributes: true, attributeFilter: ['data-theme', 'data-sound'] });

  initResume(container, video);
}

// ── Where you left off ───────────────────────────────────────────────────────────
// Each video's place is kept (by its address) while it plays; coming back picks
// up there, with a note in the readout. Near the start or the end, it starts
// fresh; watching to the end forgets the place.
const RESUME_KEY = 'tokonoma.resume';
const readResume = () => {
  try { return JSON.parse(localStorage.getItem(RESUME_KEY) || '{}') || {}; } catch { return {}; }
};
const writeResume = (map) => {
  try { localStorage.setItem(RESUME_KEY, JSON.stringify(map)); } catch { /* not available */ }
};
const pad2 = (n) => String(n).padStart(2, '0');
const clock = (s) => {
  s = Math.max(0, Math.floor(s || 0));
  const h = Math.floor(s / 3600);
  const m = Math.floor((s % 3600) / 60);
  return h ? `${h}:${pad2(m)}:${pad2(s % 60)}` : `${pad2(m)}:${pad2(s % 60)}`;
};

function initResume(container, video) {
  const id = () => container.querySelector('.tk-video')?.getAttribute('src') || video.currentSrc || '';
  let restored = false;
  let lastSave = 0;

  const save = (force) => {
    const key = id();
    if (!key || !video.duration || !isFinite(video.duration)) return;
    const now = Date.now();
    if (!force && now - lastSave < 4000) return;
    lastSave = now;
    const map = readResume();
    const t = video.currentTime;
    if (t < 10 || t > video.duration - 15) delete map[key];
    else map[key] = { t: Math.round(t * 10) / 10, at: now };
    // keep the 20 most recent
    const keep = Object.entries(map).sort((a, b) => b[1].at - a[1].at).slice(0, 20);
    writeResume(Object.fromEntries(keep));
  };

  const restore = () => {
    if (restored) return;
    restored = true;
    const saved = readResume()[id()];
    if (!saved || !video.duration || saved.t < 10 || saved.t > video.duration - 15) return;
    video.currentTime = saved.t;
    // shown once the readout is ready (it's set up just after this)
    setTimeout(() => container.tkReadout?.('note', {
      icon: 'resume', label: 'Resumed', value: clock(saved.t), fill: saved.t / video.duration,
    }), 300);
  };

  if (video.readyState >= 1) restore();
  else video.addEventListener('loadedmetadata', restore, { once: true });
  video.addEventListener('timeupdate', () => { if (!video.paused) save(false); });
  video.addEventListener('pause', () => save(true));
  video.addEventListener('seeked', () => { if (video.paused) save(true); });
  video.addEventListener('ended', () => {
    const map = readResume();
    delete map[id()];
    writeResume(map);
  });
  addEventListener('pagehide', () => save(true));
}
