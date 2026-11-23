// ---------------------------------------------------------------------------
// TILED WALK FIELD — continuous 30px-cell walkability, occlusion, and region
// ownership across an unbounded surface plane.
//
// Each generated ZoneDef still builds its own local GridWalkField(w, h, 30) via
// main's unchanged generateLayout pipeline. When mounted onto the seamless
// surface at a 30px-snapped origin (ox, oy), its cells copy 1:1 into 64×64-cell
// spatial chunks (1920×1920 world px) alongside a per-cell region owner index.
//
// Consumers (World.clampPos, castGridRay in engine/los.ts, SightVeil,
// GroundRenderer, Renderer animated regions, and AI steering) read one unified
// surface with zero coordinate rebasing and zero away-zone special cases.
// ---------------------------------------------------------------------------

import { vec, type Vec2 } from '../core/math';
import { DEFAULT_CELL, GridWalkField, PATH_SCALE, WALK_CFG } from './gridWalk';
import { PATH_CFG, regionKind } from './regions';
import type { PathProfile, WalkField } from './walk';
import { clampToBounds, type Bounds } from './shape';
import { tierFloorAt } from '../engine/tiers';

/** Narrow structural contract shared by finite GridWalkField and unbounded
 *  TiledWalkField for cell-accurate raycasts, wall-edge shadows, ground bakes,
 *  and runtime door/breakable carves. */
export interface CellWalkField extends WalkField {
  readonly cellOcclusion: true;
  readonly cell: number;
  readonly cellSize: number;
  readonly cols?: number;
  readonly rows?: number;
  version: number;
  readonly dirty: { x0: number; y0: number; x1: number; y1: number; v: number }[];
  dirtyFloodV: number;
  regionAt(x: number, y: number): string;
  kindAt(x: number, y: number): string | undefined;
  fillRegion(x0: number, y0: number, x1: number, y1: number, id: string, quiet?: boolean): void;
  fillRect(x0: number, y0: number, x1: number, y1: number, walkable?: boolean): void;
  fillDisc(cx: number, cy: number, r: number, id: string): void;
  carveCorridor(ax: number, ay: number, bx: number, by: number, halfW: number): void;
}

export function isCellWalkField(w: unknown): w is CellWalkField {
  return !!(w && typeof w === 'object' && (w as { cellOcclusion?: boolean }).cellOcclusion === true);
}

const CHUNK_SHIFT = 6; // 2^6 = 64 cells per chunk axis (1920px @ 30px/cell)
const CHUNK_SIZE = 1 << CHUNK_SHIFT;
const CHUNK_MASK = CHUNK_SIZE - 1;
const CHUNK_OFF = 32768;

function chunkKey(cx: number, cy: number): number {
  return (cx + CHUNK_OFF) * 65536 + (cy + CHUNK_OFF);
}

interface TileChunk {
  /** 1 = walkable, 0 = blocked ('wall' default). */
  mask: Uint8Array;
  /** Byte index into TiledWalkField.kindList (0 = 'wall'). */
  kind: Uint8Array;
  /** Interned region owner index (0 = unclaimed / corridor / outer apron). */
  owner: Uint16Array;
  /** Advisory AI pathing block mask (1 = unbridged chasm / solid doodad; never affects collision/render). */
  navBlocked: Uint8Array;
  /** Advisory AI pathing terrain kind override (0 = use `kind`; >0 = ground doodad kind byte like bog/deep_water). */
  navKind: Uint8Array;
}

/** Sliding-window half-span in cells for Dial/BFS flow fields:
 *  radius 68 => 137×137 cells = 4110×4110 world px around the target (3× larger
 *  than liveAiRadiusPx, 2.33× faster per rebuild than 209×209). */
const NAV_HALF_CELLS = 68;
const NAV_SIDE = NAV_HALF_CELLS * 2 + 1;
const NAV_AREA = NAV_SIDE * NAV_SIDE;
/** Multi-region LRU slot count so 4–5 mounted regions' ambient wanderers +
 *  chasers never thrash cached distance fields. */
const SEAMLESS_DIST_CACHE_MAX = 160;
const DIRS_4 = [1, 0, -1, 0, 0, 1, 0, -1] as const;

interface WindowDistEntry {
  /** Origin global cell (top-left of the NAV_SIDE×NAV_SIDE window). */
  ox: number;
  oy: number;
  d: Int32Array;
  v: number;
  t: number;
  lru: number;
  p: PathProfile | null;
  tier: number;
}

export class TiledWalkField implements CellWalkField {
  readonly cellOcclusion = true as const;
  readonly cell: number;
  readonly cols: undefined = undefined;
  readonly rows: undefined = undefined;

  version = 0;
  readonly dirty: { x0: number; y0: number; x1: number; y1: number; v: number }[] = [];
  dirtyFloodV = 0;

  private navVersion = 0;
  private navSyncedVer = -1;
  private navSyncedRev = -1;
  private navSyncedGrounds = -1;

  private chunks = new Map<number, TileChunk>();
  private lastCk = -1;
  private lastCh: TileChunk | undefined = undefined;
  private kindList: string[] = ['wall'];
  private kindIdx = new Map<string, number>([['wall', 0]]);
  private kindWalkable: Uint8Array = new Uint8Array([0]);

  /** 0 = unclaimed; >=1 = mounted regionId. */
  private regionList: string[] = [''];
  private regionIdx = new Map<string, number>([['', 0]]);

  private profTables = new Map<string, { t: Uint8Array; n: number; uniform: boolean }>();
  private profIdx = new Map<string, number>();
  private distCache = new Map<number, WindowDistEntry>();
  private lruClock = 0;
  private spareDistPool: Int32Array[] = [];
  private dialRing: number[][] = [];
  private scratchQ: number[] = [];
  private scratchChunks: (TileChunk | undefined)[] = [];
  private tick = 0;
  private refreshesLeft = Infinity;
  private newBakesLeft = Infinity;

