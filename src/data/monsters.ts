// ---------------------------------------------------------------------------
// THE BESTIARY.
//
// Monsters are data: base stats + innate modifiers + a list of skill ids
// from the SAME skill catalog the player uses. Their AI reads each skill's
// `ai` hint to decide when to use it. Any monster can also be summoned as a
// player minion (see Summon Skeleton / Flame Sprite) — same definition.
// ---------------------------------------------------------------------------

import { mod, type Modifier, type DamageType, type SkillTag } from '../engine/stats';
import type { ActorAdorn, ActorShape, BrainDef, MonsterPartDef, PostSpec } from '../engine/actor';
import type { BrainTuning, PhaseDef } from '../engine/brain';
import type { CurveKind } from '../engine/curves';
import { registerPresenceBand, type PresenceSpec } from '../engine/presence';
import { registerAIAction } from '../engine/aiActions';
import { FluxPhase } from '../engine/flux';
import type { TuneSpec } from '../engine/tuning';
import type { ClingSpec } from '../engine/cling';
import type { PlySpec } from '../engine/plies';
import type { PortraitTune } from '../render/vis/portrait';
import type { PackTableEntry } from './zones';
import type { EssenceSpillSpec } from './essences';

// The Legion's own tier band, shared by its elite defs and roster rows —
// retune ONE envelope and the whole muster shifts (the named-band pattern;
// generic tiers live in engine/presence.ts PRESENCE_BANDS).
registerPresenceBand('legion_muster', { from: 26, fadeIn: 8 });

// The Vigilant Host's shared tier band (the Aetherial's wardens): the choir
// musters from the shelf-crossing levels on — retune ONE envelope and the
// whole realm's pressure shifts (the legion_muster pattern).
registerPresenceBand('host_vigil', { from: 10, fadeIn: 5 });

// DEATH DIVISION has ONE seam and it is the brain's: `onDeath: [{do:'summon',
// …}]` (viscous_ooze, galvanic_ooze). A MonsterDef-level split kit-part was
// briefly added here and REVERTED — two mechanisms for one concept is how
// copies diverge. Divide a body by giving its brain a death rattle.

/** The bestiary's default TURN SPEED (rad/s) — fast enough to read as
 *  natural, no longer instant (smooths the one-frame snap-flips). Defs
 *  override with `turnSpeed`; low values (2-4) make big bodies LUMBER. */
export const MONSTER_TURN_DEFAULT = 10;

/** How a monster's death-burst resolves (overhauls the old instant explodeOnDeath).
 *  IMPLODE = coalesce at the death spot → a delayed AoE pop. ORB = coalesce → an
 *  undamageable sphere that loosely HOMES the nearest player for a duration, then arms +
 *  detonates (PoE "Volatile"/"Bearer"). Pure data — every lever a knob. */
export type DeathBurstMode = 'implode' | 'orb';
export interface DeathBurstDef {
  mode: DeathBurstMode;
  /** Damage = maxLife × damageFrac (mirrors the old explodeOnDeath scalar). */
  damageFrac: number;
  /** Blast radius (default 45 + actor.radius×2 — the legacy explodeActor radius). */
  radius?: number;
  /** Damage element (default 'fire'; 'chaos' for spore/plague/fungal). */
  damageType?: DamageType;
  /** Seconds the spore/energy GATHERS before the implosion pop / orb spawn — the
   *  player's escape window (default 0.8; keep ~0.35 for fast bombers). */
  coalesce?: number;
  /** ORB: base lifespan seconds, ×the monster's effectDuration (increased-duration). Default 2.6. */
  orbDuration?: number;
  /** ORB: loose follow speed px/s. Hard-capped at 75% of base player moveSpeed so the
   *  orb stays outrun-able at base speed (escape under slows relies on the sloppy turn). Default 110. */
  orbSpeed?: number;
  /** ORB: loose-home turn rate rad/s (low = sloppy/dodgeable). Default 2.0. */
  orbTurn?: number;
  /** ORB: detonate on CONTACT (touching the player, a minion, or a wall) instead of waiting
   *  out its duration — the orb stops dead and flares into its blast. orbDuration (×effectDuration)
   *  still caps how long it COULD drift if it never touches anything. Default false. */
  detonateOnContact?: boolean;
  /** ORB + detonateOnContact: seconds the orb FREEZES and flares on contact before its
   *  blast — the brief "it stuck — dash!" tell. Default 0.3. */
  contactFuse?: number;
  /** ORB + detonateOnContact: the orb's body half-width for the touch test (px, added to the
   *  target's radius). Default 12 (≈ the rendered orb core). */
  contactRadius?: number;
  /** Render hue for the gather/orb/blast — the player's damage-type TELL. Leave unset:
   *  it defaults to the canonical per-element tint (DAMAGE_COLOR[damageType]) so colour
   *  reliably signals what to mitigate. Only override for a unique boss, and keep it within
   *  the element's hue family so the read stays honest. */
  color?: string;
}

/** An enemy pack's intermittent tether (MonsterDef.tether): a damaging band
 *  between pack members, cycling on and off. dps scales with the monster's
 *  own damage stat (so it levels), and the band honours conversion. */
export interface MonsterTetherDef {
  dps: number;
  damageType?: DamageType;
  /** Band half-width, units (default 10). */
  width?: number;
  /** Max link distance between kin (default 320). */
  radius?: number;
  /** The band holds `duty` seconds of every `period` (defaults 3 of 6). */
  period?: number;
  duty?: number;
  color?: string;
}

/** OPT-IN per-stat level scaling, layered ON TOP of the baseline (life/damage/
 *  accuracy/evasion) growth every monster gets. Declared per stat under
 *  MonsterDef.scaling — a difficulty lever applied ONLY where noted. Composes via
 *  the modifier engine: value = (base + ΣFLAT)·(1+ΣINCREASED)·Π(1+MORE). Let
 *  `lv` = monsterLevel − 1. The three independent terms (any subset):
 *    flatPerLevel · lv^pow   → a FLAT mod      (e.g. +0.6 life-regen / level)
 *    incPerLevel  · lv^pow   → an INCREASED mod (linear %; pow 2 = quadratic)
 *    (1+rate)^lv − 1         → a MORE mod      (geometric / exponential)
 *  All are 0 at level 1 (lv=0), so the DEF's base IS the level-1 value. */
export interface StatScale {
  flatPerLevel?: number;
  incPerLevel?: number;
  /** Exponent on level for the flat/inc terms (1 = linear [default], 2 = quadratic…). */
  pow?: number;
  /** Geometric per-level growth applied as a MORE modifier (true exponential). */
  rate?: number;
}

/** A level-gated GRANT: at `atLevel`, a monster either gains a new SKILL or
 *  sockets a SUPPORT into one of its skills — so a creature's kit EVOLVES as it
 *  levels (Cleave → +Multistrike@10 → +Reverberation@40 → +War Cry@50). Supports
 *  ride the skill instances' default sockets and flow through the SAME cast
 *  pipeline as the player's (instanceMods), so the modifier actually lands. */
export interface MonsterGrant {
  atLevel: number;
  /** Add this skill id to the monster's loadout (needs a `.ai` hint to be cast). */
  skill?: string;
  /** Socket this support id into one of the monster's skills. */
  support?: string;
  /** Skill id to socket `support` into (default: the monster's FIRST skill). */
  on?: string;
  /** Rolled PER SPAWN: the grant lands with this chance (absent = always) —
   *  "some wardens carry the lance drill, some don't" without a second def. */
  chance?: number;
}

/** A BOON: this monster rolls options from a passive CHOICE GROUP at spawn —
 *  the SAME data/passiveChoices.ts pools the player's tree deals, so player
 *  powers and bestiary variance share one vocabulary. Option MODS fold onto
 *  the body as an ordinary sheet source; an option GRAFT rides the first
 *  skill's graft lane (hostSockets — the player's mutator seam, verbatim).
 *  Option ATTRIBUTES are player-pipeline payloads and are skipped here. */
export interface MonsterBoon {
  /** CHOICE_GROUPS id. */
  group: string;
  /** Distinct options rolled (default 1; clamped to the pool). */
  pick?: number;
  /** Per-spawn chance the boon rolls at all (absent = always). */
  chance?: number;
}

/** The AGGRO PERSONALITY axes (MonsterDef.aggro) — pure multipliers, all
 *  default 1, read by whatever grafts a targeting tune onto the body (the
 *  extraction swarm director today; any beacon/objective event tomorrow).
 *  They shape ATTENTION, never damage. */
export interface AggroSpec {
  /** × threat seeded toward the event's objective (single-mindedness). */
  fixation?: number;
  /** × threat booked when this body takes damage (how hard it turns). */
  fury?: number;
  /** × threat decay while grafted (high = grudges melt, it drifts back). */
  waver?: number;
}

/** DISPERSAL TEMPERS — the vocabulary for "the disturbance ended; now what".
 *  An open union stays extensible (a future 'zealous' that never leaves is
 *  one string + one branch at the disperse site, no type surgery). */
export type TemperId = 'skittish' | 'wary' | 'territorial';

/** Resolve a body's temper: def override → faction default → 'wary'.
 *  (Faction defaults live in world/traits.ts FACTION_TRAITS.temper — data,
 *  not code, so a pack table's whole personality is two lines.) */
export function temperOf(def: MonsterDef | undefined, factionTemper?: TemperId): TemperId {
  return def?.temper ?? factionTemper ?? 'wary';
}

/** THE SEGMENT FABRIC's data face (docs/engine/segments.md) — a worm/snake
 *  body as one spec. `length`/`spacing`/`taper` alone = the classic
 *  render-only trail every legacy worm keeps, byte-identical. The fabric
 *  fields OPT IN per def:
 *    - `hittable` — every trailing segment becomes a REAL hit body: the
 *      drawn circle IS the tested circle (engine/segments.ts segR), every
 *      hit funnel (projectiles, melee, novas, zones, beams, AI range, aim
 *      assist) connects with the nearest body, and a landed blow feeds the
 *      creature's ONE shared life pool — the segment is WHERE it landed,
 *      never a damage multiplier. One creature: one kill, one nameplate,
 *      one boss bar, one loot/xp credit, all by construction.
 *    - `looks` — per-segment kit-parts from the LOOKS registry, so the
 *      chain reads as ONE animal at a glance (plates, fins, the tail).
 *    - `wounds` — per-segment wound states layered on the shared pool.
 *  DRIVE SEAM: segment positions come from the 'trail' drive (serpentine
 *  trail-the-head, World.updateWorms) — an articulated limb-chain / gait
 *  drive (the walking-colossus seam) slots in as a new `drive` kind writing
 *  the same segments[]; the hit/life/feedback side is drive-agnostic.
 *  Rigid anchored limbs can ride the PARTS fabric instead — they compose. */
export interface WormSpec {
  length: number;
  spacing?: number;
  taper?: number;
  /** Opt-in: segments are real hittable bodies (drawn = tested). */
  hittable?: boolean;
  /** Per-segment kit-part looks (the one-animal read). */
  looks?: WormLookSpec;
  /** Per-segment wound states (requires `hittable`). */
  wounds?: WormWoundSpec;
  /** Follow drive ('trail' = serpentine trail-the-head, the stock drive
   *  and the default). Reserved seam for articulated chains. */
  drive?: 'trail';
}

/** Kit-part looks per segment class — LOOKS registry ids. Unset classes
 *  fall back to the head's own bake scaled down (the legacy tail). */
export interface WormLookSpec {
  /** The ordinary body segment (scale plates, coil rings…). */
  body?: string;
  /** The LAST segment (tail spade, flukes, a stinger). */
  tail?: string;
  /** Every nth segment wears an accent look instead (dorsal fins, spine
   *  sails) — never the tail. n ≥ 2. */
  every?: { n: number; look: string };
}

/** Per-segment WOUND states, layered on the shared pool: each segment
 *  carries a pool of `frac` × the root's max life; skill damage landing ON
 *  that segment drains it (the shared pool is fed regardless); at zero the
 *  segment TEARS — permanent for this life, drawn + tested smaller, `mods`
 *  laid on the root per torn segment (one stacking sheet source), and an
 *  optional retaliation `burst` at the torn coil. Rewards spreading damage
 *  along the body without ever double-counting a hit. */
export interface WormWoundSpec {
  /** Wound pool per segment, as a fraction of the root's max life. */
  frac: number;
  /** Mods laid on the root PER torn segment (stacking source). */
  mods?: Modifier[];
  /** Floating text at the tear (default 'TORN'). */
  text?: string;
  /** Retaliation pop at the torn segment: typed damage to enemies-of-the-
   *  worm within `radius`, as `damageFrac` × the root's max life. */
  burst?: { radius: number; damageFrac: number; type?: DamageType; color?: string };
}

export interface MonsterDef {
  id: string;
  name: string;
  color: string;
  shape: ActorShape;
  radius: number;
  /** Opt OUT of the world's memory (meta/nemesis.ts): this kind can never be
   *  remembered as a nemesis — for fixtures, uber set-pieces, and anything
   *  whose promotion would read as nonsense. Default: rememberable. */
  noNemesis?: boolean;
  /** Base stat overrides at level 1 (anything omitted uses STAT_DEFS defaults). */
  base: Record<string, number>;
  /** Innate modifiers (resistances, speed quirks...). */
  mods?: Modifier[];
  /** SYMPATHY LINKS worn from birth (engine/sympathy.ts registry ids) —
   *  folded as sympathy_<id> potency-1 innate mods at creation: the den
   *  matron whose swig waters her whole pack. Same fabric as the player's
   *  tame-bond links; docs/engine/sympathy.md. */
  sympathy?: string[];
  /** Skill ids from the shared catalog. */
  skills: string[];
  xp: number;
  /** GEAR loot-table override (LOOT_TABLES id). Omitted ⇒ the kill path uses
   *  DROP_CFG defaults (boss table for bosses, chance-gated world table
   *  otherwise) — set this to give a monster its own hoard. */
  loot?: string;
  /** MONSTER-INFREQUENT theme (mi_<theme> base pool). Wins over the
   *  data/infrequents.ts MONSTER_THEMES registry when both name this def. */
  infrequentTheme?: string;
  /** GEM-DROP bias: gems sharing one of these tags weigh heavier from this
   *  monster's kills (GEM_DROP_CFG.biasMult) — the shaman drops caster gems,
   *  the archer projectile ones. Bias, never a gate. */
  gemBias?: SkillTag[];
  /** Marks wave bosses: bigger, tougher, flagged in the UI. */
  boss?: boolean;
  /** TOP-CENTER BOSS BAR override (World.bossBarInfo): the marquee health
   *  bar normally belongs to `boss: true` defs — set false to keep a
   *  technical boss off the marquee, true to give a spectacle elite the
   *  full bar WITHOUT the boss classification (loot, bestiary and
   *  domination reads untouched). The bar still waits for the fight to be
   *  live (BOSS_BAR_CFG), and its phase pips derive from the brain. */
  bossBar?: boolean;
  /** Cannot take damage (hits report immune). */
  invulnerable?: boolean;
  /** Cannot be hit or targeted — enemies ignore it entirely. */
  untargetable?: boolean;
  /** Floats over fall hazards (void/chasm): no fall damage, can't be knocked to death
   *  off a ledge. Pathing still avoids void. For bosses on a void-margin arena. */
  levitates?: boolean;
  /** AI archetype (omit for the basic approach-and-attack brain). */
  brain?: BrainDef;
  /** Worm/snake body: trailing segments that follow the head. The base
   *  fields alone are the legacy render-only trail; the fabric fields make
   *  every segment REAL (docs/engine/segments.md). */
  worm?: WormSpec;
  /** Detonates on death for this fraction of max life (bombers). For an ENEMY this now
   *  AUTO-maps to a telegraphed coalesce-implode (the player gets an escape window). */
  explodeOnDeath?: number;
  /** Telegraphed coalesce-burst on death (the data-driven overhaul). Overrides the
   *  explodeOnDeath auto-map — for a tuned implode, a themed element, or the orb variant. */
  deathBurst?: DeathBurstDef;
  /** Intermittent PACK TETHER: members of this kind arc a damaging band to
   *  their nearest unlinked kin for `duty` seconds of every `period` — the
   *  "they're tethered, don't stand between them" enemy modifier. */
  tether?: MonsterTetherDef;
  /** A destructible spawner object — 'spawners' objectives count these. */
  spawner?: boolean;
  /** Scenery with a health bar: never counts toward zone objectives. */
  passive?: boolean;
  /** aims:false — the facing means nothing (the renderer hides the aim
   *  tick): bodies whose pose never tracks a target. Constructs default
   *  by kind (CONSTRUCT_KIND_AIMS); this is the bestiary-side lever. */
  aims?: boolean;
  /** Movement/behavior is DRIVEN externally (an event tick wheels it); the
   *  AI brain skips it entirely (the caravan cart). */
  driven?: true;
  /** Summoned copies wear their SUMMONER's silhouette (shape/color/radius/
   *  facing) — doppelganger minions like the Vessel-of-Shadow clone. A data
   *  flag, not an id check: any monster can be a mimic. */
  mimicOwnerForm?: boolean;
  /** Opt OUT of the minion leash-recall (ai.ts: stuck/far minions teleport
   *  home) — for bodies that are SUPPOSED to be left behind. */
  noRecall?: boolean;
  /** DUTY POST (brain.ts PostSpec): every spawn of this def keeps a STATION —
   *  its placed spot — walking back whenever idle drift, a shove or a gale
   *  strays it past the slack, dormant or awake (true = all defaults: the
   *  standing sentry; hold:false = a body that merely orbits home). Spawners
   *  may stamp site-exact posts on top (Actor.aiPost — the holdfast crew). */
  post?: PostSpec | true;
  /** How worth guarding this monster is to protector brains (higher = posted
   *  first). Omitted: commanders rank 2, casters 1, everyone else 0. */
  wardPriority?: number;
  /** PERCEPTION shape: sight is a frontal CONE of `arcDeg` degrees at full
   *  detection range, with all-around hearing at `rearMul` × range behind it
   *  (defaults 150° / 0.35 — see ai.ts). A sentry might watch 220° at 0.5;
   *  a sluggard 100° at 0.2. The stealth playstyle lives in these numbers. */
  vision?: { arcDeg?: number; rearMul?: number };
  /** Guaranteed support gem drops on death (overrides the 7% roll). */
  drops?: number;
  /** Chance to pop a resource orb on death (barrels, crates). */
  orbDrops?: number;
  /** Faction allegiance — rival factions brawl in war zones. */
  faction?: string;
  /** Silhouette accent: goblin ears, orc horns, briar spikes. */
  adorn?: ActorAdorn;
  /** Surface material (render/vis/materials.ts) — bone, chitin, stone,
   *  ethereal… Shapes the baked shading/texture; omitted = flesh. The
   *  material also implies a gameplay NATURE (MATERIAL_NATURE below):
   *  whether death leaves a corpse-economy remnant and whether the body
   *  tires — both overridable per def via `remains` / `breathes`. */
  material?: string;
  /** Override the material's REMAINS verdict: does this body's death leave
   *  a raisable corpse (world.ts kill path)? Objects in organic dress
   *  (wax pools, banner masts) opt OUT; a timber horror that should drop
   *  deadfall opts IN. Omitted = the material decides. */
  remains?: boolean;
  /** Override the material's BREATH verdict: does this body TIRE (the
   *  default kite budget — brain.ts BEHAVIOR_CFG.defaultKite)? A tireless
   *  flesh horror opts out; a panting brass hound opts in. Omitted = the
   *  material decides. */
  breathes?: boolean;
  /** HEFT (the mass fabric): multiplies the radius-derived weight DEFAULT —
   *  "heavier (or lighter) than the silhouette says" — while still composing
   *  with per-spawn scale variance and the material's density. Ignored when
   *  base.weight pins an absolute value. The leaden thrall's 2.4 makes a
   *  knee-high ingot an anchor; the shale skitter's 0.28 lets stone fly. */
  heft?: number;
  /** Part-grammar portrait (data/looks.ts) — skeletons read as skeletons
   *  from overhead. Omitted = the legacy shape+adorn body. */
  look?: string;
  /** BOOK/DATABASE PORTRAIT dials (render/vis/portrait.ts): zoom, nudge,
   *  facing, pose clock, worm-trail length for this kind's composed portrait
   *  in the bestiary and the website. Omitted = the fabric's measured fit. */
  portrait?: PortraitTune;
  /** THE LATCH (engine/cling.ts): this kind LATCHES onto its quarry on
   *  contact — riding the silhouette, whacking through its own kit, shaken
   *  off on the spec's clock. The Pikmin blow; any monster can wear it. */
  cling?: ClingSpec;
  /** THE GRAB FABRIC's victim-side policy word (engine/grab.ts): true /
   *  false = grabbable / never regardless of rarity; a number is a
   *  struggle-speed tier (2 = scrambles out double-quick). Omitted falls
   *  to GRAB_CFG.policy by rarity (uniques refuse, rares scramble). */
  grabbable?: boolean | number;
  /** THE PLY FABRIC (engine/plies.ts): hit-counted durability — this kind
   *  EATS N landed hits (magnitude-blind) before its life pool is exposed.
   *  The life underneath stays live for DoTs and self-destruction. Any
   *  kind can wear it; a 1-ply body is the horde-tier substrate. */
  plies?: PlySpec;
  /** COMPOSITE MONSTER: plural hitboxes anchored to this root's facing frame
   *  (world bosses, dragons, leviathans). Each part is a full monster def —
   *  it fights with its own skills and its death fires break effects on the
   *  root. Parts lazy-attach on the root's first update tick, so every spawn
   *  path (packs, events, zone-memory restores) grows them. */
  parts?: MonsterPartDef[];
  /** Multiplier on detection range (1 = baseline). Low shambles past you
   *  (zombie 0.55); high senses you from afar (blood mite 1.6). */
  detection?: number;
  /** LIGHTWELL hunger (engine/lightwells.ts): power/sec this body drinks from
   *  any pooled light source whose lit reach it stands inside. The snuffwick's
   *  whole verb — defend-the-lamp emerges from spawn placement + this number,
   *  zero bespoke AI. */
  wellDrain?: number;
  /** AGGRO PERSONALITY (the attention axes, read wherever an event grafts a
   *  targeting tune onto this body — extraction swarms today, any future
   *  beacon-chaser tomorrow). All default 1; each is a pure multiplier:
   *  - `fixation` scales threat SEEDED toward the event's objective (a sapper
   *    at 2.5 barely notices you; a coward at 0.4 forgets the objective the
   *    moment anything moves),
   *  - `fury` scales threat booked when this body TAKES damage (how hard it
   *    turns on its attacker),
   *  - `waver` scales its threat DECAY (high = grudges melt fast and it
   *    drifts back to the objective; low = it holds the grudge). */
  aggro?: AggroSpec;
  /** DISPERSAL TEMPER — how this body behaves when the disturbance that
   *  summoned it ENDS (an extraction settles, a swarm event closes):
   *  - `'skittish'` turns for home at once and keeps walking even if struck,
   *  - `'wary'` leaves too, but a wound on the way out re-awakens it (the
   *    default posture),
   *  - `'territorial'` stays a while — the swarm hardens into a small
   *    expedition holding the ground before it finally drifts off.
   *  Resolution order: def.temper → FACTION_TRAITS[faction].temper → 'wary'. */
  temper?: TemperId;
  /** LEVELED-LIST envelope (engine/presence.ts): this def's GLOBAL weight-vs-
   *  level curve, multiplied into every table/pool that selects it by id —
   *  the "never below 18, anywhere" or "disperses past 14, everywhere" lever.
   *  Per-table shaping belongs on the table entry's own `presence`; the two
   *  multiply. Selection only — explicit spawns (bosses, summon verbs,
   *  composite parts) ignore it. */
  presence?: PresenceSpec;
  /** OPT-IN per-stat level scaling, layered on the baseline (see StatScale). */
  scaling?: Record<string, StatScale>;
  /** Level-gated skill/support grants — the kit evolves as it levels (MonsterGrant). */
  grants?: MonsterGrant[];
  /** Spawn-rolled options from the player-shared choice pools (MonsterBoon). */
  boons?: MonsterBoon[];
  /** SCALE VARIANCE — a per-spawn body-scale multiplier rolled in [min,max], so a
   *  herd reads as a mix of big adults and small young (createMonster sizes the body
   *  to it, and — with scaleStats — its life/damage). The lever the Migration herds
   *  ride; harmless on any other monster. */
  scaleVariance?: [number, number];
  /** Couple life & damage to the rolled scale (big = tankier/harder, small = frail). */
  scaleStats?: boolean;
  /** A rolled scale at/below this marks a JUVENILE: it takes `juvenileBrain` instead
   *  of `brain` — the young flee where the adults stand and gore. */
  juvenileBelow?: number;
  /** The brain a juvenile uses (e.g. { type: 'flee' }) — overrides `brain` for the small. */
  juvenileBrain?: BrainDef;
  /** BRAIN VARIANTS: a weighted PERSONALITY roll per spawn — one def, many
   *  minds (a leaper that runs with the pack, hunts alone, or attacks in
   *  tides, decided the moment it walks in). Overrides `brain` when rolled;
   *  juvenileBrain still wins for the small. */
  brainVariants?: { weight: number; brain: BrainDef }[];
  /** Def-level role tag stamped at spawn (ambient wildlife: 'critter' /
   *  'predator' — AMBIENT_TAGS keeps them off objectives). Event spawners
   *  may overwrite for their own roles (patrol, siege, brigand...). */
  tag?: string;
  /** TAXONOMY tags (plural — orthogonal to `tag`, the mutable spawn-time
   *  role label): what this creature IS ('beast', 'undead', 'demon',
   *  'construct'…). An open vocabulary read by data that restricts by
   *  nature — Tame takes only 'beast'-tagged kinds, a future bane charm
   *  only 'undead' — never by def id. Tag freely; unread tags cost nothing. */
  tags?: string[];
  /** Open TOWN-NPC role this body fills ('vendor', 'innkeep', 'caravanner',
   *  'questgiver', a package's own...). Behavior sites scan for the role —
   *  never a literal def id — so any def can staff any counter, and any role
   *  floats the actor's nameplate. Distinct from `tag`, the spawn-time actor
   *  label event spawners overwrite at will. */
  npcRole?: string;
  /** IMMORTAL fixture: the kill path shows the hit then snaps life back to
   *  full — no death, no credit, no loot (the Training Dummy; any future
   *  practice target opts in with this flag, never a def-id gate). */
  immortal?: boolean;
  /** BESTIARY (data/bestiary.ts): kills to MASTER this kind's entry, overriding
   *  the config default (BESTIARY_CFG.kills; bosses use bossKills). Pure data —
   *  a legendary rarity could ask for 1, a swarm chaff for 1000. */
  bestiaryKills?: number;
  /** Opt OUT of the bestiary entirely (fixtures, set-piece one-offs, bodies
   *  whose page would read as nonsense). Scenery/NPC/driven kinds are already
   *  excluded structurally — this is for the rest. */
  noBestiary?: boolean;
  /** A RIDER SLOT on this creature's back: same-team actors whose tag /
   *  defId / faction matches `kinds` may MOUNT it (the {do:'mount'} verb) —
   *  the rider is carried (position pinned, dash/push stilled) and casts
   *  freely from the saddle until either party dies. One rider at a time.
   *  The D2 siege-beast pattern: a walking tower for its faction's fragile
   *  teeth. */
  mountSlot?: { kinds: string[]; offsetY?: number };
  /** A BOLT-HOLE: when routed (morale break / skittish spook), this creature
   *  makes FOR the nearest doodad of `kind` instead of merely running, and
   *  SLIPS AWAY on reaching it — removed, no corpse, no credit (the frog
   *  dives, the burrower goes to ground). `seek` caps the search (default
   *  900); `text` is the vanish line ("dives!"). Ambient texture, any body. */
  refuge?: { kind: string; seek?: number; text?: string };
  /** TERRAIN-BOUND: this creature exists ONLY on matching ground. Spawn
   *  placement relocates it onto a doodad of `kind` with radius >= minRadius
   *  (no such doodad in the zone = the body simply isn't spawned), and it is
   *  HARD-CONFINED to that doodad's disc + `grace` px forever after — the
   *  lake horror slashes from its water and cannot be kited onto the grass.
   *  Composes with `ambush` (hidden until you stray near its ground). */
  habitat?: { kind: string; minRadius?: number; grace?: number };
  /** GROUND IMMUNITY: region kinds whose standDamage and heat wash this
   *  body ignores (lava natives). Habitat-matched bodies are implicitly
   *  exempt from their OWN ground; this covers kin who merely visit —
   *  the magma swimmer crossing a pool it isn't burrowed in. The wayfaring
   *  fabric reads the SAME insurance: an insured kind prices neutral to
   *  this body's pathing (what can't hurt you isn't detoured around). */
  immuneGround?: string[];
  /** TRAVEL-COST OVERRIDES (the wayfaring fabric, docs/engine/los-pathing.md):
   *  this creature's OWN price for crossing a region kind, replacing the
   *  registry row's pathCost in its flow fields. <1 RELISHES the ground —
   *  the magma worm treats the lava lane as a bath and drifts into it by
   *  choice; >1 dreads it beyond the common price (a spirit that recoils
   *  from running water). Wins over insurance either way; keys validated
   *  against the region registry. */
  pathCosts?: Record<string, number>;
  /** CREEP HEART (the creep fabric, engine/creep.ts): this body anchors a
   *  living membrane patch of the named creep KIND — planted at spawn,
   *  growing out from under it, RECOILING when it dies (the source is
   *  bound to the actor). Any monster may carry one: biome hearts, event
   *  spreaders, broodmothers whose brood fights better on their own skin.
   *  `reach` overrides the kind's roll; `bornFrac` starts the front
   *  part-grown (default 0.12 — you should SEE it claim ground). */
  creepSource?: { kind: string; reach?: [number, number]; bornFrac?: number };
  /** NEVER COUNTS toward zone objectives (clear counts and kin): bodies
   *  whose habitat the player may be unable to reach (a void angler over
   *  its chasm) must never gate progress — the soft-lock guard. The
   *  validator REQUIRES this on any def whose habitat kind blocks
   *  movement. Purely an objective exemption: it still fights, still
   *  drops, still pays xp. */
  noObjective?: boolean;
  /** BODY WAKE: the body itself SHEDS ground as it travels — every
   *  `everyDist` units of actual displacement (walks, dashes, shoves
   *  alike) the named catalog skill free-casts at its feet through the
   *  ordinary ground pipeline (size envelopes, exposure grace, telegraphs
   *  and Foresight all ride; no cost, no cooldown). A stationary body
   *  never leaks — the trail IS the travel — and hidden ambushers /
   *  burrowers shed nothing while untargetable. The payload should be a
   *  small noDrop GROUND skill (the bog dweller's venom_seep); dmgMult
   *  scales its rolls (default 1). Composes with habitat (a bog-bound
   *  oozer laces its own pool), minions (a summoned wake-body sheds for
   *  its owner), and everything the payload skill itself composes with. */
  wake?: { skillId: string; everyDist: number; dmgMult?: number };
  /** VOLATILE — the poked wasp nest: TAKING a landed hit has `chance` to
   *  FREE-CAST the named catalog skill from the body, aimed back along the
   *  blow, throttled by `icd` seconds (default 1.5). The hit-driven
   *  sibling of `wake` (which sheds on travel) and the bestiary cousin of
   *  the construct bell (castOnStruck): ANY delivery works — novas spray
   *  around the body, projectiles answer the attacker, ground pools at its
   *  feet. dmgMult scales the payload's rolls (default 1). Dead, hidden
   *  and untargetable bodies never answer, and a killing blow is answered
   *  by nothing — the corpse is quiet (death answers belong to the brain's
   *  onDeath rattle). Composes with ambush (poke the root, learn why),
   *  shells (the answer fires even while the shell soaks), and everything
   *  the payload skill itself composes with. */
  volatile?: { skillId: string; chance: number; icd?: number; dmgMult?: number };
  /** BODY ELEMENT RESPONSES — the reaction matrix worn as ANATOMY: what this
   *  body DOES when a landed hit CARRIES a damage type. Each row may coat the
   *  struck body with a status (fire makes wax run; cold sets it brittle;
   *  fire lights a shadow up) and/or free-cast a payload from the body at its
   *  own feet (the drip, the re-light) — volatile's grammar, keyed by
   *  element. ROLLED amounts decide (mitigation can't scrub what struck it);
   *  one shared icd paces all rows; the corpse answers nothing. Pure data —
   *  any body may wear rows, and a future terrain reaction pass speaks the
   *  same vocabulary. */
  onHitByType?: Partial<Record<DamageType, {
    /** Status applied to the struck body ITSELF. */
    status?: string;
    /** Chance this row fires per qualifying landed hit (default 1). */
    chance?: number;
    /** Payload free-cast from the body at its own position. */
    skillId?: string;
    /** Scales the payload's rolls (default 1). */
    dmgMult?: number;
  }>>;
  /** Seconds between element-response firings (default 0.8). */
  onHitTypeIcd?: number;
  /** TUNABLE (the attunement fabric, engine/tuning.ts): every landed hit's
   *  DOMINANT rolled type becomes this body's TONE — strike a crystal with
   *  fire and it is attuned to fire; batter it back to physical and the
   *  attunement "shatters". A tone CHANGE pulses `attuned_<tone>` onto
   *  everyone near, allies and enemies alike, and the body wears its tone
   *  as the same status (held until retuned). onHitByType's sibling: that
   *  row is a reaction MATRIX (per-type verbs), this is reaction STATE —
   *  and engine/puzzles.ts listens to every change (the chord riddles).
   *  Meant for passive fixture bodies (resonant crystals), but nothing
   *  stops a living bearer from wearing a mood ring. */
  tune?: TuneSpec;
  /** CARRIED GEAR — the Hollowborn's contract: the body spawns WEARING one
   *  real rolled item (createMonster mints it at the body's level) and its
   *  credited kill drops EXACTLY that piece instead of a gear-table roll.
   *  What you see walking is what you get. `chance` gates the roll per spawn;
   *  `rarity`/`category` constrain the mint (an armory fields armor). */
  carry?: {
    chance?: number;
    rarity?: import('../engine/items').ItemRarity;
    category?: import('../engine/items').ItemCategory;
  };
  /** AMBUSH SPAWN: the body is HIDDEN and untargetable — indistinguishable
   *  from scenery — until an enemy strays within `radius`, then it ERUPTS
   *  (reveal flash + announce) and fights normally. The root that was only
   *  a root, the rock that was never a rock. Selection/objectives count it
   *  normally; only the reveal is deferred. */
  ambush?: { radius: number; announce?: string };
  /** SHELL GUARD — a directional ABSORB worn as anatomy (the entity's own
   *  guard, not a skill): hits arriving through the covered arc soak into a
   *  breakable pool that REGROWS after `regenDelay` quiet seconds. side
   *  'rear' = back-armor (fight its face), 'front' = a shield wall (flank
   *  it), 'all' = a full EXOSKELETON (burst it through the break window
   *  before it knits). Composes with `turnSpeed` (a slow shell is a
   *  positional puzzle) and the 'turtle' move style (it ROTATES AWAY to
   *  present the shell). DoTs, ground effects and bursts bypass — shells
   *  block BLOWS. */
  shellGuard?: {
    side: 'rear' | 'front' | 'all';
    /** Pool the shell soaks before breaking. */
    max: number;
    /** Coverage arc in degrees (default 180; ignored for side 'all'). */
    arcDeg?: number;
    /** Quiet seconds (no shell hits) before regrowth begins (default 4). */
    regenDelay?: number;
    /** Pool regrown per second once knitting (default max/6). */
    regenRate?: number;
    color?: string;
    /** The shell BREATHES: its covered arc swells and wanes on `period`
     *  seconds — full coverage at the crest, arc × minFrac (default 0.35)
     *  at the trough. The opening is the fight: time your blows into the
     *  ebb. Directional shells only ('all' has no arc to breathe); the
     *  side glyph renders the LIVE arc, so what you read is what blocks.
     *  `curve` names a CURVES shape (default 'breath'). */
    breathe?: { period: number; minFrac?: number; curve?: CurveKind };
  };
  /** TURN SPEED (radians/sec) — how fast this body can swing its facing.
   *  Omitted = the bestiary default (fast enough to read as natural but no
   *  longer instant). Low values (2-4) make big and shelled bodies LUMBER:
   *  their facing — and so their shell arc and their aim — lags the fight,
   *  and circling them becomes real play. Player seats always turn free. */
  turnSpeed?: number;
  /** LOOTER (the gilded scamp): snatches coveted GROUND drops within reach
   *  into a sack. GRIEF-PROOF BY CONSTRUCTION: player-placed drops are
   *  never touched, a solid blow shakes one piece loose (0.4s icd), and
   *  death spills everything — loot is never lost, only CHASED. Pair with
   *  BehaviorSpec.seek {what:'loot'} so it noses toward shinies while idle. */
  looter?: { kinds?: ('skill' | 'support' | 'gear' | 'vestige' | 'essence')[]; reach?: number };
  /** ESSENCE SPILL (data/essences.ts): striking this body shakes essence
   *  packets onto the ground — the loot-goblin gold-trail beat on OUR
   *  currency. A fixed budget (trail + death pile always sum the same),
   *  level-scaled quantity, ladder-climbed tint. Any def may carry it. */
  essenceSpill?: EssenceSpillSpec;
  /** FLIER: true flight — moves on the noclip policy (over rocks, walls,
   *  chasms, water; zone bounds still hold) and the renderer lifts + bobs
   *  the body off its grounded shadow so flight reads at a glance. Pair
   *  with `levitates` so a flier never falls to the void it crosses.
   *  Flight can also be a WORN STATE: any StatusDef with `flight: true`
   *  (the murmuration's `aloft`) rides the same flag while it lasts. */
  flier?: boolean;
  /** NATURAL GROUP SIZE: when a zone pack rolls this def, the pack sizes
   *  from THIS band instead of the zone's — murmurations field as flocks
   *  of a dozen, hermits walk alone — so group character is the BODY's
   *  fact, not re-authored per tileset row. */
  packSize?: [number, number];
  /** PACK BOND — the synchronic seam: these mods are worn ONLY while a
   *  living bond-holder stands within `radius` (default 520). `kin` names
   *  who holds the bond (a defId, tag or faction); omitted = any living
   *  SQUADMATE. The counterplay is priority: burst the bond-holder first
   *  and the pack softens. */
  bond?: { mods: Modifier[]; kin?: string; radius?: number };
  /** PHASE-WORN MODS — the bond's TEMPORAL twin: these mods are worn only
   *  while the world clock stands in `phases` (world/daynight wheel). The
   *  Night Court's whole rhythm is this one field — the hunter unpinnable
   *  in the dark, the coach's gloom-ward that daylight burns off, the
   *  pallbearer hardest at noon — and any future body joins with one row
   *  (a troll that stiffens at sunrise, a moth-thing that wakes at dusk).
   *  The counterplay is the CLOCK: fight it in its off-hours. Edge-
   *  triggered at one world chokepoint, never re-folded per frame. */
  nocturne?: { phases: ('dawn' | 'day' | 'dusk' | 'night')[]; mods: Modifier[] };
  /** CARRION FEEDER: hurt and out of combat, it noses to the nearest
   *  necromancy corpse within `radius` (default CARRION_CFG.radius) and
   *  EATS — `rate` × max life healed per second; after `time` seconds the
   *  corpse is GONE, denied to every spectre corpse-read and raise skill
   *  sharing the larder. The scavenger and the necromancer fight over the
   *  same bodies — kill the eaters first or lose your material. */
  carrion?: { radius?: number; rate?: number; time?: number };
}

// ---------------------------------------------------------------------------
// MATERIAL NATURE — what a surface material IMPLIES about the body under it,
// read wherever the engine needs an ONTOLOGY, not a shader: REMAINS (does
// death leave a raisable corpse-economy remnant — world.ts kill path + the
// sacrifice lane), BREATH (does the body tire under the default kite
// budget — ai.ts / BEHAVIOR_CFG.defaultKite), and DENSITY (how much BODY per
// unit of silhouette — the mass fabric's third column: the radius-derived
// weight default multiplies by it, so a knee-high iron thrall anchors while
// a man-high wisp flies from a slap; engine/mass.ts + docs/engine/mass.md).
// Density 1 = organic norm; bone stays 1 on purpose (a skeleton is mostly
// air — volume, not substance); a def escapes the verdict with base.weight
// (absolute) or heft (a multiplier that keeps composing). Render materials
// stay in render/vis/materials.ts; THIS table is the gameplay truth beside
// the defs that wear it. A def overrides the first two verdicts with
// `remains:`/`breathes:`; materials absent here read as flesh (organic,
// breathing, density 1) — the safe default for anything alive enough to
// author a monster around.
// ---------------------------------------------------------------------------
export const MATERIAL_NATURE: Record<string, { remains: boolean; breathes: boolean; density?: number }> = {
  flesh:    { remains: true,  breathes: true },
  fur:      { remains: true,  breathes: true },
  scale:    { remains: true,  breathes: true },
  chitin:   { remains: true,  breathes: true },   // spiracles count
  slime:    { remains: true,  breathes: false, density: 0.9 },   // organic, but no lungs; mostly water
  verdant:  { remains: true,  breathes: false },  // plant-flesh: fibrous remains, no breath
  bone:     { remains: true,  breathes: false },  // the dead leave bones; the dead don't tire
  cloth:    { remains: true,  breathes: false, density: 0.85 },  // dressed bodies: mummies, haunt-servants
  wood:     { remains: false, breathes: false, density: 1.15 },  // timber splinters
  stone:    { remains: false, breathes: false, density: 1.6 },   // rubble
  metal:    { remains: false, breathes: false, density: 1.85 },
  crystal:  { remains: false, breathes: false, density: 1.5 },
  ice:      { remains: false, breathes: false, density: 1.3 },   // melts where it falls
  ember:    { remains: false, breathes: false, density: 0.6 },   // cinders scatter
  ethereal: { remains: false, breathes: false, density: 0.35 },  // ghost-stuff dissipates
  void:     { remains: false, breathes: false, density: 0.55 },
};

/** Does this def's death leave a corpse-economy remnant? The def's own
 *  `remains` wins; else its material's nature; unknown materials organic. */
export function defLeavesRemains(def: MonsterDef): boolean {
  return def.remains ?? MATERIAL_NATURE[def.material ?? 'flesh']?.remains ?? true;
}

/** Does this body breathe — i.e. tire under the default kite budget? */
export function defBreathes(def: MonsterDef): boolean {
  return def.breathes ?? MATERIAL_NATURE[def.material ?? 'flesh']?.breathes ?? true;
}

/** How much BODY per unit of silhouette (the mass fabric's density column):
 *  multiplies the radius-derived weight default at spawn. Unknown materials
 *  read organic (1) like everywhere else in the nature table. */
export function defDensity(def: MonsterDef): number {
  return MATERIAL_NATURE[def.material ?? 'flesh']?.density ?? 1;
}

/** One ambient-fauna row: an independent per-zone roll (chance), a band size,
 *  an optional presence envelope / doodad-rim placement hint — and an optional
 *  ARRIVAL LINE (`announce`): floated to the players when the band lands, for
 *  the rows that are an EVENT (the gilded kin), not texture. */
export interface WildlifeRow {
  id: string;
  chance: number;
  count: [number, number];
  presence?: PresenceSpec;
  near?: string;
  /** Floated at the heroes when this row spawns — the "something stirs" beat. */
  announce?: string;
}

/** AMBIENT FAUNA by biome — the living-texture layer. Each row rolls
 *  independently per zone (chance), then spawns count[min,max] bodies as one
 *  squad. Prey ('critter') exists to wander and flee; predators hunt it by
 *  their brains' TargetSpec.prey — the meadow stages its own dramas whether
 *  or not you watch. A new biome's fauna is a new row, never new code. */
export const WILDLIFE: Record<string, WildlifeRow[]> = {
  plains: [
    { id: 'meadow_hare', chance: 0.75, count: [3, 5] },
    { id: 'plains_wolf', chance: 0.4, count: [2, 3] },
    { id: 'lash_maiden', chance: 0.2, count: [2, 3] },
    { id: 'wayfarer_hunter', chance: 0.2, count: [1, 2] },
    { id: 'wayfarer_pilgrim', chance: 0.2, count: [2, 3] },
    { id: 'bloodwing_nest', chance: 0.2, count: [1, 1] },
    { id: 'ant_trail', chance: 0.35, count: [1, 2] },
    { id: 'reed_frog', chance: 0.5, count: [2, 4], near: 'water' },
    // The rare golden flicker at the meadow's edge — chase it.
    { id: 'gilded_scamp', chance: 0.05, count: [1, 1] },
    // The EVENT cousin: rarer, fatter, and it ANNOUNCES itself — a walking
    // essence purse whose whole budget spills, hit by hit or all at the end.
    { id: 'gilded_hoarder', chance: 0.02, count: [1, 1], presence: { from: 4, fadeIn: 3 },
      announce: 'a heavy jingling rings out — something gilded lumbers nearby…' },
  ],
  // Keyed by BIOME TAG (the vocabulary zones/tilesets actually speak — the
  // old 'forest' key matched nothing and its rows never spawned). 'grove'
  // covers deepwood, jungle, meadow and the Verdant Hollow in one stroke.
  grove: [
    { id: 'meadow_hare', chance: 0.6, count: [2, 4] },
    { id: 'gutter_rat', chance: 0.3, count: [2, 4] }, // the Verminfall — undergrowth rats

    { id: 'plains_wolf', chance: 0.5, count: [2, 4] },
    { id: 'thicket_stalker', chance: 0.35, count: [1, 2] },
    { id: 'broodmother', chance: 0.25, count: [1, 1] },
    { id: 'wayfarer_hunter', chance: 0.15, count: [1, 2] },
    { id: 'bloodwing_nest', chance: 0.25, count: [1, 2] },
    { id: 'squirrel', chance: 0.7, count: [2, 4] },
    { id: 'ant_trail', chance: 0.3, count: [1, 2] },
    { id: 'reed_frog', chance: 0.45, count: [2, 3], near: 'water' },
    { id: 'dire_wolf', chance: 0.2, count: [2, 3], presence: { from: 6, fadeIn: 3 } },
    { id: 'gilded_scamp', chance: 0.05, count: [1, 1] },
    { id: 'gilded_hoarder', chance: 0.02, count: [1, 1], presence: { from: 4, fadeIn: 3 },
      announce: 'a heavy jingling rings out — something gilded lumbers nearby…' },
  ],
  // THE FARMLAND: the settled belt's living texture — the pasture grazing
  // (posted, flocking, wolf-hunted through the prey lane), the folk about
  // their yards, the watch at its posts, and the sky's opportunists. The
  // wolves' hunger drives make the fold-raid a scene that stages ITSELF.
  farmland: [
    { id: 'wool_sheep', chance: 0.8, count: [4, 7] },
    { id: 'plow_ox', chance: 0.5, count: [1, 2] },
    { id: 'dooryard_hen', chance: 0.7, count: [3, 6] },
    { id: 'greylag_goose', chance: 0.35, count: [2, 3] },
    { id: 'meadow_hare', chance: 0.5, count: [2, 4] },
    { id: 'crofter', chance: 0.55, count: [2, 4] },
    { id: 'village_warden', chance: 0.4, count: [1, 2] },
    { id: 'plains_wolf', chance: 0.3, count: [2, 3] },
    { id: 'carrion_crow', chance: 0.5, count: [3, 6] },
    { id: 'gilded_scamp', chance: 0.05, count: [1, 1] },
    { id: 'gilded_hoarder', chance: 0.02, count: [1, 1], presence: { from: 4, fadeIn: 3 },
      announce: 'a heavy jingling rings out — something gilded lumbers nearby…' },
  ],
  // THE METROPOLIS: the city's gutter tier — rats and roaches under the
  // stalls, crows on the rooflines, escaped market birds, and the scamp
  // working the richest floors in the world.
  metropolis: [
    { id: 'gutter_rat', chance: 0.7, count: [2, 5] },
    { id: 'gutter_roach', chance: 0.4, count: [2, 4] },
    { id: 'carrion_crow', chance: 0.4, count: [2, 4] },
    { id: 'dooryard_hen', chance: 0.2, count: [2, 4] },
    { id: 'meadow_hare', chance: 0.1, count: [1, 2] },
    { id: 'gilded_scamp', chance: 0.08, count: [1, 1] },
  ],
  desert: [
    { id: 'meadow_hare', chance: 0.3, count: [1, 2] },
    { id: 'sand_skitterer', chance: 0.55, count: [3, 5] },
    { id: 'dune_vulture', chance: 0.45, count: [1, 2] },
    { id: 'lash_maiden', chance: 0.3, count: [2, 3] },
    { id: 'broodmother', chance: 0.2, count: [1, 1] },
    { id: 'sand_scorpion', chance: 0.55, count: [2, 4] },
    { id: 'ant_trail', chance: 0.4, count: [1, 2] },
    // Dunes hide riches too — the hoarder ranges further than its flighty kin.
    { id: 'gilded_hoarder', chance: 0.02, count: [1, 1], presence: { from: 4, fadeIn: 3 },
      announce: 'a heavy jingling rings out — something gilded lumbers nearby…' },
  ],
  // The deep wood: small lives in the roof, hooves and hunters below.
  forest: [
    { id: 'squirrel', chance: 0.8, count: [3, 5] },
    { id: 'meadow_hare', chance: 0.5, count: [2, 3] },
    { id: 'taiga_elk', chance: 0.35, count: [2, 3] },
    { id: 'plains_wolf', chance: 0.5, count: [2, 4] },
    { id: 'thicket_stalker', chance: 0.4, count: [1, 2] },
    { id: 'glow_moth', chance: 0.4, count: [2, 4] },
    { id: 'bloodwing_nest', chance: 0.2, count: [1, 1] },
    { id: 'ant_trail', chance: 0.3, count: [1, 2] },
    { id: 'reed_frog', chance: 0.4, count: [2, 3], near: 'water' },
    { id: 'dire_wolf', chance: 0.25, count: [2, 3], presence: { from: 6, fadeIn: 3 } },
  ],
  // The northern belts: elk herds with wolves on their heels.
  taiga: [
    { id: 'taiga_elk', chance: 0.6, count: [2, 4] },
    { id: 'plains_wolf', chance: 0.45, count: [2, 4] },
    { id: 'meadow_hare', chance: 0.4, count: [2, 3] },
    { id: 'bloodwing_nest', chance: 0.15, count: [1, 1] },
    { id: 'squirrel', chance: 0.45, count: [2, 3] },
    { id: 'dire_wolf', chance: 0.3, count: [2, 3], presence: { from: 6, fadeIn: 3 } },
    { id: 'moon_howler', chance: 0.2, count: [1, 1], presence: { from: 8, fadeIn: 4 } },
  ],
  tundra: [
    { id: 'taiga_elk', chance: 0.5, count: [2, 3] },
    { id: 'meadow_hare', chance: 0.45, count: [2, 4] },
    { id: 'plains_wolf', chance: 0.35, count: [2, 3] },
  ],
  // The wet country: toads in the reeds, herons fishing for them.
  marsh: [
    { id: 'marsh_toad', chance: 0.7, count: [3, 5] },
    { id: 'gutter_roach', chance: 0.35, count: [2, 4] }, // the Verminfall — reed-bank roaches

    { id: 'bog_heron', chance: 0.5, count: [1, 2] },
    { id: 'broodmother', chance: 0.2, count: [1, 1] },
    { id: 'reed_frog', chance: 0.6, count: [2, 4], near: 'water' },
    { id: 'will_o_wisp', chance: 0.35, count: [1, 3] },
    { id: 'quag_gel', chance: 0.45, count: [1, 3] }, // habitat relocates onto gel_pool

    { id: 'marsh_stalker', chance: 0.3, count: [1, 2] },
    { id: 'bloat_mother', chance: 0.2, count: [1, 1], presence: { from: 7, fadeIn: 4 } },
  ],
  grave: [
    { id: 'marsh_toad', chance: 0.35, count: [2, 3] },
    // the Verminfall — the graves keep their own small tenants, and the crows
    // that strip what the graves give up.
    { id: 'gutter_rat', chance: 0.5, count: [2, 4] },
    { id: 'carrion_crow', chance: 0.3, count: [2, 3] },
    { id: 'bog_heron', chance: 0.25, count: [1, 1] },
    { id: 'will_o_wisp', chance: 0.45, count: [1, 3] },
    { id: 'gravemaw_hound', chance: 0.5, count: [2, 3] },
    { id: 'carrion_shrike', chance: 0.4, count: [1, 2] },
    { id: 'pale_watcher', chance: 0.3, count: [1, 1], presence: { from: 9, fadeIn: 4 } },
  ],
  beach: [
    { id: 'shore_crab', chance: 0.7, count: [3, 6] },
    { id: 'bog_heron', chance: 0.4, count: [1, 2] },
  ],
  isle: [
    { id: 'shore_crab', chance: 0.6, count: [2, 5] },
    { id: 'bog_heron', chance: 0.35, count: [1, 2] },
  ],
  highland: [
    { id: 'taiga_elk', chance: 0.45, count: [2, 3] },
    { id: 'meadow_hare', chance: 0.4, count: [2, 3] },
    { id: 'bloodwing_nest', chance: 0.25, count: [1, 2] },
  ],
  // The karst country: sparse dry-stone life — hares grazing the pockets,
  // moths in the gulf-shade, bloodwings nesting the crag rims.
  karst: [
    { id: 'meadow_hare', chance: 0.4, count: [2, 3] },
    { id: 'glow_moth', chance: 0.35, count: [2, 4] },
    { id: 'bloodwing_nest', chance: 0.25, count: [1, 2] },
  ],
  field: [
    { id: 'meadow_hare', chance: 0.7, count: [3, 5] },
    // the Verminfall — grain draws rats; the dead of the open field draw crows.
    { id: 'gutter_rat', chance: 0.4, count: [2, 4] },
    { id: 'carrion_crow', chance: 0.25, count: [2, 3] },
    { id: 'plains_wolf', chance: 0.4, count: [2, 3] },
    { id: 'taiga_elk', chance: 0.3, count: [2, 3] },
    { id: 'bloodwing_nest', chance: 0.2, count: [1, 1] },
    { id: 'wayfarer_pilgrim', chance: 0.2, count: [2, 3] },
  ],
  // The dark keeps its own small lives. (No bare cave_bat row: the def is
  // untagged so PACK bats count toward objectives — ambient bats arrive
  // through the roost's summon rule, which stamps them 'predator'/exempt.)
  cavern: [
    { id: 'glow_moth', chance: 0.65, count: [3, 6] },
    // the Verminfall — the dark's small tenants.
    { id: 'gutter_rat', chance: 0.4, count: [2, 3] },
    { id: 'gutter_roach', chance: 0.55, count: [3, 6] },
    { id: 'bat_roost', chance: 0.45, count: [1, 2] },
  ],
  mycelia: [
    { id: 'glow_moth', chance: 0.5, count: [2, 5] },
    { id: 'gutter_roach', chance: 0.4, count: [2, 4] }, // the Verminfall — rot draws roaches

    { id: 'marsh_toad', chance: 0.35, count: [2, 3] },
  ],
  // The cinder country breathes: wisps rising off the vents (they flee — the
  // land's small lives are still lives).
  volcanic: [
    { id: 'ember_wisp', chance: 0.6, count: [2, 4] },
  ],
  // The lattice hums with moth-light.
  crystal: [
    { id: 'glow_moth', chance: 0.55, count: [2, 4] },
  ],
  // The gloam keeps its small hearts too — moths at the tallow stumps,
  // squirrels that won't be caught.
  gloamwood: [
    { id: 'glow_moth', chance: 0.45, count: [2, 4] },
    { id: 'squirrel', chance: 0.4, count: [2, 3] },
    // Field rats in the stubble — the country's rim is old cropland, and
    // cropland keeps its rats long after it stops keeping farmers.
    { id: 'gutter_rat', chance: 0.35, count: [1, 3] },
  ],
};

/** THE DIVE-CYCLE WHEEL (the murmuration's brain, as a data factory): aloft
 *  ⇄ stoop ⇄ grounded on the script FSM. Aloft: weave the ring flock-heavy —
 *  the orbit outranges every kit tooth, so the sky casts nothing and the
 *  murmuration is pure motion. Stoop: ONE telegraphed dive (visible bar +
 *  the leap's painted landing ring) at whoever pressed within reach — the
 *  early lane desyncs a wheeling flock, the late lane sweeps the rest, and
 *  an unengaged flock never stoops at all: it just murmurates. Grounded:
 *  alight first (idempotent wing-fold, so even a fizzled dive lands the
 *  window honestly), then the caste's own ground conduct — THE melee
 *  player's turn — until the wings come back. */
const wingCycle = (opts: {
  /** The stoop skill cast at the wheel's dive beat ('' = never dives — the
   *  singer merely alights on its clock). */
  dive: string;
  /** Seconds aloft before the dive lanes open / the sweep fires. */
  aloftFor: number;
  /** Seconds the stoop beat owns (bar + air + landing margin). */
  stoopFor: number;
  /** Seconds grounded — the punish window. */
  groundFor: number;
  /** Press range that invites the early stoop. */
  stoopWithin: number;
  /** The aloft tuning (orbit + flock + the trajectory axes). */
  air: BrainTuning;
  /** The grounded tuning (the caste's own feet). */
  ground: BrainTuning;
}): PhaseDef[] => [
  {
    id: 'aloft',
    onEnter: [{ do: 'cast', skill: 'wing_up', force: true }],
    use: opts.air,
    goto: opts.dive
      ? [
        { to: 'stoop', after: opts.aloftFor * 0.55, when: { distUnder: opts.stoopWithin, chance: 0.5 } },
        { to: 'stoop', after: opts.aloftFor, when: { distUnder: opts.stoopWithin + 280 } },
      ]
      : [{ to: 'grounded', after: opts.aloftFor }],
  },
  ...(opts.dive ? [{
    id: 'stoop',
    onEnter: [{ do: 'cast', skill: opts.dive } as const],
    use: { move: { style: 'hold' } } as BrainTuning,
    goto: [{ to: 'grounded', after: opts.stoopFor }],
  } satisfies PhaseDef] : []),
  {
    id: 'grounded',
    onEnter: [{ do: 'cast', skill: 'alight', force: true }],
    use: opts.ground,
    goto: [{ to: 'aloft', after: opts.groundFor }],
  },
];

export const MONSTERS: Record<string, MonsterDef> = {

  zombie: {
    id: 'zombie', name: 'Shambling Zombie',
    color: '#6a8858', shape: 'circle', radius: 14, look: 'zombie',
    base: { life: 36, moveSpeed: 95, accuracy: 60, mana: 0 },
    mods: [mod('chaosRes', 'flat', 0.3)],
    skills: ['claw'],
    xp: 8,
    faction: 'undead',
    detection: 0.55, // shambling — won't notice you until you're close
    // THE DUMB DEAD: a narrow, dim gaze; it FORGETS its quarry mid-shamble
    // (attentionSpan → a vacant daze) unless a fresh wound re-stimulates it;
    // and alarms barely grip it (alertMul 0.15) — struck from the shadows,
    // it paws the air for a breath and goes back to being dead-ish. Walk
    // slow circles around a zombie and it will simply lose the thread.
    brain: {
      type: 'basic',
      perception: { arcDeg: 110, rearMul: 0.2, attentionSpan: [4, 7], alertMul: 0.15 },
      // And slow to REACT (BehaviorSpec.reaction): a long dead-eyed beat
      // between noticing you and remembering what teeth are for.
      behavior: { reaction: [0.6, 1.3] },
      // MINDLESS FEET (pathing 'none'): it walks AT you, wall or no wall —
      // shamblers smear along masonry while the living route around it.
      // And HEEDLESS (the wayfaring lever): the dead wade the bog and the
      // burn uncaring — no ground is priced. The fall veto still holds
      // (mindless is not suicidal; only 'lemming' walks off the rim).
      move: { pathing: 'none', hazards: 'heedless' },
    },
  },

  // The CRAWLING dead: what rises when the legs stayed in the grave. It hauls
  // itself along on its arms — slower than any shamble, easier to put down —
  // but it arrives in broods: the Hiveborn offering births one per corpse fed,
  // so the summoned-from-corpses dead read distinct from raised zombies at a
  // glance (legless silhouette, dragging smear).
  zombie_crawler: {
    id: 'zombie_crawler', name: 'Crawling Zombie',
    color: '#71824e', shape: 'circle', radius: 12, look: 'zombie_crawler',
    base: { life: 26, moveSpeed: 68, accuracy: 60, mana: 0 },
    mods: [mod('chaosRes', 'flat', 0.3)],
    skills: ['claw'],
    xp: 6,
    faction: 'undead',
    detection: 0.5, // it drags itself by smell more than sight
    brain: {
      type: 'basic',
      perception: { arcDeg: 100, rearMul: 0.2, attentionSpan: [3, 6], alertMul: 0.15 },
      // Slower to remember violence than even the walking dead.
      behavior: { reaction: [0.9, 1.6] },
      // Mindless feet: it drags itself straight at you (pathing 'none'),
      // through whatever ground is in the way (heedless — the dead don't
      // price pain; the fall veto still holds).
      move: { pathing: 'none', hazards: 'heedless' },
    },
  },

  skeleton_warrior: {
    id: 'skeleton_warrior', name: 'Skeleton Warrior',
    color: '#cfc8b8', shape: 'ribcage', radius: 13, material: 'bone', look: 'skeleton_warrior',
    // Monsters PAY for their skills like everyone else — they need the mana.
    base: { life: 30, moveSpeed: 150, accuracy: 85, evasion: 40, mana: 30, manaRegen: 4 },
    skills: ['cleave'],
    xp: 9,
    faction: 'undead',
    detection: 0.85,
    // Dead men idle like dead men (SquadSpec.idle 'mixed'): a stable split —
    // half stand vacant where they stopped, half drift aimlessly.
    brain: { type: 'basic', squad: { idle: { style: 'mixed' } } },
  },

  // The healer archetype's bone-and-wing staff: both carry an ally-targeted
  // mend in their kit — the AI's mender pre-pass casts it on the most
  // wounded friend in reach (the summoner included) before any fighting.
  skeletal_cleric: {
    id: 'skeletal_cleric', name: 'Skeletal Cleric',
    color: '#d8e8c8', shape: 'ribcage', radius: 12, material: 'bone', look: 'skeletal_cleric',
    base: { life: 26, moveSpeed: 140, accuracy: 80, evasion: 40, mana: 60, manaRegen: 6 },
    skills: ['soothing_touch', 'claw'],
    xp: 12,
    faction: 'undead',
    detection: 0.9,
  },

  // The HOLLOW BANNERMAN: a dead standard-bearer whose CHALLENGE still
  // carries — his shout TAUNTS the living (your minions wheel onto him;
  // your own blade lands soft elsewhere) while the WAR BANNER on his back
  // rallies the dead around him. The banner is a breakable composite part:
  // tear it down FIRST or fight a rallied host — a priority-target puzzle
  // built from two ordinary data entries.
  hollow_bannerman: {
    id: 'hollow_bannerman', name: 'Hollow Bannerman',
    color: '#b8ae96', shape: 'ribcage', radius: 14, material: 'bone', look: 'skeleton_warrior',
    base: { life: 70, moveSpeed: 118, accuracy: 96, armor: 22, poise: 50, mana: 60, manaRegen: 6 },
    skills: ['challenging_shout', 'cleave'],
    xp: 30, faction: 'undead',
    detection: 0.85,
    parts: [{
      monster: 'war_banner_mast', dx: -0.8, dy: 0, lifeFrac: 0.3, breakDamage: 0.12,
      // Losing the standard takes the wind out of him too.
      breakMods: [mod('damage', 'more', -0.15)],
    }],
  },
  // The banner itself: a planted standard that RALLIES the dead. A full
  // monster def — a composite part today, an entity-creator composable
  // tomorrow (parts ARE monster defs: one entry, both uses).
  war_banner_mast: {
    id: 'war_banner_mast', name: 'War Banner',
    color: '#a83a3a', shape: 'circle', radius: 9, look: 'construct_totem',
    noNemesis: true,
    base: { life: 60, moveSpeed: 0, mana: 120, manaRegen: 8, poise: 40 },
    remains: false, // organic dress, but an OBJECT — no corpse
    skills: ['rallying_howl'],
    xp: 0, faction: 'undead',
    brain: { type: 'artillery' },
  },

  // The cistern-keeper (the conduit pass's guard pole): a barrow sentinel
  // whose WALL is fed by its own deep poise — Stone Communion through the
  // same conduit fabric players build with. Break the carried cistern and
  // the pump chokes: the part IS the counterplay lesson.
  cistern_warden: {
    id: 'cistern_warden', name: 'Cistern Warden',
    color: '#a8b8a0', shape: 'ribcage', radius: 15, material: 'bone', look: 'skeleton_warrior',
    base: { life: 95, moveSpeed: 105, accuracy: 96, armor: 30, poise: 90, mana: 50, manaRegen: 5 },
    skills: ['stone_communion', 'cleave'],
    xp: 34, faction: 'undead',
    detection: 0.8,
    parts: [{
      monster: 'soul_cistern', dx: -0.9, dy: 0.1, lifeFrac: 0.35, breakDamage: 0.1,
      // Crack the jar and the pump chokes to a dribble.
      breakMods: [mod('conduitRate', 'more', -0.6)],
    }],
  },
  // The jar itself: a full monster def — a composite part today, an
  // entity-creator composable tomorrow (parts ARE monster defs).
  soul_cistern: {
    id: 'soul_cistern', name: 'Soul Cistern',
    color: '#8ad0c8', shape: 'circle', radius: 8, look: 'construct_totem',
    noNemesis: true,
    base: { life: 55, moveSpeed: 0, poise: 30 },
    remains: false, // organic dress, but an OBJECT — no corpse
    skills: [],
    xp: 0, faction: 'undead',
  },

  // The grave-priest that CHANNELS the thread while its own blood feeds the
  // working — sanguine_feed granted on lifedrain through the ordinary
  // kit-grant lane (the lane router sockets it), so the monster runs the
  // same conduit fabric players build with: life pays for mana pays for
  // the drain that refills the life. A little perpetual-motion horror.
  transfusion_acolyte: {
    id: 'transfusion_acolyte', name: 'Transfusion Acolyte',
    color: '#b06a7a', shape: 'hexagon', radius: 13, material: 'bone', look: 'barrow_wight',
    base: { life: 60, moveSpeed: 110, accuracy: 95, poise: 30, mana: 55, manaRegen: 4 },
    skills: ['lifedrain', 'claw'],
    grants: [{ atLevel: 1, support: 'sanguine_feed', on: 'lifedrain' }],
    xp: 30, faction: 'undead',
    detection: 0.85,
    brain: { type: 'artillery' },
  },

  // The close-work wraith (#41): fights at arm's length with a small reap.
  blade_wraith: {
    id: 'blade_wraith', name: 'Blade Wraith',
    color: '#9a7ac8', shape: 'diamond', radius: 12, material: 'ethereal', look: 'blade_wraith',
    base: { life: 40, moveSpeed: 175, accuracy: 90, evasion: 60, mana: 40, manaRegen: 5, insight: 35 },
    mods: [mod('chaosRes', 'flat', 0.5)],
    skills: ['whirling_reap', 'claw'],
    xp: 0,
    brain: { type: 'flanker' },
  },

  // THE HARVESTER (the apex minion): one great reaper whose PRESENCE dims
  // the rest of the court and who EATS its lessers to stay fed — presence/
  // devour ride the SUMMON skill (SummonDelivery), not this body, so any
  // future apex reuses the levers. Ordered around via the Reap meta.
  harvester: {
    id: 'harvester', name: 'The Harvester',
    color: '#8a4a68', shape: 'diamond', radius: 19, look: 'reaper',
    base: { life: 150, moveSpeed: 165, accuracy: 100, evasion: 45, mana: 40, manaRegen: 5, insight: 40 },
    mods: [mod('chaosRes', 'flat', 0.5)],
    skills: ['harvester_scythe'],
    xp: 0,
    brain: { type: 'flanker' },
  },

  // The swarm-variant body: a lesser reaper — many where the apex is one.
  lesser_reaper: {
    id: 'lesser_reaper', name: 'Lesser Reaper',
    color: '#a06080', shape: 'diamond', radius: 12, look: 'reaper',
    base: { life: 38, moveSpeed: 180, accuracy: 90, evasion: 55, mana: 30, manaRegen: 4, insight: 30 },
    mods: [mod('chaosRes', 'flat', 0.35)],
    skills: ['whirling_reap', 'claw'],
    xp: 0,
    brain: { type: 'flanker' },
  },

  // The Broodpod's hatchlings: tiny, fast, briefly alive — the incubation
  // payload body (brood_hatch).
  broodling: {
    id: 'broodling', name: 'Broodling',
    color: '#a8c860', shape: 'pentagon', radius: 8, material: 'chitin', look: 'mite',
    base: { life: 16, moveSpeed: 205, accuracy: 75, evasion: 60, mana: 0 },
    skills: ['claw'],
    xp: 0,
    brain: { type: 'swarm' },
  },

  // The broken shard's teeth (Pain Hounds): fast, burning, briefly alive.
  pain_hound: {
    id: 'pain_hound', name: 'Pain Hound',
    color: '#d05a3a', shape: 'rhombus', radius: 10, material: 'fur', look: 'hound',
    base: { life: 24, moveSpeed: 210, accuracy: 85, mana: 0 },
    mods: [mod('fireRes', 'flat', 0.5), mod('addedFire', 'flat', 3, ['melee'])],
    skills: ['claw'],
    xp: 0,
    brain: { type: 'swarm' },
  },

  // The hive's bodies: tiny, fast, disposable — meant to be enraged in a
  // pressed wave (Hivecall's meta-button) and reknit by the contract.
  swarmling: {
    id: 'swarmling', name: 'Swarmling',
    color: '#b8d060', shape: 'pentagon', radius: 7, material: 'chitin', look: 'swarm_bug',
    base: { life: 12, moveSpeed: 200, accuracy: 70, evasion: 60, mana: 0 },
    skills: ['claw'],
    xp: 0,
    brain: { type: 'swarm' },
  },

  // --- THE THRONG's gatherable kinds (engine/throng.ts) ---------------------
  // Bodies you FIND, never cast: unclaimed they stand as sight-gated husks
  // (planted scenery until walked through); claimed they are ordinary
  // minions in every pipeline. Deliberately brittle — the army is a world
  // resource spent by attrition, and its scaling wears the owner's minion
  // investment at 1/batch (the quadratic killer).
  cinderkin: {
    id: 'cinderkin', name: 'Cinderkin',
    color: '#e08848', shape: 'circle', radius: 8, material: 'ember', look: 'imp',
    base: { life: 16, moveSpeed: 205, accuracy: 80, evasion: 55, mana: 0 },
    mods: [mod('fireRes', 'flat', 0.4), mod('coldRes', 'flat', -0.25)],
    skills: ['cinder_bite'],
    xp: 0,
    // The Pikmin blow: reach the quarry, LATCH, and bite while it carries
    // you — shaken off on the clock, scraped off by anything that sweeps.
    cling: { shakeSec: [4, 6.5] },
    // The melee flavor eats the most swings — count-durable (plies), with
    // the tiny life underneath left for DoTs and deliberate detonation.
    plies: { count: 4 },
    brain: { type: 'swarm' },
  },
  palewisp: {
    id: 'palewisp', name: 'Palewisp',
    color: '#b8d8e8', shape: 'diamond', radius: 7, material: 'ethereal', look: 'spirit',
    base: { life: 12, moveSpeed: 190, evasion: 70, mana: 40, manaRegen: 4 },
    // Ghost-flavor: the zap PHASES (walls mean nothing to the dead's
    // aim — the los.ts stat lever), and the body floats.
    mods: [mod('phasing', 'flat', 1)],
    skills: ['pale_zap'],
    xp: 0,
    flier: true, levitates: true,
    // The stand-off flavor eats fewer blows — its safety is distance.
    plies: { count: 2 },
    brain: { type: 'caster' },
  },
  gnatling: {
    id: 'gnatling', name: 'Gnatling',
    color: '#a8b860', shape: 'circle', radius: 4, material: 'chitin', look: 'swarm_bug',
    base: { life: 5, moveSpeed: 230, accuracy: 70, evasion: 80, mana: 0 },
    skills: ['gnat_nip'],
    xp: 0,
    flier: true, levitates: true,
    // The misdirection seed: near-worthless bites, but every rider stacks
    // HARRIED on the carried — a cloud that spoils aim and attention.
    // victimMinRatio 0: a gnat rides anything with a pulse.
    cling: { shakeSec: [2.5, 4], rideStatus: 'harried', victimMinRatio: 0 },
    // One swat, one gnat — but a swat it takes to matter (sub-floor
    // splash never clears the veil by accident).
    plies: { count: 1 },
    brain: {
      type: 'swarm',
      // The murmuration lever: the veil swirls as one cloud in combat
      // (idle heeling rides the throng's own loose ring instead).
      behavior: { flock: { kin: 'def', cohesion: 1.1, separation: 0.9, alignment: 0.8, weave: 1.6, erratic: 1.2 } },
    },
  },

  mender_sprite: {
    id: 'mender_sprite', name: 'Mender Sprite',
    color: '#a8f0c8', shape: 'diamond', radius: 8, material: 'ethereal', look: 'spirit',
    base: { life: 14, moveSpeed: 190, mana: 999, manaRegen: 20 },
    skills: ['soothing_touch'],
    xp: 0,
  },

  // THE CHERUB — Summon Cherub's winged mender (the mender_sprite craft,
  // given wings and a hire clock).
  cherub: {
    id: 'cherub', name: 'Cherub',
    color: '#f8e8c8', shape: 'diamond', radius: 9, material: 'ethereal', look: 'spirit',
    base: { life: 20, moveSpeed: 185, mana: 999, manaRegen: 18, weight: 0.3 },
    skills: ['soothing_touch'],
    xp: 0,
  },
  // THE QUIET SIBYL — selective CC from the other side: her sparks SILENCE
  // (no spells for the struck) — swap verbs or close the distance.
  quiet_sibyl: {
    id: 'quiet_sibyl', name: 'Quiet Sibyl',
    color: '#b8b8e8', shape: 'diamond', radius: 12, material: 'ethereal', look: 'cultist',
    base: { life: 28, moveSpeed: 140, mana: 110, manaRegen: 8 },
    mods: [mod('lightningRes', 'flat', 0.3), mod('apply_silence', 'flat', 0.25)],
    skills: ['spark'],
    xp: 16,
  },
  // THE GRAVE SHAMAN — it does not summon: it RESURRECTS. Every corpse in
  // reach is a soldier again until the bodies are spent or the caller is.
  grave_shaman: {
    id: 'grave_shaman', name: 'Grave Shaman',
    color: '#9a86e8', shape: 'pentagon', radius: 14, material: 'cloth', look: 'necromancer',
    base: { life: 44, moveSpeed: 110, mana: 140, manaRegen: 9, poise: 45 },
    mods: [mod('chaosRes', 'flat', 0.5)],
    skills: ['shamans_call', 'venom_bolt'],
    xp: 20,
    faction: 'undead',
    brain: { type: 'caster' },
  },

  // (Broodclutch's hatchlings reuse the bestiary's existing `broodling` —
  // one body, two doors in: the spider-kin spawn it, and so do your poisons.)
  // THE PLAGUEFATHER — Summon Plaguefather's bloated priest: he spits
  // venom on his own, and his summoner's meta-action (Endow) anoints the
  // whole flock through him.
  plaguefather: {
    id: 'plaguefather', name: 'Plaguefather',
    color: '#5ea838', shape: 'pentagon', radius: 16, material: 'slime', look: 'plague_bearer',
    base: { life: 90, moveSpeed: 105, mana: 120, manaRegen: 8, poise: 40 },
    mods: [mod('chaosRes', 'flat', 0.5)],
    skills: ['venom_bolt'],
    xp: 0,
  },

  // THE PHANTASM — the summon_phantasm proc's brief raging spirit: a pale
  // dart-thrower that exists for a few heartbeats and spends them all
  // throwing. Weightless and phasing (it is barely THERE), so a crowd of
  // them never bodies anyone off a doorway.
  phantasm: {
    id: 'phantasm', name: 'Phantasm',
    color: '#9ad8e8', shape: 'kite', radius: 10, material: 'ethereal', look: 'ghost',
    base: {
      life: 26, moveSpeed: 165, accuracy: 110, evasion: 60, mana: 0,
      weight: 0.2, phasing: 1, poise: 0,
    },
    skills: ['phantasm_bolt'],
    xp: 0,
    noRecall: true,
  },

  skeleton_archer: {
    id: 'skeleton_archer', name: 'Skeleton Archer',
    color: '#d8d0b0', shape: 'ribcage', radius: 12, material: 'bone', look: 'skeleton_archer',
    base: { life: 24, moveSpeed: 130, accuracy: 100, evasion: 50, mana: 0 },
    gemBias: ['projectile'], // the archer's kills lean toward projectile gems
    skills: ['bone_arrow'],
    xp: 11,
    faction: 'undead',
    detection: 1.1, // a watchful sniper
    // THE SENTRY (PerceptionSpec showcase): a keen but NARROW gaze — wider
    // blind flanks reward the sneak — that CALLS THE WATCH when it spots
    // you, and investigates your last position when you slip away.
    brain: {
      type: 'basic',
      perception: { arcDeg: 120, rearMul: 0.25, alertShout: 380, memory: 5 },
    },
  },

  // A shrieking skull of flame: fast, untouchable, briefly alive — the
  // Raging Spirit swarm body (Summon Raging Spirit / Spirit Pyre).
  raging_spirit: {
    id: 'raging_spirit', name: 'Raging Spirit',
    color: '#ff8a4a', shape: 'circle', radius: 8, material: 'ethereal', look: 'spirit',
    base: { life: 18, moveSpeed: 230, accuracy: 90, mana: 0 },
    skills: ['claw'],
    xp: 0,
    untargetable: true,
    detection: 1.2,
    brain: { type: 'swarm' },
  },

  // The hungry spirit on a CURVE, not a clock (Summon Wraith's decay body):
  // a chaos-bolt caster whose exponential rot no healing outruns for long.
  decay_wraith: {
    id: 'decay_wraith', name: 'Wraith',
    color: '#8a6ad8', shape: 'kite', radius: 12, material: 'ethereal', look: 'wraith',
    base: { life: 90, moveSpeed: 150, accuracy: 90, mana: 60, manaRegen: 8 },
    skills: ['venom_bolt'],
    xp: 0,
    detection: 1.1,
  },

  // Bombardment ordnance: zigzags in, arms the fuse, detonates — blast
  // scales with its own max life, so minion-LIFE gems are blast gems.
  bombard_demon: {
    id: 'bombard_demon', name: 'Bombard Demon',
    color: '#e84a2a', shape: 'diamond', radius: 10, look: 'demon_brute',
    base: { life: 30, moveSpeed: 210, accuracy: 80, mana: 0 },
    skills: ['claw'],
    xp: 0,
    detection: 1.3,
    brain: { type: 'bomber', fuseRange: 48, fuseTime: 0.45 },
    explodeOnDeath: 1.6,
    noRecall: true, // ordnance is spent where it lands, never recalled
  },

  // The Vessel-of-Shadow doppelganger: a FLESHED clone of its summoner
  // (mimicOwnerForm wears their silhouette) fighting with its own assassin
  // kit — the minion-scaled Shadow Clone variant. Never spawns wild.
  shadow_self: {
    id: 'shadow_self', name: 'Shadow Self',
    color: '#4a4066', shape: 'circle', radius: 11, material: 'ethereal',
    base: { life: 55, moveSpeed: 190, accuracy: 95, evasion: 80, mana: 40, manaRegen: 6 },
    skills: ['shadow_shuriken', 'shadow_slash'],
    xp: 0,
    detection: 1.1,
    mimicOwnerForm: true,
  },

  // --- PROC KITS: monsters wielding the trigger fabric AGAINST the player.
  // Pure data — a proc_<id> grant in `mods` is the whole kit, so every
  // discipline (chance / ICD / PPM) reads from both sides of the fight.

  // Its bolts CRACKLE: each landed hit may echo as a Thunderstruck burst —
  // dress lightning resistance and don't clump.
  voltaic_shade: {
    id: 'voltaic_shade', name: 'Voltaic Shade',
    color: '#b8a8f8', shape: 'diamond', radius: 12, material: 'ethereal', look: 'wraith',
    base: { life: 30, moveSpeed: 145, mana: 110, manaRegen: 8, evasion: 55 },
    mods: [mod('lightningRes', 'flat', 0.4), mod('proc_thunderstruck', 'flat', 0.3)],
    skills: ['spark'],
    xp: 16,
  },
  // Its KILLS bloom into Sainted Ash — consecrated bursts that HEAL ITS
  // ALLIES and burn yours. A summoner-hunter: feed it minions and it feeds
  // its pack. Cut it down first.
  pyre_acolyte: {
    id: 'pyre_acolyte', name: 'Pyre Acolyte',
    color: '#e8b06a', shape: 'diamond', radius: 13, material: 'cloth', look: 'fire_caster',
    base: { life: 32, moveSpeed: 120, mana: 90, manaRegen: 7 },
    mods: [mod('fireRes', 'flat', 0.4), mod('proc_sainted_ash', 'flat', 1)],
    skills: ['firebolt'],
    xp: 15,
  },
  // A piper whose darts CONJURE: its hits summon phantasms serving IT, at
  // the PPM discipline's pace — kill the piper and the tune ends.
  wraith_piper: {
    id: 'wraith_piper', name: 'Wraith Piper',
    color: '#9ad8e8', shape: 'kite', radius: 13, material: 'ethereal', look: 'wraith',
    base: { life: 34, moveSpeed: 135, mana: 80, manaRegen: 6, weight: 0.6 },
    mods: [mod('chaosRes', 'flat', 0.4), mod('proc_summon_phantasm', 'flat', 1)],
    skills: ['phantasm_bolt'],
    xp: 18,
  },

  fire_cultist: {
    id: 'fire_cultist', name: 'Fire Cultist',
    color: '#d86a3a', shape: 'diamond', radius: 13, material: 'cloth', look: 'fire_caster',
    base: { life: 28, moveSpeed: 125, mana: 100, manaRegen: 8 },
    mods: [mod('fireRes', 'flat', 0.5)],
    skills: ['firebolt'],
    xp: 13,
    // THE VIGIL (SquadSpec.idle 'circle'): the pack's leader stands as a
    // living IDOL and the rest orbit it slowly, eyes inward — a rite in
    // progress you can interrupt, not a mob milling at random.
    brain: {
      type: 'caster',
      squad: { idle: { style: 'circle', ring: 96 } },
    },
  },

  frost_witch: {
    id: 'frost_witch', name: 'Frost Witch',
    color: '#7ab8d8', shape: 'diamond', radius: 13, material: 'cloth', look: 'frost_caster',
    base: { life: 32, moveSpeed: 120, mana: 120, manaRegen: 8 },
    mods: [mod('coldRes', 'flat', 0.5)],
    skills: ['frostbolt', 'frost_nova', 'ice_spear'],
    xp: 15,
    // A KIT WITH A SPINE (SkillPolicy showcase): priority order instead of
    // the weighted roll — the nova punishes anyone in her face, the spear
    // takes the long shot, the bolt fills. Same skills, sharper witch.
    brain: {
      type: 'caster',
      skillUse: { mode: 'priority', order: ['frost_nova', 'ice_spear', 'frostbolt'] },
    },
  },

  storm_acolyte: {
    id: 'storm_acolyte', name: 'Storm Acolyte',
    color: '#c8d84a', shape: 'diamond', radius: 12, material: 'cloth', look: 'storm_caster',
    base: { life: 26, moveSpeed: 140, mana: 110, manaRegen: 8 },
    mods: [mod('lightningRes', 'flat', 0.5)],
    skills: ['spark'],
    xp: 14,
    // On death it discharges a CONTACT orb — a homing ball of lightning that bursts the
    // instant it touches you, a minion, or a wall (or after its drift duration, whichever
    // first). The yellow tint reads "lightning — dress lightning resistance".
    deathBurst: { mode: 'orb', damageFrac: 0.7, damageType: 'lightning', detonateOnContact: true, coalesce: 0.5, orbDuration: 3.0, orbSpeed: 130, orbTurn: 2.0, radius: 78 },
    // Acolytes ARC to each other in cycles — the pack fights as a circuit;
    // don't stand between them while the current holds.
    tether: { dps: 6, damageType: 'lightning', width: 10, radius: 300, period: 7, duty: 3.2 },
  },

  // --- CONCLAVE: the Occult + Eldritch (conclave-only factions) -------------
  // Stationary ritualist: moveSpeed 0 ⇒ anchored (createMonster). ~150% of a
  // normal monster's life (a 'more' mod over the baseline level scaling) so that
  // at the ~66% rouse threshold the remaining pool ≈ a normal foe and it shrugs
  // off random splash damage. NEUTRAL until roused (engine dormancy on the ritual
  // tag); a ranged firebolt for the wounded one to retaliate with (it can't move).
  conclave_cultist: {
    id: 'conclave_cultist', name: 'Occult Cultist',
    color: '#a86ad8', shape: 'pentagon', radius: 13, material: 'cloth', look: 'cultist',
    base: { life: 40, moveSpeed: 0, accuracy: 80, mana: 100, manaRegen: 8 },
    mods: [mod('chaosRes', 'flat', 0.3), mod('life', 'more', 0.5)],
    skills: ['firebolt'],
    xp: 22,
    faction: 'occult',
    detection: 0.9,
  },

  // What a slain cultist's blood may erupt into — a fast Eldritch bruiser, hostile
  // to the player AND (via faction relations) to the surviving Occult.
  conclave_blood_demon: {
    id: 'conclave_blood_demon', name: 'Blood Demon',
    color: '#c2362b', shape: 'diamond', radius: 15, look: 'demon_brute',
    base: { life: 80, moveSpeed: 145, accuracy: 95, mana: 40, manaRegen: 5 },
    mods: [mod('chaosRes', 'flat', 0.4), mod('fireRes', 'flat', 0.3)],
    skills: ['cleave'],
    brain: { type: 'swarm' },
    xp: 34,
    faction: 'eldritch',
    detection: 1.3,
  },

  // The Eldritch warlord — the apex of the faction + the future Pass-2 spread
  // leader. A lumbering horror; never fielded in Pass 1 generation (conclave-only),
  // seated here so the faction is complete and its route can grow.
  conclave_eldritch_horror: {
    id: 'conclave_eldritch_horror', name: 'Eldritch Horror',
    color: '#8a1e2e', shape: 'star', radius: 21, material: 'void', look: 'deep_horror',
    base: { life: 220, moveSpeed: 118, accuracy: 110, mana: 60, manaRegen: 6 },
    mods: [mod('chaosRes', 'flat', 0.5), mod('fireRes', 'flat', 0.3), mod('coldRes', 'flat', 0.3)],
    skills: ['cleave'],
    brain: { type: 'juggernaut', enrage: 0.4 },
    boss: true,
    xp: 120,
    faction: 'eldritch',
    scaling: { life: { incPerLevel: 0.1 } },
    detection: 1.2,
  },

  // --- AMALGAMATION: the Necromancer + the parts-bosses (amalgam-only faction) -
  // The build-your-own-boss giver: NEUTRAL, INERT, and UNHITTABLE — passive (never
  // acts, ignored by AI), invulnerable + untargetable (the player can't strike it),
  // rooted (moveSpeed 0 ⇒ anchored). It only ever hands out work via DWELL; the
  // engine tags it 'amalgam_necromancer'. faction 'amalgam' (contexts-gated) keeps
  // it — and its undead — out of ordinary generation (appears only at its site).
  amalgam_necromancer: {
    id: 'amalgam_necromancer', name: 'the Bonewright', npcRole: 'bonewright',
    color: '#9ad0b0', shape: 'pentagon', radius: 15, material: 'cloth', look: 'necromancer',
    base: { life: 100, moveSpeed: 0, mana: 0 },
    skills: [],
    xp: 0,
    faction: 'amalgam',
    passive: true,
    invulnerable: true,
    untargetable: true,
  },

  // The rare undead MINIBOSSES a quest sends you to slay — one per body part the
  // Bonewright covets. The engine promotes each to a rarity tier on spawn, so they
  // read as real bosses; their kits differ so the hunts feel distinct.
  amalgam_bonelord: {
    id: 'amalgam_bonelord', name: 'Bonelord',
    color: '#d8d0b8', shape: 'ribcage', radius: 18, material: 'bone', look: 'lich',
    base: { life: 120, moveSpeed: 132, accuracy: 110, mana: 60, manaRegen: 6 },
    mods: [mod('chaosRes', 'flat', 0.4)],
    skills: ['cleave', 'ground_slam'],
    brain: { type: 'juggernaut', enrage: 0.4 },
    boss: true,
    xp: 70,
    faction: 'amalgam',
    scaling: { life: { incPerLevel: 0.12 } },
    detection: 1.1,
  },
  amalgam_fleshweaver: {
    id: 'amalgam_fleshweaver', name: 'Fleshweaver',
    color: '#b04858', shape: 'star', radius: 17, look: 'necromancer',
    base: { life: 100, moveSpeed: 124, accuracy: 110, mana: 140, manaRegen: 8 },
    mods: [mod('chaosRes', 'flat', 0.4), mod('lifeLeech', 'flat', 0.04)],
    skills: ['firebolt', 'flame_wave'],
    brain: { type: 'caster' },
    boss: true,
    xp: 70,
    faction: 'amalgam',
    scaling: { life: { incPerLevel: 0.1 } },
    detection: 1.3,
  },
  amalgam_gravewarden: {
    id: 'amalgam_gravewarden', name: 'Gravewarden',
    color: '#6a8a9a', shape: 'circle', radius: 19, material: 'bone', look: 'crypt_warden',
    base: { life: 150, moveSpeed: 110, accuracy: 105, armor: 30, mana: 50, manaRegen: 5 },
    mods: [mod('coldRes', 'flat', 0.4), mod('damageTaken', 'more', -0.08)],
    skills: ['heavy_strike', 'war_cry'],
    brain: { type: 'commander' },
    boss: true,
    xp: 70,
    faction: 'amalgam',
    scaling: { life: { incPerLevel: 0.14 } },
    detection: 1.0,
  },

  // THE AMALGAMATION — the BASE the player's chosen body parts build upon. Spawned
  // with tag 'amalgam_boss'; riseAmalgamation grafts the chosen parts' stat mods,
  // skills, and supports on top (see packages/overlays/amalgamation.ts AMALGAM_PARTS)
  // and Crowns it. Deliberately a modest base so the PARTS define its threat + spoils.
  amalgam_horror: {
    id: 'amalgam_horror', name: 'Amalgamation',
    color: '#8ac0a0', shape: 'star', radius: 24, look: 'gravemaw',
    base: { life: 240, moveSpeed: 122, accuracy: 115, mana: 140, manaRegen: 8, armor: 20 },
    mods: [mod('chaosRes', 'flat', 0.4)],
    skills: ['cleave'],
    brain: { type: 'juggernaut', enrage: 0.35 },
    boss: true,
    xp: 160,
    faction: 'amalgam',
    scaling: { life: { incPerLevel: 0.12 } },
    detection: 1.2,
  },

  // --- DESCENT: the Delver NPC + the Depthkin (descent-only faction) -----------
  // The Delver: a neutral, INERT, UNHITTABLE shaft-keeper — passive (never acts,
  // ignored by AI), invulnerable + untargetable, rooted (moveSpeed 0). Dwell it for
  // wares; dwell its platform to descend. Tagged 'descent_delver' by the engine.
  descent_delver: {
    id: 'descent_delver', name: 'the Delver', npcRole: 'delver',
    color: '#7fe0d8', shape: 'pentagon', radius: 14, look: 'npc_delver',
    base: { life: 100, moveSpeed: 0, mana: 0 },
    skills: [],
    xp: 0,
    faction: 'depthkin',
    passive: true,
    invulnerable: true,
    untargetable: true,
  },

  // The DEPTHKIN — pale things bred in the lightless deep. They press the claustro-
  // phobia: a swarming crawler, a STEALTH lurker (assassin brain → stalks shrouded,
  // strikes, melts away), a ranged seer, and a heavy brute. contexts:['descent']
  // (on the faction spec) keeps them out of all ordinary generation.
  depthkin_crawler: {
    id: 'depthkin_crawler', name: 'Depth Crawler',
    color: '#9aa8c8', shape: 'diamond', radius: 12, material: 'chitin', look: 'swarm_bug',
    base: { life: 26, moveSpeed: 168, accuracy: 90, mana: 0 },
    mods: [mod('coldRes', 'flat', 0.3)],
    skills: ['claw'],
    brain: { type: 'swarm' },
    xp: 11,
    faction: 'depthkin',
    detection: 1.4,
    scaling: { life: { incPerLevel: 0.1 } },
  },
  depthkin_lurker: {
    id: 'depthkin_lurker', name: 'Depth Lurker',
    color: '#5a6a8a', shape: 'triangle', radius: 13, look: 'deep_horror',
    base: { life: 40, moveSpeed: 156, accuracy: 110, mana: 30, manaRegen: 4, insight: 30 },
    mods: [mod('coldRes', 'flat', 0.3), mod('chaosRes', 'flat', 0.3)],
    skills: ['heavy_strike', 'cleave'],
    brain: { type: 'assassin', withdraw: 1.2 }, // stalks shrouded → strikes → melts away
    xp: 18,
    faction: 'depthkin',
    detection: 1.5,
    scaling: { life: { incPerLevel: 0.1 } },
  },
  depthkin_seer: {
    id: 'depthkin_seer', name: 'Depth Seer',
    color: '#7f9ad8', shape: 'star', radius: 13, look: 'hexer',
    base: { life: 36, moveSpeed: 120, accuracy: 110, mana: 120, manaRegen: 8 },
    mods: [mod('coldRes', 'flat', 0.4)],
    skills: ['frostbolt'],
    brain: { type: 'strafer' },
    xp: 18,
    faction: 'depthkin',
    detection: 1.4,
    scaling: { life: { incPerLevel: 0.1 } },
  },
  depthkin_brute: {
    id: 'depthkin_brute', name: 'Depth Brute',
    color: '#6a6a86', shape: 'circle', radius: 18, look: 'troll',
    base: { life: 120, moveSpeed: 116, accuracy: 105, armor: 24, mana: 30, manaRegen: 4, poise: 45 },
    mods: [mod('coldRes', 'flat', 0.4), mod('damageTaken', 'more', -0.08)],
    skills: ['ground_slam', 'heavy_strike'],
    brain: { type: 'juggernaut', enrage: 0.4 },
    xp: 26,
    faction: 'depthkin',
    detection: 1.1,
    scaling: { life: { incPerLevel: 0.13 } },
  },

  // --- THE DEEP: a frost/water faction that haunts the marine biome -----------
  // Cold-bitten things of the drowned dark. They spawn via the marine tileset pack
  // tables (faction 'deep'); contexts:['marine'] keeps them out of baseline gen.
  deep_thresher: {
    id: 'deep_thresher', name: 'Tide Thresher',
    color: '#4a9ad8', shape: 'diamond', radius: 13, material: 'chitin', look: 'deep_horror',
    base: { life: 30, moveSpeed: 158, accuracy: 92, mana: 0 },
    mods: [mod('coldRes', 'flat', 0.5)],
    skills: ['claw'],
    brain: { type: 'swarm' },
    xp: 12,
    faction: 'deep',
    detection: 1.3,
    scaling: { life: { incPerLevel: 0.1 } },
  },
  deep_angler: {
    id: 'deep_angler', name: 'Abyssal Angler',
    color: '#2a5a8a', shape: 'triangle', radius: 14, material: 'slime', look: 'angler',
    base: { life: 46, moveSpeed: 150, accuracy: 108, mana: 30, manaRegen: 4 },
    mods: [mod('coldRes', 'flat', 0.5), mod('chaosRes', 'flat', 0.2)],
    skills: ['heavy_strike', 'claw'],
    brain: { type: 'assassin', withdraw: 1.2 }, // a lightless lure — stalks then strikes
    xp: 19,
    faction: 'deep',
    detection: 1.5,
    scaling: { life: { incPerLevel: 0.1 } },
  },
  deep_tidecaller: {
    id: 'deep_tidecaller', name: 'Tidecaller',
    color: '#6ac8e8', shape: 'star', radius: 14, look: 'frost_caster',
    base: { life: 40, moveSpeed: 120, accuracy: 110, mana: 140, manaRegen: 8 },
    mods: [mod('coldRes', 'flat', 0.6)],
    skills: ['frostbolt', 'frost_nova'],
    brain: { type: 'strafer' },
    xp: 20,
    faction: 'deep',
    detection: 1.4,
    scaling: { life: { incPerLevel: 0.1 } },
  },
  deep_leviathan: {
    id: 'deep_leviathan', name: 'Drowned Leviathan',
    color: '#2a7a9a', shape: 'circle', radius: 24, material: 'slime', look: 'deep_horror',
    base: { life: 220, moveSpeed: 110, accuracy: 108, armor: 28, mana: 40, manaRegen: 5 },
    mods: [mod('coldRes', 'flat', 0.6), mod('damageTaken', 'more', -0.1)],
    skills: ['ground_slam', 'heavy_strike'],
    brain: { type: 'juggernaut', enrage: 0.4 },
    boss: true,
    xp: 70,
    faction: 'deep',
    detection: 1.1,
    scaling: { life: { incPerLevel: 0.14 } },
  },

  // --- THE DROWNED COURT: the Deep's sunken nobility --------------------------
  // The court of a kingdom the sea swallowed whole, still keeping state in the
  // dark. They crew the WRAITHSAIL when the storm rides, walk ashore only where
  // she docks, and hold the deepest fathoms of the open ocean (HARD presence
  // floors — nobility does not attend shallow water). Family counterlevers:
  // the drowned are cold-kin (coldRes high) but waterlogged flesh CONDUCTS
  // (lightningRes in debt) — the texture doctrine's answer lever. Each body
  // defends a DIFFERENT way (no one build beats the court): a spongy soak, a
  // breathing tide-shield, ES-glass, an evasion duelist, a poise anchor. The
  // ghost crew wear their strength by dusk and dark (the nocturne fabric —
  // dawn finds them thinner). CROWNLESS in WARLORD_OF like the Chitin and the
  // Sarcophate: the Tidebound Regent is the Wraithsail's flagship boss, never
  // a marching warlord — the sea keeps its own borders.
  drowned_oarsman: {
    id: 'drowned_oarsman', name: 'Drowned Oarsman',
    color: '#4a7a80', shape: 'square', radius: 12, material: 'cloth', look: 'drowned_oarsman',
    base: { life: 36, moveSpeed: 118, accuracy: 96, mana: 0 },
    // The soak: blows sink IN — muffled, not turned. Burst lands soft here;
    // sustain wrings them out. (And the water remembers lightning.)
    mods: [mod('coldRes', 'flat', 0.5), mod('lightningRes', 'flat', -0.25), mod('damageTaken', 'more', -0.12)],
    nocturne: { phases: ['dusk', 'night'], mods: [mod('moveSpeed', 'increased', 0.15), mod('damage', 'more', 0.2)] },
    skills: ['tide_lash', 'claw'],
    brain: { type: 'swarm' },
    xp: 15,
    faction: 'deep',
    detection: 1.2,
    scaling: { life: { incPerLevel: 0.1 } },
  },
  barnacle_knight: {
    id: 'barnacle_knight', name: 'Barnacle Knight',
    color: '#3f6a60', shape: 'square', radius: 15, material: 'chitin', look: 'barnacle_knight',
    base: { life: 92, moveSpeed: 92, accuracy: 102, armor: 20, poise: 35, mana: 20, manaRegen: 3 },
    mods: [mod('coldRes', 'flat', 0.6), mod('lightningRes', 'flat', -0.25)],
    // THE TIDE-SHIELD: a breathing front shell — full at the crest, a sliver
    // at the ebb (the whelk's lever at soldier scale). Crack the line at low
    // tide, then commit through real poise: the sustain-then-burst pole.
    shellGuard: { side: 'front', max: 65, arcDeg: 150, regenDelay: 5, regenRate: 9, breathe: { period: 6, minFrac: 0.3 }, color: '#7ad8c8' },
    turnSpeed: 2.6,
    aggro: { fixation: 1.4, fury: 0.8, waver: 0.7 },
    skills: ['heavy_strike', 'tide_lash'],
    brain: { type: 'juggernaut' },
    xp: 28,
    faction: 'deep',
    detection: 1.1,
    scaling: { life: { incPerLevel: 0.1 }, armor: { flatPerLevel: 0.8 } },
  },
  tide_vicar: {
    id: 'tide_vicar', name: 'Tide Vicar',
    color: '#3a6a8a', shape: 'star', radius: 13, material: 'cloth', look: 'tide_vicar',
    // ES-glass: the sea's benediction is a second life of cold light over
    // very little meat — burst deletes him between recharges; sustain fights
    // the gate. He drags the drowning pool with him and mends the court.
    base: { life: 34, energyShield: 110, moveSpeed: 112, accuracy: 108, mana: 150, manaRegen: 9 },
    mods: [mod('coldRes', 'flat', 0.6), mod('lightningRes', 'flat', -0.3)],
    skills: ['undertow', 'frostbolt', 'mending_pulse'],
    brain: { type: 'strafer' },
    xp: 30,
    faction: 'deep',
    detection: 1.3,
    scaling: { life: { incPerLevel: 0.1 } },
  },
  sunken_courtier: {
    id: 'sunken_courtier', name: 'Sunken Courtier',
    color: '#4a5a76', shape: 'triangle', radius: 12, material: 'cloth', look: 'sunken_courtier',
    // The duelist: evasion over everything — rotted finery weighs nothing
    // now. Accuracy investment and honest AoE punish the courtesies.
    base: { life: 44, moveSpeed: 148, accuracy: 118, evasion: 85, mana: 20, manaRegen: 3 },
    mods: [mod('coldRes', 'flat', 0.5), mod('lightningRes', 'flat', -0.25)],
    nocturne: { phases: ['dusk', 'night'], mods: [mod('evasion', 'more', 0.45), mod('damage', 'more', 0.15)] },
    skills: ['tide_lash', 'claw'],
    brain: { type: 'flanker', move: { style: 'weave' } },
    xp: 22,
    faction: 'deep',
    detection: 1.3,
    scaling: { life: { incPerLevel: 0.1 } },
  },
  anchor_wight: {
    id: 'anchor_wight', name: 'Anchor Wight',
    color: '#38584e', shape: 'hexagon', radius: 17, material: 'chitin', look: 'anchor_wight',
    // The poise pole: the anchor is the argument — no shell, no dodging,
    // just a break-bar you commit through while the chain comes around.
    base: { life: 135, moveSpeed: 78, accuracy: 98, armor: 16, poise: 80, mana: 30, manaRegen: 4 },
    mods: [mod('coldRes', 'flat', 0.6), mod('lightningRes', 'flat', -0.3)],
    turnSpeed: 2.4,
    aggro: { fixation: 1.5, fury: 0.7, waver: 0.8 },
    skills: ['ground_slam', 'drowning_grasp'],
    brain: { type: 'juggernaut' },
    xp: 34,
    faction: 'deep',
    detection: 1.0,
    scaling: { life: { incPerLevel: 0.12 } },
  },
  // The Wraithsail's flagship boss — spawned by the boarding chain's great
  // cabin (boss objective) and nowhere else: never in a pack table, never a
  // warlord. His rhythm is the family signature at boss scale: the TIDE COMES
  // IN (tideward_swell — a ward you should not hit into) and the tide goes
  // OUT (the decay window where he is honest meat). Event spoils ride
  // MonsterDef.loot (the tidebound hoard).
  tidebound_regent: {
    id: 'tidebound_regent', name: 'The Tidebound Regent',
    color: '#2c5a6a', shape: 'star', radius: 21, material: 'cloth', look: 'tidebound_regent',
    base: { life: 400, moveSpeed: 104, accuracy: 118, armor: 28, poise: 60, mana: 170, manaRegen: 10 },
    mods: [mod('coldRes', 'flat', 0.75), mod('lightningRes', 'flat', -0.2), mod('damageTaken', 'more', -0.1)],
    skills: ['tideward_swell', 'tide_lash', 'drowning_grasp', 'frost_nova'],
    brain: {
      type: 'commander',
      rules: [{
        when: { distUnder: 560 }, every: [15, 21], hold: [0.4, 0.6],
        announce: 'The Regent calls the watch below!',
        actions: [{ do: 'summon', monster: 'drowned_oarsman', count: 2, ring: 68 }],
      }],
      phases: [
        { atLifeFrac: 0.55, mods: [mod('attackSpeed', 'increased', 0.2), mod('castSpeed', 'increased', 0.2)] },
        { atLifeFrac: 0.25, mods: [mod('damage', 'more', 0.25), mod('moveSpeed', 'increased', 0.15)] },
      ],
    },
    boss: true,
    xp: 150,
    faction: 'deep',
    detection: 1.2,
    loot: 'tidebound_hoard',
    scaling: { life: { incPerLevel: 0.14 } },
  },
  // A breakable in the barrel's mold: the Wraithsail's below-decks coffer.
  // Salt-swollen banded oak, barnacled shut — crack it for the DROWNED
  // REGISTER (loot 'wraithsail_hold_cache' forces the family via withFamily,
  // and holds run the richest vestige side-roll of any themed cache).
  drowned_coffer: {
    id: 'drowned_coffer', name: 'Drowned Coffer',
    color: '#4a5a4e', shape: 'square', radius: 13, material: 'wood', look: 'drowned_coffer',
    base: { life: 75, moveSpeed: 0, armor: 18, evasion: 0, mana: 0 },
    skills: [], xp: 0,
    passive: true,
    orbDrops: 0.35,
    loot: 'wraithsail_hold_cache',
  },

  spitting_horror: {
    id: 'spitting_horror', name: 'Spitting Horror',
    color: '#86a848', shape: 'triangle', radius: 15, material: 'chitin', look: 'spitting_horror',
    base: { life: 40, moveSpeed: 110, mana: 80, manaRegen: 6 },
    mods: [mod('chaosRes', 'flat', 0.6)],
    skills: ['venom_bolt', 'claw'],
    xp: 14,
    faction: 'wild',
  },

  brute: {
    id: 'brute', name: 'Pit Brute',
    color: '#a85848', shape: 'circle', radius: 20, look: 'brute',
    base: { life: 90, moveSpeed: 105, accuracy: 90, armor: 30, mana: 60, manaRegen: 6 },
    skills: ['heavy_strike', 'cleave'],
    xp: 26,
  },

  // --- Boss: a full multi-skill kit, same system as everything else --------

  pit_lord: {
    id: 'pit_lord', name: 'Lord of the Pit',
    color: '#c03838', shape: 'circle', radius: 28, look: 'demon_lord',
    base: { life: 420, moveSpeed: 115, accuracy: 120, armor: 50, mana: 200, manaRegen: 12 },
    mods: [
      mod('fireRes', 'flat', 0.4),
      mod('damage', 'increased', 0.3),
      mod('aoeRadius', 'increased', 0.3),
    ],
    // The balrog CHANNELS: infernal_ray is the compounding siege beam —
    // aiHold keeps it burning a couple of seconds a pass (D2 pit-demon
    // inferno, through the exact skill the player channels).
    skills: ['ground_slam', 'infernal_rift', 'heavy_strike', 'war_cry', 'infernal_ray'],
    xp: 150,
    boss: true,
  },

  // A graveyard miniboss that fights like a summoner: raises skeletons
  // through the SAME summon pipeline the player uses, and curses intruders.
  gravecaller: {
    id: 'gravecaller', name: 'The Gravecaller',
    color: '#9a86d8', shape: 'diamond', radius: 20, material: 'cloth', look: 'necromancer',
    base: { life: 240, moveSpeed: 100, accuracy: 110, mana: 240, manaRegen: 14 },
    mods: [
      mod('chaosRes', 'flat', 0.5),
      mod('minionDamage', 'increased', 0.3),
      mod('minionLife', 'increased', 0.3),
    ],
    skills: ['raise_dead', 'bone_arrow', 'despair'],
    xp: 110,
    boss: true,
  },

  // --- The war-band: brains + shapes as the enemy-type language -------------
  // Swarmers are tiny circles/pentagons; skirmishers hexagons; LOS casters
  // hexagons/octagons; bombers diamonds; juggernauts huge octagons; assassins
  // stars; commanders crosses; worms are multi-circle bodies.

  blood_mite: {
    id: 'blood_mite', name: 'Blood Mite',
    color: '#c84848', shape: 'circle', radius: 7, material: 'chitin', look: 'mite',
    base: { life: 12, moveSpeed: 175, accuracy: 70, mana: 0 },
    skills: ['claw'],
    xp: 3,
    brain: { type: 'swarm' },
    faction: 'wild',
    detection: 1.6, // tiny, but it smells blood from far off
  },

  husk_swarmer: {
    id: 'husk_swarmer', name: 'Husk Swarmer',
    color: '#b89858', shape: 'pentagon', radius: 10, material: 'chitin', look: 'swarm_bug',
    base: { life: 22, moveSpeed: 160, accuracy: 80, mana: 0 },
    skills: ['claw'],
    xp: 5,
    brain: { type: 'swarm' },
    faction: 'wild',
  },

  dune_stalker: {
    id: 'dune_stalker', name: 'Dune Stalker',
    color: '#d8b878', shape: 'hexagon', radius: 13, material: 'chitin', look: 'scorpion',
    base: { life: 34, moveSpeed: 170, accuracy: 95, evasion: 70, mana: 0 },
    skills: ['claw'],
    xp: 13,
    brain: { type: 'skirmish', withdraw: 1.4 },
    faction: 'wild',
    detection: 1.4, // an ambush predator, eyes everywhere
  },

  javelin_skirmisher: {
    id: 'javelin_skirmisher', name: 'Javelin Skirmisher',
    color: '#c8c890', shape: 'triangle', radius: 12, look: 'spearman',
    base: { life: 28, moveSpeed: 155, accuracy: 105, evasion: 60, mana: 0, insight: 30 },
    skills: ['bone_arrow'],
    xp: 14,
    brain: { type: 'skirmish', withdraw: 2 },
  },

  hex_weaver: {
    id: 'hex_weaver', name: 'Hex Weaver',
    color: '#a8d848', shape: 'hexagon', radius: 13, material: 'cloth', look: 'hexer',
    base: { life: 30, moveSpeed: 125, mana: 120, manaRegen: 9 },
    mods: [mod('lightningRes', 'flat', 0.4)],
    skills: ['spark', 'despair'],
    xp: 16,
    brain: { type: 'caster' },
  },

  pyroclast_magus: {
    id: 'pyroclast_magus', name: 'Pyroclast Magus',
    color: '#ff8438', shape: 'octagon', radius: 14, material: 'cloth', look: 'fire_caster',
    base: { life: 44, moveSpeed: 120, mana: 160, manaRegen: 10 },
    mods: [mod('fireRes', 'flat', 0.6)],
    skills: ['firebolt', 'meteor_storm'],
    xp: 24,
    brain: { type: 'caster' },
  },

  volatile_zealot: {
    id: 'volatile_zealot', name: 'Volatile Zealot',
    color: '#ff6446', shape: 'diamond', radius: 11, look: 'zealot_burning',
    base: { life: 26, moveSpeed: 185, accuracy: 60, mana: 0 },
    mods: [mod('fireRes', 'flat', 0.5)],
    skills: [],
    xp: 12,
    brain: { type: 'bomber', fuseRange: 52, fuseTime: 0.65 },
    // The namesake "volatile" death: rushes in, pops, then leaves a tracking fire orb
    // that hounds you for a beat before arming (PoE Volatile/Bearer). Escapable by design —
    // orbSpeed stays under the player's, and orbDuration rides effectDuration. No `color` →
    // it takes the canonical FIRE tint, so the player reads "fire — dress fire resistance".
    deathBurst: { mode: 'orb', damageFrac: 1.0, damageType: 'fire', coalesce: 0.5, orbDuration: 2.4, orbSpeed: 120, orbTurn: 2.2, radius: 86 },
  },

  bone_colossus: {
    id: 'bone_colossus', name: 'Bone Colossus',
    color: '#d8d0c0', shape: 'octagon', radius: 30, material: 'bone', look: 'bone_colossus',
    base: { life: 320, moveSpeed: 70, accuracy: 95, armor: 60, mana: 40, manaRegen: 4, poise: 90, poiseDR: 0.45 },
    mods: [mod('chaosRes', 'flat', 0.4)],
    skills: ['crushing_leap', 'heavy_strike'],
    xp: 55,
    brain: { type: 'juggernaut', enrage: 0.35 },
  },

  tundra_behemoth: {
    id: 'tundra_behemoth', name: 'Tundra Behemoth',
    color: '#a8c8d8', shape: 'hexagon', radius: 28, material: 'fur', look: 'behemoth_tundra',
    base: { life: 380, moveSpeed: 75, accuracy: 90, armor: 45, mana: 30, manaRegen: 3, poise: 85 },
    mods: [mod('coldRes', 'flat', 0.75)],
    skills: ['ground_slam', 'claw'],
    xp: 60,
    brain: { type: 'juggernaut', enrage: 0.4 },
  },

  gloom_stalker: {
    id: 'gloom_stalker', name: 'Gloom Stalker',
    color: '#9080c8', shape: 'star', radius: 12, material: 'fur', look: 'stalker',
    base: { life: 45, moveSpeed: 195, accuracy: 115, evasion: 110, mana: 50, manaRegen: 8 },
    skills: ['backstab'],
    xp: 24,
    brain: { type: 'assassin', withdraw: 1.5 },
  },

  warband_chieftain: {
    id: 'warband_chieftain', name: 'Warband Chieftain',
    color: '#e8a040', shape: 'cross', radius: 16, material: 'metal', look: 'warchief',
    base: { life: 130, moveSpeed: 115, accuracy: 100, armor: 30, mana: 80, manaRegen: 6, poise: 55 },
    skills: ['rallying_howl', 'war_cry', 'heavy_strike'],
    xp: 40,
    brain: { type: 'commander' },
  },

  lich_marshal: {
    id: 'lich_marshal', name: 'Lich Marshal',
    color: '#b89ae8', shape: 'cross', radius: 15, material: 'bone', look: 'lich',
    base: { life: 110, moveSpeed: 105, mana: 220, manaRegen: 14, energyShield: 90 },
    mods: [mod('chaosRes', 'flat', 0.6), mod('minionDamage', 'increased', 0.25)],
    skills: ['raise_dead', 'rallying_howl', 'despair', 'bone_cage'],
    xp: 60,
    brain: { type: 'commander' },
    faction: 'undead',
  },

  // A guardian: sporadically raises a frontal shield (the same Shield Up
  // the player can learn). Its front is a wall — get behind it.
  crypt_warden: {
    id: 'crypt_warden', name: 'Crypt Warden',
    color: '#8ab8d8', shape: 'square', radius: 18, material: 'bone', look: 'crypt_warden',
    base: { life: 160, moveSpeed: 95, accuracy: 100, armor: 50, mana: 60, manaRegen: 6 },
    mods: [mod('blockChance', 'flat', 0.15)],
    skills: ['shield_up', 'heavy_strike', 'cleave'],
    xp: 35,
    faction: 'undead',
  },

  bone_serpent: {
    id: 'bone_serpent', name: 'Bone Serpent',
    color: '#cfc0a0', shape: 'circle', radius: 13, material: 'bone', look: 'bone_serpent_head',
    base: { life: 70, moveSpeed: 150, accuracy: 95, evasion: 40, mana: 30, manaRegen: 4 },
    skills: ['claw', 'acid_spray'],
    xp: 26,
    brain: { type: 'swarm' },
    worm: { length: 6, spacing: 15, taper: 0.88 },
    faction: 'undead',
  },

  // --- Deadwake-exclusive undead -------------------------------------------
  // The dead that march ONLY with a Deadwake. They are referenced solely by the
  // Deadwake package's flood roster + leader pool (DEADWAKE_SURGE), never by any
  // FACTIONS table or zone pack list — so ordinary world generation never fields
  // them; they pour in only when a Deadwake's tide overruns a zone. faction
  // 'undead' (so they read as the dead + feed the Corpse Accumulation counter).

  // The bulk of the tide: cheap, numerous fodder that comes in a relentless swarm.
  deadwake_gravewretch: {
    id: 'deadwake_gravewretch', name: 'Gravewretch',
    color: '#7c8a6a', shape: 'circle', radius: 11, look: 'zombie',
    base: { life: 22, moveSpeed: 120, accuracy: 70, mana: 0 },
    mods: [mod('chaosRes', 'flat', 0.4)],
    skills: ['claw'],
    xp: 7,
    // The tide doesn't THINK — it pours straight and piles at the stone,
    // heedless of what it pours through (the fall veto still holds).
    brain: { type: 'swarm', move: { pathing: 'none', hazards: 'heedless' } },
    faction: 'undead',
    detection: 0.75,
  },

  // A fast, lunging cannibal — orbits then bites, whipping itself into a frenzy.
  // THE CHARNEL GHOUL — the corpse economy's rival customer: it noses to
  // bodies for its supper out of combat (the carrion lever) and BOLTS one
  // down mid-fight (gorge_carrion — same corpse fabric as the player's
  // Feast), healing and frenzying. Every body it eats is a body your
  // detonations, offerings and raisings don't get. Kill it hungry.
  charnel_ghoul: {
    id: 'charnel_ghoul', name: 'Charnel Ghoul',
    color: '#8a9060', shape: 'star', radius: 12, look: 'ghoul',
    base: { life: 52, moveSpeed: 150, accuracy: 90, evasion: 35, mana: 40, manaRegen: 5 },
    mods: [mod('chaosRes', 'flat', 0.3)],
    skills: ['claw', 'gorge_carrion'],
    xp: 14,
    brain: { type: 'flanker' },
    faction: 'undead',
    carrion: { radius: 240 },
    detection: 1.1,
  },

  deadwake_ghoul: {
    id: 'deadwake_ghoul', name: 'Ravenous Ghoul',
    color: '#9a7a5a', shape: 'star', radius: 13, look: 'ghoul',
    base: { life: 44, moveSpeed: 185, accuracy: 95, evasion: 40, mana: 45, manaRegen: 6 },
    mods: [mod('chaosRes', 'flat', 0.3)],
    skills: ['claw', 'frenzy'],
    xp: 13,
    brain: { type: 'flanker' },
    faction: 'undead',
    adorn: 'spikes',
    detection: 1.2,
  },

  // A bloated carrier that BURSTS on death — each casualty still bites the line.
  deadwake_plague_bearer: {
    id: 'deadwake_plague_bearer', name: 'Plague Bearer',
    color: '#8aa04a', shape: 'hexagon', radius: 17, look: 'plague_bearer',
    base: { life: 78, moveSpeed: 80, accuracy: 80, armor: 10, mana: 70, manaRegen: 5 },
    mods: [mod('chaosRes', 'flat', 0.7)],
    skills: ['claw', 'venom_bolt'],
    xp: 18,
    // Coalesces into a roiling plague-mote before the chaos rupture.
    deathBurst: { mode: 'implode', damageFrac: 0.55, damageType: 'chaos', coalesce: 0.85 },
    faction: 'undead',
    detection: 0.7,
  },

  // An armored wall that grinds the push down — a shield-bearing revenant.
  deadwake_revenant_knight: {
    id: 'deadwake_revenant_knight', name: 'Revenant Knight',
    color: '#9fb0c0', shape: 'square', radius: 17, material: 'ethereal', look: 'revenant_knight',
    base: { life: 130, moveSpeed: 100, accuracy: 105, armor: 55, mana: 60, manaRegen: 6, poise: 60 },
    mods: [mod('blockChance', 'flat', 0.18), mod('coldRes', 'flat', 0.3)],
    skills: ['shield_up', 'heavy_strike', 'riposte'],
    xp: 30,
    brain: { type: 'juggernaut' },
    faction: 'undead',
    detection: 0.8,
  },

  // Hangs back, snipes, and RAISES more dead — the futility made flesh.
  deadwake_bonecaller: {
    id: 'deadwake_bonecaller', name: 'Bonecaller',
    color: '#c4b890', shape: 'diamond', radius: 13, material: 'bone', look: 'necromancer',
    base: { life: 56, moveSpeed: 110, accuracy: 100, mana: 170, manaRegen: 12 },
    mods: [mod('chaosRes', 'flat', 0.4), mod('minionDamage', 'increased', 0.2)],
    skills: ['bone_arrow', 'raise_dead'],
    xp: 24,
    brain: { type: 'strafer' },
    faction: 'undead',
    detection: 1.1,
  },

  // A chilling shade that withers your defences while it strafes.
  deadwake_grave_wight: {
    id: 'deadwake_grave_wight', name: 'Grave Wight',
    color: '#8a7ca8', shape: 'kite', radius: 12, material: 'bone', look: 'skeleton_warrior',
    base: { life: 48, moveSpeed: 120, accuracy: 100, mana: 150, manaRegen: 11 },
    mods: [mod('coldRes', 'flat', 0.5), mod('chaosRes', 'flat', 0.3)],
    skills: ['despair', 'frost_pulse'],
    xp: 22,
    brain: { type: 'strafer' },
    faction: 'undead',
    adorn: 'tentacles',
    detection: 1.1,
  },

  // --- Deadwake host-LEADERS ------------------------------------------------
  // The commander a Deadwake rolls from its leaderPool. Promoted Crowned on
  // spawn (so these bases read as minibosses), each with a distinct archetype +
  // phase/impulse so the fight feels different. Felling the leader ROUTS the
  // whole tide — the only way a Deadwake fully dissipates.

  // A hulking bone-amalgam brute: it lumbers, then hungers — quickening to a
  // ferocious flanker once bloodied.
  deadwake_gravemaw: {
    id: 'deadwake_gravemaw', name: 'Gravemaw, the Devourer',
    color: '#6e6048', shape: 'octagon', radius: 24, material: 'slime', look: 'gravemaw',
    base: { life: 240, moveSpeed: 95, accuracy: 110, armor: 45, mana: 120, manaRegen: 8 },
    mods: [mod('chaosRes', 'flat', 0.5)],
    skills: ['heavy_strike', 'ground_slam', 'crushing_leap'],
    xp: 120,
    brain: {
      type: 'juggernaut',
      phases: [
        { atLifeFrac: 0.45, type: 'flanker', mods: [mod('moveSpeed', 'more', 0.4), mod('attackSpeed', 'more', 0.3)],
          announce: 'Gravemaw hungers!' },
      ],
    },
    faction: 'undead',
    adorn: 'horns',
    detection: 0.9,
  },

  // A wailing wraith-lord: barrages from extreme range, then surges into a
  // strafing dirge that hounds you across the field.
  deadwake_hollow_choir: {
    id: 'deadwake_hollow_choir', name: 'The Hollow Choir',
    color: '#b59ad8', shape: 'star', radius: 19, material: 'ethereal', look: 'hollow_choir',
    base: { life: 180, moveSpeed: 110, accuracy: 110, mana: 260, manaRegen: 16 },
    mods: [mod('coldRes', 'flat', 0.5), mod('chaosRes', 'flat', 0.5)],
    skills: ['snipe', 'despair', 'bone_cage', 'contagion'],
    xp: 120,
    brain: {
      type: 'artillery',
      impulses: [{ type: 'strafer', every: [6, 9], duration: [2.5, 3.5], announce: 'A dirge rises…' }],
      // A dead marksman has had CENTURIES of practice: 60% Perfect! snipes.
      skillUse: { finesse: { chance: 0.6 } },
    },
    faction: 'undead',
    adorn: 'wings',
    detection: 1.3,
  },

  // The necromancer-shepherd of the tide: raises the dead without end and goads
  // the host, casting ever faster as it falls — the relentless engine of the wake.
  deadwake_pale_shepherd: {
    id: 'deadwake_pale_shepherd', name: 'The Pale Shepherd',
    color: '#cdd2c4', shape: 'cross', radius: 18, material: 'ethereal', look: 'necromancer',
    base: { life: 200, moveSpeed: 105, mana: 280, manaRegen: 18, poise: 50 },
    mods: [mod('chaosRes', 'flat', 0.6), mod('minionDamage', 'increased', 0.3)],
    skills: ['raise_dead', 'rallying_howl', 'unholy_aura', 'despair'],
    xp: 130,
    brain: {
      type: 'commander',
      phases: [
        { atLifeFrac: 0.5, type: 'commander', mods: [mod('castSpeed', 'more', 0.45)],
          announce: 'The Shepherd calls the host!' },
      ],
    },
    faction: 'undead',
    adorn: 'tentacles',
    detection: 1.0,
  },

  // --- THE NECROPOLIS uber boss --------------------------------------------
  // Fielded ONLY by a Necropolis (two fused Deadwakes), referenced solely by
  // DEADWAKE_SURGE.necropolis.bossPool. Crowned on spawn; its phases escalate it
  // from throned commander → juggernaut → wailing artillery. Purging it disperses
  // every active tide and refreshes the whole cycle — the climax of the event.
  deadwake_bonelord: {
    id: 'deadwake_bonelord', name: 'The Bonelord',
    color: '#e8dcb0', shape: 'octagon', radius: 28, material: 'bone', look: 'lich',
    base: { life: 520, moveSpeed: 95, accuracy: 120, armor: 60, mana: 320, manaRegen: 20, poise: 110, poiseDR: 0.5 },
    mods: [mod('chaosRes', 'flat', 0.6), mod('coldRes', 'flat', 0.4), mod('minionDamage', 'increased', 0.4)],
    skills: ['raise_dead', 'ground_slam', 'bone_cage', 'despair', 'crushing_leap'],
    xp: 320,
    levitates: true,   // a throned lord — won't be cheaply knocked into void
    brain: {
      type: 'commander',
      phases: [
        { atLifeFrac: 0.66, type: 'juggernaut', mods: [mod('moveSpeed', 'more', 0.25)],
          announce: 'The Bonelord rises from its throne!' },
        { atLifeFrac: 0.33, type: 'artillery', mods: [mod('castSpeed', 'more', 0.5)],
          announce: 'The Necropolis wails — the dead answer as one!' },
      ],
    },
    faction: 'undead',
    adorn: 'horns',
    detection: 1.2,
  },

  // --- VHAL-SERRAT: the SCRIPT-FSM showpiece ---------------------------------
  // A whole Sirus/Mephisto-grade encounter written in PURE DATA — zero engine
  // code. The grammar on display: a two-phase ROTATION that loops on timers
  // (onset ⇄ barrage), an HP GATE that interrupts it from anywhere (the veil),
  // an ADD-WARD (untargetable until the tagged brood dies — goto tagCleared),
  // a held APEX with stacked cadences (teleport-behind beats, push + ring
  // volleys), scripted teleports/buffs/washes, a threat-chart target policy
  // (decoys don't fool it; healers enrage it), and a crowd-punish RULE that
  // fires on its own clock in every phase. IT LIVES IN THE WORLD as the
  // eldritch incursion's OBSERVER (INCURSION_ARCHETYPES.eldritch.termination):
  // let Conclave rites incubate to the awakening, then hunt what landed —
  // slaying it ends the incursion. Dev audition:
  // `world.createMonster('vhal_serrat', level, 'enemy')`.
  vhal_serrat: {
    id: 'vhal_serrat', name: 'Vhal-Serrat, the Convergence',
    color: '#9a3aa8', shape: 'star', radius: 26, look: 'eldritch_tyrant',
    base: { life: 640, moveSpeed: 122, accuracy: 120, armor: 40, mana: 320, manaRegen: 20 },
    mods: [mod('chaosRes', 'flat', 0.6), mod('fireRes', 'flat', 0.3), mod('coldRes', 'flat', 0.3)],
    skills: ['venom_bolt', 'despair', 'bone_cage', 'cleave'],
    xp: 380,
    boss: true,
    faction: 'eldritch',
    adorn: 'tentacles',
    detection: 1.3,
    brain: {
      type: 'caster',
      // The threat CHART, not the nearest warm body: damage earns its gaze,
      // mending its prey earns MORE of it, and decoys are beneath it.
      target: {
        prefer: 'highestThreat', stickiness: 1.15, ignoreTaunt: true,
        threat: { damage: 1, heal: 0.8, decay: 0.05 },
      },
      script: [
        {
          id: 'onset',
          use: { type: 'caster' },
          announce: 'Vhal-Serrat turns its gaze upon you.',
          onEnter: [{ do: 'wash', color: '#3a2a48', intensity: 0.10 }],
          cadences: [{
            every: 5, first: 2.5,
            actions: [{ do: 'ring', skill: 'magma_glob', radius: 190, count: 6, delay: 1.0, at: 'target' }],
          }],
          goto: [
            { to: 'veil', atLifeFrac: 0.62 },
            { to: 'barrage', after: 11 },
          ],
        },
        {
          id: 'barrage',
          use: { type: 'artillery', skillUse: { cadence: [0.1, 0.25] } },
          announce: 'The Convergence unfolds — a hundred mouths open!',
          onEnter: [
            { do: 'cast', skill: 'bone_cage', at: 'target', force: true },
            { do: 'teleport', to: 'awayFromTarget', range: 420 },
          ],
          cadences: [{
            every: 2.2, first: 1.2,
            actions: [{ do: 'nova', skill: 'magma_glob', at: 'target', delay: 0.8, zoneRadius: 96 }],
          }],
          goto: [
            { to: 'veil', atLifeFrac: 0.62 },
            { to: 'onset', after: 9 }, // ← the ROTATION: barrage loops back to onset
          ],
        },
        {
          id: 'veil',
          use: { type: 'commander' },
          mods: [mod('damageTaken', 'more', -0.2)],
          announce: 'It folds itself behind the brood — BREAK THE VEIL!',
          onEnter: [
            { do: 'teleport', to: 'anchor' },
            { do: 'summon', monster: 'conclave_blood_demon', count: 4, ring: 190, tag: 'vhal_veil', announce: 'The brood answers!' },
            { do: 'ward', tag: 'vhal_veil', announce: 'The veil SHATTERS — strike now!' },
            { do: 'wash', color: '#7a2347', intensity: 0.16 },
          ],
          goto: [{ to: 'apex', tagCleared: 'vhal_veil' }],
        },
        {
          id: 'apex',
          use: { type: 'flanker', move: { style: 'orbit', ring: 150 }, skillUse: { cadence: [0.1, 0.22] } },
          announce: 'VHAL-SERRAT CONVERGES.',
          rewardGems: 2,
          onEnter: [
            {
              do: 'buff',
              buff: {
                type: 'buff', id: 'convergence', duration: 999,
                mods: [
                  mod('damage', 'more', 0.3),
                  mod('castSpeed', 'more', 0.35),
                  mod('moveSpeed', 'more', 0.3),
                ],
              },
            },
            { do: 'shake', amount: 6 },
            { do: 'wash', color: '#c0451e', intensity: 0.18 },
          ],
          cadences: [
            {
              every: 7, first: 4,
              actions: [
                { do: 'teleport', to: 'behindTarget' },
                { do: 'announce', text: 'It is BEHIND you.', color: '#d060e0', size: 14 },
              ],
            },
            {
              every: 10, first: 6,
              actions: [
                { do: 'push', radius: 240, strength: 260 },
                { do: 'ring', skill: 'magma_glob', radius: 170, count: 7, waves: 2, waveGap: 0.5, at: 'self' },
              ],
            },
          ],
          goto: [], // the apex HOLDS — it ends when one of you does
        },
      ],
      // Crowd control on its own clock, phase-independent: pile onto it and
      // be scattered. Rules fire alongside whatever the script is doing.
      rules: [{
        when: { enemiesWithin: { count: 3, radius: 160 } },
        every: [9, 14], hold: [0.1, 0.2],
        actions: [
          { do: 'push', radius: 200, strength: 220 },
          { do: 'announce', text: 'BEGONE.', color: '#d060e0', size: 14 },
        ],
      }],
    },
  },

  // --- MIGRATION: the wild BEAST herds that cross the plains. A NET-NEW faction
  //     grafted by the Migration content package; its FactionSpec declares
  //     contexts:['migration'] so these NEVER spawn in ordinary world gen — only a
  //     passing herd fields them (the spawn-context gate in world/traits.ts). Each
  //     rolls a SCALE per spawn (scaleVariance): the big are ADULTS that stand and
  //     gore, the small are YOUNG (juvenileBrain → flee). NEUTRAL until the herd is
  //     provoked (engine 'migrant' dormancy + the group rouse in resolveHit). Low
  //     detection — placid grazers that won't notice you until you're right on them.
  migration_aurochs: {
    id: 'migration_aurochs', name: 'Plains Aurochs',
    color: '#9c7a4e', shape: 'hexagon', radius: 16, material: 'fur', look: 'behemoth',
    base: { life: 78, moveSpeed: 104, accuracy: 96, armor: 24, mana: 30, manaRegen: 4, poise: 40 },
    skills: ['heavy_strike'],
    xp: 18, faction: 'beast', tags: ['beast'], adorn: 'horns',
    // High detection so a ROUSED adult locks straight onto whoever drew blood. (Neutral
    // migrants early-return from the AI before detection is ever read, so this never
    // changes their placid grazing — it only bites once the herd is provoked.)
    detection: 1.1,
    // A roused adult GORES: stalk in, then a locked headlong charge (the
    // charge kernel rides the dash pipeline — collision and all), a winded
    // breather, and again. Beasts charge; now it's one knob.
    brain: { type: 'juggernaut', move: { style: 'charge', commitRange: 340, chargeSpeed: 2.6 } },
    scaleVariance: [0.78, 1.5], scaleStats: true, juvenileBelow: 0.92,
    juvenileBrain: { type: 'flee' },
  },
  migration_strider: {
    id: 'migration_strider', name: 'Steppe Strider',
    color: '#c8a85e', shape: 'trapezoid', radius: 13, material: 'fur', look: 'stalker',
    base: { life: 46, moveSpeed: 176, accuracy: 100, mana: 0 },
    skills: ['claw'],
    xp: 14, faction: 'beast', tags: ['beast'],
    detection: 1.15, // see the rouse note on the aurochs — only bites once provoked
    scaleVariance: [0.82, 1.34], scaleStats: true, juvenileBelow: 0.95,
    juvenileBrain: { type: 'flee' },
  },
  // The "elephant" of the herd — a heavy bruiser that lumbers and never retreats
  // (juggernaut). The biggest tuskers are unmistakable; their calves bolt.
  migration_tusker: {
    id: 'migration_tusker', name: 'Great Tusker',
    color: '#8a6a44', shape: 'octagon', radius: 20, material: 'fur', look: 'tusker',
    base: { life: 142, moveSpeed: 96, accuracy: 104, armor: 40, mana: 50, manaRegen: 6, poise: 60 },
    skills: ['ground_slam', 'heavy_strike'],
    xp: 30, faction: 'beast', tags: ['beast'], adorn: 'horns',
    detection: 1.05, // see the rouse note on the aurochs — only bites once provoked
    brain: { type: 'juggernaut' },
    scaleVariance: [0.88, 1.62], scaleStats: true, juvenileBelow: 0.98,
    juvenileBrain: { type: 'flee' },
  },

  // --- CONTAGION: the Plaguebound + Patient Zero ---------------------------
  //     A NET-NEW faction grafted by the Contagion content package; its FactionSpec
  //     declares contexts:['contagion'] so these NEVER spawn in ordinary world gen —
  //     only an INFECTED zone fields them (the engine materializes intensity-scaled
  //     packs off contagionField.contagionOn). Diseased flesh: high chaosRes (they
  //     swim in their own rot), low detection (sickly, slow to notice you), and most
  //     burst a spore cloud on death. The plague spreads zone-to-zone on its own; the
  //     only cure is to find PATIENT ZERO at the source and cut it out.
  plague_carrier: {
    id: 'plague_carrier', name: 'Plague Carrier',
    color: '#7a9a4a', shape: 'circle', radius: 15, material: 'fur', look: 'rat',
    base: { life: 52, moveSpeed: 92, accuracy: 80, mana: 40, manaRegen: 4 },
    mods: [mod('chaosRes', 'flat', 0.7)],
    skills: ['claw', 'contagion'],
    xp: 14, faction: 'plague',
    detection: 0.7, // a shambling host — won't notice you until you're close
    // Gathers into a spore-mote, then implodes a chaos cloud when it falls — coalesce gives an escape beat.
    deathBurst: { mode: 'implode', damageFrac: 0.3, damageType: 'chaos', coalesce: 0.85 },
    // A swollen host reads bigger; a fresh-infected one smaller (cosmetic + stat coupling).
    scaleVariance: [0.85, 1.35], scaleStats: true,
  },
  plague_spitter: {
    id: 'plague_spitter', name: 'Pustule Spitter',
    color: '#9aae3a', shape: 'star', radius: 13, material: 'slime', look: 'spitter_bug',
    base: { life: 40, moveSpeed: 112, accuracy: 100, mana: 120, manaRegen: 9 },
    mods: [mod('chaosRes', 'flat', 0.7)],
    skills: ['venom_bolt', 'toxic_cloud'],
    xp: 17, faction: 'plague',
    detection: 1.2, // a watchful sac that lobs from afar
  },
  // The "bloater" of the plague — a gas-swollen corpse that lumbers and never
  // retreats (juggernaut), rupturing into a wide toxic burst when it finally drops.
  plague_bloat: {
    id: 'plague_bloat', name: 'Bloated Husk',
    color: '#6e8a3e', shape: 'octagon', radius: 21, material: 'slime', look: 'bloat',
    base: { life: 130, moveSpeed: 84, accuracy: 96, armor: 30, mana: 60, manaRegen: 6 },
    mods: [mod('chaosRes', 'flat', 0.8)],
    skills: ['ground_slam', 'toxic_cloud'],
    xp: 30, faction: 'plague', adorn: 'horns',
    detection: 0.85,
    brain: { type: 'juggernaut', enrage: 0.4 },
    // A far bigger rupture than a carrier's — a slow, fat coalesce telegraphs the big chaos burst.
    deathBurst: { mode: 'implode', damageFrac: 0.6, damageType: 'chaos', coalesce: 1.0, radius: 120 },
    scaleVariance: [0.9, 1.5], scaleStats: true,
  },

  // --- PATIENT ZERO (the Contagion source boss) ----------------------------
  // Fielded ONLY at the hops===0 source of an outbreak (the engine spawns it off
  // contagionField.patientZeroIn, Crowned on spawn). Its phases escalate it from a
  // disease-shepherd that raises hosts → a lurching juggernaut → a spore artillery
  // that floods the field. Felling it does NOT cure the zones at once — it destroys
  // the SOURCE, and the contagion recedes outward from here over time (the cure
  // chain-reaction). Repeatable: a new outbreak can ignite elsewhere on a later run.
  patient_zero: {
    id: 'patient_zero', name: 'Patient Zero, the First Host',
    color: '#a6d24a', shape: 'cross', radius: 27, material: 'slime', look: 'ghoul',
    base: { life: 540, moveSpeed: 96, accuracy: 118, armor: 40, mana: 320, manaRegen: 20 },
    mods: [mod('chaosRes', 'flat', 0.8), mod('minionDamage', 'increased', 0.3)],
    skills: ['raise_dead', 'contagion', 'toxic_cloud', 'essence_drain', 'agony'],
    xp: 300, faction: 'plague', adorn: 'tentacles',
    detection: 1.1,
    brain: {
      type: 'commander',
      phases: [
        { atLifeFrac: 0.66, type: 'juggernaut', mods: [mod('moveSpeed', 'more', 0.25)],
          announce: 'Patient Zero lurches forward — the rot quickens!' },
        { atLifeFrac: 0.33, type: 'artillery', mods: [mod('castSpeed', 'more', 0.5)],
          announce: 'Patient Zero ruptures — the air thickens with spores!' },
      ],
    },
  },

  // --- BANDITS: the opportunist human 'bandit' faction --------------------
  //     An adaptable, low-level human host grafted by the Holdfast package (it also
  //     marches in Warbands). At a HOLDFAST they are the toll-WARDENS: NEUTRAL until
  //     provoked (the engine tags them 'toll_bandit' → ai.ts dormancy + a wounded-only
  //     group rouse), and each carries ~150% life (a 'more' mod) so a stray splash hit
  //     can't accidentally drop the wardens and lock you out. Felling them all is a
  //     deliberate act — and only a low chance bursts the gate open.
  bandit_keeper: {
    id: 'bandit_keeper', name: 'Toll Warden',
    color: '#d0a850', shape: 'square', radius: 15, look: 'bandit',
    base: { life: 74, moveSpeed: 132, accuracy: 100, armor: 18, mana: 50, manaRegen: 5 },
    mods: [mod('life', 'more', 0.5)],
    skills: ['cleave', 'war_cry'],
    xp: 26, faction: 'bandit', adorn: 'horns',
    detection: 0.8,
  },
  bandit_cutthroat: {
    id: 'bandit_cutthroat', name: 'Cutthroat',
    color: '#9a7a44', shape: 'trapezoid', radius: 12, look: 'bandit',
    base: { life: 46, moveSpeed: 168, accuracy: 104, mana: 0, insight: 35 },
    mods: [mod('life', 'more', 0.5)],
    skills: ['claw'],
    xp: 15, faction: 'bandit',
    brain: { type: 'skirmish', withdraw: 1.3 }, // darts in and out, a knife-fighter
    detection: 1.0,
  },
  bandit_bruiser: {
    id: 'bandit_bruiser', name: 'Bandit Bruiser',
    color: '#7e6038', shape: 'octagon', radius: 17, look: 'bandit_bruiser',
    base: { life: 96, moveSpeed: 112, accuracy: 100, armor: 32, mana: 40, manaRegen: 4, poise: 40 },
    mods: [mod('life', 'more', 0.5)],
    // Swig: the pocket brew — the enemy's side of the flask rule (a REFLEX
    // drink, thirst-gated). The bruiser pulls at it MID-BRAWL, so the
    // player watches the counterplay teach itself: burst him through it.
    skills: ['heavy_strike', 'ground_slam', 'swig'],
    xp: 24, faction: 'bandit', adorn: 'horns',
    brain: { type: 'juggernaut', enrage: 0.4 },
    detection: 0.85,
  },
  // --- The POWDER KIN: bandits who took up guns. Their whole threat rides
  //     the ammunition fabric — they fire the bank DRY and then stand there
  //     RACKING (the empty press converts to the reload cast), so the
  //     reload window IS the counterplay the player learns by watching.
  bandit_fusilier: {
    id: 'bandit_fusilier', name: 'Bandit Fusilier',
    color: '#b09468', shape: 'trapezoid', radius: 13, look: 'bandit_fusilier',
    base: { life: 52, moveSpeed: 128, accuracy: 108, mana: 0 },
    mods: [mod('life', 'more', 0.5)],
    skills: ['bolt_repeater'],
    xp: 20, faction: 'bandit',
    brain: { type: 'strafer' }, // holds range, works the drum dry, racks
    detection: 1.1,
  },
  bandit_grenadier: {
    id: 'bandit_grenadier', name: 'Bandit Grenadier',
    color: '#c07848', shape: 'octagon', radius: 15, look: 'bandit_grenadier',
    base: { life: 68, moveSpeed: 118, accuracy: 100, armor: 20, mana: 0 },
    mods: [mod('life', 'more', 0.5)],
    skills: ['grenado'],
    xp: 24, faction: 'bandit',
    brain: { type: 'strafer' },
    detection: 0.95,
  },
  bandit_matchlock: {
    id: 'bandit_matchlock', name: 'Matchlock Marksman',
    color: '#a8a090', shape: 'trapezoid', radius: 13, look: 'bandit_matchlock',
    base: { life: 58, moveSpeed: 122, accuracy: 118, mana: 0 },
    mods: [mod('life', 'more', 0.5)],
    skills: ['arquebus'],
    xp: 28, faction: 'bandit',
    brain: { type: 'strafer' }, // one thunderclap, then the long open ram
    detection: 1.3,
  },
  // The SHIELD-WALL of the warband: a thane who ADVANCES behind a marching
  // guard, thrusts through it, and CALLS THE FIGHT — his challenging shout
  // taunts your minions off their marks (the challenge fabric working for
  // the other side). Poise-pole texture: crack the stance, then the man.
  bulwark_thane: {
    id: 'bulwark_thane', name: 'Bulwark Thane',
    color: '#8a7a52', shape: 'octagon', radius: 16, look: 'bandit_bruiser',
    base: { life: 110, moveSpeed: 108, accuracy: 102, armor: 40, poise: 70, mana: 60, manaRegen: 6 },
    mods: [mod('life', 'more', 0.5)],
    skills: ['marching_bulwark', 'bastion_thrust', 'challenging_shout', 'cleave'],
    xp: 30, faction: 'bandit', adorn: 'horns',
    brain: { type: 'juggernaut' },
    detection: 0.85,
  },
  // The GUARDED-CASTING demo in the wild: she raises a rune-lit ward and
  // PRESSES her firebolt through it — the same gem, the same instant
  // combo-press pipeline a player's spellsword runs, worn by the other
  // side (the AI's mid-stance menu admits socket-granted combo verbs).
  // Counterplay: break the modest shield, or eat a scheduled bolt.
  bandit_wardcaster: {
    id: 'bandit_wardcaster', name: 'Wardcaster',
    color: '#9a8ac8', shape: 'star', radius: 13, look: 'bandit_powder_witch',
    base: { life: 60, moveSpeed: 116, accuracy: 102, armor: 12, mana: 90, manaRegen: 7 },
    mods: [mod('life', 'more', 0.5)],
    skills: ['runeward', 'firebolt', 'claw'],
    grants: [{ atLevel: 1, support: 'guarded_casting', on: 'firebolt' }],
    xp: 28, faction: 'bandit',
    detection: 0.9,
  },
  // The masterless duelist: a timed-bar READER in enemy hands. The AI's
  // finesse system presses Iai's flawless window (the same Flawless! the
  // player earns — you can hear it practicing), the phasing draw carries
  // it THROUGH your front line, and its kata ramps itself per-skill like
  // any player's would. Full fabric parity: nothing here is bespoke.
  steppe_ronin: {
    id: 'steppe_ronin', name: 'Steppe Ronin',
    color: '#c8b8a0', shape: 'trapezoid', radius: 13, look: 'bandit',
    base: { life: 66, moveSpeed: 148, accuracy: 112, evasion: 50, insight: 30, mana: 50, manaRegen: 5 },
    mods: [mod('life', 'more', 0.5)],
    skills: ['iai_strike', 'thousand_cuts'],
    xp: 30, faction: 'bandit',
    brain: { type: 'skirmish', withdraw: 1.1, skillUse: { finesse: { chance: 0.7 } } },
    detection: 1.1,
  },
  // --- THE CADENCED KIN: the measured school, and THE COMBO GRAMMAR's
  // live tutorial (engine/sequence.ts, data/combos.ts). Each body carries
  // a PLAYER grammar via one ordinary modifier — the same combo_<id> stat
  // a passive notable grants — so the payoff text over a duel names the
  // exact rule a build can take; the beat pips on their looks say "this
  // one keeps time" at a glance. Factionless: the school answers to no
  // banner. Kits wholly reused — the fencer drums zanshin_cut (its innate
  // castCycle layers UNDER the cross-skill Drumbeat: two cadence fabrics,
  // one body), the cantor mixes the three schools into Prismatic Rounds,
  // the maestro weaves steel and spark into Blade-and-Vein.
  cadence_fencer: {
    id: 'cadence_fencer', name: 'Cadence Fencer',
    color: '#c8b088', shape: 'trapezoid', radius: 13, look: 'cadence_fencer',
    base: { life: 62, moveSpeed: 146, accuracy: 110, evasion: 48, insight: 25, mana: 60, manaRegen: 6 },
    mods: [mod('combo_drumbeat', 'flat', 1)],
    skills: ['zanshin_cut'],
    xp: 26,
    brain: { type: 'skirmish', withdraw: 1.05 },
    detection: 1.05,
  },
  cadence_cantor: {
    id: 'cadence_cantor', name: 'Round Cantor',
    color: '#b8a8d8', shape: 'diamond', radius: 13, material: 'cloth', look: 'cadence_cantor',
    base: { life: 34, moveSpeed: 122, mana: 140, manaRegen: 9 },
    mods: [mod('combo_elemental_round', 'flat', 1)],
    skills: ['firebolt', 'frostbolt', 'spark'],
    xp: 22,
    brain: { type: 'caster' },
  },
  /** The school's crown — the Spellblade vocation's proof in enemy hands:
   *  he weaves cut and spark, and Blade-and-Vein surges HIM exactly as it
   *  will surge the player who earns it. */
  cadence_maestro: {
    id: 'cadence_maestro', name: 'Cadence Maestro',
    color: '#b8a8e8', shape: 'octagon', radius: 15, look: 'cadence_maestro',
    base: { life: 150, moveSpeed: 138, accuracy: 114, evasion: 52, insight: 40, mana: 120, manaRegen: 8, poise: 40 },
    mods: [mod('combo_spellblade_weave', 'flat', 1)],
    skills: ['zanshin_cut', 'spark'],
    xp: 60,
    brain: { type: 'skirmish', withdraw: 1.15 },
    detection: 1.1,
  },
  // --- THE GRIP KIN: the grab fabric's live tutorial (engine/grab.ts) —
  // traveling holdsmen of the old takedown schools, factionless like the
  // measured school above. ONE VERB PER SILHOUETTE, and the kit-part IS
  // the tell: the wrangler's grapnel-and-line DRAGS you out of your line,
  // the yoke-shouldered mauler PINS you and drums the player's own
  // Takedown measure (clinch into toss — the payoff text over a duel
  // names the earnable rule, the cadenced-kin teaching pattern), the
  // gulletsack gulper SWALLOWS you whole and spits you at your friends.
  // Every hold is mass-gated, struggled against, ally-severed — the
  // counterplay ladder is the lesson plan. Vocabulary law: the LATCH
  // rides, the TETHER links, the PULL yanks once — the GRAB holds.
  gaff_wrangler: {
    id: 'gaff_wrangler', name: 'Gaff Wrangler',
    color: '#b08a5a', shape: 'trapezoid', radius: 12, look: 'gaff_wrangler',
    base: { life: 70, moveSpeed: 126, accuracy: 108, evasion: 30, insight: 20, mana: 40, manaRegen: 4 },
    // The hook, and a boot for adjacency (the improvised floor IS the
    // player-grade claw — its ai hint exists for exactly this).
    skills: ['gaff_cast', 'improvised_strike'],
    xp: 28,
    heft: 1.1,
    // keepDistance on the gaff + a catch slaved to the hand = the DRAG
    // emerges from standoff-seeking alone: the wrangler forever backs
    // toward the range it can never re-open, hauling you with it.
    brain: { type: 'skirmish', withdraw: 1.1 },
    detection: 1.05,
    gemBias: ['physical', 'melee'],
  },
  yoke_mauler: {
    id: 'yoke_mauler', name: 'Yoke Mauler',
    color: '#c89058', shape: 'pentagon', radius: 17, look: 'yoke_mauler',
    // POISE IDENTITY (the defense-texture doctrine): a pinner IS an
    // anchor — authored poise with real DR, and the heft to open the
    // mass gate on most bodies fool enough to stand in the ring.
    base: { life: 150, moveSpeed: 96, accuracy: 106, armor: 20, poise: 80, poiseDR: 0.35, mana: 0 },
    mods: [mod('combo_grapplers_rhythm', 'flat', 1)],
    skills: ['mauler_clinch', 'mauler_toss', 'improvised_strike'],
    xp: 44,
    heft: 1.5,
    brain: { type: 'juggernaut' },
    detection: 1.0,
    gemBias: ['physical', 'melee'],
  },
  gorge_gulper: {
    id: 'gorge_gulper', name: 'Gorge Gulper',
    color: '#7a9a5a', shape: 'oval', radius: 16, material: 'flesh', look: 'gorge_gulper',
    base: { life: 170, moveSpeed: 72, accuracy: 104, armor: 12, mana: 30, manaRegen: 3 },
    // The maw's own reel (shared catalog — what the caulborn floor casts,
    // the fen toad casts), then the bite that KEEPS.
    skills: ['tongue_reel', 'gulp'],
    xp: 46,
    heft: 1.35,
    brain: { type: 'basic' },
    detection: 0.95,
    gemBias: ['physical', 'melee'],
  },
  /** The planted swallower: a carnivorous bloom that stays where it grew
   *  (moveSpeed 0 = anchored — the sentry doctrine) and GULPS whatever it
   *  HATES that strays — or is thrown — into reach. Hostility rides the
   *  ordinary team/faction fabric (it will not eat same-team kin without
   *  a faction war), so its pane-proved meal is the player's side; the
   *  faction-BLIND throw payoffs (stakes, walls, pits) cover hurling
   *  enemies into hazards. Same gulp row as the gulper — zero new skills. */
  maw_bloom: {
    id: 'maw_bloom', name: 'Maw Bloom',
    color: '#8a6a9a', shape: 'hexagon', radius: 13, material: 'verdant', look: 'maw_bloom',
    base: { life: 110, moveSpeed: 0, accuracy: 102, armor: 15, mana: 0 },
    mods: [mod('chaosRes', 'flat', 0.4)],
    skills: ['gulp'],
    xp: 30,
    heft: 2.2,
    grabbable: false,
    ambush: { radius: 150, announce: 'the bloom leans —' },
    brain: { type: 'basic' },
    gemBias: ['chaos', 'duration'],
  },

  bandit_powder_witch: {
    id: 'bandit_powder_witch', name: 'Powder Witch',
    color: '#8ec8b0', shape: 'star', radius: 13, look: 'bandit_powder_witch',
    base: { life: 54, moveSpeed: 118, accuracy: 104, mana: 90, manaRegen: 7 },
    mods: [mod('life', 'more', 0.5)],
    // The CHAMBERED demo in the wild: three fat firebolts (the graft's more/
    // wider/surer payoff), then she stands there RE-ENERGIZING — the same
    // rack cycle the gunners run, worn by a caster (MonsterGrant sockets
    // the same gem a player would; the cast pipeline does the rest).
    skills: ['firebolt'],
    grants: [{ atLevel: 1, support: 'chambered_casting', on: 'firebolt' }],
    xp: 26, faction: 'bandit',
    brain: { type: 'strafer' },
    detection: 1.15,
  },

  // --- The PARITY-PASS adversaries: the new class kits, worn by the other
  //     side. Same doctrine as the ronin and the thane above — every one of
  //     these wields the same gems a player's Trapper/Brawler/Skald/Warlord/
  //     Blademaster/Chronomancer slots, through the same pipeline. Nothing
  //     bespoke; the counterplay you learn against them is the build you
  //     could be playing.
  bandit_trapsmith: {
    id: 'bandit_trapsmith', name: 'Snaresetter',
    color: '#a8905a', shape: 'trapezoid', radius: 13, look: 'bandit_trapsmith',
    base: { life: 56, moveSpeed: 138, accuracy: 106, evasion: 40, mana: 70, manaRegen: 6 },
    mods: [mod('life', 'more', 0.5)],
    // The player Trapper's exact kit-half: strewn ground + a buried snare,
    // with a poacher's dart to herd you across both.
    skills: ['caltrops', 'aftershock_snare', 'blowdart'],
    xp: 26, faction: 'bandit',
    brain: { type: 'skirmish', withdraw: 1.5 },
    detection: 1.1,
  },
  pit_champion: {
    id: 'pit_champion', name: 'Pit Champion',
    color: '#d8885a', shape: 'octagon', radius: 16, look: 'pit_champion',
    base: { life: 100, moveSpeed: 124, accuracy: 104, armor: 22, poise: 60, mana: 40, manaRegen: 4 },
    mods: [mod('life', 'more', 0.5)],
    // The Brawler's arithmetic in enemy hands: jabs bank Fury, the chain
    // drags a runner back to the pit, the haymaker spends the whole purse.
    skills: ['one_two', 'chain_pull', 'haymaker'],
    xp: 28, faction: 'bandit',
    brain: { type: 'juggernaut', enrage: 0.5 },
    detection: 0.95,
  },
  warband_skald: {
    id: 'warband_skald', name: 'Warband Skald',
    color: '#c890d8', shape: 'star', radius: 13, look: 'warband_skald',
    base: { life: 58, moveSpeed: 126, accuracy: 100, mana: 100, manaRegen: 8 },
    mods: [mod('life', 'more', 0.5)],
    // The support seat, hostile: the chant hastens the WARBAND, the discord
    // grinds at you. Cut the singer and the camp loses its meter.
    skills: ['war_chant', 'dissonance'],
    xp: 26, faction: 'bandit',
    brain: { type: 'skirmish', withdraw: 1.4 },
    detection: 0.9,
  },
  camp_bannerman: {
    id: 'camp_bannerman', name: 'Bannerman',
    color: '#e0b060', shape: 'octagon', radius: 15, look: 'camp_bannerman',
    base: { life: 84, moveSpeed: 116, accuracy: 104, armor: 24, poise: 50, mana: 60, manaRegen: 5 },
    mods: [mod('life', 'more', 0.5)],
    // The Warlord's grammar reversed: his standard rallies THEM, his call
    // peels YOUR minions off their marks, his spear leaves steel behind.
    skills: ['battle_standard', 'single_out', 'skewer'],
    xp: 28, faction: 'bandit',
    brain: { type: 'juggernaut' },
    detection: 0.9,
  },
  barrow_swordsaint: {
    id: 'barrow_swordsaint', name: 'Barrow Swordsaint',
    color: '#c8d8e8', shape: 'trapezoid', radius: 13, material: 'bone', look: 'barrow_swordsaint',
    base: { life: 70, moveSpeed: 142, accuracy: 112, evasion: 45, insight: 25, mana: 50, manaRegen: 5 },
    // The Blademaster's tempo, risen: the three-beat discipline, the perfect
    // window, the thrust from behind — a duel the grave never finished.
    skills: ['zanshin_cut', 'riposte', 'backstab'],
    xp: 30, faction: 'undead',
    brain: { type: 'skirmish', withdraw: 1.1, skillUse: { finesse: { chance: 0.7 } } },
    detection: 1.05,
  },
  gnoll_impaler: {
    id: 'gnoll_impaler', name: 'Gnoll Impaler',
    color: '#c89a60', shape: 'triangle', radius: 13, material: 'fur', look: 'gnoll',
    base: { life: 62, moveSpeed: 152, accuracy: 108, evasion: 45, mana: 50, manaRegen: 5, insight: 30 },
    // The Lancer's ledger with pack manners: lodge the steel, plant the
    // fence, let the pack herd you onto it.
    skills: ['skewer', 'pinning_spear'],
    xp: 27, faction: 'gnoll', adorn: 'ears',
    brain: { type: 'skirmish', withdraw: 1.2 },
    detection: 1.15,
  },
  abyssal_horologist: {
    id: 'abyssal_horologist', name: 'Abyssal Horologist',
    color: '#8ad8d8', shape: 'diamond', radius: 12, material: 'void', look: 'abyssal_horologist',
    base: { life: 60, moveSpeed: 130, mana: 110, manaRegen: 9 },
    mods: [mod('coldRes', 'flat', 0.3)],
    // The Seer's understudy — the Chronomancer's other two verbs: the
    // thickened bubble your volley crawls through, the needle that hangs
    // you outside the argument entirely.
    skills: ['stasis_lock', 'torpor_field'],
    xp: 24, faction: 'abyssal',
    brain: { type: 'strafer' },
    detection: 1.2,
  },
  rift_ascetic: {
    id: 'rift_ascetic', name: 'Rift Ascetic',
    color: '#e8e0c8', shape: 'diamond', radius: 13, material: 'void', look: 'rift_ascetic',
    base: { life: 78, moveSpeed: 118, accuracy: 106, insight: 40, mana: 80, manaRegen: 7 },
    // The Ascetic's stillness at the world's edge: the practiced palm, the
    // stance that pumps mind into poise, one long-held breath off the rim.
    skills: ['mantra_strike', 'wellspring_stance', 'long_exhale'],
    xp: 26, faction: 'abyssal',
    brain: { type: 'juggernaut' },
    detection: 0.85,
  },

  // --- MYCELIA: "The Bloom" — the fungal 'fungal' faction --------------------
  //     Patron of the mycelia biome + the spore-bloom's spawn. contexts:['mycelia']
  //     keeps them to fungal ground + the overlay's spread zones (never baseline war).
  //     A slow, grasping hive of fruiting bodies: high chaosRes (they ARE the rot),
  //     poison/area-denial, regenerative support. HOSTILE where the bloom has spread.
  fungal_sporeling: {
    id: 'fungal_sporeling', name: 'Sporeling',
    color: '#8fd06f', shape: 'circle', radius: 11, material: 'verdant', look: 'sporeling',
    base: { life: 30, moveSpeed: 158, accuracy: 92, mana: 0 },
    mods: [mod('chaosRes', 'flat', 0.6)],
    skills: ['claw'],
    xp: 9, faction: 'fungal',
    brain: { type: 'swarm' },
    detection: 1.1, // the chaff that scurries the spore-mat
  },
  fungal_puffball: {
    id: 'fungal_puffball', name: 'Puffball',
    color: '#adbf6a', shape: 'circle', radius: 14, material: 'verdant', look: 'puffball',
    base: { life: 38, moveSpeed: 120, accuracy: 88, mana: 0 },
    mods: [mod('chaosRes', 'flat', 0.7)],
    skills: ['claw'],
    xp: 14, faction: 'fungal',
    brain: { type: 'swarm' },
    detection: 0.9,
    // The Bloom's spore orb: on death it gathers into a drifting spore-sphere that
    // tracks you for a moment before bursting (the fungal flavour of Volatile). CHAOS
    // damage → the canonical chaos-green tint reads as "spore/poison — chaos resistance".
    deathBurst: { mode: 'orb', damageFrac: 0.5, damageType: 'chaos', coalesce: 0.7, orbDuration: 2.8, orbSpeed: 105, orbTurn: 1.8, radius: 80 },
  },
  fungal_spitter: {
    id: 'fungal_spitter', name: 'Spore Spitter',
    color: '#9aae3a', shape: 'star', radius: 13, material: 'verdant', look: 'spore_spitter',
    base: { life: 44, moveSpeed: 118, accuracy: 100, mana: 130, manaRegen: 9 },
    mods: [mod('chaosRes', 'flat', 0.7)],
    skills: ['venom_bolt', 'toxic_cloud'],
    xp: 18, faction: 'fungal',
    brain: { type: 'strafer' }, // kites, lobs spore globs
    detection: 1.25,
  },
  fungal_brute: {
    id: 'fungal_brute', name: 'Mycelial Brute',
    color: '#6e8a4a', shape: 'octagon', radius: 21, material: 'verdant', look: 'mycelial_brute',
    base: { life: 150, moveSpeed: 86, accuracy: 100, armor: 36, mana: 50, manaRegen: 5, poise: 45 },
    mods: [mod('chaosRes', 'flat', 0.8)],
    skills: ['heavy_strike', 'ground_slam'],
    xp: 32, faction: 'fungal', adorn: 'horns',
    brain: { type: 'juggernaut', enrage: 0.4 }, // the wall you grind through to reach the core
    detection: 0.85,
  },
  fungal_tender: {
    id: 'fungal_tender', name: 'Bloom-Tender',
    color: '#c08ae0', shape: 'cross', radius: 17, material: 'verdant', look: 'fungal_tender',
    base: { life: 120, moveSpeed: 98, mana: 220, manaRegen: 16, poise: 35 },
    mods: [mod('chaosRes', 'flat', 0.7), mod('minionDamage', 'increased', 0.3)],
    skills: ['summon_sporeling', 'unholy_aura', 'despair'],
    xp: 36, faction: 'fungal', adorn: 'tentacles',
    brain: { type: 'commander' }, // re-seeds the swarm + buffs — kill-priority
    detection: 1.0,
  },

  // --- THE HEARTBLOOM (the Mycelia core boss; toggleable via MyceliaSurge.heartbloom)
  // A slow fruiting mass at the bloom's core. Crowned on spawn; striking it FORCES the
  // bloom to collapse toward dormancy (a high-risk shortcut to push it back). Phases
  // escalate from a spore-shepherd → a spore-storm artillery → a tendril-rooting commander.
  fungal_heartbloom: {
    id: 'fungal_heartbloom', name: 'The Heartbloom',
    color: '#a6d24a', shape: 'star', radius: 28, material: 'verdant', look: 'heartbloom',
    base: { life: 600, moveSpeed: 72, accuracy: 118, armor: 44, mana: 340, manaRegen: 22, poise: 90 },
    mods: [mod('chaosRes', 'flat', 0.8), mod('minionDamage', 'increased', 0.4)],
    skills: ['summon_sporeling', 'toxic_cloud', 'contagion', 'essence_drain', 'agony'],
    xp: 340, faction: 'fungal', adorn: 'tentacles',
    detection: 1.1,
    brain: {
      type: 'commander',
      phases: [
        { atLifeFrac: 0.66, type: 'artillery', mods: [mod('castSpeed', 'more', 0.4)],
          announce: 'The Heartbloom convulses — a storm of spores!' },
        { atLifeFrac: 0.33, type: 'commander', mods: [mod('castSpeed', 'more', 0.5), mod('moveSpeed', 'more', -0.3)],
          announce: 'The Heartbloom roots deep — tendrils erupt to drag you in!' },
      ],
    },
  },

  magma_worm: {
    id: 'magma_worm', name: 'Magma Worm',
    color: '#ff7a3a', shape: 'circle', radius: 15, material: 'ember', look: 'magma_worm_head',
    base: { life: 110, moveSpeed: 135, accuracy: 90, mana: 120, manaRegen: 8 },
    mods: [mod('fireRes', 'flat', 0.75)],
    skills: ['firebolt', 'claw'],
    xp: 34,
    // THE BATH (the wayfaring fabric's debut relish): the melt cannot touch
    // it (immuneGround), and at pathCost 0.5 its flow fields actively SEEK
    // the lava lanes — a magma worm crossing the caldera rolls through the
    // pools by choice while everything mortal picks its way around the shore.
    immuneGround: ['lava', 'magma_core'],
    pathCosts: { lava: 0.5 },
    brain: { type: 'swarm' },
    worm: { length: 7, spacing: 17, taper: 0.86 },
  },

  // --- Spawner objects: stationary "monsters" whose only skill is a summon.
  // They ride the same pipeline as everything else — their spawn is a real
  // summon skill, their death a real death (xp, drops, corpse). 'spawners'
  // objectives place them and complete when every one is destroyed.

  bone_altar: {
    id: 'bone_altar', name: 'Bone Altar',
    color: '#b8b09a', shape: 'square', radius: 21, material: 'bone', look: 'bone_altar',
    base: { life: 150, moveSpeed: 0, armor: 25, evasion: 0, mana: 999, manaRegen: 50 },
    mods: [mod('chaosRes', 'flat', 0.5)],
    skills: ['spew_dead'],
    xp: 45,
    spawner: true,
  },

  ember_rift: {
    id: 'ember_rift', name: 'Ember Rift',
    color: '#ff6a2a', shape: 'diamond', radius: 19, material: 'ember', look: 'elemental_rift',
    base: { life: 120, moveSpeed: 0, armor: 10, evasion: 0, mana: 999, manaRegen: 50 },
    mods: [mod('fireRes', 'flat', 0.75)],
    skills: ['spew_flame'],
    xp: 50,
    spawner: true,
  },

  // THE BREACH SCAR — the war-wound's own spawner (the wasteland's
  // spawners-objective destructible): a standing tear burning the Durance's
  // cold green, defending itself the Legion's way — it tears the ground
  // under whoever comes to close it.
  breach_scar: {
    id: 'breach_scar', name: 'Breach Scar',
    color: '#7de84a', shape: 'diamond', radius: 19, material: 'void', look: 'elemental_rift',
    base: { life: 130, moveSpeed: 0, armor: 12, evasion: 0, mana: 999, manaRegen: 50 },
    mods: [mod('chaosRes', 'flat', 0.6)],
    skills: ['infernal_rift'],
    xp: 50,
    spawner: true,
  },

  // --- The war-wound's own (the surface rift's natives) ---------------------
  // The UNMAKER ACOLYTE: the war's quiet clerisy — robed adepts who tend the
  // rents and speak what the wound taught them (the Unmaking family, in
  // enemy hands first: you meet the skill before you loot it).
  unmaker_acolyte: {
    id: 'unmaker_acolyte', name: 'Unmaker Acolyte',
    color: '#7de84a', shape: 'diamond', radius: 13, material: 'void', look: 'unmaker_acolyte',
    base: { life: 34, moveSpeed: 120, mana: 110, manaRegen: 8 },
    mods: [mod('chaosRes', 'flat', 0.5)],
    skills: ['unmaking_bolt', 'null_verge'],
    xp: 16,
    faction: 'demon',
    // The rite in progress (the fire-cult vigil grammar): acolytes circle
    // their eldest, eyes inward, until interrupted.
    brain: {
      type: 'caster',
      squad: { idle: { style: 'circle', ring: 96 } },
    },
  },
  // The HATEBOUND HULK: the Legion's plunder-mule — a branded bulk hauling
  // the war's take. What you see strapped to it is what it DROPS
  // (MonsterDef.carry: the walking-armory contract on demon ground).
  hatebound_hulk: {
    id: 'hatebound_hulk', name: 'Hatebound Hulk',
    color: '#9a4a5a', shape: 'hexagon', radius: 18, material: 'stone', look: 'hatebound_hulk',
    base: { life: 150, moveSpeed: 78, accuracy: 85, armor: 26, mana: 0, poise: 55 },
    mods: [mod('chaosRes', 'flat', 0.4)],
    skills: ['claw'], xp: 28,
    faction: 'demon',
    carry: { chance: 0.5 },
    turnSpeed: 3.4,
    // A beast of burden does not startle; it finishes what it started.
    aggro: { fixation: 1.4, fury: 0.9, waver: 0.8 },
    brain: { type: 'juggernaut' },
  },

  rime_stone: {
    id: 'rime_stone', name: 'Rime Stone',
    color: '#9accdf', shape: 'square', radius: 20, material: 'ice', look: 'elemental_rift',
    base: { life: 170, moveSpeed: 0, armor: 35, evasion: 0, mana: 999, manaRegen: 50 },
    mods: [mod('coldRes', 'flat', 0.75)],
    skills: ['spew_rime'],
    xp: 50,
    spawner: true,
  },

  // The crystal country's own mouth (the attunement pass — its 'spawners'
  // objective no longer borrows the rime stone): the lode calving its
  // living lattice.
  resonant_stone: {
    id: 'resonant_stone', name: 'Resonant Stone',
    color: '#9fd8ff', shape: 'square', radius: 20, material: 'crystal', look: 'elemental_rift',
    base: { life: 180, moveSpeed: 0, armor: 30, evasion: 0, mana: 999, manaRegen: 50 },
    mods: [mod('lightningRes', 'flat', 0.6)],
    skills: ['spew_shards'],
    xp: 50,
    spawner: true,
  },

  // --- The Goblin warband: a faction with a grudge ---------------------------
  // Goblins and the undead share no love; in WAR ZONES they spawn brawling.

  goblin_skirmisher: {
    id: 'goblin_skirmisher', name: 'Goblin Skirmisher',
    color: '#7aa83e', shape: 'pentagon', radius: 10, look: 'goblin',
    base: { life: 22, moveSpeed: 175, accuracy: 85, evasion: 60, mana: 0 },
    skills: ['claw'],
    xp: 8,
    // THE COWARD (MoraleSpec showcase): breaks and routs when badly hurt,
    // rallies after a breath — but holds firm near a leader (the shaman a
    // pack promoted). Goblin courage is borrowed courage.
    brain: {
      type: 'skirmish', withdraw: 1.2,
      morale: { breakAtLife: 0.35, rallyAfter: 2.5, boldNearLeader: 280 },
      // FEAR is a METER, not a switch (drives): every wound stings it up,
      // every squadmate falling in earshot jumps it hard, quiet cools it.
      // Past the threshold the goblin fights WARY — longer withdrawals,
      // breaks sooner — the graded band between brave and broken that the
      // binary morale system can't say. Courage near a leader still holds
      // the ROUT; fear just makes the skirmishing honest about its nerves.
      drives: { fear: { rise: -0.05, onHurt: 0.12, onAllyDeath: 0.28 } },
      rules: [{
        when: { drive: { id: 'fear', above: 0.6 } },
        use: {
          move: { style: 'hitAndRun', withdraw: [2.2, 2.8] },
          morale: { breakAtLife: 0.5, rallyAfter: 2.5, boldNearLeader: 280 },
        },
      }],
      // Goblin marching order is a RABBLE: a loose amble around whoever
      // leads, with stragglers who lag and jog to catch up — the exact
      // opposite of the gnoll drill two ridges over.
      squad: { idle: { style: 'loose', stragglerChance: 0.45 } },
      // DIM (BehaviorSpec): a beat of gawping before the first swing, and
      // sloppy hands ever after — goblin menace is numbers, not craft.
      behavior: { reaction: [0.35, 0.8], aimJitter: 0.16 },
    },
    faction: 'goblin',
    adorn: 'ears',
  },

  goblin_shaman: {
    id: 'goblin_shaman', name: 'Goblin Shaman',
    color: '#8ec84e', shape: 'diamond', radius: 12, look: 'goblin_shaman',
    base: { life: 30, moveSpeed: 130, mana: 120, manaRegen: 9 },
    gemBias: ['spell'], // a caster's kills lean toward caster gems
    mods: [mod('lightningRes', 'flat', 0.4)],
    skills: ['spark', 'rallying_howl'],
    xp: 16,
    // Dim like its kin: slow to open, sparks spraying wide — and its rhythm
    // is a mess (plantChance): sometimes it roots and fires again from the
    // same spot, sometimes it scurries mid-volley. Learn nothing from it.
    brain: { type: 'caster', behavior: { reaction: [0.5, 1.0], aimJitter: 0.22, plantChance: 0.35 } },
    wardPriority: 2, // the warband shields its shaman like a commander
    faction: 'goblin',
    adorn: 'ears',
  },

  goblin_brute: {
    id: 'goblin_brute', name: 'Goblin Brute',
    color: '#6a9838', shape: 'hexagon', radius: 17, look: 'goblin_brute',
    base: { life: 110, moveSpeed: 110, accuracy: 95, armor: 30, mana: 60, manaRegen: 6 },
    skills: ['heavy_strike', 'cleave'],
    // Its kit EVOLVES with level (the demo of MonsterDef.grants): a low brute just
    // cleaves; a veteran's cleave flurries (Multistrike) then chains (Reverberation),
    // and an elder gains War Cry. Both supports require 'melee' — which cleave has.
    grants: [
      { atLevel: 10, support: 'multistrike', on: 'cleave' },
      { atLevel: 40, support: 'reverberation', on: 'cleave' },
      { atLevel: 50, skill: 'war_cry' },
    ],
    xp: 24,
    // Dim AND heavy: a gawping beat before the first swing, and the cleave
    // waits for the shoulders — goblin muscle, goblin wits.
    brain: { type: 'basic', behavior: { reaction: [0.4, 0.8], castArc: 0.6 } },
    faction: 'goblin',
    adorn: 'ears',
  },

  goblin_chief: {
    id: 'goblin_chief', name: 'Goblin Chief',
    color: '#a8c84e', shape: 'cross', radius: 15, look: 'goblin_chief',
    base: { life: 140, moveSpeed: 115, accuracy: 100, armor: 25, mana: 90, manaRegen: 7, poise: 35 },
    skills: ['rallying_howl', 'war_cry', 'heavy_strike'],
    xp: 42,
    brain: { type: 'commander' },
    faction: 'goblin',
    adorn: 'ears',
  },

  // --- The Goblin warband's bigger kin: orcs and trolls march with goblins.

  orc_ravager: {
    id: 'orc_ravager', name: 'Orc Ravager',
    color: '#5a8848', shape: 'trapezoid', radius: 16, look: 'orc',
    base: { life: 95, moveSpeed: 145, accuracy: 100, armor: 25, mana: 40, manaRegen: 5, poise: 40 },
    skills: ['cleave', 'heavy_strike'],
    xp: 26,
    brain: { type: 'flanker' },
    faction: 'goblin',
    adorn: 'horns',
  },

  troll_mauler: {
    id: 'troll_mauler', name: 'Troll Mauler',
    color: '#4e7858', shape: 'rectangle', radius: 24, material: 'fur', look: 'troll',
    // Trolls regenerate — kill it faster than it knits itself back together.
    base: { life: 260, moveSpeed: 85, accuracy: 90, armor: 40, mana: 40, manaRegen: 4, poise: 65 },
    mods: [mod('lifeRegen', 'flat', 8)],
    // Opt-in scaling so the troll stays a credible BRICK at high level instead of
    // being out-DPSed into irrelevance: its regen + armor climb FLAT per level (a
    // lever the baseline doesn't touch), keeping the "knits itself back together"
    // fantasy threatening at 40+ without making it un-killable at level 1.
    scaling: {
      lifeRegen: { flatPerLevel: 0.7 },  // +0.7 regen/level on top of the base 8
      armor: { flatPerLevel: 3 },        // +3 armor/level — physically tougher over time
    },
    skills: ['ground_slam', 'heavy_strike'],
    xp: 52,
    // A troll turns like a felled log rights itself: the slam waits for the
    // bulk to bear, and the first blow of any fight comes a thought late.
    // And a troll KEEPS SCORE (drives): every wound stokes a wrath that
    // cools between fights — chip it long enough and it goes berserk at
    // ANY life total, where enrage waits for the bar. Two angers, two clocks.
    brain: {
      type: 'juggernaut', enrage: 0.4,
      behavior: { castArc: 0.65, reaction: [0.4, 0.9] },
      drives: { wrath: { rise: -0.05, onHurt: 0.09 } },
      rules: [{
        when: { drive: { id: 'wrath', above: 0.6 } },
        announce: 'the troll seethes!',
        use: { skillUse: { cadence: [0.1, 0.25] }, move: { style: 'direct', pace: 1.25 }, behavior: { reaction: [0, 0] } },
      }],
    },
    faction: 'goblin',
    adorn: 'spikes',
  },

  // --- The Gnoll packs: hyena-folk who run with the goblins and despise
  // the sylvan groves. They circle. They wait. Then all of them come at once —
  // FROM ALL SIDES. THE SQUAD-TACTICS SHOWCASE: prowlers muster (pack preset),
  // then work the ENGAGEMENT RING (BehaviorSpec.encircle, preset-carried): two
  // press your face while the rest wrap the flanks and the back, elbow room
  // keeping the charge a crescent — no more conga line shoving its own front
  // rank out of cast range. They share the leader's mark — and scatter when
  // the leader falls.

  gnoll_prowler: {
    id: 'gnoll_prowler', name: 'Gnoll Prowler',
    color: '#b08a48', shape: 'kite', radius: 13, material: 'fur', look: 'gnoll',
    base: { life: 38, moveSpeed: 170, accuracy: 95, evasion: 60, mana: 0 },
    skills: ['claw'],
    xp: 14,
    brain: {
      type: 'pack',
      // MILITANT off the clock too: the pack marches in a drilled column on
      // its leader (SquadSpec.idle 'drill') — you see the discipline before
      // you feel it.
      squad: {
        focusLeader: true, onLeaderDeath: 'scatter',
        formation: 'column', spacing: 42, idle: { style: 'drill' },
      },
      // The preset's encircle (front 2) does the surrounding; spacing fans
      // the approach so packmates never bunch into a shoving file.
      behavior: { spacing: 36 },
      morale: { panicOnAllyDeath: { radius: 200, duration: 2.2, chance: 0.35 }, rallyAfter: 2.2 },
      // FACTION DREAD (world drives, scope 'faction'): every gnoll death
      // anywhere feeds the people's meter; while it runs high the
      // survivors' nerve thins — cull a warband and the stragglers break
      // easy. Quiet minutes cool it. Meter-driven conduct, no script.
      rules: [{
        when: { drive: { id: 'dread', above: 0.5, scope: 'faction' } },
        use: { morale: { breakAtLife: 0.55, rallyAfter: 3 } },
      }],
      // UNRULY: the howler's Snarled Orders land on a prowler barely half
      // the time (the obedience dial — the drill line is for show).
      obedience: 0.55,
    },
    faction: 'gnoll',
    adorn: 'ears',
  },

  gnoll_butcher: {
    id: 'gnoll_butcher', name: 'Gnoll Butcher',
    color: '#a87838', shape: 'trapezoid', radius: 15, material: 'fur', look: 'gnoll_butcher',
    base: { life: 75, moveSpeed: 150, accuracy: 100, armor: 15, mana: 40, manaRegen: 5, poise: 35 },
    // Veterans carry grog (swig: the reflex pocket brew) — a butcher who
    // drinks through his own cleave wind-up is the drill line's medic.
    skills: ['cleave', 'claw', 'swig'],
    xp: 22,
    // Butchers AVENGE a fallen leader instead of mourning it — and march
    // the drill line with the prowlers. Veterans: they heed the howler's
    // orders more often than the rank-and-file.
    brain: {
      type: 'flanker',
      squad: { focusLeader: true, onLeaderDeath: 'frenzy', formation: 'column', spacing: 42, idle: { style: 'drill' } },
      obedience: 0.7,
    },
    faction: 'gnoll',
    adorn: 'ears',
  },

  gnoll_longshot: {
    id: 'gnoll_longshot', name: 'Gnoll Longshot',
    color: '#c8a058', shape: 'kite', radius: 12, look: 'gnoll_archer',
    base: { life: 32, moveSpeed: 145, accuracy: 115, evasion: 50, mana: 60, manaRegen: 5 },
    skills: ['snipe', 'bone_arrow'],
    xp: 20,
    // A sniper REMEMBERS: lose its sight-line and it stalks your last
    // position for a few heartbeats instead of shrugging. And a sniper takes
    // the HIGH GROUND: near a free watchtower slot it claims the perch (the
    // garrison verb — teleports in, anchors, rains arrows from the crown).
    brain: {
      type: 'artillery', perception: { memory: 4 },
      // A PRACTICED HAND (skillUse.finesse): it works Snipe's golden window —
      // the same second-press the player clicks — landing Perfect! a tunable
      // 45% of the time and fumbling the rest.
      skillUse: { finesse: { chance: 0.45 } },
      // AND A PRACTICED EYE, sometimes (BehaviorSpec.aimLead): under half its
      // shots lead your run — enough that straight-line strafing stops being
      // free, not so many that juking it is pointless. Rolled PER SHOT.
      // (No feint — an honest draw. Bluffed bars are a trickster's SIGNATURE,
      // not marksman texture; the lash maiden owns that game.)
      behavior: { aimLead: 0.55, aimLeadChance: 0.45 },
      rules: [{
        when: { distUnder: 720 },
        actions: [{ do: 'garrison', within: 680 }],
        use: { move: { style: 'garrison' } },
        cooldown: 4,
      }],
      // A sniper follows target calls — the most obedient gnoll afield.
      obedience: 0.8,
    },
    faction: 'gnoll',
    adorn: 'ears',
  },

  gnoll_howler: {
    id: 'gnoll_howler', name: 'Gnoll Howler',
    color: '#d8b068', shape: 'trapezoid', radius: 14, look: 'gnoll_howler',
    base: { life: 90, moveSpeed: 130, accuracy: 95, mana: 100, manaRegen: 8 },
    // SNARLED ORDERS = the enemy command lever's proof: the howler barks the
    // pack (same-faction kin in earshot) onto its mark, and each gnoll rolls
    // its own brain's `obedience` — an unruly lot, so only some converge.
    skills: ['rallying_howl', 'war_cry', 'snarled_orders', 'claw'],
    xp: 34,
    // The HOWL is literal: sighting prey puts every gnoll within earshot on
    // alert toward it (PerceptionSpec.alertShout — the sentry callout). The
    // voice of the pack keeps itself alive: it reads wind-ups and steps out.
    brain: {
      type: 'commander', perception: { alertShout: 480 },
      behavior: { dodge: { chance: 0.6, reaction: [0.2, 0.45] } },
    },
    faction: 'gnoll',
    adorn: 'ears',
  },

  // --- WILDLIFE: the ambient fauna layer (WILDLIFE registry, spawnWildlife).
  // Not encounters — TEXTURE. Prey exists to wander and bolt; predators hunt
  // it through TargetSpec.prey (one-directional hostility in World.hostileTo),
  // so the meadow stages its own dramas. All AMBIENT_TAGS bearers: no
  // objective ever waits on a rabbit.

  // THE PREY ANIMAL: skittish is its whole personality — ANYTHING non-kin
  // inside its bubble sends it bolting. Near-blind on purpose (detection +
  // detectability both floored) so it never "acquires" anything and nothing
  // casually acquires it; wolves find it anyway (their detection is keen).
  meadow_hare: {
    id: 'meadow_hare', name: 'Meadow Hare',
    color: '#c8b494', shape: 'oval', radius: 7, look: 'hare',
    base: { life: 8, moveSpeed: 215, evasion: 80, mana: 0 },
    mods: [mod('detectability', 'more', -0.7)],
    skills: [],
    xp: 1,
    tag: 'critter',
    faction: 'beast', tags: ['beast'],
    detection: 0.1,
    drops: 0,
    scaleVariance: [0.8, 1.15],
    brain: {
      type: 'basic',
      morale: { skittish: { radius: 150, duration: [1.4, 2.4] } },
      perception: { arcDeg: 320, rearMul: 0.9 }, // eyes on the sides of its head
      // The FLIGHT is the whole animal: it JUKES — random hooks, dead-stop
      // freezes — instead of solving a straight line, and it TIRES (kite
      // budget): after ~3s of flat sprint it stands panting, catchable even
      // by something slower. Faster-than-you prey, fair by rhythm.
      move: { style: 'juke', hookEvery: [0.3, 0.7], hookArc: 1.25, freezeChance: 0.2, freeze: [0.2, 0.45] },
      tempo: { kite: 3.2, windedFor: [0.8, 1.4] },
    },
  },

  // THE PREDATOR: hunts 'critter' wildlife by brain (prey), players by team —
  // a pack with real discipline: muster two, rotate two engage tokens, fan
  // the approach, remember where you slipped away, scatter when the alpha
  // falls. Keen-nosed (high detection beats the hare's low detectability).
  plains_wolf: {
    id: 'plains_wolf', name: 'Plains Wolf',
    color: '#9a9088', shape: 'kite', radius: 12, look: 'hound',
    base: { life: 34, moveSpeed: 188, accuracy: 95, evasion: 40, mana: 0 },
    skills: ['claw'],
    xp: 12,
    tag: 'predator',
    faction: 'beast', tags: ['beast'],
    detection: 1.6,
    adorn: 'ears',
    scaleVariance: [0.9, 1.25],
    brain: {
      type: 'pack',
      // THE WANTS (BrainDef.drives): a wolf hunts because it HUNGERS. The
      // meter climbs through the day; past the threshold (the rule below)
      // the meadow's critters become food — and a kill feeds the WHOLE
      // pack in earshot (share), so one hare buys the field an hour of
      // peace. Sated wolves amble past the prey they'd have run down.
      drives: { hunger: { rise: 0.01, start: [0.3, 0.8], onKill: -0.7, share: 0.4 } },
      // The wait RESOLVES (muster.patience): five seconds of circling a prey
      // that won't be caught up to, and hunger wins — a lone or scattered
      // wolf no longer strafes a slow player to the horizon forever.
      squad: { muster: { count: 2, radius: 340, patience: 5 }, tokens: 2, surround: true, onLeaderDeath: 'scatter' },
      perception: { memory: 3 },
      // A wolf STALKS: lopes in bursts with held, watching pauses — the
      // hesitation of a real animal, and your window to line up a shot.
      tempo: { moveFor: [1.2, 2.2], pauseFor: [0.25, 0.6] },
      rules: [
        // HUNGER opens the hunt: predation (prey + keener noses) exists
        // only while the meter runs high — and the IDLE pack MIGRATES
        // toward prey-rich ground (seek: scent outranges sight) instead
        // of milling in place. Conduct chasing the want, awake or idle.
        {
          when: { drive: { id: 'hunger', above: 0.6 } },
          use: {
            target: { prey: ['critter'], detectMul: 1.25 },
            behavior: { seek: { what: 'prey', pace: 0.5 } },
          },
        },
        // AND A WOLF POUNCES (targetCasting): the moment your hands commit
        // to a bar, the nearest wolf breaks its stalk and dives the opening.
        {
          when: { targetCasting: 0.35, distUnder: 380, chance: 0.55 },
          hold: [0.7, 1.1], cooldown: 3,
          use: { move: { style: 'direct', pace: 1.3 } },
        },
      ],
    },
  },

  // THE SAND LEAPER (D2 homage): a skittering desert ambusher whose MIND is
  // rolled per spawn (brainVariants) — one clutch runs as a mustering pack,
  // the next hunts alone in hit-and-run darts, the next attacks in TIDES
  // (timid at range, then a boiling rush every few seconds, rinse, repeat).
  // Same body, three personalities; the spawn roll decides which walked in.
  sand_skitterer: {
    id: 'sand_skitterer', name: 'Sand Skitterer',
    color: '#d0b070', shape: 'trapezoid', radius: 11, look: 'skitterer',
    base: { life: 30, moveSpeed: 196, accuracy: 90, evasion: 70, mana: 0 },
    skills: ['claw'],
    xp: 13,
    tag: 'predator',
    faction: 'beast', tags: ['beast'],
    detection: 1.2,
    adorn: 'spikes',
    brainVariants: [
      { // the PACK-MIND: waits for numbers, then everyone at once
        weight: 2,
        brain: {
          type: 'pack',
          move: { style: 'skitter' },
          squad: { muster: { count: 3, radius: 360 }, surround: true },
        },
      },
      { // the LONER: darting hit-and-run, no one to wait for
        weight: 1,
        brain: {
          type: 'skirmish', withdraw: 1.1,
          move: { style: 'skitter', dart: [0.3, 0.55], pause: [0.1, 0.3] },
          perception: { memory: 2.5 },
        },
      },
      { // the TIDE: a strict ebb-and-flow on the CYCLE machine — hold off at
        // range, then a boiling skitter-rush, then ebb, forever; bolder for
        // every compatriot in the surge (the rule rides on top)
        weight: 1,
        brain: {
          type: 'artillery',
          move: { style: 'holdRange', hold: 260, band: [0.6, 1.3] },
          cycle: [
            { use: {}, for: [3.2, 5] }, // the ebb: the base holdRange stance
            { use: { move: { style: 'skitter', dart: [0.3, 0.5], pause: [0.08, 0.18] }, skillUse: { cadence: [0.1, 0.25] } }, for: [1.8, 2.6] },
          ],
          rules: [{
            when: { alliesWithin: { count: 3, radius: 320, kin: true } },
            use: { skillUse: { cadence: [0.08, 0.18] } },
          }],
        },
      },
    ],
  },

  // THE CAT (the 'lurk' kernel): it sidles the ring at a creep while you
  // WATCH it — and commits the instant your eyes leave it (or you stray
  // into its lap). Stare it down to hold it at bay; turn to fight its
  // packmate and the thicket moves. Hunts hares when you're not around.
  thicket_stalker: {
    id: 'thicket_stalker', name: 'Thicket Stalker',
    color: '#6a7a58', shape: 'kite', radius: 13, look: 'barbed_stalker',
    base: { life: 44, moveSpeed: 200, accuracy: 100, evasion: 70, mana: 0 },
    skills: ['claw'],
    xp: 16,
    tag: 'predator',
    faction: 'beast', tags: ['beast'],
    detection: 1.5,
    adorn: 'ears',
    brain: {
      type: 'basic',
      move: { style: 'lurk', ring: 260, commitRange: 250, unseenArc: 1.6 },
      // The cat hunts on its STOMACH's clock (drives): a fed stalker just
      // watches; a hungry one puts the meadow's small lives on the menu.
      drives: { hunger: { rise: 0.008, start: [0.2, 0.7], onKill: -0.6 } },
      perception: { memory: 3.5 },
      tempo: { moveFor: [1.4, 2.4], pauseFor: [0.3, 0.7] }, // a cat's patience
      rules: [
        {
          when: { drive: { id: 'hunger', above: 0.6 } },
          use: {
            target: { prey: ['critter'] },
            behavior: { seek: { what: 'prey', pace: 0.45 } },
          },
        },
        // The cat PUNISHES commitment: eyes leaving it is one opening — hands
        // busy with a cast bar is the other (targetCasting joins unseenArc).
        {
          when: { targetCasting: 0.3, distUnder: 420, chance: 0.8 },
          hold: [0.7, 1.1], cooldown: 2,
          use: { move: { style: 'direct', pace: 1.35 } },
        },
      ],
    },
  },

  // THE CARRION FLIER: harries, takes wing (leap = airborne + untargetable),
  // lands behind you, and when bloodied flees the fight ON THE WING — all of
  // it rules aiming one data skill. It also stoops on hares.
  dune_vulture: {
    id: 'dune_vulture', name: 'Dune Vulture',
    color: '#b09a80', shape: 'kite', radius: 13, look: 'vulture',
    base: { life: 38, moveSpeed: 170, accuracy: 95, evasion: 60, mana: 0 },
    skills: ['claw', 'take_wing'],
    xp: 14,
    tag: 'predator',
    faction: 'beast', tags: ['beast'],
    detection: 1.4,
    adorn: 'wings',
    brain: {
      type: 'skirmish', withdraw: 1.2,
      target: { prey: ['critter'] },
      // Sky-honed reflexes (dodge): a vulture reads the wind-up and is
      // simply elsewhere when the blast arrives — AWAY elsewhere, opening
      // distance from whoever threw it (exit 'away').
      behavior: { dodge: { chance: 0.8, reaction: [0.1, 0.3], exit: 'away' } },
      rules: [
        { // bloodied: flee on the wing — and CIRCLE out of reach while the
          // fright holds, before hunger drags it back in
          when: { lifeBelow: 0.5 },
          every: [6, 9], hold: [3.5, 5],
          announce: 'It takes wing!',
          actions: [{ do: 'cast', skill: 'take_wing', at: 'awayFromTarget', force: true }],
          use: { move: { style: 'holdRange', hold: 420 } },
        },
        { // healthy: wing OVER the fight and drop on your back
          when: { lifeAbove: 0.5, distUnder: 420 },
          every: [6, 9], hold: [0.2, 0.3],
          actions: [{ do: 'cast', skill: 'take_wing', at: 'behindTarget', force: true }],
        },
      ],
    },
  },

  // --- THE HOMAGE BATCH: bestiary archetypes from the classics, each one a
  // COMPOSITION over existing levers — no new engine code below this line.

  // The wisp (D2 Gloam): fades from sight, blinks, and lashes lightning
  // from the dark — the fade is a plain buff (invisible mod), the blink a
  // teleport verb, both on rule clocks. Undead roster.
  gloam: {
    id: 'gloam', name: 'Gloam',
    color: '#cfe86a', shape: 'star', radius: 10, look: 'wraith',
    base: { life: 26, moveSpeed: 150, evasion: 90, mana: 140, manaRegen: 12 },
    mods: [mod('lightningRes', 'flat', 0.6), mod('chaosRes', 'flat', 0.3)],
    skills: ['spark'],
    xp: 18,
    faction: 'undead',
    detection: 1.3,
    brain: {
      type: 'artillery',
      move: { style: 'holdRange', hold: 420 },
      rules: [
        { // the wisp-drift: fade out, reappear on a new firing line
          when: {}, every: [3.5, 6], hold: [0.2, 0.3],
          actions: [
            { do: 'buff', buff: { type: 'buff', id: 'gloam_fade', duration: 1.1, mods: [mod('invisible', 'flat', 1)] } },
            { do: 'teleport', to: 'nearTarget', range: 380 },
          ],
        },
        { // crowded: flicker hard AWAY
          when: { distUnder: 180 }, every: [2.5, 4], hold: [0.1, 0.2],
          actions: [
            { do: 'buff', buff: { type: 'buff', id: 'gloam_fade', duration: 0.9, mods: [mod('invisible', 'flat', 1)] } },
            { do: 'teleport', to: 'awayFromTarget', range: 420 },
          ],
        },
      ],
    },
  },

  // The dark blade (D2 Oblivion Knight): curse FIRST, then the vicious
  // work — and it smells a kill, quickening on wounded prey.
  oblivion_knight: {
    id: 'oblivion_knight', name: 'Oblivion Knight',
    color: '#5a4a6a', shape: 'pentagon', radius: 16, look: 'dread_knight',
    base: { life: 120, moveSpeed: 140, accuracy: 115, armor: 45, mana: 120, manaRegen: 9, poise: 65 },
    mods: [mod('chaosRes', 'flat', 0.5), mod('coldRes', 'flat', 0.3)],
    skills: ['heavy_strike', 'cleave', 'despair'],
    xp: 34,
    faction: 'undead',
    adorn: 'horns',
    detection: 1.1,
    brain: {
      type: 'flanker',
      skillUse: { mode: 'priority', order: ['despair', 'heavy_strike', 'cleave'] },
      // Elite intellect (the sylvan tier of the undead): it reads wind-ups
      // and strafes off the disc laterally — a blade keeps its blade range —
      // and its curse arcs LEAD a running mark.
      behavior: { aimLead: 0.65, aimLeadChance: 0.8, dodge: { chance: 0.5, reaction: [0.2, 0.4], exit: 'lateral' } },
      rules: [{ when: { targetLifeBelow: 0.35 }, use: { skillUse: { cadence: [0.08, 0.18] } } }],
    },
  },

  // The finger mage (D2 homage): volleys of slow, LOOSELY-TRACKING motes
  // (spectral_finger's weak cursor guide + wobble) from a held line.
  finger_mage: {
    id: 'finger_mage', name: 'Finger Mage',
    color: '#b8d0a0', shape: 'cross', radius: 12, look: 'ritual_mage',
    base: { life: 44, moveSpeed: 120, mana: 200, manaRegen: 14 },
    mods: [mod('chaosRes', 'flat', 0.5)],
    skills: ['spectral_finger'],
    xp: 24,
    faction: 'demon',
    adorn: 'tentacles',
    detection: 1.2,
    brain: {
      type: 'artillery',
      move: { style: 'holdRange', hold: 460 },
      skillUse: { cadence: [0.25, 0.5] },
      // Half its volleys LEAD your run — and its hand never leaves them:
      // steerAim refreshes its aim every tick, so the motes' innate guide
      // (spectral_finger's trajectory) tracks you LIVE, the D2 finger-mage
      // feel perfected. The planning mind, then the following hand.
      behavior: { aimLead: 0.45, aimLeadChance: 0.5, steerAim: { lead: 0.25 } },
      // The siege posture: a mage in a garrison squad crews a tower BEFORE
      // the fight finds it (SquadSpec.idle 'siege').
      squad: { idle: { style: 'siege' } },
    },
  },

  // The walking tower (D2 Siege Beast): a lumbering melee engine with a
  // RIDER SLOT on its back — demonkin mount it and cast from the saddle
  // while it romps and mauls. Mobile defense, two health bars deep.
  siege_hulk: {
    id: 'siege_hulk', name: 'Siege Hulk',
    color: '#8a5a3a', shape: 'octagon', radius: 24, look: 'siege_hulk',
    base: { life: 260, moveSpeed: 95, accuracy: 110, armor: 55, mana: 60, manaRegen: 6, poise: 70, poiseDR: 0.45 },
    mods: [mod('fireRes', 'flat', 0.4)],
    skills: ['ground_slam', 'heavy_strike'],
    xp: 46,
    faction: 'demon',
    adorn: 'horns',
    detection: 1.0,
    mountSlot: { kinds: ['demonkin'] },
    // A tower swings where it points (castArc): romp past its shoulder while
    // the riders on its back keep casting — two problems, one body.
    brain: {
      type: 'juggernaut', enrage: 0.35,
      behavior: { castArc: 0.6 },
      squad: { idle: { style: 'siege' } },
    },
  },

  // The fragile teeth (D2 Arreat demonkin): blinks about, and when the
  // fight turns it TAKES COVER — onto a hulk's back (mount) or into a
  // free watchtower slot (garrison), raining fire from whichever perch.
  demonkin_darter: {
    id: 'demonkin_darter', name: 'Demonkin Darter',
    color: '#e07a48', shape: 'triangle', radius: 10, look: 'imp',
    base: { life: 22, moveSpeed: 185, evasion: 70, mana: 120, manaRegen: 10 },
    skills: ['firebolt'],
    xp: 16,
    faction: 'demon',
    tag: 'demonkin',
    adorn: 'horns',
    detection: 1.2,
    brain: {
      type: 'skirmish', withdraw: 1.0,
      // Darter reflexes (dodge): it reads the wind-up and skips the disc —
      // between this and the blink, catching one is the whole fight.
      behavior: { dodge: { chance: 0.75, reaction: [0.12, 0.3] } },
      squad: { idle: { style: 'siege' } },
      rules: [
        { // the blink: never where you swung
          when: { distUnder: 160 }, every: [3, 5], hold: [0.1, 0.2],
          actions: [{ do: 'teleport', to: 'awayFromTarget', range: 300 }],
        },
        { // pressed: take cover — a saddle first, a tower crown second
          when: { lifeBelow: 0.75 }, every: [5, 9], hold: [0.2, 0.3],
          actions: [
            { do: 'mount', within: 560 },
            { do: 'garrison', within: 520 },
          ],
        },
      ],
    },
  },

  // The creeping cold (D2 frost horrors): barely walks, doesn't need to —
  // grinding fields of frost CRAWL at you instead (creeping_ice's drift).
  glacial_horror: {
    id: 'glacial_horror', name: 'Glacial Horror',
    color: '#8ac8e8', shape: 'octagon', radius: 18, look: 'glacial_horror',
    base: { life: 150, moveSpeed: 55, accuracy: 105, armor: 40, mana: 180, manaRegen: 12 },
    mods: [mod('coldRes', 'flat', 0.75), mod('fireRes', 'flat', -0.3)],
    skills: ['creeping_ice', 'frostbolt'],
    xp: 32,
    faction: 'elemental',
    detection: 1.1,
    brain: {
      type: 'artillery',
      move: { style: 'holdRange', hold: 300, band: [0.5, 1.2] },
      skillUse: { mode: 'priority', order: ['creeping_ice', 'frostbolt'] },
      // Glacial DELIBERATION (the monotony lever, high end): it mostly
      // plants after each working and lets the ice do the walking.
      behavior: { plantChance: 0.75, plantFor: [0.8, 1.4] },
    },
  },

  // --- The BROOD CHAIN (D2 spider caves): broodmother lays NESTS, nests
  // hatch spiderlings — three defs and two summon rules; the infestation
  // is emergent, not scripted. All ambient ('predator') wildlife.
  spiderling: {
    id: 'spiderling', name: 'Spiderling',
    color: '#6a5a48', shape: 'cross', radius: 6, look: 'spider_small',
    base: { life: 10, moveSpeed: 195, accuracy: 75, evasion: 50, mana: 0 },
    skills: ['claw'],
    xp: 2,
    tag: 'predator',
    faction: 'beast', tags: ['beast'],
    drops: 0,
    brain: { type: 'swarm', move: { style: 'skitter', dart: [0.25, 0.45], pause: [0.08, 0.2] } },
  },
  spider_nest: {
    id: 'spider_nest', name: 'Spider Nest',
    color: '#9a8a70', shape: 'oval', radius: 14, look: 'spider_nest',
    base: { life: 55, moveSpeed: 0, armor: 20, mana: 0 },
    skills: [],
    xp: 8,
    tag: 'predator',
    faction: 'beast', tags: ['beast'],
    drops: 0,
    brain: {
      type: 'basic',
      rules: [{
        when: {}, every: [5, 8], hold: [0.1, 0.2],
        actions: [{ do: 'summon', monster: 'spiderling', count: 2, ring: 44, lifespan: 25 }],
      }],
    },
  },
  broodmother: {
    id: 'broodmother', name: 'Broodmother',
    color: '#7a6a52', shape: 'cross', radius: 17, look: 'spider_big',
    base: { life: 130, moveSpeed: 120, accuracy: 95, armor: 25, mana: 40, manaRegen: 5 },
    mods: [mod('chaosRes', 'flat', 0.4)],
    skills: ['claw'],
    xp: 30,
    tag: 'predator',
    faction: 'beast', tags: ['beast'],
    adorn: 'spikes',
    detection: 1.2,
    brain: {
      type: 'pack',
      move: { style: 'skitter', dart: [0.35, 0.6], pause: [0.2, 0.5] },
      rules: [{
        when: {}, every: [10, 16], hold: [0.2, 0.3],
        actions: [{ do: 'summon', monster: 'spider_nest', count: 1, ring: 90, lifespan: 40, announce: 'The brood takes root!' }],
      }],
    },
  },

  // The huntress (D2 Lacuni): javelins from a lope, and every so often the
  // whole line RUSHES in, cuts, and melts back out — the impulse rhythm.
  lash_maiden: {
    id: 'lash_maiden', name: 'Lash Maiden',
    color: '#d8b078', shape: 'kite', radius: 13, look: 'lash_maiden',
    base: { life: 48, moveSpeed: 180, accuracy: 105, evasion: 65, mana: 60, manaRegen: 6, insight: 40 },
    skills: ['voltspear', 'claw'],
    xp: 20,
    tag: 'predator',
    faction: 'beast', tags: ['beast'],
    adorn: 'ears',
    detection: 1.3,
    scaleVariance: [0.9, 1.15],
    brain: {
      type: 'skirmish', withdraw: 1.3,
      target: { prey: ['critter'] },
      impulses: [{ type: 'swarm', every: [6, 9], duration: [1.2, 1.8] }],
      // THE FEINT IS HER SIGNATURE — and hers nearly alone (the player
      // can't cancel a bar; an enemy that constantly does reads as broken,
      // so bluffs stay RARE and this one's identity): roughly one draw in
      // six is bait for your sidestep, the true cast into your recovery.
      behavior: { feint: { chance: 0.18 } },
      // The huntress PUNISHES a planted foot: begin a bar with a maiden in
      // spear range and the line rushes THAT instant, not on its own clock.
      rules: [{
        when: { targetCasting: 0.3, distUnder: 340, chance: 0.6 },
        hold: [0.8, 1.2], cooldown: 2.5,
        use: { move: { style: 'direct', pace: 1.3 } },
      }],
    },
  },

  // --- THE WAYFARERS: neutral HUMANS on the roads — not brigands, not
  // bandits; hunters and pilgrims minding their own way (DORMANT until a
  // wounding hit rouses them: engine dormancy on the 'wayfarer' tag, and
  // they FORGIVE — NEUTRAL_RESET cools a roused wayfarer back down).
  wayfarer_hunter: {
    id: 'wayfarer_hunter', name: 'Wayfarer Hunter',
    color: '#b09868', shape: 'pentagon', radius: 13, look: 'hunter',
    base: { life: 60, moveSpeed: 150, accuracy: 110, evasion: 40, mana: 40, manaRegen: 4 },
    skills: ['bone_arrow', 'snipe'],
    xp: 18,
    tag: 'wayfarer',
    detection: 1.1,
    brain: {
      type: 'artillery',
      // A living marksman's hand: 55% Perfect! snipes when provoked.
      skillUse: { finesse: { chance: 0.55 } },
      // And a living marksman's EYE and FEET: he leads a running mark like
      // the player leads one, and STRAFES out of a wind-up he can see
      // coming — lateral, keeping his own range, the way you would.
      behavior: { aimLead: 0.7, aimLeadChance: 0.7, dodge: { chance: 0.7, reaction: [0.18, 0.4], exit: 'lateral' } },
      morale: { breakOutnumbered: { deficit: 3, radius: 300 }, rallyAfter: 4 },
    },
  },
  wayfarer_pilgrim: {
    id: 'wayfarer_pilgrim', name: 'Wayfarer Pilgrim',
    color: '#c8b898', shape: 'circle', radius: 12, look: 'pilgrim',
    base: { life: 40, moveSpeed: 140, evasion: 30, mana: 0 },
    skills: [],
    xp: 6,
    tag: 'wayfarer',
    detection: 0.3,
    drops: 0,
    brain: {
      type: 'basic',
      // A roused pilgrim doesn't fight — it scatters (and forgives later).
      morale: { skittish: { radius: 220, duration: [2, 3.5] } },
    },
  },

  // THE GILDED SCAMP — the loot-goblin chase, grief-proofed by construction:
  // it noses toward unclaimed WORLD loot (never a player's placed drop),
  // stuffs its sack, and RUNS — jukes, freezes, tires (the kite budget: it
  // IS catchable). A solid blow shakes a shiny loose; death spills the whole
  // sack plus its own hoard (the scamp_hoard kill row). It never leaves the
  // zone and never despawns holding your loot: catch it or let it caper.
  gilded_scamp: {
    id: 'gilded_scamp', name: 'Gilded Scamp',
    color: '#e8c84a', shape: 'pentagon', radius: 10, material: 'metal', look: 'goblin',
    base: { life: 95, moveSpeed: 225, accuracy: 60, evasion: 90, mana: 0 },
    skills: [],
    xp: 45,
    looter: { reach: 32 },
    // The hoard-bearer role: its death spills a bonus gem burst (the
    // scamp_hoard kill row keys on THIS tag, never the def id — any future
    // gilded creature joins the payout by wearing it).
    tag: 'gilded_hoard',
    // The purse under the sack: every solid blow also shakes ESSENCE loose —
    // the hunt trail that likely FIRST introduces the currency to a player.
    essenceSpill: {},
    detection: 1.3,
    adorn: 'ears',
    scaling: { life: { incPerLevel: 0.08 } },
    brain: {
      type: 'basic',
      move: { style: 'juke', hookEvery: [0.3, 0.7], freezeChance: 0.12 },
      // The nose for shinies: idle, it walks at the nearest unclaimed drop.
      behavior: { seek: { what: 'loot', pace: 0.7, range: 1600 } },
      // Anything comes close — it bolts (and its flight is the whole fight).
      morale: { skittish: { radius: 280, duration: [1.5, 2.6] } },
      // But its legs GIVE OUT on a rhythm you can learn: chase, wind it, catch.
      tempo: { kite: 3.2, windedFor: [0.9, 1.4] },
    },
  },

  // THE GILDED HOARDER — the scamp that got away once and got FAT: the
  // announced EVENT cousin (WILDLIFE rows carry its arrival line). It doesn't
  // snatch your drops — it IS the treasure: a walking essence purse on a much
  // deeper budget (essenceSpill), too heavy to juke, tiring fast. Every blow
  // rings coins onto the ground; the kill pays whatever the chase didn't.
  gilded_hoarder: {
    id: 'gilded_hoarder', name: 'Gilded Hoarder',
    color: '#f0d060', shape: 'pentagon', radius: 16, material: 'metal', look: 'goblin',
    base: { life: 340, moveSpeed: 175, accuracy: 60, evasion: 40, mana: 0 },
    skills: [],
    xp: 120,
    // A deep purse: twice the packets, each fatter — and the ladder still
    // climbs with level, so a deep-zone hoarder rains the rare tints.
    essenceSpill: { per: 0.08, mul: 2 },
    drops: 1,
    detection: 1.2,
    adorn: 'ears',
    scaling: { life: { incPerLevel: 0.09 } },
    brain: {
      type: 'basic',
      // Heavier gait: it hooks less and never dares the freeze-fake.
      move: { style: 'juke', hookEvery: [0.6, 1.1], freezeChance: 0 },
      // It bolts like its kin — but the WEIGHT tells: shorter wind, longer rest.
      morale: { skittish: { radius: 300, duration: [1.8, 3] } },
      tempo: { kite: 2.2, windedFor: [1.4, 2] },
    },
  },

  // --- Elementals: raw forces wearing a body. Slow to anger — they keep to
  // themselves unless someone (anyone) starts something.

  ember_elemental: {
    id: 'ember_elemental', name: 'Ember Elemental',
    color: '#ff9040', shape: 'rhombus', radius: 13, look: 'flame_elemental',
    base: { life: 48, moveSpeed: 150, mana: 140, manaRegen: 10 },
    mods: [mod('fireRes', 'flat', 0.75), mod('coldRes', 'flat', -0.3)],
    skills: ['firebolt', 'cinder_swarm'],
    xp: 22,
    brain: { type: 'strafer' },
    faction: 'elemental',
  },

  gale_elemental: {
    id: 'gale_elemental', name: 'Gale Elemental',
    color: '#b8e0d8', shape: 'oval', radius: 12, look: 'gale_elemental',
    base: { life: 40, moveSpeed: 195, accuracy: 100, evasion: 90, mana: 100, manaRegen: 9 },
    mods: [mod('lightningRes', 'flat', 0.5)],
    skills: ['thunderclap', 'claw'],
    xp: 24,
    brain: { type: 'flanker' },
    faction: 'elemental',
  },

  frost_elemental: {
    id: 'frost_elemental', name: 'Frost Elemental',
    color: '#8ad0e8', shape: 'rhombus', radius: 14, look: 'frost_elemental',
    base: { life: 56, moveSpeed: 115, mana: 160, manaRegen: 10 },
    mods: [mod('coldRes', 'flat', 0.75), mod('fireRes', 'flat', -0.3)],
    skills: ['ice_spear', 'frostbolt'],
    xp: 26,
    brain: { type: 'artillery' },
    faction: 'elemental',
  },

  stone_sentinel: {
    id: 'stone_sentinel', name: 'Stone Sentinel',
    color: '#9a988a', shape: 'rectangle', radius: 19, look: 'sentinel',
    base: { life: 180, moveSpeed: 90, accuracy: 95, armor: 70, mana: 60, manaRegen: 6, poise: 70 },
    mods: [mod('blockChance', 'flat', 0.2)],
    skills: ['shield_up', 'heavy_strike', 'cleave'],
    xp: 38,
    // A GUARDIAN guards (TargetSpec.leash): drag it past its tether and it
    // gives up the chase, turns, and grinds back to its post, mending —
    // bait it out or fight it on its ground; it won't marathon after you.
    brain: { type: 'protector', target: { leash: { radius: 520, heal: true } } },
    // HALF the sentinels drill the LANCE (MonsterGrant.chance): those roll
    // Phalanx Thrust and POKE from behind the raised shield — the exact
    // guard-combo the player runs; the rest hold the classic wall.
    grants: [{ atLevel: 1, chance: 0.5, skill: 'phalanx_thrust' }],
    faction: 'elemental',
  },

  // --- The breaker bestiary: enemies that hunt YOUR defense layers -------
  // (the enemy-defense-textures doctrine, attacker side: each of these
  // wields one of the layer levers — poiseDamage, insightPen, esShred —
  // through the same stats and skills the player's breaker suite uses.)

  // The poise-crusher with the full executioner's grammar: maul until the
  // bar breaks, then THE VERDICT lands the cleaved poise as burst. The
  // pattern is readable and the counterplay is the lesson: don't let the
  // bar break in reach of it.
  pit_mauler: {
    id: 'pit_mauler', name: 'Pit Mauler',
    color: '#8a6a48', shape: 'octagon', radius: 18, material: 'fur', look: 'behemoth',
    base: { life: 130, moveSpeed: 105, accuracy: 102, armor: 36, poise: 60, mana: 60, manaRegen: 6 },
    mods: [mod('life', 'more', 0.3)],
    skills: ['sunder_maul', 'verdict', 'claw'],
    xp: 34, faction: 'beast', tags: ['beast'], adorn: 'horns',
    brain: { type: 'juggernaut', enrage: 0.35 },
    detection: 0.9,
  },
  // The anti-dodge predator: its lash reads through insight and leaves the
  // quarry REELING — the runner's rhythm taken away, then run down.
  veilstalker: {
    id: 'veilstalker', name: 'Veilstalker',
    color: '#9a86c8', shape: 'trapezoid', radius: 13, material: 'fur', look: 'stalker',
    base: { life: 58, moveSpeed: 172, accuracy: 118, evasion: 60, insight: 40, mana: 40, manaRegen: 5 },
    skills: ['severing_lash', 'claw'],
    xp: 26, faction: 'predator', tags: ['beast'],
    brain: { type: 'skirmish', withdraw: 1.2 },
    detection: 1.15,
  },
  // The anti-mage: a wraith that exists to unsing wards — null lances
  // shred energy shields double and stop their recharge cold.
  null_adept: {
    id: 'null_adept', name: 'Null Adept',
    color: '#8a7ae0', shape: 'diamond', radius: 13, material: 'ethereal', look: 'blade_wraith',
    base: { life: 52, moveSpeed: 132, accuracy: 104, mana: 120, manaRegen: 9 },
    mods: [mod('chaosRes', 'flat', 0.4)],
    skills: ['null_lance', 'claw'],
    xp: 28, faction: 'eldritch',
    brain: { type: 'artillery' },
    detection: 1.1,
  },
  // THE FIRST ES-POLE MONSTERS: the bestiary finally wears the shield the
  // affix gamut sells. The sentinel's pool is the fight — and its floating
  // AEGIS CRYSTAL (a breakable composite part) is what keeps the pool
  // coming back: crack the crystal FIRST or duel a recharging wall.
  // Voidrend and Null Lance are the knives it teaches you to carry.
  glassguard_sentinel: {
    id: 'glassguard_sentinel', name: 'Glassguard Sentinel',
    color: '#a8d8e8', shape: 'rectangle', radius: 18, look: 'sentinel',
    base: { life: 70, energyShield: 110, moveSpeed: 95, accuracy: 100, armor: 20, mana: 60, manaRegen: 6 },
    mods: [mod('esRechargeRate', 'increased', 0.5)],
    skills: ['frostbolt', 'heavy_strike'],
    xp: 40, faction: 'elemental',
    brain: { type: 'protector', target: { leash: { radius: 520, heal: true } } },
    detection: 0.95,
    parts: [{
      monster: 'aegis_crystal', dx: -0.9, dy: 0.9, lifeFrac: 0.25, breakDamage: 0.1,
      // Shattering the crystal all but silences the recharge — the pool
      // it has is the pool it gets.
      breakMods: [mod('esRechargeRate', 'more', -0.9)],
    }],
  },
  // The sentinel's floating keystone — a full monster def, so it serves as
  // a composite part today and an entity-creator composable tomorrow.
  aegis_crystal: {
    id: 'aegis_crystal', name: 'Aegis Crystal',
    color: '#c8ecf8', shape: 'diamond', radius: 8, look: 'construct_pylon',
    noNemesis: true,
    base: { life: 45, energyShield: 20, moveSpeed: 0, mana: 60, manaRegen: 6 },
    remains: false, // organic dress, but an OBJECT — no corpse
    skills: ['spark_bolt'],
    xp: 0, faction: 'elemental',
    brain: { type: 'artillery' },
  },
  // The glimmer-chaff around the glass: tiny, shield-first zappers that
  // teach the shred lesson cheap.
  lumen_wisp: {
    id: 'lumen_wisp', name: 'Lumen Wisp',
    color: '#bfe8ff', shape: 'oval', radius: 9, look: 'gale_elemental',
    base: { life: 14, energyShield: 30, moveSpeed: 168, mana: 60, manaRegen: 8 },
    skills: ['spark_bolt'],
    xp: 12, faction: 'elemental',
    brain: { type: 'flanker' },
    detection: 1.1,
  },

  // --- The Sylvan court: wardens of the deep groves. Gnolls burn their
  // trees; the dead offend their soil. The wild beasts they let be.

  sylvan_warden: {
    id: 'sylvan_warden', name: 'Sylvan Warden',
    color: '#68b878', shape: 'rectangle', radius: 17, look: 'sylvan_warden',
    base: { life: 140, moveSpeed: 105, accuracy: 100, armor: 45, mana: 80, manaRegen: 7, poise: 45 },
    mods: [mod('blockChance', 'flat', 0.15)],
    // A third of the wardens drill the lance: shield up, then the poke
    // AROUND the guard (phalanx_thrust's guard-combo — rolled per spawn).
    grants: [{ atLevel: 1, chance: 0.35, skill: 'phalanx_thrust' }],
    // Half carry a WARD-SWORN BOON: one bulwark doctrine rolled from the
    // PLAYER'S OWN choice pool (MonsterBoon — shared vocabulary, per-spawn
    // texture: this warden took Stone, that one Salve).
    boons: [{ group: 'bulwark_doctrines', chance: 0.5 }],
    skills: ['shield_up', 'cleave'],
    xp: 32,
    brain: { type: 'protector' },
    faction: 'sylvan',
  },

  thorn_sprite: {
    id: 'thorn_sprite', name: 'Thorn Sprite',
    color: '#8ad868', shape: 'kite', radius: 9, look: 'thorn_sprite',
    base: { life: 24, moveSpeed: 185, evasion: 80, mana: 90, manaRegen: 8 },
    mods: [mod('chaosRes', 'flat', 0.4)],
    skills: ['venom_bolt'],
    xp: 16,
    // FEY CUNNING (the goblin shaman's foil — same job, nothing alike): the
    // sprite reads your run and looses venom where you're GOING, near every
    // time — and reads YOUR wind-ups right back, skipping out of the disc.
    // Veterans take the MARIONETTE HAND: puppet_strings grafts onto the
    // venom (the player's own support, granted) while steerAim drags its
    // "cursor" after you every tick — the bolt bends onto your dodge path.
    // Break your line or wear the bolt; the grove punishes habits.
    grants: [{ atLevel: 10, support: 'puppet_strings', on: 'venom_bolt' }],
    brain: {
      type: 'strafer',
      behavior: {
        aimLead: 0.8, aimLeadChance: 0.75,
        dodge: { chance: 0.7, reaction: [0.15, 0.35] },
        steerAim: { lead: 0.4 }, plantChance: 0.2,
      },
    },
    faction: 'sylvan',
  },

  grove_singer: {
    id: 'grove_singer', name: 'Grove Singer',
    color: '#a8e8a0', shape: 'oval', radius: 13, look: 'grove_singer',
    base: { life: 70, moveSpeed: 120, mana: 160, manaRegen: 11 },
    skills: ['rallying_howl', 'creeping_ice', 'despair'],
    xp: 30,
    // The grove's mind: its ice leads your line of retreat, and it drifts
    // out of wind-ups mid-verse — sylvan cunning at commander tier.
    brain: {
      type: 'commander',
      behavior: { aimLead: 0.7, aimLeadChance: 0.7, dodge: { chance: 0.55, reaction: [0.2, 0.4] } },
    },
    faction: 'sylvan',
  },

  briar_beast: {
    id: 'briar_beast', name: 'Briar Beast',
    color: '#588848', shape: 'oval', radius: 26, look: 'briar_beast',
    // Rooted, thorny bulk: an explicit poise pool on top of its size-derived
    // weight — poise IS mass (Actor.effectiveWeight), so the beast shrugs
    // shoves until its bar is broken. The per-monster heft dial, as data.
    base: { life: 300, moveSpeed: 75, accuracy: 90, armor: 35, mana: 60, manaRegen: 5, poise: 60 },
    mods: [mod('chaosRes', 'flat', 0.5)],
    skills: ['acid_spray', 'ground_slam'],
    xp: 56,
    // Rooted bulk swings where it faces (castArc) — circle the thorns.
    brain: { type: 'juggernaut', enrage: 0.35, behavior: { castArc: 0.6 } },
    faction: 'sylvan',
    adorn: 'spikes',
  },

  // --- Wild beasts: no banners, no grudges — just hunger. Pack hunters
  // circle out of reach until the alpha calls the number right.

  fen_hound: {
    id: 'fen_hound', name: 'Fen Hound',
    color: '#988a68', shape: 'kite', radius: 12, material: 'fur', look: 'hound',
    base: { life: 34, moveSpeed: 180, accuracy: 90, evasion: 50, mana: 0 },
    skills: ['claw'],
    xp: 12,
    brain: { type: 'pack' },
    faction: 'wild',
    adorn: 'ears',
  },

  alpha_stalker: {
    id: 'alpha_stalker', name: 'Alpha Stalker',
    color: '#b8a070', shape: 'oval', radius: 16, material: 'fur', look: 'stalker',
    base: { life: 110, moveSpeed: 165, accuracy: 105, evasion: 60, mana: 80, manaRegen: 6 },
    skills: ['rallying_howl', 'claw', 'heavy_strike'],
    xp: 36,
    brain: { type: 'pack' },
    faction: 'wild',
    adorn: 'ears',
  },

  // THE HUNT BEAST — a colossal Wilds predator, the quarry of a Hunt (spawned only
  // by the Hunt package, never in normal packs). It demonstrates the AI-package
  // layer: at 66% + 33% life it FLEES (a flee phase — fast + damage-reduced, so a
  // huge-burst player can still drop it) to an adjacent zone with its health
  // PRESERVED, making a final stand below 33%. Between flees it intermittently
  // CHARGES (an impulse). The engine tags it 'hunt_beast' on spawn.
  wilds_behemoth: {
    id: 'wilds_behemoth', name: 'the Gorehorn Behemoth',
    color: '#a0563a', shape: 'rectangle', radius: 34, material: 'fur', look: 'behemoth',
    base: { life: 820, moveSpeed: 100, accuracy: 115, armor: 55, mana: 120, manaRegen: 8 },
    mods: [mod('lifeRegen', 'flat', 5)],
    skills: ['ground_slam', 'heavy_strike', 'cleave'],
    xp: 190, boss: true, faction: 'wild', adorn: 'horns',
    detection: 1.3,
    // A beefier life curve than the baseline so the multi-zone hunt has legs.
    scaling: { life: { incPerLevel: 0.14 } },
    brain: {
      type: 'juggernaut', enrage: 0.15,
      phases: [
        { atLifeFrac: 0.66, flee: true, rewardGems: 1, announce: 'The Behemoth bolts for cover!',
          mods: [mod('moveSpeed', 'more', 0.8), mod('damageTaken', 'more', -0.7)] },
        { atLifeFrac: 0.33, flee: true, rewardGems: 2, announce: 'The Behemoth crashes deeper into the wilds!',
          mods: [mod('moveSpeed', 'more', 0.9), mod('damageTaken', 'more', -0.75)] },
      ],
      impulses: [
        { type: 'swarm', every: [4.5, 7.5], duration: [1.3, 1.9], announce: 'It CHARGES!' },
      ],
    },
  },

  // It was never a chest. Kills like it's making up for the wait —
  // and carries the loot it pretended to be.
  mimic: {
    id: 'mimic', name: 'Mimic',
    color: '#a8743e', shape: 'square', radius: 14, material: 'wood', look: 'mimic',
    base: { life: 160, moveSpeed: 165, accuracy: 110, armor: 25, mana: 30, manaRegen: 4 },
    skills: ['claw', 'heavy_strike'],
    xp: 40,
    brain: { type: 'swarm' },
    drops: 2,
  },

  // --- Clutter & townsfolk ----------------------------------------------------
  // Breakables are passive "monsters": smash a barrel, drink what spills.
  barrel: {
    id: 'barrel', name: 'Barrel',
    color: '#8a6a3e', shape: 'circle', radius: 10, material: 'wood', look: 'keg',
    base: { life: 20, moveSpeed: 0, armor: 0, evasion: 0, mana: 0 },
    skills: [],
    xp: 0,
    passive: true,
    orbDrops: 0.35,
  },

  crate: {
    id: 'crate', name: 'Crate',
    color: '#9a7a4e', shape: 'square', radius: 11, material: 'wood', look: 'crate',
    base: { life: 25, moveSpeed: 0, armor: 0, evasion: 0, mana: 0 },
    skills: [],
    xp: 0,
    passive: true,
    orbDrops: 0.25,
  },

  // A BREAKABLE structure door's guard-body (the barrel pattern): killing it
  // splinters its door (World.kill → setDoorState 'broken'). Tough for its
  // level (a gate is a siege moment, not a barrel) — no drops, no experience.
  door_timber: {
    id: 'door_timber', name: 'Barred Door',
    color: '#5a4426', shape: 'square', radius: 14, material: 'wood',
    base: { life: 90, moveSpeed: 0, armor: 12, evasion: 0, mana: 0 },
    scaling: { life: { incPerLevel: 0.3 }, armor: { flatPerLevel: 1 } },
    skills: [],
    xp: 0,
    passive: true,
  },

  // A TRAINING DUMMY — the town test target (spawned by the World when the
  // account feature is unlocked). passive ⇒ fully inert (never moves/attacks,
  // ignored by other AI). It takes damage + shows numbers/ailments + a health
  // bar that regenerates, but the kill() path resets it to full instead of
  // letting it die, so it's an immortal target to test effects + modifiers.
  target_dummy: {
    id: 'target_dummy', name: 'Training Dummy',
    color: '#b08850', shape: 'rectangle', radius: 18, material: 'wood', look: 'training_dummy',
    base: { life: 20000, lifeRegen: 1500, moveSpeed: 0, armor: 0, evasion: 0, mana: 0 },
    skills: [],
    xp: 0,
    passive: true,
    immortal: true,
  },

  // --- ATTUNEMENT FIXTURES (engine/tuning.ts + engine/puzzles.ts) -----------
  // Struck-crystal world objects on the dummy/barrel pattern — REAL actors,
  // so every delivery in the game plays them (arcs, arrows, novas, minions).
  // passive + immortal + noObjective: scenery with a health bar that never
  // dies, never counts, never pays; moveSpeed 0 (no orbDrops) derives
  // anchored, so pulls and shoves leave a laid board alone; aims:false —
  // a crystal has no face. All wear MonsterDef.tune or a puzzle enrolment
  // (or both) and dress their state as `attuned_<tone>` / `kindled`.

  // The biome's AMBIENT voice: freestanding, fully tunable — strike it with
  // any element and the pulse washes friend and foe alike. The living
  // texture the crystal country fights around.
  resonant_crystal: {
    id: 'resonant_crystal', name: 'Resonant Crystal',
    color: '#9fd8ff', shape: 'circle', radius: 15, material: 'crystal', look: 'resonant_crystal',
    base: { life: 320, lifeRegen: 80, moveSpeed: 0, armor: 0, evasion: 0, mana: 0 },
    scaling: { life: { incPerLevel: 0.2 } },
    skills: [],
    xp: 0,
    passive: true, immortal: true, noObjective: true, aims: false,
    tune: {},
  },

  // The chord's LOCKED voice: rolls a starting tone at spawn and HOLDS it —
  // the riddle's answer key (the placer re-rolls it on the zone's own
  // salted stream, so co-op and revisits agree). Its pulse is muted: the
  // heart poses the question, it doesn't hand out the reward.
  heart_crystal: {
    id: 'heart_crystal', name: 'Heart Crystal',
    color: '#cfe8ff', shape: 'circle', radius: 26, material: 'crystal', look: 'heart_crystal',
    base: { life: 900, lifeRegen: 200, moveSpeed: 0, armor: 0, evasion: 0, mana: 0 },
    scaling: { life: { incPerLevel: 0.2 } },
    skills: [],
    xp: 0,
    passive: true, immortal: true, noObjective: true, aims: false,
    // The pool is the three ELEMENTS by def — a heart is answerable by any
    // caster's kit (chaos/physical goals belong to authored spec.tones).
    tune: { roll: true, locked: true, pulse: false, tones: ['fire', 'cold', 'lightning'] },
  },

  // The chord's OPEN voices: fully tunable ring crystals — their pulses
  // fire (the riddle pays as you work it), and the chord kind listens to
  // every change through the attunement fabric itself.
  chord_crystal: {
    id: 'chord_crystal', name: 'Chord Crystal',
    color: '#9fd8ff', shape: 'circle', radius: 15, material: 'crystal', look: 'resonant_crystal',
    base: { life: 320, lifeRegen: 80, moveSpeed: 0, armor: 0, evasion: 0, mana: 0 },
    scaling: { life: { incPerLevel: 0.2 } },
    skills: [],
    xp: 0,
    passive: true, immortal: true, noObjective: true, aims: false,
    tune: {},
  },

  // The refrain's chimes: puzzle-owned (no tune — the SONG decides what
  // glows, not the blow), kindling to playback and correct answers.
  chime_crystal: {
    id: 'chime_crystal', name: 'Chime Crystal',
    color: '#ffe9a8', shape: 'circle', radius: 13, material: 'crystal', look: 'chime_crystal',
    base: { life: 260, lifeRegen: 80, moveSpeed: 0, armor: 0, evasion: 0, mana: 0 },
    scaling: { life: { incPerLevel: 0.2 } },
    skills: [],
    xp: 0,
    passive: true, immortal: true, noObjective: true, aims: false,
  },

  // The lattice's cells: puzzle-owned toggles (lit rides the lightning
  // tone's dressing; dark is the ground state — at a glance, gold vs grey).
  lattice_crystal: {
    id: 'lattice_crystal', name: 'Lattice Crystal',
    color: '#ffe27a', shape: 'circle', radius: 13, material: 'crystal', look: 'lattice_crystal',
    base: { life: 260, lifeRegen: 80, moveSpeed: 0, armor: 0, evasion: 0, mana: 0 },
    scaling: { life: { incPerLevel: 0.2 } },
    skills: [],
    xp: 0,
    passive: true, immortal: true, noObjective: true, aims: false,
  },

  // Friendly scenery folk: they stand at their posts and cannot be harmed.
  // Behavior binds to npcRole (vendor / innkeep / caravanner / questgiver),
  // so any body — these or a package's — can staff a counter.
  townsfolk_smith: {
    id: 'townsfolk_smith', name: 'Brandt the Smith',
    color: '#c89a5e', shape: 'circle', radius: 13, look: 'npc_smith', npcRole: 'vendor',
    base: { life: 100, moveSpeed: 0, mana: 0 },
    skills: [],
    xp: 0,
    passive: true,
    invulnerable: true,
  },

  townsfolk_innkeep: {
    id: 'townsfolk_innkeep', name: 'Mireille the Innkeep',
    color: '#d8b87a', shape: 'circle', radius: 12, look: 'npc_keeper', npcRole: 'innkeep',
    base: { life: 100, moveSpeed: 0, mana: 0 },
    skills: [],
    xp: 0,
    passive: true,
    invulnerable: true,
  },

  townsfolk_questgiver: {
    id: 'townsfolk_questgiver', name: 'Aldric the Quartermaster',
    color: '#9a86c8', shape: 'circle', radius: 13, look: 'npc_scholar', npcRole: 'questgiver',
    base: { life: 100, moveSpeed: 0, mana: 0 },
    skills: [],
    xp: 0,
    passive: true,
    invulnerable: true,
  },

  // The Tracker — the Bestiary's keeper (FEATURE.TRACKER; data/bestiary.ts).
  // Camps at the town's west edge; dwell by his fire to open the book. Same
  // passive+invulnerable scenery shape as the rest of the townsfolk.
  townsfolk_tracker: {
    id: 'townsfolk_tracker', name: 'Weslan the Tracker',
    color: '#a8c87a', shape: 'circle', radius: 13, look: 'npc_trader', npcRole: 'tracker',
    base: { life: 100, moveSpeed: 0, mana: 0 },
    skills: [],
    xp: 0,
    passive: true,
    invulnerable: true,
  },

  // The Caravanner — scenery folk (name auto-floats via npcRole, like all of them).
  // Stands in town (and waits at each minted caravan destination) to escort the
  // player between level bands. Same passive+invulnerable scenery shape as the others.
  townsfolk_caravanner: {
    id: 'townsfolk_caravanner', name: 'Soraya the Caravanner',
    color: '#c8a06e', shape: 'circle', radius: 13, look: 'npc_trader', npcRole: 'caravanner',
    base: { life: 100, moveSpeed: 0, mana: 0 },
    skills: [],
    xp: 0,
    passive: true,
    invulnerable: true,
  },

  // BOROUGH FOLK — the defended villagers (packages/defs/borough.ts). The
  // deliberate INVERSE of the town scenery above: real moveSpeed (never
  // anchored), no passive, no invulnerable — the horde can perceive, chase,
  // and kill them, and that possibility IS the event. They spawn huddled
  // under the dormant 'borough_huddled' tag (no rouse rule — unarmed folk
  // are helpless); ARMING clears the tag and their own brain fights through
  // the one shared pipeline. Stats stay modest on purpose: the player's
  // gifts and essence are what make them matter.
  borough_villager: {
    id: 'borough_villager', name: 'Villager',
    color: '#d8c08a', shape: 'circle', radius: 12, look: 'npc_trader',
    base: { life: 55, moveSpeed: 120, accuracy: 100, mana: 20, manaRegen: 4 },
    skills: ['cleave'], // a farmhand's hatchet — the gifts do the rest
    xp: 0,
    // Home is the huddle spot: scattered by a shove, a gale or a fight, folk
    // drift back to the hearth between waves instead of wandering off the
    // event (hold:false — they mill about it, not stand at attention).
    post: { hold: false },
    noNemesis: true, // a rescued villager promoted to nemesis would read as nonsense
  },
  borough_warden: {
    id: 'borough_warden', name: 'Borough Warden',
    color: '#c8a84b', shape: 'pentagon', radius: 14, look: 'npc_captain',
    base: { life: 120, moveSpeed: 116, accuracy: 102, armor: 24, mana: 40, manaRegen: 4, poise: 40 },
    skills: ['heavy_strike', 'war_cry'],
    xp: 0,
    brain: { type: 'juggernaut', enrage: 0.5 }, // the one professional in the hamlet
    post: true, // the professional STANDS his watch at the muster stone
    wardPriority: 1,
    noNemesis: true,
  },

  // THE HEARTWOOD — a secret vocation's shrine spirit (data/vocations.ts:
  // Greenwarden). Seeds itself into sylvan-patron groves; the same passive+
  // invulnerable giver shape as the townsfolk, so the whole quest machinery
  // (dwell offers, turn-ins, prompt box) works in the wild unchanged.
  heartwood_warden: {
    id: 'heartwood_warden', name: 'the Heartwood',
    color: '#4aa85a', shape: 'star', radius: 15, material: 'verdant', look: 'sylvan',
    base: { life: 100, moveSpeed: 0, mana: 0 },
    skills: [],
    xp: 0,
    passive: true,
    invulnerable: true,
    // Deliberately FACTIONLESS: a faction tag would enrol the shrine in the
    // territory census / ally-targeted doodad effects. It is neutral scenery;
    // the sylvan theming lives on the VocationDef that plants it.
  },

  // THE STONEFATHER — the Stonewrought secret vocation's shrine (a standing
  // menhir that remembers). Same passive+invulnerable factionless giver shape
  // as the Heartwood.
  stonefather_menhir: {
    id: 'stonefather_menhir', name: 'the Stonefather',
    color: '#b0a890', shape: 'octagon', radius: 16, material: 'stone', look: 'menhir',
    base: { life: 100, moveSpeed: 0, mana: 0 },
    skills: [],
    xp: 0,
    passive: true,
    invulnerable: true,
  },

  // THE MERCENARY OUTPOST's quartermaster (meta/mercs.ts): a neutral fixture,
  // not a foe — dwell nearby (zone cleared, blades sheathed) to parley.
  merc_captain: {
    id: 'merc_captain', name: 'the Outpost Captain',
    color: '#c8a84b', shape: 'pentagon', radius: 15, material: 'metal', look: 'npc_captain',
    base: { life: 400, moveSpeed: 0, mana: 0 },
    skills: [],
    xp: 0,
    passive: true,
    invulnerable: true,
  },

  // A point of interest, not a foe: crack it open for a guaranteed gem.
  gem_cache: {
    id: 'gem_cache', name: 'Gem Cache',
    color: '#c8a84b', shape: 'square', radius: 13, material: 'crystal', look: 'gem_cache',
    base: { life: 50, moveSpeed: 0, armor: 0, evasion: 0, mana: 0 },
    skills: [],
    xp: 5,
    passive: true,
    drops: 1,
  },

  // A trader's cart: mortal and MOBILE — the heart of the PROCESSION objective
  // (data/processions.ts). It never fights: the objective runtime wheels it
  // toward the crossing, robbers converge on the goods, and losing the cart
  // loses the objective. `driven`: no brain — the runtime owns every turn.
  caravan_cart: {
    id: 'caravan_cart', name: 'Caravan',
    color: '#b8904e', shape: 'square', radius: 18, material: 'wood', look: 'cart',
    base: { life: 130, moveSpeed: 70, armor: 6, evasion: 0, mana: 0 },
    skills: [],
    xp: 0,
    driven: true,
    wardPriority: 3, // protectors post themselves on the cart above all else
  },

  // --- EXTRACTION SEAM BODIES (defend-the-node objectives) -------------------
  // One mechanical body, seven biome faces (data/extraction.ts picks by biome;
  // packages can register more). Driven like the cart: no brain, the engine's
  // extraction runtime owns arming/HP/settlement. Life here is nominal — the
  // spawner stamps the real pool from the ExtractSpec's level curve × the
  // rolled scale's nodeLifeMul. Never bestiary/nemesis material: it's a PLACE.

  marrow_wellspring: {
    id: 'marrow_wellspring', name: 'Marrow Wellspring',
    color: '#a5e3b4', shape: 'circle', radius: 22, material: 'crystal', look: 'marrow_wellspring',
    base: { life: 60, moveSpeed: 0, armor: 8, evasion: 0, mana: 0 },
    skills: [], xp: 0, driven: true, noBestiary: true, noNemesis: true,
  },
  marrow_bole: {
    id: 'marrow_bole', name: 'Sapheart Bole',
    color: '#a8d878', shape: 'circle', radius: 23, material: 'wood', look: 'marrow_bole',
    base: { life: 60, moveSpeed: 0, armor: 10, evasion: 0, mana: 0 },
    skills: [], xp: 0, driven: true, noBestiary: true, noNemesis: true,
  },
  marrow_gloamheart: {
    id: 'marrow_gloamheart', name: 'Gloamheart',
    color: '#b9a8e8', shape: 'circle', radius: 21, material: 'stone', look: 'marrow_gloamheart',
    base: { life: 60, moveSpeed: 0, armor: 9, evasion: 0, mana: 0 },
    skills: [], xp: 0, driven: true, noBestiary: true, noNemesis: true,
  },
  marrow_sporecrown: {
    id: 'marrow_sporecrown', name: 'Sporecrown',
    color: '#d8b8e8', shape: 'circle', radius: 23, material: 'chitin', look: 'marrow_sporecrown',
    base: { life: 60, moveSpeed: 0, armor: 7, evasion: 0, mana: 0 },
    skills: [], xp: 0, driven: true, noBestiary: true, noNemesis: true,
  },
  marrow_cinderseam: {
    id: 'marrow_cinderseam', name: 'Cinderseam',
    color: '#f0a860', shape: 'circle', radius: 22, material: 'ember', look: 'marrow_cinderseam',
    base: { life: 60, moveSpeed: 0, armor: 11, evasion: 0, mana: 0 },
    skills: [], xp: 0, driven: true, noBestiary: true, noNemesis: true,
  },
  marrow_brinepool: {
    id: 'marrow_brinepool', name: 'Brinepool Seam',
    color: '#8fd8d0', shape: 'circle', radius: 22, material: 'chitin', look: 'marrow_brinepool',
    base: { life: 60, moveSpeed: 0, armor: 8, evasion: 0, mana: 0 },
    skills: [], xp: 0, driven: true, noBestiary: true, noNemesis: true,
  },
  marrow_gorebloom: {
    id: 'marrow_gorebloom', name: 'Gorebloom',
    color: '#e89a9a', shape: 'circle', radius: 23, material: 'flesh', look: 'marrow_gorebloom',
    base: { life: 60, moveSpeed: 0, armor: 6, evasion: 0, mana: 0 },
    skills: [], xp: 0, driven: true, noBestiary: true, noNemesis: true,
  },

  // --- THE MARROW-DRAWN (extraction's opportunist faction) -------------------
  // Essence-starved creatures that follow seams into ANY country — the
  // minority seasoning in every extraction swarm (contexts:['extraction'] on
  // the FactionSpec keeps them out of ordinary generation). Their aggro rows
  // exercise the personality axes: the moth barely notices you, the tyrant
  // never forgives. All skittish by faction temper — the marrow stops, so
  // does their interest.

  marrow_moth: {
    id: 'marrow_moth', name: 'Marrow Moth',
    color: '#cfeedd', shape: 'triangle', radius: 9, material: 'chitin', look: 'glow_moth',
    base: { life: 14, moveSpeed: 200, accuracy: 85, evasion: 60, mana: 15, manaRegen: 3 },
    skills: ['talon_rake'], xp: 6,
    faction: 'marrowdrawn',
    flier: true, levitates: true,
    // Single-minded and flighty: fixates hard, forgets you almost at once.
    aggro: { fixation: 1.6, fury: 0.5, waver: 1.7 },
    brain: { type: 'swarm' },
  },
  marrow_leech: {
    id: 'marrow_leech', name: 'Marrow Leech',
    color: '#9ac8a8', shape: 'oval', radius: 12, material: 'slime', look: 'lesser_ooze',
    base: { life: 34, moveSpeed: 120, accuracy: 75, mana: 0 },
    mods: [mod('lifeOnHit', 'flat', 3)],
    skills: ['claw'], xp: 10,
    faction: 'marrowdrawn',
    // Drinks whatever bleeds nearest — and remembers who cut it.
    aggro: { fixation: 1.2, fury: 1.4, waver: 0.7 },
    brain: { type: 'flanker' },
  },
  seep_burrower: {
    id: 'seep_burrower', name: 'Seep Burrower',
    color: '#b8a878', shape: 'oval', radius: 13, material: 'chitin', look: 'rockgrub',
    base: { life: 44, moveSpeed: 110, accuracy: 80, armor: 14, mana: 40, manaRegen: 4, poise: 30 },
    skills: ['claw'], xp: 12,
    faction: 'marrowdrawn',
    // The sapper: tunnel-visioned on the seam, deaf to almost everything else.
    aggro: { fixation: 2.0, fury: 0.7, waver: 1.2 },
    brain: {
      type: 'juggernaut',
      rules: [{
        when: { distUnder: 600 }, every: [11, 16], hold: [0.3, 0.5],
        actions: [{ do: 'burrow', kinds: ['sand', 'mud', 'bog', 'swamp'], damageFrac: 0.18, emergeRadius: 60, announce: 'the ground churns…' }],
      }],
    },
  },
  vein_glutton: {
    id: 'vein_glutton', name: 'Vein Glutton',
    color: '#7aa88a', shape: 'hexagon', radius: 19, material: 'flesh', look: 'viscous_ooze',
    base: { life: 130, moveSpeed: 70, accuracy: 70, armor: 22, mana: 0, poise: 35 },
    mods: [mod('lifeOnHit', 'flat', 5)],
    skills: ['claw'], xp: 22,
    faction: 'marrowdrawn',
    scaleVariance: [0.9, 1.25],
    // Placid bulk: hard to distract, slow to anger, quick to forget.
    aggro: { fixation: 1.4, fury: 0.8, waver: 1.2 },
    brain: { type: 'juggernaut' },
  },
  marrow_tyrant: {
    id: 'marrow_tyrant', name: 'Marrow Tyrant',
    color: '#5a8a6a', shape: 'pentagon', radius: 17, material: 'chitin', look: 'bolete_brute',
    base: { life: 150, moveSpeed: 105, accuracy: 95, armor: 18, mana: 60, manaRegen: 5, poise: 50 },
    skills: ['claw', 'bile_spray'], xp: 45,
    faction: 'marrowdrawn',
    // The one that never forgives: strike it once and the seam can wait.
    aggro: { fixation: 0.8, fury: 1.6, waver: 0.5 },
    brain: {
      type: 'commander',
      rules: [{
        when: { distUnder: 500 }, every: [12, 18], hold: [0.3, 0.5],
        actions: [{ do: 'shout', radius: 420 }],
      }],
    },
  },

  // --- THE EMBERKIN (the cinder country claims a NAME) -----------------------
  // The volcanic biome fielded nine bodies and no allegiance — the one
  // frontier country with no native banner. The Emberkin are its tribe:
  // vent-born folk who tend the fires like herds. Territorial to the bone
  // (their ground IS their argument), hostile to the demons who treat the
  // calderas as a door. Warlord: the Matriarch.

  ashling: {
    id: 'ashling', name: 'Ashling',
    color: '#e8925a', shape: 'diamond', radius: 8, material: 'ember', look: 'ashling',
    base: { life: 15, moveSpeed: 165, accuracy: 80, mana: 30, manaRegen: 4 },
    mods: [mod('fireRes', 'flat', 0.6)],
    skills: ['firebolt'], xp: 6,
    faction: 'emberkin',
    // The tribe is BORN of the burn (ember-bodied): the melt is home ground —
    // immune outright, and mildly drawn to it when routing (pathCost 0.85).
    immuneGround: ['lava', 'magma_core'],
    pathCosts: { lava: 0.85 },
    deathBurst: { mode: 'implode', damageFrac: 0.5, damageType: 'fire', radius: 42, coalesce: 0.4 },
    brain: { type: 'swarm' },
  },
  // THE WILDFIRE'S GET (the advancing front's consume.spawn lane): what
  // burning country births. A cinderling crawls out of eaten brush — a
  // live coal on legs, all crack-glow and shed sparks, gone in two hits.
  // An emberwisp lifts off a burning crown — a floating spark that pelts
  // from range. Both ordinary emberkin (roster rows below): a warband can
  // field them anywhere the tribe walks, front or no front.
  cinderling: {
    id: 'cinderling', name: 'Cinderling',
    color: '#c86a3a', shape: 'diamond', radius: 7, material: 'ember', look: 'cinderling',
    base: { life: 10, moveSpeed: 175, accuracy: 80, evasion: 15, mana: 20, manaRegen: 3 },
    mods: [mod('fireRes', 'flat', 0.6)],
    skills: ['ember_dart', 'claw'], xp: 4,
    faction: 'emberkin',
    immuneGround: ['lava', 'magma_core'], // ember-bodied (the tribe's ground doctrine)
    pathCosts: { lava: 0.85 },
    presence: { to: 16, fadeOut: 6 },
    brain: { type: 'swarm' },
  },
  emberwisp: {
    id: 'emberwisp', name: 'Emberwisp',
    color: '#ff9a3c', shape: 'circle', radius: 7, material: 'ember', look: 'emberwisp',
    base: { life: 12, moveSpeed: 150, accuracy: 90, evasion: 45, mana: 40, manaRegen: 5 },
    mods: [mod('fireRes', 'flat', 0.75)],
    skills: ['ember_dart'], xp: 8,
    faction: 'emberkin',
    flier: true, levitates: true,
    presence: { from: 3, fadeIn: 3 },
    brain: { type: 'skirmish', withdraw: 1.2 },
  },
  cinder_hound: {
    id: 'cinder_hound', name: 'Cinder Hound',
    color: '#d87a4a', shape: 'triangle', radius: 12, material: 'ember', look: 'cinder_hound',
    base: { life: 42, moveSpeed: 190, accuracy: 90, evasion: 30, mana: 0 },
    mods: [mod('fireRes', 'flat', 0.5)],
    skills: ['claw'], xp: 12,
    faction: 'emberkin',
    immuneGround: ['lava', 'magma_core'], // ember-bodied (the tribe's ground doctrine)
    pathCosts: { lava: 0.85 },
    // A hound turns on whatever bites it — and forgets just as fast.
    aggro: { fury: 1.4, waver: 1.4 },
    brain: { type: 'flanker' },
  },
  slag_brute: {
    id: 'slag_brute', name: 'Slag Brute',
    color: '#a85a32', shape: 'hexagon', radius: 18, material: 'stone', look: 'slag_brute',
    base: { life: 140, moveSpeed: 80, accuracy: 85, armor: 30, mana: 0, poise: 50 },
    mods: [mod('fireRes', 'flat', 0.75)],
    skills: ['claw'], xp: 26,
    faction: 'emberkin',
    immuneGround: ['lava', 'magma_core'], // slag walks its own melt (the tribe's ground doctrine)
    pathCosts: { lava: 0.85 },
    shellGuard: { side: 'front', max: 50, arcDeg: 130, regenDelay: 5, regenRate: 10 },
    turnSpeed: 3.2,
    // Slag doesn't startle: single-minded, slow to turn, slower to forgive.
    aggro: { fixation: 1.5, fury: 0.8, waver: 0.7 },
    brain: { type: 'juggernaut' },
  },
  vent_priest: {
    id: 'vent_priest', name: 'Vent Priest',
    color: '#e8a86a', shape: 'pentagon', radius: 13, material: 'cloth', look: 'vent_priest',
    base: { life: 60, moveSpeed: 95, accuracy: 95, mana: 120, manaRegen: 8 },
    mods: [mod('fireRes', 'flat', 0.6)],
    skills: ['firebolt'], xp: 24,
    faction: 'emberkin',
    // The priest walks the melt as PROOF OF FAITH (immune) but does not seek
    // it — cloth-robed flesh, no relish row: the vents test, they don't invite.
    immuneGround: ['lava', 'magma_core'],
    brain: {
      type: 'caster',
      rules: [{
        // The litany: kin near the priest burn hotter for a few breaths.
        when: { alliesWithin: { count: 2, radius: 300 } }, every: [10, 15], hold: [0.3, 0.5],
        announce: 'the priest feeds the fire…',
        actions: [{ do: 'buff', buff: { type: 'buff', id: 'vent_litany', duration: 6, mods: [mod('damage', 'increased', 0.25)] } }],
      }],
    },
  },
  emberkin_matriarch: {
    id: 'emberkin_matriarch', name: 'Emberkin Matriarch',
    color: '#f0b060', shape: 'star', radius: 16, material: 'ember', look: 'emberkin_matriarch',
    base: { life: 200, moveSpeed: 90, accuracy: 100, armor: 16, mana: 150, manaRegen: 9, poise: 40 },
    mods: [mod('fireRes', 'flat', 0.8)],
    skills: ['firebolt'], xp: 60,
    faction: 'emberkin',
    // The tribe-mother answers insult with the whole tribe.
    aggro: { fury: 1.5, waver: 0.6 },
    brain: {
      type: 'commander',
      rules: [{
        when: { distUnder: 520 }, every: [13, 19], hold: [0.4, 0.6],
        announce: 'the Matriarch calls the vents!',
        actions: [{ do: 'summon', monster: 'ashling', count: 3, ring: 48 }],
      }],
    },
  },

  // --- THE JUNGLEKIN (the strangling green claims a NAME) --------------------
  // The jungle biome's tribe: dart-tribes and green-fed beasts who treat the
  // verdure walls as home ground — every kit verb here is a WILDCRAFT skill
  // (shared catalog: what they use, you can find). Defense textures spread
  // wide by doctrine: evasive stalkers, frail dart-flesh, a poised shell, a
  // rooted grappler, old stone. Warlord: the Verdant Tyrant.

  fern_stalker: {
    id: 'fern_stalker', name: 'Fern Stalker',
    color: '#5a8a44', shape: 'triangle', radius: 11, material: 'verdant', look: 'fern_stalker',
    base: { life: 38, moveSpeed: 150, accuracy: 90, evasion: 55, mana: 0, insight: 30 },
    skills: ['claw'], xp: 12,
    faction: 'junglekin',
    // Scenery until you're past it — the brush you didn't cut.
    ambush: { radius: 130, announce: 'the ferns move —' },
    aggro: { fury: 1.2, waver: 1.1 },
    gemBias: ['physical', 'melee'],
    presence: { to: 18, fadeOut: 8 },
    brain: { type: 'flanker', move: { style: 'lurk' } },
  },
  blowgun_wretch: {
    id: 'blowgun_wretch', name: 'Blowgun Wretch',
    color: '#8aa858', shape: 'oval', radius: 10, material: 'cloth', look: 'blowgun_wretch',
    base: { life: 26, moveSpeed: 118, accuracy: 95, evasion: 25, mana: 40, manaRegen: 4 },
    skills: ['blowdart'], xp: 11,
    faction: 'junglekin',
    temper: 'skittish',
    gemBias: ['projectile', 'physical'],
    presence: { to: 20, fadeOut: 9 },
    brain: { type: 'caster' },
  },
  spore_caller: {
    id: 'spore_caller', name: 'Spore Caller',
    color: '#a8c86a', shape: 'pentagon', radius: 13, material: 'verdant', look: 'spore_caller',
    base: { life: 55, moveSpeed: 92, accuracy: 95, mana: 130, manaRegen: 8 },
    mods: [mod('chaosRes', 'flat', 0.5)],
    skills: ['spore_bloom'], xp: 24,
    faction: 'junglekin',
    gemBias: ['chaos', 'aoe'],
    presence: { from: 6, fadeIn: 3 },
    brain: {
      type: 'caster',
      rules: [{
        // The caller seeds its kin: nearby junglekin fight wreathed in
        // spores. distUnder keeps the litany ON-SCREEN — a dense mint's
        // dozen callers chanting from across the zone was a wall of text.
        when: { alliesWithin: { count: 2, radius: 280 }, distUnder: 700 }, every: [11, 18], hold: [0.3, 0.5],
        announce: 'the caller seeds the air…',
        actions: [{ do: 'buff', buff: { type: 'buff', id: 'spore_ward', duration: 6, mods: [mod('evasion', 'flat', 25), mod('lifeRegen', 'flat', 3)] } }],
      }],
    },
  },
  strangler_maw: {
    id: 'strangler_maw', name: 'Strangler Maw',
    color: '#3f6a30', shape: 'hexagon', radius: 16, material: 'verdant', look: 'strangler_maw',
    base: { life: 130, moveSpeed: 55, accuracy: 90, armor: 18, mana: 0 },
    mods: [mod('chaosRes', 'flat', 0.4)],
    skills: ['constrictor_coil'], xp: 26,
    faction: 'junglekin',
    // It IS the vines: the body exists only where a mat grows, and confines
    // itself to it — its coil is why you keep to the middle of the lane.
    habitat: { kind: 'vines', minRadius: 24 },
    noObjective: true,
    aggro: { fixation: 1.5, waver: 0.5 },
    gemBias: ['duration', 'physical'],
    presence: { from: 8, fadeIn: 4 },
    brain: { type: 'assassin' },
  },
  emerald_prowler: {
    id: 'emerald_prowler', name: 'Emerald Prowler',
    color: '#4a9a5c', shape: 'triangle', radius: 13, material: 'fur', look: 'emerald_prowler',
    base: { life: 75, moveSpeed: 185, accuracy: 100, evasion: 60, mana: 30, manaRegen: 3, insight: 40 },
    skills: ['claw', 'panther_pounce'], xp: 28,
    faction: 'junglekin',
    tags: ['beast'],
    scaleVariance: [0.9, 1.15],
    // A cat commits or vanishes; nothing in between.
    aggro: { fury: 1.5, waver: 1.3 },
    temper: 'wary',
    gemBias: ['movement', 'melee'],
    presence: { from: 9, fadeIn: 4 },
    brain: { type: 'flanker', move: { style: 'lurk' } },
  },
  saurian_bulwark: {
    id: 'saurian_bulwark', name: 'Saurian Bulwark',
    color: '#6a8a4a', shape: 'hexagon', radius: 18, material: 'chitin', look: 'saurian_bulwark',
    base: { life: 165, moveSpeed: 72, accuracy: 88, armor: 34, poise: 40, mana: 40, manaRegen: 3 },
    mods: [mod('chaosRes', 'flat', 0.3)],
    skills: ['claw', 'crushing_leap'], xp: 32,
    faction: 'junglekin',
    tags: ['beast'],
    shellGuard: { side: 'front', max: 55, arcDeg: 140, regenDelay: 5, regenRate: 11 },
    turnSpeed: 3.0,
    aggro: { fixation: 1.4, fury: 0.8, waver: 0.6 },
    gemBias: ['physical', 'aoe'],
    presence: { from: 11, fadeIn: 5 },
    brain: { type: 'juggernaut' },
  },
  ruin_sentinel: {
    id: 'ruin_sentinel', name: 'Ruin Sentinel',
    color: '#8a8c74', shape: 'square', radius: 17, material: 'stone', look: 'ruin_sentinel',
    base: { life: 190, moveSpeed: 62, accuracy: 92, armor: 48, poise: 55, mana: 50, manaRegen: 4, poiseDR: 0.45 },
    skills: ['heavy_strike', 'crushing_leap'], xp: 38,
    faction: 'junglekin',
    // Furniture until the halls are trespassed — the statue that was never
    // a statue (the sunken ruins' own warden).
    ambush: { radius: 150, announce: 'the old stone wakes —' },
    aggro: { fixation: 1.8, fury: 0.5, waver: 0.3 },
    gemBias: ['physical', 'melee'],
    presence: { from: 10, fadeIn: 4 },
    brain: { type: 'juggernaut' },
  },
  // The toppled colossus does not sleep: a FRAGMENT of the ruin-court's
  // fallen statue, animate and headless, dragging its own broken forearm as
  // a maul. The sunken city's heavy warden — its swat (caul_lash's rooted
  // arc, knockback 260) THROWS bodies into the halls' own machines: the saw
  // lanes, the plates, the fresh-opened floors. The trapworks' best friend
  // and the mass fabric's kin. Stone: no corpse (remains pinned — a broken
  // statue leaves rubble, not meat), no breath, no hurry.
  colossus_shard: {
    id: 'colossus_shard', name: 'Colossus Shard',
    color: '#8a8168', shape: 'square', radius: 21, material: 'stone', look: 'colossus_shard',
    base: { life: 250, moveSpeed: 55, accuracy: 90, armor: 55, poise: 70, mana: 60, manaRegen: 5, poiseDR: 0.5 },
    skills: ['caul_lash', 'ground_slam'], xp: 55,
    faction: 'junglekin',
    remains: false,
    aggro: { fixation: 2.0, fury: 0.4, waver: 0.2 },
    gemBias: ['physical', 'melee'],
    presence: { from: 12, fadeIn: 5 },
    brain: { type: 'juggernaut' },
  },
  verdant_tyrant: {
    id: 'verdant_tyrant', name: 'Verdant Tyrant',
    color: '#3fae5c', shape: 'star', radius: 17, material: 'chitin', look: 'verdant_tyrant',
    base: { life: 320, moveSpeed: 95, accuracy: 105, armor: 24, poise: 60, mana: 160, manaRegen: 9 },
    mods: [mod('chaosRes', 'flat', 0.6)],
    skills: ['dart_volley', 'panther_pounce', 'spore_bloom'], xp: 95,
    faction: 'junglekin',
    gemBias: ['chaos', 'projectile'],
    presence: { from: 14, fadeIn: 6 },
    brain: {
      type: 'commander',
      rules: [{
        when: { distUnder: 520 }, every: [14, 20], hold: [0.4, 0.6],
        announce: 'the Tyrant whistles the treeline!',
        actions: [{ do: 'summon', monster: 'blowgun_wretch', count: 2, ring: 56 }],
      }],
      phases: [
        { atLifeFrac: 0.5, mods: [mod('attackSpeed', 'increased', 0.2)] },
        { atLifeFrac: 0.25, mods: [mod('damage', 'more', 0.25), mod('moveSpeed', 'increased', 0.2)] },
      ],
    },
  },

  // --- MARINE FILL (beach / isle / deepsea ran thin) --------------------------

  tide_skitter: {
    id: 'tide_skitter', name: 'Tide Skitter',
    color: '#8fd0c8', shape: 'oval', radius: 9, material: 'chitin', look: 'tide_skitter',
    base: { life: 20, moveSpeed: 175, accuracy: 80, evasion: 45, mana: 0 },
    skills: ['claw'], xp: 7,
    faction: 'wild',
    temper: 'skittish',
    brain: { type: 'swarm', move: { style: 'skitter' } },
  },
  reef_lurcher: {
    id: 'reef_lurcher', name: 'Reef Lurcher',
    color: '#5a9a94', shape: 'oval', radius: 15, material: 'chitin', look: 'reef_lurcher',
    base: { life: 85, moveSpeed: 105, accuracy: 90, armor: 20, mana: 0 },
    skills: ['claw'], xp: 20,
    ambush: { radius: 150, announce: 'the reef MOVES —' },
    // Patient stone until stepped past; holds its grudge like a barnacle.
    aggro: { fury: 1.3, waver: 0.6 },
    brain: { type: 'assassin' },
  },
  tidewrack_shambler: {
    id: 'tidewrack_shambler', name: 'Tidewrack Shambler',
    color: '#6a8a7e', shape: 'square', radius: 17, material: 'wood', look: 'tidewrack_shambler',
    base: { life: 150, moveSpeed: 70, accuracy: 75, armor: 26, mana: 0, poise: 45 },
    mods: [mod('coldRes', 'flat', 0.5)],
    skills: ['claw'], xp: 28,
    scaleVariance: [0.9, 1.3],
    // Driftwood doesn't care who's hammering on it.
    aggro: { fixation: 1.6, fury: 0.6, waver: 1.0 },
    brain: { type: 'juggernaut' },
  },

  // --- CRYSTAL FILL (the elemental country gets bodies of its own) ------------

  prism_creeper: {
    id: 'prism_creeper', name: 'Prism Creeper',
    color: '#b8d8f0', shape: 'oval', radius: 12, material: 'crystal', look: 'prism_creeper',
    base: { life: 48, moveSpeed: 130, accuracy: 85, evasion: 55, mana: 0 },
    mods: [mod('lightningRes', 'flat', 0.4)],
    skills: ['claw'], xp: 16,
    faction: 'elemental',
    brain: { type: 'flanker', move: { style: 'weave' } },
  },
  resonant_shardling: {
    id: 'resonant_shardling', name: 'Resonant Shardling',
    color: '#cfe0f8', shape: 'diamond', radius: 9, material: 'crystal', look: 'resonant_shardling',
    base: { life: 22, moveSpeed: 150, accuracy: 80, mana: 0 },
    skills: ['claw'], xp: 8,
    faction: 'elemental',
    deathBurst: { mode: 'implode', damageFrac: 0.55, damageType: 'lightning', radius: 46, coalesce: 0.4 },
    brain: { type: 'swarm' },
  },

  // --- THE CRYSTALKIN (the attunement pass): the country's own court ---------
  // Four bodies, four jobs, distinct at a glance: the STALKER is low, fast
  // glass with fin-blades (skirmish geometry); the HAUNT is a robed drift of
  // glass and halo (the buffer — its chime rings EVERYONE, the attunement
  // fabric decides what that means); the SHELLBACK is a walking geode
  // (crack the shining shell, reach the soft core — the ES pole worn as
  // anatomy); the SIREN is wrong-colored glass whose wail re-tunes the
  // court to chaos, its own kin included. All elemental faction — the
  // Unbound Elements muster them wherever the country calls.

  // Skirmisher: hit-and-slide glass predator. Cold-brittle like all true
  // crystal (the freeze-thaw law), storm-fed like its creeper cousin.
  facet_stalker: {
    id: 'facet_stalker', name: 'Facet Stalker',
    color: '#a8d0f0', shape: 'oval', radius: 13, material: 'crystal', look: 'facet_stalker',
    base: { life: 62, moveSpeed: 168, accuracy: 92, evasion: 70, mana: 0 },
    mods: [mod('lightningRes', 'flat', 0.4), mod('coldRes', 'flat', -0.2)],
    skills: ['claw'], xp: 22,
    faction: 'elemental',
    presence: { from: 5, fadeIn: 3 },
    brain: { type: 'flanker', move: { style: 'weave' } },
  },
  // Support caster: the chime that doesn't take sides. Its peal buffs its
  // kin AND any foe standing near — and re-tunes standing crystals to
  // lightning through the ordinary fabric (nova affects 'all').
  chime_haunt: {
    id: 'chime_haunt', name: 'Chime Haunt',
    color: '#ffe9a8', shape: 'circle', radius: 12, material: 'ethereal', look: 'chime_haunt',
    base: { life: 44, moveSpeed: 105, accuracy: 80, mana: 60, manaRegen: 6 },
    mods: [mod('lightningRes', 'flat', 0.5)],
    skills: ['spark', 'resonant_peal'], xp: 26,
    faction: 'elemental',
    presence: { from: 7, fadeIn: 4 },
    brain: { type: 'strafer' },
  },
  // Bruiser: the walking geode — a shining ES shell over a soft mineral
  // core. Break the glass (the recharge is the fight's clock) and the
  // inside is nearly meat. The ES-pole texture worn as anatomy.
  geode_shellback: {
    id: 'geode_shellback', name: 'Geode Shellback',
    color: '#7aa0d0', shape: 'circle', radius: 17, material: 'crystal', look: 'geode_shellback',
    base: { life: 70, energyShield: 150, moveSpeed: 92, accuracy: 88, mana: 0 },
    mods: [mod('esRechargeRate', 'increased', 0.5), mod('coldRes', 'flat', -0.2), mod('lightningRes', 'flat', 0.4)],
    skills: ['claw'], xp: 34,
    faction: 'elemental',
    presence: { from: 9, fadeIn: 4 },
    scaleVariance: [0.95, 1.25],
    brain: { type: 'juggernaut' },
  },
  // The wrong note: a chaos caster whose wail hits EVERYTHING near —
  // players, its own kin, and the crystals, which take the chaos tone and
  // pulse it onward. Kill it first or fight inside its discord.
  discord_siren: {
    id: 'discord_siren', name: 'Discord Siren',
    color: '#c88aff', shape: 'oval', radius: 13, material: 'crystal', look: 'discord_siren',
    base: { life: 56, moveSpeed: 118, accuracy: 84, evasion: 40, mana: 70, manaRegen: 7 },
    mods: [mod('chaosRes', 'flat', 0.5), mod('lightningRes', 'flat', 0.2)],
    skills: ['discord_wail'], xp: 30,
    faction: 'elemental',
    presence: { from: 11, fadeIn: 5 },
    brain: { type: 'skirmish' },
  },

  // --- Ambient fauna: the ember wisp (volcanic wildlife) ----------------------
  ember_wisp: {
    id: 'ember_wisp', name: 'Ember Wisp',
    color: '#ffb870', shape: 'diamond', radius: 6, material: 'ember', look: 'ember_wisp',
    base: { life: 8, moveSpeed: 150, mana: 0 },
    skills: [], xp: 2,
    tag: 'critter',
    flier: true, levitates: true,
    brain: { type: 'flee' },
  },

  // --- Summonable allies (minions are just monsters on your team) ----------

  flame_sprite: {
    id: 'flame_sprite', name: 'Flame Sprite',
    color: '#ffb05a', shape: 'diamond', radius: 10, material: 'ember', look: 'flame_elemental',
    base: { life: 22, moveSpeed: 170, mana: 999, manaRegen: 20 },
    mods: [mod('fireRes', 'flat', 0.75)],
    skills: ['firebolt'],
    xp: 0,
  },

  stone_golem: {
    id: 'stone_golem', name: 'Stone Golem',
    color: '#a8a090', shape: 'circle', radius: 19, material: 'stone', look: 'golem',
    base: { life: 130, moveSpeed: 110, accuracy: 95, armor: 50, mana: 40, manaRegen: 4 },
    mods: [mod('damageTaken', 'more', -0.1)],
    skills: ['ground_slam', 'claw'],
    xp: 0,
  },

  // --- Golems: three elements, one shared summon pool ----------------------

  fire_golem: {
    id: 'fire_golem', name: 'Fire Golem',
    color: '#e86a3a', shape: 'circle', radius: 16, material: 'ember', look: 'golem',
    base: { life: 95, moveSpeed: 130, mana: 200, manaRegen: 10, armor: 20 },
    mods: [mod('fireRes', 'flat', 0.75), mod('damage', 'increased', 0.15, ['fire'])],
    skills: ['firebolt', 'flame_wave'],
    xp: 0,
    // A construct OF fire: the summoner's golem wades the caldera's pools
    // its keeper must walk around — minion build texture, pure data.
    immuneGround: ['lava', 'magma_core'],
  },

  ice_golem: {
    id: 'ice_golem', name: 'Ice Golem',
    color: '#7ac8e8', shape: 'circle', radius: 16, material: 'ice', look: 'golem_ice',
    base: { life: 110, moveSpeed: 120, mana: 200, manaRegen: 10, armor: 30 },
    mods: [mod('coldRes', 'flat', 0.75)],
    skills: ['frostbolt', 'frost_nova'],
    xp: 0,
  },

  blood_golem: {
    id: 'blood_golem', name: 'Blood Golem',
    color: '#b03848', shape: 'circle', radius: 17, look: 'golem',
    base: { life: 150, moveSpeed: 125, accuracy: 100, mana: 40, manaRegen: 5 },
    mods: [mod('lifeLeech', 'flat', 0.05), mod('chaosRes', 'flat', 0.4)],
    skills: ['claw', 'heavy_strike'],
    xp: 0,
  },

  // Flame Core: an untouchable mote of fire that shadows its summoner.
  flame_core: {
    id: 'flame_core', name: 'Flame Core',
    color: '#ffc05a', shape: 'octagon', radius: 8, material: 'ember', look: 'elemental_rift',
    base: { life: 10, moveSpeed: 200, mana: 999, manaRegen: 25 },
    mods: [mod('fireRes', 'flat', 0.75)],
    skills: ['firebolt'],
    xp: 0,
    invulnerable: true,
    untargetable: true,
  },

  // Untargetable + invulnerable: a spirit ally enemies simply cannot touch.
  // It trades that safety for a short lifespan (set by its summon skill).
  spirit_wisp: {
    id: 'spirit_wisp', name: 'Spirit Wisp',
    color: '#b8e8ff', shape: 'diamond', radius: 9, material: 'ethereal', look: 'spirit',
    base: { life: 10, moveSpeed: 185, mana: 999, manaRegen: 25 },
    skills: ['frostbolt'],
    xp: 0,
    invulnerable: true,
    untargetable: true,
  },

  // --- THE INFERNAL LEGION: rift-born and aggressive. Hot crimson→orange,
  //     horns and wings, fast keen-eyed brains — unmistakable at a glance. ---
  imp: {
    id: 'imp', name: 'Rift Imp',
    color: '#ff3a5e', shape: 'pentagon', radius: 10, look: 'imp',
    base: { life: 20, moveSpeed: 180, accuracy: 80, mana: 0 },
    mods: [mod('fireRes', 'flat', 0.5)],
    skills: ['claw'], xp: 7, faction: 'demon', adorn: 'horns',
    detection: 1.1, brain: { type: 'swarm' }, // swarm AI adds ×1.4 on top
  },
  // FULGUR IMP — the high-roller in the bestiary: chasm-wide dice and both
  // jackpot procs riding its bolt (Fulminate's innate grants) — the fabric
  // gambles FOR the monster exactly as it does for the player. Close the
  // distance before the dice come up.
  fulgur_imp: {
    id: 'fulgur_imp', name: 'Fulgur Imp',
    color: '#ffe14a', shape: 'pentagon', radius: 10, look: 'imp', adorn: 'horns',
    base: { life: 26, moveSpeed: 170, accuracy: 85, mana: 60, manaRegen: 7, insight: 25 },
    mods: [mod('lightningRes', 'flat', 0.6)],
    skills: ['fulminate'], xp: 12, faction: 'demon',
    gemBias: ['lightning'],
    detection: 1.2, brain: { type: 'skirmish' },
  },
  hellhound: {
    id: 'hellhound', name: 'Hellhound',
    color: '#e0402a', shape: 'rhombus', radius: 14, material: 'fur', look: 'hellhound',
    base: { life: 42, moveSpeed: 200, accuracy: 100, evasion: 55, mana: 0 },
    mods: [mod('fireRes', 'flat', 0.6)],
    skills: ['claw'], xp: 13, faction: 'demon', adorn: 'horns',
    detection: 1.6, brain: { type: 'flanker' },
  },
  cinder_fiend: {
    id: 'cinder_fiend', name: 'Cinder Fiend',
    color: '#ff6a1a', shape: 'octagon', radius: 13, material: 'ember', look: 'cinder_fiend',
    base: { life: 36, moveSpeed: 130, mana: 120, manaRegen: 9 },
    mods: [mod('fireRes', 'flat', 0.7)],
    skills: ['firebolt', 'meteor_storm'], xp: 18, faction: 'demon', adorn: 'wings',
    // EMBER-BODIED (the Legion's ground doctrine): demons made of cinder are
    // immune to the melt outright; flesh demons (imps, hounds) keep high
    // fireRes as MITIGATION instead — the resistance-vs-immunity gradient.
    immuneGround: ['lava', 'magma_core'],
    // A siege-castle garrison fiend BLINKS into a free tower slot and hurls
    // fire from the crown (the Arreat-plateau imp, as pure data).
    detection: 1.3, brain: {
      type: 'strafer',
      rules: [{
        when: { distUnder: 720 },
        actions: [{ do: 'garrison', within: 680 }],
        use: { move: { style: 'garrison' } },
        cooldown: 4,
      }],
    },
  },
  searing_spawn: {
    id: 'searing_spawn', name: 'Searing Spawn',
    color: '#ff4040', shape: 'diamond', radius: 11, material: 'ember', look: 'flame_elemental',
    base: { life: 24, moveSpeed: 195, accuracy: 60, mana: 0 },
    mods: [mod('fireRes', 'flat', 0.5)],
    skills: [], xp: 12, faction: 'demon', adorn: 'horns',
    immuneGround: ['lava', 'magma_core'], // ember-bodied (the Legion's ground doctrine)
    // Explicit burst (the last legacy explodeOnDeath scalar, converted 1:1 to
    // its auto-map). A fast bomber could tune coalesce down to ~0.35.
    detection: 1.0, deathBurst: { mode: 'implode', damageFrac: 1.4, coalesce: 0.8 },
    brain: { type: 'bomber', fuseRange: 56, fuseTime: 0.6 },
  },
  // The Durance's toy: a stitched marionette that sprints the halls and dies
  // LOUDLY — the implode IS the monster (the searing_spawn pattern in hate's
  // colors, coalesce tuned DOWN: a doll barely telegraphs — the D2 lesson,
  // kept honest by the short fuse + small radius).
  stygian_doll: {
    id: 'stygian_doll', name: 'Stygian Doll',
    color: '#7de84a', shape: 'pentagon', radius: 9, material: 'bone', look: 'ash_whelp',
    base: { life: 16, moveSpeed: 210, accuracy: 70, mana: 0 },
    mods: [mod('chaosRes', 'flat', 0.4)],
    skills: ['claw'], xp: 9, faction: 'demon',
    scaleVariance: [0.85, 1.05],
    detection: 1.1,
    deathBurst: { mode: 'implode', damageFrac: 1.5, damageType: 'chaos', coalesce: 0.45, radius: 70 },
    brain: { type: 'bomber', fuseRange: 48, fuseTime: 0.4 },
  },
  dread_fiend: {
    id: 'dread_fiend', name: 'Dread Fiend',
    color: '#b81e3a', shape: 'star', radius: 16, material: 'ember', look: 'demon_brute',
    base: { life: 92, moveSpeed: 160, accuracy: 110, mana: 40, manaRegen: 5, insight: 45 },
    mods: [mod('fireRes', 'flat', 0.5), mod('chaosRes', 'flat', 0.3)],
    skills: ['heavy_strike', 'infernal_rift'], xp: 28, faction: 'demon', adorn: 'wings',
    immuneGround: ['lava', 'magma_core'], // ember-bodied (the Legion's ground doctrine)
    detection: 1.4, brain: { type: 'assassin', withdraw: 0.7 },
  },
  // The Legion's champion (WARLORD_OF.demon) and the infernal_rift zone boss.
  balor_warlord: {
    id: 'balor_warlord', name: 'Balor, the Rift-Tyrant',
    color: '#ff2a2a', shape: 'star', radius: 28, material: 'ember', look: 'demon_lord',
    base: { life: 480, moveSpeed: 135, accuracy: 130, mana: 240, manaRegen: 12 },
    mods: [mod('fireRes', 'flat', 0.65), mod('chaosRes', 'flat', 0.4),
      mod('damage', 'increased', 0.35)],
    skills: ['infernal_rift', 'ground_slam', 'meteor_storm', 'war_cry'],
    xp: 160, boss: true, faction: 'demon', adorn: 'wings',
    immuneGround: ['lava', 'magma_core'], // the Rift-Tyrant does not pick around puddles
    // DEF-level presence: the champion never marches in shallow war zones,
    // WHEREVER his id is tabled. Invasion set-pieces spawn him explicitly
    // (epicenter/realm), so the story beats are untouched.
    presence: { from: 15, fadeIn: 5 },
    detection: 1.4, brain: { type: 'juggernaut', enrage: 0.4 },
  },

  // --- THE LEGION MUSTERS: the deep-world horde (presence-banded — the
  //     roster below ~L12 is imps and hounds; by 20 the pit sends its
  //     army; past 30 the elite tier walks). Each entry works a different
  //     lever: death-bursts, tethers, fumes, curses, summon-nests, mounts,
  //     grants, scaling — the Legion is a tour of the bestiary's machinery.

  // The teaching tier: a scrap of living cinder that pops when it dies.
  // ONLY early (roster envelope) — past ~14 the whelps are all used up.
  ash_whelp: {
    id: 'ash_whelp', name: 'Ash Whelp',
    color: '#e8643a', shape: 'pentagon', radius: 8, material: 'ember', look: 'ash_whelp',
    base: { life: 12, moveSpeed: 190, accuracy: 70, mana: 0 },
    mods: [mod('fireRes', 'flat', 0.4)],
    skills: ['claw'], xp: 4, faction: 'demon', adorn: 'horns',
    immuneGround: ['lava', 'magma_core'], // ember-bodied (the Legion's ground doctrine)
    scaleVariance: [0.85, 1.1],
    deathBurst: { mode: 'implode', damageFrac: 1.0, coalesce: 0.6 },
    detection: 1.2, brain: { type: 'swarm' },
  },
  // The meat of the mid-game host: one deep wound at a time, and a body
  // that SCALES — regen and armor climb with level so it stays a wall.
  bloodgorger: {
    id: 'bloodgorger', name: 'Bloodgorger',
    color: '#c03a4a', shape: 'octagon', radius: 19, look: 'bloodgorger',
    base: { life: 150, moveSpeed: 105, accuracy: 105, armor: 20, mana: 30, manaRegen: 4, poise: 40 },
    mods: [mod('fireRes', 'flat', 0.3), mod('chaosRes', 'flat', 0.3)],
    skills: ['gore_rend'], xp: 30, faction: 'demon', adorn: 'spikes',
    scaling: { lifeRegen: { flatPerLevel: 0.5 }, armor: { flatPerLevel: 1.5 } },
    grants: [{ atLevel: 26, support: 'multistrike', on: 'gore_rend' }],
    detection: 1.1, brain: { type: 'juggernaut', enrage: 0.5 },
  },
  // The choir-priest: an ashfall FUME the host fights inside (heals halved
  // for anyone breathing it) — protect-me cargo the brutes escort.
  brimstone_cantor: {
    id: 'brimstone_cantor', name: 'Brimstone Cantor',
    color: '#e8945a', shape: 'octagon', radius: 13, material: 'cloth', look: 'brimstone_cantor',
    base: { life: 55, moveSpeed: 125, mana: 140, manaRegen: 10 },
    mods: [mod('fireRes', 'flat', 0.5)],
    skills: ['rain_of_ash', 'firebolt'], xp: 26, faction: 'demon',
    gemBias: ['fire', 'spell'], wardPriority: 2,
    detection: 1.2, brain: { type: 'artillery' },
  },
  // The PACK TETHER exemplar: tormentors arc a searing chain to their
  // nearest unlinked kin — the "don't stand between them" modifier as a
  // whole monster. Long whips, flanking feet.
  chained_tormentor: {
    id: 'chained_tormentor', name: 'Chained Tormentor',
    color: '#d84a3a', shape: 'kite', radius: 14, look: 'chained_tormentor',
    base: { life: 85, moveSpeed: 150, accuracy: 110, evasion: 40, mana: 30, manaRegen: 4, insight: 35 },
    mods: [mod('fireRes', 'flat', 0.4)],
    skills: ['hellfire_lash'], xp: 32, faction: 'demon', adorn: 'spikes',
    tether: { dps: 9, damageType: 'fire', radius: 300, period: 6, duty: 3, color: '#ff7a3a' },
    grants: [{ atLevel: 30, support: 'multistrike', on: 'hellfire_lash', chance: 0.5 }],
    detection: 1.3, brain: { type: 'flanker' },
  },
  // The Legion's voice: DOOM kegs from artillery range, brimstone on the
  // fallback. Its own curse doubles up at depth (creeping_doom grant).
  doomherald: {
    id: 'doomherald', name: 'Doomherald',
    color: '#9a4ac8', shape: 'star', radius: 14, material: 'cloth', look: 'doomherald',
    base: { life: 60, moveSpeed: 120, mana: 160, manaRegen: 11 },
    mods: [mod('chaosRes', 'flat', 0.5), mod('fireRes', 'flat', 0.3)],
    skills: ['doom_chant', 'brimstone_volley'], xp: 36, faction: 'demon', adorn: 'wings',
    gemBias: ['chaos', 'spell'], wardPriority: 1,
    grants: [{ atLevel: 35, support: 'creeping_doom', on: 'doom_chant' }],
    detection: 1.3, brain: { type: 'artillery' },
  },
  // The skinner in the smoke: one personality stalks alone, the other runs
  // with the knives — rolled the moment it walks in (brainVariants).
  abyssal_flayer: {
    id: 'abyssal_flayer', name: 'Abyssal Flayer',
    color: '#8a3a5a', shape: 'kite', radius: 12, material: 'void', look: 'abyssal_flayer',
    base: { life: 70, moveSpeed: 185, accuracy: 120, evasion: 80, mana: 30, manaRegen: 4 },
    mods: [mod('chaosRes', 'flat', 0.4)],
    skills: ['gore_rend', 'claw'], xp: 34, faction: 'demon', adorn: 'spikes',
    detection: 1.5,
    brainVariants: [
      { weight: 3, brain: { type: 'assassin', withdraw: 0.8 } },
      { weight: 2, brain: { type: 'flanker' } },
    ],
  },
  // The gatekeeper: whelps through the skill-gate, and every so often it
  // PLANTS a rift-maw nest that keeps spitting long after the caller falls.
  hellgate_caller: {
    id: 'hellgate_caller', name: 'Hellgate Caller',
    color: '#c84a6a', shape: 'octagon', radius: 14, material: 'cloth', look: 'hellgate_caller',
    base: { life: 75, moveSpeed: 115, mana: 200, manaRegen: 12 },
    mods: [mod('fireRes', 'flat', 0.4), mod('chaosRes', 'flat', 0.3)],
    skills: ['call_the_rift', 'firebolt'], xp: 40, faction: 'demon', adorn: 'horns',
    gemBias: ['summon', 'minion'], wardPriority: 1,
    detection: 1.2,
    brain: {
      type: 'caster',
      rules: [{
        when: {}, every: [14, 20], hold: [0.3, 0.5],
        actions: [{ do: 'summon', monster: 'rift_maw', count: 1, ring: 110, lifespan: 45, announce: 'A rift tears open!' }],
      }],
    },
  },
  // The planted gate (spawned ONLY by the caller's rule — never rostered):
  // an anchored maw that drips whelps on a beat until broken.
  rift_maw: {
    id: 'rift_maw', name: 'Rift Maw',
    color: '#ff3a3a', shape: 'oval', radius: 15, material: 'ember', look: 'rift_maw',
    base: { life: 90, moveSpeed: 0, armor: 25, mana: 0 },
    skills: [], xp: 10, faction: 'demon',
    noNemesis: true, drops: 0,
    brain: {
      type: 'basic',
      rules: [{
        when: {}, every: [7, 10], hold: [0.1, 0.2],
        actions: [{ do: 'summon', monster: 'ash_whelp', count: 2, ring: 40, lifespan: 30 }],
      }],
    },
  },
  // The walking tower (elite tier): darters and imps RIDE it (mountSlot),
  // its crust hardens with level (scaling), and its death launches an orb
  // that hunts you down. Slow, inevitable, worth focusing first.
  pyre_titan: {
    id: 'pyre_titan', name: 'Pyre Titan',
    color: '#ff5a2a', shape: 'octagon', radius: 22, material: 'ember', look: 'pyre_titan',
    base: { life: 320, moveSpeed: 95, accuracy: 115, armor: 60, mana: 40, manaRegen: 4, poise: 85, poiseDR: 0.4 },
    mods: [mod('fireRes', 'flat', 0.6), mod('damage', 'increased', 0.2)],
    skills: ['ground_slam', 'flame_wave'], xp: 70, faction: 'demon', adorn: 'horns',
    presence: 'legion_muster',
    turnSpeed: 2.8,
    mountSlot: { kinds: ['demonkin', 'imp', 'finger_mage'], offsetY: -6 },
    scaling: { armor: { flatPerLevel: 2.5 }, life: { incPerLevel: 0.05 } },
    deathBurst: { mode: 'orb', damageFrac: 1.2 },
    detection: 1.1,
    // The titan swings where its mass points (castArc) — get off its face.
    brain: { type: 'juggernaut', enrage: 0.3, behavior: { castArc: 0.6 } },
  },
  // The field officer (elite tier): a commander who whips the line forward,
  // and whose OWN kit keeps growing — extra lash hits at 40, meteors at 48.
  archfiend_legate: {
    id: 'archfiend_legate', name: 'Archfiend Legate',
    color: '#d8303a', shape: 'star', radius: 18, material: 'ember', look: 'archfiend_legate',
    base: { life: 210, moveSpeed: 130, accuracy: 125, armor: 45, mana: 120, manaRegen: 8, poise: 60 },
    mods: [mod('fireRes', 'flat', 0.5), mod('chaosRes', 'flat', 0.3), mod('damage', 'increased', 0.15)],
    skills: ['hellfire_lash', 'brimstone_volley', 'war_cry'], xp: 85, faction: 'demon', adorn: 'wings',
    presence: 'legion_muster',
    gemBias: ['fire', 'attack'], wardPriority: 2,
    grants: [
      { atLevel: 40, support: 'multistrike', on: 'hellfire_lash' },
      { atLevel: 48, skill: 'meteor_storm' },
    ],
    detection: 1.4, brain: { type: 'commander' },
  },

  // --- BREACH: rift-spawn that pour from tears in reality. A NET-NEW faction
  //     grafted in by the Breach content package's faction generator (the def
  //     lists these ids; registerFactions wires the roster/traits/warlord).
  //     Second pass: the family wears its OWN looks now (riftspawn glass,
  //     iris eyes, shard orbits — data/looks.ts) instead of borrowed demon
  //     bodies, and each court lord's kin below carry that lord's accent so
  //     the power behind a tear reads from its first minion. ---
  breach_spawn: {
    id: 'breach_spawn', name: 'Breach Spawn',
    color: '#9a3ad8', shape: 'pentagon', radius: 11, look: 'riftspawn', material: 'void',
    base: { life: 30, moveSpeed: 195, accuracy: 85, mana: 0 },
    mods: [mod('chaosRes', 'flat', 0.5)],
    skills: ['claw'], xp: 11, faction: 'breach',
    detection: 1.2, brain: { type: 'swarm' },
  },
  breach_horror: {
    id: 'breach_horror', name: 'Breach Horror',
    color: '#7a2ad0', shape: 'octagon', radius: 15, material: 'void', look: 'rift_horror',
    base: { life: 70, moveSpeed: 140, mana: 120, manaRegen: 8 },
    mods: [mod('chaosRes', 'flat', 0.6), mod('coldRes', 'flat', 0.3)],
    skills: ['firebolt', 'infernal_rift'], xp: 24, faction: 'breach',
    detection: 1.3, brain: { type: 'strafer' },
  },
  breach_lord: {
    id: 'breach_lord', name: 'Xal, the Riftmaw',
    color: '#b04ae8', shape: 'star', radius: 27, material: 'void', look: 'xal_riftmaw',
    base: { life: 520, moveSpeed: 130, accuracy: 130, mana: 240, manaRegen: 12 },
    mods: [mod('chaosRes', 'flat', 0.6), mod('coldRes', 'flat', 0.4), mod('damage', 'increased', 0.35)],
    skills: ['infernal_rift', 'meteor_storm', 'ground_slam', 'war_cry'],
    xp: 175, boss: true, faction: 'breach',
    detection: 1.4, brain: { type: 'juggernaut', enrage: 0.4 },
  },

  // --- THE COURT OF THE BREACH (packages/courts.ts): each lord's kin, mixed
  //     into a courted field at rosterShare — the lord's accent on the family
  //     silhouette. ASHKARRA, the Rose Pyre: fire that is the wrong color. ---
  breach_emberkin: {
    id: 'breach_emberkin', name: 'Emberkin',
    color: '#ff5a78', shape: 'pentagon', radius: 10, look: 'breach_emberkin', material: 'ember',
    base: { life: 26, moveSpeed: 205, accuracy: 88, mana: 0 },
    mods: [mod('chaosRes', 'flat', 0.4), mod('fireRes', 'flat', 0.6)],
    skills: ['claw'], xp: 12, faction: 'breach',
    detection: 1.25, brain: { type: 'swarm' },
  },
  breach_pyrelight: {
    id: 'breach_pyrelight', name: 'Pyrelight',
    color: '#ff7a92', shape: 'oval', radius: 13, look: 'breach_pyrelight', material: 'ember',
    base: { life: 52, moveSpeed: 150, mana: 110, manaRegen: 9 },
    mods: [mod('chaosRes', 'flat', 0.4), mod('fireRes', 'flat', 0.7)],
    skills: ['firebolt'], xp: 22, faction: 'breach',
    detection: 1.3, brain: { type: 'strafer' },
  },
  // THULVANE, the Stillness Between: the cold that waits on the far side.
  breach_rimehusk: {
    id: 'breach_rimehusk', name: 'Rimehusk',
    color: '#58b8ff', shape: 'hexagon', radius: 15, look: 'breach_rimehusk', material: 'ice',
    base: { life: 95, moveSpeed: 120, armor: 30, poise: 25, mana: 40, manaRegen: 4 },
    mods: [mod('chaosRes', 'flat', 0.4), mod('coldRes', 'flat', 0.75)],
    skills: ['rimeclaw', 'frost_pulse'], xp: 26, faction: 'breach',
    detection: 1.2, brain: { type: 'juggernaut' },
  },
  breach_hollowchill: {
    id: 'breach_hollowchill', name: 'Hollowchill',
    color: '#8ad0ff', shape: 'oval', radius: 13, look: 'breach_hollowchill', material: 'ice',
    base: { life: 48, moveSpeed: 145, mana: 130, manaRegen: 10 },
    mods: [mod('chaosRes', 'flat', 0.4), mod('coldRes', 'flat', 0.7)],
    skills: ['frostbolt', 'frost_nova'], xp: 24, faction: 'breach',
    detection: 1.3, brain: { type: 'caster' },
  },
  // VEXIRA, the Arc Across: the spark that finds every gap.
  breach_arcling: {
    id: 'breach_arcling', name: 'Arcling',
    color: '#cfe8ff', shape: 'kite', radius: 10, look: 'breach_arcling', material: 'crystal',
    base: { life: 24, moveSpeed: 215, accuracy: 92, evasion: 40, mana: 60, manaRegen: 8 },
    mods: [mod('chaosRes', 'flat', 0.4), mod('lightningRes', 'flat', 0.7)],
    skills: ['spark_bolt'], xp: 13, faction: 'breach',
    detection: 1.3, brain: { type: 'skirmish' },
  },
  breach_stormveil: {
    id: 'breach_stormveil', name: 'Stormveil',
    color: '#aacef0', shape: 'rhombus', radius: 14, look: 'breach_stormveil', material: 'crystal',
    base: { life: 55, moveSpeed: 140, mana: 140, manaRegen: 11 },
    mods: [mod('chaosRes', 'flat', 0.4), mod('lightningRes', 'flat', 0.75)],
    skills: ['lightning_bolt', 'shock_nova'], xp: 26, faction: 'breach',
    detection: 1.3, brain: { type: 'artillery' },
  },
  // NULGRAVE, the Hunger Behind the Skin: appetite before anatomy.
  breach_gnawmouth: {
    id: 'breach_gnawmouth', name: 'Gnawmouth',
    color: '#e044c8', shape: 'circle', radius: 11, look: 'breach_gnawmouth', material: 'slime',
    base: { life: 34, moveSpeed: 190, accuracy: 86 },
    mods: [mod('chaosRes', 'flat', 0.6)],
    skills: ['claw'], xp: 13, faction: 'breach',
    aggro: { fixation: 1.3 },
    detection: 1.35, brain: { type: 'swarm' },
  },
  breach_unshaped: {
    id: 'breach_unshaped', name: 'The Unshaped',
    color: '#b83aa8', shape: 'octagon', radius: 17, look: 'breach_unshaped', material: 'slime',
    base: { life: 130, moveSpeed: 105, poise: 30, mana: 100, manaRegen: 7 },
    mods: [mod('chaosRes', 'flat', 0.7)],
    skills: ['void_hook', 'maw_bloom'], xp: 32, faction: 'breach',
    detection: 1.2, brain: { type: 'juggernaut' },
  },

  // The FOUR VESSELS — a lord poured into a body (courts registry `vessel`;
  // spawned CROWNED by the domain's arena pipeline, tag 'court_vessel' pays
  // the bounty). Each is its kin's accent made sovereign, so the fight reads
  // on sight after a field of its minions.
  vessel_ashkarra: {
    id: 'vessel_ashkarra', name: 'Vessel of Ashkarra',
    color: '#ff5a78', shape: 'star', radius: 26, look: 'vessel_ashkarra', material: 'ember',
    base: { life: 660, moveSpeed: 125, accuracy: 135, mana: 260, manaRegen: 13 },
    mods: [mod('chaosRes', 'flat', 0.5), mod('fireRes', 'flat', 0.8), mod('damage', 'increased', 0.4)],
    skills: ['firebolt', 'meteor_storm', 'infernal_rift', 'war_cry'],
    xp: 230, boss: true, faction: 'breach',
    detection: 1.4, brain: { type: 'juggernaut', enrage: 0.35 },
  },
  vessel_thulvane: {
    id: 'vessel_thulvane', name: 'Vessel of Thulvane',
    color: '#58b8ff', shape: 'hexagon', radius: 26, look: 'vessel_thulvane', material: 'ice',
    base: { life: 700, moveSpeed: 108, accuracy: 130, armor: 60, poise: 60, mana: 240, manaRegen: 12 },
    mods: [mod('chaosRes', 'flat', 0.5), mod('coldRes', 'flat', 0.85), mod('damage', 'increased', 0.35)],
    skills: ['frost_nova', 'ice_spear', 'rime_fang'],
    xp: 235, boss: true, faction: 'breach',
    detection: 1.4, brain: { type: 'juggernaut', enrage: 0.3 },
  },
  vessel_vexira: {
    id: 'vessel_vexira', name: 'Vessel of Vexira',
    color: '#cfe8ff', shape: 'kite', radius: 23, look: 'vessel_vexira', material: 'crystal',
    base: { life: 560, moveSpeed: 175, accuracy: 140, evasion: 70, mana: 300, manaRegen: 15 },
    mods: [mod('chaosRes', 'flat', 0.5), mod('lightningRes', 'flat', 0.85), mod('damage', 'increased', 0.4)],
    skills: ['spark_bolt', 'chain_lightning', 'shock_nova', 'storm_call'],
    xp: 225, boss: true, faction: 'breach',
    detection: 1.45, brain: { type: 'flanker' },
  },
  vessel_nulgrave: {
    id: 'vessel_nulgrave', name: 'Vessel of Nulgrave',
    color: '#e044c8', shape: 'octagon', radius: 28, look: 'vessel_nulgrave', material: 'slime',
    base: { life: 780, moveSpeed: 112, accuracy: 128, poise: 50, mana: 220, manaRegen: 11 },
    mods: [mod('chaosRes', 'flat', 0.8), mod('damage', 'increased', 0.35)],
    skills: ['devouring_maw', 'void_hook', 'maw_bloom', 'despair'],
    xp: 245, boss: true, faction: 'breach',
    aggro: { fixation: 1.2 },
    detection: 1.4, brain: { type: 'juggernaut', enrage: 0.45 },
  },

  // --- THE IRON CRUSADE: militant zealots who march only behind a Crusade. A
  //     NET-NEW faction grafted by the Crusade content package; its FactionSpec
  //     declares contexts:['crusade'] so these NEVER spawn in ordinary world gen —
  //     only a Crusade fields them (the spawn-context gate in world/traits.ts).
  crusade_footman: {
    id: 'crusade_footman', name: 'Crusade Footman',
    color: '#d8b040', shape: 'hexagon', radius: 14, material: 'metal', look: 'crusader',
    base: { life: 78, moveSpeed: 120, accuracy: 100, armor: 35, mana: 40, manaRegen: 5 },
    mods: [mod('fireRes', 'flat', 0.25)],
    skills: ['heavy_strike'], xp: 18, faction: 'crusade',
  },
  crusade_zealot: {
    id: 'crusade_zealot', name: 'Crusade Zealot',
    color: '#e8c860', shape: 'pentagon', radius: 11, material: 'metal', look: 'crusader',
    base: { life: 40, moveSpeed: 185, accuracy: 90, mana: 0 },
    skills: ['claw'], xp: 13, faction: 'crusade',
    detection: 1.2, brain: { type: 'swarm' },
  },
  crusade_arbalest: {
    id: 'crusade_arbalest', name: 'Crusade Arbalest',
    color: '#c8a850', shape: 'diamond', radius: 12, material: 'metal', look: 'crusader_arbalest',
    base: { life: 46, moveSpeed: 130, mana: 100, manaRegen: 8 },
    mods: [mod('fireRes', 'flat', 0.2)],
    skills: ['firebolt'], xp: 17, faction: 'crusade',
    detection: 1.25, brain: { type: 'strafer' },
  },
  crusade_standard_bearer: {
    id: 'crusade_standard_bearer', name: 'Crusade Standard-Bearer',
    color: '#f0d878', shape: 'cross', radius: 15, material: 'metal', look: 'crusader_banner',
    base: { life: 120, moveSpeed: 115, accuracy: 105, armor: 30, mana: 110, manaRegen: 8, poise: 55 },
    mods: [mod('fireRes', 'flat', 0.3)],
    skills: ['rallying_howl', 'war_cry', 'heavy_strike'], xp: 40, faction: 'crusade',
    brain: { type: 'commander' },
  },
  crusade_templar: {
    id: 'crusade_templar', name: 'Crusade Templar',
    color: '#cfa830', shape: 'trapezoid', radius: 18, material: 'metal', look: 'crusader',
    base: { life: 165, moveSpeed: 110, accuracy: 110, armor: 55, mana: 80, manaRegen: 6, poise: 60 },
    mods: [mod('fireRes', 'flat', 0.35), mod('coldRes', 'flat', 0.2)],
    skills: ['ground_slam', 'heavy_strike'], xp: 30, faction: 'crusade',
    brain: { type: 'flanker' },
  },
  crusade_marshal: {
    id: 'crusade_marshal', name: 'the Crusade Marshal',
    color: '#ffe070', shape: 'star', radius: 27, material: 'metal', look: 'crusader',
    base: { life: 500, moveSpeed: 125, accuracy: 130, armor: 60, mana: 220, manaRegen: 12 },
    mods: [mod('fireRes', 'flat', 0.5), mod('coldRes', 'flat', 0.35), mod('damage', 'increased', 0.35)],
    skills: ['war_cry', 'ground_slam', 'rallying_howl', 'cleave'],
    xp: 168, boss: true, faction: 'crusade', adorn: 'horns',
    detection: 1.4, brain: { type: 'juggernaut', enrage: 0.4 },
  },

  // --- THE ABYSSAL: things that crawl up out of a FRACTURE in the earth. A
  //     NET-NEW faction grafted by the Fractures content package; its FactionSpec
  //     declares contexts:['fractures'] so these NEVER spawn in ordinary world gen
  //     — only a Fracture's fissure/chasm spews them (spawn-context gate). They
  //     double as the AI-package showcase: an impulse swarm-rusher and a vanguard
  //     that recoils to range. (The Elemental 'Leyline' variant reuses that
  //     faction's own roster — only the Abyssal needs new bodies.)
  abyssal_crawler: {
    id: 'abyssal_crawler', name: 'Abyssal Crawler',
    color: '#8a4ae0', shape: 'triangle', radius: 10, material: 'chitin', look: 'swarm_bug',
    base: { life: 34, moveSpeed: 200, accuracy: 90, mana: 0 },
    skills: ['claw'], xp: 12, faction: 'abyssal',
    detection: 1.35, brain: { type: 'swarm' },
  },
  abyssal_wretch: {
    id: 'abyssal_wretch', name: 'Abyssal Wretch',
    color: '#6a3ad0', shape: 'pentagon', radius: 13, look: 'wraith',
    base: { life: 86, moveSpeed: 118, accuracy: 100, armor: 30 },
    mods: [mod('coldRes', 'flat', 0.25)],
    skills: ['heavy_strike'], xp: 17, faction: 'abyssal',
  },
  // AI-PACKAGE SHOWCASE #1 — a strafing caster that INTERMITTENTLY rushes in like
  // a swarmer (a periodic archetype impulse), the user's "strafe, then charge".
  abyssal_seer: {
    id: 'abyssal_seer', name: 'Abyssal Seer',
    color: '#a86adf', shape: 'diamond', radius: 12, material: 'void', look: 'hexer',
    base: { life: 52, moveSpeed: 135, mana: 110, manaRegen: 9 },
    mods: [mod('coldRes', 'flat', 0.3)],
    // The ENEMY CHRONOMANCER (engine/timeflow.ts): its Stasis Lock hangs a
    // hero outside time — the same data-driven skill players can slot.
    skills: ['frostbolt', 'stasis_lock'], xp: 19, faction: 'abyssal',
    detection: 1.25,
    brain: {
      type: 'strafer',
      impulses: [
        { type: 'swarm', every: [5, 8], duration: [1.2, 1.8], announce: 'It lunges from the dark!' },
      ],
    },
  },
  // AI-PACKAGE SHOWCASE #2 — a VANGUARD that holds the frontline (juggernaut) but,
  // once bloodied, RECOILS to caster range (an HP-phase archetype SWAP to a
  // kiting strafer — not a flee; it keeps fighting, just from afar).
  abyssal_vanguard: {
    id: 'abyssal_vanguard', name: 'Abyssal Vanguard',
    color: '#7038b8', shape: 'trapezoid', radius: 18, material: 'void', look: 'crusader',
    base: { life: 178, moveSpeed: 112, accuracy: 112, armor: 64, mana: 70, manaRegen: 7, poise: 65 },
    mods: [mod('coldRes', 'flat', 0.35)],
    skills: ['ground_slam', 'frostbolt'], xp: 32, faction: 'abyssal',
    detection: 1.2,
    brain: {
      type: 'juggernaut',
      phases: [
        { atLifeFrac: 0.5, type: 'strafer', announce: 'The Vanguard recoils to range!',
          mods: [mod('moveSpeed', 'more', 0.25)] },
      ],
    },
  },
  abyssal_render: {
    id: 'abyssal_render', name: 'Abyssal Render',
    color: '#9a4ad0', shape: 'hexagon', radius: 15, material: 'void', look: 'stalker',
    base: { life: 132, moveSpeed: 132, accuracy: 110, armor: 40, poise: 45 },
    mods: [mod('coldRes', 'flat', 0.25)],
    skills: ['cleave'], xp: 26, faction: 'abyssal',
    detection: 1.15, brain: { type: 'flanker' },
  },
  // The faction apex (its "warlord" for registry completeness — Fractures don't
  // crown warlords, but a Crowned promotion can elevate it inside a chasm).
  abyssal_horror: {
    id: 'abyssal_horror', name: 'the Abyssal Horror',
    color: '#b06aff', shape: 'star', radius: 26, material: 'void', look: 'deep_horror',
    base: { life: 460, moveSpeed: 120, accuracy: 128, armor: 55, mana: 200, manaRegen: 12 },
    mods: [mod('coldRes', 'flat', 0.45), mod('damage', 'increased', 0.3)],
    skills: ['frost_nova', 'ground_slam', 'cleave'],
    xp: 160, boss: true, faction: 'abyssal', adorn: 'spikes',
    detection: 1.35,
    scaling: { life: { incPerLevel: 0.1 } },
    brain: {
      type: 'juggernaut', enrage: 0.3,
      impulses: [
        { type: 'swarm', every: [5, 8], duration: [1.2, 1.7], announce: 'The Horror surges!' },
      ],
    },
  },

  // --- FRACTURE CAPSTONE BOSSES: the in-depth demo fights at the heart of a
  //     Fracture's reward rift (one per variant: Abyssal / Leyline / Hellion).
  //     Each is a multi-PHASE journey — a melee opener that recoils to a ranged
  //     barrage when bloodied, then a frenzied final stand — plus a periodic
  //     impulse and a signature kit. Spawned ONLY by the capstone (Crowned, never
  //     in any roster), so the chasm apex (abyssal_horror) and the rift TYRANT
  //     stay distinct. boss:true + xp≥160 lights the boss bar.

  // ABYSSAL — a towering void-horror: juggernaut → kiting frost-caster → frenzy.
  abyssal_tyrant: {
    id: 'abyssal_tyrant', name: 'the Abyssal Tyrant',
    color: '#a040e0', shape: 'star', radius: 31, material: 'void', look: 'demon_lord',
    base: { life: 900, moveSpeed: 116, accuracy: 138, armor: 70, mana: 220, manaRegen: 13 },
    mods: [mod('coldRes', 'flat', 0.5), mod('chaosRes', 'flat', 0.3), mod('damage', 'increased', 0.4)],
    skills: ['frost_nova', 'ground_slam', 'cleave', 'frostbolt'],
    xp: 320, boss: true, faction: 'abyssal', adorn: 'spikes', detection: 1.4,
    scaling: { life: { incPerLevel: 0.15 } },
    brain: {
      type: 'juggernaut', enrage: 0.22,
      phases: [
        { atLifeFrac: 0.66, rewardGems: 1, announce: 'The Tyrant rends the veil!',
          mods: [mod('damage', 'more', 0.25), mod('damageTaken', 'more', -0.12)] },
        { atLifeFrac: 0.40, type: 'strafer', rewardGems: 1, announce: 'The Abyss recoils — and answers in frost!',
          mods: [mod('moveSpeed', 'more', 0.4), mod('damage', 'more', 0.3)] },
        { atLifeFrac: 0.18, type: 'juggernaut', rewardGems: 2, announce: 'The Maw yawns wide — it ALL ENDS!',
          mods: [mod('damage', 'more', 0.6), mod('moveSpeed', 'more', 0.35)] },
      ],
      impulses: [
        { type: 'swarm', every: [5, 8], duration: [1.4, 2.0], announce: 'It lunges from the void!' },
      ],
    },
  },

  // LEYLINE — an arcane elemental sovereign: a kiting multi-element caster that
  // escalates to extreme-range artillery, then desperately closes to nova you.
  leyline_sovereign: {
    id: 'leyline_sovereign', name: 'the Leyline Sovereign',
    color: '#50c0ff', shape: 'octagon', radius: 28, material: 'crystal', look: 'crystal_sovereign',
    base: { life: 760, moveSpeed: 128, accuracy: 130, armor: 45, mana: 280, manaRegen: 17 },
    mods: [mod('coldRes', 'flat', 0.35), mod('lightningRes', 'flat', 0.35), mod('fireRes', 'flat', 0.25), mod('damage', 'increased', 0.45)],
    skills: ['spark', 'frost_nova', 'flame_wave', 'frostbolt'],
    xp: 300, boss: true, faction: 'elemental', adorn: 'wings', detection: 1.4,
    scaling: { life: { incPerLevel: 0.12 } },
    brain: {
      type: 'strafer', enrage: 0.3,
      phases: [
        { atLifeFrac: 0.66, rewardGems: 1, announce: 'The Sovereign draws on the ley!',
          mods: [mod('damage', 'more', 0.3), mod('moveSpeed', 'more', 0.2)] },
        { atLifeFrac: 0.40, type: 'artillery', rewardGems: 1, announce: 'The Leyline surges — it floods the vault with power!',
          mods: [mod('damage', 'more', 0.4)] },
        { atLifeFrac: 0.18, type: 'swarm', rewardGems: 2, announce: 'The weave unravels — it lashes out!',
          mods: [mod('moveSpeed', 'more', 0.5), mod('damage', 'more', 0.4)] },
      ],
      impulses: [
        { type: 'swarm', every: [6, 9], duration: [1.1, 1.6], announce: 'It surges close to discharge!' },
      ],
    },
  },

  // HELLION — a riftborn demon: a brutal juggernaut whose signature is a
  // meteor storm at mid-fight (the Balor's own mechanic), then a frenzied rush.
  hellion_tyrant: {
    id: 'hellion_tyrant', name: 'the Riftborn Hellion',
    color: '#ff5a2a', shape: 'star', radius: 31, material: 'ember', look: 'demon_lord',
    base: { life: 980, moveSpeed: 122, accuracy: 140, armor: 72, mana: 240, manaRegen: 14 },
    mods: [mod('fireRes', 'flat', 0.6), mod('chaosRes', 'flat', 0.3), mod('damage', 'increased', 0.45)],
    skills: ['infernal_rift', 'flame_wave', 'ground_slam', 'cleave', 'meteor_storm'],
    xp: 340, boss: true, faction: 'demon', adorn: 'horns', detection: 1.45,
    scaling: { life: { incPerLevel: 0.16 } },
    brain: {
      type: 'juggernaut', enrage: 0.35,
      phases: [
        { atLifeFrac: 0.66, rewardGems: 1, announce: 'The Hellion erupts from the rift!',
          mods: [mod('damage', 'more', 0.25), mod('moveSpeed', 'more', 0.2)] },
        { atLifeFrac: 0.40, type: 'artillery', rewardGems: 1, announce: 'BRIMSTONE RAINS — flee the open ground!',
          mods: [mod('damage', 'more', 0.45)] },
        { atLifeFrac: 0.18, type: 'swarm', rewardGems: 2, announce: 'The rift collapses inward — it charges!',
          mods: [mod('moveSpeed', 'more', 0.55), mod('damage', 'more', 0.5)] },
      ],
      impulses: [
        { type: 'swarm', every: [5, 8], duration: [1.4, 2.0], announce: 'It charges through the flames!' },
      ],
    },
  },

  // --- THE UNMADE: the "uber" boss (FLOATING-minted by the level-20 quest Q_UNMADE,
  //     which forces the unmade_vault arena layout; see quests/defs.ts + levelgen
  //     'unmade_vault'). A single body that refuses to keep one shape — four
  //     mechanically distinct fights stitched into one HP bar, and the WHOLE fight
  //     is data now: the script FSM below drives the forms (juggernaut BRUTE →
  //     bolting CONJURER → BRIMSTONE Herald → warded apex) AND the arena (the
  //     bolt, the flood + shrinking relief pockets, the drain, the permanent void
  //     cracks, the meteor ring-volley, the echo-guard ward, the outward shoves,
  //     the tint ladder) through the arenaSink / voidCrack / ring / ward verbs.
  //     The quest layout's BossRun rect fits the collapse to the vault; a Zone-
  //     Memory re-entry respawns it fresh and the HP gotos fast-chain each
  //     onEnter IN ORDER, re-staging the arena exactly like the old latch ladder.
  //     Its onDeath rattle RESTORES the floor. pillar_of_flame (its own kit)
  //     remains the closing cage.
  unmade_chronophage: {
    id: 'unmade_chronophage', name: 'the Unmade',
    color: '#c050d0', shape: 'star', radius: 34, material: 'void', look: 'chronophage',
    // No longer Crowned by default (that 7.5x is gone) — base trimmed for a leaner
    // ~10-13k HP across the level band; spike it later via objective.promote (stack Crowned).
    base: { life: 1000, moveSpeed: 118, accuracy: 150, armor: 80, mana: 320, manaRegen: 18 },
    mods: [
      mod('coldRes', 'flat', 0.4), mod('fireRes', 'flat', 0.4),
      mod('chaosRes', 'flat', 0.3), mod('damage', 'increased', 0.5),
    ],
    skills: ['ground_slam', 'cleave', 'frost_nova', 'frostbolt', 'meteor_storm', 'pillar_of_flame', 'cold_vortex'],
    xp: 360, boss: true, faction: 'demon', adorn: 'horns', detection: 1.5,
    levitates: true, // never dies to its own void (no knock-into-void cheese)
    scaling: { life: { incPerLevel: 0.16 } },
    brain: {
      type: 'juggernaut',
      script: [
        { // ACT I — the BRUTE: iron-grey vault, shockwaves that hurl you outward.
          id: 'brute',
          onEnter: [{ do: 'wash', color: '#3a3a48', intensity: 0.10 }],
          cadences: [{
            every: 3.2, first: 2.5,
            actions: [{ do: 'nova', skill: 'magma_glob', at: 'self', zoneRadius: 195, delay: 0.9, push: { strength: 220 } }],
          }],
          goto: [{ to: 'conjurer', atLifeFrac: 0.66 }],
        },
        { // ACT II — the CONJURER: it BOLTS, the vault FLOODS and shrinks to a
          // disc of drowning water with relief bubbles that close, breath by breath.
          id: 'conjurer',
          use: { type: 'strafer' },
          rewardGems: 1,
          announce: 'The Crown remembers it is prey — it BOLTS!',
          mods: [mod('moveSpeed', 'more', 0.35), mod('damageTaken', 'more', -0.30)],
          onEnter: [
            { do: 'teleport', to: 'awayFromTarget', range: 520 },
            { do: 'arenaSink', radius: { frac: 0.60, min: 420 }, mode: 'deep_water', dais: 150, pockets: { count: 6, radius: 140, ringFrac: 0.58 } },
            { do: 'wash', color: '#1f5fa0', intensity: 0.16 },
            { do: 'announce', text: 'The vault FLOODS — the walls close in!', color: '#5aa8d8', size: 18 },
          ],
          cadences: [{ every: 3, actions: [{ do: 'shrinkPockets', by: 14, min: 58 }] }],
          goto: [{ to: 'herald', atLifeFrac: 0.40 }],
        },
        { // ACT III — the HERALD: the waters boil away, the floor caves further
          // and CRACKS open (permanently), and brimstone rains in rippling rings.
          id: 'herald',
          use: { type: 'artillery' },
          rewardGems: 1,
          announce: 'It rises — BRIMSTONE RAINS, and the fire CLOSES IN!',
          mods: [mod('damage', 'more', 0.5), mod('attackSpeed', 'increased', 0.2)],
          onEnter: [
            { do: 'arenaSink', radius: { frac: 0.45, min: 340 }, mode: 'ground', dais: 150 },
            { do: 'voidCrack', count: 3, ring: { frac: 0.28, min: 210 }, radius: 58 },
            { do: 'wash', color: '#c0451e', intensity: 0.18 },
          ],
          cadences: [{
            every: 4,
            actions: [
              { do: 'ring', skill: 'magma_glob', radius: 170, count: 7, waves: 2, waveGap: 0.5, delay: 1.0, at: 'anchor' },
              { do: 'shake', amount: 5 },
            ],
          }],
          goto: [{ to: 'apex', atLifeFrac: 0.18 }],
        },
        { // ACT IV — the UNMADE: the tightest stand; the echo guard rises and
          // WARDS it; frenzied shoves hurl you toward the void it made.
          id: 'apex',
          use: { type: 'swarm' },
          rewardGems: 2,
          announce: 'ALL THAT IT DEVOURED — RISE!',
          mods: [mod('moveSpeed', 'more', 0.5), mod('damage', 'more', 0.5)],
          onEnter: [
            { do: 'arenaSink', radius: { frac: 0.34, min: 300 }, mode: 'ground', dais: 150 },
            { do: 'summon', monster: 'lesser_brute', count: 2, ring: 240, at: 'anchor', tag: 'unmade_add' },
            { do: 'summon', monster: 'lesser_conjurer', count: 2, ring: 240, at: 'anchor', tag: 'unmade_add' },
            { do: 'summon', monster: 'lesser_herald', count: 1, ring: 240, at: 'anchor', tag: 'unmade_add' },
            { do: 'ward', tag: 'unmade_add', announce: 'The ward SHATTERS — strike it down!' },
            { do: 'wash', color: '#7a2347', intensity: 0.22 },
          ],
          cadences: [{ every: 2.2, actions: [{ do: 'push', radius: 250, strength: 150, from: 'anchor' }] }],
          goto: [],
        },
      ],
      impulses: [
        { type: 'swarm', every: [5, 8], duration: [1.4, 2.0], announce: 'It charges through the unmade!' },
      ],
      // The victory beat: the caved floor knits back so the victor can leave.
      onDeath: [
        { do: 'arenaRestore' },
        { do: 'wash', color: '#000000', intensity: 0 },
      ],
    },
  },

  // THE UNMADE'S ECHO GUARD — lesser revenants of the forms it has shed, summoned
  // (WARDED) for its final stand. Lightweight on purpose: a clear-to-continue gate,
  // not bosses. Each mirrors one prior phase. Spawned ONLY by updateBoss (tagged
  // 'unmade_add'), never in any roster.
  lesser_brute: {
    id: 'lesser_brute', name: 'Echo of the Brute',
    color: '#9a8890', shape: 'pentagon', radius: 18, look: 'demon_brute',
    base: { life: 190, moveSpeed: 122, accuracy: 125, armor: 36, poise: 50 },
    skills: ['ground_slam', 'cleave'],
    xp: 26, faction: 'demon', adorn: 'horns',
    brain: { type: 'juggernaut' },
  },
  lesser_conjurer: {
    id: 'lesser_conjurer', name: 'Echo of the Drowned',
    color: '#5aa8d8', shape: 'octagon', radius: 16, material: 'cloth', look: 'cultist',
    base: { life: 135, moveSpeed: 128, accuracy: 122, mana: 90, manaRegen: 9 },
    mods: [mod('coldRes', 'flat', 0.4)],
    skills: ['frostbolt', 'frost_nova'],
    xp: 26, faction: 'demon',
    brain: { type: 'strafer' },
  },
  lesser_herald: {
    id: 'lesser_herald', name: 'Echo of the Brimstone',
    color: '#e0703a', shape: 'octagon', radius: 16, look: 'cultist',
    base: { life: 135, moveSpeed: 118, accuracy: 122, mana: 130, manaRegen: 11 },
    mods: [mod('fireRes', 'flat', 0.4)],
    skills: ['firebolt', 'meteor_storm'],
    xp: 26, faction: 'demon', adorn: 'wings',
    brain: { type: 'artillery' },
  },

  // --- THE MARSH LEVIATHAN — the composite-monster exemplar -----------------
  // One creature, five hitboxes: the body is the root; head, claws and tail
  // are full monster-actors anchored to its facing frame (MonsterDef.parts).
  // Each part fights with its own skills and BREAKS individually — sundering
  // a claw wounds the beast and tears its guard open; the head is the prize
  // weakspot. The framework, proven: dragons/world bosses are data from here.
  marsh_leviathan: {
    id: 'marsh_leviathan', name: 'The Marsh Leviathan',
    color: '#4a7a68', shape: 'oval', radius: 30, material: 'slime', look: 'leviathan_body',
    boss: true, noNemesis: true,
    base: { life: 700, moveSpeed: 52, armor: 40, weight: 6 },
    skills: [],
    xp: 420,
    parts: [
      { monster: 'leviathan_head', dx: 1.5, dy: 0, lifeFrac: 0.45, breakDamage: 0.18 },
      {
        monster: 'leviathan_claw', dx: 0.8, dy: 1.3, lifeFrac: 0.3, breakDamage: 0.1,
        breakMods: [mod('damageTaken', 'increased', 0.12)],
      },
      {
        monster: 'leviathan_claw', dx: 0.8, dy: -1.3, lifeFrac: 0.3, breakDamage: 0.1,
        breakMods: [mod('damageTaken', 'increased', 0.12)],
      },
      { monster: 'leviathan_tail', dx: -1.75, dy: 0, rot: Math.PI, lifeFrac: 0.3, breakDamage: 0.1 },
    ],
  },
  leviathan_head: {
    id: 'leviathan_head', name: 'Leviathan Head',
    color: '#5a8a74', shape: 'oval', radius: 19, material: 'slime', look: 'leviathan_head',
    noNemesis: true,
    base: { life: 200, moveSpeed: 0, mana: 120, manaRegen: 10, poise: 60 },
    skills: ['venom_bolt'],
    xp: 0,
    brain: { type: 'artillery' },
  },
  leviathan_claw: {
    id: 'leviathan_claw', name: 'Leviathan Claw',
    color: '#43705f', shape: 'oval', radius: 14, material: 'chitin', look: 'leviathan_claw',
    noNemesis: true,
    base: { life: 140, moveSpeed: 0, mana: 60, manaRegen: 6, poise: 40 },
    skills: ['claw'],
    xp: 0,
  },
  leviathan_tail: {
    id: 'leviathan_tail', name: 'Leviathan Tail',
    color: '#3c6353', shape: 'oval', radius: 15, material: 'slime', look: 'leviathan_tail',
    noNemesis: true,
    base: { life: 140, moveSpeed: 0, mana: 80, manaRegen: 6, poise: 40 },
    skills: ['whirling_reap'],
    xp: 0,
  },

  // ==========================================================================
  // THE BESTIARY EXPANSION — six families in one pass. Cap-folk (the Bloom's
  // SOLID kin — warriors and priests under one great cap, no clouds), cavern
  // dwellers, the treant line, the beastkin Horned Tribes, the Glut (flesh &
  // the viscous), and the rookeries (D2 blood-hawk nests as living data:
  // anchored spawners whose rules keep spitting until you break the bowl).
  // ==========================================================================

  // --- THE CAP-FOLK (faction 'fungal' — the Bloom's mushroom infantry) ------
  // A walking button. The teaching tier of every mycelium floor.
  mushroomling: {
    id: 'mushroomling', name: 'Mushroomling',
    color: '#c8a86a', shape: 'pentagon', radius: 9, material: 'verdant', look: 'mushroomling',
    base: { life: 14, moveSpeed: 165, accuracy: 75, mana: 0 },
    mods: [mod('chaosRes', 'flat', 0.3)],
    skills: ['claw'], xp: 5, faction: 'fungal',
    scaleVariance: [0.8, 1.15],
    detection: 1.0, brain: { type: 'swarm' },
  },
  // The line under the war-cap: myconids fight in ranks.
  myconid_warrior: {
    id: 'myconid_warrior', name: 'Myconid Warrior',
    color: '#b89a5a', shape: 'hexagon', radius: 13, material: 'verdant', look: 'myconid_warrior',
    base: { life: 55, moveSpeed: 125, accuracy: 100, armor: 20, mana: 20, manaRegen: 3 },
    mods: [mod('chaosRes', 'flat', 0.3)],
    skills: ['cleave'], xp: 16, faction: 'fungal',
    grants: [{ atLevel: 20, support: 'multistrike', on: 'cleave', chance: 0.5 }],
    detection: 1.0, brain: { type: 'pack', squad: { idle: { style: 'drill' } } },
  },
  // The cap-caller: sporefall from the second rank; cargo worth guarding.
  myconid_capcaller: {
    id: 'myconid_capcaller', name: 'Myconid Capcaller',
    color: '#d8b878', shape: 'octagon', radius: 12, material: 'verdant', look: 'myconid_capcaller',
    base: { life: 45, moveSpeed: 115, mana: 150, manaRegen: 10 },
    mods: [mod('chaosRes', 'flat', 0.4)],
    skills: ['sporefall', 'venom_bolt'], xp: 24, faction: 'fungal',
    gemBias: ['chaos', 'spell'], wardPriority: 1,
    detection: 1.1, brain: { type: 'artillery' },
  },
  // The bolete: a shelf-capped stump that knots the ground under you.
  bolete_brute: {
    id: 'bolete_brute', name: 'Bolete Brute',
    color: '#a8804a', shape: 'octagon', radius: 18, material: 'verdant', look: 'bolete_brute',
    base: { life: 170, moveSpeed: 100, accuracy: 105, armor: 30, poise: 40, mana: 40, manaRegen: 4 },
    mods: [mod('chaosRes', 'flat', 0.4)],
    skills: ['ground_slam', 'root_grasp'], xp: 34, faction: 'fungal',
    turnSpeed: 3.4,
    scaling: { armor: { flatPerLevel: 1.5 } },
    detection: 1.0, brain: { type: 'juggernaut', enrage: 0.4 },
  },
  // The sovereign under the parasol — the Bloom's warlord tier.
  amanita_sovereign: {
    id: 'amanita_sovereign', name: 'Amanita Sovereign',
    color: '#d84a4a', shape: 'star', radius: 17, material: 'verdant', look: 'amanita_sovereign',
    base: { life: 220, moveSpeed: 110, accuracy: 115, armor: 30, mana: 200, manaRegen: 12, poise: 55 },
    mods: [mod('chaosRes', 'flat', 0.5), mod('damage', 'increased', 0.15)],
    skills: ['sporefall', 'spore_burst', 'root_grasp', 'war_cry'], xp: 80, faction: 'fungal',
    gemBias: ['chaos', 'spell'], wardPriority: 2,
    detection: 1.3, brain: { type: 'commander' },
  },
  // --- The Bloom's SPORE side, deepened (still clouds, still drifting) ------
  spore_drifter: {
    id: 'spore_drifter', name: 'Spore Drifter',
    color: '#aec86a', shape: 'oval', radius: 12, material: 'verdant', look: 'spore_drifter',
    base: { life: 30, moveSpeed: 70, evasion: 70, mana: 120, manaRegen: 9 },
    mods: [mod('chaosRes', 'flat', 0.5)],
    skills: ['toxic_cloud', 'spore_burst'], xp: 18, faction: 'fungal',
    levitates: true, // a floater — never lost to a chasm edge
    deathBurst: { mode: 'implode', damageFrac: 0.8, coalesce: 0.7, damageType: 'chaos' },
    detection: 1.1, brain: { type: 'strafer' },
  },
  // The fruiting nest: mycelia's own spawners-objective destructible AND a
  // pack-table dweller — the sac spews the Bloom until broken.
  spore_sac: {
    id: 'spore_sac', name: 'Spore Sac',
    color: '#9ab86a', shape: 'oval', radius: 15, material: 'verdant', look: 'spore_sac',
    base: { life: 70, moveSpeed: 0, armor: 15, mana: 999, manaRegen: 50 },
    skills: ['spew_spores'], xp: 8, faction: 'fungal',
    spawner: true, noNemesis: true, drops: 0,
  },

  // --- THE CAVERN DWELLERS (unaffiliated — the dark keeps its own) ----------
  // The bat: a wing-scrap that dives, rakes, and wheels away.
  cave_bat: {
    id: 'cave_bat', name: 'Cave Bat',
    color: '#6a5a70', shape: 'triangle', radius: 8, material: 'fur', look: 'cave_bat',
    base: { life: 16, moveSpeed: 210, accuracy: 90, evasion: 75, mana: 15, manaRegen: 3 },
    skills: ['talon_rake', 'take_wing'], xp: 6,
    flier: true, levitates: true,
    detection: 1.4,
    brain: {
      type: 'skirmish', withdraw: 1.2,
      rules: [
        { when: { lifeAbove: 0.5, distUnder: 380 }, every: [5, 8], hold: [0.2, 0.4],
          actions: [{ do: 'cast', skill: 'take_wing', at: 'behindTarget', force: true }] },
        { when: { lifeBelow: 0.5 }, every: [5, 8], hold: [2.5, 4],
          actions: [{ do: 'cast', skill: 'take_wing', at: 'awayFromTarget', force: true }],
          use: { move: { style: 'holdRange', hold: 380 } } },
      ],
    },
  },
  // The roost (ambient rookery): keeps loosing bats until the bowl breaks.
  // Rule-summoned bats carry the 'predator' tag — ambient, never an objective.
  bat_roost: {
    id: 'bat_roost', name: 'Bat Roost',
    color: '#584a5a', shape: 'oval', radius: 13, look: 'bat_roost',
    base: { life: 60, moveSpeed: 0, armor: 10, mana: 0 },
    skills: [], xp: 8, tag: 'predator',
    noNemesis: true, drops: 0,
    brain: {
      type: 'basic',
      rules: [{
        when: {}, every: [6, 9], hold: [0.1, 0.2],
        actions: [{ do: 'summon', monster: 'cave_bat', count: 2, ring: 50, lifespan: 30, tag: 'predator' }],
      }],
    },
  },
  // The grub: an armored larva — the young curl and flee, the old bite.
  rockgrub: {
    id: 'rockgrub', name: 'Rockgrub',
    color: '#9a9078', shape: 'oval', radius: 13, material: 'chitin', look: 'rockgrub',
    // THE SHELL/POISE DOCTRINE: a FULL exoskeleton serves the structural
    // role poise would — so the grub carries ZERO poise. Crack the shell
    // and everything staggers it; burst play opens it, sustain finishes.
    // (Full 'all' shells stay RARE by design — they read as walls.)
    base: { life: 90, moveSpeed: 80, accuracy: 95, armor: 45, poise: 0, mana: 0 },
    skills: ['claw'], xp: 14,
    scaleVariance: [0.85, 1.2], juvenileBelow: 0.95,
    juvenileBrain: { type: 'flee' },
    shellGuard: { side: 'all', max: 55, regenDelay: 5, regenRate: 10, color: '#c8c0a0' },
    scaling: { armor: { flatPerLevel: 1.2 } },
    detection: 0.8, brain: { type: 'basic' },
  },
  // The clutch: the cavern's own spawners-objective destructible.
  grub_clutch: {
    id: 'grub_clutch', name: 'Grub Clutch',
    color: '#b0a880', shape: 'oval', radius: 14, look: 'grub_clutch',
    base: { life: 80, moveSpeed: 0, armor: 20, mana: 999, manaRegen: 50 },
    skills: ['spew_grubs'], xp: 10,
    spawner: true, noNemesis: true, drops: 0,
  },
  // The lurker: furniture until it isn't. Anchored, all-around senses, and
  // the ground knots wherever it stares.
  stalagmite_lurker: {
    id: 'stalagmite_lurker', name: 'Stalagmite Lurker',
    color: '#8a8276', shape: 'octagon', radius: 16, material: 'stone', look: 'stalagmite_lurker',
    base: { life: 120, moveSpeed: 0, accuracy: 110, armor: 50, mana: 120, manaRegen: 8 },
    skills: ['root_grasp', 'venom_bolt'], xp: 26,
    vision: { arcDeg: 360, rearMul: 1 }, // a rock has no back
    detection: 0.9, brain: { type: 'basic' },
  },
  // The fisher: sidles the dark ring of your torchlight, commits when your
  // eyes leave it — the lurk kernel wearing a lure.
  gloom_fisher: {
    id: 'gloom_fisher', name: 'Gloom Fisher',
    color: '#4a5a66', shape: 'kite', radius: 14, look: 'gloom_fisher',
    base: { life: 75, moveSpeed: 160, accuracy: 115, evasion: 60, mana: 20, manaRegen: 3, insight: 40 },
    skills: ['talon_rake', 'claw'], xp: 28,
    detection: 1.5,
    brain: { type: 'assassin', withdraw: 0.9, move: { style: 'lurk', ring: 260, commitRange: 250, unseenArc: 1.6 } },
  },
  // The shrieker: the cave's alarm — a wail that fumbles your casts and
  // puts every dweller in earshot onto you.
  cavern_shrieker: {
    id: 'cavern_shrieker', name: 'Cavern Shrieker',
    color: '#c8a888', shape: 'kite', radius: 11, look: 'cavern_shrieker',
    base: { life: 40, moveSpeed: 175, accuracy: 90, evasion: 50, mana: 80, manaRegen: 7 },
    skills: ['keening_shriek', 'claw'], xp: 20,
    detection: 1.3,
    brain: { type: 'skirmish', withdraw: 1.6, perception: { alertShout: 520 } },
  },

  // --- THE TREANT LINE (faction 'sylvan' — wood burns: fire is the answer) --
  sylvan_sapling: {
    id: 'sylvan_sapling', name: 'Sapling',
    color: '#7fae4a', shape: 'pentagon', radius: 9, material: 'wood', look: 'sylvan_sapling',
    base: { life: 20, moveSpeed: 150, accuracy: 80, mana: 0 },
    mods: [mod('fireRes', 'flat', -0.2)],
    skills: ['claw'], xp: 7, faction: 'sylvan',
    scaleVariance: [0.75, 1.05],
    detection: 1.0, brain: { type: 'swarm' },
  },
  twig_snarl: {
    id: 'twig_snarl', name: 'Twig Snarl',
    color: '#96804a', shape: 'cross', radius: 11, material: 'wood', look: 'twig_snarl',
    base: { life: 35, moveSpeed: 185, accuracy: 100, evasion: 55, mana: 20, manaRegen: 3 },
    mods: [mod('fireRes', 'flat', -0.25)],
    skills: ['lash_roots'], xp: 15, faction: 'sylvan',
    detection: 1.2, brain: { type: 'flanker' },
  },
  treant_warden: {
    id: 'treant_warden', name: 'Treant Warden',
    color: '#6a8a3a', shape: 'octagon', radius: 19, material: 'wood', look: 'treant_warden',
    base: { life: 200, moveSpeed: 90, accuracy: 110, armor: 55, poise: 50, mana: 60, manaRegen: 5 },
    mods: [mod('fireRes', 'flat', -0.25), mod('coldRes', 'flat', 0.3)],
    skills: ['heavy_strike', 'root_grasp', 'splinter_volley'], xp: 40, faction: 'sylvan',
    scaling: { armor: { flatPerLevel: 2 } },
    detection: 1.0,
    // Wood remembers the axe: slow to notice a disturbance, near-impossible
    // to shake once you've cut it.
    aggro: { fixation: 0.6, fury: 1.8, waver: 0.4 },
    // Wood turns like wood: the warden's strikes wait for the trunk to bear.
    brain: { type: 'protector', behavior: { castArc: 0.55 } },
  },
  // The anchored knot: a grasping trap the grove grows across its floors.
  root_snarl: {
    id: 'root_snarl', name: 'Root Snarl',
    color: '#7a6a3a', shape: 'oval', radius: 15, material: 'wood', look: 'root_snarl',
    base: { life: 100, moveSpeed: 0, accuracy: 105, armor: 25, mana: 80, manaRegen: 7 },
    mods: [mod('fireRes', 'flat', -0.25)],
    skills: ['lash_roots', 'root_grasp'], xp: 22, faction: 'sylvan',
    vision: { arcDeg: 360, rearMul: 1 },
    detection: 0.9, brain: { type: 'basic' },
  },
  // The elder: a walking grove with BREAKING BOUGHS (composite parts — sunder
  // the arms and the trunk stands open).
  elder_treant: {
    id: 'elder_treant', name: 'Elder Treant',
    color: '#5a7a34', shape: 'octagon', radius: 24, material: 'wood', look: 'elder_treant',
    base: { life: 500, moveSpeed: 45, accuracy: 115, armor: 60, poise: 80, mana: 80, manaRegen: 6, poiseDR: 0.4 },
    mods: [mod('fireRes', 'flat', -0.3), mod('coldRes', 'flat', 0.3)],
    skills: ['ground_slam', 'root_grasp'], xp: 150, faction: 'sylvan',
    turnSpeed: 2.2,
    scaling: { life: { incPerLevel: 0.08 } },
    detection: 1.0,
    // A tree turns like a tree: casts hold until the trunk bears (castArc),
    // so circling its pivot starves it of swings — mind the boughs.
    brain: { type: 'juggernaut', enrage: 0.35, behavior: { castArc: 0.5 } },
    parts: [
      {
        monster: 'treant_bough', dx: 0.8, dy: 1.25, lifeFrac: 0.35, breakDamage: 0.12,
        breakMods: [mod('damageTaken', 'increased', 0.1)],
      },
      {
        monster: 'treant_bough', dx: 0.8, dy: -1.25, lifeFrac: 0.35, breakDamage: 0.12,
        breakMods: [mod('damageTaken', 'increased', 0.1)],
      },
    ],
  },
  treant_bough: {
    id: 'treant_bough', name: 'Elder Bough',
    color: '#6a8a3a', shape: 'oval', radius: 13, material: 'wood', look: 'treant_bough',
    noNemesis: true,
    base: { life: 150, moveSpeed: 0, accuracy: 105, poise: 40, mana: 60, manaRegen: 5 },
    skills: ['lash_roots', 'splinter_volley'],
    xp: 0,
  },

  // --- THE BEASTKIN (faction 'beastkin' — the Horned Tribes of the crags) ---
  beastkin_gorer: {
    id: 'beastkin_gorer', name: 'Beastkin Gorer',
    color: '#b07a4a', shape: 'hexagon', radius: 14, material: 'fur', look: 'beastkin_gorer',
    base: { life: 85, moveSpeed: 170, accuracy: 105, armor: 20, mana: 25, manaRegen: 4, poise: 35 },
    skills: ['heavy_strike'], xp: 24, faction: 'beastkin', adorn: 'horns',
    detection: 1.2,
    // War-camp posture: beastkin packs idle in SIEGE — pickets out, any
    // watchtower crewed by their shooters before the fight finds them.
    brain: {
      type: 'juggernaut', enrage: 0.5,
      move: { style: 'charge', commitRange: 320, chargeSpeed: 2.4 },
      squad: { idle: { style: 'siege' } },
    },
  },
  beastkin_impaler: {
    id: 'beastkin_impaler', name: 'Beastkin Impaler',
    color: '#c89a5a', shape: 'triangle', radius: 12, material: 'fur', look: 'beastkin_impaler',
    base: { life: 60, moveSpeed: 155, accuracy: 110, evasion: 55, mana: 0, insight: 35 },
    skills: ['bone_arrow'], xp: 26, faction: 'beastkin', adorn: 'horns',
    // Half the impalers hunt with hooked lines — their arrows ROOT (the
    // barbed_snare support, worn the way the player wears it).
    grants: [{ atLevel: 12, support: 'barbed_snare', on: 'bone_arrow', chance: 0.5 }],
    detection: 1.2,
    brain: { type: 'skirmish', withdraw: 1.8, squad: { idle: { style: 'siege' } } },
  },
  beastkin_ritualist: {
    id: 'beastkin_ritualist', name: 'Beastkin Ritualist',
    color: '#d8b06a', shape: 'octagon', radius: 12, material: 'cloth', look: 'beastkin_ritualist',
    base: { life: 55, moveSpeed: 120, mana: 150, manaRegen: 10 },
    mods: [mod('fireRes', 'flat', 0.3)],
    // Low Ceiling: the tribes drop weather on archers — a hostile use of
    // the same conjure seam the player's Cloudherd rides (enemy-side
    // smother; the counterplay is stepping out from under their murk).
    skills: ['firebolt', 'despair', 'war_cry', 'low_ceiling'], xp: 30, faction: 'beastkin', adorn: 'horns',
    gemBias: ['spell', 'fire'], wardPriority: 1,
    detection: 1.2,
    brain: { type: 'artillery', squad: { idle: { style: 'siege' } } },
  },
  beastkin_flayer: {
    id: 'beastkin_flayer', name: 'Beastkin Flayer',
    color: '#a8683a', shape: 'kite', radius: 12, material: 'fur', look: 'beastkin_flayer',
    base: { life: 70, moveSpeed: 185, accuracy: 115, evasion: 70, mana: 25, manaRegen: 4 },
    skills: ['gore_rend', 'claw'], xp: 28, faction: 'beastkin', adorn: 'horns',
    detection: 1.3,
    brain: { type: 'assassin', withdraw: 0.9, squad: { idle: { style: 'siege' } } },
  },
  // The khan: the great rack — WARLORD_OF.beastkin.
  beastlord_khan: {
    id: 'beastlord_khan', name: 'the Beastlord Khan',
    color: '#c8823a', shape: 'star', radius: 19, material: 'fur', look: 'beastlord_khan',
    base: { life: 260, moveSpeed: 140, accuracy: 120, armor: 40, mana: 120, manaRegen: 8, poise: 60 },
    mods: [mod('damage', 'increased', 0.2)],
    skills: ['rallying_howl', 'gore_rend', 'war_cry'], xp: 90, faction: 'beastkin', adorn: 'horns',
    grants: [{ atLevel: 40, skill: 'ground_slam' }],
    detection: 1.4,
    brain: {
      type: 'commander', perception: { alertShout: 480 },
      squad: { idle: { style: 'siege' } }, // the khan anchors his war-camp
    },
  },
  /** The tribes' horn on the high roads (the Mountain Country's caster tell):
   *  it WAKES THE SLOPE — a summon note that stands the scree up, a litany
   *  that drums the muster's blood, and an alert shout that turns a quiet
   *  traverse loud. The great curled WARHORN across the body is the whole
   *  silhouette; kill the horn first — the mountain listens to it. */
  beastkin_horncaller: {
    id: 'beastkin_horncaller', name: 'Beastkin Horncaller',
    color: '#c09858', shape: 'octagon', radius: 12, material: 'fur', look: 'beastkin_horncaller',
    base: { life: 60, moveSpeed: 125, accuracy: 100, mana: 140, manaRegen: 9 },
    skills: ['wake_the_scree', 'war_cry'], xp: 32, faction: 'beastkin', adorn: 'horns',
    gemBias: ['summon', 'physical'], wardPriority: 1,
    detection: 1.3,
    presence: { from: 6, fadeIn: 3 },
    brain: {
      type: 'caster', perception: { alertShout: 520 },
      rules: [{
        // The muster litany (the spore_caller idiom, in brass): nearby kin
        // fight to the horn's cadence. distUnder keeps it on-screen.
        when: { alliesWithin: { count: 2, radius: 300 }, distUnder: 700 }, every: [12, 19], hold: [0.3, 0.5],
        announce: 'the horn drums the muster…',
        actions: [{ do: 'buff', buff: { type: 'buff', id: 'horn_muster', duration: 6, mods: [mod('moveSpeed', 'increased', 0.15), mod('damage', 'increased', 0.12)] } }],
      }],
    },
  },

  // --- THE MOUNTAIN'S OWN (wild fauna of the highland country) --------------
  /** The sky of the pass: broad-winged carrion riders wheeling one thermal as
   *  a flock (the murmuration lever), stooping one at a time onto the painted
   *  ring (the leap telegraph). WINGS FIRST at any distance; the grounded
   *  recovery beat is the window — the chitin wing's doctrine, feathered. */
  crag_condor: {
    id: 'crag_condor', name: 'Crag Condor',
    color: '#8a7460', shape: 'circle', radius: 11, material: 'fur', look: 'crag_condor',
    base: { life: 60, moveSpeed: 190, accuracy: 105, evasion: 60, mana: 0 },
    skills: ['claw'], xp: 22,
    faction: 'wild',
    detection: 1.3,
    temper: 'territorial',
    scaleVariance: [0.9, 1.15],
    packSize: [3, 5],
    brain: {
      type: 'swarm',
      squad: { onLeaderDeath: 'scatter' },
      script: wingCycle({
        dive: 'condor_stoop', aloftFor: 7, stoopFor: 1.8, groundFor: 3.8, stoopWithin: 420,
        air: {
          move: { style: 'orbit', ring: 230, pace: 1.0, flipEvery: [3, 5], flipChance: 0.25 },
          behavior: { flock: { kin: 'def', radius: 240, cohesion: 1.0, alignment: 1.15, separation: 1.05, weave: 2.4, erratic: 0.8 } },
        },
        ground: {
          move: { style: 'skitter', dart: [0.3, 0.5], pause: [0.25, 0.45] },
        },
      }),
    },
  },
  /** The rolling stone that isn't: a shelled hillside grazer that CURLS and
   *  BOWLS — the mass fabric is its whole kit (heft × the committed charge:
   *  arrest-vs-plow, wall wounds, and a gorge-lip shove pays the pitfall
   *  lane). Dome and studs read 'boulder' at a glance — the chutes already
   *  taught you what boulders do; this one turns around. */
  boulderback: {
    id: 'boulderback', name: 'Boulderback',
    color: '#7a7264', shape: 'hexagon', radius: 19, material: 'chitin', look: 'boulderback',
    base: { life: 170, moveSpeed: 92, accuracy: 100, armor: 50, poise: 45, evasion: 0, mana: 25, manaRegen: 3 },
    mods: [
      mod('lightningRes', 'flat', 0.3), mod('coldRes', 'flat', -0.2),
      mod('knockback', 'flat', 260, ['melee']),
    ],
    skills: ['heavy_strike'], xp: 44,
    faction: 'wild',
    turnSpeed: 2.4, temper: 'territorial',
    brain: { type: 'juggernaut', enrage: 0.45, move: { style: 'charge', commitRange: 520, chargeSpeed: 3.1 } },
    heft: 1.6,
  },

  // --- THE GLUT (faction 'flesh' — meat that wants more meat) ---------------
  lesser_ooze: {
    id: 'lesser_ooze', name: 'Lesser Ooze',
    color: '#a85a4a', shape: 'oval', radius: 9, material: 'slime', look: 'lesser_ooze',
    base: { life: 25, moveSpeed: 120, accuracy: 80, mana: 0 },
    mods: [mod('chaosRes', 'flat', 0.4)],
    skills: ['claw'], xp: 5, faction: 'flesh',
    detection: 1.0, brain: { type: 'swarm' },
  },
  // The parent slick: kill it and it DIVIDES — the death rattle births two
  // lesser oozes where it fell (the D2 mauler bargain: burst now, pay twice).
  viscous_ooze: {
    id: 'viscous_ooze', name: 'Viscous Ooze',
    color: '#b8604a', shape: 'oval', radius: 16, material: 'slime', look: 'viscous_ooze',
    base: { life: 110, moveSpeed: 95, accuracy: 95, mana: 60, manaRegen: 5 },
    mods: [mod('chaosRes', 'flat', 0.5)],
    skills: ['bile_spray', 'claw'], xp: 30, faction: 'flesh',
    detection: 1.0,
    brain: {
      type: 'juggernaut',
      onDeath: [{ do: 'summon', monster: 'lesser_ooze', count: 2, ring: 28 }],
    },
  },
  // GALVANIC OOZE — the VOLATILE showcase: a storm-fattened slick that
  // ANSWERS blows with a spark bolt (hit-driven, ICD-throttled — the poked
  // wasp nest) and DIVIDES when it falls (the viscous bargain, via the
  // death rattle). Wide dice ride its mods: even the answers can jackpot.
  galvanic_ooze: {
    id: 'galvanic_ooze', name: 'Galvanic Ooze',
    color: '#b8e05a', shape: 'oval', radius: 16, material: 'slime', look: 'viscous_ooze',
    base: { life: 150, moveSpeed: 90, accuracy: 100, mana: 70, manaRegen: 6 },
    mods: [mod('lightningRes', 'flat', 0.75), mod('chaosRes', 'flat', 0.3), mod('damageSpread', 'flat', 0.5)],
    skills: ['spark_bolt'], xp: 34, faction: 'flesh',
    volatile: { skillId: 'spark_bolt', chance: 0.4, icd: 1.2 },
    scaleVariance: [0.9, 1.2], scaleStats: true,
    gemBias: ['lightning'],
    detection: 1.0,
    brain: {
      type: 'juggernaut',
      onDeath: [{ do: 'summon', monster: 'galvanic_globule', count: 2, ring: 30 }],
    },
  },
  // The division: small, fast, still crackling — a weaker answer on a
  // slower clock, and the wide dice ride along.
  galvanic_globule: {
    id: 'galvanic_globule', name: 'Galvanic Globule',
    color: '#c8e86a', shape: 'oval', radius: 9, material: 'slime', look: 'lesser_ooze',
    base: { life: 30, moveSpeed: 125, accuracy: 85, mana: 30, manaRegen: 4 },
    mods: [mod('lightningRes', 'flat', 0.75), mod('damageSpread', 'flat', 0.5)],
    skills: ['claw'], xp: 6, faction: 'flesh',
    volatile: { skillId: 'spark_bolt', chance: 0.25, icd: 1.6, dmgMult: 0.7 },
    detection: 1.0, brain: { type: 'swarm' },
  },
  gutspray_hurler: {
    id: 'gutspray_hurler', name: 'Gutspray Hurler',
    color: '#c87a5a', shape: 'octagon', radius: 14, material: 'slime', look: 'gutspray_hurler',
    base: { life: 65, moveSpeed: 115, mana: 120, manaRegen: 8 },
    mods: [mod('chaosRes', 'flat', 0.4)],
    skills: ['gut_hurl', 'bile_spray'], xp: 32, faction: 'flesh',
    gemBias: ['chaos', 'projectile'],
    detection: 1.2, brain: { type: 'artillery' },
  },
  flesh_amalgam: {
    id: 'flesh_amalgam', name: 'Flesh Amalgam',
    color: '#b0524a', shape: 'octagon', radius: 21, look: 'flesh_amalgam',
    base: { life: 300, moveSpeed: 90, accuracy: 110, armor: 25, poise: 60, mana: 40, manaRegen: 5 },
    mods: [mod('chaosRes', 'flat', 0.4)],
    skills: ['gore_rend', 'ground_slam'], xp: 70, faction: 'flesh',
    turnSpeed: 3.0,
    scaling: { life: { incPerLevel: 0.06 }, lifeRegen: { flatPerLevel: 0.6 } },
    deathBurst: { mode: 'implode', damageFrac: 1.0, coalesce: 0.8, damageType: 'chaos' },
    detection: 1.1, brain: { type: 'juggernaut', enrage: 0.4 },
  },
  // The anchored wall: a corridor of meat you must burst to pass.
  membrane: {
    id: 'membrane', name: 'Membrane',
    color: '#c88a7a', shape: 'oval', radius: 18, material: 'slime', look: 'membrane',
    base: { life: 220, moveSpeed: 0, accuracy: 95, armor: 10, mana: 80, manaRegen: 7 },
    mods: [mod('chaosRes', 'flat', 0.6)],
    skills: ['bile_spray'], xp: 18, faction: 'flesh',
    vision: { arcDeg: 360, rearMul: 1 },
    detection: 0.8, brain: { type: 'basic' },
  },
  // The flower of meat: the flesh biome's own spawners-objective destructible.
  corpse_bloom: {
    id: 'corpse_bloom', name: 'Corpse Bloom',
    color: '#d86a5a', shape: 'oval', radius: 15, material: 'slime', look: 'corpse_bloom',
    base: { life: 90, moveSpeed: 0, armor: 10, mana: 999, manaRegen: 50 },
    skills: ['spew_flesh'], xp: 12, faction: 'flesh',
    spawner: true, noNemesis: true, drops: 0,
  },

  // THE FLESH COUNTRY's face kin (still the Glut — the country's one hunger
  // wearing three moods). Sanguine: things that live IN the blood. Gutworks:
  // things the tract grew to keep itself moving. Ocular: the parts that
  // watch. Each face's packs season these over the shared Glut base.
  // The leech that lunges: fast, thin, and every wound it gives comes home.
  hemophage: {
    id: 'hemophage', name: 'Hemophage',
    color: '#c04050', shape: 'oval', radius: 12, material: 'slime', look: 'hemophage',
    base: { life: 55, moveSpeed: 135, accuracy: 105, mana: 0 },
    mods: [mod('chaosRes', 'flat', 0.3), mod('lifeLeech', 'flat', 0.25)],
    skills: ['claw'], xp: 26, faction: 'flesh',
    detection: 1.5, // it smells blood, same as the mite
    brain: { type: 'swarm' },
  },
  // The walking clot: slow, dense, and it goes off WET when it finally stops.
  clot_shambler: {
    id: 'clot_shambler', name: 'Clot Shambler',
    color: '#5a1220', shape: 'octagon', radius: 17, material: 'slime', look: 'clot_shambler',
    base: { life: 240, moveSpeed: 55, accuracy: 100, armor: 30, poise: 45, mana: 0 },
    mods: [mod('chaosRes', 'flat', 0.4), mod('damageTaken', 'more', -0.2)], // the soak: blows sink IN (deep_horror's lever — physRes was a dead stat)
    skills: ['claw'], xp: 40, faction: 'flesh',
    deathBurst: { mode: 'implode', damageFrac: 0.55, coalesce: 0.6, damageType: 'physical' },
    detection: 0.9, brain: { type: 'juggernaut' },
  },
  // The vessel's own answer: a blanched cell that rides the sanguine
  // bore's crest (FrontSpec.riders — position slaved to the crest, kit its
  // own) and spears what the blood carries past — the artery cleaning
  // itself. Dropped by the dispersing wave, it patrols the gallery until
  // the next pump. High detection: it exists to notice what doesn't belong.
  pale_corpuscle: {
    id: 'pale_corpuscle', name: 'Pale Corpuscle',
    color: '#e8d8dc', shape: 'oval', radius: 13, material: 'slime', look: 'pale_corpuscle',
    base: { life: 95, moveSpeed: 110, accuracy: 108, armor: 12, poise: 35, mana: 0 },
    mods: [mod('chaosRes', 'flat', 0.35)],
    skills: ['claw'], xp: 32, faction: 'flesh',
    detection: 1.4,
    brain: { type: 'basic' },
  },
  // The tract's own tenant: a worm that knows every bend (the sandmaw's
  // spec, gone soft and sour).
  tract_worm: {
    id: 'tract_worm', name: 'Tract Worm',
    color: '#a86a5a', shape: 'oval', radius: 15, material: 'slime', look: 'tract_worm',
    base: { life: 160, moveSpeed: 120, accuracy: 105, armor: 15, mana: 60, manaRegen: 6 },
    mods: [mod('chaosRes', 'flat', 0.4)],
    skills: ['claw', 'emetic_lob'], xp: 44, faction: 'flesh',
    worm: { length: 5, spacing: 0.6 },
    ambush: { radius: 140 },
    detection: 1.1, brain: { type: 'basic' },
  },
  // The gut's artillery: it keeps its distance and shares its lunch.
  bile_retcher: {
    id: 'bile_retcher', name: 'Bile Retcher',
    color: '#9aa84a', shape: 'octagon', radius: 14, material: 'slime', look: 'bile_retcher',
    base: { life: 70, moveSpeed: 105, mana: 130, manaRegen: 9 },
    mods: [mod('chaosRes', 'flat', 0.5)],
    skills: ['emetic_lob', 'bile_spray'], xp: 34, faction: 'flesh',
    gemBias: ['chaos', 'projectile'],
    detection: 1.2, brain: { type: 'artillery' },
  },
  // The door's keeper: a clenched fist of the wall that stays BY its post
  // (duty-post fabric) — the sphincter opens easier than the warden does.
  pyloric_warden: {
    id: 'pyloric_warden', name: 'Pyloric Warden',
    color: '#8a3a34', shape: 'octagon', radius: 22, look: 'pyloric_warden',
    base: { life: 380, moveSpeed: 80, accuracy: 112, armor: 40, poise: 80, mana: 40, manaRegen: 5 },
    mods: [mod('chaosRes', 'flat', 0.4)],
    skills: ['ground_slam', 'gore_rend'], xp: 85, faction: 'flesh',
    turnSpeed: 2.6, post: true,
    scaling: { life: { incPerLevel: 0.05 } },
    detection: 1.0, brain: { type: 'juggernaut', enrage: 0.5 },
  },
  // The stare with a body: it hangs back and makes being SEEN cost you.
  lidless_watcher: {
    id: 'lidless_watcher', name: 'Lidless Watcher',
    color: '#d8b04a', shape: 'oval', radius: 13, look: 'lidless_watcher',
    base: { life: 90, moveSpeed: 70, accuracy: 120, evasion: 30, mana: 140, manaRegen: 10 },
    mods: [mod('chaosRes', 'flat', 0.3)],
    skills: ['gaze_beam'], xp: 34, faction: 'flesh',
    vision: { arcDeg: 360, rearMul: 1 }, detection: 1.6,
    gemBias: ['chaos', 'duration'],
    brain: { type: 'artillery' },
  },
  // The orb that grieves: drifting, streaming, and its sorrow settles on
  // whoever stands close enough to share it.
  weeping_orb: {
    id: 'weeping_orb', name: 'Weeping Orb',
    color: '#cfe6ea', shape: 'oval', radius: 12, look: 'weeping_orb',
    base: { life: 70, moveSpeed: 60, accuracy: 100, mana: 120, manaRegen: 9 },
    mods: [mod('chaosRes', 'flat', 0.3)],
    skills: ['tear_burst'], xp: 28, faction: 'flesh',
    vision: { arcDeg: 360, rearMul: 1 },
    detection: 1.2, brain: { type: 'artillery' },
  },
  // The shepherd of stalks: it calls the country's small hungers to heel
  // (the bloom's slough, walking) and weeps when pressed.
  stalk_shepherd: {
    id: 'stalk_shepherd', name: 'Stalk Shepherd',
    color: '#b87868', shape: 'oval', radius: 15, look: 'stalk_shepherd',
    base: { life: 110, moveSpeed: 85, accuracy: 105, mana: 160, manaRegen: 11 },
    mods: [mod('chaosRes', 'flat', 0.4)],
    skills: ['spew_flesh', 'tear_burst'], xp: 46, faction: 'flesh',
    gemBias: ['chaos', 'minion'],
    detection: 1.2, brain: { type: 'artillery' },
  },

  // --- THE CAULBORN (faction 'caulborn' — the Caul's cold biomechanics) -----
  // NOT the Glut. The Glut is hunger; the Caulborn are PURPOSE — an invading
  // organism remaking hell inside its own membrane, black chitin over pale
  // meat, everything joined by the same nerve. The family doctrine: the
  // TERRAIN is the roster (rooted lashers, reeling maws, pods that walk),
  // and the creep fabric is their ground game — hearts skin the floor, the
  // skin feeds the kin (caulfed), and killing the heart takes the ground
  // back. Ambushes throughout: the Caul's dread is that you never know
  // which piece of the decor is a piece of the animal.
  // The mite tier: hatched by sacs and mothers, a skittering carpet. Thin
  // alone, dire on caulflesh (the skin's regen keeps the carpet standing).
  caul_tick: {
    id: 'caul_tick', name: 'Caul Tick',
    color: '#4a3858', shape: 'oval', radius: 8, material: 'chitin', look: 'caul_tick',
    base: { life: 26, moveSpeed: 180, accuracy: 92, evasion: 40, mana: 0 },
    mods: [mod('chaosRes', 'flat', 0.3)],
    skills: ['claw'], xp: 6, faction: 'caulborn', tags: ['beast'],
    presence: { to: 20, fadeOut: 9 },
    detection: 1.1,
    brain: { type: 'swarm', move: { style: 'skitter', dart: [0.2, 0.4], pause: [0.06, 0.16] } },
  },
  // The pod that walks: it reads as another sac until it doesn't. Creeps at
  // a crawl, erupts into mites when it dies close enough to matter — kill
  // it at range or inherit its brood at your boots.
  amnion_creeper: {
    id: 'amnion_creeper', name: 'Amnion Creeper',
    color: '#5a4468', shape: 'oval', radius: 12, material: 'flesh', look: 'amnion_creeper',
    base: { life: 85, moveSpeed: 34, accuracy: 96, armor: 15, poise: 25, mana: 0 },
    mods: [mod('chaosRes', 'flat', 0.4)],
    skills: ['claw'], xp: 18, faction: 'caulborn',
    ambush: { radius: 130, announce: 'one of the pods is walking…' },
    detection: 0.9,
    brain: {
      type: 'swarm',
      onDeath: [{ do: 'summon', monster: 'caul_tick', count: 2, ring: 26, announce: 'the pod splits!' }],
    },
  },
  // The rooted appendage: the biome's thesis monster — terrain that fights.
  // moveSpeed 0 + 360° vision + a long honest wind-up; the fight is spacing,
  // and the floor's decor keeps the question "which knot is live?" open.
  caul_lasher: {
    id: 'caul_lasher', name: 'Caul Lasher',
    color: '#3a2c48', shape: 'oval', radius: 14, material: 'chitin', look: 'caul_lasher',
    base: { life: 140, moveSpeed: 0, accuracy: 108, armor: 25, poise: 60, mana: 30, manaRegen: 3 },
    mods: [mod('chaosRes', 'flat', 0.5), mod('damageTaken', 'more', -0.15)],
    skills: ['caul_lash'], xp: 30, faction: 'caulborn',
    ambush: { radius: 150, announce: 'the ground unknots…' },
    turnSpeed: 3.2,
    vision: { arcDeg: 360, rearMul: 1 },
    detection: 1.1, brain: { type: 'basic' },
  },
  // The reeling maw: tongue out, dinner in. An anchor by build (heavy poise
  // = heavy effectiveWeight — it drags you, you don't drag it) whose pull is
  // also melee's free ride to the kill: the void angler's bargain, on ground
  // any build can stand on.
  vor_maw: {
    id: 'vor_maw', name: 'Vor Maw',
    color: '#6a3a50', shape: 'oval', radius: 20, material: 'flesh', look: 'vor_maw',
    base: { life: 260, moveSpeed: 0, accuracy: 110, armor: 30, poise: 95, mana: 90, manaRegen: 7, poiseDR: 0.45 },
    mods: [mod('chaosRes', 'flat', 0.4), mod('coldRes', 'flat', 0.2)],
    skills: ['tongue_reel', 'devouring_maw'], xp: 52, faction: 'caulborn',
    presence: { from: 10, fadeIn: 4 },
    ambush: { radius: 210, announce: 'the floor is salivating…' },
    turnSpeed: 2.6,
    vision: { arcDeg: 360, rearMul: 1 },
    detection: 1.2, brain: { type: 'basic' },
  },
  // The nerve-priest: the mobile tier — it keeps its distance, jangles the
  // floor's own nerves under your boots (ensnare), and spits venom while
  // the rooted kin do the arithmetic.
  nerve_weaver: {
    id: 'nerve_weaver', name: 'Nerve Weaver',
    color: '#7a5a9a', shape: 'triangle', radius: 12, material: 'void', look: 'nerve_weaver',
    base: { life: 95, moveSpeed: 92, accuracy: 106, poise: 30, mana: 160, manaRegen: 10 },
    mods: [mod('chaosRes', 'flat', 0.5)],
    skills: ['nerve_pulse', 'venom_bolt'], xp: 40, faction: 'caulborn',
    presence: { from: 8, fadeIn: 4 },
    detection: 1.1, brain: { type: 'skirmish', withdraw: 1.05 },
  },
  // The walking clutch: she lays where she stands, seeds her own skin, and
  // her brood fights better on it (caulfed) — the creep fabric worn as a
  // monster verb. Kill her and the ground itself gives the fight back.
  chrysalid_broodmother: {
    id: 'chrysalid_broodmother', name: 'Chrysalid Broodmother',
    color: '#5a3a64', shape: 'cross', radius: 18, material: 'flesh', look: 'chrysalid_broodmother',
    base: { life: 240, moveSpeed: 58, accuracy: 100, armor: 25, poise: 70, mana: 60, manaRegen: 5 },
    mods: [mod('chaosRes', 'flat', 0.5)],
    skills: ['claw'], xp: 64, faction: 'caulborn',
    presence: { from: 12, fadeIn: 5 },
    creepSource: { kind: 'caulflesh', reach: [90, 140], bornFrac: 0.2 },
    detection: 1.0,
    brain: {
      type: 'basic',
      rules: [{
        when: { distUnder: 520 }, every: [7, 11], hold: [0.2, 0.35],
        actions: [{ do: 'summon', monster: 'caul_tick', count: 2, ring: 40, lifespan: 30, announce: 'the clutch hatches!' }],
      }],
      onDeath: [{ do: 'summon', monster: 'amnion_creeper', count: 2, ring: 34 }],
    },
  },
  // THE HEART: the pocket's anchor — the membrane underfoot is ITS skin
  // (creepSource born half-grown, still claiming floor as you arrive). It
  // never chases; it resents (volatile nerve-jangle when struck) — and its
  // death is the pocket's death: the skin recoils, the mired boots come
  // free, the caulfed kin lose their table. Clearing the Caul means
  // stopping hearts, and the fabric makes that legible without one line of
  // objective code.
  caul_heart: {
    id: 'caul_heart', name: 'Caul Heart',
    color: '#8a5a9a', shape: 'oval', radius: 19, material: 'flesh', look: 'caul_heart',
    base: { life: 420, moveSpeed: 0, armor: 35, poise: 999, mana: 200, manaRegen: 12 },
    mods: [mod('chaosRes', 'flat', 0.6), mod('fireRes', 'flat', -0.15)],
    skills: [], xp: 90, faction: 'caulborn',
    presence: { from: 9, fadeIn: 4 },
    creepSource: { kind: 'caulflesh', reach: [150, 220], bornFrac: 0.5 },
    volatile: { skillId: 'nerve_pulse', chance: 0.35, icd: 2.2 },
    vision: { arcDeg: 360, rearMul: 1 },
    turnSpeed: 4,
    drops: 2,
    detection: 0.8, brain: { type: 'basic' },
  },
  // The Caul's spawners-objective destructible: a straining clutch of sacs
  // that keeps venting mites until burst (the corpse_bloom contract, in the
  // invader's key).
  birthing_pod: {
    id: 'birthing_pod', name: 'Birthing Pod',
    color: '#6a4a78', shape: 'oval', radius: 15, material: 'flesh', look: 'birthing_pod',
    base: { life: 95, moveSpeed: 0, armor: 15, mana: 0 },
    skills: [], xp: 12, faction: 'caulborn',
    spawner: true, noNemesis: true, drops: 0,
    brain: {
      type: 'basic',
      rules: [{
        when: {}, every: [6, 9], hold: [0.1, 0.2],
        actions: [{ do: 'summon', monster: 'caul_tick', count: 2, ring: 40, lifespan: 25 }],
      }],
    },
  },

  // --- THE ROOKERIES & NEW FAUNA (faction 'beast', the ambient layer) -------
  // The bloodwing: the D2 blood hawk itself — wheels, dives, rakes, and is
  // gone. Hunts the meadow's own critters when you're not worth the stoop.
  bloodwing: {
    id: 'bloodwing', name: 'Bloodwing',
    color: '#b04a3a', shape: 'triangle', radius: 10, material: 'fur', look: 'bloodwing',
    base: { life: 30, moveSpeed: 200, accuracy: 105, evasion: 70, mana: 15, manaRegen: 3 },
    skills: ['talon_rake', 'take_wing'], xp: 12,
    tag: 'predator', faction: 'beast', tags: ['beast'],
    flier: true, levitates: true,
    detection: 1.5,
    brain: {
      type: 'skirmish', withdraw: 1.3,
      target: { prey: ['critter'] },
      rules: [
        { when: { lifeAbove: 0.5, distUnder: 400 }, every: [6, 9], hold: [0.2, 0.4],
          actions: [{ do: 'cast', skill: 'take_wing', at: 'behindTarget', force: true }] },
        { when: { lifeBelow: 0.5 }, every: [6, 9], hold: [3, 4.5],
          actions: [{ do: 'cast', skill: 'take_wing', at: 'awayFromTarget', force: true }],
          use: { move: { style: 'holdRange', hold: 400 } } },
      ],
    },
  },
  // The nest: while it stands, the sky keeps arriving one hawk at a time.
  bloodwing_nest: {
    id: 'bloodwing_nest', name: 'Bloodwing Nest',
    color: '#8a6a4a', shape: 'oval', radius: 12, look: 'bloodwing_nest',
    base: { life: 50, moveSpeed: 0, armor: 5, mana: 0 },
    skills: [], xp: 8, tag: 'predator', faction: 'beast', tags: ['beast'],
    noNemesis: true, drops: 0,
    brain: {
      type: 'basic',
      rules: [{
        when: {}, every: [7, 11], hold: [0.1, 0.2],
        actions: [{ do: 'summon', monster: 'bloodwing', count: 1, ring: 40, lifespan: 40, tag: 'predator' }],
      }],
    },
  },
  // A fat marsh toad: prey with a hop instead of a plan.
  marsh_toad: {
    id: 'marsh_toad', name: 'Marsh Toad',
    color: '#7a8a4a', shape: 'oval', radius: 8, material: 'slime', look: 'marsh_toad',
    base: { life: 12, moveSpeed: 130, evasion: 60, mana: 0 },
    mods: [mod('detectability', 'more', -0.5)],
    skills: [], xp: 2, tag: 'critter', faction: 'beast', tags: ['beast'],
    detection: 0.15, drops: 0,
    scaleVariance: [0.8, 1.2],
    brain: {
      type: 'basic',
      morale: { skittish: { radius: 130, duration: [1.2, 2.0] } },
      move: { style: 'juke', hookEvery: [0.4, 0.8], hookArc: 1.1, freezeChance: 0.3, freeze: [0.3, 0.6] },
      tempo: { kite: 2.6, windedFor: [1.0, 1.6] },
    },
  },
  // The bog heron: stilt-legged fisher of toads — the marsh's own drama.
  bog_heron: {
    id: 'bog_heron', name: 'Bog Heron',
    color: '#9aa8b0', shape: 'kite', radius: 11, look: 'bog_heron',
    base: { life: 26, moveSpeed: 160, accuracy: 110, evasion: 55, mana: 0 },
    skills: ['claw'], xp: 8, tag: 'predator', faction: 'beast', tags: ['beast'],
    detection: 1.5,
    brain: { type: 'skirmish', withdraw: 1.4, target: { prey: ['critter'] } },
  },
  // A glow moth: the cavern's drifting lantern — texture, not threat.
  glow_moth: {
    id: 'glow_moth', name: 'Glow Moth',
    color: '#b8e8c8', shape: 'diamond', radius: 6, material: 'ethereal', look: 'glow_moth',
    base: { life: 6, moveSpeed: 140, evasion: 85, mana: 0 },
    mods: [mod('detectability', 'more', -0.6)],
    skills: [], xp: 1, tag: 'critter', faction: 'beast', tags: ['beast'],
    flier: true, levitates: true,
    detection: 0.1, drops: 0,
    brain: {
      type: 'basic',
      morale: { skittish: { radius: 120, duration: [1.0, 1.8] } },
      move: { style: 'juke', hookEvery: [0.25, 0.5], hookArc: 1.4, freezeChance: 0.1, freeze: [0.15, 0.3] },
    },
  },
  // The taiga elk: a herd animal with the aurochs' bargain — calves bolt,
  // a roused bull charges.
  taiga_elk: {
    id: 'taiga_elk', name: 'Taiga Elk',
    color: '#8a7452', shape: 'hexagon', radius: 14, material: 'fur', look: 'taiga_elk',
    base: { life: 60, moveSpeed: 190, accuracy: 95, mana: 25, manaRegen: 4 },
    skills: ['heavy_strike'], xp: 10, tag: 'critter', faction: 'beast', tags: ['beast'],
    detection: 0.6, drops: 0,
    scaleVariance: [0.78, 1.35], scaleStats: true, juvenileBelow: 0.92,
    juvenileBrain: { type: 'flee' },
    brain: { type: 'juggernaut', move: { style: 'charge', commitRange: 300, chargeSpeed: 2.2 } },
  },
  // The shore crab: a walking pebble — slow, shelled, unbothered.
  shore_crab: {
    id: 'shore_crab', name: 'Shore Crab',
    color: '#c87a5a', shape: 'oval', radius: 9, material: 'chitin', look: 'shore_crab',
    base: { life: 20, moveSpeed: 90, accuracy: 85, armor: 40, mana: 0 },
    skills: ['claw'], xp: 4, tag: 'critter', faction: 'beast', tags: ['beast'],
    detection: 0.5, drops: 0,
    scaleVariance: [0.8, 1.25],
    brain: { type: 'basic' },
  },

  // ==========================================================================
  // THE MENAGERIE ROUND — apparitions (barely-bodies that fade and flicker),
  // the Night Court (vampires, weres, and the wolves that answer them), the
  // vermin (chitin, eggs that HATCH-IF-IGNORED via pod constructs), and the
  // small lives (ambience with survival instincts — the refuge seam's home).
  // ==========================================================================

  // --- THE APPARITIONS (undead; ethereal, evasive, briefly elsewhere) -------
  // A drifting lantern-mote: harmless grave-light that bolts when crowded.
  will_o_wisp: {
    id: 'will_o_wisp', name: "Will o' Wisp",
    color: '#b8e8c8', shape: 'diamond', radius: 6, material: 'ethereal', look: 'will_o_wisp',
    base: { life: 8, moveSpeed: 150, evasion: 90, mana: 0 },
    skills: [], xp: 2, tag: 'critter', faction: 'beast', tags: ['beast'],
    detection: 0.1, drops: 0,
    brain: {
      type: 'basic',
      morale: { skittish: { radius: 140, duration: [1.2, 2.0] } },
      move: { style: 'juke', hookEvery: [0.3, 0.6], hookArc: 1.3, freezeChance: 0.15, freeze: [0.2, 0.4] },
    },
  },
  // A scrap of dark with eyes — the gloam's lesser kin, swarming and fading.
  // THE CONFUSION KIN (the widdershin court): tutors for the control lanes.
  // Everything they do to you, the droppable arts do BACK (witching_bell /
  // scatterhex / turnwise_hex) — status.ts invertMove/scrambleChance read
  // the STATUS, never the seat, so a hexed monster's feet walk contrary to
  // its own brain and its casts fire the wrong button, exactly like yours.
  // Spiral eyes (looks.ts) are the at-a-glance promise on both.
  mazer_moth: {
    id: 'mazer_moth', name: 'Mazer Moth',
    color: '#9ad8d0', shape: 'triangle', radius: 9, material: 'chitin', look: 'mazer_moth',
    base: { life: 16, moveSpeed: 195, accuracy: 80, evasion: 55, mana: 30, manaRegen: 3 },
    skills: ['scatterhex', 'talon_rake'], xp: 9,
    faction: 'occult',
    flier: true, levitates: true,
    // Dust in threes and fives: one moth is a curiosity, a flight is a
    // cooldown massacre — the pack IS the threat budget.
    packSize: [3, 5],
    aggro: { fixation: 1.4, fury: 0.5, waver: 1.5 },
    brain: { type: 'swarm' },
  },
  widdershin_wisp: {
    id: 'widdershin_wisp', name: 'Widdershin Wisp',
    color: '#5ecec0', shape: 'circle', radius: 8, material: 'ethereal', look: 'widdershin_wisp',
    base: { life: 20, moveSpeed: 150, accuracy: 90, evasion: 45, mana: 45, manaRegen: 5 },
    skills: ['witching_bell', 'turnwise_hex'], xp: 12,
    faction: 'occult',
    flier: true, levitates: true,
    // Spirit texture: a couple of honest swats, not a life pool.
    plies: { count: 2 },
    brain: { type: 'caster' },
  },

  gloomling: {
    id: 'gloomling', name: 'Gloomling',
    color: '#5a6a7a', shape: 'pentagon', radius: 9, material: 'ethereal', look: 'gloomling',
    base: { life: 18, moveSpeed: 175, evasion: 70, mana: 40, manaRegen: 5 },
    mods: [mod('chaosRes', 'flat', 0.4)],
    skills: ['claw'], xp: 8, faction: 'undead',
    detection: 1.1,
    brain: {
      type: 'swarm',
      rules: [{
        when: {}, every: [4, 7], hold: [0.1, 0.2],
        actions: [
          { do: 'buff', buff: { type: 'buff', id: 'gloom_fade', duration: 0.9, mods: [mod('invisible', 'flat', 1)] } },
          { do: 'teleport', to: 'nearTarget', range: 300 },
        ],
      }],
    },
  },
  // The poltergeist: no body — a knot of orbiting debris that THROWS things
  // and is never where the last stone came from.
  poltergeist: {
    id: 'poltergeist', name: 'Poltergeist',
    color: '#8a9ac8', shape: 'star', radius: 11, material: 'ethereal', look: 'poltergeist',
    base: { life: 45, moveSpeed: 140, evasion: 85, mana: 140, manaRegen: 11 },
    mods: [mod('chaosRes', 'flat', 0.4), mod('lightningRes', 'flat', 0.3)],
    skills: ['hurl_debris'], xp: 26, faction: 'undead',
    gemBias: ['physical', 'spell'],
    detection: 1.2,
    brain: {
      type: 'strafer',
      rules: [{
        when: { distUnder: 220 }, every: [3, 5], hold: [0.1, 0.2],
        actions: [
          { do: 'buff', buff: { type: 'buff', id: 'gloom_fade', duration: 1.0, mods: [mod('invisible', 'flat', 1)] } },
          { do: 'teleport', to: 'awayFromTarget', range: 360 },
        ],
      }],
    },
  },
  // The banshee: the keening made flesh — casts fumble, arms weaken, and
  // the wail carries her court's despair.
  banshee: {
    id: 'banshee', name: 'Banshee',
    color: '#c8b8e8', shape: 'star', radius: 13, material: 'ethereal', look: 'banshee',
    base: { life: 60, moveSpeed: 130, evasion: 60, mana: 160, manaRegen: 11 },
    mods: [mod('chaosRes', 'flat', 0.5), mod('coldRes', 'flat', 0.3)],
    skills: ['keening_shriek', 'despair'], xp: 36, faction: 'undead',
    gemBias: ['spell', 'curse'], wardPriority: 1,
    detection: 1.3, brain: { type: 'artillery' },
  },
  // The barrow-wight: the corporeal apparition — old bone in grave-cloth
  // that hits like the door of a tomb.
  barrow_wight: {
    id: 'barrow_wight', name: 'Barrow Wight',
    color: '#9aa8b8', shape: 'hexagon', radius: 15, material: 'bone', look: 'barrow_wight',
    base: { life: 130, moveSpeed: 110, accuracy: 110, armor: 40, mana: 40, manaRegen: 4, poise: 45 },
    mods: [mod('coldRes', 'flat', 0.5), mod('chaosRes', 'flat', 0.3)],
    skills: ['heavy_strike', 'rearguard_aegis'], xp: 32, faction: 'undead',
    grants: [{ atLevel: 18, support: 'multistrike', on: 'heavy_strike', chance: 0.5 }],
    detection: 0.9, brain: { type: 'juggernaut', enrage: 0.4 },
  },

  // --- THE NIGHT COURT (faction 'nightkin': the fed and their kept) ---------
  vampire_thrall: {
    id: 'vampire_thrall', name: 'Vampire Thrall',
    color: '#c8a8a8', shape: 'pentagon', radius: 12, look: 'vampire_thrall',
    base: { life: 60, moveSpeed: 170, accuracy: 110, evasion: 55, mana: 60, manaRegen: 6 },
    mods: [mod('chaosRes', 'flat', 0.3)],
    skills: ['claw', 'essence_drain'], xp: 22, faction: 'nightkin',
    detection: 1.2, brain: { type: 'flanker' },
  },
  // The countess: drains from the second rank, whistles up her bats, and
  // curses whatever her court cannot immediately eat. WARLORD_OF.nightkin.
  vampire_countess: {
    id: 'vampire_countess', name: 'Vampire Countess',
    color: '#b83a5a', shape: 'star', radius: 15, material: 'cloth', look: 'vampire_countess',
    base: { life: 170, moveSpeed: 135, accuracy: 120, evasion: 50, mana: 200, manaRegen: 12, energyShield: 80 },
    mods: [mod('chaosRes', 'flat', 0.4), mod('damage', 'increased', 0.15)],
    skills: ['essence_drain', 'summon_bats', 'despair'], xp: 70, faction: 'nightkin',
    // Warlord discipline (the balor floor): a throne-tier body carries a
    // def-level HARD gate — no fadeIn — so no table, envelope or bias can
    // ever field the Countess on a shallow road. Explicit spawns (her
    // warlord seat, the Long Night's court) ignore presence by design.
    presence: { from: 14 },
    gemBias: ['chaos', 'minion'], wardPriority: 2,
    detection: 1.3, brain: { type: 'commander' },
  },
  // The werewolf: the wolf family's horror cousin — a locked charge, tearing
  // wounds, and more of it the harder it bleeds.
  werewolf: {
    id: 'werewolf', name: 'Werewolf',
    color: '#8a6a4a', shape: 'hexagon', radius: 15, material: 'fur', look: 'werewolf',
    base: { life: 140, moveSpeed: 185, accuracy: 115, evasion: 45, armor: 30, mana: 30, manaRegen: 4 },
    mods: [mod('lifeRegen', 'flat', 2)], // the curse knits — it heals as it hunts
    skills: ['gore_rend', 'claw'], xp: 44, faction: 'nightkin',
    grants: [{ atLevel: 22, support: 'multistrike', on: 'claw', chance: 0.6 }],
    detection: 1.5,
    brain: { type: 'juggernaut', enrage: 0.6, move: { style: 'charge', commitRange: 340, chargeSpeed: 2.5 } },
  },
  crimson_bat: {
    id: 'crimson_bat', name: 'Crimson Bat',
    color: '#b04a5a', shape: 'triangle', radius: 9, material: 'fur', look: 'crimson_bat',
    base: { life: 22, moveSpeed: 215, accuracy: 95, evasion: 80, mana: 15, manaRegen: 3 },
    skills: ['talon_rake', 'take_wing'], xp: 9, faction: 'nightkin',
    flier: true, levitates: true,
    detection: 1.4,
    brain: {
      type: 'skirmish', withdraw: 1.2,
      rules: [
        { when: { lifeAbove: 0.5, distUnder: 380 }, every: [5, 8], hold: [0.2, 0.4],
          actions: [{ do: 'cast', skill: 'take_wing', at: 'behindTarget', force: true }] },
      ],
    },
  },

  // The FED-ON: the Court keeps its meals walking — bled pale, collared,
  // shackled at the wrist, and still fond of its keepers. They flock, they
  // cling, and every wound they give comes home to the vein (lifeLeech):
  // put them down fast or watch the drink add up. Fodder with a straw.
  feeding_thrall: {
    id: 'feeding_thrall', name: 'Feeding Thrall',
    color: '#cfb8b0', shape: 'circle', radius: 11, look: 'feeding_thrall',
    base: { life: 30, moveSpeed: 125, accuracy: 85, mana: 0 },
    mods: [mod('lifeLeech', 'flat', 0.2)],
    skills: ['claw'], xp: 6, faction: 'nightkin',
    detection: 0.8, // drained dull — it notices late, then all at once
    temper: 'skittish',
    brain: {
      type: 'swarm',
      perception: { arcDeg: 120, rearMul: 0.25, attentionSpan: [5, 8] },
      behavior: { reaction: [0.4, 0.9] },
    },
  },
  // The Court's KNIFE: it hunts from the murk — a veil of gloom, a step you
  // never saw, one opened vein. The dark itself is its armor (nocturne:
  // evasion and pace worn dusk-to-night); catch the Court's knives by DAY
  // and they are just pale things in sashes. Evasion-pole skirmisher —
  // accuracy investment and AoE punish it; raw armor-stacking never will.
  night_hunter: {
    id: 'night_hunter', name: 'Night Hunter',
    color: '#7a5a6a', shape: 'pentagon', radius: 12, material: 'cloth', look: 'night_hunter',
    base: { life: 75, moveSpeed: 175, accuracy: 125, evasion: 85, mana: 45, manaRegen: 5 },
    mods: [mod('chaosRes', 'flat', 0.3)],
    nocturne: { phases: ['dusk', 'night'], mods: [mod('evasion', 'more', 0.6), mod('moveSpeed', 'increased', 0.15)] },
    skills: ['gore_rend', 'claw'], xp: 30, faction: 'nightkin',
    gemBias: ['attack', 'physical'],
    detection: 1.5,
    brain: {
      type: 'flanker',
      rules: [{
        when: { distUnder: 240 }, every: [4, 7], hold: [0.1, 0.2],
        actions: [
          { do: 'buff', buff: { type: 'buff', id: 'gloom_fade', duration: 1.0, mods: [mod('invisible', 'flat', 1)] } },
          { do: 'teleport', to: 'behindTarget', range: 300 },
        ],
      }],
    },
  },
  // The Court's CHURCH: a red vicar that tithes the living — throats of
  // hunger (sanguine_leech) torn out of whoever stands closest and drunk
  // home as blood, and the drink is SHARED: what the cardinal takes, the
  // Court around it is fed (sympathy 'courts_tithe'). It wears its stolen
  // blood as armor — a slick shield over a paper body (ES-glass pole):
  // burst it between sips, or every sip you allow it waters the flock.
  blood_cardinal: {
    id: 'blood_cardinal', name: 'Blood Cardinal',
    color: '#a82a3a', shape: 'star', radius: 13, material: 'cloth', look: 'blood_cardinal',
    base: { life: 55, energyShield: 140, moveSpeed: 115, mana: 180, manaRegen: 12 },
    mods: [mod('chaosRes', 'flat', 0.4)],
    sympathy: ['courts_tithe'],
    skills: ['sanguine_leech', 'despair'], xp: 48, faction: 'nightkin',
    gemBias: ['chaos', 'duration'], wardPriority: 1,
    detection: 1.2,
    brain: { type: 'artillery' },
  },
  // THE GLOOM COACH: the Court travels — a windowless black carriage on
  // man-high wheels, drawn by nothing anyone has seen, lamps burning a
  // light that arrives cold. At night it ROLLS (a charge that does not
  // slow for you) and its door keeps opening (disgorge_thralls); the gloom
  // itself holds its boards together (nocturne damage-ward + pace). By day
  // it stands parked wherever its rounds paused — creaking, armored, and
  // finally BURNABLE: day is when you break the Court's carriage. Def-level
  // HARD presence floor (from 12, the balor discipline): no coach ever
  // rolls a shallow road, whatever table names it.
  gloom_coach: {
    id: 'gloom_coach', name: 'Gloom Coach',
    color: '#241a20', shape: 'hexagon', radius: 19, material: 'wood', look: 'gloom_coach',
    base: { life: 420, moveSpeed: 46, accuracy: 115, armor: 55, poise: 70, mana: 40, manaRegen: 5 },
    mods: [mod('chaosRes', 'flat', 0.3), mod('coldRes', 'flat', 0.3)],
    nocturne: { phases: ['dusk', 'night'], mods: [
      mod('damageTaken', 'more', -0.55),
      mod('moveSpeed', 'increased', 2.2),
    ] },
    skills: ['heavy_strike', 'disgorge_thralls'], xp: 90, faction: 'nightkin',
    presence: { from: 12 },
    tags: ['construct'],
    post: true, // its parked stand IS its station (SENTRY fabric: a displaced coach walks back)
    aims: false, noNemesis: true, wardPriority: 2,
    turnSpeed: 2.6, // a carriage corners like a carriage
    detection: 1.0,
    brain: {
      type: 'juggernaut',
      move: { style: 'charge', commitRange: 380, chargeSpeed: 2.4 },
    },
  },
  // The PALLBEARER: the Court's daylight. When the masters sleep, these
  // burdened wardens stand the parked hours — a coffin roped to the back,
  // a maul in both hands — and NOON is their vigil's height (nocturne worn
  // dawn-to-day: the same fabric as the hunter's dark, opposite pole).
  // Poise-pole bruiser: zero evasion, zero tricks; you go THROUGH the
  // break-bar, and by preference you go through it after dusk.
  pallbearer: {
    id: 'pallbearer', name: 'Pallbearer',
    color: '#4a4048', shape: 'octagon', radius: 15, material: 'cloth', look: 'pallbearer',
    base: { life: 200, moveSpeed: 95, accuracy: 110, armor: 45, poise: 60, mana: 30, manaRegen: 4 },
    mods: [mod('chaosRes', 'flat', 0.3)],
    nocturne: { phases: ['dawn', 'day'], mods: [mod('damageTaken', 'more', -0.18), mod('armor', 'increased', 0.6)] },
    skills: ['heavy_strike'], xp: 38, faction: 'nightkin',
    grants: [{ atLevel: 20, support: 'multistrike', on: 'heavy_strike', chance: 0.5 }],
    detection: 0.9,
    brain: { type: 'juggernaut', enrage: 0.5 },
  },

  // --- THE GLOAMBORN (the dark's own — packages/defs/gloaming.ts) -----------
  // Context faction 'gloamborn' (contexts:['gloaming']): these bodies exist
  // ONLY where the front stands, injected by the overlay. No warlord, no
  // nation, no names (noNemesis) — the dark is not a court, it is a tide.
  // Four silhouettes, four defense textures, one glance each; and the light
  // itself is the counterplay: motes and keepers DRINK the wells (wellDrain),
  // so defending your lamp is the fight the front keeps starting.

  // The SNUFFWICK: a drifting knot of dark motes with a violet fringe — it
  // gathers on lamplight and DRINKS it (wellDrain: the pool visibly dims
  // while they crowd it). Swarm fodder with a straw; fire answers it best
  // (the family's straw pole: burnt dark is just dark gone).
  snuffwick: {
    id: 'snuffwick', name: 'Snuffwick',
    color: '#3a3048', shape: 'circle', radius: 8, material: 'ethereal', look: 'snuffwick',
    base: { life: 18, moveSpeed: 165, accuracy: 90, evasion: 45, mana: 0 },
    mods: [mod('chaosRes', 'flat', 0.3), mod('fireRes', 'flat', -0.25)],
    skills: ['claw'], xp: 5, faction: 'gloamborn',
    levitates: true, noNemesis: true,
    wellDrain: 1.4, // its whole verb: park on a light and drink it dim
    detection: 0.9,
    brain: {
      type: 'swarm',
      move: { style: 'juke', hookEvery: [0.5, 0.9], hookArc: 0.9 },
    },
  },
  // The MURK PROWLER: the thing that hunts where sight is short — a low,
  // lean silhouette of ears and claws that stalks SHROUDED (the assassin
  // brain: the strike reveals, the withdrawal re-cloaks). Gloom-veiled prey
  // can barely see; the prowler was never impaired (the dark's kin are
  // exempt from the veil). Evasion pole: accuracy and AoE answer it.
  murk_prowler: {
    id: 'murk_prowler', name: 'Murk Prowler',
    color: '#4a4258', shape: 'pentagon', radius: 12, material: 'fur', look: 'murk_prowler',
    base: { life: 70, moveSpeed: 180, accuracy: 120, evasion: 95, mana: 20, manaRegen: 3 },
    mods: [mod('chaosRes', 'flat', 0.3), mod('fireRes', 'flat', -0.15)],
    skills: ['claw', 'gore_rend'], xp: 28, faction: 'gloamborn',
    gemBias: ['attack', 'physical'],
    noNemesis: true,
    detection: 1.3,
    brain: { type: 'assassin' },
  },
  // The WICK KEEPER: a robed thief wearing a STOLEN light — the lantern it
  // carries burns a cold violet that never warms anyone, and sips any well
  // it lingers near (a lesser straw). ES-glass artillery: it drains and
  // despairs from the second rank behind a slick of borrowed shine — burst
  // the shield between sips or it simply keeps drinking.
  wick_keeper: {
    id: 'wick_keeper', name: 'Wick Keeper',
    color: '#5a4a78', shape: 'star', radius: 12, material: 'cloth', look: 'wick_keeper',
    base: { life: 45, energyShield: 120, moveSpeed: 110, mana: 160, manaRegen: 11 },
    mods: [mod('chaosRes', 'flat', 0.4)],
    skills: ['essence_drain', 'despair'], xp: 40, faction: 'gloamborn',
    gemBias: ['chaos', 'duration'], wardPriority: 1,
    noNemesis: true,
    wellDrain: 0.8,
    detection: 1.2,
    brain: { type: 'artillery' },
  },
  // The HOLLOW SHEPHERD: the tide's tall warden — a shrouded pillar under a
  // crook whose lantern is DEAD (the one dark lamp in a fabric of lit ones:
  // the silhouette IS the tell). It walks the front's ground slow and
  // implacable and hits like a closing door. Poise wall: zero evasion, zero
  // tricks — you go through the break-bar.
  hollow_shepherd: {
    id: 'hollow_shepherd', name: 'Hollow Shepherd',
    color: '#2e2838', shape: 'octagon', radius: 16, material: 'cloth', look: 'hollow_shepherd',
    base: { life: 260, moveSpeed: 85, accuracy: 110, armor: 40, poise: 75, mana: 30, manaRegen: 4 },
    mods: [mod('chaosRes', 'flat', 0.4), mod('fireRes', 'flat', -0.1)],
    skills: ['heavy_strike'], xp: 60, faction: 'gloamborn',
    noNemesis: true,
    detection: 0.85, // slow to notice; does not stop noticing
    brain: { type: 'juggernaut', enrage: 0.4 },
  },

  // --- THE GLOAMWOOD (the haunted wood's own: carrion, crones, lanterns,
  //     and the rider whose sentence never ended) ----------------------------
  // The carrion crow: the wood's eyes — a mobbing swarm that harries and
  // scatters. Kill the watchers or be watched.
  carrion_crow: {
    id: 'carrion_crow', name: 'Carrion Crow',
    color: '#2a2d34', shape: 'triangle', radius: 8, material: 'fur', look: 'carrion_crow',
    base: { life: 16, moveSpeed: 210, accuracy: 100, evasion: 85, mana: 10, manaRegen: 2 },
    skills: ['talon_rake'], xp: 6, faction: 'wild', tags: ['beast'],
    flier: true, levitates: true,
    detection: 1.6, // the watchers see FAR — the wood knows you came in
    // A carrion crow EATS carrion (the Verminfall ecology pass): it strips
    // the field's corpses — racing every raise-skill for the same larder.
    carrion: { radius: 400, rate: 0.08, time: 2 },
    brain: {
      type: 'swarm',
      morale: { skittish: { radius: 90, duration: [0.6, 1.2] } },
      move: { style: 'juke', hookEvery: [0.4, 0.8], hookArc: 1.1 },
    },
  },
  // The grave hag: the wood's crone — she curses from the second rank,
  // wakes the buried, and drinks whatever despairs. MISTFED in her own
  // grave-mist: pull her out of the murk or share it veiled.
  grave_hag: {
    id: 'grave_hag', name: 'Grave Hag',
    color: '#8a9a7a', shape: 'star', radius: 13, material: 'cloth', look: 'grave_hag',
    base: { life: 75, moveSpeed: 120, evasion: 40, mana: 180, manaRegen: 12, energyShield: 50 },
    mods: [mod('chaosRes', 'flat', 0.4), mod('coldRes', 'flat', 0.3)],
    skills: ['raise_dead', 'despair', 'essence_drain'], xp: 34, faction: 'undead',
    gemBias: ['curse', 'minion'], wardPriority: 1,
    detection: 1.1, brain: { type: 'commander' },
  },
  // The hollow lantern: a carved grin that floats where the fog goes — it
  // RIDES the banks (x_seek_fog, data/fog.ts) and burns brighter fed by
  // them (mistfed). The lure: follow the light, find the court.
  hollow_lantern: {
    id: 'hollow_lantern', name: 'Hollow Lantern',
    color: '#d8722a', shape: 'pentagon', radius: 10, material: 'ethereal', look: 'hollow_lantern',
    base: { life: 40, moveSpeed: 145, evasion: 75, mana: 120, manaRegen: 9 },
    mods: [mod('fireRes', 'flat', 0.5), mod('chaosRes', 'flat', 0.3)],
    skills: ['firebolt'], xp: 20, faction: 'undead',
    levitates: true,
    detection: 1.2,
    brain: {
      type: 'strafer',
      // Between volleys it slips toward the nearest living fog bank — the
      // registered x_seek_fog beat (a short gloaming blink, never a march).
      rules: [{ when: {}, every: [5, 9], hold: [0.1, 0.2], actions: [{ do: 'x_seek_fog' }] }],
    },
  },
  // The dusk rider: the sentence that never ended — a headless drape at a
  // gallop. Locked charges, a scythe the width of the road, and it does not
  // stop where you were. The Gloamwood's elite.
  dusk_rider: {
    id: 'dusk_rider', name: 'Dusk Rider',
    color: '#3a3444', shape: 'hexagon', radius: 16, material: 'cloth', look: 'dusk_rider',
    base: { life: 200, moveSpeed: 200, accuracy: 120, evasion: 40, armor: 45, mana: 60, manaRegen: 5 },
    mods: [mod('chaosRes', 'flat', 0.4), mod('coldRes', 'flat', 0.3)],
    skills: ['gore_rend', 'heavy_strike'], xp: 60, faction: 'undead',
    grants: [{ atLevel: 20, support: 'multistrike', on: 'heavy_strike', chance: 0.5 }],
    detection: 1.3, wardPriority: 2,
    brain: { type: 'juggernaut', enrage: 0.5, move: { style: 'charge', commitRange: 420, chargeSpeed: 2.8 } },
  },

  // --- THE CARVEN COURT (the harvest that no one gathered) -------------------
  // The Hallowfield's own: things somebody CARVED — or that carved
  // themselves — walking the feral crofts at the Gloamwood's rim. A core
  // faction with a real grudge ledger: the Court hates the Night Court
  // (the fields resent the estate that let them go wild) and the plain
  // dead alike, so the country brawls three ways where the faces meet.
  // Textures per the enemy-feel doctrine: rind-shell lurker, evasion straw,
  // ES-glass sower, poise wicker — and straw burns (family fireRes runs
  // NEGATIVE where straw is the body; feeding them fire is the counterlever).

  // The gourdling: seed-fruit on runner legs. Individually a joke; a patch
  // of them is a bevy of small bad news that POPS.
  gourdling: {
    id: 'gourdling', name: 'Gourdling',
    color: '#c8681e', shape: 'circle', radius: 7, material: 'wood', look: 'gourdling',
    base: { life: 20, moveSpeed: 165, evasion: 40, mana: 16, manaRegen: 3 },
    skills: ['claw'], xp: 5, faction: 'carven', tags: ['plant'],
    scaleVariance: [0.8, 1.2],
    detection: 0.9,
    // Stamped rind, wet seeds: the pop is the point.
    deathBurst: { mode: 'implode', damageFrac: 0.35, radius: 50, coalesce: 0.4, damageType: 'physical' },
    brain: {
      type: 'swarm',
      move: { style: 'juke', hookEvery: [0.5, 0.9], hookArc: 0.9 },
    },
  },
  // The patch lurker: the user-facing promise kept — a pumpkin that was
  // NEVER a pumpkin. It spawns ON a patch (habitat), sits as scenery
  // (ambush) until you wade in picking, then the rind opens around a knot
  // of pale tentacles. Crack the FRONT rind (a thin shell, not poise), then
  // the meat is soft.
  patch_lurker: {
    id: 'patch_lurker', name: 'Patch Lurker',
    color: '#b85e1c', shape: 'circle', radius: 12, material: 'wood', look: 'patch_lurker',
    base: { life: 95, moveSpeed: 105, accuracy: 105, mana: 40, manaRegen: 4 },
    mods: [mod('chaosRes', 'flat', 0.25)],
    skills: ['lash_roots', 'claw'], xp: 26, faction: 'carven', tags: ['plant'],
    shellGuard: { side: 'front', max: 70, arcDeg: 160, regenDelay: 5 },
    habitat: { kind: 'pumpkin_patch', minRadius: 10, grace: 36 },
    ambush: { radius: 110, announce: 'the patch was never asleep!' },
    vision: { arcDeg: 360 }, // it has no face until it opens
    detection: 1.0,
    brain: { type: 'juggernaut' },
  },
  // The scarecrow watcher: the cross in the field that turns its head when
  // you have already walked past it. Straw takes no clean hit (evasion is
  // the pole) and holds no line — but straw BURNS, and it knows it.
  // Post-planted: after the fight it walks back to its cross and waits.
  scarecrow_watcher: {
    id: 'scarecrow_watcher', name: 'Scarecrow Watcher',
    color: '#8a7648', shape: 'triangle', radius: 12, material: 'wood', look: 'scarecrow_watcher',
    base: { life: 66, moveSpeed: 135, evasion: 115, mana: 60, manaRegen: 6 },
    mods: [mod('fireRes', 'flat', -0.35), mod('chaosRes', 'flat', 0.25)],
    skills: ['claw', 'summon_crows'], xp: 24, faction: 'carven', tags: ['plant'],
    ambush: { radius: 135, announce: 'the scarecrow turns its head—' },
    post: true,
    nocturne: { phases: ['dusk', 'night'], mods: [mod('evasion', 'increased', 0.35), mod('attackSpeed', 'more', 0.12)] },
    detection: 1.2,
    brain: {
      type: 'skirmish', withdraw: 1.05,
      behavior: { dodge: { chance: 0.45, reaction: [0.12, 0.3], exit: 'lateral' } },
    },
  },
  // The lantern sower: the one who CARVES. A robed shape drifting the rows,
  // lobbing lit gourds that burst in fire and dread — glass behind a wick
  // (energy shield over next to no meat).
  lantern_sower: {
    id: 'lantern_sower', name: 'Lantern Sower',
    color: '#d8722a', shape: 'pentagon', radius: 11, material: 'cloth', look: 'lantern_sower',
    base: { life: 30, energyShield: 100, moveSpeed: 120, mana: 160, manaRegen: 11 },
    mods: [mod('fireRes', 'flat', 0.4)],
    skills: ['gourd_toss'], xp: 30, faction: 'carven', tags: ['plant'],
    gemBias: ['fire', 'curse'],
    detection: 1.1,
    brain: { type: 'strafer' },
  },
  // The harvest effigy: the wicker patron woken — a bound-withy hulk that
  // walks through hits (poise is the whole body) on legs that turn like
  // haystacks. Wicker burns even better than straw.
  harvest_effigy: {
    id: 'harvest_effigy', name: 'Harvest Effigy',
    color: '#6a5636', shape: 'octagon', radius: 18, material: 'wood', look: 'harvest_effigy',
    base: { life: 280, moveSpeed: 78, accuracy: 115, armor: 25, poise: 85, mana: 30, manaRegen: 3 },
    mods: [mod('fireRes', 'flat', -0.25), mod('chaosRes', 'flat', 0.3)],
    skills: ['heavy_strike'], xp: 55, faction: 'carven', tags: ['plant'],
    turnSpeed: 3,
    presence: { from: 7, fadeIn: 3 },
    detection: 0.9,
    brain: { type: 'juggernaut', enrage: 0.5 },
  },
  // THE CARVEN KING: the harvest crowned — a robed regal scarecrow under a
  // calm-cut grin, walking the rows it never let anyone bring in. The
  // Court's warlord: wails the nerve out of you, lobs its own lit fruit,
  // and calls the patch up out of the ground when pressed.
  carven_king: {
    id: 'carven_king', name: 'the Carven King',
    color: '#e8832a', shape: 'star', radius: 16, material: 'wood', look: 'carven_king',
    base: { life: 640, moveSpeed: 110, accuracy: 125, armor: 45, poise: 70, evasion: 30, mana: 200, manaRegen: 14 },
    mods: [mod('fireRes', 'flat', -0.15), mod('chaosRes', 'flat', 0.4)],
    skills: ['harrowing_wail', 'gourd_toss', 'heavy_strike'], xp: 170, faction: 'carven', tags: ['plant'],
    nocturne: { phases: ['dusk', 'night'], mods: [mod('damageTaken', 'more', -0.12)] },
    presence: { from: 13, fadeIn: 5 },
    drops: 1, wardPriority: 2,
    detection: 1.2,
    brain: {
      type: 'commander', perception: { alertShout: 520 },
      // The warlord fight in three beats: the orchard RAINS (a telegraphed
      // ring of lit gourds), the harvest RISES (gourdling calls under
      // pressure), and at the end the King LIGHTS HIS OWN CROWN — the
      // berserk trade in straw: faster and harder, and burning already
      // (his fireRes runs negative; the bonfire makes the weakness a
      // spectacle instead of a footnote).
      rules: [
        { when: {}, every: [11, 15], hold: [0.4, 0.6],
          announce: 'The orchard answers him.',
          actions: [{ do: 'ring', skill: 'gourd_toss', radius: 170, count: 6, waves: 1, delay: 0.9, at: 'self' }] },
        { when: { lifeBelow: 0.6 }, every: [9, 13], hold: [0.3, 0.5],
          announce: 'The King calls the harvest up!',
          actions: [{ do: 'summon', monster: 'gourdling', count: 3, ring: 64 }] },
        { when: { lifeBelow: 0.35 }, every: [999, 999], hold: [0.4, 0.6],
          announce: 'The King lights his own crown—',
          actions: [{ do: 'buff', buff: { type: 'buff', id: 'kings_bonfire', duration: 999,
            mods: [
              mod('damage', 'more', 0.3),
              mod('attackSpeed', 'more', 0.2),
              mod('moveSpeed', 'more', 0.2),
              mod('damageTaken', 'more', 0.15),
            ] } }] },
      ],
    },
  },
  // The bound scarecrow: the player-taught answer (Summon Scarecrow) — a
  // straw sentinel wearing the watcher's silhouette, its blows carrying the
  // Harrowing by nature. A minion vessel: xp 0, no drops, courage optional.
  bound_scarecrow: {
    id: 'bound_scarecrow', name: 'Bound Scarecrow',
    color: '#9a8658', shape: 'triangle', radius: 12, material: 'wood', look: 'scarecrow_watcher',
    base: { life: 130, moveSpeed: 125, accuracy: 110, evasion: 60, mana: 20, manaRegen: 3 },
    mods: [mod('fireRes', 'flat', -0.25), mod('apply_harrowing', 'flat', 0.35)],
    skills: ['claw'], xp: 0, tags: ['plant', 'construct'],
    drops: 0,
  },

  // --- THE MANOR HAUNTS (the household that never gave notice) ---------------
  // The Mournstead estate's staff, still keeping the house: furniture that
  // billows, service that curdles, and the Lady at the top of the stairs.
  // All faction 'undead' — the apparition wing (poltergeist, banshee,
  // gloomling, barrow wight) already fields beside them in the manor packs.

  // The sheeted haunt: the classic — a dust sheet with nothing under it.
  // It spawns ON sheeted furniture (habitat) and waits (ambush) until you
  // cross the room. Glass-thin: a ghost is mostly ectoplasm (ES) and nerve.
  sheeted_haunt: {
    id: 'sheeted_haunt', name: 'Sheeted Haunt',
    color: '#b8b2a4', shape: 'circle', radius: 11, material: 'ethereal', look: 'sheeted_haunt',
    base: { life: 24, energyShield: 85, moveSpeed: 150, mana: 30, manaRegen: 4 },
    mods: [mod('coldRes', 'flat', 0.4), mod('chaosRes', 'flat', 0.4)],
    skills: ['claw'], xp: 22, faction: 'undead', tags: ['undead'],
    habitat: { kind: 'dust_sheet', minRadius: 8, grace: 44 },
    // Furniture-bound: never a clear-objective seat (the root_wraith rule —
    // a body confined to a blocking doodad must not hold the door shut).
    noObjective: true,
    ambush: { radius: 100, announce: 'the dust sheet BILLOWS—' },
    levitates: true,
    detection: 1.1,
    brain: {
      type: 'skirmish', withdraw: 1.1,
      behavior: { dodge: { chance: 0.5, reaction: [0.1, 0.25], exit: 'lateral' } },
    },
  },
  // The hollow butler: the service that never ended. It keeps the household
  // DRESSED — a litany of candle-courage on whatever haunts stand near —
  // and despairs at guests personally.
  hollow_butler: {
    id: 'hollow_butler', name: 'Hollow Butler',
    color: '#6a6a7a', shape: 'pentagon', radius: 12, material: 'cloth', look: 'hollow_butler',
    base: { life: 40, energyShield: 70, moveSpeed: 115, mana: 150, manaRegen: 10 },
    mods: [mod('chaosRes', 'flat', 0.4)],
    skills: ['despair'], xp: 28, faction: 'undead', tags: ['undead'],
    gemBias: ['curse'], wardPriority: 1,
    detection: 1.0,
    brain: {
      type: 'commander',
      rules: [
        { when: {}, every: [7, 11], hold: [0.2, 0.4],
          announce: 'the house is SERVED.',
          actions: [{ do: 'buff', buff: { type: 'buff', id: 'households_order', duration: 6,
            mods: [mod('damage', 'more', 0.2), mod('moveSpeed', 'more', 0.15)] } }] },
      ],
    },
  },
  // THE LADY OF THE HOUSE: the attic's tenant and the climb's answer — an
  // authored boss (the marquee lights by contract). She drifts through her
  // own walls (phasing), wails the nerve from your hands, throws the
  // household at you piece by piece, and wakes the sheets when pressed.
  lady_of_the_house: {
    id: 'lady_of_the_house', name: 'the Lady of the House',
    color: '#d8c8f0', shape: 'star', radius: 14, material: 'ethereal', look: 'lady_of_the_house',
    base: { life: 300, energyShield: 380, moveSpeed: 125, accuracy: 120, mana: 250, manaRegen: 16 },
    mods: [mod('coldRes', 'flat', 0.5), mod('chaosRes', 'flat', 0.5), mod('phasing', 'flat', 1)],
    skills: ['harrowing_wail', 'hurl_debris', 'despair'], xp: 240, faction: 'undead', tags: ['undead'],
    boss: true,
    tag: 'manor_lady', // the attic-finale kill row keys on this (killHandlers.ts)
    levitates: true,
    drops: 2, wardPriority: 2,
    detection: 1.2,
    brain: {
      type: 'commander', perception: { alertShout: 460 },
      rules: [
        { when: { lifeBelow: 0.65 }, every: [10, 14], hold: [0.3, 0.5],
          announce: 'The house wakes with her—',
          actions: [{ do: 'summon', monster: 'sheeted_haunt', count: 2, ring: 70 }] },
        { when: { distUnder: 120 }, every: [5, 8], hold: [0.1, 0.2],
          actions: [
            { do: 'buff', buff: { type: 'buff', id: 'gloam_fade', duration: 0.9, mods: [mod('invisible', 'flat', 1)] } },
            { do: 'teleport', to: 'awayFromTarget', range: 300 },
          ] },
      ],
    },
  },

  // --- THE VERMINFALL (rats, roaches, the warren-folk — the faction whose
  //     target is your HOME GROUND) ------------------------------------------
  // Two tiers, one family. The PREY tier (gutter rat, gutter roach) rides the
  // WILDLIFE rows and the towns' own fauna lists: 'critter'-tagged, so every
  // prey-hunting brain (wolves, vultures, shrikes) consumes them with zero new
  // code — the meadow's food web simply gains a bottom rung, and the town
  // gains movement in its gutters. The FIGHTING tier (warren rats, verminkin,
  // the nests, the King) is the 'vermin' faction the Verminfall package
  // fields: infestations claiming the town's near ring, and — because their
  // grudges are baseline RELATIONS — real war zones against the warband.

  // THE GUTTER RAT: the town's smallest tenant. Hare-pattern prey (skittish,
  // juking, tires) that squeezes away under the brush when truly pressed.
  gutter_rat: {
    id: 'gutter_rat', name: 'Gutter Rat',
    color: '#8a7f72', shape: 'oval', radius: 6, material: 'fur', look: 'rat',
    base: { life: 6, moveSpeed: 205, evasion: 70, mana: 0 },
    mods: [mod('detectability', 'more', -0.7)],
    skills: [],
    xp: 1,
    tag: 'critter',
    faction: 'vermin', tags: ['beast', 'vermin'],
    detection: 0.08,
    drops: 0,
    scaleVariance: [0.7, 1.1],
    refuge: { kind: 'brush', text: 'squeezes away under the brush!' },
    brain: {
      type: 'basic',
      morale: { skittish: { radius: 130, duration: [1.2, 2.2] } },
      perception: { arcDeg: 320, rearMul: 0.9 },
      move: { style: 'juke', hookEvery: [0.25, 0.6], hookArc: 1.3, freezeChance: 0.25, freeze: [0.15, 0.4] },
      tempo: { kite: 2.8, windedFor: [0.7, 1.2] },
    },
  },
  // THE GUTTER ROACH: what the rats leave, the roaches keep. Cellar-and-cavern
  // prey — near-blind, armored in the smallest way, gone the moment you move.
  gutter_roach: {
    id: 'gutter_roach', name: 'Gutter Roach',
    color: '#5e4a38', shape: 'oval', radius: 5, material: 'chitin', look: 'roach',
    base: { life: 4, moveSpeed: 185, evasion: 85, mana: 0 },
    mods: [mod('detectability', 'more', -0.75)],
    skills: [],
    xp: 1,
    tag: 'critter',
    faction: 'vermin', tags: ['beast', 'vermin'],
    detection: 0.06,
    drops: 0,
    scaleVariance: [0.65, 1.05],
    brain: {
      type: 'basic',
      morale: { skittish: { radius: 110, duration: [1.0, 1.8] } },
      perception: { arcDeg: 340, rearMul: 0.95 },
      move: { style: 'skitter' },
      tempo: { kite: 2.2, windedFor: [0.5, 0.9] },
    },
  },
  // THE WARREN RAT: the tide. Alone it is nothing; the warren never sends one.
  warren_rat: {
    id: 'warren_rat', name: 'Warren Rat',
    color: '#7a6a58', shape: 'oval', radius: 9, material: 'fur', look: 'rat',
    base: { life: 18, moveSpeed: 178, accuracy: 88, evasion: 45, mana: 0 },
    skills: ['claw'],
    xp: 5,
    faction: 'vermin', tags: ['beast', 'vermin'],
    detection: 1.1,
    temper: 'skittish',
    scaleVariance: [0.85, 1.2],
    brain: {
      type: 'swarm',
      squad: { muster: { count: 3, radius: 300, patience: 4 }, surround: true },
    },
  },
  // THE FESTER RAT: the warren's stomach — it EATS THE DEAD (carrion), racing
  // every corpse-raising art for the same bodies, and its bite leaves rot.
  fester_rat: {
    id: 'fester_rat', name: 'Fester Rat',
    color: '#8aa050', shape: 'oval', radius: 10, material: 'fur', look: 'rat',
    base: { life: 26, moveSpeed: 168, accuracy: 92, mana: 15, manaRegen: 3 },
    mods: [mod('chaosRes', 'flat', 0.4)],
    skills: ['festering_bite'],
    xp: 9,
    faction: 'vermin', tags: ['beast', 'vermin'],
    detection: 1.2,
    carrion: { radius: 380, rate: 0.08, time: 2 },
    presence: { from: 3, fadeIn: 2 },
    brain: {
      type: 'pack',
      squad: { muster: { count: 2, radius: 320, patience: 5 }, tokens: 2, surround: true },
    },
  },
  // THE VERMINKIN SKULKER: the warren's thinking tier — a hunched knife in
  // the hedgerow that flanks by instinct and dives the moment your hands
  // commit to a cast.
  verminkin_skulker: {
    id: 'verminkin_skulker', name: 'Verminkin Skulker',
    color: '#6e6252', shape: 'kite', radius: 11, material: 'fur', look: 'verminkin',
    base: { life: 36, moveSpeed: 182, accuracy: 96, evasion: 60, mana: 12, manaRegen: 2 },
    skills: ['claw'],
    xp: 15,
    faction: 'vermin', tags: ['vermin'],
    detection: 1.15,
    brain: {
      type: 'skirmish', withdraw: 1.1,
      move: { style: 'skitter', dart: [0.3, 0.5], pause: [0.1, 0.25] },
      behavior: { encircle: { front: 2 } },
      rules: [
        { when: { targetCasting: 0.35, distUnder: 360, chance: 0.5 },
          hold: [0.6, 1.0], cooldown: 3,
          use: { move: { style: 'direct', pace: 1.3 } } },
      ],
    },
  },
  // THE VERMINKIN BROODPRIEST: bile and blessings of the warren — he retches
  // the sheet that rots you and calls the tide up out of the ground.
  verminkin_broodpriest: {
    id: 'verminkin_broodpriest', name: 'Verminkin Broodpriest',
    color: '#7a8a4a', shape: 'star', radius: 12, material: 'cloth', look: 'broodpriest',
    base: { life: 44, moveSpeed: 120, mana: 140, manaRegen: 10 },
    mods: [mod('chaosRes', 'flat', 0.4)],
    skills: ['bile_spray', 'spew_rats'],
    xp: 24,
    faction: 'vermin', tags: ['vermin'],
    gemBias: ['chaos', 'summon'], wardPriority: 1,
    detection: 1.0,
    presence: { from: 5, fadeIn: 3 },
    brain: { type: 'strafer' },
  },
  // THE WARREN NEST: the infestation's clear condition — an anchored mound
  // that drips rats until split (rift_maw-shaped: NOT spawner-flagged, so it
  // never joins a zone's 'spawners' objective; the Verminfall's own kill row
  // keeps the ledger).
  warren_nest: {
    id: 'warren_nest', name: 'Warren Nest',
    color: '#6a5a44', shape: 'oval', radius: 15, material: 'fur', look: 'warren_nest',
    base: { life: 85, moveSpeed: 0, armor: 18, mana: 999, manaRegen: 50 },
    skills: ['spew_rats'], xp: 10, faction: 'vermin',
    vision: { arcDeg: 360, rearMul: 1 }, // a mound has no back
    noNemesis: true, drops: 0,
  },
  // THE RAT KING: the warren's one idea, crowned. Manifested over the last
  // split nest (the Verminfall kill row); also the faction's WARLORD, so a
  // deep vermin capital crowns him the ordinary way.
  rat_king: {
    id: 'rat_king', name: 'Rat King',
    color: '#9a8a6a', shape: 'hexagon', radius: 17, material: 'fur', look: 'rat_king',
    base: { life: 210, moveSpeed: 150, accuracy: 105, armor: 25, mana: 120, manaRegen: 8, poise: 45 },
    mods: [mod('chaosRes', 'flat', 0.35)],
    skills: ['claw', 'spew_rats', 'keening_shriek'],
    xp: 85,
    faction: 'vermin', tags: ['beast', 'vermin'],
    detection: 1.2,
    turnSpeed: 6,
    scaling: { life: { incPerLevel: 0.07 } },
    grants: [{ atLevel: 14, support: 'brood_tender', on: 'spew_rats', chance: 0.6 }],
    presence: { from: 8, fadeIn: 4 },
    brain: {
      type: 'commander', perception: { alertShout: 520 },
      rules: [
        { when: { lifeBelow: 0.5 }, every: [8, 12], hold: [0.3, 0.5],
          announce: 'The King calls the warren!',
          actions: [{ do: 'summon', monster: 'warren_rat', count: 3, ring: 60 }] },
      ],
    },
  },

  // --- THE MIRRORKIN (reflections given appetite) ----------------------------
  // A contexts-gated faction: they exist NOWHERE in ordinary generation — only
  // the MIRROR RIFT encounter fields them. The husk is the scenery-mimic
  // generalized (the chest's trick, worn by a body); the reflection is the
  // VESSEL the rift's echo rite pours a hero into (EncounterDef.echoParty
  // copies a seat's silhouette + castable bar onto it at spawn — a wild-rolled
  // one fights with its own glass instead).

  // THE MIRROR HUSK: a reflection that found no face. Furniture until you're
  // close enough to see yourself in it.
  mirror_husk: {
    id: 'mirror_husk', name: 'Mirror Husk',
    color: '#b8c4d8', shape: 'circle', radius: 11, material: 'ethereal', look: 'mirror_husk',
    base: { life: 44, moveSpeed: 175, accuracy: 95, evasion: 85, mana: 20, manaRegen: 3 },
    mods: [mod('coldRes', 'flat', 0.4)],
    skills: ['claw'],
    xp: 16,
    faction: 'mirrorkin', tags: ['construct'],
    detection: 1.2,
    ambush: { radius: 120, announce: 'the glass wakes!' },
    // A mirror is hard to hit and reads your wind-ups — it was WATCHING.
    brain: {
      type: 'skirmish', withdraw: 1.1,
      behavior: { dodge: { chance: 0.55, reaction: [0.1, 0.3], exit: 'lateral' } },
    },
  },
  // THE REFLECTION: the echo rite's vessel. Fielded by the rite it wears a
  // hero's face and bar; rolled wild it fights with its own glass.
  mirrorkin_reflection: {
    id: 'mirrorkin_reflection', name: 'Reflection',
    color: '#cdd6e4', shape: 'circle', radius: 12, material: 'ethereal', look: 'mirror_husk',
    base: { life: 95, moveSpeed: 185, accuracy: 100, evasion: 70, mana: 170, manaRegen: 12 },
    mods: [mod('coldRes', 'flat', 0.4), mod('chaosRes', 'flat', 0.2)],
    skills: ['shadow_shuriken', 'shadow_slash'],
    xp: 42,
    faction: 'mirrorkin', tags: ['construct'],
    detection: 1.3,
    noRecall: true,
    scaling: { life: { incPerLevel: 0.05 } },
    // It knows your moves — it IS your moves: high dodge, reads casts.
    brain: {
      type: 'skirmish', withdraw: 1.05,
      behavior: { dodge: { chance: 0.6, reaction: [0.1, 0.28], exit: 'lateral' } },
      rules: [
        { when: { targetCasting: 0.3, distUnder: 380, chance: 0.5 },
          hold: [0.6, 0.9], cooldown: 3,
          use: { move: { style: 'direct', pace: 1.25 } } },
      ],
    },
  },

  // --- THE WAX COURT (candleflesh nobility) & THE UMBRAL PARLIAMENT ---------
  // Two contexts-gated courts at war over LIGHT, fielded only by the Long
  // Candle package's night claims. The wax bodies are the first wearers of
  // MonsterDef.onHitByType — the reaction matrix as ANATOMY: fire makes them
  // FASTER and drippier (melting + the burning runoff), cold sets them
  // BRITTLE (the freeze-then-crack setup); their corpses stand as wax pools
  // that RE-LIGHT if fire finds them. The umbral kind are the inverse: hard
  // to see by nature, and fire (or a candle-shrine's pulse) LIGHTS THEM UP.

  wax_footman: {
    id: 'wax_footman', name: 'Wax Footman',
    color: '#e8d9a8', shape: 'pentagon', radius: 13, material: 'bone', look: 'wax_footman',
    base: { life: 62, moveSpeed: 128, accuracy: 95, armor: 32, mana: 12, manaRegen: 2 },
    mods: [mod('fireRes', 'flat', 0.35), mod('coldRes', 'flat', -0.25)],
    skills: ['heavy_strike'],
    xp: 20,
    faction: 'wax', tags: ['construct'],
    detection: 1.0,
    onHitByType: {
      fire: { status: 'melting', skillId: 'wax_drip', chance: 0.8 },
      cold: { status: 'brittle' },
    },
    brain: {
      type: 'basic',
      onDeath: [{ do: 'summon', monster: 'wax_pool', count: 1 }],
    },
  },
  // The wickling: a candle that got ambitions. Pops as a drifting flame.
  wickling: {
    id: 'wickling', name: 'Wickling',
    color: '#f0e0b0', shape: 'circle', radius: 8, material: 'bone', look: 'wickling',
    base: { life: 15, moveSpeed: 198, accuracy: 85, evasion: 55, mana: 0 },
    mods: [mod('fireRes', 'flat', 0.5), mod('coldRes', 'flat', -0.25)],
    skills: ['claw'],
    xp: 7,
    faction: 'wax', tags: ['construct'],
    detection: 1.2,
    deathBurst: { mode: 'orb', damageFrac: 0.6, damageType: 'fire', orbSpeed: 100, orbDuration: 2.2 },
    onHitByType: { cold: { status: 'brittle' } },
    brain: { type: 'swarm', squad: { muster: { count: 3, radius: 280 }, surround: true } },
  },
  wax_chandler: {
    id: 'wax_chandler', name: 'Court Chandler',
    color: '#e0cf98', shape: 'star', radius: 12, material: 'cloth', look: 'wax_chandler',
    base: { life: 48, moveSpeed: 118, mana: 150, manaRegen: 11 },
    mods: [mod('fireRes', 'flat', 0.4), mod('coldRes', 'flat', -0.25)],
    skills: ['firebolt', 'waxlight_pulse'],
    xp: 26,
    faction: 'wax', tags: ['construct'],
    gemBias: ['fire', 'spell'], wardPriority: 1,
    detection: 1.1,
    presence: { from: 4, fadeIn: 3 },
    onHitByType: {
      fire: { status: 'melting', skillId: 'wax_drip', chance: 0.8 },
      cold: { status: 'brittle' },
    },
    brain: {
      type: 'strafer',
      onDeath: [{ do: 'summon', monster: 'wax_pool', count: 1 }],
    },
  },
  // THE CHANDLER-QUEEN: the Court's one flame that must not gutter.
  chandler_queen: {
    id: 'chandler_queen', name: 'The Chandler-Queen',
    color: '#f0dfa8', shape: 'hexagon', radius: 17, material: 'cloth', look: 'chandler_queen',
    base: { life: 230, moveSpeed: 138, accuracy: 108, armor: 30, mana: 180, manaRegen: 12, poise: 40 },
    mods: [mod('fireRes', 'flat', 0.5), mod('coldRes', 'flat', -0.2)],
    skills: ['flame_wave', 'heavy_strike', 'waxlight_pulse'],
    xp: 95,
    faction: 'wax', tags: ['construct'],
    detection: 1.2,
    turnSpeed: 6,
    scaling: { life: { incPerLevel: 0.07 } },
    presence: { from: 10, fadeIn: 4 },
    onHitByType: {
      fire: { status: 'melting', skillId: 'wax_drip', chance: 0.9 },
      cold: { status: 'brittle' },
    },
    brain: {
      type: 'commander', perception: { alertShout: 520 },
      onDeath: [{ do: 'summon', monster: 'wax_pool', count: 2, ring: 30 }],
    },
  },
  // THE CANDLE-SHRINE: the vigil's working lamp — an anchored pillar whose
  // pulse picks EVERYTHING out of the dark (waxlight): your stealth, and the
  // Parliament's whole anatomy. Snuff it or fight lit.
  candle_shrine: {
    id: 'candle_shrine', name: 'Candle-Shrine',
    color: '#f0e2b0', shape: 'octagon', radius: 14, material: 'bone', look: 'candle_shrine',
    base: { life: 90, moveSpeed: 0, armor: 20, mana: 999, manaRegen: 50 },
    skills: ['waxlight_pulse'],
    xp: 12,
    faction: 'wax', tags: ['construct'],
    vision: { arcDeg: 360, rearMul: 1 }, // a lamp has no back
    noNemesis: true, drops: 0,
    onHitByType: { cold: { status: 'brittle' } },
  },
  // THE WAX POOL: what a courtier leaves. Scenery with a grudge — fire
  // finds it and it ANSWERS (the re-light).
  wax_pool: {
    id: 'wax_pool', name: 'Wax Pool',
    color: '#e5d49e', shape: 'circle', radius: 12, material: 'bone', look: 'wax_pool',
    base: { life: 40, moveSpeed: 0, mana: 0 },
    remains: false, // organic dress, but an OBJECT — no corpse
    skills: [],
    xp: 2,
    faction: 'wax', tags: ['construct'],
    passive: true, noNemesis: true, noBestiary: true, drops: 0,
    onHitByType: { fire: { skillId: 'wax_flare' } },
  },

  // THE UMBRAL PARLIAMENT: your shadow, seceded. Near-invisible by nature —
  // and LIGHT is the counterplay: fire (or a shrine's pulse) candle-lights
  // them, and a lit shadow is just a target.
  umbral_footpad: {
    id: 'umbral_footpad', name: 'Umbral Footpad',
    color: '#3a3648', shape: 'kite', radius: 11, material: 'ethereal', look: 'umbral_footpad',
    base: { life: 42, moveSpeed: 196, accuracy: 100, evasion: 85, mana: 20, manaRegen: 3 },
    mods: [mod('chaosRes', 'flat', 0.5), mod('fireRes', 'flat', -0.3), mod('detectability', 'more', -0.5)],
    skills: ['shadow_slash'],
    xp: 22,
    faction: 'umbral', tags: ['umbral'],
    detection: 1.3,
    onHitByType: { fire: { status: 'waxlight', chance: 0.7 } },
    brain: {
      type: 'skirmish', withdraw: 1.15,
      move: { style: 'skitter', dart: [0.3, 0.5], pause: [0.1, 0.25] },
      behavior: { encircle: { front: 2 }, dodge: { chance: 0.5, reaction: [0.12, 0.3], exit: 'lateral' } },
    },
  },
  umbral_whisper: {
    id: 'umbral_whisper', name: 'Umbral Whisper',
    color: '#443e58', shape: 'star', radius: 12, material: 'ethereal', look: 'umbral_whisper',
    base: { life: 46, moveSpeed: 128, evasion: 60, mana: 160, manaRegen: 11 },
    mods: [mod('chaosRes', 'flat', 0.5), mod('fireRes', 'flat', -0.3), mod('detectability', 'more', -0.4)],
    skills: ['shadow_shuriken', 'despair'],
    xp: 28,
    faction: 'umbral', tags: ['umbral'],
    gemBias: ['chaos', 'curse'], wardPriority: 1,
    detection: 1.2,
    presence: { from: 5, fadeIn: 3 },
    onHitByType: { fire: { status: 'waxlight', chance: 0.7 } },
    brain: { type: 'strafer' },
  },
  // THE SPEAKER OF THE HOUSE OF DUSK: the Parliament's voice, and its whip.
  speaker_of_dusk: {
    id: 'speaker_of_dusk', name: 'Speaker of the House of Dusk',
    color: '#4a4260', shape: 'hexagon', radius: 16, material: 'ethereal', look: 'speaker_of_dusk',
    base: { life: 205, moveSpeed: 150, accuracy: 110, evasion: 60, mana: 190, manaRegen: 13 },
    mods: [mod('chaosRes', 'flat', 0.6), mod('fireRes', 'flat', -0.25), mod('detectability', 'more', -0.4)],
    skills: ['shadow_slash', 'despair', 'shadow_shuriken'],
    xp: 92,
    faction: 'umbral', tags: ['umbral'],
    detection: 1.3,
    turnSpeed: 7,
    scaling: { life: { incPerLevel: 0.07 } },
    presence: { from: 10, fadeIn: 4 },
    onHitByType: { fire: { status: 'waxlight', chance: 0.6 } },
    brain: { type: 'commander', perception: { alertShout: 500 } },
  },

  // --- THE HOLLOWBORN (the armory that walks) --------------------------------
  // Animate war-gear: every body spawns WEARING a real rolled item
  // (MonsterDef.carry) and its credited kill drops EXACTLY that piece — a
  // named Hollowborn is a loot beacon you can see walking. Fielded in the
  // world's interred iron: ossuary galleries, the Durance, sunken ruins —
  // the pre-emptive family for the metropolis/industrial grounds to come.

  hollow_vanguard: {
    id: 'hollow_vanguard', name: 'Hollow Vanguard',
    color: '#9aa4b2', shape: 'pentagon', radius: 14, material: 'metal', look: 'hollow_vanguard',
    base: { life: 95, moveSpeed: 105, accuracy: 100, armor: 55, poise: 90, mana: 12, manaRegen: 2 },
    skills: ['heavy_strike'],
    xp: 30,
    faction: 'hollowborn', tags: ['construct'],
    detection: 0.9,
    temper: 'territorial',
    turnSpeed: 3.2, // empty armor LUMBERS — circle it
    carry: {},
    brain: { type: 'juggernaut' },
  },
  // Living blades: a worm-chain of linked swords, nothing holding them.
  blade_swarm: {
    id: 'blade_swarm', name: 'Living Blades',
    color: '#b6bec8', shape: 'kite', radius: 10, material: 'metal', look: 'blade_swarm',
    base: { life: 44, moveSpeed: 195, accuracy: 105, evasion: 60, mana: 10, manaRegen: 2 },
    skills: ['claw'],
    xp: 24,
    faction: 'hollowborn', tags: ['construct'],
    detection: 1.1,
    worm: { length: 4, spacing: 12, taper: 0.8 },
    carry: { chance: 0.5, category: 'weapon' },
    brain: {
      type: 'skirmish', withdraw: 1.05,
      move: { style: 'skitter', dart: [0.25, 0.45], pause: [0.08, 0.2] },
    },
  },
  // The shield-anima: a wall that walks — the SHELL is the whole structure
  // (shell-instead-of-poise texture: crack it, then everything staggers it).
  shield_anima: {
    id: 'shield_anima', name: 'Shield-Anima',
    color: '#8e9aa8', shape: 'octagon', radius: 14, material: 'metal', look: 'shield_anima',
    base: { life: 60, moveSpeed: 95, accuracy: 92, armor: 40, poise: 0, mana: 10, manaRegen: 2 },
    skills: ['heavy_strike'],
    xp: 26,
    faction: 'hollowborn', tags: ['construct'],
    detection: 0.9,
    turnSpeed: 2.6,
    shellGuard: { side: 'front', max: 70, arcDeg: 200 },
    carry: { chance: 0.6, category: 'offhand' },
    presence: { from: 4, fadeIn: 3 },
    brain: { type: 'juggernaut', move: { style: 'turtle' } },
  },
  // THE UNWORN: the armory's will, crowned in nobody. Always carries
  // something worth the fight — a RARE at minimum, walking.
  the_unworn: {
    id: 'the_unworn', name: 'The Unworn',
    color: '#aab6c6', shape: 'hexagon', radius: 17, material: 'metal', look: 'the_unworn',
    base: { life: 250, moveSpeed: 120, accuracy: 112, armor: 60, poise: 80, mana: 40, manaRegen: 4 },
    skills: ['heavy_strike'],
    xp: 100,
    faction: 'hollowborn', tags: ['construct'],
    detection: 1.0,
    turnSpeed: 4,
    scaling: { life: { incPerLevel: 0.07 } },
    grants: [{ atLevel: 12, support: 'multistrike', on: 'heavy_strike', chance: 0.6 }],
    carry: { rarity: 'rare' },
    presence: { from: 9, fadeIn: 4 },
    brain: { type: 'commander', perception: { alertShout: 500 } },
  },

  // --- THE CHATTEL (livestock gone wrong) ------------------------------------
  // Migration's domestic cousin, homed on the FIELD country: aurochs that
  // remember the goad, hens with opinions, hounds that were never wild, and
  // the Bellwether — a sheep. The most dangerous sheep. Low-level play's own
  // living-world loop, and the farmland biome's precedent-setter.

  feral_aurochs: {
    id: 'feral_aurochs', name: 'Feral Aurochs',
    color: '#8a6a4a', shape: 'rhombus', radius: 16, material: 'fur', look: 'feral_aurochs',
    base: { life: 110, moveSpeed: 150, accuracy: 95, armor: 20, poise: 70, mana: 25, manaRegen: 4 },
    skills: ['gore_rend'],
    xp: 26,
    faction: 'chattel', tags: ['beast'],
    detection: 0.9,
    temper: 'territorial',
    turnSpeed: 3.4,
    scaleVariance: [0.9, 1.35], scaleStats: true,
    juvenileBelow: 0.98, juvenileBrain: { type: 'flee' }, // the calves bolt
    brain: {
      type: 'juggernaut',
      move: { style: 'charge', commitRange: 360, chargeSpeed: 2.6 },
    },
  },
  feral_hen: {
    id: 'feral_hen', name: 'Feral Hen',
    color: '#c8a878', shape: 'circle', radius: 7, material: 'fur', look: 'feral_hen',
    base: { life: 10, moveSpeed: 190, accuracy: 88, evasion: 65, mana: 0 },
    skills: ['claw'],
    xp: 3,
    faction: 'chattel', tags: ['beast'],
    detection: 1.1,
    scaleVariance: [0.8, 1.15],
    presence: { to: 16, fadeOut: 8 },
    brain: { type: 'swarm', squad: { muster: { count: 4, radius: 260 }, surround: true } },
  },
  // The hound that was never wild: it still works the flock — and you are
  // what the flock needs working away.
  shepherds_hound: {
    id: 'shepherds_hound', name: 'Hound That Was Never Wild',
    color: '#7a6a55', shape: 'kite', radius: 12, material: 'fur', look: 'hound',
    base: { life: 45, moveSpeed: 195, accuracy: 100, evasion: 45, mana: 0 },
    skills: ['claw'],
    xp: 18,
    faction: 'chattel', tags: ['beast'],
    detection: 1.5,
    adorn: 'ears',
    // It fights for the flock: harder and faster while the herd stands near.
    bond: { mods: [mod('damage', 'increased', 0.2), mod('moveSpeed', 'increased', 0.1)], radius: 460 },
    brain: {
      type: 'pack',
      squad: { muster: { count: 2, radius: 320, patience: 5 }, tokens: 2, surround: true },
      behavior: { encircle: { front: 2 } },
    },
  },
  // THE BELLWETHER: a sheep. The most dangerous sheep. The bleat carries.
  the_bellwether: {
    id: 'the_bellwether', name: 'The Bellwether',
    color: '#e8e0cc', shape: 'hexagon', radius: 15, material: 'fur', look: 'the_bellwether',
    base: { life: 220, moveSpeed: 165, accuracy: 105, armor: 25, poise: 80, mana: 80, manaRegen: 7 },
    skills: ['heavy_strike', 'keening_shriek'],
    xp: 90,
    faction: 'chattel', tags: ['beast'],
    detection: 1.1,
    turnSpeed: 6,
    scaling: { life: { incPerLevel: 0.07 } },
    presence: { from: 8, fadeIn: 4 },
    brain: {
      type: 'commander', perception: { alertShout: 520 },
      rules: [
        { when: { lifeBelow: 0.6 }, every: [9, 13], hold: [0.3, 0.5],
          announce: 'The flock ANSWERS the bell!',
          actions: [{ do: 'summon', monster: 'feral_hen', count: 3, ring: 70 }] },
      ],
    },
  },

  // --- THE PASTURE (the living farm) ------------------------------------------
  // The Chattel's CALM cousins: real livestock for the farmland biome, spawned
  // as ambient fauna. All 'critter'-tagged (the prey lane — wolves' hunger
  // drives already hunt them, no new code), near-blind (unperturbed by
  // anything that doesn't touch them), posted hold:false (they GRAZE — the
  // idle wander orbits home), and they ROUT on a wound (morale, not scripts):
  // a predator in the fold writes its own scene.

  wool_sheep: {
    id: 'wool_sheep', name: 'Sheep',
    color: '#e6e0d0', shape: 'oval', radius: 11, material: 'fur', look: 'the_bellwether',
    base: { life: 22, moveSpeed: 130, mana: 0 },
    mods: [mod('detectability', 'more', -0.3)],
    skills: [],
    xp: 2,
    tag: 'critter',
    faction: 'beast', tags: ['beast'],
    detection: 0.1,
    drops: 0,
    scaleVariance: [0.85, 1.15], scaleStats: true,
    packSize: [4, 7],
    post: { hold: false, slack: 220 },
    noNemesis: true,
    brain: {
      type: 'basic',
      perception: { arcDeg: 300, rearMul: 0.9 },
      move: { style: 'juke', hookEvery: [0.4, 0.9], hookArc: 1.1, freezeChance: 0.15, freeze: [0.2, 0.4] },
      tempo: { kite: 3.0, windedFor: [0.9, 1.5] },
      // ANY wound routs it; a flockmate dying scatters the fold; they settle
      // and drift back to grazing once the trouble passes (rallyAfter).
      morale: { breakAtLife: 0.999, panicOnAllyDeath: { radius: 260, duration: 2.5 }, rallyAfter: 4 },
      // The fold moves as ONE — grounded flocking (the murmuration math with
      // its feet on the turf; a fleeing fold is a drivable herd).
      behavior: { flock: { cohesion: 1.1, separation: 1.0, alignment: 0.8, kin: 'def' } },
    },
  },
  plow_ox: {
    id: 'plow_ox', name: 'Plow Ox',
    color: '#a8845c', shape: 'rhombus', radius: 16, material: 'fur', look: 'feral_aurochs',
    base: { life: 95, moveSpeed: 105, mana: 0 },
    skills: [],
    xp: 4,
    tag: 'critter',
    faction: 'beast', tags: ['beast'],
    detection: 0.1,
    drops: 0,
    heft: 1.5, // a wall of patient meat — shoves barely move it
    scaleVariance: [0.9, 1.2], scaleStats: true,
    packSize: [1, 2],
    post: { hold: false, slack: 180 },
    noNemesis: true,
    brain: {
      type: 'basic',
      move: { style: 'retreat' }, // no juking in an ox — it just LEAVES
      tempo: { kite: 4.0, windedFor: [1.2, 2.0] },
      morale: { breakAtLife: 0.9, rallyAfter: 5 },
    },
  },
  dooryard_hen: {
    id: 'dooryard_hen', name: 'Dooryard Hen',
    color: '#c89a6a', shape: 'circle', radius: 6, material: 'fur', look: 'feral_hen',
    base: { life: 8, moveSpeed: 175, evasion: 60, mana: 0 },
    mods: [mod('detectability', 'more', -0.4)],
    skills: [],
    xp: 1,
    tag: 'critter',
    faction: 'beast', tags: ['beast'],
    detection: 0.1,
    drops: 0,
    scaleVariance: [0.8, 1.1],
    packSize: [3, 6],
    post: { hold: false, slack: 160 },
    noNemesis: true,
    brain: {
      type: 'basic',
      // Hens ARE jumpy — the one pasture animal that scatters when you charge
      // through (a tiny skittish radius: flapping underfoot, not panic).
      morale: { skittish: { radius: 90, duration: [0.8, 1.4] } },
      move: { style: 'juke', hookEvery: [0.25, 0.55], hookArc: 1.3, freezeChance: 0.2, freeze: [0.15, 0.35] },
      tempo: { kite: 2.4, windedFor: [0.7, 1.2] },
      behavior: { flock: { cohesion: 0.9, separation: 1.2, alignment: 0.6, kin: 'def' } },
    },
  },
  // THE GOOSE: the one resident that was never neutral. Territorial — come
  // close and it COMES AT YOU (claws, honking implied) — but it's still a
  // critter: the fox and the wolf want it more than it wants you.
  greylag_goose: {
    id: 'greylag_goose', name: 'Greylag Goose',
    color: '#d8d8cc', shape: 'circle', radius: 8, material: 'fur', look: 'feral_hen',
    base: { life: 14, moveSpeed: 150, evasion: 50, mana: 0 },
    skills: ['claw'],
    xp: 3,
    tag: 'critter',
    faction: 'beast', tags: ['beast'],
    detection: 0.5,
    temper: 'territorial',
    drops: 0,
    packSize: [2, 3],
    post: { hold: false, slack: 170 },
    noNemesis: true,
    brain: { type: 'basic', morale: { breakAtLife: 0.45, rallyAfter: 3 } },
  },

  // --- THE FREEHOLDS (the settled belt's living folk) ---------------------------
  // The farmland's own people, as ambient fauna: crofters mill about their
  // yards (post hold:false) and BOLT when trouble starts — they never start
  // anything (near-blind, no kit); wardens stand the village watch under the
  // SENTRY fabric (dormant 'freehold_watch': planted vs weather, roused by a
  // wound — world.ts rouse row — forgiving by NEUTRAL_RESET). Faction
  // 'freehold' wars with the roads' predators through the ordinary RELATIONS
  // table: a bandit raid on the shires is the living-world loop running, not
  // an event script. Folk pay no xp and mint no nemeses — killing the help
  // is a choice, never a farm.
  crofter: {
    id: 'crofter', name: 'Crofter',
    color: '#c8a86e', shape: 'circle', radius: 12, look: 'npc_trader',
    base: { life: 48, moveSpeed: 122, mana: 0 },
    skills: [],
    xp: 0,
    faction: 'freehold',
    detection: 0.1,
    drops: 0,
    post: { hold: false, slack: 200 },
    noNemesis: true,
    brain: {
      type: 'basic',
      move: { style: 'juke', hookEvery: [0.4, 0.8], hookArc: 1.0, freezeChance: 0.1 },
      tempo: { kite: 3.5, windedFor: [1.0, 1.6] },
      morale: { breakAtLife: 0.999, panicOnAllyDeath: { radius: 300, duration: 3 }, rallyAfter: 5 },
    },
  },
  village_warden: {
    id: 'village_warden', name: 'Village Warden',
    color: '#c8a84b', shape: 'pentagon', radius: 13, look: 'npc_captain',
    base: { life: 105, moveSpeed: 118, accuracy: 102, armor: 20, poise: 40, mana: 30, manaRegen: 3 },
    skills: ['heavy_strike'],
    xp: 0,
    faction: 'freehold',
    tag: 'freehold_watch', // the sentry fabric: planted + dormant until a wound turns the watch out
    detection: 0.9,
    drops: 0,
    post: true, // the professional STANDS his watch
    noNemesis: true,
    brain: { type: 'juggernaut', enrage: 0.5 },
  },

  // --- THE HEADLAND'S OWN --------------------------------------------------------
  // The boar that owns the crop margin: a charging sounder (the tusker's
  // grammar homed on the fields — calves bolt, adults COMMIT).
  sounder_boar: {
    id: 'sounder_boar', name: 'Sounder Boar',
    color: '#6e563e', shape: 'rhombus', radius: 14, material: 'fur', look: 'tusker',
    base: { life: 78, moveSpeed: 155, accuracy: 96, armor: 12, poise: 55, mana: 20, manaRegen: 3 },
    skills: ['gore_rend'],
    xp: 20,
    faction: 'beast', tags: ['beast'],
    detection: 0.9,
    temper: 'territorial',
    turnSpeed: 3.6,
    scaleVariance: [0.85, 1.3], scaleStats: true,
    juvenileBelow: 0.95, juvenileBrain: { type: 'flee' }, // the piglets bolt
    packSize: [3, 5],
    brain: {
      type: 'juggernaut',
      move: { style: 'charge', commitRange: 340, chargeSpeed: 2.5 },
    },
  },

  // --- THE CRIMP GANGS (the metropolis' press) -----------------------------------
  // The city's own predators, one verb per silhouette (the grip-kin law worn
  // in the lanes): the SHIV skirmishes and SNATCHES loose valuables off the
  // cobbles (the scamp's looter lever — kill it and it spills), the GANGER
  // CLINCHES you into the alley (the mauler's pin row verbatim — shared
  // catalog, no fork — his yoke-board is the tell), and the CAPTAIN rings
  // the press-bell that musters both.
  gutter_shiv: {
    id: 'gutter_shiv', name: 'Gutter Shiv',
    color: '#8a7a5c', shape: 'trapezoid', radius: 11, look: 'gutter_shiv',
    base: { life: 40, moveSpeed: 172, accuracy: 104, evasion: 40, mana: 0, insight: 30 },
    mods: [mod('life', 'more', 0.5)],
    skills: ['claw'],
    xp: 14, faction: 'bandit',
    detection: 1.2,
    looter: { kinds: ['gear', 'essence'], reach: 40 }, // it works the crowd — and the floor
    brain: {
      type: 'skirmish', withdraw: 1.25,
      move: { style: 'skitter', dart: [0.25, 0.5], pause: [0.08, 0.2] },
      behavior: { dodge: { chance: 0.45, reaction: [0.12, 0.3], exit: 'lateral' } },
    },
  },
  press_ganger: {
    id: 'press_ganger', name: 'Press-Ganger',
    color: '#7a6248', shape: 'octagon', radius: 16, look: 'press_ganger',
    base: { life: 92, moveSpeed: 114, accuracy: 100, armor: 26, poise: 45, mana: 40, manaRegen: 4 },
    mods: [mod('life', 'more', 0.5)],
    skills: ['mauler_clinch', 'heavy_strike'],
    xp: 26, faction: 'bandit',
    detection: 1.0,
    heft: 1.4, // the mass law's ticket: enough shoulder to clinch a hero
    brain: { type: 'juggernaut' },
  },
  crimp_captain: {
    id: 'crimp_captain', name: 'Crimp Captain',
    color: '#9a8452', shape: 'hexagon', radius: 15, look: 'crimp_captain',
    base: { life: 210, moveSpeed: 122, accuracy: 108, armor: 35, poise: 60, mana: 60, manaRegen: 5 },
    mods: [mod('life', 'more', 0.5)],
    skills: ['heavy_strike', 'war_cry'],
    xp: 85, faction: 'bandit',
    detection: 1.1,
    turnSpeed: 5,
    scaling: { life: { incPerLevel: 0.07 } },
    presence: { from: 8, fadeIn: 4 },
    brain: { type: 'commander', perception: { alertShout: 500 } },
  },

  // --- THE STARFALL COURT (what rides the meteors) ----------------------------
  // Event-NATIVE crystal-forms: they hold no ground and march no wars —
  // zones under an active STARFALL front (the weather registry's rare night
  // shower) grow them from the impacts, sometimes around a standing FALLEN
  // STAR heart. The purest "one system's side effect is another's front
  // door": the sky writes them in, the front passing writes them out.

  starfall_shardling: {
    id: 'starfall_shardling', name: 'Starfall Shardling',
    color: '#9ad4e8', shape: 'triangle', radius: 10, material: 'ethereal', look: 'starfall_shardling',
    base: { life: 34, moveSpeed: 188, accuracy: 96, evasion: 65, mana: 15, manaRegen: 3 },
    mods: [mod('coldRes', 'flat', 0.5)],
    skills: ['claw'],
    xp: 16,
    faction: 'starfall', tags: ['construct', 'elemental'],
    detection: 1.1,
    brain: {
      type: 'skirmish', withdraw: 1.1,
      move: { style: 'skitter', dart: [0.25, 0.5], pause: [0.1, 0.2] },
      behavior: { dodge: { chance: 0.5, reaction: [0.12, 0.3], exit: 'lateral' } },
    },
  },
  starfall_prism: {
    id: 'starfall_prism', name: 'Starfall Prism',
    color: '#bfe4f0', shape: 'star', radius: 12, material: 'ethereal', look: 'starfall_prism',
    base: { life: 46, moveSpeed: 120, mana: 160, manaRegen: 11 },
    mods: [mod('coldRes', 'flat', 0.5)],
    skills: ['splinter_volley', 'starfall_shard'],
    xp: 26,
    faction: 'starfall', tags: ['construct', 'elemental'],
    gemBias: ['cold', 'spell'], wardPriority: 1,
    detection: 1.1,
    presence: { from: 5, fadeIn: 3 },
    brain: { type: 'strafer' },
  },
  // The gravity warden: the crater's keeper — the ground remembers weight
  // wrong around it, and its snares are the proof.
  gravity_warden: {
    id: 'gravity_warden', name: 'Gravity Warden',
    color: '#7ab8d8', shape: 'hexagon', radius: 15, material: 'ethereal', look: 'gravity_warden',
    base: { life: 190, moveSpeed: 118, accuracy: 108, armor: 40, poise: 60, mana: 150, manaRegen: 10 },
    mods: [mod('coldRes', 'flat', 0.5)],
    skills: ['root_grasp', 'heavy_strike'],
    xp: 80,
    faction: 'starfall', tags: ['construct', 'elemental'],
    detection: 1.1,
    turnSpeed: 4,
    scaling: { life: { incPerLevel: 0.06 } },
    presence: { from: 8, fadeIn: 4 },
    brain: { type: 'commander', perception: { alertShout: 480 } },
  },
  // THE FALLEN STAR: the impact's standing heart — an anchored lattice that
  // sprays until broken (rift_maw pattern; the materializer plants it).
  fallen_star: {
    id: 'fallen_star', name: 'Fallen Star',
    color: '#bfe8f8', shape: 'octagon', radius: 15, material: 'ethereal', look: 'shard_spire',
    base: { life: 100, moveSpeed: 0, armor: 25, mana: 999, manaRegen: 50 },
    skills: ['splinter_volley'],
    xp: 18,
    faction: 'starfall', tags: ['construct', 'elemental'],
    vision: { arcDeg: 360, rearMul: 1 }, // a lattice has no back
    noNemesis: true, drops: 1, // the sky pays: a guaranteed gem in the wreck
  },

  // --- THE SMOULDERKIN (born from fire — RESERVED: see RESERVED_KIN) --------
  // Authored in full, fielded by NOTHING: their door is the burn-ledger
  // mechanic (the Kindling — ground remembers what burned, and enough of it
  // kindles them). Un-barred naively they'd inundate every fire spec's own
  // farm, so the family waits, complete, behind RESERVED_KIN['smoulder'].
  // Their grammar is already honest: feeding them fire SPEEDS them (furor),
  // cold cracks them — the fire build's monster, by design.

  smoulderling: {
    id: 'smoulderling', name: 'Smoulderling',
    color: '#e8763a', shape: 'circle', radius: 9, material: 'ethereal', look: 'smoulderling',
    base: { life: 22, moveSpeed: 195, accuracy: 90, evasion: 55, mana: 0 },
    mods: [mod('fireRes', 'flat', 0.75), mod('coldRes', 'flat', -0.3)],
    skills: ['claw'],
    xp: 10,
    faction: 'smoulder', tags: ['elemental'],
    detection: 1.2,
    deathBurst: { mode: 'implode', damageFrac: 0.5, damageType: 'fire', coalesce: 0.45 },
    onHitByType: { fire: { status: 'furor', chance: 0.5 } },
    brain: { type: 'swarm', squad: { muster: { count: 3, radius: 280 }, surround: true } },
  },
  ash_wretch: {
    id: 'ash_wretch', name: 'Ash Wretch',
    color: '#c86a3a', shape: 'star', radius: 12, material: 'ethereal', look: 'ash_wretch',
    base: { life: 42, moveSpeed: 125, mana: 140, manaRegen: 10 },
    mods: [mod('fireRes', 'flat', 0.75), mod('coldRes', 'flat', -0.3)],
    skills: ['firebolt'],
    xp: 20,
    faction: 'smoulder', tags: ['elemental'],
    gemBias: ['fire', 'spell'], wardPriority: 1,
    detection: 1.1,
    onHitByType: { fire: { status: 'furor', chance: 0.5 } },
    brain: { type: 'strafer' },
  },
  ember_shrike: {
    id: 'ember_shrike', name: 'Ember Shrike',
    color: '#f08a4a', shape: 'triangle', radius: 9, material: 'ethereal', look: 'ember_shrike',
    base: { life: 26, moveSpeed: 215, accuracy: 95, evasion: 75, mana: 10, manaRegen: 2 },
    mods: [mod('fireRes', 'flat', 0.75), mod('coldRes', 'flat', -0.3)],
    skills: ['talon_rake'],
    xp: 14,
    faction: 'smoulder', tags: ['elemental'],
    flier: true, levitates: true,
    detection: 1.3,
    deathBurst: { mode: 'orb', damageFrac: 0.5, damageType: 'fire', orbSpeed: 105, orbDuration: 2.2 },
    onHitByType: { fire: { status: 'furor', chance: 0.5 } },
    brain: { type: 'skirmish', withdraw: 1.2 },
  },
  // THE ASHMOTHER: what a whole season of burning adds up to.
  the_ashmother: {
    id: 'the_ashmother', name: 'The Ashmother',
    color: '#e05a2a', shape: 'hexagon', radius: 18, material: 'ethereal', look: 'the_ashmother',
    base: { life: 260, moveSpeed: 115, accuracy: 108, armor: 40, poise: 85, mana: 170, manaRegen: 11 },
    mods: [mod('fireRes', 'flat', 0.9), mod('coldRes', 'flat', -0.25)],
    skills: ['flame_wave', 'heavy_strike'],
    xp: 105,
    faction: 'smoulder', tags: ['elemental'],
    detection: 1.1,
    turnSpeed: 3.4,
    scaling: { life: { incPerLevel: 0.07 } },
    onHitByType: { fire: { status: 'furor', chance: 0.7 } },
    brain: { type: 'juggernaut', enrage: 0.5 },
  },

  // --- THE MAGPIE KIN (thieves of the floor — RESERVED: see RESERVED_KIN) ---
  // Corvid-folk who SWALLOW ground drops and flee (the looter fabric, worn
  // whole — the Gilded Scamp's grief-proof contract: player-placed drops
  // never touched, a solid blow shakes a piece loose, death spills all).
  // Authored in full, fielded by NOTHING: their door is the Magpie Court —
  // the heist ground that doesn't exist yet. Stricter than most reserves:
  // loot-eaters loose in ordinary gen would tax every build, not one.

  magpie_snatch: {
    id: 'magpie_snatch', name: 'Magpie Snatch',
    color: '#3a4a5c', shape: 'kite', radius: 10, material: 'fur', look: 'magpie_snatch',
    base: { life: 36, moveSpeed: 205, accuracy: 98, evasion: 80, mana: 12, manaRegen: 2 },
    skills: ['talon_rake'],
    xp: 18,
    faction: 'magpie', tags: ['beast'],
    detection: 1.4,
    looter: { reach: 80 },
    brain: {
      type: 'skirmish', withdraw: 1.25,
      move: { style: 'juke', hookEvery: [0.3, 0.6], hookArc: 1.2 },
      behavior: { seek: { what: 'loot', pace: 0.6 }, dodge: { chance: 0.6, reaction: [0.1, 0.28], exit: 'away' } },
    },
  },
  magpie_shrikeblade: {
    id: 'magpie_shrikeblade', name: 'Magpie Shrikeblade',
    color: '#2e3c4c', shape: 'kite', radius: 11, material: 'fur', look: 'magpie_shrikeblade',
    base: { life: 44, moveSpeed: 198, accuracy: 105, evasion: 85, mana: 20, manaRegen: 3 },
    skills: ['shadow_slash'],
    xp: 26,
    faction: 'magpie', tags: ['beast'],
    detection: 1.3,
    presence: { from: 5, fadeIn: 3 },
    brain: {
      type: 'skirmish', withdraw: 1.1,
      behavior: { encircle: { front: 2 }, dodge: { chance: 0.55, reaction: [0.1, 0.3], exit: 'lateral' } },
      rules: [
        { when: { targetCasting: 0.3, distUnder: 360, chance: 0.55 },
          hold: [0.6, 0.9], cooldown: 3,
          use: { move: { style: 'direct', pace: 1.3 } } },
      ],
    },
  },
  // THE MAGPIE KING: everything shiny ends up in his vault — starting with
  // whatever you were about to pick up.
  the_magpie_king: {
    id: 'the_magpie_king', name: 'The Magpie King',
    color: '#42566c', shape: 'hexagon', radius: 15, material: 'fur', look: 'the_magpie_king',
    base: { life: 230, moveSpeed: 185, accuracy: 112, evasion: 70, armor: 25, mana: 90, manaRegen: 8 },
    skills: ['shadow_slash', 'talon_rake'],
    xp: 110,
    faction: 'magpie', tags: ['beast'],
    detection: 1.4,
    turnSpeed: 7,
    drops: 2, // a king's hoard pays double
    looter: { reach: 100 },
    scaling: { life: { incPerLevel: 0.07 } },
    presence: { from: 10, fadeIn: 5 },
    brain: {
      type: 'commander', perception: { alertShout: 500 },
      behavior: { seek: { what: 'loot', pace: 0.7 }, dodge: { chance: 0.5, reaction: [0.1, 0.3], exit: 'lateral' } },
    },
  },

  // --- THE UNRUSTED (the old empire's constructs — RESERVED: see RESERVED_KIN)
  // Custodian machines that outlived their makers and kept the rounds: brass
  // bodies under honest verdigris, still sweeping halls that rotted out from
  // under them. Authored in full, fielded by NOTHING: their door is the
  // Verdigris Sprawl (the machine-court biome) and/or a custodian crusade
  // (FACTION_TRAITS contexts) — build either, strike RESERVED_KIN['unrusted'].
  // THE ANTI-NECROMANCY FACTION: a construct's death leaves NO corpse
  // (remains: false pinned on every def — material 'metal' already votes no;
  // the flag holds the doctrine even if a kin is ever re-dressed in stone or
  // crystal), so wherever the legion holds ground, Corpse Explosion goes
  // hungry, the wagon economy runs dry, and the Deadwake starves — the
  // standing counter-weight to every deathAligned banner (and the RELATIONS
  // grudge: keeping the dead OUT of the empire's halls was the charter).
  // Nothing here bleeds (ailmentResist at its 0.9 cap, physical-tagged —
  // bleed, hemorrhage, the impale family all shrug; house law keeps true
  // immunity unreachable) and nothing envenoms (0.75 chaos-tagged — venom
  // finds no veins; chaos-rot builds are dampened, never blanked). DEFENSE
  // TEXTURE (docs/engine/defenses.md): PLATED NO-CORPSE ATTRITION — armor +
  // poise walls that never dodge, never tire (metal breathes: false — the
  // chase never winds) and never regenerate; the wright is the only mender,
  // so the fight is "break the line faster than it is re-riveted" — vs the
  // scarab's shell-then-meat crack and the hive's bonded swarm arithmetic.
  // The legible family debt: BRASS CONDUCTS — lightning cracks the whole
  // legion open, except the one body that was built to drink it.

  /** The line rank: a house-guard that swept a dynasty's halls and now
   *  sweeps them of the living. Slow, plated, tireless — a butler the
   *  size of a door. */
  awakened_custodian: {
    id: 'awakened_custodian', name: 'Awakened Custodian',
    color: '#7fa08e', shape: 'pentagon', radius: 13, material: 'metal', look: 'awakened_custodian',
    base: { life: 78, moveSpeed: 108, accuracy: 100, armor: 45, poise: 45, mana: 8, manaRegen: 1 },
    remains: false,
    mods: [mod('ailmentResist', 'flat', 0.9, ['physical']), mod('ailmentResist', 'flat', 0.75, ['chaos']), mod('lightningRes', 'flat', -0.25)],
    skills: ['cleave'],
    xp: 24,
    faction: 'unrusted', tags: ['construct'],
    detection: 0.9,
    temper: 'territorial',
    brain: { type: 'juggernaut' },
  },
  /** The watch: a tower that walks its own rounds. One lens, dead centre,
   *  never blinking — and a bell-voice that wakes the whole floor. */
  brass_sentinel: {
    id: 'brass_sentinel', name: 'Brass Sentinel',
    color: '#b8965a', shape: 'octagon', radius: 12, material: 'metal', look: 'brass_sentinel',
    base: { life: 52, moveSpeed: 122, accuracy: 108, armor: 30, mana: 90, manaRegen: 7 },
    remains: false,
    mods: [mod('ailmentResist', 'flat', 0.9, ['physical']), mod('ailmentResist', 'flat', 0.75, ['chaos']), mod('lightningRes', 'flat', -0.25)],
    skills: ['spark'],
    xp: 26,
    faction: 'unrusted', tags: ['construct'],
    vision: { arcDeg: 360, rearMul: 1 }, // a lens has no back
    detection: 1.3,
    gemBias: ['lightning', 'spell'],
    temper: 'territorial',
    brain: { type: 'strafer', perception: { alertShout: 460 } },
  },
  /** The mender: tool-apron, rivet hammer, no interest in you at all — it
   *  is here for the LINE (mend on kin through the ordinary heal fabric).
   *  Kill the wright first, or fight masonry that repairs mid-siege. */
  verdigris_wright: {
    id: 'verdigris_wright', name: 'Verdigris Wright',
    color: '#58a882', shape: 'circle', radius: 10, material: 'metal', look: 'verdigris_wright',
    base: { life: 46, moveSpeed: 132, accuracy: 96, armor: 18, mana: 120, manaRegen: 9 },
    remains: false,
    mods: [mod('ailmentResist', 'flat', 0.9, ['physical']), mod('ailmentResist', 'flat', 0.75, ['chaos']), mod('lightningRes', 'flat', -0.25)],
    skills: ['mend', 'heavy_strike'],
    xp: 30,
    faction: 'unrusted', tags: ['construct'],
    detection: 1.0,
    gemBias: ['spell'], wardPriority: 1,
    presence: { from: 6 },
    temper: 'territorial',
    brain: { type: 'strafer' },
  },
  /** The storm-engine: a winding of brass that was a power-house once and
   *  is a weapon now — the ONE body in the legion the lightning feeds
   *  (the exception that teaches the family rule). */
  coil_warden: {
    id: 'coil_warden', name: 'Coil Warden',
    color: '#66a8b8', shape: 'hexagon', radius: 12, material: 'metal', look: 'coil_warden',
    base: { life: 60, moveSpeed: 118, accuracy: 102, armor: 22, mana: 160, manaRegen: 11 },
    remains: false,
    mods: [mod('ailmentResist', 'flat', 0.9, ['physical']), mod('ailmentResist', 'flat', 0.75, ['chaos']), mod('lightningRes', 'flat', 0.75)],
    skills: ['chain_lightning', 'spark'],
    xp: 34,
    faction: 'unrusted', tags: ['construct'],
    detection: 1.1,
    gemBias: ['lightning', 'spell'], wardPriority: 1,
    presence: { from: 8 },
    temper: 'territorial',
    brain: { type: 'strafer' },
  },
  /** The siege-frame: scaffolding that decided the building was DONE — a
   *  slow tower of girder and chain whose footfalls rattle the ground. */
  scaffold_colossus: {
    id: 'scaffold_colossus', name: 'Scaffold Colossus',
    color: '#6e7f74', shape: 'square', radius: 21, material: 'metal', look: 'scaffold_colossus',
    base: { life: 240, moveSpeed: 78, accuracy: 98, armor: 60, poise: 110, mana: 20, manaRegen: 2 },
    remains: false,
    mods: [mod('ailmentResist', 'flat', 0.9, ['physical']), mod('ailmentResist', 'flat', 0.75, ['chaos']), mod('lightningRes', 'flat', -0.25)],
    skills: ['ground_slam', 'heavy_strike'],
    xp: 58,
    faction: 'unrusted', tags: ['construct'],
    detection: 0.85,
    turnSpeed: 2.8,
    scaling: { life: { incPerLevel: 0.06 } },
    presence: { from: 9 },
    temper: 'territorial',
    brain: { type: 'juggernaut', enrage: 0.35 },
  },
  // THE CUSTODIAN: the office, not the machine — the seniormost body still
  // holding the whole inventory. What it cannot sweep it slams; what it
  // cannot slam it re-rivets between blows. Crown recorded in WARLORD_OF
  // (inert while doorless — a barred faction owns no ground to rise from).
  the_custodian: {
    id: 'the_custodian', name: 'The Custodian',
    color: '#88b09a', shape: 'hexagon', radius: 17, material: 'metal', look: 'the_custodian',
    base: { life: 300, moveSpeed: 102, accuracy: 112, armor: 70, poise: 130, mana: 140, manaRegen: 9 },
    remains: false,
    mods: [mod('ailmentResist', 'flat', 0.9, ['physical']), mod('ailmentResist', 'flat', 0.75, ['chaos']), mod('lightningRes', 'flat', -0.25)],
    skills: ['ground_slam', 'heavy_strike', 'mend'],
    xp: 120,
    faction: 'unrusted', tags: ['construct'],
    detection: 1.1,
    turnSpeed: 3.2,
    scaling: { life: { incPerLevel: 0.07 } },
    presence: { from: 12 },
    temper: 'territorial',
    brain: { type: 'commander', perception: { alertShout: 520 } },
  },

  // --- THE GILDED COMPACT (merchant princes — RESERVED: see RESERVED_KIN) ---
  // The first FRIENDLY faction with teeth: counting-houses on wheels,
  // charter-sworn escorts, and vault-stock that walks. Authored in full,
  // fielded by NOTHING: their doors are the wandering vendor camps (the
  // VendorDef counter fabric, data/vendors.ts — Brandt's precedent, under
  // canvas), the caravan-escort economy (the Caravanner's bands,
  // data/caravan.ts, grown teeth), and a reworked Delving Rush economy
  // event (still being specified) — build any one, strike
  // RESERVED_KIN['compact']. NEUTRAL DOCTRINE (recorded now, WIRED by the
  // door, not before): compact bodies are civil until wronged — the
  // migration-herd posture (ai.ts DORMANT_TAGS + NEUTRAL_RESET; the door
  // pass registers a 'compact' dormant tag via registerDormantTag with a
  // forgiving cool-down — trade is the point, not slaughter). ROBBERY IS A
  // CHOICE: their deaths ride the ordinary nemesis grudge ledger
  // (data/nemesis.ts GRUDGE_TIERS — known/hated/hunted), and this is the
  // faction where the player CLIMBS that ladder on purpose — the day the
  // camps ship, a hunted name pays its tariffs in ambushes instead of
  // coin. NAMING: the gilded_ id prefix belongs to the hoard-kin
  // (gilded_scamp / gilded_hoarder / the 'gilded_hoard' tag) — Compact
  // monster ids deliberately never wear it. DEFENSE TEXTURE
  // (docs/engine/defenses.md): BOUGHT STEEL — modest life under purchased
  // plate, drilled guard-craft (the blade's INSIGHT pool — the one duelist
  // read money can hire; the swordsaint precedent, alive and salaried),
  // and the vault golem's stone patience; no shell to crack, no bond to
  // unravel — you are fighting PAYROLL, organized by the paymaster's
  // shout (door-pass tuning: squad scatter on the master's death — the
  // pack fabric already speaks it). Unlike the Unrusted beside them, the
  // Compact's people are ORGANIC: rob them and their corpses feed the
  // same economies their golem starves — the moral ledger keeps itself.

  /** The charter-sworn escort: a professional. Reads your swing the way a
   *  clerk reads a ledger line (insight), answers inside the riposte
   *  window, and wastes nothing on flourish. */
  hired_blade: {
    id: 'hired_blade', name: 'Hired Blade',
    color: '#b8a05a', shape: 'pentagon', radius: 12, look: 'hired_blade',
    base: { life: 64, moveSpeed: 158, accuracy: 110, evasion: 55, armor: 20, insight: 35, mana: 30, manaRegen: 4 },
    skills: ['cleave', 'riposte'],
    xp: 26,
    faction: 'compact',
    detection: 1.1,
    brain: { type: 'skirmish', withdraw: 1.05, behavior: { dodge: { chance: 0.5, reaction: [0.1, 0.3], exit: 'lateral' } } },
  },
  /** The road-warden: the flanker who decides where the fight is ALLOWED
   *  to happen — forged spikes across the lane, then in from the side. */
  compact_outrider: {
    id: 'compact_outrider', name: 'Compact Outrider',
    color: '#c8a86a', shape: 'kite', radius: 11, look: 'compact_outrider',
    base: { life: 50, moveSpeed: 178, accuracy: 105, evasion: 65, mana: 40, manaRegen: 5 },
    skills: ['caltrops', 'cleave'],
    xp: 24,
    faction: 'compact',
    detection: 1.25,
    brain: { type: 'skirmish', withdraw: 1.2, behavior: { encircle: { front: 2 } } },
  },
  /** The assayer in the field: everything has a price, and the
   *  tally-keeper finds YOURS (expose_weakness — the painted window his
   *  blades collect on). Ruin the appraisal before it ruins you. */
  compact_tallykeeper: {
    id: 'compact_tallykeeper', name: 'Compact Tally-Keeper',
    color: '#d8b878', shape: 'star', radius: 11, look: 'compact_tallykeeper',
    base: { life: 44, moveSpeed: 128, accuracy: 100, mana: 140, manaRegen: 10 },
    skills: ['expose_weakness'],
    xp: 28,
    faction: 'compact',
    gemBias: ['spell'], wardPriority: 1,
    detection: 1.1,
    presence: { from: 4 },
    brain: { type: 'strafer' },
  },
  /** The paymaster: whip, lantern, and a voice that turns hired steel
   *  into a COLUMN (war_cry on the escort's tempo). The contract dies
   *  with him — kill the master and the payroll remembers it is only
   *  payroll. */
  caravan_master: {
    id: 'caravan_master', name: 'Caravan Master',
    color: '#c89452', shape: 'rhombus', radius: 13, look: 'caravan_master',
    base: { life: 90, moveSpeed: 150, accuracy: 108, evasion: 40, armor: 25, insight: 25, mana: 60, manaRegen: 6 },
    skills: ['war_cry', 'cleave'],
    xp: 34,
    faction: 'compact',
    detection: 1.2,
    presence: { from: 6 },
    brain: { type: 'commander', perception: { alertShout: 480 } },
  },
  /** The walking strongroom: the Compact's OWN construct — stone patience
   *  with the actual vault strapped to its back. The remains fabric is
   *  general, not an Unrusted privilege: stone leaves no corpse (pinned
   *  here too), but CRACKING the vault pays double — the one body in the
   *  company whose death is worth more than its wage. */
  vault_golem: {
    id: 'vault_golem', name: 'Vault Golem',
    color: '#9a8c6a', shape: 'square', radius: 18, material: 'stone', look: 'vault_golem',
    base: { life: 200, moveSpeed: 82, accuracy: 96, armor: 55, poise: 95, mana: 16, manaRegen: 2 },
    remains: false,
    mods: [mod('ailmentResist', 'flat', 0.9, ['physical'])], // stone does not bleed
    skills: ['heavy_strike', 'ground_slam'],
    xp: 55,
    faction: 'compact', tags: ['construct'],
    detection: 0.85,
    turnSpeed: 2.6,
    drops: 2, // crack the vault, spill the stock
    presence: { from: 8 },
    temper: 'territorial',
    brain: { type: 'juggernaut' },
  },
  // THE FACTOR: the Compact's standing prince — the one who signs. He
  // reads a duel like a contract (insight, the painted flaw, the riposte
  // answer) and every blade on the ground is on HIS ledger. Crown recorded
  // in WARLORD_OF (inert while doorless — a barred faction owns no ground
  // to rise from).
  the_factor: {
    id: 'the_factor', name: 'The Factor',
    color: '#e0c060', shape: 'hexagon', radius: 14, look: 'the_factor',
    base: { life: 250, moveSpeed: 150, accuracy: 115, evasion: 60, armor: 35, insight: 50, mana: 120, manaRegen: 9 },
    skills: ['expose_weakness', 'riposte', 'cleave'],
    xp: 115,
    faction: 'compact',
    detection: 1.3,
    turnSpeed: 6,
    drops: 2, // a prince settles accounts — in full
    scaling: { life: { incPerLevel: 0.07 } },
    presence: { from: 12 },
    brain: { type: 'commander', perception: { alertShout: 520 }, behavior: { dodge: { chance: 0.45, reaction: [0.1, 0.3], exit: 'lateral' } } },
  },

  // --- THE WOLF FAMILY (beasts — the bloodier packs the weres run with) -----

  // THE DEN MATRON: the she-wolf the whelps answer to. She carries a pocket
  // brew (swig — the monster flask) and a BORN SYMPATHY LINK: her draught
  // waters the whole pack (matrons_draught replays her flask restore + buffs
  // on same-faction kin within 300 — engine/sympathy.ts). Kill her first, or
  // fight a pack that drinks as one. Tame her, and the SAME fabric points
  // the other way: she drinks from YOUR flasks through the tamed bond.
  den_matron: {
    id: 'den_matron', name: 'Den Matron',
    color: '#8a7460', shape: 'rhombus', radius: 16, material: 'fur', look: 'den_matron',
    base: { life: 110, moveSpeed: 182, accuracy: 105, evasion: 40, mana: 30, manaRegen: 4 },
    skills: ['claw', 'swig'], xp: 30, tag: 'predator', faction: 'beast', tags: ['beast'],
    detection: 1.5,
    sympathy: ['matrons_draught'],
    scaleVariance: [0.95, 1.15],
    brain: {
      type: 'pack',
      squad: { muster: { count: 2, radius: 340, patience: 5 }, tokens: 2, surround: true, onLeaderDeath: 'scatter' },
    },
  },

  // Her whelps: quick, soft-bodied, brave only in her shadow — the matron
  // falls and the den scatters. They drink whatever she drinks (the pack
  // link is HERS; the whelps just live inside its radius).
  den_whelp: {
    id: 'den_whelp', name: 'Den Whelp',
    color: '#a89684', shape: 'kite', radius: 9, material: 'fur', look: 'den_whelp',
    base: { life: 16, moveSpeed: 196, accuracy: 85, evasion: 50, mana: 0 },
    skills: ['claw'], xp: 6, faction: 'beast', tags: ['beast'],
    detection: 1.3,
    scaleVariance: [0.8, 1.1],
    brain: {
      type: 'pack',
      squad: { muster: { count: 2, radius: 300, patience: 4 }, tokens: 2, onLeaderDeath: 'scatter' },
    },
  },

  dire_wolf: {
    id: 'dire_wolf', name: 'Dire Wolf',
    color: '#6a5a4a', shape: 'rhombus', radius: 15, material: 'fur', look: 'dire_wolf',
    base: { life: 85, moveSpeed: 190, accuracy: 110, evasion: 45, mana: 25, manaRegen: 4 },
    skills: ['gore_rend'], xp: 22, tag: 'predator', faction: 'beast', tags: ['beast'],
    detection: 1.6,
    // A wolf answers blood with blood — and moves on the moment it stops.
    aggro: { fury: 1.5, waver: 1.4 },
    temper: 'skittish',
    brain: {
      type: 'pack',
      target: { prey: ['critter'] },
      squad: { tokens: 2, surround: true },
    },
  },
  // The howler: the pack's voice — its cry rallies the wolves and wakes
  // everything else with ears.
  moon_howler: {
    id: 'moon_howler', name: 'Moon Howler',
    color: '#9a8a78', shape: 'rhombus', radius: 14, material: 'fur', look: 'moon_howler',
    base: { life: 70, moveSpeed: 180, accuracy: 105, mana: 100, manaRegen: 8 },
    skills: ['rallying_howl', 'claw'], xp: 26, tag: 'predator', faction: 'beast', tags: ['beast'],
    detection: 1.5,
    brain: { type: 'commander', perception: { alertShout: 460 }, target: { prey: ['critter'] } },
  },

  // --- THE VERMIN (insectoids — unaffiliated; the ground's own plague) ------
  giant_maggot: {
    id: 'giant_maggot', name: 'Giant Maggot',
    color: '#c8bc98', shape: 'oval', radius: 12, look: 'giant_maggot',
    base: { life: 45, moveSpeed: 85, accuracy: 85, mana: 0 },
    mods: [mod('chaosRes', 'flat', 0.4)],
    skills: ['claw'], xp: 9,
    scaleVariance: [0.8, 1.25],
    detection: 0.7, brain: { type: 'swarm' },
  },
  // The queen: near-anchored bulk that LAYS — her clutches hatch waves
  // unless stamped out first (the pod-construct egg, worn by a monster).
  maggot_queen: {
    id: 'maggot_queen', name: 'Maggot Queen',
    color: '#d0c0a0', shape: 'oval', radius: 21, look: 'maggot_queen',
    base: { life: 260, moveSpeed: 55, accuracy: 100, armor: 20, poise: 50, mana: 160, manaRegen: 10 },
    mods: [mod('chaosRes', 'flat', 0.5)],
    skills: ['lay_grub_clutch', 'bile_spray'], xp: 60,
    turnSpeed: 2.4,
    gemBias: ['summon', 'minion'], wardPriority: 1,
    scaling: { life: { incPerLevel: 0.06 } },
    detection: 0.9, brain: { type: 'juggernaut' },
  },
  formic_worker: {
    id: 'formic_worker', name: 'Formic Worker',
    color: '#a87848', shape: 'oval', radius: 10, material: 'chitin', look: 'formic_worker',
    base: { life: 30, moveSpeed: 150, accuracy: 90, armor: 25, mana: 0 },
    skills: ['claw'], xp: 8,
    detection: 0.9,
    // A worker works: the task first, the intruder barely.
    aggro: { fixation: 2.2, fury: 0.4, waver: 1.5 },
    temper: 'territorial',
    brain: { type: 'swarm', squad: { idle: { style: 'drill' }, formation: 'column' } },
  },
  formic_soldier: {
    id: 'formic_soldier', name: 'Formic Soldier',
    color: '#8a5a38', shape: 'hexagon', radius: 13, material: 'chitin', look: 'formic_soldier',
    base: { life: 75, moveSpeed: 140, accuracy: 105, armor: 45, poise: 35, mana: 20, manaRegen: 3 },
    skills: ['cleave'], xp: 18,
    // The colony's SYNCHRONY: soldiers fight harder while a worker lives
    // near — burst the workers first and the line softens (the bond seam).
    bond: { kin: 'formic_worker', mods: [mod('damageTaken', 'more', -0.25)] },
    // LOW SHELL + REAL POISE (the texture doctrine's other pole): a thin
    // frontal plate over a braced body — crack the line fast, then commit
    // through the poise to the soft flesh. Sustain-then-burst, where the
    // whelk and the grub reward the opposite rhythm.
    shellGuard: { side: 'front', max: 55, regenDelay: 4, regenRate: 14, color: '#b09060' },
    scaling: { armor: { flatPerLevel: 1.2 } },
    detection: 1.1,
    // The line holds its orders: fixed on the objective, hard to peel.
    aggro: { fixation: 1.8, fury: 0.9, waver: 0.8 },
    temper: 'territorial',
    // The colony COORDINATES like nothing else alive: the preset's ring
    // discipline plus tight elbow room — soldiers arrive as a closing
    // pincer, never a shoving file. Insect drill, insect geometry.
    brain: {
      type: 'pack',
      // The colony is a METRONOME by design (plantChance 0.9): every strike
      // from a planted stance, utterly predictable — monotony AS identity,
      // the deliberate far pole of the rhythm lever.
      behavior: { encircle: { front: 3 }, spacing: 30, plantChance: 0.9 },
      squad: { idle: { style: 'drill' }, formation: 'column', tokens: 3 },
    },
  },
  // The mantis: patience, then two scythes through the gap — it works the
  // player's own finesse windows when it casts.
  emerald_mantis: {
    id: 'emerald_mantis', name: 'Emerald Mantis',
    color: '#7ac858', shape: 'kite', radius: 13, material: 'chitin', look: 'emerald_mantis',
    base: { life: 80, moveSpeed: 165, accuracy: 125, evasion: 70, mana: 30, manaRegen: 4 },
    skills: ['eviscerate', 'claw'], xp: 34,
    detection: 1.3,
    brain: {
      type: 'assassin', withdraw: 0.8,
      move: { style: 'lurk', ring: 240, commitRange: 230, unseenArc: 1.6 },
      skillUse: { finesse: { chance: 0.5 } },
    },
  },
  bronze_scarab: {
    id: 'bronze_scarab', name: 'Bronzeback Scarab',
    color: '#b08a3a', shape: 'oval', radius: 15, material: 'metal', look: 'bronze_scarab',
    // SHELL-INSTEAD-OF-POISE (the texture doctrine): the full bronze
    // exoskeleton IS its structure — zero poise, and the old armor pile
    // trimmed so shell+armor+poise never stack into a wall of no-answers.
    // Burst cracks it open; anything staggers what's underneath.
    base: { life: 120, moveSpeed: 105, accuracy: 100, armor: 55, poise: 0, mana: 20, manaRegen: 3 },
    skills: ['heavy_strike'], xp: 28,
    // The exoskeleton retrofit: a knitting full shell over the old armor.
    shellGuard: { side: 'all', max: 90, regenDelay: 5, regenRate: 18, color: '#d8b86a' },
    turnSpeed: 3.2,
    scaling: { armor: { flatPerLevel: 2 } },
    detection: 0.9,
    brain: { type: 'juggernaut', move: { style: 'charge', commitRange: 300, chargeSpeed: 2.2 } },
  },
  // The bombardier: a walking retort — bile at range, a caustic pop at death.
  bombardier_beetle: {
    id: 'bombardier_beetle', name: 'Bombardier Beetle',
    color: '#c8a05a', shape: 'oval', radius: 13, material: 'chitin', look: 'bombardier_beetle',
    base: { life: 60, moveSpeed: 125, accuracy: 105, armor: 35, mana: 90, manaRegen: 8 },
    mods: [mod('chaosRes', 'flat', 0.4)],
    skills: ['bile_spray'], xp: 24,
    deathBurst: { mode: 'implode', damageFrac: 0.9, coalesce: 0.7, damageType: 'chaos' },
    detection: 1.0, brain: { type: 'skirmish', withdraw: 1.4 },
  },
  // The orb-weaver: silk first — a rooting line, then the long legs arrive.
  orb_weaver: {
    id: 'orb_weaver', name: 'Orb Weaver',
    color: '#b0a878', shape: 'cross', radius: 13, material: 'chitin', look: 'orb_weaver',
    base: { life: 55, moveSpeed: 155, accuracy: 110, evasion: 55, mana: 80, manaRegen: 7 },
    skills: ['web_shot', 'claw'], xp: 26, tag: 'predator', faction: 'beast', tags: ['beast'],
    detection: 1.3,
    brain: { type: 'skirmish', withdraw: 1.3, target: { prey: ['critter'] } },
  },
  // The widow matron: THE egg-layer — her clutches are destructible pods
  // that hatch spiderlings if ignored (lay_brood_egg, the user's D2 fantasy).
  widow_matron: {
    id: 'widow_matron', name: 'Widow Matron',
    color: '#4a3a48', shape: 'cross', radius: 16, material: 'chitin', look: 'widow_matron',
    base: { life: 110, moveSpeed: 130, accuracy: 110, armor: 25, mana: 120, manaRegen: 9 },
    mods: [mod('chaosRes', 'flat', 0.4)],
    skills: ['lay_brood_egg', 'web_shot', 'claw'], xp: 42, tag: 'predator', faction: 'beast', tags: ['beast'],
    gemBias: ['summon', 'projectile'],
    detection: 1.2,
    brain: { type: 'pack', move: { style: 'skitter', dart: [0.35, 0.6], pause: [0.2, 0.5] } },
  },

  // --- THE SMALL LIVES (ambient prey; the refuge seam's showcase) -----------
  // A squirrel: all tail — and when spooked it makes FOR the nearest tree
  // and is simply gone up it (refuge).
  squirrel: {
    id: 'squirrel', name: 'Squirrel',
    color: '#a8704a', shape: 'oval', radius: 6, material: 'fur', look: 'squirrel',
    base: { life: 6, moveSpeed: 220, evasion: 85, mana: 0 },
    mods: [mod('detectability', 'more', -0.7)],
    skills: [], xp: 1, tag: 'critter', faction: 'beast', tags: ['beast'],
    detection: 0.1, drops: 0,
    scaleVariance: [0.85, 1.1],
    refuge: { kind: 'tree', text: 'darts up the tree!' },
    brain: {
      type: 'basic',
      morale: { skittish: { radius: 150, duration: [1.4, 2.4] } },
      move: { style: 'juke', hookEvery: [0.25, 0.55], hookArc: 1.35, freezeChance: 0.25, freeze: [0.2, 0.5] },
      tempo: { kite: 3.0, windedFor: [0.8, 1.3] },
    },
  },
  // A sand scorpion: prey that answers back — one weak sting, then scuttle.
  sand_scorpion: {
    id: 'sand_scorpion', name: 'Sand Scorpion',
    color: '#c8a86a', shape: 'oval', radius: 8, material: 'chitin', look: 'sand_scorpion',
    base: { life: 14, moveSpeed: 135, evasion: 55, armor: 20, mana: 0 },
    skills: ['claw'], xp: 3, tag: 'critter', faction: 'beast', tags: ['beast'],
    detection: 0.4, drops: 0,
    scaleVariance: [0.8, 1.2],
    brain: { type: 'basic', morale: { skittish: { radius: 90, duration: [0.8, 1.4] } } },
  },
  // THE ANT TRAIL: one marching line as one body — the WORM machinery worn
  // as pure ambience (a drawn file of tiny workers crossing the ground).
  ant_trail: {
    id: 'ant_trail', name: 'Ant Trail',
    color: '#7a5838', shape: 'oval', radius: 5, material: 'chitin', look: 'ant_trail',
    base: { life: 10, moveSpeed: 95, evasion: 40, mana: 0 },
    skills: [], xp: 1, tag: 'critter', faction: 'beast', tags: ['beast'],
    detection: 0.1, drops: 0,
    worm: { length: 7, spacing: 9, taper: 0.97 },
    brain: { type: 'basic' },
  },
  // The reed frog: spawns at the water's edge (WILDLIFE row `near`) and,
  // when spooked, DIVES — reaching its pond, it simply despawns (refuge).
  reed_frog: {
    id: 'reed_frog', name: 'Reed Frog',
    color: '#6aa848', shape: 'oval', radius: 7, material: 'slime', look: 'reed_frog',
    base: { life: 8, moveSpeed: 175, evasion: 75, mana: 0 },
    mods: [mod('detectability', 'more', -0.6)],
    skills: [], xp: 1, tag: 'critter', faction: 'beast', tags: ['beast'],
    detection: 0.15, drops: 0,
    scaleVariance: [0.8, 1.2],
    refuge: { kind: 'water', text: 'dives!' },
    brain: {
      type: 'basic',
      morale: { skittish: { radius: 130, duration: [1.0, 1.8] } },
      move: { style: 'juke', hookEvery: [0.35, 0.7], hookArc: 1.2, freezeChance: 0.3, freeze: [0.25, 0.5] },
    },
  },

  // ==========================================================================
  // THE GROUND ITSELF — terrain-bound predators (MonsterDef.habitat: they
  // exist ONLY on their ground and can never leave it) and the standing
  // turret tier. Most also ARM (MonsterDef.ambush): scenery until sprung.
  // ==========================================================================

  // THE LAKE HORROR — the showpiece: bound to a large-enough body of water,
  // hidden beneath the surface until you stray near, and ENTICING: its
  // Undertow drags the shore's would-be spectators into its pool while the
  // current works them over. It cannot be kited onto the grass — fight it
  // in its water or shoot it from beyond the drag.
  lake_horror: {
    id: 'lake_horror', name: 'Lake Horror',
    color: '#3a7a8a', shape: 'octagon', radius: 19, material: 'slime', look: 'lake_horror',
    base: { life: 240, moveSpeed: 95, accuracy: 115, armor: 25, poise: 50, mana: 160, manaRegen: 10 },
    mods: [mod('coldRes', 'flat', 0.5), mod('chaosRes', 'flat', 0.3)],
    skills: ['undertow', 'claw', 'frostbolt'], xp: 55,
    habitat: { kind: 'water', minRadius: 55, grace: 30 },
    ambush: { radius: 170, announce: 'the water erupts!' },
    turnSpeed: 3.4,
    scaleVariance: [0.9, 1.3], scaleStats: true,
    scaling: { life: { incPerLevel: 0.06 } },
    vision: { arcDeg: 360, rearMul: 1 },
    detection: 1.2, brain: { type: 'basic' },
  },
  // THE ROOT WRAITH — sylvan corruption sleeping against a trunk: just
  // roots, right up until it is NOT. Bound to its tree; burns like one.
  root_wraith: {
    id: 'root_wraith', name: 'Root Wraith',
    color: '#6a7a38', shape: 'oval', radius: 14, material: 'wood', look: 'root_wraith',
    base: { life: 90, moveSpeed: 0, accuracy: 108, armor: 30, mana: 90, manaRegen: 8 },
    mods: [mod('fireRes', 'flat', -0.25)],
    skills: ['lash_roots', 'root_grasp'], xp: 24, faction: 'sylvan',
    habitat: { kind: 'tree', grace: 32 },
    ambush: { radius: 130, announce: 'the roots wake!' },
    vision: { arcDeg: 360, rearMul: 1 },
    detection: 1.0, brain: { type: 'basic' },
  },
  // THE MIRE MAW — a bog pool with an appetite: mud until it opens.
  mire_maw: {
    id: 'mire_maw', name: 'Mire Maw',
    color: '#5a5238', shape: 'oval', radius: 16, material: 'slime', look: 'mire_maw',
    base: { life: 110, moveSpeed: 0, accuracy: 105, armor: 20, mana: 110, manaRegen: 9 },
    mods: [mod('chaosRes', 'flat', 0.5)],
    skills: ['bile_spray', 'gut_hurl'], xp: 28,
    habitat: { kind: 'mud', minRadius: 40, grace: 26 },
    ambush: { radius: 120, announce: 'the mire opens!' },
    vision: { arcDeg: 360, rearMul: 1 },
    detection: 1.0, brain: { type: 'basic' },
  },
  // THE MAGMA LURKER — the pool with an appetite: bound to its lava (a
  // LIQUID now — wade in after it if you dare; the melt cooks the
  // uninsured and the heat wash licks the shore), mostly submerged until
  // prey strays near, then lobbing gouts of melt whose pools CLOSE like
  // cooling slag. Reachable BY DESIGN: crossable lava means no build is
  // locked out — the wade is the price, not a wall.
  magma_lurker: {
    id: 'magma_lurker', name: 'Magma Lurker',
    color: '#ff6a26', shape: 'oval', radius: 17, material: 'stone', look: 'magma_lurker',
    base: { life: 190, moveSpeed: 40, accuracy: 110, armor: 35, poise: 45, mana: 130, manaRegen: 9 },
    mods: [mod('fireRes', 'flat', 0.75), mod('coldRes', 'flat', -0.4)],
    immuneGround: ['lava', 'magma_core'],
    skills: ['magma_lob'], xp: 42,
    habitat: { kind: 'lava', minRadius: 44, grace: 26 },
    ambush: { radius: 165, announce: 'the melt boils!' },
    turnSpeed: 2.6,
    scaleVariance: [0.9, 1.25], scaleStats: true,
    vision: { arcDeg: 360, rearMul: 1 },
    detection: 1.1, brain: { type: 'basic' },
  },
  // THE VOID ANGLER — it fishes the living from the rim of its chasm: a
  // barbed hook of nothing REELS you toward the dark (and toward IT — the
  // drag is also melee's ticket to adjacency). Bound to ground no build
  // can stand on, so it carries noObjective BY LAW (the soft-lock guard):
  // it never gates a clear — an optional, loot-bearing menace, never a
  // wall between a build and the exit.
  void_angler: {
    id: 'void_angler', name: 'Void Angler',
    color: '#8a6ad4', shape: 'oval', radius: 16, look: 'void_angler',
    base: { life: 170, moveSpeed: 30, accuracy: 112, armor: 20, poise: 35, mana: 120, manaRegen: 9 },
    mods: [mod('chaosRes', 'flat', 0.6), mod('fireRes', 'flat', 0.2)],
    skills: ['void_hook'], xp: 46,
    habitat: { kind: 'chasm', minRadius: 38, grace: 34 },
    noObjective: true,
    ambush: { radius: 175, announce: 'something stirs in the dark below…' },
    turnSpeed: 2.8,
    vision: { arcDeg: 360, rearMul: 1 },
    detection: 1.2, brain: { type: 'basic' },
  },
  // THE RUIN CHANTER — the interrupt-or-eat-it elite: it closes, PLANTS,
  // and gathers Kindled Ruin under a bar the whole room can read — four
  // seconds to break the channel or clear the blast, and an early break
  // pays NOTHING (release.requireFull). Modest poise ON PURPOSE: focused
  // blows crack it, the sunder strips its CC-shrug, and the stun that
  // follows denies the finish outright — the counterplay ladder IS the
  // fight (poise → sunder → stun → silence).
  ruin_chanter: {
    id: 'ruin_chanter', name: 'Ruin Chanter',
    color: '#ff8a3a', shape: 'triangle', radius: 13, look: 'ruin_chanter',
    base: { life: 95, moveSpeed: 95, accuracy: 112, poise: 50, mana: 160, manaRegen: 10 },
    mods: [mod('fireRes', 'flat', 0.5)],
    skills: ['kindled_ruin', 'firebolt'], xp: 44,
    detection: 1.1, brain: { type: 'basic' },
  },
  // THE TIDE WHELK — the breathing shell made flesh: its frontal carapace
  // COVERAGE swells and wanes on a five-second tide (the shell glyph draws
  // the LIVE arc — read the ebb, strike the meat). ZERO poise on purpose:
  // the shell IS the structure; once you're through, stagger it freely.
  // The texture doctrine's reference: shell-instead-of-poise.
  tide_whelk: {
    id: 'tide_whelk', name: 'Tide Whelk',
    color: '#7ab0a0', shape: 'oval', radius: 15, material: 'chitin', look: 'tide_whelk',
    base: { life: 150, moveSpeed: 55, accuracy: 102, armor: 20, poise: 0, mana: 90, manaRegen: 7 },
    mods: [mod('coldRes', 'flat', 0.4)],
    skills: ['bile_spray'], xp: 32,
    shellGuard: {
      side: 'front', arcDeg: 230, max: 110, regenDelay: 4, regenRate: 20,
      color: '#9ad0c0', breathe: { period: 5, minFrac: 0.3 },
    },
    turnSpeed: 2.4,
    detection: 1.0, brain: { type: 'basic' },
  },
  // THE MAGMA SWIMMER — the lava-lane burrower: it dives only where the
  // ground BURNS and erupts under whatever lingers by the flows. Stand off
  // the basalt lanes and the pool cannot betray you (one def, one verb
  // line — the burrow vocabulary doing all the work).
  magma_swimmer: {
    id: 'magma_swimmer', name: 'Magma Swimmer',
    color: '#ff7a2a', shape: 'oval', radius: 13, material: 'stone', look: 'magma_swimmer',
    base: { life: 120, moveSpeed: 100, accuracy: 108, armor: 30, mana: 70, manaRegen: 6 },
    mods: [mod('fireRes', 'flat', 0.75), mod('coldRes', 'flat', -0.3)],
    immuneGround: ['lava', 'magma_core'],
    pathCosts: { lava: 0.45 }, // the lava-lane burrower RELISHES its element above dry ground
    skills: ['claw', 'firebolt'], xp: 36,
    worm: { length: 6, spacing: 15, taper: 0.88 },
    detection: 1.2,
    brain: {
      type: 'skirmish', withdraw: 1.1,
      // TREMOR-SENSE (xray): it reads prey through stone — a swimmer of
      // rock hears feet, not faces. Its bolts still need the firing line.
      perception: { xray: true },
      rules: [{
        when: { distUnder: 650 }, every: [9, 14], hold: [0.3, 0.5],
        actions: [{ do: 'burrow', kinds: ['lava'], damageFrac: 0.24, emergeRadius: 70, announce: 'the lava churns…' }],
      }],
    },
  },
  // THE SNOW SWIMMER — the tundra's white wake: it slips under drifts and
  // ice sheets and surfaces in a spray of powder. Fight it off the snow.
  snow_swimmer: {
    id: 'snow_swimmer', name: 'Snow Swimmer',
    color: '#cfe4f0', shape: 'oval', radius: 12, material: 'ice', look: 'snow_swimmer',
    base: { life: 100, moveSpeed: 115, accuracy: 106, evasion: 40, mana: 70, manaRegen: 6 },
    mods: [mod('coldRes', 'flat', 0.75), mod('fireRes', 'flat', -0.3)],
    skills: ['claw', 'frostbolt'], xp: 32,
    worm: { length: 5, spacing: 14, taper: 0.9 },
    detection: 1.2,
    brain: {
      type: 'skirmish', withdraw: 1.2,
      // Tremor-sense (xray): it feels footfalls through the pack.
      perception: { xray: true },
      rules: [{
        when: { distUnder: 650 }, every: [9, 14], hold: [0.3, 0.5],
        actions: [{ do: 'burrow', kinds: ['snowdrift', 'ice'], damageFrac: 0.2, emergeRadius: 65, announce: 'the snow shifts…' }],
      }],
    },
  },

  // --- THE RIMEBOUND (the Winter Court: the cold belt claims a NAME) --------
  // Patron of tundra AND taiga (biomes.ts) — the frost finally has natives,
  // and Deepwinter's marching front fields them wherever it converts.
  // DEFENSE TEXTURE (the enemy-feel doctrine): the SHIELD-WALL band — the
  // court fights behind raised guards and rime plate (blockChance as the
  // family signature, a pole no other family claims), with ES-glass on the
  // wight tier (the brittle shell) and near-zero evasion everywhere. The
  // counterlever is FIRE: every court body runs a fireRes debt — melt the
  // wall or crack it, but you won't dodge-fish it. Their OFFENSE leans the
  // chill→frozen buildup ladder (rime_fang), so a cornering pack is a
  // countdown. Silhouettes read at a glance: icicle-ruffed hound, split-open
  // frozen dead, antlered ice-orb shaman, bannered knight, tusked hammer
  // giant, the crowned King. Warlord: the Winter King (WARLORD_OF).
  rime_hound: {
    id: 'rime_hound', name: 'Rime Hound',
    color: '#bfe0ee', shape: 'triangle', radius: 11, material: 'fur', look: 'rime_hound',
    base: { life: 30, moveSpeed: 185, accuracy: 92, evasion: 40, mana: 0 },
    mods: [mod('coldRes', 'flat', 0.5), mod('fireRes', 'flat', -0.2)],
    skills: ['rime_fang'],
    xp: 10,
    // Court hounds run in coursing packs: dart in, chill, wheel away — the
    // freeze ladder climbs across the PACK's bites, not any one dog's.
    brain: { type: 'skirmish', withdraw: 1.1 },
  },
  hoarfrost_wight: {
    id: 'hoarfrost_wight', name: 'Hoarfrost Wight',
    color: '#cfe8f4', shape: 'pentagon', radius: 12, material: 'ice', look: 'hoarfrost_wight',
    // ES-GLASS tier: the rime shell IS the body — burst deletes it between
    // recharges; sustain grinds the recharge gate (doctrine pole).
    base: { life: 26, energyShield: 60, moveSpeed: 135, accuracy: 96, mana: 60, manaRegen: 6 },
    mods: [mod('coldRes', 'flat', 0.75), mod('fireRes', 'flat', -0.25)],
    skills: ['rime_fang', 'frostbolt'],
    xp: 22,
    // The shell keeps its word: broken, it SHATTERS — a coalescing implosion
    // of cold (stand off the corpse, or eat the chill it saved for you).
    deathBurst: { mode: 'implode', damageFrac: 0.5, damageType: 'cold', coalesce: 0.7 },
    brain: { type: 'skirmish', withdraw: 1.2 },
  },
  glacier_shaman: {
    id: 'glacier_shaman', name: 'Glacier Shaman',
    color: '#8ecce8', shape: 'diamond', radius: 13, material: 'cloth', look: 'glacier_shaman',
    base: { life: 46, moveSpeed: 105, mana: 190, manaRegen: 11 },
    mods: [mod('coldRes', 'flat', 0.75), mod('fireRes', 'flat', -0.25)],
    // THE ICE-LAYER: the comet leaves a sheet of REAL slide-ice (the same
    // leaveTerrain lever the player's Icy Comet pulls) — the shaman turns
    // the arena's floor into court ground while the nova guards its skirts.
    skills: ['icy_comet', 'frost_nova', 'frostbolt'],
    xp: 30,
    brain: {
      type: 'caster',
      skillUse: { mode: 'priority', order: ['icy_comet', 'frost_nova', 'frostbolt'] },
    },
  },
  winter_herald: {
    id: 'winter_herald', name: 'Winter Herald',
    color: '#a8d4e8', shape: 'cross', radius: 15, material: 'metal', look: 'winter_herald',
    base: { life: 120, moveSpeed: 115, accuracy: 100, armor: 25, mana: 80, manaRegen: 6, poise: 55 },
    mods: [mod('coldRes', 'flat', 0.75), mod('fireRes', 'flat', -0.2), mod('blockChance', 'flat', 0.25)],
    skills: ['rallying_howl', 'war_cry', 'heavy_strike'],
    xp: 40,
    brain: { type: 'commander' },
  },
  frost_giant: {
    id: 'frost_giant', name: 'Frost Giant',
    color: '#9cc8e0', shape: 'hexagon', radius: 26, material: 'ice', look: 'frost_giant',
    // THE WALL: block + plate + poise on the same slow body — the court's
    // heavy answer. Commit through the guard or bring the fire it fears.
    base: { life: 320, moveSpeed: 78, accuracy: 95, armor: 50, poise: 60, mana: 60, manaRegen: 5 },
    mods: [mod('coldRes', 'flat', 0.75), mod('fireRes', 'flat', -0.3), mod('blockChance', 'flat', 0.3)],
    // Shield Up is the player's own guard verb — the giant raises the same
    // wall (readable at a glance) and answers from behind it.
    skills: ['shield_up', 'ground_slam', 'heavy_strike'],
    xp: 65,
    brain: { type: 'juggernaut', enrage: 0.4 },
  },
  // THE WINTER KING — the court's crown and Deepwinter's cure: the warlord
  // machinery seats him over Rimebound territory, and the frost front raises
  // him (Crowned) at its glacial heart — fell him there and the winter
  // breaks. Shield Up + Avalanche: the player's own catalog, worn as a kit.
  winter_king: {
    id: 'winter_king', name: 'the Winter King',
    color: '#dcf2fc', shape: 'star', radius: 22, material: 'ice', look: 'winter_king',
    // The marquee bar (boss-bar contract): a crown holds court under its own
    // banner — the ladder below gives it three pips.
    boss: true,
    base: { life: 260, moveSpeed: 92, accuracy: 105, armor: 40, poise: 80, mana: 160, manaRegen: 10 },
    mods: [mod('coldRes', 'flat', 0.8), mod('fireRes', 'flat', -0.25), mod('blockChance', 'flat', 0.3)],
    // The arena kit (winters_sweep / call_of_the_deep / glare_ice) INTERPLAYS
    // with the glacial heart: shoves the ice keeps carrying, pulls that park
    // you in the blades' path, slick that makes both worse. His poise-folded
    // weight is his only shove insurance ON PURPOSE — break the poise and a
    // knockback build may hurl the King into his own deep: the pitfall
    // fabric credits the shover and the winter honestly breaks.
    skills: ['shield_up', 'avalanche', 'frost_nova', 'heavy_strike',
      'winters_sweep', 'call_of_the_deep', 'glare_ice'],
    xp: 90,
    faction: 'rimebound',
    // The crown answers insult with the whole court.
    aggro: { fury: 1.4, waver: 0.6 },
    brain: {
      type: 'juggernaut', enrage: 0.35,
      // THE HP LADDER (three-pip bar): the court first, the lake itself second.
      phases: [
        { atLifeFrac: 0.66, announce: 'the lake glazes over — the King breathes!',
          mods: [mod('castSpeed', 'more', 0.15)] },
        { atLifeFrac: 0.33, announce: 'the deep answers its King!',
          mods: [mod('moveSpeed', 'more', 0.2), mod('castSpeed', 'more', 0.1)] },
      ],
      rules: [{
        when: { distUnder: 520 }, every: [14, 20], hold: [0.4, 0.6],
        announce: 'the King calls the hunt!',
        actions: [{ do: 'summon', monster: 'rime_hound', count: 3, ring: 52 }],
      }, {
        // Past the first breath the court's lake-dancers answer too.
        when: { distUnder: 520, lifeBelow: 0.66 }, every: [18, 26], hold: [0.3, 0.5],
        announce: 'skate them down!',
        actions: [{ do: 'summon', monster: 'rime_skater', count: 2, ring: 70 }],
      }],
    },
  },

  // THE RIME SKATER — the Court's lake-dancer: a blade-shinned courtier who
  // treats glare ice as a ballroom (pathCosts RELISH — lanes and slicks are
  // its preferred roads, the wayfaring fabric's mind lever) and closes with a
  // dash you hear coming. Fast, brittle, readable: the tall thin silhouette
  // + long blade shins ARE the tell — if it's upright and gliding, it lunges.
  rime_skater: {
    id: 'rime_skater', name: 'Rime Skater',
    color: '#c8ecf8', shape: 'diamond', radius: 12, material: 'ice', look: 'rime_skater',
    base: { life: 60, moveSpeed: 150, accuracy: 112, evasion: 40, poise: 10, mana: 60, manaRegen: 6 },
    mods: [mod('coldRes', 'flat', 0.7), mod('fireRes', 'flat', -0.3)],
    skills: ['dash_strike'],
    xp: 26,
    faction: 'rimebound',
    // Ice is a ballroom, not a hazard: relish keeps it ON lanes and slicks.
    pathCosts: { ice: 0.5 },
    packSize: [2, 4],
    brain: { type: 'flanker' },
  },

  // THE RIME WRECKER — the Court's battering ram: a hunched slab of pack-ice
  // muscle whose whole argument is the SHOVE (guard-bash knockback through
  // the one BASH grammar). On the heart's lake it is the arena made flesh —
  // it lines you up with the blades and the deep; everywhere else it is
  // simply a door that walks. Slow, heavy, telegraphed: the low wide
  // ram-horned silhouette reads "do not be in front of this".
  rime_wrecker: {
    id: 'rime_wrecker', name: 'Rime Wrecker',
    color: '#9cc4d8', shape: 'oval', radius: 17, material: 'ice', look: 'rime_wrecker',
    base: { life: 170, moveSpeed: 70, accuracy: 100, armor: 35, poise: 70, mana: 40, manaRegen: 4 },
    mods: [mod('coldRes', 'flat', 0.7), mod('fireRes', 'flat', -0.25)],
    skills: ['shield_up', 'heavy_strike'],
    xp: 40,
    faction: 'rimebound',
    packSize: [1, 2],
    brain: { type: 'juggernaut' },
  },

  // THE BOG DWELLER — the mire maw's MOBILE cousin: a hunched sod-back that
  // slogs its bog and never leaves it, lobbing slow, hungry globs of mire
  // (mirespume: lightly seeking, shedding contracting venom pools in
  // flight) while its own body seeps a closing slick wherever it walks
  // (the body-wake kit-part). Fight it on its ground and the ground fills
  // in behind you; shoot it from the grass and eat the lob anyway.
  bog_dweller: {
    id: 'bog_dweller', name: 'Bog Dweller',
    color: '#5a7a42', shape: 'oval', radius: 15, material: 'slime', look: 'bog_dweller',
    base: { life: 150, moveSpeed: 62, accuracy: 108, armor: 15, poise: 45, mana: 140, manaRegen: 9 },
    mods: [mod('chaosRes', 'flat', 0.6), mod('fireRes', 'flat', -0.2)],
    skills: ['mirespume'], xp: 34,
    habitat: { kind: 'bog', minRadius: 38, grace: 30 },
    wake: { skillId: 'venom_seep', everyDist: 64 },
    ambush: { radius: 150, announce: 'the bog heaves upright!' },
    turnSpeed: 3.0,
    scaleVariance: [0.9, 1.25], scaleStats: true,
    scaling: { life: { incPerLevel: 0.05 } },
    vision: { arcDeg: 360, rearMul: 1 },
    detection: 1.1, brain: { type: 'basic' },
  },
  // --- THE SCAVENGER WEB — the death-fed kit-parts, worn as ordinary data ---
  // (carrion / stalk composables — see MonsterDef — plus death division via
  // the brain's onDeath rattle, THE seam for it. Nothing below is bespoke.)
  quag_gel: {
    id: 'quag_gel', name: 'Quag Gel',
    color: '#7fa04e', shape: 'oval', radius: 16, material: 'slime',
    base: { life: 64, moveSpeed: 92, accuracy: 88, poise: 20, mana: 0 },
    mods: [mod('chaosRes', 'flat', 0.45), mod('fireRes', 'flat', -0.25)],
    skills: ['claw'], xp: 15,
    faction: 'wild', tags: ['ooze'],
    // Terrain-bound to its own poured ground (the gel_pool dressing): the
    // gel fights from its shallows and cannot be kited onto dry land.
    habitat: { kind: 'gel_pool', minRadius: 36, grace: 28 },
    scaleVariance: [0.9, 1.3], scaleStats: true,
    turnSpeed: 4,
    // Death division rides THE seam for it — the brain's death rattle
    // (the viscous_ooze precedent).
    brain: { type: 'basic', onDeath: [{ do: 'summon', monster: 'quag_gelling', count: 3, ring: 26 }] },
  },
  quag_gelling: {
    id: 'quag_gelling', name: 'Quag Gelling',
    color: '#95b862', shape: 'circle', radius: 8, material: 'slime',
    base: { life: 16, moveSpeed: 150, accuracy: 80, mana: 0 },
    skills: ['claw'], xp: 4,
    faction: 'wild', tags: ['ooze'],
    brain: { type: 'swarm' },
  },
  // The brood carried to term: killing her IS the fight's second half.
  bloat_mother: {
    id: 'bloat_mother', name: 'Bloat Mother',
    color: '#a8506a', shape: 'oval', radius: 19,
    base: { life: 130, moveSpeed: 70, accuracy: 90, poise: 35, mana: 0 },
    skills: ['claw'], xp: 30,
    faction: 'wild', tags: ['beast'],
    presence: { from: 7, fadeIn: 4 },
    turnSpeed: 3.5,
    brain: { type: 'basic', onDeath: [{ do: 'summon', monster: 'blood_mite', count: 5, ring: 32 }] },
  },
  // The gaze-frozen cat: hold your aim on it and it holds its ground.
  marsh_stalker: {
    id: 'marsh_stalker', name: 'Marsh Stalker',
    color: '#5e7a62', shape: 'kite', radius: 13, look: 'barbed_stalker',
    base: { life: 52, moveSpeed: 196, accuracy: 102, evasion: 65, mana: 0 },
    skills: ['claw'], xp: 19,
    tag: 'predator', faction: 'beast', tags: ['beast'],
    detection: 1.4, vision: { arcDeg: 220, rearMul: 0.4 },
    adorn: 'ears',
    brain: {
      type: 'basic',
      move: { style: 'lurk', ring: 240, commitRange: 230, unseenArc: 1.5 },
      behavior: { stalk: { arcDeg: 80 }, spacing: 26 },
      drives: { hunger: { rise: 0.008, start: [0.2, 0.6], onKill: -0.6 } },
      perception: { memory: 4 },
    },
  },
  // The statue that was never a statue: it advances ONLY between glances —
  // stalk creep 0 + slow turn + all-around senses = the weeping-angel dread.
  pale_watcher: {
    id: 'pale_watcher', name: 'Pale Watcher',
    color: '#cdd0dc', shape: 'pentagon', radius: 14, material: 'stone',
    base: { life: 110, moveSpeed: 165, accuracy: 105, armor: 35, poise: 50, mana: 0 },
    mods: [mod('coldRes', 'flat', 0.4), mod('chaosRes', 'flat', 0.3)],
    skills: ['claw'], xp: 32,
    faction: 'undead', tags: ['construct'],
    turnSpeed: 2.6,
    detection: 1.2, vision: { arcDeg: 360, rearMul: 1 },
    presence: { from: 9, fadeIn: 4 },
    brain: {
      type: 'basic',
      behavior: { stalk: { arcDeg: 120, creep: 0 } },
      perception: { memory: 6 },
    },
  },
  // The larder-thief: it heals off the same corpses your grimoire wants.
  carrion_shrike: {
    id: 'carrion_shrike', name: 'Carrion Shrike',
    color: '#8a7f9c', shape: 'kite', radius: 12, look: 'vulture',
    base: { life: 40, moveSpeed: 185, accuracy: 96, evasion: 60, mana: 0 },
    skills: ['claw', 'take_wing'], xp: 16,
    tag: 'predator', faction: 'beast', tags: ['beast'],
    detection: 1.5, adorn: 'wings',
    carrion: { radius: 420, rate: 0.09, time: 1.8 },
    brain: {
      type: 'skirmish', withdraw: 1.1,
      target: { prey: ['critter'] },
      behavior: { dodge: { chance: 0.7, reaction: [0.12, 0.3], exit: 'away' } },
    },
  },
  gravemaw_hound: {
    id: 'gravemaw_hound', name: 'Gravemaw Hound',
    color: '#6d6a58', shape: 'kite', radius: 13, look: 'hound',
    base: { life: 58, moveSpeed: 182, accuracy: 98, evasion: 35, mana: 0 },
    skills: ['claw'], xp: 22,
    tag: 'predator', faction: 'beast', tags: ['beast'],
    detection: 1.4, adorn: 'ears',
    carrion: { radius: 360, rate: 0.07, time: 2.4 },
    bond: {
      mods: [mod('damage', 'increased', 0.2), mod('moveSpeed', 'increased', 0.1)],
      kin: 'gravemaw_hound', radius: 420,
    },
    scaleVariance: [0.9, 1.2],
    presence: { from: 5, fadeIn: 3 },
    brain: { type: 'pack', squad: { muster: { count: 2, radius: 320, patience: 5 }, tokens: 2, surround: true } },
  },
  // THE SHARD SPIRE — a standing battery of charged crystal: the leyline's
  // own turret tier (visible from the start; its menace is the arc).
  shard_spire: {
    id: 'shard_spire', name: 'Shard Spire',
    color: '#7fd0ff', shape: 'octagon', radius: 14, material: 'crystal', look: 'shard_spire',
    base: { life: 100, moveSpeed: 0, accuracy: 115, armor: 40, mana: 200, manaRegen: 14 },
    mods: [mod('lightningRes', 'flat', 0.6), mod('coldRes', 'flat', 0.3)],
    skills: ['spark', 'frostbolt'], xp: 26, faction: 'elemental',
    vision: { arcDeg: 360, rearMul: 1 },
    detection: 1.1, brain: { type: 'basic' },
  },
  // ======================= THE KARST STONEKIN ==============================
  // The Karst Country's elemental garrison — stone that STARES, LOBS, HOLDS,
  // and SPILLS. Four defense textures, none repeated from the shelled
  // families: the basilisk is an evasive skirmisher whose STARE does the
  // fighting (petrifying_gaze — the weald's watcher-stone pressure with
  // feet); the warden wears a stone shell that NEVER KNITS (regenRate 0 —
  // crack it once and it stays cracked, the anti-scarab: burst opens it
  // early, sustain grinds the naked poise after); the slinger's armor is
  // the CHASM between you (glass up close, artillery across a gap — the
  // Reach's geometry IS its statline); the shambler is the poise wall that
  // spills into skittering chaff when it breaks (the one death-division
  // seam, no bespoke split). Family counterlevers: stone conducts nothing
  // (lightningRes credit) but old stone SHATTERS under cold's wedge
  // (coldRes debt — the freeze-thaw law). All four join stone_sentinel's
  // crowned family (WARLORD_OF.elemental) rather than minting a faction.
  basilisk: {
    id: 'basilisk', name: 'Basilisk',
    color: '#9a948a', shape: 'triangle', radius: 13, material: 'stone', look: 'basilisk',
    base: { life: 70, moveSpeed: 122, accuracy: 108, armor: 10, evasion: 55, poise: 0, mana: 60, manaRegen: 6 },
    mods: [mod('lightningRes', 'flat', 0.4), mod('coldRes', 'flat', -0.25)],
    skills: ['petrifying_gaze', 'talon_rake'], xp: 30,
    faction: 'elemental',
    tags: ['beast'],
    temper: 'wary',
    brain: { type: 'basic' },
  },
  petrified_warden: {
    id: 'petrified_warden', name: 'Petrified Warden',
    color: '#7d7868', shape: 'hexagon', radius: 17, material: 'stone', look: 'petrified_warden',
    base: { life: 150, moveSpeed: 84, accuracy: 100, armor: 40, poise: 30, evasion: 0, mana: 30, manaRegen: 4 },
    mods: [mod('lightningRes', 'flat', 0.4), mod('coldRes', 'flat', -0.25)],
    skills: ['heavy_strike', 'ground_slam'], xp: 44,
    faction: 'elemental',
    tags: ['construct'],
    // The never-knitting shell: regenRate 0 is honored (?? keeps zeros) —
    // the crack is PERMANENT. Distinct on purpose from the scarab's
    // regrowing plate and the sarcophate's slow-knitting linen.
    shellGuard: { side: 'all', max: 150, regenDelay: 9999, regenRate: 0, color: '#8a8578' },
    turnSpeed: 2.6, post: true, temper: 'territorial',
    brain: { type: 'juggernaut', enrage: 0.4 },
  },
  karst_slinger: {
    id: 'karst_slinger', name: 'Karst Slinger',
    color: '#a89f8a', shape: 'pentagon', radius: 12, material: 'stone', look: 'karst_slinger',
    base: { life: 55, moveSpeed: 100, accuracy: 112, armor: 15, evasion: 20, poise: 10, mana: 40, manaRegen: 5 },
    mods: [mod('lightningRes', 'flat', 0.4), mod('coldRes', 'flat', -0.25)],
    skills: ['hurl_debris'], xp: 24,
    grants: [{ atLevel: 8, chance: 0.5, skill: 'splinter_volley' }],
    faction: 'elemental',
    tags: ['construct'],
    temper: 'wary',
    brain: { type: 'basic' },
  },
  scree_shambler: {
    id: 'scree_shambler', name: 'Scree Shambler',
    color: '#8a8270', shape: 'octagon', radius: 20, material: 'stone', look: 'scree_shambler',
    base: { life: 210, moveSpeed: 78, accuracy: 96, armor: 55, poise: 70, evasion: 0, mana: 30, manaRegen: 3 },
    mods: [mod('lightningRes', 'flat', 0.4), mod('coldRes', 'flat', -0.25)],
    skills: ['ground_slam', 'hurl_debris'], xp: 52,
    faction: 'elemental',
    tags: ['construct'],
    turnSpeed: 2.4, temper: 'territorial',
    brain: {
      type: 'juggernaut', enrage: 0.35,
      onDeath: [{ do: 'summon', monster: 'scree_skitter', count: 2, ring: 26, announce: 'the shambler spills apart!' }],
    },
  },
  scree_skitter: {
    id: 'scree_skitter', name: 'Scree Skitter',
    color: '#9a948a', shape: 'triangle', radius: 8, material: 'stone', look: 'scree_skitter',
    base: { life: 26, moveSpeed: 150, accuracy: 100, armor: 8, evasion: 40, poise: 0, mana: 0 },
    skills: ['claw'], xp: 8,
    faction: 'elemental',
    tags: ['construct'],
    temper: 'territorial',
    brain: { type: 'basic' },
    // Spilled FLAKES, not blocks: heft undercuts stone's density so the
    // shambler's chaff flies from a cleave — the mass fabric's bowling
    // pins (engine/mass.ts; a plowing body scatters them by the row).
    heft: 0.45,
  },
  // --- THE WEIGHT LESSON (the mass fabric, engine/mass.ts) ------------------
  // Two stonekin who teach mass AT A GLANCE, one from each end of the scale.
  // The sarsen ram is the quarry's avalanche: a charging block (the aurochs'
  // charge kernel on stone rails) whose gore carries a knockback strength
  // worth a wall's attention — its authority (radius × stone density ×
  // poise anchor) multiplies the launch, and impact finishes what the horns
  // start. The lode thrall is the DENSITY EXCEPTION that proves the material
  // rule: knee-high, ore-dense (metal × heft ≈ weight 2.5) — the smallest
  // body in the country and the hardest to move, read instantly by the
  // anchor it wears. Counterlevers stay material-honest: the ram keeps the
  // stonekin freeze-thaw debt; the thrall CONDUCTS (lightning debt) where
  // stone never did, and shrugs fire like the ore it is.
  sarsen_ram: {
    id: 'sarsen_ram', name: 'Sarsen Ram',
    color: '#8f8874', shape: 'hexagon', radius: 22, material: 'stone', look: 'sarsen_ram',
    base: { life: 190, moveSpeed: 96, accuracy: 102, armor: 45, poise: 50, evasion: 0, mana: 30, manaRegen: 3 },
    mods: [
      mod('lightningRes', 'flat', 0.4), mod('coldRes', 'flat', -0.25),
      mod('knockback', 'flat', 240, ['melee']),
    ],
    skills: ['heavy_strike'], xp: 48,
    faction: 'elemental',
    tags: ['construct'],
    turnSpeed: 2.2, temper: 'territorial',
    brain: { type: 'juggernaut', enrage: 0.4, move: { style: 'charge', commitRange: 360, chargeSpeed: 2.7 } },
    heft: 1.15,
  },
  lode_thrall: {
    id: 'lode_thrall', name: 'Lode Thrall',
    color: '#6d7076', shape: 'hexagon', radius: 10, material: 'metal', look: 'lode_thrall',
    base: { life: 95, moveSpeed: 58, accuracy: 100, armor: 70, poise: 25, evasion: 0, mana: 0 },
    mods: [mod('lightningRes', 'flat', -0.3), mod('fireRes', 'flat', 0.35)],
    skills: ['heavy_strike'], xp: 34,
    faction: 'elemental',
    tags: ['construct'],
    turnSpeed: 2.0, temper: 'territorial',
    brain: { type: 'juggernaut' },
    heft: 2.2,
  },
  // --- THE HAUNTING's bodies (spawned by the package, never rostered) -------
  // THE GRIEF-ANCHOR: a standing knot of sorrow the haunting winds around.
  // Breaking it doesn't end the grief — it gives the grief a THROAT (the
  // kill handler manifests the Wailing One over the shards).
  grief_anchor: {
    id: 'grief_anchor', name: 'Grief-Anchor',
    color: '#b8c8e8', shape: 'octagon', radius: 14, material: 'ethereal', look: 'grief_anchor',
    base: { life: 200, moveSpeed: 0, armor: 20, mana: 0 },
    mods: [mod('chaosRes', 'flat', 0.5), mod('coldRes', 'flat', 0.4)],
    skills: [], xp: 30, faction: 'undead',
    noNemesis: true, drops: 1,
    vision: { arcDeg: 360, rearMul: 1 },
  },
  // THE WAILING ONE: the grief, given a body — keening, cursing, hurling
  // whatever isn't nailed down, and calling its gloomlings at the half.
  wailing_one: {
    id: 'wailing_one', name: 'the Wailing One',
    color: '#d8e0f0', shape: 'star', radius: 18, material: 'ethereal', look: 'wailing_one',
    base: { life: 380, moveSpeed: 130, accuracy: 125, evasion: 55, mana: 240, manaRegen: 13 },
    mods: [mod('chaosRes', 'flat', 0.5), mod('coldRes', 'flat', 0.4), mod('damage', 'increased', 0.25)],
    skills: ['keening_shriek', 'despair', 'hurl_debris'], xp: 150, boss: true, faction: 'undead',
    detection: 1.4,
    brain: {
      type: 'commander',
      phases: [
        { atLifeFrac: 0.5, rewardGems: 1, announce: 'The wail SPLITS — its griefs take shape!',
          mods: [mod('damage', 'more', 0.25), mod('castSpeed', 'more', 0.2)] },
      ],
      rules: [{
        when: { lifeBelow: 0.5 }, every: [11, 15], hold: [0.3, 0.5],
        actions: [{ do: 'summon', monster: 'gloomling', count: 2, ring: 90, lifespan: 30, tag: 'grief_add' }],
      }],
    },
  },
  // THE SPIRE OF EYES — the Glut's watchtower: a stalk of meat that is
  // mostly retina, hurling gutshot at everything it refuses to blink at.
  spire_of_eyes: {
    id: 'spire_of_eyes', name: 'Spire of Eyes',
    color: '#c87868', shape: 'oval', radius: 15, look: 'spire_of_eyes',
    base: { life: 120, moveSpeed: 0, accuracy: 120, armor: 15, mana: 160, manaRegen: 11 },
    mods: [mod('chaosRes', 'flat', 0.4)],
    skills: ['gut_hurl', 'bile_spray'], xp: 30, faction: 'flesh',
    vision: { arcDeg: 360, rearMul: 1 },
    detection: 1.4, // it is ALL eyes
    brain: { type: 'basic' },
  },

  // ==========================================================================
  // THE COMPOSABLE ROUND — shells that break and regrow, backs that guard,
  // ground that swallows, bonds that must be burst first, and a trap that is
  // nothing but three existing seams holding hands (ambush + summon + nova).
  // ==========================================================================

  // THE MOLTING BEHEMOTH — the exoskeleton showcase: a full-shell absorb
  // that knits back after quiet seconds. Burst it through the break window
  // or fight the whole pool twice. Slow of foot AND of face (turnSpeed).
  molting_behemoth: {
    id: 'molting_behemoth', name: 'Molting Behemoth',
    color: '#a8925a', shape: 'octagon', radius: 23, material: 'chitin', look: 'molting_behemoth',
    // THE DELIBERATE APEX EXCEPTION: full shell AND real poise on one body
    // — the rare wall the doctrine otherwise forbids (full-shells carry no
    // poise; poise-bodies carry thin shells). One per biome tier at most,
    // presence-gated deep: when it appears, it should feel like weather.
    base: { life: 380, moveSpeed: 85, accuracy: 115, armor: 40, poise: 70, mana: 40, manaRegen: 4 },
    skills: ['heavy_strike', 'ground_slam'], xp: 85,
    shellGuard: { side: 'all', max: 260, regenDelay: 5, regenRate: 45, color: '#d8c88a' },
    turnSpeed: 2.6,
    scaling: { life: { incPerLevel: 0.06 } },
    detection: 1.0,
    // BODY-AIMED (castArc × the slow turnSpeed): the slam waits for the
    // shoulders to come round and lands where the BODY points — keep moving
    // through its pivot and the blow breaks on empty ground behind you.
    brain: { type: 'juggernaut', enrage: 0.35, behavior: { castArc: 0.55 } },
  },
  // THE BULWARK SCUTTLER — the rear-shell tactician: back-armor as anatomy,
  // and when bloodied it TURTLES — rotating its shell into your blows (the
  // 'turtle' windows) while the slow pivot keeps circling honest.
  bulwark_scuttler: {
    id: 'bulwark_scuttler', name: 'Bulwark Scuttler',
    color: '#8a9a78', shape: 'hexagon', radius: 15, material: 'chitin', look: 'bulwark_scuttler',
    base: { life: 130, moveSpeed: 125, accuracy: 105, armor: 35, mana: 25, manaRegen: 3, poise: 50 },
    skills: ['claw', 'heavy_strike'], xp: 34,
    shellGuard: { side: 'rear', max: 140, regenDelay: 4, regenRate: 30, color: '#a8c890' },
    turnSpeed: 3.0,
    detection: 1.1,
    brain: {
      type: 'juggernaut',
      rules: [{
        when: { lifeBelow: 0.6 }, every: [8, 12], hold: [2.5, 3.5],
        use: { move: { style: 'turtle' } },
      }],
    },
  },
  // THE SAND WYRM — the burrow showpiece: it dives where sand or mud holds,
  // travels UNDER the field as a dust line, and ERUPTS beneath its prey.
  // Stand on grass and stone and the ground cannot betray you.
  sand_wyrm: {
    id: 'sand_wyrm', name: 'Sand Wyrm',
    color: '#c8ac6a', shape: 'oval', radius: 15, material: 'chitin', look: 'sand_wyrm',
    base: { life: 160, moveSpeed: 120, accuracy: 110, armor: 30, mana: 60, manaRegen: 6, poise: 45 },
    skills: ['claw'], xp: 40,
    worm: { length: 7, spacing: 16, taper: 0.88 },
    scaleVariance: [0.85, 1.2],
    detection: 1.2,
    brain: {
      type: 'juggernaut',
      // Tremor-sense (xray): the dune reads weight, not light.
      perception: { xray: true },
      rules: [{
        when: { distUnder: 700 }, every: [9, 14], hold: [0.3, 0.5],
        actions: [{ do: 'burrow', kinds: ['sand', 'mud'], damageFrac: 0.24, emergeRadius: 75, announce: 'the sand shifts...' }],
      }],
    },
  },
  // THE MIRE BURROWER — the wet cousin: it swims the mud between pools.
  mire_burrower: {
    id: 'mire_burrower', name: 'Mire Burrower',
    color: '#7a6a48', shape: 'oval', radius: 12, material: 'slime', look: 'mire_burrower',
    base: { life: 110, moveSpeed: 110, accuracy: 100, armor: 15, mana: 50, manaRegen: 5 },
    mods: [mod('chaosRes', 'flat', 0.3)],
    skills: ['claw', 'bile_spray'], xp: 30,
    worm: { length: 5, spacing: 14, taper: 0.9 },
    detection: 1.1,
    brain: {
      type: 'skirmish', withdraw: 1.2,
      // Tremor-sense (xray): the mud carries every step to it.
      perception: { xray: true },
      rules: [{
        when: { distUnder: 600 }, every: [10, 15], hold: [0.3, 0.5],
        actions: [{ do: 'burrow', kinds: ['mud'], damageFrac: 0.2, emergeRadius: 65, announce: 'the mire churns...' }],
      }],
    },
  },
  // THE GNOLL TRAPPER — the trap-layer: seeds jaw-snares around the fight
  // and shoots from behind them. The snare is pure composition: an ambush-
  // armed summoned body whose whole kit is one snap.
  gnoll_trapper: {
    id: 'gnoll_trapper', name: 'Gnoll Trapper',
    color: '#c8a060', shape: 'triangle', radius: 12, material: 'fur', look: 'gnoll_trapper',
    base: { life: 55, moveSpeed: 150, accuracy: 110, evasion: 55, mana: 60, manaRegen: 6 },
    skills: ['bone_arrow'], xp: 26, faction: 'gnoll', adorn: 'ears',
    detection: 1.2,
    brain: {
      type: 'skirmish', withdraw: 1.6,
      rules: [{
        when: {}, every: [10, 15], hold: [0.4, 0.6],
        actions: [{ do: 'summon', monster: 'jaw_snare', count: 1, ring: 70, lifespan: 45 }],
      }],
      // A LONER: the trapper works its own ground and all but ignores the
      // howler's bark.
      obedience: 0.35,
    },
  },
  // THE JAW SNARE — a trap with a heartbeat: hidden until stepped near,
  // then one iron snap and a held ankle. Three seams holding hands.
  jaw_snare: {
    id: 'jaw_snare', name: 'Jaw Snare',
    color: '#b0a890', shape: 'oval', radius: 7, material: 'metal', look: 'jaw_snare',
    base: { life: 18, moveSpeed: 0, armor: 30, mana: 0 },
    skills: ['snap_shut'], xp: 3,
    ambush: { radius: 42, announce: 'SNAP!' },
    noNemesis: true, drops: 0,
    vision: { arcDeg: 360, rearMul: 1 },
    detection: 2.0, brain: { type: 'basic' },
  },

  // ==========================================================================
  // THE PRIMEVAL — the world-boss sovereigns (packages/defs/worldboss.ts).
  // Rare forces of nature outside every war: contexts:['worldboss'] keeps the
  // whole family out of ordinary generation — these bodies exist only where
  // the WorldBossField stands them up. Each sovereign is a composite
  // (MonsterDef.parts silhouettes) driving a script FSM; the engine stamps
  // tag 'worldboss_boss' + the instance eventKey at spawn.
  // ==========================================================================

  // VHORUN, the Sunder-Wyrm — the TRUE WORLD SNAKE (the SEGMENT FABRIC's
  // debut, docs/engine/segments.md): a colossal head the whole body TRAILS,
  // every segment a real hittable body sharing the one life pool, scale
  // plates TEARING where you spread the damage (each tear stacks damage
  // taken on the wyrm and pops venom at the wound). It MOVES now — the
  // fight is the body: coils sweep the arena as it turns, the plates read
  // head/sail/tail at a glance, and Act II's burrow re-forms the spine at
  // the eruption. Head-cluster weakspots stay the PARTS fabric: the maw
  // (the prize) and two neck-coils, spread wide by the grown radius.
  primeval_wyrm_head: {
    id: 'primeval_wyrm_head', name: 'Vhorun, the Sunder-Wyrm',
    color: '#7fb069', shape: 'oval', radius: 72, material: 'chitin', look: 'sand_wyrm',
    base: { life: 1250, moveSpeed: 58, accuracy: 130, armor: 45, mana: 280, manaRegen: 14, weight: 9 },
    mods: [mod('chaosRes', 'flat', 0.4), mod('fireRes', 'flat', 0.3), mod('damage', 'increased', 0.4)],
    skills: ['venom_bolt', 'bile_spray', 'ground_slam'],
    xp: 900, boss: true, noNemesis: true, faction: 'primeval', tags: ['primeval'],
    detection: 1.4, vision: { arcDeg: 360, rearMul: 1 }, turnSpeed: 1.7,
    worm: {
      length: 26, spacing: 44, taper: 0.975,
      hittable: true,
      looks: { body: 'wyrm_plate', tail: 'wyrm_tail_spade', every: { n: 5, look: 'wyrm_sail' } },
      wounds: {
        frac: 0.05,
        mods: [mod('damageTaken', 'increased', 0.015)],
        text: 'SCALE TORN',
        burst: { radius: 95, damageFrac: 0.035, type: 'chaos', color: '#9fe07a' },
      },
    },
    ambush: { radius: 560, announce: 'The ground HEAVES — Vhorun rises!' },
    scaling: { life: { incPerLevel: 0.15 } },
    parts: [
      { monster: 'primeval_wyrm_maw', dx: 1.35, dy: 0, lifeFrac: 0.4, breakDamage: 0.16 },
      {
        monster: 'primeval_wyrm_coil', dx: -0.4, dy: 1.35, lifeFrac: 0.26, breakDamage: 0.08,
        breakMods: [mod('damageTaken', 'increased', 0.12)],
      },
      {
        monster: 'primeval_wyrm_coil', dx: -0.4, dy: -1.35, lifeFrac: 0.26, breakDamage: 0.08,
        breakMods: [mod('damageTaken', 'increased', 0.12)],
      },
    ],
    brain: {
      // A moving colossus CHASES — juggernaut locomotion under the same
      // 3-act script; the worm fabric's slither-weave rides the approach.
      type: 'juggernaut',
      script: [
        { // ACT I — the HUNTING COIL: it comes for you, spitting as it turns.
          id: 'coiled',
          cadences: [{ every: 5.5, first: 3, actions: [{ do: 'cast', skill: 'bile_spray', at: 'target', force: true }] }],
          goto: [{ to: 'thrash', atLifeFrac: 0.62 }],
        },
        { // ACT II — it THRASHES: burrows away and erupts anew (the spine
          // re-forms at the eruption), venom raining. Telegraphs scaled to
          // the colossus: bigger rings, longer wind-up, the same honesty.
          id: 'thrash',
          rewardGems: 1,
          announce: 'Vhorun THRASHES — the earth splits under it!',
          mods: [mod('damage', 'more', 0.3), mod('attackSpeed', 'increased', 0.2)],
          onEnter: [
            { do: 'teleport', to: 'awayFromTarget', range: 420 },
            { do: 'nova', skill: 'ground_slam', at: 'self', zoneRadius: 300, delay: 1.0, push: { strength: 260 } },
          ],
          cadences: [{ every: 7, actions: [{ do: 'ring', skill: 'venom_bolt', radius: 280, count: 9, waves: 1, delay: 0.9, at: 'anchor' }] }],
          goto: [{ to: 'fury', atLifeFrac: 0.28 }],
        },
        { // ACT III — the BROOD: its spawn boil up and WARD it; break the ward.
          id: 'fury',
          rewardGems: 2,
          announce: 'The Sunder-Wyrm keens — its brood answers!',
          mods: [mod('damage', 'more', 0.4)],
          onEnter: [
            { do: 'summon', monster: 'primeval_spawn', count: 5, ring: 320, at: 'anchor', tag: 'wyrm_brood' },
            { do: 'ward', tag: 'wyrm_brood', announce: 'The brood breaks — Vhorun is BARED!' },
          ],
          cadences: [{ every: 3, actions: [{ do: 'push', radius: 340, strength: 160, from: 'anchor' }] }],
          goto: [],
        },
      ],
    },
  },
  primeval_wyrm_maw: {
    id: 'primeval_wyrm_maw', name: 'Sunder-Maw',
    color: '#a4cc7e', shape: 'oval', radius: 40, material: 'chitin', look: 'leviathan_head',
    noNemesis: true, faction: 'primeval', tags: ['primeval'],
    base: { life: 220, moveSpeed: 0, mana: 140, manaRegen: 10, poise: 70 },
    skills: ['venom_bolt'], xp: 0,
    brain: { type: 'artillery' },
  },
  primeval_wyrm_coil: {
    id: 'primeval_wyrm_coil', name: 'Sunder-Coil',
    color: '#6a9458', shape: 'oval', radius: 34, material: 'chitin', look: 'wyrm_plate',
    noNemesis: true, faction: 'primeval', tags: ['primeval'],
    base: { life: 150, moveSpeed: 0, mana: 80, manaRegen: 6, poise: 50 },
    skills: ['whirling_reap'], xp: 0,
  },
  // The PASSING body — the glimpse as it slithers a zone: engine-wheeled
  // (driven), untouchable scenery-in-motion with a long trailing worm. It
  // wears the full segment KIT (plates/sails/tail) at world-snake scale so
  // the glimpse and the fight are unmistakably the SAME animal — but stays
  // fabric-OFF (no hittable): a passing myth, not a target.
  primeval_wyrm_passing: {
    id: 'primeval_wyrm_passing', name: 'Vhorun, the Sunder-Wyrm',
    color: '#7fb069', shape: 'oval', radius: 55, material: 'chitin', look: 'sand_wyrm',
    base: { life: 100, moveSpeed: 150, mana: 0 },
    remains: false, // organic dress, but an OBJECT — no corpse
    skills: [], xp: 0,
    faction: 'primeval', tags: ['primeval'],
    worm: {
      length: 30, spacing: 46, taper: 0.975,
      looks: { body: 'wyrm_plate', tail: 'wyrm_tail_spade', every: { n: 5, look: 'wyrm_sail' } },
    },
    driven: true, passive: true, invulnerable: true, untargetable: true,
    noNemesis: true, noBestiary: true,
  },

  // CRAGMAW, the Orogeny — the walking mountain (timed apparition). Two fist
  // silhouettes; sunder one and the slam is DISARMED. MYTHIC-SCALE PASS:
  // a mountain LOOMS — the hull and fists grew into the tier the name
  // promises (plain rescale, no segments: an orogeny is a mass, not a
  // chain), telegraphs scaled with the silhouette so the reads stay fair.
  primeval_cragmaw: {
    id: 'primeval_cragmaw', name: 'Cragmaw, the Orogeny',
    color: '#b0916a', shape: 'octagon', radius: 48, material: 'stone', look: 'golem',
    base: { life: 1050, moveSpeed: 46, accuracy: 125, armor: 85, mana: 220, manaRegen: 12, weight: 9 },
    mods: [mod('fireRes', 'flat', 0.3), mod('coldRes', 'flat', 0.3), mod('damage', 'increased', 0.4)],
    skills: ['ground_slam', 'hurl_debris', 'cleave'],
    xp: 780, boss: true, noNemesis: true, faction: 'primeval', tags: ['primeval'],
    detection: 1.3, turnSpeed: 1.8,
    scaling: { life: { incPerLevel: 0.15 } },
    parts: [
      { monster: 'primeval_cragmaw_fist', dx: 0.85, dy: 1.25, lifeFrac: 0.28, breakDamage: 0.1, breakDisables: ['ground_slam'] },
      {
        monster: 'primeval_cragmaw_fist', dx: 0.85, dy: -1.25, lifeFrac: 0.28, breakDamage: 0.1,
        breakMods: [mod('damageTaken', 'increased', 0.12)],
      },
    ],
    brain: {
      type: 'juggernaut',
      script: [
        { // ACT I — the MOUNTAIN WALKS: shockwave slams that hurl you back.
          id: 'mountain',
          cadences: [{ every: 4.5, first: 3, actions: [{ do: 'nova', skill: 'ground_slam', at: 'self', zoneRadius: 250, delay: 0.95, push: { strength: 260 } }] }],
          goto: [{ to: 'barrage', atLifeFrac: 0.55 }],
        },
        { // ACT II — the BARRAGE: it plants itself and rains the hillside down.
          id: 'barrage',
          use: { type: 'artillery' },
          rewardGems: 1,
          announce: 'Cragmaw tears the hillside loose — SHELTER!',
          mods: [mod('damage', 'more', 0.35), mod('attackSpeed', 'increased', 0.15)],
          cadences: [{ every: 6, actions: [{ do: 'ring', skill: 'hurl_debris', radius: 230, count: 6, waves: 2, waveGap: 0.5, delay: 1.0, at: 'anchor' }] }],
          goto: [{ to: 'landslide', atLifeFrac: 0.22 }],
        },
        { // ACT III — the LANDSLIDE: shards of it break off and swarm.
          id: 'landslide',
          use: { type: 'swarm' },
          rewardGems: 2,
          announce: 'The Orogeny CRUMBLES FORWARD — it will bury you!',
          mods: [mod('moveSpeed', 'more', 0.4), mod('damage', 'more', 0.4)],
          onEnter: [{ do: 'summon', monster: 'primeval_spawn', count: 4, ring: 260, at: 'anchor', tag: 'cragmaw_shard' }],
          cadences: [{ every: 2.8, actions: [{ do: 'push', radius: 300, strength: 160, from: 'anchor' }] }],
          goto: [],
        },
      ],
      impulses: [{ type: 'swarm', every: [7, 10], duration: [1.3, 1.8], announce: 'It charges — a rockslide with intent!' }],
    },
  },
  primeval_cragmaw_fist: {
    id: 'primeval_cragmaw_fist', name: 'Orogen Fist',
    color: '#9a7c56', shape: 'octagon', radius: 24, material: 'stone',
    noNemesis: true, faction: 'primeval', tags: ['primeval'],
    base: { life: 130, moveSpeed: 0, mana: 60, manaRegen: 6, poise: 60 },
    skills: ['cleave'], xp: 0,
  },

  // DOLMOURN, THE IRON BELL — the walking mausoleum of the karst country
  // (worldboss 'iron_bell', biome-locked apparition). Almost passive: glacial
  // pace, no charge, no chase — its MOVEMENT is the enemy. The brain's stride
  // beat casts ironbell_step at the colossus's OWN next foot placement (the
  // at:'ahead' verb — the ground decal burns there for the whole 2.6s bar,
  // the cast roots the hull, then ordinary walking carries it INTO its own
  // crater: the mausoleum gait, from stock machinery). The carried bell
  // answers each landing with ironbell_toll — stun ring + selfCleanse: the
  // banked afflictions shed, and re-stacking becomes the fight's rhythm.
  //
  // DEFENSE TEXTURE (the hitCap marquee): mountainous armor + a per-hit LIFE
  // ceiling — bursts flatten to the cap and READ 'capped' — while statuses
  // stack free and DoT ticks pass the cap by construction. Ailment builds
  // headline ON PURPOSE; a throughput build survives between the steps and
  // may still SUNDER the parts (breakDamage chunks are mechanic damage, the
  // slow lane through the wall). Counterplay ladder: each cracked bearing
  // column OPENS THE HULL (stacking damageTaken — the mausoleum never
  // slows: it is inexorable, you crack it open instead; note moveSpeed
  // wears a global stat floor of 30, so slows below it are dead data);
  // crack THE BELL and the toll falls silent forever (breakDisables
  // reaches scripted beats via the aiSkillBans set).
  primeval_ironbell: {
    id: 'primeval_ironbell', name: 'Dolmourn, the Iron Bell',
    color: '#8d8672', shape: 'rectangle', radius: 34, material: 'stone', look: 'ironbell_mausoleum',
    base: {
      life: 1500, moveSpeed: 30, accuracy: 140, armor: 160, poise: 150,
      mana: 200, manaRegen: 10, weight: 14, hitCap: 26,
    },
    mods: [mod('lightningRes', 'flat', 0.4), mod('coldRes', 'flat', -0.25)],
    skills: [],
    xp: 640, boss: true, noNemesis: true, faction: 'primeval', tags: ['primeval'],
    detection: 1.5, turnSpeed: 0.9,
    scaling: { life: { incPerLevel: 0.15 }, hitCap: { incPerLevel: 0.15 } },
    parts: [
      { monster: 'primeval_ironbell_leg', dx: 1.25, dy: 1.15, lifeFrac: 0.13, breakDamage: 0.05,
        breakMods: [mod('damageTaken', 'increased', 0.06)] },
      { monster: 'primeval_ironbell_leg', dx: 1.25, dy: -1.15, lifeFrac: 0.13, breakDamage: 0.05,
        breakMods: [mod('damageTaken', 'increased', 0.06)] },
      { monster: 'primeval_ironbell_leg', dx: -1.25, dy: 1.15, lifeFrac: 0.13, breakDamage: 0.05,
        breakMods: [mod('damageTaken', 'increased', 0.06)] },
      { monster: 'primeval_ironbell_leg', dx: -1.25, dy: -1.15, lifeFrac: 0.13, breakDamage: 0.05,
        breakMods: [mod('damageTaken', 'increased', 0.06)] },
      { monster: 'primeval_ironbell_bell', dx: -1.55, dy: 0, lifeFrac: 0.2, breakDamage: 0.08,
        breakDisables: ['ironbell_toll'], breakMods: [mod('damageTaken', 'increased', 0.1)] },
    ],
    brain: {
      type: 'juggernaut',
      script: [
        { id: 'procession',
          cadences: [
            { every: 6.5, first: 3.5, actions: [{ do: 'cast', skill: 'ironbell_step', at: 'ahead', ahead: 120 }] },
            // The toll rings AS the foot lands: step bar 2.6s + impact delay
            // 0.35s — the offset keeps the two beats ONE readable moment.
            { every: 6.5, first: 6.4, actions: [{ do: 'cast', skill: 'ironbell_toll', at: 'self', force: true }] },
          ],
          goto: [{ to: 'clangor', atLifeFrac: 0.6 }] },
        { id: 'clangor', rewardGems: 1,
          announce: 'The Bell quickens — the toll comes faster!',
          mods: [mod('moveSpeed', 'more', 0.3)],
          onEnter: [{ do: 'summon', monster: 'toll_wretch', count: 3, ring: 230, tag: 'bell_procession' }],
          cadences: [
            { every: 5.2, first: 1.2, actions: [{ do: 'cast', skill: 'ironbell_step', at: 'ahead', ahead: 130 }] },
            { every: 5.2, first: 4.1, actions: [{ do: 'cast', skill: 'ironbell_toll', at: 'self', force: true }] },
          ],
          goto: [{ to: 'lastpeal', atLifeFrac: 0.25 }] },
        { id: 'lastpeal', rewardGems: 2,
          announce: 'DOLMOURN TOLLS THE LAST PEAL — live between the steps!',
          mods: [mod('moveSpeed', 'more', 0.45), mod('damage', 'more', 0.3)],
          cadences: [
            { every: 4.2, first: 0.8, actions: [{ do: 'cast', skill: 'ironbell_step', at: 'ahead', ahead: 140 }] },
            { every: 4.2, first: 3.7, actions: [{ do: 'cast', skill: 'ironbell_toll', at: 'self', force: true }] },
          ],
          goto: [] },
      ],
    },
  },
  /** A bearing column — crack it and the hull OPENS WIDER (breakMods). */
  primeval_ironbell_leg: {
    id: 'primeval_ironbell_leg', name: 'Bearing Column',
    color: '#847e6c', shape: 'hexagon', radius: 11, material: 'stone', look: 'ironbell_leg',
    noNemesis: true, faction: 'primeval', tags: ['primeval'],
    base: { life: 120, moveSpeed: 0, armor: 110, poise: 90, weight: 12, hitCap: 15 },
    mods: [mod('lightningRes', 'flat', 0.4), mod('coldRes', 'flat', -0.25)],
    skills: [], xp: 0,
    scaling: { life: { incPerLevel: 0.15 }, hitCap: { incPerLevel: 0.15 } },
  },
  /** The bell itself — crack it and the toll falls SILENT (breakDisables):
   *  afflictions bank freely for the rest of the fight. The strategic part. */
  primeval_ironbell_bell: {
    id: 'primeval_ironbell_bell', name: 'The Iron Bell',
    color: '#b8a878', shape: 'trapezoid', radius: 13, material: 'metal', look: 'ironbell_bell',
    noNemesis: true, faction: 'primeval', tags: ['primeval'],
    base: { life: 120, moveSpeed: 0, armor: 70, poise: 70, weight: 10, hitCap: 18 },
    skills: [], xp: 0,
    scaling: { life: { incPerLevel: 0.15 }, hitCap: { incPerLevel: 0.15 } },
  },
  /** Keeper of the Toll — the Bell's tender: the hushmaiden grammar in
   *  funeral stone, the chime at the hip naming its office at a glance. */
  bell_keeper: {
    id: 'bell_keeper', name: 'Keeper of the Toll',
    color: '#9a917c', shape: 'circle', radius: 10, material: 'cloth', look: 'bell_keeper',
    base: { life: 95, moveSpeed: 62, accuracy: 110, armor: 45, mana: 60, manaRegen: 4 },
    skills: ['cleave'], xp: 30,
    noNemesis: true, faction: 'primeval', tags: ['primeval'],
    detection: 1.1,
  },
  /** Toll-wretch — shroud-bound penitent chaff chained to the procession. */
  toll_wretch: {
    id: 'toll_wretch', name: 'Toll-Wretch',
    color: '#7c766a', shape: 'circle', radius: 8, material: 'cloth', look: 'toll_wretch',
    base: { life: 42, moveSpeed: 74, accuracy: 95 },
    skills: ['claw'], xp: 12,
    noNemesis: true, faction: 'primeval', tags: ['primeval'],
    brain: { type: 'swarm' },
  },

  // ASHVEIN, the Furnace Below — hell's own sovereign (UNDERWORLD-ONLY: the
  // def's dimension row keeps it off the surface instance's roster entirely).
  // MYTHIC-SCALE PASS: a rising furnace SUN (plain rescale — its identity is
  // a levitating mass of ember, not a chain); telegraphs grown with it.
  primeval_ashvein: {
    id: 'primeval_ashvein', name: 'Ashvein, the Furnace Below',
    color: '#e06a2a', shape: 'star', radius: 38, material: 'ember', look: 'magma_lurker',
    base: { life: 950, moveSpeed: 62, accuracy: 135, armor: 55, mana: 320, manaRegen: 16 },
    mods: [mod('fireRes', 'flat', 0.75), mod('chaosRes', 'flat', 0.4), mod('damage', 'increased', 0.4)],
    skills: ['magma_glob', 'flame_wave', 'meteor_storm'],
    xp: 800, boss: true, noNemesis: true, faction: 'primeval', tags: ['primeval'],
    detection: 1.4, levitates: true,
    scaling: { life: { incPerLevel: 0.15 } },
    brain: {
      type: 'artillery',
      script: [
        { // ACT I — the SMOLDER: globs and rolling fire.
          id: 'smolder',
          cadences: [{ every: 5, first: 3, actions: [{ do: 'nova', skill: 'magma_glob', at: 'self', zoneRadius: 220, delay: 0.95, push: { strength: 200 } }] }],
          goto: [{ to: 'furnace', atLifeFrac: 0.55 }],
        },
        { // ACT II — the FURNACE OPENS: cinders boil out and WARD it under a
          // falling sky.
          id: 'furnace',
          rewardGems: 1,
          announce: 'The furnace OPENS — the sky catches fire!',
          mods: [mod('damage', 'more', 0.35)],
          onEnter: [
            { do: 'summon', monster: 'primeval_cinder', count: 5, ring: 260, at: 'anchor', tag: 'ashvein_cinder' },
            { do: 'ward', tag: 'ashvein_cinder', announce: 'The cinders gutter — Ashvein is BARED!' },
          ],
          cadences: [{ every: 9, actions: [{ do: 'cast', skill: 'meteor_storm', at: 'target', force: true }] }],
          goto: [{ to: 'ruin', atLifeFrac: 0.22 }],
        },
        { // ACT III — RUIN: it hunts, fire ringing off it in waves.
          id: 'ruin',
          use: { type: 'swarm' },
          rewardGems: 2,
          announce: 'Ashvein RUPTURES — run between the waves!',
          mods: [mod('moveSpeed', 'more', 0.45), mod('damage', 'more', 0.45)],
          cadences: [{ every: 5, actions: [{ do: 'ring', skill: 'magma_glob', radius: 240, count: 8, waves: 2, waveGap: 0.5, delay: 1.0, at: 'anchor' }] }],
          goto: [],
        },
      ],
    },
  },

  // VELKETH, the Enthroned Husk — the lair sovereign: habitat-bound to the
  // husk_throne dais it erupts from (hard-confined; it IS the arena's far
  // wall), sweeping the chamber with two anchored arm silhouettes.
  primeval_velketh: {
    id: 'primeval_velketh', name: 'Velketh, the Enthroned Husk',
    color: '#9a6ad2', shape: 'pentagon', radius: 34, material: 'void',
    base: { life: 1000, moveSpeed: 0, accuracy: 135, armor: 50, mana: 320, manaRegen: 18, weight: 9 },
    mods: [mod('chaosRes', 'flat', 0.5), mod('coldRes', 'flat', 0.3), mod('damage', 'increased', 0.45)],
    skills: ['lash_roots', 'venom_bolt', 'bile_spray'],
    xp: 780, boss: true, noNemesis: true, faction: 'primeval', tags: ['primeval'],
    detection: 1.6, vision: { arcDeg: 360, rearMul: 1 }, turnSpeed: 2.0,
    habitat: { kind: 'husk_throne', grace: 52 },
    ambush: { radius: 380, announce: 'The husk SPLITS along old seams — Velketh wakes!' },
    scaling: { life: { incPerLevel: 0.15 } },
    parts: [
      {
        monster: 'primeval_velketh_arm', dx: 1.15, dy: 1.5, lifeFrac: 0.3, breakDamage: 0.1,
        breakMods: [mod('damageTaken', 'increased', 0.12)],
      },
      {
        monster: 'primeval_velketh_arm', dx: 1.15, dy: -1.5, lifeFrac: 0.3, breakDamage: 0.1,
        breakMods: [mod('damageTaken', 'increased', 0.12)],
      },
    ],
    brain: {
      type: 'artillery',
      script: [
        { // ACT I — ENTHRONED: it never leaves the dais; the chamber comes to it.
          id: 'enthroned',
          cadences: [{ every: 5.5, first: 3.5, actions: [{ do: 'ring', skill: 'venom_bolt', radius: 190, count: 6, waves: 1, delay: 0.85, at: 'anchor' }] }],
          goto: [{ to: 'clutch', atLifeFrac: 0.55 }],
        },
        { // ACT II — the CLUTCH: its brood swarms out of the husk and WARDS it.
          id: 'clutch',
          rewardGems: 1,
          announce: 'The throne DISGORGES its clutch!',
          mods: [mod('damage', 'more', 0.35)],
          onEnter: [
            { do: 'summon', monster: 'primeval_spawn', count: 4, ring: 240, at: 'anchor', tag: 'velketh_clutch' },
            { do: 'ward', tag: 'velketh_clutch', announce: 'The clutch is broken — the husk is BARED!' },
          ],
          goto: [{ to: 'paroxysm', atLifeFrac: 0.22 }],
        },
        { // ACT III — PAROXYSM: bile in sheets, the chamber shoved away in beats.
          id: 'paroxysm',
          rewardGems: 2,
          announce: 'Velketh convulses — the whole chamber HEAVES!',
          mods: [mod('damage', 'more', 0.45), mod('attackSpeed', 'increased', 0.2)],
          cadences: [
            { every: 2.6, actions: [{ do: 'push', radius: 300, strength: 160, from: 'anchor' }] },
            { every: 6, actions: [{ do: 'cast', skill: 'bile_spray', at: 'target', force: true }] },
          ],
          goto: [],
        },
      ],
    },
  },
  primeval_velketh_arm: {
    id: 'primeval_velketh_arm', name: 'Husk Arm',
    color: '#7e56ae', shape: 'oval', radius: 20, material: 'void',
    noNemesis: true, faction: 'primeval', tags: ['primeval'],
    base: { life: 140, moveSpeed: 0, mana: 70, manaRegen: 6, poise: 50 },
    skills: ['whirling_reap'], xp: 0,
  },

  // The sovereigns' BROODS — chaff the fights summon (and the escort tables).
  primeval_spawn: {
    id: 'primeval_spawn', name: 'Primeval Spawn',
    color: '#a8a05c', shape: 'oval', radius: 10, material: 'chitin',
    base: { life: 42, moveSpeed: 126, mana: 0 },
    skills: ['claw'], xp: 12,
    faction: 'primeval', tags: ['primeval'],
    brain: { type: 'swarm' },
  },
  primeval_cinder: {
    id: 'primeval_cinder', name: 'Cinderling',
    color: '#e08a4a', shape: 'oval', radius: 10, material: 'ember',
    base: { life: 38, moveSpeed: 132, mana: 60, manaRegen: 6 },
    mods: [mod('fireRes', 'flat', 0.6)],
    skills: ['firebolt'], xp: 14,
    faction: 'primeval', tags: ['primeval'],
    brain: { type: 'strafer' },
  },

  // --- THE VIGILANT HOST (faction 'seraphic' — the Aetherial's wardens) ------
  // Angels are not friends. The Host keeps the realm above the clouds, and it
  // keeps it FROM you: choirs of wisps, wheels of eyes, lancers falling out of
  // the light. Most of the Host FLIES (flier + levitates) — the collapsing
  // shelves are THEIR ground precisely because they need no ground; the
  // Dominion, deliberately, walks. Contexts keep them out of surface
  // generation (they appear via the aether tilesets + the seraphic roster).

  /** The choir's least: a mote of light with wings — a poked NEST of light
   *  (volatile: struck, it may flash a free Aureole back at the world). */
  cherub_wisp: {
    id: 'cherub_wisp', name: 'Cherub Wisp',
    color: '#ffe9b8', shape: 'oval', radius: 9, material: 'ethereal', look: 'cherub_wisp',
    base: { life: 26, moveSpeed: 185, evasion: 65, mana: 40, manaRegen: 5 },
    mods: [mod('lightningRes', 'flat', 0.4)],
    skills: ['talon_rake'], xp: 10, faction: 'seraphic',
    flier: true, levitates: true,
    volatile: { skillId: 'aureole', chance: 0.2, icd: 3 },
    // Deliberately BANDLESS: the choir's least is the table's floor — however
    // low a shelf runs, something still sings (an all-banded table would sit
    // empty below the vigil and fall back to unshaped weights).
    detection: 1.2,
    scaleVariance: [0.85, 1.15],
    brain: { type: 'swarm' },
  },

  /** The wheel of eyes: a slow orbit that never blinks, pulsing rings of
   *  dawn — and imploding into one last radiant verdict when broken. */
  ophan_wheel: {
    id: 'ophan_wheel', name: 'Ophan of the Wheel',
    color: '#ffd88a', shape: 'circle', radius: 13, material: 'ethereal', look: 'ophan_wheel',
    base: { life: 64, moveSpeed: 95, mana: 120, manaRegen: 9, energyShield: 30 },
    mods: [mod('lightningRes', 'flat', 0.5)],
    skills: ['aureole'], xp: 22, faction: 'seraphic',
    flier: true, levitates: true,
    deathBurst: { mode: 'implode', damageFrac: 0.9, coalesce: 0.6, damageType: 'lightning' },
    presence: 'host_vigil',
    gemBias: ['lightning', 'aoe'],
    brain: { type: 'strafer' },
  },

  /** The herald: a warhorn over the choir — the PEAL opens every engagement
   *  (thrown lines, ringing ears), the rally keeps it won, and wisps fighting
   *  near their herald fight like something watched them. */
  herald_of_the_choir: {
    id: 'herald_of_the_choir', name: 'Herald of the Choir',
    color: '#f2e2b8', shape: 'pentagon', radius: 13, material: 'ethereal', look: 'herald_choir',
    base: { life: 85, moveSpeed: 110, mana: 140, manaRegen: 8, energyShield: 45 },
    skills: ['trumpet_peal', 'war_cry'], xp: 26, faction: 'seraphic',
    flier: true, levitates: true,
    bond: { mods: [mod('damage', 'increased', 0.2), mod('attackSpeed', 'increased', 0.1)], radius: 180 },
    grants: [{ atLevel: 14, skill: 'judgement_pillar' }],
    presence: 'host_vigil',
    brain: { type: 'commander' },
  },

  /** The lampad: the candle-bearer between the choirs — her votive flame
   *  shields and mends whatever fights inside it. Kill the light first, or
   *  fight a ward that keeps closing. Floats (never falls), walks the air
   *  slowly — she is carried BY the light, not by wings. */
  lampad_of_the_vigil: {
    id: 'lampad_of_the_vigil', name: 'Lampad of the Vigil',
    color: '#ffd9a0', shape: 'oval', radius: 12, material: 'ethereal', look: 'lampad_vigil',
    base: { life: 70, moveSpeed: 90, mana: 180, manaRegen: 10, energyShield: 25 },
    skills: ['votive_ward', 'talon_rake'], xp: 26, faction: 'seraphic',
    levitates: true,
    presence: { from: 11, fadeIn: 5 },
    gemBias: ['aura', 'heal'],
    brain: { type: 'caster' },
  },

  /** The power: the Host's INFANTRY — plate over feathers, lances in ranks.
   *  It walks (the second deliberate walker: a line that holds ground can be
   *  dropped WITH the ground), and its front is a wall until you get behind
   *  it. */
  power_of_the_bastion: {
    id: 'power_of_the_bastion', name: 'Power of the Bastion',
    color: '#e8e2d0', shape: 'trapezoid', radius: 14, material: 'stone', look: 'power_bastion',
    base: { life: 150, moveSpeed: 85, armor: 35, poise: 45, accuracy: 100, mana: 70, manaRegen: 5 },
    mods: [mod('lightningRes', 'flat', 0.3)],
    skills: ['radiant_lance', 'claw'], xp: 34, faction: 'seraphic',
    shellGuard: { side: 'front', max: 60, arcDeg: 140, regenDelay: 4, regenRate: 10 },
    presence: { from: 11, fadeIn: 5 },
    gemBias: ['javelin', 'projectile'],
    brain: { type: 'skirmish', withdraw: 0.9 },
  },

  /** The throne: the greater wheel — the law made LATTICE. Light-chains bind
   *  it to its kin (the tether kit-part: a cycling band that burns whatever
   *  stands between the wheel and its choir), rings of dawn pulse from its
   *  rim, and pillars fall where it looks. Break the chain-holders first or
   *  fight inside a cage of light. */
  throne_of_the_law: {
    id: 'throne_of_the_law', name: 'Throne of the Law',
    color: '#ffe082', shape: 'circle', radius: 16, material: 'ethereal', look: 'throne_law',
    base: { life: 190, moveSpeed: 80, mana: 220, manaRegen: 11, energyShield: 60 },
    mods: [mod('lightningRes', 'flat', 0.5), mod('fireRes', 'flat', 0.3)],
    skills: ['aureole', 'judgement_pillar'], xp: 64, faction: 'seraphic',
    flier: true, levitates: true,
    tether: { dps: 6, damageType: 'lightning', width: 12, radius: 340, period: 6, duty: 3, color: '#ffe9a8' },
    deathBurst: { mode: 'implode', damageFrac: 1.1, coalesce: 0.7, damageType: 'lightning' },
    presence: { from: 13, fadeIn: 5 },
    gemBias: ['lightning', 'duration'],
    brain: { type: 'strafer' },
  },

  /** The lancer: a virtue that falls OUT of the sky point-first — Skyfall is
   *  its whole doctrine of approach. */
  virtue_lance: {
    id: 'virtue_lance', name: 'Virtue of the Lance',
    color: '#ffefc8', shape: 'kite', radius: 12, material: 'ethereal', look: 'virtue_lance',
    base: { life: 95, moveSpeed: 135, accuracy: 105, mana: 60, manaRegen: 5 },
    skills: ['claw', 'skyfall'], xp: 28, faction: 'seraphic',
    flier: true, levitates: true,
    presence: 'host_vigil',
    gemBias: ['movement', 'melee'],
    brain: { type: 'skirmish', withdraw: 1.1 },
  },

  /** The judge: marble made law. It does not fly — the one Host body the
   *  crumbling clouds can claim — and it does not care: a front-guard shell
   *  and pillars of verdict make approaching it the whole problem. */
  dominion_scales: {
    id: 'dominion_scales', name: 'Dominion of Scales',
    color: '#e0d8c8', shape: 'trapezoid', radius: 17, material: 'stone', look: 'dominion_scales',
    base: { life: 240, moveSpeed: 62, armor: 45, poise: 60, mana: 160, manaRegen: 7 },
    mods: [mod('fireRes', 'flat', 0.3), mod('lightningRes', 'flat', 0.3)],
    skills: ['judgement_pillar'], xp: 48, faction: 'seraphic',
    shellGuard: { side: 'front', max: 80, arcDeg: 120, regenDelay: 4, regenRate: 12 },
    presence: 'host_vigil',
    gemBias: ['spell', 'duration'],
    brain: { type: 'juggernaut' },
  },

  /** The watcher: one unblinking eye on white wings, advancing only when
   *  unwatched (the stalk axis) and fanning feathers from a distance. */
  watcher_unblinking: {
    id: 'watcher_unblinking', name: 'Unblinking Watcher',
    color: '#e8ecf8', shape: 'oval', radius: 11, material: 'ethereal', look: 'watcher_eye',
    base: { life: 58, moveSpeed: 120, accuracy: 115, evasion: 55, mana: 90, manaRegen: 6 },
    skills: ['feather_volley'], xp: 24, faction: 'seraphic',
    flier: true, levitates: true,
    presence: 'host_vigil',
    detection: 1.6,
    brain: { type: 'skirmish', withdraw: 1.3, behavior: { stalk: { arcDeg: 70, creep: 0.6 } } },
  },

  /** The Host's anchor: a PRINCIPALITY — laurel, sunburst, the whole kata.
   *  The sanctum's warden and the shelf-crossing's worst weather. */
  principality_of_dawn: {
    id: 'principality_of_dawn', name: 'Principality of Dawn',
    color: '#ffe9a8', shape: 'star', radius: 19, material: 'ethereal', look: 'principality',
    // ONE signature (the texture doctrine): the radiant WARD — ethereal
    // host-stuff doesn't brace, it burns bright and rekindles. Was a
    // poise+ES stack from before the law; the ward absorbed the bar.
    base: { life: 420, moveSpeed: 105, armor: 25, mana: 220, manaRegen: 10, energyShield: 140 },
    mods: [mod('lightningRes', 'flat', 0.5), mod('fireRes', 'flat', 0.3)],
    skills: ['skyfall', 'judgement_pillar', 'feather_volley'], xp: 140, faction: 'seraphic',
    flier: true, levitates: true,
    presence: { from: 14, fadeIn: 6 },
    gemBias: ['lightning', 'movement'],
    brain: {
      type: 'commander',
      phases: [
        { atLifeFrac: 0.55, mods: [mod('castSpeed', 'increased', 0.2), mod('attackSpeed', 'increased', 0.15)] },
        { atLifeFrac: 0.25, mods: [mod('damage', 'more', 0.25), mod('moveSpeed', 'increased', 0.2)] },
      ],
    },
  },

  /** The tribune: the Seraph City's magistrate — a walking court. The scales
   *  across the shoulders are the tell: judgment pillars, not lances. Holds
   *  a small bond court around itself (the law steadies its bailiffs). */
  aureole_tribune: {
    id: 'aureole_tribune', name: 'Aureole Tribune',
    color: '#efe2c0', shape: 'pentagon', radius: 14, material: 'ethereal', look: 'aureole_tribune',
    base: { life: 130, moveSpeed: 100, mana: 160, manaRegen: 8, energyShield: 60 },
    skills: ['judgement_pillar', 'war_cry'], xp: 34, faction: 'seraphic',
    flier: true, levitates: true,
    bond: { mods: [mod('damage', 'increased', 0.15), mod('castSpeed', 'increased', 0.1)], radius: 170 },
    presence: { from: 12, fadeIn: 4 },
    brain: { type: 'commander' },
  },

  /** The lyrist: the forum's muse — the song is the aura (a cast-speed bond
   *  court; the choirs sing FASTER around her) and the feathers answer
   *  whoever interrupts it. Kill the music first. */
  seraphal_lyrist: {
    id: 'seraphal_lyrist', name: 'Seraphal Lyrist',
    color: '#ffedc6', shape: 'oval', radius: 12, material: 'ethereal', look: 'seraphal_lyrist',
    base: { life: 80, moveSpeed: 95, mana: 200, manaRegen: 10, energyShield: 35 },
    skills: ['feather_volley'], xp: 28, faction: 'seraphic',
    flier: true, levitates: true,
    bond: { mods: [mod('castSpeed', 'increased', 0.25)], radius: 200 },
    presence: { from: 13, fadeIn: 4 },
    brain: { type: 'strafer' },
  },

  // ==========================================================================
  // THE GALEKIN — the Driftways' own weather-fauna (faction registered by
  // the ascent package beside the Host: realm content, contexts aetherial).
  // The wind favors WINGS: most of the kin float free of the flux rhythm the
  // intruder must read — the shepherd is the deliberate WALKER (the ground
  // can claim it; x_ride_flux is how it argues), and every kit here shoves,
  // weaves or hastens: fights on shifting ground are fights ABOUT footing.
  // ==========================================================================

  /** The fingerling: a biting scrap of living cloud. BANDLESS by design —
   *  the roster's floor never sits empty at any level (the cherub lesson). */
  cirrus_fingerling: {
    id: 'cirrus_fingerling', name: 'Cirrus Fingerling',
    color: '#dcecf8', shape: 'oval', radius: 7, material: 'ethereal', look: 'cirrus_fingerling',
    base: { life: 16, moveSpeed: 132, mana: 20, manaRegen: 3 },
    skills: ['talon_rake'], xp: 6, faction: 'galekin',
    flier: true, levitates: true,
    brain: { type: 'swarm' },
  },

  /** The ray: a wide-winged glider that banks in for one raking pass and
   *  swings wide again — reading its circuit is the whole fight. */
  drift_ray: {
    id: 'drift_ray', name: 'Drift Ray',
    color: '#c2d6ea', shape: 'oval', radius: 13, material: 'ethereal', look: 'drift_ray',
    base: { life: 62, moveSpeed: 118, mana: 30, manaRegen: 4, evasion: 40 },
    skills: ['talon_rake'], xp: 18, faction: 'galekin',
    flier: true, levitates: true,
    gemBias: ['movement'],
    brain: { type: 'skirmish', withdraw: 1.1 },
  },

  /** The eel: a ribbon of storm that WEAVES — its darts inherit the wind
   *  (erraticPower on the def: the squall_dart flight no shield times). */
  zephyr_eel: {
    id: 'zephyr_eel', name: 'Zephyr Eel',
    color: '#a8ccec', shape: 'oval', radius: 10, material: 'ethereal', look: 'zephyr_eel',
    base: { life: 55, moveSpeed: 108, mana: 90, manaRegen: 6 },
    mods: [mod('erraticPower', 'flat', 4), mod('lightningRes', 'flat', 0.4)],
    skills: ['squall_dart'], xp: 22, faction: 'galekin',
    flier: true, levitates: true,
    presence: { from: 10, fadeIn: 4 },
    gemBias: ['lightning', 'projectile'],
    brain: { type: 'caster' },
  },

  /** The djinn: bottled weather with opinions — downbursts called onto your
   *  footing, and a flat clap of wind when you close the gap. */
  gale_djinn: {
    id: 'gale_djinn', name: 'Gale Djinn',
    color: '#b8d8e8', shape: 'kite', radius: 13, material: 'ethereal', look: 'gale_djinn',
    base: { life: 95, moveSpeed: 96, mana: 220, manaRegen: 10, energyShield: 35 },
    mods: [mod('coldRes', 'flat', 0.3), mod('lightningRes', 'flat', 0.3)],
    skills: ['downburst', 'gust_burst'], xp: 34, faction: 'galekin',
    levitates: true,
    presence: { from: 11, fadeIn: 4 },
    gemBias: ['cold', 'aoe'],
    brain: { type: 'caster' },
  },

  /** The shepherd: the galekin's DELIBERATE WALKER — it herds fingerlings,
   *  sets the wind at its flock's back, and reads the drift like a local:
   *  when its stepping stone frays it HOPS to standing cloud (x_ride_flux).
   *  Catch it mid-hop, or drop it with the pad it lingered on. */
  nimbus_shepherd: {
    id: 'nimbus_shepherd', name: 'Nimbus Shepherd',
    color: '#cadeee', shape: 'pentagon', radius: 14, material: 'ethereal', look: 'nimbus_shepherd',
    base: { life: 135, moveSpeed: 92, armor: 15, poise: 30, mana: 220, manaRegen: 9 },
    skills: ['wisp_call', 'tailwind', 'gale_lash'], xp: 42, faction: 'galekin',
    presence: { from: 12, fadeIn: 4 },
    gemBias: ['minion', 'buff'],
    brain: {
      type: 'commander',
      // The drift-local's footing sense: when its stepping stone frays it
      // hops to standing cloud (the registered x_ride_flux beat — a quick
      // skip, never a march across the very void it flees). The beat runs
      // FAST: the fray window is short and the teeter grace shorter — a
      // slow check cadence is how the first live shepherd fell.
      rules: [{ when: {}, every: [1.2, 2.2], hold: [0.05, 0.1], actions: [{ do: 'x_ride_flux' }] }],
    },
  },

  /** The tyrant: an anvil-head thunderstorm that learned to WANT things.
   *  Downbursts in ranks, a shoving ring when crowded, wisps on call — and
   *  a final discharge when the storm gives out. */
  thunderhead_tyrant: {
    id: 'thunderhead_tyrant', name: 'Thunderhead Tyrant',
    color: '#8fa8c8', shape: 'star', radius: 17, material: 'ethereal', look: 'thunderhead_tyrant',
    // ONE signature: the storm's CHARGE (ES) — a thunderhead has no
    // footing to brace; burst it between recharges or ground out its ward.
    base: { life: 300, moveSpeed: 88, mana: 260, manaRegen: 11, energyShield: 100 },
    mods: [mod('lightningRes', 'flat', 0.5), mod('coldRes', 'flat', 0.3)],
    skills: ['downburst', 'gust_burst', 'wisp_call'], xp: 90, faction: 'galekin',
    flier: true, levitates: true,
    deathBurst: { mode: 'implode', damageFrac: 1.0, coalesce: 0.6, damageType: 'lightning' },
    presence: { from: 14, fadeIn: 6 },
    gemBias: ['lightning', 'aoe'],
    brain: {
      type: 'commander',
      phases: [
        { atLifeFrac: 0.5, mods: [mod('castSpeed', 'increased', 0.2)] },
        { atLifeFrac: 0.22, mods: [mod('damage', 'more', 0.25), mod('moveSpeed', 'increased', 0.15)] },
      ],
    },
  },

  // ==========================================================================
  // THE ZEPHYRID KIN — the high sky's BEASTS (the shelf-and-spire country's
  // wild layer; the drift already has its weather-scraps). Where the Host
  // judges and the Galekin simply weather, the zephyrids HUNT: a food chain
  // above the clouds — shrikes stoop on fingerlings (RELATIONS), lurkers
  // wait crystal-still by the lips, and the matron shepherds it all with the
  // Cirrus kata the player can loot back. Realm content: faction registered
  // by the ascent package, contexts:['aetherial'].
  // ==========================================================================

  /** The shrike: a raking dive out of the glare and a wide bank to come
   *  again — kill it between passes or duel its shadow all day. */
  mistwing_shrike: {
    id: 'mistwing_shrike', name: 'Mistwing Shrike',
    color: '#c8dcee', shape: 'kite', radius: 10, material: 'ethereal', look: 'mistwing_shrike',
    base: { life: 40, moveSpeed: 165, evasion: 55, mana: 30, manaRegen: 4 },
    skills: ['squall_bite'], xp: 16, faction: 'zephyrid',
    flier: true, levitates: true,
    presence: { to: 19, fadeOut: 8 },
    gemBias: ['movement'],
    brain: { type: 'flanker' },
  },

  /** The lurker: a predator that learned what the aether crystals look like
   *  and stands among them, still as weather — then the crook of wind lands
   *  and something is REELED toward the lip it waits beside. The one kin
   *  that walks: ground that remembers footfalls remembers its patience. */
  skyglass_lurker: {
    id: 'skyglass_lurker', name: 'Skyglass Lurker',
    color: '#b8d0e8', shape: 'triangle', radius: 12, material: 'crystal', look: 'skyglass_lurker',
    base: { life: 88, moveSpeed: 120, evasion: 35, mana: 60, manaRegen: 6 },
    mods: [mod('coldRes', 'flat', 0.4)],
    skills: ['skyhook', 'claw'], xp: 30, faction: 'zephyrid',
    detection: 0.7,
    presence: { from: 8, fadeIn: 4 },
    gemBias: ['cold'],
    brain: { type: 'assassin' },
  },

  /** The bull: a walking thunderhead with shoulders — the charge winds
   *  tighter every discharge, and the storm pays out all at once when the
   *  body gives. The kin's deliberate WALKER (the dominion doctrine): a
   *  line that holds ground can be dropped WITH the ground. */
  stormbrow_bull: {
    id: 'stormbrow_bull', name: 'Stormbrow Bull',
    color: '#9fb4d0', shape: 'trapezoid', radius: 16, material: 'stone', look: 'stormbrow_bull',
    base: { life: 210, moveSpeed: 92, armor: 20, poise: 70, mana: 120, manaRegen: 8 },
    mods: [mod('lightningRes', 'flat', 0.5)],
    skills: ['static_discharge', 'claw'], xp: 52, faction: 'zephyrid',
    deathBurst: { mode: 'implode', damageFrac: 0.6, coalesce: 0.7, damageType: 'lightning' },
    presence: { from: 10, fadeIn: 5 },
    gemBias: ['lightning', 'aoe'],
    brain: { type: 'juggernaut' },
  },

  /** The grazer: a drifting puff that eats light and minds its business —
   *  the shelf's LIFE, and the shrike's lunch. Bursts into a cold sigh
   *  when broken. Floats (sky fauna never arm the melt; the shelves stay
   *  the player's problem). */
  cloud_grazer: {
    id: 'cloud_grazer', name: 'Cloud Grazer',
    color: '#e6eef8', shape: 'oval', radius: 11, material: 'ethereal', look: 'cloud_grazer',
    base: { life: 34, moveSpeed: 105, mana: 10, manaRegen: 1 },
    skills: ['talon_rake'], xp: 8, faction: 'zephyrid',
    levitates: true,
    deathBurst: { mode: 'implode', damageFrac: 0.15, coalesce: 0.5, damageType: 'cold' },
    presence: { to: 16, fadeOut: 7 },
    scaleVariance: [0.8, 1.25],
    brain: { type: 'flee' },
  },

  /** The matron: the wild sky's shepherd-queen — geysers called down on a
   *  word, strays hooked back onto the cloud (or off it), and her own body
   *  condensing to cloud-stuff when the ground argues. Every art she casts
   *  is lootable: the Cirrus kata comes down from whoever survives her. */
  zephyrid_matron: {
    id: 'zephyrid_matron', name: 'Zephyrid Matron',
    color: '#cfe0f4', shape: 'star', radius: 15, material: 'ethereal', look: 'zephyrid_matron',
    base: { life: 240, moveSpeed: 100, mana: 240, manaRegen: 10, energyShield: 50, evasion: 30 },
    mods: [mod('coldRes', 'flat', 0.4), mod('lightningRes', 'flat', 0.3)],
    // Stormcradle is HER side's domain: the matron raises a charged camp
    // over her flock (side-filtered grants — the cloud takes the sky's
    // side, and standing in it winds YOU). The Cloudherd vocabulary,
    // taught by the world before any gem drops.
    skills: ['updraft_burst', 'skyhook', 'cirrus_veil', 'stormcradle'], xp: 96, faction: 'zephyrid',
    presence: { from: 12, fadeIn: 5 },
    gemBias: ['cold', 'aoe'],
    brain: {
      type: 'caster',
      phases: [
        { atLifeFrac: 0.5, mods: [mod('castSpeed', 'increased', 0.2)], announce: 'The high air shrieks!', onEnter: [{ do: 'summon', monster: 'mistwing_shrike', count: 2, ring: 120 }] },
      ],
    },
  },

  // ==========================================================================
  // THE VESPERKIN — the cosmos country's own (aether_vesper; grafted by the
  // Ascent package, contexts ['aetherial']). The day/night kin: nearly every
  // body wears NOCTURNE mods, so the same meadow is two different countries
  // by sun and by star — moths blaze at noon and gutter at dusk, hounds
  // arrive with the dark, the herds grow flighty under stars. Defense
  // textures per the doctrine: swarm-evasion / prey / night-flanker /
  // gap-ambusher / ES-construct / the phased sovereign.
  // ==========================================================================

  /** The moth: a scrap of daylight with wings — noon's swarm, dusk's
   *  litter. Day-worn nocturne (the pallbearer's inverted pole): bright
   *  hours make it quick; the dark leaves it stumbling into your swings. */
  lumen_moth: {
    id: 'lumen_moth', name: 'Lumen Moth',
    color: '#f4ecd0', shape: 'diamond', radius: 8, material: 'ethereal', look: 'lumen_moth',
    base: { life: 22, moveSpeed: 125, evasion: 25, mana: 10, manaRegen: 1 },
    skills: ['talon_rake'], xp: 5, faction: 'vesperkin',
    flier: true, levitates: true,
    nocturne: { phases: ['day', 'dawn'], mods: [mod('evasion', 'flat', 30), mod('moveSpeed', 'increased', 0.2)] },
    deathBurst: { mode: 'implode', damageFrac: 0.12, coalesce: 0.4, damageType: 'fire' },
    presence: { to: 15, fadeOut: 6 },
    scaleVariance: [0.8, 1.2],
    brain: { type: 'swarm' },
  },

  /** The grazer: a constellation wearing an elk's patience — the meadows'
   *  herd-life, walking the glass. Starlight spooks it quick (night
   *  evasion); breaking it sighs out cold. The hounds' whole economy. */
  star_grazer: {
    id: 'star_grazer', name: 'Star Grazer',
    color: '#c8d0ee', shape: 'oval', radius: 13, material: 'ethereal', look: 'star_grazer',
    base: { life: 60, moveSpeed: 108, mana: 10, manaRegen: 1 },
    skills: ['talon_rake'], xp: 10, faction: 'vesperkin',
    nocturne: { phases: ['night', 'dusk'], mods: [mod('evasion', 'flat', 40), mod('moveSpeed', 'increased', 0.15)] },
    deathBurst: { mode: 'implode', damageFrac: 0.2, coalesce: 0.55, damageType: 'cold' },
    presence: { to: 17, fadeOut: 7 },
    scaleVariance: [0.85, 1.3],
    brain: { type: 'flee' },
  },

  /** The hound: the dark's own courser — spark-maned, pack-run, pouncing
   *  off the star-spans the night just built for it. Day finds it heavy
   *  and short-tempered; night makes it the meadow's fastest thing. */
  comet_hound: {
    id: 'comet_hound', name: 'Comet Hound',
    color: '#d8a878', shape: 'triangle', radius: 12, material: 'ethereal', look: 'comet_hound',
    base: { life: 95, moveSpeed: 112, evasion: 20, mana: 40, manaRegen: 4 },
    mods: [mod('fireRes', 'flat', 0.4)],
    skills: ['squall_bite', 'claw'], xp: 26, faction: 'vesperkin',
    nocturne: { phases: ['night', 'dusk'], mods: [mod('moveSpeed', 'increased', 0.25), mod('damage', 'increased', 0.2), mod('evasion', 'flat', 25)] },
    presence: { from: 9, fadeIn: 4 },
    gemBias: ['fire', 'movement'],
    brain: { type: 'flanker' },
  },

  // (The gap-predator role is the EXISTING void_angler — the void family's
  // lure-fisher, threaded into the vesper pack table as a guest: what waits
  // under the star-spans was always the same thing that waits in the dark
  // between worlds. Reuse, not a twin.)

  /** The keeper: a brass orrery that never stopped calculating — rings,
   *  a caged star, and verdicts of falling sky (every starcall it lands
   *  is the lootable art). ES-glass: crack the calculation, the body is
   *  nothing. */
  orrery_keeper: {
    id: 'orrery_keeper', name: 'Orrery Keeper',
    color: '#b9a684', shape: 'star', radius: 13, material: 'metal', look: 'orrery_keeper',
    base: { life: 70, moveSpeed: 70, energyShield: 90, mana: 160, manaRegen: 9 },
    mods: [mod('lightningRes', 'flat', 0.3), mod('fireRes', 'flat', 0.3)],
    skills: ['starcall', 'static_discharge'], xp: 48, faction: 'vesperkin',
    presence: { from: 11, fadeIn: 4 },
    gemBias: ['fire', 'aoe'],
    brain: { type: 'caster' },
  },

  /** The Noctarch: the wane's sovereign — the hour between lights wearing
   *  a crown. Strongest exactly when the meadows are (night), thinning to
   *  a rumor by noon; the wane it is named for is yours. */
  noctarch_of_the_wane: {
    id: 'noctarch_of_the_wane', name: 'Noctarch of the Wane',
    color: '#a89ae0', shape: 'star', radius: 16, material: 'ethereal', look: 'noctarch',
    base: { life: 260, moveSpeed: 96, mana: 260, manaRegen: 11, energyShield: 70, evasion: 25 },
    mods: [mod('coldRes', 'flat', 0.4), mod('fireRes', 'flat', 0.3)],
    skills: ['starcall', 'skyhook', 'cirrus_veil'], xp: 110, faction: 'vesperkin',
    nocturne: { phases: ['night'], mods: [mod('damage', 'increased', 0.25), mod('castSpeed', 'increased', 0.15)] },
    presence: { from: 13, fadeIn: 5 },
    gemBias: ['fire', 'cold'],
    brain: {
      type: 'caster',
      phases: [
        { atLifeFrac: 0.55, mods: [mod('castSpeed', 'increased', 0.2)], announce: 'The wane calls its hounds!', onEnter: [{ do: 'summon', monster: 'comet_hound', count: 2, ring: 130 }] },
      ],
    },
  },

  // ==========================================================================
  // THE SIROCCO COURT — the deep desert's own (the gnolls keep the rim; past
  // the shimmer line the sand answers to older tenants). Presence-staged so
  // the court only musters where the country runs deep and hot; every verb
  // they cast is lootable (the void_hook doctrine).
  // ==========================================================================

  /** The court's blade: a duelist the heat refuses to hold still. At half
   *  life she steps THROUGH the shimmer and leaves a double arguing. */
  mirage_dancer: {
    id: 'mirage_dancer', name: 'Mirage Dancer',
    color: '#e8d8a8', shape: 'triangle', radius: 11, material: 'cloth', look: 'mirage_dancer',
    base: { life: 46, moveSpeed: 168, accuracy: 100, evasion: 85, mana: 40, manaRegen: 3 },
    mods: [mod('fireRes', 'flat', 0.4)],
    skills: ['mirage_knife', 'heat_split'], xp: 22,
    faction: 'sirocco',
    gemBias: ['fire', 'melee'],
    presence: { from: 6, fadeIn: 3 },
    aggro: { fury: 1.15, waver: 0.9 },
    brain: {
      type: 'flanker',
      move: { style: 'dart', dart: [0.3, 0.5], pause: [0.12, 0.28] },
      phases: [{ atLifeFrac: 0.5, announce: 'the dancer steps through the shimmer—' }],
    },
  },

  /** What the dancer leaves behind: hot air holding a blade. It fights for
   *  a breath or two and scatters — killing it early is a real answer. */
  heat_double: {
    id: 'heat_double', name: 'Heat Double',
    color: '#f0e4c0', shape: 'triangle', radius: 10, material: 'ethereal', look: 'heat_double',
    base: { life: 14, moveSpeed: 160, accuracy: 90, evasion: 40, mana: 0 },
    skills: ['mirage_knife'], xp: 2,
    faction: 'sirocco',
    noBestiary: true,
    brain: { type: 'skirmish' },
  },

  /** The cured dead of the dead lake: slow, patient, and packed with brine —
   *  they do not bleed, they SHATTER (kill it at arm's length or pay). */
  salt_husk: {
    id: 'salt_husk', name: 'Salt Husk',
    color: '#e8e0c8', shape: 'square', radius: 14, material: 'stone', look: 'salt_husk',
    base: { life: 120, moveSpeed: 62, accuracy: 88, armor: 22, mana: 0, poise: 40 },
    mods: [mod('fireRes', 'flat', 0.3), mod('coldRes', 'flat', -0.25)],
    skills: ['claw', 'salt_burst'], xp: 24,
    faction: 'sirocco',
    gemBias: ['physical', 'aoe'],
    // No def-level envelope: the husk is the Court's teaching tier (every
    // TABLE that fields it shapes its own depth) — and the faction roster
    // keeps a live candidate at L1-2 for rouse/garrison shaping.
    // They don't bleed — they SHATTER: kill it at arm's length or pay.
    deathBurst: { mode: 'implode', damageFrac: 0.5, damageType: 'physical', coalesce: 0.55, radius: 92 },
    brain: { type: 'juggernaut' },
  },

  /** The pan's ambusher: a body the light goes THROUGH wrong. It waits in
   *  plain sight the way glass waits in grass. */
  glass_stalker: {
    id: 'glass_stalker', name: 'Glass Stalker',
    color: '#bcd8d4', shape: 'triangle', radius: 12, material: 'crystal', look: 'glass_stalker',
    base: { life: 58, moveSpeed: 150, accuracy: 105, evasion: 60, mana: 0 },
    mods: [mod('critChance', 'flat', 0.15), mod('coldRes', 'flat', -0.2)],
    skills: ['claw'], xp: 24,
    faction: 'sirocco',
    gemBias: ['physical', 'melee'],
    presence: { from: 8, fadeIn: 4 },
    ambush: { radius: 140, announce: 'the light bends wrong—' },
    brain: { type: 'assassin' },
  },

  /** A wind that learned appetite: erratic, contemptuous of footing, and
   *  fond of scouring whatever argues back. */
  dust_djinn: {
    id: 'dust_djinn', name: 'Dust Djinn',
    color: '#d8b878', shape: 'star', radius: 13, material: 'ethereal', look: 'dust_djinn',
    base: { life: 66, moveSpeed: 120, accuracy: 95, mana: 90, manaRegen: 6, evasion: 45 },
    mods: [mod('damageTaken', 'more', -0.2)], // wind shrugs at steel (the soak lever — physRes was a dead stat)
    skills: ['whirl_of_grit'], xp: 28,
    faction: 'sirocco',
    levitates: true,
    gemBias: ['aoe', 'physical'],
    presence: { from: 9, fadeIn: 4 },
    brain: { type: 'caster', move: { style: 'holdRange', hold: 180, band: [0.7, 1.2] } },
  },

  /** The court's chaplain: the litany keeps the line burning brighter than
   *  the sun strictly agreed to. Kill the verse first. */
  sun_priest: {
    id: 'sun_priest', name: 'Sun Priest',
    color: '#ffd870', shape: 'pentagon', radius: 13, material: 'cloth', look: 'sun_priest',
    base: { life: 70, moveSpeed: 88, accuracy: 95, mana: 140, manaRegen: 8 },
    mods: [mod('fireRes', 'flat', 0.5)],
    skills: ['firebolt', 'solar_litany'], xp: 30,
    faction: 'sirocco',
    gemBias: ['fire', 'buff'],
    presence: { from: 10, fadeIn: 4 },
    brain: {
      type: 'caster',
      rules: [{
        // The verse the whole line hears — the spore_caller idiom in fire.
        when: { alliesWithin: { count: 2, radius: 280 } }, every: [10, 15], hold: [0.3, 0.5],
        announce: 'the priest lifts the litany…',
        actions: [{ do: 'buff', buff: { type: 'buff', id: 'sun_sworn_kin', duration: 6, mods: [mod('damage', 'increased', 0.16), mod('attackSpeed', 'increased', 0.08)] } }],
      }],
    },
  },

  /** The thing under the soft sand — the reason caravans walk the hardpan.
   *  A worm the erg's own size envelope can make a horror of. */
  sandmaw_burrower: {
    id: 'sandmaw_burrower', name: 'Sandmaw Burrower',
    color: '#c9a86a', shape: 'hexagon', radius: 16, material: 'chitin', look: 'sandmaw_burrower',
    base: { life: 150, moveSpeed: 105, accuracy: 92, armor: 14, mana: 0, poise: 40 },
    skills: ['claw'], xp: 34,
    faction: 'sirocco',
    worm: { length: 5, spacing: 0.6 },
    gemBias: ['physical'],
    presence: { from: 8, fadeIn: 4 },
    scaleVariance: [0.85, 1.35], scaleStats: true,
    ambush: { radius: 150, announce: 'the sand swells underfoot…' },
    brain: { type: 'juggernaut' },
  },

  /** THE MIRAGE KHAGAN — the court crowned (WARLORD_OF.sirocco): a king whose
   *  claim is that you have never once seen him first. Doubles at each knee
   *  of his life bar; the last third fights in a scouring wind. */
  mirage_khagan: {
    id: 'mirage_khagan', name: 'Mirage Khagan',
    color: '#f0c880', shape: 'star', radius: 16, material: 'cloth', look: 'mirage_khagan',
    base: { life: 300, moveSpeed: 118, accuracy: 105, evasion: 55, mana: 160, manaRegen: 8 },
    mods: [mod('fireRes', 'flat', 0.5), mod('damageTaken', 'more', -0.15)],
    skills: ['mirage_knife', 'heat_split', 'whirl_of_grit'], xp: 120,
    faction: 'sirocco',
    gemBias: ['fire', 'melee'],
    presence: { from: 12, fadeIn: 5 },
    brain: {
      type: 'flanker',
      phases: [
        { atLifeFrac: 0.66, announce: 'The Khagan smiles from somewhere else.', onEnter: [{ do: 'summon', monster: 'heat_double', count: 2, ring: 110 }] },
        { atLifeFrac: 0.33, mods: [mod('attackSpeed', 'increased', 0.2)], announce: 'The wind takes his side!', onEnter: [{ do: 'summon', monster: 'heat_double', count: 2, ring: 110 }] },
      ],
    },
  },

  // --- THE CHITIN (the Seethe): the hive under the deep desert --------------
  // The faction's texture is SOURCE WARFARE: the bodies are modest, the
  // SOURCES are the fight — tenders laying clutches mid-brawl, hive nodes
  // flooding the field, eggs hatching if nobody stamps them. Kill the wells
  // or drown in the pour. (Shell/bond belong to the scarab and the formics;
  // the Seethe's defense is reinforcement.)
  chitin_drone: {
    id: 'chitin_drone', name: 'Chitin Drone',
    color: '#b8823a', shape: 'oval', radius: 10, material: 'chitin', look: 'chitin_drone',
    base: { life: 34, moveSpeed: 155, accuracy: 92, armor: 20, mana: 0 },
    skills: ['claw'], xp: 9,
    faction: 'chitin',
    detection: 1.0,
    temper: 'territorial',
    brain: { type: 'swarm', squad: { idle: { style: 'drill' }, formation: 'column' } },
  },
  chitin_lancer: {
    id: 'chitin_lancer', name: 'Chitin Lancer',
    color: '#d8a04a', shape: 'kite', radius: 11, material: 'chitin', look: 'chitin_lancer',
    base: { life: 46, moveSpeed: 190, accuracy: 108, evasion: 65, mana: 0 },
    skills: ['claw'], xp: 16,
    faction: 'chitin',
    detection: 1.2,
    presence: { from: 3, fadeIn: 2 },
    brain: { type: 'skirmish', withdraw: 1.2, move: { style: 'skitter', dart: [0.3, 0.55], pause: [0.15, 0.4] } },
  },
  chitin_spitter: {
    id: 'chitin_spitter', name: 'Chitin Spitter',
    color: '#c8944a', shape: 'oval', radius: 13, material: 'chitin', look: 'chitin_spitter',
    base: { life: 66, moveSpeed: 120, accuracy: 105, armor: 30, mana: 90, manaRegen: 8 },
    mods: [mod('chaosRes', 'flat', 0.4)],
    skills: ['bile_spray'], xp: 24,
    faction: 'chitin',
    detection: 1.0,
    presence: { from: 5, fadeIn: 3 },
    brain: { type: 'skirmish', withdraw: 1.5 },
  },
  chitin_burrower: {
    id: 'chitin_burrower', name: 'Chitin Burrower',
    color: '#a87838', shape: 'hexagon', radius: 16, material: 'chitin', look: 'chitin_burrower',
    base: { life: 135, moveSpeed: 115, accuracy: 100, armor: 50, poise: 40, mana: 20, manaRegen: 3 },
    skills: ['heavy_strike'], xp: 32,
    faction: 'chitin',
    // LOW SHELL + REAL POISE on a bigger frame (the formic soldier's pole,
    // scaled up): crack the wedge fast, then commit through the brace.
    shellGuard: { side: 'front', max: 70, regenDelay: 4.5, regenRate: 15, color: '#c8a05a' },
    scaling: { armor: { flatPerLevel: 1.5 } },
    detection: 0.9,
    presence: { from: 7, fadeIn: 4 },
    temper: 'territorial',
    brain: { type: 'juggernaut', move: { style: 'charge', commitRange: 280, chargeSpeed: 2.0 } },
  },
  chitin_broodtender: {
    id: 'chitin_broodtender', name: 'Brood Tender',
    color: '#d8b06a', shape: 'circle', radius: 15, material: 'chitin', look: 'chitin_broodtender',
    base: { life: 120, moveSpeed: 105, accuracy: 100, armor: 25, mana: 140, manaRegen: 9, poise: 40 },
    mods: [mod('chaosRes', 'flat', 0.4)],
    skills: ['lay_chitin_clutch', 'bile_spray'], xp: 55,
    faction: 'chitin',
    turnSpeed: 2.6,
    gemBias: ['summon', 'minion'], wardPriority: 1,
    scaling: { life: { incPerLevel: 0.05 } },
    detection: 0.9,
    presence: { from: 9, fadeIn: 4 },
    brain: { type: 'juggernaut' },
  },
  brood_sovereign: {
    id: 'brood_sovereign', name: 'Brood Sovereign',
    color: '#e8a84a', shape: 'star', radius: 17, material: 'chitin', look: 'brood_sovereign',
    base: { life: 310, moveSpeed: 122, accuracy: 106, armor: 45, poise: 50, mana: 160, manaRegen: 8 },
    mods: [mod('chaosRes', 'flat', 0.5), mod('damageTaken', 'more', -0.15)],
    skills: ['heavy_strike', 'lay_chitin_clutch'], xp: 125,
    faction: 'chitin',
    gemBias: ['summon', 'minion'],
    // The def-level floor (the balor discipline): a HARD gate — no fadeIn,
    // so no spawn surface fields her below 14, wherever a table might try.
    presence: { from: 14 },
    worm: { length: 6, spacing: 19, taper: 0.88 },
    brain: {
      type: 'juggernaut',
      phases: [
        { atLifeFrac: 0.66, announce: 'The sand hums — the Seethe answers her.', onEnter: [{ do: 'summon', monster: 'chitin_lancer', count: 3, ring: 120 }] },
        { atLifeFrac: 0.33, mods: [mod('attackSpeed', 'increased', 0.2)], announce: 'The Sovereign rattles — and every egg in the sand rattles back!', onEnter: [{ do: 'summon', monster: 'chitin_burrower', count: 2, ring: 130 }] },
      ],
    },
  },
  hive_node: {
    id: 'hive_node', name: 'Hive Node',
    color: '#c8944a', shape: 'square', radius: 21, material: 'chitin', look: 'hive_node',
    base: { life: 150, moveSpeed: 0, armor: 25, evasion: 0, mana: 999, manaRegen: 50 },
    mods: [mod('chaosRes', 'flat', 0.5)],
    skills: ['spew_brood'],
    xp: 45,
    spawner: true,
  },

  // --- THE SWARMING WING (the hive-cycle's flying castes) -------------------
  // Bodies of the Swarming world event: referenced ONLY by the swarming
  // package's flightRoster (never the baseline chitin table), like the
  // Deadwake's exclusive dead — the sky fills ONLY when the cycle wings.
  // SILHOUETTE DOCTRINE: the ground Seethe reads as SHELL AND LEGS; the wing
  // reads as WINGS FIRST — one glance up and the player knows the cycle turned.
  chitin_wingling: {
    id: 'chitin_wingling', name: 'Chitin Wingling',
    color: '#e0b054', shape: 'circle', radius: 8, material: 'chitin', look: 'chitin_wingling',
    base: { life: 26, moveSpeed: 215, accuracy: 96, evasion: 80, mana: 0 },
    skills: ['claw'], xp: 8,
    faction: 'chitin',
    detection: 1.3,
    scaleVariance: [0.85, 1.15],
    brain: {
      type: 'swarm', move: { style: 'skitter', dart: [0.25, 0.5], pause: [0.1, 0.25] },
      // The murmuration lever, grafted: the streamed cloud swirls as ONE
      // (kin 'faction' merges it with any resident flock it passes) while
      // the wingling keeps its wings-first ground-rush identity.
      behavior: { flock: { kin: 'faction', cohesion: 0.8, alignment: 0.9, separation: 1, weave: 2.2, erratic: 0.9 } },
    },
  },
  /** The hive's tomorrow on double wings: she seeds clutches mid-fight, and
   *  the flight BREAKS if enough of her sisters fall — the Swarming's only
   *  throat to cut (queenless by doctrine: there is no crown to take). */
  chitin_alate: {
    id: 'chitin_alate', name: 'Winged Alate',
    color: '#e8c878', shape: 'oval', radius: 14, material: 'chitin', look: 'chitin_alate',
    base: { life: 150, moveSpeed: 140, accuracy: 102, armor: 20, evasion: 40, mana: 120, manaRegen: 8 },
    mods: [mod('chaosRes', 'flat', 0.4)],
    skills: ['lay_chitin_clutch', 'claw'], xp: 60,
    faction: 'chitin',
    gemBias: ['summon', 'minion'],
    wardPriority: 2, // the wing GUARDS its tomorrow — escorts post on her
    // The def-level floor (the balor discipline): a HARD gate — no fadeIn,
    // so nothing fields a breeding wing below 8, wherever a table might try.
    presence: { from: 8 },
    brain: { type: 'skirmish', withdraw: 1.5 },
  },
  /** The living larder — swollen with the brood's royal jelly. It cannot
   *  fight: it BOLTS, dripping the slick it is fat with (the wake fabric),
   *  and pays out in jelly when it falls. The amber bulb IS the treasure
   *  tell, in the air and (as the fallen cache) on the ground. */
  chitin_replete: {
    id: 'chitin_replete', name: 'Jelly Replete',
    color: '#f0c060', shape: 'oval', radius: 13, material: 'chitin', look: 'chitin_replete',
    base: { life: 90, moveSpeed: 165, accuracy: 90, evasion: 60, mana: 0 },
    skills: [], xp: 22,
    faction: 'chitin',
    loot: 'royal_jelly_taste', // the living larder pays a taste of the register
    detection: 0.4,
    scaleVariance: [0.9, 1.2],
    wake: { skillId: 'jelly_trail', everyDist: 52 },
    brain: {
      type: 'basic',
      morale: { skittish: { radius: 200, duration: [1.2, 2.0] } },
      move: { style: 'juke', hookEvery: [0.3, 0.6], hookArc: 1.2 },
    },
  },
  /** A fallen replete, wax-set where the Swarming passed — the WAKE'S PAYOUT
   *  (the engine materializes these in swarmed ground; MonsterDef.loot pays
   *  the royal register). A breakable in the barrel's mold: passive scenery
   *  with a health bar — smash it, take what spills. Factionless on purpose:
   *  nothing defends it and nothing else smashes it first. */
  royal_cache: {
    id: 'royal_cache', name: 'Royal Jelly Cache',
    color: '#f0c060', shape: 'circle', radius: 14, material: 'chitin', look: 'royal_cache',
    base: { life: 70, moveSpeed: 0, armor: 15, evasion: 0, mana: 0 },
    remains: false, // organic dress, but an OBJECT — no corpse
    skills: [], xp: 0,
    passive: true,
    orbDrops: 0.35,
    loot: 'royal_jelly_cache',
  },

  // ------------------------- THE MURMURATION (the standing sky) ------------
  // Where the Swarming's wing is an EVENT (flightRoster bodies streaming
  // through on the hive cycle), the murmuration is the hivesands' RESIDENT
  // sky: true fliers on the aloft ⇄ stoop ⇄ grounded wheel. Aloft they wear
  // the flock lever (BehaviorSpec.flock, kin 'faction' — packs that drift
  // together merge into ONE murmuration) and the trajectory axes (weave /
  // erratic — the projectile integrator's own math), so the flock reads as a
  // boiling SHAPE in the sky before it reads as bodies, and homing / fork /
  // chain / ricochet finally have prey worthy of them. Dives are the melee
  // window's OTHER half: a visible bar, a painted landing ring (the leap
  // telegraph lever), then a grounded beat where the wings are folded and
  // the sand can answer. Silhouette doctrine holds: ground Seethe is SHELL
  // AND LEGS, the wing is WINGS FIRST — and the murmuration is wings ONLY,
  // lifted and bobbing off its shadow (Actor.flying via the aloft status).

  /** The flock's coin: a locust the size of a gull, worthless alone and a
   *  weather system by the dozen. packSize fields it as a true flock. */
  chitin_skimmer: {
    id: 'chitin_skimmer', name: 'Chitin Skimmer',
    color: '#e6c060', shape: 'circle', radius: 8, material: 'chitin', look: 'chitin_skimmer',
    base: { life: 26, moveSpeed: 175, accuracy: 96, evasion: 70, mana: 0 },
    skills: ['claw'], xp: 10,
    faction: 'chitin',
    detection: 1.2,
    temper: 'territorial',
    scaleVariance: [0.85, 1.15],
    packSize: [8, 12],
    brain: {
      type: 'swarm',
      // The lead body's fall scatters the wheel — shoot the front of the V.
      squad: { onLeaderDeath: 'scatter' },
      script: wingCycle({
        dive: 'locust_dive', aloftFor: 6, stoopFor: 1.6, groundFor: 3.4, stoopWithin: 380,
        air: {
          move: { style: 'orbit', ring: 190, pace: 1.12, flipEvery: [2.4, 4.2], flipChance: 0.3 },
          // Sense reach 220: a murmuration folds across pack seams — two
          // flocks that drift within a wing's reach become one shape.
          behavior: { flock: { kin: 'faction', radius: 220, cohesion: 1.1, alignment: 1.25, separation: 1, weave: 3.2, erratic: 1.1 } },
        },
        ground: {
          move: { style: 'skitter', dart: [0.28, 0.5], pause: [0.2, 0.42] },
          behavior: { flock: { kin: 'faction', cohesion: 0.4, alignment: 0.3, separation: 1.2 } },
        },
      }),
    },
  },

  /** The heavy of the wing: saltatorial femurs folded under a slab of
   *  carapace — its stoop is a promised crater, its grounded recovery the
   *  longest window the murmuration ever offers. */
  chitin_saltant: {
    id: 'chitin_saltant', name: 'Chitin Saltant',
    color: '#c89040', shape: 'kite', radius: 13, material: 'chitin', look: 'chitin_saltant',
    base: { life: 130, moveSpeed: 150, accuracy: 102, armor: 35, poise: 30, mana: 20, manaRegen: 3 },
    skills: ['heavy_strike'], xp: 30,
    faction: 'chitin',
    detection: 1.0,
    temper: 'territorial',
    presence: { from: 6 },
    packSize: [2, 3],
    brain: {
      type: 'juggernaut',
      script: wingCycle({
        dive: 'saltant_slam', aloftFor: 7.5, stoopFor: 2.0, groundFor: 4.6, stoopWithin: 420,
        air: {
          move: { style: 'orbit', ring: 240, pace: 0.9, flipEvery: [3, 5], flipChance: 0.25 },
          behavior: { flock: { kin: 'faction', radius: 220, cohesion: 0.7, alignment: 0.9, separation: 1.1, weave: 1.8, erratic: 0.6, amplitude: 40 } },
        },
        ground: {
          move: { style: 'direct' },
        },
      }),
    },
  },

  /** The singer: its wing-comb drone is the murmuration's spine — a furor
   *  carried on the song (kill it and the frenzy dies with it). It never
   *  stoops; it only alights, and those landings are its whole weakness. */
  chitin_stridulant: {
    id: 'chitin_stridulant', name: 'Chitin Stridulant',
    color: '#f0d488', shape: 'oval', radius: 11, material: 'chitin', look: 'chitin_stridulant',
    base: { life: 110, moveSpeed: 140, accuracy: 100, evasion: 45, mana: 140, manaRegen: 9 },
    mods: [mod('chaosRes', 'flat', 0.4)],
    skills: ['stridulate', 'bile_spray'], xp: 42,
    faction: 'chitin',
    detection: 1.1,
    temper: 'territorial',
    gemBias: ['buff'],
    wardPriority: 1,
    presence: { from: 8 },
    packSize: [1, 2],
    brain: {
      type: 'commander',
      // THE SONG IS A RESERVE: it fires the moment flock kin stand in
      // earshot — the foe's distance is irrelevant to an ally-nova, so the
      // range-to-target pick gate must never be its clock. An idle roost
      // hums with furor pulses before you ever see it.
      skillUse: { reserve: [{ skill: 'stridulate', when: { alliesWithin: { count: 1, radius: 300 } } }] },
      script: wingCycle({
        dive: '', aloftFor: 8, stoopFor: 0, groundFor: 3.2, stoopWithin: 0,
        air: {
          move: { style: 'holdRange', hold: 300, band: [0.7, 1.35] },
          behavior: { flock: { kin: 'faction', radius: 220, cohesion: 0.9, alignment: 1.1, separation: 1, weave: 1.4, erratic: 0.5 } },
        },
        ground: {
          move: { style: 'holdRange', hold: 260, band: [0.7, 1.4] },
        },
      }),
    },
  },

  // ======================================================= THE SAND SARCOPHATE
  // The tomb-dynasty under the deep desert: an interred legion that never
  // agreed it was done ruling. DEFENSE TEXTURE — LAYERS THAT STRIP: the linen
  // is a slow-knitting all-round ablative (shellGuard low-max: soak it off,
  // then the meat), the warden is the family's POISE WALL carrying its own
  // sarcophagus, and what steps OUT of a cracked case is the second life —
  // fast, bare, and past its armor (brain.onDeath, the one death-division
  // seam). Family debts: dry linen BURNS (fireRes deficit family-wide), and
  // nothing embalmed fears venom or rot (chaos-tagged ailmentResist — the
  // one shrug lever the status-apply gate reads; the whole chaos-ailment
  // family shrugs with it). Gold marks rank; the husk has none left. Kills
  // feed the Deadwake — the faction row is deathAligned.
  /** The gilded beetle-swarm of the vaults: numbers, not defenses. */
  tomb_scarab: {
    id: 'tomb_scarab', name: 'Tomb Scarab',
    color: '#c9a24a', shape: 'circle', radius: 8, material: 'chitin', look: 'tomb_scarab',
    base: { life: 22, moveSpeed: 175, accuracy: 100, armor: 30, evasion: 0, mana: 0 },
    mods: [mod('ailmentResist', 'flat', 0.5, ['chaos']), mod('fireRes', 'flat', -0.2)],
    skills: ['claw'], xp: 7,
    faction: 'sarcophate',
    tags: ['beast'],
    scaleVariance: [0.85, 1.15],
    temper: 'territorial',
    brain: { type: 'swarm' },
  },
  /** The line of the old legion: strip the wrappings, then the meat. */
  sarcophate_legionary: {
    id: 'sarcophate_legionary', name: 'Sarcophate Legionary',
    color: '#d8cba8', shape: 'pentagon', radius: 12, material: 'cloth', look: 'sarcophate_legionary',
    base: { life: 62, moveSpeed: 108, accuracy: 102, armor: 25, poise: 25, evasion: 0, mana: 0 },
    mods: [mod('ailmentResist', 'flat', 0.5, ['chaos']), mod('chaosRes', 'flat', 0.25), mod('fireRes', 'flat', -0.25)],
    skills: ['entombing_lash'], xp: 18,
    faction: 'sarcophate',
    tags: ['undead'],
    // The LINEN: a low-max all-round soak that knits back slowly — the layer
    // you strip before anything else lands (never a wall; the poise below it
    // is modest and the meat under both is thin).
    shellGuard: { side: 'all', max: 45, regenDelay: 6, regenRate: 8, color: '#d8cba8' },
    temper: 'territorial',
  },
  /** The embalmer-priest: jarred vitae for a shield, curses for a craft. */
  canopic_bearer: {
    id: 'canopic_bearer', name: 'Canopic Bearer',
    color: '#b89858', shape: 'pentagon', radius: 12, material: 'cloth', look: 'canopic_bearer',
    base: { life: 38, energyShield: 48, moveSpeed: 118, accuracy: 100, mana: 70, manaRegen: 6 },
    mods: [mod('ailmentResist', 'flat', 0.5, ['chaos']), mod('fireRes', 'flat', -0.2)],
    skills: ['spectral_finger', 'despair'], xp: 24,
    faction: 'sarcophate',
    tags: ['undead'],
    gemBias: ['spell', 'chaos'],
    presence: { from: 6 },
    temper: 'territorial',
    brain: { type: 'caster', withdraw: 1.2 },
  },
  /** The walking tomb: the family's poise wall — and a case that CRACKS. */
  sarcophagus_warden: {
    id: 'sarcophagus_warden', name: 'Sarcophagus Warden',
    color: '#cfc4ac', shape: 'hexagon', radius: 22, material: 'stone', look: 'sarcophagus_warden',
    base: { life: 240, moveSpeed: 72, accuracy: 98, armor: 45, poise: 80, evasion: 0, mana: 30, manaRegen: 3 },
    mods: [mod('ailmentResist', 'flat', 0.5, ['chaos']), mod('chaosRes', 'flat', 0.25), mod('fireRes', 'flat', -0.3)],
    skills: ['heavy_strike', 'ground_slam'], xp: 55,
    faction: 'sarcophate',
    tags: ['undead'],
    turnSpeed: 2.6,
    presence: { from: 9 },
    temper: 'territorial',
    // THE SECOND LIFE: kill the case and the tenant steps out — the death-
    // division seam (brain.onDeath), never a bespoke resurrect path.
    brain: {
      type: 'juggernaut', enrage: 0.35,
      onDeath: [{ do: 'summon', monster: 'risen_husk', count: 1, ring: 12, announce: 'the case cracks open!' }],
    },
  },
  /** What the case held: fast, bare, and past every layer it owned. */
  risen_husk: {
    id: 'risen_husk', name: 'Risen Husk',
    color: '#a89070', shape: 'triangle', radius: 11, material: 'cloth', look: 'risen_husk',
    base: { life: 52, moveSpeed: 200, accuracy: 106, evasion: 30, armor: 5, mana: 0 },
    mods: [mod('ailmentResist', 'flat', 0.5, ['chaos']), mod('fireRes', 'flat', -0.35)],
    skills: ['claw'], xp: 14,
    faction: 'sarcophate',
    tags: ['undead'],
    temper: 'territorial',
    brain: { type: 'skirmish', withdraw: 0.4 },
  },

  // --- THE UNSEALING's named bodies (event-spawned only — packages/defs/
  // unsealing.ts; NEVER on a spawn table). The four seal-bearers split the
  // family's defense textures four ways so every fight asks a different
  // question; each wears its OWN jar (the canopicJar stopper vocabulary),
  // so which talisman you are about to flare reads from the silhouette.
  /** The Jackal ward: the tomb's courser — evasion, speed, the long lash. */
  canopic_jackal: {
    id: 'canopic_jackal', name: 'Sethuk the Jackal-Jarred',
    color: '#c8a050', shape: 'triangle', radius: 13, material: 'cloth', look: 'canopic_jackal',
    base: { life: 150, moveSpeed: 195, accuracy: 112, evasion: 70, armor: 10, mana: 0 },
    mods: [mod('ailmentResist', 'flat', 0.5, ['chaos']), mod('fireRes', 'flat', -0.25)],
    skills: ['entombing_lash'], xp: 90,
    faction: 'sarcophate',
    tags: ['undead'],
    noNemesis: true,
    drops: 1, orbDrops: 0.4,
    brain: { type: 'skirmish', withdraw: 0.9, move: { style: 'juke', hookEvery: [0.4, 0.8], hookArc: 1.1 } },
  },
  /** The Falcon ward: the tomb's far eye — ES over thin life, patient bolts. */
  canopic_falcon: {
    id: 'canopic_falcon', name: 'Qeresh the Falcon-Jarred',
    color: '#d8b868', shape: 'kite', radius: 12, material: 'cloth', look: 'canopic_falcon',
    base: { life: 95, energyShield: 90, moveSpeed: 140, accuracy: 112, mana: 70, manaRegen: 7 },
    mods: [mod('ailmentResist', 'flat', 0.5, ['chaos']), mod('fireRes', 'flat', -0.25)],
    skills: ['spectral_finger', 'bone_arrow'], xp: 90,
    faction: 'sarcophate',
    tags: ['undead'],
    noNemesis: true,
    drops: 1, orbDrops: 0.4,
    brain: { type: 'caster', withdraw: 1.3 },
  },
  /** The Ape ward: the tomb's shoulders — the poise wall with hands. */
  canopic_ape: {
    id: 'canopic_ape', name: 'Hapura the Ape-Jarred',
    color: '#b89858', shape: 'hexagon', radius: 19, material: 'cloth', look: 'canopic_ape',
    base: { life: 280, moveSpeed: 92, accuracy: 104, armor: 40, poise: 95, evasion: 0, mana: 20, manaRegen: 3 },
    mods: [mod('ailmentResist', 'flat', 0.5, ['chaos']), mod('chaosRes', 'flat', 0.25), mod('fireRes', 'flat', -0.3)],
    skills: ['ground_slam', 'heavy_strike'], xp: 95,
    faction: 'sarcophate',
    tags: ['undead'],
    noNemesis: true,
    turnSpeed: 3,
    drops: 1, orbDrops: 0.4,
    brain: { type: 'juggernaut', enrage: 0.4 },
  },
  /** The Vizier ward: the tomb's tongue — curses first, mercy never. */
  canopic_vizier: {
    id: 'canopic_vizier', name: 'Imsah the Vizier-Jarred',
    color: '#d8c078', shape: 'pentagon', radius: 13, material: 'cloth', look: 'canopic_vizier',
    base: { life: 120, energyShield: 110, moveSpeed: 120, accuracy: 106, mana: 110, manaRegen: 9 },
    mods: [mod('ailmentResist', 'flat', 0.5, ['chaos']), mod('chaosRes', 'flat', 0.25), mod('fireRes', 'flat', -0.25)],
    skills: ['despair', 'doom_chant', 'lifedrain'], xp: 95,
    faction: 'sarcophate',
    tags: ['undead'],
    noNemesis: true,
    gemBias: ['spell', 'chaos'],
    drops: 1, orbDrops: 0.4,
    brain: { type: 'caster', withdraw: 1.2 },
  },
  /** THE SAND REGENT — the Unsealing's tomb boss (never a warlord, never a
   *  table row): full shell AND deep poise on one body — the apex exception,
   *  earned by the four-talisman door it wakes behind. The dry-linen fire
   *  debt stays honest even here. */
  sand_regent: {
    id: 'sand_regent', name: 'Sand Regent',
    color: '#e8c060', shape: 'hexagon', radius: 26, material: 'stone', look: 'sand_regent',
    base: { life: 640, moveSpeed: 95, accuracy: 112, armor: 55, poise: 150, evasion: 0, mana: 90, manaRegen: 8 },
    mods: [mod('ailmentResist', 'flat', 0.75, ['chaos']), mod('chaosRes', 'flat', 0.4), mod('fireRes', 'flat', -0.25)],
    skills: ['entombing_lash', 'ground_slam', 'doom_chant'], xp: 420,
    faction: 'sarcophate',
    tags: ['undead'],
    boss: true,
    noNemesis: true,
    turnSpeed: 3.2,
    shellGuard: { side: 'all', max: 130, regenDelay: 7, regenRate: 18, color: '#e8c060' },
    loot: 'regent_hoard',
    brain: {
      type: 'juggernaut', enrage: 0.35,
      phases: [
        { atLifeFrac: 0.65, onEnter: [{ do: 'summon', monster: 'risen_husk', count: 2, ring: 64, announce: 'the honor guard steps out of the walls!' }] },
        { atLifeFrac: 0.3, onEnter: [{ do: 'summon', monster: 'risen_husk', count: 3, ring: 64 }] },
      ],
    },
  },

  // --- THE COILBORN (serpentfolk of the wet margins) --------------------------
  // The littoral country's own banner: true NAGA — humanoid torsos over
  // worm-tail coils — plus the marsh adders they keep as the desert keeps
  // dogs. Family doctrine, per the defense-texture ledger: COILED EVASION is
  // the family signature (the first faction whose DOCTRINE is the dodge —
  // no shells, no block, no ES), CONSTRICTION is its control (pulled, held,
  // squeezed), and the WET GROUND is its armor — every member ignores the
  // water/swamp/bog/mud footing that taxes everything else in its country
  // (immuneGround: movement-as-enemy is the identity). Counterlevers hold
  // the doctrine honest: venom-proof blood (chaos-tagged ailmentResist —
  // bog-rot shrugs with it; the serpent is unbothered by its own swamp)
  // but COLD-BLOODED — frost bites the serpent harder (the one family that
  // fears the chill lanes, where the Rimebound fear fire). Poison STACKS
  // are the offense.
  // Hard presence floors on the court tiers (the sarcophate discipline).
  // Warlord: the Coil Matriarch (WARLORD_OF) — the crown DOES march.
  marsh_adder: {
    id: 'marsh_adder', name: 'Marsh Adder',
    color: '#6a9a4a', shape: 'circle', radius: 9, material: 'scale', look: 'marsh_adder',
    base: { life: 26, moveSpeed: 190, accuracy: 100, evasion: 50, mana: 0 },
    mods: [mod('ailmentResist', 'flat', 0.75, ['chaos']), mod('coldRes', 'flat', -0.25)],
    skills: ['fang_strike'], xp: 8,
    faction: 'coilborn',
    tags: ['beast'],
    immuneGround: ['water', 'swamp', 'bog', 'mud', 'tide_pool', 'brine_sink'],
    worm: { length: 6, spacing: 10, taper: 0.9 },
    scaleVariance: [0.85, 1.2],
    temper: 'skittish',
    brain: { type: 'swarm' },
  },
  bog_strider: {
    id: 'bog_strider', name: 'Bog Strider',
    color: '#4a8a6a', shape: 'triangle', radius: 12, material: 'scale', look: 'bog_strider',
    base: { life: 58, moveSpeed: 150, accuracy: 102, evasion: 55, mana: 20, manaRegen: 2 },
    mods: [mod('ailmentResist', 'flat', 0.75, ['chaos']), mod('coldRes', 'flat', -0.25)],
    skills: ['fang_strike', 'dart_volley'], xp: 18,
    faction: 'coilborn',
    immuneGround: ['water', 'swamp', 'bog', 'mud', 'tide_pool', 'brine_sink'],
    worm: { length: 5, spacing: 13, taper: 0.86 },
    scaleVariance: [0.9, 1.1],
    gemBias: ['projectile', 'physical'],
    temper: 'territorial',
    brain: { type: 'flanker', move: { style: 'lurk' } },
  },
  // The artillery: the hood flares FULL before the spray — you read the
  // spit coming across the whole pool.
  hooded_spitter: {
    id: 'hooded_spitter', name: 'Hooded Spitter',
    color: '#7ab04e', shape: 'oval', radius: 12, material: 'scale', look: 'hooded_spitter',
    base: { life: 55, moveSpeed: 105, accuracy: 100, evasion: 30, mana: 60, manaRegen: 4 },
    mods: [mod('ailmentResist', 'flat', 0.75, ['chaos']), mod('coldRes', 'flat', -0.25)],
    skills: ['acid_spray', 'venom_bolt'], xp: 22,
    faction: 'coilborn',
    immuneGround: ['water', 'swamp', 'bog', 'mud', 'tide_pool', 'brine_sink'],
    worm: { length: 5, spacing: 13, taper: 0.86 },
    presence: { from: 4 },
    gemBias: ['chaos', 'aoe'],
    temper: 'territorial',
    brain: { type: 'strafer' },
  },
  // The venom-speaker: the chant is the threat — kin around a priest fight
  // quicker and meaner, so the litany names your first target.
  fang_priest: {
    id: 'fang_priest', name: 'Fang Priest',
    color: '#5aa07a', shape: 'pentagon', radius: 13, material: 'scale', look: 'fang_priest',
    base: { life: 70, moveSpeed: 95, accuracy: 100, evasion: 25, mana: 140, manaRegen: 8 },
    mods: [mod('ailmentResist', 'flat', 0.75, ['chaos']), mod('coldRes', 'flat', -0.25)],
    skills: ['venom_bolt', 'poison_nova'], xp: 26,
    faction: 'coilborn',
    immuneGround: ['water', 'swamp', 'bog', 'mud', 'tide_pool', 'brine_sink'],
    worm: { length: 4, spacing: 14, taper: 0.85 },
    presence: { from: 6 },
    gemBias: ['chaos', 'duration'],
    temper: 'territorial',
    brain: {
      type: 'caster',
      rules: [{
        // The venom chant: nearby kin quicken (the spore_caller litany
        // pattern — distUnder keeps it on-screen).
        when: { alliesWithin: { count: 2, radius: 280 }, distUnder: 700 }, every: [12, 18], hold: [0.3, 0.5],
        announce: 'the priest hisses the venom chant…',
        actions: [{ do: 'buff', buff: { type: 'buff', id: 'venom_chant', duration: 6, mods: [mod('damage', 'increased', 0.15), mod('moveSpeed', 'increased', 0.1)] } }],
      }],
    },
  },
  // The wall that wraps you: the family's one heavy — armor and poise over
  // MODEST evasion (even the knight sways), and the coil drags you in.
  constrictor_knight: {
    id: 'constrictor_knight', name: 'Constrictor Knight',
    color: '#3f7a68', shape: 'hexagon', radius: 16, material: 'scale', look: 'constrictor_knight',
    base: { life: 210, moveSpeed: 85, accuracy: 104, armor: 40, poise: 70, evasion: 15, mana: 20, manaRegen: 2 },
    mods: [mod('ailmentResist', 'flat', 0.75, ['chaos']), mod('coldRes', 'flat', -0.3)],
    skills: ['constrictor_coil', 'heavy_strike'], xp: 50,
    faction: 'coilborn',
    immuneGround: ['water', 'swamp', 'bog', 'mud', 'tide_pool', 'brine_sink'],
    worm: { length: 7, spacing: 18, taper: 0.9 },
    presence: { from: 9 },
    turnSpeed: 2.8,
    gemBias: ['melee', 'duration'],
    temper: 'territorial',
    brain: { type: 'juggernaut', enrage: 0.4 },
  },
  // The song in the reeds: she pulls you to HER ground — the drag itself is
  // survivable; the water it leaves you standing in is the fight.
  siren_adder: {
    id: 'siren_adder', name: 'Siren-Adder',
    color: '#4a9a9a', shape: 'oval', radius: 12, material: 'scale', look: 'siren_adder',
    base: { life: 85, moveSpeed: 110, accuracy: 102, evasion: 60, mana: 120, manaRegen: 7 },
    mods: [mod('ailmentResist', 'flat', 0.75, ['chaos']), mod('coldRes', 'flat', -0.25)],
    skills: ['siren_song', 'venom_bolt'], xp: 30,
    faction: 'coilborn',
    immuneGround: ['water', 'swamp', 'bog', 'mud', 'tide_pool', 'brine_sink'],
    worm: { length: 6, spacing: 13, taper: 0.85 },
    presence: { from: 8 },
    gemBias: ['duration', 'projectile'],
    temper: 'wary',
    brain: { type: 'strafer' },
  },
  // THE COIL MATRIARCH — the crown of the wet margins (WARLORD_OF seat).
  // Warlord discipline (the balor/countess floor): a throne-tier body
  // carries a def-level HARD gate, so no table or bias fields her early;
  // her warlord seat spawns explicitly and ignores presence by design.
  coil_matriarch: {
    id: 'coil_matriarch', name: 'Coil Matriarch',
    color: '#3f9a7e', shape: 'star', radius: 20, material: 'scale', look: 'coil_matriarch',
    base: { life: 190, moveSpeed: 100, accuracy: 110, evasion: 45, armor: 20, mana: 180, manaRegen: 10 },
    mods: [mod('ailmentResist', 'flat', 0.9, ['chaos']), mod('coldRes', 'flat', -0.25), mod('damage', 'increased', 0.12)],
    skills: ['constrictor_coil', 'poison_nova', 'siren_song'], xp: 65,
    faction: 'coilborn',
    immuneGround: ['water', 'swamp', 'bog', 'mud', 'tide_pool', 'brine_sink'],
    worm: { length: 8, spacing: 20, taper: 0.9 },
    presence: { from: 13 },
    gemBias: ['chaos', 'duration'],
    wardPriority: 2,
    detection: 1.2,
    temper: 'territorial',
    brain: {
      type: 'commander',
      rules: [{
        when: { distUnder: 520 }, every: [14, 20], hold: [0.4, 0.6],
        announce: 'the Matriarch\'s hiss carries across the water!',
        actions: [{ do: 'summon', monster: 'marsh_adder', count: 3, ring: 52 }],
      }],
    },
  },

  // --- THE LORDS BELOW (the Underworld War's officer tiers) -------------------
  // The War Below (packages/lords.ts + overlays/hellWar.ts) fields the demon
  // library under EIGHT banners; these are the bodies only the war spawns:
  // four HOST ELITES (the textures the existing library lacked), eight
  // MARSHALS (front officers — every one wears its lord's BANNER on its back,
  // the one at-a-glance war read), and eight LORDS (throne bodies — citadel
  // set-pieces, never tabled). Defense textures differ per banner, per the
  // doctrine: ember glass, iron anvil, gorged regen, void ES, doom ward,
  // hushed evasion, phalanx poise, gilded leech. Officer tiers carry HARD
  // def-level presence floors (the balor discipline) as belt-and-braces —
  // their tables already floor them, and no other table may field them low.
  chain_warden: {
    id: 'chain_warden', name: 'Chain Warden',
    color: '#8a94b8', shape: 'hexagon', radius: 14, material: 'metal', look: 'chain_warden',
    base: { life: 120, moveSpeed: 90, accuracy: 104, armor: 45, poise: 45, mana: 60, manaRegen: 4 },
    mods: [mod('fireRes', 'flat', 0.3), mod('chaosRes', 'flat', 0.3)],
    skills: ['hellchain_volley', 'heavy_strike'], xp: 34,
    faction: 'demon',
    presence: { from: 10 },
    gemBias: ['duration', 'physical'],
    temper: 'territorial',
    brain: { type: 'strafer' },
  },
  // The hush is the threat: her toll locks the CASTER'S verb — switch to
  // steel or stand mute (the selective-CC counterplay, fielded by a family).
  hushmaiden: {
    id: 'hushmaiden', name: 'Hushmaiden',
    color: '#5aa0a0', shape: 'oval', radius: 12, material: 'ethereal', look: 'hushmaiden',
    base: { life: 78, moveSpeed: 115, accuracy: 102, evasion: 55, mana: 120, manaRegen: 8 },
    mods: [mod('chaosRes', 'flat', 0.4)],
    skills: ['hush_toll', 'claw'], xp: 30,
    faction: 'demon',
    presence: { from: 6 },
    gemBias: ['duration', 'aoe'],
    temper: 'wary',
    brain: { type: 'caster' },
  },
  veil_stalker: {
    id: 'veil_stalker', name: 'Veil Stalker',
    color: '#4a8a8a', shape: 'kite', radius: 12, material: 'ethereal', look: 'veil_stalker',
    base: { life: 88, moveSpeed: 165, accuracy: 108, evasion: 70, mana: 30, manaRegen: 3 },
    mods: [mod('critChance', 'flat', 0.12), mod('chaosRes', 'flat', 0.3)],
    skills: ['claw'], xp: 32,
    faction: 'demon',
    presence: { from: 8 },
    gemBias: ['melee', 'physical'],
    temper: 'skittish',
    brain: { type: 'flanker', move: { style: 'lurk' } },
  },
  // The collector: the rake TAKES — armor shredded off the debtor, life
  // leeched back to the ledger (mods carry the theft; no bespoke drain).
  tithe_reaper: {
    id: 'tithe_reaper', name: 'Tithe Reaper',
    color: '#8ab04a', shape: 'pentagon', radius: 13, material: 'metal', look: 'tithe_reaper',
    base: { life: 105, moveSpeed: 120, accuracy: 104, armor: 25, mana: 40, manaRegen: 3 },
    mods: [mod('lifeLeech', 'flat', 0.06), mod('chaosRes', 'flat', 0.3)],
    skills: ['tithe_rake'], xp: 33,
    faction: 'demon',
    presence: { from: 6 },
    gemBias: ['melee', 'chaos'],
    temper: 'territorial',
    brain: { type: 'flanker' },
  },

  // --- the eight MARSHALS (front officers; Actor.eventKey carries the lord) --
  marshal_surtash: {
    id: 'marshal_surtash', name: 'Brandmarshal of Surtash',
    color: '#ff8c2e', shape: 'star', radius: 17, material: 'ember', look: 'marshal_surtash',
    base: { life: 215, moveSpeed: 125, accuracy: 122, mana: 120, manaRegen: 8, poise: 70 },
    mods: [mod('fireRes', 'flat', 0.6), mod('coldRes', 'flat', -0.2), mod('damage', 'increased', 0.2)],
    skills: ['hellfire_lash', 'rain_of_ash', 'war_cry'], xp: 88, faction: 'demon', adorn: 'wings',
    presence: { from: 14, fadeIn: 4 },
    gemBias: ['fire', 'aoe'], wardPriority: 2,
    detection: 1.3, temper: 'territorial',
    brain: { type: 'commander' },
  },
  marshal_vormaul: {
    id: 'marshal_vormaul', name: 'Warden-Marshal of Vormaul',
    color: '#8a94b8', shape: 'hexagon', radius: 18, material: 'metal', look: 'marshal_vormaul',
    base: { life: 260, moveSpeed: 85, accuracy: 115, armor: 70, poise: 90, mana: 60, manaRegen: 4 },
    mods: [mod('fireRes', 'flat', 0.4), mod('chaosRes', 'flat', 0.4)],
    skills: ['hellchain_volley', 'heavy_strike', 'ground_slam'], xp: 90, faction: 'demon',
    presence: { from: 14, fadeIn: 4 },
    gemBias: ['physical', 'duration'], wardPriority: 2,
    detection: 1.3, temper: 'territorial', turnSpeed: 2.6,
    brain: { type: 'juggernaut', enrage: 0.35 },
  },
  marshal_morgrath: {
    id: 'marshal_morgrath', name: 'Gorge-Marshal of Morgrath',
    color: '#b8405e', shape: 'octagon', radius: 18, material: 'flesh', look: 'marshal_morgrath',
    base: { life: 300, moveSpeed: 110, accuracy: 112, lifeRegen: 6, mana: 40, manaRegen: 3, poise: 80, poiseDR: 0.4 },
    mods: [mod('chaosRes', 'flat', 0.4), mod('lifeLeech', 'flat', 0.05)],
    skills: ['gore_rend', 'war_cry', 'claw'], xp: 88, faction: 'demon', adorn: 'spikes',
    presence: { from: 14, fadeIn: 4 },
    gemBias: ['physical', 'melee'], wardPriority: 2,
    detection: 1.3, temper: 'territorial',
    brain: { type: 'juggernaut', enrage: 0.5 },
  },
  marshal_vethriss: {
    id: 'marshal_vethriss', name: 'Gate-Marshal of Vethriss',
    color: '#9a5ae8', shape: 'pentagon', radius: 16, material: 'void', look: 'marshal_vethriss',
    base: { life: 190, moveSpeed: 105, accuracy: 118, energyShield: 90, mana: 160, manaRegen: 10 },
    mods: [mod('chaosRes', 'flat', 0.5)],
    skills: ['infernal_rift', 'call_the_rift'], xp: 90, faction: 'demon',
    presence: { from: 14, fadeIn: 4 },
    gemBias: ['chaos', 'minion'], wardPriority: 2,
    detection: 1.3, temper: 'wary',
    brain: { type: 'caster' },
  },
  marshal_ozrimoth: {
    id: 'marshal_ozrimoth', name: 'Sermon-Marshal of Ozrimoth',
    color: '#d8b83a', shape: 'pentagon', radius: 16, material: 'bone', look: 'marshal_ozrimoth',
    base: { life: 205, moveSpeed: 95, accuracy: 116, armor: 30, mana: 180, manaRegen: 11 },
    mods: [mod('chaosRes', 'flat', 0.5), mod('fireRes', 'flat', 0.3)],
    skills: ['doom_chant', 'word_of_unmaking'], xp: 92, faction: 'demon', adorn: 'wings',
    presence: { from: 14, fadeIn: 4 },
    gemBias: ['chaos', 'duration'], wardPriority: 2,
    detection: 1.3, temper: 'territorial',
    brain: { type: 'caster' },
  },
  marshal_nyxara: {
    id: 'marshal_nyxara', name: 'Hush-Marshal of Nyxara',
    color: '#5aa0a0', shape: 'oval', radius: 16, material: 'ethereal', look: 'marshal_nyxara',
    base: { life: 195, moveSpeed: 140, accuracy: 120, evasion: 75, mana: 140, manaRegen: 9 },
    mods: [mod('chaosRes', 'flat', 0.4), mod('critChance', 'flat', 0.1)],
    skills: ['hush_toll', 'claw', 'gore_rend'], xp: 88, faction: 'demon',
    presence: { from: 14, fadeIn: 4 },
    gemBias: ['duration', 'melee'], wardPriority: 2,
    detection: 1.4, temper: 'wary',
    brain: { type: 'flanker', move: { style: 'lurk' } },
  },
  marshal_bhorog: {
    id: 'marshal_bhorog', name: 'Siege-Marshal of Bhorog',
    color: '#a8683a', shape: 'hexagon', radius: 18, material: 'metal', look: 'marshal_bhorog',
    base: { life: 275, moveSpeed: 90, accuracy: 114, armor: 65, poise: 75, mana: 50, manaRegen: 4 },
    mods: [mod('fireRes', 'flat', 0.4), mod('damage', 'increased', 0.15)],
    skills: ['ground_slam', 'heavy_strike', 'war_cry'], xp: 90, faction: 'demon',
    presence: { from: 14, fadeIn: 4 },
    gemBias: ['physical', 'aoe'], wardPriority: 2,
    detection: 1.3, temper: 'territorial', turnSpeed: 2.8,
    brain: { type: 'commander' },
  },
  marshal_molochai: {
    id: 'marshal_molochai', name: 'Tithe-Marshal of Molochai',
    color: '#8ab04a', shape: 'star', radius: 17, material: 'metal', look: 'marshal_molochai',
    base: { life: 220, moveSpeed: 115, accuracy: 118, armor: 35, mana: 100, manaRegen: 7, poise: 70 },
    mods: [mod('lifeLeech', 'flat', 0.08), mod('chaosRes', 'flat', 0.4)],
    skills: ['tithe_rake', 'fulminate', 'war_cry'], xp: 90, faction: 'demon',
    presence: { from: 14, fadeIn: 4 },
    gemBias: ['chaos', 'melee'], wardPriority: 2,
    detection: 1.3, temper: 'territorial',
    brain: { type: 'commander' },
  },

  // --- the eight LORDS (throne bodies — citadel set-pieces, never tabled) -----
  lord_surtash: {
    id: 'lord_surtash', name: 'Surtash, the Pyre Sovereign',
    color: '#ff8c2e', shape: 'star', radius: 27, material: 'ember', look: 'lord_surtash',
    base: { life: 500, moveSpeed: 120, accuracy: 132, mana: 260, manaRegen: 13 },
    mods: [mod('fireRes', 'flat', 0.75), mod('coldRes', 'flat', -0.25), mod('damage', 'increased', 0.4)],
    skills: ['meteor_storm', 'hellfire_lash', 'flame_wave', 'war_cry'],
    xp: 165, boss: true, faction: 'demon', adorn: 'wings',
    presence: { from: 15, fadeIn: 5 },
    detection: 1.4, temper: 'territorial',
    brain: {
      type: 'juggernaut', enrage: 0.45,
      rules: [{
        when: { distUnder: 620 }, every: [16, 22], hold: [0.4, 0.6],
        announce: 'EVERYTHING BURNS.',
        actions: [{ do: 'summon', monster: 'ash_whelp', count: 4, ring: 60 }],
      }],
    },
  },
  lord_vormaul: {
    id: 'lord_vormaul', name: 'Vormaul, the Chainfather',
    color: '#8a94b8', shape: 'hexagon', radius: 28, material: 'metal', look: 'lord_vormaul',
    base: { life: 560, moveSpeed: 78, accuracy: 124, armor: 110, poise: 140, mana: 120, manaRegen: 6 },
    mods: [mod('fireRes', 'flat', 0.5), mod('chaosRes', 'flat', 0.5)],
    skills: ['hellchain_volley', 'ground_slam', 'heavy_strike'],
    xp: 168, boss: true, faction: 'demon',
    presence: { from: 15, fadeIn: 5 },
    detection: 1.3, temper: 'territorial', turnSpeed: 2.2,
    brain: {
      type: 'juggernaut', enrage: 0.3,
      rules: [{
        when: { distUnder: 520 }, every: [15, 21], hold: [0.5, 0.7],
        announce: 'the Chainfather reels the debtors in…',
        actions: [{ do: 'summon', monster: 'chained_tormentor', count: 2, ring: 64 }],
      }],
    },
  },
  lord_morgrath: {
    id: 'lord_morgrath', name: 'Morgrath, the Carrion Duke',
    color: '#b8405e', shape: 'octagon', radius: 27, material: 'flesh', look: 'lord_morgrath',
    base: { life: 620, moveSpeed: 105, accuracy: 122, lifeRegen: 14, mana: 80, manaRegen: 4 },
    mods: [mod('chaosRes', 'flat', 0.5), mod('lifeLeech', 'flat', 0.08)],
    skills: ['gore_rend', 'war_cry', 'claw'],
    xp: 162, boss: true, faction: 'demon', adorn: 'spikes',
    presence: { from: 15, fadeIn: 5 },
    detection: 1.4, temper: 'territorial',
    brain: {
      type: 'juggernaut', enrage: 0.55,
      rules: [{
        when: { lifeBelow: 0.6 }, every: [14, 20], hold: [0.4, 0.6],
        announce: 'the Duke FEEDS — the wound closes…',
        actions: [{ do: 'buff', buff: { type: 'buff', id: 'carrion_gorge', duration: 6, mods: [mod('lifeRegen', 'flat', 30), mod('damage', 'increased', 0.15)] } }],
      }],
    },
  },
  lord_vethriss: {
    id: 'lord_vethriss', name: 'Vethriss, the Regent of Doors',
    color: '#9a5ae8', shape: 'pentagon', radius: 25, material: 'void', look: 'lord_vethriss',
    base: { life: 420, moveSpeed: 110, accuracy: 128, energyShield: 220, mana: 300, manaRegen: 16 },
    mods: [mod('chaosRes', 'flat', 0.6)],
    skills: ['infernal_rift', 'call_the_rift'],
    xp: 170, boss: true, faction: 'demon',
    presence: { from: 15, fadeIn: 5 },
    detection: 1.4, temper: 'wary',
    brain: {
      type: 'caster',
      rules: [{
        when: { distUnder: 700 }, every: [13, 18], hold: [0.4, 0.6],
        announce: 'a door opens where Vethriss pleases…',
        actions: [{ do: 'summon', monster: 'demonkin_darter', count: 2, ring: 90 }],
      }],
    },
  },
  lord_ozrimoth: {
    id: 'lord_ozrimoth', name: 'Ozrimoth, the Last Word',
    color: '#d8b83a', shape: 'pentagon', radius: 26, material: 'bone', look: 'lord_ozrimoth',
    base: { life: 480, moveSpeed: 88, accuracy: 126, armor: 50, mana: 320, manaRegen: 17 },
    mods: [mod('chaosRes', 'flat', 0.65), mod('fireRes', 'flat', 0.4)],
    skills: ['word_of_unmaking', 'null_verge', 'doom_chant'],
    xp: 172, boss: true, faction: 'demon', adorn: 'wings',
    presence: { from: 15, fadeIn: 5 },
    detection: 1.4, temper: 'territorial',
    brain: {
      type: 'caster',
      rules: [{
        when: { distUnder: 640 }, every: [17, 24], hold: [0.6, 0.8],
        announce: 'Ozrimoth pronounces your ending…',
        actions: [{ do: 'summon', monster: 'doomherald', count: 1, ring: 70 }],
      }],
    },
  },
  lord_nyxara: {
    id: 'lord_nyxara', name: 'Nyxara, the Hollow Hush',
    color: '#5aa0a0', shape: 'oval', radius: 25, material: 'ethereal', look: 'lord_nyxara',
    base: { life: 440, moveSpeed: 135, accuracy: 130, evasion: 95, mana: 240, manaRegen: 13 },
    mods: [mod('chaosRes', 'flat', 0.5), mod('critChance', 'flat', 0.12)],
    skills: ['hush_toll', 'gore_rend', 'claw'],
    xp: 166, boss: true, faction: 'demon',
    presence: { from: 15, fadeIn: 5 },
    detection: 1.5, temper: 'wary',
    brain: {
      type: 'flanker', move: { style: 'lurk' },
      rules: [{
        when: { distUnder: 560 }, every: [15, 21], hold: [0.3, 0.5],
        announce: 'the Hush deepens — something moves in it…',
        actions: [{ do: 'summon', monster: 'veil_stalker', count: 2, ring: 84 }],
      }],
    },
  },
  lord_bhorog: {
    id: 'lord_bhorog', name: 'Bhorog, the Siegewright',
    color: '#a8683a', shape: 'hexagon', radius: 28, material: 'metal', look: 'lord_bhorog',
    base: { life: 540, moveSpeed: 85, accuracy: 124, armor: 95, poise: 110, mana: 100, manaRegen: 6 },
    mods: [mod('fireRes', 'flat', 0.5), mod('damage', 'increased', 0.3)],
    skills: ['ground_slam', 'cleave', 'heavy_strike', 'war_cry'],
    xp: 164, boss: true, faction: 'demon',
    presence: { from: 15, fadeIn: 5 },
    detection: 1.3, temper: 'territorial', turnSpeed: 2.4,
    brain: {
      type: 'commander',
      rules: [{
        when: { distUnder: 600 }, every: [18, 26], hold: [0.6, 0.9],
        announce: 'Bhorog calls up the engines!',
        actions: [{ do: 'summon', monster: 'siege_hulk', count: 1, ring: 76 }],
      }],
    },
  },
  lord_molochai: {
    id: 'lord_molochai', name: 'Molochai, the Tithe-King',
    color: '#8ab04a', shape: 'star', radius: 26, material: 'metal', look: 'lord_molochai',
    base: { life: 470, moveSpeed: 112, accuracy: 128, armor: 55, mana: 220, manaRegen: 12 },
    mods: [mod('lifeLeech', 'flat', 0.1), mod('chaosRes', 'flat', 0.5)],
    skills: ['tithe_rake', 'fulminate', 'war_cry'],
    xp: 168, boss: true, faction: 'demon',
    presence: { from: 15, fadeIn: 5 },
    detection: 1.4, temper: 'territorial',
    brain: {
      type: 'commander',
      rules: [{
        when: { distUnder: 600 }, every: [14, 19], hold: [0.4, 0.6],
        announce: 'the Tithe-King sends his collectors!',
        actions: [{ do: 'summon', monster: 'imp', count: 4, ring: 70 }],
      }],
    },
  },
};

// ---------------------------------------------------------------------------
// FACTION DIPLOMACY — who hates whom, as data.
//
// Unlisted pairs are NEUTRAL: they ignore each other and fight only the
// player. 'hostile' pairs tear into each other whenever they share ground —
// no war-zone flag required. 'ally' pairs never harm each other and may
// one day share rally cries and reinforcements.
// ---------------------------------------------------------------------------

export type FactionStance = 'hostile' | 'neutral' | 'ally';

const RELATIONS: Record<string, FactionStance> = {
  // The dead offend nearly everything that lives.
  'goblin|undead': 'hostile',
  'gnoll|undead': 'hostile',
  'sylvan|undead': 'hostile',
  // The high sky has a food chain: shrikes stoop on the weather-scraps.
  'galekin|zephyrid': 'hostile',
  // — and the cosmos hunts it: comet hounds run the wild sky's herds down
  // where the vesper meadows meet the drift.
  'vesperkin|zephyrid': 'hostile',
  // Gnolls run with the warband — and burn the groves.
  'gnoll|goblin': 'ally',
  'gnoll|sylvan': 'hostile',
  // The old kinships of the land.
  'sylvan|wild': 'ally',
  'elemental|sylvan': 'ally',
  'elemental|wild': 'neutral',
  // Warbands raid the deep woods too.
  'goblin|sylvan': 'hostile',
  // The Legion burns the living and the dead alike; only raw fire is kin.
  'demon|goblin': 'hostile',
  'demon|gnoll': 'hostile',
  'demon|sylvan': 'hostile',
  'demon|undead': 'hostile',
  'demon|wild': 'hostile',
  'demon|elemental': 'neutral',
  // The settled belt's living-world loop: the FREEHOLDS defend the worked
  // land against everything that raids it — the roads' bandits, the Chattel
  // gone wrong, the Carven walking the rows, the warband, the vermin tide.
  // These pairs ARE the farm-raid drama; no event script stages it.
  'freehold|bandit': 'hostile',
  'freehold|chattel': 'hostile',
  'freehold|carven': 'hostile',
  'freehold|goblin': 'hostile',
  'freehold|vermin': 'hostile',
  'freehold|undead': 'hostile',
  // The Horned Tribes run with the packs, raid the warband's roads, and
  // burn the groves for winter pasture.
  'beastkin|gnoll': 'ally',
  'beastkin|goblin': 'hostile',
  'beastkin|sylvan': 'hostile',
  'beastkin|demon': 'hostile',
  // The Glut eats anything still warm — and the dead are no kin of meat
  // that never stopped moving.
  'flesh|undead': 'hostile',
  'flesh|sylvan': 'hostile',
  'flesh|beastkin': 'hostile',
  'flesh|demon': 'hostile',
  // The Emberkin tend the fires the Legion treats as a DOOR — the cinder
  // country's one long war. Raw flame respects raw flame.
  'emberkin|demon': 'hostile',
  'emberkin|elemental': 'ally',
  // The Junglekin hold the strangling green against ALL comers: the Sylvan
  // court calls the jungle a garden gone feral (the tribes disagree with
  // spears), the gnolls raid its edges for slaves, the dead offend the
  // living green, and beasts of the open wild are simply prey that wandered
  // in. Only the fungal bloom is kin — rot feeds the roots.
  'junglekin|sylvan': 'hostile',
  'junglekin|gnoll': 'hostile',
  'junglekin|undead': 'hostile',
  'junglekin|demon': 'hostile',
  'junglekin|fungal': 'ally',
  // The Sirocco Court: the deep desert disputes its rim with the gnolls and
  // suffers no scavengers — three-way fights in the erg are the point.
  'sirocco|gnoll': 'hostile',
  'sirocco|goblin': 'hostile',
  'sirocco|wild': 'hostile',
  // The Night Court keeps the old courtesies: the dead serve, the groves
  // burn, and the Horned Tribes are prey that fights back.
  'nightkin|undead': 'ally',
  'nightkin|sylvan': 'hostile',
  'nightkin|beastkin': 'hostile',
  'nightkin|demon': 'hostile',
  // The Carven Court is the harvest the estates let go feral: it resents
  // the Night Court that owned those fields AND the household dead the
  // Court keeps — so the Gloamwood country brawls three ways wherever the
  // faces meet (the sirocco/erg doctrine, transplanted to the crofts).
  'carven|nightkin': 'hostile',
  'carven|undead': 'hostile',
  // The Caulborn are the thing HELL is afraid of: an invading organism
  // remaking the underworld inside its own membrane. The Legion fights for
  // its home ground; the Glut resents a rival meat; the eldritch recognize
  // kin — the same outside, wearing a body that works.
  'caulborn|demon': 'hostile',
  'caulborn|flesh': 'hostile',
  'caulborn|eldritch': 'ally',
  // The Hollowborn guard interred iron against every looter's hand —
  // warbands pry, vermin nest in the greaves. Both learn.
  'hollowborn|goblin': 'hostile',
  'hollowborn|vermin': 'hostile',
  // The Chattel remember the wild things that culled the herd — and the
  // packs that ran them. Wolves take note: the herd gores back now.
  'chattel|beast': 'hostile',
  'chattel|gnoll': 'hostile',
  // Raw force recognizes raw lattice — the Unbound treat the fallen sky as kin.
  'starfall|elemental': 'ally',
  // DECLARATIVE diplomacy for the RESERVED kin (inert until their doors ship;
  // recorded now so the day they field, the world already has opinions):
  // the Smoulderkin burn the green; the Magpie Kin and the warrens want the
  // same floor.
  'smoulder|sylvan': 'hostile',
  'magpie|vermin': 'hostile',
  // — and the Unrusted were BUILT to keep the dead out of the empire's
  // halls: anti-necromancy is the charter itself (their kills feed no
  // corpse economy, and their ground gives the Risen Host nothing to
  // raise — the war is total by construction).
  'unrusted|undead': 'hostile',
  // The Compact's charters put a PERMANENT price on the road-toll trade:
  // merchants and bandits want the same wagons, pointed opposite ways.
  'compact|bandit': 'hostile',
  // The Seethe wants the deep sand to itself: the packs raid its warrens
  // for grubs, and the Court remembers when the erg was ITS floor alone —
  // the desert's turf war grows a third banner.
  'chitin|gnoll': 'hostile',
  'chitin|sirocco': 'hostile',
  // The wing falls on the herds when the cycle turns: the Swarming strips
  // migrations at map scale, and on shared ground the fliers do it in person.
  'beast|chitin': 'hostile',
  // The Rimebound keep the cold belt's old law: raw frost respects raw
  // element, the Horned Tribes burn court timber for winter pasture (the
  // passes' raiders vs the white court — the cold roads' long war), and
  // the warm-blooded wild is the hunt the court was crowned to ride.
  'rimebound|elemental': 'ally',
  'rimebound|beastkin': 'hostile',
  'rimebound|wild': 'hostile',
  // The Sand Sarcophate suffers nothing LIVING in its country: gnoll packs
  // dig up the shallow graves for marrow, and the Sirocco Court squats in
  // palaces the dynasty still holds title to. The graveland dead are distant
  // cousins — different rites, same side of the soil.
  'sarcophate|gnoll': 'hostile',
  'sarcophate|sirocco': 'hostile',
  'sarcophate|undead': 'ally',
  // The Coilborn hold the wet margins, and the damp lands get a three-way:
  // the tide is KIN (the Deep's bodies walk the drowned ground unmolested),
  // the Sylvan call the mangroves a garden gone under (the coils answer
  // from the water), and the Bloom's rot fouls channels the serpents own.
  'coilborn|deep': 'ally',
  'coilborn|sylvan': 'hostile',
  'coilborn|fungal': 'hostile',
};

/** MECHANIC-BARRED KIN — authored in full, deliberately DOORLESS: families
 *  whose rosters are complete and validated but whose fielding mechanic does
 *  not exist yet. The bar is an enforced CONTRACT (validateContent): a
 *  reserved faction must be contexts-gated off 'baseline', and its roster ids
 *  must appear on NO spawn surface — WILDLIFE, tileset/zone pack tables, zone
 *  fauna, the wave table, other factions' tables, landmark spawns, droppable
 *  summon pools. Shipping a family's door is then a deliberate two-line diff:
 *  build the mechanic, strike the entry here. */
export const RESERVED_KIN: Record<string, string> = {
  smoulder: 'the burn-ledger mechanic (the Kindling) — un-barred early they would inundate every fire spec',
  magpie: 'the Magpie Court event/biome — loot-eaters loose in ordinary gen would tax every build',
  unrusted: 'the Verdigris Sprawl biome / custodian crusade — a corpse-starving legion loose in ordinary gen would quietly bankrupt every corpse spec',
  compact: 'the vendor-camp / caravan-escort economy — the friendly faction with teeth needs its trade doors (and its neutral-until-provoked wiring) before its war doors',
};

/** RUN-SCOPED DIPLOMACY LAYERS — stances that hold for ONE RUN, over the
 *  static RELATIONS table (which is boot-time and permanent). Namespaced per
 *  writer so systems never clobber each other: the War Below publishes its
 *  rolled lord truces here (and re-publishes when a pact shatters or a throne
 *  changes hands). Order-insensitive keys, same as RELATIONS. A layer is
 *  replaced wholesale by its owner each publish — no incremental drift. */
const RUN_STANCE_LAYERS = new Map<string, Record<string, FactionStance>>();

export function setRunStances(namespace: string, pairs: Record<string, FactionStance>): void {
  RUN_STANCE_LAYERS.set(namespace, pairs);
}

/** Diplomatic stance between two factions (order-insensitive): run layers
 *  first (this run's rolled pacts + wars), the static table beneath. */
export function factionStance(a: string, b: string): FactionStance {
  if (a === b) return 'ally';
  for (const layer of RUN_STANCE_LAYERS.values()) {
    const hit = layer[`${a}|${b}`] ?? layer[`${b}|${a}`];
    if (hit) return hit;
  }
  return RELATIONS[`${a}|${b}`] ?? RELATIONS[`${b}|${a}`] ?? 'neutral';
}

/** Every hostile pair — worldgen draws its war zones from this list. Mutable so
 *  a faction grafted at boot can append its hostile pairs (see addRelation). */
export const WAR_PAIRS: [string, string][] = Object.entries(RELATIONS)
  .filter(([, stance]) => stance === 'hostile')
  .map(([key]) => key.split('|') as [string, string]);

/** Register a faction stance at boot (used by the content-package faction
 *  generator to graft a new faction's diplomacy in). No-op if already set.
 *  Hostile stances also append to WAR_PAIRS so a boot-grafted faction can still
 *  seed procedural war zones (WAR_PAIRS is a load-time snapshot otherwise) —
 *  UNLESS `seedWar` is false, for a faction that exists only in a non-baseline
 *  context (the Crusade zealots): it brawls when fielded but never seeds an
 *  ordinary procedural war zone. */
export function addRelation(a: string, b: string, stance: FactionStance, seedWar = true): void {
  if (RELATIONS[`${a}|${b}`] === undefined && RELATIONS[`${b}|${a}`] === undefined) {
    RELATIONS[`${a}|${b}`] = stance;
    if (stance === 'hostile' && seedWar) WAR_PAIRS.push([a, b]);
  }
}

/** Faction rosters — what each side fields when a war zone spawns them (and
 *  what encounters, invasions, fractures, garrisons and contests draw from).
 *  Entries carry PRESENCE envelopes: the leveled-list lever that lets a
 *  roster EVOLVE — fodder that disperses past the teens, elites that only
 *  muster deep in the world — while the table stays one flat, open list. */
export const FACTIONS: Record<string, {
  name: string;
  table: PackTableEntry[];
  /** This faction's horned bodies wear demon-style NUB horns instead of the
   *  swept default (render adorn styling) — a faction-level look word, never
   *  a faction-id compare in draw code. */
  nubHorns?: boolean;
}> = {
  // Each roster now BREATHES with level (presence envelopes): fodder rows
  // fade as the world deepens, veterans arrive on ramps, and the champion
  // tier musters only where the ground is dangerous enough to deserve it.
  goblin: {
    name: 'the Goblin Warband',
    table: [
      // The warband's teaching tier: skirmishers throng the early roads,
      // then disperse — by the late teens the warband fields real muscle.
      { id: 'goblin_skirmisher', weight: 3, presence: { to: 14, fadeOut: 6 } },
      { id: 'goblin_brute', weight: 2 },
      { id: 'goblin_shaman', weight: 2, presence: { from: 4, fadeIn: 3 } },
      { id: 'orc_ravager', weight: 2, presence: { from: 6, fadeIn: 4 } },
      { id: 'troll_mauler', weight: 1, presence: { from: 9, fadeIn: 5 } },
      { id: 'goblin_chief', weight: 1, presence: { from: 8, fadeIn: 4 } },
    ],
  },
  undead: {
    name: 'the Risen Host',
    table: [
      // The shamble never quite leaves the Host — it just thins as the
      // graves send worthier dead (a long fadeOut, not a gate).
      { id: 'zombie', weight: 3, presence: { to: 22, fadeOut: 14 } },
      { id: 'skeleton_warrior', weight: 3 },
      { id: 'skeleton_archer', weight: 2 },
      { id: 'crypt_warden', weight: 1, presence: { from: 8, fadeIn: 4 } },
      { id: 'bone_serpent', weight: 1, presence: { from: 12, fadeIn: 5 } },
      { id: 'lich_marshal', weight: 1, presence: { from: 15, fadeIn: 6 } },
      { id: 'gloam', weight: 1, presence: { from: 10, fadeIn: 5 } },
      { id: 'oblivion_knight', weight: 1, presence: { from: 18, fadeIn: 7 } },
      // The apparition wing: gloomlings throng the young graves and thin
      // out; the wailers and barrow-lords wake with depth.
      { id: 'gloomling', weight: 2, presence: { to: 16, fadeOut: 8 } },
      { id: 'poltergeist', weight: 1, presence: { from: 8, fadeIn: 4 } },
      { id: 'barrow_wight', weight: 1, presence: { from: 10, fadeIn: 5 } },
      { id: 'banshee', weight: 1, presence: { from: 14, fadeIn: 6 } },
      // The cistern-tenders: the conduit pass's wing — the warden's wall
      // drinks its own poise; the acolyte's blood pays for its thread.
      { id: 'cistern_warden', weight: 1, presence: { from: 7, fadeIn: 4 } },
      { id: 'transfusion_acolyte', weight: 1, presence: { from: 9, fadeIn: 4 } },
      // The duel the grave never finished — the Blademaster's tempo, risen.
      { id: 'barrow_swordsaint', weight: 1, presence: { from: 9, fadeIn: 5 } },
    ],
  },
  // The armory that walks — every roster body CARRIES its drop (the
  // Hollowborn carry contract), so a pack of them is a shelf on legs.
  hollowborn: {
    name: 'the Hollowborn',
    table: [
      { id: 'hollow_vanguard', weight: 3 },
      { id: 'blade_swarm', weight: 3 },
      { id: 'shield_anima', weight: 2, presence: { from: 4, fadeIn: 3 } },
      { id: 'the_unworn', weight: 1, presence: { from: 9, fadeIn: 4 } },
    ],
  },
  // Livestock gone wrong — the field country's own trouble.
  chattel: {
    name: 'the Chattel',
    table: [
      { id: 'feral_hen', weight: 3, presence: { to: 16, fadeOut: 8 } },
      { id: 'feral_aurochs', weight: 3 },
      { id: 'shepherds_hound', weight: 2 },
      { id: 'the_bellwether', weight: 1, presence: { from: 8, fadeIn: 4 } },
    ],
  },
  // The settled belt's OWN side: the watch first, the folk behind them.
  // Fielded by the RELATIONS pairs (farm-raid war zones) and the farmland
  // fauna rows — never as an aggressor roster.
  freehold: {
    name: 'the Freeholds',
    table: [
      { id: 'village_warden', weight: 3 },
      { id: 'crofter', weight: 1.5 },
    ],
  },
  // Born from fire — RESERVED (see RESERVED_KIN): the roster is complete and
  // validated, and NOTHING fields it until the burn-ledger door ships.
  smoulder: {
    name: 'the Smoulderkin',
    table: [
      { id: 'smoulderling', weight: 4 },
      { id: 'ember_shrike', weight: 2 },
      { id: 'ash_wretch', weight: 2, presence: { from: 4, fadeIn: 3 } },
      { id: 'the_ashmother', weight: 1, presence: { from: 10, fadeIn: 5 } },
    ],
  },
  // Thieves of the floor — RESERVED (see RESERVED_KIN): complete, validated,
  // and doorless until the Magpie Court exists.
  magpie: {
    name: 'the Magpie Kin',
    table: [
      { id: 'magpie_snatch', weight: 4 },
      { id: 'magpie_shrikeblade', weight: 2, presence: { from: 5, fadeIn: 3 } },
      { id: 'the_magpie_king', weight: 1, presence: { from: 10, fadeIn: 5 } },
    ],
  },
  // The old empire's custodian machines — RESERVED (see RESERVED_KIN):
  // complete and validated, doorless until the Verdigris Sprawl mints.
  // Presence floors are HARD gates (from with no fadeIn): the legion
  // deploys by inventory, not by drift — a rank musters at strength or
  // not at all.
  unrusted: {
    name: 'the Unrusted',
    table: [
      { id: 'awakened_custodian', weight: 4 },
      { id: 'brass_sentinel', weight: 3 },
      { id: 'verdigris_wright', weight: 2, presence: { from: 6 } },
      { id: 'coil_warden', weight: 2, presence: { from: 8 } },
      { id: 'scaffold_colossus', weight: 1, presence: { from: 9 } },
      { id: 'the_custodian', weight: 1, presence: { from: 12 } },
    ],
  },
  // The merchant princes — RESERVED (see RESERVED_KIN): complete and
  // validated, doorless until the trade doors ship. HARD presence floors
  // again (from with no fadeIn): a charter company arrives staffed or not
  // at all — nobody sends the Factor to a hamlet.
  compact: {
    name: 'the Gilded Compact',
    table: [
      { id: 'hired_blade', weight: 4 },
      { id: 'compact_outrider', weight: 3 },
      { id: 'compact_tallykeeper', weight: 2, presence: { from: 4 } },
      { id: 'caravan_master', weight: 2, presence: { from: 6 } },
      { id: 'vault_golem', weight: 1, presence: { from: 8 } },
      { id: 'the_factor', weight: 1, presence: { from: 12 } },
    ],
  },
  // What rides the meteors — fielded ONLY under an active starfall front
  // (contexts-gated; the materializer is their whole door).
  starfall: {
    name: 'the Starfall Court',
    table: [
      { id: 'starfall_shardling', weight: 4 },
      { id: 'starfall_prism', weight: 2, presence: { from: 5, fadeIn: 3 } },
      { id: 'gravity_warden', weight: 1, presence: { from: 8, fadeIn: 4 } },
    ],
  },
  carven: {
    name: 'the Carven Court',
    // The harvest musters as a FIELD: gourdlings and lurkers throng the
    // young rows, the watchers and sowers walk the middle stubble, and the
    // wicker patron and the King stand only where the season has turned.
    table: [
      { id: 'gourdling', weight: 4, presence: { to: 14, fadeOut: 7 } },
      { id: 'patch_lurker', weight: 3 },
      { id: 'scarecrow_watcher', weight: 3 },
      { id: 'lantern_sower', weight: 2, presence: { from: 4, fadeIn: 2 } },
      { id: 'harvest_effigy', weight: 1, presence: { from: 7, fadeIn: 3 } },
      { id: 'carven_king', weight: 1, presence: { from: 13, fadeIn: 5 } },
    ],
  },
  nightkin: {
    name: 'the Night Court',
    // The Court musters as a HOUSEHOLD: the larder walks in front (thralls
    // throng young ground and thin out), the staff hold the middle rank
    // (hands, knives, bearers, the church), and the estate's heavy pieces —
    // the coach, the Countess — roll only where the world has grown teeth.
    // The coach's from:16 is HARD (no fadeIn — the war-muster seam), atop
    // its def-level from:12 floor.
    table: [
      { id: 'feeding_thrall', weight: 3, presence: { to: 16, fadeOut: 8 } },
      { id: 'vampire_thrall', weight: 3 },
      { id: 'crimson_bat', weight: 2 },
      { id: 'deadwake_ghoul', weight: 2, presence: { from: 5, fadeIn: 3 } },
      { id: 'night_hunter', weight: 2, presence: { from: 6, fadeIn: 3 } },
      { id: 'pallbearer', weight: 1, presence: { from: 7, fadeIn: 4 } },
      { id: 'blood_cardinal', weight: 1, presence: { from: 9, fadeIn: 4 } },
      { id: 'werewolf', weight: 2, presence: { from: 10, fadeIn: 5 } },
      { id: 'gloom_coach', weight: 1, presence: { from: 16 } },
      { id: 'vampire_countess', weight: 1, presence: { from: 14, fadeIn: 6 } },
    ],
  },
  gnoll: {
    name: 'the Gnoll Packs',
    table: [
      { id: 'gnoll_prowler', weight: 4 },
      { id: 'gnoll_butcher', weight: 2, presence: { from: 5, fadeIn: 3 } },
      { id: 'gnoll_longshot', weight: 2, presence: { from: 4, fadeIn: 3 } },
      { id: 'gnoll_howler', weight: 1, presence: { from: 8, fadeIn: 4 } },
      { id: 'gnoll_trapper', weight: 1, presence: { from: 6, fadeIn: 3 } },
      { id: 'gnoll_impaler', weight: 1, presence: { from: 7, fadeIn: 4 } },
    ],
  },
  elemental: {
    name: 'the Unbound Elements',
    table: [
      { id: 'ember_elemental', weight: 3 },
      { id: 'gale_elemental', weight: 3 },
      { id: 'frost_elemental', weight: 2, presence: { from: 5, fadeIn: 3 } },
      { id: 'stone_sentinel', weight: 1, presence: { from: 10, fadeIn: 5 } },
      { id: 'shard_spire', weight: 1, presence: { from: 8, fadeIn: 4 } },
      // The Karst stonekin muster with their crowned family (HARD floors —
      // old stone does not arrive gradually).
      { id: 'basilisk', weight: 2, presence: { from: 6 } },
      { id: 'karst_slinger', weight: 2, presence: { from: 5 } },
      { id: 'petrified_warden', weight: 1, presence: { from: 8 } },
      { id: 'scree_shambler', weight: 1, presence: { from: 9 } },
      // The WEIGHT LESSON pair (the mass fabric): the avalanche and the
      // anchor muster with their kin — same hard floors as the old stone.
      { id: 'sarsen_ram', weight: 1, presence: { from: 7 } },
      { id: 'lode_thrall', weight: 1, presence: { from: 6 } },
      // THE CRYSTALKIN (the attunement pass): the glass court finally
      // musters with its faction — the shard fields were never leaderless,
      // only unlisted. Chaff early, the court proper with level.
      { id: 'lumen_wisp', weight: 2, presence: { to: 12, fadeOut: 5 } },
      { id: 'prism_creeper', weight: 2, presence: { to: 22, fadeOut: 10 } },
      { id: 'resonant_shardling', weight: 2, presence: { to: 16, fadeOut: 8 } },
      { id: 'facet_stalker', weight: 2, presence: { from: 5, fadeIn: 3 } },
      { id: 'chime_haunt', weight: 1, presence: { from: 7, fadeIn: 4 } },
      { id: 'geode_shellback', weight: 1, presence: { from: 9, fadeIn: 4 } },
      { id: 'glassguard_sentinel', weight: 1, presence: { from: 8, fadeIn: 4 } },
      { id: 'discord_siren', weight: 1, presence: { from: 11, fadeIn: 5 } },
    ],
  },
  sylvan: {
    name: 'the Sylvan Court',
    // The Court now fields its TREANT LINE: saplings throng the young woods,
    // snarls and wardens hold the middle age, and the elders only walk where
    // the forest is old enough to remember (wood burns — bring fire).
    table: [
      { id: 'thorn_sprite', weight: 4, presence: { to: 20, fadeOut: 12 } },
      { id: 'sylvan_sapling', weight: 3, presence: { to: 12, fadeOut: 5 } },
      { id: 'sylvan_warden', weight: 2 },
      { id: 'twig_snarl', weight: 2, presence: { from: 5, fadeIn: 3, to: 24, fadeOut: 10 } },
      { id: 'grove_singer', weight: 1, presence: { from: 6, fadeIn: 3 } },
      { id: 'briar_beast', weight: 1, presence: { from: 9, fadeIn: 4 } },
      { id: 'treant_warden', weight: 2, presence: { from: 12, fadeIn: 5 } },
      { id: 'root_snarl', weight: 1, presence: { from: 10, fadeIn: 4 } },
      { id: 'elder_treant', weight: 1, presence: { from: 22, fadeIn: 8, mul: 1.5 } },
      { id: 'root_wraith', weight: 1, presence: { from: 10, fadeIn: 4 } },
    ],
  },
  wild: {
    name: 'the Wilds',
    table: [
      { id: 'fen_hound', weight: 4, presence: { to: 18, fadeOut: 10 } },
      { id: 'blood_mite', weight: 3, presence: { to: 16, fadeOut: 8 } },
      { id: 'dune_stalker', weight: 2, presence: { from: 5, fadeIn: 3 } },
      { id: 'spitting_horror', weight: 2, presence: { from: 7, fadeIn: 4 } },
      { id: 'alpha_stalker', weight: 1, presence: { from: 11, fadeIn: 5 } },
    ],
  },
  emberkin: {
    name: 'the Emberkin',
    table: [
      { id: 'ashling', weight: 4 },
      { id: 'cinderling', weight: 3, presence: { to: 16, fadeOut: 6 } },
      { id: 'emberwisp', weight: 2, presence: { from: 3, fadeIn: 3 } },
      { id: 'cinder_hound', weight: 3 },
      { id: 'slag_brute', weight: 2, presence: { from: 6, fadeIn: 3 } },
      { id: 'vent_priest', weight: 2, presence: { from: 8, fadeIn: 4 } },
      { id: 'emberkin_matriarch', weight: 1, presence: { from: 13, fadeIn: 5 } },
    ],
  },
  junglekin: {
    name: 'the Junglekin',
    table: [
      { id: 'fern_stalker', weight: 4, presence: { to: 18, fadeOut: 8 } },
      { id: 'blowgun_wretch', weight: 3 },
      { id: 'spore_caller', weight: 2, presence: { from: 6, fadeIn: 3 } },
      { id: 'emerald_prowler', weight: 2, presence: { from: 9, fadeIn: 4 } },
      { id: 'saurian_bulwark', weight: 2, presence: { from: 11, fadeIn: 5 } },
      { id: 'ruin_sentinel', weight: 1, presence: { from: 10, fadeIn: 4 } },
      { id: 'verdant_tyrant', weight: 1, presence: { from: 14, fadeIn: 6 } },
    ],
  },
  demon: {
    name: 'the Infernal Legion',
    nubHorns: true,
    // The Legion's muster GROWS with the world (the user-facing showcase of
    // presence): shallow rifts leak whelps, imps and hounds; by the 20s the
    // pit sends its army — gorgers, tormentors, heralds, callers — and past
    // 30 the elite tier walks. The imp swarm itself is a GRADIENT (stops):
    // it never leaves, it just thins as worthier things crowd the gate.
    table: [
      { id: 'ash_whelp', weight: 3, presence: 'early_only' },
      { id: 'imp', weight: 3, presence: { stops: [[1, 1.4], [12, 1], [24, 0.6], [40, 0.35]] } },
      { id: 'hellhound', weight: 3 },
      { id: 'cinder_fiend', weight: 2, presence: { from: 6, fadeIn: 3 } },
      { id: 'searing_spawn', weight: 2, presence: { from: 8, fadeIn: 4 } },
      { id: 'dread_fiend', weight: 1, presence: { from: 12, fadeIn: 5, mul: 2 } },
      { id: 'balor_warlord', weight: 1 }, // def presence gates him below 15
      // The siege line: fragile darters that blink, then take cover on a
      // hulk's back or in a tower crown — a garrison worth breaking up.
      { id: 'finger_mage', weight: 2, presence: { from: 10, fadeIn: 4 } },
      { id: 'demonkin_darter', weight: 2, presence: { from: 12, fadeIn: 4 } },
      { id: 'siege_hulk', weight: 1, presence: { from: 16, fadeIn: 6 } },
      // The deep-war muster: the horde variety that ARRIVES above ~20.
      { id: 'bloodgorger', weight: 2, presence: { from: 18, fadeIn: 5 } },
      { id: 'brimstone_cantor', weight: 2, presence: { from: 20, fadeIn: 5 } },
      { id: 'chained_tormentor', weight: 2, presence: { from: 20, fadeIn: 6 } },
      { id: 'abyssal_flayer', weight: 2, presence: { from: 22, fadeIn: 6 } },
      { id: 'doomherald', weight: 1, presence: { from: 24, fadeIn: 6, mul: 2 } },
      { id: 'hellgate_caller', weight: 1, presence: { from: 26, fadeIn: 6, mul: 2 } },
      // The elite tier rides the shared legion_muster band (def presence
      // floors them too — they never leak into a shallow list anywhere).
      { id: 'pyre_titan', weight: 1, presence: { mul: 1.5 } },
      { id: 'archfiend_legate', weight: 1, presence: { mul: 1.5 } },
    ],
  },
  deep: {
    name: 'the Deep',
    table: [
      { id: 'deep_thresher', weight: 4 },
      { id: 'deep_angler', weight: 3, presence: { from: 6, fadeIn: 3 } },
      { id: 'deep_tidecaller', weight: 2, presence: { from: 10, fadeIn: 4 } },
      { id: 'deep_leviathan', weight: 1, presence: { from: 16, fadeIn: 8 } },
      // THE DROWNED COURT attends only the deepest fathoms — HARD floors, no
      // fadeIn (nobility does not ramp; it arrives, or the water is beneath
      // it). The Wraithsail's decks field the same bodies by name — one
      // roster, two doors. The Regent is deliberately absent: flagship only.
      { id: 'drowned_oarsman', weight: 2, presence: { from: 8 } },
      { id: 'barnacle_knight', weight: 2, presence: { from: 12 } },
      { id: 'tide_vicar', weight: 1, presence: { from: 14 } },
      { id: 'sunken_courtier', weight: 1, presence: { from: 14 } },
      { id: 'anchor_wight', weight: 1, presence: { from: 16 } },
    ],
  },
  beastkin: {
    name: 'the Horned Tribes',
    table: [
      { id: 'beastkin_gorer', weight: 3 },
      { id: 'beastkin_impaler', weight: 2, presence: { from: 4, fadeIn: 3 } },
      { id: 'beastkin_flayer', weight: 2, presence: { from: 8, fadeIn: 4 } },
      { id: 'beastkin_ritualist', weight: 1, presence: { from: 10, fadeIn: 5 } },
      { id: 'beastlord_khan', weight: 1, presence: { from: 16, fadeIn: 6 } },
    ],
  },
  flesh: {
    name: 'the Glut',
    table: [
      // Oozes carry the early biome; the stitched things arrive with depth.
      { id: 'lesser_ooze', weight: 3, presence: { to: 12, fadeOut: 6 } },
      { id: 'viscous_ooze', weight: 3 },
      { id: 'gutspray_hurler', weight: 2, presence: { from: 6, fadeIn: 3 } },
      { id: 'membrane', weight: 1, presence: { from: 8, fadeIn: 4 } },
      { id: 'flesh_amalgam', weight: 1, presence: { from: 14, fadeIn: 6, mul: 2 } },
      { id: 'corpse_bloom', weight: 1 },
      { id: 'spire_of_eyes', weight: 1, presence: { from: 12, fadeIn: 5 } },
      // The country's face kin (Sanguine / Gutworks / Ocular) ride the same
      // hunger — the faces' own packs weight them harder on home ground.
      { id: 'hemophage', weight: 2, presence: { from: 5, fadeIn: 3 } },
      { id: 'clot_shambler', weight: 1, presence: { from: 8, fadeIn: 4 } },
      { id: 'tract_worm', weight: 1, presence: { from: 9, fadeIn: 4 } },
      { id: 'bile_retcher', weight: 1, presence: { from: 7, fadeIn: 3 } },
      { id: 'pyloric_warden', weight: 1, presence: { from: 13, fadeIn: 5, mul: 2 } },
      { id: 'lidless_watcher', weight: 1, presence: { from: 10, fadeIn: 4 } },
      { id: 'weeping_orb', weight: 1, presence: { from: 8, fadeIn: 4 } },
      { id: 'stalk_shepherd', weight: 1, presence: { from: 11, fadeIn: 5 } },
    ],
  },
  caulborn: {
    name: 'the Caulborn',
    table: [
      // Mites carpet the young membrane and thin with depth; the rooted
      // tiers (lasher → maw) and the heart's court arrive as the organism
      // digs in. Rooted bodies still muster in war zones — the Caul sends
      // ground it intends to KEEP.
      { id: 'caul_tick', weight: 3, presence: { to: 20, fadeOut: 9 } },
      { id: 'amnion_creeper', weight: 2 },
      { id: 'caul_lasher', weight: 2 },
      { id: 'nerve_weaver', weight: 2, presence: { from: 8, fadeIn: 4 } },
      { id: 'vor_maw', weight: 1, presence: { from: 10, fadeIn: 4 } },
      { id: 'chrysalid_broodmother', weight: 1, presence: { from: 12, fadeIn: 5 } },
    ],
  },
  // The deep desert's own: dancers and husks carry the early court, the
  // glass and the wind arrive where the country runs hot enough to deserve
  // them, the priest and the worm keep the heart.
  sirocco: {
    name: 'the Sirocco Court',
    table: [
      { id: 'mirage_dancer', weight: 3 },
      { id: 'salt_husk', weight: 3 },
      { id: 'glass_stalker', weight: 2, presence: { from: 8, fadeIn: 4 } },
      { id: 'dust_djinn', weight: 2, presence: { from: 9, fadeIn: 4 } },
      { id: 'sun_priest', weight: 1, presence: { from: 10, fadeIn: 4 } },
      { id: 'sandmaw_burrower', weight: 1, presence: { from: 8, fadeIn: 4 } },
    ],
  },
  // The Seethe: drones are the coin, sources are the fight — the roster
  // leans tender/burrower with depth while the chaff thins (never gone;
  // a hive spends bodies the way weather spends rain).
  chitin: {
    name: 'the Chitin',
    table: [
      { id: 'chitin_drone', weight: 4, presence: { to: 20, fadeOut: 10 } },
      { id: 'chitin_lancer', weight: 2, presence: { from: 3, fadeIn: 2 } },
      { id: 'chitin_spitter', weight: 2, presence: { from: 5, fadeIn: 3 } },
      { id: 'chitin_burrower', weight: 1, presence: { from: 7, fadeIn: 4 } },
      { id: 'chitin_broodtender', weight: 1, presence: { from: 9, fadeIn: 4 } },
      { id: 'brood_sovereign', weight: 1, presence: { from: 16, fadeIn: 6 } },
    ],
  },
  // The Winter Court: hounds carry the early roads and thin as the true
  // court arrives; the wight/shaman/herald tiers ramp in; the giant is a
  // HARD gate (from 12, NO fadeIn — a wall never met early, ever). The
  // King is deliberately ABSENT: the crown is fielded only by the warlord
  // machinery and Deepwinter's glacial heart, never faction scatter.
  // Auxiliaries are REUSED bodies sworn to the banner — the drift-swimmer
  // and the hedge-witch already native to the cold belt.
  rimebound: {
    name: 'the Rimebound',
    table: [
      { id: 'rime_hound', weight: 4, presence: { to: 20, fadeOut: 9 } },
      { id: 'hoarfrost_wight', weight: 3, presence: { from: 4, fadeIn: 2 } },
      { id: 'glacier_shaman', weight: 2, presence: { from: 7, fadeIn: 3 } },
      { id: 'snow_swimmer', weight: 1, presence: { from: 5, fadeIn: 3 } },
      { id: 'frost_witch', weight: 1, presence: { from: 6, fadeIn: 3 } },
      { id: 'winter_herald', weight: 2, presence: { from: 9, fadeIn: 4 } },
      { id: 'frost_giant', weight: 1, presence: { from: 12 } },
      // The heart's arena bodies, sworn to the wider banner too: the
      // lake-dancer arrives with the true court, the walking door late.
      { id: 'rime_skater', weight: 2, presence: { from: 6, fadeIn: 3 } },
      { id: 'rime_wrecker', weight: 1, presence: { from: 9, fadeIn: 4 } },
    ],
  },
  // The tomb-dynasty musters in burial order: scarabs boil out first and
  // never stop coming, the legion line holds the middle levels, and the
  // deep court — embalmers, wardens — wakes on HARD floors only (the
  // family discipline: every gate a threshold, never a ramp; nothing this
  // old arrives gradually). The Regent is deliberately ABSENT: the throne
  // wakes only behind the Unsealing's four-talisman door, never scatter.
  sarcophate: {
    name: 'the Sand Sarcophate',
    table: [
      { id: 'tomb_scarab', weight: 4, presence: { to: 18, fadeOut: 8 } },
      { id: 'sarcophate_legionary', weight: 3 },
      { id: 'canopic_bearer', weight: 2, presence: { from: 6 } },
      { id: 'sarcophagus_warden', weight: 1, presence: { from: 9 } },
    ],
  },
  // The Coilborn muster from the water out: adders boil the early shallows
  // and thin as the court wakes, striders hold the middle water, and every
  // court tier — spitter, priest, siren, knight — arrives on a HARD floor
  // (the sarcophate discipline: thresholds, never ramps). The Matriarch is
  // deliberately ABSENT: the crown is the warlord machinery's to field.
  coilborn: {
    name: 'the Coilborn',
    table: [
      { id: 'marsh_adder', weight: 4, presence: { to: 18, fadeOut: 8 } },
      { id: 'bog_strider', weight: 3 },
      { id: 'hooded_spitter', weight: 2, presence: { from: 4 } },
      { id: 'fang_priest', weight: 2, presence: { from: 6 } },
      { id: 'siren_adder', weight: 1, presence: { from: 8 } },
      { id: 'constrictor_knight', weight: 1, presence: { from: 9 } },
    ],
  },
};

// --- FLUX-RIDING CHOREOGRAPHY -------------------------------------------------
// x_ride_flux: the drift-local's footing sense — a WALKER whose stepping
// stone is deep into its fray (or already gone under them, mid-teeter) HOPS
// to the nearest STANDING pad: a quick skip, not a march (the x_seek_fog
// blink idiom). No flux field, solid footing, or no refuge in reach — the
// rule no-ops and tries again next window (no refuge = it rides the fray
// down, and the sky keeps it: drama the fabric already routes).
registerAIAction('x_ride_flux', (world, actor) => {
  const f = world.flux;
  if (!f || actor.flying || actor.levitates) return;
  const pad = f.padAt(actor.pos.x, actor.pos.y);
  if (!pad) return;
  const { s } = f.padPhase(pad);
  // Bail at the FIRST sign of fray (a local knows the rhythm — waiting out
  // half the warning is how tourists die) and mid-teeter if the beat only
  // lands after the floor already left.
  if (s !== FluxPhase.Fraying && s !== FluxPhase.Gone) return;
  let best: { cx: number; cy: number } | null = null, bd = 380 * 380;
  for (const p of f.pads) {
    if (p === pad || !p.walkNow) continue;
    if (f.padPhase(p).s !== FluxPhase.Solid) continue;
    const dd = (p.cx - actor.pos.x) ** 2 + (p.cy - actor.pos.y) ** 2;
    if (dd < bd) { bd = dd; best = p; }
  }
  if (!best) return;
  // The skip: an origin-less clamp (a nimble hop reads as a short blink —
  // walking would argue with the very void it flees).
  actor.pos = world.clampPos({ x: best.cx, y: best.cy }, actor.radius);
  world.flashes.push({
    pos: { x: actor.pos.x, y: actor.pos.y }, radius: actor.radius + 12,
    color: '#dcecf8', life: 0.35, maxLife: 0.35,
  });
});

// x_rally_to_target — the commander's finger: kin within 420u ADOPT my current
// target outright (lock + a seeded grudge on the chart), where {do:'shout'}
// merely widens their eyes. Composable on any brain via rules/phases/cadences;
// pairs with aggro.fury bodies for packs that answer insult as one. The threat
// seed rides the chart's ordinary decay, so a rally fades unless it's fed.
registerAIAction('x_rally_to_target', (world, actor, _act, target) => {
  if (!target || target.dead) return;
  for (const kin of world.actors) {
    if (kin.dead || kin === actor || kin.team !== actor.team || kin.passive || kin.construct) continue;
    if (kin.faction !== actor.faction) continue;
    const dx = kin.pos.x - actor.pos.x, dy = kin.pos.y - actor.pos.y;
    if (dx * dx + dy * dy > 420 * 420) continue;
    kin.aiTargetId = target.id;
    kin.aggroed = true;
    kin.addThreat(target.id, 40);
  }
});

/** Spawn weights per wave tier — which monsters appear as waves escalate. */
export const WAVE_TABLE: { minWave: number; ids: string[] }[] = [
  { minWave: 1, ids: ['zombie', 'skeleton_warrior'] },
  { minWave: 2, ids: ['skeleton_archer', 'blood_mite'] },
  { minWave: 3, ids: ['fire_cultist', 'storm_acolyte', 'mushroomling', 'gloomling', 'fulgur_imp'] },
  { minWave: 4, ids: ['frost_witch', 'spitting_horror', 'dune_stalker', 'pyre_acolyte', 'rockgrub', 'giant_maggot'] },
  { minWave: 5, ids: ['brute', 'hex_weaver', 'voltaic_shade', 'quiet_sibyl', 'myconid_warrior', 'viscous_ooze', 'galvanic_ooze', 'orb_weaver'] },
  { minWave: 6, ids: ['volatile_zealot', 'gloom_stalker', 'crypt_warden', 'wraith_piper', 'grave_shaman', 'gutspray_hurler', 'vampire_thrall'] },
  { minWave: 7, ids: ['warband_chieftain', 'bone_serpent', 'treant_warden', 'werewolf', 'banshee'] },
  { minWave: 8, ids: ['bone_colossus', 'javelin_skirmisher', 'flesh_amalgam', 'beastkin_gorer', 'emerald_mantis'] },
];

/** Every 5th wave spawns this boss alongside the pack. */
export const BOSS_ID = 'pit_lord';
