import assert from 'node:assert/strict';
import { makeSimWorld } from '../src/sim/arena';
import { seedGlobalRandom } from '../src/sim/rng';
import { settlementDefenses } from '../src/worldmass/settlementDefenses';
import { LASTLIGHT_DEFENSES, SETTLEMENT_WATCH } from '../src/data/settlementDefenses';
import { TOWN_TIERS } from '../src/data/townBuild';
import { updateAI } from '../src/engine/ai';
import { mod } from '../src/engine/stats';
import { makeSkillInstance } from '../src/engine/skills';
import { SKILLS } from '../src/data/skills';
import { serializeCharacter } from '../src/meta/character';
import { massAdventure } from '../src/worldmass/preset';
import { WorldMassRuntime } from '../src/worldmass/runtime';
import { canonical } from '../src/worldmass/random';
import { generateLayout } from '../src/engine/levelgen';
import { Rng } from '../src/core/rng';
const restore = seedGlobalRandom(99173);
for (const tier of TOWN_TIERS) {
  const fake = {zone: {size: tier}, grid: {cellSize: 30}, foundationRegion: () => 'ground'};
  const plan = settlementDefenses(fake, LASTLIGHT_DEFENSES);
  assert.equal(plan.gates.length, 4);
  for (const gate of plan.gates) for (const d of plan.pieces.filter(d => d.kind === 'rail_fence'))
    assert.ok(Math.hypot(gate.pos.x-d.pos.x, gate.pos.y-d.pos.y) > d.radius + 65);
  assert.equal(canonical(plan), canonical(settlementDefenses(fake, LASTLIGHT_DEFENSES)));
}
const w = makeSimWorld('warrior', 99173); w.startWorldMass(42);
const town = w.massRuntime!.settlement!, guards = town.defenders;
assert.equal(guards.length, 8); assert.ok(guards.every(a => !a.passive && !a.invulnerable && !a.owner && town.isResident(a)));
assert.ok(w.doodads.some(d=>d.kind==='water'),'native Lastlight brook is real water');
const plan = settlementDefenses(town, town.spec.defenses!);
for (const gate of plan.gates) {
  const n = gate.normal, a = {x: gate.pos.x-n.x*34, y: gate.pos.y-n.y*34}, b = {x: gate.pos.x+n.x*34, y: gate.pos.y+n.y*34};
  const landed = w.clampPos(b, 15, a);
  assert.ok(Math.hypot(landed.x-b.x, landed.y-b.y)<1, 'real movement crosses '+gate.edge+' gate');
}
const fence = w.doodads.find(d => d.kind === 'rail_fence' && d.pos.y === -LASTLIGHT_DEFENSES.offset && d.pos.x > 100)!;
const originalPos = {...w.player.pos};
w.player.pos = {x: fence.pos.x, y: fence.pos.y-36};
for (let i=0;i<60;i++) w.moveActor(w.player,0,1,1/60);
assert.ok(w.player.pos.y < fence.pos.y, 'visible fence blocks actual native movement');
w.player.pos = originalPos;
console.log('PASS four road gates stay open, real fences block the perimeter and the brook remains water');
const guard = guards[0], foe = w.createMonster('skeleton_warrior', 1, 'enemy');
foe.pos = {x: guard.pos.x+25, y: guard.pos.y}; foe.aiAnchor = {...foe.pos}; w.actors.push(foe);
guard.sheet.setSource('qa', [mod('evasion','override',0),mod('blockChance','override',0),mod('lifeRegen','override',0)]);
foe.sheet.setSource('qa', [mod('accuracy','override',100000)]);
assert.ok(w.hostileTo(guard,foe) && w.hostileTo(foe,guard));
assert.equal(w.sanctuaryRetreat(foe), undefined); assert.equal(foe.aiTargetId,guard.id);
const life = guard.life;
w.challengeHit(foe, makeSkillInstance(SKILLS.heavy_strike,1), guard, 1);
assert.ok(guard.life < life, 'defenders take real damage');
w.player.pos={x:guard.pos.x,y:120};w.player.tier=0;
const xp = w.meta.xp, kills = w.kills, drops = w.drops.length;
for(let i=0;i<600&&!foe.dead;i++){for(const a of w.actors)updateAI(a,w,1/60);w.update(1/60);}
assert.ok(foe.dead, 'native guard AI kills an approaching monster');
assert.equal(w.meta.xp,xp); assert.equal(w.kills,kills); assert.equal(w.drops.length,drops);
console.log('PASS native watch combat takes damage and defeats intruders without player farming');
const anchor = {...guard.aiAnchor!}; guard.pos = {x: anchor.x+SETTLEMENT_WATCH.leash+100, y: anchor.y};
const distance = Math.hypot(guard.pos.x-anchor.x,guard.pos.y-anchor.y);
updateAI(guard,w,.1);
assert.equal(guard.aiPhase,'leash_home');
for(let i=0;i<120;i++){updateAI(guard,w,1/60);w.update(1/60);}
assert.ok(Math.hypot(guard.pos.x-anchor.x,guard.pos.y-anchor.y)<distance, 'guard walks home');
guard.pos={...anchor};
const intruder=w.createMonster('skeleton_warrior',1,'enemy');intruder.pos={...w.player.pos};w.actors.push(intruder);
assert.ok(w.sanctuaryBlocksCombat(intruder,w.player));
const proxy=w.createMonster('lastlight_watchman',12,'player');proxy.owner=w.player;proxy.pos={...intruder.pos};
assert.ok(w.sanctuaryBlocksCombat(proxy,intruder));
w.kill(guards[1],true,intruder);guard.life=guard.maxLife()*.4;
const saved=serializeCharacter(w), next=makeSimWorld('warrior',119);
assert.ok(next.adoptWorldState(saved.world)); next.startWorldMass(42,saved.world!.worldmass!);
const resumed=next.massRuntime!.settlement!;
assert.equal(resumed.defenders.length,8);assert.ok(resumed.defenders[1].dead);
assert.equal(resumed.defenders[0].life,guard.life);assert.deepEqual(resumed.defenders[0].aiAnchor,anchor);
assert.equal(next.doodads.filter(d=>d.kind==='rail_fence').length,w.doodads.filter(d=>d.kind==='rail_fence').length);
console.log('PASS guard posts, wounds, casualties and fences survive Continue without duplication');
const legacy=JSON.parse(canonical(massAdventure())) as ReturnType<typeof massAdventure>;delete legacy.settlement!.defenses;
const old=makeSimWorld('warrior',120);new WorldMassRuntime(42,'old-watch-control',legacy).attach(old);
assert.equal(old.massRuntime!.settlement!.defenders.length,0);
console.log('PASS older descriptors retain their original unfortified layout');
for(const g of resumed.defenders)g.dead=true;
const retreating=next.createMonster('skeleton_warrior',1,'enemy');retreating.pos={x:400,y:400};retreating.aiAnchor={...retreating.pos};
const goal=next.sanctuaryRetreat(retreating)!;
assert.ok(resumed.defenseGates.some(g=>Math.hypot(goal.x-g.pos.x,goal.y-g.pos.y)>=48
  && Math.abs((goal.x-g.pos.x)*g.normal.y-(goal.y-g.pos.y)*g.normal.x)<1e-8));
