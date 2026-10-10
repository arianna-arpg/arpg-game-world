import assert from 'node:assert/strict';
import {makeSimWorld} from '../src/sim/arena';
import {seedGlobalRandom} from '../src/sim/rng';
import {updateAI} from '../src/engine/ai';
import {MONSTERS} from '../src/data/monsters';
import {TILESETS} from '../src/data/tilesets';
import {WorldMassRuntime} from '../src/worldmass/runtime';
import {MassDormancy,captureNativeActorState,massDormancyPins,nativeDormancyRefusal,nativeActorQuietRefusal} from '../src/worldmass/dormancy';
import {type MassAdventure} from '../src/worldmass/preset';

const undo=seedGlobalRandom(927443);
const w=makeSimWorld('warrior',927443);w.zone={...w.zone,objective:{kind:'clear'}};
const body=w.createMonster('gnoll_prowler',3,'enemy');body.pos={x:10000,y:10000};body.fromZoneGen=true;
w.actors.push(body);const owned=new Map([['body',body]]);
const bombard=()=>Reflect.get(w,'updateBombardment').call(w);
bombard();w.actors=w.actors.slice(); // The live World replaces this list during cleanup.
assert.ok(!massDormancyPins(w,owned).has(body),'a stale bombard census must not lease native bodies');
const gunId=Object.keys(MONSTERS).find(id=>MONSTERS[id].bombard)!;assert.ok(gunId);
const gun=w.createMonster(gunId,3,'enemy');w.actors[w.actors.indexOf(body)]=gun;
bombard();assert.equal(Reflect.get(w,'bombardPresent'),true,'same-length replacement plus fresh gun invalidates census');
w.actors=w.actors.filter(a=>a!==gun);bombard();assert.equal(Reflect.get(w,'bombardPresent'),false);
w.actors.push(body);bombard();assert.equal(Reflect.get(w,'bombardPresent'),false);
w.pendingFollowUps.push({caster:body,inst:body.skills.find(Boolean)!,aim:{x:0,y:0},timer:2});
assert.ok(massDormancyPins(w,owned).has(body),'an actual emitted native attack still leases its caster');w.pendingFollowUps=[];
w.time=100;body.tellNextAt=101;body.aiRescanAt=101;body.aiTempoUntil=102;
const captured=captureNativeActorState(body)!;assert.ok(captured);
assert.equal(nativeDormancyRefusal(body,w,5,captured),null,'settled factory visual/AI query clocks are checkpointable');
assert.match(nativeActorQuietRefusal(body,w,5,captured)!,/tellNextAt/,'kind-owned callers still need their own source certificate');
const tells=body.tellSpecs;body.tellSpecs=[...(tells??[]),{id:'foreign-query'}] as typeof tells;
assert.match(nativeDormancyRefusal(body,w,5,captureNativeActorState(body))!,/tellNextAt/);body.tellSpecs=tells;
body.bombardAt=101;assert.match(nativeDormancyRefusal(body,w,5,captureNativeActorState(body))!,/bombardAt/);body.bombardAt=undefined;
body.aggroed=true;assert.match(nativeDormancyRefusal(body,w,5,captured)!,/engaged/);body.aggroed=false;
const m=new MassDormancy({source:'probe/exploration',wakeRadius:1000,sleepRadius:1600,quietSeconds:5});
const before=JSON.stringify(captureNativeActorState(body));m.update(w,owned);assert.ok(m.isSleeping(body));
assert.equal(JSON.stringify(captureNativeActorState(body)),before,'sleeping does not erase or expire the exact clocks');
w.player.pos={...body.pos};m.update(w,owned);assert.ok(!m.isSleeping(body));assert.equal(body.tellNextAt,101);
console.log('PASS derived census does not pin actors; real attacks and unknown deadlines still pin; exact native quiet clocks survive sleep/wake');

// This course runs the real AI and complete World tick. Clock-only dormancy
// fixtures missed both the actor census and the recurring visual/AI schedules.
const config:MassAdventure={theme:TILESETS.downs.theme,startRadius:0,populationRadius:900,maxPopulation:24,pageRadius:1,samplesPerTick:512,
 nativeBirthSource:'probe/exploration',territory:{source:'probe/exploration',radius:760},
 dormancy:{source:'probe/exploration',wakeRadius:1000,sleepRadius:1600,quietSeconds:5},
 terrain:{id:'exploration-course',version:1,addressSpan:960,terrainCell:30,fields:[],
 surfaces:[{id:'ground',priority:0,when:[],region:'ground',color:'#445522',biome:'downs'}],
 places:[{id:'pack',version:1,content:'pack',period:650,chance:1,radius:140,jitter:.2,when:[],priority:1}]},
 content:[{id:'pack',source:'monsters/gnoll_prowler',level:3,count:3,table:[{id:'gnoll_prowler',weight:1}]}]};
const world=makeSimWorld('warrior',77321),runtime=new WorldMassRuntime(5531,'exploration-course',config);runtime.attach(world);
world.player.invulnerable=true;world.player.untargetable=true;
const nearCounts:number[]=[];
for(let trip=0;trip<18;trip++){
 world.landPartyAt({x:3000+trip*3000,y:3000});runtime.update(world,true);
 for(let frame=0;frame<180;frame++){for(const a of [...world.actors])updateAI(a,world,1/30);world.update(1/30);}
 const nearby=world.actors.filter(a=>a.team==='enemy'&&!a.dead&&Math.hypot(a.pos.x-world.player.pos.x,a.pos.y-world.player.pos.y)<1000).length;
 nearCounts.push(nearby);assert.ok(nearby>=6,'new encounters must remain available on trip '+trip);
 assert.ok(runtime.population<=config.maxPopulation,'the live cap stays bounded');
}
const saved=JSON.parse(JSON.stringify(runtime.snapshot(world)));
assert.ok(saved.enemies.length>180,'survivors must exceed the lifetime-sized cap many times');
assert.ok(saved.dormancy.sleeping.length>150);assert.equal(world.kills,0);
const sleeper=saved.enemies.find((e:{id:string})=>saved.dormancy.sleeping.includes(e.id))!;assert.ok(sleeper);
const resumed=makeSimWorld('warrior',55311);resumed.time=world.time;
const again=new WorldMassRuntime(5531,'exploration-course',saved.config,saved);again.attach(resumed,saved);
assert.deepEqual(again.snapshot(resumed).enemies.map(e=>[e.id,e.life,e.monster,e.birth]),saved.enemies.map((e:any)=>[e.id,e.life,e.monster,e.birth]));
resumed.landPartyAt({x:sleeper.x,y:sleeper.y});again.update(resumed,true);
assert.ok(resumed.actors.some(a=>a.team==='enemy'&&a.defId===sleeper.monster&&Math.hypot(a.pos.x-sleeper.x,a.pos.y-sleeper.y)<1));
assert.equal(resumed.kills,0);
console.log('PASS 18 live AI+World trips, '+saved.enemies.length+' surviving identities, bounded '+config.maxPopulation+' active budget, cold Continue and return; nearby='+nearCounts.join(','));
undo();
