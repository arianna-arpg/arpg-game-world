// ---------------------------------------------------------------------------
// THE PASSIVE TREE â€” written by the in-game passive-tree editor (DEV tool).
// Each node is explicit data: position (x, y), attribute grants, stat modifiers,
// and links. Re-edit visually with DEV.passiveTreeEditor and Save to overwrite.
// (The prior version is preserved alongside as passives.ts.bak.)
// ---------------------------------------------------------------------------

import { gaugeMod, linkMod, mod, type Attributes, type Modifier } from '../engine/stats';
import { CLASSES } from './classes';
import { VOCATIONS, VOCATION_CFG, vocationNodeId, vocationRootId } from './vocations';
import type { GraftSpec, PassiveChoiceRef } from './passiveChoices';

export type NodeKind = 'start' | 'small' | 'notable' | 'keystone' | 'attr' | 'vocation' | 'choice';

export interface PassiveNode {
  id: string;
  name: string;
  description: string;
  kind: NodeKind;
  x: number;
  y: number;
  attributes?: Partial<Attributes>;
  /** PERCENT attribute grants (+0.05 = "5% increased Fortitude") â€” the
   *  multiplicative lever beside the flat one. Folded in recalcSeat AFTER
   *  every flat source (base + tree + gear), so it scales the whole pool. */
  attributesPct?: Partial<Attributes>;
  mods?: Modifier[];
  links: string[];
  /** CHOICE NODE: this node deals options from a data/passiveChoices.ts group
   *  instead of (or on top of) its own grants. Each pick spends a point and is
   *  permanent; the popup, allocation legality, recalc folding, saves and the
   *  wire all resolve through that one registry. */
  choice?: PassiveChoiceRef;
  /** PASSIVE REALM (data/passiveRealms.ts): which constellation TAB this node
   *  lives on. Absent = the main star. A realm's def decides its unlock,
   *  adjacency style ('free' realms skip pathing), and point currency â€”
   *  everything else (grants, choices, recalc, saves) is identical. Realms
   *  render one at a time, so coordinate spaces are per-realm. */
  realm?: string;
  /** GRAFT: a bindable support-gem payload this node grants while allocated
   *  (choice OPTIONS may carry their own) â€” socketed onto ONE learned skill
   *  through the skill book, riding hostSockets beside its real gems. */
  graft?: GraftSpec;
  /** Set on VOCATION mini-tree nodes (the owning VocationDef id). These render
   *  and allocate ONLY for a character who has EARNED that vocation, and they
   *  spend vocation points â€” see world.allocateNode / panels.refreshTree. */
  vocation?: string;
}

