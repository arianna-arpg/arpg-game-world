import { bootSimEngine, makeSimWorld } from '../src/sim/arena';
import { seedGlobalRandom } from '../src/sim/rng';
import { updateAI } from '../src/engine/ai';
import { runAIActions } from '../src/engine/aiActions';
import { evalCondition, type BrainDef } from '../src/engine/brain';
import { MONSTERS } from '../src/data/monsters';
import { dist, vec } from '../src/core/math';

bootSimEngine();
let failed = 0;
function check(name: string, ok: boolean, detail = '') {
  console.log(`${ok ? 'PASS' : 'FAIL'} ${name}${detail ? ' — ' + detail : ''}`);
  if (!ok) failed++;
}

// Real autonomous fights against a stationary, replenished hero. Measure
// contact and flight, not a particular sequence of random movement choices.
function fight(id: string, seed: number, hz = 60, source?: string, oldBrain?: BrainDef) {
  seedGlobalRandom(seed);
  const w = makeSimWorld('summoner', seed);
  const p = w.player;
  const home = vec(p.pos.x, p.pos.y);
  let m;
  if (source) {
    const caller = w.createMonster(source, 1, 'enemy');
    caller.pos = vec(home.x - 240, home.y);
    const actions = MONSTERS[source].brain!.rules!.flatMap(r => r.actions ?? []);
    runAIActions(w, caller, actions, p);
    m = w.actors.find(a => a.defId === id)!;
    // Isolate one real summon. The caller need not be updated to test its child.
    w.actors = [p, m];
    m.lifespan = Infinity;
  } else {
    m = w.createMonster(id, 1, 'enemy');
    w.actors.push(m);
  }
  if (oldBrain) m.brain = oldBrain;
  m.pos = vec(home.x - 240, home.y);
  m.facing = m.facingPrev = 0;
  let contact = 0, airborne = 0, casts = 0, leaps = 0;
  let lastCast = -1, wasAirborne = false;
  const launchTimes: number[] = [];
  const hp = id === 'carrion_crow' ? 0.4 : 1;
  for (let i = 0; i < hz * 24; i++) {
    p.life = p.maxLife(); p.pos = vec(home.x, home.y);
    m.life = m.maxLife() * hp;
    updateAI(m, w, 1 / hz);
    const flying = !!m.leap;
    if (flying && !wasAirborne) { leaps++; launchTimes.push(w.time); }
    wasAirborne = flying;
    if (flying) airborne += 1 / hz;
    if (!flying && dist(m.pos, p.pos) <= 95) contact += 1 / hz;
    if (m.aiLastSkill && m.aiLastSkill.at !== lastCast) {
      casts++; lastCast = m.aiLastSkill.at;
    }
    w.update(1 / hz);
  }
  return { contact, airborne, casts, leaps, launchTimes, m, w, p };
}

for (const id of ['carrion_crow', 'cave_gnasher', 'great_gnasher', 'cave_bat', 'bloodwing']) {
  for (const hz of [30, 60, 120]) {
    const r = fight(id, 0xCA77, hz);
    check(`${id} stays reachable and attacks at ${hz} Hz`, r.contact > 12 && r.casts >= 5,
      `${r.contact.toFixed(1)}s contact, ${r.casts} casts, ${r.leaps} flights`);
  }
}

for (const [id, source] of [['carrion_crow', 'crowfeather_piper'], ['cave_gnasher', 'gnasher_prodder']]) {
  for (const seed of [7, 31, 97]) {
    const r = fight(id, seed, 60, source);
    check(`${source}'s replacement stays targetable (seed ${seed})`,
      r.m.noBounty && r.airborne === 0 && r.contact > 16 && r.casts >= 8,
      `${r.contact.toFixed(1)}s contact, ${r.casts} casts, ${r.airborne.toFixed(1)}s airborne`);
    const ctx = { time: r.w.time, actors: r.w.actors, lineOfSight: () => true, factionDrive: () => 0 };
    check('conjured condition distinguishes wild and replenishable bodies',
      evalCondition({ conjured: true }, r.m, r.p, ctx)
      && !evalCondition({ conjured: false }, r.m, r.p, ctx)
      && evalCondition({}, r.m, r.p, ctx));
  }
}

{
  const r = fight('carrion_crow', 7);
  check('wounded wild crow retains an occasional escape after committing',
    r.leaps >= 1 && r.leaps <= 2 && r.launchTimes[0] >= 6 && r.airborne < 3,
    `launches at ${r.launchTimes.map(t => t.toFixed(1)).join(', ')}s`);
}

// An A/B witness against the original flee kernel prevents a cosmetically
// different pattern from quietly reintroducing the same prolonged chase.
for (const id of ['cave_gnasher', 'great_gnasher']) {
  const before = fight(id, 31, 60, undefined, { type: 'swarm',
    move: { style: 'juke', hookEvery: [0.4, 0.8], hookArc: 1.1 } });
  const after = fight(id, 31);
  check(`${id} offers substantially more contact than the old flee loop`,
    after.contact > before.contact + 8,
    `${before.contact.toFixed(1)}s → ${after.contact.toFixed(1)}s`);
}

console.log(failed ? `${failed} FAILED` : 'ALL PASSED');
process.exitCode = failed ? 1 : 0;
