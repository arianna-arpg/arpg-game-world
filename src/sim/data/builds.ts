// ---------------------------------------------------------------------------
// REFERENCE BUILDS — the measuring sticks. Open registry: add an entry, and
// every CLI command (run/sweep/manifest) can see it by id. Keep these HONEST
// representatives of what a real character has at that level, because target
// bands are calibrated against them.
//
// Naming: <who>_<level-band>. Levels come with an intended gem level via
// GEM_LEVEL_AT so "a level-10 kit" means the same thing across builds.
// ---------------------------------------------------------------------------

import { CLASSES, PROGRESSION } from '../../data/classes';
import { PASSIVE_ADJACENCY, PASSIVE_NODES, classStartNode } from '../../data/passives';
import { SKILLS } from '../../data/skills';
import { SUPPORTS } from '../../data/supports';
import {
  SKILL_RARITIES, makeSkillInstance, supportFitsInst, validTreeNodes,
  type SkillDef, type SkillRarity, type SupportDef,
} from '../../engine/skills';
import { treeLimbs } from '../../engine/skilltree';
import type { BuildEntry, BuildSkillSpec, BuildSpec } from '../types';

/** Roughly how a gem keeps pace with character level, absent fancy play.
 *  A deliberate, documented assumption — change it HERE, not per-build. */
export function gemLevelAt(charLevel: number): number {
  return Math.max(1, Math.floor(charLevel / 3) + 1);
}

/** Deterministic greedy tree: breadth-first from the class start node, ties
 *  broken alphabetically. Not OPTIMAL play — honest AVERAGE play: a level-L
 *  character has spent ~L points near home. Derived from the live graph, so
 *  tree edits reshape every reference build with zero edits here. Choice nodes
 *  require explicit BuildSpec.choices: this node-id-only walk cannot make a
 *  deal, so it must never spend a point on one or path through an empty deal. */
export function greedyPassives(classId: string, points: number): string[] {
  const start = classStartNode(classId);
  const picks: string[] = [];
  const seen = new Set<string>([start]);
  let frontier = [start];
  while (picks.length < points && frontier.length) {
    const next: string[] = [];
    for (const at of frontier) {
      for (const n of [...(PASSIVE_ADJACENCY[at] ?? [])].sort()) {
        if (seen.has(n)) continue;
        if (PASSIVE_NODES[n]?.choice) continue;
        seen.add(n);
        picks.push(n);
        next.push(n);
        if (picks.length >= points) return picks;
      }
    }
    frontier = next;
  }
  return picks;
}

/** A class's live starting bar, translated into a BuildSpec at a level, with
 *  the level-earned budget spent nearby, derived from PROGRESSION. */
export function starterBuild(classId: string, level: number): BuildSpec {
  const cls = CLASSES.find(c => c.id === classId);
  if (!cls) throw new Error(`sim builds: unknown class '${classId}'`);
  const skills = cls.bar.filter((s): s is string => s !== null)
    .map(id => ({ id, level: gemLevelAt(level) }));
  return {
    id: `starter_${classId}_l${level}`,
    label: `${cls.name} starter kit @ L${level}`,
    classId,
    level,
    skills,
    passives: greedyPassives(classId, PROGRESSION.passivePointsAtLevel(level)),
    ...(cls.startingCompanions?.length ? { startingCompanions: true } : {}),
  };
}

/** GEARED tier knobs: what "reasonably equipped at level L" means, as data.
 *  The rarity ladder is deliberately modest — found gear, not a bench-crafted
 *  ceiling; raise it here (or add a build with explicit GearSpecs) to probe
 *  richer wardrobes. */
export const GEARED_CFG = {
  /** Every slot worn from this list (EQUIP_SLOTS ids). */
  slots: ['helmet', 'amulet', 'chest', 'gloves', 'belt', 'ring1', 'ring2', 'legs', 'boots'],
  /** Worn rarity by band: the smallest band ≥ level wins. */
  rarityByLevel: [
    { upTo: 4, rarity: 'common' as const },
    { upTo: 9, rarity: 'magic' as const },
    { upTo: Infinity, rarity: 'rare' as const },
  ],
  /** Fixed roll seed → the same wardrobe every run (a build is a measuring
   *  stick; re-seed deliberately to study gear VARIANCE instead). */
  gearSeed: 0x9ea7ed,
};

