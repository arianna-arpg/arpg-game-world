// ---------------------------------------------------------------------------
// ONE-OFF PROBE — THE TERRACE PILGRIMAGE (Scald Basin M3 coda — theater;
// charter docs/design/scald-basin.md §8c, the eighth walk: THEATER ratified,
// ESCORT OUT, her timing law verbatim: "the surge would technically happen
// with or without the procession, but the procession could effectively be
// the cue for noticing the beginning of the surge"). Engine leaf
// src/engine/pilgrimage.ts, the kind src/data/pilgrimage.ts, docs
// docs/engine/pilgrimage.md. Pins:
//   A  THE REGISTRY: the kind stands (replacement posture, THE LOCAL CLOCK
//      GATE declared, the geyserkin cast of EXISTING defs), its rows claim
//      ONLY scald faces through THE FACE AXIS (terraces first), the tag is
//      AMBIENT, the offering kit + lantern are well-formed, the dials lint.
//   B  THE FACE AXIS (engine/theater.ts growth): absent abstains; a faced row
//      refuses other faces and a face-less context; the real rows read.
//   C  THE LOCAL CLOCK GATE (engine/theater.ts growth): a not-ready kind
//      declines WITHOUT spending the beat's seat (a later kind seats on the
//      same beat) and WITHOUT moving the global die.
//   D  THE PURE RESOLVERS: the loudest vent by class rank (great-less fields
//      climb to their biggest geyser; ties → first dealt), THE ONE CUE HOOK
//      (surge-keyed field → the next window's open; a forced future window
//      → its t0; a forced open window → nothing; key-less → the loudest
//      vent's next burst, THE PROVISIONAL CUE), the brim seat, the
//      vent-clear way, the pure offering ring, the pace solve + band.
//   E  THE LIVE COLUMN on the REAL terraces mint: ready inside the band, the
//      line seats at an edge mouth (the boot-seat law), lanterns worn
//      (carriedLamp + the held part), the way clear of every vent, the
//      walk arrives at the brim inside the cue band (THE CUE LAW — the
//      surge opens on its own clock as the line stands the brim), the
//      offerings lie drying on the ring, the vigil is posted, the line
//      disperses and slips away with no corpse and the forced window handed
//      back; ARCLESS (ledger byte-identical) throughout.
//   F  THE STEP-OFF: a pilgrim at a broiling brim takes the dive state off
//      the ONE threat resolver (out of the strike disc).
//   G  BUDGET HONESTY: a dwell beat trims the line to the pour room; a spent
//      ledger declines the kind before it spawns.
//   H  UNANNOUNCED + ARCLESS, structural: both modules import no omen /
//      bulletin / sounding surface and write no ledger; the carried-lamp
//      seam reads the actor's lamp before the def's.
//   I  ABSENT == IDENTICAL off the scald faces: no field → never ready; a
//      non-scald beat seats nothing and spends no global draw.
// Run: npx tsx balance/probe_pilgrimage.ts
// ---------------------------------------------------------------------------

import * as fs from 'node:fs';
import * as path from 'node:path';
import { fileURLToPath } from 'node:url';
import { bootSimEngine, makeSimWorld } from '../src/sim/arena';
import { seedGlobalRandom } from '../src/sim/rng';
import { Rng, withSeededRandom } from '../src/core/rng';
import { dist, vec } from '../src/core/math';
import { updateAI } from '../src/engine/ai';
import {
  THEATER_CFG, registerTheaterKind, swapTheaterRows, theaterKindDef, theaterKinds,
  theaterRowEligible, theaterRows, type TheaterContext, type TheaterRow,
} from '../src/engine/theater';
import {
  GEYSER_CFG, anchorVent, nextSurgeAfter, rollGeyserField, seatVent, ventReadAt,
  type GeyserField,
} from '../src/engine/geysers';
import {
  PILGRIMAGE_CFG, VENT_RANK, brimSeat, clearOfVents, departBand, inVentDisc, lintPilgrimageCfg,
  loudestVent, offeringSeats, paceToArrive, pilgrimRoute, pilgrimageCue, routeLength,
} from '../src/engine/pilgrimage';
import { devSummonPilgrimage, pilgrimagePlan, pilgrimageReady, pilgrimStepOff } from '../src/data/pilgrimage';
import { AMBIENT_TAGS, MONSTERS } from '../src/data/monsters';
import { TILESETS } from '../src/data/tilesets';
import { DOODAD_VISUALS } from '../src/data/doodadVisuals';
import type { World } from '../src/engine/world';

let failed = 0;
const check = (name: string, ok: boolean, detail = ''): void => {
  console.log(`${ok ? 'PASS' : 'FAIL'}  ${name}${detail ? ' — ' + detail : ''}`);
  if (!ok) failed++;
};

bootSimEngine();
seedGlobalRandom(0x9117a6);

