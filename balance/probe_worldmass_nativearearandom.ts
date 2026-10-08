import assert from 'node:assert/strict';
import { createHash } from 'node:crypto';
import { gunzipSync } from 'node:zlib';
import ts from 'typescript';
import { Rng, withRngRandom, withSeededRandom } from '../src/core/rng';
import { NativeAreaRandom, restoreNativeAreaRandomState, type NativeAreaRandomState } from '../src/worldmass/nativeAreaRandom';
import { makeSimWorld } from '../src/sim/arena';
import { generateLayout, doodadRuleOf, type GeneratedLayout } from '../src/engine/levelgen';
import { captureNativeGeneration } from '../src/worldmass/nativeGeneration';
import { captureNativeAreaGeometry } from '../src/worldmass/nativeAreaGeometryCapture';
import { serializeNativeAreaData, restoreNativeAreaData } from '../src/worldmass/nativeAreaGeometry';
import { captureNativeEffectSources } from '../src/worldmass/nativeEffectSources';
import { NativeAreaLocal } from '../src/worldmass/nativeAreaLocal';
import { spawnNativePacks, spawnNativeWildlife } from '../src/engine/nativeAmbient';
import { resetActorIdCounter, type Actor } from '../src/engine/actor';
import { nextItemUid } from '../src/engine/itemgen';
import { captureNativeActorState } from '../src/worldmass/dormancy';
import { GridWalkField, WALK_CFG } from '../src/world/gridWalk';
import { PIT_CFG } from '../src/engine/pitfall';
import { NAV_CFG } from '../src/engine/world';
import { rand, vec } from '../src/core/math';
import type { ZoneDef } from '../src/data/zones';
import type { Bounds } from '../src/world/shape';

