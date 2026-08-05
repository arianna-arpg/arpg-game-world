// ---------------------------------------------------------------------------
// THE THEATER FABRIC — the zone's own life expressed louder, as data.
//
// The old on-entry zone-event lane (engine/events.ts + engine/zoneEvent.ts,
// the repo's OLDEST event grammar) re-founded as a sovereign ZONE-TEXTURE
// fabric under THE RESIDENT LAW. Theater is the zone being itself, louder;
// a package is something happening TO the world. Four gates, all required:
//
//   LOCAL       — a row derives wholly from the zone's STANDING truth (owning
//                 faction, biome, contest state, camps/routes). Structural:
//                 rows are matched against TheaterContext, and the context
//                 exposes only zone-standing reads — there is no field a row
//                 could gate on world lifecycle with, and the fabric is not a
//                 WorldOverlay (it has no world-map existence at all).
//   UNANNOUNCED — theater registers no omen, no map mark, no bulletin.
//                 Structural: this module and data/theater.ts import neither
//                 world/omens nor world/bulletins (probe-scanned), and the
//                 row/kind types carry no announcement surface. The in-zone
//                 floater a kind speaks when you MEET it is the discovery
//                 voice, not an announcement.
//   BUDGET-HONEST — potency stays inside the zone's ambient envelope. Casts
//                 draw presence-banded from the owning faction's own tables
//                 at the zone's own level (World.spawnEventActor → the ONE
//                 weightedPick chokepoint), and THE POUR LEDGER caps bodies
//                 per visit: 'replacement' kinds against a band of the
//                 zone's own booted population (re-entry — the world's one
//                 repop moment — is the only refill), 'additive' kinds
//                 against an authored per-visit cap (the rift_born
//                 precedent). At cap the pour stops cleanly.
//   ARCLESS     — nothing resolves, no scar. Structural: a run has no reward
//                 verb (the old siege's "Siege broken!" payout arc died with
//                 the re-founding — bodies are ordinary bounties, the fight
//                 is the texture). Zone-memory continuity at most.
//
// THE DRAW LAW: every draw is a PURE KEYED HASH — (world seed, zone, visit,
// kind, beat) → Rng — never the global die. Kinds can't starve each other
// (the old one-shared-roll first-bite cascade is dead: each kind draws its
// own stream), skipped draws shift nothing, and a probe replays any beat
// byte-identically. Beat 0 is the entry (a remembered re-entry skips it,
// exactly as the old lane did); THE DWELL CADENCE re-draws while the player
// stays — lingering provides the world's life, as the world does not
// revolve around the player.
//
// THE CONCURRENCY LEVER: per-ground defaults (small zones hold one texture,
// a faction heartland two) folded with an EXTERNAL-WRITER SEAM
// (registerTheaterConcurrency) so a world system may push the density UP —
// density as a theme is a lever, not a cap. One seat per beat regardless:
// the zone's life arrives in breaths, not batches.
//
// Adding a kind is one registerTheaterKind (the mechanism) — a funeral
// procession, a watch change, a hunting party; WHERE/WHEN/HOW-OFTEN it
// plays is registerTheaterRow data at biome × faction × ground × hour
// grain (RadianceCond — the old chanceNight/chanceDay literals died into
// rows). Unauthored ground rolls nothing; the legacy three (siege, patrol,
// warfront's war column) re-found with today's numbers as default rows.
//
// No `World` import at runtime — kinds receive it as a TYPE (the old
// runner's law). Docs: docs/engine/theater.md.
// ---------------------------------------------------------------------------

import { rand, randInt, vec, type Vec2 } from '../core/math';
import { Rng } from '../core/rng';
import { mod } from './stats';
import type { PackTableEntry } from '../data/zones';
import { eventAllowed } from '../world/zonePolicy';
import type { RadianceCond } from '../world/radiance';
import type { Actor } from './actor';
import type { World } from './world';

/** The zone's STANDING truth — everything a row may gate on, and the whole
 *  of it (THE LOCAL GATE is this type's narrowness). Built fresh per beat:
 *  the contest state a siege reads is the state NOW, not at entry. */
