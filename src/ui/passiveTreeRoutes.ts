import type { PassiveNode } from '../data/passives';
import { passiveTreeNodeRadius } from '../data/passiveTreePresentation';
import { PASSIVE_TREE_ROUTE_CFG as CFG } from '../data/passiveTreeLayoutConfig';
import { esc } from './dom';
import { PASSIVE_TREE_ROUTE_DATA } from '../data/passiveTreeRouteData';

export interface RoutePoint { x:number; y:number }
export interface PassiveTreeRoute { a:string; b:string; points:RoutePoint[] }
export const passiveRouteKey = (a:string,b:string):string => a<b ? a+'|'+b : b+'|'+a;
export function routePointDistance(p:RoutePoint,a:RoutePoint,b:RoutePoint):number {
  const dx=b.x-a.x,dy=b.y-a.y,t=Math.max(0,Math.min(1,((p.x-a.x)*dx+(p.y-a.y)*dy)/(dx*dx+dy*dy||1)));
  return Math.hypot(p.x-a.x-t*dx,p.y-a.y-t*dy);
}
/** Near-parallel tracks must stay separate; their long shared-looking runs
 * cannot be explained by a bridge at a single crossing. */
export function passiveRoutesOverlap(a:RoutePoint,b:RoutePoint,c:RoutePoint,d:RoutePoint):boolean {
  const dx=b.x-a.x,dy=b.y-a.y,ex=d.x-c.x,ey=d.y-c.y,len=Math.hypot(dx,dy),other=Math.hypot(ex,ey);
  if(!len||!other||Math.abs(dx*ey-dy*ex)/len/other>CFG.parallelAngleSin)return false;
  const projectedOverlap=(u:RoutePoint,v:RoutePoint,p:RoutePoint,q:RoutePoint):number=>{
    const x=v.x-u.x,y=v.y-u.y,length=Math.hypot(x,y);
    const project=(w:RoutePoint):number=>((w.x-u.x)*x+(w.y-u.y)*y)/length;
    return Math.min(length,Math.max(project(p),project(q)))-Math.max(0,Math.min(project(p),project(q)));
  };
  // Near-parallel projections differ slightly. Taking both axes makes the
  // predicate symmetric, including short segments close to the length cutoff.
  const overlap=Math.max(projectedOverlap(a,b,c,d),projectedOverlap(c,d,a,b));
  return overlap>CFG.parallelMinLength && Math.min(routePointDistance(c,a,b),routePointDistance(d,a,b),routePointDistance(a,c,d),routePointDistance(b,c,d))<CFG.parallelClearance;
}
const TREE_CX = 3000, TREE_CY = 3000;
const isSkeletonNode = (n: PassiveNode): boolean => n.kind === 'start' || n.kind === 'attr' || n.id.startsWith('node_');
const isSkeletonRingEdge = (a: PassiveNode, b: PassiveNode): boolean => {
  if ((a.kind !== 'attr' && !a.id.startsWith('node_')) || (b.kind !== 'attr' && !b.id.startsWith('node_'))) return false;
  const rA = Math.hypot(a.x - TREE_CX, a.y - TREE_CY), rB = Math.hypot(b.x - TREE_CX, b.y - TREE_CY);
  return (Math.abs(rA - 2020) < 25 && Math.abs(rB - 2020) < 25) || (Math.abs(rA - 2470) < 25 && Math.abs(rB - 2470) < 25);
};
const sideOf = (u: RoutePoint, v: RoutePoint, w: RoutePoint): number => (v.x - u.x) * (w.y - u.y) - (v.y - u.y) * (w.x - u.x);

/** Builds clean circular-ring, straight, and smooth curved routes between nodes.
 * Uses deterministic monotonic crossing avoidance when crossingCost > 0. */
