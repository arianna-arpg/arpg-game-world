// ---------------------------------------------------------------------------
// ONE-OFF PROBE — THE PARTY-LANDING LAW (World.landPartyAt + every adjusted
// arrival site). The bug this pins dead: leaving a side zone repositioned
// the SEATS alone, so a keeper's carried minions stood wherever loadZone's
// generic entry fell — the zone CENTER when no back-portal resolves
// (entryFrom null) — a county away, aggroing the shire onto the poor
// unsuspecting keeper. Pins:
//   - the law itself: the hero lands exactly at `at`; every other seat AND
//     every carried mobile minion scatters inside spread/band; enemies,
//     anchored constructs and dead bodies never move.
//   - an ALLY seat's own minion rides too (owner SEATED — not just the
//     local hero's own: the waypoint site's old gap, closed).
//   - the dials are config, not literals: PARTY_LAND_CFG.spread/band drive
//     the default scatter; clamp:false lands verbatim (open water).
//   - THE CLIMB-OUT end to end (the reported repro): summon, descend into a
//     minted side cave, climb back out through the REAL travelThrough — the
//     minion stands at the mouth beside its keeper, never at the zone
//     center, still alive in the actor list (never "lost").
//   - THE ANCHOR LAW unchanged: a deployed construct does NOT cross a zone
//     seam (constructs stay where deployed by design — the carry filter).
// Run: npx tsx balance/probe_partylanding.ts
// ---------------------------------------------------------------------------

import { bootSimEngine, makeSimWorld } from '../src/sim/arena';
import { seedGlobalRandom } from '../src/sim/rng';
import { mintCave } from '../src/engine/worldgen';
import { PARTY_LAND_CFG } from '../src/engine/world';
import { START_ZONE } from '../src/data/zones';
import { CLASSES } from '../src/data/classes';
import { NullInput } from '../src/net/intent';
import { vec } from '../src/core/math';
import type { Vec2 } from '../src/core/math';
import type { World } from '../src/engine/world';

let failed = 0;
const check = (name: string, ok: boolean, detail = ''): void => {
  console.log(`${ok ? 'PASS' : 'FAIL'}  ${name}${detail ? ' — ' + detail : ''}`);
  if (!ok) failed++;
};
const d2 = (a: Vec2, b: Vec2): number => Math.hypot(a.x - b.x, a.y - b.y);

bootSimEngine();
seedGlobalRandom(0x1a4d);

// ------------------------------------------------ A. the law's own mechanics
{
  const w: World = makeSimWorld('summoner', 0x1a4d);
  const hero = w.player;
  const cls = CLASSES.find(c => c.id !== w.meta.classDef.id) ?? CLASSES[0];
  const ally = w.addSeat('ally1', cls, new NullInput());
  const lv = Math.max(1, hero.level);
  const mine = w.createMonster('zombie', lv, 'player', hero);
  const theirs = w.createMonster('zombie', lv, 'player', ally.actor);
  const foe = w.createMonster('zombie', lv, 'enemy');
  const totem = w.createMonster('zombie', lv, 'player', hero);
  totem.construct = { kind: 'totem', range: 0, timer: 0 };
  const fallen = w.createMonster('zombie', lv, 'player', hero);
  fallen.dead = true;
  w.actors.push(mine, theirs, foe, totem, fallen);
  const far = vec(hero.pos.x + 900, hero.pos.y + 700); // parked well away, in-bounds
  for (const a of [mine, theirs, foe, totem, fallen]) a.pos = vec(far.x, far.y);

  const at = vec(w.arena.w / 2, w.arena.h / 2);
  const inBand = (a: { pos: Vec2 }, spread: number, band: readonly [number, number]): boolean =>
    Math.abs(a.pos.x - at.x) <= spread && a.pos.y >= at.y + band[0] && a.pos.y <= at.y + band[1];
  w.landPartyAt(at, { spread: 40, band: [10, 20] });
  check('A: the hero lands exactly at the mark', hero.pos.x === at.x && hero.pos.y === at.y);
  check('A: an ally SEAT rides into the band', inBand(ally.actor, 40, [10, 20]));
  check('A: the keeper\'s minion rides into the band', inBand(mine, 40, [10, 20]));
  check('A: an ALLY-owned minion rides too (owner seated, not just the local hero)',
    inBand(theirs, 40, [10, 20]));
  check('A: an enemy never moves', foe.pos.x === far.x && foe.pos.y === far.y);
  check('A: an anchored construct never moves', totem.pos.x === far.x && totem.pos.y === far.y);
  check('A: a dead minion never moves', fallen.pos.x === far.x && fallen.pos.y === far.y);

  // The defaults are the config's own envelope.
  w.landPartyAt(at);
  check('A: the default scatter honors PARTY_LAND_CFG\'s envelope',
    inBand(mine, PARTY_LAND_CFG.spread, PARTY_LAND_CFG.band)
    && inBand(theirs, PARTY_LAND_CFG.spread, PARTY_LAND_CFG.band));

  // The dials are LIVE config, not literals: zeroed, the party stacks the mark.
  const keep = { spread: PARTY_LAND_CFG.spread, band: PARTY_LAND_CFG.band };
  PARTY_LAND_CFG.spread = 0;
  PARTY_LAND_CFG.band = [0, 0];
  w.landPartyAt(at);
  check('A: zeroed PARTY_LAND_CFG dials stack the whole party on the mark',
    mine.pos.x === at.x && mine.pos.y === at.y
    && theirs.pos.x === at.x && theirs.pos.y === at.y
    && ally.actor.pos.x === at.x && ally.actor.pos.y === at.y);
  PARTY_LAND_CFG.spread = keep.spread;
  PARTY_LAND_CFG.band = keep.band;

  // clamp:false lands verbatim (open water); the default clamp pulls it in.
  const off = vec(-500, -500);
  w.landPartyAt(off, { spread: 0, band: [0, 0], clamp: false });
  check('A: clamp:false lands the party verbatim, even off the map\'s edge',
    hero.pos.x === -500 && hero.pos.y === -500 && mine.pos.x === -500);
  w.landPartyAt(off, { spread: 0, band: [0, 0] });
  check('A: the default clamp pulls the landing back onto the ground',
    hero.pos.x >= 0 && hero.pos.y >= 0 && mine.pos.x >= 0 && mine.pos.y >= 0);
}

