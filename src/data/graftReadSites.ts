// ---------------------------------------------------------------------------
// GRAFT READ-SITES — the one registry of "where the engine actually reads a
// support payload". A support's only socket gate is its tag lists, but many
// payloads are read only inside specific delivery branches of the cast
// pipeline — SkillTag (the socket currency) and delivery.type (the execution
// branch) are independent axes, so a gem can socket cleanly yet graft a
// payload whose read-site the host's delivery never reaches: a SILENT no-op.
//
// Two consumers, one truth:
//   - src/data/validate.ts — the boot-time warning sweep (per-graft, catalog-
//     wide, loud at every boot).
//   - src/sim/compat.ts — the skill × support interaction matrix (annotates
//     INERT runtime findings with the read-site that explains them).
//
// Every row names its engine read-site so drift is findable. Extend the map
// whenever a new delivery-scoped graft or stat ships. Rows are deliberately
// conservative: broad-by-design payloads (exposure, zoneGrow, gather, …) stay
// unrowed — see the trailing commentary — because a row here would cry wolf
// at every boot for legitimately broad gates.
// ---------------------------------------------------------------------------

import type { Delivery, SkillDef, SupportDef } from '../engine/skills';

type DeliveryType = Delivery['type'];

export type GraftReadRow = {
  /** Delivery branches whose execution actually reads the payload. */
  deliveries: DeliveryType[];
  /** Read-sites BEYOND the delivery switch (fx zones, pylon auras, linger
   *  fields) — the per-def false-positive escape hatch. */
  defReads?: (def: SkillDef) => boolean;
  /** Where the engine reads it — quoted in warnings as the fix-it trail. */
  site: string;
} & (
  | { kind: 'graft'; key: keyof SupportDef }  // a structured SupportDef field
  | { kind: 'stat'; key: string }             // a stat carried in mods/perLevel
);

/** The def's OWN data carries a stat (innate, growth, or threshold mods) —
 *  reads gated on stats rather than deliveries honor it (a cone with an
 *  innate lingerField genuinely reads aoeShape for the field it drops). */
export const defCarriesStat = (def: SkillDef, stat: string): boolean =>
  (def.innateMods ?? []).some(m => m.stat === stat)
  || (def.leveling?.perLevel ?? []).some(m => m.stat === stat)
  || (def.thresholds ?? []).some(t => t.mods.some(m => m.stat === stat));

