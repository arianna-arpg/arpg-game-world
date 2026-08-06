// ---------------------------------------------------------------------------
// ONE-OFF PROBE — THE INFECTION FABRIC (contagion Movement II), headless: THE
// STRAIN GRAMMAR (open registry, weighted seeded roll, 'mutant' RESERVED at
// weight 0 — structurally unrollable, validator-skipped; rollable strains name
// real statuses carrying the lean flags + the worn body fx), KIN-BORNE SPREAD
// (the carrier walk — infection grows only where the outbreak's sick walkers
// step, priced by walked distance, capped at maxHops, deterministic beat for
// beat; a visit births one more carrier through seedCarrierAt, capped;
// curing disbands every leg), THE EATS-PLAGUE CONSUMPTION (groundClaims —
// claimed ground refuses infection at the ONE gate incl. ignition, standing
// infection wanes off on the consumer's clock with the grip-lapse reset, the
// eaten SOURCE flips the outbreak to curing), THE ZOMBIE LEAN on a REAL world
// (the sweep takes the Plaguebound court + the fated share of breathing kin:
// strain status worn + watch rise slowed ×dullMul — imposed where none stood —
// + neverRetreats; all REVERTED BYTE-EXACT when the cure lets the marks wane
// out on the status's own duration: the watch-change revert idiom),
// ABSENT==IDENTICAL (an inert field mutates nothing; a fully-claimed world
// never ignites at chance 1), and PERSISTENCE (strain + carriers round-trip;
// a LEGACY pre-Movement-II save adopts — strain rolled, base carriers
// re-stood for a live outbreak, none for a curing one).
// Run: npx tsx balance/probe_contagion2.ts
// ---------------------------------------------------------------------------

import { bootSimEngine, makeSimWorld, SIM_ARENA_ID } from '../src/sim/arena';
import { vec } from '../src/core/math';
import { FACTIONS, MONSTERS } from '../src/data/monsters';
import type { ZoneDef } from '../src/data/zones';
import { STATUS_DEFS } from '../src/engine/status';
import { WATCH_CFG } from '../src/engine/watch';
import type { OverlayView } from '../src/world/overlay';
import { ContagionField, type ContagionSurge } from '../src/packages/overlays/contagion';
import { CONTAGION } from '../src/packages/defs/contagion';
import { rollStrain, strainByStatus, strainIds, strainOf } from '../src/packages/contagionStrains';
import { Rng } from '../src/core/rng';
import type { PackageGate } from '../src/packages/types';

let failed = 0;
const check = (name: string, ok: boolean, detail = ''): void => {
  console.log(`${ok ? 'PASS' : 'FAIL'}  ${name}${detail ? ' — ' + detail : ''}`);
  if (!ok) failed++;
};

bootSimEngine();

// --- scaffolding ---------------------------------------------------------------

const GATE = (): PackageGate => ({ active: true, share: 1, pressure: 1, ignitionMul: 1, severityMul: 1, concurrencyMul: 1 });

/** Fast probe dials — internally coherent bench numbers (the def's own are
 *  validated by RIG A's package census). igniteChance 0 by default: rigs that
 *  want ignition dial it up. initialHops 0 keeps growth purely carrier-borne. */
const mkSurge = (over: Partial<ContagionSurge> = {}): ContagionSurge => ({
  igniteChance: 0, maxConcurrent: 1, spreadInterval: 0.5, initialHops: 0,
  maxHops: 6, minIntensity: 0.12, cureInterval: 0.5, revealHops: 1,
  seedMinDist: 250, faction: 'plague', bossDefId: 'patient_zero',
  bossPromote: 'crowned', packCount: [1, 1], packSize: [1, 1],
  carriers: { base: 2, cap: 3 },
  grip: { threshold: 0.5, waneSec: 1.5 },
  infection: { sweepSec: 0.5, dullMul: 2.6, frac: [1, 1] },
  reward: { xpBase: 100, xpPerLevel: 10, gems: 1 },
  color: '#8fd24a',
  ...over,
});

const mkZone = (id: string, x: number, y: number, exits: string[]): ZoneDef => ({
  id, name: id, level: 6, biome: 'plains', map: { x, y }, size: { w: 1200, h: 900 },
  objective: { kind: 'clear' }, theme: {}, layout: [],
  exits: exits.map(to => ({ to, pos: { x: 0, y: 0 } })),
} as unknown as ZoneDef);

