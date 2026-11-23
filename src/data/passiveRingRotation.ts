// ---------------------------------------------------------------------------
// STAR RING ROTATION (The Star Astrolabe) — modular, unlockable passive-tree
// ring rotation inspired by rotating astrolabe constellations.
//
// Hollow Wake's main Passive Star is built around three disjoint concentric
// annuli separated by exact 9-fold symmetric socket rings:
//   - Ring 0 (Inner Core):   R < 2005  (fixed around the 9 class starts)
//   - Ring 1 (Middle Ring):  2005 <= R < 2452  (anchored on 36 sockets at R=2020, 10° spacing)
//   - Ring 2 (Outer Ring):   R >= 2452         (anchored on 27 sockets at R=2470, 13.333° spacing)
//
// Because 36 = 9 × 4 and 27 = 9 × 3, turning Ring 1 or Ring 2 in discrete 40°
// steps (0..8) maps every seam socket bijectively onto another seam socket of
// the exact same radius and angular position:
//   - Ring 0 ↔ S1[k] re-sockets to Ring 0 ↔ S1[(k - 4 * rot1 + 36) % 36]
//   - Ring 1 ↔ S2[m] re-sockets to Ring 1 ↔ S2[(m - 3 * ((rot2 - rot1 + 9) % 9) + 27) % 27]
//   - All intra-ring edges and authored detours rotate rigidly with their ring.
//
// Zero runtime A* routing is required, and at (0, 0) every helper takes a
// zero-overhead identity fast path straight to PASSIVE_ADJACENCY.
// ---------------------------------------------------------------------------

import { FEATURE } from '../meta/account';
import { PASSIVE_ADJACENCY, PASSIVE_NODES, STAR_CENTER, classStartNode, type PassiveNode } from './passives';
import { PASSIVE_REALMS, realmIdOf, realmOf } from './passiveRealms';
import { vocationRootId } from './vocations';

export type StarRingBand = 'middle' | 'outer';

export interface StarRingRotations {
  /** Middle ring (Ring 1, 2020 <= R < 2470) clockwise steps (0..8, 40° each). */
  middle: number;
  /** Outer ring (Ring 2, R >= 2470) clockwise steps (0..8, 40° each). */
  outer: number;
}

export const STAR_RING_STEPS = 9;
export const STAR_RING_STEP_DEG = 40;
export const RING1_INNER_R = 2020;
export const RING2_INNER_R = 2470;
export const RING1_SEAM_CUT = 2005;
export const RING2_SEAM_CUT = 2452;

export const DEFAULT_RING_ROTATIONS: Readonly<StarRingRotations> = Object.freeze({ middle: 0, outer: 0 });

/** Modular progression config for the Star Astrolabe.
 *  Flip `enabled: false` to cleanly disable ring rotation across engine & UI. */
export const STAR_ASTROLABE_CFG = {
  enabled: true,
  feature: FEATURE.STAR_ASTROLABE,
  requireFont: true,
};

export function normalizeRingStep(step: unknown): number {
  if (typeof step !== 'number' || !Number.isFinite(step)) return 0;
  return ((Math.trunc(step) % STAR_RING_STEPS) + STAR_RING_STEPS) % STAR_RING_STEPS;
}

export function sanitizeRingRotations(raw?: Partial<StarRingRotations> | null): StarRingRotations {
  return {
    middle: normalizeRingStep(raw?.middle),
    outer: normalizeRingStep(raw?.outer),
  };
}

export function isDefaultRingRotations(rot?: Partial<StarRingRotations> | null): boolean {
  return !rot || (normalizeRingStep(rot.middle) === 0 && normalizeRingStep(rot.outer) === 0);
}

export function stepRingRotation(rot: StarRingRotations | undefined, band: StarRingBand, delta: -1 | 1): StarRingRotations {
  const cur = sanitizeRingRotations(rot);
  if (band === 'middle') return { middle: normalizeRingStep(cur.middle + delta), outer: cur.outer };
  return { middle: cur.middle, outer: normalizeRingStep(cur.outer + delta) };
}

/** Classify which concentric band a node belongs to (0 = fixed core / non-main-star,
 *  1 = middle rotatable ring, 2 = outer rotatable ring). */
export function starNodeRing(node: PassiveNode | undefined): 0 | 1 | 2 {
  if (!node || node.vocation !== undefined || node.realm !== undefined) return 0;
  const r = Math.hypot(node.x - STAR_CENTER.x, node.y - STAR_CENTER.y);
  if (r < RING1_SEAM_CUT) return 0;
  if (r < RING2_SEAM_CUT) return 1;
  return 2;
}

export interface StarSocketRings {
  /** 36 sorted socket IDs along R=2020 (ascending clockwise angle from +X). */
  s1: string[];
  s1Index: Map<string, number>;
  /** 27 sorted socket IDs along R=2470 (ascending clockwise angle from +X). */
  s2: string[];
  s2Index: Map<string, number>;
}

let socketCacheCount = -1;
let socketCache: StarSocketRings | null = null;

