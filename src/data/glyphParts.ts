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
  // (empty until the first promotion — the Part Forge's Export TS emits
  //  rows shaped exactly for this record.)
};

for (const [kind, glyph] of Object.entries(GLYPH_PARTS)) registerShippedGlyph(kind, glyph);
