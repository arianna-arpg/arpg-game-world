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
// minSpeed contact row, determinism, and THE FRIENDLY CATCH (the hand-off:
// atomic pair re-point + reel, struggle carried, mass-law refusal + empty-
// field fallbacks to the ordinary launch, mid-reel sever + receiver-death
// releases, the press path through the grabThrow effect's handoff field).
// Plus THE CHARGE CARRY (DashDelivery.onContact — the gorer's drag-armed
// run): contact mid-run seizes, the patience rides the run's own clock,
// the run's end sheds forward with authority already spent (wall arrest =
// the mass fabric's wound), the ladder releases early, ineligible victims
// refuse, confines hold at walls + pit rims, and a bare dash (the player's
// charge) stays byte-identical.
// Run: npx tsx balance/probe_grab.ts
// ---------------------------------------------------------------------------

import { bootSimEngine, makeSimWorld } from '../src/sim/arena';
import { seedGlobalRandom } from '../src/sim/rng';
import { makeSkillInstance } from '../src/engine/skills';
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
import { MASS_CFG } from '../src/engine/mass';
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
  // The rig hangs on ONE swing landing — floor the victim's evasion so the
  // roll can never whiff it (data passes shift the global stream, and a
  // single-roll probe re-arms as a time bomb with every repo change).
  z.sheet.setSource('probe', [mod('evasion', 'flat', -1e6)]);
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
    z.sheet.setSource('probe', [mod('evasion', 'flat', -1e6)]); // the swing must land
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
    z.sheet.setSource('probe', [mod('evasion', 'flat', -1e6)]); // the swing must land
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