  constructor(cell = DEFAULT_CELL) {
    this.cell = cell;
  }

  get cellSize(): number { return this.cell; }

  beginFrame(): void {
    this.tick++;
    this.refreshesLeft = WALK_CFG.distRefreshPerTick;
    this.newBakesLeft = 2;
  }

  clear(): void {
    this.chunks.clear();
    this.lastCk = -1;
    this.lastCh = undefined;
    for (const e of this.distCache.values()) {
      if (this.spareDistPool.length < SEAMLESS_DIST_CACHE_MAX) this.spareDistPool.push(e.d);
    }
    this.distCache.clear();
    this.dirty.length = 0;
    this.version++;
    this.dirtyFloodV = this.version;
    this.navSyncedVer = -1;
    this.navSyncedRev = -1;
    this.navSyncedGrounds = -1;
  }

  markDirtyRect(x0: number, y0: number, x1: number, y1: number): void {
    this.pushDirty(x0, y0, x1, y1);
  }

  private pushDirty(x0: number, y0: number, x1: number, y1: number): void {
    this.version++;
    this.dirty.push({
      x0: Math.min(x0, x1), y0: Math.min(y0, y1),
      x1: Math.max(x0, x1), y1: Math.max(y0, y1),
      v: this.version,
    });
    if (this.dirty.length > WALK_CFG.dirtyMax) {
      const dropped = this.dirty.shift()!;
      this.dirtyFloodV = Math.max(this.dirtyFloodV, dropped.v);
    }
  }

  private kindByte(id: string): number {
    let b = this.kindIdx.get(id);
    if (b !== undefined) return b;
    b = this.kindList.length;
    this.kindList.push(id);
    this.kindIdx.set(id, b);
    const nextW = new Uint8Array(this.kindList.length);
    nextW.set(this.kindWalkable);
    nextW[b] = regionKind(id)?.walkable ? 1 : 0;
    this.kindWalkable = nextW;
    return b;
  }

  private internRegion(regionId: string): number {
    if (!regionId) return 0;
    let idx = this.regionIdx.get(regionId);
    if (idx !== undefined) return idx;
    idx = this.regionList.length;
    this.regionList.push(regionId);
    this.regionIdx.set(regionId, idx);
    return idx;
  }

  private chunkAt(cx: number, cy: number): TileChunk | undefined {
    const k = chunkKey(cx, cy);
    if (k === this.lastCk) return this.lastCh;
    const ch = this.chunks.get(k);
    this.lastCk = k;
    this.lastCh = ch;
    return ch;
  }

  private ensureChunk(cx: number, cy: number): TileChunk {
    const k = chunkKey(cx, cy);
    if (k === this.lastCk && this.lastCh) return this.lastCh;
    let ch = this.chunks.get(k);
    if (!ch) {
      const len = CHUNK_SIZE * CHUNK_SIZE;
      ch = {
        mask: new Uint8Array(len),
        kind: new Uint8Array(len),
        owner: new Uint16Array(len),
        navBlocked: new Uint8Array(len),
        navKind: new Uint8Array(len),
      };
      this.chunks.set(k, ch);
    }
    this.lastCk = k;
    this.lastCh = ch;
    return ch;
  }

  private setCellRaw(gx: number, gy: number, byte: number, walkable: number, ownerIdx?: number): void {
    const ch = this.ensureChunk(gx >> CHUNK_SHIFT, gy >> CHUNK_SHIFT);
    const li = ((gy & CHUNK_MASK) << CHUNK_SHIFT) | (gx & CHUNK_MASK);
    ch.kind[li] = byte;
    ch.mask[li] = walkable;
    if (ownerIdx !== undefined) ch.owner[li] = ownerIdx;
  }

  /** Set region owner explicitly on a world-space rectangle without altering terrain. */
  stampOwnerRect(x0: number, y0: number, x1: number, y1: number, regionId: string): void {
    const owner = this.internRegion(regionId);
    const a = Math.floor(Math.min(x0, x1) / this.cell);
    const b = Math.floor(Math.max(x0, x1) / this.cell);
    const c = Math.floor(Math.min(y0, y1) / this.cell);
    const d = Math.floor(Math.max(y0, y1) / this.cell);
    for (let gy = c; gy <= d; gy++) {
      for (let gx = a; gx <= b; gx++) {
        const ch = this.ensureChunk(gx >> CHUNK_SHIFT, gy >> CHUNK_SHIFT);
        ch.owner[((gy & CHUNK_MASK) << CHUNK_SHIFT) | (gx & CHUNK_MASK)] = owner;
      }
    }
  }

  /** Region ID owning the cell at world (x, y), or null for unclaimed apron/corridor. */
  ownerAt(x: number, y: number): string | null {
    const gx = Math.floor(x / this.cell), gy = Math.floor(y / this.cell);
    const ch = this.chunkAt(gx >> CHUNK_SHIFT, gy >> CHUNK_SHIFT);
    if (!ch) return null;
    const idx = ch.owner[((gy & CHUNK_MASK) << CHUNK_SHIFT) | (gx & CHUNK_MASK)];
    return idx > 0 ? (this.regionList[idx] ?? null) : null;
  }

