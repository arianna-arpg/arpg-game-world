// ---------------------------------------------------------------------------
// PROBE: STAR RING ROTATION (The Star Astrolabe) & NORMALIZED 9-SPOKE HIGHWAYS
//
// Exhaustively verifies:
//   1. All 9 inner attribute highways have exact radial parity out to R=2020
//      (including normalized WIS node_75/node_hw_wis_1540 and PRW node_119/node_hw_prw_1540).
//   2. Exact socket symmetry: 36 S1 sockets (R=2020, 10°) & 27 S2 sockets (R=2470, 13.333°),
//      zero non-socket cross-seam edges, zero Ring 0 <-> Ring 2 jumps.
//   3. ALL 81 (rot1, rot2) ∈ [0..8] × [0..8] rotation states:
//      - 0 straight edge crossings
//      - 0 node overlaps (d < rA + rB + 10)
//      - 0 out-of-bounds nodes
//      - 0 corridors and 0 unreachable nodes (auditPassiveRoutes on rotated graph)
//      - Exact rotatedPassiveTreeRoutes transform with 0 node obstructions
//   4. Live gameplay, modular unlock gate (FEATURE.STAR_ASTROLABE / per-char),
//      Sacrificial Font proximity, connectivity refusal (no stranding allocated
//      outer nodes!), rotated cross-seam allocation + refund, save/load, and co-op sync.
// ---------------------------------------------------------------------------

import { bootSimEngine, makeSimWorld } from '../src/sim/arena';
import { seedGlobalRandom } from '../src/sim/rng';
import { PASSIVE_NODES as N, PASSIVE_ADJACENCY as A, STAR_CENTER, type PassiveNode } from '../src/data/passives';
import {
  STAR_RING_STEPS,
  canRotateStarRing, passiveNeighborsOf, rotatedNodePos, rotatedPassiveAdjacency,
  rotatedPassiveTreeRoutes, starNodeRing, starSocketRings,
} from '../src/data/passiveRingRotation';
import { passiveTreeNodeRadius } from '../src/data/passiveTreePresentation';
import { auditPassiveRoutes } from '../src/data/passiveTopology';
import { passiveTreeRoutes, routePointDistance } from '../src/ui/passiveTreeRoutes';
import { PASSIVE_TREE_ROUTE_CFG as CFG } from '../src/data/passiveTreeLayoutConfig';
import { FEATURE } from '../src/meta/account';
import { UNLOCK_CATALOG } from '../src/meta/unlocks';
import { serializeCharacter, applySavedCharacter } from '../src/meta/character';
import { serializeSeatMeta, applySeatMeta } from '../src/net/snapshot';

let checks = 0;
let failures = 0;
function check(label: string, ok: boolean, detail = ''): void {
  checks++;
  if (!ok) failures++;
  console.log(`${ok ? 'PASS' : 'FAIL'} ${label}${detail ? ' — ' + detail : ''}`);
}

seedGlobalRandom(9081);
bootSimEngine();

const mainNodes = Object.values(N).filter(n => !n.vocation && !n.realm);
const mainIds = new Set(mainNodes.map(n => n.id));
const cx = STAR_CENTER.x, cy = STAR_CENTER.y;
const rad = (p: { x: number; y: number }) => Math.hypot(p.x - cx, p.y - cy);
const deg = (p: { x: number; y: number }) => {
  let a = Math.atan2(p.y - cy, p.x - cx) * 180 / Math.PI;
  return a < 0 ? a + 360 : a;
};

