// ---------------------------------------------------------------------------
// ONE-OFF PROBE — THE GRAB FABRIC end to end on the real engine
// (docs/engine/grab.md): the registry weave (skills/tags/statuses/stats/
// parts/combo), the pure laws (refusal ladder, seat geometry, policy
// tiers), seize → pair → slave (drawn == held, reel included), the mover
// contract's struggle feed, the useSkill mash lane + holding gate, the
// pushActor jostle + holder shove-release, ally SEVER, hard-CC release,
// swallow (conceal + untargetable + digestion credit + burst-out +
// spit-at-foe), THE THROW (pair release, authored push, wall-kill credit,
// re-seize grace), the Takedown combo measure riding the grab/throw tags,
// policy tiers + per-def overrides + the mass gate, the gore-stakes
// minSpeed contact row, and determinism.
// Run: npx tsx balance/probe_grab.ts
// ---------------------------------------------------------------------------

import { bootSimEngine, makeSimWorld } from '../src/sim/arena';
import { seedGlobalRandom } from '../src/sim/rng';
import { SKILLS } from '../src/data/skills';
import { MONSTERS } from '../src/data/monsters';
import { LOOKS } from '../src/data/looks';
import { COMBO_RULES } from '../src/data/combos';
import { STATUS_DEFS } from '../src/engine/status';
import { STAT_DEFS, mod } from '../src/engine/stats';
import {
  GRAB_CFG, GRAB_MARKER, grabPolicyOf, grabRefusal, grabSeatPos,
  struggleRate, type GripHold,
} from '../src/engine/grab';
import { PART_PAINTERS } from '../src/render/vis/parts';
import { updateAI, isDormant } from '../src/engine/ai';
import { vec, dist } from '../src/core/math';
import type { Actor } from '../src/engine/actor';

let failed = 0;
const check = (name: string, ok: boolean, detail = ''): void => {
  console.log(`${ok ? 'PASS' : 'FAIL'}  ${name}${detail ? ' — ' + detail : ''}`);
  if (!ok) failed++;
};

bootSimEngine();
seedGlobalRandom(0x6b2a);

const DT = 1 / 60;
// The HOST frame loop, verbatim (sim/runner.ts order): AI per actor, then
// the world tick — w.update alone leaves every brain frozen.
const step = (w: ReturnType<typeof makeSimWorld>, sec: number): void => {
  for (let t = 0; t < sec; t += DT) {
    for (const a of w.actors) updateAI(a, w, DT);
    w.update(DT);
  }
};
// World ticks with every BRAIN frozen — isolates the fabric's own clocks
// (passive struggle, digestion, markers) from AI-driven feeds.
const tick = (w: ReturnType<typeof makeSimWorld>, sec: number): void => {
  for (let t = 0; t < sec; t += DT) w.update(DT);
};

// --- 0) Registry weave + pure laws ------------------------------------------
{
  check('registry: the player lane + the grip kin kit carry the verbs',
    !!SKILLS.seize?.effects.some(f => f.type === 'grabSeize')
    && !!SKILLS.heave?.effects.some(f => f.type === 'grabThrow')
    && !!SKILLS.gaff_cast && !!SKILLS.mauler_clinch && !!SKILLS.mauler_toss && !!SKILLS.gulp);
  check('registry: the grapple alphabet is worn (grab/throw tags)',
    SKILLS.seize.tags.includes('grab') && SKILLS.heave.tags.includes('throw')
    && SKILLS.gaff_cast.tags.includes('grab') && SKILLS.mauler_toss.tags.includes('throw'));
  check('registry: throws are holding-gated (the thirst-gate idiom)',
    SKILLS.heave.gate?.holding === true && SKILLS.mauler_toss.gate?.holding === true);
  check('registry: the grip kin stand with looks + the verb tack parts',
    !!MONSTERS.gaff_wrangler && !!MONSTERS.yoke_mauler && !!MONSTERS.gorge_gulper && !!MONSTERS.maw_bloom
    && !!LOOKS.gaff_wrangler && !!LOOKS.yoke_mauler && !!LOOKS.gorge_gulper && !!LOOKS.maw_bloom
    && !!PART_PAINTERS.grapnel && !!PART_PAINTERS.yoke && !!PART_PAINTERS.gulletSac);
  check('registry: marker statuses exist; swallowed CONCEALS',
    !!STATUS_DEFS.seized && STATUS_DEFS.swallowed?.conceals === true);
  check('registry: gripPower/wriggle are seated stats',
    !!STAT_DEFS.gripPower && !!STAT_DEFS.wriggle);
  check('registry: the Takedown measure reads the grapple alphabet',
    COMBO_RULES.grapplers_rhythm?.seq?.length === 2
    && !!STAT_DEFS.combo_grapplers_rhythm);
  check('registry: maw_bloom is planted + never luggage',
    (MONSTERS.maw_bloom.base.moveSpeed ?? 1) <= 0 && MONSTERS.maw_bloom.grabbable === false);
  check('registry: the gulper reuses the caulborn tongue (shared catalog, no fork)',
    MONSTERS.gorge_gulper.skills.includes('tongue_reel')
    && MONSTERS.maw_bloom.skills.includes('gulp')
    && MONSTERS.gorge_gulper.skills.includes('gulp'));
}

