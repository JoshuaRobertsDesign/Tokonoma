// ── Optional sound ───────────────────────────────────────────────────────────────
// Small sounds, made on the fly with Web Audio (no files). Off unless
// data-sound="on".
//   click   a knock on hinoki: taking hold of a door pull, or a slider in the
//           settings door
//   glide   a short paper glide: clicking elsewhere on the seek or volume groove,
//           as the door slides to the spot
//   slide   paper drawn along a runner: the settings door opening or closing
//   tap     the quietest of the four: a row, toggle or choice in the settings door
//   stamp   a soft thud: the seal pressed at the end
//
// To play the moment a control is pressed, the audio engine is started on the
// visitor's first press or key anywhere on the page (browsers only allow it after
// one) and kept running; sounds are scheduled for "now" and fired on pointerdown.

export function initSound(container) {
  let ac = null;
  let noiseBuf = null;
  const on = () => container.getAttribute('data-sound') === 'on';

  const engine = () => {
    if (!ac) {
      const AC = window.AudioContext || window.webkitAudioContext;
      if (!AC) return null;
      try { ac = new AC({ latencyHint: 'interactive' }); } catch { ac = new AC(); }
      // one second of noise, made once and reused from random offsets
      noiseBuf = ac.createBuffer(1, ac.sampleRate, ac.sampleRate);
      const d = noiseBuf.getChannelData(0);
      for (let i = 0; i < d.length; i++) d[i] = Math.random() * 2 - 1;
    }
    if (ac.state === 'suspended') ac.resume().catch(() => {});
    return ac;
  };
  // start (or wake) the engine on any press or key, so the first sound isn't late
  const prime = () => { if (on()) engine(); };
  document.addEventListener('pointerdown', prime, true);
  document.addEventListener('keydown', prime, true);

  // run a sound now; if the engine is still waking, run it the moment it's up
  const play = (fn) => {
    if (!on()) return;
    const ctx = engine();
    if (!ctx) return;
    if (ctx.state === 'running') fn(ctx, ctx.currentTime);
    else ctx.resume().then(() => fn(ctx, ctx.currentTime)).catch(() => {});
  };
  const noise = (ctx, t, seconds) => {
    const src = ctx.createBufferSource();
    src.buffer = noiseBuf;
    src.start(t, Math.random() * (1 - seconds - 0.01), seconds + 0.01);
    return src;
  };
  const env = (ctx, t, peak, attack, release) => {
    const g = ctx.createGain();
    g.gain.setValueAtTime(0.0001, t);
    g.gain.exponentialRampToValueAtTime(peak, t + attack);
    g.gain.exponentialRampToValueAtTime(0.0001, t + attack + release);
    return g;
  };
  const filter = (ctx, type, freq, q = 1) => {
    const f = ctx.createBiquadFilter();
    f.type = type;
    f.frequency.value = freq;
    f.Q.value = q;
    return f;
  };

  const click = () => play((ctx, t) => {
    const tone = ctx.createOscillator();
    tone.type = 'sine';
    tone.frequency.setValueAtTime(1180, t);
    tone.frequency.exponentialRampToValueAtTime(560, t + 0.05);
    tone.connect(env(ctx, t, 0.2, 0.002, 0.07)).connect(ctx.destination);
    tone.start(t);
    tone.stop(t + 0.1);
    noise(ctx, t, 0.04).connect(filter(ctx, 'bandpass', 3400, 1.6)).connect(env(ctx, t, 0.15, 0.001, 0.025)).connect(ctx.destination);
  });

  // paper over wood: band-limited noise swept across the band, gently
  const sweep = (from, to, len, peak) => play((ctx, t) => {
    const band = filter(ctx, 'bandpass', from, 0.9);
    band.frequency.setValueAtTime(from, t);
    band.frequency.exponentialRampToValueAtTime(to, t + len);
    const g = ctx.createGain();
    g.gain.setValueAtTime(0.0001, t);
    g.gain.exponentialRampToValueAtTime(peak, t + Math.min(0.05, len * 0.25));
    g.gain.exponentialRampToValueAtTime(peak * 0.6, t + len * 0.7);
    g.gain.exponentialRampToValueAtTime(0.0001, t + len);
    noise(ctx, t, len).connect(band).connect(filter(ctx, 'highpass', 700)).connect(g).connect(ctx.destination);
  });
  const slide = (opening) => (opening ? sweep(1300, 3400, 0.42, 0.05) : sweep(3200, 1400, 0.3, 0.045));
  const glide = () => sweep(1800, 3000, 0.24, 0.04);

  const tap = () => play((ctx, t) => {
    const tone = ctx.createOscillator();
    tone.type = 'sine';
    tone.frequency.setValueAtTime(1650, t);
    tone.frequency.exponentialRampToValueAtTime(1250, t + 0.03);
    tone.connect(env(ctx, t, 0.05, 0.002, 0.035)).connect(ctx.destination);
    tone.start(t);
    tone.stop(t + 0.05);
    noise(ctx, t, 0.02).connect(filter(ctx, 'highpass', 4000)).connect(env(ctx, t, 0.025, 0.001, 0.012)).connect(ctx.destination);
  });

  const stamp = () => play((ctx, t) => {
    const body = ctx.createOscillator();
    body.type = 'sine';
    body.frequency.setValueAtTime(190, t);
    body.frequency.exponentialRampToValueAtTime(70, t + 0.12);
    body.connect(env(ctx, t, 0.32, 0.004, 0.16)).connect(ctx.destination);
    body.start(t);
    body.stop(t + 0.2);
    noise(ctx, t, 0.06).connect(filter(ctx, 'lowpass', 900)).connect(env(ctx, t, 0.14, 0.002, 0.05)).connect(ctx.destination);
  });

  // presses in the player, sorted by what was pressed
  container.addEventListener('pointerdown', (e) => {
    if (e.button !== 0 || !on()) return;
    const t = e.target;
    if (!t.closest) return;
    if (t.closest('.tk-pull, .tk-vol-pull, .tk-mm-range')) click();
    else if (t.closest('.tk-seek, .tk-vol')) glide();
    else if (t.closest('.tk-mm button')) tap();
  }, true);

  // the settings door, opening and closing (from a press, a key or code)
  let wasOpen = container.hasAttribute('data-tk-mm-open');
  new MutationObserver(() => {
    const open = container.hasAttribute('data-tk-mm-open');
    if (open !== wasOpen) slide(open);
    wasOpen = open;
  }).observe(container, { attributes: true, attributeFilter: ['data-tk-mm-open'] });

  // a click to confirm, when sound is switched on
  let wasOn = on();
  new MutationObserver(() => {
    const now = on();
    if (now && !wasOn) click();
    wasOn = now;
  }).observe(container, { attributes: true, attributeFilter: ['data-sound'] });

  return { click, glide, slide, tap, stamp };
}
