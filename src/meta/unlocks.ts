// ---------------------------------------------------------------------------
// UNLOCK CATALOG — the spendable meta-progression, as data.
//
// Each entry is one thing the player can buy with account credits: a class
// slot, a CLASS BUNDLE (class + its thematic gems, one purchase), a bundle of
// gems that may then drop, or a town FEATURE flag. Adding a new unlock is one
// entry here. Modelled as a discriminated union on `kind` so the apply/own
// switches narrow `payload` with no casts under strict mode.
// ---------------------------------------------------------------------------

import { FEATURE, LEDGER_ACCOUNT_DEATHS, type Account } from './account';
import { LEDGER_ESSENCE_TOUCHED } from '../data/essences';
import { IMMORTAL_CFG } from './modes';
import { CLASSES } from '../data/classes';
import { SKILLS } from '../data/skills';
import { SUPPORTS } from '../data/supports';
import { PACKAGES, PACKAGE_BY_ID, unlockMet } from '../packages/registry';

/** Fields every unlock shares. `requiresUnlock` is the GENERIC sequencing
 *  gate: the entry stays hidden until the named catalog unlock(s) are OWNED —
 *  ladders (class slots, feature chains) are authored as data, never as
 *  account-level walls. Catalog ids only (package tiers have their own
 *  stagger inside isUnlockVisible). */
interface UnlockBase {
  id: string;
  label: string;
  description: string;
  cost: number;
  /** Minimum ACCOUNT level. Prefer `requiresUnlock` sequencing for ladders —
   *  reserve this for genuine lifetime-milestone rewards. */
  reqLevel?: number;
  /** Other unlock id(s) that must be OWNED before this one surfaces (ANDed). */
  requiresUnlock?: string | string[];
  /** Lifetime-ledger milestone key(s) that must be PRESENT (≥1, ANDed) —
   *  e.g. reached_level_40 + unmade_slain. Generic to every unlock kind. */
  reqLedger?: string | string[];
  /** Lifetime-ledger COUNT thresholds (ANDed): each key must have accrued at
   *  least its value. The presence form above is sugar for `{key: 1}`; this is
   *  for genuine tallies — the Immortal covenant's "die 20 times". */
  reqLedgerCounts?: Record<string, number>;
}

export type Unlockable =
  | (UnlockBase & { kind: 'slot'; payload: { slotCount: number } })
  | (UnlockBase & { kind: 'class'; payload: { classId: string; skillIds: string[]; supportIds: string[] } })
  | (UnlockBase & { kind: 'skill'; payload: { skillIds: string[] } })
  | (UnlockBase & { kind: 'support'; payload: { supportIds: string[] } })
  | (UnlockBase & { kind: 'feature'; requiresFeature?: string; payload: { flag: string } })
  | (UnlockBase & { kind: 'package'; payload: { packageId: string; tierId?: string } });

/** Class SLOTS, data-driven and ordered ascending — the HAND SIZE at character
 *  select (the hand itself is dealt at random from the account's UNLOCKED
 *  classes; class bundles below deepen that pool). Bought STRICTLY IN
 *  SEQUENCE: each tier requires the previous tier owned and nothing else — no
 *  account-level gate of any kind. Trivially extended — works the same for 12
 *  or 40 classes. Costs are pure data; tune freely. */
export const SLOT_TIERS: readonly { id: string; slots: number; cost: number }[] = [
  { id: 'slot_tier_4', slots: 4, cost: 40 },
  { id: 'slot_tier_5', slots: 5, cost: 80 },
  { id: 'slot_tier_6', slots: 6, cost: 130 },
  { id: 'slot_tier_7', slots: 7, cost: 200 },
  { id: 'slot_tier_8', slots: 8, cost: 300 },
];

/** CLASS BUNDLES — one purchase, several unlocks that grow together:
 *    1. the class joins the RANDOM ROLL at character select (the pool the
 *       slot-sized hand is dealt from),
 *    2. its thematic skill/support gems join the DROP pool (which also makes
 *       the class's own kit re-droppable — bar gems are granted on pick, but
 *       only unlocked gems can be found again),
 *    3. and, downstream for free, realizing the class in a run opens its home
 *       VOCATION chain at the quartermaster (vocations key off the character's
 *       class — no extra wiring here).
 *  Adding a class to the game = one ClassDef + one entry here. Gem-name lists
 *  in the Vault card are generated from the live registries, so renames never
 *  go stale. Starter classes (account.ts STARTER_CLASSES) need no bundle. */
