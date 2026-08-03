// ---------------------------------------------------------------------------
// ONE-OFF PROBE — THE GUARDIAN FACTION (the bandit ruling's third act) on the
// real engine: while a toll stands, the surface crew wears 'roadwarden_toll',
// a faction ABSENT from the war ledger (no RELATIONS rows at all), so every
// hostileTo read between the sleeping camp and a zone's natives — the settled
// belt's awake armed croft warden included — is false in BOTH directions by
// construction. ON PROVOCATION (the toll refused with steel: a wound past the
// GuardianSpec's woundFrac sets the rouse latch) the crew SWAPS to its true
// 'bandit' colors through THE TRUE-COLORS LAW (GuardianSpec.rousedFactionId →
// engine/ai.ts registerDormantColors, reconciled at updateAI's dormancy fork),
// freehold|bandit is LIVE again, and a warden in sight honestly JOINS that
// fight — the emergent law this probe pins as the feature it is. NEUTRAL_RESET
// cools the crew back to the calm stamp and the parley re-opens.
//
// Pins: (S) the registry rows — the calm faction registered, relation-less at
// the stance read in both orders, off WAR_PAIRS, the colors row wired, the
// tithe crew untouched; (A) a croft warden posted beside a standing camp —
// zero unprovoked violence in either direction over a long settle, the ladder
// never fed, the parley OPEN beside the warden; (A2) the CONTROL — the same
// staging with the colors row pulled and old 'bandit' stamped reproduces the
// clubbing, so the acquittal is not vacuous; (B) the ladder texture — the same
// warden still climbs stir → search → lock at a PLAYER in its cone (the watch
// fabric is intact where the camp is ignored); (C) provocation → the WHOLE
// gang rouses → true colors next tick → the crew fights, and the warden JOINS
// against the bandits; (D) the cool-down walks the crew back to calm colors
// and re-opens the parley; (E) the ordinary lifecycle — pay the toll beside a
// standing warden, the gate opens, the crew never stirs.
// Run: npx tsx balance/probe_holdfast_guardian.ts
// ---------------------------------------------------------------------------

import { bootSimEngine, classById } from '../src/sim/arena';
import { seedGlobalRandom } from '../src/sim/rng';
import { vec, angleTo } from '../src/core/math';
import { updateAI, isDormant, DORMANT_COLORS, DORMANT_TAGS, NEUTRAL_RESET } from '../src/engine/ai';
import { makeSkillInstance } from '../src/engine/skills';
import { World } from '../src/engine/world';
import type { Actor } from '../src/engine/actor';
import { makeAccount } from '../src/meta/account';
import { buildManifest } from '../src/packages/manifest';
import { HOLDFAST_DEFS, holdfastTollCost } from '../src/packages/holdfast';
import { HUB_ZONE } from '../src/data/zones';
import { SKILLS } from '../src/data/skills';
import { MONSTERS, FACTIONS, factionStance, WAR_PAIRS } from '../src/data/monsters';
import { FACTION_COLORS } from '../src/world/palette';
import { FACTION_TRAITS } from '../src/world/traits';
import { holdfastHostable } from '../src/world/zonePolicy';

bootSimEngine();
seedGlobalRandom(0x70115ead);

let failed = 0;
const check = (name: string, ok: boolean, detail = ''): void => {
  console.log(`${ok ? 'PASS' : 'FAIL'}  ${name}${detail ? ' — ' + detail : ''}`);
  if (!ok) failed++;
};

const CALM = 'roadwarden_toll';
const TRUE = 'bandit';
const TAG = 'toll_bandit';

