// ---------------------------------------------------------------------------
// THE TERRACE PILGRIMAGE — the theater kind (THE RESIDENT LAW, four gates)
// for the Scald Basin's M3 coda (charter docs/design/scald-basin.md §8c; the
// eighth walk: THEATER ratified, ESCORT OUT).
//
// A column of geyserkin — a vent-shaman leading stilt-striders and kin —
// sets out from a terrace-side MOUTH (a zone exit, or the arena rim where a
// zone has none) and climbs to the zone's LOUDEST vent (engine/pilgrimage.ts
// loudestVent) carrying PRISM-CRUST LANTERNS (Actor.carriedLamp + a held
// `lantern` part — the grove's breathing-light grammar: at dusk the
// terraces light as the line climbs), TIMED by THE CUE HOOK (pilgrimageCue —
// the surge hour's next window, sovereign on its own pure clock; the
// loudest vent's next burst where no surge key stands) so the line stands
// at the brim AS the hour begins. Her timing law, verbatim: "the surge would
// technically happen with or without the procession, but the procession
// could effectively be the cue for noticing the beginning of the surge."
// At the brim the pilgrims leave OFFERINGS (prism-crust dress that dries
// away through the ONE plantImpactDress→evap path; a small keyed gem beat
// under the spoils law), keep a vigil under THE NO-TAG CEILING while the
// hour runs, then DISPERSE back down the way they came and slip away.
//
// THE FOUR GATES: LOCAL (rows claim scald faces through THE FACE AXIS; the
// kind's `ready` reads only the zone's own geyser field + the clock),
// UNANNOUNCED (no omen, no map mark, no bulletin — this module imports
// none; the lanterns and the thickening steam are the announcement),
// BUDGET-HONEST (every body pours through marchSpawn → theaterSpawn, the
// replacement ledger; the line trims to the pour room on dwell beats),
// ARCLESS (no objective, no ledger write; zone memory at most — the
// offerings dry, the column leaves, nothing resolves). RAIDABLE BY
// CONSTRUCTION: pilgrims are the enemy team (geyserkin, diplomacy-silent) —
// strike the line and you fight the tribe, nothing more; they never hover
// (THE NO-TAG LAW): they walk, fight if struck, or keep walking. The column
// wears an AMBIENT tag (the wax_vigil precedent): it passes through and
// never gates a clear.
//
// THE STEP-OFF (the show-don't-tell tutorial at scale): every pilgrim reads
// the ONE threat resolver (World.imminentThreatTo — the read dodge-minds
// and the drawn broil both ride) on a cadence and hands its feet the dodge
// reflex's own dive state when a broil is close: the bodies step OFF every
// hiss-vent on its beat. No new AI lever, no def edit — the rite's
// discipline on standing machinery.
//
// Docs: docs/engine/pilgrimage.md. Probe: balance/probe_pilgrimage.ts.
// Every number is a DIAL (unblessed).
// ---------------------------------------------------------------------------

import { angleTo, dist, vec, type Vec2 } from '../core/math';
import { mod } from '../engine/stats';
import {
  ActiveTheaterRun, marchSpawn, marchTick, registerTheaterKind, registerTheaterRow, THEATER_CFG,
  theaterRng, type MarchState, type TheaterRow,
} from '../engine/theater';
import { GEYSER_CFG, type GeyserField, type PlacedVent } from '../engine/geysers';
import {
  PILGRIMAGE_CFG, brimSeat, clearOfVents, departBand, hash01, loudestVent, offeringSeats,
  paceToArrive, pilgrimRoute, pilgrimageCue, routeLength, type PilgrimCue,
} from '../engine/pilgrimage';
import { registerDoodadRule } from '../engine/levelgen';
import { AMBIENT_TAGS, MONSTERS } from './monsters';
import { DOODAD_VISUALS } from './doodadVisuals';
import type { World } from '../engine/world';
import type { Actor } from '../engine/actor';

const C = PILGRIMAGE_CFG;

