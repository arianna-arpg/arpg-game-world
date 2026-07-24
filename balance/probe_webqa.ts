// ---------------------------------------------------------------------------
// WORLD-WEB TOPOLOGY QA — the map's link graph measured, not eyeballed.
//
// Grows real world webs headless (the same chartNeighborsOf the eager web,
// the survey spire, and the forechart sweep all ride) and PINS the web laws:
//
//   THE ROAD BUDGET (worldgen.roadBudgetOf ← BiomeInfo.maxRoads):
//     no zone holds more charted roads than its biome budget — the weave, the
//     proximity linker, the expanse's inbound snap, and the frontier-
//     resolution gate all answer to the one read. The Fields' hub stands at
//     its own (higher) budget; the Jungle presses one past the world cap.
//   THE HUB LAW + LANDINGS: a Field expanse deals its boundary spread
//     (FIELD_GEN.hubSpread) and stamps a map BERTH per stop, so roads land on
//     the region's edge instead of converging on the centre dot.
//   THE SHARD LAW (FIELD_GEN.maxSpanCells): no single expanse spans more than
//     the macro window — a mega-blob mints as a CHAIN of expanses, and the
//     flood is entry-independent per shard (mint-once holds).
//   THE FOOTPRINT LAW (worldgen.footprintBars): no road whose both ends stand
//     outside an expanse cuts across its core rect — at forge time AND
//     retroactively (mint-time sever + the restore reconcile).
//   HYGIENE: no one-way roads, no duplicate edges; crossings / node-disc
//     passes / crowding held to sane ceilings (the "messy interlinks" gauge).
//   THE HEAL (World.reconcileWebLaws): a saved expanse past budget sheds to
//     it (belt-protected) and re-stamps missing berths.
//
// Run: npx tsx balance/probe_webqa.ts [--seeds N] [--rounds N] [--report]
// ---------------------------------------------------------------------------

import { bootSimEngine, makeSimWorld } from '../src/sim/arena';
import { seedGlobalRandom } from '../src/sim/rng';
import type { World } from '../src/engine/world';
import type { ZoneDef, ZoneExitDef } from '../src/data/zones';
import { HUB_ZONE, START_ZONE } from '../src/data/zones';
import { MAX_DEGREE, WEB_CFG, connectFloatingZone, countRoads, placeZoneAt, roadBudgetOf, settleWeb } from '../src/engine/worldgen';
import { FIELD_BIOME, FIELD_GEN, fieldCoreRect, fieldRegionAt } from '../src/world/fieldRegion';
import { biomeAt, biomeSpacing } from '../src/world/biomes';
import { zoneKindOf } from '../src/data/zoneKinds';
import { QUESTS } from '../src/quests/defs';
import { Rng } from '../src/core/rng';
import { FORECHART_CFG } from '../src/world/forechart';

const args = process.argv.slice(2);
const argNum = (name: string, dflt: number): number => {
  const i = args.indexOf(`--${name}`);
  return i >= 0 && args[i + 1] ? Number(args[i + 1]) : dflt;
};
const SEEDS = argNum('seeds', 3);
const ROUNDS = argNum('rounds', 11);
const REPORT = args.includes('--report');

let failed = 0;
const check = (name: string, ok: boolean, detail = ''): void => {
  console.log(`${ok ? 'PASS' : 'FAIL'}  ${name}${detail ? ' — ' + detail : ''}`);
  if (!ok) failed++;
};

bootSimEngine();

// --- geometry helpers (probe-local copies; the engine's are module-private) --
function segCross(p1: { x: number; y: number }, p2: { x: number; y: number }, p3: { x: number; y: number }, p4: { x: number; y: number }): boolean {
  const d = (a: { x: number; y: number }, b: { x: number; y: number }, c: { x: number; y: number }): number =>
    (b.x - a.x) * (c.y - a.y) - (b.y - a.y) * (c.x - a.x);
  const d1 = d(p3, p4, p1), d2 = d(p3, p4, p2), d3 = d(p1, p2, p3), d4 = d(p1, p2, p4);
  return ((d1 > 0 && d2 < 0) || (d1 < 0 && d2 > 0)) && ((d3 > 0 && d4 < 0) || (d3 < 0 && d4 > 0));
}
function segPointDist(a: { x: number; y: number }, b: { x: number; y: number }, c: { x: number; y: number }): number {
  const abx = b.x - a.x, aby = b.y - a.y;
  const l2 = abx * abx + aby * aby;
  if (l2 === 0) return Math.hypot(c.x - a.x, c.y - a.y);
  let t = ((c.x - a.x) * abx + (c.y - a.y) * aby) / l2;
  t = Math.max(0, Math.min(1, t));
  return Math.hypot(c.x - (a.x + t * abx), c.y - (a.y + t * aby));
}
function segCrossesRect(a: { x: number; y: number }, b: { x: number; y: number }, r: { x0: number; y0: number; x1: number; y1: number }): boolean {
  const inside = (p: { x: number; y: number }): boolean => p.x >= r.x0 && p.x <= r.x1 && p.y >= r.y0 && p.y <= r.y1;
  if (inside(a) || inside(b)) return true;
  const c1 = { x: r.x0, y: r.y0 }, c2 = { x: r.x1, y: r.y0 }, c3 = { x: r.x1, y: r.y1 }, c4 = { x: r.x0, y: r.y1 };
  return segCross(a, b, c1, c2) || segCross(a, b, c2, c3) || segCross(a, b, c3, c4) || segCross(a, b, c4, c1);
}

