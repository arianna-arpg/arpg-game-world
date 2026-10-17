import assert from 'node:assert/strict';
import { makeSimWorld } from '../src/sim/arena';
import { seedGlobalRandom } from '../src/sim/rng';
import { pressingDoor, validateDoorPress } from '../src/engine/doorPress';
import { serializeCharacter } from '../src/meta/character';
import { massAdventure } from '../src/worldmass/preset';
import { WorldMassRuntime } from '../src/worldmass/runtime';

const restore=seedGlobalRandom(89121), dt=1/60;
const policy={source:'probe/contact',alignment:.65,reach:4};
const body={pos:{x:0,y:0},radius:12}, slab={pos:{x:0,y:35},radius:24};
assert.ok(pressingDoor(policy,{x:0,y:1},body,slab));
for(const motion of [{x:0,y:-1},{x:1,y:0},{x:0,y:0}])
  assert.ok(!pressingDoor(policy,motion,body,slab));
assert.ok(!pressingDoor(undefined,{x:0,y:1},body,slab));
assert.ok(!pressingDoor(policy,{x:0,y:1},body,{...slab,pos:{x:0,y:90}}));
assert.throws(()=>validateDoorPress({...policy,reach:100}));
assert.throws(()=>validateDoorPress({...policy,alignment:NaN}));
console.log('PASS door intent requires configured reach and deliberate approach');

function setup(legacy=false) {
  const w=makeSimWorld('warrior',89121);
  const spec=JSON.parse(JSON.stringify(massAdventure()));
  if(legacy)delete spec.settlement.doorPress;
  const mass=new WorldMassRuntime(89121,'door-test',spec);mass.attach(w);
  const d=w.doodads.find(d=>d.door?.id.startsWith('waking_house#'))!;
  assert.ok(d?.door && !d.door.open);
  return {w,d,mass};
}
function walk(r:ReturnType<typeof setup>, frames:number, combat=false) {
  const {w,d}=r, target={x:d.pos.x,y:d.pos.y+100};
  for(let i=0;i<frames;i++) {
    const p=w.player.pos;
    w.applyInputs(new Map([[w.localSeat!.id,{dx:target.x-p.x,dy:target.y-p.y,aim:target,
      held:combat?[true]:[],edge:[]}]]),dt);
    w.update(dt);
  }
}
const active=setup();walk(active,240);
assert.ok(active.d.door!.open,'continuous native walking opens opted-in slab');
assert.ok(active.w.player.pos.y>active.d.pos.y+30,'same held movement walks through the repainted threshold');
assert.ok(active.mass.walk.isWalkable(active.d.pos.x,active.d.pos.y));
assert.equal(active.w.player.invulnerable,false);
const saved=serializeCharacter(active.w), checkpoint=saved.world!.worldmass!;
const continued=makeSimWorld('warrior',89122);continued.adoptWorldState(saved.world);continued.startWorldMass(89121,checkpoint);
assert.ok(continued.doodads.find(d=>d.door?.id===active.d.door!.id)?.door?.open);
console.log('PASS native continuous walking opens and crosses the slab; state survives Continue');

const old=setup(true);walk(old,240);assert.ok(!old.d.door!.open);
for(let i=0;i<90;i++){old.w.applyInputs(new Map(),dt);old.w.update(dt);}
assert.ok(old.d.door!.open,'legacy idle dwell remains available');
console.log('PASS absent policy keeps prior walking behavior and native idle opening');

for(const mode of ['sealed','switched','pull','breakable'] as const) {
  const r=setup();r.d.door!.mode=mode;walk(r,180);
  assert.ok(!r.d.door!.open,mode+' must never open from walking');
}
const attacking=setup();walk(attacking,180,true);assert.ok(!attacking.d.door!.open);
const interrupted=setup();interrupted.w.player.useLock=20;walk(interrupted,180);
assert.ok(!interrupted.d.door!.open);
const above=setup();above.w.player.tier=1;walk(above,180);assert.ok(!above.d.door!.open);
console.log('PASS sealed/switched/pull/breakable, combat, action lock and wrong story refuse walking');

const stale=setup();
stale.w.player.pos={x:stale.d.pos.x,y:stale.d.pos.y-24};
const p=stale.w.player.pos;
stale.w.applyInputs(new Map([[stale.w.localSeat!.id,{dx:0,dy:1,aim:p,held:[],edge:[]}]]),dt);
stale.w.update(dt);
assert.ok(stale.w.doorDwellView(),'the single input actually begins contact');
for(let i=0;i<90;i++){stale.w.localSeat!.lastActedAt=stale.w.time;stale.w.update(dt);}
assert.ok(!stale.d.door!.open,'one captured input cannot become persistent approach');
console.log('PASS motion intent is consumed once and cannot survive absent input');
restore();
