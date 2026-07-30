// THE COHORT PROBE — ZoneDef.cohort 'authored' pinned structurally: a
// curated zone's population is EXACTLY its authored cohort, whatever the
// world's politics do around it. Born from the live regression this law
// fixes: the capital-pole pass returned the near-home field to real dice,
// real factions' influence diffused down the roads into Wayfarer's
// Crossroads, and the contest lane staged full foreign rosters in the
// GENTLE FIRST FIGHT. The law closes membership; the world stays alive.
//
// The promises this rig pins:
//   A. THE CLOSED HUB — with two hostile factions genuinely contesting the
//      Crossroads (the injection lane armed), the zone fields ONLY its
//      authored dead, and no fallback wildlife wanders in.
//   B. THE OPEN CONTROL — the identical zone WITHOUT the law stages the
//      contest (proving the lane is real and the law is what stops it).
//   C. THE CONQUEST PIN — a conquered cohort zone keeps its authored
//      table; an open zone's table swaps to the conqueror's roster.
//   D. THE ANCHOR READ (World.wildlifeTableFor, the fauna provenance
//      resolver) — a biome-less mint reads its stamped ANCHOR (the surface
//      country the cave ladder hangs beneath) before the plains fallback;
//      a no-row anchor degrades to plains (never silence); a BIOMED no-row
//      zone stays fauna-free (the standing law); authored fauna wins all.
//   E. THE ANCHOR READ, LIVE — spawnWildlife consumes the resolver: a
//      volcanic-anchored biome-less cave births ONLY volcanic-table fauna,
//      anchor-less ground keeps plains, and the cohort law still outranks
//      the anchor (a closed zone births nothing — the law this rig pins).
//   F. THE CAVE AIR (World.caveAirFor, the pooled-fauna fabric) — a
//      standard cave's ambient repertoire is FOREORDAINED by its mint seed
//      (same def, same pool, forever; only the seed moves the roll, and the
//      anchor echo genuinely wins some caves); themed faces breathe their
//      claimed country wherever they surface; foreign fingerprints,
//      dimension ladders and seedless ground keep the standing anchor law;
//      real mintCave defs flow the lane end to end; and the geodeling homes
//      to the crystal it was born of (the habitat fabric, live).
//
//   npx tsx balance/probe_cohort.ts [-- --verbose]

import { CAVE_POOLS, MONSTERS, FACTIONS, factionStance, WILDLIFE } from '../src/data/monsters';
import { ZONES, type ZoneDef } from '../src/data/zones';
import { TILESETS, CAVE_FACE_IDS } from '../src/data/tilesets';
import { BIOMES } from '../src/world/biomes';
import { World } from '../src/engine/world';
import { mintCave } from '../src/engine/worldgen';
import { presenceMul } from '../src/engine/presence';
import { vec } from '../src/core/math';
import { bootSimEngine, makeSimWorld } from '../src/sim/arena';

const VERBOSE = process.argv.includes('--verbose');
let fails = 0;
const check = (name: string, ok: boolean, detail = ''): void => {
  console.log(`${ok ? 'PASS' : 'FAIL'}  ${name}${detail ? ' — ' + detail : ''}`);
  if (!ok) fails++;
};
const note = (msg: string): void => { if (VERBOSE) console.log(`  ${msg}`); };

bootSimEngine();
const world = makeSimWorld('warrior', 424242);
/* eslint-disable @typescript-eslint/no-explicit-any */
const w = world as any;

// Two mutually hostile factions with real rosters — resolved from the data,
// not hardcoded, so a faction retune never breaks the rig.
const ids = Object.keys(FACTIONS).filter(f => (FACTIONS[f]?.table?.length ?? 0) > 0);
let facA = '', facB = '';
outer: for (const a of ids) {
  for (const b of ids) {
    if (a !== b && factionStance(a, b) === 'hostile') { facA = a; facB = b; break outer; }
  }
}
check('S0 two hostile rostered factions exist', !!facA && !!facB, `${facA} vs ${facB}`);

