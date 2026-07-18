// ---------------------------------------------------------------------------
// ONE-OFF PROBE — THE THRONG FABRIC + THE LATCH end to end on the real
// engine (docs/engine/throng.md): sight-set gating, walk-through claims
// (husk → real roster body at the claimer's level), the BATCH RULE's owner-
// investment divisor vs a classic summon's whole fold, minionMaxCount cap
// growth, the direct sweep issuing pinned assault orders, latch attach /
// slave / cadenced whacks / shake-off, gauge fill → mint (the add-less boss
// fallback), onKill husk raising, meta minionCast delegation (nearest ONE),
// the disband rule's re-wilding, restoreThrong, and the pure helpers
// (heel-ring stability, per-skill salts, claim keys).
// Run: npx tsx balance/probe_throng.ts
// ---------------------------------------------------------------------------

import { bootSimEngine, makeSimWorld } from '../src/sim/arena';
import { seedGlobalRandom } from '../src/sim/rng';
import { setSimTap } from '../src/engine/tap';
import { SKILLS } from '../src/data/skills';
import { MONSTERS } from '../src/data/monsters';
import { makeSkillInstance, type SkillDef } from '../src/engine/skills';
import {
  batchScaleOf, THRONG_CFG, throngHeelOffset, throngMarkerOf, throngPocketKey,
  throngSightSet, throngSkillSalt, throngSpecsOn,
} from '../src/engine/throng';
import { CLING_CFG, clingSeatsOf } from '../src/engine/cling';
import { STATUS_DEFS } from '../src/engine/status';
import { mod } from '../src/engine/stats';
import { vec, dist } from '../src/core/math';
import { updateAI } from '../src/engine/ai';
import type { Actor } from '../src/engine/actor';

let failed = 0;
const check = (name: string, ok: boolean, detail = ''): void => {
  console.log(`${ok ? 'PASS' : 'FAIL'}  ${name}${detail ? ' — ' + detail : ''}`);
  if (!ok) failed++;
};

bootSimEngine();
seedGlobalRandom(0x7906);

const DT = 1 / 60;
// The HOST frame loop, verbatim (sim/runner.ts order): AI per actor, then
// the world tick — w.update alone leaves every brain frozen.
const step = (w: ReturnType<typeof makeSimWorld>, sec: number): void => {
  for (let t = 0; t < sec; t += DT) {
    for (const a of w.actors) updateAI(a, w, DT);
    w.update(DT);
  }
};

// --- 0) Registry + pure-helper laws ----------------------------------------
{
  check('registry: the three anchors carry ThrongSpecs',
    !!SKILLS.gather_cinderkin?.throng && !!SKILLS.beckon_palewisps?.throng
    && !!SKILLS.raise_gnatveil?.throng);
  // THE SOURCE SWAP (user-directed): the LATCHING flavor is battle-fed
  // (replenishable mid-fight), the RANGED flavor is the world-found
  // finite treasure. Pinned so a future re-shuffle is a deliberate act.
  check('doctrine: latchers battle-fed, ranged world-found',
    SKILLS.gather_cinderkin.throng!.sources.some(r => r.kind === 'gauge')
    && SKILLS.gather_cinderkin.throng!.sources.some(r => r.kind === 'onKill')
    && SKILLS.beckon_palewisps.throng!.sources.some(r => r.kind === 'pocket')
    && !SKILLS.beckon_palewisps.throng!.sources.some(r => r.kind === 'gauge'));
  check('registry: the three kinds exist (cinderkin latches, gnat rides harried)',
    !!MONSTERS.cinderkin?.cling && !!MONSTERS.palewisp && MONSTERS.gnatling?.cling?.rideStatus === 'harried');
  check('registry: harried is a stacking status', STATUS_DEFS.harried?.stacking === true);
  check('helpers: batch scale = 1/batch (default and override)',
    batchScaleOf(SKILLS.gather_cinderkin.throng!) === 1 / THRONG_CFG.batch
    && batchScaleOf(SKILLS.raise_gnatveil.throng!) === 1 / 8);
  check('helpers: per-skill salts differ + are stable',
    throngSkillSalt('gather_cinderkin') === throngSkillSalt('gather_cinderkin')
    && throngSkillSalt('gather_cinderkin') !== throngSkillSalt('beckon_palewisps'));
  check('helpers: claim keys are zone+skill+seat scoped',
    throngPocketKey('z1', 'a', 0, 1) !== throngPocketKey('z1', 'b', 0, 1)
    && throngPocketKey('z1', 'a', 0, 1) !== throngPocketKey('z2', 'a', 0, 1));
  const o1 = { x: 0, y: 0 }, o2 = { x: 0, y: 0 }, o3 = { x: 0, y: 0 };
  const fakeA = { id: 41 } as Actor, fakeB = { id: 42 } as Actor;
  throngHeelOffset(fakeA, 10, o1);
  throngHeelOffset(fakeA, 10, o2);
  throngHeelOffset(fakeB, 10, o3);
  const ringMax = THRONG_CFG.heelRing.dist + THRONG_CFG.heelRing.spread + 1e-6;
  check('helpers: heel ring is per-body stable, distinct, and banded',
    o1.x === o2.x && o1.y === o2.y && (o1.x !== o3.x || o1.y !== o3.y)
    && Math.hypot(o1.x, o1.y) >= THRONG_CFG.heelRing.dist - 1e-6
    && Math.hypot(o1.x, o1.y) <= ringMax);
}

