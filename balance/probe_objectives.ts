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
//     partial re-dials it (drainAt 2 drains at 2).
// Run: npx tsx balance/probe_objectives.ts
// ---------------------------------------------------------------------------

import { bootSimEngine, makeSimWorld } from '../src/sim/arena';
import { withSeededRandom } from '../src/core/rng';
import { updateAI } from '../src/engine/ai';
import { vec } from '../src/core/math';
import type { Actor } from '../src/engine/actor';
import {
  OBJECTIVE_SEALS, OBJECTIVE_READS, objectiveEarnsChest, objectiveSeals,
  type ObjectiveSpec, type ZoneDef,
} from '../src/data/zones';
import { TILESETS } from '../src/data/tilesets';
import { DOODAD_VISUALS } from '../src/data/doodadVisuals';
import { lightwellOf } from '../src/engine/lightwells';
import { transitDwell, transitOf } from '../src/data/transit';
import { placeZoneAt } from '../src/engine/worldgen';
import { CONTEST_CFG } from '../src/data/objectives';
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
});

console.log(fails === 0 ? '\nALL PASS' : `\n${fails} FAILURES`);
process.exit(fails === 0 ? 0 : 1);
