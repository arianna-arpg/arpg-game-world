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
//      fixture clock pours to its cap and stops, an unknown trigger sleeps,
//   H) THE WORLD-CLOCK WAKE's window arithmetic, pure — entry edges are
//      inclusive-exact, contiguous windows enter once per day at their
//      leading edge, the wrap is a real edge, and the per-window dice are
//      FOREORDAINED (replay identically; vary across windows and seeds),
//   I) the clock driver — self-arms at first sight, springs across a live
//      edge, and a seeded watermark settles a whole absence in one frame
//      (the lazy law); seedOccClockMarks touches only armed clock sites,
//   J/K) the rouse live — fresh ground is LATENT (no retroactive nights), a
//      boot the ground has not yet witnessed sprung wakes nothing (THE
//      PARENT WITNESS LAW), the caldera-wake ring is byte-identical to a
//      plain kilnhoard ring, the resolver's den lane is exact (parent peek
//      gated on caveDepth; unsprung memory and surface neighbours sleep),
//      and the debut end-to-end: the parent's night springs while you are
//      away and the Urnfather boots AWAKE — walking — on the next den load,
//      while an unfound parent degrades to the sleeping side.
//
// Run: npx tsx balance/probe_occurrences.ts
// ---------------------------------------------------------------------------

import { bootSimEngine, makeSimWorld, SIM_ARENA_ID } from '../src/sim/arena';
import { seedGlobalRandom } from '../src/sim/rng';
import '../src/data/occurrences'; // seat-proof explicitly (the settled-import law)
import '../src/data/lairs'; // the den face: the lair_mouth tenant + the kilnhoard kit (the settled-import law)
import {
  clockWindowsHit, driveOccSites, mintedOccurrencesOf, occAftermathKinds,
  OCC_CFG, occTriggerKinds, OCCURRENCES, registerOccurrence,
  seedOccClockMarks, wakeRousedResidents,
  type OccHost, type OccSite, type OccTriggerSpec, type RousedWakeBody,
} from '../src/engine/occurrences';
import { DORMANT_TAGS, isDormant, registerDormantTag } from '../src/engine/ai';
import { DAY_LENGTH, type DayPhase } from '../src/world/daynight';
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
    state: 'armed', bank: 0, told: false, cracked: false, pourAt: 0, clockMark: 0,
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

// --- H) THE WORLD-CLOCK WAKE — the window arithmetic, pure --------------------
{
  const NIGHT = 0.50 * DAY_LENGTH; // the wheel's night edge
  const DUSK = 0.40 * DAY_LENGTH;
  const DAWN = 0.90 * DAY_LENGTH;
  const spec = (phases: DayPhase[], chance: number): OccTriggerSpec => ({ kind: 'clock', phases, chance });
  const night1 = spec(['night'], 1);
  check('clock math: the entry edge is inclusive-exact — (from, to] takes the edge, excludes from, finds the next day',
    clockWindowsHit(night1, 7, NIGHT - 1, NIGHT)
    && !clockWindowsHit(night1, 7, NIGHT, NIGHT + 5)
    && !clockWindowsHit(night1, 7, NIGHT + 1, DAY_LENGTH - 1)
    && clockWindowsHit(night1, 7, NIGHT + 1, DAY_LENGTH + NIGHT + 1));
  check('clock math: chance 0 never fires; an empty or inverted range never fires',
    !clockWindowsHit(spec(['night'], 0), 7, 0, DAY_LENGTH * 10)
    && !clockWindowsHit(night1, 7, NIGHT, NIGHT)
    && !clockWindowsHit(night1, 7, NIGHT + 5, NIGHT - 5));
  check('clock math: a contiguous window (dusk+night) enters ONCE per day, at its leading edge',
    !clockWindowsHit(spec(['dusk', 'night'], 1), 7, DUSK + 4, NIGHT + 1)
    && clockWindowsHit(spec(['dusk', 'night'], 1), 7, DUSK - 4, DUSK + 1)
    && clockWindowsHit(night1, 7, DUSK + 4, NIGHT + 1));
  check('clock math: the wrap is a real edge — day begins where dawn ends, and a dawn+day run enters at dawn',
    clockWindowsHit(spec(['day'], 1), 7, DAY_LENGTH - 1, DAY_LENGTH + 1)
    && !clockWindowsHit(spec(['dawn', 'day'], 1), 7, DAY_LENGTH - 1, DAY_LENGTH + 1)
    && clockWindowsHit(spec(['dawn', 'day'], 1), 7, DAWN - 1, DAWN + 1));
  {
    const half = spec(['night'], 0.5);
    const verdicts = (seed: number): string => Array.from({ length: 40 }, (_, k) =>
      clockWindowsHit(half, seed, NIGHT + k * DAY_LENGTH - 1, NIGHT + k * DAY_LENGTH) ? '1' : '0').join('');
    const a1 = verdicts(0xabc);
    const a2 = verdicts(0xabc);
    const b = verdicts(0xdef1);
    check('clock math: THE FOREORDAINED TENET — per-window dice replay identically, vary across windows and seeds',
      a1 === a2 && a1.includes('1') && a1.includes('0') && a1 !== b,
      `a=${a1.slice(0, 16)}… b=${b.slice(0, 16)}…`);
  }
}