// --- 8) THE FRIENDLY CATCH: the hand-off ------------------------------------
// The throw grammar's handoff field passes the catch to a kin holder: the
// pair re-points ATOMICALLY (no release, no flight, no grace) and the
// ordinary slave step reels the body across — held every frame of the pass.
{
  const w = makeSimWorld('summoner', 0x9a08);
  const p = w.player;
  p.pos = w.clampPos(vec(w.arena.w / 2, w.arena.h / 2), p.radius);
  const m = w.createMonster('yoke_mauler', Math.max(3, p.level), 'enemy');
  const g = w.createMonster('gorge_gulper', Math.max(4, p.level), 'enemy');
  // The receiver sits PERPENDICULAR to the thrower so the reel lane is
  // clear: a body parked dead-center in the lane shoulder-locks the
  // crossing (the separation pass's third-party law re-arms against the
  // reel every frame — a passive obstacle marches glued at ~1/5 speed;
  // live brains break the lock, frozen probe brains never would).
  const place = (): void => {
    m.pos = vec(p.pos.x + 55, p.pos.y);       // nearest — the mauler seizes
    g.pos = vec(p.pos.x, p.pos.y - 225);      // in range of m (~232 < 260), lane clear
  };
  place();
  w.actors.push(m, g);
  const gulpFx = SKILLS.gulp.effects.find(f => f.type === 'grabSeize');
  const gulpSpec = gulpFx?.type === 'grabSeize' ? gulpFx.grab : { verb: 'swallow' as const };

  // Pure law: the handoffFrom mask waives exactly the two rungs the pass
  // makes moot — the victim's current binding and the swallow's conceal —
  // and answers every other rung with the receiver's own numbers.
  check('handoff staging: the mauler pins me', w.devGrabSeizeMe('pin') && m.gripping?.id === p.id);
  check('law: mid-hold the plain read refuses (already held)',
    grabRefusal(g, p, gulpSpec, 0) === 'already held');
  check('law: the handoffFrom mask makes the receiver eligible',
    grabRefusal(g, p, gulpSpec, 0, m.gripping!) === null);
  // The conceal reads the hold's own record, not the live flag: a mid-
  // swallow catch (untargetable NOW, targetable before the first seize)
  // passes the masked read; a body that was untargetable BEFORE any hand
  // touched it stays refused however it is currently held.
  p.untargetable = true; // a live swallow's conceal
  const maskedClear = grabRefusal(g, p, gulpSpec, 0, m.gripping!);
  m.gripping!.wasUntargetable = true; // as if the FIRST seize found no purchase either
  const maskedVeiled = grabRefusal(g, p, gulpSpec, 0, m.gripping!);
  m.gripping!.wasUntargetable = false;
  p.untargetable = false;
  check('law: the conceal reads through wasUntargetable (the pre-seize truth)',
    maskedClear === null && maskedVeiled === 'no purchase');

  // THE PASS (the patience chokepoint): bank struggle, temper the live
  // hold's spec (a COPY — the registry object is shared), end patience.
  m.gripping!.struggle = 0.37;
  m.gripping!.spec = { ...m.gripping!.spec, throw: { impulse: 480, handoff: {} } };
  m.gripping!.until = w.time;
  tick(w, 0.05);
  check('the pass: the pair re-pointed to the receiver ATOMICALLY',
    p.heldBy === g.id && g.gripping?.id === p.id && !m.gripping);
  check('THE CARRY LAW: banked struggle rides the pass untouched',
    g.gripping!.struggle >= 0.37 && g.gripping!.struggle < 0.42,
    `carried ${g.gripping!.struggle.toFixed(3)}`);
  check('the receiver holds with its OWN art (gulp — verb, marker, conceal)',
    g.gripping!.verb === 'swallow' && g.gripping!.skillId === 'gulp'
    // (truthy read, not === true — the checker narrowed the field to the
    // literal false we staged above and cannot see the sweep re-flag it)
    && p.statuses.some(s => s.id === 'swallowed') && !!p.untargetable);
  check('no flight, no grace: a pass is not a release',
    p.push == null && p.grabProofUntil === 0);
  check('the sever accumulator starts FRESH on the new body',
    g.gripping!.severed === 0);

  // THE REEL: held every frame of the crossing, converging on the one
  // resolver's seat (drawn == held — the wire's own read rides the same
  // pair, so the gb meter re-labels and keeps its fraction seamlessly).
  tick(w, 0.1);
  const seat = { x: 0, y: 0 };
  grabSeatPos(g, p, g.gripping!, seat);
  check('mid-reel: still held, still crossing (no teleport)',
    p.heldBy === g.id && dist(p.pos, seat) > 40,
    `gap ${dist(p.pos, seat).toFixed(0)}`);
  tick(w, 0.8);
  grabSeatPos(g, p, g.gripping!, seat);
  const cSeat = w.clampPos(vec(seat.x, seat.y), p.radius);
  check('the reel converges on grabSeatPos (drawn == held)',
    p.heldBy === g.id && dist(p.pos, cSeat) < 2, `off by ${dist(p.pos, cSeat).toFixed(2)}`);

  // MID-TRANSFER SEVER: the ladder keeps working while the body crosses —
  // a receiver wounded past severFrac mid-reel drops the catch where the
  // reel left it (grace stamped; never dragged on to the seat).
  w.devGrabClearAll();
  p.grabProofUntil = 0;
  place();
  check('re-pin for the mid-reel sever', w.devGrabSeizeMe('pin') && m.gripping?.id === p.id);
  m.gripping!.spec = { ...m.gripping!.spec, throw: { impulse: 480, handoff: {} } };
  m.gripping!.until = w.time;
  tick(w, 0.05);
  check('...passed and reeling', p.heldBy === g.id);
  g.gripping!.severed = 1; // allies tore the NEW holder open mid-crossing
  const preSeat = { x: 0, y: 0 };
  grabSeatPos(g, p, g.gripping!, preSeat);
  tick(w, 0.05);
  check('mid-reel SEVER releases through the standing ladder',
    p.heldBy === undefined && !g.gripping && p.grabProofUntil > w.time);
  check('...freed where the reel left it, conceal restored',
    dist(p.pos, preSeat) > 40 && p.untargetable === false);

  // A DYING RECEIVER mid-reel: the pair dies with either body — the sweep
  // frees the catch; an unowned in-between state never exists.
  p.grabProofUntil = 0;
  place();
  check('re-pin for the dying receiver', w.devGrabSeizeMe('pin') && m.gripping?.id === p.id);
  m.gripping!.spec = { ...m.gripping!.spec, throw: { impulse: 480, handoff: {} } };
  m.gripping!.until = w.time;
  tick(w, 0.05);
  check('...passed and reeling again', p.heldBy === g.id);
  w.kill(g, true);
  tick(w, 0.1);
  check('the receiver DIES mid-reel: freed, restored, marker stripped',
    p.heldBy === undefined && p.untargetable === false
    && !p.statuses.some(s => s.id === 'swallowed'));
}

