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
// whenever a new delivery-scoped graft or stat ships. A broad-by-design gate
// no longer forces a payload to stay unrowed (2026-07-28): a (support × row)
// pair measured inert-broad and ACCEPTED as a design debt is adjudicated IN
// DATA — the row's `inertOk` ledger — and the boot sweep collapses those
// into one counted summary line while any unadjudicated pair stays loud and
// individually named. Payloads with no delivery scope at all (gather,
// guardCast, …) stay unrowed — see the trailing commentary.
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
  /** THE ADJUDICATED-INERT LEDGER (2026-07-28 — the support_matrix.json
   *  idiom carried on the registry row): (support × this row) pairs whose
   *  inert breadth was MEASURED, judged a deliberate design debt (a theme
   *  tag wider than the read-site, a documented engine hole), and accepted.
   *  The boot sweep (src/data/validate.ts) collapses adjudicated pairs into
   *  ONE counted summary line — an unadjudicated pair stays loud and
   *  individually named, so a fresh genuine finding can never drown — and
   *  audits the ledger right back: an entry naming an unknown support, a
   *  support that no longer carries the payload, or a pair with no inert
   *  fits left is STALE and warns until removed. Catalog-sweep scope only;
   *  the monster-grant lane still audits its authored pairs one by one.
   *  Every entry carries its WHY — the adjudication is the record. */
  inertOk?: { support: string; why: string; since: string }[];
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
    // 2026-07-22 (minter round 2): CONES joined with INVERTED figures
    // (square = the near-corner-filled rectangle, triangle = widest at
    // the caster's feet), LEAPS wear the slam grammar at the landing,
    // and exploding PROJECTILE bursts orient the sigil along the flight
    // (the defReads escape — plain flights read nothing).
    deliveries: ['nova', 'ground', 'storm', 'aura', 'detonateProjectile', 'melee', 'cone', 'leap'],
    defReads: def => (def.delivery.type === 'construct' && !!def.delivery.aura)
      || (def.delivery.type === 'projectile' && !!def.delivery.explode)
      || def.effects.some(e => e.type === 'spawnZone')
      || defCarriesStat(def, 'lingerField'),
    site: 'area-shape queries (novas, ground zones, storms, auras, linger fields, melee swings)',
    inertOk: [
      { support: 'square_sigil', why: `the 'aoe' theme gate admits deliveries that never run a drawn shape query (plain flights, target zaps, self bursts) — the radius rider still lands; partial by design`, since: '2026-07-28' },
      { support: 'triangle_sigil', why: `same broad 'aoe' gate as square_sigil — no shape query on the remaining fits; the 15% more damage still lands (partial by design)`, since: '2026-07-28' },
    ],
  },
  {
    kind: 'stat', key: 'aoeScatter',
    deliveries: ['nova', 'ground', 'storm', 'detonateProjectile'],
    site: 'spawnAftershocks (nova bursts, exploding/pulsing zones, storm strikes)',
    inertOk: [
      { support: 'aftershocks', why: `the 'aoe' theme gate spans swings/waves/flights that spawnAftershocks never reads — the promotion catalog (an aftermath-minter extension) owns the future, not a data fix`, since: '2026-07-28' },
    ],
  },
  {
    kind: 'stat', key: 'moveTrail',
    deliveries: ['dash', 'blink', 'leap', 'self'],
    // 2026-07-22: dash odometers, blink departure+arrival, leap launch+
    // landing, and the WALKING trail on self movement buffs (stealth's
    // burning wake — dies with the buff). Residue: movement-tagged
    // constructs/marks (temporal_pad, mark) travel nothing themselves.
    site: 'the travel grammars (dash odometer, blink ends, leap footprints, the walking trail on movement buffs)',
    inertOk: [
      { support: 'fire_walker', why: `movement-TAGGED bodies that do not themselves travel (temporal_pad, gate_shift, mark, gyre_hurl) — the residue this row's comment names; the addedFire rider still lands`, since: '2026-07-28' },
    ],
  },
  // 2026-07-21 (the aftermath minter — the cascade family beyond ground):
  // instantaneous area deliveries mint their sequels as zones off the
  // strike area, so the ground disciplines read on bursts and swings too.
  {
    kind: 'graft', key: 'cascade',
    deliveries: ['ground', 'nova', 'melee', 'detonateProjectile', 'cone', 'leap'],
    site: 'instanceCascadePlan (ground placements + the aftermath minter on bursts/swings/waves/skyfalls; kindred gems elongate the native march, different-direction gems re-cast it; storms deliberately unwired — a scatter has no bearing to march)',
    inertOk: [
      { support: 'spell_cascade', why: `the 'aoe' theme gate admits deliveries the cascade never re-casts (flights, storms — a scatter has no bearing to march; the site note owns the storm decision)`, since: '2026-07-28' },
      { support: 'scattered_cascade', why: `same broad 'aoe' gate as spell_cascade — no cascade plan on flights or storms`, since: '2026-07-28' },
      { support: 'seismic_march', why: `same broad 'aoe' gate as spell_cascade — no march on flights or storms`, since: '2026-07-28' },
    ],
  },
  {
    kind: 'graft', key: 'pulse',
    deliveries: ['ground', 'nova', 'melee', 'detonateProjectile', 'cone', 'leap', 'storm'],
    site: 'instancePulsePlan (ground placements + the aftermath minter on bursts/swings/waves/skyfalls + THE BURIED STRIKE: every storm strike arms the composed plan)',
    inertOk: [
      { support: 'buried_charge', why: `the 'aoe' theme gate admits hosts with no plan to arm (flights, self bursts, target zaps) — the buried strike serves storms and the aftermath minter serves swings; the rest wear the tag without a beat surface`, since: '2026-07-28' },
    ],
  },
  { kind: 'graft', key: 'zoneFollow', deliveries: ['ground'], site: 'the ground placement follow mint (lingering placements only)' },
  {
    kind: 'graft', key: 'cadence',
    deliveries: ['ground', 'nova', 'melee', 'detonateProjectile'],
    site: 'the beat mints (pulse gaps, cascade skips, emitter salvos — ground and aftermath alike)',
    inertOk: [
      { support: 'accelerando', why: `the 'aoe' theme gate admits hosts with no beat to warp — cadence multiplies pulse gaps/cascade skips/emitter salvos only where those mints run`, since: '2026-07-28' },
      { support: 'ritardando', why: `same broad 'aoe' gate as accelerando — no beat mint on the remaining fits`, since: '2026-07-28' },
    ],
  },
  {
    kind: 'graft', key: 'trail',
    deliveries: ['projectile', 'construct'],
    site: 'spawnProjectile (flights + construct sub-casts via the sub-cast board; storm-spawned shots still unread — arrowfall flagged)',
    inertOk: [
      { support: 'detonating_passage', why: `arrowfall alone: storm-spawned shots never pass spawnProjectile's trail read — the hole the site note flags; promotion tracked there`, since: '2026-07-28' },
      { support: 'scorched_wake', why: `arrowfall alone — the same storm-spawned-shot hole the site note flags`, since: '2026-07-28' },
      { support: 'sloughing_wake', why: `arrowfall alone — the same storm-spawned-shot hole the site note flags`, since: '2026-07-28' },
    ],
  },
  {
    kind: 'graft', key: 'fissureTrail',
    deliveries: ['projectile', 'construct'],
    site: 'spawnProjectile (flights + construct sub-casts via the sub-cast board; storm-spawned shots still unread — arrowfall flagged)',
    inertOk: [
      { support: 'sundering_flight', why: `arrowfall alone — the same storm-spawned-shot hole the site note flags`, since: '2026-07-28' },
    ],
  },
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
    inertOk: [
      { support: 'answering_wall', why: `magma_ward alone: guard-TAGGED but a block-fed vent nova — no stance release, charge arrival, landing or shell drop to answer; the gem's stat riders still land (its own dual-use contract)`, since: '2026-07-28' },
    ],
  },
  // 2026-07-28 — the once-unrowed trio joins with MEASURED reads (the
  // adjudication seam retired the cry-wolf objection that kept them out;
  // the trailing commentary records what was measured and what stays open).
  {
    kind: 'graft', key: 'exposure',
    deliveries: ['ground'],
    // BOTH engine reads — the disc placement's fume ledger and the venting
    // crack (layFissure segments) — live inside the ground-delivery branch
    // (GroundDelivery.fissure is a ground form), so 'ground' alone is the
    // whole truth. Measured 2026-07-28: a projectile's fissureTrail tear
    // does NOT vent grafted fumes (its segment mint carries only the
    // volatile/aftershock/roulette textures) — the arrowfall idiom: named
    // in the site, no defReads escape claimed for a read that does not
    // exist, promotion tracked there.
    site: `the ground mint's fume ledgers (disc placements + fissure vent segments; projectile fissureTrail tears vent nothing — flagged)`,
    inertOk: [
      { support: 'creeping_fumes', why: `the 'duration' theme gate admits lingering bodies that lay no surface (war_cry, renew, aegis_of_dawn — buffs, wards, songs; 189 measured 2026-07-28) while the fume ledger exists only on laid ground; candidate structural fix: requiresMechanisms ['surface'] on the gem — a supports.ts change owing its own matrix slice, outside this pass`, since: '2026-07-28' },
    ],
  },
  {
    kind: 'graft', key: 'zoneGrow',
    deliveries: ['ground'],
    // The lifted linger field (dropLingerField) grows too — a def whose OWN
    // data stands a field up genuinely reads the graft. The aoeShape row's
    // escape, NARROWED on measurement (2026-07-28): spawnZone pools set no
    // grow, so they earn no escape here.
    defReads: def => defCarriesStat(def, 'lingerField'),
    site: 'the ground placement mint + cascade ripples + the lifted linger field (dropLingerField)',
  },
  {
    kind: 'graft', key: 'zoneSizeOver',
    deliveries: ['ground'],
    defReads: def => defCarriesStat(def, 'lingerField'),
    site: 'instanceSizeOver (ground discs + fissure half-width walks + the lifted linger field; spawnZone pools read no envelope)',
  },
];

