// ---------------------------------------------------------------------------
// ONE-OFF PROBE — THE OCCURRENCE FABRIC end to end on the real engine
// (engine/occurrences.ts + data/occurrences.ts; the batch-18 charter):
//   A) the registry weave — the fracture debut resolves whole (trigger /
//      aftermath kinds registered, every kin row a real non-boss body, every
//      dress kind a registered doodad rule),
//   B) THE DOCTRINE PARITY (the uncertainty doctrine made structural): a
//      court holding the occurrence row is BYTE-IDENTICAL to a plain court
//      of its face kind — grid, doodads, POIs, spawns — while the minted
//      trigger exists only for the occurrence (and sits ON a court seat),
//   C) mint determinism — same seed, same spots, twice (+ the absent-row
//      mint is deterministic with the registrant imported),
//   D) THE DWELL CLOCK live — the bank fires at its second (armed at 29s,
//      sprung past 30), the telegraph law speaks first (cracks + the held
//      rumble past the fraction), the wave lands counted, kin-true, in band,
//   E) ONE-SHOT BY MEMORY — leave and return: the seeded wound replants
//      byte-identical, the spot never re-arms (no second wave), exactly one
//      breach mouth stands,
//   F) THE FIXTURE + THE QUICKENING ANCHOR — the breached spot pours on the
//      clock under its hard cap, and a surged zone level is the level every
//      new body mints at (the live read is the anchor),
//   G) the trigger grammar pure — proximity fires on approach, disturb on
//      the ping ring, the dwell bank HOLDS while the hero steps away, the
//      fixture clock pours to its cap and stops, an unknown trigger sleeps.
//
// Run: npx tsx balance/probe_occurrences.ts
// ---------------------------------------------------------------------------

import { bootSimEngine, makeSimWorld, SIM_ARENA_ID } from '../src/sim/arena';
import { seedGlobalRandom } from '../src/sim/rng';
import '../src/data/occurrences'; // seat-proof explicitly (the settled-import law)
import {
  driveOccSites, mintedOccurrencesOf, occAftermathKinds,
  OCC_CFG, occTriggerKinds, OCCURRENCES, registerOccurrence,
  type OccHost, type OccSite,
} from '../src/engine/occurrences';
import { MONSTERS } from '../src/data/monsters';
import { doodadRuleOf, generateLayout, type GenCtx } from '../src/engine/levelgen';
import { carveMassifs } from '../src/engine/massif';
import { GridWalkField } from '../src/world/gridWalk';
import { Rng } from '../src/core/rng';
import { vec } from '../src/core/math';
import type { ZoneDef } from '../src/data/zones';

let failed = 0;
const check = (name: string, ok: boolean, detail = ''): void => {
  console.log(`${ok ? 'PASS' : 'FAIL'}  ${name}${detail ? ' — ' + detail : ''}`);
  if (!ok) failed++;
};

bootSimEngine();
seedGlobalRandom(0x0cc);

const DT = 1 / 60;
type SimWorld = ReturnType<typeof makeSimWorld>;
const tickSec = (w: SimWorld, sec: number, per?: () => void): void => {
  for (let t = 0; t < sec; t += DT) { per?.(); w.update(DT); }
};

const FRACTURE = OCCURRENCES.abyssal_fracture;
const KIN_IDS = new Set([
  ...(FRACTURE?.spring.wave?.kin ?? []).map(r => r.id),
  ...(FRACTURE?.aftermath?.pour?.kin ?? []).map(r => r.id),
]);