// --- 1) Sight, claim, batch fold, cap --------------------------------------
{
  const w = makeSimWorld('summoner', 0xbeef);
  const p = w.player;
  // Owner investment BEFORE any mint: +50% minion damage.
  p.sheet.setSource('probe', [mod('minionDamage', 'increased', 0.5)]);

  check('sight: an empty bar reveals nothing', throngSightSet(p.skills).size === 0);
  check('dev grant mounts the anchor on the bar', w.devThrongGrant('gather_cinderkin'));
  check('sight: the slotted anchor reveals its kind (and only its kind)',
    throngSightSet(p.skills).has('cinderkin') && !throngSightSet(p.skills).has('palewisp'));
  check('specsOn finds the anchor', throngSpecsOn(p.skills).length === 1);

  // A husk pocket at our feet: claims happen by WALKING among them.
  w.devThrongPocketHere('gather_cinderkin', 3);
  const husks = w.actors.filter(a => a.throngWild === 'cinderkin');
  check('husks stand planted: passive + untargetable + invulnerable',
    husks.length === 3 && husks.every(h => h.passive && h.untargetable && h.invulnerable));
  step(w, 0.5);
  check('claims demand the WALK: out-of-reach husks stay wild',
    w.throngBodiesOf(p, 'gather_cinderkin').length === 0);
  for (const h of husks) { p.pos = vec(h.pos.x, h.pos.y); step(w, 0.3); }
  const roster = w.throngBodiesOf(p, 'gather_cinderkin');
  check('walk-through CLAIM: husks in reach became roster bodies',
    roster.length === 3 && w.actors.every(a => a.throngWild !== 'cinderkin'),
    `roster ${roster.length}`);
  const body = roster[0];
  check('a claimed body is an ordinary owned minion at the claimer\'s level',
    body.owner === p && body.kind === 'minion' && body.level === p.level
    && body.sourceSkillId === throngMarkerOf('gather_cinderkin')
    && w.minionServes(body, 'gather_cinderkin'));

  // THE BATCH RULE as a LAW, class-independent (the summoner's own innate
  // minion investment rides along): whatever a scale-1 body wears, a
  // throng body wears exactly one batch-th of.
  const bodyDmg = body.sheet.get('damage');
  const skel = w.createMonster('skeleton_warrior', p.level, p.team, p);
  w.actors.push(skel);
  const skelInst = p.skills.find(s => s?.def.id === 'gather_cinderkin')!;
  w.bakeMinionOwnerStats(skel, p, skelInst); // scale 1 = the classic fold
  const classicDmg = skel.sheet.get('damage');
  check('batch fold: throng more-damage = classic more-damage ÷ batch',
    Math.abs((bodyDmg - 1) - (classicDmg - 1) / THRONG_CFG.batch) < 1e-6,
    `throng ${bodyDmg.toFixed(3)} vs classic ${classicDmg.toFixed(3)}`);
  check('batch fold: the investment genuinely landed (classic > 1.5 with +50% granted)',
    classicDmg >= 1.5 - 1e-6, `classic ${classicDmg.toFixed(3)}`);

  // Cap rides minionMaxCount — no throng-specific stat.
  const inst = p.skills.find(s => s?.def.id === 'gather_cinderkin')!;
  const cap0 = w.throngCapOf(p, inst);
  p.sheet.setSource('probe2', [mod('minionMaxCount', 'flat', 2)]);
  check('cap: minionMaxCount grows the throng', w.throngCapOf(p, inst) === cap0 + 2,
    `${cap0} → ${w.throngCapOf(p, inst)}`);
  p.sheet.setSource('probe2', []);
}

