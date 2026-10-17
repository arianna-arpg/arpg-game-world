/** Independent physical patch contracts. No route is painted or scenery cleared.
 * Native pour kernel parity lives in the source extraction probe; this verifies
 * the saved adapter, complete rejection, actual grid/status and bypass width. */
import assert from 'node:assert/strict';
import { address, cellKey, latticeAt, localOffset, moveAddress, type MassAddress } from '../src/worldmass/address';
import { canonical } from '../src/worldmass/random';
import type { MassSpec, MassTerrain } from '../src/worldmass/contracts';
import { MassGenerator, makeMassRun, matchesMassRanges } from '../src/worldmass/generator';
import { MassTerrainPatches, type MassPatchPlan, type MassPatchBox } from '../src/worldmass/terrainPatches';
import { MassState } from '../src/worldmass/state';
import { MassStream } from '../src/worldmass/stream';
import { MassWalk } from '../src/worldmass/walk';
import { massAdventure, type MassAdventure } from '../src/worldmass/preset';
import { WorldMassRuntime } from '../src/worldmass/runtime';
import { regionPathCost } from '../src/world/regions';
import { chooseMassOrigin } from '../src/worldmass/origin';
import { TOWN_TIERS } from '../src/data/townBuild';
import { MONSTERS } from '../src/data/monsters';
import { puzzleSeats } from '../src/worldmass/puzzles';
import { shapeBoundR } from '../src/engine/shapes';
import { hitSurfaceOf, type Doodad } from '../src/engine/levelgen';
import { makeSimWorld } from '../src/sim/arena';
import { seedGlobalRandom } from '../src/sim/rng';

let passed = 0, failed = 0;
function test(name: string, run: () => void): void {
  try { run(); passed++; console.log('PASS ' + name); }
  catch (error) { failed++; console.error('FAIL ' + name, error); }
}
const copy = <T>(v: T): T => JSON.parse(canonical(v)) as T;
const specOf = (): MassSpec => ({
  id: 'probe:terrain-patches', version: 1, addressSpan: 960, terrainCell: 30,
  fields: [{ id: 'moisture', base: .7, layers: [] }],
  surfaces: [{ id: 'marsh', priority: 0, when: [], region: 'ground', color: '#334433', biome: 'marsh' }],
  places: [], patches: { source: 'probe/native-wet-bodies', version: 1, spacing: 960, jitter: .2, bypass: 60,
    recipes: [{ id: 'wet', onSurfaces: ['marsh'], when: [{ field: 'moisture', min: .5 }], chance: 1,
      choices: [{ id: 'mud', weight: 1, region: 'mud', color: '#554433', radius: [40, 60], scale: 1.2, wobble: .3, pieces: [2, 4] }] }] },
});
const generator = (spec = specOf(), seed = 713, id = 'patch-contract') => new MassGenerator(makeMassRun(seed, id, spec), spec);
const origin = address('surface', '0', '0', 0, 0, 960);
const at = (x: number, y: number) => moveAddress(origin, { x, y }, 960);
const planOf = (g: MassGenerator, p = origin): Readonly<MassPatchPlan> => {
  const plan = g.patches?.at(p); assert.ok(plan, 'expected a complete patch'); return plan;
};
const pointOf = (plan: Readonly<MassPatchPlan>, index: number, spec: MassSpec): MassAddress => {
  const cell = spec.terrainCell, cols = spec.patches!.spacing / cell;
  return moveAddress(plan.origin, { x: (index % cols + .5) * cell, y: (Math.floor(index / cols) + .5) * cell }, spec.addressSpan);
};
const boundsOf = (p: Readonly<MassPatchPlan>): MassPatchBox => ({
  minX: Math.min(...p.bypasses.map(b => b.minX)), minY: Math.min(...p.bypasses.map(b => b.minY)),
  maxX: Math.max(...p.bypasses.map(b => b.maxX)), maxY: Math.max(...p.bypasses.map(b => b.maxY)),
});

