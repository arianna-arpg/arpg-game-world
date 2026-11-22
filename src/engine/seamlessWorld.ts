// ---------------------------------------------------------------------------
// SEAMLESS WORLD COORDINATOR — mounts main's unchanged ZoneDef + generateLayout
// regions onto one continuous world-space TiledWalkField, streams neighbor
// regions in/out into standard ZoneMemory, switches active region pointers on
// border crossing in O(1) with zero coordinate rebase, enforces Sanctuary town
// gates, and drives cross-border enemy pursuit + faction skirmishes.
// ---------------------------------------------------------------------------

import { angleTo, clamp, dist, rand, randInt, vec, type Vec2 } from '../core/math';
import { FACTIONS, factionStance, MONSTERS } from '../data/monsters';
import { START_ZONE, type ZoneDef, type ZoneTheme } from '../data/zones';
import { GridWalkField } from '../world/gridWalk';
import {
  isSeamlessSurfaceZone, SEAMLESS_CFG, SeamlessAtlasLayout,
  type RegionSeatRect, type SeamCrossing, type ThemeBlendSample,
} from '../world/seamlessRegions';
import { TiledWalkField } from '../world/tiledWalk';
import { Actor } from './actor';
import { restoreMovementTether, savedMovementTether } from './movementTether';
import type { AnnexSpec, Doodad, HollowSpec, PlacedRoom, PlacedStructure } from './levelgen';
import type { OccSite } from './occurrences';
import type { PuzzleRun } from './puzzles';
import { captureZoneContents, ZONE_MEMORY_CFG, type ZoneContents } from './zonecontents';
import type { Chest, GemDrop, World, ZoneExit } from './world';

export interface StagedHoldFixture {
  pos: Vec2;
  charge: number;
  doodad: Doodad;
  pourAt: number;
  recoup: number;
  holdRead?: { contested: boolean; draining: boolean; recouping: boolean };
}

export interface StagedRegionSlice {
  walk: GridWalkField;
  spawnAt: Vec2 | null;
  seed: number;
  doodads: Doodad[];
  structures: PlacedStructure[];
  actors: Actor[];
  speakerRows: [number, unknown][];
  chests: Chest[];
  shrines: World['shrines'];
  altars: World['altars'];
  fonts: World['fonts'];
  spires: StagedHoldFixture[];
  rifts: StagedHoldFixture[];
  pyres: StagedHoldFixture[];
  digs: StagedHoldFixture[];
  occs: OccSite[];
  puzzles: PuzzleRun[];
  harvestNodes: World['harvestNodes'];
  caveEntrances: Parameters<World['pushSeamlessPrivateFixtures']>[0];
  portalExits: ZoneExit[];
  encounters: World['encounters'];
  vocationSites: Parameters<World['pushSeamlessPrivateFixtures']>[1];
  waypointPos: Vec2 | null;
  zoneEntry: Vec2;
  objectiveDone: boolean;
  objectiveLost: boolean;
  cull: { need: number; kills: number } | null;
  offering: { altarIdx: number; offered: number; need: number } | null;
  procession: World['procession'];
  wave: number;
  waveActive: boolean;
  charBorn: number | undefined;
  theaterSpots: { camps: Vec2[]; pois: Vec2[] };
  theaterVisit: number;
  theaterQuiet: boolean;
  theaterAmbientBudget: number;
  hasVendorCounter: boolean;
  mercOutpost: World['mercOutpost'];
  zoneHollows: HollowSpec[];
  openedHollows: Set<string>;
  zoneAnnexSpecs: AnnexSpec[];
  annexOpen: Set<string>;
}

export interface MountedRegionRuntime {
  zoneId: string;
  def: ZoneDef;
  seat: RegionSeatRect;
  seed: number;
  spawnAtWorld: Vec2 | null;
  waypointPos: Vec2 | null;
  zoneEntry: Vec2;
  objectiveDone: boolean;
  objectiveLost: boolean;
  cull: { need: number; kills: number } | null;
  offering: { offered: number; need: number; altarObj: World['altars'][number] | null } | null;
  procession: World['procession'];
  wave: number;
  waveActive: boolean;
  spires: StagedHoldFixture[];
  rifts: StagedHoldFixture[];
  pyres: StagedHoldFixture[];
  digs: StagedHoldFixture[];
  occs: OccSite[];
  puzzles: PuzzleRun[];
  harvestNodes: World['harvestNodes'];
  charBorn: number | undefined;
  theaterSpots: { camps: Vec2[]; pois: Vec2[] };
  theaterVisit: number;
  theaterQuiet: boolean;
  theaterAmbientBudget: number;
  hasVendorCounter: boolean;
  mercOutpost: World['mercOutpost'];
  zoneHollows: HollowSpec[];
  openedHollows: Set<string>;
  zoneAnnexSpecs: AnnexSpec[];
  annexOpen: Set<string>;
  speakerIds: number[];
  syncedExitCount: number;
}

function shiftRect(r: { x: number; y: number; w: number; h: number }, ox: number, oy: number): void {
  r.x += ox;
  r.y += oy;
}

function shiftRoom(rm: PlacedRoom, ox: number, oy: number): void {
  for (const r of rm.rects) shiftRect(r, ox, oy);
  for (const w of rm.windows) {
    w.x += ox;
    w.y += oy;
  }
}

function pointRectDist(p: Vec2, s: RegionSeatRect): number {
  const dx = p.x < s.originPx.x ? s.originPx.x - p.x : p.x > s.originPx.x + s.w ? p.x - (s.originPx.x + s.w) : 0;
  const dy = p.y < s.originPx.y ? s.originPx.y - p.y : p.y > s.originPx.y + s.h ? p.y - (s.originPx.y + s.h) : 0;
  return Math.hypot(dx, dy);
}

export class SeamlessCoordinator {
  active = false;
  groundCacheToken: object = {};
  readonly atlas: SeamlessAtlasLayout;
  readonly walk = new TiledWalkField();
  readonly mounted = new Map<string, MountedRegionRuntime>();
  private readonly itemRegion = new WeakMap<object, string>();
  private readonly holdfastRolled = new Set<string>();
  private readonly bannerCooldown = new Map<string, number>();
  private readonly skirmishCooldown = new Map<string, number>();
  private lastSyncedZoneCount = -1;

  constructor(private readonly world: World) {
    this.atlas = new SeamlessAtlasLayout(world.manifest.seed);
  }

  resetAll(reseed?: number): void {
    this.mounted.clear();
    this.walk.clear();
    this.atlas.reset(reseed ?? this.world.manifest.seed);
    this.skirmishCooldown.clear();
    this.bannerCooldown.clear();
    this.lastSyncedZoneCount = -1;
    this.groundCacheToken = {};
    this.active = false;
  }

  isMounted(zoneId: string): boolean {
    return this.mounted.has(zoneId);
  }

  seatOf(zoneId: string): RegionSeatRect | undefined {
    return this.atlas.seats.get(zoneId);
  }

