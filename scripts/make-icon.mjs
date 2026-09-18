// ---------------------------------------------------------------------------
// ICON GENERATOR — THE INSIGNIA as the desktop's face. Paints the website's
// mark (site/assets/nav.js MARK: the ether ring, three spokes, the HOLLOW
// core and the three attribute points in teal / violet / ember) onto the
// game's dark plate from pure math — scene → per-pixel signed-distance
// fields → hand-rolled PNG / ICO bytes, zero dependencies — at EVERY size the
// desktop asks for, so the title bar, the taskbar, Alt-Tab, the installer
// and the browser tab all wear the one mark the site wears:
//
//   build/icon.png            512² — electron-builder's Linux icon set and
//                             the non-Windows window icon (launcher/main.cjs)
//   build/icon.ico            16·20·24·32·40·48·64·128·256 — the Windows exe,
//                             installer and window icon; every frame its own
//                             cut, so Windows never downsamples the 512
//   public/favicon.ico        16·32·48 — the game shell's tab icon (Vite
//                             copies public/ into dist/ and site/play/)
//   site/assets/favicon.ico   the same bytes for the website's own pages
//
// THE HINTED CUT: one geometry, weights that follow the size. At 512 the
// strokes sit at the site mark's own proportions; toward 16 px they thicken
// (a lerp over log2(size)), the spokes fade out below 24 px, and the point
// discs grow so the trio survives the tray. THE FRAME IN ETHER (her word):
// ring, spokes and core stroke in #b0c6e4 → #8fa8d8; only the three points
// speak the trio. Change the geometry in nav.js first, then mirror it here.
//
// Deterministic: same script, same bytes — the committed files change only
// when the art math does. Re-run: `npm run icon`. `--preview=<dir>` also
// dumps every frame as its own PNG (small frames ×8 nearest-neighbour too)
// for eyeballing the hinted cuts.
// ---------------------------------------------------------------------------

import { deflateSync } from 'node:zlib';
import { mkdirSync, writeFileSync } from 'node:fs';
import { dirname, join } from 'node:path';
import { fileURLToPath } from 'node:url';

const ROOT = join(dirname(fileURLToPath(import.meta.url)), '..');

// ------------------------------------------------------------------- palette
const ETHER_A = [0xb0, 0xc6, 0xe4];     // the frame gradient's start (top-left)
const ETHER_B = [0x8f, 0xa8, 0xd8];     // … and its end (bottom-right)
const TEAL = [0x4f, 0xd6, 0xc4];        // --teal   · the top point
const VIOLET = [0xa9, 0x8b, 0xff];      // --violet · the lower-right point
const EMBER = [0xff, 0x8a, 0x4c];       // --ember  · the lower-left point
const PLATE_TOP = [0x14, 0x14, 0x1e];   // the game's panel palette …
const PLATE_BOT = [0x0a, 0x0a, 0x0e];   // … down to the window background

// -------------------------------------------------------------- the insignia
// The site mark's geometry verbatim, in its own 32-unit viewBox space.
const MARK = {
  ringR: 12,
  coreR: 4.4,
  /** [x1, y1, x2, y2] — core rim → toward each point */
  spokes: [[16, 11.6, 16, 6.2], [19.8, 18.2, 24.5, 20.9], [12.2, 18.2, 7.5, 20.9]],
  points: [
    { x: 16, y: 4, rgb: TEAL },
    { x: 26.4, y: 22, rgb: VIOLET },
    { x: 5.6, y: 22, rgb: EMBER },
  ],
  ringAlpha: 0.9,
  spokeAlpha: 0.55,
  /** Optical centring: the mark's ink box sits ~1.1u above the ring's centre
   *  (the top point reaches out, the lower points stop inside the ring), so
   *  the ring centre drops by this much to centre the ink on the plate. */
  lift: 1.1,
};

// ------------------------------------------------------------ the hinted cut
// Stroke weights and disc radii in mark units, plus the mark's scale as a
// fraction of the canvas per unit. HEAVY is the 16 px cut, CANON the 512 px
// cut; sizes between lerp on log2(size).
const CUT_HEAVY = { unit: 1 / 35, ring: 2.8, spoke: 2.0, core: 2.3, point: 3.4 };
const CUT_CANON = { unit: 1 / 38, ring: 1.6, spoke: 1.2, core: 1.7, point: 2.5 };
const PLATE = {
  inset: 0.039,      // plate edge in from the canvas edge (× size)
  corner: 0.125,     // corner radius (× size)
  rimHalf: 0.003125, // rim half-width (× size), floored at half a pixel
  rimAlpha: 0.32,    // a quiet ether rim
  glow: 0.12,        // the ether breath inside the ring
  pointGlow: 0.18,   // each point's halo at 512 (fades out toward 16)
};

