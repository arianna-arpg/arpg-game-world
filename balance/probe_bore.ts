// ---------------------------------------------------------------------------
// ONE-OFF PROBE — THE VESSEL BORE end to end (docs/engine/creep.md § the
// vessel bore): flow steering follows a winding tube and REBOUNDS out of a
// dead end (leaf rigs on a synthetic vessel — exact control of the walls),
// travel dispersal + the taper, swell elongation with the affine
// drawn==tested inverse, vessel confinement (the wall between two tubes is
// a wall to the blood), crest riders through the REAL world (mount, slave
// to crestPoint, stun/shove dismount, the per-visit cap), the drag's
// faction waiver (natives ride free), lane snap-in from a walled rim, full
// determinism, legacy byte-identity of the attach path, and the validator
// net. Run: npx tsx balance/probe_bore.ts
// (probe_front pins the classic fingerprint 0x04e4055d — run it beside
// this; the two together are the fabric's whole regression net.)
// ---------------------------------------------------------------------------

import { bootSimEngine, makeSimWorld } from '../src/sim/arena';
import { seedGlobalRandom } from '../src/sim/rng';
import {
  CreepField, CREEPS, CREEP_CFG, anisoMode, crestPoint, registerCreep, validateCreep,
  type CreepTerrain, type CreepSource,
} from '../src/engine/creep';
import { Rng } from '../src/core/rng';

let failed = 0;
const check = (name: string, ok: boolean, detail = ''): void => {
  console.log(`${ok ? 'PASS' : 'FAIL'}  ${name}${detail ? ' — ' + detail : ''}`);
  if (!ok) failed++;
};

bootSimEngine();
seedGlobalRandom(0xb04e);

const fnv = (text: string): string => {
  let h = 0x811c9dc5;
  for (let i = 0; i < text.length; i++) {
    h ^= text.charCodeAt(i);
    h = Math.imul(h, 0x01000193) >>> 0;
  }
  return `0x${h.toString(16).padStart(8, '0')}`;
};

/** A leaf terrain window over a pure openAt predicate — the synthetic
 *  vessel. Everything else inert (the steering rigs eat nothing). */
const tubeTerrain = (open: (x: number, y: number) => boolean): CreepTerrain => ({
  groundKindAt: () => null,
  eachFuelNear: () => {},
  consume: () => {},
  stamp: () => {},
  drag: () => {},
  drown: () => {},
  openAt: open,
});

// Probe rows (namespaced, engine-registered like probe_stretch).
registerCreep({
  id: 'probe_bore_flow', lobing: 0, reach: [60, 60], spread: 60, recede: 200,
  front: { speed: 140, flow: { steer: 2.8, bounce: 0.4 } },
});
registerCreep({
  id: 'probe_bore_travel', lobing: 0, reach: [60, 60], spread: 60, recede: 200,
  front: { speed: 100, travel: { range: [600, 600], taper: 0.4 } },
});
registerCreep({
  id: 'probe_bore_swell', lobing: 0, reach: [100, 100], spread: 60, recede: 200,
  front: { speed: 100, stretch: 1.4, swell: { max: 2.0, per: 400 } },
});
registerCreep({
  id: 'probe_bore_confine', lobing: 0, reach: [140, 140], spread: 60, recede: 200,
  front: { speed: 0.1, stretch: 2, flow: { steer: 1, confine: true } },
});
registerCreep({
  id: 'probe_bore_leaky', lobing: 0, reach: [140, 140], spread: 60, recede: 200,
  front: { speed: 0.1, stretch: 2, flow: { steer: 1 } }, // twin, confine OFF
});

const dt = 1 / 60;

