import {chance, clamp} from '../core/math';
import {baselineStatusDps} from './status';
import {isDormant} from './ai';
import {isDoodadGround} from '../world/regions';
import {CREEP_CFG, CreepField, type FrontConsumeRow} from './creep';
import {type RadianceCond} from '../world/radiance';
const GROUND_KINDS={includes:(kind:string)=>isDoodadGround(kind)};
/** THE SEEDED-FALLBACK salt (World.seededDraw → farPoint's `draw`). A load-time
 *  placement that holds a seeded stream must not fall back to the TRUE die when
 *  the POI pool runs dry, or its ground stops being a function of the zone seed
 *  — the gap that let a remembered survey spire re-place itself somewhere new
 *  while its banked charge (restored by INDEX) followed the old ordinal. Its own
 *  salt, like SCENERY_CFG's: the fallback draws from a DEDICATED sub-stream and
 *  never from the caller's rng, so making a lane reproducible shifts no other
 *  lane's draw order. */
const FARPOINT_SALT = 0x7a4f0d;
import { Rng } from '../core/rng';
import { insideBounds } from '../world/shape';
import type { World } from './world';
import { nativeFarPoint, nativeFarthestStand, nativeFindFreeSpot, nativePlacementClamp, nativePlacementDataInputs, type NativePlacementHost } from './nativePlacement';
import { buildNativeConvexNav, paintNativeNavGrounds, stampNativeNavSurface, type NativeNavigationHost } from './nativeNavigation';
import { dist, rand, vec, type Vec2 } from '../core/math';
import { Actor } from './actor';
import { blocksMovement, doodadRuleOf, hitSurfaceOf, normalizeDoodadBound, pitRegionOf, type Doodad, type PlacedStructure } from './levelgen';
import { anyPitNear, PIT_CFG, pitAt, pitSupportedAt, type PitSurface } from './pitfall';
import { makeTierNav } from './tiers';
import { pushOutOfShape, shapeContains } from './shapes';
import { type WalkField } from '../world/walk';
import { GridWalkField, WALK_CFG } from '../world/gridWalk';
import { regionKind, LIQUID_CFG } from '../world/regions';
import { doodadFamilyBits, doodadFamilyIndex, doodadFamilyEpoch, doodadFamilyCount } from './doodadFamilies';
import { lintTrackSpec, placeTrack, TRACK_CFG, type PlacedTrack, type TrackSpec } from './tracks';
import { lintTrapworkSpec, trapAnchor, TRAPWORK_CFG, type PlacedTrapwork, type TrapworkSpec } from './trapworks';
import type { RegionKind } from '../world/regions';
import { activeAnnexKey, clampToBounds } from '../world/shape';
import { movementTetherLimit, movementTetherDistance } from './movementTether';
type ClampOpts=NonNullable<Parameters<World['clampPos']>[3]>;
export interface NativeSceneGeometryHost {
 frontSpawned:World['frontSpawned'];
 frontRiders:World['frontRiders'];
 evaporating:World['evaporating'];
 time:World['time'];
 seats:World['seats'];
 installCreepFront:World['installCreepFront'];
 frontConsume:World['frontConsume'];
 seatOf:World['seatOf'];
 drainSurvival:World['drainSurvival'];
 radianceCondHeld:World['radianceCondHeld'];
 createMonster:World['createMonster'];
 descentSite:World['descentSite'];
 fractureRifts:World['fractureRifts'];
 necropolisPortals:World['necropolisPortals'];
 crusadePortals:World['crusadePortals'];
 demonPortals:World['demonPortals'];
 readonly minPortalSeparation:number;
 exits:World['exits'];
 caveEntrances:World['caveEntrances'];
 breachPos:World['breachPos'];
 waypointPos:World['waypointPos'];
 dimGates:World['dimGates'];
 farPointDraws:World['farPointDraws'];
 currentZoneSeed:World['currentZoneSeed'];
 fog:World['fog'];
 readonly doorSpots:World['doorSpots'];
 readonly clearOfDoors:World['clearOfDoors'];
 readonly clearTransitSpot:World['clearTransitSpot'];
 readonly interactSpot:World['interactSpot'];
 readonly seededDraw:World['seededDraw'];
 readonly opaqueAt:World['opaqueAt'];
  doodadIdx:World['doodadIdx'];
  doodadIdxArr:World['doodadIdxArr'];
  doodads:World['doodads'];
  doodadIdxLen:World['doodadIdxLen'];
  doodadIdxRev:World['doodadIdxRev'];
  doodadsRev:World['doodadsRev'];
  famEpoch:World['famEpoch'];
  famRevs:World['famRevs'];
  walk:World['walk'];
  zone:World['zone'];
  tierViews:World['tierViews'];
  arena:World['arena'];
  convexNav:World['convexNav'];
  convexNavKey:World['convexNavKey'];
  tierNavs:World['tierNavs'];
  pitsCache:World['pitsCache'];
  collapse:World['collapse'];
  flux:World['flux'];
  conjured:World['conjured'];
  bridges:World['bridges'];
  massRuntime:World['massRuntime'];
  structures:World['structures'];
  actors:World['actors'];
  flashes:World['flashes'];
  tracks:World['tracks'];
  contactHazards:World['contactHazards'];
  trapworks:World['trapworks'];
  arenaHull:World['arenaHull'];
  grounds:World['grounds'];
  player:World['player'];
  zoneEntry:World['zoneEntry'];
  eventAnchors:World['eventAnchors'];
  readonly ensureDoodadIdx:World['ensureDoodadIdx'];
  readonly syncFamRevs:World['syncFamRevs'];
  readonly tierPathField:World['tierPathField'];
  readonly doodadFamilyRev:World['doodadFamilyRev'];
  readonly buildConvexNav:World['buildConvexNav'];
  readonly nativeSettlementGrid:World['nativeSettlementGrid'];
  readonly groundInsured:World['groundInsured'];
  readonly walkSweep:World['walkSweep'];
  readonly pitSweep:World['pitSweep'];
  readonly nativePlacementHost:World['nativePlacementHost'];
  readonly doodadsAt:World['doodadsAt'];
  readonly walkResolve:World['walkResolve'];
  readonly zonePits:World['zonePits'];
  readonly pitHomeKinds:World['pitHomeKinds'];
  readonly pitResolve:World['pitResolve'];
  readonly nativeGridAt:World['nativeGridAt'];
  readonly text:World['text'];
  readonly markDoodadsChanged:World['markDoodadsChanged'];
  readonly nativeNavigationHost:World['nativeNavigationHost'];
  readonly doodadsNear:World['doodadsNear'];
  readonly pathField:World['pathField'];
  readonly clampPos:World['clampPos'];
  readonly pointInSolid:World['pointInSolid'];
  readonly groundAt:World['groundAt'];
  readonly roofedStructureAt:World['roofedStructureAt'];
  readonly setDoorState:World['setDoorState'];
  readonly addTrack:World['addTrack'];
  readonly collectContactHazards:World['collectContactHazards'];
  readonly addTrapwork:World['addTrapwork'];
  readonly paintNavGrounds:World['paintNavGrounds'];
  readonly stampNavSurface:World['stampNavSurface'];
  readonly farPoint:World['farPoint'];
  readonly farthestStand:World['farthestStand'];
  readonly findFreeSpot:World['findFreeSpot'];
 readonly navigationPad:number; readonly eventSpacing:number;
 refreshMovementTether(a:Actor):import('./movementTether').MovementTetherState|undefined;
}
export function nativeSceneDoodadsAt(host:NativeSceneGeometryHost, x: number, y: number): readonly Doodad[] {
    host.ensureDoodadIdx();
    return host.doodadIdx.at(x, y);
  }