interface Edge { a: ZoneDef; b: ZoneDef }
interface Stats {
  zones: number; edges: number; overBudget: { id: string; biome: string; roads: number; budget: number }[];
  fields: { id: string; roads: number; berths: number; nodeW: number; nodeH: number }[];
  crossings: number; nodeHits: number; footprintCrossers: number;
  oneWay: number; dup: number; crowded: number; jungleOverBase: number;
}

function surfaceZones(w: World): ZoneDef[] {
  return Object.values(w.zoneMap).filter(z => (z.dimension ?? 'surface') === 'surface' && z.caveDepth == null);
}

function measure(w: World): Stats {
  const zones = surfaceZones(w);
  const byId = new Map(zones.map(z => [z.id, z] as const));
  const edges: Edge[] = [];
  const seen = new Set<string>();
  let oneWay = 0, dup = 0;
  for (const z of zones) {
    const targets = new Set<string>();
    for (const e of z.exits) {
      if (e.to === '?' || e.crossDim) continue;
      const b = byId.get(e.to);
      if (!b) continue;
      if (targets.has(e.to)) dup++;
      targets.add(e.to);
      if (!b.exits.some(x => x.to === z.id)) oneWay++;
      const key = z.id < e.to ? `${z.id}|${e.to}` : `${e.to}|${z.id}`;
      if (!seen.has(key)) { seen.add(key); edges.push({ a: z, b }); }
    }
  }
  const overBudget: Stats['overBudget'] = [];
  let jungleOverBase = 0;
  for (const z of zones) {
    if (z.objective.kind === 'safe') continue;
    const roads = countRoads(z), budget = roadBudgetOf(z);
    if (roads > budget) overBudget.push({ id: z.id, biome: z.biome ?? '?', roads, budget });
    if (z.biome === 'jungle' && roads > MAX_DEGREE) jungleOverBase++;
  }
  const fields: Stats['fields'] = zones
    .filter(z => z.biome === FIELD_BIOME && z.field)
    .map(z => ({
      id: z.id, roads: countRoads(z), berths: z.berths?.length ?? 0,
      nodeW: z.field!.nodeW ?? 0, nodeH: z.field!.nodeH ?? 0,
    }));
  let crossings = 0;
  for (let i = 0; i < edges.length; i++) {
    for (let j = i + 1; j < edges.length; j++) {
      const e1 = edges[i], e2 = edges[j];
      if (e1.a === e2.a || e1.a === e2.b || e1.b === e2.a || e1.b === e2.b) continue;
      if (segCross(e1.a.map, e1.b.map, e2.a.map, e2.b.map)) crossings++;
    }
  }
  const NODE_R = 18;
  let nodeHits = 0;
  for (const e of edges) {
    for (const z of zones) {
      if (z === e.a || z === e.b) continue;
      if (segPointDist(e.a.map, e.b.map, z.map) < NODE_R) nodeHits++;
    }
  }
  let footprintCrossers = 0;
  for (const fz of zones) {
    if (fz.biome !== FIELD_BIOME || !fz.field) continue;
    const r = fieldCoreRect(fz.field, fz.size);
    if (r.x1 <= r.x0 || r.y1 <= r.y0) continue;
    const inside = (p: { x: number; y: number }): boolean => p.x >= r.x0 && p.x <= r.x1 && p.y >= r.y0 && p.y <= r.y1;
    for (const e of edges) {
      if (e.a === fz || e.b === fz) continue;
      if (inside(e.a.map) || inside(e.b.map)) continue; // a spoke-side/bay endpoint — exempt by the law
      if (segCrossesRect(e.a.map, e.b.map, r)) footprintCrossers++;
    }
  }
  let crowded = 0;
  for (let i = 0; i < zones.length; i++) {
    for (let j = i + 1; j < zones.length; j++) {
      const a = zones[i], b = zones[j];
      const minSep = Math.min(biomeSpacing(a.biome), biomeSpacing(b.biome)) * 0.5;
      if (Math.hypot(a.map.x - b.map.x, a.map.y - b.map.y) < minSep) crowded++;
    }
  }
  return { zones: zones.length, edges: edges.length, overBudget, fields, crossings, nodeHits, footprintCrossers, oneWay, dup, crowded, jungleOverBase };
}

// ---------------------------------------------------------------------------
// Grow + measure one world per seed; assert the laws on the union.
const worlds: { w: World; seed: number; stats: Stats }[] = [];
for (let s = 0; s < SEEDS; s++) {
  const seed = (0x9e3b01 + s * 0x1111) >>> 0;
  seedGlobalRandom(seed);
  const w = makeSimWorld('warrior', seed);
  w.loadZone(HUB_ZONE);
  const chart = (w as unknown as { chartNeighborsOf(z: ZoneDef): void });
  for (let r = 0; r < ROUNDS; r++) {
    const batch = Object.values(w.zoneMap).filter(z =>
      (z.dimension ?? 'surface') === 'surface' && z.caveDepth == null && !z.pocket
      && z.objective.kind !== 'safe' && !z.floating && !zoneKindOf(z)?.staticExits
      && z.exits.some(e => e.to === '?'));
    for (const z of batch) chart.chartNeighborsOf(z);
  }
  worlds.push({ w, seed, stats: measure(w) });
}
// The laws' field checks need at least ONE expanse minted somewhere — under
// the occupancy law growth is honest (sparser), so a seed set may stop short
// of field country in the standard rounds. Grow the first world further
// until an expanse appears (bounded; re-measure it after).
{
  const hasField = (): boolean => worlds.some(r => surfaceZones(r.w).some(z => z.field));
  const { w } = worlds[0];
  const chart = (w as unknown as { chartNeighborsOf(z: ZoneDef): void });
  for (let extra = 0; extra < 8 && !hasField(); extra++) {
    const batch = Object.values(w.zoneMap).filter(z =>
      (z.dimension ?? 'surface') === 'surface' && z.caveDepth == null && !z.pocket
      && z.objective.kind !== 'safe' && !z.floating && !zoneKindOf(z)?.staticExits
      && z.exits.some(e => e.to === '?'));
    for (const z of batch) chart.chartNeighborsOf(z);
    worlds[0].stats = measure(w);
  }
}