// --- 2) The direct sweep + the latch ---------------------------------------
{
  const w = makeSimWorld('summoner', 0xcafe);
  const p = w.player;
  w.devThrongGrant('gather_cinderkin');
  w.devThrongMint('gather_cinderkin', 3);
  const prey = w.createMonster('zombie', 8, 'enemy');
  prey.pos = vec(p.pos.x + 260, p.pos.y);
  w.actors.push(prey);

  const inst = p.skills.find(s => s?.def.id === 'gather_cinderkin')!;
  w.executeSkill(p, inst, vec(prey.pos.x, prey.pos.y));
  const bodies = w.throngBodiesOf(p, 'gather_cinderkin');
  check('direct: every body is put under an assault order',
    bodies.every(b => b.aiCommand?.kind === 'assault'));
  check('direct: pointing at flesh PINS the quarry',
    bodies.every(b => b.aiCommand?.targetId === prey.id));
  const linger = SKILLS.gather_cinderkin.throng!.direct?.linger ?? THRONG_CFG.direct.linger;
  check('direct: orders carry the linger clock',
    bodies.every(b => (b.aiCommand!.until - w.time) <= linger + 1e-6
      && (b.aiCommand!.until - w.time) > linger - 1));

  // March in and LATCH. Bodies invulnerable to isolate the latch itself.
  for (const b of bodies) b.invulnerable = true;
  step(w, 4);
  const riders = bodies.filter(b => b.clingTo?.id === prey.id);
  check('latch: riders attached to the pinned quarry', riders.length >= 1,
    `${riders.length}/3 attached`);
  if (riders.length) {
    const r = riders[0];
    const seatDist = dist(r.pos, prey.pos);
    check('latch: a rider stands ON the victim\'s rim (drawn == held)',
      seatDist <= prey.radius + r.radius, `d ${seatDist.toFixed(1)} vs rim ${(prey.radius + r.radius).toFixed(1)}`);
    const before = { x: prey.pos.x, y: prey.pos.y };
    prey.pos.x += 60; prey.pos.y -= 40;
    w.update(DT);
    check('latch: the seat SLAVES — the rider moved with its victim',
      dist(r.pos, prey.pos) <= prey.radius + r.radius + 1
      && dist(r.pos, before) > 30);
    check('latch: seats are size-scaled', clingSeatsOf(prey) === Math.max(1,
      Math.min(CLING_CFG.maxSeats, Math.floor(prey.radius / CLING_CFG.radiusPerSeat))));
  }
  const lifeBefore = prey.life;
  step(w, 4);
  check('latch: riders WHACK through the ordinary pipeline (victim bleeds)',
    prey.life < lifeBefore, `life ${lifeBefore.toFixed(0)} → ${prey.life.toFixed(0)}`);
  // Shake-off: expire a ride and watch the hop + grace.
  const rider = bodies.find(b => b.clingTo);
  if (rider) {
    rider.clingTo!.until = w.time;
    w.update(DT);
    check('latch: the shake releases + stamps re-latch grace',
      !rider.clingTo && rider.clingCooldownUntil > w.time);
  }
}

