// ---------------------------------------------------------------------------
// THE PART GRAMMAR — top-down anatomy as composable painters. A LOOK is an
// ordered stack of parts (skull, ribs, hood, scythe, claws, wisps…), each
// placed in body space (unit = body radius, +X = facing) with a palette ROLE
// (base/bone/metal/cloth/…) or explicit color. Looks bake into the body
// sprite; a handful of `live` parts (wisps, flames) animate per frame.
//
// The goal: a skeleton READS as a skeleton from directly overhead — skull
// dome, eye pits, rib spokes — and a reaper as a cowled scythe-bearer, even
// with the palette muted. Every part is parametric; new monsters are
// assembled from this kit in src/data/looks.ts without touching draw code.
// Add a painter only for a genuinely new LIMB of vocabulary.
// ---------------------------------------------------------------------------

import { adjust, hash01, mix, shade, withAlpha } from './color';
import { materialOf, rampOf, type Ramp } from './materials';

export interface PartSpec {
  kind: string;
  /** Placement in body space: unit = body radius, +X = facing. */
  x?: number;
  y?: number;
  rot?: number;
  scale?: number;
  /** Palette role (each painter has a sensible default). */
  role?: PaletteRole;
  /** Explicit color override (its own ramp; wins over role). */
  color?: string;
  alpha?: number;
  /** Also draw mirrored across the facing axis. */
  mirror?: boolean;
  /** Painter-specific knobs (eye count, blade length, cap count…). */
  params?: Record<string, unknown>;
}

export interface LookDef {
  /** Baked stack, painted in order (under → over). */
  parts: PartSpec[];
  /** Animated overlay parts, drawn per frame in facing space. */
  live?: PartSpec[];
  /** Contact-shadow width multiplier (long bodies want more). */
  shadowScale?: number;
  /** Container BANDING drawn over the body (breakables read as containers):
   *  iron hoops (kegs) or cross-slats (crates). On the LOOK, not the monster
   *  id — any def wearing the look gets the banding, and a new container
   *  kind opts in with one word. */
  banding?: 'hoops' | 'cross';
}

export type PaletteRole =
  | 'base' | 'bone' | 'metal' | 'wood' | 'cloth' | 'dark' | 'glow' | 'accent';

/** The rampset a look paints from — derived once per (color, material). */
export interface LookPalette {
  base: Ramp;
  bone: Ramp;
  metal: Ramp;
  wood: Ramp;
  cloth: Ramp;
  accent: Ramp;
  dark: string;
  glow: string;
}

export function lookPalette(color: string, material?: string): LookPalette {
  const mat = materialOf(material);
  return {
    base: rampOf(color, mat),
    bone: rampOf(mix('#ddd5bd', color, 0.12), materialOf('bone')),
    metal: rampOf(mix('#98a1ad', color, 0.15), materialOf('metal')),
    wood: rampOf(mix('#77572f', color, 0.1), materialOf('wood')),
    cloth: rampOf(adjust(color, 0, 1.08, -0.05), materialOf('cloth')),
    accent: rampOf(adjust(color, 0, 1.35, 0.09), mat),
    dark: '#16121c',
    glow: shade(color, 0.42),
  };
}

function rampFor(spec: PartSpec, pal: LookPalette, def: PaletteRole): Ramp {
  if (spec.color) return rampOf(spec.color, materialOf('flesh'));
  const role = spec.role ?? def;
  if (role === 'dark') return rampOf(pal.dark, materialOf('stone'));
  if (role === 'glow') return rampOf(pal.glow, materialOf('crystal'));
  return pal[role];
}

/** Painter context: r = BODY radius; parts scale off it. `t` is the clock
 *  for live painters (undefined during bakes). */
export type PartPainter = (
  ctx: CanvasRenderingContext2D, r: number, spec: PartSpec,
  pal: LookPalette, t?: number,
) => void;

const P = (spec: PartSpec, key: string, dflt: number): number => {
  const v = spec.params?.[key];
  return typeof v === 'number' ? v : dflt;
};
const PB = (spec: PartSpec, key: string, dflt: boolean): boolean => {
  const v = spec.params?.[key];
  return typeof v === 'boolean' ? v : dflt;
};
const PS = (spec: PartSpec, key: string): string | undefined => {
  const v = spec.params?.[key];
  return typeof v === 'string' ? v : undefined;
};

/** Position/rotate/scale + mirror plumbing shared by every painter. */
function place(ctx: CanvasRenderingContext2D, r: number, spec: PartSpec,
  paint: (ctx: CanvasRenderingContext2D, R: number) => void): void {
  const passes = spec.mirror ? [1, -1] : [1];
  for (const m of passes) {
    ctx.save();
    ctx.translate((spec.x ?? 0) * r, (spec.y ?? 0) * r * m);
    ctx.rotate((spec.rot ?? 0) * m);
    if (m < 0) ctx.scale(1, -1);
    ctx.globalAlpha *= spec.alpha ?? 1;
    paint(ctx, r * (spec.scale ?? 1));
    ctx.restore();
  }
}

/** Mini volume pass clipped to the CURRENT path (light up-left). */
function volume(ctx: CanvasRenderingContext2D, R: number, ramp: Ramp, trace: () => void): void {
  ctx.save();
  trace();
  ctx.clip();
  const lg = ctx.createRadialGradient(-R * 0.38, -R * 0.38, R * 0.08, -R * 0.38, -R * 0.38, R * 1.4);
  lg.addColorStop(0, withAlpha(ramp.light, 0.5));
  lg.addColorStop(1, withAlpha(ramp.light, 0));
  ctx.fillStyle = lg;
  ctx.fillRect(-R * 2, -R * 2, R * 4, R * 4);
  const sg = ctx.createRadialGradient(R * 0.45, R * 0.45, R * 0.08, R * 0.45, R * 0.45, R * 1.5);
  sg.addColorStop(0, withAlpha(ramp.shadow, 0.5));
  sg.addColorStop(1, withAlpha(ramp.shadow, 0));
  ctx.fillStyle = sg;
  ctx.fillRect(-R * 2, -R * 2, R * 4, R * 4);
  ctx.restore();
}

function outlined(ctx: CanvasRenderingContext2D, ramp: Ramp, w = 1.4): void {
  ctx.strokeStyle = withAlpha(ramp.outline, 0.75);
  ctx.lineWidth = w;
  ctx.stroke();
}

// ============================================================== CORE BODIES

/** Round body disc with volume — the plain core. */
const disc: PartPainter = (ctx, r, spec, pal) => {
  const ramp = rampFor(spec, pal, 'base');
  place(ctx, r, spec, (c, R) => {
    const trace = (): void => { c.beginPath(); c.arc(0, 0, R, 0, Math.PI * 2); };
    trace(); c.fillStyle = ramp.base; c.fill();
    volume(c, R, ramp, trace);
    trace(); outlined(c, ramp, 1.6);
  });
};

/** Irregular organic silhouette (zombies, fiends, oozes). */
const blob: PartPainter = (ctx, r, spec, pal) => {
  const ramp = rampFor(spec, pal, 'base');
  const seed = P(spec, 'seed', 7);
  const irr = P(spec, 'irr', 0.16);
  place(ctx, r, spec, (c, R) => {
    const trace = (): void => {
      c.beginPath();
      for (let i = 0; i < 11; i++) {
        const a = (i / 11) * Math.PI * 2;
        const rr = R * (1 - irr + irr * 2 * hash01(i, seed));
        const x = Math.cos(a) * rr, y = Math.sin(a) * rr;
        if (i === 0) c.moveTo(x, y); else c.lineTo(x, y);
      }
      c.closePath();
    };
    trace(); c.fillStyle = ramp.base; c.fill();
    volume(c, R, ramp, trace);
    trace(); outlined(c, ramp, 1.6);
  });
};

/** Segmented shell oval (insects, crustaceans) — plates across the axis. */
const carapace: PartPainter = (ctx, r, spec, pal) => {
  const ramp = rampFor(spec, pal, 'base');
  const segs = Math.round(P(spec, 'segs', 3));
  place(ctx, r, spec, (c, R) => {
    const trace = (): void => { c.beginPath(); c.ellipse(0, 0, R * 1.08, R * 0.85, 0, 0, Math.PI * 2); };
    trace(); c.fillStyle = ramp.base; c.fill();
    volume(c, R, ramp, trace);
    c.save(); trace(); c.clip();
    c.strokeStyle = withAlpha(ramp.shadow, 0.6);
    c.lineWidth = Math.max(1.2, R * 0.09);
    for (let i = 1; i <= segs; i++) {
      const x = R * 1.08 * (1 - (i / (segs + 0.5)) * 2) + R * 0.3;
      c.beginPath(); c.ellipse(x - R * 0.3, 0, R * 0.32, R * 0.85, 0, -Math.PI / 2, Math.PI / 2); c.stroke();
    }
    c.restore();
    trace(); outlined(c, ramp, 1.6);
  });
};

/** Head + shoulders from above — THE humanoid core. */
const torso: PartPainter = (ctx, r, spec, pal) => {
  const ramp = rampFor(spec, pal, 'base');
  const head = P(spec, 'head', 0.42);
  place(ctx, r, spec, (c, R) => {
    // Shoulders: a wide capsule perpendicular to facing, just behind center.
    const trace = (): void => {
      c.beginPath();
      c.ellipse(-R * 0.12, 0, R * 0.52, R * 0.95, 0, 0, Math.PI * 2);
    };
    trace(); c.fillStyle = ramp.base; c.fill();
    volume(c, R, ramp, trace);
    trace(); outlined(c, ramp, 1.5);
    // Head disc forward of the shoulder line.
    const hr = R * head;
    const htrace = (): void => { c.beginPath(); c.arc(R * 0.38, 0, hr, 0, Math.PI * 2); };
    htrace(); c.fillStyle = shade(ramp.base, 0.1); c.fill();
    volume(c, hr, ramp, htrace);
    htrace(); outlined(c, ramp, 1.4);
  });
};

/** Draped robe: wide rounded hem behind, narrowing toward the front. */
const robe: PartPainter = (ctx, r, spec, pal) => {
  const ramp = rampFor(spec, pal, 'cloth');
  place(ctx, r, spec, (c, R) => {
    const trace = (): void => {
      c.beginPath();
      c.moveTo(R * 0.62, -R * 0.4);
      c.quadraticCurveTo(R * 0.85, 0, R * 0.62, R * 0.4);
      c.quadraticCurveTo(R * 0.15, R * 0.95, -R * 0.55, R * 0.85);
      // Scalloped hem across the back.
      c.quadraticCurveTo(-R * 0.8, R * 0.45, -R * 0.98, R * 0.3);
      c.quadraticCurveTo(-R * 0.86, 0, -R * 0.98, -R * 0.3);
      c.quadraticCurveTo(-R * 0.8, -R * 0.45, -R * 0.55, -R * 0.85);
      c.quadraticCurveTo(R * 0.15, -R * 0.95, R * 0.62, -R * 0.4);
      c.closePath();
    };
    trace(); c.fillStyle = ramp.base; c.fill();
    volume(c, R, ramp, trace);
    // Center fold.
    c.strokeStyle = withAlpha(ramp.shadow, 0.55);
    c.lineWidth = Math.max(1.2, R * 0.08);
    c.beginPath(); c.moveTo(R * 0.5, 0); c.lineTo(-R * 0.9, 0); c.stroke();
    trace(); outlined(c, ramp, 1.5);
  });
};

/** Serpent head wedge (worm bodies draw their own segment trail). */
const serpentHead: PartPainter = (ctx, r, spec, pal) => {
  const ramp = rampFor(spec, pal, 'base');
  place(ctx, r, spec, (c, R) => {
    const trace = (): void => {
      c.beginPath();
      c.moveTo(R * 1.05, 0);
      c.quadraticCurveTo(R * 0.7, R * 0.72, -R * 0.4, R * 0.62);
      c.quadraticCurveTo(-R * 0.85, 0, -R * 0.4, -R * 0.62);
      c.quadraticCurveTo(R * 0.7, -R * 0.72, R * 1.05, 0);
      c.closePath();
    };
    trace(); c.fillStyle = ramp.base; c.fill();
    volume(c, R, ramp, trace);
    trace(); outlined(c, ramp, 1.5);
  });
};

// ================================================================= BONE KIT

/** Top-down skull: cranium dome, brow ridge, eye pits, nasal notch, jaw tip.
 *  params: glow (socket glow color key: 'glow' uses palette glow), jaw. */
const skull: PartPainter = (ctx, r, spec, pal) => {
  const ramp = rampFor(spec, pal, 'bone');
  const glowCol = PS(spec, 'glow') === 'glow' ? pal.glow : PS(spec, 'glow');
  place(ctx, r, spec, (c, R) => {
    const S = R * 0.52; // skull radius from body radius
    // Jaw tip peeking past the front rim.
    if (PB(spec, 'jaw', true)) {
      c.fillStyle = shade(ramp.base, -0.12);
      c.beginPath();
      c.ellipse(S * 0.95, 0, S * 0.42, S * 0.5, 0, 0, Math.PI * 2);
      c.fill();
      outlined(c, ramp, 1.1);
    }
    // Cranium dome.
    const trace = (): void => { c.beginPath(); c.ellipse(0, 0, S, S * 0.92, 0, 0, Math.PI * 2); };
    trace(); c.fillStyle = ramp.base; c.fill();
    volume(c, S, ramp, trace);
    trace(); outlined(c, ramp, 1.3);
    // Brow ridge — a shading arc where dome meets face.
    c.strokeStyle = withAlpha(ramp.shadow, 0.7);
    c.lineWidth = Math.max(1.2, S * 0.13);
    c.beginPath(); c.arc(0, 0, S * 0.62, -0.95, 0.95); c.stroke();
    // Eye pits (forward, splayed) — the read that says SKULL.
    for (const side of [-1, 1]) {
      const ex = S * 0.58, ey = side * S * 0.34;
      c.fillStyle = pal.dark;
      c.beginPath(); c.ellipse(ex, ey, S * 0.24, S * 0.2, side * 0.35, 0, Math.PI * 2); c.fill();
      if (glowCol) {
        c.fillStyle = glowCol;
        c.beginPath(); c.arc(ex + S * 0.03, ey, S * 0.09, 0, Math.PI * 2); c.fill();
      }
    }
    // Nasal notch.
    c.fillStyle = withAlpha(pal.dark, 0.85);
    c.beginPath();
    c.moveTo(S * 0.95, 0); c.lineTo(S * 0.72, S * 0.08); c.lineTo(S * 0.72, -S * 0.08);
    c.closePath(); c.fill();
  });
};

/** Rib spokes over a spine, top-down — pairs curving back along the body.
 *  params: pairs, span (rib length in R), under (dark backing disc). */
const ribs: PartPainter = (ctx, r, spec, pal) => {
  const ramp = rampFor(spec, pal, 'bone');
  const pairs = Math.round(P(spec, 'pairs', 4));
  const span = P(spec, 'span', 0.85);
  place(ctx, r, spec, (c, R) => {
    if (PB(spec, 'under', false)) {
      c.fillStyle = withAlpha(pal.dark, 0.4);
      c.beginPath(); c.ellipse(-R * 0.1, 0, R * 0.85, R * 0.75, 0, 0, Math.PI * 2); c.fill();
    }
    c.lineCap = 'round';
    // Spine along the facing axis.
    c.strokeStyle = ramp.base;
    c.lineWidth = Math.max(2, R * 0.16);
    c.beginPath(); c.moveTo(R * 0.42, 0); c.lineTo(-R * 0.88, 0); c.stroke();
    // Vertebra knuckles.
    c.fillStyle = shade(ramp.base, 0.12);
    for (let i = 0; i <= pairs; i++) {
      const x = R * 0.42 - (i / pairs) * R * 1.2;
      c.beginPath(); c.arc(x, 0, R * 0.09, 0, Math.PI * 2); c.fill();
    }
    // Ribs: curved spokes, longest mid-body, sweeping backward.
    for (let i = 0; i < pairs; i++) {
      const x = R * 0.3 - (i / Math.max(1, pairs - 1)) * R * 1.05;
      const len = R * span * (0.72 + 0.28 * Math.sin((i + 0.5) / pairs * Math.PI));
      c.lineWidth = Math.max(1.6, R * 0.12);
      for (const side of [-1, 1]) {
        c.strokeStyle = i % 2 ? ramp.base : shade(ramp.base, 0.08);
        c.beginPath();
        c.moveTo(x, side * R * 0.06);
        c.quadraticCurveTo(x - len * 0.25, side * len * 0.75, x - len * 0.55, side * len);
        c.stroke();
      }
    }
    // Sternum highlight.
    c.strokeStyle = withAlpha(ramp.highlight, 0.5);
    c.lineWidth = Math.max(1, R * 0.06);
    c.beginPath(); c.moveTo(R * 0.42, 0); c.lineTo(-R * 0.2, 0); c.stroke();
  });
};

/** Trailing vertebrae dots (a bone tail). */
const spineTrail: PartPainter = (ctx, r, spec, pal) => {
  const ramp = rampFor(spec, pal, 'bone');
  place(ctx, r, spec, (c, R) => {
    for (let i = 0; i < 4; i++) {
      const R2 = R * (0.16 - i * 0.03);
      c.fillStyle = i % 2 ? ramp.base : shade(ramp.base, -0.1);
      c.beginPath();
      c.arc(-R * (1.05 + i * 0.28), Math.sin(i * 1.7) * R * 0.08, R2, 0, Math.PI * 2);
      c.fill();
    }
  });
};

/** Spiked crown ring (liches, chiefs). params: tines. */
const crown: PartPainter = (ctx, r, spec, pal) => {
  const ramp = rampFor(spec, pal, 'metal');
  const tines = Math.round(P(spec, 'tines', 5));
  place(ctx, r, spec, (c, R) => {
    const cr = R * 0.5;
    c.strokeStyle = ramp.base;
    c.lineWidth = Math.max(1.6, R * 0.11);
    c.beginPath(); c.arc(0, 0, cr, 0, Math.PI * 2); c.stroke();
    c.fillStyle = shade(ramp.base, 0.15);
    for (let i = 0; i < tines; i++) {
      const a = (i / tines) * Math.PI * 2;
      const bx = Math.cos(a) * cr, by = Math.sin(a) * cr;
      const tx = Math.cos(a) * cr * 1.55, ty = Math.sin(a) * cr * 1.55;
      const px = Math.cos(a + Math.PI / 2) * R * 0.09, py = Math.sin(a + Math.PI / 2) * R * 0.09;
      c.beginPath();
      c.moveTo(bx - px, by - py); c.lineTo(tx, ty); c.lineTo(bx + px, by + py);
      c.closePath(); c.fill();
    }
    c.strokeStyle = withAlpha(ramp.highlight, 0.7);
    c.lineWidth = Math.max(1, R * 0.05);
    c.beginPath(); c.arc(0, 0, cr * 0.82, -2.4, -0.6); c.stroke();
  });
};

// ================================================================ CLOTH KIT

/** Cowl with a shadowed opening toward the facing — the faceless hood.
 *  params: eyes (glow dots inside), eyeColor. */
const hood: PartPainter = (ctx, r, spec, pal) => {
  const ramp = rampFor(spec, pal, 'cloth');
  place(ctx, r, spec, (c, R) => {
    const trace = (): void => { c.beginPath(); c.ellipse(0, 0, R * 0.62, R * 0.55, 0, 0, Math.PI * 2); };
    trace(); c.fillStyle = ramp.base; c.fill();
    volume(c, R * 0.6, ramp, trace);
    trace(); outlined(c, ramp, 1.4);
    // The opening: a deep-shadow crescent facing forward.
    c.fillStyle = pal.dark;
    c.beginPath();
    c.ellipse(R * 0.22, 0, R * 0.33, R * 0.4, 0, 0, Math.PI * 2);
    c.fill();
    // Cowl lip over the opening's rear edge.
    c.strokeStyle = shade(ramp.base, 0.14);
    c.lineWidth = Math.max(1.4, R * 0.1);
    c.beginPath(); c.arc(R * 0.02, 0, R * 0.42, -1.15, 1.15); c.stroke();
    if (PB(spec, 'eyes', false)) {
      const col = PS(spec, 'eyeColor') ?? pal.glow;
      c.fillStyle = col;
      for (const side of [-1, 1]) {
        c.beginPath(); c.arc(R * 0.3, side * R * 0.14, R * 0.07, 0, Math.PI * 2); c.fill();
      }
    }
  });
};

/** Ragged cloak streamers trailing behind. params: n. */
const tatters: PartPainter = (ctx, r, spec, pal) => {
  const ramp = rampFor(spec, pal, 'cloth');
  const n = Math.round(P(spec, 'n', 4));
  place(ctx, r, spec, (c, R) => {
    for (let i = 0; i < n; i++) {
      const off = (i / (n - 1) - 0.5) * R * 1.15;
      const len = R * (0.9 + hash01(i, 31) * 0.55);
      c.fillStyle = withAlpha(i % 2 ? ramp.base : ramp.shadow, 0.88);
      c.beginPath();
      c.moveTo(-R * 0.25, off - R * 0.14);
      c.quadraticCurveTo(-R * 0.75, off + Math.sin(i * 2.4) * R * 0.16, -R * 0.25 - len, off + Math.sin(i * 3.1) * R * 0.2);
      c.lineTo(-R * 0.32, off + R * 0.14);
      c.closePath();
      c.fill();
    }
  });
};

/** Paired pauldrons on the shoulder line. */
const pauldrons: PartPainter = (ctx, r, spec, pal) => {
  const ramp = rampFor(spec, pal, 'metal');
  place(ctx, r, spec, (c, R) => {
    for (const side of [-1, 1]) {
      const y = side * R * 0.68;
      const trace = (): void => { c.beginPath(); c.ellipse(-R * 0.05, y, R * 0.3, R * 0.34, 0, 0, Math.PI * 2); };
      trace(); c.fillStyle = ramp.base; c.fill();
      volume(c, R * 0.32, ramp, trace);
      trace(); outlined(c, ramp, 1.2);
      c.strokeStyle = withAlpha(ramp.highlight, 0.6);
      c.lineWidth = Math.max(1, R * 0.05);
      c.beginPath(); c.arc(-R * 0.1, y - R * 0.06, R * 0.18, -2.6, -0.9); c.stroke();
    }
  });
};

// ============================================================ FACE/CREATURE

/** Glow-dot eyes splayed toward the facing. params: n, spread, dist, size. */
const eyes: PartPainter = (ctx, r, spec, pal) => {
  const n = Math.round(P(spec, 'n', 2));
  const spread = P(spec, 'spread', 0.5);
  const dist = P(spec, 'dist', 0.72);
  const size = P(spec, 'size', 0.1);
  const col = spec.color ?? pal.glow;
  place(ctx, r, spec, (c, R) => {
    for (let i = 0; i < n; i++) {
      const a = n === 1 ? 0 : (i / (n - 1) - 0.5) * spread * 2;
      const x = Math.cos(a) * R * dist, y = Math.sin(a) * R * dist;
      const g = c.createRadialGradient(x, y, 0, x, y, R * size * 2.6);
      g.addColorStop(0, withAlpha(col, 0.65));
      g.addColorStop(1, withAlpha(col, 0));
      c.fillStyle = g;
      c.fillRect(x - R * size * 3, y - R * size * 3, R * size * 6, R * size * 6);
      c.fillStyle = col;
      c.beginPath(); c.arc(x, y, R * size, 0, Math.PI * 2); c.fill();
      c.fillStyle = '#ffffff';
      c.beginPath(); c.arc(x, y, R * size * 0.38, 0, Math.PI * 2); c.fill();
    }
  });
};

/** Open maw wedge with teeth at the front rim. params: teeth, arc. */
const maw: PartPainter = (ctx, r, spec, pal) => {
  const arc = P(spec, 'arc', 0.62);
  place(ctx, r, spec, (c, R) => {
    c.fillStyle = withAlpha(pal.dark, 0.92);
    c.beginPath();
    c.moveTo(R * 0.1, 0);
    c.arc(0, 0, R * 0.95, -arc, arc);
    c.closePath();
    c.fill();
    if (PB(spec, 'teeth', true)) {
      c.fillStyle = shade(pal.bone.base, 0.15);
      const n = 5;
      for (let i = 0; i < n; i++) {
        const a = -arc + (i / (n - 1)) * arc * 2;
        const bx = Math.cos(a) * R * 0.9, by = Math.sin(a) * R * 0.9;
        const tx = Math.cos(a) * R * 0.62, ty = Math.sin(a) * R * 0.62;
        const px = Math.cos(a + Math.PI / 2) * R * 0.07, py = Math.sin(a + Math.PI / 2) * R * 0.07;
        c.beginPath();
        c.moveTo(bx - px, by - py); c.lineTo(tx, ty); c.lineTo(bx + px, by + py);
        c.closePath(); c.fill();
      }
    }
  });
};

/** Beast muzzle + ear pair. params: ears. */
const snout: PartPainter = (ctx, r, spec, pal) => {
  const ramp = rampFor(spec, pal, 'base');
  place(ctx, r, spec, (c, R) => {
    // Muzzle wedge.
    const trace = (): void => {
      c.beginPath();
      c.moveTo(R * 1.0, 0);
      c.quadraticCurveTo(R * 0.85, R * 0.3, R * 0.3, R * 0.34);
      c.lineTo(R * 0.3, -R * 0.34);
      c.quadraticCurveTo(R * 0.85, -R * 0.3, R * 1.0, 0);
      c.closePath();
    };
    trace(); c.fillStyle = shade(ramp.base, -0.06); c.fill();
    trace(); outlined(c, ramp, 1.2);
    // Nose tip.
    c.fillStyle = pal.dark;
    c.beginPath(); c.ellipse(R * 0.92, 0, R * 0.1, R * 0.13, 0, 0, Math.PI * 2); c.fill();
    // Ears swept back.
    if (PB(spec, 'ears', true)) {
      c.fillStyle = ramp.base;
      for (const side of [-1, 1]) {
        c.beginPath();
        c.moveTo(-R * 0.05, side * R * 0.4);
        c.lineTo(-R * 0.45, side * R * 0.78);
        c.lineTo(-R * 0.32, side * R * 0.28);
        c.closePath(); c.fill();
        outlined(c, ramp, 1.1);
        c.fillStyle = withAlpha(ramp.shadow, 0.6);
        c.beginPath();
        c.moveTo(-R * 0.14, side * R * 0.42);
        c.lineTo(-R * 0.36, side * R * 0.64);
        c.lineTo(-R * 0.3, side * R * 0.36);
        c.closePath(); c.fill();
        c.fillStyle = ramp.base;
      }
    }
  });
};

/** Paired chitin pincers curving inward ahead of the body. */
const mandibles: PartPainter = (ctx, r, spec, pal) => {
  const ramp = rampFor(spec, pal, 'base');
  place(ctx, r, spec, (c, R) => {
    c.lineCap = 'round';
    for (const side of [-1, 1]) {
      c.strokeStyle = shade(ramp.base, -0.15);
      c.lineWidth = Math.max(2, R * 0.16);
      c.beginPath();
      c.moveTo(R * 0.35, side * R * 0.42);
      c.quadraticCurveTo(R * 0.95, side * R * 0.4, R * 1.05, side * R * 0.06);
      c.stroke();
      c.strokeStyle = withAlpha(ramp.highlight, 0.5);
      c.lineWidth = Math.max(1, R * 0.06);
      c.beginPath();
      c.moveTo(R * 0.45, side * R * 0.4);
      c.quadraticCurveTo(R * 0.92, side * R * 0.36, R * 1.0, side * R * 0.1);
      c.stroke();
    }
  });
};

/** Forward-swept horns (ported from the adorn, part-ified). */
const horns: PartPainter = (ctx, r, spec, pal) => {
  const ramp = rampFor(spec, pal, 'bone');
  place(ctx, r, spec, (c, R) => {
    c.lineCap = 'round';
    for (const side of [-1, 1]) {
      const ang = side * 0.9;
      c.strokeStyle = ramp.base;
      c.lineWidth = Math.max(2.5, R * 0.2);
      c.beginPath();
      c.moveTo(Math.cos(ang) * R * 0.7, Math.sin(ang) * R * 0.7);
      c.quadraticCurveTo(
        Math.cos(ang) * R * 1.5, Math.sin(ang) * R * 1.5,
        Math.cos(ang - side * 0.5) * R * 1.7, Math.sin(ang - side * 0.5) * R * 1.7);
      c.stroke();
      c.strokeStyle = withAlpha(ramp.highlight, 0.6);
      c.lineWidth = Math.max(1.2, R * 0.08);
      c.beginPath();
      c.moveTo(Math.cos(ang) * R * 1.3, Math.sin(ang) * R * 1.3);
      c.quadraticCurveTo(
        Math.cos(ang) * R * 1.5, Math.sin(ang) * R * 1.5,
        Math.cos(ang - side * 0.5) * R * 1.66, Math.sin(ang - side * 0.5) * R * 1.66);
      c.stroke();
    }
  });
};

