// ---------------------------------------------------------------------------
// THE THEATER FABRIC's default rows — the legacy two, re-founded.
//
// The old engine/events.ts substrate kinds (SIEGE, PATROL) as TheaterKindDefs
// with TODAY'S NUMBERS as their kind params and their chanceNight/chanceDay
// literals died into RadianceCond rows (night = the clock's 'night' phase,
// exactly the old isNight read; day = the other three phases). Unauthored
// ground rolls exactly as it always did — the numbers here ARE the old
// literals, moved, not retuned. (The third legacy kind, the WAR COLUMN,
// keeps its warfront identity — data/warfront.ts — theater BY OWNERSHIP on
// warfront ground.)
//
// THE ARCLESS DELTA (the one sanctioned behavior change, documented): the
// old siege PAID on resolution — attackers wiped while defenders stood
// paid rep 10 + scaled xp + a gem drop and toasted "Siege broken!". Under
// THE RESIDENT LAW a theater run has no reward verb: the re-founded siege
// is contested ground's standing look — the fight is the texture, the
// bodies are ordinary bounties, and a spent siege simply ends. (The old
// patrol/war-column reward rows were already dead data — their ticks never
// paid; they die silently with the schema.)
//
// A new occurrence for the world's stage is ONE registerTheaterKind (its
// mechanism) + registerTheaterRow lines (where/when/how often) — no engine
// edits. Docs: docs/engine/theater.md.
// ---------------------------------------------------------------------------

import { angleTo, dist, vec, type Vec2 } from '../core/math';
import {
  marchEndpoints, marchSpawn, marchTick, registerTheaterKind, registerTheaterRow,
  roadWaypoints, THEATER_CFG,
  type ActiveTheaterRun, type MarchState, type TheaterSpots,
} from '../engine/theater';
import { FACTIONS } from './monsters';
import type { PackTableEntry } from './zones';
import type { PostSpec } from '../engine/brain';
import type { World } from '../engine/world';

function shortName(f: string): string {
  return (FACTIONS[f]?.name ?? f).replace(/^the /, '');
}

// --- SIEGE — an invader bearing down on a camp-holding owner it hates. -------
// STANDING-STATE texture, never a resolving event: while the press stands,
// the dwell cadence may re-draw the fight at the walls (budget-banded);
// each run ends quietly when a side is spent.

interface SiegeParams extends Record<string, unknown> {
  attackers: number; attackerRing: number; attackerJitter: number;
  defenders: number; defenderJitter: number;
}

registerTheaterKind({
  id: 'siege',
  posture: 'replacement',
  needs: { owner: true, camps: true, invader: 'hostileToOwner' },
  cast: ctx => ({ primary: ctx.invader!, secondary: ctx.owner }),
  params: {
    attackers: 5, attackerRing: 220, attackerJitter: 30,
    defenders: 4, defenderJitter: 60,
  } satisfies SiegeParams,
  spawn: (w: World, run: ActiveTheaterRun, spots: TheaterSpots) => {
    const p = run.params<SiegeParams>();
    const camp = spots.camps[0];
    const atkRoster = FACTIONS[run.primary];
    const defRoster = run.secondary ? FACTIONS[run.secondary] : undefined;
    if (!camp || !atkRoster || !defRoster) { run.done = true; return; }
    // Whole-cast-or-nothing: a dwell re-draw whose pour room can't stand
    // the full fight declines cleanly (half a siege reads as a bug).
    if (!run.entry && w.theaterPourRoom(run.def()!, run.row, false) < p.attackers + p.defenders) {
      run.done = true; return;
    }
    const level = Math.max(1, w.zone.level);
    for (let i = 0; i < p.attackers; i++) {
      const ang = (i / p.attackers) * Math.PI * 2;
      const a = w.theaterSpawn(run, atkRoster.table, level, run.primary, 'siege_atk');
      if (!a) break;
      a.pos = w.clampNear(vec(camp.x + Math.cos(ang) * p.attackerRing,
        camp.y + Math.sin(ang) * p.attackerRing), p.attackerJitter);
    }
    for (let i = 0; i < p.defenders; i++) {
      const d = w.theaterSpawn(run, defRoster.table, level, run.secondary!, 'siege_def');
      if (!d) break;
      d.pos = w.clampNear(camp, p.defenderJitter);
    }
    w.text(vec(w.player.pos.x, w.player.pos.y + THEATER_CFG.announce.dy),
      `${shortName(run.primary)} besiege ${shortName(run.secondary!)}!`, '#e85050', 15);
  },
  tick: (w: World, run: ActiveTheaterRun) => {
    // ARCLESS: either side spent = the fight is over. No payout, no toast —
    // the bodies were the bounty (the old "Siege broken!" arc died here).
    const attackersLeft = w.anyAliveWithTag('siege_atk', run.primary);
    const defendersLeft = w.anyAliveWithTag('siege_def', run.secondary ?? '');
    if (!attackersLeft || !defendersLeft) run.done = true;
  },
});

