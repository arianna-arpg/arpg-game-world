import assert from 'node:assert/strict';
import {makeSimWorld} from '../src/sim/arena';
import {seedGlobalRandom} from '../src/sim/rng';
import {updateAI} from '../src/engine/ai';
import {massAdventure,type MassAdventure} from '../src/worldmass/preset';
import {WorldMassRuntime} from '../src/worldmass/runtime';
import {MassGenerator,makeMassRun} from '../src/worldmass/generator';
import {WildernessPaths} from '../src/worldmass/wildernessPaths';
import {ambientCohort,nativeAmbientPack,validateAmbientPack} from '../src/worldmass/ambientPacks';
import {TILESETS} from '../src/data/tilesets';
import {address,localOffset,moveAddress} from '../src/worldmass/address';
import {canonical} from '../src/worldmass/random';
import {siteOffset} from '../src/worldmass/sites';
import {massFormation} from '../src/worldmass/encounters';

const undo=seedGlobalRandom(43211),copy=<T>(v:T):T=>JSON.parse(canonical(v));
const config=massAdventure();
// An independent accepted-area census, including local inhibition and native
// formation replacements. No arbitrary recipe count is reported as body density.
for(const content of config.content.filter(c=>c.ambientPack)){
 validateAmbientPack(content.ambientPack!);
 const rows=[];
 for(const level of [1,12,24]){
  let total=0;
  for(const seed of [42,713,2026]){
   const recipe=config.terrain.places.find(p=>p.content===content.id)!;
   const spec={id:'density',version:1,addressSpan:960,terrainCell:30,fields:[],surfaces:[{id:'plain',priority:0,when:[],region:'ground',color:'#444444',biome:content.id}],places:[{...recipe,when:[]}]};
   const g=new MassGenerator(makeMassRun(seed,'density',spec),spec),seen=new Set<string>(),row=content.levels!.find(r=>r.level===level)!;
   for(let y=0;y<10;y++)for(let x=0;x<10;x++)for(const p of g.placesInCell({dimension:'surface',cx:String(x),cy:String(y)})){
    const q=localOffset(p.center,address('surface','0','0',0,0,960),960);
    if(seen.has(p.id)||q.x<0||q.y<0||q.x>=9600||q.y>=9600)continue;seen.add(p.id);
    const members=ambientCohort(content.ambientPack,row,seed,p.id)!;
    assert.ok(members.length>=1&&new Set(members).size===1);
    assert.deepEqual(ambientCohort(copy(content.ambientPack),copy(row),seed,p.id),members);
    total+=massFormation(row.encounters,seed,p.id)?.seats.length??members.length;
   }
  }
  const density=total/(3*9600**2)*1e6;assert.ok(density>=10&&density<=19,content.id+' level'+level+' density '+density);rows.push({level,density});
 }
 console.log('PASS accepted native ambient density '+content.id+' '+JSON.stringify(rows));
}
assert.equal(ambientCohort(undefined,{level:1,table:[{id:'plains_wolf',weight:1}]},42,'legacy'),undefined);
const natural=nativeAmbientPack('probe/native',TILESETS.downs.packs);natural.natural=[{id:'plains_wolf',size:[7,7]}];
assert.equal(ambientCohort(natural,{level:3,table:[{id:'plains_wolf',weight:1}]},42,'a')!.length,7);
assert.throws(()=>validateAmbientPack({...natural,size:[0,50]}),/Invalid ambientPack/);

