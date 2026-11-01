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
import { KNOB_GROUP, applyKnobs, dialKnobs, parseKnob } from '../../src/sim/knobs';
import { runEpisode } from '../../src/sim/runner';
import {
  buildCatalog, canonicalGenome, coveringRow, decodeGenome, encodeGenome, factorsOf, genomeKey,
  genomeToBuild, mutateGenome, randomGenome,
} from '../../src/sim/search/space';
import { SEARCH_LOOP_CFG, dropRunaways, emptyArchive, enterArchive, legalityOf, mergeArchives, wouldEnter, type EvalResult } from '../../src/sim/search/engine';
import { mulberry32 } from '../../src/sim/rng';
import { benjaminiHochberg, fitMainEffects, pairedRead, readCohort, signFlipP } from '../../src/sim/stats';
import { neighborRefs } from '../../src/sim/proposals';
import { resolveScenarioRef, progressionDefs } from '../../src/sim/sweeps';
import { runWhatIf } from '../../src/sim/whatif';
import { costsOf, crashSignature, diffRows, nightKey, type LaneCoverage } from './cli';
import { redReasons, renderDigest, type NightRecord } from './report';
import { STALL_PREFIX, stallSignature } from '../../src/sim/watch';
import { tuningRuleFor } from '../../src/sim/data/knobSets';
import { referenceAttackId } from '../../src/sim/compat';
import { packUnits, type FarmUnit } from './lanes';
import { supportPowerFindings } from './analyze';
import { analyzeEffects } from './verbs';
import { SUPPORTS } from '../../src/data/supports';
import { SOCKET_PLAY_CFG, socketPlayOf } from '../../src/sim/data/socketPlay';

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

assert.deepEqual(neighborRefs('skill:fireball:10'), ['skill:fireball:5', 'skill:fireball:20', 'skill:fireball:40']);
assert.deepEqual(neighborRefs('threat:starter_warrior_l5:zombie:5').slice(0, 1), ['threat:starter_warrior_l10:zombie:10']);
assert.deepEqual(neighborRefs('id:smoke'), []);

assert.deepEqual(neighborRefs('survival:warrior:20:geared').slice(0, 1), ['survival:warrior:5:geared']);

// --- stalls -----------------------------------------------------------------
const stalled = stallSignature({ kind: 'hung', stack: ['forEachAlong', 'liteProjectileSweep', 'updateProjectiles', 'update'] });
assert.equal(stalled, `${STALL_PREFIX}: hung in forEachAlong < liteProjectileSweep < updateProjectiles`);
assert.equal(crashSignature(`Error: ${stalled} | at Object.enter (watchdog.ts:1:1)`), stalled, 'a refused row groups with the stall it repeats');
assert.equal(crashSignature('TypeError: boom | at World.kill (world.ts:1:1)'), 'TypeError: boom @ World.kill');
assert.equal(stallSignature({ kind: 'slow', stack: ['anything'] }), stallSignature({ kind: 'slow', stack: ['else'] }));

// --- what the next night prices its lanes from --------------------------------
const lane = (over: Partial<LaneCoverage>): LaneCoverage => ({ label: '', planned: 0, ok: 0, regression: 0, failed: 0, killed: 0, notRun: 0, episodes: 0, coreSec: 0, okSec: 0, okEstEpisodes: 0, missing: [], ...over });
// A unit that hung for hours leaves coreSec huge. Only the finished units set the price.
assert.deepEqual(costsOf({ bestiary: lane({ episodes: 1000, coreSec: 160_000, okSec: 700, okEstEpisodes: 1000 }) }), { bestiary: 0.7 });
assert.deepEqual(costsOf({ search: lane({ episodes: 100, coreSec: 90 }) }), { search: 0.9 });

// --- one definition of red -----------------------------------------------------
const night = (over: Partial<NightRecord>): NightRecord => ({
  night: 'n', sha: 's', profile: 'full', nightSeed: 1, wallMinutes: 1, totalEpisodes: 1, coreHours: 1, coverage: {}, lanes: {},
  gates: { baselines: [], failed: [], regressions: [] }, matrix: {}, search: {}, shards: [], findings: [], newFindings: [],
  moved: [], proposals: [], archiveConfirmed: 0, archiveDropped: 0, elites: [], bandsProposal: [], ...over,
});
assert.deepEqual(redReasons(night({})), [], 'a night that only ran short is incomplete, not red');
assert.equal(redReasons(night({ search: { newCrashes: [stalled] } })).length, 1, 'a new freeze is red');
const trendRow = { night: 'n', sha: 's', episodes: 1, coreHours: 1, wallMinutes: 1, findings: 0, proposals: 0, red: true, expressionMute: 0, classSparL20Median: 0, classSparL20Spread: 0, kittedSparL20Median: 0, matrixProbed: 0, matrixEligible: 0, matrixInert: 0, matrixEffective: 0, searchArchive: 0, searchEvaluated: 0 };
assert.match(renderDigest(night({ search: { newCrashes: [stalled] }, stalls: [{ signature: stalled, kind: 'hung', count: 3, scenario: 'x', seed: 1, unit: 'u', secs: 60, stack: ['a'], repro: 'r' }] }), trendRow, []), /🔴 Regressions[\s\S]*The engine stopped returning/, 'the digest agrees with the workflow');
assert.match(renderDigest(night({}), trendRow, []), /No regressions/);

