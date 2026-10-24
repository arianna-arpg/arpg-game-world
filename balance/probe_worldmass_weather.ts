import { performance } from 'node:perf_hooks';
import assert from 'node:assert/strict';
import { Rng } from '../src/core/rng';
import { ZONES, type ZoneDef } from '../src/data/zones';
import { type OverlayView } from '../src/world/overlay';
import { WeatherField, WEATHER_DEFS } from '../src/world/weather';
import { address, localOffset, moveAddress } from '../src/worldmass/address';
import { MassWeather, MASS_WEATHER_DEFAULT } from '../src/worldmass/weather';
import { canonical, streamSeed } from '../src/worldmass/random';

const span=960, seed=82191, policy={...MASS_WEATHER_DEFAULT}, scale=policy.unitsPerNode;
const zone:ZoneDef={...ZONES.lastlight,id:'native-weather-climate',sky:'open',map:{x:0,y:0}};
const center=address('surface','0','0',policy.sectorSpan/2,policy.sectorSpan/2,span);
const source=(at:typeof center)=>canonical(at)===canonical(center)?zone:undefined;
const mass=new MassWeather(seed,span,source,policy);
const native=new WeatherField(new Rng(streamSeed(seed,[policy.source,policy.version,'surface','0','0',0])));
native.spawnScale=policy.spawnScale;native.concurrencyScale=policy.concurrencyScale;
const view:OverlayView={nodes:[zone],allNodes:[zone],byId:{[zone.id]:zone},currentZoneId:zone.id,time:0,
 terrain:()=> 'land',census:{},charLevel:1,gates:new Map(),visited:new Set(),surveyed:new Set()};
let crossed=false,chosen=center;
for(let t=.5;t<=550;t+=.5){
 view.time=t;native.update(.5,view);
 const front=native.fronts.find(f=>f.intensity>.25&&Math.max(Math.abs(f.pos.x),Math.abs(f.pos.y))*scale>policy.sectorSpan/2+200);
 if(!front)continue;
 mass.advanceTo(t);chosen=moveAddress(center,{x:front.pos.x*scale,y:front.pos.y*scale},span);
 const relative=localOffset(chosen,center,span),query={...zone,map:{x:relative.x/scale,y:relative.y/scale}};
 const expected=native.sample(query)!,actual=mass.sample(chosen,zone,{x:123,y:456})!;assert.ok(actual);
 assert.equal(actual.kind,expected.kind);assert.equal(actual.age,expected.age);assert.equal(actual.life,expected.life);
 assert.ok(Math.abs(actual.intensity-expected.intensity)<1e-12);assert.equal(actual.radius,expected.radius*scale);
 assert.deepEqual(actual.vel,{x:expected.vel.x*scale,y:expected.vel.y*scale});
 assert.ok(Math.abs(actual.pos.x-(123+(expected.pos.x-query.map.x)*scale))<1e-8);
 assert.deepEqual(mass.affectSpawns(chosen,zone),native.affectSpawns(query));crossed=true;break;
}
assert.ok(crossed,'actual native front must cross into another geographic sector');
console.log('PASS actual native front drifts across geographic sectors with exact kind, age, climate life, wind, edge intensity and spawn bias');

const save=JSON.parse(JSON.stringify(mass.snapshot())),again=new MassWeather(seed,span,source,policy,save);
assert.deepEqual(again.sample(chosen,zone,{x:7,y:9}),mass.sample(chosen,zone,{x:7,y:9}));
const at=mass.time+.271;mass.advanceTo(at);again.advanceTo(at);
assert.deepEqual(again.sample(chosen,zone),mass.sample(chosen,zone));
assert.equal(mass.sample(chosen,{...zone,sky:'sheltered'}),null);
assert.equal(mass.sample({...chosen,dimension:'hell'},zone),null);
assert.equal(mass.sample(chosen,{...zone,caveDepth:1,sky:undefined}),null);
assert.throws(()=>new MassWeather(seed,span,source,policy,{...save,registry:'foreign'}),/Incompatible/);
assert.throws(()=>mass.advanceTo(-1),/clock/);
console.log('PASS saved global clock preserves fractional drift through Continue; native roof/cave/dimension gates and incompatible registry refusal hold');

