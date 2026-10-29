import { strict as assert } from 'node:assert';
import { bootSimEngine, makeSimWorld } from '../src/sim/arena';
import { seedGlobalRandom } from '../src/sim/rng';
import { makeMemoryItem, MEMORY_CFG, memoryFacets, type MemoryKind } from '../src/engine/memories';
import { autoPlace } from '../src/engine/inventory';
import { makeSupportGemItem, freeCellCount } from '../src/engine/gemitems';
import { SUPPORTS } from '../src/data/supports';
import { MemoryRecallBatch, MEMORY_RECALL_UI_CFG, requestMemoryRecall } from '../src/ui/memoryRecall';
import { independentPanelSeat } from '../src/ui/panelPlacement';
import type { Seat } from '../src/engine/world';

bootSimEngine(); seedGlobalRandom(0xadec);
const make = () => makeSimWorld('warrior', 0xadec);
const plant = (seat: Seat, n: number, kind: MemoryKind = 'rough') => {
  const pouch = makeMemoryItem(kind, Array.from({ length: n }, (_, i) => ({ d: i % 2 ? 'crypt_lich' : 'zombie', s: 710 + i })));
  assert.ok(autoPlace(seat.meta.items, pouch)); return pouch;
};
const beat = MEMORY_RECALL_UI_CFG.intervalMs;
{
  const w = make(), seat = w.localSeat, pouch = plant(seat, 8), batch = new MemoryRecallBatch();
  const twin = make(), other = plant(twin.localSeat, 8), actual: unknown[] = [], expected: unknown[] = [];
  assert.ok(batch.start(w, seat, pouch.uid));
  let now = 0;
  while (batch.active) {
    const got = batch.tick(w, seat, pouch.uid, now);
    assert.ok(got);
    const manual = requestMemoryRecall(twin, twin.localSeat, other.uid, got.group)!;
    const facts = ({ kind, id, rarity }: typeof manual) => ({ kind, id, rarity });
    actual.push(facts(got.result)); expected.push(facts(manual));
    assert.equal(batch.tick(w, seat, pouch.uid, now + beat / 2), null, 'no catch-up burst between beats');
    now += beat;
  }
  assert.equal(actual.length, 8); assert.deepEqual(actual, expected);
  assert.ok(!seat.meta.items.includes(pouch));
  console.log('PASS batch matches individual seeded reveals, FIFO groups and native retirement');
}
{
  const w = make(), seat = w.localSeat, pouch = plant(seat, 3), batch = new MemoryRecallBatch();
  const junk: number[] = [];
  for (;;) {
    const item = makeSupportGemItem({ def: SUPPORTS.arcing, level: 1 });
    if (!autoPlace(seat.meta.items, item)) break;
    junk.push(item.uid);
  }
  assert.equal(freeCellCount(seat.meta.items), 0);
  const sealedUnits = JSON.stringify(pouch.mem), textCount = w.texts.length;
  let requests = 0;
  const request = w.requestMeta.bind(w); w.requestMeta = action => { requests++; request(action); };
  assert.ok(batch.start(w, seat, pouch.uid));
  for (let i = 0; i < 10; i++) assert.equal(batch.tick(w, seat, pouch.uid, i * beat), null);
  assert.equal(batch.paused, MEMORY_CFG.strings.noRoom); assert.ok(batch.active);
  assert.equal(JSON.stringify(pouch.mem), sealedUnits); assert.equal(w.texts.length, textCount); assert.equal(requests, 0);
  const firstFreed = junk.pop(); seat.meta.items = seat.meta.items.filter(i => i.uid !== firstFreed);
  assert.ok(batch.tick(w, seat, pouch.uid, 10 * beat)); assert.equal(pouch.mem!.length, 2);
  assert.equal(batch.tick(w, seat, pouch.uid, 11 * beat), null); assert.ok(batch.active);
  const nextFreed = junk.pop(); seat.meta.items = seat.meta.items.filter(i => i.uid !== nextFreed);
  assert.ok(batch.tick(w, seat, pouch.uid, 12 * beat)); assert.equal(pouch.mem!.length, 1);
  assert.ok(batch.tick(w, seat, pouch.uid, 13 * beat), 'last unit uses the retiring pouch cell');
  assert.equal(batch.active, false); assert.equal(requests, 3); assert.equal(freeCellCount(seat.meta.items), 0);
  console.log('PASS full bag pauses without consumption or refusal spam, resumes and uses the final pouch cell');
}
{
  const w = make(), seat = w.localSeat, pouch = plant(seat, 3, 'preformed'), batch = new MemoryRecallBatch();
  assert.equal(batch.start(w, seat, pouch.uid), false);
  assert.equal(batch.start(w, seat, pouch.uid, 'not-an-attribute'), false);
  assert.ok(batch.start(w, seat, pouch.uid, memoryFacets()[0].id));
  const spoils = w.zone.spoils; w.zone = { ...w.zone, spoils: 'none' };
  assert.equal(batch.tick(w, seat, pouch.uid, 0), null); assert.equal(batch.paused, MEMORY_CFG.strings.sealed);
  w.zone = { ...w.zone, spoils };
  assert.equal(batch.tick(w, seat, pouch.uid, beat)?.result.kind, 'skill');
  batch.stop(); const left = pouch.mem!.length;
  assert.equal(batch.tick(w, seat, pouch.uid, beat * 2), null); assert.equal(pouch.mem!.length, left);
  console.log('PASS facet choice, spoils seal, automatic unsealing and explicit cancellation');
}
{
  const w = make(), seat = w.localSeat, pouch = plant(seat, 2), batch = new MemoryRecallBatch();
  for (const change of ['world', 'owner', 'pouch', 'death', 'removed'] as const) {
    seat.actor.dead = false;
    assert.ok(batch.start(w, seat, pouch.uid));
    if (change === 'death') seat.actor.dead = true;
    if (change === 'removed') seat.meta.items = seat.meta.items.filter(i => i !== pouch);
    const other = change === 'world' || change === 'owner' ? make() : w;
    assert.equal(batch.tick(change === 'world' ? other : w, change === 'owner' ? other.localSeat : seat,
      change === 'pouch' ? pouch.uid + 1 : pouch.uid, 0), null);
    assert.equal(batch.active, false);
    assert.equal(pouch.mem!.length, 2);
  }
  console.log('PASS world, owner, pouch, death and removed-item boundaries cancel the batch');
}
{
  const w = make(), hero = w.localSeat;
  const guest = w.addSeat('recall-guest', hero.meta.classDef, hero.input);
  guest.couch = { pad: 1, side: 'right' };
  const pouch = plant(guest, 2), batch = new MemoryRecallBatch(), before = hero.meta.items.length;
  assert.ok(batch.start(w, guest, pouch.uid));
  w.uiActionSeatId = 'outer-event';
  assert.ok(batch.tick(w, guest, pouch.uid, 0));
  assert.equal(hero.meta.items.length, before); assert.equal(pouch.mem!.length, 1);
  assert.equal(w.uiActionSeatId, 'outer-event'); assert.equal(w.memoryRecallLast?.seat, guest.id);
  console.log('PASS automatic actions retain couch ownership and restore the surrounding action context');
}
for (const scale of [0.8, 1, 1.35]) for (const leftSide of [false, true]) {
  const screen = { left: 8, right: 1800 * scale - 8, top: 8, bottom: 900 * scale };
  const occupied = leftSide ? { left: 8, right: 800 * scale, top: 50, bottom: 900 * scale }
    : { left: 1000 * scale, right: screen.right, top: 50, bottom: 900 * scale };
  const seat = independentPanelSeat(screen, [occupied], { left: 665 * scale, top: 80 * scale, width: 470 * scale }, 280 * scale, 14 * scale);
  assert.ok(seat.left >= screen.left && seat.left + seat.width <= screen.right);
  assert.ok(seat.left >= occupied.right || seat.left + seat.width <= occupied.left);
}
{
  const viewport = { left: 8, right: 792, top: 8, bottom: 600 };
  const all = { left: 8, right: 792, top: 20, bottom: 600 };
  const seat = independentPanelSeat(viewport, [all], { left: 165, top: 64, width: 470 }, 280, 14);
  assert.ok(seat.left >= 8 && seat.left + seat.width <= 792 && seat.top >= 8);
  assert.equal(seat.maxHeight + seat.top, 600);
}
console.log('PASS independent placement on both sides, scaled views and narrow-screen bounds');
