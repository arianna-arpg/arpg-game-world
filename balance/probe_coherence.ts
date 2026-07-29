// COHERENCE CONTRACT PROBE — the clearway/causeway/habitat fabric, pinned
// structurally and densely instead of waiting for lucky sweep seeds.
//
// The failure classes this rig recreates:
//   A. EXIT ROAD THROUGH A PLANTED ROOF — the annotation arrives AFTER the
//      forest recipe planted its canopy (generateLayout lays exit roads at
//      step 5); before the clearway sweep the gravel was painted straight
//      under standing trees ("forest that happens to have a path under it").
//   B. SCATTER ONTO AN EARLY ROAD — the worn-path stamp runs first, trees
//      findSpot afterwards with no ground-avoidance (the crossroads class).
//   C. ROAD ACROSS WATER / LAVA — the way used to float over the pour: the
//      water slow applied ON the gravel; lava glowed under it. Now decked
//      soft ground splices (the riverland causeway discipline, generalized),
//      fat bodies FORD (way yields, body wades shallow), molten ground CUTS
//      the way.
//   D. FLORA OFF ITS GROUND — kelp/coral on a dry meadow (the beach/
//      peninsula class); the habitat gate refuses, waivers author the
//      exception, aquatic arenas satisfy ambiently.
//   E. OVERGROWTH — the deep wood wins stretches back in RUNS: wild discs
//      exist, cluster into passages, sprout reclaiming flora, and admit
//      trees the invariant must EXEMPT (the deliberate look, never a bug).
//
// Every rig carries pressure detection — a control run or structural
// evidence proving the conflict it polices actually occurred — so a dead rig
// exits 1 rather than passing green.
//   npx tsx balance/probe_coherence.ts [-- --seeds 40 --verbose]

// Side-effect registries — the same set genqa loads; a missing import here
// would make the probe test a DIFFERENT game.
import '../src/data/clusters';
import '../src/data/formations';
import '../src/engine/landmarkBuilders';
import '../src/data/landmarks';
import '../src/engine/layoutRecipes';
import '../src/engine/interiorGen';
import '../src/data/compositions';

import { Rng } from '../src/core/rng';
import { vec } from '../src/core/math';
import {
  generateLayout, blocksMovement, doodadRuleOf, bodyRadiusOf,
  doodadRuleKinds, hitSurfaceOf, normalizeDoodadBound,
  registerCluster, registerComposition,
  type Doodad, type DoodadKind, type GeneratedLayout,
} from '../src/engine/levelgen';
import { shapeBoundR, type HitShape } from '../src/engine/shapes';
import { WORLDBOSS_SURGE } from '../src/packages/defs/worldboss';
import type { StampSpec, ZoneDef } from '../src/data/zones';

const args = process.argv.slice(2);
const flag = (name: string): string | undefined => {
  const i = args.indexOf(`--${name}`);
  return i >= 0 ? args[i + 1] : undefined;
};
const SEEDS = Number(flag('seeds') ?? 40);
const VERBOSE = args.includes('--verbose');

// Mirrored from levelgen COHERENCE_CFG, like genqa — the probe asserts the
// OBSERVABLE promise, not the internals.
const FORD_R = 56;
const FORD_FRAC = 0.4;
const WILD_RUN_MIN = 3;

const arena = { w: 2400, h: 1800 };
const entry = vec(120, arena.h / 2);
const exits = [vec(arena.w - 120, arena.h / 2), vec(arena.w / 2, 120)];

const THEME = { floor: '#161616', grid: '#222', border: '#555', obstacle: '#333', obstacleEdge: '#666', accent: '#999' };
function defOf(id: string, layout: StampSpec[], extra?: Partial<ZoneDef>): ZoneDef {
  return {
    id, name: `QA ${id}`, level: 8, size: { w: arena.w, h: arena.h },
    theme: THEME, layout, objective: { kind: 'clear' }, exits: [], map: { x: 0, y: 0 },
    ...extra,
  };
}
function gen(def: ZoneDef, seed: number): GeneratedLayout {
  return generateLayout({ ...def, seed }, arena, new Rng(seed), entry, exits);
}
const seedAt = (s: number): number => 1000003 * (s + 1) + 17; // genqa's ladder

let fails = 0;
function fail(msg: string): void { fails++; console.log(`FAIL ${msg}`); }
function note(msg: string): void { if (VERBOSE) console.log(`  ${msg}`); }