// --- 1) THE WINDING VESSEL: the bolus follows the bank around an L-bend ----
{
  const W = 1500, H = 1700;
  // An L-tube: east along y=500, then south down x=1200. Everything else wall.
  const open = (x: number, y: number): boolean =>
    (Math.abs(y - 500) <= 70 && x >= 100 && x <= 1270)
    || (Math.abs(x - 1200) <= 70 && y >= 430 && y <= 1560);
  const f = new CreepField(new Rng(11), W, H);
  f.setTerrain(tubeTerrain(open));
  const src = f.addFront(CREEPS['probe_bore_flow'], 150, 500, 0, { reach: 60, bornFrac: 1 })!;
  const b0 = src.front!.bearing;
  let inTube = 0, samples = 0, turned = false;
  let reachedSouth = false;
  for (let i = 0; i < 60 * 22 && f.sources.includes(src); i++) {
    f.update(dt, i * dt, []);
    if (i % 30 === 0) {
      samples++;
      if (open(src.pos.x, src.pos.y)) inTube++;
    }
    if (!turned && Math.abs(src.front!.bearing - b0) > 1) turned = true;
    if (src.pos.y > 1300) { reachedSouth = true; break; }
  }
  check('flow: the bolus TURNED the corner (bearing bent > 1 rad)', turned,
    `bearing ${b0.toFixed(2)} → ${src.front?.bearing.toFixed(2) ?? 'retired'}`);
  check('flow: it followed the vessel into the south leg', reachedSouth,
    `ended at (${src.pos.x.toFixed(0)}, ${src.pos.y.toFixed(0)})`);
  check('flow: the heart STAYED in the vessel the whole run',
    samples > 0 && inTube / samples >= 0.95, `${inTube}/${samples} samples in-tube`);
}

// --- 2) THE DEAD END: the surge slaps the cap and REBOUNDS -----------------
{
  const open = (x: number, y: number): boolean =>
    Math.abs(y - 500) <= 70 && x >= 100 && x <= 900;
  const f = new CreepField(new Rng(12), 1500, 1000);
  f.setTerrain(tubeTerrain(open));
  const src = f.addFront(CREEPS['probe_bore_flow'], 150, 500, 0, { reach: 60, bornFrac: 1 })!;
  check('rebound: eastbound at birth', src.front!.dx > 0.9);
  let flipped = false, xMax = 0, backWest = false;
  for (let i = 0; i < 60 * 18 && f.sources.includes(src); i++) {
    f.update(dt, i * dt, []);
    xMax = Math.max(xMax, src.pos.x);
    if (!flipped && src.front!.dx < -0.5) flipped = true;
    if (flipped && src.pos.x < xMax - 250) { backWest = true; break; }
  }
  check('rebound: the bearing FLIPPED at the cap (dead-end bounce)', flipped,
    `deepest x ${xMax.toFixed(0)} (cap 900)`);
  check('rebound: it marched back out the way it came', backWest,
    `x fell to ${src.pos.x.toFixed(0)} from ${xMax.toFixed(0)}`);
  check('rebound: the cap was respected (never marched through the wall)', xMax < 920,
    `deepest ${xMax.toFixed(0)}`);
}

// --- 3) THE FINITE RUN: taper, dispersal, gone -----------------------------
{
  const f = new CreepField(new Rng(13), 4000, 1000);
  f.setTerrain(tubeTerrain(() => true));
  const src = f.addFront(CREEPS['probe_bore_travel'], 200, 500, 0, { reach: 60, bornFrac: 1 })!;
  check('travel: the range rolled at attach (600 exact on a [600,600] row)',
    src.front!.rangeMax === 600, `rangeMax ${src.front!.rangeMax}`);
  // Early pace vs late pace: the taper eases the last 40% of the run.
  const x0 = src.pos.x;
  for (let i = 0; i < 60; i++) f.update(dt, i * dt, []);
  const early = src.pos.x - x0;
  while (src.front!.traveled < 560 && f.sources.includes(src)) f.update(dt, 0, []);
  const x1 = src.pos.x;
  for (let i = 0; i < 60 && f.sources.includes(src) && src.state !== 'recede'; i++) f.update(dt, 0, []);
  const late = src.pos.x - x1;
  check('travel: the TAPER bled the pace before the end', late < early * 0.55,
    `first-second ${early.toFixed(0)}u vs last-stretch ${late.toFixed(0)}u`);
  let dispersed = false, goneAt = -1;
  for (let i = 0; i < 60 * 20; i++) {
    f.update(dt, 0, []);
    if (src.state === 'recede') dispersed = true;
    if (!f.sources.includes(src)) { goneAt = i / 60; break; }
  }
  check('travel: past its range the surge DISPERSED (recede where it stood)', dispersed);
  check('travel: and then it was gone (the visit unwritten)', goneAt >= 0,
    goneAt >= 0 ? `retired ${goneAt.toFixed(1)}s after the range` : 'still standing');
}

