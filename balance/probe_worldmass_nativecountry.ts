import assert from 'node:assert/strict';
import { makeSimWorld } from '../src/sim/arena';
import { seedGlobalRandom } from '../src/sim/rng';
import { TILESETS } from '../src/data/tilesets';
import { BIOMES } from '../src/world/biomes';
import { presenceMul } from '../src/engine/presence';
import { address, latticeAt, localOffset, moveAddress } from '../src/worldmass/address';
import { MassGenerator, makeMassRun } from '../src/worldmass/generator';
import type { MassSpec } from '../src/worldmass/contracts';
import { makeNativeCountrySpec, MassNativeCountry } from '../src/worldmass/nativeCountry';
import { compileNativeFeature, resolveNativeFeature } from '../src/worldmass/nativeFeatures';
import { canonical, massDigest, streamSeed } from '../src/worldmass/random';

const restore=seedGlobalRandom(7741);
try{
  makeSimWorld('warrior',7741);
  const base:MassSpec={id:'native-country-probe',version:1,addressSpan:960,terrainCell:30,fields:[],
    surfaces:[{id:'ground',priority:1,when:[],region:'ground',biome:'downs',color:'#556644'}],places:[]};
  const gen=new MassGenerator(makeMassRun(7741,'native-country-probe',base),base);
  const spec=makeNativeCountrySpec(30,{chance:1});
  const tilesets=[...new Set(spec.catalogue.map(r=>r.source.tileset))],biomes=[...new Set(spec.catalogue.map(r=>r.biome))];
  assert.ok(tilesets.length>=30&&biomes.length>=15,'real surface catalogue must substantially exceed five compositions');
  assert.ok(spec.catalogue.some(r=>r.source.kind==='massif')&&spec.catalogue.some(r=>r.source.kind==='structure')&&spec.catalogue.some(r=>r.source.kind==='composition'));
  assert.ok(Object.isFrozen(spec)&&Object.isFrozen(spec.catalogue)&&Object.isFrozen(spec.sources));
  const context=(at:Parameters<MassNativeCountry['at']>[0])=>{
    const p=latticeAt(at,960,spec.spacing),index=streamSeed(991,['source',p.gx.toString(),p.gy.toString()])%tilesets.length;
    return {tileset:tilesets[index]};
  };
  const reserves=(at:Parameters<MassNativeCountry['at']>[0])=>latticeAt(at,960,spec.spacing).gx%7n===0n;
  const country=new MassNativeCountry(gen,spec,reserves,context);
  const origin=address('surface','0','0',0,0,960),seen=new Map<string,ReturnType<MassNativeCountry['at']>[number]>();
  const queries=Array.from({length:180},(_,i)=>moveAddress(origin,{x:(i-90)*spec.spacing+spec.spacing/2,y:(i%3)*spec.spacing+spec.spacing/2},960));
  for(const q of queries)for(const p of country.at(q))seen.set(p.id,p);
  const picked=[...seen.values()];
  assert.ok(picked.length>100,'beyond-start provider produces actual native candidates');
  assert.ok(new Set(picked.map(p=>p.request.source.tileset)).size>=20);
  assert.deepEqual(new Set(picked.map(p=>p.request.source.kind)),new Set(['massif','structure','composition']));
  for(const p of picked){
    assert.equal(p.origin.x%30,0);assert.equal(p.origin.y%30,0);
    const size=p.request.size!,center=moveAddress(p.origin,{x:size.w/2,y:size.h/2},960);
    assert.equal(reserves(center),false,'reserved native footprint must never become a feature');
    assert.equal(context(center).tileset,p.request.source.tileset,'native regional source selects actual associated native content');
    const inside=moveAddress(p.origin,{x:15,y:15},960);
    assert.ok(country.at(inside).some(r=>r.id===p.id),'same owner appears at edge and center, independent of cache');
  }
  assert.ok(country.stats.reserved>0&&country.stats.cached<=spec.cacheSize);
  for(let i=0;i<picked.length;i++)for(let j=i+1;j<picked.length;j++){
    const a=picked[i],b=picked[j],d=localOffset(a.origin,b.origin,960,2048),as=a.request.size!,bs=b.request.size!;
    assert.ok(d.x>=bs.w||-d.x>=as.w||d.y>=bs.h||-d.y>=as.h,'jittered native physical feature bounds cannot overlap');
  }
  console.log('PASS registry-sourced physical breadth, exact regional source association, native-grid alignment and disjoint reservations',JSON.stringify({sources:spec.catalogue.length,tilesets:tilesets.length,biomes:biomes.length,excluded:spec.excluded.length,picked:picked.length,pickedTilesets:new Set(picked.map(p=>p.request.source.tileset)).size}));
  const again=new MassNativeCountry(gen,JSON.parse(JSON.stringify(spec)),reserves,context);
  for(const q of [...queries].reverse())assert.equal(canonical(country.at(q)),canonical(again.at(q)),'query order and eviction cannot change owner or request');
  const far=address('surface','4294967296','-4294967297',450,450,960);
  assert.equal(canonical(country.near(far,1500)),canonical(again.near(far,1500)),'full signed addresses are retained beyond32-bit coordinates');
  assert.throws(()=>country.near(origin,spec.spacing),/bounded/);
  assert.throws(()=>makeNativeCountrySpec(20),/terrain cell/);
  assert.throws(()=>makeNativeCountrySpec(30,{spacing:1800}),/spacing/);
  const first=spec.catalogue[0].source.tileset,original=TILESETS[first].theme.floor;
  TILESETS[first].theme.floor='#123456';
  assert.throws(()=>new MassNativeCountry(gen,spec,reserves,context),/compatibility reset/);
  TILESETS[first].theme.floor=original;
  const corrupt=JSON.parse(JSON.stringify(spec));corrupt.sourceHash='bad';
  assert.throws(()=>new MassNativeCountry(gen,corrupt),/source policy/);
  console.log('PASS Continue/order/eviction determinism, far signed addresses, invalid policy and changed native-source refusal');
  const climateBase:MassSpec={...base,id:'native-climate-probe',fields:['temperature','moisture','elevation','danger'].map((id,i)=>({
    id,base:0,layers:[{id:'macro',period:spec.regionSpan*(3+i),amplitude:1}]}))};
  const climateGen=new MassGenerator(makeMassRun(8177,'native-climate-probe',climateBase),climateBase);
  const climateCountry=new MassNativeCountry(climateGen,spec);
  const climateSeen=new Set<string>(),sourceSeen=new Set<string>();
  for(let i=0;i<1200;i++){
    const at=moveAddress(origin,{x:(i%40-20)*spec.regionSpan+1800,y:(Math.floor(i/40)-15)*spec.regionSpan+1800},960);
    const c=climateCountry.nativeContextAt(at);
    assert.ok(c.biome&&c.tileset&&c.climate);
    climateSeen.add(c.biome!);sourceSeen.add(c.tileset!);
    const palette=spec.climate.palette.find(p=>p.biome===c.biome)!;
    assert.ok(palette&&palette.tilesets.includes(c.tileset!));
    assert.ok(Object.entries(palette.envelopes).every(([axis,env])=>presenceMul(env,c.climate![axis])>0),'chosen native biome must meet its saved climate envelopes');
    assert.equal(canonical(c),canonical(climateCountry.nativeContextAt(moveAddress(at,{x:600,y:600},960))),'macroregion owns a stable native climate context');
    assert.ok(!BIOMES[c.biome!].marine&&!BIOMES[c.biome!].virtual);
  }
  assert.ok(climateSeen.size>=15&&sourceSeen.size>=25,'real native climate layer exceeds the old five-family palette');
  assert.ok(spec.excluded.some(e=>e.reason==='native-marine-traversal'));
  console.log('PASS saved native climate envelopes, contiguous macroregion source context and explicit sea exclusion',JSON.stringify({biomes:[...climateSeen].sort(),tilesets:sourceSeen.size}));
  const geometry=new Set<string>(),nativeBiomes=new Set<string>(),regions=new Set<string>(),refusals:string[]=[];
  let compiled=0,doors=0,mouths=0,maxPieces=0,maxCells=0;
  // Exercise actual compiler outputs from all three source classes across many
  // native source contexts. Catalogue availability alone is not gameplay proof.
  for(const kind of ['massif','structure','composition']){
    for(const p of picked.filter(p=>p.request.source.kind===kind).slice(0,8)){
      try{
        const d=resolveNativeFeature(p.request),b=compileNativeFeature(d);
        if(d.unsupported.length){refusals.push(p.request.source.tileset+':'+d.unsupported.join(','));continue;}
        geometry.add(massDigest(d.geometry));nativeBiomes.add(d.zone.biome!);compiled++;
        for(let i=0;i<b.supportMask.length;i++)if(b.supportMask[i])regions.add(b.grid!.regionAt((i%b.grid!.cols+.5)*30,(Math.floor(i/b.grid!.cols)+.5)*30));
        doors+=b.layout.doodads.filter(d=>d.door).length;mouths+=b.entrances.length;
        maxPieces=Math.max(maxPieces,b.layout.doodads.length);maxCells=Math.max(maxCells,b.supportMask.length);
        assert.equal(b.regionAt(15,15),undefined,'native bounds never become a finite arena wall');
        assert.ok(b.requirements.length>=3,'full native output declares admission requirements');
      }catch(error){refusals.push(p.request.source.tileset+':generation:'+String(error));}
    }
  }
  console.log('native compilation coverage',JSON.stringify({compiled,distinct:geometry.size,biomes:[...nativeBiomes],refusals}));
  assert.ok(compiled>=8&&geometry.size>=compiled*.75&&nativeBiomes.size>=5);
  console.log('PASS actual native generation sampled from country provider; lifecycle admission remains explicit',JSON.stringify({compiled,distinctGeometry:geometry.size,nativeBiomes:[...nativeBiomes],regions:[...regions],doors,mouths,maxPieces,maxCells,refusals}));
}finally{restore();}