const ORIGINAL = {"commit":"8dcfa9e1","source":"// ---------------------------------------------------------------------------\n// Seeded randomness — the procedural-generation primitive.\n//\n// Everything that builds a level draws from one Rng instance, so a single\n// seed number reproduces an entire layout. Static zones roll a fresh seed\n// per visit (their terrain reshuffles); GENERATED zones carry their seed in\n// their definition, so an uncharted zone you discovered keeps its layout\n// when you come back — the world you explored stays the world you explored.\n// ---------------------------------------------------------------------------\n\nexport class Rng {\n  private s: number;\n\n  constructor(seed: number) {\n    this.s = seed >>> 0;\n    if (this.s === 0) this.s = 0x9e3779b9;\n  }\n\n  /** Next float in [0, 1) — mulberry32. */\n  next(): number {\n    this.s = (this.s + 0x6d2b79f5) >>> 0;\n    let t = this.s;\n    t = Math.imul(t ^ (t >>> 15), t | 1);\n    t ^= t + Math.imul(t ^ (t >>> 7), t | 61);\n    return ((t ^ (t >>> 14)) >>> 0) / 4294967296;\n  }\n\n  /** Float in [lo, hi). */\n  range(lo: number, hi: number): number {\n    return lo + this.next() * (hi - lo);\n  }\n\n  /** Integer in [lo, hi] inclusive. */\n  int(lo: number, hi: number): number {\n    return Math.floor(this.range(lo, hi + 1));\n  }\n\n  chance(p: number): boolean {\n    return this.next() < p;\n  }\n\n  pick<T>(arr: readonly T[]): T {\n    return arr[Math.floor(this.next() * arr.length)];\n  }\n\n  /** Weighted roll over { …, weight } entries. */\n  weighted<T extends { weight: number }>(table: readonly T[]): T {\n    let total = 0;\n    for (const e of table) total += e.weight;\n    let roll = this.range(0, total);\n    for (const e of table) {\n      roll -= e.weight;\n      if (roll <= 0) return e;\n    }\n    return table[table.length - 1];\n  }\n}\n\n/** A fresh unpredictable seed (for per-visit layouts and new zone identities). */\nexport function rollSeed(): number {\n  return (Math.random() * 4294967296) >>> 0;\n}\n\n/** Run `fn` with Math.random SWAPPED for a seeded mulberry32 stream, then\n *  restore the true die — whatever happens (try/finally). THE OFF-STREAM\n *  LAW: a system whose rolls must be a pure function of a seed (the\n *  counters' per-beat shelves; the sim harness) borrows the global die for\n *  exactly its own span and hands it back untouched, so no other system's\n *  stream ever shifts under it (the reseed-per-world trap, made\n *  structurally impossible at this seam). Helpers that read Math.random\n *  transitively (rand/randInt/chance/pick, the item roller) all follow the\n *  swap for free — no rng threading through their signatures. */\nexport function withSeededRandom<T>(seed: number, fn: () => T): T {\n  const rng = new Rng(seed);\n  const real = Math.random;\n  Math.random = () => rng.next();\n  try {\n    return fn();\n  } finally {\n    Math.random = real;\n  }\n}\n","sha256":"560e3b29126cb80f51f165834a8cec6e6ae759b31cdd6f3e5c2d2abf6cf44493"};
assert.equal(createHash('sha256').update(ORIGINAL.source).digest('hex'),ORIGINAL.sha256);
const exports: any = {};
new Function('exports',ts.transpileModule(ORIGINAL.source,{compilerOptions:{target:ts.ScriptTarget.ES2022,module:ts.ModuleKind.CommonJS}}).outputText)(exports);
const OldRng = exports.Rng as typeof Rng;
let primitivePairs=0;
for(const seed of [0,1,713,991,0xffffffff,-1,2**32,2**32+19,NaN,Infinity]) {
  const old=new OldRng(seed),now=new Rng(seed);
  for(let i=0;i<130;i++){
    const a=[old.next(),old.range(-71,42),old.int(-18,79),old.chance(.47),old.pick(['a','b','c']),old.weighted([{id:'a',weight:1},{id:'b',weight:4}])];
    const b=[now.next(),now.range(-71,42),now.int(-18,79),now.chance(.47),now.pick(['a','b','c']),now.weighted([{id:'a',weight:1},{id:'b',weight:4}])];
    assert.deepEqual(b,a);assert.equal(now.snapshot(),(old as any).s);primitivePairs++;
  }
  const state=now.snapshot(),clone=Rng.fromState(state);assert.equal(now.snapshot(),state);
  assert.deepEqual(Array.from({length:32},()=>clone.next()),Array.from({length:32},()=>now.next()));
}
// A real transition INTO cursor0 must restore as0, unlike constructor seed0.
const intoZero=Rng.fromState((-0x6d2b79f5)>>>0);intoZero.next();assert.equal(intoZero.snapshot(),0);
const zero=Rng.fromState(0),zeroTwin=Rng.fromState(JSON.parse(JSON.stringify(zero.snapshot())));
assert.notEqual(new Rng(0).snapshot(),0);assert.equal(zeroTwin.snapshot(),0);
assert.equal(zero.next(),zeroTwin.next());assert.notEqual(zero.snapshot(),new Rng(0).snapshot());
for(const bad of [-0,-1,.5,0x100000000,NaN,Infinity,undefined,null,'0'])assert.throws(()=>Rng.fromState(bad as number));
let seededExpected:unknown;
const sentinel=Math.random;
for(const scope of [exports.withSeededRandom,withSeededRandom]) {
  const a=scope(713,()=>[Math.random(),scope(991,()=>[Math.random(),Math.random()]),Math.random()]);
  if(scope===withSeededRandom)assert.deepEqual(a,seededExpected);else seededExpected=a;
  const fault={scope:'original exception'};try{scope(713,()=>{Math.random();throw fault;});assert.fail('did not throw');}catch(e){assert.equal(e,fault);}
  assert.equal(Math.random,sentinel);
  const object=scope(713,()=>({then:'native old return is untouched'}));assert.equal(object.then,'native old return is untouched');
}
const outer=new Rng(713),inner=new Rng(991),control=new Rng(713),innerControl=new Rng(991);
withRngRandom(outer,()=>{
  assert.equal(Math.random(),control.next());const outerDraw=Math.random;
  withRngRandom(inner,()=>{assert.equal(Math.random(),innerControl.next());assert.throws(outerDraw,/active scope/);assert.throws(()=>withRngRandom(outer,()=>0),/already scoped/);});
  assert.equal(Math.random,outerDraw);assert.equal(Math.random(),control.next());
  assert.throws(()=>withRngRandom(inner,()=>{Math.random();throw Error('nested');}),/nested/);
  assert.equal(Math.random,outerDraw);assert.equal(Math.random(),control.next());
});
assert.equal(Math.random,sentinel);
let escaped!:()=>number;
withRngRandom(outer,()=>{escaped=Math.random;});assert.throws(escaped,/escaped/);
let asyncCalled=false;assert.throws(()=>withRngRandom(outer,async()=>{asyncCalled=true;}),/synchronous/);assert.equal(asyncCalled,false);
let thenReads=0;assert.throws(()=>withRngRandom(outer,()=>Object.defineProperty({},'then',{get(){thenReads++;return ()=>{};}})),/asynchronous/);assert.equal(thenReads,0);
assert.throws(()=>withRngRandom(outer,()=>{Math.random=()=>.5;}),/changed its global/);assert.equal(Math.random,sentinel);
const o=new NativeAreaRandom(0,713),oState=o.snapshot();assert.ok(Object.isFrozen(oState));
o.run(g=>{const before=o.snapshot();assert.deepEqual(o.snapshot(),before);assert.throws(()=>o.run(()=>0),/already active/);g.next();Math.random();});
assert.notDeepEqual(o.snapshot(),oState);assert.equal(Math.random,sentinel);
const cold=NativeAreaRandom.fromState(JSON.parse(JSON.stringify(o.snapshot())));
assert.deepEqual(cold.run(g=>[g.next(),Math.random()]),o.run(g=>[g.next(),Math.random()]));
const zeroOwner=NativeAreaRandom.fromState({schema:1,algorithm:'native-area-mulberry32-v1',geometry:0,ambient:0});
assert.deepEqual(zeroOwner.run(g=>[g.next(),Math.random()]),[Rng.fromState(0).next(),Rng.fromState(0).next()]);
const valid={schema:1,algorithm:'native-area-mulberry32-v1',geometry:1,ambient:2} as const;
let refusals=0;
for(const bad of [null,{},Object.create(valid),{...valid,extra:1},{...valid,schema:2},{...valid,algorithm:'other'},
  ...['geometry','ambient'].flatMap(k=>[-0,-1,.5,0x100000000,NaN,Infinity,undefined,'1'].map(v=>({...valid,[k]:v})))]) {
  assert.throws(()=>NativeAreaRandom.fromState(bad as NativeAreaRandomState));refusals++;
}
for(const key of Object.keys(valid)) {
  let reads=0;const bad={...valid};Object.defineProperty(bad,key,{get(){reads++;return valid[key as keyof typeof valid];},enumerable:true});
  assert.throws(()=>restoreNativeAreaRandomState(bad));assert.equal(reads,0);refusals++;
}
const symbol={...valid,[Symbol('x')]:1};assert.throws(()=>restoreNativeAreaRandomState(symbol));refusals++;
const hidden={...valid};Object.defineProperty(hidden,'geometry',{value:1,enumerable:false});assert.throws(()=>restoreNativeAreaRandomState(hidden));refusals++;

