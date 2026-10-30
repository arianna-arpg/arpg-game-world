import assert from 'node:assert/strict';
import {actualParty,ordinaryParty,partyFacts,refuseWorldParty} from './nativePartyFixture';
import {CLASSES} from '../src/data/classes';
import {NullInput} from '../src/net/intent';
import {addRetiredMerc,MERC_CFG} from '../src/meta/mercs';
import {MERC_TEMPLATES} from '../src/data/mercenaries';
import {sceneTemplateSnapshot} from '../src/engine/nativeSceneSeatHiring';
import type {World} from '../src/engine/world';
import {serializeCharacter,rebuildSavedMeta} from '../src/meta/character';
import {withSeededRandom} from '../src/core/rng';
import {combatHash,writeCombatProof} from './probe_nativecombatcycle';
function course(w:World){
 const joined=w.addSeat('c1',CLASSES.find(c=>c.id==='tamer')!,new NullInput());assert(w.actors.some(a=>a.companion&&a.owner===joined.actor));assert(joined.meta.knownSkills.has('life_flask'));
 const noGift=w.addSeat('c2',CLASSES.find(c=>c.id==='warrior')!,new NullInput(),{startingCompanions:false,startingFlasks:false});assert(!noGift.meta.knownSkills.has('life_flask'));
 const saved=serializeCharacter(w),built=rebuildSavedMeta(saved);assert(built);built.meta.name='A guest vessel';w.adoptSeatMeta(noGift,built.meta,saved.bar,4);assert.equal(noGift.actor.name,'A guest vessel');assert.equal(noGift.actor.level,4);
 // Installed template data, placed onto the genuine officer's mutable native sheet.
 const post=w.mercOutpost;assert(post);post.offers.splice(0,post.offers.length,{kind:'template',refId:MERC_TEMPLATES[0].id,name:'Native contract',classId:MERC_TEMPLATES[0].classId,blurb:'actual template'});
 const poor=w.hireMercenary(0);assert.equal(poor,false);w.meta.essences.coarse=100000;assert.equal(w.hireMercenary(-1),false);const before=w.meta.essences.coarse;assert.equal(w.hireMercenary(0),true);assert(w.meta.essences.coarse<before);const template=partyFacts(w).hired;
 w.dismissMercenary('contract complete');assert.equal(w.hiredMercs.length,0);assert.equal(w.seats.some(s=>s.id==='m0'),false);
 const snapshot=sceneTemplateSnapshot(MERC_TEMPLATES[0],8);const retired={schema:1,mercId:'native-party-veteran',name:'Veteran',classId:snapshot.classId,retiredLevel:8,retiredAt:1234,snapshot,engagedBy:undefined as string|undefined};addRetiredMerc(w.account,retired);assert(w.account.mercRoster.includes(retired));
 post.offers.push({kind:'retired',refId:retired.mercId,name:retired.name,classId:retired.classId,blurb:'real retired build'});
 const tint=MERC_CFG.retiredTint;assert(tint);w.meta.essences[tint]=100000;assert.equal(w.hireMercenary(0),true);assert.equal(retired.engagedBy,w.meta.charId);const veteran=w.hiredMercs[0];assert.equal(veteran.seat.id,'m0');
 post.offers.push({kind:'retired',refId:retired.mercId,name:retired.name,classId:retired.classId,blurb:'stale locked sheet'});const wallet={...w.meta.essences};assert.equal(w.hireMercenary(0),false);assert.deepEqual(w.meta.essences,wallet);
 return {template,final:partyFacts(w),blockedEngagement:true,veteranEngaged:true};
}
const expected=withSeededRandom(52001,()=>course(ordinaryParty()));
const result=await refuseWorldParty(async worldDrivers=>{const made=withSeededRandom(52001,()=>actualParty());try{const actual=withSeededRandom(52002,()=>course(made.writer));assert.deepEqual(actual,expected,'real native factory/gifts/meta-adoption/template and retired hiring match ordinary native algorithm');for(const seat of made.writer.seats)assert.equal(made.runtime.current.authority.require(seat.actor).combat,made.runtime.current.combat);made.runtime.dispatch({dt:.01,wallSeconds:.01,inputs:new Map()});return {...actual,admitted:made.writer.seats.length,worldDrivers};}finally{made.start.cancel();}});
const report={scope:'Independent ordinary World versus actual published retained later addSeat, native gifts, vessel metadata adoption, template and retired contracts, payment/refusal, dismissal and id reuse; real MercInput frame.',result,receipt:combatHash(JSON.stringify(result))};writeCombatProof('native-party-parity.json',report);console.log(JSON.stringify(report));

// Installed class catalog: each genuine later join runs its native gifts, then all
// actual seats are dispatched together. This is separate from the contract receipt.
const catalogCourse=(w:World)=>{for(const [i,cls] of CLASSES.entries())w.addSeat('catalog-'+i,cls,new NullInput());return partyFacts(w);};
const catalogExpected=withSeededRandom(52003,()=>catalogCourse(ordinaryParty(1213)));
const catalog=await refuseWorldParty(async worldDrivers=>{const made=withSeededRandom(52003,()=>actualParty(1213));try{const result=withSeededRandom(52004,()=>catalogCourse(made.writer));assert.deepEqual(result,catalogExpected);for(const seat of made.writer.seats)assert.equal(made.runtime.current.authority.require(seat.actor).combat,made.runtime.current.combat);made.runtime.dispatch({dt:.01,wallSeconds:.01,inputs:new Map()});return {classes:CLASSES.map(c=>c.id),result,worldDrivers};}finally{made.start.cancel();}});
const catalogReport={scope:'Every installed class joins through its genuine native factory and gifts; independent ordinary World comparison and actual retained dispatch.',catalog,receipt:combatHash(JSON.stringify(catalog))};writeCombatProof('native-party-class-catalog.json',catalogReport);console.log(JSON.stringify({classes:catalog.classes,receipt:catalogReport.receipt}));