  activeSeat(): RegionSeatRect | undefined {
    return this.atlas.seats.get(this.world.zone?.id);
  }

  hasRolledHoldfast(zoneId: string): boolean {
    return this.holdfastRolled.has(zoneId);
  }

  markHoldfastRolled(zoneId: string): void {
    this.holdfastRolled.add(zoneId);
  }

  /** Region owning a world-space point (disjoint active seat rect is authoritative;
   *  falls back to cell owner inside inter-region pass corridors). */
  regionIdAt(wx: number, wy: number): string | null {
    for (const [id, r] of this.mounted) {
      const s = r.seat;
      if (wx >= s.originPx.x && wx <= s.originPx.x + s.w && wy >= s.originPx.y && wy <= s.originPx.y + s.h) {
        return id;
      }
    }
    const cellOwner = this.walk.ownerAt(wx, wy);
    if (cellOwner && this.mounted.has(cellOwner)) return cellOwner;
    return null;
  }

  /** Region owning a cave mouth / drop / fixture object (falls back to spatial lookup). */
  ownerOfObject(obj: object, fallbackPos?: Vec2): string {
    const tagged = this.itemRegion.get(obj);
    if (tagged) return tagged;
    if (fallbackPos) {
      const rid = this.regionIdAt(fallbackPos.x, fallbackPos.y);
      if (rid) return rid;
    }
    return this.world.zone.id;
  }

  /** Convert a world-space point into `zoneId`'s local (0..w, 0..h) coordinates. */
  toLocal(zoneId: string, wp: Vec2): Vec2 {
    const s = this.atlas.seats.get(zoneId);
    if (!s) return vec(wp.x, wp.y);
    return vec(clamp(wp.x - s.originPx.x, 0, s.w), clamp(wp.y - s.originPx.y, 0, s.h));
  }

  /** Convert a `zoneId`-local point into continuous world-space coordinates. */
  toWorld(zoneId: string, lp: Vec2): Vec2 {
    const s = this.atlas.seats.get(zoneId);
    if (!s) return vec(lp.x, lp.y);
    return vec(s.originPx.x + lp.x, s.originPx.y + lp.y);
  }

  /** Sanctuary ward predicate (Ruling A2): hostile wilderness monsters and their
   *  projectiles cannot cross the gate threshold into Lastlight or any safe settlement. */
  isSanctuaryAt(wx: number, wy: number): boolean {
    if (!this.active) return false;
    for (const [id, r] of this.mounted) {
      if (id !== START_ZONE && r.def.objective.kind !== 'safe') continue;
      const s = r.seat;
      if (wx >= s.originPx.x && wx <= s.originPx.x + s.w && wy >= s.originPx.y && wy <= s.originPx.y + s.h) {
        return true;
      }
    }
    return false;
  }

  /** Spatial ground-theme blender for GroundRenderer. */
  themeAt(wx: number, wy: number): ThemeBlendSample {
    return this.atlas.sampleThemeAt(wx, wy, this.world.zoneMap, this.world.zone.theme);
  }

  /** Ring-1 drowsy AI predicate: un-aggro'd actors beyond liveAiRadiusPx tick at 1/4 rate. */
  actorDrowsy(a: Actor): boolean {
    if (!this.active || a.aggroed || a.aiTargetId !== undefined || a.isMinion()) return false;
    const r2 = SEAMLESS_CFG.liveAiRadiusPx * SEAMLESS_CFG.liveAiRadiusPx;
    for (const s of this.world.seats) {
      const dx = a.pos.x - s.actor.pos.x, dy = a.pos.y - s.actor.pos.y;
      if (dx * dx + dy * dy <= r2) return false;
    }
    return true;
  }

  /** Soft home-region tether (Ruling A4): idle ambient enemies loosely drift back
   *  inside their homeRegionId if they wandered across a border while un-aggro'd.
   *  Once aggro'd, or when roamsCrossRegion is true, returns null (free pursuit!). */
  homeTetherGoal(a: Actor): Vec2 | null {
    if (!this.active || a.team !== 'enemy' || a.roamsCrossRegion || a.aggroed || a.aiTargetId !== undefined) {
      return null;
    }
    const hid = a.homeRegionId;
    if (!hid) return null;
    const s = this.atlas.seats.get(hid);
    if (!s) return null;
    const pad = 90;
    if (a.pos.x >= s.originPx.x - pad && a.pos.x <= s.originPx.x + s.w + pad
      && a.pos.y >= s.originPx.y - pad && a.pos.y <= s.originPx.y + s.h + pad) {
      return null;
    }
    return vec(
      clamp(a.pos.x, s.originPx.x + 150, s.originPx.x + s.w - 150),
      clamp(a.pos.y, s.originPx.y + 150, s.originPx.y + s.h - 150),
    );
  }

  /** Boot or resume the continuous surface plane around `startZoneId`. */
  bootSurface(startZoneId: string, opts?: { fromZoneId?: string; exactLocalPos?: Vec2; exactTier?: number }): void {
    const startDef = this.world.zoneMap[startZoneId];
    if (!startDef || !isSeamlessSurfaceZone(startDef)) return;

    // If not already active, initialize the continuous surface arena & walk field.
    if (!this.active) {
      this.mounted.clear();
      this.walk.clear();
      this.groundCacheToken = {};
      this.active = true;
    }

    this.world.prepareSeamlessZoneGraph(startDef);
    this.syncAtlasSeats();
    // If startZoneId was a floating/disconnected surface zone not yet reachable from START_ZONE,
    // ensure it still gets a seat in the atlas.
    if (!this.atlas.seats.has(startZoneId)) {
      this.seatDisconnectedSurfaceZone(startDef);
      this.syncAtlasSeats();
    }

    // Bind the continuous surface arena & walk field on World.
    this.world.bindSeamlessSurface(this.walk);

    // Mount the anchor region first, then all surface neighbors within ringInPx.
    if (!this.mounted.has(startZoneId)) {
      this.mountRegion(startZoneId, opts?.fromZoneId);
    }
    const anchorRuntime = this.mounted.get(startZoneId)!;
    const anchorSeat = anchorRuntime.seat;

    // Compute landing spot in world coordinates BEFORE streaming neighbors so
    // ringInPx distance checks measure from where the party actually stands.
    let landingWorld: Vec2;
    if (opts?.exactLocalPos) {
      landingWorld = vec(anchorSeat.originPx.x + opts.exactLocalPos.x, anchorSeat.originPx.y + opts.exactLocalPos.y);
    } else if (opts?.fromZoneId) {
      const seam = this.findSeamBetween(startZoneId, opts.fromZoneId);
      if (seam) {
        const mouth = seam.aId === startZoneId ? seam.mouthA : seam.mouthB;
        const center = vec(anchorSeat.originPx.x + anchorSeat.w / 2, anchorSeat.originPx.y + anchorSeat.h / 2);
        const ang = angleTo(mouth, center);
        landingWorld = vec(mouth.x + Math.cos(ang) * 120, mouth.y + Math.sin(ang) * 120);
      } else {
        landingWorld = vec(anchorRuntime.zoneEntry.x, anchorRuntime.zoneEntry.y);
      }
    } else if (anchorRuntime.spawnAtWorld) {
      landingWorld = vec(anchorRuntime.spawnAtWorld.x, anchorRuntime.spawnAtWorld.y);
    } else {
      landingWorld = vec(anchorRuntime.zoneEntry.x, anchorRuntime.zoneEntry.y);
    }

    // Activate `startZoneId` as the current active region on World.
    this.activateRegion(startZoneId, opts?.fromZoneId, true);
    this.world.landPartyAtSeamless(landingWorld, opts?.exactTier ?? 0);

    // Mount all 1-ring / ringInPx surface neighbors synchronously at boot so
    // walking out of town or waking from a save has zero pop-in at the border.
    this.mountApproachedNeighbors(Infinity);
    this.refreshWorldDerivedLists();
  }

