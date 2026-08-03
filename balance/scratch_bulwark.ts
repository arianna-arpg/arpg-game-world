// ---------------------------------------------------------------------------
// SCRATCH RIG (not a probe — census-exempt): the Spiked Bulwark thorns A/B
// matrix from the batch-22 commission. Measures thorns damage OUT while a
// defender is struck, across four cases:
//   (a) spiked_bulwark alone      (b) spiked_bulwark + bristleback
//   (c) bristleback alone         (d) shield_up control
// Plus the smoking-gun sheet reads: thorns bare vs thorns in the guard
// instance's own context (tags + instanceMods).
// Run: npx tsx balance/scratch_bulwark.ts
// ---------------------------------------------------------------------------

import { bootSimEngine, makeSimWorld } from '../src/sim/arena';
import { applyBuild } from '../src/sim/builds';
import { instanceMods, skillContextTags } from '../src/engine/skills';
import type { BuildSpec } from '../src/sim/types';

bootSimEngine();

const runCase = (label: string, opts: { guard?: string; aura?: boolean }): void => {
  const world = makeSimWorld('guardian', 77001);
  const spec: BuildSpec = {
    id: 'bulwark_qa', classId: 'guardian', level: 12,
    skills: [
      { id: 'spiked_bulwark', level: 3 },
      { id: 'shield_up', level: 3 },
      { id: 'bristleback', level: 1 },
    ],
  };
  applyBuild(world, spec, 12);
  const p = world.player;
  const step = (s: number): void => {
    const dt = 1 / 60;
    for (let t = 0; t < s; t += dt) world.update(dt);
  };
  const skill = (id: string) => p.skills.find(s => s?.def.id === id);

  // The striker: parked AI, swings driven by hand through the ONE pipeline.
  const striker = world.createMonster('plains_wolf', 5, 'enemy');
  striker.pos = { x: p.pos.x + 38, y: p.pos.y };
  striker.aiCooldown = 9999;
  striker.sheet.setBase('life', 4000);
  striker.sheet.setBase('lifeRegen', 0);
  striker.life = 4000;
  world.actors.push(striker);

  if (opts.aura) {
    world.useSkill(p, skill('bristleback')!, { x: p.pos.x, y: p.pos.y });
    step(0.3);
  }
  if (opts.guard) {
    world.useSkill(p, skill(opts.guard)!, { x: striker.pos.x, y: striker.pos.y });
    step(0.1);
    if (!p.casting || p.casting.mode !== 'guard') {
      console.log(`${label}: GUARD FAILED TO STAND`);
      return;
    }
    // Smoking gun: the bare sheet read vs the guard instance's context read.
    const inst = p.casting.inst;
    const bare = p.sheet.get('thorns');
    const ctx = p.sheet.get('thorns', skillContextTags(inst.def), instanceMods(inst));
    console.log(`    [sheet while guarding ${opts.guard}] thorns bare=${bare}  context=${ctx}`);
  }

  const pBefore = p.life;
  const sBefore = striker.life;
  const claw = striker.skills.find(s => s)!;
  const pressed = world.useSkill(striker, claw, { x: p.pos.x, y: p.pos.y });
  step(1.2); // claw useTime is 0.9 — let the swing resolve
  if (!pressed) console.log(`    [press refused: ${claw?.def.id}]`);
  const thornsOut = sBefore - striker.life;
  const took = pBefore - p.life;
  const shield = opts.guard ? ` shieldLeft=${p.casting?.shield?.toFixed(0) ?? 'ended'}` : '';
  console.log(`${label.padEnd(36)} thornsOut=${thornsOut.toFixed(1)}  playerTook=${took.toFixed(1)}${shield}`);
};

runCase('(a) spiked_bulwark alone', { guard: 'spiked_bulwark' });
runCase('(b) spiked_bulwark + bristleback', { guard: 'spiked_bulwark', aura: true });
runCase('(c) bristleback alone (no guard)', { aura: true });
runCase('(d) shield_up control', { guard: 'shield_up' });
