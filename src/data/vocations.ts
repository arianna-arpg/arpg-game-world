// ---------------------------------------------------------------------------
// VOCATIONS — class specializations earned through quest chains (DATA).
//
// A Vocation is the PoE-Ascendancy shape rebuilt on this game's registries:
//   • Each VocationDef carries a MINI PASSIVE TREE authored in LOCAL coords
//     around (0,0); passives.ts offsets it into the EMPTY CENTER of the
//     nine-point attribute star and merges the nodes into PASSIVE_NODES /
//     PASSIVE_ADJACENCY. Only the vocations a character has EARNED render.
//   • Nodes spend VOCATION POINTS (PlayerMeta.vocationPoints, a separate
//     currency earned from the vocation's quest steps), never normal points.
//   • Each VocationDef carries a QUEST CHAIN (class-thematic steps built on
//     the ordinary QuestDef machinery — src/quests/vocations.ts generates the
//     entries). Completing the FINAL step grants the vocation to the character
//     AND writes an ACCOUNT ledger key, so every FUTURE character — of ANY
//     class — may pick up that vocation's chain from the quartermaster.
//   • Availability rule: a character is offered the chains of (a) its OWN
//     class's vocation and (b) every account-unlocked vocation, capped at
//     VOCATION_CFG.maxPerCharacter granted vocations per character.
//   • THE GATE (playtest toggle): with `requireGateNode` on, vocation points
//     can only be SPENT once the vocation's home-class starting node is
//     allocated (a Summoner running the Warbringer vocation must path to the
//     Way of Strength first; a Warrior has it from birth). Toggle it off and
//     a granted vocation is spendable immediately. Live-flippable (the dev
//     panel exposes it) — the checks read this object every time.
//
// Adding a vocation = ONE VocationDef entry here. No engine changes: trees
// merge automatically, quests generate automatically, the menu/journal/map
// pick them up through the ordinary registries.
//
// Node powers are ordinary Modifiers — the full stat engine is available:
// `more` multipliers, tag-filtered apply_<status> chances, proc_<id> grants,
// linkMod siphons, minionApply_<status> carries (minions inherit the chance
// at summon), conditional mods ('moving', 'lowLife', …). See each tree below
// for exemplars of the intended variety.
// ---------------------------------------------------------------------------

import { mod, type Attributes, type Modifier } from '../engine/stats';
import type { QuestZoneSpec } from '../quests/types';

/** Tunables for the whole vocation system — data, not constants baked into
 *  engine code. `requireGateNode` is THE playtest toggle (see header). */
export const VOCATION_CFG = {
  /** Character level the quartermaster starts offering vocation chains at. */
  offerAtLevel: 30,
  /** Vocation points a quest step pays when the step doesn't override it. */
  pointsPerStep: 2,
  /** Spending gate: vocation points require the vocation's home-class START
   *  NODE allocated. Flip false to let a granted vocation spend immediately
   *  (the simpler-to-intuit variant — playtest both). Read LIVE on every
   *  allocation check, so it can be toggled mid-run (dev panel). */
  requireGateNode: true,
  /** Granted vocations per character (PoE: one ascendancy per character). */
  maxPerCharacter: 1,
  /** Authoring guard: local tree coords must fit within this radius so the
   *  tree stays inside the star's empty centre (starts sit at r≈510). */
  treeRadius: 430,
  /** Monster defId of the NPC that offers vocation chains. */
  giver: 'townsfolk_questgiver',
  /** Coming within this range of a SECRET vocation's site NPC reveals the
   *  calling (the discovery run-ledger key + flavor line). */
  discoveryRadius: 150,
};

/** Which zones may host a secret vocation's site. Axes are ANDed; within an
 *  axis, any listed id matches. Every axis optional — an empty filter matches
 *  any combat zone at/above minLevel. */
export interface VocationSiteFilter {
  /** ZoneDef.biome ids (e.g. 'grove'). */
  biomes?: string[];
  /** Match any biome whose BIOMES patronFaction is listed — "a sylvan-patron
   *  forest" without enumerating biome ids. */
  patronFactions?: string[];
  /** Match zones the LIVE territory sim says these factions currently hold
   *  (sim.faction.owner) — sites that move with the war. */
  controllingFactions?: string[];
  /** ZoneDef.layoutType ids. */
  layouts?: string[];
  /** Minimum zone level. */
  minLevel?: number;
  /** THE HARBORHOLD AXIS (data/harborholds.ts): only port-town zones — true
   *  = any hold, or exactly the named state ('open' = a standing town: the
   *  Harborwarden's Mooring Stone waits on won ground). Composable with
   *  every other axis like the rest. */
  harborhold?: true | 'besieged' | 'open' | 'fallen';
}

/** A SECRET vocation (the PoE2 Abyssal-Lich shape): never offered in town
 *  until earned — its chain is DISCOVERED at a site that seeds itself into
 *  qualifying zones (deterministically per zone + run seed). */
export interface SecretVocationSpec {
  site: {
    /** The site's giver NPC (a passive, invulnerable spirit — monsters.ts). */
    npc: string;
    /** Zones that may host the site. */
    filter: VocationSiteFilter;
    /** Seeded per-zone chance a qualifying zone hosts the site. */
    chance: number;
    /** Shrine dressing grown around the NPC at spawn (visual, per-load). */
    doodads?: { kind: string; count: number; radius: number; size: [number, number] }[];
  };
  /** Pre-unlock, only the HOME CLASS receives the calling (default true) —
   *  a Warrior finding the heartwood hears nothing. */
  classLockedDiscovery?: boolean;
  /** Once the ACCOUNT has unlocked it: 'menu' (default) = future characters
   *  are offered it by the quartermaster like any vocation; 'site' = it must
   *  still be FOUND in the world every run (the purist variant). */
  unlockedOffer?: 'menu' | 'site';
  /** Flavor line the choice menu leads with when this calling is offered at
   *  its site (replaces the quartermaster's patter). */
  offerFlavor?: string;
  /** Flavor line shown once on discovery. */
  discoveryText?: string;
}

/** One node of a vocation's mini-tree, in LOCAL coordinates around (0,0).
 *  The root node is generated (id 'root', free, allocated on grant) — authored
 *  nodes link to 'root' or to each other by LOCAL id; the builder namespaces
 *  everything to `voc_<vocationId>_<localId>`. */
export interface VocationNodeDef {
  id: string;
  name: string;
  description: string;
  kind: 'small' | 'notable' | 'keystone';
  x: number;
  y: number;
  attributes?: Partial<Attributes>;
  mods?: Modifier[];
  links: string[];
}

/** One step of a vocation's quest chain. Steps run strictly in order (step
 *  N+1 gates on step N's RUN-ledger key — chain progress is per-character;
 *  only the final COMPLETION is account-wide). The zone spec is the full
 *  QuestZoneSpec vocabulary: floating find-its, wave holds, spawner hunts,
 *  promoted bosses, special arenas — all of it. */
export interface VocationQuestStep {
  offerLabel: string;
  zone: QuestZoneSpec;
  xp?: number;
  gems?: number;
  /** Vocation points this step pays (default VOCATION_CFG.pointsPerStep). */
  vocationPoints?: number;
  /** Return-to-giver bulletin once the field objective clears. */
  turnInPrompt?: string;
  /** A ledger key (run OR account — the QuestDef.requiresLedger contract)
   *  this step additionally gates on. The Harborwarden's chain opens only
   *  for those who have BROKEN A SIEGE (ports_defended) — deeds, not walks. */
  requiresLedger?: string;
}

export interface VocationDef {
  id: string;
  /** The title — shown on the tree root, the char sheet, and the choice menu. */
  name: string;
  blurb: string;
  color: string;
  /** The home class (ClassDef.id): its players are always offered this chain,
   *  and its START NODE is the spending gate (when requireGateNode is on). */
  classId: string;
  /** Override the spending-gate node (defaults to the home class's startNode). */
  gateNode?: string;
  /** A SECRET vocation: hidden until its site is discovered in the world —
   *  see SecretVocationSpec. Absent = an ordinary quartermaster chain. */
  secret?: SecretVocationSpec;
  tree: VocationNodeDef[];
  quest: {
    /** Character level the chain surfaces at (default VOCATION_CFG.offerAtLevel). */
    offerAtLevel?: number;
    steps: VocationQuestStep[];
  };
}

// --- authoring helpers -------------------------------------------------------

/** Polar → local xy (screen coords: 0° = east, 90° = south/down). Keeps the
 *  authored trees readable — a node is "at 250° out at radius 260", not a
 *  pair of magic numbers. */
function p(angleDeg: number, r: number): { x: number; y: number } {
  const a = (angleDeg * Math.PI) / 180;
  return { x: Math.round(Math.cos(a) * r), y: Math.round(Math.sin(a) * r) };
}

/** The shared v1 skeleton: a root-anchored fan aimed down the vocation's
 *  SPINE angle (each tree points toward its gate start node, so the layout
 *  itself says "this belongs to that starting point"). Authored trees are
 *  free to abandon the template — it's positions and links, nothing more. */
function fan(spine: number): Record<string, { x: number; y: number }> {
  return {
    s1: p(spine - 40, 130), s2: p(spine + 40, 130), s3: p(spine, 150),
    n1: p(spine - 65, 260), n2: p(spine - 22, 265),
    n3: p(spine + 22, 265), n4: p(spine + 65, 260),
    k1: p(spine, 330),
  };
}

// --- the vocations -----------------------------------------------------------

const WARBRINGER_LAYOUT = fan(90); // spine points at str_start (south)
const WARBRINGER: VocationDef = {
  id: 'warbringer', name: 'Warbringer',
  blurb: 'The line breaks where you strike it. Warcries, shattered guards, and momentum that cannot be answered.',
  color: '#d8734a',
  classId: 'warrior',
  tree: [
    { id: 's1', name: 'Drillmaster', description: '15% increased melee damage; 20% increased poise damage', kind: 'small', ...WARBRINGER_LAYOUT.s1, mods: [mod('damage', 'increased', 0.15, ['melee']), mod('poiseDamage', 'increased', 0.2)], links: ['root'] },
    { id: 's2', name: 'Iron Constitution', description: '+30 maximum life; 15% increased armor', kind: 'small', ...WARBRINGER_LAYOUT.s2, mods: [mod('life', 'flat', 30), mod('armor', 'increased', 0.15)], links: ['root'] },
    { id: 's3', name: 'Battle Fury', description: '10% increased attack speed', kind: 'small', ...WARBRINGER_LAYOUT.s3, mods: [mod('attackSpeed', 'increased', 0.1)], links: ['root'] },
    { id: 'n1', name: 'Breaker of Lines', description: 'Melee hits deal 12% more damage and have 15% chance to Sunder', kind: 'notable', ...WARBRINGER_LAYOUT.n1, mods: [mod('damage', 'more', 0.12, ['melee']), mod('apply_sundered', 'flat', 0.15, ['melee'])], links: ['s1'] },
    { id: 'n2', name: "Warlord's Voice", description: 'Gain Battle Chorus (kills rally you); 10% increased damage', kind: 'notable', ...WARBRINGER_LAYOUT.n2, mods: [mod('proc_battle_chorus', 'flat', 1), mod('damage', 'increased', 0.1)], links: ['s1', 's3'] },
    { id: 'n3', name: 'Tide of Iron', description: '+40 knockback strength; 8% increased movement speed; 25% increased stagger window', kind: 'notable', ...WARBRINGER_LAYOUT.n3, mods: [mod('knockback', 'flat', 40), mod('moveSpeed', 'increased', 0.08), mod('staggerWindow', 'increased', 0.25)], links: ['s3', 's2'] },
    { id: 'n4', name: 'Red Harvest', description: '3% of melee damage leeched as life; 10% increased melee attack speed', kind: 'notable', ...WARBRINGER_LAYOUT.n4, mods: [mod('lifeLeech', 'flat', 0.03, ['melee']), mod('attackSpeed', 'increased', 0.1, ['melee'])], links: ['s2'] },
    { id: 'k1', name: 'Avatar of War', description: 'While moving: 20% more melee damage. Melee hits have 20% chance to apply Vulnerable', kind: 'keystone', ...WARBRINGER_LAYOUT.k1, mods: [mod('damage', 'more', 0.2, ['melee'], 'moving'), mod('apply_vulnerable', 'flat', 0.2, ['melee'])], links: ['n2', 'n3'] },
  ],
  quest: {
    steps: [
      {
        offerLabel: 'Break the warband mustering in the mountains',
        zone: {
          tileset: 'highland', direction: 'w', distance: 1, level: 'character',
          objective: { kind: 'clear' },
          packsOverride: {
            count: [6, 8], size: [3, 5], table: [
              { id: 'goblin_skirmisher', weight: 3 }, { id: 'goblin_brute', weight: 2 },
              { id: 'orc_ravager', weight: 2 }, { id: 'troll_mauler', weight: 1 },
            ],
          },
          forceWaypoint: true,
        },
        xp: 800, gems: 3,
        turnInPrompt: 'The muster is broken — return to the quartermaster.',
      },
      {
        offerLabel: 'Hold the wasteland line against the horde',
        zone: {
          tileset: 'wasteland', direction: 'w', distance: 2, level: 'character',
          objective: { kind: 'waves', waves: 4 },
          packsOverride: {
            count: [5, 7], size: [3, 5], table: [
              { id: 'orc_ravager', weight: 3 }, { id: 'gnoll_butcher', weight: 2 },
              { id: 'goblin_chief', weight: 1 }, { id: 'troll_mauler', weight: 1 },
            ],
          },
          forceWaypoint: true,
        },
        xp: 1200, gems: 4,
        turnInPrompt: 'The line held — return to the quartermaster.',
      },
      {
        offerLabel: 'Slay the Crowned Chieftain of the warbands',
        zone: {
          tileset: 'highland', direction: 'w', distance: 2, level: 'character',
          objective: { kind: 'boss', id: 'warband_chieftain', levelBonus: 1, promote: { rarity: 'crowned' } },
          packsOverride: {
            count: [5, 7], size: [3, 4], table: [
              { id: 'orc_ravager', weight: 3 }, { id: 'goblin_brute', weight: 2 },
              { id: 'goblin_chief', weight: 1 }, { id: 'troll_mauler', weight: 1 },
            ],
          },
          forceWaypoint: true,
          floating: true, // hunt him down — explore toward the "?" until a road forms
        },
        xp: 2000, gems: 6,
        turnInPrompt: 'The warlord has fallen — return and take up the mantle of the Warbringer.',
      },
    ],
  },
};

const GRAVEBINDER_LAYOUT = fan(210); // spine points at wis_start (up-left)
const GRAVEBINDER: VocationDef = {
  id: 'gravebinder', name: 'Gravebinder',
  blurb: 'The dead do not rest — they serve. Legions that endure, envenom, and refuse the second death.',
  color: '#9a5ad8',
  classId: 'summoner',
  tree: [
    { id: 's1', name: 'Bonecall', description: '20% increased minion damage', kind: 'small', ...GRAVEBINDER_LAYOUT.s1, mods: [mod('minionDamage', 'increased', 0.2)], links: ['root'] },
    { id: 's2', name: 'Grave-Mender', description: 'Minions regenerate 2% of their life per second', kind: 'small', ...GRAVEBINDER_LAYOUT.s2, mods: [mod('minionRegenPct', 'flat', 0.02)], links: ['root'] },
    { id: 's3', name: 'Restless Dead', description: '15% increased minion movement speed', kind: 'small', ...GRAVEBINDER_LAYOUT.s3, mods: [mod('minionMoveSpeed', 'increased', 0.15)], links: ['root'] },
    { id: 'n1', name: 'Legion Eternal', description: '+1 maximum minion; 25% increased minion life', kind: 'notable', ...GRAVEBINDER_LAYOUT.n1, mods: [mod('minionMaxCount', 'flat', 1), mod('minionLife', 'increased', 0.25)], links: ['s1'] },
    { id: 'n2', name: 'Undying Covenant', description: 'ALL your minion skills gain Undying Loyalty — slain minions fight on for 3 more seconds (stacks with the gem)', kind: 'notable', ...GRAVEBINDER_LAYOUT.n2, mods: [mod('minionUndying', 'flat', 3, ['minion'])], links: ['s1', 's3'] },
    { id: 'n3', name: 'Venom Communion', description: 'Minions have 25% chance to Poison on hit', kind: 'notable', ...GRAVEBINDER_LAYOUT.n3, mods: [mod('minionApply_poison', 'flat', 0.25)], links: ['s3', 's2'] },
    { id: 'n4', name: 'Phantasmal Retinue', description: 'Gain Phantasm — your hits, and your minions’ hits, conjure raging phantasms', kind: 'notable', ...GRAVEBINDER_LAYOUT.n4, mods: [mod('proc_summon_phantasm', 'flat', 1)], links: ['s2'] },
    { id: 'k1', name: 'Deathless Court', description: '20% more minion damage; 20% more minion life', kind: 'keystone', ...GRAVEBINDER_LAYOUT.k1, mods: [mod('minionDamage', 'more', 0.2), mod('minionLife', 'more', 0.2)], links: ['n2', 'n3'] },
  ],
  quest: {
    steps: [
      {
        offerLabel: 'Still the risen dead beneath the crypts',
        zone: {
          tileset: 'crypt', direction: 's', distance: 1, level: 'character',
          objective: { kind: 'clear' },
          packsOverride: {
            count: [6, 8], size: [3, 5], table: [
              { id: 'zombie', weight: 3 }, { id: 'skeleton_warrior', weight: 3 },
              { id: 'skeleton_archer', weight: 2 }, { id: 'crypt_warden', weight: 1 },
            ],
          },
          forceWaypoint: true,
        },
        xp: 800, gems: 3,
        turnInPrompt: 'The dead lie still — return to the quartermaster.',
      },
      {
        offerLabel: 'Shatter the bone altars that call the dead',
        zone: {
          tileset: 'crypt', direction: 's', distance: 2, level: 'character',
          objective: { kind: 'spawners', spawnerId: 'bone_altar', count: [3, 4] },
          packsOverride: {
            count: [4, 6], size: [3, 4], table: [
              { id: 'skeletal_cleric', weight: 2 }, { id: 'blade_wraith', weight: 2 },
              { id: 'bone_serpent', weight: 1 }, { id: 'zombie', weight: 2 },
            ],
          },
          forceWaypoint: true,
        },
        xp: 1200, gems: 4,
        turnInPrompt: 'The altars are dust — return to the quartermaster.',
      },
      {
        offerLabel: 'Bind the Gravecaller to your will',
        zone: {
          tileset: 'crypt', direction: 's', distance: 2, level: 'character',
          objective: { kind: 'boss', id: 'gravecaller', levelBonus: 1 },
          forceWaypoint: true,
          floating: true,
        },
        xp: 2000, gems: 6,
        turnInPrompt: 'The Gravecaller kneels — return and take up the mantle of the Gravebinder.',
      },
    ],
  },
};

