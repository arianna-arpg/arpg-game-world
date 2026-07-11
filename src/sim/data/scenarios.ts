// ---------------------------------------------------------------------------
// SCENARIO LIBRARY — measurements as data. Each entry answers ONE question;
// suites bundle the questions a balance pass actually asks.
//
// Factories (dummyDps / parityPack / pressure / monsterDuel) exist so adding
// a class, a level band, or a monster to the matrix is one line — the same
// registry-and-factory shape the rest of the game's content uses.
// ---------------------------------------------------------------------------

import { CLASSES } from '../../data/classes';
import { SKILLS } from '../../data/skills';
import { STARTER_CLASSES } from '../../meta/account';
import type { MonsterRarity } from '../../engine/rarity';
import type { PilotSpec, ScenarioDef } from '../types';

/** How a human plays the class, derived from its OWN bar: a spell-led kit
 *  kites at range, an attack-led kit closes in. Re-bar a class and its sim
 *  pilot follows — no per-class table to drift. */
export function pilotFor(classId: string): PilotSpec {
  const cls = CLASSES.find(c => c.id === classId);
  const first = cls?.bar.find(s => s !== null);
  const tags = first ? (SKILLS[first]?.tags as readonly string[] | undefined) : undefined;
  return tags?.includes('spell') ? { kind: 'caster' } : { kind: 'brawler' };
}

/** The canonical parity trash pack — small, mixed, early-game. Keep in sync
 *  with what a real early zone throws (crossroads' table). */
export const PARITY_PACK = [
  { id: 'zombie', count: 3 },
  { id: 'skeleton_warrior', count: 2 },
  { id: 'blood_mite', count: 1 },
];

/** Sustained single-target output vs the immortal training dummy. */
export function dummyDps(classId: string, level: number): ScenarioDef {
  return {
    id: `dummy_dps_${classId}_l${level}`,
    label: `Dummy DPS — ${classId} starter @ L${level}`,
    build: `starter_${classId}_l${level}`,
    pilot: pilotFor(classId),
    waves: [{ monsters: [{ id: 'target_dummy', level: 1 }], distance: 70 }],
    duration: 30,
    stop: 'duration',
    notes: 'dps_dummy is the headline metric; the dummy never dies (kill() resets it).',
  };
}

/** Time-to-kill a parity pack — the bread-and-butter clear feel. */
export function parityPack(classId: string, level: number): ScenarioDef {
  return {
    id: `ttk_parity_${classId}_l${level}`,
    label: `Parity pack TTK — ${classId} starter @ L${level}`,
    build: `starter_${classId}_l${level}`,
    pilot: pilotFor(classId),
    parityLevel: level,
    waves: [{ monsters: PARITY_PACK }],
    duration: 60,
    stop: 'waves_dead',
    notes: 'ttk_wave_mean + life_floor_pct: clear speed and how scary it felt.',
  };
}

/** Endless pressure — a fresh parity wave every few seconds for a minute.
 *  Measures survival (player_deaths, died_at) and sustained throughput. */
export function pressure(classId: string, level: number, everySec = 8): ScenarioDef {
  return {
    id: `pressure_${classId}_l${level}`,
    label: `Pressure waves — ${classId} starter @ L${level}`,
    build: `starter_${classId}_l${level}`,
    pilot: pilotFor(classId),
    parityLevel: level,
    waves: [{ monsters: PARITY_PACK, repeatEvery: everySec }],
    duration: 60,
    stop: 'duration',
    notes: 'kill_rate vs dps_in under unending reinforcement.',
  };
}

/** One monster, one hero, parity level — the per-monster TTK probe. */
export function monsterDuel(classId: string, level: number, monsterId: string): ScenarioDef {
  return {
    id: `duel_${monsterId}_${classId}_l${level}`,
    label: `Duel — ${monsterId} vs ${classId} @ L${level}`,
    build: `starter_${classId}_l${level}`,
    pilot: pilotFor(classId),
    parityLevel: level,
    waves: [{ monsters: [{ id: monsterId, count: 1 }] }],
    duration: 45,
    stop: 'waves_dead',
  };
}

