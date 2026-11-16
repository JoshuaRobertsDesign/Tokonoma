// ── Save a still ─────────────────────────────────────────────────────────────────
// Downloads the frame on screen as a PNG, at the video's own size, with the
// Picture settings (brightness, contrast, saturation, warmth) baked in where the
// browser can apply them to a canvas. A video from another site that doesn't
// allow it (no CORS) can't be read, and says so instead.

const pad2 = (n) => String(n).padStart(2, '0');
const slug = (s) => (s || 'still').toLowerCase().normalize('NFKD').replace(/[^\w\s-]/g, '').trim().replace(/[\s_]+/g, '-').slice(0, 48) || 'still';

// the camera on the picture, when data-still-button="on"
export function initStillButton(container, video, host = video) {
  container.querySelector('.tk-still')?.addEventListener('click', () => saveStill(container, video, host));
}

export function saveStill(container, video, host = video) {
  const note = (label, value, icon = 'still') => container.tkReadout?.('note', { icon, label, value });
  const w = video.videoWidth;
  const h = video.videoHeight;
  if (!w || !h) { note('Save still', 'Play the video first'); return; }
  const canvas = document.createElement('canvas');
  canvas.width = w;
  canvas.height = h;
  const ctx = canvas.getContext('2d');
  const filter = host.style.filter || '';
  if (filter && 'filter' in ctx) ctx.filter = filter;
  ctx.drawImage(video, 0, 0, w, h);
  const t = Math.floor(video.currentTime || 0);
  const name = `${slug(container.querySelector('.tk-title')?.textContent)}-${pad2(Math.floor(t / 60))}m${pad2(t % 60)}s.png`;
  try {
    canvas.toBlob((blob) => {
      if (!blob) { note('Save still', "Couldn't save"); return; }
      const a = document.createElement('a');
      a.href = URL.createObjectURL(blob);
      a.download = name;
      document.body.append(a);
      a.click();
      a.remove();
      setTimeout(() => URL.revokeObjectURL(a.href), 4000);
      note('Still saved', 'Downloaded as PNG');
    }, 'image/png');
  } catch {
    // a canvas holding another site's picture can't be read back
    note('Save still', 'Not allowed for this video');
  }
}
