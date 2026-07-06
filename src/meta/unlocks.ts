// ---------------------------------------------------------------------------
// UNLOCK CATALOG — the spendable meta-progression, as data.
//
// Each entry is one thing the player can buy with account credits: a class, a
// bundle of gems that may then drop, or a town FEATURE flag. Adding a new
// unlock is one entry here. Modelled as a discriminated union on `kind` so the
// apply/own switches narrow `payload` with no casts under strict mode.
// ---------------------------------------------------------------------------

import { FEATURE, type Account } from './account';
import { PACKAGES, PACKAGE_BY_ID, unlockMet } from '../packages/registry';

export type Unlockable =
  | { id: string; kind: 'slot'; label: string; description: string; cost: number; reqLevel?: number; payload: { slotCount: number } }
  | { id: string; kind: 'skill'; label: string; description: string; cost: number; reqLevel?: number; payload: { skillIds: string[] } }
  | { id: string; kind: 'support'; label: string; description: string; cost: number; reqLevel?: number; payload: { supportIds: string[] } }
  | { id: string; kind: 'feature'; label: string; description: string; cost: number; reqLevel?: number; reqLedger?: string | string[]; requiresFeature?: string; payload: { flag: string } }
  | { id: string; kind: 'package'; label: string; description: string; cost: number; reqLevel?: number; payload: { packageId: string; tierId?: string } };

/** Class SLOTS, data-driven and ordered ascending. Each tier surfaces one more
 *  SELECTABLE class at character select (the roster is then rolled at random,
 *  so you can't be sure which classes appear). Trivially extended — works the
 *  same for 12 or 40 classes. Cost/level thresholds are pure data; tune freely. */
export const SLOT_TIERS: readonly { id: string; slots: number; cost: number; reqLevel: number }[] = [
  { id: 'slot_tier_4', slots: 4, cost: 40,  reqLevel: 0 },
  { id: 'slot_tier_5', slots: 5, cost: 80,  reqLevel: 0 },
  { id: 'slot_tier_6', slots: 6, cost: 130, reqLevel: 1 },
  { id: 'slot_tier_7', slots: 7, cost: 200, reqLevel: 2 },
  { id: 'slot_tier_8', slots: 8, cost: 300, reqLevel: 3 },
];

