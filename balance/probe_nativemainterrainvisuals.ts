import assert from 'node:assert/strict';
import { makeSimWorld } from '../src/sim/arena';
import { SKILLS } from '../src/data/skills';
import { makeSkillInstance } from '../src/engine/skills';
import { serializeSnapshot, applySnapshot } from '../src/net/snapshot';
import { skillFieldVisual } from '../src/engine/skillFieldVisual';
import { drawSkillField } from '../src/render/vis/skillFlightVoice';
import { Renderer } from '../src/render/renderer';
import { MassGenerator, makeMassRun } from '../src/worldmass/generator';
import { MassState } from '../src/worldmass/state';
import { MassStream } from '../src/worldmass/stream';
import { MassWalk } from '../src/worldmass/walk';
import { regionGrid } from '../src/world/walk';
import { groundedCellsIn } from '../src/render/vis/boilLayer';
import type { World } from '../src/engine/world';

const checks: string[] = [];
function check(name: string, run: () => void) { run(); checks.push(name); console.log('PASS ' + name); }
// A canvas recorder observes real painter calls and clipping paths. It does not
// model pixels, game authority, or combat; all native fields come from World.
function canvasRecorder() {
  const rotations: number[] = [], clips: number[][][] = [];
  const stack: number[] = [];
  let rects: number[][] = [], saves = 0, restores = 0;
  const state = { globalAlpha: 1 };
  const ctx = new Proxy(state, {
    get(o, key) {
      if (key === 'save') return () => { stack.push(o.globalAlpha); saves++; };
      if (key === 'restore') return () => { assert(stack.length, 'unbalanced restore'); o.globalAlpha = stack.pop()!; restores++; };
      if (key === 'beginPath') return () => { rects = []; };
      if (key === 'rect') return (...args: number[]) => { args.forEach(n => assert(Number.isFinite(n))); rects.push(args); };
      if (key === 'clip') return () => { clips.push(rects.map(row => [...row])); };
      if (key === 'rotate') return (n: number) => { assert(Number.isFinite(n)); rotations.push(n); };
      if (key in o) return Reflect.get(o, key);
      return (...args: unknown[]) => { args.filter(n => typeof n === 'number').forEach(n => assert(Number.isFinite(n))); };
    },
    set(o, key, value) { return Reflect.set(o, key, value); },
  }) as unknown as CanvasRenderingContext2D;
  return { ctx, rotations, clips, balanced() { assert.equal(stack.length, 0); assert.equal(saves, restores); } };
}
const host = makeSimWorld('warrior', 98411), peer = makeSimWorld('warrior', 98412);
host.actors = [host.player]; peer.clientSeatId = host.localSeat.id;
host.executeSkill(host.player, makeSkillInstance(SKILLS.consecration), { x: host.player.pos.x + 100, y: host.player.pos.y + 100 });
assert(host.zones.length); const zone = host.zones[0];
zone.pos = { ...host.player.pos }; zone.shape = 0; zone.facing = .7143; zone.exploded = true; zone.delay = 0;
check('circular motifs retain quantized facing and actual painter rotation', () => {
  const snap = serializeSnapshot(host, 1); applySnapshot(peer, snap);
  const local = skillFieldVisual(zone, host.time), remote = peer.remoteSkillFields![0];
  assert.equal(snap.zones![0].f, .714); assert.equal(remote.facing, .714);
  const a = canvasRecorder(), b = canvasRecorder();
  assert(drawSkillField(a.ctx, local, host.time)); assert(drawSkillField(b.ctx, remote, host.time));
  assert.equal(a.rotations[0], .7143); assert.equal(b.rotations[0], .714);
  assert(Math.abs(a.rotations[0] - b.rotations[0]) <= .0005); a.balanced(); b.balanced();
});
check('ground restrictions survive both telegraph and lingering wire phases', () => {
  zone.onGround = ['cistern_water']; zone.linger = 1;
  for (const exploded of [false, true]) {
    zone.exploded = exploded;
    const snap = serializeSnapshot(host, exploded ? 3 : 2); applySnapshot(peer, snap);
    assert.deepEqual(snap.zones![0].og, zone.onGround);
    assert.deepEqual(peer.remoteSkillFields![0].onGround, zone.onGround);
    assert.notEqual(snap.zones![0].og, zone.onGround);
    assert.notEqual(peer.remoteSkillFields![0].onGround, snap.zones![0].og);
  }
});
const spec = { id: 'proof:wet', version: 1, addressSpan: 240, terrainCell: 30,
  fields: [{ id: 'elevation', base: .5, layers: [] }],
  surfaces: [{ id: 'wet', priority: 0, when: [], region: 'cistern_water', color: '#aabbcc', biome: 'field' }], places: [] };