// --- the offering kit (dress — the transience doctrine) ----------------------
// A prism-crust heap: a small travertine mound in the terraces' pale mineral
// white, holding a little of the lantern's warmth (a breathing light that
// opens at dusk like the lamps that laid it). Planted ONLY through
// World.plantDressAt (blastDress + evap); never gen-stamped, so no stamp row.
registerDoodadRule(C.offerings.kind, { overlap: 'ground', walkOnly: true, spacing: 12 });
DOODAD_VISUALS[C.offerings.kind] = {
  painter: 'mound', order: 31,
  params: { color: '#e8dcc4', edge: '#fff4e0' },
  blend: { strength: 0.2, feather: 8, color: '#d8ccb0' },
  light: { radius: -2.4, color: '#ffd9a0', intensity: 0.3, flicker: 1.2, radiance: { at1: 0.15 } },
};

// THE AMBIENT TAG: the line passes through — never an objective, never a
// hostage (World.isAmbientTag reads THIS set; the registerDormantTag idiom).
AMBIENT_TAGS.add(C.kind);

// --- the plan (pure geometry over the zone's own field) ---------------------

export interface PilgrimagePlan {
  field: GeyserField;
  vent: PlacedVent;
  ventIdx: number;
  cue: PilgrimCue;
  /** The terrace-side mouth the line sets out from (a zone edge). */
  mouth: Vec2;
  /** The brim seat — a step outside the loudest vent's strike disc. */
  brim: Vec2;
  via: Vec2[];
  pathLen: number;
  /** The lead's unpaced stride (its def base — the solve's reference). */
  speed: number;
}

/** The lead def's body radius + base stride (the plan's reference body). */
function leadBody(): { r: number; speed: number } {
  const d = MONSTERS[C.cast.lead];
  return { r: d?.radius ?? 12, speed: d?.base.moveSpeed ?? 110 };
}

/** THE PLAN: where the line sets out, where it halts, the way between, and
 *  the cue it answers to — null when this ground cannot stage one (no field,
 *  no vents, no cue, no reachable mouth). Pure over the zone's standing
 *  truth: the field, the exits, the walk grid. The same resolver serves
 *  `ready` (the beat gate) and `spawn` (the stand-up), so the two can never
 *  disagree about whether a procession forms. */
export function pilgrimagePlan(w: World, cueOverride?: PilgrimCue): PilgrimagePlan | null {
  const field = w.geysers;
  const L = loudestVent(field);
  if (!field || !L) return null;
  // THE ONE HOOK — or a cue HANDED to this plan (the dev lever's run carries
  // its own, so the forced window can open AT the cue and not before).
  const cue = cueOverride ?? pilgrimageCue(field, w.time, w.geyserMode);
  if (!cue) return null;
  const body = leadBody();
  const walk = w.walk;
  const reach = (p: Vec2): boolean => !walk || !walk.reachable || walk.reachable(p, L.vent.pos);
  // THE MOUTH: the zone exit FARTHEST from the vent — the longest, most
  // readable climb — that the walk grid can reach from; a zone with no
  // exits (a pocket, the sim arena) sets out from the arena rim through
  // the middle (the marchEndpoints edge idiom).
  let mouth: Vec2 | null = null, best = -1;
  for (const e of w.exits) {
    const d = dist(e.pos, L.vent.pos);
    if (d <= best) continue;
    const p = w.clampPos(vec(e.pos.x, e.pos.y), 16);
    if (!reach(p)) continue;
    best = d; mouth = p;
  }
  if (!mouth) {
    const cx = w.arena.w / 2, cy = w.arena.h / 2;
    const off = dist(L.vent.pos, vec(cx, cy));
    const ang = off < 1 ? hash01(Math.round(L.vent.pos.x), Math.round(L.vent.pos.y), 5) * Math.PI * 2
      : Math.atan2(cy - L.vent.pos.y, cx - L.vent.pos.x);
    const r = Math.min(w.arena.w, w.arena.h) / 2 - C.route.mouthInset;
    const p = w.clampPos(vec(cx + Math.cos(ang) * r, cy + Math.sin(ang) * r), 16);
    if (!reach(p)) return null;
    mouth = p;
  }
  const brim = w.clampPos(clearOfVents(brimSeat(L.vent, mouth, body.r), field, C.route.ventPad, L.idx), body.r);
  const via = pilgrimRoute(mouth, brim, field, L.idx).map(p => w.clampPos(p, body.r));
  const pts = [mouth, ...via, brim];
  return { field, vent: L.vent, ventIdx: L.idx, cue, mouth, brim, via, pathLen: routeLength(pts), speed: body.speed };
}

