/** Independent archived-main pop parity. The verbatim method below is pinned
 * to bc8a0e0a9211815d99dcf0ea389e451157c0684d; SHA256 c2429cf26c3b228d94934a8a5afdef253e3b90eb4d5f481bf96c3dce2cf33b25.
 * It executes on the CURRENT real finite World and shared native helpers. This
 * proves the pop operation's behavior/draw order, not whole archived-engine parity.
 * No production source or native rule is substituted in the candidate. */
import assert from 'node:assert/strict';
import { createHash } from 'node:crypto';
import ts from 'typescript';
import { makeSimWorld } from '../src/sim/arena';
import { mulberry32, seedGlobalRandom } from '../src/sim/rng';
import { World, CORPSE_CFG } from '../src/engine/world';
import type { Actor } from '../src/engine/actor';
import { vec, dist, rand, chance, type Vec2 } from '../src/core/math';
import { doodadRuleOf, type Doodad } from '../src/engine/levelgen';
import { dissolveFor } from '../src/engine/dissolve';
import { GridWalkField } from '../src/world/gridWalk';
import { captureNativeActorState } from '../src/worldmass/dormancy';
import { serializeAccount } from '../src/meta/account';
import { compileNativeFeature, resolveNativeFeature } from '../src/worldmass/nativeFeatures';
import { translateNativeFeature, type NativeFeatureInstance } from '../src/worldmass/nativeResidency';
import { MassNativeBrittles } from '../src/worldmass/nativeBrittles';
import { address } from '../src/worldmass/address';
import { massAdventure } from '../src/worldmass/preset';
import { WorldMassRuntime } from '../src/worldmass/runtime';

