// ── Settings door ───────────────────────────────────────────────────────────────
// The washi door that slides out from behind the post. A root view (Speed,
// Captions, Chapters, Picture, plus a strip of one-tap toggles) and submenus that
// open as an inner door. Plain DOM; it talks to the <video> directly.

import { askTilt } from './depth.js';
import { saveStill } from './still.js';

const RATE_LABEL = (r) => (r === 1 ? 'Normal' : `${r}×`);
const pad2 = (n) => String(n).padStart(2, '0');
const clock = (s) => {
  s = Math.max(0, Math.floor(s || 0));
  const h = Math.floor(s / 3600);
  const m = Math.floor((s % 3600) / 60);
  return h ? `${h}:${pad2(m)}:${pad2(s % 60)}` : `${pad2(m)}:${pad2(s % 60)}`;
};

// Light presets for the Picture view. Noon is neutral (the default).
const PICTURE_DEFAULT = { brightness: 100, contrast: 100, saturation: 100, warmth: 0 };
const PRESETS = {
  dawn: { brightness: 104, contrast: 92, saturation: 90, warmth: -20 },
  noon: { ...PICTURE_DEFAULT },
  lantern: { brightness: 92, contrast: 104, saturation: 96, warmth: 55 },
};
const PRESET_NAME = { dawn: 'Dawn', noon: 'Noon', lantern: 'Lantern' };
const STORE_KEY = 'tokonoma.picture';

const store = {
  get() {
    try { return JSON.parse(localStorage.getItem(STORE_KEY) || 'null'); } catch { return null; }
  },
  set(v) {
    try { localStorage.setItem(STORE_KEY, JSON.stringify(v)); } catch { /* private mode etc. */ }
  },
};

let instances = 0;

