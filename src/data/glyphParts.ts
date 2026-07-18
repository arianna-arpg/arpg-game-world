// ---------------------------------------------------------------------------
// THE SHIPPED GLYPH ROSTER — hand-drawn part kinds promoted out of the Part
// Forge (docs/engine/workshop.md). A row here is a GlyphDef (the vector-op
// data the one glyph interpreter executes); registration at module load
// makes the kind a first-class PART_PAINTERS citizen — usable in any LOOKS
// entry, baked, mirrored, palette-ramped and live-animated like hand-written
// painters. Promotion flow: draw in the Part Forge → Export TS → paste the
// row here (rename the 'custom_' prefix off as part of the act). Collisions
// REFUSE loudly (registerShippedGlyph) — a glyph can never clobber a
// painter, so this file is always safe to grow.
// ---------------------------------------------------------------------------

import { registerShippedGlyph, type GlyphDef } from '../render/vis/parts';

export const GLYPH_PARTS: Record<string, GlyphDef> = {
  // --- The Seraph City set (aether_gloria / aether_seraphal kin) ------------
  // LAUREL CROWN — the victor's leaf ring, open at the back: an arc band
  // with leaf pairs pacing the front (mirror covers both sides). Reads
  // instantly against halo (a closed glow ring) and crown (spiked metal).
  laurelCrown: {
    ops: [
      { kind: 'ring', rx: 0.78, a0: -2.4, a1: 2.4, role: 'accent', shade: -0.15, wR: 0.07 },
      { kind: 'poly', pts: [[0.86, -0.1], [0.98, -0.22], [0.82, -0.3], [0.72, -0.18]], smooth: true, role: 'accent', shade: 0.1, outline: true, mirror: true },
      { kind: 'poly', pts: [[0.52, -0.56], [0.58, -0.74], [0.4, -0.76], [0.36, -0.6]], smooth: true, role: 'accent', shade: 0.05, outline: true, mirror: true },
      { kind: 'poly', pts: [[0.06, -0.76], [0.06, -0.94], [-0.12, -0.9], [-0.1, -0.74]], smooth: true, role: 'accent', shade: -0.05, outline: true, mirror: true },
    ],
  },
  // BALANCE SCALES — judgment carried openly: pivot, crossbar across the
  // shoulders, a chain and pan hanging each side (mirror). The tribune's
  // read-at-a-glance: law, not lance.
  balanceScales: {
    ops: [
      { kind: 'path', pts: [[0, -0.7], [0, 0.7]], role: 'metal', wR: 0.07 },
      { kind: 'disc', x: 0, y: 0, rx: 0.1, role: 'metal', shade: 0.15, outline: true },
      { kind: 'path', pts: [[0, 0.62], [0.3, 0.62]], role: 'metal', shade: -0.1, wR: 0.045, mirror: true },
      { kind: 'ring', x: 0.34, y: 0.62, rx: 0.17, a0: 0.5, a1: 2.64, role: 'metal', shade: 0.1, wR: 0.06, mirror: true },
    ],
  },
  // LYRE — the muse's instrument: a smooth U-frame opening forward, the
  // crossbar, three strings. The lyrist sings the forum; nothing else in
  // the roster carries strings.
  lyre: {
    ops: [
      { kind: 'path', pts: [[-0.06, -0.44], [-0.32, -0.34], [-0.44, 0], [-0.32, 0.34], [-0.06, 0.44]], smooth: true, role: 'wood', shade: 0.1, wR: 0.08 },
      { kind: 'path', pts: [[-0.1, -0.4], [-0.1, 0.4]], role: 'metal', shade: 0.2, wR: 0.05 },
      { kind: 'path', pts: [[-0.11, -0.2], [-0.4, -0.16]], role: 'glow', alpha: 0.9, wR: 0.02 },
      { kind: 'path', pts: [[-0.11, 0], [-0.44, 0]], role: 'glow', alpha: 0.9, wR: 0.02 },
      { kind: 'path', pts: [[-0.11, 0.2], [-0.4, 0.16]], role: 'glow', alpha: 0.9, wR: 0.02 },
      { kind: 'disc', x: -0.06, y: -0.44, rx: 0.07, role: 'wood', shade: -0.1, outline: true },
      { kind: 'disc', x: -0.06, y: 0.44, rx: 0.07, role: 'wood', shade: -0.1, outline: true },
    ],
  },
};

for (const [kind, glyph] of Object.entries(GLYPH_PARTS)) registerShippedGlyph(kind, glyph);
