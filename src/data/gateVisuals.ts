// ---------------------------------------------------------------------------
// GATE LOOKS — every realm gate's appearance as an OPEN REGISTRY.
//
// The demon rift, the crusade sanctum gate, the necropolis gate and the
// fracture rift used to be four hand-authored canvas blobs in renderer.ts —
// near-identical structure, hardcoded colors, radii and glyphs. Now a gate
// KIND is one data row and the renderer draws every gate through a single
// pass (drawRealmGates): halo glow, core disc, twin pulsing rims, an orbiting
// dash ring, optional tear-rays, embers circling the mouth, a glyph, and a
// floating prompt — each element present only when the row declares it.
//
// A color set to the literal '@event' resolves to the EVENT's own color at
// draw time (the fracture variant's hue, the invasion TYPE's hue) — so the
// same row tints per instance without a second row. Adding a new enterable
// realm = one registerGateLook + one row in the engine's realmGatesView.
// The transit registry (data/transit.ts) governs the same gates' dwell feel
// under 'realm_gate:<kind>' — look here, feel there, both data.
// ---------------------------------------------------------------------------

/** '@event' in any color slot = "use the color the event instance carries". */
export const EVENT_COLOR = '@event';

export interface GateLook {
  /** Outer disc radius (px). */
  radius: number;
  /** Dark core fill. */
  core: string;
  /** Outer rim stroke. */
  rim: string;
  /** Inner rim stroke. */
  inner: string;
  /** Breathing rate (Hz-ish sin multiplier) and amplitude (fraction of radius). */
  pulseHz: number;
  pulseAmp: number;
  /** Whole-gate rotation, radians/sec (a churning tear). */
  spin?: number;
  /** Jagged rays from the mouth (a TEAR, not a ring): count + inner/outer radii,
   *  alternating longer every other ray by `alt`. */
  rays?: { count: number; r0: number; r1: number; alt: number };
  /** Soft radial glow behind the gate. */
  halo?: { radius: number; alpha: number };
  /** Embers/motes orbiting the mouth. */
  motes?: { count: number; orbit: number; size: number; hz: number };
  /** Center glyph. */
  glyph?: string;
  glyphColor?: string;
  glyphSize?: number;
  /** Floating call-to-action above the gate. */
  prompt?: string;
  promptColor?: string;
}

export const GATE_LOOKS: Record<string, GateLook> = {};

export function registerGateLook(kind: string, look: GateLook): void {
  if (GATE_LOOKS[kind]) console.warn(`[gateVisuals] re-registering '${kind}' — overriding`);
  GATE_LOOKS[kind] = look;
}

/** The fallback for a kind nobody authored — a plain readable rift. */
const DEFAULT_GATE: GateLook = {
  radius: 34, core: '#101018', rim: '#9a9ad0', inner: '#d0d0f0',
  pulseHz: 4, pulseAmp: 0.16, glyph: '✶', glyphColor: '#e8e8ff', glyphSize: 18,
};

export function gateLookOf(kind: string): GateLook {
  return GATE_LOOKS[kind] ?? DEFAULT_GATE;
}

// --- The stock gates ----------------------------------------------------------

// DEMON RIFT — a swirling molten tear. Rim tints with the invasion TYPE's color
// (imp orange / hell-host red / rite crimson), so the eruption you let fester
// is the eruption you step into.
registerGateLook('demon', {
  radius: 34, core: '#2a000c', rim: EVENT_COLOR, inner: '#ff6a3a',
  pulseHz: 5, pulseAmp: 0.18, spin: 0.45,
  rays: { count: 6, r0: 8, r1: 26, alt: 7 },
  halo: { radius: 78, alpha: 0.22 },
  motes: { count: 3, orbit: 44, size: 2.6, hz: 0.9 },
  glyph: '✶', glyphColor: '#ffd0b0', glyphSize: 18,
  prompt: 'a rift to the demon realm', promptColor: '#ff8a6a',
});

// CRUSADE SANCTUM — a gilded standing gate, orderly where the rifts churn:
// no spin, no rays, a slow processional pulse and censer-spark motes.
registerGateLook('crusade', {
  radius: 34, core: '#241c08', rim: EVENT_COLOR, inner: '#ffe070',
  pulseHz: 3.2, pulseAmp: 0.12,
  halo: { radius: 72, alpha: 0.18 },
  motes: { count: 4, orbit: 46, size: 2.2, hz: 0.5 },
  glyph: '☗', glyphColor: '#fff0c0', glyphSize: 18,
  prompt: 'the sanctum gate stands open', promptColor: '#ffdf80',
});

// NECROPOLIS — the great pale-bone way into the seat of the dead: larger and
// slower than its siblings, a deliberate, weighty threshold.
registerGateLook('necropolis', {
  radius: 44, core: '#16140e', rim: '#d8cdb0', inner: '#f0e8cc',
  pulseHz: 2.4, pulseAmp: 0.1,
  halo: { radius: 96, alpha: 0.2 },
  motes: { count: 5, orbit: 58, size: 2.4, hz: 0.35 },
  glyph: '✠', glyphColor: '#f0e8cc', glyphSize: 22,
  prompt: 'the seat of the dead lies open', promptColor: '#e8dcb0',
});

// FRACTURE RIFT — a churning variant-colored tear (the capstone's reward way);
// all rays and spin, no glyph — a wound, not a doorway.
registerGateLook('fracture', {
  radius: 36, core: '#0a0410', rim: EVENT_COLOR, inner: EVENT_COLOR,
  pulseHz: 5, pulseAmp: 0.2, spin: 0.6,
  rays: { count: 8, r0: 5, r1: 20, alt: 8 },
  halo: { radius: 82, alpha: 0.2 },
  prompt: 'a rift yawns — step in', promptColor: EVENT_COLOR,
});

// COURT DOOR — the fed breach that FAILED to seal, condensed into a standing
// way to its lord's domain (the encounter court fabric). Slow counter-turning
// churn, long jagged rays, heavy mote orbit — a wound wearing a doorway's
// patience. Rim + rays tint with the LORD's banner ('@event'); the per-lord
// call-to-action rides the gate view's prompt override, so this one row
// serves every court.
registerGateLook('court', {
  radius: 38, core: '#0c0614', rim: EVENT_COLOR, inner: EVENT_COLOR,
  pulseHz: 3.6, pulseAmp: 0.16, spin: -0.35,
  rays: { count: 10, r0: 7, r1: 30, alt: 10 },
  halo: { radius: 96, alpha: 0.26 },
  motes: { count: 6, orbit: 52, size: 2.8, hz: 0.7 },
  glyph: '◈', glyphColor: '#e8d8ff', glyphSize: 20,
  prompt: 'the lord\'s domain gapes', promptColor: EVENT_COLOR,
});
