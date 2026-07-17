// ---------------------------------------------------------------------------
// THE CREEP FABRIC — living ground membrane that spreads from sources.
//
// Creep is not a doodad and not a region: it is an organism's SKIN laid over
// the zone floor — anchored patches that grow outward from a heart, breathe
// in place, and recoil when their heart dies. The drawn membrane IS the hit
// surface: an actor standing on live creep (cover above the honesty floor)
// wears the kind's granted statuses, refreshed while on it and lingering
// briefly after stepping off — the fog fabric's exact contract, grounded.
//
// Everything is data:
//   - CreepDef rows (CREEPS registry) describe a creep KIND: its look (the
//     render layer bakes membrane/veins/nodes from the same fields), its
//     spread grammar (reach/spread/recede/lobing), and what it grants to
//     whom (team/faction filters, plus notFactions for "everyone but its
//     own kind" — the invader's skin resents every other boot).
//   - ZoneCreepSpec on a ZoneTheme says which kinds a zone grows ambiently
//     and how many pockets. No spec = no ambient creep.
//   - RUNTIME SOURCES are the package/monster seam: World.creepEnsure()
//     lazily builds an empty field anywhere, addSource() plants a patch
//     (optionally BOUND to an actor — kill the heart, the skin recoils),
//     cleanseAt() force-recedes hearts in a radius (payoff hooks).
//
// THE ADVANCING FRONT (CreepDef.front — every lever optional; a row with
// none is byte-identical to yesterday's creep): a creep that MARCHES. The
// source's heart travels a bearing instead of anchoring, its pace read from
// the land it eats (FrontAffinity ground multipliers; live traveled ways
// decline it — clearways are firebreaks, causeways are the flood's spared
// crossings), CONSUMING fueled doodads as it passes (DoodadRule.fuel rows;
// remnant swaps, decaying feed, spawned kin) and CONVERTING the ground it
// leaves behind (scorch behind the blaze, a wet shallow wake behind the
// crest). One quench lever and one feed lever per row — damage types that
// stall or hasten a SECTION's vigor, nothing global, no reaction matrix:
// player casts never ignite fronts or terrain; fronts are authored danger.
// Waves spawn from ZoneCreepSpec.fronts rows or runtime addFront() — the
// seam a future escape-chase event binds (front + the 'escape' objective).
//
// Design constraints honored here (the fog fabric's contracts):
//   - PURE LEAF: no engine imports — world.ts and the renderer consume it
//     through small structural types (fronts read terrain through ONE
//     CreepTerrain adapter World installs; the leaf never sees a Doodad).
//   - SEED DISCIPLINE: ambient pockets roll on a SALTED copy of the zone
//     seed (CREEP_CFG.salt) and never advance the layout stream — adding
//     creep to a tileset cannot move a doodad, spawn or baseline metric.
//     Front waves draw AFTER the pocket rolls; per-source runtime rolls
//     (stamp radii) ride a private xorshift so the field stream stays the
//     placement stream.
//   - TRANSIENCE: rebuilt each loadZone like all ambient texture; nothing
//     serializes. Durable overlays that spread creep re-plant on enter.
//     (Ground a front CONVERTED is ordinary runtime terrain and follows
//     terrain's own rules, not the field's.)
//   - HONEST EDGES: coverAt() and the baked sprite share ONE rim function
//     (rimAt) — the membrane grants exactly where it visibly lies. A
//     yieldWays front masks live way discs out of cover AND the drawn
//     skin from the same list: the deck you shelter on is dry both ways.
// ---------------------------------------------------------------------------

interface Vec2Like { x: number; y: number }

/** The slice of Rng this module uses (structurally typed so the leaf stays
 *  import-free; World passes the real core/rng instance shape). */
interface CreepRng {
  next(): number;
  range(lo: number, hi: number): number;
  int(lo: number, hi: number): number;
}

/** The slice of Actor the creep needs to dress someone. */
export interface CreepActorLike {
  pos: Vec2Like;
  radius: number;
  dead: boolean;
  team: string;
  untargetable?: boolean;
  construct?: unknown;
  flying?: boolean;
  faction?: string;
  applyStatus(id: string, dps: number, magnitude: number, source: string): void;
}

// --- Defs -------------------------------------------------------------------

/** One gift the membrane grants to occupants standing on live creep. Filters
 *  are optional and conjunctive. `notFactions` excludes — the idiomatic pair
 *  is one grant FOR the organism's faction and one against everyone else.
 *  Statuses should keep SHORT durations (0.6–2s) — the refresh-while-on /
 *  linger-on-exit idiom of terrain statuses. */
export interface CreepGrant {
  status: string;
  /** Limit to these teams ('player' | 'enemy' | …). */
  teams?: readonly string[];
  /** Limit to these monster factions (the skin feeds its own). */
  factions?: readonly string[];
  /** Exclude these factions (the skin mires everyone ELSE). */
  notFactions?: readonly string[];
}

/** A creep KIND — pure data. Look fields feed the render bake (membrane
 *  body, rim lip, vein filaments, glow nodes); spread fields are the whole
 *  life grammar: patches grow a front outward at `spread`, hold and breathe,
 *  and recoil at `recede` when their heart dies or a payoff cleanses them. */
export interface CreepDef {
  id: string;
  /** Membrane body tint (the render layer darkens toward the heart). */
  color?: string;
  /** Rim lip tint — the bright(er) welt where skin meets stone. */
  rim?: string;
  /** Vein filament tint. */
  vein?: string;
  /** Glow tint: node freckles + the live pulse front riding heart→rim. */
  glow?: string;
  /** Peak body opacity, 0..1. */
  alpha?: number;
  /** Patch reach roll (world units, heart to mean rim). */
  reach?: [number, number];
  /** Rim waviness 0..1 — 0 a disc, 0.35 a lobed ameboid skirt. */
  lobing?: number;
  /** Front advance speed while growing, units/sec. */
  spread?: number;
  /** Front recoil speed while dying, units/sec (skin recoils faster than
   *  it crawls; default spread × 1.6). */
  recede?: number;
  /** Heartbeat rate multiplier for the breathing/pulse (1 = the warren's). */
  pulse?: number;
  /** Vein filament count roll (render). */
  veins?: [number, number];
  /** Glow-node freckle density 0..1 (render; keep SPARSE — the unease is
   *  in the noticing, not the counting). */
  nodes?: number;
  /** Minimum cover that still counts as "on creep" for gameplay
   *  (default CREEP_CFG.hitFloor) — the thinning rim stops granting first. */
  hitFloor?: number;
  /** Statuses granted to occupants of live creep. */
  grants?: readonly CreepGrant[];
  /** Marching-front levers. Absent = the classic anchored patch. */
  front?: FrontSpec;
  /** Render skin family: 'membrane' (default — veins, freckles, lip),
   *  'water' (swell bands and foam, no veins), 'blaze' (ember core, spark
   *  freckles). One word per row; the bake branches, nothing else moves. */
  skin?: 'membrane' | 'water' | 'blaze';
  /** The leading-edge telegraph a front wears: a bright arc riding the rim
   *  on the bearing side plus direction streaks, so the advance reads at a
   *  glance. Only front sources draw it. */
  edge?: { color: string; style: 'foam' | 'flame'; width?: number };
}