export interface ClassBundleDef {
  classId: string;
  cost: number;
  /** Flavor lead-in; the mechanical tail of the description is generated. */
  blurb: string;
  skillIds: string[];
  supportIds?: string[];
}

export const CLASS_BUNDLES: readonly ClassBundleDef[] = [
  { classId: 'berserker', cost: 240,
    blurb: 'Fury as a fighting style: heavy arcs, boiling blood, and the whole rage-fed Warpath.',
    skillIds: ['heavy_strike', 'whirlwind', 'dash',
      'berserk', 'bloodlust', 'soul_harvest', 'flame_imbuement', 'venom_ammunition', 'flame_blast'] },
  { classId: 'sorcerer', cost: 150,
    blurb: 'The scholar of annihilation steps forward, frost ward in hand.',
    skillIds: ['ice_shield'],
    supportIds: ['spark_discipline'] },
  { classId: 'ranger', cost: 200,
    blurb: 'Death from afar — and the field disciplines that perfect the shot.',
    skillIds: ['quickstep'],
    supportIds: ['perfect_draw', 'wandering_mark'] },
  { classId: 'guardian', cost: 300,
    blurb: 'The unmoved wall, raised together with the Bulwark\'s wards, pacts, and reprisals.',
    skillIds: ['hammer_of_judgment', 'aegis_ward', 'rallying_howl',
      'iron_ward', 'magma_ward', 'transgression', 'pain_hounds', 'bristleback', 'soul_link'] },
  { classId: 'summoner', cost: 260,
    blurb: 'The shepherd of monsters, with the Hive\'s swarm and the voice that commands it.',
    skillIds: ['venom_bolt', 'summon_swarmlings', 'command_assault'] },
  { classId: 'swashbuckler', cost: 240,
    blurb: 'The duelist\'s stage: four blades\' worth of flourish, and the momentum to keep it rolling.',
    skillIds: ['surgical_strike', 'dash_strike', 'buckler_strike', 'wild_strike'],
    supportIds: ['momentum'] },
  { classId: 'juggernaut', cost: 320,
    blurb: 'It hits, it takes hits, and it does not stop — and now it keeps the wake: votive flames, a lit vigil, and the last word.',
    skillIds: ['reckoning', 'stone_skin', 'cindershell', 'deathwatch', 'requiem'],
    supportIds: ['kindled_wake', 'victors_tempo', 'abundant_harvest'] },
  { classId: 'pyromancer', cost: 220,
    blurb: 'Everything burns eventually — these are the words for "now".',
    skillIds: ['flame_arrow', 'ignite', 'pillar_of_flame'] },
  { classId: 'assassin', cost: 320,
    blurb: 'The quiet trade, with the Verdict\'s marks, dooms, and executions in its kit.',
    skillIds: ['rend', 'eviscerate', 'invisibility',
      'expose_weakness', 'word_of_doom', 'execution'],
    supportIds: ['exposure', 'bristling_riposte'] },
  { classId: 'necromancer', cost: 420,
    blurb: 'Death as a resource: the corpse-and-poison artisan, with the whole Harvest & Hordes gamut.',
    skillIds: ['poison_nova', 'raise_dead', 'despair',
      'reap', 'whirling_reap', 'summon_raging_spirit', 'spirit_pyre',
      'summon_wraith', 'infernal_bombardment', 'archon_lance', 'sanguine_burst'],
    supportIds: ['sweeping_blow', 'mana_feeder', 'enduring_bond'] },
  { classId: 'tamer', cost: 280,
    blurb: 'The wild answers a steady gaze: sneak in cloaked, hold the claim, and fight beside the bond that downs but never dies.',
    skillIds: ['wild_strike', 'tame_beast', 'cloak', 'command_assault'] },
  { classId: 'cleric', cost: 450,
    blurb: 'The support archetype, played straight: Communion\'s mending arts and the Devout\'s sanctified arsenal, bundled with the one class built to carry them.',
    skillIds: ['sanctified_strike', 'mend', 'consecration', 'benediction',
      'greater_mending', 'communion', 'healing_rain', 'healing_stream', 'cleansing_light',
      'lifedrain', 'soul_volley', 'tree_of_life', 'font_of_renewal', 'summon_cleric', 'spirit_mender'],
    supportIds: ['intensive_care', 'mending_chain', 'overmend'] },
];

const gemNames = (ids: readonly string[], reg: Record<string, { name: string }>): string =>
  ids.map(i => reg[i]?.name ?? i).join(', ');