const WILDSTALKER_LAYOUT = fan(330); // spine points at dex_start (up-right)
const WILDSTALKER: VocationDef = {
  id: 'wildstalker', name: 'Wildstalker',
  blurb: 'Every wound is a trail and every trail ends the same way. Twin shafts, torn arteries, the kill on the move.',
  color: '#6ac860',
  classId: 'ranger',
  tree: [
    { id: 's1', name: "Fletcher's Eye", description: '15% increased projectile damage', kind: 'small', ...WILDSTALKER_LAYOUT.s1, mods: [mod('damage', 'increased', 0.15, ['projectile'])], links: ['root'] },
    { id: 's2', name: 'Light Step', description: '6% increased movement speed; 15% increased evasion', kind: 'small', ...WILDSTALKER_LAYOUT.s2, mods: [mod('moveSpeed', 'increased', 0.06), mod('evasion', 'increased', 0.15)], links: ['root'] },
    { id: 's3', name: 'Quick Quiver', description: '8% increased attack speed', kind: 'small', ...WILDSTALKER_LAYOUT.s3, mods: [mod('attackSpeed', 'increased', 0.08)], links: ['root'] },
    { id: 'n1', name: 'Twinned Shafts', description: '25% chance to fire an additional projectile', kind: 'notable', ...WILDSTALKER_LAYOUT.n1, mods: [mod('projectileCountChance', 'flat', 0.25)], links: ['s1'] },
    { id: 'n2', name: 'Serrated Broadheads', description: 'Projectiles have 25% chance to Bleed; 20% increased projectile ailment magnitude', kind: 'notable', ...WILDSTALKER_LAYOUT.n2, mods: [mod('apply_bleed', 'flat', 0.25, ['projectile']), mod('statusMagnitude', 'increased', 0.2, ['projectile'])], links: ['s1', 's3'] },
    { id: 'n3', name: "Predator's Pace", description: 'While moving: 20% increased projectile damage', kind: 'notable', ...WILDSTALKER_LAYOUT.n3, mods: [mod('damage', 'increased', 0.2, ['projectile'], 'moving')], links: ['s3', 's2'] },
    { id: 'n4', name: 'Deadeye', description: '25% increased projectile speed; +10% projectile critical strike chance', kind: 'notable', ...WILDSTALKER_LAYOUT.n4, mods: [mod('projectileSpeed', 'increased', 0.25), mod('critChance', 'flat', 0.1, ['projectile'])], links: ['s2'] },
    { id: 'k1', name: 'Apex Predator', description: '6% increased damage per Bleed stack on the target; 15% more projectile damage', kind: 'keystone', ...WILDSTALKER_LAYOUT.k1, mods: [mod('damageVs_bleed', 'flat', 0.06), mod('damage', 'more', 0.15, ['projectile'])], links: ['n2', 'n3'] },
  ],
  quest: {
    steps: [
      {
        offerLabel: 'Cull the predators of the deepwood',
        zone: {
          tileset: 'deepwood', direction: 'n', distance: 1, level: 'character',
          objective: { kind: 'clear' },
          packsOverride: {
            count: [6, 8], size: [3, 5], table: [
              { id: 'plains_wolf', weight: 3 }, { id: 'thicket_stalker', weight: 2 },
              { id: 'fen_hound', weight: 2 }, { id: 'alpha_stalker', weight: 1 },
            ],
          },
          forceWaypoint: true,
        },
        xp: 800, gems: 3,
        turnInPrompt: 'The wood is thinned — return to the quartermaster.',
      },
      {
        offerLabel: 'Track the quarry through the jungle',
        zone: {
          tileset: 'jungle', direction: 'n', distance: 2, level: 'character',
          objective: { kind: 'escape', interval: [4, 7] },
          packsOverride: {
            count: [5, 7], size: [3, 5], table: [
              { id: 'spiderling', weight: 3 }, { id: 'briar_beast', weight: 2 },
              { id: 'thicket_stalker', weight: 2 }, { id: 'broodmother', weight: 1 },
            ],
          },
          forceWaypoint: true,
        },
        xp: 1200, gems: 4,
        turnInPrompt: 'The trail is yours now — return to the quartermaster.',
      },
      {
        offerLabel: 'Bring down the Gorehorn Behemoth',
        zone: {
          tileset: 'deepwood', direction: 'n', distance: 2, level: 'character',
          objective: { kind: 'boss', id: 'wilds_behemoth', levelBonus: 1 },
          forceWaypoint: true,
          floating: true,
        },
        xp: 2000, gems: 6,
        turnInPrompt: 'The Gorehorn is down — return and take up the mantle of the Wildstalker.',
      },
    ],
  },
};

const ARCHMAGE_LAYOUT = fan(170); // spine points at int_start (west, slightly down)
const ARCHMAGE: VocationDef = {
  id: 'archmage', name: 'Archmage',
  blurb: 'Power is a current; you are the conduit. Deeper wells, harsher storms, and a decree the elements obey.',
  color: '#7a9aff',
  classId: 'magician',
  tree: [
    { id: 's1', name: 'Arcane Attunement', description: '15% increased spell damage', kind: 'small', ...ARCHMAGE_LAYOUT.s1, mods: [mod('damage', 'increased', 0.15, ['spell'])], links: ['root'] },
    { id: 's2', name: 'Deep Well', description: '15% increased maximum mana; 20% increased mana regeneration', kind: 'small', ...ARCHMAGE_LAYOUT.s2, mods: [mod('mana', 'increased', 0.15), mod('manaRegen', 'increased', 0.2)], links: ['root'] },
    { id: 's3', name: 'Celerity', description: '8% increased cast speed', kind: 'small', ...ARCHMAGE_LAYOUT.s3, mods: [mod('castSpeed', 'increased', 0.08)], links: ['root'] },
    { id: 'n1', name: 'Overcharged Sigils', description: 'Spells have 20% chance to Shock', kind: 'notable', ...ARCHMAGE_LAYOUT.n1, mods: [mod('apply_shock', 'flat', 0.2, ['spell'])], links: ['s1'] },
    { id: 'n2', name: 'Living Capacitor', description: 'Gain Capacitor Burst; 10% increased cast speed', kind: 'notable', ...ARCHMAGE_LAYOUT.n2, mods: [mod('proc_capacitor_burst', 'flat', 1), mod('castSpeed', 'increased', 0.1)], links: ['s1', 's3'] },
    { id: 'n3', name: 'Leyline Conduit', description: '15% reduced mana cost; +40 maximum mana', kind: 'notable', ...ARCHMAGE_LAYOUT.n3, mods: [mod('manaCost', 'increased', -0.15), mod('mana', 'flat', 40)], links: ['s3', 's2'] },
    { id: 'n4', name: 'Elemental Mastery', description: 'Spells: 25% increased ailment magnitude; +10% ailment chance', kind: 'notable', ...ARCHMAGE_LAYOUT.n4, mods: [mod('statusMagnitude', 'increased', 0.25, ['spell']), mod('statusChance', 'flat', 0.1, ['spell'])], links: ['s2'] },
    { id: 'k1', name: "Archmage's Decree", description: '20% more spell damage; 15% increased mana cost', kind: 'keystone', ...ARCHMAGE_LAYOUT.k1, mods: [mod('damage', 'more', 0.2, ['spell']), mod('manaCost', 'increased', 0.15)], links: ['n2', 'n3'] },
  ],
  quest: {
    steps: [
      {
        offerLabel: 'Disperse the cult at the leyline nexus',
        zone: {
          tileset: 'leyline_nexus', direction: 'e', distance: 1, level: 'character',
          objective: { kind: 'clear' },
          packsOverride: {
            count: [6, 8], size: [3, 5], table: [
              { id: 'fire_cultist', weight: 2 }, { id: 'frost_witch', weight: 2 },
              { id: 'storm_acolyte', weight: 2 }, { id: 'voltaic_shade', weight: 1 },
            ],
          },
          forceWaypoint: true,
        },
        xp: 800, gems: 3,
        turnInPrompt: 'The cult is scattered — return to the quartermaster.',
      },
      {
        offerLabel: 'Hold the crystal confluence as it surges',
        zone: {
          tileset: 'crystal', direction: 'e', distance: 2, level: 'character',
          objective: { kind: 'waves', waves: 4 },
          packsOverride: {
            count: [5, 7], size: [3, 5], table: [
              { id: 'spirit_wisp', weight: 3 }, { id: 'ember_elemental', weight: 2 },
              { id: 'gale_elemental', weight: 2 }, { id: 'frost_elemental', weight: 2 },
              { id: 'stone_sentinel', weight: 1 },
            ],
          },
          forceWaypoint: true,
        },
        xp: 1200, gems: 4,
        turnInPrompt: 'The confluence is quiet — return to the quartermaster.',
      },
      {
        offerLabel: 'Unseat the Leyline Sovereign',
        zone: {
          tileset: 'leyline_nexus', direction: 'e', distance: 2, level: 'character',
          objective: { kind: 'boss', id: 'leyline_sovereign' },
          forceWaypoint: true,
          floating: true,
        },
        xp: 2000, gems: 6,
        turnInPrompt: 'The ley runs through YOU now — return and take up the mantle of the Archmage.',
      },
    ],
  },
};

const HIEROPHANT_LAYOUT = fan(250); // spine points at wil_start (up, slightly left)
const HIEROPHANT: VocationDef = {
  id: 'hierophant', name: 'Hierophant',
  blurb: 'The line holds because you hold it. Blocks that detonate, wounds that close themselves, rites shared with the flock.',
  color: '#8ae0a8',
  classId: 'cleric',
  tree: [
    { id: 's1', name: 'Devout Mending', description: '20% increased healing power', kind: 'small', ...HIEROPHANT_LAYOUT.s1, mods: [mod('healPower', 'increased', 0.2)], links: ['root'] },
    { id: 's2', name: 'Aegis of Faith', description: '+4% block chance; 15% increased armor', kind: 'small', ...HIEROPHANT_LAYOUT.s2, mods: [mod('blockChance', 'flat', 0.04), mod('armor', 'increased', 0.15)], links: ['root'] },
    { id: 's3', name: 'Ceaseless Prayer', description: '+2 life regeneration per second', kind: 'small', ...HIEROPHANT_LAYOUT.s3, mods: [mod('lifeRegen', 'flat', 2)], links: ['root'] },
    { id: 'n1', name: 'Sacred Bulwark', description: 'Gain Bulwark Nova (blocks detonate); +30 maximum life', kind: 'notable', ...HIEROPHANT_LAYOUT.n1, mods: [mod('proc_bulwark_nova', 'flat', 1), mod('life', 'flat', 30)], links: ['s1'] },
    { id: 'n2', name: 'Radiant Reprisal', description: 'Gain Radiant Reprisal; +15 thorns', kind: 'notable', ...HIEROPHANT_LAYOUT.n2, mods: [mod('proc_radiant_reprisal', 'flat', 1), mod('thorns', 'flat', 15)], links: ['s1', 's3'] },
    { id: 'n3', name: 'Communal Rites', description: '25% of your minion-buffs also apply to you; 20% increased minion life', kind: 'notable', ...HIEROPHANT_LAYOUT.n3, mods: [mod('offeringShare', 'flat', 0.25), mod('minionLife', 'increased', 0.2)], links: ['s3', 's2'] },
    { id: 'n4', name: 'Litany of Woe', description: 'Spells have 20% chance to Weaken', kind: 'notable', ...HIEROPHANT_LAYOUT.n4, mods: [mod('apply_weaken', 'flat', 0.2, ['spell'])], links: ['s2'] },
    { id: 'k1', name: "Saint's Covenant", description: '25% of hits taken on life flow back as healing over 6s; 15% more healing power', kind: 'keystone', ...HIEROPHANT_LAYOUT.k1, mods: [mod('recuperate', 'flat', 0.25), mod('healPower', 'more', 0.15)], links: ['n2', 'n3'] },
  ],
  quest: {
    steps: [
      {
        offerLabel: 'Cleanse the blighted fen',
        zone: {
          tileset: 'marsh', direction: 's', distance: 1, level: 'character',
          objective: { kind: 'clear' },
          packsOverride: {
            count: [6, 8], size: [3, 5], table: [
              { id: 'plague_carrier', weight: 3 }, { id: 'plague_spitter', weight: 2 },
              { id: 'plague_bloat', weight: 1 }, { id: 'fen_hound', weight: 2 },
            ],
          },
          forceWaypoint: true,
        },
        xp: 800, gems: 3,
        turnInPrompt: 'The fen breathes clean — return to the quartermaster.',
      },
      {
        offerLabel: 'Cast down the profane altars in the mire',
        zone: {
          tileset: 'mire', direction: 's', distance: 2, level: 'character',
          objective: { kind: 'spawners', spawnerId: 'bone_altar', count: [3, 4] },
          packsOverride: {
            count: [4, 6], size: [3, 4], table: [
              { id: 'decay_wraith', weight: 2 }, { id: 'plague_carrier', weight: 2 },
              { id: 'zombie', weight: 2 },
            ],
          },
          forceWaypoint: true,
        },
        xp: 1200, gems: 4,
        turnInPrompt: 'The altars are cast down — return to the quartermaster.',
      },
      {
        offerLabel: 'Purge Patient Zero, the First Host',
        zone: {
          tileset: 'marsh', direction: 's', distance: 2, level: 'character',
          objective: { kind: 'boss', id: 'patient_zero' },
          forceWaypoint: true,
          floating: true,
        },
        xp: 2000, gems: 6,
        turnInPrompt: 'The First Host is purged — return and take up the mantle of the Hierophant.',
      },
    ],
  },
};

// --- the SECRET vocations -------------------------------------------------------

/** GREENWARDEN — the Ranger's hidden calling (the Abyssal-Lich shape): never
 *  posted in town. A heartwood site seeds itself into sylvan-patron groves;
 *  a level-28+ RANGER who finds it receives the calling. Its nodes lean on
 *  the attunement/terraform primitives (data/attunements.ts): commune with
 *  living wood for rapid regeneration, and GROW your own wilting saplings so
 *  the communion travels with you — a walking pocket of forest. */
const GREENWARDEN_LAYOUT = fan(330); // spine points at dex_start, like its public sibling
const GREENWARDEN: VocationDef = {
  id: 'greenwarden', name: 'Greenwarden',
  blurb: 'The forest keeps its own, and now it keeps you. Roots close your wounds, seeds follow your steps, and the green goes wherever you go.',
  color: '#4aa85a',
  classId: 'ranger',
  secret: {
    site: {
      npc: 'heartwood_warden',
      filter: { patronFactions: ['sylvan'], minLevel: 24 },
      chance: 0.45,
      doodads: [
        { kind: 'tree', count: 4, radius: 95, size: [16, 22] },
        { kind: 'sapling', count: 5, radius: 55, size: [7, 10] },
      ],
    },
    classLockedDiscovery: true,
    unlockedOffer: 'menu',
    offerFlavor: '"You came following wounds and left them living," the Heartwood murmurs. "Stay a while, warden-to-be. The green has trials for you."',
    discoveryText: 'The heartwood stirs — something ancient takes notice of you.',
  },
  tree: [
    { id: 's1', name: 'Rootsense', description: '15% increased evasion; 4% increased movement speed', kind: 'small', ...GREENWARDEN_LAYOUT.s1, mods: [mod('evasion', 'increased', 0.15), mod('moveSpeed', 'increased', 0.04)], links: ['root'] },
    { id: 's2', name: 'Thorn-Calloused', description: '+10 thorns; 10% increased armor', kind: 'small', ...GREENWARDEN_LAYOUT.s2, mods: [mod('thorns', 'flat', 10), mod('armor', 'increased', 0.1)], links: ['root'] },
    { id: 's3', name: 'Sap-Blooded', description: '+2 life regeneration per second', kind: 'small', ...GREENWARDEN_LAYOUT.s3, mods: [mod('lifeRegen', 'flat', 2)], links: ['root'] },
    { id: 'n1', name: 'Verdant Communion', description: 'Linger near living wood (trees, thickets, your own saplings) and the green knits you: rapid life regeneration while you commune', kind: 'notable', ...GREENWARDEN_LAYOUT.n1, mods: [mod('attune_verdant_communion', 'flat', 1)], links: ['s1'] },
    { id: 'n2', name: 'Seedbearer', description: 'Living saplings spring up in your footsteps and wilt away behind you — the forest travels with its warden', kind: 'notable', ...GREENWARDEN_LAYOUT.n2, mods: [mod('terraform_sapling_ring', 'flat', 1)], links: ['s1', 's3'] },
    { id: 'n3', name: 'Briar Pact', description: 'Projectiles have 15% chance to Root; 25% increased damage against Rooted enemies', kind: 'notable', ...GREENWARDEN_LAYOUT.n3, mods: [mod('apply_rooted', 'flat', 0.15, ['projectile']), mod('damageVs_rooted', 'flat', 0.25)], links: ['s3', 's2'] },
    { id: 'n4', name: 'Wildveined', description: 'Projectiles: 20% chance to Poison; 15% increased ailment magnitude', kind: 'notable', ...GREENWARDEN_LAYOUT.n4, mods: [mod('apply_poison', 'flat', 0.2, ['projectile']), mod('statusMagnitude', 'increased', 0.15, ['projectile'])], links: ['s2'] },
    { id: 'k1', name: 'Heart of the Forest', description: 'Your saplings spring up twice as fast; +2% of maximum life regenerated per second; 10% more projectile damage', kind: 'keystone', ...GREENWARDEN_LAYOUT.k1, mods: [mod('terraform_sapling_ring', 'flat', 1), mod('lifeRegenPct', 'flat', 0.02), mod('damage', 'more', 0.1, ['projectile'])], links: ['n2', 'n3'] },
    { id: 'n5', name: 'Bramble Ward', description: 'Your saplings FIGHT — thorned canes lash your enemies while the growth stands', kind: 'notable', ...p(330 + 90, 210), mods: [mod('terraformFx_sapling_ring', 'flat', 1)], links: ['s2'] },
  ],
  quest: {
    offerAtLevel: 28,
    steps: [
      {
        offerLabel: 'Drive the gnoll packs from the grove',
        zone: {
          tileset: 'deepwood', direction: 'n', distance: 1, level: 'character', anchor: 'accept',
          objective: { kind: 'clear' },
          packsOverride: {
            count: [6, 8], size: [3, 5], table: [
              { id: 'gnoll_prowler', weight: 3 }, { id: 'gnoll_butcher', weight: 2 },
              { id: 'gnoll_longshot', weight: 2 }, { id: 'gnoll_howler', weight: 1 },
            ],
          },
          forceWaypoint: true,
        },
        xp: 800, gems: 3,
        turnInPrompt: 'The packs are broken — return to the heartwood.',
      },
      {
        offerLabel: 'Cleanse the sporebound thicket',
        zone: {
          tileset: 'mycelia', direction: 'n', distance: 2, level: 'character', anchor: 'accept',
          objective: { kind: 'clear' },
          packsOverride: {
            count: [6, 8], size: [3, 5], table: [
              { id: 'fungal_sporeling', weight: 3 }, { id: 'fungal_spitter', weight: 2 },
              { id: 'fungal_brute', weight: 2 }, { id: 'fungal_tender', weight: 1 },
            ],
          },
          forceWaypoint: true,
        },
        xp: 1200, gems: 4,
        turnInPrompt: 'The rot is cut out — return to the heartwood.',
      },
      {
        offerLabel: 'Slay the Broodmother gnawing the roots',
        zone: {
          tileset: 'jungle', direction: 'n', distance: 2, level: 'character', anchor: 'accept',
          objective: { kind: 'boss', id: 'broodmother', levelBonus: 1, promote: { rarity: 'crowned' } },
          packsOverride: {
            count: [5, 7], size: [3, 5], table: [
              { id: 'spiderling', weight: 4 }, { id: 'spider_nest', weight: 1 },
              { id: 'thicket_stalker', weight: 2 },
            ],
          },
          forceWaypoint: true,
          floating: true,
        },
        xp: 2000, gems: 6,
        turnInPrompt: 'The roots are safe — return, and be named Greenwarden.',
      },
    ],
  },
};

// --- the roster fill (one vocation per remaining class) -------------------------

/** PLAGUELORD — the Necromancer's calling: the rot as ecosystem. Longer
 *  poisons, poisoned legions, curses that hold, +2 chaos ailment stacks. */
