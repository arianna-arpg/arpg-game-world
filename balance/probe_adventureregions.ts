import assert from 'node:assert/strict';
import { mkdirSync, writeFileSync } from 'node:fs';
import { makeSimWorld } from '../src/sim/arena';
import { seedGlobalRandom } from '../src/sim/rng';
import { featuresInRect, setAtlasSeed } from '../src/world/atlas';
import { ADVENTURE_LOCALE_IDS } from '../src/data/adventureLocales';
import { ADVENTURE_REGION_IDS } from '../src/data/adventureRegions';
import { landmarkComplexes, resolveComplexForm, validateLandmarkComplex } from '../src/world/landmarkComplexes';
import { placeZoneAt } from '../src/engine/worldgen';
import { materializeComplex } from '../src/engine/landmarkComplexGen';
import { generateLayout } from '../src/engine/levelgen';
import { atlasDestinationAt, compileLocale, localeProgram } from '../src/world/locales';
import { Rng } from '../src/core/rng';
import { BOUNTY_KINDS, BOUNTY_BOARD_CFG, registerBountyKind } from '../src/data/bountyboard';
import { edgeBlockAt } from '../src/world/edgeBlocks';
import { serializeCharacter, applySavedCharacter } from '../src/meta/character';
import { serializeZone, applyZone } from '../src/net/snapshot';
import type { ZoneDef } from '../src/data/zones';

seedGlobalRandom(73121);
const w = makeSimWorld('warrior', 73121);
w.player.level = 10;
const sites = featuresInRect({ x: -40000, y: -40000 }, { x: 40000, y: 40000 });
const definitions = landmarkComplexes().filter(c => ADVENTURE_REGION_IDS.includes(c.id));
assert.equal(definitions.length, 5);
const fixtures: ZoneDef[][] = [];

for (const def of definitions) {
  setAtlasSeed(w.sim.biomeField.fieldSeed);
  assert.deepEqual(validateLandmarkComplex(def), []);
  if (def.links.some(l => l.bountyPassage)) {
  const bad = structuredClone(def), gate = bad.links.find(l => l.bountyPassage)!;
  bad.links.push({ from: bad.entrance, to: gate.to });
  assert(validateLandmarkComplex(bad).some(e => e.includes('bountyPassage')), 'a bypass into sealed ground is invalid');
  const reversed = structuredClone(def), reverse = reversed.links.find(l => l.bountyPassage)!;
  [reverse.from, reverse.to] = [reverse.to, reverse.from];
  assert(validateLandmarkComplex(reversed).some(e => e.includes('bountyPassage')), 'task cannot sit behind its own seal');
  for (const objective of [{ kind: 'none' }, { kind: 'safe' }, { kind: 'waves', waves: 0 }] as const) {
    const impossible = structuredClone(def);
    impossible.stages.find(s => s.id === gate.from)!.objective = objective;
    assert(validateLandmarkComplex(impossible).some(e => e.includes('bountyPassage')), 'non-completing work cannot own access');
  }
  const survey = structuredClone(def);
  survey.stages.find(s => s.id === gate.from)!.objective = { kind: 'beacon', count: 2 };
  assert.deepEqual(validateLandmarkComplex(survey), [], 'commission accepts native objectives outside the initial four');
  const leyline = structuredClone(def), leylineStage = leyline.stages.find(s => s.id === gate.from)!;
  leylineStage.objective = { kind: 'leyline' };
  assert(validateLandmarkComplex(leyline).some(e => e.includes('needs a waypoint')));
  leylineStage.waypoint = true;
  assert.deepEqual(validateLandmarkComplex(leyline), [], 'native prerequisite is an explicit stage choice');
  leyline.stages.find(s => s.id === gate.to)!.waypoint = true;
  assert(validateLandmarkComplex(leyline).some(e => e.includes('bountyPassage')), 'waypoint cannot bypass a sealed leaf');
  }
  const site = sites.find(s => s.kind === def.id && atlasDestinationAt(s.seat)?.feature.id === s.id);
  assert(site, `${def.id}: found in real atlas`);
  const minted: Record<string, ZoneDef> = {};
  const root = placeZoneAt(site.seat, null, minted, 2000 + fixtures.length, {
    fieldBiome: true, biomeFor: () => 'forest', seed: 88211 + fixtures.length, level: 8, forceFrontiers: 0,
  });
  Object.assign(w.zoneMap, minted);
  w.zoneMap[root.id] = root;
  assert.equal(root.complex?.kind, def.id);
  const members = Object.values(w.zoneMap).filter(z => z.complex?.root === root.id);
  const form = def.forms?.find(f => f.id === root.complex?.form);
  assert.equal(members.length, (form ? resolveComplexForm(def, form) : def).stages.length);
  assert.equal(root.objective.kind, 'none', 'arrival is a place, not a compulsory clear');
  const task = members.find(z => z.complex?.bountyPassage);
  assert.equal(!!root.complex?.bountyPassageBoard, !!task);
  if (task) {
    assert.notEqual(task, root);
    assert.equal(w.zoneMap[task.complex!.bountyPassage!.to].waypoint, false);
  }
  for (const stage of def.stages) if (stage.packs) {
    const member = members.find(z => z.complex!.stage === stage.id)!;
    assert.deepEqual(member.packs, stage.packs);
    assert.notEqual(member.packs, stage.packs, 'stage populations are baked copies');
  }
  fixtures.push(structuredClone(members));

}