const C = PILGRIMAGE_CFG;
const KIND = C.kind;
const DT = 1 / 60;
const step = (w: World, seconds: number): void => {
  for (let t = 0; t < seconds - 1e-9; t += DT) {
    w.applyInputs(new Map(), DT);
    for (const a of [...w.actors]) updateAI(a, w, DT);
    w.update(DT);
  }
};
const ctxOf = (over: Partial<TheaterContext> = {}): TheaterContext => ({
  owner: null, ownerPower: 0, biome: 'scald', tileset: 'sinter_terraces', contestants: [],
  invader: null, hasCamps: false, hasRoute: false, nearHome: true, ...over,
});
const here = path.dirname(fileURLToPath(import.meta.url));
const src = (p: string): string => fs.readFileSync(path.join(here, '..', 'src', p), 'utf8');

// ------------------------------------------------------------- A) registry --
{
  const def = theaterKindDef(KIND);
  check('A1 kind: terrace_pilgrimage registered as a REPLACEMENT theater kind with THE LOCAL CLOCK GATE',
    !!def && def.posture === 'replacement' && typeof def.ready === 'function'
    && def.cast(ctxOf())?.primary === 'geyserkin');
  const ids = theaterKinds().map(k => k.id);
  check('A2 kind: registers AFTER the cast (data/theater before the scald coda — priority is registration order)',
    ids.indexOf(KIND) > ids.indexOf('funeral') && ids.indexOf(KIND) > ids.indexOf('watch_change'));
  const rows = theaterRows().filter(r => r.kind === KIND);
  check('A3 rows: at least two (the terraces + the fields), ids unique, chances in (0,1]',
    rows.length >= 2 && new Set(rows.map(r => r.id)).size === rows.length
    && rows.every(r => r.chance > 0 && r.chance <= 1));
  check('A4 rows: every row claims the scald biome AND names only real scald faces through THE FACE AXIS',
    rows.every(r => r.biomes?.length === 1 && r.biomes[0] === 'scald' && !!r.tilesets?.length
      && r.tilesets.every(t => TILESETS[t]?.biome === 'scald')));
  const terr = rows.find(r => r.tilesets?.includes('sinter_terraces'));
  const fld = rows.find(r => r.tilesets?.includes('geyser_fields'));
  check('A5 rows: the terraces first (the terraces row outweighs the fields row in chance)',
    !!terr && !!fld && terr.chance >= fld.chance, `${terr?.chance} vs ${fld?.chance}`);
  check('A6 rows: no row claims the sulphur heart, the Char or the galleries (the line climbs, it does not wade the heart)',
    rows.every(r => !r.tilesets?.some(t => ['sulphur_pools', 'char_reach', 'steam_galleries'].includes(t))));
  const lead = MONSTERS[C.cast.lead];
  check('A7 cast: the lead + every escort row name EXISTING geyserkin defs (no new combat kit)',
    !!lead && lead.faction === 'geyserkin' && (lead.base.moveSpeed ?? 0) > 0
    && C.cast.escort.every(e => MONSTERS[e.id]?.faction === 'geyserkin'));
  check('A8 tag: the column\'s tag is AMBIENT (the line passes through — never an objective)',
    AMBIENT_TAGS.has(KIND));
  const vis = DOODAD_VISUALS[C.offerings.kind];
  check('A9 offerings: the prism-crust kit has a visuals row with a breathing light (opens at dusk like the lamps)',
    !!vis && !!vis.light && (vis.light.radiance?.at1 ?? 1) < 1);
  check('A10 lantern: the carried lamp breathes brighter at dusk than at noon (at1 < at0)',
    (C.lantern.radiance?.at1 ?? 1) < (C.lantern.radiance?.at0 ?? 1) && C.lantern.intensity > 0
    && C.lanternPart.kind === 'lantern');
  const gripes = lintPilgrimageCfg();
  check('A11 dials: PILGRIMAGE_CFG lints clean', gripes.length === 0, gripes.join('; '));
}

// ---------------------------------------------------------- B) the face axis --
{
  const faced: TheaterRow = { id: 'qa_faced', kind: 'x', chance: 1, biomes: ['scald'], tilesets: ['sinter_terraces'] };
  const bare: TheaterRow = { id: 'qa_bare', kind: 'x', chance: 1, biomes: ['scald'] };
  check('B1 face axis: a faced row admits its face, refuses another face, refuses a face-less context',
    theaterRowEligible(faced, ctxOf(), () => true)
    && !theaterRowEligible(faced, ctxOf({ tileset: 'geyser_fields' }), () => true)
    && !theaterRowEligible(faced, ctxOf({ tileset: undefined }), () => true));
  check('B2 face axis: a row without tilesets ABSTAINS (any face of its biome admits)',
    theaterRowEligible(bare, ctxOf(), () => true)
    && theaterRowEligible(bare, ctxOf({ tileset: 'sulphur_pools' }), () => true)
    && theaterRowEligible(bare, ctxOf({ tileset: undefined }), () => true));
  const rows = theaterRows().filter(r => r.kind === KIND);
  check('B3 face axis: the real rows — the terraces row reads on terraces ground, the fields row does not; off-scald nothing reads',
    rows.some(r => theaterRowEligible(r, ctxOf(), () => true))
    && !rows.filter(r => r.tilesets?.includes('geyser_fields')).some(r => theaterRowEligible(r, ctxOf(), () => true))
    && !rows.some(r => theaterRowEligible(r, ctxOf({ biome: 'meadow', tileset: 'meadow' }), () => true)));
}