const PLAGUELORD_LAYOUT = fan(210); // spine → wis_start
const PLAGUELORD: VocationDef = {
  id: 'plaguelord', name: 'Plaguelord',
  blurb: 'The rot is not a weapon, it is a kingdom. Everything that breathes near you is already a subject in waiting.',
  color: '#7ea84a',
  classId: 'necromancer',
  tree: [
    { id: 's1', name: 'Grave Chill', description: '15% increased minion damage; 10% increased chaos damage', kind: 'small', ...PLAGUELORD_LAYOUT.s1, mods: [mod('minionDamage', 'increased', 0.15), mod('damage', 'increased', 0.1, ['chaos'])], links: ['root'] },
    { id: 's2', name: 'Carrion Feast', description: 'Minions regenerate 1.5% life per second; +1 life regeneration', kind: 'small', ...PLAGUELORD_LAYOUT.s2, mods: [mod('minionRegenPct', 'flat', 0.015), mod('lifeRegen', 'flat', 1)], links: ['root'] },
    { id: 's3', name: 'Hexweaver', description: '12% increased skill effect duration', kind: 'small', ...PLAGUELORD_LAYOUT.s3, mods: [mod('effectDuration', 'increased', 0.12)], links: ['root'] },
    { id: 'n1', name: 'Virulence', description: '30% increased chaos ailment magnitude; spells have +15% chance to Poison', kind: 'notable', ...PLAGUELORD_LAYOUT.n1, mods: [mod('statusMagnitude', 'increased', 0.3, ['chaos']), mod('apply_poison', 'flat', 0.15, ['spell'])], links: ['s1'] },
    { id: 'n2', name: 'Legion of the Rot', description: 'Minions have 20% chance to Poison on hit; +1 maximum minion', kind: 'notable', ...PLAGUELORD_LAYOUT.n2, mods: [mod('minionApply_poison', 'flat', 0.2), mod('minionMaxCount', 'flat', 1)], links: ['s1', 's3'] },
    { id: 'n3', name: 'Dread Liturgy', description: '15% increased damage against Despairing enemies; spells have 15% chance to Weaken', kind: 'notable', ...PLAGUELORD_LAYOUT.n3, mods: [mod('damageVs_despair', 'flat', 0.15), mod('apply_weaken', 'flat', 0.15, ['spell'])], links: ['s3', 's2'] },
    { id: 'n4', name: 'Bone Harvest', description: '8% of poison damage leeched as life; 20% increased minion life', kind: 'notable', ...PLAGUELORD_LAYOUT.n4, mods: [mod('dotLeech_poison', 'flat', 0.08), mod('minionLife', 'increased', 0.2)], links: ['s2'] },
    { id: 'k1', name: 'Epidemic', description: '+2 chaos ailment stacks; 15% more chaos ailment magnitude', kind: 'keystone', ...PLAGUELORD_LAYOUT.k1, mods: [mod('ailmentStacks', 'flat', 2, ['chaos']), mod('statusMagnitude', 'more', 0.15, ['chaos'])], links: ['n2', 'n3'] },
  ],
  quest: {
    steps: [
      {
        offerLabel: 'Walk among the plague-dead of the wastes',
        zone: {
          tileset: 'wasteland', direction: 'e', distance: 1, level: 'character',
          objective: { kind: 'clear' },
          packsOverride: {
            count: [6, 8], size: [3, 5], table: [
              { id: 'deadwake_ghoul', weight: 3 }, { id: 'deadwake_plague_bearer', weight: 2 },
              { id: 'zombie', weight: 2 }, { id: 'plague_carrier', weight: 2 },
            ],
          },
          forceWaypoint: true,
        },
        xp: 800, gems: 3,
        turnInPrompt: 'The dead lie counted — return to the quartermaster.',
      },
      {
        offerLabel: 'Shatter the altars feeding the blight',
        zone: {
          tileset: 'marsh', direction: 'e', distance: 2, level: 'character',
          objective: { kind: 'spawners', spawnerId: 'bone_altar', count: [3, 4] },
          packsOverride: {
            count: [4, 6], size: [3, 4], table: [
              { id: 'plague_spitter', weight: 2 }, { id: 'decay_wraith', weight: 2 },
              { id: 'bone_serpent', weight: 1 }, { id: 'skeletal_cleric', weight: 1 },
            ],
          },
          forceWaypoint: true,
        },
        xp: 1200, gems: 4,
        turnInPrompt: 'The altars are yours now — return to the quartermaster.',
      },
      {
        offerLabel: 'Usurp the Lich Marshal',
        zone: {
          tileset: 'crypt', direction: 'e', distance: 2, level: 'character',
          objective: { kind: 'boss', id: 'lich_marshal', levelBonus: 1, promote: { rarity: 'crowned' } },
          forceWaypoint: true,
          floating: true,
        },
        xp: 2000, gems: 6,
        turnInPrompt: 'The Marshal kneels or rots — return, Plaguelord.',
      },
    ],
  },
};

/** SHADOWDANCER — the Rogue's calling: never seen twice in the same place. */
const SHADOWDANCER_LAYOUT = fan(290); // spine → fin_start
const SHADOWDANCER: VocationDef = {
  id: 'shadowdancer', name: 'Shadowdancer',
  blurb: 'The blow you saw was the feint. The dance is being elsewhere when the answer comes.',
  color: '#6a6a9a',
  classId: 'rogue',
  tree: [
    { id: 's1', name: 'Soft Step', description: '15% increased evasion; 4% increased movement speed', kind: 'small', ...SHADOWDANCER_LAYOUT.s1, mods: [mod('evasion', 'increased', 0.15), mod('moveSpeed', 'increased', 0.04)], links: ['root'] },
    { id: 's2', name: 'Killer Instinct', description: '+4% critical strike chance', kind: 'small', ...SHADOWDANCER_LAYOUT.s2, mods: [mod('critChance', 'flat', 0.04)], links: ['root'] },
    { id: 's3', name: 'Quick Hands', description: '8% increased attack speed', kind: 'small', ...SHADOWDANCER_LAYOUT.s3, mods: [mod('attackSpeed', 'increased', 0.08)], links: ['root'] },
    { id: 'n1', name: 'Ambusher', description: '+30% critical strike multiplier; melee hits have 15% chance to Weaken', kind: 'notable', ...SHADOWDANCER_LAYOUT.n1, mods: [mod('critMulti', 'flat', 0.3), mod('apply_weaken', 'flat', 0.15, ['melee'])], links: ['s1'] },
    { id: 'n2', name: 'Phase Veil', description: 'Gain Phase Surge; 20% increased evasion', kind: 'notable', ...SHADOWDANCER_LAYOUT.n2, mods: [mod('proc_phase_surge', 'flat', 1), mod('evasion', 'increased', 0.2)], links: ['s1', 's3'] },
    { id: 'n3', name: 'Twist the Knife', description: 'Melee hits have 15% chance to apply Vulnerable; 6% increased damage per Vulnerable stack', kind: 'notable', ...SHADOWDANCER_LAYOUT.n3, mods: [mod('apply_vulnerable', 'flat', 0.15, ['melee']), mod('damageVs_vulnerable', 'flat', 0.06)], links: ['s3', 's2'] },
    { id: 'n4', name: 'Fleetblade', description: 'While moving: 15% increased melee damage; 5% increased movement speed', kind: 'notable', ...SHADOWDANCER_LAYOUT.n4, mods: [mod('damage', 'increased', 0.15, ['melee'], 'moving'), mod('moveSpeed', 'increased', 0.05)], links: ['s2'] },
    { id: 'k1', name: 'Death from Shadow', description: 'At full life: 20% more melee damage. +6% critical strike chance', kind: 'keystone', ...SHADOWDANCER_LAYOUT.k1, mods: [mod('damage', 'more', 0.2, ['melee'], 'fullLife'), mod('critChance', 'flat', 0.06)], links: ['n2', 'n3'] },
  ],
  quest: {
    steps: [
      {
        offerLabel: 'Cut the bandit road in the mountains',
        zone: {
          tileset: 'highland', direction: 's', distance: 1, level: 'character',
          objective: { kind: 'clear' },
          packsOverride: {
            count: [6, 8], size: [3, 5], table: [
              { id: 'bandit_cutthroat', weight: 3 }, { id: 'bandit_bruiser', weight: 2 },
              { id: 'bandit_keeper', weight: 1 }, { id: 'gnoll_prowler', weight: 1 },
            ],
          },
          forceWaypoint: true,
        },
        xp: 800, gems: 3,
        turnInPrompt: 'The road is quiet — return to the quartermaster.',
      },
      {
        offerLabel: 'Slip the dunes before the hunters close',
        zone: {
          tileset: 'desert', direction: 's', distance: 2, level: 'character',
          objective: { kind: 'escape', interval: [4, 7] },
          packsOverride: {
            count: [5, 7], size: [3, 5], table: [
              { id: 'dune_stalker', weight: 3 }, { id: 'sand_skitterer', weight: 2 },
              { id: 'dune_vulture', weight: 2 }, { id: 'javelin_skirmisher', weight: 1 },
            ],
          },
          forceWaypoint: true,
        },
        xp: 1200, gems: 4,
        turnInPrompt: 'Not a footprint left — return to the quartermaster.',
      },
      {
        offerLabel: 'End the Keeper of the toll roads',
        zone: {
          tileset: 'highland', direction: 's', distance: 2, level: 'character',
          objective: { kind: 'boss', id: 'bandit_keeper', levelBonus: 1, promote: { rarity: 'crowned', stacks: 2 } },
          packsOverride: {
            count: [5, 7], size: [3, 4], table: [
              { id: 'bandit_cutthroat', weight: 3 }, { id: 'bandit_bruiser', weight: 2 },
            ],
          },
          forceWaypoint: true,
          floating: true,
        },
        xp: 2000, gems: 6,
        turnInPrompt: 'The Keeper kept nothing — return, Shadowdancer.',
      },
    ],
  },
};

/** BLOODREAVER — the Berserker's calling: the wound is the fuel gauge. */
const BLOODREAVER_LAYOUT = fan(50); // spine → prw_start
const BLOODREAVER: VocationDef = {
  id: 'bloodreaver', name: 'Bloodreaver',
  blurb: 'Pain is just the body counting what it owes. Collect in red, spend it faster than it bleeds.',
  color: '#d84838',
  classId: 'berserker',
  tree: [
    { id: 's1', name: 'Sharpened Fury', description: '15% increased melee damage', kind: 'small', ...BLOODREAVER_LAYOUT.s1, mods: [mod('damage', 'increased', 0.15, ['melee'])], links: ['root'] },
    { id: 's2', name: 'Thick Blood', description: '+25 maximum life; 1% of damage leeched as life', kind: 'small', ...BLOODREAVER_LAYOUT.s2, mods: [mod('life', 'flat', 25), mod('lifeLeech', 'flat', 0.01)], links: ['root'] },
    { id: 's3', name: 'Frenzy Rhythm', description: '10% increased attack speed', kind: 'small', ...BLOODREAVER_LAYOUT.s3, mods: [mod('attackSpeed', 'increased', 0.1)], links: ['root'] },
    { id: 'n1', name: 'Red Rapture', description: '3% of melee damage leeched as life; on low life: 15% increased damage', kind: 'notable', ...BLOODREAVER_LAYOUT.n1, mods: [mod('lifeLeech', 'flat', 0.03, ['melee']), mod('damage', 'increased', 0.15, undefined, 'lowLife')], links: ['s1'] },
    { id: 'n2', name: "Reaver's Momentum", description: 'Gain Crimson Thirst; 10% increased attack speed', kind: 'notable', ...BLOODREAVER_LAYOUT.n2, mods: [mod('proc_crimson_thirst', 'flat', 1), mod('attackSpeed', 'increased', 0.1)], links: ['s1', 's3'] },
    { id: 'n3', name: 'Painfuel', description: 'On low life: 25% increased damage and 5% less damage taken', kind: 'notable', ...BLOODREAVER_LAYOUT.n3, mods: [mod('damage', 'increased', 0.25, undefined, 'lowLife'), mod('damageTaken', 'more', -0.05, undefined, 'lowLife')], links: ['s3', 's2'] },
    { id: 'n4', name: 'Whirl of Ruin', description: '20% increased melee area of effect; 10% increased melee damage', kind: 'notable', ...BLOODREAVER_LAYOUT.n4, mods: [mod('aoeRadius', 'increased', 0.2, ['melee']), mod('damage', 'increased', 0.1, ['melee'])], links: ['s2'] },
    { id: 'k1', name: 'Deathwish', description: '25% more melee damage; 12% more damage taken', kind: 'keystone', ...BLOODREAVER_LAYOUT.k1, mods: [mod('damage', 'more', 0.25, ['melee']), mod('damageTaken', 'more', 0.12)], links: ['n2', 'n3'] },
  ],
  quest: {
    steps: [
      {
        offerLabel: 'Answer the warhorns in the mountains',
        zone: {
          tileset: 'highland', direction: 'w', distance: 1, level: 'character',
          objective: { kind: 'waves', waves: 4 },
          packsOverride: {
            count: [5, 7], size: [3, 5], table: [
              { id: 'orc_ravager', weight: 3 }, { id: 'gnoll_butcher', weight: 2 },
              { id: 'troll_mauler', weight: 1 }, { id: 'goblin_brute', weight: 2 },
            ],
          },
          forceWaypoint: true,
        },
        xp: 800, gems: 3,
        turnInPrompt: 'The horns are silent — return to the quartermaster.',
      },
      {
        offerLabel: 'Carve through the cinder pits',
        zone: {
          tileset: 'cinderlands', direction: 'w', distance: 2, level: 'character',
          objective: { kind: 'clear' },
          packsOverride: {
            count: [6, 8], size: [3, 5], table: [
              { id: 'hellhound', weight: 3 }, { id: 'imp', weight: 2 },
              { id: 'cinder_fiend', weight: 2 }, { id: 'searing_spawn', weight: 1 },
            ],
          },
          forceWaypoint: true,
        },
        xp: 1200, gems: 4,
        turnInPrompt: 'The pits burned hotter with you in them — return.',
      },
      {
        offerLabel: 'Drag the Pit Lord from his throne',
        zone: {
          tileset: 'volcanic', direction: 'w', distance: 2, level: 'character',
          objective: { kind: 'boss', id: 'pit_lord', levelBonus: 1, promote: { rarity: 'crowned' } },
          forceWaypoint: true,
          floating: true,
        },
        xp: 2000, gems: 6,
        turnInPrompt: 'The throne is ash — return, Bloodreaver.',
      },
    ],
  },
};

/** STORMWEAVER — the Sorcerer's calling: the sky, weaponized wholesale. */
const STORMWEAVER_LAYOUT = fan(170); // spine → int_start
const STORMWEAVER: VocationDef = {
  id: 'stormweaver', name: 'Stormweaver',
  blurb: 'Thunder is not a warning. It is the paperwork arriving after the decision.',
  color: '#5ac8e8',
  classId: 'sorcerer',
  tree: [
    { id: 's1', name: 'Charged Air', description: '15% increased lightning damage', kind: 'small', ...STORMWEAVER_LAYOUT.s1, mods: [mod('damage', 'increased', 0.15, ['lightning'])], links: ['root'] },
    { id: 's2', name: 'Conductor', description: '8% increased cast speed', kind: 'small', ...STORMWEAVER_LAYOUT.s2, mods: [mod('castSpeed', 'increased', 0.08)], links: ['root'] },
    { id: 's3', name: 'Deep Current', description: '12% increased maximum mana', kind: 'small', ...STORMWEAVER_LAYOUT.s3, mods: [mod('mana', 'increased', 0.12)], links: ['root'] },
    { id: 'n1', name: 'Static Field', description: 'Spells have 20% chance to Shock; 10% increased damage against Shocked enemies', kind: 'notable', ...STORMWEAVER_LAYOUT.n1, mods: [mod('apply_shock', 'flat', 0.2, ['spell']), mod('damageVs_shock', 'flat', 0.1)], links: ['s1'] },
    { id: 'n2', name: 'Living Capacitance', description: 'Spell hits have 15% chance to call Thunderstruck; gain Capacitor Burst', kind: 'notable', ...STORMWEAVER_LAYOUT.n2, mods: [mod('proc_thunderstruck', 'flat', 0.15, ['spell']), mod('proc_capacitor_burst', 'flat', 1)], links: ['s1', 's3'] },
    { id: 'n3', name: 'Tempest Reach', description: '25% increased spell area of effect', kind: 'notable', ...STORMWEAVER_LAYOUT.n3, mods: [mod('aoeRadius', 'increased', 0.25, ['spell'])], links: ['s3', 's2'] },
    { id: 'n4', name: 'Stormsight', description: '+5% spell critical strike chance; +20% critical strike multiplier', kind: 'notable', ...STORMWEAVER_LAYOUT.n4, mods: [mod('critChance', 'flat', 0.05, ['spell']), mod('critMulti', 'flat', 0.2)], links: ['s2'] },
    { id: 'k1', name: 'Eye of the Storm', description: '18% more lightning damage; 10% reduced mana cost', kind: 'keystone', ...STORMWEAVER_LAYOUT.k1, mods: [mod('damage', 'more', 0.18, ['lightning']), mod('manaCost', 'increased', -0.1)], links: ['n2', 'n3'] },
  ],
  quest: {
    steps: [
      {
        offerLabel: 'Scatter the storm cult on the tundra',
        zone: {
          tileset: 'tundra', direction: 'n', distance: 1, level: 'character',
          objective: { kind: 'clear' },
          packsOverride: {
            count: [6, 8], size: [3, 5], table: [
              { id: 'storm_acolyte', weight: 3 }, { id: 'frost_witch', weight: 2 },
              { id: 'voltaic_shade', weight: 2 }, { id: 'glacial_horror', weight: 1 },
            ],
          },
          forceWaypoint: true,
        },
        xp: 800, gems: 3,
        turnInPrompt: 'The cult is scattered to the wind — return.',
      },
      {
        offerLabel: 'Hold the crystal spires through the surge',
        zone: {
          tileset: 'crystal', direction: 'n', distance: 2, level: 'character',
          objective: { kind: 'waves', waves: 4 },
          packsOverride: {
            count: [5, 7], size: [3, 5], table: [
              { id: 'gale_elemental', weight: 3 }, { id: 'frost_elemental', weight: 2 },
              { id: 'spirit_wisp', weight: 2 }, { id: 'stone_sentinel', weight: 1 },
            ],
          },
          forceWaypoint: true,
        },
        xp: 1200, gems: 4,
        turnInPrompt: 'The spires still sing — return to the quartermaster.',
      },
      {
        offerLabel: 'Break the Abyssal Tyrant beneath the gale',
        zone: {
          tileset: 'tundra', direction: 'n', distance: 2, level: 'character',
          objective: { kind: 'boss', id: 'abyssal_tyrant' },
          forceWaypoint: true,
          floating: true,
        },
        xp: 2000, gems: 6,
        turnInPrompt: 'The storm answers to you now — return, Stormweaver.',
      },
    ],
  },
};

/** SPELLBLADE — the Magician's second calling: steel in one hand, sigil in
 *  the other, and the WEAVE between them. THE COMBO GRAMMAR's flagship
 *  consumer (engine/sequence.ts, data/combos.ts): the vocation grants the
 *  Blade-and-Vein rule itself, rides the comboVaried condition, and bends
 *  the comboWindow stat — every lever an ordinary modifier. */
