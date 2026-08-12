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

/** THE ORBITER RULE, single-target lanes only (2026-08-12, the guardian
 *  geared-mute — compat.ts soloPilot's own law): a tethered orbiter grinds
 *  its wheel at the body, and against ONE stationary target the caster
 *  band holds its blades a knife's-edge short — the guardian's dummy row
 *  was measuring spiral phase against the band (bare grazed exactly 8,
 *  geared exactly 0, every seed), so an orbit-led kit walks up instead.
 *  Pack lanes keep pilotFor's kiting band: standing in a parity pack is
 *  not how an orbit-led kit plays, and the brawler stance measurably
 *  killed the guardian's working parity clears. */
export function singleTargetPilotFor(classId: string): PilotSpec {
  const cls = CLASSES.find(c => c.id === classId);
  const first = cls?.bar.find(s => s !== null);
  const def = first ? SKILLS[first] : undefined;
  const traj = (def?.delivery as { trajectory?: { orbit?: number } } | undefined)?.trajectory;
  if ((traj?.orbit ?? 0) > 0) return { kind: 'brawler' };
  return pilotFor(classId);
}

/** The canonical parity trash pack — small, mixed, early-game. Keep in sync
 *  with what a real early zone throws (crossroads' table). */
export const PARITY_PACK = [
  { id: 'zombie', count: 3 },
  { id: 'skeleton_warrior', count: 2 },
  { id: 'blood_mite', count: 1 },
];

/** Optional build swap for the standard questions: `tier` names a BUILDS
 *  prefix ('starter' | 'geared' | any future wardrobe tier) — scenario ids
 *  carry the non-default tier so bands and baselines stay distinct. */
export interface TierOpt { tier?: 'starter' | 'geared' }
const tierOf = (o?: TierOpt): string => o?.tier ?? 'starter';
const tierTag = (o?: TierOpt): string => (tierOf(o) === 'starter' ? '' : `${tierOf(o)}_`);

/** Sustained single-target output vs the immortal training dummy. */
export function dummyDps(classId: string, level: number, opts?: TierOpt): ScenarioDef {
  return {
    id: `dummy_dps_${tierTag(opts)}${classId}_l${level}`,
    label: `Dummy DPS — ${classId} ${tierOf(opts)} @ L${level}`,
    build: `${tierOf(opts)}_${classId}_l${level}`,
    pilot: singleTargetPilotFor(classId),
    waves: [{ monsters: [{ id: 'target_dummy', level: 1 }], distance: 70 }],
    duration: 30,
    stop: 'duration',
    notes: 'dps_dummy is the headline metric; the dummy never dies (kill() resets it).',
  };
}