/** Perky ear triangles (goblinoids) — the adorn, part-ified. */
const ears: PartPainter = (ctx, r, spec, pal) => {
  const ramp = rampFor(spec, pal, 'base');
  place(ctx, r, spec, (c, R) => {
    for (const side of [-1, 1]) {
      const ang = side * 1.9;
      const bx = Math.cos(ang) * R * 0.85, by = Math.sin(ang) * R * 0.85;
      const tx = Math.cos(ang) * R * 1.7, ty = Math.sin(ang) * R * 1.7;
      const px = Math.cos(ang + Math.PI / 2) * R * 0.28, py = Math.sin(ang + Math.PI / 2) * R * 0.28;
      c.fillStyle = ramp.base;
      c.beginPath();
      c.moveTo(bx - px, by - py); c.lineTo(tx, ty); c.lineTo(bx + px, by + py);
      c.closePath(); c.fill();
      outlined(c, ramp, 1.1);
      c.fillStyle = withAlpha(ramp.shadow, 0.5);
      c.beginPath();
      c.moveTo(bx - px * 0.4, by - py * 0.4); c.lineTo(tx, ty); c.lineTo(bx + px * 0.4, by + py * 0.4);
      c.closePath(); c.fill();
    }
  });
};

/** Short tusk pair beside the jaw. */
const tusks: PartPainter = (ctx, r, spec, pal) => {
  const ramp = rampFor(spec, pal, 'bone');
  place(ctx, r, spec, (c, R) => {
    c.lineCap = 'round';
    c.strokeStyle = ramp.base;
    c.lineWidth = Math.max(2, R * 0.14);
    for (const side of [-1, 1]) {
      c.beginPath();
      c.moveTo(R * 0.42, side * R * 0.3);
      c.quadraticCurveTo(R * 0.72, side * R * 0.34, R * 0.8, side * R * 0.12);
      c.stroke();
    }
  });
};

/** Spike nub ring (trolls, briar things) — the adorn, part-ified. */
const spikes: PartPainter = (ctx, r, spec, pal) => {
  const ramp = rampFor(spec, pal, 'base');
  const n = Math.round(P(spec, 'n', 6));
  place(ctx, r, spec, (c, R) => {
    c.fillStyle = ramp.base;
    for (let s = 0; s < n; s++) {
      const ang = (s / n) * Math.PI * 2;
      c.beginPath();
      c.arc(Math.cos(ang) * R * 1.05, Math.sin(ang) * R * 1.05, R * 0.18, 0, Math.PI * 2);
      c.fill();
      outlined(c, ramp, 1);
    }
  });
};

/** Membrane wings swept back (the adorn, part-ified). */
const wings: PartPainter = (ctx, r, spec, pal) => {
  const ramp = rampFor(spec, pal, 'base');
  place(ctx, r, spec, (c, R) => {
    const back = Math.PI;
    for (const side of [-1, 1]) {
      const bx = Math.cos(back + side * 0.45) * R * 0.5, by = Math.sin(back + side * 0.45) * R * 0.5;
      for (const [spread, len] of [[0.95, 1.7], [0.55, 2.1], [0.2, 1.6]] as const) {
        const ang = back + side * spread;
        const tx = Math.cos(ang) * R * len, ty = Math.sin(ang) * R * len;
        const mx = Math.cos(ang - side * 0.25) * R * (len * 0.6);
        const my = Math.sin(ang - side * 0.25) * R * (len * 0.6);
        c.fillStyle = withAlpha(ramp.base, 0.95);
        c.beginPath();
        c.moveTo(bx, by); c.lineTo(tx, ty); c.lineTo(mx, my);
        c.closePath(); c.fill();
        outlined(c, ramp, 1.1);
        c.strokeStyle = withAlpha(ramp.highlight, 0.35);
        c.lineWidth = 1;
        c.beginPath(); c.moveTo(bx, by); c.lineTo(tx, ty); c.stroke();
      }
    }
  });
};

// ============================================================ LIMBS/WEAPONS

/** Talon fans on paired forelimbs. params: len, talons. */
const claws: PartPainter = (ctx, r, spec, pal) => {
  const ramp = rampFor(spec, pal, 'bone');
  const body = rampFor({ ...spec, role: undefined, color: undefined }, pal, 'base');
  const len = P(spec, 'len', 0.42);
  const talons = Math.round(P(spec, 'talons', 3));
  place(ctx, r, spec, (c, R) => {
    for (const side of [-1, 1]) {
      const px = R * 0.32, py = side * R * 0.78;
      // Limb pad.
      c.fillStyle = shade(body.base, -0.08);
      c.beginPath(); c.arc(px, py, R * 0.24, 0, Math.PI * 2); c.fill();
      outlined(c, body, 1.1);
      // Talons fanning forward.
      c.lineCap = 'round';
      c.strokeStyle = ramp.base;
      c.lineWidth = Math.max(1.6, R * 0.09);
      for (let i = 0; i < talons; i++) {
        const a = (i / (talons - 1) - 0.5) * 0.7 + side * 0.12;
        c.beginPath();
        c.moveTo(px + Math.cos(a) * R * 0.16, py + Math.sin(a) * R * 0.16);
        c.lineTo(px + Math.cos(a) * (R * 0.16 + R * len), py + Math.sin(a) * (R * 0.16 + R * len));
        c.stroke();
      }
    }
  });
};

/** The reaper's scythe: diagonal haft + crescent blade. */
const scythe: PartPainter = (ctx, r, spec, pal) => {
  const wood = rampFor({ ...spec, role: undefined }, pal, 'wood');
  const metal = pal.metal;
  place(ctx, r, spec, (c, R) => {
    c.lineCap = 'round';
    // Haft across the body.
    c.strokeStyle = wood.base;
    c.lineWidth = Math.max(2, R * 0.12);
    c.beginPath();
    c.moveTo(-R * 0.72, R * 0.62);
    c.lineTo(R * 0.7, -R * 0.62);
    c.stroke();
    c.strokeStyle = withAlpha(wood.highlight, 0.5);
    c.lineWidth = Math.max(1, R * 0.05);
    c.beginPath();
    c.moveTo(-R * 0.6, R * 0.52);
    c.lineTo(R * 0.5, -R * 0.44);
    c.stroke();
    // Blade: a crescent sweeping forward from the haft's head.
    const hx = R * 0.7, hy = -R * 0.62;
    c.strokeStyle = metal.light;
    c.lineWidth = Math.max(2.4, R * 0.15);
    c.beginPath();
    c.arc(hx - R * 0.15, hy + R * 0.62, R * 0.68, -Math.PI * 0.42, Math.PI * 0.18);
    c.stroke();
    c.strokeStyle = withAlpha('#ffffff', 0.55);
    c.lineWidth = Math.max(1, R * 0.05);
    c.beginPath();
    c.arc(hx - R * 0.15, hy + R * 0.62, R * 0.74, -Math.PI * 0.4, Math.PI * 0.14);
    c.stroke();
  });
};

/** Caster's staff along the side. params: orb (color/'glow'), skullTip. */
const staff: PartPainter = (ctx, r, spec, pal) => {
  const wood = pal.wood;
  place(ctx, r, spec, (c, R) => {
    const y = R * 0.66;
    c.lineCap = 'round';
    c.strokeStyle = wood.base;
    c.lineWidth = Math.max(2, R * 0.11);
    c.beginPath(); c.moveTo(-R * 0.7, y); c.lineTo(R * 0.8, y); c.stroke();
    c.strokeStyle = withAlpha(wood.highlight, 0.45);
    c.lineWidth = Math.max(1, R * 0.045);
    c.beginPath(); c.moveTo(-R * 0.55, y - R * 0.02); c.lineTo(R * 0.6, y - R * 0.02); c.stroke();
    if (PB(spec, 'skullTip', false)) {
      // A shrunken skull crowning the staff — the necromancer's signature.
      const S = R * 0.24;
      c.fillStyle = pal.bone.base;
      c.beginPath(); c.arc(R * 0.88, y, S, 0, Math.PI * 2); c.fill();
      c.strokeStyle = withAlpha(pal.bone.outline, 0.8);
      c.lineWidth = 1;
      c.stroke();
      c.fillStyle = pal.dark;
      for (const side of [-1, 1]) {
        c.beginPath(); c.arc(R * 0.88 + S * 0.4, y + side * S * 0.34, S * 0.24, 0, Math.PI * 2); c.fill();
      }
    } else {
      const col = PS(spec, 'orb') === 'glow' || !PS(spec, 'orb') ? pal.glow : PS(spec, 'orb')!;
      const g = c.createRadialGradient(R * 0.86, y, 0, R * 0.86, y, R * 0.3);
      g.addColorStop(0, withAlpha(col, 0.8));
      g.addColorStop(1, withAlpha(col, 0));
      c.fillStyle = g;
      c.fillRect(R * 0.5, y - R * 0.36, R * 0.72, R * 0.72);
      c.fillStyle = col;
      c.beginPath(); c.arc(R * 0.86, y, R * 0.13, 0, Math.PI * 2); c.fill();
      c.fillStyle = '#ffffff';
      c.beginPath(); c.arc(R * 0.83, y - R * 0.03, R * 0.05, 0, Math.PI * 2); c.fill();
    }
  });
};

/** Straight blade at the side. params: len, w (cleaver width), guard. */
const sword: PartPainter = (ctx, r, spec, pal) => {
  const metal = pal.metal;
  const len = P(spec, 'len', 1.0);
  const w = P(spec, 'w', 0.11);
  place(ctx, r, spec, (c, R) => {
    const y = R * 0.62;
    // Blade: tapered quad.
    c.fillStyle = metal.light;
    c.beginPath();
    c.moveTo(R * 0.1, y - R * w);
    c.lineTo(R * (0.1 + len), y - R * w * 0.35);
    c.lineTo(R * (0.16 + len), y);
    c.lineTo(R * (0.1 + len), y + R * w * 0.35);
    c.lineTo(R * 0.1, y + R * w);
    c.closePath();
    c.fill();
    c.strokeStyle = withAlpha(metal.outline, 0.7);
    c.lineWidth = 1;
    c.stroke();
    // Fuller line.
    c.strokeStyle = withAlpha(metal.shadow, 0.6);
    c.beginPath(); c.moveTo(R * 0.16, y); c.lineTo(R * (len - 0.02), y); c.stroke();
    if (PB(spec, 'guard', true)) {
      c.strokeStyle = pal.wood.base;
      c.lineWidth = Math.max(1.6, R * 0.08);
      c.beginPath(); c.moveTo(R * 0.1, y - R * 0.18); c.lineTo(R * 0.1, y + R * 0.18); c.stroke();
    }
  });
};

/** Paired short blades (rogues) — a mirrored short sword. */
const daggers: PartPainter = (ctx, r, spec, pal) => {
  sword(ctx, r, { ...spec, mirror: true, params: { len: 0.5, w: 0.08, ...(spec.params ?? {}) } }, pal);
};

/** THREE-TINED TRIDENT — pit regalia: a long haft into a crossbar crowned
 *  with a raked fork (legates, tormentors, sea-devils). params: len, w. */
const trident: PartPainter = (ctx, r, spec, pal) => {
  const metal = pal.metal;
  const len = P(spec, 'len', 1.1);
  const w = P(spec, 'w', 0.07);
  place(ctx, r, spec, (c, R) => {
    const y = R * 0.62;
    const bx = R * (len - 0.34);
    // Haft.
    c.strokeStyle = pal.wood.base;
    c.lineWidth = Math.max(1.5, R * w);
    c.beginPath(); c.moveTo(-R * 0.3, y); c.lineTo(bx, y); c.stroke();
    // Crossbar.
    c.strokeStyle = withAlpha(metal.shadow, 0.9);
    c.lineWidth = Math.max(1.3, R * 0.06);
    c.beginPath(); c.moveTo(bx, y - R * 0.2); c.lineTo(bx, y + R * 0.2); c.stroke();
    // The fork: a long center tine, the outer pair raked slightly outward.
    const tine = (dy: number, tl: number, rake: number): void => {
      c.save();
      c.translate(bx, y + dy);
      c.rotate(rake);
      c.fillStyle = metal.light;
      c.beginPath();
      c.moveTo(0, -R * 0.045);
      c.lineTo(R * tl, 0);
      c.lineTo(0, R * 0.045);
      c.closePath();
      c.fill();
      c.strokeStyle = withAlpha(metal.outline, 0.7);
      c.lineWidth = 1;
      c.stroke();
      c.restore();
    };
    tine(-R * 0.19, 0.34, -0.16);
    tine(0, 0.46, 0);
    tine(R * 0.19, 0.34, 0.16);
  });
};

/** Flanged mace at the side. */
const mace: PartPainter = (ctx, r, spec, pal) => {
  const metal = pal.metal;
  place(ctx, r, spec, (c, R) => {
    const y = R * 0.64;
    c.lineCap = 'round';
    c.strokeStyle = pal.wood.base;
    c.lineWidth = Math.max(2, R * 0.1);
    c.beginPath(); c.moveTo(-R * 0.35, y); c.lineTo(R * 0.6, y); c.stroke();
    c.fillStyle = metal.base;
    c.beginPath(); c.arc(R * 0.72, y, R * 0.19, 0, Math.PI * 2); c.fill();
    c.strokeStyle = withAlpha(metal.outline, 0.75);
    c.lineWidth = 1;
    c.stroke();
    c.fillStyle = metal.light;
    for (let i = 0; i < 4; i++) {
      const a = (i / 4) * Math.PI * 2 + 0.4;
      c.beginPath();
      c.arc(R * 0.72 + Math.cos(a) * R * 0.2, y + Math.sin(a) * R * 0.2, R * 0.06, 0, Math.PI * 2);
      c.fill();
    }
  });
};

/** Bearded axe at the side. */
const axe: PartPainter = (ctx, r, spec, pal) => {
  const metal = pal.metal;
  place(ctx, r, spec, (c, R) => {
    const y = R * 0.62;
    c.lineCap = 'round';
    c.strokeStyle = pal.wood.base;
    c.lineWidth = Math.max(2, R * 0.11);
    c.beginPath(); c.moveTo(-R * 0.5, y); c.lineTo(R * 0.66, y); c.stroke();
    c.fillStyle = metal.light;
    c.beginPath();
    c.moveTo(R * 0.62, y - R * 0.08);
    c.quadraticCurveTo(R * 1.05, y - R * 0.3, R * 1.02, y + R * 0.28);
    c.quadraticCurveTo(R * 0.8, y + R * 0.16, R * 0.62, y + R * 0.1);
    c.closePath();
    c.fill();
    c.strokeStyle = withAlpha(metal.outline, 0.7);
    c.lineWidth = 1;
    c.stroke();
  });
};

/** Round or kite shield on the off-side. params: kite. */
const shield: PartPainter = (ctx, r, spec, pal) => {
  const metal = rampFor(spec, pal, 'metal');
  place(ctx, r, spec, (c, R) => {
    const x = R * 0.28, y = -R * 0.7;
    if (PB(spec, 'kite', false)) {
      const trace = (): void => {
        c.beginPath();
        c.moveTo(x + R * 0.32, y);
        c.quadraticCurveTo(x + R * 0.2, y + R * 0.34, x - R * 0.3, y + R * 0.16);
        c.lineTo(x - R * 0.3, y - R * 0.16);
        c.quadraticCurveTo(x + R * 0.2, y - R * 0.34, x + R * 0.32, y);
        c.closePath();
      };
      trace(); c.fillStyle = metal.base; c.fill();
      volume(c, R * 0.32, metal, trace);
      trace(); outlined(c, metal, 1.2);
    } else {
      const trace = (): void => { c.beginPath(); c.arc(x, y, R * 0.34, 0, Math.PI * 2); };
      trace(); c.fillStyle = metal.base; c.fill();
      volume(c, R * 0.34, metal, trace);
      trace(); outlined(c, metal, 1.2);
      c.fillStyle = metal.light;
      c.beginPath(); c.arc(x, y, R * 0.09, 0, Math.PI * 2); c.fill();
    }
  });
};

/** Bow held on the off-side. */
const bow: PartPainter = (ctx, r, spec, pal) => {
  const wood = pal.wood;
  place(ctx, r, spec, (c, R) => {
    const x = R * 0.4, y = -R * 0.62;
    c.lineCap = 'round';
    c.strokeStyle = wood.base;
    c.lineWidth = Math.max(2, R * 0.1);
    c.beginPath();
    c.arc(x - R * 0.3, y, R * 0.62, -Math.PI * 0.32, Math.PI * 0.32);
    c.stroke();
    c.strokeStyle = withAlpha('#e8e4d8', 0.7);
    c.lineWidth = 1;
    const ax = x - R * 0.3 + Math.cos(-Math.PI * 0.32) * R * 0.62;
    const ay = y + Math.sin(-Math.PI * 0.32) * R * 0.62;
    const bx2 = x - R * 0.3 + Math.cos(Math.PI * 0.32) * R * 0.62;
    const by2 = y + Math.sin(Math.PI * 0.32) * R * 0.62;
    c.beginPath(); c.moveTo(ax, ay); c.lineTo(bx2, by2); c.stroke();
  });
};

/** Long gun shouldered on the off-side — wooden stock, slim metal barrel,
 *  lock and muzzle glints where they meet and end. params: len (1 = the
 *  carbine; 1.3+ = the long rifle that outreaches its bearer). */
const musket: PartPainter = (ctx, r, spec, pal) => {
  const wood = rampFor(spec, pal, 'wood');
  const metal = pal.metal;
  const len = P(spec, 'len', 1);
  place(ctx, r, spec, (c, R) => {
    const x = R * 0.42, y = -R * 0.58;
    c.save();
    c.translate(x, y);
    c.rotate(-0.5); // shouldered diagonal, muzzle forward
    c.lineCap = 'round';
    // Stock: the rear reach, thick wood.
    c.strokeStyle = wood.base;
    c.lineWidth = Math.max(2.4, R * 0.16);
    c.beginPath(); c.moveTo(-R * 0.5 * len, 0); c.lineTo(R * 0.12, 0); c.stroke();
    // Barrel: the front reach, slim metal.
    c.strokeStyle = metal.base;
    c.lineWidth = Math.max(1.6, R * 0.09);
    c.beginPath(); c.moveTo(0, 0); c.lineTo(R * 0.85 * len, 0); c.stroke();
    // Muzzle + lock glints.
    c.fillStyle = metal.light;
    c.beginPath(); c.arc(R * 0.85 * len, 0, Math.max(1, R * 0.05), 0, Math.PI * 2); c.fill();
    c.beginPath(); c.arc(R * 0.08, 0, Math.max(1, R * 0.055), 0, Math.PI * 2); c.fill();
    c.restore();
  });
};

// ============================================================ ETHEREAL / FX

/** Glow ring (halos, wards). */
const halo: PartPainter = (ctx, r, spec, pal) => {
  const col = spec.color ?? pal.glow;
  place(ctx, r, spec, (c, R) => {
    c.strokeStyle = withAlpha(col, 0.28);
    c.lineWidth = Math.max(3, R * 0.2);
    c.beginPath(); c.arc(0, 0, R * 0.8, 0, Math.PI * 2); c.stroke();
    c.strokeStyle = withAlpha(col, 0.75);
    c.lineWidth = Math.max(1.2, R * 0.06);
    c.beginPath(); c.arc(0, 0, R * 0.8, 0, Math.PI * 2); c.stroke();
  });
};

/** Orbiting rune marks. params: n. */
const runes: PartPainter = (ctx, r, spec, pal) => {
  const col = spec.color ?? pal.glow;
  const n = Math.round(P(spec, 'n', 4));
  place(ctx, r, spec, (c, R) => {
    c.strokeStyle = withAlpha(col, 0.85);
    c.lineWidth = Math.max(1.2, R * 0.06);
    for (let i = 0; i < n; i++) {
      const a = (i / n) * Math.PI * 2 + hash01(i, 5) * 0.8;
      const x = Math.cos(a) * R * 0.92, y = Math.sin(a) * R * 0.92;
      const s = R * (0.09 + hash01(i, 9) * 0.05);
      c.beginPath();
      c.moveTo(x, y - s); c.lineTo(x + s, y); c.lineTo(x, y + s); c.lineTo(x - s, y);
      c.closePath();
      c.stroke();
    }
  });
};

/** LIVE: trailing spirit streamers swaying behind the body. params: n. */
const wisps: PartPainter = (ctx, r, spec, pal, t = 0) => {
  const col = spec.color ?? pal.glow;
  const n = Math.round(P(spec, 'n', 3));
  place(ctx, r, spec, (c, R) => {
    c.lineCap = 'round';
    for (let i = 0; i < n; i++) {
      const off = (i / Math.max(1, n - 1) - 0.5) * R * 0.9;
      const sway = Math.sin(t * 2.2 + i * 2.1) * R * 0.28;
      const len = R * (1.0 + 0.25 * Math.sin(t * 1.7 + i));
      c.strokeStyle = withAlpha(col, 0.4 - i * 0.06);
      c.lineWidth = Math.max(1.5, R * (0.16 - i * 0.03));
      c.beginPath();
      c.moveTo(-R * 0.3, off);
      c.quadraticCurveTo(-R * 0.75, off + sway * 0.5, -R * 0.3 - len, off + sway);
      c.stroke();
    }
  });
};

/** LIVE: licking flames rising off the body. params: n. */
const flames: PartPainter = (ctx, r, spec, pal, t = 0) => {
  const col = spec.color ?? pal.glow;
  const n = Math.round(P(spec, 'n', 3));
  place(ctx, r, spec, (c, R) => {
    for (let i = 0; i < n; i++) {
      const a = (i / n) * Math.PI * 2 + t * 0.6;
      const x = Math.cos(a) * R * 0.45;
      const y = Math.sin(a) * R * 0.45;
      const lick = R * (0.3 + 0.18 * Math.sin(t * 6 + i * 2.4));
      c.fillStyle = withAlpha(col, 0.5 + 0.2 * Math.sin(t * 8 + i));
      c.beginPath();
      c.ellipse(x, y, R * 0.14, lick, a + Math.PI / 2, 0, Math.PI * 2);
      c.fill();
      c.fillStyle = withAlpha('#ffe9b8', 0.4);
      c.beginPath();
      c.ellipse(x, y, R * 0.06, lick * 0.55, a + Math.PI / 2, 0, Math.PI * 2);
      c.fill();
    }
  });
};

/** EMBER SPARKS — live motes that break off the body and gutter out as they
 *  drift (the Legion's cinder-breath; `flames` licks, this SHEDS).
 *  params: n, drift (body-radii traveled over a mote's life). */
const emberSparks: PartPainter = (ctx, r, spec, pal, t = 0) => {
  const col = spec.color ?? pal.glow;
  const n = Math.round(P(spec, 'n', 5));
  const drift = P(spec, 'drift', 0.9);
  place(ctx, r, spec, (c, R) => {
    for (let i = 0; i < n; i++) {
      const cycle = 1.1 + hash01(i, 41) * 0.9;
      const ph = ((t / cycle) + hash01(i, 43)) % 1;
      const a = hash01(i, 47) * Math.PI * 2 + ph * 0.8;
      const d = R * (0.35 + ph * drift);
      const x = Math.cos(a) * d, y = Math.sin(a) * d;
      const fade = 1 - ph;
      c.fillStyle = withAlpha(col, 0.65 * fade);
      c.beginPath(); c.arc(x, y, Math.max(0.8, R * 0.09 * fade), 0, Math.PI * 2); c.fill();
      c.fillStyle = withAlpha('#ffe9b8', 0.5 * fade * fade);
      c.beginPath(); c.arc(x, y, Math.max(0.5, R * 0.045 * fade), 0, Math.PI * 2); c.fill();
    }
  });
};

/** PUFF MOTES — live spore-dust drifting off the body: slower and floatier
 *  than emberSparks, no hot core, swelling faintly before they fade (the
 *  Bloom's breath). params: n, drift. */
const puffMotes: PartPainter = (ctx, r, spec, pal, t = 0) => {
  const col = spec.color ?? pal.accent.light;
  const n = Math.round(P(spec, 'n', 4));
  const drift = P(spec, 'drift', 0.7);
  place(ctx, r, spec, (c, R) => {
    for (let i = 0; i < n; i++) {
      const cycle = 2.4 + hash01(i, 137) * 1.6;
      const ph = ((t / cycle) + hash01(i, 139)) % 1;
      const a = hash01(i, 149) * Math.PI * 2 + Math.sin(t * 0.7 + i) * 0.3;
      const d = R * (0.4 + ph * drift);
      const x = Math.cos(a) * d, y = Math.sin(a) * d;
      const swell = Math.sin(ph * Math.PI); // grows, then thins away
      c.fillStyle = withAlpha(col, 0.4 * swell);
      c.beginPath(); c.arc(x, y, Math.max(0.8, R * 0.11 * swell), 0, Math.PI * 2); c.fill();
    }
  });
};

// ============================================================== NATURE KIT

/** Plated dome shell. */
const shell: PartPainter = (ctx, r, spec, pal) => {
  const ramp = rampFor(spec, pal, 'base');
  place(ctx, r, spec, (c, R) => {
    const trace = (): void => { c.beginPath(); c.arc(0, 0, R, 0, Math.PI * 2); };
    trace(); c.fillStyle = ramp.base; c.fill();
    volume(c, R, ramp, trace);
    c.save(); trace(); c.clip();
    c.strokeStyle = withAlpha(ramp.shadow, 0.55);
    c.lineWidth = Math.max(1.2, R * 0.07);
    for (let i = 0; i < 6; i++) {
      const a = (i / 6) * Math.PI * 2;
      c.beginPath(); c.moveTo(0, 0); c.lineTo(Math.cos(a) * R, Math.sin(a) * R); c.stroke();
    }
    c.beginPath(); c.arc(0, 0, R * 0.55, 0, Math.PI * 2); c.stroke();
    c.restore();
    trace(); outlined(c, ramp, 1.6);
  });
};

/** Mushroom cap cluster. params: n. */
const caps: PartPainter = (ctx, r, spec, pal) => {
  const ramp = rampFor(spec, pal, 'accent');
  const n = Math.round(P(spec, 'n', 3));
  place(ctx, r, spec, (c, R) => {
    for (let i = 0; i < n; i++) {
      const a = hash01(i, 3) * Math.PI * 2;
      const d = hash01(i, 11) * R * 0.5;
      const cr = R * (0.3 + hash01(i, 17) * 0.28);
      const x = Math.cos(a) * d, y = Math.sin(a) * d;
      c.fillStyle = i % 2 ? ramp.base : shade(ramp.base, -0.12);
      c.beginPath(); c.arc(x, y, cr, 0, Math.PI * 2); c.fill();
      c.strokeStyle = withAlpha(ramp.outline, 0.6);
      c.lineWidth = 1.2;
      c.stroke();
      c.fillStyle = withAlpha(ramp.highlight, 0.65);
      for (let k = 0; k < 3; k++) {
        c.beginPath();
        c.arc(x + (hash01(k, i * 7) - 0.5) * cr, y + (hash01(k, i * 13) - 0.5) * cr, cr * 0.14, 0, Math.PI * 2);
        c.fill();
      }
    }
  });
};

/** THE MUSHROOM CAP — one broad dome worn as the body's crown: rim ring,
 *  pale spots, a dented top. `caps` scatters button-clusters; this is the
 *  single load-bearing silhouette of the cap-folk. params: spots, squash. */
