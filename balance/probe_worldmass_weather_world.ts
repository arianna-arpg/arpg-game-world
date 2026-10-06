import assert from 'node:assert/strict';
import { makeSimWorld, classById } from '../src/sim/arena';
import { seedGlobalRandom } from '../src/sim/rng';
import { World, WIND_CFG, SNOW_CFG } from '../src/engine/world';
import { WEATHER_DEFS, WET_SKY } from '../src/world/weather';
import { WorldMassRuntime } from '../src/worldmass/runtime';
import { canonical } from '../src/worldmass/random';
import { localOffset } from '../src/worldmass/address';
type Point={x:number;y:number};
type WeatherAccess={updateWetSky(dt:number):void;updateWindPush(dt:number):void;updateSnow(dt:number):void;updateStorm(dt:number):void};
const undo=seedGlobalRandom(84712);
const fresh=(seed:number)=>{const base=makeSimWorld('warrior',seed);base.account.packageUnlocks.add('storm_fronts');
 const manifest={...base.sim.manifest,packages:[...base.sim.manifest.packages.filter(p=>p.id!=='storm_fronts'),{id:'storm_fronts',enabled:true,weight:1,startLevel:0}]};
 const w=new World(base.account,manifest);w.createPlayer(classById('warrior'),{startingCompanions:false});return w;};