export const UNLOCK_CATALOG: Unlockable[] = [
  // --- Class slots: buy more SELECTABLE class options at character select ----
  ...SLOT_TIERS.map((t): Unlockable => ({
    id: t.id, kind: 'slot', cost: t.cost, reqLevel: t.reqLevel,
    label: `Class Slot ${t.slots}`,
    description: `Surface a ${t.slots}th selectable class at character select (chosen at random each visit).`,
    payload: { slotCount: t.slots },
  })),

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
  { id: 'gem_skills_harvest', kind: 'skill', cost: 200, reqLevel: 1, label: 'Skill Pool — Harvest & Hordes',
    description: 'Reap, Whirling Reap, Summon Raging Spirit, Spirit Pyre, Summon Wraith, Infernal Bombardment, Archon Lance, Sanguine Burst may drop.',
    payload: { skillIds: ['reap', 'whirling_reap', 'summon_raging_spirit', 'spirit_pyre',
      'summon_wraith', 'infernal_bombardment', 'archon_lance', 'sanguine_burst'] } },
  { id: 'gem_skills_covenants', kind: 'skill', cost: 160, reqLevel: 1, label: 'Skill Pool — Covenants',
    description: 'Convocation, Overclock, Blood Mortgage may drop.',
    payload: { skillIds: ['convocation', 'overclock', 'blood_mortgage'] } },
  { id: 'gem_skills_warpath', kind: 'skill', cost: 180, reqLevel: 1, label: 'Skill Pool — Warpath',
    description: 'Berserk, Bloodlust, Soul Harvest, Flame Imbuement, Venom Ammunition, Flame Blast may drop.',
    payload: { skillIds: ['berserk', 'bloodlust', 'soul_harvest', 'flame_imbuement', 'venom_ammunition', 'flame_blast'] } },
  { id: 'gem_skills_groundwork', kind: 'skill', cost: 200, reqLevel: 1, label: 'Skill Pool — Groundwork',
    description: 'Volcanic Fissure, Eruption, Thunderstorm, Entangle, Rune of Power, Toxic Domain may drop.',
    payload: { skillIds: ['volcanic_fissure', 'eruption', 'thunderstorm', 'entangle', 'rune_of_power', 'toxic_domain'] } },
  { id: 'gem_skills_communion', kind: 'skill', cost: 200, reqLevel: 1, label: 'Skill Pool — Communion',
    description: 'Mend, Greater Mending, Benediction, Communion, Healing Rain, Consecration, Healing Stream, Cleansing Light may drop.',
    payload: { skillIds: ['mend', 'greater_mending', 'benediction', 'communion', 'healing_rain', 'consecration', 'healing_stream', 'cleansing_light'] } },
  { id: 'gem_skills_devout', kind: 'skill', cost: 220, reqLevel: 1, label: 'Skill Pool — Devout',
    description: 'Sanctified Strike, Lifedrain, Soul Volley, Tree of Life, Font of Renewal, Summon Skeletal Cleric, Bind Spirit Mender may drop.',
    payload: { skillIds: ['sanctified_strike', 'lifedrain', 'soul_volley', 'tree_of_life', 'font_of_renewal', 'summon_cleric', 'spirit_mender'] } },
  { id: 'gem_skills_purity', kind: 'skill', cost: 180, reqLevel: 1, label: 'Skill Pool — Purity',
    description: 'Purity of Elements / Fire / Cold / Lightning and Determination may drop.',
    payload: { skillIds: ['purity_of_elements', 'purity_of_fire', 'purity_of_cold', 'purity_of_lightning', 'determination'] } },
  { id: 'gem_skills_hive', kind: 'skill', cost: 160, reqLevel: 1, label: 'Skill Pool — Hive & Command',
    description: 'Hivecall (swarmlings + Enrage meta) and Command: Assault may drop.',
    payload: { skillIds: ['summon_swarmlings', 'command_assault'] } },
  { id: 'gem_skills_bulwark', kind: 'skill', cost: 200, reqLevel: 1, label: 'Skill Pool — Bulwark',
    description: 'Iron Ward, Magma Ward, Transgression, Pain Hounds, Bristleback, Soul Link may drop.',
    payload: { skillIds: ['iron_ward', 'magma_ward', 'transgression', 'pain_hounds', 'bristleback', 'soul_link'] } },
  { id: 'gem_skills_verdict', kind: 'skill', cost: 180, reqLevel: 1, label: 'Skill Pool — Verdict',
    description: 'Expose Weakness, Word of Doom, Execution may drop.',
    payload: { skillIds: ['expose_weakness', 'word_of_doom', 'execution'] } },
  { id: 'gem_skills_arsenal', kind: 'skill', cost: 220, reqLevel: 1, label: 'Skill Pool — Arsenal',
    description: 'Powderkeg Arrow, Orbital Blades, Pinning Spear, Groundswell, Mower\'s Arc, Summon Blade Wraith, Rolling Cannonade, Time Dilation may drop.',
    payload: { skillIds: ['powderkeg_arrow', 'orbital_blades', 'pinning_spear', 'groundswell', 'scythe_sweep', 'summon_blade_wraith', 'rolling_cannonade', 'time_dilation'] } },
  { id: 'sup_arsenal', kind: 'support', cost: 120, reqLevel: 1, label: 'Support Pool — Arsenal',
    description: 'Momentum may drop.',
    payload: { supportIds: ['momentum'] } },
  { id: 'sup_verdict', kind: 'support', cost: 140, reqLevel: 1, label: 'Support Pool — Verdict',
    description: 'Exposure and Bristling Riposte may drop.',
    payload: { supportIds: ['exposure', 'bristling_riposte'] } },

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
  { id: 'sup_harvest', kind: 'support', cost: 180, reqLevel: 1, label: 'Support Pool — Harvest',
    description: 'Sweeping Blow, Mana Feeder, Enduring Bond may drop.',
    payload: { supportIds: ['sweeping_blow', 'mana_feeder', 'enduring_bond'] } },
  { id: 'sup_fragments', kind: 'support', cost: 150, reqLevel: 1, label: 'Support Pool — Fragments',
    description: 'Fragmentation, Bulwark Shards, Rage Remnant may drop.',
    payload: { supportIds: ['fragmentation', 'bulwark_shards', 'rage_remnants'] } },
  { id: 'sup_overcharge', kind: 'support', cost: 220, reqLevel: 1, label: 'Support Pool — Overcharge & Disciplines',
    description: 'Overcharge, Mounting Frenzy, Perfect Draw, Wandering Mark, Spark Discipline may drop.',
    payload: { supportIds: ['overcharge', 'mounting_frenzy', 'perfect_draw', 'wandering_mark', 'spark_discipline'] } },
  { id: 'sup_mender', kind: 'support', cost: 180, reqLevel: 1, label: 'Support Pool — Mender',
    description: 'Intensive Care, Mending Chain, Overmend may drop.',
    payload: { supportIds: ['intensive_care', 'mending_chain', 'overmend'] } },
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

  // --- The Salvage Station (the essence economy's front door) ----------------
  { id: 'feat_salvage_station', kind: 'feature', cost: 60, reqLevel: 0, reqLedger: 'reached_level_5',
    label: 'Salvage Station — Town',
    description: 'A breaker\'s bench is raised in Lastlight. Dwell there to break gear and carried gems into Essence — spend it levelling skills, at Brandt\'s counter, and (as salvaging teaches you each affix) crafting studied affixes directly onto your gear.',
    payload: { flag: FEATURE.SALVAGE_STATION } },
  { id: 'feat_craft_second', kind: 'feature', cost: 400, reqLevel: 0, reqLedger: 'reached_level_15', requiresFeature: FEATURE.SALVAGE_STATION,
    label: 'Salvage Station — Twin Anvils',
    description: 'The bench learns to hold TWO crafted affixes on one item (the one-craft rule, bought apart).',
    payload: { flag: FEATURE.CRAFT_SECOND_AFFIX } },
  { id: 'feat_oracle_stone', kind: 'feature', cost: 90, reqLevel: 0, reqLedger: 'reached_level_5',
    label: 'Oracle Stone — Town',
    description: 'Standing stones rise in Lastlight. Commune over an item (trace the runes — precision and haste decide the outcome) to REROLL one of its affixes; the stone answers each line only once, sealing it forever.',
    payload: { flag: FEATURE.ORACLE_STONE } },

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
    description: 'EVERY skill and support gem becomes obtainable (drops, chests, Brandt) — including anything added in the future. One deliberate unlock so new content is always reachable.',
    payload: { flag: FEATURE.UNLOCK_ALL_GEMS } },
];

