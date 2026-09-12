import { strict as assert } from 'node:assert';
import { bootSimEngine, makeSimWorld } from '../src/sim/arena';
import { VeilIndex, VEIL_DEFAULTS, veilPresenceAlpha } from '../src/engine/veil';
import type { Doodad } from '../src/engine/levelgen';
import { assistAim } from '../src/engine/aimassist';
import { CanopySlices } from '../src/render/vis/canopy';

bootSimEngine();
const crown = (x: number, radius = 90): Doodad => ({ kind: 'tree', pos: { x, y: 500 }, radius });
const chain = Array.from({ length: 12 }, (_, i) => crown(300 + i * 160));
const index = new VeilIndex(chain);
const eye = { x: 300, y: 500 }, far = chain[8];
assert.equal(index.patches.length, 1, 'fixture is one connected forest');
assert.equal(veilPresenceAlpha({}, eye, chain[0]), VEIL_DEFAULTS.reveal);
assert.equal(veilPresenceAlpha({}, eye, far), VEIL_DEFAULTS.cover);
assert.equal(index.concealedFrom(eye, far.pos), true, 'same patch does not grant distant vision');
assert.equal(index.concealedFrom(far.pos, far.pos), false, 'approach opens local cover');
assert.equal(index.concealedFrom(eye, { x: 300, y: 800 }), false, 'open ground stays visible');
const detached = new VeilIndex([crown(300, 20), crown(370, 20)]);
assert.equal(detached.patches.length, 2);
assert.equal(detached.concealedFrom(eye, { x: 370, y: 500 }), false, 'nearby disconnected crowns reveal');
let previous = VEIL_DEFAULTS.reveal as number;
for (let x = 390; x <= 600; x++) {
  const alpha = veilPresenceAlpha({}, { x, y: 500 }, chain[0]);
  assert.ok(alpha >= previous && alpha <= VEIL_DEFAULTS.cover, 'smooth monotonic closing');
  assert.ok(alpha - previous < .02, 'no hard opacity step at the presence boundary');
  previous = alpha;
}
assert.equal(veilPresenceAlpha({ presenceRadius: 0 }, eye, chain[0]), VEIL_DEFAULTS.reveal);
assert.equal(veilPresenceAlpha({ presenceRadius: 0 }, { x: 391, y: 500 }, chain[0]), VEIL_DEFAULTS.cover);
assert.equal(veilPresenceAlpha({ presenceRadius: 20, presenceFeather: 0, reveal: .1 }, eye, chain[0]), .1);
assert.equal(veilPresenceAlpha({}, eye, crown(700, 450)), VEIL_DEFAULTS.reveal, 'large crown opens overhead');
far.felled = { at: 0, wake: 100 };
// Use a standalone target crown so its neighbors do not continue covering it.
const sole = new VeilIndex([far]);
assert.equal(sole.concealedFrom(eye, far.pos), false, 'felled cover cannot hide targets');
far.felled = undefined;

// A nearby first claimant must not seed the whole static forest as revealed.
const slices = new CanopySlices();
slices.begin(1 / 60, { zone: {}, arena: { w: 3000, h: 1000 } });
const patch = index.patches[0];
assert.equal(slices.claim(patch, {}, chain[0], VEIL_DEFAULTS.reveal, VEIL_DEFAULTS.cover, true), VEIL_DEFAULTS.reveal);
assert.equal(slices.claim(patch, {}, far, VEIL_DEFAULTS.cover, VEIL_DEFAULTS.cover, false), VEIL_DEFAULTS.cover);

// The real aim-assist entry point drops a held enemy in distant same-patch
// cover, then reacquires as the local player approaches it.
const w = makeSimWorld('warrior', 0xca90);
w.doodads = chain;
w.markDoodadsChanged();
w.player.pos = { ...eye };
const foe = w.createMonster('zombie', 1, 'enemy');
foe.pos = { ...far.pos };
w.actors.push(foe);
w.losCached = () => true; // isolate canopy concealment from trunk raycasts
assert.equal(assistAim(w, w.player, foe.pos, foe.id, 1).targetId, null);
w.player.pos = { x: foe.pos.x, y: foe.pos.y + 20 };
assert.equal(assistAim(w, w.player, foe.pos, null, 1).targetId, foe.id);
w.player.pos = { ...eye };
assert.equal(assistAim(w, w.player, foe.pos, foe.id, 1).targetId, null, 'walking away closes targeting again');

// Ordinary combat dress must not discard the connected roof's cached image.
const stable = w.veilIndex();
const dress: Doodad = { kind: 'rock', pos: { x: 100, y: 100 }, radius: 12 };
w.doodads.push(dress);
assert.equal(w.veilIndex(), stable, 'unreported non-canopy push retains patch identity');
w.markDoodadsChanged();
assert.equal(w.veilIndex(), stable, 'broad invalidation with unchanged crowns retains cache');
w.doodads.pop();
assert.equal(w.veilIndex(), stable, 'non-canopy removal retains cache');
w.doodads = [...w.doodads];
assert.equal(w.veilIndex(), stable, 'equivalent list replacement retains cache');
chain[0].pos.x -= 50; w.markDoodadsChanged(chain[0]);
assert.notEqual(w.veilIndex(), stable, 'moved crown rebuilds spatial coverage');
let before = w.veilIndex();
chain[0].radius += 20; w.markDoodadsChanged(chain[0]);
assert.notEqual(w.veilIndex(), before, 'resized crown rebuilds coverage');
before = w.veilIndex();
chain[0].rot = .4; w.markDoodadsChanged(chain[0]);
assert.notEqual(w.veilIndex(), before, 'rotated crown refreshes baked art');
before = w.veilIndex();
chain[0].felled = { at: 0, wake: 100 }; w.markDoodadsChanged(chain[0]);
assert.notEqual(w.veilIndex(), before, 'felling changes cover');
before = w.veilIndex();
chain[0].felled = undefined; w.markDoodadsChanged(chain[0]);
assert.notEqual(w.veilIndex(), before, 'regrowth restores cover');
before = w.veilIndex();
w.doodads.push(crown(2500));
assert.notEqual(w.veilIndex(), before, 'unreported canopy push still rebuilds');
console.log('PASS canopy presence: connected/detached crowns, falloff, custom radii, giant/felled cover, composite isolation and live aim-assist acquire/release');