  /** Mount a zone's local GridWalkField (or rasterize its convex Bounds when
   *  localWalk is null) at 30px-aligned world origin (ox, oy). */
  mountRegion(
    regionId: string,
    ox: number,
    oy: number,
    arena: Bounds,
    localWalk: GridWalkField | null,
  ): void {
    const owner = this.internRegion(regionId);
    const baseGx = Math.round(ox / this.cell);
    const baseGy = Math.round(oy / this.cell);
    const cols = localWalk ? localWalk.cols : Math.max(1, Math.ceil(arena.w / this.cell));
    const rows = localWalk ? localWalk.rows : Math.max(1, Math.ceil(arena.h / this.cell));
    const groundByte = this.kindByte('ground');

    // Fast chunk-row bulk transfer for standard rectangular grids (zero per-cell
    // object allocations, string lookups, or Map.get calls!).
    const isPlainRect = (arena.shape ?? 'rect') === 'rect' && !arena.pieces?.length;
    if (isPlainRect && localWalk) {
      const kList = localWalk.kindList;
      const srcKind = localWalk.kind;
      const lut = new Uint8Array(kList.length);
      for (let i = 0; i < kList.length; i++) {
        lut[i] = kList[i] === 'ground' ? groundByte : this.kindByte(kList[i]);
      }
      const walkLut = this.kindWalkable;
      const cx0 = baseGx >> CHUNK_SHIFT, cx1 = (baseGx + cols - 1) >> CHUNK_SHIFT;
      const cy0 = baseGy >> CHUNK_SHIFT, cy1 = (baseGy + rows - 1) >> CHUNK_SHIFT;
      for (let cy = cy0; cy <= cy1; cy++) {
        const gyStart = Math.max(baseGy, cy << CHUNK_SHIFT);
        const gyEnd = Math.min(baseGy + rows, (cy + 1) << CHUNK_SHIFT);
        for (let cx = cx0; cx <= cx1; cx++) {
          const ch = this.ensureChunk(cx, cy);
          const gxStart = Math.max(baseGx, cx << CHUNK_SHIFT);
          const gxEnd = Math.min(baseGx + cols, (cx + 1) << CHUNK_SHIFT);
          for (let gy = gyStart; gy < gyEnd; gy++) {
            const srcRow = (gy - baseGy) * cols - baseGx;
            const dstRow = (gy & CHUNK_MASK) << CHUNK_SHIFT;
            for (let gx = gxStart; gx < gxEnd; gx++) {
              const b = lut[srcKind[srcRow + gx]];
              const li = dstRow | (gx & CHUNK_MASK);
              ch.kind[li] = b;
              ch.mask[li] = walkLut[b];
              ch.owner[li] = owner;
            }
          }
        }
      }
      this.pushDirty(ox, oy, ox + cols * this.cell, oy + rows * this.cell);
      return;
    }

    const pt = { x: 0, y: 0 };
    for (let ly = 0; ly < rows; ly++) {
      const py = (ly + 0.5) * this.cell;
      for (let lx = 0; lx < cols; lx++) {
        const px = (lx + 0.5) * this.cell;
        pt.x = px; pt.y = py;
        const cl = clampToBounds(pt, 2, arena);
        const inShape = Math.abs(cl.x - px) < 0.5 && Math.abs(cl.y - py) < 0.5;
        let kindId = 'wall';
        if (inShape) {
          kindId = localWalk ? localWalk.regionAt(px, py) : 'ground';
        }
        const byte = kindId === 'ground' ? groundByte : this.kindByte(kindId);
        const walk = this.kindWalkable[byte];
        this.setCellRaw(baseGx + lx, baseGy + ly, byte, walk, owner);
      }
    }
    this.pushDirty(ox, oy, ox + cols * this.cell, oy + rows * this.cell);
  }

  /** Extract a mounted region's current cells back into a local GridWalkField
   *  (preserving broken walls / opened doors for ZoneMemory) and clear cells
   *  owned by `regionId` back to unmounted wall. */
  unmountRegion(regionId: string, ox: number, oy: number, w: number, h: number): void {
    const owner = this.regionIdx.get(regionId);
    if (!owner) return;
    const baseGx = Math.round(ox / this.cell);
    const baseGy = Math.round(oy / this.cell);
    const cols = Math.max(1, Math.ceil(w / this.cell));
    const rows = Math.max(1, Math.ceil(h / this.cell));
    const cx0 = baseGx >> CHUNK_SHIFT, cx1 = (baseGx + cols - 1) >> CHUNK_SHIFT;
    const cy0 = baseGy >> CHUNK_SHIFT, cy1 = (baseGy + rows - 1) >> CHUNK_SHIFT;
    for (let cy = cy0; cy <= cy1; cy++) {
      const gyStart = Math.max(baseGy, cy << CHUNK_SHIFT);
      const gyEnd = Math.min(baseGy + rows, (cy + 1) << CHUNK_SHIFT);
      for (let cx = cx0; cx <= cx1; cx++) {
        const k = chunkKey(cx, cy);
        const ch = this.chunks.get(k);
        if (!ch) continue;
        const gxStart = Math.max(baseGx, cx << CHUNK_SHIFT);
        const gxEnd = Math.min(baseGx + cols, (cx + 1) << CHUNK_SHIFT);
        for (let gy = gyStart; gy < gyEnd; gy++) {
          const dstRow = (gy & CHUNK_MASK) << CHUNK_SHIFT;
          for (let gx = gxStart; gx < gxEnd; gx++) {
            const li = dstRow | (gx & CHUNK_MASK);
            if (ch.owner[li] !== owner) continue;
            ch.kind[li] = 0;
            ch.mask[li] = 0;
            ch.owner[li] = 0;
            ch.navBlocked[li] = 0;
            ch.navKind[li] = 0;
          }
        }
        let any = false;
        for (let i = 0; i < ch.kind.length; i++) {
          if (ch.kind[i] !== 0 || ch.owner[i] !== 0) { any = true; break; }
        }
        if (!any) this.chunks.delete(k);
      }
    }
    this.lastCk = -1;
    this.lastCh = undefined;
    this.pushDirty(ox, oy, ox + cols * this.cell, oy + rows * this.cell);
  }

  // --- Authoring / runtime terrain edits -------------------------------------