// Real default destinations and terrain, with the complete player/scenery body
// oracle at each route sample. Neither a map line nor an empty cosmetic marker.
const world=makeSimWorld('warrior',43211),m=new WorldMassRuntime(99,'wilderness-survey',config);m.attach(world);
world.player.invulnerable=true;world.player.untargetable=true;
const target=m.walk.at(11520,11520),paths=m.wildernessPaths!.at(target);assert.equal(paths.length,2);
const before=canonical(paths),path=paths[0],span=config.terrain.addressSpan;
const toLocal=(p:{x:number;y:number})=>localOffset(moveAddress(path.origin,p,span),{...m.origin,x:0,y:0},span);
let samples=0;
for(let i=1;i<path.points.length;i++){
 const a=path.points[i-1],b=path.points[i],steps=Math.ceil(Math.hypot(b.x-a.x,b.y-a.y)/90);
 for(let j=0;j<=steps;j++){
  const q=toLocal({x:a.x+(b.x-a.x)*j/steps,y:a.y+(b.y-a.y)*j/steps});world.landPartyAt(q);world.time+=20;m.update(world,true);
  assert.ok(!world.pointInSolid(q.x,q.y,world.player.radius),'route body is obstructed '+canonical(q));
  assert.equal(m.walk.regionAt(q.x,q.y),'ground');samples++;
 }
}
for(const p of [path.from,path.to]){
 const q=localOffset(p.center,{...m.origin,x:0,y:0},span);world.landPartyAt(q);m.update(world,true);
 assert.ok(m.placesInCell(p.center).some(row=>row.id===p.id));
 const chest=world.chests.find(c=>c.rewardSource===canonical([p.id,'cache']));assert.ok(chest,'road must end at a live native cache');
 assert.ok(m.siteActivity(p.id),'site keeps its original activity owner');
 const site=m.config.content.find(c=>c.id===p.content)!.site!,entry=siteOffset(p,0,300),cache=siteOffset(p,site.cache!.x,site.cache!.y);
 for(let t=0;t<=1;t+=.1)assert.ok(!world.pointInSolid(q.x+entry.x+(cache.x-entry.x)*t,q.y+entry.y+(cache.y-entry.y)*t,world.player.radius),'authored entry reaches actual reward');
}
console.log('PASS real distant paths connect native guarded caches; '+samples+' full-body route/scenery samples');
const edit=moveAddress(path.origin,path.points[1],span);m.state.paint({address:edit,region:'wall',color:'#112233',cause:'probe/player-build'});
assert.equal(m.stream.sample(edit).region,'wall','player changes override generated paths');
const saved=copy(m.snapshot(world));assert.equal(saved.schema,19);
const rw=makeSimWorld('warrior',43212),rm=new WorldMassRuntime(99,'wilderness-survey',saved.config,saved);rm.attach(rw,saved);
assert.equal(canonical(rm.wildernessPaths!.at(target)),before);assert.equal(rm.stream.sample(edit).region,'wall');
const downgraded=copy(saved);downgraded.schema=18;assert.throws(()=>new WorldMassRuntime(99,'wilderness-survey',downgraded.config,downgraded),/Invalid worldmass checkpoint/);
// Independent policy instances survive cache eviction, signed distant addresses,
// opposite visitation order and total rejection without partial edge fragments.
const planner=new WildernessPaths(config.wildernessPaths!,m.generator,()=>false);
const base=canonical(planner.at(target));for(let i=0;i<40;i++)planner.at(address('surface',String(80+i*8),'80',0,0,span));
assert.ok(planner.stats.cached<=32);assert.equal(canonical(planner.at(target)),base);
for(const n of ['9007199254740993','-9007199254740993'])assert.doesNotThrow(()=>planner.at(address('surface',n,n,0,0,span)));
assert.equal(new WildernessPaths(config.wildernessPaths!,m.generator,()=>true).at(target).length,0);
console.log('PASS schema19 cold Continue, player edit priority, signed addresses, bounded replay and whole-edge refusal');
m.dispose();rm.dispose();

// Dense groups run through real AI/World, exceed lifetime capacity, and retain
// wounds/identity/squads on JSON Continue. Unknown compound owners stay separate.
const dense:MassAdventure={theme:TILESETS.downs.theme,startRadius:0,populationRadius:900,maxPopulation:48,pageRadius:1,samplesPerTick:512,
 nativeBirthSource:'probe/dense',territory:{source:'probe/dense',radius:760},dormancy:{source:'probe/dense',wakeRadius:1000,sleepRadius:1600,quietSeconds:5},
 terrain:{id:'dense',version:1,addressSpan:960,terrainCell:30,fields:[],surfaces:[{id:'plain',priority:0,when:[],region:'ground',color:'#444444',biome:'downs'}],
 places:[{id:'pack',version:1,content:'pack',period:500,chance:.9,radius:150,jitter:.6,when:[],priority:1,landformHabitat:true}]},
 content:[{id:'pack',source:'probe/dense',level:3,count:3,ambientPack:{source:'probe/dense',size:[4,6],natural:[]},table:[{id:'gnoll_prowler',weight:1}]}]};
const dw=makeSimWorld('warrior',5331),dm=new WorldMassRuntime(42,'dense',dense);dm.attach(dw);dw.player.invulnerable=true;dw.player.untargetable=true;
const counts=[];
for(let trip=0;trip<12;trip++){
 dw.landPartyAt({x:3000+trip*3200,y:3000});dm.update(dw,true);
 for(let f=0;f<180;f++){for(const a of [...dw.actors])updateAI(a,dw,1/30);dw.update(1/30);}
 const near=dw.actors.filter(a=>a.team==='enemy'&&!a.dead&&Math.hypot(a.pos.x-dw.player.pos.x,a.pos.y-dw.player.pos.y)<1000);counts.push(near.length);
 assert.ok(near.length>=16);assert.ok(near.every(a=>a.squadId!==undefined));assert.ok(dm.population<=48);
}
const ds=copy(dm.snapshot(dw));assert.ok(ds.enemies.length>300);assert.ok(ds.dormancy!.sleeping.length>250);assert.equal(dw.kills,0);
const aw=makeSimWorld('warrior',5332),am=new WorldMassRuntime(42,'dense',ds.config,ds);aw.time=dw.time;am.attach(aw,ds);
assert.deepEqual(am.snapshot(aw).enemies.map(e=>[e.id,e.monster,e.life,e.birth]),ds.enemies.map(e=>[e.id,e.monster,e.life,e.birth]));
console.log('PASS dense live travel '+ds.enemies.length+' survivors, cap48, nearby '+counts.join(',')+', native cold Continue');
const legacy=copy(dense);delete legacy.content[0].ambientPack;const lw=makeSimWorld('warrior',5333),lm=new WorldMassRuntime(42,'legacy',legacy);lm.attach(lw);assert.equal(lm.snapshot(lw).schema,10);
dm.dispose();am.dispose();lm.dispose();undo();