// Independent exact capsule/rectangle oracle for axis-aligned route segments.
// Uses the final region cells, not planner bypass boxes or their reserve helper.
function capsuleNeutral(g: MassGenerator, base: MassAddress, a: {x:number;y:number}, b: {x:number;y:number}, radius = 14): boolean {
  assert.ok(a.x === b.x || a.y === b.y, 'oracle requires axis-aligned segments');
  const cell = g.spec.terrainCell, x0 = Math.min(a.x,b.x), x1 = Math.max(a.x,b.x), y0 = Math.min(a.y,b.y), y1 = Math.max(a.y,b.y);
  for (let y = Math.floor((y0-radius)/cell); y <= Math.floor((y1+radius)/cell); y++)
    for (let x = Math.floor((x0-radius)/cell); x <= Math.floor((x1+radius)/cell); x++) {
      const dx = Math.max(x*cell-x1, x0-(x+1)*cell, 0), dy = Math.max(y*cell-y1, y0-(y+1)*cell, 0);
      if (dx*dx+dy*dy <= radius*radius && g.terrainAt(moveAddress(base,{x:(x+.5)*cell,y:(y+.5)*cell},g.spec.addressSpan)).region !== 'ground') return false;
    }
  return true;
}
function routes(p: Readonly<MassPatchPlan>) {
  const f = p.footprint, o = boundsOf(p), left = (o.minX+f.minX)/2, right = (o.maxX+f.maxX)/2, mid = (f.minY+f.maxY)/2;
  return [(o.minY+f.minY)/2,(o.maxY+f.maxY)/2].map(y => [{x:left,y:mid},{x:left,y},{x:right,y},{x:right,y:mid}]);
}
function verifyBypasses(g: MassGenerator, p: Readonly<MassPatchPlan>, radius=14): void {
  for (const route of routes(p)) for (let i=1;i<route.length;i++) {
    assert.ok(capsuleNeutral(g,p.origin,route[i-1],route[i],radius), 'full body capsule including bends must remain neutral');
    assert.equal(g.patches!.reserves(moveAddress(p.origin,route[i],g.spec.addressSpan),14),true,'late scenery is excluded at route corners');
  }
}

test('saved patch validation rejects malformed sources, shapes, cells and recipes', () => {
  // Deliberately malformed serialized input, so mutation uses the wire shape.
  const invalid: Array<(s:any)=>void> = [
    s=>s.patches=null,s=>s.patches=false,s=>s.patches=0,s=>s.patches='',s=>s.patches.source='',s=>s.patches.source=7,s=>s.patches.version=0,s=>s.patches.spacing=945,
    s=>s.patches.spacing=30,s=>s.patches.spacing=100000,s=>s.patches.jitter=1,s=>s.patches.bypass=30,
    s=>s.patches.bypass=61,s=>s.patches.recipes=[],s=>s.patches.recipes.push(s.patches.recipes[0]),
    s=>s.patches.recipes[0].onSurfaces=['missing'],s=>s.patches.recipes[0].chance=1.01,
    s=>s.patches.recipes[0].when=[{field:'missing',min:0}],s=>s.patches.recipes[0].when=[{field:'moisture',min:1,max:0}],
    s=>s.patches.recipes[0].choices=[],s=>s.patches.recipes[0].choices[0].weight=0,
    s=>s.patches.recipes[0].choices[0].region=42,s=>s.patches.recipes[0].choices[0].color='green',
    s=>s.patches.recipes[0].choices[0].radius=[60,40],s=>s.patches.recipes[0].choices[0].radius=[150,160],
    s=>s.patches.recipes[0].choices[0].scale=0,s=>s.patches.recipes[0].choices[0].wobble=1.01,
    s=>s.patches.recipes[0].choices[0].pieces=[1.5,3],s=>s.patches.recipes[0].choices[0].pieces=[4,3],
    s=>s.patches.recipes[0].choices[0].pieces=[0,13],s=>s.patches.recipes[0].choices[0].radius=[NaN,60],
  ];
  for (const [i,mutate] of invalid.entries()) { const s=specOf();mutate(s);assert.throws(()=>generator(s),'malformed policy '+i); }
  const g=generator();assert.throws(()=>g.patches!.reserves(origin,-1));assert.throws(()=>g.patches!.reserves(origin,1e9));
});

test('full signed address boundaries, dimensions and non-divisor lattice are deterministic without random draws', () => {
  const random=Math.random; Math.random=()=>{throw Error('patch planner consumed global RNG');};
  try {
    const ids=new Set<string>(),g=generator();
    for (const cx of ['-9223372036854775808','-9007199254740993','-4294967297','-1','0','1','4294967296','9007199254740993','9223372036854775807']) {
      const p=address('surface',cx,'0',480,480,960),plan=planOf(g,p);ids.add(plan.id);
      assert.equal(canonical(g.patches!.at({...p,x:0})),canonical(plan));
      assert.equal(canonical(g.patches!.at({...p,x:959.999})),canonical(plan));
      assert.equal(canonical(g.terrainAt(pointOf(plan,plan.cells[0],g.spec))),canonical(g.terrainAt(pointOf(plan,plan.cells[0],g.spec))));
      assert.doesNotThrow(()=>g.patches!.reserves({...p,x:0},14));
      assert.doesNotThrow(()=>g.patches!.reserves({...p,x:959.999},14));
    }
    assert.equal(ids.size,9,'full cell identity must not truncate');
    assert.notEqual(planOf(g,{...origin,dimension:'underworld'}).id,planOf(g).id);
    for (const x of [-960.001,-960,-.001,0,959.999,960]) {
      const a=at(x,0),same=address('surface','1','0',x-960,0,960);
      assert.deepEqual(g.terrainAt(a),g.terrainAt(same));assert.equal(planOf(g,a).origin.cx,latticeAt(a,960,960).gx.toString());
    }
    const nonDiv=specOf();nonDiv.patches!.spacing=720;nonDiv.patches!.jitter=0;
    const n=generator(nonDiv);
    for (const cx of ['-9223372036854775808','9223372036854775807']) for (const x of [0,1,959.999]) {
      const p=address('surface',cx,'0',x,300,960);
      assert.doesNotThrow(()=>n.terrainAt(p));assert.doesNotThrow(()=>n.patches!.reserves(p,14));
    }
    assert.equal(n.patches!.at(address('surface','-9223372036854775808','0',0,0,960)),null,'partial edge owner refuses whole');
  } finally {Math.random=random;}
});