try {
 const disabled=makeSimWorld('warrior',39);disabled.startWorldMass(39);assert.equal(disabled.sim.weatherScales(disabled.devOverlayView()).spawnScale,0);
 disabled.massRuntime!.weather!.advanceTo(3600);assert.equal(disabled.skyFront(),null,'disabled native weather package cannot retroactively birth geographic fronts');
 console.log('PASS actual native package gate starts the geographic weather history disabled');
 const w=fresh(43);w.startWorldMass(43);const mass=w.massRuntime!;assert.ok(mass.weather);
 w.time=3600.125;mass.weather.advanceTo(w.time);
 const graphBefore=Object.keys(w.zoneMap).sort();let wet:Point|undefined,dry:Point|undefined;
 for(let y=-50000;y<=50000&&(!wet||!dry);y+=2000)for(let x=-50000;x<=50000&&(!wet||!dry);x+=2000){
  const at={x,y},f=w.skyFront(at);
  if(!f&&!dry)dry=at;
  if(f&&WEATHER_DEFS[f.kind].wets&&f.intensity>=WET_SKY.minIntensity&&!wet)wet=at;
 }
 assert.ok(wet&&dry,'real seeded country contains separate wet and clear physical skies');
 w.player.pos={...dry};const a=w.createMonster('gnoll_prowler',3,'enemy');a.pos={...wet};w.actors.push(a);
 assert.equal(w.skyFront(),null);assert.ok(w.skyFront(a.pos));
 const at=mass.walk.at(wet.x,wet.y),context=w.localZoneAt(wet),expected=mass.weather.sample(at,context,wet)!;
 assert.deepEqual(w.skyFront(wet),expected);assert.equal(w.zoneWind(dry),null);
 const gust=1+WIND_CFG.gustAmp*Math.max(0,Math.sin(w.time*.7)*Math.sin(w.time*.23));
 const wind=w.zoneWind(wet)!;assert.ok(wind);assert.ok(Math.abs(wind.strength-Math.min(1.6,WEATHER_DEFS[expected.kind].wind!*expected.intensity*gust))<1e-12);
 (w as unknown as WeatherAccess).updateWetSky(WET_SKY.sweepSec);
 assert.equal(w.player.rainWet,false);assert.equal(a.rainWet,!w.underRoofAt(a.pos),'native wet stamp samples each body');
 assert.deepEqual(Object.keys(w.zoneMap).sort(),graphBefore,'weather never inserts synthetic graph zones');
 console.log('PASS real World physical fronts, body-local native wind and rain wetness while player stands in clear sky, with unchanged graph ownership');
 assert.ok(mass.snow);let cold:Point|undefined,warm:Point|undefined;
 for(let y=-100000;y<=100000&&(!cold||!warm);y+=5400)for(let x=-100000;x<=100000&&(!cold||!warm);x+=5400){
  const p={x,y},cover=w.snowCoverAt(p);if(cover>=SNOW_CFG.frozenBaseline&&!cold)cold=p;if(cover===0&&!warm)warm=p;
 }
 assert.ok(cold&&warm,'native geographic climates contain frozen and warm ground');
 w.player.pos={...warm};a.pos={...cold};(w as unknown as WeatherAccess).updateSnow(1);
 assert.ok(w.snowCoverAt(cold)>=SNOW_CFG.frozenBaseline);assert.equal(w.snowCover,w.snowCoverAt(warm));
 const snowBefore=canonical(mass.snow.snapshot());
 console.log('PASS real World retains separate cold/warm chunk snow and projects only player-local cover to legacy visuals');
 assert.ok(mass.storms);let storm:Point|undefined;
 for(let y=-50000;y<=50000&&!storm;y+=1800)for(let x=-50000;x<=50000&&!storm;x+=1800){const p={x,y},f=w.skyFront(p);
  if(f&&WEATHER_DEFS[f.kind].strike&&f.intensity>.25)storm=p;}
 assert.ok(storm,'real geographic native weather produces an environmental strike front');
 const owner=mass.geography!.hierarchy.at(mass.walk.at(storm.x,storm.y)).zone;
 const center=localOffset(owner.center,{...mass.origin,x:0,y:0},mass.config.terrain.addressSpan);
 for(let y=-1;y<=1;y++)for(let x=-1;x<=1;x++){const body=w.createMonster('gnoll_prowler',3,'enemy');body.pos={x:center.x+x*1400,y:center.y+y*1400};w.actors.push(body);}
 w.player.pos={...dry};const hazardStart=w.zones.length;
 for(let i=0;i<240&&w.zones.length===hazardStart;i++){w.time+=.5;mass.weather.advanceTo(w.time);(w as unknown as WeatherAccess).updateStorm(.5);}
 const hazards=w.zones.slice(hazardStart);assert.ok(hazards.length,'native resident zone schedules a real strike even with player elsewhere');
 for(const h of hazards){assert.ok(h.hitAll&&h.spareRoofed&&h.spareDormant);assert.equal(h.caster.level,Math.max(1,w.levelAt(h.pos)));}
 const hazardCount=w.zones.length;(w as unknown as WeatherAccess).updateStorm(.5);assert.equal(w.zones.length,hazardCount,'same-frame repeated actor query never duplicates a hazard');
 const stormsBefore=canonical(mass.storms.snapshot());
 console.log('PASS real native environmental strike telegraphs from an independently resident zone, uses impact level/roof protections and never duplicates within one frame');
 const before=canonical(mass.weather.snapshot()),frontBefore=canonical(w.skyFront(wet)),saved=mass.snapshot(w);
 const n=fresh(55);n.time=w.time;
 const resumed=new WorldMassRuntime(43,mass.generator.run.runId,saved.config,JSON.parse(JSON.stringify(saved)));resumed.attach(n,saved);
 assert.equal(canonical(resumed.weather!.snapshot()),before);assert.equal(canonical(resumed.snow!.snapshot()),snowBefore);assert.equal(canonical(resumed.storms!.snapshot()),stormsBefore);assert.equal(canonical(n.skyFront(wet)),frontBefore);
 const residentCount=n.actors.length,player=n.player;resumed.weather!.advanceTo(n.time+7200);n.time+=7200;
 assert.equal(n.player,player);assert.equal(n.actors.length,residentCount);
 console.log('PASS actual runtime weather Save/Continue retains physical fronts and global clock without loading zones or replacing natives');
}finally{undo();}
