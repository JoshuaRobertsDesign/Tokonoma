// ── Captions on washi ────────────────────────────────────────────────────────────
// The browser would draw captions itself, pinned to the bottom of the picture,
// where the floor covers them. Instead the skin hides the browser's drawing and
// sets the showing track's cues on a washi strip that rises with the floor. The
// track is still chosen the usual way (the Captions menu, or C); this only changes
// where and how the words appear.

const HIDE_NATIVE = 'video::-webkit-media-text-track-container{display:none!important}video::cue{color:transparent;background:transparent;text-shadow:none}';

export function initCaptions(container, video, { host = video } = {}) {
  // hide the native rendering, inside the media element's shadow root if it has one
  const style = document.createElement('style');
  style.textContent = HIDE_NATIVE;
  (host.shadowRoot || document.head).append(style);

  const box = document.createElement('div');
  box.className = 'tk-captions';
  box.setAttribute('aria-hidden', 'true'); // captions are for reading; screen readers have the track
  const shade = container.querySelector('.tk-shade');
  shade ? shade.after(box) : container.append(box);

  let current = null;
  let lastText = '';

  const showing = () => (video.textTracks ? [...video.textTracks] : [])
    .find((t) => (t.kind === 'captions' || t.kind === 'subtitles') && t.mode === 'showing') || null;

  function draw() {
    const cues = current?.activeCues ? [...current.activeCues] : [];
    const lines = cues.flatMap((c) => {
      // VTT can carry <i>, <b>, voice tags…: keep the words, drop the markup
      const tmp = document.createElement('div');
      tmp.append(c.getCueAsHTML ? c.getCueAsHTML() : document.createTextNode(c.text));
      return tmp.textContent.split('\n').map((l) => l.trim()).filter(Boolean);
    });
    const text = lines.join('\n');
    if (text === lastText) return;
    lastText = text;
    box.textContent = '';
    for (const l of lines) {
      const line = document.createElement('span');
      line.className = 'tk-cap-line';
      line.textContent = l;
      box.append(line);
    }
    container.toggleAttribute('data-captions-on', lines.length > 0);
  }

  function pick() {
    const next = showing();
    if (next === current) return;
    current?.removeEventListener('cuechange', draw);
    current = next;
    current?.addEventListener('cuechange', draw);
    lastText = null;
    draw();
  }

  video.textTracks?.addEventListener?.('change', pick);
  video.textTracks?.addEventListener?.('addtrack', pick);
  video.addEventListener('seeked', draw);
  pick();
}