for (const fixture of fixtures) {
  const root = w.zoneMap[fixture.find(z => z.id === z.complex!.root)!.id];
  const members = fixture.map(z => w.zoneMap[z.id]);
  const task = members.find(z => z.complex?.bountyPassage);
  if (!task) {
    // Open journeys are fully traversable with every activity unfinished.
    for (const z of members) {
      w.loadZone(z.id);
      assert(!w.bountyBoardsHere().some(b => b.id === root.id));
      for (const e of w.exits) assert(!w.isExitLocked(e), `${z.id}: optional work never bars exploration`);
      const activity = w as unknown as { puzzles: { isObjective: boolean; done: boolean }[]; spires: unknown[] };
      if (z.objective.kind === 'puzzle') assert(activity.puzzles.some(p => p.isObjective && !p.done));
      if (z.objective.kind === 'beacon') assert.equal(activity.spires.length, z.objective.count);
    }
    continue;
  }
  const access = task.complex!.bountyPassage!;
  const sealed = w.zoneMap[access.to];
  const before = JSON.stringify(members.map(z => z.locale));
  w.loadZone(root.id);
  const board = w.bountyBoardsHere().find(b => b.id === root.id);
  assert(board, 'a physical local board exists at every remote region');
  assert(w.walk?.reachable?.(w.player.pos, board.pos), 'local board is reachable from entry');
  Object.assign(w.player.pos, board.pos);
  assert(w.nearBountyBoard(w.localSeat, root.id));
  w.armBountyBoard(root.id);
  let p = w.bountyOffers.find(p => p.boardId === root.id && p.kind === 'passage');
  assert(p, 'regional board guarantees its commission');
  assert.equal(p.zoneId, task.id);
  assert(w.bountyApproaches(root.id, false).has(task.id), 'task is outside seal');
  assert(!w.bountyApproaches(root.id, false).has(sealed.id), 'sealed wing is absent from travel offers');
  assert(w.acceptBounty(p.id));
  assert(!w.turnInBounty(p.id), 'unfinished commission cannot open gate');
  assert(!access.opened);

  w.loadZone(task.id, root.id);
  const door = w.exits.find(e => e.to === sealed.id)!;
  assert(door && w.isExitLocked(door));
  assert(edgeBlockAt(w, task.id, sealed.id) && edgeBlockAt(w, sealed.id, task.id));
  assert(w.exits.some(e => e.to !== sealed.id && !w.isExitLocked(e)), 'retreat remains available');

  // Completion alone is insufficient; abandoning must leave the passage sealed.
  w.completedObjectives.add(task.id);
  assert.equal(w.handState(p), 'ready');
  assert(w.isExitLocked(door));
  assert(w.abandonBounty(p.id));
  assert(!access.opened);

  // Already finished work must not make the commission disappear forever.
  w.loadZone(root.id);
  Object.assign(w.player.pos, w.bountyBoardsHere().find(b => b.id === root.id)!.pos);
  w.time += BOUNTY_BOARD_CFG.beatSec;
  w.armBountyBoard(root.id);
  p = w.bountyOffers.find(p => p.boardId === root.id && p.kind === 'passage');
  assert(p && !BOUNTY_KINDS.passage.done(w, p), 'completed-but-uncommissioned work remains offered');
  assert(w.acceptBounty(p.id));
  assert.equal(w.handState(p), 'ready');

  // Real account/world save path before turn-in retains both the hand and seal.
  const saved = JSON.parse(JSON.stringify(serializeCharacter(w)));
  const resumed = makeSimWorld('warrior', 73121);
  assert(applySavedCharacter(resumed, saved));
  assert(resumed.adoptWorldState(saved.world));
  assert.equal(resumed.zoneMap[task.id].complex!.bountyPassage!.opened, false);
  assert(resumed.bountyHands.some(h => h.id === p!.id));
  assert.equal(resumed.handState(resumed.bountyHands.find(h => h.id === p!.id)!), 'ready');
  resumed.loadZone(root.id);
  Object.assign(resumed.player.pos, resumed.bountyBoardsHere().find(b => b.id === root.id)!.pos);
  assert(resumed.turnInBounty(p.id));
  assert(resumed.zoneMap[task.id].complex!.bountyPassage!.opened);
  assert(!resumed.turnInBounty(p.id), 'collection is once-only');
  assert(!edgeBlockAt(resumed, task.id, sealed.id));
  assert(resumed.bountyApproaches(root.id, false).has(sealed.id));
  resumed.loadZone(task.id, root.id);
  const openDoor = resumed.exits.find(e => e.to === sealed.id)!;
  assert(!resumed.isExitLocked(openDoor));
  (resumed as unknown as { travelThrough(e: typeof openDoor): void }).travelThrough(openDoor);
  assert.equal(resumed.zone.id, sealed.id);
  const back = resumed.exits.find(e => e.to === task.id)!;
  assert(!resumed.isExitLocked(back));
  (resumed as unknown as { travelThrough(e: typeof back): void }).travelThrough(back);
  assert.equal(resumed.zone.id, task.id);

  const packet = serializeZone(resumed), client = makeSimWorld('warrior', 16);
  assert.equal(packet.complex?.bountyPassage?.opened, true);
  applyZone(client, packet);
  assert.equal(client.zone.complex?.bountyPassage?.opened, true);
  packet.complex!.bountyPassage!.opened = false;
  assert.equal(client.zone.complex!.bountyPassage!.opened, true, 'network ownership is deep');
  assert.equal(resumed.zone.complex!.bountyPassage!.opened, true);
  const savedOpen = JSON.parse(JSON.stringify(serializeCharacter(resumed)));
  const reloaded = makeSimWorld('warrior', 16);
  assert(applySavedCharacter(reloaded, savedOpen) && reloaded.adoptWorldState(savedOpen.world));
  assert.equal(reloaded.zoneMap[task.id].complex?.bountyPassage?.opened, true);
  assert.equal(JSON.stringify(members.map(z => z.locale)), before, 'opening never rerolls terrain');

  // Close out the original fixture as well so it cannot leave a standing hand.
  assert(w.turnInBounty(p.id));
}
console.log('PASS five atlas regions, open exploration with live puzzle/survey, reachable commission boards, two-way gates, abandonment, prior completion, travel, saved access and network ownership');