/** THE LOCAL CLOCK GATE: may a beat set the line out NOW? Only when the cue
 *  lies inside the departure band for THIS walk — the fastest honest walk
 *  still arrives before the hour, the slowest (plus slack) does not leave
 *  the line standing at the brim too long. Read-only over the zone. */
export function pilgrimageReady(w: World): boolean {
  const plan = pilgrimagePlan(w);
  if (!plan) return false;
  const band = departBand(plan.pathLen, plan.speed);
  const left = plan.cue.at - w.time;
  return left >= band.min && left <= band.max;
}

// --- the run's own state (run.data.pg) ---------------------------------------

type Phase = 'walk' | 'vigil' | 'disperse';

interface PilgrimageState {
  phase: Phase;
  ventIdx: number;
  cue: PilgrimCue;
  mouth: Vec2;
  brim: Vec2;
  /** The way up (mouth … brim) — the lead's patrol route. */
  route: Vec2[];
  setOut: number;
  arrivedAt?: number;
  /** The pace source currently stood on the members (1 = none). */
  pace: number;
  nextSolve: number;
  nextStep: number;
  offered: boolean;
  /** A dev-forced surge window this run owns (devSummonPilgrimage) — installed
   *  on the field AT the cue (never before: the surge fabric's force face
   *  opens a window "from now", so the steam must not thicken ahead of the
   *  line) and cleared when the run ends so the field hands back to its own
   *  clock. */
  forced?: { c: number; t0: number; t1: number };
  forcedOn?: boolean;
}

function stateOf(run: ActiveTheaterRun): PilgrimageState | undefined {
  return run.data.pg as PilgrimageState | undefined;
}

/** A goal no walk can reach — parks marchTick's arrival test while the
 *  pilgrimage owns its own halts (the brim is not a departure). */
const FAR_GOAL = vec(-1e6, -1e6);

/** Stand a pace on every member (the funeral's stat source, re-solved);
 *  pace 1 lifts it. The march ledger remembers it so a dissolve lifts too. */
function stampPace(w: World, m: MarchState, pace: number): void {
  for (const id of m.ids) {
    const a = w.actorById(id);
    if (!a || a.dead) continue;
    if (Math.abs(pace - 1) < 1e-6) a.sheet.removeSource('theater_march_pace');
    else a.sheet.setSource('theater_march_pace', [mod('moveSpeed', 'more', pace - 1)]);
  }
  m.pace = Math.abs(pace - 1) < 1e-6 ? undefined : pace;
}

/** THE STEP-OFF: each pilgrim reads the ONE threat resolver and, with a
 *  broil (or any telegraph) inside the horizon, takes the dodge reflex's
 *  own dive state — the feet step off the vent a breath before it blows.
 *  Draw-free (a coincident threat's exit bearing hashes off the body id). */
export function pilgrimStepOff(w: World, ids: readonly number[]): number {
  const S = C.stepOff;
  let stepped = 0;
  for (const id of ids) {
    const a = w.actorById(id);
    if (!a || a.dead || a.aiDodgeExit || a.casting || a.dash) continue;
    const t = w.imminentThreatTo(a, S.pad);
    if (!t || t.eta > S.horizon) continue;
    const d = dist(t.pos, a.pos);
    const out = d < 1 ? hash01(a.id, 1, 2) * Math.PI * 2 : angleTo(t.pos, a.pos);
    const clear = t.radius + a.radius + 8;
    a.aiDodgeRef = t.ref;
    a.aiDodgeRead = true;
    a.aiDodgeAt = w.time;
    a.aiDodgeExit = vec(t.pos.x + Math.cos(out) * clear, t.pos.y + Math.sin(out) * clear);
    a.aiDodgeUntil = w.time + Math.min(S.window, t.eta + 0.25);
    stepped++;
  }
  return stepped;
}