const capDome: PartPainter = (ctx, r, spec, pal) => {
  const ramp = rampFor(spec, pal, 'accent');
  const spots = Math.round(P(spec, 'spots', 5));
  const squash = P(spec, 'squash', 0.86);
  place(ctx, r, spec, (c, R) => {
    const trace = (): void => {
      c.beginPath(); c.ellipse(0, 0, R, R * squash, 0, 0, Math.PI * 2);
    };
    trace(); c.fillStyle = ramp.base; c.fill();
    volume(c, R, ramp, trace);
    // Rim ring — the cap's underside peeking past the dome.
    c.strokeStyle = withAlpha(ramp.shadow, 0.8);
    c.lineWidth = Math.max(1.4, R * 0.09);
    trace(); c.stroke();
    // Spots: pale flecks, denser toward the crown.
    c.fillStyle = withAlpha(ramp.highlight, 0.75);
    for (let i = 0; i < spots; i++) {
      const a = hash01(i, 23) * Math.PI * 2;
      const d = Math.sqrt(hash01(i, 29)) * R * 0.7;
      const sr = R * (0.08 + hash01(i, 31) * 0.09);
      c.beginPath();
      c.ellipse(Math.cos(a) * d, Math.sin(a) * d * squash, sr, sr * 0.8, a, 0, Math.PI * 2);
      c.fill();
    }
    // The dent — one soft crease so the dome reads domed, not flat.
    c.strokeStyle = withAlpha(ramp.shadow, 0.45);
    c.lineWidth = Math.max(1, R * 0.05);
    c.beginPath(); c.arc(R * 0.12, 0, R * 0.4, -0.9, 0.9); c.stroke();
  });
};

/** GILL FRILL — radial gill-lines fanning out past a cap's rim (drawn UNDER
 *  a capDome placed after it). params: n. */
const gillFrill: PartPainter = (ctx, r, spec, pal) => {
  const ramp = rampFor(spec, pal, 'bone');
  const n = Math.round(P(spec, 'n', 14));
  place(ctx, r, spec, (c, R) => {
    c.strokeStyle = withAlpha(ramp.shadow, 0.75);
    c.lineWidth = Math.max(1, R * 0.05);
    for (let i = 0; i < n; i++) {
      const a = (i / n) * Math.PI * 2;
      c.beginPath();
      c.moveTo(Math.cos(a) * R * 0.55, Math.sin(a) * R * 0.55);
      c.lineTo(Math.cos(a) * R * 1.0, Math.sin(a) * R * 1.0);
      c.stroke();
    }
    c.strokeStyle = withAlpha(ramp.base, 0.5);
    c.beginPath(); c.arc(0, 0, R * 0.98, 0, Math.PI * 2); c.stroke();
  });
};

/** BARK PLATES — rough slabs with dark seams over a trunk-body; the treant
 *  hide (crocodile scutes read wet, these read GRAIN). params: n. */
const barkPlates: PartPainter = (ctx, r, spec, pal) => {
  const ramp = rampFor(spec, pal, 'wood');
  const n = Math.round(P(spec, 'n', 6));
  place(ctx, r, spec, (c, R) => {
    c.save();
    c.beginPath(); c.arc(0, 0, R, 0, Math.PI * 2); c.clip();
    for (let i = 0; i < n; i++) {
      const x = (hash01(i, 53) - 0.5) * R * 1.5;
      const y = (hash01(i, 59) - 0.5) * R * 1.5;
      const w = R * (0.3 + hash01(i, 61) * 0.3);
      const h = R * (0.45 + hash01(i, 67) * 0.4);
      const rot = (hash01(i, 71) - 0.5) * 0.5;
      c.save();
      c.translate(x, y); c.rotate(rot);
      c.fillStyle = shade(ramp.base, (hash01(i, 73) - 0.5) * 0.16);
      c.beginPath();
      // A slab with clipped corners — bark, not brick.
      c.moveTo(-w / 2 + w * 0.12, -h / 2);
      c.lineTo(w / 2, -h / 2 + h * 0.1);
      c.lineTo(w / 2 - w * 0.1, h / 2);
      c.lineTo(-w / 2, h / 2 - h * 0.12);
      c.closePath(); c.fill();
      c.strokeStyle = withAlpha(ramp.outline, 0.65);
      c.lineWidth = Math.max(1, R * 0.05);
      c.stroke();
      // One grain line down the slab.
      c.strokeStyle = withAlpha(ramp.shadow, 0.5);
      c.beginPath(); c.moveTo(-w * 0.1, -h * 0.4); c.lineTo(w * 0.06, h * 0.42); c.stroke();
      c.restore();
    }
    c.restore();
  });
};

/** BRANCH ARMS — a forking bough swept forward, twigs off the elbow; mirror
 *  for the pair. The treant's reach. params: forks, len. */
const branchArms: PartPainter = (ctx, r, spec, pal) => {
  const ramp = rampFor(spec, pal, 'wood');
  const forks = Math.round(P(spec, 'forks', 3));
  const len = P(spec, 'len', 1.15);
  place(ctx, r, spec, (c, R) => {
    c.lineCap = 'round';
    const ex = R * len * 0.62, ey = R * 0.62; // the elbow
    c.strokeStyle = ramp.base;
    c.lineWidth = Math.max(2, R * 0.14);
    c.beginPath();
    c.moveTo(R * 0.1, R * 0.35);
    c.quadraticCurveTo(R * 0.45, R * 0.72, ex, ey);
    c.stroke();
    for (let i = 0; i < forks; i++) {
      const a = -0.5 + (i / Math.max(1, forks - 1)) * 1.0 + (hash01(i, 79) - 0.5) * 0.3;
      const tl = R * (0.3 + hash01(i, 83) * 0.22);
      c.lineWidth = Math.max(1.2, R * 0.07);
      c.strokeStyle = i % 2 ? ramp.base : ramp.shadow;
      c.beginPath();
      c.moveTo(ex, ey);
      c.lineTo(ex + Math.cos(a) * tl, ey + Math.sin(a) * tl * 0.6);
      c.stroke();
    }
  });
};

/** STALACTITE CROWN — a ring of rock fangs jutting from the rim; the "that
 *  boulder just moved" silhouette. params: n. */
const stalactites: PartPainter = (ctx, r, spec, pal) => {
  const ramp = rampFor(spec, pal, 'base');
  const n = Math.round(P(spec, 'n', 6));
  place(ctx, r, spec, (c, R) => {
    for (let i = 0; i < n; i++) {
      const a = (i / n) * Math.PI * 2 + hash01(i, 89) * 0.5;
      const base = R * 0.6;
      const tipLen = R * (0.4 + hash01(i, 97) * 0.35);
      const w = R * (0.14 + hash01(i, 101) * 0.1);
      const bx = Math.cos(a) * base, by = Math.sin(a) * base;
      const tx = Math.cos(a) * (base + tipLen), ty = Math.sin(a) * (base + tipLen);
      c.fillStyle = shade(ramp.base, (hash01(i, 103) - 0.5) * 0.2);
      c.beginPath();
      c.moveTo(bx + Math.cos(a + Math.PI / 2) * w, by + Math.sin(a + Math.PI / 2) * w);
      c.lineTo(tx, ty);
      c.lineTo(bx - Math.cos(a + Math.PI / 2) * w, by - Math.sin(a + Math.PI / 2) * w);
      c.closePath(); c.fill();
      c.strokeStyle = withAlpha(ramp.outline, 0.6);
      c.lineWidth = 1;
      c.stroke();
    }
  });
};

/** NEST TWIGS — a woven ring of crosshatched sticks; every rookery's rim.
 *  params: n. */
const nestTwigs: PartPainter = (ctx, r, spec, pal) => {
  const ramp = rampFor(spec, pal, 'wood');
  const n = Math.round(P(spec, 'n', 18));
  place(ctx, r, spec, (c, R) => {
    c.lineCap = 'round';
    for (let i = 0; i < n; i++) {
      const a = (i / n) * Math.PI * 2 + hash01(i, 107) * 0.4;
      const lean = (hash01(i, 109) - 0.5) * 1.4;
      const d0 = R * (0.62 + hash01(i, 113) * 0.14);
      const len = R * (0.3 + hash01(i, 127) * 0.2);
      c.strokeStyle = shade(ramp.base, (hash01(i, 131) - 0.5) * 0.24);
      c.lineWidth = Math.max(1.1, R * 0.055);
      c.beginPath();
      c.moveTo(Math.cos(a) * d0 - Math.cos(a + lean) * len * 0.5,
        Math.sin(a) * d0 - Math.sin(a + lean) * len * 0.5);
      c.lineTo(Math.cos(a) * d0 + Math.cos(a + lean) * len * 0.5,
        Math.sin(a) * d0 + Math.sin(a + lean) * len * 0.5);
      c.stroke();
    }
    // The bowl shadow.
    c.fillStyle = withAlpha(ramp.shadow, 0.35);
    c.beginPath(); c.arc(0, 0, R * 0.5, 0, Math.PI * 2); c.fill();
  });
};

/** Leafy sprigs fanning off the back. params: n. */
const fronds: PartPainter = (ctx, r, spec, pal) => {
  const ramp = rampFor(spec, pal, 'accent');
  const n = Math.round(P(spec, 'n', 5));
  place(ctx, r, spec, (c, R) => {
    c.lineCap = 'round';
    for (let i = 0; i < n; i++) {
      const a = Math.PI + (i / (n - 1) - 0.5) * 1.6;
      c.strokeStyle = withAlpha(i % 2 ? ramp.base : ramp.shadow, 0.9);
      c.lineWidth = Math.max(1.6, R * 0.1);
      c.beginPath();
      c.moveTo(Math.cos(a) * R * 0.5, Math.sin(a) * R * 0.5);
      c.quadraticCurveTo(
        Math.cos(a) * R * 1.0, Math.sin(a) * R * 1.0 + R * 0.1,
        Math.cos(a) * R * 1.35, Math.sin(a) * R * 1.35);
      c.stroke();
    }
  });
};

/** Tapering tail curve behind. params: len, tuft. */
const tail: PartPainter = (ctx, r, spec, pal) => {
  const ramp = rampFor(spec, pal, 'base');
  const len = P(spec, 'len', 0.9);
  place(ctx, r, spec, (c, R) => {
    c.lineCap = 'round';
    const steps: [number, number][] = [[0.18, 0], [0.12, 0.5], [0.07, 1]];
    for (const [w, f] of steps) {
      c.strokeStyle = f > 0.6 ? shade(ramp.base, -0.1) : ramp.base;
      c.lineWidth = Math.max(1.5, R * w);
      c.beginPath();
      c.moveTo(-R * (0.75 + f * len * 0.2), Math.sin(f * 2) * R * 0.12);
      c.quadraticCurveTo(
        -R * (0.9 + f * len * 0.5), R * 0.22,
        -R * (0.85 + len * (0.35 + f * 0.65)), Math.sin(f * 3) * R * 0.25);
      c.stroke();
    }
    if (PB(spec, 'tuft', false)) {
      c.fillStyle = shade(ramp.base, -0.18);
      c.beginPath();
      c.arc(-R * (0.85 + len), Math.sin(3) * R * 0.25, R * 0.14, 0, Math.PI * 2);
      c.fill();
    }
  });
};

/** Sharp stinger tip on a curled tail. */
const stinger: PartPainter = (ctx, r, spec, pal) => {
  const ramp = rampFor(spec, pal, 'base');
  place(ctx, r, spec, (c, R) => {
    c.lineCap = 'round';
    c.strokeStyle = ramp.base;
    c.lineWidth = Math.max(2, R * 0.14);
    c.beginPath();
    c.moveTo(-R * 0.7, 0);
    c.quadraticCurveTo(-R * 1.5, R * 0.15, -R * 1.55, -R * 0.4);
    c.stroke();
    c.fillStyle = shade(ramp.base, 0.2);
    c.beginPath();
    c.moveTo(-R * 1.55, -R * 0.4);
    c.lineTo(-R * 1.35, -R * 0.62);
    c.lineTo(-R * 1.42, -R * 0.3);
    c.closePath();
    c.fill();
  });
};

/** Swept side fins (the deep). */
const fins: PartPainter = (ctx, r, spec, pal) => {
  const ramp = rampFor(spec, pal, 'base');
  place(ctx, r, spec, (c, R) => {
    for (const side of [-1, 1]) {
      c.fillStyle = withAlpha(ramp.base, 0.85);
      c.beginPath();
      c.moveTo(R * 0.1, side * R * 0.7);
      c.quadraticCurveTo(-R * 0.4, side * R * 1.5, -R * 0.95, side * R * 1.1);
      c.quadraticCurveTo(-R * 0.5, side * R * 0.85, -R * 0.35, side * R * 0.6);
      c.closePath();
      c.fill();
      outlined(c, ramp, 1.1);
      c.strokeStyle = withAlpha(ramp.shadow, 0.5);
      c.lineWidth = 1;
      c.beginPath();
      c.moveTo(-R * 0.05, side * R * 0.72);
      c.lineTo(-R * 0.7, side * R * 1.12);
      c.stroke();
    }
  });
};

// =================================================================== GEAR

/** Work apron across the front (smiths, keeps). */
const apron: PartPainter = (ctx, r, spec, pal) => {
  const ramp = rampFor(spec, pal, 'cloth');
  place(ctx, r, spec, (c, R) => {
    c.fillStyle = shade(ramp.base, 0.06);
    c.beginPath();
    c.moveTo(R * 0.6, -R * 0.36);
    c.lineTo(R * 0.62, R * 0.36);
    c.quadraticCurveTo(R * 0.2, R * 0.5, -R * 0.05, R * 0.36);
    c.lineTo(-R * 0.05, -R * 0.36);
    c.quadraticCurveTo(R * 0.2, -R * 0.5, R * 0.6, -R * 0.36);
    c.closePath();
    c.fill();
    outlined(c, ramp, 1.2);
    c.strokeStyle = withAlpha(ramp.shadow, 0.6);
    c.lineWidth = 1;
    c.beginPath(); c.moveTo(R * 0.25, -R * 0.4); c.lineTo(R * 0.25, R * 0.4); c.stroke();
  });
};

/** Carried bundle on the back (caravanners, delvers). */
const pack: PartPainter = (ctx, r, spec, pal) => {
  const ramp = rampFor(spec, pal, 'wood');
  place(ctx, r, spec, (c, R) => {
    const trace = (): void => {
      c.beginPath();
      c.moveTo(-R * 0.35, -R * 0.5);
      c.lineTo(-R * 1.0, -R * 0.42);
      c.quadraticCurveTo(-R * 1.12, 0, -R * 1.0, R * 0.42);
      c.lineTo(-R * 0.35, R * 0.5);
      c.closePath();
    };
    trace(); c.fillStyle = ramp.base; c.fill();
    volume(c, R * 0.6, ramp, trace);
    trace(); outlined(c, ramp, 1.3);
    c.strokeStyle = withAlpha(pal.cloth.shadow, 0.8);
    c.lineWidth = Math.max(1.4, R * 0.08);
    c.beginPath(); c.moveTo(-R * 0.68, -R * 0.46); c.lineTo(-R * 0.68, R * 0.46); c.stroke();
  });
};

/** A held lantern with its warm burn (delvers). */
const lantern: PartPainter = (ctx, r, spec, pal) => {
  const col = spec.color ?? '#ffd898';
  place(ctx, r, spec, (c, R) => {
    const x = R * 0.55, y = R * 0.68;
    const g = c.createRadialGradient(x, y, 0, x, y, R * 0.5);
    g.addColorStop(0, withAlpha(col, 0.55));
    g.addColorStop(1, withAlpha(col, 0));
    c.fillStyle = g;
    c.fillRect(x - R * 0.5, y - R * 0.5, R, R);
    c.fillStyle = '#2c2013';
    c.fillRect(x - R * 0.09, y - R * 0.13, R * 0.18, R * 0.26);
    c.fillStyle = col;
    c.fillRect(x - R * 0.05, y - R * 0.08, R * 0.1, R * 0.16);
  });
};

/** BAKED curling tentacle ring (eldritch bodies; the live adorn still
 *  writhes — this is anatomy, not corruption). params: n, len. */
const tentacleRing: PartPainter = (ctx, r, spec, pal) => {
  const ramp = rampFor(spec, pal, 'base');
  const n = Math.round(P(spec, 'n', 6));
  const len = P(spec, 'len', 1.5);
  place(ctx, r, spec, (c, R) => {
    c.lineCap = 'round';
    for (let i = 0; i < n; i++) {
      const a = (i / n) * Math.PI * 2 + 0.3;
      const curl = (i % 2 ? 1 : -1) * 0.55;
      c.strokeStyle = i % 2 ? ramp.base : shade(ramp.base, -0.12);
      c.lineWidth = Math.max(2, R * 0.14);
      c.beginPath();
      c.moveTo(Math.cos(a) * R * 0.65, Math.sin(a) * R * 0.65);
      c.quadraticCurveTo(
        Math.cos(a + curl * 0.4) * R * len * 0.7, Math.sin(a + curl * 0.4) * R * len * 0.7,
        Math.cos(a + curl) * R * len, Math.sin(a + curl) * R * len);
      c.stroke();
      // Sucker dots down the arm.
      c.fillStyle = withAlpha(ramp.highlight, 0.5);
      const sx = Math.cos(a + curl * 0.5) * R * len * 0.62;
      const sy = Math.sin(a + curl * 0.5) * R * len * 0.62;
      c.beginPath(); c.arc(sx, sy, R * 0.05, 0, Math.PI * 2); c.fill();
    }
  });
};

/** A CARVED GOURD HEAD — the Carven Court's face: a ribbed pumpkin sphere,
 *  triangle eyes and a saw grin cut through to the candle (pal.glow or
 *  spec.color). params: grin 'saw'|'calm' (the king smiles differently),
 *  lit (false = the carving without the candle). */
const gourdHead: PartPainter = (ctx, r, spec, pal) => {
  const ramp = rampFor(spec, pal, 'base');
  const glow = spec.color ?? pal.glow;
  const calm = PS(spec, 'grin') === 'calm';
  const lit = PB(spec, 'lit', true);
  place(ctx, r, spec, (c, R) => {
    const trace = (): void => { c.beginPath(); c.ellipse(0, 0, R, R * 0.88, 0, 0, Math.PI * 2); };
    trace(); c.fillStyle = ramp.base; c.fill();
    volume(c, R, ramp, trace);
    // Rib seams over the sphere.
    c.strokeStyle = withAlpha(ramp.shadow, 0.8);
    c.lineWidth = Math.max(1, R * 0.06);
    for (let s = -1; s <= 1; s++) {
      c.beginPath();
      c.ellipse(s * R * 0.36, 0, R * 0.3, R * 0.84, 0, -1.2, 1.2);
      c.stroke();
    }
    // The stem, kinked forward of the crown.
    c.strokeStyle = shade(ramp.base, -0.45);
    c.lineWidth = Math.max(1.5, R * 0.12);
    c.beginPath();
    c.moveTo(-R * 0.05, -R * 0.8);
    c.lineTo(R * 0.12, -R * 1.05);
    c.stroke();
    // The carving: what the knife let out.
    const ink = lit ? glow : ramp.shadow;
    c.fillStyle = lit ? withAlpha(ink, 0.95) : withAlpha(ink, 0.9);
    const e = R * 0.22;
    c.beginPath();
    c.moveTo(-e * 1.5, -e * 0.3); c.lineTo(-e * 0.5, -e * 0.3); c.lineTo(-e, -e * 1.2); c.closePath();
    c.moveTo(e * 1.5, -e * 0.3); c.lineTo(e * 0.5, -e * 0.3); c.lineTo(e, -e * 1.2); c.closePath();
    c.fill();
    if (calm) {
      // The calm grin: one thin unbroken crescent — worse, somehow.
      c.strokeStyle = withAlpha(ink, 0.95);
      c.lineWidth = Math.max(1.5, R * 0.1);
      c.beginPath();
      c.arc(0, e * 0.4, R * 0.5, 0.35, Math.PI - 0.35);
      c.stroke();
    } else {
      for (let t = 0; t < 4; t++) {
        c.fillRect(-e * 1.7 + t * e * 0.9, e * (t % 2 ? 0.55 : 0.8), e * 0.6, e * 0.5);
      }
    }
  });
};

/** SPLAYED STRAW LIMBS — the scarecrow's cross-frame: pole arms flung wide,
 *  straw bursting from the wrists and collar. params: droop (arm sag). */
const strawLimbs: PartPainter = (ctx, r, spec, pal) => {
  const ramp = rampFor(spec, pal, 'wood');
  const straw = shade(pal.cloth.light, 0.1);
  const droop = P(spec, 'droop', 0.18);
  place(ctx, r, spec, (c, R) => {
    c.lineCap = 'round';
    // The cross-pole: both arms in one bowed stroke.
    c.strokeStyle = ramp.base;
    c.lineWidth = Math.max(2, R * 0.14);
    c.beginPath();
    c.moveTo(-R * 0.15, -R * 1.15);
    c.quadraticCurveTo(0, -R * (1.15 - droop) * 0.4, -R * 0.15, R * 1.15);
    c.stroke();
    // Straw fans at the wrists and the collar knot.
    c.strokeStyle = withAlpha(straw, 0.9);
    c.lineWidth = Math.max(1, R * 0.05);
    for (const wy of [-1.15, 1.15]) {
      for (let i = 0; i < 4; i++) {
        const a = (i - 1.5) * 0.35 + (wy < 0 ? -Math.PI / 2 : Math.PI / 2);
        c.beginPath();
        c.moveTo(-R * 0.15, R * wy);
        c.lineTo(-R * 0.15 + Math.cos(a) * R * 0.34, R * wy + Math.sin(a) * R * 0.34);
        c.stroke();
      }
    }
    c.beginPath();
    c.arc(0, 0, R * 0.16, 0, Math.PI * 2);
    c.strokeStyle = shade(ramp.base, -0.25);
    c.lineWidth = Math.max(1.5, R * 0.1);
    c.stroke();
  });
};

/** A floating glowing core — rift hearts, wisp bodies, construct nuclei. */
const orb: PartPainter = (ctx, r, spec, pal) => {
  const col = spec.color ?? pal.glow;
  place(ctx, r, spec, (c, R) => {
    const g = c.createRadialGradient(0, 0, 0, 0, 0, R * 0.9);
    g.addColorStop(0, withAlpha(col, 0.75));
    g.addColorStop(0.5, withAlpha(col, 0.25));
    g.addColorStop(1, withAlpha(col, 0));
    c.fillStyle = g;
    c.fillRect(-R, -R, R * 2, R * 2);
    c.fillStyle = col;
    c.beginPath(); c.arc(0, 0, R * 0.32, 0, Math.PI * 2); c.fill();
    c.fillStyle = '#ffffff';
    c.beginPath(); c.arc(-R * 0.08, -R * 0.08, R * 0.12, 0, Math.PI * 2); c.fill();
    c.strokeStyle = withAlpha(col, 0.6);
    c.lineWidth = Math.max(1, R * 0.05);
    c.beginPath(); c.arc(0, 0, R * 0.5, 0.4, 2.4); c.stroke();
  });
};

/** Chunky crab pincers held forward — unmistakably crustacean. */
const pincers: PartPainter = (ctx, r, spec, pal) => {
  const ramp = rampFor(spec, pal, 'base');
  place(ctx, r, spec, (c, R) => {
    for (const side of [-1, 1]) {
      const bx = R * 0.55, by = side * R * 0.75;
      // Arm.
      c.strokeStyle = shade(ramp.base, -0.1);
      c.lineWidth = Math.max(2.5, R * 0.16);
      c.lineCap = 'round';
      c.beginPath();
      c.moveTo(R * 0.15, side * R * 0.55);
      c.lineTo(bx, by);
      c.stroke();
      // The claw: two opposing crescents.
      c.fillStyle = ramp.base;
      c.beginPath();
      c.moveTo(bx, by);
      c.quadraticCurveTo(bx + R * 0.55, by - side * R * 0.05, bx + R * 0.62, by - side * R * 0.3);
      c.quadraticCurveTo(bx + R * 0.3, by - side * R * 0.22, bx, by);
      c.closePath(); c.fill();
      outlined(c, ramp, 1.1);
      c.fillStyle = shade(ramp.base, -0.12);
      c.beginPath();
      c.moveTo(bx + R * 0.05, by + side * R * 0.05);
      c.quadraticCurveTo(bx + R * 0.5, by + side * R * 0.18, bx + R * 0.55, by + side * R * 0.05);
      c.quadraticCurveTo(bx + R * 0.28, by - side * R * 0.02, bx + R * 0.05, by + side * R * 0.05);
      c.closePath(); c.fill();
    }
  });
};

/** Paired feelers sweeping forward. */
const antennae: PartPainter = (ctx, r, spec, pal) => {
  const ramp = rampFor(spec, pal, 'base');
  place(ctx, r, spec, (c, R) => {
    c.lineCap = 'round';
    c.strokeStyle = shade(ramp.base, 0.08);
    c.lineWidth = Math.max(1.2, R * 0.06);
    for (const side of [-1, 1]) {
      c.beginPath();
      c.moveTo(R * 0.5, side * R * 0.2);
      c.quadraticCurveTo(R * 1.1, side * R * 0.3, R * 1.35, side * R * 0.7);
      c.stroke();
      c.fillStyle = shade(ramp.base, 0.2);
      c.beginPath();
      c.arc(R * 1.35, side * R * 0.7, R * 0.07, 0, Math.PI * 2);
      c.fill();
    }
  });
};

/** ARACHNID LEGS: paired arcs reaching out and forward — the spider read.
 *  params: pairs, or n = total legs (pairs wins if both); len = reach mult. */
const legs: PartPainter = (ctx, r, spec, pal) => {
  const ramp = rampFor(spec, pal, 'base');
  const pairs = Math.round(P(spec, 'pairs', P(spec, 'n', 8) / 2));
  const len = P(spec, 'len', 1);
  place(ctx, r, spec, (c, R) => {
    c.lineCap = 'round';
    const reach = R * len;
    for (let i = 0; i < pairs; i++) {
      const t = pairs === 1 ? 0.5 : i / (pairs - 1);
      const a0 = 0.9 - t * 1.9; // fan from forward to back
      for (const side of [-1, 1]) {
        const ang = side * a0 * -1 + (side < 0 ? Math.PI : 0);
        const bx = Math.cos(ang) * reach * 0.7, by = Math.sin(ang) * reach * 0.7;
        const kx = Math.cos(ang) * reach * 1.35, ky = Math.sin(ang) * reach * 1.35 - R * 0.12;
        const tx = Math.cos(ang) * reach * 1.7, ty = Math.sin(ang) * reach * 1.7 + R * 0.22;
        c.strokeStyle = i % 2 ? ramp.base : shade(ramp.base, -0.14);
        c.lineWidth = Math.max(1.6, R * 0.09);
        c.beginPath();
        c.moveTo(bx, by);
        c.quadraticCurveTo(kx, ky, tx, ty);
        c.stroke();
      }
    }
  });
};

/** A rallying banner: pole + waving flag in the accent. */
const banner: PartPainter = (ctx, r, spec, pal) => {
  const flag = rampFor(spec, pal, 'accent');
  place(ctx, r, spec, (c, R) => {
    const x = -R * 0.35, y = -R * 0.62;
    c.lineCap = 'round';
    c.strokeStyle = pal.wood.base;
    c.lineWidth = Math.max(2, R * 0.09);
    c.beginPath(); c.moveTo(x - R * 0.4, y); c.lineTo(x + R * 0.9, y); c.stroke();
    c.fillStyle = flag.base;
    c.beginPath();
    c.moveTo(x + R * 0.9, y);
    c.quadraticCurveTo(x + R * 0.75, y + R * 0.35, x + R * 0.85, y + R * 0.62);
    c.lineTo(x + R * 0.35, y + R * 0.5);
    c.quadraticCurveTo(x + R * 0.45, y + R * 0.2, x + R * 0.35, y);
    c.closePath(); c.fill();
    outlined(c, flag, 1.1);
  });
};

/** A two-handed maul — haft across, massive head. */
const hammer: PartPainter = (ctx, r, spec, pal) => {
  const metal = pal.metal;
  place(ctx, r, spec, (c, R) => {
    const y = R * 0.66;
    c.lineCap = 'round';
    c.strokeStyle = pal.wood.base;
    c.lineWidth = Math.max(2.2, R * 0.12);
    c.beginPath(); c.moveTo(-R * 0.6, y); c.lineTo(R * 0.68, y); c.stroke();
    const trace = (): void => {
      c.beginPath();
      c.rect(R * 0.55, y - R * 0.3, R * 0.42, R * 0.6);
    };
    trace(); c.fillStyle = metal.base; c.fill();
    volume(c, R * 0.35, metal, trace);
    trace(); outlined(c, metal, 1.3);
    c.strokeStyle = withAlpha(metal.highlight, 0.6);
    c.lineWidth = 1;
    c.beginPath(); c.moveTo(R * 0.6, y - R * 0.22); c.lineTo(R * 0.92, y - R * 0.22); c.stroke();
  });
};

