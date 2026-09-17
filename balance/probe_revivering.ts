// THE REVIVE RINGS (2026-09-16) — the regression rig.
//
// Her ask: a revive gave no sign of reach or progress. Every downed body a
// local hand may tend — a co-op ally awaiting the knee, a bonded beast
// awaiting its keeper — is now a dwell target like any station's
// (World.reviveTargetsView → dwellTargetsView → the base ring + the fill),
// reading the SAME accumulator its gate fires on, with reach/discipline/
// clock as transit rows. The sweep's other two: a prior run's corpse
// (corpseTargetsView) and the Hunt's tracks (huntDwellView) draw the fill
// they lacked; a litter beast's passive countdown draws its own outer ring.
// docs/engine/vendors.md (THE REVIVE RINGS); `npm run probe -- revivering`.
import { makeSimWorld } from '../src/sim/arena';
import { seedGlobalRandom } from '../src/sim/rng';
import { makeSkillInstance } from '../src/engine/skills';
import { mod } from '../src/engine/stats';
import { SKILLS } from '../src/data/skills';
import { CLASSES } from '../src/data/classes';
import { transitOf, transitDwell, transitRadius, transitRing } from '../src/data/transit';
import { NullInput } from '../src/net/intent';
import type { Actor } from '../src/engine/actor';
import type { World } from '../src/engine/world';

let passed = 0, failed = 0;
const check = (name: string, ok: unknown) => { console.log(`${ok ? 'PASS' : 'FAIL'} ${name}`); ok ? passed++ : failed++; };
const near = (a: number, b: number, eps = 0.1) => Math.abs(a - b) < eps;
const TAME = 'tame_beast';

function setup(nodes: string[] = [], seed = 60917) {
  const w = makeSimWorld('tamer', seed), p = w.player;
  for (const key of Object.keys(w.meta.baseAttrs) as (keyof typeof w.meta.baseAttrs)[]) w.meta.baseAttrs[key] = 100;
  const inst = makeSkillInstance(SKILLS.tame_beast, 20, 3);
  w.meta.knownSkills.set(inst.def.id, inst); p.skills.fill(null); p.skills[0] = inst;
  for (const id of nodes) w.pickTreeNode(inst.def.id, id);
  w.recalcPlayer();
  p.sheet.setSource('rig', [mod('mana', 'flat', 10000), mod('life', 'flat', 10000), mod('lifeRegen', 'override', 0)]);
  p.fillResources();
  return { w, p, inst, seat: w.localSeat };
}
function tick(w: World, seconds: number, acting = false) {
  for (let i = 0; i < Math.ceil(seconds * 60); i++) {
    if (acting) w.localSeat.lastActedAt = w.time; // a hand that never rests
    w.update(1 / 60);
  }
}
function pet(s: ReturnType<typeof setup>, x = 40) {
  const a = s.w.createMonster('plains_wolf', 1, 'enemy');
  a.pos = { x: s.p.pos.x + x, y: s.p.pos.y }; a.tier = s.p.tier;
  s.w.springAmbush(a, true); a.untargetable = false; a.fillResources(); s.w.actors.push(a);
  s.w.tameCompanion(s.p, a, TAME); s.w.companionBonds.refresh(); return a;
}
const target = (w: World, kind: string) => w.dwellTargetsView().find(t => t.kind === kind);
const ring = (w: World, kind: string) => w.dwellRingsView().find(r => r.kind === kind);
const at = (a: Actor, x: number, y: number) => { a.pos = { x, y }; };

