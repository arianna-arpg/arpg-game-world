// ---------------------------------------------------------------------------
// SCRATCH RIG (not a probe — census-exempt): the guard-conditional class A/B
// from the batch-22 follow-up chip. Four suspects, each a 'guarding'-scoped
// grant whose read site may read the sheet bare (the CAST-CONTEXT WALL):
//   S1 marching_bulwark  — leveling moveSpeed row  → walked px/s, L1 vs L5
//   S2 runeward          — innate spell damage row → firebolt bands ± guard
//   S3 unyielding_stance — poise +20 / regen ×2    → maxPoise ± guard, climb
//   S4 shieldwall_doctrine — blockChance/Value     → rear-strike zero-damage count
// Run: npx tsx balance/scratch_guardclass.ts
// ---------------------------------------------------------------------------

import { bootSimEngine, makeSimWorld } from '../src/sim/arena';
import { applyBuild } from '../src/sim/builds';
import { setSimTap } from '../src/engine/tap';
import { skillDamageBands } from '../src/engine/damage';
import { instanceMods, skillContextTags } from '../src/engine/skills';
import type { Actor } from '../src/engine/actor';
import type { BuildSpec } from '../src/sim/types';

bootSimEngine();

const mk = (skills: BuildSpec['skills']) => {
  const world = makeSimWorld('guardian', 90210);
  const spec: BuildSpec = { id: 'guardclass_qa', classId: 'guardian', level: 12, skills };
  const warnings = applyBuild(world, spec, 12);
  if (warnings.length) console.log('  build warnings:', warnings.join(' | '));
  const p = world.player;
  const step = (s: number): void => {
    const dt = 1 / 60;
    for (let t = 0; t < s; t += dt) world.update(dt);
  };
  const skill = (id: string) => p.skills.find(k => k?.def.id === id);
  return { world, p, step, skill };
};

type Mk = ReturnType<typeof mk>;

const prop = (m: Mk, dx: number, level = 5): Actor => {
  const s = m.world.createMonster('plains_wolf', level, 'enemy');
  s.pos = { x: m.p.pos.x + dx, y: m.p.pos.y };
  s.aiCooldown = 9999;
  s.sheet.setBase('life', 4000);
  s.sheet.setBase('lifeRegen', 0);
  s.life = 4000;
  m.world.actors.push(s);
  return s;
};

// --- S1: marching_bulwark's leveling moveSpeed row --------------------------
const s1 = (level: number): void => {
  const m = mk([{ id: 'marching_bulwark', level }]);
  const { world, p, step, skill } = m;
  world.useSkill(p, skill('marching_bulwark')!, { x: p.pos.x + 100, y: p.pos.y });
  step(0.1);
  if (p.casting?.mode !== 'guard') { console.log(`S1 L${level}: GUARD FAILED`); return; }
  const inst = p.casting.inst;
  const bare = p.sheet.get('moveSpeed');
  const ctx = p.sheet.get('moveSpeed', skillContextTags(inst.def), instanceMods(inst));
  const x0 = p.pos.x;
  const dt = 1 / 60;
  for (let t = 0; t < 1; t += dt) { world.update(dt); world.moveActor(p, 1, 0, dt); }
  console.log(`S1 marching_bulwark L${level}: sheet bare=${bare.toFixed(1)} ctx=${ctx.toFixed(1)}`
    + `  walked=${(p.pos.x - x0).toFixed(1)}px/s  guardHeld=${p.casting?.mode === 'guard'}`);
};

