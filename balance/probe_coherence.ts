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
  type Doodad, type GeneratedLayout,
} from '../src/engine/levelgen';
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

console.log(`\nprobe coherence: ${SEEDS} seeds/rig — ${fails} failure(s)`);
if (fails) process.exit(1);
console.log('PROBE COHERENCE OK');