export function nativeSceneDoodadsNear(host:NativeSceneGeometryHost, x: number, y: number, reach: number): readonly Doodad[] {
    host.ensureDoodadIdx();
    return host.doodadIdx.near(x, y, reach);
  }

export function nativeSceneEnsureDoodadIdx(host:NativeSceneGeometryHost): void {
    if (host.doodadIdxArr !== host.doodads || host.doodadIdxLen !== host.doodads.length
      || host.doodadIdxRev !== host.doodadsRev) {
      // Broad-phase bound refresh (hit-surface fabric): a doodad whose true
      // surface pokes past its visual radius (door slabs) must insert wider,
      // or corner queries would miss it. Stamped HERE — the one chokepoint
      // every doodad list change already flows through — so gen-time,
      // package, terraform, and snapshot-applied doodads all self-heal.
      for (const d of host.doodads) normalizeDoodadBound(d);
      host.doodadIdx.build(host.doodads);
      host.doodadIdxArr = host.doodads;
      host.doodadIdxLen = host.doodads.length;
      host.doodadIdxRev = host.doodadsRev;
    }
  }

export function nativeSceneSyncFamRevs(host:NativeSceneGeometryHost): void {
    if (host.famEpoch !== doodadFamilyEpoch()) {
      host.famEpoch = doodadFamilyEpoch();
      // Seed every counter at the global rev: ≥ any value a consumer has
      // stored (families bump at most once per markDoodadsChanged), so a
      // late-registered family forces one honest resync, never staleness.
      host.famRevs = new Array(doodadFamilyCount()).fill(host.doodadsRev);
    }
  }

export function nativeSceneMarkDoodadsChanged(host:NativeSceneGeometryHost, touched?: Doodad | readonly Doodad[]): void {
    host.doodadsRev++;
    host.syncFamRevs();
    if (!touched) {
      for (let i = 0; i < host.famRevs.length; i++) host.famRevs[i]++;
      return;
    }
    const list = Array.isArray(touched) ? touched as readonly Doodad[] : [touched as Doodad];
    let bits = 0;
    for (const d of list) bits |= doodadFamilyBits(d.kind);
    for (let i = 0; i < host.famRevs.length; i++) if (bits & (1 << i)) host.famRevs[i]++;
  }

export function nativeSceneDoodadFamilyRev(host:NativeSceneGeometryHost, id: string): number {
    host.syncFamRevs();
    const at = doodadFamilyIndex(id);
    return at >= 0 ? host.famRevs[at] : host.doodadsRev;
  }

export function nativeScenePathField(host:NativeSceneGeometryHost, story = 0): WalkField | null {
    if (host.walk) {
      if (!host.walk.pathStep) return null;
      if (story >= 1 && host.zone.tiers && host.tierViews) return host.tierPathField(story);
      return host.walk;
    }
    if (host.arena.boundless) return null;
    // Convex zones carry no tier stack (tierViews ride host.walk), so every
    // story normalizes onto the ONE nav below; the per-story fields cache in
    // tierNavs — a Map keyed BY story — never through this single-slot key,
    // so two stories can't clobber (or serve) each other here. A composite
    // zone's key carries the ACTIVE-union fingerprint, so an annex reveal
    // re-rakes the grid on its next ask (piece-less zones append nothing —
    // the standing key strings never move).
    const ak = host.arena.pieces?.length ? '|ax:' + activeAnnexKey(host.arena) : '';
    const key = host.zone.id + ':' + host.doodads.length + ':' + host.doodadFamilyRev('nav-block') + ak;
    if (!host.convexNav || host.convexNavKey !== key) {
      host.convexNav = host.buildConvexNav();
      host.convexNavKey = key;
    }
    return host.convexNav;
  }

export function nativeSceneTierPathField(host:NativeSceneGeometryHost, story: number): WalkField {
    const base = host.nativeSettlementGrid();
    if (!base) return host.walk!;
    const t = Math.max(1, Math.min(story, host.tierViews!.length - 1));
    const hit = host.tierNavs.get(t);
    if (hit && hit.walk === base && hit.v === base.version) return hit.g;
    const g = makeTierNav(base, t);
    host.tierNavs.set(t, { g, walk: base, v: base.version });
    return g;
  }

export function nativeSceneZonePits(host:NativeSceneGeometryHost): readonly PitSurface[] {
    const c = host.pitsCache;
    if (c.arr !== host.doodads || c.len !== host.doodads.length || c.rev !== host.doodadsRev) {
      c.arr = host.doodads; c.len = host.doodads.length; c.rev = host.doodadsRev;
      c.list = [];
      for (const d of host.doodads) {
        if (d.gone) continue;
        const region = pitRegionOf(d);
        if (region) c.list.push({ x: d.pos.x, y: d.pos.y, r: d.radius, kind: d.kind, region });
      }
    }
    return c.list;
  }

export function nativeScenePitHomeKinds(host:NativeSceneGeometryHost, a: Actor | undefined, pits: readonly PitSurface[]): readonly string[] | null {
    if (!a) return null;
    let home: string[] | null = null;
    for (const p of pits) {
      if (home?.includes(p.kind)) continue;
      if (host.groundInsured(a, p.kind)) (home ??= []).push(p.kind);
    }
    return home;
  }

export function nativeSceneGroundInsured(host:NativeSceneGeometryHost, a: Actor, kindId: string): boolean {
    return a.flying || a.habitat?.kind === kindId || a.immuneGround?.includes(kindId) || false;
  }

