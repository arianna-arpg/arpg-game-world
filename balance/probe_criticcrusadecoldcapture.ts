import assert from 'node:assert/strict';
import type {CrusadeField as Field} from '../src/packages/overlays/crusade';
const {CrusadeField}=await import('../src/packages/overlays/crusade');
const mode=process.argv[2]??'scope',originalEpoch=CrusadeField.prototype.nativeCrusadeEpoch,originalScope=CrusadeField.prototype.withCrusadeZoneKill,cache=new Map<string,object>();let armed=false,calls=0;
if(mode==='scope')CrusadeField.prototype.withCrusadeZoneKill=function(this:Field,...args:Parameters<Field['withCrusadeZoneKill']>){if(armed){calls++;return args[5]();}return Reflect.apply(originalScope,this,args);};
else if(mode==='epoch')CrusadeField.prototype.nativeCrusadeEpoch=function(this:Field,id:string){const actual=Reflect.apply(originalEpoch,this,[id]);if(actual)cache.set(id,actual);if(armed){calls++;return cache.get(id);}return actual;};
else throw Error('Unknown mode');
const {withSeededRandom}=await import('../src/core/rng'),{nativeCampaignFixture,birthActualNativeArea}=await import('./nativeCombatRetainedFixture'),{refuseWorldCombat}=await import('./probe_nativecombatcycle');
try{withSeededRandom(991,()=>{const input=nativeCampaignFixture(991),w=input.writer;w.loadZone(input.definition.id);refuseWorldCombat([w],drivers=>{
 const n=birthActualNativeArea(input),area=n.ongoing,cf=w.sim.crusadeField!,view=w.devOverlayView();assert(cf.devIgnite(view,input.definition.id,40,'undead'));cf.update(0,view);const first=cf.crusadeOn(input.definition.id);assert(first);area.combat.campaignFrame.tick(1/60);const commander=area.assembly.input.scene.actors.find(a=>a.tag==='crusade_camp'||a.tag==='crusade_fortress');assert(commander);
 if(mode==='epoch')cf.resolveCrusade(first.crusadeId);
 assert(cf.devIgnite(view,input.definition.id,100,'undead'));cf.update(0,view);const second=cf.crusadeOn(input.definition.id);assert(second&&second.crusadeId!==first.crusadeId);area.combat.crusadeLifetime.materializeLiveZoneEvents();
 const snapshot=()=>cf.snapshot() as {crusades:{id:string;power:number}[];mods:{key:string}[]},before=snapshot(),xp=w.localSeat.meta.xp;armed=true;area.combat.kill(commander,false,w.player);armed=false;const after=snapshot(),ledger=w.ledger.crusade_zones_cleared??0;console.log(JSON.stringify({mode,calls,first:first.crusadeId,second:second.crusadeId,before,after,ledger,xpDelta:w.localSeat.meta.xp-xp,drivers}));assert.deepEqual(drivers,[]);
 assert.equal(calls,0,'retained private event guard must use defining-module originals');
 const prior=before.crusades.find(c=>c.id===second.crusadeId)!.power;assert.equal(after.crusades.find(c=>c.id===second.crusadeId)!.power,prior,'old commander cannot suppress successor');
 if(mode==='epoch')assert.equal(ledger,0,'expired commander cannot collect event-specific reward');else{assert.equal(ledger,1);assert.equal(after.mods.at(-1)!.key,first.crusadeId);}
 });});}finally{CrusadeField.prototype.nativeCrusadeEpoch=originalEpoch;CrusadeField.prototype.withCrusadeZoneKill=originalScope;}
