// ---------------------------------------------------------------------------
// THE PASSIVE TREE — written by the in-game passive-tree editor (DEV tool).
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
  /** PERCENT attribute grants (+0.05 = "5% increased Fortitude") — the
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
   *  adjacency style ('free' realms skip pathing), and point currency —
   *  everything else (grants, choices, recalc, saves) is identical. Realms
   *  render one at a time, so coordinate spaces are per-realm. */
  realm?: string;
  /** GRAFT: a bindable support-gem payload this node grants while allocated
   *  (choice OPTIONS may carry their own) — socketed onto ONE learned skill
   *  through the skill book, riding hostSockets beside its real gems. */
  graft?: GraftSpec;
  /** Set on VOCATION mini-tree nodes (the owning VocationDef id). These render
   *  and allocate ONLY for a character who has EARNED that vocation, and they
   *  spend vocation points — see world.allocateNode / panels.refreshTree. */
  vocation?: string;
}

const nodes: PassiveNode[] = [
  // --- THE NINE-POINTED STAR: one start per attribute (Vitality deliberately
  // has no point — it is ubiquitous, not an identity). 40° spacing, r=85 from
  // the hub at (500,500); each triad's three points sit adjacent (STR family
  // bottom, INT family left, DEX family top-right). Classes reference these
  // via ClassDef.startNode; any class may path through any point.
  { id: "str_start", name: "Way of Strength", description: "A starting point of the nine-pointed star. Any class may path through it.", kind: "start", x: 3000, y: 3510, attributes: { strength: 3 }, links: [] },
  { id: "war_s1", name: "Sword Mastery", description: "10% increased melee damage", kind: "small", x: 3186, y: 3756, mods: [mod("damage", "increased", 0.1, ["melee"])], links: ["str_start"] },
  { id: "war_s2", name: "Toughness", description: "+20 maximum life", kind: "small", x: 2814, y: 3756, mods: [mod("life", "flat", 20)], links: ["war_s3", "str_start", "for_start"] },
  { id: "war_n1", name: "Crushing Blows", description: "25% increased melee damage, +10% ailment chance with melee skills", kind: "notable", x: 3474, y: 4068, mods: [mod("damage", "increased", 0.25, ["melee"]), mod("statusChance", "flat", 0.1, ["melee"])], links: ["war_s1", "war_s4"] },
  { id: "war_s3", name: "Plated Armor", description: "+35 armor, 4% chance to block", kind: "small", x: 2526, y: 4068, mods: [mod("armor", "flat", 35), mod("blockChance", "flat", 0.04)], links: [] },
  { id: "war_s4", name: "Sword Expertise", description: "12% increased melee damage, adds 3 physical damage to melee skills", kind: "small", x: 3240, y: 4230, mods: [mod("damage", "increased", 0.12, ["melee"]), mod("addedPhysical", "flat", 3, ["melee"])], links: [] },
  { id: "war_n2", name: "Juggernaut", description: "+50 armor, 8% less damage taken, 8% block chance, 30% increased guard strength", kind: "notable", x: 2352, y: 4734, mods: [mod("armor", "flat", 50), mod("damageTaken", "more", -0.08), mod("blockChance", "flat", 0.08), mod("guardStrength", "increased", 0.3)], links: ["war_s3"] },
  { id: "war_key", name: "Unstoppable", description: "KEYSTONE: 25% less damage taken, but 20% less damage dealt", kind: "keystone", x: 3450, y: 4512, mods: [mod("damageTaken", "more", -0.25), mod("damage", "more", -0.2)], links: ["war_s4"] },
  { id: "prw_start", name: "Way of Prowess", description: "A starting point of the nine-pointed star. Any class may path through it.", kind: "start", x: 3330, y: 3390, attributes: { prowess: 3 }, links: [] },
  { id: "brz_s1", name: "Ferocity", description: "10% increased attack damage", kind: "small", x: 3750, y: 3216, mods: [mod("damage", "increased", 0.1, ["attack"])], links: ["prw_start"] },
  { id: "brz_s2", name: "Quick Slashes", description: "8% increased attack speed", kind: "small", x: 3564, y: 3540, mods: [mod("attackSpeed", "increased", 0.08, ["attack"])], links: ["brz_s3", "prw_start"] },
  { id: "brz_n1", name: "Bloodlust", description: "20% increased attack damage, 1% of damage leeched as life", kind: "notable", x: 4128, y: 3378, mods: [mod("damage", "increased", 0.2, ["attack"]), mod("lifeLeech", "flat", 0.01)], links: ["brz_s1", "brz_s4", "cl_phys_c"] },
  { id: "brz_s3", name: "Adrenaline", description: "8% increased attack speed", kind: "small", x: 3690, y: 3948, mods: [mod("attackSpeed", "increased", 0.08, ["attack"])], links: [] },
  { id: "brz_s4", name: "Carnage", description: "12% increased attack damage", kind: "small", x: 4536, y: 3468, mods: [mod("damage", "increased", 0.12, ["attack"])], links: [] },
  { id: "brz_n2", name: "Frenzied Assault", description: "12% increased attack speed, 10% increased damage", kind: "notable", x: 4044, y: 4056, mods: [mod("attackSpeed", "increased", 0.12, ["attack"]), mod("damage", "increased", 0.1)], links: ["brz_s3"] },
  { id: "brz_key", name: "Reckless Abandon", description: "KEYSTONE: 30% more damage, but 25% more damage taken", kind: "keystone", x: 5640, y: 4488, mods: [mod("damage", "more", 0.3), mod("damageTaken", "more", 0.25)], links: ["brz_s4"] },
  { id: "int_start", name: "Way of Intelligence", description: "A starting point of the nine-pointed star. Any class may path through it.", kind: "start", x: 2496, y: 3090, attributes: { intelligence: 3 }, links: [] },
  { id: "sor_s1", name: "Arcane Insight", description: "12% increased spell damage", kind: "small", x: 2436, y: 3540, mods: [mod("damage", "increased", 0.12, ["spell"])], links: ["int_start", "for_start"] },
  { id: "sor_s2", name: "Deep Reserves", description: "+20 maximum mana", kind: "small", x: 2244, y: 3216, mods: [mod("mana", "flat", 20)], links: ["int_start"] },
  { id: "sor_n1", name: "Spellweaver", description: "20% increased spell damage, +10% ailment chance with spells", kind: "notable", x: 1608, y: 4350, mods: [mod("damage", "increased", 0.2, ["spell"]), mod("statusChance", "flat", 0.1, ["spell"])], links: [] },
  { id: "sor_s3", name: "Mental Acuity", description: "+15 mana, +1 mana regeneration per second", kind: "small", x: 1584, y: 3336, mods: [mod("mana", "flat", 15), mod("manaRegen", "flat", 1)], links: [] },
  { id: "sor_s4", name: "Focused Mind", description: "12% increased spell damage, +3% spell critical strike chance", kind: "small", x: 444, y: 4266, mods: [mod("damage", "increased", 0.12, ["spell"]), mod("critChance", "flat", 0.03, ["spell"])], links: [] },
  { id: "sor_n2", name: "Archmage", description: "25% increased spell damage, 10% increased cast speed", kind: "notable", x: 1038, y: 5076, mods: [mod("damage", "increased", 0.25, ["spell"]), mod("castSpeed", "increased", 0.1)], links: ["sor_x1"] },
  { id: "sor_key", name: "Glass Cannon", description: "KEYSTONE: 40% more damage, but 30% more damage taken", kind: "keystone", x: 222, y: 4536, mods: [mod("damage", "more", 0.4), mod("damageTaken", "more", 0.3)], links: ["sor_s4"] },
  { id: "wis_start", name: "Way of Wisdom", description: "A starting point of the nine-pointed star. Any class may path through it.", kind: "start", x: 2556, y: 2748, attributes: { wisdom: 3 }, links: [] },
  { id: "sum_s1", name: "Minion Fury", description: "15% increased minion damage", kind: "small", x: 2250, y: 2784, mods: [mod("minionDamage", "increased", 0.15)], links: ["wis_start"] },
  { id: "sum_s2", name: "Minion Vigor", description: "15% increased minion life", kind: "small", x: 2436, y: 2460, mods: [mod("minionLife", "increased", 0.15)], links: ["wis_start", "wil_start"] },
  { id: "sum_n1", name: "Lord of Legions", description: "+1 maximum minion for all summon skills, 10% increased minion damage", kind: "notable", x: 852, y: 2466, mods: [mod("minionMaxCount", "flat", 1), mod("minionDamage", "increased", 0.1)], links: ["sum_x1"] },
  { id: "sum_s3", name: "Skill Effect Duration", description: "8% increased skill effect duration", kind: "small", x: 2634, y: 1878, mods: [mod("effectDuration", "increased", 0.08)], links: [] },
  { id: "sum_s4", name: "Dark Pact", description: "12% increased chaos damage", kind: "small", x: 2934, y: 1200, mods: [mod("damage", "increased", 0.12, ["chaos"])], links: [] },
  { id: "sum_n2", name: "Plaguebearer", description: "22% increased chaos damage, +15% ailment chance", kind: "notable", x: 2760, y: 1362, mods: [mod("damage", "increased", 0.22, ["chaos"]), mod("statusChance", "flat", 0.15)], links: ["sum_s4"] },
  { id: "sum_key", name: "Necromantic Pact", description: "KEYSTONE: +2 maximum minions, but 25% less maximum life", kind: "keystone", x: 1368, y: 1776, mods: [mod("minionMaxCount", "flat", 2), mod("life", "more", -0.25)], links: [] },
  { id: "fin_start", name: "Way of Finesse", description: "A starting point of the nine-pointed star. Any class may path through it.", kind: "start", x: 3174, y: 2520, attributes: { finesse: 3 }, links: [] },
  { id: "swb_s1", name: "Evasion", description: "15% increased evasion", kind: "small", x: 2814, y: 2232, mods: [mod("evasion", "increased", 0.15)], links: ["fin_start", "wil_start"] },
  { id: "swb_s2", name: "Fleet Foot", description: "6% increased movement speed", kind: "small", x: 3186, y: 2244, mods: [mod("moveSpeed", "increased", 0.06)], links: ["swb_s3", "fin_start"] },
  { id: "swb_n1", name: "Wind Dancer", description: "30% increased evasion", kind: "notable", x: 3054, y: 186, mods: [mod("evasion", "increased", 0.3)], links: [] },
  { id: "swb_s3", name: "Keen Eye", description: "+3% critical strike chance", kind: "small", x: 3276, y: 1962, mods: [mod("critChance", "flat", 0.03)], links: [] },
  { id: "swb_s4", name: "Critical Strike Multiplier", description: "+15% critical strike multiplier", kind: "small", x: 4728, y: 870, mods: [mod("critMulti", "flat", 0.15)], links: [] },
  { id: "swb_n2", name: "Opportunist", description: "+6% critical strike chance, +25% critical strike multiplier", kind: "notable", x: 4554, y: 1158, mods: [mod("critChance", "flat", 0.06), mod("critMulti", "flat", 0.25)], links: ["swb_s4"] },
  { id: "swb_key", name: "Phantom Step", description: "KEYSTONE: 80% more evasion, but 15% less maximum life", kind: "keystone", x: 2760, y: 30, mods: [mod("evasion", "more", 0.8), mod("life", "more", -0.15)], links: ["swb_n1"] },
  // THE IRONTURN LANE (STAT_TRADES): the dodger's training re-poured as
  // plate. Both sides are DIAL STATS (evasionForgone / evasionToArmor), so
  // the rate can be raised and the renunciation eased by later content.
  { id: "ironturn", name: "Ironturn", description: "KEYSTONE: renounce all evasion; 60% of it is read again as armor", kind: "keystone", x: 3312, y: 240, mods: [mod("evasionForgone", "flat", 1), mod("evasionToArmor", "flat", 0.6)], links: ["swb_n1"] },
  { id: "dex_start", name: "Way of Dexterity", description: "A starting point of the nine-pointed star. Any class may path through it.", kind: "start", x: 3444, y: 2748, attributes: { dexterity: 3 }, links: [] },
  { id: "rng_s1", name: "Steady Aim", description: "12% increased projectile damage", kind: "small", x: 3564, y: 2460, mods: [mod("damage", "increased", 0.12, ["projectile"])], links: ["dex_start"] },
  { id: "rng_s2", name: "Eagle Eye", description: "+40 accuracy", kind: "small", x: 3750, y: 2784, mods: [mod("accuracy", "flat", 40)], links: ["rng_s3", "dex_start", "cha_start"] },
  { id: "rng_n1", name: "Sniper", description: "20% increased projectile damage and speed", kind: "notable", x: 4080, y: 2118, mods: [mod("damage", "increased", 0.2, ["projectile"]), mod("projectileSpeed", "increased", 0.2)], links: ["rng_s1", "rng_s4"] },
  { id: "rng_s3", name: "Swift Draw", description: "8% increased attack speed", kind: "small", x: 4164, y: 2880, mods: [mod("attackSpeed", "increased", 0.08, ["attack"])], links: [] },
  { id: "rng_s4", name: "Barbed Tips", description: "Adds 3 physical damage to projectile skills", kind: "small", x: 4272, y: 1746, mods: [mod("addedPhysical", "flat", 3, ["projectile"])], links: [] },
  { id: "rng_n2", name: "Impaler", description: "Projectiles pierce +1 target, 15% increased projectile damage", kind: "notable", x: 4530, y: 2712, mods: [mod("pierceCount", "flat", 1), mod("damage", "increased", 0.15, ["projectile"])], links: ["rng_s3"] },
  { id: "rng_key", name: "Arrowstorm", description: "KEYSTONE: +1 projectile with all skills, but 20% less damage", kind: "keystone", x: 5448, y: 954, mods: [mod("projectileCount", "flat", 1), mod("damage", "more", -0.2)], links: [] },
  { id: "sum_x1", name: "Martyrdom", description: "Minions explode on death, dealing 30% of their maximum life as fire damage", kind: "keystone", x: 666, y: 2832, mods: [mod("minionExplodeDeath", "flat", 0.3)], links: [] },
  { id: "sum_x2", name: "Endless Swarm", description: "You may summon 25% more minions, but they are 25% smaller and deal 15% less damage", kind: "keystone", x: 1620, y: 1410, mods: [mod("minionMaxCount", "more", 0.25), mod("minionSize", "increased", -0.25), mod("minionDamage", "increased", -0.15)], links: [] },
  { id: "sor_x1", name: "Thunderstruck", description: "Spell hits have 15% chance to call Thunderstruck — an echoing burst at 50% damage", kind: "notable", x: 1356, y: 5196, mods: [mod("proc_thunderstruck", "flat", 0.15, ["spell"])], links: [] },
  // THE GAMBLER'S RUN — the high-roller chain locked behind Thunderstruck:
  // fortune, a proc RIDER (Static Shrapnel extends the proc the parent
  // notable granted), a rollTop proc, and the wide-dice keystone.
  { id: "cl_gam_s1", name: "Storm Fortune", description: "10% increased Luck with spells (proc and rider rates)", kind: "small", x: 1290, y: 5290, mods: [mod("luck", "flat", 0.1, ["spell"])], links: ["sor_x1"] },
  { id: "cl_gam_shrapnel", name: "Static Shrapnel", description: "Thunderstruck sheds 1–4 live sparks from the strike (75% chance); 10% increased lightning damage", kind: "notable", x: 1180, y: 5380, mods: [mod("procRider_static_shrapnel", "flat", 0.75, ["spell"]), mod("damage", "increased", 0.1, ["lightning"])], links: ["cl_gam_s1"] },
  { id: "cl_gam_short", name: "Short Circuit", description: "Lightning hits whose damage rolls land in the top 15% of their dice DETONATE — an echoing burst at 60% damage", kind: "notable", x: 1400, y: 5390, mods: [mod("proc_short_circuit", "flat", 1, ["lightning"])], links: ["cl_gam_s1"] },
  { id: "cl_gam_key", name: "All In", description: "KEYSTONE: your damage dice widen by 50% (same average, fatter tails); 20% of uses roll twice and keep the higher; your high-roll windows widen by 5%", kind: "keystone", x: 1290, y: 5520, mods: [mod("damageSpread", "flat", 0.5), mod("luckyChance", "flat", 0.2), mod("highRollWindow", "flat", 0.05)], links: ["cl_gam_shrapnel", "cl_gam_short"] },
  { id: "sor_es1", name: "Crystal Skin", description: "+25 maximum energy shield", kind: "small", x: 2094, y: 3510, mods: [mod("energyShield", "flat", 25)], links: ["sor_s2"] },
  { id: "sor_es2", name: "Arcane Bulwark", description: "8% of incoming damage is paid from mana before life; +15 maximum mana", kind: "notable", x: 1182, y: 3930, mods: [mod("manaShield", "flat", 0.08), mod("mana", "flat", 15)], links: [] },
  { id: "sor_es3", name: "Thought Siphon", description: "Mana costs can be paid from energy shield when mana runs dry; +20 maximum energy shield", kind: "notable", x: 2202, y: 3798, mods: [mod("esToMana", "flat", 1), mod("energyShield", "flat", 20)], links: [] },
  { id: "sum_es1", name: "Soul Battery", description: "KEYSTONE-GRADE TRADE: 100% of life regeneration feeds your energy shield instead — trickling through the recharge delay and compounding once it starts. +30 maximum energy shield", kind: "keystone", x: 1728, y: 150, mods: [mod("lifeRegenToEs", "flat", 1), mod("energyShield", "flat", 30)], links: [] },
  { id: "attr_str", name: "Might", description: "+10 Strength", kind: "attr", x: 3450, y: 3780, attributes: { strength: 10 }, links: ["brz_s2", "node_68", "war_s1"] },
  { id: "attr_int", name: "Intellect", description: "+10 Intelligence", kind: "attr", x: 2550, y: 3780, attributes: { intelligence: 10 }, links: ["node_57", "sor_s1", "war_s2"] },
  { id: "attr_wil", name: "Resolve", description: "+10 Willpower", kind: "attr", x: 2100, y: 3000, attributes: { willpower: 10 }, links: ["node_43", "sor_s2", "sum_s1"] },
  { id: "attr_vit", name: "Vigor", description: "+10 Vitality", kind: "attr", x: 2550, y: 2220, attributes: { vitality: 10 }, links: ["node_18", "sum_s2", "swb_s1"] },
  { id: "attr_dex", name: "Grace", description: "+10 Dexterity", kind: "attr", x: 3450, y: 2220, attributes: { dexterity: 10 }, links: ["node_16", "rng_s1", "swb_s2"] },
  { id: "attr_all", name: "Harmony", description: "+4 to all attributes", kind: "attr", x: 3900, y: 3000, attributes: { strength: 4, prowess: 4, fortitude: 4, dexterity: 4, finesse: 4, charisma: 4, intelligence: 4, wisdom: 4, willpower: 4, vitality: 4 }, links: ["brz_s1", "cl_acc_c", "cl_attr_c", "rng_s2", "cha_start"] },
  { id: "cl_phys_c", name: "Brutality", description: "30% increased physical damage; adds 10 physical damage to attacks", kind: "notable", x: 4380, y: 4326, mods: [mod("damage", "increased", 0.3, ["physical"]), mod("addedPhysical", "flat", 10, ["attack"])], links: ["cl_phys_p0", "cl_phys_p1", "cl_phys_p2", "cl_phys_p3"] },
  { id: "cl_phys_p0", name: "Hard Knocks", description: "Adds 8 physical damage to attacks", kind: "small", x: 4704, y: 4224, mods: [mod("addedPhysical", "flat", 8, ["attack"])], links: [] },
  { id: "cl_phys_p1", name: "Bludgeon", description: "12% increased attack damage", kind: "small", x: 4140, y: 4500, mods: [mod("damage", "increased", 0.12, ["attack"])], links: [] },
  { id: "cl_phys_p2", name: "Brutal Edge", description: "+15% ailment chance with physical attacks", kind: "small", x: 4668, y: 4476, mods: [mod("statusChance", "flat", 0.15, ["physical", "attack"])], links: [] },
  { id: "cl_phys_p3", name: "Precision", description: "+15 accuracy rating", kind: "small", x: 4386, y: 4626, mods: [mod("accuracy", "flat", 15)], links: [] },
  { id: "cl_armor_c", name: "Bulwark", description: "+80 armor; 2% less damage taken", kind: "notable", x: 2880, y: 4554, mods: [mod("armor", "flat", 80), mod("damageTaken", "more", -0.02)], links: ["cl_armor_p0", "cl_armor_p1", "cl_armor_p2", "cl_armor_p3", "war_s3"] },
  { id: "cl_armor_p0", name: "Plating", description: "+50 armor", kind: "small", x: 3120, y: 4704, mods: [mod("armor", "flat", 50)], links: [] },
  { id: "cl_armor_p1", name: "Iron Hide", description: "+40 armor", kind: "small", x: 2586, y: 4824, mods: [mod("armor", "flat", 40)], links: [] },
  { id: "cl_armor_p2", name: "Hardened", description: "+30 armor, +10 maximum life", kind: "small", x: 3102, y: 4968, mods: [mod("armor", "flat", 30), mod("life", "flat", 10)], links: [] },
  { id: "cl_armor_p3", name: "Resilience", description: "+15 maximum life", kind: "small", x: 2850, y: 4962, mods: [mod("life", "flat", 15)], links: [] },
  { id: "cl_block_c", name: "Aegis", description: "+12% block chance, +15 armor", kind: "notable", x: 2442, y: 5028, mods: [mod("blockChance", "flat", 0.12), mod("armor", "flat", 15)], links: ["cl_block_p0", "cl_block_p1", "cl_block_p2", "cl_block_p3", "war_n2"] },
  { id: "cl_block_p0", name: "Parry", description: "+7% block chance", kind: "small", x: 2742, y: 5124, mods: [mod("blockChance", "flat", 0.07)], links: [] },
  { id: "cl_block_p1", name: "Bracing", description: "+6% block chance, +10 armor", kind: "small", x: 2136, y: 4992, mods: [mod("blockChance", "flat", 0.06), mod("armor", "flat", 10)], links: [] },
  { id: "cl_block_p2", name: "Riposte", description: "+5% critical strike multiplier", kind: "small", x: 2532, y: 5286, mods: [mod("critMulti", "flat", 0.05)], links: [] },
  { id: "cl_block_p3", name: "Guard Up", description: "+20 armor", kind: "small", x: 2214, y: 5184, mods: [mod("armor", "flat", 20)], links: [] },
  { id: "cl_spell_c", name: "Arcane Mastery", description: "35% increased spell damage, +20 maximum mana", kind: "notable", x: 1500, y: 4698, mods: [mod("damage", "increased", 0.35, ["spell"]), mod("mana", "flat", 20)], links: ["cl_spell_p1"] },
  { id: "cl_spell_p0", name: "Quickening", description: "8% increased cast speed", kind: "small", x: 1758, y: 4950, mods: [mod("castSpeed", "increased", 0.08)], links: ["cl_spell_p1", "node_59"] },
  { id: "cl_spell_p1", name: "Spell Echo", description: "15% increased spell damage", kind: "small", x: 1752, y: 4686, mods: [mod("damage", "increased", 0.15, ["spell"])], links: [] },
  { id: "cl_spell_p2", name: "Reserves", description: "+20 maximum mana", kind: "small", x: 1026, y: 4122, mods: [mod("mana", "flat", 20)], links: ["node_64", "sor_es2"] },
  { id: "cl_spell_p3", name: "Spell Critical Chance", description: "+6% spell critical strike chance", kind: "small", x: 2052, y: 4458, mods: [mod("critChance", "flat", 0.06, ["spell"])], links: ["node_58", "node_66"] },
  { id: "cl_fireres_c", name: "Fireproof", description: "+15% fire resistance, +15 maximum life", kind: "notable", x: 1824, y: 1938, mods: [mod("fireRes", "flat", 0.15), mod("life", "flat", 15)], links: ["cl_fireres_p0", "cl_fireres_p2"] },
  { id: "cl_fireres_p0", name: "Cinder Ward", description: "+5% fire resistance", kind: "small", x: 2058, y: 2088, mods: [mod("fireRes", "flat", 0.05)], links: ["cl_fireres_p1"] },
  { id: "cl_fireres_p1", name: "Ash Guard", description: "+4% fire resistance", kind: "small", x: 2256, y: 2058, mods: [mod("fireRes", "flat", 0.04)], links: ["node_18"] },
  { id: "cl_fireres_p2", name: "Warm Blood", description: "+0.2 mana regeneration per second", kind: "small", x: 2130, y: 1860, mods: [mod("manaRegen", "flat", 0.2)], links: ["node_18"] },
  { id: "cl_fireres_p3", name: "Frostward", description: "+8% cold resistance", kind: "small", x: 3120, y: 1338, mods: [mod("coldRes", "flat", 0.08)], links: ["node_12"] },
  { id: "cl_minion_c", name: "Master of Legions", description: "20% increased minion damage, +1 maximum minion", kind: "notable", x: 1188, y: 2046, mods: [mod("minionDamage", "increased", 0.2), mod("minionMaxCount", "flat", 1)], links: ["node_50", "sum_key"] },
  { id: "cl_minion_p0", name: "Pack Tactics", description: "6% increased minion damage", kind: "small", x: 1632, y: 2718, mods: [mod("minionDamage", "increased", 0.06)], links: ["node_43", "node_52", "node_53"] },
  { id: "cl_minion_p1", name: "Minion Life", description: "15% increased minion life", kind: "small", x: 1848, y: 2304, mods: [mod("minionLife", "increased", 0.15)], links: ["node_54", "node_55"] },
  { id: "cl_minion_p2", name: "Swift Servants", description: "10% increased minion movement speed", kind: "small", x: 1200, y: 1404, mods: [mod("minionMoveSpeed", "increased", 0.1)], links: ["cl_minion_p3"] },
  { id: "cl_minion_p3", name: "Towering Thralls", description: "8% increased minion size", kind: "small", x: 1368, y: 1284, mods: [mod("minionSize", "increased", 0.08)], links: ["sum_x2"] },
  { id: "cl_coldres_c", name: "Frostproof", description: "+35% cold resistance, 2% increased attack and cast speed", kind: "notable", x: 5238, y: 426, mods: [mod("coldRes", "flat", 0.35), mod("attackSpeed", "increased", 0.02, ["attack"]), mod("castSpeed", "increased", 0.02)], links: ["cl_coldres_p1", "cl_coldres_p2"] },
  { id: "cl_coldres_p0", name: "Rime Ward", description: "+18% cold resistance", kind: "small", x: 5088, y: 978, mods: [mod("coldRes", "flat", 0.18)], links: ["cl_coldres_p2", "swb_s4"] },
  { id: "cl_coldres_p1", name: "Glacial Skin", description: "+15% cold resistance", kind: "small", x: 4902, y: 558, mods: [mod("coldRes", "flat", 0.15)], links: ["cl_coldres_p3"] },
  { id: "cl_coldres_p2", name: "Keen Sight", description: "+40 accuracy rating", kind: "small", x: 5064, y: 726, mods: [mod("accuracy", "flat", 40)], links: [] },
  { id: "cl_coldres_p3", name: "Sidestep", description: "+15 evasion rating", kind: "small", x: 4608, y: 546, mods: [mod("evasion", "flat", 15)], links: ["swb_s4"] },
  { id: "cl_lightres_c", name: "Stormproof", description: "+35% lightning resistance, 6% increased attack speed", kind: "notable", x: 4548, y: 2160, mods: [mod("lightningRes", "flat", 0.35), mod("attackSpeed", "increased", 0.06, ["attack"])], links: ["cl_lightres_p2", "cl_lightres_p3"] },
  { id: "cl_lightres_p0", name: "Surge Ward", description: "+18% lightning resistance", kind: "small", x: 4578, y: 1872, mods: [mod("lightningRes", "flat", 0.18)], links: ["cl_lightres_p2", "rng_n1"] },
  { id: "cl_lightres_p1", name: "Static Skin", description: "+15% lightning resistance", kind: "small", x: 4242, y: 2460, mods: [mod("lightningRes", "flat", 0.15)], links: ["cl_lightres_p3", "rng_n1"] },
  { id: "cl_lightres_p2", name: "Marksman", description: "+50 accuracy rating", kind: "small", x: 4806, y: 2046, mods: [mod("accuracy", "flat", 50)], links: ["cl_proj_p0"] },
  { id: "cl_lightres_p3", name: "Deadeye", description: "+2% critical strike chance", kind: "small", x: 4578, y: 2454, mods: [mod("critChance", "flat", 0.02)], links: ["cl_proj_p1"] },
  { id: "cl_acc_c", name: "Perfect Aim", description: "+60 accuracy rating, 4% increased projectile damage", kind: "notable", x: 4662, y: 3036, mods: [mod("accuracy", "flat", 60), mod("damage", "increased", 0.04, ["projectile"])], links: ["cl_acc_p0", "cl_acc_p1", "cl_acc_p2", "cl_acc_p3"] },
  { id: "cl_acc_p0", name: "Steady Hand", description: "+40 accuracy rating", kind: "small", x: 4926, y: 2766, mods: [mod("accuracy", "flat", 40)], links: [] },
  { id: "cl_acc_p1", name: "Focus", description: "+35 accuracy rating", kind: "small", x: 4950, y: 3318, mods: [mod("accuracy", "flat", 35)], links: [] },
  { id: "cl_acc_p2", name: "Pinpoint", description: "+2% critical strike chance", kind: "small", x: 5076, y: 2982, mods: [mod("critChance", "flat", 0.02)], links: [] },
  { id: "cl_acc_p3", name: "Lithe", description: "+10 evasion rating", kind: "small", x: 5172, y: 3240, mods: [mod("evasion", "flat", 10)], links: [] },
  { id: "cl_melee_c", name: "Weapon Master", description: "25% increased melee damage, 8% increased melee attack speed", kind: "notable", x: 3768, y: 4632, mods: [mod("damage", "increased", 0.25, ["melee"]), mod("attackSpeed", "increased", 0.08, ["melee"])], links: ["cl_melee_p0", "cl_melee_p1", "cl_melee_p2", "cl_melee_p3", "war_n1"] },
  { id: "cl_melee_p0", name: "Swift Strikes", description: "10% increased melee attack speed", kind: "small", x: 4032, y: 4920, mods: [mod("attackSpeed", "increased", 0.1, ["melee"])], links: [] },
  { id: "cl_melee_p1", name: "Cleave", description: "12% increased melee damage", kind: "small", x: 3474, y: 4746, mods: [mod("damage", "increased", 0.12, ["melee"])], links: [] },
  { id: "cl_melee_p2", name: "Savagery", description: "+5% melee critical strike chance", kind: "small", x: 3852, y: 4980, mods: [mod("critChance", "flat", 0.05, ["melee"])], links: [] },
  { id: "cl_melee_p3", name: "Overpower", description: "+10% melee critical strike multiplier", kind: "small", x: 3636, y: 4878, mods: [mod("critMulti", "flat", 0.1, ["melee"])], links: [] },
  { id: "cl_lreg_c", name: "Lifeblood", description: "+1.5 life regeneration/s, +2% life regeneration, +30 maximum life", kind: "notable", x: 3336, y: 4884, mods: [mod("lifeRegen", "flat", 1.5), mod("lifeRegenPct", "flat", 0.02), mod("life", "flat", 30)], links: ["cl_lreg_p0", "cl_lreg_p1", "cl_lreg_p2", "cl_lreg_p3", "war_s2"] },
  { id: "cl_lreg_p0", name: "Recovery", description: "+0.8 life regeneration per second", kind: "small", x: 3570, y: 5046, mods: [mod("lifeRegen", "flat", 0.8)], links: [] },
  { id: "cl_lreg_p1", name: "Vitality", description: "+15 maximum life", kind: "small", x: 3138, y: 5148, mods: [mod("life", "flat", 15)], links: [] },
  { id: "cl_lreg_p2", name: "Hardy", description: "+25 maximum life", kind: "small", x: 3540, y: 5244, mods: [mod("life", "flat", 25)], links: [] },
  { id: "cl_lreg_p3", name: "Regrowth", description: "+1% life regeneration", kind: "small", x: 3336, y: 5214, mods: [mod("lifeRegenPct", "flat", 0.01)], links: [] },
  { id: "cl_es_c", name: "Crystalline Barrier", description: "+50 maximum energy shield, +8% energy shield recharge rate", kind: "notable", x: 1998, y: 4050, mods: [mod("energyShield", "flat", 50), mod("esRechargeRate", "flat", 0.08)], links: ["cl_es_p0", "cl_es_p1", "sor_es3"] },
  { id: "cl_es_p0", name: "Ward Battery", description: "+30 maximum energy shield", kind: "small", x: 2244, y: 4026, mods: [mod("energyShield", "flat", 30)], links: [] },
  { id: "cl_es_p1", name: "Insulation", description: "+25 maximum energy shield", kind: "small", x: 1902, y: 3756, mods: [mod("energyShield", "flat", 25)], links: ["cl_es_p2", "cl_es_p3", "sor_es1"] },
  { id: "cl_es_p2", name: "Quick Charge", description: "+10% energy shield recharge rate", kind: "small", x: 1770, y: 4008, mods: [mod("esRechargeRate", "flat", 0.1)], links: [] },
  { id: "cl_es_p3", name: "Stoic", description: "-0.2s energy shield recharge delay", kind: "small", x: 1662, y: 3822, mods: [mod("esRechargeDelay", "flat", -0.2)], links: [] },
  { id: "cl_mreg_c", name: "Mind Spring", description: "+1.2 mana regeneration/s, +2% mana regeneration, +25 maximum mana", kind: "notable", x: 1638, y: 3618, mods: [mod("manaRegen", "flat", 1.2), mod("manaRegenPct", "flat", 0.02), mod("mana", "flat", 25)], links: ["cl_mreg_p2", "cl_mreg_p3", "sor_s3"] },
  { id: "cl_mreg_p0", name: "Clarity", description: "+0.7 mana regeneration per second", kind: "small", x: 1368, y: 3246, mods: [mod("manaRegen", "flat", 0.7)], links: ["cl_mreg_p1", "node_43", "sor_s3"] },
  { id: "cl_mreg_p1", name: "Meditation", description: "+15 maximum mana", kind: "small", x: 1236, y: 3444, mods: [mod("mana", "flat", 15)], links: ["cl_mreg_p2"] },
  { id: "cl_mreg_p2", name: "Deep Well", description: "+20 maximum mana", kind: "small", x: 1398, y: 3612, mods: [mod("mana", "flat", 20)], links: [] },
  { id: "cl_mreg_p3", name: "Channeling", description: "+1% mana regeneration", kind: "small", x: 1794, y: 3372, mods: [mod("manaRegenPct", "flat", 0.01)], links: [] },
  { id: "cl_allres_c", name: "Elemental Adaptation", description: "+20% to fire, cold and lightning resistance, +25 maximum life", kind: "notable", x: 1002, y: 3492, mods: [mod("fireRes", "flat", 0.2), mod("coldRes", "flat", 0.2), mod("lightningRes", "flat", 0.2), mod("life", "flat", 25)], links: ["cl_allres_p2", "cl_allres_p3"] },
  { id: "cl_allres_p0", name: "Fire Attunement", description: "+8% fire resistance", kind: "small", x: 708, y: 3234, mods: [mod("fireRes", "flat", 0.08)], links: ["cl_allres_p1", "node_42"] },
  { id: "cl_allres_p1", name: "Cold Attunement", description: "+8% cold resistance", kind: "small", x: 576, y: 3432, mods: [mod("coldRes", "flat", 0.08)], links: ["cl_allres_p2"] },
  { id: "cl_allres_p2", name: "Storm Attunement", description: "+8% lightning resistance", kind: "small", x: 792, y: 3564, mods: [mod("lightningRes", "flat", 0.08)], links: [] },
  { id: "cl_allres_p3", name: "Chaos Ward", description: "+6% chaos resistance", kind: "small", x: 858, y: 3318, mods: [mod("chaosRes", "flat", 0.06)], links: [] },
  { id: "cl_chaosres_c", name: "Void Touched", description: "+10% chaos resistance, 10% increased minion damage", kind: "notable", x: 2442, y: 1026, mods: [mod("chaosRes", "flat", 0.1), mod("minionDamage", "increased", 0.1)], links: ["cl_chaosres_p1", "cl_chaosres_p3", "node_38", "node_39"] },
  { id: "cl_chaosres_p0", name: "Corruption Ward", description: "+6% chaos resistance", kind: "small", x: 2226, y: 1182, mods: [mod("chaosRes", "flat", 0.06)], links: ["cl_chaosres_p1", "node_19"] },
  { id: "cl_chaosres_p1", name: "Plague Skin", description: "+7% chaos resistance", kind: "small", x: 2226, y: 996, mods: [mod("chaosRes", "flat", 0.07)], links: [] },
  { id: "cl_chaosres_p2", name: "Withering", description: "5% increased minion damage", kind: "small", x: 2400, y: 1278, mods: [mod("minionDamage", "increased", 0.05)], links: ["node_19", "node_38"] },
  { id: "cl_chaosres_p3", name: "Defilement", description: "+10% chaos resistance", kind: "small", x: 2340, y: 858, mods: [mod("chaosRes", "flat", 0.1)], links: [] },
  { id: "cl_eva_c", name: "Shadow Dance", description: "20% increased evasion, 6% increased movement speed", kind: "notable", x: 4266, y: 336, mods: [mod("evasion", "increased", 0.2), mod("moveSpeed", "increased", 0.06)], links: ["cl_eva_p0", "cl_eva_p1"] },
  { id: "cl_eva_p0", name: "Evasion", description: "8% increased evasion", kind: "small", x: 4014, y: 390, mods: [mod("evasion", "increased", 0.08)], links: ["cl_eva_p2"] },
  { id: "cl_eva_p1", name: "Nimble Step", description: "2% increased movement speed, +10 evasion rating", kind: "small", x: 4440, y: 498, mods: [mod("moveSpeed", "increased", 0.02), mod("evasion", "flat", 10)], links: ["cl_eva_p3"] },
  { id: "cl_eva_p2", name: "Sprint", description: "4% increased movement speed", kind: "small", x: 3948, y: 588, mods: [mod("moveSpeed", "increased", 0.04)], links: ["node_8"] },
  { id: "cl_eva_p3", name: "Evasion", description: "8% increased evasion", kind: "small", x: 4446, y: 732, mods: [mod("evasion", "increased", 0.08)], links: ["node_9"] },
  { id: "cl_proj_c", name: "Barrage", description: "20% increased projectile damage, +1 projectile", kind: "notable", x: 4818, y: 2364, mods: [mod("damage", "increased", 0.2, ["projectile"]), mod("projectileCount", "flat", 1)], links: ["cl_proj_p2", "cl_proj_p3"] },
  { id: "cl_proj_p0", name: "Extra Arrow", description: "+1 projectile", kind: "small", x: 5064, y: 2154, mods: [mod("projectileCount", "flat", 1)], links: ["cl_proj_p2"] },
  { id: "cl_proj_p1", name: "Piercing Shots", description: "Projectiles pierce +1 target, 8% increased projectile speed", kind: "small", x: 4794, y: 2604, mods: [mod("pierceCount", "flat", 1), mod("projectileSpeed", "increased", 0.08)], links: ["cl_proj_p3"] },
  { id: "cl_proj_p2", name: "Fletching", description: "12% increased projectile speed", kind: "small", x: 5220, y: 2364, mods: [mod("projectileSpeed", "increased", 0.12)], links: ["rng_pc1"] },
  { id: "cl_proj_p3", name: "Volley Fire", description: "10% increased projectile damage", kind: "small", x: 5160, y: 2592, mods: [mod("damage", "increased", 0.1, ["projectile"])], links: ["rng_pc1"] },
  { id: "cl_attr_c", name: "Versatility", description: "+5 to all attributes", kind: "notable", x: 5370, y: 3648, attributes: { strength: 5, prowess: 5, fortitude: 5, dexterity: 5, finesse: 5, charisma: 5, intelligence: 5, wisdom: 5, willpower: 5, vitality: 5 }, links: ["cl_attr_p0", "cl_attr_p1", "cl_attr_p2", "cl_attr_p3"] },
  { id: "cl_attr_p0", name: "Brawn", description: "+5 Strength", kind: "small", x: 5628, y: 3276, attributes: { strength: 5 }, links: [] },
  { id: "cl_attr_p1", name: "Agility", description: "+5 Dexterity", kind: "small", x: 5412, y: 4074, attributes: { dexterity: 5 }, links: [] },
  { id: "cl_attr_p2", name: "Intellect", description: "+5 Intelligence", kind: "small", x: 5802, y: 3492, attributes: { intelligence: 5 }, links: [] },
  { id: "cl_attr_p3", name: "Endurance", description: "+5 Vitality", kind: "small", x: 5670, y: 3972, attributes: { vitality: 5 }, links: [] },
  { id: "rng_pc1", name: "Multiplicity", description: "15% chance to fire an additional projectile with attack skills", kind: "small", x: 5442, y: 2532, mods: [mod("projectileCountChance", "flat", 0.15, ["attack"])], links: [] },
  { id: "rng_pc2", name: "Volley", description: "25% chance to fire an additional projectile; 15% increased projectile speed", kind: "notable", x: 3960, y: 2574, mods: [mod("projectileCountChance", "flat", 0.25), mod("projectileSpeed", "increased", 0.15)], links: ["rng_s3"] },
  { id: "war_kb1", name: "Repulsion", description: "+50 knockback strength on melee hits", kind: "small", x: 3108, y: 4044, mods: [mod("knockback", "flat", 50, ["melee"])], links: ["war_s1"] },
  { id: "war_kb2", name: "Shockwave", description: "+120 knockback strength on melee hits; 15% increased melee damage", kind: "notable", x: 2538, y: 4548, mods: [mod("knockback", "flat", 120, ["melee"]), mod("damage", "increased", 0.15, ["melee"])], links: ["war_s3"] },
  { id: "sor_df1", name: "Force Wave", description: "+80 push force on spell hits (enemies driven back)", kind: "small", x: 156, y: 3324, mods: [mod("displaceForce", "flat", 80, ["spell"])], links: ["sor_df2"] },
  { id: "sor_df2", name: "Vortex Master", description: "+180 push force on spell hits; 12% increased spell damage", kind: "notable", x: 132, y: 3618, mods: [mod("displaceForce", "flat", 180, ["spell"]), mod("damage", "increased", 0.12, ["spell"])], links: [] },
  { id: "sor_df3", name: "Gravity Well", description: "-100 pull force on spell hits (enemies drawn toward you)", kind: "notable", x: 108, y: 2964, mods: [mod("displaceForce", "flat", -100, ["spell"])], links: [] },
  { id: "brz_pd1", name: "Explosive Release", description: "8% chance on hit to trigger Displacement Field — shove nearby enemies away", kind: "notable", x: 4632, y: 4020, mods: [mod("proc_displacement_field", "flat", 0.08, ["attack"])], links: ["brz_s4"] },
  { id: "brz_pd2", name: "Magnetic Draw", description: "6% chance on hit to trigger Magnetic Pull — drag the struck enemy toward you", kind: "notable", x: 3816, y: 3660, mods: [mod("proc_magnetic_pull", "flat", 0.06, ["attack"])], links: ["brz_s2"] },
  { id: "node_1", name: "Evasion", description: "8% increased evasion", kind: "small", x: 2754, y: 330, mods: [mod("evasion", "increased", 0.08)], links: ["node_4", "swb_n1"] },
  { id: "node_2", name: "Dexterity", description: "", kind: "attr", x: 3066, y: 792, attributes: { dexterity: 2 }, links: ["node_23", "node_6"] },
  { id: "node_3", name: "Evasion", description: "8% increased evasion", kind: "small", x: 3312, y: 240, mods: [mod("evasion", "increased", 0.08)], links: ["node_5", "swb_n1"] },
  { id: "node_4", name: "Evasion", description: "8% increased evasion", kind: "small", x: 2730, y: 516, mods: [mod("evasion", "increased", 0.08)], links: [] },
  { id: "node_5", name: "Evasion", description: "8% increased evasion", kind: "small", x: 3384, y: 438, mods: [mod("evasion", "increased", 0.08)], links: [] },
  { id: "node_6", name: "Vitality", description: "", kind: "attr", x: 3582, y: 822, attributes: { vitality: 2 }, links: ["node_7"] },
  { id: "node_7", name: "Dexterity", description: "", kind: "attr", x: 4098, y: 1056, attributes: { dexterity: 2 }, links: ["node_8", "node_9"] },
  { id: "node_8", name: "Evasion", description: "8% increased evasion", kind: "small", x: 3894, y: 804, mods: [mod("evasion", "increased", 0.08)], links: [] },
  { id: "node_9", name: "Nimble Step", description: "2% increased movement speed, +10 evasion rating", kind: "small", x: 4398, y: 954, mods: [mod("moveSpeed", "increased", 0.02), mod("evasion", "flat", 10)], links: [] },
  { id: "node_10", name: "Evasion Rating", description: "+10 Evasion Rating, 2% increased evasion", kind: "small", x: 2856, y: 672, mods: [mod("evasion", "flat", 10), mod("evasion", "increased", 0.02)], links: ["node_2", "node_4"] },
  { id: "node_11", name: "Evasion Rating", description: "+10 Evasion Rating, 2% increased evasion", kind: "small", x: 3288, y: 654, mods: [mod("evasion", "flat", 10), mod("evasion", "increased", 0.02)], links: ["node_2", "node_5"] },
  { id: "node_12", name: "Frostproof", description: "+18% cold resistance", kind: "notable", x: 3348, y: 1386, mods: [mod("coldRes", "flat", 0.18)], links: ["node_13", "node_14"] },
  { id: "node_13", name: "Cold Resistance", description: "+5% cold resistance", kind: "small", x: 3618, y: 1272, mods: [mod("coldRes", "flat", 0.05)], links: ["node_15"] },
  { id: "node_14", name: "Cold Resistance", description: "+5% cold resistance", kind: "small", x: 3408, y: 1686, mods: [mod("coldRes", "flat", 0.05)], links: ["node_16"] },
  { id: "node_15", name: "Dexterity", description: "", kind: "attr", x: 3918, y: 1380, attributes: { dexterity: 2 }, links: ["node_16", "node_7"] },
  { id: "node_16", name: "Dexterity", description: "", kind: "attr", x: 3678, y: 1782, attributes: { dexterity: 2 }, links: [] },
  { id: "node_17", name: "Dexterity", description: "", kind: "attr", x: 4560, y: 1440, attributes: { dexterity: 2 }, links: ["node_7", "rng_key", "swb_n2"] },
  { id: "node_18", name: "Vitality", description: "", kind: "attr", x: 2322, y: 1758, attributes: { vitality: 2 }, links: ["node_19", "node_34", "sum_s3"] },
  { id: "node_19", name: "Vitality", description: "", kind: "attr", x: 2130, y: 1362, attributes: { vitality: 2 }, links: ["node_20"] },
  { id: "node_20", name: "Vitality", description: "", kind: "attr", x: 1890, y: 792, attributes: { vitality: 2 }, links: ["node_21", "node_23", "node_29", "node_45", "node_47"] },
  { id: "node_21", name: "Willpower", description: "", kind: "attr", x: 1116, y: 1146, attributes: { willpower: 2 }, links: ["node_22"] },
  { id: "node_22", name: "Vitality", description: "", kind: "attr", x: 696, y: 1710, attributes: { vitality: 2 }, links: ["node_40"] },
  { id: "node_23", name: "Vitality", description: "", kind: "attr", x: 2466, y: 732, attributes: { vitality: 2 }, links: [] },
  { id: "node_24", name: "Life Regeneration", description: "+10% increased life regeneration per second", kind: "small", x: 2016, y: 174, mods: [mod("lifeRegen", "increased", 0.1)], links: ["node_27", "sum_es1"] },
  { id: "node_25", name: "Energy Shield", description: "+10 maximum energy shield", kind: "small", x: 1488, y: 288, mods: [mod("energyShield", "flat", 10)], links: ["node_26", "sum_es1"] },
  { id: "node_26", name: "Energy Shield", description: "+5% increased energy shield", kind: "small", x: 1452, y: 516, mods: [mod("energyShield", "increased", 0.05)], links: ["node_30"] },
  { id: "node_27", name: "Life Regeneration", description: "+0.5 life regeneration per second", kind: "small", x: 2142, y: 342, mods: [mod("lifeRegen", "flat", 0.5)], links: ["node_31"] },
  { id: "node_28", name: "Life Regeneration and Energy Shield", description: "+2% increased energy shield, +0.2 life regeneration per second", kind: "small", x: 1800, y: 378, mods: [mod("lifeRegen", "flat", 0.2), mod("energyShield", "increased", 0.02)], links: ["node_29", "node_30", "node_31"] },
  { id: "node_29", name: "Willpower and Intelligence", description: "", kind: "small", x: 1872, y: 588, attributes: { intelligence: 3, willpower: 3 }, links: [] },
  { id: "node_30", name: "Energy Shield", description: "+10 maximum energy shield", kind: "small", x: 1656, y: 678, mods: [mod("energyShield", "flat", 10)], links: [] },
  { id: "node_31", name: "Life Regeneration", description: "+0.5 life regeneration per second", kind: "small", x: 2094, y: 576, mods: [mod("lifeRegen", "flat", 0.5)], links: [] },
  { id: "node_32", name: "Chaos Damage and Ailment Chance", description: "+8% increased chaos damage, +10% ailment chance", kind: "small", x: 2736, y: 1602, mods: [mod("damage", "increased", 0.08, ["chaos"]), mod("statusChance", "flat", 0.1)], links: ["node_34", "sum_n2"] },
  { id: "node_33", name: "Chaos Damage", description: "+10% increased chaos damage", kind: "small", x: 2508, y: 1380, mods: [mod("damage", "increased", 0.1, ["chaos"])], links: ["node_34", "sum_n2"] },
  { id: "node_34", name: "Chaos Damage", description: "+8% increased chaos damage", kind: "small", x: 2508, y: 1620, mods: [mod("damage", "increased", 0.08, ["chaos"])], links: [] },
  { id: "node_35", name: "Skill Effect Duration", description: "8% increased skill effect duration", kind: "small", x: 2790, y: 2016, mods: [mod("effectDuration", "increased", 0.08)], links: ["node_36", "sum_s3"] },
  { id: "node_36", name: "Skill Effect Duration", description: "8% increased skill effect duration", kind: "small", x: 3000, y: 1950, mods: [mod("effectDuration", "increased", 0.08)], links: ["node_37"] },
  { id: "node_37", name: "Lasting Bonds", description: "26% increased skill effect duration", kind: "notable", x: 2934, y: 1734, mods: [mod("effectDuration", "increased", 0.26)], links: [] },
  { id: "node_38", name: "Minion Damage", description: "8% increased minion damage", kind: "small", x: 2592, y: 1158, mods: [mod("minionDamage", "increased", 0.08)], links: [] },
  { id: "node_39", name: "Minion Damage", description: "+10% increased minion damage", kind: "small", x: 2628, y: 954, mods: [mod("minionDamage", "increased", 0.1)], links: [] },
  { id: "node_40", name: "Willpower", description: "", kind: "attr", x: 444, y: 2436, attributes: { willpower: 2 }, links: ["node_41"] },
  { id: "node_41", name: "Willpower", description: "", kind: "attr", x: 366, y: 3138, attributes: { willpower: 2 }, links: ["node_42", "node_60", "sor_df1", "sor_df3", "sum_x1"] },
  { id: "node_42", name: "Willpower", description: "", kind: "attr", x: 1008, y: 3096, attributes: { willpower: 2 }, links: ["node_43"] },
  { id: "node_43", name: "Willpower", description: "", kind: "attr", x: 1656, y: 3048, attributes: { willpower: 2 }, links: [] },
  { id: "node_44", name: "Minion Movement Speed", description: "+12% increased minion movement speed", kind: "small", x: 1620, y: 1158, mods: [mod("minionMoveSpeed", "increased", 0.12)], links: ["node_45", "sum_x2"] },
  { id: "node_45", name: "Minion Movement Speed", description: "+8% increased minion movement speed", kind: "small", x: 1758, y: 1044, mods: [mod("minionMoveSpeed", "increased", 0.08)], links: [] },
  { id: "node_46", name: "Minion Haste", description: "+8% increased minion haste", kind: "small", x: 1866, y: 1308, mods: [mod("minionHaste", "increased", 0.08)], links: ["node_47", "sum_x2"] },
  { id: "node_47", name: "Minion Haste", description: "+5% increased minion haste", kind: "small", x: 1926, y: 1152, mods: [mod("minionHaste", "increased", 0.05)], links: [] },
  { id: "node_48", name: "Minion Size", description: "+8% increased minion size", kind: "small", x: 690, y: 2262, mods: [mod("minionSize", "increased", 0.08)], links: ["node_49", "sum_n1"] },
  { id: "node_49", name: "Minion Size", description: "+15% increased minion size", kind: "small", x: 720, y: 2016, mods: [mod("minionSize", "increased", 0.15)], links: ["node_50"] },
  { id: "node_50", name: "Minion Size", description: "+8% increased minion size", kind: "small", x: 954, y: 1986, mods: [mod("minionSize", "increased", 0.08)], links: [] },
  { id: "node_51", name: "Minion Damage", description: "+8% increased minion damage", kind: "small", x: 1380, y: 2580, mods: [mod("minionDamage", "increased", 0.08)], links: ["node_52", "node_56"] },
  { id: "node_52", name: "Minion Damage", description: "+8% increased minion damage", kind: "small", x: 1410, y: 2874, mods: [mod("minionDamage", "increased", 0.08)], links: [] },
  { id: "node_53", name: "Minion Life", description: "+10% increased minion life", kind: "small", x: 1848, y: 2850, mods: [mod("minionLife", "increased", 0.1)], links: ["node_55"] },
  { id: "node_54", name: "Minion Damage and Minion Life", description: "+15% increased minion damage, +25% increased minion life", kind: "notable", x: 1620, y: 2472, mods: [mod("minionDamage", "increased", 0.15), mod("minionLife", "increased", 0.25)], links: ["node_56"] },
  { id: "node_55", name: "Minion Life", description: "+10% increased minion life", kind: "small", x: 1884, y: 2544, mods: [mod("minionLife", "increased", 0.1)], links: [] },
  { id: "node_56", name: "Minion Damage", description: "+12% increased minion damage", kind: "small", x: 1410, y: 2328, mods: [mod("minionDamage", "increased", 0.12)], links: [] },
  { id: "node_57", name: "Intelligence", description: "", kind: "attr", x: 2316, y: 4224, attributes: { intelligence: 2 }, links: ["node_58"] },
  { id: "node_58", name: "Intelligence", description: "", kind: "attr", x: 2046, y: 4734, attributes: { intelligence: 2 }, links: ["node_59", "node_67"] },
  { id: "node_59", name: "Intelligence", description: "", kind: "attr", x: 1848, y: 5244, attributes: { intelligence: 2 }, links: ["node_62", "node_73"] },
  { id: "node_60", name: "Intelligence", description: "", kind: "attr", x: 426, y: 3828, attributes: { intelligence: 2 }, links: ["node_61", "node_63"] },
  { id: "node_61", name: "Willpower", description: "", kind: "attr", x: 732, y: 4362, attributes: { willpower: 2 }, links: ["node_62", "sor_s4"] },
  { id: "node_62", name: "Intelligence", description: "", kind: "attr", x: 1326, y: 4932, attributes: { intelligence: 2 }, links: ["sor_n2"] },
  { id: "node_63", name: "Mana", description: "+15 maximum mana", kind: "small", x: 660, y: 3786, mods: [mod("mana", "flat", 15)], links: ["node_64"] },
  { id: "node_64", name: "Mana", description: "+15 maximum mana", kind: "small", x: 846, y: 3924, mods: [mod("mana", "flat", 15)], links: ["node_65"] },
  { id: "node_65", name: "Mana", description: "+25 maximum mana", kind: "small", x: 1008, y: 3732, mods: [mod("mana", "flat", 25)], links: [] },
  { id: "node_66", name: "Spell Critical Chance", description: "+7% spell critical strike chance", kind: "small", x: 1872, y: 4356, mods: [mod("critChance", "flat", 0.07, ["spell"])], links: ["sor_n1"] },
  { id: "node_67", name: "Spell Ailment Chance", description: "+8% ailment chance with spells", kind: "small", x: 1860, y: 4572, mods: [mod("statusChance", "flat", 0.08, ["spell"])], links: ["sor_n1"] },
  { id: "node_68", name: "Strength", description: "", kind: "attr", x: 3786, y: 4308, attributes: { strength: 2 }, links: ["node_69"] },
  { id: "node_69", name: "Strength", description: "", kind: "attr", x: 4026, y: 4716, attributes: { strength: 2 }, links: ["node_70"] },
  { id: "node_70", name: "Strength", description: "", kind: "attr", x: 4350, y: 5172, attributes: { strength: 2 }, links: ["node_71"] },
  { id: "node_71", name: "Strength", description: "", kind: "attr", x: 3882, y: 5412, attributes: { strength: 2 }, links: ["node_72"] },
  { id: "node_72", name: "Intelligence", description: "", kind: "attr", x: 3174, y: 5490, attributes: { intelligence: 2 }, links: ["node_73"] },
  { id: "node_73", name: "Strength", description: "", kind: "attr", x: 2508, y: 5466, attributes: { strength: 2 }, links: [] },
  // --- The three star points the six-wedge tree never had (Fortitude /
  // Willpower / Charisma) + their entry wedges. Each wedge introduces its
  // attribute's SIGNATURE pools (poise / energy shield & resistance /
  // insight) right at the doorstep, then hooks into the existing mesh.
  { id: "for_start", name: "Way of Fortitude", description: "A starting point of the nine-pointed star. Any class may path through it.", kind: "start", x: 2670, y: 3390, attributes: { fortitude: 3 }, links: [] },
  { id: "for_p0", name: "Stonefast", description: "+25 armor", kind: "small", x: 2328, y: 3780, mods: [mod("armor", "flat", 25)], links: ["for_start"] },
  { id: "for_p1", name: "Unbreakable", description: "+20 maximum poise", kind: "small", x: 2448, y: 3330, mods: [mod("poise", "flat", 20)], links: ["for_start"] },
  { id: "wil_start", name: "Way of Willpower", description: "A starting point of the nine-pointed star. Any class may path through it.", kind: "start", x: 2826, y: 2520, attributes: { willpower: 3 }, links: [] },
  { id: "wil_p0", name: "Warded Mind", description: "+12 maximum energy shield", kind: "small", x: 2430, y: 2010, mods: [mod("energyShield", "flat", 12)], links: ["wil_start"] },
  { id: "wil_p1", name: "Iron Will", description: "+5% to all resistances", kind: "small", x: 1980, y: 1620, mods: [mod("fireRes", "flat", 0.05), mod("coldRes", "flat", 0.05), mod("lightningRes", "flat", 0.05), mod("chaosRes", "flat", 0.05)], links: ["wil_p0", "cl_fireres_c"] },
  { id: "cha_start", name: "Way of Charisma", description: "A starting point of the nine-pointed star. Any class may path through it.", kind: "start", x: 3504, y: 3090, attributes: { charisma: 3 }, links: [] },
  { id: "cha_p0", name: "Foresight", description: "+10 maximum insight", kind: "small", x: 4080, y: 3150, mods: [mod("insight", "flat", 10)], links: ["cha_start"] },
  { id: "cha_p1", name: "Read the Room", description: "10% increased evasion, +5 maximum insight", kind: "small", x: 4344, y: 3132, mods: [mod("evasion", "increased", 0.1), mod("insight", "flat", 5)], links: ["cha_p0"] },
  // THE INVERTED EYE: insight re-read as a ROOTED discipline — stillness
  // pools it (slowly: the ~6s ramp-in vs the 2.5s wear-off is the price),
  // motion bleeds it. insightInversion is a continuous dial, so a future
  // half-inverted hybrid is one ordinary modifier, not a new mechanic;
  // Settling Stone shows the ramp itself is investable.
  { id: "cha_key_root", name: "The Unmoved Eye", description: "KEYSTONE: insight pools in STILLNESS instead of motion — planted feet ramp it in over ~6 seconds; walking bleeds it", kind: "keystone", x: 4620, y: 3210, mods: [mod("insightInversion", "flat", 1)], links: ["cha_p1"] },
  { id: "settling_stone", name: "Settling Stone", description: "Rooted insight ramps in 25% faster; +10 maximum insight", kind: "notable", x: 4860, y: 3132, mods: [mod("insightStillTaper", "increased", -0.25), mod("insight", "flat", 10)], links: ["cha_key_root"] },
  // The ES-DoT lever, socketed into the tree: baseline shields no longer
  // blank damage over time — this keystone BUYS a big slice of it back.
  { id: "wil_x1", name: "Still Mind", description: "KEYSTONE: While you have energy shield, take 60% less damage over time. +15 maximum energy shield", kind: "keystone", x: 1176, y: 2796, mods: [mod("esDotResist", "flat", 0.6), mod("energyShield", "flat", 15)], links: ["node_42", "node_52"] },
  // --- The INTERACTION FABRIC exemplars: stat links (single-hop siphons),
  // gauges (per-stack self-scaling), and the defensive proc triggers. Each
  // of these is one ordinary modifier — the pattern is the point.
  { id: "sanguine_lattice", name: "Sanguine Lattice", description: "Gain 40% of your life regeneration per second as thorns", kind: "notable", x: 3972, y: 5172, mods: [linkMod("thorns", "lifeRegen", 0.4)], links: ["cl_lreg_p0"] },
  { id: "vicious_cycle", name: "Vicious Cycle", description: "Gain 20% of your thorns as life regeneration per second", kind: "notable", x: 4200, y: 5340, mods: [linkMod("lifeRegen", "thorns", 0.2)], links: ["sanguine_lattice"] },
  { id: "fevered_blood", name: "Fevered Blood", description: "For each stack of poison on YOU: 2% increased damage dealt, 2% increased damage taken", kind: "notable", x: 3120, y: 1548, mods: [gaugeMod("damage", "increased", 0.02, "status:poison"), gaugeMod("damageTaken", "increased", 0.02, "status:poison")], links: ["node_32"] },
  { id: "riposte_doctrine", name: "Riposte Doctrine", description: "+3% block chance; 35% chance on block to erupt (Bulwark Nova); 30% chance on block to mend (Guarded Heart)", kind: "notable", x: 2070, y: 5430, mods: [mod("blockChance", "flat", 0.03), mod("proc_bulwark_nova", "flat", 0.35), mod("proc_guarded_heart", "flat", 0.3)], links: ["cl_block_p1"] },
  { id: "break_the_line", name: "Break the Line", description: "20% increased poise damage; breaking an enemy's poise grants Breaker's Momentum", kind: "notable", x: 4200, y: 3840, mods: [mod("poiseDamage", "increased", 0.2), mod("proc_breakers_momentum", "flat", 1)], links: ["brz_n2"] },
  { id: "eva_pr1", name: "Second Wind", description: "+3 life gained on evade; 40% chance on evade to catch your breath (heal)", kind: "notable", x: 3600, y: 540, mods: [mod("lifeOnEvade", "flat", 3), mod("proc_second_wind", "flat", 0.4)], links: ["node_5"] },
  { id: "stored_lightning", name: "Stored Lightning", description: "+15 maximum energy shield; your energy shield breaking releases a Capacitor Burst, and half the time a Phase Surge", kind: "notable", x: 900, y: 840, mods: [mod("energyShield", "flat", 15), mod("proc_capacitor_burst", "flat", 1), mod("proc_phase_surge", "flat", 0.5)], links: ["node_21"] },
  // --- THE POISE CYCLE, socketed into the tree (the break-bar state
  // machine's investment surface): recovery speed + the re-arm line, the
  // on-hit refill + overcharge crest, and the break/re-arm proc payoffs.
  { id: "forged_rhythm", name: "Forged Rhythm", description: "25% increased poise recovery; your broken poise re-arms at 75% of maximum", kind: "notable", x: 2220, y: 3168, mods: [mod("poiseRegenPct", "increased", 0.25), mod("poiseRearmAt", "flat", -0.25)], links: ["for_p1"] },
  { id: "rising_crest", name: "Rising Crest", description: "+2 poise gained on hit; poise gains can overcharge 20% past maximum", kind: "notable", x: 2004, y: 3054, mods: [mod("poiseOnHit", "flat", 2), mod("poiseOvercharge", "flat", 0.2)], links: ["forged_rhythm"] },
  // THE BONEWRIGHT LANE (STAT_TRADES): the mage-shield renounced for
  // footing — the paladin gone full bonk. Dials, not flags: esToPoise and
  // esForgone are stats later content can push either way.
  { id: "bonewright_oath", name: "Bonewright Oath", description: "KEYSTONE: renounce all energy shield; 45% of it is read again as maximum poise", kind: "keystone", x: 1770, y: 3300, mods: [mod("esForgone", "flat", 1), mod("esToPoise", "flat", 0.45)], links: ["rising_crest"] },
  { id: "shatterplate_doctrine", name: "Shatterplate Doctrine", description: "+20 maximum poise; your poise breaking hurls the bar's shards as shrapnel (Shatterplate)", kind: "notable", x: 2124, y: 3906, mods: [mod("poise", "flat", 20), mod("proc_shatterplate", "flat", 1)], links: ["for_p0"] },
  { id: "broken_fury", name: "Broken Fury", description: "While your poise is broken, deal 15% more damage; your poise breaking rouses Unbroken Wrath", kind: "notable", x: 1932, y: 4056, mods: [mod("damage", "more", 0.15, undefined, "poiseBroken"), mod("proc_unbroken_wrath", "flat", 1)], links: ["shatterplate_doctrine"] },
  { id: "twice_quenched", name: "Twice-Quenched Steel", description: "Your poise re-arming tempers it (Tempered Re-arm); +10 maximum poise", kind: "notable", x: 2364, y: 3018, mods: [mod("proc_tempered_rearm", "flat", 1), mod("poise", "flat", 10)], links: ["forged_rhythm"] },
  // --- THE RECHARGE STREAM: interruption resistance as an investment
  // ladder, capped by a keystone that buys total steadiness with time.
  { id: "unbroken_stream", name: "Unbroken Stream", description: "40% chance for damage not to interrupt your energy shield recharge; 15% increased recharge rate", kind: "notable", x: 2610, y: 1758, mods: [mod("esRechargeSteadfast", "flat", 0.4), mod("esRechargeRate", "increased", 0.15)], links: ["wil_p0"] },
  { id: "tidal_mind", name: "Tidal Mind", description: "KEYSTONE: Your energy shield recharge is never interrupted by damage, but your recharge delay is 50% longer", kind: "keystone", x: 2748, y: 1518, mods: [mod("esRechargeSteadfast", "override", 1), mod("esRechargeDelay", "increased", 0.5)], links: ["unbroken_stream"] },
  // --- DEMO CONSTELLATION, round two: every shape the fabric can take.
  // One-sided gauge (contrast with Fevered Blood's paired bargain):
  { id: "venom_focus", name: "Venom Focus", description: "For each stack of poison on YOU: 2% increased damage dealt (and nothing else — the poison is fuel, not a bargain)", kind: "notable", x: 3336, y: 1050, mods: [gaugeMod("damage", "increased", 0.02, "status:poison")], links: ["node_13"] },
  // Charge-count gauge with a tag filter and a MORE multiplier:
  { id: "furious_momentum", name: "Furious Momentum", description: "1% more physical damage per Fury charge", kind: "notable", x: 4560, y: 3780, mods: [gaugeMod("damage", "more", 0.01, "charge:fury", ["physical"])], links: ["brz_s4"] },
  // Resource->damage links ("for every N of X, gain Y"):
  { id: "iron_sinews", name: "Iron Sinews", description: "Gain 1 added physical damage with melee skills per 100 armor", kind: "notable", x: 3240, y: 4440, mods: [linkMod("addedPhysical", "armor", 0.01, ["melee"])], links: ["war_s4"] },
  { id: "blood_arcana", name: "Blood Arcana", description: "Gain 1 added chaos damage with spells per 50 maximum life", kind: "notable", x: 2160, y: 2340, mods: [linkMod("addedChaos", "life", 0.02, ["spell"])], links: ["attr_vit"] },
  // The break-less third pool + its fortify refill:
  { id: "enduring_bulwark", name: "Enduring Bulwark", description: "+40 maximum endurance; blocking banks endurance (Bastion)", kind: "notable", x: 2712, y: 4200, mods: [mod("endurance", "flat", 40), mod("proc_bastion_fortify", "flat", 1)], links: ["war_s3"] },
  // Skill-gated procs, both cast disciplines (the two variants are one flag apart):
  { id: "radiant_reprisal_n", name: "Radiant Reprisal", description: "Sanctified Strike: 25% chance on hit (once per swing) to bloom after 0.5s — healing allies and burning enemies in the circle", kind: "notable", x: 3600, y: 5520, mods: [mod("proc_radiant_reprisal", "flat", 0.25)], links: ["cl_lreg_p2"] },
  { id: "radiant_cascade_n", name: "Radiant Cascade", description: "Sanctified Strike: 15% chance per target struck to host its own smaller bloom", kind: "notable", x: 4248, y: 5580, mods: [mod("proc_radiant_cascade", "flat", 0.15)], links: ["node_71"] },
  // On-kill rhythm + sustain:
  { id: "executioners_rhythm_n", name: "Executioner's Rhythm", description: "+8 life gained on kill; kills tick your cooldowns down 1.5s", kind: "notable", x: 5010, y: 4200, mods: [mod("lifeOnKill", "flat", 8), mod("proc_executioners_rhythm", "flat", 1)], links: ["cl_phys_p0"] },
  // Culling keystone:
  { id: "reapers_due", name: "Reaper's Due", description: "KEYSTONE: your hits EXECUTE enemies at or below 10% of their maximum life", kind: "keystone", x: 3888, y: 4356, mods: [mod("cullThreshold", "flat", 0.1)], links: ["cl_melee_c"] },
  // --- THE LONG WAKE: the wakeflame votive economy as a passive wing.
  // Held wakeflames are a BUILD-YOUR-OWN-BUFF (gaugeMods on
  // 'charge:wakeflame'): each notable converts the bank into a different
  // payoff, so holding vs spending (Requiem, Deathwatch) is a real
  // decision the tree itself sharpens. Entry rides the on-kill wing.
  { id: "cl_wake_p0", name: "Votive Path", description: "+1 maximum Wakeflame; 10% increased orb shed chance", kind: "small", x: 5100, y: 4470, mods: [mod("chargeCap_wakeflame", "flat", 1), mod("orbShedRate", "increased", 0.1)], links: ["executioners_rhythm_n"] },
  { id: "cl_wake_p1", name: "Candle Beads", description: "Kills have 6% chance to shed a Wakeflame orb; scooping a Wakeflame sparks 6 mana back (Votive Spark)", kind: "small", x: 5240, y: 4680, mods: [mod("orbOnKill_wakeflame", "flat", 0.06), mod("proc_votive_spark", "flat", 1)], links: ["cl_wake_p0"] },
  { id: "cl_wake_hurt", name: "Bruised Votives", description: "Blows that land on you have an 8% chance to shake a Wakeflame orb loose — every wound feeds the wake", kind: "small", x: 4960, y: 4650, mods: [mod("orbOnHurt_wakeflame", "flat", 0.08)], links: ["cl_wake_p0"] },
  // The alchemist's spur: fount investment off the orb wing. Capacity is
  // the chargeCap_<id> family; the notable is the PERCENT lever — flat
  // founts keep pace with big pools through restorePctMax/restorePower,
  // never through count-scaled pours (the sip economy stays detached).
  { id: "cl_fount_p0", name: "Deep Founts", description: "+1 maximum Life Fount and Mana Fount", kind: "small", x: 4820, y: 4780, mods: [mod("chargeCap_flask_life", "flat", 1), mod("chargeCap_flask_mana", "flat", 1)], links: ["cl_wake_hurt"] },
  { id: "cl_fount_n", name: "Bottomless Draught", description: "Fount drinks restore an extra 3% of the pool's maximum; 20% increased Restoration", kind: "notable", x: 4700, y: 4920, mods: [mod("restorePctMax", "flat", 0.03), mod("restorePower", "increased", 0.2)], links: ["cl_fount_p0"] },
  { id: "cl_wake_p2", name: "Keeper's Patience", description: "Gain 1 Wakeflame every 10 seconds", kind: "small", x: 5090, y: 4880, mods: [mod("chargeRegen_wakeflame", "flat", 1)], links: ["cl_wake_p1"] },
  { id: "cl_wake_cortege", name: "Cortege", description: "For each Wakeflame you hold: minions deal 2% increased damage", kind: "notable", x: 5410, y: 4560, mods: [gaugeMod("minionDamage", "increased", 0.02, "charge:wakeflame")], links: ["cl_wake_p1"] },
  { id: "cl_wake_tallow", name: "Tallow Ward", description: "For each Wakeflame you hold: 3% increased armor and 1% less damage taken", kind: "notable", x: 5400, y: 4840, mods: [gaugeMod("armor", "increased", 0.03, "charge:wakeflame"), gaugeMod("damageTaken", "more", -0.01, "charge:wakeflame")], links: ["cl_wake_p1"] },
  { id: "cl_wake_bright", name: "Bright Procession", description: "For each Wakeflame you hold: 2% increased damage; Wakeflame orbs refund 0.1s of every cooling skill", kind: "notable", x: 5245, y: 5045, mods: [gaugeMod("damage", "increased", 0.02, "charge:wakeflame"), mod("orbRefund_wakeflame", "flat", 0.1)], links: ["cl_wake_p2"] },
  { id: "cl_wake_hours", name: "The Candle Hours", description: "KEYSTONE: you can hold 2 fewer Wakeflames, but each burns brighter — per Wakeflame: 3% increased damage, minions 3% increased damage, 1.5% less damage taken", kind: "keystone", x: 5570, y: 4990, mods: [mod("chargeCap_wakeflame", "flat", -2), gaugeMod("damage", "increased", 0.03, "charge:wakeflame"), gaugeMod("minionDamage", "increased", 0.03, "charge:wakeflame"), gaugeMod("damageTaken", "more", -0.015, "charge:wakeflame")], links: ["cl_wake_tallow", "cl_wake_bright"] },
  // The proc-combat archetype's gate: one extra proc LAYER (deeper layers
  // roll at half rate — DEFENSE_CFG.procs.depthFalloff keeps it convergent).
  { id: "chain_reaction", name: "Chain Reaction", description: "KEYSTONE: your triggered effects can themselves trigger effects (one extra layer; deeper layers fire at half rate)", kind: "keystone", x: 570, y: 1230, mods: [mod("procDepth", "flat", 1)], links: ["stored_lightning"] },
  // --- THE TRIGGER CONSTELLATION (north-west reaches): luck, gain chains,
  // and the second depth rung — the proc-combat neighbourhood, planted in
  // the 6x-scaled space the tree now has room to grow into.
  { id: "gamblers_touch", name: "Gambler's Touch", description: "+20% Luck (your triggered effects fire more often — never drop rates)", kind: "notable", x: 420, y: 900, mods: [mod("luck", "flat", 0.2)], links: ["stored_lightning"] },
  { id: "fortunes_weave", name: "Fortune's Weave", description: "+10% Luck", kind: "small", x: 300, y: 1020, mods: [mod("luck", "flat", 0.1)], links: ["gamblers_touch"] },
  { id: "kindled_rage_n", name: "Kindled Rage", description: "Gaining a Fury charge has a 10% chance to grant a Rage stack (Rage cools off when not refreshed)", kind: "notable", x: 450, y: 1380, mods: [mod("proc_kindled_rage", "flat", 0.1)], links: ["chain_reaction"] },
  { id: "crimson_thirst_n", name: "Crimson Thirst", description: "Gaining a Rage stack has a 25% chance to bank 2 Bloodlust (chained gains need deeper proc layers)", kind: "notable", x: 330, y: 1500, mods: [mod("proc_crimson_thirst", "flat", 0.25)], links: ["kindled_rage_n"] },
  { id: "surging_frenzy_n", name: "Surging Frenzy", description: "Gaining Bloodlust has a 35% chance to grant a Fury charge — the loop closes only as deep as your proc layers reach; it can never turn forever", kind: "notable", x: 210, y: 1620, mods: [mod("proc_surging_frenzy", "flat", 0.35)], links: ["crimson_thirst_n"] },
  { id: "battle_chorus_n", name: "Battle Chorus", description: "Gaining ANY buff has a 25% chance to grant a Fury charge (6s cooldown)", kind: "notable", x: 720, y: 1500, mods: [mod("proc_battle_chorus", "flat", 0.25)], links: ["chain_reaction"] },
  { id: "perpetual_motion", name: "Perpetual Motion", description: "KEYSTONE: one further proc layer (stacks with Chain Reaction to the absolute lid; each layer fires at half the last's rate)", kind: "keystone", x: 240, y: 780, mods: [mod("procDepth", "flat", 1)], links: ["gamblers_touch"] },
  // --- THE COMMUNION REACH (east): shared-life sustain, crit dice, minion
  // rites, and the silence brand — the paladin/shepherd neighbourhood.
  { id: "transfusion", name: "Transfusion", description: "5% of your damage dealt heals allies near you (Vampiric Share)", kind: "notable", x: 5460, y: 2520, mods: [mod("vampiricShare", "flat", 0.05)], links: ["cl_acc_p0"] },
  // SYMPATHY exemplar (engine/sympathy.ts): the tree's grant surface for a
  // link is one ordinary stat mod — here the menders_ripple heal echo.
  { id: "fellowship_of_the_wake", name: "Fellowship of the Wake", description: "Heals that land on you RIPPLE: 35% echoes to up to 3 nearby allies — hirelings, wanderers and townsfolk included (sympathy)", kind: "notable", x: 5340, y: 2640, mods: [mod("sympathy_menders_ripple", "flat", 1)], links: ["transfusion"] },
  { id: "oathbound_insight", name: "Oathbound Insight", description: "Critical hits have a 35% chance to grant a Fury charge (independent of any gem's crit dice)", kind: "notable", x: 5640, y: 2640, mods: [mod("proc_battle_insight", "flat", 0.35)], links: ["transfusion"] },
  { id: "shepherds_rites", name: "Shepherd's Rites", description: "Minions heal 8% of a dying kin's life; summons mend nearby allies 4 on arrival", kind: "notable", x: 5520, y: 2760, mods: [mod("minionDeathHeal", "flat", 0.08), mod("summonMend", "flat", 4)], links: ["transfusion"] },
  { id: "silencing_brand", name: "Silencing Brand", description: "Your spells have an 8% chance to Silence (no spells for the afflicted)", kind: "notable", x: 5700, y: 2460, mods: [mod("apply_silence", "flat", 0.08, ["spell"])], links: ["oathbound_insight"] },
  // RECUPERATION exemplar (the stagger-heal stat is GLOBAL — a passive,
  // a status, or a monster's innate can all carry it):
  { id: "stalwart_recovery", name: "Stalwart Recovery", description: "30% of hits that land on your life flow back as healing over the next 6 seconds", kind: "notable", x: 2560, y: 4360, mods: [mod("recuperate", "flat", 0.3)], links: ["enduring_bulwark"] },
  // AILMENT INVESTMENT (the baseline rebalance's other half — see
  // engine/status.ts AILMENT_TUNING): plain hits no longer bleed and barely
  // ignite; these notables are the tree's way to buy the chances back.
  { id: "exsanguinate", name: "Exsanguinate", description: "Attacks have 20% chance to Bleed; 20% increased physical ailment magnitude", kind: "notable", x: 3480, y: 1560, mods: [mod("apply_bleed", "flat", 0.2, ["attack"]), mod("statusMagnitude", "increased", 0.2, ["physical"])], links: ["swb_s3"] },
  { id: "kindling_doctrine", name: "Kindling Doctrine", description: "Spells have 15% chance to Ignite; 20% increased fire ailment magnitude", kind: "notable", x: 1230, y: 3300, mods: [mod("apply_burn", "flat", 0.15, ["spell"]), mod("statusMagnitude", "increased", 0.2, ["fire"])], links: ["sor_s3"] },
  // --- CHOICE NODES (data/passiveChoices.ts): each deals its group's options
  // in a popup; a pick spends a point and locks permanently. The three shapes
  // demonstrated here: single-pick attribute callings (flat AND the percent
  // temper), character-unique DOCTRINES shared across several nodes (the
  // mastery rule — taking Stone at the armor cluster spends it at the block
  // cluster too), and the god-tree pair (pick 3 of 8 verses; 1 of 4 refrains).
  { id: "cho_calling", name: "The Calling", description: "Choose one calling — Might, Bulwark, or Cunning. The choice is permanent; the paths not taken lock.", kind: "choice", x: 4032, y: 2916, choice: { group: "attr_calling" }, links: ["attr_all"] },
  { id: "cho_temper", name: "The Tempering", description: "Temper one attribute — a permanent percent increase that scales everything the build grants it.", kind: "choice", x: 5610, y: 3648, choice: { group: "attr_temper" }, links: ["cl_attr_c"] },
  { id: "cho_bulwark1", name: "Bulwark Doctrine", description: "Commit to one doctrine of the bulwark. Each doctrine may be sworn only once per character, at any node that deals it.", kind: "choice", x: 3162, y: 4362, choice: { group: "bulwark_doctrines" }, links: ["cl_armor_c"] },
  { id: "cho_bulwark2", name: "Bulwark Doctrine", description: "Commit to one doctrine of the bulwark. Each doctrine may be sworn only once per character, at any node that deals it.", kind: "choice", x: 2196, y: 4788, choice: { group: "bulwark_doctrines" }, links: ["cl_block_c"] },
  { id: "cho_war1", name: "War Doctrine", description: "Commit to one doctrine of war. Each doctrine may be sworn only once per character, at any node that deals it.", kind: "choice", x: 4062, y: 4644, choice: { group: "war_doctrines" }, links: ["cl_melee_c"] },
  { id: "cho_war2", name: "War Doctrine", description: "Commit to one doctrine of war. Each doctrine may be sworn only once per character, at any node that deals it.", kind: "choice", x: 4590, y: 4536, choice: { group: "war_doctrines" }, links: ["cl_phys_c"] },
  { id: "cho_arcane1", name: "Arcane Doctrine", description: "Commit to one doctrine of the arcane. Each doctrine may be sworn only once per character, at any node that deals it.", kind: "choice", x: 1206, y: 4602, choice: { group: "arcane_doctrines" }, links: ["cl_spell_c"] },
  { id: "cho_arcane2", name: "Arcane Doctrine", description: "Commit to one doctrine of the arcane. Each doctrine may be sworn only once per character, at any node that deals it.", kind: "choice", x: 1998, y: 4356, choice: { group: "arcane_doctrines" }, links: ["cl_es_c"] },
  { id: "cho_wake_litany", name: "The Candle Litany", description: "Recite three of the litany's eight verses — each verse costs a point; five stay unsaid forever.", kind: "choice", x: 4890, y: 5090, choice: { group: "wake_litany" }, links: ["cl_wake_p2"] },
  { id: "cho_wake_paean", name: "The Paean", description: "Sing one of four refrains over the wake. The others fall silent.", kind: "choice", x: 5730, y: 5170, choice: { group: "wake_paean" }, links: ["cl_wake_hours"] },
  // --- PASSIVE REALMS (data/passiveRealms.ts) — scaffolding constellations.
  // DEVOTION: "The Hunt", a tiny star proving tree-adjacency realms — free
  // root crest, a short walk, and a choice-node deal. Spends devotion points.
  { id: "dev_hunt_root", name: "The Hunt", description: "The Hunt constellation's crest — attuned free when Devotion opens. Its stars spend devotion points.", kind: "start", x: 3000, y: 3000, realm: "devotion", links: [] },
  { id: "dev_hunt_s1", name: "Loping Chase", description: "8% increased projectile damage", kind: "small", x: 2830, y: 2880, realm: "devotion", mods: [mod("damage", "increased", 0.08, ["projectile"])], links: ["dev_hunt_root"] },
  { id: "dev_hunt_s2", name: "Keen Scent", description: "+30 accuracy rating", kind: "small", x: 3170, y: 2880, realm: "devotion", mods: [mod("accuracy", "flat", 30)], links: ["dev_hunt_root"] },
  { id: "dev_hunt_s3", name: "Soft Paws", description: "4% increased movement speed", kind: "small", x: 2900, y: 3190, realm: "devotion", mods: [mod("moveSpeed", "increased", 0.04)], links: ["dev_hunt_root"] },
  { id: "dev_hunt_n1", name: "The Hound", description: "15% increased projectile damage; +2 life gained on kill. GRAFT: Skewering Blows — bind it onto one learned skill.", kind: "notable", x: 3080, y: 3210, realm: "devotion", mods: [mod("damage", "increased", 0.15, ["projectile"]), mod("lifeOnKill", "flat", 2)], graft: { support: "skewering_blows" }, links: ["dev_hunt_s3"] },
  { id: "dev_hunt_cho", name: "Aspect of the Hunt", description: "Take one aspect of the Hunt. The constellation remembers your shape.", kind: "choice", x: 3000, y: 2700, realm: "devotion", choice: { group: "devotion_hunt" }, links: ["dev_hunt_s1", "dev_hunt_s2"] },
  // THE PANTHEON: free-standing shrines (adjacency 'free' — no pathing, no
  // links): ONE Major voice of four, three minor blessings of six, and a
  // plain offering stone proving ordinary free nodes. Spends communion.
  { id: "pan_major", name: "Shrine of the Voice", description: "Kneel and take ONE Major voice. The other gods remember being passed over.", kind: "choice", x: 2820, y: 3000, realm: "pantheon", choice: { group: "pantheon_major" }, links: [] },
  { id: "pan_minor", name: "Shrine of Blessings", description: "Three minor blessings of six — each communion costs a point.", kind: "choice", x: 3180, y: 3000, realm: "pantheon", choice: { group: "pantheon_minor" }, links: [] },
  { id: "pan_offering", name: "Offering Stone", description: "+10 maximum life", kind: "small", x: 3000, y: 3260, realm: "pantheon", mods: [mod("life", "flat", 10)], links: [] },
];

