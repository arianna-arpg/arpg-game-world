// ---------------------------------------------------------------------------
// THE BESTIARY.
//
// Monsters are data: base stats + innate modifiers + a list of skill ids
// from the SAME skill catalog the player uses. Their AI reads each skill's
// `ai` hint to decide when to use it. Any monster can also be summoned as a
// player minion (see Summon Skeleton / Flame Sprite) — same definition.
// ---------------------------------------------------------------------------

import { mod, type Modifier, type DamageType } from '../engine/stats';
import type { ActorAdorn, ActorShape, BrainDef } from '../engine/actor';

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

export interface MonsterDef {
  id: string;
  name: string;
  color: string;
  shape: ActorShape;
  radius: number;
  /** Base stat overrides at level 1 (anything omitted uses STAT_DEFS defaults). */
  base: Record<string, number>;
  /** Innate modifiers (resistances, speed quirks...). */
  mods?: Modifier[];
  /** Skill ids from the shared catalog. */
  skills: string[];
  xp: number;
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
  /** Multiplier on detection range (1 = baseline). Low shambles past you
   *  (zombie 0.55); high senses you from afar (blood mite 1.6). */
  detection?: number;
  /** OPT-IN per-stat level scaling, layered on the baseline (see StatScale). */
  scaling?: Record<string, StatScale>;
  /** Level-gated skill/support grants — the kit evolves as it levels (MonsterGrant). */
  grants?: MonsterGrant[];
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
  /** A RIDER SLOT on this creature's back: same-team actors whose tag /
   *  defId / faction matches `kinds` may MOUNT it (the {do:'mount'} verb) —
   *  the rider is carried (position pinned, dash/push stilled) and casts
   *  freely from the saddle until either party dies. One rider at a time.
   *  The D2 siege-beast pattern: a walking tower for its faction's fragile
   *  teeth. */
  mountSlot?: { kinds: string[]; offsetY?: number };
}

/** AMBIENT FAUNA by biome — the living-texture layer. Each row rolls
 *  independently per zone (chance), then spawns count[min,max] bodies as one
 *  squad. Prey ('critter') exists to wander and flee; predators hunt it by
 *  their brains' TargetSpec.prey — the meadow stages its own dramas whether
 *  or not you watch. A new biome's fauna is a new row, never new code. */
export const WILDLIFE: Record<string, { id: string; chance: number; count: [number, number] }[]> = {
  plains: [
    { id: 'meadow_hare', chance: 0.75, count: [3, 5] },
    { id: 'plains_wolf', chance: 0.4, count: [2, 3] },
    { id: 'lash_maiden', chance: 0.2, count: [2, 3] },
    { id: 'wayfarer_hunter', chance: 0.2, count: [1, 2] },
    { id: 'wayfarer_pilgrim', chance: 0.2, count: [2, 3] },
  ],
  forest: [
    { id: 'meadow_hare', chance: 0.6, count: [2, 4] },
    { id: 'plains_wolf', chance: 0.5, count: [2, 4] },
    { id: 'thicket_stalker', chance: 0.35, count: [1, 2] },
    { id: 'broodmother', chance: 0.25, count: [1, 1] },
    { id: 'wayfarer_hunter', chance: 0.15, count: [1, 2] },
  ],
  desert: [
    { id: 'meadow_hare', chance: 0.3, count: [1, 2] },
    { id: 'sand_skitterer', chance: 0.55, count: [3, 5] },
    { id: 'dune_vulture', chance: 0.45, count: [1, 2] },
    { id: 'lash_maiden', chance: 0.3, count: [2, 3] },
    { id: 'broodmother', chance: 0.2, count: [1, 1] },
  ],
};

