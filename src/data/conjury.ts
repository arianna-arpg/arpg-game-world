// ---------------------------------------------------------------------------
// CONJURY — the data half of the CLOUD PRESENCE (engine/flux.ts, the
// conjured-ground fabric's second half).
//
// A called cloud grants what its DATA says it grants: the skill's own rows
// ride on ConjureEffect.grants / trailConjure.grants, and the rows below are
// RIDERS — grants armed by a STAT on the caster, so a support gem, an affix,
// a passive or a monster boon can teach every cloud that caster calls a new
// gift without naming a single skill. World.conjureGrantsFor folds the two
// sources at each call site (with the cast's own tag/extra context, so
// socketed supports actually reach the read).
//
// Adding a rider = one row + one status + one granting source (a support's
// `mod('<stat>', 'flat', 1)`). No engine edits, no skill edits.
// ---------------------------------------------------------------------------

import type { ConjureGrant } from '../engine/flux';

export interface ConjureRider {
  /** Sheet stat that arms this rider (>0 on the cast = the grant rides). */
  stat: string;
  grant: ConjureGrant;
}

export const CONJURE_RIDERS: readonly ConjureRider[] = [
  // THE WIND-LANE (cloudTrail — the Cloudborne support / Zephyr trails):
  // stat-taught trail clouds are ROADS, not just bridges — the caller's
  // side keeps the wind's pace while they run where the cloud was laid.
  { stat: 'cloudTrail', grant: { status: 'windlane', side: 'allies' } },
  // THUNDERHEAD (cloudCharge): called clouds come CHARGED — the caller's
  // side laces its blows with shock while standing inside.
  { stat: 'cloudCharge', grant: { status: 'stormlaced', side: 'allies' } },
  // SILVER LINING (cloudSalve): called clouds carry silver rain — the
  // caller's side knits flesh and focus while the weather holds.
  { stat: 'cloudSalve', grant: { status: 'silverlined', side: 'allies' } },
];

/** BOOT VALIDATION (wired into validateContent beside validateFog): every
 *  rider names a real status. Skill/delivery grant rows are validated by
 *  the same caller over the skill registry. */
export function validateConjury(hasStatus: (id: string) => boolean): string[] {
  const bad: string[] = [];
  for (const r of CONJURE_RIDERS) {
    if (!hasStatus(r.grant.status)) {
      bad.push(`conjure rider '${r.stat}': grant names unknown status '${r.grant.status}'`);
    }
  }
  return bad;
}