export function nativeSceneWalkResolve(host:NativeSceneGeometryHost, from: Vec2, to: Vec2, crossFall = false, grasp = 0): Vec2 {
    const wf = host.walk!;
    // VOID-OWNED GROUND: an actor standing over ANY vertical void — a cell
    // that just MELTED under them (mid-teeter), a lip they're GRASPING
    // (WALK_CFG.ledgeGrasp), or open sky a lapsed cloudform stranded them
    // on — is the FALL DOORS' business, not the rescue's. The off-mesh
    // rescue snap must not fire (it read as a free teleport to the nearest
    // standing cloud and made the fall unreachable in real play): they hold
    // where the ground was, input finds no purchase, and the coyote grace /
    // boundary door decide. Genuine off-mesh corruption (walls) keeps the
    // rescue.
    const fromVoid = (): boolean => {
      const rk = regionKind(wf.regionAt?.(from.x, from.y));
      return !!rk && !rk.walkable && !rk.blocks;
    };
    const start = wf.isWalkable(from.x, from.y) ? from
      : (host.collapse?.voidAt(from.x, from.y) || host.flux?.voidAt(from.x, from.y)
        || host.conjured?.voidAt(from.x, from.y) || fromVoid()
        || (grasp > 0 && (wf.supportedAt?.(from.x, from.y, grasp) ?? false))) ? from
      : wf.snapToWalkable(from);
    const full = host.walkSweep(start, to, crossFall, grasp);
    if (full.x === to.x && full.y === to.y) return full;
    // Blocked: also try single-axis slides so a diagonal-into-wall slides along the
    // open axis. Pick whichever of {full, x-only, y-only} advanced furthest — each
    // is a STRAIGHT sweep from start, so the chosen move never cuts a corner / crosses
    // a wall (we deliberately don't chain H-then-V, which could clip the corner).
    const xOnly = host.walkSweep(start, vec(to.x, start.y), crossFall, grasp);
    const yOnly = host.walkSweep(start, vec(start.x, to.y), crossFall, grasp);
    const d2 = (p: Vec2): number => (p.x - start.x) ** 2 + (p.y - start.y) ** 2;
    let best = full;
    if (d2(xOnly) > d2(best)) best = xOnly;
    if (d2(yOnly) > d2(best)) best = yOnly;
    return best;
  }

export function nativeSceneWalkSweep(host:NativeSceneGeometryHost, start: Vec2, end: Vec2, crossFall = false, grasp = 0): Vec2 {
    const wf = host.walk!;
    const dx = end.x - start.x, dy = end.y - start.y;
    const len = Math.hypot(dx, dy);
    if (len < 0.0001) return vec(start.x, start.y);
    const passable = (px: number, py: number): boolean => {
      if (wf.isWalkable(px, py)) return true;
      const rk = regionKind(wf.regionAt?.(px, py));
      if (!rk || rk.walkable || rk.blocks) return false; // walls stop at the face
      if (crossFall) return true; // fall-ignoring move sails the gap
      return grasp > 0 && (wf.supportedAt?.(px, py, grasp) ?? false);
    };
    const gran = (wf.cellSize ?? 24) * 0.34;
    const steps = Math.max(1, Math.ceil(len / gran));
    let lastT = 0;
    let blockedT = -1;
    for (let i = 1; i <= steps; i++) {
      const t = i / steps;
      if (!passable(start.x + dx * t, start.y + dy * t)) { blockedT = t; break; }
      lastT = t;
    }
    if (blockedT < 0) return vec(start.x + dx * lastT, start.y + dy * lastT);
    // CONTACT REFINE: bisect between the last clear sample and the blocked one
    // so the stop point sits AT the wall face instead of on a sample-grid
    // multiple. Without this the stop quantizes differently every frame (the
    // sample spacing shifts with per-frame move length) and a body pressed
    // against a wall visibly VIBRATES on and off it.
    let lo = lastT, hi = blockedT;
    for (let k = 0; k < 4; k++) {
      const mid = (lo + hi) / 2;
      if (passable(start.x + dx * mid, start.y + dy * mid)) lo = mid; else hi = mid;
    }
    return vec(start.x + dx * lo, start.y + dy * lo);
  }

export function nativeScenePitResolve(host:NativeSceneGeometryHost, pits: readonly PitSurface[], from: Vec2, to: Vec2,
    grasp: number, home: readonly string[] | null): Vec2 {
    if (!pitSupportedAt(pits, host.bridges, from.x, from.y, grasp, home)) return vec(from.x, from.y);
    const full = host.pitSweep(pits, from, to, grasp, home);
    if (full.x === to.x && full.y === to.y) return full;
    const xOnly = host.pitSweep(pits, from, vec(to.x, from.y), grasp, home);
    const yOnly = host.pitSweep(pits, from, vec(from.x, to.y), grasp, home);
    const d2 = (p: Vec2): number => (p.x - from.x) ** 2 + (p.y - from.y) ** 2;
    let best = full;
    if (d2(xOnly) > d2(best)) best = xOnly;
    if (d2(yOnly) > d2(best)) best = yOnly;
    return best;
  }

export function nativeScenePitSweep(host:NativeSceneGeometryHost, pits: readonly PitSurface[], start: Vec2, end: Vec2,
    grasp: number, home: readonly string[] | null): Vec2 {
    const dx = end.x - start.x, dy = end.y - start.y;
    const len = Math.hypot(dx, dy);
    if (len < 0.0001) return vec(start.x, start.y);
    const passable = (px: number, py: number): boolean =>
      pitSupportedAt(pits, host.bridges, px, py, grasp, home);
    const steps = Math.max(1, Math.ceil(len / PIT_CFG.sweepGran));
    let lastT = 0;
    let blockedT = -1;
    for (let i = 1; i <= steps; i++) {
      const t = i / steps;
      if (!passable(start.x + dx * t, start.y + dy * t)) { blockedT = t; break; }
      lastT = t;
    }
    if (blockedT < 0) return vec(start.x + dx * lastT, start.y + dy * lastT);
    let lo = lastT, hi = blockedT;
    for (let k = 0; k < 4; k++) {
      const mid = (lo + hi) / 2;
      if (passable(start.x + dx * mid, start.y + dy * mid)) lo = mid; else hi = mid;
    }
    return vec(start.x + dx * lo, start.y + dy * lo);
  }