export const MONSTERS: Record<string, MonsterDef> = {

  zombie: {
    id: 'zombie', name: 'Shambling Zombie',
    color: '#6a8858', shape: 'circle', radius: 14,
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
    },
  },

  skeleton_warrior: {
    id: 'skeleton_warrior', name: 'Skeleton Warrior',
    color: '#cfc8b8', shape: 'ribcage', radius: 13,
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
    color: '#d8e8c8', shape: 'ribcage', radius: 12,
    base: { life: 26, moveSpeed: 140, accuracy: 80, evasion: 40, mana: 60, manaRegen: 6 },
    skills: ['soothing_touch', 'claw'],
    xp: 12,
    faction: 'undead',
    detection: 0.9,
  },

  // The close-work wraith (#41): fights at arm's length with a small reap.
  blade_wraith: {
    id: 'blade_wraith', name: 'Blade Wraith',
    color: '#9a7ac8', shape: 'diamond', radius: 12,
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
    color: '#8a4a68', shape: 'diamond', radius: 19,
    base: { life: 150, moveSpeed: 165, accuracy: 100, evasion: 45, mana: 40, manaRegen: 5 },
    mods: [mod('chaosRes', 'flat', 0.5)],
    skills: ['harvester_scythe'],
    xp: 0,
    brain: { type: 'flanker' },
  },

  // The swarm-variant body: a lesser reaper — many where the apex is one.
  lesser_reaper: {
    id: 'lesser_reaper', name: 'Lesser Reaper',
    color: '#a06080', shape: 'diamond', radius: 12,
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
    color: '#a8c860', shape: 'pentagon', radius: 8,
    base: { life: 16, moveSpeed: 205, accuracy: 75, evasion: 60, mana: 0 },
    skills: ['claw'],
    xp: 0,
    brain: { type: 'swarm' },
  },

  // The broken shard's teeth (Pain Hounds): fast, burning, briefly alive.
  pain_hound: {
    id: 'pain_hound', name: 'Pain Hound',
    color: '#d05a3a', shape: 'rhombus', radius: 10,
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
    color: '#b8d060', shape: 'pentagon', radius: 7,
    base: { life: 12, moveSpeed: 200, accuracy: 70, evasion: 60, mana: 0 },
    skills: ['claw'],
    xp: 0,
    brain: { type: 'swarm' },
  },

  mender_sprite: {
    id: 'mender_sprite', name: 'Mender Sprite',
    color: '#a8f0c8', shape: 'diamond', radius: 8,
    base: { life: 14, moveSpeed: 190, mana: 999, manaRegen: 20 },
    skills: ['soothing_touch'],
    xp: 0,
  },

  // (Broodclutch's hatchlings reuse the bestiary's existing `broodling` —
  // one body, two doors in: the spider-kin spawn it, and so do your poisons.)
  // THE PLAGUEFATHER — Summon Plaguefather's bloated priest: he spits
  // venom on his own, and his summoner's meta-action (Endow) anoints the
  // whole flock through him.
  plaguefather: {
    id: 'plaguefather', name: 'Plaguefather',
    color: '#5ea838', shape: 'pentagon', radius: 16,
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
    color: '#9ad8e8', shape: 'kite', radius: 10,
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
    color: '#d8d0b0', shape: 'ribcage', radius: 12,
    base: { life: 24, moveSpeed: 130, accuracy: 100, evasion: 50, mana: 0 },
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
    color: '#ff8a4a', shape: 'circle', radius: 8,
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
    color: '#8a6ad8', shape: 'kite', radius: 12,
    base: { life: 90, moveSpeed: 150, accuracy: 90, mana: 60, manaRegen: 8 },
    skills: ['venom_bolt'],
    xp: 0,
    detection: 1.1,
  },

  // Bombardment ordnance: zigzags in, arms the fuse, detonates — blast
  // scales with its own max life, so minion-LIFE gems are blast gems.
  bombard_demon: {
    id: 'bombard_demon', name: 'Bombard Demon',
    color: '#e84a2a', shape: 'diamond', radius: 10,
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
    color: '#4a4066', shape: 'circle', radius: 11,
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
    color: '#b8a8f8', shape: 'diamond', radius: 12,
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
    color: '#e8b06a', shape: 'diamond', radius: 13,
    base: { life: 32, moveSpeed: 120, mana: 90, manaRegen: 7 },
    mods: [mod('fireRes', 'flat', 0.4), mod('proc_sainted_ash', 'flat', 1)],
    skills: ['firebolt'],
    xp: 15,
  },
  // A piper whose darts CONJURE: its hits summon phantasms serving IT, at
  // the PPM discipline's pace — kill the piper and the tune ends.
  wraith_piper: {
    id: 'wraith_piper', name: 'Wraith Piper',
    color: '#9ad8e8', shape: 'kite', radius: 13,
    base: { life: 34, moveSpeed: 135, mana: 80, manaRegen: 6, weight: 0.6 },
    mods: [mod('chaosRes', 'flat', 0.4), mod('proc_summon_phantasm', 'flat', 1)],
    skills: ['phantasm_bolt'],
    xp: 18,
  },

  fire_cultist: {
    id: 'fire_cultist', name: 'Fire Cultist',
    color: '#d86a3a', shape: 'diamond', radius: 13,
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
    color: '#7ab8d8', shape: 'diamond', radius: 13,
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
    color: '#c8d84a', shape: 'diamond', radius: 12,
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
    color: '#a86ad8', shape: 'pentagon', radius: 13,
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
    color: '#c2362b', shape: 'diamond', radius: 15,
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
    color: '#8a1e2e', shape: 'star', radius: 21,
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
    id: 'amalgam_necromancer', name: 'the Bonewright',
    color: '#9ad0b0', shape: 'pentagon', radius: 15,
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
    color: '#d8d0b8', shape: 'ribcage', radius: 18,
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
    color: '#b04858', shape: 'star', radius: 17,
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
    color: '#6a8a9a', shape: 'circle', radius: 19,
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
    color: '#8ac0a0', shape: 'star', radius: 24,
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
    id: 'descent_delver', name: 'the Delver',
    color: '#7fe0d8', shape: 'pentagon', radius: 14,
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
    color: '#9aa8c8', shape: 'diamond', radius: 12,
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
    color: '#5a6a8a', shape: 'triangle', radius: 13,
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
    color: '#7f9ad8', shape: 'star', radius: 13,
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
    color: '#6a6a86', shape: 'circle', radius: 18,
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
    color: '#4a9ad8', shape: 'diamond', radius: 13,
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
    color: '#2a5a8a', shape: 'triangle', radius: 14,
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
    color: '#6ac8e8', shape: 'star', radius: 14,
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
    color: '#2a7a9a', shape: 'circle', radius: 24,
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
    color: '#86a848', shape: 'triangle', radius: 15,
    base: { life: 40, moveSpeed: 110, mana: 80, manaRegen: 6 },
    mods: [mod('chaosRes', 'flat', 0.6)],
    skills: ['venom_bolt', 'claw'],
    xp: 14,
    faction: 'wild',
  },

  brute: {
    id: 'brute', name: 'Pit Brute',
    color: '#a85848', shape: 'circle', radius: 20,
    base: { life: 90, moveSpeed: 105, accuracy: 90, armor: 30, mana: 60, manaRegen: 6 },
    skills: ['heavy_strike', 'cleave'],
    xp: 26,
  },

  // --- Boss: a full multi-skill kit, same system as everything else --------

  pit_lord: {
    id: 'pit_lord', name: 'Lord of the Pit',
    color: '#c03838', shape: 'circle', radius: 28,
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
    color: '#9a86d8', shape: 'diamond', radius: 20,
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
    color: '#c84848', shape: 'circle', radius: 7,
    base: { life: 12, moveSpeed: 175, accuracy: 70, mana: 0 },
    skills: ['claw'],
    xp: 3,
    brain: { type: 'swarm' },
    faction: 'wild',
    detection: 1.6, // tiny, but it smells blood from far off
  },

  husk_swarmer: {
    id: 'husk_swarmer', name: 'Husk Swarmer',
    color: '#b89858', shape: 'pentagon', radius: 10,
    base: { life: 22, moveSpeed: 160, accuracy: 80, mana: 0 },
    skills: ['claw'],
    xp: 5,
    brain: { type: 'swarm' },
    faction: 'wild',
  },

  dune_stalker: {
    id: 'dune_stalker', name: 'Dune Stalker',
    color: '#d8b878', shape: 'hexagon', radius: 13,
    base: { life: 34, moveSpeed: 170, accuracy: 95, evasion: 70, mana: 0 },
    skills: ['claw'],
    xp: 13,
    brain: { type: 'skirmish', withdraw: 1.4 },
    faction: 'wild',
    detection: 1.4, // an ambush predator, eyes everywhere
  },

  javelin_skirmisher: {
    id: 'javelin_skirmisher', name: 'Javelin Skirmisher',
    color: '#c8c890', shape: 'triangle', radius: 12,
    base: { life: 28, moveSpeed: 155, accuracy: 105, evasion: 60, mana: 0 },
    skills: ['bone_arrow'],
    xp: 14,
    brain: { type: 'skirmish', withdraw: 2 },
  },

  hex_weaver: {
    id: 'hex_weaver', name: 'Hex Weaver',
    color: '#a8d848', shape: 'hexagon', radius: 13,
    base: { life: 30, moveSpeed: 125, mana: 120, manaRegen: 9 },
    mods: [mod('lightningRes', 'flat', 0.4)],
    skills: ['spark', 'despair'],
    xp: 16,
    brain: { type: 'caster' },
  },

  pyroclast_magus: {
    id: 'pyroclast_magus', name: 'Pyroclast Magus',
    color: '#ff8438', shape: 'octagon', radius: 14,
    base: { life: 44, moveSpeed: 120, mana: 160, manaRegen: 10 },
    mods: [mod('fireRes', 'flat', 0.6)],
    skills: ['firebolt', 'meteor_storm'],
    xp: 24,
    brain: { type: 'caster' },
  },

  volatile_zealot: {
    id: 'volatile_zealot', name: 'Volatile Zealot',
    color: '#ff6446', shape: 'diamond', radius: 11,
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
    color: '#d8d0c0', shape: 'octagon', radius: 30,
    base: { life: 320, moveSpeed: 70, accuracy: 95, armor: 60, mana: 40, manaRegen: 4 },
    mods: [mod('chaosRes', 'flat', 0.4)],
    skills: ['crushing_leap', 'heavy_strike'],
    xp: 55,
    brain: { type: 'juggernaut', enrage: 0.35 },
  },

  tundra_behemoth: {
    id: 'tundra_behemoth', name: 'Tundra Behemoth',
    color: '#a8c8d8', shape: 'hexagon', radius: 28,
    base: { life: 380, moveSpeed: 75, accuracy: 90, armor: 45, mana: 30, manaRegen: 3 },
    mods: [mod('coldRes', 'flat', 0.75)],
    skills: ['ground_slam', 'claw'],
    xp: 60,
    brain: { type: 'juggernaut', enrage: 0.4 },
  },

  gloom_stalker: {
    id: 'gloom_stalker', name: 'Gloom Stalker',
    color: '#9080c8', shape: 'star', radius: 12,
    base: { life: 45, moveSpeed: 195, accuracy: 115, evasion: 110, mana: 50, manaRegen: 8 },
    skills: ['backstab'],
    xp: 24,
    brain: { type: 'assassin', withdraw: 1.5 },
  },

  warband_chieftain: {
    id: 'warband_chieftain', name: 'Warband Chieftain',
    color: '#e8a040', shape: 'cross', radius: 16,
    base: { life: 130, moveSpeed: 115, accuracy: 100, armor: 30, mana: 80, manaRegen: 6 },
    skills: ['rallying_howl', 'war_cry', 'heavy_strike'],
    xp: 40,
    brain: { type: 'commander' },
  },

  lich_marshal: {
    id: 'lich_marshal', name: 'Lich Marshal',
    color: '#b89ae8', shape: 'cross', radius: 15,
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
    color: '#8ab8d8', shape: 'square', radius: 18,
    base: { life: 160, moveSpeed: 95, accuracy: 100, armor: 50, mana: 60, manaRegen: 6 },
    mods: [mod('blockChance', 'flat', 0.15)],
    skills: ['shield_up', 'heavy_strike', 'cleave'],
    xp: 35,
    faction: 'undead',
  },

  bone_serpent: {
    id: 'bone_serpent', name: 'Bone Serpent',
    color: '#cfc0a0', shape: 'circle', radius: 13,
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
    color: '#7c8a6a', shape: 'circle', radius: 11,
    base: { life: 22, moveSpeed: 120, accuracy: 70, mana: 0 },
    mods: [mod('chaosRes', 'flat', 0.4)],
    skills: ['claw'],
    xp: 7,
    brain: { type: 'swarm' },
    faction: 'undead',
    detection: 0.75,
  },

  // A fast, lunging cannibal — orbits then bites, whipping itself into a frenzy.
  deadwake_ghoul: {
    id: 'deadwake_ghoul', name: 'Ravenous Ghoul',
    color: '#9a7a5a', shape: 'star', radius: 13,
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
    color: '#8aa04a', shape: 'hexagon', radius: 17,
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
    color: '#9fb0c0', shape: 'square', radius: 17,
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
    color: '#c4b890', shape: 'diamond', radius: 13,
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
    color: '#8a7ca8', shape: 'kite', radius: 12,
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
    color: '#6e6048', shape: 'octagon', radius: 24,
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
    color: '#b59ad8', shape: 'star', radius: 19,
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
    color: '#cdd2c4', shape: 'cross', radius: 18,
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
    color: '#e8dcb0', shape: 'octagon', radius: 28,
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
    color: '#9a3aa8', shape: 'star', radius: 26,
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
    color: '#9c7a4e', shape: 'hexagon', radius: 16,
    base: { life: 78, moveSpeed: 104, accuracy: 96, armor: 24, mana: 30, manaRegen: 4 },
    skills: ['heavy_strike'],
    xp: 18, faction: 'beast', adorn: 'horns',
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
    color: '#c8a85e', shape: 'trapezoid', radius: 13,
    base: { life: 46, moveSpeed: 176, accuracy: 100, mana: 0 },
    skills: ['claw'],
    xp: 14, faction: 'beast',
    detection: 1.15, // see the rouse note on the aurochs — only bites once provoked
    scaleVariance: [0.82, 1.34], scaleStats: true, juvenileBelow: 0.95,
    juvenileBrain: { type: 'flee' },
  },
  // The "elephant" of the herd — a heavy bruiser that lumbers and never retreats
  // (juggernaut). The biggest tuskers are unmistakable; their calves bolt.
  migration_tusker: {
    id: 'migration_tusker', name: 'Great Tusker',
    color: '#8a6a44', shape: 'octagon', radius: 20,
    base: { life: 142, moveSpeed: 96, accuracy: 104, armor: 40, mana: 50, manaRegen: 6 },
    skills: ['ground_slam', 'heavy_strike'],
    xp: 30, faction: 'beast', adorn: 'horns',
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
    color: '#7a9a4a', shape: 'circle', radius: 15,
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
    color: '#9aae3a', shape: 'star', radius: 13,
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
    color: '#6e8a3e', shape: 'octagon', radius: 21,
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
    color: '#a6d24a', shape: 'cross', radius: 27,
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
    color: '#d0a850', shape: 'square', radius: 15,
    base: { life: 74, moveSpeed: 132, accuracy: 100, armor: 18, mana: 50, manaRegen: 5 },
    mods: [mod('life', 'more', 0.5)],
    skills: ['cleave', 'war_cry'],
    xp: 26, faction: 'bandit', adorn: 'horns',
    detection: 0.8,
  },
  bandit_cutthroat: {
    id: 'bandit_cutthroat', name: 'Cutthroat',
    color: '#9a7a44', shape: 'trapezoid', radius: 12,
    base: { life: 46, moveSpeed: 168, accuracy: 104, mana: 0 },
    mods: [mod('life', 'more', 0.5)],
    skills: ['claw'],
    xp: 15, faction: 'bandit',
    brain: { type: 'skirmish', withdraw: 1.3 }, // darts in and out, a knife-fighter
    detection: 1.0,
  },
  bandit_bruiser: {
    id: 'bandit_bruiser', name: 'Bandit Bruiser',
    color: '#7e6038', shape: 'octagon', radius: 17,
    base: { life: 96, moveSpeed: 112, accuracy: 100, armor: 32, mana: 40, manaRegen: 4 },
    mods: [mod('life', 'more', 0.5)],
    skills: ['heavy_strike', 'ground_slam'],
    xp: 24, faction: 'bandit', adorn: 'horns',
    brain: { type: 'juggernaut', enrage: 0.4 },
    detection: 0.85,
  },

  // --- MYCELIA: "The Bloom" — the fungal 'fungal' faction --------------------
  //     Patron of the mycelia biome + the spore-bloom's spawn. contexts:['mycelia']
  //     keeps them to fungal ground + the overlay's spread zones (never baseline war).
  //     A slow, grasping hive of fruiting bodies: high chaosRes (they ARE the rot),
  //     poison/area-denial, regenerative support. HOSTILE where the bloom has spread.
  fungal_sporeling: {
    id: 'fungal_sporeling', name: 'Sporeling',
    color: '#8fd06f', shape: 'circle', radius: 11,
    base: { life: 30, moveSpeed: 158, accuracy: 92, mana: 0 },
    mods: [mod('chaosRes', 'flat', 0.6)],
    skills: ['claw'],
    xp: 9, faction: 'fungal',
    brain: { type: 'swarm' },
    detection: 1.1, // the chaff that scurries the spore-mat
  },
  fungal_puffball: {
    id: 'fungal_puffball', name: 'Puffball',
    color: '#adbf6a', shape: 'circle', radius: 14,
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
    color: '#9aae3a', shape: 'star', radius: 13,
    base: { life: 44, moveSpeed: 118, accuracy: 100, mana: 130, manaRegen: 9 },
    mods: [mod('chaosRes', 'flat', 0.7)],
    skills: ['venom_bolt', 'toxic_cloud'],
    xp: 18, faction: 'fungal',
    brain: { type: 'strafer' }, // kites, lobs spore globs
    detection: 1.25,
  },
  fungal_brute: {
    id: 'fungal_brute', name: 'Mycelial Brute',
    color: '#6e8a4a', shape: 'octagon', radius: 21,
    base: { life: 150, moveSpeed: 86, accuracy: 100, armor: 36, mana: 50, manaRegen: 5 },
    mods: [mod('chaosRes', 'flat', 0.8)],
    skills: ['heavy_strike', 'ground_slam'],
    xp: 32, faction: 'fungal', adorn: 'horns',
    brain: { type: 'juggernaut', enrage: 0.4 }, // the wall you grind through to reach the core
    detection: 0.85,
  },
  fungal_tender: {
    id: 'fungal_tender', name: 'Bloom-Tender',
    color: '#c08ae0', shape: 'cross', radius: 17,
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
    color: '#a6d24a', shape: 'star', radius: 28,
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
    color: '#ff7a3a', shape: 'circle', radius: 15,
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
    color: '#b8b09a', shape: 'square', radius: 21,
    base: { life: 150, moveSpeed: 0, armor: 25, evasion: 0, mana: 999, manaRegen: 50 },
    mods: [mod('chaosRes', 'flat', 0.5)],
    skills: ['spew_dead'],
    xp: 45,
    spawner: true,
  },

  ember_rift: {
    id: 'ember_rift', name: 'Ember Rift',
    color: '#ff6a2a', shape: 'diamond', radius: 19,
    base: { life: 120, moveSpeed: 0, armor: 10, evasion: 0, mana: 999, manaRegen: 50 },
    mods: [mod('fireRes', 'flat', 0.75)],
    skills: ['spew_flame'],
    xp: 50,
    spawner: true,
  },

  rime_stone: {
    id: 'rime_stone', name: 'Rime Stone',
    color: '#9accdf', shape: 'square', radius: 20,
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
    color: '#7aa83e', shape: 'pentagon', radius: 10,
    base: { life: 22, moveSpeed: 175, accuracy: 85, evasion: 60, mana: 0 },
    skills: ['claw'],
    xp: 8,
    // THE COWARD (MoraleSpec showcase): breaks and routs when badly hurt,
    // rallies after a breath — but holds firm near a leader (the shaman a
    // pack promoted). Goblin courage is borrowed courage.
    brain: {
      type: 'skirmish', withdraw: 1.2,
      morale: { breakAtLife: 0.35, rallyAfter: 2.5, boldNearLeader: 280 },
      // Goblin marching order is a RABBLE: a loose amble around whoever
      // leads, with stragglers who lag and jog to catch up — the exact
      // opposite of the gnoll drill two ridges over.
      squad: { idle: { style: 'loose', stragglerChance: 0.45 } },
    },
    faction: 'goblin',
    adorn: 'ears',
  },

  goblin_shaman: {
    id: 'goblin_shaman', name: 'Goblin Shaman',
    color: '#8ec84e', shape: 'diamond', radius: 12,
    base: { life: 30, moveSpeed: 130, mana: 120, manaRegen: 9 },
    mods: [mod('lightningRes', 'flat', 0.4)],
    skills: ['spark', 'rallying_howl'],
    xp: 16,
    brain: { type: 'caster' },
    wardPriority: 2, // the warband shields its shaman like a commander
    faction: 'goblin',
    adorn: 'ears',
  },

  goblin_brute: {
    id: 'goblin_brute', name: 'Goblin Brute',
    color: '#6a9838', shape: 'hexagon', radius: 17,
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
    faction: 'goblin',
    adorn: 'ears',
  },

  goblin_chief: {
    id: 'goblin_chief', name: 'Goblin Chief',
    color: '#a8c84e', shape: 'cross', radius: 15,
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
    color: '#5a8848', shape: 'trapezoid', radius: 16,
    base: { life: 95, moveSpeed: 145, accuracy: 100, armor: 25, mana: 40, manaRegen: 5 },
    skills: ['cleave', 'heavy_strike'],
    xp: 26,
    brain: { type: 'flanker' },
    faction: 'goblin',
    adorn: 'horns',
  },

  troll_mauler: {
    id: 'troll_mauler', name: 'Troll Mauler',
    color: '#4e7858', shape: 'rectangle', radius: 24,
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
    brain: { type: 'juggernaut', enrage: 0.4 },
    faction: 'goblin',
    adorn: 'spikes',
  },

  // --- The Gnoll packs: hyena-folk who run with the goblins and despise
  // the sylvan groves. They circle. They wait. Then all of them come at once.
  // THE SQUAD-TACTICS SHOWCASE: prowlers muster (pack preset), rotate two
  // ENGAGE TOKENS so the bites come in shifts, fan their approaches around
  // the prey, share the leader's mark — and scatter when the leader falls.

  gnoll_prowler: {
    id: 'gnoll_prowler', name: 'Gnoll Prowler',
    color: '#b08a48', shape: 'kite', radius: 13,
    base: { life: 38, moveSpeed: 170, accuracy: 95, evasion: 60, mana: 0 },
    skills: ['claw'],
    xp: 14,
    brain: {
      type: 'pack',
      // MILITANT off the clock too: the pack marches in a drilled column on
      // its leader (SquadSpec.idle 'drill') — you see the discipline before
      // you feel it.
      squad: {
        tokens: 2, surround: true, focusLeader: true, onLeaderDeath: 'scatter',
        formation: 'column', spacing: 42, idle: { style: 'drill' },
      },
      morale: { panicOnAllyDeath: { radius: 200, duration: 2.2, chance: 0.35 }, rallyAfter: 2.2 },
    },
    faction: 'gnoll',
    adorn: 'ears',
  },

  gnoll_butcher: {
    id: 'gnoll_butcher', name: 'Gnoll Butcher',
    color: '#a87838', shape: 'trapezoid', radius: 15,
    base: { life: 75, moveSpeed: 150, accuracy: 100, armor: 15, mana: 40, manaRegen: 5 },
    skills: ['cleave', 'claw'],
    xp: 22,
    // Butchers AVENGE a fallen leader instead of mourning it — and march
    // the drill line with the prowlers.
    brain: {
      type: 'flanker',
      squad: { focusLeader: true, onLeaderDeath: 'frenzy', formation: 'column', spacing: 42, idle: { style: 'drill' } },
    },
    faction: 'gnoll',
    adorn: 'ears',
  },

  gnoll_longshot: {
    id: 'gnoll_longshot', name: 'Gnoll Longshot',
    color: '#c8a058', shape: 'kite', radius: 12,
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
      rules: [{
        when: { distUnder: 720 },
        actions: [{ do: 'garrison', within: 680 }],
        use: { move: { style: 'garrison' } },
        cooldown: 4,
      }],
    },
    faction: 'gnoll',
    adorn: 'ears',
  },

  gnoll_howler: {
    id: 'gnoll_howler', name: 'Gnoll Howler',
    color: '#d8b068', shape: 'trapezoid', radius: 14,
    base: { life: 90, moveSpeed: 130, accuracy: 95, mana: 100, manaRegen: 8 },
    skills: ['rallying_howl', 'war_cry', 'claw'],
    xp: 34,
    // The HOWL is literal: sighting prey puts every gnoll within earshot on
    // alert toward it (PerceptionSpec.alertShout — the sentry callout).
    brain: { type: 'commander', perception: { alertShout: 480 } },
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
    color: '#c8b494', shape: 'oval', radius: 7,
    base: { life: 8, moveSpeed: 215, evasion: 80, mana: 0 },
    mods: [mod('detectability', 'more', -0.7)],
    skills: [],
    xp: 1,
    tag: 'critter',
    faction: 'beast',
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
    color: '#9a9088', shape: 'kite', radius: 12,
    base: { life: 34, moveSpeed: 188, accuracy: 95, evasion: 40, mana: 0 },
    skills: ['claw'],
    xp: 12,
    tag: 'predator',
    faction: 'beast',
    detection: 1.6,
    adorn: 'ears',
    scaleVariance: [0.9, 1.25],
    brain: {
      type: 'pack',
      target: { prey: ['critter'] },
      squad: { muster: { count: 2, radius: 340 }, tokens: 2, surround: true, onLeaderDeath: 'scatter' },
      perception: { memory: 3 },
      // A wolf STALKS: lopes in bursts with held, watching pauses — the
      // hesitation of a real animal, and your window to line up a shot.
      tempo: { moveFor: [1.2, 2.2], pauseFor: [0.25, 0.6] },
    },
  },

  // THE SAND LEAPER (D2 homage): a skittering desert ambusher whose MIND is
  // rolled per spawn (brainVariants) — one clutch runs as a mustering pack,
  // the next hunts alone in hit-and-run darts, the next attacks in TIDES
  // (timid at range, then a boiling rush every few seconds, rinse, repeat).
  // Same body, three personalities; the spawn roll decides which walked in.
  sand_skitterer: {
    id: 'sand_skitterer', name: 'Sand Skitterer',
    color: '#d0b070', shape: 'trapezoid', radius: 11,
    base: { life: 30, moveSpeed: 196, accuracy: 90, evasion: 70, mana: 0 },
    skills: ['claw'],
    xp: 13,
    tag: 'predator',
    faction: 'beast',
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
    color: '#6a7a58', shape: 'kite', radius: 13,
    base: { life: 44, moveSpeed: 200, accuracy: 100, evasion: 70, mana: 0 },
    skills: ['claw'],
    xp: 16,
    tag: 'predator',
    faction: 'beast',
    detection: 1.5,
    adorn: 'ears',
    brain: {
      type: 'basic',
      move: { style: 'lurk', ring: 260, commitRange: 250, unseenArc: 1.6 },
      target: { prey: ['critter'] },
      perception: { memory: 3.5 },
      tempo: { moveFor: [1.4, 2.4], pauseFor: [0.3, 0.7] }, // a cat's patience
    },
  },

  // THE CARRION FLIER: harries, takes wing (leap = airborne + untargetable),
  // lands behind you, and when bloodied flees the fight ON THE WING — all of
  // it rules aiming one data skill. It also stoops on hares.
  dune_vulture: {
    id: 'dune_vulture', name: 'Dune Vulture',
    color: '#b09a80', shape: 'kite', radius: 13,
    base: { life: 38, moveSpeed: 170, accuracy: 95, evasion: 60, mana: 0 },
    skills: ['claw', 'take_wing'],
    xp: 14,
    tag: 'predator',
    faction: 'beast',
    detection: 1.4,
    adorn: 'wings',
    brain: {
      type: 'skirmish', withdraw: 1.2,
      target: { prey: ['critter'] },
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
    color: '#cfe86a', shape: 'star', radius: 10,
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
    color: '#5a4a6a', shape: 'pentagon', radius: 16,
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
      rules: [{ when: { targetLifeBelow: 0.35 }, use: { skillUse: { cadence: [0.08, 0.18] } } }],
    },
  },

  // The finger mage (D2 homage): volleys of slow, LOOSELY-TRACKING motes
  // (spectral_finger's weak cursor guide + wobble) from a held line.
  finger_mage: {
    id: 'finger_mage', name: 'Finger Mage',
    color: '#b8d0a0', shape: 'cross', radius: 12,
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
    },
  },

  // The walking tower (D2 Siege Beast): a lumbering melee engine with a
  // RIDER SLOT on its back — demonkin mount it and cast from the saddle
  // while it romps and mauls. Mobile defense, two health bars deep.
  siege_hulk: {
    id: 'siege_hulk', name: 'Siege Hulk',
    color: '#8a5a3a', shape: 'octagon', radius: 24,
    base: { life: 260, moveSpeed: 95, accuracy: 110, armor: 55, mana: 60, manaRegen: 6 },
    mods: [mod('fireRes', 'flat', 0.4)],
    skills: ['ground_slam', 'heavy_strike'],
    xp: 46,
    faction: 'demon',
    adorn: 'horns',
    detection: 1.0,
    mountSlot: { kinds: ['demonkin'] },
    brain: { type: 'juggernaut', enrage: 0.35 },
  },

  // The fragile teeth (D2 Arreat demonkin): blinks about, and when the
  // fight turns it TAKES COVER — onto a hulk's back (mount) or into a
  // free watchtower slot (garrison), raining fire from whichever perch.
  demonkin_darter: {
    id: 'demonkin_darter', name: 'Demonkin Darter',
    color: '#e07a48', shape: 'triangle', radius: 10,
    base: { life: 22, moveSpeed: 185, evasion: 70, mana: 120, manaRegen: 10 },
    skills: ['firebolt'],
    xp: 16,
    faction: 'demon',
    tag: 'demonkin',
    adorn: 'horns',
    detection: 1.2,
    brain: {
      type: 'skirmish', withdraw: 1.0,
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
    color: '#8ac8e8', shape: 'octagon', radius: 18,
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
    },
  },

  // --- The BROOD CHAIN (D2 spider caves): broodmother lays NESTS, nests
  // hatch spiderlings — three defs and two summon rules; the infestation
  // is emergent, not scripted. All ambient ('predator') wildlife.
  spiderling: {
    id: 'spiderling', name: 'Spiderling',
    color: '#6a5a48', shape: 'cross', radius: 6,
    base: { life: 10, moveSpeed: 195, accuracy: 75, evasion: 50, mana: 0 },
    skills: ['claw'],
    xp: 2,
    tag: 'predator',
    faction: 'beast',
    drops: 0,
    brain: { type: 'swarm', move: { style: 'skitter', dart: [0.25, 0.45], pause: [0.08, 0.2] } },
  },
  spider_nest: {
    id: 'spider_nest', name: 'Spider Nest',
    color: '#9a8a70', shape: 'oval', radius: 14,
    base: { life: 55, moveSpeed: 0, armor: 20, mana: 0 },
    skills: [],
    xp: 8,
    tag: 'predator',
    faction: 'beast',
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
    color: '#7a6a52', shape: 'cross', radius: 17,
    base: { life: 130, moveSpeed: 120, accuracy: 95, armor: 25, mana: 40, manaRegen: 5 },
    mods: [mod('chaosRes', 'flat', 0.4)],
    skills: ['claw'],
    xp: 30,
    tag: 'predator',
    faction: 'beast',
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
    color: '#d8b078', shape: 'kite', radius: 13,
    base: { life: 48, moveSpeed: 180, accuracy: 105, evasion: 65, mana: 60, manaRegen: 6 },
    skills: ['voltspear', 'claw'],
    xp: 20,
    tag: 'predator',
    faction: 'beast',
    adorn: 'ears',
    detection: 1.3,
    scaleVariance: [0.9, 1.15],
    brain: {
      type: 'skirmish', withdraw: 1.3,
      target: { prey: ['critter'] },
      impulses: [{ type: 'swarm', every: [6, 9], duration: [1.2, 1.8] }],
    },
  },

  // --- THE WAYFARERS: neutral HUMANS on the roads — not brigands, not
  // bandits; hunters and pilgrims minding their own way (DORMANT until a
  // wounding hit rouses them: engine dormancy on the 'wayfarer' tag, and
  // they FORGIVE — NEUTRAL_RESET cools a roused wayfarer back down).
  wayfarer_hunter: {
    id: 'wayfarer_hunter', name: 'Wayfarer Hunter',
    color: '#b09868', shape: 'pentagon', radius: 13,
    base: { life: 60, moveSpeed: 150, accuracy: 110, evasion: 40, mana: 40, manaRegen: 4 },
    skills: ['bone_arrow', 'snipe'],
    xp: 18,
    tag: 'wayfarer',
    detection: 1.1,
    brain: {
      type: 'artillery',
      // A living marksman's hand: 55% Perfect! snipes when provoked.
      skillUse: { finesse: { chance: 0.55 } },
      morale: { breakOutnumbered: { deficit: 3, radius: 300 }, rallyAfter: 4 },
    },
  },
  wayfarer_pilgrim: {
    id: 'wayfarer_pilgrim', name: 'Wayfarer Pilgrim',
    color: '#c8b898', shape: 'circle', radius: 12,
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

  // --- Elementals: raw forces wearing a body. Slow to anger — they keep to
  // themselves unless someone (anyone) starts something.

  ember_elemental: {
    id: 'ember_elemental', name: 'Ember Elemental',
    color: '#ff9040', shape: 'rhombus', radius: 13,
    base: { life: 48, moveSpeed: 150, mana: 140, manaRegen: 10 },
    mods: [mod('fireRes', 'flat', 0.75), mod('coldRes', 'flat', -0.3)],
    skills: ['firebolt', 'cinder_swarm'],
    xp: 22,
    brain: { type: 'strafer' },
    faction: 'elemental',
  },

  gale_elemental: {
    id: 'gale_elemental', name: 'Gale Elemental',
    color: '#b8e0d8', shape: 'oval', radius: 12,
    base: { life: 40, moveSpeed: 195, accuracy: 100, evasion: 90, mana: 100, manaRegen: 9 },
    mods: [mod('lightningRes', 'flat', 0.5)],
    skills: ['thunderclap', 'claw'],
    xp: 24,
    brain: { type: 'flanker' },
    faction: 'elemental',
  },

  frost_elemental: {
    id: 'frost_elemental', name: 'Frost Elemental',
    color: '#8ad0e8', shape: 'rhombus', radius: 14,
    base: { life: 56, moveSpeed: 115, mana: 160, manaRegen: 10 },
    mods: [mod('coldRes', 'flat', 0.75), mod('fireRes', 'flat', -0.3)],
    skills: ['ice_spear', 'frostbolt'],
    xp: 26,
    brain: { type: 'artillery' },
    faction: 'elemental',
  },

  stone_sentinel: {
    id: 'stone_sentinel', name: 'Stone Sentinel',
    color: '#9a988a', shape: 'rectangle', radius: 19,
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

  // --- The Sylvan court: wardens of the deep groves. Gnolls burn their
  // trees; the dead offend their soil. The wild beasts they let be.

  sylvan_warden: {
    id: 'sylvan_warden', name: 'Sylvan Warden',
    color: '#68b878', shape: 'rectangle', radius: 17,
    base: { life: 140, moveSpeed: 105, accuracy: 100, armor: 45, mana: 80, manaRegen: 7 },
    mods: [mod('blockChance', 'flat', 0.15)],
    // A third of the wardens drill the lance: shield up, then the poke
    // AROUND the guard (phalanx_thrust's guard-combo — rolled per spawn).
    grants: [{ atLevel: 1, chance: 0.35, skill: 'phalanx_thrust' }],
    skills: ['shield_up', 'cleave'],
    xp: 32,
    brain: { type: 'protector' },
    faction: 'sylvan',
  },

  thorn_sprite: {
    id: 'thorn_sprite', name: 'Thorn Sprite',
    color: '#8ad868', shape: 'kite', radius: 9,
    base: { life: 24, moveSpeed: 185, evasion: 80, mana: 90, manaRegen: 8 },
    mods: [mod('chaosRes', 'flat', 0.4)],
    skills: ['venom_bolt'],
    xp: 16,
    brain: { type: 'strafer' },
    faction: 'sylvan',
  },

  grove_singer: {
    id: 'grove_singer', name: 'Grove Singer',
    color: '#a8e8a0', shape: 'oval', radius: 13,
    base: { life: 70, moveSpeed: 120, mana: 160, manaRegen: 11 },
    skills: ['rallying_howl', 'creeping_ice', 'despair'],
    xp: 30,
    brain: { type: 'commander' },
    faction: 'sylvan',
  },

  briar_beast: {
    id: 'briar_beast', name: 'Briar Beast',
    color: '#588848', shape: 'oval', radius: 26,
    // Rooted, thorny bulk: an explicit poise pool on top of its size-derived
    // weight — poise IS mass (Actor.effectiveWeight), so the beast shrugs
    // shoves until its bar is broken. The per-monster heft dial, as data.
    base: { life: 300, moveSpeed: 75, accuracy: 90, armor: 35, mana: 60, manaRegen: 5, poise: 60 },
    mods: [mod('chaosRes', 'flat', 0.5)],
    skills: ['acid_spray', 'ground_slam'],
    xp: 56,
    brain: { type: 'juggernaut', enrage: 0.35 },
    faction: 'sylvan',
    adorn: 'spikes',
  },

  // --- Wild beasts: no banners, no grudges — just hunger. Pack hunters
  // circle out of reach until the alpha calls the number right.

  fen_hound: {
    id: 'fen_hound', name: 'Fen Hound',
    color: '#988a68', shape: 'kite', radius: 12,
    base: { life: 34, moveSpeed: 180, accuracy: 90, evasion: 50, mana: 0 },
    skills: ['claw'],
    xp: 12,
    brain: { type: 'pack' },
    faction: 'wild',
    adorn: 'ears',
  },

  alpha_stalker: {
    id: 'alpha_stalker', name: 'Alpha Stalker',
    color: '#b8a070', shape: 'oval', radius: 16,
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
    color: '#a0563a', shape: 'rectangle', radius: 34,
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
    color: '#a8743e', shape: 'square', radius: 14,
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
    color: '#8a6a3e', shape: 'circle', radius: 10,
    base: { life: 20, moveSpeed: 0, armor: 0, evasion: 0, mana: 0 },
    skills: [],
    xp: 0,
    passive: true,
    orbDrops: 0.35,
  },

  crate: {
    id: 'crate', name: 'Crate',
    color: '#9a7a4e', shape: 'square', radius: 11,
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
    color: '#5a4426', shape: 'square', radius: 14,
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
    color: '#b08850', shape: 'rectangle', radius: 18,
    base: { life: 20000, lifeRegen: 1500, moveSpeed: 0, armor: 0, evasion: 0, mana: 0 },
    skills: [],
    xp: 0,
    passive: true,
  },

  // Friendly scenery folk: they stand at their posts and cannot be harmed.
  // (Future vendors and questgivers hang off these.)
  townsfolk_smith: {
    id: 'townsfolk_smith', name: 'Brandt the Smith',
    color: '#c89a5e', shape: 'circle', radius: 13,
    base: { life: 100, moveSpeed: 0, mana: 0 },
    skills: [],
    xp: 0,
    passive: true,
    invulnerable: true,
  },

  townsfolk_innkeep: {
    id: 'townsfolk_innkeep', name: 'Mireille the Innkeep',
    color: '#d8b87a', shape: 'circle', radius: 12,
    base: { life: 100, moveSpeed: 0, mana: 0 },
    skills: [],
    xp: 0,
    passive: true,
    invulnerable: true,
  },

  townsfolk_questgiver: {
    id: 'townsfolk_questgiver', name: 'Aldric the Quartermaster',
    color: '#9a86c8', shape: 'circle', radius: 13,
    base: { life: 100, moveSpeed: 0, mana: 0 },
    skills: [],
    xp: 0,
    passive: true,
    invulnerable: true,
  },

  // The Caravanner — scenery folk (name auto-floats via the 'townsfolk' prefix).
  // Stands in town (and waits at each minted caravan destination) to escort the
  // player between level bands. Same passive+invulnerable scenery shape as the others.
  townsfolk_caravanner: {
    id: 'townsfolk_caravanner', name: 'Soraya the Caravanner',
    color: '#c8a06e', shape: 'circle', radius: 13,
    base: { life: 100, moveSpeed: 0, mana: 0 },
    skills: [],
    xp: 0,
    passive: true,
    invulnerable: true,
  },

  // A point of interest, not a foe: crack it open for a guaranteed gem.
  gem_cache: {
    id: 'gem_cache', name: 'Gem Cache',
    color: '#c8a84b', shape: 'square', radius: 13,
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
    color: '#b8904e', shape: 'square', radius: 18,
    base: { life: 130, moveSpeed: 70, armor: 6, evasion: 0, mana: 0 },
    skills: [],
    xp: 0,
    driven: true,
    wardPriority: 3, // protectors post themselves on the cart above all else
  },

  // --- Summonable allies (minions are just monsters on your team) ----------

  flame_sprite: {
    id: 'flame_sprite', name: 'Flame Sprite',
    color: '#ffb05a', shape: 'diamond', radius: 10,
    base: { life: 22, moveSpeed: 170, mana: 999, manaRegen: 20 },
    mods: [mod('fireRes', 'flat', 0.75)],
    skills: ['firebolt'],
    xp: 0,
  },

  stone_golem: {
    id: 'stone_golem', name: 'Stone Golem',
    color: '#a8a090', shape: 'circle', radius: 19,
    base: { life: 130, moveSpeed: 110, accuracy: 95, armor: 50, mana: 40, manaRegen: 4 },
    mods: [mod('damageTaken', 'more', -0.1)],
    skills: ['ground_slam', 'claw'],
    xp: 0,
  },

  // --- Golems: three elements, one shared summon pool ----------------------

  fire_golem: {
    id: 'fire_golem', name: 'Fire Golem',
    color: '#e86a3a', shape: 'circle', radius: 16,
    base: { life: 95, moveSpeed: 130, mana: 200, manaRegen: 10, armor: 20 },
    mods: [mod('fireRes', 'flat', 0.75), mod('damage', 'increased', 0.15, ['fire'])],
    skills: ['firebolt', 'flame_wave'],
    xp: 0,
  },

  ice_golem: {
    id: 'ice_golem', name: 'Ice Golem',
    color: '#7ac8e8', shape: 'circle', radius: 16,
    base: { life: 110, moveSpeed: 120, mana: 200, manaRegen: 10, armor: 30 },
    mods: [mod('coldRes', 'flat', 0.75)],
    skills: ['frostbolt', 'frost_nova'],
    xp: 0,
  },

  blood_golem: {
    id: 'blood_golem', name: 'Blood Golem',
    color: '#b03848', shape: 'circle', radius: 17,
    base: { life: 150, moveSpeed: 125, accuracy: 100, mana: 40, manaRegen: 5 },
    mods: [mod('lifeLeech', 'flat', 0.05), mod('chaosRes', 'flat', 0.4)],
    skills: ['claw', 'heavy_strike'],
    xp: 0,
  },

  // Flame Core: an untouchable mote of fire that shadows its summoner.
  flame_core: {
    id: 'flame_core', name: 'Flame Core',
    color: '#ffc05a', shape: 'octagon', radius: 8,
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
    color: '#b8e8ff', shape: 'diamond', radius: 9,
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
    color: '#ff3a5e', shape: 'pentagon', radius: 10,
    base: { life: 20, moveSpeed: 180, accuracy: 80, mana: 0 },
    mods: [mod('fireRes', 'flat', 0.5)],
    skills: ['claw'], xp: 7, faction: 'demon', adorn: 'horns',
    detection: 1.1, brain: { type: 'swarm' }, // swarm AI adds ×1.4 on top
  },
  hellhound: {
    id: 'hellhound', name: 'Hellhound',
    color: '#e0402a', shape: 'rhombus', radius: 14,
    base: { life: 42, moveSpeed: 200, accuracy: 100, evasion: 55, mana: 0 },
    mods: [mod('fireRes', 'flat', 0.6)],
    skills: ['claw'], xp: 13, faction: 'demon', adorn: 'horns',
    detection: 1.6, brain: { type: 'flanker' },
  },
  cinder_fiend: {
    id: 'cinder_fiend', name: 'Cinder Fiend',
    color: '#ff6a1a', shape: 'octagon', radius: 13,
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
    color: '#ff4040', shape: 'diamond', radius: 11,
    base: { life: 24, moveSpeed: 195, accuracy: 60, mana: 0 },
    mods: [mod('fireRes', 'flat', 0.5)],
    skills: [], xp: 12, faction: 'demon', adorn: 'horns',
    // Explicit burst (the last legacy explodeOnDeath scalar, converted 1:1 to
    // its auto-map). A fast bomber could tune coalesce down to ~0.35.
    detection: 1.0, deathBurst: { mode: 'implode', damageFrac: 1.4, coalesce: 0.8 },
    brain: { type: 'bomber', fuseRange: 56, fuseTime: 0.6 },
  },
  dread_fiend: {
    id: 'dread_fiend', name: 'Dread Fiend',
    color: '#b81e3a', shape: 'star', radius: 16,
    base: { life: 92, moveSpeed: 160, accuracy: 110, mana: 40, manaRegen: 5 },
    mods: [mod('fireRes', 'flat', 0.5), mod('chaosRes', 'flat', 0.3)],
    skills: ['heavy_strike', 'infernal_rift'], xp: 28, faction: 'demon', adorn: 'wings',
    detection: 1.4, brain: { type: 'assassin', withdraw: 0.7 },
  },
  // The Legion's champion (WARLORD_OF.demon) and the infernal_rift zone boss.
  balor_warlord: {
    id: 'balor_warlord', name: 'Balor, the Rift-Tyrant',
    color: '#ff2a2a', shape: 'star', radius: 28,
    base: { life: 480, moveSpeed: 135, accuracy: 130, mana: 240, manaRegen: 12 },
    mods: [mod('fireRes', 'flat', 0.65), mod('chaosRes', 'flat', 0.4),
      mod('damage', 'increased', 0.35)],
    skills: ['infernal_rift', 'ground_slam', 'meteor_storm', 'war_cry'],
    xp: 160, boss: true, faction: 'demon', adorn: 'wings',
    detection: 1.4, brain: { type: 'juggernaut', enrage: 0.4 },
  },

  // --- BREACH: rift-spawn that pour from tears in reality. A NET-NEW faction
  //     grafted in by the Breach content package's faction generator (the def
  //     lists these ids; registerFactions wires the roster/traits/warlord). ---
  breach_spawn: {
    id: 'breach_spawn', name: 'Breach Spawn',
    color: '#9a3ad8', shape: 'pentagon', radius: 11,
    base: { life: 30, moveSpeed: 195, accuracy: 85, mana: 0 },
    mods: [mod('chaosRes', 'flat', 0.5)],
    skills: ['claw'], xp: 11, faction: 'breach', adorn: 'spikes',
    detection: 1.2, brain: { type: 'swarm' },
  },
  breach_horror: {
    id: 'breach_horror', name: 'Breach Horror',
    color: '#7a2ad0', shape: 'octagon', radius: 15,
    base: { life: 70, moveSpeed: 140, mana: 120, manaRegen: 8 },
    mods: [mod('chaosRes', 'flat', 0.6), mod('coldRes', 'flat', 0.3)],
    skills: ['firebolt', 'infernal_rift'], xp: 24, faction: 'breach', adorn: 'wings',
    detection: 1.3, brain: { type: 'strafer' },
  },
  breach_lord: {
    id: 'breach_lord', name: 'Xal, the Riftmaw',
    color: '#b04ae8', shape: 'star', radius: 27,
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
    color: '#d8b040', shape: 'hexagon', radius: 14,
    base: { life: 78, moveSpeed: 120, accuracy: 100, armor: 35, mana: 40, manaRegen: 5 },
    mods: [mod('fireRes', 'flat', 0.25)],
    skills: ['heavy_strike'], xp: 18, faction: 'crusade',
  },
  crusade_zealot: {
    id: 'crusade_zealot', name: 'Crusade Zealot',
    color: '#e8c860', shape: 'pentagon', radius: 11,
    base: { life: 40, moveSpeed: 185, accuracy: 90, mana: 0 },
    skills: ['claw'], xp: 13, faction: 'crusade',
    detection: 1.2, brain: { type: 'swarm' },
  },
  crusade_arbalest: {
    id: 'crusade_arbalest', name: 'Crusade Arbalest',
    color: '#c8a850', shape: 'diamond', radius: 12,
    base: { life: 46, moveSpeed: 130, mana: 100, manaRegen: 8 },
    mods: [mod('fireRes', 'flat', 0.2)],
    skills: ['firebolt'], xp: 17, faction: 'crusade',
    detection: 1.25, brain: { type: 'strafer' },
  },
  crusade_standard_bearer: {
    id: 'crusade_standard_bearer', name: 'Crusade Standard-Bearer',
    color: '#f0d878', shape: 'cross', radius: 15,
    base: { life: 120, moveSpeed: 115, accuracy: 105, armor: 30, mana: 110, manaRegen: 8 },
    mods: [mod('fireRes', 'flat', 0.3)],
    skills: ['rallying_howl', 'war_cry', 'heavy_strike'], xp: 40, faction: 'crusade',
    brain: { type: 'commander' },
  },
  crusade_templar: {
    id: 'crusade_templar', name: 'Crusade Templar',
    color: '#cfa830', shape: 'trapezoid', radius: 18,
    base: { life: 165, moveSpeed: 110, accuracy: 110, armor: 55, mana: 80, manaRegen: 6 },
    mods: [mod('fireRes', 'flat', 0.35), mod('coldRes', 'flat', 0.2)],
    skills: ['ground_slam', 'heavy_strike'], xp: 30, faction: 'crusade',
    brain: { type: 'flanker' },
  },
  crusade_marshal: {
    id: 'crusade_marshal', name: 'the Crusade Marshal',
    color: '#ffe070', shape: 'star', radius: 27,
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
    color: '#8a4ae0', shape: 'triangle', radius: 10,
    base: { life: 34, moveSpeed: 200, accuracy: 90, mana: 0 },
    skills: ['claw'], xp: 12, faction: 'abyssal',
    detection: 1.35, brain: { type: 'swarm' },
  },
  abyssal_wretch: {
    id: 'abyssal_wretch', name: 'Abyssal Wretch',
    color: '#6a3ad0', shape: 'pentagon', radius: 13,
    base: { life: 86, moveSpeed: 118, accuracy: 100, armor: 30 },
    mods: [mod('coldRes', 'flat', 0.25)],
    skills: ['heavy_strike'], xp: 17, faction: 'abyssal',
  },
  // AI-PACKAGE SHOWCASE #1 — a strafing caster that INTERMITTENTLY rushes in like
  // a swarmer (a periodic archetype impulse), the user's "strafe, then charge".
  abyssal_seer: {
    id: 'abyssal_seer', name: 'Abyssal Seer',
    color: '#a86adf', shape: 'diamond', radius: 12,
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
    color: '#7038b8', shape: 'trapezoid', radius: 18,
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
    color: '#9a4ad0', shape: 'hexagon', radius: 15,
    base: { life: 132, moveSpeed: 132, accuracy: 110, armor: 40 },
    mods: [mod('coldRes', 'flat', 0.25)],
    skills: ['cleave'], xp: 26, faction: 'abyssal',
    detection: 1.15, brain: { type: 'flanker' },
  },
  // The faction apex (its "warlord" for registry completeness — Fractures don't
  // crown warlords, but a Crowned promotion can elevate it inside a chasm).
  abyssal_horror: {
    id: 'abyssal_horror', name: 'the Abyssal Horror',
    color: '#b06aff', shape: 'star', radius: 26,
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
    color: '#a040e0', shape: 'star', radius: 31,
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
    color: '#50c0ff', shape: 'octagon', radius: 28,
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
    color: '#ff5a2a', shape: 'star', radius: 31,
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
    color: '#c050d0', shape: 'star', radius: 34,
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
    color: '#9a8890', shape: 'pentagon', radius: 18,
    base: { life: 190, moveSpeed: 122, accuracy: 125, armor: 36 },
    skills: ['ground_slam', 'cleave'],
    xp: 26, faction: 'demon', adorn: 'horns',
    brain: { type: 'juggernaut' },
  },
  lesser_conjurer: {
    id: 'lesser_conjurer', name: 'Echo of the Drowned',
    color: '#5aa8d8', shape: 'octagon', radius: 16,
    base: { life: 135, moveSpeed: 128, accuracy: 122, mana: 90, manaRegen: 9 },
    mods: [mod('coldRes', 'flat', 0.4)],
    skills: ['frostbolt', 'frost_nova'],
    xp: 26, faction: 'demon',
    brain: { type: 'strafer' },
  },
  lesser_herald: {
    id: 'lesser_herald', name: 'Echo of the Brimstone',
    color: '#e0703a', shape: 'octagon', radius: 16,
    base: { life: 135, moveSpeed: 118, accuracy: 122, mana: 130, manaRegen: 11 },
    mods: [mod('fireRes', 'flat', 0.4)],
    skills: ['firebolt', 'meteor_storm'],
    xp: 26, faction: 'demon', adorn: 'wings',
    brain: { type: 'artillery' },
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

/** Faction rosters — what each side fields when a war zone spawns them. */
export const FACTIONS: Record<string, { name: string; table: { id: string; weight: number }[] }> = {
  goblin: {
    name: 'the Goblin Warband',
    table: [
      { id: 'goblin_skirmisher', weight: 3 },
      { id: 'goblin_brute', weight: 2 },
      { id: 'goblin_shaman', weight: 2 },
      { id: 'orc_ravager', weight: 2 },
      { id: 'troll_mauler', weight: 1 },
      { id: 'goblin_chief', weight: 1 },
    ],
  },
  undead: {
    name: 'the Risen Host',
    table: [
      { id: 'zombie', weight: 3 },
      { id: 'skeleton_warrior', weight: 3 },
      { id: 'skeleton_archer', weight: 2 },
      { id: 'crypt_warden', weight: 1 },
      { id: 'bone_serpent', weight: 1 },
      { id: 'lich_marshal', weight: 1 },
      { id: 'gloam', weight: 1 },
      { id: 'oblivion_knight', weight: 1 },
    ],
  },
  gnoll: {
    name: 'the Gnoll Packs',
    table: [
      { id: 'gnoll_prowler', weight: 4 },
      { id: 'gnoll_butcher', weight: 2 },
      { id: 'gnoll_longshot', weight: 2 },
      { id: 'gnoll_howler', weight: 1 },
    ],
  },
  elemental: {
    name: 'the Unbound Elements',
    table: [
      { id: 'ember_elemental', weight: 3 },
      { id: 'gale_elemental', weight: 3 },
      { id: 'frost_elemental', weight: 2 },
      { id: 'stone_sentinel', weight: 1 },
    ],
  },
  sylvan: {
    name: 'the Sylvan Court',
    table: [
      { id: 'thorn_sprite', weight: 4 },
      { id: 'sylvan_warden', weight: 2 },
      { id: 'grove_singer', weight: 1 },
      { id: 'briar_beast', weight: 1 },
    ],
  },
  wild: {
    name: 'the Wilds',
    table: [
      { id: 'fen_hound', weight: 4 },
      { id: 'blood_mite', weight: 3 },
      { id: 'dune_stalker', weight: 2 },
      { id: 'spitting_horror', weight: 2 },
      { id: 'alpha_stalker', weight: 1 },
    ],
  },
  demon: {
    name: 'the Infernal Legion',
    table: [
      { id: 'imp', weight: 3 },
      { id: 'hellhound', weight: 3 },
      { id: 'cinder_fiend', weight: 2 },
      { id: 'searing_spawn', weight: 2 },
      { id: 'dread_fiend', weight: 1 },
      { id: 'balor_warlord', weight: 1 },
      // The siege line: fragile darters that blink, then take cover on a
      // hulk's back or in a tower crown — a garrison worth breaking up.
      { id: 'finger_mage', weight: 2 },
      { id: 'demonkin_darter', weight: 2 },
      { id: 'siege_hulk', weight: 1 },
    ],
  },
  deep: {
    name: 'the Deep',
    table: [
      { id: 'deep_thresher', weight: 4 },
      { id: 'deep_angler', weight: 3 },
      { id: 'deep_tidecaller', weight: 2 },
      { id: 'deep_leviathan', weight: 1 },
    ],
  },
};

/** Spawn weights per wave tier — which monsters appear as waves escalate. */
export const WAVE_TABLE: { minWave: number; ids: string[] }[] = [
  { minWave: 1, ids: ['zombie', 'skeleton_warrior'] },
  { minWave: 2, ids: ['skeleton_archer', 'blood_mite'] },
  { minWave: 3, ids: ['fire_cultist', 'storm_acolyte'] },
  { minWave: 4, ids: ['frost_witch', 'spitting_horror', 'dune_stalker', 'pyre_acolyte'] },
  { minWave: 5, ids: ['brute', 'hex_weaver', 'voltaic_shade'] },
  { minWave: 6, ids: ['volatile_zealot', 'gloom_stalker', 'crypt_warden', 'wraith_piper'] },
  { minWave: 7, ids: ['warband_chieftain', 'bone_serpent'] },
  { minWave: 8, ids: ['bone_colossus', 'javelin_skirmisher'] },
];

/** Every 5th wave spawns this boss alongside the pack. */
export const BOSS_ID = 'pit_lord';
