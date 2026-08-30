// ---------------------------------------------------------------------------
// THE TUTORIAL FACTIONS — the Fathers (data half; the prologue's resolve).
//
// The tutorial's onslaught is no longer goblin-only: TUTORIAL_FACTIONS below
// is an open table of legions, each fielding its own low-tier tide and its
// own commander-grade COLOSSUS — a sibling of Ghorvane the Hordefather built
// on his exact grammar (boss body + two carried anatomy parts: a VOICE that
// channels the reckoning verb via breakDisables, a HEART whose break unmans
// the father) and his exact chassis numbers. Like him, the Fathers join NO
// spawn table: they debut in the prologue's agency reckoning and wait for
// the revenge road (quests/revenge.ts) to stand them up for a fight the
// player is finally owed a fair shot at.
//
// THE ROLL: a brand-new account's first Begin rolls ONE faction — seeded off
// the run manifest (deterministic per world, honest dice per account since
// the manifest seed is itself rolled at the press) — and stamps it on the
// account ledger (`tutorial_faction:<id>`, the gemdrop:-style presence-key
// family; the bestiary: precedent for a feature-owned contract). The stamp
// persists mid-scene (account writes flow while run saves stand down), so an
// aborted tutorial replays the SAME legion, and the revenge quests read the
// same key to aim a young account's vengeance at the legion that ended it.
//
// THE RESOLVE SEAM (the open-record idiom): this module assigns
// PROLOGUE_SCENE.resolve — sceneBegin hands the runtime the returned def, so
// the clash/assault/reckoning rows swap per faction while the id, ledger,
// card stages and the Mu tail stay the base def's. Anything that never
// imports this module (a bare sim boot) simply walks the goblin default.
//
// Registry rows on open records (MONSTERS / SKILLS / LOOKS — the data/mu.ts
// idiom). Every number is a dial; the wave counts are tuned lighter where a
// legion's bodies run heavier than goblin chaff.
// ---------------------------------------------------------------------------

import { MONSTERS, type MonsterDef } from './monsters';
import { SKILLS } from './skills';
import type { SkillDef } from '../engine/skills';
import { LOOKS } from './looks';
import { mod, type DamageType } from '../engine/stats';
import { PROLOGUE_SCENE, type SceneDef, type SceneStage, type SceneWaveRow } from './scenes';
import { bumpLedger } from '../packages/ledger';
import { Rng } from '../core/rng';
import type { World } from '../engine/world';

// --- THE LEDGER CONTRACT -----------------------------------------------------
// One roll per account, the id in the KEY (Record<string, number> law).
export const LEDGER_TUTORIAL_FACTION_PREFIX = 'tutorial_faction:';
export const tutorialFactionKey = (id: string): string =>
  `${LEDGER_TUTORIAL_FACTION_PREFIX}${id}`;

/** The stamped tutorial faction, if any — the one prefix scan, shared by the
 *  prologue's resolve and the revenge quests' gates. */
export function tutorialFactionOf(ledger: Record<string, number>): string | null {
  for (const k of Object.keys(ledger)) {
    if (k.startsWith(LEDGER_TUTORIAL_FACTION_PREFIX) && (ledger[k] ?? 0) >= 1) {
      return k.slice(LEDGER_TUTORIAL_FACTION_PREFIX.length);
    }
  }
  return null;
}

// --- THE FATHERS' VERBS --------------------------------------------------------
// One reckoning per legion — the Hordefather's exact shape (ten held breaths,
// the whole field unmade, friend and foe alike, no cover) retyped to each
// legion's element. All damage totals sit on his 760-average line.

const fatherVerb = (
  id: string, name: string, color: string, description: string,
  types: SkillDef['tags'], baseDamage: Partial<Record<DamageType, [number, number]>>,
  knockback: number,
): SkillDef => ({
  id, name, description,
  noDrop: true,
  tags: types, color,
  manaCost: 0, cooldown: 45, useTime: 10,
  baseDamage,
  delivery: { type: 'nova', radius: 2600, affects: 'all', occlusion: 'free' },
  effects: [
    { type: 'damage' },
    { type: 'knockback', strength: knockback },
  ],
  ai: { range: 900, weight: 0.4 },
} as SkillDef);

