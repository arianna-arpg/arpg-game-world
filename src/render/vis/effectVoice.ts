// ---------------------------------------------------------------------------
// THE EFFECT VOICE — an open kind→painter registry for effect MOMENTS (impact
// flashes, burst pops, exit flicks), the doodadVisuals precedent applied to
// the flash fabric: a new voice is ONE data entry here plus an `fx` key on
// the row that speaks it, no renderer edits.
//
// Why: the flash fabric used to derive its costume from BEHAVIOR flags — a
// sky-borne zone (Zone.hitAll) landed as a jagged LIGHTNING BOLT whether it
// was storm lightning or a trebuchet's burning shell, and every quiet moment
// (a squirrel darting up its tree) popped the same generic ring a warcry
// wears. The ruling (2026-08-02): lightning bolts are for lightning; mortars
// burst; a climb is a leaf-flick. The registry lets each row NAME its voice.
//
// THE LAWS:
//  - THE FALLBACK LAW: the generic ring (drawFlash's radial pop) remains the
//    structural fallback for every unkeyed flash AND for any fx kind this
//    registry doesn't know — drawEffectVoice returns false and the renderer
//    falls through, so an unknown kind can never render NOTHING. The generic
//    is honored, not deprecated: it serves every moment without a voice.
//  - THE RESERVED WORD: 'bolt' is the lightning voice and 'meteor' the
//    falling-star voice, and both belong to the FLAG machinery (Flash.bolt /
//    Flash.meteor — storm lightning, demon meteors). Neither is a registry
//    kind: an authored fx naming them fails the resolution pin
//    (balance/probe_effectvoice.ts) instead of quietly double-dooring the
//    same geometry. True lightning keeps its bolt by never needing a key.
//  - ABSENT == IDENTICAL: a row without an fx key renders today's bytes —
//    the registry only ever speaks when asked by name.
//
// Painters draw every frame of the flash's life, so all scatter is SEEDED
// from the flash's own position (the drawFlash haze precedent) — a debris
// chip flies the same arc on every frame of its half second. Dials live in
// VIS_CFG.effectVoice; colors derive from the flash's OWN color (the one-
// flat-color doctrine of render/vis/color.ts).
// ---------------------------------------------------------------------------

import { VIS_CFG } from './visConfig';
import { shade, withAlpha } from './color';

/** The narrow read surface a voice painter gets — structurally satisfied by
 *  the engine's Flash rows (world.ts) without importing the engine. */
export interface EffectVoiceFlash {
  pos: { x: number; y: number };
  radius: number;
  color: string;
  life: number;
  maxLife: number;
  facing?: number;
}

/** A voice painter: `t` is the remaining-life fraction (1 at birth → 0 at
 *  death — drawFlash's own clock, handed over so every voice fades on the
 *  fabric's schedule). The painter owns the whole draw; globalAlpha is
 *  restored by the caller. */
export type EffectVoicePainter = (
  ctx: CanvasRenderingContext2D, f: EffectVoiceFlash, t: number,
) => void;

const EFFECT_VOICES: Record<string, EffectVoicePainter> = {};

/** Register (or re-skin) a voice. Open by design — a package can bring its
 *  own moment without touching this file. */
export function registerEffectVoice(kind: string, painter: EffectVoicePainter): void {
  EFFECT_VOICES[kind] = painter;
}

/** Resolve a voice by kind — undefined for unknown kinds (the caller falls
 *  through to the generic ring; THE FALLBACK LAW). */
export function effectVoiceOf(kind: string): EffectVoicePainter | undefined {
  return EFFECT_VOICES[kind];
}

/** The registered vocabulary — the resolution pin's census surface. */
export function effectVoiceKinds(): string[] {
  return Object.keys(EFFECT_VOICES);
}

/** Draw a keyed flash in its own voice. Returns false when the kind is not
 *  registered so the caller's generic body still speaks (never nothing). */
export function drawEffectVoice(
  ctx: CanvasRenderingContext2D, fx: string, f: EffectVoiceFlash, t: number,
): boolean {
  const p = EFFECT_VOICES[fx];
  if (!p) return false;
  p(ctx, f, t);
  return true;
}

// --- Seeded scatter (per-frame stable) --------------------------------------

/** Position-derived seed — the same flash seeds the same scatter on every
 *  frame of its life (the drawFlash haze idiom). */
