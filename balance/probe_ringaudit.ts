// ---------------------------------------------------------------------------
// THE RING AUDIT PROBE. Three things stay true here:
//   1. The census matches balance/baselines/ring_audit.json: a new body parked out of
//      its own reach, or a skill its kit can never make usable, fails until adjudicated.
//   2. The census's rest bands are what the kernels really do: a sample of bodies is
//      walked through the real AI against a hero who stands still.
//   3. The enemy-side instruments read the truth: a death blast and a doom going off
//      count as damage, and no path takes life from the hero without being counted.
// Run: npx tsx balance/probe_ringaudit.ts          (add --write to rewrite the ledger)
// ---------------------------------------------------------------------------

import * as fs from 'node:fs';
import * as path from 'node:path';
import { fileURLToPath } from 'node:url';
import { bootSimEngine, makeSimWorld } from '../src/sim/arena';
import { seedGlobalRandom } from '../src/sim/rng';
import { MONSTERS } from '../src/data/monsters';
import { normalizeBrain } from '../src/engine/brain';
import { mod } from '../src/engine/stats';
import { MOVE_KERNELS, updateAI } from '../src/engine/ai';
import { checkRingLedger, restBandsOf, ringAudit, strandedKey, type RingLedger } from '../src/sim/ringAudit';
import { runEpisode } from '../src/sim/runner';
import { threatScenario } from '../src/sim/sweeps';
import { ensureTierBuild } from '../src/sim/data/builds';
import { entropyOf } from '../src/sim/metrics';
import { matchupDuel, pilotFor } from '../src/sim/data/scenarios';

let failed = 0;
const check = (name: string, ok: boolean, detail = ''): void => {
  console.log(`${ok ? 'PASS' : 'FAIL'}  ${name}${detail ? ' — ' + detail : ''}`);
  if (!ok) failed++;
};

bootSimEngine();
const ledgerPath = path.join(path.dirname(fileURLToPath(import.meta.url)), 'baselines', 'ring_audit.json');
const audit = ringAudit();
const noReach = audit.rows.filter(r => r.none);
console.log(`${audit.active} active bodies, ${audit.withLegs} with legs, ${audit.ringKernels} on a ring kernel.`);
console.log(`${noReach.length} rest where no damaging skill reaches, ${audit.rows.length} where at least one does not.`);
console.log(`${audit.held.length} hold their melee out of reach by keepDistance. ${audit.stranded.length} skills their kit cannot make usable.`);

// --- 1) The ledger ------------------------------------------------------------------
const prior = fs.existsSync(ledgerPath) ? JSON.parse(fs.readFileSync(ledgerPath, 'utf8')) as RingLedger : null;
if (process.argv.includes('--write')) {
  const next: RingLedger = {
    version: 1,
    noReach: Object.fromEntries(noReach.map(r => [r.id, {
      kernel: r.kernel,
      note: prior?.noReach[r.id]?.note ?? `open: rests at ${Math.round(r.band[0])}-${Math.round(r.band[1])}, ${r.outOfReach.join(', ')} cannot reach`,
    }])),
    stranded: Object.fromEntries(audit.stranded.map(r => [strandedKey(r), {
      needs: r.needs,
      note: prior?.stranded[strandedKey(r)]?.note ?? 'open: nothing else in the kit applies this',
    }])),
  };
  fs.writeFileSync(ledgerPath, JSON.stringify(next, null, 1) + '\n');
  console.log(`Wrote ${ledgerPath}`);
}
const ledger = JSON.parse(fs.readFileSync(ledgerPath, 'utf8')) as RingLedger;
const diff = checkRingLedger(audit, ledger);
check('no new body rests where nothing it has can reach', !diff.newNoReach.length, diff.newNoReach.join(', '));
check('no new skill its kit can never make usable', !diff.newStranded.length, diff.newStranded.join(', '));
check('the ledger names no body that has since been fixed', !diff.goneNoReach.length, `${diff.goneNoReach.join(', ')} (run with --write)`);
check('the ledger names no skill that has since been fixed', !diff.goneStranded.length, `${diff.goneStranded.join(', ')} (run with --write)`);