const mkView = (nodes: ZoneDef[], currentZoneId: string): OverlayView => ({
  nodes, byId: Object.fromEntries(nodes.map(n => [n.id, n])), allNodes: nodes,
  terrain: () => 'land', currentZoneId, time: 0, census: {}, charLevel: 20,
  gates: new Map(), visited: new Set(nodes.map(n => n.id)), surveyed: new Set<string>(),
});

// The bench line: 'a' alone sits ≥ seedMinDist from the (absent) town origin,
// so a chance-1 ignition has exactly ONE lawful source — deterministic.
//   a — b — c — d — e
const mkLine = (): ZoneDef[] => [
  mkZone('a', 300, 0, ['b']),
  mkZone('b', 90, 0, ['a', 'c']),
  mkZone('c', 60, 0, ['b', 'd']),
  mkZone('d', 30, 0, ['c', 'e']),
  mkZone('e', 10, 0, ['d']),
];

type SnapOutbreak = { sourceZoneId: string; strainId?: string; carriers: { zoneId: string; hops: number }[]; curing: boolean };
type Snap = { outbreaks: SnapOutbreak[]; infected: { zid: string; hops: number }[] };
const snap = (f: ContagionField): Snap => JSON.parse(JSON.stringify(f.snapshot())) as Snap;
const infectedIds = (f: ContagionField): string => snap(f).infected.map(z => z.zid).sort().join(',');
const hopsOf = (f: ContagionField, zid: string): number | undefined => snap(f).infected.find(z => z.zid === zid)?.hops;

/** Ignite deterministically: chance 1 on a graph where 'a' is the only
 *  lawful source, then hand back the field with ignition re-quieted (the
 *  surge object is shared by reference, so flipping it works mid-run). */
const igniteAt = (surge: ContagionSurge, view: OverlayView, seed: number): ContagionField => {
  const f = new ContagionField({ seed, gate: GATE, biomeSeed: 1 }, surge);
  surge.igniteChance = 1;
  f.update(0.5, view);
  surge.igniteChance = 0;
  return f;
};

// ------------------------------ A. THE STRAIN GRAMMAR --------------------------
{
  check('A1 the registry carries the trio (miasma, adrenal, the reserved mutant)',
    ['miasma', 'adrenal', 'mutant'].every(id => strainIds().includes(id)), strainIds().join(','));
  check('A2 mutant is RESERVED — weight 0, structurally unrollable',
    strainOf('mutant')?.weight === 0);
  const rng = new Rng(0x57a1);
  const rolls = new Set<string>();
  for (let i = 0; i < 300; i++) rolls.add(rollStrain(rng)?.id ?? 'none');
  check('A3 300 seeded rolls surface BOTH live strains and NEVER the reserved one',
    rolls.has('miasma') && rolls.has('adrenal') && !rolls.has('mutant'), [...rolls].join(','));
  const mi = STATUS_DEFS[strainOf('miasma')?.statusId ?? ''];
  const ad = STATUS_DEFS[strainOf('adrenal')?.statusId ?? ''];
  check('A4 every ROLLABLE strain names a real status; the reserved one need not',
    !!mi && !!ad && !STATUS_DEFS[strainOf('mutant')?.statusId ?? '']);
  check('A5 both strain marks carry THE PRESS (neverRetreats — the zombie lean)',
    mi?.neverRetreats === true && ad?.neverRetreats === true);
  check('A6 the adrenal alone is FICKLE (fickleSpan), and quicker on its feet',
    !!ad?.fickleSpan && !mi?.fickleSpan
    && (ad?.mods ?? []).some(m => m.stat === 'moveSpeed' && m.value > 0));
  check('A7 the miasma hits harder and moves/casts far slower (the noxious pall)',
    (mi?.mods ?? []).some(m => m.stat === 'damage' && m.value > 0)
    && (mi?.mods ?? []).some(m => m.stat === 'moveSpeed' && m.value < 0)
    && (mi?.mods ?? []).some(m => m.stat === 'castSpeed' && m.value < 0));
  check('A8 the worn look is DATA (bodyFx): fumes on the pall, bubbles on the froth',
    mi?.bodyFx?.motes === 'fume' && ad?.bodyFx?.motes === 'bubbles'
    && !!mi?.bodyFx?.glow && !!ad?.bodyFx?.glow);
  check('A9 strainByStatus reads the mark backward (the revert scan\'s lane)',
    strainByStatus(strainOf('miasma')!.statusId)?.id === 'miasma'
    && strainByStatus('burn') === undefined);
  const faults = CONTAGION.validate?.({
    faction: id => !!FACTIONS[id], monster: id => !!MONSTERS[id],
  } as Parameters<NonNullable<typeof CONTAGION.validate>>[0]) ?? [];
  check('A10 the shipped package validates clean (the weight-0 skip is not a defect)',
    faults.length === 0, faults.join('; '));
}