const restore = seedGlobalRandom(60917);
try {
  // ---- the rows ---------------------------------------------------------------
  for (const kind of ['revive', 'revive:companion', 'revive:litter', 'hunt_tracks', 'corpse_reclaim']) {
    check(`Transit row '${kind}' is registered with a ring`, !!transitOf(kind)?.ring);
  }
  check('The revive reach and clock are the old constants, now rows', transitRadius('revive', 0) === 110 && transitDwell('revive', 0) === 1 && transitRadius('revive:companion', 0) === 110 && transitDwell('revive:companion', 0) === 1);
  check('The corpse reclaim keeps its reach and clock', transitRadius('corpse_reclaim', 0) === 110 && transitDwell('corpse_reclaim', 0) === 1);
  check('The litter clock draws OUTSIDE the tending ring', transitRing('revive:litter').radius > transitRing('revive:companion').radius);

  // ---- THE COMPANION TENDING ---------------------------------------------------------
  {
    const s = setup(), a = pet(s);
    s.w.kill(a);
    check('A slain companion is DOWNED, not dead', a.downed && !a.dead);
    at(s.p, a.pos.x + 600, a.pos.y); tick(s.w, 0.2);
    check('Out of reach: no target, no ring, no words', !target(s.w, 'revive:companion') && !ring(s.w, 'revive:companion') && !s.w.reviveHint());
    at(s.p, a.pos.x + 80, a.pos.y);
    tick(s.w, 0.5, true);
    const t0 = target(s.w, 'revive:companion');
    check('In reach but never at rest: the base ring STANDS with an empty fill', !!t0 && t0.frac === 0 && !ring(s.w, 'revive:companion'));
    check('The words stand beside it', s.w.reviveHint()?.text.includes(a.name) === true);
    // The dwell law's idle grace (0.15s after the last act) holds the fill
    // at zero before it builds — half a linger lands at 0.65s from the rest.
    tick(s.w, 0.65);
    const t1 = target(s.w, 'revive:companion'), r1 = ring(s.w, 'revive:companion');
    check('Half a linger at rest: the fill reads half', !!t1 && near(t1.frac, 0.5) && !!r1 && near(r1.frac, 0.5));
    check('The fill is the gate’s own clock (drawn == dwelt)', !!t1 && near(t1.frac, a.companionReviveDwell / transitDwell('revive:companion', 1), 0.01));
    tick(s.w, 0.6);
    check('The linger completes: the beast rises and the target is gone', !a.downed && !target(s.w, 'revive:companion') && !s.w.reviveHint());
    check('Every kind the views push has a transit row', [...s.w.dwellTargetsView(), ...s.w.dwellRingsView()].every(v => transitOf(v.kind)));
  }

  // ---- THE LITTER'S CLOCK --------------------------------------------------------------
  {
    const s = setup(['swift_claim']), a = pet(s);
    s.w.kill(a); at(s.p, a.pos.x + 700, a.pos.y);
    tick(s.w, 5);
    const r = ring(s.w, 'revive:litter');
    check('A downed litter beast counts its passive revival down on its own ring, no hand needed', !!r && near(r.frac, 0.25, 0.03) && !target(s.w, 'revive:companion'));
    tick(s.w, 15.2);
    check('The clock runs out: the beast rises and the ring is gone', !a.downed && !ring(s.w, 'revive:litter'));
  }
  {
    // Both rings on one body: the tending fill inside, the clock outside.
    const s = setup(['swift_claim']), a = pet(s);
    s.w.kill(a); at(s.p, a.pos.x + 60, a.pos.y);
    tick(s.w, 0.5);
    check('Tending a litter beast shows the fill AND the clock', !!ring(s.w, 'revive:companion') && !!ring(s.w, 'revive:litter'));
    tick(s.w, 0.6);
    check('The tending outruns the clock', !a.downed);
  }

  // ---- THE KNEE (a co-op ally) ---------------------------------------------------------
  {
    const s = setup(), cls = CLASSES.find(c => c.id === 'tamer')!;
    const ally = s.w.addSeat('p1', cls, new NullInput(), { startingCompanions: false });
    ally.actor.downed = true; ally.actor.life = 0;
    at(ally.actor, s.p.pos.x + 60, s.p.pos.y);
    tick(s.w, 0.5);
    const t = target(s.w, 'revive'), r = ring(s.w, 'revive');
    check('A downed ally in reach is a dwell target with the knee’s fill', !!t && near(t.frac, 0.5) && !!r && near(r.frac, 0.5));
    check('The fill is the per-ally clock the tick fires on', !!t && near(t.frac, (ally.reviveDwellBy.get(s.seat.id) ?? 0) / transitDwell('revive', 1), 0.01));
    check('The words name the ally', s.w.reviveHint()?.text.includes(ally.actor.name) === true);
    tick(s.w, 0.6);
    check('The knee completes: the ally rises and the target is gone', !ally.actor.downed && !target(s.w, 'revive'));
  }
  {
    const s = setup(), cls = CLASSES.find(c => c.id === 'tamer')!;
    const ally = s.w.addSeat('p1', cls, new NullInput(), { startingCompanions: false });
    ally.actor.downed = true; ally.actor.life = 0;
    at(ally.actor, s.p.pos.x + 400, s.p.pos.y);
    tick(s.w, 0.5);
    check('A downed ally out of reach shows nothing', !target(s.w, 'revive') && !ring(s.w, 'revive') && ally.actor.downed);
  }

  // ---- THE RECLAIM + THE HUNT -----------------------------------------------------------
  {
    const s = setup();
    const corpse = { pos: { x: s.p.pos.x + 50, y: s.p.pos.y }, recordIndex: 0, owner: s.seat.id, who: { classId: 'tamer', level: 1 }, dwell: 0, reclaimed: false };
    s.w.playerCorpses.push(corpse);
    tick(s.w, 0.5);
    const c = target(s.w, 'corpse_reclaim'), rc = ring(s.w, 'corpse_reclaim');
    check('A prior run’s corpse in reach draws the reclaim’s fill', !!c && near(c.frac, 0.5) && !!rc && near(rc.frac, 0.5));
    check('The fill is the reclaim’s own clock', !!c && near(c.frac, corpse.dwell / transitDwell('corpse_reclaim', 1), 0.01));
    s.w.playerCorpses.length = 0; // the reclaim itself is another rig's business
    check('No hunt, no tracks ring', s.w.huntDwellView() === null && !ring(s.w, 'hunt_tracks'));
  }
} finally { restore(); }
console.log(`\n${passed} passed, ${failed} failed`);
process.exit(failed ? 1 : 0);