/** The starter kit WEARING level-appropriate found gear — the geared tier.
 *  Same skills, same tree; the delta bare→geared IS the value of gear. */
export function gearedBuild(classId: string, level: number): BuildSpec {
  const base = starterBuild(classId, level);
  const rarity = GEARED_CFG.rarityByLevel.find(r => level <= r.upTo)!.rarity;
  return {
    ...base,
    id: `geared_${classId}_l${level}`,
    label: `${base.label ?? classId} + ${rarity} wardrobe`,
    gear: GEARED_CFG.slots.map(slot => ({ slot, rarity })),
    gearSeed: GEARED_CFG.gearSeed,
  };
}

/** KITTED tier knobs: what a player who engages with every build system has by
 *  level L, as data. Still a floor rather than a ceiling (the search lane hunts
 *  ceilings); the point is a reference that exercises sockets and skill trees
 *  at all, which the starter and geared tiers never do. */
export const KITTED_CFG = {
  /** Gem rarity (and so socket count) by band: the smallest band ≥ level wins. */
  gemRarityByLevel: [
    { upTo: 4, rarity: 'common' as SkillRarity },
    { upTo: 9, rarity: 'magic' as SkillRarity },
    { upTo: 19, rarity: 'rare' as SkillRarity },
    { upTo: Infinity, rarity: 'legendary' as SkillRarity },
  ],
  /** Characters per support-gem level. */
  supportLevelPer: 6,
  /** How much a support's static mod row argues for picking it, by stat then
   *  kind. A derived read of the live catalog (retune a gem and the pick
   *  follows), not a claim about which gem is best: the matrix and the search
   *  measure that. Stats absent here score zero. */
  supportScore: {
    damage: { more: 3, increased: 1 },
    attackSpeed: { more: 2, increased: 0.7 },
    castSpeed: { more: 2, increased: 0.7 },
    projectileCount: { flat: 0.5 },
    critChance: { increased: 0.3 },
    critMulti: { increased: 0.3 },
    aoeRadius: { increased: 0.3 },
  } as Record<string, Record<string, number>>,
};

/** The static pick score of a support (see KITTED_CFG.supportScore). */
function supportStaticScore(sup: SupportDef): number {
  let score = 0;
  for (const m of sup.mods) score += (KITTED_CFG.supportScore[m.stat]?.[m.kind] ?? 0) * m.value;
  return score;
}

/** The best-scoring droppable supports the REAL socket gate admits on this
 *  skill. Deterministic: score, then id. */
export function kittedSupports(def: SkillDef, sockets: number, supportLevel: number): { id: string; level: number }[] {
  const inst = makeSkillInstance(def, 1, Math.max(1, sockets));
  const fits = Object.values(SUPPORTS)
    .filter(s => (s.weight ?? 0) > 0 && !s.resonance && supportFitsInst(s, inst))
    .map(s => ({ s, score: supportStaticScore(s) }))
    .filter(r => r.score > 0)
    .sort((a, b) => b.score - a.score || (a.s.id < b.s.id ? -1 : 1));
  return fits.slice(0, sockets).map(r => ({ id: r.s.id, level: supportLevel }));
}

/** The first limb walked as far as the skill's own Ability points reach,
 *  through the one validation seam. Empty below the first milestone. */
export function kittedTreeNodes(def: SkillDef, gemLevel: number): string[] | undefined {
  if (!def.tree) return undefined;
  const limb = treeLimbs(def)[0];
  if (!limb) return undefined;
  const kept = validTreeNodes(def, limb.rungs.map(n => n.id), gemLevel, { quiet: true });
  return kept?.length ? kept : undefined;
}