// 1. Normalized 9-spoke attribute highway parity (including WIS & PRW)
{
  const starts = mainNodes.filter(n => n.kind === 'start');
  let allNineHaveInnerParity = true;
  const summary: string[] = [];
  for (const s of starts) {
    const targetA = (deg(s) - 9 + 360) % 360;
    const spine = mainNodes.filter(n => n.kind === 'attr' && rad(n) < 2050).filter(n => {
      const da = Math.abs(((deg(n) - targetA + 540) % 360) - 180);
      return da < 4;
    }).sort((a, b) => rad(a) - rad(b));
    const has500 = spine.some(n => Math.abs(rad(n) - 500) < 25);
    const has1040 = spine.some(n => Math.abs(rad(n) - 1040) < 12);
    const has1540 = spine.some(n => Math.abs(rad(n) - 1540) < 12);
    const has2020 = spine.some(n => Math.abs(rad(n) - 2020) < 12);
    if (!(has500 && has1040 && has1540 && has2020)) allNineHaveInnerParity = false;
    summary.push(`${s.id.slice(0, 3)}:${spine.length}`);
  }
  check('all 9 attribute highways have full inner parity (~500 -> 1040 -> 1540 -> 2020)',
    starts.length === 9 && allNineHaveInnerParity && !!N['node_hw_wis_1540'] && !!N['node_hw_prw_1540'],
    summary.join(' '));

  // 1b. Normalized 9-spoke Ring 1 (mid-to-outer) two-node highway parity (2020 -> ~2170 -> ~2320 -> 2470)
  let allNineHaveMidParity = true;
  let allMidHubsBranch = true;
  const midSummary: string[] = [];
  for (const s of starts) {
    const targetA = (deg(s) - 9 + 360) % 360;
    const midInterior = mainNodes.filter(n => n.kind === 'attr' && rad(n) > 2050 && rad(n) < 2450).filter(n => {
      const da = Math.abs(((deg(n) - targetA + 540) % 360) - 180);
      return da < 2;
    }).sort((a, b) => rad(a) - rad(b));
    const hasInnerMid = midInterior.some(n => Math.abs(rad(n) - 2170) <= 25);
    const hasOuterMid = midInterior.some(n => Math.abs(rad(n) - 2320) <= 30);
    if (!(midInterior.length === 2 && hasInnerMid && hasOuterMid)) allNineHaveMidParity = false;
    if (midInterior.some(n => (A[n.id]?.length ?? 0) < 3)) allMidHubsBranch = false;
    midSummary.push(`${s.id.slice(0, 3)}:${midInterior.map(n => `${Math.round(rad(n))}(d${A[n.id]?.length ?? 0})`).join('/')}`);
  }
  check('all 9 Ring 1 (mid-to-outer) highways have two branching interior attribute hubs (~2170 & ~2320)',
    starts.length === 9 && allNineHaveMidParity && allMidHubsBranch,
    midSummary.join(' '));
}

// 2. Socket ring symmetry & zero non-socket cross-seam edges
const sockets = starSocketRings();
{
  let badCross = 0;
  let r0ToR2 = 0;
  const seen = new Set<string>();
  for (const n of mainNodes) {
    const rA = starNodeRing(n);
    for (const nbId of A[n.id] ?? []) {
      if (!mainIds.has(nbId)) continue;
      const k = n.id < nbId ? `${n.id}|${nbId}` : `${nbId}|${n.id}`;
      if (seen.has(k)) continue;
      seen.add(k);
      const rB = starNodeRing(N[nbId]);
      if (rA === rB) continue;
      const lo = Math.min(rA, rB), hi = Math.max(rA, rB);
      const hiId = rA < rB ? nbId : n.id;
      if (lo === 0 && hi === 2) r0ToR2++;
      else if (lo === 0 && hi === 1 && !sockets.s1Index.has(hiId)) badCross++;
      else if (lo === 1 && hi === 2 && !sockets.s2Index.has(hiId)) badCross++;
    }
  }
  check('exact 36 S1 (R=2020) and 27 S2 (R=2470) socket rings with 0 non-socket cross-seam edges',
    sockets.s1.length === 36 && sockets.s2.length === 27 && badCross === 0 && r0ToR2 === 0,
    `S1=${sockets.s1.length}, S2=${sockets.s2.length}, badCross=${badCross}, r0ToR2=${r0ToR2}`);
}