  fillRegion(x0: number, y0: number, x1: number, y1: number, id: string, quiet = false, ownerId?: string): void {
    const byte = this.kindByte(id);
    const walk = this.kindWalkable[byte];
    const owner = ownerId !== undefined ? this.internRegion(ownerId) : undefined;
    const a = Math.floor(Math.min(x0, x1) / this.cell);
    const b = Math.floor(Math.max(x0, x1) / this.cell);
    const c = Math.floor(Math.min(y0, y1) / this.cell);
    const d = Math.floor(Math.max(y0, y1) / this.cell);
    for (let gy = c; gy <= d; gy++) {
      for (let gx = a; gx <= b; gx++) {
        this.setCellRaw(gx, gy, byte, walk, owner);
      }
    }
    if (quiet) { this.version++; return; }
    this.pushDirty(x0, y0, x1, y1);
  }

  fillRect(x0: number, y0: number, x1: number, y1: number, walkable = true): void {
    this.fillRegion(x0, y0, x1, y1, walkable ? 'ground' : 'wall');
  }

  fillDisc(cx: number, cy: number, r: number, id: string, ownerId?: string): void {
    const byte = this.kindByte(id);
    const walk = this.kindWalkable[byte];
    const owner = ownerId !== undefined ? this.internRegion(ownerId) : undefined;
    const a = Math.floor((cx - r) / this.cell), b = Math.floor((cx + r) / this.cell);
    const c = Math.floor((cy - r) / this.cell), d = Math.floor((cy + r) / this.cell);
    const r2 = r * r;
    for (let gy = c; gy <= d; gy++) {
      for (let gx = a; gx <= b; gx++) {
        const px = (gx + 0.5) * this.cell - cx, py = (gy + 0.5) * this.cell - cy;
        if (px * px + py * py > r2) continue;
        this.setCellRaw(gx, gy, byte, walk, owner);
      }
    }
    this.pushDirty(cx - r, cy - r, cx + r, cy + r);
  }

  carveCorridor(ax: number, ay: number, bx: number, by: number, halfW: number, id = 'ground', ownerId?: string): void {
    const steps = Math.max(1, Math.ceil(Math.hypot(bx - ax, by - ay) / (this.cell * 0.5)));
    for (let i = 0; i <= steps; i++) {
      const t = i / steps, x = ax + (bx - ax) * t, y = ay + (by - ay) * t;
      this.fillRegion(x - halfW, y - halfW, x + halfW, y + halfW, id, true, ownerId);
    }
    this.pushDirty(
      Math.min(ax, bx) - halfW, Math.min(ay, by) - halfW,
      Math.max(ax, bx) + halfW, Math.max(ay, by) + halfW,
    );
  }

  // --- WalkField queries -----------------------------------------------------

  private maskCell(gx: number, gy: number): number {
    const ch = this.chunkAt(gx >> CHUNK_SHIFT, gy >> CHUNK_SHIFT);
    return ch ? ch.mask[((gy & CHUNK_MASK) << CHUNK_SHIFT) | (gx & CHUNK_MASK)] : 0;
  }

  private navWalkableCell(gx: number, gy: number): boolean {
    const ch = this.chunkAt(gx >> CHUNK_SHIFT, gy >> CHUNK_SHIFT);
    if (!ch) return false;
    const li = ((gy & CHUNK_MASK) << CHUNK_SHIFT) | (gx & CHUNK_MASK);
    return ch.mask[li] === 1 && ch.navBlocked[li] === 0;
  }

  /** Sync advisory doodad/chasm/bridge/ground navigation masks across mounted chunks
   *  when walk version or nav-blocking doodad family revision changes. Never alters
   *  collision `mask`, rendered `kind`, or `version` (zero GroundRenderer/SightVeil churn!). */
  syncDoodadNav(revision: number, groundsLen: number, rebuild: (wf: TiledWalkField) => void): void {
    if (this.navSyncedVer === this.version && this.navSyncedRev === revision && this.navSyncedGrounds === groundsLen) {
      return;
    }
    for (const ch of this.chunks.values()) {
      ch.navBlocked.fill(0);
      ch.navKind.fill(0);
    }
    rebuild(this);
    this.navVersion++;
    this.navSyncedVer = this.version;
    this.navSyncedRev = revision;
    this.navSyncedGrounds = groundsLen;
  }

  setNavCellBlocked(x: number, y: number, blocked: 0 | 1): void {
    const gx = Math.floor(x / this.cell), gy = Math.floor(y / this.cell);
    const ch = this.chunkAt(gx >> CHUNK_SHIFT, gy >> CHUNK_SHIFT);
    if (!ch) return;
    const li = ((gy & CHUNK_MASK) << CHUNK_SHIFT) | (gx & CHUNK_MASK);
    if (ch.mask[li] === 1) ch.navBlocked[li] = blocked;
  }

  stampNavDiscBlocked(cx: number, cy: number, r: number, blocked: 0 | 1): void {
    const a = Math.floor((cx - r) / this.cell), b = Math.floor((cx + r) / this.cell);
    const c = Math.floor((cy - r) / this.cell), d = Math.floor((cy + r) / this.cell);
    const r2 = r * r;
    for (let gy = c; gy <= d; gy++) {
      const py = (gy + 0.5) * this.cell - cy;
      const py2 = py * py;
      if (py2 > r2) continue;
      for (let gx = a; gx <= b; gx++) {
        const px = (gx + 0.5) * this.cell - cx;
        if (px * px + py2 > r2) continue;
        const ch = this.chunkAt(gx >> CHUNK_SHIFT, gy >> CHUNK_SHIFT);
        if (!ch) continue;
        const li = ((gy & CHUNK_MASK) << CHUNK_SHIFT) | (gx & CHUNK_MASK);
        if (ch.mask[li] === 1) ch.navBlocked[li] = blocked;
      }
    }
  }

  setNavCellKind(x: number, y: number, kindId: string): void {
    const gx = Math.floor(x / this.cell), gy = Math.floor(y / this.cell);
    const ch = this.chunkAt(gx >> CHUNK_SHIFT, gy >> CHUNK_SHIFT);
    if (!ch) return;
    const li = ((gy & CHUNK_MASK) << CHUNK_SHIFT) | (gx & CHUNK_MASK);
    if (ch.mask[li] === 1) ch.navKind[li] = this.kindByte(kindId);
  }