/** Time-to-kill a parity pack — the bread-and-butter clear feel. */
export function parityPack(classId: string, level: number, opts?: TierOpt): ScenarioDef {
  return {
    id: `ttk_parity_${tierTag(opts)}${classId}_l${level}`,
    label: `Parity pack TTK — ${classId} ${tierOf(opts)} @ L${level}`,
    build: `${tierOf(opts)}_${classId}_l${level}`,
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
    pilot: singleTargetPilotFor(classId),
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
  // THE GEARED TWINS: same questions, dressed (see GEARED_CFG). The
  // bare↔geared delta at each band IS the measured value of found gear —
  // and the tier where gear-affecting fixes stop being invisible to suites.
  for (const level of [5, 10, 20]) {
    add(dummyDps(classId, level, { tier: 'geared' }));
    add(parityPack(classId, level, { tier: 'geared' }));
  }
  add(dummyDps(classId, 20));
  add(parityPack(classId, 20));
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

// MINION-SUSTAIN PROBES (the minion-regen family end-to-end): a summoner
// crew under a steady parity press hard enough that crew regeneration is
// load-bearing — the pauses between kill cycles are where regen either
// refills the court or doesn't. minion_samples (living crew-seconds) is the
// headline sustain read, beside dps_minions/kill_rate (throughput kept
// standing) and dps_in/life_floor_pct (what reached the summoner). The
// ladder legs isolate one regen lane each (see the sustain builds); the two
// reference summoners run the same waves so the ladder anchors to honest
// average play. WRAITH legs ask the decay-clock question — how much crew
// uptime each lane of regen investment buys against compounding rot.
for (const build of [
  'summoner_warriors_l10', 'summoner_archers_l10',
  'sustain_warriors_ctrl_l10', 'sustain_warriors_bonds_l10',
  'sustain_warriors_pct_l10', 'sustain_warriors_rate_l10',
  'sustain_wraiths_ctrl_l10', 'sustain_wraiths_bonds_l10',
  'sustain_wraiths_rate_l10',
]) {
  add({
    id: `minion_sustain_${build}`,
    label: `Minion-sustain probe — ${build}`,
    build,
    // The court-keeper: refill the crew whenever it dips below cap (the
    // default layout would open the summon ONCE and never resummon — the
    // whole upkeep loop this stick exists to measure).
    pilot: { kind: 'summoner' },
    parityLevel: 10,
    waves: [{
      monsters: [{ id: 'zombie', count: 2 }, { id: 'skeleton_warrior', count: 1 }],
      repeatEvery: 8,
    }],
    duration: 60,
    stop: 'duration',
    notes: 'Sustain ladder: minion_samples = crew-seconds kept standing; compare legs pairwise — ctrl→bonds/pct (committed dials), pct→rate (the minionRegenRate forward working). Press tuned to WOUND the standing crew, not delete it.',
  });
}

// THE REGEN-AVENUE CURVE (ledger #267, ruled 2026-08-10: uncapped
// minionRegenPct IS a build avenue — this family is its measured curve).
// One reference court (summon_skeleton ×4, the court-keeper refilling it)
// under sustained pressure, at four TOTAL-investment tiers (see the
// regen_curve_* builds for the grantor derivations):
//   t0 0%/s · t1 1.5%/s (tree smalls) · t1b 2.9%/s (Vital Bond L4 +
//   smalls — the knee locator, malus-free) · t2 5.8%/s (both bond gems
//   L4 + smalls) · t3 ~9.3%/s (ledger #267's max stack — gems L5 +
//   smalls + the vocation share carried by pct-only overlevel).
// Two press grades ask the curve twice: 'press' is the sibling sustain
// ladder's exact wave grammar (the cross-family anchor — wounds the crew,
// doesn't delete it), 'siege' throws the same species harder (regen must
// carry bodies through back-to-back engagements or the court thins).
// Reads: minions_mean (court uptime vs cap 4) + minion_deaths ranks the
// tiers; heal_minions_ps is the effective (post-clip) healing actually
// landed — where it saturates, investment past that tier buys nothing
// AGAINST THIS PRESS; dps_minions/kill_rate carry the throughput story
// (transfusion_bond's −25% minion damage is the lane's real price).
for (const build of ['regen_curve_t0_l10', 'regen_curve_t1_l10', 'regen_curve_t1b_l10', 'regen_curve_t2_l10', 'regen_curve_t3_l10']) {
  const tier = build.replace('regen_curve_', '').replace('_l10', '');
  add({
    id: `regen_curve_${tier}_press_l10`,
    label: `Regen-avenue curve — ${tier} under the standard press`,
    build,
    pilot: { kind: 'summoner' },
    parityLevel: 10,
    waves: [{
      monsters: [{ id: 'zombie', count: 2 }, { id: 'skeleton_warrior', count: 1 }],
      repeatEvery: 8,
    }],
    duration: 60,
    stop: 'duration',
    notes: 'Investment-tier ladder, standard press: rank tiers by minions_mean/minion_deaths; heal_minions_ps is the effective sustain landed.',
  });
  add({
    id: `regen_curve_${tier}_siege_l10`,
    label: `Regen-avenue curve — ${tier} under siege`,
    build,
    pilot: { kind: 'summoner' },
    parityLevel: 10,
    waves: [{
      monsters: [{ id: 'zombie', count: 3 }, { id: 'skeleton_warrior', count: 2 }],
      repeatEvery: 6,
    }],
    duration: 60,
    stop: 'duration',
    notes: 'Investment-tier ladder, heavy press: where the deep tiers separate — or fail to (saturation is a finding, not a bug).',
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
add({
  id: 'fortune_probe_pyroclast',
  label: 'Sequel/contagion probe — pyroclast chain vs a pack',
  build: 'pyroclast_probe_l12',
  pilot: { kind: 'caster' },
  parityLevel: 12,
  waves: [{ monsters: [{ id: 'zombie', count: 4 }], repeatEvery: 10 }],
  duration: 30,
  stop: 'duration',
  notes: 'SequelSpec completion-cast (bolt→nova at the death point) + ContagionSpec chain through the pack; kill_rate is the signal.',
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

// THE IRON BELL TEXTURE PROBE (hitCap) — the INVERSION is the claim. On the
// training dummy the loaded-dice burst build far outguns the venom stacker;
// into the Iron Bell the order FLIPS: every jackpot flattens to the per-hit
// ceiling (dps_out collapses toward cap × cast rate) while poison ticks
// pass the cap whole (applyDot never enters mitigateTyped). The dummy rows
// are the control, the matchup rows the claim; if the four numbers ever
// stop inverting, the texture died silently — investigate before shipping.
add({
  id: 'ironbell_ctrl_rot_dummy', label: 'Iron Bell control — venom stacker vs dummy',
  build: 'ironbell_rot_l12', pilot: pilotFor('magician'),
  waves: [{ monsters: [{ id: 'target_dummy', level: 1 }], distance: 70 }],
  duration: 30, stop: 'duration',
  notes: 'Control leg of the hitCap inversion — compare with matchup_ironbell_rot.',
});
add({
  id: 'ironbell_ctrl_burst_dummy', label: 'Iron Bell control — loaded-dice nuker vs dummy',
  build: 'ironbell_burst_l12', pilot: pilotFor('magician'),
  waves: [{ monsters: [{ id: 'target_dummy', level: 1 }], distance: 70 }],
  duration: 30, stop: 'duration',
  notes: 'Control leg of the hitCap inversion — compare with matchup_ironbell_burst.',
});
add(matchupDuel('ironbell_rot_l12', 'primeval_ironbell',
  { level: 12, pilot: pilotFor('magician'), duration: 240 }));
add(matchupDuel('ironbell_burst_l12', 'primeval_ironbell',
  { level: 12, pilot: pilotFor('magician'), duration: 240 }));

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
  /** The minion-regen sustain ladder (crew uptime per regen lane). */
  sustain: Object.keys(SCENARIOS).filter(id => id.startsWith('minion_sustain_')),
  /** The regen-avenue investment curve (ledger #267): one court, four
   *  minionRegenPct totals, two press grades. */
  regencurve: Object.keys(SCENARIOS).filter(id => id.startsWith('regen_curve_')),
  /** THE GEAR VALUE CURVE: bare vs geared twins at the measurement bands —
   *  read as pairs (dps ratio, ttk ratio); the spread across bands is the
   *  found-gear power curve. */
  gearvalue: STARTER_CLASSES.flatMap(c => [5, 10, 20].flatMap(l => [
    `dummy_dps_${c}_l${l}`, `dummy_dps_geared_${c}_l${l}`,
    `ttk_parity_${c}_l${l}`, `ttk_parity_geared_${c}_l${l}`,
  ])).filter(id => !!SCENARIOS[id]),
  /** The fortune-fabric probes (rollTop gates, riders, spread, variance). */
  fortune: Object.keys(SCENARIOS).filter(id => id.startsWith('fortune_probe_')),
  /** Curated texture matchups (starter archetypes × confirmed texture seats). */
  matchups: Object.keys(SCENARIOS).filter(id => id.startsWith('matchup_')),
  /** The Iron Bell defense-texture INVERSION (hitCap): the burst build wins
   *  the dummy and loses the bell; the rot build the reverse. Four rows. */
  ironbell: Object.keys(SCENARIOS).filter(id =>
    id.startsWith('matchup_ironbell_') || id.startsWith('ironbell_ctrl_')),
  /** Everything registered. */
  all: [], // filled below
};
SUITES.all = Object.keys(SCENARIOS);