export interface TheaterContext {
  /** The faction that holds this zone (faction.owner). */
  owner: string | null;
  ownerPower: number;
  /** The zone's biome, when it has one — the lever for BIOME-flavored kinds
   *  (the war column) whose ground has no faction OWNER to read. */
  biome?: string;
  /** Hostile factions staking the zone, dominant first (faction.contestants). */
  contestants: string[];
  /** A faction whose war host is pressing this zone right now, if any. */
  invader: string | null;
  hasCamps: boolean;
  /** Enough camps/POIs to walk a route. */
  hasRoute: boolean;
  /** Owner is near its home (roamers always true; rooted only within eventRange). */
  nearHome: boolean;
}

/** The zone furniture a kind's spawn() may anchor to (camps first, then
 *  points of interest — both in zone space, stashed at boot). */
export interface TheaterSpots { camps: Vec2[]; pois: Vec2[] }

/** Ground classes a row may claim (each reads the standing context only). */
export type TheaterGround = 'owned' | 'contested' | 'invaded';

/** One theater MECHANISM — how a kind forms and lives. Content, not policy:
 *  where/when/how often it plays is TheaterRow data. */
export interface TheaterKindDef {
  id: string;
  /** Budget posture: 'replacement' bodies stand in for the zone's own
   *  (per-visit cap derived from the booted population band); 'additive'
   *  bodies are extra by design (authored per-visit pour cap). */
  posture: 'replacement' | 'additive';
  /** Structural prerequisites, declarative (the old choose() predicates).
   *  All named needs must hold in the context. */
  needs?: {
    owner?: boolean;
    nearHome?: boolean;
    camps?: boolean;
    route?: boolean;
    /** An invader distinct from the owner and truly HOSTILE to it. */
    invader?: 'hostileToOwner';
  };
  /** Resolve the cast from local truth (null = can't form here). The seated
   *  ROW rides along so one generic kind can serve authored faction×biome
   *  rows (the funeral reads its cortege's faction from row.params — the
   *  war-column idiom without a kind per faction). */
  cast(ctx: TheaterContext, row?: TheaterRow): { primary: string; secondary?: string | null } | null;
  /** Default per-kind dials; row.params spread over these. */
  params?: Record<string, unknown>;
  /** Additive kinds: default per-visit pour cap (row.pourCap overrides;
   *  absent falls to THEATER_CFG.pour.additiveCap — a cap always stands). */
  pourCap?: number;
  /** END-WHEN SUGAR: 'rowCond' ends the run the moment its row's `when`
   *  stops holding (the watch change stands while night stands). THE
   *  CLOSING TICK contract: the fabric marks the run done and then calls
   *  the kind's tick ONE last time — a tick that observes `run.done ===
   *  true` is the teardown pass (revert your leans there). Kinds without
   *  endWhen never receive a done tick. */
  endWhen?: 'rowCond';
  /** OFFSTAGE: a bodiless kind (a role-shift lean, never a clump of
   *  bodies). Its live run holds NO seat in the concurrency fold — a
   *  night-long watch change must not starve the ground's one texture
   *  seat — though seating it still spends its beat, and the per-kind
   *  singleton (sameKindMax) still caps it. */
  offstage?: boolean;
  /** Lay the run onto the zone (set run.done if it can't form). */
  spawn(world: World, run: ActiveTheaterRun, spots: TheaterSpots): void;
  /** Advance it each frame; set run.done when its life is over. */
  tick(world: World, run: ActiveTheaterRun, dt: number): void;
}

/** One authored occurrence — WHERE/WHEN/HOW OFTEN a kind plays. Pure data:
 *  no handlers, no announcement surface, no world-lifecycle reads. */
export interface TheaterRow {
  id: string;
  /** The TheaterKindDef this row plays. */
  kind: string;
  /** WHERE — authored axes AND together; an omitted axis abstains. */
  biomes?: string[];
  /** Owner-faction filter (the row plays only on this faction's ground). */
  factions?: string[];
  grounds?: TheaterGround[];
  /** WHEN — the hour/weather/radiance gate (world/radiance.ts). The old
   *  chanceNight/chanceDay literals live here now, as phase rows. */
  when?: RadianceCond;
  /** Per-beat chance once eligible (the keyed draw's threshold). */
  chance: number;
  /** Pick weight among same-kind eligible rows this beat (default 1). */
  weight?: number;
  /** Kind-dial overrides, spread over the kind's params. */
  params?: Record<string, unknown>;
  /** Additive kinds: per-visit pour cap override (bodies). */
  pourCap?: number;
}