function classBundleEntry(b: ClassBundleDef): Unlockable {
  const cls = CLASSES.find(c => c.id === b.classId);
  const name = cls?.name ?? b.classId;
  const sups = b.supportIds ?? [];
  return {
    id: `class_${b.classId}`, kind: 'class', cost: b.cost,
    label: `Class — ${name}`,
    description: `${b.blurb} The ${name} joins the class roll at character select`
      + ` — and once realized in a run, its Vocation chain opens.`
      + ` Gems added to the drop pool: ${gemNames(b.skillIds, SKILLS)}`
      + (sups.length ? ` · supports: ${gemNames(sups, SUPPORTS)}` : '') + '.',
    payload: { classId: b.classId, skillIds: [...b.skillIds], supportIds: [...sups] },
  };
}

export const UNLOCK_CATALOG: Unlockable[] = [
  // --- Class slots: a bigger HAND at character select, bought in sequence ----
  ...SLOT_TIERS.map((t, i): Unlockable => ({
    id: t.id, kind: 'slot', cost: t.cost,
    ...(i > 0 ? { requiresUnlock: SLOT_TIERS[i - 1].id } : {}),
    label: `Class Slot ${t.slots}`,
    description: `Surface a ${t.slots}th selectable class at character select, dealt at random from your unlocked classes (Class unlocks below deepen that pool).`,
    payload: { slotCount: t.slots },
  })),

  // --- Class bundles: class + thematic gems + (once realized) its vocation ---
  ...CLASS_BUNDLES.map(classBundleEntry),

  // --- Skill drop bundles (tier-1 are starters; these add more to the pool) -
  { id: 'gem_skills_t2', kind: 'skill', cost: 75, reqLevel: 0, label: 'Skill Pool II',
    description: 'Flame Wave, Ground Slam, Whirlwind, Storm Call, Spark may drop.',
    payload: { skillIds: ['flame_wave', 'ground_slam', 'whirlwind', 'storm_call', 'spark'] } },
  { id: 'gem_skills_t3', kind: 'skill', cost: 150, reqLevel: 1, label: 'Skill Pool III',
    description: 'Infernal Ray, Summon Skeleton (+archer), Piercing Arrow, Fan of Blades may drop.',
    payload: { skillIds: ['infernal_ray', 'summon_skeleton', 'summon_skeleton_archer', 'piercing_arrow', 'fan_of_blades'] } },

  { id: 'gem_skills_echoes', kind: 'skill', cost: 180, reqLevel: 1, label: 'Skill Pool — Echoes',
    description: 'Mirage Archer and Shadow Clone may drop.',
    payload: { skillIds: ['mirage_archer', 'shadow_clone'] } },
  { id: 'gem_skills_covenants', kind: 'skill', cost: 160, reqLevel: 1, label: 'Skill Pool — Covenants',
    description: 'Convocation, Overclock, Blood Mortgage may drop.',
    payload: { skillIds: ['convocation', 'overclock', 'blood_mortgage'] } },
  { id: 'gem_skills_groundwork', kind: 'skill', cost: 200, reqLevel: 1, label: 'Skill Pool — Groundwork',
    description: 'Volcanic Fissure, Eruption, Thunderstorm, Entangle, Rune of Power, Toxic Domain may drop.',
    payload: { skillIds: ['volcanic_fissure', 'eruption', 'thunderstorm', 'entangle', 'rune_of_power', 'toxic_domain'] } },
  { id: 'gem_skills_purity', kind: 'skill', cost: 180, reqLevel: 1, label: 'Skill Pool — Purity',
    description: 'Purity of Elements / Fire / Cold / Lightning and Determination may drop.',
    payload: { skillIds: ['purity_of_elements', 'purity_of_fire', 'purity_of_cold', 'purity_of_lightning', 'determination'] } },
  { id: 'gem_skills_arsenal', kind: 'skill', cost: 220, reqLevel: 1, label: 'Skill Pool — Arsenal',
    description: 'Powderkeg Arrow, Orbital Blades, Pinning Spear, Groundswell, Mower\'s Arc, Summon Blade Wraith, Rolling Cannonade, Time Dilation may drop.',
    payload: { skillIds: ['powderkeg_arrow', 'orbital_blades', 'pinning_spear', 'groundswell', 'scythe_sweep', 'summon_blade_wraith', 'rolling_cannonade', 'time_dilation'] } },

  // --- Support drop bundles -------------------------------------------------
  { id: 'sup_t2', kind: 'support', cost: 100, reqLevel: 0, label: 'Support Pool II',
    description: 'Eruption Cycle, Channeled Tempest, Dive Bomb, Static Buildup, Forked Focus may drop.',
    payload: { supportIds: ['eruption_cycle', 'channeled_tempest', 'dive_bomb', 'static_buildup', 'forked_focus'] } },
  { id: 'sup_t3', kind: 'support', cost: 150, reqLevel: 1, label: 'Support Pool III',
    description: 'Powderkeg, Nova Release, Elemental Conduction, Capacitor may drop.',
    payload: { supportIds: ['powderkeg', 'nova_release', 'elemental_conduction', 'capacitor'] } },
  { id: 'sup_echoes', kind: 'support', cost: 200, reqLevel: 1, label: 'Support Pool — Echoes',
    description: 'Phantasmal Echo, Ancestral Call, Vessel of Shadow, Synchronicity may drop.',
    payload: { supportIds: ['phantasmal_echo', 'ancestral_call', 'vessel_of_shadow', 'synchronicity'] } },
  { id: 'sup_fragments', kind: 'support', cost: 150, reqLevel: 1, label: 'Support Pool — Fragments',
    description: 'Fragmentation, Bulwark Shards, Rage Remnant may drop.',
    payload: { supportIds: ['fragmentation', 'bulwark_shards', 'rage_remnants'] } },
  { id: 'sup_overcharge', kind: 'support', cost: 140, reqLevel: 1, label: 'Support Pool — Overcharge',
    description: 'Overcharge and Mounting Frenzy may drop.',
    payload: { supportIds: ['overcharge', 'mounting_frenzy'] } },
  { id: 'sup_covenants', kind: 'support', cost: 200, reqLevel: 1, label: 'Support Pool — Covenants',
    description: 'Vital Bond, Bloodletter\'s Rhythm, Remnant Conduit, Metronome, Colossus Stance, Transfusion Bond, Controlled Burn may drop.',
    payload: { supportIds: ['vital_bond', 'bloodletters_rhythm', 'remnant_conduit',
      'metronome', 'colossus_stance', 'transfusion_bond', 'controlled_burn'] } },

  // --- Town features (the roguelite town framework) ------------------------
  { id: 'feat_brandt_gems',     kind: 'feature', cost: 60,  reqLevel: 0, label: 'Brandt: +2 Wares',     description: 'Brandt stocks 6 gems instead of 4.',                   payload: { flag: FEATURE.BRANDT_EXTRA_GEMS } },
  { id: 'feat_brandt_supports', kind: 'feature', cost: 80,  reqLevel: 1, label: 'Brandt: Support Gems', description: 'Brandt also sells support gems.',                       payload: { flag: FEATURE.BRANDT_SELL_SUPPORTS } },
  { id: 'feat_brandt_restock',  kind: 'feature', cost: 100, reqLevel: 1, label: 'Brandt: Rush Order',   description: 'Brandt restocks every 15s instead of 30s.',            payload: { flag: FEATURE.BRANDT_FAST_RESTOCK } },
  // Mireille's care, in sequence: life heal, then mana heal, then an XP buff —
  // each surfaces once the previous is owned (a town pitstop that grows).
  { id: 'feat_mireille_life',  kind: 'feature', cost: 40,  reqLevel: 0, label: 'Mireille: Field Care',     description: 'Mireille restores your LIFE when you linger near her.',  payload: { flag: FEATURE.MIREILLE_HEAL_LIFE } },
  { id: 'feat_mireille_mana',  kind: 'feature', cost: 60,  reqLevel: 0, requiresFeature: FEATURE.MIREILLE_HEAL_LIFE, label: 'Mireille: Restorative Brew', description: 'She also replenishes your MANA.',                       payload: { flag: FEATURE.MIREILLE_HEAL_MANA } },
  { id: 'feat_mireille_xp',    kind: 'feature', cost: 120, reqLevel: 0, requiresFeature: FEATURE.MIREILLE_HEAL_MANA, label: 'Mireille: Traveller\'s Rest', description: 'Linger for a 5-minute +5% experience blessing — a worthwhile pitstop.', payload: { flag: FEATURE.MIREILLE_XP_BUFF } },
  // The TRACKER — the inn's word-of-mouth made flesh: once Mireille keeps you
  // fed and watered, her huntsman friend pitches camp. Unlocks the BESTIARY
  // (data/bestiary.ts): account-wide kill knowledge, studied into power.
  { id: 'feat_tracker', kind: 'feature', cost: 90, reqLevel: 0, requiresFeature: FEATURE.MIREILLE_HEAL_MANA, label: 'Weslan the Tracker', description: 'A huntsman camps at the town\'s west edge. Dwell by his fire to open the BESTIARY — every kind your line has slain, studied into knowledge that outlives every death.', payload: { flag: FEATURE.TRACKER } },

  // --- Town-building: the Quest Package (surfaces once any character reaches L5)
  { id: 'feat_quest_giver', kind: 'feature', cost: 100, reqLevel: 0, reqLedger: 'reached_level_5',
    label: 'Quest Package — Town Expansion',
    description: 'A quartermaster settles in Lastlight, posting hunts into the wilds (quest chains).',
    payload: { flag: FEATURE.QUEST_GIVER } },

  // --- Training Dummy (also surfaces once any character reaches L5) ----------
  { id: 'feat_target_dummy', kind: 'feature', cost: 50, reqLevel: 0, reqLedger: 'reached_level_5',
    label: 'Training Dummy — Town',
    description: 'A practice dummy stands in Lastlight: an immortal target to pummel and test your skills, effects, ailments, and modifiers against.',
    payload: { flag: FEATURE.TARGET_DUMMY } },

  // --- Campfire (also surfaces once any character reaches L5) ----------------
  { id: 'feat_campfire', kind: 'feature', cost: 70, reqLevel: 0, reqLedger: 'reached_level_5',
    label: 'Campfire — Town',
    description: 'A campfire is laid in Lastlight. Zones already remember their layout and surviving foes as you cross between them; dwell by the fire to REFRESH the wilds on command — every zone repopulates fresh (your cleared objectives stay claimed).',
    payload: { flag: FEATURE.CAMPFIRE } },

  // --- The Salvage Station (the essence economy's front door). Surfaces the
  //     moment a line first TOUCHES essence (a Gilded Scamp's spill, most
  //     likely) — the discovery IS the pitch. One purchase, two doors: the
  //     bench (break: rarity essence + craft lore) and Brandt's scrap counter
  //     (sell: coarse volume by quality). -------------------------------------
  { id: 'feat_salvage_station', kind: 'feature', cost: 60, reqLevel: 0, reqLedger: LEDGER_ESSENCE_TOUCHED,
    label: 'Salvage Station — Town',
    description: 'That strange residue has a name: ESSENCE. A breaker\'s bench is raised in Lastlight — dwell there to BREAK gear and carried gems into their rarity\'s essence (coarse, glimmering, brilliant, pristine), studying every affix broken. The same wisdom teaches Brandt to BUY SCRAP at his counter, paying Coarse Essence by an item\'s overall quality — sell for volume, break for the deep tints and the lore. Spend essence levelling skills, at counters, and crafting studied affixes onto your gear.',
    payload: { flag: FEATURE.SALVAGE_STATION } },
  { id: 'feat_craft_second', kind: 'feature', cost: 400, reqLevel: 0, reqLedger: 'reached_level_15', requiresFeature: FEATURE.SALVAGE_STATION,
    label: 'Salvage Station — Twin Anvils',
    description: 'The bench learns to hold TWO crafted affixes on one item (the one-craft rule, bought apart).',
    payload: { flag: FEATURE.CRAFT_SECOND_AFFIX } },
  { id: 'feat_oracle_stone', kind: 'feature', cost: 90, reqLevel: 0, reqLedger: 'reached_level_5',
    label: 'Oracle Stone — Town',
    description: 'Standing stones rise in Lastlight. Commune over an item (trace the runes — precision and haste decide the outcome) to REROLL one of its affixes; the stone answers each line only once, sealing it forever.',
    payload: { flag: FEATURE.ORACLE_STONE } },

  // --- THE IMMORTAL COVENANT (meta/modes.ts): a character MODE, not a town
  //     feature — earned by dying. Surfaces once the account has fallen
  //     IMMORTAL_CFG.unlockDeaths times; the two vessel slots ladder off it. ---
  { id: 'feat_immortal', kind: 'feature', cost: 100, reqLevel: 0,
    reqLedgerCounts: { [LEDGER_ACCOUNT_DEATHS]: IMMORTAL_CFG.unlockDeaths },
    label: 'The Immortal Covenant',
    description: `Death has seen you ${IMMORTAL_CFG.unlockDeaths} times, and blinked. `
      + 'Unlocks the IMMORTAL mode at character select: a sworn character plays the wake as any '
      + 'other — until its first death, which pays a reduced essence tithe and seals it OUTSIDE '
      + 'the mortal ledger. It wakes in town, build intact, carry lost; it persists across '
      + 'sessions in an account vessel; its later deaths feed the account nothing, and its '
      + 'corpses are visible only to itself. A life kept purely for the playing of it.',
    payload: { flag: FEATURE.IMMORTAL } },
  { id: 'feat_immortal_slot_2', kind: 'feature', cost: 200, reqLevel: 0,
    requiresUnlock: 'feat_immortal',
    label: 'Immortal — Second Vessel',
    description: 'The covenant holds a second sworn character (two Immortal save slots).',
    payload: { flag: FEATURE.IMMORTAL_SLOT_2 } },
  { id: 'feat_immortal_slot_3', kind: 'feature', cost: 350, reqLevel: 0,
    requiresUnlock: 'feat_immortal_slot_2',
    label: 'Immortal — Third Vessel',
    description: 'The covenant holds a third sworn character (three Immortal save slots).',
    payload: { flag: FEATURE.IMMORTAL_SLOT_3 } },

  // --- The Caravan: four broad tiers, each opening a wider band of escorted travel.
  //     Base tier (the Caravanner settles in town) at L10; far tiers ALSO need the
  //     Unmade slain. Each tier requires the previous (a growing route network). ----
  { id: 'feat_caravan', kind: 'feature', cost: 120, reqLevel: 0, reqLedger: 'reached_level_10',
    label: 'Caravan — Outpost',
    description: 'A travelling Caravanner makes camp in Lastlight and escorts you to the near wilds (lvl ≤20), minting a fixed route into each level band and ferrying you home.',
    payload: { flag: FEATURE.CARAVAN } },
  { id: 'feat_caravan_deep', kind: 'feature', cost: 200, reqLevel: 0, reqLedger: 'reached_level_30', requiresFeature: FEATURE.CARAVAN,
    label: 'Caravan — Deep Frontier',
    description: 'The Caravanner braves routes into the lvl 21–30 band.',
    payload: { flag: FEATURE.CARAVAN_DEEP } },
  { id: 'feat_caravan_far', kind: 'feature', cost: 320, reqLevel: 0, reqLedger: ['reached_level_40', 'unmade_slain'], requiresFeature: FEATURE.CARAVAN_DEEP,
    label: 'Caravan — Beyond the Veil',
    description: 'With the Unmade slain, the Caravanner runs the lvl 31–50 bands. (Requires: reach level 40 AND defeat the Unmade.)',
    payload: { flag: FEATURE.CARAVAN_FAR } },
  { id: 'feat_caravan_world', kind: 'feature', cost: 480, reqLevel: 0, reqLedger: ['reached_level_60', 'unmade_slain'], requiresFeature: FEATURE.CARAVAN_FAR,
    label: 'Caravan — The Far Reaches',
    description: 'The widest routes: the lvl 51–100 bands. (Requires: reach level 60 AND defeat the Unmade.)',
    payload: { flag: FEATURE.CARAVAN_WORLD } },

  // --- THE VOYAGE's shipwright: three hulls, each requiring the last — the
  //     naval meta-progression ladder (data/ships.ts maps flags → levers).
  //     Base tier surfaces once the account has ever CAST OFF (voyages_sailed). --
  { id: 'ship_sloop', kind: 'feature', cost: 90, reqLevel: 0, reqLedger: 'voyages_sailed',
    label: 'Shipwright — Coastal Sloop',
    description: 'A proper hull replaces the dinghy: +15% sail speed, a longer spyglass (the sea streams and reveals further), and a practiced landing crew.',
    payload: { flag: FEATURE.SHIP_SLOOP } },
  { id: 'ship_brigantine', kind: 'feature', cost: 220, reqLevel: 1, reqLedger: 'islands_landed', requiresFeature: FEATURE.SHIP_SLOOP,
    label: 'Shipwright — Brigantine',
    description: 'Twin masts for the open crossings: +32% sail speed, a far spyglass, and swift beachings. (Requires: land on a Voyage island.)',
    payload: { flag: FEATURE.SHIP_BRIGANTINE } },
  { id: 'ship_galleon', kind: 'feature', cost: 450, reqLevel: 2, reqLedger: 'reached_level_40', requiresFeature: FEATURE.SHIP_BRIGANTINE,
    label: 'Shipwright — Storm Galleon',
    description: 'The flagship: +50% sail speed, a horizon-spanning spyglass, and landings measured in heartbeats.',
    payload: { flag: FEATURE.SHIP_GALLEON } },

  // --- META-META: the global event-frequency crank (surfaces once ANY character
  //     has reached the level cap of 100 — a true end-game mastery reward) -------
  { id: 'feat_global_frequency', kind: 'feature', cost: 400, reqLevel: 0, reqLedger: 'reached_level_100',
    label: 'World Tempo — Global Event Frequency',
    description: 'End-game mastery: an Expedition-screen slider that scales how OFTEN world events occur AND how many run at once, across the whole run. Crank the world into a roaring festival of events, or dial it to a slow burn.',
    payload: { flag: FEATURE.GLOBAL_FREQUENCY } },

  // --- Master gem unlock: everything obtainable (a deliberate, expensive flip) -
  { id: 'feat_unlock_all_gems', kind: 'feature', cost: 500, reqLevel: 2,
    label: 'Grand Codex — Unlock All Gems',
    description: 'EVERY skill and support gem becomes obtainable (drops, chests, Brandt) — including anything added in the future. One deliberate unlock so new content is always reachable. (Classes are unlocked apart — each Class bundle also widens the roll at character select.)',
    payload: { flag: FEATURE.UNLOCK_ALL_GEMS } },
];

