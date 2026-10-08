// Exact native pour extraction regression. The archived body/noise/radial
// oracle is embedded and hashed; this probe needs no Git or ignored files.
// Scope: the radial union on the gen lattice and native guard/depth/paint
// behavior. Grid membership is NOT paintLiquid's overlapping disc footprint.
import assert from 'node:assert/strict';
import { createHash } from 'node:crypto';
import { readFileSync } from 'node:fs';
import ts from 'typescript';
import { Rng } from '../src/core/rng';
import { dist, type Vec2 } from '../src/core/math';
import { Mask, GEN_CELL, bearingNoise, radial, pourLobes, pourContains, paintLiquid,
  valueNoise2, type PourLobe } from '../src/engine/genkit';
import { POUR_CFG, type GenCtx, type PourSpec } from '../src/engine/levelgen';
import { regionKind } from '../src/world/regions';

const ARCHIVED_COMMIT = "67d9c290684f06ba2bda8a7694def1e9e4448381";
const ARCHIVED_SOURCE = "function hashNoise(i: number, seed: number): number {\n  let h = (i * 374761393 + seed * 668265263) >>> 0;\n  h = (h ^ (h >> 13)) >>> 0; h = Math.imul(h, 1274126177) >>> 0;\n  return ((h >>> 8) / 0x00ffffff) * 2 - 1;\n}\n\nfunction bearingNoise(a: number, amp: number, seed: number): number {\n  const p1 = hashNoise(1, seed) * Math.PI, p2 = hashNoise(2, seed) * Math.PI, p3 = hashNoise(3, seed) * Math.PI;\n  return amp * (0.55 * Math.sin(3 * a + p1) + 0.3 * Math.sin(5 * a + p2) + 0.15 * Math.sin(8 * a + p3));\n}\n\nfunction radial(m: Mask, x: number, y: number, rOf: (angle: number) => number): Mask {\n  for (let cy = 0; cy < m.rows; cy++) {\n    for (let cx = 0; cx < m.cols; cx++) {\n      const c = m.center(cx, cy);\n      const dx = c.x - x, dy = c.y - y;\n      const r = rOf(Math.atan2(dy, dx));\n      if (r > 0 && dx * dx + dy * dy <= r * r) m.set(cx, cy, true);\n    }\n  }\n  return m;\n}\n\nfunction pourBody(\n  ctx: GenCtx, kind: DoodadKind,\n  radius: [number, number], pieces: [number, number], hard: boolean,\n  opts?: { shallow?: boolean },\n): void {\n  const pour = doodadRule(kind).pour ?? {};\n  const R = ctx.rng.range(radius[0], radius[1]);\n  const center = findSpot(ctx, R * 1.8, hard, 20, false, kind);\n  if (!center) return;\n  const body = R * (pour.scale ?? 1.5);\n  const wob = pour.wobble ?? 0.3;\n  const seed = ctx.rng.int(0, 0x7fffffff);\n  // Frame the mask over the body's worst reach, SNAPPED to the gen lattice\n  // (an unsnapped mask bleeds against the walk grid — the placeLandmark rule).\n  const reach = body * 2.2;\n  const ox = Math.floor((center.x - reach) / GEN_CELL) * GEN_CELL;\n  const oy = Math.floor((center.y - reach) / GEN_CELL) * GEN_CELL;\n  const m = Mask.forRect(ox, oy, reach * 2 + GEN_CELL, reach * 2 + GEN_CELL);\n  radial(m, center.x, center.y, a => body * (1 + bearingNoise(a, wob, seed)));\n  // LOBES: the piece rolls, reshaped — each a smaller wobbled radial ORed on,\n  // so a multi-lobed marsh keeps its sprawl without the circle seams. Lobe\n  // radii keep the union INSIDE `reach` (0.95 + 0.55×(1+wob) < 2.2 for any\n  // wobble ≤ 1), so the frame never clips a lobe.\n  const n = ctx.rng.int(pieces[0], pieces[1]);\n  for (let i = 0; i < n; i++) {\n    const ang = ctx.rng.range(0, Math.PI * 2);\n    const off = ctx.rng.range(body * 0.45, body * 0.95);\n    const lr = body * ctx.rng.range(0.3, 0.55);\n    radial(m, center.x + Math.cos(ang) * off, center.y + Math.sin(ang) * off,\n      a => lr * (1 + bearingNoise(a, wob, (seed + i + 1) >>> 0)));\n  }\n  maskGuards(ctx, m, kind, hard);\n  // Depth heart FIRST (under the lattice): the scatter's old center disc,\n  // kept so a poured pond still swims past LIQUID_CFG.deepInset at its\n  // middle. The core's radius R never pokes past the wobbled rim (mask\n  // radius ≥ body×(1−wob) = 1.05R at the default scale/wobble). Skipped when\n  // it would flood a forbid-carrying solid (the inverse-forbidOn contract —\n  // the lattice around it is already trimmed by maskGuards).\n  if (pour.depthCore && !opts?.shallow) {\n    const coreR = Math.min(R, body * 0.85);\n    const dry = ruleIgnored(ctx, 'forbid') ? [] : forbiddersOf(ctx, kind);\n    if (!dry.some(f => dist(center, f.pos) < coreR + f.radius)) {\n      ctx.doodads.push({ pos: center, radius: coreR, kind });\n    }\n  }\n  paintLiquid(ctx, null, m, { doodad: kind, ...(opts?.shallow ? { shallow: true } : {}) });\n}";
const ARCHIVED_HASH = "daaa6534000448276b3ba6dfd55be05bebc46fa7b68407f2d3d13d8252ad92f8";

