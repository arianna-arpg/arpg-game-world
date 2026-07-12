// ---------------------------------------------------------------------------
// Skill definition schema.
//
// A skill is PURE DATA: tags + cost + a *delivery* (how it reaches targets)
// + a list of *effects* (what happens when it lands). Players, monsters and
// minions all execute skills through the exact same pipeline (world.useSkill).
// Adding a new skill never requires engine changes — compose a delivery with
// effects in src/data/skills.ts.
//
// Lifecycle & randomness primitives available to deliveries:
//  - CountSpec ranges ([min,max]) anywhere a count appears
//  - weighted summon pools, minion lifespans, persistent contracts
//    (mana reservation + timed respawn), invulnerable/untargetable minions
//  - storm deliveries (scattered strikes, immediate or sequenced)
// ---------------------------------------------------------------------------

import type { AttributeId, DamageType, Modifier, SkillTag } from './stats';
import type { CurveKind } from './curves';

// --- Deliveries: how the skill reaches its targets -------------------------

/**
 * Counts can be fixed or a [min, max] range rolled per use. Count-modifying
 * stats (projectileCount, stormCount) shift BOTH bounds of a range.
 */
export type CountSpec = number | [number, number];

/** Visual + flavor form of a projectile. Collision stays radius-based —
 *  wide forms (bar / arc / wave) pair with a large radius for wide hits. */
export type ProjectileShape =
  | 'circle' | 'square' | 'line' | 'triangle' | 'octagon'
  | 'bar'    // a wide front perpendicular to travel (beams, force walls)
  | 'arc'    // a crescent opening backward (Frost Pulse)
  | 'wave';  // a rolling sine front (Fire Siege)

/**
 * Composable TRAJECTORY ATTRIBUTES. Each axis is a strength (0 = inert), and
 * each rides a stat (homingPower, erraticPower, spiralPower, orbitPower,
 * spinPower, weavePower): the values here are the skill's INNATE baselines,
 * fed to the stat query as its base — so supports, passives, and future
 * affixes can create an axis from nothing (flat), sharpen an innate one
 * (increased/more), or dampen it (negative more — Trueflight straightens
 * erratic flight). Axes COMPOSE freely: spiral + erratic wobbles the spiral,
 * weave + orbit traces a figure-eight around the caster, orbit + spiral is a
 * slowly widening orbit, homing + spin drifts a spinning blade toward prey.
 * The integrator lives in World.advanceProjectile.
 */
export interface TrajectorySpec {
  /** Turn rate toward enemies, rad/s (homingPower). */
  homing?: number;
  /** Turn rate toward the CASTER'S LIVE AIM POINT, rad/s (guidePower) — the
   *  missile is a marionette on the cursor's string (Arcane Missiles;
   *  construct-fired projectiles follow their OWNER's cursor — Hell Rift). */
  guide?: number;
  /** Random steering jitter, rad/s (erraticPower). */
  erratic?: number;
  /** Revolve around a FIXED anchor — the cast point — while the radius grows;
   *  strength is angular speed in rad/s, and the radial growth scales with
   *  projectile speed (spiralPower). With orbit also active, spiral yields
   *  the revolution to the tether and contributes only the growth. */
  spiral?: number;
  /** Revolve TETHERED to the caster at a held radius; strength scales the
   *  revolution (1 ≈ tangential speed equal to projectile speed) (orbitPower). */
  orbit?: number;
  /** Spin around the flight axis — a tight epicycle; strength is the spin
   *  rate in rad/s (spinPower). */
  spin?: number;
  /** Weave a figure-eight along the travel line; strength is the weave
   *  frequency in rad/s (weavePower). */
  weave?: number;
  /** Lateral size of the spin / weave offsets, units (default 35 / 45). */
  amplitude?: number;
  /** Starting tether radius while orbiting, units (default 50). */
  orbitRadius?: number;
  /** ACCELERATION: fractional speed change per second of flight (+0.6 =
   *  gathers 60%/s, negative = bleeds speed; floors at a crawl). The
   *  projAccel stat rides it (Momentum). */
  accel?: number;
  /** ZIG-ZAG (Skittering Bolt): the flight KINKS every `interval` seconds
   *  (and on every survived hit when `onHit`), alternating ±angleDeg —
   *  and each turn SHEDS `shed` shard projectiles in the direction it
   *  abandoned. Pairs with guide for player-drawn angles. */
  zigzag?: { interval: number; angleDeg: number; onHit?: boolean; shed?: number };
  /** TERRAIN BOUNCE (Galewisp): ricochets off rocks, walls and masonry
   *  this many times before dying — the twister that works the room. */
  bounce?: number;
  /** RECURVE (Heartchaser): on a survived hit, this `chance` to whip
   *  around and strike the SAME victim again — × `decay` per recurve, so
   *  the miracle shots run out. The victim's hit-lock clears on the turn. */
  recurve?: { chance: number; decay?: number };
  /** SELECTIVE PIERCE (Heartchaser): the shot has ONE prey — the nearest
   *  enemy at launch (or the homing target) — and passes HARMLESSLY
   *  through everything else. When the prey dies, it retargets. */
  selectivePierce?: true;
  /** CAROM ON HIT (the no-pierce Galewisp): entity impacts DEFLECT the
   *  flight (a wide random bounce off the body) instead of ending it —
   *  the victim can be struck again after `rehit`-style lockout seconds. */
  caromOnHit?: number;
  /** ARC-TO (Rimeclaw): the volley fans out, then every shot CONVERGES on
   *  the cast point and DETONATES there — strength is the convergence
   *  turn-rate in rad/s (higher = tighter hook). Dies on arrival (the
   *  explode payload fires); pairs naturally with `explode`. */
  arcTo?: number;
}

/**
 * A TETHER: a live LINE between two anchors — a spawned object and its
 * caster, an object and its sibling objects, or the caster and a resolved
 * target. The band between the endpoints is a transient field: hostiles
 * crossing it take typed damage over time (a "bleed" that exists only while
 * they touch the line — no status is ever applied), and allied bands can
 * heal what stands in them. Carried INNATELY by a skill (SkillDef.tether)
 * or granted by a support (Tripwire, Transient Inferno, Lifeline). Beam
 * damage honours the conversion schema like any other typed source.
 */
export interface TetherSpec {
  /** 'caster': spawned object ↔ its caster. 'network': spawned object ↔
   *  every sibling object of the same skill within `radius` (a trap web).
   *  'target': caster ↔ the skill's resolved target (bond skills/supports —
   *  needs targeting). */
  link: 'caster' | 'network' | 'target';
  /** Who the band affects (default 'enemies'). */
  affects?: 'enemies' | 'allies' | 'all';
  /** Damage per second to hostiles crossing the band — scaled by the
   *  caster's damage stat at attach time, then CONVERTED. */
  dps?: number;
  damageType?: DamageType;
  /** Healing per second to allied actors inside the band (endpoints too). */
  healPerSec?: number;
  /** Half-width of the band's touch test, units (default 10). */
  width?: number;
  /** network: max link distance between sibling objects (default 360). */
  radius?: number;
  /** target-link lifespan in seconds (× effectDuration; default 8). Object
   *  links instead live exactly as long as both endpoints do. */
  duration?: number;
  /** Band colour (default: the beam's dominant damage-type tint, or the
   *  heal green). */
  color?: string;
}

/**
 * AIM TRANSFORMS — how a use picks its strike bearing, relative to the
 * caster's aim. Carried by a SKILL (identity: Buckler Strike's alternating
 * figure) or a SUPPORT (grafted: Alternating Strikes on any melee skill).
 *
 * `random`: each use lashes out at a random bearing inside a SECTOR —
 * offsetDeg centers it (0 = ahead, 180 = behind), spreadDeg is its full
 * width, and the randomArc stat scales the spread (Wild Abandon widens a
 * flurry to a full circle; a negative-more focuses it). The sector is
 * LOCKED to the aim at cast time.
 *
 * `sequence`: the skill PLAYS ITSELF — per-step bearing offsets (degrees,
 * relative to the cast aim) delivered one per `pause` seconds (÷ attack/cast
 * speed). Bearings bake at cast time, so the figure holds even as the caster
 * whirls. Multistrike repeats re-enter the skill and replay the WHOLE figure.
 */
export interface AimSpec {
  random?: { offsetDeg?: number; spreadDeg: number };
  sequence?: { steps: number[]; pause: number };
}

/** One tag-gate check against an explicit tag pool — the primitive behind
 *  every fit test (def-level, instance-level, lane pools, crew pools). */
export function supportFitsTags(sup: SupportDef, tags: readonly SkillTag[]): boolean {
  if (sup.excludeTags && sup.excludeTags.some(t => tags.includes(t))) return false;
  if (!sup.requiresTags || !sup.requiresTags.length) return true;
  return sup.requiresTags.some(t => tags.includes(t));
}

/**
 * THE LANE ROUTER — the sockets that serve the HOST instance's own casts.
 * A gem serves exactly the lanes it FITS: one admitted through the CREW
 * gate (it boards the minions a summon mints) must not shape the summon
 * cast itself — Alternating Strikes on Summon Skeleton Warrior alternates
 * the warriors' cleaves, never the summoning, and Legion Call keeps sole
 * custody of summon-cast shaping. Fit is computed to FIXPOINT over granted
 * tags (arrangement-independent, matching the socket gate): a gem serves
 * the host when its tag gate passes against the def's tags plus the grants
 * of other host-serving gems. Hybrid defs opt into both lanes BY TAGGING —
 * a melee+summon skill hands melee gems the host swing AND the crew; the
 * router is pure data, no flags. On a minion's own instance the forwarded
 * copies re-pass this check by construction (they were fit-forwarded, kit
 * gems compose in the same pool), so every payload reader filters through
 * here uniformly. Slot order is preserved in the result — meta chains and
 * first-graft-wins rules stay player-curated.
 */
export function hostSockets(inst: SkillInstance): SupportInstance[] {
  // GRAFTS ride the same lane as socketed gems: bound passive powers
  // (devotions, future mutator sources) append after the real sockets and
  // pass the identical fixpoint tag-admission — a misfit graft is inert
  // exactly like a misfit socket, and every payload reader downstream sees
  // grafts with no further edits. Slot order: sockets first, grafts after.
  const sockets = inst.grafts?.length ? [...inst.sockets, ...inst.grafts] : inst.sockets;
  const admitted: boolean[] = new Array(sockets.length).fill(false);
  const pool = [...inst.def.tags];
  let grew = true;
  while (grew) {
    grew = false;
    for (let i = 0; i < sockets.length; i++) {
      const s = sockets[i];
      if (!s || admitted[i] || !supportFitsTags(s.def, pool)) continue;
      admitted[i] = true;
      if (s.def.grantsTags) { pool.push(...s.def.grantsTags); grew = true; }
    }
  }
  const out: SupportInstance[] = [];
  for (let i = 0; i < sockets.length; i++) {
    const s = sockets[i];
    if (s && admitted[i]) out.push(s);
  }
  return out;
}

/** CREW BOARDING CONFIG — the balance lever over support forwarding.
 *  'gated': boarding demands a RESONANCE key (SupportDef.resonance) riding
 *  the summon skill — the whole system costs one socket. 'free': every
 *  riding gem socketed into a summon boards its crew (the overhaul's
 *  launch behavior). Socketing stays PERMISSIVE in both modes (build your
 *  links before you find the key); dormant gems are marked ⤳✕ in the book
 *  and contribute NOTHING — not even costs. Non-summon crews (Forgebound
 *  proc-conscripts, Hiveborn broods) are never gated. */
export const CREW_CFG = {
  boarding: 'gated' as 'gated' | 'free',
};

/** Is this instance's crew door OPEN — do riding gems actually board?
 *  Free mode: always. Gated: a resonance key must be HOST-SERVING (a key
 *  that doesn't fit the skill opens nothing — the ordinary lane rules
 *  govern the key like any other gem). */
export function crewBoardingOpen(inst: SkillInstance): boolean {
  if (CREW_CFG.boarding === 'free') return true;
  return hostSockets(inst).some(s => !!s.def.resonance);
}

/** Cost-family stats an ACTIVELY BOARDING crew gem still bills to the HOST
 *  cast — the summoner strains to field the stronger crew (and persistent
 *  contracts reserve accordingly: the manaCost stat feeds reservations).
 *  One registry, deliberately small: a gem serves host costs AND crew
 *  payloads with no bespoke per-gem fields. Extend with intent. */
export const HOST_COST_STATS: ReadonlySet<string> = new Set([
  'manaCost', 'addedManaCost', 'addedLifeCost',
]);

/** The aim transform a use obeys: a socketed support's graft wins over the
 *  skill's own (one transform per use — they don't stack). */
export function instanceAim(inst: SkillInstance): AimSpec | undefined {
  for (const s of hostSockets(inst)) if (s.def.aim) return s.def.aim;
  return inst.def.aim;
}

/** Seconds between the beats of a META CHAIN — the breath each order gets
 *  to play out before the next fires (a lunge lands before the bang). */
export const META_CHAIN_INTERVAL = 0.85;

/** EVERY meta-action riding an instance's slot, in EXECUTION ORDER: the
 *  skill's innate meta first, then each socketed grant in SLOT ORDER — the
 *  player curates the sequence by arranging gems. One shift-press fires
 *  the whole chain, one beat apart (duplicate payloads dedupe). */
export function instanceMetas(inst: SkillInstance): { skillId: string; label: string }[] {
  const out: { skillId: string; label: string }[] = [];
  const seen = new Set<string>();
  const add = (m?: { skillId: string; label: string }): void => {
    if (m && !seen.has(m.skillId)) { seen.add(m.skillId); out.push(m); }
  };
  add(inst.def.meta);
  for (const s of hostSockets(inst)) add(s.def.meta);
  return out;
}

/** The META-ACTION shown on the slot (the chain's FIRST beat — see
 *  instanceMetas for the full order a shift-press fires). */
export function instanceMeta(inst: SkillInstance): { skillId: string; label: string } | undefined {
  return instanceMetas(inst)[0];
}

// === SKILL CONVERSION ==========================================================
// The EXHAUSTED-SKILL two-for-one (SkillDef.convert): while a rule holds,
// PRESSING this skill casts another catalog skill instead — a Tame whose
// bond is full presses as the Whistle; a future kennel converts only at
// four held bonds. The rule is an OPEN REGISTRY entry ('companionsFull'
// ships; packages register their own), the payload is minted per host at
// the host's effective level with hostSkillId stamped (the meta/combo
// idiom — a converted Whistle scopes to THIS gem's companions), and the
// HUD presents the converted FACE (World.slotFaceOf) so the button never
// lies. The slot's META stays the HOST's own (Attack! rides Tame however
// the base press resolves).

export interface ConvertSpec {
  /** Conversion rule id from CONVERT_RULES (open registry). */
  when: string;
  /** The catalog skill a converted press casts. */
  skillId: string;
}

export type ConvertRule = (
  caster: import('./actor').Actor,
  inst: SkillInstance,
  world: import('./world').World,
) => boolean;

/** The open conversion-rule registry — a new condition is a new entry
 *  (registerConvertRule), never an engine edit. Rules are STATELESS reads;
 *  run-state belongs on the world they're handed. */
export const CONVERT_RULES: Record<string, ConvertRule> = {};
export function registerConvertRule(id: string, rule: ConvertRule): void {
  CONVERT_RULES[id] = rule;
}
export function hasConvertRule(id: string): boolean { return !!CONVERT_RULES[id]; }
export function convertRuleHolds(
  when: string, caster: import('./actor').Actor, inst: SkillInstance,
  world: import('./world').World,
): boolean {
  return CONVERT_RULES[when]?.(caster, inst, world) ?? false;
}

/** THE GRIMOIRE form this instance summons instead of reading corpses —
 *  set only when the delivery opts in (grimoire) AND a form is attuned.
 *  One predicate every consumer shares: targeting bypass, the summon
 *  branch, the greying gate, the Build-pane chip. */
export function grimoireForm(inst: SkillInstance): string | undefined {
  const d = inst.def.delivery;
  return d.type === 'summon' && d.grimoire && inst.attunedForm ? inst.attunedForm : undefined;
}

/** The curse→field conversion riding an instance, if any (Miasma). */
export function instanceCurseField(inst: SkillInstance): NonNullable<SupportDef['curseField']> | undefined {
  for (const s of hostSockets(inst)) if (s.def.curseField) return s.def.curseField;
  return undefined;
}

/** The overcharge spec a use obeys: a socketed support's graft wins over
 *  the skill's own (one per use — stages don't stack across gems). */
export function instanceOvercharge(inst: SkillInstance): OverchargeSpec | undefined {
  for (const s of hostSockets(inst)) if (s.def.overcharge) return s.def.overcharge;
  return inst.def.overcharge;
}

/** The FIRST socketed graft of a given SupportDef field — the generic
 *  reader behind the one-per-use grafts (sacrifice, dominate, corpseSpawn,
 *  auraDuration, healField, zoneEmit, madden, fissure volatility…). */
export function socketSpec<K extends keyof SupportDef>(
  inst: SkillInstance, key: K,
): NonNullable<SupportDef[K]> | undefined {
  for (const s of hostSockets(inst)) {
    const v = s.def[key];
    if (v !== undefined) return v as NonNullable<SupportDef[K]>;
  }
  return undefined;
}

/** Every charge tap riding an instance: the skill's own + socket grafts. */
export function instanceChargeGain(inst: SkillInstance): ChargeGainSpec[] {
  const out = [...(inst.def.chargeGain ?? [])];
  for (const s of hostSockets(inst)) if (s.def.chargeGain) out.push(...s.def.chargeGain);
  return out;
}

/** The brood clause riding an instance (first socket graft wins). */
export function instanceBrood(inst: SkillInstance): BroodSpec | undefined {
  for (const s of hostSockets(inst)) if (s.def.brood) return s.def.brood;
  return undefined;
}

/** A status-tick SPAWN clause (Broodclutch): while a status carrying it
 *  ticks, every point of damage dealt has `perDamage` chance to hatch
 *  `monsterId` serving the applier, living `duration` seconds, at most
 *  `max` alive per applier. Chance-per-damage means the clause scales
 *  with investment in the ailment itself — potency IS fecundity. */
export interface BroodSpec {
  monsterId: string;
  perDamage: number;
  duration: number;
  max: number;
}

/** The targeting a use resolves with: a socketed support's graft wins over
 *  the skill's innate spec (Closing Instinct on a plain dash). */
export function instanceTargeting(inst: SkillInstance): TargetingSpec | undefined {
  for (const s of hostSockets(inst)) if (s.def.targeting) return s.def.targeting;
  return inst.def.targeting;
}

/** The turret conversion riding an instance, if any (Risen Offering). */
export function instanceTurret(inst: SkillInstance): { castSkillId: string; life?: number; look?: string } | undefined {
  for (const s of hostSockets(inst)) if (s.def.turret) return s.def.turret;
  return undefined;
}

/** The strike-timing discipline a use obeys: a socketed graft wins; a
 *  skill's innate castMode 'perfect'/'timed' provides the fallback (so
 *  Snipe + Overcharge composes with no extra gem — the innate golden
 *  window becomes the release window). One discipline per use. */
export function instanceStrikeTiming(inst: SkillInstance): StrikeTimingSpec | undefined {
  for (const s of hostSockets(inst)) if (s.def.strikeTiming) return s.def.strikeTiming;
  if (inst.def.castMode === 'perfect') return { kind: 'perfect' };
  if (inst.def.castMode === 'timed') return { kind: 'timed', bonus: 1.2 };
  return undefined;
}

/**
 * SIZE ENVELOPE: a lingering zone's radius WALKS from `from` × its birth
 * radius to `to` × it over the zone's WHOLE linger, shaped by a named unit
 * curve (src/engine/curves.ts) — duration-normalized breathing. `to: 0`
 * contracts into obscurity exactly as the linger dies (the closing pool);
 * `from` < `to` blooms from a seed. Because the walk rides the linger
 * clock, DURATION stays the leverable composable: effectDuration
 * investment, speed-fed lingers (durationBySpeed) and pulse-imposed
 * surfaces all reshape the pace without touching the spec.
 *
 * While present it is THE radius authority — innate grow/retract stand
 * down (one authority per disc) — and everything reading the LIVE radius
 * (ticks, pulses, endBursts, default pull reach, rendering) breathes with
 * it. An explicit pullRadius stays as authored. Rides the primary
 * placement, line/wall segments, cascade ripples, projectile-trail drops
 * and endZone blooms alike.
 */
export interface SizeEnvelopeSpec {
  /** Radius multiplier at birth (default 1). */
  from?: number;
  /** Radius multiplier as the linger expires (default 0 — contract away). */
  to?: number;
  /** Unit curve shaping the walk (CURVES registry; default 'linear').
   *  For a contraction: quadIn holds then collapses, quadOut slumps fast
   *  then lingers small, 'breath' swells out and returns home. */
  curve?: CurveKind;
}

/** Resolve a SizeEnvelopeSpec's defaults into the runtime form zones carry
 *  (undefined in, undefined out) — the ONE defaults path every zone-push
 *  site shares. */
export function resolveSizeOver(spec?: SizeEnvelopeSpec):
  { from: number; to: number; curve: CurveKind } | undefined {
  return spec
    ? { from: spec.from ?? 1, to: spec.to ?? 0, curve: spec.curve ?? 'linear' }
    : undefined;
}

/** SPEED-FED LINGER: a projectile-dropped zone's duration scales with the
 *  flight's LIVE speed at the drop — linger × clamp((speed/ref)^exp, min,
 *  max). exp defaults 1 (fast flight = long life); NEGATIVE exp inverts
 *  (the dawdle lingers — slow lobs sow long-lived pools). min defaults
 *  0.25, max 4. With a size envelope riding the drop, contraction PACE
 *  follows automatically — duration is the composable being fed. */
export interface DurationBySpeedSpec {
  /** Reference speed (units/s) at which the linger is exactly ×1. */
  ref: number;
  /** Exponent on speed/ref (default 1; negative inverts). */
  exp?: number;
  /** Clamp floor on the multiplier (default 0.25). */
  min?: number;
  /** Clamp ceiling on the multiplier (default 4). */
  max?: number;
}

/** The zone a projectile path/terminus drops (ProjTrailSpec.zone, endZone):
 *  radius/duration plus the optional breathing envelope and speed-fed
 *  linger — one shape shared by every drop site. */
export interface DropZoneSpec {
  radius: number;
  duration: number;
  tickInterval?: number;
  damageScale?: number;
  /** The drop BREATHES (see SizeEnvelopeSpec) — contracting venom pools,
   *  blooming embers. */
  sizeOver?: SizeEnvelopeSpec;
  /** The drop's linger rides the flight's live speed (see
   *  DurationBySpeedSpec). */
  durationBySpeed?: DurationBySpeedSpec;
}

/**
 * A PROJECTILE TRAIL: every `every` units of travel the projectile drops
 * destruction at its position — an immediate BLAST (a fraction of the
 * skill's damage in a radius) and/or a lingering ground ZONE ticking the
 * same. The Bone-Spear-unique fantasy: a guided missile with a trail leaves
 * an arc of ruin wherever the cursor drags it.
 */
export interface ProjTrailSpec {
  /** Units of travel between drops. */
  every: number;
  /** Immediate blast at each drop point. */
  blast?: { radius: number; damageScale?: number };
  /** Lingering ground zone at each drop point (envelope + speed-fed
   *  linger ride along — see DropZoneSpec). */
  zone?: DropZoneSpec;
}

/** The trail a projectile lays: a socketed support's graft wins over the
 *  skill's own (one trail per projectile — they don't stack). */
export function instanceTrail(inst: SkillInstance): ProjTrailSpec | undefined {
  for (const s of hostSockets(inst)) if (s.def.trail) return s.def.trail;
  return inst.def.delivery.type === 'projectile' ? inst.def.delivery.trail : undefined;
}

/** The size envelope a ground placement breathes: a socketed support's
 *  graft wins over the delivery's own (the trail rule — you socketed it
 *  to change the behavior). */
export function instanceSizeOver(inst: SkillInstance): SizeEnvelopeSpec | undefined {
  for (const s of hostSockets(inst)) if (s.def.zoneSizeOver) return s.def.zoneSizeOver;
  return inst.def.delivery.type === 'ground' ? inst.def.delivery.sizeOver : undefined;
}

/** PER-CAST VARIANCE — the organic-instability axis: parts of the skill's
 *  own footprint re-roll on every cast. Every field is a uniform
 *  MULTIPLIER range; the same skill blooms small and huge from press to
 *  press (channel pulses re-roll per beat — each detonation its own die). */
export interface VarianceSpec {
  /** Area multiplier range per cast, folded into the cast's aoeScale —
   *  impact, linger, envelope anchors and cascades all breathe together
   *  ([0.6, 1.5] wanders between a pop and a bloom, same average). */
  aoe?: [number, number];
}

/** The variance a cast re-rolls under: a socketed support's graft wins
 *  over the skill's own (the trail rule). */
export function instanceVariance(inst: SkillInstance): VarianceSpec | undefined {
  for (const s of hostSockets(inst)) if (s.def.variance) return s.def.variance;
  return inst.def.variance;
}

/** How deep completion-casts may nest: an authored A→B→A sequel cycle
 *  bottoms out here, whatever the defs say. */
export const SEQUEL_CFG = { maxDepth: 3 } as const;

/** A SEQUEL — the completion-cast: when the host flight COMPLETES, the
 *  named catalog skill casts AT THE COMPLETION POINT (not the caster),
 *  aimed onward along the flight, at the host's effective level — two
 *  skills in one, in sequence, each still fully itself (the payload's own
 *  def keeps its supports, procs, contagion, everything). */
export interface SequelSpec {
  /** The catalog skill cast at the death point. Centered deliveries (nova,
   *  instant) bloom exactly there; payloads with a castRange (grounds)
   *  still clamp against the CASTER — give payload defs generous reach. */
  skillId: string;
  /** Which ending counts: 'hit' = the flight died ON A BODY (a guarded
   *  stop counts — it struck someone); 'expire' = spent range, walls,
   *  arrivals — every bodiless end. Default 'any': both. The lever the
   *  variants hang from. */
  on?: 'hit' | 'expire' | 'any';
  /** Roll per completion (default 1). */
  chance?: number;
  /** Damage multiplier on the payload (default 1; the host flight's own
   *  mult stacks in). */
  damageScale?: number;
}