const isWay = (d: Doodad): boolean => !!doodadRuleOf(d.kind).clearway;
const inStructure = (layout: GeneratedLayout, d: Doodad): boolean =>
  (layout.structures ?? []).some(st =>
    d.pos.x > st.rect.x - d.radius && d.pos.x < st.rect.x + st.rect.w + d.radius
    && d.pos.y > st.rect.y - d.radius && d.pos.y < st.rect.y + st.rect.h + d.radius);
/** The clearway invariant's offender predicate — mirrors genqa/sweep exactly. */
function standingOnWay(layout: GeneratedLayout): Doodad[] {
  const ways = layout.doodads.filter(d => isWay(d) && !d.wild);
  if (!ways.length) return [];
  return layout.doodads.filter(s =>
    blocksMovement(s) && !isWay(s)
    && !s.keep && s.kind !== 'door' && !s.waive?.includes('clearway')
    && !doodadRuleOf(s.kind).spans && !inStructure(layout, s)
    && ways.some(c => Math.hypot(s.pos.x - c.pos.x, s.pos.y - c.pos.y) < bodyRadiusOf(s) + c.radius - 1));
}

// --- RIG A: exit road carved through a planted forest roof -------------------
{
  const roof = {
    forestPortalClear: 100,
    forestTrails: [0, 0],       // no early trails — the LATE exit road is the only way
    forestTreeMix: undefined,   // (name unused; forestTrees below is the real dial)
    forestTrees: [{ kind: 'tree', weight: 1, radius: [40, 58] }],
    overgrowth: 0,
  };
  const rig = defOf('qa_coh_roofroad', [], {
    layoutType: 'forest', layoutParams: roof, exitRoads: [{ overgrowth: 0 }],
  });
  const wildRig = defOf('qa_coh_roofroad_wild', [], {
    layoutType: 'forest', layoutParams: { ...roof, overgrowth: 1 }, exitRoads: [{ overgrowth: 1 }],
  });
  let viol = 0, pressure = 0, waysSeen = 0;
  for (let s = 0; s < SEEDS; s++) {
    const seed = seedAt(s);
    const layout = gen(rig, seed);
    const ways = layout.doodads.filter(isWay);
    waysSeen += ways.length;
    const off = standingOnWay(layout);
    if (off.length) { viol += off.length; for (const d of off) note(`A seed ${seed}: ${d.kind} r=${d.radius.toFixed(0)} on the way`); }
    // Pressure: with overgrowth 1 every disc is wild — no reserve, no gate,
    // no carve — so trees stand on the way IF the rig creates real conflict.
    const wild = gen(wildRig, seed);
    const wildWays = wild.doodads.filter(isWay);
    pressure += wild.doodads.filter(s =>
      blocksMovement(s) && !isWay(s)
      && wildWays.some(c => Math.hypot(s.pos.x - c.pos.x, s.pos.y - c.pos.y) < bodyRadiusOf(s) + c.radius - 1)).length;
  }
  if (waysSeen < SEEDS * 10) fail(`A: RIG DEAD — exit roads barely laid (${waysSeen} way discs over ${SEEDS} seeds)`);
  else if (pressure === 0) fail('A: RIG DEAD — the roof never crowds the way (0 conflicts under full overgrowth)');
  else if (viol) fail(`A: ${viol} blocker(s) standing on a carved exit road (pressure ${pressure})`);
  else console.log(`rig A (exit road vs planted roof): 0 violations, pressure ${pressure}, ${waysSeen} way discs`);
}

// --- RIG B: trees findSpot onto an early worn road + the waiver -------------
{
  const rig = defOf('qa_coh_earlyroad', [
    { kind: 'road', count: [3, 3] },
    { kind: 'trees', count: [40, 60], radius: [20, 34] },
  ]);
  const waived = defOf('qa_coh_earlyroad_waived', [
    { kind: 'road', count: [3, 3] },
    { kind: 'trees', count: [40, 60], radius: [20, 34], rules: { ignore: ['clearway'] } },
  ]);
  let viol = 0, kept = 0, keptUntagged = 0;
  for (let s = 0; s < SEEDS; s++) {
    const seed = seedAt(s);
    const off = standingOnWay(gen(rig, seed));
    viol += off.length;
    // The waiver is BOTH the pressure proof (trees really do try to stand
    // there) and the authored-exception contract (pieces tagged + exempt).
    const wl = gen(waived, seed);
    const ways = wl.doodads.filter(d => isWay(d) && !d.wild);
    for (const t of wl.doodads) {
      if (!blocksMovement(t) || isWay(t)) continue;
      if (!ways.some(c => Math.hypot(t.pos.x - c.pos.x, t.pos.y - c.pos.y) < bodyRadiusOf(t) + c.radius - 1)) continue;
      kept++;
      if (!t.waive?.includes('clearway')) keptUntagged++;
    }
    if (standingOnWay(wl).length) fail(`B seed ${seed}: waived pieces still read as violations`);
  }
  if (kept === 0) fail('B: RIG DEAD — waived trees never landed on the way (no conflict pressure)');
  else if (keptUntagged) fail(`B: ${keptUntagged} waiver-placed piece(s) missing the waive tag`);
  else if (viol) fail(`B: ${viol} tree(s) standing on the worn road (pressure ${kept})`);
  else console.log(`rig B (scatter vs early road): 0 violations, ${kept} waived pieces stood + tagged`);
}