const tot = (f: (s: Stats) => number): number => worlds.reduce((a, r) => a + f(r.stats), 0);
const allFields = worlds.flatMap(r => r.stats.fields);
const allOver = worlds.flatMap(r => r.stats.overBudget);

console.log(`\n=== WORLD-WEB TOPOLOGY QA (${SEEDS} seeds × ${ROUNDS} rounds) ===`);
for (const r of worlds) {
  const s = r.stats;
  console.log(`  seed ${r.seed.toString(16)}: ${s.zones} zones ${s.edges} edges — cross ${s.crossings}, node-hits ${s.nodeHits}, fp-cross ${s.footprintCrossers}, crowded ${s.crowded}, fields ${s.fields.length}`);
  if (REPORT) {
    for (const f of s.fields) console.log(`    field ${f.id}: ${f.roads} roads, ${f.berths} berths, bbox ${Math.round(f.nodeW)}x${Math.round(f.nodeH)}`);
  }
}

// ------------------------------------------------ A. THE ROAD BUDGET
check('A: no zone exceeds its biome road budget', allOver.length === 0,
  allOver.length ? allOver.slice(0, 4).map(o => `${o.biome} ${o.id} ${o.roads}/${o.budget}`).join(', ') : `${tot(s => s.zones)} zones clean`);
check('A: the world still GROWS under the budget gate', worlds.every(r => r.stats.zones > 80),
  worlds.map(r => r.stats.zones).join('/'));

// ------------------------------------------------ B. THE HUB LAW + LANDINGS
const expectBerths = FIELD_GEN.hubSpread.length * 4;
check('B: every expanse carries its landings (berths)', allFields.every(f => f.berths === expectBerths),
  `${allFields.length} expanse(s), ${expectBerths} berths each`);
check('B: expanse roads within the hub budget', allFields.every(f => f.roads <= roadBudgetOf({ biome: FIELD_BIOME } as ZoneDef)),
  allFields.map(f => f.roads).join('/') || 'none minted in range');
// ------------------------------------------------ C. THE SHARD LAW
const spanCap = FIELD_GEN.maxSpanCells * FIELD_GEN.step;
const worstSpan = Math.max(0, ...allFields.map(f => Math.max(f.nodeW, f.nodeH)));
check('C: no expanse spans past the shard window (+pad frame)',
  allFields.every(f => {
    const padSlack = 2 * (FIELD_GEN.padPx / FIELD_GEN.minScale); // widest possible frame
    return f.nodeW <= spanCap + padSlack && f.nodeH <= spanCap + padSlack;
  }), `worst ${Math.round(worstSpan)} vs window ${spanCap}`);
// Entry-independence: re-flood each minted expanse from a second field cell
// inside its own core rect — the shard must hash the SAME regionId.
{
  let checked = 0, agree = 0;
  for (const { w } of worlds) {
    for (const z of surfaceZones(w)) {
      if (z.biome !== FIELD_BIOME || !z.field) continue;
      const f = z.field;
      const r = fieldCoreRect(f, z.size);
      outer: for (let iy = 0; iy < 5; iy++) {
        for (let ix = 0; ix < 5; ix++) {
          const c = { x: r.x0 + (r.x1 - r.x0) * (0.15 + 0.175 * ix), y: r.y0 + (r.y1 - r.y0) * (0.15 + 0.175 * iy) };
          if (biomeAt(c, f.seed) !== FIELD_BIOME) continue;
          const again = fieldRegionAt(c, f.seed);
          checked++;
          if (again && again.regionId === f.regionId) agree++;
          break outer;
        }
      }
    }
  }
  check('C: shard flood is entry-independent (mint-once holds)', checked > 0 && agree === checked,
    `${agree}/${checked} re-floods agree`);
}

// ------------------------------------------------ D. THE FOOTPRINT LAW
// BACK-EDGES are the one exempt former (reachability is sacred: a fresh
// mint's only road may clip a rect corner, and the sever's belt refuses to
// cut it while it IS the only road — later sweeps heal it once the web
// densifies). Everything else is barred at forge time, so the residue is a
// hard ceiling, not a drift: was 106 crossers pre-law.
const fpCap = Math.max(2, Math.ceil(tot(s => s.edges) * 0.005));
check('D: roads across expanse rects held to the back-edge residue', tot(s => s.footprintCrossers) <= fpCap,
  `${tot(s => s.footprintCrossers)} ≤ ${fpCap} (was 106 pre-law)`);

// ------------------------------------------------ E. HYGIENE + LEGIBILITY
check('E: no one-way roads', tot(s => s.oneWay) === 0, `${tot(s => s.oneWay)}`);
check('E: no duplicate edges', tot(s => s.dup) === 0, `${tot(s => s.dup)}`);
const edgesAll = tot(s => s.edges);
check('E: edge crossings held (≤0.6/edge; was 0.89 pre-law)', tot(s => s.crossings) / edgesAll <= 0.6,
  `${tot(s => s.crossings)}/${edgesAll} = ${(tot(s => s.crossings) / edgesAll).toFixed(2)}`);
