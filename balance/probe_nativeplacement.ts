import assert from 'node:assert/strict';
import { createHash } from 'node:crypto';
import ts from 'typescript';
import { bootSimEngine, makeSimWorld } from '../src/sim/arena';
import { mulberry32, seedGlobalRandom } from '../src/sim/rng';
import { World } from '../src/engine/world';
import { Actor } from '../src/engine/actor';
import { dist, vec, rand } from '../src/core/math';
import { clampToBounds, samplePoint, type Bounds } from '../src/world/shape';
import { GridWalkField, WALK_CFG } from '../src/world/gridWalk';
import type { WalkField } from '../src/world/walk';
import { blocksMovement, hitSurfaceOf, pitRegionOf, type Doodad } from '../src/engine/levelgen';
import { pushOutOfShape } from '../src/engine/shapes';
import { regionKind, registerRegion } from '../src/world/regions';
import { PIT_CFG, anyPitNear, pitAt, pitSupportedAt } from '../src/engine/pitfall';
import { bindMovementTether, refreshMovementTether, movementTetherLimit, movementTetherDistance } from '../src/engine/movementTether';
import { nativeFarPoint, nativeFarthestStand, nativeFindFreeSpot, nativePlacementClamp, type NativePlacementHost } from '../src/engine/nativePlacement';