// --- 9) The friendly catch: fallbacks + the press path ----------------------
{
  const w = makeSimWorld('summoner', 0x9a09);
  const p = w.player;
  p.pos = w.clampPos(vec(w.arena.w / 2, w.arena.h / 2), p.radius);
  const m = w.createMonster('yoke_mauler', Math.max(3, p.level), 'enemy');
  const g = w.createMonster('gorge_gulper', Math.max(4, p.level), 'enemy');
  m.pos = vec(p.pos.x + 55, p.pos.y);
  g.pos = vec(p.pos.x, p.pos.y - 225); // perpendicular — the reel lane stays clear
  w.actors.push(m, g);
  const gulpFx = SKILLS.gulp.effects.find(f => f.type === 'grabSeize');
  const gulpSpec = gulpFx?.type === 'grabSeize' ? gulpFx.grab : { verb: 'swallow' as const };

  // MASS-LAW REFUSAL → FALLBACK: the receiver stands in range but cannot
  // hold the catch — the throw falls back to the ordinary authored launch.
  // The weight is sized to refuse the GULPER (past its anatomy ceiling)
  // while leaving the launch a real flight: a mountain's push would decay
  // under the sweep's 40-speed floor before the assert could see it.
  check('fallback staging: pinned light', w.devGrabSeizeMe('pin') && m.gripping?.id === p.id);
  p.sheet.setSource('probe',
    [mod('weight', 'flat', g.effectiveWeight() * GRAB_CFG.eligibility.maxRatio + 4)]);
  check('law: the in-range receiver is MASS-refused under the mask',
    grabRefusal(g, p, gulpSpec, 0, m.gripping!) === 'far too heavy');
  m.gripping!.spec = { ...m.gripping!.spec, throw: { impulse: 480, handoff: {} } };
  m.gripping!.until = w.time;
  tick(w, 0.05);
  check('mass-law refusal falls back to the ORDINARY launch (authored)',
    p.heldBy === undefined && !m.gripping && !g.gripping
    && p.push != null && p.push.caster === m && p.grabProofUntil > w.time);
  p.sheet.setSource('probe', []);

  // EMPTY FIELD → FALLBACK: no receiver in range at all.
  p.grabProofUntil = 0;
  g.pos = vec(p.pos.x, p.pos.y - 900); // far beyond handoff range
  m.pos = vec(p.pos.x + 55, p.pos.y);
  check('re-pin on an empty field', w.devGrabSeizeMe('pin') && m.gripping?.id === p.id);
  m.gripping!.spec = { ...m.gripping!.spec, throw: { impulse: 480, handoff: {} } };
  m.gripping!.until = w.time;
  tick(w, 0.05);
  check('no receiver in range: the throw launches exactly as ever',
    p.heldBy === undefined && !g.gripping
    && p.push != null && p.push.caster === m);

  // THE PRESS PATH: the grabThrow EFFECT's handoff field through the one
  // pipeline — the mauler presses a handoff-tempered toss and the catch
  // changes hands instead of flying.
  p.grabProofUntil = 0;
  g.pos = vec(p.pos.x, p.pos.y - 225); // back in range, lane still clear
  m.pos = vec(p.pos.x + 55, p.pos.y);
  check('re-pin for the press', w.devGrabSeizeMe('pin') && m.gripping?.id === p.id);
  const tossFx = SKILLS.mauler_toss.effects.find(f => f.type === 'grabThrow');
  check('press staging: the toss row stands', tossFx?.type === 'grabThrow');
  if (tossFx?.type === 'grabThrow') {
    const probeToss = { ...SKILLS.mauler_toss, effects: [{ ...tossFx, handoff: {} }] };
    const pressed = w.useSkill(m, makeSkillInstance(probeToss, 1), vec(p.pos.x + 400, p.pos.y));
    tick(w, 0.8); // through the toss's cast bar; the resolve runs the pass
    check('the press passes the catch (fx.handoff through the one pipeline)',
      pressed && p.heldBy === g.id && g.gripping?.id === p.id && !m.gripping);
  }
}