export function nativeSceneClampPos(host:NativeSceneGeometryHost, p: Vec2, radius: number, from?: Vec2, opts?: ClampOpts): Vec2 {
    if (from === undefined && nativePlacementDataInputs(p, opts))
      return nativePlacementClamp(host.nativePlacementHost(), p, radius, opts?.tier);
    const movementTether = opts?.mover instanceof Actor ? host.refreshMovementTether(opts.mover) : undefined;
    if (movementTether) p = movementTetherLimit(movementTether, p);
    const b0 = clampToBounds(p, radius, host.arena);
    const out = vec(b0.x, b0.y);
    // THE TIER FABRIC: the mover's layer, read once — gates the doodad
    // collision below (a street lamp never blocks the duct runner beneath
    // it) and the walk-confine swap further down.
    const mvTier = opts?.tier ?? (opts?.mover as { tier?: number } | undefined)?.tier ?? 0;
    // A wall-phasing displacement (ignoreConfine) stays in-bounds but skips doodad
    // + walk confinement (a flicker/teleport lands past rocks, walls, the void).
    if (!opts?.disp?.ignoreConfine) {
    // Iterate: escaping one circle of a blob can land inside its neighbor.
    // Candidates come from the spatial index, re-queried per pass (a push can
    // slide the point toward discs the first bucket didn't see).
    for (let pass = 0; pass < 3; pass++) {
      let moved = false;
      for (const o of host.doodadsAt(out.x, out.y)) {
        if ((o.tier ?? 0) !== mvTier) continue; // its layer's furniture only
        if (!blocksMovement(o)) continue;
        // THE PITFALL FABRIC (engine/pitfall.ts): a fall-able pit is a DROP,
        // not a wall — the push loop leaves it whole and the pit confine
        // below owns the crossing (grasp the lip, arrest at support loss,
        // the region's boundary policy decides what the fall means). Gen
        // and pathing still read blocksMovement: only the mover knows the
        // difference between stone and a long way down.
        if (pitRegionOf(o)) continue;
        // The hit-surface fabric: trunks (discs) keep the classic radial
        // slide byte-for-byte; oblong surfaces (door slabs, benches) push
        // out through their true face — walking into a door slides you
        // along the plank, not around an invisible circle.
        const push = pushOutOfShape(hitSurfaceOf(o, 'move'), o.pos.x, o.pos.y, out.x, out.y, radius);
        if (!push) continue;
        if (o.kind === 'chasm' && host.bridges.some(b => dist(out, b.pos) <= b.radius)) continue;
        moved = true;
        out.x = push.x; out.y = push.y;
        // CLASSIFY (opt-in): record what stopped us, for the collision-proc
        // seam (fall-able pits never reach here — the pit confine classifies
        // their arrests as 'void' with the pit's own region).
        if (opts?.out) {
          opts.out.hit = 'wall'; opts.out.at = vec(o.pos.x, o.pos.y);
          opts.out.blockedKind = o.kind;
          opts.out.normal = { x: push.nx, y: push.ny };
        }
      }
      if (!moved) break;
    }
    }
    const b1 = clampToBounds(out, radius, host.arena);
    out.x = b1.x; out.y = b1.y;
    // THE TIER SWAP (engine/tiers.ts): an elevated mover confines against
    // ITS story's floor — that story's view is scoped over host.walk for
    // exactly the confine block below (synchronous, never re-entrant:
    // walkResolve/walkSweep read host.walk, so the swap reaches every
    // sample without threading a param through four layers). Restored in
    // the finally. A stale tier beyond the zone's stack clamps to the top.
    // Gated on zone.tiers (the arrivalStory law's second half): every tier-
    // region painter stamps def.tiers, so a zone WITHOUT it owns no story
    // floor anywhere — tierViews[1] there is the EMPTY mask, and swapping to
    // it froze any body wearing a stale layer index solid. A stale tier in
    // a storyless zone now walks the base grid instead.
    const moverTier = mvTier;
    let tierSwap: WalkField | null = null;
    if (moverTier >= 1 && host.zone.tiers && host.tierViews && host.walk) {
      const view = host.tierViews[Math.min(moverTier, host.tierViews.length - 1)];
      if (view) { tierSwap = host.walk; host.walk = view as unknown as GridWalkField; }
    }
    try {
    // NON-CONVEX zones (Phase 2/3): keep the actor on walkable ground, but ASK THE
    // REGION POLICY (not a bare bool) — walls confine, void is enter-then-resolve,
    // and a displacement may opt to cross. NULL walk (plains + existing) skips all.
    if (host.walk && !opts?.disp?.ignoreConfine) {
      const disp = opts?.disp;
      const destKind = host.walk.regionAt?.(out.x, out.y) ?? (host.walk.isWalkable(out.x, out.y) ? 'ground' : 'wall');
      const ddef = regionKind(destKind);
      const isFall = !!ddef && !ddef.walkable && !ddef.blocks; // void-like: ENTER then resolve
      // A fall region may be crossed harmlessly by a fall-ignoring move or a data
      // crossing exception (a bridge over grid-void); walls only by ignoreConfine (above).
      const crossable = isFall && (!!disp?.ignoreFall || (ddef!.crossableBy ? ddef!.crossableBy(disp ?? {}) : false));
      if (crossable) {
        // pass through (out stays the raw destination)
      } else if (from) {
        // Swept confine along from→out (no wall-tunnel, no wrong-side snap), then
        // classify what we were confined out of — the collision-proc / fall seam.
        // A fall-ignoring move crosses void bands to far walkable ground (walls still stop it).
        const desired = vec(out.x, out.y);
        const r = host.walkResolve(from, out, !!disp?.ignoreFall, radius * WALK_CFG.ledgeGrasp);
        out.x = r.x; out.y = r.y;
        if (opts?.out && (desired.x !== r.x || desired.y !== r.y)) {
          // Probe the cell JUST BEYOND the confined point toward the goal — that's
          // the actual blocker (NOT regionAt(desired), which a strong overshoot lands
          // past, on the far walkable side, mis-reporting a void as a wall).
          const bx = desired.x - r.x, by = desired.y - r.y, bl = Math.hypot(bx, by) || 1;
          const cs = host.walk.cellSize ?? 24;
          const bk = host.walk.regionAt?.(r.x + (bx / bl) * cs, r.y + (by / bl) * cs) ?? 'wall';
          const bdef = regionKind(bk);
          opts.out.hit = bdef && !bdef.walkable && !bdef.blocks ? 'void' : 'wall';
          opts.out.at = desired;
          opts.out.blockedKind = bk;
        }
      } else if (!host.walk.isWalkable(out.x, out.y)) {
        // A placement/teleport (no origin): nearest walkable.
        const s = host.walk.snapToWalkable(out);
        out.x = s.x; out.y = s.y;
      }
    }
    } finally { if (tierSwap) host.walk = tierSwap; } // the tier swap ends with the walk confine
    // THE PITFALL CONFINE (the pitfall fabric, engine/pitfall.ts): fall-able
    // pit doodads are DROPS, not walls. The sweep advances while the body's
    // grasp disc still overlaps standing ground or a spanning deck — the
    // aetherial cloud-lip law in disc space, drawn == tested against the
    // chasmPit painter's blob union — and slides along rims exactly as the
    // walk confine slides along walls. An arrest past all support classifies
    // 'void' carrying the pit's own REGION, so the boundary policy (or the
    // zone's theme.pitfall) decides what the fall MEANS. Fall-ignoring
    // displacements (fliers, levitators, blinks) sail across; a body HOME in
    // a pit's kind (the insurance trio: wings / habitat / immune ground)
    // walks it like floor. Zones without pits pay one empty-list check.
    {
      const pits = host.zonePits();
      // Elevated movers pass over pit mouths (a deck or bench spans the
      // world's floor features — the rim fall is their only way down).
      if (pits.length && moverTier === 0 && !opts?.disp?.ignoreConfine && !opts?.disp?.ignoreFall) {
        const grasp = radius * WALK_CFG.ledgeGrasp;
        const home = host.pitHomeKinds(opts?.mover, pits);
        if (from) {
          if (anyPitNear(pits, from.x, from.y, out.x, out.y, radius + PIT_CFG.sweepGran)) {
            const desired = vec(out.x, out.y);
            const r = host.pitResolve(pits, from, out, grasp, home);
            out.x = r.x; out.y = r.y;
            if (opts?.out && (desired.x !== r.x || desired.y !== r.y)) {
              // The blocker is the pit just past the confined point toward
              // the goal (the walk confine's probe-beyond discipline).
              const bx = desired.x - r.x, by = desired.y - r.y, bl = Math.hypot(bx, by) || 1;
              const hitPit = pitAt(pits, host.bridges,
                r.x + (bx / bl) * PIT_CFG.sweepGran, r.y + (by / bl) * PIT_CFG.sweepGran, home)
                ?? pitAt(pits, host.bridges, desired.x, desired.y, home);
              if (hitPit) {
                opts.out.hit = 'void';
                opts.out.at = desired;
                opts.out.blockedKind = hitPit.region;
              }
            }
          }
        } else if (!pitSupportedAt(pits, host.bridges, out.x, out.y, grasp, home)) {
          // A placement/teleport (no origin) may not land IN a pit: march a
          // FIXED ray from the covering disc's heart until the whole UNION
          // lets go (a radial per-disc push ping-pongs inside a blob's
          // waist — the ray walks straight out of a chain of wells).
          const over0 = pitAt(pits, host.bridges, out.x, out.y, home);
          if (over0) {
            let dx = out.x - over0.x, dy = out.y - over0.y;
            const dl = Math.hypot(dx, dy);
            if (dl < 0.001) { dx = 1; dy = 0; } else { dx /= dl; dy /= dl; }
            let px = over0.x + dx * (over0.r + radius);
            let py = over0.y + dy * (over0.r + radius);
            for (let s = 0; s < 64 && pitAt(pits, host.bridges, px, py, home); s++) {
              px += dx * PIT_CFG.sweepGran; py += dy * PIT_CFG.sweepGran;
            }
            out.x = px; out.y = py;
          }
        }
      }
    }
    // Terrain may slide a legal destination beyond the cord. Refuse that
    // step instead of projecting the terrain-resolved body INTO a wall.
    if (movementTether && movementTetherDistance(movementTether, out) > movementTether.spec.length + 0.001) {
      // A moving anchor can leave NO legal point on this side of a wall.
      // Break that cord instead of teleporting a body through solid terrain.
      if (movementTetherDistance(movementTether, movementTether.safe) > movementTether.spec.length) {
        movementTether.released = true; movementTether.returning = false;
        return out;
      }
      return { ...movementTether.safe };
    }
    return out;
  }

