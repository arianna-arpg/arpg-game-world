import assert from 'node:assert/strict';
import fs from 'node:fs';
import {actualVendetta} from './nativeVendettaLifetimeFixture';
const results=['getterThrows','bodyThrows','ownApply','argumentSettles'].map(mode=>actualVendetta(s=>{
 const first=s.ignite(),theater=s.area.assembly.input.theater,original=theater.spawnEventActor,descriptor=Object.getOwnPropertyDescriptor(theater,'spawnEventActor'),before=new Set(s.area.combat.scene.actors),sentinel={mode};
 const wants=s.vf.wantsAmbush;let gets=0,calls=0,applyReads=0,argumentReads=0,receiver=false,error:unknown;
 s.vf.wantsAmbush=function(...args:Parameters<typeof wants>){const spec=Reflect.apply(wants,this,args);if(spec&&mode==='argumentSettles'){const faction=spec.faction;Object.defineProperty(spec,'faction',{configurable:true,get(){argumentReads++;s.vf.settleWrit(first.id);return faction;}});}return spec;};
 Object.defineProperty(theater,'spawnEventActor',{configurable:true,get(){gets++;if(mode==='getterThrows'){s.vf.settleWrit(first.id);throw sentinel;}const selected=function(this:typeof theater,...args:Parameters<typeof original>){calls++;receiver=this===theater;const body=Reflect.apply(original,this,args);s.vf.settleWrit(first.id);if(mode==='bodyThrows')throw sentinel;return body;};Object.defineProperty(selected,'apply',{get(){applyReads++;s.vf.settleWrit(first.id);return Function.prototype.apply;}});return selected;}});
 try{for(let i=0;i<100&&!error;i++)try{s.live();}catch(e){error=e;}}finally{s.vf.wantsAmbush=wants;if(descriptor)Object.defineProperty(theater,'spawnEventActor',descriptor);else Reflect.deleteProperty(theater,'spawnEventActor');}
 const added=s.area.combat.scene.actors.filter(b=>!before.has(b));assert.equal(gets,1);assert(error);assert(!s.vf.writsView().some(r=>r.id===first.id));assert(s.marker.has(s.a));assert.deepEqual(s.drivers,[]);assert.equal(applyReads,0);
 if(mode==='getterThrows'||mode==='argumentSettles'){assert.equal(calls,0);assert.equal(added.length,0);}else{assert.equal(calls,1);assert.equal(added.length,1);assert.equal(receiver,true);assert.equal(added[0].tag,'vendetta_hunter');}
 if(mode==='getterThrows'||mode==='bodyThrows')assert.equal(error,sentinel);if(mode==='argumentSettles')assert.equal(argumentReads,1);
 const row={mode,gets,calls,applyReads,argumentReads,receiver,added:added.length,exactError:error===sentinel,completedMarker:s.marker.has(s.a),worldDrivers:s.drivers};s.n.coordinator.retire();return row;
}));
fs.writeFileSync(new URL('../../VENDETTA-SPAWNER-BOUNDARIES.json',import.meta.url),JSON.stringify(results,null,2));console.log(JSON.stringify(results));