/** The geared wardrobe plus filled sockets and spent skill trees. */
export function kittedBuild(classId: string, level: number): BuildSpec {
  const base = gearedBuild(classId, level);
  const gemLevel = gemLevelAt(level);
  const rarity = KITTED_CFG.gemRarityByLevel.find(r => level <= r.upTo)!.rarity;
  const supportLevel = Math.max(1, Math.floor(level / KITTED_CFG.supportLevelPer));
  const skills: BuildSkillSpec[] = base.skills.map(s => {
    const def = SKILLS[s.id];
    if (!def) return s;
    const supports = kittedSupports(def, SKILL_RARITIES[rarity].sockets, supportLevel);
    const treeNodes = kittedTreeNodes(def, gemLevel);
    return {
      ...s, rarity,
      ...(supports.length ? { supports } : {}),
      ...(treeNodes ? { treeNodes } : {}),
    };
  });
  return {
    ...base,
    id: `kitted_${classId}_l${level}`,
    label: `${base.label ?? classId} + filled sockets and trees`,
    skills,
  };
}

/** THE TIER REGISTRY: an open map from tier name to build factory, read by the
 *  scenario factories, the expression census and the farm's planner. A new
 *  wardrobe or kit philosophy is one row. */
export const BUILD_TIERS: Record<string, (classId: string, level: number) => BuildSpec> = {
  starter: starterBuild,
  geared: gearedBuild,
  kitted: kittedBuild,
};

/** Mint (or find) a tier's build at any level. Any level is a legal band. */
export function ensureTierBuild(tier: string, classId: string, level: number): string {
  const make = BUILD_TIERS[tier];
  if (!make) throw new Error(`sim builds: unknown tier '${tier}' (have: ${Object.keys(BUILD_TIERS).join(', ')})`);
  const id = `${tier}_${classId}_l${level}`;
  BUILDS[id] ??= make(classId, level);
  return id;
}

/** The registry. Starter kits at the canonical measurement bands, minted from
 *  the LIVE class bars (re-bar a class and these follow, zero edits here),
 *  plus the geared twins (gear value = the bare↔geared delta at each band).
 *  Holds authored BuildSpecs AND save-backed builds (SavedBuild): the CLI
 *  auto-registers balance/players/*.json as player_<name> and `save:` refs
 *  on demand, so a real character is addressable wherever a build id is. */
export const BUILDS: Record<string, BuildEntry> = {};

const BAND_LEVELS = [1, 5, 10, 20] as const;
for (const cls of CLASSES) {
  for (const level of BAND_LEVELS) {
    const b = starterBuild(cls.id, level);
    BUILDS[b.id] = b;
    const g = gearedBuild(cls.id, level);
    BUILDS[g.id] = g;
  }
}

// MINION-SUPPORT PROBES (world.forwardSummonSockets): the same archer-only
// summoner twice — bare, and with the REAL Splitting socketed straight into
// the summon skill (the crew-aware gate takes it for the bow the bones
// carry). Their A/B is the forwarding regression probe: the socketed
// build's dps_minions should sit visibly above the bare one (the archers'
// arrows split; the summon skill itself never fires a shot). The historical
// build id ('conjurer') is kept so baselines compare across the overhaul.
// RESONANCE rides every forwarded build: CREW_CFG.boarding is 'gated' — the
// key gem is the price of the whole boarding system (one socket), and the
// probes exercise the lever's ON state end-to-end.
const archerSummoner = (id: string, supports?: { id: string; level?: number }[]): BuildSpec => ({
  id, label: `Skeleton-archer summoner @ L10 (${supports ? 'Resonance + Splitting forwarded' : 'bare'})`,
  classId: 'summoner', level: 10,
  skills: [{ id: 'summon_skeleton_archer', level: gemLevelAt(10), supports }],
  passives: greedyPassives('summoner', PROGRESSION.passivePointsAtLevel(10)),
});
BUILDS['summoner_archers_l10'] = archerSummoner('summoner_archers_l10');
BUILDS['summoner_conjurer_l10'] = archerSummoner('summoner_conjurer_l10',
  [{ id: 'resonance', level: 1 }, { id: 'splitting', level: 1 }]);