// ---------------------------------------------- C) the local clock gate --
{
  const w = makeSimWorld('warrior', 0x9117a6);
  let seatedNotReady = 0, seatedReady = 0;
  registerTheaterKind({
    id: 'qa_pg_notready', posture: 'replacement',
    ready: () => false,
    cast: () => ({ primary: 'goblin' }),
    spawn: (_w, run) => { seatedNotReady++; run.done = false; },
    tick: () => {},
  });
  registerTheaterKind({
    id: 'qa_pg_ready', posture: 'replacement',
    ready: () => true,
    cast: () => ({ primary: 'goblin' }),
    spawn: (_w, run) => { seatedReady++; run.done = false; },
    tick: () => {},
  });
  const prior = swapTheaterRows([
    { id: 'qa_nr_row', kind: 'qa_pg_notready', chance: 1 },
    { id: 'qa_r_row', kind: 'qa_pg_ready', chance: 1 },
  ]);
  w.theaterAmbientBudget = 40;
  w.theaterRuns.length = 0;
  seedGlobalRandom(0xd1e002);
  const ref = Math.random();
  seedGlobalRandom(0xd1e002);
  w.theaterRunBeat(3, ctxOf({ biome: undefined, tileset: undefined }));
  const after = Math.random();
  check('C1 clock gate: the not-ready kind declines and the LATER kind seats the SAME beat (no seat spent)',
    seatedNotReady === 0 && seatedReady === 1 && w.theaterRuns.some(r => r.kind === 'qa_pg_ready'),
    `notready ${seatedNotReady} ready ${seatedReady}`);
  check('C2 clock gate: the decline moves NOTHING on the global die', after === ref);
  w.theaterRuns.length = 0;
  swapTheaterRows(prior);
}

