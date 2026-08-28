// ---------------------------------------------------------------------------
// ONE-OFF PROBE — THE STEADY HAND (engine/trace.ts + data/traceShapes.ts +
// the World forge host; docs/design/steady-hand.md T0/T1). Pins:
//   A. THE PURE SESSION: buildTracePath resamples fine; a perfect synthetic
//      trace forges (done, accuracy ≈1, 0 slips) and is BYTE-DETERMINISTIC
//      across runs (the same fed samples, the same verdict); progress is
//      MONOTONIC (a point past the lookahead cannot skip the frontier); a
//      wobbling hand lands mid accuracy; a spike is a SLIP (accuracy pays,
//      progress freezes outside, resumes inside); a lifted pen feeds
//      nothing; THE HYBRID's cap (walk card 1c) fails only past slipCap;
//      the device fold is card 5's one multiply and the tier ladder clamps.
//   B. THE WRIT LOOP: the craft pay lane deals ("a smith's writ: …", the
//      visible price law), the turn-in mints the 1×1 writ item OWED with
//      the payload + earn-level; forgeWrits/forgeBases read the bag; a
//      REAL trace driven through the applyInputs artery (the input law:
//      the drawing seat's movement is swallowed; solo the world HOLDS)
//      settles into the mint — writ consumed, the piece lands owed, the
//      accuracy fold prices the rarity, writs_forged stamps; the high-tier
//      fail keeps the writ and RESTS it (forgeBegin refuses while warm);
//      the cancel and the zone-change abort keep the writ (atomic).
// Run: npx tsx balance/probe_trace.ts
// ---------------------------------------------------------------------------

import { bootSimEngine, makeSimWorld } from '../src/sim/arena';
import { seedGlobalRandom } from '../src/sim/rng';
import { FEATURE } from '../src/meta/account';
import {
  TRACE_CFG, buildTracePath, freshTraceState, traceBandFor, traceFeed,
  traceSlipCapFor, traceVerdict,
} from '../src/engine/trace';
import { CATEGORY_SHAPES, TRACE_SHAPES, traceShapeForCategory } from '../src/data/traceShapes';
import { ITEM_BASES } from '../src/data/itembases';
import { baseComplexityOf } from '../src/engine/items';
import { BOUNTY_BOARD_CFG, describeBountyPay, type BountyPosting } from '../src/data/bountyboard';
import { BOUNTY_BOARD_SITE } from '../src/data/townBuild';
import { START_ZONE } from '../src/data/zones';
import type { World } from '../src/engine/world';
import type { ItemInstance } from '../src/engine/items';

let failed = 0;
const check = (name: string, ok: boolean, detail = ''): void => {
  console.log(`${ok ? 'PASS' : 'FAIL'}  ${name}${detail ? ' — ' + detail : ''}`);
  if (!ok) failed++;
};

bootSimEngine();

