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
//
//   npx tsx balance/probe_cohort.ts [-- --verbose]

import { FACTIONS, factionStance } from '../src/data/monsters';
import { ZONES, type ZoneDef } from '../src/data/zones';
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

console.log(fails === 0 ? '\nALL PASS' : `\n${fails} FAILURE(S)`);
process.exit(fails === 0 ? 0 : 1);