// --- 1) Pure laws: refusal ladder, seat geometry ----------------------------
{
  const w = makeSimWorld('summoner', 0x9a01);
  const p = w.player;
  const z = w.createMonster('zombie', 5, 'enemy');
  z.pos = vec(p.pos.x + 40, p.pos.y);
  w.actors.push(z);
  const spec = { verb: 'carry' as const };

  check('law: an ordinary catch is eligible', grabRefusal(p, z, spec, 0) === null);
  check('law: full hands refuse',
    (p.gripping = { id: z.id } as GripHold, grabRefusal(p, z, spec, 0) === 'hands full'));
  p.gripping = undefined;
  check('law: the mass gate refuses up-weight and gripPower opens it', (() => {
    z.sheet.setSource('probe', [mod('weight', 'flat', 1)]);
    const heavy = grabRefusal(p, z, spec, 0);
    const opened = grabRefusal(p, z, spec, 1.5);
    z.sheet.setSource('probe', [mod('weight', 'flat', GRAB_CFG.eligibility.maxRatio + 6)]);
    const anatomy = grabRefusal(p, z, spec, 99);
    z.sheet.setSource('probe', []);
    return heavy === 'too heavy' && opened === null && anatomy === 'far too heavy';
  })(), `victim effW ${z.effectiveWeight().toFixed(2)}`);
  check('law: policy tiers — rare scrambles, crowned refuses, def word wins', (() => {
    z.rarity = 'rare';
    const rare = grabPolicyOf(z);
    z.rarity = 'crowned';
    const crowned = grabRefusal(p, z, spec, 0);
    z.grabbable = 2;
    const word = grabPolicyOf(z);
    z.rarity = undefined; z.grabbable = undefined;
    return rare === GRAB_CFG.policy.rare && crowned === 'too mighty to hold' && word === 2;
  })());
  check('law: no rim to hold — phasing refuses', (() => {
    z.sheet.setSource('probe', [mod('phasing', 'flat', 1)]);
    const why = grabRefusal(p, z, spec, 0);
    z.sheet.setSource('probe', []);
    return why === 'no rim to hold';
  })());
  check('law: cross-altitude refuses', (() => {
    z.flying = true;
    const why = grabRefusal(p, z, spec, 0);
    z.flying = false;
    return why === 'out of reach';
  })());

  // Seat geometry: carry LEADS the facing, drag TRAILS it — one resolver.
  p.facing = 0;
  const hold = { id: z.id, verb: 'carry', bearing: 0 } as GripHold;
  const seat = { x: 0, y: 0 };
  grabSeatPos(p, z, hold, seat);
  const lead = seat.x - p.pos.x;
  hold.verb = 'drag';
  grabSeatPos(p, z, hold, seat);
  const trail = seat.x - p.pos.x;
  hold.verb = 'swallow';
  grabSeatPos(p, z, hold, seat);
  check('law: seats — carry leads, drag trails, swallow centers',
    lead > 0 && trail < 0 && Math.abs(seat.x - p.pos.x) < 1e-6,
    `lead ${lead.toFixed(0)} trail ${trail.toFixed(0)}`);
}

