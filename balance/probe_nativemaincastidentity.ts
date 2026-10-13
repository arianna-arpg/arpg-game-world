import '../src/engine/world';
import assert from 'node:assert/strict';
import {makeSimWorld} from '../src/sim/arena';
import {makeSkillInstance} from '../src/engine/skills';
import {mod} from '../src/engine/stats';
import {SKILLS} from '../src/data/skills';
import {forgeItem} from '../src/engine/itemgen';
import {SUPPORTS} from '../src/data/supports';
import {packGrantState} from '../src/engine/gemitems';
import {serializeSnapshot,applySnapshot,adoptSnapshot} from '../src/net/snapshot';
import {playerCastPreparation} from '../src/engine/playerCastVisual';
const rig=(seed:number)=>{const w=makeSimWorld('warrior',seed);w.walk=null;w.actors=[w.player];w.doodads=[];w.markDoodadsChanged();w.player.pos={x:700,y:700};w.player.sheet.setSource('critic-resources',[mod('mana','override',100000),mod('life','override',100000)]);w.player.fillResources();return w;};
const rows:any[]=[];
{
 const host=rig(67301),client=rig(67302),inst=makeSkillInstance({...SKILLS.firebolt,requirements:undefined});inst.devGift=true;host.meta.knownSkills.set('firebolt',inst);host.player.skills[0]=inst;assert(host.useSkill(host.player,inst,{x:900,y:700},true));host.metaDirty.add(host.localSeat.id);const packet=serializeSnapshot(host,1);client.clientSeatId=host.localSeat.id; applySnapshot(client,packet);
 const optimistic=makeSkillInstance(SKILLS.firebolt,7,2);client.meta.knownSkills.set('firebolt',optimistic);client.player.skills[0]=optimistic;let calls=0;adoptSnapshot(client,packet,null,{metaGate:()=>{calls++;return false;}});assert.equal(calls,1);assert.equal(client.player.casting!.inst,optimistic);assert.equal(client.player.skills[0],optimistic);assert.equal(client.meta.knownSkills.get('firebolt'),optimistic);rows.push({case:'rejected metadata retains optimistic bar/book/cast identity',pass:true});
 applySnapshot(client,packet);assert.equal(client.player.casting!.inst,client.player.skills[0]);assert.equal(client.player.casting!.inst,client.meta.knownSkills.get('firebolt'));rows.push({case:'accepted metadata rebuilds learned cast/bar/book together',pass:true});
 for(const sk of [undefined,'unknown_future_skill']){const p=structuredClone(packet);p.actors.find(a=>a.id===host.player.id)!.cast!.sk=sk;applySnapshot(client,p);assert.equal(playerCastPreparation(client.player),undefined);rows.push({case:'missing or unknown optional identity '+sk,pass:true});}
 const remote=structuredClone(packet);remote.actors.find(a=>a.id===host.player.id)!.seat='remote';applySnapshot(client,remote);const other=client.actors.find(a=>a.casting)!;assert.equal(playerCastPreparation(other),undefined);rows.push({case:'remote cast remains host-resolved stub',pass:true});
}
{
 const host=rig(67311),client=rig(67312),item=forgeItem({uniqueId:'cindervigil',ilvl:20,quality:.75})!;const prepared=makeSkillInstance(SKILLS.firebolt,1,2);prepared.sockets[0]={def:SUPPORTS.splitting,level:4};item.grantState={firebolt:packGrantState(prepared)};host.meta.equipped.helmet=item;host.recalcSeat(host.localSeat);assert(!host.meta.knownSkills.has('firebolt'));host.bindSkill(0,'firebolt');const inst=host.player.skills[0]!;assert.equal(inst,host.localSeat.grantedInsts!.get('firebolt'));host.player.fillResources();assert(host.useSkill(host.player,inst,{x:900,y:700},true));host.metaDirty.add(host.localSeat.id);const packet=serializeSnapshot(host,1);assert(packet.seatMeta?.[host.localSeat.id]);client.clientSeatId=host.localSeat.id;assert(!client.player.skills.some(s=>s?.def.id==='firebolt'));applySnapshot(client,packet);const cast=client.player.casting!.inst,bar=client.player.skills[0]!;assert.equal(bar,client.localSeat.grantedInsts!.get('firebolt'));assert.equal(cast,bar);assert.equal(cast.sockets[0]?.def.id,'splitting');assert.equal(cast.grantedHostUid,bar.grantedHostUid);rows.push({case:'same-packet genuine equipment-granted cast',castIsBar:cast===bar,castLevel:cast.level,barLevel:bar.level,castSockets:cast.sockets.map(s=>s?.def.id??null),barSockets:bar.sockets.map(s=>s?.def.id??null),castHost:cast.grantedHostUid,barHost:bar.grantedHostUid,prep:playerCastPreparation(client.player)?.profile.family});
}
console.log(JSON.stringify({rows},null,2));