const SIZES_ICO = [16, 20, 24, 32, 40, 48, 64, 128, 256];
const SIZES_FAVICON = [16, 32, 48];
const SIZE_PNG = 512;

// ------------------------------------------------------------------- helpers
const clamp01 = (x) => (x < 0 ? 0 : x > 1 ? 1 : x);
const lerp = (a, b, t) => a + (b - a) * t;
const smooth = (t) => t * t * (3 - 2 * t);
/** One-sample-pixel anti-alias band around a coverage edge (positive = covered). */
const aa = (x) => smooth(clamp01(x + 0.5));
const mix = (a, b, t) => [lerp(a[0], b[0], t), lerp(a[1], b[1], t), lerp(a[2], b[2], t)];
/** Signed distance to a rounded rect centred at 0 (negative inside). */
function sdRoundRect(x, y, hx, hy, r) {
  const qx = Math.abs(x) - (hx - r), qy = Math.abs(y) - (hy - r);
  const ox = Math.max(qx, 0), oy = Math.max(qy, 0);
  return Math.hypot(ox, oy) + Math.min(Math.max(qx, qy), 0) - r;
}
/** Distance from (px, py) to the segment a→b. */
function sdSegment(px, py, ax, ay, bx, by) {
  const vx = bx - ax, vy = by - ay, wx = px - ax, wy = py - ay;
  const t = clamp01((wx * vx + wy * vy) / (vx * vx + vy * vy));
  return Math.hypot(wx - vx * t, wy - vy * t);
}
/** Straight-alpha src-over: dst ← rgb@a OVER dst. */
function over(dst, rgb, a) {
  if (a <= 0) return;
  const outA = a + dst[3] * (1 - a);
  dst[0] = (rgb[0] * a + dst[0] * dst[3] * (1 - a)) / outA;
  dst[1] = (rgb[1] * a + dst[1] * dst[3] * (1 - a)) / outA;
  dst[2] = (rgb[2] * a + dst[2] * dst[3] * (1 - a)) / outA;
  dst[3] = outA;
}

// --------------------------------------------------------------------- scene
function cutFor(size) {
  const t = clamp01((Math.log2(size) - 4) / 5); // 16 → 0, 512 → 1
  const k = (key) => lerp(CUT_HEAVY[key], CUT_CANON[key], t);
  return {
    unit: k('unit'), ring: k('ring'), spoke: k('spoke'), core: k('core'), point: k('point'),
    spokeFade: size < 24 ? 0 : size < 48 ? 0.7 : 1,
    pointGlow: PLATE.pointGlow * t,
  };
}

/** Everything the painter needs, in SAMPLE space (size × ss). */
function buildScene(size, ss) {
  const cut = cutFor(size);
  const S = size * ss;
  const u = S * cut.unit;
  const cx = S / 2, cy = S / 2 + MARK.lift * u;
  const inset = S * PLATE.inset;
  return {
    S, u, cx, cy, cut, inset,
    ox: cx - 16 * u, oy: cy - 16 * u,       // the mark's viewBox origin
    half: S / 2 - inset, corner: S * PLATE.corner,
    rimHalf: Math.max(0.5 * ss, S * PLATE.rimHalf),
  };
}

