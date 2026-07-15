// ---------------------------------------------------------------------------
// THE SEEDED-VISUAL HASH — the one deterministic per-instance hash every
// chance-rolled look derives from (render/vis/color.ts re-exports it for the
// painter library). It lives in the ENGINE because painter/sim shared fabrics
// — the rock form roll (engine/rockForms.ts), any future seed-rolled geometry
// — must derive LOOK and COLLISION from the same numbers; a sim-side clone
// would be a drift trap. Never retune the constants: every seeded visual in
// the game re-rolls if they move.
// ---------------------------------------------------------------------------

/** Tiny deterministic hash → 0..1 (speckle/texture jitter without RNG state).
 *  imul-mixed with UNSIGNED shifts — the first draft sign-extended and
 *  clustered below 0.5, which flattened every noise consumer. */
export function hash01(x: number, y: number, seed = 0): number {
  let h = (Math.imul(x, 374761393) + Math.imul(y, 668265263) + Math.imul(seed, 69068069)) | 0;
  h = Math.imul(h ^ (h >>> 13), 1274126177);
  h ^= h >>> 16;
  return (h >>> 0) / 4294967296;
}