/** A held open tome — ritualists and scholars. */
const book: PartPainter = (ctx, r, spec, pal) => {
  const cover = rampFor(spec, pal, 'accent');
  place(ctx, r, spec, (c, R) => {
    const x = R * 0.58, y = R * 0.55;
    c.save();
    c.translate(x, y);
    c.rotate(0.3);
    c.fillStyle = cover.base;
    c.fillRect(-R * 0.3, -R * 0.22, R * 0.6, R * 0.44);
    c.fillStyle = '#e8e2d0';
    c.fillRect(-R * 0.25, -R * 0.17, R * 0.5, R * 0.34);
    c.strokeStyle = withAlpha(cover.outline, 0.8);
    c.lineWidth = 1;
    c.strokeRect(-R * 0.3, -R * 0.22, R * 0.6, R * 0.44);
    c.beginPath(); c.moveTo(0, -R * 0.17); c.lineTo(0, R * 0.17); c.stroke();
    c.strokeStyle = withAlpha('#8a8474', 0.7);
    for (const off of [-0.09, 0, 0.09]) {
      c.beginPath(); c.moveTo(-R * 0.2, off * R); c.lineTo(-R * 0.05, off * R); c.stroke();
      c.beginPath(); c.moveTo(R * 0.05, off * R); c.lineTo(R * 0.2, off * R); c.stroke();
    }
    c.restore();
  });
};

/** An inset power gem — golem cores, caches, menhirs. */
const gem: PartPainter = (ctx, r, spec, pal) => {
  const col = spec.color ?? pal.glow;
  place(ctx, r, spec, (c, R) => {
    const s = R * 0.3;
    const g = c.createRadialGradient(0, 0, 0, 0, 0, s * 2.2);
    g.addColorStop(0, withAlpha(col, 0.5));
    g.addColorStop(1, withAlpha(col, 0));
    c.fillStyle = g;
    c.fillRect(-s * 2.2, -s * 2.2, s * 4.4, s * 4.4);
    c.fillStyle = col;
    c.beginPath();
    c.moveTo(0, -s); c.lineTo(s * 0.8, 0); c.lineTo(0, s); c.lineTo(-s * 0.8, 0);
    c.closePath(); c.fill();
    c.strokeStyle = withAlpha('#ffffff', 0.65);
    c.lineWidth = Math.max(1, s * 0.16);
    c.beginPath(); c.moveTo(-s * 0.3, -s * 0.35); c.lineTo(s * 0.15, -s * 0.1); c.stroke();
  });
};

/** Segmented armor strips across the torso — heavy plate reads at a glance. */
const armorPlates: PartPainter = (ctx, r, spec, pal) => {
  const ramp = rampFor(spec, pal, 'metal');
  const n = Math.round(P(spec, 'n', 3));
  place(ctx, r, spec, (c, R) => {
    for (let i = 0; i < n; i++) {
      const x = R * 0.28 - (i / Math.max(1, n - 1)) * R * 0.75;
      const w = R * (0.86 - i * 0.08);
      const trace = (): void => {
        c.beginPath();
        c.ellipse(x, 0, R * 0.14, w, 0, 0, Math.PI * 2);
      };
      trace();
      c.fillStyle = i % 2 ? ramp.base : shade(ramp.base, 0.08);
      c.fill();
      trace(); outlined(c, ramp, 1.1);
    }
    // A rivet line down the middle.
    c.fillStyle = withAlpha(ramp.highlight, 0.7);
    for (let i = 0; i < n; i++) {
      const x = R * 0.28 - (i / Math.max(1, n - 1)) * R * 0.75;
      c.beginPath(); c.arc(x, 0, R * 0.045, 0, Math.PI * 2); c.fill();
    }
  });
};

/** Pustule cluster — plague bloats, egg sacs. params: n. */
const bloatSacs: PartPainter = (ctx, r, spec, pal) => {
  const ramp = rampFor(spec, pal, 'accent');
  const n = Math.round(P(spec, 'n', 5));
  place(ctx, r, spec, (c, R) => {
    for (let i = 0; i < n; i++) {
      const a = hash01(i, 41) * Math.PI * 2;
      const d = Math.sqrt(hash01(i, 43)) * R * 0.62;
      const s = R * (0.14 + hash01(i, 47) * 0.16);
      const x = Math.cos(a) * d, y = Math.sin(a) * d;
      c.fillStyle = i % 3 ? ramp.base : shade(ramp.base, 0.15);
      c.beginPath(); c.arc(x, y, s, 0, Math.PI * 2); c.fill();
      c.strokeStyle = withAlpha(ramp.outline, 0.55);
      c.lineWidth = 1;
      c.stroke();
      c.fillStyle = withAlpha('#ffffff', 0.35);
      c.beginPath(); c.arc(x - s * 0.3, y - s * 0.3, s * 0.3, 0, Math.PI * 2); c.fill();
    }
  });
};

/** Draped chains swinging off the frame — jailers, wardens, the bound. */
const chains: PartPainter = (ctx, r, spec, pal) => {
  const ramp = rampFor(spec, pal, 'metal');
  place(ctx, r, spec, (c, R) => {
    c.strokeStyle = ramp.base;
    c.lineWidth = Math.max(1.2, R * 0.06);
    for (const side of [-1, 1]) {
      const sag = R * 0.3;
      c.beginPath();
      c.moveTo(R * 0.2, side * R * 0.55);
      c.quadraticCurveTo(-R * 0.35, side * R * 0.75 + sag * 0.4, -R * 0.9, side * R * 0.6);
      c.stroke();
      // Links.
      c.fillStyle = shade(ramp.base, 0.12);
      for (let i = 1; i <= 3; i++) {
        const t = i / 4;
        const x = R * 0.2 + (-R * 0.9 - R * 0.2) * t;
        const y = side * (R * 0.55 + Math.sin(t * Math.PI) * sag * 0.35);
        c.beginPath(); c.arc(x, y, R * 0.055, 0, Math.PI * 2); c.fill();
      }
    }
  });
};

/** RAPTOR ARMS — the mantis's folded scythe-forelimbs: two segments hinged
 *  at a raised elbow, blade tucked inward, held COCKED. Draws both sides
 *  (a mantis prays with the pair). params: len, fold (elbow lift). */
const raptorArms: PartPainter = (ctx, r, spec, pal) => {
  const ramp = rampFor(spec, pal, 'base');
  const len = P(spec, 'len', 0.9);
  const fold = P(spec, 'fold', 0.55);
  place(ctx, r, spec, (c, R) => {
    for (const m of [1, -1]) {
      const sx = R * 0.35, sy = m * R * 0.4;                        // shoulder
      const ex = R * (0.35 + len * 0.5), ey = m * R * (0.4 + fold); // raised elbow
      const tx = R * (0.35 + len), ty = m * R * 0.18;               // tip, tucked in
      c.lineCap = 'round';
      c.strokeStyle = ramp.base;
      c.lineWidth = Math.max(1.8, R * 0.12);
      c.beginPath(); c.moveTo(sx, sy); c.lineTo(ex, ey); c.stroke();
      // The scythe forearm: a tapered blade folding back toward the face.
      c.fillStyle = ramp.light;
      c.beginPath();
      c.moveTo(ex, ey + m * R * 0.05);
      c.quadraticCurveTo((ex + tx) / 2, (ey + ty) / 2 + m * R * 0.12, tx, ty);
      c.lineTo(tx - R * 0.06, ty - m * R * 0.06);
      c.quadraticCurveTo((ex + tx) / 2 - R * 0.05, (ey + ty) / 2, ex - R * 0.04, ey - m * R * 0.04);
      c.closePath(); c.fill();
      c.strokeStyle = withAlpha(ramp.outline, 0.7);
      c.lineWidth = 1;
      c.stroke();
    }
  });
};

/** SEGMENT RINGS — larval body bands across a soft body (maggots, grubs,
 *  worms): the anatomy IS the repetition. params: n. */
const segmentRings: PartPainter = (ctx, r, spec, pal) => {
  const ramp = rampFor(spec, pal, 'base');
  const n = Math.round(P(spec, 'n', 5));
  place(ctx, r, spec, (c, R) => {
    c.save();
    c.beginPath(); c.arc(0, 0, R, 0, Math.PI * 2); c.clip();
    for (let i = 0; i < n; i++) {
      const x = -R * 0.8 + (i / Math.max(1, n - 1)) * R * 1.6;
      const half = Math.sqrt(Math.max(0.08, 1 - (x / R) * (x / R))) * R;
      c.strokeStyle = withAlpha(ramp.shadow, 0.5);
      c.lineWidth = Math.max(1.2, R * 0.07);
      c.beginPath();
      c.moveTo(x, -half * 0.92);
      c.quadraticCurveTo(x - R * 0.1, 0, x, half * 0.92);
      c.stroke();
      c.strokeStyle = withAlpha(ramp.highlight, 0.28);
      c.lineWidth = Math.max(1, R * 0.04);
      c.beginPath();
      c.moveTo(x + R * 0.05, -half * 0.85);
      c.quadraticCurveTo(x - R * 0.05, 0, x + R * 0.05, half * 0.85);
      c.stroke();
    }
    c.restore();
  });
};

/** OOZE LOBES — live pseudopod bulges rolling around the rim: the body
 *  never agrees on its own outline. params: n. */
const oozeLobes: PartPainter = (ctx, r, spec, pal, t = 0) => {
  const ramp = rampFor(spec, pal, 'base');
  const n = Math.round(P(spec, 'n', 5));
  place(ctx, r, spec, (c, R) => {
    for (let i = 0; i < n; i++) {
      const a = (i / n) * Math.PI * 2 + t * 0.25;
      const throb = 0.5 + 0.5 * Math.sin(t * 1.7 + i * 2.1);
      const d = R * (0.72 + 0.16 * throb);
      const lr = R * (0.16 + 0.14 * throb);
      c.fillStyle = withAlpha(ramp.base, 0.55 + 0.2 * throb);
      c.beginPath();
      c.ellipse(Math.cos(a) * d, Math.sin(a) * d, lr, lr * 0.75, a, 0, Math.PI * 2);
      c.fill();
    }
  });
};

/** FLESH FOLDS — slack wrinkle-bands sagging across the body; meat that has
 *  settled. params: n. */
const fleshFolds: PartPainter = (ctx, r, spec, pal) => {
  const ramp = rampFor(spec, pal, 'base');
  const n = Math.round(P(spec, 'n', 4));
  place(ctx, r, spec, (c, R) => {
    c.save();
    c.beginPath(); c.arc(0, 0, R, 0, Math.PI * 2); c.clip();
    c.lineCap = 'round';
    for (let i = 0; i < n; i++) {
      const y = -R * 0.6 + (i / Math.max(1, n - 1)) * R * 1.2;
      const sag = R * (0.14 + hash01(i, 151) * 0.12);
      const half = Math.sqrt(Math.max(0.1, 1 - (y / R) * (y / R))) * R * 0.9;
      c.strokeStyle = withAlpha(ramp.shadow, 0.55);
      c.lineWidth = Math.max(1.4, R * 0.08);
      c.beginPath();
      c.moveTo(-half, y);
      c.quadraticCurveTo(0, y + sag, half, y);
      c.stroke();
      c.strokeStyle = withAlpha(ramp.highlight, 0.3);
      c.lineWidth = Math.max(1, R * 0.04);
      c.beginPath();
      c.moveTo(-half * 0.9, y + R * 0.05);
      c.quadraticCurveTo(0, y + sag + R * 0.05, half * 0.9, y + R * 0.05);
      c.stroke();
    }
    c.restore();
  });
};

/** EYE CLUSTER — a knot of small unblinking eyes in odd sizes (cavern
 *  horrors, flesh that watches). params: n, spread, dist. */
const eyeCluster: PartPainter = (ctx, r, spec, pal) => {
  const col = spec.color ?? pal.glow;
  const n = Math.round(P(spec, 'n', 5));
  const spread = P(spec, 'spread', 0.3);
  const dist = P(spec, 'dist', 0.5);
  place(ctx, r, spec, (c, R) => {
    for (let i = 0; i < n; i++) {
      const a = (hash01(i, 157) - 0.5) * spread * Math.PI * 2;
      const d = R * dist * (0.8 + hash01(i, 163) * 0.5);
      const er = R * (0.05 + hash01(i, 167) * 0.06);
      const x = Math.cos(a) * d, y = Math.sin(a) * d;
      c.fillStyle = withAlpha('#16121c', 0.9);
      c.beginPath(); c.arc(x, y, er * 1.5, 0, Math.PI * 2); c.fill();
      c.fillStyle = col;
      c.beginPath(); c.arc(x, y, er, 0, Math.PI * 2); c.fill();
      c.fillStyle = withAlpha('#ffffff', 0.55);
      c.beginPath(); c.arc(x - er * 0.3, y - er * 0.3, er * 0.35, 0, Math.PI * 2); c.fill();
    }
  });
};

/** A quill/bramble row along the spine — barbed beasts. params: n. */
const barbs: PartPainter = (ctx, r, spec, pal) => {
  const ramp = rampFor(spec, pal, 'bone');
  const n = Math.round(P(spec, 'n', 5));
  place(ctx, r, spec, (c, R) => {
    c.lineCap = 'round';
    c.strokeStyle = ramp.base;
    c.lineWidth = Math.max(1.6, R * 0.09);
    for (let i = 0; i < n; i++) {
      const x = R * 0.45 - (i / (n - 1)) * R * 1.15;
      const lean = -0.5 - (i / n) * 0.5;
      const len = R * (0.34 + 0.14 * Math.sin((i + 0.5) / n * Math.PI));
      c.beginPath();
      c.moveTo(x, 0);
      c.lineTo(x + Math.cos(lean + Math.PI / 2) * 0, -len);
      c.stroke();
      c.beginPath();
      c.moveTo(x, 0);
      c.lineTo(x, len);
      c.stroke();
    }
  });
};

/** A coiled whip at the hip — lashers. */
const whip: PartPainter = (ctx, r, spec, pal) => {
  const ramp = rampFor(spec, pal, 'wood');
  place(ctx, r, spec, (c, R) => {
    const x = R * 0.3, y = R * 0.68;
    c.lineCap = 'round';
    c.strokeStyle = shade(ramp.base, -0.15);
    c.lineWidth = Math.max(1.6, R * 0.08);
    c.beginPath();
    c.arc(x, y, R * 0.22, 0, Math.PI * 1.8);
    c.stroke();
    c.beginPath();
    c.moveTo(x + R * 0.2, y);
    c.quadraticCurveTo(x + R * 0.6, y + R * 0.1, x + R * 0.85, y - R * 0.18);
    c.stroke();
    c.fillStyle = shade(ramp.base, 0.15);
    c.beginPath(); c.arc(x + R * 0.85, y - R * 0.18, R * 0.05, 0, Math.PI * 2); c.fill();
  });
};

/** A barrel from above: staves, two iron bands, a lid boss. */
const keg: PartPainter = (ctx, r, spec, pal) => {
  const wood = rampFor(spec, pal, 'wood');
  place(ctx, r, spec, (c, R) => {
    const trace = (): void => { c.beginPath(); c.arc(0, 0, R, 0, Math.PI * 2); };
    trace(); c.fillStyle = wood.base; c.fill();
    volume(c, R, wood, trace);
    // Staves radiating from the bung.
    c.save(); trace(); c.clip();
    c.strokeStyle = withAlpha(wood.shadow, 0.55);
    c.lineWidth = Math.max(1, R * 0.05);
    for (let i = 0; i < 8; i++) {
      const a = (i / 8) * Math.PI * 2;
      c.beginPath(); c.moveTo(Math.cos(a) * R * 0.25, Math.sin(a) * R * 0.25);
      c.lineTo(Math.cos(a) * R, Math.sin(a) * R); c.stroke();
    }
    c.restore();
    // Iron bands.
    c.strokeStyle = pal.metal.shadow;
    c.lineWidth = Math.max(1.5, R * 0.09);
    c.beginPath(); c.arc(0, 0, R * 0.72, 0, Math.PI * 2); c.stroke();
    c.beginPath(); c.arc(0, 0, R * 0.38, 0, Math.PI * 2); c.stroke();
    trace(); outlined(c, wood, 1.5);
  });
};

/** A crate from above: boarded square + cross braces. */
const crateBox: PartPainter = (ctx, r, spec, pal) => {
  const wood = rampFor(spec, pal, 'wood');
  place(ctx, r, spec, (c, R) => {
    const s = R * 0.88;
    const trace = (): void => { c.beginPath(); c.rect(-s, -s, s * 2, s * 2); };
    trace(); c.fillStyle = wood.base; c.fill();
    volume(c, s, wood, trace);
    c.strokeStyle = withAlpha(wood.shadow, 0.6);
    c.lineWidth = Math.max(1, R * 0.05);
    for (const off of [-0.33, 0.33]) {
      c.beginPath(); c.moveTo(-s, off * s * 2); c.lineTo(s, off * s * 2); c.stroke();
    }
    c.strokeStyle = shade(wood.base, 0.14);
    c.lineWidth = Math.max(1.4, R * 0.08);
    c.beginPath(); c.moveTo(-s, -s); c.lineTo(s, s); c.moveTo(-s, s); c.lineTo(s, -s); c.stroke();
    trace(); outlined(c, wood, 1.5);
  });
};

// ======================================================= THE ANIMAL KINGDOM

/** Branching antlers swept back off the brow (stags, forest spirits). */
const antlers: PartPainter = (ctx, r, spec, pal) => {
  const ramp = rampFor(spec, pal, 'bone');
  place(ctx, r, spec, (c, R) => {
    c.lineCap = 'round';
    for (const side of [-1, 1]) {
      const baseA = side * 0.75;
      c.strokeStyle = ramp.base;
      c.lineWidth = Math.max(1.8, R * 0.11);
      // The main beam: brow → back-and-out.
      const bx = Math.cos(baseA) * R * 0.6, by = Math.sin(baseA) * R * 0.6;
      const mx = -R * 0.3, my = side * R * 1.15;
      const tx = -R * 1.1, ty = side * R * 1.35;
      c.beginPath();
      c.moveTo(bx, by);
      c.quadraticCurveTo(mx * 0.3, my * 0.85, mx, my);
      c.quadraticCurveTo((mx + tx) / 2, (my + ty) / 2 + side * R * 0.1, tx, ty);
      c.stroke();
      // Tines forking UP off the beam.
      c.lineWidth = Math.max(1.2, R * 0.07);
      for (const f of [0.35, 0.65, 0.9]) {
        const px = bx + (tx - bx) * f, py = by + (ty - by) * f;
        c.beginPath();
        c.moveTo(px, py);
        c.lineTo(px + R * 0.32, py + side * R * 0.18);
        c.stroke();
      }
    }
  });
};

/** Curled ram horns spiraling at the temples. */
const ramHorns: PartPainter = (ctx, r, spec, pal) => {
  const ramp = rampFor(spec, pal, 'bone');
  place(ctx, r, spec, (c, R) => {
    for (const side of [-1, 1]) {
      const cx = R * 0.15, cy = side * R * 0.85;
      c.strokeStyle = ramp.base;
      c.lineWidth = Math.max(2.2, R * 0.16);
      c.lineCap = 'round';
      c.beginPath();
      c.arc(cx, cy, R * 0.34, side > 0 ? -1.2 : 1.2 - Math.PI, side > 0 ? Math.PI * 0.9 : Math.PI * 0.9 - Math.PI);
      c.stroke();
      c.strokeStyle = withAlpha(ramp.shadow, 0.6);
      c.lineWidth = Math.max(1, R * 0.05);
      c.beginPath();
      c.arc(cx, cy, R * 0.26, side > 0 ? -1.0 : 1.0 - Math.PI, side > 0 ? Math.PI * 0.8 : Math.PI * 0.8 - Math.PI);
      c.stroke();
    }
  });
};

/** A hooked raptor beak — birds of prey, not snouts. */
const beak: PartPainter = (ctx, r, spec, pal) => {
  const ramp = rampFor(spec, pal, 'bone');
  place(ctx, r, spec, (c, R) => {
    c.fillStyle = shade(ramp.base, 0.08);
    c.beginPath();
    c.moveTo(R * 0.45, -R * 0.16);
    c.quadraticCurveTo(R * 0.95, -R * 0.1, R * 1.02, R * 0.05);
    c.quadraticCurveTo(R * 0.9, R * 0.03, R * 0.82, R * 0.14);
    c.quadraticCurveTo(R * 0.6, R * 0.16, R * 0.45, R * 0.16);
    c.closePath();
    c.fill();
    outlined(c, ramp, 1.1);
    c.strokeStyle = withAlpha(ramp.shadow, 0.7);
    c.lineWidth = 1;
    c.beginPath();
    c.moveTo(R * 0.5, 0);
    c.lineTo(R * 0.92, R * 0.02);
    c.stroke();
  });
};

/** FEATHERED wings: layered plume rows (vs the demons' membrane). */
const featherWings: PartPainter = (ctx, r, spec, pal) => {
  const ramp = rampFor(spec, pal, 'base');
  place(ctx, r, spec, (c, R) => {
    for (const side of [-1, 1]) {
      for (let row = 0; row < 3; row++) {
        const len = R * (1.7 - row * 0.35);
        const tone = row === 0 ? ramp.shadow : row === 1 ? ramp.base : shade(ramp.base, 0.16);
        c.fillStyle = withAlpha(tone, 0.95);
        const feathers = 5 - row;
        for (let i = 0; i < feathers; i++) {
          const a = Math.PI + side * (0.25 + (i / feathers) * 0.85);
          const fx = Math.cos(a) * len, fy = Math.sin(a) * len;
          const px = Math.cos(a + Math.PI / 2) * R * 0.1;
          const py = Math.sin(a + Math.PI / 2) * R * 0.1;
          c.beginPath();
          c.moveTo(-R * 0.15 - px, side * R * 0.3 - py);
          c.quadraticCurveTo(fx * 0.55, fy * 0.55 - R * 0.08, fx, fy);
          c.quadraticCurveTo(fx * 0.55 + px * 2, fy * 0.55 + py * 2, -R * 0.15 + px, side * R * 0.3 + py);
          c.closePath();
          c.fill();
        }
      }
    }
  });
};

/** A sail crest running down the spine (lizards, drakes). params: n. */
const crest: PartPainter = (ctx, r, spec, pal) => {
  const ramp = rampFor(spec, pal, 'accent');
  const n = Math.round(P(spec, 'n', 5));
  place(ctx, r, spec, (c, R) => {
    c.fillStyle = withAlpha(ramp.base, 0.92);
    for (let i = 0; i < n; i++) {
      const x = R * 0.5 - (i / (n - 1)) * R * 1.3;
      const h = R * (0.26 + 0.16 * Math.sin((i + 0.5) / n * Math.PI));
      c.beginPath();
      c.moveTo(x + R * 0.1, 0);
      c.lineTo(x, -h);
      c.lineTo(x - R * 0.12, 0);
      c.closePath();
      c.fill();
      c.strokeStyle = withAlpha(ramp.outline, 0.6);
      c.lineWidth = 1;
      c.stroke();
    }
  });
};

/** A neck frill fanned behind the head. */
const frill: PartPainter = (ctx, r, spec, pal) => {
  const ramp = rampFor(spec, pal, 'accent');
  place(ctx, r, spec, (c, R) => {
    const cx = R * 0.3;
    c.fillStyle = withAlpha(ramp.base, 0.9);
    c.beginPath();
    c.arc(cx, 0, R * 0.62, Math.PI * 0.62, Math.PI * 1.38);
    c.closePath();
    c.fill();
    outlined(c, ramp, 1.2);
    c.strokeStyle = withAlpha(ramp.shadow, 0.6);
    c.lineWidth = 1;
    for (let i = 0; i < 5; i++) {
      const a = Math.PI * (0.66 + (i / 4) * 0.68);
      c.beginPath();
      c.moveTo(cx, 0);
      c.lineTo(cx + Math.cos(a) * R * 0.6, Math.sin(a) * R * 0.6);
      c.stroke();
    }
  });
};

/** Gill slits raked along the flanks (the deep's children). */
const gills: PartPainter = (ctx, r, spec, pal) => {
  const ramp = rampFor(spec, pal, 'base');
  place(ctx, r, spec, (c, R) => {
    c.strokeStyle = withAlpha(ramp.shadow, 0.85);
    c.lineWidth = Math.max(1.2, R * 0.07);
    c.lineCap = 'round';
    for (const side of [-1, 1]) {
      for (let i = 0; i < 3; i++) {
        const x = R * 0.25 - i * R * 0.2;
        c.beginPath();
        c.moveTo(x, side * R * 0.5);
        c.quadraticCurveTo(x - R * 0.06, side * R * 0.72, x - R * 0.16, side * R * 0.88);
        c.stroke();
      }
    }
  });
};

/** A trunk/proboscis curling ahead (mammoths at scale 1, mosquitos thin). */
const trunkNose: PartPainter = (ctx, r, spec, pal) => {
  const ramp = rampFor(spec, pal, 'base');
  const w = P(spec, 'w', 0.16);
  place(ctx, r, spec, (c, R) => {
    c.strokeStyle = ramp.base;
    c.lineWidth = Math.max(2, R * w);
    c.lineCap = 'round';
    c.beginPath();
    c.moveTo(R * 0.5, 0);
    c.quadraticCurveTo(R * 1.05, R * 0.1, R * 1.15, R * 0.42);
    c.stroke();
    c.strokeStyle = withAlpha(ramp.shadow, 0.5);
    c.lineWidth = Math.max(1, R * w * 0.4);
    c.beginPath();
    c.moveTo(R * 0.6, R * 0.02);
    c.quadraticCurveTo(R * 1.0, R * 0.12, R * 1.1, R * 0.38);
    c.stroke();
  });
};

/** Armored back scutes in offset rows (crocodilians). */
const scutes: PartPainter = (ctx, r, spec, pal) => {
  const ramp = rampFor(spec, pal, 'base');
  place(ctx, r, spec, (c, R) => {
    c.fillStyle = shade(ramp.base, -0.12);
    for (let row = -1; row <= 1; row++) {
      for (let i = 0; i < 4; i++) {
        const x = R * 0.45 - i * R * 0.32 + (row === 0 ? R * 0.14 : 0);
        const y = row * R * 0.3;
        c.beginPath();
        c.ellipse(x, y, R * 0.13, R * 0.1, 0, 0, Math.PI * 2);
        c.fill();
        c.strokeStyle = withAlpha(ramp.outline, 0.5);
        c.lineWidth = 1;
        c.stroke();
      }
    }
    // Center keel highlights.
    c.fillStyle = withAlpha(ramp.highlight, 0.5);
    for (let i = 0; i < 4; i++) {
      c.beginPath();
      c.arc(R * 0.59 - i * R * 0.32, 0, R * 0.035, 0, Math.PI * 2);
      c.fill();
    }
  });
};

/** A forked FISH TAIL sweeping behind (the mer, the deep). */
const tailFin: PartPainter = (ctx, r, spec, pal) => {
  const ramp = rampFor(spec, pal, 'base');
  place(ctx, r, spec, (c, R) => {
    c.fillStyle = withAlpha(ramp.base, 0.92);
    c.beginPath();
    c.moveTo(-R * 0.6, 0);
    c.quadraticCurveTo(-R * 1.1, -R * 0.1, -R * 1.5, -R * 0.55);
    c.quadraticCurveTo(-R * 1.18, -R * 0.08, -R * 1.28, 0);
    c.quadraticCurveTo(-R * 1.18, R * 0.08, -R * 1.5, R * 0.55);
    c.quadraticCurveTo(-R * 1.1, R * 0.1, -R * 0.6, 0);
    c.closePath();
    c.fill();
    outlined(c, ramp, 1.2);
    c.strokeStyle = withAlpha(ramp.shadow, 0.55);
    c.lineWidth = 1;
    for (const f of [-0.35, 0, 0.35]) {
      c.beginPath();
      c.moveTo(-R * 0.7, f * R * 0.15);
      c.lineTo(-R * 1.35, f * R * 1.2);
      c.stroke();
    }
  });
};