check('E: roads through node discs held (≤0.25/edge; was 0.38 pre-law)', tot(s => s.nodeHits) / edgesAll <= 0.25,
  `${(tot(s => s.nodeHits) / edgesAll).toFixed(2)}`);
check('E: node crowding held (≤6 pairs per 100 zones)', tot(s => s.crowded) / tot(s => s.zones) * 100 <= 6,
  `${(tot(s => s.crowded) / tot(s => s.zones) * 100).toFixed(1)}`);
console.log(`  (info) jungle nodes pressing past the world cap by their own budget: ${tot(s => s.jungleOverBase)}`);

// ------------------------------------------------ F. THE HEAL (reconcileWebLaws)
{
  // Heal against a world that actually minted an expanse (honest growth may
  // leave some seed short of field country in the standard rounds).
  const { w } = worlds.filter(r => surfaceZones(r.w).some(z => z.field)).pop() ?? worlds[0];
  const zones = surfaceZones(w);
  let field = zones.find(z => z.biome === FIELD_BIOME && z.field);
  check('F: a minted expanse exists to heal against', !!field, field?.id ?? 'NONE');
  if (field) {
    // Wound it: strip the berths, bolt on stub spokes far past budget, and
    // lay a road cutting straight across the core rect.
    field.berths = [];
    const mk = (id: string, x: number, y: number): ZoneDef => ({
      ...field!, id, name: id, field: undefined, berths: undefined, biome: 'grove',
      map: { x, y }, exits: [] as ZoneExitDef[], size: { w: 1200, h: 900 },
    });
    const r = fieldCoreRect(field.field!, field.size);
    const cx = (r.x0 + r.x1) / 2, cy = (r.y0 + r.y1) / 2;
    const stubs: ZoneDef[] = [];
    for (let i = 0; i < 12; i++) {
      const ang = (i / 12) * Math.PI * 2;
      const s = mk(`qa_stub_${i}`, cx + Math.cos(ang) * 400, cy + Math.sin(ang) * 400);
      w.zoneMap[s.id] = s; stubs.push(s);
    }
    for (const [i, s] of stubs.entries()) {
      const n = stubs[(i + 1) % stubs.length];
      s.exits.push({ to: n.id, side: 'e' }, { to: field.id, side: 'n' });
      n.exits.push({ to: s.id, side: 'w' });
      field.exits.push({ to: s.id, side: 's', at: 0.5 });
    }
    // The crosser: two opposite stubs joined straight over the meadow.
    stubs[0].exits.push({ to: stubs[6].id, side: 'e' });
    stubs[6].exits.push({ to: stubs[0].id, side: 'w' });
    const before = countRoads(field);
    w.reconcileWebLaws();
    const after = countRoads(field);
    const budget = roadBudgetOf(field);
    check('F: the heal sheds an over-budget expanse to its budget', before > budget && after <= budget,
      `${before} → ${after} (budget ${budget})`);
    check('F: the heal re-stamps missing berths', (field.berths?.length ?? 0) === expectBerths,
      `${field.berths?.length ?? 0}`);
    const dangling = stubs.filter(s => s.exits.some(e => e.to === field!.id) !== field!.exits.some(e => e.to === s.id)).length;
    check('F: shed roads leave no one-way stumps', dangling === 0, `${dangling}`);
    const crosserGone = !stubs[0].exits.some(e => e.to === stubs[6].id) && !stubs[6].exits.some(e => e.to === stubs[0].id);
    check('F: the footprint sweep severs the road over the meadow', crosserGone);
  }
}