const digest = (v: string) => createHash('sha256').update(v).digest('hex');
assert.equal(digest(ARCHIVED_SOURCE), ARCHIVED_HASH);
const nativeSource = readFileSync(new URL('../src/engine/levelgen.ts', import.meta.url), 'utf8');
function functionSource(source: string, name: string): string {
  const sf = ts.createSourceFile('probe.ts', source, ts.ScriptTarget.Latest, true);
  const node = sf.statements.find(n => ts.isFunctionDeclaration(n) && n.name?.text === name);
  assert.ok(node, 'native function missing: ' + name);
  return node.getText(sf).replace(/^export /, '');
}
const js = (source: string) => ts.transpileModule(source, {
  compilerOptions: { target: ts.ScriptTarget.ES2022, module: ts.ModuleKind.None },
}).outputText;
const kernels = new Function(js(['hashNoise', 'bearingNoise', 'radial']
  .map(name => functionSource(ARCHIVED_SOURCE, name)).join('\n')) + '\nreturn {radial,bearingNoise};')() as { radial: typeof radial; bearingNoise: typeof bearingNoise };
const dependencies = ['Mask', 'GEN_CELL', 'radial', 'bearingNoise', 'pourLobes', 'doodadRule',
  'findSpot', 'maskGuards', 'ruleIgnored', 'forbiddersOf', 'dist', 'paintLiquid'];
const bodies = [ARCHIVED_SOURCE, nativeSource].map(source => new Function(...dependencies,
  js(functionSource(source, 'pourBody')) + '\nreturn pourBody;'));
// Execute the actual unchanged private native guard functions, with controlled
// placement/registry fixtures. findSpot itself is a traced placement boundary;
// its geometry is covered by the standing native generation probes.
const guardNames = ['ruleIgnored', 'inReserved', 'walkGated', 'overVoid', 'genFieldSeed',
  'cellGuarded', 'forbiddersOf', 'maskGuards'];
const guardsFactory = new Function('doodadRule', 'dist', 'regionKind', 'POUR_CFG', 'valueNoise2',
  'ENTRY_CLEAR', 'EXIT_CLEAR', 'BORDER', js(guardNames.map(n => functionSource(nativeSource, n)).join('\n'))
  + '\nreturn {maskGuards,ruleIgnored,forbiddersOf};');