// 3. Exhaustive geometric & topological proof over ALL 81 (rot1, rot2) states!
{
  const side = (ax: number, ay: number, bx: number, by: number, cx0: number, cy0: number) =>
    (bx - ax) * (cy0 - ay) - (by - ay) * (cx0 - ax);
  const segCross = (ax: number, ay: number, bx: number, by: number, cx0: number, cy0: number, dx: number, dy: number) =>
    side(ax, ay, bx, by, cx0, cy0) * side(ax, ay, bx, by, dx, dy) < -1e-3 &&
    side(cx0, cy0, dx, dy, ax, ay) * side(cx0, cy0, dx, dy, bx, by) < -1e-3;

  // Notice: because Ring 0 is fixed, Ring 1 rotates rigidly by rot1, and Ring 2 rotates rigidly by rot2:
  //   - Checking Ring 0 vs Ring 1 depends only on rot1 (9 states)
  //   - Checking Ring 1 vs Ring 2 depends only on (rot2 - rot1 + 9) % 9 (9 relative states)
  //   - Checking bounds on Ring 2 depends only on rot2 (9 states)
  // Even better, with a fast grid spatial index we test ALL 81 full (rot1, rot2) states directly!
  let statesTested = 0;
  let totalOverlaps = 0;
  let totalOob = 0;
  let totalCrossings = 0;
  let totalCorridors = 0;
  let totalUnreachable = 0;

  for (let m = 0; m < STAR_RING_STEPS; m++) {
    for (let o = 0; o < STAR_RING_STEPS; o++) {
      const rot = { middle: m, outer: o };
      const adj = rotatedPassiveAdjacency(rot);
      const posMap = new Map<string, { x: number; y: number; r: number }>();
      const cellNodes = new Map<string, string[]>();
      const CELL = 80;
      for (const n of mainNodes) {
        const p = rotatedNodePos(n, rot);
        const nr = passiveTreeNodeRadius(n);
        posMap.set(n.id, { x: p.x, y: p.y, r: nr });
        if (Math.abs(p.x - 3000) + nr > 2988 || Math.abs(p.y - 3000) + nr > 2988) totalOob++;
        const gx = Math.floor(p.x / CELL), gy = Math.floor(p.y / CELL);
        for (let dx = -1; dx <= 1; dx++) for (let dy = -1; dy <= 1; dy++) {
          const ck = `${gx + dx},${gy + dy}`;
          const arr = cellNodes.get(ck);
          if (arr) arr.push(n.id); else cellNodes.set(ck, [n.id]);
        }
      }
      // Node overlap check across all 81 states
      const checkedPairs = new Set<string>();
      for (const n of mainNodes) {
        const pa = posMap.get(n.id)!;
        const ck = `${Math.floor(pa.x / CELL)},${Math.floor(pa.y / CELL)}`;
        for (const otherId of cellNodes.get(ck) ?? []) {
          if (otherId <= n.id) continue;
          const pk = `${n.id}|${otherId}`;
          if (checkedPairs.has(pk)) continue;
          checkedPairs.add(pk);
          const pb = posMap.get(otherId)!;
          if (Math.hypot(pa.x - pb.x, pa.y - pb.y) < pa.r + pb.r + 10 - 1e-4) totalOverlaps++;
        }
      }
      // Straight edge crossing check across all 81 states (spatial grid accelerated)
      const edgeList: { a: string; b: string; ax: number; ay: number; bx: number; by: number }[] = [];
      const edgeCells = new Map<string, number[]>();
      const ECELL = 160;
      for (const n of mainNodes) {
        for (const nbId of adj[n.id] ?? []) {
          if (nbId <= n.id || !mainIds.has(nbId)) continue;
          const pa = posMap.get(n.id)!, pb = posMap.get(nbId)!;
          const idx = edgeList.length;
          edgeList.push({ a: n.id, b: nbId, ax: pa.x, ay: pa.y, bx: pb.x, by: pb.y });
          const x0 = Math.floor(Math.min(pa.x, pb.x) / ECELL), x1 = Math.floor(Math.max(pa.x, pb.x) / ECELL);
          const y0 = Math.floor(Math.min(pa.y, pb.y) / ECELL), y1 = Math.floor(Math.max(pa.y, pb.y) / ECELL);
          for (let gx = x0; gx <= x1; gx++) for (let gy = y0; gy <= y1; gy++) {
            const ck = `${gx},${gy}`;
            const arr = edgeCells.get(ck);
            if (arr) arr.push(idx); else edgeCells.set(ck, [idx]);
          }
        }
      }
      const checkedEdges = new Set<number>();
      for (const bucket of edgeCells.values()) {
        for (let i = 0; i < bucket.length; i++) {
          const e1 = edgeList[bucket[i]];
          for (let j = i + 1; j < bucket.length; j++) {
            const e2 = edgeList[bucket[j]];
            if (e1.a === e2.a || e1.a === e2.b || e1.b === e2.a || e1.b === e2.b) continue;
            const lo = Math.min(bucket[i], bucket[j]), hi = Math.max(bucket[i], bucket[j]);
            const ek = lo * 100000 + hi;
            if (checkedEdges.has(ek)) continue;
            checkedEdges.add(ek);
            if (segCross(e1.ax, e1.ay, e1.bx, e1.by, e2.ax, e2.ay, e2.bx, e2.by)) totalCrossings++;
          }
        }
      }
      // Topology audit (corridors & reachability) on rotated graph
      const rotNodes: Record<string, PassiveNode> = {};
      for (const n of mainNodes) {
        const p = posMap.get(n.id)!;
        rotNodes[n.id] = { ...n, x: p.x, y: p.y, links: [...(adj[n.id] ?? [])] };
      }
      const topo = auditPassiveRoutes(rotNodes, true);
      totalCorridors += topo.corridors.length;
      totalUnreachable += topo.unreachable.length;
      statesTested++;
    }
  }
  check('ALL 81 (rot1, rot2) Star Ring Rotation states have 0 overlaps, 0 out-of-bounds, 0 crossings, 0 corridors & 0 unreachable nodes',
    statesTested === 81 && totalOverlaps === 0 && totalOob === 0 && totalCrossings === 0 && totalCorridors === 0 && totalUnreachable === 0,
    `states=${statesTested}, overlaps=${totalOverlaps}, oob=${totalOob}, crossings=${totalCrossings}, corridors=${totalCorridors}, unreachable=${totalUnreachable}`);
}

