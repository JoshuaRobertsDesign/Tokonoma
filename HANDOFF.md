# Tokonoma — handoff for a new chat

**Read this first, then the code.** This project is Joshua's entry for the Contra **Video.js Skins Design Challenge**. The deadline is **Nov 16, 11:59pm PST**, which is **Tue Nov 17, 1:29pm IST**.

Judging is out of 25:
- visual design: 10
- usability: 5
- accessibility: 5
- polish: 5

Two bonus points are available:
- +1 for hosting the video on Mux
- +1 for a live site, such as joshuaroberts.design

The judges are Sam Potts (Plyr) and Steve Heffernan (Video.js).

## Where things are

- **Designs:** Framer project **"Shoji Video.js v10 player"** (id `6XnnUCdvXaxs7hcyhnJp`). Its pages:
  - **Finished Player States:** 13 desktop frames.
  - **Control Components:** in progress.
  - **Prelim Design Sandbox**
  - A component named **"floor animation"**. It is the reference for the floor reveal and has not been read yet, because Framer kept timing out.
- **Code:** this folder, a Vite project on Video.js **10.4.0** (`@videojs/html`).
  - `index.html`: the skin markup.
  - `src/tokonoma.css`: the skin, with its settings as custom properties at the top.
  - `src/main.js`: mirrors state onto the container.
  - `scripts/capture-states.cjs`: renders every state to PNG with Playwright (`ONLY=<prefix>` runs a single state).
- **Live preview:** a claude.ai artifact named "Tokonoma Player". To update it, republish to the same URL. In that build the `.vtt` files are renamed `.txt`, because artifacts don't serve `.vtt`.
- **Video:** "A Quiet Year", 1:29, seven chapters (Daybreak → Autumn maple) cut from the user's stock clips, with the clips muted under "Whispering Bamboo (Zen)" by Djovan (first 1:29, 1.5s fade in, 5s fade out, −18 LUFS). Master (1080p30, for Mux) is in `/home/claude/mux-video/build/`; a 720p web copy is `public/media/quiet-year.mp4`, with poster, 2s storyboard and `chapters.vtt`. Render scripts: `/home/claude/mux-video/scenes.py`, `render.py`.

## Chapters

| Time | Title |
| --- | --- |
| 00:00 | Seems Perfect |
| 00:18 | Double Check |
| 00:23 | Taste Test |
| 00:36 | Anyone back there? |
| 00:44 | Going in! |
| 00:52 | Blubblburlurbrb |
| 01:29 | SOMETHING TOUCHED MY LEG!! |

## Design values (from Framer)

**Colours:**

| Name | Value |
| --- | --- |
| Sumi | `#2B2118` |
| Walnut | `#5E4F47` |
| Hinoki | `#C9B69F` |
| Washi | `#EFE6D6`, and `rgba(239,230,214,.72)` for cards |
| Matcha | `#A5BA84` |
| Matcha Darker | `#507024`, used for focus on light surfaces |
| Clay wall | `#CFC5B4`, with noise |

**Type:** JetBrains Mono, self-hosted with fontsource.

| Style | Size / weight | Notes |
| --- | --- | --- |
| current | 13 / 400 | |
| duration | 13 / 300 | |
| title | 16 / 500 | |
| body | 13 / 400 | line height 1.5 |
| heading | 11 / 500 | uppercase, letter-spacing .08em |

All styles use letter-spacing .04em unless noted.

**Geometry:**
- Frame 8px.
- Post 64px, on the right, with 3 cells: mute, more, fullscreen. Icons are hinoki, Phosphor Light.
- Video area 16:9, 1200×675 in the design.
- Floor 64px.
- Washi edge piece 84px, holding play: Phosphor Fill, 40px, walnut.

**Shadows:**
- Recess: `inset -20px 8px 4px rgba(0,0,0,.2)`, multiply. Light comes from the top right.
- Floor: `inset -20px 0 4px`.
- Title card: `-8px 8px 2px rgba(0,0,0,.2)`, washi .72, blur 5px. It hangs from the lintel at left 20px.

**Seek:**
- Groove: walnut, 4px, `inset 0 2px 1px rgba(0,0,0,.4)`. The unbuffered part has a washi overlay.
- Washi door: rgba(239,230,214,.8), 2px walnut right edge, blur 2px. Width is 84px plus the fill.
- Hikite pull: 12×40 walnut with a hinoki inner notch. It turns matcha while dragging, and is centred on the door's edge line.
- Time readout: stacked, travelling beside the pull. It flips to the tan side when the washi is too narrow.

**Kumiko chapter joint:** a parent frame 8px wide and floor-tall, in hinoki, rotated −45°. Inside it sits a groove-sized key (8×4) in walnut. The user specifically wants this construction.

**Preview card:**
- Washi .6 with blur 5.
- 16:9 thumbnail.
- Label tab the width of the thumbnail: the chapter title in uppercase, clamped to 2 lines, with its height animating, then the time.
- A washi hover line marks the pointer position.
- While scrubbing, the time is hidden.

## Behaviour decisions