export function nativeScenePointInSolid(host:NativeSceneGeometryHost, x: number, y: number, margin = 0, tier = 0): Doodad | null {
    if(tier===0 && host.massRuntime?.nativeFeatures
      && Math.max(Math.abs(x),Math.abs(y))<host.massRuntime.config.terrain.addressSpan*4095){
      const native=host.massRuntime.nativeFeatures.obstacleAt(host.massRuntime.walk.at(x,y),margin);
      if(native)return native.doodad;
    }
    for (const o of host.doodadsAt(x, y)) {
      if ((o.tier ?? 0) !== tier) continue; // its layer's solids only
      if (!blocksMovement(o)) continue;
      // The TRUNK (or the true slab surface) — never the crown.
      if (!shapeContains(hitSurfaceOf(o, 'move'), o.pos.x, o.pos.y, x, y, margin)) continue;
      if (o.kind === 'chasm' && host.bridges.some(b => dist(vec(x, y), b.pos) <= b.radius)) continue;
      return o;
    }
    return null;
  }

export function nativeSceneGroundAt(host:NativeSceneGeometryHost, p: Vec2, tier = 0): { kind: string; deep: boolean } | null {
    if (host.bridges.some(b => dist(p, b.pos) <= b.radius)) return null;
    // THE TIER FABRIC: ground belongs to its LAYER — a web laid on the
    // street cannot snare a body running the duct beneath it (and a duct's
    // own filth never wets the street). Untiered zones carry all-zero tiers,
    // so the compare is free everywhere else.
    const wantTier = tier;
    // WATER DEPTH is BODY-aware, not per-stamp: deep = penetrating past the
    // configured inset of ANY covering non-ford disc. A lake laid down as many
    // overlapping discs reads as one contiguous body — the seam between two
    // discs is as deep as their centers (it used to strobe shallow↔deep per
    // disc while wading across) — while the true shore ring stays wadeable.
    // A ford disc covering the point forces wading depth outright: shallows
    // are shallow no matter how deep the channel they cross.
    let inWater = false, ford = false, pen = 0;
    // THE CAUSEWAY FOLD (regions.ts `laid`/`severity`/`overruns` — the
    // 2026-07-30 ruling): ONE data fold where a hand-priority chain used to
    // rank kinds by name. Covering discs sort into two bands by their row's
    // `laid` class, and three laws resolve the report:
    //   1. THE CAUSEWAY LAW — a BUILT surface (pavement, decking) beats any
    //      natural disc covering the same spot: pavement is never lethal.
    //      Generation already routes ways around molten ground (the way
    //      layer's yield); this read-time law covers disc-edge tangency and
    //      dynamically-laid hazards, and its promise is the player's read.
    //   2. SEVERITY WITHIN NATURE — among GROUND-laid discs the worst
    //      authored `severity` speaks: the bog outranks its own mud fringe,
    //      the melt outranks the bog (the old chain let any soft disc mute
    //      a lethal one — the bug this fold retires). Ties keep the
    //      FIRST-sensed disc (stability).
    //   3. THE OVERRUNS EXCEPTION — a deposit row wearing `overruns` (mud,
    //      sand) speaks over pavement when it WINS the natural band: a muddy
    //      road still reads as mud. Only the band's WINNER is consulted — a
    //      bog outranking the mud never inherits the mud's exception (no
    //      smuggling lane) — and the registerRegion validate net keeps every
    //      overruns row harmless by construction.
    // A `wild` disc (the overgrowth pass) has lost its worn surface: its
    // built standing is stripped and it reports at texture grade among the
    // natural band — an overgrown stretch makes no causeway promise. (That
    // demotion reproduces the old chain's registry fallback byte-for-byte:
    // wild ways have always still reported themselves when nothing else
    // covered — RULED 2026-07-31: they keep speaking. An overgrown way
    // stays readable ground; only the causeway promise is forfeit.)
    let built: string | null = null;   // first-sensed covering BUILT disc
    let nat: RegionKind | null = null; // worst-severity covering GROUND disc
    let natSev = -Infinity;
    // THE DEPTH LEDGER (2026-07-31 — the depth law, generalized off the kind
    // literal): any NATURAL row declaring standStatusDeep resolves body-aware
    // depth exactly as the water lane does — ford/pen accumulated across the
    // band LEADER's own discs (a welded body of sinks is ONE pool: the seam
    // between two discs is as deep as both say it is) — and the report
    // carries it only when that kind WINS. Scalars, not a map, losslessly: a
    // kind takes the ledger with the leadership (its own first disc is what
    // promoted it), same-kind discs feed it from either side of the take,
    // and a dethroned kind can never win the report anyway. Water keeps its
    // own accumulator lane, byte-for-byte.
    let deepKind: string | null = null;
    let deepFord = false, deepPen = 0;
    for (const d of host.doodadsAt(p.x, p.y)) {
      if ((d.tier ?? 0) !== wantTier) continue; // its layer's ground, never the other's
      const dd = dist(p, d.pos);
      if (dd > d.radius) continue;
      if (d.kind === 'water') {
        inWater = true;
        if (d.shallow) ford = true;
        else pen = Math.max(pen, d.radius - dd);
        continue;
      }
      const rk = regionKind(d.kind);
      if (!rk) continue; // registered = sensed (the registry IS the ground vocabulary)
      if ((rk.laid ?? 'ground') === 'built' && !d.wild) {
        if (!built) built = d.kind;
      } else {
        const sev = (rk.laid ?? 'ground') === 'built' ? 0 : rk.severity ?? 0;
        if (sev > natSev) {
          natSev = sev; nat = rk;
          if (rk.standStatusDeep) {
            deepKind = d.kind;
            deepFord = !!d.shallow;
            deepPen = d.shallow ? 0 : d.radius - dd;
          } else deepKind = null;
        } else if (deepKind !== null && d.kind === deepKind) {
          if (d.shallow) deepFord = true;
          else deepPen = Math.max(deepPen, d.radius - dd);
        }
      }
    }
    // The standing winner: nature beats construction only through its own
    // winner's `overruns`; construction otherwise silences the whole band.
    const winner = nat && (!built || nat.overruns)
      ? { kind: nat.id, sev: natSev }
      : built ? { kind: built, sev: 0 } : null;
    // THE WET SEAT: the water return keeps its precedence as the water row's
    // own severity — only a STRICTLY worse ground winner (the mire class and
    // up) speaks over standing water; deposits, texture and pavement all
    // defer to the wet (a flooded road reads water, exactly as it always
    // did). The lethal class sits above the seat by authored design: a
    // puddle over the melt is steam, never refuge.
    if (inWater && !(winner && winner.sev > (regionKind('water')?.severity ?? 0))) {
      return { kind: 'water', deep: !ford && pen > LIQUID_CFG.deepInset };
    }
    // A winning non-water liquid reads THE DEPTH LEDGER: deep toward its own
    // core unless a shallow disc fords it — the fused sink's promised "true
    // deep heart" finally speaks (swimming in the water that burns is on
    // you). Every other winner reads flat, as it always did.
    return winner
      ? { kind: winner.kind, deep: winner.kind === deepKind && !deepFord && deepPen > LIQUID_CFG.deepInset }
      : null;
  }