// --- The advancing front (all optional — absent levers cost nothing) --------

/** How the land ahead reads to a marching front: advance-speed multipliers
 *  by ground kind. NOT a reaction matrix — each row names only what IT
 *  cares about; unlisted kinds fall to `default` (1). `clearway` is the
 *  coherence fabric paying off: the multiplier over live traveled-way
 *  discs (0 = roads are firebreaks and causeways part the flood). */
export interface FrontAffinity {
  ground?: Readonly<Record<string, number>>;
  /** Bare zone floor (no ground disc underfoot). Default 1. */
  default?: number;
  /** Live way discs (kept roads/causeways — wild stretches don't count). */
  clearway?: number;
}

/** One thing the passing front EATS: doodads whose DoodadRule.fuel matches
 *  `fuel` are consumed as the leading edge reaches them — swapped to the
 *  remnant kind (`leave`) or removed, optionally hastening the section
 *  (`feed`, the decaying stoke) and birthing kin (`spawn`). */
export interface FrontConsumeRow {
  fuel: string;
  /** Remnant doodad kind left standing (absent = consumed outright). */
  leave?: string;
  /** Advance boost per piece eaten, added to the section's decaying stoke. */
  feed?: number;
  /** Kin born from the consumed piece (world rolls chance, caps per field). */
  spawn?: { monster: string; chance: number };
  /** Consumption flash tint (default a pale scenery-break neutral). */
  fx?: string;
}

/** THE ADVANCING FRONT — per-row levers that turn an anchored patch into a
 *  marching one. Every field beyond `speed` optional; a CreepDef without
 *  `front` is byte-identical to the classic fabric. Quench and feed are the
 *  row's ONLY damage hooks — at most one lever each, data on the row, no
 *  global element table: player casts never ignite fronts that aren't
 *  already burning (ignition-by-damage is a deliberately RESERVED seam). */
export interface FrontSpec {
  /** March speed, units/sec, before affinity/vigor/stoke modulation. */
  speed: number;
  affinity?: FrontAffinity;
  /** Sustained starvation gutters the section: advance multiplier at or
   *  below `below` for `after` seconds → the source recedes and dies. */
  starve?: { below: number; after: number };
  consume?: readonly FrontConsumeRow[];
  /** Ground stamped behind the trailing rim as the front passes — the
   *  scorch behind the blaze, the wet wake behind the crest. `shallow`
   *  marks stamped liquid wadeable (the ford contract, never a new deep).
   *  `every` is the stamp cadence as a fraction of the band radius. */
  convert?: { ground: string; shallow?: boolean; every?: number; r?: [number, number] };
  /** Damage of these types striking the skin STALLS the section: `power`
   *  is the damage that takes one section from full vigor to guttered. */
  quench?: { types: readonly string[]; power: number };
  /** Damage of these types striking the skin STOKES the section — keep
   *  power HIGH: fronts are authored danger, and a stray splash from a
   *  passing build must never meaningfully hasten one. */
  feed?: { types: readonly string[]; power: number };
  /** Honor traveled ways in the SKIN itself: cover (and the drawn
   *  membrane) masks out live way discs — the deck you shelter on stays
   *  dry, drawn and tested from one list. */
  yieldWays?: boolean;
  /** The undertow: covered bodies are carried along the bearing at
   *  `accel` units/sec (world routes it through the mover contract with
   *  the wind fabric's spares — dormant, anchored, airborne all exempt). */
  drag?: { accel: number; notFactions?: readonly string[] };
  /** The drowning ramp: covered PLAYERS drain this much breath/sec (the
   *  survival fabric — monsters never drown, exactly as in deep water). */
  drown?: { drain: number };
}

/** One ambient front lane on a zone's creep spec: which kind marches, how
 *  many band sources per wave, where it points, and whether it returns.
 *  This row (or a runtime addFront) is the seam a future escape-chase
 *  event binds — front + the existing 'escape' objective; nothing here
 *  builds that event. */
export interface FrontSpawnRow {
  id: string;
  /** Band sources per wave (a picket line abreast). Default [3, 4]. */
  line?: [number, number];
  /** March bearing in radians; absent/'roll' = rolled per wave. */
  bearing?: number | 'roll';
  /** Seconds before the first wave. Default [6, 14]. */
  delay?: [number, number];
  /** After a wave dies or leaves, the next arrives in [lo, hi] seconds.
   *  Absent = one wave per visit. */
  waves?: [number, number];
}

/** What a zone grows ambiently — lives on ZoneTheme.creep. Pocket count
 *  rolls once per visit on the salted stream; kinds are a weighted table.
 *  `fronts` rows spawn marching waves (kinds there must carry `front`). */
export interface ZoneCreepSpec {
  pockets: [number, number];
  kinds: readonly { id: string; weight?: number }[];
  fronts?: readonly FrontSpawnRow[];
}

/** A live traveled-way disc, as plain data (the leaf never sees a Doodad). */
export interface WayDisc { x: number; y: number; r: number }

/** The ONE window fronts read and write the world through — installed by
 *  World, structurally typed so the leaf stays import-free. Every method
 *  is a thin adapter over existing terrain seams (groundAt, the doodad
 *  index, the mover contract, the survival fabric); the field never
 *  mutates anything itself. */
export interface CreepTerrain {
  /** Ground kind under a point, or null for bare zone floor. */
  groundKindAt(x: number, y: number): string | null;
  /** Fueled doodads near a point: fn receives the rule's fuel tag and an
   *  opaque ref the field hands back to consume(). */
  eachFuelNear(x: number, y: number, r: number, fn: (fuel: string, ref: unknown) => void): void;
  /** Execute one consume row on a fueled doodad (swap/remove + FX + kin). */
  consume(ref: unknown, row: FrontConsumeRow, bearing: number): void;
  /** Stamp converted ground behind the trailing rim. */
  stamp(x: number, y: number, r: number, ground: string, shallow: boolean): void;
  /** Displace one covered body (mover contract; world applies the spares). */
  drag(a: CreepActorLike, dx: number, dy: number): void;
  /** Drain a covered player's breath (survival fabric; world gates seats). */
  drown(a: CreepActorLike, drain: number, dt: number): void;
}