registerTheaterRow({ id: 'siege_night', kind: 'siege', when: { phases: ['night'] }, chance: 0.7 });
registerTheaterRow({ id: 'siege_day', kind: 'siege', when: { phases: ['dawn', 'day', 'dusk'] }, chance: 0.55 });

// --- PATROL — held home ground with a route; commoner in the dark. -----------
// The owner's own troop walking its beat between camps (today's loop walk —
// the pass-through march grammar stands ready in the fabric for movement
// two's true border-to-border walks).

interface PatrolParams extends Record<string, unknown> {
  maxWaypoints: number; followers: number; leadJitter: number; followJitter: number;
}

registerTheaterKind({
  id: 'patrol',
  posture: 'replacement',
  needs: { owner: true, nearHome: true, route: true },
  cast: ctx => ({ primary: ctx.owner! }),
  params: {
    maxWaypoints: 5, followers: 3, leadJitter: 30, followJitter: 60,
  } satisfies PatrolParams,
  spawn: (w: World, run: ActiveTheaterRun, spots: TheaterSpots) => {
    const p = run.params<PatrolParams>();
    const roster = FACTIONS[run.primary];
    const route = [...spots.camps, ...spots.pois].slice(0, p.maxWaypoints);
    if (!roster || route.length < 2) { run.done = true; return; }
    if (!run.entry && w.theaterPourRoom(run.def()!, run.row, false) < 1 + p.followers) {
      run.done = true; return;
    }
    const level = Math.max(1, w.zone.level);
    const lead = w.theaterSpawn(run, roster.table, level, run.primary, 'patrol');
    if (!lead) { run.done = true; return; }
    lead.pos = w.clampNear(route[0], p.leadJitter);
    lead.patrolRoute = route;
    lead.patrolIdx = 0;
    for (let i = 0; i < p.followers; i++) {
      const f = w.theaterSpawn(run, roster.table, level, run.primary, 'patrol');
      if (!f) break;
      f.pos = w.clampNear(route[0], p.followJitter);
      f.patrolFollow = lead.id;
    }
    w.text(vec(w.player.pos.x, w.player.pos.y + THEATER_CFG.announce.dy),
      `a ${shortName(run.primary)} patrol`, '#c8b06b', 14);
  },
  tick: (w: World, run: ActiveTheaterRun) => {
    // The patrol is simply faction troops; clearing them ends it quietly.
    if (!w.anyAliveWithTag('patrol', run.primary)) run.done = true;
  },
});

registerTheaterRow({ id: 'patrol_night', kind: 'patrol', when: { phases: ['night'] }, chance: 0.6 });
registerTheaterRow({ id: 'patrol_day', kind: 'patrol', when: { phases: ['dawn', 'day', 'dusk'] }, chance: 0.4 });

// ============================================================================
// THE CAST (movement two) — five occurrences on the standing grammar. Every
// one obeys the resident law's four gates: LOCAL (rows over the standing
// context only), UNANNOUNCED (the spawn floater is the discovery voice, the
// patrol's own idiom), BUDGET-HONEST (every body pours through theaterSpawn;
// the hunting party is the additive lane's first shipped consumer), ARCLESS
// (marches slip away or dissolve; the watch change reverts on its closing
// tick — nothing resolves, nothing pays).
// ============================================================================