// ------------------------------------------------- A. the pure session
{
  const shape = TRACE_SHAPES.blade;
  const path = buildTracePath(shape, 500, 500, 14);
  check('A: the path resamples fine (points > authored, band carried)',
    path.pts.length > shape.points.length * 3 && path.band === 14);
  const run = (drive: (st: ReturnType<typeof freshTraceState>) => void): ReturnType<typeof traceVerdict> => {
    const st = freshTraceState();
    drive(st);
    return traceVerdict(path, st);
  };
  const perfectDrive = (st: ReturnType<typeof freshTraceState>): void => {
    for (const p of path.pts) traceFeed(path, st, p.x, p.y, true, 0);
  };
  const v1 = run(perfectDrive);
  const v2 = run(perfectDrive);
  check('A: a perfect trace forges (done, accuracy ≈ 1, no slips)',
    v1.done && v1.accuracy > 0.95 && v1.slips === 0,
  `acc ${v1.accuracy.toFixed(3)}`);
  check('A: BYTE-DETERMINISTIC — the same samples, the same verdict',
    JSON.stringify(v1) === JSON.stringify(v2));
  // Monotonic: the pen cannot skip to the end past the lookahead.
  const vSkip = run(st => {
    const end = path.pts[path.pts.length - 2];
    traceFeed(path, st, end.x, end.y, true, 0);
  });
  check('A: progress is MONOTONIC (a far point never skips the frontier)',
    vSkip.progress < 0.5, `progress ${vSkip.progress.toFixed(3)}`);
  // The wobble: inside the band, accuracy lands mid.
  const vWob = run(st => {
    for (const p of path.pts) traceFeed(path, st, p.x + path.band * 0.6, p.y, true, 0);
  });
  check('A: a wobbling hand forges at a middling accuracy',
    vWob.done && vWob.accuracy > 0.1 && vWob.accuracy < 0.7,
  `acc ${vWob.accuracy.toFixed(3)}`);
  // The spike: a slip pays accuracy and freezes progress until return.
  const stS = freshTraceState();
  const third = Math.floor(path.pts.length / 3);
  for (let i = 0; i <= third; i++) traceFeed(path, stS, path.pts[i].x, path.pts[i].y, true, 0);
  const frontierAtSpike = stS.frontier;
  traceFeed(path, stS, path.pts[0].x + 500, path.pts[0].y + 500, true, 0);
  traceFeed(path, stS, path.pts[0].x + 520, path.pts[0].y + 520, true, 0);
  check('A: a spike is ONE slip; outside, the frontier freezes',
    stS.slips === 1 && stS.outside && stS.frontier === frontierAtSpike);
  for (let i = third; i < path.pts.length; i++) traceFeed(path, stS, path.pts[i].x, path.pts[i].y, true, 0);
  const vS = traceVerdict(path, stS);
  check('A: the pen returns and the trace still forges (soft slips — card 6a)',
    vS.done && vS.slips === 1 && !vS.failed);
  // The lifted pen feeds nothing.
  const stL = freshTraceState();
  traceFeed(path, stL, path.pts[0].x, path.pts[0].y, false, 0);
  check('A: a lifted pen lays nothing', stL.samples === 0 && stL.frontier === 0);
  // THE HYBRID's cap (card 1c): past slipCap, the trace FAILS.
  const stC = freshTraceState();
  for (let k = 0; k < 3; k++) {
    traceFeed(path, stC, path.pts[0].x, path.pts[0].y, true, 2);       // in
    traceFeed(path, stC, path.pts[0].x + 900, path.pts[0].y, true, 2); // out — slip
  }
  check('A: THE HYBRID cap fails past slipCap (the high-tier buzz)',
    stC.slips === 3 && stC.failed);
  // Device parity (card 5a, ruled at her delegation): one multiply.
  check('A: the device fold is one multiply; the tier ladder clamps',
    traceBandFor(1, 'pad') === TRACE_CFG.complexityBands[0] * TRACE_CFG.deviceBandMul.pad
    && traceBandFor(99, 'mouse') === TRACE_CFG.complexityBands[TRACE_CFG.complexityBands.length - 1]
    && traceSlipCapFor(TRACE_CFG.hybridAtComplexity - 1) === 0
    && traceSlipCapFor(TRACE_CFG.hybridAtComplexity) === TRACE_CFG.slipCap);
  // The outline library covers the writ's whole gamut.
  check('A: every writ category resolves an outline at EVERY class (the ladder falls back)',
    BOUNTY_BOARD_CFG.lanes.craft.categories.every(c =>
      !!CATEGORY_SHAPES[c] && [1, 2, 3].every(k => !!traceShapeForCategory(c, k))));
  const lineLen = (cat: 'helmet' | 'ring', k: number): number =>
    buildTracePath(traceShapeForCategory(cat, k), 0, 0, 10).pts.length;
  check('A: the fine and ornate lines are LONGER than the plain (walk 2 — the complexity IS the line)',
    lineLen('helmet', 2) > lineLen('helmet', 1)
    && lineLen('helmet', 3) > lineLen('helmet', 2)
    && lineLen('ring', 2) > lineLen('ring', 1)
    && lineLen('ring', 3) > lineLen('ring', 2));
  check('A: a class without its own line falls DOWN the ladder (boots ornate → plain)',
    traceShapeForCategory('boots', 3).id === traceShapeForCategory('boots', 1).id);
}