// --- S2: runeward's 'guarding' spell-damage rows ----------------------------
const s2 = (): void => {
  const m = mk([
    { id: 'runeward', level: 3 },
    { id: 'firebolt', level: 1, supports: [{ id: 'guarded_casting', level: 1 }] },
  ]);
  const { world, p, step, skill } = m;
  const fb = skill('firebolt')!;
  const free = skillDamageBands(p, fb);
  world.useSkill(p, skill('runeward')!, { x: p.pos.x + 100, y: p.pos.y });
  step(0.1);
  if (p.casting?.mode !== 'guard') { console.log('S2: GUARD FAILED'); return; }
  const held = skillDamageBands(p, fb);
  console.log(`S2 runeward: firebolt hi free=${free.total.hi.toFixed(1)}`
    + ` guarding=${held.total.hi.toFixed(1)} ratio=${(held.total.hi / free.total.hi).toFixed(3)}`
    + ` (runeward L3 grants +0.35 increased spell while guarding)`);
  // The live lane: fire mid-guard (guarded_casting gate) at a prop in front.
  const w = prop(m, 200);
  let fire = 0;
  setSimTap({ onHit: (att, _t, _r, pk) => { if (att === p) fire += pk.amounts.fire ?? 0; } });
  const pressed = world.useSkill(p, fb, { x: w.pos.x, y: w.pos.y });
  step(0.8);
  setSimTap(null);
  console.log(`S2 live: pressed=${pressed} fireLanded=${fire.toFixed(1)}`
    + ` guardStill=${p.casting?.mode === 'guard'}`);
};

// --- S3: unyielding_stance's poise rows -------------------------------------
const s3 = (): void => {
  const m = mk([{ id: 'shield_up', level: 3, supports: [{ id: 'unyielding_stance', level: 1 }] }]);
  const { world, p, step, skill } = m;
  const off = p.maxPoise();
  world.useSkill(p, skill('shield_up')!, { x: p.pos.x + 100, y: p.pos.y });
  step(0.1);
  if (p.casting?.mode !== 'guard') { console.log('S3: GUARD FAILED'); return; }
  const on = p.maxPoise();
  step(5); // the refill's calm gate (poiseCalmDelay) — calm accrues only while max > 0
  p.poise = 0;
  step(0.6);
  const climbed = p.poise;
  console.log(`S3 unyielding_stance: maxPoise off=${off} guarding=${on}`
    + `  regen climbed=${climbed.toFixed(1)} in 0.6s (rate/max=${on > 0 ? (climbed / 0.6 / on).toFixed(3) : '-'}`
    + ` — 0.5 = base 0.25 doubled)  guardHeld=${p.casting?.mode === 'guard'}`);
};

// --- S4: shieldwall_doctrine's block rows (rear strikes skip the guard arc) -
const s4 = (withGem: boolean): void => {
  const m = mk([{
    id: 'spiked_bulwark', level: 3,
    supports: withGem ? [{ id: 'shieldwall_doctrine', level: 1 }] : [],
  }]);
  const { world, p, step, skill } = m;
  p.sheet.setBase('evasion', 0);
  p.sheet.setBase('lifeRegen', 0);
  p.sheet.setBase('lifeRegenPct', 0);
  p.sheet.setBase('life', 6000);
  p.life = 6000;
  const w = prop(m, -38, 12); // WEST — behind the eastward guard
  world.useSkill(p, skill('spiked_bulwark')!, { x: p.pos.x + 100, y: p.pos.y }); // face EAST
  step(0.1);
  if (p.casting?.mode !== 'guard') { console.log('S4: GUARD FAILED'); return; }
  const claw = w.skills.find(k => k)!;
  let zero = 0, landedTotal = 0, reRaised = 0, refused = 0;
  for (let i = 0; i < 40; i++) {
    if (p.casting?.mode !== 'guard') {
      p.cooldowns.clear(); p.mana = p.maxMana(); p.useLock = 0;
      world.useSkill(p, skill('spiked_bulwark')!, { x: p.pos.x + 100, y: p.pos.y });
      step(0.1);
      reRaised++;
    }
    w.useLock = 0; // the previous swing's recovery must not eat this press
    w.cooldowns.clear();
    w.mana = w.maxMana();
    const before = p.life;
    const ok = world.useSkill(w, claw, { x: p.pos.x, y: p.pos.y });
    step(1.2);
    if (!ok) { refused++; continue; }
    if (before - p.life <= 0.001) zero++;
    else landedTotal += before - p.life;
  }
  console.log(`S4 shieldwall gem=${withGem}: zeroDamageSwings=${zero}/40`
    + ` landedTotal=${landedTotal.toFixed(0)} reRaised=${reRaised} refused=${refused}`
    + ` shieldLeft=${p.casting?.shield?.toFixed(0) ?? 'ended'}`
    + ` sheetBlockChance bare=${p.sheet.get('blockChance')}`);
};

s1(1);
s1(5);
s2();
s3();
s4(false);
s4(true);
