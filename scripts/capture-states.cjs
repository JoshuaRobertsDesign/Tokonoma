// Drives the player into each designed state and saves a still of it.
// Usage: node scripts/capture-states.cjs <url> <outDir> [scale]
const { chromium } = require('playwright');
const path = require('path');
const fs = require('fs');

const [, , URL = 'http://127.0.0.1:5173/', OUT = 'stills', SCALE = '1'] = process.argv;
fs.mkdirSync(OUT, { recursive: true });
const scale = Number(SCALE);

const DESKTOP = { width: 1400, height: 860 };
const MOBILE = { width: 392, height: 760 };

const MEDIA = path.join(__dirname, '..', 'public', 'media', 'robin.mp4');
const MEDIA_BYTES = fs.existsSync(MEDIA) ? fs.readFileSync(MEDIA) : null;

// Serves the video only up to `limit` bytes, then stops answering: a real network stall.
async function throttleMedia(page, limitFraction) {
  const limit = Math.floor(MEDIA_BYTES.length * limitFraction);
  await page.route('**/robin.mp4', async (route) => {
    const range = route.request().headers()['range'] || 'bytes=0-';
    const [, a, b] = range.match(/bytes=(\d+)-(\d*)/) || [];
    const start = Number(a || 0);
    if (start >= limit) return; // hang
    const end = Math.min(b ? Number(b) : MEDIA_BYTES.length - 1, limit - 1);
    await route.fulfill({
      status: 206,
      headers: {
        'Content-Type': 'video/mp4',
        'Accept-Ranges': 'bytes',
        'Content-Range': `bytes ${start}-${end}/${MEDIA_BYTES.length}`,
        'Content-Length': String(end - start + 1),
      },
      body: MEDIA_BYTES.subarray(start, end + 1),
    });
  });
}

async function freezeGlide(page, at = 0.45) {
  await page.evaluate((t) => {
    const g = document.querySelector('.tk-glide');
    g.style.animationDelay = `-${1.6 * t}s`;
    g.style.animationPlayState = 'paused';
  }, at);
  await page.waitForTimeout(100);
}

async function open(browser, { viewport = DESKTOP, hold = [], throttle = null, reducedMotion = 'no-preference', attrs = {} } = {}) {
  const ctx = await browser.newContext({ viewport, deviceScaleFactor: scale, reducedMotion });
  const page = await ctx.newPage();
  page.on('pageerror', (e) => console.log('  pageerror:', e.message));
  for (const pattern of hold) await page.route(pattern, () => {}); // never answers: stays loading
  if (throttle) await throttleMedia(page, throttle);
  await page.goto(URL, { waitUntil: hold.length || throttle ? 'domcontentloaded' : 'networkidle' });
  if (Object.keys(attrs).length) {
    await page.evaluate((a) => { const c = document.querySelector('.tk'); for (const [k, v] of Object.entries(a)) c.setAttribute(k, v); }, attrs);
  }
  await page.evaluate(() => document.fonts.ready);
  await page.waitForTimeout(700);
  return { ctx, page };
}

const box = (page, sel) => page.locator(sel).first().boundingBox();

async function shot(page, name) {
  const el = page.locator('video-player');
  const file = path.join(OUT, `${name}.png`);
  await el.screenshot({ path: file, animations: 'allow' });
  console.log('  saved', name);
}

async function seekTo(page, fraction) {
  await page.evaluate(async (f) => {
    const v = document.querySelector('video');
    await new Promise((r) => (v.readyState >= 1 ? r() : v.addEventListener('loadedmetadata', r, { once: true })));
    v.currentTime = f * v.duration;
    await new Promise((r) => v.addEventListener('seeked', r, { once: true }));
  }, fraction);
}

async function play(page) {
  await page.evaluate(() => document.querySelector('video').play());
  await page.waitForTimeout(300);
}

async function pause(page) {
  await page.evaluate(() => document.querySelector('video').pause());
}

async function floorUp(page) {
  const b = await box(page, '.tk-alcove');
  await page.mouse.move(b.x + b.width * 0.5, b.y + b.height * 0.4);
  await page.mouse.move(b.x + b.width * 0.52, b.y + b.height * 0.42);
  await page.waitForTimeout(600);
}

async function floorDown(page) {
  await page.mouse.move(5, 5);
  await page.waitForTimeout(3600);
}

async function stall(page) {
  // Pretend the network ran dry: the media reports `waiting` until it gets more data.
  await page.evaluate(() => document.querySelector('video').dispatchEvent(new Event('waiting')));
  await page.waitForTimeout(700);
}