// Pinned native World methods, retained independently of the implementation.
// This durable oracle never reads Git or ignored scratch when it runs.
const ORIGINAL = {"commit":"3b14dba3","worldHash":"d3ce08a5838c441726a002ddeac8d496f87635933117cead033bf0f2b9c3b4f2","methods":{"farPoint":"private farPoint(minFromPlayer: number, spaceFromEvents = false,\n    draw: (a: number, c: number) => number = rand): Vec2 {\n    let best = vec(this.arena.w / 2, this.arena.h / 2);\n    let bestScore = -Infinity;\n    for (let tries = 0; tries < 40; tries++) {\n      const sp = samplePoint(this.arena, 90, draw);\n      const p = vec(sp.x, sp.y);\n      if (this.walk && !this.walk.isWalkable(p.x, p.y)) continue; // walk zones: on-mesh only\n      if (this.pointInSolid(p.x, p.y, 16)) continue; // never anchor an event/pack inside a rock blob\n      const dPlayer = dist(p, this.player.pos);\n      let dEvents = Infinity;\n      if (spaceFromEvents) for (const a of this.eventAnchors) dEvents = Math.min(dEvents, dist(p, a));\n      if (dPlayer >= minFromPlayer && (!spaceFromEvents || dEvents >= EVENT_SPACING)) {\n        if (spaceFromEvents) this.eventAnchors.push(p);\n        return p;\n      }\n      // Track the best compromise: maximize whichever constraint is worst.\n      const score = Math.min(dPlayer, spaceFromEvents ? dEvents : Infinity);\n      if (score > bestScore) { bestScore = score; best = p; }\n    }\n    // Every sample missed the mesh (a mostly-solid carve): `best` would still\n    // be the raw arena center — inside rock, snapping wherever clampPos lands\n    // it. Degrade to the true farthest walkable stand instead.\n    if (bestScore === -Infinity) {\n      const far = this.farthestStand(16, false);\n      if (far) best = far;\n    }\n    if (spaceFromEvents) this.eventAnchors.push(best);\n    return best;\n  }","farthestStand":"private farthestStand(radius: number, needReachable: boolean): Vec2 | null {\n    // Sample every walk cell's center: a fixed 60px stride can skip a whole\n    // 30px-wide corridor, including the only stand outside arrival grace.\n    const step = this.walk instanceof GridWalkField ? Math.min(60, this.walk.cell) : 60;\n    const start = this.walk instanceof GridWalkField ? Math.ceil(90 / step) * step + step / 2 : 90;\n    let best: Vec2 | null = null;\n    let bd = -1;\n    let bestOpen: Vec2 | null = null; // the walkable-only understudy\n    let bo = -1;\n    for (let y = start; y < this.arena.h - 60; y += step) {\n      for (let x = start; x < this.arena.w - 60; x += step) {\n        if (this.walk && !this.walk.isWalkable(x, y)) continue;\n        if (this.pointInSolid(x, y, radius * 0.5)) continue;\n        // Score the full-radius landing, not a point clamping may move.\n        const stand = this.clampPos(vec(x, y), radius);\n        const d = dist(stand, this.player.pos);\n        if (d > bo) { bo = d; bestOpen = stand; }\n        if (needReachable && this.walk?.reachable\n          && !this.walk.reachable(this.zoneEntry, stand)) continue;\n        if (d > bd) { bd = d; best = stand; }\n      }\n    }\n    // Reachability that eliminated EVERY stand is a broken metric (an entry\n    // sitting off-mesh reports nothing reachable) — a far walkable stand\n    // still beats the entry stack the callers would otherwise fall to.\n    return best ?? bestOpen;\n  }","findFreeSpot":"findFreeSpot(at: Vec2, radius: number, tier = 0): Vec2 {\n    // LAYER SOVEREIGNTY: the whole hunt happens on ONE story — solids of the\n    // body's own layer reject, the clamp confines against that story's floor\n    // (ClampOpts.tier), and the walkability read is the story's own view\n    // (the base grid is another layer's truth: a \"free\" spot judged on it\n    // would strand an under-story runner off its own web). tier 0 (every\n    // legacy caller) walks the identical path it always did.\n    const opts = tier >= 1 ? { tier } : undefined;\n    const walkAt = tier >= 1 && this.tierViews\n      ? this.tierViews[Math.min(tier, this.tierViews.length - 1)] ?? this.walk\n      : this.walk;\n    const p = this.clampPos(vec(at.x, at.y), radius, undefined, opts);\n    if (!this.pointInSolid(p.x, p.y, radius * 0.4, tier)) return p;\n    for (let ring = 1; ring <= 7; ring++) {\n      const rr = ring * 55;\n      for (let k = 0; k < 10; k++) {\n        const a = (k / 10) * Math.PI * 2 + ring * 0.73;\n        const q = this.clampPos(vec(at.x + Math.cos(a) * rr, at.y + Math.sin(a) * rr), radius, undefined, opts);\n        if (this.pointInSolid(q.x, q.y, radius * 0.4, tier)) continue;\n        if (walkAt && !walkAt.isWalkable(q.x, q.y)) continue;\n        return q;\n      }\n    }\n    return p; // no clear ground within ~385u — keep the clamp (never loop forever)\n  }","clampPos":"clampPos(p: Vec2, radius: number, from?: Vec2, opts?: ClampOpts): Vec2 {\n    const movementTether = opts?.mover instanceof Actor ? refreshMovementTether(opts.mover, this) : undefined;\n    if (movementTether) p = movementTetherLimit(movementTether, p);\n    const b0 = clampToBounds(p, radius, this.arena);\n    const out = vec(b0.x, b0.y);\n    // THE TIER FABRIC: the mover's layer, read once — gates the doodad\n    // collision below (a street lamp never blocks the duct runner beneath\n    // it) and the walk-confine swap further down.\n    const mvTier = opts?.tier ?? (opts?.mover as { tier?: number } | undefined)?.tier ?? 0;\n    // A wall-phasing displacement (ignoreConfine) stays in-bounds but skips doodad\n    // + walk confinement (a flicker/teleport lands past rocks, walls, the void).\n    if (!opts?.disp?.ignoreConfine) {\n    // Iterate: escaping one circle of a blob can land inside its neighbor.\n    // Candidates come from the spatial index, re-queried per pass (a push can\n    // slide the point toward discs the first bucket didn't see).\n    for (let pass = 0; pass < 3; pass++) {\n      let moved = false;\n      for (const o of this.doodadsAt(out.x, out.y)) {\n        if ((o.tier ?? 0) !== mvTier) continue; // its layer's furniture only\n        if (!blocksMovement(o)) continue;\n        // THE PITFALL FABRIC (engine/pitfall.ts): a fall-able pit is a DROP,\n        // not a wall — the push loop leaves it whole and the pit confine\n        // below owns the crossing (grasp the lip, arrest at support loss,\n        // the region's boundary policy decides what the fall means). Gen\n        // and pathing still read blocksMovement: only the mover knows the\n        // difference between stone and a long way down.\n        if (pitRegionOf(o)) continue;\n        // The hit-surface fabric: trunks (discs) keep the classic radial\n        // slide byte-for-byte; oblong surfaces (door slabs, benches) push\n        // out through their true face — walking into a door slides you\n        // along the plank, not around an invisible circle.\n        const push = pushOutOfShape(hitSurfaceOf(o, 'move'), o.pos.x, o.pos.y, out.x, out.y, radius);\n        if (!push) continue;\n        if (o.kind === 'chasm' && this.bridges.some(b => dist(out, b.pos) <= b.radius)) continue;\n        moved = true;\n        out.x = push.x; out.y = push.y;\n        // CLASSIFY (opt-in): record what stopped us, for the collision-proc\n        // seam (fall-able pits never reach here — the pit confine classifies\n        // their arrests as 'void' with the pit's own region).\n        if (opts?.out) {\n          opts.out.hit = 'wall'; opts.out.at = vec(o.pos.x, o.pos.y);\n          opts.out.blockedKind = o.kind;\n          opts.out.normal = { x: push.nx, y: push.ny };\n        }\n      }\n      if (!moved) break;\n    }\n    }\n    const b1 = clampToBounds(out, radius, this.arena);\n    out.x = b1.x; out.y = b1.y;\n    // THE TIER SWAP (engine/tiers.ts): an elevated mover confines against\n    // ITS story's floor — that story's view is scoped over this.walk for\n    // exactly the confine block below (synchronous, never re-entrant:\n    // walkResolve/walkSweep read this.walk, so the swap reaches every\n    // sample without threading a param through four layers). Restored in\n    // the finally. A stale tier beyond the zone's stack clamps to the top.\n    // Gated on zone.tiers (the arrivalStory law's second half): every tier-\n    // region painter stamps def.tiers, so a zone WITHOUT it owns no story\n    // floor anywhere — tierViews[1] there is the EMPTY mask, and swapping to\n    // it froze any body wearing a stale layer index solid. A stale tier in\n    // a storyless zone now walks the base grid instead.\n    const moverTier = mvTier;\n    let tierSwap: WalkField | null = null;\n    if (moverTier >= 1 && this.zone.tiers && this.tierViews && this.walk) {\n      const view = this.tierViews[Math.min(moverTier, this.tierViews.length - 1)];\n      if (view) { tierSwap = this.walk; this.walk = view as unknown as GridWalkField; }\n    }\n    try {\n    // NON-CONVEX zones (Phase 2/3): keep the actor on walkable ground, but ASK THE\n    // REGION POLICY (not a bare bool) — walls confine, void is enter-then-resolve,\n    // and a displacement may opt to cross. NULL walk (plains + existing) skips all.\n    if (this.walk && !opts?.disp?.ignoreConfine) {\n      const disp = opts?.disp;\n      const destKind = this.walk.regionAt?.(out.x, out.y) ?? (this.walk.isWalkable(out.x, out.y) ? 'ground' : 'wall');\n      const ddef = regionKind(destKind);\n      const isFall = !!ddef && !ddef.walkable && !ddef.blocks; // void-like: ENTER then resolve\n      // A fall region may be crossed harmlessly by a fall-ignoring move or a data\n      // crossing exception (a bridge over grid-void); walls only by ignoreConfine (above).\n      const crossable = isFall && (!!disp?.ignoreFall || (ddef!.crossableBy ? ddef!.crossableBy(disp ?? {}) : false));\n      if (crossable) {\n        // pass through (out stays the raw destination)\n      } else if (from) {\n        // Swept confine along from→out (no wall-tunnel, no wrong-side snap), then\n        // classify what we were confined out of — the collision-proc / fall seam.\n        // A fall-ignoring move crosses void bands to far walkable ground (walls still stop it).\n        const desired = vec(out.x, out.y);\n        const r = this.walkResolve(from, out, !!disp?.ignoreFall, radius * WALK_CFG.ledgeGrasp);\n        out.x = r.x; out.y = r.y;\n        if (opts?.out && (desired.x !== r.x || desired.y !== r.y)) {\n          // Probe the cell JUST BEYOND the confined point toward the goal — that's\n          // the actual blocker (NOT regionAt(desired), which a strong overshoot lands\n          // past, on the far walkable side, mis-reporting a void as a wall).\n          const bx = desired.x - r.x, by = desired.y - r.y, bl = Math.hypot(bx, by) || 1;\n          const cs = this.walk.cellSize ?? 24;\n          const bk = this.walk.regionAt?.(r.x + (bx / bl) * cs, r.y + (by / bl) * cs) ?? 'wall';\n          const bdef = regionKind(bk);\n          opts.out.hit = bdef && !bdef.walkable && !bdef.blocks ? 'void' : 'wall';\n          opts.out.at = desired;\n          opts.out.blockedKind = bk;\n        }\n      } else if (!this.walk.isWalkable(out.x, out.y)) {\n        // A placement/teleport (no origin): nearest walkable.\n        const s = this.walk.snapToWalkable(out);\n        out.x = s.x; out.y = s.y;\n      }\n    }\n    } finally { if (tierSwap) this.walk = tierSwap; } // the tier swap ends with the walk confine\n    // THE PITFALL CONFINE (the pitfall fabric, engine/pitfall.ts): fall-able\n    // pit doodads are DROPS, not walls. The sweep advances while the body's\n    // grasp disc still overlaps standing ground or a spanning deck — the\n    // aetherial cloud-lip law in disc space, drawn == tested against the\n    // chasmPit painter's blob union — and slides along rims exactly as the\n    // walk confine slides along walls. An arrest past all support classifies\n    // 'void' carrying the pit's own REGION, so the boundary policy (or the\n    // zone's theme.pitfall) decides what the fall MEANS. Fall-ignoring\n    // displacements (fliers, levitators, blinks) sail across; a body HOME in\n    // a pit's kind (the insurance trio: wings / habitat / immune ground)\n    // walks it like floor. Zones without pits pay one empty-list check.\n    {\n      const pits = this.zonePits();\n      // Elevated movers pass over pit mouths (a deck or bench spans the\n      // world's floor features — the rim fall is their only way down).\n      if (pits.length && moverTier === 0 && !opts?.disp?.ignoreConfine && !opts?.disp?.ignoreFall) {\n        const grasp = radius * WALK_CFG.ledgeGrasp;\n        const home = this.pitHomeKinds(opts?.mover, pits);\n        if (from) {\n          if (anyPitNear(pits, from.x, from.y, out.x, out.y, radius + PIT_CFG.sweepGran)) {\n            const desired = vec(out.x, out.y);\n            const r = this.pitResolve(pits, from, out, grasp, home);\n            out.x = r.x; out.y = r.y;\n            if (opts?.out && (desired.x !== r.x || desired.y !== r.y)) {\n              // The blocker is the pit just past the confined point toward\n              // the goal (the walk confine's probe-beyond discipline).\n              const bx = desired.x - r.x, by = desired.y - r.y, bl = Math.hypot(bx, by) || 1;\n              const hitPit = pitAt(pits, this.bridges,\n                r.x + (bx / bl) * PIT_CFG.sweepGran, r.y + (by / bl) * PIT_CFG.sweepGran, home)\n                ?? pitAt(pits, this.bridges, desired.x, desired.y, home);\n              if (hitPit) {\n                opts.out.hit = 'void';\n                opts.out.at = desired;\n                opts.out.blockedKind = hitPit.region;\n              }\n            }\n          }\n        } else if (!pitSupportedAt(pits, this.bridges, out.x, out.y, grasp, home)) {\n          // A placement/teleport (no origin) may not land IN a pit: march a\n          // FIXED ray from the covering disc's heart until the whole UNION\n          // lets go (a radial per-disc push ping-pongs inside a blob's\n          // waist — the ray walks straight out of a chain of wells).\n          const over0 = pitAt(pits, this.bridges, out.x, out.y, home);\n          if (over0) {\n            let dx = out.x - over0.x, dy = out.y - over0.y;\n            const dl = Math.hypot(dx, dy);\n            if (dl < 0.001) { dx = 1; dy = 0; } else { dx /= dl; dy /= dl; }\n            let px = over0.x + dx * (over0.r + radius);\n            let py = over0.y + dy * (over0.r + radius);\n            for (let s = 0; s < 64 && pitAt(pits, this.bridges, px, py, home); s++) {\n              px += dx * PIT_CFG.sweepGran; py += dy * PIT_CFG.sweepGran;\n            }\n            out.x = px; out.y = py;\n          }\n        }\n      }\n    }\n    // Terrain may slide a legal destination beyond the cord. Refuse that\n    // step instead of projecting the terrain-resolved body INTO a wall.\n    if (movementTether && movementTetherDistance(movementTether, out) > movementTether.spec.length + 0.001) {\n      // A moving anchor can leave NO legal point on this side of a wall.\n      // Break that cord instead of teleporting a body through solid terrain.\n      if (movementTetherDistance(movementTether, movementTether.safe) > movementTether.spec.length) {\n        movementTether.released = true; movementTether.returning = false;\n        return out;\n      }\n      return { ...movementTether.safe };\n    }\n    return out;\n  }"}};
const ORIGINAL_METHODS_SHA256 = 'cd04264d8130d57adfba1d790526b93d15081049f82570f6270723cc0d0b7388';
const text = Object.values(ORIGINAL.methods).join('\n');
assert.equal(createHash('sha256').update(text).digest('hex'), ORIGINAL_METHODS_SHA256);
const deps = { Actor, dist, vec, rand, clampToBounds, samplePoint, GridWalkField,
  blocksMovement, hitSurfaceOf, pitRegionOf, pushOutOfShape, regionKind, WALK_CFG,
  PIT_CFG, anyPitNear, pitAt, pitSupportedAt, refreshMovementTether,
  movementTetherLimit, movementTetherDistance, EVENT_SPACING: 240 };
