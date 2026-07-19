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
  /** This kind never fields in an AQUATIC arena (ZoneDef.aquatic — the
   *  whole-floor seabed): a water wave inside the sea is water within
   *  water. buildZoneCreep skips the kind's pockets AND its lanes there —
   *  structural, so a blended or cross-seeded spec can never smuggle one
   *  under the sea. Runtime addSource/addFront stay open (a package that
   *  wants one owns the call). */
  notAquatic?: true;
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
  /** Across-bearing rim multiplier — the crest STRETCHED perpendicular to
   *  its march (1 = round; 2.6 = a wide wall of water, the artery's pulse
   *  filling its gallery). ONE anisotropy folded into THE rim function
   *  (rimMulOf), so the hit test, the render bake, the edge telegraph and
   *  the wave-line spacing all read the same ellipse — drawn == tested at
   *  every angle. 1 (or absent) is bit-exact identity. */
  stretch?: number;
  affinity?: FrontAffinity;
  /** Sustained starvation gutters the section: advance multiplier at or
   *  below `below` for `after` seconds → the source recedes and dies. */
  starve?: { below: number; after: number };
  consume?: readonly FrontConsumeRow[];
  /** Ground stamped behind the trailing rim as the front passes — the
   *  scorch behind the blaze, the wet wake behind the crest. `shallow`
   *  marks stamped liquid wadeable (the ford contract, never a new deep).
   *  `every` is the stamp cadence as a fraction of the band radius.
   *  `fade` is THE EVAPORATING WAKE: each stamped pool dwells [lo, hi]
   *  seconds (rolled per pool on the section's private stream), then
   *  CONTRACTS at `rate` units/sec until gone — the wave passes, its
   *  pools shrink like drying puddles, and the zone reverts to what it
   *  was (the world-side Doodad.evap fabric; quantized steps keep the
   *  ground baker's stale trickle bounded). */
  convert?: {
    ground: string; shallow?: boolean; every?: number; r?: [number, number];
    fade?: { after: [number, number]; rate?: number };
  };
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
  /** THE VESSEL FLOW — the section STEERS: whisker probes read the open
   *  ground ahead (CreepTerrain.openAt — the walk grid's truth) and the
   *  bearing bends toward the deepest channel, so the bolus follows a
   *  winding gallery like a current following its bank, deflects hard off
   *  walls it strikes, and REBOUNDS out of dead ends. Rows without flow
   *  march their fixed bearing exactly as before. */
  flow?: FrontFlowSpec;
  /** THE FINITE RUN: the section rolls `range` (units, on its private
   *  stream) at birth and DISPERSES — recede where it stands — when its
   *  odometer passes it; `taper` eases the last fraction of the run down
   *  toward CREEP_CFG.front.travelTaperFloor first, so the surge visibly
   *  loses pressure before it lets go. The pumped bolus's whole life:
   *  born, rushes, spends itself, gone. */
  travel?: { range: [number, number]; taper?: number };
  /** THE SWELL: the bolus ELONGATES along its march as it travels —
   *  `1 → max` over `per` units, eased. Rides the affine anisotropy (see
   *  anisoMode): the drawn skin, the hit test, the crest seats and the
   *  edge telegraph all stretch through ONE transform. Composes with
   *  `stretch` (across) — a slug that fills the tube and keeps growing
   *  longer as the pump feeds it. */
  swell?: { max: number; per: number };
  /** CREST RIDERS — kin seated ON the marching rim (the artery's white
   *  cells surfing their own weather). Seats roll on the section's
   *  private stream at birth; the WORLD mounts real monsters onto them
   *  (World.updateCreepRiders — capped per visit like consume kin) and
   *  slaves each body to crestPoint every tick (drawn == seated). A rider
   *  keeps its whole kit — it stabs what the surge carries past — and
   *  dismounts when the section disperses, when hard-CC'd or grabbed, or
   *  when a shove past CREEP_CFG.front.rider.dismountPush throws it off. */
  riders?: readonly FrontRiderRow[];
}

/** The vessel-flow steering levers (FrontSpec.flow). */
export interface FrontFlowSpec {
  /** Steering rate cap, radians/sec — how sharply the current can bend.
   *  Urgency (a closing wall) and `bounce` scale it up, never past the
   *  rebound burst. */
  steer: number;
  /** Rebound sharpness 0..1: how much of a hard wall contact turns into a
   *  crisp angular deflection instead of a smooth swerve (and how hard a
   *  dead-end rebound whips around). Default CREEP_CFG.front.flow.bounce. */
  bounce?: number;
  /** Lookahead multiplier over the live nose reach (cur × elong).
   *  Default CREEP_CFG.front.flow.probeFrac. */
  probe?: number;
  /** Side-whisker spread, radians. Default CREEP_CFG.front.flow.whiskerAng. */
  whisker?: number;
  /** VESSEL CONFINEMENT: cover (grants, drag, drown — the whole gameplay
   *  surface) additionally requires an OPEN LINE from the section heart to
   *  the point (openAt ray-march), so the current can never reach through
   *  a wall into the corridor next door. A gameplay honesty mask like
   *  hitFloor — the drawn splash may still lap the stone. */
  confine?: boolean;
  /** THE CHANNEL: the current follows its own GROUND, not the walls — a
   *  probe point counts as 'open' only where groundKindAt names one of
   *  these kinds. Steering, confinement and spawn snap-in all read it, so
   *  a river's current holds to its water between fully OPEN banks (the
   *  River of Souls), a melt-flow can hold to its lava, a stampede to its
   *  road. Absent = openAt (the wall-following bore, byte-identical). */
  channel?: string[];
}

/** One crest-rider row (FrontSpec.riders). */
export interface FrontRiderRow {
  monster: string;
  /** Riders per section, rolled on the private stream. Default [1, 1]. */
  count?: [number, number];
  /** Chance this row mounts at all, per section. Default 1. */
  chance?: number;
  /** Seat spread about the nose, radians (body frame).
   *  Default CREEP_CFG.front.rider.seatArc. */
  arc?: number;
}

