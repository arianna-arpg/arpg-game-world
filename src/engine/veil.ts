// ---------------------------------------------------------------------------
// VEILS — contiguous canopy masses as first-class cover, data-driven per kind.
//
// The walk-under crown (DoodadRule.occlude) hides whatever stands beneath ONE
// tree until the hero approaches. Veil crowns fade by LOCAL PRESENCE: nearby
// foliage opens with a soft distance falloff and closes behind the walker.
// Connected crowns still form patches for static render batching, but patch
// membership never grants vision. Visual concealment also gates aim assist
// against foes under distant closed crowns. Standing cover grants no status
// by default: terrain sight depth and personal concealment are independent.
// An explicitly authored standStatus remains available for special content.
//
// Everything is one optional DoodadRule.veil row per kind: dense-forest oaks
// veil, a mushroom titan's cap can veil, a fog wall could veil — no renderer
// or engine edits per kind. The index is rebuilt lazily off the same doodad
// list/rev keys as World.doodadsAt, so runtime pushes and brittle pops
// self-heal, and co-op clients (which render from the shipped doodad list)
// derive identical patches with zero replication.
// ---------------------------------------------------------------------------

import { DiscIndex, SPATIAL_CFG, type SpatialDisc } from './spatial';
import { doodadRuleEpoch, doodadRuleOf, type Doodad } from './levelgen';

export interface VeilSpec {
  /** Patches merge only within a group (default 'canopy') — a fog veil and a
   *  leaf canopy interleaved stay separate masses. */
  group?: string;
  /** Two crowns join one patch when their centers sit within
   *  (rA + rB) × mergeScale (default VEIL_DEFAULTS.mergeScale — a touch over
   *  1 so visually-knitted crowns read as one mass). */
  mergeScale?: number;
  /** Crown alpha while the patch is UNREVEALED (≈1 = the mass hides
   *  everything beneath it). */
  cover?: number;
  /** Crown alpha at full local presence. */
  reveal?: number;
  /** Presence reach beyond the crown's edge, in world units. */
  presenceRadius?: number;
  /** Soft outer band of that reach, in world units (clamped to radius). */
  presenceFeather?: number;
  /** Status applied per tick to any actor standing under a member crown
   *  (the fogveiled pattern — detectability mods live on the status, data). */
  standStatus?: string;
}

export const VEIL_DEFAULTS = {
  group: 'canopy',
  mergeScale: 1.08,
  cover: 0.985,
  reveal: 0.26,
  presenceRadius: 160,
  presenceFeather: 100,
  /** Aim assist refuses crowns at/above this opacity. */
  concealAlpha: 0.55,
  /** Visual canopy grants no status by default; individual content may opt in. */
  standStatus: '',
} as const;

/** The shared target opacity for one crown. Its footprint matters, so even
 *  a large crown opens overhead; another crown connected a mile away does
 *  not. No patch query, allocation, or persistent discovery state. */
export function veilPresenceAlpha(spec: VeilSpec, viewer: { x: number; y: number },
  crown: Doodad): number {
  const cover = spec.cover ?? VEIL_DEFAULTS.cover;
  const reveal = spec.reveal ?? VEIL_DEFAULTS.reveal;
  const radius = Math.max(0, spec.presenceRadius ?? VEIL_DEFAULTS.presenceRadius);
  const feather = Math.min(radius, Math.max(0, spec.presenceFeather ?? VEIL_DEFAULTS.presenceFeather));
  const edge = Math.max(0, Math.hypot(viewer.x - crown.pos.x, viewer.y - crown.pos.y) - crown.radius);
  if (edge <= radius - feather) return reveal;
  if (edge >= radius) return cover;
  const t = (edge - (radius - feather)) / feather;
  return reveal + (cover - reveal) * t * t * (3 - 2 * t);
}

/** One contiguous canopy mass: the merged crowns of a veil group. */
export interface VeilPatch {
  /** Stable within one index build (patch identity is the OBJECT — smoothing
   *  caches key on it; ids are for debugging/tests). */
  id: number;
  members: Doodad[];
}

interface VeilMember extends SpatialDisc {
  d: Doodad;
  spec: VeilSpec;
  patch: VeilPatch;
}

let veilCacheEpoch = -1;
const veilByKind = new Map<string, VeilSpec | null>();

