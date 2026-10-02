# The site cinema

The website can show films as data. The homepage banner (the breathing "Hollow
Wake" lockup) plays the featured film on click. A visitor's first arrival, or
one after a week away, opens with that film already rising out of the dark.
Either way, the film ends by breaking the screen: cracks race out from the
viewer's click, or from the insignia's eye when the film runs out, the pieces
fall away, and light pours through onto the page beneath.

The page does not change at a glance. There is no tooltip, prompt or cursor
change on the banner. Keyboard and screen reader visitors get a visually
hidden, labelled button inside it, and the banner wears an outline only while
that button holds keyboard focus.

## Files

| File | Role |
|---|---|
| `site/assets/cinema.js` | **The registry** (films, the feature, the splash policy, the triggers, the theater dials), the visitor record, the arrival gate and the public `HWCinema` API. Loaded in `<head>`, not deferred, so a visitor due the splash meets darkness on the first paint. Small. |
| `site/assets/cinema-theater.js` | The theater: the blanket, the film, captions, controls, the WebGL2 shatter and its Web Audio sound. Loaded on demand, or on idle so a click answers at once. |
| `site/media/<film>/` | Renditions (`<film>-<height>.<codec>.mp4`, gitignored) and caption tracks (committed). |
| `site/media/manifest.json` | Every film file the site serves, with its size and SHA-256, and the release that holds it. |
| `scripts/encode-film.mjs` | Any master video → the rendition ladder. Records the files in the manifest and prints the `sources` block to paste. |
| `scripts/publish-site-media.mjs` | Uploads manifest files to the `site-media` release (creates it on first use). |
| `scripts/fetch-site-media.mjs` | Pulls and verifies manifest files into `site/media/` (every Pages deploy; local previews), unpacking archives. |
| `scripts/capture-skill-clips.cjs` | Films each skill in the game → `site/media/clips/` (see Skill clips). |
| `balance/site-cinema-ui.cjs` | The hidden walkthrough (38 checks, frames in `balance/reports/site-cinema/`). |

A page opts in with one tag: `<script src="assets/cinema.js?v=…"></script>` in
its `<head>` (today: the homepage). **The `?v=` stamp is the cache key for both
files:** the theater inherits it. Bump it whenever either file changes, or
visitors keep yesterday's copy. The Vite dev server treats `?v=` URLs as
immutable, so iterate locally with throwaway stamps.

## The registry

```js
feature: [                                   // first open row wins
  { play: 'expansion', from: '2027-03-01T17:00:00Z' },   // goes live on its own
  { name: 'cut-test', pick: [{ play: 'announcement', weight: 1 }, { play: 'announcement-anime', weight: 1 }] },
  { play: 'announcement' },
],
splash: { pages: ['home'], restDays: 7, newCuts: true, reducedMotion: false, saveData: false, failRestDays: 1, armSeconds: 7 },
triggers: [
  { selector: '.hero-lockup', play: 'feature', label: 'Watch the Hollow Wake trailer' },
  { selector: '[data-cinema]', play: '@data-cinema' },   // any element, any page, any time
],
films: { announcement: { title, cut, aspect, duration, sources, captions, exit, rim?, picture?, loop?, cors?, poster? } },
theater: { blanket, stage, openSeconds, revealSeconds, stallSeconds, hintSeconds, progress, words, rim },
```

- **Feature rows** are read in order. `from` / `until` are ISO dates, so a
  release trailer can be staged ahead and switch on by itself. `pick` splits
  visitors by weight, and each visitor keeps the cut they drew (stored under the
  row's `name`).
- **`cut`**: raise it to show a re-cut of the same film to every visitor once.
- **`sources`**: best codec first. The theater takes the first family the
  browser can play, then the smallest rendition whose height covers the
  picture's device pixels. Visitors on a data saver or a slow connection get
  the smallest one.
- **`captions`**: a WebVTT track drawn by the theater. `show: 'always'` (the
  announcement) reads the narration with sound or without; `'muted'` shows
  lines only while the film plays muted. `band` places them in the picture
  rows given (the announcement uses its lower letterbox bar).
- **`exit`**: `{ kind: 'shatter' | 'fade', at: [x, y] share of the picture, pace }`.
- **`rim`** and **`picture`** (both optional): the mind's eye is the theater's,
  so a film needs neither (see The theater). `rim: false` opts a film out,
  `rim: true` opts one in that the policy skips (a loop), and an object
  carries its own dials over `theater.rim`'s. `picture: [x0, y0, x1, y1]`
  names the picture's share of the frame and skips the measuring.
- **`loop`**: plays until the viewer leaves (clips).
- **`cors`**: set for media served from another origin with CORS headers.
  The shatter samples the film's last frame, which needs same-origin or
  CORS-clean media. Without it, only the dark breaks.

## The splash policy

An arrival on a listed page is due the splash when the featured film (or its
current cut) was never seen, or when the last showing of any film was
`restDays` ago or more. It never shows when:

- the browser cannot remember (storage blocked), so there is no nagging;
- the visitor prefers reduced motion or saves data (both configurable);
- a film failed to start within `failRestDays`.

Any showing counts, skipped or watched, and so does a banner click.

Browsers only allow sound after a gesture. An arrival usually plays muted, with
a pulsing **Sound on** pill and the narration captions. A banner click is a
gesture, so it plays with sound, and the captions read there too.

## The theater

- The darkness spills from the click point (clip-path). On arrival it is
  already down: the gate's `html.hwcine-arming::after` hands over to the
  theater's blanket in the same frame, in the same color.
- The page is locked while a film plays (`overflow: hidden` with
  `scrollbar-gutter: stable`), so nothing shifts when it lifts. Wheel, touch and
  scroll keys are held.
- **Controls:** click or tap anywhere to continue (the break starts where you
  clicked). **Esc** continues, **Space** or **K** pauses, **M** mutes.
  **Tab** cycles the speaker, the slider and the continue line. Controls and
  the cursor go idle after 2.4 s (never while a hand is on the sound pill).
- **The level:** the sound pill is a speaker (mute) and a slider that opens on
  hover or keyboard focus (always open on touch screens). **Up** and **Down**
  turn it by a tenth. The viewer's level is remembered (`rec.vol`; a first
  visit uses `theater.volume`), and the break's own sound follows it. A press
  that begins on the pill never counts as "continue", even if the drag ends on
  the picture.
- If a film cannot start, the darkness lifts quietly, the failure is recorded,
  and the splash rests.

### The mind's eye

Every film floats in the darkness like a memory being recalled. A living rim,
in the blanket's own ink, melts the picture's edge, so no hard rectangle ever
shows. The window is a rounded eye sitting on the picture's own edge. Its
border creeps and swirls through slow, domain-warped noise that turns about the
centre (faster toward the rim, a slow vortex), and the band between clear and
dark breathes like smoke. The top and bottom bands run only `vertical` as deep
as the sides, so a wide picture keeps its height. As the film starts, the eye
opens like eyelids out of a thin, wide slit; the break that ends it is the
thought shattering.

**It belongs to the theater, not the film.** `theater.rim.apply` names who
wears it (`'trailers'`: every film that does not loop, so the skill clips stay
clean; or `'all'`, `'none'`), and a film needs no setting of its own. The rim
finds the picture by measuring the film's own black bars while it plays: a
small copy of the frame (128 × 288) is read a few times a second, every row and
column whose mean rises above a low threshold belongs to the picture, the
extent only grows (a dark scene cannot shrink it), and reading stops once it
has held for a few seconds. The edge is taken at the inner side of the boundary
sample, so any error falls a sliver inside the picture, where the dark already
covers the true edge (the announcement measures `[0, 0.132, 1, 0.868]` against
its bars at 0.128 and 0.872). The rim eases onto the measured edge during the
eye's opening. A film served cross-origin without CORS cannot be read, so its
rim stays on the whole frame unless it names its `picture`.

It is one GLSL function (`RIM_GLSL` in the theater) with two consumers:

- a small WebGL2 canvas over the playing film, under the captions. It renders
  at `scale` per CSS pixel (the rim is soft), and overhangs the stage by a few
  pixels on every side so layer snapping can never show the video's own edge.
- the shatter's bake: at the break, the frozen frame is redrawn with the rim at
  the exact clock, opening and measured picture the viewer last saw, so the
  first frame of the break matches the screen it replaces (`_last.rim` reports
  the bake).

Reduced motion holds the rim still at one moment, with the eye already open
(the measured edge snaps rather than slides). Without WebGL2, a rounded window
with a soft inner shadow stands in. The dials live in `theater.rim`:

| Dial | Meaning |
|---|---|
| `apply` | who wears it: `'trailers'`, `'all'` or `'none'` |
| `feather` | the soft band's width, in picture heights |
| `vertical` | the top and bottom bands' depth, as a share of the sides |
| `creep` | how far the dark wanders in and out of that band |
| `round` | the window's corner radius, in picture heights |
| `grain` | the dark's features per picture height |
| `drift` | how fast it morphs (noise depth per second) |
| `swirl`, `twist` | its turn about the centre (radians per second), and the extra turn toward the rim |
| `mist` | smoke in the band rather than a smooth ramp |
| `open` | `[share of the height open at first, seconds to rest]`: the eyelids |
| `scale` | the rim canvas's resolution per CSS pixel |

### The shatter

The pattern is radial cracks crossed by rings that widen outward, like struck
glass. Seams are shared, so each is lit the same from both sides. Radials always
show; rings thin out toward the rim.

| Time | Beat |
|---|---|
| 0 s | the strike and its ring |
| 0–0.24 s | cracks race to the corners, and the pieces settle a pixel apart |
| 0.24–0.46 s | the tension beat |
| 0.46 s | the break, a release wave from the impact |

At the break, the pieces near the strike burst toward the viewer, and the panes
at the rim drop and turn under gravity. Picture pieces stay solid, and darkness
pieces thin to glass. Light behind the glass pours through every gap (additive,
alpha 0, so it lights the page itself), with rays, glass dust and a few motes in
the insignia's three colors. Everything is gone by 2.7 s. The first frame is
identical to the screen it replaces.

**The sound** is Web Audio with no files: the strike, crackle, the crash, modal
glass tinkles (plate ratios 1 : 2.32 : 4.25 with contact clicks), a thump, an
air swell, and a D-major chord (the Picardy third to the trailer's D minor).
It sits at about -13 LUFS, just under the trailer's ending, and plays only if
the film was speaking.

Reduced motion (or no WebGL2) swaps the break for a fade and a soft wash.

## Recipes

1. **A new film (an expansion trailer, a test cut):**
   `node scripts/encode-film.mjs --in master.mp4 --id <film>` (add `--audio mix.wav`
   for a separate mix, `--grain 0` for clean footage), then
   `node scripts/publish-site-media.mjs --only <film>`. Add a `films` row with
   the printed `sources`, point `feature` at it, and commit the registry and
   manifest. The push deploys it. The mind's eye needs nothing: it measures
   the new film's bars as it plays.
2. **A scheduled release:** add a feature row with `from`. It needs no deploy on
   the day.
3. **A/B two cuts:** a `pick` row with weights.
4. **Preview anything** on any page that loads the cinema: `?cinema=<film>`
   plays it now and leaves the record alone. `?cinema=reset` forgets this
   browser, and `?cinema=off` holds the splash for one load.
5. **A trigger anywhere:** `<button data-cinema="<film>">…</button>`, or a
   selector row.
6. **Runtime films:** `HWCinema.register(id, def)`, then `HWCinema.play(id, opts)`
   (returns a promise that resolves when the theater closes).
7. **A re-cut of a film:** encode it under a new id (`--id announcement-v3`),
   point the film's `sources` and `captions` at the new folder, and either
   drop the old files from the manifest or keep the old cut as an archived
   fallback (below). The old assets stay on the release either way, so a
   deploy of an earlier commit still finds the files its own manifest names.
   Raise `cut` only if every visitor should see the new cut once.
8. **An archived fallback:** keep the previous cut as its own film row under
   its encoded id (today `announcement-v2`), with its caption track moved
   beside its renditions and its files left in the manifest. No feature row
   or trigger names it, so the site never offers it, but every deploy still
   serves it: `?cinema=announcement-v2` plays it, and pointing a feature row
   at it falls back in one line.

## Skill clips

Every player skill can carry a short looping clip of itself, cast in the game
by the game. The Database drawer plays it muted beside the skill's facts, and a
click opens it in the theater.

**The recorder** is `scripts/capture-skill-clips.cjs`, an Electron script
that films each skill through **the skill showcase engine**
(`showcase.html`, `docs/engine/skill-showcases.md`): the same stages, hands and
dials the game's live showcases play, so the site and the game show one
choreography. It boots a built game (`dist/`, or `--root`):

```
npm run build
npx electron scripts/capture-skill-clips.cjs -- --skills glass_lance,frost_nova
npx electron scripts/capture-skill-clips.cjs -- --all --skip-existing
npx electron scripts/capture-skill-clips.cjs -- --list
```

- **The stage** is the showcase's (`src/data/skillShowcase.ts`): a bare slate
  ground at the day's brightest hour, the class whose opening bar carries the
  skill, training dummies kept whole, staging by delivery and `ai.range`, the
  scripted hand, the gatekeeper and the setup rows.
- **The clock** is pinned for a recording: the engine seeds `Math.random` and
  advances `performance.now` with the frames, so the same skill and build
  film the same clip. Each skill plays one cycle (`once`) in a fresh world.
- **The encode**: canvas pixels (1920×1080) pipe to ffmpeg, which writes 720p
  AV1 and H.264 with a soft fade across the loop seam, and a WebP poster on
  the clip's busiest beat. `index.json` is rewritten after every clip, so an
  interrupted sweep resumes with `--skip-existing` (or `--from <id>`).

Output lands in `site/media/clips/` (gitignored): `<id>.av1.mp4`,
`<id>.h264.mp4`, `<id>.webp` and `index.json`, the list the Database reads.
Each clip runs about 100 to 250 KB in all. `--sheets <dir>` writes a contact
sheet per clip for review, and `balance/reports/skill-clips.json` records
each clip's casts, damage and activity (`--report` moves it). The stage's
dials are `SHOWCASE_CFG`; the recorder's own (frame rate, render size,
encode) sit at the top of the script.

**The Database** (`site/assets/database.js`) fetches
`media/clips/index.json` and registers each clip as the film `skill:<id>`
(`loop`, `silent`, `record: false`, a fade exit). `silent` hides the sound
pill, and `record: false` keeps a clip out of the visitor record, so it never
touches the splash. No index, no clips: the drawer shows the facts alone.


## Hosting the media

The videos live on one long-lived GitHub Release, **`site-media`**, never in
git. `pages.yml` runs `scripts/fetch-site-media.mjs` before it uploads `site/`,
so every film is verified (size and SHA-256 against the manifest) and served
from the site's own origin, which the shatter needs to sample a frame. A
missing or mismatched file fails the deploy loudly, naming the asset.

The release is **not a game build**, and three laws keep it that way:

- its tag is not `vX.Y.Z`, so launchers (`launcher/updates.cjs` `parseTag`)
  and the nightly numbering (the `vX.Y.Z` filter in `nightly.yml`) never see
  it;
- it is a **prerelease and never latest**, so `/releases/latest` keeps naming
  the game for the stable channel (`publish-site-media.mjs` refuses to upload
  into a non-prerelease);
- no player ever downloads it: the executable ships the launcher and `dist/`
  only (`electron-builder.yml`), and the videos are gitignored, so checkout
  installs stay lean too.

The announcement ladder (`announcement-v2`, the centered-title cut) totals
about 61 MB. A desktop visitor streams one rendition, usually the 10.5 MB AV1
1080p. Locally, run
`node scripts/fetch-site-media.mjs` once before previewing the site.

**Generated sets travel as one archive.** A release holds at most 1000 assets,
and the skill clips are three files per skill, regenerated together.
`node scripts/publish-site-media.mjs --pack clips` tars `site/media/clips/`
(sorted, so identical clips make an identical archive), names it by its
content hash, records it under `archives` in the manifest and uploads it. The
fetch downloads, verifies and unpacks it into `site/media/clips/`, and a stamp
file there skips the unpack while the archive is unchanged. Commit the
manifest after a pack, like any film.

## Verification

`npx electron balance/site-cinema-ui.cjs` (from the repo root) serves `site/`
on loopback and walks every path:

- the arrival splash under Chrome's autoplay policy (muted fallback, captions,
  the pill, the record);
- the shatter, stepped frame by frame from a click, with the frozen frame checked;
- a reload inside the rest, eight days away, and Esc;
- the banner click (a trusted input event, so it plays with sound);
- the volume slider: a drag sets a level, a drag ending off the pill never
  continues, the arrow turns it, and the level is remembered;
- the natural end, which breaks from the eye with its sound;
- the sound rendered offline and level-checked;
- reduced motion (no splash, a fade exit);
- a missing film, which closes quietly and records the failure;
- no 404s, and no stray console output.

Frames and `shatter-sound.wav` land in `balance/reports/site-cinema/`.
`HWCinemaTheater.freeze = <seconds>` holds the break at any moment for
inspection.