/** Static catalog by id — the resolution table for `requiresUnlock` ladders. */
const CATALOG_BY_ID = new Map(UNLOCK_CATALOG.map(u => [u.id, u] as const));

/** The class-bundle entry that unlocks a given class (undefined for starters).
 *  The class-select teasers use it to point a locked class at its exact
 *  Vault purchase. */
export function classUnlockFor(classId: string): Unlockable | undefined {
  return CATALOG_BY_ID.get(`class_${classId}`);
}

export function isUnlockOwned(a: Account, u: Unlockable): boolean {
  switch (u.kind) {
    case 'slot':    return a.unlockedSlots.has(u.payload.slotCount);
    // Owning the CLASS is the bundle's identity — gem overlap with old saves'
    // pool purchases never blocks the class itself from being purchasable.
    case 'class':   return a.unlockedClasses.has(u.payload.classId);
    case 'skill':   return u.payload.skillIds.every(id => a.unlockedSkills.has(id));
    case 'support': return u.payload.supportIds.every(id => a.unlockedSupports.has(id));
    case 'feature': return a.features.has(u.payload.flag);
    case 'package': return a.packageUnlocks.has(u.payload.tierId ?? u.payload.packageId);
  }
}

/** Content-package configuration purchases, generated from the registry: one
 *  BASE entry per non-substrate package, plus one per INVESTMENT TIER. The base
 *  is gated by the package's unlock predicate (e.g. Breach appears once you've
 *  opened one); each tier surfaces once the prior tier is owned and its own
 *  milestone is earned (Seal 5 Breaches → Investigation). */