const SPELLBLADE_LAYOUT = fan(185); // spine → int_start (offset from the Archmage's 170)
const SPELLBLADE: VocationDef = {
  id: 'spellblade', name: 'Spellblade',
  blurb: 'The blade asks; the sigil answers. Neither is the argument — the alternation is.',
  color: '#b8a8e8',
  classId: 'magician',
  tree: [
    { id: 's1', name: 'Edge Discipline', description: '12% increased melee damage', kind: 'small', ...SPELLBLADE_LAYOUT.s1, mods: [mod('damage', 'increased', 0.12, ['melee'])], links: ['root'] },
    { id: 's2', name: 'Sigil Discipline', description: '12% increased spell damage', kind: 'small', ...SPELLBLADE_LAYOUT.s2, mods: [mod('damage', 'increased', 0.12, ['spell'])], links: ['root'] },
    { id: 's3', name: 'Measured Breath', description: '6% increased attack and cast speed', kind: 'small', ...SPELLBLADE_LAYOUT.s3, mods: [mod('attackSpeed', 'increased', 0.06), mod('castSpeed', 'increased', 0.06)], links: ['root'] },
    { id: 'n1', name: 'Blade-and-Vein', description: 'THE WEAVE: gain the Blade-and-Vein grammar — an attack and a spell back-to-back surge your attack and cast speed, stacking while you keep alternating', kind: 'notable', ...SPELLBLADE_LAYOUT.n1, mods: [mod('combo_spellblade_weave', 'flat', 1)], links: ['s1', 's3'] },
    { id: 'n2', name: 'Woven Steel', description: 'While your last three casts were all different skills: 15% increased damage', kind: 'notable', ...SPELLBLADE_LAYOUT.n2, mods: [mod('damage', 'increased', 0.15, undefined, 'comboVaried')], links: ['s1'] },
    { id: 'n3', name: 'Long Measure', description: 'Your combo windows stay open 25% longer; 10% increased skill effect duration', kind: 'notable', ...SPELLBLADE_LAYOUT.n3, mods: [mod('comboWindow', 'increased', 0.25), mod('effectDuration', 'increased', 0.1)], links: ['s3', 's2'] },
    { id: 'n4', name: 'Counterpoint Guard', description: 'While your last three casts were all different skills: 10% less damage taken', kind: 'notable', ...SPELLBLADE_LAYOUT.n4, mods: [mod('damageTaken', 'more', -0.1, undefined, 'comboVaried')], links: ['s2'] },
    { id: 'k1', name: 'The Unbroken Measure', description: 'KEYSTONE: your combo windows stay open 50% longer; 10% increased mana cost', kind: 'keystone', ...SPELLBLADE_LAYOUT.k1, mods: [mod('comboWindow', 'more', 0.5), mod('manaCost', 'increased', 0.1)], links: ['n1', 'n3'] },
  ],
  quest: {
    steps: [
      {
        offerLabel: 'Study the cadenced kin in the old woods',
        zone: {
          tileset: 'deepwood', direction: 'e', distance: 1, level: 'character',
          objective: { kind: 'clear' },
          packsOverride: {
            count: [6, 8], size: [3, 5], table: [
              { id: 'cadence_fencer', weight: 3 }, { id: 'cadence_cantor', weight: 2 },
              { id: 'steppe_ronin', weight: 1 },
            ],
          },
          forceWaypoint: true,
        },
        xp: 800, gems: 3,
        turnInPrompt: 'You have watched the measure kept — return and keep your own.',
      },
      {
        offerLabel: 'Hold your tempo against the school\'s answer',
        zone: {
          tileset: 'highland', direction: 'e', distance: 2, level: 'character',
          objective: { kind: 'waves', waves: 4 },
          packsOverride: {
            count: [5, 7], size: [3, 5], table: [
              { id: 'cadence_fencer', weight: 3 }, { id: 'cadence_cantor', weight: 2 },
              { id: 'storm_acolyte', weight: 1 },
            ],
          },
          forceWaypoint: true,
        },
        xp: 1200, gems: 4,
        turnInPrompt: 'Four measures, unbroken — return to the quartermaster.',
      },
      {
        offerLabel: 'Answer the Maestro in the high passes',
        zone: {
          tileset: 'highland', direction: 'e', distance: 2, level: 'character',
          objective: { kind: 'boss', id: 'cadence_maestro' },
          forceWaypoint: true,
          floating: true,
        },
        xp: 2000, gems: 6,
        turnInPrompt: 'The crown changed hands mid-measure — return, Spellblade.',
      },
    ],
  },
};

/** BASTION — the Guardian's calling: the wall that hits back. */
const BASTION_LAYOUT = fan(130); // spine → for_start
const BASTION: VocationDef = {
  id: 'bastion', name: 'Bastion',
  blurb: 'Ground is not given. It is loaned at interest, and you are the collector.',
  color: '#c8d8e8',
  classId: 'guardian',
  tree: [
    { id: 's1', name: 'Plated Discipline', description: '20% increased armor', kind: 'small', ...BASTION_LAYOUT.s1, mods: [mod('armor', 'increased', 0.2)], links: ['root'] },
    { id: 's2', name: 'Broad Frame', description: '+30 maximum life', kind: 'small', ...BASTION_LAYOUT.s2, mods: [mod('life', 'flat', 30)], links: ['root'] },
    { id: 's3', name: 'Shield Drill', description: '+3% block chance', kind: 'small', ...BASTION_LAYOUT.s3, mods: [mod('blockChance', 'flat', 0.03)], links: ['root'] },
    { id: 'n1', name: 'Shieldwall', description: '+5% block chance; gain Bastion Fortify', kind: 'notable', ...BASTION_LAYOUT.n1, mods: [mod('blockChance', 'flat', 0.05), mod('proc_bastion_fortify', 'flat', 1)], links: ['s1'] },
    { id: 'n2', name: 'Guarded Heart', description: 'Gain Guarded Heart; +20 thorns', kind: 'notable', ...BASTION_LAYOUT.n2, mods: [mod('proc_guarded_heart', 'flat', 1), mod('thorns', 'flat', 20)], links: ['s1', 's3'] },
    { id: 'n3', name: 'Immovable', description: '35% increased stagger window; 20% increased armor', kind: 'notable', ...BASTION_LAYOUT.n3, mods: [mod('staggerWindow', 'increased', 0.35), mod('armor', 'increased', 0.2)], links: ['s3', 's2'] },
    { id: 'n4', name: "Warden's Resolve", description: 'Gain Last Stand; 8% increased maximum life', kind: 'notable', ...BASTION_LAYOUT.n4, mods: [mod('proc_last_stand', 'flat', 1), mod('life', 'increased', 0.08)], links: ['s2'] },
    { id: 'k1', name: 'Living Fortress', description: '10% less damage taken; +15 thorns; 5% reduced movement speed', kind: 'keystone', ...BASTION_LAYOUT.k1, mods: [mod('damageTaken', 'more', -0.1), mod('thorns', 'flat', 15), mod('moveSpeed', 'increased', -0.05)], links: ['n2', 'n3'] },
  ],
  quest: {
    steps: [
      {
        offerLabel: 'Hold the pass against the goblin siege',
        zone: {
          tileset: 'highland', direction: 'e', distance: 1, level: 'character',
          objective: { kind: 'waves', waves: 5 },
          packsOverride: {
            count: [5, 7], size: [3, 5], table: [
              { id: 'goblin_skirmisher', weight: 3 }, { id: 'goblin_brute', weight: 2 },
              { id: 'goblin_shaman', weight: 1 }, { id: 'orc_ravager', weight: 1 },
            ],
          },
          forceWaypoint: true,
        },
        xp: 800, gems: 3,
        turnInPrompt: 'The pass held — return to the quartermaster.',
      },
      {
        offerLabel: 'Tear down the ember rifts shelling the road',
        zone: {
          tileset: 'cinderlands', direction: 'e', distance: 2, level: 'character',
          objective: { kind: 'spawners', spawnerId: 'ember_rift', count: [3, 4] },
          packsOverride: {
            count: [4, 6], size: [3, 4], table: [
              { id: 'imp', weight: 3 }, { id: 'hellhound', weight: 2 }, { id: 'cinder_fiend', weight: 1 },
            ],
          },
          forceWaypoint: true,
        },
        xp: 1200, gems: 4,
        turnInPrompt: 'The shelling has stopped — return to the quartermaster.',
      },
      {
        offerLabel: 'Stand down the Siege Hulk',
        zone: {
          tileset: 'wasteland', direction: 'e', distance: 2, level: 'character',
          objective: { kind: 'boss', id: 'siege_hulk', levelBonus: 1, promote: { rarity: 'crowned' } },
          forceWaypoint: true,
          floating: true,
        },
        xp: 2000, gems: 6,
        turnInPrompt: 'It broke before you did — return, Bastion.',
      },
    ],
  },
};

/** CORSAIR — the Swashbuckler's calling: the duel as theatre. */
const CORSAIR_LAYOUT = fan(290); // spine → fin_start
const CORSAIR: VocationDef = {
  id: 'corsair', name: 'Corsair',
  blurb: 'Every fight is a stage and every audience pays in the same coin. Take a bow between strokes.',
  color: '#e8c86a',
  classId: 'swashbuckler',
  tree: [
    { id: 's1', name: 'Duelist\'s Eye', description: '+4% critical strike chance', kind: 'small', ...CORSAIR_LAYOUT.s1, mods: [mod('critChance', 'flat', 0.04)], links: ['root'] },
    { id: 's2', name: 'Footwork', description: '15% increased evasion', kind: 'small', ...CORSAIR_LAYOUT.s2, mods: [mod('evasion', 'increased', 0.15)], links: ['root'] },
    { id: 's3', name: 'Tempo', description: '5% increased movement speed', kind: 'small', ...CORSAIR_LAYOUT.s3, mods: [mod('moveSpeed', 'increased', 0.05)], links: ['root'] },
    { id: 'n1', name: 'Adrenal Rush', description: 'Gain Adrenal Rush; 8% increased attack speed', kind: 'notable', ...CORSAIR_LAYOUT.n1, mods: [mod('proc_adrenal_rush', 'flat', 1), mod('attackSpeed', 'increased', 0.08)], links: ['s1'] },
    { id: 'n2', name: 'Perfect Form', description: '+35% critical strike multiplier', kind: 'notable', ...CORSAIR_LAYOUT.n2, mods: [mod('critMulti', 'flat', 0.35)], links: ['s1', 's3'] },
    { id: 'n3', name: 'Flourish', description: 'Melee hits have 20% chance to apply Vulnerable; 6% increased damage per Vulnerable stack', kind: 'notable', ...CORSAIR_LAYOUT.n3, mods: [mod('apply_vulnerable', 'flat', 0.2, ['melee']), mod('damageVs_vulnerable', 'flat', 0.06)], links: ['s3', 's2'] },
    { id: 'n4', name: 'Untouchable', description: '25% increased evasion; 5% increased movement speed', kind: 'notable', ...CORSAIR_LAYOUT.n4, mods: [mod('evasion', 'increased', 0.25), mod('moveSpeed', 'increased', 0.05)], links: ['s2'] },
    { id: 'k1', name: 'En Garde', description: 'While moving: 18% more melee damage. +8% critical strike chance with melee', kind: 'keystone', ...CORSAIR_LAYOUT.k1, mods: [mod('damage', 'more', 0.18, ['melee'], 'moving'), mod('critChance', 'flat', 0.08, ['melee'])], links: ['n2', 'n3'] },
  ],
  quest: {
    steps: [
      {
        offerLabel: 'Clear the corsair coves on the coast',
        zone: {
          tileset: 'beach', direction: 'w', distance: 1, level: 'character',
          objective: { kind: 'clear' },
          packsOverride: {
            count: [6, 8], size: [3, 5], table: [
              { id: 'bandit_cutthroat', weight: 3 }, { id: 'bandit_bruiser', weight: 2 },
              { id: 'javelin_skirmisher', weight: 2 }, { id: 'bandit_keeper', weight: 1 },
            ],
          },
          forceWaypoint: true,
        },
        xp: 800, gems: 3,
        turnInPrompt: 'The coves are quiet — return to the quartermaster.',
      },
      {
        offerLabel: 'Run the jungle gauntlet to the far shore',
        zone: {
          tileset: 'jungle', direction: 'w', distance: 2, level: 'character',
          objective: { kind: 'escape', interval: [4, 7] },
          packsOverride: {
            count: [5, 7], size: [3, 5], table: [
              { id: 'spiderling', weight: 3 }, { id: 'thicket_stalker', weight: 2 },
              { id: 'briar_beast', weight: 1 }, { id: 'blood_mite', weight: 2 },
            ],
          },
          forceWaypoint: true,
        },
        xp: 1200, gems: 4,
        turnInPrompt: 'A clean exit, as always — return to the quartermaster.',
      },
      {
        offerLabel: 'Duel the Lash Maiden',
        zone: {
          tileset: 'peninsula', direction: 'w', distance: 2, level: 'character',
          objective: { kind: 'boss', id: 'lash_maiden', levelBonus: 1, promote: { rarity: 'crowned' } },
          forceWaypoint: true,
          floating: true,
        },
        xp: 2000, gems: 6,
        turnInPrompt: 'She bowed first — return, Corsair.',
      },
    ],
  },
};

/** ASHBORN — the Pyromancer's calling: THE ignite investment house (the
 *  baseline rebalance's fire half lives here — see engine/status.ts). */
const ASHBORN_LAYOUT = fan(170); // spine → int_start
const ASHBORN: VocationDef = {
  id: 'ashborn', name: 'Ashborn',
  blurb: 'Everything burns eventually. Your gift is the word "now" — and the patience to watch it finish.',
  color: '#ff8a3a',
  classId: 'pyromancer',
  tree: [
    { id: 's1', name: 'Fire-Eater', description: '15% increased fire damage', kind: 'small', ...ASHBORN_LAYOUT.s1, mods: [mod('damage', 'increased', 0.15, ['fire'])], links: ['root'] },
    { id: 's2', name: 'Quick Match', description: '8% increased cast speed', kind: 'small', ...ASHBORN_LAYOUT.s2, mods: [mod('castSpeed', 'increased', 0.08)], links: ['root'] },
    { id: 's3', name: 'Ashen Skin', description: '+15% fire resistance', kind: 'small', ...ASHBORN_LAYOUT.s3, mods: [mod('fireRes', 'flat', 0.15)], links: ['root'] },
    { id: 'n1', name: 'Kindler', description: 'Fire skills have +25% chance to Ignite', kind: 'notable', ...ASHBORN_LAYOUT.n1, mods: [mod('apply_burn', 'flat', 0.25, ['fire'])], links: ['s1'] },
    { id: 'n2', name: 'Stoke the Coals', description: '30% increased fire ailment magnitude; 15% increased fire effect duration', kind: 'notable', ...ASHBORN_LAYOUT.n2, mods: [mod('statusMagnitude', 'increased', 0.3, ['fire']), mod('effectDuration', 'increased', 0.15, ['fire'])], links: ['s1', 's3'] },
    { id: 'n3', name: 'Cinderfeed', description: '8% of burn damage leeched as life; 12% increased damage against Burning enemies', kind: 'notable', ...ASHBORN_LAYOUT.n3, mods: [mod('dotLeech_burn', 'flat', 0.08), mod('damageVs_burn', 'flat', 0.12)], links: ['s3', 's2'] },
    { id: 'n4', name: 'Wildfire', description: 'Fire ailments have 25% chance to spread when their victim dies', kind: 'notable', ...ASHBORN_LAYOUT.n4, mods: [mod('dotPropagates', 'flat', 0.25, ['fire'])], links: ['s2'] },
    { id: 'k1', name: 'Ashborn Truth', description: '15% more fire damage; 20% more fire ailment magnitude', kind: 'keystone', ...ASHBORN_LAYOUT.k1, mods: [mod('damage', 'more', 0.15, ['fire']), mod('statusMagnitude', 'more', 0.2, ['fire'])], links: ['n2', 'n3'] },
  ],
  quest: {
    steps: [
      {
        offerLabel: 'Burn out the cinder warrens',
        zone: {
          tileset: 'cinderlands', direction: 's', distance: 1, level: 'character',
          objective: { kind: 'clear' },
          packsOverride: {
            count: [6, 8], size: [3, 5], table: [
              { id: 'imp', weight: 3 }, { id: 'hellhound', weight: 2 },
              { id: 'flame_sprite', weight: 2 }, { id: 'searing_spawn', weight: 1 },
            ],
          },
          forceWaypoint: true,
        },
        xp: 800, gems: 3,
        turnInPrompt: 'The warrens are cinders — return to the quartermaster.',
      },
      {
        offerLabel: 'Feed the volcano its own children',
        zone: {
          tileset: 'volcanic', direction: 's', distance: 2, level: 'character',
          objective: { kind: 'waves', waves: 4 },
          packsOverride: {
            count: [5, 7], size: [3, 5], table: [
              { id: 'magma_worm', weight: 2 }, { id: 'fire_golem', weight: 1 },
              { id: 'cinder_fiend', weight: 2 }, { id: 'ember_elemental', weight: 2 },
            ],
          },
          forceWaypoint: true,
        },
        xp: 1200, gems: 4,
        turnInPrompt: 'The mountain is satisfied — return to the quartermaster.',
      },
      {
        offerLabel: 'Outburn Balor, the Rift-Tyrant',
        zone: {
          tileset: 'volcanic', direction: 's', distance: 2, level: 'character',
          objective: { kind: 'boss', id: 'balor_warlord', levelBonus: 1 },
          forceWaypoint: true,
          floating: true,
        },
        xp: 2000, gems: 6,
        turnInPrompt: 'Even tyrants burn — return, Ashborn.',
      },
    ],
  },
};

/** EXSANGUINATOR — the Assassin's calling: the baseline rebalance's counter-
 *  weight. Plain blows bleed again — and deeper: Hemorrhage, loaded and
 *  popped on rhythm (engine/status.ts pop-on-reapply). */
