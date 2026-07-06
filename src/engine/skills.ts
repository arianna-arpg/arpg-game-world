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

/** The aim transform a use obeys: a socketed support's graft wins over the
 *  skill's own (one transform per use — they don't stack). */
export function instanceAim(inst: SkillInstance): AimSpec | undefined {
  for (const s of inst.sockets) if (s?.def.aim) return s.def.aim;
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
  for (const s of inst.sockets) add(s?.def.meta);
  return out;
}

/** The META-ACTION shown on the slot (the chain's FIRST beat — see
 *  instanceMetas for the full order a shift-press fires). */
export function instanceMeta(inst: SkillInstance): { skillId: string; label: string } | undefined {
  return instanceMetas(inst)[0];
}

/** The curse→field conversion riding an instance, if any (Miasma). */
export function instanceCurseField(inst: SkillInstance): NonNullable<SupportDef['curseField']> | undefined {
  for (const s of inst.sockets) if (s?.def.curseField) return s.def.curseField;
  return undefined;
}

/** The overcharge spec a use obeys: a socketed support's graft wins over
 *  the skill's own (one per use — stages don't stack across gems). */
export function instanceOvercharge(inst: SkillInstance): OverchargeSpec | undefined {
  for (const s of inst.sockets) if (s?.def.overcharge) return s.def.overcharge;
  return inst.def.overcharge;
}

/** The FIRST socketed graft of a given SupportDef field — the generic
 *  reader behind the one-per-use grafts (sacrifice, dominate, corpseSpawn,
 *  auraDuration, healField, zoneEmit, madden, fissure volatility…). */
export function socketSpec<K extends keyof SupportDef>(
  inst: SkillInstance, key: K,
): NonNullable<SupportDef[K]> | undefined {
  for (const s of inst.sockets) {
    const v = s?.def[key];
    if (v !== undefined) return v as NonNullable<SupportDef[K]>;
  }
  return undefined;
}

/** Every charge tap riding an instance: the skill's own + socket grafts. */
export function instanceChargeGain(inst: SkillInstance): ChargeGainSpec[] {
  const out = [...(inst.def.chargeGain ?? [])];
  for (const s of inst.sockets) if (s?.def.chargeGain) out.push(...s.def.chargeGain);
  return out;
}

/** The brood clause riding an instance (first socket graft wins). */
export function instanceBrood(inst: SkillInstance): BroodSpec | undefined {
  for (const s of inst.sockets) if (s?.def.brood) return s.def.brood;
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
  for (const s of inst.sockets) if (s?.def.targeting) return s.def.targeting;
  return inst.def.targeting;
}

/** The turret conversion riding an instance, if any (Risen Offering). */
export function instanceTurret(inst: SkillInstance): { castSkillId: string; life?: number } | undefined {
  for (const s of inst.sockets) if (s?.def.turret) return s.def.turret;
  return undefined;
}

/** The strike-timing discipline a use obeys: a socketed graft wins; a
 *  skill's innate castMode 'perfect'/'timed' provides the fallback (so
 *  Snipe + Overcharge composes with no extra gem — the innate golden
 *  window becomes the release window). One discipline per use. */
export function instanceStrikeTiming(inst: SkillInstance): StrikeTimingSpec | undefined {
  for (const s of inst.sockets) if (s?.def.strikeTiming) return s.def.strikeTiming;
  if (inst.def.castMode === 'perfect') return { kind: 'perfect' };
  if (inst.def.castMode === 'timed') return { kind: 'timed', bonus: 1.2 };
  return undefined;
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
  /** Lingering ground zone at each drop point. */
  zone?: { radius: number; duration: number; tickInterval?: number; damageScale?: number };
}

/** The trail a projectile lays: a socketed support's graft wins over the
 *  skill's own (one trail per projectile — they don't stack). */
export function instanceTrail(inst: SkillInstance): ProjTrailSpec | undefined {
  for (const s of inst.sockets) if (s?.def.trail) return s.def.trail;
  return inst.def.delivery.type === 'projectile' ? inst.def.delivery.trail : undefined;
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
}

/** The cascade a ground placement obeys: a socketed support's graft wins
 *  over the skill's own; the aoeCascade stat adds placements to either. */
export function instanceCascade(inst: SkillInstance): GroundCascadeSpec | undefined {
  for (const s of inst.sockets) if (s?.def.cascade) return s.def.cascade;
  return inst.def.delivery.type === 'ground' ? inst.def.delivery.cascade : undefined;
}

