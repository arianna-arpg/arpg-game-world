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
import { SUPPORTS } from '../src/data/supports';
import { MONSTERS } from '../src/data/monsters';
import { makeSkillInstance, supportFits, type SkillDef } from '../src/engine/skills';
import {
  batchScaleOf, THRONG_CFG, throngHeelOffset, throngMarkerOf, throngPocketKey,
  throngSightSet, throngSkillSalt, throngSpecsOn,
} from '../src/engine/throng';
import { CLING_CFG, clingBurrowed, clingSeatsOf } from '../src/engine/cling';
import { STATUS_DEFS } from '../src/engine/status';
import { mod } from '../src/engine/stats';
import { vec, dist, type Vec2 } from '../src/core/math';
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
  // THE BURROWING flavor: gnaw + burrow together on the grub, battle-fed
  // per the latch doctrine, and the marker status carries the ghost read.
  check('registry: the marrowgrub is the gnaw+burrow flavor',
    !!SKILLS.loose_marrowgrubs?.throng
    && SKILLS.loose_marrowgrubs.throng!.monsterId === 'marrowgrub'
    && !!MONSTERS.marrowgrub?.cling?.gnaw && !!MONSTERS.marrowgrub?.cling?.burrow);
  check('doctrine: the burrowing flavor is battle-fed too',
    SKILLS.loose_marrowgrubs.throng!.sources.some(r => r.kind === 'onKill')
    && SKILLS.loose_marrowgrubs.throng!.sources.some(r => r.kind === 'gauge'));
  check('registry: the burrowed marker ghosts (render lever as data)',
    STATUS_DEFS.burrowed?.ghostAlpha !== undefined
    && STATUS_DEFS.burrowed.ghostAlpha! < 1 && STATUS_DEFS.burrowed.beneficial === true);
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

// --- 6) THE GNAW: the DoT latch --------------------------------------------
{
  const w = makeSimWorld('summoner', 0x6aa1);
  const p = w.player;
  w.devThrongGrant('loose_marrowgrubs');
  w.devThrongMint('loose_marrowgrubs', 2);
  const grubs = w.throngBodiesOf(p, 'loose_marrowgrubs');
  check('gnaw setup: two grubs stand', grubs.length === 2);
  const host = w.createMonster('zombie', 8, 'enemy');
  host.pos = vec(p.pos.x + 200, p.pos.y);
  w.actors.push(host);
  // Pin the rides by hand (AI-free — the rig proves the CHEW, not the walk).
  for (const [i, r] of grubs.entries()) {
    r.clingTo = {
      id: host.id, ang: i * 2, until: w.time + 999,
      statusAt: w.time, gnawAt: w.time + 0.5,
    };
  }
  const claw = makeSkillInstance(SKILLS.claw, 1);
  check('gnaw quell: useSkill refuses a latched gnawer (the teeth are the kit)',
    !w.useSkill(grubs[0], claw, vec(host.pos.x, host.pos.y)));
  const life0 = host.life;
  let everCast = false;
  for (let t = 0; t < 4; t += DT) {
    for (const a of w.actors) updateAI(a, w, DT);
    w.update(DT);
    if (grubs.some(g => g.casting)) everCast = true;
  }
  check('gnaw: the ridden host bleeds with NO casts from the riders',
    host.life < life0 - 1 && !everCast,
    `life ${life0.toFixed(0)} → ${host.life.toFixed(0)}${everCast ? ' (a rider CAST)' : ''}`);
  check('gnaw: rides survived the window (the chew never detaches)',
    grubs.every(g => g.clingTo?.id === host.id));
  // Owner investment reaches the chew through the ordinary batch fold:
  // same seed, same rig, +100% minion damage ⇒ bites grow by the tempered
  // fold (1 + 1.0/batch), never the classic whole fold.
  const w2 = makeSimWorld('summoner', 0x6aa1);
  const p2 = w2.player;
  p2.sheet.setSource('probe', [mod('minionDamage', 'increased', 1.0)]);
  w2.devThrongGrant('loose_marrowgrubs');
  w2.devThrongMint('loose_marrowgrubs', 2);
  const grubs2 = w2.throngBodiesOf(p2, 'loose_marrowgrubs');
  const host2 = w2.createMonster('zombie', 8, 'enemy');
  host2.pos = vec(p2.pos.x + 200, p2.pos.y);
  w2.actors.push(host2);
  for (const [i, r] of grubs2.entries()) {
    r.clingTo = {
      id: host2.id, ang: i * 2, until: w2.time + 999,
      statusAt: w2.time, gnawAt: w2.time + 0.5,
    };
  }
  for (let t = 0; t < 4; t += DT) {
    for (const a of w2.actors) updateAI(a, w2, DT);
    w2.update(DT);
  }
  const bit1 = life0 - host.life;
  const bit2 = host2.maxLife() - host2.life;
  const batch = SKILLS.loose_marrowgrubs.throng!.batch ?? THRONG_CFG.batch;
  const want = 1 + 1.0 / batch;
  check('gnaw: owner minion investment scales bites at the BATCH fold',
    Math.abs(bit2 / bit1 - want) < 0.05,
    `×${(bit2 / bit1).toFixed(3)} (want ×${want.toFixed(3)})`);
  // The gnaw kills with the rider's credit (the swallow grammar): a
  // near-dead host dies to the chew alone, no pipeline cast anywhere.
  host.life = 2;
  for (let t = 0; t < 2 && !host.dead; t += DT) w.update(DT);
  check('gnaw: the chew alone finishes a host (kill stays sovereign)', host.dead);
}