assert.ok(!resumed.contains(goal.x,goal.y));
console.log('PASS an undefended intruder retreats through a physical gateway');
const kitWorld=makeSimWorld('warrior',98);
for(const id of ['watch_rampart','watch_gatehouse']) {
  const zone={...kitWorld.zone,size:{w:1200,h:1000},fixtures:[{structure:id,x:600,y:500}]};
  const layout=generateLayout(zone,zone.size,new Rng(21),{x:300,y:500},[]);
  const placed=layout.structures!.find(s=>s.defId===id)!;
  assert.ok(placed,'native fixture places '+id);
  const wall={x:placed.rect.x+15,y:placed.rect.y+15};
  assert.equal(layout.walk!.regionAt!(wall.x,wall.y),'rampart');
  assert.equal(layout.walk!.isWalkable(wall.x,wall.y),false,'masonry is a physical barrier');
  if(id==='watch_gatehouse') {
    assert.equal(placed.slots.length,4,'four real garrison seats');
    assert.equal(placed.doors.length,1,'wide gate is one native door');
    const door=placed.doors[0].door;
    assert.equal(door.mode,'both');assert.equal(door.life,900);assert.ok(door.cells);assert.equal(door.cells.w,150);
    assert.ok(layout.doodads.some(d=>d.kind==='door'&&d.door===door));
  }
}
console.log('PASS reusable ramparts and gatehouse produce physical walls, garrison seats and a live gate');
restore();