  clearNavDiscBridge(cx: number, cy: number, r: number): void {
    const groundByte = this.kindByte('ground');
    const a = Math.floor((cx - r) / this.cell), b = Math.floor((cx + r) / this.cell);
    const c = Math.floor((cy - r) / this.cell), d = Math.floor((cy + r) / this.cell);
    const r2 = r * r;
    for (let gy = c; gy <= d; gy++) {
      const py = (gy + 0.5) * this.cell - cy;
      const py2 = py * py;
      if (py2 > r2) continue;
      for (let gx = a; gx <= b; gx++) {
        const px = (gx + 0.5) * this.cell - cx;
        if (px * px + py2 > r2) continue;
        const ch = this.chunkAt(gx >> CHUNK_SHIFT, gy >> CHUNK_SHIFT);
        if (!ch) continue;
        const li = ((gy & CHUNK_MASK) << CHUNK_SHIFT) | (gx & CHUNK_MASK);
        if (ch.mask[li] === 1) {
          ch.navBlocked[li] = 0;
          ch.navKind[li] = groundByte;
        }
      }
    }
  }

  private snapToNavWalkable(p: Vec2): Vec2 {
    const sx = Math.floor(p.x / this.cell), sy = Math.floor(p.y / this.cell);
    if (this.navWalkableCell(sx, sy)) return vec((sx + 0.5) * this.cell, (sy + 0.5) * this.cell);
    const maxR = 40;
    let bestX = 0, bestY = 0, found = false, bestD = Infinity;
    const test = (cx: number, cy: number): void => {
      if (!this.navWalkableCell(cx, cy)) return;
      const wx = (cx + 0.5) * this.cell, wy = (cy + 0.5) * this.cell;
      const dx = wx - p.x, dy = wy - p.y;
      const d = dx * dx + dy * dy;
      if (d < bestD) { bestD = d; bestX = wx; bestY = wy; found = true; }
    };
    for (let r = 1; r <= maxR; r++) {
      for (let dx = -r; dx <= r; dx++) test(sx + dx, sy - r);
      for (let dy = -r + 1; dy <= r - 1; dy++) {
        test(sx - r, sy + dy);
        test(sx + r, sy + dy);
      }
      for (let dx = -r; dx <= r; dx++) test(sx + dx, sy + r);
      if (found) return vec(bestX, bestY);
    }
    return this.snapToWalkable(p);
  }

  private kindByteAtCell(gx: number, gy: number): number {
    const ch = this.chunkAt(gx >> CHUNK_SHIFT, gy >> CHUNK_SHIFT);
    return ch ? ch.kind[((gy & CHUNK_MASK) << CHUNK_SHIFT) | (gx & CHUNK_MASK)] : 0;
  }

  isWalkable(x: number, y: number): boolean {
    return this.maskCell(Math.floor(x / this.cell), Math.floor(y / this.cell)) === 1;
  }

  kindAt(x: number, y: number): string | undefined {
    const gx = Math.floor(x / this.cell), gy = Math.floor(y / this.cell);
    const ch = this.chunkAt(gx >> CHUNK_SHIFT, gy >> CHUNK_SHIFT);
    if (!ch) return undefined;
    return this.kindList[ch.kind[((gy & CHUNK_MASK) << CHUNK_SHIFT) | (gx & CHUNK_MASK)]] ?? 'wall';
  }

  regionAt(x: number, y: number): string {
    const gx = Math.floor(x / this.cell), gy = Math.floor(y / this.cell);
    return this.kindList[this.kindByteAtCell(gx, gy)] ?? 'wall';
  }

  supportedAt(x: number, y: number, r: number): boolean {
    if (r <= 0) return this.isWalkable(x, y);
    const gx0 = Math.floor((x - r) / this.cell), gx1 = Math.floor((x + r) / this.cell);
    const gy0 = Math.floor((y - r) / this.cell), gy1 = Math.floor((y + r) / this.cell);
    for (let gy = gy0; gy <= gy1; gy++) {
      for (let gx = gx0; gx <= gx1; gx++) {
        const rk = regionKind(this.kindList[this.kindByteAtCell(gx, gy)]);
        if (rk && !rk.walkable && !rk.blocks) continue;
        const nx = Math.max(gx * this.cell, Math.min(x, (gx + 1) * this.cell));
        const ny = Math.max(gy * this.cell, Math.min(y, (gy + 1) * this.cell));
        const dx = nx - x, dy = ny - y;
        if (dx * dx + dy * dy <= r * r) return true;
      }
    }
    return false;
  }

  snapToWalkable(p: Vec2): Vec2 {
    const sx = Math.floor(p.x / this.cell), sy = Math.floor(p.y / this.cell);
    if (this.maskCell(sx, sy) === 1) return vec((sx + 0.5) * this.cell, (sy + 0.5) * this.cell);
    const maxR = 80; // up to 2400px search ring
    let bestX = 0, bestY = 0, found = false, bestD = Infinity;
    const test = (cx: number, cy: number): void => {
      if (this.maskCell(cx, cy) !== 1) return;
      const wx = (cx + 0.5) * this.cell, wy = (cy + 0.5) * this.cell;
      const dx = wx - p.x, dy = wy - p.y;
      const d = dx * dx + dy * dy;
      if (d < bestD) { bestD = d; bestX = wx; bestY = wy; found = true; }
    };
    for (let r = 1; r <= maxR; r++) {
      // Exact perimeter walk in identical (dy, dx) tie-break order — O(R^2) instead of O(R^3)!
      for (let dx = -r; dx <= r; dx++) test(sx + dx, sy - r);
      for (let dy = -r + 1; dy <= r - 1; dy++) {
        test(sx - r, sy + dy);
        test(sx + r, sy + dy);
      }
      for (let dx = -r; dx <= r; dx++) test(sx + dx, sy + r);
      if (found) return vec(bestX, bestY);
    }
    return vec(p.x, p.y);
  }