// --- S) the registry rows (pure — no world) ----------------------------------
{
  check('S1 the calm faction is registered (roster + color + traits)',
    !!FACTIONS[CALM] && FACTION_COLORS[CALM] === '#c8a04a'
    && JSON.stringify(FACTION_TRAITS[CALM]?.contexts) === JSON.stringify(['holdfast']));
  // Relation-less at the ONE stance read, in BOTH orders, against the ledger's
  // live spread — absent means neutral means no hostile verdict either way.
  const spread = ['freehold', TRUE, 'goblin', 'undead', 'demon', 'compact', 'wild', 'sylvan'];
  const hostileHits = spread.flatMap(f => [factionStance(CALM, f), factionStance(f, CALM)])
    .filter(s => s !== 'neutral');
  check('S2 relation-less BOTH directions across the live ledger',
    hostileHits.length === 0, hostileHits.join(','));
  check('S3 never a war-zone side (WAR_PAIRS holds no row)',
    !WAR_PAIRS.some(([a, b]) => a === CALM || b === CALM));
  const colors = DORMANT_COLORS[TAG];
  check('S4 the colors row is wired by the registry loop',
    !!colors && colors.calm === CALM && colors.roused === TRUE);
  check('S5 the tag still rides the standing dormancy machinery',
    DORMANT_TAGS.has(TAG) && !!NEUTRAL_RESET[TAG]);
  const bandit = HOLDFAST_DEFS.find(d => d.id === 'bandit_tollgate')?.guardian;
  const tithe = HOLDFAST_DEFS.find(d => d.id === 'durance_tithegate')?.guardian;
  check('S6 the surface guardian wears the calm stamp + true colors',
    bandit?.factionId === CALM && bandit?.rousedFactionId === TRUE && bandit?.neutralTag === TAG);
  check('S7 durance parity: the tithe crew keeps its one allegiance (no swap row)',
    tithe?.factionId === 'durance_toll' && tithe?.rousedFactionId === undefined
    && DORMANT_COLORS['toll_fiend'] === undefined);
  check('S8 the croft warden stands (the emergent pins have their body)',
    !!MONSTERS['croft_warden'] && MONSTERS['croft_warden'].faction === 'freehold');
}

// --- the staging kit ---------------------------------------------------------

/** A quiet world with ONLY the holdfast package live (the pocket probe's
 *  makeWorld — seeds the GLOBAL stream so the walk + muster are stable). */
function makeWorld(seed: number): World {
  seedGlobalRandom(seed ^ 0x5eed);
  const account = makeAccount();
  const manifest = buildManifest(account, seed);
  for (const p of manifest.packages) p.enabled = p.id === 'holdfast';
  const world = new World(account, Object.freeze(manifest));
  world.createPlayer(classById('warrior'));
  return world;
}

/** Drive the sim the caller-driven way (updateAI is never called by
 *  World.update — the warfront idiom), sampling each tick. */
function settle(world: World, seconds: number, onTick?: () => void): void {
  const w = world as any;
  const dt = 1 / 60;
  for (let t = 0; t < seconds - 1e-9; t += dt) {
    w.applyInputs(new Map(), dt);
    for (const a of [...world.actors]) updateAI(a, world, dt);
    world.update(dt);
    onTick?.();
  }
}

interface Stage { world: World; w: any; crew: Actor[]; keeper: Actor }

/** Hop from the hub to hostable ground and raise the gate there (once);
 *  re-staging re-musters the SAME gate fresh. Culls every unrelated
 *  enemy-team body so the settles read only the actors under test. */
