import assert from 'node:assert/strict';
import {makeSimWorld} from '../src/sim/arena';
import {seedGlobalRandom} from '../src/sim/rng';
import {STRUCTURES} from '../src/data/structures';
import {nativeStructurePlan,validateStructurePlans,structurePlanOf} from '../src/engine/structurePlans';
import {massAdventure,type MassAdventure} from '../src/worldmass/preset';
import {WorldMassRuntime} from '../src/worldmass/runtime';
import {serializeCharacter,applySavedCharacter} from '../src/meta/character';
import {canonical} from '../src/worldmass/random';

const original=canonical([STRUCTURES.inn,STRUCTURES.waking_house]);
const config=()=>{const c=structuredClone(massAdventure()) as MassAdventure;delete c.bounties;delete c.journey!.reservePopulation;delete c.rewards!.earnFrom;return c;};
const fresh=(id='magician',legacy=false,seed=42)=>{
 const w=makeSimWorld(id,seed),c=config();if(legacy)delete c.settlement!.structurePlans;
 new WorldMassRuntime(seed,'broad-door-'+seed,c).attach(w);return w;
};
const door=(w:ReturnType<typeof fresh>,prefix:string)=>w.doodads.find(d=>d.door?.id.startsWith(prefix+'#')&&(d.tier??0)===0)!;
const walk=(w:ReturnType<typeof fresh>,dx:number,dy:number,n:number)=>{
 for(let i=0;i<n;i++){w.applyInputs(new Map([[w.localSeat.id,{dx,dy,aim:w.player.pos,held:[],edge:[]}]]),1/60);w.update(1/60);}
};
const resume=(w:ReturnType<typeof fresh>)=>{
 const s=serializeCharacter(w),r=makeSimWorld('magician',43);assert.ok(applySavedCharacter(r,s));assert.ok(r.adoptWorldState(s.world));
 r.startWorldMass(s.world!.worldmass!.state.run.seed,s.world!.worldmass);return r;
};
const restore=seedGlobalRandom(97042);
try{
 const v=nativeStructurePlan('inn','qa/broad',{7:'####W#DD#W####'});
 assert.equal(v.rows.length,STRUCTURES.inn.plan!.length);assert.equal(v.rows[7],'####W#DD#W####');
 assert.equal(structurePlanOf(STRUCTURES.inn,{inn:v}).id,'inn');
 assert.equal(structurePlanOf(STRUCTURES.inn,undefined),STRUCTURES.inn);
 const invalid: NonNullable<Parameters<typeof validateStructurePlans>[0]>[] = [{inn:{...v,source:''}},{inn:{...v,rows:v.rows.slice(1)}},{unknown:v},
   {inn:{...v,rows:v.rows.map((r,i)=>i===7?r+'#':r)}},
   {inn:{...v,rows:v.rows.map((r,i)=>i===7?'?'.repeat(r.length):r)}}];
 for(const bad of invalid)assert.throws(()=>validateStructurePlans(bad),/structure plan/);
 assert.throws(()=>nativeStructurePlan('inn','qa',{'-1':'bad'}),/structure plan/);
 assert.equal(canonical([STRUCTURES.inn,STRUCTURES.waking_house]),original);
 console.log('PASS native attributed plan snapshots keep footprint, legend and identity; malformed/unknown/oversized rows refuse without mutating shared data');

 for(const id of ['warrior','magician','rogue'])for(const offset of [-18,18]){
  const w=fresh(id),d=door(w,'inn');assert.equal(d.door!.cells!.w,60);
  w.landPartyAt({x:d.pos.x+offset,y:d.pos.y+78});walk(w,0,-1,120);
  assert.ok(d.door!.open,id+' offset '+offset+' opens');assert.ok(w.player.pos.y<d.pos.y-25,id+' crosses');
  assert.equal(w.player.invulnerable,false);
 }
 const normal=fresh(),entry=door(normal,'waking_house');
 const target={x:entry.pos.x,y:entry.pos.y+100};
 for(let i=0;i<240;i++){const p=normal.player.pos;walk(normal,target.x-p.x,target.y-p.y,1);}
 assert.ok(entry.door!.open);assert.ok(normal.player.pos.y>entry.pos.y+30);
 assert.equal(normal.account.ledger.waking_door_unlatched,1,'the original native teaching latch still graduates');
 console.log('PASS six real held approaches across three native classes open and cross broad inn doors; waking spawn walks out through its original teaching latch');

 const w=fresh(),d=door(w,'inn');w.landPartyAt({x:d.pos.x+18,y:d.pos.y+78});walk(w,0,-1,120);
 const s=serializeCharacter(w),saved=s.world!.worldmass!;assert.equal(saved.schema,6);
 const r=resume(w),rd=door(r,'inn');assert.deepEqual(rd.door!.cells,d.door!.cells);assert.ok(rd.door!.open);
 assert.deepEqual(r.player.pos,w.player.pos);assert.equal(r.player.life,w.player.life);
 assert.equal(canonical(r.massRuntime!.config.settlement!.structurePlans),canonical(w.massRuntime!.config.settlement!.structurePlans));
 assert.equal(canonical(r.massRuntime!.settlement!.zone.structurePlans),canonical(w.massRuntime!.settlement!.zone.structurePlans));
 assert.deepEqual(r.actors.filter(a=>a.defId==='townsfolk_innkeep').map(a=>a.pos),w.actors.filter(a=>a.defId==='townsfolk_innkeep').map(a=>a.pos));
 assert.throws(()=>new WorldMassRuntime(42,'old-client',saved.config,{...saved,schema:5}),/checkpoint/);
 const missing=structuredClone(saved);missing.settlement!.zone=undefined as never;
 assert.throws(()=>new WorldMassRuntime(42,'missing',missing.config,missing),/checkpoint/);
 const mixed=structuredClone(saved);delete mixed.settlement!.zone.structurePlans;
 assert.throws(()=>new WorldMassRuntime(42,'mixed',mixed.config,mixed),/checkpoint/);
 console.log('PASS exact position/life, expanded slab, native services and open-state Continue; downgrade and mismatched settlement layouts refuse before attach');

 for(const offset of [-18,18]){
  const old=fresh('magician',true),od=door(old,'inn');assert.equal(od.door!.cells!.w,30);
  old.landPartyAt({x:od.pos.x+offset,y:od.pos.y+78});walk(old,0,-1,120);
  assert.ok(old.player.pos.y>od.pos.y,'the same old off-center approach remains blocked');
  const continued=resume(old);assert.equal(door(continued,'inn').door!.cells!.w,30);
  assert.equal(continued.massRuntime!.snapshot(continued).schema,5);
 }
 const zones=makeSimWorld('magician',49);zones.loadZone('lastlight');
 assert.equal(zones.zone.structurePlans,undefined);assert.equal(door(zones,'inn').door!.cells!.w,30);
 assert.equal(canonical([STRUCTURES.inn,STRUCTURES.waking_house]),original);
 console.log('PASS omitted legacy plan and ordinary zones retain their original doorway geometry; new expedition choices cannot leak into shared definitions');
}finally{restore();}