// The warrior-side probe: Faultfinder forwarded onto the skeleton warriors'
// Cleave (a MELEE gem boarding a summon — refused outright before the
// overhaul), plus Tectonic Echoes riding the granted 'fissure' tag beside
// it. The warriors tear cracks as they fight and detonate them by chasing —
// dps_minions should sit above the bare warrior build.
const warriorSummoner = (id: string, supports?: { id: string; level?: number }[]): BuildSpec => ({
  id, label: `Skeleton-warrior summoner @ L10 (${supports ? 'Resonance + Faultfinder + Tectonic Echoes forwarded' : 'bare'})`,
  classId: 'summoner', level: 10,
  skills: [{ id: 'summon_skeleton', level: gemLevelAt(10), supports }],
  passives: greedyPassives('summoner', PROGRESSION.passivePointsAtLevel(10)),
});
BUILDS['summoner_warriors_l10'] = warriorSummoner('summoner_warriors_l10');
BUILDS['summoner_faultfinder_l10'] = warriorSummoner('summoner_faultfinder_l10',
  [{ id: 'resonance', level: 1 }, { id: 'faultfinder', level: 1 }, { id: 'tectonic_echoes', level: 1 }]);

// MINION-SUSTAIN LADDER (the regen family's measuring sticks): one crew, the
// regen lanes loaded one at a time — DELIBERATE HYPOTHESIS BUILDS in the
// fulminator's bare-vs-loaded shape (explicit lane-isolating picks, not
// honest average play; disconnected-pick warnings are the honest record of
// that). The lanes: BONDS = the two committed regen gems at kit level
// (vital_bond + transfusion_bond — flat+pct through the socket road), PCT =
// the committed tree smalls alone (Green Pastures + Milk and Marrow, 1.5%/s),
// RATE = those smalls with the rate chain behind them (Sweetgrass + The
// Evergreen Fold, +45% increased on both lanes) — the pct↔rate delta IS the
// new stat working through a real grantor. WRAITH legs re-ask each question
// against the decay clock (summon_wraith's compounding rot): there the
// answer is uptime, not safety — minion_samples is the read.
const sustainSummoner = (
  id: string, skillId: string,
  o: { gems?: boolean; picks?: string[] } = {},
): BuildSpec => ({
  id,
  label: `Minion-sustain ladder — ${skillId} (${o.gems ? 'bonds' : 'bare'}${o.picks?.length ? ` + ${o.picks.length} regen picks` : ''}) @ L10`,
  classId: 'summoner', level: 10,
  // The ATTRIBUTE PIN (identical on every leg, so it cancels in the A/B):
  // enough mana pool + regen to stand the crew up to its cap and keep the
  // resummon loop running, enough life to outlive the episode — a dead
  // summoner stops resummoning and the sustain read truncates. The
  // raw-hypothesis lever, used as documented.
  attributes: { wisdom: 40, willpower: 100, vitality: 40 },
  skills: [{
    id: skillId, level: gemLevelAt(10),
    supports: o.gems
      ? [{ id: 'vital_bond', level: gemLevelAt(10) }, { id: 'transfusion_bond', level: gemLevelAt(10) }]
      : undefined,
  }],
  passives: o.picks ?? [],
});
BUILDS['sustain_warriors_ctrl_l10'] = sustainSummoner('sustain_warriors_ctrl_l10', 'summon_skeleton');
BUILDS['sustain_warriors_bonds_l10'] = sustainSummoner('sustain_warriors_bonds_l10', 'summon_skeleton', { gems: true });
BUILDS['sustain_warriors_pct_l10'] = sustainSummoner('sustain_warriors_pct_l10', 'summon_skeleton',
  { picks: ['cl_sky_regen', 'cl_sky_t3'] });
BUILDS['sustain_warriors_rate_l10'] = sustainSummoner('sustain_warriors_rate_l10', 'summon_skeleton',
  { picks: ['cl_sky_regen', 'cl_sky_t3', 'cl_sky_graze', 'cl_sky_evergreen'] });
