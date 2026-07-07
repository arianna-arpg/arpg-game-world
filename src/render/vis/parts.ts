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
 *  params: pairs. */
const legs: PartPainter = (ctx, r, spec, pal) => {
  const ramp = rampFor(spec, pal, 'base');
  const pairs = Math.round(P(spec, 'pairs', 4));
  place(ctx, r, spec, (c, R) => {
    c.lineCap = 'round';
    for (let i = 0; i < pairs; i++) {
      const t = pairs === 1 ? 0.5 : i / (pairs - 1);
      const a0 = 0.9 - t * 1.9; // fan from forward to back
      for (const side of [-1, 1]) {
        const ang = side * a0 * -1 + (side < 0 ? Math.PI : 0);
        const bx = Math.cos(ang) * R * 0.7, by = Math.sin(ang) * R * 0.7;
        const kx = Math.cos(ang) * R * 1.35, ky = Math.sin(ang) * R * 1.35 - R * 0.12;
        const tx = Math.cos(ang) * R * 1.7, ty = Math.sin(ang) * R * 1.7 + R * 0.22;
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
  tentacleRing, orb, pincers, antennae, legs, banner, hammer, book, gem,
  armorPlates, bloatSacs, chains, barbs, whip, keg, crateBox,
  antlers, ramHorns, beak, featherWings, crest, frill, gills,
  trunkNose, scutes, tailFin, eyestalks, mane, egg, cocoon, mask,
  quiver, cape, tailClub,
  sunburst, laurel, censer, tailSpade, crownOfHorns, brand,
  stripes, spots, rhinoHorn, tuftEars, whiskers, shellSpiral, hump,
  icicles, furRuff, breathPuff, warpaint, bandolier, dorsalRidge,
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