// ------------------------------------------------ G. QUEST MINTS never lock out
// The story's directed mints (acceptQuest → placeZoneAt) must mint, link,
// stay reachable, and survive every ambient heal — in a SATURATED grown web
// (the exact ground the level-5 quest mints into one step from town).
{
  const { w } = worlds[1] ?? worlds[0];
  const cast = w as unknown as { acceptQuest(q: unknown): void };
  const zonesOf = (): ZoneDef[] => surfaceZones(w);
  const bfsFromTown = (): Set<string> => {
    const byId = new Map(zonesOf().map(z => [z.id, z] as const));
    const seen = new Set<string>([START_ZONE]);
    const queue = [START_ZONE];
    while (queue.length) {
      const z = byId.get(queue.pop()!);
      if (!z) continue;
      for (const e of z.exits) {
        if (e.to === '?' || e.crossDim || seen.has(e.to) || !byId.has(e.to)) continue;
        seen.add(e.to); queue.push(e.to);
      }
    }
    return seen;
  };
  const hoverOk = (z: ZoneDef): { ok: boolean; worst: number } => {
    let worst = Infinity;
    for (const o of zonesOf()) {
      if (o.id === z.id || (o.dimension ?? 'surface') !== (z.dimension ?? 'surface')) continue;
      worst = Math.min(worst, Math.hypot(o.map.x - z.map.x, o.map.y - z.map.y));
    }
    return { ok: worst >= WEB_CFG.hoverClear, worst: Math.round(worst) };
  };

  // --- the level-5 exemplar (the Odyssey's first rung)
  cast.acceptQuest(QUESTS['undead_south_l5']);
  const qz = w.zoneMap['quest_undead_south_l5'];
  check('G: the level-5 quest zone MINTS in a saturated web', !!qz, qz?.id ?? 'MISSING');
  if (qz) {
    const back = qz.exits.find(e => e.to !== '?' && !e.crossDim);
    const anchor = back ? w.zoneMap[back.to] : undefined;
    check('G: the quest zone links its anchor BOTH ways',
      !!anchor && anchor.exits.some(e => e.to === qz.id), anchor?.id ?? 'no back-edge');
    check('G: the anchor stands on the CONNECTED graph (never floating/hidden/sealed)',
      !!anchor && !anchor.floating && !anchor.concealed && !zoneKindOf(anchor)?.staticExits && !anchor.pocket,
      anchor?.id ?? '');
    check('G: the quest road is a NOTARIZED deed both ways',
      qz.exits.some(e => e.to === anchor?.id && e.notarized === true)
      && !!anchor && anchor.exits.some(e => e.to === qz.id && e.notarized === true));
    check('G: the quest zone is BFS-reachable from town', bfsFromTown().has(qz.id));
    check('G: the quest zone carries its waypoint home', qz.waypoint === true);
    check('G: the quest zone stands OUTSIDE every expanse footprint',
      !zonesOf().some(f => f.field && f.id !== qz.id && (() => {
        const r = fieldCoreRect(f.field!, f.size);
        return qz.map.x >= r.x0 && qz.map.x <= r.x1 && qz.map.y >= r.y0 && qz.map.y <= r.y1;
      })()));
    const hv = hoverOk(qz);
    check('G: the quest zone reads on the chart (hover floor)', hv.ok, `nearest ${hv.worst} ≥ ${WEB_CFG.hoverClear}`);
    // The heals must never cut the story's road.
    w.reconcileWebLaws();
    w.reconcileSeaPorts();
    check('G: the quest road SURVIVES the ambient heals',
      qz.exits.some(e => e.to === anchor?.id) && !!anchor && anchor.exits.some(e => e.to === qz.id));
    const before = Object.keys(w.zoneMap).length;
    cast.acceptQuest(QUESTS['undead_south_l5']);
    check('G: re-accept mints NO twin', Object.keys(w.zoneMap).length === before);
  }

  // --- the floating find-it (relic) wires in as a deed
  cast.acceptQuest(QUESTS['relic_east_l8']);
  const rz = w.zoneMap['quest_relic_east_l8'];
  check('G: the floating quest MINTS disconnected', !!rz && rz.floating === true,
    rz ? `floating=${rz.floating}` : 'MISSING');
  if (rz) {
    // Veil the neighbourhood first: the wire-in must LIFT its anchor's veil,
    // or the drawn road is swallowed (both ends must be visible on the
    // chart) and the quest node floats wayless — the live-pane defect.
    for (const z of zonesOf()) {
      if (z.id !== START_ZONE && z.id !== HUB_ZONE
        && Math.hypot(z.map.x - rz.map.x, z.map.y - rz.map.y) < 300) z.veiled = true;
    }
    connectFloatingZone(rz, w.zoneMap, new Rng(0xf10a7));
    const back = rz.exits.find(e => e.to !== '?');
    const anchor = back ? w.zoneMap[back.to] : undefined;
    check('G: the wire-in forges a two-way NOTARIZED deed',
      !!anchor && !anchor.floating && rz.exits.some(e => e.to === anchor.id && e.notarized === true)
      && anchor.exits.some(e => e.to === rz.id && e.notarized === true), anchor?.id ?? 'none');
    check('G: the wire-in LIFTS the anchor veil (the road can draw)',
      !!anchor && !anchor.veiled && !rz.veiled);
    for (const z of zonesOf()) if (z.veiled) z.veiled = false; // restore for later sections
    check('G: the wired relic zone is BFS-reachable from town', bfsFromTown().has(rz.id));
  }

  // --- the Unmade (band placement, special, floating)
  cast.acceptQuest(QUESTS['unmade_l20']);
  const uz = w.zoneMap['quest_unmade_l20'];
  check('G: the Unmade arena MINTS at its band', !!uz && uz.floating === true && uz.special === true,
    uz ? `lv${uz.level}` : 'MISSING');
  if (uz) {
    check('G: the arena stands on LAND', biomeAt(uz.map, (w as unknown as { sim: { biomeField: { fieldSeed: number } } }).sim.biomeField.fieldSeed) !== 'ocean');
    check('G: the arena refuses its own waypoint (the trek law)', uz.waypoint === false && uz.wpExclusionRadius === 240);
    connectFloatingZone(uz, w.zoneMap, new Rng(0xf10a8));
    check('G: the arena wires in reachable', bfsFromTown().has(uz.id));
  }

  // --- THE IDENTICAL-SPOT STRESS: a directed mint dropped exactly ON a
  // standing node (the unreadable-hover case) settles apart.
  const victim = zonesOf().find(z => z.id.startsWith('gen_') && !z.field && z.objective.kind !== 'safe');
  if (victim) {
    const spot = { x: victim.map.x, y: victim.map.y };
    const dm = placeZoneAt(spot, null, w.zoneMap, 99001, {
      id: 'qa_same_spot', tileset: 'crypt', level: 8, seed: 0xabc1,
      objective: { kind: 'clear' }, linkBack: true,
      biomeFor: (c) => biomeAt(c, (w as unknown as { sim: { biomeField: { fieldSeed: number } } }).sim.biomeField.fieldSeed),
    });
    w.zoneMap[dm.id] = dm;
    const d = Math.hypot(dm.map.x - victim.map.x, dm.map.y - victim.map.y);
    check('G: an identical-spot directed mint SETTLES readable', d >= WEB_CFG.hoverClear,
      `${Math.round(d)} ≥ ${WEB_CFG.hoverClear}`);
  }

  // --- THE MEADOW STRESS: a directed mint targeted INSIDE an expanse's core
  // rect must come to rest OUTSIDE it (the interior-clearance fix).
  const fz = zonesOf().find(z => z.field);
  if (fz) {
    const r = fieldCoreRect(fz.field!, fz.size);
    const mid = { x: (r.x0 + r.x1) / 2, y: (r.y0 + r.y1) / 2 };
    const dm = placeZoneAt(mid, null, w.zoneMap, 99002, {
      id: 'qa_meadow_drop', tileset: 'crypt', level: 8, seed: 0xabc2,
      objective: { kind: 'clear' }, linkBack: true,
      biomeFor: (c) => biomeAt(c, (w as unknown as { sim: { biomeField: { fieldSeed: number } } }).sim.biomeField.fieldSeed),
    });
    w.zoneMap[dm.id] = dm;
    const inside = dm.map.x >= r.x0 && dm.map.x <= r.x1 && dm.map.y >= r.y0 && dm.map.y <= r.y1;
    check('G: a mid-meadow directed mint is pushed OFF the expanse', !inside,
      `landed ${Math.round(dm.map.x - mid.x)},${Math.round(dm.map.y - mid.y)} from centre`);
  } else {
    console.log('  (info) no expanse in this world — meadow stress ran on none');
  }
}

