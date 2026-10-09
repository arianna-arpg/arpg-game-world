/** Source-pinned original/current/local sky parity and positive installed event reads. */
import assert from 'node:assert/strict';
import fs from 'node:fs';
import {createHash} from 'node:crypto';
import ts from 'typescript';
import {makeSimWorld} from '../src/sim/arena';
import {seedGlobalRandom} from '../src/sim/rng';
import {World} from '../src/engine/world';
import type {NativeSceneCensus} from '../src/worldmass/nativeAreaScenePopulation';
import {skyOf} from '../src/data/zones';
import {radianceOf,radianceCondHeld} from '../src/world/radiance';
import {eventFrontFor,eventFrontSourceIds,registerEventFront,type EventFrontPin} from '../src/engine/eventWeather';
import {NativeAreaSceneSky} from '../src/worldmass/nativeAreaSceneSky';
import {freshSceneEnvironmentState} from '../src/worldmass/nativeAreaSceneEnvironment';
import {rollGeyserField,surgeWindowOf} from '../src/engine/geysers';
import {SpanField} from '../src/engine/spans';
import {GridWalkField} from '../src/world/gridWalk';
import {Rng} from '../src/core/rng';
import {WorldMassRuntime} from '../src/worldmass/runtime';
import {massAdventure} from '../src/worldmass/preset';
import {nativeSkyArchive,nativeSkyModuleHashes,nativeSkyOtherWorldHash,nativeSkyOtherWorldCount} from './nativeSkyArchive';
const hash=(s:string)=>createHash('sha256').update(s).digest('hex');
const emit=(s:string)=>ts.transpileModule(s,{compilerOptions:{target:ts.ScriptTarget.ES2022,module:ts.ModuleKind.ESNext,removeComments:true}}).outputText;
const read=(p:string)=>fs.readFileSync(new URL('../'+p,import.meta.url),'utf8');
for(const [p,digest]of Object.entries(nativeSkyModuleHashes))assert.equal(hash(emit(read(p))),digest,'unchanged installed executable: '+p);
const text=read('src/engine/world.ts'),sf=ts.createSourceFile('world.ts',text,99,true),cl=sf.statements.find(n=>ts.isClassDeclaration(n)&&n.name?.text==='World') as ts.ClassDeclaration;
const excluded=['skyFront','radiance','radianceCondHeld','nativeSceneSkyView','nativeSceneSkyHost'];
const others=cl.members.filter(m=>!excluded.includes(m.name?.getText(sf)??'')).map(m=>m.getText(sf).replace(/\r\n/g,'\n'));
assert.equal(others.length,nativeSkyOtherWorldCount);assert.equal(hash(JSON.stringify(others)),nativeSkyOtherWorldHash);
const core=ts.createSourceFile('nativeSceneSky.ts',read('src/engine/nativeSceneSky.ts'),99,true);
for(const [key,source]of Object.entries(nativeSkyArchive)){
 const original=ts.createSourceFile('a.ts','class A{'+source+'}',99,true).statements[0] as ts.ClassDeclaration;
 const old=(original.members[0] as ts.MethodDeclaration).body!.getText();
 const name='native'+key[0].toUpperCase()+key.slice(1),fn=core.statements.find(n=>ts.isFunctionDeclaration(n)&&n.name?.text===name) as ts.FunctionDeclaration;
 assert.equal(emit(fn.body!.getText().replace(/\bhost\b/g,'this')),emit(old),key+' exact original body');
}
console.log('PASS exact three original bodies, all seven event source modules and every other World member unchanged');
const oracle=Function('skyOf','eventFrontFor','radianceOf','radianceCondHeld',emit('return {\n'+Object.values(nativeSkyArchive).join(',\n')+'\n}'))(skyOf,eventFrontFor,radianceOf,radianceCondHeld) as Pick<World,'skyFront'|'radiance'|'radianceCondHeld'>;
const undo=seedGlobalRandom(77101),w=makeSimWorld('warrior',77101),scene:NativeSceneCensus={zone:{...w.zone,id:'native-sky-a',objective:{kind:'clear'},sky:'open' as const},actors:[w.player],player:w.player};
const environment=freshSceneEnvironmentState(),campaign={sim:w.sim,time:48},local=new NativeAreaSceneSky({scene,environment,campaign});
const bEnv=freshSceneEnvironmentState(),bScene:NativeSceneCensus={...scene,zone:{...scene.zone,id:'native-sky-b',sky:'sheltered' as const}},other=new NativeAreaSceneSky({scene:bScene,environment:bEnv,campaign});
w.zone=scene.zone;w.time=campaign.time;
const sim=w.sim as any;let active='',reads:string[]=[];
// These controlled live selectors drive the installed event callbacks themselves.
// They do not replace the event registry, sky fold, geyser clocks or radiance rules.
sim.demonFieldFor=()=>{reads.push('demon');return active==='demon_invasion'?{invasionOn:()=>({stage:{weather:{kind:'demonstorm',intensity:.7}},stormCoord:{x:7,y:13},stormRadius:144})}:null;};
Object.defineProperty(sim,'incursionField',{configurable:true,get(){reads.push('incursion');return active==='incursion'?{eventContext:()=>({archetype:{weather:{kind:'eldritch_pall',max:1}}}),influence:()=>.7}:null;}});
Object.defineProperty(sim,'myceliaField',{configurable:true,get(){reads.push('mycelia');return active==='mycelia'?{expressionOn:()=>({intensity:.7}),surge:()=>({express:{weatherKind:'spore_drift'}})}:null;}});
Object.defineProperty(sim,'huntField',{configurable:true,get(){reads.push('hunt');return active==='hunt'?{peek:()=>({lifeFrac:1,currentZoneId:scene.zone.id,revealed:false})}:null;}});
sim.overlayFor=(id:string)=>{reads.push(id);return active===id?(id==='quickening'?{quickeningOn:()=>({timeLeft:80}),surge:()=>({weatherKind:'quickened_air',sky:{floor:.25,easeSec:100}})}:{sample:()=>({kind:'storm',intensity:.7})}):null;};
let sky:ReturnType<World['skyFront']>=null;sim.weather.sample=()=>{reads.push('weather');return sky;};
const expected:Record<string,string>={demon_invasion:'demonstorm',incursion:'eldritch_pall',mycelia:'spore_drift',hunt:'hunt_spoor',quickening:'quickened_air',feature_activity:'storm',scald_surge:'scald_surge_steam'};
// Resolve the real authored Mycelia weather name; it is retained in the package definition.
const mycelia=read('src/packages/defs/mycelia.ts').match(/weatherKind:\s*'([^']+)'/);assert.ok(mycelia);expected.mycelia=mycelia[1];
Object.defineProperty(sim,'myceliaField',{configurable:true,get(){reads.push('mycelia');return active==='mycelia'?{expressionOn:()=>({intensity:.7}),surge:()=>({express:{weatherKind:expected.mycelia}})}:null;}});
function compare(){
 w.zone=scene.zone;w.time=campaign.time;w.geysers=environment.geysers;
 const original=Object.create(local.host);Object.defineProperties(original,Object.fromEntries(Object.entries(oracle).map(([k,f])=>[k,{value:f}])));
 const conditions=[undefined,{weather:['storm']},{weather:['demonstorm']},{radiance:{from:.2,to:.8}},{phases:['night'] as ['night']}];
 const before=Math.random;Math.random=()=>{throw Error('sky must not draw randomness');};
 try{
  const old={front:oracle.skyFront.call(original),r:oracle.radiance.call(original),conditions:conditions.map(c=>oracle.radianceCondHeld.call(original,c))};
  const current={front:w.skyFront(),r:w.radiance(),conditions:conditions.map(c=>w.radianceCondHeld(c))};
  const area={front:local.skyFront(),r:local.radiance(),conditions:conditions.map(c=>local.radianceCondHeld(c))};
  assert.deepEqual(current,old);assert.deepEqual(area,old);return area;
 }finally{Math.random=before;}
}
const registered=eventFrontSourceIds();assert.equal(registered.length,7);for(const id of Object.keys(expected))assert.ok(registered.includes(id));
for(active of registered){
 environment.geysers=null;campaign.time=48;
 if(active==='scald_surge'){
  environment.geysers=rollGeyserField(new Rng(101),{hiss:[2,2],geyser:[1,1]},991);
  const win=surgeWindowOf(991,1);campaign.time=(win.t0+win.t1)/2;
 }
 assert.equal(compare().front?.kind,expected[active],active+' positive native source');
 reads=[];assert.equal(other.skyFront(),null);assert.equal(other.radiance(),.45);assert.deepEqual(reads,[],'shelter prevents all event and weather reads');
}
console.log('PASS original/current/local agreement with positive output from every installed event source and real geyser windows');
active='';environment.geysers=null;campaign.time=48;
let pin:EventFrontPin|null={kind:'demonstorm',intensity:.7},pin2:EventFrontPin|null={kind:'rain',intensity:.7},faultReads=0;
registerEventFront({id:'native-sky-fault-proof',sample:()=>{faultReads++;throw Error('isolated source failure');}});
registerEventFront({id:'native-sky-first-proof',sample:()=>pin});registerEventFront({id:'native-sky-second-proof',sample:()=>pin2});
assert.equal(compare().front?.kind,'demonstorm','earliest equal event wins');assert.ok(faultReads>0);
sky={kind:'storm',pos:{x:1,y:2},vel:{x:0,y:0},radius:150,intensity:.7,age:0,life:100};
assert.equal(compare().front?.kind,'demonstorm','event wins equal ordinary sky');sky.intensity=.8;assert.equal(compare().front?.kind,'storm');
pin={kind:'demonstorm',intensity:.02};pin2=null;sky=null;assert.equal(compare().front,null,'strict lower threshold');
pin={kind:'demonstorm',intensity:2,pos:{x:17,y:29},radius:-3};const bounded=compare().front!;assert.equal(bounded.intensity,1);assert.equal(bounded.radius,1);assert.notEqual(bounded.pos,pin.pos);
scene.zone={...scene.zone,sky:'sheltered'};assert.equal(compare().front,null);scene.zone={...scene.zone,sky:'open'};
pin=null;pin2=null;campaign.time=168;assert.ok(compare().r<.05);campaign.time=48;assert.ok(compare().r>.95);
console.log('PASS shelter, exact tie order, thresholds, source exceptions, footprint copying and live clock/zone replacement');
// The native span paints its real grid on birth; no parallel visibility flag.
const grid=new GridWalkField(120,120,30);grid.fillRegion(1,1,119,119,'span_sun');
const spec=[{region:'span_sun',when:{radiance:{from:.7}},voidRegion:'cloud_void'}];
campaign.time=168;const spans=new SpanField(spec,grid,c=>local.radianceCondHeld(c));assert.equal(spans.states().span_sun,'gone');assert.equal(grid.regionAt(45,45),'cloud_void');assert.equal(grid.isWalkable(45,45),false);
campaign.time=48;spans.update(.3,c=>local.radianceCondHeld(c),[]);assert.equal(spans.states().span_sun,'held');assert.equal(grid.regionAt(45,45),'span_sun');assert.equal(grid.isWalkable(45,45),true);
assert.equal(other.radiance(),.45,'same campaign, independent sheltered area');
let selected=0;const oldLocal=local.skyFront;Object.defineProperty(local,'skyFront',{configurable:true,get(){selected++;return oldLocal;}});local.radiance();assert.equal(selected,1);delete (local as any).skyFront;
assert.equal(Object.keys(w).includes('nativeSceneSkyView'),false);assert.equal(Object.getOwnPropertyDescriptor(w,'nativeSceneSkyView')?.enumerable,false);
let rootReads=0;for(const key of ['scene','environment','campaign']){const bad:any={scene,environment,campaign};Object.defineProperty(bad,key,{get(){rootReads++;throw Error('bad root getter');}});assert.throws(()=>new NativeAreaSceneSky(bad),/own object binding/);}assert.equal(rootReads,0);
assert.throws(()=>new NativeAreaSceneSky({scene,environment:Object.create(environment),campaign}),/explicit live field/);
console.log('PASS independent local areas, actual span grid activation, live callback selection and hidden World adapter');
// Actual geographic weather stays first even if the standing classic zone is sheltered.
const massWorld=makeSimWorld('warrior',77102),runtime=new WorldMassRuntime(77102,'native-sky-geographic',massAdventure());runtime.attach(massWorld);
massWorld.zone={...massWorld.zone,sky:'sheltered'};const mass=massWorld.massRuntime!;assert.ok(mass.weather);
let geographicReads=0;const sample=mass.weather.sample;mass.weather.sample=function(...args){geographicReads++;return sample.apply(this,args);};
const before=geographicReads,normal=massWorld.skyFront(),archived=oracle.skyFront.call(massWorld);assert.deepEqual(normal,archived);assert.equal(geographicReads,before+2);
const live=massWorld.skyFront;let picked=0;Object.defineProperty(massWorld,'skyFront',{configurable:true,get(){picked++;return live;}});massWorld.radiance();assert.equal(picked,1);
runtime.dispose();undo();
console.log('PASS actual MassWeather branch preserves geographic sampling before classic shelter and selected World sky receiver');