// Overlevelled exploration still earns access through the demanding seat.
const oldRoot = fixtures[0][0].complex!.root;
w.loadZone(oldRoot); w.player.level = 40;
const oldTask = Object.values(w.zoneMap).find(z => z.complex?.root === oldRoot && z.complex.bountyPassage)!;
oldTask.complex!.bountyPassage!.opened = false;
w.time += BOUNTY_BOARD_CFG.beatSec; w.armBountyBoard(oldRoot);
assert(w.bountyOffers.some(p => p.boardId === oldRoot && p.kind === 'passage'), 'outlevelling a region never loses its commission');

// A previously discovered v2 woodland keeps its commission even though new
// woodland discoveries are open. Registry changes never rewrite saved access.
{
  const old = structuredClone(fixtures.find(f => f[0].complex!.kind === 'woodland_sanctuary')!);
  const root = old.find(z => z.id === z.complex!.root)!;
  const task = old.find(z => z.complex!.stage === 'groves')!;
  const end = old.find(z => z.complex!.stage === 'heart')!;
  for (const z of old) z.complex!.version = 2;
  root.complex!.bountyPassageBoard = true; root.objective = { kind: 'clear' };
  task.complex!.bountyPassage = { to: end.id, label: 'The rootbound sanctuary', opened: false };
  const legacy = makeSimWorld('warrior', 17182); legacy.player.level = 10;
  for (const z of old) legacy.zoneMap[z.id] = z;
  legacy.loadZone(root.id); legacy.completedObjectives.add(task.id);
  const saved = JSON.parse(JSON.stringify(serializeCharacter(legacy)));
  const resumed = makeSimWorld('warrior', 17182);
  assert(applySavedCharacter(resumed, saved) && resumed.adoptWorldState(saved.world));
  const before = JSON.stringify(old.map(z => z.locale));
  assert.deepEqual(materializeComplex(resumed.zoneMap[root.id], resumed.zoneMap, 'woodland_sanctuary'), []);
  resumed.loadZone(root.id);
  Object.assign(resumed.player.pos, resumed.bountyBoardsHere().find(b => b.id === root.id)!.pos);
  resumed.armBountyBoard(root.id);
  const hand = resumed.bountyOffers.find(p => p.boardId === root.id && p.kind === 'passage')!;
  assert(hand && resumed.acceptBounty(hand.id) && resumed.turnInBounty(hand.id));
  assert(resumed.zoneMap[task.id].complex!.bountyPassage!.opened);
  assert.equal(JSON.stringify(old.map(z => resumed.zoneMap[z.id].locale)), before);
  console.log('PASS version-two saved woodland retains its original board, access commission and terrain');
}