// ------------------------------ B. THE CARRIER WALK ----------------------------
{
  const surge = mkSurge();
  const view = mkView(mkLine(), 'a');
  const f = igniteAt(surge, view, 0xca11);
  check('B1 chance-1 ignition takes the one lawful source, base carriers stand there',
    infectedIds(f) === 'a' && snap(f).outbreaks[0]?.sourceZoneId === 'a'
    && snap(f).outbreaks[0]?.carriers.length === 2
    && snap(f).outbreaks[0]?.carriers.every(c => c.zoneId === 'a' && c.hops === 0));
  check('B2 the outbreak rolled a LIVE strain at ignition',
    ['miasma', 'adrenal'].includes(snap(f).outbreaks[0]?.strainId ?? ''),
    snap(f).outbreaks[0]?.strainId);
  for (let i = 0; i < 3; i++) f.update(0.5, view);
  check('B3 the walk is CONTIGUOUS and priced by walked distance (hops = the line index)',
    infectedIds(f).startsWith('a,b') && hopsOf(f, 'a') === 0 && hopsOf(f, 'b') === 1
    && (hopsOf(f, 'c') === undefined || hopsOf(f, 'c') === 2), infectedIds(f));
  for (let i = 0; i < 12; i++) f.update(0.5, view);
  check('B4 the whole line falls, every hop the walked distance',
    infectedIds(f) === 'a,b,c,d,e'
    && hopsOf(f, 'c') === 2 && hopsOf(f, 'd') === 3 && hopsOf(f, 'e') === 4, infectedIds(f));

  // Determinism: same seed + same drive ⇒ the identical map, beat for beat.
  const drive = (seed: number): string => {
    const s2 = mkSurge();
    const v2 = mkView(mkLine(), 'a');
    const g = igniteAt(s2, v2, seed);
    const log: string[] = [];
    for (let i = 0; i < 14; i++) {
      g.update(0.5, v2);
      log.push(`${infectedIds(g)}|${snap(g).outbreaks[0]?.carriers.map(c => `${c.zoneId}:${c.hops}`).join('.')}`);
    }
    return log.join(' ');
  };
  check('B5 same seed + same drive ⇒ identical infection AND identical carrier walk',
    drive(0xbeef) === drive(0xbeef));

  // maxHops caps the WALK: on a 5-line at maxHops 3, the far end never falls.
  const s3 = mkSurge({ maxHops: 3 });
  const v3 = mkView(mkLine(), 'a');
  const f3 = igniteAt(s3, v3, 0xca11);
  for (let i = 0; i < 20; i++) f3.update(0.5, v3);
  check('B6 maxHops caps the walked spread (e, at walked distance 4, never falls)',
    infectedIds(f3) === 'a,b,c,d', infectedIds(f3));

  // THE VISIT SEAM: seedCarrierAt births a walker, the cap refuses past it.
  check('B7 a visit births one carrier (capped): true, true, cap-refused, foreign-refused',
    f.seedCarrierAt('a') === true && snap(f).outbreaks[0]?.carriers.length === 3
    && f.seedCarrierAt('b') === false /* cap 3 */
    && f.seedCarrierAt('offmap') === false);

  // THE CONTAINMENT: curing disbands the legs; the map only SHRINKS after.
  const grew = infectedIds(f);
  check('B8 Patient Zero falls: curing, carriers DISBANDED, visits birth none',
    f.onPatientZeroSlain('a') === true && snap(f).outbreaks[0]?.curing === true
    && snap(f).outbreaks[0]?.carriers.length === 0 && f.seedCarrierAt('e') === false);
  let everGrew = false;
  let last = grew.length;
  for (let i = 0; i < 12; i++) {
    f.update(0.5, view);
    const now = infectedIds(f).length;
    if (now > last) everGrew = true;
    last = now;
  }
  check('B9 a curing outbreak only recedes (source-outward), to nothing',
    !everGrew && f.activeCount() === 0, infectedIds(f));
}