/** Shared fabric knobs (per-kind numbers live on kinds/rows). */
export const THEATER_CFG = {
  /** Toast offsets (the old ZONE_EVENT_CFG values — announce at spawn,
   *  end-line at a quiet ending). */
  announce: { dy: -70, endDy: -60 },
  /** THE DWELL CADENCE: seconds of standing in the zone per re-draw beat.
   *  Entry is beat 0; the first dwell beat fires at everySec. */
  dwell: { everySec: 90 },
  /** THE CONCURRENCY LEVER's ground defaults: base live-run cap, the
   *  heartland's wider seat (the owner standing on its OWN home ground —
   *  its origin zone or home biome, read from FACTION_TRAITS), the
   *  small-zone clamp (min arena dimension under smallDim holds `small`),
   *  and the per-kind singleton (sameKindMax). */
  concurrency: { base: 1, heartland: 2, smallDim: 1500, small: 1, sameKindMax: 1 },
  /** THE POUR LEDGER: replacement kinds cap at max(floor, bandFrac × the
   *  zone's booted counted population) bodies per visit; additive kinds at
   *  their authored cap (additiveCap when unauthored — a cap ALWAYS
   *  stands, structurally). The ENTRY beat's replacement pour is whole
   *  (the parity floor: entry behaves exactly as the old lane). */
  pour: { bandFrac: 0.5, floor: 4, additiveCap: 12 },
  /** The pass-through march: how close to its goal the lead must walk
   *  before the column slips away (must exceed the patrol AI's 40px
   *  waypoint-advance radius, or the lead loops home first); the road
   *  route picker's floor span (px — shorter road networks aren't worth
   *  a cart's walk) and waypoint stride (px between kept road discs). */
  march: { arriveDist: 44, roadMinSpan: 700, roadStep: 170 },
};

const KINDS: TheaterKindDef[] = [];
const ROWS: TheaterRow[] = [];

/** Register a theater kind (priority = registration order: sieges before
 *  patrols, as ever). Re-registering an id replaces in place (HMR-safe). */
export function registerTheaterKind(def: TheaterKindDef): void {
  const i = KINDS.findIndex(d => d.id === def.id);
  if (i >= 0) { KINDS[i] = def; return; }
  KINDS.push(def);
}

/** Register an authored occurrence row (replace-by-id, HMR-safe). */
export function registerTheaterRow(row: TheaterRow): void {
  const i = ROWS.findIndex(r => r.id === row.id);
  if (i >= 0) { ROWS[i] = row; return; }
  ROWS.push(row);
}

export function theaterKindDef(id: string): TheaterKindDef | undefined {
  return KINDS.find(d => d.id === id);
}

/** Every registered kind (QA + the policy census read this). */
export function theaterKinds(): readonly TheaterKindDef[] { return KINDS; }

/** Every authored row (QA reads this). */
export function theaterRows(): readonly TheaterRow[] { return ROWS; }

export function theaterRowsFor(kind: string): TheaterRow[] {
  return ROWS.filter(r => r.kind === kind);
}

/** QA SEAM — swap the whole row table (returns the prior table). The
 *  absent==identical probe empties it to prove unauthored ground rolls
 *  nothing; never a game-side call. */
export function swapTheaterRows(rows: TheaterRow[]): TheaterRow[] {
  const prior = ROWS.slice();
  ROWS.length = 0;
  ROWS.push(...rows);
  return prior;
}

// --- THE CONCURRENCY WRITER SEAM --------------------------------------------
// World systems may PUSH the live-run cap up (an Odyssey making density the
// very theme of its high stages). Writers fold by MAX over the ground
// default — a writer can widen the stage, never shrink it below the
// ground's own law. The seam ships proven (probe QA writer); no consumer
// ships with it — the Odyssey stays design-gated.

const CONCURRENCY_WRITERS = new Map<string, (world: World) => number | null>();

export function registerTheaterConcurrency(id: string, fn: (world: World) => number | null): void {
  CONCURRENCY_WRITERS.set(id, fn);
}

export function unregisterTheaterConcurrency(id: string): void {
  CONCURRENCY_WRITERS.delete(id);
}

/** Fold the ground default with every registered writer (max wins). */
export function theaterConcurrencyFold(world: World, groundDefault: number): number {
  let n = groundDefault;
  for (const fn of CONCURRENCY_WRITERS.values()) {
    const v = fn(world);
    if (v != null && v > n) n = v;
  }
  return n;
}

// --- Eligibility ------------------------------------------------------------

