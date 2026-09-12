// ---------------------------------------------------------------------------
// VEILS — contiguous canopy masses as first-class cover, data-driven per kind.
//
// The walk-under crown (DoodadRule.occlude) hides whatever stands beneath ONE
// tree until the hero approaches. Veil crowns fade by LOCAL PRESENCE: nearby
// foliage opens with a soft distance falloff and closes behind the walker.
// Connected crowns still form patches for static render batching, but patch
// membership never grants vision. Concealment is exported to GAMEPLAY too:
// aim assist can't magnetize onto a foe under distant closed crowns, and
// standing under cover wears the veil's standStatus
// (detectability play — the graphics ARE the stealth, now mechanically true).
//
// Everything is one optional DoodadRule.veil row per kind: dense-forest oaks
// veil, a mushroom titan's cap can veil, a fog wall could veil — no renderer
// or engine edits per kind. The index is rebuilt lazily off the same doodad
// list/rev keys as World.doodadsAt, so runtime pushes and brittle pops
// self-heal, and co-op clients (which render from the shipped doodad list)
// derive identical patches with zero replication.
// ---------------------------------------------------------------------------

import { DiscIndex } from './spatial';
import { doodadRuleOf, type Doodad } from './levelgen';

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
  /** Default per-tick status under cover ('' on a spec disables). */
  standStatus: 'canopied',
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

interface VeilMember {
  d: Doodad;
  spec: VeilSpec;
  patch: VeilPatch;
}

/** The veil spec of a kind, or null when the kind doesn't veil. */
export function veilSpecOf(kind: Doodad['kind']): VeilSpec | null {
  return doodadRuleOf(kind).veil ?? null;
}

/** Point-in-crown cover info: the covering doodad, its spec, and its patch. */
export interface VeilCover {
  d: Doodad;
  spec: VeilSpec;
  patch: VeilPatch;
}

export class VeilIndex {
  readonly patches: VeilPatch[] = [];
  private readonly byDoodad = new Map<Doodad, VeilMember>();
  private readonly disc = new DiscIndex<Doodad>();

  constructor(doodads: readonly Doodad[]) {
    // Gather the veil-bearing crowns (a popped brittle stays out, and so
    // does a crushed one — the rampage fabric: a felled crown hides nothing;
    // the fell/regrow flips bump the kind's families, so this index re-derives).
    const members: { d: Doodad; spec: VeilSpec }[] = [];
    let maxRadius = 0;
    let maxScale: number = VEIL_DEFAULTS.mergeScale;
    for (const d of doodads) {
      if (d.gone || d.felled) continue;
      const spec = veilSpecOf(d.kind);
      if (!spec) continue;
      members.push({ d, spec });
      maxRadius = Math.max(maxRadius, d.radius);
      maxScale = Math.max(maxScale, spec.mergeScale ?? VEIL_DEFAULTS.mergeScale);
    }
    if (!members.length) return;

    // UNION-FIND over crown overlaps, bucketed so a dense forest stays cheap.
    // Cell ≥ the largest possible PAIR reach — (rA+rB)·max(sA,sB) ≤
    // 2·maxRadius·maxScale — so every mergeable pair sits in adjacent cells
    // (the 3×3 sweep is complete even when a big low-scale crown meets a
    // small high-scale one; a per-member max once under-sized this).
    const maxReach = 2 * maxRadius * maxScale;
    const parent = members.map((_, i) => i);
    const find = (i: number): number => {
      while (parent[i] !== i) { parent[i] = parent[parent[i]]; i = parent[i]; }
      return i;
    };
    const union = (a: number, b: number): void => { parent[find(a)] = find(b); };
    const cell = Math.max(128, Math.ceil(maxReach));
    const buckets = new Map<number, number[]>();
    const keyOf = (cx: number, cy: number): number => (cx + 32768) * 65536 + (cy + 32768);
    members.forEach(({ d }, i) => {
      const k = keyOf(Math.floor(d.pos.x / cell), Math.floor(d.pos.y / cell));
      const b = buckets.get(k);
      if (b) b.push(i); else buckets.set(k, [i]);
    });
    for (let i = 0; i < members.length; i++) {
      const { d: da, spec: sa } = members[i];
      const cx = Math.floor(da.pos.x / cell), cy = Math.floor(da.pos.y / cell);
      for (let dy = -1; dy <= 1; dy++) {
        for (let dx = -1; dx <= 1; dx++) {
          for (const j of buckets.get(keyOf(cx + dx, cy + dy)) ?? []) {
            if (j <= i) continue;
            const { d: db, spec: sb } = members[j];
            if ((sa.group ?? VEIL_DEFAULTS.group) !== (sb.group ?? VEIL_DEFAULTS.group)) continue;
            const scale = Math.max(sa.mergeScale ?? VEIL_DEFAULTS.mergeScale, sb.mergeScale ?? VEIL_DEFAULTS.mergeScale);
            const reach = (da.radius + db.radius) * scale;
            const ddx = da.pos.x - db.pos.x, ddy = da.pos.y - db.pos.y;
            if (ddx * ddx + ddy * ddy <= reach * reach) union(i, j);
          }
        }
      }
    }

    // Materialize patches + the point-query disc index.
    const byRoot = new Map<number, VeilPatch>();
    members.forEach(({ d, spec }, i) => {
      const root = find(i);
      let patch = byRoot.get(root);
      if (!patch) {
        patch = { id: byRoot.size, members: [] };
        byRoot.set(root, patch);
        this.patches.push(patch);
      }
      patch.members.push(d);
      this.byDoodad.set(d, { d, spec, patch });
    });
    this.disc.build(members.map(m => m.d));
  }

  /** The patch a veil-bearing doodad belongs to (null for non-members). */
  patchOf(d: Doodad): VeilPatch | null {
    return this.byDoodad.get(d)?.patch ?? null;
  }

  /** The cover over a point: the covering member crown (full visual radius —
   *  the canopy is real to eyes), or null in the open. When crowns overlap,
   *  the one whose center is nearest wins (its spec drives status/alphas). */
  coverAt(x: number, y: number): VeilCover | null {
    let best: VeilMember | null = null;
    let bd = Infinity;
    for (const d of this.disc.at(x, y)) {
      if (d.gone || d.felled) continue; // a crushed crown conceals no one
      const dx = x - d.pos.x, dy = y - d.pos.y;
      const dd = dx * dx + dy * dy;
      if (dd > d.radius * d.radius || dd >= bd) continue;
      const m = this.byDoodad.get(d);
      if (m) { best = m; bd = dd; }
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
    for (const d of this.disc.at(target.x, target.y)) {
      if (d.gone || d.felled) continue;
      const dx = target.x - d.pos.x, dy = target.y - d.pos.y;
      if (dx * dx + dy * dy > d.radius * d.radius) continue;
      const m = this.byDoodad.get(d);
      if (m && veilPresenceAlpha(m.spec, viewer, d) >= VEIL_DEFAULTS.concealAlpha) return true;
    }
    return false;
  }
}