/** The sequel riding an instance: a socketed support's graft wins over
 *  the delivery's own (the trail rule). */
export function instanceSequel(inst: SkillInstance): SequelSpec | undefined {
  for (const s of hostSockets(inst)) if (s.def.sequel) return s.def.sequel;
  return inst.def.delivery.type === 'projectile' ? inst.def.delivery.sequel : undefined;
}

/** CONTAGION pacing defaults — the modular thresholds every spec omits to. */
export const CONTAGION_CFG = {
  /** Hard generation lid, whatever a def asks for. */
  maxGenerations: 3,
  /** Chance multiplier per generation — the exponentially-reducing rate. */
  decay: 0.5,
  /** Seconds between infection and release — the honest, readable ripple. */
  delay: 0.3,
  /** Per-ACTOR release throttle (seconds), whatever the lineage count. */
  actorIcd: 0.6,
} as const;

/** CONTAGION — struck victims may become the next CAST SITE: after a
 *  telegraphed beat the skill (or a named payload) RELEASES from the
 *  victim, attributed to the original caster, and those hits may infect
 *  onward — chance × decay^generation, a hard generation lid, a per-actor
 *  throttle, and a lineage seen-set so the wave always travels OUTWARD.
 *  The exponential decay is the safety AND the fantasy. */
export interface ContagionSpec {
  /** What the victim releases (default: THE HOST SKILL ITSELF — the nova
   *  that begets novas). */
  skillId?: string;
  /** Infection chance per struck victim at generation 0. */
  chance: number;
  /** Chance multiplier per generation (default CONTAGION_CFG.decay). */
  decay?: number;
  /** Generation lid (default — and capped by — CONTAGION_CFG.maxGenerations). */
  maxGenerations?: number;
  /** Seconds from infection to release (default CONTAGION_CFG.delay). */
  delay?: number;
  /** Damage multiplier on releases (default 1). */
  damageScale?: number;
}

/** The contagion riding an instance: a socketed support's graft wins over
 *  the skill's own (the trail rule). */
export function instanceContagion(inst: SkillInstance): ContagionSpec | undefined {
  for (const s of hostSockets(inst)) if (s.def.contagion) return s.def.contagion;
  return inst.def.contagion;
}

/**
 * A ground CASCADE: the placement repeats at DISPLACED points — rippling
 * out from the impact like a skipped stone. Directions: 'axis' alternates
 * beyond/short of the aim along the cast line (PoE Spell Cascade), 'forward'
 * marches away from the caster (Sunder's shockwave), 'backward' walks home,
 * 'random' scatters around the mark (the Wild-Strike chaos variant). Each
 * step scales radius by scaleStep and damage by dmgStep (the built-in
 * balance valve: the epicenter is the real hit, the ripples echo weaker),
 * and `interval` staggers the placements' DELAYS — ripples that land in
 * sequence, riding the zones' ordinary telegraph machinery.
 */
export interface GroundCascadeSpec {
  count: number;
  dir?: 'axis' | 'forward' | 'backward' | 'random';
  /** Units between placements (default radius × 1.4; × the cascadeStep stat). */
  step?: number;
  /** Radius multiplier per step (0.85 = shrinking ripples, 1.2 = growing). */
  scaleStep?: number;
  /** Damage multiplier per step (default 0.75). */
  dmgStep?: number;
  /** Seconds between placements' detonations (0 = simultaneous). */
  interval?: number;
  /** Each later gap × this — THE BOUNCING-BALL KNOB (geometric, like the
   *  ball's coefficient of restitution): <1 patters the skips together as
   *  the stone settles (gap k = interval × step^(k-1)), >1 stretches them
   *  apart. Default 1 (even beats). A socketed cadence graft overrides. */
  intervalStep?: number;
}

/** The cascade a ground placement obeys: a socketed support's graft wins
 *  over the skill's own; the aoeCascade stat adds placements to either. */
export function instanceCascade(inst: SkillInstance): GroundCascadeSpec | undefined {
  for (const s of hostSockets(inst)) if (s.def.cascade) return s.def.cascade;
  return inst.def.delivery.type === 'ground' ? inst.def.delivery.cascade : undefined;
}

/**
 * A ground PULSE: the placement lies DORMANT after its impact and DETONATES
 * AGAIN — the earthquake's aftershock as a first-class axis. The first pulse
 * lands `delay` seconds after the impact, later ones every `interval`
 * (default: the same beat). Each pulse re-runs the placement's full hit
 * (damage, statuses, knockback) at `dmgMult` × the placement's roll across
 * the zone's live radius × `radiusMult`, and rides the ordinary explosion
 * arteries — the Aftershocks gem's aoeScatter scatters every pulse, procs
 * see the zone's normal depth. The pulseCount stat ADDS pulses to either
 * (innate spec or graft — the aoeCascade rule). A pulse whose skill brings
 * no linger IMPOSES one just long enough to quake (the fissure-texture
 * "a texture needs a surface" rule) — and an imposed surface carries NO
 * ordinary ticks: the pulse is the zone's whole life. The pulse clock is
 * FIXED (unscaled by effectDuration): an armed charge, not a duration.
 */
export interface GroundPulseSpec {
  /** Seconds after the impact until the first pulse. */
  delay: number;
  /** Total pulses (default 1; the pulseCount stat adds more). */
  count?: number;
  /** Seconds between later pulses (default `delay`). */
  interval?: number;
  /** Each later gap × this — the bouncing ball, for pulses (geometric):
   *  <1 = the beats quicken as the ground settles (Crumble's collapse),
   *  >1 = the tolls space OUT (Rising Knell's verdicts). Default 1.
   *  A socketed cadence graft (Accelerando/Ritardando) overrides. */
  intervalStep?: number;
  /** Damage multiplier per pulse, × the placement's roll (default 1). */
  dmgMult?: number;
  /** dmgMult × this per beat — the softening bounce (<1) or the swelling
   *  peal (>1). Default 1. */
  dmgStep?: number;
  /** Pulse blast reach, × the zone's live radius (default 1) — the armed
   *  warning ring renders at the TRUE reach, honest-telegraph rule. */
  radiusMult?: number;
  /** radiusMult × this per beat — the shrinking bounce. Default 1. */
  radiusStep?: number;
}

/** The pulse a ground placement obeys: a socketed support's graft wins
 *  over the skill's own; the pulseCount stat adds beats to either. */
export function instancePulse(inst: SkillInstance): GroundPulseSpec | undefined {
  for (const s of hostSockets(inst)) if (s.def.pulse) return s.def.pulse;
  return inst.def.delivery.type === 'ground' ? inst.def.delivery.pulse : undefined;
}

/**
 * A FOLLOW-UP CAST: the swing's follow-through — `delay` seconds after a
 * completed REAL use of the host (base presses only: repeats, echoes and
 * emitter payloads never follow up), the payload skill fires FREE (unpaid,
 * no cooldown) at the same aim, minted at the host's effective level (the
 * meta-instance rule). `chance` rolls per use (default always). Follow-ups
 * never chain follow-ups of their own — one follow-through per swing.
 * Carried by a SKILL (Harvest Stroke's trailing sweep) or a SUPPORT
 * (Reaper's Encore on any melee skill); the two MERGE — every spec riding
 * the instance schedules its own payload (the tether rule, not graft-wins).
 */
export interface FollowUpSpec {
  /** Catalog id of the payload skill. */
  skillId: string;
  /** Roll per completed use (default 1 — every use follows through). */
  chance?: number;
  /** Seconds after the host resolves (default 0.35 — a follow-through beat). */
  delay?: number;
}

/** Every follow-up riding an instance: the skill's own plus socketed gems'. */
export function instanceFollowUps(inst: SkillInstance): FollowUpSpec[] {
  const out: FollowUpSpec[] = [];
  if (inst.def.followUp) out.push(inst.def.followUp);
  for (const s of hostSockets(inst)) if (s.def.followUp) out.push(s.def.followUp);
  return out;
}

/** Every tether an instance carries: the skill's own plus socketed gems'. */
export function instanceTethers(inst: SkillInstance): TetherSpec[] {
  const out: TetherSpec[] = [];
  if (inst.def.tether) out.push(inst.def.tether);
  for (const s of hostSockets(inst)) if (s.def.tether) out.push(s.def.tether);
  return out;
}

/**
 * A DAMAGE POOL (PoE2 Plague-Bearer style): the caster BANKS a fraction of
 * the damage they deal — per hit type (fromDamage) and/or per DoT payload
 * applied (fromDot: banked at application as dps × duration, so a 1:1
 * ignite ratio and a stingier raw-fire ratio are both one data knob) — then
 * a pool skill RELEASES the bank: 'vent' toggles a leaking aura that drains
 * the pool as AoE damage per second around the caster (scaled by the
 * caster's damage stat), 'burst' spends everything at once in a blast.
 * Pools are keyed by `id`: skills naming the SAME id share one bank (one
 * eats the other's fuel); distinct ids keep private banks. The cap rides
 * the poolCap stat — investable like everything else.
 */
export interface DamagePoolSpec {
  /** The bank's key — SHARED ids share fuel, distinct ids don't. */
  id: string;
  /** Banked fraction per point of HIT damage dealt, by type. */
  fromDamage?: Partial<Record<DamageType, number>>;
  /** Banked fraction of each DoT PAYLOAD applied (dps × duration), by
   *  status id — ignite 1:1 while raw fire feeds at a trickle. */
  fromDot?: Record<string, number>;
  /** Max banked (× the caster's poolCap stat). */
  cap: number;
  /** The damage type the release deals (conversion applies downstream). */
  damageType: DamageType;
  release:
    | { mode: 'vent'; dps: number; radius: number }
    | { mode: 'burst'; radius: number; ratio?: number };
  /** Minimum banked before the skill is usable (default 1). */
  min?: number;
}

/**
 * A STATIC DISCHARGE: while the actor holds ≥1 of `charge` (banked by this
 * skill's gainCharge, or anything else naming the same charge), every
 * `interval` seconds one charge is spent and a bolt LEAPS to the nearest
 * enemy within `range`, dealing `damageScale` of this skill's roll. The
 * charge is HELD when nothing is in reach — the storm waits for prey.
 */
export interface DischargeSpec {
  charge: string;
  interval: number;
  range: number;
  damageScale?: number;
  /** The beat QUICKENS with the bank: seconds shaved off the interval per
   *  charge HELD (floored at 0.15s) — Tempest Gathering's mounting storm.
   *  A fuller battery doesn't just last longer; it fires faster. */
  intervalPerCharge?: number;
  /** Terrain occlusion: 'blocked' (default — the bolt leaps only to prey
   *  with a clear firing line) or 'free'. `phasing` stat frees from data. */
  occlusion?: 'blocked' | 'free';
}

/**
 * A PASSIVE CHARGE TAP baked into an equipped skill: while the skill sits
 * on the bar, world events bank charges for its owner — the soul-collector
 * shape ("a passive baked into the skill"). The skill then spends the bank
 * however it likes (chargeCost, discharge, drainCharge). Caps are
 * investable through the chargeCap stat (queried with THIS skill's tags).
 */
export interface ChargeGainSpec {
  charge: string;
  amount: number;
  max: number;
  /** The tap:
   *   'hit'        every landed hit the owner deals
   *   'kill'       every kill credited to the owner's landed hits
   *   'takeHit'    every landed hit the owner suffers
   *   'block'      every hit the owner BLOCKS (guard stance or passive)
   *   'enemyDeath' anything hostile dying within `radius` of the owner
   *                (souls rise to the reliquary — no kill credit needed)
   *   'allyDeath'  one of the owner's own minions dies
   *   'second'     once per second, unconditionally
   *   'move'       per `perDistance` units of deliberate walking (the
   *                movement-as-accumulation tap — Galvanic Reserve)
   *   'orbPickup'  a resource orb scooped by the owner (kind-filtered via
   *                `orbKind` — the flask FOUNT tap)
   *   'channelSecond' once per `everySeconds` WHILE the owner holds any
   *                channel or guard ("gain Frenzy every 3s of channeling")
   *   'channelFinish' a channel of the owner's reaches TRUE COMPLETION —
   *                the capped hold hits its ceiling or the brim fills
   *                (once per unbroken channel; interrupts deny it)
   *   'use'        every completed REAL use of THIS skill (echo/repeat
   *                executions never tap — the meta-banking discipline) */
  on: 'hit' | 'kill' | 'takeHit' | 'block' | 'enemyDeath' | 'allyDeath' | 'second'
    | 'move' | 'orbPickup' | 'channelSecond' | 'channelFinish' | 'use';
  /** enemyDeath: harvest radius around the owner (default 360). */
  radius?: number;
  /** move: units walked per bank (default 60). */
  perDistance?: number;
  /** second / channelSecond: seconds per bank (default 1). */
  everySeconds?: number;
  /** orbPickup: only orbs of this ORB_DEFS kind feed the tap (omit = any). */
  orbKind?: string;
  /** Chance per trigger (default 1). */
  chance?: number;
  /** Only taps while THIS skill is toggled active (its aura is on / its
   *  summon contract stands) — Berserk's rage only flows while berserk. */
  whileToggled?: boolean;
}

/** Named values of the aoeShape stat (0 is the circle default).
 *  crescent: an annular SECTOR aimed along the zone's facing — outer radius
 *  = radius, inner = radius × 0.55, width = the zone's arcRad (default 110°).
 *  sector: the same wedge WITHOUT the hollow heart — a full pie slice from
 *  the caster's feet out (Scythe Arc's no-deadzone harvest; the crescent
 *  keeps its deadzone ON PURPOSE — both belong in the vocabulary).
 *  The registry keeps proving it's a REGISTRY, not an enum. */
export const AOE_SHAPE = { circle: 0, square: 1, triangle: 2, crescent: 3, sector: 4 } as const;
/** Named values of the projReturn stat. */
export const PROJ_RETURN = { none: 0, origin: 1, caster: 2 } as const;

export interface ProjectileDelivery {
  type: 'projectile';
  speed: number;          // units / second
  radius: number;         // collision radius
  range: number;          // max travel distance
  /** Terrain occlusion attitude: 'blocked' (the default via LOS_CFG.delivery
   *  — rocks, walls and masonry stop the flight) or 'free' (the shot PHASES
   *  through terrain like mist). The `phasing` stat frees any use from data
   *  — a support gem (Wraith Passage) conjures passage the way Ricochet
   *  conjures bounces. */
  occlusion?: 'blocked' | 'free';
  pierce?: number;        // number of extra targets it can pass through
  count?: CountSpec;      // base projectile count (player adds projectileCount stat)
  spreadDeg?: number;     // total fan angle when firing multiple
  shape?: ProjectileShape;
  trajectory?: TrajectorySpec;
  /**
   * FIRING STYLE — how the volley leaves the origin (stat-convertible:
   * fireSalvo / fireVolley convert any projectile skill):
   *  - 'fan' (default): all at once, spread across the cone (spreadDeg ×
   *    the spreadAngle stat — chokeable, splayable).
   *  - 'salvo' (Barrage): ONE shot per beat AFTER the cast resolves, each
   *    re-aimed at the caster's live aim — the repeating crossbow. The cast
   *    bar is the windup (no shot on press; a canceled bar fires nothing),
   *    and salvoInterval ÷ attack speed sets the beat.
   *  - 'volley' (the firing squad): all at once, spawned side-by-side on a
   *    line PERPENDICULAR to the aim (alternating left/right, volleySpacing
   *    units apart × the volleySpacing stat), all flying PARALLEL.
   */
  fire?: 'fan' | 'salvo' | 'volley';
  /** Seconds between salvo shots (default 0.09; ÷ attack/cast speed). */
  salvoInterval?: number;
  /** Volley rank spacing in units (default 34; × the volleySpacing stat). */
  volleySpacing?: number;
  /** RING NOVA: the volley leaves in a full 360° circle of EVENLY-spaced rays
   *  around the origin (spreadDeg and the aim direction are ignored). By
   *  default the whole ring ROTATES by a random phase within one slice per
   *  cast — the D2 Poison Nova feel: a distant, stationary target sits
   *  between rays on one cast and square on one the next, while point-blank
   *  nothing escapes. `phaseJitter: false` pins the rays for a fixed ring. */
  ring?: { phaseJitter?: boolean };
  /** DURATION-DRIVEN flight: the projectile lives this many seconds
   *  (× effectDuration) and RANGE FALLS OUT of speed × time — the honest
   *  frame for accel/decel flights (Momentum shots outrun their brothers;
   *  a stalling lob dies where it slows). Overrides `range`. */
  duration?: number;
  /** 'cursor': the volley MATERIALIZES at the aim point (clamped to
   *  originRange) and flies onward along the cast bearing — Cold Spot.
   *  The castAtCursor stat converts any projectile the same way. */
  origin?: 'caster' | 'cursor';
  /** Max distance a cursor origin may be placed from the caster (default 420). */
  originRange?: number;
  /** The projectile leaves DESTRUCTION along its path (see ProjTrailSpec —
   *  supports graft the same via SupportDef.trail). */
  trail?: ProjTrailSpec;
  /** Splits into two on impact this many times; children inherit the
   *  trajectory (spiraling forks spiral from the impact point). */
  forks?: number;
  /** Instead of expiring, flies back — to the cast point or to the caster's
   *  current position — re-hitting targets on the way home. */
  returns?: 'origin' | 'caster';
  /** If set, the projectile never dies on impact; the same target can be
   *  struck again after this many seconds (orbiting hammers etc.). */
  rehit?: number;
  /** The projectile periodically casts another projectile skill from its
   *  position (Frozen Orb shedding frostbolts). `inherit` = fraction of the
   *  parent's RESOLVED flight axes the emissions carry (adds to the
   *  projInherit stat, clamped to 1). */
  emit?: { skillId: string; interval: number; pattern?: 'rotating' | 'random' | 'forward'; inherit?: number };
  /** On its first impact, the projectile SHATTERS: `count` projectiles of
   *  `skillId` continue in a forward fan past the victim (Ice Spear).
   *  `inherit` = fraction of the parent's resolved flight axes the shards
   *  carry (adds to the projInherit stat, clamped to 1). */
  shatter?: { skillId: string; count: number; spreadDeg: number; inherit?: number };
  /** The projectile EXPLODES where it dies — on impact AND at the end of
   *  its range (Fireball, Volcano globs). Others in the radius take
   *  `damageScale` of the skill's roll (default 0.6). */
  explode?: { radius: number; damageScale?: number };
  /** The projectile PLANTS where its flight ends (#17): a small standing
   *  object on the spot — an anchor the rest of the kit interacts with
   *  (Tripwire Web strings fences between planted spears). With `embed`
   *  set, the plant is an EMBEDMENT: run-over triggers, emissions, sibling
   *  beams (Impale Lance's spears, Arclight Rain's lodged arrows). */
  plantOnLand?: { duration: number; life?: number; embed?: EmbedSpec };
  /** Ball Lightning: while in flight, periodically ZAP everything within
   *  `radius` for `damageScale` of the skill's roll. */
  zap?: { interval: number; radius: number; damageScale?: number };
  /** PROJECTILE-BORNE FIELD (Soulflay): the flight WEARS an area effect —
   *  enemies inside `radius` of the projectile take `dps` typed damage per
   *  second while it passes (a moving DoT field, not discrete zaps). The
   *  dps scales with the caster's damage stat and CONVERTS at launch, the
   *  tether discipline; radius scales with area. Distinct from `zap`
   *  (periodic hits) and `trail` (dropped zones): this field RIDES. */
  aura?: { radius: number; dps: number; damageType?: DamageType };
  /** END ZONE (Blightspear): a lingering cloud blooms where the flight
   *  DIES — impact or spent range alike (the always-bursting lob; explode
   *  is its hit-damage sibling). damageScale defaults 0.5. `seek` makes
   *  the bloom HUNT (Creeping Frost's slinking winter — see
   *  GroundDelivery.seek for the semantics). Carries the drop-zone
   *  composables: sizeOver breathes the bloom, durationBySpeed feeds its
   *  linger from the flight's dying speed (see DropZoneSpec). */
  endZone?: DropZoneSpec & { seek?: { speed: number; range?: number } };
  /** The flight's COMPLETION is itself a CAST (see SequelSpec): the named
   *  skill fires at the death point — impact, spent range, or both, per
   *  the spec's `on` lever. Supports graft the same via SupportDef.sequel
   *  (a socketed graft wins). */
  sequel?: SequelSpec;
  /** The RETURN is CATCHABLE (Gyreblade): a homeward projectile arriving
   *  at its caster banks charges instead of just dying — fuel for a
   *  follow-up that hurls the caught blades back out. */
  catch?: { charge: string; amount: number; max: number };
  /** CATCH SPOT (Whirlaxe — the Draven discipline): the first flesh the
   *  shot finds REDIRECTS it to a marked circle near the caster, where it
   *  PLANTS as a catchable axe (a run-over embed): stand in the circle,
   *  collect the charge. Position play as a resource loop. */
  catchSpot?: {
    charge: string; amount: number; max: number;
    /** Seconds the planted axe waits to be caught (default 5). */
    duration?: number;
    /** How far from the caster the circle lands (default 70–115). */
    nearRadius?: number;
    /** Portrait of the planted catch (default 'construct_axe_catch' —
     *  the marked circle with steel lying in it). */
    look?: string;
  };
  /** SPREAD BY AIM (Splayshot): the fan's cone interpolates with cursor
   *  DISTANCE — `near` degrees point-blank, `far` degrees at `range` —
   *  so the shape of the volley is aimed, not just its bearing. */
  spreadByAim?: { near: number; far: number; range: number };
  /** CAROMS (the anchor ping-pong): each press PLANTS an anchor at the
   *  cursor (up to `anchors`, within `window` seconds of the last); the
   *  final press RELEASES the volley, which cycles anchor-to-anchor for
   *  the projectile's duration, re-hitting on the beat.
   *  With `hang` set the anchors are PASSIVE ETHEREAL ARROWS instead:
   *  presses hang visible arrows that wait (no press window — `hang.duration`
   *  seconds, default 24); a FULL set ARMS, and the volley COLLAPSES out of
   *  the arrows when an enemy strays within `triggerRadius` of any of them —
   *  or when the key is pressed again (the manual loose). */
  caroms?: {
    anchors: number; window: number;
    hang?: { triggerRadius?: number; duration?: number };
  };
  /** FISSURE TRAIL (Earthrender): the projectile IS the tear-head of a
   *  travelling CRACK — every `radius × 1.1` units of flight it rips a
   *  fissure-segment zone open at its position, so the crack follows the
   *  ACTUAL path (zigzag cracks, bouncing cracks, homing cracks — the
   *  trajectory levers bend the wound). `close` schedules the zip-shut
   *  pass back down the recorded chain when the flight dies. Supports
   *  graft the same via SupportDef.fissureTrail. */
  fissureTrail?: FissureTrailSpec;
}

/** The travelling crack a projectile tears (see ProjectileDelivery.fissureTrail). */
export interface FissureTrailSpec {
  /** Segment zone radius (× area modifiers; also sets the step spacing). */
  radius: number;
  /** Segment linger seconds (× effectDuration). */
  linger: number;
  /** Seconds between segment ticks (default 0.4). */
  tickInterval?: number;
  /** Segment damage as a fraction of the skill's roll (default 0.7). */
  damageScale?: number;
  /** The crack SNAPS SHUT: a second pass zipping from the death point back
   *  home, `delay` seconds after the flight ends, at `damageScale` of the roll. */
  close?: { delay: number; damageScale: number };
}

// ---------------------------------------------------------------------------
// THE TRIGGER DISCIPLINE — the "Cast on X" meta-gems (SupportDef.trigger).
//
// A trigger-socketed skill is NO LONGER CASTABLE: its key only ARMS and
// DISARMS it (disarmed = never fires, never drains), and the skill instead
// casts itself when the owner's play raises its event — a critical strike,
// damage taken, the beats of a held channel, an overcharge stage banked.
//
// GOLDEN RULES (engine-enforced in world.rollTriggers — the anti-exploit
// constitution, sibling to the proc rules in data/procs.ts):
//  1. ONE cast per event, chosen ROUND-ROBIN down the hotbar: the cursor
//     advances to the fired slot, so several trigger gems TAKE TURNS in
//     slot order — never a simultaneous volley.
//  2. CAST-TIME GATE: only skills at or under maxUseTime BASE use time may
//     be trigger-cast instantly. A triggerPermit gem beside the trigger
//     lifts the gate by casting the heavy skill as a REAL BAR in
//     succession — rooted like any bar (castMove/castMobility still walk).
//  3. UNTRIGGERABLE KINDS: channels, guards, auras, movement deliveries,
//     strobe stances, pool releases, invocations and combo chains can
//     never be triggered — enforced at socket time (excludeTags) AND
//     re-checked at fire time (granted tags can't smuggle one in).
//  4. CHAIN DEPTH: a fired cast stamps state.trigDepth = event depth + 1;
//     events it raises carry that stamp and die past maxChainDepth.
//     Channel → CwC skill → its crits → CoC meteor is the allowed comedy
//     (depth 2); the meteor's own crits trigger nothing further.
//  5. Honest economics: triggered casts pay costs (× costMult), respect
//     and set their cooldowns, and every gem wears an ICD no amount of
//     stacked chance can beat. Trigger chance caps at 95% per event.
// ---------------------------------------------------------------------------