test('cache eviction, reversed queries, concurrent seeds and frozen descriptors preserve whole plans', () => {
  const mutable=specOf(),g=generator(mutable),first=canonical(planOf(g)),signature=canonical(g.terrainAt(pointOf(planOf(g),planOf(g).cells[0],g.spec)));
  (mutable.patches!.recipes[0].choices[0] as {region:string}).region='water';mutable.patches!.bypass=300;
  assert.equal(canonical(planOf(g)),first);assert.ok(Object.isFrozen(planOf(g).cells));assert.ok(Object.isFrozen(planOf(g).choice));
  const other=generator(specOf(),714,'other');let differs=false;
  for(let i=0;i<290;i++){const p=at(i*960,960);g.patches!.at(p);if(canonical(other.patches!.at(p))!==canonical(g.patches!.at(p)))differs=true;}
  assert.ok(differs);assert.ok(g.patches!.stats.cached<=256);
  for(let i=289;i>=0;i--)g.patches!.at(at(i*960,960));
  assert.equal(canonical(planOf(g)),first);assert.equal(canonical(g.terrainAt(pointOf(planOf(g),planOf(g).cells[0],g.spec))),signature);
});

test('complete final unions preserve two radius14 bypasses and reservations, including rectangle corners', () => {
  const g=generator();let checked=0;
  for(let y=-3;y<=3;y++)for(let x=-3;x<=3;x++){
    const p=planOf(g,at(x*960,y*960));verifyBypasses(g,p);checked++;
    const b=boundsOf(p);assert.ok(b.minX>=0&&b.minY>=0&&b.maxX<=960&&b.maxY<=960);
    const wet=pointOf(p,p.cells[Math.floor(p.cells.length/2)],g.spec);
    assert.equal(g.terrainAt(wet).region,'mud');
    const corner={x:b.minX+30,y:b.minY+30};
    assert.ok(capsuleNeutral(g,p.origin,corner,corner),'full corner disc remains neutral');
    assert.ok(g.patches!.reserves(moveAddress(p.origin,corner,960),14));
  }
  console.log('Observed '+checked+' complete plans / '+(checked*2)+' independently swept bypass routes');
});

test('nonground footprint, lake/wall/slow ring and site conflicts reject whole candidates without edits', () => {
  const s=specOf(),g=generator(s),p=planOf(g),o=boundsOf(p),cell=s.terrainCell;
  const targets=[pointOf(p,p.cells[0],s),moveAddress(p.origin,{x:o.minX+cell/2,y:o.minY+cell/2},960)];
  const same=(a:MassAddress,b:MassAddress)=>a.cx===b.cx&&a.cy===b.cy&&Math.floor(a.x/cell)===Math.floor(b.x/cell)&&Math.floor(a.y/cell)===Math.floor(b.y/cell);
  const base=(q:MassAddress):MassTerrain=>({region:'ground',color:'#334433',biome:'marsh',fields:{moisture:.7},source:{generator:s.id,version:1,rule:'marsh',source:'native',stream:'fixture'}});
  for(const target of targets)for(const blocked of ['wall','water','mud','swamp','sand']){
    const planner=new MassTerrainPatches(g.spec,g.run,q=>({...base(q),region:same(q,target)?blocked:'ground'}),()=>true);
    assert.equal(planner.at(origin),null,blocked+' must reject the complete shape/ring');
    assert.equal(planner.sample(target,base(target)).source.stream,'fixture','no partial patch published');
  }
  assert.equal(new MassTerrainPatches(g.spec,g.run,base,()=>false).at(origin),null);
  const withSite=specOf();withSite.patches!.jitter=0;
  withSite.places=[{id:'existing-site',version:1,content:'site',period:960,chance:1,radius:30,jitter:0,when:[],priority:1}];
  const siteGen=generator(withSite);assert.equal(siteGen.placesInCell(origin).length,1);assert.equal(siteGen.patches!.at(origin),null,'unpainted site circle reserves real space');
  assert.equal(siteGen.terrainAt(at(480,480)).region,'ground');
  for(const change of [(q:MassSpec)=>q.patches!.recipes[0].chance=0,(q:MassSpec)=>q.patches!.recipes[0].when=[{field:'moisture',min:.9}]]){
    const absent=specOf();change(absent);assert.equal(generator(absent).patches!.at(origin),null);
  }
});