// ------------------------------ C. THE EATS-PLAGUE -----------------------------
{
  // A branching bench: the claim sits on one arm; the other stays open.
  //   a — b — c      a — d (claimed in C2)
  const zones = [
    mkZone('a', 300, 0, ['b', 'd']), mkZone('b', 90, 0, ['a', 'c']),
    mkZone('c', 60, 0, ['b']), mkZone('d', 30, 0, ['a']),
  ];
  const grips: Record<string, number> = {};
  const surge = mkSurge();
  const view = mkView(zones, 'a');
  const f = igniteAt(surge, view, 0xea75);
  f.setGripRead(zid => grips[zid] ?? 0);
  grips.d = 1;
  for (let i = 0; i < 12; i++) f.update(0.5, view);
  check('C1 SPREAD REFUSAL: the claimed arm never falls; the open arm falls whole',
    infectedIds(f) === 'a,b,c', infectedIds(f));

  // STANDING WANE: claim c AFTER it fell — waneSec 1.5 at dt 0.5 = 3 beats.
  grips.c = 1;
  f.update(0.5, view); f.update(0.5, view);
  check('C2 (mid-meal) two beats in, the claimed zone still stands', infectedIds(f) === 'a,b,c');
  // THE LAPSE RESET: the grip lets go for a beat — the bite starts over.
  grips.c = 0;
  f.update(0.5, view);
  grips.c = 1;
  f.update(0.5, view); f.update(0.5, view);
  check('C3 a lapsed grip resets the meal (two fresh beats do not finish it)',
    infectedIds(f) === 'a,b,c');
  f.update(0.5, view);
  check('C4 STANDING WANE: the third fresh beat eats the claimed zone off the map',
    infectedIds(f) === 'a,b', infectedIds(f));

  // THE EATEN SOURCE: claim a — the outbreak flips to curing, legless.
  grips.a = 1;
  for (let i = 0; i < 3; i++) f.update(0.5, view);
  const so = snap(f).outbreaks[0];
  check('C5 the SOURCE eaten flips the outbreak to curing, carriers disbanded',
    !!so && so.curing === true && so.carriers.length === 0 && !infectedIds(f).includes('a'),
    infectedIds(f));
  for (let i = 0; i < 10; i++) f.update(0.5, view);
  check('C6 …and the heartless plague recedes to nothing', f.activeCount() === 0);

  // IGNITION REFUSAL: a fully-claimed world never catches, at chance 1.
  const grips2: Record<string, number> = { a: 1, b: 1, c: 1, d: 1 };
  const s2 = mkSurge({ igniteChance: 1 });
  const v2 = mkView(zones.map(z => mkZone(z.id, z.map.x, z.map.y, z.exits.map(e => e.to))), 'a');
  const f2 = new ContagionField({ seed: 0xea76, gate: GATE, biomeSeed: 1 }, s2);
  f2.setGripRead(zid => grips2[zid] ?? 0);
  for (let i = 0; i < 8; i++) f2.update(0.5, v2);
  check('C7 IGNITION REFUSAL: claimed ground never catches (chance 1, 8 beats)',
    f2.activeCount() === 0);
  delete grips2.a;
  f2.update(0.5, v2);
  check('C8 …and the moment a zone is free, the same field catches there',
    f2.activeCount() === 1 && infectedIds(f2) === 'a');
}