export type TriggerKind =
  | 'crit' | 'damageTaken' | 'channelBeat' | 'overchargeStage'
  /** A channel of the owner's reaches TRUE COMPLETION — the hold hits its
   *  maxHold cap or its brim fills (once per unbroken channel). The
   *  Culmination moment: interrupts deny it. */
  | 'channelFinish'
  /** A status the owner APPLIES banks power (see TriggerSpec.status/.power)
   *  — "every third burn you set casts this" (the ailment-power gems). */
  | 'statusApply'
  /** The owner BLOCKS a hit — guard stance, passive block, or parry. */
  | 'block'
  /** A kill credited to the owner's landed hits. */
  | 'kill'
  /** A hit of the owner's whose damage dice landed in the top of their
   *  range (see TriggerSpec.rollTop) — the cast-on-jackpot event. Hits
   *  that rolled no live range never raise it: no dice, no jackpot. */
  | 'highRoll'
  /** The owner's HELD GUARD STANCE keeps its own slow metronome — the
   *  shield-hand sibling of channelBeat, raised every TRIGGER_CFG
   *  .guardInterval held seconds. Each gem's LARGE default ICD paces the
   *  actual casts: spellwork from behind a raised shield is deliberately
   *  an unhurried art (this is the automated lane — Guarded Casting is
   *  the deliberate one). */
  | 'guardBeat';

export const TRIGGER_CFG = {
  /** Max BASE use time (def.useTime) a skill may have and still be
   *  trigger-cast instantly — heavier bars need a triggerPermit gem. */
  maxUseTime: 0.5,
  /** How deep trigger chains may nest (rule 4). */
  maxChainDepth: 2,
  /** Cost multiplier on triggered casts (1 = full honest price). */
  costMult: 1,
  /** Per-kind fallback internal cooldowns, seconds (a spec's icd wins). */
  icd: {
    crit: 0.15, damageTaken: 0.25, channelBeat: 0.35, overchargeStage: 0,
    channelFinish: 0,
    statusApply: 0.2, block: 0.5, kill: 0.4, highRoll: 0.25,
    // The guard chant's LARGE gap — the whole trade of casting hands-free
    // from behind a raised shield (a spec's icd can retune per gem).
    guardBeat: 6,
  } as Record<TriggerKind, number>,
  /** highRoll: default top-of-the-dice fraction a hit must land in to
   *  raise the event (a spec's rollTop wins; the owner's highRollWindow
   *  stat widens either) — the jackpot line. */
  rollTop: 0.12,
  /** damageTaken: fraction of MAX LIFE that must accumulate per firing
   *  (a spec's lifeFrac wins; the triggerThreshold stat scales either). */
  lifeFrac: 0.3,
  /** channelBeat: the global metronome — seconds of held channel between
   *  event beats (each gem's own ICD paces it further). */
  channelInterval: 0.4,
  /** guardBeat: the stance's metronome — seconds of held guard between
   *  event beats. Coarser than a channel's: the beat only OFFERS a cast;
   *  each gem's own (large) ICD decides how often one is taken. */
  guardInterval: 1,
  /** Trigger chance is capped here per event, however stacked. */
  chanceCap: 0.95,
} as const;

export interface TriggerSpec {
  on: TriggerKind;
  /** Chance per event — the BASE of the triggerChance stat query
   *  (tag-filtered, so gems/passives can scale it). Default 1. */
  chance?: number;
  /** Internal cooldown, seconds (default TRIGGER_CFG.icd[on]). */
  icd?: number;
  /** damageTaken only: max-life fraction to accumulate before a firing —
   *  the BASE of the triggerThreshold stat query (default cfg.lifeFrac). */
  lifeFrac?: number;
  /** statusApply only: which status(es) bank POWER (omit = any the owner
   *  applies) — the "cast on ignite / on poison" filter. */
  status?: string | string[];
  /** statusApply only: applications banked per firing — the POWER
   *  mechanism (BASE of the triggerPower stat query; default 1). The bank
   *  fills as the owner lays the status and RESETS when the gem fires. */
  power?: number;
  /** highRoll only: the hit's damage dice must land within this top
   *  fraction of their range (default TRIGGER_CFG.rollTop; the owner's
   *  highRollWindow stat widens it additively). */
  rollTop?: number;
}

/** The trigger conversion riding an instance (first socketed wins). */
export function instanceTrigger(inst: SkillInstance): TriggerSpec | undefined {
  for (const s of hostSockets(inst)) if (s.def.trigger) return s.def.trigger;
  return undefined;
}

/**
 * A FUSE — the delayed-effect lever (Doom, the powder keg): the cast
 * happens NOW (projectiles fly, zones stand, costs are paid), but the
 * RESOLUTION arrives `delay` seconds late. Per landed hit, the wound
 * banks instead of biting — damage, statuses, on-hit procs, everything —
 * and detonates on schedule at the caster's LIVE stats (a fizzle if
 * either party is gone). The caster-side worn payload (buffs) defers on
 * the same clock — the blessing that arrives when the fuse burns down.
 * Deliveries with their own clocks (zones' telegraphs and lingers,
 * summon lifespans) keep them: the fuse defers RESOLUTIONS, not stagework.
 *
 * The delay is FIXED — unscaled by effectDuration (the pulse-clock rule:
 * a fuse is a promise the whole room can read) — but rides the fuseDelay
 * stat (Slow Match stretches it) and the banked resolution rides
 * fusePower. Carried by a SKILL (Doomsayer's Word) or grafted by a
 * SUPPORT (Time Fuse turns any skill into arrears); a socketed graft
 * WINS over the skill's own (the trail rule).
 */
export interface FuseSpec {
  /** Seconds between the landing and the resolution. */
  delay: number;
  /** Floating tell stamped on the bank (default '…'). */
  tell?: string;
}

/** The fuse riding an instance: a socketed graft wins over the skill's
 *  own (one clock per use — they don't stack). */
export function instanceFuse(inst: SkillInstance): FuseSpec | undefined {
  for (const s of hostSockets(inst)) if (s.def.fuse) return s.def.fuse;
  return inst.def.fuse;
}

/** True when a permit gem rides the instance (lifts the cast-time gate —
 *  the heavy spell answers as a REAL rooted bar in succession). */
export function instanceTriggerPermit(inst: SkillInstance): boolean {
  return hostSockets(inst).some(s => !!s.def.triggerPermit);
}

/** A PATH WARP for ground-laid fissures (SupportDef.fissurePath): the
 *  crack keeps its length, speed and textures but abandons the straight
 *  line. 'orbit' tears a RING around the CASTER at the aim distance —
 *  the ground-crack answer to Tethered Orbit (fissureCount fans become
 *  CONCENTRIC rings). 'spiral' unwinds out of the impact point over
 *  `turns` revolutions (fans rotate extra arms — the crack galaxy).
 *  'serpent' weaves ±waveDeg around the bearing — the drunk tear. */
export interface FissurePathSpec {
  kind: 'orbit' | 'spiral' | 'serpent';
  /** spiral: total revolutions across the crack's length (default 1.6). */
  turns?: number;
  /** serpent: weave amplitude in degrees off the bearing (default 38). */
  waveDeg?: number;
}

/** The melee-lash fissure a support projects off a strike (see
 *  SupportDef.meleeFissure). Deliberately shaped like the GroundDelivery
 *  fissure fields — the graft is compiled into a synthetic ground
 *  delivery and laid through the ordinary layFissure machinery. */
export interface MeleeFissureSpec {
  /** Roll per PRIMARY use of the host skill (repeats/echoes never roll). */
  chance: number;
  /** Crack length, units. */
  length: number;
  /** Tear speed, units/s. */
  speed: number;
  /** Segment half-width (the capsule radius). */
  radius: number;
  /** Segment linger seconds (× effectDuration). */
  linger: number;
  tickInterval?: number;
  /** The lash's segments hit at this fraction of the host's roll. */
  damageScale: number;
  /** Optional snap-shut pass (same shape as GroundDelivery.fissure.close). */
  close?: { delay: number; damageScale: number };
}

/** The fissure trail a projectile tears: a socketed support's graft wins
 *  over the skill's own (one crack per flight — they don't stack). */
export function instanceFissureTrail(inst: SkillInstance): FissureTrailSpec | undefined {
  for (const s of hostSockets(inst)) if (s.def.fissureTrail) return s.def.fissureTrail;
  return inst.def.delivery.type === 'projectile' ? inst.def.delivery.fissureTrail : undefined;
}

export interface MeleeDelivery {
  type: 'melee';
  range: number;          // reach from the attacker's edge
  arcDeg: number;         // swing arc centered on facing
}

export interface NovaDelivery {
  type: 'nova';           // circular burst centered on the caster
  radius: number;         // (or on the resolved target, if the skill targets)
  /** 'all' also strikes allies AND the caster (Bloodlet);
   *  'allies' affects ONLY your side (blessing skills like Furor). */
  affects?: 'enemies' | 'all' | 'allies';
  /** Only the OUTER BAND hits: targets between radius×edgeOnly and radius
   *  (Shock Nova's expanding ring). */
  edgeOnly?: number;
  /** Only the NEAREST N victims are struck (Galvanic Reserve's five bolts
   *  — a burst that picks its targets instead of washing the room). */
  maxTargets?: number;
  /** Only victims carrying ONE OF these statuses are touched (Soul Glut
   *  devours the CURSED and spares the merely unlucky). */
  requiresStatus?: string[];
  /** LANCE VISUALS (Lancing Flurry): each victim is struck down a drawn
   *  LINE from the origin — the burst reads as simultaneous razor lances,
   *  not a wash. Pure presentation; the hits are the nova's. */
  lanceFx?: true;
  /** Terrain occlusion: 'blocked' (default — the burst washes around
   *  corners but never THROUGH walls: victims without a firing line from
   *  the origin are spared) or 'free'. `phasing` stat frees from data. */
  occlusion?: 'blocked' | 'free';
}

/** A direct strike on the skill's resolved target (see SkillDef.targeting). */
export interface TargetDelivery {
  type: 'target';
  /** Optional splash radius around the target, hitting other enemies. */
  splash?: number;
  /** Terrain occlusion: 'blocked' (default — HOSTILE targeting refuses
   *  victims without a firing line; ally mends stay free) or 'free'.
   *  `phasing` stat frees from data. */
  occlusion?: 'blocked' | 'free';
}

export interface ConeDelivery {
  type: 'cone';           // breath / wave in facing direction
  range: number;
  arcDeg: number;
  /** Only the FAR EDGE of the cone hits (Surgical Strike). */
  edgeOnly?: number;
  /** LASER presentation: the strike draws as a crystal-beam LINE down the
   *  cone's axis instead of a wedge flash — razor cones ARE hitscan
   *  mechanically; this makes them read that way (Umbral Lance,
   *  Sunpiercer). Pure visuals; the hit test is unchanged. */
  beamFx?: true;
  /** Terrain occlusion: 'blocked' (default — a wall EATS the ray/breath:
   *  victims without a firing line are spared and the beamFx line clips at
   *  the stone) or 'free' (burns through). `phasing` stat frees from data. */
  occlusion?: 'blocked' | 'free';
}

export interface GroundDelivery {
  type: 'ground';         // targeted at cursor (AI: at target)
  radius: number;
  castRange: number;      // max placement distance
  /** Terrain occlusion: 'blocked' (default — the placement point CLIPS to
   *  the near side of the first wall along the cast line, and the zone's
   *  ticks spare victims walled off from it) or 'free' (called from the
   *  sky: place and burn anywhere — celestial rains opt in here).
   *  `phasing` stat frees from data. */
  occlusion?: 'blocked' | 'free';
  delay?: number;         // telegraph time before impact
  lingerDuration?: number;// if set, leaves a zone dealing damage each tick
  tickInterval?: number;  // seconds between linger ticks (default 0.5)
  /** LINGERING FUME (Toxic Cloud): an occupant must stand inside this many
   *  CONTINUOUS seconds before the zone's ticks bite them — stepping out
   *  clears the lungs, re-entry restarts the clock. Gates the TICK hits
   *  only (damage and their on-hit statuses); impacts, pulses, emitters
   *  and domains keep their own clocks — a blast is a blast, only breath
   *  takes time. Pair with noImpact for a pure fume. THE framework line
   *  between a lingering effect and an instant-damage area: fumes need
   *  breathing, explosions don't. */
  exposure?: number;
  /** FUME DOMAIN: the zone's DOMAIN obeys the exposure clock too —
   *  occupants (allies and enemies alike) wear the domain's mods only
   *  once they have breathed `exposure` seconds inside; stepping out
   *  strips them instantly and clears the clock. The soak-in dominion:
   *  Soporific Veil's stupor, the Thurible's blessing — influence that
   *  takes hold rather than switches on. Requires `exposure`. */
  exposureDomain?: true;
  /** While lingering, drag victims toward the zone center at this speed
   *  (units/s) — Cold Vortex. */
  pull?: number;
  /** How far the SUCTION reaches, in units (default: the damage radius ×
   *  1.35). An Event Horizon's grip extends well past the disc that kills. */
  pullRadius?: number;
  /** Pillar of Flame: the zone starts as an OUTER BAND (this fraction of
   *  the radius is hollow) and fills inward over `fillTime` seconds —
   *  a cage of flame that cooks its way to the center. */
  fillFrom?: number;
  fillTime?: number;
  /** Flame Wall: instead of one disc, lay `segments` small zones in a
   *  LINE across the facing — or, with an aoeShape sigil socketed, around
   *  a SQUARE or TRIANGLE outline. */
  line?: { segments: number; spacing: number };
  /** The lingering zone CREEPS forward along the cast facing (units/s). */
  drift?: number;
  /** SEEKING GROUND (Creeping Frost): the lingering zone SLINKS toward
   *  the nearest living enemy at `speed` units/s (hunting within `range`,
   *  default 420; with nothing to stalk it stands). Breakable furniture
   *  is never prey. Composes with grow/retract; where both exist, seek
   *  steers and drift's straight-line creep gives way. */
  seek?: { speed: number; range?: number };
  /** The lingering zone REVOLVES: its facing spins at this rate (rad/s) —
   *  meaningful for FACED shapes (crescents, triangles): Cinderwhirl's
   *  rotating flame. BASE of the aoeSpin stat query, so a support can
   *  spin any faced zone from nothing or crank an innate one. */
  rotate?: number;
  /** The lingering zone GROWS as it lives (radius units/s) — pair with
   *  drift for a traveling, swelling upchurn (Upheaval). */
  grow?: number;
  /** The lingering zone BREATHES on its linger clock: radius walks
   *  from×birth → to×birth over the WHOLE linger on a named curve —
   *  contraction into obscurity (`to: 0`), bloom from a seed, or the
   *  out-and-back 'breath'. Duration-normalized, so duration mods reshape
   *  the pace, never the journey. THE radius authority when present
   *  (grow/retract stand down). See SizeEnvelopeSpec; supports graft the
   *  same via SupportDef.zoneSizeOver (a socketed graft wins). */
  sizeOver?: SizeEnvelopeSpec;
  /** Skip the placement IMPACT entirely — the zone begins already LIVE,
   *  and only its linger (ticks, sweep crossings) ever deals damage:
   *  Scythe Arc hurts where the blade PASSES, never where it appears.
   *  The impact stays available to every skill that wants an opening hit. */
  noImpact?: true;
  /** SWEEP semantics: the zone is a moving HIT SURFACE — each victim is
   *  struck ONCE per zone life, never per tick (zones are FIELDS, damage
   *  per time inside; a sweep is damage per CROSSING). Pair with drift and
   *  tickInterval 0 for per-frame surface tests (Reap). */
  hitOnce?: boolean;
  /** With hitOnce: LEAVING the surface RE-ARMS the victim — damage per
   *  crossing, EVERY crossing (Glacial Rampart's wall: each walk-through
   *  hurts). Opt-in so shipped sweeps (Reap, Reaver's Sweep) keep their
   *  once-per-life arithmetic. */
  rearmOnExit?: boolean;
  /** BASE of the aoeShape stat query (sigil overrides still win) — the
   *  innate-value-as-query-base pattern. Default 'circle'. */
  shape?: keyof typeof AOE_SHAPE;
  /** Crescent width in degrees (default 110) — × arcMult and × √aoeScale,
   *  the same arc scaling melee cones use. */
  arcDeg?: number;
  /** The placement CASCADES: extra copies ripple out from the impact point
   *  (see GroundCascadeSpec — supports graft the same via SupportDef.cascade,
   *  and the aoeCascade stat adds placements to either). */
  cascade?: GroundCascadeSpec;
  /** The placement PULSES: dormant ground that DETONATES AGAIN on a beat
   *  (see GroundPulseSpec — supports graft the same via SupportDef.pulse,
   *  and the pulseCount stat adds beats to either). Cascade ripples carry
   *  the pulse too: each displaced placement quakes on its own clock. */
  pulse?: GroundPulseSpec;
  /** The lingering zone is an EMITTER: every `interval` seconds it casts
   *  `count` copies of a payload skill — each at a random point inside the
   *  zone ('point': Volcanic Fissure's magma bursts) or at a random enemy
   *  standing in it ('enemy': Thunderstorm's bolts, Entangle's lashes —
   *  the beat is skipped when nothing stands inside). Payloads execute
   *  with the placer's full build; give them castRange 9999 so a
   *  far-travelled zone doesn't clamp its bursts back toward the caster.
   *  PROJECTILE payloads want `origin: 'cursor'` + originRange 9999 on
   *  their delivery so they MATERIALIZE at the emit point instead of
   *  streaming from the far-away caster (Netherfissure's spirits rise
   *  from the crack itself). `bearing` sets the flight direction of such
   *  payloads: 'random' scatters each one, 'out' fires it outward through
   *  the emit point (default: the caster's current facing). `reach` widens
   *  the 'enemy' pick past the zone's own edge by that many units — the
   *  Grasping Chasm's tendrils LASH at what strays near the crack, not
   *  only what stands on it. `intervalStep` puts the cadence on the
   *  bouncing-ball curve: each later beat × step (Volcano erupts furious
   *  and SETTLES at 1.16; <1 quickens — the storm finding its rhythm). */
  emit?: { skillId: string; interval: number; count?: number; at?: 'point' | 'enemy'; bearing?: 'random' | 'out'; reach?: number; intervalStep?: number };
  /** The lingering zone is a DOMAIN: occupants wear these modifiers while
   *  they stand inside (ground-anchored auras — Rune of Power's circle,
   *  Toxic Domain's oppression). Applied per-actor as a sheet source,
   *  stripped on exit, death, or the zone's end. `minionMods` dress the
   *  caster's MINIONS on top of any allyMods (Oblation of Flesh's ring). */
  domain?: { allyMods?: Modifier[]; enemyMods?: Modifier[]; minionMods?: Modifier[] };
  /** On impact, leave real TERRAIN behind for a while (Icy Comet's ice
   *  patch — it is actual ice: slippery, with all terrain rules). */
  leaveTerrain?: { kind: 'ice' | 'mud' | 'bog' | 'swamp' | 'water'; radius: number; duration: number };
  /** FISSURE: the placement is a CRACK that tears open along the facing —
   *  a chain of zones laid head-to-tail on a travel clock (each inherits
   *  radius/linger/emit-free ticks). `branches` fork child cracks off the
   *  main line at ±branchDeg (half length, barren); `close` schedules a
   *  SECOND pass zipping back down the whole length (damageScale of the
   *  roll) — it hurts opening AND closing. The fissureCount stat fans
   *  extra whole cracks; fissureBranches adds forks. */
  fissure?: {
    /** Total crack length, units. */
    length: number;
    /** Tear speed, units/s (sets each segment's telegraph delay). */
    speed: number;
    /** Segment spacing (default radius × 1.1). */
    step?: number;
    /** Child cracks forked off the main line (base of fissureBranches). */
    branches?: number;
    /** Fork angle off the main bearing, degrees (default 42). */
    branchDeg?: number;
    /** The crack SNAPS SHUT: a second pass after `delay` seconds, zipping
     *  home, at `damageScale` of the roll. */
    close?: { delay: number; damageScale: number };
  };
  /** MARKER (Thundermark): placements are a LINKED SET — when any marker's
   *  telegraph fires, every OTHER live marker of this skill fires in a
   *  quick ripple. `cap` bounds the live set (+ the stormCount stat);
   *  oldest markers fade first. */
  marker?: { cap: number };
  /** Max ONE live placement: casting again extinguishes the previous
   *  (Netherfissure's single wound in the world). */
  exclusive?: true;
  /** The lingering zone FOLLOWS the caster — a worn field, not a placed
   *  one (Devouring Swarm's cloud, Blizzard Coil's mantle, Squall Rune). */
  follow?: true;
  /** EXPANDING-RETRACTING (Squall Rune): after `at` lingered seconds the
   *  zone RETRACTS at `speed` units/s (pairs with grow for the out-then-
   *  in breath; floors small, never vanishes early). `fizzle` instead ENDS
   *  the zone at the apex — the endBurst fires at full spread and the ring
   *  is gone (the expansion-only Squall; Halo's whole life). */
  retract?: { at: number; speed?: number; fizzle?: true };
  /** The zone DETONATES as its linger expires: one final burst at
   *  `damageScale` of the roll across radius × radiusScale (default 1). */
  endBurst?: { damageScale: number; radiusScale?: number };
  /** PENDULUM: the zone's facing SWINGS ±arc/2 degrees around its cast
   *  bearing, one full out-and-back per `period` seconds — the metronome
   *  blade (also graftable onto any lingering ground skill via
   *  SupportDef.pendulum). */
  pendulum?: { arcDeg: number; period: number };
  /** ONE SWEEP (Reaver's Sweep): the facing crosses ±arcDeg/2 around the
   *  cast bearing EXACTLY ONCE over the zone's whole linger — a single
   *  side-to-side harvest, no return stroke. Faced shapes feel it.
   *  `converge` (Closing Shears): TWO mirrored half-sweeps instead — each
   *  hand covers arcDeg/2 from its wing and they CLOSE onto the cast
   *  bearing together; each hand is its own once-per-life hit surface, so
   *  whatever stands on the meeting line takes both. The clap. */
  sweep?: { arcDeg: number; converge?: true };
  /** STROBE STANCE (Restless Earth): the press TOGGLES a worn rhythm
   *  instead of placing — every `interval` seconds the placement re-casts
   *  ITSELF (through the live instance: sockets, path warps, textures and
   *  fissureCount fans all ride each beat) at `bearing` around the caster
   *  ('random' scatters the beats, 'facing' follows the eyes), reserving
   *  `reservePct` of max mana while it burns (default 0.2). Released by a
   *  re-press (seat presses only — AI re-presses simply fail) or the
   *  caster's death; the stance survives zone travel. */
  strobe?: { interval: number; bearing?: 'random' | 'facing'; reservePct?: number };
}

export interface SelfDelivery {
  type: 'self';           // applies effects to the caster only
}

export interface SummonDelivery {
  type: 'summon';
  /** Fixed minion type — or use `pool` for weighted random selection. */
  monsterId?: string;
  /** Weighted pool, re-rolled per spawn (and per respawn). */
  pool?: { id: string; weight: number }[];
  /** The minion type comes from the consumed corpse (Raise Spectre, Revive).
   *  Requires `targeting: { target: 'corpse' }` on the skill. */
  fromCorpse?: boolean;
  /** THE GRIMOIRE (data/bestiary.ts): this corpse skill accepts an ATTUNED
   *  bestiary form (SkillInstance.attunedForm — per instance, so two copies
   *  may hold two forms). With a form attuned the skill stops reading the
   *  ground entirely: no corpse targeting, the studied kind summoned
   *  outright — mastery replacing scavenging. Meaningless without
   *  fromCorpse. */
  grimoire?: boolean;
  count: number;
  maxActive: number;      // oldest minion is replaced beyond this
  /** Skills sharing a poolGroup share one cap (Fire/Ice/Blood Golems). */
  poolGroup?: string;
  /** Minion lifespan in seconds (scaled by effectDuration). Omit = permanent. */
  duration?: number;
  /**
   * Persistent minions reserve max mana while their contract lives, and
   * respawn this many seconds after dying (scaled by minionRespawnTime).
   * Reservation is scaled by the manaCost stat. Combine with `duration`
   * for cyclical minions that expire and re-emerge.
   *
   * `toggle: true` promotes the contract from per-minion-life to
   * SKILL-LEVEL (PoE2 Spirit style): reservation = reserve × effective
   * maxActive SLOTS × manaCost, priced when toggled ON and HELD across
   * every death — the dead golem's mana stays locked while its respawn
   * timer runs. Recasting toggles OFF: dismiss all, free the reservation.
   */
  persistent?: { reserve: number; respawnTime: number; toggle?: boolean };
  /**
   * EXPONENTIAL UNLIFE (GW1 Death Magic / LE Wraiths): after `delay`
   * seconds the minion's life drains at (spawnMaxLife × frac) × growth^t
   * per second — unmitigable (a survival meter, not damage; the drowning
   * precedent). minionLife investment extends survival LOGARITHMICALLY;
   * nothing reaches permanence. Death is a real kill (Martyrdom fires).
   * Mutually exclusive with `persistent`.
   */
  decay?: { delay?: number; frac: number; growth: number };
  /** Where minions emerge (default: a ring around the caster). 'cursor'
   *  clamps the aim to `range` and scatters ±`scatter` units — demons
   *  boiling out where you point (Bombardment). */
  placeAt?: { at: 'caster' | 'cursor'; range?: number; scatter?: number };
  /** CHANNEL-BUT-CASTED: one cast schedules `count` WAVES of the delivery's
   *  own count every `interval` seconds; trackAim re-reads the caster's
   *  LIVE aim per wave (the Barrage salvo rule). `costFactor` makes each
   *  LATER wave re-pay that fraction of the skill's cost — running dry
   *  fizzles the remainder (#43: the bombardment bills per volley). */
  waves?: { count: number; interval: number; trackAim?: boolean; costFactor?: number };
  /** APEX PRESENCE (the Harvester): while any minion of THIS skill lives,
   *  the owner's OTHER minions wear these modifiers — the tyrant's shadow
   *  over the rest of the court. Stamped/stripped by the world's minion
   *  sweep as sheet source `presence:<skillId>`. */
  presence?: { minionMods: Modifier[] };
  /** The minion DEVOURS its lessers (see DevourSpec — the apex-and-fodder
   *  economy; a support grafts the same onto any summon via
   *  SupportDef.devour). */
  devour?: DevourSpec;
}

