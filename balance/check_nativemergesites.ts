/** Explicit admitted shrine fixture; real retained frames, quest owners, sockets and journal serialization. */
import assert from 'node:assert/strict';
import {NativeShardHost} from '../server/nativeShardHost';
import {WsTransport} from '../src/net/ws';
import type {StateSnapshot} from '../src/net/snapshot';
import {VOCATIONS,VOCATION_CFG,vocationDiscoveryKey} from '../src/data/vocations';
import {dist} from '../src/core/math';
const clients:WsTransport[]=[],logs:string[]=[];
let host:NativeShardHost|undefined;
const wait=async(fn:()=>boolean,label:string)=>{const end=Date.now()+8000;while(!fn()&&Date.now()<end)await new Promise(r=>setTimeout(r,10));assert(fn(),label+' '+logs.slice(-4).join('\n'));};
try {
 const h=host=new NativeShardHost({seed:45927,saveDir:null,log:s=>logs.push(s)});
 const port=await h.listen(0,'127.0.0.1');
 const join=async(name:string,classId:string)=>{const wire=new WsTransport(),states:StateSnapshot[]=[];clients.push(wire);wire.onState(s=>states.push(s));const welcome=await wire.connect(`ws://127.0.0.1:${port}`,{name,classId,accountId:'native-calling-'+name});await wait(()=>!!h.seats.seatOf(welcome.self),'real join');return {wire,seat:h.seats.seatOf(welcome.self)!,states};};
 const ranger=await join('Rowan','ranger'),stranger=await join('Bryn','warrior'),area=h.runtime.current;
 const sites=area.assembly.input.sites,geometry=area.assembly.input.geometry,authority=h.coordinator.input.authority;
 const plant=(vocId:string,at:{x:number;y:number})=>{const v=VOCATIONS[vocId];assert(v.secret);const npc=area.assembly.input.population.createMonster(v.secret.site.npc,1,'enemy');npc.pos=geometry.findFreeSpot(at,npc.radius);area.combat.scene.actors.push(npc);authority.claim(area.binding,[npc]);sites.input.state.vocationSites.push({vocId,npc});return npc;};
 const shrine=plant('greenwarden',{...ranger.seat.actor.pos});
 for(const row of [ranger,stranger]){row.seat.actor.level=28;row.seat.actor.pos={x:shrine.pos.x+35,y:shrine.pos.y};row.seat.lastActedAt=-10;}
 const key=vocationDiscoveryKey('greenwarden'),keeper=h.keeper;
 const tick=()=>{const result=h.tick(1/60);assert.deepEqual(result.faults,[],logs.join('\n'));};
 tick();
 assert.equal(h.world.questLedgerOf(ranger.seat).keys[key],1,'real retained frame stamps the ranger');
 assert.equal(h.world.questLedgerOf(stranger.seat).keys[key]??0,0,'another class gets no discovery');
 assert.equal(h.world.ownQuestLedger.keys[key]??0,0,'keeper quest ledger is not the traveller');
 assert.equal(h.world.ledger[key]??0,0,'campaign run ledger does not borrow a traveller discovery');
 assert.equal(h.world.gateAccountOf(ranger.seat).ledger[key],1,'actual account gate receives its discovery');
 assert(sites.input.state.vocationSites.find(s=>s.npc===shrine)?.silentSeats?.has(stranger.seat.id));
 const basin=plant('stillmind',{...keeper.actor.pos}),basinKey=vocationDiscoveryKey('stillmind');
 for(const row of [ranger,stranger]){row.seat.actor.pos=geometry.findFreeSpot({x:basin.pos.x+800,y:basin.pos.y+800},row.seat.actor.radius);assert(dist(row.seat.actor.pos,basin.pos)>VOCATION_CFG.discoveryRadius);}
 tick();
 for(const seat of [keeper,ranger.seat,stranger.seat])assert.equal(h.world.questLedgerOf(seat).keys[basinKey]??0,0,'parked keeper cannot discover for anyone');
 ranger.seat.actor.pos={x:basin.pos.x+35,y:basin.pos.y};tick();
 assert.equal(h.world.questLedgerOf(ranger.seat).keys[basinKey],1);
 assert.equal(h.world.questLedgerOf(stranger.seat).keys[basinKey]??0,0,'distant seat keeps its own discovery');
 for(let n=0;n<3;n++)tick();await wait(()=>ranger.states.length>0&&stranger.states.length>0,'native own journal publication');
 assert.equal(h.faults,0);assert.equal(h.net.faults,0);
 console.log('PASS native calling discovery: two actual clients, retained frames, own class/quest/account, distant player and parked keeper, native wire publication');
}finally{if(host)await host.stop({persist:false});for(const client of clients)client.leave();}