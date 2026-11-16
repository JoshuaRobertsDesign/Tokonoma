// Tokonoma — a shoji-style skin for Video.js v10.
// Video.js provides the player state and accessible controls; this file only mirrors a
// few of those states onto the container so the CSS can choreograph the alcove.

import './fonts.css';
import '@videojs/html/video/player';
import '@videojs/html/video/ui';
import '@videojs/html/ui/status-announcer';
import '@videojs/html/media/mux-video';
import { initSettings } from './menu.js';
import { initKeys } from './keys.js';
import { initSound } from './sound.js';
import { initPrefs } from './prefs.js';
import { initLight } from './light.js';
import { initSeal } from './seal.js';
import { initDepth } from './depth.js';
import { initMagnifier } from './magnifier.js';
import { initCaptions } from './captions.js';

const pad = (n) => String(n).padStart(2, '0');

/** 92.4 → "01:32"; 3725 → "1:02:05". Fixed-width digits suit JetBrains Mono. */
export function formatTime(seconds) {
  if (!Number.isFinite(seconds) || seconds < 0) return '--:--';
  const s = Math.floor(seconds);
  const h = Math.floor(s / 3600);
  const m = Math.floor((s % 3600) / 60);
  return h ? `${h}:${pad(m)}:${pad(s % 60)}` : `${pad(m)}:${pad(s % 60)}`;
}

/** "1:05" or "1:02:05" (Video.js format) → "01:05" / "1:02:05". */
function repadTime(text) {
  const parts = (text || '').trim().split(':').map(Number);
  if (parts.some(Number.isNaN) || parts.length < 2) return text;
  const secs = parts.reduce((acc, p) => acc * 60 + p, 0);
  return formatTime(secs);
}

const ERRORS = {
  1: { label: 'aborted', title: 'Playback stopped', desc: 'Loading was interrupted. Try again.' },
  2: { label: 'network', title: 'This video couldn’t load', desc: 'Check your connection and try again.' },
  3: { label: 'decode', title: 'This video couldn’t play', desc: 'The file looks damaged or incomplete.' },
  4: { label: 'source', title: 'This video couldn’t load', desc: 'The video is missing or its format isn’t supported.' },
};

function setFlag(el, name, on) {
  if (on) el.setAttribute(name, '');
  else el.removeAttribute(name);
}