/** Every tether an instance carries: the skill's own plus socketed gems'. */
export function instanceTethers(inst: SkillInstance): TetherSpec[] {
  const out: TetherSpec[] = [];
  if (inst.def.tether) out.push(inst.def.tether);
  for (const s of inst.sockets) if (s?.def.tether) out.push(s.def.tether);
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
   *   'use'        every completed REAL use of THIS skill (echo/repeat
   *                executions never tap — the meta-banking discipline) */
  on: 'hit' | 'kill' | 'takeHit' | 'block' | 'enemyDeath' | 'allyDeath' | 'second'
    | 'move' | 'orbPickup' | 'channelSecond' | 'use';
  /** enemyDeath: harvest radius around the owner (default 360). */
  radius?: number;
  /** move: units walked per bank (default 60). */
  perDistance?: number;
  /** second / channelSecond: seconds per bank (default 1). */
  everySeconds?: number;
  /** orbPickup: only orbs of this kind feed the tap (omit = any). */
  orbKind?: 'life' | 'mana' | 'es';
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
   *  is its hit-damage sibling). damageScale defaults 0.5. */
  endZone?: { radius: number; duration: number; tickInterval?: number; damageScale?: number };
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

/** The fissure trail a projectile tears: a socketed support's graft wins
 *  over the skill's own (one crack per flight — they don't stack). */
export function instanceFissureTrail(inst: SkillInstance): FissureTrailSpec | undefined {
  for (const s of inst.sockets) if (s?.def.fissureTrail) return s.def.fissureTrail;
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
}

/** A direct strike on the skill's resolved target (see SkillDef.targeting). */
export interface TargetDelivery {
  type: 'target';
  /** Optional splash radius around the target, hitting other enemies. */
  splash?: number;
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
}

export interface GroundDelivery {
  type: 'ground';         // targeted at cursor (AI: at target)
  radius: number;
  castRange: number;      // max placement distance
  delay?: number;         // telegraph time before impact
  lingerDuration?: number;// if set, leaves a zone dealing damage each tick
  tickInterval?: number;  // seconds between linger ticks (default 0.5)
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
  /** The lingering zone REVOLVES: its facing spins at this rate (rad/s) —
   *  meaningful for FACED shapes (crescents, triangles): Cinderwhirl's
   *  rotating flame. BASE of the aoeSpin stat query, so a support can
   *  spin any faced zone from nothing or crank an innate one. */
  rotate?: number;
  /** The lingering zone GROWS as it lives (radius units/s) — pair with
   *  drift for a traveling, swelling upchurn (Upheaval). */
  grow?: number;
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
  /** The lingering zone is an EMITTER: every `interval` seconds it casts
   *  `count` copies of a payload skill — each at a random point inside the
   *  zone ('point': Volcanic Fissure's magma bursts) or at a random enemy
   *  standing in it ('enemy': Thunderstorm's bolts, Entangle's lashes —
   *  the beat is skipped when nothing stands inside). Payloads execute
   *  with the placer's full build; give them castRange 9999 so a
   *  far-travelled zone doesn't clamp its bursts back toward the caster. */
  emit?: { skillId: string; interval: number; count?: number; at?: 'point' | 'enemy' };
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
   *  side-to-side harvest, no return stroke. Faced shapes feel it. */
  sweep?: { arcDeg: number };
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
  /** SPARKFIELD: strikes plant UNDER enemies inside the scatter disc
   *  (nearest first; leftovers scatter at random ground as usual). */
  atEnemies?: true;
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
  trailZone?: { radius: number; duration: number; tickInterval?: number; damageScale?: number };
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
  for (const s of inst.sockets) {
    if (!s?.def.echo || seen.has(s.def.id)) continue;
    seen.add(s.def.id);
    out.push({ spec: s.def.echo, key: inst.def.id + ':' + s.def.id });
  }
  return out;
}

/** A support's SUMMON graft: replaces a construct-delivery skill's spawn
 *  with a real minion (Vessel of Shadow's flesh-and-blood clone). */
export function instanceSummon(inst: SkillInstance): SummonDelivery | undefined {
  for (const s of inst.sockets) if (s?.def.summon) return s.def.summon;
  return undefined;
}

export interface ConstructDelivery {
  type: 'construct';
  kind: ConstructKind;
  /** Skill the construct casts (totem/sentry: at targets; trap: on trigger;
   *  mine: on detonation; pylon: periodic trigger). */
  castSkillId?: string;
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
  /** The construct GLIDES at its owner's shoulder instead of standing
   *  where planted (Holy Relic — the relic that keeps up). */
  follows?: true;
  /** THE BELL (Tolling Bell): every landed hit the construct SUFFERS makes
   *  it cast castSkillId at itself (throttled by `interval`) — pair with
   *  `taunt` and the enemies ring it for you. */
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
  | 'overcharge';// held: the bar REFILLS, banking stages (see OverchargeSpec)

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
   *  `minHold` held seconds fizzle (no payload — the tap tax). */
  release?: {
    dmgRamp?: RampSpec;
    aoeRamp?: RampSpec;
    pulses?: boolean;
    minHold?: number;
  };
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
}

