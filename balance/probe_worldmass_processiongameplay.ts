import assert from 'node:assert/strict';
import { makeSimWorld } from '../src/sim/arena';
import { seedGlobalRandom } from '../src/sim/rng';
import { address, localOffset, moveAddress, type MassAddress } from '../src/worldmass/address';
import { applySavedCharacter, serializeCharacter } from '../src/meta/character';
import { canonical, massDigest } from '../src/worldmass/random';
import { MassProcessionGameplay, type PlannedProcession } from '../src/worldmass/processionGameplay';

const undo = seedGlobalRandom(713);
try {
  const w = makeSimWorld('warrior', 713); w.startWorldMass(713); w.player.invulnerable = true;
  const m = w.massRuntime!, binding = m.geography!.caravans, span = m.config.terrain.addressSpan;
  const at = (x: number, y: number) => address('surface', '0', '0', x * 5400 + 2700, y * 5400 + 2700, span);
  let candidate: Readonly<PlannedProcession> | null = null, surveyed = 0;
  for (let r = 0; r <= 12 && !candidate; r++) for (let y = -r; y <= r && !candidate; y++) for (let x = -r; x <= r && !candidate; x++) {
    if (Math.max(Math.abs(x), Math.abs(y)) !== r) continue;
    const request = binding.preparationInput(at(x, y)); if (!request) continue; surveyed++;
    candidate = binding.plannedAt(at(x, y));
  }
  assert.ok(candidate, 'shared default source lottery supplies a physical procession route');
  assert.equal(candidate.context.zone.level, m.levelAt(localOffset(candidate.owner.center, { ...m.origin, x: 0, y: 0 }, span)), 'source-owned geographical level, not global maxLevel');
  assert.equal(binding.processions.has(candidate.owner.id), false); assert.equal(binding.reserves(candidate.route.entry, 0), false, 'diagnostic cold plan is not an admitted reservation');
  const empty = new MassProcessionGameplay(m, m.geography!.hierarchy, [], () => { throw Error('Empty catalogue queried selection'); });
  empty.prepare(candidate.owner.center, w.time); assert.equal(empty.warmStats.queue.offered, 0); empty.dispose();
  const blocking = { kind: 'rock', pos: localOffset(candidate.owner.center, { ...m.origin, x: 0, y: 0 }, span), radius: 4500 };
  w.doodads.push(blocking); w.markDoodadsChanged();
  assert.equal(binding.plannedAt(candidate.owner.center), null, 'known scene body can make the pure route infeasible');
  const negativeCount = binding.warmStats.synchronous;
  assert.equal(binding.plannedAt(candidate.owner.center), null); assert.equal(binding.warmStats.synchronous, negativeCount, 'same negative input is cached');
  w.doodads.splice(w.doodads.indexOf(blocking), 1); w.markDoodadsChanged();
  assert.ok(binding.plannedAt(candidate.owner.center), 'changed obstacle input invalidates cached negative without moving any born owner');
  const cold = binding.warmStats.synchronous;
  for (const point of candidate.route.points) binding.reserves(point, 60);
  assert.equal(binding.warmStats.synchronous, cold, 'ordinary reservation lookup never compiles a route');
  console.log('PASS natural shared-lottery pure plan, geographical level, bounded reservations and no diagnostic birth', JSON.stringify({ owner: candidate.owner.id, level: candidate.context.zone.level, chunks: candidate.route.chunks.length, surveyed }));

  // Hold scene constant while checking the real facade. A real central rock is
  // placed at its entry; no terrain/country/provider is replaced.
  const q = localOffset(candidate.entry, { ...m.origin, x: 0, y: 0 }, span);
  w.landPartyAt({ x: q.x - 300, y: q.y });
  w.time += 1; binding.sync(w);
  const rock = { kind: 'rock', pos: { ...q }, radius: 160 }; w.doodads.push(rock); w.markDoodadsChanged();
  const refusedBefore = binding.warmStats.coldRefusals;
  for (let n = 0; n < 120; n++) { w.time += .02; binding.sync(w); binding.update(w, 0); }
  assert.equal(binding.processions.has(candidate.owner.id), false, 'real native obstacle refuses cart and road atomically');
  assert.equal(m.geography!.hierarchy.controller(candidate.owner.id, 'procession-access'), undefined, 'failed physics never publishes an access receipt');
  const refused = binding.warmStats.coldRefusals; assert.ok(refused > refusedBefore);
  for (let n = 0; n < 120; n++) { w.time += .02; binding.sync(w); binding.update(w, 0); }
  assert.equal(binding.warmStats.coldRefusals, refused, 'unchanged failed static proof is not rerun every sync');
  assert.equal(binding.reserves(candidate.entry, 0), false, 'failed proof leaves no ghost corridor');
  w.doodads.splice(w.doodads.indexOf(rock), 1); w.markDoodadsChanged();
  console.log('PASS real entry blocker atomic refusal, no repeated unchanged proof, no ghost reservation and scenery revision invalidation');

  // Cold native feature birth may reveal a historic footprint. The input must
  // change and replan, rather than cutting that accepted feature or looping.
  const oldInput = binding.preparationInput(candidate.owner.center)!;
  const birthBefore = m.nativeFeatures!.stats.born;
  for (const point of candidate.points) m.nativeFeatures!.intersects(point, 60);
  const current = binding.preparationInput(candidate.owner.center)!;
  const newBirths = m.nativeFeatures!.stats.born - birthBefore;
  if (canonical(current) !== canonical(oldInput)) {
    w.time += 1; binding.sync(w);
    assert.ok(binding.warmStats.stale > 0, 'changed born footprint invalidates pending geometry');
  }
  console.log('NATIVE_COLD_ROUTE_INPUT', JSON.stringify({ newBirths, changed: canonical(current) !== canonical(oldInput), warm: binding.warmStats }));

  const candidates: Readonly<PlannedProcession>[] = [candidate]; let admitted: Readonly<PlannedProcession> | undefined;
  for (let r = 0; r <= 10 && candidates.length < 10; r++) for (let y = -r; y <= r && candidates.length < 10; y++) for (let x = -r; x <= r && candidates.length < 10; x++) {
    if (Math.max(Math.abs(x), Math.abs(y)) !== r) continue;
    if (!binding.preparationInput(at(x, y))) continue;
    const p = binding.plannedAt(at(x, y)); if (p && !candidates.some(c => c.owner.id === p.owner.id)) candidates.push(p);
  }
  const nativeAdmit = binding.processions.admit.bind(binding.processions); let allowBirth = false, deniedBirths = 0, checkedProximity = false;
  binding.processions.admit = (...args: Parameters<typeof nativeAdmit>) => { if (!allowBirth) { deniedBirths++; return false; } return nativeAdmit(...args); };
  for (const p of candidates) {
    const q = localOffset(p.entry, { ...m.origin, x: 0, y: 0 }, span); w.landPartyAt({ x: q.x - 300, y: q.y });
    m.update(w, true); // Complete ordinary native/ecology population before asking the route compiler to detour it.
    for (let n = 0; n < 1800 && !binding.processions.has(p.owner.id) && !deniedBirths; n++) {
      w.time += .02; m.update(w); binding.update(w, 0);
    }
    if (deniedBirths && !checkedProximity) {
      assert.equal(binding.processions.has(p.owner.id), false); assert.equal(m.geography!.hierarchy.controller(p.owner.id, 'procession-access'), undefined);
      assert.equal(binding.reserves(p.entry, 0), false, 'manager capacity refusal does not publish access or a ghost corridor');
      const denied = deniedBirths; w.time += 1; binding.sync(w);
      assert.ok(binding.warmStats.checking, 'a fully proved route can retry later capacity');
      w.landPartyAt({ x: q.x + 20000, y: q.y });
      for (let n = 0; n < 1500 && binding.warmStats.checking; n++) { w.time += .02; binding.update(w, 0); }
      assert.equal(binding.warmStats.checking, null); assert.equal(deniedBirths, denied, 'player departure blocks final publication before calling native admission');
      assert.equal(m.geography!.hierarchy.controller(p.owner.id, 'procession-access'), undefined);
      checkedProximity = true; allowBirth = true; w.landPartyAt({ x: q.x - 300, y: q.y });
      for (let n = 0; n < 1200 && !binding.processions.has(p.owner.id); n++) { w.time += .02; m.update(w); binding.update(w, 0); }
      console.log('PASS complete-proof capacity refusal and player departure leave no born authority, cart or road');
    }
    console.log('NATURAL_PROCESSION_CANDIDATE', JSON.stringify({ owner: p.owner.id, mounted: binding.processions.has(p.owner.id), stats: binding.warmStats }));
    if (binding.processions.has(p.owner.id)) { admitted = p; break; }
  }
  assert.ok(checkedProximity);
  assert.ok(admitted, 'at least one natural default route passes real cold native geometry and mounts a cart');
  const owner = admitted.owner.id, definition = binding.processions.definition(owner)!;
  assert.ok(definition.road.length > 0); assert.ok(definition.route.chunks.length >= 3);
  assert.ok(definition.road.every(row => row.doodad.kind === 'road' && row.doodad.radius >= 16 && row.doodad.radius <= 22 && !row.doodad.wild), 'actual kept-way primitives retained');
  assert.ok(binding.reserves(definition.route.entry, 0));
  const actors = binding.processions.actors(owner), cart = [...actors.values()].find(a => a.defId === 'caravan_cart')!; assert.ok(cart && w.actors.includes(cart));
  assert.equal(cart.eventKey, 'procession:' + owner); cart.life -= 11;
  const routeHash = definition.route.proofHash, roadHash = massDigest(definition.road), access = m.geography!.hierarchy.controller(owner, 'procession-access')!;
  const saved = serializeCharacter(w), continued = makeSimWorld('warrior', 714); assert.ok(applySavedCharacter(continued, saved)); assert.ok(continued.adoptWorldState(saved.world));
  continued.startWorldMass(saved.world!.worldmass!.state.run.seed, saved.world!.worldmass);
  const restored = continued.massRuntime!.geography!.caravans;
  assert.equal(restored.processions.definition(owner)!.route.proofHash, routeHash); assert.equal(massDigest(restored.processions.definition(owner)!.road), roadHash);
  assert.equal(canonical(continued.massRuntime!.geography!.hierarchy.controller(owner, 'procession-access')), canonical(access));
  const restoredCart = [...restored.processions.actors(owner).values()].find(a => a.defId === 'caravan_cart')!;
  assert.ok(restoredCart); assert.equal(restoredCart.life, cart.life); assert.equal(restored.population, binding.population);
  const malformed = structuredClone(saved), row = malformed.world!.worldmass!.geography!.owners.find(o => o.owner.id === owner)!.controllers.find(c => c.id === 'procession-access')!;
  (row.definition as { preparation: { plan: { points: { x: number }[] } } }).preparation.plan.points[1].x++;
  row.definitionHash = massDigest(row.definition);
  const bad = makeSimWorld('warrior', 715); assert.ok(applySavedCharacter(bad, malformed)); assert.ok(bad.adoptWorldState(malformed.world));
  assert.throws(() => bad.startWorldMass(malformed.world!.worldmass!.state.run.seed, malformed.world!.worldmass), /procession/i);
  const wrongAuthority = structuredClone(saved), authority = wrongAuthority.world!.worldmass!.geography!.owners.find(o => o.owner.id === owner)!.controllers.find(c => c.id === 'procession-access')!;
  authority.source = 'foreign-access-owner';
  const wrong = makeSimWorld('warrior', 716); assert.ok(applySavedCharacter(wrong, wrongAuthority)); assert.ok(wrong.adoptWorldState(wrongAuthority.world));
  assert.throws(() => wrong.startWorldMass(wrongAuthority.world!.worldmass!.state.run.seed, wrongAuthority.world!.worldmass), /access authority/);
  const corruptRoad = structuredClone(saved), roadOwner = corruptRoad.world!.worldmass!.geography!.owners.find(o => o.owner.id === owner)!;
  for (const controller of roadOwner.controllers.filter(c => c.id === 'procession-access' || c.id === 'objective:procession')) {
    const road = (controller.definition as { road: { at: MassAddress }[] }).road;
    road[2].at = moveAddress(road[2].at, { x: 500, y: 0 }, span);
    controller.definitionHash = massDigest(controller.definition);
  }
  const roadBad = makeSimWorld('warrior', 717); assert.ok(applySavedCharacter(roadBad, corruptRoad)); assert.ok(roadBad.adoptWorldState(corruptRoad.world));
  assert.throws(() => roadBad.startWorldMass(corruptRoad.world!.worldmass!.state.run.seed, corruptRoad.world!.worldmass), /road.*emission/);
  assert.ok(binding.warmStats.prepared > 0, 'ordinary full-runtime prepare publishes an independently validated plan');
  console.log('PASS actual natural native cart/kept-road birth, frozen source/access/road and wounded first-update Continue, coherent damaged saved route refusal', JSON.stringify({ owner, road: definition.road.length, routeHash, admitted: binding.warmStats.admitted, proofStats: binding.warmStats }));
  m.dispose(); continued.massRuntime!.dispose();
} finally { undo(); }