  /** Ensure `targetZoneId` and its nearby ring are mounted on the ALREADY-LIVE
   *  seamless surface (for fast waypoint travel or Town Portal jumps without
   *  tearing down shared mounted ground!). */
  travelOnSurfaceTo(targetZoneId: string, localSpot?: Vec2, tier = 0): Vec2 {
    const def = this.world.zoneMap[targetZoneId];
    if (!def) return vec(this.world.player.pos.x, this.world.player.pos.y);
    this.world.prepareSeamlessZoneGraph(def);
    this.syncAtlasSeats();
    if (!this.atlas.seats.has(targetZoneId)) {
      this.seatDisconnectedSurfaceZone(def);
      this.syncAtlasSeats();
    }
    if (!this.mounted.has(targetZoneId)) {
      this.mountRegion(targetZoneId);
    }
    const rt = this.mounted.get(targetZoneId)!;
    this.activateRegion(targetZoneId, undefined, false);
    const dest = localSpot
      ? vec(rt.seat.originPx.x + localSpot.x, rt.seat.originPx.y + localSpot.y)
      : (rt.waypointPos ? vec(rt.waypointPos.x, rt.waypointPos.y + 50) : vec(rt.zoneEntry.x, rt.zoneEntry.y));
    this.world.landPartyAtSeamless(dest, tier);
    this.mountApproachedNeighbors(Infinity);
    this.demoteDistantRegions();
    this.refreshWorldDerivedLists();
    return dest;
  }

  /** Suspend seamless surface mode before entering a discrete cave, pocket,
   *  special boss stage, or other dimension. Snapshots every mounted region into
   *  standard region-local ZoneMemory first so nothing is lost. */
  suspendSurface(): void {
    if (!this.active) return;
    this.syncActiveRuntimeFromWorld();
    this.snapshotMountedRegionsToMemory(true);
    this.mounted.clear();
    this.walk.clear();
    this.active = false;
    this.groundCacheToken = {};
  }

  /** Per-frame seamless coordinator tick: tracks border crossings, streams
   *  approached regions in / distant regions out, opens unlocked seams, and
   *  drives cross-border faction warband raids. */
  update(dt: number): void {
    if (!this.active) return;

    // 1. Tag any newly dropped loot items with the region they fell in.
    for (const d of this.world.drops) {
      if (!this.itemRegion.has(d)) {
        const rid = this.regionIdAt(d.pos.x, d.pos.y) ?? this.world.zone.id;
        this.itemRegion.set(d, rid);
      }
    }

    // 2. Check if the local hero crossed into a different mounted region (with
    //    45px inward hysteresis so standing right on a border seam never chatters).
    const heroPos = this.world.player.pos;
    const curId = this.world.zone.id;
    const curRt = this.mounted.get(curId);
    let crossedTo: string | null = null;
    const candId = this.regionIdAt(heroPos.x, heroPos.y);
    if (candId && candId !== curId && this.mounted.has(candId)) {
      if (!curRt) {
        crossedTo = candId;
      } else {
        const nextSeat = this.mounted.get(candId)!.seat;
        const inDepthX = Math.min(heroPos.x - nextSeat.originPx.x, nextSeat.originPx.x + nextSeat.w - heroPos.x);
        const inDepthY = Math.min(heroPos.y - nextSeat.originPx.y, nextSeat.originPx.y + nextSeat.h - heroPos.y);
        // Accept crossing once inside the neighbor's active box by >= 36px, or if
        // clearly outside the previous region's active box + pass margin.
        const outPrev = pointRectDist(heroPos, curRt.seat) > 45;
        if ((inDepthX >= 36 && inDepthY >= 36) || outPrev) {
          crossedTo = candId;
        }
      }
    }
    if (crossedTo) {
      this.activateRegion(crossedTo, curId, false);
    } else {
      this.syncActiveRuntimeFromWorld();
    }

    // 3. Stream in approached surface regions (budgeted) and demote distant ones.
    const mountedAny = this.mountApproachedNeighbors(SEAMLESS_CFG.mountBudgetPerFrame);
    const demotedAny = this.demoteDistantRegions();
    if (mountedAny || demotedAny) {
      this.refreshWorldDerivedLists();
    }

    // 4. Open any previously locked border seams whose lock cleared (Holdfast
    //    toll paid, Harborhold liberated, objective seal lifted, edge blockade ended).
    for (const seam of this.atlas.seams.values()) {
      if (!seam.locked) continue;
      if (!this.mounted.has(seam.aId) && !this.mounted.has(seam.bId)) continue;
      if (!this.isSeamLockedNow(seam)) {
        this.atlas.openSeamInPlace(seam, this.walk, this.world.doodads);
        this.world.markDoodadsChanged();
      }
    }

    // 5. Cross-region faction border raids: when two adjacent mounted regions
    //    are held by hostile factions (or actively contested), periodically march
    //    a raiding party across the shared seam with roamsCrossRegion = true!
    this.updateCrossBorderSkirmishes(dt);
  }

  /** Credit a monster's death to its homeRegionId's cull objective and faction
   *  census even if the fight carried across a border into an adjacent region! */
  creditCrossRegionKill(victim: Actor): void {
    if (!this.active) return;
    const hid = victim.homeRegionId;
    if (!hid) return;
    if (victim.faction) {
      this.world.sim.faction.bleed(hid, victim.faction, 0.55);
    }
    // Active region's own cull is already handled by worldKillRules('clear_cull_tally').
    if (hid === this.world.zone.id) return;
    const rt = this.mounted.get(hid);
    if (!rt || rt.objectiveDone || rt.def.objective.kind !== 'clear' || !rt.cull) return;
    if (!this.world.isSeamlessObjectiveCountable(victim)) return;
    rt.cull.kills = Math.min(rt.cull.need, rt.cull.kills + 1);
    if (rt.cull.kills >= rt.cull.need) {
      rt.objectiveDone = true;
      this.world.completeMountedRegionObjective(rt.def);
    }
  }