// --- 4) THE SWELL: elongation, drawn == tested through the affine inverse --
{
  const f = new CreepField(new Rng(14), 4000, 1000);
  f.setTerrain(tubeTerrain(() => true));
  const src = f.addFront(CREEPS['probe_bore_swell'], 300, 500, 0, { reach: 100, bornFrac: 1 })!;
  check('swell: a swelling row is AFFINE', anisoMode(src) === 'affine');
  for (let i = 0; i < 60 * 6; i++) f.update(dt, i * dt, []); // ~600u > per 400
  const run = src.front!;
  check('swell: elong reached its max (eased over the march)', Math.abs(run.elong - 2.0) < 1e-6,
    `elong ${run.elong.toFixed(3)}`);
  const cur = src.cur;
  const px = src.pos.x, py = src.pos.y;
  const dx = run.dx, dy = run.dy;
  // Along the nose: inside at 0.9 × (cur × 2), outside at 1.03 × — and a
  // point past the UNswollen reach but inside the swollen one is covered:
  // the elongation genuinely extended the hit surface.
  const nose = cur * 2.0;
  check('swell: covered at 90% of the swollen nose',
    f.coverAt(px + dx * nose * 0.9, py + dy * nose * 0.9) >= CREEP_CFG.hitFloor);
  check('swell: dry just past the swollen nose',
    f.coverAt(px + dx * nose * 1.03, py + dy * nose * 1.03) === 0);
  check('swell: the stretch-only reach would have MISSED this point (elongation is real)',
    f.coverAt(px + dx * cur * 1.5, py + dy * cur * 1.5) > 0,
    `cover at 1.5R along: ${f.coverAt(px + dx * cur * 1.5, py + dy * cur * 1.5).toFixed(2)}`);
  // Across: the stretch axis holds at 1.4 exactly (swell never widens).
  const across = cur * 1.4;
  check('swell: across-rim covered at 90%',
    f.coverAt(px - dy * across * 0.9, py + dx * across * 0.9) >= CREEP_CFG.hitFloor);
  check('swell: across-rim dry at 103% (the slug grew LONG, not wide)',
    f.coverAt(px - dy * across * 1.03, py + dx * across * 1.03) === 0);
  // crestPoint IS the boundary truth (lobing 0: exact ellipse).
  const nosePt = crestPoint(src, 0, 1);
  check('swell: crestPoint(nose) sits at exactly cur × elong',
    Math.abs(nosePt.x - (px + dx * nose)) < 1e-6 && Math.abs(nosePt.y - (py + dy * nose)) < 1e-6,
    `crest (${nosePt.x.toFixed(1)}, ${nosePt.y.toFixed(1)})`);
  check('swell: the broad-phase bound covers the long axis', src.bound >= nose,
    `bound ${src.bound.toFixed(0)} vs nose ${nose.toFixed(0)}`);
}

// --- 5) CONFINEMENT: the wall between two tubes is a wall to the blood -----
{
  // Two parallel tubes; the heart sits in tube A. A point in tube B lies
  // inside the raw ellipse (reach 140 × stretch 2 = 280 across) but the
  // wall between them must zero it — and the confine-less twin proves the
  // geometry WOULD have reached it.
  const open = (x: number, y: number): boolean =>
    (Math.abs(y - 400) <= 60 || Math.abs(y - 700) <= 60) && x >= 0 && x <= 2000;
  for (const [id, expectLeak] of [['probe_bore_confine', false], ['probe_bore_leaky', true]] as const) {
    const f = new CreepField(new Rng(15), 2000, 1100);
    f.setTerrain(tubeTerrain(open));
    const src = f.addFront(CREEPS[id], 600, 400, 0, { reach: 140, bornFrac: 1 })!;
    f.update(dt, 0, []);
    const inB = f.coverAt(600, 660);
    const inA = f.coverAt(600, 430);
    check(`confine: heart's own tube covered (${id})`, inA >= CREEP_CFG.hitFloor,
      `cover ${inA.toFixed(2)}`);
    check(expectLeak
      ? 'confine: the UNconfined twin reaches the far tube (the geometry is real)'
      : 'confine: the wall ZEROES the far tube (no through-stone current)',
    expectLeak ? inB > 0 : inB === 0, `far-tube cover ${inB.toFixed(3)}`);
    void src;
  }
}

// --- 6) LANE SNAP-IN: a wave born on the walled rim starts INSIDE ----------
{
  const open = (x: number, y: number): boolean =>
    Math.abs(y - 600) <= 70 && x >= 260 && x <= 1700;
  const f = new CreepField(new Rng(16), 2000, 1200);
  f.setTerrain(tubeTerrain(open));
  f.installLanes([{ id: 'probe_bore_flow', line: [1, 1], bearing: 0, delay: [0.1, 0.1] }]);
  for (let i = 0; i < 30; i++) f.update(dt, i * dt, []);
  const secs = f.sources.filter(s => s.front);
  check('snap-in: the wave fielded', secs.length === 1, `${secs.length} sections`);
  check('snap-in: born on open ground despite the walled rim',
    secs.length === 1 && open(secs[0].pos.x, secs[0].pos.y),
    secs.length ? `at (${secs[0].pos.x.toFixed(0)}, ${secs[0].pos.y.toFixed(0)})` : '');
}