// ----------------------------------------------------- D) pure resolvers --
{
  const mk = (withGreat: boolean, key?: number): GeyserField => {
    const rng = new Rng(0x5eed);
    const f = rollGeyserField(rng, { bands: [2, 2] }, key);
    seatVent(f, rng, vec(300, 300), 'hiss');
    seatVent(f, rng, vec(520, 340), 'geyser');
    seatVent(f, rng, vec(700, 280), 'hiss');
    if (withGreat) anchorVent(f, rng, vec(900, 600), 'great', { period: 80, phase: 0.5 });
    return f;
  };
  const fg = mk(true);
  const L = loudestVent(fg);
  check('D1 loudest: the great metronome where one stands (class rank great > geyser > hiss)',
    !!L && L.vent.cls === 'great' && L.idx === 3 && VENT_RANK.great > VENT_RANK.geyser && VENT_RANK.geyser > VENT_RANK.hiss);
  const fgl = mk(false);
  const L2 = loudestVent(fgl);
  check('D2 loudest: a great-less field (the terraces) climbs to its biggest geyser — the first dealt among equals',
    !!L2 && L2.vent.cls === 'geyser' && L2.idx === 1 && loudestVent(null) === null
    && loudestVent({ ...fgl, vents: [] }) === null);
  // THE PROVISIONAL CUE (key-less): the loudest vent's next burst.
  const t = 37.25;
  const cue0 = pilgrimageCue(fg, t);
  const read = ventReadAt(fg, fg.vents[3], t, 'bands');
  check('D3 cue: a key-less field answers to the loudest vent\'s next burst (THE PROVISIONAL CUE), vigil = burst + afterBurst',
    !!cue0 && cue0.source === 'burst' && Math.abs(cue0.at - (t + read.toBurst)) < 1e-9
    && Math.abs(cue0.end - (cue0.at + GEYSER_CFG.classes.great.eruptSec + C.vigil.afterBurst)) < 1e-9);
  // THE SURGE HOUR (keyed): the next window's open, nextSurgeAfter's own law.
  const fk = mk(true, 0xabc123);
  const cue1 = pilgrimageCue(fk, t);
  const nxt = nextSurgeAfter(0xabc123 >>> 0, t);
  check('D4 cue: a surge-keyed field answers to the NEXT window\'s open (the sovereign clock, read once)',
    !!cue1 && cue1.source === 'surge' && cue1.at === nxt.t0 && cue1.end === nxt.t1 && cue1.at >= t);
  // A forced future window cues at its t0; a forced OPEN window cues nothing.
  fk.surgeForce = { c: 0xfff, t0: t + 100, t1: t + 190 };
  const cue2 = pilgrimageCue(fk, t);
  fk.surgeForce = { c: 0xfff, t0: t - 1, t1: t + 89 };
  const cue3 = pilgrimageCue(fk, t);
  fk.surgeForce = null;
  check('D5 cue: a forced FUTURE window cues at its t0; a forced OPEN window has already cued (null)',
    !!cue2 && cue2.at === t + 100 && cue2.end === t + 190 && cue3 === null);
  check('D6 cue: no field / no vents → no cue', pilgrimageCue(null, t) === null && pilgrimageCue({ ...fg, vents: [] }, t) === null);
  // Geometry.
  const vent = fg.vents[3];
  const approach = vec(100, 100);
  const brim = brimSeat(vent, approach, 12);
  const standoff = GEYSER_CFG.classes.great.columnR + 12 + C.brim.clear;
  const toward = (brim.x - vent.pos.x) * (approach.x - vent.pos.x) + (brim.y - vent.pos.y) * (approach.y - vent.pos.y);
  check('D7 brim: the seat stands columnR + body + clear from the centre, on the approach side',
    Math.abs(dist(brim, vent.pos) - standoff) < 1e-6 && toward > 0);
  const inside = clearOfVents(vec(vent.pos.x + 3, vent.pos.y), fg, 10);
  const clear = clearOfVents(vec(50, 50), fg, 10);
  check('D8 clearOfVents: a point in the throat is pushed out past columnR + pad; a clear point stays byte-identical',
    dist(inside, vent.pos) >= GEYSER_CFG.classes.great.columnR + 10 && clear.x === 50 && clear.y === 50);
  const via = pilgrimRoute(vec(80, 120), vec(860, 560), fg, 3);
  const expectN = Math.max(0, Math.floor(dist(vec(80, 120), vec(860, 560)) / C.route.stride) - 1);
  check('D9 way: chord waypoints every stride, none inside any other vent\'s strike disc',
    via.length === expectN && via.every(p => !inVentDisc(p, fg, C.route.ventPad - 1, 3)), `${via.length} waypoints`);
  const seats = offeringSeats(vent, C.offerings.count);
  const seats2 = offeringSeats(vent, C.offerings.count);
  const r0 = GEYSER_CFG.classes.great.columnR;
  check('D10 offerings: a pure ring of `count` seats just outside the strike disc (same vent, same ring)',
    seats.length === C.offerings.count
    && seats.every(s => dist(s, vent.pos) >= r0 + C.offerings.ringPad[0] - 1e-6 && dist(s, vent.pos) <= r0 + C.offerings.ringPad[1] + 1e-6)
    && seats.every((s, i) => s.x === seats2[i].x && s.y === seats2[i].y));
  check('D11 pace: the solve lands mid-band exactly, clamps both ends, hurries when out of time',
    Math.abs(paceToArrive(600, 100, 8) - 0.75) < 1e-9 && paceToArrive(100, 100, 60) === C.pace.min
    && paceToArrive(5000, 100, 5) === C.pace.max && paceToArrive(100, 100, 0) === C.pace.max);
  const band = departBand(2000, 118);
  check('D12 band: min ≤ max, floored at depart.min, the slowest walk + slack the ceiling',
    band.min <= band.max && band.min >= C.depart.min
    && Math.abs(band.max - (2000 / (118 * C.pace.min) + C.arrive.lead + C.depart.slack)) < 1e-9);
  check('D13 routeLength: the polyline measure', routeLength([vec(0, 0), vec(3, 4), vec(3, 8)]) === 9
    && routeLength([vec(3, 4)], vec(0, 0)) === 5);
}

