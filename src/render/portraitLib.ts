// ---------------------------------------------------------------------------
// THE WEBSITE PORTRAIT BUNDLE — the parity seam, extended from facts to
// PIXELS. Built by `npm run build:portraits` (vite.portraits.config.ts) into
// site/assets/portraits.js as the iife global `HWPortraits`; the database
// page feeds it the exported monster rows (site/data/monsters.json) and gets
// back the same composed body the game draws — the portrait fabric
// (render/vis/portrait.ts), the body baker, the whole part grammar and the
// LOOKS registry ride along verbatim, so a monster's website portrait can
// never drift from its in-game self.
//
// The bundle stays def-registry-free on purpose: MONSTERS/FACTIONS live in
// the exported JSON (raw rows + the stamped demonHorns flag), not in here —
// the data on the page IS the input, exactly as the site's design demands.
// ---------------------------------------------------------------------------

import {
  drawPortraitInto, paintPortrait, portraitSubjectOf, portraitTile,
  type PortraitDefLike, type PortraitOpts, type PortraitSubject,
} from './vis/portrait';
import { VIS_CFG } from './vis/visConfig';

export { drawPortraitInto, paintPortrait, portraitSubjectOf, portraitTile };
export type { PortraitDefLike, PortraitOpts, PortraitSubject };

/** The fabric's oversample factor — pages size canvas backing stores by it. */
export function oversample(): number {
  return VIS_CFG.portrait.oversample;
}

/** One-call convenience for the database page: take an exported monster row
 *  (`{ raw, demonHorns }` — normMonster's shape), resolve composite parts
 *  against the full exported list, and paint the portrait into `canvas`. */
export function paintMonsterRow(
  canvas: HTMLCanvasElement,
  row: { raw?: Record<string, unknown>; demonHorns?: boolean },
  byId: (id: string) => { raw?: Record<string, unknown>; demonHorns?: boolean } | undefined,
  opts: PortraitOpts,
): void {
  const defOf = (r: { raw?: Record<string, unknown>; demonHorns?: boolean }): PortraitDefLike =>
    ({ ...(r.raw as unknown as PortraitDefLike), demonHorns: !!r.demonHorns });
  if (!row.raw) return;
  const subject = portraitSubjectOf(defOf(row), {
    resolvePart: id => {
      const part = byId(id);
      return part?.raw ? defOf(part) : undefined;
    },
  });
  paintPortrait(canvas, subject, opts);
}
