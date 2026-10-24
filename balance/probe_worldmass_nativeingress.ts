import assert from 'node:assert/strict';
import { makeSimWorld } from '../src/sim/arena';
import { seedGlobalRandom } from '../src/sim/rng';
import { MassNativeResidency, type NativeFeaturePlacement } from '../src/worldmass/nativeResidency';
import { resolveNativeFeature, compileNativeFeature, verifyNativeIngress, validateNativeIngress, nativeIngressPoints } from '../src/worldmass/nativeFeatures';
import { nativeWorldCapabilities } from '../src/worldmass/nativeHost';
import { address, moveAddress, localOffset } from '../src/worldmass/address';
import { canonical, massDigest } from '../src/worldmass/random';
const restore=seedGlobalRandom(713);
try{
 const w=makeSimWorld('warrior',713),origin=address('surface','0','0',0,0,960);
 const request={id:'native-ingress-fixture',seed:42,source:{kind:'massif' as const,id:'tor',tileset:'downs',scope:'landform' as const,variant:'the grey tors',poolIndex:0},rockEntrance:true};
 const descriptor=resolveNativeFeature(request),feature=compileNativeFeature(descriptor),before=canonical(descriptor);
 const dry=verifyNativeIngress(feature,()=> 'ground');assert.ok(dry.ok);validateNativeIngress(feature,dry.proof);
 assert.ok(nativeIngressPoints(feature,dry.proof).some(p=>p.x<0||p.y<0||p.x>1800||p.y>1800));
 assert.equal(canonical(feature.descriptor),before,'ingress proof never carves or mutates native geometry');
 for(const kind of ['wall','water','lava','chasm','bog','swamp']){
  let samples=0;
  const rejected=verifyNativeIngress(feature,p=>{samples++;const d=Math.max(-p.x,p.x-1800,-p.y,p.y-1800);return d>=30&&d<=120?kind:'ground';});
  assert.equal(rejected.ok,false,kind+' ring must not be crossed even when dry land exists beyond');
  assert.ok(samples<=12000,'base samples remain within the bounded route lattice');
 }
 assert.equal(verifyNativeIngress(feature,()=> 'ground',{maxCells:1024}).ok,false);
 const alternate=verifyNativeIngress(feature,p=>p.y<0&&p.x>750&&p.x<1050?'wall':'ground');
 assert.ok(alternate.ok,'deterministic exterior route can go around a genuine obstruction without painting it');
 const twice=verifyNativeIngress(feature,()=> 'ground');assert.deepEqual(twice,dry);
 const corner=(p:{x:number;y:number})=>p.x>=0&&p.y>=0&&p.x<1800&&p.y<1800
   ||p.x>=840&&p.y>=-150&&p.y<30?'ground':'water';
 const unsafeCorner=verifyNativeIngress(feature,corner);
 assert.ok(unsafeCorner.ok,'negative fixture really reaches dry country, but only outside its reserved disc');
 assert.equal(verifyNativeIngress(feature,corner,{reservePadding:120}).ok,false,'corner detour cannot cross later native/town/journey reservations');
 const badReservation={...unsafeCorner.proof,reservePadding:120};
 badReservation.hash=massDigest({descriptor:feature.descriptor.hash,version:1,halo:badReservation.halo,reservePadding:120,route:badReservation.route});
 assert.throws(()=>validateNativeIngress(feature,badReservation),/exceeds provider reservation/,'a rehashed corner route still fails physical reservation validation');
 const protectedDry=verifyNativeIngress(feature,()=> 'ground',{reservePadding:120});assert.ok(protectedDry.ok);validateNativeIngress(feature,protectedDry.proof);
 assert.ok(nativeIngressPoints(feature,protectedDry.proof).every(p=>Math.hypot(p.x-900,p.y-900)+42<=Math.hypot(900,900)+120));
 console.log('PASS dry native access, wall/water/lava/chasm/bog/swamp ring refusals, bounded search, non-carving detour and deterministic proof');
 const placement:NativeFeaturePlacement={id:request.id,request,origin},cfg={run:'ingress-probe',addressSpan:960,maxBlueprints:4,maxResidents:1,maxCandidates:2};
 const caps=new Set(descriptor.requirements),r=new MassNativeResidency(cfg,()=>[placement],caps,()=>origin,undefined,{regionAt:()=> 'ground'});
 r.regionAt(origin);const save=r.snapshot(0),proof=save.born[0].ingress!;assert.ok(proof);
 const outside=nativeIngressPoints(feature,proof).at(-1)!,outsideAt=moveAddress(origin,outside,960);
 assert.ok(r.intersects(outsideAt,0),'saved exterior corridor is reserved against later ecology and encounters');
 const resumed=new MassNativeResidency(cfg,()=>[placement],caps,()=>origin,JSON.parse(JSON.stringify(save)),{regionAt:()=> 'water'});
 assert.ok(resumed.intersects(outsideAt,0),'Continue preserves birth admission even if later terrain edits block the route');
 assert.deepEqual(resumed.snapshot(0).born[0].ingress,proof);
 const broken=JSON.parse(JSON.stringify(save));broken.born[0].ingress.route[0]++;
 assert.throws(()=>new MassNativeResidency(cfg,()=>[placement],caps,()=>origin,broken,{regionAt:()=> 'ground'}),/ingress checkpoint/);
 const legacy=JSON.parse(JSON.stringify(save));delete legacy.born[0].ingress;delete legacy.born[0].descriptor.sidechannels;delete legacy.born[0].descriptor.sourceZone;
 const {hash:_oldDescriptor,...legacyGeometry}=legacy.born[0].descriptor;legacy.born[0].descriptor.hash=massDigest(legacyGeometry);
 const grandfathered=new MassNativeResidency(cfg,()=>[],caps,()=>origin,legacy,{regionAt:()=> 'water',reservePadding:120});
 assert.equal(grandfathered.stats.legacyUnverifiedAccess,1);assert.equal(grandfathered.stats.legacyUnverifiedSidechannels,1);
 assert.deepEqual(grandfathered.snapshot(0).born[0].descriptor,legacy.born[0].descriptor);
 assert.equal(grandfathered.snapshot(0).born[0].ingress,undefined,'legacy access never invents a new corridor');
 assert.equal(grandfathered.regionAt(moveAddress(origin,feature.approach,960)),feature.regionAt(feature.approach.x,feature.approach.y),'born geometry survives removal from current provider');
 assert.ok(grandfathered.bornNear(origin,0).some(p=>p.id===placement.id));
 const oldReservation=new MassNativeResidency(cfg,()=>[],caps,()=>origin,save,{regionAt:()=> 'water',reservePadding:120});
 assert.equal(oldReservation.stats.legacyUnverifiedReservation,1);assert.deepEqual(oldReservation.snapshot(0).born[0].ingress,proof);
 const refused=new MassNativeResidency(cfg,()=>[placement],caps,()=>origin,undefined,{regionAt:()=> 'water'});
 assert.equal(refused.regionAt(moveAddress(origin,feature.approach,960)),undefined);assert.equal(refused.intersects(outsideAt,0),false);
 assert.ok(refused.refusals(placement.id).some(s=>s.startsWith('native-ingress-')));assert.equal(refused.stats.born,0);
 console.log('PASS admission before physical truth, saved exterior corridor reservation, Continue, tamper rejection and frozen legacy acceptance without invented corridors');
 // Actual default-country seed and authored native sources; no replacement
 // provider or substitute geometry. Only an isolated lifecycle owner is used.
 w.startWorldMass(713);const mass=w.massRuntime!,country=mass.nativeCountry!,span=mass.config.terrain.addressSpan;
 const frame={...mass.origin,x:0,y:0},production=new MassNativeResidency({...cfg,run:mass.generator.run.runId,maxBlueprints:48,maxResidents:24,maxCandidates:9},
  at=>country.at(at),nativeWorldCapabilities(),()=>frame,undefined,
  {regionAt:at=>mass.state.patchAt(at)?.region??mass.generator.terrainAt(at).region,cellSize:mass.config.terrain.terrainCell,reservePadding:country.spec.clearance});
 const seen=new Set<string>(),results:{id:string;accepted:boolean;reasons:readonly string[]}[]=[];let admitted=0;
 outer:for(let ring=0;ring<=12;ring++)for(let y=-ring;y<=ring;y++)for(let x=-ring;x<=ring;x++){
  if(Math.max(Math.abs(x),Math.abs(y))!==ring)continue;
  for(const p of country.near(mass.walk.at(x*5400,y*5400),2700)){
   if(seen.has(p.id)||!p.request.rockEntrance)continue;seen.add(p.id);
   const center=moveAddress(p.origin,{x:p.request.size!.w/2,y:p.request.size!.h/2},span);
   const accepted=production.intersects(center,0);results.push({id:p.id,accepted,reasons:production.refusals(p.id)});
   if(accepted){
    const born=production.snapshot(0).born.find(b=>b.placement.id===p.id)!;assert.ok(born.ingress);
    const b=compileNativeFeature(born.descriptor);validateNativeIngress(b,born.ingress);
    assert.ok(b.entrances.some(e=>e.kind==='cave_entrance'&&e.rockBacked),'real native seeded cave remains rock-backed');
    const end=nativeIngressPoints(b,born.ingress).at(-1)!,at=moveAddress(p.origin,end,span);
    assert.ok(production.intersects(at,0),'actual country query halo includes reserved exterior access');
    const delta=localOffset(at,p.origin,span);assert.ok(delta.x<0||delta.y<0||delta.x>b.grid!.cols*30||delta.y>b.grid!.rows*30);
    admitted++;if(admitted>=3)break outer;
   }
   if(results.length>=18)break outer;
  }
 }
 assert.ok(admitted>=2,'production seed retains multiple accessible natural rock cave features');
 console.log('PASS real default seed713 native exterior admission and corridor discovery',JSON.stringify({admitted,results}));
}finally{restore();}