SKILLS['gravefathers_lament'] = fatherVerb(
  'gravefathers_lament', "Gravefather's Lament", '#b8a8e8',
  'The colossus tolls its carried knell through a long wind-up, then the whole field is'
  + ' unmade in one grave-cold breath. It spares nothing: friend and foe alike are struck,'
  + ' and no wall or cover holds the cold out. Nothing near survives; nothing near was meant to.',
  ['spell', 'aoe', 'cold', 'chaos'],
  { cold: [340, 480], chaos: [280, 420] }, 720,
);
SKILLS['herdfathers_stampede'] = fatherVerb(
  'herdfathers_stampede', "Herdfather's Stampede", '#d8a05a',
  'The colossus beats the marching drum through a long wind-up, then the whole field is'
  + ' trampled at once — one immense concussion that hurls everything away. It spares'
  + ' nothing: friend and foe alike are struck, and no wall or cover turns the herd.',
  ['spell', 'aoe', 'physical'],
  { physical: [620, 900] }, 900,
);
SKILLS['pyrefathers_immolation'] = fatherVerb(
  'pyrefathers_immolation', "Pyrefather's Immolation", '#ff7a4a',
  'The colossus swings its censer through a long wind-up, then the whole field goes up at'
  + ' once. It spares nothing: friend and foe alike are burned, and no wall or cover'
  + ' shades the pyre. Nothing near survives; nothing near was meant to.',
  ['spell', 'aoe', 'fire', 'chaos'],
  { fire: [340, 480], chaos: [280, 420] }, 720,
);

// --- THE FATHERS' LOOKS --------------------------------------------------------

/** The Gravefather: a barrow of bone and grave-cloth walking — ribs bared
 *  under a rotted shroud, iron chains, a dead king's crown. */
LOOKS['grave_colossus'] = {
  parts: [
    { kind: 'torso', scale: 1.3, role: 'bone' },
    { kind: 'ribs', scale: 1.05 },
    { kind: 'shroudWrap', scale: 1.1, role: 'cloth' },
    { kind: 'chains', scale: 1.05, role: 'metal' },
    { kind: 'tatters', scale: 0.9, params: { n: 4 } },
    { kind: 'crown', x: 0.05, scale: 0.9, role: 'metal' },
    { kind: 'eyes', role: 'glow', params: { spread: 0.34, dist: 0.5, size: 0.07 } },
  ],
  shadowScale: 1.25,
};
/** The Knell Unstilled: a great grave-bell in an iron cradle, lashed to the
 *  father's shoulder — the barrow's voice. */
LOOKS['gravefather_knell'] = {
  parts: [
    { kind: 'disc', scale: 0.8, role: 'metal' },
    { kind: 'bell', x: 0.1, scale: 1.25 },
    { kind: 'harness', scale: 0.8, role: 'cloth' },
  ],
  shadowScale: 0.55,
};
/** The Carried Reliquary: a dead saint's chest, chained shut, still praying. */
LOOKS['gravefather_reliquary'] = {
  parts: [
    { kind: 'chest', scale: 0.95 },
    { kind: 'chains', scale: 0.75, role: 'metal' },
  ],
  live: [{ kind: 'runes', scale: 0.8, role: 'glow', params: { n: 3 } }],
  shadowScale: 0.6,
};

/** The Herdfather: a mountain of hide and horn — ram-crowned, maned,
 *  war-painted, tusked like the tribes it drives. */
LOOKS['herd_colossus'] = {
  parts: [
    { kind: 'torso', scale: 1.3 },
    { kind: 'furRuff', scale: 1.1 },
    { kind: 'warpaint', scale: 1.0 },
    { kind: 'mane', scale: 1.05 },
    { kind: 'ramHorns', x: 0.05, scale: 1.2, role: 'bone' },
    { kind: 'tusks', x: 0.42, scale: 1.0, role: 'bone' },
    { kind: 'eyes', params: { spread: 0.34, dist: 0.5, size: 0.07 } },
  ],
  shadowScale: 1.25,
};
/** The Drum That Marches: a great hide drum in a bone yoke — the herd's
 *  heartbeat, lashed to the father's shoulder. */
LOOKS['herdfather_wardrum'] = {
  parts: [
    { kind: 'keg', scale: 1.1, role: 'wood' },
    { kind: 'harness', scale: 0.8, role: 'cloth' },
    { kind: 'spikes', scale: 0.55, role: 'bone' },
  ],
  shadowScale: 0.55,
};
/** The Herd-Banner: antler-crowned standard of the Horned Tribes. */
LOOKS['herdfather_standard'] = {
  parts: [
    { kind: 'totemPost', scale: 1.0 },
    { kind: 'banner', x: -0.1, scale: 0.85, role: 'cloth' },
    { kind: 'antlers', x: 0.15, scale: 0.8, role: 'bone' },
  ],
  shadowScale: 0.6,
};

