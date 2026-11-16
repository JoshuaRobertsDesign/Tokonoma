# Tokonoma — a shoji-style skin for Video.js v10

Live demo: https://tokonoma-site.vercel.app · Source: https://github.com/JoshuaRobertsDesign/Tokonoma

The video hangs on the back wall of a recessed alcove (tokonoma). When the controls are needed,
the view tilts: the wall lifts behind the lintel and the floor hinges up from the sill. A washi
door slides across the floor as the video plays, and its wooden pull (hikite) is the seek handle.
Chapters are joined into the groove with tsugite joints. The post (tokobashira) holds volume,
more options and fullscreen.

## Run it

```bash
npm install
npm run dev        # http://localhost:5173
npm run build      # static site in dist/, and the embeddable build in dist/lib/
```

## One tag

The build also produces `dist/lib/tokonoma.js` and `dist/lib/tokonoma.css`: the whole skin,
Video.js included, as one custom element. The live site serves them (with CORS) from `/lib/`:

```html
<link rel="stylesheet" href="https://tokonoma-site.vercel.app/lib/tokonoma.css">
<script type="module" src="https://tokonoma-site.vercel.app/lib/tokonoma.js"></script>

<tokonoma-player src="https://stream.mux.com/YOUR_PLAYBACK_ID.m3u8" title="A Quiet Year"
  poster="poster.jpg" chapters="chapters.vtt" captions="captions-en.vtt" theme="hinoki">
</tokonoma-player>
```

Attributes: `src` (required; HLS and Mux go through `<mux-video>`, anything else a plain
`<video>`), `title`, `poster`, `chapters`, `thumbnails`, `captions`, `captions-label`,
`captions-lang`, `fallback`, `fallback-thumbnails`, `preload`, `loading="lazy"`, and every
setting below by its short name (`theme`, `post`, `title-align`, `title-layer`, `seek`, `floor`,
`chapters-style`, `shade`, `paper-light`, `depth`, `sound`, `magnifier-shape`, `seal`,
`seal-src`, `seal-align`, `volume`, `remember="off"`). Any `data-*` attribute passes straight
through. The demo page's own player is built from the same template (`src/skin.html`) at build
time, so the two never drift apart.

## Files

