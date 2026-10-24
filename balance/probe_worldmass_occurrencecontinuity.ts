import assert from 'node:assert/strict';
import { makeSimWorld } from '../src/sim/arena';
import { seedGlobalRandom } from '../src/sim/rng';
import { STAT_DEFS } from '../src/engine/stats';
import type { Actor } from '../src/engine/actor';
import type { OccHost, OccKinSpec } from '../src/engine/occurrences';
import { FACTIONS, MONSTERS } from '../src/data/monsters';
import { address, moveAddress } from '../src/worldmass/address';
import { WorldMassRuntime } from '../src/worldmass/runtime';
import { massAdventure, MASS_ZONE } from '../src/worldmass/preset';
import { townStationFeatures } from '../src/data/townBuild';
import { serializeCharacter, applySavedCharacter } from '../src/meta/character';
import type { World, ZoneExit } from '../src/engine/world';
import { MassNativeHost, nativeWorldCapabilities } from '../src/worldmass/nativeHost';
import { MassNativeResidency, type NativeFeaturePlacement, type NativeResidencySave } from '../src/worldmass/nativeResidency';
import type { MassOccurrenceBirth, MassOccurrencesSave } from '../src/worldmass/occurrences';
import type { Doodad } from '../src/engine/levelgen';
import type { RecoveryPolicy } from '../src/world/regions';
import { canonical } from '../src/worldmass/random';

const restore=seedGlobalRandom(89211);
const body=(a:Actor)=>({monster:a.defId,level:a.level,life:a.life,maxLife:a.maxLife(),pos:a.pos,tag:a.tag,
  stats:Object.fromEntries(Object.keys(STAT_DEFS).map(k=>[k,a.sheet.get(k)])),skills:a.skills.map(s=>s?.def.id)});