const js = ts.transpileModule(`class ArchivedPlacement {\n${text}\n}`, {
  compilerOptions: { target: ts.ScriptTarget.ES2022, module: ts.ModuleKind.None },
}).outputText;
const archived = new Function(...Object.keys(deps), `${js}\nreturn ArchivedPlacement.prototype;`)(...Object.values(deps)) as Record<string, (...args: any[]) => any>;

bootSimEngine();
const restoreBoot = seedGlobalRandom(918113);
const world = makeSimWorld('warrior', 918113);
restoreBoot();
// Private method access is confined to this oracle harness. Production uses
// the explicit host, without a pseudo-World or swapping another area's zone.
const w = world as any;
const methods = ['farPoint', 'farthestStand', 'findFreeSpot', 'clampPos'] as const;
type Method = typeof methods[number];
const originalWorld = Object.fromEntries(methods.map(k => [k, w[k]]));
let tape: unknown[] = [];
let totalPairs = 0, totalDraws = 0, totalCallbacks = 0;
const data = <T>(value: T): T => structuredClone(value);
function doodad(kind: string, x: number, y: number, radius: number, extra: Partial<Doodad> = {}): Doodad {
  return { kind, pos: vec(x, y), radius, ...extra };
}
function grid(kind = 'ground', cell = 30): GridWalkField {
  const g = new GridWalkField(600, 480, cell);
  g.fillRegion(0, 0, 600, 480, kind);
  return g;
}
function traceWalk(walk: WalkField | null, label: string): WalkField | null {
  if (!walk) return null;
  for (const key of ['isWalkable', 'regionAt', 'snapToWalkable', 'reachable', 'supportedAt'] as const) {
    const fn = walk[key];
    if (!fn) continue;
    (walk as any)[key] = (...args: any[]) => {
      tape.push([label, key, data(args)]);
      return (fn as (...args: any[]) => unknown).apply(walk, args);
    };
  }
  return walk;
}
interface Fixture {
  name: string;
  bounds?: Bounds;
  doodads?: Doodad[];
  setup?: () => void;
}
const fixtures: Fixture[] = [
  { name: 'rect' },
  { name: 'ellipse', bounds: { w: 600, h: 480, shape: 'ellipse' } },
  { name: 'annex', bounds: { w: 600, h: 480, shape: 'rect', pieces: [
    { id: 'live', x: 540, y: 200, w: 260, h: 240, active: true, shape: 'ellipse' },
    { id: 'sealed', x: -200, y: 0, w: 250, h: 200, active: false },
  ] } },
  { name: 'boundless', bounds: { w: 600, h: 480, shape: 'rect', boundless: true } },
  { name: 'solid-union', doodads: [doodad('rock', 300, 240, 85, { rot: 1.9 }),
    doodad('rock', 350, 240, 85, { rot: 4.2 }), doodad('sunken_log', 210, 240, 60, { rot: .7 }),
    doodad('wall', 125, 120, 30), doodad('rock', 420, 120, 45, { gone: true }),
    doodad('rock', 440, 300, 55, { tier: 1 })] },
  { name: 'closed-door', doodads: [doodad('door', 300, 240, 65, { dir: .6,
    door: { id: 'probe-door', mode: 'dwell', cells: { x: 250, y: 210, w: 100, h: 30 } } })] },
  { name: 'open-door', doodads: [doodad('door', 300, 240, 65, { dir: .6,
    door: { id: 'probe-door', mode: 'dwell', open: true, cells: { x: 250, y: 210, w: 100, h: 30 } } })] },
  { name: 'pit-chain', doodads: [doodad('chasm', 260, 240, 105), doodad('chasm', 390, 240, 105)] },
  { name: 'pit-deck', doodads: [doodad('chasm', 300, 240, 130), doodad('bridge', 300, 240, 80)] },
  { name: 'minimal-walk-interface', setup() { w.walk = { isWalkable: (x: number) => x < 200,
    snapToWalkable: () => vec(150, 150) }; } },
  { name: 'broken-reachability-fallback', setup() { w.walk = grid(); w.walk.reachable = () => false; } },
  { name: 'grid-wall', setup() { w.walk = grid(); w.walk.fillRegion(240, 60, 360, 390, 'wall'); } },
  { name: 'grid-void', setup() { w.walk = grid(); w.walk.fillRegion(240, 60, 360, 390, 'void'); } },
  { name: 'grid-corridor', setup() { w.walk = grid('wall'); w.walk.fillRegion(90, 90, 510, 120, 'ground'); } },
  { name: 'grid-islands', setup() { w.walk = grid('wall'); w.walk.fillRegion(90, 90, 210, 390, 'ground');
    w.walk.fillRegion(390, 90, 510, 390, 'ground'); } },
  { name: 'tiers', doodads: [doodad('wall', 300, 240, 70), doodad('wall', 180, 150, 40, { tier: 1 })],
    setup() { w.walk = grid(); const upper = grid('wall'); upper.fillRegion(90, 90, 270, 240, 'ground');
      w.tierViews = [w.walk, upper]; w.zone.tiers = { kind: 'buttes', levels: 1 }; } },
  { name: 'stale-tier-storyless', setup() { w.walk = grid(); w.tierViews = [w.walk, grid('wall')]; } },
  { name: 'tier-missing-view', setup() { w.walk = grid(); w.tierViews = [w.walk, undefined];
    w.zone.tiers = { kind: 'buttes', levels: 1 }; } },
];
const savedFns = Object.fromEntries(['doodadsAt', 'pointInSolid', 'zonePits', 'pitHomeKinds'].map(k => [k, w[k]]));
function prepare(f: Fixture): WalkField | null {
  for (const k of methods) w[k] = originalWorld[k];
  for (const [k, fn] of Object.entries(savedFns)) w[k] = fn;
  w.arena = data(f.bounds ?? { w: 600, h: 480, shape: 'rect' });
  w.doodads = data(f.doodads ?? []); w.walk = null; w.tierViews = null;
  w.zone = { ...w.zone, tiers: undefined }; w.player.pos = vec(105, 105);
  w.zoneEntry = vec(105, 105); w.eventAnchors = [vec(400, 330)];
  w.massRuntime = undefined; w.markDoodadsChanged();
  f.setup?.();
  const walks = new Set<WalkField>([w.walk, ...(w.tierViews ?? [])].filter(Boolean));
  let n = 0; for (const walk of walks) traceWalk(walk, `walk${n++}`);
  for (const key of Object.keys(savedFns)) {
    const fn = w[key];
    w[key] = (...args: any[]) => {
      tape.push([key, data(args)]);
      const value = fn.apply(w, args);
      if (key === 'doodadsAt') tape.push(['candidates', value.map((d: Doodad) => w.doodads.indexOf(d))]);
      return value;
    };
  }
  tape = [];
  return w.walk;
}
function run(f: Fixture, mode: 'archive' | 'world' | 'local', method: Method, args: any[], seed: number) {
  const initialWalk = prepare(f);
  const random = Math.random, rng = mulberry32(seed), draws: number[] = [];
  Math.random = () => { const d = rng(); draws.push(d); return d; };
  let dispatches = 0;
  const oldHost = w.nativePlacementHost;
  w.nativePlacementHost = function () { dispatches++; return oldHost.call(this); };
  if (mode === 'archive') for (const k of methods) w[k] = (...a: any[]) => archived[k].apply(w, a);
  if (mode === 'local') {
    // The same explicit host contract a local-area owner supplies; its selected
    // operation callbacks recurse locally and do not invoke World wrappers.
    const h: NativePlacementHost = oldHost.call(w);
    h.clampPos = (p, r, _from, opts) => nativePlacementClamp(h, p, r, opts?.tier);
    h.farthestStand = (r, reachable) => nativeFarthestStand(h, r, reachable);
    w.clampPos = h.clampPos; w.farthestStand = h.farthestStand;
    w.findFreeSpot = (...a: Parameters<typeof World.prototype.findFreeSpot>) => nativeFindFreeSpot(h, ...a);
    w.farPoint = (min: number, spaced?: boolean, draw?: typeof rand) => nativeFarPoint(h, min, spaced, draw);
  }
  try {
    const callArgs = data(args);
    const result = w[method](...callArgs);
    assert.equal(w.walk, initialWalk, `${f.name}: tier view restored`);
    const next = Math.random();
    totalDraws += draws.length; totalCallbacks += tape.length;
    return { result, args: callArgs, anchors: data(w.eventAnchors), tape: data(tape), draws, next, dispatches };
  } finally { Math.random = random; w.nativePlacementHost = oldHost; }
}
function pair(f: Fixture, method: Method, args: any[], seed = 7181, local = true) {
  const expected = run(f, 'archive', method, args, seed);
  for (const mode of local ? ['world', 'local'] as const : ['world'] as const) {
    const actual = run(f, mode, method, args, seed);
    assert.deepEqual({ ...actual, dispatches: 0 }, expected, `${f.name}/${method}/${mode}/${JSON.stringify(args)}`);
    if (mode === 'world') assert.ok(actual.dispatches > 0, 'placement must dispatch to shared operation');
    totalPairs++;
  }
  return expected;
}
for (const f of fixtures) {
  for (const p of [vec(-80, -30), vec(300, 240), vec(215, 240), vec(350, 242), vec(580, 470), vec(720, 320)]) {
    for (const tier of [0, 1, 7]) pair(f, 'clampPos', [p, 17, undefined, { tier }]);
  }
  for (const tier of [0, 1, 7]) pair(f, 'findFreeSpot', [vec(300, 240), 17, tier]);
  pair(f, 'farthestStand', [17, false]); pair(f, 'farthestStand', [17, true]);
  for (const seed of [1, 713]) {
    pair(f, 'farPoint', [190, false], seed); pair(f, 'farPoint', [1100, true], seed);
  }
}
// All forty random attempts reject, then scan the true cell centers. If no
// legal stand exists the original raw-center fallback and anchor still survive.
const rejected: Fixture = { name: 'forty-reject', setup() { w.walk = grid('wall'); } };
const rejectedResult = pair(rejected, 'farPoint', [900, true]);
assert.deepEqual(rejectedResult.result, vec(300, 240));
assert.equal(rejectedResult.draws.length, 81);
const corridorFallback: Fixture = { name: 'all-random-miss-thin-corridor', setup() {
  w.walk = grid('wall'); w.walk.fillRegion(90, 90, 510, 120, 'ground');
} };
pair(corridorFallback, 'farPoint', [900, true], 397);
const noFree: Fixture = { name: 'seventy-ring-failures', setup() {
  w.pointInSolid = () => doodad('wall', 0, 0, 1);
} };
const noFreeResult = pair(noFree, 'findFreeSpot', [vec(300, 240), 17, 0]);
assert.equal(noFreeResult.tape.filter(x => Array.isArray(x) && x[0] === 'pointInSolid').length, 71);
assert.deepEqual(noFreeResult.result, vec(300, 240));
// Exact native pit ray may end outside arena after exhausting all 64 steps;
// this operation must not append a new bounds clamp or claim a route proof.
const longPit: Fixture = { name: 'sixty-four-pit-ray', doodads: [doodad('chasm', 300, 240, 100), doodad('chasm', 600, 240, 1500)] };
const ray = pair(longPit, 'clampPos', [vec(300, 240), 17]);
assert.deepEqual(ray.result, vec(300 + 100 + 17 + 64 * PIT_CFG.sweepGran, 240));