test('saved exclusions reject exact contact, preserve distant coordinates and refuse malformed boxes',()=>{
  const valid={source:'probe/fixed-foundation',origin:{...origin},bounds:{minX:0,minY:0,maxX:1,maxY:1}};
  const malformed:Array<(e:any)=>void>=[
    e=>e.source='',e=>e.source=1,e=>e.bounds=null,e=>e.bounds=[0,0,1,1],
    e=>e.bounds={minX:0,minY:0,maxX:1,z:1},e=>e.bounds.extra=0,
    e=>e.bounds.maxX=NaN,e=>e.bounds.minY=-1048577,e=>e.bounds.maxX=0,
    e=>e.bounds.maxY=-1,e=>e.origin.cx='01',e=>e.origin.cx='9223372036854775808',
    e=>e.origin.x=960,e=>e.origin.x=-1,e=>e.origin.dimension='',e=>e.origin=null,
  ];
  for(const [i,change] of malformed.entries()){
    const s=specOf(),e=copy(valid);change(e);s.patches!.exclusions=[e];assert.throws(()=>generator(s),'malformed exclusion '+i);
  }
  for(const exclusions of [null,{},Array(65).fill(valid)]){
    const s=specOf();(s.patches as any).exclusions=exclusions;assert.throws(()=>generator(s));
  }
  let contacts=0;
  for(const cx of ['-9223372036854775808','-9007199254740993','-1','0','9007199254740993','9223372036854775807']){
    const here=address('surface',cx,'0',0,0,960),base=generator(),p=planOf(base,here),box=boundsOf(p);
    const run=(bounds:MassPatchBox,anchor=here)=>{
      const s=specOf();s.patches!.exclusions=[{source:valid.source,origin:anchor,bounds}];return generator(s);
    };
    for(const bounds of [
      {minX:box.maxX,minY:box.minY,maxX:box.maxX+1,maxY:box.maxY},
      {minX:box.maxX,minY:box.maxY,maxX:box.maxX+1,maxY:box.maxY+1},
      {minX:box.minX-1,minY:box.minY-1,maxX:box.minX,maxY:box.minY},
    ]){assert.equal(run(bounds).patches!.at(here),null,'edge/corner contact rejects whole candidate');contacts++;}
    const separated={minX:box.maxX+.001,minY:box.minY,maxX:box.maxX+1,maxY:box.maxY};
    assert.equal(canonical(run(separated).patches!.at(here)),canonical(p),'a real gap preserves complete plan');
    assert.equal(canonical(run(box,{...here,dimension:'underworld'}).patches!.at(here)),canonical(p));
    const remote=address('surface',cx==='0'?'9007199254740993':'0','0',0,0,960);
    assert.equal(canonical(run(box,remote).patches!.at(here)),canonical(p),'far exclusion never aliases a nearby cell');
    // An exclusion may have a nonzero local anchor; translate its saved box,
    // independently of the implementation's localOffset call.
    const shifted={minX:box.minX-150,minY:box.minY-210,maxX:box.maxX-150,maxY:box.maxY-210};
    assert.equal(run(shifted,{...here,x:150,y:210}).patches!.at(here),null);
  }
  console.log('Observed '+contacts+' exact exclusion edge/corner contacts across signed address range');
});
// Pinned 67d9c290684f06ba2bda8a7694def1e9e4448381 terrainAt body. Only the
// TypeScript non-null assertions were removed to run this archived JS method.
const archivedTerrainAt=new Function('at','localOffset','canonical','cellKey','matchesMassRanges',`
  const fields = this.fieldsAt(at), s = this.surfaces.find(row => matchesMassRanges(row.when, fields));
  for (const place of this.spec.places.some(p => p.surface) ? this.placesInCell(at) : []) {
    const recipe = this.spec.places.find(p => p.id === place.recipe);
    if (!recipe.surface) continue;
    const offset = localOffset(at, place.center, this.spec.addressSpan);
    if (Math.hypot(offset.x, offset.y) <= place.radius) return Object.freeze({
      ...recipe.surface, biome: s.biome, fields,
      source: Object.freeze({ ...place.source, rule: recipe.id + '/surface' }),
    });
  }
  return Object.freeze({ region: s.region, color: s.color, biome: s.biome, fields,
    source: Object.freeze({ generator: this.spec.id, version: this.spec.version, rule: s.id,
      source: s.source ?? s.biome, stream: canonical([this.run.seed, 'terrain', cellKey(at)]) }) });
`);
test('patch omission matches archived original terrain policy including original site surfaces and seeded fields',()=>{
  const old=specOf();delete old.patches;
  old.fields=[{id:'moisture',base:.4,layers:[{id:'wet',period:790,amplitude:.6}]}];
  old.surfaces=[{id:'wet',priority:1,when:[{field:'moisture',min:.5}],region:'mud',color:'#554433',biome:'marsh'},...old.surfaces];
  old.places=[{id:'old-site',version:1,content:'site',period:1200,chance:1,radius:180,jitter:.2,when:[],priority:1,surface:{region:'ground',color:'#777755'}}];
  const g=generator(old);assert.equal(g.patches,null);let paired=0;
  for(let y=-1500;y<=1500;y+=150)for(let x=-1500;x<=1500;x+=150){const q=at(x,y);assert.deepEqual(g.terrainAt(q),archivedTerrainAt.call(g,q,localOffset,canonical,cellKey,matchesMassRanges));paired++;}
  console.log('Observed '+paired+' pinned old-policy terrain pairs');
});