/** THE OFFERINGS at the brim: the pure ring of prism-crust heaps through the
 *  ONE dress path (plantDressAt → plantImpactDress → evap), and the small
 *  keyed gem beat (ONE roll per pilgrimage on the theater draw law's own
 *  keyed stream; dropGemAt seals itself under the spoils law). */
function layOfferings(w: World, run: ActiveTheaterRun, S: PilgrimageState, vent: PlacedVent): void {
  if (S.offered) return;
  S.offered = true;
  const O = C.offerings;
  const seats = offeringSeats(vent, O.count);
  let j = 0;
  for (const s of seats) {
    j++;
    if (w.walk && !w.walk.isWalkable(s.x, s.y)) continue;
    const r = O.radius[0] + hash01(Math.round(vent.pos.x), Math.round(vent.pos.y), 40 + j) * (O.radius[1] - O.radius[0]);
    w.plantDressAt(s, r, { kind: O.kind, evapAfter: [O.dwell[0], O.dwell[1]] });
  }
  const rng = theaterRng(w.manifest.seed, w.zone.id, w.theaterVisit, `${C.kind}:offering`, run.beat);
  if (rng.chance(O.gemChance)) w.dropGemAt(S.brim);
}

/** THE LINE CLOSES RANKS: a fallen lead's nearest living follower takes the
 *  route (the march ledger re-pointed, heels re-aimed) — the procession
 *  keeps walking or disperses, it never idles leaderless (THE NO-TAG LAW).
 *  Returns the new lead, or null when no one stands. */
function closeRanks(w: World, m: MarchState, S: PilgrimageState, lead: Actor | undefined): Actor | null {
  const route = S.phase === 'disperse' ? backRoute(S) : S.route;
  let best: Actor | null = null, bd = Infinity;
  for (const id of m.ids) {
    const a = w.actorById(id);
    if (!a || a.dead || a === lead) continue;
    const d = dist(a.pos, S.phase === 'vigil' ? S.brim : route[Math.min(route.length - 1, 1)]);
    if (d < bd) { bd = d; best = a; }
  }
  if (!best) return null;
  // The nearest route node ahead of the new lead is its next waypoint.
  let idx = 0, nd = Infinity;
  for (let i = 0; i < route.length; i++) {
    const d = dist(best.pos, route[i]);
    if (d < nd) { nd = d; idx = i; }
  }
  best.patrolFollow = undefined;
  if (S.phase === 'vigil') {
    best.patrolRoute = undefined;
    best.aiPost = vec(S.brim.x, S.brim.y);
    best.postSpec = { hold: true, slack: 28 };
    best.postHoming = false;
  } else {
    best.patrolRoute = route.map(p => vec(p.x, p.y));
    best.patrolIdx = Math.min(route.length - 1, idx);
  }
  for (const id of m.ids) {
    const a = w.actorById(id);
    if (!a || a.dead || a === best) continue;
    a.patrolRoute = undefined;
    a.patrolFollow = best.id;
  }
  m.lead = best.id;
  m.dissolved = false;
  return best;
}

function backRoute(S: PilgrimageState): Vec2[] {
  return S.route.slice().reverse();
}

/** The vigil ends: the line turns and walks back down the way it came;
 *  marchTick slips it away at the mouth (the silent departure). */
function disperse(w: World, m: MarchState, S: PilgrimageState, lead: Actor | undefined): void {
  S.phase = 'disperse';
  const back = backRoute(S);
  if (lead && !lead.dead) {
    lead.postSpec = undefined;
    lead.aiPost = undefined;
    lead.postHoming = false;
    lead.patrolRoute = back.map(p => vec(p.x, p.y));
    lead.patrolIdx = 1;
  }
  m.goal = vec(S.mouth.x, S.mouth.y);
  stampPace(w, m, 1);
}

// --- the kind ---------------------------------------------------------------