function angleOf(node: PassiveNode): number {
  let a = Math.atan2(node.y - STAR_CENTER.y, node.x - STAR_CENTER.x);
  if (a < 0) a += Math.PI * 2;
  return a;
}

/** Lazily extract and cache the 36 S1 (R=2020) and 27 S2 (R=2470) socket rings. */
export function starSocketRings(): StarSocketRings {
  const all = Object.values(PASSIVE_NODES);
  if (socketCache && socketCacheCount === all.length) return socketCache;
  const s1Nodes: PassiveNode[] = [];
  const s2Nodes: PassiveNode[] = [];
  for (const n of all) {
    if (n.vocation !== undefined || n.realm !== undefined || n.kind !== 'attr') continue;
    const r = Math.hypot(n.x - STAR_CENTER.x, n.y - STAR_CENTER.y);
    if (Math.abs(r - RING1_INNER_R) < 12) s1Nodes.push(n);
    else if (Math.abs(r - RING2_INNER_R) < 12) s2Nodes.push(n);
  }
  s1Nodes.sort((a, b) => angleOf(a) - angleOf(b));
  s2Nodes.sort((a, b) => angleOf(a) - angleOf(b));
  const s1 = s1Nodes.map(n => n.id);
  const s2 = s2Nodes.map(n => n.id);
  socketCache = {
    s1,
    s1Index: new Map(s1.map((id, i) => [id, i])),
    s2,
    s2Index: new Map(s2.map((id, i) => [id, i])),
  };
  socketCacheCount = all.length;
  return socketCache;
}

/** Rotate a 2D point around STAR_CENTER clockwise by `steps * 40°`. */
export function rotateStarPoint(p: { x: number; y: number }, steps: number): { x: number; y: number } {
  const s = normalizeRingStep(steps);
  if (s === 0) return { x: p.x, y: p.y };
  const rad = (s * STAR_RING_STEP_DEG * Math.PI) / 180;
  const c = Math.cos(rad);
  const sn = Math.sin(rad);
  const dx = p.x - STAR_CENTER.x;
  const dy = p.y - STAR_CENTER.y;
  return {
    x: STAR_CENTER.x + dx * c - dy * sn,
    y: STAR_CENTER.y + dx * sn + dy * c,
  };
}

/** Effective screen-space position of a passive node under the given ring rotations. */
export function rotatedNodePos(node: PassiveNode, rot?: Partial<StarRingRotations> | null): { x: number; y: number } {
  if (isDefaultRingRotations(rot)) return { x: node.x, y: node.y };
  const ring = starNodeRing(node);
  if (ring === 0) return { x: node.x, y: node.y };
  const steps = ring === 1 ? normalizeRingStep(rot?.middle) : normalizeRingStep(rot?.outer);
  return rotateStarPoint(node, steps);
}

/** Remap a base seam socket ID to the socket currently aligned at its physical slot. */
export function remapCrossSeamEdge(
  aId: string,
  bId: string,
  rot: StarRingRotations,
  sockets: StarSocketRings = starSocketRings(),
): { a: string; b: string; routeSteps: number } {
  const rA = starNodeRing(PASSIVE_NODES[aId]);
  const rB = starNodeRing(PASSIVE_NODES[bId]);
  if (rA === rB) {
    return { a: aId, b: bId, routeSteps: rA === 1 ? rot.middle : rA === 2 ? rot.outer : 0 };
  }
  const lowId = rA < rB ? aId : bId;
  const highId = rA < rB ? bId : aId;
  const lowRing = Math.min(rA, rB);
  const highRing = Math.max(rA, rB);

  if (lowRing === 0 && highRing === 1 && sockets.s1.length === STAR_RING_STEPS * 4) {
    const idx = sockets.s1Index.get(highId);
    if (idx !== undefined) {
      const n = sockets.s1.length;
      const perStep = n / STAR_RING_STEPS;
      const mapped = sockets.s1[(idx - perStep * rot.middle + n * 2) % n];
      return { a: lowId, b: mapped, routeSteps: 0 };
    }
  }
  if (lowRing === 1 && highRing === 2 && sockets.s2.length === STAR_RING_STEPS * 3) {
    const idx = sockets.s2Index.get(highId);
    if (idx !== undefined) {
      const n = sockets.s2.length;
      const perStep = n / STAR_RING_STEPS;
      const rel = (rot.outer - rot.middle + STAR_RING_STEPS) % STAR_RING_STEPS;
      const mapped = sockets.s2[(idx - perStep * rel + n * 2) % n];
      return { a: lowId, b: mapped, routeSteps: rot.middle };
    }
  }
  return { a: aId, b: bId, routeSteps: lowRing === 1 ? rot.middle : 0 };
}

let adjCacheNodeCount = -1;
const adjCache = new Map<string, Record<string, string[]>>();

/** Effective adjacency map under the given ring rotations.
 *  At (0, 0), returns PASSIVE_ADJACENCY directly with zero allocation. */