/**
 * A DEVOURER: on a beat, the minion EATS the nearest OTHER minion of its
 * owner (never a construct, never a sibling of its own skill) — a REAL
 * death (Martyrdom fires, contracts schedule respawns) that heals the
 * eater and feeds a stacking feast-buff. Carried innately by a summon
 * delivery (the Harvester) or grafted by a support (Ravenous Pact).
 */
export interface DevourSpec {
  /** Seconds between meals. */
  interval: number;
  /** Reach of the feeding lunge, units (default 220). */
  radius?: number;
  /** Healing = this fraction of the EATEN minion's max life. */
  heal?: number;
  /** The feast: per-meal buff stack worn by the eater (ordinary buff
   *  machinery — shared refresh clock, capped stacks). */
  mods?: Modifier[];
  maxStacks?: number;
  /** Feast-stack lifetime, seconds (default 15). */
  duration?: number;
}

export interface StormDelivery {
  type: 'storm';          // explosions scattered around the target point
  count: CountSpec;       // strikes per cast (stormCount stat shifts bounds)
  interval: number;       // seconds between strikes; 0 = all at once
  areaRadius: number;     // scatter radius around the cast point
  hitRadius: number;      // radius of each strike
  castRange: number;      // max placement distance
  /** Terrain occlusion: 'blocked' (default — the CAST POINT clips to the
   *  first wall along the cast line; the strikes themselves still fall
   *  from the SKY inside the disc) or 'free' (call the storm anywhere).
   *  `phasing` stat frees from data. */
  occlusion?: 'blocked' | 'free';
  /** SPARKFIELD: strikes plant UNDER enemies inside the scatter disc
   *  (nearest first; leftovers scatter at random ground as usual). */
  atEnemies?: true;
  /** PLACEMENT VARIANCE: under-target strikes land within this many units
   *  of the enemy instead of dead-on — the semi-random sparkfield feel. */
  scatter?: number;
  /** AWAIT RELEASE (the channeled sparkfield): strikes placed by a held
   *  CHANNEL arm silently and detonate only when the channel ENDS — in
   *  placement order (or shuffled: `order` 'random' / the Chaotic
   *  Discharge support flip), one every `interval` seconds. */
  awaitRelease?: { order?: 'placed' | 'random'; interval?: number };
  /** TELEGRAPHED AREA (Levinfall): the whole scatter disc is SHOWN for
   *  this many seconds before the first strike lands — the honest circle.
   *  Distinct from target-seeking storms: the RADIUS is the promise. */
  telegraph?: number;
}

export interface DashDelivery {
  type: 'dash';           // rapid movement toward cursor; damages along path
  distance: number;
  speed: number;          // slow + long = a forced Charge; fast + short = Dash
  width: number;          // hit corridor width (0 = no damage on the way)
  /** Damage multiplier on CORRIDOR hits (default 1). Closing Fang's
   *  approach grazes at 0.35 — the arrival is the bite, not the trip. */
  corridorScale?: number;
  /** Leave a mirage of the caster at the start point that taunts enemies. */
  decoyDuration?: number;
  /** Trailblaze: drop a lingering damage zone every ~40 units of travel. */
  /** The dash sows lingering ground along the corridor (Fire Walker) —
   *  a full DropZoneSpec: envelopes breathe each drop, durationBySpeed
   *  reads the DASH's pace. */
  trailZone?: DropZoneSpec;
}

/** Teleportation: instant, delayed (Warp), or behind a targeted enemy. */
export interface BlinkDelivery {
  type: 'blink';
  range: number;
  /** Seconds before the displacement happens (telegraphed). */
  delay?: number;
  /** With `targeting: { target: 'enemy' }`: arrive BEHIND the target,
   *  facing it (Shadow Step). */
  behindTarget?: boolean;
}

/**
 * An airborne leap toward the aim point: the leaper is untargetable while
 * in flight and lands with a shockwave (damage + the skill's effects on
 * everyone in the radius). Clears chasms — you're in the air.
 */
export interface LeapDelivery {
  type: 'leap';
  range: number;
  /** Seconds spent airborne. */
  airTime: number;
  /** Landing shockwave radius (scaled by area modifiers). */
  radius: number;
}

/** Stateful Mark/Recall: first use marks the aim point and the skill
 *  becomes Recall; the next use teleports back and re-arms Mark. */
export interface MarkDelivery {
  type: 'mark';
  /** Max distance at which the mark can be placed. */
  castRange: number;
}

// --- Constructs: totems, sentries, traps, mines, pylons ---------------------
// Deployed immobile objects that ride the minion infrastructure (ownership,
// caps, duration, owner scaling) and CAST REAL SKILLS from the catalog with
// the deployer's build modifiers inherited.

export type ConstructKind =
  | 'totem' | 'sentry' | 'trap' | 'mine' | 'pylon'
  | 'decoy'   // a taunting mirage of its owner; does nothing else
  | 'pad'     // propels the owner forward when stepped on
  | 'gate'    // paired portals: step into one, emerge from the other
  | 'barrier' // an inert wall segment: enemies must shoot or hack through it
  | 'dome'    // a field that dissolves or deflects enemy projectiles inside
  | 'eruptor' // periodically casts its skill at RANDOM points in range (Volcano)
  | 'echo'    // a GHOST of its owner that casts a skill (see EchoRiderSpec)
  | 'tree'    // BANKS damage its side deals nearby, then bursts as HEALING
  | 'embed'   // a LODGED object: run-over triggers, emissions, beam networks
  | 'relic'   // casts its skill at ITSELF whenever its OWNER attacks (Warden Relic)
  | 'pod';    // INCUBATES: hatches a payload skill when its duration matures (Broodpod)

/** Which construct kinds ACT in a direction — their facing is live truth
 *  (they pivot to cast), so they wear the renderer's AIM TICK — versus
 *  FURNITURE whose facing froze at placement (a bone-prison bar is not
 *  plotting anything). Drives the Actor.aims default in spawnConstruct;
 *  ConstructDelivery.aims is the per-skill override in either direction.
 *  Decoys spawn outside spawnConstruct and keep Actor's default (they
 *  wander in disguise, and a fake hero must dress like one — tick and all). */
export const CONSTRUCT_KIND_AIMS: Record<ConstructKind, boolean> = {
  totem: true,    // pivots onto its target every cast
  sentry: true,
  pylon: true,
  echo: true,     // the ghost glides and swings at prey
  decoy: true,    // roams — a live pose, worn as camouflage
  eruptor: false, // random spray is activity, not an aim
  trap: false,    // aims only at the instant it springs
  mine: false,
  pad: true,      // its facing IS the hurl direction — the tick points the throw
  gate: false, barrier: false, dome: false,
  tree: false, embed: false, relic: false, pod: false,
};

/**
 * An EMBEDMENT — a lodged object the rest of the kit interacts with
 * (Impale Lance's spears, Arclight Rain's arrows). Carried by a construct
 * delivery (kind 'embed') or a projectile's plantOnLand. Each behavior is
 * independent and composable:
 *  - runOver: the OWNER stepping on it COLLECTS it (payload) or DETONATES
 *    it (casts detonateSkillId at its spot). Consumed by default; `icd`
 *    (or the embedIcd stat) re-arms it on a PER-OBJECT internal cooldown
 *    instead — the internal-cooldown primitive, surfaced.
 *  - emitInterval: casts detonateSkillId at its own spot on a beat.
 *  - beam: arcs to the NEAREST sibling embed on a beat, damaging the LINE
 *    between them (the lodged-arrow tripwire pulse).
 */
export interface EmbedSpec {
  runOver?: 'collect' | 'detonate';
  /** collect: what the scoop pays the owner. */
  collect?: { charge?: string; amount: number; max?: number; resource?: 'life' | 'mana' | 'es' };
  /** The catalog skill a detonation / emission casts (noDrop payloads). */
  detonateSkillId?: string;
  /** Per-object re-arm seconds (omit = consumed; the embedIcd stat converts). */
  icd?: number;
  /** Periodic self-cast beat, seconds. */
  emitInterval?: number;
  /** Sibling beam: interval seconds; range (default 320); damageScale of
   *  the host skill's roll (default 0.5); half-width (default 10). */
  beam?: { interval: number; range?: number; damageScale?: number; width?: number };
}

/**
 * CONSTRUCT FX — a damaging presence bolted onto a deployed object:
 * `pulse` ticks the host skill's roll in a radius while it stands (the
 * chilling wall), `burst` fires ONCE as it arrives (the violent genesis).
 * Innate on a delivery (ConstructDelivery.fx) or grafted by a support
 * (SupportDef.constructFx) — Bone Prison + a pulse gem = a cage that cooks.
 */
export interface ConstructFxSpec {
  pulse?: { interval: number; radius: number; damageScale?: number };
  burst?: { radius: number; damageScale?: number };
}

/**
 * An ECHO RIDER — a ghost wearing its owner's silhouette that CASTS a skill.
 * One spec, three act models (flags, not forks):
 *  - 'hover': the Mirage Archer. Trails at the owner's shoulder for its
 *    life, casting at the nearest enemy in range on its own fixed clock
 *    (÷ constructCastRate) — a turret that is also a person-shaped lie.
 *  - 'strike': the Ancestral ghost. Launched by a completed use, it GLIDES
 *    at nearby prey and swings `casts` times IF it arrives before its tiny
 *    lifespan runs out — reach is literally glideSpeed × duration, so
 *    effect-duration investment (capped) converts whiffs into midrange.
 *  - 'mimic': the Shadow Clone. Plants where the owner stood (who
 *    smoke-steps back `substitute` units) and REPLAYS the owner's own
 *    completed uses from its position at reduced power, throttled per
 *    clone — it does NOTHING unless you act.
 * Carried by a SKILL (ConstructDelivery kind 'echo' — riders cast the
 * catalog `castSkillId`) or grafted by a SUPPORT (SupportDef.echo — riders
 * echo the HOST instance, sockets and all, the plantSpiritTotem precedent).
 * Echoes scale with the PLAYER's build (inherited sources + mirageDamage),
 * never the minion family: echoes are you; minions are them.
 */
export interface EchoRiderSpec {
  mode: 'hover' | 'strike' | 'mimic';
  /** Rider count — the mirageCount stat query's BASE (echo skills: 1; the
   *  support gems carry 0 here plus their own flat +1 mirageCount mod, so
   *  a gem socketed INTO an echo skill adds a second archer, not a loop). */
  count?: number;
  /** Lifespan seconds (× effectDuration). hover/mimic: uptime (support
   *  riders REFRESH on each host use). strike: the glide budget — the
   *  whiff clock (hard-capped at ECHO_STRIKE_LIFE_MAX effective). */
  duration: number;
  /** hover: seconds between cast attempts (÷ constructCastRate, floored at
   *  0.6). mimic: seconds between replayed echoes per clone. */
  interval?: number;
  /** Target-acquisition radius (hover: around the rider; strike: around
   *  the CASTER at launch — ghosts chase what they saw up close). */
  range?: number;
  /** hover: trail speed toward the shoulder slot; strike: closing speed —
   *  the other half of the reach equation. */
  glideSpeed?: number;
  /** hover: shoulder-slot offset from the owner, units (default 46). */
  hoverRadius?: number;
  /** MORE multiplier on the echo's output (damage AND status potency),
   *  × the owner's mirageDamage stat, stamped at spawn/refresh. */
  damageFactor?: number;
  /** strike: swings before fading (default 1). */
  casts?: number;
  /** mimic: the owner SMOKE-STEPS this far backward on plant, leaving the
   *  clone standing where they stood — the substitution beat. */
  substitute?: number;
}

/** Strike ghosts' effective-lifespan ceiling: duration investment buys
 *  reliability against kiters, never cross-screen artillery. */
export const ECHO_STRIKE_LIFE_MAX = 2.0;

/** Every echo spec an instance carries (a support's graft plus an echo
 *  skill's own — they COEXIST as separate rider families keyed by `key`;
 *  duplicate gems dedupe, degrading the second copy into its +1 count). */
export function instanceEchoes(inst: SkillInstance): { spec: EchoRiderSpec; key: string }[] {
  const out: { spec: EchoRiderSpec; key: string }[] = [];
  const d = inst.def.delivery;
  if (d.type === 'construct' && d.kind === 'echo' && d.echo) {
    out.push({ spec: d.echo, key: inst.def.id + ':self' });
  }
  const seen = new Set<string>();
  for (const s of hostSockets(inst)) {
    if (!s.def.echo || seen.has(s.def.id)) continue;
    seen.add(s.def.id);
    out.push({ spec: s.def.echo, key: inst.def.id + ':' + s.def.id });
  }
  return out;
}

/** A support's SUMMON graft: replaces a construct-delivery skill's spawn
 *  with a real minion (Vessel of Shadow's flesh-and-blood clone). */
export function instanceSummon(inst: SkillInstance): SummonDelivery | undefined {
  for (const s of hostSockets(inst)) if (s.def.summon) return s.def.summon;
  return undefined;
}

export interface ConstructDelivery {
  type: 'construct';
  kind: ConstructKind;
  /** Part-grammar portrait override (data/looks.ts). Omitted = the kind's
   *  default from CONSTRUCT_LOOKS — a totem is carved, a barrier is stone —
   *  so only skills with their OWN material (bone prison, frost wall) need
   *  to name one. */
  look?: string;
  /** Skill the construct casts (totem/sentry: at targets; trap: on trigger;
   *  mine: on detonation; pylon: periodic trigger). */
  castSkillId?: string;
  /** Whether this construct wears the AIM TICK (the facing pointer).
   *  Omitted = the kind's default (CONSTRUCT_KIND_AIMS): live-aiming
   *  casters tick, frozen furniture doesn't. The per-skill exception
   *  lever, valid in either direction. */
  aims?: boolean;
  /** Targeting range (totem/sentry/pylon) or trigger radius (trap). */
  range: number;
  duration: number;       // lifespan, scaled by effectDuration
  maxActive: number;
  life?: number;          // base life (ignored if invulnerable)
  invulnerable?: boolean; // sentries usually; they become untargetable too
  /** Max placement distance from the caster (traps/mines/pylons at cursor). */
  placeRange?: number;
  /** Pylon: seconds between triggered casts of castSkillId. */
  interval?: number;
  /** Pylon: an aura centered on the construct (same spec as aura skills). */
  aura?: AuraSpec;
  /** Pad: the dash applied to the owner stepping onto it. */
  propel?: { distance: number; speed: number };
  /** Barrier: deploys this many segments in a line across the facing. */
  wallSegments?: number;
  /** Bone Prison / Cage: deploy segments in a RING around the aim point
   *  (or around the resolved target, if the skill targets). */
  ring?: { segments: number; radius: number };
  /** Dome: projectile-interception radius around the construct. */
  domeRadius?: number;
  /** Dome: what happens to enemy projectiles crossing it (default dissolve).
   *  'deflect' turns them around and sends them back at their own side;
   *  'slow' STALLS them — speed × domeSlow while inside (Torpor Field,
   *  the defensive face of the accel/decel lever). */
  domeMode?: 'dissolve' | 'deflect' | 'slow';
  /** Dome 'slow': speed factor worn by enemy projectiles inside (default 0.35). */
  domeSlow?: number;
  /** kind 'echo': the rider's behavior (canonical for duration/range/count —
   *  this delivery's own duration/range/maxActive are vestigial here). */
  echo?: EchoRiderSpec;
  /** kind 'tree' (Tree of Life): the construct DRINKS the damage its side
   *  deals within `range`, visibly swelling — and when it ends (expiry or
   *  destruction alike) it BURSTS: min(cap, stored) × ratio healing to
   *  every ally within `radius` (× the owner's healPower). */
  healBurst?: { ratio: number; cap: number; radius: number };
  /** kind 'embed': the lodged object's behaviors (see EmbedSpec). */
  embed?: EmbedSpec;
  /** INNATE construct FX: a pulse while it stands / a burst as it arrives
   *  (see ConstructFxSpec — supports graft the same via constructFx). */
  fx?: ConstructFxSpec;
  /** INCUBATION → PAYLOAD (kind 'pod'): the construct's `duration` IS the
   *  incubation — surviving it HATCHES the payload skill at its spot (a
   *  summon, a blast, any catalog entry: fully configurable). Defend it
   *  while it matures. onBreak decides a violent death: 'fizzle' (default
   *  — the egg dies quietly; Broodpod) or 'hatch' (destruction sets it
   *  off; the Nitrocask powder rule). */
  hatch?: { skillId: string; onBreak?: 'fizzle' | 'hatch' };
  /** BREAKABLE BY DESIGN (the conjured-object game): the construct joins
   *  its OWNER's hostile pool — the owner's own hits (skills, zones,
   *  projectiles: everything) can strike it, demolishing at ownerMult ×
   *  damage; hits carrying one of affinityTags swing ×affinityMult harder
   *  on top (frost spells vs the frost wall). Enemies damage it at the
   *  ordinary rate. Pair with deathBurst to make breaking it the POINT. */
  breakable?: { ownerMult: number; affinityTags?: SkillTag[]; affinityMult?: number };
  /** The construct DETONATES as it dies — broken by its owner, shattered
   *  by the rite, evicted by a recast, or simply expired: unstable
   *  masonry has ONE rule, so conjure deliberately. `damageScale`
   *  re-rolls the HOST skill against enemies in `radius` (statuses and
   *  effects ride the ordinary hit pipeline); `fraction` instead bursts
   *  max life × fraction as typed damage (damageType, default physical).
   *  Sibling breakables are never victims — no free chain demolitions
   *  (a sympathetic-charges support may sell that later). */
  deathBurst?: { radius: number; damageScale?: number; fraction?: number; damageType?: DamageType };
  /** The placement SHOVES overlapping actors out of its footprint — a
   *  wall rising under a goblin puts the goblin somewhere else (and the
   *  frost wall's push-back genesis). */
  clearway?: true;
  /** The construct GLIDES at its owner's shoulder instead of standing
   *  where planted (Holy Relic — the relic that keeps up). */
  follows?: true;
  /** THE BELL (Tolling Bell): every landed hit the construct SUFFERS makes
   *  it cast castSkillId at itself (throttled by `interval`) — pair with
   *  `taunt` and the enemies ring it for you. Two mallets, one gate
   *  (World.ringBell): enemy blows ring through resolveHit's landed-hit
   *  hook, and the OWNER'S side rings through the strike-surface seam
   *  (World.strikeSurfaces) — every damaging delivery shape (arcs, sweeps,
   *  novas, cones, grounds, storms, leaps, dashes, flights, beams, blasts)
   *  offers its own victim geometry to the bell, no damage dealt. DoTs,
   *  fume exposure and vents stay silent (wounds that seep are not blows
   *  that land), and constructs never wield the mallet (a bell must not
   *  ring bells). */
  castOnStruck?: true;
  /** Enemies prefer striking this construct (the decoy's pull, on
   *  anything) — the bell wants to be hit. */
  taunt?: true;
}

// --- Auras / presences -------------------------------------------------------
// An area centered on a moving bearer, affecting allies and/or enemies inside.

export interface AuraSpec {
  radius: number;
  /** Modifiers applied to the BEARER ALONE while the aura runs (static —
   *  set at activation, stripped at deactivation). The Seals-and-Forms
   *  self-buff lane: Stormbind's surge without taxing bystanders. */
  selfMods?: Modifier[];
  /** Modifiers applied to allies (including the bearer) while inside. */
  allyMods?: Modifier[];
  /** Modifiers applied to enemies while inside (slows, debuffs). */
  enemyMods?: Modifier[];
  /** Damage per second to enemies inside (scaled by the bearer's damage stat). */
  enemyDps?: {
    amount?: number;
    type: DamageType;
    /** If set, the dps base is this fraction of the bearer's max life,
     *  DRAINED from the bearer each second (Righteous Fire). */
    drainLifeFraction?: number;
  };
  /** Fraction of aura damage dealt returned to the bearer as life. */
  siphonFraction?: number;
  /** Periodic pulse. The heal base is configurable: a fraction of the
   *  target's max life or max mana, or seconds-worth of their life regen. */
  pulse?: {
    interval: number;
    healAllies?: { base: 'maxLife' | 'maxMana' | 'lifeRegen'; amount: number };
  };
  /** Enemies dying inside spawn allied minions for the bearer. */
  deathSpawn?: {
    monsterId: string;
    chance: number;
    maxActive: number;
    duration?: number;
  };
}

export interface AuraDelivery {
  type: 'aura';
  aura: AuraSpec;
  /** toggle: on/off, paying upkeep while on. duration: one-time cost. */
  mode: 'toggle' | 'duration';
  duration?: number;
  /** Toggle upkeep, drained continuously (or reserved while active). */
  upkeep?: {
    manaPerSec?: number;
    /** Fraction of MAX mana drained per second (the pool-scaled price —
     *  a big wellspring pays proportionally for its Form). */
    manaPctMaxPerSec?: number;
    /** Fraction of CURRENT mana drained per second (the asymptotic drain:
     *  dear at full, gentle near empty — it can never starve you alone). */
    manaPctCurPerSec?: number;
    /** Fraction of max life drained per second. */
    lifeFractionPerSec?: number;
    /** Locks out max mana while toggled (like persistent minions). */
    reserveMana?: number;
    /** The drain RAMPS: upkeep × (1 + rampPerSec × seconds held) — the
     *  Seal-and-Form price curve (Stormbind's mounting hunger). */
    rampPerSec?: number;
    /** CHARGE-FED upkeep (the Deathwatch vigil): the toggle burns banked
     *  charges — perSec fractional, paid in whole charges as they come
     *  due. When a due charge can't be paid, the toggle drops (a scoop
     *  between payments refuels it seamlessly — the grace window is the
     *  active-play reward). Gate ignition with chargeCost minimum. */
    charges?: { charge: string; perSec: number };
  };
  /** REAR-GUARD SHELL: while this aura burns, the bearer wears a
   *  DIRECTIONAL absorb (Actor.shellGuard) — hits through the covered arc
   *  soak into a breakable, self-knitting pool. `max` scales with the
   *  guardStrength stat. The bestiary's back-armor, as a toggle. */
  shellGuard?: {
    side?: 'rear' | 'front' | 'all';
    max: number;
    arcDeg?: number;
    regenDelay?: number;
    regenRate?: number;
    color?: string;
  };
  /** SEALS & FORMS — movement factor while the toggle burns (0 = rooted:
   *  Stormbind plants you; omit = unimpeded). */
  moveFactor?: number;
  /** The toggle DROPS ITSELF after this many seconds (× effectDuration) —
   *  a Form with a fuse (Mortis Seal's few sealed heartbeats). The
   *  deactivation payload still fires. */
  maxDuration?: number;
  /** DEACTIVATION PAYLOAD: turning the toggle off (by press, fuse, or
   *  starvation — never death) casts this catalog skill at the bearer,
   *  scaled by how long the seal HELD (1 + scalePerSec × held, capped) and
   *  by the bearer's missing life (× 1 + missingLifeScale × missingFrac) —
   *  the Death Knell shape: the longer the pact and the deeper the wound,
   *  the louder the bell. */
  onDeactivate?: {
    skillId: string;
    scalePerSec?: number;
    maxScale?: number;
    missingLifeScale?: number;
  };
  /** LIFE SEAL (Mortis Seal): while toggled, life is LOCKED at its
   *  activation value (heals cannot raise it); damage reduction scales
   *  with the missing-health fraction (drPerMissing × missing, capped at
   *  drCap), and `stagger` of incoming hit damage spreads over time
   *  instead of landing at once (the staggerFrac stat rides it). */
  seal?: { drPerMissing?: number; drCap?: number; stagger?: number };
  /** OVERDRIVE toggle (the debt economy): while ON, unaffordable casts
   *  OVERDRAFT their cost into reservation instead of failing — an
   *  inverted energy shield. Repayment flows after `idleDelay` seconds
   *  without an overdraft (each overdraft refreshes the wait; the
   *  overdriveFlow stat trickles it early at a reduced rate). While ANY
   *  debt is outstanding the toggle CANNOT be turned off. Spec values are
   *  the BASES of their stat queries (overdriveCap etc.). */
  overdrive?: OverdriveSpec;
  /** The toggle is LOCKED ON while the bearer's life sits ABOVE this
   *  fraction of maximum — Berserk will not release a healthy host (the
   *  overdrive debt-lock's fleshy cousin). Off-presses fail with a note. */
  lockAboveLife?: number;
  /** THE LEDGER (banking / deferral): while this toggle burns, a balance
   *  ACCRUES from the spec's source and SETTLES on the lapse — bank now,
   *  pay later (see LedgerSpec: Arrears defers damage, Reclamation defers
   *  mana). Absolution-style meta payloads bleed it down early (the
   *  payLedger effect). */
  ledger?: LedgerSpec;
}

/**
 * A LEDGER — the banking/deferral account a toggle runs (the banked-
 * violence damage-pools, extended to INCOMING damage, resources, upkeep
 * and vent-on-lapse). Balance state rides the ActiveAura; every knob is
 * data:
 *  - source 'damageTaken': `rate` of every post-mitigation hit is NOT
 *    taken now — it banks (Arrears). DoT ticks are exempt (they're
 *    already time-spread).
 *  - source 'manaRegen': `rate` of mana regeneration is suppressed and
 *    banks instead (Reclamation).
 *  - upkeep: mana/s = base + perPoint × balance — the escalating siphon;
 *    starvation FORCES the toggle off (the lapse).
 *  - lapse 'landDamage': deactivation (press, starvation — never death)
 *    lands the WHOLE balance on the bearer at once, raw (the deferred
 *    chunk; mitigation already happened).
 *  - lapse 'ventMana': the balance refunds as mana and BURSTS as damage
 *    around the bearer (ventDamage); with ventBelowMana set, running low
 *    also cashes the account WITHOUT dropping the toggle.
 */
export interface LedgerSpec {
  source: 'damageTaken' | 'manaRegen';
  /** Fraction skimmed into the balance. */
  rate: number;
  /** Balance ceiling: flat + fractions of the bearer's pools (a pool-
   *  contingent cap is a first-class lever). Omit = uncapped. */
  cap?: { flat?: number; maxLifePct?: number; maxManaPct?: number };
  /** Escalating upkeep, mana/s = base + perPoint × balance. */
  upkeep?: { base?: number; perPoint: number };
  lapse: 'landDamage' | 'ventMana' | 'none';
  /** ventMana: burst damage per banked point, its radius, and its type. */
  ventDamage?: { perPoint: number; radius: number; damageType?: DamageType };
  /** ventMana: ALSO vent (keeping the toggle) when mana falls under this
   *  fraction of max — running dry cashes the account. */
  ventBelowMana?: number;
}

