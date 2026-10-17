import assert from 'node:assert/strict';
import { mod } from '../src/engine/stats';
import { relayStatusStat, STATUS_RELAYS } from '../src/engine/reception';
import { MAGIC_PACKS } from '../src/data/magicPacks';
import { gunzipSync } from 'node:zlib';
import { makeSimWorld } from '../src/sim/arena';
import { Rng, withSeededRandom } from '../src/core/rng';
import { World, NAV_CFG } from '../src/engine/world';
import { resetActorIdCounter, type Actor } from '../src/engine/actor';
import type { ZoneDef } from '../src/data/zones';
import { WALK_CFG } from '../src/world/gridWalk';
import { PIT_CFG } from '../src/engine/pitfall';
import { hullOf, type Bounds } from '../src/world/shape';
import { isDoodadGround } from '../src/world/regions';
import { generateLayout,doodadRuleOf } from '../src/engine/levelgen';
import { captureNativeGeneration } from '../src/worldmass/nativeGeneration';
import { captureNativeAreaGeometry } from '../src/worldmass/nativeAreaGeometryCapture';
import { serializeNativeAreaData } from '../src/worldmass/nativeAreaGeometry';
import { NativeAreaLocal } from '../src/worldmass/nativeAreaLocal';
import { NativeAreaPopulation } from '../src/worldmass/nativeAreaPopulation';
import { NativeAreaAmbient, type NativeAreaAmbientInput } from '../src/worldmass/nativeAreaAmbient';
import { NativeAreaRandom } from '../src/worldmass/nativeAreaRandom';
import { captureNativeActorState } from '../src/worldmass/dormancy';
// Complete native prepared-load input archive, same source fixture as the prior
// local-area course. No rarity weights are changed. This compares the explicit
// pack/wildlife boundaries, not the intervening full World.load controller order.
const fixtures=JSON.parse(gunzipSync(Buffer.from('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','base64')).toString('utf8')) as {seed:number;zone:ZoneDef;arena:Bounds;entry:{x:number;y:number};exits:{x:number;y:number}[];doodads:number}[];
let pairs=0,bodies=0,attempts=0,draws=0,magic=0,queries=0;
const totals:unknown[]=[];
const stateOf=(a:Actor)=>{const state=captureNativeActorState(a);assert.ok(state,'complete actual actor state must be supported');return state;};
for(const f of fixtures){
 const world=withSeededRandom(f.seed,()=>makeSimWorld('warrior',f.seed)) as any;
 const foreign=withSeededRandom(37,()=>makeSimWorld('warrior',37)) as any;
 const zone=structuredClone(f.zone);zone.exitBoundaries=zone.exitBoundaries?.map(v=>v??undefined);zone.exitRoads=zone.exitRoads?.map(v=>v??undefined);zone.exitMelds=zone.exitMelds?.map(v=>v??undefined);
 for(const ambientSeed of [zone.seed!,713,991])for(const auditMode of (f===fixtures[0]&&ambientSeed===991?['natural','warm','habitat']:['natural'])){
  const generated=new NativeAreaRandom(zone.seed!,ambientSeed);
  const layout=generated.run(rng=>captureNativeGeneration(zone,()=>generateLayout(zone,structuredClone(f.arena),rng,structuredClone(f.entry),structuredClone(f.exits),[]))).value;
  if(ambientSeed===zone.seed)assert.equal(layout.doodads.length,f.doodads);
  const geometry=captureNativeAreaGeometry({sourceIdentity:'whole-native-ambient/'+zone.id,bounds:f.arena,layout});
  const input={zone,geometry,entry:f.entry,playerPosition:f.entry,config:{navigationPad:NAV_CFG.pad,eventSpacing:240,ledgeGrasp:WALK_CFG.ledgeGrasp,pitSweepGran:PIT_CFG.sweepGran}};
  const local=new NativeAreaLocal(input),saved=serializeNativeAreaData(input),start=generated.snapshot();
  world.zone=zone;world.arena=structuredClone(f.arena);world.arenaHull=hullOf(f.arena);world.zoneEntry={...f.entry};world.player.pos={...f.entry};world.player.level=zone.level;
  world.walk=layout.walk??null;world.tierViews=local.tierViews;world.doodads=structuredClone(layout.doodads);world.grounds=world.doodads.filter((d:any)=>isDoodadGround(d.kind));world.bridges=world.doodads.filter((d:any)=>doodadRuleOf(d.kind).spans);world.structures=structuredClone(layout.structures??[]);world.doodadsRev++;world.convexNav=null;world.tierNavs.clear();
  world.fog=null;
  const sourceAmbient=world.nativeAmbientHost(),factory=world.nativeMonsterFactorySources(),promotion=world.nativeMonsterPromotionSources();
  for(const key of ['nextSquadId','createMonster','promoteRarity','promoteMagicPack','wildlifeTableFor','verminPressure'])sourceAmbient[key]=()=>{throw Error('foreign ambient owner '+key);};
  const sources={ambient:sourceAmbient,groups:world.nativeEncounterGroupHost(),factory,promotion,hostility:(World as any).nativeHostilitySources(),relay:(World as any).nativeStatusRelaySources()};
  const campaign={get zoneMap(){return world.zoneMap;},get time(){return world.time;},get visited(){return world.visited;},get surveyed(){return world.surveyed;},get sim(){return world.sim;},continentFor:(...a:any[])=>world.continentFor(...a)};
  const context={get time(){return world.time;},get npcDialogues(){return world.npcDialogues;},applyPartyScale:(a:Actor)=>world.applyPartyScale(a),
   opaqueAt:(_x:number,_y:number)=>false,sanctuaryBlocksCombat:(_a:Actor,_b:Actor)=>false,resolveHit:()=>{throw Error('fresh zero-time preparation attempted a hit');}};
  if(pairs===0){
   const actors=[world.player],population=new NativeAreaPopulation({zone,actors,player:world.player,campaign,sources:(World as any).nativePopulationSources()});
   const playerRelay=Object.getOwnPropertyDescriptor(world.player,'statusRelay')!;
   const valid:NativeAreaAmbientInput={local,population,player:world.player,sources,context,state:{squadSequence:0,bombardMintRev:0,zoneGenTagging:true,magicPackEffects:[],magicPackResolving:false,magicPackRefreshPending:false}};
   let refusals=0,getters=0;
   for(const key of ['local','population','player','sources','context','state'] as const){
    const bad={...valid};Object.defineProperty(bad,key,{enumerable:true,get(){getters++;return valid[key];}});assert.throws(()=>new NativeAreaAmbient(bad));refusals++;
   }
   for(const key of ['squadSequence','bombardMintRev','zoneGenTagging','magicPackEffects','magicPackResolving','magicPackRefreshPending'] as const){
    const state={...valid.state};Object.defineProperty(state,key,{get(){getters++;return valid.state[key];}});assert.throws(()=>new NativeAreaAmbient({...valid,state}));refusals++;
   }
   for(const key of ['opaqueAt','applyPartyScale','sanctuaryBlocksCombat','resolveHit'] as const){
    const badContext=Object.create(context);assert.throws(()=>new NativeAreaAmbient({...valid,context:badContext}));refusals++;
    Object.defineProperty(badContext,key,{get(){getters++;return context[key];}});assert.throws(()=>new NativeAreaAmbient({...valid,context:badContext}));refusals++;
   }
   for(const n of [-1,NaN,Infinity,1.5,Number.MAX_SAFE_INTEGER+1])for(const key of ['squadSequence','bombardMintRev'] as const){
    assert.throws(()=>new NativeAreaAmbient({...valid,state:{...valid.state,[key]:n}}));refusals++;
   }
   assert.equal(getters,0,'binding and initial-state accessors must refuse without evaluation');
   const detached=new NativeAreaPopulation({zone,actors:[],player:world.player,campaign,sources:(World as any).nativePopulationSources()});
   assert.throws(()=>new NativeAreaAmbient({...valid,population:detached}));refusals++;
   const otherZone={...zone,name:zone.name+' foreign'};const foreignPopulation=new NativeAreaPopulation({zone:otherZone,actors,player:world.player,campaign,sources:(World as any).nativePopulationSources()});
   assert.throws(()=>new NativeAreaAmbient({...valid,population:foreignPopulation}));refusals++;
   const bound=new NativeAreaAmbient(valid);valid.state.squadSequence=99;assert.equal(bound.nextSquadId(),0);assert.equal(bound.nextSquadId(),1);
   for(const key of ['population','zone','actors','player','sight','host'])assert.equal(Object.getOwnPropertyDescriptor(bound,key)?.writable,false,'fixed area identity '+key);
   assert.equal(Object.isFrozen(bound.host),true);
   assert.equal(Reflect.set(bound.host,'actors',[]),false,'host cannot detach spawn census');
   assert.equal(bound.host.actors,actors);
   assert.equal(bound.magicPackEffects,valid.state.magicPackEffects,'transfer retains complete effects owner');
   Object.defineProperty(world.player,'statusRelay',playerRelay);
   const optical=local.sight({opaqueAt:()=>false});assert.equal(typeof optical.lineOfSight,'function');
   console.log('PASS complete ambient binding/source/initial-state refusals',refusals);
   const stagedPlayer=world.createMonster('goblin_brute',zone.level,'player') as Actor;stagedPlayer.pos={...f.entry};
   const stagedPopulation=new NativeAreaPopulation({zone,actors:[stagedPlayer],player:stagedPlayer,campaign,sources:(World as any).nativePopulationSources()});
   console.log('PASS detached ambient lifecycle',checkNativeAreaAmbientLifecycle({...valid,population:stagedPopulation,player:stagedPlayer}));
  }
  const nativeFactory=world.createMonster,nativePlayerRelay=Object.getOwnPropertyDescriptor(world.player,'statusRelay')!,playerBefore=structuredClone(world.serializeWorldState().player);
  const run=(isolated:boolean,cold=false)=>{
   resetActorIdCounter(800000);world.actors=[world.player];world.squadSeq=900;world.bombardMintRev=100;world.zoneGenTagging=true;world.magicPackResolving=false;world.magicPackRefreshPending=false;world.magicPackEffects=[];
   const actors:Actor[]=[world.player],population=new NativeAreaPopulation({zone,actors,player:world.player,campaign,sources:(World as any).nativePopulationSources()});
   // Each local lane takes exclusive ownership of detached simulation actors.
   // Classic lanes never construct a local owner.
   let area:NativeAreaAmbient|null=null;
   const made:Actor[]=[],factoryArgs:unknown[]=[],tape:number[]=[],streams=NativeAreaRandom.fromState(JSON.parse(JSON.stringify(start))),oldNext=Rng.prototype.next;
   const receipt=(a:any[])=>({argc:a.length,id:a[0],level:a[1],team:a[2],owner:a[3]?.id,spawn:structuredClone(a[4])});
   world.createMonster=function(...a:any[]){factoryArgs.push(receipt(a));const body=nativeFactory.apply(world,a);made.push(body);return body;};
   Rng.prototype.next=function(){const value=oldNext.call(this);tape.push(value);return value;};
   const blocked=new Map<string,PropertyDescriptor|undefined>();
   const blockStanding=()=>{if(isolated)for(const key of ['zone','actors','lineOfSight','clipShot','hostileTo','enemiesOf','farPoint','findFreeSpot','placeInHabitat','spawnEncounterGroup','refreshMagicPacks','createMonster','pointInSolid','pathField']){
    blocked.set(key,Object.getOwnPropertyDescriptor(world,key));
    Object.defineProperty(world,key,{configurable:true,get(){throw Error('borrowed standing native owner '+key);}});
   }};
   try{
    return streams.run(()=>{
     let preexisting:Actor[]=[];let initialMagic:any;
     if(auditMode==='warm'){
      const roster:Actor[]=world.actors;
      for(const mechanic of ['siphon','arclink']){
       const group:Actor[]=[];
       for(let i=0;i<3;i++){const body=world.createMonster('skeleton_warrior',20,'enemy');
        const pos={x:f.entry.x+170+i*65,y:f.entry.y+(mechanic==='siphon'?70:160)};
        body.pos=world.findFreeSpot(pos,body.radius);
        roster.push(body);group.push(body);preexisting.push(body);}
       assert.equal(world.promoteMagicPack(group,mechanic),true);
      }
      const victim=world.createMonster('skeleton_warrior',20,'player') as Actor;
      victim.faction='player';victim.pos={x:preexisting[0].pos.x+1,y:preexisting[0].pos.y};roster.push(victim);preexisting.push(victim);
      preexisting[0].sheet.setSource('independent relay',[mod(relayStatusStat('grounding'),'flat',1)]);
      preexisting[0].applyStatus(STATUS_RELAYS.grounding.status,11,1.75,'independent original stage',{power:1.2,sourceKey:'audit relay'});
      assert.ok(victim.statuses.some(s=>s.id===STATUS_RELAYS.grounding.status),'actual relay must reach staged recipient');
      assert.ok(!preexisting[0].statuses.some(s=>s.id===STATUS_RELAYS.grounding.status),'original application relayed away');
      world.refreshMagicPacks(MAGIC_PACKS.arclink.beam!.initialDelay);
      assert.ok(preexisting[3].magicPack?.runtime?.beam,'actual preexisting arclink warning');
      initialMagic={states:preexisting.map(stateOf),effects:structuredClone(world.magicPackEffects),ids:preexisting.map(a=>a.id)};
      assert.ok(initialMagic.effects.some((e:any)=>e.kind==='siphon'));
      assert.ok(initialMagic.effects.some((e:any)=>e.kind==='beam'));
     }
     if(isolated){
      actors.push(...world.actors.filter((a:Actor)=>a!==world.player));
      const effects=world.magicPackEffects,initial={squadSequence:world.squadSeq,bombardMintRev:world.bombardMintRev,zoneGenTagging:world.zoneGenTagging,magicPackEffects:effects,magicPackResolving:world.magicPackResolving,magicPackRefreshPending:world.magicPackRefreshPending};
      const before=actors.filter(a=>a!==world.player).map(stateOf),heroBefore=structuredClone(world.serializeWorldState().player);
      // Transfer detached fixture bodies: the old owner no longer holds them.
      world.actors=[];
      area=new NativeAreaAmbient({local:cold?new NativeAreaLocal(structuredClone(input)):local,population,player:world.player,sources,context,state:initial});
      assert.equal(area.magicPackEffects,effects,'explicit effect-array ownership transfer');
      assert.deepEqual(actors.filter(a=>a!==world.player).map(stateOf),before,'only relay capability changes at transfer');
      assert.deepEqual(world.serializeWorldState().player,heroBefore,'native saved hero state survives transfer');
      for(const body of actors)assert.notEqual(body.statusRelay,nativePlayerRelay.value,'existing staged relay transferred');
      const localFactory=area.createMonster;area.createMonster=function(...a:Parameters<NativeAreaAmbient['createMonster']>){factoryArgs.push(receipt(a));const body=localFactory.apply(area,a);made.push(body);return body;};
     }
     blockStanding();
     if(auditMode==='warm'){
      preexisting[0].applyStatus(STATUS_RELAYS.grounding.status,21,2,'after detached transfer',{power:1.3,sourceKey:'second local relay'});
      assert.ok(preexisting[6].statuses.some(s=>s.id===STATUS_RELAYS.grounding.status),'relay reaches staged recipient after transfer');
     }
     const resolved=isolated?area!.resolvePacks():world.effectiveSpawn(zone,world.baseTable(zone));
     // Explicit unavailable-habitat mechanism control, not a natural distribution.
     const chosenTable=auditMode==='habitat'?[{id:'magma_lurker',weight:1}]:resolved.table;
     if(isolated)area!.spawnPacks(resolved.countMul,chosenTable);else world.spawnPacks(zone,resolved.countMul,chosenTable);
     const packRoster:Actor[]=isolated?actors:world.actors;
     const packRows=packRoster.filter(a=>a!==world.player);
     const packBoundary={ids:packRoster.map(a=>a.id),state:packRows.map(stateOf),made:made.map(stateOf),madeIds:made.map(a=>a.id),
      factoryArgs:structuredClone(factoryArgs),shared:packRows.map(a=>packRows.map(b=>!!a.magicPack?.runtime&&a.magicPack.runtime===b.magicPack?.runtime)),
      effects:structuredClone(isolated?area!.magicPackEffects:world.magicPackEffects),random:streams.snapshot(),tape:[...tape],
      squad:isolated?area!.squadSequence:world.squadSeq,bombard:isolated?area!.bombardMintRev:world.bombardMintRev};
     const afterPacks=packRoster.length;
     if(auditMode==='habitat')assert.ok(made.some(a=>!packRoster.includes(a)&&a.defId==='magma_lurker'),'unavailable habitat retains consumed factory attempts');
     if(isolated)area!.spawnWildlife();else world.spawnWildlife(zone);
     const resident:Actor[]=isolated?actors:world.actors;
     const rows=resident.filter(a=>a!==world.player),state=rows.map(stateOf),madeStates=made.map(stateOf);
     const shared=rows.map(a=>rows.map(b=>!!a.magicPack?.runtime&&a.magicPack.runtime===b.magicPack?.runtime));
     return {initialMagic,failed:made.filter(a=>!resident.includes(a)).map(a=>({id:a.id,defId:a.defId})),packBoundary,ids:rows.map(a=>a.id),madeIds:made.map(a=>a.id),factoryArgs,state,made:madeStates,shared,afterPacks,tape,random:streams.snapshot(),resolved,
      effects:structuredClone(isolated?area!.magicPackEffects:world.magicPackEffects),
      squad:isolated?area!.squadSequence:world.squadSeq,bombard:isolated?area!.bombardMintRev:world.bombardMintRev,
      rarity:rows.map(a=>a.rarity??'normal'),magic:rows.filter(a=>a.magicPack).length};
    });
   }finally{
    for(const [key,d]of blocked){if(d)Object.defineProperty(world,key,d);else delete world[key];}
    Rng.prototype.next=oldNext;world.createMonster=nativeFactory;
    Object.defineProperty(world.player,'statusRelay',nativePlayerRelay);
    assert.deepEqual(world.serializeWorldState().player,playerBefore,'zero-time native stage must retain native saved player state');
   }
  };
  // Unrelated standing state and all its geometry/population paths are forbidden.
  for(const key of ['zone','actors','player'])Object.defineProperty(foreign,key,{configurable:true,get(){throw Error('foreign standing '+key);}});
  for(const key of ['lineOfSight','clipShot','hostileTo','enemiesOf','farPoint','findFreeSpot','placeInHabitat','spawnEncounterGroup','refreshMagicPacks','createMonster'])foreign[key]=()=>{throw Error('foreign standing '+key);};
  const a=run(false),b=run(true),c=run(true,true);assert.deepEqual(b,a,zone.id+' native all-rarity ambient stage');assert.deepEqual(c,b,'cold A/B/A complete local stage');
  pairs++;bodies+=a.state.length;attempts+=a.made.length;draws+=a.tape.length;magic+=a.magic;
  assert.equal(serializeNativeAreaData(input),saved,'complete source geometry unchanged');
  const sight=local.sight({opaqueAt:context.opaqueAt});
  for(let y=45;y<f.arena.h;y+=337)for(let x=45;x<f.arena.w;x+=419){const p={x,y},to={x:f.arena.w-x,y:f.arena.h-y};assert.equal(sight.lineOfSight(p,to),world.lineOfSight(p,to));assert.deepEqual(sight.clipShot(p,to),world.clipShot(p,to));queries++;}
  totals.push({zone:zone.id,ambientSeed,auditMode,failed:a.failed.length,doodads:layout.doodads.length,bodies:a.state.length,magic:a.magic});
 }
}
assert.ok(magic>0,'natural complete courses must actually retain magic cohorts');
console.log('PASS native whole-area all-rarity preparation',JSON.stringify({pairs,bodies,attempts,draws,magic,queries,totals}));

