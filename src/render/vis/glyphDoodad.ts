// ---------------------------------------------------------------------------
// THE GLYPH DOODAD PAINTER — hand-drawn doodad kinds (the Doodad Forge's
// brush). One group painter, registered under the paintersGloam contract
// (a kit brings its own looks by assignment — no painters.ts edit): a
// workshop doodad's DOODAD_VISUALS row is `{ painter: 'glyph', params:
// { glyph, color, material? } }`, and this brush executes the GlyphDef in
// doodad space (unit = the instance radius, rotated by its seeded spin)
// through the SAME interpreter parts use — so drawn == drawn everywhere,
// palette ramps and materials included. `color` resolves through the theme
// spec vocabulary ('theme:key|#fallback'), so a drawn kind can dress itself
// in each biome's palette like shipped kinds do. env.time flows as the
// glyph clock: sway ops drift on doodads exactly like live parts.
//
// Side-effect module — meta/workshop imports it so the brush exists before
// any workshop doodad could render.
// ---------------------------------------------------------------------------

import { PAINTERS, resolveColor, type GroupPainter } from './painters';
import { lookPalette, paintGlyph, type GlyphDef, type PartSpec } from './parts';

const NO_TRANSFORM: PartSpec = { kind: 'glyph' };

const glyphDoodadPainter: GroupPainter = (env, group, def) => {
  const glyph = def.params?.glyph as GlyphDef | undefined;
  if (!glyph || !Array.isArray(glyph.ops)) return;
  const color = resolveColor((def.params?.color as string) ?? '#8a8276', env.theme);
  const material = typeof def.params?.material === 'string' ? def.params.material : undefined;
  const pal = lookPalette(color, material);
  const { ctx } = env;
  for (const o of group) {
    ctx.save();
    ctx.translate(o.pos.x, o.pos.y);
    if (o.rot !== undefined) ctx.rotate(o.rot);
    paintGlyph(ctx, o.radius, NO_TRANSFORM, pal, glyph, env.time);
    ctx.restore();
  }
};

PAINTERS.glyph = glyphDoodadPainter;

export {};