const nodes: PassiveNode[] = [
  { id: "str_start", name: "Way of Strength", description: "A starting point of the nine-pointed star. Any class may path through it.", kind: "start", x: 2996, y: 3394, attributes: { strength: 3 }, links: [] },
  { id: "war_s1", name: "Sword Mastery", description: "10% increased melee damage", kind: "small", x: 3165, y: 3730, mods: [mod("damage", "increased", 0.1, ["melee"])], links: [] },
  { id: "war_s2", name: "Toughness", description: "+20 maximum life", kind: "small", x: 2870, y: 4024, mods: [mod("life", "flat", 20)], links: [] },
  { id: "war_n1", name: "Crushing Blows", description: "25% increased melee damage, +10% ailment chance with melee skills", kind: "notable", x: 3227, y: 3833, mods: [mod("damage", "increased", 0.25, ["melee"]), mod("statusChance", "flat", 0.1, ["melee"])], links: ["war_s1", "war_s4"] },
  { id: "war_s3", name: "Plated Armor", description: "+35 armor, 4% chance to block", kind: "small", x: 2750, y: 4066, mods: [mod("armor", "flat", 35), mod("blockChance", "flat", 0.04)], links: [] },
  { id: "war_s4", name: "Sword Expertise", description: "12% increased melee damage, adds 3 physical damage to melee skills", kind: "small", x: 3159, y: 3886, mods: [mod("damage", "increased", 0.12, ["melee"]), mod("addedPhysical", "flat", 3, ["melee"])], links: [] },
  { id: "war_n2", name: "Juggernaut", description: "+50 armor, 8% less damage taken, 8% block chance, 30% increased guard strength", kind: "notable", x: 2769, y: 4368, mods: [mod("armor", "flat", 50), mod("damageTaken", "more", -0.08), mod("blockChance", "flat", 0.08), mod("guardStrength", "increased", 0.3)], links: [] },
  { id: "war_key", name: "Unstoppable", description: "KEYSTONE: 25% less damage taken, but 20% less damage dealt", kind: "keystone", x: 3891, y: 5546, mods: [mod("damageTaken", "more", -0.25), mod("damage", "more", -0.2)], links: [] },
  { id: "prw_start", name: "Way of Prowess", description: "A starting point of the nine-pointed star. Any class may path through it.", kind: "start", x: 3271, y: 3298, attributes: { prowess: 3 }, links: [] },
  { id: "brz_s1", name: "Ferocity", description: "10% increased attack damage", kind: "small", x: 3297, y: 2127, mods: [mod("damage", "increased", 0.1, ["attack"])], links: ["node_98"] },
  { id: "brz_s2", name: "Quick Slashes", description: "8% increased attack speed", kind: "small", x: 3788, y: 3807, mods: [mod("attackSpeed", "increased", 0.08, ["attack"])], links: ["brz_s3", "node_119"] },
  { id: "brz_n1", name: "Bloodlust", description: "20% increased attack damage, 1% of damage leeched as life", kind: "notable", x: 3355, y: 2072, mods: [mod("damage", "increased", 0.2, ["attack"]), mod("lifeLeech", "flat", 0.01)], links: ["brz_s1"] },
  { id: "brz_s3", name: "Adrenaline", description: "8% increased attack speed", kind: "small", x: 3733, y: 3888, mods: [mod("attackSpeed", "increased", 0.08, ["attack"])], links: [] },
  { id: "brz_s4", name: "Carnage", description: "12% increased attack damage", kind: "small", x: 4790, y: 4495, mods: [mod("damage", "increased", 0.12, ["attack"])], links: ["furious_momentum", "node_121"] },
  { id: "brz_n2", name: "Frenzied Assault", description: "12% increased attack speed, 10% increased damage", kind: "notable", x: 3808, y: 3970, mods: [mod("attackSpeed", "increased", 0.12, ["attack"]), mod("damage", "increased", 0.1)], links: ["brz_s3"] },
  { id: "brz_key", name: "Reckless Abandon", description: "KEYSTONE: 30% more damage, but 25% more damage taken", kind: "keystone", x: 4765, y: 4604, mods: [mod("damage", "more", 0.3), mod("damageTaken", "more", 0.25)], links: ["brz_s4"] },
  { id: "int_start", name: "Way of Intelligence", description: "A starting point of the nine-pointed star. Any class may path through it.", kind: "start", x: 2644, y: 3070, attributes: { intelligence: 3 }, links: ["node_130", "node_131", "node_85"] },
  { id: "sor_s1", name: "Arcane Insight", description: "12% increased spell damage", kind: "small", x: 2379, y: 3011, mods: [mod("damage", "increased", 0.12, ["spell"])], links: [] },
  { id: "sor_s2", name: "Deep Reserves", description: "+20 maximum mana", kind: "small", x: 2460, y: 3262, mods: [mod("mana", "flat", 20)], links: [] },
  { id: "sor_n1", name: "Spellweaver", description: "20% increased spell damage, +10% ailment chance with spells", kind: "notable", x: 1732, y: 4185, mods: [mod("damage", "increased", 0.2, ["spell"]), mod("statusChance", "flat", 0.1, ["spell"])], links: [] },
  { id: "sor_s3", name: "Mental Acuity", description: "+15 mana, +1 mana regeneration per second", kind: "small", x: 1714, y: 3160, mods: [mod("mana", "flat", 15), mod("manaRegen", "flat", 1)], links: [] },
  { id: "sor_s4", name: "Focused Mind", description: "12% increased spell damage, +3% spell critical strike chance", kind: "small", x: 947, y: 4637, mods: [mod("damage", "increased", 0.12, ["spell"]), mod("critChance", "flat", 0.03, ["spell"])], links: [] },
  { id: "sor_n2", name: "Archmage", description: "25% increased spell damage, 10% increased cast speed", kind: "notable", x: 1748, y: 5333, mods: [mod("damage", "increased", 0.25, ["spell"]), mod("castSpeed", "increased", 0.1)], links: ["sor_x1"] },
  { id: "sor_key", name: "Glass Cannon", description: "KEYSTONE: 40% more damage, but 30% more damage taken", kind: "keystone", x: 837, y: 4701, mods: [mod("damage", "more", 0.4), mod("damageTaken", "more", 0.3)], links: ["sor_s4"] },
  { id: "wis_start", name: "Way of Wisdom", description: "A starting point of the nine-pointed star. Any class may path through it.", kind: "start", x: 2686, y: 2805, attributes: { wisdom: 3 }, links: [] },
  { id: "sum_s1", name: "Minion Fury", description: "15% increased minion damage", kind: "small", x: 1285, y: 2687, mods: [mod("minionDamage", "increased", 0.15)], links: [] },
  { id: "sum_s2", name: "Minion Life", description: "8% increased minion life", kind: "small", x: 440, y: 3091, mods: [mod("minionLife", "increased", 0.08)], links: [] },
  { id: "sum_n1", name: "Lord of Legions", description: "+1 maximum minion for all summon skills, 10% increased minion damage", kind: "notable", x: 559, y: 2887, mods: [mod("minionMaxCount", "flat", 1), mod("minionDamage", "increased", 0.1)], links: ["sum_x1"] },
  { id: "sum_s3", name: "Skill Effect Duration", description: "8% increased skill effect duration", kind: "small", x: 1929, y: 1638, mods: [mod("effectDuration", "increased", 0.08)], links: [] },
  { id: "sum_s4", name: "Dark Pact", description: "12% increased chaos damage", kind: "small", x: 2223, y: 1712, mods: [mod("damage", "increased", 0.12, ["chaos"])], links: [] },
  { id: "sum_n2", name: "Plaguebearer", description: "22% increased chaos damage, +15% ailment chance", kind: "notable", x: 2230, y: 1645, mods: [mod("damage", "increased", 0.22, ["chaos"]), mod("statusChance", "flat", 0.15)], links: ["sum_s4"] },
  { id: "sum_key", name: "Necromantic Pact", description: "KEYSTONE: +2 maximum minions, but 25% less maximum life", kind: "keystone", x: 698, y: 2742, mods: [mod("minionMaxCount", "flat", 2), mod("life", "more", -0.25)], links: [] },
  { id: "fin_start", name: "Way of Finesse", description: "A starting point of the nine-pointed star. Any class may path through it.", kind: "start", x: 3137, y: 2626, attributes: { finesse: 3 }, links: ["node_168", "node_173", "node_97"] },
  { id: "swb_s1", name: "Evasion", description: "15% increased evasion", kind: "small", x: 1664, y: 1742, mods: [mod("evasion", "increased", 0.15)], links: [] },
  { id: "swb_s2", name: "Fleet Foot", description: "6% increased movement speed", kind: "small", x: 3173, y: 1409, mods: [mod("moveSpeed", "increased", 0.06)], links: ["swb_s3"] },
  { id: "swb_n1", name: "Wind Dancer", description: "30% increased evasion", kind: "notable", x: 3054, y: 186, mods: [mod("evasion", "increased", 0.3)], links: [] },
  { id: "swb_s3", name: "Keen Eye", description: "+3% critical strike chance", kind: "small", x: 3208, y: 1480, mods: [mod("critChance", "flat", 0.03)], links: [] },
  { id: "swb_s4", name: "Critical Strike Multiplier", description: "+15% critical strike multiplier", kind: "small", x: 5227, y: 1190, mods: [mod("critMulti", "flat", 0.15)], links: [] },
  { id: "swb_n2", name: "Opportunist", description: "+6% critical strike chance, +25% critical strike multiplier", kind: "notable", x: 5195, y: 1302, mods: [mod("critChance", "flat", 0.06), mod("critMulti", "flat", 0.25)], links: ["swb_s4"] },
  { id: "swb_key", name: "Phantom Step", description: "KEYSTONE: 80% more evasion, but 15% less maximum life", kind: "keystone", x: 2760, y: 30, mods: [mod("evasion", "more", 0.8), mod("life", "more", -0.15)], links: ["swb_n1"] },
  { id: "ironturn", name: "Ironturn", description: "KEYSTONE: renounce all evasion; 60% of it is read again as armor", kind: "keystone", x: 3312, y: 240, mods: [mod("evasionForgone", "flat", 1), mod("evasionToArmor", "flat", 0.6)], links: ["swb_n1"] },
  { id: "dex_start", name: "Way of Dexterity", description: "A starting point of the nine-pointed star. Any class may path through it.", kind: "start", x: 3332, y: 2808, attributes: { dexterity: 3 }, links: ["node_103", "node_165", "node_170"] },
  { id: "rng_s1", name: "Steady Aim", description: "12% increased projectile damage", kind: "small", x: 4096, y: 1492, mods: [mod("damage", "increased", 0.12, ["projectile"])], links: [] },
  { id: "rng_s2", name: "Eagle Eye", description: "+40 accuracy", kind: "small", x: 4463, y: 2501, mods: [mod("accuracy", "flat", 40)], links: ["rng_s3"] },
  { id: "rng_n1", name: "Sniper", description: "20% increased projectile damage and speed", kind: "notable", x: 4175, y: 1402, mods: [mod("damage", "increased", 0.2, ["projectile"]), mod("projectileSpeed", "increased", 0.2)], links: ["rng_s1", "rng_s4"] },
  { id: "rng_s3", name: "Swift Draw", description: "8% increased attack speed", kind: "small", x: 4491, y: 2576, mods: [mod("attackSpeed", "increased", 0.08, ["attack"])], links: [] },
  { id: "rng_s4", name: "Barbed Tips", description: "Adds 3 physical damage to projectile skills", kind: "small", x: 4231, y: 1321, mods: [mod("addedPhysical", "flat", 3, ["projectile"])], links: [] },
  { id: "rng_n2", name: "Impaler", description: "Projectiles pierce +1 target, 15% increased projectile damage", kind: "notable", x: 4558, y: 2630, mods: [mod("pierceCount", "flat", 1), mod("damage", "increased", 0.15, ["projectile"])], links: ["rng_s3"] },
  { id: "rng_key", name: "Arrowstorm", description: "KEYSTONE: +1 projectile with all skills, but 20% less damage", kind: "keystone", x: 5465, y: 1563, mods: [mod("projectileCount", "flat", 1), mod("damage", "more", -0.2)], links: [] },
  { id: "sum_x1", name: "Martyrdom", description: "Minions explode on death, dealing 30% of their maximum life as fire damage", kind: "keystone", x: 491, y: 2951, mods: [mod("minionExplodeDeath", "flat", 0.3)], links: [] },
  { id: "sum_x2", name: "Endless Swarm", description: "You may summon 25% more minions, but they are 25% smaller and deal 15% less damage", kind: "keystone", x: 2014, y: 977, mods: [mod("minionMaxCount", "more", 0.25), mod("minionSize", "increased", -0.25), mod("minionDamage", "increased", -0.15)], links: [] },
  { id: "sor_x1", name: "Thunderstruck", description: "Spell hits have 15% chance to call Thunderstruck â€” an echoing burst at 50% damage", kind: "notable", x: 1356, y: 5196, mods: [mod("proc_thunderstruck", "flat", 0.15, ["spell"])], links: [] },
  { id: "cl_gam_s1", name: "Storm Fortune", description: "10% increased Luck with spells (proc and rider rates)", kind: "small", x: 1290, y: 5290, mods: [mod("luck", "flat", 0.1, ["spell"])], links: ["cl_gam_short", "cl_gam_shrapnel", "sor_x1"] },
  { id: "cl_gam_shrapnel", name: "Static Shrapnel", description: "Thunderstruck sheds 1â€“4 live sparks from the strike (75% chance); 10% increased lightning damage", kind: "notable", x: 1180, y: 5380, mods: [mod("procRider_static_shrapnel", "flat", 0.75, ["spell"]), mod("damage", "increased", 0.1, ["lightning"])], links: [] },
  { id: "cl_gam_short", name: "Short Circuit", description: "Lightning hits whose damage rolls land in the top 15% of their dice DETONATE â€” an echoing burst at 60% damage", kind: "notable", x: 1400, y: 5390, mods: [mod("proc_short_circuit", "flat", 1, ["lightning"])], links: [] },
  { id: "cl_gam_key", name: "All In", description: "KEYSTONE: your damage dice widen by 50% (same average, fatter tails); 20% of uses roll twice and keep the higher; your high-roll windows widen by 5%", kind: "keystone", x: 1290, y: 5520, mods: [mod("damageSpread", "flat", 0.5), mod("luckyChance", "flat", 0.2), mod("highRollWindow", "flat", 0.05)], links: ["cl_gam_short", "cl_gam_shrapnel"] },
  { id: "sor_es1", name: "Crystal Skin", description: "+25 maximum energy shield", kind: "small", x: 2916, y: 2144, mods: [mod("energyShield", "flat", 25)], links: [] },
  { id: "sor_es2", name: "Arcane Bulwark", description: "8% of incoming damage is paid from mana before life; +15 maximum mana", kind: "notable", x: 958, y: 3971, mods: [mod("manaShield", "flat", 0.08), mod("mana", "flat", 15)], links: [] },
  { id: "sor_es3", name: "Thought Siphon", description: "Mana costs can be paid from energy shield when mana runs dry; +20 maximum energy shield", kind: "notable", x: 3008, y: 1906, mods: [mod("esToMana", "flat", 1), mod("energyShield", "flat", 20)], links: [] },
  { id: "sum_es1", name: "Soul Battery", description: "KEYSTONE-GRADE TRADE: 100% of life regeneration feeds your energy shield instead â€” trickling through the recharge delay and compounding once it starts. +30 maximum energy shield", kind: "keystone", x: 1728, y: 150, mods: [mod("lifeRegenToEs", "flat", 1), mod("energyShield", "flat", 30)], links: [] },
  { id: "attr_str", name: "Strength", description: "", kind: "attr", x: 2793, y: 4612, attributes: { strength: 2 }, links: ["cl_block_p1", "node_115", "node_59"] },
  { id: "attr_int", name: "Fortitude", description: "", kind: "attr", x: 1671, y: 4302, attributes: { fortitude: 2 }, links: ["cl_spell_p3", "forged_rhythm", "node_57", "node_67", "node_82"] },
  { id: "attr_wil", name: "Wisdom", description: "", kind: "attr", x: 1083, y: 2659, attributes: { wisdom: 2 }, links: ["node_146", "node_43", "sum_s1"] },
  { id: "attr_vit", name: "Wisdom", description: "", kind: "attr", x: 1684, y: 1825, attributes: { wisdom: 2 }, links: ["blood_arcana", "node_18", "node_76", "swb_s1"] },
  { id: "attr_dex", name: "Finesse", description: "", kind: "attr", x: 3224, y: 1325, attributes: { finesse: 2 }, links: ["node_16", "node_78", "swb_s2"] },
  { id: "attr_all", name: "Harmony", description: "", kind: "attr", x: 5203, y: 3723, attributes: { strength: 4, prowess: 4, fortitude: 4, dexterity: 4, finesse: 4, charisma: 4, intelligence: 4, wisdom: 4, willpower: 4 }, links: ["cl_attr_c"] },
  { id: "cl_phys_c", name: "Brutality", description: "30% increased physical damage; adds 10 physical damage to attacks", kind: "notable", x: 4340, y: 4410, mods: [mod("damage", "increased", 0.3, ["physical"]), mod("addedPhysical", "flat", 10, ["attack"])], links: ["cl_phys_p1", "cl_phys_p2", "cl_phys_p3"] },
  { id: "cl_phys_p0", name: "Hard Knocks", description: "Adds 8 physical damage to attacks", kind: "small", x: 5538, y: 4773, mods: [mod("addedPhysical", "flat", 8, ["attack"])], links: ["executioners_rhythm_n", "node_123"] },
  { id: "cl_phys_p1", name: "Bludgeon", description: "12% increased attack damage", kind: "small", x: 4349, y: 4307, mods: [mod("damage", "increased", 0.12, ["attack"])], links: ["cl_phys_p3"] },
  { id: "cl_phys_p2", name: "Brutal Edge", description: "+15% ailment chance with physical attacks", kind: "small", x: 4247, y: 4357, mods: [mod("statusChance", "flat", 0.15, ["physical", "attack"])], links: ["cl_phys_p3"] },
  { id: "cl_phys_p3", name: "Precision", description: "+15 accuracy rating", kind: "small", x: 4279, y: 4258, mods: [mod("accuracy", "flat", 15)], links: ["node_70"] },
  { id: "cl_armor_c", name: "Bulwark", description: "+80 armor; 2% less damage taken", kind: "notable", x: 2854, y: 4132, mods: [mod("armor", "flat", 80), mod("damageTaken", "more", -0.02)], links: ["cl_armor_p0", "cl_armor_p2"] },
  { id: "cl_armor_p0", name: "Plating", description: "+50 armor", kind: "small", x: 2796, y: 4175, mods: [mod("armor", "flat", 50)], links: ["cl_armor_p1"] },
  { id: "cl_armor_p1", name: "Iron Hide", description: "+40 armor", kind: "small", x: 2774, y: 4107, mods: [mod("armor", "flat", 40)], links: ["war_s3"] },
  { id: "cl_armor_p2", name: "Hardened", description: "+30 armor, +10 maximum life", kind: "small", x: 2833, y: 4070, mods: [mod("armor", "flat", 30), mod("life", "flat", 10)], links: [] },
  { id: "cl_armor_p3", name: "Resilience", description: "+15 maximum life", kind: "small", x: 2819, y: 4001, mods: [mod("life", "flat", 15)], links: ["node_154", "war_s2", "war_s3"] },
  { id: "cl_block_c", name: "Aegis", description: "+12% block chance, +15 armor", kind: "notable", x: 2709, y: 4449, mods: [mod("blockChance", "flat", 0.12), mod("armor", "flat", 15)], links: ["cl_block_p3", "enduring_bulwark"] },
  { id: "cl_block_p0", name: "Parry", description: "+7% block chance", kind: "small", x: 2789, y: 4491, mods: [mod("blockChance", "flat", 0.07)], links: ["cl_block_p1"] },
  { id: "cl_block_p1", name: "Bracing", description: "+6% block chance, +10 armor", kind: "small", x: 2760, y: 4555, mods: [mod("blockChance", "flat", 0.06), mod("armor", "flat", 10)], links: ["cl_block_p3"] },
  { id: "cl_block_p2", name: "Riposte", description: "+5% critical strike multiplier", kind: "small", x: 3472, y: 4235, mods: [mod("critMulti", "flat", 0.05)], links: ["cl_melee_p3"] },
  { id: "cl_block_p3", name: "Guard Up", description: "+20 armor", kind: "small", x: 2681, y: 4530, mods: [mod("armor", "flat", 20)], links: [] },
  { id: "cl_spell_c", name: "Arcane Mastery", description: "35% increased spell damage, +20 maximum mana", kind: "notable", x: 1727, y: 3912, mods: [mod("damage", "increased", 0.35, ["spell"]), mod("mana", "flat", 20)], links: ["cl_spell_p1"] },
  { id: "cl_spell_p0", name: "Quickening", description: "8% increased cast speed", kind: "small", x: 1533, y: 4015, mods: [mod("castSpeed", "increased", 0.08)], links: ["cl_spell_p1", "node_57"] },
  { id: "cl_spell_p1", name: "Spell Echo", description: "15% increased spell damage", kind: "small", x: 1626, y: 3962, mods: [mod("damage", "increased", 0.15, ["spell"])], links: [] },
  { id: "cl_spell_p2", name: "Reserves", description: "+20 maximum mana", kind: "small", x: 902, y: 4044, mods: [mod("mana", "flat", 20)], links: ["node_64", "sor_es2"] },
  { id: "cl_spell_p3", name: "Spell Critical Chance", description: "+6% spell critical strike chance", kind: "small", x: 1807, y: 4294, mods: [mod("critChance", "flat", 0.06, ["spell"])], links: ["node_66"] },
  { id: "cl_fireres_c", name: "Fireproof", description: "+15% fire resistance, +15 maximum life", kind: "notable", x: 1861, y: 1434, mods: [mod("fireRes", "flat", 0.15), mod("life", "flat", 15)], links: ["cl_fireres_p0", "cl_fireres_p2", "wil_p1"] },
  { id: "cl_fireres_p0", name: "Cinder Ward", description: "+5% fire resistance", kind: "small", x: 1940, y: 1447, mods: [mod("fireRes", "flat", 0.05)], links: ["cl_fireres_p1"] },
  { id: "cl_fireres_p1", name: "Ash Guard", description: "+4% fire resistance", kind: "small", x: 1964, y: 1491, mods: [mod("fireRes", "flat", 0.04)], links: ["node_18"] },
  { id: "cl_fireres_p2", name: "Warm Blood", description: "+0.2 mana regeneration per second", kind: "small", x: 1853, y: 1530, mods: [mod("manaRegen", "flat", 0.2)], links: ["node_18"] },
  { id: "cl_fireres_p3", name: "Cold Resistance", description: "+8% cold resistance", kind: "small", x: 3466, y: 1279, mods: [mod("coldRes", "flat", 0.08)], links: ["node_12"] },
  { id: "cl_minion_c", name: "Master of Legions", description: "20% increased minion damage, +1 maximum minion", kind: "notable", x: 637, y: 2819, mods: [mod("minionDamage", "increased", 0.2), mod("minionMaxCount", "flat", 1)], links: ["node_50", "sum_key"] },
  { id: "cl_minion_p0", name: "Pack Tactics", description: "6% increased minion damage", kind: "small", x: 964, y: 3088, mods: [mod("minionDamage", "increased", 0.06)], links: ["node_43", "node_52", "node_53"] },
  { id: "cl_minion_p1", name: "Minion Life", description: "15% increased minion life", kind: "small", x: 856, y: 3195, mods: [mod("minionLife", "increased", 0.15)], links: ["node_54", "node_55"] },
  { id: "cl_minion_p2", name: "Swift Servants", description: "10% increased minion movement speed", kind: "small", x: 2010, y: 1085, mods: [mod("minionMoveSpeed", "increased", 0.1)], links: ["cl_minion_p3"] },
  { id: "cl_minion_p3", name: "Towering Thralls", description: "8% increased minion size", kind: "small", x: 1951, y: 1038, mods: [mod("minionSize", "increased", 0.08)], links: ["sum_x2"] },
  { id: "cl_coldres_c", name: "Frostproof", description: "+35% cold resistance, 2% increased attack and cast speed", kind: "notable", x: 5298, y: 1018, mods: [mod("coldRes", "flat", 0.35), mod("attackSpeed", "increased", 0.02, ["attack"]), mod("castSpeed", "increased", 0.02)], links: ["cl_coldres_p1", "cl_coldres_p2"] },
  { id: "cl_coldres_p0", name: "Rime Ward", description: "+18% cold resistance", kind: "small", x: 5319, y: 1196, mods: [mod("coldRes", "flat", 0.18)], links: ["cl_coldres_p2", "swb_s4"] },
  { id: "cl_coldres_p1", name: "Glacial Skin", description: "+15% cold resistance", kind: "small", x: 5233, y: 1104, mods: [mod("coldRes", "flat", 0.15)], links: ["cl_coldres_p3"] },
  { id: "cl_coldres_p2", name: "Keen Sight", description: "+40 accuracy rating", kind: "small", x: 5286, y: 1120, mods: [mod("accuracy", "flat", 40)], links: [] },
  { id: "cl_coldres_p3", name: "Sidestep", description: "+15 evasion rating", kind: "small", x: 5159, y: 1124, mods: [mod("evasion", "flat", 15)], links: ["swb_s4"] },
  { id: "cl_lightres_c", name: "Stormproof", description: "+35% lightning resistance, 6% increased attack speed", kind: "notable", x: 4069, y: 1336, mods: [mod("lightningRes", "flat", 0.35), mod("attackSpeed", "increased", 0.06, ["attack"])], links: ["cl_lightres_p0", "cl_lightres_p1"] },
  { id: "cl_lightres_p0", name: "Surge Ward", description: "+18% lightning resistance", kind: "small", x: 4144, y: 1321, mods: [mod("lightningRes", "flat", 0.18)], links: ["rng_n1"] },
  { id: "cl_lightres_p1", name: "Static Skin", description: "+15% lightning resistance", kind: "small", x: 4084, y: 1405, mods: [mod("lightningRes", "flat", 0.15)], links: ["rng_n1"] },
  { id: "cl_lightres_p2", name: "Marksman", description: "+50 accuracy rating", kind: "small", x: 4188, y: 1498, mods: [mod("accuracy", "flat", 50)], links: ["cl_proj_p1", "rng_n1"] },
  { id: "cl_lightres_p3", name: "Deadeye", description: "+2% critical strike chance", kind: "small", x: 4275, y: 1364, mods: [mod("critChance", "flat", 0.02)], links: ["rng_n1"] },
  { id: "cl_acc_c", name: "Perfect Aim", description: "+60 accuracy rating, 4% increased projectile damage", kind: "notable", x: 3904, y: 2436, mods: [mod("accuracy", "flat", 60), mod("damage", "increased", 0.04, ["projectile"])], links: ["cl_acc_p0", "cl_acc_p2", "cl_acc_p3"] },
  { id: "cl_acc_p0", name: "Steady Hand", description: "+40 accuracy rating", kind: "small", x: 3999, y: 2438, mods: [mod("accuracy", "flat", 40)], links: ["cl_acc_p1", "cl_acc_p2"] },
  { id: "cl_acc_p1", name: "Focus", description: "+35 accuracy rating", kind: "small", x: 3976, y: 2515, mods: [mod("accuracy", "flat", 35)], links: ["cl_acc_p3", "node_104"] },
  { id: "cl_acc_p2", name: "Pinpoint", description: "+2% critical strike chance", kind: "small", x: 3950, y: 2477, mods: [mod("critChance", "flat", 0.02)], links: ["cl_acc_p3"] },
  { id: "cl_acc_p3", name: "Lithe", description: "+10 evasion rating", kind: "small", x: 3913, y: 2509, mods: [mod("evasion", "flat", 10)], links: [] },
  { id: "cl_melee_c", name: "Weapon Master", description: "25% increased melee damage, 8% increased melee attack speed", kind: "notable", x: 3444, y: 4321, mods: [mod("damage", "increased", 0.25, ["melee"]), mod("attackSpeed", "increased", 0.08, ["melee"])], links: ["cl_melee_p0", "cl_melee_p1", "cl_melee_p2"] },
  { id: "cl_melee_p0", name: "Swift Strikes", description: "10% increased melee attack speed", kind: "small", x: 3380, y: 4402, mods: [mod("attackSpeed", "increased", 0.1, ["melee"])], links: [] },
  { id: "cl_melee_p1", name: "Cleave", description: "12% increased melee damage", kind: "small", x: 3459, y: 4435, mods: [mod("damage", "increased", 0.12, ["melee"])], links: ["node_68"] },
  { id: "cl_melee_p2", name: "Savagery", description: "+5% melee critical strike chance", kind: "small", x: 3376, y: 4314, mods: [mod("critChance", "flat", 0.05, ["melee"])], links: ["cl_melee_p3"] },
  { id: "cl_melee_p3", name: "Overpower", description: "+10% melee critical strike multiplier", kind: "small", x: 3413, y: 4243, mods: [mod("critMulti", "flat", 0.1, ["melee"])], links: [] },
  { id: "cl_lreg_c", name: "Lifeblood", description: "+1.5 life regeneration/s, +2% life regeneration, +30 maximum life", kind: "notable", x: 1843, y: 4710, mods: [mod("lifeRegen", "flat", 1.5), mod("lifeRegenPct", "flat", 0.02), mod("life", "flat", 30)], links: ["cl_lreg_p0", "cl_lreg_p1", "cl_lreg_p3"] },
  { id: "cl_lreg_p0", name: "Recovery", description: "+0.8 life regeneration per second", kind: "small", x: 1833, y: 4633, mods: [mod("lifeRegen", "flat", 0.8)], links: ["node_112"] },
  { id: "cl_lreg_p1", name: "Vitality", description: "+15 maximum life", kind: "small", x: 1764, y: 4724, mods: [mod("life", "flat", 15)], links: ["node_112"] },
  { id: "cl_lreg_p2", name: "Hardy", description: "+25 maximum life", kind: "small", x: 1967, y: 4684, mods: [mod("life", "flat", 25)], links: ["cl_lreg_p3"] },
  { id: "cl_lreg_p3", name: "Regrowth", description: "+1% life regeneration", kind: "small", x: 1906, y: 4694, mods: [mod("lifeRegenPct", "flat", 0.01)], links: [] },
  { id: "cl_es_c", name: "Crystalline Barrier", description: "+50 maximum energy shield, +8% energy shield recharge rate", kind: "notable", x: 2979, y: 1999, mods: [mod("energyShield", "flat", 50), mod("esRechargeRate", "flat", 0.08)], links: ["cl_es_p1", "sor_es3"] },
  { id: "cl_es_p0", name: "Ward Battery", description: "+30 maximum energy shield", kind: "small", x: 3025, y: 1857, mods: [mod("energyShield", "flat", 30)], links: ["sor_es3"] },
  { id: "cl_es_p1", name: "Insulation", description: "+25 maximum energy shield", kind: "small", x: 2938, y: 2070, mods: [mod("energyShield", "flat", 25)], links: ["cl_es_p2", "cl_es_p3", "sor_es1"] },
  { id: "cl_es_p2", name: "Quick Charge", description: "+10% energy shield recharge rate", kind: "small", x: 2870, y: 1996, mods: [mod("esRechargeRate", "flat", 0.1)], links: [] },
  { id: "cl_es_p3", name: "Stoic", description: "-0.2s energy shield recharge delay", kind: "small", x: 2857, y: 2065, mods: [mod("esRechargeDelay", "flat", -0.2)], links: [] },
  { id: "cl_mreg_c", name: "Mind Spring", description: "+1.2 mana regeneration/s, +2% mana regeneration, +25 maximum mana", kind: "notable", x: 1638, y: 3077, mods: [mod("manaRegen", "flat", 1.2), mod("manaRegenPct", "flat", 0.02), mod("mana", "flat", 25)], links: ["cl_mreg_p2", "cl_mreg_p3", "sor_s3"] },
  { id: "cl_mreg_p0", name: "Clarity", description: "+0.7 mana regeneration per second", kind: "small", x: 1670, y: 3248, mods: [mod("manaRegen", "flat", 0.7)], links: ["cl_mreg_p1", "node_87", "sor_s3"] },
  { id: "cl_mreg_p1", name: "Meditation", description: "+15 maximum mana", kind: "small", x: 1561, y: 3209, mods: [mod("mana", "flat", 15)], links: ["cl_mreg_p2"] },
  { id: "cl_mreg_p2", name: "Deep Well", description: "+20 maximum mana", kind: "small", x: 1507, y: 3136, mods: [mod("mana", "flat", 20)], links: [] },
  { id: "cl_mreg_p3", name: "Channeling", description: "+1% mana regeneration", kind: "small", x: 1718, y: 3047, mods: [mod("manaRegenPct", "flat", 0.01)], links: [] },
  { id: "cl_allres_c", name: "Elemental Adaptation", description: "+20% to fire, cold and lightning resistance, +25 maximum life", kind: "notable", x: 1255, y: 3903, mods: [mod("fireRes", "flat", 0.2), mod("coldRes", "flat", 0.2), mod("lightningRes", "flat", 0.2), mod("life", "flat", 25)], links: ["cl_allres_p2", "cl_allres_p3"] },
  { id: "cl_allres_p0", name: "Fire Attunement", description: "+8% fire resistance", kind: "small", x: 1170, y: 3760, mods: [mod("fireRes", "flat", 0.08)], links: ["cl_allres_p1", "node_42"] },
  { id: "cl_allres_p1", name: "Cold Attunement", description: "+8% cold resistance", kind: "small", x: 1147, y: 3830, mods: [mod("coldRes", "flat", 0.08)], links: ["cl_allres_p2"] },
  { id: "cl_allres_p2", name: "Storm Attunement", description: "+8% lightning resistance", kind: "small", x: 1171, y: 3884, mods: [mod("lightningRes", "flat", 0.08)], links: [] },
  { id: "cl_allres_p3", name: "Chaos Ward", description: "+6% chaos resistance", kind: "small", x: 1218, y: 3818, mods: [mod("chaosRes", "flat", 0.06)], links: [] },
  { id: "cl_chaosres_c", name: "Void Touched", description: "+10% chaos resistance, 10% increased minion damage", kind: "notable", x: 2333, y: 1375, mods: [mod("chaosRes", "flat", 0.1), mod("minionDamage", "increased", 0.1)], links: ["cl_chaosres_p1", "cl_chaosres_p3", "node_38", "node_39"] },
  { id: "cl_chaosres_p0", name: "Corruption Ward", description: "+6% chaos resistance", kind: "small", x: 2272, y: 1439, mods: [mod("chaosRes", "flat", 0.06)], links: ["cl_chaosres_p1", "node_19"] },
  { id: "cl_chaosres_p1", name: "Plague Skin", description: "+7% chaos resistance", kind: "small", x: 2257, y: 1371, mods: [mod("chaosRes", "flat", 0.07)], links: [] },
  { id: "cl_chaosres_p2", name: "Withering", description: "5% increased minion damage", kind: "small", x: 2412, y: 1413, mods: [mod("minionDamage", "increased", 0.05)], links: ["node_19", "node_38"] },
  { id: "cl_chaosres_p3", name: "Defilement", description: "+10% chaos resistance", kind: "small", x: 2329, y: 1427, mods: [mod("chaosRes", "flat", 0.1)], links: [] },
  { id: "cl_eva_c", name: "Shadow Dance", description: "20% increased evasion, 6% increased movement speed", kind: "notable", x: 4806, y: 891, mods: [mod("evasion", "increased", 0.2), mod("moveSpeed", "increased", 0.06)], links: ["cl_eva_p0", "cl_eva_p1"] },
  { id: "cl_eva_p0", name: "Evasion", description: "8% increased evasion", kind: "small", x: 4661, y: 914, mods: [mod("evasion", "increased", 0.08)], links: ["cl_eva_p2"] },
  { id: "cl_eva_p1", name: "Nimble Step", description: "2% increased movement speed, +10 evasion rating", kind: "small", x: 4854, y: 994, mods: [mod("moveSpeed", "increased", 0.02), mod("evasion", "flat", 10)], links: ["cl_eva_p3"] },
  { id: "cl_eva_p2", name: "Sprint", description: "4% increased movement speed", kind: "small", x: 4588, y: 965, mods: [mod("moveSpeed", "increased", 0.04)], links: ["node_8"] },
  { id: "cl_eva_p3", name: "Evasion", description: "8% increased evasion", kind: "small", x: 4786, y: 1048, mods: [mod("evasion", "increased", 0.08)], links: ["node_9"] },
  { id: "cl_proj_c", name: "Barrage", description: "20% increased projectile damage, +1 projectile", kind: "notable", x: 4300, y: 1518, mods: [mod("damage", "increased", 0.2, ["projectile"]), mod("projectileCount", "flat", 1)], links: ["cl_proj_p0", "cl_proj_p2", "cl_proj_p3"] },
  { id: "cl_proj_p0", name: "Extra Arrow", description: "+1 projectile", kind: "small", x: 4256, y: 1472, mods: [mod("projectileCount", "flat", 1)], links: [] },
  { id: "cl_proj_p1", name: "Piercing Shots", description: "Projectiles pierce +1 target, 8% increased projectile speed", kind: "small", x: 4209, y: 1567, mods: [mod("pierceCount", "flat", 1), mod("projectileSpeed", "increased", 0.08)], links: ["cl_proj_p3"] },
  { id: "cl_proj_p2", name: "Fletching", description: "12% increased projectile speed", kind: "small", x: 4373, y: 1511, mods: [mod("projectileSpeed", "increased", 0.12)], links: ["rng_pc1"] },
  { id: "cl_proj_p3", name: "Volley Fire", description: "10% increased projectile damage", kind: "small", x: 4289, y: 1589, mods: [mod("damage", "increased", 0.1, ["projectile"])], links: ["rng_pc1"] },
  { id: "cl_attr_c", name: "Versatility", description: "+5 to all attributes", kind: "notable", x: 5265, y: 3664, attributes: { strength: 5, prowess: 5, fortitude: 5, dexterity: 5, finesse: 5, charisma: 5, intelligence: 5, wisdom: 5, willpower: 5, vitality: 5 }, links: ["cl_attr_p0", "cl_attr_p1", "cl_attr_p2", "cl_attr_p3"] },
  { id: "cl_attr_p0", name: "Brawn", description: "", kind: "small", x: 5281, y: 3582, attributes: { strength: 5 }, links: ["node_128"] },
  { id: "cl_attr_p1", name: "Agility", description: "", kind: "small", x: 5349, y: 3590, attributes: { dexterity: 5 }, links: ["node_128"] },
  { id: "cl_attr_p2", name: "Intellect", description: "", kind: "small", x: 5210, y: 3573, attributes: { intelligence: 5 }, links: ["node_128"] },
  { id: "cl_attr_p3", name: "Endurance", description: "", kind: "small", x: 5314, y: 3741, attributes: { vitality: 5 }, links: [] },
  { id: "rng_pc1", name: "Multiplicity", description: "15% chance to fire an additional projectile with attack skills", kind: "small", x: 4374, y: 1598, mods: [mod("projectileCountChance", "flat", 0.15, ["attack"])], links: [] },
  { id: "rng_pc2", name: "Volley", description: "25% chance to fire an additional projectile; 15% increased projectile speed", kind: "notable", x: 4472, y: 2658, mods: [mod("projectileCountChance", "flat", 0.25), mod("projectileSpeed", "increased", 0.15)], links: ["rng_s3"] },
  { id: "war_kb1", name: "Repulsion", description: "+50 knockback strength on melee hits", kind: "small", x: 3063, y: 3690, mods: [mod("knockback", "flat", 50, ["melee"])], links: ["war_s1"] },
  { id: "war_kb2", name: "Shockwave", description: "+120 knockback strength on melee hits; 15% increased melee damage", kind: "notable", x: 2923, y: 4996, mods: [mod("knockback", "flat", 120, ["melee"]), mod("damage", "increased", 0.15, ["melee"])], links: [] },
  { id: "mass_s1", name: "Ballast", description: "20% increased weight; +40 knockback strength on melee hits", kind: "small", x: 2123, y: 4659, mods: [mod("weight", "increased", 0.2), mod("knockback", "flat", 40, ["melee"])], links: ["mass_s2", "node_58"] },
  { id: "mass_s2", name: "Follow-Through", description: "+20% impact damage, +10% shove authority", kind: "small", x: 2078, y: 4740, mods: [mod("impactDamage", "flat", 0.2), mod("shoveAuthority", "flat", 0.1)], links: [] },
  { id: "mass_n1", name: "The Millstone", description: "+0.4 weight, 25% increased weight, +25% shove authority, +45% impact damage", kind: "notable", x: 2032, y: 4832, mods: [mod("weight", "flat", 0.4), mod("weight", "increased", 0.25), mod("shoveAuthority", "flat", 0.25), mod("impactDamage", "flat", 0.45)], links: ["mass_s2", "mass_s3"] },
  { id: "grip_s1", name: "Wrestler's Hands", description: "+15% grip power, +15% wriggle", kind: "small", x: 2169, y: 4908, mods: [mod("gripPower", "flat", 0.15), mod("wriggle", "flat", 0.15)], links: ["grip_s2"] },
  { id: "grip_s2", name: "Eelskin", description: "+35% wriggle (struggle out of holds faster)", kind: "small", x: 2107, y: 4860, mods: [mod("wriggle", "flat", 0.35)], links: ["mass_n1"] },
  { id: "grip_n1", name: "Seizing Style", description: "+30% grip power; learn the Takedown measure (seize, then throw â€” blows land harder and the grip grows surer while the rhythm holds)", kind: "notable", x: 2227, y: 4980, mods: [mod("gripPower", "flat", 0.3), mod("combo_grapplers_rhythm", "flat", 1)], links: ["grip_s1"] },
  { id: "mass_s3", name: "Surefoot Tread", description: "+0.4 trample mass (moving through a swarm crushes what your stride and mass overmatch)", kind: "small", x: 1942, y: 4836, mods: [mod("trample", "flat", 0.4)], links: [] },
  { id: "mass_n2", name: "Stampede", description: "+1 trample mass, +20% impact damage â€” the crawl parts or it dies; what the wall arrests, arrests harder", kind: "notable", x: 1854, y: 4871, mods: [mod("trample", "flat", 1), mod("impactDamage", "flat", 0.2)], links: ["mass_s3"] },
  { id: "sor_df1", name: "Force Wave", description: "+80 push force on spell hits (enemies driven back)", kind: "small", x: 156, y: 3324, mods: [mod("displaceForce", "flat", 80, ["spell"])], links: ["sor_df2"] },
  { id: "sor_df2", name: "Vortex Master", description: "+180 push force on spell hits; 12% increased spell damage", kind: "notable", x: 132, y: 3618, mods: [mod("displaceForce", "flat", 180, ["spell"]), mod("damage", "increased", 0.12, ["spell"])], links: [] },
  { id: "sor_df3", name: "Gravity Well", description: "-100 pull force on spell hits (enemies drawn toward you)", kind: "notable", x: 108, y: 2964, mods: [mod("displaceForce", "flat", -100, ["spell"])], links: [] },
  { id: "brz_pd1", name: "Explosive Release", description: "8% chance on hit to trigger Displacement Field â€” shove nearby enemies away", kind: "notable", x: 4040, y: 3359, mods: [mod("proc_displacement_field", "flat", 0.08, ["attack"])], links: ["node_125"] },
  { id: "brz_pd2", name: "Magnetic Draw", description: "6% chance on hit to trigger Magnetic Pull â€” drag the struck enemy toward you", kind: "notable", x: 3871, y: 3868, mods: [mod("proc_magnetic_pull", "flat", 0.06, ["attack"])], links: ["brz_s2"] },
  { id: "node_1", name: "Evasion", description: "8% increased evasion", kind: "small", x: 2754, y: 330, mods: [mod("evasion", "increased", 0.08)], links: ["node_4", "swb_n1"] },
  { id: "node_2", name: "Dexterity", description: "", kind: "attr", x: 2999, y: 719, attributes: { dexterity: 2 }, links: ["node_6", "node_96"] },
  { id: "node_3", name: "Evasion", description: "8% increased evasion", kind: "small", x: 3312, y: 240, mods: [mod("evasion", "increased", 0.08)], links: ["node_5", "swb_n1"] },
  { id: "node_4", name: "Evasion", description: "8% increased evasion", kind: "small", x: 2730, y: 516, mods: [mod("evasion", "increased", 0.08)], links: [] },
  { id: "node_5", name: "Evasion", description: "8% increased evasion", kind: "small", x: 3384, y: 438, mods: [mod("evasion", "increased", 0.08)], links: [] },
  { id: "node_6", name: "Vitality", description: "", kind: "attr", x: 3582, y: 820, attributes: { vitality: 2 }, links: [] },
  { id: "node_7", name: "Dexterity", description: "", kind: "attr", x: 4628, y: 1108, attributes: { dexterity: 2 }, links: ["node_8", "node_9"] },
  { id: "node_8", name: "Evasion", description: "8% increased evasion", kind: "small", x: 4577, y: 1040, mods: [mod("evasion", "increased", 0.08)], links: [] },
  { id: "node_9", name: "Nimble Step", description: "2% increased movement speed, +10 evasion rating", kind: "small", x: 4727, y: 1105, mods: [mod("moveSpeed", "increased", 0.02), mod("evasion", "flat", 10)], links: [] },
  { id: "node_10", name: "Evasion Rating", description: "+10 Evasion Rating, 2% increased evasion", kind: "small", x: 2856, y: 672, mods: [mod("evasion", "flat", 10), mod("evasion", "increased", 0.02)], links: ["node_2", "node_4"] },
  { id: "node_11", name: "Evasion Rating", description: "+10 Evasion Rating, 2% increased evasion", kind: "small", x: 3288, y: 654, mods: [mod("evasion", "flat", 10), mod("evasion", "increased", 0.02)], links: ["node_2", "node_5"] },
  { id: "node_12", name: "Frostproof", description: "+18% cold resistance", kind: "notable", x: 3536, y: 1247, mods: [mod("coldRes", "flat", 0.18)], links: ["node_13", "node_14"] },
  { id: "node_13", name: "Cold Resistance", description: "+8% cold resistance", kind: "small", x: 3589, y: 1324, mods: [mod("coldRes", "flat", 0.08)], links: [] },
  { id: "node_14", name: "Cold Resistance", description: "+5% cold resistance", kind: "small", x: 3513, y: 1317, mods: [mod("coldRes", "flat", 0.05)], links: ["node_16"] },
  { id: "node_15", name: "Finesse", description: "", kind: "attr", x: 4011, y: 1560, attributes: { finesse: 2 }, links: ["node_23", "rng_s1"] },
  { id: "node_16", name: "Willpower", description: "", kind: "attr", x: 3502, y: 1379, attributes: { willpower: 2 }, links: [] },
  { id: "node_17", name: "Dexterity", description: "", kind: "attr", x: 5225, y: 1541, attributes: { dexterity: 2 }, links: ["node_7", "rng_key", "swb_n2"] },
  { id: "node_18", name: "Willpower", description: "", kind: "attr", x: 1938, y: 1547, attributes: { willpower: 2 }, links: ["node_19", "node_34", "sum_s3"] },
  { id: "node_19", name: "Wisdom", description: "", kind: "attr", x: 2351, y: 1471, attributes: { wisdom: 2 }, links: ["node_94"] },
  { id: "node_20", name: "Willpower", description: "", kind: "attr", x: 1921, y: 774, attributes: { willpower: 5 }, links: ["node_21", "node_29", "node_45", "node_47", "node_96"] },
  { id: "node_21", name: "Willpower", description: "", kind: "attr", x: 1154, y: 1136, attributes: { willpower: 2 }, links: ["node_22", "stored_lightning"] },
  { id: "node_22", name: "Wisdom", description: "", kind: "attr", x: 696, y: 1710, attributes: { wisdom: 5 }, links: ["node_40", "node_77", "tidal_mind"] },
  { id: "node_23", name: "Dexterity", description: "", kind: "attr", x: 4391, y: 1802, attributes: { dexterity: 2 }, links: [] },
  { id: "node_24", name: "Life Regeneration", description: "+10% increased life regeneration per second", kind: "small", x: 2016, y: 174, mods: [mod("lifeRegen", "increased", 0.1)], links: ["node_27", "sum_es1"] },
  { id: "node_25", name: "Energy Shield", description: "+10 maximum energy shield", kind: "small", x: 1488, y: 288, mods: [mod("energyShield", "flat", 10)], links: ["node_26", "sum_es1"] },
  { id: "node_26", name: "Energy Shield", description: "+5% increased energy shield", kind: "small", x: 1452, y: 516, mods: [mod("energyShield", "increased", 0.05)], links: ["node_30"] },
  { id: "node_27", name: "Life Regeneration", description: "+0.5 life regeneration per second", kind: "small", x: 2142, y: 342, mods: [mod("lifeRegen", "flat", 0.5)], links: ["node_31"] },
  { id: "node_28", name: "Life Regeneration and Energy Shield", description: "+2% increased energy shield, +0.2 life regeneration per second", kind: "small", x: 1800, y: 378, mods: [mod("lifeRegen", "flat", 0.2), mod("energyShield", "increased", 0.02)], links: ["node_29", "node_30", "node_31"] },
  { id: "node_29", name: "Willpower and Intelligence", description: "", kind: "small", x: 1872, y: 588, attributes: { intelligence: 3, willpower: 3 }, links: [] },
  { id: "node_30", name: "Energy Shield", description: "+10 maximum energy shield", kind: "small", x: 1656, y: 678, mods: [mod("energyShield", "flat", 10)], links: [] },
  { id: "node_31", name: "Life Regeneration", description: "+0.5 life regeneration per second", kind: "small", x: 2094, y: 576, mods: [mod("lifeRegen", "flat", 0.5)], links: [] },
  { id: "node_32", name: "Chaos Damage and Ailment Chance", description: "+8% increased chaos damage, +10% ailment chance", kind: "small", x: 2174, y: 1569, mods: [mod("damage", "increased", 0.08, ["chaos"]), mod("statusChance", "flat", 0.1)], links: ["node_34", "sum_n2"] },
  { id: "node_33", name: "Chaos Damage", description: "+10% increased chaos damage", kind: "small", x: 2113, y: 1668, mods: [mod("damage", "increased", 0.1, ["chaos"])], links: ["node_34", "sum_n2"] },
  { id: "node_34", name: "Chaos Damage", description: "+8% increased chaos damage", kind: "small", x: 2088, y: 1581, mods: [mod("damage", "increased", 0.08, ["chaos"])], links: [] },
  { id: "node_35", name: "Skill Effect Duration", description: "8% increased skill effect duration", kind: "small", x: 1978, y: 1692, mods: [mod("effectDuration", "increased", 0.08)], links: ["node_36", "sum_s3"] },
  { id: "node_36", name: "Skill Effect Duration", description: "8% increased skill effect duration", kind: "small", x: 2044, y: 1651, mods: [mod("effectDuration", "increased", 0.08)], links: ["node_37"] },
  { id: "node_37", name: "Lasting Bonds", description: "26% increased skill effect duration", kind: "notable", x: 1991, y: 1614, mods: [mod("effectDuration", "increased", 0.26)], links: [] },
  { id: "node_38", name: "Minion Damage", description: "8% increased minion damage", kind: "small", x: 2396, y: 1339, mods: [mod("minionDamage", "increased", 0.08)], links: [] },
  { id: "node_39", name: "Minion Damage", description: "+10% increased minion damage", kind: "small", x: 2365, y: 1422, mods: [mod("minionDamage", "increased", 0.1)], links: [] },
  { id: "node_40", name: "Willpower", description: "", kind: "attr", x: 444, y: 2436, attributes: { willpower: 2 }, links: ["node_41"] },
  { id: "node_41", name: "Willpower", description: "", kind: "attr", x: 363, y: 3140, attributes: { willpower: 2 }, links: ["node_90", "sor_df1", "sor_df3", "sum_s2"] },
  { id: "node_42", name: "Fortitude", description: "", kind: "attr", x: 1286, y: 3754, attributes: { fortitude: 2 }, links: ["node_57", "node_88"] },
  { id: "node_43", name: "Intelligence", description: "", kind: "attr", x: 1097, y: 3053, attributes: { intelligence: 2 }, links: ["node_88"] },
  { id: "node_44", name: "Minion Movement Speed", description: "+12% increased minion movement speed", kind: "small", x: 1922, y: 926, mods: [mod("minionMoveSpeed", "increased", 0.12)], links: ["node_45", "sum_x2"] },
  { id: "node_45", name: "Minion Movement Speed", description: "+8% increased minion movement speed", kind: "small", x: 1910, y: 852, mods: [mod("minionMoveSpeed", "increased", 0.08)], links: [] },
  { id: "node_46", name: "Minion Haste", description: "+8% increased minion haste", kind: "small", x: 2042, y: 901, mods: [mod("minionHaste", "increased", 0.08)], links: ["node_47", "sum_x2"] },
  { id: "node_47", name: "Minion Haste", description: "+5% increased minion haste", kind: "small", x: 2008, y: 837, mods: [mod("minionHaste", "increased", 0.05)], links: [] },
  { id: "node_48", name: "Minion Size", description: "+8% increased minion size", kind: "small", x: 513, y: 2840, mods: [mod("minionSize", "increased", 0.08)], links: ["node_49", "sum_n1"] },
  { id: "node_49", name: "Minion Size", description: "+15% increased minion size", kind: "small", x: 507, y: 2771, mods: [mod("minionSize", "increased", 0.15)], links: ["node_50"] },
  { id: "node_50", name: "Minion Size", description: "+8% increased minion size", kind: "small", x: 577, y: 2768, mods: [mod("minionSize", "increased", 0.08)], links: [] },
  { id: "node_51", name: "Minion Damage", description: "+8% increased minion damage", kind: "small", x: 902, y: 3030, mods: [mod("minionDamage", "increased", 0.08)], links: ["node_52", "node_56"] },
  { id: "node_52", name: "Minion Damage", description: "+8% increased minion damage", kind: "small", x: 1012, y: 3000, mods: [mod("minionDamage", "increased", 0.08)], links: [] },
  { id: "node_53", name: "Minion Life", description: "+10% increased minion life", kind: "small", x: 1048, y: 3142, mods: [mod("minionLife", "increased", 0.1)], links: ["node_55"] },
  { id: "node_54", name: "Minion Damage and Minion Life", description: "+15% increased minion damage, +25% increased minion life", kind: "notable", x: 904, y: 3117, mods: [mod("minionDamage", "increased", 0.15), mod("minionLife", "increased", 0.25)], links: ["node_56"] },
  { id: "node_55", name: "Minion Life", description: "+10% increased minion life", kind: "small", x: 944, y: 3182, mods: [mod("minionLife", "increased", 0.1)], links: [] },
  { id: "node_56", name: "Minion Damage", description: "+12% increased minion damage", kind: "small", x: 822, y: 3060, mods: [mod("minionDamage", "increased", 0.12)], links: [] },
  { id: "node_57", name: "Intelligence", description: "", kind: "attr", x: 1436, y: 4069, attributes: { intelligence: 2 }, links: [] },
  { id: "node_58", name: "Strength", description: "", kind: "attr", x: 2119, y: 4536, attributes: { strength: 2 }, links: ["node_59", "node_82"] },
  { id: "node_59", name: "Fortitude", description: "", kind: "attr", x: 2474, y: 4644, attributes: { fortitude: 2 }, links: ["stalwart_recovery"] },
  { id: "node_60", name: "Intelligence", description: "", kind: "attr", x: 698, y: 4138, attributes: { intelligence: 2 }, links: ["node_61", "node_63", "node_90"] },
  { id: "node_61", name: "Willpower", description: "", kind: "attr", x: 1073, y: 4583, attributes: { willpower: 2 }, links: ["sor_s4", "wil_x1"] },
  { id: "node_62", name: "Intelligence", description: "", kind: "attr", x: 1958, y: 5323, attributes: { intelligence: 2 }, links: ["node_73", "sor_n2"] },
  { id: "node_63", name: "Mana", description: "+15 maximum mana", kind: "small", x: 710, y: 4021, mods: [mod("mana", "flat", 15)], links: ["node_64"] },
  { id: "node_64", name: "Mana", description: "+15 maximum mana", kind: "small", x: 809, y: 4000, mods: [mod("mana", "flat", 15)], links: ["node_65"] },
  { id: "node_65", name: "Mana", description: "+25 maximum mana", kind: "small", x: 773, y: 3904, mods: [mod("mana", "flat", 25)], links: [] },
  { id: "node_66", name: "Spell Critical Chance", description: "+7% spell critical strike chance", kind: "small", x: 1789, y: 4218, mods: [mod("critChance", "flat", 0.07, ["spell"])], links: ["sor_n1"] },
  { id: "node_67", name: "Spell Ailment Chance", description: "+8% ailment chance with spells", kind: "small", x: 1659, y: 4197, mods: [mod("statusChance", "flat", 0.08, ["spell"])], links: ["sor_n1"] },
  { id: "node_68", name: "Prowess", description: "", kind: "attr", x: 3469, y: 4543, attributes: { prowess: 2 }, links: ["node_69"] },
  { id: "node_69", name: "Strength", description: "", kind: "attr", x: 3895, y: 4419, attributes: { strength: 2 }, links: ["node_70", "reapers_due"] },
  { id: "node_70", name: "Prowess", description: "", kind: "attr", x: 4162, y: 4234, attributes: { prowess: 2 }, links: [] },
  { id: "node_71", name: "Strength", description: "", kind: "attr", x: 3882, y: 5412, attributes: { strength: 2 }, links: ["node_72", "radiant_cascade_n", "war_key"] },
  { id: "node_72", name: "Intelligence", description: "", kind: "attr", x: 4778, y: 5101, attributes: { intelligence: 2 }, links: ["sanguine_lattice"] },
  { id: "node_73", name: "Strength", description: "", kind: "attr", x: 2495, y: 5393, attributes: { strength: 2 }, links: ["riposte_doctrine"] },
  { id: "for_start", name: "Way of Fortitude", description: "A starting point of the nine-pointed star. Any class may path through it.", kind: "start", x: 2750, y: 3331, attributes: { fortitude: 3 }, links: ["node_111", "node_136"] },
  { id: "for_p0", name: "Stonefast", description: "+25 armor", kind: "small", x: 2269, y: 4084, mods: [mod("armor", "flat", 25)], links: ["node_80"] },
  { id: "for_p1", name: "Maximum Poise", description: "+10 maximum poise", kind: "small", x: 2619, y: 3339, mods: [mod("poise", "flat", 10)], links: ["for_start", "node_138"] },
  { id: "wil_start", name: "Way of Willpower", description: "A starting point of the nine-pointed star. Any class may path through it.", kind: "start", x: 2869, y: 2623, attributes: { willpower: 3 }, links: [] },
  { id: "wil_p0", name: "Warded Mind", description: "+12 maximum energy shield", kind: "small", x: 2787, y: 1826, mods: [mod("energyShield", "flat", 12)], links: [] },
  { id: "wil_p1", name: "Iron Will", description: "+5% to all resistances", kind: "small", x: 1913, y: 1489, mods: [mod("fireRes", "flat", 0.05), mod("coldRes", "flat", 0.05), mod("lightningRes", "flat", 0.05), mod("chaosRes", "flat", 0.05)], links: [] },
  { id: "cha_start", name: "Way of Charisma", description: "A starting point of the nine-pointed star. Any class may path through it.", kind: "start", x: 3391, y: 3086, attributes: { charisma: 3 }, links: ["node_124", "node_160", "node_163"] },
  { id: "cha_p0", name: "Foresight", description: "+10 maximum insight", kind: "small", x: 3743, y: 3040, mods: [mod("insight", "flat", 10)], links: ["cha_p1", "node_164"] },
  { id: "cha_p1", name: "Read the Room", description: "10% increased evasion, +5 maximum insight", kind: "small", x: 3863, y: 3025, mods: [mod("evasion", "increased", 0.1), mod("insight", "flat", 5)], links: [] },
  { id: "cha_key_root", name: "The Unmoved Eye", description: "KEYSTONE: insight pools in STILLNESS instead of motion â€” planted feet ramp it in over ~6 seconds; walking bleeds it", kind: "keystone", x: 4628, y: 5065, mods: [mod("insightInversion", "flat", 1)], links: ["node_72", "settling_stone"] },
  { id: "settling_stone", name: "Settling Stone", description: "Rooted insight ramps in 25% faster; +10 maximum insight", kind: "notable", x: 4550, y: 4961, mods: [mod("insightStillTaper", "increased", -0.25), mod("insight", "flat", 10)], links: [] },
  { id: "wil_x1", name: "Still Mind", description: "KEYSTONE: While you have energy shield, take 60% less damage over time. +15 maximum energy shield", kind: "keystone", x: 886, y: 4524, mods: [mod("esDotResist", "flat", 0.6), mod("energyShield", "flat", 15)], links: [] },
  { id: "sanguine_lattice", name: "Sanguine Lattice", description: "Gain 40% of your life regeneration per second as thorns", kind: "notable", x: 4707, y: 4976, mods: [linkMod("thorns", "lifeRegen", 0.4)], links: ["vicious_cycle"] },
  { id: "vicious_cycle", name: "Vicious Cycle", description: "Gain 20% of your thorns as life regeneration per second", kind: "notable", x: 4631, y: 4867, mods: [linkMod("lifeRegen", "thorns", 0.2)], links: [] },
  { id: "fevered_blood", name: "Fevered Blood", description: "For each stack of poison on YOU: 2% increased damage dealt, 2% increased damage taken", kind: "notable", x: 2313, y: 1683, mods: [gaugeMod("damage", "increased", 0.02, "status:poison"), gaugeMod("damageTaken", "increased", 0.02, "status:poison")], links: ["sum_n2"] },
  { id: "riposte_doctrine", name: "Riposte Doctrine", description: "+3% block chance; 35% chance on block to erupt (Bulwark Nova); 30% chance on block to mend (Guarded Heart)", kind: "notable", x: 2476, y: 5491, mods: [mod("blockChance", "flat", 0.03), mod("proc_bulwark_nova", "flat", 0.35), mod("proc_guarded_heart", "flat", 0.3)], links: [] },
  { id: "break_the_line", name: "Break the Line", description: "20% increased poise damage; breaking an enemy's poise grants Breaker's Momentum", kind: "notable", x: 3916, y: 3936, mods: [mod("poiseDamage", "increased", 0.2), mod("proc_breakers_momentum", "flat", 1)], links: ["brz_n2"] },
  { id: "eva_pr1", name: "Second Wind", description: "+3 life gained on evade; 40% chance on evade to catch your breath (heal)", kind: "notable", x: 3600, y: 540, mods: [mod("lifeOnEvade", "flat", 3), mod("proc_second_wind", "flat", 0.4)], links: ["node_5"] },
  { id: "stored_lightning", name: "Stored Lightning", description: "+15 maximum energy shield; your energy shield breaking releases a Capacitor Burst, and half the time a Phase Surge", kind: "notable", x: 900, y: 840, mods: [mod("energyShield", "flat", 15), mod("proc_capacitor_burst", "flat", 1), mod("proc_phase_surge", "flat", 0.5)], links: [] },
  { id: "forged_rhythm", name: "Forged Rhythm", description: "25% increased poise recovery; your broken poise re-arms at 75% of maximum", kind: "notable", x: 1634, y: 4403, mods: [mod("poiseRegenPct", "increased", 0.25), mod("poiseRearmAt", "flat", -0.25)], links: ["twice_quenched"] },
  { id: "rising_crest", name: "Rising Crest", description: "+2 poise gained on hit; poise gains can overcharge 20% past maximum", kind: "notable", x: 2463, y: 3465, mods: [mod("poiseOnHit", "flat", 2), mod("poiseOvercharge", "flat", 0.2)], links: [] },
  { id: "bonewright_oath", name: "Bonewright Oath", description: "KEYSTONE: renounce all energy shield; 45% of it is read again as maximum poise", kind: "keystone", x: 2925, y: 1942, mods: [mod("esForgone", "flat", 1), mod("esToPoise", "flat", 0.45)], links: ["cl_es_p1"] },
  { id: "shatterplate_doctrine", name: "Shatterplate Doctrine", description: "+20 maximum poise; your poise breaking hurls the bar's shards as shrapnel (Shatterplate)", kind: "notable", x: 1394, y: 5051, mods: [mod("poise", "flat", 20), mod("proc_shatterplate", "flat", 1)], links: [] },
  { id: "broken_fury", name: "Broken Fury", description: "While your poise is broken, deal 15% more damage; your poise breaking rouses Unbroken Wrath", kind: "notable", x: 2286, y: 4170, mods: [mod("damage", "more", 0.15, undefined, "poiseBroken"), mod("proc_unbroken_wrath", "flat", 1)], links: ["for_p0"] },
  { id: "twice_quenched", name: "Twice-Quenched Steel", description: "Your poise re-arming tempers it (Tempered Re-arm); +10 maximum poise", kind: "notable", x: 1507, y: 4393, mods: [mod("proc_tempered_rearm", "flat", 1), mod("poise", "flat", 10)], links: [] },
  { id: "battle_cadence", name: "Battle Cadence", description: "Gain the Drumbeat grammar â€” landing the same skill three times running surges damage and poise damage; +10 maximum poise", kind: "notable", x: 3192, y: 4987, mods: [mod("combo_drumbeat", "flat", 1), mod("poise", "flat", 10)], links: ["node_116"] },
  { id: "prismatic_cycle", name: "Prismatic Cycle", description: "Gain the Prismatic Round grammar â€” casting three different elements in a row surges elemental damage; 8% increased fire, cold and lightning damage", kind: "notable", x: 1494, y: 5135, mods: [mod("combo_elemental_round", "flat", 1), mod("damage", "increased", 0.08, ["fire"]), mod("damage", "increased", 0.08, ["cold"]), mod("damage", "increased", 0.08, ["lightning"])], links: ["sor_x1"] },
  { id: "unbroken_stream", name: "Unbroken Stream", description: "40% chance for damage not to interrupt your energy shield recharge; 15% increased recharge rate", kind: "notable", x: 2818, y: 1755, mods: [mod("esRechargeSteadfast", "flat", 0.4), mod("esRechargeRate", "increased", 0.15)], links: ["wil_p0"] },
  { id: "tidal_mind", name: "Tidal Mind", description: "KEYSTONE: Your energy shield recharge is never interrupted by damage, but your recharge delay is 50% longer", kind: "keystone", x: 587, y: 1642, mods: [mod("esRechargeSteadfast", "override", 1), mod("esRechargeDelay", "increased", 0.5)], links: [] },
  { id: "venom_focus", name: "Venom Focus", description: "For each stack of poison on YOU: 2% increased damage dealt (and nothing else â€” the poison is fuel, not a bargain)", kind: "notable", x: 3749, y: 1629, mods: [gaugeMod("damage", "increased", 0.02, "status:poison")], links: [] },
  { id: "furious_momentum", name: "Furious Momentum", description: "1% more physical damage per Fury charge", kind: "notable", x: 4716, y: 4455, mods: [gaugeMod("damage", "more", 0.01, "charge:fury", ["physical"])], links: [] },
  { id: "iron_sinews", name: "Iron Sinews", description: "Gain 1 added physical damage with melee skills per 100 armor", kind: "notable", x: 3151, y: 3959, mods: [linkMod("addedPhysical", "armor", 0.01, ["melee"])], links: ["war_s4"] },
  { id: "blood_arcana", name: "Blood Arcana", description: "Gain 1 added chaos damage with spells per 50 maximum life", kind: "notable", x: 1602, y: 1809, mods: [linkMod("addedChaos", "life", 0.02, ["spell"])], links: [] },
  { id: "enduring_bulwark", name: "Enduring Bulwark", description: "+40 maximum endurance; blocking banks endurance (Bastion)", kind: "notable", x: 2786, y: 4437, mods: [mod("endurance", "flat", 40), mod("proc_bastion_fortify", "flat", 1)], links: ["war_n2"] },
  { id: "radiant_reprisal_n", name: "Radiant Reprisal", description: "Sanctified Strike: 25% chance on hit (once per swing) to bloom after 0.5s â€” healing allies and burning enemies in the circle", kind: "notable", x: 3084, y: 5566, mods: [mod("proc_radiant_reprisal", "flat", 0.25)], links: [] },
  { id: "radiant_cascade_n", name: "Radiant Cascade", description: "Sanctified Strike: 15% chance per target struck to host its own smaller bloom", kind: "notable", x: 3998, y: 5515, mods: [mod("proc_radiant_cascade", "flat", 0.15)], links: [] },
  { id: "executioners_rhythm_n", name: "Executioner's Rhythm", description: "+8 life gained on kill; kills tick your cooldowns down 1.5s", kind: "notable", x: 5614, y: 4712, mods: [mod("lifeOnKill", "flat", 8), mod("proc_executioners_rhythm", "flat", 1)], links: [] },
  { id: "reapers_due", name: "Reaper's Due", description: "KEYSTONE: your hits EXECUTE enemies at or below 10% of their maximum life", kind: "keystone", x: 3974, y: 4532, mods: [mod("cullThreshold", "flat", 0.1)], links: [] },
  { id: "cl_wake_p0", name: "Votive Path", description: "+1 maximum Wakeflame; 10% increased orb shed chance", kind: "small", x: 4936, y: 4110, mods: [mod("chargeCap_wakeflame", "flat", 1), mod("orbShedRate", "increased", 0.1)], links: ["cl_wake_tallow"] },
  { id: "cl_wake_p1", name: "Candle Beads", description: "Kills have 6% chance to shed a Wakeflame orb; scooping a Wakeflame sparks 6 mana back (Votive Spark)", kind: "small", x: 4747, y: 3980, mods: [mod("orbOnKill_wakeflame", "flat", 0.06), mod("proc_votive_spark", "flat", 1)], links: ["cl_wake_p2", "cl_wake_tallow"] },
  { id: "cl_wake_hurt", name: "Bruised Votives", description: "Blows that land on you have an 8% chance to shake a Wakeflame orb loose â€” every wound feeds the wake", kind: "small", x: 4631, y: 3972, mods: [mod("orbOnHurt_wakeflame", "flat", 0.08)], links: ["cl_wake_p1", "node_183"] },
  { id: "cl_fount_p0", name: "Deep Founts", description: "+1 maximum Life Fount and Mana Fount", kind: "small", x: 4740, y: 3584, mods: [mod("chargeCap_flask_life", "flat", 1), mod("chargeCap_flask_mana", "flat", 1)], links: ["node_181"] },
  { id: "cl_fount_n", name: "Bottomless Draught", description: "Fount drinks restore an extra 3% of the pool's maximum; 20% increased Restoration", kind: "notable", x: 4650, y: 3562, mods: [mod("restorePctMax", "flat", 0.03), mod("restorePower", "increased", 0.2)], links: ["cl_fount_p0"] },
  { id: "cl_wake_p2", name: "Keeper's Patience", description: "Gain 1 Wakeflame every 10 seconds", kind: "small", x: 4734, y: 4129, mods: [mod("chargeRegen_wakeflame", "flat", 1)], links: [] },
  { id: "cl_wake_cortege", name: "Cortege", description: "For each Wakeflame you hold: minions deal 2% increased damage", kind: "notable", x: 4811, y: 3956, mods: [gaugeMod("minionDamage", "increased", 0.02, "charge:wakeflame")], links: ["cl_wake_p1"] },
  { id: "cl_wake_tallow", name: "Tallow Ward", description: "For each Wakeflame you hold: 3% increased armor and 1% less damage taken", kind: "notable", x: 4793, y: 4063, mods: [gaugeMod("armor", "increased", 0.03, "charge:wakeflame"), gaugeMod("damageTaken", "more", -0.01, "charge:wakeflame")], links: [] },
  { id: "cl_wake_bright", name: "Bright Procession", description: "For each Wakeflame you hold: 2% increased damage; Wakeflame orbs refund 0.1s of every cooling skill", kind: "notable", x: 4784, y: 4183, mods: [gaugeMod("damage", "increased", 0.02, "charge:wakeflame"), mod("orbRefund_wakeflame", "flat", 0.1)], links: ["cl_wake_hours", "cl_wake_p2"] },
  { id: "cl_wake_hours", name: "The Candle Hours", description: "KEYSTONE: you can hold 2 fewer Wakeflames, but each burns brighter â€” per Wakeflame: 3% increased damage, minions 3% increased damage, 1.5% less damage taken", kind: "keystone", x: 4875, y: 4175, mods: [mod("chargeCap_wakeflame", "flat", -2), gaugeMod("damage", "increased", 0.03, "charge:wakeflame"), gaugeMod("minionDamage", "increased", 0.03, "charge:wakeflame"), gaugeMod("damageTaken", "more", -0.015, "charge:wakeflame")], links: ["cl_wake_tallow"] },
  { id: "chain_reaction", name: "Chain Reaction", description: "KEYSTONE: your triggered effects can themselves trigger effects (one extra layer; deeper layers fire at half rate)", kind: "keystone", x: 570, y: 1230, mods: [mod("procDepth", "flat", 1)], links: ["kindled_rage_n", "stored_lightning"] },
  { id: "gamblers_touch", name: "Gambler's Touch", description: "+20% Luck (your triggered effects fire more often â€” never drop rates)", kind: "notable", x: 420, y: 900, mods: [mod("luck", "flat", 0.2)], links: ["perpetual_motion", "stored_lightning"] },
  { id: "fortunes_weave", name: "Fortune's Weave", description: "+10% Luck", kind: "small", x: 300, y: 1020, mods: [mod("luck", "flat", 0.1)], links: ["gamblers_touch"] },
  { id: "kindled_rage_n", name: "Kindled Rage", description: "Gaining a Fury charge has a 10% chance to grant a Rage stack (Rage cools off when not refreshed)", kind: "notable", x: 450, y: 1380, mods: [mod("proc_kindled_rage", "flat", 0.1)], links: [] },
  { id: "crimson_thirst_n", name: "Crimson Thirst", description: "Gaining a Rage stack has a 25% chance to bank 2 Bloodlust (chained gains need deeper proc layers)", kind: "notable", x: 330, y: 1500, mods: [mod("proc_crimson_thirst", "flat", 0.25)], links: ["kindled_rage_n", "surging_frenzy_n"] },
  { id: "surging_frenzy_n", name: "Surging Frenzy", description: "Gaining Bloodlust has a 35% chance to grant a Fury charge â€” the loop closes only as deep as your proc layers reach; it can never turn forever", kind: "notable", x: 210, y: 1620, mods: [mod("proc_surging_frenzy", "flat", 0.35)], links: [] },
  { id: "battle_chorus_n", name: "Battle Chorus", description: "Gaining ANY buff has a 25% chance to grant a Fury charge (6s cooldown)", kind: "notable", x: 720, y: 1500, mods: [mod("proc_battle_chorus", "flat", 0.25)], links: ["chain_reaction"] },
  { id: "perpetual_motion", name: "Perpetual Motion", description: "KEYSTONE: one further proc layer (stacks with Chain Reaction to the absolute lid; each layer fires at half the last's rate)", kind: "keystone", x: 240, y: 780, mods: [mod("procDepth", "flat", 1)], links: [] },
  { id: "transfusion", name: "Transfusion", description: "5% of your damage dealt heals allies near you (Vampiric Share)", kind: "notable", x: 5806, y: 3560, mods: [mod("vampiricShare", "flat", 0.05)], links: [] },
  { id: "fellowship_of_the_wake", name: "Fellowship of the Wake", description: "Heals that land on you RIPPLE: 35% echoes to up to 3 nearby allies â€” hirelings, wanderers and townsfolk included (sympathy)", kind: "notable", x: 5674, y: 4412, mods: [mod("sympathy_menders_ripple", "flat", 1)], links: ["node_179"] },
  { id: "oathbound_insight", name: "Oathbound Insight", description: "Critical hits have a 35% chance to grant a Fury charge (independent of any gem's crit dice)", kind: "notable", x: 4875, y: 2210, mods: [mod("proc_battle_insight", "flat", 0.35)], links: [] },
  { id: "shepherds_rites", name: "Shepherd's Rites", description: "Minions heal 8% of a dying kin's life; summons mend nearby allies 4 on arrival", kind: "notable", x: 2757, y: 1525, mods: [mod("minionDeathHeal", "flat", 0.08), mod("summonMend", "flat", 4)], links: [] },
  { id: "silencing_brand", name: "Silencing Brand", description: "Your spells have an 8% chance to Silence (no spells for the afflicted)", kind: "notable", x: 1108, y: 2271, mods: [mod("apply_silence", "flat", 0.08, ["spell"])], links: [] },
  { id: "stalwart_recovery", name: "Stalwart Recovery", description: "30% of hits that land on your life flow back as healing over the next 6 seconds", kind: "notable", x: 2527, y: 4740, mods: [mod("recuperate", "flat", 0.3)], links: [] },
  { id: "exsanguinate", name: "Exsanguinate", description: "Attacks have 20% chance to Bleed; 20% increased physical ailment magnitude", kind: "notable", x: 3268, y: 1433, mods: [mod("apply_bleed", "flat", 0.2, ["attack"]), mod("statusMagnitude", "increased", 0.2, ["physical"])], links: ["swb_s3", "malignant_precision"] },
  // THE MALIGNANT LANE's unlock (dotCrit — DoTs can crit): the deliberate
  // trade the crit-affliction build anchors on. The tax is honest MORE.
  { id: "malignant_precision", name: "Malignant Precision", description: "Damaging ailments you apply can critically strike at 60% of your critical chance; 10% less damage", kind: "notable", x: 3352, y: 1497, mods: [mod("dotCrit", "flat", 0.6), mod("damage", "more", -0.10)], links: ["exsanguinate"] },
  { id: "kindling_doctrine", name: "Kindling Doctrine", description: "Spells have 15% chance to Ignite; 20% increased fire ailment magnitude", kind: "notable", x: 1322, y: 4133, mods: [mod("apply_burn", "flat", 0.15, ["spell"]), mod("statusMagnitude", "increased", 0.2, ["fire"])], links: ["node_57"] },
  { id: "cho_calling", name: "The Calling", description: "Choose one calling â€” Might, Bulwark, or Cunning. The choice is permanent; the paths not taken lock.", kind: "choice", x: 3842, y: 2906, choice: { group: "attr_calling" }, links: ["node_167"] },
  { id: "cho_temper", name: "The Tempering", description: "Temper one attribute â€” a permanent percent increase that scales everything the build grants it.", kind: "choice", x: 5610, y: 3648, choice: { group: "attr_temper" }, links: ["node_129"] },
  { id: "cho_bulwark1", name: "Bulwark Doctrine", description: "Commit to one doctrine of the bulwark. Each doctrine may be sworn only once per character, at any node that deals it.", kind: "choice", x: 565, y: 3753, choice: { group: "bulwark_doctrines" }, links: ["node_90"] },
  { id: "cho_bulwark2", name: "Bulwark Doctrine", description: "Commit to one doctrine of the bulwark. Each doctrine may be sworn only once per character, at any node that deals it.", kind: "choice", x: 2969, y: 5308, choice: { group: "bulwark_doctrines" }, links: ["node_117"] },
  { id: "cho_war1", name: "War Doctrine", description: "Commit to one doctrine of war. Each doctrine may be sworn only once per character, at any node that deals it.", kind: "choice", x: 3194, y: 5303, choice: { group: "war_doctrines" }, links: ["node_117"] },
  { id: "cho_war2", name: "War Doctrine", description: "Commit to one doctrine of war. Each doctrine may be sworn only once per character, at any node that deals it.", kind: "choice", x: 5389, y: 4574, choice: { group: "war_doctrines" }, links: ["node_123"] },
  { id: "cho_arcane1", name: "Arcane Doctrine", description: "Commit to one doctrine of the arcane. Each doctrine may be sworn only once per character, at any node that deals it.", kind: "choice", x: 498, y: 3581, choice: { group: "arcane_doctrines" }, links: ["node_90"] },
  { id: "cho_arcane2", name: "Arcane Doctrine", description: "Commit to one doctrine of the arcane. Each doctrine may be sworn only once per character, at any node that deals it.", kind: "choice", x: 2472, y: 846, choice: { group: "arcane_doctrines" }, links: ["node_96"] },
  { id: "cho_wake_litany", name: "The Candle Litany", description: "Recite three of the litany's eight verses â€” each verse costs a point; five stay unsaid forever.", kind: "choice", x: 4719, y: 4218, choice: { group: "wake_litany" }, links: ["cl_wake_p2"] },
  { id: "cho_wake_paean", name: "The Paean", description: "Sing one of four refrains over the wake. The others fall silent.", kind: "choice", x: 5613, y: 3411, choice: { group: "wake_paean" }, links: ["node_129"] },
  { id: "dev_hunt_root", name: "The Hunt", description: "The Hunt constellation's crest â€” attuned free when Devotion opens. Its stars spend devotion points.", kind: "start", x: 3000, y: 3000, realm: "devotion", links: ["dev_hunt_s1", "dev_hunt_s2", "dev_hunt_s3"] },
  { id: "dev_hunt_s1", name: "Loping Chase", description: "8% increased projectile damage", kind: "small", x: 2830, y: 2880, mods: [mod("damage", "increased", 0.08, ["projectile"])], realm: "devotion", links: [] },
  { id: "dev_hunt_s2", name: "Keen Scent", description: "+30 accuracy rating", kind: "small", x: 3170, y: 2880, mods: [mod("accuracy", "flat", 30)], realm: "devotion", links: [] },
  { id: "dev_hunt_s3", name: "Soft Paws", description: "4% increased movement speed", kind: "small", x: 2900, y: 3190, mods: [mod("moveSpeed", "increased", 0.04)], realm: "devotion", links: [] },
  { id: "dev_hunt_n1", name: "The Hound", description: "15% increased projectile damage; +2 life gained on kill. GRAFT: Skewering Blows â€” bind it onto one learned skill.", kind: "notable", x: 3080, y: 3210, mods: [mod("damage", "increased", 0.15, ["projectile"]), mod("lifeOnKill", "flat", 2)], realm: "devotion", graft: { support: "skewering_blows" }, links: ["dev_hunt_s3"] },
  { id: "dev_hunt_cho", name: "Aspect of the Hunt", description: "Take one aspect of the Hunt. The constellation remembers your shape.", kind: "choice", x: 3000, y: 2700, choice: { group: "devotion_hunt" }, realm: "devotion", links: ["dev_hunt_s1", "dev_hunt_s2"] },
  { id: "pan_major", name: "Shrine of the Voice", description: "Kneel and take ONE Major voice. The other gods remember being passed over.", kind: "choice", x: 2820, y: 3000, choice: { group: "pantheon_major" }, realm: "pantheon", links: [] },
  { id: "pan_minor", name: "Shrine of Blessings", description: "Three minor blessings of six â€” each communion costs a point.", kind: "choice", x: 3180, y: 3000, choice: { group: "pantheon_minor" }, realm: "pantheon", links: [] },
  { id: "pan_offering", name: "Offering Stone", description: "+10 maximum life", kind: "small", x: 3000, y: 3260, mods: [mod("life", "flat", 10)], realm: "pantheon", links: [] },
  { id: "node_74", name: "Wisdom", description: "", kind: "attr", x: 2213, y: 2527, attributes: { wisdom: 2 }, links: ["node_75", "wis_start"] },
  { id: "node_75", name: "Wisdom", description: "", kind: "attr", x: 1884, y: 2344, attributes: { wisdom: 2 }, links: ["node_76"] },
  { id: "node_76", name: "Wisdom", description: "", kind: "attr", x: 1503, y: 2139, attributes: { wisdom: 2 }, links: ["node_77"] },
  { id: "node_77", name: "Wisdom", description: "", kind: "attr", x: 1121, y: 1935, attributes: { wisdom: 2 }, links: [] },
  { id: "node_78", name: "Willpower", description: "", kind: "attr", x: 2925, y: 1344, attributes: { willpower: 2 }, links: ["node_94"] },
  { id: "node_79", name: "Maximum Life", description: "", kind: "small", x: 2897, y: 3483, mods: [mod("life", "increased", 0.05)], links: ["str_start"] },
  { id: "node_80", name: "Fortitude", description: "", kind: "attr", x: 2187, y: 4080, attributes: { fortitude: 2 }, links: ["node_82", "node_83"] },
  { id: "node_81", name: "Strength", description: "", kind: "attr", x: 3008, y: 3837, attributes: { strength: 2 }, links: [] },
  { id: "node_82", name: "Fortitude", description: "", kind: "attr", x: 1943, y: 4399, attributes: { fortitude: 2 }, links: [] },
  { id: "node_83", name: "Fortitude", description: "", kind: "attr", x: 2432, y: 3741, attributes: { fortitude: 2 }, links: [] },
  { id: "node_84", name: "Wisdom", description: "", kind: "attr", x: 2470, y: 2674, attributes: { wisdom: 2 }, links: [] },
  { id: "node_85", name: "Intelligence", description: "", kind: "attr", x: 2426, y: 3127, attributes: { intelligence: 2 }, links: ["node_86"] },
  { id: "node_86", name: "Intelligence", description: "", kind: "attr", x: 2022, y: 3234, attributes: { intelligence: 2 }, links: ["node_87"] },
  { id: "node_87", name: "Intelligence", description: "", kind: "attr", x: 1685, y: 3334, attributes: { intelligence: 2 }, links: ["node_88"] },
  { id: "node_88", name: "Intelligence", description: "", kind: "attr", x: 1319, y: 3441, attributes: { intelligence: 2 }, links: ["node_89"] },
  { id: "node_89", name: "Intelligence", description: "", kind: "attr", x: 909, y: 3562, attributes: { intelligence: 2 }, links: ["node_90"] },
  { id: "node_90", name: "Intelligence", description: "", kind: "attr", x: 438, y: 3704, attributes: { intelligence: 5 }, links: [] },
  { id: "node_91", name: "Willpower", description: "", kind: "attr", x: 2832, y: 2407, attributes: { willpower: 2 }, links: ["node_92", "wil_start"] },
  { id: "node_92", name: "Willpower", description: "", kind: "attr", x: 2783, y: 2170, attributes: { willpower: 2 }, links: ["node_93", "sor_es1"] },
  { id: "node_93", name: "Willpower", description: "", kind: "attr", x: 2714, y: 1849, attributes: { willpower: 2 }, links: ["node_94", "wil_p0"] },
  { id: "node_94", name: "Willpower", description: "", kind: "attr", x: 2659, y: 1464, attributes: { willpower: 2 }, links: ["node_95", "shepherds_rites"] },
  { id: "node_95", name: "Willpower", description: "", kind: "attr", x: 2593, y: 1112, attributes: { willpower: 2 }, links: ["node_96"] },
  { id: "node_96", name: "Willpower", description: "", kind: "attr", x: 2526, y: 751, attributes: { willpower: 5 }, links: [] },
  { id: "node_97", name: "Finesse", description: "", kind: "attr", x: 3219, y: 2476, attributes: { finesse: 2 }, links: ["node_98"] },
  { id: "node_98", name: "Finesse", description: "", kind: "attr", x: 3363, y: 2180, attributes: { finesse: 2 }, links: ["node_99"] },
  { id: "node_99", name: "Finesse", description: "", kind: "attr", x: 3525, y: 1848, attributes: { finesse: 2 }, links: [] },
  { id: "node_100", name: "Finesse", description: "", kind: "attr", x: 3707, y: 1479, attributes: { finesse: 2 }, links: ["node_101", "node_15", "node_16", "node_99", "venom_focus"] },
  { id: "node_101", name: "Finesse", description: "", kind: "attr", x: 3831, y: 1173, attributes: { finesse: 2 }, links: ["node_102"] },
  { id: "node_102", name: "Finesse", description: "", kind: "attr", x: 3961, y: 900, attributes: { finesse: 5 }, links: ["node_6", "node_7"] },
  { id: "node_103", name: "Dexterity", description: "", kind: "attr", x: 3607, y: 2715, attributes: { dexterity: 2 }, links: ["node_104"] },
  { id: "node_104", name: "Dexterity", description: "", kind: "attr", x: 3982, y: 2591, attributes: { dexterity: 2 }, links: ["node_105"] },
  { id: "node_105", name: "Dexterity", description: "", kind: "attr", x: 4452, y: 2443, attributes: { dexterity: 2 }, links: ["node_107", "rng_s2"] },
  { id: "node_106", name: "New Node", description: "", kind: "small", x: 4995, y: 2598, links: [] },
  { id: "node_107", name: "Dexterity", description: "", kind: "attr", x: 4836, y: 2326, attributes: { dexterity: 2 }, links: ["node_108", "node_176", "node_184", "oathbound_insight"] },
  { id: "node_108", name: "Dexterity", description: "", kind: "attr", x: 5245, y: 2214, attributes: { dexterity: 2 }, links: ["node_109"] },
  { id: "node_109", name: "Dexterity", description: "", kind: "attr", x: 5622, y: 2097, attributes: { dexterity: 5 }, links: ["node_17", "node_177"] },
  { id: "node_110", name: "Strength", description: "", kind: "attr", x: 2998, y: 3580, attributes: { strength: 2 }, links: ["node_81", "str_start"] },
  { id: "node_111", name: "Fortitude", description: "", kind: "attr", x: 2602, y: 3506, attributes: { fortitude: 2 }, links: ["node_83"] },
  { id: "node_112", name: "Fortitude", description: "", kind: "attr", x: 1744, y: 4642, attributes: { fortitude: 2 }, links: ["node_113", "node_82"] },
  { id: "node_113", name: "Fortitude", description: "", kind: "attr", x: 1466, y: 4977, attributes: { fortitude: 5 }, links: ["node_61", "node_62", "shatterplate_doctrine"] },
  { id: "node_114", name: "Strength", description: "", kind: "attr", x: 3026, y: 4174, attributes: { strength: 2 }, links: ["node_115", "node_81"] },
  { id: "node_115", name: "Strength", description: "", kind: "attr", x: 3039, y: 4535, attributes: { strength: 2 }, links: ["node_116", "node_68"] },
  { id: "node_116", name: "Strength", description: "", kind: "attr", x: 3069, y: 4989, attributes: { strength: 2 }, links: ["node_117", "war_kb2"] },
  { id: "node_117", name: "Strength", description: "", kind: "attr", x: 3077, y: 5457, attributes: { strength: 5 }, links: ["node_71", "node_73", "radiant_reprisal_n"] },
  { id: "node_118", name: "Prowess", description: "", kind: "attr", x: 3518, y: 3501, attributes: { prowess: 2 }, links: ["node_119", "prw_start"] },
  { id: "node_119", name: "Prowess", description: "", kind: "attr", x: 3862, y: 3738, attributes: { prowess: 2 }, links: ["node_120"] },
  { id: "node_120", name: "Prowess", description: "", kind: "attr", x: 4290, y: 4038, attributes: { prowess: 2 }, links: ["node_121", "node_183", "node_70"] },
  { id: "node_121", name: "Prowess", description: "", kind: "attr", x: 4785, y: 4348, attributes: { prowess: 2 }, links: ["node_122"] },
  { id: "node_122", name: "Prowess", description: "", kind: "attr", x: 5134, y: 4582, attributes: { prowess: 2 }, links: ["node_123"] },
  { id: "node_123", name: "Prowess", description: "", kind: "attr", x: 5425, y: 4768, attributes: { prowess: 5 }, links: ["node_179", "node_72"] },
  { id: "node_124", name: "Charisma", description: "", kind: "attr", x: 3688, y: 3152, attributes: { charisma: 2 }, links: ["node_125"] },
  { id: "node_125", name: "Charisma", description: "", kind: "attr", x: 4068, y: 3242, attributes: { charisma: 2 }, links: ["node_126"] },
  { id: "node_126", name: "Charisma", description: "", kind: "attr", x: 4529, y: 3336, attributes: { charisma: 2 }, links: ["node_127"] },
  { id: "node_127", name: "Charisma", description: "", kind: "attr", x: 4902, y: 3409, attributes: { charisma: 2 }, links: ["node_128", "node_181", "node_186"] },
  { id: "node_128", name: "Charisma", description: "", kind: "attr", x: 5293, y: 3479, attributes: { charisma: 2 }, links: ["node_129"] },
  { id: "node_129", name: "Charisma", description: "", kind: "attr", x: 5690, y: 3539, attributes: { charisma: 5 }, links: ["node_178", "node_180", "transfusion"] },
  { id: "node_130", name: " Spell Damage", description: "5% increased spell damage", kind: "small", x: 2515, y: 3020, mods: [mod("damage", "increased", 0.05, ["spell"])], links: ["sor_s1"] },
  { id: "node_131", name: "Maximum Mana", description: "+10 maximum mana", kind: "small", x: 2567, y: 3196, mods: [mod("mana", "flat", 10)], links: ["sor_s2"] },
  { id: "node_132", name: "Minion Damage", description: "5% increased minion damage", kind: "small", x: 2535, y: 2836, mods: [mod("minionDamage", "increased", 0.05)], links: ["node_141", "wis_start"] },
  { id: "node_133", name: "Maximum Life", description: "", kind: "small", x: 2628, y: 2642, mods: [mod("life", "increased", 0.05)], links: ["node_142", "wis_start"] },
  { id: "node_134", name: "Maximum Life", description: "", kind: "small", x: 2747, y: 2546, mods: [mod("life", "increased", 0.05)], links: ["node_143", "wil_start"] },
  { id: "node_135", name: "Maximum Life", description: "", kind: "small", x: 2970, y: 2521, mods: [mod("life", "increased", 0.05)], links: ["node_144", "wil_start"] },
  { id: "node_136", name: "Maximum Life", description: "", kind: "small", x: 2772, y: 3467, mods: [mod("life", "increased", 0.05)], links: ["node_150"] },
  { id: "node_137", name: "Maximum Life", description: "", kind: "small", x: 3118, y: 3488, mods: [mod("life", "increased", 0.05)], links: ["node_153", "str_start"] },
  { id: "node_138", name: "Increased Poise", description: "+5 maximum poise, 5% increased Poise", kind: "small", x: 2526, y: 3400, mods: [mod("poise", "increased", 0.05), mod("poise", "flat", 5)], links: ["node_139", "node_149"] },
  { id: "node_139", name: "Maximum Poise", description: "+10 maximum poise", kind: "small", x: 2565, y: 3446, mods: [mod("poise", "flat", 10)], links: ["node_140"] },
  { id: "node_140", name: "Poise Gain on Hit", description: "+3 poise gained on hit", kind: "small", x: 2522, y: 3506, mods: [mod("poiseOnHit", "flat", 3)], links: ["rising_crest"] },
  { id: "node_141", name: "Maximum Life", description: "", kind: "small", x: 2383, y: 2823, mods: [mod("life", "increased", 0.05)], links: ["node_147"] },
  { id: "node_142", name: "Maximum Life", description: "", kind: "small", x: 2554, y: 2564, mods: [mod("life", "increased", 0.05)], links: ["node_148"] },
  { id: "node_143", name: "Maximum Life", description: "", kind: "small", x: 2702, y: 2450, mods: [mod("life", "increased", 0.05)], links: ["node_148"] },
  { id: "node_144", name: "Maximum Life", description: "", kind: "small", x: 3002, y: 2393, mods: [mod("life", "increased", 0.05)], links: ["node_175"] },
  { id: "node_145", name: "Minion Life", description: "10% increased minion life", kind: "small", x: 502, y: 3034, mods: [mod("minionLife", "increased", 0.1)], links: ["sum_s2", "sum_x1"] },
  { id: "node_146", name: "Intelligence", description: "", kind: "attr", x: 1237, y: 2345, attributes: { intelligence: 2 }, links: ["node_76", "silencing_brand"] },
  { id: "node_147", name: "Maximum Life", description: "", kind: "small", x: 2299, y: 2912, mods: [mod("life", "increased", 0.05)], links: ["sor_s1"] },
  { id: "node_148", name: "Maximum Life", description: "", kind: "small", x: 2528, y: 2418, mods: [mod("life", "increased", 0.05)], links: [] },
  { id: "node_149", name: "Increased Mana", description: "5% increased maximum mana", kind: "small", x: 2393, y: 3366, mods: [mod("mana", "increased", 0.05)], links: ["sor_s2"] },
  { id: "node_150", name: "Maximum Life", description: "", kind: "small", x: 2742, y: 3596, mods: [mod("life", "increased", 0.05)], links: ["node_152"] },
  { id: "node_151", name: "Maximum Life", description: "", kind: "small", x: 2902, y: 3620, mods: [mod("life", "increased", 0.05)], links: ["node_152", "node_79"] },
  { id: "node_152", name: "Maximum Life", description: "", kind: "small", x: 2804, y: 3682, mods: [mod("life", "increased", 0.05)], links: ["node_154"] },
  { id: "node_153", name: "Maximum Life", description: "", kind: "small", x: 3193, y: 3620, mods: [mod("life", "increased", 0.05)], links: ["node_157", "war_s1"] },
  { id: "node_154", name: "New Node", description: "", kind: "small", x: 2773, y: 3912, links: ["war_s3"] },
  { id: "node_155", name: "Maximum Life", description: "", kind: "small", x: 3277, y: 3430, mods: [mod("life", "increased", 0.05)], links: ["node_156", "prw_start"] },
  { id: "node_156", name: "Maximum Life", description: "", kind: "small", x: 3377, y: 3558, mods: [mod("life", "increased", 0.05)], links: ["node_157"] },
  { id: "node_157", name: "Maximum Life", description: "", kind: "small", x: 3320, y: 3663, mods: [mod("life", "increased", 0.05)], links: [] },
  { id: "node_158", name: "Maximum Life", description: "", kind: "small", x: 3398, y: 3287, mods: [mod("life", "increased", 0.05)], links: ["node_159", "prw_start"] },
  { id: "node_159", name: "Maximum Life", description: "", kind: "small", x: 3551, y: 3354, mods: [mod("life", "increased", 0.05)], links: ["node_162"] },
  { id: "node_160", name: "Maximum Life", description: "", kind: "small", x: 3436, y: 3172, mods: [mod("life", "increased", 0.05)], links: ["node_161"] },
  { id: "node_161", name: "Maximum Life", description: "", kind: "small", x: 3595, y: 3222, mods: [mod("life", "increased", 0.05)], links: ["node_162"] },
  { id: "node_162", name: "Maximum Life", description: "", kind: "small", x: 3670, y: 3323, mods: [mod("life", "increased", 0.05)], links: [] },
  { id: "node_163", name: "Maximum Life", description: "", kind: "small", x: 3495, y: 2995, mods: [mod("life", "increased", 0.05)], links: ["node_164"] },
  { id: "node_164", name: "Maximum Life", description: "", kind: "small", x: 3626, y: 3002, mods: [mod("life", "increased", 0.05)], links: ["node_167"] },
  { id: "node_165", name: "Maximum Life", description: "", kind: "small", x: 3443, y: 2855, mods: [mod("life", "increased", 0.05)], links: ["node_166"] },
  { id: "node_166", name: "Maximum Life", description: "", kind: "small", x: 3582, y: 2817, mods: [mod("life", "increased", 0.05)], links: ["node_167"] },
  { id: "node_167", name: "Maximum Life", description: "", kind: "small", x: 3698, y: 2905, mods: [mod("life", "increased", 0.05)], links: [] },
  { id: "node_168", name: "Maximum Life", description: "", kind: "small", x: 3289, y: 2594, mods: [mod("life", "increased", 0.05)], links: ["node_169"] },
  { id: "node_169", name: "Maximum Life", description: "", kind: "small", x: 3384, y: 2516, mods: [mod("life", "increased", 0.05)], links: ["node_172"] },
  { id: "node_170", name: "Maximum Life", description: "", kind: "small", x: 3384, y: 2703, mods: [mod("life", "increased", 0.05)], links: ["node_171"] },
  { id: "node_171", name: "Maximum Life", description: "", kind: "small", x: 3509, y: 2627, mods: [mod("life", "increased", 0.05)], links: ["node_172"] },
  { id: "node_172", name: "Maximum Life", description: "", kind: "small", x: 3506, y: 2516, mods: [mod("life", "increased", 0.05)], links: [] },
  { id: "node_173", name: "Maximum Life", description: "", kind: "small", x: 3085, y: 2536, mods: [mod("life", "increased", 0.05)], links: ["node_174"] },
  { id: "node_174", name: "Maximum Life", description: "", kind: "small", x: 3117, y: 2411, mods: [mod("life", "increased", 0.05)], links: ["node_175"] },
  { id: "node_175", name: "Maximum Life", description: "", kind: "small", x: 3060, y: 2331, mods: [mod("life", "increased", 0.05)], links: [] },
  { id: "node_176", name: "Finesse", description: "", kind: "attr", x: 4739, y: 2085, attributes: { finesse: 2 }, links: ["node_23"] },
  { id: "node_177", name: "New Node", description: "", kind: "attr", x: 5761, y: 2606, links: ["node_178"] },
  { id: "node_178", name: "New Node", description: "", kind: "attr", x: 5761, y: 3065, links: [] },
  { id: "node_179", name: "New Node", description: "", kind: "attr", x: 5542, y: 4393, links: ["node_180"] },
  { id: "node_180", name: "New Node", description: "", kind: "attr", x: 5630, y: 3846, links: [] },
  { id: "node_181", name: "Charisma", description: "", kind: "attr", x: 4832, y: 3597, attributes: { charisma: 2 }, links: ["node_182"] },
  { id: "node_182", name: "Prowess", description: "", kind: "attr", x: 4739, y: 3811, attributes: { prowess: 2 }, links: ["node_183"] },
  { id: "node_183", name: "Charisma", description: "", kind: "attr", x: 4517, y: 3952, attributes: { charisma: 2 }, links: [] },
  { id: "node_184", name: "Dexterity", description: "", kind: "attr", x: 4986, y: 2528, attributes: { dexterity: 2 }, links: ["node_185"] },
  { id: "node_185", name: "Charisma", description: "", kind: "attr", x: 5102, y: 2796, attributes: { charisma: 2 }, links: ["node_186"] },
  { id: "node_186", name: "Dexterity", description: "", kind: "attr", x: 5045, y: 3127, attributes: { dexterity: 2 }, links: [] },
];

