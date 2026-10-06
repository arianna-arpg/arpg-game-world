import assert from 'node:assert/strict';
import { makeSimWorld } from '../src/sim/arena';
import { seedGlobalRandom } from '../src/sim/rng';
import { blocksMovement, blocksProjectiles, blocksSightOf, hitSurfaceOf, type Doodad } from '../src/engine/levelgen';
import { shapeContains } from '../src/engine/shapes';
import { address, localOffset, moveAddress, type MassAddress } from '../src/worldmass/address';
import { compileNativeFeature, resolveNativeFeature } from '../src/worldmass/nativeFeatures';
import { MassNativeResidency, NATIVE_OBSTACLE_CANDIDATE_CACHE, type NativeFeatureHost, type NativeFeatureInstance, type NativeFeaturePlacement } from '../src/worldmass/nativeResidency';
import { canonical } from '../src/worldmass/random';

const restore=seedGlobalRandom(13814);
try {
  const w=makeSimWorld('warrior',13814);w.doodads=[];w.structures=[];
  const span=960,zero=address('surface','0','0',0,0,span);let frame=zero,providerCalls=0;
  const cfg={run:'obstacle-cache',addressSpan:span,maxBlueprints:4,maxResidents:1,maxCandidates:2};
  const placements:NativeFeaturePlacement[]=Array.from({length:7},(_,i)=>({id:'cache-owner:'+i,
    origin:moveAddress(zero,{x:i*3000,y:0},span),request:{id:'cache-owner:'+i,seed:42+i,
      source:{kind:'structure',id:'marble_monastery',tileset:'downs'}}}));
  const descriptors=placements.map(p=>resolveNativeFeature(p.request));
  const caps=new Set(descriptors.flatMap(d=>d.requirements));
  const provider=(at:MassAddress)=>{
    providerCalls++;if(at.dimension!=='surface')return [];
    return placements.filter(p=>{const q=localOffset(at,p.origin,span,128);return q.x>=-120&&q.y>=-120&&q.x<=1920&&q.y<=1920;});
  };
  const r=new MassNativeResidency(cfg,provider,caps,()=>frame);
  const original=compileNativeFeature(descriptors[0]),door=original.layout.doodads.find(d=>d.door)!;
  const doorAt=moveAddress(zero,door.pos,span);
  assert.ok(r.obstacleAt(doorAt,12));r.obstacleAt(doorAt,12);const afterBirth=providerCalls;
  for(let i=0;i<2000;i++)assert.ok(r.obstacleAt(doorAt,12));
  assert.equal(providerCalls,afterBirth,'repeated exact-point cold blocker reads must not requery native country');
  assert.equal(r.stats.resident,0,'query cache cannot admit scenery');
  const clear=moveAddress(zero,{x:2400,y:2400},span);assert.equal(r.obstacleAt(clear,0),null);const clearCalls=providerCalls;
  for(let i=0;i<2000;i++)assert.equal(r.obstacleAt(clear,12),null);
  assert.equal(providerCalls,clearCalls,'negative candidates are cached without caching a radius-dependent collision result');
  const brute=(pieces:readonly Doodad[],q:{x:number;y:number},radius:number,channel:'move'|'shot'|'sight',present?:(d:Doodad)=>boolean)=>{
    const blocks=channel==='move'?blocksMovement:channel==='shot'?blocksProjectiles:blocksSightOf;
    return pieces.find(d=>(d.tier??0)===0&&!d.gone&&blocks(d)&&shapeContains(hitSurfaceOf(d,channel),d.pos.x,d.pos.y,q.x,q.y,radius)&&(!present||present(d)))??null;
  };
  // Traverse real native slabs/circles near boundaries. A broad-phase cache may
  // reuse the shortlist across margin/channel changes, never the prior result.
  let comparisons=0;
  for(const d of original.layout.doodads.slice(0,60))for(const delta of [{x:0,y:0},{x:17,y:-9},{x:31.25,y:8.5}]){
    const q={x:d.pos.x+delta.x,y:d.pos.y+delta.y},at=moveAddress(zero,q,span);
    for(const channel of ['move','shot','sight'] as const)for(const margin of [-8,0,6,25]){
      const expected=brute(original.layout.doodads,q,margin,channel),actual=r.obstacleAt(at,margin,channel)?.doodad;
      assert.equal(actual?.kind,expected?.kind);assert.deepEqual(actual?.pos,expected?.pos);comparisons++;
    }
  }
  const adjacent=moveAddress(zero,{x:door.pos.x+.0001,y:door.pos.y},span);const count=providerCalls;
  r.obstacleAt(adjacent,0);assert.equal(providerCalls,count+1,'subpixel positions must not alias');
  assert.equal(r.obstacleAt({...doorAt,dimension:'underground'},12),null,'dimension identity must not alias');
  console.log('PASS exact native shape oracle, all channels/margins, subpixel/dimension separation and cached positives/negatives',comparisons,'comparisons');

  let live:NativeFeatureInstance|undefined;const present=new Set<Doodad>();
  const host:NativeFeatureHost={clock:10,install(instance){live=instance;for(const d of instance.layout.doodads)present.add(d);
    w.doodads.push(...instance.layout.doodads);w.structures.push(...(instance.layout.structures??[]));w.markDoodadsChanged();
    return {canRetire:()=>true,capture:()=>({receipt:7}),hasDoodad:d=>present.has(d),detach(){
      for(const d of instance.layout.doodads)present.delete(d);
      w.doodads=w.doodads.filter(d=>!instance.layout.doodads.includes(d));w.structures=[];w.markDoodadsChanged();live=undefined;
    }};
  }};
  r.sync([placements[0]],host);const first=live!,physicalDoor=first.layout.doodads.find(d=>d.door)!;
  w.walk=first.blueprint.grid!;assert.equal(r.obstacleAt(doorAt,12)?.doodad,physicalDoor);
  w.setDoorState(physicalDoor.door!.id,'open',{silent:true});assert.equal(r.obstacleAt(doorAt,12),null,'memoized shortlist must see native door open');
  physicalDoor.door!.open=false;physicalDoor.door!.broken=false;assert.equal(r.obstacleAt(doorAt,12)?.doodad,physicalDoor,'same query must see native door close');
  const piece=first.layout.doodads.find(d=>!d.door&&blocksMovement(d))!,pieceAt=moveAddress(zero,piece.pos,span);
  assert.ok(r.obstacleAt(pieceAt,0));piece.gone=true;
  assert.equal(r.obstacleAt(pieceAt,0)?.doodad??null,brute(first.layout.doodads,piece.pos,0,'move',d=>present.has(d)));
  piece.gone=false;present.delete(piece);
  assert.equal(r.obstacleAt(pieceAt,0)?.doodad??null,brute(first.layout.doodads,piece.pos,0,'move',d=>present.has(d)),'spliced native scenery must not remain a phantom cold blocker');
  // No shape-version shortcut: a live slab can change in place while the exact
  // candidate memo remains hot. The native shape solver still sees the edit.
  const oldX=physicalDoor.pos.x;physicalDoor.pos.x+=400;
  assert.equal(r.obstacleAt(doorAt,12)?.doodad??null,brute(first.layout.doodads,door.pos,12,'move',d=>present.has(d)));
  physicalDoor.pos.x=oldX;w.setDoorState(physicalDoor.door!.id,'open',{silent:true});
  for(let i=1;i<placements.length;i++)r.sync([placements[i]],host);
  assert.ok(r.stats.blueprints<=cfg.maxBlueprints);assert.equal(r.obstacleAt(doorAt,12),null,'hot point memo must rehydrate saved open door after blueprint eviction');
  r.sync([],host);const save=r.snapshot(10),resumed=new MassNativeResidency(cfg,provider,caps,()=>frame,save);
  assert.equal(resumed.obstacleAt(doorAt,12),null,'Continue preserves sparse native door state');
  const savedRow=save.born.find(b=>b.placement.id===placements[0].id)!;
  assert.ok(savedRow.changes.doodads.some(([,d])=>d===null));assert.equal(canonical(savedRow.descriptor),canonical(descriptors[0]));
  assert.throws(()=>resumed.sync([{...placements[0],request:{...placements[0].request,seed:999}}],host),/cannot move or reseed/);
  console.log('PASS actual native door mutation, destruction/splice, in-place shape edits, bounded blueprint eviction and exact Continue');

  // A prior cached empty provider result cannot mask a later authoritative born
  // feature (e.g. prepared adoption or restored ownership outside the provider).
  const bornLater=new MassNativeResidency(cfg,()=>[],caps,()=>zero);
  assert.equal(bornLater.obstacleAt(doorAt,12),null);bornLater.sync([placements[0]],host);
  assert.ok(bornLater.obstacleAt(doorAt,12));assert.ok(bornLater.stats.obstacleLookup.invalidations>0);
  bornLater.sync([],host);
  const far=address('surface','9007199254740993','-9007199254740994',0,0,span);
  const farPlacement={...placements[0],origin:far};frame=far;
  const farR=new MassNativeResidency(cfg,at=>at.dimension===far.dimension?[farPlacement]:[],caps,()=>frame);
  const farDoor=moveAddress(far,door.pos,span);assert.deepEqual(farR.obstacleAt(farDoor,12)!.doodad.pos,door.pos);
  frame=moveAddress(far,{x:960,y:-960},span);
  assert.deepEqual(farR.obstacleAt(farDoor,12)!.doodad.pos,{x:door.pos.x-960,y:door.pos.y+960},'cached physical candidates must translate into the current cold local frame');
  const malformed={...placements[0],request:{...placements[0].request,layoutParams:{bad:undefined}}};
  const malformedR=new MassNativeResidency(cfg,()=>[malformed],caps,()=>zero);
  assert.throws(()=>malformedR.obstacleAt(doorAt,12),/Manifest/,'memo freezing must not normalize invalid authored input');
  const empty=new MassNativeResidency(cfg,()=>[],new Set(),()=>zero);
  for(let i=0;i<NATIVE_OBSTACLE_CANDIDATE_CACHE+71;i++)assert.equal(empty.obstacleAt(moveAddress(zero,{x:-30*i,y:-960},span),0),null);
  assert.equal(empty.stats.obstacleLookup.cached,NATIVE_OBSTACLE_CANDIDATE_CACHE);
  const misses=empty.stats.obstacleLookup.misses;empty.obstacleAt(moveAddress(zero,{x:0,y:-960},span),0);
  assert.equal(empty.stats.obstacleLookup.misses,misses+1,'old exact points retire at the explicit cache bound');
  assert.equal(empty.stats.born,0);assert.equal(empty.stats.blueprints,0);
  console.log('PASS negative-cache birth invalidation, 64-bit negative/far addresses, frame translation and exact bounded LRU churn');
  console.log(JSON.stringify({comparisons,providerCalls,lookup:r.stats.obstacleLookup,bounded:empty.stats.obstacleLookup}));
} finally { restore(); }
