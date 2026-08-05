// ---------------------------------------------------------------------------
// ONE-OFF PROBE — THE OBJECTIVE FABRIC's new laws end to end on the real
// engine (docs/engine/objectives.md):
//   - THE CENSUS: every new kind (leyline / rifts / pyres / unearth) carries
//     its SEALS / READS / CHEST rows, its fixture visuals, its transit row,
//     a sane contest spec, and at least one tileset weight row (the biome
//     attachment is real, not aspirational),
//   - THE WAYPOINT FORCE: a 'leyline' mint carries a waypoint BY
//     CONSTRUCTION; vetoed ground (an exclusion disc) degrades to 'clear',
//   - THE CONTEST LAW (driveHoldFixtures): a presser inside the ring STALLS
//     the charge, a crowd DRAINS it (attended or not), cleared ground
//     resumes, and the stamped view speaks the same frame the drive tested,
//   - THE RECON CAP: the finished spire reveals exactly `revealCount` new
//     nodes from the pulse — picked stubs unveil + survey, unpicked stubs
//     keep their veil (the whole-disc dump is dead),
//   - THE OPERATION'S PRESSURE: banked charge bleeds reinforcements onto
//     the rim, capped, tagged 'spire_drawn',
//   - THE BESIEGED WAYPOINT: the siphon stands posted + named, the brush
//     REFUSES while it lives (one predicate), the kill frees the stone, the
//     brush then attunes, and travelToWaypoint reaches the freed zone,
//   - THE POUR: open rifts birth bounded 'rift_born' groups; sealed tears
//     pour nothing; seals ride Zone Memory (sealed stays sealed),
//   - PYRES: the lit kind is a REGISTERED lightwell (the payoff is real
//     light); UNEARTH: opened mounds stand as dug faces and complete,
//   - THE OVERRIDES: ObjectiveTuning.contest false waives the law; a
//     partial re-dials it (drainAt 2 drains at 2),
//   - THE ADOPTIVE LANE (kind 'lair'): adoption, never dependency — a bare
//     rolled cull MAY re-negotiate into a claim the mint actually stood up
//     (den door / apex kin), never forces a spawn, never binds on absent
//     features (weight 0 structurally), deterministic per zone, sovereign
//     to authored asks, both classes completing through standing machinery
//     (derived pocket id / pure population),
//   - THE PACKAGE CLASS (kind 'package' — registerPackageAsk, RIG U): a
//     roving content-package presence (the fracture debut) adopts the same
//     way — origin seats only (the bounce is sovereign), per-guest coins,
//     THE SURVIVE CONTRACT (engage + live to the run's end; success or fail
//     both bank, a dead player banks nothing), THE HAND-BACK (a guest gone
//     unanswered reverts the ask to the bare cull), and the package's own
//     spawn/divert life byte-untouched by the ask banking.
//   - THE PUZZLE CLASS (the STANDING kind 'puzzle' via registerPuzzleAsk,
//     RIG V — the exhumation debut, ruled 2026-08-04): standing riddle
//     ground adopts LAST (lair → package → puzzle); candidacy needs the
//     row's door in the layout AND the preset in the zone's own puzzles
//     rows (the no-conjure law); per-tileset dials in ADOPT_CFG land the
//     ratified effective rates; the stamp is the standing kind with THE
//     ring pinned — zero new driver code, the dig E2E lives kit-side in
//     probe_lonecrypt G.
//   - THE VENTURE CLASS (kind 'venture' — registerVentureAsk, RIG W; THE
//     FAIL ARM, Arianna's ruling 2026-08-04): a standing winnable-or-LOSABLE
//     feature adopts between guest and riddle (lair → package → venture →
//     puzzle — the more patient, the later); completion ONLY through the
//     fabric's own verbs (the holdfast debut: the toll paid, or the
//     slaughter gamble bursting the gate — the fabric's verdict is the one
//     truth), and an explicit player-authored FAIL (the wardens murdered,
//     the gate held) hands the ask back to the bare cull IN-VISIT — no
//     completion, no punishment, the zone completable the ordinary way; a
//     failed gate never re-offers (THE STANDING CONTRACT).
// Run: npx tsx balance/probe_objectives.ts
// ---------------------------------------------------------------------------

import { bootSimEngine, makeSimWorld } from '../src/sim/arena';
import { withSeededRandom } from '../src/core/rng';
import { updateAI } from '../src/engine/ai';
import { vec } from '../src/core/math';
import type { Actor } from '../src/engine/actor';
import {
  OBJECTIVE_SEALS, OBJECTIVE_READS, objectiveEarnsChest, objectiveRead, objectiveSeals,
  type ObjectiveSpec, type ZoneDef,
} from '../src/data/zones';
import { TILESETS } from '../src/data/tilesets';
import { DOODAD_VISUALS } from '../src/data/doodadVisuals';
import { lightwellOf } from '../src/engine/lightwells';
import { transitDwell, transitOf } from '../src/data/transit';
import { placeZoneAt } from '../src/engine/worldgen';
import {
  CONTEST_CFG, PRESSURE_RAMP, adoptDenMouthKinds, adoptHuntRows,
  maybeAdoptObjective, packageAskRow, pressureRampAt, pressureRampCadence,
  ADOPT_CFG, puzzleAskRows, registerPackageAsk, registerVentureAsk, ventureAskRows,
  type ContestRecoupSpec,
} from '../src/data/objectives';
import { PUZZLES } from '../src/data/puzzles'; // RIG V: puzzleAskRows census pins the preset is real
import { BEACON_CFG } from '../src/data/beacons';
import { RIFT_CFG } from '../src/data/rifts';
import { PYRE_CFG } from '../src/data/pyres';
import { DIG_CFG } from '../src/data/digsites';

let fails = 0;
const check = (name: string, ok: boolean, detail = ''): void => {
  console.log(`${ok ? 'PASS' : 'FAIL'}  ${name}${detail ? ' — ' + detail : ''}`);
  if (!ok) fails++;
};

const NEW_KINDS = ['leyline', 'rifts', 'pyres', 'unearth'] as const;

// --- RIG A: the census -----------------------------------------------------
{
  for (const k of NEW_KINDS) {
    check(`A1 '${k}' seals row is authored OPEN (the ground is the commitment)`,
      OBJECTIVE_SEALS[k] === false);
    const read = OBJECTIVE_READS[k];
    check(`A2 '${k}' map read stands`, !!read && read.glyph.length > 0 && read.read.length > 4);
    check(`A3 '${k}' banks the objective chest`,
      objectiveEarnsChest({ kind: k } as ObjectiveSpec));
    check(`A4 '${k}' rides at least one tileset weight row (biome attachment)`,
      Object.values(TILESETS).some(t => t.objectives.some(o => o.kind === k)));
  }
  check('A5 boss still seals; an authored override still wins',
    objectiveSeals({ kind: 'boss', id: 'zombie' }) === true
    && objectiveSeals({ kind: 'boss', id: 'zombie', seal: false }) === false
    && objectiveSeals({ kind: 'rifts', seal: true }) === true);
  for (const kind of [RIFT_CFG.kind, RIFT_CFG.kindSealed, PYRE_CFG.kind, PYRE_CFG.kindLit, DIG_CFG.kind, DIG_CFG.kindDug]) {
    check(`A6 fixture visual '${kind}' authored`, !!DOODAD_VISUALS[kind]);
  }
  check('A7 the lit pyre IS a lightwell (registered row + drawn glow)',
    (lightwellOf(PYRE_CFG.kindLit)?.feed ?? 0) > 0 && !!DOODAD_VISUALS[PYRE_CFG.kindLit].light);
  for (const [kind, sec] of [['rift', RIFT_CFG.sealSec], ['pyre', PYRE_CFG.kindleSec], ['digsite', DIG_CFG.digSec]] as const) {
    check(`A8 transit row '${kind}' carries the dwell + a drawn ring`,
      transitDwell(kind, -1) === sec && !!transitOf(kind)?.ring);
  }
  for (const [label, c] of [['beacon', BEACON_CFG.contest], ['rifts', RIFT_CFG.contest], ['pyres', PYRE_CFG.contest], ['digs', DIG_CFG.contest]] as const) {
    check(`A9 '${label}' contest spec sane (stall ≤ drain, drains > 0)`,
      c.radius > 0 && c.stallAt >= 1 && c.drainAt >= c.stallAt && c.drainPerSec > 0);
  }
  check('A10 the shared default is the spread base', CONTEST_CFG.stallAt === 1 && CONTEST_CFG.drainAt > 1);
  check('A11 the recon cap is authored small (the whole-disc dump is dead)',
    BEACON_CFG.revealCount >= 1 && BEACON_CFG.revealCount <= 20, `${BEACON_CFG.revealCount}`);
  const R = BEACON_CFG.reinforce;
  check('A12 the reinforce dials cohere (band ordered, cap > 0, mix in [0,1])',
    R.every[0] <= R.every[1] && R.batch[0] <= R.batch[1] && R.cap > 0
    && R.mixChance >= 0 && R.mixChance <= 1 && R.radius[0] <= R.radius[1]);
  const kinds = new Set<string>([...Object.keys(OBJECTIVE_SEALS), 'circuit']);
  const bad = Object.values(TILESETS).flatMap(t => t.objectives.filter(o => !kinds.has(o.kind)).map(o => `${t.id}:${o.kind}`));
  check('A13 every tileset weight row names a real kind', bad.length === 0, bad.join(','));
}

