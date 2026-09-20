import { bootSimEngine, makeSimWorld } from '../src/sim/arena';
import { TitanField } from '../src/packages/overlays/titans';
import { TITAN_TUNING } from '../src/data/titans';
import { WORLDBOSS_SURGE } from '../src/packages/defs/worldboss';
import { titanGap, titanRoute, titanScarAdmitted } from '../src/engine/titans';
import { GridWalkField } from '../src/world/gridWalk';
import { blocksMovement } from '../src/engine/levelgen';
import { serializeSnapshot, serializeZone, applySnapshot } from '../src/net/snapshot';
import type { OverlayView } from '../src/world/overlay';
import type { ZoneDef } from '../src/data/zones';
import type { PackageGate } from '../src/packages/types';
import { Rng } from '../src/core/rng';
import { killRules } from '../src/engine/killHandlers';
import { vec } from '../src/core/math';

let fails = 0, assertions = 0;
function check(name: string, pass: boolean) {
  assertions++; if (!pass) fails++;
  console.log(`${pass ? 'PASS' : 'FAIL'} ${name}`);
}
bootSimEngine();
const gate: PackageGate = { active: true, share: 1, pressure: 1, ignitionMul: 1, severityMul: 1, concurrencyMul: 1 };
const tuning = structuredClone(TITAN_TUNING);
const field = () => new TitanField({ seed: 731, biomeSeed: 731, gate: () => gate }, tuning);
const nodes = Array.from({ length: 10 }, (_, i) => ({
  id: `t${i}`, name: `Ground ${i}`, map: { x: i * 86, y: 0 }, level: 20, biome: 'field',
  veiled: i > 1, objective: { kind: 'hunt' },
  exits: [i - 1, i + 1].filter(n => n >= 0 && n < 10).map(n => ({ to: `t${n}`, side: n > i ? 'e' : 'w' })),
} as unknown as ZoneDef));
const view: OverlayView = { nodes, allNodes: nodes, byId: Object.fromEntries(nodes.map(n => [n.id, n])),
  terrain: () => 'land', currentZoneId: 't0', time: 0, census: {}, charLevel: 30,
  gates: new Map(), visited: new Set(['t0']), surveyed: new Set() };
const f = field();
const j = f.ignite(view, new Rng(83), 'vhorun')!;
check('Vhorun moved to Titans; six world bosses remain', !WORLDBOSS_SURGE.defs.some(d => d.id === 'vhorun') && WORLDBOSS_SURGE.defs.length === 6);
check('three distinct Titan definitions ship', tuning.defs.length >= 3 && new Set(tuning.defs.map(d => d.wake[0].kind)).size === 3);
check('unannounced birth can occur beyond charted terrain', !!j && view.byId[j.path[0]].veiled === true);
check('journey follows reciprocal real roads', j.path.every((id, i) => !i || view.byId[id].exits.some(e => e.to === j.path[i - 1])));
check('undiscovered wake paints no map information', f.renderMap(nodes).under === '');
j.head = 3.4; j.tail = 1.7;
const known = nodes.map(n => ({ ...n, veiled: false }));
f.discover(j.id, j.path[0]);
check('one discovery does not reveal the next road', !f.renderMap(known).under.includes('<path'));
f.discover(j.id, j.path[1]);
check('discovered scars draw a continuous map trail', f.renderMap(known).under.includes('<path'));
const restored = field(); restored.restore(JSON.parse(JSON.stringify(f.snapshot())));
check('save round trip preserves route, wounds and discovery', JSON.stringify(restored.snapshot()) === JSON.stringify(f.snapshot()));
f.update(12, view); restored.update(12, view);
check('resume advances identically to uninterrupted journey', JSON.stringify(restored.snapshot()) === JSON.stringify(f.snapshot()));
const before = j.head; f.engage(j.id, true); f.update(4, view);
check('engaged head waits for its fight', j.head === before);
f.engage(j.id, false); gate.active = false; f.update(4, view);
check('birth gate does not abandon an existing hunt', j.head > before);
gate.active = true;
for (let n = 0; n < 100; n++) f.update(10, view);
check('resting Titan withdraws its travelling body; the head remains huntable', Math.abs(j.tail - j.head) < 0.001);
restored.restore({ journeys: [null, { id: 'bad', defId: 'missing' }] });
check('malformed and unknown restored Titans are refused', restored.journeys.length === 0);
check('route crosses interior between actual endpoints', titanRoute(vec(0, 1000), vec(2800, 1000), vec(1400, 1000), 0.5).x === 1400);
check('crossing width accounts for the entire solid rim', titanGap(0.32 + 0.09, 2000, [0.32], 250, 82));
const corridor = new GridWalkField(1200, 300);
corridor.fillRect(0, 90, 1200, 210, true);
check('a scar cannot seal the sole traversable corridor', !titanScarAdmitted(corridor, corridor,
  vec(600, 150), 100, [vec(60, 150), vec(1140, 150)]));
const open = new GridWalkField(1200, 800); open.fillRect(0, 0, 1200, 800, true);
check('open terrain admits a scar that forces a detour', !!titanScarAdmitted(open, open,
  vec(600, 400), 180, [vec(60, 400), vec(1140, 400)]));