/** One ambient front lane on a zone's creep spec: which kind marches, how
 *  many band sources per wave, where it points, and whether it returns.
 *  This row (or a runtime addFront) is the seam a future escape-chase
 *  event binds — front + the existing 'escape' objective; nothing here
 *  builds that event. */
export interface FrontSpawnRow {
  id: string;
  /** Band sources per wave (a picket line abreast; default [3, 4]) — or
   *  'span': THE TIDAL WALL, the line computed to cross the zone's whole
   *  breadth at `spacing`. A spanning wave ALWAYS leaves at least one
   *  clear corridor (`gap` merely tunes it) — the safe weave-lane is a
   *  structural guarantee, never an authoring courtesy. */
  line?: [number, number] | 'span';
  /** Section spacing along the line, × the section band (mean reach ×
   *  stretch). Default CREEP_CFG.front.lineSpacing. Tighter = a denser
   *  wall; the validator floors it at 0.4 (triple-stacking). */
  spacing?: number;
  /** Per-lane section reach roll — the SAME kind fields small recurring
   *  washes on one row and a towering crest on another, no twin CreepDef. */
  reach?: [number, number];
  /** The spanning wave's clear corridors: `width` = the guaranteed
   *  rim-free lane (world units — flanking sections hold their whole lobe
   *  ceiling clear of it; default CREEP_CFG.front.gapWidth), `count` = how
   *  many corridors roll (default exactly 1). */
  gap?: { width?: number; count?: [number, number] };
  /** Per-lane bearing jitter override (radians). Spanning lanes default 0
   *  — parallel march is what keeps the corridor open the whole crossing;
   *  picket lanes keep CREEP_CFG.front.bearingJitter's grown look. */
  jitter?: number;
  /** Chance this lane exists AT ALL this visit (rolled once on the salted
   *  field stream) — the intra-zone-event dial: 1/absent = fixture,
   *  0.35 = the rare day the sea decides. */
  chance?: number;
  /** One floating line on every seat when a wave of this lane actually
   *  fields (the wildlife arrival-line idiom) — 'the sea rises!'. */
  announce?: { text: string; color?: string };
  /** March bearing in radians; absent/'roll' = rolled per wave;
   *  'cardinal' = one of the four compass bearings per wave (spanning
   *  waves read cleanest wall-to-wall on a cardinal). */
  bearing?: number | 'roll' | 'cardinal';
  /** Seconds before the first wave. Default [6, 14]. */
  delay?: [number, number];
  /** After a wave dies or leaves, the next arrives in [lo, hi] seconds.
   *  Absent = one wave per visit. */
  waves?: [number, number];
  /** RADIANCE GATE (world/radiance.ts): the lane fields waves only while
   *  this condition holds over the zone — comet lanes that fly by night
   *  ({ radiance: { to: 0.3 } }), flood lanes that ride the storm
   *  ({ weather: ['storm'] }). A pending wave whose sky says no simply
   *  WAITS at the door (re-asked every tick); live sections already
   *  marching finish their crossing — dawn does not delete a comet
   *  mid-flight, it just sends no more. Typed structurally (FrontCond)
   *  so this leaf keeps its zero-import doctrine; world/radiance's
   *  RadianceCond satisfies it. */
  when?: FrontCond;
}

/** The structural twin of world/radiance's RadianceCond — the leaf's own
 *  view of a sky condition (it never evaluates one; the terrain window's
 *  condHeld does). */