/** Every gate a use must clear: the skill's own plus each socketed levy's. */
export function instanceGates(inst: SkillInstance): GateSpec[] {
  const out: GateSpec[] = [];
  if (inst.def.gate) out.push(inst.def.gate);
  for (const s of inst.sockets) if (s?.def.gate) out.push(s.def.gate);
  return out;
}

/** The charge cost a use pays: a socketed SPENDER graft (Ravening's
 *  optional feast, Embargo's hard levy) WINS over the skill's innate one —
 *  one spender economy per use. */
export function instanceChargeCost(inst: SkillInstance): SkillDef['chargeCost'] {
  for (const s of inst.sockets) if (s?.def.chargeCost) return s.def.chargeCost;
  return inst.def.chargeCost;
}

// --- Targeting: restricting a skill to specific targets ----------------------

export interface TargetingSpec {
  target: 'enemy' | 'corpse' | 'minion' | 'ally';
  /** The target must carry one of these statuses (Expunge: poison;
   *  Flash Freeze: chill OR frozen). String or any-of list. */
  requiresStatus?: string | string[];
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

/** COMMAND every mobile minion to the AIM POINT: they march on the mark
 *  and fight whatever holds it (the inverse-Bombardment order — the rift
 *  opens at your feet, the horde goes where you point). The order expires
 *  on arrival or after `duration` seconds. */
export interface CommandMinionsEffect {
  type: 'commandMinions';
  duration?: number;
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

/** Restores a resource immediately (Power Surge, resource orbs). */
export interface RestoreEffect {
  type: 'restore';
  resource: 'life' | 'mana' | 'es';
  amount: number;
  /** ES restores can also kick the recharge off immediately. */
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

/** Restores a resource OVER TIME — the flask drink. `perCharge` scales the
 *  total with the charges the use consumed (chargeCost 'all': a fuller
 *  fount pours longer), so one entry serves sips and gulps alike. Streams
 *  stack; life flows through healBy (seared wounds slow the flask too). */
export interface RestoreOverTimeEffect {
  type: 'restoreOverTime';
  resource: 'life' | 'mana' | 'es';
  /** Total restored across the stream (× perCharge count when set). */
  amount: number;
  /** Seconds the stream runs (× effectDuration). */
  duration: number;
  /** Multiply `amount` by the charges this use consumed. */
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

export type SkillEffect =
  | DamageEffect | StatusEffect | BuffEffect | KnockbackEffect
  | PullEffect | SpawnZoneEffect | GainChargeEffect | AbsorbEffect
  | RestoreEffect | TerrainEffect | RecallMinionsEffect | DrainChargeEffect
  | HealEffect | CleanseEffect | CommandMinionsEffect
  | IronWardEffect | GuardSurgeEffect | ReduceCooldownsEffect
  | RestoreOverTimeEffect | WardEffect | SiphonOrbEffect
  | DetonateMinionsEffect | SpawnCorpseEffect | ShatterConstructsEffect
  | MinionCastEffect | PayLedgerEffect;

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
  /** USE-CHARGES: the skill banks `max` uses and recovers them ONE AT A
   *  TIME, every `recharge` seconds (÷ skillChargeRate; max + the
   *  skillCharges stat) — spammable down to empty, then a dry spell.
   *  Replaces the cooldown as the pacing device (keep cooldown 0). The
   *  reference charge economy the flask/cadence family runs on.
   *  `stepsFromBank` (Riftstep): the press resolves ONCE PER BANKED charge
   *  (3 banked = a 3-step flicker; 1 = a single step) while spending only
   *  the one — the bank is the multiplier, not the ammunition. Deliberate
   *  opt-in: most charge skills should just eat a round, not multiply. */
  useCharges?: { max: number; recharge: number; stepsFromBank?: boolean };
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

  /** Skill-local modifiers the skill carries innately at every level
   *  (Ice Blade's high base crit). Joined into instanceMods. */
  innateMods?: Modifier[];

  /** Hits SHATTER targets carrying any listed status: the statuses are
   *  consumed and the hit deals `mult` MORE damage (Absolute Zero vs
   *  chilled / frozen targets). `perStack` scales the payoff with the
   *  stacks consumed instead — (mult−1) × stacks MORE (Execution). */
  shatterStatus?: { statuses: string[]; mult: number; perStack?: boolean };

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