const ARCHIVED_HASH="c2429cf26c3b228d94934a8a5afdef253e3b90eb4d5f481bf96c3dce2cf33b25";
const ARCHIVED_POP="private popBrittle(d: Doodad, striker?: Actor | null, strikeAt?: Vec2 | null): void {\n    if (d.gone) return;\n    // A breaking resonant stone TOLLS as it goes (near/touch/dwell pops reach\n    // here without passing strikeSurfaces; the cooldown dedupes hit-pops).\n    const res = doodadRuleOf(d.kind).resonance;\n    if (res) this.resonate(d, res);\n    d.gone = true;\n    this.dissolveCracks.delete(d); // a popped body's pre-crack ledger entry leaves with it\n    const i = this.doodads.indexOf(d);\n    if (i >= 0) this.doodads.splice(i, 1);\n    // Bump the rev EXPLICITLY: a pop followed by a same-frame push can net the\n    // SAME list length, and the spatial/veil indices key on (identity, length,\n    // rev) — length alone would leave them stale for that window.\n    this.markDoodadsChanged();\n    // THE OCCURRENCE FABRIC's disturb stimulus: a breaking body is a noise\n    // in the ground — armed 'disturb' triggers hear it next sweep\n    // (occurrences.ts; the ring drains there). Gated so quiet zones pay nothing.\n    if (this.occs.length) this.occDisturbs.push(vec(d.pos.x, d.pos.y));\n    // SURFACE PROCS: the pop is a trigger of its own (procs.ts 'surface').\n    // No skill instance exists at a pop, so the roll reads the striker's\n    // SHEET alone (passives, affixes, sheet-granted proc stats) — a\n    // skill-local gem grant can't reach here by design; the affix lane can.\n    if (striker && !striker.dead) this.rollSurfaceProcs(striker);\n    // A HOLLOW SEAM routes through the hollows fabric: the carve and the\n    // reveal belong to the hollow record, not the brittle spec (openHollow\n    // is idempotent — a passage's twin seam popping later is a no-op).\n    if (d.hollow) this.openHollow(d.hollow, striker ?? null);\n    // AN ANNEX FACE routes through the growing zone the same way: carve,\n    // admission, furnish and persistence all belong to the annex record\n    // (annexReveal is idempotent). Silent — the pop's own flash at the\n    // WALL is the tell; the reveal pulse would fire in still-unseen space.\n    if (d.annex) this.annexReveal(d.annex, { silent: true });\n    const br = doodadRuleOf(d.kind).brittle;\n    if (!br) return;\n    const color = br.color ?? '#c8b89a';\n    // POP DRESS (brittle.pop): reshape the break flash — the mirage kit\n    // trades the pale blast for the heat-haze ring. Absent = the stock read.\n    const fx = br.pop;\n    // THE DISSOLUTION GRAMMAR's row (a dev override may force a motion): its\n    // VOICE rides THIS flash — ONE accent channel; the haze ring keeps the\n    // mirage kit's breath (a dissolve speaks no voice over it).\n    const dissolveRow = this.dissolveOverride ?? dissolveFor(d.kind);\n    this.flashes.push({\n      pos: vec(d.pos.x, d.pos.y), radius: fx?.radius ?? d.radius * 2.2, color,\n      life: fx?.life ?? 0.3, maxLife: fx?.life ?? 0.3,\n      ...(fx?.haze ? { haze: fx.haze } : {}),\n      ...(dissolveRow && dissolveRow.voice && !fx?.haze ? { fx: dissolveRow.voice } : {}),\n    });\n    if (br.text) this.text(vec(d.pos.x, d.pos.y - 14), br.text, color, 12);\n    if (br.orbChance && chance(br.orbChance)) {\n      this.shedOrb(chance(0.5) ? 'life' : 'mana', d.pos, { tier: d.tier });\n    }\n    if (br.gemChance && chance(br.gemChance)) this.dropGemAt(vec(d.pos.x, d.pos.y));\n    // THE REMAINS (the quiet reclass): the wreck leaves its own pile — the\n    // crumble SHOWS and the dust STAYS. Pushed after the splice; the rev\n    // bump below covers the same-frame length-net window.\n    let remainsDoodad: Doodad | null = null; // the dissolution grammar adopts it as the debris\n    if (br.remains) {\n      remainsDoodad = {\n        pos: vec(d.pos.x, d.pos.y), radius: Math.max(10, d.radius * 0.85),\n        kind: br.remains, rot: rand(0, Math.PI * 2),\n      };\n      this.doodads.push(remainsDoodad);\n      this.markDoodadsChanged();\n    }\n    if (br.carve && this.walk instanceof GridWalkField) {\n      // A wall face beside it? Carve INTO it — that's where the passage goes.\n      const cs = this.walk.cell;\n      let cx = d.pos.x, cy = d.pos.y;\n      for (const [dx, dy] of [[1, 0], [-1, 0], [0, 1], [0, -1]] as const) {\n        if (!this.walk.isWalkable(d.pos.x + dx * cs, d.pos.y + dy * cs)) {\n          cx = d.pos.x + dx * br.carve * 0.7;\n          cy = d.pos.y + dy * br.carve * 0.7;\n          break;\n        }\n      }\n      this.walk.fillDisc(d.pos.x, d.pos.y, Math.max(24, d.radius + 8), 'ground');\n      this.walk.fillDisc(cx, cy, br.carve, 'ground');\n    }\n    // A popped SPAN stops negating its chasm (the bridges index is the physics).\n    const bi = this.bridges.indexOf(d);\n    if (bi >= 0) this.bridges.splice(bi, 1);\n    // COLLAPSE: whoever the span was holding takes the fall — unless something\n    // else still holds them (another plank, real ground): clampPos with no\n    // origin resolves to true footing, and an unmoved body was never falling.\n    if (br.collapse) {\n      const dmg = br.collapse.damage ?? {};\n      for (const a of this.actors) {\n        if (a.dead || a.passive || (d.tier ?? 0) !== a.tier) continue; // the wreck's own story (the sovereignty gate)\n        if (dist(a.pos, d.pos) > d.radius + a.radius * 0.6) continue;\n        const edge = this.clampPos(vec(a.pos.x, a.pos.y), a.radius);\n        if (dist(edge, a.pos) < 0.5) continue;\n        a.pos = edge;\n        // The give-way is a PIT-FAMILY fall: the span's authored toll routes\n        // through the same pitfall override walking off this rim reads\n        // (pitPolicyFor — theme.pitfall → cave default → the span's own\n        // edge-bite), so a bridge popping over a descend gorge drops its\n        // riders one stratum instead of biting at a lip the zone re-defined.\n        this.applyRecovery(a, this.pitPolicyFor({\n          kind: 'fall', to: br.collapse.to ?? 'edge',\n          damage: {\n            amount: dmg.amount ?? 0, pctMaxLife: dmg.pctMaxLife ?? 0.12,\n            type: (dmg.type ?? 'physical') as DamageSpec['type'], canKill: dmg.canKill ?? true,\n          },\n        }), edge);\n      }\n    }\n    // FUME: the wreck exhales a lingering hazard cloud (gas pods, spore sacs).\n    if (br.fume) this.mintHazardCloud(vec(d.pos.x, d.pos.y), br.fume);\n    // WAKE: something was living in there (urn ambushes, hive husks). The\n    // pool (array) form draws ONE face by weight per break — an ambush has\n    // a single nature — then that row's own chance gates the clutch as\n    // ever. Single-row specs skip the draw: their rng stream is\n    // byte-identical to the old read.\n    const spawnRows = !br.spawn ? [] : Array.isArray(br.spawn) ? br.spawn : [br.spawn];\n    let sp = spawnRows[0];\n    if (spawnRows.length > 1) {\n      let roll = rand(0, spawnRows.reduce((s, r) => s + (r.w ?? 1), 0));\n      for (const r of spawnRows) { roll -= r.w ?? 1; if (roll <= 0) { sp = r; break; } }\n    }\n    if (sp && chance(sp.chance ?? 1)) {\n      const [lo, hi] = sp.count ?? [1, 1];\n      const n = lo + Math.floor(rand(0, hi - lo + 1));\n      for (let i = 0; i < n; i++) {\n        const m = this.createMonster(sp.monster, Math.max(1, this.zone.level), 'enemy');\n        m.pos = this.clampPos(vec(d.pos.x + rand(-22, 22), d.pos.y + rand(-22, 22)), m.radius);\n        this.actors.push(m);\n        this.emergeBody(m, { host: true }); // THE EMERGENCE GRAMMAR: the wake BURSTS OUT of the breaking host\n      }\n    }\n    // THE SHALLOW GRAVE: the wreck spills BODIES, not the living — raisable\n    // fuel for the corpse economy (the charnel kit's necromancer bait; a\n    // ghoul's larder). Minted like Exhume's stand-ins, level-scaled.\n    if (br.corpses && chance(br.corpses.chance ?? 1)) {\n      const lvl = Math.max(1, this.zone.level);\n      const [lo, hi] = br.corpses.count;\n      const n = lo + Math.floor(rand(0, hi - lo + 1));\n      for (let i = 0; i < n; i++) {\n        if (this.corpses.length >= CORPSE_CFG.max) this.corpses.shift();\n        this.corpses.push({\n          pos: this.clampPos(vec(d.pos.x + rand(-18, 18), d.pos.y + rand(-18, 18)), 8),\n          defId: br.corpses.monster, level: lvl,\n          maxLife: CORPSE_CFG.mint.life + lvl * CORPSE_CFG.mint.lifePerLevel,\n          remaining: CORPSE_CFG.duration,\n          laidAt: this.time, from: vec(d.pos.x, d.pos.y), // M-SPILL: the body TUMBLES out of the host (no caption)\n          tier: d.tier, // THE SPOILS STORY: the wreck's own story\n        });\n      }\n    }\n    // THE DISSOLUTION GRAMMAR — after every tested consequence above has\n    // fired exactly as before (drawn == tested at the instant; the motion is\n    // after-image): hand the body to the fragment engine. A row's REMAINS\n    // is the debris lane's input (adopted, never a second pile).\n    if (dissolveRow) this.dissolveBreak(d, dissolveRow, strikeAt ?? null, remainsDoodad);\n  }";

