// ── Hanko seal on the ending ─────────────────────────────────────────────────────
// When the video ends, a seal is pressed onto the shut door (the motion is CSS, on
// [data-ended]). What it shows, set on the player:
//   data-seal-src="mark.svg"   an image (SVG or PNG), shown as it is
//   data-seal="Fin"            any text; up to three letters make a square seal,
//                              longer text a wider one
//   (neither)                  the initials of the video's title
// data-seal-align="left|center|right" places it beside replay, in the middle of
// the door, or beside the time. No kanji by default, so nothing can be misread.

const SKIP = /^(a|an|the|of|and|in|on|to)$/i;

export function initSeal(container, { sound } = {}) {
  const seal = container.querySelector('.tk-seal');
  const face = seal?.querySelector('.tk-seal-face');
  if (!seal || !face) return;
  const timeBox = container.querySelector('.tk-time');

  const initials = () => {
    const title = container.querySelector('.tk-title-text')?.textContent?.trim() || '';
    const words = title.split(/\s+/).filter(Boolean);
    return (words.filter((w) => !SKIP.test(w)).map((w) => w[0]).join('') || title.slice(0, 2))
      .toUpperCase().replace(/[^A-Z0-9]/g, '').slice(0, 3);
  };

  function render() {
    face.textContent = '';
    delete seal.dataset.letters;
    const src = container.getAttribute('data-seal-src');
    if (src) {
      seal.dataset.kind = 'image';
      const img = document.createElement('img');
      img.alt = '';
      img.decoding = 'async';
      img.src = src;
      face.append(img);
      return;
    }
    const text = (container.getAttribute('data-seal') ?? '').trim() || initials();
    const compact = text.replace(/\s+/g, '');
    if (compact.length <= 3 && !/\s/.test(text)) {
      // a square seal; two letters stack, as they would on a hanko
      seal.dataset.kind = 'mark';
      seal.dataset.letters = String(compact.length);
      if (compact.length === 2) {
        for (const ch of compact) {
          const line = document.createElement('span');
          line.textContent = ch;
          face.append(line);
        }
      } else face.textContent = compact || '·';
    } else {
      seal.dataset.kind = 'text';
      face.textContent = text;
    }
  }
  render();
  new MutationObserver(render).observe(container, { attributes: true, attributeFilter: ['data-seal', 'data-seal-src'] });

  // at the end: measure the time readout (the right-hand seal sits beside it), and
  // land the sound with the press, about 40% into the stamp
  let thud = 0;
  new MutationObserver(() => {
    clearTimeout(thud);
    if (!container.hasAttribute('data-ended')) return;
    if (timeBox) container.style.setProperty('--tk-time-w', `${timeBox.offsetWidth}px`);
    thud = setTimeout(() => sound?.stamp(), 330);
  }).observe(container, { attributes: true, attributeFilter: ['data-ended'] });
}