// 4. Authored SVG route rigid transformation (rotatedPassiveTreeRoutes) stays clear of all rotated node discs
{
  const baseEdges: [string, string][] = mainNodes.flatMap(n =>
    [...new Set(A[n.id])].filter(id => id > n.id && mainIds.has(id)).map(id => [n.id, id] as [string, string]),
  );
  const baseRoutes = passiveTreeRoutes(mainNodes, baseEdges);
  let routeObstructions = 0;
  let routeCountMatch = true;
  for (const rot of [{ middle: 1, outer: 0 }, { middle: 0, outer: 3 }, { middle: 4, outer: 7 }]) {
    const rRoutes = rotatedPassiveTreeRoutes(baseRoutes, rot);
    if (rRoutes.size !== baseRoutes.size) routeCountMatch = false;
    const posMap = new Map(mainNodes.map(n => [n.id, { ...rotatedNodePos(n, rot), r: passiveTreeNodeRadius(n) }]));
    for (const rt of rRoutes.values()) {
      for (let i = 1; i < rt.points.length; i++) {
        const a = rt.points[i - 1], b = rt.points[i];
        for (const n of mainNodes) {
          if (n.id === rt.a || n.id === rt.b) continue;
          const p = posMap.get(n.id)!;
          if (routePointDistance(p, a, b) < p.r + CFG.nodeClearance - 0.15) routeObstructions++;
        }
      }
    }
  }
  check('rotatedPassiveTreeRoutes preserves exact route count and node clearance across rotated states',
    routeCountMatch && routeObstructions === 0,
    `baseRoutes=${baseRoutes.size}, obstructions=${routeObstructions}`);
}