// --- RIG C: the causeway discipline — water decks/fords, lava cuts ----------
{
  const waterFirst = defOf('qa_coh_causeway', [
    { kind: 'water', count: [6, 9], radius: [60, 90] },
    { kind: 'road', count: [3, 3] },
  ]);
  const waterControl = defOf('qa_coh_causeway', [ // same id/seed → water pours byte-identical
    { kind: 'water', count: [6, 9], radius: [60, 90] },
  ]);
  const roadFirst = defOf('qa_coh_causeway_inv', [
    { kind: 'road', count: [3, 3] },
    { kind: 'water', count: [6, 9], radius: [60, 90] },
  ]);
  const lavaRig = defOf('qa_coh_lavacut', [
    { kind: 'lava', count: [5, 8], radius: [60, 90] },
    { kind: 'road', count: [3, 3] },
  ]);
  let deckViol = 0, carved = 0, fords = 0, cutEvidence = 0, lavaViol = 0;
  for (let s = 0; s < SEEDS; s++) {
    const seed = seedAt(s);
    for (const def of [waterFirst, roadFirst]) {
      const layout = gen(def, seed);
      const ways = layout.doodads.filter(isWay);
      for (const c of ways) {
        for (const g of layout.doodads) {
          if (g.kind !== 'water') continue;
          const dd = Math.hypot(c.pos.x - g.pos.x, c.pos.y - g.pos.y);
          if (g.radius > FORD_R) {
            if (dd < g.radius + c.radius * FORD_FRAC - 1) { deckViol++; note(`C seed ${seed}: way disc over unforded body (${def.id})`); }
          } else if (dd < c.radius + g.radius - 1) { deckViol++; note(`C seed ${seed}: water under the way (${def.id})`); }
        }
      }
      fords += layout.doodads.filter(g => g.kind === 'water' && g.shallow && g.radius > FORD_R
        && ways.some(c => Math.hypot(c.pos.x - g.pos.x, c.pos.y - g.pos.y) < g.radius + c.radius + 90)).length;
    }
    // Pressure (water): the control pours byte-identical water (same rows,
    // same seed, road rows only ever AFTER) — fewer surviving water discs in
    // the rig means the causeway really spliced a crossing.
    const rigWater = gen(waterFirst, seed).doodads.filter(d => d.kind === 'water').length;
    const ctlWater = gen(waterControl, seed).doodads.filter(d => d.kind === 'water').length;
    if (rigWater < ctlWater) carved++;
    // Lava: the way must never overlap it — and way discs ENDING at a rim
    // (within 40) are the cut's own evidence that crossings occurred.
    const ll = gen(lavaRig, seed);
    const lways = ll.doodads.filter(isWay);
    const lavas = ll.doodads.filter(d => d.kind === 'lava');
    for (const c of lways) {
      for (const g of lavas) {
        const dd = Math.hypot(c.pos.x - g.pos.x, c.pos.y - g.pos.y);
        if (dd < c.radius + g.radius - 1) lavaViol++;
        else if (dd < c.radius + g.radius + 40) cutEvidence++;
      }
    }
  }
  if (carved === 0 && fords === 0) fail('C: RIG DEAD — roads never met water across every seed');
  else if (deckViol) fail(`C: ${deckViol} wet way disc(s) (carved ${carved}, fords ${fords})`);
  else console.log(`rig C (causeway): 0 wet ways — ${carved} seed(s) carved water, ${fords} ford bodies marked shallow`);
  if (cutEvidence === 0) fail('C: RIG DEAD — roads never approached lava across every seed');
  else if (lavaViol) fail(`C: ${lavaViol} way disc(s) over lava (cut evidence ${cutEvidence})`);
  else console.log(`rig C (lava cut): 0 molten ways, ${cutEvidence} rim-cut endings`);
}

