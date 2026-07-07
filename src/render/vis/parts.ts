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

export const PART_PAINTERS: Record<string, PartPainter> = {
  disc, blob, carapace, torso, robe, serpentHead,
  skull, ribs, spineTrail, crown,
  hood, tatters, pauldrons,
  eyes, maw, snout, mandibles, horns, ears, tusks, spikes, wings,
  claws, scythe, staff, sword, daggers, mace, axe, shield, bow,
  halo, runes, wisps, flames,
  shell, caps, fronds, tail, stinger, fins,
  apron, pack, lantern, helm,
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