const fixtures=JSON.parse(gunzipSync(Buffer.from('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','base64')).toString('utf8')) as {seed:number;zone:ZoneDef;arena:Bounds;entry:{x:number;y:number};exits:{x:number;y:number}[];doodads:number}[];
const effectBody="    for (const d of layout.doodads) {\n      if (d.effect) continue;\n      const rEff = doodadRuleOf(d.kind).effect;\n      if (rEff) d.effect = { ...rEff, cd: rand(0, rEff.interval) };\n    }";
const attachEffects=new Function('doodadRuleOf','rand',`return layout=>{${effectBody}}`)(doodadRuleOf,rand) as (layout:GeneratedLayout)=>void;
// Fixed real native operations at explicit boundaries. This preserves their
// complete inputs and full sources, but does not claim intervening World.load
// objective/controller stages have been extracted or admitted.
function course(f:typeof fixtures[number],mode:'archive'|'continuous'|'resume',ambientSeed:number) {
  const world=withSeededRandom(811,()=>makeSimWorld('warrior',811)) as any;
  const source=structuredClone(f.zone);source.exitBoundaries=source.exitBoundaries?.map(v=>v??undefined);
  source.exitRoads=source.exitRoads?.map(v=>v??undefined);source.exitMelds=source.exitMelds?.map(v=>v??undefined);
  const geometryTape:number[]=[],ambientTape:number[]=[];
  let owner=new NativeAreaRandom(source.seed!,ambientSeed),oldGeometry=new OldRng(source.seed!),oldAmbient=new OldRng(ambientSeed);
  const instrument=(rng:Rng,tape:number[])=>{const next=rng.next;rng.next=()=>{const n=next.call(rng);tape.push(n);return n;};};
  const instrumentOwner=()=>{instrument((owner as any).geometry,geometryTape);instrument((owner as any).ambient,ambientTape);};
  if(mode==='archive'){instrument(oldGeometry,geometryTape);instrument(oldAmbient,ambientTape);}else instrumentOwner();
  const scope=<T>(fn:(g:Rng)=>T):T=>{
    if(mode!=='archive')return owner.run(fn);
    const previous=Math.random;Math.random=()=>oldAmbient.next();try{return fn(oldGeometry);}finally{Math.random=previous;}
  };
  const snapshot=():NativeAreaRandomState=>mode==='archive'?{schema:1,algorithm:'native-area-mulberry32-v1',geometry:(oldGeometry as any).s,ambient:(oldAmbient as any).s}:owner.snapshot();
  let layout!:GeneratedLayout,zone=source,channels:unknown,boundary!:NativeAreaRandomState,layoutBytes='',coldBytes='';
  const generate=(g:Rng)=>{
    const captured=captureNativeGeneration(zone,()=>generateLayout(zone,structuredClone(f.arena),g,structuredClone(f.entry),structuredClone(f.exits),[]));
    layout=captured.value;channels=captured.sidechannels;boundary=snapshot();
    const before=[geometryTape.length,ambientTape.length];
    const geometry=captureNativeAreaGeometry({sourceIdentity:'random-course/'+zone.id,bounds:f.arena,layout});
    layoutBytes=serializeNativeAreaData({zone,geometry,channels});coldBytes=layoutBytes;
    assert.deepEqual([geometryTape.length,ambientTape.length],before,'capture consumes no die');
    assert.deepEqual(snapshot(),boundary,'stage checkpoint consumes no die');
  };
  let effects:unknown,bodyStates:unknown,cull=0,factoryCount=0,itemBase=0,allocations=0;
  const continueNative=(g:Rng)=>{
    attachEffects(layout);effects=captureNativeEffectSources(layout.doodads);
    const geometry=captureNativeAreaGeometry({sourceIdentity:'random-course/'+zone.id,bounds:f.arena,layout});
    const local=new NativeAreaLocal({zone,geometry,entry:f.entry,playerPosition:f.entry,
      config:{navigationPad:NAV_CFG.pad,eventSpacing:240,ledgeGrasp:WALK_CFG.ledgeGrasp,pitSweepGran:PIT_CFG.sweepGran}});
    world.zone=zone;world.player.pos=vec(f.entry.x,f.entry.y);world.player.level=zone.level;world.zoneGenTagging=true;
    world.time=25;world.squadSeq=900;world.actors=[];
    const created:Actor[]=[],make=world.createMonster;
    world.createMonster=function(...args:any[]){const a=make.apply(world,args);created.push(a);return a;};
    resetActorIdCounter(700000);itemBase=nextItemUid()+1;
    try {
      const host=local.ambient({ambient:world.nativeAmbientHost(),groups:world.nativeEncounterGroupHost(),player:world.player,actors:world.actors});
      spawnNativePacks(host,zone);spawnNativeWildlife(host,zone);
      // The actual native cull operation consumes this same explicit die for
      // a range-authored control. It is not an inserted production objective.
      cull=world.rollCullNeed({kind:'clear',need:[3,17]},g);
      const capture=(a:Actor)=>{const state=captureNativeActorState(a);assert.ok(state);
        for(const node of state.nodes)for(const entry of node.entries)if(entry[0]==='uid'&&typeof entry[1]==='number')entry[1]-=itemBase;
        return state;};
      bodyStates={attempts:created.map(capture),admitted:world.actors.map(capture)};factoryCount=created.length;
      allocations=nextItemUid()-itemBase;
    } finally {world.createMonster=make;}
  };
  if(mode==='resume') {
    scope(generate);const savedState=JSON.parse(JSON.stringify(snapshot()));
    const decoded=restoreNativeAreaData<any>(coldBytes);zone=decoded.zone;channels=decoded.channels;
    layout={...structuredClone(decoded.geometry.layout),...(decoded.geometry.walk.kind==='grid'?{walk:GridWalkField.unpack(decoded.geometry.walk.packed)}:{})};
    owner=NativeAreaRandom.fromState(savedState);instrumentOwner();scope(continueNative);
  } else scope(g=>{generate(g);continueNative(g);});
  const end=snapshot();
  const witnessGeometry=Rng.fromState(end.geometry);
  const witnesses={geometry:Array.from({length:4},()=>witnessGeometry.next()),ambient:Rng.fromState(end.ambient).next()};
  assert.deepEqual(snapshot(),end,'witness reads clone state, not original stream');
  return {layoutBytes,channels,boundary,end,effects,bodyStates,cull,factoryCount,allocations,geometryTape,ambientTape,witnesses};
}
let layouts=0,actualAttempts=0,geometryDraws=0,ambientDraws=0;
for(const f of fixtures)for(const seed of [713,991]) {
  const original=course(f,'archive',seed),continuous=course(f,'continuous',seed),resumed=course(f,'resume',seed);
  assert.deepEqual(continuous,original,'native uninterrupted '+f.zone.id);assert.deepEqual(resumed,original,'native cold split/resume '+f.zone.id);
  assert.ok(original.geometryTape.length>0&&original.ambientTape.length>0&&original.factoryCount>0);
  layouts++;actualAttempts+=original.factoryCount;geometryDraws+=original.geometryTape.length;ambientDraws+=original.ambientTape.length;
}
const A=course(fixtures[0],'resume',713);course(fixtures[1],'resume',991);assert.deepEqual(course(fixtures[0],'resume',713),A);
assert.equal(Math.random,sentinel);
console.log(`nativearearandom PASS: ${primitivePairs} original primitive tuples; ${refusals} strict state refusals; ${layouts} complete native layout/effect/population cold continuation pairs; ${actualAttempts} native factories; ${geometryDraws} geometry + ${ambientDraws} ambient draws; zero cursor/nested/exception/A-B-A controls`);
console.log('LIMIT same installed native sources and explicit stage order required; no complete World.load/controller/source-issuer admission');