// --- RIG D: habitat — dry refuses, wet beds, waiver authors, aquatic ambient -
{
  const flora: StampSpec[] = [
    { kind: 'kelp', count: [6, 9] },
    { kind: 'coral', count: [4, 6] },
    { kind: 'giant_kelp', count: [3, 5] },
  ];
  const dry = defOf('qa_coh_dryflora', flora);
  const wet = defOf('qa_coh_wetflora', [{ kind: 'water', count: [4, 6], radius: [50, 90] }, ...flora]);
  const waived = defOf('qa_coh_waivedflora', flora.map(r => ({ ...r, rules: { ignore: ['habitat' as const] } })));
  const aquatic = defOf('qa_coh_aquaticflora', flora, { aquatic: true });
  const floraKinds = new Set(['kelp', 'coral', 'giant_kelp']);
  let dryPlaced = 0, wetPlaced = 0, wetStranded = 0, waivedPlaced = 0, waivedUntagged = 0, aquaticPlaced = 0;
  for (let s = 0; s < SEEDS; s++) {
    const seed = seedAt(s);
    dryPlaced += gen(dry, seed).doodads.filter(d => floraKinds.has(d.kind)).length;
    const w = gen(wet, seed);
    const beds = w.doodads.filter(d => floraKinds.has(d.kind));
    wetPlaced += beds.length;
    for (const d of beds) {
      const hab = doodadRuleOf(d.kind).habitat!;
      const reach = (hab.reach ?? 140) + 90;
      if (!w.doodads.some(g => hab.near.includes(g.kind)
        && Math.hypot(d.pos.x - g.pos.x, d.pos.y - g.pos.y) - g.radius <= reach)) wetStranded++;
    }
    const wl = gen(waived, seed).doodads.filter(d => floraKinds.has(d.kind));
    waivedPlaced += wl.length;
    waivedUntagged += wl.filter(d => !d.waive?.includes('habitat')).length;
    aquaticPlaced += gen(aquatic, seed).doodads.filter(d => floraKinds.has(d.kind)).length;
  }
  if (dryPlaced) fail(`D: ${dryPlaced} flora piece(s) placed on a dry meadow`);
  if (wetPlaced === 0) fail('D: RIG DEAD/OVERTIGHT — wet zone bedded no flora at all');
  else if (wetStranded) fail(`D: ${wetStranded} wet-zone piece(s) stranded from water`);
  if (waivedPlaced === 0) fail('D: RIG DEAD — the habitat waiver placed nothing');
  else if (waivedUntagged) fail(`D: ${waivedUntagged} waived piece(s) missing the waive tag`);
  if (aquaticPlaced === 0) fail('D: aquatic arena refused its own flora');
  if (!fails) console.log(`rig D (habitat): dry 0, wet ${wetPlaced} bedded, waived ${waivedPlaced} tagged, aquatic ${aquaticPlaced}`);
}

// --- RIG E: overgrowth rolls in RUNS, sprouts flora, admits the wood ---------
{
  const rig = defOf('qa_coh_overgrown', [], {
    layoutType: 'forest',
    layoutParams: {
      forestPortalClear: 140,
      forestTrails: [2, 2],
      forestTrees: [{ kind: 'tree', weight: 1, radius: [30, 44] }],
      overgrowth: 0.35,
    },
  });
  let wildTotal = 0, liveTotal = 0, runs = 0, sprouts = 0;
  for (let s = 0; s < SEEDS; s++) {
    const seed = seedAt(s);
    const layout = gen(rig, seed);
    const ways = layout.doodads.filter(isWay);
    wildTotal += ways.filter(d => d.wild).length;
    liveTotal += ways.filter(d => !d.wild).length;
    // Runs: consecutive wild discs in lay order (the doodad array preserves it).
    let run = 0;
    for (const d of ways) {
      if (d.wild) { run++; if (run === WILD_RUN_MIN) runs++; }
      else run = 0;
    }
    sprouts += layout.doodads.filter(d =>
      (d.kind === 'fern' || d.kind === 'brush' || d.kind === 'grass')
      && ways.some(c => c.wild && Math.hypot(c.pos.x - d.pos.x, c.pos.y - d.pos.y) < c.radius + d.radius)).length;
    const off = standingOnWay(layout);
    if (off.length) fail(`E seed ${seed}: ${off.length} blocker(s) on LIVE stretches of an overgrown way`);
  }
  if (wildTotal === 0) fail('E: RIG DEAD — dial 0.35 rolled no wild discs at all');
  else if (runs === 0) fail(`E: wild discs never clustered into a run of ${WILD_RUN_MIN} (salt-and-pepper, not passages)`);
  else if (liveTotal === 0) fail('E: dial 0.35 swallowed the entire way (share math broken)');
  else if (sprouts === 0) fail('E: overgrown stretches sprouted no reclaiming flora');
  else console.log(`rig E (overgrowth): ${wildTotal} wild / ${liveTotal} live discs, ${runs} runs, ${sprouts} sprouts`);
}