// ------------------------------------------------ E) THE LIVE COLUMN --
{
  const w = makeSimWorld('warrior', 101);
  let zid: string | null = null;
  withSeededRandom(0xbeef11, () => { zid = w.devMintTileset('sinter_terraces', 0.5, 8, { seed: 4242 }); });
  const field = w.geysers;
  check('E1 mint: the sinter terraces stand through the real path with a surge-keyed geyser field',
    !!zid && w.zone.tileset === 'sinter_terraces' && !!field && field.vents.length > 0 && field.surgeKey !== undefined,
    `vents ${field?.vents.length ?? 0}`);
  if (field && field.vents.length) {
    // A quiet stage: the zone's own packs step aside so the walk measures the
    // line, not a brawl (raidability is its own rig — the bodies are ordinary
    // enemies; here nobody is home to raid).
    const keep = w.actors.filter(a => a.team !== 'enemy');
    w.actors.splice(0, w.actors.length, ...keep);
    const ctx = w.theaterContextNow();
    check('E2 context: the zone\'s standing truth carries its face (ctx.tileset — THE FACE AXIS)',
      ctx.tileset === 'sinter_terraces' && ctx.biome === 'scald');
    const plan0 = pilgrimagePlan(w);
    check('E3 plan: a loudest vent, a reachable edge mouth, a brim seat and a way stand on the real mint',
      !!plan0 && plan0.pathLen > 200 && plan0.via.length >= 0 && !!plan0.cue, `path ${plan0?.pathLen.toFixed(0)}`);
    // Force a FUTURE surge window where the walk fits (the surge fabric's own
    // dev face) — THE CUE is then that window's open.
    const band = departBand(plan0!.pathLen, plan0!.speed);
    const t0 = w.time + band.min + (band.max - band.min) * 0.45;
    const forced = { c: 0xfff, t0, t1: t0 + GEYSER_CFG.surge.dwell };
    field.surgeForce = forced;
    check('E4 ready: with the cue inside the departure band the clock gate opens; outside it, it shuts',
      pilgrimageReady(w) && (() => {
        field.surgeForce = { c: 0xfff, t0: w.time + band.max + 300, t1: w.time + band.max + 390 };
        const far = pilgrimageReady(w);
        field.surgeForce = { c: 0xfff, t0: w.time + Math.max(1, band.min - 12), t1: w.time + band.min + 78 };
        const near = band.min - 12 >= C.depart.min ? pilgrimageReady(w) : false;
        field.surgeForce = forced;
        return !far && !near;
      })());
    // The player stands far off the way (the quiet stage).
    const plan = pilgrimagePlan(w)!;
    const corners = [vec(60, 60), vec(w.arena.w - 60, 60), vec(60, w.arena.h - 60), vec(w.arena.w - 60, w.arena.h - 60)]
      .map(p => w.clampPos(p, 16));
    let far = corners[0], fd = -1;
    for (const c of corners) {
      const d = Math.min(dist(c, plan.mouth), dist(c, plan.brim), ...plan.via.map(v => dist(c, v)));
      if (d > fd) { fd = d; far = c; }
    }
    w.player.pos = vec(far.x, far.y);
    const prior = swapTheaterRows([{ id: 'qa_pg_row', kind: KIND, chance: 1, biomes: ['scald'], tilesets: ['sinter_terraces'] }]);
    w.theaterRuns.length = 0;
    const ledgerBefore = JSON.stringify((w as unknown as { account?: { ledger?: unknown } }).account?.ledger ?? null);
    const corpsesBefore = w.corpses.length;
    const pourBefore = w.theaterPour.get(KIND) ?? 0;
    w.theaterRunBeat(0, w.theaterContextNow());
    const run = w.theaterRuns.find(r => r.kind === KIND);
    const members = w.actors.filter(a => a.tag === KIND);
    check('E5 seat: the entry beat stands the column up (1 lead + the authored followers, all geyserkin, enemy team)',
      !!run && members.length === 1 + C.cast.followers && members.every(a => a.faction === 'geyserkin' && a.team === 'enemy'),
      `members ${members.length}`);
    check('E6 ledger: every body poured through the theater ledger (the budget law\'s count)',
      (w.theaterPour.get(KIND) ?? 0) - pourBefore === members.length);
    const lead = members.find(a => a.patrolRoute && a.patrolRoute.length >= 2);
    const route = lead?.patrolRoute ?? [];
    check('E7 way: the lead\'s route runs from the mouth to the brim; the brim stands a step outside the loudest vent\'s strike',
      !!lead && route.length >= 2 && dist(route[0], plan.mouth) < 1 && dist(route[route.length - 1], plan.brim) < 1
      && Math.abs(dist(plan.brim, plan.vent.pos) - (GEYSER_CFG.classes[plan.vent.cls].columnR + C.brim.clear + (MONSTERS[C.cast.lead]?.radius ?? 12))) < 24,
      `brim ${dist(plan.brim, plan.vent.pos).toFixed(0)} from the ${plan.vent.cls}`);
    check('E8 way: no waypoint stands inside another vent\'s strike disc (the way avoids the throats)',
      route.slice(1, -1).every(p => !inVentDisc(p, field, C.route.ventPad - 2, plan.ventIdx)));
    check('E9 mouth: the line seats at a zone EDGE — an exit — clear of the arrival\'s grace (the boot-seat law)',
      w.exits.length === 0 || w.exits.some(e => dist(e.pos, route[0]) < 24));
    check('E10 lanterns: every pilgrim carries the prism-crust lamp (carriedLamp, breathing) and the held lantern part',
      members.every(a => !!a.carriedLamp && (a.carriedLamp.radiance?.at1 ?? 1) < 1
        && !!a.extraParts?.some(p => p.kind === 'lantern')));
    // THE WALK: step until the vigil (arrival) — the cue law's band.
    let arrivedAt = -1;
    const st = (): string => ((run?.data.pg as { phase?: string } | undefined)?.phase ?? '?');
    const horizon = Math.max(20, Math.ceil(forced.t0 - w.time) + 45);
    for (let s = 0; s < horizon && arrivedAt < 0; s++) {
      step(w, 1);
      if (st() === 'vigil') arrivedAt = w.time;
    }
    const off = arrivedAt - forced.t0;
    check('E11 THE CUE LAW: the line stands the brim inside the cue band — before the hour opens (≤ early) and never after its first tide beat',
      arrivedAt >= 0 && off <= GEYSER_CFG.surge.lead + 1 && off >= -(C.vigil.early + 1),
      `arrived ${off.toFixed(1)}s relative to the window's open (phase ${st()}, ${Math.round(w.time)}s)`);
    const live = w.actors.filter(a => a.tag === KIND && !a.dead);
    const leadNow = live.find(a => a.postSpec && a.aiPost);
    check('E12 vigil: the lead is POSTED at the brim (hold), the rest heel; nobody has slipped away yet',
      !!leadNow && dist(leadNow.aiPost!, plan.brim) < 1 && live.length >= 1 + C.cast.minFollowers,
      `live ${live.length}`);
    const offerings = w.doodads.filter(d => d.kind === C.offerings.kind && !d.gone);
    const r0 = GEYSER_CFG.classes[plan.vent.cls].columnR;
    check('E13 offerings: prism-crust heaps lie on the ring outside the strike disc, already handed to evap (drying dress)',
      offerings.length >= 1 && offerings.every(d => !!d.evap && d.blastDress === true
        && dist(d.pos, plan.vent.pos) >= r0 - 1 && dist(d.pos, plan.vent.pos) <= r0 + C.offerings.ringPad[1] + 2),
      `${offerings.length} laid`);
    // The hour opens on its own clock as the line stands the brim.
    if (w.time < forced.t0 + 0.5) step(w, forced.t0 + 0.5 - w.time);
    const surge = w.geyserSurge();
    check('E14 THE CUE LAW: the surge opens on ITS clock (held) with the line at the brim — the procession read it, never wrote it',
      !!surge && surge.held && field.surgeForce === forced && st() !== 'walk');
    // The vigil ends with the hour (or the ceiling); the line disperses and
    // slips away — no corpse, the forced window handed back, the ledger
    // untouched (ARCLESS).
    const until = Math.min(forced.t1, arrivedAt + C.vigil.max) + 80;
    for (let s = 0; s < 400 && w.theaterRuns.some(r => r.kind === KIND && !r.done); s++) {
      step(w, 1);
      if (w.time > until + 120) break;
    }
    const remaining = w.actors.filter(a => a.tag === KIND && !a.dead);
    check('E15 disperse: the vigil ended, the line walked back and slipped away — no pilgrim left, no corpse, the run closed',
      remaining.length === 0 && !w.theaterRuns.some(r => r.kind === KIND && !r.done) && w.corpses.length === corpsesBefore,
      `remaining ${remaining.length}, phase ${st()}, t ${Math.round(w.time)} (window ${Math.round(forced.t0)}..${Math.round(forced.t1)})`);
    check('E16 the cue law: a window the run did NOT force stands untouched after it — the procession READS the clock, never writes it',
      field.surgeForce === forced);
    field.surgeForce = null;
    const ledgerAfter = JSON.stringify((w as unknown as { account?: { ledger?: unknown } }).account?.ledger ?? null);
    check('E17 arcless: the account ledger is byte-identical across the whole procession', ledgerAfter === ledgerBefore);
    swapTheaterRows(prior);
  }
}