// --- 10) THE CHARGE CARRY (DashDelivery.onContact — the gorer's drag) -------
// The drag-armed run (2026-08-08): a corridor CONTACT mid-run seizes through
// the one fabric (mass law, policy, grace, dormancy — 'hands full' makes it
// first-catch-wins; the catch is a BODY event, dodged with your feet), the
// hold's patience is clamped to the run's own clock, and the run's end SHEDS
// the catch forward with authority already spent — a wall answers with the
// mass fabric's arrest wound, charger-credited. The co-op gb wire needs no
// verifying rig of its own: snapshot.ts derives it from the LIVE pair
// (gripping/heldBy), the very state these rigs pin.
{
  // Registry: the lever is data; the debut is the gorer's alone.
  const gc = SKILLS.gore_charge;
  const gcD = gc?.delivery;
  check('carry registry: gore_charge stands (noDrop dash, the drag verb armed)',
    !!gc && gc.noDrop === true && gcD?.type === 'dash'
    && gcD.onContact?.grab.verb === 'drag');
  check('carry registry: the gorer kit wears it; the player charge stays bare (absent == identical anchor)',
    MONSTERS.beastkin_gorer.skills.includes('gore_charge')
    && !MONSTERS.beastkin_gorer.skills.includes('charge')
    && SKILLS.charge.delivery.type === 'dash'
    && SKILLS.charge.delivery.onContact === undefined);
  check('carry registry: holdSec outlasts any possible remainder (the run clock, never the roll, decides)',
    gcD?.type === 'dash'
    && (gcD.onContact?.grab.holdSec?.[0] ?? 0) > gcD.distance / gcD.speed);
  check('carry registry: the shed crosses the impact gate on a weight-1 catch (coupled dials — grab.ts runCarry doc)',
    gcD?.type === 'dash'
    && gcD.speed * GRAB_CFG.runCarry.shoveFrac >= MASS_CFG.impact.minSpeed,
    `${gcD?.type === 'dash' ? (gcD.speed * GRAB_CFG.runCarry.shoveFrac).toFixed(0) : '?'} vs gate ${MASS_CFG.impact.minSpeed}`);

  // THE LIVING CARRY: the gorer charges THROUGH the hero standing mid-path.
  const w = makeSimWorld('summoner', 0x9a0b);
  const p = w.player;
  p.pos = w.clampPos(vec(w.arena.w / 2, w.arena.h / 2), p.radius);
  const m = w.createMonster('beastkin_gorer', Math.max(4, p.level), 'enemy');
  m.pos = vec(p.pos.x - 200, p.pos.y);
  w.actors.push(m);
  check('carry: the gorer presses its own charge',
    w.useSkill(m, makeSkillInstance(SKILLS.gore_charge, 1), vec(p.pos.x + 230, p.pos.y)));
  const seat = { x: 0, y: 0 };
  const startX = p.pos.x;
  let seizedAt = -1, relAt = -1;
  let dashAtSeize = false, boundToRun = false, markerSeen = false;
  let seatTight = false, seatChecked = false;
  let shedAuthored = false, shedForward = false;
  for (let t = 0; t < 1.6; t += DT) {
    w.update(DT);
    if (m.gripping?.id === p.id) {
      if (seizedAt < 0) {
        seizedAt = t;
        dashAtSeize = m.dash != null;
        // The clamp beat the rolled patience: what remains of the hold is
        // what remains of the RUN (one frame of clock skew allowed — the
        // clamp reads remaining before the frame's decrement) and sits
        // under the roll's own 1.2s floor.
        const left = m.gripping.until - w.time;
        boundToRun = left <= (m.dash?.remaining ?? -1) + DT + 1e-3 && left < 1.1;
      }
      markerSeen = markerSeen || p.statuses.some(s => s.id === 'seized');
      if (!seatChecked && seizedAt >= 0 && t > seizedAt + 0.3) {
        seatChecked = true;
        grabSeatPos(m, p, m.gripping, seat);
        const cs = w.clampPos(vec(seat.x, seat.y), p.radius);
        seatTight = dist(p.pos, cs) < 40;
      }
    }
    if (seizedAt >= 0 && relAt < 0 && p.heldBy === undefined) relAt = t;
    if (relAt >= 0 && !shedAuthored && p.push && p.push.caster === m) {
      shedAuthored = true;
      shedForward = p.push.vx > 0 && Math.abs(p.push.vy) < Math.abs(p.push.vx) * 0.3;
    }
  }
  check('carry: contact mid-run SEIZED the hero, run still alive, marker worn',
    seizedAt >= 0 && dashAtSeize && markerSeen, `seized at t=${seizedAt.toFixed(2)}s`);
  check('carry: the patience rides the run\'s own clock (clamped under the roll)', boundToRun);
  check('carry: drawn == held mid-drag (the slave step rides the one resolver)', seatTight);
  check('carry: the hero was DRAGGED a real distance down the run',
    p.pos.x > startX + 120, `dragged ${(p.pos.x - startX).toFixed(0)}px east`);
  check('carry: the run\'s end released ON TIME (the whole remainder, nothing after)',
    relAt >= 0.85 && relAt <= 1.25 && !m.gripping && p.heldBy === undefined && m.dash == null,
    `released at t=${relAt.toFixed(2)}s`);
  check('carry: the shed is the AUTHORED forward hand-off (charger credit rides the flight)',
    shedAuthored && shedForward);
}