// --- RIG F: THE SITE WALK GATE — ring stamps keep their whole ring on ground -
// A palisade rect and a ruin ring are sited by CLEARANCE, not by walkability:
// on maze country (the karst chasm mazes, the cloud lattices) that hung 38-91%
// of their segments over the void, which is why two countries deleted their
// camp rows outright. The gate is two halves that must BOTH hold — ctx.siteWalk
// inside findSpot's try loop keeps the center on ground, and the ring probe
// keeps every corner and segment seat there too. The control samples the ring
// the OLD way (uniform-random centers, walk-blind) over the same field, so a
// zone that would have been easy anyway can never pass this rig green.
{
  // Generous karst dials (the Overpass's): big pockets, so a camp CAN seat and
  // the rig is not measuring an impossible fit. The gulfs are still the maze.
  const rig = defOf('walkgate_ring', [
    { kind: 'rocks', count: [3, 6] },
    { kind: 'camp', count: [1, 1] },
    { kind: 'ruin', count: [1, 1] },
  ], {
    layoutType: 'karst',
    layoutParams: {
      karstPocketR: [150, 260], karstGap: [330, 420], karstCorridorW: [40, 58],
      karstLoops: 0.26, karstRim: [90, 140],
    },
  });
  const SPACING = 13 * 1.7; // stampCamp's segment cadence
  const ringClear = (walk: NonNullable<GeneratedLayout['walk']>,
                     cx: number, cy: number, hw: number, hh: number): boolean => {
    const runs: [number, number, number, number][] = [
      [cx - hw, cy - hh, cx + hw, cy - hh], [cx - hw, cy + hh, cx + hw, cy + hh],
      [cx - hw, cy - hh, cx - hw, cy + hh], [cx + hw, cy - hh, cx + hw, cy + hh],
    ];
    for (const [ax, ay, bx, by] of runs) {
      const len = Math.hypot(bx - ax, by - ay);
      const steps = Math.ceil(len / SPACING);
      for (let i = 0; i <= steps; i++) {
        const t = i / steps;
        if (!walk.isWalkable(ax + (bx - ax) * t, ay + (by - ay) * t)) return false;
      }
    }
    return true;
  };

  let walls = 0, wallsOverVoid = 0, ringRocks = 0, rocksOverVoid = 0;
  let camps = 0, pois = 0, poisOverVoid = 0;
  let voidSamples = 0, voidHits = 0;      // is this ground actually a maze?
  let ctlTries = 0, ctlClear = 0;         // the walk-BLIND control
  for (let s = 0; s < SEEDS; s++) {
    const seed = seedAt(s);
    const layout = gen(rig, seed);
    const walk = layout.walk;
    if (!walk) { fail(`F seed ${seed}: karst produced NO walk field — rig blind`); continue; }
    camps += layout.camps.length;
    // The camp's palisade: 'wall' doodads exist only here in this def.
    for (const d of layout.doodads) {
      if (d.kind === 'wall') { walls++; if (!walk.isWalkable(d.pos.x, d.pos.y)) wallsOverVoid++; }
      // stampRuin PUSHES its ring rocks directly — they never pass findSpot's
      // rule walk gate, so they are the ruin half's honest witness.
      if (d.kind === 'rock') { ringRocks++; if (!walk.isWalkable(d.pos.x, d.pos.y)) rocksOverVoid++; }
    }
    // Camp + ruin centers both land in pois (karst's own leaf pockets are
    // painted ground, so every POI in this def must read walkable).
    for (const p of layout.pois) { pois++; if (!walk.isWalkable(p.x, p.y)) poisOverVoid++; }
    // PRESSURE 1: the country really is mostly gulf.
    const rng = new Rng(seed ^ 0x5f5f);
    for (let i = 0; i < 400; i++) {
      voidSamples++;
      if (!walk.isWalkable(rng.range(0, arena.w), rng.range(0, arena.h))) voidHits++;
    }
    // PRESSURE 2: the OLD acceptance — a uniform-random center, walk-blind —
    // would have hung this ring over the gulf most of the time.
    for (let i = 0; i < 200; i++) {
      const cx = rng.range(200, arena.w - 200), cy = rng.range(200, arena.h - 200);
      ctlTries++;
      if (ringClear(walk, cx, cy, 160, 135)) ctlClear++;
    }
  }
  const voidFrac = voidSamples ? voidHits / voidSamples : 0;
  const ctlFrac = ctlTries ? ctlClear / ctlTries : 0;
  if (walls === 0) fail('F: RIG DEAD — no palisade ever seated (camp row placed nothing)');
  else if (camps === 0) fail('F: RIG DEAD — walls without a recorded camp center');
  else if (voidFrac < 0.25) fail(`F: RIG DEAD — only ${(voidFrac * 100).toFixed(0)}% of the arena is void (no maze pressure)`);
  else if (ctlFrac > 0.5) fail(`F: RIG DEAD — a walk-blind ring already cleared ${(ctlFrac * 100).toFixed(0)}% of the time (gate untested)`);
  else if (wallsOverVoid > 0) fail(`F: ${wallsOverVoid}/${walls} palisade segment(s) stand over unwalkable ground`);
  else if (rocksOverVoid > 0) fail(`F: ${rocksOverVoid}/${ringRocks} ruin-ring rock(s) stand over unwalkable ground`);
  else if (poisOverVoid > 0) fail(`F: ${poisOverVoid}/${pois} set-piece center(s) recorded over unwalkable ground`);
  else {
    note(`F control: walk-blind ring cleared ${ctlClear}/${ctlTries}`);
    console.log(`rig F (site walk gate): ${camps} camps / ${walls} palisade segs / ${ringRocks} ring rocks`
      + `, 0 over void — ${(voidFrac * 100).toFixed(0)}% gulf, walk-blind control cleared only ${(ctlFrac * 100).toFixed(1)}%`);
  }
}