// --- VOCATION MINI-TREES -------------------------------------------------------
// Each VocationDef's tree (authored in LOCAL coords around 0,0) is offset into
// the EMPTY CENTRE of the nine-point star and merged into the ordinary node
// registry — adjacency, recalc, save and the validator all work unchanged.
// Nodes are namespaced `voc_<vocationId>_<localId>` and marked with `vocation`;
// the free ROOT crest is generated here and auto-allocated when the vocation is
// granted (world.grantVocation). Different vocations' trees deliberately share
// the same central space — at most one renders per character.

const starNodes = nodes.filter(n => n.kind === 'start');
/** The hub of the nine-point star — where vocation trees anchor. Derived from
 *  the live start nodes (never a hardcoded coordinate). */
export const STAR_CENTER = {
  x: Math.round(starNodes.reduce((s, n) => s + n.x, 0) / Math.max(1, starNodes.length)),
  y: Math.round(starNodes.reduce((s, n) => s + n.y, 0) / Math.max(1, starNodes.length)),
};

for (const v of Object.values(VOCATIONS)) {
  nodes.push({
    id: vocationRootId(v.id), name: v.name,
    description: `${v.blurb} — the ${v.name}'s crest, granted with the vocation. Its nodes spend vocation points.`,
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

/** Resolved from ClassDef.startNode — the tree never hardcodes class ids. */
export function classStartNode(classId: string): string {
  const c = CLASSES.find(cd => cd.id === classId);
  if (!c) console.warn(`[passives] unknown class '${classId}' — starting at str_start`);
  return c?.startNode ?? 'str_start';
}

/** The start node that GATES a vocation's point-spending (when the
 *  VOCATION_CFG.requireGateNode playtest toggle is on): the def's authored
 *  override, else the home class's startNode. Registry-resolved — no ids. */
export function vocationGateNodeId(vocId: string): string | null {
  const v = VOCATIONS[vocId];
  if (!v) return null;
  return v.gateNode ?? classStartNode(v.classId);
}

/** May a character with these allocations SPEND points in `vocId`'s tree?
 *  True when the gate toggle is off, or once the gate start node is taken.
 *  (A home-class character passes from birth — its start node is allocated
 *  at creation; an off-class character must path to it first.) */
export function vocationGateOpen(allocated: ReadonlySet<string>, vocId: string): boolean {
  if (!VOCATION_CFG.requireGateNode) return true;
  const gate = vocationGateNodeId(vocId);
  return gate === null || allocated.has(gate);
}
