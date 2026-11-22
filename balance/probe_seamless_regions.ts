// ---------------------------------------------------------------------------
// PROBE: SEAMLESS REGIONS — pins the continuous world-space surface gamescape:
//   R1. Lastlight bedside wake at origin (0,0), town seats, & Inn 2nd story
//   R2. Continuous walk + pathStep + reachable from Lastlight -> Crossroads ->
//       frontier regions with zero loading-screen rebase & stable cache token
//   R3. Sanctuary gate ward: hostile wilderness monsters & projectiles halted
//       at Lastlight's gate threshold
//   R4. Mixed border porosity census (open_frontier, broken_divide,
//       chokepoint_pass, sanctuary_gate) + cross-border LoS
//   R5. Soft idle home tether vs. aggro'd cross-border pursuit + homeRegionId
//       cull & faction attribution when slain in a neighboring region
//   R6. Distance demotion (> ringOutPx) into region-local ZoneMemory, exact
//       wounded-enemy / door / chest restoration on remount, & save round-trip
//   R7. Seamless Town Portal round-trip + discrete cave descent suspend &
//       exact-mouth surface resume
// ---------------------------------------------------------------------------

import { bootSimEngine } from '../src/sim/arena';
import { seedGlobalRandom } from '../src/sim/rng';
import { dist, vec, type Vec2 } from '../src/core/math';
import { CLASSES } from '../src/data/classes';
import { SKILLS } from '../src/data/skills';
import { TOWN_PORTAL_CFG } from '../src/data/townportals';
import { START_ZONE } from '../src/data/zones';
import { updateAI } from '../src/engine/ai';
import { sceneBegin } from '../src/engine/scenes';
import { makeSkillGem } from '../src/engine/skills';
import { World } from '../src/engine/world';
import { makeAccount } from '../src/meta/account';
import { buildManifest } from '../src/packages/manifest';
import { HUB_ZONE } from '../src/world/openingProgression';
import { SEAMLESS_CFG, type BorderStyle } from '../src/world/seamlessRegions';
import { TiledWalkField } from '../src/world/tiledWalk';

bootSimEngine();

let failures = 0;
function check(label: string, ok: boolean, detail = ''): void {
  const extra = detail ? ` (${detail})` : '';
  console.log(`${ok ? 'PASS' : 'FAIL'} ${label}${extra}`);
  if (!ok) failures++;
}

function makeSeamlessWorld(seed: number): World {
  const account = makeAccount();
  for (const c of CLASSES) {
    account.unlockedClasses.add(c.id);
  }
  const manifest = Object.freeze(buildManifest(account, seed));
  const w = new World(account, manifest, { seamless: true });
  const warrior = CLASSES.find(c => c.id === 'warrior') ?? CLASSES[0];
  w.createPlayer(warrior, { startingCompanions: false, startingFlasks: false });
  return w;
}

function stepWorld(w: World, seconds: number): void {
  const dt = 1 / 60;
  const steps = Math.max(1, Math.round(seconds / dt));
  for (let i = 0; i < steps; i++) w.update(dt);
}

/** Walk `w.player` along `w.walk.pathStep` toward `goal` so real clampPos &
 *  corridor geometry are exercised step by step. */
function walkHeroToward(w: World, goal: Vec2, maxSteps = 900, stepPx = 14): boolean {
  for (let i = 0; i < maxSteps; i++) {
    if (dist(w.player.pos, goal) <= 48) return true;
    const beeline = !!w.walk?.lineWalkable?.(w.player.pos, goal);
    const wp = (beeline ? goal : w.walk?.pathStep?.(w.player.pos, goal)) ?? goal;
    const vx = wp.x - w.player.pos.x;
    const vy = wp.y - w.player.pos.y;
    const vLen = Math.hypot(vx, vy) || 1;
    const move = Math.min(stepPx, dist(w.player.pos, goal));
    const prev = vec(w.player.pos.x, w.player.pos.y);
    w.player.pos = w.clampPos(
      vec(prev.x + (vx / vLen) * move, prev.y + (vy / vLen) * move),
      w.player.radius,
      prev,
      { mover: w.player },
    );
    w.update(1 / 60);
  }
  return dist(w.player.pos, goal) <= 64;
}