// --- 7) LEGACY ATTACH: no new draws, no new state, byte-identical stream ---
{
  const f = new CreepField(new Rng(17), 2000, 1200);
  f.setTerrain(tubeTerrain(() => true));
  const src = f.addFront(CREEPS['floodcrest'], 500, 500, 0, { reach: 100, bornFrac: 1 })!;
  const run = src.front!;
  check('legacy: private roll untouched at attach (no lever = no draw)',
    run.roll === (((src.seed ^ 0x9e3779b9) >>> 0) || 1), `roll ${run.roll}`);
  check('legacy: rangeMax Infinity, elong 1, no rider plan',
    run.rangeMax === Infinity && run.elong === 1 && run.riderPlan === null && !run.ridersMounted);
  check('legacy: a stretch-only row stays POLAR (the tidal wall\'s ellipse untouched)',
    anisoMode(f.addFront(CREEPS['tidalwall'], 900, 500, 0, { reach: 180, bornFrac: 1 })!) === 'polar');
}

// --- 8) CREST RIDERS through the REAL world --------------------------------
{
  // Rider plans roll on the SECTION's private stream (src.seed — a fresh
  // field draw per addFront), so the hunt varies the section, not the
  // world: the sim arena's zone seed is fixed, and re-making worlds would
  // replay the identical stream forever. Rejected sections are guttered on
  // the spot (a fixed seed pin would go brittle the day any upstream draw
  // shifts — the probe_throng lesson).
  seedGlobalRandom(0xb04e);
  const world = makeSimWorld('warrior', 424242);
  const f8 = world.creepEnsure()!;
  let src: CreepSource | null = null;
  for (let t = 0; t < 8 && !src; t++) {
    const s = f8.addFront(CREEPS['sanguine_bore'],
      world.arena.w / 2 - 700, world.arena.h / 2, 0, { reach: 80, bornFrac: 1 })!;
    if (s.front!.riderPlan) src = s;
    else s.state = 'recede';
  }
  check('riders: a section fielded a crew (plan on the private stream)', !!src,
    src?.front?.riderPlan ? `${src.front.riderPlan.length} seats` : 'no plan in 8 sections');
  if (world && src) {
    const rd = CREEP_CFG.front.rider;
    world.update(dt);
    const riders = world.actors.filter(a => a.defId === 'pale_corpuscle');
    check('riders: pale corpuscles MOUNTED (world half consumed the plan once)',
      riders.length === src.front!.riderPlan!.length && src.front!.ridersMounted,
      `${riders.length} mounted`);
    const r0 = riders[0];
    check('riders: the marker status rides the seat', r0.statuses.some(s2 => s2.id === rd.mountStatus));
    // Drawn == seated: the world slams the seat AFTER the march each tick.
    const seat = crestPoint(src, r0.surf!.ang, rd.seatFrac);
    check('riders: seated exactly at crestPoint (drawn == seated)',
      Math.hypot(r0.pos.x - seat.x, r0.pos.y - seat.y) < 1,
      `off by ${Math.hypot(r0.pos.x - seat.x, r0.pos.y - seat.y).toFixed(2)}`);
    const rx0 = r0.pos.x;
    for (let i = 0; i < 60 * 3; i++) world.update(dt);
    check('riders: carried WITH the surge (the crest is the ride)',
      r0.pos.x - rx0 > 200, `rode ${(r0.pos.x - rx0).toFixed(0)}u east in 3s`);
    // THE DRAG WAIVER, real path: the hero is swept, the flesh-sworn stand.
    const p = world.player;
    p.pos.x = src.pos.x + 40;
    p.pos.y = src.pos.y;
    const hx0 = p.pos.x;
    for (let i = 0; i < 45; i++) world.update(dt);
    check('immunity: the hero is SWEPT downstream (drag 300 through the real adapter)',
      p.pos.x - hx0 > 60, `swept ${(p.pos.x - hx0).toFixed(0)}u in 0.75s`);
    p.faction = 'flesh';
    p.pos.x = src.pos.x + 40;
    p.pos.y = src.pos.y;
    const fx0 = p.pos.x;
    for (let i = 0; i < 45; i++) world.update(dt);
    check('immunity: the flesh-sworn are NOT dragged (drag.notFactions)',
      Math.abs(p.pos.x - fx0) < 8, `drift ${(p.pos.x - fx0).toFixed(1)}u`);
    delete p.faction;
    // STUN DISMOUNT: hard-CC throws the surfer from its wave.
    if (!r0.dead && r0.surf) {
      r0.applyStatus('stun', 0, 1, 'probe');
      world.update(dt);
      check('riders: hard-CC DISMOUNTS (the stunned surfer falls off)', r0.surf === undefined);
    } else {
      check('riders: hard-CC dismount (rider survived to test)', false, 'rider died early');
    }
    // DISPERSAL DROP: the collapsing wave sheds its whole crew.
    world.creep!.cleanseAt(src.pos.x, src.pos.y, 1e9);
    world.update(dt);
    check('riders: the dispersing wave DROPS its crew',
      world.actors.every(a => a.surf === undefined));
    // THE CAP: flood the zone with crewed bores — mounts stop at the ledger.
    for (let i = 0; i < 14; i++) {
      world.creep!.addFront(CREEPS['sanguine_bore'],
        world.arena.w / 2 - 500 + i * 60, world.arena.h / 2 + 200, 0, { reach: 80, bornFrac: 1 });
      world.update(dt);
    }
    const all = world.actors.filter(a => a.defId === 'pale_corpuscle' && !a.dead).length;
    check('riders: the per-visit ledger CAPS the crews (waves past it surge riderless)',
      all <= rd.max, `${all} riders vs cap ${rd.max}`);
  }
}