// Read native constants rather than quietly introducing another policy.
function constant(name: string): number {
  const match = nativeSource.match(new RegExp('const ' + name + ' = (\\d+);'));
  assert.ok(match, 'missing constant ' + name); return Number(match[1]);
}
interface Doodad { pos: Vec2; radius: number; kind: string; shallow?: boolean }
interface Fixture {
  center: Vec2 | null; rngSeed: number; radius: [number, number]; pieces: [number, number];
  pour?: PourSpec; seedOverride?: number; hard?: boolean; shallow?: boolean;
  guards?: boolean; placementDraws?: boolean; doodads?: Doodad[];
  reserved?: ({ pos: Vec2; radius: number } | { rect: {x:number;y:number;w:number;h:number} })[];
  entry?: Vec2; exits?: Vec2[]; ignore?: string[]; walkOnly?: boolean;
  walkBlock?: boolean; voidPatch?: boolean;
}
type Event = unknown[];
function run(f: Fixture, current: boolean) {
  const tape: Event[] = [], events: Event[] = [];
  const stream = new Rng(f.rngSeed);
  let ints = 0;
  const rng = {
    range(lo: number, hi: number) { const v = stream.range(lo, hi); tape.push(['range',lo,hi,v]); return v; },
    int(lo: number, hi: number) { const raw = stream.int(lo, hi);
      const v = ints++ === 0 ? (f.seedOverride ?? raw) : raw; tape.push(['int',lo,hi,v]); return v; },
  };
  const ctx = {
    rng, seed: f.rngSeed, zoneId: 'pour_shape_probe', arena: { w: 1800, h: 1600 },
    entry: f.entry ?? {x:70,y:70}, exits: f.exits ?? [], reserved: f.reserved ?? [],
    ruleOver: { ignore: f.ignore, walkOnly: f.walkOnly },
    doodads: structuredClone(f.doodads ?? []),
    walk: {
      isWalkable(x: number, y: number) { events.push(['walk',x,y]); return !(f.walkBlock && x > 870 && y > 780); },
      regionAt(x: number, y: number) { events.push(['region',x,y]); return f.voidPatch && x < 810 && y > 770 ? 'void' : 'ground'; },
    },
  };
  const rule = (kind: string) => {
    events.push(['rule',kind]);
    return kind === 'water' ? { pour: f.pour, overlap: 'ground' }
      : kind === 'dry_solid' ? { forbidOn: ['water'], overlap: 'solid' } : { overlap: 'ground' };
  };
  const guards = guardsFactory(rule, dist, regionKind, POUR_CFG, valueNoise2,
    constant('ENTRY_CLEAR'), constant('EXIT_CLEAR'), constant('BORDER')) as {
    maskGuards: (c: unknown, m: Mask, kind: string, hard: boolean) => void;
    ruleIgnored: (c: unknown, key: string) => boolean;
    forbiddersOf: (c: unknown, kind: string) => Doodad[];
  };
  const radialCalls: {x:number;y:number;rOf:(a:number)=>number}[] = [];
  let lobes: readonly PourLobe[] = [];
  let before: Mask | undefined, after: Mask | undefined;
  let paintBefore: Doodad[] | undefined;
  const shape = (m: Mask, x: number, y: number, rOf: (a:number)=>number) => {
    radialCalls.push({x,y,rOf}); return (current ? radial : kernels.radial)(m,x,y,rOf);
  };
  const body = bodies[current ? 1 : 0](Mask, GEN_CELL, shape,
    current ? bearingNoise : kernels.bearingNoise,
    (r: Pick<Rng,'int'|'range'>, c: Vec2, b: number, s: number, p: readonly [number,number]) => {
      lobes = pourLobes(r,c,b,s,p); return lobes;
    }, rule,
    (_c: unknown, ...args: unknown[]) => {
      events.push(['findSpot', ...args]);
      if (f.placementDraws) { rng.range(-2,2); rng.int(1,4); }
      return f.center;
    },
    (c: unknown, m: Mask, kind: string, hard: boolean) => {
      events.push(['guard',kind,hard]); before = m.clone();
      if (f.guards) guards.maskGuards(c,m,kind,hard);
      after = m.clone();
    }, guards.ruleIgnored, guards.forbiddersOf, dist,
    (c: typeof ctx, grid: null, m: Mask, liquid: Parameters<typeof paintLiquid>[3]) => {
      events.push(['paint',grid,liquid]); paintBefore = structuredClone(c.doodads);
      paintLiquid(c as unknown as GenCtx,grid,m,liquid);
    }) as (ctx: unknown, kind: string, r: [number,number], p: [number,number], hard: boolean,
      opts?: {shallow?:boolean}) => void;
  body(ctx,'water',f.radius,f.pieces,f.hard ?? false,f.shallow === undefined ? undefined : {shallow:f.shallow});
  return { tape, events, before, after, doodads: ctx.doodads, paintBefore, radialCalls, lobes,
    tail: Array.from({length:8},()=>stream.next()) };
}
let pairs = 0, latticePoints = 0, offGridPoints = 0, groups = 0;
function pair(f: Fixture) {
  const old = run(f,false), now = run(f,true); pairs++;
  const receipt = (v: ReturnType<typeof run>) => ({tape:v.tape,events:v.events,before:v.before,after:v.after,
    doodads:v.doodads,paintBefore:v.paintBefore,tail:v.tail});
  assert.deepEqual(receipt(now),receipt(old),'native pourBody output/callback/RNG changed');
  assert.equal(now.radialCalls.length,old.radialCalls.length);
  for (let i=0;i<old.radialCalls.length;i++) {
    assert.equal(now.radialCalls[i].x,old.radialCalls[i].x);
    assert.equal(now.radialCalls[i].y,old.radialCalls[i].y);
    for (let j=-16;j<=16;j++) assert.equal(now.radialCalls[i].rOf(j*Math.PI/16),old.radialCalls[i].rOf(j*Math.PI/16));
  }
  return {old,now};
}
function group(name: string, fn: ()=>void) { fn(); groups++; console.log('PASS '+name); }
function originalContains(calls: ReturnType<typeof run>['radialCalls'], x: number, y: number) {
  let hit = false;
  // Feed an exact one-point mask to the archived radial implementation, so
  // off-grid and float-boundary checks share no handwritten distance formula.
  const pointMask = {cols:1,rows:1,center:()=>({x,y}),set:()=>{hit=true;}} as unknown as Mask;
  for (const c of calls) kernels.radial(pointMask,c.x,c.y,c.rOf);
  return hit;
}