// --- RIG G: CompositionSite.siteWalk — the bundle's shared anchor finds ground
// A composition resolves ONE site its whole bundle hangs off (the clearing, the
// statues, the bell). Walk-blind, that anchor strands the entire arrangement in
// open sky. The lever is opt-in, so the rig runs BOTH faces of the same bundle
// over the same ground: the declared one must never anchor over void, and the
// undeclared one must SOMETIMES — otherwise the flag is being credited for
// ground that was never in doubt. Running ON first also proves the transient
// does not leak: a sticky ctx.siteWalk would silently gate OFF's site too.
{
  registerCluster({ id: 'probe_sitemark', anchor: { radius: 40 }, pieces: [], poi: true });
  for (const [id, siteWalk] of [['probe_walkgate_on', true], ['probe_walkgate_off', false]] as const) {
    registerComposition({
      id,
      sites: [{ id: 'court', radius: [60, 90], ...(siteWalk ? { siteWalk: true } : {}) }],
      post: [{ kind: 'cluster', cluster: 'probe_sitemark', at: 'court', count: [1, 1] }],
    });
  }
  // A void-rich lattice with NO poi-pushing recipe of its own would be ideal;
  // karst pushes up to 3 leaf pockets, and those are painted ground — so every
  // unwalkable POI here is the composition's own anchor.
  const zoneFor = (comp: string): ZoneDef => defOf(`walkgate_site_${comp}`, [
    { kind: 'rocks', count: [2, 4] },
  ], {
    layoutType: 'karst',
    layoutParams: { karstPocketR: [90, 150], karstGap: [300, 380], karstCorridorW: [44, 60] },
    compositions: [{ composition: comp, chance: 1 }],
  });
  const measure = (comp: string): { pois: number; overVoid: number; zones: number } => {
    let pois = 0, overVoid = 0, zones = 0;
    for (let s = 0; s < SEEDS; s++) {
      const layout = gen(zoneFor(comp), seedAt(s));
      const walk = layout.walk;
      if (!walk) continue;
      zones++;
      for (const p of layout.pois) { pois++; if (!walk.isWalkable(p.x, p.y)) overVoid++; }
    }
    return { pois, overVoid, zones };
  };
  const on = measure('probe_walkgate_on');
  const off = measure('probe_walkgate_off');
  if (on.zones === 0 || on.pois === 0) fail('G: RIG DEAD — the declared bundle anchored nothing');
  else if (off.overVoid === 0) fail('G: RIG DEAD — an UNDECLARED site never landed over void, so siteWalk is untested here');
  else if (on.overVoid > 0) fail(`G: ${on.overVoid}/${on.pois} siteWalk anchor(s) resolved over unwalkable ground`);
  else console.log(`rig G (composition siteWalk): declared ${on.pois} anchors, 0 over void`
    + ` — undeclared control put ${off.overVoid}/${off.pois} in the gulf`);
}