/** The registry of record. A new creep kind is one registerCreep row —
 *  consumers look up by id, nothing enumerates. */
export const CREEPS: Record<string, CreepDef> = {};

export function registerCreep(def: CreepDef): void {
  if (CREEPS[def.id]) console.warn(`[creep] re-registering kind '${def.id}' — overriding`);
  CREEPS[def.id] = def;
}

/** The world-registry windows the front validators read through (validate.ts
 *  builds one; absent = classic checks only, so bare harnesses stay green). */
export interface CreepValidationLookups {
  isDamageType(id: string): boolean;
  /** Registered region kind — the convert target must be SENSED ground. */
  hasGroundKind(id: string): boolean;
  hasMonster(id: string): boolean;
  hasDoodadKind(id: string): boolean;
  /** Every DoodadRule.fuel tag any rule declares — the dead-row lint's
   *  mirror: a consume row no doodad can ever feed warns loud. */
  fuelTags: ReadonlySet<string>;
}

/** BOOT VALIDATION (wired into validateContent beside validateFog):
 *  every grant names a real status; specs name registered kinds; every
 *  front lever resolves against the registry it points at. */
export function validateCreep(
  hasStatus: (id: string) => boolean,
  themeSpecs: readonly { owner: string; spec: ZoneCreepSpec }[],
  lookups?: CreepValidationLookups,
): string[] {
  const bad: string[] = [];
  const fin = (n: number): boolean => Number.isFinite(n);
  for (const [id, def] of Object.entries(CREEPS)) {
    for (const g of def.grants ?? []) {
      if (!hasStatus(g.status)) bad.push(`creep '${id}': grant names unknown status '${g.status}'`);
    }
    if ((def.lobing ?? 0) > 0.6) bad.push(`creep '${id}': lobing ${def.lobing} — rims past 0.6 self-intersect`);
    if (def.edge && !def.front) bad.push(`creep '${id}': edge telegraph without front levers — nothing will draw it`);
    const fs = def.front;
    if (!fs) continue;
    if (!fin(fs.speed) || fs.speed <= 0) bad.push(`creep '${id}': front.speed must be positive`);
    for (const [k, v] of Object.entries(fs.affinity?.ground ?? {})) {
      if (!fin(v) || v < 0) bad.push(`creep '${id}': affinity.ground['${k}'] must be >= 0`);
    }
    if (fs.affinity?.clearway !== undefined && (!fin(fs.affinity.clearway) || fs.affinity.clearway < 0)) {
      bad.push(`creep '${id}': affinity.clearway must be >= 0`);
    }
    if (fs.starve && (fs.starve.below < 0 || fs.starve.after <= 0)) {
      bad.push(`creep '${id}': starve wants below >= 0 and after > 0`);
    }
    for (const c of fs.consume ?? []) {
      if (!c.fuel) bad.push(`creep '${id}': consume row with empty fuel tag`);
      else if (lookups && !lookups.fuelTags.has(c.fuel)) {
        bad.push(`creep '${id}': consume fuel '${c.fuel}' — no DoodadRule declares it (a row nothing feeds)`);
      }
      if (c.leave && lookups && !lookups.hasDoodadKind(c.leave)) {
        bad.push(`creep '${id}': consume leaves unknown doodad kind '${c.leave}'`);
      }
      if (c.feed !== undefined && (!fin(c.feed) || c.feed < 0)) bad.push(`creep '${id}': consume.feed must be >= 0`);
      if (c.spawn) {
        if (lookups && !lookups.hasMonster(c.spawn.monster)) {
          bad.push(`creep '${id}': consume spawns unknown monster '${c.spawn.monster}'`);
        }
        if (!(c.spawn.chance > 0) || c.spawn.chance > 1) bad.push(`creep '${id}': consume.spawn.chance wants (0, 1]`);
      }
    }
    if (fs.convert) {
      if (lookups && !lookups.hasGroundKind(fs.convert.ground)) {
        bad.push(`creep '${id}': convert targets unregistered ground kind '${fs.convert.ground}'`);
      }
      if (fs.convert.every !== undefined && !(fs.convert.every > 0)) bad.push(`creep '${id}': convert.every must be > 0`);
      const r = fs.convert.r;
      if (r && !(r[0] > 0 && r[1] >= r[0])) bad.push(`creep '${id}': convert.r wants 0 < lo <= hi`);
    }
    for (const [lever, spec] of [['quench', fs.quench], ['feed', fs.feed]] as const) {
      if (!spec) continue;
      if (!spec.types.length) bad.push(`creep '${id}': ${lever} lists no damage types`);
      for (const t of spec.types) {
        if (lookups && !lookups.isDamageType(t)) bad.push(`creep '${id}': ${lever} names unknown damage type '${t}'`);
      }
      if (!(spec.power > 0)) bad.push(`creep '${id}': ${lever}.power must be > 0`);
    }
    if (fs.drag && !(fs.drag.accel > 0)) bad.push(`creep '${id}': drag.accel must be > 0`);
    if (fs.drown && !(fs.drown.drain > 0)) bad.push(`creep '${id}': drown.drain must be > 0`);
  }
  for (const { owner, spec } of themeSpecs) {
    for (const k of spec.kinds) {
      if (!CREEPS[k.id]) bad.push(`${owner}: creep spec names unregistered kind '${k.id}'`);
    }
    if (!spec.kinds.length && spec.pockets[1] > 0) bad.push(`${owner}: creep spec rolls pockets but lists no kinds`);
    for (const f of spec.fronts ?? []) {
      const def = CREEPS[f.id];
      if (!def) { bad.push(`${owner}: front lane names unregistered kind '${f.id}'`); continue; }
      if (!def.front) bad.push(`${owner}: front lane '${f.id}' — that row carries no front levers`);
      if (f.line && !(f.line[0] >= 1 && f.line[1] >= f.line[0])) bad.push(`${owner}: front lane '${f.id}' line wants 1 <= lo <= hi`);
      for (const [name, band] of [['delay', f.delay], ['waves', f.waves]] as const) {
        if (band && !(band[0] >= 0 && band[1] >= band[0])) bad.push(`${owner}: front lane '${f.id}' ${name} wants 0 <= lo <= hi`);
      }
      if (typeof f.bearing === 'number' && !fin(f.bearing)) bad.push(`${owner}: front lane '${f.id}' bearing must be finite`);
    }
  }
  return bad;
}

// --- Tunables ----------------------------------------------------------------