// A native rule-effect control guarantees real post-generation cooldown draws
// even when a sampled natural face emits no effect-bearing decoration.
function effectContinuation(split:boolean) {
  let owner=new NativeAreaRandom(171,991);
  const data={doodads:[{kind:'lava',pos:vec(10,20),radius:30},{kind:'lava',pos:vec(50,20),radius:30},
    {kind:'lava',pos:vec(80,20),radius:30,effect:{...doodadRuleOf('lava').effect!,cd:.25}}]};
  let checkpoint!:NativeAreaRandomState;
  owner.run(g=>{g.next();Math.random();checkpoint=owner.snapshot();});
  if(split)owner=NativeAreaRandom.fromState(JSON.parse(JSON.stringify(checkpoint)));
  const before=owner.snapshot();owner.run(()=>attachEffects(data as GeneratedLayout));
  assert.notEqual(owner.snapshot().ambient,before.ambient);assert.equal(owner.snapshot().geometry,before.geometry);
  assert.equal(data.doodads[2].effect!.cd,.25,'explicit native effect keeps its original cooldown');
  return {data,state:owner.snapshot(),source:captureNativeEffectSources(data.doodads as any)};
}
assert.deepEqual(effectContinuation(true),effectContinuation(false));
const na=new NativeAreaRandom(713,991),nb=new NativeAreaRandom(12,13),controlA=new NativeAreaRandom(713,991);
const nested=na.run(g=>{const pre=[g.next(),Math.random()];nb.run(inner=>[inner.next(),Math.random()]);
  return [...pre,g.next(),Math.random()];});
