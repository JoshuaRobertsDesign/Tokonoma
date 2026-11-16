// Demo page only: lets a viewer try the skin's layout options.
import { askTilt } from './depth.js';
const player = document.querySelector('.tk');

// A few settings aren't plain attribute values: the magnifier is a present/absent
// attribute, and the seal's mark is set through data-seal / data-seal-src.
const SEAL_TEXT = 'The End';
const SEAL_IMAGE = 'seal/alcove-mark.svg';
const special = {
  'data-magnifier': {
    watch: ['data-magnifier'],
    get: () => (player.hasAttribute('data-magnifier') ? 'on' : 'off'),
    set: (v) => player.toggleAttribute('data-magnifier', v === 'on'),
  },
  'data-seal-demo': {
    watch: ['data-seal', 'data-seal-src'],
    get: () => (player.hasAttribute('data-seal-src') ? 'image' : player.hasAttribute('data-seal') ? 'text' : 'initials'),
    set: (v) => {
      player.removeAttribute('data-seal');
      player.removeAttribute('data-seal-src');
      if (v === 'text') player.setAttribute('data-seal', SEAL_TEXT);
      if (v === 'image') player.setAttribute('data-seal-src', SEAL_IMAGE);
    },
  },
};
// if the video has already ended, press the seal again so a change can be seen
const restamp = () => {
  const seal = player.querySelector('.tk-seal');
  if (!seal || !player.hasAttribute('data-ended')) return;
  seal.style.animation = 'none';
  void seal.offsetWidth;
  seal.style.animation = '';
};

document.querySelectorAll('.demo-switch').forEach((group) => {
  const attr = group.dataset.attr;
  const custom = special[attr];
  const buttons = [...group.querySelectorAll('[data-value]')];
  const mark = (btn) => buttons.forEach((b) => {
    b.setAttribute('aria-checked', String(b === btn));
    b.tabIndex = b === btn ? 0 : -1;
  });
  const select = (btn) => {
    const v = btn.dataset.value;
    if (custom) custom.set(v);
    else player.setAttribute(attr, v);
    mark(btn);
    if (attr === 'data-seal-demo' || attr === 'data-seal-align') restamp();
    // iOS only reports tilt after the visitor allows it, from a tap like this one
    if (attr === 'data-depth' && v === 'on') askTilt();
  };
  buttons.forEach((b) => { b.tabIndex = b.getAttribute('aria-checked') === 'true' ? 0 : -1; b.addEventListener('click', () => select(b)); });
  // the player can change these itself (its own toggles, remembered choices), so
  // the switch follows the attribute rather than only setting it
  const reflect = () => {
    const now = custom ? custom.get() : player.getAttribute(attr);
    const match = buttons.find((b) => b.dataset.value === now);
    if (match) mark(match);
  };
  new MutationObserver(reflect).observe(player, { attributes: true, attributeFilter: custom ? custom.watch : [attr] });
  reflect();
  group.addEventListener('keydown', (e) => {
    const i = buttons.indexOf(document.activeElement);
    if (i < 0 || !['ArrowRight', 'ArrowLeft'].includes(e.key)) return;
    const next = buttons[(i + (e.key === 'ArrowRight' ? 1 : buttons.length - 1)) % buttons.length];
    next.focus();
    select(next);
    e.preventDefault();
  });
});

// "Play the ending": the last couple of seconds, so the seal can be seen
document.querySelector('[data-action="ending"]')?.addEventListener('click', () => {
  const host = player.querySelector('.tk-video');
  const video = host?.shadowRoot?.querySelector('video') || host;
  if (!video || !Number.isFinite(video.duration)) return;
  video.currentTime = Math.max(0, video.duration - 2.5);
  video.play().catch(() => {});
});

// The lattice only shows while the settings door is open: open it (without moving
// focus) when its controls are used. [data-tk-keep-open] stops a press here from
// closing it again.
document.querySelectorAll('[data-tk-keep-open]').forEach((cell) => {
  const show = () => player.tokonoma?.settings?.open({ focus: false });
  cell.addEventListener('pointerdown', show);
  cell.addEventListener('focusin', show);
});

