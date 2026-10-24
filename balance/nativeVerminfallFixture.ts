/** Actual retained start and native geography. Supported fault staging is explicit in each course. */
import assert from 'node:assert/strict';
import {bootSimEngine} from '../src/sim/arena';
import {makeAccount} from '../src/meta/account';
import {buildManifest} from '../src/packages/manifest';
import {CLASSES} from '../src/data/classes';
import {START_ZONE} from '../src/data/zones';
import {placeZoneAt} from '../src/engine/worldgen';
import {NativeClientStart} from '../src/worldmass/nativeClientStart';
import {withSeededRandom} from '../src/core/rng';
import {refuseWorldStartup} from './nativeClientStartFixture';
export {bootSimEngine,withSeededRandom,refuseWorldStartup};
export function setupVerminfallDraft(){
 const account=makeAccount(),start=new NativeClientStart(account);
 const made=start.begin({kind:'run',classDef:CLASSES.find(c=>c.id==='warrior')!,manifest:buildManifest(account,1211),prologue:'skip'});assert(made);
 const w=made.writer,runtime=made.runtime;w.player.level=5;w.player.invulnerable=true;
 const vf=w.sim.verminfallField;assert(vf);
 let target:{x:number;y:number}|undefined;
 for(let radius=180;radius<=540&&!target;radius+=30)for(let step=0;step<24;step++){
  const at={x:Math.round(Math.cos(step*Math.PI/12)*radius),y:Math.round(Math.sin(step*Math.PI/12)*radius)};
  if(w['biomeFor'](at)==='farmland'&&w['continentFor'](at).kind!=='ocean'&&w['levelFor'](at)<=vf.surge().levelMax){target=at;break;}
 }
 assert(target,'bounded native geography search found eligible farmland');
 const def=placeZoneAt(target,null,w.zoneMap,w['nextGenId']++,{seed:1211^0x9da0,fieldBiome:true,biomeFor:w['biomeFor'],biomeDepthFor:w['biomeDepthFor'],climateFor:w['climateFor'],levelFor:w['levelFor'],courseFor:w['courseMintFor']('surface')});
 assert.equal(def.biome,'farmland');w.zoneMap[def.id]=def;w.sim.onNodeCharted(def,w.devOverlayView());w.sim.update(0,w.devOverlayView());
 const events=()=>vf.snapshot() as {seq:number;infestations:{id:string;zoneId:string;nestsTotal:number;nestsBroken:number;age:number;seen:boolean;dead:boolean}[]};
 let steps=0;while(!events().infestations.some(x=>!x.dead)&&steps<2000){vf.update(.5,w.devOverlayView());steps++;}
 const event=events().infestations.find(x=>!x.dead);assert(event);assert.equal(event.zoneId,def.id);
 const travel=(id:string)=>{const area=runtime.current,c=area.combat.input.coordinator;c.runFrom(area,()=>c.loadZone(id,w.zone.id));};
 travel(def.id);runtime.dispatch({dt:1/60,wallSeconds:1/60,inputs:new Map()});
 const area=runtime.current,nests=()=>w.actors.filter(x=>!x.dead&&x.tag==='warren_nest'),king=()=>w.actors.find(x=>!x.dead&&x.tag==='rat_king_manifest');
 assert.equal(nests().length,event.nestsTotal);
 const kill=(body:typeof w.player)=>area.combat.kill(body,false,w.player);
 const live=()=>area.combat.verminfallLifetime.materializeLiveZoneEvents();
 // Fault fixture only: supported restore retires the old epoch; dev ignition stages a replacement.
 const replace=()=>{vf.restore({...events(),infestations:[]});assert(vf.devIgnite(w.devOverlayView(),def.id));const replacement=events().infestations.find(x=>!x.dead);assert(replacement);return replacement;};
 return{account,start,made,w,runtime,vf,def,area,nests,king,kill,live,travel,events,replace,event,steps,town:START_ZONE};
}
export type VerminfallDraftSetup=ReturnType<typeof setupVerminfallDraft>;