// --- 7) THE BURROW: host-blind riding + the shake-out window ----------------
{
  const w = makeSimWorld('summoner', 0x8b0b);
  const p = w.player;
  w.devThrongGrant('loose_marrowgrubs');
  w.devThrongMint('loose_marrowgrubs', 1);
  const grub = w.throngBodiesOf(p, 'loose_marrowgrubs')[0];
  const host = w.createMonster('zombie', 8, 'enemy');
  host.pos = vec(p.pos.x + 220, p.pos.y);
  w.actors.push(host);
  // A third combatant: the scrape law must keep working for everyone else.
  const bystander = w.createMonster('zombie', 8, 'enemy');
  bystander.pos = vec(p.pos.x + 400, p.pos.y);
  w.actors.push(bystander);
  grub.clingTo = {
    id: host.id, ang: 0, until: w.time + 999,
    statusAt: w.time, gnawAt: w.time + 999, // silence the chew — this rig is the SHIELD
  };
  w.update(DT); // one slave step: seat + marker clocks arm
  check('burrow: the helper reads the ride state', clingBurrowed(grub)
    && !clingBurrowed(host));
  check('burrow: one-directional hostility — the host cannot find its parasite',
    !w.hostileTo(host, grub) && w.hostileTo(grub, host)
    && w.hostileTo(bystander, grub) && w.hostileTo(grub, bystander));
  check('burrow: the host\'s hostile pool excludes its rider (every damage path)',
    !w.enemiesOf(host).some(e => e.id === grub.id)
    && w.enemiesOf(bystander).some(e => e.id === grub.id));
  // The host swings THROUGH its own parasite: a claw aimed dead at the
  // seat tears nothing. The bystander's same claw tears a ply.
  const plies0 = grub.plies;
  const claw = makeSkillInstance(SKILLS.claw, 1);
  host.facing = Math.atan2(grub.pos.y - host.pos.y, grub.pos.x - host.pos.x);
  w.executeSkill(host, claw, vec(grub.pos.x, grub.pos.y));
  check('burrow: the host\'s own blow passes through the rider',
    grub.plies === plies0 && !grub.dead, `plies ${plies0} → ${grub.plies}`);
  bystander.pos = vec(grub.pos.x + 20, grub.pos.y);
  bystander.facing = Math.PI;
  w.executeSkill(bystander, makeSkillInstance(SKILLS.claw, 1), vec(grub.pos.x, grub.pos.y));
  check('burrow: every OTHER combatant still scrapes riders off',
    grub.plies < plies0, `plies ${plies0} → ${grub.plies}`);
  // Legibility: the marker rides the status clock (ghost read + co-op wire).
  let sawMarker = false;
  for (let t = 0; t < 1.2; t += DT) {
    w.update(DT);
    if (grub.statuses.some(s => s.id === 'burrowed')) { sawMarker = true; break; }
  }
  check('burrow: the rider wears the burrowed marker while sunk', sawMarker);
  const seatD = dist(grub.pos, host.pos);
  check('burrow: the seat sinks deeper than the plain perch (drawn == held)',
    seatD < host.radius, `d ${seatD.toFixed(1)} vs host r ${host.radius}`);
  // THE SHAKE-OUT: the clock pops the rider into its vulnerability window
  // — scattered farther than a plain hop, waiting longer than the plain
  // grace, marker stripped the same frame.
  const at = vec(grub.pos.x, grub.pos.y);
  grub.clingTo!.until = w.time;
  w.update(DT);
  const bur = MONSTERS.marrowgrub.cling!.burrow!;
  const wantGrace = bur.grace ?? CLING_CFG.burrow.grace;
  check('shake-out: the pop releases into the LONG grace (the window is real)',
    !grub.clingTo && grub.clingCooldownUntil - w.time > CLING_CFG.reattachGrace
    && grub.clingCooldownUntil - w.time <= wantGrace + 1e-6);
  check('shake-out: the rider is SCATTERED (toss, not the plain hop)',
    dist(grub.pos, at) > CLING_CFG.detachHop + 4,
    `flew ${dist(grub.pos, at).toFixed(1)} (plain hop ${CLING_CFG.detachHop})`);
  check('shake-out: the marker dies with the ride',
    !grub.statuses.some(s => s.id === 'burrowed'));
  check('shake-out: unburrowed, the host can find it again',
    w.hostileTo(host, grub) && w.enemiesOf(host).some(e => e.id === grub.id));
  // The loop closes: past the grace, the grub walks back in and burrows
  // again on its own (the Pikmin cycle — no button, no script).
  grub.invulnerable = true; // isolate the re-latch from host retaliation
  grub.aiCommand = {
    kind: 'assault', pos: vec(host.pos.x, host.pos.y),
    targetId: host.id, until: w.time + 30, ownerId: p.id,
  } as typeof grub.aiCommand;
  step(w, wantGrace + 3);
  check('re-burrow: the shaken grub reached the flesh again',
    grub.clingTo?.id === host.id && clingBurrowed(grub));
  // Purity: a PERCH kind (no burrow) never trips the host-blind gate —
  // the scrape law is the gnatveil's whole counterplay contract.
  const gnat = w.createMonster('gnatling', 8, p.team, p);
  w.actors.push(gnat);
  gnat.clingTo = {
    id: host.id, ang: 1, until: w.time + 99, statusAt: w.time, gnawAt: w.time + 99,
  };
  check('purity: a plain-perch rider stays fully scrapeable by its host',
    w.hostileTo(host, gnat) && !clingBurrowed(gnat));
}