export const CREEP_CFG = {
  /** XOR salt for the field's own rng stream (never the layout stream). */
  salt: 0x0c4ee9b1,
  /** Seconds between status sweeps (statuses last ≥0.6s; 4Hz is plenty). */
  applyEvery: 0.25,
  /** Default live-cover floor for the hit test. */
  hitFloor: 0.3,
  /** Cover holds full strength inside this fraction of the rim, then thins
   *  to nothing at the rim — ONE profile shared by hit test and bake. */
  bodyFrac: 0.78,
  /** Ambient pocket anchor candidates per placement (best-candidate spread). */
  anchorTries: 10,
  /** Sources the field will hold at once (addSource past this returns null —
   *  a runaway spreader saturates instead of drowning the zone). */
  maxSources: 24,
  /** A receding front thinner than this is removed outright. */
  minReach: 5,
  /** Floating-source label statuses wear. */
  sourceLabel: 'the creep',
  /** Defaults folded under sparse defs. */
  def: {
    color: '#241a2c', rim: '#5a4468', vein: '#4a3258', glow: '#8a6ab0',
    alpha: 0.78, reach: [120, 220] as [number, number], lobing: 0.3,
    spread: 26, pulse: 1, veins: [5, 9] as [number, number], nodes: 0.35,
  },
  /** THE ADVANCING FRONT's shared grammar (per-row data rides FrontSpec;
   *  these are the fabric's own paces and honesty caps). */
  front: {
    /** Seconds between terrain samples per section (staggered by seed). */
    sampleEvery: 0.5,
    /** Sample points ahead of the heart: count, reach band (fractions of
     *  the live rim along the bearing), lateral spread (fraction). */
    samples: 3,
    sampleAhead: [0.55, 0.95] as [number, number],
    sampleSpread: 0.45,
    /** How fast the eased affinity multiplier chases its sampled target
     *  (per second) — fronts surge and stall smoothly, never pop. */
    easeRate: 2.6,
    /** Vigor regained per second while not receding (quench must outpace
     *  this to gutter a section; power dials live on the row). */
    vigorRegen: 0.055,
    /** The stoke's decay per second and its ceiling above base speed. */
    stokeDecay: 0.3,
    stokeMax: 1.1,
    /** Consume sweep: head offset + reach as fractions of the live rim,
     *  and the most pieces one section eats per sweep (FX pacing). */
    consumeAhead: 0.45,
    consumeReach: 0.85,
    consumeBudget: 5,
    /** Convert stamps: default cadence (fraction of the band radius per
     *  stamp), trailing offset, radius band, and the per-section budget —
     *  a front crossing a megazone saturates politely, like sources do. */
    stampEvery: 0.55,
    stampTrail: 0.8,
    stampR: [0.7, 1.0] as [number, number],
    stampMax: 240,
    /** Wave lines: default sources abreast, spacing (× band), born
     *  fraction (waves swell as they enter), and bearing jitter so a line
     *  reads grown, not drawn. */
    line: [3, 4] as [number, number],
    lineSpacing: 1.5,
    lineBorn: 0.45,
    bearingJitter: 0.07,
    delay: [6, 14] as [number, number],
    /** A marching source this far past the bounds (× its rim ceiling) has
     *  left the zone and is removed outright — no recoil theater. */
    exitPad: 1.4,
    /** Kin born of consumption across ONE zone visit (world-side ledger —
     *  a burning forest births a pack, never a flood of bodies). */
    spawnMax: 10,
    /** Way discs cached per section refresh no farther than this beyond
     *  the rim ceiling (the yieldWays mask's broad phase). */
    wayPad: 60,
  },
};

// --- Live state ---------------------------------------------------------------

/** One rim harmonic: integer frequency keeps the skirt seamless at 0/2π. */
export interface RimHarm { k: number; a: number; p: number }

/** The rim modulation at a bearing — THE shared shape truth: the field's
 *  hit test multiplies the live front by it, and the render bake traces the
 *  same product at full reach (scaling preserves it exactly). */
export function creepRimMul(harm: readonly RimHarm[], ang: number): number {
  let m = 1;
  for (const h of harm) m += h.a * Math.sin(h.k * ang + h.p);
  return m;
}

export type CreepSourceState = 'grow' | 'hold' | 'recede';

/** One marching section's live run state (attached to a source when its
 *  def carries `front`). All of it is derived pace bookkeeping — the
 *  personality stays in the source fields beside it. */
export interface FrontRun {
  bearing: number;
  /** cos/sin of the bearing, folded once. */
  dx: number;
  dy: number;
  /** Quench health 1..0 — scales speed; 0 gutters the section. */
  vigor: number;
  /** The decaying stoke (feed damage + consumed fuel), 0..stokeMax. */
  stoke: number;
  /** Eased affinity multiplier (chases the sampled target). */
  mult: number;
  /** Sampled target for `mult`. */
  multTarget: number;
  /** Seconds spent starving (advance ≤ starve.below) so far. */
  starveT: number;
  /** March odometer + distance since the last convert stamp. */
  traveled: number;
  sinceStamp: number;
  /** Stamps + spawns spent from this section's budgets. */
  stamps: number;
  /** Time to the next terrain sample (staggered by seed at birth). */
  sampleIn: number;
  /** Private xorshift state for runtime rolls (stamp radii) — the field's
   *  rng stream stays the placement stream, per the seed discipline. */
  roll: number;
  /** Way discs near this section (refreshed each sample; the yieldWays
   *  cover mask and the render clip read the SAME list). */
  nearWays: WayDisc[];
  /** The spawn-row index that fielded this section (wave respawn ledger;
   *  -1 for runtime addFront sections). */
  rowIdx: number;
}

export interface CreepSource {
  def: CreepDef;
  pos: { x: number; y: number };
  /** Full-grown mean rim distance. */
  maxReach: number;
  /** Live front distance — grows, holds, recoils. THE size. */
  cur: number;
  state: CreepSourceState;
  /** Rim personality (rolled once; bake + hit test share it). */
  harm: RimHarm[];
  /** Bake key personality + pulse stagger. */
  seed: number;
  phase: number;
  /** Kill the heart, the skin recoils: checked each tick when set. */
  boundTo: { dead: boolean } | null;
  /** Theme-grown pockets (born full, never recede on their own). */
  ambient: boolean;
  /** Broad-phase bound: cur × the rim function's ceiling. */
  bound: number;
  /** Marching-front run state (only when the def carries `front`). */
  front?: FrontRun;
}

// --- The field ----------------------------------------------------------------

/** One ambient front lane's live ledger (from a ZoneCreepSpec.fronts row). */
interface FrontLane {
  row: FrontSpawnRow;
  idx: number;
  /** Sections of this lane still marching. */
  live: number;
  /** A wave is scheduled (timer runs) — false while one is out and no
   *  respawn is owed. */
  pending: boolean;
  timer: number;
}