// ------------------------------------------------- B. the writ loop
seedGlobalRandom(0x11a7d);
const w: World = makeSimWorld('warrior', 0x57ead);
w.account.features.add(FEATURE.BOUNTY_BOARD);
w.loadZone('crossroads');
w.loadZone(START_ZONE);
w.completedObjectives.add('crossroads');
w.player.level = 8;
{
  // The lane deals: walk beats until a craft pay posts.
  let craft: BountyPosting | undefined;
  for (let b = 0; b < 30 && !craft; b++) {
    w.time = b * w.bountyBeatSeconds();
    w.armBountyBoard();
    craft = w.bountyOffers.find(p => !!p.pay.craft);
  }
  check('B: the craft lane deals (R5 turned on)', !!craft,
    craft ? describeBountyPay(craft.pay) : 'none in 30 beats');
  check('B: the card prints the writ (the visible price law)',
    !!craft && describeBountyPay(craft.pay).includes("smith's writ"));
  // The turn-in mints the writ item owed (handcrafted hand — rig-I law).
  const zB = Object.values(w.zoneMap).find(z =>
    z.id !== START_ZONE && z.id !== 'crossroads' && !z.boundless && z.objective.kind !== 'safe')!;
  const pB: BountyPosting = {
    id: 'bounty_test_writ', kind: 'charge', boardId: 'lastlight',
    zoneId: zB.id, beat: 0, pay: { craft: { category: 'ring', complexity: 1 } },
  };
  w.bountyHands.push(pB);
  w.activeQuests.push({ questId: pB.id, zoneId: pB.zoneId, fieldDone: true });
  w.completedObjectives.add(zB.id);
  w.player.pos.x = BOUNTY_BOARD_SITE.x;
  w.player.pos.y = BOUNTY_BOARD_SITE.y;
  const dropsBefore = w.drops.length;
  check('B: the turn-in mints the writ item OWED', w.turnInBounty(pB.id) === true
    && w.drops.length > dropsBefore);
  const writDrop = w.drops.slice(dropsBefore)
    .map(d => d.item).find(it => it.kind === 'gear'
      && (it as { item: ItemInstance }).item.writ !== undefined) as { item: ItemInstance } | undefined;
  check('B: the writ carries its payload + the earn-level',
    !!writDrop && writDrop.item.writ!.category === 'ring'
    && writDrop.item.writ!.complexity === 1 && writDrop.item.ilvl >= 1);
  if (!writDrop) throw new Error('no writ minted');
  // Into the bag; the Forge face reads it.
  const writ = writDrop.item;
  w.localSeat.meta.items.push(writ);
  const shelf = w.forgeWrits();
  check('B: forgeWrits reads the bag (rest 0 — forgeable now)',
    shelf.length === 1 && shelf[0].uid === writ.uid && shelf[0].restSec === 0);
  const bases = w.forgeBases(writ.uid);
  check('B: forgeBases pools the writ\'s own category', bases.length > 0);
  // THE REAL TRACE through the applyInputs artery (the input law + the
  // solo hold + the settle fold).
  check('B: forgeBegin raises the bench', w.forgeBegin(writ.uid, bases[0].id, false) === true
    && w.traceActive(w.localSeat.id));
  check('B: solo, the world HOLDS (the rite\'s pause policy)',
    w.timeflow.worldScale() === 0);
  const view = w.traceView()!;
  check('B: the view serves the session\'s own geometry', view.pts.length > 10 && view.band > 0);
  const posBefore = { x: w.player.pos.x, y: w.player.pos.y };
  const feedFrame = (x: number, y: number, held: boolean): void => {
    const held8 = Array(8).fill(false) as boolean[];
    held8[0] = held;
    w.applyInputs(new Map([[w.localSeat.id, {
      dx: 1, dy: 0, aim: { x, y }, held: held8, edge: Array(8).fill(false) as boolean[],
    }]]), 1 / 30);
  };
  for (const p of view.pts) feedFrame(p.x, p.y, true);
  check('B: THE INPUT LAW — the drawing hand never walked (dx swallowed)',
    w.player.pos.x === posBefore.x && w.player.pos.y === posBefore.y);
  check('B: the trace settled — the writ is consumed, the hand released',
    !w.traceActive() && !w.localSeat.meta.items.some(it => it.uid === writ.uid)
    && w.timeflow.worldScale() > 0);
  const forged = w.drops.map(d => d.item).find(it => it.kind === 'gear'
    && (it as { item: ItemInstance }).item.writ === undefined
    && (it as { item: ItemInstance }).item.baseId === bases[0].id) as { item: ItemInstance } | undefined;
  check('B: the piece landed owed off the chosen base (accuracy priced the roll)',
    !!forged && (w.ledger.writs_forged ?? 0) === 1,
  forged ? `${forged.item.rarity} ${forged.item.name}` : 'none');
  // THE HIGH-TIER FAIL: the cap buzzes, the writ endures and RESTS.
  const writHi: ItemInstance = {
    uid: 999901, baseId: 'smith_writ', ilvl: 20, tier: 1,
    rarity: 'common', name: "Smith's Writ: chest", baseRoll: 0, implicitRolls: [], affixes: [],
    writ: { category: 'chest', complexity: TRACE_CFG.hybridAtComplexity },
  };
  w.localSeat.meta.items.push(writHi);
  const basesHi = w.forgeBases(writHi.uid);
  check('B: a high-tier writ raises the bench with the cap armed',
    w.forgeBegin(writHi.uid, basesHi[0].id, false) === true);
  const viewHi = w.traceView()!;
  for (let k = 0; k <= TRACE_CFG.slipCap; k++) {
    feedFrame(viewHi.pts[0].x, viewHi.pts[0].y, true);              // in
    feedFrame(viewHi.pts[0].x + 900, viewHi.pts[0].y + 900, true);  // out — slip
  }
  check('B: the buzz — the trace failed, the writ ENDURES and rests',
    !w.traceActive() && w.localSeat.meta.items.some(it => it.uid === writHi.uid)
    && w.forgeWrits().some(x => x.uid === writHi.uid && x.restSec > 0));
  check('B: forgeBegin refuses a resting writ',
    w.forgeBegin(writHi.uid, basesHi[0].id, false) === false);
  // THE CANCEL + the zone-change abort: atomic, the writ endures.
  w.time += TRACE_CFG.failCooldownSec + 1;
  check('B: the rest expires and the bench re-opens',
    w.forgeBegin(writHi.uid, basesHi[0].id, true) === true);
  check('B: the pad hand traces at the wider band (card 5\'s one multiply)',
    Math.abs(w.traceView()!.band
      - traceBandFor(TRACE_CFG.hybridAtComplexity, 'pad')) < 1e-9);
  check('B: the cancel steps away — the writ endures', w.forgeCancel() === true
    && !w.traceActive() && w.localSeat.meta.items.some(it => it.uid === writHi.uid));
  check('B: a fresh begin sweeps on the zone change (atomic abort)',
    w.forgeBegin(writHi.uid, basesHi[0].id, false) === true
    && (w.loadZone('crossroads'), !w.traceActive())
    && w.localSeat.meta.items.some(it => it.uid === writHi.uid));
}