/** One sample → straight-alpha [r, g, b, a]. */
function paint(sc, x, y) {
  const p = [0, 0, 0, 0];
  // 1. The plate: rounded square, vertical gradient, transparent corners.
  //    Every later layer multiplies by its coverage, so nothing paints
  //    outside the silhouette even where the mark grazes the edge.
  const sd = sdRoundRect(x - sc.S / 2, y - sc.S / 2, sc.half, sc.half, sc.corner);
  const plate = aa(-sd);
  if (plate <= 0) return p;
  over(p, mix(PLATE_TOP, PLATE_BOT, clamp01((y - sc.inset) / (sc.S - 2 * sc.inset))), plate);

  // 2. The ether breath inside the ring (the abyss is the face).
  const d = Math.hypot(x - sc.cx, y - sc.cy);
  const R = MARK.ringR * sc.u;
  if (d < R) over(p, ETHER_B, (1 - d / R) ** 2 * PLATE.glow * plate);

  // 3. The frame in ether: the nav mark's (0,0)→(32,32) gradient.
  const mx = (x - sc.ox) / sc.u, my = (y - sc.oy) / sc.u;
  const frame = mix(ETHER_A, ETHER_B, clamp01((mx + my) / 64));
  if (sc.cut.spokeFade > 0) {
    for (const [ax, ay, bx, by] of MARK.spokes) {
      const c = aa(sc.cut.spoke * sc.u / 2 - sdSegment(mx, my, ax, ay, bx, by) * sc.u);
      if (c > 0) over(p, frame, c * MARK.spokeAlpha * sc.cut.spokeFade * plate);
    }
  }
  over(p, frame, aa(sc.cut.ring * sc.u / 2 - Math.abs(d - R)) * MARK.ringAlpha * plate);
  over(p, frame, aa(sc.cut.core * sc.u / 2 - Math.abs(d - MARK.coreR * sc.u)) * plate);

  // 4. The three points: a halo (spilling onto the ring) under a solid disc.
  const pr = sc.cut.point * sc.u;
  for (const pt of MARK.points) {
    const pd = Math.hypot(mx - pt.x, my - pt.y) * sc.u;
    if (sc.cut.pointGlow > 0) {
      const gr = pr * 2.6;
      if (pd < gr) over(p, pt.rgb, (1 - pd / gr) ** 2 * sc.cut.pointGlow * plate);
    }
    over(p, pt.rgb, aa(pr - pd) * plate);
  }

  // 5. The rim: a quiet ether edge so the plate reads on a light taskbar too.
  over(p, ETHER_B, PLATE.rimAlpha * aa(sc.rimHalf - Math.abs(sd)) * plate);
  return p;
}

/** Render one size with ss×ss supersampling → straight RGBA8 bytes. */
function render(size) {
  const ss = size <= 64 ? 4 : size <= 128 ? 3 : 2;
  const sc = buildScene(size, ss);
  const out = new Uint8Array(size * size * 4);
  const n = ss * ss;
  for (let y = 0; y < size; y++) {
    for (let x = 0; x < size; x++) {
      // Average PREMULTIPLIED samples, then un-premultiply — averaging
      // straight alpha would darken every soft edge.
      let r = 0, g = 0, b = 0, a = 0;
      for (let sy = 0; sy < ss; sy++) {
        for (let sx = 0; sx < ss; sx++) {
          const s = paint(sc, x * ss + sx + 0.5, y * ss + sy + 0.5);
          r += s[0] * s[3]; g += s[1] * s[3]; b += s[2] * s[3]; a += s[3];
        }
      }
      const o = (y * size + x) * 4;
      if (a > 0) {
        out[o] = Math.round(r / a); out[o + 1] = Math.round(g / a); out[o + 2] = Math.round(b / a);
        out[o + 3] = Math.round(a / n * 255);
      }
    }
  }
  return out;
}

// ------------------------------------------------------------------ PNG bytes
const CRC_TABLE = new Int32Array(256).map((_, n) => {
  let c = n;
  for (let k = 0; k < 8; k++) c = (c & 1) ? (0xedb88320 ^ (c >>> 1)) : (c >>> 1);
  return c;
});
function crc32(buf) {
  let c = ~0;
  for (const b of buf) c = CRC_TABLE[(c ^ b) & 0xff] ^ (c >>> 8);
  return ~c >>> 0;
}
function chunk(type, data) {
  const out = Buffer.alloc(12 + data.length);
  out.writeUInt32BE(data.length, 0);
  out.write(type, 4, 'ascii');
  data.copy(out, 8);
  out.writeUInt32BE(crc32(Buffer.concat([Buffer.from(type, 'ascii'), data])), 8 + data.length);
  return out;
}
function png(size, rgba) {
  const raw = Buffer.alloc(size * (size * 4 + 1));
  for (let y = 0; y < size; y++) {
    const row = y * (size * 4 + 1);
    raw[row] = 0; // filter: none
    raw.set(rgba.subarray(y * size * 4, (y + 1) * size * 4), row + 1);
  }
  const ihdr = Buffer.alloc(13);
  ihdr.writeUInt32BE(size, 0);
  ihdr.writeUInt32BE(size, 4);
  ihdr[8] = 8;  // bit depth
  ihdr[9] = 6;  // RGBA
  return Buffer.concat([
    Buffer.from([0x89, 0x50, 0x4e, 0x47, 0x0d, 0x0a, 0x1a, 0x0a]),
    chunk('IHDR', ihdr),
    chunk('IDAT', deflateSync(raw, { level: 9 })),
    chunk('IEND', Buffer.alloc(0)),
  ]);
}