  /** Snapshot all currently mounted regions into `world.zoneMemory` in standard
   *  region-local (0..w, 0..h) coordinates (safe for autosave, Campfire, cave entry). */
  snapshotMountedRegionsToMemory(runLeaveHooks = false): void {
    if (!this.active) return;
    this.syncActiveRuntimeFromWorld();
    for (const [zoneId, rt] of this.mounted) {
      const memo = this.buildLocalZoneMemory(rt);
      if (memo) {
        this.world.setZoneMemoryForSeamless(zoneId, memo);
      }
      if (runLeaveHooks) {
        this.world.runSeamlessRegionLeaveHooks(zoneId);
      }
    }
  }

  /** Reconcile dynamically appended mid-session exits (`def.exits` beyond
   *  `rt.syncedExitCount`) without spawning discrete teleport rings for
   *  surface-to-surface links! */
  syncActiveRegionDynamicExits(placeDiscretePortal: (ed: ZoneDef['exits'][number], idx: number, ox: number, oy: number) => World['exits'][number]): void {
    if (!this.active) return;
    const rt = this.mounted.get(this.world.zone.id);
    if (!rt || rt.syncedExitCount >= rt.def.exits.length) return;
    let openedSeamlessSeam = false;
    for (let i = rt.syncedExitCount; i < rt.def.exits.length; i++) {
      const ed = rt.def.exits[i];
      if (!ed.crossDim) {
        this.world.prepareSeamlessZoneGraph(rt.def);
        this.syncAtlasSeats();
        const dest = this.world.zoneMap[ed.to] ?? this.world.caveMap[ed.to];
        if (isSeamlessSurfaceZone(dest)) {
          openedSeamlessSeam = true;
          continue;
        }
      }
      const ze = placeDiscretePortal(ed, i, rt.seat.originPx.x, rt.seat.originPx.y);
      this.itemRegion.set(ze, rt.zoneId);
      this.world.exits.push(ze);
    }
    rt.syncedExitCount = rt.def.exits.length;
    if (openedSeamlessSeam) {
      const mountedSet = new Set(this.mounted.keys());
      this.stripBorderDoodadsOf(rt.zoneId);
      const borderDoodads = this.atlas.composeRegionBorders(
        rt.def, rt.seat, this.walk, mountedSet, this.world.doodads);
      this.world.doodads.push(...borderDoodads);
      this.world.markDoodadsChanged();
    }
  }

  // -------------------------------------------------------------- internals --

  private syncAtlasSeats(): void {
    this.atlas.ensureSeats(this.world.zoneMap, (fromDef, ex, idx) =>
      this.world.isSeamlessLinkLocked(fromDef, ex, idx));
    this.lastSyncedZoneCount = Object.keys(this.world.zoneMap).length;
  }

  private isSeamLockedNow(seam: SeamCrossing): boolean {
    const aDef = this.world.zoneMap[seam.aId];
    const bDef = this.world.zoneMap[seam.bId];
    if (!aDef || !bDef) return false;
    const aIdx = aDef.exits.findIndex(e => e.to === bDef.id && !e.crossDim);
    const bIdx = bDef.exits.findIndex(e => e.to === aDef.id && !e.crossDim);
    if (aIdx >= 0 && this.world.isSeamlessLinkLocked(aDef, aDef.exits[aIdx], aIdx)) return true;
    if (bIdx >= 0 && this.world.isSeamlessLinkLocked(bDef, bDef.exits[bIdx], bIdx)) return true;
    return false;
  }

  private findSeamBetween(aId: string, bId: string): SeamCrossing | undefined {
    const pk = aId < bId ? `${aId}|${bId}` : `${bId}|${aId}`;
    return this.atlas.seams.get(pk);
  }

  private seatDisconnectedSurfaceZone(def: ZoneDef): void {
    const cell = SEAMLESS_CFG.snapPx;
    const w = Math.max(cell * 10, Math.round(def.size.w / cell) * cell);
    const h = Math.max(cell * 10, Math.round(def.size.h / cell) * cell);
    let x0 = Math.round((def.map.x * 24) / cell) * cell;
    let y0 = Math.round((def.map.y * 24) / cell) * cell;
    for (let step = 0; step < 80; step++) {
      const cand = { x0, y0, x1: x0 + w, y1: y0 + h };
      let hit = false;
      for (const s of this.atlas.seats.values()) {
        if (cand.x0 < s.plot.x1 && cand.x1 > s.plot.x0 && cand.y0 < s.plot.y1 && cand.y1 > s.plot.y0) {
          hit = true;
          break;
        }
      }
      if (!hit) break;
      x0 += cell * 8;
    }
    this.atlas.seats.set(def.id, {
      zoneId: def.id,
      originPx: { x: x0, y: y0 },
      w,
      h,
      plot: { x0, y0, x1: x0 + w, y1: y0 + h },
    });
  }

  private mountApproachedNeighbors(budget: number): boolean {
    if (budget <= 0) return false;
    if (Object.keys(this.world.zoneMap).length !== this.lastSyncedZoneCount) {
      this.syncAtlasSeats();
    }
    const candidates: { id: string; d: number }[] = [];
    const heroPos = this.world.player.pos;

    // Consider all seated surface regions within ringInPx of any player seat
    // that are graph-linked to at least one mounted region (or 1-ring from active).
    for (const [id, seat] of this.atlas.seats) {
      if (this.mounted.has(id)) continue;
      const def = this.world.zoneMap[id];
      if (!isSeamlessSurfaceZone(def)) continue;
      let minDist = pointRectDist(heroPos, seat);
      for (const s of this.world.seats) {
        minDist = Math.min(minDist, pointRectDist(s.actor.pos, seat));
      }
      // Always keep immediate neighbors of the active region within easy reach,
      // and stream any region whose box comes within ringInPx!
      const isDirectNeighbor = this.world.zone.exits.some(e => e.to === id && !e.crossDim);
      if (minDist <= SEAMLESS_CFG.ringInPx || isDirectNeighbor) {
        candidates.push({ id, d: minDist });
      }
    }

    if (!candidates.length) return false;
    candidates.sort((a, b) => a.d - b.d);

    let count = 0;
    for (const c of candidates) {
      if (count >= budget) break;
      const def = this.world.zoneMap[c.id];
      if (!def) continue;
      this.world.prepareSeamlessZoneGraph(def);
      this.syncAtlasSeats();
      this.mountRegion(c.id, this.world.zone.id);
      count++;
    }
    return count > 0;
  }

  private demoteDistantRegions(): boolean {
    let any = false;
    const activeId = this.world.zone.id;
    for (const [id, rt] of [...this.mounted]) {
      if (id === activeId) continue;
      // Keep direct 1-ring neighbors of the active zone mounted if reasonably close.
      let minDist = Infinity;
      for (const s of this.world.seats) {
        minDist = Math.min(minDist, pointRectDist(s.actor.pos, rt.seat));
      }
      if (minDist <= SEAMLESS_CFG.ringOutPx) continue;
      this.unmountRegion(id);
      any = true;
    }
    return any;
  }