BUILDS['sustain_wraiths_ctrl_l10'] = sustainSummoner('sustain_wraiths_ctrl_l10', 'summon_wraith');
BUILDS['sustain_wraiths_bonds_l10'] = sustainSummoner('sustain_wraiths_bonds_l10', 'summon_wraith', { gems: true });
BUILDS['sustain_wraiths_rate_l10'] = sustainSummoner('sustain_wraiths_rate_l10', 'summon_wraith',
  { gems: true, picks: ['cl_sky_regen', 'cl_sky_t3', 'cl_sky_graze', 'cl_sky_evergreen'] });

// THE REGEN-AVENUE CURVE (ledger #267, ruled 2026-08-10: minionRegenPct is
// an uncapped additive build avenue BY DESIGN — no cap, no diminishing form;
// this ladder is the avenue's measured curve, so any future revisit argues
// from data). One court (summon_skeleton, cap 4), one press, ONLY the total
// minionRegenPct investment moves — the INVESTMENT axis, where the sibling
// sustain_* ladder isolates lanes. Tiers derive from the live grantor
// census (every minionRegenPct source in src/data at HEAD):
//   t0 none      0.0%/s — zero investment (control).
//   t1 cheap     1.5%/s — the two tree smalls: Green Pastures (cl_sky_regen,
//                1%) + Milk and Marrow (cl_sky_t3, 0.5%).
//   t2 committed 5.8%/s — both bond gems at the L10 kit level (gemLevelAt=4):
//                Vital Bond L4 (0.8+0.2×3 = 1.4%, +6 flat) + Transfusion
//                Bond L4 (2.0+0.3×3 = 2.9%, +6 flat, its −25% minion damage
//                rides — the lane's real price) + the smalls. All
//                game-reachable at L10.
//   t3 max      ~9.3%/s — ledger #267's committed stack: Vital Bond L5
//                (1.6%) + Transfusion Bond L5 (3.2%) + the smalls (1.5%) +
//                Den-Mended (Packwarden n3, 3%) ≈ 9.3%/s. VOCATIONS ARE NOT
//                EXPRESSIBLE in a BuildSpec (the applier pins vocations: []),
//                so the vocation share rides Transfusion Bond overleveled to
//                L15 — its perLevel is PCT-ONLY, so the flat lane stays
//                byte-identical to the real stack (7+6 = 13/s) and
//                bakeMinionOwnerStats folds the identical additive total.
// The minionRegenRate chain (Sweetgrass + Evergreen Fold, +45% increased on
// both lanes) is deliberately NOT stacked here — it multiplies whatever this
// axis measures and the sustain_* rate legs already probe it.
const regenCurveSummoner = (
  id: string,
  o: { gems?: { id: string; level: number }[]; picks?: string[] },
): BuildSpec => ({
  id,
  label: `Regen-avenue curve — summon_skeleton (${o.gems ? o.gems.map(g => `${g.id} L${g.level}`).join(' + ') : 'no gems'}${o.picks?.length ? ' + tree smalls' : ''}) @ L10`,
  classId: 'summoner', level: 10,
  // The sibling sustain ladder's attribute pin, verbatim — identical on
  // every tier so it cancels across the curve.
  attributes: { wisdom: 40, willpower: 100, vitality: 40 },
  skills: [{ id: 'summon_skeleton', level: gemLevelAt(10), supports: o.gems }],
  passives: o.picks ?? [],
});
BUILDS['regen_curve_t0_l10'] = regenCurveSummoner('regen_curve_t0_l10', {});
BUILDS['regen_curve_t1_l10'] = regenCurveSummoner('regen_curve_t1_l10',
  { picks: ['cl_sky_regen', 'cl_sky_t3'] });
// t1b — the KNEE LOCATOR (2.9%/s): Vital Bond L4 alone + the smalls. A real
// one-socket story, and the malus-free control beside t2 (no transfusion_bond
// means no −25% minion damage — the confound splitter for the siege rows).
BUILDS['regen_curve_t1b_l10'] = regenCurveSummoner('regen_curve_t1b_l10', {
  gems: [{ id: 'vital_bond', level: 4 }],
  picks: ['cl_sky_regen', 'cl_sky_t3'],
});
BUILDS['regen_curve_t2_l10'] = regenCurveSummoner('regen_curve_t2_l10', {
  gems: [{ id: 'vital_bond', level: 4 }, { id: 'transfusion_bond', level: 4 }],
  picks: ['cl_sky_regen', 'cl_sky_t3'],
});
BUILDS['regen_curve_t3_l10'] = regenCurveSummoner('regen_curve_t3_l10', {
  gems: [{ id: 'vital_bond', level: 5 }, { id: 'transfusion_bond', level: 15 }],
  picks: ['cl_sky_regen', 'cl_sky_t3'],
});

