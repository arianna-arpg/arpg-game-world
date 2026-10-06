import assert from 'node:assert/strict';
import { makeSimWorld } from '../src/sim/arena';
import { seedGlobalRandom } from '../src/sim/rng';
import { Rng } from '../src/core/rng';
import { TILESETS } from '../src/data/tilesets';
import { generateLayout, blocksMovement, hitSurfaceOf } from '../src/engine/levelgen';
import { shapeContains } from '../src/engine/shapes';
import { regionKind } from '../src/world/regions';
import { GridWalkField } from '../src/world/gridWalk';
import { nativeWorldCapabilities } from '../src/worldmass/nativeHost';
import { canonical, massDigest } from '../src/worldmass/random';
import { nativeFeatureCatalogue, resolveNativeFeature, compileNativeFeature, nativeFeatureAdmission,
  NATIVE_FEATURE_LIMITS, type NativeFeatureRequest } from '../src/worldmass/nativeFeatures';

const restore = seedGlobalRandom(71351);
try {
  makeSimWorld('warrior', 71351); // identical native registrations to normal play
  const catalogue = nativeFeatureCatalogue();
  assert.ok(catalogue.length > 100);
  for (const biome of ['downs','highland','farmland','metropolis','garden','desert','volcanic'])
    assert.ok(nativeFeatureCatalogue(biome).some(c => c.massif), biome + ' exposes its real native massif vocabulary');
  assert.ok(catalogue.find(c=>c.tileset==='undergrowth')!.massKinds.includes('taproot_bole'));
  assert.ok(catalogue.find(c=>c.tileset==='tableland')!.massKinds.includes('mesa'));
  assert.ok(catalogue.find(c=>c.tileset==='metropolis')!.massKinds.includes('tenement'));
  console.log('PASS catalogue reads native biome/tileset variants, layout policies, mass kinds, structures and compositions');

  const request: NativeFeatureRequest = { id:'physical-place:rock',seed:42,
    source:{kind:'massif',id:'downs',tileset:'downs'},rockEntrance:true };
  const descriptor = resolveNativeFeature(request), feature = compileNativeFeature(descriptor);
  assert.deepEqual(feature.unsupported,[]);
  assert.ok(Object.isFrozen(descriptor) && Object.isFrozen(descriptor.geometry.layout));
  assert.equal(canonical(resolveNativeFeature(request)),canonical(descriptor));
  assert.equal(feature.regionAt(-1,15),undefined);
  assert.equal(feature.regionAt(15,-1),undefined);
  assert.equal(feature.regionAt(descriptor.zone.size.w+1,15),undefined);
  assert.equal(feature.regionAt(15,15),undefined,'compiler padding must remain transparent');
  const supportCount = feature.supportMask.reduce((n,x)=>n+x,0);
  assert.ok(supportCount > 0 && supportCount < feature.supportMask.length*.95,'native feature is not a solid finite-map rectangle');
  assert.equal(feature.regionAt(feature.approach.x,feature.approach.y),'ground');
  const mouths = feature.entrances.filter(e=>e.kind==='cave_entrance');
  assert.ok(mouths.length > 0);
  assert.deepEqual(mouths.map(e=>e.seed),feature.layout.caveSeeds,'native classic seed zip is unchanged');
  assert.ok(mouths.every(e=>e.rockBacked),'all promised classic mouths seat against real rock');
  assert.ok(feature.requirements.includes('sidezones'));
  assert.ok(feature.requirements.includes('hollows'),'native secrets cannot be silently reduced to props');

  // Walk the compiled owned floor itself, treating transparent exterior as
  // blocked. This catches an adapter that tests reachability on native ground
  // then fails to include that ground in the physical feature footprint.
  const grid = feature.grid!, cell = grid.cell, radius=12;
  const safe=(x:number,y:number)=>[[0,0],[radius,0],[-radius,0],[0,radius],[0,-radius]].every(([dx,dy])=>
    regionKind(feature.regionAt(x+dx,y+dy)??'wall')?.walkable)
    && !feature.layout.doodads.some(d=>(d.tier??0)===0&&blocksMovement(d)
      &&shapeContains(hitSurfaceOf(d,'move'),d.pos.x,d.pos.y,x,y,radius));
  const start=Math.floor(feature.approach.y/cell)*grid.cols+Math.floor(feature.approach.x/cell);
  const queue=[start], seen=new Set([start]);
  for(let head=0;head<queue.length;head++){
    const i=queue[head],x=i%grid.cols,y=Math.floor(i/grid.cols);
    for(const[dx,dy]of[[1,0],[-1,0],[0,1],[0,-1]]){
      const nx=x+dx,ny=y+dy,n=ny*grid.cols+nx;
      if(nx<0||ny<0||nx>=grid.cols||ny>=grid.rows||seen.has(n))continue;
      if(![.25,.5,.75,1].every(t=>safe((x+.5+dx*t)*cell,(y+.5+dy*t)*cell)))continue;
      seen.add(n);queue.push(n);
    }
  }
  for(const mouth of mouths){
    assert.ok(safe(mouth.pos.x,mouth.pos.y),'mouth arrival has physical body clearance');
    assert.ok(seen.has(Math.floor(mouth.pos.y/cell)*grid.cols+Math.floor(mouth.pos.x/cell)),
      'native cave mouth reachable through owned, body-clear ingress');
    assert.equal(feature.layout.doodads[mouth.doodadIndex].kind,mouth.kind);
  }
  console.log('PASS native rock edifices, genuine cave seeds, body-safe mouth approaches and transparent support footprint');

  // Restore must never rerun generation against changed global content.
  const saved = JSON.parse(JSON.stringify(descriptor)), original = TILESETS.downs.layout;
  let resumed: ReturnType<typeof compileNativeFeature>;
  try {
    TILESETS.downs.layout = [];
    resumed = compileNativeFeature(saved);
    assert.equal(canonical(resumed.layout.doodads),canonical(feature.layout.doodads));
    assert.equal(canonical(resumed.grid!.pack()),canonical(feature.grid!.pack()));
    assert.deepEqual(resumed.supportMask,feature.supportMask);
  } finally { TILESETS.downs.layout=original; }
  feature.layout.doodads[0].gone=true;
  feature.grid!.fillRegion(0,0,30,30,'water');
  const again=compileNativeFeature(saved);
  assert.equal(again.layout.doodads[0].gone,descriptor.geometry.layout.doodads[0].gone);
  assert.equal(canonical(again.grid!.pack()),canonical(GridWalkField.unpack(saved.geometry.grid).pack()));
  const corrupt=JSON.parse(JSON.stringify(saved));corrupt.geometry.layout.doodads[0].pos.x+=30;
  assert.throws(()=>compileNativeFeature(corrupt),/identity mismatch/);
  assert.equal(nativeFeatureAdmission(again,new Set(['terrain','scenery'])).ok,false);
  assert.ok(nativeFeatureAdmission(again,new Set(['terrain','scenery'])).missing.includes('sidezones'));
  assert.equal(nativeFeatureAdmission(again,new Set(again.requirements)).ok,true);
  console.log('PASS exact geography after native source mutation, independent live door/scenery copies, tamper refusal and explicit capability admission');

  const structureIds=['inn','walled_manor','dungeon_block','market_row','choir_hall','siege_castle','marble_monastery','grand_cathedral'];
  let doors=0,storeys=0,slots=0;
  for(const id of structureIds){
    const d=resolveNativeFeature({id:'physical-structure:'+id,seed:42,source:{kind:'structure',id,tileset:'downs'}});
    const f=compileNativeFeature(d);
    assert.deepEqual(f.unsupported,[],id+' must compile without clipped native geometry');
    assert.ok(f.layout.structures?.length,id+' must retain actual plan/compound outputs');
    const st=f.layout.structures![0];
    assert.equal(st.defId,id); assert.ok(st.doors.length);
    doors+=st.doors.length;slots+=st.slots.length;storeys+=st.storeys?.length??0;
    // Native reference equivalence is stronger than checking the adapter's
    // own projection: every slot, roof, door, storey and prop must survive.
    const native=generateLayout(JSON.parse(JSON.stringify(d.zone)),d.zone.size,new Rng(d.seed),d.approach,[]);
    const {walk:_walk,...nativeData}=native;
    assert.equal(canonical(d.geometry.layout),canonical(JSON.parse(JSON.stringify(nativeData))),id+' preserves all native GeneratedLayout fields');
    assert.ok(f.requirements.includes('doors')&&f.requirements.includes('structures'));
    if(id==='inn'){
      assert.ok(f.requirements.includes('storeys')&&f.requirements.includes('folk')&&f.requirements.includes('npcs'));
      assert.ok(st.storeys!.some(s=>s.floors.length&&s.walls.length));
    }
    if(id==='siege_castle')assert.ok(f.requirements.includes('doodad-effects'),'mechanical vents retain their native area effects');
  }
  assert.ok(storeys>0&&doors>15&&slots>0);
  console.log('PASS native compound generators, '+doors+' doors, '+slots+' slots, storeys, roofs, folk and live effect metadata');

  const primitiveSources:NativeFeatureRequest['source'][]=[
    {kind:'massif',id:'tor',tileset:'downs',scope:'landform',variant:'the grey tors',poolIndex:0},
    {kind:'massif',id:'bluff',tileset:'downs',scope:'landform',variant:'the grey tors',poolIndex:1},
    {kind:'massif',id:'fallen_court',tileset:'courtland',scope:'landform',poolIndex:2},
    {kind:'massif',id:'slag_tor',tileset:'wyrmfields',scope:'landform',poolIndex:0},
  ];
  const primitiveGeometry=new Set<string>();
  for(const source of primitiveSources){
    const pure=resolveNativeFeature({id:'primitive:'+source.id,seed:42,source});
    assert.equal(pure.environment.owner,'containing-region');
    assert.equal(pure.zone.name.includes('primitive:'),false);
    assert.deepEqual(pure.zone.theme,{...TILESETS[source.tileset].theme,...TILESETS[source.tileset].variants?.find(v=>v.name===source.variant)?.theme},
      'original mechanical theme provenance remains complete');
    assert.ok(pure.environment.sourceMechanics.length>0);
    const native=generateLayout(JSON.parse(JSON.stringify(pure.zone)),pure.zone.size,new Rng(42),pure.approach,[]);
    const {walk:nativeWalk,...nativeData}=native;
    assert.equal(canonical(JSON.parse(JSON.stringify(nativeData))),canonical(pure.geometry.layout),'landform compilation retains every actual native output');
    assert.equal(canonical((nativeWalk as GridWalkField).pack()),canonical(pure.geometry.grid));
    const cave=resolveNativeFeature({id:'mouth:'+source.id,seed:42,source,rockEntrance:true}),b=compileNativeFeature(cave);
    assert.deepEqual(nativeFeatureAdmission(b,nativeWorldCapabilities()),{ok:true,missing:[],unsupported:[]},'real production host supports this complete native landform');
    assert.ok(cave.entrances.length===1&&cave.entrances[0].rockBacked);
    assert.deepEqual(cave.geometry.layout.caveSeeds,cave.entrances.map(e=>e.seed));
    primitiveGeometry.add(massDigest({grid:cave.geometry.grid,props:cave.geometry.layout.doodads.map(d=>({kind:d.kind,pos:d.pos,radius:d.radius}))}));
  }
  assert.equal(primitiveGeometry.size,4);
  assert.equal(descriptor.environment.owner,'source');
  assert.ok(descriptor.environment.sourceMechanics.includes('fog')&&descriptor.requirements.includes('context:fog'));
  assert.throws(()=>resolveNativeFeature({id:'wrong-pool',seed:42,source:{...primitiveSources[0],poolIndex:1}}),/pool identity/);
  console.log('PASS four production-admitted native rock landforms, complete native generated metadata, exact source pool identity and explicit containing-environment policy');

  for(const seed of [2,23]){
    const d=resolveNativeFeature({id:'native-sidechannel/'+seed,seed,source:{kind:'massif',id:'well_court',tileset:'courtland',scope:'landform',poolIndex:1}}),b=compileNativeFeature(d);
    assert.ok(d.sidechannels);const caps=nativeWorldCapabilities(),admission=nativeFeatureAdmission(b,caps);
    if(seed===23){assert.ok(d.sidechannels.occurrences.length);assert.equal(admission.ok,true);const missing=new Set(caps);missing.delete('occurrences');assert.ok(nativeFeatureAdmission(b,missing).missing.includes('occurrences'));assert.ok(d.requirements.some(r=>r.startsWith('occurrence-trigger:')));}
    else{assert.equal(admission.ok,true);assert.ok(d.sidechannels.puzzles.length);assert.ok(d.zone.puzzles?.length);const missing=new Set(caps);missing.delete('puzzle:court_shrine');assert.ok(nativeFeatureAdmission(b,missing).missing.includes('puzzle:court_shrine'));}
  }
  console.log('PASS real court occurrence and fitted shrine retain complete side-registry records and refuse without their actual native owners');
  const samples: NativeFeatureRequest[] = [
    ...['downs','tableland','farmland','metropolis','undergrowth','wyrmfields','tendersrows','courtland','snowcrown','needles']
      .flatMap(tileset=>[42,101].map(seed=>({id:'physical:'+tileset+':'+seed,seed,source:{kind:'massif' as const,id:tileset,tileset}}))),
    ...['hermits_camp','manor_grounds','buried_village','sunken_ruin_site','caravan_graveyard','harvest_steading']
      .map((id,i)=>({id:'physical-composition:'+id,seed:42+i,source:{kind:'composition' as const,id,tileset:'downs'}})),
  ];
  const shapes=new Set<string>(),regions=new Set<string>(),stats:unknown[]=[];
  for(const sample of samples){
    const d=resolveNativeFeature(sample),f=compileNativeFeature(d);
    // Terrain fingerprints exclude identity, colors and names.
    shapes.add(massDigest({kinds:d.geometry.grid!.kinds,kbits:d.geometry.grid!.kbits,
      structures:(d.geometry.layout.structures??[]).map(s=>({rect:s.rect,doors:s.doors,rooms:s.rooms??[]})),
      props:d.geometry.layout.doodads.map(p=>({kind:p.kind,pos:p.pos,radius:p.radius}))}));
    d.geometry.grid!.kinds.forEach(k=>regions.add(k));
    assert.ok(d.geometry.layout.doodads.length<=NATIVE_FEATURE_LIMITS.maxDoodads);
    assert.ok(d.geometry.support.length<=NATIVE_FEATURE_LIMITS.maxCells);
    if(f.unsupported.length)assert.equal(nativeFeatureAdmission(f,new Set(f.requirements)).ok,false,
      'unbounded/clipped/unowned native results must refuse even with every lifecycle bound');
    stats.push({id:sample.source.id,seed:sample.seed,doodads:f.layout.doodads.length,
      ownedCells:d.geometry.support.filter(Boolean).length,entrances:f.entrances.length,unsupported:f.unsupported});
  }
  assert.ok(shapes.size>=24,'native seeds and sources change actual geometry, not merely names/palettes');
  for(const r of ['crag','sandstone','drystone','tenement_wall','nest_wall','slagcrag'])
    assert.ok(regions.has(r),'native physical region '+r+' compiled');
  assert.throws(()=>resolveNativeFeature({...request,size:{w:100000,h:100000}}),/bounds/);
  console.log('PASS '+samples.length+' varied native sources/seeds with '+shapes.size+' distinct physical fingerprints; bounds and explicit refusal preserved');
  console.log('NATIVE_FEATURE_STATS '+JSON.stringify(stats));
} finally { restore(); }