  private mountRegion(zoneId: string, fromZoneId?: string): void {
    if (this.mounted.has(zoneId)) return;
    const def = this.world.zoneMap[zoneId];
    const seat = this.atlas.seats.get(zoneId);
    if (!def || !seat) return;

    const localExits = this.atlas.localExitPositionsFor(def, this.world.zoneMap);
    let entryLocal = vec(seat.w / 2, seat.h / 2);
    if (fromZoneId) {
      const backIdx = def.exits.findIndex(e => e.to === fromZoneId && !e.crossDim);
      if (backIdx >= 0 && localExits[backIdx]) {
        const bp = localExits[backIdx];
        const ang = angleTo(bp, entryLocal);
        entryLocal = vec(bp.x + Math.cos(ang) * 120, bp.y + Math.sin(ang) * 120);
      }
    }

    const slice = this.world.buildRegionSliceForSeamless(def, seat, localExits, entryLocal);
    const ox = seat.originPx.x, oy = seat.originPx.y;

    // 1. Mount local GridWalkField 1:1 onto the continuous TiledWalkField!
    this.walk.mountRegion(zoneId, ox, oy, { w: seat.w, h: seat.h, shape: def.shape ?? 'rect' }, slice.walk);

    // 2. Translate all spatial objects in the slice by +(ox, oy) and tag ownership.
    this.translateSliceToWorld(zoneId, def.theme, ox, oy, slice);

    // 3. Merge into World's live arrays!
    this.world.doodads.push(...slice.doodads);
    this.world.structures.push(...slice.structures);
    this.world.actors.push(...slice.actors);
    for (const [aid, row] of slice.speakerRows) {
      this.world.setSpeakerRowForSeamless(aid, row);
    }
    for (const c of slice.chests) { this.itemRegion.set(c, zoneId); this.world.chests.push(c); }
    for (const s of slice.shrines) { this.itemRegion.set(s, zoneId); this.world.shrines.push(s); }
    for (const a of slice.altars) { this.itemRegion.set(a, zoneId); this.world.altars.push(a); }
    for (const f of slice.fonts) { this.itemRegion.set(f, zoneId); this.world.fonts.push(f); }
    for (const ex of slice.portalExits) { this.itemRegion.set(ex, zoneId); this.world.exits.push(ex); }
    for (const enc of slice.encounters) { this.itemRegion.set(enc, zoneId); this.world.encounters.push(enc); }
    this.world.pushSeamlessPrivateFixtures(slice.caveEntrances, slice.vocationSites, obj => {
      this.itemRegion.set(obj, zoneId);
    });

    const altarObj = slice.offering && slice.altars[slice.offering.altarIdx]
      ? slice.altars[slice.offering.altarIdx]
      : null;

    const rt: MountedRegionRuntime = {
      zoneId,
      def,
      seat,
      seed: slice.seed,
      spawnAtWorld: slice.spawnAt ? vec(slice.spawnAt.x + ox, slice.spawnAt.y + oy) : null,
      waypointPos: slice.waypointPos ? vec(slice.waypointPos.x + ox, slice.waypointPos.y + oy) : null,
      zoneEntry: vec(slice.zoneEntry.x + ox, slice.zoneEntry.y + oy),
      objectiveDone: slice.objectiveDone,
      objectiveLost: slice.objectiveLost,
      cull: slice.cull,
      offering: slice.offering ? { offered: slice.offering.offered, need: slice.offering.need, altarObj } : null,
      procession: slice.procession,
      wave: slice.wave,
      waveActive: slice.waveActive,
      spires: slice.spires,
      rifts: slice.rifts,
      pyres: slice.pyres,
      digs: slice.digs,
      occs: slice.occs,
      puzzles: slice.puzzles,
      harvestNodes: slice.harvestNodes,
      charBorn: slice.charBorn,
      theaterSpots: slice.theaterSpots,
      theaterVisit: slice.theaterVisit,
      theaterQuiet: slice.theaterQuiet,
      theaterAmbientBudget: slice.theaterAmbientBudget,
      hasVendorCounter: slice.hasVendorCounter,
      mercOutpost: slice.mercOutpost,
      zoneHollows: slice.zoneHollows,
      openedHollows: slice.openedHollows,
      zoneAnnexSpecs: slice.zoneAnnexSpecs,
      annexOpen: slice.annexOpen,
      speakerIds: slice.speakerRows.map(([aid]) => aid),
      syncedExitCount: def.exits.length,
    };
    this.mounted.set(zoneId, rt);

    // 4. Compose perimeter borders, mouths, road bridges, and gate landmarks
    //    for `def` AND refresh shared seam bridges on already-mounted neighbors!
    const mountedSet = new Set(this.mounted.keys());
    const borderDoodads = this.atlas.composeRegionBorders(def, seat, this.walk, mountedSet, this.world.doodads);
    this.world.doodads.push(...borderDoodads);

    for (const seam of this.atlas.seamsFor(zoneId)) {
      const otherId = seam.aId === zoneId ? seam.bId : seam.aId;
      const otherRt = this.mounted.get(otherId);
      if (!otherRt) continue;
      // Re-stitch the partner's side of the newly joined seam so its perimeter
      // wall opens onto the shared mouth and throat clutter is cleared on both sides!
      this.stripBorderDoodadsOf(otherId);
      const partnerBorder = this.atlas.composeRegionBorders(
        otherRt.def, otherRt.seat, this.walk, mountedSet, this.world.doodads);
      this.world.doodads.push(...partnerBorder);
    }

    this.world.markDoodadsChanged();
  }

  private stripBorderDoodadsOf(zoneId: string): void {
    // Border doodads generated by composeRegionBorders are rebuilt cleanly when
    // a neighbor joins; interior layout doodads keep their exact placement.
    // Mark border doodads via negative-zero or keep interior doodads intact:
    // actually composeRegionBorders only adds road/lantern/banner/signpost/edge-props
    // inside the 36px rim; to avoid duplicating rim props on re-stitch, remove
    // non-door, non-anchor doodads of `zoneId` within 38px of its box boundary.
    const rt = this.mounted.get(zoneId);
    if (!rt) return;
    const s = rt.seat;
    for (let i = this.world.doodads.length - 1; i >= 0; i--) {
      const d = this.world.doodads[i];
      if (d.regionId !== zoneId || d.door || d.anchor || d.hollow || d.annex) continue;
      const nearRim = d.pos.x <= s.originPx.x + 38 || d.pos.x >= s.originPx.x + s.w - 38
        || d.pos.y <= s.originPx.y + 38 || d.pos.y >= s.originPx.y + s.h - 38;
      const outBox = d.pos.x < s.originPx.x || d.pos.x > s.originPx.x + s.w
        || d.pos.y < s.originPx.y || d.pos.y > s.originPx.y + s.h;
      if (nearRim || outBox) {
        this.world.doodads.splice(i, 1);
      }
    }
  }

