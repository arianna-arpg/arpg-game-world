// ---------------------------------------------------------------------------
// ONE-OFF PROBE — THE IRON BELL end to end on the real engine:
//
//  * hitCap (the per-hit defense-texture ceiling, stats.ts): a landed hit
//    whose post-mitigation life cut exceeds the cap CLAMPS to it and READS
//    clamped (HitResult.clamped + the 'capped' float), on BOTH lanes —
//    the resolveHit path AND World.burstDamage, the resolveHit BYPASS the
//    salvage pass taught us about (the cap lives in mitigateTyped, the one
//    chokepoint both share).
//  * DoT full work: poison ticks pass the cap by construction (applyDotCore
//    soaks directly, never mitigateTyped) — attrition is THE counter-build.
//  * the stride: the scripted at:'ahead' beat casts ironbell_step at the
//    colossus's OWN next foot placement (aim ≈ pos + facing × stride,
//    never the prey's position) through the ordinary useSkill pipeline —
//    the windup is a real cast bar the FORESIGHT decal telegraphs.
//  * the toll: ironbell_toll rings SkillDef.selfCleanse — banked stacks
//    shed by round(stacks × portion) — and stuns the near field; cracking
//    the bell PART silences the beat forever (breakDisables writes the
//    aiSkillBans set that scripted casts check at mint — the fabric fix
//    that also repairs Cragmaw's fist).
//  * parts: five hittable segments pin to the hull; a broken bearing
//    column slows the walk (breakMods) and chunks the root (breakDamage).
//
// Run: npx tsx balance/probe_ironbell.ts
// ---------------------------------------------------------------------------

import { bootSimEngine, makeSimWorld } from '../src/sim/arena';
import { seedGlobalRandom } from '../src/sim/rng';
import { applyBuild } from '../src/sim/builds';
import { MONSTERS } from '../src/data/monsters';
import { SKILLS } from '../src/data/skills';
import { updateAI } from '../src/engine/ai';
import { setSimTap } from '../src/engine/tap';
import type { Actor } from '../src/engine/actor';
import type { HitResult } from '../src/engine/damage';
import type { BuildSpec } from '../src/sim/types';

let failed = 0;
const check = (name: string, ok: boolean, detail = ''): void => {
  console.log(`${ok ? 'PASS' : 'FAIL'}  ${name}${detail ? ' — ' + detail : ''}`);
  if (!ok) failed++;
};

bootSimEngine();
seedGlobalRandom(20260716); // every chance()/rand() roll below replays exactly
const world = makeSimWorld('warrior', 424242);
const spec: BuildSpec = {
  id: 'ironbell_probe', classId: 'warrior', level: 12,
  skills: [{ id: 'ground_slam', level: 5 }],
};
const warnings = applyBuild(world, spec, 12);
if (warnings.length) console.log('build warnings:', warnings.join(' | '));

const p = world.player;
// The REAL loop shape: brains tick OUTSIDE world.update (main.ts drives
// updateAI over every actor, then steps the world) — a probe that only
// steps the world runs a brainless fight and proves nothing about beats.
const tick = (dt: number): void => {
  for (const a of world.actors) updateAI(a, world, dt);
  world.update(dt);
};
const step = (s: number): void => {
  const dt = 1 / 60;
  for (let t = 0; t < s; t += dt) tick(dt);
};

// --- static data sanity ------------------------------------------------------
const rootDef = MONSTERS.primeval_ironbell;
check('root def exists, boss-bar authored', !!rootDef && rootDef.boss === true);
check('root wears hitCap in base', (rootDef.base.hitCap ?? 0) > 0);
check('bell part disables the toll', !!rootDef.parts?.some(pd =>
  pd.monster === 'primeval_ironbell_bell' && pd.breakDisables?.includes('ironbell_toll')));
check('toll carries selfCleanse', !!SKILLS.ironbell_toll?.selfCleanse
  && SKILLS.ironbell_toll.selfCleanse!.stacksPortion > 0);

// =============================================================================
// PART 1 — hitCap on a brainless wearer (a bearing column: no toll to muddy
// the DoT measurements), both hit lanes + the DoT lane.
// =============================================================================
const mintLeg = (): Actor => {
  const leg = world.createMonster('primeval_ironbell_leg', 9, 'enemy');
  leg.pos = { x: p.pos.x + 50, y: p.pos.y };
  leg.aiCooldown = 9999;
  world.actors.push(leg);
  return leg;
};

// Crank the hero so every slam lands far past the cap even through armor.
p.sheet.setBase('damage', 60);
p.cooldowns.clear();

