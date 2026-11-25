// ---------------------------------------------------------------------------
// SEAMLESS WORLD COORDINATOR — mounts main's unchanged ZoneDef + generateLayout
// regions onto one continuous world-space TiledWalkField, streams neighbor
// regions in/out into standard ZoneMemory, switches active region pointers on
// border crossing in O(1) with zero coordinate rebase, enforces Sanctuary town
// gates, and drives cross-border enemy pursuit + faction skirmishes.
// ---------------------------------------------------------------------------

import { angleTo, clamp, dist, rand, randInt, vec, type Vec2 } from '../core/math';
import { FACTIONS, factionStance, MONSTERS } from '../data/monsters';
import { START_ZONE, type ZoneDef, type ZoneExitDef, type ZoneTheme } from '../data/zones';
type Dir = ZoneExitDef['side'];
import { GridWalkField } from '../world/gridWalk';
import {
  BORDER_DOODAD_SIDE, compactInPlace, isSeamlessSurfaceZone, SEAMLESS_CFG, SeamlessAtlasLayout,
  type RegionSeatRect, type SeamCrossing, type ThemeBlendSample, type ThemeWeightSample,
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
  playerCorpses: World['playerCorpses'];
  spires: StagedHoldFixture[];
  rifts: StagedHoldFixture[];
  pyres: StagedHoldFixture[];
  digs: StagedHoldFixture[];
  occs: OccSite[];
  puzzles: PuzzleRun[];
  harvestNodes: World['harvestNodes'];
  caveEntrances: Parameters<World['pushSeamlessPrivateFixtures']>[0];
  portalExits: ZoneExit[];
  dimGates: { pos: Vec2; dimId: string; radius: number }[];
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
  enteredRuntimes: boolean;
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

interface PendingRegionMount {
  zoneId: string;
  fromZoneId?: string;
  stage: 0 | 1 | 2;
  slice?: StagedRegionSlice;
}

export class SeamlessCoordinator {
  active = false;
  groundCacheToken: object = {};
  readonly atlas: SeamlessAtlasLayout;
  readonly walk = new TiledWalkField();
  readonly mounted = new Map<string, MountedRegionRuntime>();
  private readonly pendingMounts = new Map<string, PendingRegionMount>();
  private readonly itemRegion = new WeakMap<object, string>();
  private readonly borderDoodads = new WeakSet<Doodad>();
  private readonly holdfastRolled = new Set<string>();
  private readonly bannerCooldown = new Map<string, number>();
  private readonly skirmishCooldown = new Map<string, number>();
  private lastSyncedZoneCount = -1;
  private streamTick = 0;
  private mountedSeatList: RegionSeatRect[] = [];
  private mountedSanctuarySeats: RegionSeatRect[] = [];

  constructor(private readonly world: World) {
    this.atlas = new SeamlessAtlasLayout(world.manifest.seed);
  }

  private rebuildMountedSeatList(): void {
    this.mountedSeatList.length = 0;
    this.mountedSanctuarySeats.length = 0;
    for (const [id, rt] of this.mounted) {
      this.mountedSeatList.push(rt.seat);
      if (id === START_ZONE || rt.def.objective.kind === 'safe') {
        this.mountedSanctuarySeats.push(rt.seat);
      }
    }
  }

  resetAll(reseed?: number): void {
    const hadMounted = this.mounted.size > 0 || this.active;
    this.mounted.clear();
    this.pendingMounts.clear();
    this.mountedSeatList.length = 0;
    this.mountedSanctuarySeats.length = 0;
    this.walk.clear();
    this.atlas.reset(reseed ?? this.world.manifest.seed);
    this.skirmishCooldown.clear();
    this.bannerCooldown.clear();
    this.lastSyncedZoneCount = -1;
    this.streamTick = 0;
    this.groundCacheToken = {};
    this.active = false;
    if (hadMounted && this.world.seats.length > 0) {
      this.world.clearWorldEntitiesForSeamlessTransition();
    }
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
    const sanc = this.mountedSanctuarySeats;
    for (let i = 0; i < sanc.length; i++) {
      const s = sanc[i];
      if (wx >= s.originPx.x && wx <= s.originPx.x + s.w && wy >= s.originPx.y && wy <= s.originPx.y + s.h) {
        return true;
      }
    }
    return false;
  }

  /** Spatial ground-theme blender for GroundRenderer: uses ALL seated atlas
   *  regions (`this.atlas.seatList`) so border chunks already blend smoothly
   *  toward charted neighbors even before background streaming mounts them! */
  themeAt(wx: number, wy: number, reuseScratch = false): ThemeBlendSample {
    return this.atlas.sampleThemeAt(wx, wy, this.world.zoneMap, this.world.zone.theme, this.atlas.seatList, reuseScratch);
  }

  themeWeightsAt(wx: number, wy: number, out?: ThemeWeightSample, onlySeats?: readonly RegionSeatRect[]): ThemeWeightSample {
    return this.atlas.sampleThemeWeightsAt(wx, wy, this.world.zoneMap, this.world.zone.theme, onlySeats ?? this.atlas.seatList, out);
  }

  seatsNearRect(x0: number, y0: number, x1: number, y1: number, pad: number, out: RegionSeatRect[]): RegionSeatRect[] {
    return this.atlas.seatsNearRect(x0, y0, x1, y1, pad, out);
  }

  /** Ring-1 drowsy AI predicate: actors beyond liveAiRadiusPx tick at 1/4 rate
   *  unless actively pursuing a player-party member. */
  actorDrowsy(a: Actor): boolean {
    if (!this.active || a.isMinion() || a.team === 'player') return false;
    if (a.aggroed && a.aiTargetId === undefined) return false;
    if (a.aiTargetId !== undefined) {
      const tgt = this.world.actorById(a.aiTargetId);
      if (!tgt || tgt.team === 'player') return false;
    }
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

    // If not already active, initialize the continuous surface arena & walk field
    // and clear any discrete/prior-session entities so nothing ever stacks.
    if (!this.active) {
      this.mounted.clear();
      this.pendingMounts.clear();
      this.mountedSeatList.length = 0;
      this.mountedSanctuarySeats.length = 0;
      this.walk.clear();
      this.world.clearWorldEntitiesForSeamlessTransition();
      this.groundCacheToken = {};
      this.active = true;
    }

    this.world.prepareSeamlessZoneGraph(startDef, { fullHorizon: true });
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
    let returnedThroughPortal = false;
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
        const portalBack = this.world.exits.find(ex => this.itemRegion.get(ex) === startZoneId && ex.to === opts.fromZoneId);
        if (portalBack) {
          const center = vec(anchorSeat.originPx.x + anchorSeat.w / 2, anchorSeat.originPx.y + anchorSeat.h / 2);
          const ang = angleTo(portalBack.pos, center);
          landingWorld = vec(portalBack.pos.x + Math.cos(ang) * 90, portalBack.pos.y + Math.sin(ang) * 90);
          returnedThroughPortal = true;
        } else {
          landingWorld = vec(anchorRuntime.zoneEntry.x, anchorRuntime.zoneEntry.y);
        }
      }
    } else if (anchorRuntime.spawnAtWorld) {
      landingWorld = vec(anchorRuntime.spawnAtWorld.x, anchorRuntime.spawnAtWorld.y);
    } else {
      landingWorld = vec(anchorRuntime.zoneEntry.x, anchorRuntime.zoneEntry.y);
    }

    // Activate `startZoneId` as the current active region on World.
    this.activateRegion(startZoneId, opts?.fromZoneId, true);
    this.world.landPartyAtSeamless(landingWorld, opts?.exactTier ?? 0);
    if (returnedThroughPortal) {
      this.world.armSeamlessExitGrace();
    }

    // Mount immediate ringInPx surface neighbors synchronously at boot (including any
    // 2-hop neighbor brought within ringInPx once 1-hop neighbors seat) so walking out
    // of town or waking from a save has zero border pop-in and zero Frame-1 mount spike.
    this.mountApproachedNeighbors(Infinity, true);
    this.mountApproachedNeighbors(Math.max(0, SEAMLESS_CFG.maxMountedRegions - this.mounted.size), false);
    this.refreshWorldDerivedLists();
  }

  /** Ensure `targetZoneId` and its nearby ring are mounted on the ALREADY-LIVE
   *  seamless surface (for fast waypoint travel or Town Portal jumps without
   *  tearing down shared mounted ground!). */
  travelOnSurfaceTo(targetZoneId: string, localSpot?: Vec2, tier = 0): Vec2 {
    const def = this.world.zoneMap[targetZoneId];
    if (!def) return vec(this.world.player.pos.x, this.world.player.pos.y);
    this.world.prepareSeamlessZoneGraph(def, { fullHorizon: true });
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
    this.pendingMounts.clear();
    this.syncActiveRuntimeFromWorld();
    this.snapshotMountedRegionsToMemory(true);
    this.mounted.clear();
    this.mountedSeatList.length = 0;
    this.mountedSanctuarySeats.length = 0;
    this.walk.clear();
    this.active = false;
    this.groundCacheToken = {};
    this.world.clearWorldEntitiesForSeamlessTransition();
  }

  /** Per-frame seamless coordinator tick: tracks border crossings, streams
   *  approached regions in across 3 micro-stages (eliminating single-frame
   *  generation hitches), demotes distant regions in O(N), opens unlocked
   *  seams, and drives cross-border faction warband raids. */
  update(dt: number): void {
    if (!this.active) return;
    this.streamTick++;

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
    if (candId && candId !== curId) {
      if (this.pendingMounts.has(candId)) {
        this.flushPendingMount(candId);
      }
      if (this.mounted.has(candId)) {
        if (!curRt) {
          crossedTo = candId;
        } else {
          const nextSeat = this.mounted.get(candId)!.seat;
          const inDepthX = Math.min(heroPos.x - nextSeat.originPx.x, nextSeat.originPx.x + nextSeat.w - heroPos.x);
          const inDepthY = Math.min(heroPos.y - nextSeat.originPx.y, nextSeat.originPx.y + nextSeat.h - heroPos.y);
          const outPrev = pointRectDist(heroPos, curRt.seat) > 45;
          if ((inDepthX >= 36 && inDepthY >= 36) || outPrev) {
            crossedTo = candId;
          }
        }
      }
    }
    if (crossedTo) {
      this.activateRegion(crossedTo, curId, false);
    } else {
      this.syncActiveRuntimeFromWorld();
    }

    // 3a. Always demote distant regions (> ringOutPx) promptly so memory stays
    //     compact even while new approached regions are staging in `pendingMounts`.
    let ranStageThisFrame = false;
    if (this.demoteDistantRegions(2)) {
      this.refreshWorldDerivedLists();
      ranStageThisFrame = true;
    }

    // 3b. Advance at most ONE staged background mount micro-step per frame so
    //     layout generation, walk-grid copy, and border stitching never stack!
    if (!ranStageThisFrame && this.pendingMounts.size > 0) {
      const job = this.pendingMounts.values().next().value as PendingRegionMount;
      const seat = this.atlas.seats.get(job.zoneId);
      const d = seat ? this.approachDistanceTo(job.zoneId, seat) : 0;
      if (seat && d > SEAMLESS_CFG.ringOutPx) {
        this.pendingMounts.delete(job.zoneId);
      } else if (seat && d <= 280) {
        // Player dashed right up to the border: finish immediately so zero pop-in occurs!
        this.flushPendingMount(job.zoneId);
        ranStageThisFrame = true;
      } else if (seat && d <= 720 && job.stage === 0) {
        // Player is sprinting rapidly toward this border: run Stage 0 (graph/seat, <0.5ms)
        // + Stage 1 (layout build) together so Stage 2 commits cleanly on the next frame!
        this.stepPendingMount(job);
        if (this.pendingMounts.has(job.zoneId)) this.stepPendingMount(job);
        ranStageThisFrame = true;
      } else {
        this.stepPendingMount(job);
        ranStageThisFrame = true;
      }
    }

    // 3c. Enqueue an approached neighbor into the 3-stage pipeline immediately
    //     (scanning the ~4 frontier exits costs <0.01ms, avoiding 4-frame sprint delays).
    if (!ranStageThisFrame && this.pendingMounts.size === 0) {
      if (this.enqueueApproachedNeighbor()) {
        ranStageThisFrame = true;
      }
    }

    // 4. Open any previously locked border seams whose lock cleared.
    if (crossedTo || (this.streamTick & 7) === 0) {
      for (const seam of this.atlas.seams.values()) {
        if (!seam.locked) continue;
        if (!this.mounted.has(seam.aId) && !this.mounted.has(seam.bId)) continue;
        if (!this.isSeamLockedNow(seam)) {
          this.atlas.openSeamInPlace(seam, this.walk, this.world.doodads);
          this.world.markDoodadsChanged();
        }
      }
    }

    // 5. Cross-region faction border raids (1Hz check; raid cooldown is 75s).
    if (this.streamTick % 60 === 0) {
      this.updateCrossBorderSkirmishes(dt);
    }
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
        rt.def, rt.seat, this.walk, mountedSet, this.world.doodads, undefined, false, this.world.zoneMap);
      this.world.doodads.push(...borderDoodads);
      this.world.markDoodadsChanged();
    }
  }

  /** Ensure a specific surface neighbor is seated and mounted immediately (e.g.
   *  when a Great Hunt beast bolts across a border mouth into `zoneId`). */
  ensureMounted(zoneId: string, fromZoneId?: string): RegionSeatRect | undefined {
    if (!this.active) return undefined;
    const def = this.world.zoneMap[zoneId];
    if (!isSeamlessSurfaceZone(def)) return undefined;
    this.world.prepareSeamlessZoneGraph(def!);
    this.syncAtlasSeats();
    if (!this.mounted.has(zoneId)) {
      this.mountRegion(zoneId, fromZoneId ?? this.world.zone.id);
      this.refreshWorldDerivedLists();
    }
    return this.atlas.seats.get(zoneId);
  }

  /** Synthesize world-space exit anchors for `zoneId` combining physical border
   *  seam mouths, uncharted `'?'` frontier rim points, and any owned discrete portals. */
  exitAnchorsFor(zoneId: string): { pos: Vec2; radius: number; to: string; defIndex: number; label: string; locked: boolean }[] {
    const out: { pos: Vec2; radius: number; to: string; defIndex: number; label: string; locked: boolean }[] = [];
    if (!this.active) return out;
    const def = this.world.zoneMap[zoneId];
    const seat = this.atlas.seats.get(zoneId);
    if (!def || !seat) return out;

    const seenDefIdx = new Set<number>();
    for (let i = 0; i < this.world.exits.length; i++) {
      const ex = this.world.exits[i];
      if (this.itemRegion.get(ex) !== zoneId) continue;
      seenDefIdx.add(ex.defIndex);
      out.push({
        pos: vec(ex.pos.x, ex.pos.y),
        radius: ex.radius,
        to: ex.to,
        defIndex: ex.defIndex,
        label: ex.label,
        locked: this.world.isExitLocked(ex),
      });
    }

    for (let i = 0; i < def.exits.length; i++) {
      if (seenDefIdx.has(i)) continue;
      const ed = def.exits[i];
      if (ed.to !== '?' && !ed.crossDim) {
        const seam = this.findSeamBetween(zoneId, ed.to);
        if (seam) {
          const mouth = seam.aId === zoneId ? seam.mouthA : seam.mouthB;
          const destName = this.world.zoneMap[ed.to]?.name ?? ed.to;
          out.push({
            pos: vec(mouth.x, mouth.y),
            radius: 36,
            to: ed.to,
            defIndex: i,
            label: destName,
            locked: seam.locked,
          });
          continue;
        }
      }
      // Uncharted '?' or unseated edge fallback along the region's world-space rim:
      const t = ed.at ?? 0.5;
      const inset = 64;
      const lx = ed.side === 'n' || ed.side === 's'
        ? clamp(seat.w * t, inset, seat.w - inset)
        : (ed.side === 'w' ? inset : seat.w - inset);
      const ly = ed.side === 'w' || ed.side === 'e'
        ? clamp(seat.h * t, inset, seat.h - inset)
        : (ed.side === 'n' ? inset : seat.h - inset);
      out.push({
        pos: vec(seat.originPx.x + lx, seat.originPx.y + ly),
        radius: 36,
        to: ed.to,
        defIndex: i,
        label: ed.to === '?' ? 'Uncharted' : (this.world.zoneMap[ed.to]?.name ?? ed.to),
        locked: this.world.isSeamlessLinkLocked(def, ed, i),
      });
    }
    return out;
  }

  /** Lookup a namespaced hollow spec across any currently mounted region so
   *  cross-border strikes open secret walls cleanly even before crossing. */
  findMountedHollow(id: string): { rt: MountedRegionRuntime; spec: HollowSpec } | null {
    if (!this.active) return null;
    for (const rt of this.mounted.values()) {
      const spec = rt.zoneHollows.find(h => h.id === id);
      if (spec) return { rt, spec };
    }
    return null;
  }

  // -------------------------------------------------------------- internals --

  private syncAtlasSeats(): void {
    const hadMounted = this.mounted.size > 0;
    const added = this.atlas.ensureSeats(this.world.zoneMap, (fromDef, ex, idx) =>
      this.world.isSeamlessLinkLocked(fromDef, ex, idx));
    if (hadMounted && added.length > 0) {
      const halo = SEAMLESS_CFG.blendBandPx * 0.55 + 220;
      for (let i = 0; i < added.length; i++) {
        const s = added[i];
        this.walk.markDirtyRect(s.originPx.x - halo, s.originPx.y - halo, s.originPx.x + s.w + halo, s.originPx.y + s.h + halo);
      }
    }
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
    this.atlas.registerSeat(def.id, {
      zoneId: def.id,
      originPx: { x: x0, y: y0 },
      w,
      h,
      plot: { x0, y0, x1: x0 + w, y1: y0 + h },
    });
    if (this.mounted.size > 0) {
      const halo = SEAMLESS_CFG.blendBandPx * 0.55 + 220;
      this.walk.markDirtyRect(x0 - halo, y0 - halo, x0 + w + halo, y0 + h + halo);
    }
  }

  /** Distance metric shared by BOTH mount and demote predicates so their
   *  thresholds (`ringInPx` vs `ringOutPx`) are strictly disjoint and never thrash. */
  private approachDistanceTo(zoneId: string, seat: RegionSeatRect): number {
    const activeId = this.world.zone.id;
    const seam = zoneId !== activeId ? this.findSeamBetween(activeId, zoneId) : undefined;
    const activeMouth = seam ? (seam.aId === activeId ? seam.mouthA : seam.mouthB) : null;
    let minDist = Infinity;
    for (const s of this.world.seats) {
      const p = s.actor.pos;
      const dRect = pointRectDist(p, seat);
      if (dRect < minDist) minDist = dRect;
      if (activeMouth) {
        const dMouth = dist(p, activeMouth);
        if (dMouth < minDist) minDist = dMouth;
      }
    }
    return minDist;
  }

  private collectApproachedCandidates(bootNeighbors = false, preStageBonus = 0): { id: string; d: number }[] {
    let zCount = 0;
    for (const _ in this.world.zoneMap) zCount++;
    if (zCount !== this.lastSyncedZoneCount) {
      this.syncAtlasSeats();
    }

    const frontier = new Set<string>();
    for (const rt of this.mounted.values()) {
      for (const ex of rt.def.exits) {
        if (ex.to === '?' || ex.crossDim || this.mounted.has(ex.to) || this.pendingMounts.has(ex.to)) continue;
        frontier.add(ex.to);
      }
    }

    const candidates: { id: string; d: number }[] = [];
    const safeMountCeil = SEAMLESS_CFG.ringOutPx - 350;
    const reach = Math.min(safeMountCeil, SEAMLESS_CFG.ringInPx + preStageBonus);
    const atCap = !bootNeighbors && (this.mounted.size + this.pendingMounts.size >= SEAMLESS_CFG.maxMountedRegions);
    for (const id of frontier) {
      const def = this.world.zoneMap[id];
      if (!isSeamlessSurfaceZone(def)) continue;
      const seat = this.atlas.seats.get(id);
      if (!seat) continue;
      const isDirectExit = this.world.zone.exits.some(e => e.to === id && !e.crossDim);
      // When already at maxMountedRegions, only allow direct neighbors of the active
      // region to mount (replacing a distant 2-hop region), preventing 2-hop sprawl & thrash.
      if (atCap && !isDirectExit) continue;
      const d = this.approachDistanceTo(id, seat);
      const isDirect = bootNeighbors && isDirectExit;
      if (d <= reach || (isDirect && d <= safeMountCeil)) {
        candidates.push({ id, d });
      }
    }
    candidates.sort((a, b) => a.d - b.d);
    return candidates;
  }

  /** Enqueue the closest approached neighbor into the 3-frame staged pipeline and run Stage 0! */
  private enqueueApproachedNeighbor(): boolean {
    const candidates = this.collectApproachedCandidates(false, 0);
    if (!candidates.length) return false;
    const c = candidates[0];
    const job: PendingRegionMount = { zoneId: c.id, fromZoneId: this.world.zone.id, stage: 0 };
    this.pendingMounts.set(c.id, job);
    if (c.d <= 280) {
      this.flushPendingMount(c.id);
    } else {
      this.stepPendingMount(job);
    }
    return true;
  }

  private flushPendingMount(zoneId: string): void {
    const job = this.pendingMounts.get(zoneId);
    if (!job) return;
    while (!this.stepPendingMount(job)) {
      // advance remaining stages synchronously
    }
  }

  private stepPendingMount(job: PendingRegionMount): boolean {
    if (this.mounted.has(job.zoneId)) {
      this.pendingMounts.delete(job.zoneId);
      return true;
    }
    const def = this.world.zoneMap[job.zoneId];
    if (!def) {
      this.pendingMounts.delete(job.zoneId);
      return true;
    }

    if (job.stage === 0) {
      this.world.prepareSeamlessZoneGraph(def);
      this.syncAtlasSeats();
      job.stage = 1;
      return false;
    }

    const seat = this.atlas.seats.get(job.zoneId);
    if (!seat) {
      this.pendingMounts.delete(job.zoneId);
      return true;
    }

    if (job.stage === 1) {
      const localExits = this.atlas.localExitPositionsFor(def, this.world.zoneMap);
      let entryLocal = vec(seat.w / 2, seat.h / 2);
      if (job.fromZoneId) {
        const backIdx = def.exits.findIndex(e => e.to === job.fromZoneId && !e.crossDim);
        if (backIdx >= 0 && localExits[backIdx]) {
          const bp = localExits[backIdx];
          const ang = angleTo(bp, entryLocal);
          entryLocal = vec(bp.x + Math.cos(ang) * 120, bp.y + Math.sin(ang) * 120);
        }
      }
      const slice = this.world.buildRegionSliceForSeamless(def, seat, localExits, entryLocal);
      this.translateSliceToWorld(job.zoneId, def.theme, seat.originPx.x, seat.originPx.y, slice);
      job.slice = slice;
      job.stage = 2;
      return false;
    }

    this.commitPreparedSlice(job.zoneId, def, seat, job.slice!);
    this.pendingMounts.delete(job.zoneId);
    this.enforceMountedCap();
    this.refreshWorldDerivedLists();
    return true;
  }

  /** Keep live mounted regions bounded by `maxMountedRegions` by evicting the
   *  furthest non-active, non-direct-neighbor region (hysteresis-safe since `atCap`
   *  refuses to re-mount non-direct-neighbors). */
  private enforceMountedCap(): void {
    while (this.mounted.size > SEAMLESS_CFG.maxMountedRegions) {
      const activeId = this.world.zone.id;
      let victimId: string | null = null;
      let worstD = -1;
      for (const [id, rt] of this.mounted) {
        if (id === activeId) continue;
        if (this.world.zone.exits.some(e => e.to === id && !e.crossDim)) continue;
        const d = this.approachDistanceTo(id, rt.seat);
        if (d > worstD) { worstD = d; victimId = id; }
      }
      if (!victimId) break;
      this.unmountRegion(victimId);
    }
  }

  private mountApproachedNeighbors(budget: number, bootNeighbors = false): boolean {
    if (budget <= 0) return false;
    const candidates = this.collectApproachedCandidates(bootNeighbors, 0);
    if (!candidates.length) return false;

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

  private demoteDistantRegions(maxCount = Infinity): boolean {
    const activeId = this.world.zone.id;
    let distant: { id: string; d: number }[] | null = null;
    for (const [id, rt] of this.mounted) {
      if (id === activeId) continue;
      const d = this.approachDistanceTo(id, rt.seat);
      if (d <= SEAMLESS_CFG.ringOutPx) continue;
      (distant ??= []).push({ id, d });
    }
    if (!distant) return false;
    if (distant.length > 1) distant.sort((a, b) => b.d - a.d);
    const limit = Math.min(distant.length, maxCount);
    for (let i = 0; i < limit; i++) {
      this.unmountRegion(distant[i].id);
    }
    return limit > 0;
  }

  private mountRegion(zoneId: string, fromZoneId?: string): void {
    if (this.pendingMounts.has(zoneId)) {
      this.flushPendingMount(zoneId);
      return;
    }
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
    this.translateSliceToWorld(zoneId, def.theme, seat.originPx.x, seat.originPx.y, slice);
    this.commitPreparedSlice(zoneId, def, seat, slice);
  }

  private commitPreparedSlice(
    zoneId: string,
    def: ZoneDef,
    seat: RegionSeatRect,
    slice: StagedRegionSlice,
  ): void {
    const ox = seat.originPx.x, oy = seat.originPx.y;

    this.walk.beginDirtyBatch();
    try {
      // 1. Mount local GridWalkField 1:1 onto the continuous TiledWalkField!
      this.walk.mountRegion(zoneId, ox, oy, { w: seat.w, h: seat.h, shape: def.shape ?? 'rect' }, slice.walk);

      // 2. Merge already-translated slice entities into World's live arrays!
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
      for (const pc of slice.playerCorpses) { this.itemRegion.set(pc, zoneId); this.world.playerCorpses.push(pc); }
      for (const ex of slice.portalExits) { this.itemRegion.set(ex, zoneId); this.world.exits.push(ex); }
      for (const enc of slice.encounters) { this.itemRegion.set(enc, zoneId); this.world.encounters.push(enc); }
      this.world.pushSeamlessPrivateFixtures(slice.caveEntrances, slice.vocationSites, slice.dimGates, obj => {
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
        enteredRuntimes: false,
      };
      this.mounted.set(zoneId, rt);
      this.rebuildMountedSeatList();

      // 3. Compose perimeter borders, mouths, road bridges, and gate landmarks for `def`!
      const mountedSet = new Set(this.mounted.keys());
      const borderDoodads = this.atlas.composeRegionBorders(
        def, seat, this.walk, mountedSet, this.world.doodads, undefined, false, this.world.zoneMap);
      for (const bd of borderDoodads) this.borderDoodads.add(bd);
      this.world.doodads.push(...borderDoodads);

      // 4. Re-stitch ONLY the single shared side on each already-mounted neighbor
      //    (skipping redundant corridor carves & duplicate road flagstones)!
      const restitchedPartnerSides = new Set<string>();
      for (const seam of this.atlas.seamsFor(zoneId)) {
        if (seam.corridorBlocked) continue;
        const isA = seam.aId === zoneId;
        const otherId = isA ? seam.bId : seam.aId;
        const otherSide = isA ? seam.sideOnB : seam.sideOnA;
        const otherRt = this.mounted.get(otherId);
        if (!otherRt) continue;
        const sideKey = `${otherId}:${otherSide}`;
        if (restitchedPartnerSides.has(sideKey)) continue;
        restitchedPartnerSides.add(sideKey);
        this.stripBorderDoodadsOf(otherId, otherSide);
        const partnerBorder = this.atlas.composeRegionBorders(
          otherRt.def, otherRt.seat, this.walk, mountedSet, undefined, otherSide, true, this.world.zoneMap);
        for (const bd of partnerBorder) this.borderDoodads.add(bd);
        this.world.doodads.push(...partnerBorder);
      }
    } finally {
      this.walk.endDirtyBatch();
    }

    this.world.markDoodadsChanged();
  }

  private stripBorderDoodadsOf(zoneId: string, onlySide?: Dir): void {
    compactInPlace(this.world.doodads, d => {
      if (d.regionId !== zoneId || !this.borderDoodads.has(d)) return true;
      if (onlySide && BORDER_DOODAD_SIDE.get(d) !== onlySide) return true;
      return false;
    });
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

    // 2. Remove region doodads, structures, fixtures, and un-aggro'd actors in O(N) (zero splice shifting!).
    compactInPlace(this.world.doodads, d => d.regionId !== zoneId);
    compactInPlace(this.world.structures, s => s.regionId !== zoneId);
    const seatActors = new Set(this.world.seats.map(s => s.actor));
    const pPos = this.world.player.pos;
    compactInPlace(this.world.actors, a => {
      if (seatActors.has(a) || (a.owner && seatActors.has(a.owner))) return true;
      if (a.homeRegionId !== zoneId) return true;
      if (a.team === 'enemy' && a.aggroed && !a.dead) {
        const dx = a.pos.x - pPos.x, dy = a.pos.y - pPos.y;
        if (dx * dx + dy * dy < 1600 * 1600) return true;
      }
      return false;
    });
    for (const aid of rt.speakerIds) this.world.deleteSpeakerRowForSeamless(aid);

    const dropOwned = <T extends object>(arr: T[]): void => {
      compactInPlace(arr, item => this.itemRegion.get(item) !== zoneId);
    };
    dropOwned(this.world.chests);
    dropOwned(this.world.shrines);
    dropOwned(this.world.altars);
    dropOwned(this.world.fonts);
    dropOwned(this.world.playerCorpses);
    dropOwned(this.world.exits);
    dropOwned(this.world.encounters);
    dropOwned(this.world.drops);
    this.world.dropSeamlessPrivateFixtures(obj => this.itemRegion.get(obj) === zoneId);

    this.walk.beginDirtyBatch();
    try {
      this.walk.unmountRegion(zoneId, rt.seat.originPx.x - 120, rt.seat.originPx.y - 120, rt.seat.w + 240, rt.seat.h + 240);
    } finally {
      this.walk.endDirtyBatch();
    }
    this.mounted.delete(zoneId);
    this.rebuildMountedSeatList();
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
    for (const pc of slice.playerCorpses) { pc.pos.x += ox; pc.pos.y += oy; }
    for (const sp of slice.spires) { sp.pos.x += ox; sp.pos.y += oy; }
    for (const rf of slice.rifts) { rf.pos.x += ox; rf.pos.y += oy; }
    for (const py of slice.pyres) { py.pos.x += ox; py.pos.y += oy; }
    for (const dg of slice.digs) { dg.pos.x += ox; dg.pos.y += oy; }
    for (const oc of slice.occs) { oc.x += ox; oc.y += oy; }
    for (const pz of slice.puzzles) { pz.at.x += ox; pz.at.y += oy; }
    for (const hn of slice.harvestNodes) { hn.pos.x += ox; hn.pos.y += oy; }
    for (const cm of slice.caveEntrances) { cm.pos.x += ox; cm.pos.y += oy; }
    for (const ex of slice.portalExits) { ex.pos.x += ox; ex.pos.y += oy; }
    for (const dg of slice.dimGates) { dg.pos.x += ox; dg.pos.y += oy; }
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

    // Ensure newly visited region's 1-hop frontiers (just charted by applySeamlessActiveRegion)
    // seat right away without repeating a duplicate graph/forechart pass.
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

  /** Rebuild reclaimable player corpses across all currently mounted regions
   *  (called when a resumed character save grafts its death ring onto a booted
   *  seamless surface, or immediately after a survived mode respawn). */
  refreshMountedPlayerCorpses(): void {
    if (!this.active) return;
    this.world.playerCorpses = [];
    for (const [zoneId, rt] of this.mounted) {
      const ox = rt.seat.originPx.x, oy = rt.seat.originPx.y;
      for (const pc of this.world.buildPlayerCorpsesForDef(rt.def, rt.seat.originPx)) {
        const wp = this.world.clampPos(vec(pc.pos.x + ox, pc.pos.y + oy), 16, undefined, { tier: pc.tier });
        const shifted = { ...pc, pos: wp };
        this.itemRegion.set(shifted, zoneId);
        this.world.playerCorpses.push(shifted);
      }
    }
  }
}