function packageUnlockables(): Unlockable[] {
  const out: Unlockable[] = [];
  for (const p of PACKAGES) {
    if (p.alwaysOn) continue;
    out.push({
      id: `pkg_${p.id}`, kind: 'package',
      // A pressureless package is a PLACE the purchase itself opens — nothing
      // ran before buying it, so "Configurable" (tuning an already-live
      // feature) would mislabel it.
      label: p.pressureless ? p.label : `${p.label} — Configurable`,
      description: p.blurb, cost: p.cost,
      payload: { packageId: p.id },
    });
    for (const t of p.tiers ?? []) {
      out.push({
        id: `pkg_${p.id}_${t.id}`, kind: 'package',
        label: `${p.label}: ${t.label}`, description: t.requirement, cost: t.cost,
        payload: { packageId: p.id, tierId: t.id },
      });
    }
  }
  return out;
}

/** Static catalog + the dynamic package purchases. */
export function allUnlockables(): Unlockable[] {
  return [...UNLOCK_CATALOG, ...packageUnlockables()];
}

/** Is this unlock visible/purchasable yet (its gate met)? Static entries gate on
 *  sequencing/level/ledger; package BASE entries on the unlock predicate; package
 *  TIER entries on (base owned + every prior tier owned + this tier's milestone). */
