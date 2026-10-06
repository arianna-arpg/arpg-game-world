import assert from 'node:assert/strict';
import { ZONES, type ZoneDef } from '../src/data/zones';
import { WEATHER_DEFS, type WeatherFront } from '../src/world/weather';
import { address, latticeAt, moveAddress, type MassAddress } from '../src/worldmass/address';
import { canonical } from '../src/worldmass/random';
import { MassStorm, type MassStormHost } from '../src/worldmass/storm';
const at=address('surface','0','0',100,100,960),east=moveAddress(at,{x:5400,y:0},960);
const zone:ZoneDef={...ZONES.lastlight,objective:{kind:'none'},sky:'open'};
const front:WeatherFront={kind:'storm',pos:{x:0,y:0},vel:{x:1,y:0},radius:150,intensity:.8,age:30,life:200};
const hits:MassAddress[]=[];
const host:MassStormHost={contextAt:()=>zone,weatherAt:()=>front,fire:(strike,p)=>{assert.equal(strike,WEATHER_DEFS.storm.strike);hits.push(p);return true;}};
const one=new MassStorm(42,960,5400),many=new MassStorm(42,960,5400);let nativeTimer=0,nativeCount=0;
for(let i=1;i<=1000;i++){
 nativeTimer-=.05;if(nativeTimer<=0){nativeTimer=1/(WEATHER_DEFS.storm.strike!.ratePerSec*front.intensity);nativeCount++;}
 one.update(.05,i*.05,[at],host);
 many.update(.05,i*.05,[at,at,moveAddress(at,{x:1300,y:1300},960),at],{...host,fire:()=>true});
}
assert.equal(hits.length,nativeCount);assert.deepEqual(one.snapshot(),many.snapshot());
const before=canonical(one.snapshot());one.update(.05,50,[at,at],host);assert.equal(canonical(one.snapshot()),before);
assert.ok(hits.every(p=>latticeAt(p,960,5400).gx===0n&&latticeAt(p,960,5400).gy===0n));
console.log('PASS native strike cadence parity, actor/adjacent-chunk deduplication, same-frame idempotence and zone-bounded physical seats');

const saved=JSON.parse(JSON.stringify(one.snapshot())),continued=new MassStorm(42,960,5400,saved);
let liveSeats:string[]=[],continuedSeats:string[]=[];
for(let i=1;i<=60;i++){
 const clock=50+i*.1;one.update(.1,clock,[at,east],{...host,fire:(_s,p)=>{liveSeats.push(canonical(p));return true;}});
 continued.update(.1,clock,[east,at,at],{...host,fire:(_s,p)=>{continuedSeats.push(canonical(p));return true;}});
}
assert.deepEqual(liveSeats,continuedSeats);assert.deepEqual(one.snapshot(),continued.snapshot());
const eastBefore=one.snapshot().rows.find(r=>latticeAt(r.center,960,5400).gx===1n)!;
one.update(.1,50000,[at],host);assert.deepEqual(one.snapshot().rows.find(r=>r.owner===eastBefore.owner),eastBefore);
const priorHits=hits.length;one.update(0,50000,[east],host);assert.equal(hits.length,priorHits,'dormant time cannot manufacture catch-up hazards');
console.log('PASS independent simultaneous zone timers, exact Save/Continue future seats/cadence and dormant zones emit no elapsed-time hazards');

const denied=new MassStorm(42,960,5400),blocked:MassStormHost={...host,fire:()=>false};denied.update(.1,1,[at],blocked);
assert.equal(denied.snapshot().rows[0].attempt,1);assert.ok(denied.snapshot().rows[0].remaining>0,'native rejected seat consumes cadence');
const clear=new MassStorm(42,960,5400);clear.update(.1,1,[at],{...host,weatherAt:()=>null});assert.equal(clear.snapshot().rows.length,0);
const sheltered=new MassStorm(42,960,5400);sheltered.update(.1,1,[at],{...host,contextAt:()=>({...zone,sky:'sheltered'})});assert.equal(sheltered.snapshot().rows.length,0);
const bad=JSON.parse(JSON.stringify(saved));bad.rows[0].center.x+=1;assert.throws(()=>new MassStorm(42,960,5400,bad),/owner/);
assert.throws(()=>new MassStorm(43,960,5400,saved),/checkpoint/);
assert.throws(()=>one.update(.1,1,[at],host),/clock/);
console.log('PASS native clear/shelter refusal, failed-seat cadence, foreign/corrupt owner checkpoint and backwards-clock refusal');