export function buildPassiveTreeRoutes(nodes:readonly PassiveNode[],edges:readonly (readonly [string,string])[], crossingCost=0):Map<string,PassiveTreeRoute> {
  const byId = new Map(nodes.map(n => [n.id, n]));
  const cells = new Map<string, PassiveNode[]>();
  const cellKeys = (a: RoutePoint, b = a, pad = 0): string[] => {
    const keys: string[] = [];
    for (let x = Math.floor((Math.min(a.x, b.x) - pad) / 100); x <= Math.floor((Math.max(a.x, b.x) + pad) / 100); x++)
      for (let y = Math.floor((Math.min(a.y, b.y) - pad) / 100); y <= Math.floor((Math.max(a.y, b.y) + pad) / 100); y++)
        keys.push(x + ',' + y);
    return keys;
  };
  for (const n of nodes) for (const k of cellKeys(n, n, passiveTreeNodeRadius(n) + CFG.nodeClearance)) {
    if (!cells.has(k)) cells.set(k, []);
    cells.get(k)!.push(n);
  }

  type Track = { key: string; ea: string; eb: string; a: RoutePoint; b: RoutePoint };
  const tracks = new Map<string, Set<Track>>();
  const routeTracks = new Map<string, Track[]>();
  const result = new Map<string, PassiveTreeRoute>();

  const addRouteTracks = (key: string, ea: string, eb: string, pts: RoutePoint[]): void => {
    const list: Track[] = [];
    for (let i = 1; i < pts.length; i++) {
      const tr: Track = { key, ea, eb, a: pts[i - 1], b: pts[i] };
      list.push(tr);
      for (const k of cellKeys(tr.a, tr.b, CFG.parallelClearance)) {
        if (!tracks.has(k)) tracks.set(k, new Set());
        tracks.get(k)!.add(tr);
      }
    }
    routeTracks.set(key, list);
  };
  const remRouteTracks = (key: string): void => {
    for (const tr of routeTracks.get(key) ?? []) {
      for (const k of cellKeys(tr.a, tr.b, CFG.parallelClearance)) tracks.get(k)?.delete(tr);
    }
    routeTracks.delete(key);
  };

  const edgeLen = (a: string, b: string): number => Math.hypot(byId.get(a)!.x - byId.get(b)!.x, byId.get(a)!.y - byId.get(b)!.y);
  const canonical = [...new Map(edges.filter(([a, b]) => byId.has(a) && byId.has(b))
    .map(([a, b]) => [passiveRouteKey(a, b), (a < b ? [a, b] : [b, a]) as [string, string]])).entries()];
  const ordered = canonical.sort(([ak, [a, b]], [bk, [c, d]]) => {
    if (crossingCost) {
      const sa = isSkeletonNode(byId.get(a)!) && isSkeletonNode(byId.get(b)!) ? 0 : 1;
      const sb = isSkeletonNode(byId.get(c)!) && isSkeletonNode(byId.get(d)!) ? 0 : 1;
      if (sa !== sb) return sa - sb;
      const dl = edgeLen(a, b) - edgeLen(c, d);
      if (Math.abs(dl) > 1e-6) return dl;
    }
    return ak.localeCompare(bk);
  });

  const trim = (p: RoutePoint[], distance: number): RoutePoint[] => {
    while (p.length > 1) {
      const length = Math.hypot(p[1].x - p[0].x, p[1].y - p[0].y);
      if (length > distance) {
        p[0] = { x: p[0].x + (p[1].x - p[0].x) * distance / length, y: p[0].y + (p[1].y - p[0].y) * distance / length };
        break;
      }
      distance -= length; p.shift();
    }
    return p;
  };
  const trimPts = (a: PassiveNode, b: PassiveNode, pts: RoutePoint[]): RoutePoint[] =>
    trim(trim(pts.map(p => ({ x: p.x, y: p.y })), passiveTreeNodeRadius(a) + CFG.endpointGap).reverse(), passiveTreeNodeRadius(b) + CFG.endpointGap).reverse();

  const segClear = (aid: string, bid: string, key: string, p: RoutePoint, q: RoutePoint): boolean => {
    const vis = new Set<string>();
    for (const k of cellKeys(p, q)) for (const n of cells.get(k) ?? []) {
      if (n.id === aid || n.id === bid || vis.has(n.id)) continue;
      vis.add(n.id);
      if (routePointDistance(n, p, q) < passiveTreeNodeRadius(n) + CFG.nodeClearance - 1e-6) return false;
    }
    const chk = new Set<Track>();
    for (const k of cellKeys(p, q, CFG.parallelClearance)) for (const tr of tracks.get(k) ?? []) {
      if (tr.key === key || chk.has(tr)) continue;
      chk.add(tr);
      if (passiveRoutesOverlap(p, q, tr.a, tr.b)) return false;
    }
    return true;
  };
  const polyClear = (aid: string, bid: string, key: string, pts: RoutePoint[]): boolean => {
    for (let i = 1; i < pts.length; i++) if (!segClear(aid, bid, key, pts[i - 1], pts[i])) return false;
    return true;
  };
  const segCrossHits = (key: string, p: RoutePoint, q: RoutePoint): Track[] => {
    const hits: Track[] = [], seen = new Set<Track>();
    for (const k of cellKeys(p, q)) for (const t of tracks.get(k) ?? []) {
      if (t.key === key || seen.has(t)) continue;
      if (sideOf(p, q, t.a) * sideOf(p, q, t.b) < -1e-5 && sideOf(t.a, t.b, p) * sideOf(t.a, t.b, q) < -1e-5) {
        seen.add(t); hits.push(t);
      }
    }
    return hits;
  };
  const intersectingTracks = (key: string, pts: RoutePoint[]): Track[] => {
    const hits: Track[] = [], seen = new Set<Track>();
    for (let i = 1; i < pts.length; i++) {
      for (const t of segCrossHits(key, pts[i - 1], pts[i])) if (!seen.has(t)) { seen.add(t); hits.push(t); }
    }
    return hits;
  };
  const polyLen = (pts: RoutePoint[]): number => {
    let s = 0;
    for (let i = 1; i < pts.length; i++) s += Math.hypot(pts[i].x - pts[i - 1].x, pts[i].y - pts[i - 1].y);
    return s;
  };
  const sampleQuad = (a: PassiveNode, b: PassiveNode, ctrl: RoutePoint, steps: number): RoutePoint[] => {
    const raw: RoutePoint[] = [];
    for (let i = 0; i <= steps; i++) {
      const t = i / steps, u = 1 - t;
      raw.push({ x: u * u * a.x + 2 * u * t * ctrl.x + t * t * b.x, y: u * u * a.y + 2 * u * t * ctrl.y + t * t * b.y });
    }
    return trimPts(a, b, raw);
  };
  const smoothPolyline = (aid: string, bid: string, key: string, pts: RoutePoint[]): RoutePoint[] => {
    if (pts.length <= 2) return pts;
    const out: RoutePoint[] = [pts[0]];
    for (let i = 1; i < pts.length - 1; i++) {
      const p0 = out[out.length - 1], p1 = pts[i], p2 = pts[i + 1];
      const l1 = Math.hypot(p1.x - p0.x, p1.y - p0.y), l2 = Math.hypot(p2.x - p1.x, p2.y - p1.y);
      let replaced = false;
      for (const maxCut of [28, 16]) {
        const cut = Math.min(maxCut, l1 * 0.35, l2 * 0.35);
        if (cut < 6) continue;
        const qA = { x: p1.x - (p1.x - p0.x) * cut / l1, y: p1.y - (p1.y - p0.y) * cut / l1 };
        const qB = { x: p1.x + (p2.x - p1.x) * cut / l2, y: p1.y + (p2.y - p1.y) * cut / l2 };
        const arc: RoutePoint[] = [];
        for (let s = 0; s <= 3; s++) {
          const t = s / 3, u = 1 - t;
          arc.push({ x: u * u * qA.x + 2 * u * t * p1.x + t * t * qB.x, y: u * u * qA.y + 2 * u * t * p1.y + t * t * qB.y });
        }
        const checkPts = [p0, ...arc, p2];
        if (polyClear(aid, bid, key, checkPts)) { out.push(...arc); replaced = true; break; }
      }
      if (!replaced) out.push(p1);
    }
    out.push(pts[pts.length - 1]);
    return polyClear(aid, bid, key, out) ? out : pts;
  };

  const runAstar = (a: PassiveNode, b: PassiveNode, key: string, cCost: number, maxExplore: number): RoutePoint[] | undefined => {
    let hash = 0;
    for (const c of key) hash = (hash * 31 + c.charCodeAt(0)) >>> 0;
    const step = CFG.gridStep, phase = (hash % 997) / 997;
    const segCost = (p: RoutePoint, q: RoutePoint): number =>
      Math.hypot(q.x - p.x, q.y - p.y) + (cCost ? segCrossHits(key, p, q).length * cCost : 0);

    for (const margin of [CFG.searchMargin, CFG.searchMargin * 3, CFG.searchMargin * 8]) {
      const minX = Math.max(2, Math.min(a.x, b.x) - margin) + phase * step;
      const minY = Math.max(2, Math.min(a.y, b.y) - margin) + phase * step;
      const maxX = Math.min(5998, Math.max(a.x, b.x) + margin), maxY = Math.min(5998, Math.max(a.y, b.y) + margin);
      type Cell = { x: number; y: number; g: number; f: number; parent?: Cell };
      const heap: Cell[] = [], cost = new Map<string, number>();
      const push = (n: Cell): void => { let i = heap.length; heap.push(n); while (i > 0) { const p = (i - 1) >> 1; if (heap[p].f <= n.f) break; heap[i] = heap[p]; i = p; } heap[i] = n; };
      const pop = (): Cell => { const f = heap[0], l = heap.pop()!; if (heap.length) { let i = 0; while (i * 2 + 1 < heap.length) { let c = i * 2 + 1; if (c + 1 < heap.length && heap[c + 1].f < heap[c].f) c++; if (heap[c].f >= l.f) break; heap[i] = heap[c]; i = c; } heap[i] = l; } return f; };
      const at = (c: { x: number; y: number }): RoutePoint => ({ x: minX + c.x * step, y: minY + c.y * step });
      const sx = Math.round((a.x - minX) / step), sy = Math.round((a.y - minY) / step);
      for (let dx = -2; dx <= 2; dx++) for (let dy = -2; dy <= 2; dy++) {
        const c = { x: sx + dx, y: sy + dy }, p = at(c);
        if (!segClear(a.id, b.id, key, a, p)) continue;
        const g = segCost(a, p); cost.set(c.x + ',' + c.y, g); push({ ...c, g, f: g + Math.hypot(p.x - b.x, p.y - b.y) });
      }
      let explored = 0, aBestCost = Infinity, bestWalk: RoutePoint[] | undefined;
      while (heap.length && explored++ < maxExplore) {
        const c = pop(), p = at(c);
        if (c.g !== cost.get(c.x + ',' + c.y)) continue;
        if (c.f >= aBestCost - 0.001) break;
        if (segClear(a.id, b.id, key, p, b)) {
          const endCost = c.g + segCost(p, b);
          if (endCost < aBestCost) {
            const walk: RoutePoint[] = [b]; let cur: Cell | undefined = c; while (cur) { walk.push(at(cur)); cur = cur.parent; } walk.push(a); walk.reverse();
            aBestCost = endCost; bestWalk = walk;
            if (!cCost) break;
          }
        }
        for (let dx = -1; dx <= 1; dx++) for (let dy = -1; dy <= 1; dy++) {
          if (!dx && !dy) continue;
          const next = { x: c.x + dx, y: c.y + dy }, q = at(next), k = next.x + ',' + next.y;
          if (q.x < minX || q.y < minY || q.x > maxX || q.y > maxY || !segClear(a.id, b.id, key, p, q)) continue;
          const g = c.g + segCost(p, q);
          if (g >= (cost.get(k) ?? Infinity)) continue;
          cost.set(k, g); push({ ...next, g, f: g + Math.hypot(q.x - b.x, q.y - b.y), parent: c });
        }
      }
      if (bestWalk) {
        const simplified = [bestWalk[0]];
        let i = 0;
        while (i < bestWalk.length - 1) {
          let j = bestWalk.length - 1;
          while (j > i + 1) {
            if (segClear(a.id, b.id, key, bestWalk[i], bestWalk[j])) {
              let subCross = 0;
              for (let s = i; s < j; s++) subCross += segCrossHits(key, bestWalk[s], bestWalk[s + 1]).length;
              if (segCrossHits(key, bestWalk[i], bestWalk[j]).length <= subCross) break;
            }
            j--;
          }
          simplified.push(bestWalk[j]); i = j;
        }
        return smoothPolyline(a.id, b.id, key, trimPts(a, b, simplified));
      }
    }
    return undefined;
  };

  const solveDetour = (aid: string, bid: string, cCost: number, allowWideAstar: boolean): RoutePoint[] => {
    const a = byId.get(aid)!, b = byId.get(bid)!, key = passiveRouteKey(aid, bid);
    const polyCost = (pts: RoutePoint[]): number => polyLen(pts) + intersectingTracks(key, pts).length * cCost;
    const straight = trimPts(a, b, [a, b]);
    const straightOk = polyClear(aid, bid, key, straight);
    let bestCost = straightOk ? polyCost(straight) : Infinity;
    let bestPts: RoutePoint[] | undefined = straightOk ? straight : undefined;

    const cur = result.get(key)?.points;
    if (cur && polyClear(aid, bid, key, cur)) {
      const cc = polyCost(cur);
      if (cc <= bestCost) { bestCost = cc; bestPts = cur; }
    }

    const baseHits = intersectingTracks(key, bestPts ?? straight);
    if (!straightOk || (cCost > 0 && baseHits.length > 0)) {
      const straightLen = Math.hypot(b.x - a.x, b.y - a.y) || 1;
      const nx = -(b.y - a.y) / straightLen, ny = (b.x - a.x) / straightLen;
      const ux = (b.x - a.x) / straightLen, uy = (b.y - a.y) / straightLen;
      const mx = (a.x + b.x) / 2, my = (a.y + b.y) / 2;
      const steps = straightLen > 240 ? 9 : 7;

      const ctrls: RoutePoint[] = [];
      const maxApex = Math.min(220, Math.max(40, straightLen * 0.45));
      for (const along of [0, -0.22 * straightLen, 0.22 * straightLen]) {
        for (const apexOff of [18, -18, 32, -32, 52, -52, 82, -82, 125, -125, 180, -180, 220, -220]) {
          if (Math.abs(apexOff) > maxApex) continue;
          const px = mx + ux * along + nx * apexOff, py = my + uy * along + ny * apexOff;
          ctrls.push({ x: 2 * px - mx, y: 2 * py - my });
        }
      }
      for (const hit of baseHits.slice(0, 6)) {
        const na = byId.get(hit.ea)!, nb = byId.get(hit.eb)!;
        const dx = nb.x - na.x, dy = nb.y - na.y, l = Math.hypot(dx, dy) || 1;
        for (const [end, ox, oy] of [[na, -dx / l, -dy / l], [nb, dx / l, dy / l]] as const) {
          if (end.id === aid || end.id === bid) continue;
          const rClear = passiveTreeNodeRadius(end) + CFG.nodeClearance + 14;
          for (const extra of [0, 24, 55]) {
            const px = end.x + ox * (rClear + extra), py = end.y + oy * (rClear + extra);
            if (Math.hypot(px - mx, py - my) < straightLen * 0.72) ctrls.push({ x: 2 * px - mx, y: 2 * py - my });
          }
        }
      }
      for (const ctrl of ctrls) {
        const cand = sampleQuad(a, b, ctrl, steps);
        if (!polyClear(aid, bid, key, cand)) continue;
        const c = polyCost(cand);
        if (c < bestCost - 8) { bestCost = c; bestPts = cand; }
      }
      if (!bestPts || (allowWideAstar && intersectingTracks(key, bestPts).length >= 1 && (nodes.length < 50 || baseHits.length >= 2 || !straightOk))) {
        const astar = runAstar(a, b, key, cCost, bestPts ? 2500 : 100000);
        if (astar && polyClear(aid, bid, key, astar)) {
          const ac = polyCost(astar);
          if (ac < bestCost - 8) { bestCost = ac; bestPts = astar; }
        }
      }
    }
    if (!bestPts) throw new Error('No clear passive connection: ' + key);
    return bestPts;
  };

  // Phase 0A: Clean circular ring arcs & clear straight lines
  const blockedQueue: [string, string][] = [];
  for (const [key, [aid, bid]] of ordered) {
    const a = byId.get(aid)!, b = byId.get(bid)!;
    if (isSkeletonRingEdge(a, b)) {
      const rA = Math.hypot(a.x - TREE_CX, a.y - TREE_CY), rB = Math.hypot(b.x - TREE_CX, b.y - TREE_CY);
      const aA = Math.atan2(a.y - TREE_CY, a.x - TREE_CX), aB = Math.atan2(b.y - TREE_CY, b.x - TREE_CX);
      let dA = aB - aA; while (dA > Math.PI) dA -= 2 * Math.PI; while (dA < -Math.PI) dA += 2 * Math.PI;
      const arc: RoutePoint[] = [];
      for (let i = 0; i <= 5; i++) {
        const t = i / 5, r = rA + (rB - rA) * t, ang = aA + dA * t;
        arc.push({ x: TREE_CX + r * Math.cos(ang), y: TREE_CY + r * Math.sin(ang) });
      }
      const trimmedArc = trimPts(a, b, arc);
      if (polyClear(aid, bid, key, trimmedArc)) {
        result.set(key, { a: aid, b: bid, points: trimmedArc });
        addRouteTracks(key, aid, bid, trimmedArc);
        continue;
      }
    }
    const straight = trimPts(a, b, [a, b]);
    if (polyClear(aid, bid, key, straight)) {
      result.set(key, { a: aid, b: bid, points: straight });
      addRouteTracks(key, aid, bid, straight);
    } else {
      blockedQueue.push([aid, bid]);
    }
  }
  // Phase 0B: Blocked edges with crossing-aware smooth curve / A* detours
  for (const [aid, bid] of blockedQueue) {
    const key = passiveRouteKey(aid, bid);
    const pts = solveDetour(aid, bid, crossingCost, true);
    result.set(key, { a: aid, b: bid, points: pts });
    addRouteTracks(key, aid, bid, pts);
  }

  // Monotonic crossing reduction passes when crossingCost > 0
  if (crossingCost > 0) {
    const byLongest = [...ordered]
      .filter(([, [a, b]]) => !(isSkeletonNode(byId.get(a)!) && isSkeletonNode(byId.get(b)!)))
      .reverse();
    for (let pass = 0; pass < 3; pass++) {
      let changed = 0;
      for (const [key, [aid, bid]] of byLongest) {
        remRouteTracks(key);
        const prev = result.get(key)!.points;
        const pts = solveDetour(aid, bid, crossingCost, true);
        if (pts !== prev) changed++;
        result.set(key, { a: aid, b: bid, points: pts });
        addRouteTracks(key, aid, bid, pts);
      }
      if (!changed) break;
    }
  }
  return result;
}

