// ── Remembered choices ───────────────────────────────────────────────────────────
// Speed, volume (and mute), colour scheme and sound are kept in localStorage and
// brought back on the next visit. (Picture settings are kept by menu.js.) Without
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
}