// --- a socketed rig is the real socket gate -------------------------------------
{
  const scenario = resolveScenarioRef('socketed:fireball:volley:20');
  assert.ok(scenario.id.includes('volley'));
  const eps = runEpisode(scenario, 1234);
  assert.equal(eps.warnings.filter(w => /misfit|refus/i.test(w)).length, 0, 'a gem that fits goes in cleanly');
  assert.ok(eps.metrics.survived_sec > 0, 'every episode reports how long the hero lasted');
}

// --- a skill's row is that skill alone; a character's row is the whole hand ------
{
  const solo = resolveScenarioRef('skill:shadow_clone:20');
  const soloCasts = runEpisode(solo, 1234).casts;
  assert.equal(soloCasts.improvised_strike, undefined, 'the improvised strike must not read as the skill measured');
  assert.equal((resolveScenarioRef('socketed:fireball:volley:20').pilot as { floor?: boolean }).floor, undefined);
  assert.equal((resolveScenarioRef('dummy:warrior:20').pilot as { floor?: boolean }).floor, true);
  assert.equal((resolveScenarioRef('skill:summon_skeleton:5').waves[0].monsters[0]).id, 'target_dummy_spar', 'a court reads on a target it can engage');
  assert.equal((resolveScenarioRef('skill:fireball:5').waves[0].monsters[0]).id, 'target_dummy');
}

// --- skills that work through something else -----------------------------------
{
  const beside = runEpisode(resolveScenarioRef('assist:solar_litany:out:20'), 1234);
  assert.ok(beside.casts.solar_litany && beside.casts[referenceAttackId()], 'the assist and its strike both get pressed');
  assert.ok(beside.metrics.dps_dummy > 0);
  const clock = runEpisode(resolveScenarioRef('assist:mend:live:20'), 1234);
  assert.ok(clock.casts.mend, 'a heal is pressed on the clock');
  const idle = runEpisode(resolveScenarioRef('assist:__alone_magician:live:20'), 1234);
  assert.equal(Object.keys(idle.casts).length, 0, 'the comparison hero presses nothing');
  assert.ok(tuningRuleFor('skill_assist')!.knobs('solar_litany').some(k => k.includes('.mods')), 'what a buff grants is a dial');
  assert.ok(tuningRuleFor('skill_assist')!.knobs('mend').some(k => k.includes('.amount')), 'what a heal restores is a dial');
}

// --- gems that have to be played a certain way -----------------------------------
{
  const way = (id: string): string | undefined => socketPlayOf(SUPPORTS[id])?.id;
  assert.equal(way('embargo'), 'bank');
  assert.equal(way('slow_brew'), undefined, 'a gem that fills its own bank needs no feed');
  assert.equal(way('guarded_casting'), 'guard');
  assert.equal(way('vortex'), 'crowd');
  assert.equal(way('alternating_strikes'), 'crowd');
  assert.equal(way('flameforged'), 'plain_dummy');
  assert.equal(way('volley'), undefined);
  const output = (ref: string): number => runEpisode(resolveScenarioRef(ref), 1234).metrics.dps_dummy;
  assert.ok(output('socketed:fireball:gathered_casting:20') > 0, 'a gather gets released');
  assert.ok(output('socketed:fireball:embargo:20') > 0, 'a fed hard spender pays out');
  assert.ok(output('socketed:fireball:guarded_casting:20') > 0, 'a guarded cast gets its guard');
  const crowd = resolveScenarioRef('socketed:fireball:vortex:20');
  assert.equal(crowd.waves[0].monsters[0].count, SOCKET_PLAY_CFG.crowd.count);
  const bare = resolveScenarioRef('socketed:fireball:guarded_casting:20:bare');
  assert.deepEqual((bare.build as { skills: { id: string }[] }).skills.map(s => s.id), ['fireball', SOCKET_PLAY_CFG.guardSkill], 'both arms wear the rig');
  assert.deepEqual(bare.pilot, resolveScenarioRef('socketed:fireball:guarded_casting:20').pilot);
  // The matrix's zero for an unplayed gem is not a power read; its own rig's is.
  const probed = Array.from({ length: 12 }, (_, i) => ({ skillId: `h${i}`, supportId: 'embargo', verdict: 'effective', dOutputRel: -1 }));
  const table = (played: Parameters<typeof supportPowerFindings>[1]) => supportPowerFindings(probed, played);
  assert.equal(table([]).table.length, 0);
  assert.deepEqual(table([]).unread.includes('embargo'), true, 'a gem nobody played says so');
  const read = table([{ support: 'embargo', play: 'x', n: 8, medianDelta: 0.6, host: 'fireball' }]);
  assert.equal(read.table[0].medianDelta, 0.6);
  assert.equal(read.unread.includes('embargo'), false);
}