function flashSeed(f: EffectVoiceFlash): number {
  return ((f.pos.x * 13 + f.pos.y * 7) | 0) >>> 0;
}

/** Deterministic [0,1) stream: one hash per (seed, index, salt). */
function sv(seed: number, i: number, salt: number): number {
  let h = (Math.imul(seed ^ Math.imul(salt + 1, 2246822519), 2654435761)
    + Math.imul(i + 1, 40503)) >>> 0;
  h = Math.imul(h ^ (h >>> 15), 2246822507) >>> 0;
  return (h >>> 8) / 16777216;
}

// --- THE DEBUT VOICES -------------------------------------------------------

/** 'blast' — the mortar's landing (hellshot_volley and kin): a hot core
 *  flash that dies fast, a sooty smoke ring breathing out behind it, and
 *  seeded debris chips streaking away over the standing crater (the
 *  impactDress pock is the ground's own memory and is not this painter's
 *  business). Reads as ordnance, never as sky-fire. */
registerEffectVoice('blast', (ctx, f, t) => {
  const cfg = VIS_CFG.effectVoice.blast;
  const seed = flashSeed(f);
  const k = 1 - t; // progress 0 → 1
  const R = f.radius * cfg.scale;
  // The hot core: brightest at birth, gone by mid-life (alpha t²) — the
  // flash is the ignition, not the lingering read.
  const coreR = R * (0.45 + 0.55 * Math.min(1, k * 2.5));
  const g = ctx.createRadialGradient(f.pos.x, f.pos.y, 0, f.pos.x, f.pos.y, Math.max(1, coreR));
  g.addColorStop(0, withAlpha('#fff2d8', t * t * 0.9));
  g.addColorStop(0.35, withAlpha(shade(f.color, 0.25), t * t * 0.7));
  g.addColorStop(1, withAlpha(f.color, 0));
  ctx.fillStyle = g;
  ctx.beginPath();
  ctx.arc(f.pos.x, f.pos.y, Math.max(1, coreR), 0, Math.PI * 2);
  ctx.fill();
  // The smoke ring: rises as the flash dies (peaks mid-life), a sooty
  // wobbled band pushing past the blast radius — the report you see.
  const smokeA = Math.min(t, k) * 2 * cfg.smokeAlpha;
  if (smokeA > 0.01) {
    const sr = R * (0.5 + 0.85 * k);
    ctx.strokeStyle = withAlpha(shade(f.color, -0.75), smokeA);
    ctx.lineWidth = Math.max(2, R * 0.3 * (0.6 + 0.4 * k));
    ctx.beginPath();
    const segs = 22;
    for (let s = 0; s <= segs; s++) {
      const a = (s / segs) * Math.PI * 2;
      const wob = 1 + 0.08 * Math.sin(a * 3 + seed * 0.13);
      const x = f.pos.x + Math.cos(a) * sr * wob;
      const y = f.pos.y + Math.sin(a) * sr * wob;
      if (s === 0) ctx.moveTo(x, y); else ctx.lineTo(x, y);
    }
    ctx.closePath();
    ctx.stroke();
  }
  // Debris arcs: seeded chips streaking outward, hot chips and char in
  // alternation, each with a short motion tail (drawn from where it just
  // was) — the same chip flies the same line every frame.
  ctx.lineCap = 'round';
  for (let i = 0; i < cfg.debris; i++) {
    const ang = sv(seed, i, 1) * Math.PI * 2;
    const reach = R * (0.5 + 0.9 * sv(seed, i, 2));
    const ease = 1 - (1 - k) * (1 - k); // decelerating flight
    const d1 = reach * (0.2 + 0.8 * ease);
    const d0 = Math.max(R * 0.15, d1 - reach * 0.18);
    const hot = i % 2 === 0;
    ctx.strokeStyle = withAlpha(hot ? shade(f.color, 0.35) : '#3a2e26', t * (hot ? 0.85 : 0.6));
    ctx.lineWidth = hot ? 2 : 2.5;
    ctx.beginPath();
    ctx.moveTo(f.pos.x + Math.cos(ang) * d0, f.pos.y + Math.sin(ang) * d0);
    ctx.lineTo(f.pos.x + Math.cos(ang) * d1, f.pos.y + Math.sin(ang) * d1);
    ctx.stroke();
  }
  ctx.lineCap = 'butt';
});