// --- THE TROOP MARCH (the true walk) -----------------------------------------
// The owning faction's own kin stomping briefly through their claimed ground
// — a miniature migration, local and unannounced: enters at one exit, walks
// the zone, leaves at another (marchEndpoints — the warbandDestination
// ladder). Leaders are authored per faction (the grind_bannerman precedent);
// a faction without a leads table is led from its own roster.

const MARCH_LEADS: Record<string, PackTableEntry[]> = {
  goblin: [{ id: 'goblin_chief', weight: 1 }, { id: 'goblin_brute', weight: 0.5 }],
  undead: [{ id: 'hollow_bannerman', weight: 1 }, { id: 'skeleton_warrior', weight: 0.5 }],
};

interface TroopMarchParams extends Record<string, unknown> {
  followers: number; leadJitter: number; followJitter: number;
}

registerTheaterKind({
  id: 'troop_march',
  posture: 'replacement',
  needs: { owner: true, nearHome: true },
  cast: ctx => ({ primary: ctx.owner! }),
  params: { followers: 4, leadJitter: 30, followJitter: 60 } satisfies TroopMarchParams,
  spawn: (w: World, run: ActiveTheaterRun) => {
    const p = run.params<TroopMarchParams>();
    const roster = FACTIONS[run.primary];
    if (!roster) { run.done = true; return; }
    // Whole-column-or-nothing on dwell re-draws (the patrol's own manner).
    if (!run.entry && w.theaterPourRoom(run.def()!, run.row, false) < 1 + p.followers) {
      run.done = true; return;
    }
    const ends = marchEndpoints(w);
    const lead = marchSpawn(w, run, {
      table: roster.table, leadTable: MARCH_LEADS[run.primary],
      followers: p.followers, from: ends.from, to: ends.to,
      leadJitter: p.leadJitter, followJitter: p.followJitter,
    });
    if (!lead) return;
    w.text(vec(w.player.pos.x, w.player.pos.y + THEATER_CFG.announce.dy),
      `a ${shortName(run.primary)} column passes through`, '#c8b06b', 14);
  },
  tick: (w: World, run: ActiveTheaterRun) => { marchTick(w, run); },
});

registerTheaterRow({ id: 'troop_march_night', kind: 'troop_march', when: { phases: ['night'] }, chance: 0.35 });
registerTheaterRow({ id: 'troop_march_day', kind: 'troop_march', when: { phases: ['dawn', 'day', 'dusk'] }, chance: 0.25 });

// --- THE FUNERAL PROCESSION --------------------------------------------------
// The dead country buries its own: a censer-bearer leads a slow cortege
// (MarchSpec.speedMul — the walk IS the read) from one gate to the other.
// Thematically gated by faction × biome rows, exactly as ratified: the
// gravelands yes, the Garden no; the Undead keep funerals, the Goblins
// never will. A shattered cortege breaks stride (the pace source lifts on
// dissolve) and mills as ordinary bodies.

const FUNERAL_CORTEGE: Record<string, { lead: PackTableEntry[]; escort: PackTableEntry[] }> = {
  undead: {
    lead: [{ id: 'thurible_bearer', weight: 1 }],
    escort: [
      { id: 'skeleton_warrior', weight: 3 },
      { id: 'zombie', weight: 2 },
      { id: 'gloomling', weight: 1 },
    ],
  },
};

interface FuneralParams extends Record<string, unknown> {
  faction?: string; mourners: number; speedMul: number;
}

registerTheaterKind({
  id: 'funeral',
  posture: 'replacement',
  cast: (ctx, row) => {
    const f = (row?.params?.faction as string | undefined) ?? ctx.owner;
    return f && FUNERAL_CORTEGE[f] ? { primary: f } : null;
  },
  params: { mourners: 4, speedMul: 0.55 } satisfies FuneralParams,
  spawn: (w: World, run: ActiveTheaterRun) => {
    const p = run.params<FuneralParams>();
    const cortege = FUNERAL_CORTEGE[run.primary];
    if (!cortege) { run.done = true; return; }
    if (!run.entry && w.theaterPourRoom(run.def()!, run.row, false) < 1 + p.mourners) {
      run.done = true; return;
    }
    const ends = marchEndpoints(w);
    const lead = marchSpawn(w, run, {
      table: cortege.escort, leadTable: cortege.lead,
      followers: p.mourners, from: ends.from, to: ends.to,
      speedMul: p.speedMul, followJitter: 44,
    });
    if (!lead) return;
    w.text(vec(w.player.pos.x, w.player.pos.y + THEATER_CFG.announce.dy),
      'a funeral procession winds past', '#b0a8d0', 14);
  },
  tick: (w: World, run: ActiveTheaterRun) => { marchTick(w, run); },
});

