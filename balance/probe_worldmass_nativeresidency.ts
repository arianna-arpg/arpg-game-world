import assert from 'node:assert/strict';
import { makeSimWorld } from '../src/sim/arena';
import { seedGlobalRandom } from '../src/sim/rng';
import { address, moveAddress, type MassAddress } from '../src/worldmass/address';
import { compileNativeFeature, resolveNativeFeature } from '../src/worldmass/nativeFeatures';
import { MassNativeResidency, translateNativeFeature, type NativeFeatureHost, type NativeFeatureInstance,
  type NativeFeaturePlacement } from '../src/worldmass/nativeResidency';
import { canonical } from '../src/worldmass/random';
import type { MassTerrain } from '../src/worldmass/contracts';

const restore=seedGlobalRandom(13814);
try{
  const w=makeSimWorld('warrior',13814);w.doodads=[];w.structures=[];
  const span=960,frame:MassAddress=address('surface','0','0',0,0,span);
  const placements:NativeFeaturePlacement[]=Array.from({length:7},(_,i)=>({
    id:'native-owner:'+i,origin:moveAddress(frame,{x:i*3000,y:0},span),
    request:{id:'native-owner:'+i,seed:42+i,source:{kind:'structure',id:'marble_monastery',tileset:'downs'}}}));
  const descriptors=placements.map(p=>resolveNativeFeature(p.request));
  assert.ok(descriptors.every(d=>d.unsupported.length===0));
  const caps=new Set(descriptors.flatMap(d=>d.requirements));
  const provider=(at:MassAddress)=>placements.filter(p=>{
    const x=Number(BigInt(at.cx)-BigInt(p.origin.cx))*span+at.x-p.origin.x;
    const y=Number(BigInt(at.cy)-BigInt(p.origin.cy))*span+at.y-p.origin.y;
    return x>=-120&&y>=-120&&x<=1920&&y<=1920;
  });
  const cfg={run:'native-residency-probe',addressSpan:span,maxBlueprints:4,maxResidents:1,maxCandidates:2};
  const residency=new MassNativeResidency(cfg,provider,caps,()=>frame);
  const live=new Map<string,NativeFeatureInstance>(),pinned=new Set<string>(),hostState=new Map<string,number>();
  const host:NativeFeatureHost={clock:10,install(instance,saved){
    const previous=saved as {counter:number}|undefined;
    hostState.set(instance.id,previous?.counter??1);
    live.set(instance.id,instance);
    w.doodads.push(...instance.layout.doodads);w.structures.push(...(instance.layout.structures??[]));w.markDoodadsChanged();
    return {
      canRetire:()=>!pinned.has(instance.id),
      capture:()=>({counter:hostState.get(instance.id)!}),
      hasDoodad:d=>w.doodads.includes(d),
      detach(){
        const pieces=new Set(instance.layout.doodads),structures=new Set(instance.layout.structures??[]);
        w.doodads=w.doodads.filter(d=>!pieces.has(d));w.structures=w.structures.filter(s=>!structures.has(s));
        w.markDoodadsChanged();live.delete(instance.id);
      },
    };
  }};
  const first=descriptors[0],nativeDoor=first.geometry.layout.doodads.find(d=>d.door)!;
  const doorAt=moveAddress(placements[0].origin,nativeDoor.pos,span);
  const terrain:MassTerrain={region:'ground',color:'#445522',biome:'downs',fields:{elevation:.3},
    source:{generator:'base',version:1,rule:'base',source:'test',stream:'test'}};
  const before=residency.sample(doorAt,terrain);
  assert.notEqual(before.source.generator,'base');
  assert.equal(residency.stats.resident,0);assert.equal(w.doodads.length,0,'cold physics query cannot install scenery or actors');
  assert.ok(residency.obstacleAt(doorAt,12),'real native door shape collides before residency');
  assert.equal(residency.regionAt(moveAddress(placements[0].origin,{x:15,y:15},span)),undefined);
  assert.equal(residency.sample(moveAddress(placements[0].origin,{x:15,y:15},span),terrain),terrain,'transparent ground keeps exact base sample');
  residency.sync([placements[0]],host);
  const a=live.get(placements[0].id)!;
  assert.equal(residency.sample(doorAt,terrain).region,before.region,'cold and admitted native floor agree');
  const physicalDoor=a.layout.doodads.find(d=>d.door)!;
  assert.ok(w.pointInSolid(physicalDoor.pos.x,physicalDoor.pos.y,12),'cold shape agrees with native World collision');
  const structureDoor=a.layout.structures!.flatMap(s=>s.doors).find(d=>d.door.id===physicalDoor.door!.id)!;
  assert.equal(structureDoor.door,physicalDoor.door,'live metadata rejoins native shared door identity');
  console.log('PASS exact native terrain and scenery collision before/after admission; transparent cells preserve continuous base');

  // Use the actual native door pipeline at feature-local origin, then prove the
  // exact native grid edit and scenery state survive cache and owner eviction.
  w.walk=a.blueprint.grid!;
  w.setDoorState(physicalDoor.door!.id,'open',{silent:true});
  assert.equal(physicalDoor.door!.open,true);
  assert.equal(structureDoor.door.open,true);
  assert.equal(residency.obstacleAt(doorAt,12),null);
  assert.equal(residency.regionAt(doorAt),'ground');
  assert.ok(residency.revisionAt(doorAt)>0,'native grid mutation invalidates its physical terrain pages');
  const untouched=moveAddress(frame,{x:25000,y:25000},span);
  assert.equal(residency.revisionAt(untouched),0,'unrelated pages retain their revision');
  hostState.set(a.id,7);
  const removed=a.layout.doodads.find(d=>!d.door)!;
  const removedIndex=a.layout.doodads.indexOf(removed);
  w.doodads=w.doodads.filter(d=>d!==removed);w.markDoodadsChanged();
  pinned.add(a.id);
  const deferred=residency.sync([placements[1]],host);
  assert.ok(deferred.deferred.includes(placements[1].id));
  assert.equal(residency.stats.resident,1);assert.ok(live.has(a.id),'dependent native owner cannot be evicted by the budget');
  pinned.clear();
  const crossing=residency.sync([placements[1]],host);
  assert.ok(crossing.retired.includes(a.id)&&crossing.admitted.includes(placements[1].id));
  assert.equal(residency.stats.resident,1);
  const b=live.get(placements[1].id)!,bd=b.layout.doodads.find(d=>d.door)!;
  assert.notEqual(bd.door!.id,physicalDoor.door!.id,'repeated native structures do not share door identities');
  assert.ok(bd.pos.x>3000&&b.layout.structures![0].rect.x>3000);
  assert.ok(w.pointInSolid(bd.pos.x,bd.pos.y,12),'translated native true shape collides at its physical position');
  const lookup=residency.gridAt(bd.pos)!;
  assert.equal(lookup.id,b.id);assert.equal(lookup.offset.x,3000);
  lookup.grid.fillRegion(bd.pos.x-lookup.offset.x,bd.pos.y-lookup.offset.y,
    bd.pos.x-lookup.offset.x,bd.pos.y-lookup.offset.y,'ground');
  assert.equal(residency.regionAt(moveAddress(placements[1].origin,descriptors[1].geometry.layout.doodads.find(d=>d.door)!.pos,span)),'ground');
  console.log('PASS real native door opening, mutation revision, translated grid lookup, unique native identities and dependency-pinned admission');

  for(let i=2;i<placements.length;i++){
    residency.sync([placements[i]],host);
    assert.ok(residency.stats.blueprints<=cfg.maxBlueprints&&residency.stats.resident<=cfg.maxResidents);
  }
  const saved=residency.snapshot(host.clock);
  assert.ok(saved.born.length>=placements.length);
  const original=saved.born.find(r=>r.placement.id===a.id)!;
  assert.ok(original.changes.grid.length>0);
  assert.ok(original.changes.doodads.some(([i,d])=>i===removedIndex&&d===null));
  assert.equal((original.changes.native as {counter:number}).counter,7);
  assert.ok(original.changes.doodads.length<original.descriptor.geometry.layout.doodads.length,'checkpoint records only changed pieces');
  residency.sync([],host);assert.equal(w.doodads.length,0);assert.equal(w.structures.length,0);
  const resumed=new MassNativeResidency(cfg,provider,caps,()=>frame,JSON.parse(JSON.stringify(saved)));
  assert.equal(resumed.regionAt(doorAt),'ground','cold Continue reads the saved opened floor');
  assert.equal(resumed.obstacleAt(doorAt,12),null,'cold Continue reads the saved open slab');
  resumed.sync([placements[0]],host);
  const restored=live.get(a.id)!;
  assert.ok(restored.layout.doodads.find(d=>d.door)!.door!.open);
  assert.equal(restored.layout.doodads[removedIndex].gone,true);
  assert.equal(hostState.get(a.id),7);
  const again=resumed.snapshot(host.clock),restoredRow=again.born.find(r=>r.placement.id===a.id)!;
  assert.equal(canonical(restoredRow.descriptor),canonical(original.descriptor),'exact born native geometry persists across cold cache retirement');
  const refused=new MassNativeResidency(cfg,provider,new Set(['terrain','scenery','state']),()=>frame);
  assert.equal(refused.regionAt(doorAt),undefined,'unsupported native lifecycle refuses the whole feature');
  assert.ok(refused.refusals(placements[0].id).some(x=>x==='capability:doors'));
  assert.equal(refused.stats.born,0,'refused features never become durable false discoveries');
  assert.throws(()=>new MassNativeResidency({...cfg,run:'foreign'},provider,caps,()=>frame,saved),/another world/);
  assert.throws(()=>resumed.sync([{...placements[0],origin:moveAddress(frame,{x:30,y:0},span)}],host),/cannot move/);
  console.log('PASS bounded hydrated residency, sparse native mutations, complete owner state, exact cold Continue and refusal before partial admission');

  const coldSecond=new MassNativeResidency(cfg,provider,caps,()=>frame);
  const secondDoor=descriptors[1].geometry.layout.doodads.find(d=>d.door)!;
  const secondAt=moveAddress(placements[1].origin,secondDoor.pos,span);
  const coldPiece=coldSecond.obstacleAt(secondAt,12)!.doodad;
  assert.equal(coldPiece.pos.x,secondDoor.pos.x+3000);assert.ok(Object.isFrozen(coldPiece));
  assert.ok(coldPiece.door!.id.startsWith(placements[1].id+'::'));
  assert.equal(coldSecond.contextAt(secondAt),undefined,'a structure primitive cannot claim the source tileset environmental mechanics');
  assert.ok(coldSecond.intersects(secondAt,80));assert.equal(coldSecond.stats.resident,0);
  assert.equal(refused.intersects(doorAt,80),false,'whole-feature refusal never erases ordinary scenery space');
  let installed=false;
  const blockedHost:NativeFeatureHost={clock:1,canInstall:()=>false,install(){installed=true;throw Error('must not install');}};
  assert.ok(coldSecond.sync([placements[1]],blockedHost).deferred.includes(placements[1].id));assert.equal(installed,false);
  const broken={...placements[0],id:'invalid-new-source',request:{...placements[0].request,id:'invalid-new-source',source:{kind:'structure' as const,id:'absent-template',tileset:'downs'}}};
  const failure=new MassNativeResidency(cfg,()=>[broken],caps,()=>frame);
  assert.equal(failure.regionAt(doorAt),undefined);
  const reasons=failure.refusals(broken.id);
  assert.ok(reasons.some(r=>r.includes('generation:structure/downs/absent-template')));
  assert.equal(failure.regionAt(doorAt),undefined);assert.equal(failure.refusals(broken.id),reasons,'repeated queries reuse bounded attributable generation failure');
  assert.equal(failure.stats.born,0);
  console.log('PASS translated immutable cold scenery, pure accepted-footprint queries, atomic host deferral and cached native generation failure');
  const inn=compileNativeFeature(resolveNativeFeature({id:'inn-fixture',seed:42,source:{kind:'structure',id:'inn',tileset:'downs'}}));
  const translated=translateNativeFeature(inn,'inn-fixture',{x:-2340,y:900});
  const src=inn.layout.structures![0],dst=translated.structures![0];
  assert.equal(dst.rect.x,src.rect.x-2340);assert.equal(dst.storeys![0].floors[0].y,src.storeys![0].floors[0].y+900);
  assert.equal(dst.doors[0].normal.x,src.doors[0].normal.x,'coordinate transform must never translate a normal vector');
  assert.equal(dst.rooms![0].rects[0].x,src.rooms![0].rects[0].x-2340);
  assert.equal(translated.folk![0].pos.x,inn.layout.folk![0].pos.x-2340);
  assert.equal(translated.folk![0].sid,'inn-fixture::'+inn.layout.folk![0].sid);
  console.log('PASS native rooms, storeys, seats and normals transform by their actual types at negative coordinates');
}finally{restore();}