(async () => {
  const browser = await chromium.launch({ args: ['--autoplay-policy=no-user-gesture-required'] });
  const ONLY=process.env.ONLY; const run = async (name, fn) => { if (ONLY && !name.startsWith(ONLY)) return; console.log(name); try { await fn(); } catch (e) { console.log('  FAILED', e.message); } };

  await run('01 loading – before the poster', async () => {
    const { ctx, page } = await open(browser, { hold: ['**/poster.jpg', '**/robin.mp4'] });
    await page.waitForTimeout(500);
    await freezeGlide(page, 0.3);
    await shot(page, '01-loading-pre-poster');
    await ctx.close();
  });

  await run('02 poster', async () => {
    const { ctx, page } = await open(browser);
    await shot(page, '02-poster');
    await page.keyboard.press('Tab');
    await page.keyboard.press('Tab');
    await page.waitForTimeout(200);
    await shot(page, '02b-poster-focus-play');
    await ctx.close();
  });

  await run('03 loading – after pressing play', async () => {
    // only the first ~1.5% of the file arrives, so playback stalls right after it starts
    const { ctx, page } = await open(browser, { throttle: 0.015 });
    await page.evaluate(() => document.querySelector('video').play().catch(() => {}));
    await floorUp(page);
    await page.waitForSelector('.tk[data-loading]', { timeout: 8000 });
    await page.waitForTimeout(300);
    await freezeGlide(page, 0.4);
    await shot(page, '03-loading-after-play');
    await ctx.close();
  });

  await run('07 buffering partway through', async () => {
    const { ctx, page } = await open(browser, { throttle: 0.46 });
    await seekTo(page, 0.435);
    await page.evaluate(() => document.querySelector('video').play().catch(() => {}));
    await page.waitForSelector('.tk[data-loading]', { timeout: 20000 });
    await floorUp(page);
    await page.waitForTimeout(300);
    await freezeGlide(page, 0.08);
    await shot(page, '07-buffering');
    await ctx.close();
  });

  await run('04–09 playback', async () => {
    const { ctx, page } = await open(browser);
    await seekTo(page, 0.36);
    await play(page);
    await floorDown(page);
    await shot(page, '04-playing-floor-hidden');

    await floorUp(page);
    await shot(page, '05-playing-floor-up');

    await pause(page);
    await page.waitForTimeout(500);
    await shot(page, '06-paused');

    const seek = await box(page, '.tk-seek');
    await page.mouse.move(seek.x + seek.width * 0.74, seek.y + seek.height / 2);
    await page.waitForTimeout(400);
    await shot(page, '08-hover-preview');

    const pull = await box(page, '.tk-pull');
    await page.mouse.move(pull.x + pull.width / 2, pull.y + pull.height / 2);
    await page.mouse.down();
    await page.mouse.move(pull.x + 60, pull.y + pull.height / 2, { steps: 6 });
    await page.mouse.move(pull.x + 140, pull.y + pull.height / 2, { steps: 6 });
    await page.waitForTimeout(400);
    await shot(page, '09-scrubbing');
    await page.mouse.up();

    await page.keyboard.press('Escape');
    await ctx.close();
  });

  await run('10 ended', async () => {
    const { ctx, page } = await open(browser);
    await seekTo(page, 0.985);
    await play(page);
    await page.evaluate(() => new Promise((r) => document.querySelector('video').addEventListener('ended', r, { once: true })));
    await floorUp(page);
    await page.waitForTimeout(400);
    await shot(page, '10-ended');
    await ctx.close();
  });

  await run('11 error', async () => {
    const { ctx, page } = await open(browser);
    await page.evaluate(() => { const v = document.querySelector('video'); v.src = '/media/missing.mp4'; v.load(); });
    await page.waitForTimeout(1200);
    await page.waitForTimeout(400);
    await shot(page, '11-error');
    await ctx.close();
  });

  await run('12 menus and focus', async () => {
    const { ctx, page } = await open(browser);
    await seekTo(page, 0.5);
    await floorUp(page);
    const mute = await box(page, '.tk-mute');
    await page.mouse.move(mute.x + mute.width / 2, mute.y + mute.height / 2);
    await page.waitForTimeout(700);
    await shot(page, '12a-volume');
    await page.mouse.move(5, 5);
    await page.waitForTimeout(500);
    await page.click('.tk-more');
    await page.waitForTimeout(500);
    await shot(page, '12b-more-menu');
    await page.keyboard.press('Escape');
    await page.waitForTimeout(300);
    await page.focus('.tk-play');
    await page.keyboard.press('Tab');
    await page.keyboard.press('ArrowRight');
    await page.waitForTimeout(400);
    await shot(page, '12c-seek-focus');
    await ctx.close();
  });

  await run('13 layouts', async () => {
    for (const [name, attrs] of [['13a-post-left', { 'data-post': 'left' }], ['13b-post-hidden', { 'data-post': 'none' }]]) {
      const { ctx, page } = await open(browser, { attrs });
      await seekTo(page, 0.42);
      await floorUp(page);
      await shot(page, name);
      await ctx.close();
    }
  });

  await run('14 mobile', async () => {
    const { ctx, page } = await open(browser, { viewport: MOBILE });
    await shot(page, '14a-mobile-poster');
    await seekTo(page, 0.4);
    await play(page);
    await floorDown(page);
    await shot(page, '14b-mobile-floor-hidden');
    await floorUp(page);
    await pause(page);
    await page.waitForTimeout(400);
    await shot(page, '14c-mobile-paused');
    await ctx.close();
  });

  await run('15 reduced motion', async () => {
    const { ctx, page } = await open(browser, { reducedMotion: 'reduce' });
    await seekTo(page, 0.3);
    await floorUp(page);
    await shot(page, '15-reduced-motion-floor-up');
    await ctx.close();
  });

  await run('16 mid-tilt', async () => {
    const { ctx, page } = await open(browser);
    await seekTo(page, 0.3);
    await play(page);
    await floorDown(page);
    await page.evaluate(() => {
      // freeze the transition halfway so the tilt can be seen in a still
      document.querySelector('.tk').setAttribute('data-floor-up', '');
      getComputedStyle(document.querySelector('.tk-floor')).transform; // start the transitions
      getComputedStyle(document.querySelector('.tk-wall')).translate;
      document.getAnimations().forEach((a) => { if (a.transitionProperty) { a.pause(); a.currentTime = (a.effect.getTiming().duration || 0) * 0.45; } });
    });
    await page.waitForTimeout(100);
    await shot(page, '16-mid-tilt');
    await ctx.close();
  });

  await browser.close();
})();
