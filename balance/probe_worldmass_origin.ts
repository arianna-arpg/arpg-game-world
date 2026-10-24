import assert from 'node:assert/strict';
import {massAdventure} from '../src/worldmass/preset';
import {MassGenerator,makeMassRun} from '../src/worldmass/generator';
import {chooseMassOrigin,scoreMassOrigin,validateMassOrigin,type MassOriginSpec} from '../src/worldmass/origin';
import {address} from '../src/worldmass/address';
import {canonical} from '../src/worldmass/random';
import {makeSimWorld} from '../src/sim/arena';
import {WorldMassRuntime} from '../src/worldmass/runtime';
import {serializeCharacter} from '../src/meta/character';
import {seedGlobalRandom} from '../src/sim/rng';

const config=massAdventure(),spec=config.settlement!.location!,terrain=config.terrain;
const clone=<T>(v:T):T=>JSON.parse(canonical(v));
const origins=new Set<string>();let moved=0,totalCandidates=0;
for(const seed of [42,73,81,183,5197,9837,...Array.from({length:26},(_,i)=>i*971+19)]){
 const g=new MassGenerator(makeMassRun(seed,'origin-'+seed,terrain),terrain);
 const before=canonical([g.run,g.spec]),choice=chooseMassOrigin(g,spec);
 assert.ok(choice.satisfied,'default continental start must satisfy the sample on survey seeds');
 assert.ok(choice.matched/choice.samples>=spec.minimumFraction);
 assert.equal(canonical(chooseMassOrigin(g,spec)),canonical(choice));
 assert.equal(canonical([g.run,g.spec]),before,'no edits to the world or seed');
 const old=scoreMassOrigin(g,spec,spec.base);
 if(choice.candidate===0)assert.ok(old.matched/old.samples>=spec.minimumFraction);
 else {moved++;assert.ok(old.matched/old.samples<spec.minimumFraction);}
 origins.add(canonical(choice.origin));totalCandidates+=choice.candidate+1;
 const sample=address(choice.origin.dimension,choice.origin.cx,choice.origin.cy,127.5,-39.25,terrain.addressSpan);
 const other=new MassGenerator(g.run,g.spec);assert.equal(canonical(g.terrainAt(sample)),canonical(other.terrainAt(sample)));
}
assert.ok(moved>0&&origins.size>1);console.log('PASS 32 seeds: suitable sampled starts, deterministic choices and unchanged terrain/seed; '+moved+' moved, '+totalCandidates+' candidate evaluations');
const g=new MassGenerator(makeMassRun(42,'bounded-origin',terrain),terrain);
const impossible={...clone(spec),candidates:3,when:[{field:'elevation',min:999}]};
const noLand=chooseMassOrigin(g,impossible);assert.equal(noLand.satisfied,false);assert.equal(noLand.candidate,0);assert.equal(noLand.matched,0);
assert.deepEqual(chooseMassOrigin(g,undefined).origin,{dimension:'surface',cx:'0',cy:'0'});
const far={...clone(spec),base:{dimension:'surface',cx:'9007199254740993',cy:'-9007199254740993'},candidates:1};
assert.equal(chooseMassOrigin(g,far).origin.cx,far.base.cx,'exact cells survive beyond Number precision');
for(const change of [
 (s:MassOriginSpec)=>{s.candidates=0},(s:MassOriginSpec)=>{s.candidates=129},
 (s:MassOriginSpec)=>{s.spacingCells=.5},(s:MassOriginSpec)=>{s.minimumFraction=NaN},
 (s:MassOriginSpec)=>{s.sample.step=0},(s:MassOriginSpec)=>{s.sample.step=30},
 (s:MassOriginSpec)=>{s.sample.minX=s.sample.maxX},(s:MassOriginSpec)=>{s.when=[{field:'missing'}]},
 (s:MassOriginSpec)=>{s.when=[{field:'elevation',min:1,max:0}]},
 (s:MassOriginSpec)=>{s.base.cx='01'},(s:MassOriginSpec)=>{s.base.cx='9223372036854775807'}
]){const bad=clone(spec);change(bad);assert.throws(()=>validateMassOrigin(bad,terrain));}
assert.throws(()=>validateMassOrigin(null as unknown as MassOriginSpec,terrain));
console.log('PASS bounded impossible search, legacy zero origin, exact distant cells and malformed/budget refusal');
const restore=seedGlobalRandom(8475);
try{
 const w=makeSimWorld('warrior',42);w.startWorldMass(42);const m=w.massRuntime!;
 assert.notEqual(canonical(m.origin),canonical(spec.base));
 assert.equal(canonical(m.origin),canonical(chooseMassOrigin(m.generator,spec).origin));
 const p=m.journey!.places.find(p=>p.content==='cinderwatch')!;
 w.landPartyAt(m.journey!.local(p));m.update(w,true);
 const origin=canonical(m.origin),pos=canonical(w.player.pos),save=serializeCharacter(w);
 const again=makeSimWorld('warrior',13);assert.ok(again.adoptWorldState(save.world));
 again.startWorldMass(42,save.world!.worldmass!);
 assert.equal(canonical(again.massRuntime!.origin),origin);assert.equal(canonical(again.player.pos),pos);
 assert.equal(canonical(again.massRuntime!.journey!.places),canonical(m.journey!.places));
 const oldConfig=clone(config);delete oldConfig.settlement!.location;
 const oldWorld=makeSimWorld('warrior',73),old=new WorldMassRuntime(42,'old-origin',oldConfig);old.attach(oldWorld);
 assert.deepEqual(old.origin,spec.base);const oldSave=old.snapshot(oldWorld);
 const oldResume=makeSimWorld('warrior',74);new WorldMassRuntime(42,'ignored-new-id',oldSave.config,oldSave).attach(oldResume,oldSave);
 assert.deepEqual(oldResume.massRuntime!.origin,spec.base);assert.equal(oldResume.massRuntime!.config.settlement!.location,undefined);
 console.log('PASS native chosen-origin Continue, unchanged route addresses and legacy-origin persistence');
}finally{restore();}