/** Call once with a fresh, DETACHED fixture cohort containing its actual native
 * player body. This deliberately transfers/mutates that cohort. Do not reuse an
 * earlier owner after transfer. No fixture archive or foreign World is needed. */
function checkNativeAreaAmbientLifecycle(valid: NativeAreaAmbientInput) {
  const actors=valid.population.actors,player=valid.player,original=valid.context;
  const calls:string[]=[];let clock=71,appearance='',failAppearance=false;
  const context:NativeAreaAmbientInput['context']={
    get time(){calls.push('time');return clock;},
    get npcDialogues(){calls.push('appearance');if(failAppearance)throw Error('late appearance');return {appearanceFor:()=>appearance||undefined};},
    applyPartyScale(a){assert.equal(this,context);calls.push('party');original.applyPartyScale.call(original,a);},
    opaqueAt(...args){assert.equal(this,context);calls.push('optical');return original.opaqueAt.call(original,...args);},
    sanctuaryBlocksCombat(...args){assert.equal(this,context);calls.push('sanctuary');return original.sanctuaryBlocksCombat.call(original,...args);},
    resolveHit(...args){assert.equal(this,context);calls.push('hit');return original.resolveHit.call(original,...args);},
  };
  const input={...valid,context};
  // A stale original owner must not retain initial-body relay authority.
  const foreignRelay:NonNullable<Actor['statusRelay']>=()=>{throw Error('foreign initial relay');};
  for(const actor of actors)actor.statusRelay=foreignRelay;
  const area=new NativeAreaAmbient(input);
  assert.equal(calls.length,0,'constructor must not read lazy birth/geometry services');
  assert.ok(actors.every(a=>a.statusRelay!==foreignRelay));
  assert.equal(area.actors,actors);assert.equal(area.host.actors,actors);
  assert.equal(Reflect.set(area.host,'actors',[]),false);
  for(const key of ['population','actors','player','zone','sources','host'])assert.equal(Reflect.set(area,key,{}),false);

  // Failure after semantic validation but before successful host publication
  // cannot leave a partially transferred cohort.
  const previousRelays=actors.map(a=>a.statusRelay),badSources={...valid.sources};
  Object.defineProperty(badSources,'groups',{get(){throw Error('late groups failure');}});
  assert.throws(()=>new NativeAreaAmbient({...input,sources:badSources}),/late groups failure/);
  actors.forEach((a,i)=>assert.equal(a.statusRelay,previousRelays[i]));
  // A live provider may extend the staged census during final host building.
  // Validate again after that read, before transferring even the first relay.
  const appended=area.createMonster('zombie',10,'enemy');
  Object.defineProperty(appended,'statusRelay',{writable:false,configurable:false});
  const liveGroups=valid.sources.groups,reentrantSources={...valid.sources};
  Object.defineProperty(reentrantSources,'groups',{get(){actors.push(appended);return liveGroups;}});
  try{assert.throws(()=>new NativeAreaAmbient({...input,sources:reentrantSources}),/transferable actor relays/);
    actors.slice(0,-1).forEach((a,i)=>assert.equal(a.statusRelay,previousRelays[i]));
  }finally{assert.equal(actors.pop(),appended);}
  const locked=area.createMonster('zombie',10,'enemy');
  Object.defineProperty(locked,'statusRelay',{writable:false});actors.push(locked);
  try{assert.throws(()=>new NativeAreaAmbient(input),/transferable actor relays/);
    actors.slice(0,-1).forEach((a,i)=>assert.equal(a.statusRelay,previousRelays[i]));
  }finally{actors.pop();}

  // Function authorities are captured once; clock/appearance stay live. Regular
  // functions above independently assert the original context receiver.
  for(const key of ['applyPartyScale','sanctuaryBlocksCombat','opaqueAt','resolveHit'] as const)
    Object.defineProperty(context,key,{value:()=>{throw Error('replaced callback '+key);},writable:true,configurable:true});
  area.createMonster('zombie',11,'enemy');area.hostileTo(player,locked);
  area.sight.lineOfSight(player.pos,{x:player.pos.x+1,y:player.pos.y+1});
  assert.ok(calls.includes('party')&&calls.includes('sanctuary')&&calls.includes('optical'),'real operations exercise captured capabilities');

  const enemy=area.createMonster('zombie',10,'enemy');enemy.pos={x:player.pos.x+100,y:player.pos.y};actors.push(enemy);
  const relayId=Object.keys(STATUS_RELAYS).find(k=>STATUS_RELAYS[k].status==='shock');assert.ok(relayId);
  const arm=(a:Actor)=>a.sheet.setSource('lifecycle relay',[mod(relayStatusStat(relayId),'flat',1)]);
  arm(player);player.applyStatus('shock',0,1,'incoming');
  assert.ok(enemy.statuses.some(s=>s.id==='shock'),'initial native body relays through staged census');
  const born=area.createMonster('goblin_brute',10,'player');born.pos={...player.pos};arm(born);actors.push(born);
  born.applyStatus('shock',0,1,'incoming');
  assert.ok(!born.statuses.some(s=>s.id==='shock'),'new native body also relays through staged census');

  clock=82;appearance='review_appearance';const body=area.createMonster('zombie',11,'enemy');
  assert.equal(body.spawnedAt,82);assert.equal(body.look,appearance);
  const bombard=Object.keys(valid.sources.factory.MONSTERS).find(k=>valid.sources.factory.MONSTERS[k].bombard);assert.ok(bombard);
  const before=area.bombardMintRev,rosterBefore=[...actors];failAppearance=true;
  try{assert.throws(()=>area.createMonster(bombard,40,'enemy'),/late appearance/);}finally{failAppearance=false;}
  assert.equal(area.bombardMintRev,before+1,'native earlier allocation/revision is not rolled back');
  assert.deepEqual(actors,rosterBefore,'factory failure does not publish a body');

  // The actual authored mechanic creates a warning before transfer; retain the
  // exact effect owner and both refresh flags, not just reconstructed values.
  const cohort=Array.from({length:3},()=>area.createMonster('zombie',30,'enemy'));
  cohort.forEach((a,i)=>{a.pos={x:player.pos.x+40+i*30,y:player.pos.y};actors.push(a);});
  assert.equal(area.promoteMagicPack(cohort,'arclink'),true);
  area.refreshMagicPacks(MAGIC_PACKS.arclink.beam!.initialDelay);
  assert.ok(area.magicPackEffects.length>0,'actual native warm beam warning');
  const effects=area.magicPackEffects,state={squadSequence:area.squadSequence,bombardMintRev:area.bombardMintRev,
    zoneGenTagging:area.zoneGenTagging,magicPackEffects:effects,magicPackResolving:true,magicPackRefreshPending:true};
  // Restore own callbacks for the new binding; the former owner is now retired.
  const next=new NativeAreaAmbient({...valid,state});
  assert.equal(next.magicPackEffects,effects);assert.equal(next.magicPackResolving,true);assert.equal(next.magicPackRefreshPending,true);
  assert.equal(next.actors,actors);assert.equal(next.squadSequence,state.squadSequence);assert.equal(next.bombardMintRev,state.bombardMintRev);
  return {lateConstructorFailure:true,postProviderCohortValidation:true,wholeCohortValidation:true,capturedCallbackReceiver:true,initialAndNewbornRelay:true,
    immutableCensus:true,lazyBirthContext:true,nativePartialFailure:true,warmEffects:effects.length,refreshFlags:true};
}