// THE HIT-RIDER FAMILIES (apply_* chances, hit/kill procs, orbOnHit_*,
// added damage, crit, leech, knockback) read at ONE site — resolveHit —
// and are gated by the 'strikes' MECHANISM (SUPPORT_MECHANISMS, the
// structural floor: never-hitting hosts refuse honestly, and the refusal
// self-lifts when any strike-granting graft stands a hit up). They carry
// no rows here BECAUSE the floor already keeps their fit census honest;
// the PROMOTION CATALOG (each family's read-site extension — aura-carried
// afflictions pulsing their socketed chances, mark-counted hits crediting
// the curse, detonator mods riding the detonated packet) lives with the
// mechanism's doc and lands family by family as designed features.
export const GRAFT_READ_SITES: GraftReadRow[] = [
  {
    kind: 'stat', key: 'aoeShape',
    // 2026-07-21 (the sigil-on-the-swing pass): MELEE joined the read —
    // the plain swing re-geometries through inAoe when a sigil overrides
    // the shape (square = the surround slam covering corners, triangle =
    // the pointed wedge; whirling's spin still refuses melee by tags).
    deliveries: ['nova', 'ground', 'storm', 'aura', 'detonateProjectile', 'melee'],
    defReads: def => (def.delivery.type === 'construct' && !!def.delivery.aura)
      || def.effects.some(e => e.type === 'spawnZone')
      || defCarriesStat(def, 'lingerField'),
    site: 'area-shape queries (novas, ground zones, storms, auras, linger fields, melee swings)',
  },
  {
    kind: 'stat', key: 'aoeScatter',
    deliveries: ['nova', 'ground', 'storm', 'detonateProjectile'],
    site: 'spawnAftershocks (nova bursts, exploding/pulsing zones, storm strikes)',
  },
  {
    kind: 'stat', key: 'moveTrail',
    deliveries: ['dash', 'blink', 'leap', 'self'],
    // 2026-07-22: dash odometers, blink departure+arrival, leap launch+
    // landing, and the WALKING trail on self movement buffs (stealth's
    // burning wake — dies with the buff). Residue: movement-tagged
    // constructs/marks (temporal_pad, mark) travel nothing themselves.
    site: 'the travel grammars (dash odometer, blink ends, leap footprints, the walking trail on movement buffs)',
  },
  // 2026-07-21 (the aftermath minter — the cascade family beyond ground):
  // instantaneous area deliveries mint their sequels as zones off the
  // strike area, so the ground disciplines read on bursts and swings too.
  { kind: 'graft', key: 'cascade', deliveries: ['ground', 'nova', 'melee', 'detonateProjectile'], site: 'instanceCascadePlan (ground placements + the aftermath minter on bursts/swings; kindred gems elongate the native march, different-direction gems re-cast it)' },
  { kind: 'graft', key: 'pulse', deliveries: ['ground', 'nova', 'melee', 'detonateProjectile'], site: 'instancePulsePlan (ground placements + the aftermath minter on bursts/swings; appended gems\' beats follow the native rhythm)' },
  { kind: 'graft', key: 'zoneFollow', deliveries: ['ground'], site: 'the ground placement follow mint (lingering placements only)' },
  { kind: 'graft', key: 'cadence', deliveries: ['ground', 'nova', 'melee', 'detonateProjectile'], site: 'the beat mints (pulse gaps, cascade skips, emitter salvos — ground and aftermath alike)' },
  { kind: 'graft', key: 'trail', deliveries: ['projectile', 'construct'], site: 'spawnProjectile (flights + construct sub-casts via the sub-cast board; storm-spawned shots still unread — arrowfall flagged)' },
  { kind: 'graft', key: 'fissureTrail', deliveries: ['projectile', 'construct'], site: 'spawnProjectile (flights + construct sub-casts via the sub-cast board; storm-spawned shots still unread — arrowfall flagged)' },
  {
    kind: 'graft', key: 'tameMod',
    deliveries: ['target'],
    defReads: def => def.effects.some(e => e.type === 'tame'),
    site: 'tryTame + companionCapOf (the claim roll and the bond cap — tame effects only)',
  },
  {
    kind: 'graft', key: 'guardBash',
    // The answering family (2026-07-22): stance release/break (castMode
    // guard — aegis_of_dawn rejoined via its restored castMode), a
    // guard-tagged charge's arrival, a leap's landing, a construct's
    // death/expiry (full circle, break pays maxLife), and a toggled
    // shell's drop (remaining pool). Poolless workings pay
    // BASH_CFG.poollessShield × guardStrength.
    deliveries: ['dash', 'leap', 'construct', 'aura'],
    defReads: def => def.castMode === 'guard',
    site: 'guardBashSpec (stance release/break + the answering family: charge arrival, leap landing, construct death/expiry, shell drop)',
  },
  // exposure / zoneGrow / zoneSizeOver stay unrowed on purpose: their gems
  // gate on 'duration' the way madden/zoneEmit do — broad by design, and a
  // row here would cry wolf at every boot for legitimately broad gates.
  // The brim*/fuse* stats stay unrowed too: Stillwater/Overbrim gate on
  // 'channel' (brim-less channels are a legitimate socket), and Slow
  // Match's whole point is riding a Time Fuse graft — the loadout-time
  // composition this audit deliberately leaves alone. Likewise 'gather'
  // (read for every bar-cast at useSkill) and 'shellGraft' (gated by
  // its own requiresTags ['guard'] — the tag fit IS the audit). And
  // 'guardCast' (read at every press — canUse's hold-combo lift and
  // skillUseTime's instant force are delivery-agnostic by design).
  // The bashPower/bashFloor/bashInvert stat FAMILY stays unrowed like the
  // rest of the guard-stat kin (guardStrength, guardParry): stat mods are
  // cheap riders beside a gem's live payload, and rowing them would flag
  // every bash gem twice for one hole. The guardBash GRAFT itself IS
  // rowed above (castMode-scoped, not delivery-scoped) — the sim matrix
  // proved the 'guard' tag alone overreaches (charges/auras/wards).
  // Likewise 'conduit' — engagement-gated per-frame in Actor.updateConduits
  // (any held bar or burning toggle), delivery-agnostic by design; its
  // gems gate themselves with guard/channel/aura requiresTags and
  // validate.ts audits exactly that, so the tag fit IS the audit.
];

/** Does this support CARRY the row's payload (field set / stat modded)? */
export const supportCarriesRow = (sup: SupportDef, row: GraftReadRow): boolean => (row.kind === 'graft'
  ? sup[row.key] !== undefined
  : [...sup.mods, ...(sup.perLevel ?? [])].some(m => m.stat === row.key));

/** Is the row's payload UNREAD on this def — no delivery branch, no defReads
 *  escape, and (for stats) no construct sub-cast hop? The skill lookup keeps
 *  this module registry-free (validate.ts and the sim pass their own). */
export function rowUnreadBy(
  row: GraftReadRow, def: SkillDef,
  skillLookup: (id: string) => SkillDef | undefined,
): boolean {
  if (row.deliveries.includes(def.delivery.type)) return false;
  if (row.defReads?.(def)) return false;
  // STAT payloads reach a construct's sub-casts (the turret's shots, the
  // totem's novas): the deployed object wears the host's instanceMods as
  // its 'parentSkill' sheet source, so every sheet query the sub-skill
  // makes sees them. GRAFT payloads do NOT follow — sub-skill instances
  // are minted fresh (null sockets) and instance-read grafts die there.
  if (row.kind === 'stat' && def.delivery.type === 'construct' && def.delivery.castSkillId) {
    const sub = skillLookup(def.delivery.castSkillId);
    if (sub && !rowUnreadBy(row, sub, skillLookup)) return false;
  }
  return true;
}

/** Every payload row this support carries that the def never reads — the
 *  static "expect this pairing to be (partially) inert" annotation. */
export function unreadPayloadRows(
  sup: SupportDef, def: SkillDef,
  skillLookup: (id: string) => SkillDef | undefined,
): GraftReadRow[] {
  return GRAFT_READ_SITES.filter(row => supportCarriesRow(sup, row) && rowUnreadBy(row, def, skillLookup));
}