// exposure / zoneGrow / zoneSizeOver are ROWED as of 2026-07-28 (above) —
// the adjudication seam ended the era when a broad gate forced a payload to
// stay unrowed. zoneGrow and zoneSizeOver earn their rows for FREE: every
// carrier (overgrowth; ebbing/blooming/tidal_ground) gates on
// requiresMechanisms ['surface'], and the boot sweep now speaks the socket
// gate's whole truth (tags AND mechanisms, bare-instance — the sim census's
// own stance), so a properly-gated gem flags NOTHING today. The rows exist
// as the read-site record, the sim matrix's static INERT annotation, and
// the tripwire for a future carrier that forgets its gate. zoneSizeOver was
// judged deliberately, not by symmetry alone: same reads as zoneGrow plus
// the fissure half-width walk, same 'surface'-gated carriers, zero noise —
// a row that costs nothing and catches the forgotten-mechanism authoring
// mistake is pure upside. exposure's one carrier (creeping_fumes) gates on
// 'duration' ALONE, so its breadth is real and adjudicated on the row; the
// candidate structural fix — requiresMechanisms ['surface'] on the gem — is
// a supports.ts change left for its own pass (a support edit owes a
// `matrix check --support` slice this chip does not run). madden/zoneEmit
// keep the same 'duration' breadth and stay unrowed for now — candidates
// for the same measured treatment, nothing more claimed here.
// The brim*/fuse* stats stay unrowed: Stillwater/Overbrim gate on
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
