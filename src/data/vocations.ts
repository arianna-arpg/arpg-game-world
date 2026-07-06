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
};

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

// --- registry -----------------------------------------------------------------

/** Every vocation, keyed by id. Adding one = one def above + one entry here. */
export const VOCATIONS: Record<string, VocationDef> = {
  [WARBRINGER.id]: WARBRINGER,
  [GRAVEBINDER.id]: GRAVEBINDER,
  [WILDSTALKER.id]: WILDSTALKER,
  [ARCHMAGE.id]: ARCHMAGE,
  [HIEROPHANT.id]: HIEROPHANT,
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