// --- Boot the real engine --------------------------------------------------
bootSimEngine();
// THE SEEDED SPAN (the flake-healing recipe — 2026-08-01; probe_radiance
// carries the class autopsy). Every rig below runs the REAL web: each
// devMintTileset mint charts its halo (eagerChartNeighbors + chartWithin),
// and that surrounding country rolls Math.random — rollSeed per halo mint,
// AI/weather draws every stepped tick. The old file-top seedGlobalRandom
// pinned the die process-wide but chained every rig onto ONE stream, so
// any upstream draw-count change (an engine fabric rolling one more die
// per mint, an edit to an earlier rig) re-rolled every rig below it. The
// span makes the whole world half a pure function of its own seed and
// hands the true die back at the close (THE OFF-STREAM LAW, core/rng.ts).
// The roster's 07-26 thin-tail sighting predates the governor pin
// (bd45bea); the 2026-08-01 pre-span census measured 18/18 strict greens
// with byte-identical check lines — this span closes the residual
// STRUCTURAL exposure, not a live rate. Every assertion is unchanged.
withSeededRandom(0x0bec7a, () => {
  const world = makeSimWorld('warrior', 771003);
  /* eslint-disable @typescript-eslint/no-explicit-any */
  const w = world as any;
  const homeId: string = w.zone.id;
  w.player.invulnerable = true;
  const step = (secs: number): void => {
    const dt = 1 / 30;
    for (let t = 0; t < secs; t += dt) {
      for (const a of w.actors) updateAI(a, world, dt);
      w.update(dt);
    }
  };
  const leaveToHome = (): void => { w.loadZone(homeId); w.caveReturn = null; w.caveStack = []; };
  const killAllEnemies = (): void => {
    for (const a of w.actors as Actor[]) if (!a.dead && a.team === 'enemy') w.kill(a, true);
  };
  const plantFoe = (x: number, y: number): Actor => {
    const m = w.createMonster('zombie', 3, 'enemy') as Actor;
    m.pos = w.clampPos(vec(x, y), m.radius);
    w.actors.push(m);
    return m;
  };
  /** Mint a real zone through the real path, stamp the objective, and boot it
   *  FRESH. devMintTileset LOADS its mint once (the scout visit) — leaving
   *  captures that visit's Zone Memory, which would otherwise swap the
   *  stamped objective's fresh population for the scout's (the memory law
   *  working exactly as designed — this rig just wants a clean first boot). */
  const mintWith = (objective: ObjectiveSpec, seed: number, spread: number): string => {
    const zid = w.devMintTileset('grassland', spread, 3, { seed }) as string;
    leaveToHome(); // step off the scout visit (its memory captures here)…
    const def = w.zoneMap[zid] as ZoneDef;
    def.objective = objective;
    if (objective.kind === 'leyline') def.waypoint = true;
    (w.zoneMemory as Map<string, unknown>).delete(zid);          // …and forget it
    (w.completedObjectives as Set<string>).delete(zid);
    w.loadZone(zid);
    return zid;
  };

  // --- RIG B: the waypoint force (worldgen) ----------------------------------
  {
    const town = w.zoneMap[homeId] as ZoneDef;
    const def = placeZoneAt(
      { x: town.map.x - 6, y: town.map.y - 5 }, town, w.zoneMap, 9001,
      { tileset: 'forest', level: 3, objective: { kind: 'leyline' }, seed: 4242 } as any);
    check('B1 a leyline mint carries the stone BY CONSTRUCTION', def.waypoint === true
      && def.objective.kind === 'leyline');
    // The veto: an exclusion disc over the target degrades the ask, never
    // mints a siege with nothing to besiege.
    (w.zoneMap as Record<string, ZoneDef>)['probe_wp_blocker'] = {
      id: 'probe_wp_blocker', name: 'blocker', level: 1, size: 'small',
      theme: town.theme, layout: [], exits: [],
      map: { x: town.map.x - 12, y: town.map.y - 11 },
      objective: { kind: 'none' }, wpExclusionRadius: 6,
    } as unknown as ZoneDef;
    const vetoed = placeZoneAt(
      { x: town.map.x - 12, y: town.map.y - 10 }, town, w.zoneMap, 9002,
      { tileset: 'forest', level: 3, objective: { kind: 'leyline' }, seed: 4243 } as any);
    check('B2 vetoed ground degrades the roll to \'clear\' (no incoherent siege)',
      vetoed.waypoint === false && vetoed.objective.kind === 'clear');
    delete (w.zoneMap as Record<string, ZoneDef>)['probe_wp_blocker'];
  }

  // --- RIG C: the contested spire + the recon cap + the bleed ----------------
  {
    const zid = mintWith({ kind: 'beacon' }, 515151, 0);
    check('C1 the spire stands', w.spires.length === 1, `${w.spires.length}`);
    const spire = w.spires[0];
    const need = transitDwell('beacon', BEACON_CFG.chargeSec);
    killAllEnemies();
    w.spireReinforceAt = w.time + 9999; // silence the bleed for the law checks
    w.player.pos = vec(spire.pos.x + 30, spire.pos.y);
    step(1);
    const built = spire.charge;
    check('C2 held, cleared ground BUILDS', built > 0.8, built.toFixed(2));
    const z1 = plantFoe(spire.pos.x - 30, spire.pos.y);
    step(1);
    check('C3 ONE presser inside the ring STALLS the charge (pause, never reset)',
      Math.abs(spire.charge - built) < 0.05, `${built.toFixed(2)} → ${spire.charge.toFixed(2)}`);
    const v1 = w.spireView();
    check('C4 the stamped view speaks the stall (drawn == tested)',
      v1?.contested === true && v1?.draining === false
      && String(w.objectiveText()).includes('contested'));
    const crowd = [plantFoe(spire.pos.x, spire.pos.y - 40), plantFoe(spire.pos.x, spire.pos.y + 40), plantFoe(spire.pos.x + 44, spire.pos.y)];
    step(1);
    check('C5 a CROWD (drainAt+) DRAINS banked charge',
      spire.charge < built - 0.2, `${built.toFixed(2)} → ${spire.charge.toFixed(2)}`);
    check('C6 the view + HUD speak the drain',
      w.spireView()?.draining === true && String(w.objectiveText()).includes('OVERRUN'));
    for (const m of [z1, ...crowd]) w.kill(m, true);
    step(1.2);
    check('C7 cleared ground RESUMES the build', spire.charge > built + 0.6,
      `${spire.charge.toFixed(2)} vs frozen ${built.toFixed(2)}`);
    // THE BLEED: banked charge + a re-armed clock ⇒ tagged arrivals, capped.
    w.spireReinforceAt = 0;
    w.player.pos = vec(spire.pos.x + 400, spire.pos.y + 400); // step off the stone
    step(BEACON_CFG.reinforce.every[1] * 2 + 1);
    const drawn = (w.actors as Actor[]).filter(a => !a.dead && a.tag === 'spire_drawn');
    check('C8 the operation BLEEDS — reinforcements arrive, tagged, capped',
      drawn.length > 0 && drawn.length <= BEACON_CFG.reinforce.cap, `${drawn.length}`);
    // THE RECON CAP: stub a veiled country inside the pulse, finish the stand,
    // count what the flare actually named.
    killAllEnemies();
    w.spireReinforceAt = w.time + 9999;
    const zdef = w.zoneMap[zid] as ZoneDef;
    const stubs: string[] = [];
    for (let i = 0; i < 14; i++) {
      const sid = `probe_stub_${i}`;
      stubs.push(sid);
      (w.zoneMap as Record<string, ZoneDef>)[sid] = {
        id: sid, name: `Stub ${i}`, level: 3, size: 'small',
        theme: zdef.theme, layout: [], exits: [],
        map: { x: zdef.map.x + 20 + (i % 5) * 30, y: zdef.map.y - 40 + Math.floor(i / 5) * 35 },
        objective: { kind: 'clear' }, veiled: true, seed: 900 + i,
      } as unknown as ZoneDef;
    }
    const surveyedBefore = (w.surveyed as Set<string>).size;
    spire.charge = need - 0.3;
    w.player.pos = vec(spire.pos.x + 30, spire.pos.y);
    step(1.2);
    check('C9 the stand completes (kind swap + objective banked)',
      w.objectiveDone === true && spire.doodad.kind === BEACON_CFG.kindLit);
    const news = (w.surveyed as Set<string>).size - surveyedBefore;
    check('C10 THE RECON CAP — the flare names exactly revealCount new places',
      news === BEACON_CFG.revealCount, `${news} vs ${BEACON_CFG.revealCount}`);
    const stubHit = stubs.filter(s => (w.surveyed as Set<string>).has(s));
    const stubVeiled = stubs.filter(s => (w.zoneMap[s] as ZoneDef).veiled === true);
    check('C11 picked stubs unveil + survey; unpicked keep their mystery',
      stubHit.length >= news - 4 && stubHit.every(s => (w.zoneMap[s] as ZoneDef).veiled !== true)
      && stubVeiled.length >= stubs.length - BEACON_CFG.revealCount,
      `hit ${stubHit.length}, still veiled ${stubVeiled.length}`);
    for (const s of stubs) delete (w.zoneMap as Record<string, ZoneDef>)[s];
  }

  // --- RIG D: the besieged waypoint ------------------------------------------
  {
    const zid = mintWith({ kind: 'leyline' }, 626262, 1);
    check('D1 the freed stone waits dark (waypoint placed, unattuned)',
      !!w.waypointPos && !(w.discoveredWaypoints as Set<string>).has(zid));
    const siphon = (w.actors as Actor[]).find(a => !a.dead && a.tag === 'ley_siphon');
    check('D2 the siphon stands — a promoted, NAMED native, posted at its tap',
      !!siphon && (siphon.rarity ?? 'normal') !== 'normal'
      && !!siphon.name && siphon.name.includes(',') && !!siphon.aiPost,
      siphon ? `${siphon.name} (${siphon.rarity})` : 'none');
    check('D3 waypointBesieged — ONE predicate, true while the thief drinks',
      w.waypointBesieged() === true && w.leylineView()?.besieged === true);
    const wp = w.waypointPos;
    w.player.pos = vec(wp.x + 10, wp.y);
    step(0.4);
    check('D4 the brush REFUSES a severed stone (and says why)',
      !(w.discoveredWaypoints as Set<string>).has(zid)
      && (w.texts as { text: string }[]).some(t => t.text.includes('severed')));
    if (siphon) w.kill(siphon, false, w.player);
    step(0.4);
    check('D5 the kill frees the stone (objective banks, predicate lifts)',
      w.objectiveDone === true && w.waypointBesieged() === false);
    step(0.6);
    check('D6 the SAME brush now attunes', (w.discoveredWaypoints as Set<string>).has(zid));
    leaveToHome();
    const traveled = w.travelToWaypoint(zid);
    check('D7 the freed waypoint answers fast travel', traveled === true && w.zone.id === zid);
  }

  // --- RIG E: seal the rifts (the pour + the memory rider) -------------------
  {
    const zid = mintWith({ kind: 'rifts' }, 737373, 2);
    const need = transitDwell('rift', RIFT_CFG.sealSec);
    check('E1 the tears stand in the authored band',
      w.rifts.length >= RIFT_CFG.count[0] && w.rifts.length <= RIFT_CFG.count[1], `${w.rifts.length}`);
    killAllEnemies();
    w.player.pos = vec(w.zoneEntry.x, w.zoneEntry.y); // off the tears — let them pour
    step(RIFT_CFG.pour.every[1] + 2);
    const born = (w.actors as Actor[]).filter(a => !a.dead && a.tag === 'rift_born');
    check('E2 THE POUR — open tears birth their bounded trickle, tagged + capped',
      born.length > 0 && born.length <= RIFT_CFG.pour.cap, `${born.length}`);
    killAllEnemies();
    for (const r of w.rifts) r.pourAt = w.time + 9999; // silence for the seal laws
    const rift = w.rifts[0];
    w.player.pos = vec(rift.pos.x + 30, rift.pos.y);
    const foe = plantFoe(rift.pos.x - 30, rift.pos.y);
    step(1);
    check('E3 a presser stalls the seal', rift.charge < 0.05, rift.charge.toFixed(2));
    w.kill(foe, true);
    step(1.2);
    check('E4 cleared ground seals', rift.charge > 0.8, rift.charge.toFixed(2));
    for (const r of w.rifts) {
      r.charge = Math.max(r.charge, need - 0.3);
      w.player.pos = vec(r.pos.x + 24, r.pos.y);
      step(1);
    }
    check('E5 every tear sealed — faces swapped, objective banked',
      w.objectiveDone === true
      && (w.rifts as { doodad: { kind: string } }[]).every(r => r.doodad.kind === RIFT_CFG.kindSealed));
    const sealedCharges = (w.rifts as { charge: number }[]).map(r => r.charge);
    leaveToHome();
    const memo = (w.zoneMemory as Map<string, { riftCharges?: number[] }>).get(zid);
    check('E6 the seals ride Zone Memory (the spire\'s charge-array shape)',
      !!memo?.riftCharges && memo.riftCharges.length === sealedCharges.length
      && memo.riftCharges.every(c => c >= need - 0.5), memo?.riftCharges?.map(c => c.toFixed(1)).join('/') ?? 'none');
    w.loadZone(zid);
    check('E7 re-entry re-places SEALED tears (sealed stays sealed; pours stay silent)',
      w.objectiveDone === true
      && (w.doodads as { kind: string }[]).filter(d => d.kind === RIFT_CFG.kindSealed).length === sealedCharges.length
      && (w.doodads as { kind: string }[]).every(d => d.kind !== RIFT_CFG.kind));
  }

  // --- RIG F: kindle the pyres -----------------------------------------------
  {
    mintWith({ kind: 'pyres' }, 848484, 3);
    const need = transitDwell('pyre', PYRE_CFG.kindleSec);
    check('F1 the cold bowls stand in the authored band',
      w.pyres.length >= PYRE_CFG.count[0] && w.pyres.length <= PYRE_CFG.count[1], `${w.pyres.length}`);
    killAllEnemies();
    const p0 = w.pyres[0];
    w.player.pos = vec(p0.pos.x + 26, p0.pos.y);
    step(1);
    check('F2 the kindle ring rides the shared dwell-ring feed',
      (w.dwellRingsView() as { kind: string }[]).some(r => r.kind === 'pyre'));
    for (const p of w.pyres) {
      p.charge = Math.max(p.charge, need - 0.3);
      w.player.pos = vec(p.pos.x + 24, p.pos.y);
      step(1);
    }
    check('F3 every bowl burns — lit faces + the banked objective',
      w.objectiveDone === true
      && (w.pyres as { doodad: { kind: string } }[]).every(p => p.doodad.kind === PYRE_CFG.kindLit));
    check('F4 the lit face is a REAL residence light (the fabric reads doodad kinds)',
      (lightwellOf(PYRE_CFG.kindLit)?.feed ?? 0) === PYRE_CFG.feed);
  }

  // --- RIG G: unearth the caches ---------------------------------------------
  {
    mintWith({ kind: 'unearth' }, 959595, 4);
    const need = transitDwell('digsite', DIG_CFG.digSec);
    check('G1 the mounds stand in the authored band',
      w.digs.length >= DIG_CFG.count[0] && w.digs.length <= DIG_CFG.count[1], `${w.digs.length}`);
    killAllEnemies();
    for (const d of w.digs) {
      d.charge = Math.max(d.charge, need - 0.3);
      w.player.pos = vec(d.pos.x + 24, d.pos.y);
      killAllEnemies(); // a sprung ambush must not stall the NEXT graveside
      step(1);
    }
    check('G2 every mound opened — dug faces + the banked objective',
      w.objectiveDone === true
      && (w.digs as { doodad: { kind: string } }[]).every(d => d.doodad.kind === DIG_CFG.kindDug));
  }

  // --- RIG H: the contest overrides ------------------------------------------
  {
    mintWith({ kind: 'beacon', contest: false }, 161616, 5);
    const spire = w.spires[0];
    killAllEnemies();
    w.spireReinforceAt = w.time + 9999;
    w.player.pos = vec(spire.pos.x + 30, spire.pos.y);
    plantFoe(spire.pos.x - 30, spire.pos.y);
    plantFoe(spire.pos.x, spire.pos.y - 40);
    plantFoe(spire.pos.x, spire.pos.y + 40);
    plantFoe(spire.pos.x + 44, spire.pos.y);
    step(1);
    check('H1 `contest: false` waives the law (an authored uncontested stand)',
      spire.charge > 0.8, spire.charge.toFixed(2));
    mintWith({ kind: 'beacon', contest: { drainAt: 2 } }, 171717, 6);
    const s2 = w.spires[0];
    killAllEnemies();
    w.spireReinforceAt = w.time + 9999;
    s2.charge = 3;
    w.player.pos = vec(s2.pos.x + 400, s2.pos.y);
    plantFoe(s2.pos.x - 30, s2.pos.y);
    plantFoe(s2.pos.x + 30, s2.pos.y);
    step(1);
    check('H2 a partial override re-dials the law (drainAt 2 drains at 2)',
      s2.charge < 3 - 0.2, s2.charge.toFixed(2));
  }

  // --- RIG I: the confine clause (the soft-lock guard's instance half) -------
  // The hoard-pocket wedge shape, arranged by hand: a SMALL 'clear' floor where
  // one body is hard-confined over ground no walker can stand on (the void-
  // angler shape — a chasm, the confine disc at its heart). Before the clause:
  // pop 4 ⇒ the cull asks 4, three are killable, the zone wedges at "1 remain".
  // Under the clause: the dweller neither feeds the derived need nor holds the
  // empty-floor read — and an ordinary body still counts and still gates.
  {
    const zid = mintWith({ kind: 'clear' }, 262626, 7);
    killAllEnemies(); // the mint population stands down — the rig owns the floor
    const far = w.farPoint(740);
    // Carve the unreachable ground the way GENERATION does: the hazard doodad
    // for the pit truth, AND — where the zone runs a walk grid — the 'chasm'
    // region cells painted into it (a runtime doodad alone never reaches a
    // baked walk grid; the field is what the confine clause honestly reads).
    w.doodads.push({ pos: vec(far.x, far.y), radius: 90, kind: 'chasm' });
    w.markDoodadsChanged();
    if (w.walk) w.walk.fillDisc(far.x, far.y, 90, 'chasm');
    const reach = [
      plantFoe(w.zoneEntry.x + 120, w.zoneEntry.y),
      plantFoe(w.zoneEntry.x + 140, w.zoneEntry.y + 60),
      plantFoe(w.zoneEntry.x + 100, w.zoneEntry.y - 70),
    ];
    const angler = plantFoe(far.x + 200, far.y);
    angler.pos = vec(far.x, far.y);     // over the pit, raw (no clamp snap)
    angler.flying = true;               // hovers its home — the pit never swallows it
    angler.habitat = { kind: 'chasm' }; // the terrain-bound sweep enforces the disc
    angler.confine = { x: far.x, y: far.y, r: 40 };
    // Re-run the load-time cull derive on the arranged floor (loadZone's own law).
    const o = (w.zoneMap[zid] as ZoneDef).objective;
    w.cull = null; w.objectiveDone = false;
    const counted = w.countedEnemies() as Actor[];
    check('I1 a body confined to unreachable ground does NOT count',
      counted.length === 3 && !counted.includes(angler), `${counted.length} counted`);
    const need = w.rollCullNeed(o, w.encRng) as number;
    check('I2 the derived need excludes it (3 reachable ⇒ ask 3, never 4)',
      need === 3, `${need}`);
    w.cull = { need, kills: 0 };
    w.kill(reach[0], true);
    w.kill(reach[1], true);
    step(0.5);
    check('I3 an ordinary unconfined body still counts and still GATES',
      w.objectiveDone === false && w.countedEnemies().length === 1
      && (w.countedEnemies() as Actor[])[0] === reach[2]);
    w.kill(reach[2], true);
    step(0.5);
    check('I4 every reachable body felled ⇒ the floor completes, the dweller still ALIVE',
      w.objectiveDone === true && !angler.dead);
  }

  // --- RIG R: THE RECOUP (contested time is not lost time) -------------------
  // The perpetual-siege answer: an ATTENDED stand banks the seconds the
  // contest stole (stall + the attended drain's losses), and cleared ground
  // repays them as a boost× sprint — never a snap. Walking away banks nothing.
  {
    const REC = CONTEST_CFG.recoup as ContestRecoupSpec;
    check('R1 the shared recoup block is authored sane (boost > 1, cap > 0, refund in [0,1])',
      !!REC && REC.boost > 1 && REC.capFrac > 0 && REC.drainRefund >= 0 && REC.drainRefund <= 1);
    for (const [label, c] of [['beacon', BEACON_CFG.contest], ['rifts', RIFT_CFG.contest], ['pyres', PYRE_CFG.contest], ['digs', DIG_CFG.contest]] as const) {
      check(`R2 '${label}' inherits the recoup spread`, !!c.recoup);
    }
    mintWith({ kind: 'beacon' }, 818181, 8);
    const spire = w.spires[0];
    const need = transitDwell('beacon', BEACON_CFG.chargeSec);
    killAllEnemies();
    w.spireReinforceAt = w.time + 9999; // silence the bleed for the law checks
    w.player.pos = vec(spire.pos.x + 30, spire.pos.y);
    step(1);
    const built = spire.charge;
    check('R3 an uncontested build banks NO debt (rate stays 1×)',
      spire.recoup === 0 && built > 0.8 && built < 1.35, `${built.toFixed(2)}, owed ${spire.recoup}`);
    const z1 = plantFoe(spire.pos.x - 30, spire.pos.y);
    step(1);
    check('R4 the STALL banks the ghost second (charge frozen, debt ≈ 1s)',
      Math.abs(spire.charge - built) < 0.05 && spire.recoup > 0.85 && spire.recoup < 1.2,
      `owed ${spire.recoup.toFixed(2)}`);
    const owedAfterStall = spire.recoup;
    const crowd = [plantFoe(spire.pos.x, spire.pos.y - 40), plantFoe(spire.pos.x, spire.pos.y + 40), plantFoe(spire.pos.x + 44, spire.pos.y)];
    const beforeDrain = spire.charge;
    step(1);
    const drained = beforeDrain - spire.charge;
    check('R5 an ATTENDED drain banks the stall + the drained share',
      drained > 0.2 && Math.abs(spire.recoup - (owedAfterStall + 1 + drained * REC.drainRefund)) < 0.12,
      `drained ${drained.toFixed(2)}, owed ${spire.recoup.toFixed(2)}`);
    const owed = spire.recoup;
    for (const m of [z1, ...crowd]) w.kill(m, true);
    const c0 = spire.charge;
    step(1);
    check('R6 cleared ground SPRINTS at boost× while the debt repays (never a snap)',
      Math.abs((spire.charge - c0) - REC.boost) < 0.15
      && Math.abs((owed - spire.recoup) - (REC.boost - 1)) < 0.12,
      `Δ ${(spire.charge - c0).toFixed(2)}/s, owed ${owed.toFixed(2)} → ${spire.recoup.toFixed(2)}`);
    check('R7 the stamped view + HUD speak the sprint (drawn == tested)',
      w.spireView()?.recouping === true && String(w.objectiveText()).includes('quickens'));
    step(Math.max(0.5, spire.recoup / (REC.boost - 1) + 0.3)); // spend the debt down
    const c1 = spire.charge;
    step(0.5);
    check('R8 the debt spent, the build settles back to 1×',
      spire.recoup < 0.01 && Math.abs((spire.charge - c1) - 0.5) < 0.1
      && w.spireView()?.recouping === false,
      `Δ ${((spire.charge - c1) / 0.5).toFixed(2)} per 0.5s, owed ${spire.recoup.toFixed(3)}`);
    // The abandonment law: an UNATTENDED smother still eats the bank and
    // banks NO debt — walking away keeps its full cost.
    killAllEnemies();
    const s2owed = spire.recoup;
    spire.charge = 5;
    w.player.pos = vec(spire.pos.x + 500, spire.pos.y + 400);
    for (let i = 0; i < 4; i++) plantFoe(spire.pos.x + 20 * i - 30, spire.pos.y + 24);
    step(1);
    check('R9 an UNATTENDED smother drains the bank but banks NO debt',
      spire.charge < 5 - 0.2 && Math.abs(spire.recoup - s2owed) < 0.01,
      `charge ${spire.charge.toFixed(2)}, owed ${spire.recoup.toFixed(2)}`);
    // The ceiling: the clamp binds at accrual — one contested tick pulls a
    // forced overshoot back to need × capFrac.
    spire.recoup = 1e9;
    w.player.pos = vec(spire.pos.x + 30, spire.pos.y);
    step(1 / 30);
    check('R10 the owed bank CAPS at need × capFrac (the ghost never laps the bar)',
      spire.recoup <= need * REC.capFrac + 0.01,
      `${spire.recoup.toFixed(1)} vs ${(need * REC.capFrac).toFixed(1)}`);
    // The zone tuning: `recoup: false` waives; a partial deep-merges over
    // the kind's own block (boost re-dialed, the rest defaulted).
    mintWith({ kind: 'beacon', contest: { recoup: false } }, 828282, 9);
    const sw = w.spires[0];
    killAllEnemies();
    w.spireReinforceAt = w.time + 9999;
    w.player.pos = vec(sw.pos.x + 30, sw.pos.y);
    plantFoe(sw.pos.x - 30, sw.pos.y);
    step(1);
    check('R11 `recoup: false` waives — a stalled stand banks nothing',
      sw.recoup === 0 && sw.charge < 0.05, `owed ${sw.recoup}, charge ${sw.charge.toFixed(2)}`);
    mintWith({ kind: 'beacon', contest: { recoup: { boost: 3 } } }, 838383, 10);
    const s3 = w.spires[0];
    killAllEnemies();
    w.spireReinforceAt = w.time + 9999;
    w.player.pos = vec(s3.pos.x + 30, s3.pos.y);
    const f3 = plantFoe(s3.pos.x - 30, s3.pos.y);
    step(1);
    w.kill(f3, true);
    const c3 = s3.charge;
    step(0.5);
    check('R12 a PARTIAL recoup override re-dials boost, defaults the rest (3× sprint)',
      Math.abs((s3.charge - c3) - 0.5 * 3) < 0.12, `Δ ${(s3.charge - c3).toFixed(2)} vs 1.50`);
  }

  // --- RIG S: THE PRESSURE RAMP (the trickle grows with the zone's level) ----
  {
    check('S1 the ramp stands at exactly 1 through the opening levels',
      pressureRampAt(1) === 1 && pressureRampAt(PRESSURE_RAMP.knots[0][0]) === 1);
    let mono = true;
    let prev = 0;
    for (let lv = 1; lv <= 70; lv++) { const m = pressureRampAt(lv); if (m < prev - 1e-9) mono = false; prev = m; }
    check('S2 the fold climbs monotonically and flattens past the last knot',
      mono && pressureRampAt(70) === PRESSURE_RAMP.knots[PRESSURE_RAMP.knots.length - 1][1]);
    check('S3 level 50 is a WAR, not a nuisance (mul ≥ 2.5); cadence takes its gentler share',
      pressureRampAt(50) >= 2.5 && pressureRampCadence(1) === 1
      && Math.abs(pressureRampCadence(3) - (1 + 2 * PRESSURE_RAMP.cadence)) < 1e-9);
    check('S4 both trickle lanes are enrolled (levelScale), spec-waivable',
      BEACON_CFG.reinforce.levelScale === true && RIFT_CFG.pour.levelScale === true);
    // LIVE: the same operation at level 50 outgrows the flat cap…
    const zid = mintWith({ kind: 'beacon' }, 848484, 11);
    (w.zoneMap[zid] as ZoneDef).level = 50; // the LIVE read (a Quickened surge's shape)
    const spire = w.spires[0];
    killAllEnemies();
    w.player.pos = vec(spire.pos.x + 420, spire.pos.y + 300);
    w.spireReinforceAt = 0;
    const scaledCap = Math.max(1, Math.round(BEACON_CFG.reinforce.cap * pressureRampAt(50)));
    let peak = 0;
    for (let i = 0; i < 30; i++) {
      spire.charge = 3; // keep the operation alive however the crowd drains
      step(1);
      peak = Math.max(peak, (w.actors as Actor[]).filter(a => !a.dead && a.tag === 'spire_drawn').length);
    }
    check('S5 the level-50 bleed OUTGROWS the flat trickle (batch + cap scale live)',
      peak > BEACON_CFG.reinforce.cap && peak <= scaledCap,
      `peak ${peak} vs flat ${BEACON_CFG.reinforce.cap} / scaled ${scaledCap}`);
    // …and the opt-out keeps the flat trickle at any level.
    const zid2 = mintWith({ kind: 'beacon', reinforce: { levelScale: false } }, 858585, 12);
    (w.zoneMap[zid2] as ZoneDef).level = 50;
    const s2 = w.spires[0];
    killAllEnemies();
    w.player.pos = vec(s2.pos.x + 420, s2.pos.y + 300);
    w.spireReinforceAt = 0;
    let peak2 = 0;
    for (let i = 0; i < 32; i++) {
      s2.charge = 3;
      step(1);
      peak2 = Math.max(peak2, (w.actors as Actor[]).filter(a => !a.dead && a.tag === 'spire_drawn').length);
    }
    check('S6 `levelScale: false` keeps the flat trickle at any level',
      peak2 > 0 && peak2 <= BEACON_CFG.reinforce.cap, `peak ${peak2}`);
  }

  // --- RIG T: THE ADOPTIVE LANE (adoption, never dependency) -----------------
  // The law: the world mints what it mints; the ask MAY adopt a standing
  // feature — never force one, never promise one that didn't stand.
  {
    // T1 the census: the adopted kind is fully wired AND structurally
    // un-rollable (no tileset weight row anywhere — weight 0 is the law).
    check('T1 \'lair\' rows: seals OPEN, read + title refinement, NO parent chest (the claim\'s own hoard pays), NO weight row',
      OBJECTIVE_SEALS.lair === false
      && OBJECTIVE_READS.lair.glyph.length > 0
      && objectiveRead({ kind: 'lair', lairId: 'wyrm_barrow', title: 'the Emberwyrm Barrow' }).read.includes('the Emberwyrm Barrow')
      && !objectiveEarnsChest({ kind: 'lair', lairId: 'x', title: 'x' })
      && !Object.values(TILESETS).some(t => t.objectives.some(ob => (ob.kind as string) === 'lair')));
    // T2 the derivations are REGISTRY-DERIVED, not hand lists: dens carry
    // their door kinds, the conditioned King's Barrow is refused (a schedule
    // is destination content), and the cairn's hunt kin derive.
    const dens = adoptDenMouthKinds();
    check('T2 den derivation: wyrm + frostmaw doors in; the conditioned barrow_door OUT',
      dens.get('wyrm_barrow_mouth') === 'wyrm_barrow'
      && dens.get('frostmaw_maw') === 'frostmaw'
      && !dens.has('barrow_door'),
      `${dens.size} den kinds`);
    const hunts = adoptHuntRows();
    const cairn = hunts.find(r => r.lairId === 'giants_cairn');
    check('T3 hunt derivation: the Giant\'s Cairn carries its resident kin',
      !!cairn && cairn.kin.includes('hill_giant'), `${hunts.length} hunt rows`);
    // T4 the pure-function laws, on synthetic ground (no rng anywhere).
    const mkDef = (over: Record<string, unknown> = {}): ZoneDef => ({
      id: 'probe_adopt', name: 'x', level: 8, size: 'small', theme: {} as never,
      layout: [], exits: [], map: { x: 0, y: 0 }, objective: { kind: 'clear' },
      seed: 1234, ...over,
    } as unknown as ZoneDef);
    const mouthLayout = { doodads: [{ pos: vec(100, 100), radius: 26, kind: 'wyrm_barrow_mouth' }], landmarkSpawns: [] };
    const bare = { doodads: [], landmarkSpawns: [] };
    let absentFired = 0;
    let withFired = 0;
    let withHeld = 0;
    for (let s = 0; s < 60; s++) {
      if (maybeAdoptObjective(mkDef({ seed: s }), bare)) absentFired++;
      const r = maybeAdoptObjective(mkDef({ seed: s }), mouthLayout);
      if (r) withFired++; else withHeld++;
    }
    check('T4 ABSENT feature ⇒ the lane NEVER binds (weight 0 structurally)',
      absentFired === 0, `${absentFired}/60`);
    check('T5 a standing door binds SOMETIMES and stands aside sometimes (CAN, never MUST)',
      withFired > 0 && withHeld > 0, `${withFired} fired / ${withHeld} held over 60 seeds`);
    check('T6 authored asks are sovereign (need/frac/all/seal/adopt:false all refuse)',
      maybeAdoptObjective(mkDef({ objective: { kind: 'clear', need: 5 } }), mouthLayout) === null
      && maybeAdoptObjective(mkDef({ objective: { kind: 'clear', frac: 0.4 } }), mouthLayout) === null
      && maybeAdoptObjective(mkDef({ objective: { kind: 'clear', all: true } }), mouthLayout) === null
      && maybeAdoptObjective(mkDef({ objective: { kind: 'clear', seal: true } }), mouthLayout) === null
      && maybeAdoptObjective(mkDef({ objective: { kind: 'clear', adopt: false } }), mouthLayout) === null
      && maybeAdoptObjective(mkDef({ objective: { kind: 'boss', id: 'zombie' } }), mouthLayout) === null);
    check('T7 `adopt: true` skips the coin yet STILL never forces a spawn',
      maybeAdoptObjective(mkDef({ objective: { kind: 'clear', adopt: true } }), mouthLayout)?.kind === 'lair'
      && maybeAdoptObjective(mkDef({ objective: { kind: 'clear', adopt: true } }), bare) === null);
    const d1 = maybeAdoptObjective(mkDef({ objective: { kind: 'clear', adopt: true } }), mouthLayout);
    const d2 = maybeAdoptObjective(mkDef({ objective: { kind: 'clear', adopt: true } }), mouthLayout);
    check('T8 the verdict is DETERMINISTIC per (id, seed) — byte-identical re-derivation',
      JSON.stringify(d1) === JSON.stringify(d2)
      && d1?.kind === 'lair' && d1.mouthKind === 'wyrm_barrow_mouth' && d1.title === 'the Emberwyrm Barrow');
    // The pack-leak guard: kin riding the zone's own table are NOT offered.
    const giantStands = { doodads: [], landmarkSpawns: [{ id: 'hill_giant', pos: vec(50, 50) }] };
    check('T9 a standing hunt claim binds; kin on the zone\'s OWN pack table refuse (no zone-wide leak)',
      maybeAdoptObjective(mkDef({ objective: { kind: 'clear', adopt: true } }), giantStands)?.kind === 'lair'
      && maybeAdoptObjective(mkDef({
        objective: { kind: 'clear', adopt: true },
        packs: { count: [1, 1], size: [1, 1], table: [{ id: 'hill_giant', weight: 1 }] },
      }), giantStands) === null);
    // T10 END TO END, DEN: a real mint whose ground stands the barrow's door.
    // `adopt: true` pins the coin (the CAN half is T5's business); the mint
    // law is mintWith's — stamp, forget the scout visit, boot fresh.
    {
      const zid = w.devMintTileset('grassland', 14, 9, { seed: 616161 }) as string;
      leaveToHome();
      const def = w.zoneMap[zid] as ZoneDef;
      def.objective = { kind: 'clear', adopt: true };
      def.landmarks = [{ landmark: 'wyrm_barrow_site', chance: 1 }];
      (w.zoneMemory as Map<string, unknown>).delete(zid);
      (w.completedObjectives as Set<string>).delete(zid);
      w.loadZone(zid);
      const o = w.zone.objective as ObjectiveSpec;
      check('T10 the loaded ground ADOPTED the standing door (kind, binding, title)',
        o.kind === 'lair' && o.mouthKind === 'wyrm_barrow_mouth' && o.lairId === 'wyrm_barrow'
        && (w.doodads as { kind: string }[]).some(d => d.kind === 'wyrm_barrow_mouth'));
      const v = w.lairAskView();
      check('T11 the stamped view: den mode, door found, unentered, not done; HUD names the claim',
        v?.mode === 'den' && v.pos !== null && v.entered === false && v.done === false
        && String(w.objectiveText()).includes('Brave the Emberwyrm Barrow'));
      check('T12 the adopted ask never seals the roads', objectiveSeals(o) === false && w.objectiveDone === false);
      // Settle the den WITHOUT walking it: the completion read is the derived
      // pocket id in completedObjectives — the gateway machinery IS the
      // persistence (zero rider fields anywhere).
      const cm = (w.caveEntrances as { kind: string; seed: number; underSpan?: string }[])
        .find(c => c.kind === 'wyrm_barrow_mouth')!;
      const denId = w.sidezoneIdFor(zid, cm.kind, cm.seed, cm.underSpan) as string;
      (w.completedObjectives as Set<string>).add(denId);
      step(0.2);
      check('T13 the den settled ⇒ the parent banks on the walk back (completedObjectives read)',
        w.objectiveDone === true && (w.completedObjectives as Set<string>).has(zid));
      // Idempotence: the stamped kind survives a re-load byte-identically
      // (not in `overrides`, so the lane never re-rolls it).
      const stamped = JSON.stringify(w.zone.objective);
      leaveToHome();
      w.loadZone(zid);
      check('T14 re-entry re-reads the SAME adopted ask (idempotent stamp) and stays done',
        JSON.stringify(w.zone.objective) === stamped && w.objectiveDone === true);
    }
    // T15 END TO END, HUNT: the cairn's giant holds the ground; population
    // state is the whole law (any death counts; the sleeper counts asleep).
    {
      const zid = w.devMintTileset('grassland', 16, 9, { seed: 626262 }) as string;
      leaveToHome();
      const def = w.zoneMap[zid] as ZoneDef;
      def.objective = { kind: 'clear', adopt: true };
      def.landmarks = [{ landmark: 'giants_cairn', chance: 1 }];
      (w.zoneMemory as Map<string, unknown>).delete(zid);
      (w.completedObjectives as Set<string>).delete(zid);
      w.loadZone(zid);
      const o = w.zone.objective as ObjectiveSpec;
      const giants = (w.actors as Actor[]).filter(a => !a.dead && a.defId === 'hill_giant');
      check('T15 the loaded ground ADOPTED the standing claim (hunt kin bound, keeper stands)',
        o.kind === 'lair' && (o.kin ?? []).includes('hill_giant') && giants.length > 0,
        `${giants.length} giants`);
      const v = w.lairAskView();
      check('T16 the hunt view counts the keepers; the HUD speaks the claim',
        v?.mode === 'hunt' && v.remain === giants.length && v.done === false
        && String(w.objectiveText()).includes('Break the claim'),
        String(w.objectiveText()));
      for (const g of giants) w.kill(g, true);
      step(0.2);
      check('T17 the last keeper falls ⇒ the claim breaks (pure population, no rider state)',
        w.objectiveDone === true && (w.completedObjectives as Set<string>).has(zid));
    }
    // T18 the live sovereignty half of T6: an authored ask on ground that
    // STANDS the door still loads exactly as authored.
    {
      const zid = w.devMintTileset('grassland', 18, 9, { seed: 636363 }) as string;
      leaveToHome();
      const def = w.zoneMap[zid] as ZoneDef;
      def.objective = { kind: 'clear', need: 4 };
      def.landmarks = [{ landmark: 'wyrm_barrow_site', chance: 1 }];
      (w.zoneMemory as Map<string, unknown>).delete(zid);
      (w.completedObjectives as Set<string>).delete(zid);
      w.loadZone(zid);
      check('T18 an authored need on door-bearing ground stays the authored cull',
        w.zone.objective.kind === 'clear'
        && (w.doodads as { kind: string }[]).some(d => d.kind === 'wyrm_barrow_mouth'));
    }
  }

  // --- RIG U: THE PACKAGE CLASS (the adopted guest — the fracture debut) -----
  // Her law (2026-08-03): packages appear AS NORMAL; a spawned guest MAY
  // simply BE the zone objective; trigger it and survive to the end of its
  // run — success or fail both bank; then the bounce onward continues as
  // normal, no longer objective-entangled. The overlay's gate is quiet in the
  // sim (no auto-ignition), so every seat below is devIgnite — the same
  // spawn verb, one-at-a-time law intact (endFracture clears the slot
  // between rigs).
  {
    const ff = w.sim.fractureField;
    check('U1 the fracture registered its ask row (registry-derived, no hand lists)',
      !!ff && packageAskRow('fractures')?.title === 'the fracture');
    const bare = { doodads: [], landmarkSpawns: [] };
    /** Mint + stage a bare-cull zone the next rig can adopt over (the mintWith
     *  law without the load — igniting must precede the adopting load). */
    const stage = (seed: number, spread: number, objective: ObjectiveSpec): string => {
      const zid = w.devMintTileset('grassland', spread, 3, { seed }) as string;
      leaveToHome();
      (w.zoneMap[zid] as ZoneDef).objective = objective;
      (w.zoneMemory as Map<string, unknown>).delete(zid);
      (w.completedObjectives as Set<string>).delete(zid);
      return zid;
    };

    // U2 nothing standing ⇒ the package tail NEVER binds, even with the coin
    // pinned open — adoption can never force a spawn.
    {
      const zid = stage(717171, 21, { kind: 'clear', adopt: true });
      w.loadZone(zid);
      check('U2 guestless ground stays the bare cull (adopt:true forces nothing)',
        w.zone.objective.kind === 'clear');
      leaveToHome();
    }

    // U3/U4 a standing ORIGIN adopts; the stamp is keyed to THE guest,
    // deterministic, and idempotent across re-entries.
    {
      const zid = stage(727272, 23, { kind: 'clear', adopt: true });
      check('U3a devIgnite seats the guest in the target zone (spawn logic untouched)',
        ff.devIgnite(w.devOverlayView(), zid) === true && ff.fractureIn(zid) !== null);
      const guestId = ff.fractureIn(zid).id as string;
      w.loadZone(zid);
      const o = w.zone.objective as ObjectiveSpec;
      check('U3b the load ADOPTED the standing guest (kind, pkg, key, title)',
        o.kind === 'package' && o.pkg === 'fractures' && o.key === guestId && o.title === 'the fracture');
      const v = w.packageAskView();
      check('U3c the stamped view: standing, unengaged, pointing at the dormant seat; the HUD speaks the trip line',
        v?.standing === true && v.engaged === false && v.pos !== null
        && String(w.objectiveText()).includes('Trip the volatile fracture'));
      check('U3d the guest ask: roads OPEN, NO parent chest, the pane names the guest',
        objectiveSeals(o) === false && !objectiveEarnsChest(o)
        && objectiveRead(o).read === 'a roving power claims this ground: the fracture');
      const stamped = JSON.stringify(o);
      leaveToHome();
      w.loadZone(zid);
      check('U4 re-entry re-reads the SAME stamp (the guest stands — idempotent, deterministic)',
        JSON.stringify(w.zone.objective) === stamped);
      leaveToHome();
      ff.endFracture();
    }

    // U5 ORIGIN SEATS ONLY: a DIVERTED surface is the bounce — sovereign by
    // her word, structurally never offered. Seat one via the overlay's own
    // verbs (the eventqa idiom: ignite far away, divert in, land the glide).
    {
      const zidFrom = stage(737373, 25, { kind: 'clear' });
      const zidTo = stage(747474, 27, { kind: 'clear', adopt: true });
      check('U5a a guest seats at its far origin', ff.devIgnite(w.devOverlayView(), zidFrom) === true);
      ff.divert(zidTo, (w.zoneMap[zidFrom] as ZoneDef).map, (w.zoneMap[zidTo] as ZoneDef).map);
      step(ff.surge().travelSeconds + 0.5); // the world drives the glide home
      const landed = ff.fractureIn(zidTo);
      check('U5b the glide landed a DIVERTED surface in the target', !!landed && landed.longerTimer === true);
      check('U5c a diverted seat is STRUCTURALLY unofferable (packageAskRow.standing reads null)',
        packageAskRow('fractures')!.standing(world, w.zoneMap[zidTo] as ZoneDef) === null);
      w.loadZone(zidTo);
      check('U5d the diverted guest never adopts — the bounce ground keeps its bare cull',
        w.zone.objective.kind === 'clear');
      leaveToHome();
      ff.endFracture();
    }

    // U6 THE PER-GUEST COIN: hashed per (zone, guest), rng-free — fires
    // sometimes, stands aside sometimes; and without the world read the lane
    // is byte-identical to its pre-package self.
    {
      const zidSeat = stage(757575, 29, { kind: 'clear' });
      check('U6a a guest seats for the coin sweep', ff.devIgnite(w.devOverlayView(), zidSeat) === true);
      const key = ff.fractureIn(zidSeat).id as string;
      const mk = (seed: number): ZoneDef => ({
        id: zidSeat, name: 'x', level: 8, size: 'small', theme: {} as never,
        layout: [], exits: [], map: { x: 0, y: 0 }, objective: { kind: 'clear' },
        seed,
      } as unknown as ZoneDef);
      let fired = 0;
      let held = 0;
      let miskeyed = 0;
      for (let s = 0; s < 60; s++) {
        const r = maybeAdoptObjective(mk(s), bare, world);
        if (!r) { held++; continue; }
        fired++;
        if (r.kind !== 'package' || r.key !== key || r.pkg !== 'fractures') miskeyed++;
      }
      check('U6b the coin: fires AND stands aside over 60 seeds (CAN, never MUST), every stamp keyed to THE guest',
        fired > 0 && held > 0 && miskeyed === 0, `${fired} fired / ${held} held`);
      check('U6c without a world read the lane is byte-identical (no guest visible to the pure half)',
        maybeAdoptObjective(mk(5), bare) === null);
      ff.endFracture();
    }

    // U7 THE FAIL ARM of the survive contract: trip it, stand clear, let the
    // clock die — "success or fail — the zone objective completes, given
    // that the player had survived".
    {
      const zid = stage(767676, 31, { kind: 'clear', adopt: true });
      check('U7a the fail-arm guest seats', ff.devIgnite(w.devOverlayView(), zid) === true);
      w.loadZone(zid);
      killAllEnemies(); // the drain drive needs no ambient AI bill (wall-clock)
      const run = w.fractureView();
      check('U7b the adopted origin materialized DORMANT (run-over is the trigger)',
        w.zone.objective.kind === 'package' && run?.phase === 'dormant');
      w.player.pos = w.clampPos(vec(run.origin.x, run.origin.y), w.player.radius);
      step(0.2);
      check('U7c the trigger took (fissure live) and the HUD flips to the survive line',
        w.fractureView()?.phase === 'fissure'
        && String(w.objectiveText()).includes('See the fracture through'));
      w.player.pos = w.clampPos(vec(run.origin.x + 900, run.origin.y + 900), w.player.radius);
      let guard = 0;
      while (w.fractureView() && guard++ < 80) step(0.5);
      step(0.2); // the driver reads the end one tick after it lands
      check('U7d the run collapsed (too slow) — and the ask BANKED anyway (her fail arm)',
        w.objectiveDone === true && (w.completedObjectives as Set<string>).has(zid), `${guard} beats`);
      check('U7e the failed chain ended at the overlay too (its own law, untouched)', ff.peek() === null);
      leaveToHome();
    }

    // U8 THE DEAD DON'T BANK: the chain ends out from under a fallen player
    // ⇒ no completion — the ask HANDS BACK to the bare cull mid-visit.
    {
      const zid = stage(787878, 33, { kind: 'clear', adopt: true });
      check('U8a the widow-maker guest seats', ff.devIgnite(w.devOverlayView(), zid) === true);
      w.loadZone(zid);
      const run = w.fractureView();
      w.player.pos = w.clampPos(vec(run.origin.x, run.origin.y), w.player.radius);
      step(0.2);
      check('U8b engaged while alive (the latch armed)', w.fractureView()?.phase === 'fissure');
      w.player.dead = true;
      ff.endFracture(); // the chain dies over the corpse (the end arms' own verb)
      // ONE driver beat, not a full update: a flag-dead solo player trips the
      // ALL-DOWN wipe terminator on a real tick (gameOver latches for good and
      // poisons every later rig's interact sweep — the trigger silently stops
      // taking). The verdict under test lives entirely in updateObjective, so
      // run exactly that seam.
      w.updateObjective(1 / 30);
      check('U8c a dead player banks NOTHING — the ask hands back to the bare cull instead',
        w.objectiveDone === false && !(w.completedObjectives as Set<string>).has(zid)
        && w.zone.objective.kind === 'clear');
      w.player.dead = false;
      check('U8d no wipe latched — the rig leaves no residue for later rigs', w.gameOver === false);
      leaveToHome();
    }

    // U9 THE SUCCESS ARM + THE SOVEREIGN BOUNCE: chase the head, cull every
    // chasm, and watch the banking leave the guest's onward life untouched.
    {
      // The bounce needs a road: give the run's zone a non-safe neighbor so
      // its own divert law has somewhere to tear (a dead end beside the safe
      // town legitimately takes the full-seal arm instead — engine law).
      const zidNext = stage(797980, 36, { kind: 'clear' });
      const zid = stage(797979, 35, { kind: 'clear', adopt: true });
      (w.zoneMap[zid] as ZoneDef).exits.push({ to: zidNext, side: 'e' });
      check('U9a the success-arm guest seats', ff.devIgnite(w.devOverlayView(), zid) === true);
      const guestId = ff.fractureIn(zid).id as string;
      w.loadZone(zid);
      killAllEnemies(); // the chase drive needs no ambient AI bill (wall-clock)
      let run = w.fractureView();
      w.player.pos = w.clampPos(vec(run.origin.x, run.origin.y), w.player.radius);
      step(0.2);
      let guard = 0;
      let sawChasm = false;
      while (w.fractureView() && guard++ < 900) {
        run = w.fractureView();
        if (run.phase === 'fissure') {
          w.player.pos = w.clampPos(vec(run.head.x, run.head.y), w.player.radius);
        } else if (run.phase === 'chasm') {
          sawChasm = true;
          for (const a of w.actors as Actor[]) if (!a.dead && a.tag === 'fracture_foe') w.kill(a, true);
        }
        step(0.2);
      }
      step(0.2); // the driver reads the end one tick later
      check('U9b the run was SEEN THROUGH (chasms culled in time) and the ask banked — the success arm',
        sawChasm && w.objectiveDone === true && (w.completedObjectives as Set<string>).has(zid),
        `${guard} beats`);
      const p = ff.peek();
      check('U9c THE BOUNCE SOVEREIGN: same guest, one hop spent by ITS OWN divert law, gliding onward',
        !!p && p.id === guestId && p.hopsRemaining === ff.surge().zoneSpan[1] - 2,
        p ? `hops ${p.hopsRemaining}` : 'chain ended instead');
      if (p) {
        step(ff.surge().travelSeconds + 0.5);
        const landed = ff.fractureIn(ff.peek()?.zoneId ?? '');
        check('U9d the diverted surface stands in the next zone — the chain continues, un-entangled',
          !!landed && landed.longerTimer === true);
        ff.endFracture();
      }
      leaveToHome();
    }

    // U10 THE RE-ARM (the package's own re-trigger law, no second lifecycle):
    // walking out mid-run tears only the zone-run; the seat survives, the ask
    // stands, and re-entry re-arms the dormant origin.
    {
      const zid = stage(808080, 37, { kind: 'clear', adopt: true });
      check('U10a the re-arm guest seats', ff.devIgnite(w.devOverlayView(), zid) === true);
      w.loadZone(zid);
      const stamped = JSON.stringify(w.zone.objective);
      const run = w.fractureView();
      w.player.pos = w.clampPos(vec(run.origin.x, run.origin.y), w.player.radius);
      step(0.2);
      check('U10b triggered (mid-run)', w.fractureView()?.phase === 'fissure');
      leaveToHome(); // walk out mid-run
      const seat = ff.fractureIn(zid);
      check('U10c the overlay seat SURVIVES the walk-out (origin, never diverted)',
        !!seat && seat.longerTimer === false);
      w.loadZone(zid);
      check('U10d re-entry: the ask STANDS (same stamp), the guest re-armed DORMANT, the latch fresh',
        JSON.stringify(w.zone.objective) === stamped
        && w.fractureView()?.phase === 'dormant'
        && w.packageAskView()?.engaged === false
        && w.objectiveDone === false);
      leaveToHome();
      ff.endFracture();
    }

    // U11 THE HAND-BACK at load: a guest that died while the player was away
    // reverts the ask — the zone is always completable, never wedged.
    // (Stage seed re-measured at the theater CAST, 2026-08-05: the cast's
    // entry seats shifted the world stream and 818181's mint re-rolled onto
    // lair-claimed ground — the resident legitimately beats the guest there,
    // which is U13's lesson, not this rig's. 818182 mints bare cull ground;
    // the whole file scanned green through its own run.)
    {
      const zid = stage(818182, 39, { kind: 'clear', adopt: true });
      check('U11a the hand-back guest seats', ff.devIgnite(w.devOverlayView(), zid) === true);
      w.loadZone(zid);
      check('U11b adopted at load', w.zone.objective.kind === 'package');
      leaveToHome();
      ff.endFracture(); // the chain dies while the player is away (idle-out, a far collapse)
      w.loadZone(zid);
      check('U11c the unanswered ask reverts to the bare cull at load (completable ground, never a wedge)',
        w.zone.objective.kind === 'clear' && w.objectiveDone === false);
      leaveToHome();
    }

    // U12 the census + sovereignty: the kind is fully wired, structurally
    // un-rollable, and authored asks refuse the guest outright.
    {
      check('U12a \'package\' census: seals OPEN, read stands, NO parent chest, NO tileset weight row anywhere',
        OBJECTIVE_SEALS.package === false
        && OBJECTIVE_READS.package.glyph.length > 0
        && !objectiveEarnsChest({ kind: 'package', pkg: 'fractures', key: 'k', title: 't' })
        && !Object.values(TILESETS).some(t => t.objectives.some(ob => (ob.kind as string) === 'package')));
      const zid = stage(828282, 41, { kind: 'clear', need: 4 });
      check('U12b a guest seats beside an authored ask', ff.devIgnite(w.devOverlayView(), zid) === true);
      w.loadZone(zid);
      check('U12c authored asks are SOVEREIGN over a standing guest (the authored cull loads untouched)',
        w.zone.objective.kind === 'clear' && (w.zone.objective as { need?: number }).need === 4);
      leaveToHome();
      ff.endFracture();
    }

    // U13 THE RESIDENT BEATS THE GUEST: where a lair candidate stands too,
    // the lair classes win the slot (byte-identical to their pre-package
    // verdicts); the package tail only takes ground they stood aside from.
    {
      const zid = stage(838383, 43, { kind: 'clear', adopt: true });
      (w.zoneMap[zid] as ZoneDef).landmarks = [{ landmark: 'wyrm_barrow_site', chance: 1 }];
      check('U13a a guest seats beside a standing den', ff.devIgnite(w.devOverlayView(), zid) === true);
      w.loadZone(zid);
      check('U13b the lair wins the slot; the guest waits its turn on other ground',
        w.zone.objective.kind === 'lair');
      leaveToHome();
      ff.endFracture();
    }
  }

  // --- RIG V: THE PUZZLE CLASS (standing riddle ground — the exhumation) -----
  // The ruling (Arianna, 2026-08-04): the graveland exhumation asks at
  // ~1-in-7 on THE ADOPTIVE LANE — registerPuzzleAsk rows, per-tileset
  // dials, the STANDING 'puzzle' kind stamped with THE ring pinned; the
  // crypt/mournstead weight-row plan is permanently DEAD (the weighted-total
  // cascade). Candidacy = the row's DOOR standing in the layout AND the
  // preset authored in the zone's own puzzles rows (the no-conjure law);
  // precedence runs LAST of the classes (lair → package → puzzle — the
  // patient dead can wait). The dig E2E + the ratified-rate arithmetic live
  // kit-side (probe_lonecrypt A/G); this rig pins the lane's own laws.
  {
    // V1 the census: the debut row is registered, sorted, and its preset is
    // a real PUZZLES entry; the ratified dials stand in (0, 1].
    const rows = puzzleAskRows();
    const debut = rows.find(r => r.id === 'grave_exhumation');
    check('V1a the exhumation row is registered (door → ring, registry-derived)',
      !!debut && debut.doodad === 'lone_crypt_door' && debut.puzzle === 'grave_exhumation',
      `${rows.length} rows`);
    check('V1b rows consult in sorted order (import-order-proof, the package law)',
      rows.every((r, i) => i === 0 || rows[i - 1].id <= r.id));
    check('V1c the pinned preset is a real PUZZLES entry',
      !!debut && !!PUZZLES[debut.puzzle]);
    const dials = ADOPT_CFG.puzzleChanceByTileset;
    check('V1d the ratified per-tileset dials stand sane (crypt + mournstead, each in (0,1])',
      dials.crypt > 0 && dials.crypt <= 1 && dials.mournstead > 0 && dials.mournstead <= 1
      && Object.values(dials).every(v => v > 0 && v <= 1),
      JSON.stringify(dials));
    // V2 candidacy is BOTH reads, on synthetic ground (pure calls, no rng).
    const mkDefV = (over: Record<string, unknown> = {}): ZoneDef => ({
      id: 'probe_puzask', name: 'x', level: 8, size: 'small', theme: {} as never,
      layout: [], exits: [], map: { x: 0, y: 0 }, objective: { kind: 'clear' },
      seed: 1234, tileset: 'crypt', puzzles: [{ id: 'grave_exhumation', chance: 1 }], ...over,
    } as unknown as ZoneDef);
    const doorLayout = { doodads: [{ pos: vec(100, 100), radius: 15, kind: 'lone_crypt_door' }], landmarkSpawns: [] };
    const bareLayout = { doodads: [], landmarkSpawns: [] };
    const adoptTrue = { kind: 'clear', adopt: true } as ObjectiveSpec;
    const vStamp = maybeAdoptObjective(mkDefV({ objective: adoptTrue }), doorLayout);
    check('V2a door + authored ring ⇒ the STANDING kind stamps, THE ring pinned',
      vStamp?.kind === 'puzzle' && (vStamp as { puzzle?: string }).puzzle === 'grave_exhumation');
    check('V2b no door ⇒ never binds (adoption can never force a spawn)',
      maybeAdoptObjective(mkDefV({ objective: adoptTrue }), bareLayout) === null);
    check('V2c THE NO-CONJURE LAW: a door whose country never authored the ring refuses',
      maybeAdoptObjective(mkDefV({ objective: adoptTrue, puzzles: [] }), doorLayout) === null
      && maybeAdoptObjective(mkDefV({ objective: adoptTrue, puzzles: [{ id: 'other_riddle', chance: 1 }] }), doorLayout) === null);
    check('V2d authored asks are sovereign (the shared gate covers the class)',
      maybeAdoptObjective(mkDefV({ objective: { kind: 'clear', need: 5 } }), doorLayout) === null
      && maybeAdoptObjective(mkDefV({ objective: { kind: 'clear', adopt: false } }), doorLayout) === null);
    // V3 determinism + the world argument is inert for this class (no guest
    // stands on synthetic ground — with/without world, byte-identical).
    const v1 = maybeAdoptObjective(mkDefV({ objective: adoptTrue }), doorLayout);
    const v2 = maybeAdoptObjective(mkDefV({ objective: adoptTrue }), doorLayout);
    const v3 = maybeAdoptObjective(mkDefV({ objective: adoptTrue }), doorLayout, world);
    check('V3 the verdict is DETERMINISTIC and world-blind for standing ground',
      JSON.stringify(v1) === JSON.stringify(v2) && JSON.stringify(v1) === JSON.stringify(v3));
    // V4 the coin rates: one hash per (zone, row), thresholds per tileset —
    // so the mournstead-fired set is EXACTLY a subset of the crypt-fired set
    // (same hash, lower dial), and an undialed country rides the default.
    let fCrypt = 0;
    let fMourn = 0;
    let fPlain = 0;
    let subset = true;
    for (let s = 0; s < 200; s++) {
      const rC = !!maybeAdoptObjective(mkDefV({ id: `probe_puzask_${s}`, seed: s }), doorLayout);
      const rM = !!maybeAdoptObjective(mkDefV({ id: `probe_puzask_${s}`, seed: s, tileset: 'mournstead' }), doorLayout);
      const rP = !!maybeAdoptObjective(mkDefV({ id: `probe_puzask_${s}`, seed: s, tileset: 'nowhere_downs' }), doorLayout);
      if (rC) fCrypt++;
      if (rM) fMourn++;
      if (rP) fPlain++;
      if (rM && !rC) subset = false;
    }
    check('V4a the crypt dial fires ≈ 0.575 of candidate culls', fCrypt >= 85 && fCrypt <= 145, `${fCrypt}/200`);
    check('V4b the mournstead dial fires ≈ 0.44, below the crypt\'s', fMourn >= 58 && fMourn <= 118 && fMourn < fCrypt, `${fMourn}/200`);
    check('V4c mournstead-fired ⊂ crypt-fired EXACTLY (one hash, two thresholds — the dial is the only difference)', subset);
    check('V4d an undialed country rides the class default', fPlain >= 70 && fPlain <= 130, `${fPlain}/200`);
    // V5 precedence: a resident claim on the same ground wins the slot.
    const bothLayout = {
      doodads: [
        { pos: vec(80, 80), radius: 26, kind: 'wyrm_barrow_mouth' },
        { pos: vec(220, 220), radius: 15, kind: 'lone_crypt_door' },
      ], landmarkSpawns: [],
    };
    check('V5 the lair beats the riddle where both stand (lair → package → puzzle)',
      maybeAdoptObjective(mkDefV({ objective: adoptTrue }), bothLayout)?.kind === 'lair');
    // V6 the guest beats the riddle too — and ground the guest leaves falls
    // through to the riddle, including off the package HAND-BACK arm.
    {
      const ff = w.sim.fractureField;
      const zid = w.devMintTileset('grassland', 45, 3, { seed: 848484 }) as string;
      leaveToHome();
      const def = w.zoneMap[zid] as ZoneDef;
      def.objective = { kind: 'clear', adopt: true };
      (def as unknown as { puzzles: { id: string; chance: number }[] }).puzzles = [{ id: 'grave_exhumation', chance: 1 }];
      (w.zoneMemory as Map<string, unknown>).delete(zid);
      (w.completedObjectives as Set<string>).delete(zid);
      check('V6a a guest seats on riddle-bearing ground', ff.devIgnite(w.devOverlayView(), zid) === true);
      const withGuest = maybeAdoptObjective(def, doorLayout, world);
      check('V6b the guest outranks the riddle (package before puzzle)',
        withGuest?.kind === 'package');
      ff.endFracture();
      const afterGuest = maybeAdoptObjective(def, doorLayout, world);
      check('V6c the ground the guest left falls to the riddle (same load chain, next class)',
        afterGuest?.kind === 'puzzle');
      // THE HAND-BACK ROAD: a stale package stamp reverts to the bare cull
      // and the SAME read then consults the riddle on its own coin — scan
      // def.seed for one coin-pass and one coin-refuse (pure hash: the scan
      // is deterministic and self-healing against upstream id drift).
      let seedFire = -1;
      let seedHold = -1;
      for (let s = 0; s < 60 && (seedFire < 0 || seedHold < 0); s++) {
        def.seed = s;
        def.objective = { kind: 'clear' };
        const r = maybeAdoptObjective(def, doorLayout, world);
        if (r?.kind === 'puzzle' && seedFire < 0) seedFire = s;
        if (r === null && seedHold < 0) seedHold = s;
      }
      check('V6d the unforced coin both fires and holds somewhere (CAN, never MUST)',
        seedFire >= 0 && seedHold >= 0, `fire@${seedFire} hold@${seedHold}`);
      def.seed = seedFire;
      def.objective = { kind: 'package', pkg: 'fractures', key: 'v6-stale' } as ObjectiveSpec;
      const handback = maybeAdoptObjective(def, doorLayout, world);
      check('V6e a stale guest stamp hands back AND the riddle takes the ground on its own coin',
        handback?.kind === 'puzzle');
      def.seed = seedHold;
      def.objective = { kind: 'package', pkg: 'fractures', key: 'v6-stale' } as ObjectiveSpec;
      const handbackBare = maybeAdoptObjective(def, doorLayout, world);
      check('V6f where the riddle\'s coin refuses, the hand-back lands the bare cull',
        handbackBare?.kind === 'clear');
      leaveToHome();
    }
    // V7 LIVE: a real graveland mint through the real stamp site — the
    // loaded zone wears the standing kind, the placer binds THE ring as the
    // objective run, and the standing kind's own chest/seal laws apply.
    // (The dig completing the driver + lifting the seal is probe_lonecrypt
    // G's business — kit-side.)
    {
      const zid = w.devMintTileset('crypt', 47, 9, { seed: 858585 }) as string;
      leaveToHome();
      const def = w.zoneMap[zid] as ZoneDef;
      def.objective = { kind: 'clear', adopt: true };
      (w.zoneMemory as Map<string, unknown>).delete(zid);
      (w.completedObjectives as Set<string>).delete(zid);
      w.loadZone(zid);
      const o = w.zone.objective as ObjectiveSpec & { puzzle?: string };
      const run = (w.puzzles as { isObjective: boolean; kind: { id: string }; done: boolean }[]).find(r => r.isObjective);
      check('V7a the real load stamps the STANDING kind with THE ring pinned',
        o.kind === 'puzzle' && o.puzzle === 'grave_exhumation');
      check('V7b the placer bound the exhumation as the objective run (isObjective)',
        !!run && run.kind.id === 'exhumation' && !run.done);
      check('V7c the standing kind\'s own laws apply (chest banks, roads open)',
        objectiveEarnsChest(o) === true && objectiveSeals(o) === false);
      const stamped = JSON.stringify(o);
      leaveToHome();
      w.loadZone(zid);
      check('V7d re-entry re-reads the SAME adopted ask (idempotent — \'puzzle\' never re-rolls)',
        JSON.stringify(w.zone.objective) === stamped);
      leaveToHome();
    }
  }

  // --- RIG W: THE VENTURE CLASS (THE FAIL ARM — the holdfast ask debut) ------
  // Her ruling (2026-08-04): "opening a Holdfast would work as a zone
  // objective, because a Holdfast can be explicitly failed if the player
  // murders the wardens. But if that occurs, and the objective actually
  // falls back to its plain cull — no completion — then we cohere the
  // entire objective a bit better and leave it up to player agency once
  // more." The lane half runs on probe-registered rows (the registry is the
  // open seam — cheap, exact, no mints); the debut half runs the REAL
  // holdfast fabric end to end: adopt → pay → complete, adopt → murder →
  // fail → hand back → cull still finishes, and the burst gamble completing
  // down the bloody road (the fabric's own verdict is the one truth).
  {
    // W1 the census: the holdfast row is registered; rows consult sorted.
    const rows = ventureAskRows();
    check('W1a the holdfast venture row is registered (registry-derived, def-blind)',
      rows.some(r => r.id === 'holdfast'), `${rows.length} rows`);
    check('W1b rows consult in sorted order (import-order-proof, the package law)',
      rows.every((r, i) => i === 0 || rows[i - 1].id <= r.id));
    check('W1c the venture kind\'s citizenship: seals OPEN, read + title composed, NO parent chest, NO weight row',
      OBJECTIVE_SEALS.venture === false
      && objectiveRead({ kind: 'venture', venture: 'holdfast', key: 'k', title: 'Roadwarden Toll' }).read.includes('Roadwarden Toll')
      && !objectiveEarnsChest({ kind: 'venture', venture: 'x', key: 'k', title: 'x' })
      && !Object.values(TILESETS).some(t => t.objectives.some(ob => (ob.kind as string) === 'venture')));

    // The probe apparatus: an armed test venture + an armed test guest —
    // the open registry IS the seam, so the lane's laws pin without a mint.
    // Both rows stand ONLY on the def id they are armed at (inert for every
    // other rig), and the venture row honors THE STANDING CONTRACT (lost ⇒
    // standing reads null).
    let ventureArmId: string | null = null;
    let ventureVerdict: 'standing' | 'won' | 'lost' = 'standing';
    registerVentureAsk({
      id: 'probe_marker',
      standing: (_wv, d) => (ventureArmId !== null && d.id === ventureArmId ? `pm:${d.id}` : null),
      title: () => 'the Probe Stand',
      view: () => ({ verdict: ventureVerdict, pos: null, label: 'Face the Probe Stand' }),
    });
    let pkgArmId: string | null = null;
    registerPackageAsk({
      pkg: 'probe_guest',
      title: 'the Probe Guest',
      standing: (_wv, d) => (pkgArmId !== null && d.id === pkgArmId ? `pg:${d.id}` : null),
      view: () => ({ standing: true, engaged: false, pos: null, label: 'Probe Guest' }),
    });
    const mkDefW = (over: Record<string, unknown> = {}): ZoneDef => ({
      id: 'probe_adoptw', name: 'x', level: 8, size: 'small', theme: {} as never,
      layout: [], exits: [], map: { x: 0, y: 0 }, objective: { kind: 'clear' },
      seed: 1234, ...over,
    } as unknown as ZoneDef);
    const bareW = { doodads: [], landmarkSpawns: [] };
    const mouthW = { doodads: [{ pos: vec(100, 100), radius: 26, kind: 'wyrm_barrow_mouth' }], landmarkSpawns: [] };
    const adoptTrueW = { kind: 'clear', adopt: true } as ObjectiveSpec;

    // W2 the coin + the stamp, on synthetic ground (pure calls, no rng).
    ventureArmId = 'probe_adoptw';
    ventureVerdict = 'standing';
    let fired = 0;
    let held = 0;
    for (let s = 0; s < 60; s++) {
      const r = maybeAdoptObjective(mkDefW({ seed: s }), bareW, world);
      if (r?.kind === 'venture') fired++; else held++;
    }
    check('W2a the unforced coin both fires and holds (CAN, never MUST)',
      fired > 0 && held > 0, `${fired} fired / ${held} held over 60 seeds`);
    check('W2b without `world` the venture tail never runs (fabric reads are world-gated)',
      maybeAdoptObjective(mkDefW({ objective: adoptTrueW }), bareW) === null);
    const s1 = maybeAdoptObjective(mkDefW({ objective: adoptTrueW }), bareW, world);
    const s2 = maybeAdoptObjective(mkDefW({ objective: adoptTrueW }), bareW, world);
    check('W2c adopt:true skips the coin; the stamp is deterministic + carries row/key/title',
      JSON.stringify(s1) === JSON.stringify(s2) && s1?.kind === 'venture'
      && s1.venture === 'probe_marker' && s1.key === 'pm:probe_adoptw' && s1.title === 'the Probe Stand');
    check('W2d authored asks are sovereign (the shared gate covers the class)',
      maybeAdoptObjective(mkDefW({ objective: { kind: 'clear', need: 5 } }), bareW, world) === null
      && maybeAdoptObjective(mkDefW({ objective: { kind: 'clear', adopt: false } }), bareW, world) === null);
    ventureArmId = null;
    check('W2e no standing venture ⇒ the lane never binds (adoption can never conjure one)',
      maybeAdoptObjective(mkDefW({ objective: adoptTrueW }), bareW, world) === null);

    // W3 precedence: lair → package → venture → puzzle, each seam proven
    // non-vacuous by disarming the winner and watching the next class take
    // the same ground.
    ventureArmId = 'probe_adoptw';
    check('W3a a resident claim beats the venture (lair first)',
      maybeAdoptObjective(mkDefW({ objective: adoptTrueW }), mouthW, world)?.kind === 'lair');
    pkgArmId = 'probe_adoptw';
    check('W3b a standing guest beats the venture (the now-or-never window)',
      maybeAdoptObjective(mkDefW({ objective: adoptTrueW }), bareW, world)?.kind === 'package');
    pkgArmId = null;
    const riddleGround = mkDefW({ objective: adoptTrueW, tileset: 'crypt', puzzles: [{ id: 'grave_exhumation', chance: 1 }] });
    const doorW = { doodads: [{ pos: vec(100, 100), radius: 15, kind: 'lone_crypt_door' }], landmarkSpawns: [] };
    check('W3c the venture beats the riddle (the gate can END; the grave keeps forever)',
      maybeAdoptObjective(riddleGround, doorW, world)?.kind === 'venture');
    ventureArmId = null;
    check('W3d …and the riddle candidacy was REAL (disarm the venture, the puzzle takes the ground)',
      maybeAdoptObjective(riddleGround, doorW, world)?.kind === 'puzzle');

    // W4 THE FAIL ARM's load half: the stamped ask re-validates its verdict.
    const stampW = { kind: 'venture', venture: 'probe_marker', key: 'pm:probe_adoptw', title: 'the Probe Stand' } as ObjectiveSpec;
    ventureArmId = 'probe_adoptw';
    ventureVerdict = 'standing';
    check('W4a a STANDING venture stamp holds at load (idempotent)',
      maybeAdoptObjective(mkDefW({ objective: stampW }), bareW, world) === null);
    ventureVerdict = 'won';
    check('W4b a WON venture stamp holds (the driver banks it; the pane keeps the name)',
      maybeAdoptObjective(mkDefW({ objective: stampW }), bareW, world) === null);
    ventureVerdict = 'lost';
    ventureArmId = null; // THE STANDING CONTRACT: a lost venture never re-offers
    check('W4c a LOST venture hands back to the bare cull at load',
      JSON.stringify(maybeAdoptObjective(mkDefW({ objective: stampW }), bareW, world)) === JSON.stringify({ kind: 'clear' }));
    check('W4d an unregistered row hands back too (the fabric left this world)',
      JSON.stringify(maybeAdoptObjective(
        mkDefW({ objective: { kind: 'venture', venture: 'no_such_row', key: 'x', title: 'X' } as ObjectiveSpec }),
        bareW, world)) === JSON.stringify({ kind: 'clear' }));
    // The hand-back FALLS THROUGH: ground a lost venture leaves may adopt a
    // standing resident on the lair class's own natural coin — scan seeds
    // for one fire and one hold (the V6d idiom: pure hash, self-healing).
    {
      let seedFire = -1;
      let seedHold = -1;
      for (let s = 0; s < 60 && (seedFire < 0 || seedHold < 0); s++) {
        const r = maybeAdoptObjective(mkDefW({ seed: s, objective: stampW }), mouthW, world);
        if (r?.kind === 'lair' && seedFire < 0) seedFire = s;
        if (r?.kind === 'clear' && seedHold < 0) seedHold = s;
      }
      check('W4e the hand-back falls through to the next standing class on its own coin (fire + hold both seen)',
        seedFire >= 0 && seedHold >= 0, `lair@${seedFire} cull@${seedHold}`);
    }
    ventureVerdict = 'standing';

    // W5 THE DEBUT, live: a real grassland mint + the real gate — adoption
    // binds the fabric's own ledger (key, name, view, chevron anchor).
    const hf = w.sim.holdfastField;
    check('W5a the sim world carries the holdfast overlay (the ledger is live; the gate stays quiet)', !!hf);
    if (hf) {
      const zid = w.devMintTileset('grassland', 50, 3, { seed: 909090 }) as string;
      const forced = w.devForceHoldfast() as boolean;
      const info = hf.infoFor(zid);
      const gdef = info ? hf.def(info.defId) : undefined;
      check('W5b the forced gate stands sealed with its exit appended',
        forced === true && !!info && !!gdef && info.locked && info.resolved === 'sealed' && info.exitAppended);
      leaveToHome();
      const def = w.zoneMap[zid] as ZoneDef;
      def.objective = { kind: 'clear', adopt: true };
      def.landmarks = []; // no resident claims — the precedence half is W3's business
      (w.zoneMemory as Map<string, unknown>).delete(zid);
      (w.completedObjectives as Set<string>).delete(zid);
      w.loadZone(zid);
      const o = w.zone.objective as ObjectiveSpec;
      check('W5c the load adopted the holdfast (kind, row, the exact gate\'s key, the guardian\'s own name)',
        o.kind === 'venture' && o.venture === 'holdfast'
        && o.key === `${info!.lockId}:${info!.defId}` && o.title === gdef!.name);
      const v = w.ventureAskView();
      check('W5d the stamped view: standing, anchored at the gate, the HUD asks the toll',
        v?.verdict === 'standing' && v.pos !== null
        && String(w.objectiveText()).startsWith(`Open ${gdef!.name}`));
      check('W5e the adopted ask never seals and stakes no parent chest',
        objectiveSeals(o) === false && objectiveEarnsChest(o) === false && w.objectiveDone === false);
      const hrow = ventureAskRows().find(r => r.id === 'holdfast')!;
      check('W5f a stale binding reads LOST (hand back, never rebind)',
        hrow.view(world, w.zone, 'not:the:key').verdict === 'lost');

      // W6 THE WIN ARM: pay the toll — the fabric resolves OPEN and the ask
      // completes through the fabric's own verb (no parallel ledger).
      world.grantEssence(world.localSeat, { essence: 'coarse', count: 500 });
      const keeper = (w.actors as Actor[]).find(a => a.id === w.holdfastSite?.keeperId);
      check('W6a the wardens mustered (the parley stands)', !!keeper);
      if (keeper) { w.player.pos.x = keeper.pos.x + 20; w.player.pos.y = keeper.pos.y; }
      const paid = world.payHoldfastToll(-1);
      step(0.2);
      check('W6b the toll pays ⇒ resolved OPEN ⇒ THE ASK COMPLETES (drawn == tested)',
        paid === true && info!.resolved === 'open' && w.objectiveDone === true
        && (w.completedObjectives as Set<string>).has(zid));
      const stamped = JSON.stringify(w.zone.objective);
      leaveToHome();
      w.loadZone(zid);
      check('W6c re-entry: the WON stamp holds byte-identically and stays done',
        JSON.stringify(w.zone.objective) === stamped && w.objectiveDone === true);
      leaveToHome();
    }

    // W7 THE FAIL ARM, live: murder the wardens, the gamble pinned SHUT —
    // the fabric rules 'failed', the ask hands back IN-VISIT, the cull still
    // finishes the zone, and the failed gate never re-offers.
    if (hf) {
      const zid = w.devMintTileset('grassland', 52, 3, { seed: 919191 }) as string;
      const forced = w.devForceHoldfast() as boolean;
      const info = hf.infoFor(zid);
      const gdef = info ? hf.def(info.defId) : undefined;
      check('W7a a second gate stands for the slaughter road', forced === true && !!info && !!gdef);
      leaveToHome();
      const def = w.zoneMap[zid] as ZoneDef;
      def.objective = { kind: 'clear', adopt: true };
      def.landmarks = [];
      (w.zoneMemory as Map<string, unknown>).delete(zid);
      (w.completedObjectives as Set<string>).delete(zid);
      w.loadZone(zid);
      check('W7b the ask adopted the second gate', (w.zone.objective as ObjectiveSpec).kind === 'venture');
      const savedChance = gdef!.slaughterOpensChance;
      gdef!.slaughterOpensChance = 0; // chance(0) is exact — the gamble cannot burst
      try {
        for (const id of (w.holdfastSite?.banditIds ?? []) as number[]) {
          const a = w.actorById(id) as Actor | null;
          if (a && !a.dead) w.kill(a, true);
        }
        step(0.3);
      } finally {
        gdef!.slaughterOpensChance = savedChance;
      }
      check('W7c the fabric ruled the slaughter FAILED (sealed for the run, terminal)',
        info!.resolved === 'failed');
      check('W7d THE FAIL ARM: the ask handed back to the bare cull IN-VISIT — no completion, no punishment',
        (w.zone.objective as ObjectiveSpec).kind === 'clear' && w.objectiveDone === false
        && !(w.completedObjectives as Set<string>).has(zid));
      killAllEnemies();
      step(0.2);
      check('W7e the zone still completes the ordinary way after the fail (player agency, priced honestly)',
        w.objectiveDone === true && (w.completedObjectives as Set<string>).has(zid));
      leaveToHome();
      def.objective = { kind: 'clear', adopt: true };
      (w.zoneMemory as Map<string, unknown>).delete(zid);
      (w.completedObjectives as Set<string>).delete(zid);
      w.loadZone(zid);
      check('W7f a failed (wardenless) holdfast never adopts again — the no-conjure analog',
        (w.zone.objective as ObjectiveSpec).kind === 'clear');
      leaveToHome();
    }

    // W8 THE BURST ARM, live: the gamble pinned OPEN — murdered wardens, but
    // the fabric rules the gate OPEN, so the ask completes down the bloody
    // road too (adjudicated: a burst gate IS an opened holdfast — the
    // fabric's own verdict is the one truth, flagged for her word).
    if (hf) {
      const zid = w.devMintTileset('grassland', 54, 3, { seed: 929292 }) as string;
      const forced = w.devForceHoldfast() as boolean;
      const info = hf.infoFor(zid);
      const gdef = info ? hf.def(info.defId) : undefined;
      check('W8a a third gate stands for the gamble road', forced === true && !!info && !!gdef);
      leaveToHome();
      const def = w.zoneMap[zid] as ZoneDef;
      def.objective = { kind: 'clear', adopt: true };
      def.landmarks = [];
      (w.zoneMemory as Map<string, unknown>).delete(zid);
      (w.completedObjectives as Set<string>).delete(zid);
      w.loadZone(zid);
      check('W8b the ask adopted the third gate', (w.zone.objective as ObjectiveSpec).kind === 'venture');
      const savedChance = gdef!.slaughterOpensChance;
      gdef!.slaughterOpensChance = 1; // chance(1) is exact — the gamble always bursts
      try {
        for (const id of (w.holdfastSite?.banditIds ?? []) as number[]) {
          const a = w.actorById(id) as Actor | null;
          if (a && !a.dead) w.kill(a, true);
        }
        step(0.3);
      } finally {
        gdef!.slaughterOpensChance = savedChance;
      }
      check('W8c the gamble WON: the fabric resolved OPEN (the gate burst)',
        info!.resolved === 'open' && info!.locked === false);
      check('W8d the ask COMPLETES down the bloody road (the fabric\'s verdict is the one truth)',
        w.objectiveDone === true && (w.completedObjectives as Set<string>).has(zid));
      leaveToHome();
    }
  }
});

console.log(fails === 0 ? '\nALL PASS' : `\n${fails} FAILURES`);
process.exit(fails === 0 ? 0 : 1);