/** The veil spec of a kind, or null when the kind doesn't veil. */
export function veilSpecOf(kind: Doodad['kind']): VeilSpec | null {
  const ep = doodadRuleEpoch();
  if (ep !== veilCacheEpoch) {
    veilCacheEpoch = ep;
    veilByKind.clear();
  }
  const cached = veilByKind.get(kind);
  if (cached !== undefined) return cached;
  const spec = doodadRuleOf(kind).veil ?? null;
  veilByKind.set(kind, spec);
  return spec;
}

/** Point-in-crown cover info: the covering doodad, its spec, and its patch. */
export interface VeilCover {
  d: Doodad;
  spec: VeilSpec;
  patch: VeilPatch;
}

const VEIL_KEY_OFF = 16384;
const veilCellKey = (cx: number, cy: number): number =>
  (((cx + VEIL_KEY_OFF) & 0x7fff) << 15) | ((cy + VEIL_KEY_OFF) & 0x7fff);

// Forward half-plane neighbor offsets: every unordered pair of adjacent cells
// is visited once via same-cell linked list + these 4 forward neighbors.
const HALF_DX = [1, -1, 0, 1];
const HALF_DY = [0, 1, 1, 1];

export class VeilIndex {
  readonly patches: VeilPatch[] = [];
  readonly hasStandStatus: boolean = false;
  private byDoodad: Map<Doodad, VeilMember> | null = null;
  // coverAt and concealedFrom only test zero-radius point-in-disc containment.
  private disc: DiscIndex<VeilMember> | null = null;
  private readonly srcDoodads: Doodad[] = [];
  private readonly srcKinds: Doodad['kind'][] = [];
  private readonly srcSpecs: VeilSpec[] = [];
  private readonly srcXs: Float64Array;
  private readonly srcYs: Float64Array;
  private readonly srcRadii: Float64Array;
  private readonly srcRots: (number | undefined)[] = [];
  private readonly srcRuleEpoch: number;
  private readonly memberPatchIdx: Int32Array;
  private membersList: VeilMember[] | null = null;

  /** Check ordered crown inputs only when the world's dirty keys change.
   * Unrelated scenery edits retain patch identity and the cached roof. */
  matches(doodads: readonly Doodad[]): boolean {
    const ep = doodadRuleEpoch();
    const sameEpoch = ep === this.srcRuleEpoch;
    const ds = this.srcDoodads;
    const kinds = this.srcKinds;
    const specs = this.srcSpecs;
    const xs = this.srcXs;
    const ys = this.srcYs;
    const rs = this.srcRadii;
    const rots = this.srcRots;
    const srcLen = ds.length;
    let i = 0;
    let lastNonVeilKind = '';
    for (let k = 0, len = doodads.length; k < len; k++) {
      const d = doodads[k];
      if (d.gone || d.felled) continue;
      if (sameEpoch && i < srcLen && ds[i] === d) {
        if (kinds[i] !== d.kind || xs[i] !== d.pos.x || ys[i] !== d.pos.y || rs[i] !== d.radius || rots[i] !== d.rot) {
          return false;
        }
        i++;
        continue;
      }
      const kind = d.kind;
      if (kind === lastNonVeilKind) continue;
      const spec = veilSpecOf(kind);
      if (spec === null) {
        lastNonVeilKind = kind;
        continue;
      }
      if (i >= srcLen || ds[i] !== d || kinds[i] !== kind) return false;
      const oldSpec = specs[i];
      if (oldSpec !== spec && (
        oldSpec.group !== spec.group || oldSpec.mergeScale !== spec.mergeScale
        || oldSpec.cover !== spec.cover || oldSpec.reveal !== spec.reveal
        || oldSpec.presenceRadius !== spec.presenceRadius || oldSpec.presenceFeather !== spec.presenceFeather
        || oldSpec.standStatus !== spec.standStatus
      )) return false;
      if (xs[i] !== d.pos.x || ys[i] !== d.pos.y || rs[i] !== d.radius || rots[i] !== d.rot) return false;
      i++;
    }
    return i === srcLen;
  }

