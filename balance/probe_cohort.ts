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
//
//   npx tsx balance/probe_cohort.ts [-- --verbose]

import { FACTIONS, factionStance, WILDLIFE } from '../src/data/monsters';
import { ZONES, type ZoneDef } from '../src/data/zones';
import { BIOMES } from '../src/world/biomes';
import { World } from '../src/engine/world';
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

console.log(fails === 0 ? '\nALL PASS' : `\n${fails} FAILURE(S)`);
process.exit(fails === 0 ? 0 : 1);