// ------------------------------------------------ H. THE SETTLING
{
  const { w } = worlds[2] ?? worlds[0];
  const zones = surfaceZones(w);
  // Two overlapping ordinary stubs relax apart; an immovable (town) pins.
  const town = w.zoneMap[START_ZONE];
  const base = zones.find(z => z.id.startsWith('gen_') && !z.field && z.objective.kind !== 'safe')!;
  const mk = (id: string, x: number, y: number): ZoneDef => ({
    ...base, id, name: id, field: undefined, berths: undefined,
    map: { x, y }, exits: [] as ZoneExitDef[],
  });
  const a = mk('qa_settle_a', base.map.x + 400, base.map.y + 400);
  const b = mk('qa_settle_b', a.map.x + 4, a.map.y + 2);
  a.exits.push({ to: b.id, side: 'e' }); b.exits.push({ to: a.id, side: 'w' });
  w.zoneMap[a.id] = a; w.zoneMap[b.id] = b;
  const left = settleWeb(w.zoneMap, null, { around: a.map });
  const dAB = Math.hypot(a.map.x - b.map.x, a.map.y - b.map.y);
  check('H: overlapping pair settles to the hover floor', dAB >= WEB_CFG.hoverClear && left === 0,
    `${Math.round(dAB)} ≥ ${WEB_CFG.hoverClear} (left ${left})`);
  check('H: the pair keeps its two-way road',
    a.exits.some(e => e.to === b.id) && b.exits.some(e => e.to === a.id));
  const townHome = { x: town.map.x, y: town.map.y };
  const c = mk('qa_settle_town', town.map.x + 3, town.map.y + 3);
  w.zoneMap[c.id] = c;
  settleWeb(w.zoneMap, null, { around: town.map });
  check('H: the SANCTUARY pins — the newcomer gives way',
    town.map.x === townHome.x && town.map.y === townHome.y
    && Math.hypot(c.map.x - town.map.x, c.map.y - town.map.y) >= WEB_CFG.hoverClear,
    `town unmoved, stub at ${Math.round(Math.hypot(c.map.x - town.map.x, c.map.y - town.map.y))}`);
  // Determinism: identical INPUT states settle to identical coordinates (no
  // rng anywhere in the pass) — two fresh clones of the same overlap scene.
  const snap = (z: ZoneDef): string => `${z.map.x.toFixed(4)},${z.map.y.toFixed(4)}`;
  const scene = (): Record<string, ZoneDef> => {
    const s1 = mk('qa_det_1', 9000, 9000);
    const s2 = mk('qa_det_2', 9005, 9001);
    const s3 = mk('qa_det_3', 9002, 9038);
    return { [s1.id]: s1, [s2.id]: s2, [s3.id]: s3 };
  };
  const m1 = scene(), m2 = scene();
  settleWeb(m1, null, { around: { x: 9000, y: 9000 } });
  settleWeb(m2, null, { around: { x: 9000, y: 9000 } });
  const sig = (m: Record<string, ZoneDef>): string => Object.values(m).map(snap).join('|');
  check('H: the settle is DETERMINISTIC', sig(m1) === sig(m2), sig(m1));
  // A blob minted AROUND standing ground (the wandering hub inside a fresh
  // expanse — seen live at 12u): the expanse's label anchor drifts WITHIN its
  // own core rect and the squatter may walk out — the pair must separate,
  // and the expanse's node must never leave its region.
  const fr = worlds.filter(r => surfaceZones(r.w).some(z => z.field)).pop();
  if (fr) {
    const fw = fr.w;
    const fzone = surfaceZones(fw).find(z => z.field)!;
    const e = mk('qa_settle_field', fzone.map.x + 6, fzone.map.y - 3);
    fw.zoneMap[e.id] = e;
    for (let beat = 0; beat < 4; beat++) settleWeb(fw.zoneMap, null, { around: fzone.map });
    const d = Math.hypot(e.map.x - fzone.map.x, e.map.y - fzone.map.y);
    const r = fieldCoreRect(fzone.field!, fzone.size);
    const inRect = fzone.map.x >= r.x0 && fzone.map.x <= r.x1 && fzone.map.y >= r.y0 && fzone.map.y <= r.y1;
    check('H: a squatted EXPANSE separates without leaving its region',
      d >= WEB_CFG.hoverClear && inRect, `${Math.round(d)}u apart, node in-rect=${inRect}`);
  }
}