{
  const leg = mintLeg();
  const cap = leg.sheet.get('hitCap');
  check('leg hitCap scales with level', cap > MONSTERS.primeval_ironbell_leg.base.hitCap!,
    `cap@L9 ${cap.toFixed(1)} vs base ${MONSTERS.primeval_ironbell_leg.base.hitCap}`);

  let hits: HitResult[] = [];
  setSimTap({ onHit: (_a, _t, result) => { hits.push(result); } });

  // Lane 1: the ordinary resolveHit path (ground_slam through useSkill).
  const slam = p.skills.find(s => s?.def.id === 'ground_slam')!;
  const before = leg.life;
  p.mana = p.maxMana();
  world.useSkill(p, slam, leg.pos);
  step(1.4);
  const cut = before - leg.life;
  const landed = hits.filter(h => !h.evaded && !h.immune && h.total > 0);
  check('resolveHit lane: life cut == cap', Math.abs(cut - cap) < 0.75,
    `cut ${cut.toFixed(1)} vs cap ${cap.toFixed(1)}`);
  check('resolveHit lane: result reads clamped', landed.length > 0 && landed.every(h => h.clamped === true));
  check("'capped' float printed", world.texts.some(t => t.text === 'capped'));

  // Lane 2: the burstDamage BYPASS (pre-baked area blast, no resolveHit).
  hits = [];
  const before2 = leg.life;
  (world as unknown as {
    burstDamage(pos: { x: number; y: number }, radius: number, dmg: number,
      type: string, color: string, sourceTeam: string): void;
  }).burstDamage(leg.pos, 60, 50000, 'fire', '#ffffff', 'player');
  const cut2 = before2 - leg.life;
  check('burstDamage lane: life cut == cap', Math.abs(cut2 - cap) < 0.75,
    `cut ${cut2.toFixed(1)} vs cap ${cap.toFixed(1)}`);

  // Lane 3: DoT does FULL work — ticks never see the cap.
  setSimTap(null);
  const stacks = 8, dpsPerStack = 40;
  for (let i = 0; i < stacks; i++) leg.applyStatus('poison', dpsPerStack, 1, 'probe');
  const st = leg.statuses.find(s => s.id === 'poison');
  check('poison banked its stacks', (st?.stacks ?? 0) >= stacks * 0.75, `stacks ${st?.stacks}`);
  const before3 = leg.life;
  step(1.0);
  const dotCut = before3 - leg.life;
  // Expected ≈ dps × stacks × damageTaken (leg has no damageTaken mods);
  // one second of ticks must dwarf a single capped hit and track the math.
  const expected = dpsPerStack * (st?.stacks ?? stacks);
  check('DoT full-work: 1s of ticks tracks dps×stacks (uncapped)',
    dotCut > expected * 0.7 && dotCut > cap * 3,
    `dot ${dotCut.toFixed(0)} vs expected ~${expected.toFixed(0)}, cap ${cap.toFixed(1)}`);
  world.kill(leg, false, p);
}

// =============================================================================
// PART 2 — the colossus itself: parts attach, the stride aims at ITS OWN
// footfall, the toll rings (cleanse + stun), the cracked bell goes silent,
// a cracked column slows the walk.
// =============================================================================
p.sheet.setBase('damage', 1); // stop one-shotting parts by accident
const bell = world.createMonster('primeval_ironbell', 9, 'enemy');
bell.pos = { x: p.pos.x + 420, y: p.pos.y };
world.actors.push(bell);
step(0.2); // parts lazy-attach on the first ticks

check('five parts attached and pinned', (bell.partActors?.filter(a => !a.dead).length ?? 0) === 5);
const bellPart = bell.partActors?.find(a => a.defId === 'primeval_ironbell_bell');
check('the carried bell is a hittable segment', !!bellPart && !bellPart.dead);
check('parts share the hull level', bell.partActors?.every(a => a.level === bell.level) ?? false);

// --- the stride: watch for the step cast and pin its aim -------------------
let strideAim: { x: number; y: number } | null = null;
let strideFrom: { x: number; y: number } | null = null;
let strideFacing = 0;
{
  const dt = 1 / 60;
  for (let t = 0; t < 12 && !strideAim; t += dt) {
    tick(dt);
    const cs = bell.casting;
    if (cs && cs.inst.def.id === 'ironbell_step' && !strideAim) {
      strideAim = { x: cs.aim.x, y: cs.aim.y };
      strideFrom = { x: bell.pos.x, y: bell.pos.y };
      strideFacing = bell.facing;
    }
  }
}
check('the stride cast happened (real cast bar)', !!strideAim);
if (strideAim && strideFrom) {
  const want = {
    x: strideFrom.x + Math.cos(strideFacing) * 120,
    y: strideFrom.y + Math.sin(strideFacing) * 120,
  };
  const offAhead = Math.hypot(strideAim.x - want.x, strideAim.y - want.y);
  const distToSelf = Math.hypot(strideAim.x - strideFrom.x, strideAim.y - strideFrom.y);
  const playerAt = Math.hypot(strideAim.x - p.pos.x, strideAim.y - p.pos.y);
  check('stride aims its OWN next foot placement (pos + facing×120)', offAhead < 24,
    `off by ${offAhead.toFixed(1)}`);
  check('stride is a real stride, not a self-cast', distToSelf > 90, `d ${distToSelf.toFixed(0)}`);
  check("stride never aims the prey's feet", playerAt > 120, `d to player ${playerAt.toFixed(0)}`);
}