  private unmountRegion(zoneId: string): void {
    const rt = this.mounted.get(zoneId);
    if (!rt) return;

    // 1. Persist local ZoneMemory before removing entities!
    const memo = this.buildLocalZoneMemory(rt);
    if (memo) {
      this.world.setZoneMemoryForSeamless(zoneId, memo);
    }
    this.world.runSeamlessRegionLeaveHooks(zoneId);

    // 2. Remove region doodads, structures, fixtures, and un-aggro'd actors.
    for (let i = this.world.doodads.length - 1; i >= 0; i--) {
      if (this.world.doodads[i].regionId === zoneId) this.world.doodads.splice(i, 1);
    }
    for (let i = this.world.structures.length - 1; i >= 0; i--) {
      if (this.world.structures[i].regionId === zoneId) this.world.structures.splice(i, 1);
    }
    const seatActors = new Set(this.world.seats.map(s => s.actor));
    for (let i = this.world.actors.length - 1; i >= 0; i--) {
      const a = this.world.actors[i];
      if (seatActors.has(a) || (a.owner && seatActors.has(a.owner))) continue;
      if (a.homeRegionId !== zoneId) continue;
      // An aggro'd enemy actively fighting near the party stays in the world!
      if (a.team === 'enemy' && a.aggroed && !a.dead && dist(a.pos, this.world.player.pos) < 1600) {
        continue;
      }
      this.world.actors.splice(i, 1);
    }
    for (const aid of rt.speakerIds) this.world.deleteSpeakerRowForSeamless(aid);

    const dropOwned = <T extends object>(arr: T[]): void => {
      for (let i = arr.length - 1; i >= 0; i--) {
        if (this.itemRegion.get(arr[i]) === zoneId) arr.splice(i, 1);
      }
    };
    dropOwned(this.world.chests);
    dropOwned(this.world.shrines);
    dropOwned(this.world.altars);
    dropOwned(this.world.fonts);
    dropOwned(this.world.exits);
    dropOwned(this.world.encounters);
    dropOwned(this.world.drops);
    this.world.dropSeamlessPrivateFixtures(obj => this.itemRegion.get(obj) === zoneId);

    this.walk.unmountRegion(zoneId, rt.seat.originPx.x - 120, rt.seat.originPx.y - 120, rt.seat.w + 240, rt.seat.h + 240);
    this.mounted.delete(zoneId);
    this.world.clearSeamlessRegionMaterializations(zoneId);
    this.world.markDoodadsChanged();
  }

  private translateSliceToWorld(
    zoneId: string,
    theme: ZoneTheme,
    ox: number,
    oy: number,
    slice: StagedRegionSlice,
  ): void {
    const pfx = `${zoneId}:`;

    for (const d of slice.doodads) {
      d.pos.x += ox;
      d.pos.y += oy;
      d.regionId = zoneId;
      d.regionTheme = theme;
      if (d.door) {
        if (!d.door.id.startsWith(pfx)) d.door.id = pfx + d.door.id;
        if (d.door.cells) shiftRect(d.door.cells, ox, oy);
      }
      if (d.hollow && !d.hollow.startsWith(pfx)) d.hollow = pfx + d.hollow;
    }

    for (const st of slice.structures) {
      if (!st.id.startsWith(pfx)) st.id = pfx + st.id;
      st.regionId = zoneId;
      st.regionTheme = theme;
      shiftRect(st.rect, ox, oy);
      for (const r of st.roofs) shiftRect(r, ox, oy);
      for (const f of st.floors) shiftRect(f, ox, oy);
      for (const c of st.courtyards) shiftRect(c, ox, oy);
      for (const dr of st.doors) {
        dr.pos.x += ox;
        dr.pos.y += oy;
        if (!dr.door.id.startsWith(pfx)) {
          dr.door.id = pfx + dr.door.id;
          if (dr.door.cells) shiftRect(dr.door.cells, ox, oy);
        }
      }
      for (const sl of st.slots) {
        sl.pos.x += ox;
        sl.pos.y += oy;
      }
      if (st.spawn) {
        st.spawn.x += ox;
        st.spawn.y += oy;
      }
      if (st.rooms) {
        for (const rm of st.rooms) shiftRoom(rm, ox, oy);
      }
      if (st.storeys) {
        for (const sy of st.storeys) {
          for (const f of sy.floors) shiftRect(f, ox, oy);
          for (const w of sy.walls) shiftRect(w, ox, oy);
          for (const dr of sy.doors) {
            dr.pos.x += ox;
            dr.pos.y += oy;
            if (!dr.door.id.startsWith(pfx)) {
              dr.door.id = pfx + dr.door.id;
              if (dr.door.cells) shiftRect(dr.door.cells, ox, oy);
            }
          }
          if (sy.rooms) {
            for (const rm of sy.rooms) shiftRoom(rm, ox, oy);
          }
        }
      }
    }

    for (const a of slice.actors) {
      a.pos.x += ox;
      a.pos.y += oy;
      a.homeRegionId = zoneId;
      if (a.doorId && !a.doorId.startsWith(pfx)) a.doorId = pfx + a.doorId;
      if (a.aiAnchor) { a.aiAnchor.x += ox; a.aiAnchor.y += oy; }
      if (a.aiPost) { a.aiPost.x += ox; a.aiPost.y += oy; }
      if (a.confine) { a.confine.x += ox; a.confine.y += oy; }
      if (a.movementTether) {
        const saved = savedMovementTether(a);
        if (saved) {
          saved.point.x += ox;
          saved.point.y += oy;
          a.movementTether = restoreMovementTether(saved);
        }
      }
      if (a.patrolRoute) {
        for (const pt of a.patrolRoute) { pt.x += ox; pt.y += oy; }
        a.roamsCrossRegion = true;
      }
      if (a.tag === 'hunt_beast' || a.tag === 'migrant' || a.tag === 'brigand' || a.tag === 'warlord') {
        a.roamsCrossRegion = true;
      }
    }

    for (const c of slice.chests) { c.pos.x += ox; c.pos.y += oy; }
    for (const s of slice.shrines) { s.pos.x += ox; s.pos.y += oy; }
    for (const a of slice.altars) { a.pos.x += ox; a.pos.y += oy; }
    for (const f of slice.fonts) { f.pos.x += ox; f.pos.y += oy; }
    for (const sp of slice.spires) { sp.pos.x += ox; sp.pos.y += oy; }
    for (const rf of slice.rifts) { rf.pos.x += ox; rf.pos.y += oy; }
    for (const py of slice.pyres) { py.pos.x += ox; py.pos.y += oy; }
    for (const dg of slice.digs) { dg.pos.x += ox; dg.pos.y += oy; }
    for (const oc of slice.occs) { oc.x += ox; oc.y += oy; }
    for (const pz of slice.puzzles) { pz.at.x += ox; pz.at.y += oy; }
    for (const hn of slice.harvestNodes) { hn.pos.x += ox; hn.pos.y += oy; }
    for (const cm of slice.caveEntrances) { cm.pos.x += ox; cm.pos.y += oy; }
    for (const ex of slice.portalExits) { ex.pos.x += ox; ex.pos.y += oy; }
    for (const enc of slice.encounters) { enc.pos.x += ox; enc.pos.y += oy; }

    if (slice.procession) {
      slice.procession.startPos.x += ox;
      slice.procession.startPos.y += oy;
      slice.procession.dest.x += ox;
      slice.procession.dest.y += oy;
    }
    for (const c of slice.theaterSpots.camps) { c.x += ox; c.y += oy; }
    for (const p of slice.theaterSpots.pois) { p.x += ox; p.y += oy; }

    for (const h of slice.zoneHollows) {
      if (!h.id.startsWith(pfx)) h.id = pfx + h.id;
      shiftRect(h.rect, ox, oy);
      for (const sm of h.seams) { sm.x += ox; sm.y += oy; }
    }
    const nextOpenedHollows = new Set<string>();
    for (const hid of slice.openedHollows) {
      nextOpenedHollows.add(hid.startsWith(pfx) ? hid : pfx + hid);
    }
    slice.openedHollows = nextOpenedHollows;

    for (const ax of slice.zoneAnnexSpecs) {
      ax.face.x += ox;
      ax.face.y += oy;
      shiftRect(ax.rect, ox, oy);
      if (ax.carve) for (const cr of ax.carve) shiftRect(cr, ox, oy);
    }
  }