/** The authored drawing is used only while ALL source geometry still matches.
 * Native editor changes, new nodes, links and radius/config edits automatically
 * use live obstacle routing until the author regenerates the drawing. */
export const passiveRouteGeometry = ():number[] => [CFG.nodeClearance,CFG.endpointGap,CFG.gridStep,CFG.searchMargin,
  CFG.parallelClearance,CFG.parallelAngleSin,CFG.parallelMinLength,CFG.crossingCost];
export function authoredPassiveTreeRoutes(nodes:readonly PassiveNode[],edges:readonly (readonly [string,string])[]):Map<string,PassiveTreeRoute>|undefined {
  const data=PASSIVE_TREE_ROUTE_DATA,byId=new Map(nodes.map(n=>[n.id,n]));
  const keys=new Set(edges.map(([a,b])=>passiveRouteKey(a,b)));
  if(nodes.length!==data.nodes.length||keys.size!==data.routes.length||JSON.stringify(data.geometry)!==JSON.stringify(passiveRouteGeometry()))return;
  if(!data.nodes.every(([id,x,y,r])=>{const n=byId.get(id);return n&&n.x===x&&n.y===y&&passiveTreeNodeRadius(n)===r;})||!data.routes.every(([a,b])=>keys.has(passiveRouteKey(a,b))))return;
  return new Map(data.routes.map(([a,b,coordinates])=>[passiveRouteKey(a,b),{a,b,points:coordinates.filter((_,i)=>i%2===0).map((x,i)=>({x,y:coordinates[i*2+1]}))}]));
}
let cacheKey='',cache=new Map<string,PassiveTreeRoute>();
export function passiveTreeRoutes(nodes:readonly PassiveNode[],edges:readonly (readonly [string,string])[]):Map<string,PassiveTreeRoute>{
  const key=JSON.stringify(passiveRouteGeometry())+'#'+nodes.map(n=>`${n.id}:${n.x},${n.y},${passiveTreeNodeRadius(n)}`).join(';')+'#'+edges.map(e=>e.join('|')).join(';');
  if(key!==cacheKey){cache=authoredPassiveTreeRoutes(nodes,edges)??buildPassiveTreeRoutes(nodes,edges);cacheKey=key;}return cache;
}
/** Later routes bridge earlier ones: the opaque backing cuts a visible gap
 * across the lower stroke. Both layers share one path and are pointer transparent. */