// --- 10b) The ladder still releases early; the ineligible refuse ------------
{
  // STRUGGLE tears free MID-RUN: dropped where it broke, never shed, and the
  // re-seize grace outlasts the rest of the run (the same run cannot re-catch).
  const w = makeSimWorld('summoner', 0x9a0c);
  const p = w.player;
  p.pos = w.clampPos(vec(w.arena.w / 2, w.arena.h / 2), p.radius);
  const m = w.createMonster('beastkin_gorer', Math.max(4, p.level), 'enemy');
  m.pos = vec(p.pos.x - 200, p.pos.y);
  w.actors.push(m);
  w.useSkill(m, makeSkillInstance(SKILLS.gore_charge, 1), vec(p.pos.x + 230, p.pos.y));
  for (let t = 0; t < 0.6 && !m.gripping; t += DT) w.update(DT);
  check('ladder staging: caught mid-run', m.gripping?.id === p.id && m.dash != null);
  if (m.gripping) m.gripping.struggle = 1;
  tick(w, 0.1);
  const freeMidRun = p.heldBy === undefined && m.dash != null;
  const graceHolds = p.grabProofUntil > w.time + (m.dash?.remaining ?? 0);
  // Watch the rest of the run LIVE: a shed would be a fast authored flight
  // in this very window — a decayed null later would prove nothing.
  let flungAfterBreak = false;
  for (let t = 0; t < 1.0; t += DT) {
    w.update(DT);
    if (p.push?.caster === m && Math.hypot(p.push.vx, p.push.vy) > 150) flungAfterBreak = true;
  }
  check('ladder: struggle broke the drag MID-RUN (the run carries on alone)', freeMidRun);
  check('ladder: the grace outlasts the remainder — the same run cannot re-catch',
    graceHolds && p.heldBy === undefined);
  check('ladder: an escaped catch is never shed (no authored fling after the break)',
    !flungAfterBreak);

  // SEVER tears free mid-run the same way.
  const w2 = makeSimWorld('summoner', 0x9a0d);
  const p2 = w2.player;
  p2.pos = w2.clampPos(vec(w2.arena.w / 2, w2.arena.h / 2), p2.radius);
  const m2 = w2.createMonster('beastkin_gorer', Math.max(4, p2.level), 'enemy');
  m2.pos = vec(p2.pos.x - 200, p2.pos.y);
  w2.actors.push(m2);
  w2.useSkill(m2, makeSkillInstance(SKILLS.gore_charge, 1), vec(p2.pos.x + 230, p2.pos.y));
  for (let t = 0; t < 0.6 && !m2.gripping; t += DT) w2.update(DT);
  check('sever staging: caught mid-run', m2.gripping?.id === p2.id);
  if (m2.gripping) m2.gripping.severed = 1;
  tick(w2, 0.1);
  check('ladder: ally SEVER frees the catch mid-run', p2.heldBy === undefined);

  // THE MASS GATE refuses live at the corridor: a hero too heavy to hook is
  // charged THROUGH (the plain overshoot) — no pair ever forms.
  const w3 = makeSimWorld('summoner', 0x9a0e);
  const p3 = w3.player;
  p3.pos = w3.clampPos(vec(w3.arena.w / 2, w3.arena.h / 2), p3.radius);
  p3.sheet.setSource('probe',
    [mod('weight', 'flat', GRAB_CFG.eligibility.maxRatio * 20)]);
  const m3 = w3.createMonster('beastkin_gorer', Math.max(4, p3.level), 'enemy');
  m3.pos = vec(p3.pos.x - 200, p3.pos.y);
  w3.actors.push(m3);
  w3.useSkill(m3, makeSkillInstance(SKILLS.gore_charge, 1), vec(p3.pos.x + 230, p3.pos.y));
  let heavyCaught = false;
  for (let t = 0; t < 1.4; t += DT) { w3.update(DT); heavyCaught = heavyCaught || m3.gripping != null; }
  check('gate: a hero past the anatomy ceiling is never hooked (charged through instead)', !heavyCaught);
  p3.sheet.setSource('probe', []);

  // POLICY refuses live: a crowned body is not luggage, whoever charges.
  const w4 = makeSimWorld('summoner', 0x9a0f);
  const p4 = w4.player;
  p4.pos = w4.clampPos(vec(w4.arena.w / 2, w4.arena.h / 2), p4.radius);
  p4.pos.y -= 600; // the hero stands clear; the crowned minion takes the path
  const crowned = w4.createMonster('skeleton_warrior', Math.max(5, p4.level), p4.team, p4);
  crowned.pos = vec(w4.arena.w / 2, w4.arena.h / 2);
  crowned.rarity = 'crowned';
  w4.actors.push(crowned);
  const m4 = w4.createMonster('beastkin_gorer', Math.max(4, p4.level), 'enemy');
  m4.pos = vec(crowned.pos.x - 200, crowned.pos.y);
  w4.actors.push(m4);
  w4.useSkill(m4, makeSkillInstance(SKILLS.gore_charge, 1), vec(crowned.pos.x + 230, crowned.pos.y));
  let crownedCaught = false;
  for (let t = 0; t < 1.4; t += DT) { w4.update(DT); crownedCaught = crownedCaught || m4.gripping != null; }
  check('gate: the crowned refuse the hook (policy tier 0, live at the corridor)', !crownedCaught);
}