export class CreepField {
  readonly sources: CreepSource[] = [];
  private rng: CreepRng;
  private w: number;
  private h: number;
  private applyAcc = 0;
  /** The world's terrain window (null in bare fields — fronts still march,
   *  they just read every ground as default and eat nothing). */
  private terrain: CreepTerrain | null = null;
  /** Live traveled-way discs, set once per zone by the installer. */
  private ways: readonly WayDisc[] = [];
  private lanes: FrontLane[] = [];
  /** True once any live source carries a quench/feed lever — the damage
   *  tap's early-out (a zone with no fronts pays nothing per hit). */
  quenchable = false;

  constructor(rng: CreepRng, w: number, h: number) {
    this.rng = rng;
    this.w = w;
    this.h = h;
  }

  /** Install the world's terrain window (idempotent; loadZone + creepEnsure). */
  setTerrain(t: CreepTerrain | null): void {
    this.terrain = t;
  }

  /** Hand the field the zone's live way discs (kept roads/causeways). The
   *  yieldWays cover mask, the clearway affinity and the render clip all
   *  read THIS list — drawn and tested can never disagree. */
  setWays(ways: readonly WayDisc[]): void {
    this.ways = ways;
  }

  /** Seed the ambient front lanes from a theme spec (buildZoneCreep). */
  installLanes(rows: readonly FrontSpawnRow[]): void {
    const fd = CREEP_CFG.front;
    this.lanes = rows.map((row, idx) => ({
      row, idx, live: 0, pending: true,
      timer: this.rng.range(...(row.delay ?? fd.delay)),
    }));
  }

  /** Plant a patch. `reach` overrides the def roll; `bornFrac` starts the
   *  front part-grown (ambient pockets are born full); `boundTo` ties the
   *  patch's life to an actor-like (the creep-heart contract). Returns null
   *  at the source cap — a saturated field refuses politely. */
  addSource(
    def: CreepDef,
    x: number,
    y: number,
    opts?: { reach?: number; bornFrac?: number; boundTo?: { dead: boolean } | null; ambient?: boolean },
  ): CreepSource | null {
    if (this.sources.length >= CREEP_CFG.maxSources) return null;
    // Hearts keep inside the arena — a package planting at the very lip
    // still grows a patch the zone can actually walk.
    x = Math.min(this.w - 8, Math.max(8, x));
    y = Math.min(this.h - 8, Math.max(8, y));
    const d = CREEP_CFG.def;
    const maxReach = opts?.reach ?? this.rng.range(...(def.reach ?? d.reach));
    const lobing = def.lobing ?? d.lobing;
    // Three integer-frequency harmonics, amplitudes descending, sum ≤ lobing/2
    // each side of the mean — the ameboid skirt that never self-crosses.
    const harm: RimHarm[] = [];
    let amp = lobing * 0.5;
    for (let i = 0; i < 3; i++) {
      harm.push({
        k: this.rng.int(2 + i, 4 + i * 2),
        a: amp * this.rng.range(0.55, 0.85),
        p: this.rng.range(0, Math.PI * 2),
      });
      amp *= 0.45;
    }
    const born = Math.max(0, Math.min(1, opts?.bornFrac ?? 0));
    const src: CreepSource = {
      def,
      pos: { x, y },
      maxReach,
      cur: Math.max(born * maxReach, born > 0 ? CREEP_CFG.minReach : 0.01),
      state: born >= 1 ? 'hold' : 'grow',
      harm,
      seed: (this.rng.next() * 0xffffffff) >>> 0,
      phase: this.rng.range(0, Math.PI * 2),
      boundTo: opts?.boundTo ?? null,
      ambient: opts?.ambient ?? false,
      bound: 0,
    };
    this.refreshBound(src);
    this.sources.push(src);
    return src;
  }

  /** Plant one MARCHING section: an ordinary source wearing a FrontRun.
   *  The runtime seam for packages and the future escape-chase event —
   *  `bearing` in radians; the def must carry `front`. */
  addFront(
    def: CreepDef,
    x: number,
    y: number,
    bearing: number,
    opts?: { reach?: number; bornFrac?: number; boundTo?: { dead: boolean } | null },
  ): CreepSource | null {
    if (!def.front) {
      console.warn(`[creep] addFront on '${def.id}' — the row carries no front levers`);
      return null;
    }
    const src = this.addSource(def, x, y, {
      ...(opts?.reach !== undefined ? { reach: opts.reach } : {}),
      bornFrac: opts?.bornFrac ?? CREEP_CFG.front.lineBorn,
      boundTo: opts?.boundTo ?? null,
    });
    if (src) this.attachFront(src, bearing, -1);
    return src;
  }

  /** Dress a fresh source in its run state. Sampling staggers off the
   *  source's own seed; runtime rolls ride a private xorshift so the
   *  field's rng stream stays the placement stream. */
  private attachFront(src: CreepSource, bearing: number, rowIdx: number): void {
    const fd = CREEP_CFG.front;
    src.front = {
      bearing,
      dx: Math.cos(bearing),
      dy: Math.sin(bearing),
      vigor: 1,
      stoke: 0,
      mult: 1,
      multTarget: 1,
      starveT: 0,
      traveled: 0,
      // Stamp clocks start STAGGERED (seed-derived): a wave's sections must
      // not land their convert stamps in the same frames — clustered stamps
      // stale several ground chunks at once and the baker's per-frame budget
      // turns that into a visible hitch train.
      sinceStamp: -((src.seed >>> 3) % 997) / 997 * src.cur,
      stamps: 0,
      sampleIn: ((src.seed % 1024) / 1024) * fd.sampleEvery,
      roll: (src.seed ^ 0x9e3779b9) >>> 0 || 1,
      nearWays: [],
      rowIdx,
    };
    const fs = src.def.front;
    if (fs?.quench || fs?.feed) this.quenchable = true;
  }

  /** One private xorshift step for a section's runtime rolls. */
  private frontRoll(run: FrontRun): number {
    let s = run.roll;
    s ^= s << 13; s >>>= 0;
    s ^= s >> 17;
    s ^= s << 5; s >>>= 0;
    run.roll = s;
    return s / 0xffffffff;
  }