- **Floor:** rising mode, matched to the user's recording of the Framer "floor animation" component, then refined with their feedback.
  - Values come from the user's Framer variants:
    - **Main floor, up:** `rotateX 0`, opacity 1, brightness 1.
    - **Main floor, down:** `translateY(64px)` (its top reaches the frame's bottom edge), `rotateX(90deg)`, perspective 1200, origin 50% 0%, opacity 0.8, brightness 0.8.
    - **Thin strip (`.tk-mini`, z-index above the main floor), down:** at rest, brightness 0.8.
    - **Thin strip, up:** `translateY(-56px)` (at the lifted video's edge), `rotateX(90deg)`, opacity 0, brightness 0.5. Origin 50% 0%.
  - `.tk-floor` is a still box that clips sideways (`overflow-x: clip`), and `.tk-floor-plane` inside it does the tilting.
  - Motion is 900ms with `cubic-bezier(.16,1,.3,1)`.
  - The post's shadow is **one continuous band** (`.tk-shade`) over the wall, floor and strip. It narrows (`scaleX .55`) with the floor down and widens with it up. Never add a separate shadow on the floor. Its top eases from 8px to 16px while the floor is up. The recess's top inner shadow also gains a 4px spread when the floor is up (`--tk-recess-spread-up`), so it grows inward evenly. Frame jambs (`.tk::before/::after`) sit above the floor, so the tilting floor always passes behind the frame. (A "floor in front" option was tried and dropped at the user's request.)
- **Title card reveal:** the card slides down while its text slides up by 48px, so the text holds still and is unmasked. Use this on all future washi slide-out panels.
- **Preview card:** wipes in **as one piece** from the bottom: `.tk-preview-mask` slides up and `.tk-preview-body` slides down. The chapter and time text are copied from Video.js's elements only while the card is open, so the closing wipe keeps the right chapter. Video.js already centres the preview, so don't add a translate.
- **Pause/ended dim:** `.tk-dim` applies a backdrop of brightness .9 and contrast 1 that **sweeps in from the post's side** using `clip-path`.
- **Intro:** the washi door starts shut and slides open from the end to the start (1.4s ease-out) once the video is ready (`data-intro-done`, driven by the `--tk-intro` property).
- **Hover line:** follows the pointer even while the card is held at an edge. It turns walnut over the washi (`data-tk-over-door`).
- **Options:** `data-post` (`right`, `left`, `none`), `data-title-align` (`left`, `center`, `right`), `data-shade` (`on`, `none`). The demo bar has switches for all three.
- **Floor up/down:** the floor stays up only for *keyboard* focus (`:has(:focus-visible)`). Clicking play lets it sink after the idle delay.
- **Volume (post cell):** no popover; the slider lives inside the cell itself.
  - At rest the cell shows a hinoki speaker icon (high, low or off, from the level), which fades out on hover.
  - On hover or keyboard focus the slider wipes in from the bottom as one piece (`.tk-vol-mask` slides up while `.tk-vol-body` slides down; 420ms in, 240ms out).
  - A 4px dark groove runs down the centre. The washi door rises from a fixed 52px bottom edge piece holding the mute button (small walnut icon; Speaker Simple None when muted).
  - A horizontal 40×12 hikite pull sits on the washi edge, with the level label (13px sumi) just under it. The label hides below 10% (and when muted) so it never sits on the mute icon.
  - It is driven by `--tk-vol-n` (0–1, set by JS from the media). The track starts one frame width (8px) below the cell top, so at 100% the washi stops there with the pull centred on its edge. The groove also starts at that line (not at the cell top).
  - The cell stays open while dragging (`data-tk-active`), even if the pointer leaves. Mouse focus alone doesn't hold it open; only `:focus-visible` does.
  - Below 600px and with the post hidden, the cell is just the mute button.
- **Settings door (more button):** a custom panel (`.tk-mm`, `src/menu.js`) replaced the Video.js `media-menu`.
  - Layout follows the wireframe the user approved: 288px wide, from the top frame to the floor, washi .78 with a 2px blur, and a 3px walnut stile on the leading edge.
  - While the door is open, `.tk` carries `data-tk-mm-open` and `--tk-mm-px` (door width). The title rides with the door when it's on the door's side (margin transition, same 420/240ms curve as the door; a centred title re-centres in the uncovered picture). The seek preview card is clamped flush against the door's edge via `--tk-pv-lo/hi` (`!important` over Video.js's inline `left`); the hover line still follows the pointer.
  - Backdrop blur gotcha: nothing inside `.tk-mm` may use `mix-blend-mode` — a blended sibling makes Chrome isolate the door and the blur has no backdrop (that's why `.tk-mm-cast` is plain alpha).
  - Toggles that are on (`aria-pressed="true"`, checked light chips) keep their hover fill.
  - Post hidden: washi row, so hover/open use the sumi-on-washi colours. The volume cell is the edge piece; on hover a 128px walnut column with the washi door and pull rises above it (clip-path wipe, 420ms in / 240ms out).
  - Floor up/down: `--tk-rise` / `--tk-sink` are 600ms (were 900ms).
  - Selected rows (`aria-checked` / `aria-current`) keep their fill too; colour, weight (variable font) and the check mark fade over 300ms.
  - Volume idle icon is wiped away by the slider's rising edge (clip-path, same 420/240ms as the mask) instead of fading.
  - Post hidden: the volume pull is hidden while the column is shut (it sat half over the cell at 0%/muted).
  - Shade off: `--tk-shadow: 0`, and the recess, title card, preview card and door-edge shadows are removed — no shadow falls on the picture.
  - Shade off also removes the lit alcove edge (`.tk-alcove::before`) on the side opposite the shade.
  - More icon: three spans; the dots stretch into lines while `aria-expanded="true"` (width 320ms, height 200ms, ease-out).
  - Picture sliders glide (420ms presets/Reset, 300ms bar presses, ease-out cubic) via `glidePicture()`; custom pointer handling on the ranges (press on bar = glide, press on thumb or drag = follow). Active colours on toggles, chips and switches fade over 300ms.
    - Root view: SETTINGS header; Playback (Speed, Captions, Chapters); a rule; View (Picture).
    - Bottom strip of one-tap toggles: Picture-in-picture (hidden if unsupported), Loop, Shortcuts. Each has a walnut tooltip. The magnifier slot is left out until that feature is built.
  - Motion (unmasking): `--tk-mm-o` (0 → 1; 420ms in, 240ms out, ease-out cubic) moves a `clip-path` reveal from the post side. The walnut stile and the cast shadow ride that edge, and the content holds still.
  - Submenus are an inner door. `--tk-mm-sub` (360ms) sweeps a second stile across from the post side, revealing the submenu over the root. Back reverses it.
  - Hover fills: rows fill from the post's side (`scale` on `::before`, 300ms ease-out). Toggles and light-preset chips fill from the bottom. Mirrored with `data-post="left"`.
  - Submenus:
    - **Speed:** 0.5–2×.
    - **Captions:** Off plus the text tracks, with a note when there are none.
    - **Chapters:** number, title and start time per row; the current one in matcha; click to seek; "Loop chapter" at the foot, checked per frame with `requestVideoFrameCallback`.
    - **Picture:** Dawn, Noon and Lantern presets; Brightness, Contrast, Saturation and Warmth sliders (warmth is an SVG `feColorMatrix`); Reset. Applied as a CSS `filter` on the `<video>` and remembered per viewer in localStorage. Noon is neutral.
    - **Shortcuts:** the key list. Hotkeys now have explicit steps: ← → 5s, J L 10s, ↑ ↓ 5%.
  - Keyboard:
    - ↑ ↓ / Home / End move between items; → opens a submenu; ← or Esc goes back; Esc at the root closes and returns focus to the more button.
    - Arrow keys inside the panel never reach the player's hotkeys.
  - Opening keeps the floor up. A press outside closes it; a press on the picture only closes (no play/pause).
  - Compact (<600px): the root header and group labels are hidden and rows are 40px. A real mobile design is still to do.
- **Fullscreen button hover** (from the user's Framer frames: rest, midpoint, end):
  - One registered `--tk-fs-p` (0 → 1; 300ms in and out, ease-out cubic) drives it.
  - Enter: the four Corners Out corners are separate spans. Width spreads with p and height with p³, so it grows as a square first, then the corners reach 4px in from the cell's corners (container units). The arms stretch to 1.8× mid-move (`sin(p·180°)`) and settle back to resting length.
  - Exit (Corners In SVG): scales to 0.78.
  - Only applies under `(hover: hover)`; off under reduced motion.
- **Fullscreen:** `object-fit: cover`, so there are no letterbox bars.
- **Easing:** ease-out on every animation (user requirement).
- **Clicking the seek bar:** the door glides to the clicked point over 260ms. Dragging follows within 90ms. This works by transitioning the registered `--media-slider-fill`.
- **Loading:**
  - A 48px washi glide runs along the groove.
  - Before the poster arrives, the clay wall shows with the title card, `00:00 / --:--`, and no pull.
- **Error:**
  - A washi card with the icon, title and description.
  - A RETRY button with a Matcha Darker offset focus ring, focused automatically.
  - The code line underneath, such as `ERR 4 · source`.
  - The floor stays down and the wall dims.
  - Mute and more are dimmed; fullscreen stays usable.
- **Title card:** slides down from behind the lintel whenever the floor is up, and while loading or in error.
- **Layouts:**
  - `data-post="right|left|none"`.
  - With the post on the left, the light comes from the left.
  - Below 600px the post's controls move onto the floor as a washi edge piece that tilts with it.
- **Accessibility:**
  - Keyboard order is play, seek, volume pull, mute, settings, fullscreen.
  - Hotkeys follow the Scaffold skin.
  - Reduced motion: nothing tilts; the floor and strip swap with a short fade.

## Still to do

1. Check the floor animation against the Framer component directly once the connector works (it currently matches the screen recording).
2. Apply the Control Components board (hover, pressed, focus and disabled states) once it's done.
3. Mobile frames (360 portrait, 844×390 fullscreen landscape).
4. Desktop fullscreen sizing.
5. P2 features:
   - ~~more panel~~ (built: settings door). Still open: magnifier toggle, captions styling, a mobile layout for the door
   - captions styling
   - a demo configurator
   - theming
6. P3 features: picture adjust (CSS filters) and a 3-band EQ (Web Audio, risky on iOS).
7. Final video: upload to Mux for the bonus point, use `<mux-video>`, and switch to the Mux storyboard URL.
8. Deploy to Vercel (the user needs a Vercel account; `vercel --prod`). Embed on joshuaroberts.design for the live-site bonus.
9. Submission: a visual plus a short write-up. Mention the joinery and tsugite story.

## Working notes

- The registry at `shadcn.videojs.org` is blocked from the sandbox, so the CLI can't scaffold. The project was built from scratch using the Scaffold markup found in `node_modules/@videojs/html/dist/default/internal/skins/scaffold-video/template.js`.
- Component docs ship in `node_modules/@videojs/html/docs/`.
- The time slider's focus lands on `media-slider-thumb`, so focus styles go on `.tk-pull`.

## Clear seek variant (`data-seek="clear"`)
- Demo switch "Seek: Solid / Clear". Solid is the original (the floor lifts the picture).
- Clear: the wall never translates; the floor sits at `bottom: var(--tk-frame)` and tilts up over the picture's bottom edge. Floor surface is transparent; the washi door (and the post-hidden / compact tool row) is frosted: `--tk-washi-frost` (washi .72) with an 8px backdrop blur. The settings door's bottom moves up by a frame to meet the floor.
- The plane only rotates in Clear (no brightness/opacity fade) — filter or opacity < 1 on an ancestor would cut the picture out of the door's backdrop blur.
- Groove gets a faint washi hairline beneath it for legibility on dark footage. Kumiko joints: no floor-coloured cut; the groove is parted 3px either side and the diagonal key bridges it.

## Mux
- Playback ID `uvARTyBix02kTMuAOLGfaedhBu02teeI8P02YVezZ6GkKQ` (public, Production env "Tokonoma", Basic quality, 1080p). Asset title "A Quiet Year".
- Markup: `<mux-video class="tk-video" src="https://stream.mux.com/<id>.m3u8" crossorigin="anonymous">` (needs `@videojs/mux-video`, installed). Its real `<video>` is in a shadow root; `main.js` uses that inner element as `video` for everything (events, text tracks, rVFC, PiP, filters). Stream errors fire on the outer element only.
- Mux injects its own storyboard track (284×160 tiles) for the preview card. Our chapters track stays a child of `<mux-video>`.
- Fallback: on the first stream error, `host.src` switches to `data-fallback-src` (local 720p copy) and our local thumbnails track is added — no error card. Used in the claude.ai artifact if its sandbox blocks Mux, and in this dev sandbox (Mux is unreachable here).
- Artifact publish: only rename `chapters.vtt`/`thumbnails.vtt` to .txt — a blanket `.vtt` sed would break Mux's `storyboard.vtt` URL inside the bundle.

## Site page
- Heading (eyebrow, "Tokonoma 床の間", lede, byline) above the player; below it an article: 01 Inspiration (tokonoma vocabulary → player parts), 02 Features (9 cards), 03 Where it fits, 04 What makes it different, 05 Early versions (six of the user's Framer frames in `public/process/`), footer credits. Styles in `src/demo.css`.
- Credits assume the footage is from Pexels and the music from Pixabay (file-name patterns) — confirm with the user.

## Phone layout (proposal, under 600px container width)
- No post: mute / settings / fullscreen hang from the lintel as a 3×40px washi card on the post's side (left only for data-post="left"), clip-path wipe with the floor; title card takes the other side. Seek door gets the full floor width (`--tk-tools-w: 0`). Volume = mute only. No shade band.
- Settings door covers the whole player (top/bottom/left/right = frame) with a close ✕ in the root header; root view is a 2×2 tile grid (icon, label, value) above the toggle strip; Speed is a 3×2 grid; Shortcuts toggle hidden for `pointer: coarse`.
- Post-hidden floor tools (and the rising volume column) now only apply at ≥601px.

## Nov 14 evening round
- Thumbnails: `main.js` probes the media element's own storyboard (Mux: image.mux.com) — if the track errors, has no cues, or its first sprite fails to load, it swaps in the local `data-fallback-thumbnails` track. Fixes the empty preview card in the claude.ai artifact.
- Options: `--tk-frame` (demo slider 0–24px; strip has a 3px minimum), `--tk-shade` (band strength, slider), `data-floor-mode` tilt/slide/mask (mask = registered `--tk-floor-r` driving a clip-path whose edge follows the wall, then clears 400px up for the preview card; the strip gets `visibility:hidden` after fading in mask mode — Chrome otherwise paints it over the masked floor), `data-title-align="none"`.
- Phone settings door: bottom edge rests on the floor's top edge (`bottom: floor-h`, or `floor-h + frame` for clear seek). Root view has no header; close ✕ is the last toggle in the strip (`.tk-mm-tog-close`, phone only). Title and tool card wipe up while it's open.
- Site: caption under the h1, no section numbers, more spacing, perspective-shift wording, "Architecture and interior studios" replaces wellness, tokonoma photo (Jens F., Pexels) as a captioned figure in Inspiration and a faint fixed page backdrop.
- Not built yet (user's plan): parallax depth on pointer move / gyroscope.

## Nov 14 late round
- Shadow: the lintel shadow and the post's band are now ONE inset box-shadow on `.tk-shade` (covers picture + floor, z5). x = −dir·off, y = off, off = 6px + 18px·k (+4px floor up), blur 6px + 10px·k, alpha 0.16 + 0.14·k, k = `--tk-shade` (default 0.35). `--tk-shade-dir`: 1 post right, −1 left, 0 none/phone. `.tk-recess` no longer draws a shadow.
- `--tk-post` (default 64px) = post width = floor height; edge piece 1.3125×, door pull and play icon 0.625× floor height, volume edge 0.8125×. Phone keeps its 48px floor.
- `data-floor-mode="fixed"`: floor always up (main.js syncFloor + watches the attribute).
- Defaults: `--tk-frame: 2px`, title centred.
- Demo controls are a "board": walnut frame, four washi cells (Post, Title, Floor, Light & frame), segmented switches with a bottom-rising fill, hikite sliders.
- Site entrances (demo.js): IntersectionObserver; headings mask-wipe left→right, body text mask-wipes top→bottom (reads as line-by-line without splitting text); masks removed after the reveal; off under reduced motion / without JS. (A clip-path wipe hid headings from the observer — don't go back to it.)

## Nov 14 night round
- Shared shade values on `.tk`: `--tk-shade-off`, `--tk-shade-blur`, `--tk-shade-a` (from `--tk-shade`). The title card's shadow is `(-dir·off, off/2, blur, spread off/2)` so it starts at the lintel and joins the inset shade; the phone's tool card uses the same with x 0; door pulls (seek + volume) scale offset/blur/alpha with `--tk-shade`.
- `data-title-layer` under (z3, below the z5 shade) / over (z6). Phone tool card z4, z6 when over.
- `data-chapter-style`: kumiko (default), peg, rail, gap (groove parted 3px).
- `data-volume="0.6"` applied to the media at init (Video.js doesn't persist volume itself).
- Board is walnut (noise texture) in a darker frame; matcha active text; dark hikite slider thumbs.

- Shade glitch fix: the floor-up deepening no longer transitions `box-shadow` (Chrome re-rasterised it when the floor animation ended, so it jumped). `.tk-shade` now holds two pseudo-element drawings (resting and +4px) that cross-fade on opacity, and the element has `will-change: transform` so its layer never changes.

## Round 32
- Title layer now defaults to `over` (markup + board).
- Clear seek: when the time flips to the right of the pull it sits on a full-height frosted washi panel (walnut inset edge) so it reads over any picture.
- Site board: new "Keyboard" cell listing every shortcut as keycaps.
- Phone: settings door drops its walnut edge strip and cast shadow (full-width door).
- All 2px backdrop blurs raised to 4px.

## Round 33
- Colour schemes: `data-theme` = hinoki (default) / urushi / aizome / sakura. The eight palette tokens are registered `<color>` properties and fade over 700ms ease-out. Every hard-coded tint in the skin is now a `color-mix()` of a token, so themes only set the eight. Urushi also thickens its door paper (92%) so the vermilion floor doesn't tint it.
- Board: a full-width "Colour" row of swatch radios (2×2 on phones).
- Phone board (≤560px): demo.js wraps each cell's contents in `.board-body > .board-inner` and puts a toggle button in the heading. The body folds on `grid-template-rows` 0fr→1fr (520ms) so the page eases with it; the contents wipe in on a mask (`--bw`). Colour starts open. Closed bodies are `visibility: hidden`, so they're out of the tab order.

## Round 34
- src/keys.js: P / N previous / next chapter (P goes to the current chapter's start first if more than 3s in), S opens / closes the settings door (`aria-keyshortcuts="S"` on the button). Chapter jumps are announced through a polite live region.
- Keyboard readout (`.tk-osd`, in the alcove): a washi slip in the middle of the picture showing volume / mute, speed or chapter with a filling groove. Wipes in from the left, holds 1.1s after the last change, wipes away to the right; fades with reduced motion. It reacts to Video.js's own volume and speed hotkeys by checking `defaultPrevented` after they run.
- Shortcut lists (settings door and site board) include the new keys.

## Nice-to-have list (as of Round 34, awaiting the user's picks)
1. Kumiko lattice shadow across the picture edge when the settings door opens (CSS mask) ~2h
2. Light through paper: washi surfaces tinted by the video's average colour (needs CORS, like the magnifier) ~3h
3. Hanko-style seal stamps onto the shut door beside replay when the video ends ~1–2h
4. Ink bleed for buffering: sumi spreads through the washi around the pull ~2h
5. Time-of-day light: Dawn/Noon/Lantern already set the picture grade; extend them to shift light direction and shadow warmth ~1–2h
6. Vertical captions down the side opposite the post, like a hanging scroll ~3h
7. Parallax depth on pointer / gyroscope, 2–4px, off while the floor moves ~1h
8. Optional sound: wooden click on the pull, paper slide on the door, off by default ~1–2h
9. Magnifier (slot reserved in the door's toggle strip)
10. Captions styling as washi strips + size/background options (needs a captions file for A Quiet Year)
11. 3-band EQ (Web Audio; hide on iOS)
12. New: ambient glow onto frame/wall; chapter name on the title card; remember speed/volume/theme
Also to do: submission write-up, showcase recording, optional embed on joshuaroberts.design.

## Round 35 — nice-to-haves 1, 2, 3, 7, 8, 9, 14
- **Kumiko lattice** (`.tk-mm-lattice`, CSS only): a 240px band of lattice shadow (bars every 40/56px, blurred, raked by `--tk-light-x`) riding the settings door's reveal edge, opacity = `--tk-mm-o`, masked away from the door. Strength follows `--tk-shade-a`; hidden with shade off and on phones (the door covers the room there).
- **Light through paper** (light.js): samples the frame at 24×14 every 400ms while playing (and on seek); hue kept, saturation capped, lightness fixed at 64%, mixed 16% into `--tk-paper` (oklab). `--tk-paper` feeds the seek door, title card, frost, preview label and settings door; `--tk-light`/`--tk-light-amt` are registered so it fades. Tainted canvas → turns itself off.
- **Seal** (seal.js + CSS): solid-ink rounded seal in `--tk-matcha-deep` with paper-coloured initials (two letters stack) and an inner rim; speckled ink mask; `tk-stamp` keyframes (1.7× soft → press 0.9× → settle at −6°). Initials from the title minus articles, or `data-seal`.
- **Depth** (depth.js): wall `transform: translate3d(px, py) scale(1.02)` under `[data-depth-active]`, ±4px (±2.5px on phones), lerped per frame; held for 650ms whenever `data-floor-up` changes. Tilt via deviceorientation with a slowly re-centring rest pose; the demo's Depth "On" button asks iOS for permission.
- **Sound** (sound.js): Web Audio synthesis only — click (falling sine + band-passed tick) on pointerdown on `.tk-seek`/`.tk-vol`, paper slide (swept band noise) when `data-tk-mm-open` changes, thud with the seal. `data-sound="on"`; toggle in the door strip and the board.
- **Magnifier** (magnifier.js): 176px lens (132 on phones) drawn from the live video via drawImage (no CORS needed to draw), mapped through object-fit, copies the host's picture filter; wheel zooms 1.5–5×; touch: lens rides 0.75× its size above the finger. Toggle in the door strip (closes the door) or Z; Esc turns it off.
- **Prefs** (prefs.js): `tokonoma.prefs` = rate, volume, muted, theme, sound; media values re-applied on each `loadedmetadata`. The board's switches now follow the player's attributes (MutationObserver in demo.js).
- Board: new Effects cell (Light through paper, Depth, Sound); keys cell spans 3 columns; at ≤1100px both span the row and Effects lays its three switches side by side.

## Round 36
- **Seal** is now HTML (`.tk-seal > .tk-seal-face`): `data-seal-src` (image, shown as-is, no ink/mask), `data-seal` (≤3 chars → square "mark", two letters stacked; longer → wide "text" seal), else title initials. `data-seal-align` left/center/right (right sits `--tk-time-w + 34px` from the end; seal.js measures the time box on end). Ink `--tk-seal-ink`. Sample image `public/seal/alcove-mark.svg`. Board: Mark (Initials/Text "The End"/Image), Place, "Play the ending" (seeks to duration − 2.5s); changes re-stamp if already ended.
- **Lattice** vars `--tk-lattice-angle/size/opacity` (band width = size × 6, bar = max(2px, size × .075)). Board sliders; the cell is `[data-tk-keep-open]` (menu.js ignores presses there) and opens the door with `settings.open({ focus: false })` via `container.tokonoma.settings`.
- **Sound**: engine primed on the first pointerdown/keydown anywhere (capture), `latencyHint: 'interactive'`, one cached noise buffer, scheduled at `currentTime`. Pointerdown routing: `.tk-pull, .tk-vol-pull, .tk-mm-range` → click; elsewhere on `.tk-seek, .tk-vol` → glide (short paper sweep); `.tk-mm button` → tap (quiet 1.65kHz blip). Door slide gain lowered to .05/.045.
- **Depth** now also moves the shade: under `[data-depth-active]` the shade's pseudo-elements get inset −10px, spread +10px and `translate: var(--tk-px) var(--tk-py)`, clipped by `.tk-shade { overflow: hidden }`.
- **Magnifier** `data-magnifier-shape="square"` (inset wipe instead of circle). Board: Lens on/off (present/absent attribute, handled in demo.js `special`), Shape.
- Board row 3 is now Effects / Magnifier / Seal / Lattice; Keyboard spans the row. Site copy updated (features, story map Hanko entry, hint).

## Round 37 — last touches
- **Accessibility/speed**: axe-core clean (desktop + phone, door open/shut). Lighthouse a11y 100 / SEO 100 both; perf ~97 desktop, ~89 mobile median (sandbox runs vary). Fixes: story credit contrast; door pulls are 28px hit areas with the wood drawn by `::before` (focus ring on the pseudo too), seek pull z-index 5 above play; robots.txt.
- **Captions**: `media/captions-en.vtt` (SDH, music-only film; cues from the loudness envelope). captions.js hides native cue rendering (style injected into mux-video's shadow root) and draws `.tk-cap-line` washi strips that sit above the floor. `C` hotkey → `toggleSubtitles`. Note: headless Chromium turns English captions on at load by its own preference — that's the browser, not the skin.
- **One tag**: `src/skin.html` + `src/template.js` (`renderPlayer`) build every player; vite.config.js fills the demo's at build time (`<!-- tokonoma:demo-player -->`). `<tokonoma-player>` (element.js) with `loading="lazy"` placeholder; `main.js` exports `mountTokonoma` and guards double init (`data-tk-mounted`). Library build: `vite.lib.config.js` → dist/lib (+ scripts/minify-lib.mjs); `public/vercel.json` adds CORS for /lib/. prefs skipped with `data-remember="off"`.
- **Fonts**: src/fonts.css (Latin + Latin Ext only).
- **Bug fixed**: thumbnails.vtt image paths now `media/storyboard.jpg` (resolved against the page).
- **Site**: header showcase loop (`public/showcase/showcase.mp4`, 1040×554, 14.6s; filmed via CDP screencast, scratchpad loop/film.cjs), still image on top until it plays, Pause/Play button; autoplays only ≥1000px and without reduced motion; backdrop photo loads after `load` (`.bg-ready`). Side-by-side with the Video.js default skin (`process/compare-*.jpg`). "Use it" section with copy button and a live `<tokonoma-player>` (aizome, post left). Stats strip. OG image `og.jpg`, favicon.svg/ico, apple-touch-icon, meta tags.

## Round 38
- Settings board and feature grid fold on every screen size (`makeFolds()` in demo.js; prefix-body/prefix-inner/prefix-toggle; Colour starts open, features all closed).
- `text-wrap: balance` on all site text (and caption lines in the player).
- Spacing ×2: header bottom 108px (+28px gap), text↔reel column gap 112px, stacked reel margin 64px.
- `.demo-hint` max-width 64ch (the lede's value).
- Contents: `nav.toc` — left-margin list ≥1600px, otherwise a corner "Contents" button with a wiping list; hidden until the intro scrolls away; marks the current section (`aria-current="location"`); `#player` id added to the demo's `<video-player>` by the Vite plugin, `#settings` on the demo bar.
- Captions centre on the picture with the post on the left or hidden.
- Byline links to the Framer Expert profile. Demo player width capped so it never exceeds the screen height (landscape phones). Checked: 360 portrait, 844×390 landscape, desktop fullscreen.
- Third-party notices: scripts/notices.mjs → public/THIRD-PARTY-NOTICES.txt and dist/lib/; banner on the minified lib files; footer line + link. Footer credit links to the Framer Expert profile.

## Round 39
- Depth: the shade's two drawings translate by −(--tk-px, --tk-py), against the wall.
- Public colour styles `--tokonoma-{wood,floor,paper,ink,ink-soft,wall,accent,accent-deep}` feed every scheme's tokens (`var(--tokonoma-x, scheme value)`); element attributes of the same names; `data-theme="custom"` = hinoki base. Board: Custom swatch + 8 pickers (prefilled from the previous scheme via a hidden .tk probe), saved in localStorage `tokonoma.custom`, "Copy as CSS".
- Sticky section headings: top 80px ≥761px; ≤760px the heading row pins at 0 with a fading band so the section slides under it.
- Open settings labels turn washi.
- Masonry for the board and the feature cards: 1px grid rows, each block spans its measured height + gap (ResizeObserver in demo.js), `align-items: start`. Feature cards are bordered cards now.
- LICENSE (Apache-2.0) + NOTICE in the source, per the challenge guidelines.

## Round 40
- Thumbnails: Round 37's `media/storyboard.jpg` path broke plain-`<video>` use. thumbnails.vtt is relative to itself again (`storyboard.jpg#xywh=…`); `absoluteThumbs()` in main.js rewrites relative image lines to absolute URLs (as a blob VTT) for tracks on non-`<video>` hosts such as `<mux-video>`, which resolve against the page.
- Contra showcase film (1:29, 1080p30): filmed from a stage page (kept outside the repo) by a Playwright script in slow motion (page clocks ×½, video at 0.5×, CDP screencast, ffmpeg `setpts=PTS/2`), scored with "Whispering Bamboo".

## Round 41
- `data-post="tuck"` (attribute `post="tuck"`): post on the right that slides out of the frame (translateX 100%) while the floor is down, so the picture fills the player; slides back in with the floor. Player keeps its size: padding-right is the frame, the picture runs full width and the post rides over its edge. Wide players only (≥601px); compact layout treats it as right. Board: "Tucked".
- menu.js picture glide is timed from its first frame's timestamp (never mixes rAF time with performance.now()).
- Masonry: blocks dealt into columns in reading order and placed explicitly (grid-column + grid-row span), so opening a block only pushes the blocks beneath it; `grid-column: 1 / -1` blocks stay full width.
- Phones: sticky section headings have no band; the section body is masked beneath the heading (`--clip`, set on scroll in demo.js).
- Custom colours panel folds open with the dropdowns' height + wipe. Contents button: list icon; wipes in from its right edge and back out to it.
- "Use it" on phones: single column is `minmax(0, 1fr)` so the code block scrolls inside itself (focusable pre).
- Tucked floor: `.tk-floor` runs to the frame under the post; `.tk-floor-plane` (and so every control) still stops at the post's edge, with the surface reaching on under the post. The shade's floor-up drawing animates its right edge with the post.
- Lattice defaults: angle 20deg, size 54px, opacity 0.08.

## Round 42
- Magnifier on touch: the lens rides above the finger and now shows the picture under the lens itself (samples at the lens centre, clamped to the picture).
- Dropdowns: a tap anywhere in a block (not on one of its own controls) opens or closes it; the toggle button remains the keyboard's way in.
- Contents button: hides (wipe out to the right) while scrolling down, wipes back in on scroll up; stays while its list is open or focused. Wide screens keep the margin list.
- Header reel framed as a recording: dark mat, label bar (Tour · Recorded · 0:15 + Play/Pause), a different still (settings door open on the robin). The demo player has a "Live player" label above it.
- Framer code component: `framer/TokonomaPlayer.tsx` (loads /lib once, re-creates the element via key when props change, CSS vars applied to .tk after build, auto height). Tested in a React harness against the built lib.
- vercel.json: CORS on /media/ too, so other sites can use the demo poster and VTTs. The site's "Use it" snippet now has working absolute URLs.
- Phones (≤760px): the demo player is full-bleed (100vw). Reel: `data-playing` goes on `.site-reel` (the still was stuck on top after the bar markup change).

## Round 43 (deadline day)
- Seek drag follows the pull exactly (fill transition 0s while dragging); a click still glides (260ms).
- Depth on iPhone/iPad: starts off (no motion-permission prompt); `askTilt()` (depth.js) asks from a tap — the settings door's new Depth toggle (cube icon) or the demo switch. Detection: requestPermission exists AND Apple touch device (desktop Chrome also has the method).
- Small phones (player ≤480px): floor 40px (was 48px); targets ≥40px tall.
- `data-aspect` / `aspect=`: any w:h or `auto` (video's own shape). Letterboxed (contain) on dark wall; tall shapes narrow the whole player (max-width from 85svh × ratio). Board: Light & frame → Shape. Framer component: Layout → Shape.
- YouTube: Video.js 10.4 ships `@videojs/html/media/youtube-video`; not wired in (pixel features can't read an iframe; YouTube UI in fullscreen; no PiP).
- Fixes: Contents nav no longer swallows taps beneath it (pointer-events only on the button / open list). Masonry clears its placements before reading the column count (stale columns made implicit tracks after rotation).
- Open dropdowns draw a line from label to arrow (`.fold-line`, wiped left→right). Site title: outlined, ink fills from the right on load.
- Defaults: `data-aspect="auto"` (template + Framer), `--tk-post: 60px`.
- Last four: `,` / `.` frame stepping (fps read from requestVideoFrameCallback, default 30); washi readout for seeks (arrow keys, J/L, and Video.js's double-tap/double-click sides, confirmed by a `seeking` event); Save still (Picture view → PNG with the Picture filter applied, `src/still.js`); resume per video address (`tokonoma.resume`, skipped near start/end, cleared on ended; off with data-remember="off"). Readout is callable as `container.tkReadout('note', {icon,label,value,fill})`.
- Phone preview card is as wide as its picture (label/card 108/116px). Cards hanging from the lintel use `--tk-card-shadow` (softer, fades before the lintel at any strength; phone card's clip has room for it).
- Ctrl/⌘ + wheel (or pinch) over the lens resizes it (88px to 90% of the picture). Shift+S saves a still. `data-still-button="on"` / `still-button="on"`: camera card above the floor while it's up, opens to "Save still" on hover/focus; on phones (≤600px) it and the menu's Save still show only in fullscreen.

## Round 44: Save clip (branch `save-clip`; `pre-clip` branch = the version before it)
- `src/clip.js`, `data-clip="on"` / `clip="on"` (demo turns it on in demo.js). Marks: I / O, Settings → Clip (Start here / End here / Save clip / Clear), or draggable pegs (`.tk-clip`, a layer above the slider in the floor plane, so dragging doesn't seek; role=slider, arrows ±1s, Shift ±5s). One mark sets the other 10s away; min 0.5s, max 5 min.
- Recording: seek to start, play at 1×, MediaRecorder until the end (rAF watch); a pause or seek by anyone cancels. Chrome/Edge: `video.captureStream()`; Safari/Firefox: canvas.captureStream(30) + Web Audio (MediaElementSource made once per element, still routed to the speakers). Types: H.264 MP4 → WebM VP9/VP8 → bare MP4. Readout shows progress; the band fills (`--tk-clip-p`).
- Clip card on the picture (bottom-left above the floor, right when the post is left): Save clip + length, × to clear; "Cancel" while recording.
- Tested (Chromium): I/O, peg drag (no seek), 7s clip saved in ~7s as a 1280×720 file with sound; phone menu flow; axe clean. Not tested on Safari/Firefox.
- WebM clips get their length written in (fix-webm-duration, MIT), so players can show and seek them.
- Clip pegs: 44px hit areas on touch / phones; 1px × 4px ticks on the floor's top edge mark both ends. Readouts: "Still saved · PNG file", "Clip saved · MP4 file".
- Site: "What makes it different" adds "a tool as well as a frame" with three pictures (public/process/feature-magnifier|clip|still.jpg); the lede mentions them.
- Merged save-clip into main for submission; the `pre-clip` branch keeps the version before clips.
