// ---------------------------------------------------------------------------
// The farm's own checks: planning, statistics, knobs, genomes, the pilot laws.
// Run by scripts/test-balance-farm.mjs. Prints SELFTEST OK or throws. Fast on
// purpose (seconds): the machine's end-to-end test is `npm run farm -- rehearse`.
// ---------------------------------------------------------------------------

import assert from 'node:assert/strict';
import { bootSimEngine, makeSimWorld } from '../../src/sim/arena';
import { applyBuild } from '../../src/sim/builds';
import { BUILD_TIERS } from '../../src/sim/data/builds';
import { SPAR_CFG } from '../../src/sim/data/sparring';
import { MONSTERS } from '../../src/data/monsters';
import { SKILLS } from '../../src/data/skills';
import { CLASSES } from '../../src/data/classes';
import { applyKnobs, parseKnob } from '../../src/sim/knobs';
import { runEpisode } from '../../src/sim/runner';
import {
  buildCatalog, canonicalGenome, coveringRow, decodeGenome, encodeGenome, factorsOf, genomeKey,
  genomeToBuild, mutateGenome, randomGenome,
} from '../../src/sim/search/space';
import { emptyArchive, enterArchive, legalityOf, mergeArchives, wouldEnter, type EvalResult } from '../../src/sim/search/engine';
import { mulberry32 } from '../../src/sim/rng';
import { benjaminiHochberg, fitMainEffects, pairedRead, readCohort, signFlipP } from '../../src/sim/stats';
import { resolveScenarioRef, progressionDefs } from '../../src/sim/sweeps';
import { runWhatIf } from '../../src/sim/whatif';
import { diffRows, nightKey } from './cli';
import { packUnits, type FarmUnit } from './lanes';

bootSimEngine();

// --- planning ---------------------------------------------------------------
{
  const units: FarmUnit[] = [10, 9, 8, 7, 6, 5, 4, 3, 2, 1].map(n => ({ id: `u${n}`, lane: 'x', argv: [], estSec: n * 100, estEpisodes: n }));
  const jobs = packUnits(units, 3);
  assert.equal(jobs.flatMap(j => j.units).length, units.length, 'packing keeps every unit');
  const loads = jobs.map(j => j.estSec);
  assert.ok(Math.max(...loads) - Math.min(...loads) <= 200, `longest-first packing stays even: ${loads}`);
  assert.deepEqual(jobs.map(j => j.units.map(u => u.id)), packUnits(units, 3).map(j => j.units.map(u => u.id)), 'packing is deterministic');
  assert.equal(nightKey(new Date('2026-10-31T03:30:00Z')), '2026-10-30', 'before 04:00 UTC is still the previous night');
  assert.equal(nightKey(new Date('2026-10-31T15:00:00Z')), '2026-10-31', 'a cron hours late is still tonight');
}

// --- statistics -------------------------------------------------------------
{
  const rows = Array.from({ length: 30 }, (_, i) => ({ id: `r${i}`, value: 10 + (i % 5) }));
  rows.push({ id: 'huge', value: 500 }, { id: 'zero', value: 0 });
  const c = readCohort('c', rows);
  assert.equal(c.rows.find(r => r.id === 'zero'), undefined, 'zeros are triage, never ranked');
  const huge = c.rows.find(r => r.id === 'huge')!;
  assert.ok(huge.z > 3 && huge.ratio > 10, `an outlier reads as one: z=${huge.z}`);
  assert.ok(c.median < 15, 'the outlier does not drag the center');
  const same = pairedRead([1, 2, 3], [1, 2, 3], 1);
  assert.equal(same.verdict, 'identical');
  const flip = pairedRead([10, 30, 10, 30, 10, 30], [12, 28, 12, 28, 12, 31], 2);
  assert.equal(flip.verdict, 'coin_flip', '|Δ| under the row\'s own sd is a coin flip');
  const real = pairedRead([10, 10.5, 9.5, 10, 10.2, 9.8, 10, 10.1], [20, 20.4, 19.5, 20.1, 20.2, 19.8, 20, 20.3], 3);
  assert.equal(real.verdict, 'moved');
  assert.ok(real.lo > 9 && real.hi < 11);
  assert.ok(signFlipP([1, 1, 1, 1, 1, 1, 1, 1], 4) < 0.02);
  assert.deepEqual([...benjaminiHochberg([0.001, 0.9, 0.002, 0.8], 0.05)].sort(), [0, 2]);
  const fit = fitMainEffects([
    ...Array.from({ length: 40 }, () => ({ y: 1, factors: ['a'] })),
    ...Array.from({ length: 40 }, () => ({ y: 3, factors: ['b'] })),
  ]);
  assert.ok(fit.effects.b.effect - fit.effects.a.effect > 1.5, 'main effects separate the factors');
  const moved = diffRows({ a: { v: 100, sd: 1 }, b: { v: 100, sd: 50 }, c: { v: 100, sd: 1 } }, { a: { v: 150, sd: 1 }, b: { v: 140, sd: 50 }, c: { v: 102, sd: 1 } });
  assert.deepEqual(moved.map(m => m.key), ['a'], 'a move inside its own noise, or under 10%, is not a move');
}