export function initSettings(container, video, { onToggle, host = video } = {}) {
  // Several players can share a page: give this one's ids a suffix, and point
  // its labels, aria references and the warmth filter at the renamed ids.
  const uid = ++instances;
  for (const el of container.querySelectorAll('[id^="tk-"]')) {
    const old = el.id;
    el.id = `${old}-${uid}`;
    for (const attr of ['for', 'aria-controls', 'aria-labelledby']) {
      for (const ref of container.querySelectorAll(`[${attr}="${old}"]`)) ref.setAttribute(attr, el.id);
    }
  }
  const warmthId = `tk-warmth-${uid}`;
  // What exposes text tracks: a real <video> (also inside Mux/HLS/DASH elements);
  // embeds such as YouTube may not, so everything below treats them as optional.
  const textTracks = () => (video.textTracks ? [...video.textTracks] : []);
  const panel = container.querySelector('.tk-mm');
  const button = container.querySelector('.tk-more');
  if (!panel || !button) return null;

  const views = Object.fromEntries([...panel.querySelectorAll('.tk-mm-view')].map((v) => [v.dataset.view, v]));
  const value = (k) => panel.querySelector(`[data-value="${k}"]`);
  const warmthMatrix = container.querySelector(`#${warmthId} feColorMatrix`);
  const reduced = () => matchMedia('(prefers-reduced-motion: reduce)').matches;

  const preview = container.querySelector('.tk-preview');
  const seek = container.querySelector('.tk-seek');

  // The door's width, for the title that rides along with it.
  const syncDoorWidth = () => container.style.setProperty('--tk-mm-px', `${panel.offsetWidth}px`);
  new ResizeObserver(() => { syncDoorWidth(); if (isOpen()) syncPreviewBounds(); }).observe(panel);

  // How far the open door overhangs the seek track, so the preview card can stop
  // flush against the door's edge rather than slide behind it.
  function syncPreviewBounds() {
    if (!preview) return;
    const track = (preview.offsetParent || seek)?.getBoundingClientRect();
    const door = panel.getBoundingClientRect();
    if (!track) return;
    const postLeft = container.getAttribute('data-post') === 'left';
    const lo = postLeft ? Math.max(0, door.right - track.left) : 0;
    const hi = postLeft ? 0 : Math.max(0, track.right - door.left);
    preview.style.setProperty('--tk-pv-lo', `${lo}px`);
    preview.style.setProperty('--tk-pv-hi', `${hi}px`);
  }
  seek?.addEventListener('pointerenter', () => { if (isOpen()) syncPreviewBounds(); });

  let current = 'root';     // the view in front
  let opener = null;        // the row that opened the current submenu
  let shutTimer = 0;

  // ── Open / close ─────────────────────────────────────────────────────────────
  const isOpen = () => panel.hasAttribute('data-open');

  const focusFirst = (view) => {
    const el = view.querySelector('button:not([hidden]), input');
    el?.focus({ preventScroll: true });
  };

  function open({ focus = true } = {}) {
    if (isOpen()) return;
    clearTimeout(shutTimer);
    showView('root', { instant: true });
    refresh();
    panel.removeAttribute('data-shut');
    panel.inert = false;
    // let the shut state paint once so the door slides rather than appearing
    syncDoorWidth();
    requestAnimationFrame(() => {
      panel.setAttribute('data-open', '');
      container.setAttribute('data-tk-mm-open', '');
      syncPreviewBounds();
      button.setAttribute('aria-expanded', 'true');
      onToggle?.(true);
      if (focus) focusFirst(views.root);
    });
  }

  function close({ returnFocus = true } = {}) {
    if (!isOpen()) return;
    const hadFocus = panel.contains(document.activeElement);
    panel.removeAttribute('data-open');
    container.removeAttribute('data-tk-mm-open');
    button.setAttribute('aria-expanded', 'false');
    panel.inert = true;
    onToggle?.(false);
    if (returnFocus && hadFocus) button.focus({ preventScroll: true });
    clearTimeout(shutTimer);
    shutTimer = setTimeout(() => {
      if (!isOpen()) { panel.setAttribute('data-shut', ''); showView('root', { instant: true }); }
    }, reduced() ? 0 : 300);
  }

  button.addEventListener('click', () => (isOpen() ? close() : open()));

  // Close when pressing anywhere outside the door (and not on its button).
  document.addEventListener('pointerdown', (e) => {
    if (!isOpen()) return;
    if (panel.contains(e.target) || button.contains(e.target)) return;
    // controls that adjust the door itself (the demo's lattice sliders) keep it open
    if (e.target.closest?.('[data-tk-keep-open]')) return;
    close({ returnFocus: false });
    // A press on the picture only dismisses the door; it shouldn't also play/pause.
    const onControl = e.target.closest?.('button, input, a, [role="slider"], media-time-slider, media-volume-slider, [data-interactive]');
    if (container.contains(e.target) && !onControl) e.stopPropagation();
  }, true);

  // ── Views ───────────────────────────────────────────────────────────────────
  // A submenu is an inner door: it is shown, then --tk-mm-sub sweeps it in.
  function showView(name, { instant = false } = {}) {
    const sub = name !== 'root';
    if (sub) {
      for (const [k, v] of Object.entries(views)) if (k !== 'root') v.toggleAttribute('data-shown', k === name);
      renderView(name);
    }
    if (instant) {
      panel.style.transition = 'none';
      panel.toggleAttribute('data-sub', sub);
      void panel.offsetWidth;
      panel.style.transition = '';
    } else {
      panel.toggleAttribute('data-sub', sub);
    }
    views.root.inert = sub;
    for (const [k, v] of Object.entries(views)) if (k !== 'root') v.inert = k !== name;
    current = name;
  }

  function goTo(name, from) {
    opener = from || null;
    showView(name);
    const back = views[name].querySelector('.tk-mm-back');
    // focus the selected option if there is one, else the back button
    const target = views[name].querySelector('[aria-checked="true"], [aria-current="true"]') || back;
    target?.focus({ preventScroll: true });
    target?.scrollIntoView?.({ block: 'nearest' });
  }

  function back() {
    if (current === 'root') return;
    refresh();
    showView('root');
    if (opener) opener.focus({ preventScroll: true }); else focusFirst(views.root);
  }

  panel.addEventListener('click', (e) => {
    const go = e.target.closest('[data-goto]');
    if (go) return goTo(go.dataset.goto, go);
    if (e.target.closest('.tk-mm-back')) return back();
    const act = e.target.closest('[data-action]');
    if (act) return actions[act.dataset.action]?.(act);
    const rate = e.target.closest('[data-rate]');
    if (rate) { video.playbackRate = Number(rate.dataset.rate); return; }
    const cap = e.target.closest('[data-caption]');
    if (cap) return setCaption(cap.dataset.caption);
    const chap = e.target.closest('[data-chapter]');
    if (chap) { video.currentTime = Number(chap.dataset.start); return; }
    const preset = e.target.closest('[data-preset]');
    if (preset) return glidePicture({ ...PRESETS[preset.dataset.preset] });
  });

  // Keyboard: Esc backs out then closes; arrows move between items.
  panel.addEventListener('keydown', (e) => {
    const inRange = e.target.matches('input[type="range"]');
    if (e.key === 'Escape') {
      e.preventDefault(); e.stopPropagation();
      if (current !== 'root') back(); else close();
      return;
    }
    if (inRange) {
      if (e.key.startsWith('Arrow') || e.key === 'Home' || e.key === 'End' || e.key.startsWith('Page')) e.stopPropagation();
      return;
    }
    const items = [...views[current].querySelectorAll('button:not([hidden]), input')].filter((el) => !el.closest('[inert]'));
    const i = items.indexOf(document.activeElement);
    let next = null;
    if (e.key === 'ArrowDown') next = items[(i + 1) % items.length];
    else if (e.key === 'ArrowUp') next = items[(i - 1 + items.length) % items.length];
    else if (e.key === 'Home') next = items[0];
    else if (e.key === 'End') next = items[items.length - 1];
    else if ((e.key === 'ArrowRight' || e.key === 'ArrowLeft') && current === 'root') {
      const into = e.key === 'ArrowRight' ? document.activeElement?.closest('[data-goto]') : null;
      if (into) { e.preventDefault(); e.stopPropagation(); goTo(into.dataset.goto, into); }
      else e.stopPropagation();
      return;
    } else if (e.key === 'ArrowLeft' && current !== 'root') {
      e.preventDefault(); e.stopPropagation(); back(); return;
    } else if (e.key === 'ArrowRight') { e.stopPropagation(); return; }
    if (next) { e.preventDefault(); e.stopPropagation(); next.focus(); }
  });

  // ── Speed ───────────────────────────────────────────────────────────────────
  function syncSpeed() {
    const r = video.playbackRate;
    value('speed').textContent = RATE_LABEL(r);
    for (const b of views.speed.querySelectorAll('[data-rate]')) {
      b.setAttribute('aria-checked', String(Math.abs(Number(b.dataset.rate) - r) < 0.001));
    }
  }
  video.addEventListener('ratechange', syncSpeed);

  // ── Captions ────────────────────────────────────────────────────────────────
  const captionTracks = () => textTracks().filter((t) => t.kind === 'captions' || t.kind === 'subtitles');
  function setCaption(id) {
    captionTracks().forEach((t, i) => { t.mode = String(i) === id ? 'showing' : 'disabled'; });
    syncCaptions();
    renderView('captions');
  }
  function syncCaptions() {
    const on = captionTracks().find((t) => t.mode === 'showing');
    value('captions').textContent = on ? (on.label || on.language || 'On') : 'Off';
  }
  video.textTracks?.addEventListener?.('change', syncCaptions);
  video.textTracks?.addEventListener?.('addtrack', syncCaptions);

  // ── Chapters ────────────────────────────────────────────────────────────────
  let loopChapter = false;
  let loopTarget = null;
  const chapters = () => {
    const t = textTracks().find((x) => x.kind === 'chapters');
    if (!t) return [];
    if (t.mode === 'disabled') t.mode = 'hidden';
    return [...(t.cues || [])].map((c) => ({ start: c.startTime, end: c.endTime, title: c.text }));
  };
  const chapterAt = (list, time) => list.findIndex((c) => time >= c.start && time < c.end);

  function syncChapters() {
    const list = chapters();
    const row = panel.querySelector('[data-goto="chapters"]');
    if (row) row.hidden = list.length === 0;
    const i = chapterAt(list, video.currentTime);
    value('chapters').textContent = list.length ? `${Math.max(i, 0) + 1} / ${list.length}` : '';
    for (const b of views.chapters.querySelectorAll('[data-chapter]')) {
      b.setAttribute('aria-current', String(Number(b.dataset.chapter) === i));
    }
  }
  video.addEventListener('timeupdate', () => { if (isOpen()) syncChapters(); });
  video.addEventListener('loadedmetadata', syncChapters);
  container.querySelector('track[kind="chapters"]')?.addEventListener('load', syncChapters);

  // Loop chapter: when the playhead reaches the end of the chapter it is in,
  // go back to that chapter's start. Checked every frame where supported.
  const pickLoopTarget = () => {
    const list = chapters();
    loopTarget = list[chapterAt(list, video.currentTime)] || null;
  };
  video.addEventListener('seeked', () => { if (loopChapter) pickLoopTarget(); });
  const checkLoop = () => {
    if (!loopChapter || !loopTarget || video.seeking) return;
    if (video.currentTime >= loopTarget.end - 0.06) video.currentTime = loopTarget.start;
  };
  const frameLoop = () => {
    if (!loopChapter) return;
    checkLoop();
    if (video.requestVideoFrameCallback) video.requestVideoFrameCallback(frameLoop);
  };
  video.addEventListener('timeupdate', checkLoop);
  video.addEventListener('ended', () => {
    if (loopChapter && loopTarget) { video.currentTime = loopTarget.start; video.play().catch(() => {}); }
  });

  // ── Picture ─────────────────────────────────────────────────────────────────
  let picture = { ...PICTURE_DEFAULT, ...(store.get() || {}) };
  const presetOf = (p) => Object.keys(PRESETS).find((k) => Object.keys(PICTURE_DEFAULT).every((f) => PRESETS[k][f] === p[f]));
  const signed = (n) => (n > 0 ? `+${n}` : n < 0 ? `−${-n}` : '0');

  function applyPicture() {
    const { brightness: b, contrast: c, saturation: s, warmth: w } = picture;
    const k = w / 100;
    warmthMatrix?.setAttribute('values',
      `${1 + 0.12 * k} 0 0 0 0  0 ${1 + 0.02 * k} 0 0 0  0 0 ${1 - 0.16 * k} 0 0  0 0 0 1 0`);
    const parts = [];
    if (w) parts.push(`url(#${warmthId})`);
    if (b !== 100) parts.push(`brightness(${b / 100})`);
    if (c !== 100) parts.push(`contrast(${c / 100})`);
    if (s !== 100) parts.push(`saturate(${s / 100})`);
    host.style.filter = parts.join(' ');
  }
  // While the sliders glide, labels and chips already show where they're going.
  let goal = null;
  const ranges = [...views.picture.querySelectorAll('[data-pic]')];
  function syncPicture() {
    const preset = presetOf(goal || picture);
    value('picture').textContent = preset ? PRESET_NAME[preset] : 'Custom';
    for (const chip of views.picture.querySelectorAll('[data-preset]')) {
      chip.setAttribute('aria-checked', String(chip.dataset.preset === preset));
    }
    for (const input of ranges) {
      const k = input.dataset.pic;
      if (Number(input.value) !== picture[k]) input.value = picture[k];
      const pct = ((picture[k] - input.min) / (input.max - input.min)) * 100;
      input.style.setProperty('--p', `${pct}%`);
      const out = views.picture.querySelector(`[data-out="${k}"]`);
      const shown = Math.round(picture[k]);
      out.textContent = k === 'warmth' ? signed(shown) : `${shown}%`;
      input.setAttribute('aria-valuetext', out.textContent);
    }
    const reset = views.picture.querySelector('[data-action="picture-reset"]');
    if (reset) reset.disabled = preset === 'noon';
  }
  function setPicture(next) {
    stopGlide();
    picture = { ...picture, ...next };
    store.set(picture);
    applyPicture();
    syncPicture();
  }

  // Glide: the sliders (and the picture with them) ease to new values instead of
  // jumping — for presets, Reset, and a click on a slider's bar.
  let glide = 0;
  function stopGlide() {
    if (!glide) return;
    cancelAnimationFrame(glide);
    glide = 0;
    goal = null;
    for (const input of ranges) input.step = '1';
  }
  function glidePicture(next, duration = 420) {
    const target = { ...picture, ...next };
    for (const k in target) target[k] = Math.round(target[k]);
    stopGlide();
    if (reduced() || Object.keys(target).every((k) => target[k] === picture[k])) return setPicture(target);
    const from = { ...picture };
    let t0 = null;   // timed from the first frame, so every reading uses the frames' own clock
    goal = target;
    for (const input of ranges) input.step = 'any';   // let the thumbs move smoothly between whole steps
    const frame = (now) => {
      if (t0 === null) t0 = now;
      const t = Math.min(1, Math.max(0, (now - t0) / duration));
      const e = 1 - Math.pow(1 - t, 3);                // ease-out cubic
      for (const k in target) picture[k] = from[k] + (target[k] - from[k]) * e;
      if (t < 1) {
        applyPicture();
        syncPicture();
        glide = requestAnimationFrame(frame);
      } else {
        glide = 0;
        goal = null;
        for (const input of ranges) input.step = '1';
        setPicture(target);
      }
    };
    glide = requestAnimationFrame(frame);
  }

  // Pointer handling for the sliders: pressing on the bar glides the thumb to the
  // pressed spot; pressing on the thumb (or dragging on after a press) follows
  // the pointer directly.
  const THUMB = 12;
  const valueAt = (input, x) => {
    const r = input.getBoundingClientRect();
    const min = Number(input.min), max = Number(input.max);
    const f = Math.min(1, Math.max(0, (x - r.left - THUMB / 2) / (r.width - THUMB)));
    return Math.round(min + f * (max - min));
  };
  const thumbX = (input) => {
    const r = input.getBoundingClientRect();
    const min = Number(input.min), max = Number(input.max);
    return r.left + THUMB / 2 + ((Number(input.value) - min) / (max - min)) * (r.width - THUMB);
  };
  for (const input of ranges) {
    let drag = null;
    input.addEventListener('pointerdown', (e) => {
      if (e.button !== 0) return;
      e.preventDefault();
      input.focus({ preventScroll: true });
      input.setPointerCapture(e.pointerId);
      const k = input.dataset.pic;
      const onThumb = Math.abs(e.clientX - thumbX(input)) <= THUMB / 2 + 4;
      drag = { id: e.pointerId, x: e.clientX, following: onThumb };
      input.setAttribute('data-pressed', '');
      if (onThumb) return;
      glidePicture({ [k]: valueAt(input, e.clientX) }, 300);
    });
    input.addEventListener('pointermove', (e) => {
      if (!drag || e.pointerId !== drag.id) return;
      if (!drag.following && Math.abs(e.clientX - drag.x) < 3) return;
      drag.following = true;
      const k = input.dataset.pic;
      const v = valueAt(input, e.clientX);
      if (glide || v !== picture[k]) setPicture({ [k]: v });
    });
    const end = (e) => {
      if (!drag || e.pointerId !== drag.id) return;
      drag = null;
      input.removeAttribute('data-pressed');
    };
    input.addEventListener('pointerup', end);
    input.addEventListener('pointercancel', end);
  }
  // keyboard changes come through as input events
  views.picture.addEventListener('input', (e) => {
    const k = e.target.dataset.pic;
    if (k) setPicture({ [k]: Math.round(Number(e.target.value)) });
  });

  // ── Toggles ────────────────────────────────────────────────────────────────
  const pipBtn = panel.querySelector('[data-action="pip"]');
  const loopBtn = panel.querySelector('[data-action="loop"]');
  const loopChapterBtn = panel.querySelector('[data-action="loop-chapter"]');
  if (pipBtn && !(document.pictureInPictureEnabled && video.requestPictureInPicture)) pipBtn.hidden = true;
  const syncToggles = () => {
    pipBtn?.setAttribute('aria-pressed', String(document.pictureInPictureElement === video));
    loopBtn?.setAttribute('aria-pressed', String(video.loop));
    loopChapterBtn?.setAttribute('aria-pressed', String(loopChapter));
    if (value('loop-chapter')) value('loop-chapter').textContent = loopChapter ? 'On' : 'Off';
  };
  video.addEventListener('enterpictureinpicture', syncToggles);
  video.addEventListener('leavepictureinpicture', syncToggles);

  const actions = {
    pip: async () => {
      try {
        if (document.pictureInPictureElement) await document.exitPictureInPicture();
        else { await video.requestPictureInPicture(); close({ returnFocus: true }); }
      } catch { /* not allowed right now */ }
      syncToggles();
    },
    loop: () => {
      video.loop = !video.loop;
      if (video.loop && loopChapter) { loopChapter = false; }
      syncToggles();
    },
    'loop-chapter': () => {
      loopChapter = !loopChapter;
      if (loopChapter) { video.loop = false; pickLoopTarget(); frameLoop(); }
      syncToggles();
    },
    'picture-reset': () => glidePicture({ ...PICTURE_DEFAULT }),
    still: () => saveStill(container, video, host),
    close: () => close({ returnFocus: true }),
    // the magnifier works on the picture, so the door gets out of its way
    magnifier: () => {
      const on = !container.hasAttribute('data-magnifier');
      container.toggleAttribute('data-magnifier', on);
      if (on) close({ returnFocus: true });
    },
    sound: () => container.setAttribute('data-sound', container.getAttribute('data-sound') === 'on' ? 'off' : 'on'),
    depth: () => {
      const on = container.getAttribute('data-depth') === 'off';
      if (on) askTilt();
      container.setAttribute('data-depth', on ? 'on' : 'off');
    },
  };
  // these two live as attributes on the player (the demo board sets them too)
  const syncAttrToggles = () => {
    panel.querySelector('[data-action="magnifier"]')?.setAttribute('aria-pressed', String(container.hasAttribute('data-magnifier')));
    panel.querySelector('[data-action="sound"]')?.setAttribute('aria-pressed', String(container.getAttribute('data-sound') === 'on'));
    panel.querySelector('[data-action="depth"]')?.setAttribute('aria-pressed', String(container.getAttribute('data-depth') !== 'off'));
  };
  new MutationObserver(syncAttrToggles).observe(container, { attributes: true, attributeFilter: ['data-magnifier', 'data-sound', 'data-depth'] });
  syncAttrToggles();

  // ── Rendering of the dynamic lists ──────────────────────────────────────────
  function renderView(name) {
    if (name === 'captions') {
      const list = views.captions.querySelector('[data-list="captions"]');
      const tracks = captionTracks();
      const on = tracks.findIndex((t) => t.mode === 'showing');
      const check = views.speed.querySelector('.tk-mm-check').outerHTML;
      list.innerHTML = [
        `<button type="button" class="tk-mm-opt" role="radio" aria-checked="${on < 0}" data-caption="-1"><span class="tk-mm-label">Off</span>${check}</button>`,
        ...tracks.map((t, i) => `<button type="button" class="tk-mm-opt" role="radio" aria-checked="${on === i}" data-caption="${i}"><span class="tk-mm-label">${escapeHtml(t.label || t.language || `Track ${i + 1}`)}</span>${check}</button>`),
        tracks.length ? '' : '<p class="tk-mm-note">This video has no captions.</p>',
      ].join('');
    }
    if (name === 'chapters') {
      const list = views.chapters.querySelector('[data-list="chapters"]');
      list.innerHTML = chapters().map((c, i) => `
        <button type="button" class="tk-mm-chap" data-chapter="${i}" data-start="${c.start}" aria-current="false" aria-label="${escapeHtml(c.title)}, ${clock(c.start)}">
          <span class="tk-mm-chap-n">${pad2(i + 1)}</span>
          <span class="tk-mm-chap-t">${escapeHtml(c.title)}</span>
          <span class="tk-mm-chap-at">${clock(c.start)}</span>
        </button>`).join('');
      syncChapters();
    }
    if (name === 'speed') syncSpeed();
    if (name === 'picture') syncPicture();
  }

  function refresh() {
    syncSpeed(); syncCaptions(); syncChapters(); syncPicture(); syncToggles();
  }

  applyPicture();
  refresh();

  return { isOpen, open, close, panel };
}

function escapeHtml(s) {
  return String(s).replace(/[&<>"']/g, (c) => ({ '&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;', "'": '&#39;' }[c]));
}