// --- 2) Seize → pair → slave → the throw (the player's lane) ----------------
{
  const w = makeSimWorld('summoner', 0x9a02);
  const p = w.player;
  check('dev grant mounts the lane', w.devGrabGrant('seize') && w.devGrabGrant('heave'));
  const heave = p.skills.find(s => s?.def.id === 'heave')!;
  check('the holding gate refuses mime work (empty-handed Heave)',
    !w.useSkill(p, heave, vec(p.pos.x + 100, p.pos.y)));

  // Open ground: the slave-step law is about the resolver, not about
  // whatever furniture the spawn room keeps (clampPos legitimately bends
  // a seat out of a solid — wall-press rules hold for held bodies too).
  p.pos = w.clampPos(vec(w.arena.w / 2, w.arena.h / 2), p.radius);
  const z = w.createMonster('zombie', 3, 'enemy');
  z.pos = vec(p.pos.x + 50, p.pos.y);
  w.actors.push(z);
  p.facing = 0;
  const seize = p.skills.find(s => s?.def.id === 'seize')!;
  check('seize press accepted', w.useSkill(p, seize, vec(z.pos.x, z.pos.y)));
  tick(w, 0.7); // through the cast bar; the swing lands the grabSeize
  check('the pair formed 1:1 (gripping ↔ heldBy)',
    p.gripping?.id === z.id && z.heldBy === p.id);
  check('the victim wears the marker', z.statuses.some(s => s.id === GRAB_MARKER.carry));

  // Drawn == held: walk the holder; the catch rides the one resolver
  // (compared through the same clamp the sweep applies).
  p.pos.x += 90; p.pos.y -= 40;
  tick(w, 0.4); // the reel closes any gap, then the seat wins the frame
  const seat = { x: 0, y: 0 };
  grabSeatPos(p, z, p.gripping!, seat);
  const cSeat = w.clampPos(vec(seat.x, seat.y), z.radius);
  check('the slave step rides grabSeatPos (drawn == held)',
    dist(z.pos, cSeat) < 2, `off by ${dist(z.pos, cSeat).toFixed(2)}`);

  // The mover contract: a held body's own step is refused AND feeds.
  const s0 = p.gripping!.struggle;
  const zx = z.pos.x;
  w.moveActor(z, 1, 0, DT);
  check('mover contract: held movement refused, intent feeds the meter',
    z.pos.x === zx && p.gripping!.struggle > s0);

  // A shove on the catch jostles the grip, never moves the pair.
  const s1 = p.gripping!.struggle;
  w.pushActor(z, 0, 300);
  tick(w, 0.1);
  grabSeatPos(p, z, p.gripping!, seat);
  const cSeat2 = w.clampPos(vec(seat.x, seat.y), z.radius);
  check('pushActor on a held body: eaten by the grip (feed, no flight)',
    p.gripping!.struggle > s1 && dist(z.pos, cSeat2) < 2);

  // THE THROW: release + authored push (authority/credit ride pushActor).
  const thrown = w.useSkill(p, heave, vec(p.pos.x + 200, p.pos.y));
  tick(w, 0.5);
  check('heave: the pair released and the flight is AUTHORED',
    thrown && !p.gripping && z.heldBy === undefined
    && z.push != null && z.push.caster === p);
  check('the re-seize grace stamps (anti-chain)', z.grabProofUntil > w.time);
  // Ride out the seize cooldown, hold the grace open by hand, and press:
  // the cast happens, the SEIZE refuses — the grip finds nothing to keep.
  tick(w, 5.2);
  z.grabProofUntil = w.time + 60;
  z.pos = vec(p.pos.x + 50, p.pos.y);
  const reseize = w.useSkill(p, seize, vec(z.pos.x, z.pos.y));
  tick(w, 0.7);
  check('...and the grace REFUSES the immediate re-grab',
    reseize && !p.gripping);
}