// --- VOCATION MINI-TREES -------------------------------------------------------
// Each VocationDef's tree (authored in LOCAL coords around 0,0) is offset into
// the EMPTY CENTRE of the nine-point star and merged into the ordinary node
// registry â€” adjacency, recalc, save and the validator all work unchanged.

const starNodes = nodes.filter(n => n.kind === 'start');
/** The hub of the nine-point star â€” where vocation trees anchor. Derived from
 *  the live start nodes (never a hardcoded coordinate). */
export const STAR_CENTER = {
  x: Math.round(starNodes.reduce((s, n) => s + n.x, 0) / Math.max(1, starNodes.length)),
  y: Math.round(starNodes.reduce((s, n) => s + n.y, 0) / Math.max(1, starNodes.length)),
};

for (const v of Object.values(VOCATIONS)) {
  nodes.push({
    id: vocationRootId(v.id), name: v.name,
    description: `${v.blurb} â€” the ${v.name}'s crest, granted with the vocation. Its nodes spend vocation points.`,
    kind: 'vocation', vocation: v.id,
    x: STAR_CENTER.x, y: STAR_CENTER.y, links: [],
  });
  for (const n of v.tree) {
    nodes.push({
      id: vocationNodeId(v.id, n.id), name: n.name, description: n.description,
      kind: n.kind, vocation: v.id,
      x: STAR_CENTER.x + n.x, y: STAR_CENTER.y + n.y,
      attributes: n.attributes, mods: n.mods,
      links: n.links.map(l => vocationNodeId(v.id, l)),
    });
  }
}

