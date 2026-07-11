// ---------------------------------------------------------------------------
// REFERENCE BUILDS — the measuring sticks. Open registry: add an entry, and
// every CLI command (run/sweep/manifest) can see it by id. Keep these HONEST
// representatives of what a real character has at that level, because target
// bands are calibrated against them.
//
// Naming: <who>_<level-band>. Levels come with an intended gem level via
// GEM_LEVEL_AT so "a level-10 kit" means the same thing across builds.
// ---------------------------------------------------------------------------

import { CLASSES } from '../../data/classes';
import { PASSIVE_ADJACENCY, classStartNode } from '../../data/passives';
import type { BuildEntry, BuildSpec } from '../types';

/** Roughly how a gem keeps pace with character level, absent fancy play.
 *  A deliberate, documented assumption — change it HERE, not per-build. */
export function gemLevelAt(charLevel: number): number {
  return Math.max(1, Math.floor(charLevel / 3) + 1);
}

/** Deterministic greedy tree: breadth-first from the class start node, ties
 *  broken alphabetically. Not OPTIMAL play — honest AVERAGE play: a level-L
 *  character has spent ~L points near home. Derived from the live graph, so
 *  tree edits reshape every reference build with zero edits here. */
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
 *  a level's worth of nearby passives spent (1/level — PROGRESSION's rate). */
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
    passives: greedyPassives(classId, level),
  };
}

/** The registry. Starter kits at the canonical measurement bands, minted from
 *  the LIVE class bars (re-bar a class and these follow, zero edits here).
 *  Holds authored BuildSpecs AND save-backed builds (SavedBuild): the CLI
 *  auto-registers balance/players/*.json as player_<name> and `save:` refs
 *  on demand, so a real character is addressable wherever a build id is. */
export const BUILDS: Record<string, BuildEntry> = {};

const BAND_LEVELS = [1, 5, 10, 20] as const;
for (const cls of CLASSES) {
  for (const level of BAND_LEVELS) {
    const b = starterBuild(cls.id, level);
    BUILDS[b.id] = b;
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
  passives: greedyPassives('summoner', 10),
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
  passives: greedyPassives('summoner', 10),
});
BUILDS['summoner_warriors_l10'] = warriorSummoner('summoner_warriors_l10');
BUILDS['summoner_faultfinder_l10'] = warriorSummoner('summoner_faultfinder_l10',
  [{ id: 'resonance', level: 1 }, { id: 'faultfinder', level: 1 }, { id: 'tectonic_echoes', level: 1 }]);

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