// --- A) the registry weave ----------------------------------------------------
{
  check('weave: the abyssal fracture is registered with dwell trigger + fixture aftermath',
    !!FRACTURE && FRACTURE.trigger.kind === 'dwell' && FRACTURE.aftermath?.kind === 'fixture');
  check('weave: the trigger grammar ships dwell + proximity + disturb; the fixture aftermath stands',
    ['dwell', 'proximity', 'disturb'].every(k => occTriggerKinds().includes(k))
    && occAftermathKinds().includes('fixture'));
  const kinOk = [...KIN_IDS].every(id => {
    const d = MONSTERS[id];
    return !!d && !d.boss && !d.passive && !d.spawner;
  });
  check('weave: every fracture kin row is a real, non-boss, non-spawner body',
    KIN_IDS.size > 0 && kinOk, [...KIN_IDS].join(','));
  const dressKinds = [
    ...(FRACTURE?.telegraph?.dress ?? []), ...(FRACTURE?.spring.dress ?? []),
  ].map(r => r.kind);
  check('weave: every wound-dress kind is a standing doodad rule (no new painters — the telegraph law)',
    dressKinds.length > 0 && dressKinds.every(k => !!doodadRuleOf(k)),
    dressKinds.join(','));
  check('weave: the breach mouth wears the pit word and the cracks stay walkable ground',
    (FRACTURE?.spring.dress ?? []).some(r => r.kind === 'abyssal_rent' && r.fall === true)
    && doodadRuleOf('abyss_crack').overlap === 'ground');
}

// --- The gen scaffolding (probe_watchers rig-12's idiom) ----------------------
const ARENA = { w: 2600, h: 2000 };
const ENTRY = vec(120, 1000);
const EXITS = [vec(2480, 1000)];
const THEME = { floor: '#161616', grid: '#222', border: '#555', obstacle: '#333', obstacleEdge: '#666', accent: '#999' };
const PARAMS = { massifCoverage: [0.2, 0.26] as [number, number], massifSizeR: [210, 300] as [number, number] };
const occZone = (id: string, rows: unknown[], seed: number, extra?: Partial<ZoneDef>): ZoneDef => ({
  id, name: `QA ${id}`, level: 8, size: { w: ARENA.w, h: ARENA.h },
  theme: THEME, layout: [], objective: { kind: 'clear' }, exits: [], map: { x: 0, y: 0 },
  layoutType: 'massif', layoutParams: { ...PARAMS, massifMasses: rows }, seed,
  ...extra,
});
const courtRows = (tenants?: unknown[]): unknown[] => [{
  kind: 'ruincourt', weight: 1,
  over: { shapes: [{ shape: 'court', weight: 1 }], ...(tenants ? { tenants } : {}) },
}];
const OCC_TABLE = [{ kind: 'occurrence', weight: 1, params: { id: 'abyssal_fracture' } }];
const CACHE_TABLE = [{ kind: 'cache', weight: 1 }];
const gen = (def: ZoneDef, seed: number): ReturnType<typeof generateLayout> =>
  generateLayout({ ...def, seed }, ARENA, new Rng(seed), ENTRY, EXITS);
const genCtx = (seed: number): GenCtx => ({
  rng: new Rng(seed), arena: ARENA, entry: ENTRY, exits: EXITS, seed,
  doodads: [], pois: [], camps: [], breakables: [], npcs: [],
  garrisons: [], caveSeeds: [], reserved: [],
});
const kbitsOf = (out: ReturnType<typeof generateLayout>): string =>
  out.walk instanceof GridWalkField ? out.walk.pack().kbits : '?';