let stagedZone: string | null = null;
function stage(world: World): Stage | null {
  const w = world as any;
  if (stagedZone === null) {
    world.devTravelTo(HUB_ZONE);
    const seen = new Set<string>([HUB_ZONE]);
    for (let hop = 0; hop < 6; hop++) {
      const here = w.zone;
      if (holdfastHostable(here) && world.devForceHoldfast() && w.holdfastSite) {
        stagedZone = here.id;
        break;
      }
      const next = here.exits.find((e: { lock?: string; to: string }) =>
        !e.lock && e.to !== '?' && !seen.has(e.to));
      if (!next) break;
      seen.add(next.to);
      world.devTravelTo(next.to);
    }
  } else {
    world.devTravelTo(stagedZone);
    if (!(world.devForceHoldfast() && w.holdfastSite)) return null;
  }
  if (!w.holdfastSite) return null;
  const ids = new Set<number>(w.holdfastSite.banditIds as number[]);
  const kept = (world.actors as Actor[]).filter(a =>
    a.team !== 'enemy' || a.passive || !!a.construct || ids.has(a.id));
  world.actors.length = 0;
  (world.actors as Actor[]).push(...kept);
  const crew = (world.actors as Actor[]).filter(a => ids.has(a.id));
  const keeper = crew.find(a => a.id === w.holdfastSite.keeperId)!;
  if (!keeper || crew.length < 3) return null;
  // Park the hero in the far corner — outside every sense reach, so the
  // settles measure warden-vs-camp and nothing else.
  const z = w.zone;
  world.player.pos.x = keeper.pos.x < z.size.w / 2 ? z.size.w - 140 : 140;
  world.player.pos.y = keeper.pos.y < z.size.h / 2 ? z.size.h - 140 : 140;
  return { world, w, crew, keeper };
}

/** Post a croft warden on the road just off the stand, eyes on the camp —
 *  the exact collision the batch-17 body opened (senseReach covers the
 *  crew; the acquire walk never filters dormant targets). */
function plantWarden(s: Stage): Actor {
  const z = s.w.zone;
  const toCenter = angleTo(s.keeper.pos, vec(z.size.w / 2, z.size.h / 2));
  const warden = s.w.createMonster('croft_warden', Math.max(1, z.level), 'enemy') as Actor;
  warden.pos = vec(s.keeper.pos.x + Math.cos(toCenter) * 120, s.keeper.pos.y + Math.sin(toCenter) * 120);
  warden.facing = angleTo(warden.pos, s.keeper.pos);
  (s.world.actors as Actor[]).push(warden);
  return warden;
}

/** Refuse the toll with steel: real resolveHit blows on one guard until the
 *  rouse latch sets (the wound gate needs life ≤ woundFrac — never a kill). */
function provoke(s: Stage, victim: Actor): boolean {
  const hero = s.world.player;
  const inst = makeSkillInstance(SKILLS.firebolt ?? SKILLS.cleave, 1);
  hero.pos.x = victim.pos.x + 60; hero.pos.y = victim.pos.y;
  for (let i = 0; i < 12 && !victim.aiAwakened && victim.life > 0; i++) {
    seedGlobalRandom(0xc0de + i);
    s.w.resolveHit(hero, inst, victim);
  }
  return victim.aiAwakened && victim.life > 0;
}

const world = makeWorld(0x9a7e);
const first = stage(world);
check('rig: a toll gate stands on hostable ground', !!first, stagedZone ?? 'no host found');

// --- A) the sleeping camp + the warden: the both-directions acquittal --------
if (first) {
  const s = first;
  const warden = plantWarden(s);
  const crewIds = new Set(s.crew.map(a => a.id));
  let wardenLockedCrew = 0, crewLockedAny = 0, laddersFed = 0;
  settle(s.world, 30, () => {
    if (warden.aiTargetId !== undefined && crewIds.has(warden.aiTargetId)) wardenLockedCrew++;
    for (const c of s.crew) if (c.aiTargetId !== undefined) crewLockedAny++;
    if (warden.watchS > 0) laddersFed++;
  });
  check('A1 the warden NEVER locks the sleeping camp (30s settle)',
    wardenLockedCrew === 0 && !warden.aggroed, `${wardenLockedCrew} locked ticks`);
  check('A2 the camp never locks anyone back (both directions hold)',
    crewLockedAny === 0, `${crewLockedAny} locked ticks`);
  check('A3 the ladder is never even FED (no hostile verdict = no candidate)',
    laddersFed === 0 && warden.watchS === 0, `watchS ${warden.watchS.toFixed(3)}`);
  check('A4 the crew stands calm, dormant, unwounded, in calm colors',
    s.crew.every(c => !c.dead && !c.aiAwakened && isDormant(c)
      && c.faction === CALM && c.life >= c.maxLife() - 0.01));
  check('A5 the warden stands its watch alive', !warden.dead);
  check('A6 THE PARLEY IS OPEN BESIDE THE WARDEN (the whole point)',
    s.w.holdfastKeeper() === s.keeper);

  // --- B) the ladder texture: the SAME warden still climbs at a player ------
  const hero = s.world.player;
  hero.pos.x = warden.pos.x + Math.cos(warden.facing) * 150;
  hero.pos.y = warden.pos.y + Math.sin(warden.facing) * 150;
  let maxRung = 0;
  settle(s.world, 8, () => { maxRung = Math.max(maxRung, warden.watchRung); });
  check('B1 the watch fabric is intact: stir → search climbed at the player',
    maxRung >= 2, `max rung ${maxRung}`);
  check('B2 the ladder tops out in a lock (aggro pins the meter)',
    warden.aggroed && warden.aiTargetId === hero.id);
}

