// ── <tokonoma-player> ────────────────────────────────────────────────────────────
// The whole skin from one tag:
//
//   <tokonoma-player src="https://stream.mux.com/….m3u8" title="A Quiet Year"
//     poster="poster.jpg" chapters="chapters.vtt" captions="captions.vtt"
//     theme="aizome"></tokonoma-player>
//
// Attributes: src (required), title, poster, chapters, thumbnails, captions,
// captions-label, captions-lang, fallback, fallback-thumbnails, preload, loading
// (lazy: build only as it nears the screen), and the
// skin's settings by short name — theme, post, title-align, title-layer, seek,
// floor, chapters-style, shade, paper-light, depth, sound, magnifier-shape, aspect, still-button, seal,
// seal-src, seal-align, volume, remember — and colours: wood, floor, paper, ink,
// ink-soft, wall, accent, accent-deep. Any data-* attribute is passed straight
// to the player too. The markup is built once, when the element first connects.

import template from './skin.html?raw';
import { renderPlayer } from './template.js';
import { mountTokonoma } from './main.js';

const SETTINGS = {
  theme: 'data-theme',
  post: 'data-post',
  'title-align': 'data-title-align',
  'title-layer': 'data-title-layer',
  seek: 'data-seek',
  floor: 'data-floor-mode',
  'chapters-style': 'data-chapter-style',
  shade: 'data-shade',
  'paper-light': 'data-paper-light',
  depth: 'data-depth',
  sound: 'data-sound',
  'magnifier-shape': 'data-magnifier-shape',
  aspect: 'data-aspect',
  'still-button': 'data-still-button',
  seal: 'data-seal',
  'seal-src': 'data-seal-src',
  'seal-align': 'data-seal-align',
  volume: 'data-volume',
  remember: 'data-remember',
};

const COLOURS = ['wood', 'floor', 'paper', 'ink', 'ink-soft', 'wall', 'accent', 'accent-deep'];

class TokonomaPlayer extends HTMLElement {
  connectedCallback() {
    if (this.hasAttribute('data-tk-built')) return;
    // loading="lazy": build only as the player nears the screen
    if (this.getAttribute('loading') === 'lazy' && 'IntersectionObserver' in window && !this._io) {
      // hold the player's space meanwhile, so nothing jumps when it arrives
      this.style.display ||= 'block';
      this.style.aspectRatio ||= '16 / 9.5';
      this._io = new IntersectionObserver((entries) => {
        if (!entries.some((e) => e.isIntersecting)) return;
        this._io.disconnect();
        this.build();
      }, { rootMargin: '600px 0px' });
      this._io.observe(this);
      return;
    }
    this.build();
  }

  build() {
    if (this.hasAttribute('data-tk-built')) return;
    const src = this.getAttribute('src');
    if (!src) { console.warn('[tokonoma] <tokonoma-player> needs a src.'); return; }
    this.setAttribute('data-tk-built', '');
    this.style.display ||= 'block';
    this.style.aspectRatio = '';

    // your own colours, as attributes: wood="#1f2d50" paper="#f3f6fa" …
    for (const c of COLOURS) {
      if (this.hasAttribute(c)) this.style.setProperty(`--tokonoma-${c}`, this.getAttribute(c));
    }
    const data = {};
    for (const [name, attr] of Object.entries(SETTINGS)) {
      if (this.hasAttribute(name)) data[attr] = this.getAttribute(name);
    }
    for (const { name, value } of this.attributes) {
      if (name.startsWith('data-') && name !== 'data-tk-built') data[name] = value;
    }
    const get = (n) => this.getAttribute(n) || undefined;
    this.innerHTML = renderPlayer(template, {
      src,
      title: get('title'),
      poster: get('poster'),
      chapters: get('chapters'),
      thumbnails: get('thumbnails'),
      captions: get('captions'),
      captionsLabel: get('captions-label'),
      captionsLang: get('captions-lang'),
      fallback: get('fallback'),
      fallbackThumbnails: get('fallback-thumbnails'),
      preload: get('preload'),
      data,
    });
    // the title attribute would also show as a browser tooltip over the whole player
    this.removeAttribute('title');
    mountTokonoma(this.querySelector('media-container.tk'));
  }
}

if (!customElements.get('tokonoma-player')) customElements.define('tokonoma-player', TokonomaPlayer);