registerTheaterRow({
  id: 'funeral_gravelands', kind: 'funeral',
  biomes: ['grave', 'ossuary', 'sepulcher'], chance: 0.3,
  params: { faction: 'undead' },
});

// --- THE HUNTING PARTY (the local migratory burst) ---------------------------
// Prey ENTERS from an edge and crosses — the burst IS the supply, so the
// zone's own wildlife is never depleted by construction (the additive lane;
// the pour cap prices the whole visit). A hunter clump follows on its
// heels, and the zone's own predators join free through the standing
// hunger-drive fabric: the prey wears the ordinary 'critter' tag, so every
// wolf that was already here reads the herd as food. (Her recorded
// alternative — first X pay normal, then treated-as-summoned — remains a
// documented optional per-kind lever shape, deliberately unbuilt.)

interface HuntParams extends Record<string, unknown> {
  faction: string;
  prey: PackTableEntry[]; hunters: PackTableEntry[];
  preyCount: number; hunterCount: number;
}

registerTheaterKind({
  id: 'hunting_party',
  posture: 'additive',
  pourCap: 10,
  cast: (_ctx, row) => ({ primary: (row?.params?.faction as string | undefined) ?? 'beast' }),
  params: { faction: 'beast', prey: [], hunters: [], preyCount: 4, hunterCount: 2 } satisfies HuntParams,
  spawn: (w: World, run: ActiveTheaterRun) => {
    const p = run.params<HuntParams>();
    if (!p.prey.length) { run.done = true; return; }
    const ends = marchEndpoints(w);
    const prey = marchSpawn(w, run, {
      table: p.prey, followers: Math.max(0, p.preyCount - 1),
      from: ends.from, to: ends.to, tag: 'critter', followJitter: 70,
    });
    if (!prey) return;
    if (p.hunters.length && p.hunterCount > 0) {
      marchSpawn(w, run, {
        table: p.hunters, followers: Math.max(0, p.hunterCount - 1),
        from: ends.from, to: ends.to, tag: 'hunting_party',
        leadJitter: 90, followJitter: 60,
      });
    }
    w.text(vec(w.player.pos.x, w.player.pos.y + THEATER_CFG.announce.dy),
      'a hunted herd breaks past — something follows', '#c8a850', 14);
  },
  tick: (w: World, run: ActiveTheaterRun) => { marchTick(w, run); },
});

registerTheaterRow({
  id: 'hunt_north', kind: 'hunting_party', biomes: ['taiga', 'tundra'], chance: 0.3,
  params: {
    prey: [{ id: 'snow_hare', weight: 3 }, { id: 'taiga_elk', weight: 2 }],
    hunters: [{ id: 'plains_wolf', weight: 1 }],
  },
});
registerTheaterRow({
  id: 'hunt_wood', kind: 'hunting_party', biomes: ['forest', 'grove'], chance: 0.3,
  params: {
    prey: [{ id: 'roe_deer', weight: 3 }, { id: 'meadow_hare', weight: 2 }],
    hunters: [{ id: 'plains_wolf', weight: 2 }, { id: 'lynx', weight: 1 }],
  },
});

// --- THE CART GUARD (the farmland cousin — the toll patrol stays HELD) -------
// Farmers and holdfast kin guarding their carts and walking their claimed
// road: the march rides the settled belt's REAL laid roads (roadWaypoints
// walks the road bodies the fields recipe carved), a warden leads, and the
// cart itself — a driven body, no brain — is wheeled by this kind's tick at
// the column's heel (the procession steering idiom). No road worth walking,
// no cart today. Guards spent on the lane leave the cart standing abandoned
// where it stopped — the ground keeps the story, the run lets it go.

interface CartGuardParams extends Record<string, unknown> {
  guards: number; speedMul: number; cartPace: number; trail: number;
  roadKind: string; cartId: string;
}