// ------------------------------------- C. THE COMPLEXITY LAW (walk 2)
{
  // The derived read: pure mixes are plain, hybrid textures fine; an
  // authored override wins; the ornate class stands empty until her
  // exotic-base pass — so the writ roll must never offer it.
  const armor = Object.values(ITEM_BASES).filter(b => b.category === 'chest');
  check('C: chest bases span plain and fine by DERIVATION (mix lanes)',
    armor.some(b => baseComplexityOf(b) === 1) && armor.some(b => baseComplexityOf(b) === 2));
  check('C: an authored override outranks the derivation',
    baseComplexityOf({ ...armor[0], complexity: 3 }) === 3);
  const stand = (cat: string, k: number): boolean =>
    Object.values(ITEM_BASES).some(b => b.category === cat && baseComplexityOf(b) === k);
  seedGlobalRandom(0xc0de);
  const wC = makeSimWorld('warrior', 0xc4af7);
  wC.account.features.add(FEATURE.BOUNTY_BOARD);
  wC.loadZone('crossroads');
  wC.loadZone(START_ZONE);
  wC.completedObjectives.add('crossroads');
  wC.player.level = 10; // classes 1-2 open (3 stands empty until the ornate bases); the young halo still seats
  const seen: { category: string; complexity: number }[] = [];
  for (let b = 0; b < 24; b++) {
    wC.time = b * wC.bountyBeatSeconds();
    wC.armBountyBoard();
    for (const o of wC.bountyOffers) if (o.pay.craft) seen.push(o.pay.craft);
  }
  check('C: every dealt writ names a STANDING (category, complexity) pair',
    seen.length > 0 && seen.every(c => stand(c.category, c.complexity)),
  `${seen.length} writs dealt`);
  check('C: the card speaks the named complexity (choosing the bounty IS choosing the class)',
    describeBountyPay({ craft: { category: 'chest', complexity: 2 } })
      === "a smith's writ: a medium-complexity chest piece");
  // The class narrows the bench (card 2c); a legacy tier payload reads.
  const writFine: ItemInstance = {
    uid: 999902, baseId: 'smith_writ', ilvl: 12, tier: 1, rarity: 'common',
    name: 'w', baseRoll: 0, implicitRolls: [], affixes: [],
    writ: { category: 'chest', complexity: 2 },
  };
  wC.localSeat.meta.items.push(writFine);
  const fineBases = wC.forgeBases(writFine.uid);
  check("C: the writ's class narrows the bench to its OWN bases",
    fineBases.length > 0 && fineBases.every(x =>
      baseComplexityOf(ITEM_BASES[x.id]) === 2));
  const writLegacy = { ...writFine, uid: 999903, writ: { category: 'chest', tier: 1 } } as unknown as ItemInstance;
  wC.localSeat.meta.items.push(writLegacy);
  check('C: a pre-walk-2 tier payload folds in as the class (tolerance)',
    wC.forgeWrits().some(x => x.uid === 999903 && x.complexity === 1)
    && wC.forgeBases(999903).every(x => baseComplexityOf(ITEM_BASES[x.id]) === 1));
}

console.log(failed === 0 ? '\nALL PASS' : `\n${failed} FAILED`);
process.exit(failed === 0 ? 0 : 1);
