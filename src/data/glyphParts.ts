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

  // CROSSED KEYS — the See's warden emblem: two great keys crossed in an X,
  // ring-bows up, wards down. Worn at the belt it reads OFFICE (who may
  // open the doors), instantly distinct from sword-cross silhouettes: the
  // bows are the tell. Debuts on the censer-warden.
  crossedKeys: {
    ops: [
      { kind: 'path', pts: [[-0.4, -0.5], [0.44, 0.52]], role: 'metal', shade: 0.1, wR: 0.07 },
      { kind: 'path', pts: [[0.4, -0.5], [-0.44, 0.52]], role: 'metal', shade: -0.05, wR: 0.07 },
      { kind: 'ring', x: -0.48, y: -0.58, rx: 0.16, role: 'metal', shade: 0.15, wR: 0.06 },
      { kind: 'ring', x: 0.48, y: -0.58, rx: 0.16, role: 'metal', shade: 0.05, wR: 0.06 },
      { kind: 'path', pts: [[0.44, 0.52], [0.58, 0.42]], role: 'metal', shade: 0.1, wR: 0.06 },
      { kind: 'path', pts: [[-0.44, 0.52], [-0.58, 0.42]], role: 'metal', shade: -0.05, wR: 0.06 },
    ],
  },

  // --- The Garden set (the bug-high country's kin) --------------------------
  // PETAL RUFF — a full skirt of blade-petals around the body: the bloomkin
  // signature (a flower IS its corolla). Six lobes — front pair, side pair,
  // back pair (mirror halves the authoring) — creased down the middle so
  // the skirt reads petal, never sunburst. Reads instantly against frill
  // (membrane fan) and fronds (hanging leaves).
  petalRuff: {
    ops: [
      { kind: 'poly', pts: [[0.5, -0.12], [0.98, -0.3], [1.16, -0.02], [0.9, 0.12]], smooth: true, role: 'accent', shade: 0.06, outline: true, mirror: true },
      { kind: 'poly', pts: [[0.08, -0.5], [0.3, -1.06], [-0.12, -1.12], [-0.3, -0.52]], smooth: true, role: 'accent', shade: -0.02, outline: true, mirror: true },
      { kind: 'poly', pts: [[-0.5, -0.16], [-1.0, -0.42], [-1.18, -0.08], [-0.86, 0.1]], smooth: true, role: 'accent', shade: -0.1, outline: true, mirror: true },
      { kind: 'path', pts: [[0.5, -0.16], [1.02, -0.18]], role: 'accent', shade: -0.3, wR: 0.02, mirror: true },
      { kind: 'path', pts: [[0.02, -0.5], [0.08, -0.98]], role: 'accent', shade: -0.3, wR: 0.02, mirror: true },
    ],
  },
  // BLOOM CAP — a flower worn as a head: a tight petal corolla forward of
  // center with a bright floret heart. The pollen-caster's read-at-a-glance
  // (capDome is a mushroom; THIS is a blossom).
  bloomCap: {
    ops: [
      { kind: 'poly', pts: [[0.62, -0.06], [0.94, -0.26], [1.0, 0.04], [0.74, 0.12]], smooth: true, role: 'accent', shade: 0.08, outline: true, mirror: true },
      { kind: 'poly', pts: [[0.32, -0.3], [0.4, -0.68], [0.08, -0.62], [0.1, -0.3]], smooth: true, role: 'accent', shade: -0.04, outline: true, mirror: true },
      { kind: 'poly', pts: [[0.02, -0.34], [-0.3, -0.6], [-0.44, -0.3], [-0.16, -0.14]], smooth: true, role: 'accent', shade: -0.12, outline: true, mirror: true },
      { kind: 'disc', x: 0.3, y: 0, rx: 0.22, role: 'glow', alpha: 0.95, outline: true },
      { kind: 'disc', x: 0.3, y: 0, rx: 0.1, role: 'glow', shade: -0.25 },
    ],
  },
  // (eyestalks lived here once — but parts.ts always had a hand-written
  // `eyestalks` painter, so this glyph LOST the boot-time collision check
  // every single boot and never drew a pixel. The painter serves the same
  // brief — stalked eyes periscoping forward — so the dead row is gone.)
  // CORNICLES — the aphid's twin tail-spigots: two stubby tubes aft, drops
  // beading at the mouths (the herd's whole economy, worn as anatomy).
  cornicles: {
    ops: [
      { kind: 'path', pts: [[-0.5, -0.16], [-0.88, -0.3]], role: 'dark', shade: 0.05, wR: 0.09, mirror: true },
      { kind: 'disc', x: -0.94, y: -0.32, rx: 0.07, role: 'glow', alpha: 0.85, mirror: true },
    ],
  },

  // --- The Surge set (the Quickening's kin) ---------------------------------
  // BOLT CREST — a jagged stroke of living lightning standing off the brow,
  // forked at the tip. Nothing else in the roster is JAGGED overhead: crown
  // is spiked metal, halo a closed ring, crest a smooth fin — this reads
  // "charged" at a glance.
  boltCrest: {
    ops: [
      { kind: 'path', pts: [[0.24, -0.42], [0.04, -0.72], [0.3, -0.68], [0.08, -1.08]], role: 'glow', alpha: 0.95, wR: 0.07 },
      { kind: 'path', pts: [[0.04, -0.72], [-0.22, -0.94]], role: 'glow', alpha: 0.75, wR: 0.045 },
      { kind: 'disc', x: 0.08, y: -1.08, rx: 0.07, role: 'glow', alpha: 0.95 },
      { kind: 'disc', x: -0.22, y: -0.94, rx: 0.045, role: 'glow', alpha: 0.7 },
    ],
  },
  // ARC SPANS — short lightning arcs bridging stud to stud across the
  // flanks (mirror covers both sides), each anchored by a bright node: the
  // body wears its current OUTSIDE. Distinct from lavaCracks (surface
  // fissures) and runes (orbiting marks) — these BRIDGE, with endpoints.
  arcSpans: {
    ops: [
      { kind: 'disc', x: 0.42, y: -0.5, rx: 0.06, role: 'metal', shade: 0.2, outline: true, mirror: true },
      { kind: 'disc', x: -0.34, y: -0.62, rx: 0.06, role: 'metal', shade: 0.2, outline: true, mirror: true },
      { kind: 'path', pts: [[0.42, -0.5], [0.12, -0.72], [-0.06, -0.58], [-0.34, -0.62]], role: 'glow', alpha: 0.9, wR: 0.035, mirror: true },
    ],
  },
  // RIFT SEAM — the body split stem to stern by a crack of light: a dark
  // wound under, the glow welling through, two hairline branches (mirror).
  // Distinct from stitchSeams (sewn flesh) and veinweb (spread filaments):
  // ONE great seam, glowing from inside.
  riftSeam: {
    ops: [
      { kind: 'path', pts: [[0.62, 0.02], [0.3, -0.08], [-0.04, 0.06], [-0.36, -0.04], [-0.58, 0.02]], smooth: true, role: 'dark', shade: -0.2, wR: 0.09 },
      { kind: 'path', pts: [[0.62, 0.02], [0.3, -0.08], [-0.04, 0.06], [-0.36, -0.04], [-0.58, 0.02]], smooth: true, role: 'glow', alpha: 0.95, wR: 0.045 },
      { kind: 'path', pts: [[0.3, -0.08], [0.18, -0.34]], role: 'glow', alpha: 0.7, wR: 0.025, mirror: true },
      { kind: 'path', pts: [[-0.36, -0.04], [-0.46, 0.26]], role: 'glow', alpha: 0.7, wR: 0.025 },
    ],
  },
};

for (const [kind, glyph] of Object.entries(GLYPH_PARTS)) registerShippedGlyph(kind, glyph);