// --- RIG H: THE BROAD-PHASE BOUND — channel-honest, and never under-selecting
// The spatial index inserts every doodad at max(radius, boundR); a bound that
// falls SHORT of a surface a consumer tests makes queries miss the body, so
// the doctrine is asymmetric — over-select freely, under-select never.
// Two drifts this pins:
//   1. rockForm kinds once fell through normalizeDoodadBound's early-out (it
//      keyed on `surface` alone), so a rolled OUTCROP's satellites — which
//      reach ~1.11r — stood in the index at a bare radius.
//   2. the bound was taken at the 'sight' channel for everything, inflating
//      shrunken bodies no eye can test by their crown-scaled surface
//      (hollow_log: a 1.82r body inserted at 3.04r).
{
  const RAD = 40;
  const mk = (kind: string, x: number, y: number, rot = 0): Doodad =>
    ({ pos: vec(x, y), radius: RAD, kind: kind as DoodadKind, rot });
  // The channels a consumer can actually ASK of a kind, derived from the
  // CONSUMER's own gates (los.castRay gates sight on blocksSight ?? blocksShot
  // and shot on blocksShot; clampPos/nav/the contact sweep ask 'move'), not
  // from normalizeDoodadBound — so this stays a real check, not a mirror.
  const askable = (kind: string): ('move' | 'shot' | 'sight')[] => {
    const r = doodadRuleOf(kind as DoodadKind);
    const out: ('move' | 'shot' | 'sight')[] = ['move', 'shot'];
    if (r.blocksSight ?? !!r.blocksShot) out.push('sight');
    return out;
  };

  // H1 — THE DOCTRINE CENSUS: no kind, at any roll, may under-select.
  let under = 0, firstUnder = '', bounded = 0, kinds = 0;
  for (const kind of doodadRuleKinds()) {
    const rule = doodadRuleOf(kind as DoodadKind);
    if (!rule.surface && !rule.rockForm) continue;
    kinds++;
    for (let i = 0; i < 60; i++) {
      // rockForm rolls off position, surfaces spin off rot — sweep both.
      const d = mk(kind, 300 + i * 37.3, 200 + i * 53.7, (i * 0.41) % (Math.PI * 2));
      normalizeDoodadBound(d);
      const stamped = Math.max(d.radius, d.boundR ?? 0);
      if (d.boundR !== undefined) bounded++;
      for (const ch of askable(kind)) {
        const need = shapeBoundR(hitSurfaceOf(d, ch));
        if (need > stamped + 1e-6) {
          under++;
          if (!firstUnder) firstUnder = `${kind} '${ch}' needs ${need.toFixed(2)} > stamped ${stamped.toFixed(2)}`;
        }
      }
    }
  }
  if (kinds === 0) fail('H: RIG DEAD — no surface/rockForm kinds registered');
  else if (bounded === 0) fail('H: RIG DEAD — not one instance ever earned a boundR (nothing pokes past radius)');
  else if (under > 0) fail(`H1: ${under} under-selecting bound(s) — the index would MISS these bodies; first: ${firstUnder}`);
  else note(`H1 census: ${kinds} surface/rockForm kinds × 60 rolls — 0 under-selections, ${bounded} earned a boundR`);

  // H2 — rockForm-only kinds earn a bound when the roll pokes past radius.
  // (The early-out that skipped them was silent: nothing else stamps boundR.)
  let outcrops = 0, outcropsBounded = 0, monos = 0, monosBounded = 0;
  for (let i = 0; i < 4000; i++) {
    const d = mk('rock', 120 + i * 13.7, 240 + i * 29.3, (i * 0.31) % (Math.PI * 2));
    const s = hitSurfaceOf(d, 'move');
    normalizeDoodadBound(d);
    const reach = shapeBoundR(s);
    if (reach > RAD) { outcrops++; if ((d.boundR ?? 0) >= reach - 1e-6) outcropsBounded++; }
    else { monos++; if (d.boundR === undefined) monosBounded++; }
  }
  if (outcrops === 0) fail('H2: RIG DEAD — no rock roll ever reached past its radius (the case is untested)');
  else if (outcropsBounded < outcrops) fail(`H2: ${outcrops - outcropsBounded}/${outcrops} over-radius rock rolls carry no covering boundR`);
  else if (monosBounded < monos) fail(`H2: ${monos - monosBounded}/${monos} inside-radius rolls stamped a needless boundR`);
  else note(`H2 rockForm: ${outcrops}/${outcrops + monos} rolls reach past radius — all bounded; ${monos} tucked rolls left bare`);

  // H3 — the channel-honest bound: a shrunken body no eye tests is inserted
  // at its BODY reach, not its crown's. Fractions ride the body radius by
  // authoring law, so these are the drawn extents (see DoodadRule.surface).
  const NAMED: Record<string, number> = { hollow_log: 1.8224, fishing_rack: 1.0645, herb_rack: 1.0645 };
  let namedBad = 0, inflationSeen = 0;
  for (const [kind, want] of Object.entries(NAMED)) {
    const d = mk(kind, 500.5, 500.5, 0.6);
    const body = shapeBoundR(hitSurfaceOf(d, 'move'));
    const crown = shapeBoundR(hitSurfaceOf(d, 'sight'));
    normalizeDoodadBound(d);
    const got = (d.boundR ?? d.radius) / RAD;
    // Control: the two channels must genuinely differ, or the rig proves nothing.
    if (crown > body + 1e-6) inflationSeen++;
    if (Math.abs(got - want) > 0.001) {
      namedBad++;
      fail(`H3: ${kind} bound ${got.toFixed(4)}r — expected the ${want}r body reach (crown would be ${(crown / RAD).toFixed(4)}r)`);
    }
  }
  if (inflationSeen < Object.keys(NAMED).length) {
    fail('H3: RIG DEAD — the named kinds no longer scale differently across channels, so the bound cannot be inflated');
  } else if (!namedBad) note(`H3 channel-honest: ${Object.keys(NAMED).length} shrunken kinds bounded at the body, not the crown`);

  // H4 — THE OVERLAPPING-RUN HOLDOUT (see engine/levelgen.ts). wyrm_coil is a
  // DISC on purpose: its seal is the overlap between neighbouring stamps, and
  // lobed surfaces open slits a sight ray crosses. This asserts the seal the
  // holdout claims, so wiring rockForm can never land unmeasured.
  const W = WORLDBOSS_SURGE.roamer.wall;
  const lobeParts = (s: HitShape, x: number, y: number): { x: number; y: number; r: number }[] =>
    s.kind === 'circle' ? [{ x, y, r: s.r }]
      : s.kind === 'multi' ? s.parts.map(p => ({ x: x + p.dx, y: y + p.dy, r: p.r }))
        : [{ x, y, r: shapeBoundR(s) }];
  let widest = -Infinity, arcs = 0;
  for (let s = 0; s < 400; s++) {
    const ex = 200 + (s * 37) % 2600, ey = 150 + (s * 53) % 1800;
    const inward = (s * 0.7853981) % (Math.PI * 2);
    // World.wyrmWallSpots: `count` seats fanned 0.85π around the door at `dist`,
    // then reordered outer-ends-first — rot is stamped by PLACEMENT index.
    const seats: { x: number; y: number }[] = [];
    for (let k = 0; k < W.count; k++) {
      const t = W.count === 1 ? 0.5 : k / (W.count - 1);
      const ang = inward + (t - 0.5) * Math.PI * 0.85;
      seats.push({ x: ex + Math.cos(ang) * W.dist, y: ey + Math.sin(ang) * W.dist });
    }
    const order: number[] = [];
    for (let lo = 0, hi = W.count - 1; lo <= hi; lo++, hi--) { order.push(lo); if (hi !== lo) order.push(hi); }
    const rotAt = new Map<number, number>();
    order.forEach((arcIdx, placeIdx) => rotAt.set(arcIdx, (placeIdx * 2.39996) % (Math.PI * 2)));
    const surf = seats.map((p, k) => {
      const d: Doodad = { pos: vec(p.x, p.y), radius: W.radius, kind: 'wyrm_coil' as DoodadKind, rot: rotAt.get(k)! };
      return hitSurfaceOf(d, 'move');
    });
    arcs++;
    for (let k = 0; k + 1 < W.count; k++) {
      let gap = Infinity;
      for (const a of lobeParts(surf[k], seats[k].x, seats[k].y)) {
        for (const b of lobeParts(surf[k + 1], seats[k + 1].x, seats[k + 1].y)) {
          gap = Math.min(gap, Math.hypot(a.x - b.x, a.y - b.y) - a.r - b.r);
        }
      }
      if (gap > widest) widest = gap;
    }
  }
  if (arcs === 0) fail('H4: RIG DEAD — no coil arc was built');
  else if (widest >= 0) {
    fail(`H4: the wyrm_coil pass seal LEAKS — widest joint gap ${widest.toFixed(2)}px (a sight ray crosses any gap ≥ 0,`
      + ' and the coils declare blocksSight). The overlapping-run holdout in engine/levelgen.ts was measured against DISCS;'
      + ' re-measure the seal before changing this kind\'s surface.');
  } else note(`H4 coil seal: ${arcs} arcs × ${W.count - 1} joints — widest gap ${widest.toFixed(2)}px (every joint overlaps)`);
}

console.log(`\nprobe coherence: ${SEEDS} seeds/rig — ${fails} failure(s)`);
if (fails) process.exit(1);
console.log('PROBE COHERENCE OK');