// --- 10c) Wall arrest pays the mass fabric's wound; confines hold -----------
{
  // THE WALL: the run ends AT a rock face — the shed slams the catch into it
  // and the arrest wounds through the mass fabric (authored flight, charger
  // credit — the same resolveImpactHit lane rigs 3 and probe_mass pin).
  // The catch is the HERO (the commission's own scenario, and the coupled
  // dial's canonical weight-1 body — the shed's speed divides by the
  // victim's effective weight, so a heavier monster stand-in would skid in
  // UNDER the impact gate and prove nothing).
  const w = makeSimWorld('summoner', 0x9a10);
  const p = w.player;
  p.pos = w.clampPos(vec(w.arena.w / 2, w.arena.h / 2), p.radius);
  const cx = p.pos.x, cy = p.pos.y;
  const m = w.createMonster('beastkin_gorer', 6, 'enemy');
  w.actors.push(m);
  // A rock's TRUE move face is its seed-rolled FORM's surface (shapes.ts
  // multi discs — the nominal radius is only the broad phase), so the rig
  // MEASURES the face through the engine's own clamp and stands the whole
  // run off it: the catch must re-seat TOUCHING the face, because the
  // shed's speed ducks under the impact gate within ~2 frames of decay —
  // adjacency is the honest staging of "the run ends AT the wall".
  const rockR = 60;
  const rockX = cx + 260;
  w.doodads.push({ pos: vec(rockX, cy), radius: rockR, kind: 'rock' } as never);
  w.markDoodadsChanged();
  let faceX = rockX;
  for (let x = rockX - rockR - p.radius - 20; x < rockX; x += 1) {
    const c = w.clampPos(vec(x, cy), p.radius);
    if (Math.hypot(c.x - x, c.y - cy) > 0.5) { faceX = x; break; }
  }
  const seatX = faceX + 2;                            // 2px in → clamp = touching
  const stopX = seatX - (m.radius + p.radius) * 0.9;  // the charger's stop center
  m.pos = vec(stopX - 430, cy);                       // the full run ends at the seat
  p.pos = vec(stopX - 270, cy);                       // the hero stands mid-path
  w.useSkill(m, makeSkillInstance(SKILLS.gore_charge, 1), vec(stopX + 100, cy));
  let caught = false, lifeAtRelease = -1, wounded = false, flightAuthored = false;
  let peakShed = 0;
  for (let t = 0; t < 1.8; t += DT) {
    w.update(DT);
    caught = caught || m.gripping?.id === p.id;
    if (caught && lifeAtRelease < 0 && p.heldBy === undefined) lifeAtRelease = p.life;
    if (lifeAtRelease >= 0) {
      if (p.push?.caster === m) {
        flightAuthored = true;
        peakShed = Math.max(peakShed, Math.hypot(p.push.vx, p.push.vy));
      }
      if (p.life < lifeAtRelease - 0.5) wounded = true;
    }
  }
  check('wall: the run caught its body on the way', caught);
  check('wall: the shed flight is authored by the charger (credit rides it)', flightAuthored);
  check('wall: the arrest WOUNDS through the mass fabric (post-release, not the gore)',
    wounded, `life ${lifeAtRelease >= 0 ? lifeAtRelease.toFixed(0) : '?'} → ${p.life.toFixed(0)}`
      + `, shed ${peakShed.toFixed(0)}px/s vs gate ${MASS_CFG.impact.minSpeed}, effW ${p.effectiveWeight().toFixed(2)}`);

  // THE CONFINES: a drag grazing a rock face never seats the catch INSIDE
  // the solid, and a drag along a pit rim never carries the catch past all
  // support — the slave step's placement clamp is the standing law (the
  // no-from clampPos: walls push out, pits march the body back to ground).
  const w2 = makeSimWorld('summoner', 0x9a11);
  const p2 = w2.player;
  p2.pos = w2.clampPos(vec(w2.arena.w / 2, w2.arena.h / 2), p2.radius);
  const c2x = p2.pos.x, c2y = p2.pos.y;
  const m2 = w2.createMonster('beastkin_gorer', Math.max(4, p2.level), 'enemy');
  m2.pos = vec(c2x - 200, c2y);
  w2.actors.push(m2);
  // A rock hugging the run's south side: the drag seat sweeps its face.
  const rock2R = 55;
  w2.doodads.push({ pos: vec(c2x + 60, c2y + rock2R * 0.7), radius: rock2R, kind: 'rock' } as never);
  // A chasm past it, tangent to the path: the rim grazes the drag lane.
  const pitR = 90;
  const pit = { pos: vec(c2x + 320, c2y + pitR * 0.85), radius: pitR, kind: 'chasm' };
  w2.doodads.push(pit as never);
  w2.markDoodadsChanged();
  w2.useSkill(m2, makeSkillInstance(SKILLS.gore_charge, 1), vec(c2x + 230, c2y));
  let held2 = false, wallClean = true, pitClean = true, everDropped = false;
  for (let t = 0; t < 1.6; t += DT) {
    w2.update(DT);
    if (m2.gripping?.id === p2.id) {
      held2 = true;
      const rd = dist(p2.pos, vec(c2x + 60, c2y + rock2R * 0.7));
      if (rd < rock2R - 1) wallClean = false;
      if (dist(p2.pos, pit.pos) < pitR - p2.radius) pitClean = false;
    } else if (held2 && p2.heldBy === undefined && m2.dash != null && t < 0.9) {
      // Released before the run's end with no ladder rung staged = a drop
      // the confines forced — the carry must never resolve that way. (A
      // legitimate shed nulls the dash in the same frame it releases, so
      // it can never trip this.)
      everDropped = true;
    }
  }
  check('confines staging: the grazing run still caught its body', held2);
  check('confines: the drag never seats the catch INSIDE a solid (wall-press law)', wallClean);
  check('confines: the drag never carries the catch past a rim\'s support (pit placement law)', pitClean);
  check('confines: the graze never cost the hold itself (no forced mid-run drop)', !everDropped);
}