// --- B) THE DOCTRINE PARITY ---------------------------------------------------
{
  let ok = true, detail = '', courts = 0, minted = 0;
  for (let s = 0; s < 3 && ok; s++) {
    const seed = (1000003 * (s + 1) + 17) ^ 0x0cc1;
    const zid = `occ_parity_${s}`; // per-seed ids — a stale bundle never crosses seeds
    // The plain face FIRST (its mint records nothing — proven below).
    const plain = gen(occZone(zid, courtRows(CACHE_TABLE), seed), seed);
    if (mintedOccurrencesOf(zid).length) {
      ok = false; detail = 'the plain cache mint recorded a trigger from nowhere'; break;
    }
    const dressed = gen(occZone(zid, courtRows(OCC_TABLE), seed), seed);
    if (JSON.stringify(plain.doodads) !== JSON.stringify(dressed.doodads)) {
      ok = false; detail = `seed ${seed}: the occurrence row moved the dress`; break;
    }
    if (kbitsOf(plain) !== kbitsOf(dressed)) { ok = false; detail = `seed ${seed}: the row moved the grid`; break; }
    if (JSON.stringify(plain.pois) !== JSON.stringify(dressed.pois)) { ok = false; detail = `seed ${seed}: the row moved the POIs`; break; }
    if (JSON.stringify(plain.landmarkSpawns ?? []) !== JSON.stringify(dressed.landmarkSpawns ?? [])) {
      ok = false; detail = `seed ${seed}: the row moved the spawns`; break;
    }
    // The trigger exists exactly where courts stand (the carve twin's seats).
    const rows = mintedOccurrencesOf(zid);
    const ctx2 = genCtx(seed);
    const masses = carveMassifs(ctx2, { ...occZone(zid, courtRows(OCC_TABLE), seed), seed });
    const seats = masses.filter(m => m.interior);
    courts += seats.length;
    minted += rows.length;
    if (rows.length !== seats.length
      || !rows.every(r => seats.some(m => m.interior!.x === r.x && m.interior!.y === r.y))) {
      ok = false; detail = `seed ${seed}: minted triggers (${rows.length}) disagree with the court seats (${seats.length})`;
    }
  }
  check('doctrine: an occurrence court is BYTE-IDENTICAL to a plain court of its face (no pre-read exists)',
    ok && courts >= 4, detail || `${courts} courts, ${minted} triggers over the sweep`);
}

// --- C) mint determinism ------------------------------------------------------
{
  const seed = 0xbeef01;
  const def = occZone('occ_det', courtRows(OCC_TABLE), seed);
  gen(def, seed);
  const first = JSON.stringify(mintedOccurrencesOf('occ_det'));
  gen(def, seed);
  const second = JSON.stringify(mintedOccurrencesOf('occ_det'));
  check('determinism: two same-seed mints record byte-identical triggers (same spots)',
    first === second && first !== '[]', `${JSON.parse(first).length} spots`);
  const bare = occZone('occ_det_bare', courtRows(), seed);
  const a = gen(bare, seed);
  const b = gen(bare, seed);
  check('determinism: an occurrence-less mint stays byte-identical with the registrant imported (absent-row parity)',
    JSON.stringify(a.doodads) === JSON.stringify(b.doodads) && kbitsOf(a) === kbitsOf(b)
    && mintedOccurrencesOf('occ_det_bare').length === 0);
}

