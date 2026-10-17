import assert from 'node:assert/strict';
import fs from 'node:fs';
import {actualVendetta} from './nativeVendettaLifetimeFixture';
const results=['getter','body'].map(mode=>actualVendetta(s=>{
 const first=s.ignite(),theater=s.area.assembly.input.theater,original=theater.spawnEventActor,descriptor=Object.getOwnPropertyDescriptor(theater,'spawnEventActor'),before=new Set(s.area.combat.scene.actors);let gets=0,calls=0,receiver=false,error:unknown;
 Object.defineProperty(theater,'spawnEventActor',{configurable:true,get(){gets++;if(mode==='getter')s.vf.settleWrit(first.id);return function(this:typeof theater,...args:Parameters<typeof original>){calls++;receiver=this===theater;const body=Reflect.apply(original,this,args);if(mode==='body')s.vf.settleWrit(first.id);return body;};}});
 try{for(let i=0;i<100&&!error;i++)try{s.live();}catch(e){error=e;}}finally{if(descriptor)Object.defineProperty(theater,'spawnEventActor',descriptor);else Reflect.deleteProperty(theater,'spawnEventActor');}
 const added=s.area.combat.scene.actors.filter(b=>!before.has(b));assert.equal(gets,1);assert(error);assert(!s.vf.writsView().some(r=>r.id===first.id));assert.deepEqual(s.drivers,[]);const row={mode,gets,calls,receiver,added:added.length,tag:added[0]?.tag,eventKey:added[0]?.eventKey,error:error instanceof Error?error.message:String(error),completedMarker:s.marker.has(s.a),worldDrivers:s.drivers};s.n.coordinator.retire();return row;
}));
fs.writeFileSync(new URL('../../CRITIC-VENDETTA-SELECTED-SPAWNER.json',import.meta.url),JSON.stringify(results,null,2));console.log(JSON.stringify(results));
assert.equal(results[1].calls,1);assert.equal(results[1].added,1);assert.equal(results[0].calls,0,'Selected native spawner getter that ends actual writ must not execute its returned writer');assert.equal(results[0].added,0);