const w = makeSimWorld('warrior', 731);
w.doodads = []; w.actors = [w.player]; w.exits = [];
w.arena.w = 2800; w.arena.h = 2000;
w.player.pos = vec(100, 100); w.player.invulnerable = true;
const wf = w.titans.field()!;
const fixture = (id: string, head = 3.6, tail = 3.25) => {
  wf.journeys.length = 0;
  wf.journeys.push({ id: `titan:qa:${id}`, defId: id, path: ['a', w.zone.id, 'b', 'c'], head, tail, life: 1, seen: [] });
  w.titans.update(0.25); w.time += 3; w.titans.update(0.25);
};
fixture('vhorun');
const scars = w.doodads.filter(d => d.kind === 'titan_rift');
check('revisited ground reconstructs actual impassable crevasses', scars.length >= 2 && scars.every(blocksMovement));
check('crevasses participate in the native pit system', w.zonePits().some(p => p.kind === 'titan_rift'));
const rock = { kind: 'rock', pos: vec(100, 1800), radius: 20 };
w.doodads.push(rock);
wf.slay(wf.journeys[0].id); w.titans.update(0.25);
check('slaying removes only this system’s terrain', !w.doodads.some(d => d.kind.startsWith('titan_')) && w.doodads.includes(rock));
fixture('vhorun', 2.4, 0.7);
const body = w.doodads.filter(d => d.kind === 'titan_sunder_body');
check('passing body spans the zone as solid creature mass', body.length > 8 && body.every(blocksMovement));
check('body is separate from a lattice around a portal', !w.doodads.some(d => d.kind === 'wyrm_coil'));
const bodyWire = serializeSnapshot(w, 1);
check('live body rides repeated co-op snapshots', (bodyWire.titans?.length ?? 0) >= body.length);
check('runtime body is absent from static zone payload', !serializeZone(w).doodads.some(d => d.kind.startsWith('titan_')));
const client = makeSimWorld('warrior', 732);
applySnapshot(client, bodyWire);
check('client receives the same solid body', client.titans.scene()?.length === bodyWire.titans?.length);
applySnapshot(client, { ...bodyWire, titans: undefined });
check('missed cleanup self-heals on the next empty snapshot', !client.titans.scene());

fixture('cindergait');
const fires = w.doodads.filter(d => d.kind === 'titan_fire');
check('fire wake crosses the zone with attributed damage', fires.length > 8 && fires.every(d => d.contactSource?.name.includes('Cindergait')));
const a = w.createMonster('primeval_spawn', 1, 'enemy');
a.pos = { ...fires[Math.floor(fires.length / 2)].pos }; w.actors.push(a);
a.life = a.maxLife(); const life = a.life;
const hazards = w as unknown as { updateTracks(dt: number): void };
hazards.updateTracks(0.2);
const firstHit = life - a.life;
check('wake damages ordinary creatures as well as heroes', firstHit > 0);
hazards.updateTracks(0.2);
check('overlapping trail discs cannot multiply damage during grace', a.life === life - firstHit);
w.collectContactHazards(); hazards.updateTracks(0.2);
check('reconciling a wake preserves damage grace', a.life === life - firstHit);
fixture('istral');
check('winter combines solid ice and storm hazards', w.doodads.some(d => d.kind === 'titan_ice' && blocksMovement(d)) && w.doodads.some(d => d.kind === 'titan_storm'));
const storm = w.doodads.find(d => d.kind === 'titan_storm')!, oldPos = { ...storm.pos };
w.time += 1; w.titans.update(0.25);
check('storms actually wander through the scar', storm.pos.x !== oldPos.x || storm.pos.y !== oldPos.y);

// Initial terrain warning must not entomb an occupant when it resolves.
wf.journeys.length = 0; w.titans.update(0.25);
fixture('vhorun');
const target = w.doodads.find(d => d.kind === 'titan_rift')!;
const at = { ...target.pos };
wf.journeys.length = 0; w.titans.update(0.25); w.player.pos = at;
fixture('vhorun');
check('a new solid scar waits while the player occupies it', !w.doodads.some(d => blocksMovement(d) && Math.hypot(d.pos.x - at.x, d.pos.y - at.y) < d.radius + w.player.radius));

fixture('cindergait', 1.6, 1.3);
const head = w.actors.find(a => a.tag === 'titan_head')!;
check('head is an actual targetable boss', !!head && !head.untargetable);
head.life = head.maxLife() * 0.4;
w.titans.update(0.25);
check('head wounds persist in world state', Math.abs(wf.journeys[0].life - 0.4) < 1e-6);
check('Titan death handler is registered once', killRules().filter(r => r.id === 'titans_slain').length === 1);
w.kill(head, false, w.player); w.titans.update(0.25);
check('real head death clears journey and all local effects', wf.journeys.length === 0 && !w.titans.scene());
check('Titan kill records its own progression', w.ledger.titans_slain === 1 && w.ledger.titans_slain_cindergait === 1);
console.log(`Titans: ${assertions - fails}/${assertions} passed`);
process.exitCode = fails ? 1 : 0;