// ---------------- D. THE REAL WORLD — the lean applied + reverted ---------------
{
  const w = makeSimWorld('warrior', 0x1f3c);
  const arena = w.zoneMap[SIM_ARENA_ID];
  const prevObjective = arena.objective;
  arena.objective = { kind: 'clear' }; // wake the quiet floor (restored below)
  const surge = mkSurge({ seedMinDist: 0 });
  const f = new ContagionField({ seed: 0xd15e, gate: GATE, biomeSeed: 1 }, surge);
  (w.sim as unknown as { contagionField: ContagionField | null }).contagionField = f;
  const fv = mkView([mkZone(SIM_ARENA_ID, 300, 0, [])], SIM_ARENA_ID);
  const stepBoth = (dt: number, n: number): void => {
    for (let i = 0; i < n; i++) { w.update(dt); f.update(dt, fv); }
  };

  // The cast: one Plaguebound kin + one breathing native + one authored
  // watcher — all parked far from the hero (no combat crosses the rig).
  const far = (i: number) => w.clampPos(vec(2000 + i * 60, 2000), 20);
  const kin = w.createMonster('plague_carrier', 6, 'enemy');
  kin.faction = 'plague'; kin.tag = 'contagion'; kin.pos = far(0);
  w.actors.push(kin);
  const nativeId = Object.keys(MONSTERS).find(id => {
    const d = MONSTERS[id];
    if (!d || d.watch || d.parts || d.lite || d.plies) return false;
    const c = w.createMonster(id, 6, 'enemy');
    return c.breathes && !c.passive;
  });
  // The watcher must BREATHE too — the plague takes the LIVING, so a bone
  // sentry (skeleton_archer) is exempt by the material-nature law itself.
  const watcherId = Object.keys(MONSTERS).find(id => {
    const d = MONSTERS[id];
    if (!d?.watch || d.parts) return false;
    const c = w.createMonster(id, 6, 'enemy');
    return c.breathes && !c.passive;
  });
  check('D1 (setup) the bestiary yields a breathing native and a BREATHING authored watcher',
    !!nativeId && !!watcherId, `native ${nativeId} watcher ${watcherId}`);
  const native = w.createMonster(nativeId!, 6, 'enemy');
  native.pos = far(1);
  w.actors.push(native);
  const watcher = w.createMonster(watcherId!, 6, 'enemy');
  watcher.pos = far(2);
  w.actors.push(watcher);
  const priorNativeWatch = native.watch;   // undefined — no authored ladder
  const priorWatcherWatch = watcher.watch; // the def's own spec, by reference

  // ABSENT == IDENTICAL first: an inert field (no outbreak) mutates nothing.
  stepBoth(0.5, 6);
  check('D2 ABSENT==IDENTICAL: no outbreak ⇒ no marks, no leans, watches untouched',
    !w.actors.some(a => a.statuses.some(s => !!strainByStatus(s.id)))
    && native.watch === priorNativeWatch && watcher.watch === priorWatcherWatch);

  // The outbreak lands on the standing zone: the sweep takes the population.
  check('D3 (setup) devIgnite takes the proving ground', f.devIgnite(fv, SIM_ARENA_ID));
  const strain = strainOf(f.contagionOn(SIM_ARENA_ID)?.strain);
  check('D4 the outbreak wears a live strain and is not curing',
    !!strain && f.contagionOn(SIM_ARENA_ID)?.curing === false, strain?.id);
  stepBoth(0.5, 4);
  const worn = (a: typeof kin): boolean => a.statuses.some(s => s.id === strain!.statusId);
  check('D5 the sweep takes the court AND the fated native (frac 1) — marks worn',
    worn(kin) && worn(native));
  check('D6 THE ZOMBIE LEAN, watch half: a ladder IMPOSED where none stood, at the slowed rise',
    !!native.watch
    && Math.abs((native.watch?.riseSec ?? 0) - WATCH_CFG.riseSec * surge.infection.dullMul) < 1e-9);
  const wBase = priorWatcherWatch?.riseSec ?? WATCH_CFG.riseSec;
  check('D7 …and an AUTHORED ladder keeps its shape with its rise slowed ×dullMul',
    !!watcher.watch && worn(watcher)
    && Math.abs((watcher.watch?.riseSec ?? 0) - wBase * surge.infection.dullMul) < 1e-9);
  check('D8 THE PRESS holds while the mark is worn (retreat refused at the gate)',
    kin.neverRetreats() && native.neverRetreats());
  check('D9 the FICKLE window rides the adrenal mark alone',
    (strain!.id === 'adrenal') === (native.fickleSpan() !== undefined));

  // THE CURE: the source falls — no refresh, the marks wane out on their own
  // duration, and the revert pass restores every watch byte-exact.
  check('D10 (setup) Patient Zero falls — the outbreak cures', f.onPatientZeroSlain(SIM_ARENA_ID));
  const dur = STATUS_DEFS[strain!.statusId]?.duration ?? 12;
  stepBoth(0.5, Math.ceil((dur + 3) / 0.5));
  check('D11 THE BODY WANE: past the status duration, every mark is gone',
    !worn(kin) && !worn(native) && !worn(watcher));
  check('D12 THE REVERT, byte-exact: the imposed ladder lifts to nothing, the authored one returns BY REFERENCE',
    native.watch === priorNativeWatch && watcher.watch === priorWatcherWatch);
  check('D13 …and the press lifts with the mark', !kin.neverRetreats() && !native.neverRetreats());
  arena.objective = prevObjective;
}