// --- D/E/F) the live fabric on one world --------------------------------------
const w = makeSimWorld('warrior', 777);
w.player.sheet.setBase('detectability', 0); // no combat noise — the clock is the subject
const LIVE = 'probe_occ_live';
{
  const def = occZone(LIVE, courtRows(OCC_TABLE), 0x11ab7);
  (w as unknown as { zoneMap: Record<string, ZoneDef> }).zoneMap[LIVE] = def;
  w.loadZone(LIVE);
  const minted = mintedOccurrencesOf(LIVE);
  check('live: entering the zone adopts the minted triggers (armed, invisible)',
    w.zone.id === LIVE && minted.length >= 1
    && !w.doodads.some(d => d.kind === 'abyssal_rent' || d.kind === 'abyss_crack'),
    `${minted.length} spots`);
  const site = minted[0];
  const born = (): number => w.actors.filter(a => !a.dead && a.tag === OCC_CFG.bornTag).length;
  const rents = (): number => w.doodads.filter(d => d.kind === 'abyssal_rent').length;
  const cracks = (): number => w.doodads.filter(d => d.kind === 'abyss_crack').length;
  const park = (): void => { w.player.pos.x = site.x; w.player.pos.y = site.y; };

  // The dwell: parked at the spot, the bank climbs. 13s: still silent ground.
  tickSec(w, 13, park);
  check('dwell: before the telegraph fraction the ground is silent (no cracks, no rumble beyond decay)',
    cracks() === 0 && rents() === 0 && born() === 0);
  // Past 13.5s (0.45 × 30): the spot SPEAKS — cracks + the held rumble.
  tickSec(w, 3, park);
  check('telegraph: past the fraction the floor spider-cracks and the ground rumbles underfoot',
    cracks() >= 3 && rents() === 0 && w.shake > 0.5, `${cracks()} cracks, shake ${w.shake.toFixed(1)}`);
  // 29s banked: still armed — the clock fires at ITS second, not before.
  tickSec(w, 13, park);
  check('dwell: at 29s banked the spot is still armed (no breach, no wave)',
    rents() === 0 && born() === 0);
  // Cross 30: THE SPRING.
  tickSec(w, 2, park);
  const waveN = born();
  const waveOk = w.actors.filter(a => !a.dead && a.tag === OCC_CFG.bornTag)
    .every(a => KIN_IDS.has(a.defId ?? '')
      && Math.hypot(a.pos.x - site.x, a.pos.y - site.y) <= 200);
  check('spring: the breach smashes through at the dwell second — one pit mouth + the wave, kin-true, in band',
    rents() === 1 && waveN >= 5 && waveN <= 8 && waveOk, `${waveN} borne, ${rents()} mouth`);

  // --- E) one-shot by memory --------------------------------------------------
  const wound = (): string => JSON.stringify(w.doodads
    .filter(d => d.kind === 'abyssal_rent' || d.kind === 'abyss_crack')
    .map(d => [d.kind, Math.round(d.pos.x * 1000), Math.round(d.pos.y * 1000), Math.round(d.radius * 1000)])
    .sort((a, b) => String(a).localeCompare(String(b))));
  const woundBefore = wound();
  w.loadZone(SIM_ARENA_ID);
  w.caveReturn = null;
  (w as unknown as { caveStack: unknown[] }).caveStack = [];
  w.loadZone(LIVE);
  check('memory: the remembered SPRUNG spot re-stands its wound byte-identical (the seeded dress law)',
    wound() === woundBefore && rents() === 1, `${cracks()} cracks re-stood`);
  check('memory: poured kin are transient — the return meets the wound, not the wave',
    born() === 0);
  tickSec(w, 16, park);
  check('memory: sprung stays sprung — a fresh dwell springs NOTHING (the fixture trickle alone)',
    rents() === 1 && born() <= 2, `${born()} borne at 16s`);

  // --- F) the fixture clock + THE QUICKENING ANCHOR ---------------------------
  const preSurge = new Set(w.actors.filter(a => a.tag === OCC_CFG.bornTag).map(a => a.id));
  w.zone.level += 7; // the Quickening's own write — ZoneDef.level surges live
  tickSec(w, 60, park);
  const newborn = w.actors.filter(a => a.tag === OCC_CFG.bornTag && !preSurge.has(a.id));
  check('fixture: the breached spot keeps pouring on the clock',
    newborn.length >= 1, `${newborn.length} new over 60s`);
  check('quickening anchor: every body born under the surge mints at the LIVE zone level',
    newborn.length >= 1 && newborn.every(a => a.level === w.zone.level),
    `levels [${[...new Set(newborn.map(a => a.level))].join(',')}] vs zone ${w.zone.level}`);
  tickSec(w, 90, park);
  check('fixture: THE CAP LAW holds — live born bodies never exceed the pour cap',
    born() <= (FRACTURE?.aftermath?.pour?.cap ?? OCC_CFG.pour.cap),
    `${born()} live vs cap ${FRACTURE?.aftermath?.pour?.cap ?? OCC_CFG.pour.cap}`);
  w.zone.level -= 7;
}