test('patches feed cold/warm stream, page samples and native weighted navigation without painting routes',()=>{
  const g=generator(),state=new MassState(g.run,30),stream=new MassStream(g,state,{maxPages:2,maxSamples:40}),walk=new MassWalk(stream,origin),p=planOf(g);
  const wet=pointOf(p,p.cells[Math.floor(p.cells.length/2)],g.spec),local=localOffset(wet,origin,960);
  assert.equal(stream.sample(wet).region,'mud');assert.equal(walk.regionAt(local.x,local.y),'mud');assert.ok(walk.isWalkable(local.x,local.y));
  stream.request([p.origin]);stream.step(1024);assert.equal(stream.page(p.origin)?.samples.filter(s=>s.region==='mud').length,p.cells.length);
  const f=p.footprint,cols=32,counts=new Map<number,number>();for(const i of p.cells)counts.set(Math.floor(i/cols),(counts.get(Math.floor(i/cols))??0)+1);
  const row=[...counts].sort((a,b)=>b[1]-a[1])[0][0],from={x:f.minX-45,y:(row+.5)*30},to={x:f.maxX+45,y:(row+.5)*30};
  const dry={key:'native-default',costOf:regionPathCost},insured={key:'native-mud-insured',costOf:()=>1};
  assert.equal(walk.lineWalkable(from,to),true);assert.equal(walk.linePreferred(from,to,dry),false);assert.equal(walk.linePreferred(from,to,insured),true);
  assert.deepEqual(walk.pathStep(from,to,insured),to);assert.notDeepEqual(walk.pathStep(from,to,dry),to);
  for(const r of routes(p)){for(let i=1;i<r.length;i++)assert.equal(walk.linePreferred(r[i-1],r[i],dry),true);}
  let cursor={...from},wetDistance=0,walked=0;
  for(let i=0;i<128&&Math.hypot(cursor.x-to.x,cursor.y-to.y)>.01;i++){
    walk.beginFrame();const next=walk.pathStep(cursor,to,dry);assert.ok(next,'native priced route reaches the opposite bank');
    const distance=Math.hypot(next.x-cursor.x,next.y-cursor.y);assert.ok(distance>0);
    const n=Math.ceil(distance/5);for(let j=0;j<n;j++)if(walk.regionAt(cursor.x+(next.x-cursor.x)*(j+.5)/n,cursor.y+(next.y-cursor.y)*(j+.5)/n)!=='ground')wetDistance+=distance/n;
    walked+=distance;cursor=next;
  }
  assert.deepEqual(cursor,to);let directWet=0;
  for(let x=from.x;x<to.x;x+=5)if(walk.regionAt(x+2.5,from.y)!=='ground')directWet+=5;
  assert.ok(wetDistance<directWet,'native prices must reduce real mud exposure when a competitive bypass exists');
  console.log('Observed native priced route '+JSON.stringify({walked,wetDistance,directWet}));
  for(let i=1;i<=4;i++){stream.request([at(i*960,0)]);stream.step(1024);}
  assert.equal(stream.sample(wet).region,'mud');assert.ok(stream.stats.resident<=2);assert.equal(state.snapshot().terrain.length,0,'test never paints a dry route');
});