export function passiveTreeRouteArt(route:PassiveTreeRoute,active:boolean,skeleton=false):string{
  const d=route.points.map((p,i)=>(i?'L':'M')+p.x.toFixed(3)+' '+p.y.toFixed(3)).join(' ');
  const width=active?CFG.activeWidth:skeleton?CFG.skeletonWidth:CFG.width;
  const stroke = active ? CFG.active : CFG.inactive;
  return `<g class="passive-tree-route" data-a="${esc(route.a)}" data-b="${esc(route.b)}" pointer-events="none" fill="none" stroke-linecap="round" stroke-linejoin="round">
    <path class="passive-route-backing" d="${d}" stroke="${CFG.backing}" stroke-width="${width+CFG.bridgeClearance*2}"/>
    <path class="passive-route-face" d="${d}" stroke="${stroke}" stroke-width="${width}"/>
  </g>`;
}

/** Tooltip ownership includes native pointer, proximity and controller hover. */
export function highlightPassiveRoutes(root:Element,id?:string):void{
  const svg=root.querySelector('#tree-svg');if(!svg)return;
  svg.classList.toggle('tree-tracing',!!id);
  for(const el of svg.querySelectorAll<SVGElement>('.passive-tree-route,.vocation-tree-edge[data-a]'))el.classList.toggle('route-neighbor',!!id&&(el.dataset.a===id||el.dataset.b===id));
  for(const el of svg.querySelectorAll('.tree-node'))el.classList.toggle('route-origin',!!id&&el.getAttribute('data-node')===id);
}