  /** Field a lane's wave: a picket line of sections abreast, entering from
   *  the boundary the bearing points away from, swelling as they come. */
  private spawnWave(lane: FrontLane): void {
    const def = CREEPS[lane.row.id];
    if (!def?.front) return;
    const fd = CREEP_CFG.front;
    const bearing = (lane.row.bearing === undefined || lane.row.bearing === 'roll')
      ? this.rng.range(0, Math.PI * 2)
      : lane.row.bearing;
    const dx = Math.cos(bearing), dy = Math.sin(bearing);
    // Walk BACK along the bearing from the zone heart to the rim — the
    // wave breaks in from the land's edge and crosses the whole ground.
    const cx = this.w / 2, cy = this.h / 2;
    const d = CREEP_CFG.def;
    const band = ((def.reach ?? d.reach)[0] + (def.reach ?? d.reach)[1]) / 2;
    const m = Math.min(band * 0.6, Math.min(this.w, this.h) * 0.2);
    let t = Infinity;
    if (dx > 1e-6) t = Math.min(t, (cx - m) / dx);
    if (dx < -1e-6) t = Math.min(t, (cx - this.w + m) / dx);
    if (dy > 1e-6) t = Math.min(t, (cy - m) / dy);
    if (dy < -1e-6) t = Math.min(t, (cy - this.h + m) / dy);
    if (!Number.isFinite(t)) return;
    const ox = cx - dx * t, oy = cy - dy * t;
    const px = -dy, py = dx;
    const n = this.rng.int(...(lane.row.line ?? fd.line));
    for (let i = 0; i < n; i++) {
      const off = (i - (n - 1) / 2) * band * fd.lineSpacing;
      const src = this.addSource(def, ox + px * off, oy + py * off, { bornFrac: fd.lineBorn });
      if (!src) break; // the field is saturated — the wave arrives short
      this.attachFront(src, bearing + this.rng.range(-fd.bearingJitter, fd.bearingJitter), lane.idx);
      lane.live++;
    }
    // A wave the saturation cap refused entirely still owes its return —
    // a lane must never die of a crowded moment.
    if (lane.live === 0 && lane.row.waves) {
      lane.pending = true;
      lane.timer = this.rng.range(...lane.row.waves);
    }
  }

  /** Typed damage landing on the world feeds the skin: quench types stall
   *  a section's vigor, feed types stoke it — per-row levers, nothing
   *  global. Callers early-out on `quenchable`; returns whether any
   *  section drank the hit (FX seams may care). */
  damageSkin(x: number, y: number, r: number, amounts: Readonly<Record<string, number>>): boolean {
    if (!this.quenchable) return false;
    let drank = false;
    for (const s of this.sources) {
      const fs = s.def.front;
      const run = s.front;
      if (!run || !fs || (!fs.quench && !fs.feed) || s.cur < CREEP_CFG.minReach) continue;
      const dx = x - s.pos.x, dy = y - s.pos.y;
      const reach = s.bound + r;
      if (dx * dx + dy * dy > reach * reach) continue;
      if (fs.quench && s.state !== 'recede') {
        let sum = 0;
        for (const t of fs.quench.types) sum += amounts[t] ?? 0;
        if (sum > 0) {
          run.vigor -= sum / fs.quench.power;
          drank = true;
          if (run.vigor <= 0) { run.vigor = 0; s.state = 'recede'; } // guttered
        }
      }
      if (fs.feed && s.state !== 'recede') {
        let sum = 0;
        for (const t of fs.feed.types) sum += amounts[t] ?? 0;
        if (sum > 0) {
          run.stoke = Math.min(CREEP_CFG.front.stokeMax, run.stoke + sum / fs.feed.power);
          drank = true;
        }
      }
    }
    return drank;
  }

  /** Is this point on one of the section's cached live way discs? The
   *  yieldWays mask — cover, grants, drag and the drawn skin all ask HERE. */
  private wayMasked(run: FrontRun, x: number, y: number): boolean {
    for (const w of run.nearWays) {
      const dx = x - w.x, dy = y - w.y;
      if (dx * dx + dy * dy <= w.r * w.r) return true;
    }
    return false;
  }

  /** Would a stamp DISC lap onto a live way? Wake stamps ask this, not the
   *  point mask — a fat shallow can't slop over the causeway just because
   *  its center landed beside it (the dry verge along the deck is real). */
  private wayIntersects(run: FrontRun, x: number, y: number, r: number): boolean {
    for (const w of run.nearWays) {
      const dx = x - w.x, dy = y - w.y;
      const rr = w.r + r * 0.72;
      if (dx * dx + dy * dy <= rr * rr) return true;
    }
    return false;
  }

  /** The ONE rim function: live front distance modulated by the source's
   *  harmonics at a bearing (creepRimMul — shared with the render bake).
   *  Ceiling = cur × (1 + Σa) — refreshBound keeps the broad phase honest. */
  rimAt(src: CreepSource, ang: number): number {
    return src.cur * creepRimMul(src.harm, ang);
  }

  private refreshBound(src: CreepSource): void {
    let sum = 0;
    for (const h of src.harm) sum += h.a;
    src.bound = src.cur * (1 + sum) + 4;
  }

  /** Cover from ONE source at a point: 1 over the body, thinning to 0 at
   *  the visible rim (bodyFrac profile — shared with the bake's gradient).
   *  A yieldWays front masks live way discs to ZERO first — the deck you
   *  shelter on is dry in the hit test exactly as it is on screen. */
  private sourceCover(src: CreepSource, x: number, y: number, pad: number): number {
    const dx = x - src.pos.x, dy = y - src.pos.y;
    const dd = dx * dx + dy * dy;
    const broad = src.bound + pad;
    if (dd > broad * broad) return 0;
    if (src.front && src.def.front?.yieldWays && this.wayMasked(src.front, x, y)) return 0;
    const rim = this.rimAt(src, Math.atan2(dy, dx)) + pad;
    if (rim <= 0.001) return 0;
    const f = Math.sqrt(dd) / rim;
    if (f >= 1) return 0;
    const body = CREEP_CFG.bodyFrac;
    if (f <= body) return 1;
    const t = (1 - f) / (1 - body);
    return t * t * (3 - 2 * t);
  }

  /** Peak live cover at a point, 0..1 (renderer grades, AI curiosity). */
  coverAt(x: number, y: number, pad = 0): number {
    let best = 0;
    for (const s of this.sources) {
      const c = this.sourceCover(s, x, y, pad);
      if (c > best) best = c;
    }
    return best;
  }

  /** Is this point on live creep at all? (The gameplay predicate.) */
  onCreep(x: number, y: number, pad = 0): boolean {
    for (const s of this.sources) {
      const floor = s.def.hitFloor ?? CREEP_CFG.hitFloor;
      if (this.sourceCover(s, x, y, pad) >= floor) return true;
    }
    return false;
  }

  /** The nearest source heart with any live front (AI steering, payoffs). */
  nearestSource(x: number, y: number): CreepSource | null {
    let best: CreepSource | null = null;
    let bestD = Infinity;
    for (const s of this.sources) {
      if (s.cur < CREEP_CFG.minReach) continue;
      const dd = (s.pos.x - x) * (s.pos.x - x) + (s.pos.y - y) * (s.pos.y - y);
      if (dd < bestD) { bestD = dd; best = s; }
    }
    return best;
  }