registerTheaterKind({
  id: 'cart_guard',
  posture: 'replacement',
  cast: () => ({ primary: 'freehold' }),
  params: {
    guards: 3, speedMul: 0.5, cartPace: 0.9, trail: 64,
    roadKind: 'road', cartId: 'caravan_cart',
  } satisfies CartGuardParams,
  spawn: (w: World, run: ActiveTheaterRun) => {
    const p = run.params<CartGuardParams>();
    const route = roadWaypoints(w, p.roadKind);
    if (!route) { run.done = true; return; }
    if (!run.entry && w.theaterPourRoom(run.def()!, run.row, false) < 2 + p.guards) {
      run.done = true; return;
    }
    const lead = marchSpawn(w, run, {
      table: [{ id: 'croft_warden', weight: 2 }, { id: 'crofter', weight: 1 }],
      leadTable: [{ id: 'village_warden', weight: 1 }],
      followers: p.guards, from: route.from, to: route.to, via: route.via,
      speedMul: p.speedMul, followJitter: 48,
    });
    if (!lead) return;
    const cart = w.theaterSpawn(run, [{ id: p.cartId, weight: 1 }],
      Math.max(1, w.zone.level), run.primary, run.kind);
    if (cart) {
      cart.pos = w.clampNear(route.from, 40);
      run.data.cartId = cart.id;
      // The cart walks IN the column's ledger: arrival slips it away with
      // the guards; a dead cart counts as gone like any member.
      (run.data.marches as MarchState[])[0]?.ids.push(cart.id);
    }
    w.text(vec(w.player.pos.x, w.player.pos.y + THEATER_CFG.announce.dy),
      'a freehold cart takes the lane', '#d8b46a', 14);
  },
  tick: (w: World, run: ActiveTheaterRun, dt: number) => {
    const p = run.params<CartGuardParams>();
    const m = (run.data.marches as MarchState[] | undefined)?.[0];
    const cartId = run.data.cartId as number | undefined;
    const cart = cartId !== undefined ? w.actorById(cartId) : undefined;
    if (m && cart && !cart.dead) {
      const lead = w.actorById(m.lead);
      if (lead && !lead.dead) {
        // Wheel the cart at the column's heel (the procession steering
        // idiom: straight where the line is clean, flow-field around walls).
        if (dist(cart.pos, lead.pos) > p.trail) {
          const pf = w.pathField();
          let to: Vec2 = lead.pos;
          if (pf?.pathStep && !(pf.lineWalkable?.(cart.pos, lead.pos) ?? false)) {
            to = pf.pathStep(cart.pos, lead.pos) ?? lead.pos;
          }
          cart.facing = angleTo(cart.pos, to);
          w.moveActor(cart, to.x - cart.pos.x, to.y - cart.pos.y, dt * p.cartPace);
        }
      } else if (m.dissolved) {
        // The guard is spent: the cart stands abandoned on the lane. Strip
        // it from the ledger so the run can end while the wreck-to-be keeps
        // the story on the ground.
        const i = m.ids.indexOf(cart.id);
        if (i >= 0) m.ids.splice(i, 1);
        run.data.cartId = undefined;
      }
    }
    marchTick(w, run);
  },
});

registerTheaterRow({
  id: 'cart_guard_day', kind: 'cart_guard', biomes: ['farmland'],
  when: { phases: ['dawn', 'day', 'dusk'] }, chance: 0.45,
});

// --- THE WATCH CHANGE (roles shift with the hour — nobody poofs) -------------
// Her ruling verbatim: NO poof-in/out — the SAME faction's standing bodies
// shift ROLES as the hour turns, authored faction-dependent (or biome-AND-
// faction), never universal. A BODILESS kind: spawn touches nothing, the
// run holds no concurrency seat (offstage), and its tick applies a
// REVERSIBLE lean on matching standing bodies through the duty-post fabric
// alone (postSpec + aiPost — brain.ts machinery, no new levers): the folk
// head in to the hearths, the watch walks out to the night posts. The lean
// is DRAW-FREE (posts assigned round-robin, seats derived from actor ids —
// a tick must never move the global die), and the run's end reverts every
// body it touched: endWhen 'rowCond' expires the run with its hour, and
// the closing tick is the revert pass. Zone teardown is leak-free by
// construction: no lean field rides zone memory.

