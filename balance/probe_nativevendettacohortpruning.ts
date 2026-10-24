import assert from 'node:assert/strict';
import fs from 'node:fs';
import {actualVendetta} from './nativeVendettaLifetimeFixture';
import {nativeUnclaimedActor} from '../src/worldmass/nativeAreaActorAuthority';
const results:{name:string;result:unknown}[]=[];
function course(name:string,run:Parameters<typeof actualVendetta>[0]){const result=actualVendetta(s=>{const result=run(s);assert.deepEqual(s.drivers,[]);s.n.coordinator.retire();return result;});results.push({name,result});fs.writeFileSync(new URL('../../VENDETTA-COHORT-PRUNING.json',import.meta.url),JSON.stringify(results,null,2));console.log('PASS '+name);}
course('three genuine retired cohorts retry through the original field cooldown',s=>{
 const first=s.ignite(),retired:ReturnType<typeof s.materialize>=[];let current=s.materialize(first.id);const sizes=[current.length];
 for(let round=0;round<3;round++){for(const body of current){s.area.combat.slipAway(body,'');assert(!s.area.combat.scene.actors.includes(body));Reflect.apply(nativeUnclaimedActor,s.n.authority,[body]);retired.push(body);}s.travel(s.b);s.vf.update(55,s.w.devOverlayView());s.travel(s.a);current=s.materialize(first.id);assert(current.every(body=>!retired.includes(body)));sizes.push(current.length);assert.equal(s.w.ledger.writs_settled??0,0);}
 s.area.combat.kill(current.find(body=>body.tag==='vendetta_warrant')!,false,s.w.player);assert.equal(s.w.ledger.writs_settled,1);return{sizes,retired:retired.length,settledOnce:true};
});
course('partial retirement preserves wounded survivor and actual corpse on repeated returns',s=>{
 const first=s.ignite(),old=s.materialize(first.id),warrant=old.find(body=>body.tag==='vendetta_warrant')!,corpse=old.find(body=>body!==warrant)!;warrant.life-=3.25;const wound=warrant.life;s.area.combat.kill(corpse,false,s.w.player);assert(corpse.dead);assert(s.area.combat.scene.actors.includes(corpse));
 for(const body of old)if(body!==warrant&&body!==corpse)s.area.combat.slipAway(body,'');
 for(let round=0;round<2;round++){s.travel(s.b);s.vf.update(55,s.w.devOverlayView());s.travel(s.a);for(let i=0;i<100;i++)s.live();assert.deepEqual(s.cohort(first.id),[warrant]);assert.equal(warrant.life,wound);assert(s.area.combat.scene.actors.includes(corpse));assert(corpse.dead);}
 assert.equal(s.w.ledger.writs_settled??0,0);return{survivor:warrant.id,wound,corpse:corpse.id,corpseStillPresent:true};
});
course('raw splice without authority release cannot forget the original cohort receipt',s=>{
 const first=s.ignite(),old=s.materialize(first.id),warrant=old.find(body=>body.tag==='vendetta_warrant')!;warrant.life-=6;const wound=warrant.life;for(const body of old)if(body!==warrant)s.area.combat.slipAway(body,'');s.travel(s.b);
 const census=s.area.combat.scene.actors,index=census.indexOf(warrant);assert(index>=0);census.splice(index,1);assert.throws(()=>Reflect.apply(nativeUnclaimedActor,s.n.authority,[warrant]));
 s.travel(s.a);assert.equal(s.cohort(first.id).length,0,'original cooldown prevents a fresh selection');census.splice(index,0,warrant);s.vf.update(55,s.w.devOverlayView());let selected=0;const wants=s.vf.wantsAmbush;s.vf.wantsAmbush=function(...args){const spec=Reflect.apply(wants,this,args);if(spec?.writId===first.id)selected++;return spec;};try{for(let i=0;i<100&&!selected;i++)s.live();}finally{s.vf.wantsAmbush=wants;}
 assert.equal(selected,1);assert.deepEqual(s.cohort(first.id),[warrant]);assert.equal(warrant.life,wound);assert.equal(s.n.authority.require(warrant).combat,s.area.combat);return{selected,survivor:warrant.id,wound,stillClaimed:true};
});