registerTheaterKind({
  id: C.kind,
  posture: 'replacement',
  ready: (w) => pilgrimageReady(w),
  cast: () => ({ primary: 'geyserkin' }),
  params: {},
  spawn: (w: World, run: ActiveTheaterRun) => {
    const plan = pilgrimagePlan(w, run.data.devCue as PilgrimCue | undefined);
    if (!plan) { run.done = true; return; }
    // Whole-line-or-nothing below the floor on dwell re-draws (a two-body
    // pilgrimage reads as a stroll); otherwise the line TRIMS to the pour
    // room — the budget law shapes the column, never the zone.
    const room = w.theaterPourRoom(run.def()!, run.row, run.entry);
    if (!run.entry && room < 1 + C.cast.minFollowers) { run.done = true; return; }
    const followers = run.entry ? C.cast.followers : Math.min(C.cast.followers, room - 1);
    const pace0 = paceToArrive(plan.pathLen, plan.speed, plan.cue.at - C.arrive.lead - w.time);
    const lead = marchSpawn(w, run, {
      table: C.cast.escort.slice(), leadTable: [{ id: C.cast.lead, weight: 1 }],
      followers, from: plan.mouth, to: plan.brim, via: plan.via,
      speedMul: pace0, tag: C.kind, leadJitter: 20, followJitter: 40,
    });
    if (!lead) return; // marchSpawn marked the run done when nothing poured
    const m = (run.data.marches as MarchState[])[0];
    m.goal = vec(FAR_GOAL.x, FAR_GOAL.y); // the brim is a halt, not a departure
    // THE LANTERNS: a carried lamp (breathes on the sky) + the held part.
    for (const id of m.ids) {
      const a = w.actorById(id);
      if (!a) continue;
      a.carriedLamp = { ...C.lantern };
      a.extraParts = [...(a.extraParts ?? []), { ...C.lanternPart }];
    }
    const route = [vec(plan.mouth.x, plan.mouth.y), ...plan.via.map(p => vec(p.x, p.y)), vec(plan.brim.x, plan.brim.y)];
    run.data.pg = {
      phase: 'walk', ventIdx: plan.ventIdx, cue: plan.cue, mouth: plan.mouth, brim: plan.brim,
      route, setOut: w.time, pace: pace0, nextSolve: 0, nextStep: 0, offered: false,
      forced: run.data.forced as PilgrimageState['forced'],
    } satisfies PilgrimageState;
    w.notice('a lantern line sets out across the terraces', '#ffd9a0', 14, 'world');
  },
  tick: (w: World, run: ActiveTheaterRun) => {
    const S = stateOf(run);
    const m = (run.data.marches as MarchState[] | undefined)?.[0];
    if (!S || !m) { marchTick(w, run); return; }
    const field = w.geysers;
    const vent = field?.vents[S.ventIdx];
    let lead = w.actorById(m.lead);
    // THE LINE CLOSES RANKS before the fabric's dissolve can scatter it.
    if (!lead || lead.dead) {
      const next = closeRanks(w, m, S, lead);
      if (next) lead = next;
    }
    const leadAlive = !!lead && !lead.dead;
    // THE STEP-OFF, every phase.
    if (w.time >= S.nextStep) {
      S.nextStep = w.time + C.stepOff.every;
      pilgrimStepOff(w, m.ids);
    }
    if (S.phase === 'walk' && leadAlive && lead) {
      // THE PACE SOLVE: the remaining way ÷ the seconds to the cue.
      if (w.time >= S.nextSolve) {
        S.nextSolve = w.time + C.pace.solveEvery;
        const route = lead.patrolRoute ?? S.route;
        const idx = Math.min(route.length - 1, lead.patrolIdx ?? 0);
        const remaining = routeLength(route.slice(idx), lead.pos);
        const stride = lead.sheet.get('moveSpeed') / Math.max(0.05, S.pace);
        const pace = paceToArrive(remaining, stride, S.cue.at - C.arrive.lead - w.time);
        if (Math.abs(pace - S.pace) > 0.02) { stampPace(w, m, pace); S.pace = pace; }
      }
      // ARRIVAL: the lead at the brim → the vigil (posted, offerings laid).
      if (dist(lead.pos, S.brim) < THEATER_CFG.march.arriveDist) {
        S.phase = 'vigil';
        S.arrivedAt = w.time;
        lead.patrolRoute = undefined;
        lead.patrolIdx = undefined;
        lead.aiPost = vec(S.brim.x, S.brim.y);
        lead.aiPostFacing = vent ? angleTo(S.brim, vent.pos) : lead.facing;
        lead.postSpec = { hold: true, slack: 28 };
        lead.postHoming = false;
        stampPace(w, m, 1);
        S.pace = 1;
        if (vent) layOfferings(w, run, S, vent);
      }
    } else if (S.phase === 'vigil') {
      // THE VIGIL ends with the hour — or at THE NO-TAG CEILING, whichever first.
      const over = w.time >= S.cue.end || (S.arrivedAt !== undefined && w.time - S.arrivedAt >= C.vigil.max);
      if (over) disperse(w, m, S, lead);
    }
    // THE DEV LEVER's window opens AT the cue, never before (the surge fabric's
    // force face means "from now" — steam and wisps must not run ahead of the
    // line); the real path never carries one.
    if (S.forced && !S.forcedOn && field && w.time >= S.cue.at) {
      field.surgeForce = S.forced;
      S.forcedOn = true;
    }
    marchTick(w, run);
    // A dev-forced window this run owned hands the field back when it ends.
    if (run.done && S.forced && field && field.surgeForce === S.forced) field.surgeForce = null;
  },
});