// --- 9) DETERMINISM: same seeds, same steering, same crew ------------------
{
  const trace = (): string => {
    const open = (x: number, y: number): boolean =>
      (Math.abs(y - 500) <= 70 && x >= 100 && x <= 1270)
      || (Math.abs(x - 1200) <= 70 && y >= 430 && y <= 1560);
    const f = new CreepField(new Rng(21), 1500, 1700);
    f.setTerrain(tubeTerrain(open));
    f.addFront(CREEPS['probe_bore_flow'], 150, 500, 0, { reach: 60, bornFrac: 1 });
    f.addFront(CREEPS['sanguine_bore'], 150, 500, 0.2, { reach: 70, bornFrac: 1 });
    const lines: string[] = [];
    for (let i = 0; i < 60 * 12; i++) {
      f.update(dt, i * dt, []);
      if (i % 60 === 0) {
        for (const s of f.sources) {
          lines.push(`${s.def.id},${s.pos.x.toFixed(3)},${s.pos.y.toFixed(3)},`
            + `${s.front!.bearing.toFixed(5)},${s.front!.elong.toFixed(5)},${s.front!.rangeMax.toFixed(1)},`
            + `${s.front!.riderPlan?.map(r => `${r.monster}@${r.ang.toFixed(4)}`).join('|') ?? '-'}`);
        }
      }
    }
    return fnv(lines.join('\n'));
  };
  const a = trace(), b = trace();
  check('determinism: twice-run bore steers the same march and rolls the same crew', a === b,
    `${a} vs ${b}`);
}

// --- 10) THE VALIDATOR NET -------------------------------------------------
{
  registerCreep({ id: 'probe_bore_bad', front: {
    speed: 10,
    flow: { steer: 0 },
    travel: { range: [0, 5] },
    swell: { max: 9, per: 0 },
    riders: [{ monster: 'no_such_monster', count: [3, 1], chance: 2 }],
  } });
  const bad = validateCreep(() => true, [], {
    isDamageType: () => true, hasGroundKind: () => true,
    hasMonster: id => id !== 'no_such_monster', hasDoodadKind: () => true,
    fuelTags: new Set<string>(),
  });
  const want = ['flow.steer', 'travel.range', 'swell.max', 'swell.per',
    'unknown monster \'no_such_monster\'', 'rider count', 'rider chance'];
  for (const w of want) {
    check(`validator: catches ${w}`, bad.some(b => b.includes('probe_bore_bad') && b.includes(w)),
      bad.filter(b => b.includes('probe_bore_bad')).join(' | ').slice(0, 200));
  }
  const noStatus = validateCreep(id => id !== 'crestborne', [], undefined);
  check('validator: rider rows demand the mount status registered',
    noStatus.some(b => b.includes('crestborne')));
}

console.log(failed ? `\n${failed} CHECK(S) FAILED` : '\nALL BORE CHECKS PASSED');
process.exit(failed ? 1 : 0);