const generator = new MassGenerator(makeMassRun(4, 'proof', spec), spec);
const state = new MassState(generator.run, 30);
const walk = new MassWalk(new MassStream(generator, state, { maxPages: 4, maxSamples: 100 }), { dimension: 'surface', cx: '0', cy: '0' });
assert.equal(regionGrid(walk), walk);
const pos = { x: 120, y: 120 }, radius = 70;
const cells = groundedCellsIn(walk, pos, radius, ['cistern_water']); assert(cells.length > 0);
const expectedRects = cells.map(cell => [cell.x - walk.cellSize / 2, cell.y - walk.cellSize / 2, walk.cellSize, walk.cellSize]);
function painter() {
  const recorded = canvasRecorder(); let flashes = 0;
  const renderer = Object.assign(Object.create(Renderer.prototype, { zoom: { value: 1 } }), { ctx: recorded.ctx, canvas: { width: 640, height: 480 }, cam: { x: 0, y: 0 }, drawFlash() { flashes++; } }) as {
    drawTerrainFlash(f: World['flashes'][number], world: World): void; drawZones(world: World): void;
  };
  return { recorded, renderer, flashes: () => flashes };
}
// Minimal render views hold the actual MassWalk and native paint records.
const view = { walk, player: host.player, actors: [], zones: [], time: host.time } as unknown as World;
const flash = { pos, radius, color: '#aabbcc', life: .2, maxLife: .35, onGround: ['cistern_water'], recoveryCueTier: host.player.tier ?? 0 };
check('seamless grounded flashes clip to exact eligible cell rectangles', () => {
  const p = painter(); p.renderer.drawTerrainFlash(flash, view);
  assert.equal(p.flashes(), 1); assert.deepEqual(p.recorded.clips, [expectedRects]); p.recorded.balanced();
});
check('wrong-tier flashes are absent and dry ground yields an empty clip', () => {
  const p = painter(); p.renderer.drawTerrainFlash({ ...flash, recoveryCueTier: (host.player.tier ?? 0) + 1 }, view);
  assert.equal(p.flashes(), 0); assert.deepEqual(p.recorded.clips, []);
  p.renderer.drawTerrainFlash({ ...flash, onGround: ['proof_dry'] }, view);
  assert.equal(p.flashes(), 1); assert.deepEqual(p.recorded.clips, [[]]); p.recorded.balanced();
});
check('seamless lingering field motifs use the same ground clipping', () => {
  const paint = { ...skillFieldVisual(zone, host.time), pos, radius, tier: host.player.tier ?? 0, exploded: true };
  const p = painter(); p.renderer.drawZones({ ...view, remoteSkillFields: [paint] } as World);
  assert(p.recorded.clips.some(clip => JSON.stringify(clip) === JSON.stringify(expectedRects)));
  assert(p.recorded.rotations.includes(zone.facing)); p.recorded.balanced();
  const dry = painter(); dry.renderer.drawZones({ ...view, remoteSkillFields: [{ ...paint, onGround: ['proof_dry'] }] } as World);
  assert(dry.recorded.clips.some(clip => clip.length === 0));
  assert(!dry.recorded.clips.some(clip => clip.length === expectedRects.length)); dry.recorded.balanced();
  const otherTier = painter(); otherTier.renderer.drawZones({ ...view, remoteSkillFields: [{ ...paint, tier: paint.tier + 1 }] } as World);
  assert(!otherTier.recorded.rotations.includes(zone.facing), 'grounded motif must not paint on another tier'); otherTier.recorded.balanced();
});
console.log(JSON.stringify({ groups: checks.length, eligibleMassCells: cells.length, checks, scope: 'Actual native field serialization and renderer calls; canvas paths, not screenshot or combat coverage.' }));