// --- 3) Wall-kill credit + the Takedown measure -----------------------------
{
  const w = makeSimWorld('summoner', 0x9a03);
  const p = w.player;
  w.devGrabGrant('seize'); w.devGrabGrant('heave');
  p.pos = w.clampPos(vec(w.arena.w / 2, w.arena.h / 2), p.radius);
  // A REAL wall to collect the throw: the impact lane wounds on wall and
  // doodad arrests (the arena's outer bound clamps without classifying —
  // only real solids report 'wall'; the probe_mass staging). 'rock' is
  // the plain solid; the flight must ARRIVE above impact.minSpeed.
  w.doodads.push({ pos: vec(p.pos.x + 150, p.pos.y), radius: 50, kind: 'rock' } as never);
  w.markDoodadsChanged();
  // Wake the combo ring the ordinary way: the grammar stat equipped. The
  // ring arms at the first RECORD attempt (that cast itself goes un-rung),
  // so round ONE of seize-and-heave arms + part-records, and round TWO
  // completes the measure — exactly the cadence a fresh build lives.
  p.sheet.setSource('probe', [mod('combo_grapplers_rhythm', 'flat', 1)]);
  tick(w, 1.2);
  const seize = p.skills.find(s => s?.def.id === 'seize')!;
  const heave = p.skills.find(s => s?.def.id === 'heave')!;
  const meta = w.localSeat.meta;
  const progress = (): number => p.level * 1e6 + meta.xp; // monotone across level-ups
  const round = (sliver: boolean): { clinched: boolean; buff: boolean; victim: Actor } => {
    const z = w.createMonster('zombie', 3, 'enemy');
    z.pos = vec(p.pos.x - 50, p.pos.y);
    w.actors.push(z);
    w.useSkill(p, seize, vec(z.pos.x, z.pos.y));
    tick(w, 0.7);
    const clinched = p.gripping?.id === z.id;
    if (sliver) z.life = Math.min(z.life, 3); // AFTER the clinch — the wall does the arithmetic
    w.useSkill(p, heave, vec(p.pos.x + 2000, p.pos.y)); // east, into the wall
    tick(w, 1.2);
    const buff = p.buffs.has('takedown_surge'); // read INSIDE its 4s life
    if (!z.dead) w.kill(z, true); // clear the field for the next round
    tick(w, 4.2); // ride out the seize cooldown
    return { clinched, buff, victim: z };
  };
  const r1 = round(false);
  check('round one clinched (arming pass)', r1.clinched);
  const xp0 = progress();
  const r2 = round(true);
  check('round two clinched for the toss', r2.clinched);
  check('the wall collects the throw WITH CREDIT (xp paid to the thrower)',
    r2.victim.dead && progress() > xp0, `progress ${xp0} → ${progress()}`);
  check('Takedown: the seize-then-heave measure fired off the tag alphabet',
    r2.buff);
  p.sheet.setSource('probe', []);
}