// ------------------------------------------------ I. THE OCCUPANCY LAW (real-update soak)
// The one lane the growth rounds above cannot see: the REAL update loop
// (forechart sweeps + settle sweeps + overlays) walking a small loop of
// zones — the exact play pattern that used to ACCUMULATE mints in the same
// ground forever (pre-law: 261 zones inside a 300u disc, twins 1u apart;
// refused links fell through to mints, failed pushes got settled to the
// hover floor, and the halo re-densified walked country every re-arm).
{
  seedGlobalRandom(0x50a201);
  const w = makeSimWorld('warrior', 0x77aa01);
  w.loadZone(HUB_ZONE);
  const hub = { x: w.zone.map.x, y: w.zone.map.y };
  const zonesOf = (): ZoneDef[] => surfaceZones(w);
  const within300 = (): number => zonesOf().filter(z => Math.hypot(z.map.x - hub.x, z.map.y - hub.y) <= 300).length;
  // Authored coastal pairs (a hold anchor and its offshore port sit a short
  // causeway apart BY DESIGN — sealed kinds, settle-immovable) are exempt
  // from the spacing read, as are FLOATING ghosts (disconnected sounding
  // buds — off the drawn map until wired, and the wire-in settles them).
  const authored = (z: ZoneDef): boolean => !!z.port || !!z.holdAnchor || !!zoneKindOf(z)?.staticExits
    || !!z.floating || !!z.concealed;
  const tightPairs = (dump = false): number => {
    const zs = zonesOf();
    let n = 0;
    for (let i = 0; i < zs.length; i++) {
      for (let j = i + 1; j < zs.length; j++) {
        if (authored(zs[i]) || authored(zs[j])) continue;
        const d = Math.hypot(zs[i].map.x - zs[j].map.x, zs[i].map.y - zs[j].map.y);
        if (d < Math.min(biomeSpacing(zs[i].biome), biomeSpacing(zs[j].biome)) * 0.6) {
          n++;
          if (dump) {
            const tag = (z: ZoneDef): string => `${z.id}[${z.biome} ${z.veiled ? 'V' : ''}${z.special ? 'S' : ''}${z.eventOwned ? 'E' : ''}]`;
            console.log(`  (tight) ${Math.round(d)}u ${tag(zs[i])} × ${tag(zs[j])}`);
          }
        }
      }
    }
    return n;
  };
  const step = (n: number): void => { for (let i = 0; i < n; i++) w.update(0.25); };
  step(400); // ~100s — the halo fills to its honest capacity
  const afterFill = within300();
  // Walk a loop through near-hub country twice — unveils re-arm the halo.
  const laps: number[] = [];
  for (let lap = 0; lap < 2; lap++) {
    const ring = zonesOf().filter(z => z.id !== w.zone.id && !z.veiled
      && z.objective.kind !== 'safe' && z.exits.some(e => e.to !== '?')
      && Math.hypot(z.map.x - hub.x, z.map.y - hub.y) < 260).slice(0, 4);
    for (const z of ring) { w.loadZone(z.id); step(40); }
    laps.push(within300());
  }
  check('I: the halo packs walked ground at HONEST spacing (≤90 in a 300u disc; was 261)',
    afterFill <= 90 && laps.every(n => n <= 90), `${afterFill} → ${laps.join(' → ')}`);
  check('I: walking the same ground does NOT accumulate mints (was +36/lap)',
    laps[laps.length - 1] - afterFill <= 6, `+${laps[laps.length - 1] - afterFill}`);
  // Measure the CONVERGED state the law contracts ("within a settle beat"):
  // the wall-clock governor varies the soak run-to-run, and a pair minted in
  // the final ticks may stand mid-beat — give it the beats the live sweep
  // would (a no-op scan when the chart is already clean).
  for (let beat = 0; beat < 3; beat++) settleWeb(w.zoneMap, null, {});
  // ≤2 tolerates the COASTAL PINCH: on a narrow isthmus both ends can be
  // pinned by the ocean-stand guard (the settle rightly refuses to shove a
  // zone into the sea) — a geographic squeeze, not a law breach. Was 637.
  check('I: sub-spacing twins held to the coastal-pinch residue (was 637)', tightPairs(true) <= 2, `${tightPairs()}`);
  const zs = zonesOf();
  let minPair = Infinity;
  for (let i = 0; i < zs.length; i++) {
    for (let j = i + 1; j < zs.length; j++) {
      if (authored(zs[i]) || authored(zs[j])) continue;
      minPair = Math.min(minPair, Math.hypot(zs[i].map.x - zs[j].map.x, zs[i].map.y - zs[j].map.y));
    }
  }
  // The hover floor is the norm; a tolerated coastal pinch may sit under it
  // but NOTHING may ever approach overlap again (the 1u chaos) — 28u is the
  // absolute never-overlap backstop (both discs still separable on hover).
  check('I: the closest organic pair never approaches overlap (was 1u; authored pairs exempt)',
    minPair >= 28, `${Math.round(minPair)}u (hover floor ${WEB_CFG.hoverClear})`);
  check('I: the world still grows past the walked pocket', zonesOf().length >= 150, `${zonesOf().length} zones`);
}