/** The Pyrefather: cracked basalt flesh over a furnace heart — horned,
 *  chained, branded, leaking fire at every seam. */
LOOKS['pyre_colossus'] = {
  parts: [
    { kind: 'torso', scale: 1.3, role: 'dark' },
    { kind: 'armorPlates', scale: 1.0, params: { n: 3 } },
    { kind: 'lavaCracks', scale: 1.05 },
    { kind: 'chains', scale: 1.05, role: 'metal' },
    { kind: 'horns', x: 0.05, scale: 1.2, role: 'bone' },
    { kind: 'brand', scale: 0.9, role: 'glow' },
    { kind: 'eyes', role: 'glow', params: { spread: 0.34, dist: 0.5, size: 0.07 } },
  ],
  live: [{ kind: 'flames', x: 0.8, y: 0.6, scale: 0.4, params: { n: 2 } }],
  shadowScale: 1.25,
};
/** The Swung Censer: a pit-iron thurible on heavy chain — the pyre's coals,
 *  carried burning. */
LOOKS['pyrefather_censer'] = {
  parts: [
    { kind: 'censer', scale: 1.15 },
    { kind: 'chains', scale: 0.8, role: 'metal' },
  ],
  live: [{ kind: 'flames', scale: 0.5, params: { n: 2 } }],
  shadowScale: 0.55,
};
/** The Chained Icon: a horned mask of the pit, bound in penitent iron. */
LOOKS['pyrefather_icon'] = {
  parts: [
    { kind: 'mask', scale: 1.0 },
    { kind: 'chains', scale: 0.8, role: 'metal' },
    { kind: 'spikes', scale: 0.6, role: 'metal' },
  ],
  shadowScale: 0.6,
};

// --- THE FATHERS' BODIES -------------------------------------------------------
// Ghorvane's chassis verbatim (base line, heft, brain, part geometry) — the
// grammar IS the kinship. Voice part: breakDisables the reckoning (crack the
// voice and the muster is silenced — the revenge fight's counterplay; in the
// tutorial the director's fresh-instance order keeps its one promise).
// Heart part: breakMods unman the father.

const father = (
  id: string, name: string, color: string, faction: string, look: string,
  voice: { id: string; name: string; color: string; look: string; verb: string },
  heart: { id: string; name: string; color: string; look: string },
): void => {
  MONSTERS[voice.id] = {
    id: voice.id, name: voice.name,
    color: voice.color, shape: 'circle', radius: 11, material: 'bone', look: voice.look,
    noNemesis: true,
    base: { life: 90, moveSpeed: 0, accuracy: 105, mana: 130, manaRegen: 8 },
    skills: ['rallying_howl'], xp: 0, drops: 0, faction,
    brain: { type: 'artillery' },
  } as MonsterDef;
  MONSTERS[heart.id] = {
    id: heart.id, name: heart.name,
    color: heart.color, shape: 'circle', radius: 10, material: 'bone', look: heart.look,
    noNemesis: true, remains: false,
    base: { life: 80, moveSpeed: 0, armor: 20, mana: 100, manaRegen: 9 },
    skills: ['bewilder'], xp: 0, drops: 0, faction,
    brain: { type: 'artillery' },
  } as MonsterDef;
  MONSTERS[id] = {
    id, name,
    color, shape: 'octagon', radius: 46, material: 'flesh', look,
    boss: true,
    base: { life: 2600, moveSpeed: 62, accuracy: 118, armor: 90, poise: 220, mana: 160, manaRegen: 8 },
    skills: ['heavy_strike', 'sunder', voice.verb],
    xp: 800, faction, tags: ['giant'],
    heft: 2.2, turnSpeed: 1.6,
    parts: [
      {
        monster: voice.id, dx: -0.55, dy: 0.55, lifeFrac: 0.22, breakDamage: 0.06,
        breakDisables: [voice.verb],
      },
      {
        monster: heart.id, dx: -0.55, dy: -0.55, lifeFrac: 0.22, breakDamage: 0.06,
        breakMods: [mod('damage', 'more', -0.15)],
      },
    ],
    brain: { type: 'juggernaut', enrage: 0.5 },
  } as MonsterDef;
};