// ------------------------------ E. PERSISTENCE ---------------------------------
{
  const surge = mkSurge();
  const view = mkView(mkLine(), 'a');
  const f = igniteAt(surge, view, 0x5eed);
  for (let i = 0; i < 5; i++) f.update(0.5, view);
  f.seedCarrierAt('b');
  const s1 = snap(f);
  const f2 = new ContagionField({ seed: 0x5eed, gate: GATE, biomeSeed: 1 }, mkSurge());
  f2.restore(JSON.parse(JSON.stringify(f.snapshot())));
  const s2 = snap(f2);
  check('E1 v2 round-trip: infection, strain and every carrier survive byte-stable',
    JSON.stringify(s2.infected.map(z => `${z.zid}:${z.hops}`).sort())
      === JSON.stringify(s1.infected.map(z => `${z.zid}:${z.hops}`).sort())
    && s2.outbreaks[0]?.strainId === s1.outbreaks[0]?.strainId
    && JSON.stringify(s2.outbreaks[0]?.carriers) === JSON.stringify(s1.outbreaks[0]?.carriers));

  // THE LEGACY ADOPTION: a pre-Movement-II save has neither strain nor
  // carriers — a LIVE outbreak re-stands its base walkers at the source and
  // rolls a face; a CURING one stays legless (the containment survives).
  const legacy = {
    outbreaks: [
      { id: 'contagion_0', sourceZoneId: 'a', spreadAcc: 0, seen: false, revealed: ['a'], curing: false, cureAcc: 0, curedThrough: -1, dead: false },
      { id: 'contagion_1', sourceZoneId: 'e', spreadAcc: 0, seen: true, revealed: ['e'], curing: true, cureAcc: 0, curedThrough: -1, dead: false },
    ],
    infected: [
      { zid: 'a', runId: 'contagion_0', hops: 0, intensity: 1 },
      { zid: 'b', runId: 'contagion_0', hops: 1, intensity: 0.9 },
      { zid: 'e', runId: 'contagion_1', hops: 0, intensity: 1 },
    ],
    seq: 2,
  };
  const f3 = new ContagionField({ seed: 0x1e9a, gate: GATE, biomeSeed: 1 }, mkSurge());
  f3.restore(legacy);
  const s3 = snap(f3);
  const live = s3.outbreaks.find(o => o.sourceZoneId === 'a');
  const curing = s3.outbreaks.find(o => o.sourceZoneId === 'e');
  check('E2 legacy live outbreak: base carriers re-stood at the source, a strain rolled',
    live?.carriers.length === 2 && live.carriers.every(c => c.zoneId === 'a' && c.hops === 0)
    && ['miasma', 'adrenal'].includes(live?.strainId ?? ''));
  check('E3 legacy curing outbreak: adopted LEGLESS (the containment survives the trip)',
    curing?.carriers.length === 0 && curing?.curing === true);
  check('E4 the legacy infection map itself resumes whole',
    infectedIds(f3) === 'a,b,e', infectedIds(f3));
}

console.log(failed ? `\n${failed} CHECK(S) FAILED` : '\nALL CHECKS PASSED');
process.exit(failed ? 1 : 0);