function initTokonoma(container) {
  // The media element: <mux-video> streams from Mux and keeps its real <video>
  // in a shadow root. Everything here talks to that inner <video> (same events,
  // text tracks, frame callbacks and picture-in-picture identity); only loading
  // and stream errors go through the outer element.
  const host = container.querySelector('.tk-video');
  const video = host?.shadowRoot?.querySelector('video') || host;
  const controls = container.querySelector('media-controls-content');
  const seek = container.querySelector('.tk-seek');
  const floor = container.querySelector('.tk-floor');
  const post = container.querySelector('.tk-post');
  const timeBox = container.querySelector('.tk-time');
  const timeCurrent = container.querySelector('.tk-time-current');
  const timeDuration = container.querySelector('.tk-time-duration');
  const previewValue = container.querySelector('.tk-preview-value');
  const previewTime = container.querySelector('.tk-preview-time');
  const previewLabel = container.querySelector('.tk-preview-label');
  const chapterWrap = container.querySelector('.tk-preview-chapter-wrap');
  const chapterTitle = container.querySelector('.tk-preview-chapter');
  const chapterSource = container.querySelector('.tk-preview-chapter-source');
  const poster = container.querySelector('media-poster');
  const buffering = container.querySelector('media-buffering-indicator');
  const errorTitle = container.querySelector('.tk-error-title');
  const errorDesc = container.querySelector('.tk-error-desc');
  const errorCode = container.querySelector('.tk-error-code');
  const retry = container.querySelector('.tk-retry');
  const volCell = container.querySelector('.tk-cell-volume');
  const volValue = container.querySelector('.tk-vol-value');

  if (!video) return;

  // ── Floor up/down ────────────────────────────────────────────────────────────
  // The floor rises with the controls, and stays up while anything on it (or a menu
  // opened from the post) has focus or is open. It always lies down during an error.
  const syncFloor = () => {
    const visible = controls?.hasAttribute('data-visible');
    const focusInside = floor.matches(':has(:focus-visible)') || post.matches(':has(:focus-visible)');
    const menuOpen = settings?.isOpen() || volCell?.hasAttribute('data-tk-active');
    const errored = container.hasAttribute('data-error');
    const fixed = container.getAttribute('data-floor-mode') === 'fixed';
    setFlag(container, 'data-floor-up', !errored && (fixed || visible || focusInside || menuOpen));
  };

  // ── Playback state mirrors ───────────────────────────────────────────────────
  const syncPlayback = () => {
    setFlag(container, 'data-started', !video.paused || video.currentTime > 0 || (video.played?.length ?? 0) > 0);
    setFlag(container, 'data-paused', video.paused && !video.ended);
    setFlag(container, 'data-ended', video.ended);
    setFlag(container, 'data-duration-known', Number.isFinite(video.duration) && video.duration > 0);
  };

  // ── Loading: before the poster arrives, and while buffering after play ──────
  const syncLoading = () => {
    const posterPending = poster && !poster.hasAttribute('data-loaded') && !container.hasAttribute('data-started');
    const waiting = buffering?.hasAttribute('data-visible');
    setFlag(container, 'data-poster-pending', !!posterPending);
    setFlag(container, 'data-loading', !!waiting || (!!posterPending && !container.hasAttribute('data-duration-known')));
  };

  // ── Time readout that travels with the door pull ─────────────────────────────
  // While dragging, the slider's fill leads the media's currentTime, so read the fill.
  const fillPercent = () => {
    // the target value Video.js sets (the drawn value eases towards it)
    const raw = seek.style.getPropertyValue('--media-slider-fill');
    const n = parseFloat(raw);
    if (Number.isFinite(n)) return n;
    return video.duration ? (video.currentTime / video.duration) * 100 : 0;
  };

  let lastFlip = null;
  const syncTime = () => {
    const pct = fillPercent();
    container.style.setProperty('--tk-progress', String(Math.max(0, Math.min(1, pct / 100))));
    const duration = video.duration;
    const known = Number.isFinite(duration) && duration > 0;
    const shown = seek.hasAttribute('data-dragging') && known ? (pct / 100) * duration : video.currentTime;
    timeCurrent.textContent = formatTime(known ? Math.min(shown, duration) : 0).replace('--:--', '00:00');
    timeDuration.textContent = known ? formatTime(duration) : '--:--';

    // Flip the readout onto the tan side when the washi is too narrow to hold it.
    const trackWidth = seek.clientWidth;
    const edge = (pct / 100) * trackWidth; // door edge, measured from the slider's start
    const needed = timeBox.offsetWidth + 18; // readout + its gap from the pull
    const flip = edge < needed;
    if (flip !== lastFlip) {
      setFlag(container, 'data-time-flip', flip);
      lastFlip = flip;
    }
  };

  // Over the washi the hover line is drawn in walnut, so it stays visible.
  const syncHoverSide = () => {
    const pointer = parseFloat(seek.style.getPropertyValue('--media-slider-pointer'));
    const fill = parseFloat(seek.style.getPropertyValue('--media-slider-fill')) || 0;
    const shut = !container.hasAttribute('data-intro-done');
    setFlag(seek, 'data-tk-over-door', Number.isFinite(pointer) && (shut || pointer < fill));
  };

  // Intro: the door starts shut and slides open once the video is ready to show.
  const openDoor = () => {
    if (container.hasAttribute('data-intro-done')) return;
    setTimeout(() => setFlag(container, 'data-intro-done', true), 250);
  };
  const maybeOpenDoor = () => {
    const ready = video.readyState >= 1 && (!poster || poster.hasAttribute('data-loaded') || video.readyState >= 2);
    if (ready || video.error) openDoor();
  };
  if (matchMedia('(prefers-reduced-motion: reduce)').matches) setFlag(container, 'data-intro-done', true);

  // Pointer time in the preview card, padded to match the floor readout.
  const syncPreviewTime = () => {
    if (!seek.hasAttribute('data-pointing') && !seek.hasAttribute('data-dragging')) return; // frozen while closing
    previewTime.textContent = repadTime(previewValue.textContent);
  };
  const syncChapterText = () => {
    if (!seek.hasAttribute('data-pointing') && !seek.hasAttribute('data-dragging')) return;
    const text = (chapterSource?.textContent || '').trim();
    if (chapterTitle.textContent !== text) chapterTitle.textContent = text;
  };

  // Chapter title: the label grows and shrinks smoothly between one and two lines.
  const previewOpen = () => seek.hasAttribute('data-pointing') || seek.hasAttribute('data-dragging');
  const syncChapterHeight = () => {
    if (!chapterWrap || !chapterTitle) return;
    // Only resize while the card is open, so a re-opening card doesn't grow from zero.
    if (!previewOpen()) return;
    const empty = !chapterTitle.textContent.trim();
    setFlag(previewLabel, 'data-no-chapter', empty);
    const style = getComputedStyle(chapterTitle);
    const h = empty ? 0 : chapterTitle.offsetHeight + parseFloat(style.marginTop) + parseFloat(style.marginBottom);
    chapterWrap.style.setProperty('--tk-chapter-h', `${h}px`);
  };

  // A click glides the door to its new place; holding and dragging then follows closely.
  let glideTimer;
  seek.addEventListener('pointerdown', (e) => {
    const x0 = e.clientX;
    seek.setAttribute('data-tk-glide', '');
    clearTimeout(glideTimer);
    glideTimer = setTimeout(() => seek.removeAttribute('data-tk-glide'), 280);
    const onMove = (m) => {
      if (Math.abs(m.clientX - x0) > 6) {
        clearTimeout(glideTimer);
        glideTimer = setTimeout(() => seek.removeAttribute('data-tk-glide'), 120);
        window.removeEventListener('pointermove', onMove);
      }
    };
    window.addEventListener('pointermove', onMove);
    window.addEventListener('pointerup', () => window.removeEventListener('pointermove', onMove), { once: true });
  });

  // Volume level under the pull; the label hides while muted.
  const syncVolume = () => {
    if (!volValue) return;
    const muted = video.muted || video.volume === 0;
    volValue.textContent = `${Math.round((muted ? 0 : video.volume) * 100)}%`;
    setFlag(volCell, 'data-tk-muted', muted);
    setFlag(volCell, 'data-tk-quiet', muted || Math.round(video.volume * 100) < 10);
    volCell.style.setProperty('--tk-vol-n', muted ? 0 : video.volume.toFixed(3));
    volCell.setAttribute('data-tk-level', muted ? 'off' : video.volume < 0.5 ? 'low' : 'high');
  };
  // Starting volume from data-volume (0 – 1), e.g. 0.6.
  const startVolume = Number.parseFloat(container.dataset.volume);
  if (Number.isFinite(startVolume)) video.volume = Math.min(1, Math.max(0, startVolume));
  video.addEventListener('volumechange', syncVolume);
  syncVolume();
  // Keep the volume door open while dragging, even if the pointer leaves the cell.
  const volSlider = container.querySelector('.tk-vol');
  if (volSlider && volCell) {
    new MutationObserver(() => {
      const dragging = volSlider.hasAttribute('data-dragging');
      setFlag(volCell, 'data-tk-active', dragging);
      setFlag(volCell, 'data-tk-dragging', dragging);
    })
      .observe(volSlider, { attributes: true, attributeFilter: ['data-dragging'] });
  }

  // ── Settings door (the more button) ─────────────────────────────────────────
  const settings = initSettings(container, video, { onToggle: syncFloor, host });
  initKeys(container, video, { settings });
  // a small handle for pages hosting the player (the demo board uses it)
  container.tokonoma = { settings };
  const sound = initSound(container);
  initPrefs(container, video);
  initLight(container, video);
  initSeal(container, { sound });
  initDepth(container);
  initAspect(container, video);
  initMagnifier(container, video, { host });
  initCaptions(container, video, { host });

  // ── Errors ───────────────────────────────────────────────────────────────────
  const showError = () => {
    settings?.close({ returnFocus: false });
    if (fallBack()) return;
    const code = (video.error || host.error)?.code ?? 2;
    const info = ERRORS[code] ?? ERRORS[2];
    errorTitle.textContent = info.title;
    errorDesc.textContent = info.desc;
    errorCode.textContent = `ERR ${code} · ${info.label}`;
    container.setAttribute('data-error', '');
    syncFloor();
    // Keyboard users land on the one thing they can do.
    requestAnimationFrame(() => retry?.focus({ focusVisible: true }));
  };

  const clearError = () => {
    container.removeAttribute('data-error');
    syncFloor();
  };

  // If the Mux stream can't be reached (a blocked network, a strict content
  // policy), quietly switch to the local copy once, with its own thumbnails.
  let fellBack = false;
  function fallBack() {
    const src = host?.dataset.fallbackSrc;
    if (fellBack || !src || host === video) return false;
    fellBack = true;
    host.src = src;
    useLocalThumbnails();
    return true;
  }

  // Preview thumbnails. A streaming element may bring its own (Mux adds a
  // storyboard track from image.mux.com), but its images can be blocked — by a
  // strict content policy, for one — and the preview card would show an empty
  // frame. So check that the first sprite really loads, and if the track or
  // the image fails, use the local storyboard named in data-fallback-thumbnails.
  let localThumbs = false;
  function useLocalThumbnails() {
    const src = host?.dataset.fallbackThumbnails;
    if (localThumbs || !src || host === video) return;
    localThumbs = true;
    for (const t of host.querySelectorAll('track[kind="metadata"]')) t.remove();
    const track = document.createElement('track');
    Object.assign(track, { kind: 'metadata', label: 'thumbnails', default: true });
    host.append(track);
    absoluteThumbs(track, new URL(src, document.baseURI).href);
  }

  // A storyboard VTT names its images relative to itself. On a plain <video>
  // Video.js resolves them that way; on a media element such as <mux-video> it
  // resolves them against the page instead. So for those, the VTT is rewritten
  // with full URLs (as a blob) before the track loads it.
  async function absoluteThumbs(track, src) {
    try {
      const text = await (await fetch(src)).text();
      const fixed = text.split('\n').map((line) => (
        /#xywh=|\.(jpe?g|png|webp|avif)(\?|#|$)/i.test(line) && !/^[a-z][a-z\d+.-]*:|^\//i.test(line.trim())
          ? new URL(line.trim(), src).href : line
      )).join('\n');
      track.src = URL.createObjectURL(new Blob([fixed], { type: 'text/vtt' }));
    } catch {
      track.src = src;
    }
  }
  if (host !== video) {
    for (const t of host.querySelectorAll('track[kind="metadata"]')) {
      const src = t.getAttribute('src');
      // only relative ones: a full URL (Mux's own storyboard) is already fine
      if (src && !/^[a-z][a-z\d+.-]*:/i.test(src)) { t.removeAttribute('src'); absoluteThumbs(t, new URL(src, document.baseURI).href); }
    }
  }
  const probed = new WeakSet();
  function checkThumbnails() {
    if (localThumbs || host === video || !host.dataset.fallbackThumbnails) return;
    const el = [...video.querySelectorAll('track')].find((t) => t.kind === 'metadata' && t.label === 'thumbnails');
    if (!el || probed.has(el)) return;
    probed.add(el);
    if (el.readyState === 3) return useLocalThumbnails();
    const probe = () => {
      const cue = el.track?.cues?.[0];
      if (!cue) return useLocalThumbnails();
      const img = new Image();
      img.onerror = useLocalThumbnails;
      img.src = new URL(cue.text.trim().split('#')[0], el.src).href;
    };
    el.addEventListener('error', useLocalThumbnails, { once: true });
    if (el.readyState === 2) probe();
    else el.addEventListener('load', probe, { once: true });
  }
  if (host !== video) {
    new MutationObserver(checkThumbnails).observe(video, { childList: true });
    checkThumbnails();
  }

  retry?.addEventListener('click', () => {
    clearError();
    const t = video.currentTime;
    video.load();
    if (t > 0) video.addEventListener('loadedmetadata', () => { video.currentTime = t; }, { once: true });
    video.play().catch(() => {});
  });

  // ── Wiring ───────────────────────────────────────────────────────────────────
  const onMedia = () => { syncPlayback(); syncLoading(); syncTime(); };
  for (const type of ['play', 'pause', 'playing', 'ended', 'seeking', 'seeked', 'timeupdate', 'durationchange', 'loadedmetadata', 'emptied', 'waiting', 'canplay']) {
    video.addEventListener(type, onMedia);
  }
  video.addEventListener('error', showError);
  if (host !== video) host.addEventListener('error', showError);
  video.addEventListener('loadstart', () => { if (!video.error) clearError(); });

  const watch = (el, attrs, fn) => {
    if (!el) return;
    new MutationObserver(fn).observe(el, { attributes: true, attributeFilter: attrs });
  };
  watch(controls, ['data-visible'], syncFloor);
  watch(volCell, ['data-tk-active'], syncFloor);
  watch(container, ['data-floor-mode'], syncFloor);
  watch(poster, ['data-loaded', 'data-visible', 'data-error'], syncLoading);
  watch(buffering, ['data-visible'], syncLoading);
  watch(seek, ['style', 'data-dragging'], syncTime);
  watch(seek, ['style'], syncHoverSide);
  for (const type of ['loadedmetadata', 'loadeddata', 'error']) video.addEventListener(type, maybeOpenDoor);
  watch(poster, ['data-loaded'], maybeOpenDoor);
  // When the card opens, size the chapter slot at once; animate only between chapters.
  let wasOpen = false;
  watch(seek, ['data-pointing', 'data-dragging'], () => {
    const open = previewOpen();
    if (open && !wasOpen && chapterWrap) {
      syncChapterText();
      syncPreviewTime();
      chapterWrap.style.transition = 'none';
      syncChapterHeight();
      chapterWrap.offsetHeight;
      requestAnimationFrame(() => { chapterWrap.style.transition = ''; });
    }
    wasOpen = open;
  });
  if (chapterSource) new MutationObserver(syncChapterText).observe(chapterSource, { childList: true, characterData: true, subtree: true });
  if (chapterTitle) {
    new MutationObserver(syncChapterHeight).observe(chapterTitle, { childList: true, characterData: true, subtree: true });
    new ResizeObserver(syncChapterHeight).observe(chapterTitle);
  }
  if (previewValue) new MutationObserver(syncPreviewTime).observe(previewValue, { childList: true, characterData: true, subtree: true });

  container.addEventListener('focusin', syncFloor);
  container.addEventListener('focusout', () => requestAnimationFrame(syncFloor));
  new ResizeObserver(syncTime).observe(seek);

  // Media that failed before this script ran.
  if (video.error || host?.error) showError();
  onMedia();
  maybeOpenDoor();
  syncFloor();
  syncPreviewTime();
}

