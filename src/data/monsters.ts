// ---------------------------------------------------------------------------
// THE BESTIARY.
//
// Monsters are data: base stats + innate modifiers + a list of skill ids
// from the SAME skill catalog the player uses. Their AI reads each skill's
// `ai` hint to decide when to use it. Any monster can also be summoned as a
// player minion (see Summon Skeleton / Flame Sprite) — same definition.
// ---------------------------------------------------------------------------

import { mod, type Modifier, type DamageType, type SkillTag } from '../engine/stats';
import type { ActorAdorn, ActorShape, BrainDef, MonsterPartDef } from '../engine/actor';
import type { CurveKind } from '../engine/curves';
import { registerPresenceBand, type PresenceSpec } from '../engine/presence';
import { registerAIAction } from '../engine/aiActions';
import { FluxPhase } from '../engine/flux';
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
  /** Cannot take damage (hits report immune). */
  invulnerable?: boolean;
  /** Cannot be hit or targeted — enemies ignore it entirely. */
  untargetable?: boolean;
  /** Floats over fall hazards (void/chasm): no fall damage, can't be knocked to death
   *  off a ledge. Pathing still avoids void. For bosses on a void-margin arena. */
  levitates?: boolean;
  /** AI archetype (omit for the basic approach-and-attack brain). */
  brain?: BrainDef;
  /** Worm/snake body: trailing segments that follow the head. */
  worm?: { length: number; spacing?: number; taper?: number };
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
   *  ethereal… Shapes the baked shading/texture; omitted = flesh. */
  material?: string;
  /** Part-grammar portrait (data/looks.ts) — skeletons read as skeletons
   *  from overhead. Omitted = the legacy shape+adorn body. */
  look?: string;
  /** COMPOSITE MONSTER: plural hitboxes anchored to this root's facing frame
   *  (world bosses, dragons, leviathans). Each part is a full monster def —
   *  it fights with its own skills and its death fires break effects on the
   *  root. Parts lazy-attach on the root's first update tick, so every spawn
   *  path (packs, events, zone-memory restores) grows them. */
  parts?: MonsterPartDef[];
  /** Multiplier on detection range (1 = baseline). Low shambles past you
   *  (zombie 0.55); high senses you from afar (blood mite 1.6). */
  detection?: number;
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
   *  the magma swimmer crossing a pool it isn't burrowed in. */
  immuneGround?: string[];
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
   *  with `levitates` so a flier never falls to the void it crosses. */
  flier?: boolean;
  /** PACK BOND — the synchronic seam: these mods are worn ONLY while a
   *  living bond-holder stands within `radius` (default 520). `kin` names
   *  who holds the bond (a defId, tag or faction); omitted = any living
   *  SQUADMATE. The counterplay is priority: burst the bond-holder first
   *  and the pack softens. */
  bond?: { mods: Modifier[]; kin?: string; radius?: number };
  /** CARRION FEEDER: hurt and out of combat, it noses to the nearest
   *  necromancy corpse within `radius` (default CARRION_CFG.radius) and
   *  EATS — `rate` × max life healed per second; after `time` seconds the
   *  corpse is GONE, denied to every spectre corpse-read and raise skill
   *  sharing the larder. The scavenger and the necromancer fight over the
   *  same bodies — kill the eaters first or lose your material. */
  carrion?: { radius?: number; rate?: number; time?: number };
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
  field: [
    { id: 'meadow_hare', chance: 0.7, count: [3, 5] },
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
    { id: 'bat_roost', chance: 0.45, count: [1, 2] },
  ],
  mycelia: [
    { id: 'glow_moth', chance: 0.5, count: [2, 5] },
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
  ],
};

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
      move: { pathing: 'none' },
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
      // Mindless feet: it drags itself straight at you (pathing 'none').
      move: { pathing: 'none' },
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
    base: { life: 40, moveSpeed: 175, accuracy: 90, evasion: 60, mana: 40, manaRegen: 5 },
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
    base: { life: 150, moveSpeed: 165, accuracy: 100, evasion: 45, mana: 40, manaRegen: 5 },
    mods: [mod('chaosRes', 'flat', 0.5)],
    skills: ['harvester_scythe'],
    xp: 0,
    brain: { type: 'flanker' },
  },

  // The swarm-variant body: a lesser reaper — many where the apex is one.
  lesser_reaper: {
    id: 'lesser_reaper', name: 'Lesser Reaper',
    color: '#a06080', shape: 'diamond', radius: 12, look: 'reaper',
    base: { life: 38, moveSpeed: 180, accuracy: 90, evasion: 55, mana: 30, manaRegen: 4 },
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
    base: { life: 40, moveSpeed: 156, accuracy: 110, mana: 30, manaRegen: 4 },
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
    base: { life: 120, moveSpeed: 116, accuracy: 105, armor: 24, mana: 30, manaRegen: 4 },
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
    base: { life: 28, moveSpeed: 155, accuracy: 105, evasion: 60, mana: 0 },
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
    base: { life: 320, moveSpeed: 70, accuracy: 95, armor: 60, mana: 40, manaRegen: 4 },
    mods: [mod('chaosRes', 'flat', 0.4)],
    skills: ['crushing_leap', 'heavy_strike'],
    xp: 55,
    brain: { type: 'juggernaut', enrage: 0.35 },
  },

  tundra_behemoth: {
    id: 'tundra_behemoth', name: 'Tundra Behemoth',
    color: '#a8c8d8', shape: 'hexagon', radius: 28, material: 'fur', look: 'behemoth_tundra',
    base: { life: 380, moveSpeed: 75, accuracy: 90, armor: 45, mana: 30, manaRegen: 3 },
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
    base: { life: 130, moveSpeed: 115, accuracy: 100, armor: 30, mana: 80, manaRegen: 6 },
    skills: ['rallying_howl', 'war_cry', 'heavy_strike'],
    xp: 40,
    brain: { type: 'commander' },
  },

  lich_marshal: {
    id: 'lich_marshal', name: 'Lich Marshal',
    color: '#b89ae8', shape: 'cross', radius: 15, material: 'bone', look: 'lich',
    base: { life: 110, moveSpeed: 105, mana: 220, manaRegen: 14 },
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
    // The tide doesn't THINK — it pours straight and piles at the stone.
    brain: { type: 'swarm', move: { pathing: 'none' } },
    faction: 'undead',
    detection: 0.75,
  },

  // A fast, lunging cannibal — orbits then bites, whipping itself into a frenzy.
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
    base: { life: 130, moveSpeed: 100, accuracy: 105, armor: 55, mana: 60, manaRegen: 6 },
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
    base: { life: 200, moveSpeed: 105, mana: 280, manaRegen: 18 },
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
    base: { life: 520, moveSpeed: 95, accuracy: 120, armor: 60, mana: 320, manaRegen: 20 },
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
    base: { life: 78, moveSpeed: 104, accuracy: 96, armor: 24, mana: 30, manaRegen: 4 },
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
    base: { life: 142, moveSpeed: 96, accuracy: 104, armor: 40, mana: 50, manaRegen: 6 },
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
    base: { life: 46, moveSpeed: 168, accuracy: 104, mana: 0 },
    mods: [mod('life', 'more', 0.5)],
    skills: ['claw'],
    xp: 15, faction: 'bandit',
    brain: { type: 'skirmish', withdraw: 1.3 }, // darts in and out, a knife-fighter
    detection: 1.0,
  },
  bandit_bruiser: {
    id: 'bandit_bruiser', name: 'Bandit Bruiser',
    color: '#7e6038', shape: 'octagon', radius: 17, look: 'bandit_bruiser',
    base: { life: 96, moveSpeed: 112, accuracy: 100, armor: 32, mana: 40, manaRegen: 4 },
    mods: [mod('life', 'more', 0.5)],
    skills: ['heavy_strike', 'ground_slam'],
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
    base: { life: 150, moveSpeed: 86, accuracy: 100, armor: 36, mana: 50, manaRegen: 5 },
    mods: [mod('chaosRes', 'flat', 0.8)],
    skills: ['heavy_strike', 'ground_slam'],
    xp: 32, faction: 'fungal', adorn: 'horns',
    brain: { type: 'juggernaut', enrage: 0.4 }, // the wall you grind through to reach the core
    detection: 0.85,
  },
  fungal_tender: {
    id: 'fungal_tender', name: 'Bloom-Tender',
    color: '#c08ae0', shape: 'cross', radius: 17, material: 'verdant', look: 'fungal_tender',
    base: { life: 120, moveSpeed: 98, mana: 220, manaRegen: 16 },
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
    base: { life: 600, moveSpeed: 72, accuracy: 118, armor: 44, mana: 340, manaRegen: 22 },
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

  rime_stone: {
    id: 'rime_stone', name: 'Rime Stone',
    color: '#9accdf', shape: 'square', radius: 20, material: 'ice', look: 'elemental_rift',
    base: { life: 170, moveSpeed: 0, armor: 35, evasion: 0, mana: 999, manaRegen: 50 },
    mods: [mod('coldRes', 'flat', 0.75)],
    skills: ['spew_rime'],
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
    base: { life: 140, moveSpeed: 115, accuracy: 100, armor: 25, mana: 90, manaRegen: 7 },
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
    base: { life: 95, moveSpeed: 145, accuracy: 100, armor: 25, mana: 40, manaRegen: 5 },
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
    base: { life: 260, moveSpeed: 85, accuracy: 90, armor: 40, mana: 40, manaRegen: 4 },
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
    base: { life: 75, moveSpeed: 150, accuracy: 100, armor: 15, mana: 40, manaRegen: 5 },
    skills: ['cleave', 'claw'],
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
    base: { life: 120, moveSpeed: 140, accuracy: 115, armor: 45, mana: 120, manaRegen: 9 },
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
    base: { life: 260, moveSpeed: 95, accuracy: 110, armor: 55, mana: 60, manaRegen: 6 },
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
    base: { life: 48, moveSpeed: 180, accuracy: 105, evasion: 65, mana: 60, manaRegen: 6 },
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
    base: { life: 180, moveSpeed: 90, accuracy: 95, armor: 70, mana: 60, manaRegen: 6 },
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
    base: { life: 140, moveSpeed: 105, accuracy: 100, armor: 45, mana: 80, manaRegen: 7 },
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

  // A trader's cart: mortal and MOBILE (the heart of a caravan event). It never
  // fights — the engine's event tick wheels it toward safety; its guards are
  // faction troops fielded on your side, and a hostile pack may ambush it.
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
    base: { life: 44, moveSpeed: 110, accuracy: 80, armor: 14, mana: 40, manaRegen: 4 },
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
    base: { life: 130, moveSpeed: 70, accuracy: 70, armor: 22, mana: 0 },
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
    base: { life: 150, moveSpeed: 105, accuracy: 95, armor: 18, mana: 60, manaRegen: 5 },
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
    deathBurst: { mode: 'implode', damageFrac: 0.5, damageType: 'fire', radius: 42, coalesce: 0.4 },
    brain: { type: 'swarm' },
  },
  cinder_hound: {
    id: 'cinder_hound', name: 'Cinder Hound',
    color: '#d87a4a', shape: 'triangle', radius: 12, material: 'ember', look: 'cinder_hound',
    base: { life: 42, moveSpeed: 190, accuracy: 90, evasion: 30, mana: 0 },
    mods: [mod('fireRes', 'flat', 0.5)],
    skills: ['claw'], xp: 12,
    faction: 'emberkin',
    // A hound turns on whatever bites it — and forgets just as fast.
    aggro: { fury: 1.4, waver: 1.4 },
    brain: { type: 'flanker' },
  },
  slag_brute: {
    id: 'slag_brute', name: 'Slag Brute',
    color: '#a85a32', shape: 'hexagon', radius: 18, material: 'stone', look: 'slag_brute',
    base: { life: 140, moveSpeed: 80, accuracy: 85, armor: 30, mana: 0 },
    mods: [mod('fireRes', 'flat', 0.75)],
    skills: ['claw'], xp: 26,
    faction: 'emberkin',
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
    base: { life: 200, moveSpeed: 90, accuracy: 100, armor: 16, mana: 150, manaRegen: 9 },
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
    base: { life: 150, moveSpeed: 70, accuracy: 75, armor: 26, mana: 0 },
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
    base: { life: 26, moveSpeed: 170, accuracy: 85, mana: 60, manaRegen: 7 },
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
    base: { life: 92, moveSpeed: 160, accuracy: 110, mana: 40, manaRegen: 5 },
    mods: [mod('fireRes', 'flat', 0.5), mod('chaosRes', 'flat', 0.3)],
    skills: ['heavy_strike', 'infernal_rift'], xp: 28, faction: 'demon', adorn: 'wings',
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
    scaleVariance: [0.85, 1.1],
    deathBurst: { mode: 'implode', damageFrac: 1.0, coalesce: 0.6 },
    detection: 1.2, brain: { type: 'swarm' },
  },
  // The meat of the mid-game host: one deep wound at a time, and a body
  // that SCALES — regen and armor climb with level so it stays a wall.
  bloodgorger: {
    id: 'bloodgorger', name: 'Bloodgorger',
    color: '#c03a4a', shape: 'octagon', radius: 19, look: 'bloodgorger',
    base: { life: 150, moveSpeed: 105, accuracy: 105, armor: 20, mana: 30, manaRegen: 4 },
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
    base: { life: 85, moveSpeed: 150, accuracy: 110, evasion: 40, mana: 30, manaRegen: 4 },
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
    base: { life: 320, moveSpeed: 95, accuracy: 115, armor: 60, mana: 40, manaRegen: 4 },
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
    base: { life: 210, moveSpeed: 130, accuracy: 125, armor: 45, mana: 120, manaRegen: 8 },
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
  //     lists these ids; registerFactions wires the roster/traits/warlord). ---
  breach_spawn: {
    id: 'breach_spawn', name: 'Breach Spawn',
    color: '#9a3ad8', shape: 'pentagon', radius: 11, look: 'imp',
    base: { life: 30, moveSpeed: 195, accuracy: 85, mana: 0 },
    mods: [mod('chaosRes', 'flat', 0.5)],
    skills: ['claw'], xp: 11, faction: 'breach', adorn: 'spikes',
    detection: 1.2, brain: { type: 'swarm' },
  },
  breach_horror: {
    id: 'breach_horror', name: 'Breach Horror',
    color: '#7a2ad0', shape: 'octagon', radius: 15, material: 'void', look: 'deep_horror',
    base: { life: 70, moveSpeed: 140, mana: 120, manaRegen: 8 },
    mods: [mod('chaosRes', 'flat', 0.6), mod('coldRes', 'flat', 0.3)],
    skills: ['firebolt', 'infernal_rift'], xp: 24, faction: 'breach', adorn: 'wings',
    detection: 1.3, brain: { type: 'strafer' },
  },
  breach_lord: {
    id: 'breach_lord', name: 'Xal, the Riftmaw',
    color: '#b04ae8', shape: 'star', radius: 27, material: 'void', look: 'demon_lord',
    base: { life: 520, moveSpeed: 130, accuracy: 130, mana: 240, manaRegen: 12 },
    mods: [mod('chaosRes', 'flat', 0.6), mod('coldRes', 'flat', 0.4), mod('damage', 'increased', 0.35)],
    skills: ['infernal_rift', 'meteor_storm', 'ground_slam', 'war_cry'],
    xp: 175, boss: true, faction: 'breach', adorn: 'wings',
    detection: 1.4, brain: { type: 'juggernaut', enrage: 0.4 },
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
    base: { life: 120, moveSpeed: 115, accuracy: 105, armor: 30, mana: 110, manaRegen: 8 },
    mods: [mod('fireRes', 'flat', 0.3)],
    skills: ['rallying_howl', 'war_cry', 'heavy_strike'], xp: 40, faction: 'crusade',
    brain: { type: 'commander' },
  },
  crusade_templar: {
    id: 'crusade_templar', name: 'Crusade Templar',
    color: '#cfa830', shape: 'trapezoid', radius: 18, material: 'metal', look: 'crusader',
    base: { life: 165, moveSpeed: 110, accuracy: 110, armor: 55, mana: 80, manaRegen: 6 },
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
    skills: ['frostbolt'], xp: 19, faction: 'abyssal',
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
    base: { life: 178, moveSpeed: 112, accuracy: 112, armor: 64, mana: 70, manaRegen: 7 },
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
    base: { life: 132, moveSpeed: 132, accuracy: 110, armor: 40 },
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
    base: { life: 190, moveSpeed: 122, accuracy: 125, armor: 36 },
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
    base: { life: 220, moveSpeed: 110, accuracy: 115, armor: 30, mana: 200, manaRegen: 12 },
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
    base: { life: 75, moveSpeed: 160, accuracy: 115, evasion: 60, mana: 20, manaRegen: 3 },
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
    base: { life: 500, moveSpeed: 45, accuracy: 115, armor: 60, poise: 80, mana: 80, manaRegen: 6 },
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
    base: { life: 85, moveSpeed: 170, accuracy: 105, armor: 20, mana: 25, manaRegen: 4 },
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
    base: { life: 60, moveSpeed: 155, accuracy: 110, evasion: 55, mana: 0 },
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
    skills: ['firebolt', 'despair', 'war_cry'], xp: 30, faction: 'beastkin', adorn: 'horns',
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
    base: { life: 260, moveSpeed: 140, accuracy: 120, armor: 40, mana: 120, manaRegen: 8 },
    mods: [mod('damage', 'increased', 0.2)],
    skills: ['rallying_howl', 'gore_rend', 'war_cry'], xp: 90, faction: 'beastkin', adorn: 'horns',
    grants: [{ atLevel: 40, skill: 'ground_slam' }],
    detection: 1.4,
    brain: {
      type: 'commander', perception: { alertShout: 480 },
      squad: { idle: { style: 'siege' } }, // the khan anchors his war-camp
    },
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
    base: { life: 130, moveSpeed: 110, accuracy: 110, armor: 40, mana: 40, manaRegen: 4 },
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
    base: { life: 170, moveSpeed: 135, accuracy: 120, evasion: 50, mana: 200, manaRegen: 12 },
    mods: [mod('chaosRes', 'flat', 0.4), mod('damage', 'increased', 0.15)],
    skills: ['essence_drain', 'summon_bats', 'despair'], xp: 70, faction: 'nightkin',
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
    base: { life: 75, moveSpeed: 120, evasion: 40, mana: 180, manaRegen: 12 },
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

  // --- THE WOLF FAMILY (beasts — the bloodier packs the weres run with) -----
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
    base: { life: 130, moveSpeed: 125, accuracy: 105, armor: 35, mana: 25, manaRegen: 3 },
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
    base: { life: 160, moveSpeed: 120, accuracy: 110, armor: 30, mana: 60, manaRegen: 6 },
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

  // VHORUN, the Sunder-WyRM's HEAD — the settled serpent's fight. Erupted and
  // anchored (moveSpeed 0): it repositions only by BURROW-teleport in Act II.
  // Four hitboxes: the neck root, the maw (the prize weakspot), two coils.
  primeval_wyrm_head: {
    id: 'primeval_wyrm_head', name: 'Vhorun, the Sunder-Wyrm',
    color: '#7fb069', shape: 'oval', radius: 30, material: 'chitin', look: 'sand_wyrm',
    base: { life: 950, moveSpeed: 0, accuracy: 130, armor: 45, mana: 280, manaRegen: 14, weight: 9 },
    mods: [mod('chaosRes', 'flat', 0.4), mod('fireRes', 'flat', 0.3), mod('damage', 'increased', 0.4)],
    skills: ['venom_bolt', 'bile_spray', 'ground_slam'],
    xp: 640, boss: true, noNemesis: true, faction: 'primeval', tags: ['primeval'],
    detection: 1.4, vision: { arcDeg: 360, rearMul: 1 }, turnSpeed: 2.6,
    worm: { length: 10, spacing: 20, taper: 0.9 },
    ambush: { radius: 340, announce: 'The ground HEAVES — Vhorun rises!' },
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
      type: 'artillery',
      script: [
        { // ACT I — the LURKING COIL: spit and slam from the crater.
          id: 'coiled',
          cadences: [{ every: 5.5, first: 3, actions: [{ do: 'cast', skill: 'bile_spray', at: 'target', force: true }] }],
          goto: [{ to: 'thrash', atLifeFrac: 0.62 }],
        },
        { // ACT II — it THRASHES: burrows away and erupts anew, venom raining.
          id: 'thrash',
          rewardGems: 1,
          announce: 'Vhorun THRASHES — the earth splits under it!',
          mods: [mod('damage', 'more', 0.3), mod('attackSpeed', 'increased', 0.2)],
          onEnter: [
            { do: 'teleport', to: 'awayFromTarget', range: 300 },
            { do: 'nova', skill: 'ground_slam', at: 'self', zoneRadius: 175, delay: 0.85, push: { strength: 220 } },
          ],
          cadences: [{ every: 7, actions: [{ do: 'ring', skill: 'venom_bolt', radius: 150, count: 6, waves: 1, delay: 0.9, at: 'anchor' }] }],
          goto: [{ to: 'fury', atLifeFrac: 0.28 }],
        },
        { // ACT III — the BROOD: its spawn boil up and WARD it; break the ward.
          id: 'fury',
          rewardGems: 2,
          announce: 'The Sunder-Wyrm keens — its brood answers!',
          mods: [mod('damage', 'more', 0.4)],
          onEnter: [
            { do: 'summon', monster: 'primeval_spawn', count: 4, ring: 220, at: 'anchor', tag: 'wyrm_brood' },
            { do: 'ward', tag: 'wyrm_brood', announce: 'The brood breaks — Vhorun is BARED!' },
          ],
          cadences: [{ every: 3, actions: [{ do: 'push', radius: 240, strength: 140, from: 'anchor' }] }],
          goto: [],
        },
      ],
    },
  },
  primeval_wyrm_maw: {
    id: 'primeval_wyrm_maw', name: 'Sunder-Maw',
    color: '#a4cc7e', shape: 'oval', radius: 17, material: 'chitin', look: 'leviathan_head',
    noNemesis: true, faction: 'primeval', tags: ['primeval'],
    base: { life: 220, moveSpeed: 0, mana: 140, manaRegen: 10, poise: 70 },
    skills: ['venom_bolt'], xp: 0,
    brain: { type: 'artillery' },
  },
  primeval_wyrm_coil: {
    id: 'primeval_wyrm_coil', name: 'Sunder-Coil',
    color: '#6a9458', shape: 'oval', radius: 15, material: 'chitin',
    noNemesis: true, faction: 'primeval', tags: ['primeval'],
    base: { life: 150, moveSpeed: 0, mana: 80, manaRegen: 6, poise: 50 },
    skills: ['whirling_reap'], xp: 0,
  },
  // The PASSING body — the glimpse as it slithers a zone: engine-wheeled
  // (driven), untouchable scenery-in-motion with a long trailing worm.
  primeval_wyrm_passing: {
    id: 'primeval_wyrm_passing', name: 'Vhorun, the Sunder-Wyrm',
    color: '#7fb069', shape: 'oval', radius: 22, material: 'chitin', look: 'sand_wyrm',
    base: { life: 100, moveSpeed: 120, mana: 0 },
    skills: [], xp: 0,
    faction: 'primeval', tags: ['primeval'],
    worm: { length: 14, spacing: 18, taper: 0.92 },
    driven: true, passive: true, invulnerable: true, untargetable: true,
    noNemesis: true, noBestiary: true,
  },

  // CRAGMAW, the Orogeny — the walking mountain (timed apparition). Two fist
  // silhouettes; sunder one and the slam is DISARMED.
  primeval_cragmaw: {
    id: 'primeval_cragmaw', name: 'Cragmaw, the Orogeny',
    color: '#b0916a', shape: 'octagon', radius: 27, material: 'stone', look: 'golem',
    base: { life: 880, moveSpeed: 46, accuracy: 125, armor: 85, mana: 220, manaRegen: 12, weight: 9 },
    mods: [mod('fireRes', 'flat', 0.3), mod('coldRes', 'flat', 0.3), mod('damage', 'increased', 0.4)],
    skills: ['ground_slam', 'hurl_debris', 'cleave'],
    xp: 600, boss: true, noNemesis: true, faction: 'primeval', tags: ['primeval'],
    detection: 1.3, turnSpeed: 2.2,
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
          cadences: [{ every: 4.5, first: 3, actions: [{ do: 'nova', skill: 'ground_slam', at: 'self', zoneRadius: 180, delay: 0.85, push: { strength: 240 } }] }],
          goto: [{ to: 'barrage', atLifeFrac: 0.55 }],
        },
        { // ACT II — the BARRAGE: it plants itself and rains the hillside down.
          id: 'barrage',
          use: { type: 'artillery' },
          rewardGems: 1,
          announce: 'Cragmaw tears the hillside loose — SHELTER!',
          mods: [mod('damage', 'more', 0.35), mod('attackSpeed', 'increased', 0.15)],
          cadences: [{ every: 6, actions: [{ do: 'ring', skill: 'hurl_debris', radius: 160, count: 5, waves: 2, waveGap: 0.5, delay: 1.0, at: 'anchor' }] }],
          goto: [{ to: 'landslide', atLifeFrac: 0.22 }],
        },
        { // ACT III — the LANDSLIDE: shards of it break off and swarm.
          id: 'landslide',
          use: { type: 'swarm' },
          rewardGems: 2,
          announce: 'The Orogeny CRUMBLES FORWARD — it will bury you!',
          mods: [mod('moveSpeed', 'more', 0.4), mod('damage', 'more', 0.4)],
          onEnter: [{ do: 'summon', monster: 'primeval_spawn', count: 3, ring: 200, at: 'anchor', tag: 'cragmaw_shard' }],
          cadences: [{ every: 2.8, actions: [{ do: 'push', radius: 230, strength: 150, from: 'anchor' }] }],
          goto: [],
        },
      ],
      impulses: [{ type: 'swarm', every: [7, 10], duration: [1.3, 1.8], announce: 'It charges — a rockslide with intent!' }],
    },
  },
  primeval_cragmaw_fist: {
    id: 'primeval_cragmaw_fist', name: 'Orogen Fist',
    color: '#9a7c56', shape: 'octagon', radius: 13, material: 'stone',
    noNemesis: true, faction: 'primeval', tags: ['primeval'],
    base: { life: 130, moveSpeed: 0, mana: 60, manaRegen: 6, poise: 60 },
    skills: ['cleave'], xp: 0,
  },

  // ASHVEIN, the Furnace Below — hell's own sovereign (UNDERWORLD-ONLY: the
  // def's dimension row keeps it off the surface instance's roster entirely).
  primeval_ashvein: {
    id: 'primeval_ashvein', name: 'Ashvein, the Furnace Below',
    color: '#e06a2a', shape: 'star', radius: 25, material: 'ember', look: 'magma_lurker',
    base: { life: 820, moveSpeed: 62, accuracy: 135, armor: 55, mana: 320, manaRegen: 16 },
    mods: [mod('fireRes', 'flat', 0.75), mod('chaosRes', 'flat', 0.4), mod('damage', 'increased', 0.4)],
    skills: ['magma_glob', 'flame_wave', 'meteor_storm'],
    xp: 640, boss: true, noNemesis: true, faction: 'primeval', tags: ['primeval'],
    detection: 1.4, levitates: true,
    scaling: { life: { incPerLevel: 0.15 } },
    brain: {
      type: 'artillery',
      script: [
        { // ACT I — the SMOLDER: globs and rolling fire.
          id: 'smolder',
          cadences: [{ every: 5, first: 3, actions: [{ do: 'nova', skill: 'magma_glob', at: 'self', zoneRadius: 165, delay: 0.85, push: { strength: 180 } }] }],
          goto: [{ to: 'furnace', atLifeFrac: 0.55 }],
        },
        { // ACT II — the FURNACE OPENS: cinders boil out and WARD it under a
          // falling sky.
          id: 'furnace',
          rewardGems: 1,
          announce: 'The furnace OPENS — the sky catches fire!',
          mods: [mod('damage', 'more', 0.35)],
          onEnter: [
            { do: 'summon', monster: 'primeval_cinder', count: 4, ring: 210, at: 'anchor', tag: 'ashvein_cinder' },
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
          cadences: [{ every: 5, actions: [{ do: 'ring', skill: 'magma_glob', radius: 170, count: 7, waves: 2, waveGap: 0.5, delay: 1.0, at: 'anchor' }] }],
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
    color: '#9a6ad2', shape: 'pentagon', radius: 24, material: 'void',
    base: { life: 900, moveSpeed: 0, accuracy: 135, armor: 50, mana: 320, manaRegen: 18, weight: 9 },
    mods: [mod('chaosRes', 'flat', 0.5), mod('coldRes', 'flat', 0.3), mod('damage', 'increased', 0.45)],
    skills: ['lash_roots', 'venom_bolt', 'bile_spray'],
    xp: 660, boss: true, noNemesis: true, faction: 'primeval', tags: ['primeval'],
    detection: 1.6, vision: { arcDeg: 360, rearMul: 1 }, turnSpeed: 2.0,
    habitat: { kind: 'husk_throne', grace: 48 },
    ambush: { radius: 300, announce: 'The husk SPLITS along old seams — Velketh wakes!' },
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
          cadences: [{ every: 5.5, first: 3.5, actions: [{ do: 'ring', skill: 'venom_bolt', radius: 140, count: 5, waves: 1, delay: 0.85, at: 'anchor' }] }],
          goto: [{ to: 'clutch', atLifeFrac: 0.55 }],
        },
        { // ACT II — the CLUTCH: its brood swarms out of the husk and WARDS it.
          id: 'clutch',
          rewardGems: 1,
          announce: 'The throne DISGORGES its clutch!',
          mods: [mod('damage', 'more', 0.35)],
          onEnter: [
            { do: 'summon', monster: 'primeval_spawn', count: 4, ring: 190, at: 'anchor', tag: 'velketh_clutch' },
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
            { every: 2.6, actions: [{ do: 'push', radius: 240, strength: 150, from: 'anchor' }] },
            { every: 6, actions: [{ do: 'cast', skill: 'bile_spray', at: 'target', force: true }] },
          ],
          goto: [],
        },
      ],
    },
  },
  primeval_velketh_arm: {
    id: 'primeval_velketh_arm', name: 'Husk Arm',
    color: '#7e56ae', shape: 'oval', radius: 13, material: 'void',
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
    base: { life: 85, moveSpeed: 110, mana: 140, manaRegen: 8 },
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
    base: { life: 420, moveSpeed: 105, armor: 25, poise: 80, mana: 220, manaRegen: 10, energyShield: 80 },
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
    base: { life: 300, moveSpeed: 88, poise: 60, mana: 260, manaRegen: 11, energyShield: 60 },
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
  // The Night Court keeps the old courtesies: the dead serve, the groves
  // burn, and the Horned Tribes are prey that fights back.
  'nightkin|undead': 'ally',
  'nightkin|sylvan': 'hostile',
  'nightkin|beastkin': 'hostile',
  'nightkin|demon': 'hostile',
};

/** Diplomatic stance between two factions (order-insensitive). */
export function factionStance(a: string, b: string): FactionStance {
  if (a === b) return 'ally';
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
    ],
  },
  nightkin: {
    name: 'the Night Court',
    table: [
      { id: 'vampire_thrall', weight: 3 },
      { id: 'crimson_bat', weight: 2 },
      { id: 'deadwake_ghoul', weight: 2, presence: { from: 5, fadeIn: 3 } },
      { id: 'werewolf', weight: 2, presence: { from: 10, fadeIn: 5 } },
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
      { id: 'cinder_hound', weight: 3 },
      { id: 'slag_brute', weight: 2, presence: { from: 6, fadeIn: 3 } },
      { id: 'vent_priest', weight: 2, presence: { from: 8, fadeIn: 4 } },
      { id: 'emberkin_matriarch', weight: 1, presence: { from: 13, fadeIn: 5 } },
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