// ------------------------------------------------ J. THE MINT HORIZON (pregen doctrine)
// The active vicinity is fully-resolved ground, always: no ambient mint may
// happen within FORECHART_CFG.horizon of the player — walking meets FOUND
// nodes, never freshly minted ones; a teleport's arrival catches up
// synchronously; only DIRECTED mints (quests) may be born underfoot.
{
  seedGlobalRandom(0x0f2e01);
  const w = makeSimWorld('warrior', 0x0f2e01);
  w.loadZone(HUB_ZONE);
  const step = (n: number): void => { for (let i = 0; i < n; i++) w.update(0.25); };
  step(600); // the colossal halo fills (hustled, time-governed)
  const H = FORECHART_CFG.horizon;
  const dimOf = (z: ZoneDef): string => z.dimension ?? 'surface';
  const inHorizon = (c: { x: number; y: number }, dim: string): ZoneDef[] =>
    Object.values(w.zoneMap).filter(z => dimOf(z) === dim && z.caveDepth == null
      && Math.hypot(z.map.x - c.x, z.map.y - c.y) <= H);
  const unresolved = (c: { x: number; y: number }, dim: string): number =>
    inHorizon(c, dim).filter(z => !z.floating && !z.pocket && !z.eventOwned
      && z.objective.kind !== 'safe' && z.exits.some(e => e.to === '?' && !e.lock)).length;

  // Walk OUTWARD hop by hop through real exits; the horizon must be resolved
  // ground at every stop, the destination must PRE-EXIST, and stepping time
  // must mint nothing new inside the horizon.
  let hops = 0, preExisted = 0, cleanStops = 0, quietSteps = 0;
  const hub = { x: w.zone.map.x, y: w.zone.map.y };
  for (let hop = 0; hop < 6; hop++) {
    const next = w.zone.exits
      .map(e => e.to !== '?' ? w.zoneMap[e.to] : undefined)
      .filter((z): z is ZoneDef => !!z && z.caveDepth == null && !z.dimension && z.objective.kind !== 'safe')
      .sort((a, b) => Math.hypot(b.map.x - hub.x, b.map.y - hub.y) - Math.hypot(a.map.x - hub.x, a.map.y - hub.y))[0];
    if (!next) break;
    const existed = !!w.zoneMap[next.id];
    w.loadZone(next.id);
    hops++;
    if (existed) preExisted++;
    if (unresolved(w.zone.map, 'surface') === 0) cleanStops++;
    const before = new Set(inHorizon(w.zone.map, 'surface').map(z => z.id));
    step(40); // ~10s standing here — sweeps run
    // Exempt from "ambient birth": directed quest mints, and FOREORDAINED
    // sea systems (a first water touch mints that whole sea's harbor pairs
    // at once, wherever its coast runs — the atomic-batch law, same
    // exemption probe_forechart's ring check carries) with their floating
    // sounding buds.
    const born = inHorizon(w.zone.map, 'surface').filter(z => !before.has(z.id)
      && !z.id.startsWith('quest_') && !z.port && !z.holdAnchor && !z.seaId && !z.floating);
    if (born.length === 0) quietSteps++;
    else for (const z of born) console.log(`  (born) ${z.id}[${z.biome} kind=${z.kind ?? '-'} V=${!!z.veiled} E=${!!z.eventOwned} conc=${!!z.concealed}] at ${Math.round(Math.hypot(z.map.x - w.zone.map.x, z.map.y - w.zone.map.y))}u`);
  }
  check('J: every hop lands on PRE-EXISTING ground (found, never minted)', hops >= 4 && preExisted === hops,
    `${preExisted}/${hops} hops`);
  check('J: the horizon is fully-resolved ground at every stop', cleanStops === hops, `${cleanStops}/${hops}`);
  check('J: standing time mints NOTHING inside the horizon', quietSteps === hops, `${quietSteps}/${hops}`);

  // THE TELEPORT: jump to the RIM of the halo (thin chart) — the arrival
  // catch-up must resolve the whole horizon synchronously, before any sweep.
  const rim = Object.values(w.zoneMap)
    .filter(z => !z.dimension && z.caveDepth == null && !z.floating && !z.pocket
      && z.objective.kind !== 'safe' && !zoneKindOf(z)?.staticExits && !z.field)
    .sort((a, b) => Math.hypot(b.map.x - hub.x, b.map.y - hub.y) - Math.hypot(a.map.x - hub.x, a.map.y - hub.y))[0];
  if (rim) {
    w.loadZone(rim.id);
    const straggle = inHorizon(w.zone.map, 'surface').filter(z => !z.floating && !z.pocket && !z.eventOwned
      && z.objective.kind !== 'safe' && z.exits.some(e => e.to === '?' && !e.lock));
    check('J: a rim teleport arrival catches the horizon up SYNCHRONOUSLY',
      straggle.length === 0,
      straggle.length
        ? straggle.slice(0, 3).map(z => `${z.id}[${z.biome} ${zoneKindOf(z)?.staticExits ? 'SEALED' : ''}${z.field ? 'FIELD' : ''} ?×${z.exits.filter(e => e.to === '?').length}]`).join(' ')
        : `clean at ${Math.round(Math.hypot(rim.map.x - hub.x, rim.map.y - hub.y))}u out`);
  }
  // …and a DIRECTED mint is still welcome underfoot (the story exemption).
  const cast = w as unknown as { acceptQuest(q: unknown): void };
  cast.acceptQuest(QUESTS['undead_south_l5']);
  check('J: a QUEST still mints inside the horizon (directed exemption)',
    !!w.zoneMap['quest_undead_south_l5']);
  const total = Object.values(w.zoneMap).filter(z => z.caveDepth == null).length;
  console.log(`  (info) colossal world: ${total} zones standing after the walk`);
}

console.log(failed ? `\n${failed} CHECK(S) FAILED` : '\nALL PASS');
process.exit(failed ? 1 : 0);