export interface OverdriveSpec {
  lane: 'mana' | 'life';
  /** Debt ceiling as a fraction of the RAW max pool (base of overdriveCap;
   *  the stat clamps at 0.9 — and life lanes should stay ≤ 0.5 so the
   *  ceiling never dips near the lowLife line). */
  cap: number;
  /** Seconds without an OVERDRAFT before repayment flows (base of
   *  overdriveIdleDelay). */
  idleDelay: number;
  /** Mana lane repayment /s = debt × recoveryPct + recoveryFlat. */
  recoveryPct?: number;
  recoveryFlat?: number;
  /** Life lane repayment /s = total life regen × regenFactor × attackSpeed
   *  (the zerker metabolizes the pact by swinging — base of
   *  overdriveLifeFactor). */
  regenFactor?: number;
}

/** Triggers all of the caster's placed mines, staggered slightly. */
export interface DetonateDelivery {
  type: 'detonate';
}

/**
 * Consume the caster's own in-flight projectile nearest the aim point and
 * detonate it where it flies (Cold Snap popping a Frozen Orb). With no
 * matching projectile, the explosion centers on the caster instead.
 */
export interface DetonateProjectileDelivery {
  type: 'detonateProjectile';
  radius: number;
  /** Only projectiles whose skill carries this tag qualify. */
  requireTag?: SkillTag;
  /** Damage multiplier when a projectile was actually consumed. */
  consumeBonus?: number;
}

export type Delivery =
  | ProjectileDelivery | MeleeDelivery | NovaDelivery | ConeDelivery
  | GroundDelivery | SelfDelivery | SummonDelivery | DashDelivery
  | StormDelivery | ConstructDelivery | AuraDelivery | DetonateDelivery
  | TargetDelivery | BlinkDelivery | MarkDelivery | LeapDelivery
  | DetonateProjectileDelivery;

// --- Cast modes: how a cast behaves between press and resolution -------------

export type CastMode =
  | 'cast'       // resolve when the cast bar completes (castTime 0 = instant)
  | 'channel'    // held: pulses the delivery at an interval, paying per pulse
  | 'charge'     // held: accumulates power; resolves on release, scaled
  | 'perfect'    // press again inside the golden end-window for bonus effect
  | 'timed'      // press when the bar reaches a randomly placed indicator
  | 'multitude'  // press repeatedly during the bar: one hit per press
  | 'guard'      // held: a directional shield with its own health (see GuardSpec)
  | 'overcharge' // held: the bar REFILLS, banking stages (see OverchargeSpec)
  | 'concentration'; // held: fills ONLY while the cursor rides the quarry (ConcentrationSpec)

/**
 * CONCENTRATION (castMode 'concentration' — SkillDef.concentration): the
 * PRECISION cast. The button is held like a channel, but the bar fills ONLY
 * while the caster's live cursor rides the acquired QUARRY (the actor the
 * targeting spec resolved at press). Look away and focus BREAKS; what
 * happens next is the spec's `onBreak` policy — the whole high-risk
 * playstyle in one knob:
 *
 *   'cancel'  — the cast dies on the spot (strictest; cost already paid);
 *   'release' — the skill FIRES INSTANTLY at partial strength (dmgMult ×
 *               the bar fraction; below minRelease it just fizzles) — let
 *               go early, hit softer;
 *   'drain'   — progress BLEEDS at drainRate× fill speed until the cursor
 *               finds the quarry again; a bar that drains to zero FIZZLES.
 *               Releasing the BUTTON abandons the cast outright. (default)
 *
 * Completion fires the skill at the QUARRY's live position (targetInfo
 * threads the actor — a fleeing quarry is still the one struck). Cast speed
 * shortens the bar like any cast; castMobility opens the feet; the cooldown
 * stamps however the cast ENDS (fizzles included — refocus lives INSIDE the
 * bar via 'drain', not in retry spam). AI casters have no cursor: their
 * focus IS their quarry (auto-track), so to a brain this reads as a slow,
 * body-blockable wind-up. Tame Beast is the first bearer; any skill may
 * carry the spec — the "focused casting" discipline is pure data. */
export interface ConcentrationSpec {
  /** Seconds of HELD focus to complete (before cast speed). */
  time: number;
  /** Focus-break policy (see above; default 'drain'). */
  onBreak?: 'cancel' | 'release' | 'drain';
  /** Drain speed as a multiple of fill speed while broken ('drain' only;
   *  default 1 — symmetric. 0.5 forgiving, 2 punishing). */
  drainRate?: number;
  /** Minimum bar fraction for a 'release' partial fire (default
   *  CONCENTRATION_CFG.minRelease; below it the break just cancels). */
  minRelease?: number;
  /** Cursor slack past the quarry's edge before focus counts as broken
   *  (px; default CONCENTRATION_CFG.slack — a forgiving halo). */
  slack?: number;
}

/** Concentration's modular thresholds (specs override per skill). */
export const CONCENTRATION_CFG = {
  /** Default cursor halo past the quarry's radius (px). */
  slack: 30,
  /** Default minimum fraction for a 'release' partial fire. */
  minRelease: 0.25,
};

/**
 * OVERCHARGE (castMode 'overcharge', or grafted by a support onto any
 * bar-cast skill): the held cast REFILLS its bar up to `stages` times —
 * the old-school JRPG hold — and every completed bar BANKS a stage (a
 * spark, a stacked bar in the UI) that multiplies the release. Releasing
 * mid-bar keeps completed stages; the partial refill is lost. Stage count
 * is the overchargeStages stat's BASE (investable past the spec).
 *
 * The RELEASE DISCIPLINES compose on top, each its own mechanic:
 *  - a StrikeTimingSpec (innate 'perfect'/'timed' mode, or the Perfect
 *    Draw / Wandering Mark grafts) is answered by RELEASING inside the
 *    zone on the refilling bar — one stage short of the greedy line;
 *  - the SPARK window (sparkWindow/sparkBonus stats; `window`/`windowBonus`
 *    seed the query bases) rewards a release within a breath of a stage
 *    BANKING — the discipline that still works at max stages.
 */
export interface OverchargeSpec {
  /** Base of the overchargeStages stat query. */
  stages: number;
  /** Seconds per stage bar (÷ cast/attack speed). */
  time: number;
  /** MORE damage per banked stage. */
  perStage: number;
  /** Area multiplier gained per banked stage. */
  aoePerStage?: number;
  /** INNATE spark window: base of the sparkWindow stat query (0 = none —
   *  Spark Discipline grants it from nothing). */
  window?: number;
  /** Base of the sparkBonus stat query (default 0.35). */
  windowBonus?: number;
  /** Each banked stage re-pays this fraction of the skill's cost
   *  (default 1 — overcharging doubles, triples the bill). An
   *  unaffordable stage leaves the bar stuck at the brim. */
  costPerStage?: number;
}

/**
 * A STRIKE-TIMING discipline — the golden-window press, extracted from
 * Snipe and Timed Strike into a graftable vocabulary:
 *  - 'perfect': a golden zone spans the TAIL of the bar (last 28%);
 *  - 'timed': a marker sits at a random point, re-rolled per bar.
 * On an ordinary bar cast the discipline is answered by a PRESS inside
 * the zone (the innate castMode 'perfect'/'timed' behavior). On an
 * OVERCHARGE hold there is no second press — the RELEASE itself must
 * land inside the zone on the currently-refilling bar: hold for stages,
 * let go on the gold. (At max stages no bar refills — the timing path
 * deliberately stops one stage short of maximum greed.)
 */
export interface StrikeTimingSpec {
  kind: 'perfect' | 'timed';
  /** MORE bonus on success (default 0.7 perfect / 1.2 timed — the
   *  baselines Snipe and Timed Strike always had). */
  bonus?: number;
}

/**
 * A held frontal block (castMode 'guard'). While the button is down, hits
 * and projectiles arriving inside the facing arc drain the SHIELD's health
 * instead of yours; movement slows and turning is rate-limited. Releasing
 * (or the shield breaking) ends the stance and starts the cooldown. The
 * shield's health scales with the guardStrength stat; the arc scales with
 * area modifiers. Distinct from the passive blockChance stat.
 */
export interface GuardSpec {
  /** Blocking arc centered on facing, in degrees. */
  arcDeg: number;
  /** Base shield health (× the guardStrength stat). */
  shieldLife: number;
  /** Movement speed factor while guarding (default 0.4). */
  moveFactor?: number;
  /** Max facing turn rate while guarding, rad/s (default 2.5). */
  turnRate?: number;
  /**
   * PARRY: a hit blocked within `window` seconds of raising the guard
   * costs NO shield and ripostes the blocked damage back × counterMult.
   * Omit to let the guardParry STAT grant it (Perfect Timing support).
   */
  parry?: { window: number; counterMult: number };
  /** The stance drops itself after this many seconds (Riposte's prepare). */
  maxDuration?: number;
  /** A successful parry ends the stance and starts the cooldown (Riposte). */
  endOnParry?: boolean;
  /** The bash ALSO fires when the shield breaks, with the full absorbed
   *  capacity as its payload (Ice Shield's dying burst). */
  bashOnBreak?: boolean;
  /**
   * SHIELD BASH: releasing the guard with at least 25% shield remaining
   * converts the stance into a frontal blow — the remaining shield health
   * × mult lands as physical damage in the arc. A broken shield never
   * bashes; a full-shield release hits hardest.
   */
  bash?: { mult: number; range: number; arcDeg: number; stunChance?: number; knockback?: number };
  /**
   * GUARD PULSE: the held stance tolls a component skill on its own clock
   * — every `interval` held seconds the component fires from the guardian,
   * free and cooldown-less, aimed along the shield (Defiant Bulwark's
   * rolling challenge). The guard-family sibling of a channel's pulses:
   * any guard may carry one, and the component is ordinary skill data —
   * a taunt nova today, a mend or a lava lick tomorrow.
   */
  pulse?: { skillId: string; interval: number };
}

/** A channel's growth term. `curve` back-loads the payoff: 'quadratic' =
 *  per × t² (feeble start, compounding hold), 'exponential' = per × (2^t − 1)
 *  (doubles each held second). Default linear. `max` caps all of them. */
export interface RampSpec {
  per: number;
  max: number;
  curve?: 'linear' | 'quadratic' | 'exponential';
}

/** Evaluate a RampSpec at held-time t — the ONE curve evaluator shared by
 *  channel pulses, release payloads, and anything else that ramps. */
export function rampValue(r: RampSpec, t: number): number {
  return Math.min(r.max, r.per * (r.curve === 'quadratic' ? t * t
    : r.curve === 'exponential' ? Math.pow(2, t) - 1 : t));
}

export interface ChannelSpec {
  /** Seconds between pulses (divided by cast/attack speed). */
  interval: number;
  /** Seconds of SPOOL-UP before the first pulse (divided by cast/attack
   *  speed). Default: one full interval — tapping a channel yields nothing. */
  windup?: number;
  /** ERRATIC CADENCE: each fired beat reschedules the next at interval ×
   *  a fresh uniform roll in [min,max] — stutters and lulls around the
   *  same average drumbeat ([0.5, 1.5] keeps the mean; skew it to slow or
   *  quicken the song). Held-target re-acquire waits stay unjittered. */
  intervalJitter?: [number, number];
  /** Movement while channeling. The channelMobility stat ADDS to the move
   *  factor (immobile starts at 0), so enough investment walks any channel. */
  move: 'normal' | 'slowed' | 'immobile';
  moveFactor?: number;       // speed multiplier when move === 'slowed'
  /** Max facing turn rate in rad/s while channeling (Infernal Ray) —
   *  multiplied by the channelTurnRate stat (Weathervane). */
  turnRate?: number;
  /** Damage multiplier growth per held second (see RampSpec curves). */
  ramp?: RampSpec;
  /** Area multiplier growth per held second (see RampSpec curves).
   *  NEGATIVE per CONVERGES instead (floors at ×0.15 — cone range shrinks,
   *  melee arcs tighten). */
  rampAoe?: RampSpec;
  /** Cone/melee ARC multiplier growth per held second — negative per
   *  COMPRESSES the wedge while rampAoe stretches its reach: the focusing
   *  ray that squeezes into a line (floors at ×0.1). */
  rampArc?: RampSpec;
  /** MOVE-FACTOR growth per held second (same curve family): positive per
   *  FREES the stride the longer the hold (capped ×1.6 — the gathering
   *  current); NEGATIVE per DRAGS it toward rooted (floored at 0 —
   *  Undertow's maelstrom slowly anchors its own bearer). Applied on top
   *  of move/moveFactor and the channelMobility stat; write `max: 0` with
   *  a negative per (the outer floor does the clamping, the rampAoe rule). */
  rampMove?: RampSpec;
  /** The skill's cooldown starts when the channel ENDS (early or not). */
  cooldownOnEnd?: boolean;
  /** Aim follows the controller while channeling (else locked at start). */
  trackAim?: boolean;
  /** The per-pulse COST grows the longer the channel is held (same curve
   *  vocabulary as damage ramps) — the escalating price of a Black Hole:
   *  costMult = 1 + rampT(costRamp). Exponential drains end the greedy. */
  costRamp?: RampSpec;
  /** RELEASE payload: ending the channel (let go, run dry) resolves the
   *  skill ONE final time, scaled by held time through the same ramp
   *  vocabulary as pulses. `pulses: false` makes the channel a pure
   *  GATHER — each beat only pays and ramps; NOTHING fires until the
   *  release delivers everything banked (Flame Blast). Releases before
   *  `minHold` held seconds fizzle (no payload — the tap tax).
   *  `requireFull` gates the payload on TRUE COMPLETION: it fires only
   *  when the hold reached maxHold (or the brim filled) — a stun that
   *  breaks the bar early DENIES everything (the interrupt idiom clears
   *  casting without ever reaching this branch); the counterplay is the
   *  point. With a `brim` riding the channel, the payload's POWER comes
   *  from the BAR (fill × the brim's scale walk), not from this press's
   *  held time — see BrimSpec. */
  release?: {
    dmgRamp?: RampSpec;
    aoeRamp?: RampSpec;
    pulses?: boolean;
    minHold?: number;
    requireFull?: boolean;
  };
  /** THE BRIM — a PERSISTENT gauge the channel fills (the powering-up
   *  scream): held seconds pour in (÷ fillTime, × cast/attack speed and
   *  the brimFill stat — haste reaches full sooner), the bar SURVIVES
   *  between presses, and the release payload fires at a power walked
   *  from the FILL: lerp(minScale → maxScale) on a named CURVES shape,
   *  × the brimPower stat. Knobs, each its own playstyle:
   *   - decay: fill/sec drained while NOT channeling (× brimDecay stat;
   *     omit = the bar HOLDS — bank it, walk around, spend it later).
   *   - bankAt: fill at/above this fraction stops decaying — the met
   *     threshold is KEPT (the plateau); below it, interruption bleeds.
   *   - minRelease: releases under this fill FIZZLE (nothing fires,
   *     nothing spent) — the tap tax, gauge-flavored.
   *   - spend: the payload drains the bar (default true); false reads
   *     it without spending (a standing dividend).
   *   - autoRelease: the bar filling FORCES the release that instant —
   *     the completion-cast; no second decision.
   *  Filling the bar (and hitting maxHold) raises the 'channelFinish'
   *  trigger event — Culmination-family gems answer it. The bar renders
   *  on the skill slot; the live hold shows above the cast bar. Fill is
   *  also published as an INTEGER sheet gauge ('brim:<skillId>', 0–5
   *  pips) for gauge-scaled modifiers. */
  brim?: BrimSpec;
  /** MINE-CHANNEL (Arcswarm): ending the channel DETONATES every still-
   *  flying projectile this skill launched, each at `damageScale` of its
   *  explode payload — the banked orbs go up together. */
  releaseDetonate?: { damageScale: number };
  /** CAPPED CHANNEL: the hold force-releases after this many seconds
   *  (× effectDuration) — the gather has a ceiling, and the cooldown
   *  (cooldownOnEnd) is the exhale. Release payloads still fire. */
  maxHold?: number;
  /** BUILD → PERSIST-AND-DECAY (Hailcrown): ending the channel leaves the
   *  work RUNNING — the pulses continue autonomously, riding the caster's
   *  live position, for heldSeconds × perHeldSec (capped at maxDuration,
   *  × effectDuration), each beat's power frozen at the released ramp and
   *  FADING toward `fade` (default 0.35) as the clock runs out. Holds
   *  under minHold leave nothing behind. Channel long, then move — it
   *  keeps raining. */
  persist?: { perHeldSec: number; maxDuration?: number; minHold?: number; fade?: number };
}

/**
 * GATHERED CASTING (SupportDef.gather): the socketed gem CONVERTS a
 * bar-cast into a brim GATHER — the long cast stops being a promise made
 * standing still and becomes a held channel banking its own cast time in
 * a PERSISTENT bar (the skill as its own powerbank), released on the
 * caster's schedule at fill-scaled power. Cast speed still matters — it
 * fills the bank — and the gem's `premium` stretches the full-bank time
 * past the honest bar (the price of firing on demand). Costs are paid in
 * micro-beats while holding (interval/fillTime of the full price per
 * pulse — a complete bank totals ≈ one honest cast). Channels, guards,
 * instants and sub-0.3s flicks refuse the conversion. Monsters convert
 * through kit grants like anything else: the AI holds a gather to its
 * brim before letting go.
 */
export interface GatherConvertSpec {
  /** Full-bank time = the skill's useTime × this (default 1.5). */
  premium?: number;
  /** Bar bleed per second while resting (omit = it HOLDS — the bank). */
  decay?: number;
  /** Releases under this fill fizzle without spending (default 0.15). */
  minRelease?: number;
  /** Payload power at empty / full (default 0.25 / 1). */
  minScale?: number;
  maxScale?: number;
  /** CURVES shape walking fill → power (default 'linear'). */
  curve?: CurveKind;
}

/** The persistent channel gauge (ChannelSpec.brim) — see the field doc. */
export interface BrimSpec {
  /** Held seconds to a full bar (÷ cast/attack speed, × brimFill stat). */
  fillTime: number;
  /** Fill fraction drained per second while not channeling (× brimDecay
   *  stat). Omit = the bar holds between presses. */
  decay?: number;
  /** Fill at/above this fraction stops decaying — the banked plateau. */
  bankAt?: number;
  /** Releases under this fill fizzle: nothing fires, nothing spent. */
  minRelease?: number;
  /** The release drains the bar (default true). */
  spend?: boolean;
  /** A full bar forces the release the instant it fills. */
  autoRelease?: boolean;
  /** Payload power at empty / full (default 0.25 / 1). */
  minScale?: number;
  maxScale?: number;
  /** CURVES shape walking fill → power (default 'linear'). */
  curve?: CurveKind;
}

export interface ChargeSpec {
  /** Seconds to full charge (scaled by effectDuration — the cap is
   *  modifiable by increased/reduced duration). */
  maxTime: number;
  /** Damage multiplier at zero / full charge. */
  minScale?: number;         // default 0.5
  maxScale?: number;         // default 2
  /** Area multiplier at full charge (linear from 1). */
  aoeScaleMax?: number;      // default 1.4
  /** Cone-arc multiplier at ZERO charge, tapering to 1 at full: a tap is
   *  a wide, weak wash; the full gather is the narrow lance (Sunpiercer's
   *  tap-vs-hold duality). */
  arcTaper?: number;
  /** MOVEMENT-speed multiplier at FULL charge, lerped from 1 at zero — the
   *  INVERSE axis (values < 1): the heavier the gather, the slower the
   *  launch (Immolation Rush's laden comet crawls its corridor, cooking
   *  longer). Dash distance holds; only the travel slows. */
  speedAtFull?: number;
}

// --- Gating: prerequisites a use must satisfy --------------------------------

/**
 * A GATE — a prerequisite threshold a skill demands before it can fire
 * ("not ready" until met). Carried INNATELY (SkillDef.gate: Phalanx Thrust
 * demands a raised guard) or LEVIED by a support (SupportDef.gate: Embargo
 * demands the charge bank it then spends). Every axis is optional and they
 * AND together; multiple gates (innate + each socketed levy) all apply.
 */
export interface GateSpec {
  /** A banked charge floor: at least `amount` of `id` (checked, not spent —
   *  spending is chargeCost's job). */
  charge?: { id: string; amount: number };
  /** An ACTIVE buff the caster must be wearing (buff id). */
  buff?: string;
  /** A resource floor: current value ≥ amount. */
  resource?: { kind: 'mana' | 'life' | 'es' | 'ward'; amount: number };
  /** A HELD guard stance — any guard (true), mirroring requiresGuard. */
  guard?: true;
  /** A running TOGGLE (aura or summon contract) by skill id. */
  active?: string;
  /** A RECENT WOUND: usable only within `within` seconds of the caster
   *  last TAKING damage (Reprisal — the counter-blow's license). */
  recentDamage?: { within: number };
}

/** Every gate a use must clear: the skill's own plus each socketed levy's. */
export function instanceGates(inst: SkillInstance): GateSpec[] {
  const out: GateSpec[] = [];
  if (inst.def.gate) out.push(inst.def.gate);
  for (const s of hostSockets(inst)) if (s.def.gate) out.push(s.def.gate);
  return out;
}

/** The charge cost a use pays: a socketed SPENDER graft (Ravening's
 *  optional feast, Embargo's hard levy) WINS over the skill's innate one —
 *  one spender economy per use. */
export function instanceChargeCost(inst: SkillInstance): SkillDef['chargeCost'] {
  for (const s of hostSockets(inst)) if (s.def.chargeCost) return s.def.chargeCost;
  return inst.def.chargeCost;
}

// --- THE MUNITION CONVERSION (SupportDef.munition) ---------------------------
// Chambered Casting's lane: a socketed gem CONVERTS any bar-cast into an
// AMMUNITION skill — `rounds` manual-reload uses (no trickle, no magazine),
// each cast entirely normal, and the EMPTY press becomes the graft's reload
// skill through the ordinary 'chargesEmpty' conversion. The gem's own mods
// carry the payoff (the whole point of chambering); grantsTags can hand the
// host 'munition' so family gems and passives compose onto it.

/** The reload every munition graft racks with when it names none — an
 *  ordinary noDrop catalog skill (data/skills.ts), swap-able per gem. */
export const DEFAULT_RELOAD_SKILL = 're_energize';

/** The use-charge economy riding an instance: the skill's OWN bank wins (a
 *  native ammunition skill ignores a graft's bank — one economy per slot);
 *  else the first socketed MUNITION CONVERSION banks its rounds. Every
 *  mechanical read (spend, cap, recovery, HUD pips, dry-press refusal)
 *  goes through here so a grafted bank behaves exactly like a native one. */
export function instanceUseCharges(inst: SkillInstance): SkillDef['useCharges'] | undefined {
  if (inst.def.useCharges) return inst.def.useCharges;
  for (const s of hostSockets(inst)) {
    if (s.def.munition) return { max: s.def.munition.rounds };
  }
  return undefined;
}

/** The conversion riding an instance: innate SkillDef.convert wins; else a
 *  munition graft converts the EMPTY bank into its reload skill. One face
 *  per slot — first source wins (mirrors instanceChargeCost). */
export function instanceConvert(inst: SkillInstance): ConvertSpec | undefined {
  if (inst.def.convert) return inst.def.convert;
  for (const s of hostSockets(inst)) {
    if (s.def.munition) {
      return { when: 'chargesEmpty', skillId: s.def.munition.reloadSkillId ?? DEFAULT_RELOAD_SKILL };
    }
  }
  return undefined;
}

/** UNLEASH tuning (the seal-banking repeat support): one seal accrues per
 *  `interval` seconds the skill rests, capped by the unleashMax stat. The
 *  executeSkill read and the HUD tics share this one clock. */
export const UNLEASH_CFG = { interval: 1.4 };

/** GUARDED CASTING tuning (the DELIBERATE cast-while-guarding lane —
 *  SupportDef.guardCast). The gem data references these so the whole
 *  bruiser-spellsword trade retunes from one place: the imposed clock is
 *  the price of an explicit, aimed cast from behind a raised shield.
 *  (The automated lane is the guardBeat trigger — TRIGGER_CFG.) */
export const GUARD_CAST_CFG = {
  /** Cooldown the gem imposes on its host (mod 'addedCooldown', still
   *  reducible by cooldownRecovery — the austerity precedent). */
  gatedCooldown: 4,
  /** Per gem level beyond 1: the clock buys down. */
  gatedCooldownPerLevel: -0.25,
  /** The reward side — the shielded cast lands harder ('more' damage):
   *  deliberate, scheduled spellwork should feel like a finisher. */
  moreDamage: 0.2,
} as const;

// --- Targeting: restricting a skill to specific targets ----------------------

export interface TargetingSpec {
  target: 'enemy' | 'corpse' | 'minion' | 'ally';
  /** The target must carry one of these statuses (Expunge: poison;
   *  Flash Freeze: chill OR frozen). String or any-of list. */
  requiresStatus?: string | string[];
  /** The target's DEF must carry one of these taxonomy tags
   *  (MonsterDef.tags — Tame reads only 'beast'-kinded bodies). The
   *  greying gate follows for free: aiming at anything else, the skill
   *  simply finds no target. */
  requiresMonsterTags?: string[];
  /** Consume the required status on use, converting its remaining damage
   *  into an immediate flat hit (Eviscerate). */
  consumesStatus?: boolean;
  /** Corpse targets are consumed by default; set false to leave them. */
  consumesCorpse?: boolean;
  /** Max distance from the caster to the target. */
  castRange: number;
  /** Search radius around the aim point (default 70). */
  searchRadius?: number;
  /** When nothing valid is found: fail the cast, fall back to the caster
   *  (Dark Pact centers on yourself if no minion is targeted), or proceed
   *  UNTARGETED at the pressed aim ('aim' — the movement-graft escape
   *  valve: Closing Instinct must never refuse to dash on an empty field). */
  fallback?: 'fail' | 'self' | 'aim';
  /** Fraction of a corpse's max life added as flat fire damage. */
  corpseLifeDamage?: number;
  /** Drains this fraction of the target's current life on use (Dark Pact). */
  drainsTargetLife?: number;
}