const a=new MassWeather(seed,span,()=>zone,{...policy,cacheSize:3});
const b=new MassWeather(seed,span,()=>zone,{...policy,cacheSize:3});
a.advanceTo(1e9+123.25);b.advanceTo(a.time);
const points=Array.from({length:20},(_,i)=>address('surface','9007199254740993','-9007199254740993',i*30000+.25,-i*21000+.75,span));
const first=points.map(p=>a.sample(p,zone));
const second=[...points].reverse().map(p=>b.sample(p,zone)).reverse();assert.deepEqual(first,second);
assert.deepEqual(a.sample(points[0],zone),first[0],'eviction cannot reroll weather');
assert.ok(a.stats.cohorts<=3&&b.stats.cohorts<=3);assert.ok(a.stats.replaySteps<2e6,'elapsed world age must not drive replay work');
assert.ok(JSON.stringify(a.snapshot()).length<1000,'weather save never accumulates visited sectors or past fronts');
assert.deepEqual(a.snapshot(),b.snapshot(),'sampling and visiting never alter the durable sky');
console.log('PASS billion-second world clock, distant BigInt coordinates, reverse query order and forced cache eviction keep a bounded deterministic sky');

const desert={...zone,geo:{...zone.geo,climate:{temperature:.8,moisture:.1,elevation:.1,wildness:.2}}} as ZoneDef;
const wet={...zone,geo:{...zone.geo,climate:{temperature:.4,moisture:.9,elevation:.1,wildness:.2}}} as ZoneDef;
const sky=(z:ZoneDef)=>{const f=new MassWeather(seed,span,()=>z,policy);f.advanceTo(220);return f;};
const dry=sky(desert),rainy=sky(wet);assert.notDeepEqual(dry.sample(center,desert),rainy.sample(center,wet));
for(const def of Object.values(WEATHER_DEFS))for(const band of Object.values(def.lingerGeo??{}))assert.ok(band.mul>0);
console.log('PASS native climate gates and linger definitions remain the authority for geographic weather');

const live=new MassWeather(seed,span,()=>zone);live.advanceTo(3600.125);
const liveAt=address('surface','0','0',11111,9999,span);live.sample(liveAt,zone);
const nativeSteps=live.stats.replaySteps,t0=performance.now();
for(let i=0;i<100;i++)live.sample(moveAddress(liveAt,{x:i*2,y:i},span),zone);
live.advanceTo(live.time+1/60);for(let i=0;i<100;i++)live.sample(liveAt,zone);
assert.equal(live.stats.replaySteps,nativeSteps,'per-body queries and fractional frames must not replay native births');
assert.ok(live.stats.cohorts<=128);live.advanceTo(live.time+.5);live.sample(liveAt,zone);
assert.ok(live.stats.replaySteps-nativeSteps<=128,'one birth step advances each retained cohort once');
console.log('PASS default hour-old sky retains '+live.stats.cohorts+' cohorts without replay thrash; 200 warm samples in '+(performance.now()-t0).toFixed(2)+' ms');