assert.equal(createHash('sha256').update(ARCHIVED_POP).digest('hex'), ARCHIVED_HASH);
const compiled = ts.transpileModule('class ArchivedPop {\n'+ARCHIVED_POP+'\n}', { compilerOptions: { target: ts.ScriptTarget.ES2022, module: ts.ModuleKind.None } }).outputText;
type Pop = (this: World, d: Doodad, striker?: Actor | null, strikeAt?: Vec2 | null) => void;
const archivedPop = new Function('vec','dist','rand','chance','doodadRuleOf','dissolveFor','GridWalkField','CORPSE_CFG',
  compiled+'\nreturn ArchivedPop.prototype.popBrittle;')(vec,dist,rand,chance,doodadRuleOf,dissolveFor,GridWalkField,CORPSE_CFG) as Pop;
type FiniteAccess = {popBrittle:Pop; updateBrittle(dt:number):void; strikeSurfaces(caster:Actor|null,at:Vec2,radius:number):void};
const finite=(w:World)=>w as unknown as FiniteAccess;
type Mode='hit'|'touch'|'stride'|'nested'|'both'|'wrong-tier'|'passive'|'duplicate';
const normalized=<T>(value:T):unknown=>JSON.parse(JSON.stringify(value,(key,v)=>key==='uid'?'[opaque-item-id]':v));
function run(legacy:boolean,mode:Mode,seed:number){
  const restoreSetup=seedGlobalRandom(619);let w:World;
  try{w=makeSimWorld('warrior',619);}finally{restoreSetup();}
  w.time=100;w.zone={...w.zone,level:11,biome:'desert',tileset:'desert'};
  w.player.pos={x:800,y:600};w.player.level=11;w.actors=[w.player];w.doodads=[];
  w.drops=[];w.orbs=[];w.texts=[];w.flashes=[];w.dissolves=[];w.emergences=[];
  const nested=mode==='nested'||mode==='both';
  if(mode==='stride'||mode==='both')w.player.sheet.setBase('proc_pathcutter_stride',1);
  if(nested)w.player.sheet.setBase('proc_cave_in',1);
  const urns:Doodad[]=[{kind:'burial_urn',pos:{x:816,y:600},radius:12,rot:.3},
    ...(nested?[{kind:'burial_urn' as const,pos:{x:850,y:606},radius:14,rot:.7},{kind:'burial_urn' as const,pos:{x:830,y:646},radius:11,rot:.2}]:[])];
  if(mode==='wrong-tier')urns[0].tier=1;if(mode==='passive')w.player.passive=true;
  w.doodads.push(...urns);w.markDoodadsChanged();
  if(nested){const restore=seedGlobalRandom(799);try{const target=w.createMonster('zombie',4,'enemy');target.pos={x:835,y:580};target.life=7;w.actors.push(target);}finally{restore();}}
  const trace:({op:'enter'|'leave';urn:number;gone:boolean;draw:number}|{op:'factory';species:string;level:number;draw:number})[]=[],tape:number[]=[],factoryTapes:number[][]=[];
  const livePop=finite(w).popBrittle,operation=legacy?archivedPop:livePop;
  finite(w).popBrittle=function(d,striker,at){trace.push({op:'enter',urn:urns.indexOf(d),gone:!!d.gone,draw:tape.length});operation.call(w,d,striker,at);trace.push({op:'leave',urn:urns.indexOf(d),gone:!!d.gone,draw:tape.length});};
  const factory=w.createMonster;w.createMonster=function(...args){const start=tape.length;trace.push({op:'factory',species:args[0],level:args[1],draw:start});const a=factory.apply(this,args);factoryTapes.push(tape.slice(start));return a;};
  const originalRandom=Math.random,originalNow=Date.now,next=mulberry32(seed);Date.now=()=>1700000000000;Math.random=()=>{const n=next();tape.push(n);return n;};
  try{
    if(mode==='hit')finite(w).strikeSurfaces(w.player,urns[0].pos,1);
    else finite(w).updateBrittle(1/60);
    if(mode==='duplicate')finite(w).popBrittle.call(w,urns[0],w.player,w.player.pos);
    const end=tape.length,sentinel=Math.random();
    const states=w.actors.filter(a=>a!==w.player).map(a=>{const state=captureNativeActorState(a);assert.ok(state,'Native graph '+a.defId+' '+mode);return state;});
    const hero=normalized({id:w.player.id,pos:w.player.pos,life:w.player.life,mana:w.player.mana,es:w.player.es,dead:w.player.dead,level:w.player.level,
      buffs:[...w.player.buffs],procReadyAt:[...w.player.procReadyAt],gainEvents:w.player.gainEvents,statuses:w.player.statuses,restoreStreams:w.player.restoreStreams});
    const result={hero,trace,tape: [...tape],draws:end,sentinel,factoryTapes,states:normalized(states),drops:normalized(w.drops),orbs:normalized(w.orbs),
      doodads:normalized(w.doodads),dissolves:normalized(w.dissolves),emergences:normalized(w.emergences),flashes:normalized(w.flashes),texts:normalized(w.texts),
      urns:urns.map(d=>({gone:!!d.gone,inWorld:w.doodads.includes(d)})),xp:w.meta.xp,kills:w.kills,account:normalized(serializeAccount(w.account)),
      wake:w.actors.filter(a=>a.defId==='skeleton_warrior').length};
    if(mode==='wrong-tier'||mode==='passive'){assert.equal(result.urns[0].gone,false);assert.equal(end,0);}
    else assert.equal(result.urns[0].gone,true);
    if(mode==='stride'||mode==='both')assert.ok(w.player.buffs.has('pathcutter_stride'),'Actual native stride buff');
    if(mode==='nested'){assert.equal(result.urns.every(d=>d.gone),true);assert.equal(result.kills,1);assert.ok(trace.filter(r=>r.op==='enter'&&!r.gone).length>=3,'Actual recursive urn pops');}
    return result;
  }finally{Math.random=originalRandom;Date.now=originalNow;}
}
const coverage={wake:new Set<number>(),orbs:new Set<boolean>(),gems:new Set<boolean>(),cases:0,nested:0};
for(const mode of ['hit','touch','stride','nested','both','wrong-tier','passive','duplicate'] as const){
  for(let seed=1;seed<=24;seed++){
    const actual=run(false,mode,seed),control=run(true,mode,seed);assert.deepEqual(actual,control,'Archived native pop parity '+mode+' seed'+seed);
    coverage.cases++;if(mode==='nested'||mode==='both')coverage.nested++;
    if(mode==='hit'||mode==='touch'){coverage.wake.add(actual.wake);coverage.orbs.add((actual.orbs as unknown[]).length>0);coverage.gems.add((actual.drops as unknown[]).length>0);}
  }
  console.log('PASS archived native pop: '+mode+' x24 actual seeded Worlds, exact global draws/factory order/body/reward/proc/FX');
}
assert.deepEqual([...coverage.wake].sort(),[0,1,2]);assert.equal(coverage.orbs.size,2);assert.equal(coverage.gems.size,2);
console.log('BRITTLE_PARITY',JSON.stringify({...coverage,wake:[...coverage.wake].sort(),orbs:[...coverage.orbs],gems:[...coverage.gems],archivedHash:ARCHIVED_HASH}));