// --- I) the clock driver: self-arm, the live edge, the lazy watermark ---------
{
  let tNow = 60; // mid-day
  const host: OccHost = {
    timeOf: () => tNow, zoneLevel: () => 10, heroDist: () => 9999,
    disturbedNear: () => false, dice: (a) => a, diceInt: (a) => a, plant: () => {},
    pour: () => 0, tagCount: () => 0, announce: () => {}, rumble: () => {}, flash: () => {},
  };
  registerOccurrence({ id: 'probe_occ_clock', trigger: { kind: 'clock', phases: ['night'], chance: 1 }, spring: {} });
  registerOccurrence({ id: 'probe_occ_clock0', trigger: { kind: 'clock', phases: ['night'], chance: 0 }, spring: {} });
  const site = (id: string): OccSite => ({
    def: OCCURRENCES[id], x: 0, y: 0, floorR: 100, seed: 7,
    state: 'armed', bank: 0, told: false, cracked: false, pourAt: 0, clockMark: 0,
  });
  const live = site('probe_occ_clock');
  const dud0 = site('probe_occ_clock0');
  driveOccSites(host, [live, dud0], DT);
  const armedAtNoon = live.state === 'armed' && live.clockMark === 60;
  tNow = 119;
  driveOccSites(host, [live, dud0], DT);
  const armedBefore = live.state === 'armed';
  tNow = 121;
  driveOccSites(host, [live, dud0], DT);
  check('clock driver: self-arms at first sight (no retroactive fire), holds to the edge, springs across it',
    armedAtNoon && armedBefore && live.state === 'sprung');
  check('clock driver: the chance-0 twin crosses the same night unmoved', dud0.state === 'armed');
  const lazy = site('probe_occ_clock');
  lazy.clockMark = 10; // "left at t=10" — the absence spans the night edge
  tNow = 130;
  driveOccSites(host, [lazy], DT);
  check('clock driver: a seeded watermark settles the whole absence in ONE frame (the lazy law)',
    lazy.state === 'sprung');
  const s1 = site('probe_occ_clock');
  const s2 = site('probe_occ_clock');
  s2.state = 'sprung';
  const s3 = site('probe_occ_fix'); // a dwell trigger — not the clock's to seed
  seedOccClockMarks([s1, s2, s3], 50, 200);
  const seeded = s1.clockMark === 50 && s2.clockMark === 0 && s3.clockMark === 0;
  const f1 = site('probe_occ_clock');
  seedOccClockMarks([f1], undefined, 200);
  const f2 = site('probe_occ_clock');
  seedOccClockMarks([f2], 300, 200);
  check('clock seeding: the leave-stamp is honored; fresh ground and clock-skew seed at NOW; sprung and foreign sites stay untouched',
    seeded && f1.clockMark === 200 && f2.clockMark === 200);
}

