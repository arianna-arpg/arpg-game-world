import assert from 'node:assert/strict';
import {NativeShardHost} from '../server/nativeShardHost';
import {CLASSES} from '../src/data/classes';
import {RemoteInput} from '../src/net/remote';
import {combatHash,writeCombatProof} from './probe_nativecombatcycle';
const host=new NativeShardHost({seed:1231,saveDir:null,log:()=>{}});
try {
 const keeper=host.keeper,body=keeper.actor,position={...body.pos},area=host.runtime.current;
 const high=host.seats.keeperWorld().addSeat('keeper-level-live',CLASSES[0],new RemoteInput('keeper-level-live'),{startingCompanions:false,startingFlasks:false});
 high.actor.level=17;
 const fallen=host.seats.keeperWorld().addSeat('keeper-level-dead',CLASSES[0],new RemoteInput('keeper-level-dead'),{startingCompanions:false,startingFlasks:false});fallen.actor.level=99;fallen.actor.dead=true;
 body.invulnerable=false;body.untargetable=false;body.passive=false;body.levitates=false;body.downed=true;body.dead=true;body.life=0;
 const time=host.world.time,result=host.tick(.02);assert.deepEqual(result.faults,[]);assert.equal(host.faults,0);
 assert.equal(keeper.actor,body);assert.equal(body.level,17);assert(body.invulnerable&&body.untargetable&&body.passive&&body.levitates);assert(!body.dead&&!body.downed);assert(body.life>0);assert.deepEqual(body.pos,position);assert.equal(keeper.lastActedAt,time);assert.equal(host.world.time,time+.02);assert.equal(host.runtime.current,area);
 const proof={actualKeeperMaintained:true,keeperIdentityAndPositionPreserved:true,originalFlagsRestored:true,downAndDeathCleared:true,lifeRestored:true,highestLivingPlayerLevel:body.level,deadHigherLevelIgnored:true,oneCampaignTick:true};writeCombatProof('native-shard-host-keeper.json',{result:proof,receipt:combatHash(JSON.stringify(proof))});console.log(JSON.stringify(proof));
}finally {await host.stop({persist:false});}