  private activateRegion(zoneId: string, fromZoneId: string | undefined, silentBanner: boolean): void {
    const rt = this.mounted.get(zoneId);
    if (!rt) return;

    // Save outgoing active region's runtime pointers before switching.
    if (this.world.zone && this.world.zone.id !== zoneId) {
      this.syncActiveRuntimeFromWorld();
    }

    const firstVisit = !this.world.visited.has(zoneId);
    const altarIdx = rt.offering?.altarObj ? this.world.altars.indexOf(rt.offering.altarObj) : -1;
    const resolvedOffering = rt.offering && altarIdx >= 0
      ? { altarIdx, offered: rt.offering.offered, need: rt.offering.need }
      : null;

    this.world.applySeamlessActiveRegion(rt, resolvedOffering, fromZoneId, firstVisit);

    // Ensure any newly charted 2-ring frontiers get atlas seats right away.
    if (firstVisit) {
      this.syncAtlasSeats();
    }

    // Classic Diablo 2 area-entry title (throttled per region so border straddling never spams).
    const lastBanner = this.bannerCooldown.get(zoneId) ?? -999;
    if (!silentBanner && this.world.time - lastBanner >= 8) {
      this.bannerCooldown.set(zoneId, this.world.time);
      const p = this.world.player;
      this.world.text(vec(p.pos.x, p.pos.y - 46), rt.def.name, rt.def.theme.accent, 24);
    }
  }

  private syncActiveRuntimeFromWorld(): void {
    const cur = this.mounted.get(this.world.zone?.id);
    if (!cur) return;
    const state = this.world.readSeamlessActiveRegionState();
    cur.objectiveDone = state.objectiveDone;
    cur.objectiveLost = state.objectiveLost;
    cur.cull = state.cull;
    if (state.offering) {
      cur.offering = {
        offered: state.offering.offered,
        need: state.offering.need,
        altarObj: this.world.altars[state.offering.altarIdx] ?? cur.offering?.altarObj ?? null,
      };
    } else {
      cur.offering = null;
    }
    cur.procession = state.procession;
    cur.wave = state.wave;
    cur.waveActive = state.waveActive;
    cur.charBorn = state.charBorn;
    cur.openedHollows = state.openedHollows;
    cur.annexOpen = state.annexOpen;
  }

  private refreshWorldDerivedLists(): void {
    this.world.reattachSeamlessWells();
  }

  private buildLocalZoneMemory(rt: MountedRegionRuntime): ReturnType<SeamlessCoordinator['makeMemoObject']> | null {
    const z = rt.def;
    if (z.boundless || (z.objective.kind === 'safe' && !ZONE_MEMORY_CFG.rememberSafeZones)
      || !this.world.visited.has(z.id)) {
      return null;
    }
    return this.makeMemoObject(rt);
  }

  private makeMemoObject(rt: MountedRegionRuntime) {
    const z = rt.def;
    const ox = rt.seat.originPx.x, oy = rt.seat.originPx.y;
    const pfx = `${z.id}:`;

    const enemies = [];
    for (const a of this.world.actors) {
      if (a.dead || a.team !== 'enemy' || !a.fromZoneGen || !a.defId || a.doorId) continue;
      if (a.homeRegionId !== z.id) continue;
      const savedTether = savedMovementTether(a);
      if (savedTether) { savedTether.point.x -= ox; savedTether.point.y -= oy; }
      enemies.push({
        defId: a.defId,
        level: a.level,
        x: a.pos.x - ox,
        y: a.pos.y - oy,
        life: a.life,
        faction: a.faction,
        rarity: a.rarity,
        tag: a.tag,
        ...(a.magicPack ? { magicPack: JSON.parse(JSON.stringify(a.magicPack)) } : {}),
        movementTether: savedTether,
        ...(a.encounterGroup ? { encounterGroup: { ...a.encounterGroup } } : {}),
        name: a.name,
        ...(a.tier ? { tier: a.tier } : {}),
        ...(a.aiAwakened ? { aiAwakened: 1 as const } : {}),
      });
    }

    let doorState: Record<string, 'open' | 'broken'> | undefined;
    for (const d of this.world.doodads) {
      if (d.regionId !== z.id || !d.door || (!d.door.open && !d.door.broken)) continue;
      const rawId = d.door.id.startsWith(pfx) ? d.door.id.slice(pfx.length) : d.door.id;
      (doorState ??= {})[rawId] = d.door.broken ? 'broken' : 'open';
    }

    // Filter chests, shrines, altars, and drops belonging to this region and shift -(ox, oy).
    const localContents = this.captureLocalRegionContents(z.id, ox, oy);

    let procession: {
      lost?: boolean; started?: boolean;
      x?: number; y?: number; life?: number;
      sx?: number; sy?: number; destIdx?: number;
    } | undefined;
    if (z.objective.kind === 'procession' && !rt.objectiveDone) {
      const pr = rt.procession;
      const cart = pr?.cartId != null ? this.world.actorById(pr.cartId) : null;
      if (rt.objectiveLost || (pr && (!cart || cart.dead))) {
        procession = { lost: true, ...(pr?.destIdx != null ? { destIdx: pr.destIdx } : {}) };
      } else if (pr && cart) {
        procession = {
          started: pr.started,
          x: cart.pos.x - ox,
          y: cart.pos.y - oy,
          life: cart.life,
          sx: pr.startPos.x - ox,
          sy: pr.startPos.y - oy,
          ...(pr.destIdx != null ? { destIdx: pr.destIdx } : {}),
        };
      }
    }

    const hollows = [...rt.openedHollows].map(h => h.startsWith(pfx) ? h.slice(pfx.length) : h);

    return {
      seed: rt.seed,
      enemies,
      savedAt: this.world.time,
      doorState,
      contents: localContents,
      ...(hollows.length ? { hollows } : {}),
      ...(rt.annexOpen.size ? { annexOpen: [...rt.annexOpen] } : {}),
      ...(z.objective.kind === 'waves' ? { wave: rt.wave, waveActive: rt.waveActive } : {}),
      ...(z.objective.kind === 'beacon' && rt.spires.length ? { spireCharges: rt.spires.map(s => s.charge) } : {}),
      ...(z.objective.kind === 'rifts' && rt.rifts.length ? { riftCharges: rt.rifts.map(s => s.charge) } : {}),
      ...(z.objective.kind === 'pyres' && rt.pyres.length ? { pyreCharges: rt.pyres.map(s => s.charge) } : {}),
      ...(z.objective.kind === 'unearth' && rt.digs.length ? { digCharges: rt.digs.map(s => s.charge) } : {}),
      ...(rt.occs.length ? { occSprung: rt.occs.map(s => s.state === 'sprung' ? 1 : 0) } : {}),
      ...(rt.harvestNodes.length ? { harvestSpent: rt.harvestNodes.map(n => n.spent ? 1 : 0) } : {}),
      ...(procession ? { procession } : {}),
      ...(z.objective.kind === 'offering' && rt.offering ? { altarOffered: rt.offering.offered } : {}),
      ...(z.objective.kind === 'clear' && rt.cull ? { cullKills: rt.cull.kills, cullNeed: rt.cull.need } : {}),
      ...(rt.puzzles.some(r => r.done) ? { puzzlesDone: rt.puzzles.filter(r => r.done).map(r => r.id) } : {}),
      ...(rt.charBorn !== undefined ? { charBorn: rt.charBorn } : {}),
    };
  }