// --- Exports -----------------------------------------------------------------

export const PASSIVE_NODES: Record<string, PassiveNode> = {};
for (const n of nodes) PASSIVE_NODES[n.id] = n;

/** Bidirectional adjacency built from the one-way `links` declarations. */
export const PASSIVE_ADJACENCY: Record<string, string[]> = {};
for (const n of nodes) PASSIVE_ADJACENCY[n.id] = [];
for (const n of nodes) {
  for (const to of n.links) {
    if (!PASSIVE_NODES[to]) continue;
    PASSIVE_ADJACENCY[n.id].push(to);
    PASSIVE_ADJACENCY[to].push(n.id);
  }
}

/** Resolved from ClassDef.startNode â€” the tree never hardcodes class ids. */
export function classStartNode(classId: string): string {
  const c = CLASSES.find(cd => cd.id === classId);
  if (!c) console.warn(`[passives] unknown class '${classId}' â€” starting at str_start`);
  return c?.startNode ?? 'str_start';
}

/** The start node that GATES a vocation's point-spending (when the
 *  VOCATION_CFG.requireGateNode playtest toggle is on): the def's authored
 *  override, else the home class's startNode. Registry-resolved â€” no ids. */
export function vocationGateNodeId(vocId: string): string | null {
  const v = VOCATIONS[vocId];
  if (!v) return null;
  return v.gateNode ?? classStartNode(v.classId);
}

/** May a character with these allocations SPEND points in `vocId`'s tree?
 *  True when the gate toggle is off, or once the gate start node is taken.
 *  (A home-class character passes from birth â€” its start node is allocated
 *  at creation; an off-class character must path to it first.) */
export function vocationGateOpen(allocated: ReadonlySet<string>, vocId: string): boolean {
  if (!VOCATION_CFG.requireGateNode) return true;
  const gate = vocationGateNodeId(vocId);
  return gate === null || allocated.has(gate);
}