  constructor(doodads: readonly Doodad[], prev?: VeilIndex | null) {
    // Gather the veil-bearing crowns (a popped brittle stays out, and so
    // does a crushed one — the rampage fabric: a felled crown hides nothing;
    // the fell/regrow flips bump the kind's families, so this index re-derives).
    this.srcRuleEpoch = doodadRuleEpoch();
    const ds = this.srcDoodads;
    const kinds = this.srcKinds;
    const specs = this.srcSpecs;
    const rots = this.srcRots;
    const defaultScale: number = VEIL_DEFAULTS.mergeScale;
    let maxRadius = 0;
    let maxScale = defaultScale;
    let anyStandStatus = false;
    let lastKind = '';
    let lastSpec: VeilSpec | null = null;
    for (let k = 0, len = doodads.length; k < len; k++) {
      const d = doodads[k];
      if (d.gone || d.felled) continue;
      const kind = d.kind;
      const spec = kind === lastKind ? lastSpec : (lastKind = kind, lastSpec = veilSpecOf(kind));
      if (spec === null) continue;
      if (spec.standStatus || VEIL_DEFAULTS.standStatus) anyStandStatus = true;
      ds.push(d);
      kinds.push(kind);
      specs.push(spec);
      rots.push(d.rot);
      if (d.radius > maxRadius) maxRadius = d.radius;
      const sc = spec.mergeScale ?? defaultScale;
      if (sc > maxScale) maxScale = sc;
    }
    this.hasStandStatus = anyStandStatus;
    const n = ds.length;
    const xs = new Float64Array(n);
    const ys = new Float64Array(n);
    const rs = new Float64Array(n);
    const memberPatchIdx = new Int32Array(n);
    this.srcXs = xs;
    this.srcYs = ys;
    this.srcRadii = rs;
    this.memberPatchIdx = memberPatchIdx;
    if (!n) return;

    const maxReach = 2 * maxRadius * maxScale;
    const cell = Math.max(128, Math.ceil(maxReach));
    const cellX = new Int32Array(n);
    const cellY = new Int32Array(n);
    let minCx = 0x7fffffff, maxCx = -0x80000000;
    let minCy = 0x7fffffff, maxCy = -0x80000000;
    for (let i = 0; i < n; i++) {
      const d = ds[i];
      const x = d.pos.x, y = d.pos.y;
      xs[i] = x;
      ys[i] = y;
      rs[i] = d.radius;
      const cx = Math.floor(x / cell);
      const cy = Math.floor(y / cell);
      cellX[i] = cx;
      cellY[i] = cy;
      if (cx < minCx) minCx = cx;
      if (cx > maxCx) maxCx = cx;
      if (cy < minCy) minCy = cy;
      if (cy > maxCy) maxCy = cy;
    }

    // UNION-FIND over crown overlaps, bucketed via an intrusive cell linked
    // list over a 1-cell-padded flat Int32Array (or Smi Map fallback on giant
    // unbounded spans).
    const parent = new Int32Array(n);
    const nextInCell = new Int32Array(n);
    const find = (i: number): number => {
      while (parent[i] !== i) {
        const p = parent[i];
        parent[i] = parent[p];
        i = p;
      }
      return i;
    };

    const defaultGroup = VEIL_DEFAULTS.group;
    const spanW = maxCx - minCx + 3;
    const spanH = maxCy - minCy + 3;
    if (spanW > 0 && spanH > 0 && spanW * spanH <= 65536) {
      const ox = minCx - 1;
      const oy = minCy - 1;
      const cellHead = new Int32Array(spanW * spanH).fill(-1);
      const flatCell = new Int32Array(n);
      for (let i = 0; i < n; i++) {
        parent[i] = i;
        const idx = (cellY[i] - oy) * spanW + (cellX[i] - ox);
        flatCell[i] = idx;
        nextInCell[i] = cellHead[idx];
        cellHead[idx] = i;
      }
      const nOff0 = 1;
      const nOff1 = spanW - 1;
      const nOff2 = spanW;
      const nOff3 = spanW + 1;
      for (let i = 0; i < n; i++) {
        const ax = xs[i], ay = ys[i], ar = rs[i];
        const sa = specs[i];
        const ga = sa.group ?? defaultGroup;
        const sca = sa.mergeScale ?? defaultScale;
        const baseIdx = flatCell[i];
        let ri = find(i);

        for (let j = nextInCell[i]; j !== -1; j = nextInCell[j]) {
          const rj = find(j);
          if (ri === rj) continue;
          const sb = specs[j];
          if (ga !== (sb.group ?? defaultGroup)) continue;
          const scb = sb.mergeScale ?? defaultScale;
          const scale = sca >= scb ? sca : scb;
          const reach = (ar + rs[j]) * scale;
          const ddx = ax - xs[j], ddy = ay - ys[j];
          if (ddx * ddx + ddy * ddy <= reach * reach) {
            parent[ri] = rj;
            ri = rj;
          }
        }

        for (let pass = 0; pass < 4; pass++) {
          const nIdx = baseIdx + (pass === 0 ? nOff0 : pass === 1 ? nOff1 : pass === 2 ? nOff2 : nOff3);
          for (let j = cellHead[nIdx]; j !== -1; j = nextInCell[j]) {
            const rj = find(j);
            if (ri === rj) continue;
            const sb = specs[j];
            if (ga !== (sb.group ?? defaultGroup)) continue;
            const scb = sb.mergeScale ?? defaultScale;
            const scale = sca >= scb ? sca : scb;
            const reach = (ar + rs[j]) * scale;
            const ddx = ax - xs[j], ddy = ay - ys[j];
            if (ddx * ddx + ddy * ddy <= reach * reach) {
              parent[ri] = rj;
              ri = rj;
            }
          }
        }
      }
    } else {
      const cellHead = new Map<number, number>();
      for (let i = 0; i < n; i++) {
        parent[i] = i;
        const key = veilCellKey(cellX[i], cellY[i]);
        const head = cellHead.get(key);
        nextInCell[i] = head === undefined ? -1 : head;
        cellHead.set(key, i);
      }
      for (let i = 0; i < n; i++) {
        const ax = xs[i], ay = ys[i], ar = rs[i];
        const sa = specs[i];
        const ga = sa.group ?? defaultGroup;
        const sca = sa.mergeScale ?? defaultScale;
        const cx = cellX[i], cy = cellY[i];
        let ri = find(i);
        for (let j = nextInCell[i]; j !== -1; j = nextInCell[j]) {
          const rj = find(j);
          if (ri === rj) continue;
          const sb = specs[j];
          if (ga !== (sb.group ?? defaultGroup)) continue;
          const scb = sb.mergeScale ?? defaultScale;
          const scale = sca >= scb ? sca : scb;
          const reach = (ar + rs[j]) * scale;
          const ddx = ax - xs[j], ddy = ay - ys[j];
          if (ddx * ddx + ddy * ddy <= reach * reach) {
            parent[ri] = rj;
            ri = rj;
          }
        }
        for (let dir = 0; dir < 4; dir++) {
          const head = cellHead.get(veilCellKey(cx + HALF_DX[dir], cy + HALF_DY[dir]));
          if (head === undefined) continue;
          for (let j = head; j !== -1; j = nextInCell[j]) {
            const rj = find(j);
            if (ri === rj) continue;
            const sb = specs[j];
            if (ga !== (sb.group ?? defaultGroup)) continue;
            const scb = sb.mergeScale ?? defaultScale;
            const scale = sca >= scb ? sca : scb;
            const reach = (ar + rs[j]) * scale;
            const ddx = ax - xs[j], ddy = ay - ys[j];
            if (ddx * ddx + ddy * ddy <= reach * reach) {
              parent[ri] = rj;
              ri = rj;
            }
          }
        }
      }
    }

    // Materialize patches in canonical doodad encounter order, reusing surviving
    // VeilPatch object identities from `prev` so WeakMap-backed CanopySlices
    // stay warm across background neighbor region mounts/unmounts.
    const rootPatchIdx = new Int32Array(n).fill(-1);
    for (let i = 0; i < n; i++) {
      const d = ds[i];
      const root = find(i);
      let pidx = rootPatchIdx[root];
      let patch: VeilPatch;
      if (pidx === -1) {
        pidx = this.patches.length;
        rootPatchIdx[root] = pidx;
        patch = { id: pidx, members: [d] };
        this.patches.push(patch);
      } else {
        patch = this.patches[pidx];
        patch.members.push(d);
      }
      memberPatchIdx[i] = pidx;
    }
    if (prev && prev.srcDoodads.length > 0) {
      const prevIdx = new Map<Doodad, number>();
      for (let pi = 0, plen = prev.srcDoodads.length; pi < plen; pi++) {
        prevIdx.set(prev.srcDoodads[pi], pi);
      }
      for (let pidx = 0, plen = this.patches.length; pidx < plen; pidx++) {
        const curPatch = this.patches[pidx];
        const pi0 = prevIdx.get(curPatch.members[0]);
        if (pi0 === undefined) continue;
        const cand = prev.patches[prev.memberPatchIdx[pi0]];
        if (!cand || cand.members.length !== curPatch.members.length) continue;
        let same = true;
        for (let k = 0; k < curPatch.members.length; k++) {
          const cur = curPatch.members[k];
          if (cand.members[k] !== cur) { same = false; break; }
          const pik = prevIdx.get(cur);
          if (pik === undefined || prev.srcKinds[pik] !== cur.kind
            || prev.srcXs[pik] !== cur.pos.x || prev.srcYs[pik] !== cur.pos.y
            || prev.srcRadii[pik] !== cur.radius || prev.srcRots[pik] !== cur.rot) {
            same = false; break;
          }
        }
        if (same) {
          cand.id = pidx;
          this.patches[pidx] = cand;
        }
      }
    }
  }

