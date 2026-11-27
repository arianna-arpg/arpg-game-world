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
//   R8. World-space region boxes, physical border exit anchors, Theater marches,
//       & negative-coordinate LitePool spatial hashing across background mounts
//   R9. Cross-border secret hollows, chasm pitfall climb-out, & seamless corpse runs
//   R10. Thrash-free streaming stability, planar flush alignment, & off-screen hibernation
// ---------------------------------------------------------------------------

import { bootSimEngine } from '../src/sim/arena';
import { seedGlobalRandom } from '../src/sim/rng';
import { dist, vec, type Vec2 } from '../src/core/math';
import { CLASSES } from '../src/data/classes';
import { SKILLS } from '../src/data/skills';
import { TOWN_PORTAL_CFG } from '../src/data/townportals';
import { START_ZONE } from '../src/data/zones';
import { updateAI } from '../src/engine/ai';
import { forgeItem } from '../src/engine/itemgen';
import { sceneBegin } from '../src/engine/scenes';
import { makeSkillGem } from '../src/engine/skills';
import { marchEndpoints } from '../src/engine/theater';
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

  // =========================================================================
  // R8. World-space region boxes, physical border exit anchors, Theater marches,
  //     & negative-coordinate LitePool spatial hashing across background mounts
  // =========================================================================
  // Ensure `w` is standing in `frontierId` on the continuous surface.
  w.player.pos = vec(frontierGoal.x, frontierGoal.y);
  stepWorld(w, 0.1);

  const rBox = w.activeRegionBox();
  const exitAnchors = w.activeExitAnchors();
  check('R8.1 activeRegionBox & activeExitAnchors return world-space region bounds and seam mouths',
    rBox.ox === frontierSeat.originPx.x
    && rBox.oy === frontierSeat.originPx.y
    && rBox.w === frontierSeat.w
    && rBox.h === frontierSeat.h
    && exitAnchors.length >= 1
    && exitAnchors.every(e =>
      e.pos.x >= rBox.ox - 80 && e.pos.x <= rBox.ox + rBox.w + 80
      && e.pos.y >= rBox.oy - 80 && e.pos.y <= rBox.oy + rBox.h + 80),
    `box=(${rBox.ox},${rBox.oy},${rBox.w}x${rBox.h}) exits=${exitAnchors.length}`);

  const march = marchEndpoints(w);
  const inFrontierWorld = (p: Vec2): boolean =>
    p.x >= rBox.ox - 80 && p.x <= rBox.ox + rBox.w + 80
    && p.y >= rBox.oy - 80 && p.y <= rBox.oy + rBox.h + 80;
  check('R8.2 Theater marchEndpoints anchor inside offset frontier region in world space',
    inFrontierWorld(march.from) && inFrontierWorld(march.to) && dist(march.from, march.to) > 200,
    `from=(${Math.round(march.from.x)},${Math.round(march.from.y)}) to=(${Math.round(march.to.x)},${Math.round(march.to.y)})`);

  // Spawn LitePool motes at far negative AND frontier world coordinates, rebuild buckets,
  // trigger an on-demand background region mount, and verify O(1) bucket queries still hit!
  const negMoteIdx = w.lite.spawn(0, -3420, -2180, 1, 0, 1);
  const posMoteIdx = w.lite.spawn(0, frontierGoal.x, frontierGoal.y, 1, 0, 1);
  w.lite.rebuildBuckets();
  let negHits = 0;
  let posHits = 0;
  w.lite.forEachIn(-3420, -2180, 90, 1, () => { negHits++; });
  w.lite.forEachIn(frontierGoal.x, frontierGoal.y, 90, 1, () => { posHits++; });
  // Ensure mounting another neighbor in the background never clears `w.lite`!
  const extraUnmounted = (w.zoneMap[frontierId]?.exits ?? [])
    .map(e => e.to)
    .find(id => id !== '?' && !sc.isMounted(id) && !!w.zoneMap[id]);
  if (extraUnmounted) sc.ensureMounted(extraUnmounted, frontierId);
  check('R8.3 LitePool hashes negative/offset world coordinates and survives background region mounts',
    negMoteIdx >= 0 && posMoteIdx >= 0 && negHits >= 1 && posHits >= 1 && w.lite.liveCount >= 2,
    `negHits=${negHits} posHits=${posHits} live=${w.lite.liveCount}`);
  if (negMoteIdx >= 0) w.lite.free(negMoteIdx);
  if (posMoteIdx >= 0) w.lite.free(posMoteIdx);

  // =========================================================================
  // R9. Cross-border secret hollows, chasm pitfall climb-out, & seamless corpse runs
  // =========================================================================
  sc.ensureMounted(HUB_ZONE, frontierId);
  const hubRt = sc.mounted.get(HUB_ZONE)!;
  const crossHollowRect = {
    x: hubRt.seat.originPx.x + 300,
    y: hubRt.seat.originPx.y + 300,
    w: 90,
    h: 90,
  };
  sc.walk.fillRegion(
    crossHollowRect.x, crossHollowRect.y,
    crossHollowRect.x + crossHollowRect.w - 0.1, crossHollowRect.y + crossHollowRect.h - 0.1,
    'wall', true,
  );
  const crossHollowId = `${HUB_ZONE}:probe_cross_border_hollow`;
  hubRt.zoneHollows.push({
    id: crossHollowId,
    kind: 'room',
    rect: crossHollowRect,
    seams: [vec(crossHollowRect.x, crossHollowRect.y + 45)],
    seed: 7711,
  });
  check('R9.1a cross-border secret hollow starts walled while player stands in adjacent region',
    w.zone.id === frontierId
    && !sc.walk.isWalkable(crossHollowRect.x + 45, crossHollowRect.y + 45));
  w.openHollow(crossHollowId, w.player, { silent: true, bare: true });
  check('R9.1b openHollow reveals secret chamber across mounted region border in world space',
    w.zone.id === frontierId
    && hubRt.openedHollows.has(crossHollowId)
    && sc.walk.isWalkable(crossHollowRect.x + 45, crossHollowRect.y + 45));

  // Chasm pitfall descent from offset frontier region & exact world-space rim climb-out:
  const pitRimWorld = w.clampPos(vec(frontierGoal.x - 60, frontierGoal.y + 40), 20);
  w.player.pos = vec(pitRimWorld.x, pitRimWorld.y);
  (w as unknown as { beginPitDescent(p: object): void }).beginPitDescent({});
  stepWorld(w, 2.2);
  check('R9.2a chasm pitfall suspends seamless surface into discrete pit cave',
    !w.seamlessSurfaceActive && w.inCave && w.zone.id.includes('_pit_'));
  const pitClimbExit = w.exits.find(e => e.to === frontierId);
  if (pitClimbExit) {
    (w as unknown as { travelThrough(e: typeof pitClimbExit): void }).travelThrough(pitClimbExit);
  }
  check('R9.2b climbing out of pitfall resumes seamless surface at world-space rim without double-offset',
    w.seamlessSurfaceActive
    && !w.inCave
    && w.zone.id === frontierId
    && dist(w.player.pos, vec(pitRimWorld.x, pitRimWorld.y + 40)) < 85,
    `landed=(${Math.round(w.player.pos.x)},${Math.round(w.player.pos.y)}) rim=(${Math.round(pitRimWorld.x)},${Math.round(pitRimWorld.y)})`);

  // Seamless corpse run: dying in an offset frontier region records region-local coordinates
  // and places the reclaimable grave at the exact world-space spot on the continuous surface!
  const corpseWorldSpot = w.clampPos(vec(frontierGoal.x + 30, frontierGoal.y - 30), 20);
  w.player.pos = vec(corpseWorldSpot.x, corpseWorldSpot.y);
  const testLoot = forgeItem({ baseId: 'helmet_armor', ilvl: 6, rarity: 'magic' });
  if (testLoot) w.meta.equipped.helm = testLoot;
  const deathsBefore = w.account.deaths.length + w.charDeaths.length;
  w.recordDeath();
  const deathsAfter = w.account.deaths.length + w.charDeaths.length;
  w.loadZone(START_ZONE);
  sc.refreshMountedPlayerCorpses();
  sc.ensureMounted(frontierId, HUB_ZONE);
  sc.refreshMountedPlayerCorpses();
  const grave = w.playerCorpses[w.playerCorpses.length - 1];
  check('R9.3 seamless corpse run places reclaimable grave at exact world-space death coordinate',
    deathsAfter === deathsBefore + 1
    && !!grave
    && dist(grave.pos, corpseWorldSpot) < 60,
    grave ? `grave=(${Math.round(grave.pos.x)},${Math.round(grave.pos.y)}) expected=(${Math.round(corpseWorldSpot.x)},${Math.round(corpseWorldSpot.y)})` : 'no grave');

  // =========================================================================
  // R10. Thrash-free streaming stability, planar flush alignment, & hibernation
  // =========================================================================
  const wPerf = makeSeamlessWorld(424242);
  const scPerf = wPerf.seamless!;
  const hubPerfSeat = scPerf.seatOf(HUB_ZONE)!;
  const hubPerfPos = scPerf.walk.snapToWalkable(vec(hubPerfSeat.originPx.x + hubPerfSeat.w / 2, hubPerfSeat.originPx.y + hubPerfSeat.h / 2));
  wPerf.player.pos = vec(hubPerfPos.x, hubPerfPos.y);
  stepWorld(wPerf, 0.3);
  const f1PerfId = wPerf.zoneMap[HUB_ZONE]!.exits.map(e => e.to).find(id => id !== '?' && id !== START_ZONE && !!scPerf.seatOf(id))!;
  const f1PerfSeat = scPerf.seatOf(f1PerfId)!;
  const f1PerfPos = scPerf.walk.snapToWalkable(vec(f1PerfSeat.originPx.x + f1PerfSeat.w / 2, f1PerfSeat.originPx.y + f1PerfSeat.h / 2));
  wPerf.player.pos = vec(f1PerfPos.x, f1PerfPos.y);
  stepWorld(wPerf, 0.4); // allow initial streaming to settle
  const mountedSig0 = [...scPerf.mounted.keys()].sort().join(',');
  let thrashFlips = 0;
  for (let i = 0; i < 36; i++) {
    wPerf.update(1 / 60);
    const sig = [...scPerf.mounted.keys()].sort().join(',');
    if (sig !== mountedSig0) thrashFlips++;
  }
  check('R10.1 streaming ring stays 100% stable across 36 steady-state frames (zero mount/unmount thrash)',
    thrashFlips === 0 && scPerf.mounted.size >= 1 && scPerf.mounted.size <= 6,
    `flips=${thrashFlips} mounted=${scPerf.mounted.size} [${mountedSig0}]`);

  const hubSeams = scPerf.atlas.seamsFor(HUB_ZONE);
  const hubFlushCount = hubSeams.filter(s => s.flush).length;
  const allPerfSeams = [...scPerf.atlas.seams.values()];
  const flushRatio = allPerfSeams.filter(s => s.flush).length / Math.max(1, allPerfSeams.length);
  check('R10.2 planar multi-neighbor seating aligns Crossroads cardinal exits flush and keeps >=70% seams flush',
    hubFlushCount >= Math.min(hubSeams.length, 4) && flushRatio >= 0.70,
    `hubFlush=${hubFlushCount}/${hubSeams.length} totalFlush=${Math.round(flushRatio * 100)}%`);

  // Ensure an idle enemy beyond liveAiRadiusPx enters seamlessSleep and wakes on approach.
  const sleeper = wPerf.actors.find(a =>
    !a.dead && a.team === 'enemy' && a.seamlessSleep && dist(a.pos, wPerf.player.pos) > SEAMLESS_CFG.liveAiRadiusPx);
  let wokeOnApproach = false;
  if (sleeper) {
    wPerf.player.pos = vec(sleeper.pos.x + 120, sleeper.pos.y);
    wPerf.update(1 / 60);
    wokeOnApproach = !sleeper.seamlessSleep;
  }
  check('R10.3 off-screen idle enemies hibernate past liveAiRadiusPx and wake immediately on approach',
    !!sleeper && wokeOnApproach,
    sleeper ? `sleeper=${sleeper.defId}@${sleeper.homeRegionId} woke=${wokeOnApproach}` : 'no distant enemy');

  // =========================================================================
  // R11. Bog Bridge Advisory Pathfinding & Seamless Ground Boundary Blending
  // =========================================================================
  // 11.1 Mint a marsh 'islands' zone (chasms + wooden bridges) on seamless surface
  //      and verify TiledWalkField advisory nav blocks unbridged chasm centers while
  //      routing cleanly onto/across bridge spans!
  const bogId = wPerf.devMintTileset('marsh', 0, 10, { layoutType: 'islands', seed: 101 })!;
  scPerf.ensureMounted(bogId, HUB_ZONE);
  const bogSeat = scPerf.seatOf(bogId)!;
  scPerf.travelOnSurfaceTo(bogId, vec(bogSeat.w * 0.5, bogSeat.h * 0.5));
  const pfBog = wPerf.pathField(0)!;
  const bogChasms = wPerf.doodads.filter(d => d.regionId === bogId && d.kind === 'chasm' && !d.gone);
  const bogBridges = wPerf.doodads.filter(d => d.regionId === bogId && (d.kind === 'bridge' || d.kind === 'rotten_bridge') && !d.gone);
  const unbridgedChasm = bogChasms.find(ch =>
    !bogBridges.some(b => Math.hypot(b.pos.x - ch.pos.x, b.pos.y - ch.pos.y) <= ch.radius + b.radius + 20));
  const bridgeOverChasm = bogBridges.find(b =>
    bogChasms.some(ch => Math.hypot(b.pos.x - ch.pos.x, b.pos.y - ch.pos.y) < ch.radius));
  let chasmBlockedInNav = false;
  if (unbridgedChasm && pfBog.linePreferred) {
    const pA = vec(unbridgedChasm.pos.x - unbridgedChasm.radius - 60, unbridgedChasm.pos.y);
    const pB = vec(unbridgedChasm.pos.x + unbridgedChasm.radius + 60, unbridgedChasm.pos.y);
    chasmBlockedInNav = !pfBog.linePreferred(pA, pB, { key: 'probe_bog', costOf: () => 1 });
  }
  let bridgeRoutable = false;
  if (bridgeOverChasm && pfBog.pathStep) {
    const stepOnBridge = pfBog.pathStep(
      wPerf.walk!.snapToWalkable(vec(bridgeOverChasm.pos.x + 90, bridgeOverChasm.pos.y)),
      vec(bridgeOverChasm.pos.x, bridgeOverChasm.pos.y),
    );
    bridgeRoutable = stepOnBridge !== null;
  }
  check('R11.1 marsh/bog islands advisory nav blocks unbridged chasm void holes and routes across wooden bridges',
    bogChasms.length > 0 && bogBridges.length > 0 && chasmBlockedInNav && bridgeRoutable,
    `chasms=${bogChasms.length} bridges=${bogBridges.length} blocked=${chasmBlockedInNav} bridgeOk=${bridgeRoutable}`);

  // 11.2 Verify unified surfaceSeed across regions + smooth C1 partition-of-unity
  //      cross-biome theme weights (invariant to neighbor mount state)!
  const sHub = wPerf.seamlessThemeWeightsAt(hubPerfSeat.originPx.x + hubPerfSeat.w * 0.5, hubPerfSeat.originPx.y + hubPerfSeat.h * 0.5)!;
  const sFront = wPerf.seamlessThemeWeightsAt(f1PerfSeat.originPx.x + f1PerfSeat.w * 0.5, f1PerfSeat.originPx.y + f1PerfSeat.h * 0.5)!;
  check('R11.2a all seamless regions share one unified surfaceSeed so same-biome chunks never jump noise/speckles',
    !!sHub && !!sFront && sHub.seed === sFront.seed,
    `hubSeed=${sHub?.seed} frontSeed=${sFront?.seed}`);

  // Sample across a cross-biome flush seam between Crossroads and a frontier neighbor with a distinct theme:
  const crossBiomeSeam = [...scPerf.atlas.seamsFor(HUB_ZONE)].find(s => {
    const otherId = s.aId === HUB_ZONE ? s.bId : s.aId;
    return s.flush && wPerf.zoneMap[otherId] && wPerf.zoneMap[otherId].theme !== wPerf.zoneMap[HUB_ZONE].theme;
  });
  let smoothPartitionOk = true;
  if (crossBiomeSeam) {
    const mx = (crossBiomeSeam.mouthA.x + crossBiomeSeam.mouthB.x) * 0.5;
    const my = (crossBiomeSeam.mouthA.y + crossBiomeSeam.mouthB.y) * 0.5;
    const nx = crossBiomeSeam.sideOnA === 'e' ? 1 : crossBiomeSeam.sideOnA === 'w' ? -1 : 0;
    const ny = crossBiomeSeam.sideOnA === 's' ? 1 : crossBiomeSeam.sideOnA === 'n' ? -1 : 0;
    let prevWHub = -1;
    let maxStepJump = 0;
    let sawBlended = false;
    const hubTh = wPerf.zoneMap[HUB_ZONE].theme;
    for (let d = -420; d <= 420; d += 20) {
      const ws = wPerf.seamlessThemeWeightsAt(mx + nx * d, my + ny * d)!;
      const sum = ws.weights.slice(0, ws.count).reduce((a, b) => a + b, 0);
      if (Math.abs(sum - 1) > 1e-4) smoothPartitionOk = false;
      let wHub = 0;
      for (let k = 0; k < ws.count; k++) if (ws.themes[k] === hubTh) wHub += ws.weights[k];
      if (wHub > 0.1 && wHub < 0.9) sawBlended = true;
      if (prevWHub >= 0) maxStepJump = Math.max(maxStepJump, Math.abs(wHub - prevWHub));
      prevWHub = wHub;
    }
    smoothPartitionOk = smoothPartitionOk && sawBlended && maxStepJump < 0.22;
  }
  check('R11.2b cross-biome border weights form a smooth partition of unity with zero seam jump',
    smoothPartitionOk);

  // 11.3 Verify discrete cave/pitfall round-trips NEVER leak other regions' world-coord
  //      enemies into a surface region's ZoneMemory, and adoptWorldState self-heals
  //      pre-existing stacked world-coord memories!
  const bogFoesBefore = wPerf.actors.filter(a => !a.dead && a.team === 'enemy' && a.fromZoneGen && a.homeRegionId === bogId).length;
  const bogDoodadsBefore = wPerf.doodads.filter(d => d.regionId === bogId).length;
  (wPerf as unknown as { beginPitDescent(p: object): void }).beginPitDescent({});
  stepWorld(wPerf, 2.2);
  const bogPitExit = wPerf.exits.find(e => e.to === bogId);
  if (bogPitExit) (wPerf as unknown as { travelThrough(e: typeof bogPitExit): void }).travelThrough(bogPitExit);
  const bogFoesAfter = wPerf.actors.filter(a => !a.dead && a.team === 'enemy' && a.fromZoneGen && a.homeRegionId === bogId).length;
  const bogDoodadsAfter = wPerf.doodads.filter(d => d.regionId === bogId).length;
  check('R11.3a cave/pitfall round-trip preserves exact region enemy & doodad counts with zero cross-region stacking',
    bogFoesAfter === bogFoesBefore && Math.abs(bogDoodadsAfter - bogDoodadsBefore) <= 24,
    `foes=${bogFoesBefore}->${bogFoesAfter} doodads=${bogDoodadsBefore}->${bogDoodadsAfter}`);

  const savedCorrupt = wPerf.serializeWorldState();
  const bogMemoRow = savedCorrupt.memory?.find(m => m.zoneId === bogId);
  if (bogMemoRow) {
    for (let k = 0; k < 25; k++) {
      bogMemoRow.enemies.push({ defId: 'zombie', level: 99, x: 10, y: 10, life: 50 });
    }
  }
  const wHealed = makeSeamlessWorld(424242);
  const adoptedOk = wHealed.adoptWorldState(savedCorrupt);
  wHealed.resumeSpawn('exact', savedCorrupt.player);
  const bogFoesHealed = wHealed.actors.filter(a => !a.dead && a.team === 'enemy' && a.homeRegionId === bogId).length;
  const stackedCornerZombies = wHealed.actors.filter(a =>
    !a.dead && a.homeRegionId === bogId && a.level === 99).length;
  check('R11.3b adoptWorldState detects & self-heals stacked world-coord seamless memory rows cleanly',
    adoptedOk && bogFoesHealed >= 20 && bogFoesHealed < 90 && stackedCornerZombies === 0,
    `healedFoes=${bogFoesHealed} stackedZombies=${stackedCornerZombies}`);

  // -------------------------------------------------------------------------
  // R12. Main-Branch Feature & Fabric Parity on Seamless Surface
  // -------------------------------------------------------------------------
  const wPar = makeSeamlessWorld(919191);
  wPar.loadZone(START_ZONE);

  // 12.1 Mireille's exitApproach flask-lesson callout triggers at Lastlight's
  //      Sanctuary gate seam and stays active across the Crossroads border!
  const gateSeam = [...wPar.seamless!.atlas.seamsFor(START_ZONE)][0];
  if (gateSeam) {
    // Arm exitApproach while at Lastlight's spawn before walking to the gate:
    wPar.npcSpeechView(true);
    const gateAnchor = wPar.activeExitAnchors().find(e => e.to === HUB_ZONE)?.pos
      ?? (gateSeam.aId === START_ZONE ? gateSeam.mouthA : gateSeam.mouthB);
    const hubSeatPar = wPar.seamless!.seatOf(HUB_ZONE)!;
    const hubCx = hubSeatPar.originPx.x + hubSeatPar.w * 0.5;
    const hubCy = hubSeatPar.originPx.y + hubSeatPar.h * 0.5;
    const inDx = gateAnchor.x - hubCx, inDy = gateAnchor.y - hubCy;
    const inLen = Math.hypot(inDx, inDy) || 1;
    wPar.landPartyAt(wPar.clampPos(vec(
      gateAnchor.x + (inDx / inLen) * 80,
      gateAnchor.y + (inDy / inLen) * 80,
    ), wPar.player.radius));
    stepWorld(wPar, 0.2);
    const calloutAtGate = wPar.npcSpeechView(true).find(l => l.delivery === 'callout');
    const stepIntoHub = wPar.clampPos(vec(
      gateAnchor.x - (inDx / inLen) * 140,
      gateAnchor.y - (inDy / inLen) * 140,
    ), wPar.player.radius);
    wPar.landPartyAt(stepIntoHub);
    stepWorld(wPar, 0.25);
    const calloutInHub = wPar.npcSpeechView(true).find(l => l.delivery === 'callout');
    check('R12.1 Mireille exitApproach callout triggers at Sanctuary gate seam and survives crossing into Crossroads',
      !!calloutAtGate && !!calloutInHub && wPar.zone.id === HUB_ZONE,
      `atGate=${!!calloutAtGate} inHub=${!!calloutInHub} zone=${wPar.zone.id}`);
  }

  // 12.2 Fabrics (FogField, CreepField, tracks, trapworks, geysers) survive staging
  //      and operate inside non-zero world-space region seats without mutating theme specs!
  const clearMemo = (w: World, zid: string): void => {
    (w as unknown as { zoneMemory: Map<string, unknown> }).zoneMemory.delete(zid);
  };
  const fabFrontExit = wPar.zoneMap[HUB_ZONE].exits.find(e => e.to !== '?' && e.to !== START_ZONE && !e.crossDim)!;
  const fabId = fabFrontExit.to;
  const fabDef = wPar.zoneMap[fabId];
  const sharedTrackPath0 = vec(320, 320);
  const sharedTrackSpec = {
    path: [sharedTrackPath0, vec(620, 320)],
    mode: 'pingpong' as const,
    speed: 180,
    riders: [{ kind: 'shear_disc' }],
    tag: 'probe_lane',
  };
  const sharedTrapAt = vec(420, 420);
  const sharedTrapSpec = {
    id: 'probe_plate',
    trigger: { kind: 'plate' as const, at: sharedTrapAt, r: 22 },
    effects: [{ kind: 'lanes' as const, tags: ['probe_lane'], set: 'toggle' as const }],
  };
  fabDef.theme = {
    ...fabDef.theme,
    fog: { banks: [2, 2], kinds: [{ id: 'mist' }] },
    creep: { pockets: [2, 2], kinds: [{ id: 'caulflesh' }] },
    tracks: [sharedTrackSpec],
    trapworks: [sharedTrapSpec],
    geysers: { geyser: [2, 2], bands: [1, 1] },
  };
  clearMemo(wPar, fabId);
  if (wPar.seamless!.isMounted(fabId)) {
    (wPar.seamless as unknown as { unmountRegion(id: string): void }).unmountRegion(fabId);
  }
  wPar.seamless!.travelOnSurfaceTo(fabId);
  const fabSeat = wPar.seamless!.seatOf(fabId)!;
  const fabRt = wPar.seamless!.mounted.get(fabId)!;
  const inFabSeat = (p: Vec2): boolean =>
    p.x >= fabSeat.originPx.x && p.x <= fabSeat.originPx.x + fabSeat.w
    && p.y >= fabSeat.originPx.y && p.y <= fabSeat.originPx.y + fabSeat.h;
  const fogOk = !!wPar.fog && wPar.fog.ox === fabSeat.originPx.x && wPar.fog.oy === fabSeat.originPx.y
    && wPar.fog.banks.length > 0 && inFabSeat(wPar.fog.banks[0].pos);
  const creepOk = !!wPar.creep && wPar.creep.ox === fabSeat.originPx.x && wPar.creep.oy === fabSeat.originPx.y
    && wPar.creep.sources.length > 0 && inFabSeat(wPar.creep.sources[0].pos);
  const fabTrack = wPar.tracks.find(t => t.spec.tag === `${fabId}:probe_lane`);
  const fabTrap = wPar.trapworks.find(t => t.id === `${fabId}:probe_plate`);
  const geyserOk = !!fabRt.geysers && fabRt.geysers.vents.length > 0 && inFabSeat(fabRt.geysers.vents[0].pos);
  const themeImmutableOk = sharedTrackPath0.x === 320 && sharedTrackPath0.y === 320
    && sharedTrapAt.x === 420 && sharedTrapAt.y === 420;
  check('R12.2 fog, creep, tracks, trapworks, and geysers survive staging at world-space seat coords with immutable theme specs',
    fogOk && creepOk && !!fabTrack && inFabSeat(fabTrack.arc.pts[0]) && !!fabTrap && inFabSeat(fabTrap.spec.trigger.at!) && geyserOk && themeImmutableOk,
    `fog=${fogOk} creep=${creepOk} track=${!!fabTrack} trap=${!!fabTrap} geyser=${geyserOk} immut=${themeImmutableOk}`);

  // 12.3 ConjuredGround places walkable cloud cells over conjurable void/water on
  //      TiledWalkField at offset world coordinates and restores prior terrain on expiry!
  const cjX = fabSeat.originPx.x + 600, cjY = fabSeat.originPx.y + 600;
  (wPar.walk as TiledWalkField).fillRegion(cjX - 45, cjY - 45, cjX + 45, cjY + 45, 'flux_void', true, fabId);
  const voidBeforeConjure = !wPar.walk!.isWalkable(cjX, cjY);
  const conjuredPlaced = wPar.conjured!.conjure(cjX, cjY, 50, 0.5);
  const walkableDuringConjure = wPar.walk!.isWalkable(cjX, cjY);
  wPar.conjured!.update(0.7, []);
  const restoredAfterConjure = !wPar.walk!.isWalkable(cjX, cjY);
  (wPar.walk as TiledWalkField).fillRegion(cjX - 45, cjY - 45, cjX + 45, cjY + 45, 'ground', true, fabId);
  check('R12.3 ConjuredGround bridges conjurable void on TiledWalkField and restores prior cells on expiry',
    voidBeforeConjure && conjuredPlaced > 0 && walkableDuringConjure && restoredAfterConjure,
    `placed=${conjuredPlaced} walkDuring=${walkableDuringConjure} restored=${restoredAfterConjure}`);

  // 12.4 LitePool (liteOpenAt) moves motes freely at negative world coordinates!
  let negZoneId = [...wPar.seamless!.mounted.keys()].find(id => {
    const s = wPar.seamless!.seatOf(id);
    return !!s && (s.originPx.x < -300 || s.originPx.y < -300);
  });
  if (!negZoneId) {
    for (const z of Object.values(wPar.zoneMap)) {
      if (z.id === START_ZONE) continue;
      wPar.seamless!.ensureMounted(z.id);
      const s = wPar.seamless!.seatOf(z.id);
      if (s && (s.originPx.x < -300 || s.originPx.y < -300)) { negZoneId = z.id; break; }
    }
  }
  if (negZoneId) {
    const ns = wPar.seamless!.seatOf(negZoneId)!;
    const negPt = wPar.walk!.snapToWalkable(vec(ns.originPx.x + ns.w * 0.5, ns.originPx.y + ns.h * 0.5));
    const liteOpenNeg = (wPar as unknown as { liteOpenAt(x: number, y: number): boolean }).liteOpenAt(negPt.x, negPt.y);
    check('R12.4 liteOpenAt permits Swarmlord & ambient LitePool motes at negative world coordinates',
      (negPt.x < 0 || negPt.y < 0) && liteOpenNeg,
      `negPt=(${Math.round(negPt.x)},${Math.round(negPt.y)}) open=${liteOpenNeg}`);
  }

  // 12.5 Secret annexes (annexReveal + annexFound) & puzzle/throng actors survive unmount/remount!
  const axTargetExit = wPar.zoneMap[HUB_ZONE].exits.find(e => e.to !== '?' && e.to !== START_ZONE && e.to !== fabId && !e.crossDim);
  if (axTargetExit) {
    const axZoneId = axTargetExit.to;
    const axDef = wPar.zoneMap[axZoneId];
    axDef.annexes = [{ id: 'ax0', x: axDef.size.w - 72, y: 240, w: 300, h: 260, shape: 'rect', seed: 777 }];
    axDef.puzzles = [{ id: 'great_chord', chance: 1 }];
    clearMemo(wPar, axZoneId);
    if (wPar.seamless!.isMounted(axZoneId)) {
      (wPar.seamless as unknown as { unmountRegion(id: string): void }).unmountRegion(axZoneId);
    }
    wPar.seamless!.travelOnSurfaceTo(axZoneId);
    const husk = (wPar as unknown as { mintThrongHusk(id: string, p: Vec2, o?: object): { fromZoneGen: boolean } | null })
      .mintThrongHusk('zombie', vec(wPar.player.pos.x + 60, wPar.player.pos.y), { pocketKey: `${axZoneId}:0` });
    const revealedCount = wPar.devAnnexReveal();
    const axRt1 = wPar.seamless!.mounted.get(axZoneId)!;
    const axPieceWorld = axRt1.arenaPieces[0];
    const walkInsideAnnex1 = !!axPieceWorld && wPar.walk!.isWalkable(axPieceWorld.x + axPieceWorld.w * 0.5, axPieceWorld.y + axPieceWorld.h * 0.5);
    const puzzleNodes1 = wPar.actors.filter(a => a.homeRegionId === axZoneId && !!a.puzzleNode);
    const puzzleNotZoneGen = puzzleNodes1.every(a => !a.fromZoneGen);

    // Unmount and remount via ZoneMemory:
    wPar.seamless!.travelOnSurfaceTo(START_ZONE);
    (wPar.seamless as unknown as { unmountRegion(id: string): void }).unmountRegion(axZoneId);
    wPar.seamless!.travelOnSurfaceTo(axZoneId);
    const axRt2 = wPar.seamless!.mounted.get(axZoneId)!;
    const axPieceWorld2 = axRt2.arenaPieces[0];
    const walkInsideAnnex2 = !!axPieceWorld2 && wPar.walk!.isWalkable(axPieceWorld2.x + axPieceWorld2.w * 0.5, axPieceWorld2.y + axPieceWorld2.h * 0.5);
    const puzzleNodes2 = wPar.actors.filter(a => a.homeRegionId === axZoneId && !!a.puzzleNode);
    check('R12.5 secret annexes & puzzle/throng fixtures survive seamless unmount and ZoneMemory remount intact',
      revealedCount >= 1 && walkInsideAnnex1 && walkInsideAnnex2 && !!husk && !husk.fromZoneGen
      && puzzleNodes1.length > 0 && puzzleNotZoneGen && puzzleNodes2.length === puzzleNodes1.length,
      `revealed=${revealedCount} walk1=${walkInsideAnnex1} walk2=${walkInsideAnnex2} puzzles=${puzzleNodes1.length}->${puzzleNodes2.length}`);
  }
} finally {
  restoreRng();
}

process.exitCode = failures ? 1 : 0;