// --------------------------------------------------------- F) the step-off --
{
  const w = makeSimWorld('warrior', 77);
  let zid: string | null = null;
  withSeededRandom(0xbeef12, () => { zid = w.devMintTileset('sinter_terraces', 0.5, 8, { seed: 4343 }); });
  const field = w.geysers;
  if (!zid || !field || !field.vents.length) {
    check('F0 mint: a second terraces mint stands', false);
  } else {
    const keep = w.actors.filter(a => a.team !== 'enemy');
    w.actors.splice(0, w.actors.length, ...keep);
    const L = loudestVent(field)!;
    const body = w.spawnEventActor([{ id: 'stilt_strider', weight: 1 }], 8, 'enemy', 'geyserkin', KIND);
    const seat = brimSeat(L.vent, vec(L.vent.pos.x + 100, L.vent.pos.y), body.radius);
    body.pos = vec(seat.x, seat.y);
    w.player.pos = w.clampPos(vec(60, 60), 16);
    // Walk the clock to the loudest vent's broil (the resolver's own read).
    let guard = 0;
    while (guard++ < 6000) {
      const r = ventReadAt(field, L.vent, w.time, w.geyserMode);
      if (r.phase === 'broil' && r.toBurst <= C.stepOff.horizon) break;
      step(w, DT);
      body.pos = vec(seat.x, seat.y);
      body.aiDodgeExit = undefined;
    }
    const r = ventReadAt(field, L.vent, w.time, w.geyserMode);
    const n = pilgrimStepOff(w, [body.id]);
    check('F1 step-off: at the brim of a broiling vent the pilgrim takes the dive state off the ONE threat resolver',
      r.phase === 'broil' && n === 1 && !!body.aiDodgeExit && body.aiDodgeUntil > w.time,
      `phase ${r.phase}, toBurst ${r.toBurst.toFixed(2)}`);
    const exit = body.aiDodgeExit;
    check('F2 step-off: the dive exit stands OUTSIDE the strike disc (+ the body)',
      !!exit && dist(exit, L.vent.pos) >= GEYSER_CFG.classes[L.vent.cls].columnR + body.radius);
    // Quiet ground: nothing to step off from.
    body.aiDodgeExit = undefined;
    let guard2 = 0;
    while (guard2++ < 6000) {
      const rq = ventReadAt(field, L.vent, w.time, w.geyserMode);
      if (rq.phase === 'quiet' && rq.toBurst > 4) break;
      step(w, DT);
      body.pos = vec(seat.x, seat.y);
      body.aiDodgeExit = undefined;
    }
    body.aiDodgeExit = undefined;
    const n2 = pilgrimStepOff(w, [body.id]);
    check('F3 step-off: a quiet vent asks nothing of the feet', n2 === 0 && !body.aiDodgeExit);
  }
}