/** Roll a CountSpec, applying a flat bonus to both bounds of a range. */
export function rollCount(spec: CountSpec | undefined, bonus: number): number {
  if (spec === undefined) return Math.max(0, 1 + bonus);
  if (typeof spec === 'number') return Math.max(0, spec + bonus);
  const lo = spec[0] + bonus, hi = spec[1] + bonus;
  return Math.max(0, lo + Math.floor(Math.random() * (hi - lo + 1)));
}

// --- Effects: what happens when the delivery connects ----------------------

/** Deals the skill's computed damage to each target hit. */
export interface DamageEffect { type: 'damage'; }

/** Chance to apply a status ailment to targets hit. */
export interface StatusEffect {
  type: 'status';
  status: string;         // id in STATUS_DEFS
  chance: number;         // 0..1, before the caster's statusChance stat
  /** For DoTs: fraction of the hit's damage dealt per second. For others, potency. */
  magnitude?: number;
  /** FIXED duration in seconds, bypassing the status's default AND the
   *  caster's effectDuration — the unscalable freeze (Flash Freeze). */
  durationOverride?: number;
}

/** Grants the caster a temporary named bundle of modifiers. */
export interface BuffEffect {
  type: 'buff';
  id: string;             // buffs with the same id refresh instead of stacking...
  duration: number;
  mods: Modifier[];
  maxStacks?: number;     // ...unless maxStacks > 1
  /** Stack CLOCKS: 'shared' (default) — any application refreshes the
   *  WHOLE pile's timer (Carve: keep swinging or lose it all at once);
   *  'independent' — every stack lives and dies on its OWN clock (Deep
   *  Carve: no refreshes, only additions; old cuts close as new ones open). */
  stackTimers?: 'shared' | 'independent';
  /** Grant this many stacks per application instead of one (clamped to
   *  maxStacks) — how an imbuement loads its whole magazine in one press. */
  stacksOnApply?: number;
  /** Recipient: default 'caster'; 'minions' = every living minion of the
   *  caster (the generic minion-war-cry seam — Convocation's mend). */
  affects?: 'caster' | 'minions';
  /** ALL stacks are stripped when the bearer takes a LANDED hit (DoT ticks
   *  never wipe) — Tempo-style fragility as a buff's cost. */
  clearOnHit?: true;
  /** AMMUNITION (imbuements): each completed REAL use of a skill matching
   *  ANY of these tags (omit = every skill) spends one stack; at zero the
   *  buff ends. Give the buff tag-filtered mods over the same tags and you
   *  have "the next X uses are imbued". NOTE: the granting skill's own tags
   *  must NOT match, or the grant press eats its first round. */
  consumeOnUse?: { tags?: SkillTag[] };
  /** NEXT-HIT RIDER: the bearer's next landed hit(s) carry a payload —
   *  one stack spent per landed hit. Because buffs land on ALLIES and
   *  MINIONS too (affects: 'minions' / targeted deliveries), "bless the
   *  Amalgam so its next blow poisons hugely" is one buff. */
  nextHit?: NextHitRider;
  /** POWER-SCALED: every mod value multiplies by the use's power mult —
   *  a brim release at 40% fill grants 40%-strength blessing (Surgewind's
   *  gathered stride). Opt-in so ordinary buffs never wobble with damage
   *  multipliers. */
  powerScaled?: true;
  /** LIFE BOND (the Chloromancer shape): applying this buff to an ALLY
   *  bonds the CASTER to them — a share of the caster's damage dealt
   *  (their bondShare stat × the striking skill's bondFeed) flows to the
   *  bonded as healing while the buff holds. One bond per caster. */
  bond?: true;
}

/** The payload a NEXT-HIT buff loads onto the bearer's landed hits. All
 *  three lanes are optional and compose; each landed hit spends ONE stack.
 *  Golden rules: the status fires at its caster-less BASELINE (× the
 *  bearer's potency crank) and addedDamage is mitigated like any typed
 *  source — a rider can never double-dip the carrying hit's roll. */
export interface NextHitRider {
  /** Only hits carrying ALL these tags consume/fire the rider (omit = any). */
  tags?: SkillTag[];
  /** Apply this status to the victim (baseline dps × statusScale × potency). */
  status?: string;
  statusScale?: number;
  /** Extra typed damage landed alongside the hit (mitigated normally). */
  addedDamage?: Partial<Record<DamageType, number>>;
  /** Execute a registered proc's payload at the victim (depth rules apply). */
  procId?: string;
}

/** Teleport every MOBILE minion to an even ring at the caster (Convocation).
 *  Anchored things stay put: constructs, totems, the anchored, the mid-leap. */
export interface RecallMinionsEffect {
  type: 'recallMinions';
  /** Ring radius (default caster.radius + 34). */
  radius?: number;
}

/** COMMAND recipients onto the AIM POINT (the order fabric): each is put
 *  UNDER a standing order (ai.ts COMMAND_KINDS drives it) — they drop their
 *  current agenda (a cast in flight resolves first), march on the mark, and
 *  do what the kind says until it's fulfilled or expires. Point AT a foe
 *  and the order PINS that foe (focus fire). WHO answers, HOW LONG, and how
 *  hard the bark lands are all data — and every recipient rolls its brain's
 *  `obedience` (default 1: a summoned court obeys utterly; an unruly pack
 *  only in part — the enemy-warcaller lever). */
export interface CommandMinionsEffect {
  type: 'commandMinions';
  /** Command KIND from the open registry (default 'assault': march and kill
   *  whatever holds the mark; 'hold': stand the mark until expiry). */
  command?: string;
  /** Seconds the order stands (default COMMAND_CFG.duration). */
  duration?: number;
  /** WHO takes the order: the caster's summoned court ('minions', default),
   *  its SQUAD — stamped squadmates plus same-faction kin in earshot, the
   *  enemy-commander lever ('squad') — or 'both'. */
  affects?: 'minions' | 'squad' | 'both';
  /** Only recipients within this range of the caster hear it (default:
   *  minions always hear; squads default to COMMAND_CFG.earshot). */
  radius?: number;
  /** DISCIPLINE pressure added to every recipient's obedience roll — a
   *  drill-sergeant's bark lands where a whimper wouldn't. Stacks with the
   *  caster's commandDiscipline stat. */
  discipline?: number;
  /** Engagement radius around the MARK (default COMMAND_CFG.markRadius). */
  markRadius?: number;
}

/** THE TAMING (the Hunter archetype's bond): a target-delivery cast that
 *  CLAIMS instead of harming. Success converts the struck creature into
 *  the caster's COMPANION (World.tameCompanion: player-side, downs instead
 *  of dying, revived by lingering allies or the whistle). Restricted by
 *  TAXONOMY (MonsterDef.tags — 'beast' for the classic bond), never by def
 *  id; rares/bosses refuse unless the effect opens them. ONE companion per
 *  skill INSTANCE — the bond, not the character, holds the leash. */
export interface TameEffect {
  type: 'tame';
  /** Taxonomy tags that may be claimed (any match qualifies). */
  tags: string[];
  /** Also allow RARE-rarity bodies (default false; bosses never). */
  allowRares?: boolean;
  /** At or below this life fraction the claim is CERTAIN (`maxLifeFrac` is
   *  the legacy alias). Above it the beast's own will contests: the chance
   *  climbs linearly from `wildChance` at full life to certainty at the
   *  threshold. Omit both = any state claims outright. */
  sureBelow?: number;
  maxLifeFrac?: number;
  /** Claim chance against a FULL-life target (the sneak-tame lever — the
   *  Tamer opens without drawing blood). 0/omitted = hard refusal above
   *  the threshold (the old weaken-it-first gate). */
  wildChance?: number;
  /** Bond UNITS this skill may hold (default 1). Both tryTame's refusal
   *  and the 'companionsFull' conversion rule read it — a 4-slot kennel
   *  converts to the Whistle only when all four bonds are held. */
  slots?: number;
}

/** THE WHISTLE (the tame skill's meta payload): the keeper's recall — the
 *  bonded companion is pulled to the caster's side, revived if downed, and
 *  healed to full. Scoped by hostSkillId to the whistling skill's own bond.
 *  A whistle with no companion refunds its cooldown (never a wasted bark). */
export interface WhistleCompanionEffect {
  type: 'whistleCompanion';
}

/** THE RELOAD (the ammunition economy's refill): pours rounds back into
 *  use-charge banks (SkillDef.useCharges). scope 'host' (default) reaches
 *  the skill this press was MINTED FOR (hostSkillId — the empty gun whose
 *  'chargesEmpty' convert or meta produced it), falling back to the skill's
 *  own bank when it carries one; 'all' tops up EVERY equipped bank (the
 *  bandolier sweep). `amount` is rounds per RESOLUTION (omit = fill to the
 *  cap) — so a channel-mode reload with amount 1 loads shell by shell,
 *  releasable early with a part-filled drum (a topped drum releases the
 *  channel itself). A host refill also WIPES the host's running cooldown
 *  (the ACTIVE reload beats the magazine's lazy clock), and a rack with
 *  nothing to load refunds this skill's own cooldown (whistle rule). */
export interface RestoreSkillChargesEffect {
  type: 'restoreSkillCharges';
  amount?: number;
  scope?: 'host' | 'all';
}

/** CHRONO (#19): shaves every OTHER learned skill's running cooldown —
 *  flat seconds and/or a fraction of what remains. Never its own (the
 *  clock that winds others can't wind itself). */
export interface ReduceCooldownsEffect {
  type: 'reduceCooldowns';
  seconds?: number;
  fraction?: number;
}

/** PAY DOWN THE LEDGER (Absolution): bleed the HOST toggle's banked
 *  balance by a flat amount and/or a fraction — the long-cooldown release
 *  that turns deferral into investment instead of a time bomb. Rides the
 *  meta machinery (inst.hostSkillId names the account). */
export interface PayLedgerEffect {
  type: 'payLedger';
  flat?: number;
  pct?: number;
}

/** ORDER THE PACK (Skeletal Strike / the Harvester's Reap): every living
 *  minion of the HOST skill EXECUTES a catalog skill — at the caster's aim
 *  point ('aim': the pack lunges where you point) or each at its own
 *  nearest enemy ('enemy': the pack picks its prey). The host is the meta
 *  chain's owner (SkillInstance.hostSkillId, stamped when the payload is
 *  minted); a payload cast outside any chain orders EVERY minion. */
export interface MinionCastEffect {
  type: 'minionCast';
  skillId: string;
  at?: 'aim' | 'enemy';
  /** 'enemy' target-acquisition radius around each minion (default 340). */
  range?: number;
}

/** Pushes targets away from the impact point. Pushes are IMPULSES on a
 *  decaying velocity, so overlapping blasts batter rather than teleport.
 *  mode 'buffet' shoves in a RANDOM direction instead of away — battered
 *  around inside the storm, not ejected from it (Gale; the knockBuffet
 *  stat converts any knockback the same way). */
export interface KnockbackEffect { type: 'knockback'; strength: number; mode?: 'shove' | 'buffet'; }

/** GET OVER HERE: yanks the struck target to the caster's feet — the pull
 *  is a real impulse through the push physics, so it respects collision
 *  (and rolls collision procs — a Crushing Impact chain hurts twice).
 *  `stun` extends a stun across the drag (× the base stun duration). */
export interface PullEffect { type: 'pull'; stun?: number; }

/** Leaves a lingering damage zone at the impact point (Expunge's cloud). */
export interface SpawnZoneEffect {
  type: 'spawnZone';
  radius: number;
  duration: number;
  tickInterval?: number;
  /** Damage scale of zone ticks relative to the skill (default 0.5). */
  damageScale?: number;
}

/** Grants the caster a named charge (combo resource) once per use. */
export interface GainChargeEffect {
  type: 'gainCharge';
  charge: string;
  amount: number;
  max: number;
}

/** UNLEASH a banked charge: the count burns down at `perSec`, and while
 *  the drain runs the charge CANNOT be gained — a one-way valve. Pair with
 *  a ChargeDef whose perCharge mods ARE the high (Bloodlust: the buff
 *  weakens smoothly as the bank empties, and nothing can stall it). */
export interface DrainChargeEffect {
  type: 'drainCharge';
  charge: string;
  perSec: number;
}

/**
 * Grants an ABSORPTION shield: temporary points eaten before everything
 * else (energy shield, mana shield, life). A proactive heal that buffers
 * for the big hit. Applies to whoever the delivery touches (self / allies).
 */
export interface AbsorbEffect {
  type: 'absorb';
  amount: number;
  /** Seconds before an unspent pool evaporates (scaled by effectDuration). */
  duration: number;
}

/** Leaves real TERRAIN at the impact/cast point for a while (Shatterstep's
 *  ice patch). Terrain rules apply in full — slippery is slippery. */
export interface TerrainEffect {
  type: 'terrain';
  kind: 'ice' | 'mud' | 'bog' | 'swamp' | 'water';
  radius: number;
  duration: number;
}

/** Restores a resource immediately (Power Surge, resource orbs). Poise
 *  restores flow through gainPoise — they feed a broken bar's recovery
 *  climb and may crest past max into poiseOvercharge headroom. */
export interface RestoreEffect {
  type: 'restore';
  resource: 'life' | 'mana' | 'es' | 'poise';
  amount: number;
  /** ES restores can also kick the recharge off immediately —
   *  the autonomous-recharge seam (a skill that STARTS the flow). */
  resetEsDelay?: boolean;
}

/**
 * A HEAL — the healer archetype's damage effect. Scaled by the caster's
 * healPower (tag-filtered — the healer's damage stat) and gated by the
 * target's healTaken. Who receives it follows the delivery: self → the
 * caster; an ally-targeted skill → the resolved ally; nova/cone/melee/
 * ground → every ALLY inside the same geometry (heal-and-harm skills
 * damage the enemies and mend the allies in ONE swing); lingering zones →
 * allies inside, per tick (consecrations). Bounces ride `chain` + the
 * chainCount stat: each hop finds the most WOUNDED untouched ally nearby
 * at 75% falloff — Chaining on a heal IS a chain-heal.
 */
export interface HealEffect {
  type: 'heal';
  /** Flat healing. */
  amount?: number;
  /** Plus this fraction of the TARGET's maximum life. */
  pctMax?: number;
  /** The caster mends everyone BUT themself (the paladin's burden). */
  excludeCaster?: boolean;
  /** Innate bounce count (adds to the chainCount stat). */
  chain?: number;
}

/** Strip harmful statuses from allied targets (never beneficial ones) —
 *  newest afflictions first. Rides the same recipient rules as heals. */
export interface CleanseEffect {
  type: 'cleanse';
  /** Afflictions stripped per application (default 2). */
  count?: number;
}

/** IRON WARD (#34): while it holds, the bearer takes `reduce` LESS damage
 *  and BANKS what still lands (to `cap`); when the ward ends, the bank
 *  DETONATES around them as physical damage × ratio. Pain, with interest. */
export interface IronWardEffect {
  type: 'ironWard';
  duration: number;
  /** MORE damage-taken reduction while warded (0.25 = 25% less). */
  reduce: number;
  /** Fraction of the banked damage detonated at expiry. */
  ratio: number;
  cap: number;
  radius: number;
}

/** TRANSGRESSION (#26): pressed MID-GUARD, converts a fraction of current
 *  mana into bonus shield health on the held stance — past its maximum.
 *  The uber-shield, bought with the blue bar. */
export interface GuardSurgeEffect {
  type: 'guardSurge';
  manaFraction: number;
  /** Shield points per point of mana spent. */
  ratio: number;
}

/** Restores a resource OVER TIME — the flask drink. Two spend PHILOSOPHIES
 *  share this one entry, chosen by the host's chargeCost:
 *   - amount: 1 (the fount sip): every drink pours the SAME fixed draught
 *     and the bank is ammunition — detached from count, PoE-style;
 *   - amount: 'all' + perCharge (the gulp): a fuller fount pours longer —
 *     the scale-with-bank lever for skills that WANT count to matter.
 *  Scaling levers, all composable: amountPerLevel grows the pour with the
 *  gem, amountPctMax cuts it from the pool's ceiling, and the drinker's
 *  restorePower / restorePctMax stats reach every stream (tag-filtered —
 *  'flask' investment is an ordinary modifier). Streams stack; life flows
 *  through healBy (seared wounds slow the flask too). */
export interface RestoreOverTimeEffect {
  type: 'restoreOverTime';
  resource: 'life' | 'mana' | 'es';
  /** Total restored across the stream (× perCharge count when set). */
  amount: number;
  /** Flat growth per EFFECTIVE skill level past 1 (over-cap levels count —
   *  investment gems deepen the draught like any other skill). */
  amountPerLevel?: number;
  /** Fraction of the drinker's MAXIMUM pool added to the total (0.05 =
   *  +5% of max per drink) — the percent lever, per skill. */
  amountPctMax?: number;
  /** Seconds the stream runs (× effectDuration). */
  duration: number;
  /** Multiply the total by the charges this use consumed. */
  perCharge?: boolean;
}

/** Grants WARD — the decaying shield pool (soaked before everything, held
 *  down only by its own decay; see the wardDecay/wardGain stats). Applies
 *  to whoever the delivery touches (self / allies). `perCharge` scales
 *  with charges consumed; `onHit` pays the CASTER per landed hit instead
 *  (Soul Glut: every soul devoured is a fragment of shell). */
export interface WardEffect {
  type: 'ward';
  amount: number;
  perCharge?: boolean;
  onHit?: true;
}

/** SIPHON ORB (Siphon Strike / Siphon Blood): each landed top-level hit
 *  knocks loose a resource orb that HOMES back to the caster — sustain
 *  with travel time, dodgeable by walking away from your own blood. */
export interface SiphonOrbEffect {
  type: 'siphonOrb';
  resource: 'life' | 'mana' | 'es';
  amount: number;
}

/** SELF-DESTRUCT's order: every HARD-RESUMMONABLE minion (never contract
 *  bodies, never constructs) charges the nearest foe and DETONATES for
 *  `fraction` of its max life. The deaths are real — Martyrdom applies. */
export interface DetonateMinionsEffect {
  type: 'detonateMinions';
  fraction: number;
}

/** EXHUME: raise `count` fresh corpses of `monsterId` from the ground at
 *  the aim — on-demand fuel for detonation, offering and revival skills. */
export interface SpawnCorpseEffect {
  type: 'spawnCorpse';
  monsterId: string;
  count: number;
}

/** SHATTERRITE: destroy the caster's own TOTEM-FAMILY constructs — each
 *  bursts for `fraction` of its max life as physical around itself. The
 *  totem-into-mine conversion, as a meta-payload. */
export interface ShatterConstructsEffect {
  type: 'shatterConstructs';
  fraction: number;
  radius: number;
}

// --- STATUS PUPPETEERING (the condition-necromancer arteries) ----------------
// Three verbs over ONE transplant seam (world.transplantStatus): SPREAD
// copies what rides a struck victim onto its neighbors; SIPHON pulls
// afflictions off nearby actors ONTO the caster (the martyr's draw);
// TRANSFUSE pours everything the caster carries onto a target (the vessel
// empties). Strength and duration are knobs on every hand-off — full or
// partial power, remaining or refreshed clocks — so the puppeteer chooses
// how much of each affliction survives the exchange.

export interface SpreadStatusEffect {
  type: 'spreadStatus';
  /** Contagion radius around each STRUCK victim (× area modifiers). */
  radius: number;
  /** Only these statuses spread (omit = everything the victim carries). */
  statuses?: string[];
  /** Copied dps × this (default 1 — full strength). */
  strengthScale?: number;
  /** 'remaining' hands off the victim's leftover clock; 'refresh' winds
   *  the status's full base duration fresh (default 'remaining'). */
  duration?: 'remaining' | 'refresh';
  /** × on top of whichever clock (default 1). */
  durationScale?: number;
  /** Max neighbors afflicted per victim (default 8). */
  maxTargets?: number;
}

export interface SiphonStatusEffect {
  type: 'siphonStatus';
  /** Harvest radius around the caster (× area modifiers). */
  radius: number;
  /** Whose afflictions are DRAWN: 'allies' (the martyr's cleanse — their
   *  wounds become yours), 'enemies' (steal the ailments off their flesh),
   *  or 'all'. Drawn statuses keep their remaining clocks. */
  from: 'allies' | 'enemies' | 'all';
  statuses?: string[];
  /** Healing per status drawn (through healBy, × healPower). */
  healPer?: number;
}

export interface TransfuseStatusEffect {
  type: 'transfuseStatus';
  statuses?: string[];
  /** Pushed dps × this (default 1). */
  strengthScale?: number;
  /** Default 'refresh' — the vessel pours each affliction FRESH. */
  duration?: 'remaining' | 'refresh';
  /** Also afflict enemies within this radius of the target (the gush). */
  splash?: number;
}

/** EXTRACTION (the impale economy's recall): every lodged spear
 *  (dischargeOnHit status) within `radius` of the caster is WRENCHED
 *  FREE — its bank pops on its host at `damageScale`, and the spear
 *  flies home as a REAL projectile (impale_spear, flat-loaded with a
 *  share of the bank), piercing whatever stands along the way. */
export interface RecallImpalesEffect {
  type: 'recallImpales';
  radius: number;
  /** The pop on the host, × the lodged bank (default 1). */
  damageScale?: number;
  /** Fraction of the bank the homeward spear carries as flat physical
   *  (default 0.5). */
  spearShare?: number;
}

export type SkillEffect =
  | DamageEffect | StatusEffect | BuffEffect | KnockbackEffect
  | PullEffect | SpawnZoneEffect | GainChargeEffect | AbsorbEffect
  | RestoreEffect | TerrainEffect | RecallMinionsEffect | DrainChargeEffect
  | HealEffect | CleanseEffect | CommandMinionsEffect
  | IronWardEffect | GuardSurgeEffect | ReduceCooldownsEffect
  | RestoreOverTimeEffect | WardEffect | SiphonOrbEffect
  | DetonateMinionsEffect | SpawnCorpseEffect | ShatterConstructsEffect
  | MinionCastEffect | PayLedgerEffect
  | SpreadStatusEffect | SiphonStatusEffect | TransfuseStatusEffect
  | RecallImpalesEffect | TameEffect | WhistleCompanionEffect
  | RestoreSkillChargesEffect;

// --- The skill definition ---------------------------------------------------

export interface SkillDef {
  id: string;
  name: string;
  description: string;
  tags: SkillTag[];
  /** UI color used for icon + projectile/impact rendering. */
  color: string;

  manaCost: number;
  /** Skills may natively cost life too (costToMana can convert it back). */
  lifeCost?: number;
  /** Cost scales with the POOL: ceil(pct × max) is added to the base cost
   *  BEFORE the manaCost multiplier and lane conversion — the Archmage cost
   *  shape that makes pool-STACKING a damage axis (with costDamage stats).
   *  `lifePctCur` bills a fraction of CURRENT life instead (Bonespray's
   *  marrow price: cheap when bleeding out, dear at full blood). */
  costScaling?: { manaPctMax?: number; lifePctMax?: number; lifePctCur?: number };
  /** USE-CHARGES: the skill banks `max` uses (+ the skillCharges stat) and
   *  spends one per press — spammable down to empty, then a dry spell.
   *  THREE recovery lanes, chosen by the data (composable, but pick one):
   *   - recharge: the TRICKLE — one round back every `recharge` seconds
   *     (÷ skillChargeRate). Replaces the cooldown as the pacing device
   *     (keep cooldown 0). The reference economy the flask/cadence
   *     family runs on.
   *   - magazine: the MAGAZINE — rounds never trickle; the press that
   *     spends the LAST one stamps the skill's own `cooldown` (which must
   *     be > 0 — it IS the reload clock, so cooldownRecovery invests in
   *     it), and expiry pours `refill` rounds back at once (default: to
   *     the cap). Mid-mag presses never touch the clock.
   *   - NEITHER: manual ammunition — only a restoreSkillCharges payload
   *     refills the bank, usually via convert 'chargesEmpty' (the empty
   *     gun presses as its own reload) and/or a meta reload on shift
   *     (the tactical top-off). Composes WITH magazine: the active
   *     reload wipes the running clock — racking beats waiting.
   *  `stepsFromBank` (Riftstep): the press resolves ONCE PER BANKED charge
   *  (3 banked = a 3-step flicker; 1 = a single step) while spending only
   *  the one — the bank is the multiplier, not the ammunition. Deliberate
   *  opt-in: most charge skills should just eat a round, not multiply. */
  useCharges?: {
    max: number;
    recharge?: number;
    stepsFromBank?: boolean;
    magazine?: { refill?: number } | true;
  };
  /** Combo resource consumption: requires and spends charges on use.
   *  'all' consumes everything (min `minimum`); damagePerCharge is a
   *  MORE multiplier per charge consumed. */
  chargeCost?: {
    charge: string;
    amount: number | 'all';
    minimum?: number;
    damagePerCharge?: number;
    /** Extra PROJECTILES per charge consumed (Gyre Hurl flings every
     *  caught blade) — the count-side twin of damagePerCharge. */
    projectilesPerCharge?: number;
    /** Extra scheduled REPEATS per charge consumed (Frenzied Riftstep:
     *  every Frenzy burned is one more flicker on the train) — the
     *  Multistrike-side twin of projectilesPerCharge. */
    repeatsPerCharge?: number;
    /** Usable with NO charges banked — the skill simply scales with what it
     *  DID consume (a chargeless Reckoning is a plain blow; five Fury make
     *  it a catastrophe). */
    optional?: boolean;
  };
  /** Restricts the skill to a resolved target (corpse / enemy / minion...).
   *  No valid target = the cast fails and costs nothing. */
  targeting?: TargetingSpec;
  cooldown: number;       // seconds, 0 = limited only by cast time
  /** Base CAST TIME in seconds; divided by attackSpeed or castSpeed (by
   *  tag). 0 = instant. Skills resolve when the cast bar completes. */
  useTime: number;
  /** How the cast behaves. Default 'cast' (resolve at bar end). */
  castMode?: CastMode;
  /** Channel behavior (castMode 'channel'). */
  channel?: ChannelSpec;
  /** Charge-and-release behavior (castMode 'charge'). */
  chargeUp?: ChargeSpec;
  /** A FUSE: this skill's resolutions arrive LATE (see FuseSpec — Doom,
   *  the powder keg; supports graft the same via SupportDef.fuse). */
  fuse?: FuseSpec;
  /** Frontal-block behavior (castMode 'guard'). */
  guard?: GuardSpec;
  /** Stage-banked hold behavior (castMode 'overcharge' — or grafted onto
   *  any bar-cast skill by a support's OverchargeSpec). */
  overcharge?: OverchargeSpec;