const AUTHORED = new Set((ZONES.crossroads.packs?.table ?? []).map(e => e.id));
const contest = (zoneId: string, def: ZoneDef): void => {
  w.sim.faction.onNodeCharted(def);
  w.sim.faction.reinforce(zoneId, facA, 100);
  w.sim.faction.reinforce(zoneId, facB, 100);
};
// PASSIVE object-actors (gem caches, shrines — the loot fabric's furniture)
// are not cohort members: the law closes ENTITY membership, never furniture
// (the clear-law's own scenery exemption, mirrored).
const tagless = (): { defId?: string }[] =>
  (w.actors as { team: string; dead: boolean; tag?: string; defId?: string; passive?: boolean }[])
    .filter(a => a.team === 'enemy' && !a.dead && !a.tag && !a.passive);
const wildlifeTags = (): number =>
  (w.actors as { team: string; tag?: string }[])
    .filter(a => a.team === 'enemy' && (a.tag === 'critter' || a.tag === 'predator')).length;

// --- RIG A: the closed hub -------------------------------------------------------
{
  contest('crossroads', ZONES.crossroads);
  const rivals: string[] = w.sim.faction.contestants('crossroads');
  check('A1 the contest is genuinely ARMED (both rivals over threshold)', rivals.length >= 2,
    rivals.join(','));
  w.loadZone('crossroads');
  const bodies = tagless();
  const foreign = bodies.filter(b => !AUTHORED.has(b.defId ?? ''));
  check('A2 the hub fields ONLY its authored dead', bodies.length > 0 && foreign.length === 0,
    `${bodies.length} bodies, foreign: ${foreign.map(f => f.defId).join(',') || 'none'}`);
  check('A3 no fallback wildlife wanders the curated ground', wildlifeTags() === 0,
    `${wildlifeTags()} critter/predator`);
  note(`hub cohort: ${[...new Set(bodies.map(b => b.defId))].join(', ')}`);
}

// --- RIG B: the open control -----------------------------------------------------
{
  const open: ZoneDef = {
    ...ZONES.crossroads,
    id: 'qa_open_hub', name: 'QA Open Hub',
    cohort: undefined,
    exits: [], waypoint: false,
    map: { x: 420, y: -380 },
  };
  w.zoneMap.qa_open_hub = open;
  contest('qa_open_hub', open);
  w.loadZone('qa_open_hub');
  const bodies = tagless();
  const foreign = bodies.filter(b => !AUTHORED.has(b.defId ?? ''));
  check('B1 the SAME zone without the law stages the contest (foreign bodies present)',
    foreign.length > 0, `${foreign.length} foreign of ${bodies.length}`);
}

// --- RIG C: the conquest pin -----------------------------------------------------
{
  w.sim.faction.conquered?.set?.('crossroads', facA);
  w.sim.faction.conquered?.set?.('qa_open_hub', facA);
  const pinned = w.baseTable(ZONES.crossroads) as { id: string }[];
  const swapped = w.baseTable(w.zoneMap.qa_open_hub) as { id: string }[];
  check('C1 a conquered COHORT zone keeps its authored table',
    pinned.length > 0 && pinned.every(e => AUTHORED.has(e.id)));
  check('C2 a conquered OPEN zone swaps to the conqueror\'s roster',
    swapped.length > 0 && swapped.some(e => !AUTHORED.has(e.id)),
    swapped.slice(0, 3).map(e => e.id).join(','));
}

// A biome-less, anchor-varied ZoneDef on the crossroads chassis: every gate
// field the spawner reads is pinned OPEN (no cohort, no authored fauna, no
// special, objective 'clear'), so the rigs isolate the table resolution.
const wlStub = (over: Partial<ZoneDef>): ZoneDef => ({
  ...ZONES.crossroads, id: 'qa_wl_stub', name: 'QA Wildlife Stub',
  cohort: undefined, fauna: undefined, biome: undefined, anchor: undefined,
  special: undefined, packDensity: undefined, level: 10,
  objective: { kind: 'clear' },
  exits: [], waypoint: false, map: { x: 640, y: -420 },
  ...over,
});