/** Stalked eyes periscoping forward (crabs, snails). */
const eyestalks: PartPainter = (ctx, r, spec, pal) => {
  const ramp = rampFor(spec, pal, 'base');
  const col = spec.color ?? pal.glow;
  place(ctx, r, spec, (c, R) => {
    for (const side of [-1, 1]) {
      c.strokeStyle = shade(ramp.base, -0.08);
      c.lineWidth = Math.max(1.6, R * 0.09);
      c.lineCap = 'round';
      c.beginPath();
      c.moveTo(R * 0.35, side * R * 0.22);
      c.quadraticCurveTo(R * 0.65, side * R * 0.3, R * 0.8, side * R * 0.42);
      c.stroke();
      c.fillStyle = col;
      c.beginPath();
      c.arc(R * 0.8, side * R * 0.42, R * 0.09, 0, Math.PI * 2);
      c.fill();
      c.fillStyle = '#ffffff';
      c.beginPath();
      c.arc(R * 0.78, side * R * 0.4, R * 0.035, 0, Math.PI * 2);
      c.fill();
    }
  });
};

/** A ruffed mane ringing the head (lions, alphas). */
const mane: PartPainter = (ctx, r, spec, pal) => {
  const ramp = rampFor(spec, pal, 'accent');
  place(ctx, r, spec, (c, R) => {
    const cx = R * 0.32;
    c.fillStyle = withAlpha(ramp.base, 0.9);
    c.beginPath();
    for (let i = 0; i <= 14; i++) {
      const a = (i / 14) * Math.PI * 2;
      const rr = R * (0.52 + 0.1 * (i % 2));
      const x = cx + Math.cos(a) * rr, y = Math.sin(a) * rr;
      if (i === 0) c.moveTo(x, y); else c.lineTo(x, y);
    }
    c.closePath();
    c.fill();
    c.strokeStyle = withAlpha(ramp.shadow, 0.6);
    c.lineWidth = 1.2;
    c.stroke();
  });
};

/** A clutch egg / brood bulb carried behind. */
const egg: PartPainter = (ctx, r, spec, pal) => {
  const ramp = rampFor(spec, pal, 'bone');
  place(ctx, r, spec, (c, R) => {
    const trace = (): void => { c.beginPath(); c.ellipse(0, 0, R * 0.42, R * 0.55, 0, 0, Math.PI * 2); };
    trace(); c.fillStyle = ramp.base; c.fill();
    volume(c, R * 0.5, ramp, trace);
    trace(); outlined(c, ramp, 1.2);
    c.fillStyle = withAlpha(ramp.shadow, 0.4);
    for (let i = 0; i < 4; i++) {
      c.beginPath();
      c.arc((hash01(i, 3) - 0.5) * R * 0.5, (hash01(i, 7) - 0.5) * R * 0.7, R * 0.05, 0, Math.PI * 2);
      c.fill();
    }
  });
};

/** A silk cocoon wrap — banded, slightly translucent. */
const cocoon: PartPainter = (ctx, r, spec, pal) => {
  const ramp = rampFor(spec, pal, 'bone');
  place(ctx, r, spec, (c, R) => {
    const trace = (): void => { c.beginPath(); c.ellipse(0, 0, R * 0.9, R * 0.62, 0, 0, Math.PI * 2); };
    trace(); c.fillStyle = withAlpha(ramp.base, 0.92); c.fill();
    volume(c, R * 0.75, ramp, trace);
    c.strokeStyle = withAlpha(ramp.shadow, 0.5);
    c.lineWidth = Math.max(1, R * 0.06);
    for (const f of [-0.5, -0.15, 0.2, 0.55]) {
      c.beginPath();
      c.ellipse(f * R * 0.8, 0, R * 0.16, R * 0.6, 0.25, -Math.PI / 2, Math.PI / 2);
      c.stroke();
    }
    trace(); outlined(c, ramp, 1.2);
  });
};

/** A carved war-mask over the face — elites and the masked orders. */
const mask: PartPainter = (ctx, r, spec, pal) => {
  const ramp = rampFor(spec, pal, 'bone');
  place(ctx, r, spec, (c, R) => {
    const cx = R * 0.42;
    const trace = (): void => { c.beginPath(); c.ellipse(cx, 0, R * 0.32, R * 0.4, 0, 0, Math.PI * 2); };
    trace(); c.fillStyle = ramp.base; c.fill();
    trace(); outlined(c, ramp, 1.2);
    // Eye slits + a carved line.
    c.fillStyle = pal.dark;
    for (const side of [-1, 1]) {
      c.beginPath();
      c.ellipse(cx + R * 0.1, side * R * 0.15, R * 0.09, R * 0.05, side * 0.4, 0, Math.PI * 2);
      c.fill();
    }
    c.strokeStyle = withAlpha(ramp.shadow, 0.7);
    c.lineWidth = 1;
    c.beginPath();
    c.moveTo(cx - R * 0.05, -R * 0.32);
    c.lineTo(cx - R * 0.05, R * 0.32);
    c.stroke();
  });
};

/** A back quiver of fletched arrows (archers). */
const quiver: PartPainter = (ctx, r, spec, pal) => {
  const wood = pal.wood;
  place(ctx, r, spec, (c, R) => {
    c.save();
    c.translate(-R * 0.45, -R * 0.35);
    c.rotate(-0.5);
    c.fillStyle = wood.base;
    c.fillRect(-R * 0.12, -R * 0.3, R * 0.24, R * 0.6);
    c.strokeStyle = withAlpha(wood.outline, 0.8);
    c.lineWidth = 1;
    c.strokeRect(-R * 0.12, -R * 0.3, R * 0.24, R * 0.6);
    // Fletching tips poking out.
    c.fillStyle = pal.accent.base;
    for (const off of [-0.06, 0.02, 0.1]) {
      c.beginPath();
      c.moveTo(off * R, -R * 0.3);
      c.lineTo(off * R - R * 0.04, -R * 0.44);
      c.lineTo(off * R + R * 0.04, -R * 0.44);
      c.closePath();
      c.fill();
    }
    c.restore();
  });
};

/** A clean flowing cape (heroes, commanders — the tatters' tidy cousin). */
const cape: PartPainter = (ctx, r, spec, pal) => {
  const ramp = rampFor(spec, pal, 'accent');
  place(ctx, r, spec, (c, R) => {
    c.fillStyle = withAlpha(ramp.base, 0.94);
    c.beginPath();
    c.moveTo(-R * 0.1, -R * 0.62);
    c.quadraticCurveTo(-R * 0.9, -R * 0.5, -R * 1.15, 0);
    c.quadraticCurveTo(-R * 0.9, R * 0.5, -R * 0.1, R * 0.62);
    c.quadraticCurveTo(-R * 0.45, 0, -R * 0.1, -R * 0.62);
    c.closePath();
    c.fill();
    outlined(c, ramp, 1.3);
    c.strokeStyle = withAlpha(ramp.shadow, 0.55);
    c.lineWidth = 1;
    for (const f of [-0.3, 0, 0.3]) {
      c.beginPath();
      c.moveTo(-R * 0.25, f * R * 0.5);
      c.quadraticCurveTo(-R * 0.7, f * R * 0.65, -R * 1.05, f * R * 0.35);
      c.stroke();
    }
  });
};

/** A knobbed TAIL CLUB (ankylosaurs, bruisers). */
const tailClub: PartPainter = (ctx, r, spec, pal) => {
  const body = rampFor(spec, pal, 'base');
  const bone = pal.bone;
  place(ctx, r, spec, (c, R) => {
    c.strokeStyle = body.base;
    c.lineWidth = Math.max(2.4, R * 0.16);
    c.lineCap = 'round';
    c.beginPath();
    c.moveTo(-R * 0.7, 0);
    c.quadraticCurveTo(-R * 1.15, R * 0.08, -R * 1.45, -R * 0.05);
    c.stroke();
    const trace = (): void => { c.beginPath(); c.arc(-R * 1.55, -R * 0.08, R * 0.26, 0, Math.PI * 2); };
    trace(); c.fillStyle = bone.base; c.fill();
    volume(c, R * 0.26, bone, trace);
    trace(); outlined(c, bone, 1.1);
    c.fillStyle = shade(bone.base, 0.15);
    for (let i = 0; i < 4; i++) {
      const a = (i / 4) * Math.PI * 2 + 0.5;
      c.beginPath();
      c.arc(-R * 1.55 + Math.cos(a) * R * 0.27, -R * 0.08 + Math.sin(a) * R * 0.27, R * 0.06, 0, Math.PI * 2);
      c.fill();
    }
  });
};

// ==================================================== ANGELIC / DEMONIC

/** A radiant SUNBURST behind the body — divine presence in spokes. */
const sunburst: PartPainter = (ctx, r, spec, pal) => {
  const col = spec.color ?? pal.glow;
  const n = Math.round(P(spec, 'n', 8));
  place(ctx, r, spec, (c, R) => {
    c.lineCap = 'round';
    for (let i = 0; i < n; i++) {
      const a = (i / n) * Math.PI * 2 + Math.PI / n;
      const inner = R * 0.75, outer = R * (i % 2 ? 1.15 : 1.4);
      c.strokeStyle = withAlpha(col, i % 2 ? 0.35 : 0.55);
      c.lineWidth = Math.max(1.4, R * (i % 2 ? 0.05 : 0.08));
      c.beginPath();
      c.moveTo(Math.cos(a) * inner, Math.sin(a) * inner);
      c.lineTo(Math.cos(a) * outer, Math.sin(a) * outer);
      c.stroke();
    }
    const g = c.createRadialGradient(0, 0, R * 0.6, 0, 0, R * 1.4);
    g.addColorStop(0, withAlpha(col, 0.14));
    g.addColorStop(1, withAlpha(col, 0));
    c.fillStyle = g;
    c.fillRect(-R * 1.5, -R * 1.5, R * 3, R * 3);
  });
};

/** A laurel wreath ringing the brow — leaf pairs along a circlet. */
const laurel: PartPainter = (ctx, r, spec, pal) => {
  const ramp = rampFor(spec, pal, 'accent');
  place(ctx, r, spec, (c, R) => {
    const cr = R * 0.5;
    c.strokeStyle = withAlpha(ramp.shadow, 0.75);
    c.lineWidth = Math.max(1, R * 0.05);
    c.beginPath();
    c.arc(0, 0, cr, 0.5, Math.PI * 2 - 0.5);
    c.stroke();
    c.fillStyle = ramp.base;
    for (let i = 0; i < 8; i++) {
      const a = 0.7 + (i / 7) * (Math.PI * 2 - 1.4);
      for (const side of [-1, 1]) {
        const la = a + side * 0.12;
        c.beginPath();
        c.ellipse(Math.cos(la) * cr, Math.sin(la) * cr, R * 0.1, R * 0.045, la + side * 0.7, 0, Math.PI * 2);
        c.fill();
      }
    }
  });
};

/** A chained censer swinging at the hip, coal aglow (the holy orders). */
const censer: PartPainter = (ctx, r, spec, pal) => {
  const metal = pal.metal;
  const col = spec.color ?? '#ffd898';
  place(ctx, r, spec, (c, R) => {
    const x = R * 0.42, y = R * 0.72;
    c.strokeStyle = metal.shadow;
    c.lineWidth = Math.max(1, R * 0.05);
    c.beginPath();
    c.moveTo(R * 0.1, R * 0.45);
    c.quadraticCurveTo(x - R * 0.1, y - R * 0.2, x, y);
    c.stroke();
    const g = c.createRadialGradient(x, y, 0, x, y, R * 0.34);
    g.addColorStop(0, withAlpha(col, 0.5));
    g.addColorStop(1, withAlpha(col, 0));
    c.fillStyle = g;
    c.fillRect(x - R * 0.34, y - R * 0.34, R * 0.68, R * 0.68);
    c.fillStyle = metal.base;
    c.beginPath();
    c.arc(x, y, R * 0.12, 0, Math.PI * 2);
    c.fill();
    c.strokeStyle = withAlpha(metal.outline, 0.8);
    c.lineWidth = 1;
    c.stroke();
    c.fillStyle = col;
    c.beginPath();
    c.arc(x, y, R * 0.05, 0, Math.PI * 2);
    c.fill();
  });
};

/** The devil's tail: a whipping curve ending in a SPADE tip. */
const tailSpade: PartPainter = (ctx, r, spec, pal) => {
  const ramp = rampFor(spec, pal, 'base');
  place(ctx, r, spec, (c, R) => {
    c.strokeStyle = ramp.base;
    c.lineWidth = Math.max(1.8, R * 0.1);
    c.lineCap = 'round';
    c.beginPath();
    c.moveTo(-R * 0.7, 0);
    c.quadraticCurveTo(-R * 1.25, R * 0.3, -R * 1.45, -R * 0.15);
    c.stroke();
    // The spade.
    c.fillStyle = shade(ramp.base, -0.08);
    c.beginPath();
    c.moveTo(-R * 1.45, -R * 0.32);
    c.quadraticCurveTo(-R * 1.28, -R * 0.18, -R * 1.32, -R * 0.02);
    c.quadraticCurveTo(-R * 1.5, -R * 0.1, -R * 1.62, -R * 0.02);
    c.quadraticCurveTo(-R * 1.62, -R * 0.2, -R * 1.45, -R * 0.32);
    c.closePath();
    c.fill();
    outlined(c, ramp, 1);
  });
};

/** A CROWN OF HORNS — a ring of curved points around the brow. */
const crownOfHorns: PartPainter = (ctx, r, spec, pal) => {
  const ramp = rampFor(spec, pal, 'bone');
  const n = Math.round(P(spec, 'n', 6));
  place(ctx, r, spec, (c, R) => {
    const cr = R * 0.48;
    c.lineCap = 'round';
    for (let i = 0; i < n; i++) {
      const a = (i / n) * Math.PI * 2 + Math.PI / n;
      c.strokeStyle = i % 2 ? ramp.base : shade(ramp.base, -0.15);
      c.lineWidth = Math.max(1.6, R * 0.09);
      c.beginPath();
      c.moveTo(Math.cos(a) * cr, Math.sin(a) * cr);
      c.quadraticCurveTo(
        Math.cos(a + 0.18) * cr * 1.5, Math.sin(a + 0.18) * cr * 1.5,
        Math.cos(a + 0.42) * cr * 1.75, Math.sin(a + 0.42) * cr * 1.75);
      c.stroke();
    }
  });
};

/** A BRAND seared into the body — a glowing sigil (mark of pact or seal). */
const brand: PartPainter = (ctx, r, spec, pal) => {
  const col = spec.color ?? pal.glow;
  place(ctx, r, spec, (c, R) => {
    const g = c.createRadialGradient(0, 0, 0, 0, 0, R * 0.5);
    g.addColorStop(0, withAlpha(col, 0.3));
    g.addColorStop(1, withAlpha(col, 0));
    c.fillStyle = g;
    c.fillRect(-R * 0.5, -R * 0.5, R, R);
    c.strokeStyle = withAlpha(col, 0.9);
    c.lineWidth = Math.max(1.2, R * 0.06);
    const s = R * 0.3;
    // An angular rune: triangle + bisecting stroke + a crossbar.
    c.beginPath();
    c.moveTo(0, -s); c.lineTo(s * 0.85, s * 0.6); c.lineTo(-s * 0.85, s * 0.6);
    c.closePath();
    c.stroke();
    c.beginPath();
    c.moveTo(0, -s); c.lineTo(0, s * 0.95);
    c.moveTo(-s * 0.45, s * 0.1); c.lineTo(s * 0.45, s * 0.1);
    c.stroke();
  });
};

// ============================================== ANIMAL KINGDOM, CONTINUED

/** Pelt STRIPES raked across the back (tigers, zebra-kin). params: n. */
const stripes: PartPainter = (ctx, r, spec, pal) => {
  const ramp = rampFor(spec, pal, 'dark');
  const n = Math.round(P(spec, 'n', 5));
  place(ctx, r, spec, (c, R) => {
    c.strokeStyle = withAlpha(ramp.base, 0.65);
    c.lineCap = 'round';
    for (let i = 0; i < n; i++) {
      const x = R * 0.55 - (i / (n - 1)) * R * 1.2;
      const half = R * (0.5 + 0.28 * Math.sin((i + 0.5) / n * Math.PI));
      c.lineWidth = Math.max(1.6, R * (0.1 - 0.008 * i));
      c.beginPath();
      c.moveTo(x + R * 0.08, -half);
      c.quadraticCurveTo(x - R * 0.1, 0, x + R * 0.08, half);
      c.stroke();
    }
  });
};

/** Pelt SPOTS scattered over the back (leopards, fawns). params: n. */
const spots: PartPainter = (ctx, r, spec, pal) => {
  const ramp = rampFor(spec, pal, 'dark');
  const n = Math.round(P(spec, 'n', 9));
  place(ctx, r, spec, (c, R) => {
    c.fillStyle = withAlpha(ramp.base, 0.55);
    for (let i = 0; i < n; i++) {
      const a = hash01(i, 53) * Math.PI * 2;
      const d = Math.sqrt(hash01(i, 59)) * R * 0.72;
      const s = R * (0.06 + hash01(i, 61) * 0.06);
      const x = Math.cos(a) * d, y = Math.sin(a) * d;
      // Rosette: a broken ring of 3 dabs.
      for (let k = 0; k < 3; k++) {
        const ka = hash01(i * 7 + k, 67) * Math.PI * 2;
        c.beginPath();
        c.arc(x + Math.cos(ka) * s, y + Math.sin(ka) * s, s * 0.75, 0, Math.PI * 2);
        c.fill();
      }
    }
  });
};

/** A nose HORN rising off the snout (rhino-kin). */
const rhinoHorn: PartPainter = (ctx, r, spec, pal) => {
  const ramp = rampFor(spec, pal, 'bone');
  place(ctx, r, spec, (c, R) => {
    c.fillStyle = ramp.base;
    c.beginPath();
    c.moveTo(R * 0.62, -R * 0.13);
    c.quadraticCurveTo(R * 1.15, -R * 0.05, R * 1.22, 0);
    c.quadraticCurveTo(R * 1.15, R * 0.05, R * 0.62, R * 0.13);
    c.closePath();
    c.fill();
    outlined(c, ramp, 1.1);
    c.fillStyle = shade(ramp.base, 0.2);
    c.beginPath();
    c.arc(R * 0.72, -R * 0.04, R * 0.05, 0, Math.PI * 2);
    c.fill();
  });
};

/** Tufted lynx ears — the adorn ears with feathered tips. */
const tuftEars: PartPainter = (ctx, r, spec, pal) => {
  const ramp = rampFor(spec, pal, 'base');
  place(ctx, r, spec, (c, R) => {
    for (const side of [-1, 1]) {
      const ang = side * 1.75;
      const bx = Math.cos(ang) * R * 0.8, by = Math.sin(ang) * R * 0.8;
      const tx = Math.cos(ang) * R * 1.45, ty = Math.sin(ang) * R * 1.45;
      const px = Math.cos(ang + Math.PI / 2) * R * 0.24, py = Math.sin(ang + Math.PI / 2) * R * 0.24;
      c.fillStyle = ramp.base;
      c.beginPath();
      c.moveTo(bx - px, by - py); c.lineTo(tx, ty); c.lineTo(bx + px, by + py);
      c.closePath(); c.fill();
      outlined(c, ramp, 1);
      // The tuft: two fine hairs off the tip.
      c.strokeStyle = withAlpha(pal.dark, 0.8);
      c.lineWidth = 1;
      c.beginPath();
      c.moveTo(tx, ty);
      c.lineTo(tx + Math.cos(ang) * R * 0.22, ty + Math.sin(ang) * R * 0.22);
      c.moveTo(tx, ty);
      c.lineTo(tx + Math.cos(ang + 0.35) * R * 0.16, ty + Math.sin(ang + 0.35) * R * 0.16);
      c.stroke();
    }
  });
};

/** Whiskers fanning off the muzzle. */
const whiskers: PartPainter = (ctx, r, spec, pal) => {
  place(ctx, r, spec, (c, R) => {
    c.strokeStyle = withAlpha('#e8e4d8', 0.5);
    c.lineWidth = 1;
    for (const side of [-1, 1]) {
      for (const lift of [-0.16, 0, 0.16]) {
        c.beginPath();
        c.moveTo(R * 0.62, side * R * 0.1);
        c.quadraticCurveTo(R * 0.95, side * R * (0.32 + lift), R * 1.2, side * R * (0.5 + lift * 2));
        c.stroke();
      }
    }
  });
};

/** A spiral shell carried on the back (snails, shelled things). */
const shellSpiral: PartPainter = (ctx, r, spec, pal) => {
  const ramp = rampFor(spec, pal, 'bone');
  place(ctx, r, spec, (c, R) => {
    const cx = -R * 0.25;
    const trace = (): void => { c.beginPath(); c.arc(cx, 0, R * 0.72, 0, Math.PI * 2); };
    trace(); c.fillStyle = ramp.base; c.fill();
    volume(c, R * 0.72, ramp, trace);
    // The spiral: a shrinking arc walk.
    c.strokeStyle = withAlpha(ramp.shadow, 0.7);
    c.lineWidth = Math.max(1.2, R * 0.06);
    c.beginPath();
    let ang = 0, rad = R * 0.68;
    c.moveTo(cx + rad, 0);
    while (rad > R * 0.08) {
      ang += 0.5;
      rad *= 0.92;
      c.lineTo(cx + Math.cos(ang) * rad, Math.sin(ang) * rad);
    }
    c.stroke();
    trace(); outlined(c, ramp, 1.4);
  });
};

/** A back hump (camels, brutes bred for the wastes). */
const hump: PartPainter = (ctx, r, spec, pal) => {
  const ramp = rampFor(spec, pal, 'base');
  place(ctx, r, spec, (c, R) => {
    const trace = (): void => { c.beginPath(); c.ellipse(-R * 0.2, 0, R * 0.42, R * 0.34, 0, 0, Math.PI * 2); };
    trace(); c.fillStyle = shade(ramp.base, 0.06); c.fill();
    volume(c, R * 0.4, ramp, trace);
    trace(); outlined(c, ramp, 1.2);
  });
};

// ================================================================ WINTER

/** ICICLES rimed along the brow/back — hanging frost fangs. params: n. */
const icicles: PartPainter = (ctx, r, spec, pal) => {
  const n = Math.round(P(spec, 'n', 5));
  place(ctx, r, spec, (c, R) => {
    for (let i = 0; i < n; i++) {
      const a = Math.PI * 0.5 + (i / (n - 1) - 0.5) * 1.8; // draped over the rear arc
      const bx = Math.cos(a) * R * 0.88, by = Math.sin(a) * R * 0.88;
      const len = R * (0.22 + hash01(i, 41) * 0.22);
      const tx = bx + Math.cos(a) * len, ty = by + Math.sin(a) * len;
      const px = Math.cos(a + Math.PI / 2) * R * 0.07, py = Math.sin(a + Math.PI / 2) * R * 0.07;
      c.fillStyle = withAlpha('#cfe8f6', 0.9);
      c.beginPath();
      c.moveTo(bx - px, by - py); c.lineTo(tx, ty); c.lineTo(bx + px, by + py);
      c.closePath(); c.fill();
      c.strokeStyle = withAlpha('#ffffff', 0.5);
      c.lineWidth = 1;
      c.beginPath(); c.moveTo(bx, by); c.lineTo(tx, ty); c.stroke();
    }
  });
};

/** A thick FUR RUFF collaring the shoulders (winter beasts). */
const furRuff: PartPainter = (ctx, r, spec, pal) => {
  const ramp = rampFor(spec, pal, 'base');
  place(ctx, r, spec, (c, R) => {
    c.lineCap = 'round';
    const n = 16;
    for (let i = 0; i < n; i++) {
      const a = (i / n) * Math.PI * 2;
      const r0 = R * 0.62, r1 = R * (0.92 + hash01(i, 73) * 0.2);
      c.strokeStyle = withAlpha(i % 2 ? shade(ramp.base, 0.2) : shade(ramp.base, -0.1), 0.85);
      c.lineWidth = Math.max(1.6, R * 0.11);
      c.beginPath();
      c.moveTo(Math.cos(a) * r0, Math.sin(a) * r0);
      c.lineTo(Math.cos(a + 0.1) * r1, Math.sin(a + 0.1) * r1);
      c.stroke();
    }
  });
};

/** LIVE: cold breath puffing ahead of the face on a slow rhythm. */
const breathPuff: PartPainter = (ctx, r, spec, pal, t = 0) => {
  const col = spec.color ?? '#e8f4fa';
  place(ctx, r, spec, (c, R) => {
    const PERIOD = 2.8;
    const cyc = ((t + R) % PERIOD) / PERIOD;
    if (cyc > 0.55) return; // between breaths
    const k = cyc / 0.55;
    const x = R * (0.85 + k * 0.55);
    const size = R * (0.1 + k * 0.22);
    c.globalAlpha *= (1 - k) * 0.4;
    c.fillStyle = col;
    c.beginPath();
    c.arc(x, R * 0.06 * Math.sin(t * 2), size, 0, Math.PI * 2);
    c.arc(x - size * 0.7, -R * 0.05, size * 0.7, 0, Math.PI * 2);
    c.fill();
  });
};

// ================================================================== GEAR

/** WARPAINT stripes raked across the face/brow. params: n. */
const warpaint: PartPainter = (ctx, r, spec, pal) => {
  const col = spec.color ?? pal.glow;
  const n = Math.round(P(spec, 'n', 3));
  place(ctx, r, spec, (c, R) => {
    c.strokeStyle = withAlpha(col, 0.75);
    c.lineCap = 'round';
    c.lineWidth = Math.max(1.5, R * 0.08);
    for (let i = 0; i < n; i++) {
      const y = (i - (n - 1) / 2) * R * 0.22;
      c.beginPath();
      c.moveTo(R * 0.32, y - R * 0.06);
      c.lineTo(R * 0.72, y + R * 0.06);
      c.stroke();
    }
  });
};

/** A BANDOLIER strapped across the torso, pouches riding it. */
const bandolier: PartPainter = (ctx, r, spec, pal) => {
  const leather = pal.wood;
  place(ctx, r, spec, (c, R) => {
    const ax = R * 0.5, ay = -R * 0.62, bx = -R * 0.5, by = R * 0.62;
    c.strokeStyle = shade(leather.base, -0.15);
    c.lineWidth = Math.max(2, R * 0.13);
    c.lineCap = 'round';
    c.beginPath();
    c.moveTo(ax, ay);
    c.lineTo(bx, by);
    c.stroke();
    for (const f of [0.25, 0.5, 0.75]) {
      const x = ax + (bx - ax) * f, y = ay + (by - ay) * f;
      c.fillStyle = shade(leather.base, 0.08);
      c.fillRect(x - R * 0.09, y - R * 0.09, R * 0.18, R * 0.18);
      c.strokeStyle = withAlpha(shade(leather.base, -0.4), 0.8);
      c.lineWidth = 1;
      c.strokeRect(x - R * 0.09, y - R * 0.09, R * 0.18, R * 0.18);
    }
  });
};

/** A DORSAL RIDGE of plates down the spine (drakes, ridgebacks). params: n. */
const dorsalRidge: PartPainter = (ctx, r, spec, pal) => {
  const ramp = rampFor(spec, pal, 'bone');
  const n = Math.round(P(spec, 'n', 4));
  place(ctx, r, spec, (c, R) => {
    for (let i = 0; i < n; i++) {
      const x = R * 0.45 - (i / Math.max(1, n - 1)) * R * 1.15;
      const s = R * (0.16 + 0.08 * Math.sin((i + 0.5) / n * Math.PI));
      c.fillStyle = i % 2 ? ramp.base : shade(ramp.base, -0.12);
      c.beginPath();
      c.moveTo(x - s, 0);
      c.lineTo(x, -s * 1.4);
      c.lineTo(x + s, 0);
      c.closePath();
      c.fill();
      c.strokeStyle = withAlpha(ramp.outline, 0.7);
      c.lineWidth = 1;
      c.stroke();
    }
  });
};

/** SABRE FANGS overhanging the jaw (dire cats, vampire things). */
const fangs: PartPainter = (ctx, r, spec, pal) => {
  const ramp = rampFor(spec, pal, 'bone');
  place(ctx, r, spec, (c, R) => {
    c.fillStyle = shade(ramp.base, 0.12);
    for (const side of [-1, 1]) {
      c.beginPath();
      c.moveTo(R * 0.62, side * R * 0.22);
      c.quadraticCurveTo(R * 0.95, side * R * 0.24, R * 1.0, side * R * 0.08);
      c.lineTo(R * 0.78, side * R * 0.12);
      c.closePath();
      c.fill();
      c.strokeStyle = withAlpha(ramp.outline, 0.7);
      c.lineWidth = 1;
      c.stroke();
    }
  });
};