const restore=seedGlobalRandom(81271);
test('real native standing statuses, neutral step-off, source freeze and cold Continue share the generated cells',()=>{
  for(const [region,status,multiplier,linger] of [['mud','mired',.6,.6],['swamp','sodden',.45,.8]] as const){
    const s=specOf();(s.patches!.recipes[0].choices[0] as {region:string}).region=region;
    const config:MassAdventure={terrain:s,theme:copy(massAdventure().theme),content:[],startRadius:0,populationRadius:0,maxPopulation:0,pageRadius:1,samplesPerTick:256};
    const w=makeSimWorld('warrior',813),mass=new WorldMassRuntime(713,'physical-'+region,config);mass.attach(w);
    const p=planOf(mass.generator,mass.walk.at(0,0)),wet=pointOf(p,p.cells[Math.floor(p.cells.length/2)],s),dry=moveAddress(p.origin,routes(p)[0][1],960);
    const set=(q:MassAddress)=>{w.player.pos={...localOffset(q,mass.walk.at(0,0),960)};};
    const effects=()=>{(w as unknown as {updateTerrainEffects(dt:number):void}).updateTerrainEffects(1/60);};
    const speed=w.player.sheet.get('moveSpeed');set(wet);effects();
    assert.ok(w.player.radius>=14);verifyBypasses(mass.generator,p,w.player.radius);assert.equal(w.player.gridRegion,region);assert.equal(w.player.groundKind,undefined);
    assert.equal(w.player.statuses.filter(v=>v.id===status).length,1);assert.ok(Math.abs(w.player.sheet.get('moveSpeed')/speed-multiplier)<1e-9);
    set(dry);effects();assert.ok(w.player.statuses.some(v=>v.id===status),'native linger remains immediately after leaving');
    w.player.updateTimers(linger+.01);effects();assert.equal(w.player.statuses.some(v=>v.id===status),false);assert.equal(w.player.sheet.get('moveSpeed'),speed);
    assert.equal(mass.state.snapshot().terrain.length,0);assert.equal(w.doodads.some(d=>d.kind===region),false,'one grid channel, no duplicate liquid doodads');
    const saved=mass.snapshot(w),again=makeSimWorld('warrior',814),continued=new WorldMassRuntime(713,'physical-'+region,saved.config,saved);continued.attach(again,saved);
    assert.equal(canonical(continued.config.terrain),canonical(s));assert.equal(canonical(continued.generator.patches!.at(wet)),canonical(p));
    assert.equal(continued.stream.sample(wet).region,region);assert.equal(continued.stream.sample(dry).region,'ground');
    assert.deepEqual(again.player.pos,saved.player&&{x:saved.player.x,y:saved.player.y});
    verifyBypasses(continued.generator,p);
    const legacy=copy(config);delete legacy.terrain.patches;legacy.terrain.surfaces=[{...legacy.terrain.surfaces[0],region:'mud'}];
    const oldWorld=makeSimWorld('warrior',815),old=new WorldMassRuntime(713,'old-'+region,legacy);old.attach(oldWorld);
    const oldSave=old.snapshot(oldWorld),oldAgain=makeSimWorld('warrior',816),oldResume=new WorldMassRuntime(713,'old-'+region,oldSave.config,oldSave);oldResume.attach(oldAgain,oldSave);
    assert.equal(oldResume.generator.patches,null);assert.equal(oldResume.stream.sample(oldResume.walk.at(0,0)).region,'mud');
  }
});