// --- RIG D: the anchor read (the fauna provenance resolver, pure) ----------------
{
  // Resolved from the data, not hardcoded: any biome id with no WILDLIFE row.
  const noRow = Object.keys(BIOMES).find(b => !(b in WILDLIFE));
  check('D0 a no-WILDLIFE-row biome id exists to test with', noRow !== undefined,
    `using '${noRow}'`);
  check('D1 a biome-less mint reads its stamped ANCHOR',
    World.wildlifeTableFor(wlStub({ anchor: 'volcanic' })) === WILDLIFE.volcanic);
  check('D2 anchor-less, biome-less ground keeps plains',
    World.wildlifeTableFor(wlStub({})) === WILDLIFE.plains);
  check('D3 an anchor with NO row falls to the plains net (never silence)',
    noRow !== undefined && World.wildlifeTableFor(wlStub({ anchor: noRow })) === WILDLIFE.plains);
  check('D4 a BIOMED no-row zone stays fauna-free (the standing law holds)',
    noRow !== undefined && World.wildlifeTableFor(wlStub({ biome: noRow })) === undefined);
  check('D5 biome outranks anchor when both stand',
    World.wildlifeTableFor(wlStub({ biome: 'desert', anchor: 'volcanic' })) === WILDLIFE.desert);
  const authoredRows = [{ id: 'gutter_rat', chance: 1, count: [1, 1] as [number, number] }];
  check('D6 authored fauna outranks biome AND anchor',
    World.wildlifeTableFor(wlStub({ fauna: authoredRows, biome: 'desert', anchor: 'volcanic' }))
      === authoredRows);
}

// --- RIG E: the anchor read, live (spawnWildlife consumes the resolver) ----------
{
  // Wildlife rolls ride Math.random (deliberately unseeded ambience), so the
  // live rigs assert over a REPEATED census: N independent spawn passes make
  // a zero-birth false-fail astronomically unlikely (volcanic's plain rows
  // miss ALL of 25 passes with p ≈ 0.18^25), while the exclusion legs are
  // exact — one foreign body is a fail, however the dice fell.
  const N = 25;
  const census = (def: ZoneDef): string[] => {
    const actors = w.actors as { defId?: string }[];
    const before = actors.length;
    for (let i = 0; i < N; i++) w.spawnWildlife(def);
    return actors.slice(before).map(a => a.defId ?? '?');
  };
  const volcanicIds = new Set(WILDLIFE.volcanic.map(r => r.id));
  const plainsIds = new Set(WILDLIFE.plains.map(r => r.id));
  check('E0 the tables can disagree (plains carries ids volcanic lacks)',
    WILDLIFE.plains.some(r => !volcanicIds.has(r.id)));
  const anchored = census(wlStub({ id: 'qa_wl_volcanic', anchor: 'volcanic' }));
  check('E1 a volcanic-anchored biome-less cave births its ANCHOR country\'s fauna',
    anchored.length > 0, `${anchored.length} born over ${N} passes`);
  check('E2 …and NOTHING from any other table',
    anchored.every(id => volcanicIds.has(id)),
    `foreign: ${anchored.filter(id => !volcanicIds.has(id)).join(',') || 'none'}`);
  const bare = census(wlStub({ id: 'qa_wl_bare' }));
  check('E3 anchor-less ground still births plains fauna', bare.length > 0,
    `${bare.length} born`);
  check('E4 …all of it from the plains table', bare.every(id => plainsIds.has(id)),
    `foreign: ${bare.filter(id => !plainsIds.has(id)).join(',') || 'none'}`);
  const noRow = Object.keys(BIOMES).find(b => !(b in WILDLIFE));
  const unrowed = census(wlStub({ id: 'qa_wl_unrowed', anchor: noRow }));
  check('E5 a no-row anchor degrades to plains — populated, never silent',
    unrowed.length > 0 && unrowed.every(id => plainsIds.has(id)),
    `${unrowed.length} born, anchor='${noRow}'`);
  // The chip's own do-no-harm clause: the COHORT LAW outranks the anchor read
  // — a closed-membership zone births no fallback fauna however it is anchored.
  const closed = census(wlStub({ id: 'qa_wl_closed', cohort: 'authored', anchor: 'volcanic' }));
  check('E6 the cohort law still outranks the anchor read (closed zone births none)',
    closed.length === 0, `${closed.length} born`);
  note(`anchored census: ${[...new Set(anchored)].join(', ') || 'none'}`);
}

