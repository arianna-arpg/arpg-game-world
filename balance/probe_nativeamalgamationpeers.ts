import assert from 'node:assert/strict';
import {writeFileSync,mkdirSync} from 'node:fs';
import {fileURLToPath} from 'node:url';
import {nativeCampaignFixture,birthActualNativeArea,mintAdditionalNativeArea} from './nativeCombatRetainedFixture';
import {refuseWorldCombat} from './probe_nativecombatcycle';
import {withSeededRandom} from '../src/core/rng';
import {CLASSES} from '../src/data/classes';
import {RemoteInput} from '../src/net/remote';
import type {Seat} from '../src/engine/world';
const reports:unknown[]=[];
for(const mode of ['idle','downed','dead'])withSeededRandom(23032,()=>{
 const setup=nativeCampaignFixture(23032),w=setup.writer;w.player.level=15;w.player.invulnerable=true;mintAdditionalNativeArea(setup);mintAdditionalNativeArea(setup,{x:455,y:660});
 refuseWorldCombat([w],drivers=>{
  const n=birthActualNativeArea(setup),af=w.sim.amalgamationField!;let peer:Seat|undefined,firstTarget='',targetArea:typeof n.ongoing|undefined,priorQuarry:typeof w.player|undefined,unrelated:typeof w.player|undefined;
  const area=()=>n.coordinator.published,state=()=>area().assembly.input.registry.input.birth.input.state,actors=()=>area().combat.scene.actors;
  const travel=(to:string)=>{const from=area();if(!peer)n.coordinator.runFrom(from,()=>n.coordinator.loadZone(to,w.zone.id));else {n.coordinator.roadsFor(from.combat).shardWorld!.enqueue({seatId:w.localSeat.id,dest:to});const result=from.combat.campaignFrame.drainShardRoads()[0];if(result?.outcome==='failed')throw result.error;assert.equal(result?.outcome,'moved');}};
  const frame=(dt:number)=>{w.time+=dt;area().combat.campaignFrame.tick(dt);};
  const peerIntact=()=>{assert(peer&&targetArea);assert(targetArea.combat.scene.actors.includes(peer.actor));assert.strictEqual(n.authority.require(peer.actor).combat,targetArea.combat);assert.equal(peer.actor.downed,mode==='downed');assert.equal(peer.actor.dead,mode==='dead');if(unrelated){assert(targetArea.combat.scene.actors.includes(unrelated));assert(unrelated.life>0&&unrelated.life<unrelated.maxLife());}};
  assert(af.devOpen(w.devOverlayView(),setup.definition.id));area().combat.crusadeLifetime.materializeLiveZoneEvents();const rows:unknown[]=[];
  for(let stage=0;stage<3;stage++){
   const site=state().amalgamSite!;assert(site);const necro=actors().find(a=>a.id===site.necroId);assert(necro);w.player.pos={...necro.pos};frame(2.1);assert.equal(af.peek()?.quest,'hunt');const target=af.minibossTarget();assert(target);travel(target);frame(0);
   let quarry=actors().filter(a=>!a.dead&&a.tag==='amalgam_miniboss');assert.equal(quarry.length,1);const body=quarry[0];
   if(stage===0){firstTarget=target;targetArea=area();peer=area().combat.party.addSeat('amalgam-peer-'+mode,CLASSES.find(c=>c.id==='warrior')!,new RemoteInput('amalgam-peer-'+mode),{startingCompanions:false,startingFlasks:false});peer.actor.invulnerable=true;area().combat.campaignFrame.enableHostedRoads();if(mode==='downed')peer.actor.downed=true;if(mode==='dead')peer.actor.dead=true;unrelated=actors().find(a=>a.team==='enemy'&&!a.dead&&a!==body&&a.fromZoneGen);assert(unrelated,'real unrelated base enemy');unrelated.life*=.61;body.life*=.37;const marker=[...state().materializedAmalgamMobs];travel(setup.definition.id);peerIntact();travel(target);frame(0);peerIntact();for(let i=0;i<3;i++)area().combat.crusadeLifetime.materializeLiveZoneEvents();quarry=actors().filter(a=>!a.dead&&a.tag==='amalgam_miniboss');assert.deepEqual(quarry,[body]);assert(body.life>0&&body.life<body.maxLife());assert.deepEqual([...state().materializedAmalgamMobs],marker);}
   if(stage===1){assert.equal(target,firstTarget,'actual seed repeats target');assert.strictEqual(area(),targetArea);peerIntact();assert(priorQuarry?.dead);const before=JSON.stringify(af.snapshot()),gathered=w.ledger.amalgam_parts_gathered??0;let refusal='';try{targetArea!.combat.kill(priorQuarry!,false,w.player);}catch(error){refusal=String(error);}assert.equal(JSON.stringify(af.snapshot()),before);assert.equal(w.ledger.amalgam_parts_gathered??0,gathered);assert.equal(body.dead,false);rows.push({heldDeadBodyRefusal:refusal||'dead guard returned',newQuarryId:body.id,oldQuarryId:priorQuarry!.id});}
   const before=w.ledger.amalgam_parts_gathered??0;area().combat.kill(body,false,w.player);assert.equal(af.peek()?.quest,'choose');assert.equal(w.ledger.amalgam_parts_gathered,before+1);priorQuarry=body;travel(setup.definition.id);peerIntact();const choices=area().combat.queryView('amalgamPickView');assert(choices.length);w.player.pos={...choices[0].pos};frame(2.1);assert.equal(af.peek()?.stage,stage+1);rows.push({stage,target,quarry:body.id,parts:w.ledger.amalgam_parts_gathered});
  }
  assert.equal(af.peek()?.quest,'boss');const bosses=actors().filter(a=>!a.dead&&a.tag==='amalgam_boss');assert.equal(bosses.length,1);area().combat.kill(bosses[0],false,w.player);assert.equal(af.peek(),null);assert.equal(w.ledger.amalgamations_completed,1);assert.equal(w.ledger.amalgam_parts_gathered,3);peerIntact();assert.deepEqual(drivers,[]);reports.push({mode,realParty:true,hostedRoads:true,peerAndUnrelatedWoundsPreserved:true,rows,complete:true,drivers});n.coordinator.retire();
 });
});
mkdirSync(new URL('./reports/',import.meta.url),{recursive:true});
writeFileSync(fileURLToPath(new URL('./reports/native-amalgamation-peers.json',import.meta.url)),JSON.stringify(reports,null,2));console.log('PASS '+JSON.stringify(reports));