export function isUnlockVisible(a: Account, u: Unlockable): boolean {
  if (u.kind !== 'package') return staticGateMet(a, u);
  const pkg = PACKAGE_BY_ID[u.payload.packageId];
  if (!pkg) return false;
  if (!u.payload.tierId) return unlockMet(pkg.unlock, a); // base config
  if (!a.packageUnlocks.has(pkg.id)) return false;        // need the base unlock first
  const tiers = pkg.tiers ?? [];
  const idx = tiers.findIndex(t => t.id === u.payload.tierId);
  if (idx < 0) return false;
  for (let i = 0; i < idx; i++) if (!a.packageUnlocks.has(tiers[i].id)) return false; // staggered
  return tiers[idx].test({ account: a, ledger: a.ledger });
}

/** Sequencing + account-level + (for features) a lifetime-ledger milestone
 *  gate. Non-package. */
function staticGateMet(a: Account, u: Unlockable): boolean {
  if ((u.reqLevel ?? 0) > a.level) return false;
  // GENERIC LADDERS: hidden until the named catalog unlock(s) are OWNED — the
  // class-slot sequence is pure prior-purchase gating, no account level at all.
  if (u.requiresUnlock) {
    const needs = Array.isArray(u.requiresUnlock) ? u.requiresUnlock : [u.requiresUnlock];
    for (const id of needs) {
      const dep = CATALOG_BY_ID.get(id);
      if (!dep || !isUnlockOwned(a, dep)) return false;
    }
  }
  // reqLedger may be a SINGLE key or MANY (all required, ANDed) — e.g. a far caravan
  // tier needs BOTH a level milestone AND unmade_slain. Generic to every kind.
  if (u.reqLedger) {
    const keys = Array.isArray(u.reqLedger) ? u.reqLedger : [u.reqLedger];
    if (keys.some(k => (a.ledger[k] ?? 0) < 1)) return false;
  }
  // reqLedgerCounts gates on accumulated TALLIES (die 20 times, sail 5 voyages)
  // rather than mere presence — the counted-milestone form of the same seam.
  if (u.reqLedgerCounts) {
    for (const [k, n] of Object.entries(u.reqLedgerCounts)) {
      if ((a.ledger[k] ?? 0) < n) return false;
    }
  }
  // Sequential feature ladders (e.g. Mireille life → mana → XP buff).
  if (u.kind === 'feature' && u.requiresFeature && !a.features.has(u.requiresFeature)) return false;
  return true;
}