// --- knobs ------------------------------------------------------------------
{
  assert.deepEqual([parseKnob('skills.x.cooldown*0.9').op, parseKnob('skills.x.cooldown=3').op, parseKnob('monsters.y.base.life+10').op], ['mul', 'set', 'add']);
  assert.equal(parseKnob('supports.s.mods[stat=damage].value=-0.1').path, 'supports.s.mods[stat=damage].value');
  assert.equal(parseKnob('skills.x.baseDamage.*.0*2').path, 'skills.x.baseDamage.*.0', 'a * after a dot is a wildcard');
  assert.throws(() => parseKnob('skills.x.cooldown'), /want/);
  const before = MONSTERS.zombie.base.life;
  const a = applyKnobs([parseKnob('monsters.zombie.base.life*2')]);
  assert.equal(MONSTERS.zombie.base.life, (before ?? 0) * 2);
  assert.equal(a.touched.length, 1);
  a.restore();
  assert.equal(MONSTERS.zombie.base.life, before, 'restore undoes everything');
  const damaged = Object.values(SKILLS).find(s => s.baseDamage && Object.keys(s.baseDamage).length)!;
  const snapshot = JSON.stringify(damaged.baseDamage);
  const b = applyKnobs([parseKnob(`skills.${damaged.id}.baseDamage*0.5`)]);
  assert.ok(b.touched.length >= 2, 'a scale fans out across the numeric leaves');
  b.restore();
  assert.equal(JSON.stringify(damaged.baseDamage), snapshot);
  const bad = applyKnobs([parseKnob('skills.no_such_skill.cooldown*2')]);
  assert.ok(bad.errors.length > 0, 'a path that matches nothing says so');
  bad.restore();
  // A live knob reaches the engine, and a dead one reads as a no-op.
  const scenario = resolveScenarioRef('skill:cleave:5');
  const res = runWhatIf({ knobs: ['skills.cleave.baseDamage*2'], scenarios: [scenario], seeds: 1, baseSeed: 11, metrics: ['dps_dummy'] });
  assert.equal(res.rows[0].identical, false, 'doubling damage changes the episode');
  assert.ok(res.rows[0].metrics.dps_dummy.after > res.rows[0].metrics.dps_dummy.before * 1.3);
  const noop = runWhatIf({ knobs: ['monsters.zombie.base.life*2'], scenarios: [scenario], seeds: 1, baseSeed: 11 });
  assert.equal(noop.rows[0].identical, true, 'a value this scenario never reads is reported as reaching nothing');
}