// ------------------------------------------------------------ the registry --

export const SCENARIOS: Record<string, ScenarioDef> = {};
function add(s: ScenarioDef): void { SCENARIOS[s.id] = s; }

for (const classId of STARTER_CLASSES) {
  add(dummyDps(classId, 1));
  add(dummyDps(classId, 5));
  add(dummyDps(classId, 10));
  add(parityPack(classId, 1));
  add(parityPack(classId, 5));
  add(parityPack(classId, 10));
  add(pressure(classId, 5));
}
for (const m of ['zombie', 'skeleton_warrior', 'blood_mite']) {
  add(monsterDuel('warrior', 5, m));
}

// MINION-SUPPORT PROBE PAIRS (world.forwardSummonSockets): summoners under a
// slow zombie drip, bare vs forwarded gems on the summon skill. dps_minions
// is the headline — the hero carries NO attack skill, the gems board the
// MINIONS' own skills, so the crew's behavior is the whole difference
// between the runs. Archers: real Splitting straight into the summon (the
// arrows split). Warriors: Faultfinder + Tectonic Echoes (the Cleave tears
// fissures; the warriors detonate them by chasing). (Not dummy scenarios:
// minion AI ignores passive scenery, so minion probes need targets that
// fight back.)
for (const build of [
  'summoner_archers_l10', 'summoner_conjurer_l10',
  'summoner_warriors_l10', 'summoner_faultfinder_l10',
]) {
  add({
    id: `minion_probe_${build}`,
    label: `Minion-support probe — ${build}`,
    build,
    pilot: { kind: 'caster' },
    parityLevel: 10,
    waves: [{ monsters: [{ id: 'zombie', count: 2 }], repeatEvery: 8 }],
    duration: 45,
    stop: 'duration',
    notes: 'A/B probe for support forwarding: compare dps_minions across each bare/forwarded pair.',
  });
}

// FORTUNE-FABRIC PROBE PAIR (rollTop procs, the Static Shrapnel rider,
// damageSpread) plus the variance channel: bare vs loaded Fulminate against
// the dummy — the loaded build's jackpot payloads are the entire A/B
// difference — and Unstable Barrage's jittered, size-rolled channel run
// end-to-end under the deterministic clock.
for (const build of ['fulminate_bare_l12', 'fulminate_loaded_l12']) {
  add({
    id: `fortune_probe_${build}`,
    label: `Fortune-fabric probe — ${build}`,
    build,
    pilot: { kind: 'caster' },
    waves: [{ monsters: [{ id: 'target_dummy', level: 1 }], distance: 70 }],
    duration: 30,
    stop: 'duration',
    notes: 'A/B probe for the fortune fabric: compare dps_dummy bare vs loaded — the gap is the fabric firing.',
  });
}
add({
  id: 'fortune_probe_barrage',
  label: 'Fortune-fabric probe — unstable barrage channel',
  build: 'barrage_probe_l12',
  pilot: { kind: 'caster' },
  waves: [{ monsters: [{ id: 'target_dummy', level: 1 }], distance: 70 }],
  duration: 20,
  stop: 'duration',
  notes: 'Exercises ChannelSpec.intervalJitter + VarianceSpec.aoe deterministically (crash/regression net).',
});

// --------------------------------------------------------------- matchups --

/** Matchup knobs — the instrument's defaults, adjustable per call. */
export const MATCHUP_CFG = {
  /** Sim-seconds per matchup episode. Long enough for several kill cycles
   *  against a tanky texture at parity investment. */
  duration: 45,
  /** Seconds between a cycle's last death and the next fresh body. */
  respawnDelay: 1.0,
};