export interface FrontCond {
  radiance?: { from?: number; to?: number };
  weather?: string[];
  phases?: string[];
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
  /** Stamp converted ground behind the trailing rim. `fade` asks the world
   *  to EVAPORATE the stamp: dwell `after` seconds, then contract at
   *  `rate` units/sec until gone (the Doodad.evap fabric). */
  stamp(x: number, y: number, r: number, ground: string, shallow: boolean,
    fade?: { after: number; rate: number }): void;
  /** Displace one covered body (mover contract; world applies the spares). */
  drag(a: CreepActorLike, dx: number, dy: number): void;
  /** Drain a covered player's breath (survival fabric; world gates seats). */
  drown(a: CreepActorLike, drain: number, dt: number): void;
  /** Does a sky condition hold over this zone right now? (World.radiance-
   *  CondHeld — the lane gate's window. Absent = every lane unconditional,
   *  so bare harnesses keep their content.) */
  condHeld?(cond: FrontCond): boolean;
  /** Is this point open ground a current can occupy? (The walk grid's
   *  truth, arena bounds included — World adapts isWalkable.) Absent =
   *  flow rows march straight and confine masks nothing: a bare harness
   *  keeps every legacy behavior. */
  openAt?(x: number, y: number): boolean;
  /** One floating arrival line on every seat (FrontSpawnRow.announce —
   *  the wildlife arrival-line idiom). Absent = silent waves everywhere. */
  announce?(text: string, color?: string): void;
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
  themeSpecs: readonly { owner: string; spec: ZoneCreepSpec; aquatic?: boolean }[],
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
    if (fs.stretch !== undefined && !(fs.stretch >= 0.5 && fs.stretch <= 4)) {
      bad.push(`creep '${id}': front.stretch wants [0.5, 4] — a wall, not a hairline`);
    }
    const fade = fs.convert?.fade;
    if (fade) {
      if (!(fade.after[0] >= 0 && fade.after[1] >= fade.after[0])) {
        bad.push(`creep '${id}': convert.fade.after wants 0 <= lo <= hi`);
      }
      if (fade.rate !== undefined && !(fade.rate > 0)) {
        bad.push(`creep '${id}': convert.fade.rate must be > 0`);
      }
    }
    if (fs.flow) {
      if (!fin(fs.flow.steer) || !(fs.flow.steer > 0 && fs.flow.steer <= 10)) {
        bad.push(`creep '${id}': flow.steer wants (0, 10] rad/sec`);
      }
      if (fs.flow.bounce !== undefined && !(fs.flow.bounce >= 0 && fs.flow.bounce <= 1)) {
        bad.push(`creep '${id}': flow.bounce wants [0, 1]`);
      }
      if (fs.flow.probe !== undefined && !(fs.flow.probe > 0 && fs.flow.probe <= 4)) {
        bad.push(`creep '${id}': flow.probe wants (0, 4]`);
      }
      if (fs.flow.whisker !== undefined && !(fs.flow.whisker > 0.1 && fs.flow.whisker <= 1.2)) {
        bad.push(`creep '${id}': flow.whisker wants (0.1, 1.2] rad`);
      }
    }
    if (fs.travel) {
      if (!(fs.travel.range[0] > 0 && fs.travel.range[1] >= fs.travel.range[0])) {
        bad.push(`creep '${id}': travel.range wants 0 < lo <= hi`);
      }
      if (fs.travel.taper !== undefined && !(fs.travel.taper > 0 && fs.travel.taper <= 0.9)) {
        bad.push(`creep '${id}': travel.taper wants (0, 0.9]`);
      }
    }
    if (fs.swell) {
      if (!(fs.swell.max >= 1 && fs.swell.max <= 4)) {
        bad.push(`creep '${id}': swell.max wants [1, 4] — a slug, not a serpent`);
      }
      if (!(fs.swell.per > 0)) bad.push(`creep '${id}': swell.per must be > 0`);
    }
    for (const r of fs.riders ?? []) {
      if (!r.monster) bad.push(`creep '${id}': rider row with empty monster`);
      else if (lookups && !lookups.hasMonster(r.monster)) {
        bad.push(`creep '${id}': rider names unknown monster '${r.monster}'`);
      }
      if (r.count && !(r.count[0] >= 1 && r.count[1] >= r.count[0])) {
        bad.push(`creep '${id}': rider count wants 1 <= lo <= hi`);
      }
      if (r.chance !== undefined && !(r.chance > 0 && r.chance <= 1)) {
        bad.push(`creep '${id}': rider chance wants (0, 1]`);
      }
      if (r.arc !== undefined && !(r.arc > 0 && r.arc <= 1.4)) {
        bad.push(`creep '${id}': rider arc wants (0, 1.4] rad`);
      }
    }
    // The engine stamps the mount marker on every seated rider — a rider
    // row without the status registered would wear an unknown id.
    if (fs.riders?.length && !hasStatus(CREEP_CFG.front.rider.mountStatus)) {
      bad.push(`creep '${id}': riders need status '${CREEP_CFG.front.rider.mountStatus}' registered`);
    }
  }
  for (const { owner, spec, aquatic } of themeSpecs) {
    for (const k of spec.kinds) {
      if (!CREEPS[k.id]) bad.push(`${owner}: creep spec names unregistered kind '${k.id}'`);
    }
    if (!spec.kinds.length && spec.pockets[1] > 0) bad.push(`${owner}: creep spec rolls pockets but lists no kinds`);
    for (const f of spec.fronts ?? []) {
      const def = CREEPS[f.id];
      if (!def) { bad.push(`${owner}: front lane names unregistered kind '${f.id}'`); continue; }
      if (!def.front) bad.push(`${owner}: front lane '${f.id}' — that row carries no front levers`);
      if (Array.isArray(f.line) && !(f.line[0] >= 1 && f.line[1] >= f.line[0])) bad.push(`${owner}: front lane '${f.id}' line wants 1 <= lo <= hi`);
      for (const [name, band] of [['delay', f.delay], ['waves', f.waves]] as const) {
        if (band && !(band[0] >= 0 && band[1] >= band[0])) bad.push(`${owner}: front lane '${f.id}' ${name} wants 0 <= lo <= hi`);
      }
      if (typeof f.bearing === 'number' && !fin(f.bearing)) bad.push(`${owner}: front lane '${f.id}' bearing must be finite`);
      if (f.spacing !== undefined && !(f.spacing >= 0.4)) {
        bad.push(`${owner}: front lane '${f.id}' spacing < 0.4 — sections triple-stack`);
      }
      if (f.reach && !(f.reach[0] > 0 && f.reach[1] >= f.reach[0])) {
        bad.push(`${owner}: front lane '${f.id}' reach wants 0 < lo <= hi`);
      }
      if (f.gap) {
        if (f.line !== 'span') bad.push(`${owner}: front lane '${f.id}' gap without line 'span' — picket lines are already sparse`);
        if (f.gap.width !== undefined && !(f.gap.width >= 90)) {
          bad.push(`${owner}: front lane '${f.id}' gap.width < 90 — no honest weave lane`);
        }
        if (f.gap.count && !(f.gap.count[0] >= 1 && f.gap.count[1] >= f.gap.count[0])) {
          bad.push(`${owner}: front lane '${f.id}' gap.count wants 1 <= lo <= hi`);
        }
      }
      if (f.jitter !== undefined && !(f.jitter >= 0 && f.jitter <= 0.5)) {
        bad.push(`${owner}: front lane '${f.id}' jitter wants [0, 0.5]`);
      }
      if (f.chance !== undefined && !(f.chance > 0 && f.chance <= 1)) {
        bad.push(`${owner}: front lane '${f.id}' chance wants (0, 1]`);
      }
      if (f.announce && !f.announce.text) {
        bad.push(`${owner}: front lane '${f.id}' announce with empty text`);
      }
    }
    // Aquatic owners growing sea-forsworn kinds: the build refuses them
    // structurally — warn so authored specs never carry dead rows.
    if (aquatic) {
      for (const k of spec.kinds) {
        if (CREEPS[k.id]?.notAquatic) bad.push(`${owner}: aquatic arena grows notAquatic creep '${k.id}' (dead row — the build skips it)`);
      }
      for (const f of spec.fronts ?? []) {
        if (CREEPS[f.id]?.notAquatic) bad.push(`${owner}: aquatic arena fields notAquatic front '${f.id}' (dead row — the build skips it)`);
      }
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
    /** THE EVAPORATING WAKE's default contraction pace (units/sec) when a
     *  convert.fade row names none. */
    fadeRate: 7,
    /** THE VESSEL FLOW's shared steering grammar (per-row dials ride
     *  FrontFlowSpec; these are the fabric's own senses and paces). */
    flow: {
      /** Side-whisker spread (radians) — five whiskers at 0, ±1×, ±2×. */
      whiskerAng: 0.5,
      /** openAt march samples per whisker (depth resolution). */
      steps: 4,
      /** Lookahead × the live nose reach (cur × elong)… */
      probeFrac: 1.15,
      /** …never shorter than this (units) — slow slugs still see walls. */
      probeMin: 90,
      /** Score penalty per radian off-center — straight is preferred until
       *  the channel says otherwise (kills open-field oscillation). */
      anglePenalty: 0.35,
      /** Turn-rate boost factor as the center whisker closes (× (1−depth)). */
      urgency: 2.2,
      /** All whiskers at or under this depth = a DEAD END: rebound. */
      deadEndFrac: 0.3,
      /** Rebound turn-rate burst at bounce 1 (scales with the row's dial). */
      bounceBoost: 3.2,
      /** Rebound bearing jitter (radians, rolled once per rebound on the
       *  section's private stream — the slosh never retraces exactly). */
      reboundJitter: 0.35,
      /** Default rebound sharpness when the row names none. */
      bounce: 0.35,
      /** Spawn snap-in: a flow section born on closed ground (the zone rim
       *  is wall in a carved map) marches along its bearing to the first
       *  open point, at most this fraction of the arena's short side. */
      snapMaxFrac: 0.5,
      /** Confine ray-march sample spacing (units) — the vessel wall test. */
      confineStep: 26,
    },
    /** CREST RIDERS' shared grammar (per-row dials ride FrontRiderRow). */
    rider: {
      /** Riders mounted across ONE zone visit (world-side ledger — the
       *  consume-kin cap's sibling; waves past it surge riderless). */
      max: 8,
      /** Seat radius as a fraction of the live rim — on the lip, inside
       *  the welt. */
      seatFrac: 0.86,
      /** Default seat spread about the nose (radians, body frame). */
      seatArc: 0.55,
      /** A live shove at or past this speed throws the rider off its
       *  seat (counterplay: knock the surfer from its wave). */
      dismountPush: 240,
      /** The marker status every seated rider wears (re-stamped each
       *  tick; cleanse-harmless — the readable hook, never the mechanism). */
      mountStatus: 'crestborne',
    },
    /** travel.taper's floor: the surge never quite stalls before it
     *  disperses — pressure dying, not brakes. */
    travelTaperFloor: 0.22,
    /** Spanning waves (line 'span'): the guaranteed clear corridor's
     *  default width (world units of truly rim-free lane), how far in
     *  from the flanks a corridor may roll (fraction of the crossing —
     *  a gap pressed against the boundary is no lane at all), and the
     *  harmonic-amplitude ceiling fraction the gap math holds sections
     *  clear by (Σa ≤ lobing × this, from addSource's descending rolls). */
    gapWidth: 150,
    gapMargin: 0.16,
    lobeCeil: 0.71,
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

/** The across-bearing stretch at a relative angle: the exact polar radius
 *  of an ellipse with semi-axis 1 along the bearing and `stretch` across
 *  it (r(θ) = s/√(s²cos²θ + sin²θ)). 1 is bit-exact identity — a round
 *  row pays one compare. */
export function creepStretchMul(stretch: number, angRel: number): number {
  if (stretch === 1) return 1;
  const c = Math.cos(angRel), s = Math.sin(angRel);
  return stretch / Math.sqrt(stretch * stretch * c * c + s * s);
}

/** THE TWO ANISOTROPY MODES. 'polar' is the classic product — harmonics ×
 *  the stretch ellipse, world-anchored, exact for a FIXED bearing (the
 *  tidal wall). A row wearing `flow` or `swell` is 'affine': its shape
 *  lives in a BODY frame (harmonics canonical, nose along +X) and the
 *  world sees it through one transform — rotate(bearing) ∘ scale(elong,
 *  stretch) — so a STEERING bearing rotates the whole skin and a growing
 *  elong stretches it live, while the hit test runs the exact inverse
 *  (sourceCover) and the seats/telegraph ride crestPoint. Drawn == tested
 *  in both modes; they simply keep the truth in different frames. */
export function anisoMode(src: CreepSource): 'polar' | 'affine' {
  const fs = src.def.front;
  if (!src.front || !fs) return 'polar';
  return (fs.flow || fs.swell) ? 'affine' : 'polar';
}

/** THE CREST RESOLVER — a body-frame angle (0 = the nose) and a rim
 *  fraction → one world point, through whichever anisotropy the source
 *  wears. Rider seats, the affine edge telegraph and every probe read
 *  THIS function, so a seated body, the drawn arc and a test can never
 *  disagree about where the crest is. */
export function crestPoint(src: CreepSource, bodyAng: number, frac: number): { x: number; y: number } {
  const run = src.front;
  const r = src.cur * creepRimMul(src.harm, bodyAng) * frac;
  if (!run) {
    return { x: src.pos.x + Math.cos(bodyAng) * r, y: src.pos.y + Math.sin(bodyAng) * r };
  }
  if (anisoMode(src) === 'affine') {
    const st = Math.max(0.5, src.def.front?.stretch ?? 1);
    const qx = Math.cos(bodyAng) * r * run.elong;
    const qy = Math.sin(bodyAng) * r * st;
    const c = Math.cos(run.bearing), s = Math.sin(run.bearing);
    return { x: src.pos.x + qx * c - qy * s, y: src.pos.y + qx * s + qy * c };
  }
  const wAng = run.bearing + bodyAng;
  const rw = src.cur * rimMulOf(src, wAng) * frac;
  return { x: src.pos.x + Math.cos(wAng) * rw, y: src.pos.y + Math.sin(wAng) * rw };
}

/** THE one live rim modulation for a source: harmonics × the front's
 *  across-bearing stretch. The hit test, the render bake, the edge
 *  telegraph and the wave-line spacing all multiply the live front by
 *  THIS product — drawn and tested share one shape truth at every angle.
 *  Only a marching source can be stretched (the ellipse needs a bearing);
 *  every round source folds to creepRimMul exactly. An AFFINE source
 *  (anisoMode) returns its harmonics alone — the CANONICAL shape; its
 *  ellipse lives in the transform (the bake traces this and the blit
 *  wears the scale, so the render path needs no second truth). */
export function rimMulOf(src: CreepSource, ang: number): number {
  const m = creepRimMul(src.harm, ang);
  const st = src.def.front?.stretch;
  if (st === undefined || st === 1 || !src.front) {
    // A swelling row may be stretch-less: still affine (elong lives in the
    // transform), still canonical here — same harmonics-only answer.
    return m;
  }
  if (anisoMode(src) === 'affine') return m;
  return m * creepStretchMul(st, ang - src.front.bearing);
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
  /** THE SWELL's live along-axis multiplier (1 = round; grows toward
   *  swell.max over the march). Read by the affine anisotropy everywhere. */
  elong: number;
  /** THE FINITE RUN's rolled range (Infinity when the row has none). */
  rangeMax: number;
  /** A live rebound's rolled target bearing (dead-end flow steering) —
   *  cleared the moment the way ahead opens. */
  rebound?: number;
  /** Rider seats rolled at birth (body-frame angles; null = no riders).
   *  The WORLD consumes this plan exactly once (ridersMounted). */
  riderPlan: { monster: string; ang: number }[] | null;
  ridersMounted: boolean;
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

  /** Live lane count — chance rolls may have thinned the authored rows
   *  (buildZoneCreep asks before keeping an otherwise-empty field). */
  laneCount(): number {
    return this.lanes.length;
  }

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

  /** Seed the ambient front lanes from a theme spec (buildZoneCreep). A
   *  lane wearing `chance` exists-or-not per VISIT — the intra-zone-event
   *  roll, drawn only when authored so chance-less specs keep their exact
   *  stream. */
  installLanes(rows: readonly FrontSpawnRow[]): void {
    const fd = CREEP_CFG.front;
    this.lanes = [];
    for (const row of rows) {
      if (row.chance !== undefined && this.rng.next() >= row.chance) continue;
      this.lanes.push({
        row, idx: this.lanes.length, live: 0, pending: true,
        timer: this.rng.range(...(row.delay ?? fd.delay)),
      });
    }
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
      elong: 1,
      rangeMax: Infinity,
      riderPlan: null,
      ridersMounted: false,
    };
    const fs = src.def.front;
    const run = src.front;
    // NEW-LEVER ROLLS, in a FIXED order (travel, then riders) and each
    // gated on its lever — a legacy row draws nothing here and its private
    // stream stays byte-identical. Future levers APPEND, never reorder.
    if (fs?.travel) {
      run.rangeMax = fs.travel.range[0]
        + (fs.travel.range[1] - fs.travel.range[0]) * this.frontRoll(run);
    }
    if (fs?.riders?.length) {
      const rd = CREEP_CFG.front.rider;
      const plan: { monster: string; ang: number }[] = [];
      for (const row of fs.riders) {
        if (row.chance !== undefined && this.frontRoll(run) >= row.chance) continue;
        const [lo, hi] = row.count ?? [1, 1];
        const n = lo + (hi > lo ? Math.min(hi - lo, Math.floor(this.frontRoll(run) * (hi - lo + 1))) : 0);
        const arc = row.arc ?? rd.seatArc;
        for (let i = 0; i < n; i++) {
          // One rider sits near the nose; a crew spreads across the face.
          const ang = n === 1
            ? (this.frontRoll(run) - 0.5) * arc
            : -arc + (2 * arc) * (i / (n - 1)) + (this.frontRoll(run) - 0.5) * arc * 0.3;
          plan.push({ monster: row.monster, ang });
        }
      }
      if (plan.length) run.riderPlan = plan;
    }
    // SPAWN SNAP-IN (flow rows): a section born on closed ground — the zone
    // rim is solid wall in a carved map — marches along its bearing to the
    // first open point, so the bolus starts INSIDE the vessel it will
    // follow. Deterministic (no rolls); without openAt nothing moves.
    if (fs?.flow) {
      const open = this.flowOpen(src);
      if (open && !open(src.pos.x, src.pos.y)) {
        const step = Math.max(24, src.cur * 0.5);
        const maxD = Math.min(this.w, this.h) * CREEP_CFG.front.flow.snapMaxFrac;
        for (let d = step; d <= maxD; d += step) {
          const x = src.pos.x + run.dx * d, y = src.pos.y + run.dy * d;
          if (x < 8 || y < 8 || x > this.w - 8 || y > this.h - 8) continue;
          if (open(x, y)) { src.pos.x = x; src.pos.y = y; break; }
        }
      }
    }
    if (fs?.quench || fs?.feed) this.quenchable = true;
    // The bound learned at addSource predates the run state — refresh so a
    // stretched crest widens its broad phase (round fronts recompute the
    // identical value).
    this.refreshBound(src);
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
   *  the boundary the bearing points away from, swelling as they come — or
   *  a 'span' wall crossing the zone's whole breadth, always parted by at
   *  least one clear corridor (the safe weave-lane is structural). */
  private spawnWave(lane: FrontLane): void {
    const def = CREEPS[lane.row.id];
    if (!def?.front) return;
    const fd = CREEP_CFG.front;
    const row = lane.row;
    const bearing = (row.bearing === undefined || row.bearing === 'roll')
      ? this.rng.range(0, Math.PI * 2)
      : row.bearing === 'cardinal'
        ? [0, Math.PI / 2, Math.PI, -Math.PI / 2][this.rng.int(0, 3)]
        : row.bearing;
    const dx = Math.cos(bearing), dy = Math.sin(bearing);
    // Walk BACK along the bearing from the zone heart to the rim — the
    // wave breaks in from the land's edge and crosses the whole ground.
    const cx = this.w / 2, cy = this.h / 2;
    const d = CREEP_CFG.def;
    const reachBand = row.reach ?? def.reach ?? d.reach;
    const band = (reachBand[0] + reachBand[1]) / 2;
    const m = Math.min(band * 0.6, Math.min(this.w, this.h) * 0.2);
    let t = Infinity;
    if (dx > 1e-6) t = Math.min(t, (cx - m) / dx);
    if (dx < -1e-6) t = Math.min(t, (cx - this.w + m) / dx);
    if (dy > 1e-6) t = Math.min(t, (cy - m) / dy);
    if (dy < -1e-6) t = Math.min(t, (cy - this.h + m) / dy);
    if (!Number.isFinite(t)) return;
    const ox = cx - dx * t, oy = cy - dy * t;
    const px = -dy, py = dx;
    // Offsets along the perpendicular. The multiplier chain stays in the
    // classic left-to-right order so a lane without new fields lands its
    // sections on byte-identical ground (× 1 is exact).
    const sMul = row.spacing ?? fd.lineSpacing;
    const stMul = Math.max(1, def.front.stretch ?? 1);
    let plan: { off: number; reach?: number }[];
    if (row.line === 'span') {
      // THE TIDAL WALL: fill the crossing at spacing, middle-out (the
      // saturation cap then trims FLANKS, never one whole side), and part
      // it with rolled corridors no section's rim ceiling may crowd —
      // clear width is a promise about RIMS, not about spawn points, so
      // each section's reach rolls FIRST and its own lobe+stretch ceiling
      // holds it clear. Crowding sections are NUDGED to the corridor's
      // shoulder rather than dropped — the wall stays solid on both
      // flanks (dropping them gutted small zones to a single crest);
      // floor() keeps the outermost offsets inside the crossing.
      const extent = Math.abs(dy) * this.w + Math.abs(dx) * this.h;
      const step = band * sMul * stMul;
      const n = Math.max(1, Math.floor(extent / step) + 1);
      plan = [];
      for (let i = 0; i < n; i++) plan.push({ off: (i - (n - 1) / 2) * step });
      plan.sort((a, b) => Math.abs(a.off) - Math.abs(b.off));
      const rb = row.reach ?? reachBand;
      for (const p of plan) p.reach = this.rng.range(rb[0], rb[1]);
      const lobing = def.lobing ?? d.lobing;
      const width = row.gap?.width ?? fd.gapWidth;
      const nGaps = row.gap?.count ? this.rng.int(...row.gap.count) : 1;
      const g0 = -extent / 2 + extent * fd.gapMargin;
      const g1 = extent / 2 - extent * fd.gapMargin;
      const gaps: number[] = [];
      for (let g = 0; g < nGaps; g++) gaps.push(this.rng.range(g0, g1));
      for (let pass = 0; pass < 2; pass++) {
        for (const p of plan) {
          const thr = width / 2 + p.reach! * (1 + lobing * fd.lobeCeil) * stMul;
          for (const gp of gaps) {
            const rel = p.off - gp;
            if (Math.abs(rel) < thr) p.off = gp + (rel >= 0 ? thr : -thr);
          }
        }
      }
      // Belt and suspenders: a section two corridors ping-ponged between
      // (multi-gap rows only) is dropped, and nudges past the crossing's
      // ends fall off the land.
      plan = plan.filter(p => {
        const thr = width / 2 + p.reach! * (1 + lobing * fd.lobeCeil) * stMul;
        return Math.abs(p.off) <= extent / 2
          && gaps.every(gp => Math.abs(p.off - gp) >= thr - 0.01);
      });
    } else {
      const n = this.rng.int(...(row.line ?? fd.line));
      plan = [];
      for (let i = 0; i < n; i++) plan.push({ off: (i - (n - 1) / 2) * band * sMul * stMul });
    }
    // A spanning line may not jitter its bearings apart — parallel march
    // is what keeps the corridor open across the whole crossing.
    const jitter = row.jitter ?? (row.line === 'span' ? 0 : fd.bearingJitter);
    let fielded = 0;
    for (const p of plan) {
      const sx = ox + px * p.off, sy = oy + py * p.off;
      // 'span' ends past the land (diagonal bearings) are skipped, never
      // clamped — clamping would fold the wave's ends into stacked corners.
      if (row.line === 'span'
        && (sx < -band * 0.5 || sx > this.w + band * 0.5
          || sy < -band * 0.5 || sy > this.h + band * 0.5)) continue;
      const reach = p.reach
        ?? (row.reach ? this.rng.range(row.reach[0], row.reach[1]) : undefined);
      const src = this.addSource(def, sx, sy, {
        bornFrac: fd.lineBorn,
        ...(reach !== undefined ? { reach } : {}),
      });
      if (!src) break; // the field is saturated — the wave arrives short
      this.attachFront(src,
        jitter > 0 ? bearing + this.rng.range(-jitter, jitter) : bearing, lane.idx);
      lane.live++;
      fielded++;
    }
    if (fielded > 0 && row.announce) this.terrain?.announce?.(row.announce.text, row.announce.color);
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
   *  harmonics × any front stretch (rimMulOf — shared with the render
   *  bake). Ceiling = cur × (1 + Σa) × stretch — refreshBound keeps the
   *  broad phase honest. */
  rimAt(src: CreepSource, ang: number): number {
    return src.cur * rimMulOf(src, ang);
  }

  private refreshBound(src: CreepSource): void {
    let sum = 0;
    for (const h of src.harm) sum += h.a;
    // A stretched crest's ceiling is its ACROSS axis; a swelling bolus's
    // is its LONG axis — the broad phase covers whichever wins (× 1 for
    // everything round — bit-exact with the classic bound).
    const st = src.front ? Math.max(1, src.def.front?.stretch ?? 1) : 1;
    const el = src.front?.elong ?? 1;
    src.bound = src.cur * (1 + sum) * Math.max(st, el) + 4;
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
    const run = src.front;
    if (run && anisoMode(src) === 'affine') {
      // THE INVERSE TRANSFORM: rotate the offset into the body frame and
      // unscale (elong, stretch) — the point then tests against the
      // CANONICAL harmonics exactly as the blit drew them: drawn == tested
      // at every live bearing and every stage of the swell. (The pad rides
      // the canonical rim, so its world grace scales with the local axis —
      // a hair generous along the nose, honest everywhere it matters.)
      const st = Math.max(0.5, src.def.front?.stretch ?? 1);
      const c = Math.cos(run.bearing), s = Math.sin(run.bearing);
      const bx = (dx * c + dy * s) / run.elong;
      const by = (-dx * s + dy * c) / st;
      const rim = src.cur * creepRimMul(src.harm, Math.atan2(by, bx)) + pad;
      if (rim <= 0.001) return 0;
      const f = Math.sqrt(bx * bx + by * by) / rim;
      if (f >= 1) return 0;
      // VESSEL CONFINEMENT (flow.confine): the current exists only where
      // the vessel does — an open line back to the heart, or nothing. The
      // wall between two corridors is a wall to the blood (and to a
      // CHANNEL row, the bank is a wall to the water).
      if (src.def.front?.flow?.confine) {
        const open = this.flowOpen(src);
        if (open && !this.openLine(src.pos.x, src.pos.y, x, y, open)) return 0;
      }
      const body = CREEP_CFG.bodyFrac;
      if (f <= body) return 1;
      const t = (1 - f) / (1 - body);
      return t * t * (3 - 2 * t);
    }
    const rim = this.rimAt(src, Math.atan2(dy, dx)) + pad;
    if (rim <= 0.001) return 0;
    const f = Math.sqrt(dd) / rim;
    if (f >= 1) return 0;
    const body = CREEP_CFG.bodyFrac;
    if (f <= body) return 1;
    const t = (1 - f) / (1 - body);
    return t * t * (3 - 2 * t);
  }

  /** Is the straight line between two points open the whole way? (an
   *  open-window ray-march at flow.confineStep — the vessel-confinement
   *  wall test; `openFn` lets a CHANNEL row march its own ground window.
   *  Without a window everything is open: bare fields confine nothing.) */
  private openLine(x0: number, y0: number, x1: number, y1: number,
    openFn?: (x: number, y: number) => boolean): boolean {
    const open = openFn ?? this.terrain?.openAt;
    if (!open) return true;
    const dx = x1 - x0, dy = y1 - y0;
    const d = Math.sqrt(dx * dx + dy * dy);
    const step = CREEP_CFG.front.flow.confineStep;
    if (d <= step) return true;
    const n = Math.ceil(d / step);
    for (let i = 1; i < n; i++) {
      const f = i / n;
      if (!open(x0 + dx * f, y0 + dy * f)) return false;
    }
    return true;
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
    // Ambient lanes: waves break in when their timers land — unless the
    // lane's radiance gate says the sky is wrong (a night lane by day
    // WAITS at the door, timer spent, and fields the wave the moment its
    // condition holds again).
    for (const lane of this.lanes) {
      if (!lane.pending) continue;
      lane.timer -= dt;
      if (lane.timer > 0) continue;
      if (lane.row.when && !(this.terrain?.condHeld?.(lane.row.when) ?? true)) continue;
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

    // THE VESSEL FLOW: bend the bearing toward the deepest open channel
    // before this tick's march — the current follows its bank (or, for a
    // CHANNEL row, its own ground). Rows without flow — or fields without
    // the window their flow reads — skip entirely.
    if (fs.flow && this.flowOpen(s)) this.steerFront(s, fs, run, dt);

    // Vigor breathes back (quench must outpace it); the stoke burns down.
    if (run.vigor < 1) run.vigor = Math.min(1, run.vigor + fd.vigorRegen * dt);
    if (run.stoke > 0) run.stoke = Math.max(0, run.stoke - fd.stokeDecay * dt);

    // Ease the land multiplier toward its sampled target — surge and
    // stall read as weather, never as a switch.
    const k = Math.min(1, fd.easeRate * dt);
    run.mult += (run.multTarget - run.mult) * k;

    let v = fs.speed * run.vigor * (1 + run.stoke) * run.mult;
    // THE FINITE RUN's taper: the last fraction of the rolled range eases
    // toward the floor — pressure dying, not brakes. (Legacy rows carry
    // rangeMax Infinity and never enter.)
    if (fs.travel?.taper && Number.isFinite(run.rangeMax) && run.rangeMax > 0) {
      const left = Math.max(0, run.rangeMax - run.traveled) / run.rangeMax;
      if (left < fs.travel.taper) {
        const t = left / fs.travel.taper;
        const floor = fd.travelTaperFloor;
        v *= floor + (1 - floor) * (t * t * (3 - 2 * t));
      }
    }
    if (v > 0.01) {
      s.pos.x += run.dx * v * dt;
      s.pos.y += run.dy * v * dt;
      run.traveled += v * dt;
      run.sinceStamp += v * dt;
    }

    // THE SWELL: elongation follows the odometer, eased; the broad-phase
    // bound chases the growing long axis live.
    if (fs.swell) {
      const t = Math.min(1, run.traveled / fs.swell.per);
      run.elong = 1 + (fs.swell.max - 1) * (t * t * (3 - 2 * t));
      this.refreshBound(s);
    }

    // THE FINITE RUN: past the rolled range the surge DISPERSES — recede
    // where it stands (the recoil IS the dispersal read; riders drop as
    // it thins). The whole visit written, then unwritten.
    if (run.traveled >= run.rangeMax && s.state !== 'recede') {
      s.state = 'recede';
      return true;
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
        // The trailing rim of a swollen bolus sits elong × further back
        // (× 1 exact for everything legacy — the wake stays byte-stable).
        const ax = s.pos.x - run.dx * s.cur * run.elong * fd.stampTrail;
        const ay = s.pos.y - run.dy * s.cur * run.elong * fd.stampTrail;
        // Decks stay dry: a yielding front never stamps its wake over or
        // ACROSS a live way — the same list the cover mask reads, tested
        // as a disc so a wide stamp can't slop onto the causeway.
        if (fs.yieldWays && this.wayIntersects(run, ax, ay, r)) continue;
        // The evaporating wake: each pool's dwell rolls on the section's
        // private stream (rows without fade draw nothing extra).
        const fade = conv.fade
          ? {
            after: conv.fade.after[0]
              + (conv.fade.after[1] - conv.fade.after[0]) * this.frontRoll(run),
            rate: conv.fade.rate ?? fd.fadeRate,
          }
          : undefined;
        this.terrain.stamp(ax, ay, r, conv.ground, conv.shallow ?? false, fade);
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
        // A swollen bolus reads the land off its true NOSE (× 1 exact for
        // everything legacy).
        const x = s.pos.x + run.dx * s.cur * run.elong * f - run.dy * s.cur * lat;
        const y = s.pos.y + run.dy * s.cur * run.elong * f + run.dx * s.cur * lat;
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
      const hx = s.pos.x + run.dx * s.cur * run.elong * fd.consumeAhead;
      const hy = s.pos.y + run.dy * s.cur * run.elong * fd.consumeAhead;
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

  /** THE VESSEL FLOW's whisker steering, every tick: five openAt probes
   *  fan ahead of the nose; the bearing bends toward the deepest channel
   *  (an off-center penalty keeps open-field march straight), turns harder
   *  as the center whisker closes (`urgency` × the row's `bounce` — the
   *  visible deflection off a struck wall), and a DEAD END rebounds: the
   *  target flips π (jittered once per rebound on the private stream) at a
   *  burst turn rate, so the bolus visibly slaps the cap and rushes back
   *  out. Deterministic given the land; rimMulOf reads the live bearing,
   *  so the whole skin — drawn, tested, seated — turns with the current. */
  /** The flow's own 'open' window: a CHANNEL row follows its GROUND (the
   *  current holds to its water between open banks), everything else
   *  follows the walls (openAt). Null = no window at all — bare harnesses
   *  keep every legacy behavior. */
  private flowOpen(src: CreepSource): ((x: number, y: number) => boolean) | null {
    const ch = src.def.front?.flow?.channel;
    if (ch && this.terrain?.groundKindAt) {
      const t = this.terrain;
      return (x, y) => ch.includes(t.groundKindAt(x, y) ?? '');
    }
    return this.terrain?.openAt ?? null;
  }

  private steerFront(s: CreepSource, fs: FrontSpec, run: FrontRun, dt: number): void {
    const fd = CREEP_CFG.front.flow;
    const fl = fs.flow!;
    const open = this.flowOpen(s)!;
    const nose = s.cur * run.elong;
    const P = Math.max(fd.probeMin, nose * (fl.probe ?? fd.probeFrac));
    const wAng = fl.whisker ?? fd.whiskerAng;
    const bounce = fl.bounce ?? fd.bounce;
    let dC = 1;
    let best = 0, bestScore = -Infinity;
    let deadEnd = true;
    for (let w = 0; w < 5; w++) {
      const off = (w === 0 ? 0 : w <= 2 ? (w === 1 ? 1 : -1) : (w === 3 ? 2 : -2)) * wAng;
      const ca = Math.cos(run.bearing + off), sa = Math.sin(run.bearing + off);
      let depth = 1;
      for (let i = 1; i <= fd.steps; i++) {
        const f = i / fd.steps;
        const x = s.pos.x + ca * P * f, y = s.pos.y + sa * P * f;
        if (x < 0 || y < 0 || x > this.w || y > this.h || !open(x, y)) {
          depth = (i - 1) / fd.steps;
          break;
        }
      }
      if (w === 0) dC = depth;
      if (depth > fd.deadEndFrac) deadEnd = false;
      const score = depth - Math.abs(off) * fd.anglePenalty;
      if (score > bestScore + 1e-9) { bestScore = score; best = w; }
    }
    let target: number;
    let rate = fl.steer;
    if (deadEnd) {
      // One rebound, one roll: the target holds until the way ahead opens
      // — a per-tick re-roll would jitter the turn into a shiver.
      if (run.rebound === undefined) {
        run.rebound = run.bearing + Math.PI
          + (this.frontRoll(run) - 0.5) * 2 * fd.reboundJitter;
      }
      target = run.rebound;
      rate = fl.steer * (1 + bounce * fd.bounceBoost);
    } else {
      run.rebound = undefined;
      const bestOff = (best === 0 ? 0 : best <= 2 ? (best === 1 ? 1 : -1) : (best === 3 ? 2 : -2)) * wAng;
      target = run.bearing + bestOff;
      if (dC < 1) rate = fl.steer * (1 + (1 - dC) * (fd.urgency + bounce * fd.bounceBoost));
    }
    let d = target - run.bearing;
    while (d > Math.PI) d -= Math.PI * 2;
    while (d < -Math.PI) d += Math.PI * 2;
    const step = Math.max(-rate * dt, Math.min(rate * dt, d));
    if (step !== 0) {
      run.bearing += step;
      run.dx = Math.cos(run.bearing);
      run.dy = Math.sin(run.bearing);
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
  arena: { w: number; h: number; boundless?: boolean; aquatic?: boolean },
  rng: CreepRng,
): CreepField | null {
  if (!spec) return null;
  // WATER WITHIN WATER, refused structurally: an AQUATIC arena (whole-floor
  // seabed) never grows a kind that forswears it (CreepDef.notAquatic) —
  // the tidal wall breaks on coasts, never under the sea, and no blend or
  // cross-seeded spec can smuggle one in. Dry zones take the exact same
  // arrays (no filter run) — their streams cannot move.
  const kinds = arena.aquatic ? spec.kinds.filter(k => !CREEPS[k.id]?.notAquatic) : spec.kinds;
  const fronts = arena.aquatic
    ? (spec.fronts ?? []).filter(f => !CREEPS[f.id]?.notAquatic)
    : spec.fronts ?? [];
  if (!kinds.length && !fronts.length) return null;
  if (arena.boundless) return null; // streamed arenas have no stable bounds to skin
  const field = new CreepField(rng, arena.w, arena.h);
  const n = rng.int(spec.pockets[0], spec.pockets[1]);
  let total = 0;
  for (const k of kinds) total += k.weight ?? 1;
  const placed: { x: number; y: number }[] = [];
  for (let i = 0; i < n; i++) {
    if (!kinds.length) break; // every pocket kind was sea-forsworn
    let roll = rng.range(0, total);
    let pick = kinds[kinds.length - 1];
    for (const k of kinds) {
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
  if (fronts.length) field.installLanes(fronts);
  return (field.sources.length || field.laneCount()) ? field : null;
}
