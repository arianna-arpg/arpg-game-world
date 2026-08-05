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

import { vec } from '../core/math';
import {
  registerTheaterKind, registerTheaterRow, THEATER_CFG,
  type ActiveTheaterRun, type TheaterSpots,
} from '../engine/theater';
import { FACTIONS } from './monsters';
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