export function rotatedPassiveAdjacency(rot?: Partial<StarRingRotations> | null): Record<string, string[]> {
  if (isDefaultRingRotations(rot)) return PASSIVE_ADJACENCY;
  const clean = sanitizeRingRotations(rot);
  const nodeCount = Object.keys(PASSIVE_NODES).length;
  if (adjCacheNodeCount !== nodeCount) {
    adjCache.clear();
    adjCacheNodeCount = nodeCount;
  }
  const key = `${clean.middle}:${clean.outer}`;
  const hit = adjCache.get(key);
  if (hit) return hit;

  const sockets = starSocketRings();
  const out: Record<string, string[]> = {};
  for (const id of Object.keys(PASSIVE_NODES)) out[id] = [];

  const seen = new Set<string>();
  for (const aId of Object.keys(PASSIVE_NODES)) {
    for (const bId of PASSIVE_ADJACENCY[aId] ?? []) {
      if (!PASSIVE_NODES[bId]) continue;
      const edgeKey = aId < bId ? `${aId}|${bId}` : `${bId}|${aId}`;
      if (seen.has(edgeKey)) continue;
      seen.add(edgeKey);
      const mapped = remapCrossSeamEdge(aId, bId, clean, sockets);
      if (!out[mapped.a].includes(mapped.b)) out[mapped.a].push(mapped.b);
      if (!out[mapped.b].includes(mapped.a)) out[mapped.b].push(mapped.a);
    }
  }
  adjCache.set(key, out);
  return out;
}

/** Effective neighbors of a single passive node under the given ring rotations. */
export function passiveNeighborsOf(nodeId: string, rot?: Partial<StarRingRotations> | null): readonly string[] {
  return rotatedPassiveAdjacency(rot)[nodeId] ?? [];
}

export interface RotatableRoute {
  a: string;
  b: string;
  points: { x: number; y: number }[];
}

/** Transform a pre-authored (0, 0) route map rigidly into the rotated ring frame
 *  in O(routes) with zero runtime pathfinding and exact cross-seam re-keying. */
export function rotatedPassiveTreeRoutes<T extends RotatableRoute>(
  baseRoutes: Map<string, T>,
  rot?: Partial<StarRingRotations> | null,
): Map<string, RotatableRoute> {
  if (isDefaultRingRotations(rot)) return baseRoutes;
  const clean = sanitizeRingRotations(rot);
  const sockets = starSocketRings();
  const out = new Map<string, RotatableRoute>();
  for (const route of baseRoutes.values()) {
    const mapped = remapCrossSeamEdge(route.a, route.b, clean, sockets);
    const a = mapped.a < mapped.b ? mapped.a : mapped.b;
    const b = mapped.a < mapped.b ? mapped.b : mapped.a;
    const key = `${a}|${b}`;
    const pts = mapped.routeSteps === 0
      ? route.points
      : route.points.map(p => rotateStarPoint(p, mapped.routeSteps));
    out.set(key, { a, b, points: pts });
  }
  return out;
}

/** Verify whether every allocated node remains connected to the character's roots
 *  after turning `band` by `delta` steps. Refuses rotations that would strand
 *  allocated nodes across a rotating seam. */
export function canRotateStarRing(
  meta: { classDef: { id: string }; allocated: Set<string>; vocations: string[]; ringRotations?: StarRingRotations },
  band: StarRingBand,
  delta: -1 | 1,
): { ok: boolean; next: StarRingRotations; disconnected: string[]; refusal: string | null } {
  const next = stepRingRotation(meta.ringRotations, band, delta);
  const adj = rotatedPassiveAdjacency(next);
  const roots = new Set([
    classStartNode(meta.classDef.id),
    ...meta.vocations.map(vocationRootId),
    ...Object.values(PASSIVE_REALMS).flatMap(r => r.roots ?? []),
  ]);
  const domain = (id: string) => {
    const n = PASSIVE_NODES[id];
    return n?.vocation ? `vocation:${n.vocation}` : `realm:${realmIdOf(n)}`;
  };
  const reached = new Set([...roots].filter(id => meta.allocated.has(id)));
  for (const id of meta.allocated) {
    const n = PASSIVE_NODES[id];
    if (n && !n.vocation && realmOf(n)?.adjacency === 'free') reached.add(id);
  }
  const queue = [...reached];
  for (let i = 0; i < queue.length; i++) {
    const cur = queue[i];
    for (const nb of adj[cur] ?? []) {
      if (meta.allocated.has(nb) && !reached.has(nb) && domain(nb) === domain(cur)) {
        reached.add(nb);
        queue.push(nb);
      }
    }
  }
  const disconnected = [...meta.allocated].filter(id => PASSIVE_NODES[id] && !reached.has(id));
  if (disconnected.length > 0) {
    const ringLabel = band === 'middle' ? 'Middle Ring' : 'Outer Ring';
    const example = PASSIVE_NODES[disconnected[0]].name;
    return {
      ok: false,
      next,
      disconnected,
      refusal: `Turning the ${ringLabel} would strand ${disconnected.length} allocated node${disconnected.length === 1 ? '' : 's'}. Keep a path to ${example} or refund the disconnected branch first.`,
    };
  }
  return { ok: true, next, disconnected: [], refusal: null };
}