// --- A2) THE CONTROL: the old world reproduces the clubbing ------------------
{
  const s = stage(world);
  check('rig: control staging re-mustered', !!s);
  if (s) {
    const warden = plantWarden(s);
    const saved = DORMANT_COLORS[TAG];
    delete DORMANT_COLORS[TAG];
    for (const c of s.crew) c.faction = TRUE; // the pre-ruling stamp
    const crewIds = new Set(s.crew.map(a => a.id));
    let wardenLockedCrew = 0;
    settle(s.world, 30, () => {
      if (warden.aiTargetId !== undefined && crewIds.has(warden.aiTargetId)) wardenLockedCrew++;
    });
    const crewHarmed = s.crew.some(c => c.dead || c.life < c.maxLife() - 0.01);
    check('CTRL the old stamp IS the disease: the warden hunts the sleeping camp',
      wardenLockedCrew > 0 && crewHarmed,
      `${wardenLockedCrew} locked ticks, harmed=${crewHarmed}`);
    DORMANT_COLORS[TAG] = saved;
  }
}

// --- C) provocation → the swap → the crew fights → THE WARDEN JOINS ----------
{
  const s = stage(world);
  check('rig: provocation staging re-mustered', !!s);
  if (s) {
    const warden = plantWarden(s);
    const victim = s.crew.find(a => a.id !== s.keeper.id) ?? s.crew[1];
    const roused = provoke(s, victim);
    check('C1 a real wound sets the rouse latch (victim alive)', roused,
      `awakened=${victim.aiAwakened} life=${victim.life.toFixed(1)}/${victim.maxLife().toFixed(1)}`);
    check('C2 the WHOLE gang turns out (rouseRadius covers the stand)',
      s.crew.every(c => c.aiAwakened));
    check('C3 colors still calm at the latch instant (the stamp, not the swap)',
      s.crew.every(c => c.faction === CALM));
    settle(s.world, 0.05);
    check('C4 one AI tick later the crew stands in TRUE colors',
      s.crew.every(c => c.faction === TRUE));
    let crewLockedHero = false;
    settle(s.world, 2, () => {
      for (const c of s.crew) if (c.aiTargetId === s.world.player.id) crewLockedHero = true;
    });
    check('C5 the roused crew fights the one who refused the toll', crewLockedHero);
    // The player breaks off — and the standing war ledger does the rest.
    const z = s.w.zone;
    s.world.player.pos.x = s.keeper.pos.x < z.size.w / 2 ? z.size.w - 140 : 140;
    s.world.player.pos.y = s.keeper.pos.y < z.size.h / 2 ? z.size.h - 140 : 140;
    const crewIds = new Set(s.crew.map(a => a.id));
    const lifeAt = new Map(s.crew.map(c => [c.id, c.life]));
    const wardenLifeAt = warden.life;
    let wardenLockedCrew = false, crewLockedWarden = false;
    settle(s.world, 14, () => {
      if (warden.aiTargetId !== undefined && crewIds.has(warden.aiTargetId)) wardenLockedCrew = true;
      for (const c of s.crew) if (c.aiTargetId === warden.id) crewLockedWarden = true;
    });
    const bloodDrawn = warden.life < wardenLifeAt - 0.01
      || s.crew.some(c => c.dead || c.life < (lifeAt.get(c.id) ?? c.life) - 0.01);
    check('C6 THE EMERGENT LAW: the warden honestly joins against the bandits',
      wardenLockedCrew, `warden lock on roused crew=${wardenLockedCrew}`);
    check('C7 the joined fight is REAL (locks both ways or blood drawn)',
      (wardenLockedCrew && bloodDrawn) || crewLockedWarden,
      `wardenLocked=${wardenLockedCrew} crewLocked=${crewLockedWarden} blood=${bloodDrawn}`);
  }
}