/** A feather PLUME crowning the head (chiefs, champions). params: n. */
const plume: PartPainter = (ctx, r, spec, pal) => {
  const col = spec.color ?? pal.glow;
  const n = Math.round(P(spec, 'n', 4));
  place(ctx, r, spec, (c, R) => {
    c.lineCap = 'round';
    for (let i = 0; i < n; i++) {
      const a = Math.PI + (i / (n - 1) - 0.5) * 0.9;
      const len = R * (0.55 + 0.2 * Math.sin((i + 0.5) / n * Math.PI));
      c.strokeStyle = withAlpha(i % 2 ? col : shade(col, -0.25), 0.9);
      c.lineWidth = Math.max(2, R * 0.12);
      c.beginPath();
      c.moveTo(R * 0.28 + Math.cos(a) * R * 0.1, Math.sin(a) * R * 0.1);
      c.quadraticCurveTo(
        R * 0.28 + Math.cos(a) * len * 0.6, Math.sin(a) * len * 0.8,
        R * 0.28 + Math.cos(a) * len, Math.sin(a) * len * 1.1);
      c.stroke();
    }
  });
};

/** An elder's BEARD flowing from the chin. */
const beard: PartPainter = (ctx, r, spec, pal) => {
  const col = spec.color ?? '#cfc8ba';
  place(ctx, r, spec, (c, R) => {
    c.fillStyle = withAlpha(col, 0.92);
    c.beginPath();
    c.moveTo(R * 0.5, -R * 0.2);
    c.quadraticCurveTo(R * 0.95, 0, R * 0.5, R * 0.2);
    c.quadraticCurveTo(R * 0.78, R * 0.05, R * 0.92, 0);
    c.quadraticCurveTo(R * 0.78, -R * 0.05, R * 0.5, -R * 0.2);
    c.closePath();
    c.fill();
    c.strokeStyle = withAlpha(shade(col, -0.4), 0.6);
    c.lineWidth = 1;
    for (const off of [-0.08, 0, 0.08]) {
      c.beginPath();
      c.moveTo(R * 0.55, off * R);
      c.quadraticCurveTo(R * 0.75, off * R * 1.4, R * 0.9, off * R * 0.6);
      c.stroke();
    }
  });
};

/** TAIL FEATHERS fanned behind (birds, quetzal things). params: n. */
const tailFeathers: PartPainter = (ctx, r, spec, pal) => {
  const col = spec.color ?? pal.glow;
  const n = Math.round(P(spec, 'n', 5));
  place(ctx, r, spec, (c, R) => {
    for (let i = 0; i < n; i++) {
      const a = Math.PI + (i / (n - 1) - 0.5) * 0.85;
      const len = R * (0.9 + 0.3 * Math.sin((i + 0.5) / n * Math.PI));
      c.fillStyle = withAlpha(i % 2 ? col : shade(col, -0.2), 0.9);
      c.beginPath();
      c.ellipse(Math.cos(a) * len * 0.7, Math.sin(a) * len * 0.7,
        len * 0.42, R * 0.11, a, 0, Math.PI * 2);
      c.fill();
      c.strokeStyle = withAlpha(shade(col, -0.45), 0.6);
      c.lineWidth = 1;
      c.stroke();
    }
  });
};

/** A held TORCH — flame + halo (village watch, cult processions). */
const torch: PartPainter = (ctx, r, spec, pal) => {
  const col = spec.color ?? '#ff9a42';
  place(ctx, r, spec, (c, R) => {
    const x = R * 0.6, y = R * 0.66;
    const g = c.createRadialGradient(x, y, 0, x, y, R * 0.55);
    g.addColorStop(0, withAlpha(col, 0.5));
    g.addColorStop(1, withAlpha(col, 0));
    c.fillStyle = g;
    c.fillRect(x - R * 0.55, y - R * 0.55, R * 1.1, R * 1.1);
    c.strokeStyle = pal.wood.base;
    c.lineWidth = Math.max(1.6, R * 0.09);
    c.lineCap = 'round';
    c.beginPath(); c.moveTo(x - R * 0.28, y + R * 0.14); c.lineTo(x, y); c.stroke();
    c.fillStyle = col;
    c.beginPath(); c.arc(x, y, R * 0.12, 0, Math.PI * 2); c.fill();
    c.fillStyle = '#ffe9b8';
    c.beginPath(); c.arc(x, y, R * 0.05, 0, Math.PI * 2); c.fill();
  });
};

/** A fishing NET slung over the shoulder (coast folk, deep cultists). */
const net: PartPainter = (ctx, r, spec, pal) => {
  place(ctx, r, spec, (c, R) => {
    c.strokeStyle = withAlpha(pal.wood.shadow, 0.75);
    c.lineWidth = 1;
    const x0 = -R * 0.75, y0 = R * 0.1, w = R * 0.7, h = R * 0.62;
    for (let i = 0; i <= 4; i++) {
      c.beginPath(); c.moveTo(x0 + (i / 4) * w, y0); c.lineTo(x0 + (i / 4) * w - R * 0.12, y0 + h); c.stroke();
      c.beginPath(); c.moveTo(x0, y0 + (i / 4) * h); c.lineTo(x0 + w, y0 + (i / 4) * h * 0.85); c.stroke();
    }
    // A couple of cork floats.
    c.fillStyle = pal.wood.light;
    c.beginPath(); c.arc(x0 + w * 0.2, y0 + 2, R * 0.06, 0, Math.PI * 2); c.fill();
    c.beginPath(); c.arc(x0 + w * 0.75, y0 + 1, R * 0.06, 0, Math.PI * 2); c.fill();
  });
};

/** Metal helm cap with a nose ridge (knights). */
const helm: PartPainter = (ctx, r, spec, pal) => {
  const ramp = rampFor(spec, pal, 'metal');
  place(ctx, r, spec, (c, R) => {
    const hr = R * 0.46;
    const trace = (): void => { c.beginPath(); c.arc(R * 0.38, 0, hr, 0, Math.PI * 2); };
    trace(); c.fillStyle = ramp.base; c.fill();
    volume(c, hr, ramp, trace);
    trace(); outlined(c, ramp, 1.3);
    // Crest ridge along the facing.
    c.strokeStyle = shade(ramp.base, 0.2);
    c.lineWidth = Math.max(1.6, R * 0.09);
    c.beginPath(); c.moveTo(R * 0.38 - hr * 0.8, 0); c.lineTo(R * 0.38 + hr * 0.95, 0); c.stroke();
  });
};

// ==================================================== THE ORGANIC-HORROR WAVE
// Ten new limbs of vocabulary for the entity creator: fungal vents and moss,
// flesh maws and veins, deep-sea lures and polyps, ooze trails, sails, horns
// and drowned drapes. Same contract as everything above — parametric, role-
// paletted, composed from data.

/** A LAMPREY MAW: concentric gum rings around a dark gullet, inward-leaning
 *  teeth all the way round. params: teeth. */
const mawRing: PartPainter = (ctx, r, spec, pal) => {
  const gum = rampFor(spec, pal, 'base');
  const teeth = Math.round(P(spec, 'teeth', 9));
  place(ctx, r, spec, (c, R) => {
    c.fillStyle = shade(gum.base, -0.18);
    c.beginPath(); c.arc(0, 0, R * 0.62, 0, Math.PI * 2); c.fill();
    outlined(c, gum, 1.2);
    c.strokeStyle = withAlpha(gum.shadow, 0.7);
    c.lineWidth = 1;
    for (const f of [0.5, 0.38]) {
      c.beginPath(); c.arc(0, 0, R * f, 0, Math.PI * 2); c.stroke();
    }
    c.fillStyle = '#0c0508';
    c.beginPath(); c.arc(0, 0, R * 0.2, 0, Math.PI * 2); c.fill();
    // The tooth ring, every point aimed at the middle.
    c.fillStyle = pal.bone.light;
    for (let i = 0; i < teeth; i++) {
      const a = (i / teeth) * Math.PI * 2;
      const bx = Math.cos(a) * R * 0.42, by = Math.sin(a) * R * 0.42;
      const tx = Math.cos(a) * R * 0.16, ty = Math.sin(a) * R * 0.16;
      const w = R * 0.07;
      c.beginPath();
      c.moveTo(bx + Math.cos(a + Math.PI / 2) * w, by + Math.sin(a + Math.PI / 2) * w);
      c.lineTo(bx - Math.cos(a + Math.PI / 2) * w, by - Math.sin(a + Math.PI / 2) * w);
      c.lineTo(tx, ty);
      c.closePath();
      c.fill();
    }
  });
};

/** LIVE: the angler's LURE — a stalk arcing ahead of the face, glow bulb
 *  bobbing on the current. params: len. */
const lure: PartPainter = (ctx, r, spec, pal, t = 0) => {
  const col = spec.color ?? pal.glow;
  const len = P(spec, 'len', 1.15);
  place(ctx, r, spec, (c, R) => {
    const bob = Math.sin(t * 1.9) * R * 0.14;
    const ex = R * len, ey = bob;
    c.strokeStyle = withAlpha(pal.dark, 0.85);
    c.lineWidth = Math.max(1.2, R * 0.07);
    c.lineCap = 'round';
    c.beginPath();
    c.moveTo(R * 0.3, 0);
    c.quadraticCurveTo(R * (0.3 + len * 0.5), -R * 0.42 + bob * 0.4, ex, ey);
    c.stroke();
    const pulse = 0.5 + 0.5 * Math.sin(t * 3.1);
    c.fillStyle = withAlpha(col, 0.22 + 0.2 * pulse);
    c.beginPath(); c.arc(ex, ey, R * 0.3, 0, Math.PI * 2); c.fill();
    c.fillStyle = withAlpha(col, 0.95);
    c.beginPath(); c.arc(ex, ey, R * 0.1 + pulse * R * 0.03, 0, Math.PI * 2); c.fill();
  });
};

/** LIVE: SPORE VENTS — paired blowholes puffing rings on their own clocks.
 *  params: n. */
const sporeVents: PartPainter = (ctx, r, spec, pal, t = 0) => {
  const col = spec.color ?? pal.glow;
  const ramp = rampFor(spec, pal, 'accent');
  const n = Math.round(P(spec, 'n', 2));
  place(ctx, r, spec, (c, R) => {
    for (let i = 0; i < n; i++) {
      const side = n === 1 ? 0 : (i / (n - 1) - 0.5) * 2;
      const x = -R * 0.3, y = side * R * 0.42;
      c.fillStyle = shade(ramp.base, -0.3);
      c.beginPath(); c.ellipse(x, y, R * 0.14, R * 0.11, 0, 0, Math.PI * 2); c.fill();
      c.strokeStyle = withAlpha(ramp.outline, 0.7);
      c.lineWidth = 1;
      c.stroke();
      c.fillStyle = '#100a14';
      c.beginPath(); c.ellipse(x, y, R * 0.06, R * 0.045, 0, 0, Math.PI * 2); c.fill();
      // The puff: an expanding fading ring + a mote or two riding it.
      const cyc = (t * 0.55 + i * 0.37) % 1;
      if (cyc < 0.55) {
        const grow = cyc / 0.55;
        c.globalAlpha = 0.5 * (1 - grow);
        c.strokeStyle = col;
        c.lineWidth = 1.3;
        c.beginPath(); c.arc(x, y, R * (0.08 + grow * 0.4), 0, Math.PI * 2); c.stroke();
        c.globalAlpha = 0.6 * (1 - grow);
        c.fillStyle = col;
        c.beginPath();
        c.arc(x - grow * R * 0.3, y - grow * R * 0.24, R * 0.035, 0, Math.PI * 2);
        c.fill();
        c.globalAlpha = 1;
      }
    }
  });
};

/** MOSS PATCHES — velvet growth blotches with spore-dot freckles: the body
 *  something else has started living on. params: n. */
const mossPatch: PartPainter = (ctx, r, spec, pal) => {
  const ramp = rampFor(spec, pal, 'accent');
  const n = Math.round(P(spec, 'n', 3));
  place(ctx, r, spec, (c, R) => {
    for (let i = 0; i < n; i++) {
      const a = hash01(i, 53) * Math.PI * 2;
      const d = Math.sqrt(hash01(i, 59)) * R * 0.55;
      const x = Math.cos(a) * d, y = Math.sin(a) * d;
      const s = R * (0.16 + hash01(i, 61) * 0.14);
      c.globalAlpha = 0.65;
      c.fillStyle = i % 2 ? ramp.base : shade(ramp.base, -0.14);
      c.beginPath();
      c.ellipse(x, y, s, s * 0.7, hash01(i, 67) * 3, 0, Math.PI * 2);
      c.fill();
      c.globalAlpha = 0.8;
      c.fillStyle = ramp.highlight;
      for (let k = 0; k < 3; k++) {
        c.beginPath();
        c.arc(x + (hash01(k, i * 9 + 1) - 0.5) * s * 1.4, y + (hash01(k, i * 9 + 5) - 0.5) * s, R * 0.02 + 0.5, 0, Math.PI * 2);
        c.fill();
      }
      c.globalAlpha = 1;
    }
  });
};

/** LIVE: VEINWEB — surface vessels webbing the body, throbbing brighter on
 *  the beat. params: n. */
/** MAGMA SEAMS — a cooled-crust fissure web with a molten core, clipped to
 *  the body disc (pyre titans, hellforged hulks, magma golems). Baked: the
 *  crust doesn't crawl — heat reads from the glow ramp alone. params: n. */
const lavaCracks: PartPainter = (ctx, r, spec, pal) => {
  const glow = spec.color ?? pal.glow;
  const n = Math.round(P(spec, 'n', 4));
  place(ctx, r, spec, (c, R) => {
    c.save();
    c.beginPath(); c.arc(0, 0, R, 0, Math.PI * 2); c.clip();
    c.lineCap = 'round';
    for (let i = 0; i < n; i++) {
      const a0 = (i / n) * Math.PI * 2 + hash01(i, 31) * 1.2;
      const x0 = Math.cos(a0) * R * 0.92, y0 = Math.sin(a0) * R * 0.92;
      // One wandering polyline from the rim inward, drawn three times:
      // wide dark crust split, molten seam, white-hot core.
      const pass = (wMul: number, col: string, alpha: number): void => {
        c.strokeStyle = withAlpha(col, alpha);
        c.lineWidth = Math.max(0.8, R * wMul);
        let px = x0, py = y0, ang = a0 + Math.PI;
        c.beginPath(); c.moveTo(px, py);
        for (let s = 0; s < 3; s++) {
          ang += (hash01(i * 7 + s, 37) - 0.5) * 0.9;
          px += Math.cos(ang) * R * 0.34;
          py += Math.sin(ang) * R * 0.34;
          c.lineTo(px, py);
        }
        c.stroke();
      };
      pass(0.1, pal.dark, 0.85);
      pass(0.045, glow, 0.9);
      pass(0.02, '#ffe9b8', 0.75);
    }
    c.restore();
  });
};

const veinweb: PartPainter = (ctx, r, spec, pal, t = 0) => {
  const col = spec.color ?? pal.accent.light;
  const n = Math.round(P(spec, 'n', 5));
  place(ctx, r, spec, (c, R) => {
    const throb = 0.5 + 0.5 * Math.sin(t * 2.6);
    c.strokeStyle = withAlpha(col, 0.3 + 0.25 * throb);
    c.lineCap = 'round';
    for (let i = 0; i < n; i++) {
      const a0 = (i / n) * Math.PI * 2 + hash01(i, 71) * 0.8;
      let x = Math.cos(a0) * R * 0.16, y = Math.sin(a0) * R * 0.16;
      let ang = a0;
      c.lineWidth = Math.max(1, R * 0.05);
      c.beginPath();
      c.moveTo(x, y);
      for (let s = 0; s < 3; s++) {
        ang += (hash01(i * 5 + s, 77) - 0.5) * 1.1;
        x += Math.cos(ang) * R * 0.26;
        y += Math.sin(ang) * R * 0.26;
        c.lineTo(x, y);
      }
      c.stroke();
      c.lineWidth = Math.max(0.8, R * 0.03);
      c.beginPath();
      c.moveTo(x, y);
      c.lineTo(x + Math.cos(ang + 0.9) * R * 0.14, y + Math.sin(ang + 0.9) * R * 0.14);
      c.stroke();
    }
  });
};

/** POLYPS — glow-tipped nubs clustered like an anemone bed. params: n. */
const polyps: PartPainter = (ctx, r, spec, pal) => {
  const ramp = rampFor(spec, pal, 'base');
  const glow = spec.color ?? pal.glow;
  const n = Math.round(P(spec, 'n', 6));
  place(ctx, r, spec, (c, R) => {
    for (let i = 0; i < n; i++) {
      const a = hash01(i, 83) * Math.PI * 2;
      const d = Math.sqrt(hash01(i, 89)) * R * 0.6;
      const x = Math.cos(a) * d, y = Math.sin(a) * d;
      const s = R * (0.08 + hash01(i, 97) * 0.07);
      c.fillStyle = shade(ramp.base, (hash01(i, 101) - 0.5) * 0.2);
      c.beginPath(); c.arc(x, y, s, 0, Math.PI * 2); c.fill();
      c.strokeStyle = withAlpha(ramp.outline, 0.5);
      c.lineWidth = 0.8;
      c.stroke();
      c.fillStyle = withAlpha(glow, 0.85);
      c.beginPath(); c.arc(x, y, s * 0.4, 0, Math.PI * 2); c.fill();
    }
  });
};

/** LIVE: SLIME TRAIL — ooze blobs shed behind the body, sagging and fading
 *  as they age. params: n. */
const slimeTrail: PartPainter = (ctx, r, spec, pal, t = 0) => {
  const col = spec.color ?? pal.base.base;
  const n = Math.round(P(spec, 'n', 4));
  place(ctx, r, spec, (c, R) => {
    for (let i = 0; i < n; i++) {
      const age = ((t * 0.5 + i / n) % 1);
      const x = -R * (0.6 + age * 1.5);
      const y = Math.sin(i * 2.7 + Math.floor(t * 0.5 + i / n) * 3.3) * R * 0.3;
      const s = R * 0.2 * (1 - age * 0.6);
      c.globalAlpha = 0.4 * (1 - age);
      c.fillStyle = col;
      c.beginPath();
      c.ellipse(x, y, s * 1.25, s * 0.85, 0, 0, Math.PI * 2);
      c.fill();
      c.globalAlpha = 0.3 * (1 - age);
      c.fillStyle = shade(col, 0.3);
      c.beginPath(); c.arc(x - s * 0.3, y - s * 0.25, s * 0.3, 0, Math.PI * 2); c.fill();
      c.globalAlpha = 1;
    }
  });
};

/** A SAILFIN — a spined membrane running the spine, translucent between the
 *  rays: the silhouette you see coming across the water. params: spines. */
const sailfin: PartPainter = (ctx, r, spec, pal) => {
  const ramp = rampFor(spec, pal, 'accent');
  const spines = Math.round(P(spec, 'spines', 5));
  place(ctx, r, spec, (c, R) => {
    // The membrane: a scalloped ridge from tail to crown along the axis.
    c.beginPath();
    c.moveTo(-R * 0.95, 0);
    for (let i = 0; i < spines; i++) {
      const f = i / (spines - 1);
      const x = -R * 0.95 + f * R * 1.25;
      const h = R * (0.26 + Math.sin(f * Math.PI) * 0.3);
      c.quadraticCurveTo(x - R * 0.06, -h, x, -h * (i === spines - 1 ? 0.4 : 0.72));
    }
    c.lineTo(R * 0.3, 0);
    c.closePath();
    c.globalAlpha = 0.55;
    c.fillStyle = ramp.base;
    c.fill();
    c.globalAlpha = 1;
    outlined(c, ramp, 1);
    // The rays.
    c.strokeStyle = withAlpha(ramp.outline, 0.7);
    c.lineWidth = Math.max(1, R * 0.045);
    for (let i = 0; i < spines; i++) {
      const f = i / (spines - 1);
      const x = -R * 0.95 + f * R * 1.25;
      const h = R * (0.26 + Math.sin(f * Math.PI) * 0.3);
      c.beginPath();
      c.moveTo(x, 0);
      c.lineTo(x, -h);
      c.stroke();
    }
  });
};

/** A WARHORN slung at the flank — a curled spiral with a banded mouth: the
 *  raid about to be announced. */
const warhorn: PartPainter = (ctx, r, spec, pal) => {
  const ramp = rampFor(spec, pal, 'bone');
  place(ctx, r, spec, (c, R) => {
    c.lineCap = 'round';
    c.strokeStyle = ramp.base;
    c.lineWidth = Math.max(2.5, R * 0.16);
    c.beginPath();
    c.arc(-R * 0.35, R * 0.55, R * 0.3, -0.6, Math.PI * 1.05);
    c.stroke();
    c.strokeStyle = ramp.light;
    c.lineWidth = Math.max(1, R * 0.05);
    c.beginPath();
    c.arc(-R * 0.35, R * 0.55, R * 0.36, -0.4, 0.9);
    c.stroke();
    // The bell mouth + binding band.
    c.fillStyle = shade(ramp.base, -0.25);
    c.beginPath();
    c.ellipse(-R * 0.06, R * 0.48, R * 0.11, R * 0.08, -0.5, 0, Math.PI * 2);
    c.fill();
    c.strokeStyle = withAlpha(pal.metal.base, 0.9);
    c.lineWidth = Math.max(1.2, R * 0.06);
    c.beginPath();
    c.arc(-R * 0.35, R * 0.55, R * 0.3, Math.PI * 0.55, Math.PI * 0.8);
    c.stroke();
  });
};

/** DRAPE — limp weed/cloth strands trailing off the body: the drowned look,
 *  or a banner nobody washed. params: n. */
const drape: PartPainter = (ctx, r, spec, pal) => {
  const ramp = rampFor(spec, pal, 'cloth');
  const n = Math.round(P(spec, 'n', 5));
  place(ctx, r, spec, (c, R) => {
    c.lineCap = 'round';
    for (let i = 0; i < n; i++) {
      const off = (i / Math.max(1, n - 1) - 0.5) * R * 1.1;
      const len = R * (0.5 + hash01(i, 103) * 0.5);
      const droop = (hash01(i, 107) - 0.3) * R * 0.3;
      c.strokeStyle = shade(ramp.base, (hash01(i, 109) - 0.6) * 0.24);
      c.lineWidth = Math.max(1.4, R * (0.09 - i * 0.008));
      c.beginPath();
      c.moveTo(-R * 0.3, off);
      c.quadraticCurveTo(-R * 0.7, off + droop, -R * 0.3 - len, off + droop * 1.6);
      c.stroke();
    }
  });
};

// ====================================================== DEPLOYED CONSTRUCTS

/** A BARRIER ROW — stakes/slabs rammed side-by-side across the facing
 *  (top-down: a footing bar under a line of studded heads). The wall-segment
 *  limb: bone palisades, stone ramparts, ice walls — one painter, the
 *  palette does the material. params: n (stakes), span (full width in
 *  radii). */
const stakeRow: PartPainter = (ctx, r, spec, pal) => {
  const ramp = rampFor(spec, pal, 'bone');
  const n = Math.round(P(spec, 'n', 4));
  const span = P(spec, 'span', 1.9);
  place(ctx, r, spec, (c, R) => {
    const w = R * span;
    // The packed footing bar.
    c.fillStyle = shade(ramp.base, -0.25);
    c.fillRect(-R * 0.28, -w / 2, R * 0.56, w);
    c.strokeStyle = ramp.outline;
    c.lineWidth = 1.2;
    c.strokeRect(-R * 0.28, -w / 2, R * 0.56, w);
    // Stake heads, shoulder to shoulder.
    for (let i = 0; i < n; i++) {
      const y = -w / 2 + (i + 0.5) * (w / n);
      const rr = (w / n) * 0.46;
      c.fillStyle = shade(ramp.base, (hash01(i, 7) - 0.5) * 0.2);
      c.beginPath(); c.arc(0, y, rr, 0, Math.PI * 2); c.fill();
      c.strokeStyle = withAlpha(ramp.outline, 0.8);
      c.lineWidth = 1;
      c.stroke();
      // The lit point of each head.
      c.fillStyle = withAlpha(ramp.highlight, 0.75);
      c.beginPath(); c.arc(rr * 0.24, y - rr * 0.3, rr * 0.34, 0, Math.PI * 2); c.fill();
    }
  });
};

/** A CARVED TOTEM POST from above: stacked ring courses, radial carve
 *  notches, a glowing sigil eye at heart. params: rings; glow (color). */
const totemPost: PartPainter = (ctx, r, spec, pal) => {
  const ramp = rampFor(spec, pal, 'wood');
  const rings = Math.round(P(spec, 'rings', 3));
  place(ctx, r, spec, (c, R) => {
    for (let i = rings; i >= 1; i--) {
      const rr = R * (0.35 + 0.65 * (i / rings));
      c.fillStyle = shade(ramp.base, i % 2 ? -0.12 : 0.06);
      c.beginPath(); c.arc(0, 0, rr, 0, Math.PI * 2); c.fill();
      if (i === rings) {
        c.strokeStyle = ramp.outline;
        c.lineWidth = 1.3;
        c.stroke();
      }
    }
    // Radial carve notches.
    c.strokeStyle = withAlpha(ramp.shadow, 0.9);
    c.lineWidth = Math.max(1.2, R * 0.07);
    for (let i = 0; i < 8; i++) {
      const a = (i / 8) * Math.PI * 2 + 0.3;
      c.beginPath();
      c.moveTo(Math.cos(a) * R * 0.4, Math.sin(a) * R * 0.4);
      c.lineTo(Math.cos(a) * R * 0.92, Math.sin(a) * R * 0.92);
      c.stroke();
    }
    // The sigil eye.
    const glow = PS(spec, 'glow') ?? pal.glow;
    c.fillStyle = withAlpha(glow, 0.9);
    c.beginPath(); c.arc(0, 0, R * 0.22, 0, Math.PI * 2); c.fill();
    c.fillStyle = withAlpha('#ffffff', 0.8);
    c.beginPath(); c.arc(0, 0, R * 0.1, 0, Math.PI * 2); c.fill();
  });
};

// --- Hazard-kit kin: library fill for the entity creator ---------------------

/** CRYSTAL GROWTHS — faceted shards erupting from the hide (gem-crusted
 *  beasts, lattice golems). Each shard is two faces meeting at a spine; in a
 *  look's live[] the glint walks the spine, baked it freezes mid-gleam.
 *  params: n. */
const crystalGrowths: PartPainter = (ctx, r, spec, pal, t = 0) => {
  const ramp = rampFor(spec, pal, 'accent');
  const n = Math.round(P(spec, 'n', 4));
  place(ctx, r, spec, (c, R) => {
    for (let i = 0; i < n; i++) {
      const a = hash01(i, 61) * Math.PI * 2;
      const d = Math.sqrt(hash01(i, 67)) * R * 0.5;
      const bx = Math.cos(a) * d, by = Math.sin(a) * d;
      const len = R * (0.3 + hash01(i, 71) * 0.3);
      const ta = a + (hash01(i, 73) - 0.5) * 0.8;
      const tx = bx + Math.cos(ta) * len, ty = by + Math.sin(ta) * len;
      const pw = R * (0.08 + hash01(i, 79) * 0.05);
      const px = Math.cos(ta + Math.PI / 2) * pw, py = Math.sin(ta + Math.PI / 2) * pw;
      c.fillStyle = shade(ramp.base, -0.18);
      c.beginPath(); c.moveTo(bx - px, by - py); c.lineTo(tx, ty); c.lineTo(bx, by); c.closePath(); c.fill();
      c.fillStyle = shade(ramp.base, 0.22);
      c.beginPath(); c.moveTo(bx + px, by + py); c.lineTo(tx, ty); c.lineTo(bx, by); c.closePath(); c.fill();
      c.strokeStyle = withAlpha(ramp.outline, 0.7);
      c.lineWidth = 1;
      c.beginPath(); c.moveTo(bx - px, by - py); c.lineTo(tx, ty); c.lineTo(bx + px, by + py); c.stroke();
      const gl = (t * 0.4 + hash01(i, 83)) % 1;
      c.fillStyle = withAlpha('#ffffff', 0.7 * Math.max(0, Math.sin(gl * Math.PI)));
      c.beginPath();
      c.arc(bx + (tx - bx) * gl, by + (ty - by) * gl, R * 0.045, 0, Math.PI * 2);
      c.fill();
    }
  });
};