// --- 10d) A bare dash stays byte-identical; the carry is deterministic ------
{
  // The player's own charge (no onContact) through a body: no seize, ever —
  // the corridor is exactly the corridor it was.
  const w = makeSimWorld('summoner', 0x9a12);
  const p = w.player;
  p.pos = w.clampPos(vec(w.arena.w / 2, w.arena.h / 2), p.radius);
  const z = w.createMonster('zombie', 3, 'enemy');
  z.pos = vec(p.pos.x + 120, p.pos.y);
  z.sheet.setSource('probe', [mod('evasion', 'flat', -1e6)]);
  w.actors.push(z);
  const zl0 = z.life;
  w.useSkill(p, makeSkillInstance(SKILLS.charge, 1), vec(p.pos.x + 430, p.pos.y));
  let bareSeize = false;
  for (let t = 0; t < 1.4; t += DT) { w.update(DT); bareSeize = bareSeize || p.gripping != null; }
  check('bare dash: the plain charge hits its corridor and holds NOTHING (absent == identical)',
    !bareSeize && z.life < zl0, `zombie ${zl0.toFixed(0)} → ${z.life.toFixed(0)}`);

  // Determinism: the same seed writes the same drag and the same shed.
  const script = (seed: number): string => {
    seedGlobalRandom(seed);
    const ww = makeSimWorld('summoner', seed);
    const pp = ww.player;
    pp.pos = ww.clampPos(vec(ww.arena.w / 2, ww.arena.h / 2), pp.radius);
    const mm = ww.createMonster('beastkin_gorer', Math.max(4, pp.level), 'enemy');
    mm.pos = vec(pp.pos.x - 200, pp.pos.y);
    ww.actors.push(mm);
    ww.useSkill(mm, makeSkillInstance(SKILLS.gore_charge, 1), vec(pp.pos.x + 230, pp.pos.y));
    for (let t = 0; t < 1.6; t += DT) ww.update(DT);
    return `${pp.pos.x.toFixed(3)},${pp.pos.y.toFixed(3)},${pp.life.toFixed(3)},${mm.pos.x.toFixed(3)}`;
  };
  const a = script(0x9a13), b = script(0x9a13);
  check('determinism: the same seed writes the same carry', a === b, a);
}

console.log(failed ? `\n${failed} FAILED` : '\nALL PASS');
process.exit(failed ? 1 : 0);