// --- D) the cool-down: calm colors return, the parley re-opens ---------------
{
  const s = stage(world);
  check('rig: cool-down staging re-mustered', !!s);
  if (s) {
    const victim = s.crew.find(a => a.id !== s.keeper.id) ?? s.crew[1];
    const roused = provoke(s, victim);
    check('rig: cool-down provocation took', roused);
    settle(s.world, 0.05);
    check('D1 roused colors on (the pre-condition reads)',
      s.crew.every(c => c.faction === TRUE));
    const z = s.w.zone;
    s.world.player.pos.x = s.keeper.pos.x < z.size.w / 2 ? z.size.w - 140 : 140;
    s.world.player.pos.y = s.keeper.pos.y < z.size.h / 2 ? z.size.h - 140 : 140;
    settle(s.world, 16); // NEUTRAL_RESET: 8s out of combat + the retreat
    check('D2 the crew cools back to dormant (the standing reset law)',
      s.crew.every(c => !c.aiAwakened && isDormant(c)));
    check('D3 the calm stamp is BACK (the reconcile runs both directions)',
      s.crew.every(c => c.faction === CALM));
    check('D4 the parley re-opens at the same stand',
      s.w.holdfastKeeper() === s.keeper);
  }
}

// --- E) the ordinary lifecycle: pay the toll beside a standing warden --------
{
  const s = stage(world);
  check('rig: lifecycle staging re-mustered', !!s);
  if (s) {
    plantWarden(s);
    settle(s.world, 2); // the warden takes its post; the camp sleeps on
    const gdef = HOLDFAST_DEFS.find(d => d.id === s.w.holdfastSite.defId)!;
    const cost = holdfastTollCost(gdef, s.w.zone.level);
    // THE MORTAL EXCHANGE: the toll drains the paying seat's carried
    // essence at the strict rates — fund the wallet, assert the exact
    // mortal-value charge (mortalValueOf is the one appraisal read).
    s.world.grantEssence(s.world.localSeat, { essence: 'coarse', count: 500 });
    const worthBefore = s.world.mortalValueOf();
    s.world.player.pos.x = s.keeper.pos.x + 20; s.world.player.pos.y = s.keeper.pos.y;
    const paid = s.world.payHoldfastToll(-1);
    check('E1 the toll pays beside the warden (the lifecycle is untouched)',
      paid && s.world.mortalValueOf() === worthBefore - cost,
      `paid=${paid} worth=${s.world.mortalValueOf()} cost=${cost}`);
    check('E2 the gate opens', !s.w.sim.holdfastField.isLocked(stagedZone!));
    check('E3 the crew never stirred and never changed coat',
      s.crew.every(c => !c.aiAwakened && c.faction === CALM));
  }
}

console.log(failed ? `\n${failed} FAILURE(S)` : '\nPROBE HOLDFAST-GUARDIAN OK');
process.exit(failed ? 1 : 0);