// THE IRON BELL TEXTURE PAIR (hitCap): the same sovereign, two answers. The
// ROT build stacks poison + decay — DoT ticks pass the per-hit ceiling by
// construction, so it should CRACK the colossus inside the episode. The
// BURST build is the loaded-dice nuker — every jackpot flattens to the cap
// (and reads 'capped' in-world), so it should WALL: alive between the
// steps, going nowhere. If the pair ever converges, the texture is dead.
BUILDS['ironbell_rot_l12'] = {
  id: 'ironbell_rot_l12', label: 'Venom stacker vs the Iron Bell @ L12',
  classId: 'magician', level: 12,
  skills: [{
    id: 'venom_bolt', level: gemLevelAt(12),
    supports: [{ id: 'poison_chance', level: 1 }, { id: 'putrefaction', level: 1 }],
  }],
  passives: greedyPassives('magician', PROGRESSION.passivePointsAtLevel(12)),
};
BUILDS['ironbell_burst_l12'] = {
  id: 'ironbell_burst_l12', label: 'Loaded-dice nuker vs the Iron Bell @ L12',
  classId: 'magician', level: 12,
  skills: [{
    id: 'fulminate', level: gemLevelAt(12),
    supports: [{ id: 'loaded_dice', level: 1 }],
  }],
  passives: greedyPassives('magician', PROGRESSION.passivePointsAtLevel(12)),
};

// FORTUNE-FABRIC PROBES (rollTop gates / proc riders / damageSpread): the
// same wide-dice caster twice — the bare bolt, and the full gambler (Loaded
// Dice widening the dice; the tree's Thunderstruck + Static Shrapnel rider +
// Short Circuit + All In behind it). Their A/B is the fabric's regression
// probe: the loaded build's jackpot detonations, arcs and shrapnel sparks
// are the WHOLE difference between the runs.
const fulminator = (id: string, loaded: boolean): BuildSpec => ({
  id,
  label: `Fulminate probe @ L12 (${loaded ? 'loaded dice + gambler tree' : 'bare'})`,
  classId: 'magician', level: 12,
  skills: [{
    id: 'fulminate', level: gemLevelAt(12),
    supports: loaded ? [{ id: 'loaded_dice', level: 1 }] : undefined,
  }],
  passives: loaded
    ? ['sor_x1', 'cl_gam_s1', 'cl_gam_shrapnel', 'cl_gam_short', 'cl_gam_key']
    : [],
});
BUILDS['fulminate_bare_l12'] = fulminator('fulminate_bare_l12', false);
BUILDS['fulminate_loaded_l12'] = fulminator('fulminate_loaded_l12', true);
// The variance-channel probe: intervalJitter + VarianceSpec.aoe under the
// deterministic clock — the erratic drumbeat, reproducible per seed.
BUILDS['barrage_probe_l12'] = {
  id: 'barrage_probe_l12', label: 'Unstable Barrage probe @ L12',
  classId: 'magician', level: 12,
  skills: [{ id: 'unstable_barrage', level: gemLevelAt(12) }],
  passives: [],
};
// The sequel/contagion probe: Pyroclast Bolt's completion-cast (SequelSpec)
// blooming Pyre Nova, whose contagion chains through a pack — the whole
// two-skills-in-sequence composition end-to-end.
BUILDS['pyroclast_probe_l12'] = {
  id: 'pyroclast_probe_l12', label: 'Pyroclast sequel/contagion probe @ L12',
  classId: 'magician', level: 12,
  skills: [{ id: 'pyroclast_bolt', level: gemLevelAt(12) }],
  passives: [],
};