  /** Base damage rolled per use, by type. Omit for pure utility skills. */
  baseDamage?: Partial<Record<DamageType, [number, number]>>;
  /** Positional damage: MORE multiplier when striking a target from behind
   *  (relative to its facing). Assassin tech — composes with Shadow Step. */
  backstabMult?: number;
  /** Multiplier on flat added-damage stats (default 1). */
  addedEffectiveness?: number;

  delivery: Delivery;
  effects: SkillEffect[];

  /** Attribute gates — any character meeting these can use the skill. */
  requirements?: Partial<Record<AttributeId, number>>;

  /** Never drops as a skill gem (monster-only kit pieces). */
  noDrop?: boolean;
  /** Relative drop weight in the gem pool (default 100) — the power
   *  hierarchy lever: rarer ≠ stronger by accident, but CAN by design.
   *  Composes with GEM_DROP_CFG.tagWeights and a killer's gemBias. */
  dropWeight?: number;
  /** Never drops below this ZONE level (the bracket lever — deep-world
   *  skills stay deep; 0/absent = drops anywhere). */
  minDropLevel?: number;

  /** Skill-local modifiers the skill carries innately at every level
   *  (Ice Blade's high base crit). Joined into instanceMods. */
  innateMods?: Modifier[];

  /** Hits SHATTER targets carrying any listed status: the statuses are
   *  consumed and the hit deals `mult` MORE damage (Absolute Zero vs
   *  chilled / frozen targets). `perStack` scales the payoff with the
   *  stacks consumed instead — (mult−1) × stacks MORE (Execution). */
  shatterStatus?: { statuses: string[]; mult: number; perStack?: boolean };

  /** THE EXECUTIONER'S LICENSE: against a target whose POISE BAR IS BROKEN
   *  (the live actor state, not the fading Sundered debuff), the hit
   *  carries `mult` × the victim's MAX POISE as flat physical — the
   *  cleaved bar paid back as burst, rolled into the ordinary hit so
   *  crits, conversions and riders all apply. Pair with targeting
   *  `requiresStatus: 'sundered'` for the deliberate execute (greyed
   *  until the break window); the rider alone makes any swing
   *  opportunistic. Enemies read the same field — bars break both ways. */
  poiseReap?: { mult: number };

  /** Static Shock: hits also strip this fraction of the target's CURRENT
   *  life (typed, resisted, scaled by damageTaken — and it cannot kill). */
  currentLifeDamage?: number;

  /** SIPHON: this fraction of every LANDED hit returns to the caster as
   *  HEALING (× healPower, gated by healTaken — Lifedrain's throat, Soul
   *  Volley's tithe). The explicit drain-to-heal artery, distinct from
   *  the capped lifeLeech stat. */
  siphon?: number;

  /** Hints for monster / minion AI when this skill is on their bar. */
  ai?: {
    range: number;        // try to use within this distance
    weight: number;       // relative pick priority
    keepDistance?: number;// preferred standoff distance (casters kite)
  };

  /**
   * What each skill level beyond 1 grants, as skill-local modifiers.
   * Fully data-driven: a skill can grow damage, projectiles, area, minion
   * scaling — anything the stat engine understands. Omit for DEFAULT_LEVELING.
   */
  leveling?: {
    maxLevel?: number;    // default MAX_SKILL_LEVEL
    perLevel: Modifier[];
  };

  /** THRESHOLD unlocks: while the skill's EFFECTIVE level (points + socketed
   *  levelBonus gems) reaches `level`, the bundle applies. Thresholds above
   *  the point cap are reachable ONLY through +level investment — the "level
   *  11 does something new" seam. Mechanic-warping stats welcome. */
  thresholds?: SkillThreshold[];

  /** A DAMAGE POOL this skill banks and releases (see DamagePoolSpec —
   *  Venomous Aura, Detonation). Pool skills GATE on their bank: greyed and
   *  unusable while below `min`. */
  pool?: DamagePoolSpec;

  /** A STATIC DISCHARGE this skill arms (see DischargeSpec — Static Strike:
   *  blows bank the storm, and it spends itself while you keep swinging). */
  discharge?: DischargeSpec;

  /** PASSIVE CHARGE TAPS this skill carries while equipped (see
   *  ChargeGainSpec — Soul Harvest gathers the nearby dead; Berserk's
   *  blows stoke Rage while the toggle burns). */
  chargeGain?: ChargeGainSpec[];

  /** GLOBAL modifiers worn while the skill sits on the bar — the passive
   *  half of a flask (Life Flask: kills may shed life orbs) or of any
   *  learned-equals-attuned skill. Synced as one merged 'equipped' sheet
   *  source; ORDINARY modifiers, so tag filters and conditions apply. */
  equipMods?: Modifier[];

  /** An INNATE tether this skill lays when it spawns an object or bonds a
   *  target (see TetherSpec — supports grant the same via SupportDef.tether). */
  tether?: TetherSpec;

  /** An INNATE aim transform: random-sector strikes or a played sequence
   *  (see AimSpec — supports graft the same via SupportDef.aim). */
  aim?: AimSpec;

  /** An INNATE per-cast variance: the skill re-rolls parts of its own
   *  footprint every cast (see VarianceSpec — supports graft the same via
   *  SupportDef.variance; a socketed graft wins). */
  variance?: VarianceSpec;

  /** An INNATE contagion: this skill's struck victims may RE-RELEASE it
   *  (or a named payload) from themselves — see ContagionSpec. Supports
   *  graft the same via SupportDef.contagion; a socketed graft wins. */
  contagion?: ContagionSpec;

  /** Movement factor while this skill's CAST BAR runs (0 = rooted, the
   *  default). The castMobility stat ADDS to it — mobile attacks by data,
   *  walking casters by investment (Fleetfoot). Channels use ChannelSpec. */
  castMove?: number;

  /** STEALTH interaction override: true = using this skill always spends a
   *  stealth charge / shatters invisibility; false = never does. Omitted:
   *  offensive skills (base damage, damage/knockback/pull effects) break
   *  stealth, movement and utility keep it. */
  breaksStealth?: boolean;

  /** CONCENTRATION: the precision cast — the held bar fills only while the
   *  cursor rides the acquired quarry (see ConcentrationSpec). Requires an
   *  actor-resolving `targeting` spec; replaces the plain cast bar. */
  concentration?: ConcentrationSpec;

  /** SKILL CONVERSION: while `when` holds, pressing this skill casts
   *  `skillId` instead (see ConvertSpec — the exhausted-skill two-for-one:
   *  a full Tame presses as the Whistle). The HUD presents the converted
   *  face; the slot's meta stays this skill's own. */
  convert?: ConvertSpec;

  /** META-ACTION: a SECOND ability riding this skill's hotbar slot — a
   *  mini-button above the slot, fired with SHIFT+key (never a bar slot of
   *  its own). The payload is an ordinary catalog skill cast at the host's
   *  effective level: Fire Mine carries Detonate, the hive carries Enrage,
   *  summons carry the Attack! command. The foundational transformation
   *  primitive — meta-combos are payload skills all the way down. */
  meta?: { skillId: string; label: string };

  /** FOLLOW-UP CAST: the swing's follow-through — a payload skill fires
   *  free a beat after every completed real use (see FollowUpSpec;
   *  supports graft the same via SupportDef.followUp, and the specs merge). */
  followUp?: FollowUpSpec;

  /** COMBO CHAIN: consecutive presses of THIS key within `window` seconds
   *  WALK the chain — the second press casts skills[0], the third skills[1],
   *  … each an ordinary catalog entry at the host's effective level. After
   *  the last step (or a lapsed window) the chain resets to the base skill.
   *  Unisect → Bisect → Trisect on one key: the combo-oriented meta-skill,
   *  and every step is independently tunable data. */
  comboChain?: { skills: string[]; window: number };

  /** CAST CYCLE: every `count`-th completed REAL use grants `buff`, then
   *  the counter resets — "casting this three times imbues the next cast"
   *  baked innately (pairs with BuffEffect.nextHit for guaranteed riders). */
  castCycle?: { count: number; buff: BuffEffect };

  /** CROWD EMPOWERMENT (the warcry-power shape): at execution, tally the
   *  WEIGHTED enemies within `radius` (DEFENSE_CFG.empower weights — a
   *  boss counts for several men) into a POWER score; the use deals
   *  `dmgPerPower` more damage per point, and/or grants `buffPerPower`
   *  with one stack per point (its maxStacks caps the crowd bonus). */
  empower?: { radius: number; dmgPerPower?: number; buffPerPower?: BuffEffect };

  /** LIFE-BOND FEED: this skill's damage feeds the caster's bond at this
   *  multiple of bondShare ("Ruin heals the bonded far more when it hits").
   *  Default 1; meaningless without an active bond (BuffEffect.bond). */
  bondFeed?: number;

  /** INVOCATION (the rune-weaver): while this skill sits on the bar, every
   *  real elemental cast banks a RUNE of its school (channels bank one per
   *  held second; capacity rides the runeCap stat). Using it CONSUMES the
   *  whole sequence: the combination-and-order picks the payload from the
   *  INVOCATIONS registry, the LAST rune sets the damage type, and every
   *  rune burned is more. */
  invokes?: true;

  /** LINKED HEXES (Malediction): every hit ALSO lays the primary curse of
   *  each OTHER curse-tagged skill on the caster's bar (the bar IS the
   *  link), and this skill's own ailments swell per hex so linked —
   *  dmgPerHex more dps and durPerHex longer, each. */
  linkedHexes?: { dmgPerHex: number; durPerHex: number };

  /** THE AMALGAM: while this skill CHANNELS, each pulse CONSUMES one of
   *  the caster's minions within `radius`; the release FUSES the fed mass
   *  into one `monsterId` minion whose size/damage/life scale with the
   *  bodies consumed (perMinion each, to `cap` minions) — killing your
   *  army to build a monster. */
  amalgam?: {
    radius: number;
    monsterId: string;
    cap: number;
    perMinion: { size: number; damage: number; life: number };
    duration?: number;
  };

  /** A PREREQUISITE gate this skill demands before it can fire — a charge
   *  floor, a worn buff, a resource threshold, a held guard, a running
   *  toggle (see GateSpec; supports levy their own via SupportDef.gate).
   *  Unmet = "not ready": greyed on the bar, refused at the press. */
  gate?: GateSpec;
  /** Usable ONLY while holding a guard stance (Transgression's combo). */
  requiresGuard?: boolean;
  /** May be pressed MID-HOLD without dropping the running cast: the skill
   *  executes instantly around a raised guard, a channel, a charge-up or
   *  an overcharge (must be instant; pair with requiresGuard when the
   *  skill demands the SHIELD specifically). The held skill's own meta
   *  payloads get this implicitly — pressing the meta modifier ALONE
   *  during a hold fires the held skill's meta (Phalanx while Shield Up:
   *  you can't re-press a button you're already holding). */
  usableWhileGuarding?: boolean;

  /** RETALIATION (Pain Hounds): while equipped, every landed hit the
   *  owner SUFFERS breaks one banked `charge` and spawns this minion for
   *  `duration` seconds beside the attacker. The skill's own use banks
   *  the shards (gainCharge) — the orbiting promise of teeth. */
  retaliate?: { charge: string; monsterId: string; duration: number; max: number };
}

export interface SkillThreshold {
  level: number;
  /** Shown in the skill book / tooltip ("Lv 11 — Twinned bolts"). */
  label: string;
  mods: Modifier[];
}

export const MAX_SKILL_LEVEL = 10;

/** Used by damage skills that don't declare their own leveling. */
export const DEFAULT_LEVELING: Modifier[] = [
  { stat: 'damage', kind: 'increased', value: 0.12 },
];

// ---------------------------------------------------------------------------
// Support gems — skill modifiers. Dropped by slain monsters, socketed into
// an unlocked skill, and levelable with skill points. A support is nothing
// but a bundle of skill-local modifiers (plus a tag gate), so any stat the
// engine knows is fair game for a new support.
// ---------------------------------------------------------------------------

export interface SupportDef {
  id: string;
  name: string;
  description: string;
  color: string;
  /** Socketable only into skills having at least ONE of these tags. */
  requiresTags?: SkillTag[];
  /** Never socketable into skills having ANY of these tags. */
  excludeTags?: SkillTag[];
  /** Skill-local modifiers granted at level 1. */
  mods: Modifier[];
  /** "Added levels to <tag> skills" (the tag gate is requiresTags). Raises
   *  the EFFECTIVE level past the point cap — perLevel growth keeps
   *  compounding and over-cap thresholds unlock. */
  levelBonus?: number;
  /** Extra levelBonus per GEM level beyond 1 (the total is floored) — a
   *  +1 gem with 0.25/level grants +2 at gem level 5. */
  levelBonusPer?: number;
  /** A TETHER this support grants the skill (Tripwire's bleeding line from a
   *  trap back to you; Lifeline's healing bond to a target). See TetherSpec. */
  tether?: TetherSpec;
  /** An AIM TRANSFORM this support grafts onto the skill (Alternating
   *  Strikes' left-right figure on any melee skill). See AimSpec. */
  aim?: AimSpec;
  /** An OVERCHARGE this support grafts: the host's bar cast becomes a
   *  hold-to-bank-stages cast (see OverchargeSpec — the Overcharge gem).
   *  Converts 'cast', 'perfect' and 'timed' modes; channels/guards refuse
   *  via tag gates. */
  overcharge?: OverchargeSpec;
  /** CONSTRUCT FX this support bolts onto the host's deployed objects —
   *  a standing pulse or an arrival burst (see ConstructFxSpec: Bone
   *  Prison + Pulsing Ramparts = the cage that cooks). */
  constructFx?: ConstructFxSpec;
  /** A META-ACTION this support GRANTS the host skill (shift+key — see
   *  SkillDef.meta). Multiple metas CHAIN: one shift-press fires the
   *  innate meta first, then every socketed grant in SLOT ORDER, one per
   *  META_CHAIN_INTERVAL beat — the player curates the order of operations
   *  by arranging gems (Skeletal Strike before Self-Destruct: lunge, then
   *  the bang). */
  meta?: { skillId: string; label: string };
  /** THE MUNITION CONVERSION (Chambered Casting): the host becomes an
   *  AMMUNITION skill — `rounds` manual-reload uses read at the button as
   *  pips, each cast entirely normal, the empty press converting into
   *  `reloadSkillId` (default DEFAULT_RELOAD_SKILL) through the ordinary
   *  'chargesEmpty' seam. Inert on hosts with a NATIVE bank (one economy
   *  per slot — instanceUseCharges). The gem's `mods` carry the payoff and
   *  `grantsTags: ['munition']` lets the family's gems and tag-filtered
   *  investment compose onto the chambered host. */
  munition?: { rounds: number; reloadSkillId?: string };
  /** A DEVOUR graft (Ravenous Pact): minions of the host skill EAT the
   *  owner's other minions on a beat for healing and a feast-buff (see
   *  DevourSpec — the apex economy, grafted onto any summon). */
  devour?: DevourSpec;
  /** FISSURE VOLATILITY: lingering fissure segments randomly RE-LIGHT —
   *  every `interval` seconds each live segment has `chance` to erupt
   *  again at `damageScale` of the roll (the volcanic crag hazard). */
  fissureVolatile?: { interval: number; chance: number; damageScale: number };
  /** FISSURE AFTERSHOCKS (the whack-a-mole movement game): lingering
   *  segments GLOW armed; the CASTER running over one detonates an
   *  aftershock around it (damageScale × the roll, radius × radiusScale),
   *  re-arming after `rearm` seconds. */
  fissureAftershock?: { damageScale: number; radiusScale?: number; rearm: number };
  /** FISSURE ROULETTE (Seismic Waltz — Volcanic Heart's dancing cousin):
   *  every `interval` seconds each live segment may ARM (`chance`) for a
   *  `window`-second beat; the CASTER crossing an armed stretch detonates
   *  it (damageScale × the roll, radius × radiusScale) and the step goes
   *  quiet until the floor deals again. The dance picks the dancer's feet. */
  fissureRoulette?: { interval: number; chance: number; window: number; damageScale: number; radiusScale?: number };
  /** FISSURE RECLOSE (Restless Wound): the wounds REMAIN and close AGAIN —
   *  after the closing pass (granted at `interval`/`damageScale` when the
   *  skill brings none), up to `times` FURTHER passes zip home, each rolled
   *  at `chance` (first miss ends the chain), `interval` seconds apart. */
  fissureReclose?: { chance: number; times: number; interval: number; damageScale: number };
  /** FISSURE PATH WARP: the crack abandons the straight tear (see
   *  FissurePathSpec — 'orbit' rings the caster, 'spiral' unwinds from the
   *  impact, 'serpent' weaves the bearing). First socketed warp wins;
   *  fissureCount fans lay concentric rings / extra spiral arms. */
  fissurePath?: FissurePathSpec;
  /** MELEE FISSURE LASH (Faultfinder): each primary use of the host melee
   *  skill has `chance` to PROJECT a crack out along the strike bearing.
   *  The lash is laid through the HOST instance, so the host's other
   *  fissure gems (volatility, arming, warps, recloses) all ride it — and
   *  the graft grants the 'fissure' tag so they may socket in beside it. */
  meleeFissure?: MeleeFissureSpec;
  /** A TRIGGER conversion (the "Cast on X" meta-gems): the host is no
   *  longer castable — its key ARMS/DISARMS it, and the skill fires when
   *  the owner's play raises the event. See THE TRIGGER DISCIPLINE block
   *  for the engine-enforced golden rules. */
  trigger?: TriggerSpec;
  /** TRIGGER PERMIT (Sequenced Invocation): rides BESIDE a trigger gem and
   *  lifts its cast-time gate — the heavy skill answers the event as a
   *  REAL cast bar in succession, rooted like any bar (castMove /
   *  castMobility investments still walk it). */
  triggerPermit?: true;
  /** GUARD CAST (Guarded Casting — the DELIBERATE cast-while-guarding
   *  lane): the host may be PRESSED while a held stance runs, and the
   *  press is INSTANT — the stance itself is the wind-up, so even a
   *  heavy bar fires as the Lance-Thrust-style combo blow. This field
   *  only lifts the hold-combo refusal and forces the instant; pair it
   *  with `gate: { guard: true }` to LOCK the host to the stance (grey
   *  off-guard, refused at press) and an `addedCooldown` mod to price it
   *  (GUARD_CAST_CFG carries the canonical numbers). Kept separate on
   *  purpose: each piece composes alone. */
  guardCast?: true;
  /** CARRIER STRAIN: top-level hits with this skill have `chance` to hand
   *  ONE random status from the struck victim to its nearest neighbor —
   *  the hit-borne contagion, with the transplant knobs inline. */
  spreadOnHit?: { chance: number; radius: number; strengthScale?: number; duration?: 'remaining' | 'refresh'; durationScale?: number };
  /** CURSE ON HIT (Hexbrand): the socketed CURSE stops being a cast — its
   *  key DRAWS/SHEATHES it (reserving reservePct of max mana, default
   *  0.25); while drawn, every top-level hit the owner lands ALSO strikes
   *  the victim with the curse at `damageScale` of its roll (default 0.3)
   *  — statuses, procs and ruptures ride the ordinary pipeline, one layer
   *  deep so a hex-strike can never re-apply the hexes. */
  curseOnHit?: { damageScale?: number; reservePct?: number };
  /** LOAD-BEARING FLAW: the host skill's constructs become BREAKABLE by
   *  their owner and DETONATE as they die (see ConstructDelivery.breakable
   *  / .deathBurst — the delivery's own specs win where present). Any
   *  totem skill becomes the conjured-ordnance game, one socket deep. */
  breakableGraft?: {
    ownerMult: number;
    deathBurst: { radius: number; damageScale?: number; fraction?: number; damageType?: DamageType };
  };
  /** CORPSE SPAWN (Hiveborn): corpses this skill CONSUMES crawl back out —
   *  `perCorpse` births one per body eaten; `count` instead births a fixed
   *  brood per use (the ghost variant pairs it with an imposed cooldown
   *  via addedCooldown mods). Capped alive per caster. */
  corpseSpawn?: { monsterId: string; perCorpse?: true; count?: number; duration: number; max: number };
  /** RANDOM WEAK AURA: each minion of the host is born wearing ONE aura
   *  rolled from this pool, shared with allies in its radius. */
  minionAuraPool?: AuraSpec[];
  /** DOMINATING BLOW: kills with this skill may RAISE the slain to fight
   *  for you (`chance`, living `duration` seconds, at most `max` thralls). */
  dominate?: { chance: number; duration: number; max: number };
  /** SACRIFICE: each cast CONSUMES your nearest minion within `radius`,
   *  dealing `dmgPerLife` MORE damage per point of its remaining life. */
  sacrifice?: { radius: number; dmgPerLife: number };
  /** DURATION AURAS: the host aura no longer reserves — it COSTS its mana
   *  and burns for `seconds` instead. The durationAuraCap stat bounds how
   *  many duration-auras may burn at once (oldest gives way). */
  auraDuration?: { seconds: number };
  /** LIFE RESERVATION: the host aura reserves LIFE instead of mana (the
   *  blood pact — rides the same reservedLife ceiling as overdrive). */
  reserveLife?: true;
  /** HEALING GROUND: the host's No Man's Land field MENDS allies standing
   *  in it (per tick) instead of burning enemies — warcries drop
   *  consecrations (the cleric's slam). */
  healField?: { amount: number };
  /** FRESH RANKS: minions of the host are born wearing this buff — "the
   *  recently summoned fight harder" as one graft. */
  spawnBuff?: BuffEffect;
  /** ZONE EMITTER graft: the host's lingering ground CASTS `skillId` every
   *  `interval` seconds (the pulse-cadence cursed ground — 2/1/0.5s are
   *  three gems of one shape). `bearing` aims projectile payloads (see
   *  GroundDelivery.emit). */
  zoneEmit?: { skillId: string; interval: number; at?: 'point' | 'enemy'; bearing?: 'random' | 'out' };
  /** MADDENING GROUND: anything standing in the host's lingering field for
   *  `after` accumulated seconds is driven MAD (the `maddened` status —
   *  it lashes at whatever is nearest, friend or foe). */
  madden?: { after: number };
  /** SPARK RELEASE ORDER flip (Chaotic Discharge): armed await-release
   *  sparks detonate SHUFFLED instead of in placement order. */
  releaseOrder?: 'placed' | 'random';
  /** HEAL-OVER-TIME conversion (Mending Echoes): the host's direct heals
   *  pour as a restore stream instead — total × `factor` over `seconds`
   *  (slightly stronger, meaningfully slower; the Renew-maker). */
  healOverTime?: { seconds: number; factor: number };
  /** CHARGE-TAP grafts: the host gains these ChargeGainSpec taps while
   *  socketed ("gain Frenzy every 3s while channeling this skill" is a
   *  support). Merged with the skill's own by instanceChargeGain. */
  chargeGain?: ChargeGainSpec[];
  /** BROOD graft: statuses this skill applies carry a spawn clause — the
   *  ticking damage has a chance, per point dealt, to hatch a short-lived
   *  creature serving the applier ("your poisons brood"). See BroodSpec. */
  brood?: BroodSpec;
  /** SUPPORT LEVIES — the infrastructure letting ANY support attach costs
   *  and requirements to its host (PoE's "makes it cost more," generalized):
   *  `gate` demands a threshold before the skill may fire (see GateSpec);
   *  `chargeCost` converts the host into a SPENDER — soft with optional
   *  (Ravening: eat the bank if present, for more) or hard without
   *  (Embargo: can't fire until the bank is there, then spends it). Cost
   *  multipliers and added resource costs are ordinary `mods` (manaCost /
   *  addedManaCost / addedLifeCost) — the third levy needs no new field. */
  gate?: GateSpec;
  /** A SPENDER conversion grafted onto the host (wins over the innate
   *  chargeCost — one spender economy per use). */
  chargeCost?: SkillDef['chargeCost'];
  /** CURSE → FIELD conversion (Miasma family): the curse skill stops
   *  being a cast and becomes a FIELD that re-afflicts enemies inside on
   *  a beat — 'follow' wears it as a TOGGLED aura around the caster
   *  (reserving reservePct of max mana while it burns); 'ground' plants
   *  it at the cursor as a long-lived, exclusive patch (`duration`
   *  seconds × effectDuration; recasting relocates it). Ticks run the
   *  full hit pipeline at `damageScale` of the roll, so the curse's
   *  statuses, procs and ruptures all ride. */
  curseField?: {
    mode: 'follow' | 'ground';
    radius: number;
    tickInterval?: number;
    damageScale?: number;
    /** follow: fraction of max mana reserved while toggled (default 0.25). */
    reservePct?: number;
    /** ground: patch lifetime, seconds (default 10; × effectDuration). */
    duration?: number;
  };
  /** An AURA baked onto the host's MINIONS at summon (Pyre Legion's
   *  burning ranks — the pylon spec, worn by flesh). */
  minionAura?: AuraSpec;
  /** THE CREW GATE KEY (Resonance): while a gem carrying this rides a
   *  summon skill, the skill's other riding supports BOARD THE CREW —
   *  forwarded into the minions' own skill instances wherever they fit.
   *  Only consulted when CREW_CFG.boarding is 'gated' (the balance lever:
   *  the whole boarding system costs one socket); 'free' boards without
   *  it. The key itself is host-lane cargo — it never forwards, and its
   *  own mods/requiresTags work the summon skill by the ordinary rules.
   *  Non-summon crews (Forgebound proc-conscripts, Hiveborn broods) are
   *  never gated: the proc/graft that minted them was the price. */
  resonance?: true;
  /** A STRIKE-TIMING discipline this support grafts (see StrikeTimingSpec
   *  — Perfect Draw's golden tail, Wandering Mark's roving marker): a
   *  press inside the zone on bar casts, the RELEASE inside the zone on
   *  overcharge holds. */
  strikeTiming?: StrikeTimingSpec;
  /** A PROJECTILE TRAIL this support grafts onto the skill (Detonating
   *  Passage's path blasts, Scorched Wake's burning ground). See ProjTrailSpec. */
  trail?: ProjTrailSpec;
  /** A FUSE this support grafts onto the skill (Time Fuse): every
   *  resolution arrives late — the arrears conversion. A socketed graft
   *  WINS over the skill's own. See FuseSpec. */
  fuse?: FuseSpec;
  /** GATHERED CASTING (Gathered Casting): converts the hosting bar-cast
   *  into a brim gather — the skill banks its own cast time and fires on
   *  demand at fill-scaled power. See GatherConvertSpec. */
  gather?: GatherConvertSpec;
  /** A SHELL grafted onto a GUARD skill (Grafted Carapace): while the
   *  stance holds, the guardian ALSO wears a directional shell — the
   *  raised shield's blind side, armored. Pool scales with guardStrength
   *  (the guard-hall economy); installed at the raise, stripped when the
   *  stance drops (release, parry-end, or a stun). */
  shellGraft?: {
    side?: 'rear' | 'front' | 'all';
    arcDeg?: number;
    max: number;
    regenDelay?: number;
    regenRate?: number;
    color?: string;
  };
  /** A FISSURE TRAIL this support grafts onto the skill's projectiles —
   *  every shot becomes the tear-head of a travelling crack (Sundering
   *  Flight). See FissureTrailSpec. */
  fissureTrail?: FissureTrailSpec;
  /** A TARGETING spec this support grafts onto the skill (a socketed graft
   *  WINS over the innate one): Closing Instinct hands any movement skill
   *  Closing Fang's auto-lunge — the dash picks its own prey. Use
   *  fallback 'aim' so an empty field never refuses the button. */
  targeting?: TargetingSpec;
  /** A TURRET conversion (Risen Offering): a lingering GROUND skill is
   *  planted as a construct at the CASTER's feet instead of at the mark —
   *  the zone (domain and all) rides the turret and dies with it, and the
   *  turret CASTS `castSkillId` at enemies inside the zone's radius.
   *  `look` names the effigy's part-grammar portrait (data/looks.ts) so a
   *  turret support carries its own body, never the generic totem post. */
  turret?: { castSkillId: string; life?: number; look?: string };
  /** A ground CASCADE this support grafts onto the skill (Spell Cascade's
   *  displaced repeats, Seismic March's rippling wave). See GroundCascadeSpec. */
  cascade?: GroundCascadeSpec;
  /** A ground PULSE this support grafts onto the skill (Buried Charge's
   *  second detonation): any placement becomes dormant ground that blows
   *  AGAIN. A socketed graft wins over the skill's own. See GroundPulseSpec. */
  pulse?: GroundPulseSpec;
  /** A FOLLOW-UP CAST this support grafts (Reaper's Encore): the payload
   *  fires free a beat after every completed real use of the host. Specs
   *  MERGE with the skill's own — the tether rule. See FollowUpSpec. */
  followUp?: FollowUpSpec;
  /** WORN GROUND (Carried Edge): the host's lingering placements RIDE the
   *  caster (Zone.follow) instead of standing where cast — the sweep's arc
   *  keeps its own trajectory, only the anchor walks with you. */
  zoneFollow?: true;
  /** A LINGERING-FUME graft (Creeping Fumes): the host's placements gate
   *  their ticks on `after` seconds of continuous occupant breath — and,
   *  with `domain`, the zone's domain soaks in on the same clock. A
   *  socketed graft wins over the delivery's own exposure. */
  exposure?: { after: number; domain?: true };
  /** GROWTH this support grafts onto lingering ground (Overgrowth): the
   *  zone SWELLS while it lives, radius units/s — the delivery's own grow
   *  is the innate base and wins when present. */
  zoneGrow?: number;
  /** A SIZE ENVELOPE this support grafts onto lingering ground (Ebbing
   *  Ground's closing throat, Blooming Ground's seed-to-field): the zone
   *  BREATHES over its whole linger on a named curve. A socketed graft
   *  WINS over the delivery's own sizeOver — see SizeEnvelopeSpec. */
  zoneSizeOver?: SizeEnvelopeSpec;
  /** A CADENCE warp this support grafts (Accelerando / Ritardando): every
   *  BEAT the host's placements keep — pulse gaps, cascade skips, emitter
   *  salvos — multiplies its interval by this per beat. OVERRIDES the
   *  specs' own intervalStep. <1 quickens like the settling ball; >1
   *  spreads the tolls out. One knob, every clock. */
  cadence?: { intervalStep: number };
  /** A PER-CAST VARIANCE this support grafts (Unstable Compression's
   *  wandering footprint on any area skill) — the host re-rolls its own
   *  size every cast. WINS over the skill's innate variance. */
  variance?: VarianceSpec;
  /** A SEQUEL this support grafts (Parting Gift): the host's flights cast
   *  the named skill where they END. WINS over the delivery's own. */
  sequel?: SequelSpec;
  /** A CONTAGION this support grafts (Epidemic): the host's victims may
   *  re-release it from themselves. WINS over the skill's own. */
  contagion?: ContagionSpec;
  /** A PENDULUM this support grafts onto lingering ground zones (the
   *  Metronome gem): the facing swings out-and-back — the exact back-and-
   *  forth stroke Reaver's Sweep retired when it learned the single pass. */
  pendulum?: { arcDeg: number; period: number };
  /** An ECHO RIDER this support grafts: each completed use of the host
   *  skill raises/refreshes a ghost that re-casts the HOST instance —
   *  sockets and all (Phantasmal Echo's sentry, Ancestral Call's one-swing
   *  glide ghost). See EchoRiderSpec. */
  echo?: EchoRiderSpec;
  /** A SUMMON graft: on a construct-delivery skill, the spawn becomes this
   *  real MINION instead (Vessel of Shadow) — exclusive by construction,
   *  so no echo behavior survives the conversion. */
  summon?: SummonDelivery;
  /** Tags this support GRANTS the skill while socketed — Dive Bomb makes a
   *  dash 'aoe', which is what lets No Man's Land socket in beside it.
   *  Granted tags count for OTHER supports' gates and for stat contexts. */
  grantsTags?: SkillTag[];
  /** Additional modifiers per level beyond 1 (scaled by level - 1). */
  perLevel?: Modifier[];
  maxLevel?: number;      // default MAX_SUPPORT_LEVEL
  /** Relative drop weight. */
  weight: number;
  /** Never drops below this ZONE level (bracket lever; absent = anywhere). */
  minDropLevel?: number;
  /** Tags used for DROP weighting (GEM_DROP_CFG.tagWeights / gemBias).
   *  Defaults to requiresTags — override when a support's drop identity
   *  differs from what it sockets into. */
  dropTags?: SkillTag[];
}