  private ensureMembers(): VeilMember[] {
    if (this.membersList) return this.membersList;
    const ds = this.srcDoodads;
    const specs = this.srcSpecs;
    const pidxs = this.memberPatchIdx;
    const patches = this.patches;
    const n = ds.length;
    const list = new Array<VeilMember>(n);
    for (let i = 0; i < n; i++) {
      const d = ds[i];
      list[i] = {
        pos: d.pos,
        radius: d.radius,
        boundR: d.boundR,
        d,
        spec: specs[i],
        patch: patches[pidxs[i]],
      };
    }
    this.membersList = list;
    return list;
  }

  private ensureDisc(): DiscIndex<VeilMember> {
    if (this.disc) return this.disc;
    const disc = new DiscIndex<VeilMember>(SPATIAL_CFG.cell, 0);
    if (this.srcDoodads.length > 0) disc.build(this.ensureMembers());
    this.disc = disc;
    return disc;
  }

  /** The patch a veil-bearing doodad belongs to (null for non-members). */
  patchOf(d: Doodad): VeilPatch | null {
    let map = this.byDoodad;
    if (!map) {
      map = new Map<Doodad, VeilMember>();
      const members = this.ensureMembers();
      for (let i = 0, len = members.length; i < len; i++) {
        const m = members[i];
        map.set(m.d, m);
      }
      this.byDoodad = map;
    }
    return map.get(d)?.patch ?? null;
  }