// --- 4) The victim's eye: struggle out, mash lane, CC + sever rescues -------
{
  const w = makeSimWorld('summoner', 0x9a04);
  const p = w.player;
  const m = w.createMonster('yoke_mauler', Math.max(3, p.level), 'enemy');
  m.pos = vec(p.pos.x + 60, p.pos.y);
  w.actors.push(m);

  check('dev: the mauler pins me (the real grabSeize path)', w.devGrabSeizeMe('pin'));
  check('...pair + marker + the pin ROOTS its holder',
    m.gripping?.id === p.id && p.heldBy === m.id
    && p.statuses.some(s => s.id === 'seized'));

  // The mash lane: a refused press feeds the meter by mashPress exactly.
  const s0 = m.gripping!.struggle;
  const seizeInst = (w.devGrabGrant('seize'), p.skills.find(s => s?.def.id === 'seize')!);
  const refused = !w.useSkill(p, seizeInst, vec(p.pos.x + 50, p.pos.y));
  check('held fast: casts refuse and the button IS the struggle',
    refused && Math.abs(m.gripping!.struggle - s0 - GRAB_CFG.break.mashPress) < 1e-9);

  // The passive law: frozen brains, the meter still climbs at the math's rate.
  const s1 = m.gripping!.struggle;
  tick(w, 1);
  const grew = m.gripping!.struggle - s1;
  const want = struggleRate(m.gripping!, m, p);
  check('the passive struggle rate matches the mass law',
    Math.abs(grew - want) < want * 0.25 + 1e-3,
    `measured ${grew.toFixed(3)}/s vs law ${want.toFixed(3)}/s`);

  // Break out → grace; then hard CC on the holder is an instant rescue.
  m.gripping!.struggle = 1;
  tick(w, 0.1);
  check('struggle 1 BREAKS the hold + stamps my grace',
    !m.gripping && p.heldBy === undefined && p.grabProofUntil > w.time);
  p.grabProofUntil = 0;
  check('re-pin for the CC test', w.devGrabSeizeMe('pin'));
  m.applyStatus('stun', 0, 1, 'probe');
  tick(w, 0.2);
  check('hard CC on the holder RELEASES (the timeflow rescue too)',
    !m.gripping && p.heldBy === undefined);

  // ALLY SEVER: a skeleton of mine wounds the holder until the hold rips.
  p.grabProofUntil = 0;
  check('re-pin for the sever test', w.devGrabSeizeMe('pin'));
  const ally = w.createMonster('skeleton_warrior', Math.max(5, p.level + 2), p.team, p);
  ally.pos = vec(m.pos.x + 30, m.pos.y);
  w.actors.push(ally);
  step(w, 6); // the ally's own brain does the rescue
  check('ally SEVER: wounding the holder tore the hold open',
    p.heldBy === undefined, `severed ${(m.gripping?.severed ?? -1).toFixed(2)}`);
}

// --- 5) Swallow: conceal, digest, burst, spit -------------------------------
{
  const w = makeSimWorld('summoner', 0x9a05);
  const p = w.player;
  const g = w.createMonster('gorge_gulper', Math.max(4, p.level), 'enemy');
  g.pos = vec(p.pos.x + 55, p.pos.y);
  w.actors.push(g);

  check('gulped (dev, real path)', w.devGrabSeizeMe('swallow'));
  check('swallowed: concealed marker + untargetable + centered',
    p.statuses.some(s => s.id === 'swallowed') && p.untargetable === true);
  const life0 = p.life;
  const gl0 = g.life;
  tick(w, 1.5);
  check('digestion ticks through the one mitigation ladder (and leeches)',
    p.life < life0 && g.life >= gl0, `me ${life0.toFixed(0)}→${p.life.toFixed(0)}`);
  // Burst out: the meal fights back.
  g.gripping!.struggle = 1;
  tick(w, 0.1);
  check('burst-out: freed, restored, and the gullet PAID for it',
    p.heldBy === undefined && p.untargetable === false && g.life < gl0 + 1,
    `gullet ${gl0.toFixed(0)}→${g.life.toFixed(0)}`);
  check('...and the swallowed marker is stripped NOW (no ghost conceal)',
    !p.statuses.some(s => s.id === 'swallowed'));

  // The spit: patience ends at the holder's choosing, at speed, authored.
  p.grabProofUntil = 0;
  check('re-gulped', w.devGrabSeizeMe('swallow'));
  g.gripping!.until = w.time; // patience over
  tick(w, 0.2);
  check('the spit: released as an AUTHORED impulse (gulper keeps the credit)',
    p.heldBy === undefined && p.push != null && p.push.caster === g);
}

