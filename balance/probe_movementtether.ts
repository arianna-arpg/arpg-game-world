import { bootSimEngine, makeSimWorld } from '../src/sim/arena';
import { updateAI } from '../src/engine/ai';
import { MONSTERS, FACTIONS } from '../src/data/monsters';
import { TETHERED_MONSTERS } from '../src/data/tetheredMonsters';
import { SKILLS } from '../src/data/skills';
import { bindMovementTether, ensureMovementTether, refreshMovementTether, movementTetherDistance,
  updateMovementTethers, savedMovementTether, restoreMovementTether, movementTetherErrors } from '../src/engine/movementTether';
import { serializeSnapshot, applySnapshot } from '../src/net/snapshot';
import { vec } from '../src/core/math';
import { START_ZONE } from '../src/data/zones';
import { seedGlobalRandom } from '../src/sim/rng';

let failed = 0;
function check(name: string, ok: boolean): void {
  console.log(`${ok ? 'PASS' : 'FAIL'} ${name}`); if (!ok) failed++;
}
bootSimEngine();
const restoreRandom = seedGlobalRandom(0x7e7e);
const w = makeSimWorld('warrior', 0x7e7e);
w.player.pos = vec(1300, 1000);
const spawn = (id = 'rootlash_snapper') => {
  const a = w.createMonster(id, 6, 'enemy'); a.pos = vec(500, 500); w.actors.push(a); return a;
};
for (const def of Object.values(TETHERED_MONSTERS)) {
  check(`${def.id}: valid tether`, !movementTetherErrors(def.movementTether!).length);
  check(`${def.id}: discoverable faction spawn`, FACTIONS[def.faction!].table.some(r => r.id === def.id));
  check(`${def.id}: ordinary affordable combat`, def.skills.every(id => !!SKILLS[id]?.ai
    && SKILLS[id].manaCost <= (def.base.mana ?? 0)));
}
const a = spawn();
check('placement precedes anchor initialization', !a.movementTether);
ensureMovementTether(a);
const t = a.movementTether!;
check('anchor is placed spawn, not createMonster origin', t.point.x === 500 && t.point.y === 500);
for (let i = 0; i < 60; i++) w.moveActor(a, 1, 0, 1 / 30);
check('ordinary movement cannot cross hard boundary', movementTetherDistance(t, a.pos) <= t.spec.length + 0.001);
updateMovementTethers(w, 1 / 60);
check('taut boundary triggers recoil', t.returning);
const recoilX = a.pos.x;
updateAI(a, w, 1 / 60); w.moveActor(a, 1, 0, 1 / 60);
check('intent cannot fight mechanical recoil', a.pos.x === recoilX);
for (let i = 0; i < 120; i++) updateMovementTethers(w, 1 / 60);
check('recoil ends at rest band', !t.returning && movementTetherDistance(t, a.pos) <= t.spec.length * t.spec.rest! + 0.01);
const blink = w.clampPos(vec(1300, 500), a.radius, a.pos, { mover: a, disp: { ignoreConfine: true } });
check('wall-phasing teleport still respects cord', movementTetherDistance(t, blink) <= t.spec.length + 0.001);
a.pos = vec(1300, 500); // a direct carry / scripted displacement
updateMovementTethers(w, 0);
check('final sweep catches direct displacement', movementTetherDistance(t, a.pos) <= t.spec.length + 0.001);

// Real host loop and forced impulses, at three update rates.
for (const hz of [20, 60, 120]) {
  a.pos = vec(500, 500); bindMovementTether(a, MONSTERS.rootlash_snapper.movementTether!);
  w.pushActor(a, 0, 900);
  let max = 0;
  for (let i = 0; i < hz; i++) {
    updateAI(a, w, 1 / hz); w.update(1 / hz);
    max = Math.max(max, movementTetherDistance(a.movementTether!, a.pos));
  }
  check(`knockback + live loop stay bounded at ${hz} Hz`, max <= 190.001);
}

// Entity anchors move, release/hold on destruction, and never adopt ownership.
const anchor = spawn('zombie'); anchor.pos = vec(600, 500);
a.pos = vec(650, 500);
bindMovementTether(a, { length: 160, onAnchorLost: 'release' }, anchor);
anchor.pos.x += 30;
refreshMovementTether(a, w);
check('entity anchor follows its actor', a.movementTether!.point.x === 630 && !a.owner);
anchor.dead = true;
refreshMovementTether(a, w);
check('destroyed anchor can release', !!a.movementTether!.released);
ensureMovementTether(a);
check('released innate tether is not silently recreated', !!a.movementTether!.released);
anchor.dead = false;
bindMovementTether(a, { length: 160, onAnchorLost: 'hold' }, anchor);
anchor.dead = true;
refreshMovementTether(a, w);
check('destroyed anchor can freeze its last point', !a.movementTether!.released
  && a.movementTether!.anchorId === undefined && a.movementTether!.point.x === 630);