const EXSANGUINATOR_LAYOUT = fan(290); // spine → fin_start
const EXSANGUINATOR: VocationDef = {
  id: 'exsanguinator', name: 'Exsanguinator',
  blurb: 'Anyone can spill blood. The craft is in the ledger — every vein an account, every wound a withdrawal on schedule.',
  color: '#c03a4a',
  classId: 'assassin',
  tree: [
    { id: 's1', name: 'First Cut', description: 'Attacks have 20% chance to Bleed (the old red baseline, reclaimed)', kind: 'small', ...EXSANGUINATOR_LAYOUT.s1, mods: [mod('apply_bleed', 'flat', 0.2, ['attack'])], links: ['root'] },
    { id: 's2', name: 'Surgical Care', description: '+4% critical strike chance', kind: 'small', ...EXSANGUINATOR_LAYOUT.s2, mods: [mod('critChance', 'flat', 0.04)], links: ['root'] },
    { id: 's3', name: 'Steady Wrist', description: '8% increased attack speed', kind: 'small', ...EXSANGUINATOR_LAYOUT.s3, mods: [mod('attackSpeed', 'increased', 0.08)], links: ['root'] },
    { id: 'n1', name: 'Opened Veins', description: 'Attacks have +15% chance to Bleed; 25% increased physical ailment magnitude', kind: 'notable', ...EXSANGUINATOR_LAYOUT.n1, mods: [mod('apply_bleed', 'flat', 0.15, ['attack']), mod('statusMagnitude', 'increased', 0.25, ['physical'])], links: ['s1'] },
    { id: 'n2', name: 'Ruptured Veins', description: 'Gain Ruptured Veins — your hits load Hemorrhage, and reloading it POPS the damage still owed', kind: 'notable', ...EXSANGUINATOR_LAYOUT.n2, mods: [mod('proc_ruptured_veins', 'flat', 1)], links: ['s1', 's3'] },
    { id: 'n3', name: 'The Deep Wound', description: '50% increased Hemorrhage pop damage; attacks have 10% chance to Hemorrhage', kind: 'notable', ...EXSANGUINATOR_LAYOUT.n3, mods: [mod('popPower_hemorrhage', 'flat', 0.5), mod('apply_hemorrhage', 'flat', 0.1, ['attack'])], links: ['s3', 's2'] },
    { id: 'n4', name: 'Bloodletting', description: '8% of bleed damage leeched as life; 5% increased damage per Bleed stack', kind: 'notable', ...EXSANGUINATOR_LAYOUT.n4, mods: [mod('dotLeech_bleed', 'flat', 0.08), mod('damageVs_bleed', 'flat', 0.05)], links: ['s2'] },
    { id: 'k1', name: 'Exsanguination', description: '+2 physical ailment stacks; 50% increased Hemorrhage pop damage; 12% more physical ailment magnitude', kind: 'keystone', ...EXSANGUINATOR_LAYOUT.k1, mods: [mod('ailmentStacks', 'flat', 2, ['physical']), mod('popPower_hemorrhage', 'flat', 0.5), mod('statusMagnitude', 'more', 0.12, ['physical'])], links: ['n2', 'n3'] },
  ],
  quest: {
    steps: [
      {
        offerLabel: 'Silence the desert watch, blade by blade',
        zone: {
          tileset: 'desert', direction: 'n', distance: 1, level: 'character',
          objective: { kind: 'clear' },
          packsOverride: {
            count: [6, 8], size: [3, 5], table: [
              { id: 'dune_stalker', weight: 3 }, { id: 'javelin_skirmisher', weight: 2 },
              { id: 'hex_weaver', weight: 1 }, { id: 'sand_skitterer', weight: 2 },
            ],
          },
          forceWaypoint: true,
        },
        xp: 800, gems: 3,
        turnInPrompt: 'No alarms were raised — return to the quartermaster.',
      },
      {
        offerLabel: 'Bleed the mire of its profane altars',
        zone: {
          tileset: 'mire', direction: 'n', distance: 2, level: 'character',
          objective: { kind: 'spawners', spawnerId: 'bone_altar', count: [3, 4] },
          packsOverride: {
            count: [4, 6], size: [3, 4], table: [
              { id: 'decay_wraith', weight: 2 }, { id: 'fen_hound', weight: 2 },
              { id: 'plague_carrier', weight: 1 },
            ],
          },
          forceWaypoint: true,
        },
        xp: 1200, gems: 4,
        turnInPrompt: 'The altars bled out — return to the quartermaster.',
      },
      {
        offerLabel: 'Mark and end the untouchable Templar',
        zone: {
          tileset: 'highland', direction: 'n', distance: 2, level: 'character',
          objective: { kind: 'boss', id: 'crusade_templar', levelBonus: 1, promote: { rarity: 'crowned', stacks: 2 } },
          packsOverride: {
            count: [5, 7], size: [3, 4], table: [
              { id: 'crusade_footman', weight: 3 }, { id: 'crusade_zealot', weight: 2 },
              { id: 'crusade_arbalest', weight: 1 },
            ],
          },
          forceWaypoint: true,
          floating: true,
        },
        xp: 2000, gems: 6,
        turnInPrompt: 'The contract is closed — return, Exsanguinator.',
      },
    ],
  },
};

/** STONEWROUGHT — the Juggernaut's SECRET calling (the second hidden path):
 *  a Stonefather menhir remembers itself into highland and volcanic stone
 *  country. Stone Communion + raised cairns — the walking mountain, the
 *  mineral twin of the Greenwarden's walking forest. */
const STONEWROUGHT_LAYOUT = fan(130); // spine → for_start
const STONEWROUGHT: VocationDef = {
  id: 'stonewrought', name: 'Stonewrought',
  blurb: 'The mountain does not hurry, does not doubt, and does not move aside. Neither, now, do you.',
  color: '#b0a890',
  classId: 'juggernaut',
  secret: {
    site: {
      npc: 'stonefather_menhir',
      filter: { biomes: ['highland', 'volcanic'], minLevel: 24 },
      chance: 0.45,
      doodads: [
        { kind: 'rock', count: 5, radius: 90, size: [14, 20] },
        { kind: 'stone_cairn', count: 4, radius: 55, size: [8, 11] },
      ],
    },
    classLockedDiscovery: true,
    unlockedOffer: 'menu',
    offerFlavor: 'The menhir does not speak so much as WEIGH. "You stand like something worth carving," the pressure says. "Prove the stone remembers you."',
    discoveryText: 'The menhir grinds awake — the stone takes your measure.',
  },
  tree: [
    { id: 's1', name: 'Granite Skin', description: '20% increased armor', kind: 'small', ...STONEWROUGHT_LAYOUT.s1, mods: [mod('armor', 'increased', 0.2)], links: ['root'] },
    { id: 's2', name: 'Bones of the Hill', description: '+30 maximum life', kind: 'small', ...STONEWROUGHT_LAYOUT.s2, mods: [mod('life', 'flat', 30)], links: ['root'] },
    { id: 's3', name: 'Patient Weight', description: '20% increased stagger window', kind: 'small', ...STONEWROUGHT_LAYOUT.s3, mods: [mod('staggerWindow', 'increased', 0.2)], links: ['root'] },
    { id: 'n1', name: 'Stone Communion', description: 'Linger near living rock (cliffs, boulders, your own cairns) and take the mountain\'s patience: armor, poise, and quiet endurance', kind: 'notable', ...STONEWROUGHT_LAYOUT.n1, mods: [mod('attune_stone_communion', 'flat', 1)], links: ['s1'] },
    { id: 'n2', name: 'Cairnraiser', description: 'Waymarks of raised stone follow your steps and crumble behind you — the mountain travels with its child', kind: 'notable', ...STONEWROUGHT_LAYOUT.n2, mods: [mod('terraform_stone_cairns', 'flat', 1)], links: ['s1', 's3'] },
    { id: 'n3', name: "Mountain's Grip", description: '+40 knockback strength; 30% increased poise damage', kind: 'notable', ...STONEWROUGHT_LAYOUT.n3, mods: [mod('knockback', 'flat', 40), mod('poiseDamage', 'increased', 0.3)], links: ['s3', 's2'] },
    { id: 'n4', name: 'Bedrock Blood', description: '+3 life regeneration per second; 15% increased armor', kind: 'notable', ...STONEWROUGHT_LAYOUT.n4, mods: [mod('lifeRegen', 'flat', 3), mod('armor', 'increased', 0.15)], links: ['s2'] },
    { id: 'k1', name: 'The Mountain Walks', description: 'Your cairns rise twice as fast. While standing still: 20% more armor and 8% less damage taken', kind: 'keystone', ...STONEWROUGHT_LAYOUT.k1, mods: [mod('terraform_stone_cairns', 'flat', 1), mod('armor', 'more', 0.2, undefined, 'stationary'), mod('damageTaken', 'more', -0.08, undefined, 'stationary')], links: ['n2', 'n3'] },
  ],
  quest: {
    offerAtLevel: 28,
    steps: [
      {
        offerLabel: 'Quiet the hills that forgot their shape',
        zone: {
          tileset: 'highland', direction: 'e', distance: 1, level: 'character', anchor: 'accept',
          objective: { kind: 'clear' },
          packsOverride: {
            count: [6, 8], size: [3, 5], table: [
              { id: 'stone_golem', weight: 2 }, { id: 'stone_sentinel', weight: 2 },
              { id: 'gnoll_butcher', weight: 2 }, { id: 'troll_mauler', weight: 1 },
            ],
          },
          forceWaypoint: true,
        },
        xp: 800, gems: 3,
        turnInPrompt: 'The hills hold their shape — return to the menhir.',
      },
      {
        offerLabel: 'Endure the mountain\'s tantrum',
        zone: {
          tileset: 'volcanic', direction: 'e', distance: 2, level: 'character', anchor: 'accept',
          objective: { kind: 'waves', waves: 5 },
          packsOverride: {
            count: [5, 7], size: [3, 5], table: [
              { id: 'magma_worm', weight: 2 }, { id: 'fire_golem', weight: 1 },
              { id: 'ember_elemental', weight: 2 }, { id: 'cinder_fiend', weight: 2 },
            ],
          },
          forceWaypoint: true,
        },
        xp: 1200, gems: 4,
        turnInPrompt: 'The tantrum passed; you did not — return to the menhir.',
      },
      {
        offerLabel: 'Fell the Bone Colossus',
        zone: {
          tileset: 'tundra', direction: 'e', distance: 2, level: 'character', anchor: 'accept',
          objective: { kind: 'boss', id: 'bone_colossus', levelBonus: 1, promote: { rarity: 'crowned' } },
          forceWaypoint: true,
          floating: true,
        },
        xp: 2000, gems: 6,
        turnInPrompt: 'It fell; you stood — return, Stonewrought.',
      },
    ],
  },
};

/** HARBORWARDEN — the harbor's SECRET calling (data/harborholds.ts): a
 *  MOORING STONE stands on the quay of every port town whose siege was
 *  BROKEN — and it weighs anyone, whatever their class (the Stillmind's
 *  open-discovery law): the deed is the gate, not the blood. The chain
 *  opens only for those who have defended a harbor (ports_defended — run
 *  or account), and the tree is THE COMPANY: hired blades cheaper, hardier,
 *  lighter on the world's scales (mercEase — the true solo curve with your
 *  blades beside you), and at the keystone a SECOND contract fielded
 *  (mercRetinue — the one hire pipeline, twice). Veterans and retirement
 *  stay the wilds' rite — the warden commands blades; the wilds make them. */
const HARBORWARDEN_LAYOUT = fan(28); // spine → cha_start's quarter (offset from the Bannerlord's 10)
const HARBORWARDEN: VocationDef = {
  id: 'harborwarden', name: 'Harborwarden',
  blurb: 'A harbor is a promise kept against the tide. Keep enough of them and the blades start keeping you.',
  color: '#7fb0c8',
  classId: 'warlord',
  secret: {
    site: {
      npc: 'mooring_stone',
      filter: { harborhold: 'open' },
      chance: 1, // every STANDING town keeps its stone — the siege was the roll
      doodads: [
        { kind: 'cargo_stack', count: 3, radius: 70, size: [13, 17] },
        { kind: 'lantern_post', count: 2, radius: 46, size: [9, 11] },
      ],
    },
    classLockedDiscovery: false, // any class may hear it — the DEED gates, not the blood
    unlockedOffer: 'menu',
    offerFlavor: 'The mooring stone is worn smooth by ten thousand ropes. "Ships hold because something holds them," it says. "Show me you can hold more than one."',
    discoveryText: 'The mooring stone takes your measure — it remembers every siege this quay has outlived.',
  },
  tree: [
    { id: 's1', name: 'Dockside Ledger', description: 'Hires cost 10% less', kind: 'small', ...HARBORWARDEN_LAYOUT.s1, mods: [mod('mercHireDiscount', 'flat', 0.10)], links: ['root'] },
    { id: 's2', name: 'Sea Legs', description: '+25 maximum life', kind: 'small', ...HARBORWARDEN_LAYOUT.s2, mods: [mod('life', 'flat', 25)], links: ['root'] },
    { id: 's3', name: 'Harbor Watch', description: '12% increased armor', kind: 'small', ...HARBORWARDEN_LAYOUT.s3, mods: [mod('armor', 'increased', 0.12)], links: ['root'] },
    { id: 'n1', name: 'Fair Company', description: 'Your hired blades no longer harden the world — enemies scale as if you stood alone, company and all', kind: 'notable', ...HARBORWARDEN_LAYOUT.n1, mods: [mod('mercEase', 'flat', 1)], links: ['s1'] },
    { id: 'n2', name: 'Iron Company', description: 'Your hired blades gain 20% increased life and damage', kind: 'notable', ...HARBORWARDEN_LAYOUT.n2, mods: [mod('mercVigor', 'flat', 0.2)], links: ['s1', 's3'] },
    { id: 'n3', name: 'Shared Purse', description: 'Hires cost a further 15% less; 10% increased armor', kind: 'notable', ...HARBORWARDEN_LAYOUT.n3, mods: [mod('mercHireDiscount', 'flat', 0.15), mod('armor', 'increased', 0.1)], links: ['s3', 's2'] },
    { id: 'n4', name: "Warden's Table", description: '+30 maximum life; +2 life regeneration per second — the harbor feeds its warden', kind: 'notable', ...HARBORWARDEN_LAYOUT.n4, mods: [mod('life', 'flat', 30), mod('lifeRegen', 'flat', 2)], links: ['s2'] },
    { id: 'k1', name: 'The Free Company', description: 'Field a SECOND blade under contract — one more seat in your company, hired through the same muster', kind: 'keystone', ...HARBORWARDEN_LAYOUT.k1, mods: [mod('mercRetinue', 'flat', 1)], links: ['n1', 'n2'] },
  ],
  quest: {
    offerAtLevel: 12, // the harbor band — sieges are early-world content
    steps: [
      {
        offerLabel: 'Sweep the drowned shore before the next tide',
        requiresLedger: 'ports_defended',
        zone: {
          tileset: 'marsh', direction: 'e', distance: 1, level: 'character', anchor: 'accept',
          objective: { kind: 'clear' },
          packsOverride: {
            count: [6, 8], size: [3, 5], table: [
              { id: 'drowned_oarsman', weight: 3 }, { id: 'tidewrack_shambler', weight: 2 },
              { id: 'shore_crab', weight: 2 }, { id: 'barnacle_knight', weight: 1 },
            ],
          },
          forceWaypoint: true,
        },
        xp: 500, gems: 3,
        turnInPrompt: 'The shore is swept — return to the mooring stone.',
      },
      {
        offerLabel: 'Break the corsair muster on the downs',
        zone: {
          tileset: 'downs', direction: 'e', distance: 2, level: 'character', anchor: 'accept',
          objective: { kind: 'waves', waves: 5 },
          packsOverride: {
            count: [5, 7], size: [3, 5], table: [
              { id: 'bandit_cutthroat', weight: 3 }, { id: 'bandit_bruiser', weight: 2 },
              { id: 'bandit_matchlock', weight: 2 }, { id: 'bulwark_thane', weight: 1 },
            ],
          },
          forceWaypoint: true,
        },
        xp: 900, gems: 4,
        turnInPrompt: 'Their muster is broken; yours holds — return to the stone.',
      },
      {
        offerLabel: 'Fell the Tidebound Regent',
        zone: {
          tileset: 'marsh', direction: 'e', distance: 2, level: 'character', anchor: 'accept',
          objective: { kind: 'boss', id: 'tidebound_regent', levelBonus: 1, promote: { rarity: 'crowned' } },
          forceWaypoint: true,
          floating: true,
        },
        xp: 1600, gems: 6,
        turnInPrompt: 'The Regent is unbound; the harbors hold — return, Harborwarden.',
      },
    ],
  },
};

// --- THE COVERAGE PASS: every class carries a vocation line ------------------
// Fourteen chains (the thirteen vocation-less classes + the Hivecaller's),
// each leaning on its class's OWN fabric (grab, trapworks, mass, song,
// combo, timeflow, throng) and each UNLOCKED with its own texture: secret
// sites behind five different filters, a pilgrim chain that must be walked
// to every run, a chain any class may stumble into, escort work, survival
// recitals, meditation circuits, and one two-step duel at a barrow door.

const PACKWARDEN_LAYOUT = fan(225); // spine → wis_start (offset from the Gravebinder's 210)
const PACKWARDEN: VocationDef = {
  id: 'packwarden', name: 'Packwarden',
  blurb: 'The bond runs both ways and the pack knows it. Wilder companions, harder claims, and a den that heals as one body.',
  color: '#a8c87a',
  classId: 'tamer',
  secret: {
    site: {
      npc: 'pack_stone',
      filter: { biomes: ['taiga', 'forest'], minLevel: 18 },
      chance: 0.5,
    },
    classLockedDiscovery: true,
    unlockedOffer: 'menu',
    offerFlavor: '"Claw-marks older than any kingdom score this stone. Whatever sharpened itself here is watching you work — and it approves so far."',
    discoveryText: 'Something circles the stone at the edge of sight, keeping pace with you.',
  },
  tree: [
    { id: 's1', name: 'Denspeech', description: '20% increased companion damage', kind: 'small', ...PACKWARDEN_LAYOUT.s1, mods: [mod('minionDamage', 'increased', 0.2)], links: ['root'] },
    { id: 's2', name: 'Thick Pelt', description: 'Companions have 25% increased life', kind: 'small', ...PACKWARDEN_LAYOUT.s2, mods: [mod('minionLife', 'increased', 0.25)], links: ['root'] },
    { id: 's3', name: 'Loping Gait', description: '15% increased companion movement speed; 5% increased movement speed', kind: 'small', ...PACKWARDEN_LAYOUT.s3, mods: [mod('minionMoveSpeed', 'increased', 0.15), mod('moveSpeed', 'increased', 0.05)], links: ['root'] },
    { id: 'n1', name: 'Second Bond', description: '+1 maximum minion — the den holds another', kind: 'notable', ...PACKWARDEN_LAYOUT.n1, mods: [mod('minionMaxCount', 'flat', 1)], links: ['s1'] },
    { id: 'n2', name: 'Red in Tooth', description: 'Companions have 25% chance to Poison on hit; 15% increased companion damage', kind: 'notable', ...PACKWARDEN_LAYOUT.n2, mods: [mod('minionApply_poison', 'flat', 0.25), mod('minionDamage', 'increased', 0.15)], links: ['s1', 's3'] },
    { id: 'n3', name: 'Den-Mended', description: 'Companions regenerate 3% of their life per second', kind: 'notable', ...PACKWARDEN_LAYOUT.n3, mods: [mod('minionRegenPct', 'flat', 0.03)], links: ['s3', 's2'] },
    { id: 'n4', name: 'Warden\'s Hide', description: '+40 maximum life; 15% increased armor — the pack defends its keeper', kind: 'notable', ...PACKWARDEN_LAYOUT.n4, mods: [mod('life', 'flat', 40), mod('armor', 'increased', 0.15)], links: ['s2'] },
    { id: 'k1', name: 'One Body, Many Teeth', description: '20% more companion damage; companions fight on for 2 more seconds when slain', kind: 'keystone', ...PACKWARDEN_LAYOUT.k1, mods: [mod('minionDamage', 'more', 0.2), mod('minionUndying', 'flat', 2)], links: ['n2', 'n3'] },
  ],
  quest: {
    steps: [
      { offerLabel: 'Cull the rabid packs turning on their own runs',
        zone: { tileset: 'deepwood', direction: 'n', distance: 1, level: 'character',
          objective: { kind: 'clear' },
          packsOverride: { count: [6, 8], size: [3, 5], table: [
            { id: 'plains_wolf', weight: 3 }, { id: 'dire_wolf', weight: 2 }, { id: 'werewolf', weight: 1 } ] },
          forceWaypoint: true },
        xp: 800, gems: 3, turnInPrompt: 'The runs are quiet — return to the Pack-Stone\'s work.' },
      { offerLabel: 'Drive the moon-touched from the taiga dens',
        zone: { tileset: 'taiga', direction: 'n', distance: 2, level: 'character',
          objective: { kind: 'waves', waves: 3 },
          packsOverride: { count: [5, 7], size: [3, 5], table: [
            { id: 'werewolf', weight: 2 }, { id: 'dire_wolf', weight: 3 }, { id: 'plains_wolf', weight: 2 } ] },
          forceWaypoint: true },
        xp: 1200, gems: 4, turnInPrompt: 'The dens breathe easy — return to the quartermaster.' },
      { offerLabel: 'Face the Crowned Matron and take the den\'s blessing',
        zone: { tileset: 'deepwood', direction: 'n', distance: 2, level: 'character',
          objective: { kind: 'boss', id: 'den_matron', levelBonus: 1, promote: { rarity: 'crowned' } },
          forceWaypoint: true, floating: true },
        xp: 2000, gems: 6, turnInPrompt: 'The Matron yielded — return, Packwarden.' },
    ],
  },
};