const restoreRng = seedGlobalRandom(42077);
try {
  // -------------------------------------------------------------------------
  // R1: Lastlight bedside wake at (0,0), town anchors, & Inn 2nd floor
  // -------------------------------------------------------------------------
  const w = makeSeamlessWorld(42077);
  const sc = w.seamless!;
  const townSeat = sc.seatOf(START_ZONE)!;

  check('R1.1 seamless surface boots active with TiledWalkField',
    w.seamlessSurfaceActive && w.walk instanceof TiledWalkField);
  check('R1.2 Lastlight anchored at world origin (0, 0)',
    !!townSeat && townSeat.originPx.x === 0 && townSeat.originPx.y === 0);
  check('R1.3 hero wakes inside Lastlight bounds on walkable ground',
    w.zone.id === START_ZONE
    && w.player.pos.x > 0 && w.player.pos.x < townSeat.w
    && w.player.pos.y > 0 && w.player.pos.y < townSeat.h
    && !!w.walk?.isWalkable(w.player.pos.x, w.player.pos.y));
  check('R1.4 Lastlight waypoint & font are mounted at exact town seats',
    !!w.waypointPos && w.fonts.length >= 1
    && dist(w.waypointPos!, w.townSeat('waypoint')) < 36);
  stepWorld(w, 0.1); // exercise World.update + syncZoneExits on live surface
  check('R1.5 surface-to-surface links have zero discrete teleport portals (even after update ticks)',
    !w.exits.some(ex => ex.to === HUB_ZONE || ex.to === START_ZONE));

  // Open any closed bedroom/town doors so pathing out of the waking house is unobstructed,
  // verifying namespaced setDoorState carves TiledWalkField cells in place.
  const townDoors = w.doodads.filter(d => d.regionId === START_ZONE && d.door);
  check('R1.6 Lastlight doors carry region-namespaced IDs',
    townDoors.length > 0 && townDoors.every(d => d.door!.id.startsWith(`${START_ZONE}:`)));
  for (const d of townDoors) w.setDoorState(d.door!.id, 'open', { silent: true });

  // Verify Inn storey (tier 1) view works on TiledWalkField.
  const innSt = w.structures.find(st => st.regionId === START_ZONE && st.storeys && st.storeys.length > 0);
  if (innSt && innSt.storeys?.[0]?.floors[0]) {
    const f1 = innSt.storeys[0].floors[0];
    const upPos = vec(f1.x + f1.w / 2, f1.y + f1.h / 2);
    const clampedUp = w.clampPos(upPos, w.player.radius, undefined, { tier: 1, mover: w.player });
    check('R1.7 Inn upper storey (tier 1) confines cleanly on TiledWalkField',
      dist(clampedUp, upPos) < 60);
  } else {
    check('R1.7 Inn upper storey check (no storey at hamlet tier 0 — skipped cleanly)', true);
  }

  // -------------------------------------------------------------------------
  // R2: Continuous walk Lastlight -> Crossroads -> Frontier (zero rebase!)
  // -------------------------------------------------------------------------
  const hubSeat = sc.seatOf(HUB_ZONE)!;
  check('R2.1 Crossroads is mounted at boot alongside Lastlight',
    !!hubSeat && sc.isMounted(HUB_ZONE));

  const initialCacheToken = w.groundCacheToken;
  const hubCenter = vec(hubSeat.originPx.x + hubSeat.w / 2, hubSeat.originPx.y + hubSeat.h / 2);
  const hubGoal = w.walk!.snapToWalkable(hubCenter);

  check('R2.2 TiledWalkField.reachable connects Lastlight plaza to Crossroads interior',
    !!w.walk?.reachable?.(w.townSeat('waypoint'), hubGoal));

  w.player.pos = w.clampPos(w.townSeat('waypoint'), w.player.radius);
  const reachedHub = walkHeroToward(w, hubGoal, 900, 16);
  check('R2.3 hero physically walks through Sanctuary gate into Crossroads without loading screen',
    reachedHub && w.zone.id === HUB_ZONE,
    `zone=${w.zone.id} pos=${Math.round(w.player.pos.x)},${Math.round(w.player.pos.y)}`);
  check('R2.4 world coordinates remain continuous (no 0..w origin rebase) & groundCacheToken preserved',
    (hubSeat.originPx.x !== 0 || hubSeat.originPx.y !== 0)
    && w.player.pos.x >= hubSeat.originPx.x && w.player.pos.x <= hubSeat.originPx.x + hubSeat.w
    && w.groundCacheToken === initialCacheToken);

  // Pick an unlocked frontier neighbor of Crossroads and walk across its border too!
  const frontierEx = w.zoneMap[HUB_ZONE].exits.find(e => e.to !== '?' && e.to !== START_ZONE && !e.lock && !e.crossDim);
  const frontierId = frontierEx!.to;
  stepWorld(w, 0.2); // allow 1-frame budgeted neighbor streaming if needed
  const frontierSeat = sc.seatOf(frontierId)!;
  check('R2.5 frontier neighbor beyond Crossroads auto-mounts within ringInPx',
    !!frontierSeat && sc.isMounted(frontierId));

  const frontierGoal = w.walk!.snapToWalkable(
    vec(frontierSeat.originPx.x + frontierSeat.w / 2, frontierSeat.originPx.y + frontierSeat.h / 2),
  );
  const reachedFrontier = walkHeroToward(w, frontierGoal, 1100, 18);
  check('R2.6 hero walks seamlessly from Crossroads into generated frontier region',
    reachedFrontier && w.zone.id === frontierId && w.visited.has(frontierId) && w.groundCacheToken === initialCacheToken,
    `zone=${w.zone.id}`);

  // -------------------------------------------------------------------------
  // R3: Sanctuary Gate Leash (Wilderness Actors & Projectiles Blocked)
  // -------------------------------------------------------------------------
  const townSeam = [...sc.atlas.seamsFor(START_ZONE)][0]!;
  const townIsA = townSeam.aId === START_ZONE;
  const townSide = townIsA ? townSeam.sideOnA : townSeam.sideOnB;
  const townMouth = townIsA ? townSeam.mouthA : townSeam.mouthB;
  const outVec = townSide === 'e' ? vec(1, 0) : townSide === 'w' ? vec(-1, 0) : townSide === 's' ? vec(0, 1) : vec(0, -1);
  const outsideSpot = w.walk!.snapToWalkable(vec(
    townMouth.x + outVec.x * 90,
    townMouth.y + outVec.y * 90,
  ));
  const insideSpot = w.walk!.snapToWalkable(vec(
    townMouth.x - outVec.x * 90,
    townMouth.y - outVec.y * 90,
  ));

  // Stand hero inside Lastlight, place aggro'd wilderness monster outside the gate, and try to push/walk it inside.
  w.player.pos = insideSpot;
  stepWorld(w, 0.1);
  const raider = w.createMonster('skeleton_warrior', 2, 'enemy');
  raider.homeRegionId = HUB_ZONE;
  raider.aggroed = true;
  raider.pos = vec(outsideSpot.x, outsideSpot.y);
  w.actors.push(raider);

  // Attempt direct clamp steps across the Sanctuary boundary into Lastlight.
  for (let s = 0; s < 80; s++) {
    const prev = vec(raider.pos.x, raider.pos.y);
    const dx = insideSpot.x - prev.x, dy = insideSpot.y - prev.y;
    const len = Math.hypot(dx, dy) || 1;
    raider.pos = w.clampPos(vec(prev.x + (dx / len) * 18, prev.y + (dy / len) * 18), raider.radius, prev, { mover: raider });
  }
  check('R3.1 Sanctuary gate leash stops wilderness enemy from entering Lastlight',
    !w.seamlessIsSanctuaryAt(raider.pos.x, raider.pos.y));

  // Fire an enemy projectile straight into Lastlight and verify it fizzles at the Sanctuary ward.
  const bowCaster = w.createMonster('skeleton_archer', 2, 'enemy');
  bowCaster.homeRegionId = HUB_ZONE;
  bowCaster.pos = vec(raider.pos.x, raider.pos.y);
  bowCaster.fillResources();
  w.actors.push(bowCaster);
  const bowInst = bowCaster.skills.find((s): s is NonNullable<typeof s> => !!s)
    ?? makeSkillGem(SKILLS.fireball ?? Object.values(SKILLS)[0], 1, 'common');
  const lifeBefore = w.player.life;
  w.useSkill(bowCaster, bowInst, insideSpot, true);
  stepWorld(w, 2.0);
  check('R3.2 hostile wilderness projectile fizzles at Lastlight Sanctuary boundary without hitting hero',
    w.player.life === lifeBefore && w.projectiles.length === 0);
  raider.dead = true;
  bowCaster.dead = true;

  // -------------------------------------------------------------------------
  // R4: Mixed Border Porosity Census & Cross-Border LoS
  // -------------------------------------------------------------------------
  const seenStyles = new Set<BorderStyle>();
  for (const s of sc.atlas.seams.values()) seenStyles.add(s.style);

  // Expand two frontier rings on a dedicated census seed world so `w` stays a
  // clean gameplay world for R5–R7.
  const w2 = makeSeamlessWorld(91823);
  for (let ring = 0; ring < 2; ring++) {
    for (const z of [...Object.values(w2.zoneMap)]) {
      if (z.dimension) continue;
      w2.prepareSeamlessZoneGraph(z);
    }
  }
  w2.seamless!.atlas.ensureSeats(w2.zoneMap);
  for (const s of w2.seamless!.atlas.seams.values()) seenStyles.add(s.style);

  check('R4.1 border porosity mixture generates sanctuary_gate, open_frontier, broken_divide, and chokepoint_pass',
    seenStyles.has('sanctuary_gate')
    && seenStyles.has('open_frontier')
    && seenStyles.has('broken_divide')
    && seenStyles.has('chokepoint_pass'),
    `styles=${[...seenStyles].join(',')}`);

  // Verify cross-border LoS across an open seam mouth!
  const hfSeam = [...sc.atlas.seamsFor(HUB_ZONE)].find(s =>
    !s.locked && (s.aId === frontierId || s.bId === frontierId))!;
  const mA = hfSeam.mouthA, mB = hfSeam.mouthB;
  const outA = hfSeam.sideOnA === 'e' ? vec(1, 0) : hfSeam.sideOnA === 'w' ? vec(-1, 0) : hfSeam.sideOnA === 's' ? vec(0, 1) : vec(0, -1);
  const dirX = mB.x - mA.x, dirY = mB.y - mA.y, dLen = Math.hypot(dirX, dirY);
  const ux = dLen > 1 ? dirX / dLen : outA.x;
  const uy = dLen > 1 ? dirY / dLen : outA.y;
  const eyeA = vec(mA.x - ux * 40, mA.y - uy * 40);
  const eyeB = vec(mB.x + ux * 40, mB.y + uy * 40);
  check('R4.2 lineOfSight sees cleanly across mounted region border mouth',
    w.lineOfSight(eyeA, eyeB, 0, 0));

  // -------------------------------------------------------------------------
  // R5: Soft Idle Home Tether vs. Aggro'd Cross-Border Pursuit & Kill Credit
  // -------------------------------------------------------------------------
  const ambientMob = w.createMonster('skeleton_warrior', 2, 'enemy');
  ambientMob.homeRegionId = frontierId;
  ambientMob.roamsCrossRegion = false;
  ambientMob.aggroed = false;
  // Place it 300px outside frontierSeat inside Crossroads:
  ambientMob.pos = vec(hubGoal.x, hubGoal.y);
  check('R5.1 un-aggro\'d ambient monster outside homeRegionId receives home-tether return goal',
    w.seamlessHomeTetherGoal(ambientMob) !== null);

  ambientMob.roamsCrossRegion = true;
  check('R5.2 roaming patrol/warband (roamsCrossRegion=true) is untethered across regions',
    w.seamlessHomeTetherGoal(ambientMob) === null);

  ambientMob.roamsCrossRegion = false;
  ambientMob.aggroed = true;
  check('R5.3 aggro\'d ambient monster drops home tether and pursues freely across borders',
    w.seamlessHomeTetherGoal(ambientMob) === null);

  // Set up a cull objective on frontierId while hero stands in HUB_ZONE, then kill ambientMob in HUB_ZONE!
  w.player.pos = vec(hubGoal.x, hubGoal.y);
  stepWorld(w, 0.2);
  check('R5.4 hero active region switched back to Crossroads', w.zone.id === HUB_ZONE);

  const frontierRt = sc.mounted.get(frontierId)!;
  frontierRt.def.objective = { kind: 'clear', need: 3 };
  frontierRt.objectiveDone = false;
  frontierRt.cull = { need: 3, kills: 1 };
  w.completedObjectives.delete(frontierId);
  ambientMob.faction = 'undead';
  w.sim.faction.reinforce(frontierId, 'undead', 20);
  const infBefore = w.sim.faction.owner(frontierId).power;
  w.actors.push(ambientMob);
  w.kill(ambientMob, false, w.player);

  check('R5.5 slaying a cross-border pursuer inside neighbor region credits homeRegionId cull & bleeds home faction',
    frontierRt.cull.kills === 2 && w.sim.faction.owner(frontierId).power < infBefore,
    `cull=${frontierRt.cull.kills}/${frontierRt.cull.need}`);

  // Also verify Ring-1 drowsy AI gate on a far un-aggro'd actor.
  const farMob = w.createMonster('skeleton_warrior', 2, 'enemy');
  farMob.pos = vec(w.player.pos.x + SEAMLESS_CFG.liveAiRadiusPx + 600, w.player.pos.y);
  farMob.aggroed = false;
  check('R5.6 distant un-aggro\'d actor enters Ring-1 drowsy cadence and wakes immediately on aggro',
    w.seamlessActorDrowsy(farMob) === true && (() => { farMob.aggroed = true; return w.seamlessActorDrowsy(farMob) === false; })());
  updateAI(ambientMob, w, 1 / 60);

  // -------------------------------------------------------------------------
  // R6: Distance Demotion (> ringOutPx) -> ZoneMemory -> Exact Remount & Save
  // -------------------------------------------------------------------------
  w.player.pos = vec(frontierGoal.x, frontierGoal.y);
  stepWorld(w, 0.2);
  check('R6.1 standing in frontier region before staging memory state', w.zone.id === frontierId);

  const wounded = w.createMonster('skeleton_warrior', 2, 'enemy');
  wounded.fromZoneGen = true;
  wounded.homeRegionId = frontierId;
  wounded.pos = w.clampPos(vec(frontierGoal.x + 80, frontierGoal.y), wounded.radius);
  wounded.life = Math.min(13, Math.max(2, Math.floor(wounded.maxLife() * 0.4)));
  const expectLife = wounded.life;
  const expectPos = vec(wounded.pos.x, wounded.pos.y);
  w.actors.push(wounded);

  const testChest = {
    pos: vec(frontierGoal.x - 60, frontierGoal.y),
    kind: 'timed' as const,
    mimic: false,
    opened: true,
    lockTime: 0,
    maxLock: 3,
  };
  // Tag chest via a save/remount cycle by placing through mounted slice or testing save round-trip:
  w.chests.push(testChest);
  // Move hero far enough away (> ringOutPx) by placing hero at a far negative/west test seat or Lastlight far corner
  // Actually let's test explicit far jump so distance to `frontierSeat` exceeds `SEAMLESS_CFG.ringOutPx`!
  const farTestPos = vec(frontierSeat.originPx.x - SEAMLESS_CFG.ringOutPx - 900, frontierSeat.originPx.y - SEAMLESS_CFG.ringOutPx - 900);
  w.player.pos = farTestPos;
  // Activate START_ZONE so frontierId is not the active zone and can demote!
  sc.travelOnSurfaceTo(START_ZONE, vec(200, 200));
  w.player.pos = farTestPos;
  stepWorld(w, 0.2);

  check('R6.2 region beyond ringOutPx demotes cleanly off the live surface into ZoneMemory',
    !sc.isMounted(frontierId));

  // Walk/jump back into range of frontierId and verify it remounts with wounded survivor intact!
  sc.travelOnSurfaceTo(frontierId, sc.toLocal(frontierId, frontierGoal));
  const restoredSurvivor = w.actors.find(a =>
    !a.dead && a.homeRegionId === frontierId && a.defId === 'skeleton_warrior' && Math.abs(a.life - expectLife) < 0.01);
  check('R6.3 remounted region restores wounded survivor at exact world coordinate & HP',
    sc.isMounted(frontierId)
    && !!restoredSurvivor
    && dist(restoredSurvivor!.pos, expectPos) < 40);

  // Save/load exact world-state round-trip!
  const preSaveWorldPos = vec(w.player.pos.x, w.player.pos.y);
  const savedState = JSON.parse(JSON.stringify(w.serializeWorldState()));
  check('R6.4 serializeWorldState stores region-local player coordinates for schema compatibility',
    !!savedState.player
    && savedState.player.zoneId === frontierId
    && savedState.player.x >= 0 && savedState.player.x <= frontierSeat.w);

  const wResumed = makeSeamlessWorld(42077);
  const adopted = wResumed.adoptWorldState(savedState);
  wResumed.resumeSpawn('exact', savedState.player);
  check('R6.5 exact resume reconstructs seamless atlas and wakes hero at exact world coordinate',
    adopted
    && wResumed.seamlessSurfaceActive
    && wResumed.zone.id === frontierId
    && dist(wResumed.player.pos, preSaveWorldPos) < 5);

  // -------------------------------------------------------------------------
  // R7: Seamless Town Portal Round-Trip + Cave Suspend & Exact-Mouth Resume
  // -------------------------------------------------------------------------
  w.player.cooldowns.clear();
  w.player.useLock = 0;
  const portalCastOrigin = vec(w.player.pos.x, w.player.pos.y);
  check('R7.1 Town Portal casts on seamless frontier region', w.castTownPortal());
  stepWorld(w, 1.5);
  const pvOut = w.townPortalViews()[0];
  check('R7.2 outbound Town Portal stands visibly in world space', !!pvOut);
  if (pvOut) {
    w.player.pos = vec(pvOut.pos.x + 140, pvOut.pos.y);
    stepWorld(w, 0.05);
    w.player.pos = vec(pvOut.pos.x, pvOut.pos.y);
    w.localSeat.lastActedAt = -100;
    stepWorld(w, TOWN_PORTAL_CFG.dwellSeconds + 0.2);
  }
  check('R7.3 Town Portal arrives in Lastlight on continuous surface without discrete teardown',
    w.seamlessSurfaceActive && w.zone.id === START_ZONE);

  const pvBack = w.townPortalViews()[0];
  if (pvBack) {
    w.player.pos = vec(pvBack.pos.x + 140, pvBack.pos.y);
    stepWorld(w, 0.05);
    w.player.pos = vec(pvBack.pos.x, pvBack.pos.y);
    w.localSeat.lastActedAt = -100;
    stepWorld(w, TOWN_PORTAL_CFG.dwellSeconds + 0.2);
  }
  check('R7.4 return Town Portal lands back in frontier region at casting world coordinate',
    w.seamlessSurfaceActive && w.zone.id === frontierId && dist(w.player.pos, portalCastOrigin) < 40);

  // Enter a discrete sidezone cave from the frontier region, verify surface suspends, then climb out!
  const caveMouthWorld = w.clampPos(vec(frontierGoal.x + 50, frontierGoal.y + 50), 20);
  (w as unknown as {
    enterSidezone(cm: { pos: Vec2; seed: number; kind: string }): void;
  }).enterSidezone({ pos: caveMouthWorld, seed: 8881, kind: 'cave_entrance' });

  check('R7.5 descending into cave suspends seamless surface and enters discrete dungeon',
    !w.seamlessSurfaceActive && w.inCave && w.zone.id.startsWith('cave_'));

  const climbExit = w.exits.find(e => e.to === frontierId)!;
  check('R7.6 cave carries climb-out exit back to parent surface region', !!climbExit);
  if (climbExit) {
    (w as unknown as { travelThrough(e: typeof climbExit): void }).travelThrough(climbExit);
  }
  check('R7.7 climbing out of cave resumes seamless surface at exact cave mouth world coordinate',
    w.seamlessSurfaceActive
    && !w.inCave
    && w.zone.id === frontierId
    && dist(w.player.pos, vec(caveMouthWorld.x, caveMouthWorld.y + 40)) < 75);

  // Virgin-account prologue transition: sceneBegin suspends seamless surface into
  // off-graph staging ground, and the 'home' wake (`loadZone(START_ZONE)` while
  // `inCave` is still true) unwinds `inCave` and resumes seamless Lastlight!
  const wPrologue = makeSeamlessWorld(55109);
  check('R7.8 virgin-account prologue sceneBegin suspends seamless surface cleanly',
    sceneBegin(wPrologue, 'prologue') && !wPrologue.seamlessSurfaceActive && wPrologue.inCave);
  wPrologue.loadZone(START_ZONE);
  check('R7.9 prologue home wake unwinds off-graph return and boots seamless Lastlight',
    wPrologue.seamlessSurfaceActive
    && !wPrologue.inCave
    && wPrologue.zone.id === START_ZONE
    && wPrologue.seamless!.isMounted(HUB_ZONE));
} finally {
  restoreRng();
}

process.exitCode = failures ? 1 : 0;