/** FLOATING SHARDS — detached fragments orbiting the body on their own slow
 *  clocks (LIVE — feed it t): the unmade, the warded, anything reality has
 *  only a loose grip on. The one crystal painter that is NOT attached —
 *  crystalGrowths roots on the hide; these never touch it.
 *  params: n, orbit (ring radius in body-r units), spin (rad/s). */
const floatingShards: PartPainter = (ctx, r, spec, pal, t = 0) => {
  const ramp = rampFor(spec, pal, 'accent');
  const n = Math.round(P(spec, 'n', 5));
  const orbit = P(spec, 'orbit', 1.05);
  const spin = P(spec, 'spin', 0.5);
  place(ctx, r, spec, (c, R) => {
    for (let i = 0; i < n; i++) {
      const a0 = hash01(i, 97) * Math.PI * 2;
      const a = a0 + t * spin * (0.7 + hash01(i, 101) * 0.6);
      const bob = Math.sin(t * (0.8 + hash01(i, 103) * 0.7) + a0 * 7) * R * 0.07;
      const d = R * orbit * (0.88 + hash01(i, 107) * 0.24) + bob;
      const x = Math.cos(a) * d, y = Math.sin(a) * d;
      const s = R * (0.1 + hash01(i, 109) * 0.08);
      const ra = a + hash01(i, 113) * Math.PI;
      c.save(); c.translate(x, y); c.rotate(ra);
      c.fillStyle = shade(ramp.base, -0.15);
      c.beginPath(); c.moveTo(s, 0); c.lineTo(-s * 0.5, s * 0.6); c.lineTo(-s * 0.5, -s * 0.6); c.closePath(); c.fill();
      c.fillStyle = shade(ramp.base, 0.25);
      c.beginPath(); c.moveTo(s, 0); c.lineTo(-s * 0.5, -s * 0.6); c.lineTo(-s * 0.15, 0); c.closePath(); c.fill();
      c.strokeStyle = withAlpha(ramp.outline, 0.6); c.lineWidth = 1;
      c.beginPath(); c.moveTo(s, 0); c.lineTo(-s * 0.5, s * 0.6); c.lineTo(-s * 0.5, -s * 0.6); c.closePath(); c.stroke();
      c.restore();
    }
  });
};

/** ROOTS — kinked, tapering root tendrils trailing off the rear arc (treants,
 *  shamblers, anything recently uprooted). params: n. */
const roots: PartPainter = (ctx, r, spec, pal) => {
  const ramp = rampFor(spec, pal, 'wood');
  const n = Math.round(P(spec, 'n', 5));
  place(ctx, r, spec, (c, R) => {
    c.lineCap = 'round';
    for (let i = 0; i < n; i++) {
      const a = Math.PI + (i / Math.max(1, n - 1) - 0.5) * 2.2;
      let x = Math.cos(a) * R * 0.7, y = Math.sin(a) * R * 0.7;
      let ang = a;
      let w = Math.max(1.6, R * 0.11);
      c.strokeStyle = shade(ramp.base, (hash01(i, 31) - 0.5) * 0.2);
      for (let s = 0; s < 3; s++) {
        const nx = x + Math.cos(ang) * R * (0.2 + hash01(i * 3 + s, 37) * 0.16);
        const ny = y + Math.sin(ang) * R * (0.2 + hash01(i * 3 + s, 37) * 0.16);
        c.lineWidth = w;
        c.beginPath(); c.moveTo(x, y); c.lineTo(nx, ny); c.stroke();
        x = nx; y = ny;
        ang += (hash01(i * 5 + s, 41) - 0.5) * 1.1;
        w *= 0.66;
      }
    }
  });
};

/** STITCH SEAMS — puckered surgical seams crossed by their stitches: sewn
 *  abominations, flesh-golems, anything assembled in a hurry. params: n. */
const stitchSeams: PartPainter = (ctx, r, spec, pal) => {
  const ramp = rampFor(spec, pal, 'dark');
  const n = Math.round(P(spec, 'n', 3));
  place(ctx, r, spec, (c, R) => {
    c.lineCap = 'round';
    for (let i = 0; i < n; i++) {
      const a0 = hash01(i, 91) * Math.PI * 2;
      const d = Math.sqrt(hash01(i, 93)) * R * 0.45;
      const cx = Math.cos(a0) * d, cy = Math.sin(a0) * d;
      const ang = hash01(i, 97) * Math.PI;
      const len = R * (0.3 + hash01(i, 101) * 0.24);
      const dx = Math.cos(ang), dy = Math.sin(ang);
      c.strokeStyle = withAlpha(ramp.shadow, 0.9);
      c.lineWidth = Math.max(1.2, R * 0.05);
      c.beginPath();
      c.moveTo(cx - dx * len, cy - dy * len);
      c.lineTo(cx + dx * len, cy + dy * len);
      c.stroke();
      const ticks = 3 + (i % 2);
      c.lineWidth = Math.max(1, R * 0.035);
      c.strokeStyle = withAlpha(ramp.base, 0.9);
      for (let k = 0; k < ticks; k++) {
        const f = -0.7 + (k / (ticks - 1)) * 1.4;
        const px = cx + dx * len * f, py = cy + dy * len * f;
        c.beginPath();
        c.moveTo(px - dy * R * 0.08, py + dx * R * 0.08);
        c.lineTo(px + dy * R * 0.08, py - dx * R * 0.08);
        c.stroke();
      }
    }
  });
};

/** An UNOPENED CHEST — plank body with a rounded lid end, the lid seam (and
 *  the light that leaks through it), iron straps with rivets, a hasp lock
 *  waiting at the facing end. The strongboxes to come ride params: straps,
 *  lock, glow / glowColor. */
const chest: PartPainter = (ctx, r, spec, pal) => {
  const wood = rampFor(spec, pal, 'wood');
  const iron = rampFor(spec, pal, 'metal');
  const straps = Math.round(P(spec, 'straps', 2));
  const glow = P(spec, 'glow', 0.5);
  place(ctx, r, spec, (c, R) => {
    const hw = R * 0.8, hh = R * 0.56;
    c.fillStyle = wood.base;
    c.beginPath();
    c.moveTo(-hw, -hh);
    c.lineTo(hw * 0.66, -hh);
    c.quadraticCurveTo(hw, -hh, hw, 0);
    c.quadraticCurveTo(hw, hh, hw * 0.66, hh);
    c.lineTo(-hw, hh);
    c.closePath();
    c.fill();
    outlined(c, wood, 1.2);
    // Plank lines.
    c.strokeStyle = withAlpha(wood.shadow, 0.55);
    c.lineWidth = 1;
    for (const fy of [-0.68, 0.68]) {
      c.beginPath();
      c.moveTo(-hw * 0.96, hh * fy);
      c.lineTo(hw * 0.9, hh * fy);
      c.stroke();
    }
    // The lid seam — and whatever's inside, leaking through it.
    c.strokeStyle = withAlpha(wood.outline, 0.8);
    c.lineWidth = 1.2;
    c.beginPath(); c.moveTo(hw * 0.3, -hh); c.lineTo(hw * 0.3, hh); c.stroke();
    if (glow > 0) {
      c.strokeStyle = withAlpha(PS(spec, 'glowColor') ?? pal.glow, glow * 0.55);
      c.lineWidth = 2.2;
      c.beginPath(); c.moveTo(hw * 0.3, -hh * 0.78); c.lineTo(hw * 0.3, hh * 0.78); c.stroke();
    }
    // Iron straps, each riveted and catching an edge of light.
    for (let i = 0; i < straps; i++) {
      const sx = -hw + ((i + 0.6) / (straps + 0.4)) * hw * 1.2;
      c.fillStyle = iron.base;
      c.fillRect(sx - R * 0.055, -hh - 1, R * 0.11, hh * 2 + 2);
      c.fillStyle = withAlpha(iron.highlight, 0.7);
      c.fillRect(sx - R * 0.055, -hh - 1, R * 0.035, hh * 2 + 2);
      c.fillStyle = iron.shadow;
      for (const fy of [-0.72, 0.72]) {
        c.beginPath(); c.arc(sx, hh * fy, R * 0.035, 0, Math.PI * 2); c.fill();
      }
    }
    // The hasp and its lock, waiting at the lid end.
    if (P(spec, 'lock', 1) > 0) {
      c.beginPath();
      c.rect(hw * 0.56, -R * 0.1, R * 0.3, R * 0.2);
      c.fillStyle = iron.base;
      c.fill();
      outlined(c, iron, 1);
      c.strokeStyle = iron.shadow;
      c.lineWidth = 1.2;
      c.beginPath(); c.arc(hw * 0.88, 0, R * 0.07, 0, Math.PI * 2); c.stroke();
      c.fillStyle = iron.shadow;
      c.beginPath(); c.arc(hw * 0.88, 0, R * 0.025, 0, Math.PI * 2); c.fill();
    }
  });
};

/** TRAILING VEIL-SASHES — the Sirocco Court's cloth in a wind that never
 *  quits. Live (reads t for the stream); params: sashes (count). The
 *  entity-creator's "always in motion" cloth word. */
const veilSashes: PartPainter = (ctx, r, spec, pal, t = 0) => {
  const ramp = rampFor(spec, pal, 'cloth');
  const sashes = P(spec, 'sashes', 3);
  place(ctx, r, spec, (c, R) => {
    c.lineCap = 'round';
    for (let i = 0; i < sashes; i++) {
      const a = Math.PI + (i - (sashes - 1) / 2) * 0.55;
      const sway = Math.sin(t * 2.3 + i * 1.9) * 0.35;
      c.strokeStyle = withAlpha(i % 2 ? ramp.light : ramp.base, 0.85);
      c.lineWidth = Math.max(1.2, R * (0.11 - i * 0.015));
      c.beginPath();
      c.moveTo(Math.cos(a) * R * 0.3, Math.sin(a) * R * 0.3);
      c.quadraticCurveTo(
        Math.cos(a + sway) * R * 0.85, Math.sin(a + sway) * R * 0.85,
        Math.cos(a + sway * 1.6) * R * 1.3, Math.sin(a + sway * 1.6) * R * 1.3);
      c.stroke();
    }
  });
};

/** TRANSLUCENT GLASS FINS — light going through a body the wrong way (the
 *  glasspan's ambusher). Static; params: fins (count). */
const glassFins: PartPainter = (ctx, r, spec, pal) => {
  const ramp = rampFor(spec, pal, 'accent');
  const fins = P(spec, 'fins', 4);
  place(ctx, r, spec, (c, R) => {
    for (let i = 0; i < fins; i++) {
      const a = (i / fins) * Math.PI * 2 + 0.4;
      c.save();
      c.rotate(a);
      c.fillStyle = withAlpha(ramp.light, 0.32);
      c.beginPath();
      c.moveTo(R * 0.3, 0);
      c.lineTo(R * 1.12, -R * 0.16);
      c.lineTo(R * 0.98, R * 0.1);
      c.closePath();
      c.fill();
      c.strokeStyle = withAlpha(ramp.highlight, 0.75);
      c.lineWidth = 1;
      c.stroke();
      c.restore();
    }
  });
};

/** A hanging BELL under its yoke — doom-heralds, plague criers, the tolling
 *  faithful. In live[] it sways; params: swing. */
const bell: PartPainter = (ctx, r, spec, pal, t = 0) => {
  const ramp = rampFor(spec, pal, 'metal');
  place(ctx, r, spec, (c, R) => {
    c.strokeStyle = shade(ramp.base, -0.25);
    c.lineWidth = Math.max(1.4, R * 0.07);
    c.beginPath(); c.moveTo(-R * 0.3, 0); c.lineTo(R * 0.3, 0); c.stroke();
    c.save();
    c.rotate(Math.sin(t * 2.1) * P(spec, 'swing', 0.14));
    c.fillStyle = ramp.base;
    c.beginPath();
    c.moveTo(-R * 0.16, R * 0.08);
    c.quadraticCurveTo(-R * 0.2, R * 0.42, -R * 0.3, R * 0.52);
    c.lineTo(R * 0.3, R * 0.52);
    c.quadraticCurveTo(R * 0.2, R * 0.42, R * 0.16, R * 0.08);
    c.closePath();
    c.fill();
    outlined(c, ramp, 1.1);
    c.strokeStyle = withAlpha(ramp.highlight, 0.6);
    c.lineWidth = 1;
    c.beginPath(); c.moveTo(-R * 0.24, R * 0.4); c.lineTo(R * 0.24, R * 0.4); c.stroke();
    c.fillStyle = shade(ramp.base, -0.4);
    c.beginPath(); c.arc(0, R * 0.6, R * 0.07, 0, Math.PI * 2); c.fill();
    c.restore();
  });
};

/** THE BEAT PIPS — a carried measure made visible: n small pips in a
 *  shallow fan that kindle ONE AFTER ANOTHER on the clock. The cadence
 *  kin's grammar-tell (their combo rules ARE the player's — the pips say
 *  "this one keeps time" at a glance), and any future music/beat kit's:
 *  a skald's verses, a metronome construct. Static bakes (no t) show the
 *  fan dim. params: n (default 3), rate (beats/s, default 1.6). */
const beatPips: PartPainter = (ctx, r, spec, pal, t) => {
  const ramp = rampFor(spec, pal, 'glow');
  const n = Math.max(2, Math.round(P(spec, 'n', 3)));
  const rate = P(spec, 'rate', 1.6);
  place(ctx, r, spec, (c, R) => {
    const span = Math.PI * 0.5;
    const beat = t === undefined ? -1 : Math.floor(t * rate) % n;
    const frac = t === undefined ? 0 : (t * rate) % 1;
    for (let i = 0; i < n; i++) {
      const a = -span / 2 + (i / (n - 1)) * span;
      const px = Math.cos(a) * R * 0.85;
      const py = Math.sin(a) * R * 0.85;
      const live = i === beat ? Math.max(0, 1 - frac) : 0;
      c.fillStyle = withAlpha(ramp.base, 0.35 + live * 0.65);
      c.beginPath();
      c.arc(px, py, R * (0.1 + live * 0.06), 0, Math.PI * 2);
      c.fill();
      if (live > 0.4) {
        c.strokeStyle = withAlpha(ramp.highlight, live * 0.8);
        c.lineWidth = 1;
        c.beginPath(); c.arc(px, py, R * 0.16, 0, Math.PI * 2); c.stroke();
      }
    }
  });
};

// ===================================================== THE KEEPER'S TACK
// Adornment parts for kept, worked, and bonded beasts — collars, straps,
// bags, cages. They read at a glance ON TOP of any body (the entity
// creator's dress-up drawer), and the tamed-claim stamps 'collar' onto
// claimed companions at runtime (TAME_CFG.claimParts).

/** Neck band worn forward of center: strap ring + studs + a hanging tag.
 *  params: studs (n, default 4), tag (bool, default true). */
/** THE SHROUD WRAP: burial cloth wound across the body in sagging bands,
 *  loose tails trailing off the hip — the charnel kit's dress for anything
 *  that should read as "buried once already". (params: bands) */
const shroudWrap: PartPainter = (ctx, r, spec, pal) => {
  const ramp = rampFor(spec, pal, 'cloth');
  const bands = Math.round(P(spec, 'bands', 3));
  place(ctx, r, spec, (c, R) => {
    c.lineCap = 'round';
    c.strokeStyle = ramp.base;
    for (let i = 0; i < bands; i++) {
      const t = (i + 0.5) / bands;
      const x = R * (0.55 - t * 1.05);
      const sag = R * (0.08 + 0.05 * ((i * 7) % 3));
      c.lineWidth = Math.max(2, R * (0.17 - 0.02 * i));
      c.beginPath();
      c.moveTo(x, -R * 0.6);
      c.quadraticCurveTo(x - sag, 0, x, R * 0.6);
      c.stroke();
    }
    // The dark seams between windings.
    c.strokeStyle = withAlpha('#14100c', 0.4);
    c.lineWidth = Math.max(1, R * 0.04);
    for (let i = 1; i < bands; i++) {
      const x = R * (0.55 - (i / bands) * 1.05) + R * 0.08;
      c.beginPath(); c.moveTo(x, -R * 0.46); c.lineTo(x, R * 0.46); c.stroke();
    }
    // Loose tails — the wrapping stopped caring near the end.
    c.strokeStyle = ramp.highlight;
    c.lineWidth = Math.max(1.5, R * 0.07);
    c.beginPath();
    c.moveTo(-R * 0.5, R * 0.2);
    c.quadraticCurveTo(-R * 0.85, R * 0.42, -R * 0.78, R * 0.64);
    c.stroke();
    c.beginPath();
    c.moveTo(-R * 0.52, -R * 0.16);
    c.quadraticCurveTo(-R * 0.92, -R * 0.22, -R * 1.0, -R * 0.02);
    c.stroke();
    c.lineCap = 'butt';
  });
};

/** CANOPIC JAR: a lidded funerary urn — ovoid body, banded shoulder, and a
 *  STOPPER whose shape names its ward at a glance (params.stopper: 0 plain
 *  knob / 1 eared jackal / 2 beaked falcon / 3 domed ape / 4 human brow).
 *  One jar per part instance — looks compose hip arcs with x/y/mirror. */
const canopicJar: PartPainter = (ctx, r, spec, pal) => {
  const body = rampFor(spec, pal, 'bone');
  const lid = rampFor(spec, pal, 'metal');
  const stopper = Math.round(P(spec, 'stopper', 0));
  place(ctx, r, spec, (c, R) => {
    // The vessel: a shouldered ovoid, foot narrower than the belly.
    c.fillStyle = body.base;
    c.beginPath();
    c.moveTo(-R * 0.34, -R * 0.18);
    c.quadraticCurveTo(-R * 0.46, R * 0.28, -R * 0.2, R * 0.52);
    c.lineTo(R * 0.2, R * 0.52);
    c.quadraticCurveTo(R * 0.46, R * 0.28, R * 0.34, -R * 0.18);
    c.closePath();
    c.fill();
    outlined(c, body, 1.1);
    // The shoulder band + a scored ward-line (the embalmer's script).
    c.strokeStyle = withAlpha(lid.base, 0.85);
    c.lineWidth = Math.max(1.2, R * 0.09);
    c.beginPath(); c.moveTo(-R * 0.33, -R * 0.1); c.lineTo(R * 0.33, -R * 0.1); c.stroke();
    c.strokeStyle = withAlpha(body.shadow, 0.6);
    c.lineWidth = 1;
    c.beginPath(); c.moveTo(-R * 0.26, R * 0.18); c.lineTo(R * 0.26, R * 0.18); c.stroke();
    // The stopper: gilded, shaped to its ward.
    c.fillStyle = lid.base;
    c.beginPath(); c.ellipse(0, -R * 0.26, R * 0.24, R * 0.18, 0, 0, Math.PI * 2); c.fill();
    outlined(c, lid, 1);
    if (stopper === 1) { // jackal: two up-pricked ears
      c.beginPath();
      c.moveTo(-R * 0.18, -R * 0.3); c.lineTo(-R * 0.26, -R * 0.56); c.lineTo(-R * 0.04, -R * 0.38);
      c.moveTo(R * 0.18, -R * 0.3); c.lineTo(R * 0.26, -R * 0.56); c.lineTo(R * 0.04, -R * 0.38);
      c.fillStyle = lid.base; c.fill();
    } else if (stopper === 2) { // falcon: a hooked beak forward
      c.beginPath();
      c.moveTo(R * 0.1, -R * 0.32); c.quadraticCurveTo(R * 0.4, -R * 0.34, R * 0.34, -R * 0.14);
      c.lineTo(R * 0.12, -R * 0.2); c.closePath();
      c.fillStyle = lid.base; c.fill();
    } else if (stopper === 3) { // ape: a high dome
      c.beginPath(); c.arc(0, -R * 0.34, R * 0.16, Math.PI, 0); c.fillStyle = lid.highlight; c.fill();
    } else if (stopper === 4) { // human: a brow line over painted eyes
      c.strokeStyle = pal.dark; c.lineWidth = Math.max(1, R * 0.05);
      c.beginPath(); c.moveTo(-R * 0.14, -R * 0.28); c.lineTo(R * 0.14, -R * 0.28); c.stroke();
    } else { // plain knob
      c.beginPath(); c.arc(0, -R * 0.34, R * 0.08, 0, Math.PI * 2); c.fillStyle = lid.highlight; c.fill();
    }
  });
};

/** SARCOPHAGUS LID: the anthropoid case — a round-headed slab with a carved
 *  gilt face and crossed-arm band lines. Worn on the back it makes a body a
 *  walking tomb; scaled down it serves as a lid-shield. (params: face 0|1
 *  carves the visage, cracks 0..1 scores battle damage.) */
const sarcophagusLid: PartPainter = (ctx, r, spec, pal) => {
  const stone = rampFor(spec, pal, 'bone');
  const gilt = rampFor(spec, pal, 'metal');
  const face = P(spec, 'face', 1);
  const cracks = P(spec, 'cracks', 0);
  place(ctx, r, spec, (c, R) => {
    const hw = R * 0.46, hh = R * 0.78;
    // The slab: head-end (facing +X) rounded wide, foot-end tapered.
    c.fillStyle = stone.base;
    c.beginPath();
    c.moveTo(-hh, -hw * 0.72);
    c.lineTo(hh * 0.28, -hw);
    c.quadraticCurveTo(hh, -hw, hh, 0);
    c.quadraticCurveTo(hh, hw, hh * 0.28, hw);
    c.lineTo(-hh, hw * 0.72);
    c.closePath();
    c.fill();
    outlined(c, stone, 1.3);
    // The gilt rim inside the edge.
    c.strokeStyle = withAlpha(gilt.base, 0.8);
    c.lineWidth = Math.max(1.2, R * 0.06);
    c.beginPath();
    c.moveTo(-hh * 0.88, -hw * 0.6);
    c.lineTo(hh * 0.26, -hw * 0.84);
    c.quadraticCurveTo(hh * 0.84, -hw * 0.84, hh * 0.84, 0);
    c.quadraticCurveTo(hh * 0.84, hw * 0.84, hh * 0.26, hw * 0.84);
    c.lineTo(-hh * 0.88, hw * 0.6);
    c.closePath();
    c.stroke();
    // Crossed-arm bands over the chest third.
    c.strokeStyle = withAlpha(gilt.shadow, 0.75);
    c.lineWidth = Math.max(1.2, R * 0.07);
    c.beginPath(); c.moveTo(-hh * 0.1, -hw * 0.7); c.lineTo(hh * 0.3, hw * 0.55); c.stroke();
    c.beginPath(); c.moveTo(-hh * 0.1, hw * 0.7); c.lineTo(hh * 0.3, -hw * 0.55); c.stroke();
    if (face > 0) {
      // The carved visage at the head end: gilt mask oval, painted eyes.
      c.fillStyle = gilt.base;
      c.beginPath(); c.ellipse(hh * 0.62, 0, R * 0.22, R * 0.17, 0, 0, Math.PI * 2); c.fill();
      outlined(c, gilt, 1);
      c.fillStyle = pal.dark;
      for (const s of [-1, 1]) {
        c.beginPath(); c.ellipse(hh * 0.66, s * R * 0.07, R * 0.045, R * 0.028, 0, 0, Math.PI * 2); c.fill();
      }
    }
    if (cracks > 0) {
      // Battle scoring: the case remembers being opened the hard way.
      c.strokeStyle = withAlpha(stone.shadow, 0.55 + 0.35 * cracks);
      c.lineWidth = Math.max(1, R * 0.045);
      c.beginPath();
      c.moveTo(-hh * 0.55, -hw * 0.3);
      c.lineTo(-hh * 0.2, hw * 0.05);
      c.lineTo(-hh * 0.34, hw * 0.5);
      c.stroke();
    }
  });
};

// ============================================================= SERPENT KIT

/** COBRA HOOD: the flared neck-shield behind a serpent's head — a broad
 *  spade widest just behind the skull, ribbed like stretched skin, with an
 *  optional pair of "spectacle" eyespots (the classic warning). THE naga
 *  tell: scale it slight for a skirmisher's half-flare, huge for a spitter
 *  in full threat. (params: flare width mul, ribs, spectacle 0|1) */
const cobraHood: PartPainter = (ctx, r, spec, pal) => {
  const ramp = rampFor(spec, pal, 'base');
  const flare = P(spec, 'flare', 1);
  const ribs = Math.round(P(spec, 'ribs', 4));
  const spectacle = P(spec, 'spectacle', 1);
  place(ctx, r, spec, (c, R) => {
    const w = R * 0.92 * flare;
    const trace = (): void => {
      c.beginPath();
      c.moveTo(R * 0.42, 0);
      c.quadraticCurveTo(R * 0.34, -w * 0.85, -R * 0.28, -w);
      c.quadraticCurveTo(-R * 0.95, -w * 0.5, -R * 1.05, 0);
      c.quadraticCurveTo(-R * 0.95, w * 0.5, -R * 0.28, w);
      c.quadraticCurveTo(R * 0.34, w * 0.85, R * 0.42, 0);
      c.closePath();
    };
    trace(); c.fillStyle = ramp.base; c.fill();
    volume(c, R, ramp, trace);
    // Stretched-skin ribs fanning back from the throat.
    c.strokeStyle = withAlpha(ramp.shadow, 0.55);
    c.lineWidth = Math.max(1, R * 0.05);
    for (let i = 1; i <= ribs; i++) {
      const t = i / (ribs + 1);
      for (const s of [-1, 1]) {
        c.beginPath();
        c.moveTo(R * 0.34, 0);
        c.quadraticCurveTo(-R * 0.1, s * w * t * 0.9, -R * (0.5 + 0.4 * t), s * w * t * 0.55);
        c.stroke();
      }
    }
    if (spectacle > 0) {
      // The warning eyespots, one per wing of the hood.
      const eye = pal.accent;
      c.lineWidth = Math.max(1, R * 0.06);
      for (const s of [-1, 1]) {
        c.strokeStyle = withAlpha(eye.highlight, 0.8);
        c.beginPath(); c.arc(-R * 0.38, s * w * 0.52, R * 0.15, 0, Math.PI * 2); c.stroke();
        c.fillStyle = withAlpha(eye.shadow, 0.75);
        c.beginPath(); c.arc(-R * 0.38, s * w * 0.52, R * 0.065, 0, Math.PI * 2); c.fill();
      }
    }
    trace(); outlined(c, ramp, 1.2);
  });
};

/** FANG JAW: the unhinged strike-gape — a dark open throat notched into the
 *  muzzle with paired recurved fangs hooking inward. The fang-priest's icon;
 *  every venom-kin's threat display. (params: gape half-width frac, venom
 *  0..1 beads the tips from the glow tone) */
const fangJaw: PartPainter = (ctx, r, spec, pal) => {
  const ramp = rampFor(spec, pal, 'base');
  const bone = pal.bone;
  const gape = P(spec, 'gape', 0.5);
  const venom = P(spec, 'venom', 0);
  place(ctx, r, spec, (c, R) => {
    // The open throat: a dark wedge swallowing the muzzle line.
    c.fillStyle = pal.dark;
    c.beginPath();
    c.moveTo(R * 0.15, 0);
    c.lineTo(R * 1.02, -R * gape);
    c.quadraticCurveTo(R * 1.18, 0, R * 1.02, R * gape);
    c.closePath();
    c.fill();
    c.strokeStyle = withAlpha(ramp.outline, 0.8);
    c.lineWidth = 1.2;
    c.stroke();
    // Recurved fangs off each jaw tip, curving back toward the throat.
    for (const s of [-1, 1]) {
      c.fillStyle = bone.highlight;
      c.beginPath();
      c.moveTo(R * 0.94, s * R * gape * 0.92);
      c.quadraticCurveTo(R * 1.1, s * R * gape * 0.42, R * 0.8, s * R * gape * 0.14);
      c.lineTo(R * 0.78, s * R * gape * 0.5);
      c.closePath();
      c.fill();
      c.strokeStyle = withAlpha(bone.outline, 0.7);
      c.lineWidth = 1;
      c.stroke();
    }
    if (venom > 0) {
      // Venom beading where the fangs bite down.
      c.fillStyle = withAlpha(pal.glow, 0.5 + 0.4 * venom);
      for (const s of [-1, 1]) {
        c.beginPath(); c.arc(R * 0.84, s * R * gape * 0.3, R * 0.06, 0, Math.PI * 2); c.fill();
      }
    }
  });
};