assert.deepEqual(nested,controlA.run(g=>[g.next(),Math.random(),g.next(),Math.random()]));
assert.deepEqual(na.snapshot(),controlA.snapshot());assert.equal(Math.random,sentinel);
const broken=new NativeAreaRandom(91,92);let errorCheckpoint!:NativeAreaRandomState;
assert.throws(()=>broken.run(g=>{g.next();Math.random();errorCheckpoint=broken.snapshot();throw Error('native stage error');}),/native stage error/);
assert.deepEqual(broken.snapshot(),errorCheckpoint);assert.equal(Math.random,sentinel);
assert.deepEqual(broken.run(g=>[g.next(),Math.random()]),NativeAreaRandom.fromState(errorCheckpoint).run(g=>[g.next(),Math.random()]));
let ownerAsyncCalls=0;assert.throws(()=>broken.run(async()=>{ownerAsyncCalls++;}),/synchronous/);assert.equal(ownerAsyncCalls,0);
assert.throws(()=>broken.run(()=>Promise.resolve(0)),/asynchronous/);assert.equal(Math.random,sentinel);
console.log('nativearearandom scope/effect PASS: actual native rule cooldowns, explicit effects retained, owner nesting, exception checkpoint and async refusal');
let lazyCalls=0;const lazyScope=function*(){lazyCalls++;yield Math.random();};
const lazyRng=new Rng(19),lazyOwner=new NativeAreaRandom(19,20);
const lazyBefore=lazyRng.snapshot(),lazyState=lazyOwner.snapshot();
assert.throws(()=>withRngRandom(lazyRng,lazyScope),/synchronous/);
assert.throws(()=>lazyOwner.run(lazyScope),/synchronous/);
assert.equal(lazyCalls,0);assert.equal(lazyRng.snapshot(),lazyBefore);assert.deepEqual(lazyOwner.snapshot(),lazyState);assert.equal(Math.random,sentinel);
console.log('nativearearandom lazy generator refusal PASS: both APIs reject before work or draws');