/** 'sporeburst' — the pod's pop (and any gentle gas letting go): a soft
 *  tinted veil and slow-drifting motes, no hot core, no shockwave — this is
 *  a cloud being born, not a detonation. Rides the flash's own color so a
 *  future miasma or frost-spore pop reskins by tint alone. */
registerEffectVoice('sporeburst', (ctx, f, t) => {
  const cfg = VIS_CFG.effectVoice.sporeburst;
  const seed = flashSeed(f);
  const k = 1 - t;
  const ease = 1 - (1 - k) * (1 - k); // decelerating drift
  const R = f.radius * cfg.scale;
  // The veil: a quiet colored breath swelling to the cloud's own radius.
  const vr = R * (0.4 + 0.6 * ease);
  const g = ctx.createRadialGradient(f.pos.x, f.pos.y, 0, f.pos.x, f.pos.y, Math.max(1, vr));
  g.addColorStop(0, withAlpha(shade(f.color, 0.2), t * cfg.veilAlpha));
  g.addColorStop(1, withAlpha(f.color, 0));
  ctx.fillStyle = g;
  ctx.beginPath();
  ctx.arc(f.pos.x, f.pos.y, Math.max(1, vr), 0, Math.PI * 2);
  ctx.fill();
  // The motes: seeded spores drifting out slow and slightly UP (they are
  // lighter than the air that held them), each its own size and pace.
  for (let i = 0; i < cfg.motes; i++) {
    const ang = sv(seed, i, 3) * Math.PI * 2;
    const pace = 0.45 + 0.55 * sv(seed, i, 4);
    const d = R * (0.12 + 0.8 * ease * pace);
    const x = f.pos.x + Math.cos(ang) * d;
    const y = f.pos.y + Math.sin(ang) * d - ease * cfg.lift * pace;
    const mr = 1.5 + 2.5 * sv(seed, i, 5);
    ctx.fillStyle = withAlpha(shade(f.color, 0.3 + 0.25 * sv(seed, i, 6)), t * 0.55);
    ctx.beginPath();
    ctx.arc(x, y, mr, 0, Math.PI * 2);
    ctx.fill();
  }
});

/** 'scramble' — the treed critter's exit (and any small scurry-away): a
 *  handful of leaf-and-dust flecks flicked from the takeoff point, drawn
 *  SMALL regardless of the flash's stamped radius — the moment's weight is
 *  a squirrel's, and the painter keeps it that way. No ring, no wash. */
registerEffectVoice('scramble', (ctx, f, t) => {
  const cfg = VIS_CFG.effectVoice.scramble;
  const seed = flashSeed(f);
  const k = 1 - t;
  const ease = 1 - (1 - k) * (1 - k);
  const R = Math.min(f.radius, cfg.maxRadius); // small and quiet, by law
  ctx.lineCap = 'round';
  for (let i = 0; i < cfg.flecks; i++) {
    // Flicks bias UPWARD (the climb's direction): angles fold into the top
    // half-ish of the circle, with a little sideways scatter.
    const spread = (sv(seed, i, 7) - 0.5) * 2.4;
    const ang = -Math.PI / 2 + spread;
    const reach = R * (0.4 + 0.6 * sv(seed, i, 8));
    const d1 = reach * (0.25 + 0.75 * ease);
    const d0 = Math.max(2, d1 - reach * 0.3);
    // Leaf-green and dust-tan chips off the flash's own tint.
    const leafy = sv(seed, i, 9) < 0.5;
    const col = leafy ? '#7a9a4a' : shade(f.color, -0.15);
    ctx.strokeStyle = withAlpha(col, t * 0.7);
    ctx.lineWidth = leafy ? 2 : 1.4;
    ctx.beginPath();
    ctx.moveTo(f.pos.x + Math.cos(ang) * d0, f.pos.y + Math.sin(ang) * d0);
    ctx.lineTo(f.pos.x + Math.cos(ang) * d1, f.pos.y + Math.sin(ang) * d1);
    ctx.stroke();
  }
  // One faint dust wisp at the takeoff seat — the ground remembering feet.
  ctx.strokeStyle = withAlpha(shade(f.color, -0.3), t * 0.35);
  ctx.lineWidth = 1.2;
  ctx.beginPath();
  ctx.arc(f.pos.x, f.pos.y + 2, Math.max(2, R * 0.3 * (0.5 + 0.5 * ease)),
    Math.PI * 0.15, Math.PI * 0.85);
  ctx.stroke();
  ctx.lineCap = 'butt';
});