const GROUNDBREAKER_LAYOUT = fan(105); // spine → str_start (offset from the Warbringer's 90)
const GROUNDBREAKER: VocationDef = {
  id: 'groundbreaker', name: 'Groundbreaker',
  blurb: 'Stances are load-bearing and so is the ground. Break both, then bill whatever is still standing.',
  color: '#c8824a',
  classId: 'breaker',
  tree: [
    { id: 's1', name: 'Wrecking Rhythm', description: '20% increased poise damage', kind: 'small', ...GROUNDBREAKER_LAYOUT.s1, mods: [mod('poiseDamage', 'increased', 0.2)], links: ['root'] },
    { id: 's2', name: 'Set Shoulders', description: '15% increased armor; +25 maximum life', kind: 'small', ...GROUNDBREAKER_LAYOUT.s2, mods: [mod('armor', 'increased', 0.15), mod('life', 'flat', 25)], links: ['root'] },
    { id: 's3', name: 'Wide Swing', description: '10% increased area of effect', kind: 'small', ...GROUNDBREAKER_LAYOUT.s3, mods: [mod('aoeRadius', 'increased', 0.1)], links: ['root'] },
    { id: 'n1', name: 'Faultfinder', description: 'Melee hits: 20% chance to Sunder; 15% increased poise damage', kind: 'notable', ...GROUNDBREAKER_LAYOUT.n1, mods: [mod('apply_sundered', 'flat', 0.2, ['melee']), mod('poiseDamage', 'increased', 0.15)], links: ['s1'] },
    { id: 'n2', name: 'Aftershock Doctrine', description: '25% increased stagger window; 10% increased area damage', kind: 'notable', ...GROUNDBREAKER_LAYOUT.n2, mods: [mod('staggerWindow', 'increased', 0.25), mod('damage', 'increased', 0.1, ['aoe'])], links: ['s1', 's3'] },
    { id: 'n3', name: 'Quarry Legs', description: '+30 knockback strength; 6% increased movement speed', kind: 'notable', ...GROUNDBREAKER_LAYOUT.n3, mods: [mod('knockback', 'flat', 30), mod('moveSpeed', 'increased', 0.06)], links: ['s3', 's2'] },
    { id: 'n4', name: 'Broken Before Billed', description: '25% increased damage against Sundered enemies', kind: 'notable', ...GROUNDBREAKER_LAYOUT.n4, mods: [mod('damageVs_sundered', 'flat', 0.25)], links: ['s2'] },
    { id: 'k1', name: 'The Ground Gives First', description: '15% more area damage; melee hits deal 20% more poise damage', kind: 'keystone', ...GROUNDBREAKER_LAYOUT.k1, mods: [mod('damage', 'more', 0.15, ['aoe']), mod('poiseDamage', 'more', 0.2, ['melee'])], links: ['n2', 'n3'] },
  ],
  quest: {
    steps: [
      { offerLabel: 'Shatter the resonant stones singing in the karst',
        zone: { tileset: 'karst_reach', direction: 'e', distance: 1, level: 'character',
          objective: { kind: 'spawners', spawnerId: 'resonant_stone', count: [3, 4] },
          forceWaypoint: true },
        xp: 800, gems: 3, turnInPrompt: 'The karst is silent — return to the quartermaster.' },
      { offerLabel: 'Bring down the stone court of the crown peaks',
        zone: { tileset: 'stonecrown', direction: 'e', distance: 2, level: 'character',
          objective: { kind: 'clear' },
          packsOverride: { count: [5, 7], size: [2, 4], table: [
            { id: 'stone_golem', weight: 2 }, { id: 'troll_mauler', weight: 2 }, { id: 'rockgrub', weight: 3 } ] },
          forceWaypoint: true },
        xp: 1200, gems: 4, turnInPrompt: 'The court is rubble — return to the quartermaster.' },
      { offerLabel: 'Fell the Crowned Colossus in the foothills',
        zone: { tileset: 'foothills', direction: 'e', distance: 2, level: 'character',
          objective: { kind: 'boss', id: 'stone_golem', levelBonus: 1, promote: { rarity: 'crowned' } },
          forceWaypoint: true, floating: true },
        xp: 2000, gems: 6, turnInPrompt: 'It broke first — return, Groundbreaker.' },
    ],
  },
};

const SPEARHEAD_LAYOUT = fan(75); // spine → str_start (the other shoulder of 90)
const SPEARHEAD: VocationDef = {
  id: 'spearhead', name: 'Spearhead',
  blurb: 'First through the gap, and the gap is wherever you say it is. Weight, momentum, and a line that advances because stopping never came up.',
  color: '#d8c07a',
  classId: 'vanguard',
  tree: [
    { id: 's1', name: 'Point of Contact', description: '15% increased melee damage; +20 knockback strength', kind: 'small', ...SPEARHEAD_LAYOUT.s1, mods: [mod('damage', 'increased', 0.15, ['melee']), mod('knockback', 'flat', 20)], links: ['root'] },
    { id: 's2', name: 'March Discipline', description: '8% increased movement speed', kind: 'small', ...SPEARHEAD_LAYOUT.s2, mods: [mod('moveSpeed', 'increased', 0.08)], links: ['root'] },
    { id: 's3', name: 'Shieldwall Shoulders', description: '15% increased armor; +25 maximum life', kind: 'small', ...SPEARHEAD_LAYOUT.s3, mods: [mod('armor', 'increased', 0.15), mod('life', 'flat', 25)], links: ['root'] },
    { id: 'n1', name: 'Thrown Gate', description: '+35% shove authority — the heavy learn to move for you', kind: 'notable', ...SPEARHEAD_LAYOUT.n1, mods: [mod('shoveAuthority', 'increased', 0.35)], links: ['s1'] },
    { id: 'n2', name: 'Momentum Ledger', description: '30% increased impact damage — walls, and whatever you put into them, pay out', kind: 'notable', ...SPEARHEAD_LAYOUT.n2, mods: [mod('impactDamage', 'increased', 0.3)], links: ['s1', 's2'] },
    { id: 'n3', name: 'Unbroken Column', description: '20% increased stagger window; 10% increased armor', kind: 'notable', ...SPEARHEAD_LAYOUT.n3, mods: [mod('staggerWindow', 'increased', 0.2), mod('armor', 'increased', 0.1)], links: ['s2', 's3'] },
    { id: 'n4', name: 'Breach Instinct', description: 'While moving: 10% increased melee damage; 5% increased movement speed', kind: 'notable', ...SPEARHEAD_LAYOUT.n4, mods: [mod('damage', 'increased', 0.1, ['melee'], 'moving'), mod('moveSpeed', 'increased', 0.05)], links: ['s3'] },
    { id: 'k1', name: 'The Gap Is a Door', description: 'While moving: 20% more melee damage. +40 knockback strength', kind: 'keystone', ...SPEARHEAD_LAYOUT.k1, mods: [mod('damage', 'more', 0.2, ['melee'], 'moving'), mod('knockback', 'flat', 40)], links: ['n2', 'n3'] },
  ],
  quest: {
    steps: [
      { offerLabel: 'Break OUT of the wasteland encirclement',
        zone: { tileset: 'wasteland', direction: 'w', distance: 1, level: 'character',
          objective: { kind: 'escape', interval: [4, 7] },
          forceWaypoint: true },
        xp: 800, gems: 3, turnInPrompt: 'You walked out the far side — return to the quartermaster.' },
      { offerLabel: 'Escort the relief column through bandit country',
        zone: { tileset: 'grassland', direction: 'w', distance: 2, level: 'character',
          objective: { kind: 'procession', robbers: [
            { id: 'bandit_cutthroat', weight: 3 }, { id: 'bandit_bruiser', weight: 2 }, { id: 'bandit_fusilier', weight: 1 } ] },
          forceWaypoint: true },
        xp: 1200, gems: 4, turnInPrompt: 'The column came through whole — return to the quartermaster.' },
      { offerLabel: 'Take the Crowned Keeper\'s palisade head-on',
        zone: { tileset: 'downs', direction: 'w', distance: 2, level: 'character',
          objective: { kind: 'boss', id: 'bandit_keeper', levelBonus: 1, promote: { rarity: 'crowned' } },
          forceWaypoint: true, floating: true },
        xp: 2000, gems: 6, turnInPrompt: 'The palisade has a hole in it now — return, Spearhead.' },
    ],
  },
};

const SWORDSAINT_LAYOUT = fan(35); // spine → prw_start (offset from the Bloodreaver's 50)
const SWORDSAINT: VocationDef = {
  id: 'swordsaint', name: 'Swordsaint',
  blurb: 'The sword as a sentence and the sentence as a life. A barrow keeps the old master\'s cadence; earn it in two strokes.',
  color: '#c8d8e8',
  classId: 'blademaster',
  secret: {
    site: {
      npc: 'barrow_stone',
      filter: { biomes: ['ossuary', 'sepulcher'], minLevel: 22 },
      chance: 0.45,
    },
    classLockedDiscovery: true,
    unlockedOffer: 'menu',
    offerFlavor: '"A sword is buried here point-down, and the door remembers every hand that failed the draw. Yours, it does not close against."',
    discoveryText: 'A barrow door stands ajar — steel keeps time somewhere below.',
  },
  tree: [
    { id: 's1', name: 'Measured Breath', description: '10% increased attack speed', kind: 'small', ...SWORDSAINT_LAYOUT.s1, mods: [mod('attackSpeed', 'increased', 0.1)], links: ['root'] },
    { id: 's2', name: 'Read the Wrist', description: '15% increased evasion', kind: 'small', ...SWORDSAINT_LAYOUT.s2, mods: [mod('evasion', 'increased', 0.15)], links: ['root'] },
    { id: 's3', name: 'Longer Cadence', description: '20% increased combo window — the measure forgives a late beat', kind: 'small', ...SWORDSAINT_LAYOUT.s3, mods: [mod('comboWindow', 'increased', 0.2)], links: ['root'] },
    { id: 'n1', name: 'Opening Read', description: 'Melee hits: 20% chance to apply Vulnerable', kind: 'notable', ...SWORDSAINT_LAYOUT.n1, mods: [mod('apply_vulnerable', 'flat', 0.2, ['melee'])], links: ['s1'] },
    { id: 'n2', name: 'The Third Stroke Settles', description: '30% increased combo window; 12% increased melee damage', kind: 'notable', ...SWORDSAINT_LAYOUT.n2, mods: [mod('comboWindow', 'increased', 0.3), mod('damage', 'increased', 0.12, ['melee'])], links: ['s3', 's1'] },
    { id: 'n3', name: 'Empty Scabbard Mind', description: '15% increased attack speed; 10% increased evasion', kind: 'notable', ...SWORDSAINT_LAYOUT.n3, mods: [mod('attackSpeed', 'increased', 0.15), mod('evasion', 'increased', 0.1)], links: ['s3', 's2'] },
    { id: 'n4', name: 'Duelist\'s Ledger', description: '25% increased damage against Vulnerable enemies', kind: 'notable', ...SWORDSAINT_LAYOUT.n4, mods: [mod('damageVs_vulnerable', 'flat', 0.25)], links: ['s2'] },
    { id: 'k1', name: 'One Perfect Stroke', description: '15% more melee damage; 30% increased damage against Vulnerable enemies; 10% increased attack speed', kind: 'keystone', ...SWORDSAINT_LAYOUT.k1, mods: [mod('damage', 'more', 0.15, ['melee']), mod('damageVs_vulnerable', 'flat', 0.3), mod('attackSpeed', 'increased', 0.1)], links: ['n2', 'n3'] },
  ],
  quest: {
    // The DUEL chain: two steps, heavier point payouts (3+3 = the same six
    // every three-step chain pays — the texture differs, the economy doesn't).
    steps: [
      { offerLabel: 'Silence the blade-wraiths rehearsing in the ossuary',
        zone: { tileset: 'ossuary', direction: 's', distance: 1, level: 'character',
          objective: { kind: 'clear' },
          packsOverride: { count: [5, 7], size: [2, 4], table: [
            { id: 'blade_wraith', weight: 3 }, { id: 'blade_swarm', weight: 2 }, { id: 'mirror_husk', weight: 1 } ] },
          forceWaypoint: true },
        xp: 1000, gems: 4, vocationPoints: 3,
        turnInPrompt: 'The rehearsal is over — the barrow door waits.' },
      { offerLabel: 'Answer the Barrow Swordsaint\'s draw',
        zone: { tileset: 'sepulcher_sands', direction: 's', distance: 2, level: 'character',
          objective: { kind: 'boss', id: 'barrow_swordsaint', levelBonus: 2 },
          forceWaypoint: true, floating: true, wpExclusionRadius: 1 },
        xp: 2400, gems: 6, vocationPoints: 3,
        turnInPrompt: 'The old master bows — return, Swordsaint.' },
    ],
  },
};

const PITFIGHTER_LAYOUT = fan(65); // spine → prw_start (the other fist of 50)
const PITFIGHTER: VocationDef = {
  id: 'pitfighter', name: 'Pitfighter',
  blurb: 'The pit\'s arithmetic, formalized: hands that hold, hips that answer, and a crowd that only respects what gets back up.',
  color: '#d8885a',
  classId: 'brawler',
  tree: [
    { id: 's1', name: 'Knuckle Rhythm', description: '12% increased attack speed', kind: 'small', ...PITFIGHTER_LAYOUT.s1, mods: [mod('attackSpeed', 'increased', 0.12)], links: ['root'] },
    { id: 's2', name: 'Corner Cutman', description: '+30 maximum life; +2 life regeneration per second', kind: 'small', ...PITFIGHTER_LAYOUT.s2, mods: [mod('life', 'flat', 30), mod('lifeRegen', 'flat', 2)], links: ['root'] },
    { id: 's3', name: 'Low Center', description: '15% increased grip power', kind: 'small', ...PITFIGHTER_LAYOUT.s3, mods: [mod('gripPower', 'increased', 0.15)], links: ['root'] },
    { id: 'n1', name: 'Iron Clinch', description: '30% increased grip power — what you catch, stays caught', kind: 'notable', ...PITFIGHTER_LAYOUT.n1, mods: [mod('gripPower', 'increased', 0.3)], links: ['s3'] },
    { id: 'n2', name: 'Slippery When Held', description: '40% increased wriggle — nothing keeps YOU, either', kind: 'notable', ...PITFIGHTER_LAYOUT.n2, mods: [mod('wriggle', 'increased', 0.4)], links: ['s3', 's2'] },
    { id: 'n3', name: 'Crowd-Pleaser', description: 'Melee hits: 15% chance to apply Vulnerable; 10% increased melee damage', kind: 'notable', ...PITFIGHTER_LAYOUT.n3, mods: [mod('apply_vulnerable', 'flat', 0.15, ['melee']), mod('damage', 'increased', 0.1, ['melee'])], links: ['s1'] },
    { id: 'n4', name: 'Takedown Artist', description: 'Gain the Takedown measure (seize, then throw, and the crowd pays out) — the Grappler\'s Rhythm combo', kind: 'notable', ...PITFIGHTER_LAYOUT.n4, mods: [mod('combo_grapplers_rhythm', 'flat', 1)], links: ['s1', 's2'] },
    { id: 'k1', name: 'Last One Standing', description: '15% more melee damage; +40 maximum life; 20% increased grip power', kind: 'keystone', ...PITFIGHTER_LAYOUT.k1, mods: [mod('damage', 'more', 0.15, ['melee']), mod('life', 'flat', 40), mod('gripPower', 'increased', 0.2)], links: ['n3', 'n4'] },
  ],
  quest: {
    steps: [
      { offerLabel: 'Survive four rounds in the grand arena',
        zone: { tileset: 'grand_arena', direction: 's', distance: 1, level: 'character',
          objective: { kind: 'waves', waves: 4 }, special: true,
          forceWaypoint: true },
        xp: 800, gems: 3, turnInPrompt: 'Four rounds, one you — return to the quartermaster.' },
      { offerLabel: 'Teach the gripping kin what hands are for',
        zone: { tileset: 'mire', direction: 's', distance: 2, level: 'character',
          objective: { kind: 'clear' },
          packsOverride: { count: [5, 7], size: [2, 4], table: [
            { id: 'gaff_wrangler', weight: 3 }, { id: 'yoke_mauler', weight: 2 }, { id: 'gorge_gulper', weight: 1 } ] },
          forceWaypoint: true },
        xp: 1200, gems: 4, turnInPrompt: 'They understand now — return to the quartermaster.' },
      { offerLabel: 'Throw the Crowned Mauler in its own pit',
        zone: { tileset: 'grand_arena', direction: 's', distance: 2, level: 'character',
          objective: { kind: 'boss', id: 'yoke_mauler', levelBonus: 1, promote: { rarity: 'crowned' } },
          special: true, forceWaypoint: true, floating: true },
        xp: 2000, gems: 6, turnInPrompt: 'It stayed down — return, Pitfighter.' },
    ],
  },
};

const THORNWALL_LAYOUT = fan(115); // spine → for_start (offset from the Bastion's 130)
const THORNWALL: VocationDef = {
  id: 'thornwall', name: 'Thornwall',
  blurb: 'Hitting you was always the mistake; now it is an itemized invoice. Quills, spite, and a wall that bills by the blow.',
  color: '#9ab0a8',
  classId: 'sentinel',
  tree: [
    { id: 's1', name: 'First Quill', description: '+15 thorns', kind: 'small', ...THORNWALL_LAYOUT.s1, mods: [mod('thorns', 'flat', 15)], links: ['root'] },
    { id: 's2', name: 'Set Footing', description: '15% increased armor', kind: 'small', ...THORNWALL_LAYOUT.s2, mods: [mod('armor', 'increased', 0.15)], links: ['root'] },
    { id: 's3', name: 'Deep Roots', description: '+30 maximum life', kind: 'small', ...THORNWALL_LAYOUT.s3, mods: [mod('life', 'flat', 30)], links: ['root'] },
    { id: 'n1', name: 'Bristling Ledger', description: '+30 thorns; 10% increased armor', kind: 'notable', ...THORNWALL_LAYOUT.n1, mods: [mod('thorns', 'flat', 30), mod('armor', 'increased', 0.1)], links: ['s1'] },
    { id: 'n2', name: 'Barbed Answer', description: 'Melee hits: 20% chance to Root — stand still and be billed', kind: 'notable', ...THORNWALL_LAYOUT.n2, mods: [mod('apply_rooted', 'flat', 0.2, ['melee'])], links: ['s1', 's2'] },
    { id: 'n3', name: 'Paid in Kind', description: '25% increased damage against Rooted enemies', kind: 'notable', ...THORNWALL_LAYOUT.n3, mods: [mod('damageVs_rooted', 'flat', 0.25)], links: ['s2', 's3'] },
    { id: 'n4', name: 'Living Palisade', description: '+3 life regeneration per second; 15% increased stagger window', kind: 'notable', ...THORNWALL_LAYOUT.n4, mods: [mod('lifeRegen', 'flat', 3), mod('staggerWindow', 'increased', 0.15)], links: ['s3'] },
    { id: 'k1', name: 'The Wall Collects', description: '+60 thorns; 15% increased armor; +30 maximum life', kind: 'keystone', ...THORNWALL_LAYOUT.k1, mods: [mod('thorns', 'flat', 60), mod('armor', 'increased', 0.15), mod('life', 'flat', 30)], links: ['n2', 'n3'] },
  ],
  quest: {
    steps: [
      { offerLabel: 'Clear the briar-maulers from the petrified weald',
        zone: { tileset: 'petrified_weald', direction: 'e', distance: 1, level: 'character',
          objective: { kind: 'clear' },
          packsOverride: { count: [6, 8], size: [3, 5], table: [
            { id: 'thorn_sprite', weight: 3 }, { id: 'briar_beast', weight: 2 } ] },
          forceWaypoint: true },
        xp: 800, gems: 3, turnInPrompt: 'The weald is passable — return to the quartermaster.' },
      { offerLabel: 'Hold the mournstead crossroads through the night\'s waves',
        zone: { tileset: 'mournstead', direction: 'e', distance: 2, level: 'character',
          objective: { kind: 'waves', waves: 4 },
          forceWaypoint: true },
        xp: 1200, gems: 4, turnInPrompt: 'The crossroads held — return to the quartermaster.' },
      { offerLabel: 'Let the Crowned Briar-Beast break itself on you',
        zone: { tileset: 'gloamwood', direction: 'e', distance: 2, level: 'character',
          objective: { kind: 'boss', id: 'briar_beast', levelBonus: 1, promote: { rarity: 'crowned' } },
          forceWaypoint: true, floating: true },
        xp: 2000, gems: 6, turnInPrompt: 'It broke; you stood — return, Thornwall.' },
    ],
  },
};

