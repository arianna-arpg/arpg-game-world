/** Physical attendance for actual retained reward/completion owners.
 * Real source preparation/birth, native shapeshift and native drop/XP algorithms
 * run. Combat, level-up rebuilding and quest payout are outside this course;
 * the fixture's unavailable ports are deliberately never selected. */
import assert from 'node:assert/strict';
import {makeSimWorld} from '../src/sim/arena';
import {CLASSES} from '../src/data/classes';
import {COOP_SCALING,coopScale} from '../src/data/coop';
import {SKILLS} from '../src/data/skills';
import {NullInput} from '../src/net/intent';
import {makeSkillInstance} from '../src/engine/skills';
import {mod} from '../src/engine/stats';
import {freshAssemblyInput,NativeAreaSceneAssembly} from './nativeFreshAssemblyFixture';
import {NativeAreaActorAuthority} from '../src/worldmass/nativeAreaActorAuthority';
import {NativeAreaScenePresence} from '../src/worldmass/nativeAreaScenePresence';
import {NativeAreaSceneLoot} from '../src/worldmass/nativeAreaSceneLoot';
import {NativeAreaSceneObjectiveCompletion} from '../src/worldmass/nativeAreaSceneObjectiveCompletion';
import {captureNativeGeographySource} from '../src/world/captureGeography';
import {createNativeGeographyReader} from '../src/world/geographySource';
import {MassNativeGeography,makeMassNativeGeographySpec} from '../src/worldmass/nativeGeography';
import {address} from '../src/worldmass/address';
import {withSeededRandom} from '../src/core/rng';