father('grave_colossus', 'Morvhaal, the Gravefather', '#8f86ab', 'undead', 'grave_colossus',
  { id: 'gravefather_knell', name: 'the Knell Unstilled', color: '#a8a0c0', look: 'gravefather_knell', verb: 'gravefathers_lament' },
  { id: 'gravefather_reliquary', name: 'the Carried Reliquary', color: '#8f8468', look: 'gravefather_reliquary' });
father('herd_colossus', 'Uzkharn, the Herdfather', '#a8763e', 'beastkin', 'herd_colossus',
  { id: 'herdfather_wardrum', name: 'the Drum That Marches', color: '#8f6f4e', look: 'herdfather_wardrum', verb: 'herdfathers_stampede' },
  { id: 'herdfather_standard', name: 'the Herd-Banner', color: '#9a7a4a', look: 'herdfather_standard' });
father('pyre_colossus', 'Mazghor, the Pyrefather', '#c04a2a', 'demon', 'pyre_colossus',
  { id: 'pyrefather_censer', name: 'the Swung Censer', color: '#d86a3a', look: 'pyrefather_censer', verb: 'pyrefathers_immolation' },
  { id: 'pyrefather_icon', name: 'the Chained Icon', color: '#a04a3a', look: 'pyrefather_icon' });

// --- THE TABLE -----------------------------------------------------------------

export interface TutorialFactionRow {
  id: string;
  /** The legion as spoken (the revenge quests' offer copy). */
  banner: string;
  color: string;
  commander: string;
  verb: string;
  /** First blood: the lone scout of the clash stage. */
  clash: { def: string; announce: string };
  /** The assault's timed tide (the wave-frenzy grammar's rows). */
  waves: SceneWaveRow[];
  /** The reckoning's arrival callout. */
  arrive: string;
}

export const TUTORIAL_FACTIONS: TutorialFactionRow[] = [
  {
    id: 'goblin', banner: 'the goblinkin', color: '#9fdc6a',
    commander: 'goblin_colossus', verb: 'hordefathers_reckoning',
    clash: { def: 'goblin_skirmisher', announce: 'a goblin skulks out of the grass…' },
    waves: [
      { at: 0, spawns: [{ def: 'goblin_skirmisher', count: 4 }], announce: 'more of them, hold the road!', announceColor: '#9fdc6a' },
      { at: 13, spawns: [{ def: 'goblin_skirmisher', count: 4 }, { def: 'goblin_brute', count: 1 }] },
      { at: 26, spawns: [{ def: 'goblin_skirmisher', count: 5 }, { def: 'goblin_shaman', count: 2 }], announce: 'the grass is moving everywhere…', announceColor: '#c8e070' },
      { at: 40, spawns: [{ def: 'goblin_brute', count: 2 }, { def: 'goblin_skirmisher', count: 6 }] },
      { at: 54, spawns: [{ def: 'goblin_chief', count: 1 }, { def: 'goblin_skirmisher', count: 6 }, { def: 'goblin_shaman', count: 2 }], announce: 'they just keep coming.', announceColor: '#c8e070' },
    ],
    arrive: 'the Hordefather himself comes to end the road.',
  },
  {
    id: 'undead', banner: 'the unnumbered dead', color: '#b8a8e8',
    commander: 'grave_colossus', verb: 'gravefathers_lament',
    clash: { def: 'zombie', announce: 'something risen drags itself from the ditch…' },
    waves: [
      { at: 0, spawns: [{ def: 'zombie', count: 4 }], announce: 'the ditch-dead are rising, hold the road!', announceColor: '#b8a8e8' },
      { at: 13, spawns: [{ def: 'zombie', count: 3 }, { def: 'skeleton_warrior', count: 2 }] },
      { at: 26, spawns: [{ def: 'skeleton_archer', count: 2 }, { def: 'gloomling', count: 3 }], announce: 'the barrow-cold is closing in…', announceColor: '#c8b8e8' },
      { at: 40, spawns: [{ def: 'skeleton_warrior', count: 3 }, { def: 'zombie', count: 4 }] },
      { at: 54, spawns: [{ def: 'barrow_gravemaker', count: 1 }, { def: 'zombie', count: 5 }, { def: 'skeleton_archer', count: 2 }], announce: 'they just keep rising.', announceColor: '#c8b8e8' },
    ],
    arrive: 'the Gravefather himself comes to bury the road.',
  },
  {
    id: 'beastkin', banner: 'the Horned Tribes', color: '#d8a05a',
    commander: 'herd_colossus', verb: 'herdfathers_stampede',
    clash: { def: 'beastkin_chaser', announce: 'a horned shape breaks from the treeline…' },
    waves: [
      { at: 0, spawns: [{ def: 'beastkin_chaser', count: 2 }], announce: 'the Horned Tribes are driving the road, hold!', announceColor: '#d8a05a' },
      { at: 13, spawns: [{ def: 'beastkin_gorer', count: 1 }, { def: 'beastkin_chaser', count: 2 }] },
      { at: 26, spawns: [{ def: 'beastkin_impaler', count: 2 }, { def: 'beastkin_chaser', count: 2 }], announce: 'drums. Drums under the hills…', announceColor: '#e0b06a' },
      { at: 40, spawns: [{ def: 'beastkin_gorer', count: 2 }, { def: 'beastkin_chaser', count: 3 }] },
      { at: 54, spawns: [{ def: 'beastkin_horncaller', count: 1 }, { def: 'beastkin_chaser', count: 3 }, { def: 'beastkin_impaler', count: 2 }], announce: 'the herd does not tire.', announceColor: '#e0b06a' },
    ],
    arrive: 'the Herdfather himself comes to trample the road.',
  },
  {
    id: 'demon', banner: 'the pit legions', color: '#ff7a4a',
    commander: 'pyre_colossus', verb: 'pyrefathers_immolation',
    clash: { def: 'imp', announce: 'something small and burning claws out of the dark…' },
    waves: [
      { at: 0, spawns: [{ def: 'ash_whelp', count: 4 }], announce: 'the pit is spilling, hold the road!', announceColor: '#ff7a4a' },
      { at: 13, spawns: [{ def: 'ash_whelp', count: 3 }, { def: 'imp', count: 2 }] },
      { at: 26, spawns: [{ def: 'hellhound', count: 2 }, { def: 'ash_whelp', count: 3 }], announce: 'the air tastes of cinders…', announceColor: '#ff9a5a' },
      { at: 40, spawns: [{ def: 'imp', count: 3 }, { def: 'hellhound', count: 2 }] },
      { at: 54, spawns: [{ def: 'cinder_fiend', count: 2 }, { def: 'ash_whelp', count: 5 }, { def: 'hellhound', count: 1 }], announce: 'the burning does not end.', announceColor: '#ff9a5a' },
    ],
    arrive: 'the Pyrefather himself comes to burn the road.',
  },
];