// --- 8) THE CLEAR LAW: husks never gate the objective -----------------------
{
  const w = makeSimWorld('summoner', 0xc1ea);
  const p = w.player;
  w.devThrongGrant('gather_cinderkin');
  w.zone.objective = { kind: 'clear' };
  w.objectiveDone = false;
  // Husks are planted with ACTOR-level armor on an ordinary combat kind —
  // exactly the shape countedEnemies must exempt (def-level flags can't).
  check('clear law: the husk kind itself is NOT def-passive (the trap)',
    !MONSTERS.cinderkin.passive && !MONSTERS.cinderkin.noObjective);
  w.devThrongPocketHere('gather_cinderkin', 3);
  const husks = w.actors.filter(a => a.throngWild === 'cinderkin');
  check('clear law: three husks stand on team enemy, armored',
    husks.length === 3 && husks.every(h => h.team === 'enemy' && h.passive && h.untargetable));
  w.update(DT);
  check('clear law: husks alone COMPLETE the clear (they never counted)',
    w.objectiveDone);
  // A REAL enemy still gates: reset the latch, stand a zombie up, and the
  // straggler pointer names exactly it — never the husks beside it.
  w.objectiveDone = false;
  const mob = w.createMonster('zombie', 3, 'enemy');
  mob.pos = vec(p.pos.x + 300, p.pos.y);
  w.actors.push(mob);
  w.update(DT);
  const view = w.objectiveStragglersView();
  check('clear law: a live combatant still gates, and the pointer names it alone',
    !w.objectiveDone && view?.kind === 'clear' && view.points.length === 1);
  w.kill(mob, true);
  w.update(DT);
  check('clear law: the combatant\'s death clears with husks still standing',
    w.objectiveDone && w.actors.filter(a => a.throngWild === 'cinderkin' && !a.dead).length === 3);
}