  /** Movement factor while this skill's CAST BAR runs (0 = rooted, the
   *  default). The castMobility stat ADDS to it — mobile attacks by data,
   *  walking casters by investment (Fleetfoot). Channels use ChannelSpec. */
  castMove?: number;

  /** STEALTH interaction override: true = using this skill always spends a
   *  stealth charge / shatters invisibility; false = never does. Omitted:
   *  offensive skills (base damage, damage/knockback/pull effects) break
   *  stealth, movement and utility keep it. */
  breaksStealth?: boolean;

  /** META-ACTION: a SECOND ability riding this skill's hotbar slot — a
   *  mini-button above the slot, fired with SHIFT+key (never a bar slot of
   *  its own). The payload is an ordinary catalog skill cast at the host's
   *  effective level: Fire Mine carries Detonate, the hive carries Enrage,
   *  summons carry the Attack! command. The foundational transformation
   *  primitive — meta-combos are payload skills all the way down. */
  meta?: { skillId: string; label: string };

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
   *  three gems of one shape). */
  zoneEmit?: { skillId: string; interval: number; at?: 'point' | 'enemy' };
  /** MADDENING GROUND: anything standing in the host's lingering field for
   *  `after` accumulated seconds is driven MAD (the `maddened` status —
   *  it lashes at whatever is nearest, friend or foe). */
  madden?: { after: number };
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
  /** A STRIKE-TIMING discipline this support grafts (see StrikeTimingSpec
   *  — Perfect Draw's golden tail, Wandering Mark's roving marker): a
   *  press inside the zone on bar casts, the RELEASE inside the zone on
   *  overcharge holds. */
  strikeTiming?: StrikeTimingSpec;
  /** A PROJECTILE TRAIL this support grafts onto the skill (Detonating
   *  Passage's path blasts, Scorched Wake's burning ground). See ProjTrailSpec. */
  trail?: ProjTrailSpec;
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
   *  turret CASTS `castSkillId` at enemies inside the zone's radius. */
  turret?: { castSkillId: string; life?: number };
  /** A ground CASCADE this support grafts onto the skill (Spell Cascade's
   *  displaced repeats, Seismic March's rippling wave). See GroundCascadeSpec. */
  cascade?: GroundCascadeSpec;
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
}

export const MAX_SUPPORT_LEVEL = 5;

export interface SupportInstance {
  def: SupportDef;
  level: number;
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
  /** The HOST skill this instance was minted to serve (meta payloads,
   *  combo steps) — minionCast orders scope to the host's minions. */
  hostSkillId?: string;
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
  if (sup.excludeTags && sup.excludeTags.some(t => skill.tags.includes(t))) return false;
  if (!sup.requiresTags || !sup.requiresTags.length) return true;
  return sup.requiresTags.some(t => skill.tags.includes(t));
}

/** Tags granted to a skill instance by its socketed supports. */
export function grantedTags(inst: SkillInstance): SkillTag[] {
  const out: SkillTag[] = [];
  for (const s of inst.sockets) {
    if (s?.def.grantsTags) out.push(...s.def.grantsTags);
  }
  return out;
}

/**
 * Instance-aware support gating: supports compose with supports. A Dive
 * Bomb socketed into Dash grants 'aoe', and No Man's Land — which demands
 * 'aoe' — now fits in the next socket.
 */
export function supportFitsInst(sup: SupportDef, inst: SkillInstance): boolean {
  const tags = [...inst.def.tags, ...grantedTags(inst)];
  if (sup.excludeTags && sup.excludeTags.some(t => tags.includes(t))) return false;
  if (!sup.requiresTags || !sup.requiresTags.length) return true;
  return sup.requiresTags.some(t => tags.includes(t));
}

/**
 * The level the skill actually OPERATES at: invested points plus every
 * socketed +level gem. Deliberately UNCAPPED — the point cap (skillMaxLevel)
 * only gates spending, so +level investment pushes perLevel growth past the
 * cap and unlocks over-cap thresholds.
 */
export function effectiveSkillLevel(inst: SkillInstance): number {
  let lv = inst.level;
  for (const s of inst.sockets) {
    if (!s?.def.levelBonus) continue;
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
  for (const socket of inst.sockets) {
    if (!socket) continue;
    out.push(...socket.def.mods);
    const sl = socket.level - 1;
    if (sl > 0 && socket.def.perLevel) {
      for (const m of socket.def.perLevel) out.push({ ...m, value: m.value * sl });
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