group('864 archived native masks, lobe order and complete RNG tapes',()=>{
  for (const rngSeed of [0,1,713,0x80000000,0xfffffffe,0xffffffff])
    for (const center of [{x:0,y:0},{x:-151.25,y:-29.75},{x:1200.125,y:-904.5}])
      for (const body of [0,13,87.25,270]) for (const wobble of [0,0.3,1,1.5])
        for (const pieces of [[0,0],[1,1],[2,7]] as [number,number][]) {
          const {old,now} = pair({center,rngSeed,radius:[body,body],pieces,
            seedOverride:rngSeed,pour:{scale:1,wobble}});
          assert.ok(old.before);
          for (let cy=0;cy<old.before.rows;cy++) for (let cx=0;cx<old.before.cols;cx++) {
            const p=old.before.center(cx,cy); latticePoints++;
            assert.equal(pourContains(now.lobes,wobble,p.x,p.y),old.before.get(cx,cy));
          }
          const points=new Rng(rngSeed^0x331111);
          for (let i=0;i<32;i++) {
            const x=center.x+points.range(-3,3)*Math.max(1,body), y=center.y+points.range(-3,3)*Math.max(1,body);
            offGridPoints++;
            assert.equal(pourContains(now.lobes,wobble,x,y),originalContains(old.radialCalls,x,y));
          }
        }
});

group('squared radial boundary, nonpositive rims, wrapped seeds and immutable inputs',()=>{
  assert.equal(pourContains([],0,0,0),false);
  for (const radius of [-30,0,1,30,87.25]) for (const wobble of [0,0.3,1,1.5])
    for (const seed of [0,0xffffffff]) {
      const lobes=Object.freeze([Object.freeze({x:-61.25,y:3.75,radius,seed})]);
      const calls=[{x:lobes[0].x,y:lobes[0].y,rOf:(a:number)=>radius*(1+kernels.bearingNoise(a,wobble,seed))}];
      for (const a of [0,Math.PI/4,Math.PI/2,Math.PI,-Math.PI/2]) {
        const r=calls[0].rOf(a);
        for (const mul of [0,1-Number.EPSILON,1,1+Number.EPSILON,1.1]) {
          const x=lobes[0].x+Math.cos(a)*r*mul, y=lobes[0].y+Math.sin(a)*r*mul; offGridPoints++;
          assert.equal(pourContains(lobes,wobble,x,y),originalContains(calls,x,y));
        }
      }
    }
  assert.equal(pourContains([{x:0,y:0,radius:30,seed:0}],0,30,0),true);
  assert.equal(pourContains([{x:0,y:0,radius:30,seed:0}],0,30+Number.EPSILON*30,0),false);
  const center=Object.freeze({x:-20,y:12}), pieces=Object.freeze([2,2] as const);
  const lobes=pourLobes(new Rng(9),center,30,0xffffffff,pieces);
  assert.deepEqual(lobes.map(l=>l.seed),[0xffffffff,0,1]);
  assert.deepEqual(center,{x:-20,y:12}); assert.deepEqual(pieces,[2,2]);
});