// --- 3) Combat sources: gauge + onKill -------------------------------------
{
  const w = makeSimWorld('summoner', 0xd00d);
  const p = w.player;
  // The gauge cares about LANDED hits — pin accuracy so the assertions
  // never ride an evasion roll. (Post-swap: the LATCHING cinderkin carry
  // the combat sources — melee attrition demands mid-fight replenishment.)
  p.sheet.setSource('probeacc', [mod('accuracy', 'increased', 8)]);
  w.devThrongGrant('gather_cinderkin');
  const inst = p.skills.find(s => s?.def.id === 'gather_cinderkin')!;
  w.devThrongFillGauge('gather_cinderkin');
  const prey = w.createMonster('zombie', 8, 'enemy');
  prey.pos = vec(p.pos.x + 40, p.pos.y);
  w.actors.push(prey);
  const claw = makeSkillInstance(SKILLS.claw, 1);
  w.executeSkill(p, claw, vec(prey.pos.x, prey.pos.y));
  check('gauge: a landed hit past the brink MINTS husks beside the keeper',
    w.actors.filter(a => a.throngWild === 'cinderkin').length >= 2
    && (inst.state?.throngGauge ?? 99) === 0,
    `${w.actors.filter(a => a.throngWild === 'cinderkin').length} husks`);

  // onKill: 0.28/kill × 20 kills ⇒ P(none) ≈ 0.1% on the seeded stream.
  const husks0 = w.actors.filter(a => a.throngWild === 'cinderkin').length;
  for (let i = 0; i < 20; i++) {
    const v = w.createMonster('zombie', 1, 'enemy');
    v.pos = vec(p.pos.x + 38, p.pos.y);
    w.actors.push(v);
    v.life = 1;
    w.executeSkill(p, claw, vec(v.pos.x, v.pos.y));
  }
  check('onKill: credited kills raise husks at the corpses',
    w.actors.filter(a => a.throngWild === 'cinderkin').length > husks0);
}

// --- 4) Meta delegation: one voice, one actor ------------------------------
{
  const w = makeSimWorld('summoner', 0xfeed);
  const p = w.player;
  w.devThrongGrant('gather_cinderkin');
  w.devThrongMint('gather_cinderkin', 5);
  const prey = w.createMonster('zombie', 8, 'enemy');
  prey.pos = vec(p.pos.x + 120, p.pos.y);
  w.actors.push(prey);
  const orderDef = {
    id: 'probe_order', name: 'Probe Order', noDrop: true, description: '',
    tags: ['spell', 'minion'], color: '#fff',
    manaCost: 0, cooldown: 0, useTime: 0,
    delivery: { type: 'self' },
    effects: [{ type: 'minionCast', skillId: 'claw', at: 'aim' }],
  } as SkillDef;
  let clawCasts = 0;
  setSimTap({
    onCast: (caster, inst) => {
      if (inst.def.id === 'claw' && caster.owner === p) clawCasts++;
    },
  });
  w.executeSkill(p, makeSkillInstance(orderDef, 1), vec(prey.pos.x, prey.pos.y));
  setSimTap(null);
  check('meta delegation: five throng bodies, ONE conducted execute',
    clawCasts === THRONG_CFG.metaDelegate, `${clawCasts} casts (want ${THRONG_CFG.metaDelegate})`);
}

// --- 5) The disband rule + restore -----------------------------------------
{
  const w = makeSimWorld('summoner', 0xfade);
  const p = w.player;
  w.devThrongGrant('gather_cinderkin');
  w.devThrongMint('gather_cinderkin', 4);
  check('disband setup: four bodies stand', w.throngBodiesOf(p, 'gather_cinderkin').length === 4);
  const slot = p.skills.findIndex(s => s?.def.id === 'gather_cinderkin');
  p.skills[slot] = null;
  step(w, 0.5);
  check('disband: an unslotted anchor RELEASES its roster as re-wilded husks',
    w.throngBodiesOf(p, 'gather_cinderkin').length === 0
    && w.actors.filter(a => a.throngWild === 'cinderkin').length === 4);

  w.devThrongGrant('gather_cinderkin');
  w.restoreThrong([{ skillId: 'gather_cinderkin', defId: 'cinderkin', level: 3, count: 3 }]);
  check('restore: saved rows re-field beside the keeper',
    w.throngBodiesOf(p, 'gather_cinderkin').length === 3);

  // Pocket finiteness bookkeeping: a claimed key never re-materializes —
  // the boot check is exercised live (zone pois); the LEDGER is provable here.
  w.throngClaimed.add(throngPocketKey('z', 'gather_cinderkin', 0, 0));
  check('finiteness: the claim ledger holds run-long keys',
    w.throngClaimed.has(throngPocketKey('z', 'gather_cinderkin', 0, 0)));
}

console.log(failed ? `\n${failed} FAILURE(S)` : '\nALL PASS');
process.exit(failed ? 2 : 0);