// Any media element works: a plain <video>, or a Video.js media element such as
// <mux-video>, <hlsjs-video>, <dash-video> or <youtube-video>. A custom element
// may be registered after this script runs, so wait for it before wiring up.
async function whenMediaReady(container) {
  if (!container || container.hasAttribute('data-tk-mounted')) return;
  container.setAttribute('data-tk-mounted', '');
  const host = container.querySelector('.tk-video');
  const tag = host?.localName;
  if (tag?.includes('-') && !customElements.get(tag)) {
    const timeout = new Promise((r) => setTimeout(r, 5000, 'timeout'));
    if ((await Promise.race([customElements.whenDefined(tag), timeout])) === 'timeout') {
      console.warn(`[tokonoma] <${tag}> was never defined — import its module (e.g. '@videojs/html/media/${tag}').`);
    }
  }
  initTokonoma(container);
}

/** Wire up a player whose markup is already in the page (element.js uses this). */
export const mountTokonoma = whenMediaReady;

const boot = () => document.querySelectorAll('media-container.tk').forEach(whenMediaReady);
if (document.readyState === 'loading') document.addEventListener('DOMContentLoaded', boot);
else boot();

// ── Frame shape ──────────────────────────────────────────────────────────────────
// data-aspect="4:3" (any w:h), or "auto" to take the video's own shape once its
// size is known. Without it the frame is 16:9. A set shape shows the whole
// picture (letterboxed if the video's shape differs) and stays within the screen's
// height, so tall videos don't run off the page.
function initAspect(container, video) {
  const apply = () => {
    const a = (container.getAttribute('data-aspect') || '').trim();
    let w = 0; let h = 0;
    if (a === 'auto') {
      w = video.videoWidth; h = video.videoHeight;
    } else {
      const m = a.match(/^(\d+(?:\.\d+)?)\s*[:/x]\s*(\d+(?:\.\d+)?)$/);
      if (m) { w = +m[1]; h = +m[2]; }
    }
    if (w > 0 && h > 0) {
      container.style.setProperty('--tk-aspect', `${w} / ${h}`);
      container.style.setProperty('--tk-aspect-n', String(w / h));
    } else {
      container.style.removeProperty('--tk-aspect');
      container.style.removeProperty('--tk-aspect-n');
    }
  };
  apply();
  video.addEventListener('loadedmetadata', apply);
  video.addEventListener('resize', apply);
  new MutationObserver(apply).observe(container, { attributes: true, attributeFilter: ['data-aspect'] });
}