const IMPALER_LAYOUT = fan(345); // spine → dex_start (offset from the Wildstalker's 330)
const IMPALER: VocationDef = {
  id: 'impaler', name: 'Impaler',
  blurb: 'Leave steel in every wound and call it home through the crowd. The field is a fence-line waiting for posts.',
  color: '#b8c8a0',
  classId: 'lancer',
  tree: [
    { id: 's1', name: 'Long Arm', description: '15% increased projectile damage', kind: 'small', ...IMPALER_LAYOUT.s1, mods: [mod('damage', 'increased', 0.15, ['projectile'])], links: ['root'] },
    { id: 's2', name: 'Follow-Through', description: '15% increased projectile speed', kind: 'small', ...IMPALER_LAYOUT.s2, mods: [mod('projectileSpeed', 'increased', 0.15)], links: ['root'] },
    { id: 's3', name: 'Planted Stance', description: '10% increased armor; +20 maximum life', kind: 'small', ...IMPALER_LAYOUT.s3, mods: [mod('armor', 'increased', 0.1), mod('life', 'flat', 20)], links: ['root'] },
    { id: 'n1', name: 'Pinning Word', description: 'Projectiles: 20% chance to Root', kind: 'notable', ...IMPALER_LAYOUT.n1, mods: [mod('apply_rooted', 'flat', 0.2, ['projectile'])], links: ['s1'] },
    { id: 'n2', name: 'Fencepost Doctrine', description: '30% increased damage against Rooted enemies', kind: 'notable', ...IMPALER_LAYOUT.n2, mods: [mod('damageVs_rooted', 'flat', 0.3)], links: ['s1', 's2'] },
    { id: 'n3', name: 'Wrenching Recall', description: '15% increased projectile damage; 10% increased attack speed', kind: 'notable', ...IMPALER_LAYOUT.n3, mods: [mod('damage', 'increased', 0.15, ['projectile']), mod('attackSpeed', 'increased', 0.1)], links: ['s2', 's3'] },
    { id: 'n4', name: 'Skewer the Charge', description: '+30 knockback strength; 15% increased stagger window', kind: 'notable', ...IMPALER_LAYOUT.n4, mods: [mod('knockback', 'flat', 30), mod('staggerWindow', 'increased', 0.15)], links: ['s3'] },
    { id: 'k1', name: 'The Harvest Comes Home', description: '20% more projectile damage against Rooted enemies... and everything else pays 10% more', kind: 'keystone', ...IMPALER_LAYOUT.k1, mods: [mod('damageVs_rooted', 'flat', 0.2), mod('damage', 'more', 0.1, ['projectile'])], links: ['n2', 'n3'] },
  ],
  quest: {
    steps: [
      { offerLabel: 'Break the chitin lancer-lines drilling on the sands',
        zone: { tileset: 'hivesands', direction: 'w', distance: 1, level: 'character',
          objective: { kind: 'clear' },
          packsOverride: { count: [6, 8], size: [3, 5], table: [
            { id: 'chitin_lancer', weight: 3 }, { id: 'chitin_drone', weight: 2 }, { id: 'chitin_spitter', weight: 1 } ] },
          forceWaypoint: true },
        xp: 800, gems: 3, turnInPrompt: 'Their line is fenceposts now — return to the quartermaster.' },
      { offerLabel: 'Spike the birthing pods before the tide hatches',
        zone: { tileset: 'marsh', direction: 'w', distance: 2, level: 'character',
          objective: { kind: 'spawners', spawnerId: 'birthing_pod', count: [3, 4] },
          forceWaypoint: true },
        xp: 1200, gems: 4, turnInPrompt: 'Nothing hatched — return to the quartermaster.' },
      { offerLabel: 'Pin the Constrictor Knight to its own tangle',
        zone: { tileset: 'mangrove_tangle', direction: 'w', distance: 2, level: 'character',
          objective: { kind: 'boss', id: 'constrictor_knight', levelBonus: 1 },
          forceWaypoint: true, floating: true },
        xp: 2000, gems: 6, turnInPrompt: 'It hangs where you left it — return, Impaler.' },
    ],
  },
};

const ENGINEWRIGHT_LAYOUT = fan(315); // spine → dex_start (the workshop side of 330)
const ENGINEWRIGHT: VocationDef = {
  id: 'enginewright', name: 'Enginewright',
  blurb: 'The battlefield is a workshop and the ruins are a syllabus. Faster rearms, crueler payloads, and ground that argues on your behalf.',
  color: '#a8905a',
  classId: 'trapper',
  secret: {
    site: {
      npc: 'gearwright_wreck',
      filter: { biomes: ['jungle', 'ruin'], minLevel: 16 },
      chance: 0.5,
    },
    classLockedDiscovery: true,
    unlockedOffer: 'menu',
    offerFlavor: '"Half a machine older than the ruin around it — and its living half still clicks when YOU walk past. It has work for hands like yours."',
    discoveryText: 'Something in the wreck begins, very quietly, to tick.',
  },
  tree: [
    { id: 's1', name: 'Oiled Springs', description: '12% increased cooldown recovery', kind: 'small', ...ENGINEWRIGHT_LAYOUT.s1, mods: [mod('cooldownRecovery', 'increased', 0.12)], links: ['root'] },
    { id: 's2', name: 'Wider Blast Bore', description: '12% increased area of effect', kind: 'small', ...ENGINEWRIGHT_LAYOUT.s2, mods: [mod('aoeRadius', 'increased', 0.12)], links: ['root'] },
    { id: 's3', name: 'Field Kit', description: '10% increased mine and trap damage', kind: 'small', ...ENGINEWRIGHT_LAYOUT.s3, mods: [mod('damage', 'increased', 0.1, ['mine']), mod('damage', 'increased', 0.1, ['trap'])], links: ['root'] },
    { id: 'n1', name: 'Double Charge', description: '20% increased mine damage; 10% increased area of effect', kind: 'notable', ...ENGINEWRIGHT_LAYOUT.n1, mods: [mod('damage', 'increased', 0.2, ['mine']), mod('aoeRadius', 'increased', 0.1)], links: ['s3'] },
    { id: 'n2', name: 'Tripwire Patience', description: '20% increased trap damage; 15% increased status magnitude', kind: 'notable', ...ENGINEWRIGHT_LAYOUT.n2, mods: [mod('damage', 'increased', 0.2, ['trap']), mod('statusMagnitude', 'increased', 0.15)], links: ['s3', 's2'] },
    { id: 'n3', name: 'Rapid Rearm', description: '20% increased cooldown recovery', kind: 'notable', ...ENGINEWRIGHT_LAYOUT.n3, mods: [mod('cooldownRecovery', 'increased', 0.2)], links: ['s1'] },
    { id: 'n4', name: 'Sapper\'s Instinct', description: '10% increased movement speed; 15% increased evasion — never beside your own work when it goes off', kind: 'notable', ...ENGINEWRIGHT_LAYOUT.n4, mods: [mod('moveSpeed', 'increased', 0.1), mod('evasion', 'increased', 0.15)], links: ['s1', 's2'] },
    { id: 'k1', name: 'The Ground Does the Arguing', description: '20% more mine and trap damage', kind: 'keystone', ...ENGINEWRIGHT_LAYOUT.k1, mods: [mod('damage', 'more', 0.2, ['mine']), mod('damage', 'more', 0.2, ['trap'])], links: ['n1', 'n2'] },
  ],
  quest: {
    steps: [
      { offerLabel: 'Walk OUT of the toothed halls with the wreck\'s prize',
        zone: { tileset: 'sunken_ruin', direction: 's', distance: 1, level: 'character',
          objective: { kind: 'escape', interval: [4, 6] },
          forceWaypoint: true },
        xp: 800, gems: 3, turnInPrompt: 'You kept your feet — the wreck approves.' },
      { offerLabel: 'Dismantle the ruin\'s living sentries for parts',
        zone: { tileset: 'sunken_ruin', direction: 's', distance: 2, level: 'character',
          objective: { kind: 'clear' },
          packsOverride: { count: [5, 7], size: [2, 4], table: [
            { id: 'ruin_sentinel', weight: 3 }, { id: 'brass_sentinel', weight: 1 }, { id: 'stone_sentinel', weight: 2 } ] },
          forceWaypoint: true },
        xp: 1200, gems: 4, turnInPrompt: 'Parts acquired — return to the quartermaster.' },
      { offerLabel: 'Overload the Crowned Sentinel at the heart of the works',
        zone: { tileset: 'sunken_ruin', direction: 's', distance: 2, level: 'character',
          objective: { kind: 'boss', id: 'ruin_sentinel', levelBonus: 1, promote: { rarity: 'crowned' } },
          forceWaypoint: true, floating: true },
        xp: 2000, gems: 6, turnInPrompt: 'The works are yours — return, Enginewright.' },
    ],
  },
};

const BANNERLORD_LAYOUT = fan(10); // spine → cha_start
const BANNERLORD: VocationDef = {
  id: 'bannerlord', name: 'Bannerlord',
  blurb: 'Wars are won by whoever the field believes in. Plant the colors, hold the road, and make belief a line item.',
  color: '#e0b060',
  classId: 'warlord',
  tree: [
    { id: 's1', name: 'Parade Voice', description: '15% increased warcry cooldown recovery', kind: 'small', ...BANNERLORD_LAYOUT.s1, mods: [mod('cooldownRecovery', 'increased', 0.15, ['warcry'])], links: ['root'] },
    { id: 's2', name: 'Standard-Bearer\'s Arm', description: '12% increased damage', kind: 'small', ...BANNERLORD_LAYOUT.s2, mods: [mod('damage', 'increased', 0.12)], links: ['root'] },
    { id: 's3', name: 'Command Presence', description: '+20 insight; +20 maximum life', kind: 'small', ...BANNERLORD_LAYOUT.s3, mods: [mod('insight', 'flat', 20), mod('life', 'flat', 20)], links: ['root'] },
    { id: 'n1', name: 'The Colors Hold', description: '15% increased armor; 15% increased stagger window', kind: 'notable', ...BANNERLORD_LAYOUT.n1, mods: [mod('armor', 'increased', 0.15), mod('staggerWindow', 'increased', 0.15)], links: ['s3'] },
    { id: 'n2', name: 'Named and Doomed', description: 'Warcries: 25% chance to apply Vulnerable — what the voice singles out, the field finishes', kind: 'notable', ...BANNERLORD_LAYOUT.n2, mods: [mod('apply_vulnerable', 'flat', 0.25, ['warcry'])], links: ['s1', 's2'] },
    { id: 'n3', name: 'Rout Arithmetic', description: '25% increased damage against Vulnerable enemies', kind: 'notable', ...BANNERLORD_LAYOUT.n3, mods: [mod('damageVs_vulnerable', 'flat', 0.25)], links: ['s2'] },
    { id: 'n4', name: 'Longer Reveille', description: '20% increased warcry cooldown recovery; +15 insight', kind: 'notable', ...BANNERLORD_LAYOUT.n4, mods: [mod('cooldownRecovery', 'increased', 0.2, ['warcry']), mod('insight', 'flat', 15)], links: ['s1'] },
    { id: 'k1', name: 'The Field Believes', description: '15% more damage; +30 insight — presence, weaponized', kind: 'keystone', ...BANNERLORD_LAYOUT.k1, mods: [mod('damage', 'more', 0.15), mod('insight', 'flat', 30)], links: ['n2', 'n3'] },
  ],
  quest: {
    steps: [
      { offerLabel: 'Escort the colors down the contested road',
        zone: { tileset: 'downs', direction: 'n', distance: 1, level: 'character',
          objective: { kind: 'procession', robbers: [
            { id: 'bandit_matchlock', weight: 2 }, { id: 'bandit_cutthroat', weight: 3 }, { id: 'bandit_grenadier', weight: 1 } ] },
          forceWaypoint: true },
        xp: 800, gems: 3, turnInPrompt: 'The colors arrived flying — return to the quartermaster.' },
      { offerLabel: 'Hold the muster field through five assaults',
        zone: { tileset: 'grassland', direction: 'n', distance: 2, level: 'character',
          objective: { kind: 'waves', waves: 5 },
          forceWaypoint: true },
        xp: 1200, gems: 4, turnInPrompt: 'Five assaults, one field, your colors — return home.' },
      { offerLabel: 'Depose the Crowned Chief and take his warband\'s oath',
        zone: { tileset: 'hell_steppes', direction: 'n', distance: 2, level: 'character',
          objective: { kind: 'boss', id: 'goblin_chief', levelBonus: 1, promote: { rarity: 'crowned' } },
          forceWaypoint: true, floating: true },
        xp: 2000, gems: 6, turnInPrompt: 'They kneel to your banner now — return, Bannerlord.' },
    ],
  },
};

const WARCHANTER_LAYOUT = fan(20); // spine → cha_start (a half-step off the Bannerlord)
const WARCHANTER: VocationDef = {
  id: 'warchanter', name: 'Warchanter',
  blurb: 'The battle keeps time whether it wants to or not — and the meter always resolves. Longer songs, crueler refrains, a Coda worth the wait.',
  color: '#c890d8',
  classId: 'skald',
  tree: [
    { id: 's1', name: 'Trained Diaphragm', description: '12% increased song damage', kind: 'small', ...WARCHANTER_LAYOUT.s1, mods: [mod('damage', 'increased', 0.12, ['song'])], links: ['root'] },
    { id: 's2', name: 'Carrying Voice', description: '12% increased area of effect', kind: 'small', ...WARCHANTER_LAYOUT.s2, mods: [mod('aoeRadius', 'increased', 0.12)], links: ['root'] },
    { id: 's3', name: 'Steady Meter', description: '10% increased cast speed', kind: 'small', ...WARCHANTER_LAYOUT.s3, mods: [mod('castSpeed', 'increased', 0.1)], links: ['root'] },
    { id: 'n1', name: 'The Drumbeat', description: 'Gain the Drumbeat measure — cadence itself pays out (the combo grammar reads your casts)', kind: 'notable', ...WARCHANTER_LAYOUT.n1, mods: [mod('combo_drumbeat', 'flat', 1)], links: ['s3'] },
    { id: 'n2', name: 'Cruel Refrain', description: '20% increased song damage; 15% increased status magnitude', kind: 'notable', ...WARCHANTER_LAYOUT.n2, mods: [mod('damage', 'increased', 0.2, ['song']), mod('statusMagnitude', 'increased', 0.15)], links: ['s1', 's2'] },
    { id: 'n3', name: 'Wide Chorus', description: '15% increased area of effect; 8% increased cast speed', kind: 'notable', ...WARCHANTER_LAYOUT.n3, mods: [mod('aoeRadius', 'increased', 0.15), mod('castSpeed', 'increased', 0.08)], links: ['s2'] },
    { id: 'n4', name: 'Longer Held Note', description: '20% increased combo window; 10% increased song damage', kind: 'notable', ...WARCHANTER_LAYOUT.n4, mods: [mod('comboWindow', 'increased', 0.2), mod('damage', 'increased', 0.1, ['song'])], links: ['s3', 's1'] },
    { id: 'k1', name: 'The Meter Resolves', description: '20% more song damage; 15% increased area of effect', kind: 'keystone', ...WARCHANTER_LAYOUT.k1, mods: [mod('damage', 'more', 0.2, ['song']), mod('aoeRadius', 'increased', 0.15)], links: ['n2', 'n4'] },
  ],
  quest: {
    steps: [
      { offerLabel: 'Perform through four movements at the mournstead recital',
        zone: { tileset: 'mournstead', direction: 'e', distance: 1, level: 'character',
          objective: { kind: 'waves', waves: 4, bossEveryWaves: 2, bossId: 'banshee' },
          forceWaypoint: true },
        xp: 800, gems: 3, turnInPrompt: 'The recital survived its critics — return to the quartermaster.' },
      { offerLabel: 'Silence the discordant choir in the gloam',
        zone: { tileset: 'gloamwood', direction: 'e', distance: 2, level: 'character',
          objective: { kind: 'clear' },
          packsOverride: { count: [5, 7], size: [3, 4], table: [
            { id: 'banshee', weight: 2 }, { id: 'decay_wraith', weight: 2 }, { id: 'spirit_wisp', weight: 2 } ] },
          forceWaypoint: true },
        xp: 1200, gems: 4, turnInPrompt: 'Only your song remains — return to the quartermaster.' },
      { offerLabel: 'Out-play the Wraith Piper at its own wake',
        zone: { tileset: 'mournstead', direction: 'e', distance: 2, level: 'character',
          objective: { kind: 'boss', id: 'wraith_piper', levelBonus: 1 },
          forceWaypoint: true, floating: true },
        xp: 2000, gems: 6, turnInPrompt: 'The Piper yields the stage — return, Warchanter.' },
    ],
  },
};