// crossableBy is called with the original empty policy, including exception
// timing and restoration of a temporarily selected tier view.
registerRegion({ id: 'placement_probe_cross', walkable: false, blocks: false,
  crossableBy: d => { tape.push(['crossableBy', data(d)]); return true; } });
registerRegion({ id: 'placement_probe_throw', walkable: false, blocks: false,
  crossableBy: d => { tape.push(['crossableBy', data(d)]); throw new Error('placement-probe-cross'); } });
const cross: Fixture = { name: 'moverless-cross', setup() { w.walk = grid('placement_probe_cross'); } };
assert.deepEqual(pair(cross, 'clampPos', [vec(300, 240), 17]).result, vec(300, 240));
for (const mode of ['archive', 'world', 'local'] as const) {
  const f: Fixture = { name: 'throw-restores-tier', setup() { w.walk = grid();
    w.tierViews = [w.walk, grid('placement_probe_throw')]; w.zone.tiers = { levels: 1 }; } };
  assert.throws(() => run(f, mode, 'clampPos', [vec(300, 240), 17, undefined, { tier: 1 }], 12), /placement-probe-cross/);
  assert.equal(w.walk, w.tierViews[0]);
}

// Original general movement retains its old method, including sweep and
// collision output. Each excluded option must bypass the shared host entirely.
const movement: Fixture = { name: 'general-movement', doodads: fixtures[4].doodads,
  setup() { w.walk = grid(); w.walk.fillRegion(240, 60, 360, 390, 'wall'); } };