try {
  const world=makeSimWorld('warrior',89211);world.zone={...world.zone,level:11};
  const native=(world as unknown as {occHost():OccHost}).occHost();
  const faction=Object.entries(FACTIONS).find(([,f])=>f.table.some(e=>{const d=MONSTERS[e.id];return d&&(d.boss||d.passive||d.spawner);})
    &&f.table.some(e=>{const d=MONSTERS[e.id];return d&&!d.boss&&!d.passive&&!d.spawner;}));assert.ok(faction);
  const cases:OccKinSpec[]=[{kin:[{id:'abyssal_crawler',weight:4},{id:'abyssal_wretch',weight:1}],levelBonus:2,tag:'owned-native-proof'},
    {kin:[{id:'missing_native_occurrence_kin',weight:1}],faction:faction[0]}];
  for(const [i,spec]of cases.entries()){
    const table=world.massOccurrenceSpawnTable(spec);assert.ok(table.length);
    if(i===1)assert.ok(table.every(e=>!MONSTERS[e.id].boss&&!MONSTERS[e.id].spawner&&!MONSTERS[e.id].passive));
    const seed=2231+i,before=[...world.actors],at={x:800,y:600},band:[number,number]=[40,130],count=7;
    const unseed=seedGlobalRandom(seed);try{assert.equal(native.pour(spec,at.x,at.y,band,count),count);}finally{unseed();}
    const expected=world.actors.filter(a=>!before.includes(a)).map(body),published=[...world.actors],random=Math.random;
    const request:MassOccurrenceBirth={owner:'factory-parity',geographicZone:'zone',site:0,sequence:0,seed,zone:world.zone,spec,table,at,band,count};
    const actual=world.createMassOccurrenceBodies(request);
    assert.deepEqual(world.actors,published,'detached native factory must not publish actors');assert.equal(Math.random,random);
    assert.deepEqual(actual.map(body),expected,'native seeded pour and detached factory must be identical');
  }
  console.log('PASS native occurrence factory parity: exact species, levels, wounds, full stat evaluations, skill identities, positions, fallback faction filtering and no detached publication');

  const config=structuredClone(massAdventure());delete config.nativeCountry;delete config.geography;
  const w=makeSimWorld('warrior',89212),runtime=new WorldMassRuntime(99,'occurrence-continuity',config);runtime.attach(w);w.time=1000;
  const span=960,frame=address('surface',runtime.origin.cx,runtime.origin.cy,0,0,span);
  const placement=(id:string,x:number):NativeFeaturePlacement=>({id,origin:moveAddress(frame,{x,y:6000},span),
    request:{id,seed:23,source:{kind:'massif',id:'well_court',tileset:'courtland',scope:'landform',poolIndex:1},level:5}});
  const a=placement('native-event-a',6000),b=placement('native-event-b',10000),spec={run:'occurrence-continuity',addressSpan:span,maxBlueprints:4,maxResidents:2,maxCandidates:2};
  let budget=7;
  const makeHost=(saved?:NativeResidencySave):MassNativeHost=>{const h:MassNativeHost=new MassNativeHost(w,{population:()=>h.population,maxPopulation:()=>budget,
    zoneOwner:pos=>pos.x>14000?'other-physical-zone':'same-physical-zone',quietSeconds:12,retainRadius:512},saved);return h;};
  let host=makeHost(),res=new MassNativeResidency(spec,()=>[],nativeWorldCapabilities(),()=>frame);runtime.nativeFeatures=res;
  const savedEvent=(id:string):MassOccurrencesSave=>(res.snapshot(w.time).born.find(r=>r.placement.id===id)!.changes.native as {occurrences:MassOccurrencesSave}).occurrences;
  const before=[...w.actors],scenery=[...w.doodads];
  assert.ok(res.sync([a],host).deferred.includes(a.id));assert.deepEqual(w.actors,before);assert.deepEqual(w.doodads,scenery);assert.equal(host.population,0);
  budget=8;assert.ok(res.sync([a],host).admitted.includes(a.id));assert.equal(host.population,8,'armed initial wave owns its full maximum reservation');
  const site=host.occurrences.views()[0];w.player.pos={...site.pos};host.updateOccurrences(19,[]);
  assert.equal(savedEvent(a.id).sites[0].bank,19);assert.equal(savedEvent(a.id).sites[0].state,'armed');
  w.player.pos={x:-20000,y:-20000};assert.ok(res.sync([],host).retired.includes(a.id));const partial=res.snapshot(w.time);
  w.time+=100;host=makeHost(partial);res=new MassNativeResidency(spec,()=>[],nativeWorldCapabilities(),()=>frame,partial);runtime.nativeFeatures=res;
  assert.ok(res.sync([a],host).admitted.includes(a.id));assert.equal(savedEvent(a.id).sites[0].bank,19);
  w.player.pos={...site.pos};host.updateOccurrences(11,[]);
  let event=savedEvent(a.id);assert.equal(event.sites[0].state,'sprung');assert.equal(event.births.length,1);assert.ok(event.births[0].bodies.length>=5&&event.births[0].bodies.length<=8);
  assert.equal(host.population,event.births[0].bodies.length,'released wave reservation is replaced by all native bodies');
  console.log('PASS actual generated fracture capacity preflight and exact partial dwell/scenery retirement/restore; the initial native wave is never truncated');

  w.player.pos={x:-20000,y:-20000};budget=32;w.time+=20;host.updateOccurrences(0,[]);w.time+=20;host.updateOccurrences(0,[]);
  event=savedEvent(a.id);assert.ok(event.births.flatMap(r=>r.bodies).filter(r=>!r.dead).length>=6);
  const dueAt=event.sites[0].pourAt;assert.ok(dueAt>w.time);
  const survivor=w.actors.find(actor=>event.births.some(r=>r.bodies.some(b=>b.actorId===actor.id))&&!actor.dead)!;assert.ok(survivor);
  survivor.life*=.63;const wound=survivor.life;
  w.player.aiTargetId=survivor.id;assert.ok(res.sync([],host).deferred.includes(a.id),'foreign target must pin native owner');delete w.player.aiTargetId;
  const scar=w.doodads.find(d=>d.kind==='abyss_crack')!;scar.contactSource=survivor;
  assert.ok(res.sync([],host).deferred.includes(a.id),'live native decor dependency must pin its exact owner');delete scar.contactSource;
  assert.ok(res.sync([],host).retired.includes(a.id));const dormant=res.snapshot(w.time);w.time+=100;
  host=makeHost(dormant);res=new MassNativeResidency(spec,()=>[],nativeWorldCapabilities(),()=>frame,dormant);runtime.nativeFeatures=res;
  assert.ok(res.sync([b],host).admitted.includes(b.id));const second=host.occurrences.views().find(r=>r.owner===b.id)!;w.player.pos={...second.pos};host.updateOccurrences(30,[]);
  for(const actor of [...w.actors])if(actor.tag==='occ_born'&&!actor.dead)w.kill(actor,false,w.player);
  const reward=canonical([w.drops,w.orbs,w.meta.xp]);
  w.time+=20;host.updateOccurrences(0,[]);w.time+=20;host.updateOccurrences(0,[]);
  assert.equal(savedEvent(b.id).births.length,1,'unhydrated first site survivors must cap the second site recurring pour');
  assert.equal(canonical([w.drops,w.orbs,w.meta.xp]),reward,'clock/census must not replay native kill rewards');
  w.player.pos={x:-20000,y:-20000};w.time+=20;assert.ok(res.sync([],host).retired.includes(b.id));
  assert.ok(res.sync([a],host).admitted.includes(a.id));event=savedEvent(a.id);
  assert.equal(event.sites[0].pourAt,dueAt,'dormant fixture retains its absolute native world-clock');
  assert.equal(event.births.flatMap(b=>b.bodies).filter(b=>!b.dead&&b.life===wound).length,1,'exact survivor wound must return once');
  const oldBirths=event.births.length;host.updateOccurrences(0,[]);event=savedEvent(a.id);
  assert.ok(event.sites[0].pourAt>w.time);assert.ok(event.births.length<=oldBirths+1,'absence can settle at most one native beat');
  assert.equal(canonical([w.drops,w.orbs,w.meta.xp]),reward,'restore must not replay payout');
  console.log('PASS same-zone dormant census, exact survivor wound, foreign/decor pins, native world-clock due-beat continuity and no duplicate native payout after return');
  const c=placement('native-event-c',16000);assert.ok(res.sync([a,c],host).admitted.includes(c.id));
  w.player.pos={...host.occurrences.views().find(v=>v.owner===c.id)!.pos};host.updateOccurrences(30,[]);
  const cIds=new Set(savedEvent(c.id).births.flatMap(r=>r.bodies.map(b=>b.actorId)));
  for(const actor of [...w.actors])if(cIds.has(actor.id)&&!actor.dead)w.kill(actor,false,w.player);
  w.time+=20;host.updateOccurrences(0,[]);w.time+=20;host.updateOccurrences(0,[]);
  assert.ok(savedEvent(c.id).births.length>1,'another physical zone owns an independent native tag cap');
  console.log('PASS same native tag in a neighboring geographic zone does not consume this zone fixture census');

  const context={...w.zone,theme:{...w.zone.theme,pitfall:{kind:'fall' as const,to:'lastNode' as const}}};
  w.zone={...w.zone,theme:{...w.zone.theme,pitfall:{kind:'descend'}}};
  const owned:Doodad={pos:{x:200,y:200},radius:30,kind:'abyssal_rent',fall:true},other:Doodad={pos:{x:400,y:200},radius:30,kind:'abyssal_rent',fall:true};
  w.doodads.push(other);const remove=w.installMassOccurrenceDecor('pit-proof',context,[owned]);
  const pit=w as unknown as {pitPolicyFor(policy:RecoveryPolicy,at:{x:number;y:number}):RecoveryPolicy};
  assert.equal(pit.pitPolicyFor({kind:'fall',to:'edge'},owned.pos).kind,'fall');
  assert.equal(pit.pitPolicyFor({kind:'fall',to:'edge'},other.pos).kind,'descend');
  remove();assert.ok(!w.doodads.includes(owned)&&w.doodads.includes(other));assert.equal(pit.pitPolicyFor({kind:'fall',to:'edge'},owned.pos).kind,'descend');
  console.log('PASS exact owned native pit context and scenery removal preserve unrelated native falls');
} finally {restore();}