  private captureLocalRegionContents(zoneId: string, ox: number, oy: number): ZoneContents {
    const chests = this.world.chests.filter(c => this.itemRegion.get(c) === zoneId);
    const shrines = this.world.shrines.filter(s => this.itemRegion.get(s) === zoneId);
    const altars = this.world.altars.filter(a => this.itemRegion.get(a) === zoneId);
    const drops = this.world.drops.filter((d: GemDrop) => this.itemRegion.get(d) === zoneId);
    const view = { chests, shrines, altars, drops } as unknown as World;
    const captured = captureZoneContents(view);
    for (const c of captured.chests) { c.pos.x -= ox; c.pos.y -= oy; }
    for (const s of captured.shrines) { s.pos.x -= ox; s.pos.y -= oy; }
    for (const a of captured.altars) { a.pos.x -= ox; a.pos.y -= oy; }
    for (const d of captured.drops) { d.pos.x -= ox; d.pos.y -= oy; }
    return captured;
  }

  private updateCrossBorderSkirmishes(_dt: number): void {
    const heroPos = this.world.player.pos;
    for (const seam of this.atlas.seams.values()) {
      if (seam.locked || seam.style === 'sanctuary_gate') continue;
      const rtA = this.mounted.get(seam.aId);
      const rtB = this.mounted.get(seam.bId);
      if (!rtA || !rtB) continue;
      if (rtA.def.objective.kind === 'safe' || rtB.def.objective.kind === 'safe') continue;

      // Only stage active border skirmishes within audible/tactical reach of the player.
      const mid = vec((seam.mouthA.x + seam.mouthB.x) / 2, (seam.mouthA.y + seam.mouthB.y) / 2);
      const dHero = dist(heroPos, mid);
      if (dHero < 260 || dHero > 2200) continue;

      const nextOk = this.skirmishCooldown.get(seam.key) ?? 0;
      if (this.world.time < nextOk) continue;

      const ownA = this.world.sim.faction.owner(seam.aId);
      const ownB = this.world.sim.faction.owner(seam.bId);
      let raiderFaction: string | null = null;
      let fromRt: MountedRegionRuntime = rtA;
      let toRt: MountedRegionRuntime = rtB;
      let entryMouth: Vec2 = seam.mouthA;
      let targetMouth: Vec2 = seam.mouthB;

      if (ownA.faction && ownB.faction && factionStance(ownA.faction, ownB.faction) === 'hostile') {
        if (ownA.power >= ownB.power) {
          raiderFaction = ownA.faction;
        } else {
          raiderFaction = ownB.faction;
          fromRt = rtB; toRt = rtA;
          entryMouth = seam.mouthB; targetMouth = seam.mouthA;
        }
      } else {
        const rivalsA = this.world.sim.faction.contestants(seam.aId);
        if (rivalsA.length >= 2) raiderFaction = rivalsA[0];
      }

      this.skirmishCooldown.set(seam.key, this.world.time + SEAMLESS_CFG.skirmishCooldownSec + rand(0, 20));
      if (!raiderFaction || !FACTIONS[raiderFaction]?.table?.length) continue;

      const roster = FACTIONS[raiderFaction]!;
      const lvl = Math.max(1, Math.round((fromRt.def.level + toRt.def.level) / 2));
      const count = randInt(3, 5);
      const spawnCenter = vec(
        (entryMouth.x + (fromRt.seat.originPx.x + fromRt.seat.w / 2)) * 0.5,
        (entryMouth.y + (fromRt.seat.originPx.y + fromRt.seat.h / 2)) * 0.5,
      );
      const goalInTarget = toRt.theaterSpots.camps[0]
        ?? vec(
          (targetMouth.x + (toRt.seat.originPx.x + toRt.seat.w / 2)) * 0.5,
          (targetMouth.y + (toRt.seat.originPx.y + toRt.seat.h / 2)) * 0.5,
        );

      const squad: Actor[] = [];
      let leader: Actor | null = null;
      for (let k = 0; k < count; k++) {
        const defId = this.world.pickMonsterFromTableForSeamless(roster.table, lvl);
        if (!defId || !MONSTERS[defId]) continue;
        const m = this.world.spawnSeamlessRaider(defId, lvl, raiderFaction, k === 0);
        const p = this.world.clampPos(
          vec(spawnCenter.x + rand(-55, 55), spawnCenter.y + rand(-55, 55)),
          m.radius,
        );
        m.pos = p;
        m.homeRegionId = fromRt.zoneId;
        m.roamsCrossRegion = true;
        if (k === 0) leader = m;
        this.world.actors.push(m);
        squad.push(m);
      }
      if (leader) {
        leader.patrolRoute = [vec(entryMouth.x, entryMouth.y), vec(goalInTarget.x, goalInTarget.y)];
        leader.patrolIdx = 0;
        for (const m of squad) {
          if (m !== leader) m.patrolFollow = leader.id;
        }
      }
    }
  }
}