  lineWalkable(from: Vec2, to: Vec2): boolean {
    const dx = to.x - from.x, dy = to.y - from.y;
    const len = Math.hypot(dx, dy);
    const step = this.cell / 2;
    for (let s = step; s <= len; s += step) {
      if (!this.isWalkable(from.x + dx * (s / len), from.y + dy * (s / len))) return false;
    }
    return len <= 0 || this.isWalkable(to.x, to.y);
  }

  private profileEntry(p: PathProfile): { idx: number; t: Uint8Array; uniform: boolean } {
    let e = this.profTables.get(p.key);
    if (!e || e.n !== this.kindList.length) {
      const n = this.kindList.length;
      const t = new Uint8Array(n);
      let uniform = true;
      for (let b = 0; b < n; b++) {
        const id = this.kindList[b];
        let w = PATH_SCALE;
        if (regionKind(id)?.walkable) {
          const c = Math.min(PATH_CFG.maxCost, Math.max(PATH_CFG.minCost, p.costOf(id)));
          w = Math.max(1, Math.round(c * PATH_SCALE));
          if (w !== PATH_SCALE) uniform = false;
        }
        t[b] = w;
      }
      e = { t, n, uniform };
      this.profTables.set(p.key, e);
    }
    let idx = this.profIdx.get(p.key);
    if (idx === undefined) { idx = this.profIdx.size + 1; this.profIdx.set(p.key, idx); }
    return { idx, t: e.t, uniform: e.uniform };
  }

  linePreferred(from: Vec2, to: Vec2, profile: PathProfile): boolean {
    const e = this.profileEntry(profile);
    const tab = e.t;
    const ok = (x: number, y: number): boolean => {
      const gx = Math.floor(x / this.cell), gy = Math.floor(y / this.cell);
      const ch = this.chunkAt(gx >> CHUNK_SHIFT, gy >> CHUNK_SHIFT);
      if (!ch) return false;
      const li = ((gy & CHUNK_MASK) << CHUNK_SHIFT) | (gx & CHUNK_MASK);
      if (ch.mask[li] !== 1 || ch.navBlocked[li] !== 0) return false;
      if (e.uniform) return true;
      const kb = ch.navKind[li] || ch.kind[li];
      return (tab[kb] || PATH_SCALE) <= PATH_SCALE;
    };
    const dx = to.x - from.x, dy = to.y - from.y;
    const len = Math.hypot(dx, dy);
    const step = this.cell / 2;
    for (let s = step; s <= len; s += step) {
      if (!ok(from.x + dx * (s / len), from.y + dy * (s / len))) return false;
    }
    return len <= 0 || ok(to.x, to.y);
  }

  /** Bounded flood-check between two world points (used by spawn validation and
   *  cross-region seam verification). */
  reachable(from: Vec2, to: Vec2): boolean {
    const fx = Math.floor(from.x / this.cell), fy = Math.floor(from.y / this.cell);
    const tx = Math.floor(to.x / this.cell), ty = Math.floor(to.y / this.cell);
    if (this.maskCell(fx, fy) !== 1 || this.maskCell(tx, ty) !== 1) return false;
    if (fx === tx && fy === ty) return true;
    const pad = 44;
    const minX = Math.min(fx, tx) - pad, maxX = Math.max(fx, tx) + pad;
    const minY = Math.min(fy, ty) - pad, maxY = Math.max(fy, ty) + pad;
    const w = maxX - minX + 1, h = maxY - minY + 1;
    if (w * h > 90000) return true; // beyond ~9000px span, defer to road-graph connectivity
    const seen = new Uint8Array(w * h);
    const q = this.scratchQ;
    q.length = 0;
    const start = (fy - minY) * w + (fx - minX);
    const goal = (ty - minY) * w + (tx - minX);
    seen[start] = 1;
    q.push(start);
    for (let head = 0; head < q.length; head++) {
      const c = q[head];
      if (c === goal) { q.length = 0; return true; }
      const lx = c % w, ly = (c / w) | 0;
      const gx = minX + lx, gy = minY + ly;
      for (let di = 0; di < 8; di += 2) {
        const dx = DIRS_4[di], dy = DIRS_4[di + 1];
        const nx = lx + dx, ny = ly + dy;
        if (nx < 0 || ny < 0 || nx >= w || ny >= h) continue;
        const ni = ny * w + nx;
        if (seen[ni] || this.maskCell(gx + dx, gy + dy) !== 1) continue;
        seen[ni] = 1;
        q.push(ni);
      }
    }
    q.length = 0;
    return false;
  }