// THE ROWS — WHERE (the scald faces, through THE FACE AXIS; the terraces
// first) and HOW OFTEN per eligible beat. No hour gate: the rite follows
// the surge clock, not the sun (the lanterns simply matter more at dusk).
// Every number a DIAL.
registerTheaterRow({ id: 'pilgrimage_terraces', kind: C.kind, biomes: ['scald'], tilesets: ['sinter_terraces'], chance: 0.6 });
registerTheaterRow({ id: 'pilgrimage_fields', kind: C.kind, biomes: ['scald'], tilesets: ['geyser_fields'], chance: 0.35 });

// --- the dev lever (her walk — never a game-side call) ------------------------

/** DEV/QA: stage a pilgrimage on the CURRENT zone right now — the run is
 *  stood up directly (no beat, no row draw, no concurrency seat) carrying
 *  its OWN cue, seated where the walk fits; the surge fabric's dev face
 *  (GeyserField.surgeForce, a window "from now") is installed by the run's
 *  tick AT that cue — so the line climbs on a quiet field and the hour opens
 *  as it reaches the brim, exactly as the real clock would have it — and
 *  handed back when the run ends. Returns a status line for the dev panel. */
export function devSummonPilgrimage(w: World): string {
  const field = w.geysers;
  if (!field || !field.vents.length) return 'no vents here — mint a scald face first';
  if (w.theaterRuns.some(r => !r.done && r.kind === C.kind)) return 'a pilgrimage already walks this ground';
  if (field.surgeForce && w.time < field.surgeForce.t1) return 'the surge is already forced open — release it first';
  // Seat the cue where the walk fits (inside the departure band), then plan.
  const probe = pilgrimagePlan(w, { at: w.time + 60, end: w.time + 150, source: 'surge' });
  const lead = leadBody();
  const len = probe?.pathLen ?? 900;
  const band = departBand(len, lead.speed);
  const t0 = w.time + band.min + (band.max - band.min) * 0.4;
  const forced = { c: 0xfff, t0, t1: t0 + GEYSER_CFG.surge.dwell };
  const devCue: PilgrimCue = { at: t0, end: forced.t1, source: 'surge' };
  const row: TheaterRow = { id: 'dev_pilgrimage', kind: C.kind, chance: 1 };
  const run = new ActiveTheaterRun(w, C.kind, row, 'geyserkin', null, 0);
  run.data.forced = forced;
  run.data.devCue = devCue;
  run.spawn(w.theaterSpots);
  if (run.done) return 'the line could not form here (no reachable mouth?)';
  w.theaterRuns.push(run);
  const S = stateOf(run);
  return `a pilgrimage sets out — cue in ${Math.round(t0 - w.time)}s (${S?.route.length ?? 0} waypoints); the surge opens at the cue`;
}
