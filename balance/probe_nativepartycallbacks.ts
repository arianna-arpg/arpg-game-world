import assert from 'node:assert/strict';
import {actualParty,ordinaryParty,refuseWorldParty} from './nativePartyFixture';
import type {World} from '../src/engine/world';
import {NativeAreaSceneProgression} from '../src/worldmass/nativeAreaSceneProgression';
import {MERC_TEMPLATES} from '../src/data/mercenaries';
import {addRetiredMerc,MERC_CFG} from '../src/meta/mercs';
import {sceneTemplateSnapshot} from '../src/engine/nativeSceneSeatHiring';
import {combatHash,writeCombatProof} from './probe_nativecombatcycle';
function course(w:World,owner:World|NativeAreaSceneProgression,kind:'refund'|'throw'|'frozen'){
 const post=w.mercOutpost;assert(post);w.meta.essences.coarse=100000;
 post.offers.splice(0,post.offers.length,{kind:'template',refId:MERC_TEMPLATES[0].id,name:'Selected native normalization',classId:MERC_TEMPLATES[0].classId,blurb:'actual template'});
 const before=w.meta.essences.coarse,seats=w.seats.length,fn=owner instanceof NativeAreaSceneProgression?owner.applyMercNormalization:owner['applyMercNormalization'],desc=Object.getOwnPropertyDescriptor(owner,'applyMercNormalization'),error=new Error('selected normalization after native work');let calls=0;
 const selected:World['applyMercNormalization']=function(this:typeof owner,...args){assert.equal(this,owner);calls++;const result=Reflect.apply(fn,this,args);assert.equal(result,true);if(kind==='throw')throw error;return kind==='refund'?false:result;};
 Object.defineProperty(selected,'apply',{get(){throw Error('selected callable own apply must not be read');}});
 Object.defineProperty(owner,'applyMercNormalization',{configurable:true,value:selected});
 try{
  if(kind==='refund'){assert.equal(w.hireMercenary(0),false);assert.equal(w.seats.length,seats);assert.equal(w.meta.essences.coarse,before);assert.equal(post.offers.length,1);assert.equal(w.hiredMercs.length,0);return {kind,calls,refund:before-w.meta.essences.coarse,seats:w.seats.length,offers:post.offers.length};}
  if(kind==='throw'){assert.throws(()=>w.hireMercenary(0),e=>e===error);assert.equal(w.seats.length,seats+1);assert(w.meta.essences.coarse<before);assert.equal(post.offers.length,1);assert.equal(w.hiredMercs.length,0);return {kind,calls,payment:before-w.meta.essences.coarse,seats:w.seats.length,offers:post.offers.length,normalized:w.seats.at(-1)!.actor.level};}
  const snapshot=sceneTemplateSnapshot(MERC_TEMPLATES[0],8),retired={schema:1,mercId:'party-frozen-late',name:'Veteran',classId:snapshot.classId,retiredLevel:8,retiredAt:1234,snapshot,engagedBy:undefined as string|undefined};addRetiredMerc(w.account,retired);post.offers.splice(0,post.offers.length,{kind:'retired',refId:retired.mercId,name:retired.name,classId:retired.classId,blurb:'actual veteran'});const tint=MERC_CFG.retiredTint;assert(tint);w.meta.essences[tint]=100000;w.accountDirty=false;Object.freeze(w.hiredMercs);assert.throws(()=>w.hireMercenary(0),TypeError);assert.equal(retired.engagedBy,w.meta.charId);assert(w.accountDirty);assert.equal(w.hiredMercs.length,0);assert.equal(post.offers.length,1);assert.equal(w.seats.length,seats+1);return {kind,calls,payment:100000-w.meta.essences[tint],seats:w.seats.length,offers:post.offers.length,engagement:true,accountDirty:true};
 }finally{if(desc)Object.defineProperty(owner,'applyMercNormalization',desc);else Reflect.deleteProperty(owner,'applyMercNormalization');}
}
const kinds=['refund','throw','frozen'] as const,expected=kinds.map(kind=>{const w=ordinaryParty();return course(w,w,kind);});
const result=await refuseWorldParty(async worldDrivers=>{const cases=kinds.map((kind,i)=>{const made=actualParty();try{const actual=course(made.writer,made.runtime.current.progression,kind);assert.deepEqual(actual,expected[i]);for(const seat of made.writer.seats)assert.equal(made.runtime.current.authority.require(seat.actor).combat,made.runtime.current.combat);return actual;}finally{made.start.cancel();}});return {cases,worldDrivers};});
const report={scope:'Selected actual normalization receiver and ignored callable.apply, native false removal/refund, throw after native effects, frozen contract queue after veteran engagement; independently matched ordinary World.',result,receipt:combatHash(JSON.stringify(result))};writeCombatProof('native-party-callbacks.json',report);console.log(JSON.stringify(report));