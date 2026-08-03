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

import { angleTo } from '../core/math';
import { registerAIAction } from '../engine/aiActions';
import type { Actor } from '../engine/actor';
import type { ConjureGrant, ConjuredPuff } from '../engine/flux';

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

// --- CLOUD-SEEKING CHOREOGRAPHY ----------------------------------------------
// x_seek_cloud: the flock-body's weather sense — the queued mirror of
// x_seek_fog (data/fog.ts), riding the puff ledger the dress pass reads
// (drawn == chased). A body whose rules carry `{ do: 'x_seek_cloud' }`:
//   FLEES a smother — standing inside vapor that would land a hostile-side
//     gift on it, it steps out from under the murk (the low_ceiling
//     counterplay, taught first by the monsters who suffer it);
//   CHASES a domain — otherwise it surges for the nearest standing puff
//     whose gifts would actually LAND on it (the zephyrid matron's
//     stormcradle over her flock, the ibis's balm), and no-ops once inside.
// The side filters mirror dressOccupants EXACTLY — side:'enemies' prefers
// the live owner through the world's own hostility oracle, team inequality
// only as the dead-owner fallback — so the chase can never disagree with
// what the cloud would do on arrival. No ledger, no reaching puff, mid-dash,
// held, or planted — the beat no-ops and tries again next window. Dormant
// bodies never reach here (the AI gate holds them upstream — the sentry
// law). Wearer: the mistwing shrike (data/monsters.ts).
registerAIAction('x_seek_cloud', (world, actor) => {
  const cg = world.conjured;
  if (!cg?.puffs.length || actor.dash || actor.heldBy || actor.stationary) return;
  // Would this grant land on this body? dressOccupants' five filters, verbatim.
  const reaches = (p: ConjuredPuff, g: ConjureGrant): boolean => {
    if (g.side === 'allies' && (p.team === null || actor.team !== p.team)) return false;
    if (g.side === 'enemies') {
      const oracle = p.owner && !p.owner.dead ? p.owner : null;
      if (oracle ? !world.hostileTo(oracle as Actor, actor)
        : (p.team === null || actor.team === p.team)) return false;
    }
    if (g.teams && !g.teams.includes(actor.team)) return false;
    if (g.factions && (!actor.faction || !g.factions.includes(actor.faction))) return false;
    if (g.notFactions && actor.faction && g.notFactions.includes(actor.faction)) return false;
    return true;
  };
  // ONE pass over the whole ledger, three verdicts ranked flee > home >
  // chase — a smother laid over an ally domain still throws the dash (the
  // rank is across ALL puffs, never within one: the probe's C rig pins it).
  const { x, y } = actor.pos;
  let flee: { p: ConjuredPuff; d: number; reach: number } | null = null;
  let home = false;
  let nearest: ConjuredPuff | null = null;
  let nearD = Infinity;
  for (const p of cg.puffs) {
    const dx = p.x - x, dy = p.y - y;
    const d2 = dx * dx + dy * dy;
    const reach = p.r + actor.radius * 0.5; // the dress pass's own inside test
    const inside = d2 <= reach * reach;
    let gift = false, smother = false;
    for (const g of p.grants) {
      if (!reaches(p, g)) continue;
      if (g.side === 'enemies') smother = true; else gift = true;
    }
    if (inside && smother) { flee ??= { p, d: Math.sqrt(d2), reach }; continue; }
    if (!gift) continue;
    if (inside) { home = true; continue; }
    if (d2 < nearD) { nearD = d2; nearest = p; }
  }
  if (flee) {
    // OUT from under the murk: past the rim with a stride to spare.
    const out = (flee.reach - flee.d + 40) / 240;
    actor.dash = { dir: angleTo(flee.p, actor.pos), speed: 240, remaining: out };
    return;
  }
  if (home) return; // already inside a gifting domain — the vapor does the rest
  if (!nearest || nearD < 24 * 24) return;
  actor.dash = { dir: angleTo(actor.pos, nearest), speed: 240, remaining: 0.5 };
});
