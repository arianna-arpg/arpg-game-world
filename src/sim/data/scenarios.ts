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
  /** Everything registered. */
  all: [], // filled below
};
SUITES.all = Object.keys(SCENARIOS);
