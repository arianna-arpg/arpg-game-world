import assert from 'node:assert/strict';
import { makeSimWorld } from '../src/sim/arena';
import { seedGlobalRandom } from '../src/sim/rng';
import { massAdventure } from '../src/worldmass/preset';
import { WorldMassRuntime } from '../src/worldmass/runtime';
import { serializeCharacter } from '../src/meta/character';
import { MassBirths, validMassBirth } from '../src/worldmass/birth';

const restore=seedGlobalRandom(731822);
const spec=JSON.parse(JSON.stringify(massAdventure()));
spec.terrain.places=[];delete spec.journey.extensions;delete spec.journey.stops;
spec.journey.destinations=spec.journey.destinations.filter((d:any)=>d.content==='cinderwatch');
const row=spec.content.find((c:any)=>c.id==='cinderwatch');
delete row.levels;delete row.magicPack;
row.level=8;row.count=4;row.table=[{id:'stone_sentinel',weight:1},{id:'sylvan_warden',weight:1}];delete row.limits;
function signature(a:any) {return {monster:a.defId,skills:a.skills.map((s:any)=>s&&({id:s.def.id,level:s.level,
 sockets:s.sockets.map((g:any)=>g&&({id:g.def.id,level:g.level})),
 grafts:s.grafts?.map((g:any)=>({id:g.def.id,level:g.level}))})),
 max:a.maxLife(),radius:a.radius,life:a.life,brain:a.brainVariant,
 boons:a.sheet.sourceNames().filter((s:string)=>s.startsWith('boon:')).map((s:string)=>[s,a.sheet.getSourceMods(s)]),
 conduits:a.wornConduits};}
let mismatches=0,checked=0;
for(const seed of [11,42,81,142]) {
 const w=makeSimWorld('warrior',seed),m=new WorldMassRuntime(seed,'birth-'+seed,spec);m.attach(w);
 const place=m.journey!.places[0];w.player.pos=m.journey!.local(place);m.update(w,true);
 const a=w.actors.filter(a=>a.defId==='stone_sentinel'||a.defId==='sylvan_warden');
 assert.equal(a.length,4);a[0].life*=.4;
 const before=a.map(signature),save=serializeCharacter(w),checkpoint=save.world!.worldmass!;
 assert.ok(checkpoint.enemies.every(e=>validMassBirth(e.birth!)));
 const invalid=JSON.parse(JSON.stringify(checkpoint));delete invalid.enemies[0].birth;
 assert.throws(()=>new WorldMassRuntime(seed,'invalid',spec,invalid),/Invalid worldmass survivor/);
 const again=makeSimWorld('warrior',seed+1);again.adoptWorldState(save.world);again.startWorldMass(seed,checkpoint);
 const after=again.actors.filter(a=>a.defId==='stone_sentinel'||a.defId==='sylvan_warden').map(signature);
 for(let i=0;i<before.length;i++){checked++;if(JSON.stringify(before[i])!==JSON.stringify(after[i]))mismatches++;}
}
console.log(JSON.stringify({checked,mismatches}));
assert.equal(mismatches,0,'native rolled kits and wounds must survive Continue');
console.log('PASS native guardian grants, supports, boons and body state remain stable through Continue');
assert.ok(!validMassBirth({seed:-1})&&!validMassBirth({seed:NaN})&&!validMassBirth({seed:1,scale:0}));
const w=makeSimWorld('warrior',55),births=new MassBirths('probe/native-birth',55);
const globalDie=Math.random;let outside=0;
const sentinel=()=>{outside++;return .25;};Math.random=sentinel;
try {
 const first=births.create(w,'same-body','sylvan_warden',8);
 const checkpoint=births.of(first)!;
 assert.equal(checkpoint.scale,undefined,'omitted factory scale must remain omitted');
 const again=births.create(w,'same-body','sylvan_warden',8,999,checkpoint);
 assert.deepEqual(signature(again),signature(first));
 assert.equal(outside,0,'native birth rolls must not consume unrelated combat randomness');
 assert.equal(Math.random,sentinel);
 assert.throws(()=>births.create({createMonster(){throw Error('factory failure');}} as any,'failed','sylvan_warden',8));
 assert.equal(Math.random,sentinel,'throwing native factory restores the outside die');
} finally {Math.random=globalDie;}
console.log('PASS original factory arguments and outside random stream survive replay and exceptions');
const legacy=JSON.parse(JSON.stringify(spec));delete legacy.nativeBirthSource;
const old=new WorldMassRuntime(71,'old-style',legacy);old.attach(w);
w.player.pos=old.journey!.local(old.journey!.places[0]);old.update(w,true);
const oldSave=old.snapshot(w);assert.ok(oldSave.enemies.length>0&&oldSave.enemies.every(e=>!e.birth));
new WorldMassRuntime(71,'old-style',legacy,oldSave).attach(makeSimWorld('warrior',72),oldSave);
console.log('PASS existing descriptors without birth records retain their legacy admission path');
restore();