// --- a runaway is reported, and owns nothing -------------------------------------
{
  const cat = buildCatalog();
  const g = randomGenome(cat, mulberry32(7));
  const a = emptyArchive(1);
  const ev = (value: number, key: string): EvalResult => ({
    key, genome: g, stage: 1, seeds: 3, episodes: 6, cell: 'L40|melee|physical',
    objectives: { offense: value, clear: 1, survive: 50 }, sd: { offense: 1 },
  });
  enterArchive(a, ev(5000, 'a'), 'n');
  const over = SEARCH_LOOP_CFG.runawayDps * 10;
  enterArchive(a, ev(over, 'b'), 'n');
  assert.equal(a.best.offense['L40|melee|physical'].value, 5000, 'a runaway does not take the cell');
  assert.equal(a.best.clear['L40|melee|physical'].key, 'a');
  a.best.offense['L40|melee|physical'].value = over;
  assert.equal(dropRunaways(a), 1, 'an archive carried from before the ceiling is cleaned');
  // One build at 1e30 must not set every effect it touches, and it still reads as the outlier.
  const rows = [
    ...Array.from({ length: 40 }, (_, i) => ({ key: `p${i}`, source: 'covering', lvl: 40, factors: ['support:plain', `skill:s${i % 5}`], objectives: { offense: 100 + i }, token: 't' })),
    ...Array.from({ length: 12 }, (_, i) => ({ key: `e${i}`, source: 'covering', lvl: 40, factors: ['support:echo', `skill:s${i % 5}`], objectives: { offense: i === 0 ? 1e30 : 120 }, token: 't' })),
  ] as Parameters<typeof analyzeEffects>[0];
  const band = analyzeEffects(rows, 'offense').bands[0];
  const echo = band.top.find(e => e.factor === 'support:echo')!;
  assert.ok(echo.multiplier < 1e4, `the fit is capped, read ${echo.multiplier}`);
  assert.equal(band.interactions[0].key, 'e0', 'the runaway still heads the residuals');
}

// --- every band earns its rows ---------------------------------------------------
{
  const elites = [5, 10, 20, 40].flatMap(lvl => [100, 90, 80].map(v => ({ lvl, objective: 'offense', value: v, ratioToMedian: 5, cell: 'c', key: 'k', genome: 'g', factors: ['class:x'] })));
  const digest = renderDigest(night({ elites }), trendRow, []);
  for (const lvl of [5, 10, 20, 40]) assert.ok(digest.includes(`| L${lvl} | offense |`), `L${lvl} has rows in the table`);
}

// --- several numbers as one dial -----------------------------------------------
assert.deepEqual(dialKnobs(`skills.a.baseDamage${KNOB_GROUP}skills.b.baseDamage`, 1.5), ['skills.a.baseDamage*1.5', 'skills.b.baseDamage*1.5']);
{
  const dials = tuningRuleFor('class')!.knobs('falconer');
  assert.ok(dials.some(d => d.includes(KNOB_GROUP)), 'a class with several damage skills also offers them together');
  assert.equal(dials[dials.length - 1], 'classes.falconer.attributes');
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
  const threat = runEpisode(resolveScenarioRef('threat:starter_warrior_l5:zombie:5'), 5);
  assert.ok(threat.metrics.dps_in > 0 && threat.metrics.kills === 0, 'the threat rig reads what a monster does to a hero who does nothing back');
  const frost = runEpisode(resolveScenarioRef('dummy:cryomancer:5'), 5);
  assert.ok(frost.metrics.dps_dummy > 0, 'a blink never strands a caster on top of its target');
}

console.log('SELFTEST OK');