/** Do a kind's structural needs hold in this context? */
export function theaterNeedsMet(
  def: TheaterKindDef, ctx: TheaterContext,
  stance: (a: string, b: string) => string,
): boolean {
  const n = def.needs;
  if (!n) return true;
  if (n.owner && !ctx.owner) return false;
  if (n.nearHome && !ctx.nearHome) return false;
  if (n.camps && !ctx.hasCamps) return false;
  if (n.route && !ctx.hasRoute) return false;
  if (n.invader === 'hostileToOwner') {
    if (!ctx.invader || !ctx.owner || ctx.invader === ctx.owner) return false;
    if (stance(ctx.invader, ctx.owner) !== 'hostile') return false;
  }
  return true;
}

/** Does an authored row admit this ground right now? (`held` resolves the
 *  row's RadianceCond — World.radianceCondHeld bound by the caller.) */
export function theaterRowEligible(
  row: TheaterRow, ctx: TheaterContext,
  held: (cond: RadianceCond | undefined) => boolean,
): boolean {
  if (row.biomes && !(ctx.biome && row.biomes.includes(ctx.biome))) return false;
  if (row.factions && !(ctx.owner && row.factions.includes(ctx.owner))) return false;
  if (row.grounds) {
    const ok = row.grounds.some(g =>
      g === 'owned' ? !!ctx.owner
        : g === 'contested' ? ctx.contestants.length > 0
          : !!ctx.invader);
    if (!ok) return false;
  }
  return held(row.when);
}

// --- The keyed draw ---------------------------------------------------------

/** FNV-1a (the objectives.ts idiom) — the fabric's own copy, module-local. */
function hashStr(s: string): number {
  let h = 0x811c9dc5;
  for (let i = 0; i < s.length; i++) { h ^= s.charCodeAt(i); h = Math.imul(h, 0x01000193); }
  return h >>> 0;
}

/** THE DRAW LAW's stream: a pure keyed Rng — (seed, zone, visit, kind,
 *  beat) — never the global die. Same key, same draws, forever. */
export function theaterRng(seed: number, zoneId: string, visit: number, kind: string, beat: number): Rng {
  return new Rng(hashStr(`theater:${seed}:${zoneId}:${visit}:${kind}:${beat}`));
}

// --- The live run -----------------------------------------------------------

/** One live theater run — the generic runner (the old ActiveZoneEvent,
 *  ARCLESS: no reward verb exists on this surface). All of a run's actors
 *  are ordinary Actors swept by the normal dead-filter; the run itself is
 *  transient bookkeeping (never saved, never wired — co-op guests see the
 *  bodies through the ordinary actor snapshot). */
export class ActiveTheaterRun {
  done = false;
  /** Per-kind scratch — the kind owns the shape; the runner carries it. */
  data: Record<string, unknown> = {};

  constructor(
    private world: World,
    readonly kind: string,
    readonly row: TheaterRow,
    readonly primary: string,
    readonly secondary: string | null,
    /** The beat that seated this run (0 = the entry beat). */
    readonly beat: number,
  ) {}

  /** The entry beat's runs pour whole (the parity floor). */
  get entry(): boolean { return this.beat === 0; }

  /** This run's kind def (undefined only if unregistered under it). */
  def(): TheaterKindDef | undefined { return theaterKindDef(this.kind); }

  /** The kind's dials with this row's overrides spread over them. */
  params<T extends Record<string, unknown>>(): T {
    const def = theaterKindDef(this.kind);
    return { ...(def?.params ?? {}), ...(this.row.params ?? {}) } as T;
  }

  /** Lay the run onto the zone. Sets `done` immediately if it can't form
   *  (or its kind was unregistered — a stale row is a no-op). */
  spawn(spots: TheaterSpots): void {
    const def = theaterKindDef(this.kind);
    if (!def) { this.done = true; return; }
    def.spawn(this.world, this, spots);
  }

  tick(dt: number): void {
    if (this.done) return;
    const def = theaterKindDef(this.kind);
    if (!def) { this.done = true; return; }
    // END-WHEN SUGAR ('rowCond'): the run expires with its row's hour. The
    // kind's tick still runs THIS ONCE with done already true — the closing
    // tick, its teardown pass (the watch change reverts its leans there).
    if (def.endWhen === 'rowCond' && !this.world.radianceCondHeld(this.row.when)) {
      this.done = true;
    }
    def.tick(this.world, this, dt);
  }