// --- 9) THE LEVER GEMS: grafted sources, trickle, the find levers ------------
{
  // Registry + gating: the 'throng' capability word is FOLDED at load onto
  // every anchor, and the graft gems gate on it — never a plain summon.
  check('levers: the throng tag folds onto every anchor at registry load',
    ['gather_cinderkin', 'beckon_palewisps', 'raise_gnatveil', 'loose_marrowgrubs']
      .every(id => SKILLS[id].tags.includes('throng'))
    && !SKILLS.summon_skeleton.tags.includes('throng'));
  check('levers: source-graft gems fit anchors and REFUSE plain summons',
    supportFits(SUPPORTS.patient_brood, SKILLS.beckon_palewisps)
    && supportFits(SUPPORTS.hidden_reserves, SKILLS.beckon_palewisps)
    && !supportFits(SUPPORTS.patient_brood, SKILLS.summon_skeleton)
    && supportFits(SUPPORTS.chitinous_brood, SKILLS.summon_skeleton));

  // THE GAUGE GRAFT (the user's exact ask): the world-found Palewisps
  // learn the battle-fed grammar by socket choice — authored spec untouched.
  const w = makeSimWorld('summoner', 0x9aff);
  const p = w.player;
  p.sheet.setSource('probeacc', [mod('accuracy', 'increased', 8)]);
  w.devThrongGrant('beckon_palewisps');
  const inst = p.skills.find(s => s?.def.id === 'beckon_palewisps')!;
  inst.sockets[0] = { def: SUPPORTS.hidden_reserves, level: 1 };
  w.devThrongFillGauge('beckon_palewisps');
  const prey = w.createMonster('zombie', 8, 'enemy');
  prey.pos = vec(p.pos.x + 40, p.pos.y);
  w.actors.push(prey);
  // Two landed blows: 96 primed + fill 3 + fill 3 crosses the 100 brim.
  w.executeSkill(p, makeSkillInstance(SKILLS.claw, 1), vec(prey.pos.x, prey.pos.y));
  w.executeSkill(p, makeSkillInstance(SKILLS.claw, 1), vec(prey.pos.x, prey.pos.y));
  check('graft: a socketed gauge births husks for the POCKET flavor',
    w.actors.filter(a => a.throngWild === 'palewisp').length >= 1,
    `${w.actors.filter(a => a.throngWild === 'palewisp').length} husks`);
  check('graft: the AUTHORED sources never mutate (doctrine pin survives)',
    !SKILLS.beckon_palewisps.throng!.sources.some(r => r.kind === 'gauge'));

  // THE TRICKLE ('roster'): a synthetic anchor replenishes straight into
  // the roster below cap, stands DISARMED at cap, and re-arms on loss.
  const trickleDef = {
    id: 'probe_trickle', name: 'Probe Trickle', noDrop: true, description: '',
    tags: ['spell', 'minion', 'summon', 'throng'], color: '#fff',
    manaCost: 0, cooldown: 0, useTime: 0,
    castMode: 'channel', channel: { interval: 0.25 },
    delivery: { type: 'self' },
    effects: [{ type: 'throngDirect' }],
    throng: { monsterId: 'palewisp', cap: 2, sources: [{ kind: 'trickle', everySec: 1, at: 'roster' }] },
  } as SkillDef;
  const slot = p.skills.findIndex(s => !s);
  p.skills[slot] = makeSkillInstance(trickleDef, 1);
  step(w, 1.4);
  const roster1 = w.throngBodiesOf(p, 'probe_trickle').length;
  check('trickle: the brood replenishes the ROSTER directly', roster1 >= 1, `${roster1} after 1.4s`);
  step(w, 3);
  check('trickle: the clock respects the cap',
    w.throngBodiesOf(p, 'probe_trickle').length === 2);
  const lost = w.throngBodiesOf(p, 'probe_trickle')[0];
  w.kill(lost, true);
  step(w, 0.4);
  check('trickle: at-cap stands DISARMED — a loss re-arms with a FULL wait',
    w.throngBodiesOf(p, 'probe_trickle').length === 1);
  step(w, 1.4);
  check('trickle: the re-armed clock refills the loss',
    w.throngBodiesOf(p, 'probe_trickle').length === 2);

  // THE FIND-SIZE FOLD (throngYield): the same trickle under +100% yield
  // mints TWO bodies per beat — quanta-rounded, cap-clamped.
  const w2 = makeSimWorld('summoner', 0x9aff);
  const p2 = w2.player;
  p2.sheet.setSource('probe', [mod('throngYield', 'increased', 1.0)]);
  const t2 = {
    ...trickleDef, id: 'probe_trickle2',
    throng: { monsterId: 'palewisp', cap: 6, sources: [{ kind: 'trickle', everySec: 1, at: 'roster' }] },
  } as SkillDef;
  p2.skills[p2.skills.findIndex(s => !s)] = makeSkillInstance(t2, 1);
  step(w2, 1.4);
  check('yield: +100% find size doubles the trickle drop (quanta, never fractions)',
    w2.throngBodiesOf(p2, 'probe_trickle2').length === 2,
    `${w2.throngBodiesOf(p2, 'probe_trickle2').length} after one beat`);

  // THE POCKET LEVER at the boot itself: same seed twice — the stats
  // world APPENDS pockets and grows clusters, while every AUTHORED
  // first-pocket seat stands EXACTLY where the bare world put it (the
  // append law: find levers change counts, never maps).
  // interactSpot SPLICES its poi list (one POI, one occupant) — each boot
  // gets its own fresh copy or the second world reads a shorter map.
  const poiList = (): Vec2[] => [vec(600, 500), vec(900, 700), vec(500, 900), vec(1100, 500)];
  const bare = makeSimWorld('summoner', 0xb007);
  bare.devThrongGrant('beckon_palewisps');
  (bare as unknown as { bootThrong(p: Vec2[]): void }).bootThrong(poiList());
  const bareHusks = bare.actors.filter(a => a.throngWild === 'palewisp');
  const rich = makeSimWorld('summoner', 0xb007);
  rich.devThrongGrant('beckon_palewisps');
  rich.player.sheet.setSource('probe', [
    mod('throngPockets', 'flat', 2), mod('throngYield', 'increased', 1.0)]);
  const richInst = rich.player.skills.find(s => s?.def.id === 'beckon_palewisps')!;
  richInst.sockets[0] = { def: SUPPORTS.teeming_warrens, level: 1 }; // +1 more pocket, +50% more yield
  (rich as unknown as { bootThrong(p: Vec2[]): void }).bootThrong(poiList());
  const richHusks = rich.actors.filter(a => a.throngWild === 'palewisp');
  check('pockets: the levers grow the zone\'s finds',
    richHusks.length > bareHusks.length, `${bareHusks.length} → ${richHusks.length}`);
  const keyPos = (ws: typeof bare, k: string): string => {
    const h = ws.actors.find(a => a.throngPocketKey === k);
    return h ? `${Math.round(h.pos.x)},${Math.round(h.pos.y)}` : 'gone';
  };
  const firstKeys = bareHusks.map(h => h.throngPocketKey!).filter(k => k.includes('#0.'));
  check('pockets: authored seats never move under the levers (the append law)',
    firstKeys.length > 0 && firstKeys.every(k => keyPos(bare, k) === keyPos(rich, k)));
}