/** Entries the player can SEE in the Vault (gate met, not owned). */
export function availableUnlocks(a: Account): Unlockable[] {
  return allUnlockables().filter(u => isUnlockVisible(a, u) && !isUnlockOwned(a, u));
}

/** Packages the player can't tune YET (unlock unmet, not purchased), shown with
 *  their requirement. `active` distinguishes a base-game feature that is already
 *  RUNNING (just not yet tunable) from an opt-in package that is fully OFF — so
 *  the Vault never tells the player a live feature is "locked". */
export function lockedPackages(a: Account): { label: string; requirement: string; cost: number; active: boolean }[] {
  return PACKAGES
    .filter(p => !p.alwaysOn && !a.packageUnlocks.has(p.id) && !unlockMet(p.unlock, a))
    .map(p => ({ label: p.label, requirement: p.unlock.label, cost: p.cost, active: p.defaultEnabled }));
}

/** Spend credits to apply an unlock. Mutates the account; returns false if
 *  unaffordable / already owned / gate unmet. Caller saves. */
export function applyUnlock(a: Account, u: Unlockable): boolean {
  // The buy gate is exactly the visibility gate (sequencing, account level,
  // package tier staggering, or a feature's ledger milestone).
  if (a.credits < u.cost || isUnlockOwned(a, u) || !isUnlockVisible(a, u)) return false;
  a.credits -= u.cost;
  switch (u.kind) {
    case 'slot':    a.unlockedSlots.add(u.payload.slotCount); break;
    // A class bundle is SEVERAL unlocks in one: the class enters the roll pool,
    // its gems enter the drop pool (Sets dedupe any overlap with owned pools) —
    // and realizing the class later opens its vocation chain for free.
    case 'class':
      a.unlockedClasses.add(u.payload.classId);
      for (const id of u.payload.skillIds) a.unlockedSkills.add(id);
      for (const id of u.payload.supportIds) a.unlockedSupports.add(id);
      break;
    case 'skill':   for (const id of u.payload.skillIds) a.unlockedSkills.add(id); break;
    case 'support': for (const id of u.payload.supportIds) a.unlockedSupports.add(id); break;
    case 'feature': a.features.add(u.payload.flag); break;
    case 'package': a.packageUnlocks.add(u.payload.tierId ?? u.payload.packageId); break;
  }
  return true;
}