/** THE MATCHUP DUEL: one build against an endless supply of ONE monster,
 *  each kill cycle a fresh body (poise bars, shells, ES re-armed). Headline
 *  metrics: edps_cycle_mean (output into that texture), ttk_wave_mean,
 *  dps_in / life_floor_pct (what it costs to stand there). This is the
 *  skill-×-enemy-texture axis: run it over a target panel and the spread
 *  across textures IS the interaction finding. */
export function matchupDuel(
  buildId: string,
  monsterId: string,
  opts: {
    level?: number; count?: number; rarity?: MonsterRarity;
    duration?: number; pilot?: PilotSpec; idTag?: string;
  } = {},
): ScenarioDef {
  const count = opts.count ?? 1;
  const bits = [
    'matchup', opts.idTag ?? buildId, 'vs', monsterId,
    ...(count > 1 ? [`x${count}`] : []),
    ...(opts.rarity && opts.rarity !== 'normal' ? [opts.rarity] : []),
    ...(opts.level !== undefined ? [`l${opts.level}`] : []),
  ];
  return {
    id: bits.join('_'),
    label: `Matchup — ${buildId} vs ${monsterId}${opts.rarity ? ` (${opts.rarity})` : ''}`,
    build: buildId,
    pilot: opts.pilot,
    ...(opts.level !== undefined ? { parityLevel: opts.level } : {}),
    waves: [{
      monsters: [{ id: monsterId, ...(opts.level !== undefined ? { level: opts.level } : {}), count, ...(opts.rarity ? { rarity: opts.rarity } : {}) }],
      respawnOnClear: MATCHUP_CFG.respawnDelay,
    }],
    duration: opts.duration ?? MATCHUP_CFG.duration,
    stop: 'duration',
    notes: 'edps_cycle_mean = effective DPS into this texture; dps_in/life_floor_pct = the price of the fight.',
  };
}

// Curated early matchups: both starter archetypes across confirmed texture
// seats (the parity trio + the two shell lessons). Panel-driven sweeps cover
// the rest — these exist so `run --suite matchups` answers the everyday
// "did a data change move a texture interaction" question cheaply.
for (const classId of ['warrior', 'magician']) {
  for (const m of ['zombie', 'skeleton_warrior', 'blood_mite', 'tide_whelk', 'bulwark_scuttler']) {
    add(matchupDuel(`starter_${classId}_l5`, m, { level: 5, pilot: pilotFor(classId) }));
  }
}

// ------------------------------------------------------------------ suites --

/** Named bundles: the unit a balance pass (or a CI gate) runs. */
export const SUITES: Record<string, string[]> = {
  /** Fast confidence check — run after ANY data change. */
  smoke: [
    'dummy_dps_warrior_l1',
    'ttk_parity_warrior_l5',
    'ttk_parity_magician_l5',
  ],
  /** The three starter classes across the early bands. */
  starters: STARTER_CLASSES.flatMap(c => [
    `dummy_dps_${c}_l1`, `dummy_dps_${c}_l5`, `dummy_dps_${c}_l10`,
    `ttk_parity_${c}_l1`, `ttk_parity_${c}_l5`, `ttk_parity_${c}_l10`,
  ]),
  /** Survival under reinforcement. */
  pressure: STARTER_CLASSES.map(c => `pressure_${c}_l5`),
  /** Per-monster duel probes. */
  duels: Object.keys(SCENARIOS).filter(id => id.startsWith('duel_')),
  /** The minion-support forwarding A/B pairs (bare vs forwarded gems). */
  minions: Object.keys(SCENARIOS).filter(id => id.startsWith('minion_probe_')),
  /** Curated texture matchups (starter archetypes × confirmed texture seats). */
  matchups: Object.keys(SCENARIOS).filter(id => id.startsWith('matchup_')),
  /** The fortune-fabric probes (rollTop gates, riders, spread, variance). */
  fortune: Object.keys(SCENARIOS).filter(id => id.startsWith('fortune_probe_')),
  /** Everything registered. */
  all: [], // filled below
};
SUITES.all = Object.keys(SCENARIOS);