  /** The cover over a point: the covering member crown (full visual radius —
   *  the canopy is real to eyes), or null in the open. When crowns overlap,
   *  the one whose center is nearest wins (its spec drives status/alphas). */
  coverAt(x: number, y: number): VeilCover | null {
    if (!this.srcDoodads.length) return null;
    let best: VeilMember | null = null;
    let bd = Infinity;
    const cand = this.ensureDisc().at(x, y);
    for (let i = 0, len = cand.length; i < len; i++) {
      const m = cand[i];
      const d = m.d;
      if (d.gone || d.felled) continue; // a crushed crown conceals no one
      const dx = x - d.pos.x, dy = y - d.pos.y;
      const dd = dx * dx + dy * dy;
      if (dd > d.radius * d.radius || dd >= bd) continue;
      best = m;
      bd = dd;
    }
    return best;
  }

  /** The patch covering a point, or null in the open. */
  patchAt(x: number, y: number): VeilPatch | null {
    return this.coverAt(x, y)?.patch ?? null;
  }

  /** All overlapping crowns must have opened enough to see the target.
   * Mirrors the label pass's most-opaque-cover rule, without render state. */
  concealedFrom(viewer: { x: number; y: number }, target: { x: number; y: number }): boolean {
    if (!this.srcDoodads.length) return false;
    const cand = this.ensureDisc().at(target.x, target.y);
    for (let i = 0, len = cand.length; i < len; i++) {
      const m = cand[i];
      const d = m.d;
      if (d.gone || d.felled) continue;
      const dx = target.x - d.pos.x, dy = target.y - d.pos.y;
      if (dx * dx + dy * dy > d.radius * d.radius) continue;
      if (veilPresenceAlpha(m.spec, viewer, d) >= VEIL_DEFAULTS.concealAlpha) return true;
    }
    return false;
  }
}