// --- genomes ----------------------------------------------------------------
{
  const cat = buildCatalog();
  const r = mulberry32(99);
  const g = randomGenome(cat, r);
  const token = encodeGenome(g);
  assert.deepEqual(canonicalGenome(decodeGenome(token)), canonicalGenome(g), 'a token round-trips');
  assert.equal(genomeKey(decodeGenome(token)), genomeKey(g), 'a key survives the round trip');
  assert.deepEqual(genomeToBuild(g, 'x'), genomeToBuild(g, 'x'), 'decoding is pure');
  assert.ok(factorsOf(g).includes(`class:${g.cls}`));
  assert.equal(genomeKey(coveringRow(7, cat, 3)), genomeKey(coveringRow(7, cat, 3)), 'a covering row is a pure function of its index');
  const seenClass = new Set(Array.from({ length: cat.classes.length * 2 }, (_, i) => coveringRow(i, cat, 3).cls));
  assert.ok(seenClass.size > cat.classes.length * 0.8, `the rows walk the class axis: ${seenClass.size}/${cat.classes.length}`);
  // Real gates: a generated build's passives connect, its budget holds, its gems fit.
  let legal = 0;
  for (let i = 0; i < 6; i++) {
    const c = i % 2 ? coveringRow(i, cat, 3) : mutateGenome(randomGenome(cat, r), cat, r);
    const why = legalityOf(c, genomeToBuild(c, `t${i}`));
    if (!why || /needs /.test(why)) legal++;
    else assert.fail(`only attribute shortfalls may refuse a generated genome, got: ${why}`);
  }
  assert.equal(legal, 6);
  // The archive's halving door.
  const a = emptyArchive(1);
  const ev = (value: number, key: string): EvalResult => ({
    key, genome: g, stage: 1, seeds: 3, episodes: 6, cell: 'L5|melee|physical',
    objectives: { offense: value, clear: 1, survive: 50 }, sd: { offense: 1 },
  });
  assert.ok(wouldEnter(a, ev(10, 'a')));
  enterArchive(a, ev(10, 'a'), 'n');
  assert.equal(wouldEnter(a, ev(10, 'a')), false, 'a tie changes nothing');
  assert.ok(wouldEnter(a, ev(20, 'b')), 'a new ceiling enters');
  assert.ok(wouldEnter(a, ev(5, 'c')), 'a new floor enters');
  const other = emptyArchive(1);
  enterArchive(other, ev(99, 'z'), 'n');
  mergeArchives(a, other);
  assert.equal(a.best.offense['L5|melee|physical'].value, 99, 'merge keeps the more extreme row');
  assert.equal(a.worst.offense['L5|melee|physical'].value, 10, 'merge keeps the floor too');
}

// --- the instrument ---------------------------------------------------------
{
  assert.ok(MONSTERS[SPAR_CFG.id], 'the sparring partner registers at boot');
  assert.ok(!Object.keys(MONSTERS[SPAR_CFG.id]).includes('passive'), 'the partner is a real threat');
  for (const tier of Object.keys(BUILD_TIERS)) {
    for (const cls of CLASSES.slice(0, 4)) {
      const w = makeSimWorld(cls.id, 1);
      const warnings = applyBuild(w, BUILD_TIERS[tier](cls.id, 20), 1);
      assert.deepEqual(warnings, [], `${tier} ${cls.id} is a clean reference build`);
    }
  }
  assert.equal(progressionDefs({ classIds: ['warrior'], levels: [1, 5], tiers: ['geared'], lanes: ['dummy', 'spar'] }).length, 6, 'a wardrobe tier skips level 1');
  // The laws that closed the expressibility wall, one kit each.
  const casts = (ref: string): Record<string, { presses: number }> => runEpisode(resolveScenarioRef(ref), 5).casts;
  assert.ok((casts('dummy:assassin:5').rend?.presses ?? 0) > 0, 'a refused target gate no longer starves the primary');
  assert.ok((casts('dummy:flagellant:5').improvised_strike?.presses ?? 0) > 0, 'a bar with nothing to swing presses the floor');
  const spar = runEpisode(resolveScenarioRef('spar:hivecaller:5'), 5);
  assert.ok(spar.metrics.dps_out > 0, 'a court engages the sparring partner');
  const frost = runEpisode(resolveScenarioRef('dummy:cryomancer:5'), 5);
  assert.ok(frost.metrics.dps_dummy > 0, 'a blink never strands a caster on top of its target');
}

console.log('SELFTEST OK');