// --- 10) THE PLY LEVERS: flat plies + the calcified trade --------------------
{
  const w = makeSimWorld('summoner', 0xab1e);
  const p = w.player;
  const mk = (gem?: string): Actor => {
    const inst = makeSkillInstance(SKILLS.summon_skeleton, 1);
    if (gem) inst.sockets[0] = { def: SUPPORTS[gem], level: 1 };
    w.executeSkill(p, inst, vec(p.pos.x + 40, p.pos.y));
    const mine = w.actors.filter(a => a.owner === p && a.kind === 'minion');
    return mine[mine.length - 1];
  };
  const bare = mk();
  const shelled = mk('chitinous_brood');
  check('plies: a plied-LESS summon grows its first ply (the fabric stands up)',
    bare.pliesMax === 0 && shelled.pliesMax === 1 && shelled.plies === 1,
    `bare ${bare.pliesMax}, shelled ${shelled.pliesMax}`);
  const calc = mk('calcified_vigor');
  check('trade: 70% granted life became exactly one ply — life unmoved',
    calc.pliesMax === 1 && Math.abs(calc.maxLife() - bare.maxLife()) < 0.5,
    `plies ${calc.pliesMax}, life ${calc.maxLife().toFixed(0)} vs bare ${bare.maxLife().toFixed(0)}`);
  // Trade + Hardy Brood: 1.2 total increase → one ply + a 0.5 remainder.
  const inst2 = makeSkillInstance(SKILLS.summon_skeleton, 1);
  inst2.sockets[0] = { def: SUPPORTS.calcified_vigor, level: 1 };
  inst2.sockets[1] = { def: SUPPORTS.hardy_brood, level: 1 };
  const before2 = w.actors.length;
  w.executeSkill(p, inst2, vec(p.pos.x + 60, p.pos.y));
  const both = w.actors[before2] ?? w.actors[w.actors.length - 1];
  check('trade: the remainder past the threshold stays LIFE',
    both.pliesMax === 1 && both.maxLife() > bare.maxLife() * 1.4,
    `life ×${(both.maxLife() / bare.maxLife()).toFixed(2)}`);

  // Batch symmetry (the quanta law): the trade reads PRE-batch investment,
  // so a throng body calcifies at the same price as a classic summon —
  // def plies 2 + 1 traded, life back at the un-gemmed fold.
  w.devThrongGrant('loose_marrowgrubs');
  const anchor = p.skills.find(s => s?.def.id === 'loose_marrowgrubs')!;
  w.devThrongMint('loose_marrowgrubs', 1);
  const plain = w.throngBodiesOf(p, 'loose_marrowgrubs')[0];
  const plainLife = plain.maxLife();
  anchor.sockets[0] = { def: SUPPORTS.calcified_vigor, level: 1 };
  w.devThrongMint('loose_marrowgrubs', 1);
  const calcGrub = w.throngBodiesOf(p, 'loose_marrowgrubs')[1];
  check('trade: batch symmetry — a throng body calcifies at the classic price',
    plain.pliesMax === 2 && calcGrub.pliesMax === 3
    && Math.abs(calcGrub.maxLife() - plainLife) < 0.5,
    `plies ${plain.pliesMax} → ${calcGrub.pliesMax}, life ${calcGrub.maxLife().toFixed(0)} vs ${plainLife.toFixed(0)}`);
  // Flat minionPlies on an already-plied kind stacks atop the def count.
  p.sheet.setSource('probeply', [mod('minionPlies', 'flat', 1)]);
  w.devThrongMint('loose_marrowgrubs', 1);
  const stacked = w.throngBodiesOf(p, 'loose_marrowgrubs')[2];
  check('plies: flat minionPlies stacks atop a def\'s own count (quanta)',
    stacked.pliesMax === 4, `pliesMax ${stacked.pliesMax}`);
}

console.log(failed ? `\n${failed} FAILURE(S)` : '\nALL PASS');
process.exit(failed ? 2 : 0);