// Sliders that set a CSS custom property on the player.
document.querySelectorAll('.demo-range input').forEach((input) => {
  const out = input.parentElement.querySelector('output');
  const apply = () => {
    const unit = input.dataset.unit || '';
    player.style.setProperty(input.dataset.var, `${input.value}${unit}`);
    input.style.setProperty('--p', `${((input.value - input.min) / (input.max - input.min)) * 100}%`);
    const show = input.dataset.show ?? unit;
    if (out) out.textContent = show ? `${input.value}${show}` : Number(input.value).toFixed(2);
  };
  input.addEventListener('input', apply);
  apply();
});

// Dropdowns: each settings block and each feature folds away behind its heading.
// The contents after the heading are wrapped in a body (prefix-body > prefix-inner)
// and the heading gets a toggle button; CSS animates the fold and the wipe.
const INTERACTIVE = 'button, a, input, select, textarea, label, summary, [role="radio"], [role="slider"], [role="button"], [tabindex], .demo-range, .board-colour, pre';
const chevron = '<svg viewBox="0 0 14 14" aria-hidden="true"><path d="M2.5 5 7 9.5 11.5 5"/></svg>';
function makeFolds(items, prefix, titleSel, { openFirst = false } = {}) {
  items.forEach((item, i) => {
    const title = item.querySelector(titleSel);
    if (!title) return;
    const body = document.createElement('div');
    body.className = `${prefix}-body`;
    body.id = `${prefix}-body-${i}`;
    const inner = document.createElement('div');
    inner.className = `${prefix}-inner`;
    while (title.nextSibling) inner.append(title.nextSibling);
    body.append(inner);
    item.append(body);
    const btn = document.createElement('button');
    btn.type = 'button';
    btn.className = `${prefix}-toggle`;
    btn.setAttribute('aria-controls', body.id);
    btn.innerHTML = `<span></span><i class="fold-line" aria-hidden="true"></i>${chevron}`;
    btn.firstChild.textContent = title.textContent;
    title.textContent = '';
    title.append(btn);
    const set = (open) => {
      item.classList.toggle('is-open', open);
      btn.setAttribute('aria-expanded', String(open));
    };
    btn.addEventListener('click', () => set(!item.classList.contains('is-open')));
    // the whole block is the target: a tap anywhere in it that isn't on one of its
    // own controls opens or closes it (the button stays the keyboard's way in)
    item.classList.add(`${prefix}-tappable`);
    item.addEventListener('click', (e) => {
      const hit = e.target.closest(INTERACTIVE);
      if (hit && hit !== item && item.contains(hit)) return;
      if (String(getSelection?.() || '').trim()) return;   // selecting text, not tapping
      set(!item.classList.contains('is-open'));
    });
    set(openFirst && i === 0);
  });
}
(() => {
  const board = document.querySelector('.board');
  if (board) {
    board.classList.add('is-folding');
    makeFolds([...board.querySelectorAll('.board-cell')], 'board', '.board-title', { openFirst: true });
  }
  makeFolds([...document.querySelectorAll('.feature-grid li')], 'feature', 'h3');
  // a masonry: every block keeps its own height, so opening one doesn't stretch
  // its neighbours. Rows are 1px and each block spans its height (+ the gap).
  // Blocks are dealt into columns in reading order and stay in their column, so
  // opening one only moves the blocks beneath it, never across.
  const masonry = (grid, gap) => {
    if (!grid || !('ResizeObserver' in window)) return;
    const items = [...grid.children];
    grid.classList.add('is-masonry');
    const columns = () => getComputedStyle(grid).gridTemplateColumns.split(' ').filter(Boolean).length || 1;
    let cols = 0;
    let wide = [];
    const place = () => {
      // read the stylesheet's own columns: a block still placed in a column that
      // no longer exists (after a rotation, say) would add a stray implicit one
      items.forEach((el) => { el.style.gridColumn = ''; el.style.gridRow = ''; });
      const n = columns();
      if (n !== cols) {
        // blocks the stylesheet stretches across the grid (grid-column: 1 / -1) stay full width
        cols = n;
        wide = items.map((el) => getComputedStyle(el).gridColumnEnd === '-1');
      }
      const next = new Array(n).fill(1);
      let k = 0;
      items.forEach((el, i) => {
        const span = Math.max(1, Math.ceil(el.getBoundingClientRect().height + gap));
        if (wide[i]) {
          const top = Math.max(...next);
          el.style.gridColumn = '1 / -1';
          el.style.gridRow = `${top} / span ${span}`;
          next.fill(top + span);
          k = 0;
          return;
        }
        const c = k++ % n;
        el.style.gridColumn = String(c + 1);
        el.style.gridRow = `${next[c]} / span ${span}`;
        next[c] += span;
      });
    };
    let queued = false;
    const ro = new ResizeObserver(() => { if (!queued) { queued = true; requestAnimationFrame(() => { queued = false; place(); }); } });
    items.forEach((el) => ro.observe(el));
    ro.observe(grid);
    place();
  };
  masonry(board, 2);
  masonry(document.querySelector('.feature-grid'), 10);
})();