const sampleSave=mass.snapshot(),sampled=new MassWeather(seed,span,source,policy,sampleSave);
const untouched=new MassWeather(seed,span,source,policy,sampleSave),expectedSample=untouched.sample(chosen,zone,{x:7,y:9});
assert.ok(expectedSample);
assert.deepEqual(sampled.sample(chosen,zone,{x:7,y:9}),expectedSample);
const sampleHits=sampled.stats.sampleHits,mutable=sampled.sample(chosen,zone)!;
mutable.pos.x+=9999;mutable.vel.y+=9999;mutable.intensity=0;
assert.deepEqual(sampled.sample(chosen,zone,{x:7,y:9}),expectedSample,'callers cannot poison a shared weather sample');
assert.equal(sampled.stats.sampleHits-sampleHits,2);
const changedContext={...zone};sampled.sample(chosen,changedContext);changedContext.sky='sheltered';
assert.equal(sampled.sample(chosen,changedContext),null,'same-frame shelter changes cannot reuse an open sky');
for(let i=0;i<2100;i++)sampled.sample(moveAddress(chosen,{x:i*.125,y:i*.25},span),zone);
assert.ok(sampled.stats.samples<=2048,'point reuse cannot accumulate actor or travel history');
assert.deepEqual(sampled.sample(chosen,zone,{x:7,y:9}),expectedSample,'point eviction preserves exact weather');
sampled.advanceTo(sampled.time+.01);untouched.advanceTo(untouched.time+.01);
assert.equal(sampled.stats.samples,0);assert.deepEqual(sampled.sample(chosen,zone),untouched.sample(chosen,zone));
sampled.setScales(sampled.time,{spawnScale:2,concurrencyScale:2});assert.equal(sampled.stats.samples,0);
assert.deepEqual(sampled.snapshot().clock,untouched.snapshot().clock);
console.log('PASS exact frame sample reuse, translated/copy-safe fronts, live shelter gates, bounded eviction and clock/scale invalidation');

const gated=new MassWeather(seed,span,source,policy),unseen=new MassWeather(seed,span,source,policy);
const nativeGated=new WeatherField(new Rng(streamSeed(seed,[policy.source,policy.version,'surface','0','0',0])));
let gate={spawnScale:0,concurrencyScale:1};gated.setScales(0,gate);unseen.setScales(0,gate);
for(let t=.5;t<=550;t+=.5){
 if(t===100.5)gate={spawnScale:2,concurrencyScale:1};if(t===200.5)gate={spawnScale:0,concurrencyScale:1};
 if(t===300.5)gate={spawnScale:1,concurrencyScale:2};
 gated.setScales(t-.5,gate);unseen.setScales(t-.5,gate);gated.advanceTo(t);unseen.advanceTo(t);
 nativeGated.spawnScale=gate.spawnScale;nativeGated.concurrencyScale=gate.concurrencyScale;view.time=t;nativeGated.update(.5,view);
 if(t%25===0)for(const f of nativeGated.fronts){
  const at=moveAddress(center,{x:f.pos.x*scale,y:f.pos.y*scale},span),d=localOffset(at,center,span),query={...zone,map:{x:d.x/scale,y:d.y/scale}};
  const expected=nativeGated.sample(query),actual=gated.sample(at,zone);assert.equal(actual?.kind,expected?.kind);
  if(expected){assert.ok(actual);assert.ok(Math.abs(actual.intensity-expected.intensity)<1e-11);assert.equal(actual.age,expected.age);}
 }
}
const epochSave=JSON.parse(JSON.stringify(gated.snapshot())),gatedResume=new MassWeather(seed,span,source,policy,epochSave);
for(const f of nativeGated.fronts){const at=moveAddress(center,{x:f.pos.x*scale,y:f.pos.y*scale},span);
 assert.deepEqual(gated.sample(at,zone),unseen.sample(at,zone),'never-visited sector must use historical gates');
 assert.deepEqual(gated.sample(at,zone),gatedResume.sample(at,zone));}
const unchanged=canonical(gated.sample(chosen,zone));gated.setScales(gated.time,{spawnScale:0,concurrencyScale:1});
assert.equal(canonical(gated.sample(chosen,zone)),unchanged,'a new gate cannot rewrite already sampled native steps');
assert.throws(()=>gated.setScales(gated.time-.5,gate),/clock/);
const toggled=new MassWeather(seed,span,source,policy);
for(let i=0;i<6000;i++)toggled.setScales(i*.5,{spawnScale:i%2,concurrencyScale:1});
assert.ok(toggled.snapshot().epochs!.length<2200,'scale history is bounded by live cohort replay horizon');
const toggledSave=toggled.snapshot();assert.deepEqual(new MassWeather(seed,span,source,policy,toggledSave).snapshot(),toggledSave);
console.log('PASS native package gate/concurrency epoch parity, no retroactive fronts, never-visited and Continue history, bounded pruning and backwards-change refusal');