export const MAX_SUPPORT_LEVEL = 5;

export interface SupportInstance {
  def: SupportDef;
  level: number;
  /** FORWARDED from a summon skill's socket onto this minion-owned skill
   *  instance (world.forwardSummonSockets) — stripped and re-minted whenever
   *  the summon's sockets change. Never appears on a player-owned instance,
   *  never saved (minions are transient). */
  forwarded?: true;
}

/** Default socket count for instances not minted as drops (monster kits). */
export const SOCKETS_PER_SKILL = 3;

// --- Skill rarity: dropped skill gems carry it; it decides their sockets ----

export type SkillRarity = 'common' | 'magic' | 'rare' | 'legendary';

export const SKILL_RARITIES: Record<SkillRarity, {
  label: string; color: string; sockets: number; weight: number;
}> = {
  common:    { label: 'Common',    color: '#b8b8b8', sockets: 1, weight: 52 },
  magic:     { label: 'Magic',     color: '#7a9ae8', sockets: 2, weight: 30 },
  rare:      { label: 'Rare',      color: '#e8d44a', sockets: 3, weight: 14 },
  legendary: { label: 'Legendary', color: '#e87a3a', sockets: 4, weight: 4 },
};

/** Roll a rarity from a uniform [0,1) sample. */
export function rollSkillRarity(roll: number): SkillRarity {
  const entries = Object.entries(SKILL_RARITIES) as [SkillRarity, { weight: number }][];
  let total = 0;
  for (const [, def] of entries) total += def.weight;
  let r = roll * total;
  for (const [rarity, def] of entries) {
    r -= def.weight;
    if (r <= 0) return rarity;
  }
  return 'common';
}

/** A skill as OWNED by an actor: definition + level + socketed supports. */
export interface SkillInstance {
  def: SkillDef;
  level: number;
  sockets: (SupportInstance | null)[];
  /** Dropped gems carry a rarity (it set their socket count). */
  rarity?: SkillRarity;
  /** INSTANCE-LOCAL modifiers stamped by the minting context (an
   *  Invocation's last-rune conversion, future item affixes) — merged into
   *  instanceMods for this instance's whole life, zones and all. */
  extraMods?: Modifier[];
  /** GRAFTS — the skill-mutator lane: support-gem payloads attached WITHOUT
   *  occupying a socket. hostSockets appends them after the real sockets
   *  (same fixpoint tag admission), so mods/riders/cast-on-X/forwarding all
   *  see them uniformly. DERIVED state, never saved: recalcSeat rebuilds it
   *  from meta.grafts (bound passive powers — see data/passiveChoices.ts
   *  GraftSpec); future mutator sources (uniques, boons) push here too. */
  grafts?: SupportInstance[];
  /** The HOST skill this instance was minted to serve (meta payloads,
   *  combo steps) — minionCast orders scope to the host's minions. */
  hostSkillId?: string;
  /** THE GRIMOIRE: the bestiary form this instance is attuned to (a monster
   *  def id; only read on `delivery.grimoire` summons). Set through
   *  World.attuneSpectre — mastery-gated — and serialized with the
   *  character; per INSTANCE, never per character. */
  attunedForm?: string;
  /** GRANTED: a reacquired class-starter spark. Worth NOTHING everywhere
   *  value is minted — zero salvage essence, zero font offerings — so the
   *  softlock rescue hatch can never become a currency loop. */
  granted?: boolean;
  /** Levels bought with ESSENCE (vs skill points). Excluded from the font's
   *  point refund on sacrifice — no essence→points arbitrage. */
  essenceLevels?: number;
  /** DERIVED, never saved: +levels granted by the OWNER's gear/passives
   *  (the classSkill_<classId> stat family — "+1 to Summoner Skills").
   *  recalcSeat recomputes it from the live sheet whenever the build moves;
   *  effectiveSkillLevel simply reads it, so all sixteen call sites see the
   *  bonus without threading an actor through them. */
  bonusLevels?: number;
  /** Per-instance state for stateful skills (Mark/Recall's stored point,
   *  Unleash's last-use timestamp, the combo chain's cursor). */
  state?: {
    markPos?: { x: number; y: number } | null;
    lastUseAt?: number;
    /** COMBO CHAIN cursor: the step the NEXT press casts (0 = base) and
     *  when the last press landed (the window clock). */
    comboIdx?: number;
    comboAt?: number;
    /** CAROMS: anchors collected so far + the last press's time (window). */
    anchors?: { x: number; y: number }[];
    anchorsAt?: number;
    /** TRIGGER GEMS (SupportDef.trigger — all transient, reset on load):
     *  the key's arm/disarm latch, the ICD clock, the damage-taken bank,
     *  and the chain-depth stamp of the last trigger-firing (rule 4). */
    triggerOff?: boolean;
    trigReadyAt?: number;
    trigAccum?: number;
    trigDepth?: number;
    /** SEQUEL chain depth (SequelSpec): how many completion-casts deep
     *  this instance was minted — the authored-cycle lid. */
    seqDepth?: number;
    /** CONTAGION lineage (ContagionSpec): this release-cast's generation
     *  and the actors the chain has already infected (the shared set rides
     *  the whole lineage — the wave only travels outward). */
    contagion?: { gen: number; seen: Set<number> };
  };
}

export function makeSkillInstance(def: SkillDef, level = 1, sockets = SOCKETS_PER_SKILL): SkillInstance {
  return { def, level, sockets: new Array(sockets).fill(null) };
}

export function skillMaxLevel(def: SkillDef): number {
  return def.leveling?.maxLevel ?? MAX_SKILL_LEVEL;
}

export function supportMaxLevel(def: SupportDef): number {
  return def.maxLevel ?? MAX_SUPPORT_LEVEL;
}

export function supportFits(sup: SupportDef, skill: SkillDef): boolean {
  return supportFitsTags(sup, skill.tags);
}

/** SupportDef keys that carry NO payload — identity, socket gating, and
 *  drop plumbing. Everything else on a def is a payload of some kind. */
const SUPPORT_IDENTITY_FIELD_LIST = [
  'id', 'name', 'description', 'color', 'requiresTags', 'excludeTags',
  'maxLevel', 'weight', 'minDropLevel', 'dropTags',
] as const satisfies readonly (keyof SupportDef)[];

/** Payload fields that DEMAND the player's seat — key latches (triggers,
 *  curse draws), held bars (overcharge), press disciplines (strike timing),
 *  the shift layer (metas), reservation economies the minion AI doesn't
 *  manage (aura conversions), and threshold/spender economies that would
 *  BRICK an autonomous caster (gates, charge costs). A support carrying ANY
 *  of these never forwards to minions — whole-gem, no field surgery. It
 *  still sockets and works the summon skill itself by the ordinary rules. */
const MINION_SEAT_BOUND_FIELD_LIST = [
  'trigger', 'triggerPermit', 'overcharge', 'meta', 'strikeTiming',
  'curseOnHit', 'curseField', 'auraDuration', 'reserveLife',
  'gate', 'chargeCost',
  // Not seat-bound in spirit — it's the crew gate's KEY itself (Resonance).
  // Listed here so the key never forwards a copy of itself aboard: it
  // serves the host lane, opening the door for the cargo beside it.
  'resonance',
  // A press discipline: the deliberate mid-stance combo press is the
  // player's verb (minion casters neither hold the seat's stances nor
  // read its hold-combo gate — the automated guardBeat lane is already
  // seat-bound through 'trigger').
  'guardCast',
] as const satisfies readonly (keyof SupportDef)[];
export const MINION_SEAT_BOUND_SUPPORT_FIELDS: ReadonlySet<string> =
  new Set(MINION_SEAT_BOUND_FIELD_LIST);

/** Everything else RIDES MINIONS by default — supports forwarded from a
 *  summon skill's sockets into the minted minions' own skill instances are
 *  read by the same cast pipeline the player uses (minions cast through
 *  useSkill; grafts read through socketSpec/instanceX; z.caster is the
 *  minion, so aftershock dances, worn ground, tethers, even nested summon
 *  grafts all genuinely work). Listed EXPLICITLY only so the partition
 *  below is compile-checked: adding a SupportDef field without deciding
 *  its seat-bound-or-rides fate is a tsc error naming the field. */
const MINION_RIDABLE_FIELD_LIST = [
  'mods', 'perLevel', 'levelBonus', 'levelBonusPer', 'grantsTags',
  'tether', 'aim', 'constructFx', 'devour',
  'fissureVolatile', 'fissureAftershock', 'fissureRoulette',
  'fissureReclose', 'fissurePath', 'meleeFissure',
  'spreadOnHit', 'breakableGraft', 'corpseSpawn', 'minionAuraPool',
  'dominate', 'sacrifice', 'healField', 'spawnBuff', 'zoneEmit', 'madden',
  'releaseOrder', 'healOverTime', 'chargeGain', 'brood', 'minionAura',
  'trail', 'fissureTrail', 'targeting', 'turret', 'cascade', 'pulse',
  'followUp', 'zoneFollow', 'exposure', 'zoneGrow', 'zoneSizeOver',
  'cadence', 'pendulum', 'echo', 'summon', 'fuse', 'gather', 'shellGraft',
  'variance', 'sequel', 'contagion',
  // Munition grafts RIDE: a minion with a chambered skill fires it dry and
  // then presses the empty face — pressUsable routes the press into the
  // rack cast, the same autonomous reload cycle the gunner bandits run.
  'munition',
] as const satisfies readonly (keyof SupportDef)[];

/** COMPILE-TIME PARTITION: identity ∪ seat-bound ∪ ridable must cover every
 *  SupportDef key. A new field fails this assertion (tsc names it) until a
 *  deliberate decision lands it in one of the lists above. */
type ClassifiedSupportField =
  | typeof SUPPORT_IDENTITY_FIELD_LIST[number]
  | typeof MINION_SEAT_BOUND_FIELD_LIST[number]
  | typeof MINION_RIDABLE_FIELD_LIST[number];
type AssertAllSupportFieldsClassified<T extends never> = T;
/** Exported ONLY so the assertion isn't flagged unused — never import it. */
export type _SupportFieldPartitionCheck =
  AssertAllSupportFieldsClassified<Exclude<keyof SupportDef, ClassifiedSupportField>>;

/** Payload fields on `sup` that demand the player's seat — empty = rides. */
export function minionSeatBoundFields(sup: SupportDef): string[] {
  return Object.entries(sup)
    .filter(([k, v]) => v !== undefined && MINION_SEAT_BOUND_SUPPORT_FIELDS.has(k))
    .map(([k]) => k);
}

/** May this support board a summon skill's minions (forwarded into their
 *  own skill instances by world.forwardSummonSockets)? Supports ride by
 *  DEFAULT — the seat-bound exclusion set is the whole gate. */
export function supportRidesMinions(sup: SupportDef): boolean {
  return minionSeatBoundFields(sup).length === 0;
}

/** Tags granted to a skill instance by its socketed supports. */
export function grantedTags(inst: SkillInstance): SkillTag[] {
  const out: SkillTag[] = [];
  for (const s of hostSockets(inst)) {
    if (s.def.grantsTags) out.push(...s.def.grantsTags);
  }
  return out;
}

/**
 * Instance-aware support gating: supports compose with supports. A Dive
 * Bomb socketed into Dash grants 'aoe', and No Man's Land — which demands
 * 'aoe' — now fits in the next socket.
 */
export function supportFitsInst(sup: SupportDef, inst: SkillInstance): boolean {
  return supportFitsTags(sup, [...inst.def.tags, ...grantedTags(inst)]);
}

/** What a summon skill's CREW is known to cast at socket time: the minted
 *  monsters' skill defs. 'unknowable' = corpse-raised crews (Raise Spectre,
 *  Revive) — we cannot say what the player will raise, so every gem that
 *  rides minions may board and fit resolves per-body at spawn. null = the
 *  instance mints no minions. Resolution lives with the registries
 *  (World.summonCrewSkills); this type keeps the engine helpers pure. */
export type SummonCrew = SkillDef[] | 'unknowable' | null;

/**
 * Resolve a summon delivery's knowable crew — the pure core behind
 * World.summonCrewSkills (instance-aware) and the validator's crew-hop
 * audit (def-level). Registries arrive as lookups so the engine stays
 * data-free. The whole POSSIBLE kit counts: base skills plus level-gated
 * grants, across the whole pool — generous by design, since a gem that
 * fits ANY possible crew member may board and simply never forwards onto
 * bodies that don't cast it. A corpse-sourced delivery with no fixed
 * monsterId is 'unknowable' (Raise Spectre); with one (Shaman's Call,
 * which eats a corpse but births a fixed body) the crew stays knowable.
 */
export function summonCrewOf(
  d: SummonDelivery | undefined,
  monster: (id: string) => { skills: string[]; grants?: { skill?: string }[] } | undefined,
  skill: (id: string) => SkillDef | undefined,
): SummonCrew {
  if (!d) return null;
  if (d.fromCorpse && !d.monsterId) return 'unknowable';
  const ids = d.monsterId ? [d.monsterId] : (d.pool ?? []).map(p => p.id);
  const out: SkillDef[] = [];
  const seen = new Set<string>();
  const add = (skillId: string | undefined): void => {
    if (!skillId || seen.has(skillId)) return;
    const def = skill(skillId);
    if (!def) return;
    seen.add(skillId);
    out.push(def);
  };
  for (const mid of ids) {
    const mdef = monster(mid);
    if (!mdef) continue;
    for (const sid of mdef.skills) add(sid);
    for (const g of mdef.grants ?? []) add(g.skill);
  }
  return out.length ? out : null;
}

/**
 * Which of a summon's CREW skills this support would board, composing the
 * host's OTHER riding sockets to fixpoint per crew skill — the crew-side
 * mirror of hostSockets, and the one truth behind the socket gate, the ⤳
 * markers, and the sim injector's legality check. Faultfinder grants
 * 'fissure' aboard the warrior's Cleave, so Tectonic Echoes serves that
 * same Cleave even though the bare def never fit it. 'unknowable' for
 * corpse crews (anything riding may board — fit resolves per-body at
 * raise); null when it boards nothing.
 */
export function crewSkillsServed(sup: SupportDef, inst: SkillInstance, crew: SummonCrew): SkillDef[] | 'unknowable' | null {
  if (!crew || !supportRidesMinions(sup)) return null;
  if (crew === 'unknowable') return 'unknowable';
  const riders = inst.sockets.filter((x): x is SupportInstance =>
    !!x && x.def.id !== sup.id && supportRidesMinions(x.def));
  const served = crew.filter(cd => {
    const pool = [...cd.tags];
    const admitted = new Set<SupportInstance>();
    let grew = true;
    while (grew) {
      grew = false;
      for (const g of riders) {
        if (admitted.has(g) || !supportFitsTags(g.def, pool)) continue;
        admitted.add(g);
        if (g.def.grantsTags) { pool.push(...g.def.grantsTags); grew = true; }
      }
    }
    return supportFitsTags(sup, pool);
  });
  return served.length ? served : null;
}

/**
 * Crew-aware socket gate — THE fit check for socketing a gem into a skill.
 * A support fits when the instance itself takes it (the ordinary tag gate,
 * supports-compose-with-supports included) OR when the skill mints minions
 * the support would board: same gems, one gate, full parity between what
 * the player casts and what the crew casts. Splitting refuses a bare
 * Summon Skeleton Warrior (no projectile anywhere in the crew) but boards
 * the Archer through the bow his bones carry.
 */
export function supportFitsInstOrCrew(sup: SupportDef, inst: SkillInstance, crew: SummonCrew): boolean {
  return supportFitsInst(sup, inst) || crewSkillsServed(sup, inst, crew) !== null;
}

/**
 * The level the skill actually OPERATES at: invested points plus every
 * socketed +level gem. Deliberately UNCAPPED — the point cap (skillMaxLevel)
 * only gates spending, so +level investment pushes perLevel growth past the
 * cap and unlocks over-cap thresholds.
 */
export function effectiveSkillLevel(inst: SkillInstance): number {
  let lv = inst.level + Math.floor(inst.bonusLevels ?? 0);
  for (const s of hostSockets(inst)) {
    if (!s.def.levelBonus) continue;
    lv += Math.floor(s.def.levelBonus + (s.def.levelBonusPer ?? 0) * (s.level - 1));
  }
  return lv;
}

/**
 * All skill-local modifiers a skill instance carries: its own level growth
 * (at the EFFECTIVE level), threshold unlocks it has reached, plus everything
 * from socketed supports. Fed into StatSheet.get as `extra`.
 */
export function instanceMods(inst: SkillInstance): Modifier[] {
  const out: Modifier[] = [];
  if (inst.def.innateMods) out.push(...inst.def.innateMods);
  if (inst.extraMods) out.push(...inst.extraMods);
  const eff = effectiveSkillLevel(inst);
  const perLevel = inst.def.leveling?.perLevel ?? DEFAULT_LEVELING;
  const lv = eff - 1;
  if (lv > 0) for (const m of perLevel) out.push({ ...m, value: m.value * lv });
  if (inst.def.thresholds) {
    for (const t of inst.def.thresholds) if (eff >= t.level) out.push(...t.mods);
  }
  // Lane-routed: only host-serving gems shape this cast's numbers...
  const serving = hostSockets(inst);
  for (const socket of serving) {
    out.push(...socket.def.mods);
    const sl = socket.level - 1;
    if (sl > 0 && socket.def.perLevel) {
      for (const m of socket.def.perLevel) out.push({ ...m, value: m.value * sl });
    }
  }
  // ...EXCEPT THE CREW TAX: a gem actively boarding the crew (riding, the
  // door open, not already serving the host) bills its COST-family mods
  // to the host cast — the summoner strains to field the stronger crew.
  // Dormant gems (gated mode, no resonance key) bill nothing: no effect,
  // no cost. Non-summon instances carry no crew gems, so no tax.
  if (inst.def.delivery.type === 'summon' || instanceSummon(inst)) {
    if (crewBoardingOpen(inst)) {
      const servingSet = new Set(serving);
      for (const socket of inst.sockets) {
        if (!socket || servingSet.has(socket) || !supportRidesMinions(socket.def)) continue;
        for (const m of socket.def.mods) if (HOST_COST_STATS.has(m.stat)) out.push(m);
        const sl = socket.level - 1;
        if (sl > 0 && socket.def.perLevel) {
          for (const m of socket.def.perLevel) {
            if (HOST_COST_STATS.has(m.stat)) out.push({ ...m, value: m.value * sl });
          }
        }
      }
    }
  }
  return out;
}

/** Damage + status tags a skill's context query should include. */
export function skillContextTags(def: SkillDef, extra?: SkillTag[]): Set<SkillTag> {
  const s = new Set<SkillTag>(def.tags);
  if (extra) for (const t of extra) s.add(t);
  return s;
}