  /** Windowed flow-field step across continuous chunks (supports cross-region
   *  pursuit, patrols, and elevated stories when `tier > 0`). */
  pathStep(from: Vec2, to: Vec2, profile?: PathProfile, tier = 0): Vec2 | null {
    let prof: PathProfile | null = profile ?? null;
    if (prof && this.profileEntry(prof).uniform) prof = null;

    // For long-range cross-region marches exceeding the half-window,
    // pull the intermediate aim inside the sliding window toward `to`.
    let aim = to;
    const maxSpanPx = (NAV_HALF_CELLS - 4) * this.cell;
    const rawDx = to.x - from.x, rawDy = to.y - from.y;
    const rawDist = Math.hypot(rawDx, rawDy);
    if (rawDist > maxSpanPx) {
      const k = maxSpanPx / rawDist;
      aim = vec(from.x + rawDx * k, from.y + rawDy * k);
    }

    const walkAtCell = (gx: number, gy: number): boolean => {
      if (tier <= 0) return this.navWalkableCell(gx, gy);
      return tierFloorAt(this.kindList[this.kindByteAtCell(gx, gy)], tier);
    };

    let tx = Math.floor(aim.x / this.cell), ty = Math.floor(aim.y / this.cell);
    if (!walkAtCell(tx, ty)) {
      const snapped = tier <= 0 ? this.snapToNavWalkable(aim) : aim;
      tx = Math.floor(snapped.x / this.cell);
      ty = Math.floor(snapped.y / this.cell);
      if (!walkAtCell(tx, ty)) return null;
      aim = snapped;
    }

    const fx = Math.floor(from.x / this.cell), fy = Math.floor(from.y / this.cell);
    if (fx === tx && fy === ty) return vec(aim.x, aim.y);
    if (Math.abs(fx - tx) + Math.abs(fy - ty) <= 1 && walkAtCell(fx, fy)) return vec(aim.x, aim.y);

    const entry = this.windowDistanceTo(tx, ty, prof, tier);
    const lx = fx - entry.ox, ly = fy - entry.oy;
    if (lx < 0 || ly < 0 || lx >= NAV_SIDE || ly >= NAV_SIDE) return null;
    const fi = ly * NAV_SIDE + lx;
    const startWalk = walkAtCell(fx, fy);
    if (startWalk && entry.d[fi] < 0) return null;
    if (!startWalk && (tier > 0 || this.maskCell(fx, fy) !== 1)) return null;

    let bestX = fx, bestY = fy;
    let bestD = startWalk && entry.d[fi] >= 0 ? entry.d[fi] : 0x3fffffff;
    let moved = false;
    for (let di = 0; di < 8; di += 2) {
      const dx = DIRS_4[di], dy = DIRS_4[di + 1];
      const nlx = lx + dx, nly = ly + dy;
      if (nlx < 0 || nly < 0 || nlx >= NAV_SIDE || nly >= NAV_SIDE) continue;
      if (!walkAtCell(fx + dx, fy + dy)) continue;
      const nd = entry.d[nly * NAV_SIDE + nlx];
      if (nd >= 0 && nd < bestD) {
        bestD = nd; bestX = fx + dx; bestY = fy + dy; moved = true;
      }
    }
    if (!moved) return vec(aim.x, aim.y);
    return vec((bestX + 0.5) * this.cell, (bestY + 0.5) * this.cell);
  }

  /** Stateless WalkField view for an elevated story `tier >= 1`, backed by the
   *  same windowed flow field (replaces whole-zone makeTierNav in seamless). */
  tierPathField(tier: number): WalkField {
    return {
      cellSize: this.cell,
      isWalkable: (x, y) => tierFloorAt(this.regionAt(x, y), tier),
      regionAt: (x, y) => this.regionAt(x, y),
      snapToWalkable: (p) => {
        if (tierFloorAt(this.regionAt(p.x, p.y), tier)) return vec(p.x, p.y);
        for (let r = this.cell; r <= this.cell * 14; r += this.cell) {
          for (let a = 0; a < Math.PI * 2; a += Math.PI / 8) {
            const x = p.x + Math.cos(a) * r, y = p.y + Math.sin(a) * r;
            if (tierFloorAt(this.regionAt(x, y), tier)) return vec(x, y);
          }
        }
        return vec(p.x, p.y);
      },
      pathStep: (from, to, prof) => this.pathStep(from, to, prof, tier),
      lineWalkable: (from, to) => {
        const dx = to.x - from.x, dy = to.y - from.y, len = Math.hypot(dx, dy);
        const step = this.cell / 2;
        for (let s = step; s <= len; s += step) {
          if (!tierFloorAt(this.regionAt(from.x + dx * (s / len), from.y + dy * (s / len)), tier)) return false;
        }
        return len <= 0 || tierFloorAt(this.regionAt(to.x, to.y), tier);
      },
    };
  }

  private windowDistanceTo(tx: number, ty: number, prof: PathProfile | null, tier: number): WindowDistEntry {
    const pidx = prof ? this.profileEntry(prof).idx : 0;
    const effVer = this.version + this.navVersion;
    const tail = (pidx & 255) * 8 + (tier & 7);
    const keyOf = (x: number, y: number): number => ((x + 262144) * 524288 + (y + 262144)) * 2048 + tail;
    const key = keyOf(tx, ty);
    const hit = this.distCache.get(key);
    if (hit) {
      hit.lru = ++this.lruClock;
      if (hit.v !== effVer
        && (this.refreshesLeft > 0 || this.tick - hit.t >= WALK_CFG.distMaxStaleTicks)) {
        this.refreshesLeft--;
        this.computeWindow(hit, tx, ty, prof, tier);
        hit.v = effVer;
        hit.t = this.tick;
      }
      return hit;
    }
    // When multiple distinct monster PathProfiles cross into a newly entered
    // target cell on the same tick, reuse an adjacent 1-cell-away warm field
    // beyond the first 2 bakes so work spreads smoothly across consecutive frames!
    if (this.newBakesLeft <= 0) {
      for (let dy = -1; dy <= 1; dy++) {
        for (let dx = -1; dx <= 1; dx++) {
          if (dx === 0 && dy === 0) continue;
          const near = this.distCache.get(keyOf(tx + dx, ty + dy));
          if (near && near.v === effVer) {
            near.lru = ++this.lruClock;
            return near;
          }
        }
      }
    }
    this.newBakesLeft--;
    if (this.distCache.size >= SEAMLESS_DIST_CACHE_MAX) {
      let oldestKey = -1;
      let oldestLru = Infinity;
      for (const [k, v] of this.distCache) {
        if (v.lru < oldestLru) { oldestLru = v.lru; oldestKey = k; }
      }
      if (oldestKey !== -1) {
        const old = this.distCache.get(oldestKey);
        this.distCache.delete(oldestKey);
        if (old && this.spareDistPool.length < SEAMLESS_DIST_CACHE_MAX) this.spareDistPool.push(old.d);
      }
    }
    const d = this.spareDistPool.pop() ?? new Int32Array(NAV_AREA);
    const entry: WindowDistEntry = {
      ox: tx - NAV_HALF_CELLS,
      oy: ty - NAV_HALF_CELLS,
      d,
      v: effVer,
      t: this.tick,
      lru: ++this.lruClock,
      p: prof,
      tier,
    };
    this.computeWindow(entry, tx, ty, prof, tier);
    this.distCache.set(key, entry);
    return entry;
  }