// Two extension providers must compete by weight, not insertion order.
const passage = BOUNTY_KINDS.passage, previousCharge = BOUNTY_KINDS.charge;
const rivalId = 'charge';
registerBountyKind({ ...passage, id: rivalId, weight: passage.weight * 3,
  roll(host, rng, taken) {
    const posting = passage.roll(host, rng, taken);
    return posting ? { ...posting, kind: rivalId } : null;
  },
});
try {
  const competing = makeSimWorld('warrior', 90071);
  for (const z of structuredClone(fixtures[0])) competing.zoneMap[z.id] = z;
  competing.player.level = 10; competing.loadZone(oldRoot);
  const counts = { passage: 0, rival: 0 };
  for (let beat = 1; beat <= 48; beat++) {
    competing.time += BOUNTY_BOARD_CFG.beatSec;
    competing.armBountyBoard(oldRoot);
    const first = competing.bountyOffers.find(p => p.boardId === oldRoot)!;
    if (first.kind === 'passage') counts.passage++;
    else if (first.kind === rivalId) counts.rival++;
    else assert.fail('priority work must precede repeatable work');
  }
  assert(counts.passage > 0 && counts.rival > counts.passage, JSON.stringify(counts));
  console.log('PASS competing priority providers use configured weights: ' + JSON.stringify(counts));
} finally {
  registerBountyKind(previousCharge);
}

for (const id of ADVENTURE_LOCALE_IDS) {
  const program = localeProgram(id)!;
  for (const variant of program.variants) for (const scale of program.sizeScale!) {
    const size = { w: Math.round(program.size.w * scale), h: Math.round(program.size.h * scale) };
    const z: ZoneDef = { ...structuredClone(fixtures[0][0]), id: 'qa_adventure_shape', size,
      locale: compileLocale(program, 555, variant.id), seed: 555, exits: [], complex: undefined };
    const entry = { x: 120, y: size.h / 2 }, exit = { x: size.w - 120, y: size.h / 2 };
    const result = generateLayout(z, size, new Rng(555), entry, [exit]);
    assert(result.walk?.reachable?.(entry, exit), `${id}/${variant.id}: exit`);
    for (const district of result.localeReport!.districts)
      assert(result.walk?.reachable?.(entry, district.center), `${id}/${variant.id}/${district.id}`);
    assert.deepEqual(generateLayout(JSON.parse(JSON.stringify(z)), size, new Rng(555), entry, [exit]).doodads, result.doodads);
  }
}
mkdirSync('balance/reports', { recursive: true });
writeFileSync('balance/reports/adventure-fixtures.json', JSON.stringify(fixtures));
console.log('PASS all adventure route variants at both size extremes, deterministic dressing and persistent generated terrain');