export function nativeSceneRoofedStructureAt(host:NativeSceneGeometryHost, pos: Vec2): PlacedStructure | null {
    for (const st of host.structures) {
      for (const r of st.roofs) {
        if (pos.x > r.x && pos.x < r.x + r.w && pos.y > r.y && pos.y < r.y + r.h) return st;
      }
    }
    return null;
  }

export function nativeSceneSetDoorState(host:NativeSceneGeometryHost, id: string, state: 'open' | 'broken', opts?: { silent?: boolean }): void {
    const d = host.doodads.find(x => x.door?.id === id);
    if (!d?.door) return;
    if (state === 'open' ? (d.door.open || d.door.broken) : d.door.broken) return;
    if (state === 'open') d.door.open = true;
    else { d.door.broken = true; d.door.open = true; }
    const nativeSettlementGrid = host.nativeGridAt(d.pos);
    if (nativeSettlementGrid && d.door.cells) {
      const c = d.door.cells;
      nativeSettlementGrid.fillRegion(c.x, c.y, c.x + c.w - 0.01, c.y + c.h - 0.01, 'ground');
    }
    // The breakable's guard-actor is moot once the way is open — retire it by
    // MARKING dead (no loot/credit/burst: kill() never ran for a dwell-open).
    // Never splice here: setDoorState fires from inside damage loops iterating
    // host.actors (a blast killing the door), and a splice would shift the
    // array under the iterator, silently skipping the next actor's hit. The
    // per-frame dead sweep removes the body at its safe point.
    for (const a of host.actors) {
      if (a.doorId === id) a.dead = true;
    }
    if (!opts?.silent) {
      host.text(vec(d.pos.x, d.pos.y - 24),
        state === 'broken' ? 'the door splinters!' : 'the door swings open', '#c8b47a', 13);
      host.flashes.push({ pos: vec(d.pos.x, d.pos.y), radius: d.radius + 10, color: '#c8b47a', life: 0.3, maxLife: 0.3 });
    }
  }

export function nativeSceneAddTrack(host:NativeSceneGeometryHost, spec: TrackSpec): PlacedTrack | null {
    const gripes = lintTrackSpec(spec, host.zone.id);
    if (gripes.length) { for (const g of gripes) console.warn(`[tracks] ${g}`); return null; }
    const live = host.tracks.reduce((n, t) => n + t.riders.length, 0);
    if (live + spec.riders.length > TRACK_CFG.maxRidersPerZone) {
      console.warn(`[tracks] ${host.zone.id}: rider cap ${TRACK_CFG.maxRidersPerZone} — lane refused`);
      return null;
    }
    const placed = placeTrack(spec);
    host.tracks.push(placed);
    return placed;
  }

export function nativeSceneCollectContactHazards(host:NativeSceneGeometryHost): void {
    const prior = new Map(host.contactHazards.map(c => [c.d, c.gate]));
    const groups = new Map<string, Map<number, number>>();
    for (const c of host.contactHazards) if (c.d.contactGroup) groups.set(c.d.contactGroup, c.gate);
    host.contactHazards = [];
    for (const d of host.doodads) {
      if (doodadRuleOf(d.kind).contact) {
        const gate = (d.contactGroup ? groups.get(d.contactGroup) : prior.get(d)) ?? new Map<number, number>();
        if (d.contactGroup) groups.set(d.contactGroup, gate);
        host.contactHazards.push({ d, gate });
      }
    }
  }

export function nativeSceneAddTrapwork(host:NativeSceneGeometryHost, spec: TrapworkSpec, opts?: { noTell?: boolean }): PlacedTrapwork | null {
    const gripes = lintTrapworkSpec(spec, host.zone.id);
    if (gripes.length) { for (const g of gripes) console.warn(`[trapworks] ${g}`); return null; }
    if (host.trapworks.length >= TRAPWORK_CFG.maxPerZone) {
      console.warn(`[trapworks] ${host.zone.id}: cap ${TRAPWORK_CFG.maxPerZone} — trapwork refused`);
      return null;
    }
    const id = spec.id ?? `tw_${host.trapworks.length}`;
    const placed: PlacedTrapwork = { spec, id, state: 'armed', rearmAt: Infinity, sprungAt: -1, springs: 0 };
    host.trapworks.push(placed);
    // The TELL — a plate wears a doodad at its press disc (hidden plates a
    // fainter kind; render/vis/trapLayer.ts resolves them close-up).
    // Triplines default to none (their emitter doodads are authored by gen).
    const vis = spec.visKind ?? (spec.trigger.kind === 'plate'
      ? (spec.hidden ? 'ruin_plate_hidden' : 'ruin_plate') : '');
    if (vis && !opts?.noTell) {
      const at = trapAnchor(spec.trigger);
      host.doodads.push({ pos: vec(at.x, at.y), radius: (spec.trigger.r ?? TRAPWORK_CFG.plateRadius) + 4, kind: vis } as Doodad);
      host.markDoodadsChanged();
    }
    return placed;
  }