/** COIL: the gathered serpent underbody — nested tube arcs sweeping behind
 *  the torso, opening toward the facing so the body reads as RISEN from its
 *  own resting coil. Stationary naga (priests, charmers, matriarchs) wear it
 *  under the torso stack. (params: loops) */
const coil: PartPainter = (ctx, r, spec, pal) => {
  const ramp = rampFor(spec, pal, 'base');
  const loops = Math.round(P(spec, 'loops', 3));
  place(ctx, r, spec, (c, R) => {
    c.lineCap = 'round';
    for (let i = loops; i >= 1; i--) {
      const t = i / loops;
      const rr = R * (0.34 + 0.52 * t);
      const lw = Math.max(2, R * (0.34 - 0.05 * i));
      const gap = 0.5 + 0.24 * (loops - i); // inner loops open wider toward the rise
      // Tube edge first, body tone over it — each loop reads as its own coil.
      c.strokeStyle = withAlpha(ramp.outline, 0.8);
      c.lineWidth = lw + Math.max(1.5, R * 0.05) * 2;
      c.beginPath(); c.arc(-R * 0.16 * t, 0, rr, gap, Math.PI * 2 - gap); c.stroke();
      c.strokeStyle = i % 2 ? ramp.shadow : ramp.base;
      c.lineWidth = lw;
      c.beginPath(); c.arc(-R * 0.16 * t, 0, rr, gap, Math.PI * 2 - gap); c.stroke();
    }
    // The tail tip slipping free of the stack.
    c.strokeStyle = withAlpha(ramp.outline, 0.8);
    c.lineWidth = Math.max(1.5, R * 0.12) + 2;
    c.beginPath();
    c.moveTo(-R * 0.82, R * 0.4);
    c.quadraticCurveTo(-R * 1.22, R * 0.18, -R * 1.08, -R * 0.1);
    c.stroke();
    c.strokeStyle = ramp.base;
    c.lineWidth = Math.max(1.5, R * 0.12);
    c.beginPath();
    c.moveTo(-R * 0.82, R * 0.4);
    c.quadraticCurveTo(-R * 1.22, R * 0.18, -R * 1.08, -R * 0.1);
    c.stroke();
  });
};

/** CARRION FLIES: a sparse standing orbit of specks with a faint shimmer
 *  ring — the charnel halo. Deterministic placement, no clock: bakes stay
 *  stable. (params: flies) */
const carrionFlies: PartPainter = (ctx, r, spec, pal) => {
  const ramp = rampFor(spec, pal, 'dark');
  const n = Math.round(P(spec, 'flies', 5));
  place(ctx, r, spec, (c, R) => {
    c.strokeStyle = withAlpha(ramp.highlight, 0.2);
    c.lineWidth = Math.max(0.8, R * 0.03);
    c.beginPath(); c.ellipse(0, -R * 0.15, R * 0.8, R * 0.5, 0.3, 0, Math.PI * 2); c.stroke();
    c.fillStyle = withAlpha(ramp.base, 0.9);
    for (let i = 0; i < n; i++) {
      const a = i * 2.4 + 1.7;
      const rr = R * (0.55 + 0.1 * (i % 3));
      c.beginPath();
      c.arc(Math.cos(a) * rr, -R * 0.15 + Math.sin(a) * rr * 0.55, Math.max(1, R * 0.045), 0, Math.PI * 2);
      c.fill();
    }
  });
};

const collar: PartPainter = (ctx, r, spec, pal) => {
  const ramp = rampFor(spec, pal, 'cloth');
  const metal = pal.metal;
  const studs = Math.round(P(spec, 'studs', 4));
  place(ctx, r, spec, (c, R) => {
    // The band: an open ellipse ring sitting where neck meets shoulders.
    const nx = R * 0.34;                    // band center, forward of body center
    const bw = R * 0.5, bh = R * 0.62;      // band footprint
    c.strokeStyle = ramp.base;
    c.lineWidth = Math.max(2, R * 0.16);
    c.beginPath(); c.ellipse(nx, 0, bw * 0.6, bh, 0, 0, Math.PI * 2); c.stroke();
    c.strokeStyle = withAlpha(ramp.highlight, 0.5);
    c.lineWidth = Math.max(1, R * 0.05);
    c.beginPath(); c.ellipse(nx, 0, bw * 0.6, bh, 0, -2.2, -0.9); c.stroke();
    // Studs ride the band.
    c.fillStyle = metal.base;
    for (let i = 0; i < studs; i++) {
      const a = (i / studs) * Math.PI * 2 + 0.4;
      c.beginPath();
      c.arc(nx + Math.cos(a) * bw * 0.6, Math.sin(a) * bh, Math.max(1, R * 0.06), 0, Math.PI * 2);
      c.fill();
    }
    // The tag hangs toward the muzzle.
    if (PB(spec, 'tag', true)) {
      c.fillStyle = metal.base;
      c.beginPath(); c.arc(nx + bw * 0.72, 0, R * 0.11, 0, Math.PI * 2); c.fill();
      c.strokeStyle = withAlpha(metal.outline, 0.7); c.lineWidth = 1; c.stroke();
      c.fillStyle = withAlpha(metal.highlight, 0.8);
      c.beginPath(); c.arc(nx + bw * 0.72 - R * 0.03, -R * 0.03, R * 0.04, 0, Math.PI * 2); c.fill();
    }
  });
};

/** Working straps crossed over the torso, cinched by a center ring —
 *  the draft-beast X. params: ring (bool, default true). */
const harness: PartPainter = (ctx, r, spec, pal) => {
  const ramp = rampFor(spec, pal, 'cloth');
  const metal = pal.metal;
  place(ctx, r, spec, (c, R) => {
    c.strokeStyle = ramp.base;
    c.lineWidth = Math.max(2, R * 0.13);
    c.lineCap = 'round';
    for (const s of [1, -1]) {
      c.beginPath();
      c.moveTo(-R * 0.62, -R * 0.5 * s);
      c.quadraticCurveTo(0, R * 0.1 * s * -0.2, R * 0.62, R * 0.5 * s);
      c.stroke();
    }
    c.strokeStyle = withAlpha(ramp.highlight, 0.4);
    c.lineWidth = Math.max(1, R * 0.04);
    c.beginPath(); c.moveTo(-R * 0.58, -R * 0.46); c.quadraticCurveTo(0, 0, R * 0.58, R * 0.46); c.stroke();
    if (PB(spec, 'ring', true)) {
      c.strokeStyle = metal.base;
      c.lineWidth = Math.max(1.6, R * 0.07);
      c.beginPath(); c.arc(0, 0, R * 0.16, 0, Math.PI * 2); c.stroke();
    }
  });
};

/** Flank panniers on a spine strap — the pack-beast's luggage (mirrored
 *  pair). params: flap (bool, default true). */
const saddlebags: PartPainter = (ctx, r, spec, pal) => {
  const ramp = rampFor(spec, pal, 'cloth');
  const wood = pal.wood;
  place(ctx, r, spec, (c, R) => {
    // The spanning strap.
    c.strokeStyle = wood.base;
    c.lineWidth = Math.max(1.6, R * 0.09);
    c.beginPath(); c.moveTo(-R * 0.1, -R * 0.72); c.lineTo(-R * 0.1, R * 0.72); c.stroke();
    // A pannier per flank.
    for (const s of [1, -1]) {
      const py = R * 0.74 * s;
      const trace = (): void => {
        c.beginPath();
        c.moveTo(-R * 0.42, py - R * 0.26 * s);
        c.quadraticCurveTo(-R * 0.5, py + R * 0.3 * s, -R * 0.1, py + R * 0.34 * s);
        c.quadraticCurveTo(R * 0.28, py + R * 0.3 * s, R * 0.22, py - R * 0.26 * s);
        c.closePath();
      };
      trace(); c.fillStyle = ramp.base; c.fill();
      volume(c, R * 0.5, ramp, trace);
      trace(); outlined(c, ramp, 1.2);
      if (PB(spec, 'flap', true)) {
        c.fillStyle = shade(ramp.base, -0.18);
        c.beginPath();
        c.moveTo(-R * 0.4, py - R * 0.24 * s);
        c.lineTo(R * 0.2, py - R * 0.24 * s);
        c.lineTo(R * 0.16, py + R * 0.02 * s);
        c.lineTo(-R * 0.36, py + R * 0.02 * s);
        c.closePath(); c.fill();
      }
    }
  });
};

/** Muzzle cage over the snout tip: hoops + a jaw strap — the kept jaw.
 *  params: hoops (n, default 3). */
const muzzle: PartPainter = (ctx, r, spec, pal) => {
  const ramp = rampFor(spec, pal, 'metal');
  const hoops = Math.round(P(spec, 'hoops', 3));
  place(ctx, r, spec, (c, R) => {
    c.strokeStyle = ramp.base;
    c.lineWidth = Math.max(1.4, R * 0.07);
    // Cage hoops shrink toward the nose (+X).
    for (let i = 0; i < hoops; i++) {
      const fx = R * (0.66 + 0.18 * i);
      const hh = R * (0.34 - 0.07 * i);
      c.beginPath(); c.ellipse(fx, 0, hh * 0.4, hh, 0, 0, Math.PI * 2); c.stroke();
    }
    // The spine bar + jaw strap back to the head.
    c.beginPath(); c.moveTo(R * 0.6, 0); c.lineTo(R * (0.66 + 0.18 * (hoops - 1)) + R * 0.05, 0); c.stroke();
    c.strokeStyle = shade(ramp.base, -0.2);
    c.beginPath(); c.moveTo(R * 0.62, -R * 0.3); c.lineTo(R * 0.4, -R * 0.5); c.stroke();
    c.beginPath(); c.moveTo(R * 0.62, R * 0.3); c.lineTo(R * 0.4, R * 0.5); c.stroke();
  });
};

/** SPHINCTER MAW — a puckered radial mouth: fold creases converging on a
 *  clenched dark seam (the flesh country's door, worn as a face).
 *  params: n (folds), gape (0..1 aperture; default clenched). */
const sphincterMaw: PartPainter = (ctx, r, spec, pal) => {
  const ramp = rampFor(spec, pal, 'base');
  const n = Math.round(P(spec, 'n', 9));
  const gape = P(spec, 'gape', 0.16);
  place(ctx, r, spec, (c, R) => {
    const S = R * 0.5;
    c.fillStyle = shade(ramp.base, -0.08);
    c.beginPath(); c.arc(0, 0, S, 0, Math.PI * 2); c.fill();
    for (let i = 0; i < n; i++) {
      const a = (i / n) * Math.PI * 2 + hash01(i, 311) * 0.2;
      c.strokeStyle = withAlpha(shade(ramp.base, i % 2 ? -0.34 : 0.14), 0.8);
      c.lineWidth = Math.max(1, S * 0.16);
      c.beginPath();
      c.moveTo(Math.cos(a) * S * 0.95, Math.sin(a) * S * 0.95);
      c.quadraticCurveTo(Math.cos(a + 0.3) * S * 0.55, Math.sin(a + 0.3) * S * 0.55,
        Math.cos(a + 0.5) * S * gape * 1.3, Math.sin(a + 0.5) * S * gape * 1.3);
      c.stroke();
    }
    c.fillStyle = pal.dark;
    c.beginPath(); c.arc(0, 0, S * Math.max(0.06, gape), 0, Math.PI * 2); c.fill();
    c.strokeStyle = withAlpha(shade(ramp.base, 0.2), 0.7);
    c.lineWidth = Math.max(1, S * 0.08);
    c.stroke();
  });
};

/** HAUSTRA FOLDS — segmented gut-ridge bands clenching across the body:
 *  the tract wall worn as anatomy. params: n (bands). */
const haustraFolds: PartPainter = (ctx, r, spec, pal) => {
  const ramp = rampFor(spec, pal, 'base');
  const n = Math.round(P(spec, 'n', 4));
  place(ctx, r, spec, (c, R) => {
    for (let i = 0; i < n; i++) {
      const x = -R * 0.62 + (i + 0.5) * (R * 1.24 / n);
      const hw = (R * 1.24 / n) * 0.44;
      const hh = R * Math.sqrt(Math.max(0.08, 1 - (x / R) * (x / R))) * 0.82;
      c.fillStyle = shade(ramp.base, i % 2 ? -0.06 : 0.04);
      c.beginPath();
      c.ellipse(x, 0, hw, hh, 0, 0, Math.PI * 2);
      c.fill();
      c.strokeStyle = withAlpha(ramp.shadow, 0.65);
      c.lineWidth = Math.max(1, R * 0.05);
      c.beginPath();
      c.moveTo(x + hw * 0.9, -hh * 0.85);
      c.quadraticCurveTo(x + hw * 1.15, 0, x + hw * 0.9, hh * 0.85);
      c.stroke();
    }
  });
};

/** LASH FRINGE — a ring of curved lashes around the body rim (the eye
 *  country's eyelash, worn as trim). params: n, len (× body radius). */
const lashFringe: PartPainter = (ctx, r, spec, pal) => {
  const col = spec.color ?? pal.dark;
  const n = Math.round(P(spec, 'n', 12));
  const len = P(spec, 'len', 0.34);
  place(ctx, r, spec, (c, R) => {
    c.strokeStyle = col;
    c.lineCap = 'round';
    for (let i = 0; i < n; i++) {
      const a = (i / n) * Math.PI * 2 + hash01(i, 421) * 0.18;
      const L = R * len * (0.75 + hash01(i, 431) * 0.5);
      const bx = Math.cos(a) * R * 0.98, by = Math.sin(a) * R * 0.98;
      const curl = 0.55 * (i % 2 ? 1 : -1);
      c.lineWidth = Math.max(1, R * 0.05);
      c.beginPath();
      c.moveTo(bx, by);
      c.quadraticCurveTo(
        Math.cos(a) * (R + L * 0.6), Math.sin(a) * (R + L * 0.6),
        Math.cos(a + curl * L / R) * (R + L), Math.sin(a + curl * L / R) * (R + L));
      c.stroke();
    }
    c.lineCap = 'butt';
  });
};

/** IRIS EYE — ONE great eye worn as the face: sclera, banded iris, a pupil
 *  (round or slit), a wet catchlight. The flesh country's stare at monster
 *  scale — pair with eyeCluster for the retinue. params: slit (bool),
 *  iris (color key: default palette glow). */
const irisEye: PartPainter = (ctx, r, spec, pal) => {
  const irisCol = spec.color ?? pal.glow;
  const slit = PB(spec, 'slit', false);
  place(ctx, r, spec, (c, R) => {
    const S = R * 0.56;
    c.fillStyle = '#e6dacc';
    c.beginPath(); c.ellipse(0, 0, S, S * 0.82, 0, 0, Math.PI * 2); c.fill();
    c.strokeStyle = withAlpha('#8a3040', 0.5);
    c.lineWidth = Math.max(1, S * 0.05);
    c.stroke();
    // Bloodshot creep from the corners.
    c.strokeStyle = withAlpha('#b83a42', 0.5);
    c.lineWidth = Math.max(0.8, S * 0.03);
    for (let i = 0; i < 4; i++) {
      const a = (i < 2 ? 0 : Math.PI) + (hash01(i, 611) - 0.5) * 0.7;
      c.beginPath();
      c.moveTo(Math.cos(a) * S * 0.95, Math.sin(a) * S * 0.7);
      c.quadraticCurveTo(Math.cos(a) * S * 0.6, Math.sin(a) * S * 0.5,
        Math.cos(a) * S * 0.42, Math.sin(a) * S * 0.3);
      c.stroke();
    }
    // Banded iris + the pupil.
    c.fillStyle = irisCol;
    c.beginPath(); c.arc(S * 0.1, 0, S * 0.44, 0, Math.PI * 2); c.fill();
    c.strokeStyle = withAlpha('#120a0c', 0.45);
    c.lineWidth = Math.max(0.8, S * 0.03);
    for (const f of [0.36, 0.28]) {
      c.beginPath(); c.arc(S * 0.1, 0, S * f, 0, Math.PI * 2); c.stroke();
    }
    c.fillStyle = '#120a0c';
    c.beginPath();
    if (slit) c.ellipse(S * 0.1, 0, S * 0.08, S * 0.34, 0, 0, Math.PI * 2);
    else c.arc(S * 0.1, 0, S * 0.2, 0, Math.PI * 2);
    c.fill();
    c.fillStyle = withAlpha('#ffffff', 0.85);
    c.beginPath(); c.arc(S * 0.02, -S * 0.12, S * 0.07, 0, Math.PI * 2); c.fill();
  });
};

/** COACH WHEELS — a pair of tall spoked cartwheels flanking the body
 *  (top-down: two long dark treads at ±Y, pale spoke ticks, a proud hub).
 *  The carriage limb of the vocabulary — coaches, wagons, siege engines.
 *  params: spokes (ticks per wheel), span (tread length ÷ body radius). */
const wheels: PartPainter = (ctx, r, spec, pal) => {
  const ramp = rampFor(spec, pal, 'wood');
  const spokes = Math.max(3, Math.round(P(spec, 'spokes', 5)));
  const span = P(spec, 'span', 1.5);
  place(ctx, r, spec, (c, R) => {
    for (const side of [-1, 1]) {
      const wy = side * R * 0.95;
      const half = R * span * 0.5;
      const ww = R * 0.15; // half-width of the tread's footprint
      c.fillStyle = shade(ramp.base, -0.12);
      c.beginPath();
      c.rect(-half, wy - ww, half * 2, ww * 2);
      c.fill();
      c.strokeStyle = withAlpha(ramp.outline, 0.8);
      c.lineWidth = 1.2;
      c.stroke();
      // Spokes: pale ticks across the tread.
      c.strokeStyle = withAlpha(ramp.light, 0.55);
      c.lineWidth = Math.max(1, R * 0.05);
      for (let i = 0; i < spokes; i++) {
        const x = -half + ((i + 0.5) / spokes) * half * 2;
        c.beginPath();
        c.moveTo(x, wy - ww * 0.7);
        c.lineTo(x, wy + ww * 0.7);
        c.stroke();
      }
      // The hub, sitting proud at the axle.
      c.fillStyle = shade(ramp.base, 0.14);
      c.beginPath(); c.arc(0, wy, ww * 0.75, 0, Math.PI * 2); c.fill();
      c.strokeStyle = withAlpha(ramp.outline, 0.7);
      c.lineWidth = 1;
      c.stroke();
    }
  });
};

/** SHIP'S ANCHOR — the drowned court's burden worn as a weapon: a straight
 *  shank with a ring at the crown, a crossed stock, and two curved flukes at
 *  the foot. Reads at a glance from any angle (the silhouette is the whole
 *  argument). params: len (shank length ÷ body radius). */
const anchor: PartPainter = (ctx, r, spec, pal) => {
  const ramp = rampFor(spec, pal, 'metal');
  const len = P(spec, 'len', 1.15);
  place(ctx, r, spec, (c, R) => {
    const L = R * len;         // half-length of the shank
    const w = Math.max(1.6, R * 0.11);
    c.strokeStyle = ramp.base;
    c.lineCap = 'round';
    c.lineWidth = w;
    // The shank: crown (ring end) at -Y, flukes at +Y.
    c.beginPath(); c.moveTo(0, -L); c.lineTo(0, L * 0.72); c.stroke();
    // The stock: the crossbar just under the ring.
    c.beginPath(); c.moveTo(-L * 0.42, -L * 0.66); c.lineTo(L * 0.42, -L * 0.66); c.stroke();
    // The arms: two flukes curving up and out from the foot.
    for (const s of [-1, 1]) {
      c.beginPath();
      c.moveTo(0, L * 0.72);
      c.quadraticCurveTo(s * L * 0.52, L * 0.78, s * L * 0.5, L * 0.22);
      c.stroke();
      // Fluke tips: small triangular palms.
      c.fillStyle = shade(ramp.base, 0.1);
      c.beginPath();
      c.moveTo(s * L * 0.5, L * 0.22);
      c.lineTo(s * L * 0.66, L * 0.4);
      c.lineTo(s * L * 0.36, L * 0.44);
      c.closePath(); c.fill();
    }
    // The ring at the crown.
    c.lineWidth = Math.max(1.2, w * 0.6);
    c.strokeStyle = shade(ramp.base, 0.16);
    c.beginPath(); c.arc(0, -L - R * 0.1, R * 0.14, 0, Math.PI * 2); c.stroke();
    c.lineCap = 'butt';
  });
};

// ===================================================== THE GRIP KIN'S TACK
// The grab fabric's silhouette tells (engine/grab.ts — one verb per part,
// so the player reads WHICH hold is coming at a glance): the grapnel
// drags, the yoke pins, the gulletsack swallows. All reusable by any
// future holdsman, angler, or devourer kit.

/** GRAPNEL-AND-LINE — a barbed J-hook resting against a coiled throwing
 *  line: the DRAGGER's tell (gaff wranglers, whalers, wall-scalers).
 *  params: len (hook reach ÷ body radius). */
const grapnel: PartPainter = (ctx, r, spec, pal) => {
  const ramp = rampFor(spec, pal, 'metal');
  const len = P(spec, 'len', 0.9);
  place(ctx, r, spec, (c, R) => {
    const L = R * len;
    // The coil: three loops of waxed line, read as rope not ring.
    c.strokeStyle = shade(ramp.base, -0.3);
    c.lineWidth = Math.max(1.2, R * 0.07);
    for (let i = 0; i < 3; i++) {
      c.beginPath();
      c.arc(-L * 0.28, L * 0.2, R * (0.26 + i * 0.09), 0.3, Math.PI * 2 - 0.2);
      c.stroke();
    }
    // The shank up out of the coil...
    c.strokeStyle = ramp.base;
    c.lineCap = 'round';
    c.lineWidth = Math.max(1.6, R * 0.1);
    c.beginPath(); c.moveTo(-L * 0.28, L * 0.1); c.lineTo(L * 0.3, -L * 0.55); c.stroke();
    // ...into the J-hook, barb cocked outward.
    c.beginPath();
    c.arc(L * 0.44, -L * 0.42, L * 0.24, Math.PI * 0.75, Math.PI * 1.95);
    c.stroke();
    c.fillStyle = shade(ramp.base, 0.14);
    c.beginPath();
    c.moveTo(L * 0.62, -L * 0.58);
    c.lineTo(L * 0.78, -L * 0.72);
    c.lineTo(L * 0.68, -L * 0.44);
    c.closePath(); c.fill();
    c.lineCap = 'butt';
  });
};

/** THE OX-YOKE — a shoulder-borne double-bow beam: the PINNER's tell
 *  (pit maulers, beast-tamed brutes, anything that puts weight ON you).
 *  Drawn across the body axis so the silhouette widens unmistakably.
 *  params: span (beam half-width ÷ body radius). */
const yoke: PartPainter = (ctx, r, spec, pal) => {
  const ramp = rampFor(spec, pal, 'wood');
  const span = P(spec, 'span', 1.25);
  place(ctx, r, spec, (c, R) => {
    const W = R * span;
    // The beam: a worn timber bar with a slight working bow.
    c.strokeStyle = ramp.base;
    c.lineCap = 'round';
    c.lineWidth = Math.max(2.2, R * 0.16);
    c.beginPath();
    c.moveTo(-W, -R * 0.06);
    c.quadraticCurveTo(0, -R * 0.2, W, -R * 0.06);
    c.stroke();
    // The two oxbows: U-loops hanging under the beam (empty — whatever
    // wore this yoke, the mauler is what is left).
    c.lineWidth = Math.max(1.4, R * 0.09);
    c.strokeStyle = shade(ramp.base, -0.18);
    for (const s of [-0.55, 0.55]) {
      c.beginPath();
      c.arc(W * s, R * 0.08, R * 0.22, Math.PI * 1.05, Math.PI * 1.95, true);
      c.stroke();
    }
    // End knobs: the carry-worn stubs.
    c.fillStyle = shade(ramp.base, 0.12);
    for (const s of [-1, 1]) {
      c.beginPath(); c.arc(W * s, -R * 0.06, R * 0.11, 0, Math.PI * 2); c.fill();
    }
    c.lineCap = 'butt';
  });
};

/** THE GULLETSACK — a distended under-jaw throat sac: the SWALLOWER's
 *  tell (gorge gulpers, pelican-things, any devourer that keeps what it
 *  takes). In live[] it works — a slow digestive squeeze; static bakes
 *  show it slack. params: bulge (sac radius ÷ body radius), rate. */
const gulletSac: PartPainter = (ctx, r, spec, pal, t) => {
  const ramp = rampFor(spec, pal, 'base');
  const bulge = P(spec, 'bulge', 0.62);
  const rate = P(spec, 'rate', 0.9);
  place(ctx, r, spec, (c, R) => {
    const work = t === undefined ? 0 : Math.sin(t * Math.PI * 2 * rate) * 0.08;
    const B = R * bulge * (1 + work);
    // The sac: a soft teardrop slung low and forward.
    c.fillStyle = shade(ramp.base, -0.06);
    c.beginPath();
    c.ellipse(R * 0.18, R * 0.3, B, B * (0.82 - work * 0.5), 0.3, 0, Math.PI * 2);
    c.fill();
    outlined(c, ramp, 1.1);
    // The stretch-sheen: taut skin catches light along the swell.
    c.strokeStyle = withAlpha(ramp.highlight, 0.5);
    c.lineWidth = 1;
    c.beginPath();
    c.arc(R * 0.14, R * 0.24, B * 0.7, -1.9, -0.6);
    c.stroke();
    // Sag creases at the throat root.
    c.strokeStyle = withAlpha(shade(ramp.base, -0.35), 0.7);
    for (let i = 0; i < 2; i++) {
      c.beginPath();
      c.arc(R * 0.2, R * 0.28, B * (0.36 + i * 0.22), 0.7, 2.1);
      c.stroke();
    }
  });
};

export const PART_PAINTERS: Record<string, PartPainter> = {
  disc, blob, carapace, torso, robe, serpentHead,
  skull, ribs, spineTrail, crown,
  hood, tatters, pauldrons,
  eyes, maw, snout, mandibles, horns, ears, tusks, spikes, wings,
  claws, scythe, staff, sword, daggers, trident, mace, axe, shield, bow, musket,
  halo, runes, wisps, flames, emberSparks, lavaCracks, puffMotes, veilSashes, glassFins,
  gourdHead, strawLimbs,
  shell, caps, capDome, gillFrill, fronds, tail, stinger, fins,
  barkPlates, branchArms, stalactites, nestTwigs,
  oozeLobes, fleshFolds, eyeCluster, raptorArms, segmentRings,
  sphincterMaw, haustraFolds, lashFringe, irisEye,
  apron, pack, lantern, helm,
  tentacleRing, orb, pincers, antennae, legs, banner, hammer, book, gem,
  armorPlates, bloatSacs, chains, barbs, whip, keg, crateBox,
  antlers, ramHorns, beak, featherWings, crest, frill, gills,
  trunkNose, scutes, tailFin, eyestalks, mane, egg, cocoon, mask,
  quiver, cape, tailClub,
  sunburst, laurel, censer, tailSpade, crownOfHorns, brand,
  stripes, spots, rhinoHorn, tuftEars, whiskers, shellSpiral, hump,
  icicles, furRuff, breathPuff, warpaint, bandolier, dorsalRidge,
  fangs, plume, beard, tailFeathers, torch, net,
  mawRing, lure, sporeVents, mossPatch, veinweb, polyps, slimeTrail,
  sailfin, warhorn, drape,
  stakeRow, totemPost,
  crystalGrowths, roots, stitchSeams, bell, beatPips, chest,
  collar, harness, saddlebags, muzzle,
  floatingShards,
  shroudWrap, carrionFlies,
  wheels,
  canopicJar, sarcophagusLid,
  cobraHood, fangJaw, coil,
  anchor,
  grapnel, yoke, gulletSac,
};

/** Paint a look's baked stack (local space, +X = facing, r = body radius). */
export function paintLook(ctx: CanvasRenderingContext2D, r: number,
  look: LookDef, pal: LookPalette): void {
  for (const spec of look.parts) {
    const painter = PART_PAINTERS[spec.kind];
    if (painter) painter(ctx, r, spec, pal);
  }
}

/** Paint a look's LIVE parts (call per frame inside the facing rotation). */
export function paintLiveParts(ctx: CanvasRenderingContext2D, r: number,
  look: LookDef, pal: LookPalette, t: number): void {
  if (!look.live) return;
  for (const spec of look.live) {
    const painter = PART_PAINTERS[spec.kind];
    if (painter) painter(ctx, r, spec, pal, t);
  }
}