export const tutorialFactionRow = (id: string | null): TutorialFactionRow =>
  TUTORIAL_FACTIONS.find(r => r.id === id) ?? TUTORIAL_FACTIONS[0];

// --- THE RESOLVE ----------------------------------------------------------------

const FACTION_ROLL_SALT = 0x7fa7; // the Fathers' own stream fork

/** Recall the stamped faction, else roll one off the run manifest and stamp
 *  it. The stamp persists mid-scene (account writes flow under scenes), so
 *  an aborted tutorial replays the SAME legion and the revenge quests read
 *  the same key forever after. */
export function rollTutorialFaction(w: World): TutorialFactionRow {
  const stamped = tutorialFactionOf(w.account.ledger);
  if (stamped) return tutorialFactionRow(stamped);
  const rng = new Rng((w.manifest.seed ^ FACTION_ROLL_SALT) >>> 0);
  const row = TUTORIAL_FACTIONS[Math.floor(rng.next() * TUTORIAL_FACTIONS.length)];
  bumpLedger(w.account.ledger, tutorialFactionKey(row.id));
  w.accountDirty = true;
  return row;
}

/** The prologue re-dressed in one legion's colors: clash/assault/reckoning
 *  rows swap; the cards, the drill and the Mu tail stay the base def's. */
export function prologueForFaction(row: TutorialFactionRow): SceneDef {
  const stages: SceneStage[] = PROLOGUE_SCENE.stages.map(s => {
    if (s.kind === 'clash') {
      return { ...s, spawns: [{ def: row.clash.def, count: 1 }], announce: row.clash.announce, announceColor: row.color };
    }
    if (s.kind === 'assault') {
      return { ...s, rows: row.waves };
    }
    if (s.kind === 'reckoning') {
      return { ...s, def: row.commander, verb: row.verb, announce: row.arrive, announceColor: row.color };
    }
    return s;
  });
  return { ...PROLOGUE_SCENE, stages };
}

// THE SEAM: assigned onto the base def (the open-record idiom) — sceneBegin
// resolves through it when present; a boot that never imports this module
// (a bare sim arena) walks the goblin default unchanged.
PROLOGUE_SCENE.resolve = (w: World): SceneDef => prologueForFaction(rollTutorialFaction(w));