for (const args of [
  [vec(400, 240), 17, vec(100, 240)],
  [vec(300, 240), 17, undefined, { disp: { ignoreConfine: true } }],
  [vec(300, 240), 17, undefined, { disp: {} }],
  [vec(300, 240), 17, undefined, { out: {} }],
  [vec(300, 240), 17, undefined, { mover: { tier: 1 } }],
  [vec(400, 240), 17, vec(100, 240), { out: {} }],
]) {
  const expected = run(movement, 'archive', 'clampPos', args, 13);
  const actual = run(movement, 'world', 'clampPos', args, 13);
  assert.deepEqual(actual, expected); assert.equal(actual.dispatches, 0); totalPairs++;
}
let explicitExpected: unknown;
// Caller's explicit draw must not consult ambient Math.random. Native sampling
// arity, order and the next supplied draw agree through each entry point.
for (const mode of ['archive', 'world', 'local'] as const) {
  prepare(fixtures[2]); const oldRandom = Math.random; const rng = mulberry32(8123);
  const calls: number[][] = []; const draw = (a: number, b: number) => { calls.push([a, b]); return a + (b - a) * rng(); };
  Math.random = () => { throw new Error('unexpected ambient RNG'); };
  try {
    const value = mode === 'archive' ? archived.farPoint.call(w, 200, true, draw)
      : mode === 'world' ? w.farPoint(200, true, draw)
      : nativeFarPoint(w.nativePlacementHost(), 200, true, draw);
    const result = { value, calls, next: rng(), anchors: w.eventAnchors };
    if (mode === 'archive') explicitExpected = data(result);
    else assert.deepEqual(result, explicitExpected);
  } finally { Math.random = oldRandom; }
}