export function nativeSceneNativeNavigationHost(host:NativeSceneGeometryHost): NativeNavigationHost {
    const world = host;
    return {
      get arena() { return world.arena; }, get arenaHull() { return world.arenaHull; },
      get doodads() { return world.doodads; }, get grounds() { return world.grounds; },
      get pad() { return host.navigationPad; }, doodadRuleOf, blocksMovement, hitSurfaceOf,
      groundAt: p => world.groundAt(p), paintNavGrounds: g => world.paintNavGrounds(g),
      stampNavSurface: (g, d) => world.stampNavSurface(g, d),
    };
  }

export function nativeSceneBuildConvexNav(host:NativeSceneGeometryHost): GridWalkField { return buildNativeConvexNav(host.nativeNavigationHost()); }

export function nativeScenePaintNavGrounds(host:NativeSceneGeometryHost, g: GridWalkField): void { paintNativeNavGrounds(host.nativeNavigationHost(), g); }

export function nativeSceneStampNavSurface(host:NativeSceneGeometryHost, g: GridWalkField, d: Doodad): void { stampNativeNavSurface(host.nativeNavigationHost(), g, d); }

export function nativeSceneNativePlacementHost(host:NativeSceneGeometryHost): NativePlacementHost {
    const world = host;
    return {
      get arena() { return world.arena; }, get walk() { return world.walk; },
      set walk(value) { world.walk = value as typeof world.walk; },
      get tierViews() { return world.tierViews; }, get zoneTiers() { return world.zone.tiers; },
      get playerPosition() { return world.player.pos; }, get zoneEntry() { return world.zoneEntry; },
      get eventAnchors() { return world.eventAnchors; }, get bridges() { return world.bridges; },
      config: { get eventSpacing() { return host.eventSpacing; }, get ledgeGrasp() { return WALK_CFG.ledgeGrasp; },
        get pitSweepGran() { return PIT_CFG.sweepGran; } },
      rand, isGridWalk: (walk): walk is GridWalkField => walk instanceof GridWalkField,
      doodadsAt: (x, y) => world.doodadsAt(x, y), pointInSolid: (...args) => world.pointInSolid(...args),
      clampPos: (...args) => world.clampPos(...args), farthestStand: (radius, reachable) => world.farthestStand(radius, reachable),
      blocksMovement, hitSurfaceOf, pushOutOfShape, pitRegionOf, regionKind,
      zonePits: () => world.zonePits(), pitHomeKinds: (mover, pits) => world.pitHomeKinds(mover, pits), pitAt, pitSupportedAt,
    };
  }

export function nativeSceneFarPoint(host:NativeSceneGeometryHost, minFromPlayer: number, spaceFromEvents = false,
    draw: (a: number, c: number) => number = rand): Vec2 {
    return nativeFarPoint(host.nativePlacementHost(), minFromPlayer, spaceFromEvents, draw);
  }

export function nativeSceneFarthestStand(host:NativeSceneGeometryHost, radius: number, needReachable: boolean): Vec2 | null {
    return nativeFarthestStand(host.nativePlacementHost(), radius, needReachable);
  }

export function nativeSceneFindFreeSpot(host:NativeSceneGeometryHost, at: Vec2, radius: number, tier = 0): Vec2 {
    return nativeFindFreeSpot(host.nativePlacementHost(), at, radius, tier);
  }

export function nativeSceneDoorSpots(host:NativeSceneGeometryHost): Vec2[] {
    const spots: Vec2[] = [
      host.zoneEntry,
      ...host.exits.map(e => e.pos),
      ...host.caveEntrances.map(c => c.pos),
      ...host.demonPortals.map(g => g.pos),
      ...host.crusadePortals.map(g => g.pos),
      ...host.necropolisPortals.map(g => g.pos),
      ...host.fractureRifts.map(g => g.pos),
      ...host.dimGates.map(g => g.pos),
    ];
    if (host.breachPos) spots.push(host.breachPos);
    if (host.descentSite) spots.push(host.descentSite.platform);
    if (host.waypointPos) spots.push(host.waypointPos);
    for (const d of host.doodads) if (d.kind === 'dock') spots.push(d.pos);
    return spots;
  }

export function nativeSceneClearOfDoors(host:NativeSceneGeometryHost, p: Vec2, clear: number): boolean {
    return host.doorSpots().every(s => dist(p, s) >= clear);
  }

export function nativeSceneClearTransitSpot(host:NativeSceneGeometryHost, at: Vec2, clear = host.minPortalSeparation + 14): Vec2 {
    if (host.clearOfDoors(at, clear)) return at;
    for (let ring = 1; ring <= 5; ring++) {
      for (let k = 0; k < 8; k++) {
        const a = (k / 8) * Math.PI * 2 + ring * 0.39; // stagger rings so probes never line up
        const p = host.clampPos(vec(at.x + Math.cos(a) * clear * ring, at.y + Math.sin(a) * clear * ring), 30);
        if (host.clearOfDoors(p, clear)) return p;
      }
    }
    return at;
  }

export function nativeSceneInteractSpot(host:NativeSceneGeometryHost, pois: Vec2[], rng: Rng, minDist: number, clear: number,
    rimMargin?: number): Vec2 {
    const clearIdx: number[] = [];
    for (let i = 0; i < pois.length; i++) {
      if (!host.clearOfDoors(pois[i], clear)) continue;
      // THE FOOTPRINT RIM TEST (the pool rim filter's big-fixture kin): a
      // caller whose fixture SPREADS (the puzzle ring's bells stand a whole
      // footprint from this center) names its spread as `rimMargin`, and an
      // ellipse zone skips candidates whose spread would overhang the rim —
      // else the per-bell clamp bunches the ring's far arc onto it.
      // Draw-free (the filter spends no rng); rect zones never fire.
      if (rimMargin !== undefined && host.arena.shape === 'ellipse'
        && !insideBounds(pois[i], rimMargin, host.arena)) continue;
      clearIdx.push(i);
    }
    if (clearIdx.length) return pois.splice(clearIdx[rng.int(0, clearIdx.length - 1)], 1)[0];
    const far = host.farPoint(minDist, false, host.seededDraw());
    if (host.clearOfDoors(far, clear)) return far;
    const seed = pois.length ? pois.splice(rng.int(0, pois.length - 1), 1)[0] : far;
    return host.clearTransitSpot(vec(seed.x, seed.y), clear);
  }

export function nativeSceneSeededDraw(host:NativeSceneGeometryHost): (a: number, c: number) => number {
    const r = new Rng((host.currentZoneSeed ^ FARPOINT_SALT
      ^ Math.imul(++host.farPointDraws, 0x9e3779b1)) >>> 0);
    return (a, c) => r.range(a, c);
  }

export function nativeSceneOpaqueAt(host:NativeSceneGeometryHost, x: number, y: number): boolean {
    return host.fog !== null && host.fog.occluders > 0 && host.fog.occludesAt(x, y);
  }