  /** Force-recede every source whose heart lies within `r` (cleanse payoffs
   *  — the incursion collapses, the skin everywhere near recoils). */
  cleanseAt(x: number, y: number, r: number): number {
    let hit = 0;
    for (const s of this.sources) {
      const dd = (s.pos.x - x) * (s.pos.x - x) + (s.pos.y - y) * (s.pos.y - y);
      if (dd <= r * r && s.state !== 'recede') { s.state = 'recede'; hit++; }
    }
    return hit;
  }

  /** The living tick: fronts advance/recoil, bound hearts are watched,
   *  marching sections read the land and eat it, then the occupants dress
   *  on the apply cadence. Classic sources draw no rng and take the exact
   *  legacy path — a row without front levers ticks byte-identically. */
  update(dt: number, _time: number, actors: readonly CreepActorLike[]): void {
    const d = CREEP_CFG.def;
    // Ambient lanes: waves break in when their timers land.
    for (const lane of this.lanes) {
      if (!lane.pending) continue;
      lane.timer -= dt;
      if (lane.timer > 0) continue;
      lane.pending = false;
      this.spawnWave(lane);
    }
    for (let i = this.sources.length - 1; i >= 0; i--) {
      const s = this.sources[i];
      if (s.boundTo?.dead && s.state !== 'recede') s.state = 'recede';
      if (s.state === 'grow') {
        s.cur += (s.def.spread ?? d.spread) * dt;
        if (s.cur >= s.maxReach) { s.cur = s.maxReach; s.state = 'hold'; }
        this.refreshBound(s);
      } else if (s.state === 'recede') {
        s.cur -= (s.def.recede ?? (s.def.spread ?? d.spread) * 1.6) * dt;
        if (s.cur <= CREEP_CFG.minReach) { this.retireSource(i); continue; }
        this.refreshBound(s);
      }
      if (s.front && s.def.front && s.state !== 'recede') {
        if (!this.tickFront(s, dt)) { this.retireSource(i); continue; }
      }
    }
    // The undertow and the drowning ramp ride every tick (smooth carriage);
    // statuses stay on the apply cadence below.
    if (this.terrain) this.carryOccupants(actors, dt);
    this.applyAcc += dt;
    if (this.applyAcc >= CREEP_CFG.applyEvery) {
      this.applyAcc = 0;
      this.dressOccupants(actors);
    }
  }

  /** Remove a source, settling its lane ledger (a lane whose last section
   *  dies or leaves owes its next wave, if the row wants one). */
  private retireSource(i: number): void {
    const s = this.sources[i];
    this.sources.splice(i, 1);
    const rowIdx = s.front?.rowIdx ?? -1;
    if (rowIdx < 0) return;
    const lane = this.lanes[rowIdx];
    if (!lane) return;
    lane.live = Math.max(0, lane.live - 1);
    if (lane.live === 0 && lane.row.waves && !lane.pending) {
      lane.pending = true;
      lane.timer = this.rng.range(...lane.row.waves);
    }
  }

  /** One marching section's tick: march by vigor × stoke × the eased land
   *  multiplier, sample the ground ahead on the cadence, eat fueled
   *  doodads at the leading edge, stamp converted ground off the trailing
   *  rim, starve on barren land. Returns false when the section left the
   *  zone and should be retired. */
  private tickFront(s: CreepSource, dt: number): boolean {
    const fs = s.def.front!;
    const run = s.front!;
    const fd = CREEP_CFG.front;

    run.sampleIn -= dt;
    if (run.sampleIn <= 0) {
      run.sampleIn += fd.sampleEvery;
      this.sampleFront(s, fs, run);
    }

    // Vigor breathes back (quench must outpace it); the stoke burns down.
    if (run.vigor < 1) run.vigor = Math.min(1, run.vigor + fd.vigorRegen * dt);
    if (run.stoke > 0) run.stoke = Math.max(0, run.stoke - fd.stokeDecay * dt);

    // Ease the land multiplier toward its sampled target — surge and
    // stall read as weather, never as a switch.
    const k = Math.min(1, fd.easeRate * dt);
    run.mult += (run.multTarget - run.mult) * k;

    const v = fs.speed * run.vigor * (1 + run.stoke) * run.mult;
    if (v > 0.01) {
      s.pos.x += run.dx * v * dt;
      s.pos.y += run.dy * v * dt;
      run.traveled += v * dt;
      run.sinceStamp += v * dt;
    }

    // Starvation gutters the section: the land ahead reads dead for long
    // enough and the front dies where it stands.
    if (fs.starve) {
      if (run.multTarget <= fs.starve.below) {
        run.starveT += dt;
        if (run.starveT >= fs.starve.after) { s.state = 'recede'; return true; }
      } else run.starveT = 0;
    }

    // Convert the ground behind the trailing rim, on the march odometer.
    const conv = fs.convert;
    if (conv && this.terrain) {
      const every = (conv.every ?? fd.stampEvery) * Math.max(20, s.cur);
      while (run.sinceStamp >= every) {
        run.sinceStamp -= every;
        if (run.stamps >= fd.stampMax) break;
        const rr = conv.r ?? fd.stampR;
        const r = Math.max(12, s.cur * (rr[0] + (rr[1] - rr[0]) * this.frontRoll(run)));
        const ax = s.pos.x - run.dx * s.cur * fd.stampTrail;
        const ay = s.pos.y - run.dy * s.cur * fd.stampTrail;
        // Decks stay dry: a yielding front never stamps its wake over or
        // ACROSS a live way — the same list the cover mask reads, tested
        // as a disc so a wide stamp can't slop onto the causeway.
        if (fs.yieldWays && this.wayIntersects(run, ax, ay, r)) continue;
        this.terrain.stamp(ax, ay, r, conv.ground, conv.shallow ?? false);
        run.stamps++;
      }
    }

    // Gone past the land entirely? Retire without recoil theater.
    const pad = s.bound * fd.exitPad;
    if (s.pos.x < -pad || s.pos.x > this.w + pad || s.pos.y < -pad || s.pos.y > this.h + pad) return false;
    return true;
  }

