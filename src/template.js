// ── Player markup from options ───────────────────────────────────────────────────
// One template (skin.html) makes every Tokonoma player: the demo page's (filled in
// at build time by vite.config.js) and each <tokonoma-player> (filled in by
// element.js). Plain string work, so it runs in Node and in the browser alike.

const esc = (v) => String(v).replace(/&/g, '&amp;').replace(/"/g, '&quot;').replace(/</g, '&lt;').replace(/>/g, '&gt;');

// the skin's settings, as the demo starts them; any data-* given overrides these
export const DEFAULTS = {
  'data-theme': 'hinoki',
  'data-post': 'right',
  'data-title-align': 'center',
  'data-title-layer': 'over',
  'data-shade': 'on',
  'data-seek': 'solid',
  'data-floor-mode': 'tilt',
  'data-chapter-style': 'kumiko',
  'data-paper-light': 'on',
  'data-depth': 'on',
  'data-aspect': 'auto',
  'data-sound': 'off',
  'data-magnifier-shape': 'circle',
  'data-seal-align': 'left',
};

/**
 * @param {string} template  the contents of skin.html
 * @param {object} o
 *   src, title, poster, chapters, thumbnails, captions, captionsLabel, captionsLang,
 *   fallback, fallbackThumbnails, preload, data (extra data-* attributes)
 */
export function renderPlayer(template, o) {
  const data = { ...DEFAULTS, ...(o.data || {}) };
  if (!o.title) data['data-title-align'] = 'none';
  const attrs = Object.entries(data)
    .filter(([, v]) => v != null && v !== false)
    .map(([k, v]) => ` ${k}="${esc(v)}"`).join('');

  // HLS (including Mux) through <mux-video>; anything else through a plain <video>
  const hls = /\.m3u8(\?|#|$)/i.test(o.src) || /(^|\/\/)stream\.mux\.com\//i.test(o.src);
  const tag = hls ? 'mux-video' : 'video';
  const tracks = [
    o.chapters && `<track kind="chapters" src="${esc(o.chapters)}" srclang="en" label="Chapters" default />`,
    o.thumbnails && `<track kind="metadata" label="thumbnails" src="${esc(o.thumbnails)}" default />`,
    o.captions && `<track kind="captions" src="${esc(o.captions)}" srclang="${esc(o.captionsLang || 'en')}" label="${esc(o.captionsLabel || 'English')}" />`,
  ].filter(Boolean).map((t) => `\n                ${t}`).join('');
  const extra = [
    o.fallback && ` data-fallback-src="${esc(o.fallback)}"`,
    o.fallbackThumbnails && ` data-fallback-thumbnails="${esc(o.fallbackThumbnails)}"`,
  ].filter(Boolean).join('');
  const media = `<${tag} class="tk-video" src="${esc(o.src)}"${extra}
                crossorigin="anonymous" preload="${esc(o.preload || 'metadata')}" playsinline>${tracks}
              </${tag}>`;

  const poster = o.poster
    ? `<media-poster class="tk-poster">
                <img src="${esc(o.poster)}" alt="" decoding="async" />
              </media-poster>`
    : '';

  return template
    .replace(/^<!--[\s\S]*?-->\n/, '')
    .replace('{{attrs}}', attrs)
    .replace('{{media}}', media)
    .replace('{{title}}', esc(o.title || ''))
    .replace('{{poster}}', poster);
}