import {mkdirSync} from 'node:fs';
import {resolve} from 'node:path';
import {fileURLToPath} from 'node:url';
import {PROGRESSION} from '../src/data/classes';
import {killRules} from '../src/engine/killHandlers';
import {isNativeRetainedKillContext} from '../src/engine/nativeWarlordIdentity';
import type {Actor} from '../src/engine/actor';
import type {World,DropItem} from '../src/engine/world';

/** All receipts and save fixtures stay beneath an ignored, dedicated directory. */
export function verminfallOutputPath(name:string):string {
 const directory=fileURLToPath(new URL('../.claude/native-verminfall-audit.local.work/output/',import.meta.url));
 mkdirSync(directory,{recursive:true});return resolve(directory,name);
}
function rewardItem(item:DropItem):unknown {
 if(item.kind==='gear'){const {uid:_uid,...payload}=item.item;return{kind:item.kind,item:payload};}
 if(item.kind==='skill')return{kind:item.kind,id:item.inst.def.id,level:item.inst.level,rarity:item.inst.rarity,sockets:item.inst.sockets.map(g=>g?{id:g.def.id,level:g.level,rolled:g.rolled}:null)};
 if(item.kind==='support')return{kind:item.kind,id:item.gem.def.id,level:item.gem.level,rolled:item.gem.rolled};
 return item;
}
function xpState(w:World){return{xp:w.localSeat.meta.xp,needed:w.localSeat.meta.xpNeeded,level:w.player.level};}
function earnedXp(before:ReturnType<typeof xpState>,after:ReturnType<typeof xpState>):number {
 assert(after.level>=before.level);let amount=after.xp-before.xp;
 if(after.level>before.level)amount+=before.needed;
 for(let level=before.level+1;level<after.level;level++)amount+=PROGRESSION.xpForLevel(level);
 return amount;
}
/** Observe the actual registered row, keeping its real predicate, context and original
 * invocation. Seed only this package row's RNG to make its actual minted rewards
 * comparable despite unrelated warm/cold combat draws. No callback or context is faked. */
export function observeVerminfallKingReward(w:World,king:Actor,kill:(body:Actor)=>void,retained:boolean){
 const vf=w.sim.verminfallField;assert(vf);const cfg=vf.surge();assert.notEqual(w.zone.spoils,'none');
 const rule=killRules().find(row=>row.id==='rat_king_laid_low');assert(rule);const original=rule.run;
 let calls=0,receipt:{xp:number;gems:number;items:unknown[];slain:number;cleared:number;retainedContext:boolean}|undefined;
 rule.run=function(ctx){
  calls++;assert.equal(ctx.actor,king);assert.equal(isNativeRetainedKillContext(ctx),retained);
  const xp=xpState(w),drops=new Set(w.drops),slain=w.ledger.rat_kings_slain??0,cleared=w.ledger.infestations_cleared??0;
  const current=vf.infestOn(w.zone.id);assert(current?.kingArmed);
  withSeededRandom(44711,()=>Reflect.apply(original,this,[ctx]));
  const landed=w.drops.filter(drop=>!drops.has(drop));
  receipt={xp:earnedXp(xp,xpState(w)),gems:landed.length,items:landed.map(drop=>rewardItem(drop.item)),slain:(w.ledger.rat_kings_slain??0)-slain,cleared:(w.ledger.infestations_cleared??0)-cleared,retainedContext:isNativeRetainedKillContext(ctx)};
  assert.equal(receipt.xp,Math.round(cfg.reward.xpBase+w.zone.level*cfg.reward.xpPerLevel),'Actual package XP, including any level-up thresholds');
  assert.equal(receipt.gems,cfg.reward.gems,'Actual package drops pass through the real mint policy');
  assert.equal(receipt.slain,1);assert.equal(receipt.cleared,1);assert.equal(vf.infestOn(w.zone.id),null);
 };
 try{kill(king);assert.equal(calls,1);assert(receipt);const paid=xpState(w),drops=[...w.drops];kill(king);assert.equal(calls,1);assert.deepEqual(xpState(w),paid);assert.deepEqual(w.drops,drops);return receipt;}
 finally{rule.run=original;}
}