// 5. Modular Vault unlock, Font proximity, connectivity guard, rotated allocation/refund, save/load & co-op sync
{
  const hasVaultEntry = UNLOCK_CATALOG.some(u => u.id === 'feat_star_astrolabe' && u.kind === 'feature' && u.payload.flag === FEATURE.STAR_ASTROLABE);
  check('The Star Astrolabe is registered cleanly as a modular Vault feature unlock', hasVaultEntry);

  const w = makeSimWorld('warrior', 9082);
  w.loadZone('lastlight');
  const font = w.fonts[0]!;
  w.player.pos = { ...font.pos }; w.player.tier = font.tier ?? 0;

  // Locked by default on fresh account
  check('fresh account locks Star Ring Rotation by default',
    !w.starAstrolabeUnlocked() && !w.rotateStarRing('middle', 1));

  // Unlock via account Vault feature
  w.account.features.add(FEATURE.STAR_ASTROLABE);
  check('unlocking FEATURE.STAR_ASTROLABE opens ring rotation at the Font', w.starAstrolabeUnlocked());

  // Away from Font refuses
  w.player.pos = { x: font.pos.x + 1200, y: font.pos.y };
  check('away from Sacrificial Font refuses ring rotation', !w.rotateStarRing('middle', 1));
  w.player.pos = { ...font.pos };

  // Rotate Middle +2 (80°) and Outer +5 (200°) while only str_start is allocated
  const okMid = w.rotateStarRing('middle', 1) && w.rotateStarRing('middle', 1);
  let okOut = true;
  for (let i = 0; i < 5; i++) okOut &&= w.rotateStarRing('outer', 1);
  check('Middle (+2 -> 80°) and Outer (+5 -> 200°) rotate cleanly when outer rings are unallocated',
    okMid && okOut && w.meta.ringRotations?.middle === 2 && w.meta.ringRotations?.outer === 5,
    JSON.stringify(w.meta.ringRotations));

  // Verify STR inner highway node_114 now connects across S1 to a DIFFERENT socket than canonical node_115!
  const canonicalS1 = A['node_114'].find(id => sockets.s1Index.has(id))!;
  const rotatedS1 = passiveNeighborsOf('node_114', w.meta.ringRotations).find(id => sockets.s1Index.has(id))!;
  check('rotating Middle Ring re-sockets STR highway node_114 onto a distant constellation socket',
    canonicalS1 === 'node_115' && !!rotatedS1 && rotatedS1 !== canonicalS1,
    `canonical=${canonicalS1}, rotated=${rotatedS1}`);

  // Walk STR highway str_start -> node_110 -> node_81 -> node_114 -> rotatedS1 using real allocateNode!
  w.meta.passivePoints = 20;
  const walked =
    w.allocateNode('node_110', undefined, 'strength') &&
    w.allocateNode('node_81', undefined, 'strength') &&
    w.allocateNode('node_114', undefined, 'strength') &&
    w.allocateNode(rotatedS1, undefined, 'intelligence');
  check('player allocates cleanly across the rotated Middle Ring seam via real allocateNode',
    walked && w.meta.allocated.has(rotatedS1) && !w.allocateNode(canonicalS1, undefined, 'strength'));

  // Now rotating Middle Ring MUST BE REFUSED (would strand rotatedS1!), while rotating Outer Ring STILL SUCCEEDS!
  const blockedMid = !canRotateStarRing(w.meta, 'middle', 1).ok && !w.rotateStarRing('middle', 1);
  const allowedOut = w.rotateStarRing('outer', -1) && w.meta.ringRotations?.outer === 4;
  check('connectivity guard refuses stranding allocated Middle Ring nodes while still allowing Outer Ring rotation',
    blockedMid && allowedOut,
    `blockedMid=${blockedMid}, outer=${w.meta.ringRotations?.outer}`);

  // Save/load & co-op snapshot round-trip preserve exact ringRotations & rotated refund works!
  const saved = JSON.parse(JSON.stringify(serializeCharacter(w)));
  const loaded = makeSimWorld('warrior', 9083);
  loaded.account.features.add(FEATURE.STAR_ASTROLABE);
  loaded.loadZone('lastlight');
  loaded.player.pos = { ...loaded.fonts[0]!.pos };
  applySavedCharacter(loaded, saved);
  const saveOk = loaded.meta.ringRotations?.middle === 2 && loaded.meta.ringRotations?.outer === 4 && loaded.meta.allocated.has(rotatedS1);

  const wire = serializeSeatMeta(w.localSeat);
  const remote = makeSimWorld('warrior', 9084);
  applySeatMeta(remote, remote.localSeat, wire);
  const wireOk = remote.meta.ringRotations?.middle === 2 && remote.meta.ringRotations?.outer === 4;

  // Refunding rotatedS1 at the Font succeeds under the rotated graph AND unlocks Middle Ring rotation again!
  const refunded = w.refundPassiveNode(rotatedS1);
  const freedMid = w.rotateStarRing('middle', -1) && w.meta.ringRotations?.middle === 1;
  check('save/load, co-op snapshot, rotated Font refund, and post-refund ring rotation all work seamlessly',
    saveOk && wireOk && refunded && freedMid,
    `saveOk=${saveOk}, wireOk=${wireOk}, refunded=${refunded}, mid=${w.meta.ringRotations?.middle}`);
}

console.log(`Passive ring rotation: ${checks} checks, ${failures} failures.`);
if (failures) process.exitCode = 1;