// --- the toll: banked stacks shed by the portion, near field stunned --------
{
  // Bank a known pile mid-fight, then let the next toll ring it.
  for (const s of [...bell.statuses]) { /* start clean */
    bell.statuses.splice(bell.statuses.indexOf(s), 1);
    bell.sheet.removeSource('status:' + s.id);
  }
  for (let i = 0; i < 6; i++) bell.applyStatus('poison', 10, 1, 'probe');
  const pre = bell.statuses.find(s => s.id === 'poison')?.stacks ?? 0;
  check('probe banked 6 poison stacks', pre === 6, `stacks ${pre}`);

  // Park the hero inside the ring so the stun half is measured too. Strip
  // his own answers first (a warrior's passive block can flat-stop the
  // ring's hit — real, emergent counterplay: raise your shield into the
  // peal — but this probe measures the toll, not the target's defenses).
  p.sheet.setBase('blockChance', 0);
  p.sheet.setBase('poiseCcAvoid', 0);
  p.pos.x = bell.pos.x + 120; p.pos.y = bell.pos.y;
  p.vel.x = 0; p.vel.y = 0;

  let tolled = false;
  setSimTap({ onCast: (caster, inst) => {
    if (caster === bell && inst.def.id === 'ironbell_toll') tolled = true;
  } });
  const dt = 1 / 60;
  for (let t = 0; t < 14 && !tolled; t += dt) {
    tick(dt);
    p.pos.x = bell.pos.x + 120; p.pos.y = bell.pos.y; // stay in the ring
    p.life = p.maxLife(); // the probe measures the toll, not survival
  }
  setSimTap(null);
  check('the toll rang', tolled);
  step(0.3);
  const post = bell.statuses.find(s => s.id === 'poison')?.stacks ?? 0;
  // 6 stacks × portion 0.34 → round = 2 shed (min 1); ticks don't change stacks.
  check('toll shed round(stacks×portion) stacks', tolled && post === 4,
    `stacks ${pre} → ${post}`);
  check('toll stunned the near field', p.statuses.some(s => s.id === 'stun'));
}

// --- crack the bell: the toll falls SILENT (scripted lane included) ---------
{
  if (bellPart && !bellPart.dead) world.kill(bellPart, false, p);
  step(0.2);
  check('bell break wrote the scripted-cast ban', bell.aiSkillBans?.has('ironbell_toll') ?? false);
  check('bell break disarmed the kit lane too', !bell.skills.some(s => s?.def.id === 'ironbell_toll'));

  for (let i = 0; i < 6; i++) bell.applyStatus('poison', 10, 1, 'probe');
  const pre = bell.statuses.find(s => s.id === 'poison')?.stacks ?? 0;
  let tolledAfter = false;
  setSimTap({ onCast: (caster, inst) => {
    if (caster === bell && inst.def.id === 'ironbell_toll') tolledAfter = true;
  } });
  step(5); // inside the poison's own 6s life, across at least one beat window
  setSimTap(null);
  const post = bell.statuses.find(s => s.id === 'poison')?.stacks ?? 0;
  check('cracked bell: no toll ever rings again', !tolledAfter);
  check('cracked bell: afflictions bank freely', post >= pre,
    `stacks ${pre} → ${post}`);
}

// --- crack a bearing column: the hull OPENS (exposure) and is chunked -------
// (The mausoleum never slows — moveSpeed wears a global stat floor of 30,
//  so a slow below it would be dead data; the legs pay in damageTaken.)
{
  const openBefore = bell.sheet.get('damageTaken');
  const lifeBefore = bell.life;
  const leg = bell.partActors?.find(a => a.defId === 'primeval_ironbell_leg' && !a.dead);
  check('a bearing column stands to crack', !!leg);
  if (leg) {
    world.kill(leg, false, p);
    step(0.2);
    const openAfter = bell.sheet.get('damageTaken');
    check('cracked column opens the hull (stacking damageTaken)',
      openAfter > openBefore + 0.04,
      `${openBefore.toFixed(2)} → ${openAfter.toFixed(2)}`);
    check('cracked column chunks the hull (breakDamage)', bell.life < lifeBefore,
      `${lifeBefore.toFixed(0)} → ${bell.life.toFixed(0)}`);
  }
}

console.log(failed ? `\nprobe_ironbell: ${failed} FAILURE(S)` : '\nprobe_ironbell: ALL CLEAR');
process.exit(failed ? 1 : 0);