// Entrances: headings wipe in from the left; body text is unmasked from the top
// down, so its lines appear one after another. A soft moving mask gives the
// line-by-line feel without splitting text into per-line elements (which would
// need re-measuring on every resize). Nothing is hidden without JS, or with
// reduced motion.
(() => {
  if (!('IntersectionObserver' in window) || matchMedia('(prefers-reduced-motion: reduce)').matches) return;
  const wipe = '.site-title, .site-caption, .story-label h2, .board-title';
  const lines = '.site-lede, .site-byline, .story-body > p, .story-map > div, .feature-grid li, .stats li, .compare figure, .code-block, .use-list li, .story-photo, .process-grid figure, .site-foot p, .demo-hint';
  const els = [...document.querySelectorAll(`${wipe}, ${lines}`)];
  document.documentElement.classList.add('rv');
  for (const el of els) el.classList.add(el.matches(wipe) ? 'rv-wipe' : 'rv-lines');
  const io = new IntersectionObserver((entries) => {
    let n = 0;
    for (const e of entries) {
      if (!e.isIntersecting) continue;
      const el = e.target;
      el.style.setProperty('--rv-delay', `${Math.min(n++, 6) * 90}ms`);
      el.classList.add('rv-in');
      // once revealed, drop the mask so the page paints as plain text again
      const done = (ev) => {
        if (ev.target !== el || ev.propertyName !== '--rv') return;
        el.classList.add('rv-done');
        el.removeEventListener('transitionend', done);
      };
      el.addEventListener('transitionend', done);
      io.unobserve(el);
    }
  }, { rootMargin: '0px 0px -6% 0px', threshold: 0.01 });
  els.forEach((el) => io.observe(el));
})();

// Copy buttons on code samples.
document.querySelectorAll('.code-copy').forEach((btn) => {
  btn.addEventListener('click', async () => {
    const text = document.querySelector(btn.dataset.copy)?.textContent || '';
    try {
      await navigator.clipboard.writeText(text);
    } catch {
      // older browsers, or no clipboard permission: select the text instead
      const range = document.createRange();
      range.selectNodeContents(document.querySelector(btn.dataset.copy));
      getSelection().removeAllRanges();
      getSelection().addRange(range);
    }
    btn.textContent = 'Copied';
    btn.setAttribute('data-done', '');
    setTimeout(() => { btn.textContent = 'Copy'; btn.removeAttribute('data-done'); }, 1600);
  });
});

// The showcase loop: plays (muted) only when motion is welcome and it's on screen,
// and can always be paused or played.
(() => {
  const reel = document.querySelector('.site-reel video');
  const toggle = document.querySelector('.site-reel-toggle');
  if (!reel || !toggle) return;
  const reduce = matchMedia('(prefers-reduced-motion: reduce)').matches;
  // plays by itself on wide screens; on phones (saving a megabyte of data) and
  // with reduced motion it waits for Play
  let wanted = !reduce && matchMedia('(min-width: 1000px)').matches;
  const label = () => {
    toggle.textContent = wanted ? 'Pause' : 'Play';
    toggle.setAttribute('aria-label', wanted ? 'Pause the tour' : 'Play the tour');
  };
  label();
  let visible = false;
  const sync = () => { if (wanted && visible) reel.play().catch(() => {}); else reel.pause(); };
  reel.addEventListener('playing', () => reel.closest('.site-reel').setAttribute('data-playing', ''), { once: true });
  toggle.addEventListener('click', () => { wanted = !wanted; label(); sync(); });
  // start once the page itself has loaded, so the loop doesn't compete with it
  const start = () => {
    if ('IntersectionObserver' in window) {
      new IntersectionObserver(([e]) => { visible = e.isIntersecting; sync(); }, { threshold: 0.2 }).observe(reel);
    } else { visible = true; sync(); }
  };
  if (document.readyState === 'complete') setTimeout(start, 300);
  else addEventListener('load', () => setTimeout(start, 300), { once: true });
})();