// --- 2) The census's bands are what the kernels do --------------------------------------
/** A hero who stands still and cannot die, and one body: where does it end up? */
function restingGap(id: string, seed: number): number {
  seedGlobalRandom(seed);
  const w = makeSimWorld('warrior', seed), p = w.player;
  p.skills = []; p.casting = null;
  p.sheet.setSource('probe-rig', [mod('life', 'override', 1e6), mod('moveSpeed', 'override', 0)]);
  p.fillResources();
  const body = w.createMonster(id, 12, 'enemy');
  body.pos = { x: p.pos.x + 240, y: p.pos.y }; body.tier = p.tier;
  body.facing = Math.PI;
  w.actors = [p, body];
  const dt = 1 / 60;
  let total = 0, n = 0;
  for (let t = 0; t < 14; t += dt) {
    w.applyInputs(new Map(), dt);
    for (const a of [...w.actors]) updateAI(a, w, dt);
    w.update(dt);
    if (t > 8) { total += Math.hypot(body.pos.x - p.pos.x, body.pos.y - p.pos.y); n++; }
  }
  return total / Math.max(1, n);
}
for (const id of ['hex_weaver', 'imp', 'abyssal_seer', 'gnoll_matron', 'shard_gardener', 'formic_tender', 'dust_djinn']) {
  const def = MONSTERS[id];
  if (!def) { check(`${id} exists`, false); continue; }
  const bands = restBandsOf(id);
  const gap = restingGap(id, 0x51);
  check(`${id} (${normalizeBrain(def.brain ?? {}).base.move?.style ?? 'approach'}) rests where the census says`,
    bands.some(b => gap >= b[0] * 0.7 && gap <= b[1] * 1.3), `${gap.toFixed(0)} against ${bands.map(b => b.map(x => x.toFixed(0)).join('-')).join(' or ')}`);
}

{
  const unknown: string[] = [];
  for (const [id, def] of Object.entries(MONSTERS)) {
    for (const m of JSON.stringify(def.brain ?? {}).matchAll(/"move":\{"style":"(\w+)"/g)) {
      if (!MOVE_KERNELS[m[1]]) unknown.push(`${id}:${m[1]}`);
    }
  }
  check('every move style a body names is a real kernel', !unknown.length, unknown.join(', '));
}

// --- 3) The instruments ------------------------------------------------------------------
{
  const shambler = runEpisode(threatScenario(ensureTierBuild('starter', 'warrior', 5), 'grave_shambler', 5), 0x61);
  check('a death blast counts as damage', shambler.metrics.dps_in > 0, `dps_in ${shambler.metrics.dps_in}, life floor ${shambler.metrics.life_floor_pct}%`);
  check('and the first hit is stamped', (shambler.metrics.first_hit_sec ?? -1) >= 0, String(shambler.metrics.first_hit_sec));

  const build = ensureTierBuild('geared', 'warrior', 12);
  const wretches = {
    ...threatScenario(build, 'abyssal_wretch', 12),
    id: 'probe_doom_pack',
    waves: [{ monsters: [{ id: 'abyssal_wretch', level: 12, count: 4 }], distance: 220, faceHero: true }],
    duration: 25,
  };
  const doomed = runEpisode(wretches, 0x62);
  const died = doomed.ended === 'player_dead';
  const paid = doomed.metrics.dps_in * doomed.metrics.sim_seconds;
  check('doom going off counts: what it reads adds up to the life it took', paid >= (doomed.metrics.hero_max_life ?? 0) * (died ? 0.9 : 0.01),
    `${paid.toFixed(0)} of ${doomed.metrics.hero_max_life} life in ${doomed.metrics.sim_seconds}s, ${doomed.ended}`);
  check('a dead hero reads a life floor of zero', !died || doomed.metrics.life_floor_pct === 0, `${doomed.metrics.life_floor_pct}%`);

  const duel = runEpisode(matchupDuel(build, 'imp', { level: 12, duration: 25, pilot: pilotFor('warrior'), idTag: 'probe' }), 0x63);
  const m = duel.metrics;
  check('every conduct column is there on a real fight',
    [m.enemy_casts, m.distinct_skills, m.skill_entropy, m.refused_presses, m.first_hit_sec, m.melee_share, m.in_reach_share, m.band_near, m.band_mid, m.band_far].every(x => typeof x === 'number'),
    JSON.stringify({ casts: m.enemy_casts, skills: m.distinct_skills, entropy: m.skill_entropy, refused: m.refused_presses, first: m.first_hit_sec, melee: m.melee_share, reach: m.in_reach_share }));
  check('the bands add up', Math.abs((m.band_near ?? 0) + (m.band_mid ?? 0) + (m.band_far ?? 0) - 1) < 0.03);
  check('entropy reads 0 for one skill and 1 for two equally', entropyOf([5]) === 0 && entropyOf([3, 3]) === 1 && entropyOf([]) === 0);

  const again = runEpisode(matchupDuel(build, 'imp', { level: 12, duration: 25, pilot: pilotFor('warrior'), idTag: 'probe' }), 0x63);
  check('the same seed reads the same fight, columns included',
    JSON.stringify(again.metrics) === JSON.stringify(duel.metrics) && JSON.stringify(again.fingerprint) === JSON.stringify(duel.fingerprint));
  check('the matrix oracle does not see the new columns',
    !Object.keys(duel.fingerprint).some(k => /entropy|melee_share|refused|untapped|band_|first_hit/.test(k)));
  // A hero who pays life for a skill is not being hit.
  check('life paid is not damage taken', m.untapped_in === 0 || m.untapped_in < m.dps_in * 0.5, `untapped ${m.untapped_in} of ${m.dps_in}`);
}

console.log(failed ? `\n${failed} FAILURE(S)` : '\nALL PASS');
process.exit(failed ? 2 : 0);