  private computeWindow(entry: WindowDistEntry, tx: number, ty: number, prof: PathProfile | null, tier: number): void {
    const ox = tx - NAV_HALF_CELLS;
    const oy = ty - NAV_HALF_CELLS;
    entry.ox = ox;
    entry.oy = oy;
    const d = entry.d;
    d.fill(-1);
    const center = NAV_HALF_CELLS * NAV_SIDE + NAV_HALF_CELLS;

    // Pre-fetch the 4×4..5×5 chunk pointers spanning this window once so the
    // inner BFS / Dial loop runs with zero Map.get lookups and zero allocations.
    const minCx = ox >> CHUNK_SHIFT;
    const maxCx = (ox + NAV_SIDE - 1) >> CHUNK_SHIFT;
    const minCy = oy >> CHUNK_SHIFT;
    const maxCy = (oy + NAV_SIDE - 1) >> CHUNK_SHIFT;
    const cw = maxCx - minCx + 1;
    const winChunks = this.scratchChunks;
    let ci = 0;
    for (let cy = minCy; cy <= maxCy; cy++) {
      for (let cx = minCx; cx <= maxCx; cx++) {
        winChunks[ci++] = this.chunks.get(chunkKey(cx, cy));
      }
    }

    if (!prof && tier <= 0) {
      d[center] = 0;
      const q = this.scratchQ;
      q.length = 0;
      q.push(center);
      for (let head = 0; head < q.length; head++) {
        const c = q[head];
        const lx = c % NAV_SIDE, ly = (c / NAV_SIDE) | 0;
        const nd = d[c] + 1;
        for (let di = 0; di < 8; di += 2) {
          const nx = lx + DIRS_4[di], ny = ly + DIRS_4[di + 1];
          if (nx < 0 || ny < 0 || nx >= NAV_SIDE || ny >= NAV_SIDE) continue;
          const ni = ny * NAV_SIDE + nx;
          if (d[ni] >= 0) continue;
          const gx = ox + nx, gy = oy + ny;
          const ch = winChunks[((gy >> CHUNK_SHIFT) - minCy) * cw + ((gx >> CHUNK_SHIFT) - minCx)];
          if (!ch) continue;
          const li = ((gy & CHUNK_MASK) << CHUNK_SHIFT) | (gx & CHUNK_MASK);
          if (ch.mask[li] !== 1 || ch.navBlocked[li] !== 0) continue;
          d[ni] = nd;
          q.push(ni);
        }
      }
      q.length = 0;
      return;
    }

    const walkCell = (gx: number, gy: number): boolean => {
      const ch = winChunks[((gy >> CHUNK_SHIFT) - minCy) * cw + ((gx >> CHUNK_SHIFT) - minCx)];
      if (!ch) return false;
      const li = ((gy & CHUNK_MASK) << CHUNK_SHIFT) | (gx & CHUNK_MASK);
      if (tier <= 0) return ch.mask[li] === 1 && ch.navBlocked[li] === 0;
      return tierFloorAt(this.kindList[ch.kind[li]], tier);
    };

    if (!prof) {
      d[center] = 0;
      const q = this.scratchQ;
      q.length = 0;
      q.push(center);
      for (let head = 0; head < q.length; head++) {
        const c = q[head];
        const lx = c % NAV_SIDE, ly = (c / NAV_SIDE) | 0;
        const nd = d[c] + 1;
        for (let di = 0; di < 8; di += 2) {
          const nx = lx + DIRS_4[di], ny = ly + DIRS_4[di + 1];
          if (nx < 0 || ny < 0 || nx >= NAV_SIDE || ny >= NAV_SIDE) continue;
          const ni = ny * NAV_SIDE + nx;
          if (d[ni] >= 0 || !walkCell(ox + nx, oy + ny)) continue;
          d[ni] = nd;
          q.push(ni);
        }
      }
      q.length = 0;
      return;
    }

    const tab = this.profileEntry(prof).t;
    const W = 256;
    const ring = this.dialRing;
    for (let i = ring.length; i < W; i++) ring.push([]);
    for (let i = 0; i < W; i++) ring[i].length = 0;
    d[center] = 0;
    ring[0].push(center);
    let pending = 1, cur = 0;
    while (pending > 0) {
      const b = ring[cur % W];
      if (b.length === 0) { cur++; continue; }
      for (let head = 0; head < b.length; head++) {
        const c = b[head];
        pending--;
        if (d[c] !== cur) continue;
        const lx = c % NAV_SIDE, ly = (c / NAV_SIDE) | 0;
        for (let di = 0; di < 8; di += 2) {
          const nx = lx + DIRS_4[di], ny = ly + DIRS_4[di + 1];
          if (nx < 0 || ny < 0 || nx >= NAV_SIDE || ny >= NAV_SIDE) continue;
          const gx = ox + nx, gy = oy + ny;
          const ch = winChunks[((gy >> CHUNK_SHIFT) - minCy) * cw + ((gx >> CHUNK_SHIFT) - minCx)];
          if (!ch) continue;
          const li = ((gy & CHUNK_MASK) << CHUNK_SHIFT) | (gx & CHUNK_MASK);
          if (tier <= 0 ? (ch.mask[li] !== 1 || ch.navBlocked[li] !== 0) : !tierFloorAt(this.kindList[ch.kind[li]], tier)) continue;
          const ni = ny * NAV_SIDE + nx;
          const kb = tier <= 0 ? (ch.navKind[li] || ch.kind[li]) : ch.kind[li];
          const nd = cur + (tab[kb] || PATH_SCALE);
          if (d[ni] >= 0 && d[ni] <= nd) continue;
          d[ni] = nd;
          ring[nd % W].push(ni);
          pending++;
        }
      }
      b.length = 0;
      cur++;
    }
  }
}