  /** The section's senses, on the sample cadence: refresh the near-way
   *  cache, read the ground ahead into the affinity target, and eat what
   *  the leading edge has reached. */
  private sampleFront(s: CreepSource, fs: FrontSpec, run: FrontRun): void {
    const fd = CREEP_CFG.front;
    const aff = fs.affinity;
    const wantsWays = fs.yieldWays || aff?.clearway !== undefined;

    if (wantsWays && this.ways.length) {
      run.nearWays.length = 0;
      const reach = s.bound + fd.wayPad;
      for (const w of this.ways) {
        const dx = w.x - s.pos.x, dy = w.y - s.pos.y;
        const rr = reach + w.r;
        if (dx * dx + dy * dy <= rr * rr) run.nearWays.push(w);
      }
    }

    // The land ahead: a small fan of samples off the leading rim. The
    // average carries the surge; a live way with a clearway multiplier
    // CAPS it (a 0 is a wall — the firebreak refuses the crossing).
    const fallback = aff?.default ?? 1;
    if (!aff || !this.terrain) {
      run.multTarget = fallback;
    } else {
      let sum = 0;
      let wayCap = Infinity;
      for (let i = 0; i < fd.samples; i++) {
        const f = fd.samples === 1 ? 0.75
          : fd.sampleAhead[0] + (fd.sampleAhead[1] - fd.sampleAhead[0]) * (i / (fd.samples - 1));
        const lat = (i - (fd.samples - 1) / 2) * fd.sampleSpread * 1.2;
        const x = s.pos.x + run.dx * s.cur * f - run.dy * s.cur * lat;
        const y = s.pos.y + run.dy * s.cur * f + run.dx * s.cur * lat;
        if (aff.clearway !== undefined && this.wayMasked(run, x, y)) {
          wayCap = Math.min(wayCap, aff.clearway);
          sum += aff.clearway;
          continue;
        }
        const g = this.terrain.groundKindAt(x, y);
        sum += g === null ? fallback : (aff.ground?.[g] ?? fallback);
      }
      run.multTarget = Math.min(sum / fd.samples, wayCap);
    }

    // Eat the fuel the leading edge has reached: swap or fell each piece,
    // stoke the section, let the world roll any kin.
    if (fs.consume?.length && this.terrain) {
      let budget = fd.consumeBudget;
      const hx = s.pos.x + run.dx * s.cur * fd.consumeAhead;
      const hy = s.pos.y + run.dy * s.cur * fd.consumeAhead;
      this.terrain.eachFuelNear(hx, hy, s.cur * fd.consumeReach, (fuel, ref) => {
        if (budget <= 0) return;
        const row = fs.consume!.find(c => c.fuel === fuel);
        if (!row) return;
        budget--;
        this.terrain!.consume(ref, row, run.bearing);
        if (row.feed) run.stoke = Math.min(fd.stokeMax, run.stoke + row.feed);
      });
    }
  }

  /** The bodily carriage, every tick: covered bodies ride the undertow and
   *  drain breath. Filters mirror dressOccupants; the drag's own faction
   *  waiver keeps a front's kin swimming free. */
  private carryOccupants(actors: readonly CreepActorLike[], dt: number): void {
    for (const s of this.sources) {
      const fs = s.def.front;
      const run = s.front;
      if (!run || !fs || (!fs.drag && !fs.drown) || s.cur < CREEP_CFG.minReach) continue;
      const floor = s.def.hitFloor ?? CREEP_CFG.hitFloor;
      for (const a of actors) {
        if (a.dead || a.untargetable || a.construct || a.flying) continue;
        if (this.sourceCover(s, a.pos.x, a.pos.y, a.radius * 0.5) < floor) continue;
        if (fs.drag && !(fs.drag.notFactions && a.faction && fs.drag.notFactions.includes(a.faction))) {
          this.terrain!.drag(a, run.dx * fs.drag.accel * dt, run.dy * fs.drag.accel * dt);
        }
        if (fs.drown) this.terrain!.drown(a, fs.drown.drain, dt);
      }
    }
  }

  private dressOccupants(actors: readonly CreepActorLike[]): void {
    if (!this.sources.length) return;
    for (const a of actors) {
      if (a.dead || a.untargetable || a.construct || a.flying) continue;
      for (const s of this.sources) {
        const grants = s.def.grants;
        if (!grants?.length) continue;
        const floor = s.def.hitFloor ?? CREEP_CFG.hitFloor;
        if (this.sourceCover(s, a.pos.x, a.pos.y, a.radius * 0.5) < floor) continue;
        for (const g of grants) {
          if (g.teams && !g.teams.includes(a.team)) continue;
          if (g.factions && (!a.faction || !g.factions.includes(a.faction))) continue;
          if (g.notFactions && a.faction && g.notFactions.includes(a.faction)) continue;
          a.applyStatus(g.status, 0, 1, CREEP_CFG.sourceLabel);
        }
      }
    }
  }
}

/** Build a zone's ambient field from its theme spec: pockets born full at
 *  best-candidate-spread anchors (each new pocket favors the try farthest
 *  from every placed one — coverage without clumping). Returns null when
 *  the zone grows nothing ambiently; runtime seams use World.creepEnsure. */
export function buildZoneCreep(
  spec: ZoneCreepSpec | undefined,
  arena: { w: number; h: number; boundless?: boolean },
  rng: CreepRng,
): CreepField | null {
  if (!spec || (!spec.kinds.length && !spec.fronts?.length)) return null;
  if (arena.boundless) return null; // streamed arenas have no stable bounds to skin
  const field = new CreepField(rng, arena.w, arena.h);
  const n = rng.int(spec.pockets[0], spec.pockets[1]);
  let total = 0;
  for (const k of spec.kinds) total += k.weight ?? 1;
  const placed: { x: number; y: number }[] = [];
  for (let i = 0; i < n; i++) {
    let roll = rng.range(0, total);
    let pick = spec.kinds[spec.kinds.length - 1];
    for (const k of spec.kinds) {
      roll -= k.weight ?? 1;
      if (roll <= 0) { pick = k; break; }
    }
    const def = CREEPS[pick.id];
    if (!def) continue;
    const reach = rng.range(...(def.reach ?? CREEP_CFG.def.reach));
    const inset = Math.min(reach + 60, Math.min(arena.w, arena.h) * 0.3);
    let best: { x: number; y: number } | null = null;
    let bestScore = -1;
    for (let t = 0; t < CREEP_CFG.anchorTries; t++) {
      const p = { x: rng.range(inset, arena.w - inset), y: rng.range(inset, arena.h - inset) };
      let score = rng.next() * 80;
      let nearest = Infinity;
      for (const q of placed) {
        const dd = Math.hypot(q.x - p.x, q.y - p.y);
        if (dd < nearest) nearest = dd;
      }
      if (nearest < Infinity) score += Math.min(nearest, 1400);
      else score += 1400;
      if (score > bestScore) { bestScore = score; best = p; }
    }
    if (!best) continue;
    placed.push(best);
    field.addSource(def, best.x, best.y, { bornFrac: 1, ambient: true });
  }
  // Ambient front lanes install AFTER the pocket rolls — the pocket stream
  // is untouched by a theme growing fronts beside its pockets.
  if (spec.fronts?.length) field.installLanes(spec.fronts);
  return (field.sources.length || spec.fronts?.length) ? field : null;
}