// Independent enrollment comparison uses an entire unchanged native provider.
// Only the comparison harness's direct native-handler call is controlled here;
// this is not the browser movement/natural-country placement acceptance.
function enrolledRun(enrolled:boolean,seed:number,differentShell=false){
  const restore=seedGlobalRandom(619);let w:World;try{w=makeSimWorld('warrior',619);}finally{restore();}
  const request={id:'parity/family-plot',seed:713,level:11,size:{w:1800,h:1800},source:{kind:'composition' as const,id:'family_plot',tileset:'courtland'}};
  const descriptor=resolveNativeFeature(request),blueprint=compileNativeFeature(descriptor);assert.ok(blueprint.grid);
  const layout=translateNativeFeature(blueprint,request.id,{x:0,y:0}),origin=address('surface','0','0',0,0,960);
  const instance:NativeFeatureInstance={id:request.id,placement:{id:request.id,origin,request},blueprint,offset:{x:0,y:0},
    grid:{id:request.id,grid:blueprint.grid,offset:{x:0,y:0}},layout,entrances:blueprint.entrances,zone:descriptor.zone};
  w.zone=differentShell?{...descriptor.zone,level:2,biome:'desert',tileset:'desert'}:{...descriptor.zone};const shell=w.zone;w.time=100;w.walk=blueprint.grid;w.doodads=layout.doodads;w.markDoodadsChanged();
  w.actors=[w.player];w.drops=[];w.orbs=[];w.texts=[];w.flashes=[];w.dissolves=[];w.emergences=[];
  const urns=w.doodads.filter(d=>d.kind==='burial_urn');assert.ok(urns.length>=2);w.player.pos={...urns[0].pos};w.player.level=11;
  w.player.sheet.setBase('proc_cave_in',1);
  let manager:MassNativeBrittles;manager=new MassNativeBrittles(w,{population:()=>manager.population,maxPopulation:()=>100,retainRadius:512,quietSeconds:15});
  const binding=enrolled?manager.prepare(instance):undefined;binding?.mount();
  const tape:number[]=[],factories:number[][]=[],previous=Math.random,oldNow=Date.now,next=mulberry32(seed);
  const factory=w.createMonster;w.createMonster=function(...args){const start=tape.length,a=factory.apply(this,args);factories.push(tape.slice(start));return a;};
  Math.random=()=>{const n=next();tape.push(n);return n;};Date.now=()=>1700000000000;
  try{
    finite(w).updateBrittle(1/60);const sentinel=Math.random();
    assert.equal(w.zone,shell,'Native ownership never swaps the shared zone');
    if(differentShell){assert.notEqual(shell.level,descriptor.zone.level);assert.notEqual(shell.biome,descriptor.zone.biome);}
    const states=w.actors.filter(a=>a!==w.player).map(a=>{const s=captureNativeActorState(a);assert.ok(s);return s;});
    const saved=binding?.capture();if(saved){assert.deepEqual(saved.slots.flatMap(r=>r.births.map(b=>b.factoryTape)).sort((a,b)=>a[0]-b[0]),[...factories].sort((a,b)=>a[0]-b[0]));
      assert.equal(manager.population,w.actors.filter(a=>a!==w.player&&!a.dead).length);assert.equal(saved.slots.filter(r=>r.popped).length,urns.filter(d=>d.gone).length);}
    return normalized({tape,sentinel,states,orbs:w.orbs,drops:w.drops,flashes:w.flashes,texts:w.texts,dissolves:w.dissolves,
      emergences:w.emergences,doodads:w.doodads,buffs:[...w.player.buffs],procs:[...w.player.procReadyAt],gone:urns.map(d=>!!d.gone)});
  }finally{Math.random=previous;Date.now=oldNow;}
}
for(let seed=1;seed<=24;seed++)assert.deepEqual(enrolledRun(true,seed),enrolledRun(false,seed),'Native enrollment changes no operation draws/body/reward '+seed);
console.log('PASS complete unchanged family_plot provider: owned/unowned native operation x24, exact factory tape and shared population census');