// The production save helpers copy state; restoring never re-roots at the head.
a.pos = vec(500, 500); bindMovementTether(a, MONSTERS.rootlash_snapper.movementTether!);
a.pos = vec(620, 500);
const saved = savedMovementTether(a)!;
const loaded = restoreMovementTether(JSON.parse(JSON.stringify(saved)))!;
check('save preserves original anchor independent of current head', loaded.point.x === 500 && loaded.safe.x === 500);
saved.point.x = 10;
check('save copies never alias live anchor', a.movementTether!.point.x === 500 && loaded.point.x === 500);
check('malformed save refuses non-finite geometry', !restoreMovementTether({ ...loaded, point: { x: NaN, y: 0 } }));
const snap = serializeSnapshot(w, 1);
const wire = snap.actors.find(r => r.id === a.id)!;
check('co-op carries exact anchor and cord settings', wire.movementTether?.point.x === 500
  && wire.movementTether.spec.length === 190);
const client = makeSimWorld('warrior', 0x7e7f);
applySnapshot(client, snap);
check('co-op reconstructs tether', client.actors.some(r => r.movementTether?.point.x === 500));
wire.movementTether = undefined;
applySnapshot(client, snap);
check('co-op clears a removed tether', !client.actors.find(r => r.name === a.name)?.movementTether);

// A real leave/revisit and durable save/adopt cycle keep both ends distinct.
{
  const visit = makeSimWorld('warrior', 0x7130);
  const source = visit.zone.id;
  const body = visit.createMonster('rootlash_snapper', 4, 'enemy');
  body.pos = vec(500, 500); body.fromZoneGen = true; visit.actors.push(body);
  ensureMovementTether(body); body.pos = vec(610, 500);
  visit.loadZone(START_ZONE);
  const durable = JSON.parse(JSON.stringify(visit.serializeWorldState()));
  visit.loadZone(source);
  const returned = visit.actors.find(r => r.defId === body.defId)!;
  check('zone revisit retains the original root', returned?.movementTether?.point.x === 500 && returned.pos.x === 610);
  const resumed = makeSimWorld('warrior', 0x7131);
  check('durable world adopts', resumed.adoptWorldState(durable));
  resumed.loadZone(source);
  check('durable reload retains the original root', resumed.actors.some(r => r.defId === body.defId
    && r.movementTether?.point.x === 500 && r.pos.x === 610));
}

// Terrain remains authoritative while the cord pulls, including a blocked reel.
{
  const terrain = makeSimWorld('warrior', 0x7140);
  const body = terrain.createMonster('rootlash_snapper', 4, 'enemy');
  body.pos = vec(500, 500); terrain.actors.push(body); ensureMovementTether(body);
  body.pos = vec(680, 500); body.movementTether!.safe = { ...body.pos };
  body.movementTether!.returning = true;
  terrain.doodads.push({ pos: vec(605, 500), radius: 42, kind: 'rock' } as typeof terrain.doodads[number]);
  terrain.markDoodadsChanged();
  let crossedRock = false;
  for (let i = 0; i < 120; i++) {
    updateMovementTethers(terrain, 1 / 60);
    crossedRock ||= body.pos.x < 635;
  }
  check('recoil does not pull through blocking terrain', !crossedRock);
  check('blocked recoil gives combat control back', !body.movementTether!.returning);
}

// The world has already scaled dt: actor scaling must be applied exactly once.
{
  const slow = makeSimWorld('warrior', 0x7150);
  const body = slow.createMonster('rootlash_snapper', 4, 'enemy');
  body.pos = vec(500, 500); slow.actors.push(body);
  bindMovementTether(body, { length: 200, rest: 0.1, returnSpeed: 100 });
  body.pos = vec(700, 500); body.movementTether!.safe = { ...body.pos };
  slow.timeflow.hold({ id: 'probe', scale: 0.5 });
  slow.update(0.2);
  check('world slow motion scales recoil once', Math.abs(body.pos.x - 690) < 0.01);
  slow.timeflow.hold({ id: 'actor-stop', scale: 0, actors: { onlyTeam: 'enemy' } });
  const before = body.pos.x; slow.update(0.2);
  check('actor stasis suspends recoil', body.pos.x === before);
  slow.player.movementTetherSpec = { length: 100 };
  bindMovementTether(slow.player, slow.player.movementTetherSpec);
  slow.landPartyAt(vec(900, 700));
  check('party landing re-roots innate tether in arrival coordinates', slow.player.movementTether!.point.x === 900);
}

// Keep a target inside reach: the ordinary skill pipeline must actually wound it.
for (const id of Object.keys(TETHERED_MONSTERS)) {
  const restoreFightRandom = seedGlobalRandom(0x7100);
  const fight = makeSimWorld('warrior', 0x7100);
  fight.player.pos = vec(600, 500); fight.player.life = fight.player.maxLife();
  const foe = fight.createMonster(id, 1, 'enemy'); foe.pos = vec(520, 500);
  fight.actors.push(foe); foe.aggroed = true;
  const life = fight.player.life;
  let minimumLife = life;
  for (let i = 0; i < 480; i++) {
    updateAI(foe, fight, 1 / 60); fight.update(1 / 60);
    minimumLife = Math.min(minimumLife, fight.player.life);
  }
  check(`${id}: attacks through real combat pipeline`, minimumLife < life);
  if (minimumLife >= life) console.log({ id, pos: foe.pos, target: fight.player.pos,
    facing: foe.facing, casting: foe.casting?.inst.def.id, phase: foe.aiPhase, tether: foe.movementTether });
  restoreFightRandom();
}
restoreRandom();
console.log(failed ? `${failed} FAILED` : 'ALL PASS');
process.exit(failed ? 1 : 0);