// --- J/K) THE ROUSE live: the witness law, the den lane, the debut ------------
{
  registerDormantTag('probe_wake_sleeper');
  MONSTERS['probe_wake_husk'] = {
    ...MONSTERS['abyssal_crawler'], id: 'probe_wake_husk',
    name: 'Probe Wake Husk', tag: 'probe_wake_sleeper',
  };
  registerOccurrence({
    id: 'probe_wake_self', face: 'cache',
    trigger: { kind: 'clock', phases: ['night'], chance: 1 },
    spring: {
      text: 'probe: the ground wakes',
      dress: [{ kind: 'abyss_crack', radius: [10, 12], count: [2, 2], ring: [12, 30] }],
    },
    aftermath: { kind: 'rouseResident', params: { tag: 'probe_wake_sleeper', wakeText: 'probe: they walk' } },
  });
  registerOccurrence({
    id: 'probe_caldera_wake', face: 'lair_mouth',
    trigger: { kind: 'clock', phases: ['night'], chance: 1 },
    spring: { text: 'probe: the mountain exhales', shake: 6 },
    aftermath: { kind: 'rouseResident', params: { tag: 'kiln_sleeper', wakeText: 'probe: the wyrm walks' } },
  });

  // K0) the REAL debut def's contract — the shape the massifs row will name.
  const CW = OCCURRENCES.caldera_wake;
  const rp = CW?.aftermath?.params as { tag?: string } | undefined;
  check('caldera wake: registered — a nightfall clock at a small foreordained chance, the den door as its face',
    !!CW && CW.trigger.kind === 'clock' && (CW.trigger.phases ?? []).includes('night')
    && (CW.trigger.chance ?? 1) > 0 && (CW.trigger.chance ?? 1) < 0.25 && CW.face === 'lair_mouth',
    `chance ${CW?.trigger.chance}`);
  check("caldera wake: the rouse names the Urnfather's own dormant tag",
    CW?.aftermath?.kind === 'rouseResident' && rp?.tag === 'kiln_sleeper'
    && MONSTERS.urnfather?.tag === 'kiln_sleeper' && DORMANT_TAGS.has('kiln_sleeper'));

  // K1) THE PARITY at the colossal grain: an occurrence ring wearing the den
  // face is byte-identical to a plain den ring — same maw, same spoor, and
  // no caldera ever confesses whether its mountain keeps a waking clock.
  {
    let ok = true, detail = '', mouths = 0, minted = 0;
    for (let s = 0; s < 2 && ok; s++) {
      const seed = (2000003 * (s + 1) + 29) ^ 0x0cc2;
      const zid = `occ_denpar_${s}`; // per-seed ids — the stale-bundle law
      const plain = gen(occZone(zid, courtRows([{ kind: 'lair_mouth', weight: 1, params: { den: 'kilnhoard' } }]), seed), seed);
      if (mintedOccurrencesOf(zid).length) { ok = false; detail = 'the plain den mint recorded a trigger'; break; }
      const wake = gen(occZone(zid, courtRows([{ kind: 'occurrence', weight: 1, params: { id: 'caldera_wake', den: 'kilnhoard' } }]), seed), seed);
      if (JSON.stringify(plain.doodads) !== JSON.stringify(wake.doodads)) { ok = false; detail = `seed ${seed}: the wake row moved the dress`; break; }
      if (kbitsOf(plain) !== kbitsOf(wake)) { ok = false; detail = `seed ${seed}: the wake row moved the grid`; break; }
      if (JSON.stringify(plain.pois) !== JSON.stringify(wake.pois)) { ok = false; detail = `seed ${seed}: the wake row moved the POIs`; break; }
      mouths += wake.doodads.filter(d => d.kind === 'kiln_maw').length;
      minted += mintedOccurrencesOf(zid).length;
    }
    check('den parity: a caldera-wake ring is BYTE-IDENTICAL to a plain kilnhoard ring',
      ok && mouths >= 1 && minted >= 1, detail || `${mouths} maws, ${minted} triggers over the sweep`);
  }

  // K2) the resolver's den lane, pure: a sprung parent wakes the tag once
  // and floats the wakeText once; unsprung memory, an unfound parent, and a
  // surface neighbour (no caveDepth) all leave the sleeper asleep.
  {
    let floats = 0;
    const host: OccHost = {
      timeOf: () => 0, zoneLevel: () => 10, heroDist: () => 9999,
      disturbedNear: () => false, dice: (a) => a, diceInt: (a) => a, plant: () => {},
      pour: () => 0, tagCount: () => 0, announce: () => { floats++; }, rumble: () => {}, flash: () => {},
    };
    const pid = 'occ_denpar_1'; // the K1 sweep's last mint — its bundle stands
    const mkBody = (): RousedWakeBody => ({ tag: 'kiln_sleeper', dead: false, aiAwakened: false, pos: { x: 1, y: 2 } });
    const allSprung = (zid: string): number[] | undefined =>
      zid === pid ? mintedOccurrencesOf(pid).map(() => 1) : undefined;
    const den = { id: 'probe_den_unit', caveDepth: 1, exits: [{ to: pid }] };
    const b1 = mkBody();
    const woke = wakeRousedResidents(host, den, [], allSprung, [b1]);
    const b2 = mkBody();
    const wokeUnsprung = wakeRousedResidents(host, den, [], () => undefined, [b2]);
    const b3 = mkBody();
    const wokeSurface = wakeRousedResidents(host, { id: 'probe_surface_unit', exits: [{ to: pid }] }, [], allSprung, [b3]);
    const b4 = mkBody();
    const wokeLost = wakeRousedResidents(host, { id: 'probe_lost_unit', caveDepth: 1, exits: [{ to: 'probe_never_land' }] }, [], allSprung, [b4]);
    check('den resolver: the parent peek wakes the tag and floats once; unsprung / surface / unfound all sleep',
      woke === 1 && b1.aiAwakened && floats === 1
      && wokeUnsprung === 0 && !b2.aiAwakened
      && wokeSurface === 0 && !b3.aiAwakened
      && wokeLost === 0 && !b4.aiAwakened,
      `woke ${woke}, floats ${floats}`);
  }

  // J + K3/K4) the live dance — one nightfall serves every stage.
  const w2 = makeSimWorld('warrior', 4242);
  w2.player.sheet.setBase('detectability', 0);
  const zmap = (w2 as unknown as { zoneMap: Record<string, ZoneDef> }).zoneMap;
  const hop = (id: string): void => {
    w2.caveReturn = null;
    (w2 as unknown as { caveStack: unknown[] }).caveStack = [];
    w2.loadZone(id);
  };
  const J1 = 'probe_occ_wake_self';
  zmap[J1] = occZone(J1, courtRows([{ kind: 'occurrence', weight: 1, params: { id: 'probe_wake_self' } }]), 0x77a1, {
    packs: { count: [3, 3], size: [2, 2], table: [{ id: 'probe_wake_husk', weight: 1 }] },
  });
  const P2 = 'probe_occ_wake_parent';
  zmap[P2] = occZone(P2, courtRows([{ kind: 'occurrence', weight: 1, params: { id: 'probe_caldera_wake', den: 'kilnhoard' } }]), 0x77b2);
  const D2 = 'probe_occ_wake_den';
  zmap[D2] = occZone(D2, courtRows(), 0x77c3, {
    caveDepth: 1, exits: [{ to: P2, side: 's' }], objective: { kind: 'boss', id: 'urnfather' },
  });
  const D4 = 'probe_occ_wake_lost_den';
  // The unfound parent: a zone that EXISTS on the map but was never
  // generated this session — no minted bundle, no memory (the honest
  // degrade case; a dangling id would crash loadZone's portal placement
  // and can never occur under real worldgen).
  const P4 = 'probe_occ_wake_unvisited';
  zmap[P4] = occZone(P4, courtRows(), 0x77e5);
  zmap[D4] = occZone(D4, courtRows(), 0x77d4, {
    caveDepth: 1, exits: [{ to: P4, side: 's' }], objective: { kind: 'boss', id: 'urnfather' },
  });
  const husks = (): typeof w2.actors => w2.actors.filter(a => !a.dead && a.tag === 'probe_wake_sleeper');
  const wyrm = (): typeof w2.actors[number] | undefined =>
    w2.actors.find(a => !a.dead && a.tag === 'kiln_sleeper');
  const cracks = (): number => w2.doodads.filter(d => d.kind === 'abyss_crack').length;

  hop(J1);
  check('wake live: fresh ground meets the sleepers — latent until found, no retroactive nights',
    husks().length >= 1 && husks().every(a => isDormant(a)), `${husks().length} husks dormant`);
  tickSec(w2, 2);
  hop(P2);
  tickSec(w2, 2);
  hop(D2);
  check('wake live: the den before the clock — the Urnfather sleeps on his hoard',
    !!wyrm() && isDormant(wyrm()!) && !wyrm()!.aiAwakened);
  tickSec(w2, 2);
  hop(SIM_ARENA_ID);
  while (w2.time <= 0.5 * DAY_LENGTH + 2) w2.update(DT); // the absence spans nightfall
  hop(J1);
  check('wake live: THE WITNESS LAW — the boot the ground springs on still meets sleepers (the wake lands next boot)',
    husks().length >= 1 && husks().every(a => isDormant(a)) && cracks() === 0);
  tickSec(w2, 2); // frame 1 settles the absence: every armed site springs
  const j1Sites = mintedOccurrencesOf(J1).length;
  check('wake live: the away nightfall springs at arrival (every court seat, its seeded wound standing)',
    j1Sites >= 1 && cracks() === j1Sites * 2, `${cracks()} cracks over ${j1Sites} sites`);
  hop(P2); // leaves J1 (sprung now remembered); P2's own boot settles ITS absence
  tickSec(w2, 2);
  hop(J1);
  check('wake live: the return boot wakes the named sleepers — walking, no longer dormant',
    husks().length >= 1 && husks().every(a => a.aiAwakened && !isDormant(a)), `${husks().length} awake`);
  hop(D2);
  check('wake live: THE DEBUT — the parent sprang while you were below and away; the Urnfather boots AWAKE',
    !!wyrm() && wyrm()!.aiAwakened && !isDormant(wyrm()!));
  hop(D4);
  check('wake live: an unfound parent degrades to the sleeping side — never a wrongly-woken landlord',
    !!wyrm() && isDormant(wyrm()!) && !wyrm()!.aiAwakened);
}

console.log(failed ? `\n${failed} FAILURE(S)` : '\nALL PASS');
process.exit(failed ? 1 : 0);