// ------------------------------------------------------ G) budget honesty --
{
  const w = makeSimWorld('warrior', 55);
  let zid: string | null = null;
  withSeededRandom(0xbeef13, () => { zid = w.devMintTileset('sinter_terraces', 0.5, 8, { seed: 4444 }); });
  const field = w.geysers;
  if (!zid || !field || !field.vents.length) {
    check('G0 mint: a third terraces mint stands', false);
  } else {
    const keep = w.actors.filter(a => a.team !== 'enemy');
    w.actors.splice(0, w.actors.length, ...keep);
    const plan = pilgrimagePlan(w)!;
    const band = departBand(plan.pathLen, plan.speed);
    const t0 = w.time + band.min + (band.max - band.min) * 0.45;
    field.surgeForce = { c: 0xfff, t0, t1: t0 + GEYSER_CFG.surge.dwell };
    w.player.pos = w.clampPos(vec(60, 60), 16);
    const prior = swapTheaterRows([{ id: 'qa_pg_row2', kind: KIND, chance: 1, biomes: ['scald'], tilesets: ['sinter_terraces'] }]);
    // A dwell beat on a thin floor: the replacement band is max(floor, bandFrac × budget).
    w.theaterAmbientBudget = 2;
    w.theaterPour.set(KIND, 0);
    w.theaterRuns.length = 0;
    w.theaterRunBeat(2, w.theaterContextNow());
    const cap = Math.max(THEATER_CFG.pour.floor, Math.round(THEATER_CFG.pour.bandFrac * w.theaterAmbientBudget));
    const members = w.actors.filter(a => a.tag === KIND && !a.dead);
    check('G1 budget: a dwell beat TRIMS the line to the pour room (the column replaces ambient share, never spikes it)',
      members.length >= 1 + C.cast.minFollowers && members.length <= cap, `members ${members.length} cap ${cap}`);
    // Spent ledger: the seat-gate refuses before spawn.
    for (const a of members) { const i = w.actors.indexOf(a); if (i >= 0) w.actors.splice(i, 1); }
    w.theaterRuns.length = 0;
    w.theaterPour.set(KIND, cap);
    w.theaterRunBeat(3, w.theaterContextNow());
    check('G2 budget: a spent visit ledger declines the kind — nothing seats, nothing pours',
      !w.theaterRuns.some(r => r.kind === KIND) && w.actors.filter(a => a.tag === KIND).length === 0);
    field.surgeForce = null;
    swapTheaterRows(prior);
  }
}