| File | What it holds |
| --- | --- |
| `index.html` | The skin's markup (Video.js v10 components) and the demo page |
| `src/tokonoma.css` | The skin. Settings are CSS custom properties at the top |
| `src/main.js` | Mirrors player state onto the container, time readout, error copy, retry |
| `src/demo.css`, `src/demo.js` | Demo page only: the settings board, the showcase loop, copy buttons, entrances |
| `src/menu.js` | The settings door: speed, captions, chapters, picture, toggles |
| `src/skin.html`, `src/template.js` | The player's markup, and the function that fills it in (used by the build and by the element) |
| `src/element.js`, `src/lib.js` | `<tokonoma-player>`, and the entry for the embeddable build (`vite.lib.config.js`) |
| `src/captions.js` | Captions set on washi strips that rise with the floor (the browser's own rendering is hidden) |
| `src/fonts.css` | JetBrains Mono, Latin and Latin Extended only |
| `src/keys.js` | Extra keys (P / N chapters, S settings, Z magnifier, `,` / `.` one frame back / forward) and the washi readout for volume, speed, seeking (keys and double-tap), frames and chapters |
| `src/still.js` | Save still: downloads the frame on screen as a PNG, with the Picture settings applied (settings door → Picture) |
| `src/light.js` | Light through paper: tints the washi with the picture's colour |
| `src/seal.js` | The hanko seal pressed onto the door when the video ends |
| `src/depth.js` | Parallax depth from the pointer or the phone's tilt |
| `src/magnifier.js` | The magnifier lens |
| `src/sound.js` | Optional interface sounds, synthesised with Web Audio |
| `src/prefs.js` | Remembers speed, volume, colour scheme and sound between visits, and resumes each video where it was left (by address) |
| `public/media/` | Local copy of the video, poster, chapters and thumbnail storyboard |
| `scripts/capture-states.cjs` | Playwright script that renders every state as a still |
| `scripts/make-storyboard.sh` | Makes the seek-preview storyboard (sprite + VTT) for a video file |

## Settings

Set on `.tk` (or any parent):

| Property | Default | |
| --- | --- | --- |
| `data-post` | `right` | `right`, `left`, `tuck` (on the right, sliding out of the frame while the floor is down so the picture fills the player) or `none` (under 600px wide, the post's controls hang from the lintel as a small card instead) |
| `data-title-align` | `center` | `left`, `center`, `right` or `none` (hidden) |
| `data-title-layer` | `over` | `under`: the shade falls across the title card; `over`: the card hangs in front of it |
| `data-chapter-style` | `kumiko` | Chapter breaks in the groove: `kumiko` (tilted key), `peg` (round dowel), `rail` (crossing rail) or `gap` |
| `data-volume` | — | Starting volume, `0`–`1` (the demo uses `0.6`) |
| `data-floor-mode` | `tilt` | How the floor comes into view: `tilt` (hinges up), `slide` (rises flat) or `mask` (uncovered in place); `fixed` keeps it in view |
| `data-shade` | `on` | `none` removes the post's shade band and every shadow on the picture |
| `data-seek` | `solid` | `clear` lays a frosted, see-through floor over the picture instead of lifting it |
| `data-theme` | `hinoki` | Colour scheme: `hinoki` (walnut, cypress and washi), `urushi` (black lacquer, vermilion, gold), `aizome` (indigo, white, kihada yellow) or `sakura` (plum, blossom, leaf green). Changing it fades between palettes |
| `data-paper-light` | `on` | `off` stops the washi taking on the picture's colour (needs a CORS-clean video; otherwise it quietly stays plain) |
| `data-depth` | `on` | `off` stops the parallax drift of the wall (always off with reduced motion) |
| `data-sound` | `off` | `on` plays a wooden click on the door pulls, a paper slide on the settings door and a thud for the seal |
| `data-magnifier` | — | Present while the magnifier lens is on (toggled from the settings door or with Z) |
| `data-seal` | title initials | Text for the seal pressed onto the door at the end: up to three letters make a square seal (two stack), longer text a wider one |
| `data-seal-src` | — | An image for the seal instead (SVG or PNG), shown as it is |
| `data-seal-align` | `left` | `left` beside replay, `center` in the middle of the door, `right` beside the time |
| `--tk-seal-ink` | scheme accent | The seal's ink colour for text seals |
| `data-magnifier-shape` | `circle` | `square` for a square lens |
| `data-aspect` | `auto` | The frame's shape: `auto` takes the video's own (16:9 until it's known), or any `w:h` (`4:3`, `21:9`, `1:1`, `9:16`…). The whole picture shows (letterboxed where shapes differ), and a tall frame narrows the player rather than running past the screen's height |
| `--tk-lattice-angle` | `20deg` | How far the light rakes the settings door's lattice shadow |
| `--tk-lattice-size` | `54px` | Width of a lattice cell (cells are 1.4× as tall) |
| `--tk-lattice-opacity` | `0.08` | Darkness of the lattice bars, `0`–`1` |
| `--tk-light-x` | `1` | `1` light from the right, `-1` from the left |
| `--tk-shadow` | `0.2` | Shadow strength of the settings door's edge |
| `--tk-shade` | `0.35` | The inner shadow cast by the lintel and the post, `0`–`1`: higher values push it further in and soften it, with only a slight rise in opacity. The title card, the phone's button card and the door pulls cast shadows from the same values |
| `--tk-frame` | `2px` | Frame width around the picture, any value from `0`; everything that sits on or against the frame follows it |
| `--tk-post` | `60px` | The post's width and the floor's height (one value); the play piece and door pulls scale with it |
| `--tk-rest-brightness`, `--tk-rest-contrast` | `0.9`, `1` | Dimming while paused or ended |
| `--media-accent-color` | `#a5ba84` | Video.js public property |
| `--media-font-family` | JetBrains Mono | Video.js public property |

### Your own colours

Eight colour styles, set on the player or any parent, or as attributes on `<tokonoma-player>`
(`wood="#2a2d24"` …). They apply over whichever scheme you start from; `data-theme="custom"`
starts from hinoki. The demo's Colour block has a Custom swatch with pickers and "Copy as CSS".

```css
tokonoma-player, .tk {
  --tokonoma-wood: #2a2d24;        /* frame, post, groove, icons on paper */
  --tokonoma-floor: #6b8f71;       /* the floor, and the post's icons */
  --tokonoma-paper: #f3f6fa;       /* the washi surfaces */
  --tokonoma-ink: #0e1730;         /* text */
  --tokonoma-ink-soft: #485a7c;    /* quiet text */
  --tokonoma-wall: #c6d0df;        /* the alcove's back wall */
  --tokonoma-accent: #e8b83e;      /* accent on wood */
  --tokonoma-accent-deep: #a04c12; /* accent on paper */
}
```

### Colour schemes

Every surface is drawn from eight colour tokens, so a scheme of your own only has to name them:

```css
.tk[data-theme='mine'] {
  --tk-walnut: #1f2d50;    /* dark wood: frame, post, groove, icons on paper */
  --tk-hinoki: #8fa4c6;    /* the floor, and the post's icons */
  --tk-washi: #f3f6fa;     /* paper: the seek door, title card, settings door */
  --tk-sumi: #0e1730;      /* ink */
  --tk-ink-soft: #485a7c;  /* quiet ink: values, notes */
  --tk-clay: #c6d0df;      /* the alcove's back wall */
  --tk-matcha: var(--media-accent-color, #e8b83e);  /* accent on wood */
  --tk-matcha-deep: #a04c12;                        /* accent on paper */
}
```

Keep walnut darker than hinoki and washi, and sumi dark on washi, and every control stays legible.

## Deploy to Vercel

```bash
npm i -g vercel
vercel login
vercel --prod      # framework: Vite, output: dist
```

## Use your own video

The skin works with any media source. Put whichever media element suits you inside
`<div class="tk-wall">`, give it the class **`tk-video`**, and import its module. The skin finds
it, waits for it to be defined, and adapts to what it supports. Everything else in the markup
stays the same.

| Source | Element | Import (and package) |
| --- | --- | --- |
| A file (MP4, WebM) | `<video class="tk-video" src="…">` | none, native |
| Mux | `<mux-video class="tk-video" src="https://stream.mux.com/{PLAYBACK_ID}.m3u8" crossorigin="anonymous">` | `@videojs/html/media/mux-video` (`@videojs/mux-video`) |
| HLS from any host | `<hlsjs-video class="tk-video" src="….m3u8">` | `@videojs/html/media/hlsjs-video` |
| DASH | `<dash-video class="tk-video" src="….mpd">` | `@videojs/html/media/dash-video` (`@videojs/dash-video`) |
| YouTube | `<youtube-video class="tk-video" src="https://www.youtube.com/watch?v=…">` | `@videojs/html/media/youtube-video` (`@videojs/youtube-video`) |
| Vimeo | `<vimeo-video class="tk-video" src="https://vimeo.com/…">` | `@videojs/html/media/vimeo-video` (`@videojs/vimeo-video`) |

`src/main.js` imports `mux-video` for the demo; swap that line for the element you use.

**Chapters, thumbnails and captions** are ordinary `<track>` children of the media element:

```html
<video class="tk-video" src="media/film.mp4" preload="metadata" playsinline>
  <track kind="chapters" src="media/chapters.vtt" srclang="en" label="Chapters" default />
  <track kind="metadata" label="thumbnails" src="media/thumbnails.vtt" default />
  <track kind="captions" src="media/captions-en.vtt" srclang="en" label="English" />
</video>
```

- **Chapters** give the groove its kumiko joints, the chapter titles in the preview card, and the Chapters list with Loop chapter. Without a chapters track the groove is one piece and the Chapters row hides itself.
- **Thumbnails** are a storyboard VTT (sprite sheet + `#xywh=` cues). Mux generates one automatically; for a file, run `scripts/make-storyboard.sh public/media/film.mp4`.
- **Captions** appear in the Captions submenu; with none, it says so.
- **Fallback source:** `data-fallback-src="media/film.mp4"` (and optionally `data-fallback-thumbnails="…vtt"`) on the media element switches to that file once if the main source fails, instead of showing the error card. The demo uses it so the Mux stream falls back to a local copy.

**Embeds (YouTube, Vimeo and similar)** play inside the provider's iframe, so they expose less:
there are no `<track>` chapters, thumbnails or captions, picture-in-picture follows the provider,
and the speed list depends on what the provider allows. Play, seek, time, volume, fullscreen,
the picture filters and the floor all work as usual.

**Several players on one page** are fine: every `media-container.tk` gets its own instance, and
the ids inside each settings door are made unique automatically.

## Notes

- **Licenses**: `npm run build` writes `THIRD-PARTY-NOTICES.txt` (from the installed packages' own
  LICENSE/NOTICE files) to the site root and to `/lib/`, and the hosted scripts carry a banner
  pointing to it. Video.js, hls.js and the Mux element are Apache-2.0; Lit BSD-3-Clause; Phosphor
  Icons MIT; JetBrains Mono OFL-1.1.

- **Storyboard image paths** in a thumbnails VTT are relative to the VTT file. On `<mux-video>`
  (and other media elements) Video.js would resolve them against the page, so the skin rewrites
  such tracks with full URLs before they load.
- **Captions**: the demo's track (`media/captions-en.vtt`) is SDH for a film with no dialogue:
  the music, its credit, where it rises and where it fades. `C` toggles captions.
- **Checked**: axe-core (WCAG 2.1 AA) reports no issues, and Lighthouse gives accessibility 100
  on desktop and mobile. The skin's own CSS and JS come to about 24 KB gzipped.

## License

Apache License 2.0 (see `LICENSE` and `NOTICE`), as the Contra Video.js Skins Design Challenge
asks of entries. Copyright 2026 Joshua Roberts. Third-party licenses are in
`public/THIRD-PARTY-NOTICES.txt`.

## In Framer

`framer/TokonomaPlayer.tsx` is a code component: in Framer, Assets → Code → New File, paste it in, and drag **Tokonoma Player** onto the canvas. It loads the skin from `tokonoma-site.vercel.app/lib`, sizes its own height, and exposes every setting (video, layout, colours, light and frame, lattice, extras, font) as grouped property controls. A plain Embed works too: paste the snippet from the site's "Use it" section (all its URLs are absolute); scripts in an Embed only run in Preview and on the published site, not on the canvas.