console.log(`nativeplacement PASS: ${totalPairs} archived pairs, ${totalDraws} RNG draws, ${totalCallbacks} ordered native callbacks; bounds/annexes, native shapes, tiers, pit unions, fall policy, rejected searches and movement bypass`);

// The collision fabric remains the native fabric, including oblong logs and
// satellite rocks. Compare every shape and pit callback in sequence against
// the original full clamp, independently of the World wrapper's host adapter.
const tracedNames = ['blocksMovement', 'pitRegionOf', 'hitSurfaceOf', 'pushOutOfShape',
  'regionKind', 'pitAt', 'pitSupportedAt'] as const;
const tracedDeps = { ...deps };
for (const name of tracedNames) (tracedDeps as any)[name] = (...args: any[]) => {
  tape.push([name, data(args)]); return (deps[name] as (...args: any[]) => any)(...args);
};
const tracedArchive = new Function(...Object.keys(tracedDeps), `${js}\nreturn ArchivedPlacement.prototype;`)(...Object.values(tracedDeps)) as typeof archived;
let shapePairs = 0;
for (const f of [...fixtures, longPit, cross]) for (const p of [vec(300, 240), vec(215, 240), vec(350, 242)]) {
  prepare(f);
  const expected = tracedArchive.clampPos.call(w, p, 17);
  const expectedTape = data(tape);
  prepare(f);
  const h: NativePlacementHost = w.nativePlacementHost();
  for (const name of tracedNames) (h as any)[name] = tracedDeps[name];
  const actual = nativePlacementClamp(h, p, 17);
  assert.deepEqual(actual, expected, `${f.name}: exact shape result`);
  assert.deepEqual(tape, expectedTape, `${f.name}: exact shape/pit call order and arguments`);
  shapePairs++;
}
const log = doodad('sunken_log', 210, 240, 60, { rot: .7 });
assert.equal(hitSurfaceOf(log, 'move').kind, 'rect');
let satellite: Doodad | undefined;
for (let x = 180; x < 230 && !satellite; x++) {
  const d = doodad('rock', x, 240, 65, { rot: .71 });
  const shape = hitSurfaceOf(d, 'move');
  if (shape.kind === 'multi' && shape.parts.length >= 3) satellite = d;
}
assert.ok(satellite, 'bounded real native outcrop witness');
const shape = hitSurfaceOf(satellite, 'move');
assert.equal(shape.kind, 'multi');
if (shape.kind === 'multi') for (const part of shape.parts) pair({ name: 'satellite-body', doodads: [satellite] },
  'clampPos', [vec(satellite.pos.x + part.dx, satellite.pos.y + part.dy), 15]);