// The source cannot borrow its shared shell's level or terrain. Compare the
// actual owned native operation on a different shell against the same complete
// finite provider at its own source context, keeping native draws untouched.
const sourceCoverage={orbs:false,gems:false,wakes:false,foreignGround:false};
for(let seed=1;seed<=24;seed++){
  const actual=enrolledRun(true,seed,true),control=enrolledRun(false,seed);
  assert.deepEqual(actual,control,'Source-owned orb/gem/factory/emergence context differs from shared shell '+seed);
  const observed=actual as {orbs:unknown[];drops:unknown[];states:unknown[];emergences:{spec:{ground:string}}[]};
  sourceCoverage.orbs ||= observed.orbs.length>0;sourceCoverage.gems ||= observed.drops.length>0;
  sourceCoverage.wakes ||= observed.states.length>0;
  sourceCoverage.foreignGround ||= observed.emergences.some(r=>r.spec.ground!=='sand');
}
assert.ok(Object.values(sourceCoverage).every(Boolean),'Source/shell control must exercise each reward/wake/ground path');
console.log('PASS source/shared-shell mismatch x24: exact native orb/gem rewards, wake factories, ground emergence and draws; shared zone identity retained');

// Death travels with the body. This uses the real preview progression runtime
// and a complete native provider; the controlled body relocation is deliberate,
// not a movement/AI or natural country-placement claim.
{
  const setup=seedGlobalRandom(913);let w:World;
  try{
    w=makeSimWorld('warrior',913);
    const config=structuredClone(massAdventure());delete config.nativeCountry;delete config.geography;
    new WorldMassRuntime(913,'urn-source-kill-context',config).attach(w);
  }finally{setup();}
  const request={id:'parity/source-kill',seed:713,level:15,size:{w:1800,h:1800},
    source:{kind:'composition' as const,id:'family_plot',tileset:'courtland'}};
  const descriptor=resolveNativeFeature(request),blueprint=compileNativeFeature(descriptor),origin=address('surface','0','0',0,0,960);
  const layout=translateNativeFeature(blueprint,request.id,{x:0,y:0});
  const instance:NativeFeatureInstance={id:request.id,placement:{id:request.id,origin,request},blueprint,offset:{x:0,y:0},
    grid:{id:request.id,grid:blueprint.grid!,offset:{x:0,y:0}},layout,entrances:blueprint.entrances,zone:descriptor.zone};
  const shell=w.zone;assert.ok(w.massRuntime!.config.progression);assert.notEqual(shell.level,request.level);
  const remove=w.installMassNativeScene(instance);
  let manager:MassNativeBrittles;manager=new MassNativeBrittles(w,{population:()=>manager.population,maxPopulation:()=>128,retainRadius:512,quietSeconds:15});
  const binding=manager.prepare(instance)!;binding.mount();
  const urn=layout.doodads.find(d=>d.kind==='burial_urn')!,previous=Math.random,next=mulberry32(81471),prefix=[.9,.9,.1,.9];let cursor=0;
  Math.random=()=>cursor<prefix.length?prefix[cursor++]:next();
  try{finite(w).popBrittle.call(w,urn);}finally{Math.random=previous;}
  const wakes=[...binding.actors()];assert.equal(wakes.length,2);assert.ok(wakes.every(a=>a.level===request.level));
  const away=[{x:10000,y:10000},{x:50000,y:50000},{x:-20000,y:-20000}].find(p=>w.levelAt(p)!==request.level)!;
  assert.ok(away);assert.ok(Math.hypot(away.x-urn.pos.x,away.y-urn.pos.y)>2000);
  const read=Reflect.get(w,'lootLevelAt') as (pos:Vec2)=>number;
  const drop=Reflect.get(w,'rollDrops') as (actor:Actor)=>void;
  const observed:number[]=[];
  Reflect.set(w,'rollDrops',function(actor:Actor){observed.push(read.call(w,actor.pos));return drop.call(w,actor);});
  const killRandom=seedGlobalRandom(139);
  try{for(const wake of wakes){wake.pos={...away};w.kill(wake,false,w.player);}}
  finally{killRandom();Reflect.set(w,'rollDrops',drop);}
  assert.deepEqual(observed,[request.level,request.level]);assert.equal(read.call(w,away),w.levelAt(away));assert.equal(w.zone,shell);
  assert.ok(binding.capture().slots.flatMap(s=>s.births).every(b=>b.dead));remove();
  console.log('PASS actual progression runtime: native urn wake kill rewards retain source level after controlled distant relocation; reward context restores and shared zone remains unchanged');
}