// The room photograph behind the page: fetched once everything else has loaded.
(() => {
  const ready = () => {
    const img = new Image();
    img.onload = () => document.documentElement.classList.add('bg-ready');
    img.src = new URL('process/tokonoma-room.jpg', document.baseURI).href;
  };
  if (document.readyState === 'complete') ready();
  else addEventListener('load', ready, { once: true });
})();

// Contents: appears once the introduction has scrolled away; marks the section
// you're reading; on narrower screens it opens from a button in the corner.
(() => {
  const toc = document.querySelector('.toc');
  if (!toc) return;
  const toggle = toc.querySelector('.toc-toggle');
  const links = [...toc.querySelectorAll('a')];
  const targets = links.map((a) => document.getElementById(a.hash.slice(1)));
  const intro = document.querySelector('.site-head');
  const setOpen = (open) => {
    toc.toggleAttribute('data-open', open);
    toggle.setAttribute('aria-expanded', String(open));
  };
  toggle.addEventListener('click', () => setOpen(!toc.hasAttribute('data-open')));
  links.forEach((a) => a.addEventListener('click', () => setOpen(false)));
  document.addEventListener('keydown', (e) => {
    if (e.key === 'Escape' && toc.hasAttribute('data-open')) { setOpen(false); toggle.focus(); }
  });
  document.addEventListener('pointerdown', (e) => { if (!toc.contains(e.target)) setOpen(false); });

  // it steps aside while you read on (scrolling down) and comes back the moment
  // you scroll up — or stays, while its list is open
  let queued = false;
  let lastY = scrollY;
  const wide = matchMedia('(min-width: 1600px)');
  let away = false;
  const update = () => {
    queued = false;
    const past = intro ? intro.getBoundingClientRect().bottom < innerHeight * 0.35 : scrollY > 300;
    const dy = scrollY - lastY;
    if (Math.abs(dy) > 6) { away = dy > 0; lastY = scrollY; }
    const open = toc.hasAttribute('data-open');
    const list = wide.matches;   // wide screens: a quiet list in the margin, always there
    toc.toggleAttribute('data-hidden', !past || (!list && away && !open && !toc.contains(document.activeElement)));
    if (!past) setOpen(false);
    // the current section: the last one whose top has passed 40% of the screen
    let current = 0;
    targets.forEach((t, i) => { if (t && t.getBoundingClientRect().top < innerHeight * 0.4) current = i; });
    links.forEach((a, i) => (i === current ? a.setAttribute('aria-current', 'location') : a.removeAttribute('aria-current')));
  };
  addEventListener('scroll', () => { if (!queued) { queued = true; requestAnimationFrame(update); } }, { passive: true });
  addEventListener('resize', update);
  update();
})();