test('real native long logs and rock satellites cannot extend into reserved bypasses',()=>{
  const s=specOf(),theme=copy(massAdventure().theme);
  const make=(patches:boolean)=>{
    const terrain=copy(s);if(!patches)delete terrain.patches;
    const config:MassAdventure={terrain,theme,content:[],startRadius:0,populationRadius:0,maxPopulation:0,pageRadius:1,samplesPerTick:256,
      ecology:{source:'probe/extended-wetland-props',spacing:192,rules:[{id:'logs-rocks',biomes:['marsh'],regions:['ground','mud','swamp'],chance:1,
        pieces:[{kind:'sunken_log',weight:1,radius:[70,80]},{kind:'rock',weight:1,radius:[70,80]}]}]}};
    const w=makeSimWorld('warrior',918),m=new WorldMassRuntime(713,'extended-props',config);m.attach(w);return{w,m};
  };
  const control=make(false),actual=make(true),g=actual.m.generator;
  const key=(d:Doodad,m:WorldMassRuntime)=>canonical([m.walk.at(d.pos.x,d.pos.y),d.kind,d.radius,d.rot]);
  const actualKeys=new Set(actual.w.doodads.map(d=>key(d,actual.m)));let extended=0,kept=0;
  assert.ok(control.w.doodads.length>20);
  for(const d of control.w.doodads){
    if(d.kind!=='sunken_log'&&d.kind!=='rock')continue;
    const q=control.m.walk.at(d.pos.x,d.pos.y),r=Math.max(d.radius,shapeBoundR(hitSurfaceOf(d,'move')));
    if(!g.patches!.reserves(q,d.radius)&&g.patches!.reserves(q,r)){
      extended++;assert.equal(actualKeys.has(key(d,control.m)),false,'native extended shape was admitted by its shorter paint radius');
    }
  }
  for(const d of actual.w.doodads){
    if(d.kind!=='sunken_log'&&d.kind!=='rock')continue;kept++;
    assert.equal(g.patches!.reserves(actual.m.walk.at(d.pos.x,d.pos.y),Math.max(d.radius,shapeBoundR(hitSurfaceOf(d,'move')))),false);
  }
  assert.ok(extended>0,'fixture must expose a real radius-only reservation bug');assert.ok(kept>20,'scenery still exists away from bypasses');
  console.log('Observed '+extended+' extended-shape rejection witnesses and '+kept+' retained native props');
});
test('fresh native opening footprints fit a saved exclusion and cold Continue never replans it',()=>{
  let fixed=0,rejected=0,unaffected=0;
  for(const seed of [42,991]){
    const input=massAdventure(),inputBefore=canonical(input),w=makeSimWorld('warrior',seed+1000);
    const mass=new WorldMassRuntime(seed,'opening-patch-'+seed,input);mass.attach(w);
    assert.equal(canonical(input),inputBefore,'new run cannot mutate the shared preset');
    const exclusion=mass.config.terrain.patches!.exclusions!.find(e=>e.source==='worldmass/opening-foundations-v1');assert.ok(exclusion);
    assert.deepEqual(exclusion.origin,{...mass.origin,x:0,y:0});assert.ok(Object.isFrozen(exclusion.bounds));
    const raw=generator(input.terrain,seed,mass.generator.run.runId);
    assert.deepEqual(mass.origin,chooseMassOrigin(raw,input.settlement!.location).origin,'reservation cannot change the field-selected town origin');
    const box=exclusion.bounds;
    const contains=(x:number,y:number,r=0)=>{
      assert.ok(x-r>=box.minX&&y-r>=box.minY&&x+r<=box.maxX&&y+r<=box.maxY,'fixed native footprint falls outside saved opening hull '+JSON.stringify({seed,x,y,r,box}));fixed++;
    };
    for(const tier of TOWN_TIERS){contains(0,0);contains(tier.w,tier.h);}
    const town=mass.settlement!,journey=mass.journey!;
    contains(-town.spec.apron-town.spec.blend,-town.spec.apron-town.spec.blend);
    contains(town.zone.size.w+town.spec.apron+town.spec.blend,town.zone.size.h+town.spec.apron+town.spec.blend);
    for(const structure of town.structures){const r=structure.rect;contains(r.x,r.y);contains(r.x+r.w,r.y+r.h);}
    assert.equal(journey.places.length,input.journey!.destinations.length+(input.journey!.extensions?.length??0)+(input.journey!.stops?.length??0));
    for(const trail of journey.trails)for(const p of trail.points)contains(p.x,p.y,trail.width/2+30);
    for(const place of journey.places){
      const q=journey.local(place),site=mass.config.content.find(c=>c.id===place.content)!.site!;contains(q.x,q.y,place.radius);
      for(const d of site.doodads)contains(q.x+d.pos.x,q.y+d.pos.y,Math.max(d.radius,shapeBoundR(hitSurfaceOf(d,'move'))));
      for(const f of site.fixtures)contains(q.x+f.x,q.y+f.y,MONSTERS[f.monster].radius);
      if(site.cache)contains(q.x+site.cache.x,q.y+site.cache.y,32);
      for(const a of site.altars??[])contains(q.x+a.x,q.y+a.y,a.def.radius);
      for(const s of site.shrines??[])contains(q.x+s.x,q.y+s.y,32);
      for(const p of site.puzzles??[])for(const seat of puzzleSeats(p))contains(q.x+p.x+seat.x,q.y+p.y+seat.y,32);
    }
    const signature=canonical(mass.config),saved=mass.snapshot(w),again=makeSimWorld('warrior',seed+2000);
    const continued=new WorldMassRuntime(seed,mass.generator.run.runId,saved.config,saved);continued.attach(again,saved);
    assert.equal(canonical(continued.config),signature);assert.equal(canonical(continued.config.terrain.patches!.exclusions),canonical([exclusion]));
    assert.equal(canonical(continued.journey!.trails),canonical(journey.trails));
    for(let y=Math.floor(box.minY/960)-2;y<=Math.ceil(box.maxY/960)+2;y++)for(let x=Math.floor(box.minX/960)-2;x<=Math.ceil(box.maxX/960)+2;x++){
      const at=moveAddress(exclusion.origin,{x:x*960,y:y*960},960),plan=raw.patches!.at(at);if(!plan)continue;
      const outer=boundsOf(plan),offset=localOffset(plan.origin,exclusion.origin,960);
      const touches=outer.minX+offset.x<=box.maxX&&outer.maxX+offset.x>=box.minX&&outer.minY+offset.y<=box.maxY&&outer.maxY+offset.y>=box.minY;
      const current=mass.generator.patches!.at(at),reloaded=continued.generator.patches!.at(at);
      assert.equal(canonical(current),canonical(reloaded),'cold Continue preserves all local acceptance results');
      if(touches){assert.equal(current,null,'opening overlay rejects complete naturally generated candidate');rejected++;}
      else{assert.equal(canonical(current),canonical(plan),'opening exclusion does not alter neighboring complete shapes');unaffected++;}
    }
  }
  assert.ok(fixed>100);assert.ok(rejected>0,'fixture needs real opening/patch conflict witnesses');assert.ok(unaffected>0);
  // An already saved descriptor lacking reservations is consumed literally.
  // This characterizes compatibility; it is not a safe new-world policy.
  const legacy=copy(massAdventure());delete legacy.terrain.patches;delete legacy.terrain.landforms;delete legacy.terrain.regionalDiscoveries;delete legacy.terrain.nativeRegional;
  const oldWorld=makeSimWorld('warrior',719),old=new WorldMassRuntime(42,'opening-old',legacy);old.attach(oldWorld);
  const saved=old.snapshot(oldWorld),again=makeSimWorld('warrior',720),resumed=new WorldMassRuntime(42,'opening-old',saved.config,saved);resumed.attach(again,saved);
  assert.equal(canonical(resumed.config),canonical(saved.config));assert.equal(resumed.generator.patches,null);
  console.log('Observed '+fixed+' native opening footprint checks, '+rejected+' natural whole-patch conflicts and '+unaffected+' unaffected neighboring plans');
});
restore();