group('native guards, depth core, shallow paint, failed siting and placement RNG',()=>{
  const base: Fixture={center:{x:850,y:800},rngSeed:713,radius:[110,150],pieces:[2,7],guards:true,
    placementDraws:true,pour:{depthCore:true,scale:1.5,wobble:0.3}};
  const variants: [string,Partial<Fixture>][]=[
    ['plain',{}],['shallow',{shallow:true}],['no core',{pour:{depthCore:false}}],
    ['no pour row',{pour:undefined}],['small scale',{pour:{depthCore:true,scale:.7,wobble:.8}}],
    ['circle reserve',{reserved:[{pos:{x:770,y:800},radius:75}]}],
    ['rect reserve',{reserved:[{rect:{x:890,y:650,w:75,h:350}}]}],
    ['portal',{entry:{x:710,y:800},exits:[{x:950,y:800}]}],
    ['border',{center:{x:100,y:800}}],['walk',{walkOnly:true,walkBlock:true}],['void',{voidPatch:true}],
    ['forbid core',{doodads:[{kind:'dry_solid',pos:{x:850,y:800},radius:30}]}],
    ['forbid rim',{doodads:[{kind:'dry_solid',pos:{x:1020,y:800},radius:30}]}],
    ['ignore forbid',{doodads:[{kind:'dry_solid',pos:{x:850,y:800},radius:30}],ignore:['forbid']}],
    ['ignore guards',{reserved:[{pos:{x:850,y:800},radius:900}],entry:{x:850,y:800},voidPatch:true,
      walkOnly:true,walkBlock:true,ignore:['reserved','portalClear','walk','border']}],
    ['zero bank',{reserved:[{rect:{x:890,y:650,w:75,h:350}}],pour:{depthCore:true,bankWobble:0}}],
    ['failed siting',{center:null}],
  ];
  let trimmed=0,depth=0,blockedCore=0,shallow=0;
  for (const rngSeed of [0,713,0xffffffff]) for (const hard of [false,true]) for (const [name,over] of variants) {
    const f={...base,...over,rngSeed,hard}; const {old}=pair(f);
    if (old.before && old.after && old.after.count()<old.before.count()) trimmed++;
    const addedCore=(old.paintBefore?.length??0)-(f.doodads?.length??0);
    if (name==='plain') { assert.equal(addedCore,1); depth++; }
    if (name==='forbid core') { assert.equal(addedCore,0); blockedCore++; }
    if (name==='shallow') { assert.equal(addedCore,0); assert.ok(old.doodads.length>0);
      assert.ok(old.doodads.every(d=>d.shallow)); shallow++; }
    if (name==='failed siting') { assert.equal(old.before,undefined); assert.equal(old.paintBefore,undefined);
      assert.equal(old.radialCalls.length,0); assert.equal(old.tape.length,3); }
  }
  assert.ok(trimmed>0); assert.equal(depth,6); assert.equal(blockedCore,6); assert.equal(shallow,6);
  console.log('  exercised '+trimmed+' trimmed masks; '+depth+' depth cores; '+blockedCore+' forbidden cores; '+shallow+' shallow pours');
});
console.log(JSON.stringify({groups,pairs,latticePoints,offGridPoints,archivedCommit:ARCHIVED_COMMIT,archivedHash:ARCHIVED_HASH,
  scope:'native grid kernel, unchanged guards and paint output; no grid/disc-footprint equivalence claim'}));
