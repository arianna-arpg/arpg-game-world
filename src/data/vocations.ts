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
        offerLabel: 'Break the warband mustering in the highlands',
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
        offerLabel: 'Cut the bandit road in the highlands',
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
        offerLabel: 'Answer the warhorns in the highlands',
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

// --- registry -----------------------------------------------------------------

/** Every vocation, keyed by id. Adding one = one def above + one entry here. */
export const VOCATIONS: Record<string, VocationDef> = {
  [WARBRINGER.id]: WARBRINGER,
  [GRAVEBINDER.id]: GRAVEBINDER,
  [WILDSTALKER.id]: WILDSTALKER,
  [ARCHMAGE.id]: ARCHMAGE,
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