export function nativeSceneInstallCreepFront(host:NativeSceneGeometryHost, field: CreepField): void {
    // SOVEREIGNTY: seat — a front's seating (the derived census, probe_tiers RIG T).
    host.frontSpawned = 0;
    host.frontRiders = 0;
    // Live way discs (kept roads/causeways — wild stretches already gave
    // themselves back to the land and don't count). Ways never move at
    // runtime, so one snapshot serves the visit; the field hands slices of
    // THIS list to its cover mask and the render clip alike.
    const ways: { x: number; y: number; r: number }[] = [];
    for (const d of host.doodads) {
      if (d.wild || d.gone) continue;
      if (!doodadRuleOf(d.kind).clearway) continue;
      ways.push({ x: d.pos.x, y: d.pos.y, r: d.radius });
    }
    field.setWays(ways);
    field.setTerrain({
      // Doodad grounds first, then GRID regions (the soulriver's inland sea
      // is a region, not discs — the current's flow.channel window must see
      // it). Bare cells still answer null: legacy fronts read identically.
      groundKindAt: (x, y) => host.groundAt(vec(x, y))?.kind ?? host.walk?.regionAt?.(x, y) ?? null,
      eachFuelNear: (x, y, r, fn) => {
        for (const d of host.doodadsNear(x, y, r)) {
          if (d.gone || d.keep || d.door) continue;
          const fuel = doodadRuleOf(d.kind).fuel;
          if (!fuel) continue;
          if (dist(d.pos, vec(x, y)) > r + d.radius) continue;
          fn(fuel, d);
        }
      },
      consume: (ref, row) => host.frontConsume(ref as Doodad, row),
      stamp: (x, y, r, ground, shallow, fade) => {
        // Converted ground is ordinary runtime terrain: a real disc in the
        // doodad list (groundAt senses it, the chunk baker repaints it,
        // the index rebuild is the same one every brittle pop pays).
        const px = clamp(x, 8, host.arena.w - 8), py = clamp(y, 8, host.arena.h - 8);
        // Already that ground? Stay the hand — a flood re-wetting a marsh
        // pool would only dirty chunks for nothing (the wet country the
        // crest crosses is conversion-free by definition).
        if (host.groundAt(vec(px, py))?.kind === ground) return;
        // SHALLOW (and evaporating) POOLS NEVER STACK: the ford-lightening
        // visual draws per shallow disc, so overlapping wake pools
        // composite into a flat pale wash that erases the mottle under the
        // crossed band (the "ground goes flat past a line" read). Kissing
        // is fine; landing ON an existing pool of the same kind is refused
        // — the wake is a chain of pools by contract, not a smear. A FRESH
        // wave crossing a drying pool re-wets it instead: the dwell clock
        // resets, no twin stacks on top.
        if (shallow || fade) {
          for (const o of host.doodadsNear(px, py, r)) {
            if (o.kind !== ground || !(o.shallow || o.evap) || o.gone) continue;
            const dd = Math.hypot(o.pos.x - px, o.pos.y - py);
            if (dd < (o.radius + r) * 0.95) {
              if (fade && o.evap) o.evap.t = Math.max(o.evap.t, fade.after);
              return;
            }
          }
        }
        const d: Doodad = {
          pos: vec(px, py),
          radius: r, kind: ground, ...(shallow ? { shallow: true } : {}),
          ...(fade ? { evap: { t: fade.after, rate: fade.rate } } : {}),
          laidAt: host.time, // the regrowth cycle's age read (updateCharRegrowth)
        };
        host.doodads.push(d);
        if (GROUND_KINDS.includes(d.kind)) host.grounds.push(d);
        if (fade) host.evaporating.push(d);
        host.markDoodadsChanged();
      },
      drag: (a, dx, dy) => {
        // The undertow rides the wind fabric's exact spares: planted
        // sentries, anchored bodies, constructs and the airborne feel
        // nothing; weight leans against the carry; origin-aware confine.
        const b = a as Actor;
        if (b.dead || b.downed || b.anchored || b.construct || b.leap || b.passive || isDormant(b)) return;
        const w = Math.max(0.4, b.effectiveWeight());
        b.pos = host.clampPos(vec(b.pos.x + dx / w, b.pos.y + dy / w), b.radius, b.pos);
      },
      drown: (a, drain, dt) => {
        // The crest pulls breath exactly as deep water does — player seats
        // only; what dwells in the flood is adapted to it. The hold stamp
        // keeps the terrain sweep's regen from refilling against us.
        const b = a as Actor;
        if (!host.seatOf(b) || b.dead || b.downed) return;
        (b.survivalHeldAt ??= {})['breath'] = host.time;
        host.drainSurvival(b, 'breath', drain, dt);
      },
      // THE VESSEL FLOW's ground truth (FrontSpec.flow steering + the
      // confine mask + rider seat pull-in all read THIS): the walk grid
      // where one exists, bare bounds where none does — open zones steer
      // nothing and confine nothing, exactly as authored.
      openAt: (x, y) => x >= 0 && y >= 0 && x <= host.arena.w && y <= host.arena.h
        && (!host.walk || host.walk.isWalkable(x, y)),
      // The lane gate's sky window (FrontSpawnRow.when) — the leaf's
      // structural FrontCond is radiance's own shape (the cast is the
      // zero-import doctrine's price, paid once here).
      condHeld: (c) => host.radianceCondHeld(c as RadianceCond),
      // THE CASTER-LESS BASELINE (CreepTerrain.statusDps): a skin's granted
      // DoT lands at the status row's own baseline for this zone's level
      // (the ground-effect lane's law) — the wildfire's wreath, the comet's
      // sear and the runoff's scald all TICK instead of wearing a 0-dps label.
      statusDps: (id) => baselineStatusDps(id, Math.max(1, host.zone.level)),
      // A fielding wave's arrival line (FrontSpawnRow.announce), on every
      // seat — the wildlife arrival-line idiom.
      announce: (text, color) => {
        for (const s of host.seats) {
          host.text(vec(s.actor.pos.x, s.actor.pos.y - 36), text, color ?? '#9fd8e8', 13);
        }
      },
    });
  }

export function nativeSceneFrontConsume(host:NativeSceneGeometryHost, d: Doodad, row: FrontConsumeRow): void {
    if (d.gone) return;
    const at = vec(d.pos.x, d.pos.y);
    const color = row.fx ?? '#e8d0a0';
    if (row.leave) {
      d.kind = row.leave;
      delete d.adorn;
      delete d.effect;
      host.markDoodadsChanged();
    } else {
      d.gone = true;
      const i = host.doodads.indexOf(d);
      if (i >= 0) host.doodads.splice(i, 1);
      host.markDoodadsChanged();
    }
    host.flashes.push({ pos: at, radius: Math.max(20, d.radius * 1.8), color, life: 0.32, maxLife: 0.32 });
    if (row.spawn && host.frontSpawned < CREEP_CFG.front.spawnMax && chance(row.spawn.chance)) {
      const m = host.createMonster(row.spawn.monster, Math.max(1, host.zone.level), 'enemy');
      m.pos = host.clampPos(vec(at.x + rand(-20, 20), at.y + rand(-20, 20)), m.radius);
      host.actors.push(m);
      host.frontSpawned++;
    }
  }