// ----------------------------------------------- H) structural gates --
{
  const leaf = src('engine/pilgrimage.ts');
  const kind = src('data/pilgrimage.ts');
  const both = leaf + kind;
  check('H1 unannounced: neither module imports an omen / bulletin / sounding surface',
    !/from ['"][^'"]*omens['"]/.test(both) && !/from ['"][^'"]*bulletins['"]/.test(both)
    && !/registerOmenSource|postBulletin|requestSoundings|WorldOverlay/.test(both));
  check('H2 arcless: neither module writes the account ledger, zone memory or a biome warp',
    !/account\.ledger|accountDirty|zoneMemory|setWarp\(|ledger\[/.test(both));
  check('H3 pure leaf: engine/pilgrimage.ts imports no World at runtime and writes no field state',
    !/from ['"]\.\/world['"]/.test(leaf) && !/surgeForce\s*=/.test(leaf));
  const lights = src('render/vis/lights.ts');
  check('H4 the carried lamp: the light layer reads Actor.carriedLamp BEFORE the def\'s own lamp',
    /a\.carriedLamp \?\?/.test(lights));
  const theater = src('engine/theater.ts');
  check('H5 the fabric grew exactly two seams: THE FACE AXIS (tilesets) and THE LOCAL CLOCK GATE (ready)',
    /tilesets\?: string\[\]/.test(theater) && /ready\?\(world: World, ctx: TheaterContext\): boolean/.test(theater)
    && /def\.ready && !def\.ready\(world, o\.ctx\)/.test(theater));
}

// ------------------------------------------- I) absent == identical --
{
  const w = makeSimWorld('warrior', 0x9117a6);
  check('I1 off-scald: the quiet arena has no field — the clock gate never opens', !w.geysers && pilgrimageReady(w) === false);
  const rows = theaterRows().filter(r => r.kind === KIND);
  const meadow = ctxOf({ biome: 'meadow', tileset: 'meadow' });
  check('I2 off-scald: no real row reads on a meadow face', !rows.some(r => theaterRowEligible(r, meadow, () => true)));
  // A non-scald beat with the real rows standing spends exactly what it
  // would with them swapped out (keyed draws; the gate declines before any).
  w.theaterSpots = { camps: [], pois: [] };
  w.theaterAmbientBudget = 40;
  const before = w.actors.length;
  seedGlobalRandom(0xd1e003);
  w.theaterRuns.length = 0;
  w.theaterRunBeat(5, meadow);
  const a1 = Math.random();
  const seatedA = w.theaterRuns.some(r => r.kind === KIND);
  const prior = swapTheaterRows(theaterRows().filter(r => r.kind !== KIND));
  seedGlobalRandom(0xd1e003);
  w.theaterRuns.length = 0;
  w.theaterRunBeat(5, meadow);
  const a2 = Math.random();
  swapTheaterRows(prior);
  check('I3 off-scald: the pilgrimage rows present vs absent — the beat seats no line and the die reads identical',
    !seatedA && a1 === a2 && w.actors.length === before && w.actors.every(a => a.tag !== KIND));
}

// ------------------------------------------- J) the dev lever (her walk) --
{
  const w = makeSimWorld('warrior', 33);
  let zid: string | null = null;
  withSeededRandom(0xbeef14, () => { zid = w.devMintTileset('sinter_terraces', 0.5, 8, { seed: 4545 }); });
  const field = w.geysers;
  if (!zid || !field || !field.vents.length) {
    check('J0 mint: a fourth terraces mint stands', false);
  } else {
    const keep = w.actors.filter(a => a.team !== 'enemy');
    w.actors.splice(0, w.actors.length, ...keep);
    w.player.pos = w.clampPos(vec(60, 60), 16);
    w.theaterRuns.length = 0;
    const prior = swapTheaterRows([]); // no rows at all — the lever stands the run up directly
    const line = devSummonPilgrimage(w);
    const run = w.theaterRuns.find(r => r.kind === KIND);
    const cueAt = (run?.data.pg as { cue?: { at: number } } | undefined)?.cue?.at ?? -1;
    check('J1 dev lever: stages the line NOW carrying its own cue (seated where the walk fits) — no rows, no beat, no window forced yet',
      !!run && cueAt > w.time && !field.surgeForce && w.actors.some(a => a.tag === KIND), line);
    check('J2 dev lever: a second summons while the line walks is refused', /already/.test(devSummonPilgrimage(w)));
    // No FORCED window stands through the walk (the lever never runs the
    // steam ahead of the line — the REAL long clock stays sovereign and may
    // do as it pleases); the forced window opens AT the cue.
    let earlyForce = false;
    while (w.time < cueAt - 1.5) { step(w, 1); if (field.surgeForce) earlyForce = true; }
    if (field.surgeForce) earlyForce = true; // still ≥ 0.5 s before the cue: nothing may stand
    step(w, 3);
    const sg = w.geyserSurge();
    check('J3 dev lever: no forced window through the walk; the surge is forced open AT the cue (the cue law, on demand)',
      !earlyForce && !!field.surgeForce && Math.abs(field.surgeForce.t0 - cueAt) < 1e-6 && sg?.forced === true && sg.held === true,
      `force ${field.surgeForce ? 't0 ' + field.surgeForce.t0.toFixed(1) : 'none'} vs cue ${cueAt.toFixed(1)}, held ${sg?.held}`);
    let guard = 0;
    while (guard++ < 500 && w.theaterRuns.some(r => r.kind === KIND && !r.done)) step(w, 1);
    check('J4 dev lever: the run hands the forced window back when it ends (the field reads its own clock again)',
      !w.theaterRuns.some(r => r.kind === KIND && !r.done) && field.surgeForce === null,
      `${guard}s, force ${field.surgeForce ? 'still set' : 'cleared'}`);
    swapTheaterRows(prior);
  }
}

console.log(failed ? `\n${failed} check(s) FAILED` : '\nall checks passed');
process.exit(failed ? 1 : 0);