// ------------------------------------------------------------------ ICO bytes
// Classic layout: 32-bit BGRA BMP entries (bottom-up rows + a 1-bit AND mask)
// for every frame below 256, a PNG entry for the 256 — the shape rcedit, NSIS
// and every browser agree on.
function bmpEntry(size, rgba) {
  const andRow = Math.ceil(size / 32) * 4;
  const buf = Buffer.alloc(40 + size * size * 4 + andRow * size); // zero-filled
  buf.writeUInt32LE(40, 0);             // BITMAPINFOHEADER
  buf.writeInt32LE(size, 4);
  buf.writeInt32LE(size * 2, 8);        // XOR + AND heights
  buf.writeUInt16LE(1, 12);             // planes
  buf.writeUInt16LE(32, 14);            // bpp
  buf.writeUInt32LE(size * size * 4 + andRow * size, 20);
  let o = 40;
  for (let y = size - 1; y >= 0; y--) {
    for (let x = 0; x < size; x++) {
      const i = (y * size + x) * 4;
      buf[o++] = rgba[i + 2]; buf[o++] = rgba[i + 1]; buf[o++] = rgba[i]; buf[o++] = rgba[i + 3];
    }
  }
  for (let y = size - 1; y >= 0; y--) {
    for (let x = 0; x < size; x++) {
      if (rgba[(y * size + x) * 4 + 3] === 0) buf[o + (x >> 3)] |= 0x80 >> (x & 7);
    }
    o += andRow;
  }
  return buf;
}
function ico(frames) {
  const header = Buffer.alloc(6 + 16 * frames.length);
  header.writeUInt16LE(1, 2);            // type: icon
  header.writeUInt16LE(frames.length, 4);
  const parts = [header];
  let offset = header.length;
  frames.forEach(({ size, data }, i) => {
    const e = 6 + i * 16;
    header[e] = size >= 256 ? 0 : size;
    header[e + 1] = size >= 256 ? 0 : size;
    header.writeUInt16LE(1, e + 4);      // planes
    header.writeUInt16LE(32, e + 6);     // bpp
    header.writeUInt32LE(data.length, e + 8);
    header.writeUInt32LE(offset, e + 12);
    parts.push(data);
    offset += data.length;
  });
  return Buffer.concat(parts);
}
function icoOf(sizes) {
  return ico(sizes.map((size) => ({
    size,
    data: size >= 256 ? png(size, frame(size)) : bmpEntry(size, frame(size)),
  })));
}

// --------------------------------------------------------------------- write
const frames = new Map();
const frame = (size) => {
  if (!frames.has(size)) frames.set(size, render(size));
  return frames.get(size);
};
function write(rel, bytes) {
  const out = join(ROOT, rel);
  mkdirSync(dirname(out), { recursive: true });
  writeFileSync(out, bytes);
  console.log(`icon: wrote ${rel} (${bytes.length} bytes)`);
}

write('build/icon.png', png(SIZE_PNG, frame(SIZE_PNG)));
write('build/icon.ico', icoOf(SIZES_ICO));
const favicon = icoOf(SIZES_FAVICON);
write('public/favicon.ico', favicon);
write('site/assets/favicon.ico', favicon);

const preview = process.argv.find((a) => a.startsWith('--preview='))?.slice('--preview='.length);
if (preview) {
  for (const size of [...new Set([...SIZES_ICO, SIZE_PNG])]) {
    const rgba = frame(size);
    writeFileSync(join(preview, `icon-${size}.png`), png(size, rgba));
    if (size < 64) {
      // ×8 nearest-neighbour blow-up so a 16 px cut can be judged by eye.
      const k = 8, big = new Uint8Array(size * k * size * k * 4);
      for (let y = 0; y < size * k; y++) {
        for (let x = 0; x < size * k; x++) {
          big.set(rgba.subarray((((y / k) | 0) * size + ((x / k) | 0)) * 4, (((y / k) | 0) * size + ((x / k) | 0)) * 4 + 4), (y * size * k + x) * 4);
        }
      }
      writeFileSync(join(preview, `icon-${size}@8x.png`), png(size * k, big));
    }
  }
  console.log(`icon: previews in ${preview}`);
}