test('natural fresh preset marsh is mostly neutral yet produces complete reachable mud and swamp pockets',()=>{
  const c=massAdventure();assert.ok(c.terrain.patches);assert.equal(c.terrain.surfaces.find(s=>s.id==='marsh')?.region,'ground');
  const totals:Record<string,number>={},found=new Set<string>();let sampled=0,marsh=0,plans=0;const nearest=new Map<string,{seed:number;distance:number;wet:MassAddress;origin:MassAddress}>();
  // Fixed geographic survey; actual preset fields, places and source selection.
  // No synthetic wet climate, hand-painted surface or feature clearing.
  for(const seed of [42,713,991]){
    const g=generator(c.terrain,seed,'natural-patches-'+seed),seen=new Set<string>();
    for(let y=-24000;y<=24000;y+=960)for(let x=-24000;x<=24000;x+=960){
      const q=at(x+480,y+480),terrain=g.terrainAt(q);sampled++;
      if(terrain.biome==='marsh'){marsh++;totals[terrain.region]=(totals[terrain.region]??0)+1;}
      const p=g.patches!.at(q);if(!p||seen.has(p.id))continue;seen.add(p.id);plans++;
      if(p.recipe!=='wetland-pockets')continue;
      const wet=pointOf(p,p.cells[Math.floor(p.cells.length/2)],g.spec),local=localOffset(wet,origin,960),distance=Math.hypot(local.x,local.y);
      if(distance<(nearest.get(p.choice.region)?.distance??Infinity))nearest.set(p.choice.region,{seed,distance,wet,origin:p.origin});
      for(const i of p.cells){const region:string=g.terrainAt(pointOf(p,i,g.spec)).region;assert.equal(region,p.choice.region);found.add(region);}
      if(plans<=8)verifyBypasses(g,p);
    }
  }
  assert.ok(marsh>20);assert.ok((totals.ground??0)/marsh>.6,'ordinary wetland cannot be a blanket slog');
  for(const region of ['mud','swamp'])assert.ok(found.has(region),region+' has no naturally placed physical pocket');
  assert.ok(plans>5);console.log('Observed natural survey '+JSON.stringify({sampled,marsh,regions:totals,plans,physicalPockets:[...found].sort(),nearest:Object.fromEntries(nearest)}));
});

console.log(`Terrain patches: ${passed} contract groups passed, ${failed} failed`);
if(failed)process.exitCode=1;
