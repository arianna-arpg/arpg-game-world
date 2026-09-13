import { bootSimEngine, makeSimWorld } from '../src/sim/arena';
import { seedGlobalRandom } from '../src/sim/rng';
import { updateAI, MOVE_KERNELS } from '../src/engine/ai';
import { evalCondition, type BrainTuning } from '../src/engine/brain';
import { makeSkillInstance } from '../src/engine/skills';
import { SKILLS } from '../src/data/skills';
import { vec } from '../src/core/math';

bootSimEngine();
let failed = 0;
function check(name: string, ok: boolean) {
  console.log(`${ok ? 'PASS' : 'FAIL'} ${name}`);
  if (!ok) failed++;
}

// Capture the real movement dispatch after the live rule resolver. Both
// peers share one definition; normalization must not leak a veteran's tactics
// into the novice. A high-level player/area must not unlock them either.
const rows: { id: string; level: number; has: (t: BrainTuning) => boolean }[] = [
  { id: 'hex_weaver', level: 6, has: t => !!t.skillUse?.combos?.length },
  { id: 'bandit_cutthroat', level: 6, has: t => t.move?.style === 'orbit' },
  { id: 'bandit_matchlock', level: 8, has: t => t.move?.style === 'crossfire' },
  { id: 'bandit_matchlock', level: 10, has: t => (t.behavior?.aimLead ?? 0) > 0 },
  { id: 'frost_witch', level: 8, has: t => t.move?.style === 'hold' },
  { id: 'thorn_sprite', level: 6, has: t => (t.behavior?.aimLead ?? 0) > 0 },
  { id: 'thorn_sprite', level: 8, has: t => !!t.behavior?.dodge },
  { id: 'thorn_sprite', level: 10, has: t => !!t.behavior?.steerAim },
  { id: 'grove_singer', level: 8, has: t => (t.behavior?.aimLead ?? 0) > 0 },
  { id: 'grove_singer', level: 10, has: t => !!t.behavior?.dodge },
];
for (const row of rows) {
  seedGlobalRandom(0x7ac71c);
  const w = makeSimWorld('warrior', 0x7ac71c), p = w.player;
  p.level = 100; w.zone.level = 100; p.invulnerable = true;
  w.time = 4;
  const veteran = w.createMonster(row.id, row.level, 'enemy');
  const novice = w.createMonster(row.id, row.level - 1, 'enemy');
  for (const a of [veteran, novice]) {
    a.pos = vec(p.pos.x + (row.id === 'bandit_cutthroat' ? 60 : 200), p.pos.y);
    a.facing = a.facingPrev = Math.PI;
    a.aiTargetId = p.id; a.aiTargetRef = p; a.aiEngagedAt = 0;
    a.aiTuning = { behavior: { reaction: [0, 0] } };
    w.actors.push(a);
  }
  const windup = makeSkillInstance({ ...SKILLS.claw, useTime: 3, manaCost: 0 }, 1);
  if (!w.useSkill(p, windup, veteran.pos)) throw Error('Fixture failed to start cast');
  const seen = new Map<number, BrainTuning>();
  const originals = { ...MOVE_KERNELS };
  try {
    for (const [key, kernel] of Object.entries(originals)) {
      MOVE_KERNELS[key] = ctx => { seen.set(ctx.a.id, ctx.tuning); kernel(ctx); };
    }
    updateAI(veteran, w, 1 / 60);
    updateAI(novice, w, 1 / 60);
  } finally {
    Object.assign(MOVE_KERNELS, originals);
  }
  const high = seen.get(veteran.id), low = seen.get(novice.id);
  check(`${row.id} earns tactic at body level ${row.level}`, !!high && row.has(high));
  check(`${row.id} below ${row.level} stays novice against level-100 prey and area`, !!low && !row.has(low));
}

{
  const w = makeSimWorld('warrior', 0x712), a = w.createMonster('carrion_crow', 5, 'enemy');
  const ctx = { time: 0, actors: [a], lineOfSight: () => true, factionDrive: () => 0 };
  check('minimum level works without a target', evalCondition({ minLevel: 5 }, a, null, ctx));
  check('minimum level combines with replenishable-spawn restrictions',
    evalCondition({ minLevel: 5, conjured: false }, a, null, ctx));
  a.noBounty = true;
  check('a veteran summon cannot bypass the wild-only condition',
    !evalCondition({ minLevel: 5, conjured: false }, a, null, ctx));
}

console.log(failed ? `${failed} FAILED` : 'ALL PASSED');
process.exitCode = failed ? 1 : 0;