  /** End quietly with a local line (tinted). Bookkeeping, not resolution:
   *  there is no payout verb on a theater run, by law. */
  end(msg: string, color: string): void {
    this.done = true;
    const p = this.world.player.pos;
    this.world.text(vec(p.x, p.y + THEATER_CFG.announce.endDy), msg, color, 14);
  }
}

// --- The beat ---------------------------------------------------------------

export interface TheaterBeatOpts {
  /** Beat index (0 = entry; dwell beats count up from 1). */
  beat: number;
  ctx: TheaterContext;
  spots: TheaterSpots;
  /** Live (not-done) runs already on the ground. */
  live: readonly ActiveTheaterRun[];
  /** The folded live-run cap (World.theaterConcurrencyNow). */
  concurrency: number;
  /** Mycelia suppression 0..1 (1 = unsuppressed) — the bloom smothers the
   *  beat's whole draw, as it smothered the old entry roll. */
  suppression: number;
  /** Resolve a row's RadianceCond (World.radianceCondHeld bound). */
  held: (cond: RadianceCond | undefined) => boolean;
  /** Faction stance read (data/monsters factionStance) — threaded so this
   *  module stays data-import-light at the seam probes drive. */
  stance: (a: string, b: string) => string;
}

/** Run ONE beat: kinds in priority order each draw their OWN keyed stream —
 *  a later kind can never be starved by an earlier hit (the first-bite
 *  cascade is dead) — and the beat seats at most ONE run (the first kind
 *  whose draw wins; a spawn that can't form still resolves the beat, as
 *  the old entry did). Returns the seated run (caller keeps it if it
 *  formed), or null. */
export function runTheaterBeat(world: World, o: TheaterBeatOpts): ActiveTheaterRun | null {
  // OFFSTAGE runs (bodiless leans) hold no seat in the fold — a standing
  // watch change must not starve the ground's one texture seat all night.
  const liveCount = o.live.filter(r => !r.done && !theaterKindDef(r.kind)?.offstage).length;
  if (liveCount >= o.concurrency) return null;
  if (o.suppression < 1) {
    const supRng = theaterRng(world.manifest.seed, world.zone.id, world.theaterVisit, '(sup)', o.beat);
    if (!supRng.chance(o.suppression)) return null;
  }
  for (const def of KINDS) {
    if (!eventAllowed(def.id, world.zone)) continue;
    if (o.live.filter(r => !r.done && r.kind === def.id).length >= THEATER_CFG.concurrency.sameKindMax) continue;
    if (!theaterNeedsMet(def, o.ctx, o.stance)) continue;
    const rows = theaterRowsFor(def.id).filter(r => theaterRowEligible(r, o.ctx, o.held));
    if (!rows.length) continue;
    // The kind's own stream — minted only once authored rows stand (an
    // unauthored kind draws NOTHING, so absent stays identical).
    const rng = theaterRng(world.manifest.seed, world.zone.id, world.theaterVisit, def.id, o.beat);
    const row = rows.length === 1 ? rows[0]
      : rows[weightedIdx(rows.map(r => r.weight ?? 1), rng)];
    if (!rng.chance(row.chance)) continue;
    const cast = def.cast(o.ctx, row);
    if (!cast) continue;
    // THE POUR seat-gate: a kind whose visit ledger is spent doesn't seat.
    if (world.theaterPourRoom(def, row, o.beat === 0) <= 0) continue;
    const run = new ActiveTheaterRun(world, def.id, row, cast.primary, cast.secondary ?? null, o.beat);
    run.spawn(o.spots);
    return run;
  }
  return null;
}

function weightedIdx(weights: number[], rng: Rng): number {
  let total = 0;
  for (const w of weights) total += Math.max(0, w);
  let roll = rng.range(0, total || 1);
  for (let i = 0; i < weights.length; i++) {
    roll -= Math.max(0, weights[i]);
    if (roll <= 0) return i;
  }
  return weights.length - 1;
}

// --- THE PASS-THROUGH MARCH -------------------------------------------------
// The war column's walk generalized into the fabric's mover grammar: a
// leader + escort clump ENTERS at one point, walks its line, and LEAVES at
// the far one (World.slipAway — the silent departure: no corpse, no credit).
// A lead cut down dissolves the march into a leaderless rabble (the warband
// law); bodies killed en route are ordinary bounties. Movement two's cast
// (the faction patrol's true walk, the funeral, the cart guard) rides this.