// Custom colours: the Custom swatch opens eight pickers that set the player's colour
// styles (--tokonoma-*). They start from the scheme you were on, are kept for your
// next visit, and can be copied out as CSS.
(() => {
  const panel = document.querySelector('.board-custom');
  if (!panel) return;
  const inputs = [...panel.querySelectorAll('input[data-colour]')];
  const chips = [...document.querySelectorAll('.board-chips-custom i')];
  const KEY = 'tokonoma.custom';
  const TOKENS = { wood: '--tk-walnut', floor: '--tk-hinoki', paper: '--tk-washi', ink: '--tk-sumi', 'ink-soft': '--tk-ink-soft', wall: '--tk-clay', accent: '--tk-matcha', 'accent-deep': '--tk-matcha-deep' };
  const hex = (c) => {
    const n = (c.match(/[\d.]+/g) || []).slice(0, 3).map((x) => Math.round(+x));
    return n.length === 3 ? `#${n.map((x) => x.toString(16).padStart(2, '0')).join('')}` : '#000000';
  };
  const load = () => { try { return JSON.parse(localStorage.getItem(KEY) || 'null'); } catch { return null; } };
  const save = (v) => { try { localStorage.setItem(KEY, JSON.stringify(v)); } catch { /* not available */ } };
  // a scheme's colours, read from a hidden probe (the player itself may be mid-fade)
  const schemeColours = (theme) => {
    const probe = document.createElement('div');
    probe.className = 'tk';
    probe.dataset.theme = theme || 'hinoki';
    probe.style.display = 'none';
    document.body.append(probe);
    const cs = getComputedStyle(probe);
    const out = Object.fromEntries(Object.entries(TOKENS).map(([k, t]) => [k, hex(cs.getPropertyValue(t))]));
    probe.remove();
    return out;
  };
  const paintChips = (c) => ['wood', 'floor', 'paper', 'accent'].forEach((k, i) => { if (chips[i]) chips[i].style.background = c[k]; });
  const apply = (c) => { for (const [k, v] of Object.entries(c)) player.style.setProperty(`--tokonoma-${k}`, v); paintChips(c); };
  const clear = () => Object.keys(TOKENS).forEach((k) => player.style.removeProperty(`--tokonoma-${k}`));
  const fill = (c) => inputs.forEach((i) => { i.value = c[i.dataset.colour]; });

  let scheme = player.getAttribute('data-theme') === 'custom' ? 'hinoki' : player.getAttribute('data-theme');
  paintChips(load() || schemeColours(scheme));
  const sync = () => {
    const theme = player.getAttribute('data-theme');
    const custom = theme === 'custom';
    panel.classList.toggle('is-shown', custom);
    panel.inert = !custom;
    panel.setAttribute('aria-hidden', String(!custom));
    if (custom) {
      const c = load() || schemeColours(scheme);
      fill(c);
      apply(c);
    } else {
      clear();
      scheme = theme;
    }
  };
  inputs.forEach((i) => i.addEventListener('input', () => {
    const c = Object.fromEntries(inputs.map((x) => [x.dataset.colour, x.value]));
    apply(c);
    save(c);
  }));
  new MutationObserver(sync).observe(player, { attributes: true, attributeFilter: ['data-theme'] });
  sync();

  panel.querySelector('[data-action="copy-colours"]')?.addEventListener('click', async (e) => {
    const btn = e.currentTarget;
    const css = `tokonoma-player, .tk {\n${inputs.map((i) => `  --tokonoma-${i.dataset.colour}: ${i.value};`).join('\n')}\n}\n`;
    try { await navigator.clipboard.writeText(css); btn.textContent = 'Copied'; } catch { btn.textContent = 'Copy unavailable'; }
    setTimeout(() => { btn.textContent = 'Copy as CSS'; }, 1600);
  });
})();

// Phones: a section's heading pins to the top of the screen, and the section's
// text is masked away beneath it as it scrolls up (--clip), like the player's
// scrolling menus, so the heading needs no backing band.
(() => {
  const mq = matchMedia('(max-width: 760px)');
  const sections = [...document.querySelectorAll('.story-section')].map((sec) => ({
    label: sec.querySelector('.story-label'),
    body: sec.querySelector('.story-body'),
  })).filter((x) => x.label && x.body);
  if (!sections.length) return;
  let queued = false;
  const update = () => {
    queued = false;
    if (!mq.matches) { sections.forEach(({ body }) => body.style.removeProperty('--clip')); return; }
    for (const { label, body } of sections) {
      const b = body.getBoundingClientRect();
      if (b.bottom < -50 || b.top > innerHeight) continue;
      const h = label.querySelector('h2') || label;
      // the fade starts just below the heading's text
      const edge = h.getBoundingClientRect().bottom + 8 - b.top;
      body.style.setProperty('--clip', `${Math.round(edge)}px`);
    }
  };
  const queue = () => { if (!queued) { queued = true; requestAnimationFrame(update); } };
  addEventListener('scroll', queue, { passive: true });
  addEventListener('resize', queue);
  mq.addEventListener('change', queue);
  update();
})();