// --- 6) The planted spare + the gore stakes ---------------------------------
{
  const w = makeSimWorld('summoner', 0x9a06);
  const p = w.player;
  // A dormant sentry may never be seized (the planted spare).
  const s = w.createMonster('zombie', 3, 'enemy');
  s.pos = vec(p.pos.x + 40, p.pos.y);
  s.tag = 'migrant';
  w.actors.push(s);
  if (isDormant(s)) {
    // THE SENTRY DOCTRINE, both halves: a deliberate seize-HIT rouses the
    // sleeper first (the hit that rouses restores physics the same tick),
    // so a seized sentry is ALWAYS awake — never carried off asleep. The
    // grabSeize dormancy guard exists for splash-borne seizes, where no
    // rousing blow preceded it.
    w.devGrabGrant('seize');
    const inst = p.skills.find(sk => sk?.def.id === 'seize')!;
    w.useSkill(p, inst, vec(s.pos.x, s.pos.y));
    tick(w, 0.7);
    check('the sentry doctrine: never seized ASLEEP (roused first, or spared)',
      !p.gripping || s.aiAwakened === true,
      p.gripping ? 'seized awake' : 'spared');
  } else {
    check('the sentry doctrine: staging unavailable (tag not dormant here) — pane QA covers', true);
  }
  s.tag = undefined;

  // THE ORPHAN REPAIR: a victim bound to a VANISHED holder (zone travel,
  // a splice) is healed by the sweep — heldBy cleared, markers stripped.
  const orphan = w.createMonster('zombie', 3, 'enemy');
  orphan.pos = vec(p.pos.x + 200, p.pos.y + 200);
  w.actors.push(orphan);
  orphan.heldBy = 99871; // a ghost id no actor wears
  orphan.applyStatus('seized', 0, 1, 'probe');
  tick(w, 0.2);
  check('orphan repair: a ghost hold is healed by the sweep',
    orphan.heldBy === undefined && !orphan.statuses.some(st => st.id === 'seized'));

  // THE GORE STAKES: walkable at a stroll, shredding at speed. The test
  // stand is sized to the push physics (speed = strength × damping ÷
  // weight, decaying ~5.5/s): the launch must still be above minSpeed
  // across ≥ one full sweep cadence INSIDE the row — the same landing-
  // zone geometry the live stamps reward (stake the ground throws END on).
  const z = w.createMonster('zombie', 3, 'enemy');
  z.pos = vec(p.pos.x + 400, p.pos.y);
  w.actors.push(z);
  w.doodads.push({ pos: vec(z.pos.x + 110, z.pos.y), radius: 90, kind: 'gore_stakes' } as never);
  w.collectContactHazards();
  const zl0 = z.life;
  tick(w, 1.2); // standing (speed 0) INSIDE the row's rim
  check('stakes: a still/strolling body is untouched (minSpeed gates)',
    z.life === zl0 && !z.statuses.some(st => st.id === 'bleed'));
  w.pushActor(z, 0, 320, p); // hurled INTO the row — lands inside it at speed
  tick(w, 0.6);
  check('stakes: a HURLED body is shredded + bleeds',
    z.life < zl0 && z.statuses.some(st => st.id === 'bleed'),
    `life ${zl0.toFixed(0)}→${z.life.toFixed(0)}`);
}

// --- 7) Determinism ---------------------------------------------------------
{
  const script = (seed: number): string => {
    seedGlobalRandom(seed);
    const w = makeSimWorld('summoner', seed);
    const p = w.player;
    w.devGrabGrant('seize'); w.devGrabGrant('heave');
    const z = w.createMonster('zombie', 3, 'enemy');
    z.pos = vec(p.pos.x + 50, p.pos.y);
    w.actors.push(z);
    const seize = p.skills.find(s => s?.def.id === 'seize')!;
    const heave = p.skills.find(s => s?.def.id === 'heave')!;
    w.useSkill(p, seize, vec(z.pos.x, z.pos.y));
    tick(w, 0.7);
    w.useSkill(p, heave, vec(p.pos.x + 300, p.pos.y + 120));
    tick(w, 1.5);
    return `${z.pos.x.toFixed(3)},${z.pos.y.toFixed(3)},${z.life.toFixed(3)},${p.gripping ? 1 : 0}`;
  };
  const a = script(0x5eed), b = script(0x5eed);
  check('determinism: the same seed writes the same throw', a === b, a);
}

console.log(failed ? `\n${failed} FAILED` : '\nALL PASS');
process.exit(failed ? 1 : 0);