// --- RIG F: the cave air (pooled + themed lanes, seed-foreordained) --------------
{
  // F0 — THE FACE ORACLE's ground: every caveFace claimant carries its own
  // packs object and no two share one — the fingerprint mintCave stamps by
  // reference (`packs: ts.packs`) is unambiguous. A copy-spread in the mint
  // or a shared packs literal turns THIS light red before the lane can lie.
  const facePacks = CAVE_FACE_IDS.map(id => TILESETS[id]?.packs);
  check('F0 every cave face carries its own packs fingerprint (unique, defined)',
    facePacks.every(p => p !== undefined) && new Set(facePacks).size === facePacks.length,
    CAVE_FACE_IDS.join(','));
  check('F1 every pool claims real faces and every pool row names a real monster',
    CAVE_POOLS.length >= 3
    && CAVE_POOLS.every(p => p.faces.every(f => CAVE_FACE_IDS.includes(f))
      && p.table.length > 0 && p.table.every(r => !!MONSTERS[r.id])));

  // The pool-lane stub: a cave-shaped def wearing a REAL face's fingerprint.
  // (The wlStub chassis carries crossroads' authored packs — exactly the
  // foreign-fingerprint control the forced-mint leg wants.)
  const caveStub = (over: Partial<ZoneDef>): ZoneDef => ({
    ...wlStub({}), caveDepth: 1, seed: 12345, packs: TILESETS.cavern.packs, ...over,
  });
  const poolTables = new Set<unknown>(CAVE_POOLS.map(p => p.table));

  // F2/F3 — FOREORDAINED: same def, same answer; a spread clone (fresh
  // object, same fingerprint) answers identically; the answer is a pool
  // table or the echo (undefined), never anything else.
  const d1 = caveStub({});
  const a1 = World.caveAirFor(d1);
  check('F2 the roll is a pure function of the def (same def + clone, same answer)',
    World.caveAirFor(d1) === a1 && World.caveAirFor({ ...d1 }) === a1,
    a1 ? `a pool of ${a1.length} rows` : 'the anchor echo');
  check('F3 a cavern-faced cave answers a pool or the echo, nothing else',
    a1 === undefined || poolTables.has(a1));

  // F4/F5 — the seed MOVES the roll and the echo keeps its seat.
  const seen = new Set<unknown>();
  let legal = true;
  for (let s = 1; s <= 300; s++) {
    const a = World.caveAirFor(caveStub({ seed: s * 7919 }));
    seen.add(a);
    if (a !== undefined && !poolTables.has(a)) legal = false;
  }
  check('F4 the seed moves the roll (≥3 outcomes over 300 seeds, all legal)',
    legal && seen.size >= 3, `${seen.size} distinct outcomes`);
  check('F5 the anchor echo genuinely wins some caves (provenance keeps its seat)',
    seen.has(undefined));

  // F6 — THE THEMED BYPASS: each themed face breathes its claimed country
  // wherever it hangs (the anchor deliberately foreign in every leg).
  const themedLegs: [string, string][] = [
    ['magma_gallery', 'volcanic'], ['rime_gallery', 'tundra'],
    ['fungal_hollow', 'mycelia'], ['marine_trench', 'deepsea'],
    ['rootways', 'garden'],
  ];
  for (const [face, biome] of themedLegs) {
    check(`F6 ${face} breathes ${biome} under a plains anchor`,
      (WILDLIFE[biome]?.length ?? 0) > 0
      && World.caveAirFor(caveStub({ caveDepth: 3, anchor: 'plains', packs: TILESETS[face]?.packs }))
        === WILDLIFE[biome]);
  }

  // F7-F9 — structural refusals: foreign fingerprints (dens, cellars,
  // interiors, blends), dimension ladders, seedless and surface ground all
  // keep the standing anchor law.
  check('F7 a foreign-fingerprint mint refuses the lane (the den law)',
    World.caveAirFor(caveStub({ packs: ZONES.crossroads.packs })) === undefined
    && World.wildlifeTableFor(caveStub({ packs: ZONES.crossroads.packs, anchor: 'volcanic' }))
      === WILDLIFE.volcanic);
  check('F8 a dimension-hung ladder never pools',
    World.caveAirFor(caveStub({ dimension: 'hell' })) === undefined);
  check('F9 seedless or surface ground never pools',
    World.caveAirFor(caveStub({ seed: undefined })) === undefined
    && World.caveAirFor({ ...wlStub({}), packs: TILESETS.cavern.packs }) === undefined);

  // F10 — the strata envelope is live data (the exotic pool whispers
  // shallow and owns the deep) — exact, no dice.
  const exotic = CAVE_POOLS.find(p => p.id === 'cave_exotic');
  check('F10 the exotic pool rises with depth (its envelope is live)',
    !!exotic && presenceMul(exotic?.strata, 1) < presenceMul(exotic?.strata, 3));

  // F11/F12 — REAL MINTS flow the lane end to end: actual mintCave defs
  // resolve to a legal non-silent answer, the same entrance seed re-answers
  // identically (foreordained through the real stamp path), and pooled air
  // reaches a healthy share of real caves.
  const parent: ZoneDef = { ...ZONES.crossroads, id: 'qa_pool_parent', biome: 'grove' };
  let realLegal = true; let rePinned = true; let pooled = 0;
  for (let s = 0; s < 40; s++) {
    const seed = 1000 + s * 331;
    const def = mintCave(parent, seed, `qa_pool_cave_${s}`);
    const a = World.wildlifeTableFor(def);
    const b = World.wildlifeTableFor(mintCave(parent, seed, `qa_pool_cave_${s}b`));
    if (a !== b) rePinned = false;
    if (!a || a.length === 0) realLegal = false;
    if (poolTables.has(a)) pooled++;
  }
  check('F11 real mintCave defs answer the lane (never silent, seed-stable)',
    realLegal && rePinned);
  check('F12 pooled air reaches real minted caves', pooled > 0, `${pooled}/40 pooled`);

  // F13/F14 — the pooled census, live (the E-rig idiom): a real minted cave
  // whose air is a POOL births ONLY that repertoire, however the dice fall.
  let poolDef: ZoneDef | undefined;
  for (let s = 0; s < 200 && !poolDef; s++) {
    const def = mintCave(parent, 5000 + s * 613, `qa_pool_live_${s}`);
    const a = World.caveAirFor(def);
    if (a && poolTables.has(a)) poolDef = def;
  }
  check('F13 a pooled real mint exists to census', !!poolDef);
  if (poolDef) {
    const table = World.caveAirFor(poolDef)!;
    const ids = new Set(table.map(r => r.id));
    const actors = w.actors as { defId?: string }[];
    const before = actors.length;
    for (let i = 0; i < 25; i++) w.spawnWildlife(poolDef);
    const born = actors.slice(before).map(a => a.defId ?? '?');
    check('F14 the pooled cave births ONLY its rolled repertoire',
      born.length > 0 && born.every(id => ids.has(id)),
      `${born.length} born; foreign: ${born.filter(id => !ids.has(id)).join(',') || 'none'}`);
    note(`pooled census: ${[...new Set(born)].join(', ') || 'none'}`);
  }

  // F15-F19 — THE GEODELING HOMES (the habitat fabric, live): no crystal,
  // no geodeling; a planted cluster seats the band inside its yard and the
  // yard HOLDS them — the native-to-the-doodad promise, walked.
  const clusterKind = MONSTERS.geodeling?.habitat?.kind ?? '';
  check('F15 the arena starts bare of the geodeling\'s home doodad',
    clusterKind !== '' && (w.doodads as { kind: string }[]).every(d => d.kind !== clusterKind));
  const fauna = [{ id: 'geodeling', chance: 1, count: [2, 2] as [number, number] }];
  const actors2 = w.actors as { defId?: string }[];
  const b0 = actors2.length;
  w.spawnWildlife(wlStub({ id: 'qa_wl_geode0', fauna }));
  check('F16 no crystal, no geodeling (habitat gates the spawn outright)',
    actors2.length === b0);
  w.doodads.push({ pos: vec(900, 900), radius: 16, kind: clusterKind } as never);
  w.spawnWildlife(wlStub({ id: 'qa_wl_geode1', fauna }));
  type Bodied = { defId?: string; pos: { x: number; y: number }; radius: number };
  const kin = (w.actors as Bodied[]).filter(a => a.defId === 'geodeling');
  const grace = MONSTERS.geodeling?.habitat?.grace ?? 24;
  const home = (a: Bodied): boolean =>
    Math.hypot(a.pos.x - 900, a.pos.y - 900) <= 16 + grace + a.radius + 6;
  check('F17 with a cluster planted the geodelings arrive', kin.length === 2,
    `${kin.length} born`);
  check('F18 …born inside the cluster\'s yard', kin.length > 0 && kin.every(home));
  for (let i = 0; i < 240; i++) w.update(1 / 30);
  check('F19 …and the yard HOLDS them (the habitat confine, walked ~8s)',
    kin.length > 0 && kin.every(home));
}

console.log(fails === 0 ? '\nALL PASS' : `\n${fails} FAILURE(S)`);
process.exit(fails === 0 ? 0 : 1);