// --- G) the trigger grammar, pure ---------------------------------------------
{
  let tNow = 0;
  let heroD = 9999;
  let pinged = false;
  let bornCount = 0;
  let plants = 0;
  let pours = 0;
  const host: OccHost = {
    timeOf: () => tNow,
    zoneLevel: () => 10,
    heroDist: () => heroD,
    disturbedNear: () => pinged,
    dice: (a) => a,
    diceInt: (a) => a,
    plant: () => { plants++; },
    pour: (_spec, _x, _y, _band, n) => { pours++; bornCount += n; return n; },
    tagCount: () => bornCount,
    announce: () => {},
    rumble: () => {},
    flash: () => {},
  };
  const site = (id: string): OccSite => ({
    def: OCCURRENCES[id], x: 0, y: 0, floorR: 100, seed: 7,
    state: 'armed', bank: 0, told: false, cracked: false, pourAt: 0,
  });
  registerOccurrence({
    id: 'probe_occ_prox', trigger: { kind: 'proximity', radius: 100 }, spring: {},
  });
  registerOccurrence({
    id: 'probe_occ_dist', trigger: { kind: 'disturb', radius: 100 }, spring: {},
  });
  registerOccurrence({
    id: 'probe_occ_fix', trigger: { kind: 'dwell', sec: 2, radius: 100 }, spring: {},
    aftermath: { kind: 'fixture', pour: { kin: [{ id: 'abyssal_crawler', weight: 1 }], every: [5, 5], batch: [1, 1], cap: 2, radius: [10, 20] } },
  });
  registerOccurrence({
    id: 'probe_occ_sleep', trigger: { kind: 'no_such_trigger' }, spring: {},
  });

  const prox = site('probe_occ_prox');
  driveOccSites(host, [prox], DT);
  const proxFar = prox.state;
  heroD = 50;
  driveOccSites(host, [prox], DT);
  check('grammar: proximity — far is armed, the first step inside springs it',
    proxFar === 'armed' && prox.state === 'sprung');

  heroD = 9999;
  const dist = site('probe_occ_dist');
  driveOccSites(host, [dist], DT);
  const distQuiet = dist.state;
  pinged = true;
  driveOccSites(host, [dist], DT);
  pinged = false;
  check('grammar: disturb — quiet ground is armed, a breaking body nearby springs it',
    distQuiet === 'armed' && dist.state === 'sprung');

  const dw = site('probe_occ_fix');
  heroD = 50;
  for (let t = 0; t < 1; t += DT) driveOccSites(host, [dw], DT);
  const bankIn = dw.bank;
  heroD = 9999;
  for (let t = 0; t < 5; t += DT) driveOccSites(host, [dw], DT);
  const bankHeld = dw.bank;
  heroD = 50;
  for (let t = 0; t < 1.2; t += DT) driveOccSites(host, [dw], DT);
  check('grammar: the dwell bank HOLDS while the hero steps away, and fires on the return',
    bankIn > 0.9 && Math.abs(bankHeld - bankIn) < 1e-9 && dw.state === 'sprung',
    `banked ${bankIn.toFixed(2)}, held ${bankHeld.toFixed(2)}`);

  // The fixture clock, deterministic dice: arm at +5, pour at each beat, cap 2.
  driveOccSites(host, [dw], DT); // arm (pourAt = 5)
  tNow = 5.1;
  driveOccSites(host, [dw], DT);
  tNow = 10.2;
  driveOccSites(host, [dw], DT);
  tNow = 15.3;
  driveOccSites(host, [dw], DT);
  check('grammar: the fixture pours per beat and STOPS at its cap',
    pours === 2 && bornCount === 2, `${pours} pours, ${bornCount} born`);

  const sleeper = site('probe_occ_sleep');
  heroD = 0;
  driveOccSites(host, [sleeper], DT);
  check('grammar: an unknown trigger kind sleeps (warned once, never wedged)',
    sleeper.state === 'armed');
  check('grammar: a spring with no dress and no wave plants nothing and pours nothing beyond the fixture',
    plants === 0);
}

console.log(failed ? `\n${failed} FAILURE(S)` : '\nALL PASS');
process.exit(failed ? 1 : 0);