// ------------------------------------- B. THE CLIMB-OUT (the reported repro)
{
  const w: World = makeSimWorld('summoner', 0xcafe);
  const hero = w.player;
  const field = Object.values(w.zoneMap).find(z =>
    z.id !== START_ZONE && !z.boundless && z.objective?.kind !== 'safe' && !z.port);
  check('B: the chart offers unsafe ground', !!field, field?.id ?? 'none');
  // NO `from`: entryFrom stays null — the worst case, where the generic
  // entry is the zone CENTER (the waypoint-arrival shape from the report).
  w.loadZone(field!.id);
  for (const a of w.actors) if (a.team === 'enemy') a.dead = true; // a quiet county

  const lv = Math.max(1, hero.level);
  const pet = w.createMonster('zombie', lv, 'player', hero);
  pet.pos = vec(hero.pos.x + 40, hero.pos.y);
  w.actors.push(pet);
  const totem = w.createMonster('zombie', lv, 'player', hero);
  totem.construct = { kind: 'totem', range: 0, timer: 0 };
  totem.pos = vec(hero.pos.x - 40, hero.pos.y);
  w.actors.push(totem);

  // A side cave off this ground, entered the way the mouth-dwell does it:
  // bank the way home (entryFrom NULL — arrived-by-waypoint), then load the
  // cave with the surface as `from` (the mouth idiom at enterCave).
  const surfaceArena = { w: w.arena.w, h: w.arena.h };
  const mouth = vec(Math.round(surfaceArena.w * 0.2), Math.round(surfaceArena.h * 0.2));
  const caveId = 'cave_probe_partylanding';
  w.caveMap[caveId] = mintCave(field!, 0xbeef, caveId);
  w.caveReturn = { zoneId: field!.id, pos: vec(mouth.x, mouth.y), entryFrom: null };
  w.loadZone(caveId, field!.id);
  check('B: the minion crosses INTO the side zone beside its keeper',
    w.actors.includes(pet) && d2(pet.pos, hero.pos) < 220,
    `${Math.round(d2(pet.pos, hero.pos))}u from the keeper`);
  check('B: the deployed construct stays behind BY DESIGN (the anchor law)',
    !w.actors.includes(totem));

  // THE CLIMB-OUT through the real portal step.
  const back = w.exits.find(e => e.to === field!.id);
  check('B: the cave keeps its sole way home', !!back);
  (w as unknown as { travelThrough(e: unknown): void }).travelThrough(back!);
  check('B: the climb-out lands on the surface', w.zone.id === field!.id);

  const mouthStep = vec(mouth.x, mouth.y + 40); // the open-air step off the hole
  const center = vec(w.arena.w / 2, w.arena.h / 2);
  const centerDist = d2(mouthStep, center);
  check('B: the keeper stands at the mouth, far from the generic center entry',
    d2(hero.pos, mouthStep) < Math.min(200, centerDist / 2) && centerDist > 400,
    `hero ${Math.round(d2(hero.pos, mouthStep))}u off the step; mouth↔center ${Math.round(centerDist)}u`);
  check('B: THE BUG, DEAD — the minion climbs out beside its keeper…',
    w.actors.includes(pet) && d2(pet.pos, hero.pos) <= 180,
    `${Math.round(d2(pet.pos, hero.pos))}u from the keeper`);
  check('B: …never parked at the zone\'s generic entry (the old center-park)',
    d2(pet.pos, center) > centerDist / 2,
    `${Math.round(d2(pet.pos, center))}u from center`);
  check('B: …and still alive in the actor list (never "lost")',
    !pet.dead && w.actors.filter(a => a.owner === hero && !a.dead).length === 1);
}

console.log(failed ? `\n${failed} CHECK(S) FAILED` : '\nALL CHECKS PASS');
process.exit(failed ? 1 : 0);