export interface MarchSpec {
  /** Escort roster (drawn presence-banded via World.spawnEventActor). */
  table: PackTableEntry[];
  /** The leader's own table (defaults to the escort table). */
  leadTable?: PackTableEntry[];
  /** Escorts asked for (trimmed to the kind's remaining pour room). */
  followers: number;
  from: Vec2;
  to: Vec2;
  /** Waypoints WALKED between from and to (the cart guard's road, a
   *  cortege's winding way) — the lead's patrol route runs them in order. */
  via?: Vec2[];
  /** The actor tag the march's bodies wear (default: the run's kind). The
   *  ledger below tracks members by ID, so a march may wear a STANDING tag
   *  ('critter' — the hunting party's prey walks straight into the
   *  standing prey lane) without confusing the sweep. */
  tag?: string;
  /** Walking pace as a fraction of full stride (the funeral's slow walk) —
   *  a 'theater_march_pace' stat source on every member, LIFTED when the
   *  march dissolves (mourners break stride when the procession shatters). */
  speedMul?: number;
  leadJitter?: number;
  followJitter?: number;
  level?: number;
}

/** One live column's ledger (run.data.marches[]): members by ID — never by
 *  tag sweep, so two clumps may share a run (the hunting party's prey +
 *  hunters) and a march may wear any standing tag. A kind that walks extra
 *  bodies with a column (the cart guard's cart) may push their ids in. */
export interface MarchState {
  lead: number;
  ids: number[];
  goal: Vec2;
  /** speedMul stood on the members (lifted once on dissolve). */
  pace?: number;
  /** The lead fell — pace lifted, stragglers mill as ordinary bodies. */
  dissolved?: boolean;
  done?: boolean;
}

function runMarches(run: ActiveTheaterRun): MarchState[] {
  return (run.data.marches ??= []) as MarchState[];
}

/** Stand a march up (appends to the run's march ledger — a run may walk
 *  several columns). Returns the lead (null when the pour ledger refuses
 *  even the lead — the beat's seat-gate makes that rare). */
export function marchSpawn(world: World, run: ActiveTheaterRun, spec: MarchSpec): Actor | null {
  const tag = spec.tag ?? run.kind;
  const level = spec.level ?? Math.max(1, world.zone.level);
  const lead = world.theaterSpawn(run, spec.leadTable ?? spec.table, level, run.primary, tag);
  if (!lead) { if (!runMarches(run).length) run.done = true; return null; }
  lead.pos = world.clampNear(spec.from, spec.leadJitter ?? 30);
  lead.patrolRoute = [vec(spec.from.x, spec.from.y),
    ...(spec.via ?? []).map(v => vec(v.x, v.y)), vec(spec.to.x, spec.to.y)];
  lead.patrolIdx = 1; // head for the far side, never back to the entry
  const ids = [lead.id];
  const room = Math.max(0, world.theaterPourRoom(run.def()!, run.row, run.entry));
  const n = run.entry ? spec.followers : Math.min(spec.followers, room);
  for (let i = 0; i < n; i++) {
    const f = world.theaterSpawn(run, spec.table, level, run.primary, tag);
    if (!f) break;
    f.pos = world.clampNear(spec.from, spec.followJitter ?? 55);
    f.patrolFollow = lead.id;
    ids.push(f.id);
  }
  if (spec.speedMul !== undefined && spec.speedMul !== 1) {
    for (const id of ids) {
      world.actorById(id)?.sheet.setSource('theater_march_pace',
        [mod('moveSpeed', 'more', spec.speedMul - 1)]);
    }
  }
  runMarches(run).push({
    lead: lead.id, ids, goal: vec(spec.to.x, spec.to.y),
    pace: spec.speedMul !== undefined && spec.speedMul !== 1 ? spec.speedMul : undefined,
  });
  return lead;
}

/** Advance every column on the run's ledger: a lead reaching its goal slips
 *  its whole column away (silent departure — they simply leave); a dead
 *  lead dissolves its column (pace lifted, the stragglers mill and fight
 *  as ordinary bodies until spent). Sets run.done when every column's
 *  ground is clear either way. */
