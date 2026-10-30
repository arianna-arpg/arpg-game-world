import assert from 'node:assert/strict';
import {NativeShardHost} from '../server/nativeShardHost';
import {CLASSES} from '../src/data/classes';
import {RemoteInput} from '../src/net/remote';
import {combatHash,writeCombatProof} from './probe_nativecombatcycle';
const rows=[];
for(const site of ['outer','inner','life'] as const)for(const field of ['id','meta'] as const)for(const when of ['getter','body'] as const){
 const host=new NativeShardHost({seed:1231,saveDir:null,log:()=>{}});
 try{
  const keeper=host.keeper,body=keeper.actor,meta=keeper.meta,id=keeper.id,area=host.runtime.current;
  const peer=host.seats.keeperWorld().addSeat('keeper-selection-peer',CLASSES.find(c=>c.id!==meta.classDef.id)!,new RemoteInput('keeper-selection-peer'),{startingCompanions:false,startingFlasks:false});peer.actor.level=17;
  const target=site==='outer'?area.combat.serverSeats:site==='inner'?area.progression:body,key=site==='life'?'maxLife':'recalcSeat',descriptor=Object.getOwnPropertyDescriptor(target,key),fn=Reflect.get(target,key) as Function;
  let calls=0,getters=0,ownApply=0;const change=()=>{if(field==='meta')keeper.meta=peer.meta;else keeper.id='replaced-keeper-id';};
  const selected=function(this:unknown,...args:unknown[]){assert.equal(this,target);calls++;const result=Reflect.apply(fn,this,args);if(when==='body')change();return result;};
  Object.defineProperty(selected,'apply',{get:()=>{ownApply++;throw Error('own function apply read');}});
  if(site==='life')body.life=0;
  Object.defineProperty(target,key,{configurable:true,get:()=>{getters++;if(when==='getter')change();return selected;}});
  let refused=false;
  try{host.runtime.maintainKeeper();}catch{refused=true;}finally{if(descriptor)Object.defineProperty(target,key,descriptor);else Reflect.deleteProperty(target,key);}
  assert(refused,`${site}/${field}/${when} refuses replaced selected character`);assert.equal(getters,1);assert.equal(calls,when==='getter'?0:1);assert.equal(ownApply,0);assert.equal(keeper.actor,body);
  if(site==='life')assert.equal(body.life,0,'stale maximum cannot write life after callback');else assert.equal(body.level,17,'completed native level assignment is preserved');
  assert.equal(field==='meta'?keeper.meta===peer.meta:keeper.id==='replaced-keeper-id',true,'completed callback effect is preserved');
  keeper.meta=meta;keeper.id=id;rows.push({site,field,when,refused,getters,calls,ownApply,completedEffectsRetained:true});
 }finally{await host.stop({persist:false});}
}
writeCombatProof('native-shard-keeper-selection.json',{rows,receipt:combatHash(JSON.stringify(rows))});console.log(JSON.stringify({cases:rows.length,allRefuse:true,getterCalls:0,completedBodyCalls:1,completedEffectsRetained:true}));
