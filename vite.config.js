import { defineConfig } from 'vite';
import { readFileSync } from 'node:fs';
import { renderPlayer } from './src/template.js';

// The demo page's player is built from the same template as <tokonoma-player>
// (src/skin.html), so the two can't drift apart.
const demoPlayer = () => ({
  name: 'tokonoma-demo-player',
  transformIndexHtml(html) {
    const template = readFileSync(new URL('./src/skin.html', import.meta.url), 'utf8');
    const markup = renderPlayer(template, {
      src: 'https://stream.mux.com/uvARTyBix02kTMuAOLGfaedhBu02teeI8P02YVezZ6GkKQ.m3u8',
      title: 'A Quiet Year',
      poster: 'media/poster.webp',
      chapters: 'media/chapters.vtt',
      captions: 'media/captions-en.vtt',
      captionsLabel: 'English (SDH)',
      fallback: 'media/quiet-year.mp4',
      fallbackThumbnails: 'media/thumbnails.vtt',
      data: { 'data-volume': '0.6' },
    }).split('\n').map((l) => (l ? `      ${l}` : l)).join('\n');
    // the demo's player is the page's #player (the contents list links to it)
    return html.replace(/ *<!-- tokonoma:demo-player[^>]*-->/, markup.trimEnd().replace('<video-player>', '<video-player id="player">'));
  },
});

export default defineConfig({
  base: './',
  server: { host: '127.0.0.1', port: 5173 },
  plugins: [demoPlayer()],
});
