/** Repeatable progression diagnostics, not a pass/fail balance gate.
 * Run: npx tsx balance/audit_tacticprogression.ts [--seeds 10]
 * Reports preserve per-episode warnings, deaths and survivor-only clear times. */
import { mkdirSync, writeFileSync } from 'node:fs';
import { join } from 'node:path';
import { runScenario } from '../src/sim/runner';
import { starterBuild } from '../src/sim/data/builds';
import { parityPack } from '../src/sim/data/scenarios';
import { MONSTERS } from '../src/data/monsters';
import type { BrainDef } from '../src/engine/brain';
import type { BuildSpec, ScenarioDef } from '../src/sim/types';

const argv = process.argv.slice(2);
const seedsAt = argv.indexOf('--seeds');
const seeds = seedsAt < 0 ? 10 : Number(argv[seedsAt + 1]);
if (!Number.isInteger(seeds) || seeds < 1) throw Error('--seeds must be a positive integer');
const baseSeed = 0xa11ce;
const dir = join('balance', 'reports', `tacticprogression_${seeds}`);
const results: ReturnType<typeof runScenario>[] = [];
function partial(classId: string, level: number): BuildSpec {
  return { ...starterBuild(classId, level), id: `partial_${classId}_${level}`,
    // Two ordinary, stale pieces; no nine-slot wardrobe or favorable affixes.
    gearSeed: 0x9ea7ed,
    gear: ['chest', 'boots'].map(slot => ({ slot, rarity: 'common', ilvl: 3 })),
  };
}
function run(scenario: ScenarioDef) {
  const result = runScenario(scenario, { seeds, baseSeed });
  results.push(result);
  const m = result.report.metrics;
  console.log(`${scenario.id}: deaths ${result.episodes.filter(e => e.ended === 'player_dead').length}/${seeds},`
    + ` life floor ${m.life_floor_pct?.mean}%, incoming DPS ${m.dps_in?.mean}, warnings ${m.warning_count?.mean}`);
  if (result.episodes.some(e => e.ended === 'error' || e.warnings.length)) {
    throw Error(`Invalid measurement: ${scenario.id}; ${JSON.stringify(result.report.warnings)}`);
  }
}

for (const cls of ['warrior', 'magician', 'summoner']) {
  for (const level of [3, 5, 8, 10]) {
    run({ ...parityPack(cls, level), id: `partial_parity_${cls}_${level}`, build: partial(cls, level) });
  }
}

const saved = new Map(Object.values(MONSTERS).map(d => [d.id, d.brain]));
// Ablate only the level gates introduced by this pass. All recovery, budgets,
// skill ranks, equipment, pilots and spawn conditions are identical between
// variants. Fresh brain objects avoid the normalizer's identity cache.
function ungated(brain: BrainDef | undefined): BrainDef | undefined {
  if (!brain?.rules?.some(r => r.when.minLevel !== undefined)) return brain;
  return { ...brain, rules: brain.rules.map(rule => {
    const { minLevel: _level, ...when } = rule.when;
    return { ...rule, when };
  }) };
}
const encounters = {
  ranged: [{ id: 'skeleton_archer', count: 2 }, { id: 'thorn_sprite', count: 1 }],
  bandits: [{ id: 'bandit_matchlock', count: 1 }, { id: 'bandit_cutthroat', count: 2 }],
  grove: [{ id: 'grove_singer', count: 1 }, { id: 'sylvan_warden', count: 2 }],
};
try {
  for (const [label, monsters] of Object.entries(encounters)) {
    for (const cls of ['warrior', 'magician']) for (const level of [5, 8, 10]) {
      for (const variant of ['ungated', 'progressive']) {
        for (const [id, brain] of saved) MONSTERS[id].brain = variant === 'ungated' ? ungated(brain) : brain;
        run({ ...parityPack(cls, level), id: `${label}_${cls}_${level}_${variant}`,
          build: partial(cls, level), waves: [{ monsters }] });
      }
    }
  }
} finally {
  for (const [id, brain] of saved) MONSTERS[id].brain = brain;
}
mkdirSync(dir, { recursive: true });
writeFileSync(join(dir, 'report.json'), JSON.stringify({ seeds, baseSeed, results }, null, 2));
console.log(`Report: ${dir}/report.json`);