// Cross the actual native scene boundary while the living feature remains resident.
const caveUndo=seedGlobalRandom(89331);
try {
  type Mouth={pos:{x:number;y:number};kind:string;seed:number};
  type CaveAccess={caveEntrances:Mouth[];enterSidezone(mouth:Mouth):void;travelThrough(exit:ZoneExit):void};
  const caveAccess=(world:World)=>world as unknown as CaveAccess;
  const fresh=(seed:number)=>{const world=makeSimWorld('warrior',seed);for(const f of townStationFeatures())world.account.features.add(f);world.startWorldMass(seed);return world;};
  const world=fresh(42),mass=world.massRuntime!,hero=world.player;
  const hatch=caveAccess(world).caveEntrances.find(e=>e.kind==='cellar_hatch');assert.ok(hatch);
  const host=(mass as unknown as {nativeHost:MassNativeHost}).nativeHost;
  const placement:NativeFeaturePlacement={id:'native-event-cave-proof',origin:mass.walk.at(10000,6000),
    request:{id:'native-event-cave-proof',seed:23,source:{kind:'massif',id:'well_court',tileset:'courtland',scope:'landform',poolIndex:1},level:5}};
  assert.ok(mass.nativeFeatures!.sync([placement],host).admitted.includes(placement.id));
  const site=host.occurrences.views().find(v=>v.owner===placement.id)!;assert.ok(site);world.player.pos={...site.pos};world.time+=30;host.updateOccurrences(30,[]);
  const eventOf=(saved:NativeResidencySave)=>{const native=saved.born.find(b=>b.placement.id===placement.id)!.changes.native as {occurrences:MassOccurrencesSave};return native.occurrences;};
  const initial=eventOf(mass.snapshot(world).nativeFeatures!);assert.equal(initial.births.length,1);
  const living=initial.births.flatMap(b=>b.bodies).filter(b=>!b.dead);assert.ok(living.length>=5);
  const hurt=world.actors.find(a=>a.id===living[0].actorId)!;hurt.life*=.61;const wound=hurt.life;
  // No streaming tick intervenes: this tests the scene snapshot itself, with the wave active.
  world.landPartyAt(hatch.pos);caveAccess(world).enterSidezone(hatch);assert.equal(world.player,hero);assert.equal(world.massRuntime,null);assert.ok(world.inCave);
  const save=serializeCharacter(world),savedEvent=eventOf(save.world!.worldmass!.nativeFeatures!);
  assert.equal(savedEvent.births.length,1);assert.equal(savedEvent.births.flatMap(b=>b.bodies).filter(b=>!b.dead).length,living.length);
  assert.ok(savedEvent.births.flatMap(b=>b.bodies).some(b=>b.life===wound));
  assert.ok(!save.world!.memory?.some(m=>m.zoneId===MASS_ZONE),'boundless native scene memory must not copy occurrence actors');
  const next=fresh(51);assert.ok(applySavedCharacter(next,save));assert.ok(next.adoptWorldState(save.world));next.startWorldMass(42,save.world!.worldmass);assert.ok(next.restoreMassSideareas(save.world!.massSideareas));
  assert.ok(next.inCave);assert.equal(next.massRuntime,null);const exit=next.exits.find(e=>e.to===MASS_ZONE);assert.ok(exit);caveAccess(next).travelThrough(exit);
  assert.equal(next.zone.id,MASS_ZONE);assert.ok(next.massRuntime);const returned=(next as World).massRuntime!;
  next.player.pos={...site.pos};returned.update(next,true);
  const after=eventOf(returned.snapshot(next).nativeFeatures!);
  const stable=(event:MassOccurrencesSave)=>event.births.map(b=>({request:b.request,bodies:b.bodies.map(a=>({key:a.key,monster:a.monster,dead:a.dead,life:a.life,pos:a.pos,tag:a.tag}))}));
  assert.deepEqual(stable(after),stable(savedEvent),'surface restore preserves exact births, wounds and locations without repeating the initial wave');
  const actual=next.actors.filter(a=>a.tag==='occ_born'&&!a.dead);assert.equal(actual.length,living.length,'native ZoneMemory and feature checkpoint must never double the living wave');
  assert.equal(actual.filter(a=>a.life===wound).length,1);
  console.log('PASS living generated occurrence survives real cellar descent, cave CharacterSave Continue and physical return exactly once without native ZoneMemory duplication');
} finally {caveUndo();}