interface WatchLean {
  /** Which of the faction's bodies this lean moves (def ids). */
  defs: string[];
  /** Where they go: the boot-stashed camp or POI spots. */
  at: 'camps' | 'pois';
  /** true = stand the watch at the post; false = mill about it. */
  hold?: boolean;
  slack?: number;
}

interface WatchParams extends Record<string, unknown> {
  faction?: string; sweepSec: number; leans: WatchLean[];
}

interface LeanEntry {
  id: number; aiPost?: Vec2; aiPostFacing?: number; postSpec?: PostSpec;
}

registerTheaterKind({
  id: 'watch_change',
  posture: 'replacement',
  offstage: true,
  endWhen: 'rowCond',
  cast: (ctx, row) => {
    const f = (row?.params?.faction as string | undefined) ?? ctx.owner;
    return f ? { primary: f } : null;
  },
  params: { sweepSec: 1.5, leans: [] } satisfies WatchParams,
  spawn: (_w: World, run: ActiveTheaterRun, spots: TheaterSpots) => {
    // Bodiless: nothing spawns, ever. Stash the spot lists for the tick's
    // post assignment (spots are handed only here).
    run.data.spots = {
      camps: spots.camps.map(c => vec(c.x, c.y)),
      pois: spots.pois.map(c => vec(c.x, c.y)),
    };
  },
  tick: (w: World, run: ActiveTheaterRun) => {
    const ledger = (run.data.leans ??= []) as LeanEntry[];
    if (run.done) {
      // THE CLOSING TICK (endWhen 'rowCond'): the hour turned — revert
      // every lean exactly (the prior post, facing and spec, byte for
      // byte; the duty-post walk carries each body home).
      for (const e of ledger) {
        const a = w.actorById(e.id);
        if (a && !a.dead) {
          a.aiPost = e.aiPost;
          a.aiPostFacing = e.aiPostFacing;
          a.postSpec = e.postSpec;
          a.postHoming = false;
        }
      }
      ledger.length = 0;
      return;
    }
    const p = run.params<WatchParams>();
    const next = (run.data.nextSweep as number | undefined) ?? 0;
    if (w.time < next) return;
    run.data.nextSweep = w.time + p.sweepSec;
    const spots = run.data.spots as TheaterSpots | undefined;
    if (!spots || !p.faction) return;
    const seen = new Set(ledger.map(e => e.id));
    let posted = (run.data.postedCount as number | undefined) ?? 0;
    for (const lean of p.leans) {
      const at = lean.at === 'pois' ? spots.pois : spots.camps;
      if (!at.length) continue;
      for (const a of w.actors) {
        if (a.dead || a.owner || seen.has(a.id)) continue;
        if (a.faction !== p.faction || !a.defId || !lean.defs.includes(a.defId)) continue;
        ledger.push({ id: a.id, aiPost: a.aiPost, aiPostFacing: a.aiPostFacing, postSpec: a.postSpec });
        seen.add(a.id);
        // Round-robin over the spots; the seat around each derives from
        // the actor's own id — deterministic, draw-free.
        const s = at[posted % at.length];
        posted++;
        const ang = ((a.id % 16) / 16) * Math.PI * 2;
        const r = 24 + (a.id % 3) * 9;
        a.aiPost = w.clampPos(vec(s.x + Math.cos(ang) * r, s.y + Math.sin(ang) * r), 16);
        a.aiPostFacing = ang;
        a.postSpec = { hold: lean.hold !== false, slack: lean.slack ?? 48 };
        a.postHoming = false;
      }
    }
    run.data.postedCount = posted;
  },
});

registerTheaterRow({
  id: 'watch_change_freehold', kind: 'watch_change', biomes: ['farmland'],
  when: { phases: ['night'] }, chance: 1,
  params: {
    faction: 'freehold',
    leans: [
      // The folk head in to the hearths; the watch walks out to the posts.
      { defs: ['crofter'], at: 'camps', hold: false },
      { defs: ['village_warden', 'croft_warden'], at: 'pois', hold: true },
    ],
  },
});