export function isUnlockOwned(a: Account, u: Unlockable): boolean {
  switch (u.kind) {
    case 'slot':    return a.unlockedSlots.has(u.payload.slotCount);
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
      label: `${p.label} — Configurable`, description: p.blurb, cost: p.cost,
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
 *  account level; package BASE entries on the unlock predicate; package TIER
 *  entries on (base owned + every prior tier owned + this tier's milestone). */
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

/** Account-level + (for features) a lifetime-ledger milestone gate. Non-package. */
function staticGateMet(a: Account, u: Unlockable): boolean {
  if ((u.reqLevel ?? 0) > a.level) return false;
  // reqLedger may be a SINGLE key or MANY (all required, ANDed) — e.g. a far caravan
  // tier needs BOTH a level milestone AND unmade_slain.
  if (u.kind === 'feature' && u.reqLedger) {
    const keys = Array.isArray(u.reqLedger) ? u.reqLedger : [u.reqLedger];
    if (keys.some(k => (a.ledger[k] ?? 0) < 1)) return false;
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
 *  unaffordable / already owned / below the level requirement. Caller saves. */
export function applyUnlock(a: Account, u: Unlockable): boolean {
  // The buy gate is exactly the visibility gate (account level, package tier
  // staggering, or a feature's ledger milestone).
  if (a.credits < u.cost || isUnlockOwned(a, u) || !isUnlockVisible(a, u)) return false;
  a.credits -= u.cost;
  switch (u.kind) {
    case 'slot':    a.unlockedSlots.add(u.payload.slotCount); break;
    case 'skill':   for (const id of u.payload.skillIds) a.unlockedSkills.add(id); break;
    case 'support': for (const id of u.payload.supportIds) a.unlockedSupports.add(id); break;
    case 'feature': a.features.add(u.payload.flag); break;
    case 'package': a.packageUnlocks.add(u.payload.tierId ?? u.payload.packageId); break;
  }
  return true;
}