const VEILWEAVER_LAYOUT = fan(0); // spine → cha_start (the misdirected third of the trio)
const VEILWEAVER: VocationDef = {
  id: 'veilweaver', name: 'Veilweaver',
  blurb: 'Never be where the blow lands; ideally be three other places instead. Doubles, addled hands, and an audience that swings at smoke.',
  color: '#b878c8',
  classId: 'beguiler',
  tree: [
    { id: 's1', name: 'Soft Footfall', description: '15% increased evasion', kind: 'small', ...VEILWEAVER_LAYOUT.s1, mods: [mod('evasion', 'increased', 0.15)], links: ['root'] },
    { id: 's2', name: 'Patter', description: '10% increased cast speed', kind: 'small', ...VEILWEAVER_LAYOUT.s2, mods: [mod('castSpeed', 'increased', 0.1)], links: ['root'] },
    { id: 's3', name: 'Slipping Silhouette', description: '6% increased movement speed', kind: 'small', ...VEILWEAVER_LAYOUT.s3, mods: [mod('moveSpeed', 'increased', 0.06)], links: ['root'] },
    { id: 'n1', name: 'Turned Ankle, Turned Mind', description: 'Hits: 15% chance to Disorient — the crowd loses the thread', kind: 'notable', ...VEILWEAVER_LAYOUT.n1, mods: [mod('apply_disoriented', 'flat', 0.15)], links: ['s2'] },
    { id: 'n2', name: 'Smoke Ledger', description: '20% increased evasion; 15% increased status magnitude', kind: 'notable', ...VEILWEAVER_LAYOUT.n2, mods: [mod('evasion', 'increased', 0.2), mod('statusMagnitude', 'increased', 0.15)], links: ['s1', 's2'] },
    { id: 'n3', name: 'Exit, Pursued by Nothing', description: '8% increased movement speed; 10% increased evasion', kind: 'notable', ...VEILWEAVER_LAYOUT.n3, mods: [mod('moveSpeed', 'increased', 0.08), mod('evasion', 'increased', 0.1)], links: ['s3'] },
    { id: 'n4', name: 'Punish the Lunge', description: '25% increased damage against Disoriented enemies', kind: 'notable', ...VEILWEAVER_LAYOUT.n4, mods: [mod('damageVs_disoriented', 'flat', 0.25)], links: ['s1', 's3'] },
    { id: 'k1', name: 'The House Always Misses', description: '15% more damage against Disoriented enemies; 15% increased evasion', kind: 'keystone', ...VEILWEAVER_LAYOUT.k1, mods: [mod('damageVs_disoriented', 'flat', 0.15), mod('damage', 'more', 0.1), mod('evasion', 'increased', 0.15)], links: ['n2', 'n4'] },
  ],
  quest: {
    steps: [
      { offerLabel: 'Unmask the mirage court dancing on the sandsea',
        zone: { tileset: 'sandsea', direction: 'w', distance: 1, level: 'character',
          objective: { kind: 'clear' },
          packsOverride: { count: [5, 7], size: [3, 4], table: [
            { id: 'mirage_dancer', weight: 3 }, { id: 'heat_double', weight: 2 }, { id: 'mirror_husk', weight: 1 } ] },
          forceWaypoint: true },
        xp: 800, gems: 3, turnInPrompt: 'Every mask came off — return to the quartermaster.' },
      { offerLabel: 'Walk out of the desert that keeps lying to you',
        zone: { tileset: 'desert', direction: 'w', distance: 2, level: 'character',
          objective: { kind: 'escape', interval: [4, 6] },
          forceWaypoint: true },
        xp: 1200, gems: 4, turnInPrompt: 'The desert blinked first — return to the quartermaster.' },
      { offerLabel: 'Beguile the Mirage Khagan under his own sun',
        zone: { tileset: 'sandsea', direction: 'w', distance: 2, level: 'character',
          objective: { kind: 'boss', id: 'mirage_khagan', levelBonus: 1 },
          forceWaypoint: true, floating: true },
        xp: 2000, gems: 6, turnInPrompt: 'The Khagan bowed to an empty robe — return, Veilweaver.' },
    ],
  },
};

const CHRONARCH_LAYOUT = fan(265); // spine → wil_start (offset from the Hierophant's 250)
const CHRONARCH: VocationDef = {
  id: 'chronarch', name: 'Chronarch',
  blurb: 'Time is a budget and everyone else is overdrawn. Wound the clock, pocket the change, and be early to every ending.',
  color: '#88d8d8',
  classId: 'chronomancer',
  tree: [
    { id: 's1', name: 'Borrowed Second', description: '12% increased cooldown recovery', kind: 'small', ...CHRONARCH_LAYOUT.s1, mods: [mod('cooldownRecovery', 'increased', 0.12)], links: ['root'] },
    { id: 's2', name: 'Quick Hands', description: '10% increased cast speed', kind: 'small', ...CHRONARCH_LAYOUT.s2, mods: [mod('castSpeed', 'increased', 0.1)], links: ['root'] },
    { id: 's3', name: 'Patient Ledger', description: '+15 insight; +20 maximum mana', kind: 'small', ...CHRONARCH_LAYOUT.s3, mods: [mod('insight', 'flat', 15), mod('mana', 'flat', 20)], links: ['root'] },
    { id: 'n1', name: 'Needle of Stillness', description: 'Spells: 12% chance to apply Stasis', kind: 'notable', ...CHRONARCH_LAYOUT.n1, mods: [mod('apply_stasis', 'flat', 0.12, ['spell'])], links: ['s2'] },
    { id: 'n2', name: 'Collect on the Pause', description: '30% increased damage against enemies in Stasis', kind: 'notable', ...CHRONARCH_LAYOUT.n2, mods: [mod('damageVs_stasis', 'flat', 0.3)], links: ['s1', 's2'] },
    { id: 'n3', name: 'Compound Interest', description: '20% increased cooldown recovery', kind: 'notable', ...CHRONARCH_LAYOUT.n3, mods: [mod('cooldownRecovery', 'increased', 0.2)], links: ['s1'] },
    { id: 'n4', name: 'Early to Every Ending', description: '10% increased cast speed; 6% increased movement speed', kind: 'notable', ...CHRONARCH_LAYOUT.n4, mods: [mod('castSpeed', 'increased', 0.1), mod('moveSpeed', 'increased', 0.06)], links: ['s3'] },
    { id: 'k1', name: 'The Clock Owes You', description: '15% more spell damage; 15% increased cooldown recovery', kind: 'keystone', ...CHRONARCH_LAYOUT.k1, mods: [mod('damage', 'more', 0.15, ['spell']), mod('cooldownRecovery', 'increased', 0.15)], links: ['n2', 'n3'] },
  ],
  quest: {
    // The PATIENT chain: surfaces ten levels after every other vocation —
    // a chronomancer's trial should itself arrive late and be worth it.
    offerAtLevel: 40,
    steps: [
      { offerLabel: 'Still the leyline nexus that will not stop happening',
        zone: { tileset: 'leyline_nexus', direction: 'n', distance: 1, level: 'character',
          objective: { kind: 'clear' },
          forceWaypoint: true },
        xp: 1000, gems: 3, turnInPrompt: 'The nexus settles into one single now — return home.' },
      { offerLabel: 'Shatter the resonant stones counting the wrong hours',
        zone: { tileset: 'crystal', direction: 'n', distance: 2, level: 'character',
          objective: { kind: 'spawners', spawnerId: 'resonant_stone', count: [3, 4] },
          forceWaypoint: true },
        xp: 1400, gems: 4, turnInPrompt: 'The hours run true — return to the quartermaster.' },
      { offerLabel: 'Unseat the Oblivion Knight from the moment it holds',
        zone: { tileset: 'abyssal_rift', direction: 'n', distance: 2, level: 'character',
          objective: { kind: 'boss', id: 'oblivion_knight', levelBonus: 1 },
          forceWaypoint: true, floating: true, wpExclusionRadius: 1 },
        xp: 2400, gems: 6, turnInPrompt: 'The moment let go — return, Chronarch.' },
    ],
  },
};

const STILLMIND_LAYOUT = fan(238); // spine → wil_start (the quiet side of 250)
const STILLMIND: VocationDef = {
  id: 'stillmind', name: 'Stillmind',
  blurb: 'Fury is a debt; stillness pays cash. Sit by the water anyone can find and almost no one stays beside.',
  color: '#e8e0c8',
  classId: 'ascetic',
  secret: {
    site: {
      npc: 'stillwater_basin',
      filter: { biomes: ['highland'], minLevel: 20 },
      chance: 0.5,
    },
    // ANYONE may sit by the water: the calling is not class-locked — a
    // Warrior who lingers hears it too (the one chain a stranger can walk
    // before any account unlock; the gate node still disciplines spending).
    classLockedDiscovery: false,
    unlockedOffer: 'menu',
    offerFlavor: '"The water is not still because nothing moves it. It is still because it has finished moving. Sit. There is work that is done by not doing."',
    discoveryText: 'Beside the basin, your breath slows to match something older.',
  },
  tree: [
    { id: 's1', name: 'Settled Breath', description: '+2% of maximum life regenerated per second', kind: 'small', ...STILLMIND_LAYOUT.s1, mods: [mod('lifeRegenPct', 'flat', 0.02)], links: ['root'] },
    { id: 's2', name: 'Open Palm', description: '12% increased melee damage', kind: 'small', ...STILLMIND_LAYOUT.s2, mods: [mod('damage', 'increased', 0.12, ['melee'])], links: ['root'] },
    { id: 's3', name: 'Unhurried Cup', description: '15% increased mana regeneration', kind: 'small', ...STILLMIND_LAYOUT.s3, mods: [mod('manaRegen', 'increased', 0.15)], links: ['root'] },
    { id: 'n1', name: 'Reflex Like Water', description: '+1 reflex — flasks answer even mid-form', kind: 'notable', ...STILLMIND_LAYOUT.n1, mods: [mod('reflex', 'flat', 1)], links: ['s1'] },
    { id: 'n2', name: 'Rooted Mountain', description: '20% increased armor; 20% increased stagger window', kind: 'notable', ...STILLMIND_LAYOUT.n2, mods: [mod('armor', 'increased', 0.2), mod('staggerWindow', 'increased', 0.2)], links: ['s1', 's2'] },
    { id: 'n3', name: 'Empty Vessel Fills', description: '20% increased mana regeneration; +20 maximum mana', kind: 'notable', ...STILLMIND_LAYOUT.n3, mods: [mod('manaRegen', 'increased', 0.2), mod('mana', 'flat', 20)], links: ['s3'] },
    { id: 'n4', name: 'The Practiced Form', description: '12% increased attack speed; 10% increased melee damage', kind: 'notable', ...STILLMIND_LAYOUT.n4, mods: [mod('attackSpeed', 'increased', 0.12), mod('damage', 'increased', 0.1, ['melee'])], links: ['s2', 's3'] },
    { id: 'k1', name: 'Stillness, Paid Out', description: '15% more melee damage; +2% of maximum life regenerated per second', kind: 'keystone', ...STILLMIND_LAYOUT.k1, mods: [mod('damage', 'more', 0.15, ['melee']), mod('lifeRegenPct', 'flat', 0.02)], links: ['n2', 'n4'] },
  ],
  quest: {
    steps: [
      { offerLabel: 'Sit the three waystones of the crown ridge',
        zone: { tileset: 'stonecrown', direction: 'e', distance: 1, level: 'character',
          objective: { kind: 'beacon', count: 3 },
          forceWaypoint: true },
        xp: 800, gems: 3, turnInPrompt: 'Three stones sat, three stones lit — return to the water.' },
      { offerLabel: 'Keep the form through the snowline\'s three assaults',
        zone: { tileset: 'snowcrown', direction: 'e', distance: 2, level: 'character',
          objective: { kind: 'waves', waves: 3 },
          forceWaypoint: true },
        xp: 1200, gems: 4, turnInPrompt: 'The form held; the snow did not — return home.' },
      { offerLabel: 'Answer the Crowned Mantis, form against form',
        zone: { tileset: 'meadow', direction: 'e', distance: 2, level: 'character',
          objective: { kind: 'boss', id: 'emerald_mantis', levelBonus: 1, promote: { rarity: 'crowned' } },
          forceWaypoint: true, floating: true },
        xp: 2000, gems: 6, turnInPrompt: 'It bowed first — return, Stillmind.' },
    ],
  },
};

const SWARMLORD_LAYOUT = fan(195); // spine → wis_start (wisdom's fourth door, offset from 210)
const SWARMLORD: VocationDef = {
  id: 'swarmlord', name: 'Swarmlord',
  blurb: 'The hive decided you speak for it now. Deeper reserves, harder shells, and a chorus that simply does not run out.',
  color: '#b8c84a',
  classId: 'hivecaller',
  secret: {
    site: {
      npc: 'brood_heart',
      filter: { biomes: ['desert', 'jungle', 'ruin'], minLevel: 20 },
      chance: 0.5,
    },
    classLockedDiscovery: true,
    // THE PILGRIM CHAIN: even account-unlocked, the Brood-Heart must be
    // FOUND each run — the hive does not take appointments in town.
    unlockedOffer: 'site',
    offerFlavor: '"The chamber hums at the pitch of your pulse. Whatever throne this was, the court has voted, and the vote is unanimous, and it is you."',
    discoveryText: 'The humming turns toward you like a thousand small heads.',
  },
  tree: [
    { id: 's1', name: 'Brood Arithmetic', description: '20% increased minion damage', kind: 'small', ...SWARMLORD_LAYOUT.s1, mods: [mod('minionDamage', 'increased', 0.2)], links: ['root'] },
    { id: 's2', name: 'Waxbound Shells', description: 'Minions have 25% increased life', kind: 'small', ...SWARMLORD_LAYOUT.s2, mods: [mod('minionLife', 'increased', 0.25)], links: ['root'] },
    { id: 's3', name: 'Skitterspeed', description: '20% increased minion movement speed', kind: 'small', ...SWARMLORD_LAYOUT.s3, mods: [mod('minionMoveSpeed', 'increased', 0.2)], links: ['root'] },
    { id: 'n1', name: 'One More Voice', description: '+1 maximum minion — the chorus grows', kind: 'notable', ...SWARMLORD_LAYOUT.n1, mods: [mod('minionMaxCount', 'flat', 1)], links: ['s1'] },
    { id: 'n2', name: 'Chitin Plies', description: '+1 minion ply — every body in the swarm EATS one more blow before it breaks (the quanta law)', kind: 'notable', ...SWARMLORD_LAYOUT.n2, mods: [mod('minionPlies', 'flat', 1)], links: ['s2'] },
    { id: 'n3', name: 'Venom Relay', description: 'Minions have 25% chance to Poison on hit', kind: 'notable', ...SWARMLORD_LAYOUT.n3, mods: [mod('minionApply_poison', 'flat', 0.25)], links: ['s1', 's3'] },
    { id: 'n4', name: 'Harrying Chorus', description: 'Minions have 20% chance to Harry on hit — the cloud spoils aim and attention', kind: 'notable', ...SWARMLORD_LAYOUT.n4, mods: [mod('minionApply_harried', 'flat', 0.2)], links: ['s3', 's2'] },
    { id: 'k1', name: 'The Hive Does Not Run Out', description: '20% more minion damage; slain minions fight on for 2 more seconds', kind: 'keystone', ...SWARMLORD_LAYOUT.k1, mods: [mod('minionDamage', 'more', 0.2), mod('minionUndying', 'flat', 2)], links: ['n1', 'n4'] },
  ],
  quest: {
    steps: [
      { offerLabel: 'Crack the rival hive-nodes seeding the sands',
        zone: { tileset: 'hivesands', direction: 's', distance: 1, level: 'character',
          objective: { kind: 'spawners', spawnerId: 'hive_node', count: [3, 4] },
          forceWaypoint: true },
        xp: 800, gems: 3, turnInPrompt: 'Their nodes are husks — the Brood-Heart hums approval.' },
      { offerLabel: 'Hold the mire against the rival brood\'s tide',
        zone: { tileset: 'mire', direction: 's', distance: 2, level: 'character',
          objective: { kind: 'waves', waves: 4 },
          packsOverride: { count: [5, 7], size: [3, 5], table: [
            { id: 'chitin_drone', weight: 3 }, { id: 'chitin_wingling', weight: 2 },
            { id: 'chitin_burrower', weight: 1 }, { id: 'chitin_spitter', weight: 1 } ] },
          forceWaypoint: true },
        xp: 1200, gems: 4, turnInPrompt: 'The tide broke on your chorus — the Heart hums louder.' },
      { offerLabel: 'Depose the Brood Sovereign and take the hive\'s crown',
        zone: { tileset: 'hivesands', direction: 's', distance: 2, level: 'character',
          objective: { kind: 'boss', id: 'brood_sovereign', levelBonus: 1 },
          forceWaypoint: true, floating: true },
        xp: 2000, gems: 6, turnInPrompt: 'The Sovereign kneels; the hum is a coronation — return, Swarmlord.' },
    ],
  },
};

// --- registry -----------------------------------------------------------------

/** Every vocation, keyed by id. Adding one = one def above + one entry here. */
export const VOCATIONS: Record<string, VocationDef> = {
  [WARBRINGER.id]: WARBRINGER,
  [GRAVEBINDER.id]: GRAVEBINDER,
  [WILDSTALKER.id]: WILDSTALKER,
  [ARCHMAGE.id]: ARCHMAGE,
  [SPELLBLADE.id]: SPELLBLADE,
  [HIEROPHANT.id]: HIEROPHANT,
  [GREENWARDEN.id]: GREENWARDEN,
  [PLAGUELORD.id]: PLAGUELORD,
  [SHADOWDANCER.id]: SHADOWDANCER,
  [BLOODREAVER.id]: BLOODREAVER,
  [STORMWEAVER.id]: STORMWEAVER,
  [BASTION.id]: BASTION,
  [CORSAIR.id]: CORSAIR,
  [ASHBORN.id]: ASHBORN,
  [EXSANGUINATOR.id]: EXSANGUINATOR,
  [STONEWROUGHT.id]: STONEWROUGHT,
  // The coverage pass: every class now carries a line.
  [PACKWARDEN.id]: PACKWARDEN,
  [GROUNDBREAKER.id]: GROUNDBREAKER,
  [SPEARHEAD.id]: SPEARHEAD,
  [SWORDSAINT.id]: SWORDSAINT,
  [PITFIGHTER.id]: PITFIGHTER,
  [THORNWALL.id]: THORNWALL,
  [IMPALER.id]: IMPALER,
  [ENGINEWRIGHT.id]: ENGINEWRIGHT,
  [BANNERLORD.id]: BANNERLORD,
  [WARCHANTER.id]: WARCHANTER,
  [VEILWEAVER.id]: VEILWEAVER,
  [CHRONARCH.id]: CHRONARCH,
  [STILLMIND.id]: STILLMIND,
  [SWARMLORD.id]: SWARMLORD,
  // The harborhold's calling (data/harborholds.ts — the deed-gated stone).
  [HARBORWARDEN.id]: HARBORWARDEN,
};

export const VOCATION_LIST: VocationDef[] = Object.values(VOCATIONS);

// --- id & ledger vocabulary (shared by quests / engine / UI) -------------------

/** The ACCOUNT-wide unlock key: written when any character completes the
 *  chain; every future character's step-1 gate reads it. Merged to the
 *  account ledger on death like all run counters, and ALSO written straight
 *  to the account at grant time (the uber-kill precedent) for durability. */
export function vocationLedgerKey(vocId: string): string {
  return `vocation_unlocked_${vocId}`;
}

/** The RUN-ledger key step N (1-based) writes on completion; step N+1's gate
 *  requires it. Deliberately run-scoped in the gate check — chain PROGRESS is
 *  per-character even though these keys harmlessly merge to the account. */
export function vocationStepKey(vocId: string, step: number): string {
  return `voc_${vocId}_step_${step}`;
}

/** The RUN-ledger key a SECRET vocation's site sets when the calling is
 *  received (walked into its discovery radius by a qualifying character).
 *  Pre-unlock, the chain's gates require it — the quest exists only for those
 *  who have FOUND it. Run-scoped in the gates (re-find it each run) though it
 *  merges to the account like everything (harmless; gates read the run copy). */
export function vocationDiscoveryKey(vocId: string): string {
  return `vocation_discovered_${vocId}`;
}

/** Namespaced PASSIVE_NODES id for a vocation-tree node. */
export function vocationNodeId(vocId: string, localId: string): string {
  return `voc_${vocId}_${localId}`;
}

/** The free root node auto-allocated when the vocation is granted. */
export function vocationRootId(vocId: string): string {
  return vocationNodeId(vocId, 'root');
}

/** Is this vocation unlocked on the ACCOUNT (completed by any past character)? */
export function vocationUnlockedOnAccount(accountLedger: Readonly<Record<string, number>>, vocId: string): boolean {
  return (accountLedger[vocationLedgerKey(vocId)] ?? 0) >= 1;
}