export function marchTick(world: World, run: ActiveTheaterRun): void {
  const marches = runMarches(run);
  if (!marches.length) { run.done = true; return; }
  let allDone = true;
  for (const m of marches) {
    if (m.done) continue;
    const lead = world.actorById(m.lead);
    const leadAlive = !!lead && !lead.dead;
    if (leadAlive) {
      const dx = lead.pos.x - m.goal.x, dy = lead.pos.y - m.goal.y;
      if (Math.hypot(dx, dy) < THEATER_CFG.march.arriveDist) {
        for (const id of m.ids) {
          const a = world.actorById(id);
          if (a && !a.dead) world.slipAway(a, '');
        }
        m.done = true;
        continue;
      }
    } else if (!m.dissolved) {
      // The lead fell: the column loses cohesion (the warband law). The
      // paced walk lifts — mourners break stride when the procession
      // shatters — and the stragglers stand as ordinary bodies.
      m.dissolved = true;
      if (m.pace !== undefined) {
        for (const id of m.ids) world.actorById(id)?.sheet.removeSource('theater_march_pace');
      }
    }
    const anyAlive = m.ids.some(id => { const a = world.actorById(id); return !!a && !a.dead; });
    if (!leadAlive && !anyAlive) { m.done = true; continue; }
    allDone = false;
  }
  if (allDone) run.done = true;
}

/** THE ENDPOINT PICKER — where a pass-through column enters and leaves:
 *  two DISTINCT zone exits when the ground has them (the world.exits
 *  pairs), else one exit + the far side of the arena, else two opposed
 *  arena-edge points (the warbandDestination idiom's fallback ladder).
 *  Spawn-phase: draws ride the live die, like every cast placement. */
export function marchEndpoints(world: World): { from: Vec2; to: Vec2 } {
  const exits = world.exits;
  const edge = (ang: number): Vec2 => {
    const cx = world.arena.w / 2, cy = world.arena.h / 2;
    const reach = Math.min(world.arena.w, world.arena.h) / 2 - 80;
    return world.clampPos(vec(cx + Math.cos(ang) * reach, cy + Math.sin(ang) * reach), 16);
  };
  if (exits.length >= 2) {
    const i = randInt(0, exits.length - 1);
    let j = randInt(0, exits.length - 2);
    if (j >= i) j++;
    return { from: vec(exits[i].pos.x, exits[i].pos.y), to: vec(exits[j].pos.x, exits[j].pos.y) };
  }
  if (exits.length === 1) {
    const e = exits[0].pos;
    const cx = world.arena.w / 2, cy = world.arena.h / 2;
    const away = Math.atan2(cy - e.y, cx - e.x); // through the middle, out the far side
    return { from: vec(e.x, e.y), to: edge(away) };
  }
  const ang = rand(0, Math.PI * 2);
  return { from: edge(ang), to: edge(ang + Math.PI) };
}

/** THE ROAD ROUTE PICKER (the cart guard's lane): walk the zone's laid
 *  road bodies — the settled belt's REAL portal roads (the exitRoads /
 *  carveWay fabric leaves discs of the road kind) — as a march route: the
 *  two farthest-apart discs are the ends, the discs between (ordered by
 *  projection along the span, thinned to a stride) are the way. Pure
 *  geometry, draw-free; null when no road worth walking stands. */
export function roadWaypoints(world: World, kind = 'road'): { from: Vec2; to: Vec2; via: Vec2[] } | null {
  const discs = world.doodads.filter(d => d.kind === kind && !d.gone).map(d => d.pos);
  if (discs.length < 6) return null;
  let ai = 0, bi = 0, best = -1;
  for (let i = 0; i < discs.length; i++) {
    for (let j = i + 1; j < discs.length; j++) {
      const dx = discs[i].x - discs[j].x, dy = discs[i].y - discs[j].y;
      const d2 = dx * dx + dy * dy;
      if (d2 > best) { best = d2; ai = i; bi = j; }
    }
  }
  const from = discs[ai], to = discs[bi];
  const span = Math.sqrt(best) || 1;
  if (span < THEATER_CFG.march.roadMinSpan) return null;
  const ux = (to.x - from.x) / span, uy = (to.y - from.y) / span;
  const along = discs
    .map(p => ({ p, t: (p.x - from.x) * ux + (p.y - from.y) * uy }))
    .filter(e => e.t > 1 && e.t < span - 1)
    .sort((a, b) => a.t - b.t);
  const via: Vec2[] = [];
  let lastT = 0;
  for (const e of along) {
    if (e.t - lastT < THEATER_CFG.march.roadStep) continue;
    via.push(vec(e.p.x, e.p.y));
    lastT = e.t;
  }
  return { from: vec(from.x, from.y), to: vec(to.x, to.y), via };
}