// A native-feature obstacle remains visible through pointInSolid's existing
// World seam; the shared search cannot silently scan only doodad furniture.
const feature: Fixture = { name: 'native-feature-collision', setup() {
  w.massRuntime = { config: { terrain: { addressSpan: 1024 } }, walk: { at: (x: number, y: number) => ({ x, y }) },
    nativeFeatures: { obstacleAt: (at: {x:number;y:number}, margin: number) => {
      tape.push(['native-feature', data(at), margin]);
      return at.x < 350 ? { doodad: doodad('wall', at.x, at.y, 30) } : undefined;
    } } };
} };
pair(feature, 'findFreeSpot', [vec(300, 240), 17]);
pair(feature, 'farPoint', [190, true], 31);

// A real Actor's tether still takes the general movement branch and produces
// the original safe landing. No shared-placement host is constructed there.
let tetherExpected: unknown;
for (const mode of ['archive', 'world'] as const) {
  prepare(movement); w.player.pos = vec(105, 105); w.player.tier = 0;
  bindMovementTether(w.player, { length: 80 }, vec(105, 105));
  const host = w.nativePlacementHost;
  w.nativePlacementHost = () => { throw new Error('general mover entered placement kernel'); };
  try {
    const result = mode === 'archive'
      ? archived.clampPos.call(w, vec(500, 240), 17, undefined, { mover: w.player })
      : w.clampPos(vec(500, 240), 17, undefined, { mover: w.player });
    const got = { result, tether: data(w.player.movementTether), tape: data(tape) };
    if (mode === 'archive') tetherExpected = got; else assert.deepEqual(got, tetherExpected);
    assert.ok(dist(result, vec(105, 105)) <= 80.001);
  } finally { w.nativePlacementHost = host; w.player.movementTether = undefined; }
}
console.log(`nativeplacement shape/general PASS: ${shapePairs} exact native shape/pit tapes, satellite lobes, native-feature collision, actual Actor tether; total ${totalPairs} paired entries`);
// Getter-bearing point/option inputs must preserve the unchanged general
// clamp's read order. The fast path inspects descriptors without executing
// getters; ordinary own data coordinates/options still dispatch above.
let accessorPairs = 0;
type AccessorFixture = { name: string; make(reads: string[]): { p: {x:number;y:number}; opts?: any; from?: {x:number;y:number} } };
const accessorFixtures: AccessorFixture[] = [
  { name: 'point getter changes tier before native tier read', make(reads) {
    const opts = {tier:0}; return {opts,p:{get x(){reads.push('x');opts.tier=1;return 300;},y:240}};
  } },
  { name: 'all option accessors', make(reads) { return {p:vec(300,240),opts:{
    get mover(){reads.push('mover');return {tier:0};},get tier(){reads.push('tier');return 0;},
    get disp(){reads.push('disp');return undefined;},get out(){reads.push('out');return undefined;}}};
  } },
  { name: 'undefined option accessor still general', make(reads) { return {p:vec(300,240),opts:{
    get mover(){reads.push('mover');return undefined;},tier:1}};
  } },
  { name: 'inherited tier getter', make(reads) {return {p:vec(300,240),opts:Object.create({
    get tier(){reads.push('inherited-tier');return 1;}})};
  } },
  { name: 'inherited mover data', make() {return {p:vec(300,240),opts:Object.create({mover:{tier:1}})};} },
  { name: 'inherited coordinate getter', make(reads) {return {p:Object.assign(Object.create({
    get x(){reads.push('inherited-x');return 300;}}),{y:240}),opts:{tier:1}};
  } },
  { name: 'tier throws after bounds read', make(reads) {return {p:{get x(){reads.push('x');return 300;},y:240},opts:{
    get tier(){reads.push('tier');throw Error('native tier getter');}}};
  } },
  { name: 'from bypass keeps option getter count', make(reads) {return {p:vec(300,240),from:vec(100,100),opts:{
    get mover(){reads.push('mover');return undefined;},get tier(){reads.push('tier');return 0;}}};
  } },
];
for (const fixture of accessorFixtures) {
  let expected: unknown;
  for (const mode of ['archive','world'] as const) {
    prepare({name:fixture.name,doodads:[doodad('wall',300,240,60,{tier:1})]});
    const reads:string[]=[], input=fixture.make(reads), oldHost=w.nativePlacementHost;
    w.nativePlacementHost=()=>{throw Error('accessor input entered fast placement');};
    let result:unknown,error:unknown;
    try { result=(mode==='archive'?archived.clampPos:originalWorld.clampPos).call(w,input.p,15,input.from,input.opts); }
    catch(e) {error=String(e);}
    finally {w.nativePlacementHost=oldHost;}
    const outcome={result,error,reads,tape:data(tape)};
    if(mode==='archive')expected=outcome;else assert.deepEqual(outcome,expected,fixture.name);
    assert.notEqual(error,'Error: accessor input entered fast placement');
    if(fixture===accessorFixtures[0])assert.deepEqual(result,vec(375,240));
  }
  accessorPairs++;
}
// Even ordinary option objects may inherit a relevant accessor from the
// standard prototype. The dispatcher must not evaluate or ignore it early.
const inheritedTier=Object.getOwnPropertyDescriptor(Object.prototype,'tier');
try {
  let reads=0;
  Object.defineProperty(Object.prototype,'tier',{configurable:true,get(){reads++;return 1;}});
  let expected:unknown;
  for(const mode of ['archive','world'] as const) {
    prepare({name:'prototype option tier',doodads:[doodad('wall',300,240,60,{tier:1})]});
    reads=0;const oldHost=w.nativePlacementHost;
    w.nativePlacementHost=()=>{throw Error('inherited option entered fast placement');};
    try {
      const result=(mode==='archive'?archived.clampPos:originalWorld.clampPos).call(w,vec(300,240),15,undefined,{});
      const outcome={result,reads,tape:data(tape)};if(mode==='archive')expected=outcome;else assert.deepEqual(outcome,expected);
    } finally {w.nativePlacementHost=oldHost;}
  }
  accessorPairs++;
} finally {
  if(inheritedTier)Object.defineProperty(Object.prototype,'tier',inheritedTier);else delete (Object.prototype as {tier?:number}).tier;
}
console.log(`nativeplacement accessor PASS: ${accessorPairs} exact general-path read/result pairs; ordinary-data fast path retained`);