const checks:string[]=[];
function checked(name:string,fn:()=>void){fn();checks.push(name);console.log('PASS '+name);}
const priorRadius=COOP_SCALING.shareRadius;
try{withSeededRandom(88771,()=>{
 const w=makeSimWorld('warrior',88771),keeper=w.localSeat;
 keeper.keeper={reviveSec:3};
 const add=(id:string)=>w.addSeat(id,CLASSES.find(c=>c.id==='warrior')!,new NullInput(),{startingCompanions:false,startingFlasks:false});
 const a=add('left'),b=add('right'),flesh=a.actor;
 // The real native shapeshift executor mints the carried body and removes flesh.
 w.executeSkill(a.actor,makeSkillInstance(SKILLS.form_of_the_dire_wolf,1),a.actor.pos);
 assert.notEqual(a.actor,flesh);assert.equal(a.home,flesh);assert.equal(a.actor.possession?.huskMode,'carried');assert.equal(w.actors.includes(flesh),false);
 const body=a.actor,at={x:800,y:600};body.pos={...at};b.actor.pos={...at};flesh.pos={...at};
 for(const s of [a,b]){s.meta.xp=0;s.meta.xpNeeded=1e12;}
 w.sameSeatParty=()=>true;
 const leftDef={...w.zone,id:'presence_left',map:{x:9000,y:9000}},rightDef={...w.zone,id:'presence_right',map:{x:9040,y:9000}};
 w.zoneMap[leftDef.id]=leftDef;w.zoneMap[rightDef.id]=rightDef;
 const leftInput=freshAssemblyInput(w,leftDef),campaign=leftInput.campaign;
 leftInput.initialActors=[keeper.actor,body];
 const rightInput=freshAssemblyInput(w,rightDef,campaign);rightInput.initialActors=[keeper.actor,b.actor];
 const left=new NativeAreaSceneAssembly(leftInput),right=new NativeAreaSceneAssembly(rightInput);
 const ls=left.input.scene,rs=right.input.scene;
 const authority=new NativeAreaActorAuthority<object>(campaign),lb=authority.register(ls,{}),rb=authority.register(rs,{});
 checked('fresh assembly refuses attendance activation before birth',()=>assert.throws(()=>left.activatePresence(authority),/completed birth/));
 checked('preparation cohorts are explicit and independent',()=>{
  assert.deepEqual(left.scenePresence.seats,[keeper,a]);assert.deepEqual(right.scenePresence.seats,[keeper,b]);
  const late=add('late-preparation');ls.actors.push(late.actor);
  assert.equal(left.scenePresence.seats.includes(late),false);
  ls.actors=ls.actors.filter(x=>x!==late.actor);
  assert.throws(()=>new NativeAreaScenePresence(ls,campaign,[b]),/explicit scene cohort/);
 });
 const seed=campaign.sim.biomeField.fieldSeed,reader=createNativeGeographyReader(captureNativeGeographySource(seed));
 const geography=new MassNativeGeography(makeMassNativeGeographySpec(reader.identity,{schema:1,algorithm:'bigint-relative-native-map-v1',addressSpan:960,physicalOrigin:address('surface','0','0',0,0,960),nativeOrigin:{x:0,y:0},physicalUnitsPerNativeUnit:{numerator:'20',denominator:'1'},nativeDimension:'surface',nativeBounds:{minX:-10000,minY:-10000,maxX:10000,maxY:10000},outsideDomain:'refuse',rounding:'nearest-binary64-ties-even-once'}));
 for(const area of [left,right]){
  const session=area.sourceSession(geography),source=session.issue(area.input.scene.zone.id);
  const place=area.prepare(session,source,at,false);
  area.input.scene.player.pos=area.input.geometry.clampPos({...place.spawnAt??place.entry},area.input.scene.player.radius);
  area.birth();assert.equal(area.phase,'born');
 }
 checked('born assembly refuses unowned preparation observers',()=>assert.throws(()=>left.activatePresence(authority),/unowned or borrowed/));
 // This course's publisher removes the borrowed keeper explicitly. Generated
 // residents stay in each native census and are claimed whole.
 ls.actors=ls.actors.filter(x=>x!==keeper.actor);rs.actors=rs.actors.filter(x=>x!==keeper.actor);
 ls.player=body;rs.player=b.actor;body.pos={...at};b.actor.pos={...at};flesh.pos={...at};
 authority.claim(lb,ls.actors);authority.claim(rb,rs.actors);
 left.activatePresence(authority);right.activatePresence(authority);
 checked('admission preserves owner identity and physical carried-body attendance',()=>{
  assert.equal(left.lootController.input.campaign,campaign);assert.equal(left.objectiveController.input.campaign,campaign);
  assert.equal(left.lootController.input.scenePresence,left.scenePresence);assert.equal(left.objectiveController.input.scenePresence,left.scenePresence);
  assert.deepEqual(left.scenePresence.seats,[a]);assert.deepEqual(right.scenePresence.seats,[b]);
  assert.equal(authority.require(flesh).scene,ls);assert.equal(ls.actors.includes(flesh),false);
  assert.equal(left.objectiveServices,left.input.bounty.input.objectives);
  left.activatePresence(authority);
  const foreign=new NativeAreaActorAuthority({seats:campaign.seats});assert.throws(()=>left.activatePresence(foreign),/identical campaign/);
  const replacement=new NativeAreaActorAuthority<object>(campaign);replacement.register(ls,{});assert.throws(()=>left.activatePresence(replacement),/cannot be replaced/);
 });
 checked('geometry and ecology keep the same admitted physical roster',()=>{
  assert.deepEqual(left.input.geometry.seats,[a]);assert.deepEqual(right.input.geometry.seats,[b]);
  assert.deepEqual(left.input.ecology.host.seats,[a]);assert.deepEqual(right.input.ecology.host.seats,[b]);
 });
 checked('party scaling honors local attendance and native near/far radius',()=>{
  const companion=add('scale-local');companion.actor.pos={...at};ls.actors.push(companion.actor);authority.claim(lb,[companion.actor]);
  const enemy=left.input.population.createMonster('dire_wolf',1,'enemy');enemy.pos={...at};
  const apply=()=>{left.input.population.factory.applyPartyScale(enemy);return enemy.sheet.getSourceMods('partyScale');};
  COOP_SCALING.shareRadius=100;
  assert.deepEqual(apply(),[mod('life','more',coopScale(2).life),mod('damage','more',coopScale(2).damage)]);
  companion.actor.pos={x:at.x+1000,y:at.y};
  assert.deepEqual(apply(),undefined,'distant local and coincident neighboring seat cannot inflate this foe');
  COOP_SCALING.shareRadius=0;
  assert.deepEqual(apply(),[mod('life','more',coopScale(2).life),mod('damage','more',coopScale(2).damage)]);
  authority.release(lb,[companion.actor]);ls.actors=ls.actors.filter(x=>x!==companion.actor);
  assert.deepEqual(apply(),undefined,'radius zero still excludes physically absent campaign seats');
 });

 checked('foreign presence bindings cannot construct reward/completion owners',()=>{
  assert.throws(()=>new NativeAreaSceneLoot({...left.lootController.input,scenePresence:right.scenePresence}),/identical scene/);
  assert.throws(()=>new NativeAreaSceneObjectiveCompletion({...left.objectiveController.input,scenePresence:right.scenePresence}),/identical geometry/);
 });
 for(const radius of [0,100]){
  COOP_SCALING.shareRadius=radius;
  checked('XP stays on its area at equal coordinates, shareRadius='+radius,()=>{
   const xa=a.meta.xp,xb=b.meta.xp;
   left.objectiveController.grantXp(25,at,a);assert.equal(a.meta.xp,xa+25);assert.equal(b.meta.xp,xb);
   right.objectiveController.grantXp(17,at,b);assert.equal(a.meta.xp,xa+25);assert.equal(b.meta.xp,xb+17);
   assert.equal(body.level,1);assert.equal(flesh.level,1);
  });
  checked('rotating spoils use the same physical roster, shareRadius='+radius,()=>{
   const deals:string[][]=[];
   campaign.dropRuleOf=()=>({rule:'owner',allocation:'rotate',freeAfterSec:0,deal:(seats:readonly string[])=>{deals.push([...seats]);return seats[0]??null;}});
   for(const [area,seat] of [[left,a],[right,b]] as const){
    const before=area.input.physical.input.state.drops.length;
    area.lootController.dropEssenceAt(at,{essence:'glimmering',count:2});
    assert.equal(area.input.physical.input.state.drops.length,before+1);
    area.lootController.ownSpoils(before,seat,at);
    assert.equal(area.input.physical.input.state.drops[before].owner,seat.id);
   }
   assert.deepEqual(deals,[[a.id],[b.id]]);
  });
 }
 checked('quest discovery narrows physical attendance while ledgers stay campaign-wide',()=>{
  const ledger=w.questLedgerOf(b),row={questId:'presence_course',zoneId:ls.zone.id,fieldDone:false};
  ledger.active.push(row);assert.equal(left.objectiveController.questOnZone(ls.zone.id),false);
  assert.equal(right.objectiveController.questOnZone(ls.zone.id),true);
  assert.equal(left.objectiveController.input.quests.questLedgerOf(b),ledger);
  w.questLedgerOf(a).active.push({...row});assert.equal(left.objectiveController.questOnZone(ls.zone.id),true);
 });
 checked('native restored drop array remains the physical reward sink',()=>{
  const physical=left.input.physical,before=physical.input.state.drops;
  physical.restoreZoneContents(physical.captureZoneContents());
  assert.notEqual(physical.input.state.drops,before);
  const n=physical.input.state.drops.length;left.lootController.dropEssenceAt(at,{essence:'coarse',count:1});
  assert.equal(physical.input.state.drops.length,n+1);assert.equal(before.length,n);
 });
 checked('borrowed coordinate-overlapping body cannot acquire attendance',()=>{
  ls.actors.push(b.actor);assert.deepEqual(left.scenePresence.seats,[a]);
  assert.throws(()=>authority.assertAdmitted(ls),/borrowed body/);ls.actors=ls.actors.filter(x=>x!==b.actor);
 });
 checked('controlled-body transfer moves attendance and carried hero authority together',()=>{
  ls.actors=ls.actors.filter(x=>x!==body);rs.actors.push(body);authority.transfer(body,lb,rb);
  assert.deepEqual(left.scenePresence.seats,[]);assert.deepEqual(right.scenePresence.seats,[a,b]);
  assert.equal(authority.require(flesh).scene,rs);
  COOP_SCALING.shareRadius=0;const xa=a.meta.xp,xb=b.meta.xp;
  left.objectiveController.grantXp(100,at);assert.equal(a.meta.xp,xa);assert.equal(b.meta.xp,xb);
  right.objectiveController.grantXp(7,at);assert.equal(a.meta.xp,xa+7);assert.equal(b.meta.xp,xb+7);
 });
 checked('removed controlled body stops attendance even before authority cleanup',()=>{
  rs.actors=rs.actors.filter(x=>x!==body);assert.deepEqual(right.scenePresence.seats,[b]);assert.throws(()=>authority.require(flesh),/Stale/);
  rs.actors.push(body);assert.deepEqual(right.scenePresence.seats,[a,b]);
 });
 checked('new admitted campaign seat joins the live physical roster',()=>{
  const late=add('late-admitted');late.actor.pos={...at};late.meta.xp=0;late.meta.xpNeeded=1e12;
  rs.actors.push(late.actor);assert.equal(right.scenePresence.seats.includes(late),false);authority.claim(rb,[late.actor]);
  assert.equal(right.scenePresence.seats.includes(late),true);assert.equal(left.scenePresence.seats.includes(late),false);
  const original=campaign.seats;campaign.seats=original.filter(s=>s!==late);
  assert.equal(right.scenePresence.seats.includes(late),false);campaign.seats=original;
  assert.equal(right.scenePresence.seats.includes(late),true);
 });
 console.log('PASS native area presence: '+checks.length+' courses; two real native births, local XP/spoils/quest census, native carried shapeshift, live transfer and restored drops');
});}finally{COOP_SCALING.shareRadius=priorRadius;}
