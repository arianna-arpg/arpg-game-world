/** Complete original native birth ordering, after layout/environment adoption
 * and player arrival. A caller must bind every invoked state/controller service;
 * this operation neither swaps a standing World nor publishes an area. */
import type { World } from './world';
import type { ZoneDef } from '../data/zones';
import type { GeneratedLayout } from './levelgen';
import type { NativeInhabitantSources } from './nativeInhabitants';
import { spawnNativeDoorGuards, spawnNativeFurniture, spawnNativeResidents, spawnNativeFieldInhabitants } from './nativeInhabitants';
import { syncAltarBodies } from './altarBodies';
import { fontStandsIn } from './fontPlacement';
import { angleTo, clamp, dist, rand, randInt, vec, type Vec2 } from '../core/math';
import type { Actor } from './actor';
import { restoreZoneContents } from './zonecontents';
import { syncTrainingYard } from './trainingYard';
import { FACTIONS, FIXTURE_IDS, MONSTERS } from '../data/monsters';
import { START_ZONE, objectiveEarnsChest } from '../data/zones';
import { BEACON_CFG } from '../data/beacons';
import { LEYLINE_CFG } from '../data/leyline';
import { RIFT_CFG } from '../data/rifts';
import { PYRE_CFG } from '../data/pyres';
import { DIG_CFG } from '../data/digsites';
import { type HoldFixture } from './holdObjectives';
import { PROCESSION_CFG } from '../data/processions';
import { BOUNTY_CFG } from '../data/bounties';
import { OFFERING_CFG, maybeAdoptObjective } from '../data/objectives';
import { type Doodad } from './levelgen';
import { transitDwell } from '../data/transit';
import { VOYAGE_CFG, VOYAGE_ZONE_ID } from '../world/voyage';
import { Rng } from '../core/rng';
import { ALTARS, INTERACT_PLACE_CFG, SHRINES, type AltarDef } from '../data/shrines';
import { GridWalkField } from '../world/gridWalk';
import { regionKind } from '../world/regions';
import { bootOccSites, reviveOccSite, seedOccClockMarks, wakeRousedResidents } from './occurrences';
import { makeSpeakerRow } from './speechGrammar';
import { buildZoneCollapse, COLLAPSE_CFG } from './collapse';
import { buildZoneSpans } from './spans';
import { buildZoneFlux, ConjuredGround, FLUX_CFG } from './flux';
import { dimensionDef } from '../world/dimensions';
import '../world/radiance';
import { pocketFormOf } from '../data/pocketForms';
import { townResidentsHere } from '../data/boroughs';
import { insideBounds } from '../world/shape';
import { featureEnabled, FEATURE } from '../meta/account';
import { allUnlockables, isUnlockOwned } from '../meta/unlocks';
import { mintNemesisName } from '../meta/nemesis';

/** Structural ports keep the original field/method types, including private
 * controller shapes, without requiring a World instance or importing it at runtime.
 * Read callbacks remain live. Memory restoration may replace the whole census. */
export interface NativeAreaBirthHost {
  readonly doodads:World['doodads'];
  readonly account:World['account'];
  readonly annexFound:World['annexFound'];
  zoneHasVendorCounter:World['zoneHasVendorCounter'];
  readonly vendorArmedBeat:World['vendorArmedBeat'];
  vendorStock:World['vendorStock'];
  vendorRestockAt:World['vendorRestockAt'];
  packageAskEngaged:World['packageAskEngaged'];
  zoneGenTagging:World['zoneGenTagging'];
  readonly arena:World['arena'];
  actors:World['actors'];
  objectiveDone:World['objectiveDone'];
  bossRun:World['bossRun'];
  readonly spires:World['spires'];
  readonly rifts:World['rifts'];
  readonly pyres:World['pyres'];
  readonly digs:World['digs'];
  objectiveLost:World['objectiveLost'];
  readonly exits:World['exits'];
  readonly zoneEntry:World['zoneEntry'];
  procession:World['procession'];
  occs:World['occs'];
  readonly time:World['time'];
  readonly zoneMemory:World['zoneMemory'];
  wave:World['wave'];
  waveActive:World['waveActive'];
  cull:World['cull'];
  shrines:World['shrines'];
  altars:World['altars'];
  offering:World['offering'];
  chests:World['chests'];
  readonly completedObjectives:World['completedObjectives'];
  readonly stationArmed:World['stationArmed'];
  fonts:World['fonts'];
  readonly discoveredWaypoints:World['discoveredWaypoints'];
  waypointPos:World['waypointPos'];
  readonly townTierIdx:World['townTierIdx'];
  readonly speakerRows:World['speakerRows'];
  readonly sim:World['sim'];
  theaterSpots:World['theaterSpots'];
  theaterAmbientBudget:World['theaterAmbientBudget'];
  theaterVisit:World['theaterVisit'];
  readonly theaterVisitSeq:World['theaterVisitSeq'];
  theaterQuiet:World['theaterQuiet'];
  mercOutpost:World['mercOutpost'];
  mercDwell:World['mercDwell'];
  mercDwellFired:World['mercDwellFired'];
  skyBelow:World['skyBelow'];
  collapse:World['collapse'];
  readonly zone:World['zone'];
  readonly walk:World['walk'];
  readonly currentZoneSeed:World['currentZoneSeed'];
  flux:World['flux'];
  spans:World['spans'];
  conjured:World['conjured'];
  readonly zoneRuntimes:World['zoneRuntimes'];
  readonly descentRun:World['descentRun'];
  wraithsailSeaStash:World['wraithsailSeaStash'];
  voyage:World['voyage'];
  readonly player:World['player'];
  readonly setDoorState:World['setDoorState'];
  readonly bootHarborhold:World['bootHarborhold'];
  readonly bootQuay:World['bootQuay'];
  readonly openHollow:World['openHollow'];
  readonly annexReveal:World['annexReveal'];
  readonly nativeInhabitantHost:World['nativeInhabitantHost'];
  readonly restockOrdinal:World['restockOrdinal'];
  readonly armVendorStock:World['armVendorStock'];
  readonly syncHoldIdx:World['syncHoldIdx'];
  readonly restockSeconds:World['restockSeconds'];
  readonly effectiveSpawn:World['effectiveSpawn'];
  readonly baseTable:World['baseTable'];
  readonly spawnPacks:World['spawnPacks'];
  readonly spawnContest:World['spawnContest'];
  readonly farPoint:World['farPoint'];
  readonly weightedPick:World['weightedPick'];
  readonly createMonster:World['createMonster'];
  readonly clampPos:World['clampPos'];
  readonly text:World['text'];
  readonly uberDefeated:World['uberDefeated'];
  readonly promoteRarityStacked:World['promoteRarityStacked'];
  readonly seededDraw:World['seededDraw'];
  readonly interactSpot:World['interactSpot'];
  readonly findFreeSpot:World['findFreeSpot'];
  readonly bootScenery:World['bootScenery'];
  readonly bootPuzzles:World['bootPuzzles'];
  readonly bootThrong:World['bootThrong'];
  readonly bootLite:World['bootLite'];
  readonly bootHarvest:World['bootHarvest'];
  readonly traceAbortAll:World['traceAbortAll'];
  readonly bootGeysers:World['bootGeysers'];
  readonly bootLiteVentSeats:World['bootLiteVentSeats'];
  readonly bootEscapeChase:World['bootEscapeChase'];
  readonly spawnPoint:World['spawnPoint'];
  readonly countedEnemies:World['countedEnemies'];
  readonly spawnWildlife:World['spawnWildlife'];
  readonly enforceArrivalGrace:World['enforceArrivalGrace'];
  readonly restoreZoneEnemies:World['restoreZoneEnemies'];
  readonly seedCullMarks:World['seedCullMarks'];
  readonly seedGatherNodes:World['seedGatherNodes'];
  readonly noteBountyArrivals:World['noteBountyArrivals'];
  readonly occHost:World['occHost'];
  readonly rollCullNeed:World['rollCullNeed'];
  readonly townSeat:World['townSeat'];
  readonly armLastlightRecruiter:World['armLastlightRecruiter'];
  readonly theaterRunBeat:World['theaterRunBeat'];
  readonly placeEncounters:World['placeEncounters'];
  readonly placeVocationSites:World['placeVocationSites'];
  readonly placeMercOutpost:World['placeMercOutpost'];
  readonly manifestNemeses:World['manifestNemeses'];
  readonly applyGrudgeEffects:World['applyGrudgeEffects'];
  readonly spawnPlayerCorpses:World['spawnPlayerCorpses'];
  readonly nearestZoneOf:World['nearestZoneOf'];
  readonly radianceCondHeld:World['radianceCondHeld'];
  readonly hostileTo:World['hostileTo'];
  readonly placeDescentDelver:World['placeDescentDelver'];
  readonly enterDescentZone:World['enterDescentZone'];
  readonly streamCoast:World['streamCoast'];
  readonly attachZoneWells:World['attachZoneWells'];
  readonly nativeInhabitantSources:NativeInhabitantSources;
  maybeAdoptObjective(def:ZoneDef,layout:GeneratedLayout):ReturnType<typeof maybeAdoptObjective>;
  syncAltarBodies():ReturnType<typeof syncAltarBodies>;
  restoreZoneContents(contents:Parameters<typeof restoreZoneContents>[1]):void;
  syncTrainingYard():ReturnType<typeof syncTrainingYard>;
}
export type NativeAreaBirthMemory=World['zoneMemory'] extends Map<string,infer Memo>?Memo:never;

/** Keep the real post-layout RNG and ambient random scope. Errors preserve
 * native partial effects; preparation is not a rollback transaction. */
export function birthNativeArea(host:NativeAreaBirthHost,def:ZoneDef,layout:GeneratedLayout,zoneId:string,
  memory:NativeAreaBirthMemory|null|undefined,rng:Rng,firstVisit:boolean,from:string|undefined,isCave:boolean,p:Actor):void {
    // Remembered DOOR STATES re-apply first (an opened gate stays open across the
    // memory's life): the layout regenerated pristine doors above; the shared
    // setDoorState path flips + repaints them silently.
    for (const [doorId, st] of Object.entries(memory?.doorState ?? {})) {
      host.setDoorState(doorId, st, { silent: true });
    }
    // LESSON DOORS mint open for GRADUATED accounts (DoodadDoor.lesson names
    // an account-ledger key; the first dwell-open stamped it). Applied before
    // the breakable door-actor spawn below so a graduated 'both'-mode door
    // never posts a guard on an already-open frame. Zone memory above stays
    // authoritative for this run's own openings; this is the veteran's key.
    for (const d of host.doodads) {
      const lesson = d.door && !d.door.open && !d.door.broken ? d.door.lesson : undefined;
      if (lesson && (host.account?.ledger[lesson] ?? 0)) {
        host.setDoorState(d.door!.id, 'open', { silent: true });
      }
    }
    // THE HARBORHOLD boot — after the door replays above on purpose: the
    // persisted hold state is AUTHORITATIVE over remembered opens (the town
    // may have fallen or rebuilt while you sailed; the gate must match the
    // state, not the memory).
    if (def.harborhold) host.bootHarborhold(def);
    else if (def.holdAnchor) host.bootQuay(def);
    // Remembered HOLLOWS re-open (the hollows fabric): the layout regenerated
    // them sealed above; re-carve each remembered id through the shared
    // openHollow path — revive mode furnishes STRUCTURE (the crevice shaft,
    // the vein, the camp) but never re-pays loot or re-wakes ambushes.
    for (const id of memory?.hollows ?? []) {
      host.openHollow(id, null, { silent: true, revive: true });
    }
    // REVEALED ANNEX PIECES (the composite bound) re-join the union the same
    // way — revive mode carves + re-dresses structure, never re-pays loot
    // (THE FIND LAW). After the layout: generation stays base-piece by
    // construction (the pieces were dormant through every boot consumer
    // above).
    for (const id of memory?.annexOpen ?? []) host.annexReveal(id, { silent: true, revive: true });
    // FOUND IS FOUND (her ruling — the run ledger outlives the memory): every
    // annex this run ever revealed here re-opens even when the TTL forgot
    // the visit — the mundane zone re-dressed on its own clock, the broken
    // wall stays broken. Sorted so a chain replays parents-first ('ax0' <
    // 'ax0.1' lexicographically); idempotent over the memory loop above.
    {
      const pfx = zoneId + ':';
      const found = [...host.annexFound].filter(k => k.startsWith(pfx)).sort();
      for (const key of found) host.annexReveal(key.slice(pfx.length), { silent: true, revive: true });
    }
    spawnNativeDoorGuards(host.nativeInhabitantHost(), host.nativeInhabitantSources, def, layout);
    spawnNativeFurniture(host.nativeInhabitantHost(), host.nativeInhabitantSources, def, layout);
    spawnNativeResidents(host.nativeInhabitantHost(), host.nativeInhabitantSources, def, layout);
    // Where there's a smith, there's a stock — armed on THE BEAT LAW's
    // lattice (floor(time / restockSeconds)): the shelf is a pure function
    // of (world seed, counter, beat), so within one beat the counter keeps
    // the SAME wares across zone hops and reloads — leaving town sheds
    // nothing, re-entering re-rolls nothing, and the countdown shows the
    // true remainder of the CURRENT beat, never a fresh full clock. A
    // TURNED beat (or a fresh world) arms anew, resolving THE STANDING
    // ORDER's away beats and re-seating reserved rows (the hold outlives
    // the stock array by design). Sold-out stays sold-out until the beat
    // turns — the wait IS the scarcity.
    host.zoneHasVendorCounter = layout.npcs.some(n => {
      const role = MONSTERS[n.id]?.npcRole;
      return role === 'vendor' || role === 'chandler';
    });
    if (layout.npcs.some(n => MONSTERS[n.id]?.npcRole === 'vendor')) {
      const beat = host.restockOrdinal();
      if (host.vendorArmedBeat['brandt'] !== beat) {
        host.vendorStock = host.armVendorStock('brandt');
        host.vendorArmedBeat['brandt'] = beat;
      } else {
        // Same beat, standing stock: just re-anchor held rows (free, and
        // keeps the seat law self-healing across any splice).
        host.syncHoldIdx('brandt', host.vendorStock);
      }
      host.vendorRestockAt = (beat + 1) * host.restockSeconds();
    }

    // THE ADOPTIVE LANE (data/objectives.ts): ground whose mint actually
    // STANDS an adoptable feature — a lair's den mouth, an apex native's
    // claim — may re-negotiate a BARE rolled cull into that feature's own
    // ask. Adoption, never dependency: the feature spawned by its own law in
    // the layout above, nothing is ever placed FOR the ask, and featureless
    // ground passes untouched (weight 0 structurally). Pure + rng-free
    // (seeded off def.seed), so every load, save and seat re-derives the
    // same verdict; the stamp is idempotent (an adopted kind never re-rolls).
    {
      // The world read opens THE PACKAGE CLASS (a standing guest may take the
      // ask; a stamped guest ask re-validates its presence — THE HAND-BACK);
      // the lair half is byte-identical with or without it. The engagement
      // latch is zone-local: every load starts the SURVIVE CONTRACT fresh.
      host.packageAskEngaged = false;
      const adopted = host.maybeAdoptObjective(def, layout);
      if (adopted) def.objective = adopted;
    }
    // Population: the objective decides who's waiting. Open the Zone Memory
    // tagging window so every BASE enemy spawned below is flagged fromZoneGen —
    // overlay/event spawns come AFTER the window closes and stay live.
    host.zoneGenTagging = true;
    const o = def.objective;
    // THE POOL RIM FILTER (the door law's kin — task_e2243782's coda):
    // generation is rect-blind, so an ellipse zone's POI pool can hold
    // points beyond the inscribed rim — ground no body can ever stand on.
    // Every consumer of this pool seats something a player must REACH
    // (spires, rift/pyre/dig fixtures, the siphon, the waypoint, chests,
    // shrines, spawner bodies, puzzle bells), and each clamps its seat,
    // which PROJECTS an out-of-rim pick onto the rim — where none of the
    // pick's guarantees (door clearance, walkability, spacing) were ever
    // measured; on carved ground the walk confine then drags it onto
    // walkable-but-unreachable cells beyond the rim. Filter the pool ONCE
    // at its birth, at the mouth clamp's own 28u margin: a surviving POI
    // is a seat every consumer's smaller body clamp provably leaves
    // unmoved (picked == clamped == dwelled), and a starved consumer
    // degrades to farPoint, whose samplePoint is already shape-aware.
    // Draw-free, and rect zones keep every POI BY CONSTRUCTION (the guard
    // never fires) — their draws are byte-identical.
    const pois = host.arena.shape === 'ellipse'
      ? layout.pois.filter(p => insideBounds(p, 28, host.arena))
      : [...layout.pois];
    // A SPECIAL arena (boss set-piece) spawns NOTHING ambient — no packs, no faction
    // contest. Only its authored boss (below) populates it.
    if (!def.special && o.kind !== 'waves' && o.kind !== 'safe') {
      // Day/night, weather, and faction territory bend the table and the count;
      // a conquered zone draws from its new ruler's roster (see baseTable).
      const e = host.effectiveSpawn(def, host.baseTable(def));
      host.spawnPacks(def, (o.kind === 'escape' ? 0.6 : 1) * e.countMul, e.table);
      // A node two hostile factions both hold spawns both — let them brawl.
      // (Hand-authored factionWar zones stage their own fight below.)
      if (!def.factionWar) host.spawnContest(def, e.inject);
    }
    // FACTION WAR: two rival hosts spawn mid-brawl at a contested point,
    // with skirmishing packs of each side scattered wider. Wade in, or
    // circle the carnage and pick off whoever limps away.
    if (def.factionWar) {
      const battlefield = host.farPoint(700);
      def.factionWar.forEach((factionId, side) => {
        const roster = FACTIONS[factionId];
        if (!roster) return;
        const dir = side === 0 ? -1 : 1;
        // the front line
        for (let pk = 0; pk < 2; pk++) {
          const type = host.weightedPick(roster.table, Math.max(1, def.level));
          const n = randInt(3, 5);
          for (let k = 0; k < n; k++) {
            const mw = host.createMonster(type, Math.max(1, def.level), 'enemy');
            mw.pos = host.clampPos(vec(
              battlefield.x + dir * (70 + rand(0, 60)),
              battlefield.y + (pk - 0.5) * 90 + rand(-40, 40)), mw.radius);
            host.actors.push(mw);
          }
        }
        // reinforcements in the field
        const at = host.farPoint(650);
        const type2 = host.weightedPick(roster.table, Math.max(1, def.level));
        for (let k = 0; k < randInt(3, 5); k++) {
          const mw = host.createMonster(type2, Math.max(1, def.level), 'enemy');
          mw.pos = host.clampPos(vec(at.x + rand(-80, 80), at.y + rand(-80, 80)), mw.radius);
          host.actors.push(mw);
        }
      });
      host.text(vec(p.pos.x, p.pos.y - 70),
        `${FACTIONS[def.factionWar[0]]?.name ?? def.factionWar[0]} wars with ${FACTIONS[def.factionWar[1]]?.name ?? def.factionWar[1]}!`,
        '#e85050', 15);
    }
    if (o.kind === 'boss') {
      // ONE-SHOT UBER lifecycle: a recorded forever-dead boss never re-spawns (the
      // zone becomes an empty cleared arena). Absent uber = a normal repeatable boss.
      if (!host.uberDefeated(o, def.id)) {
        const boss = host.createMonster(o.id, def.level + (o.levelBonus ?? 0), 'enemy');
        // Partial HP memory cannot restore broken parts or phase clocks.
        // Completed attempts still use ordinary cleared-zone memory.
        if (o.arenaBossRetry === 'restart' && !host.objectiveDone) boss.fromZoneGen = false;
        // The Unmade arena: spawn on the dais (pois[0]) instead of a random far point,
        // and init the in-zone choreography (no longer Crowned by default — see promote).
        if (def.layoutType === 'unmade_vault') {
          const dais = layout.pois.length ? layout.pois[0] : vec(host.arena.w / 2, host.arena.h / 2);
          boss.pos = host.clampPos(vec(dais.x, dais.y), boss.radius);
          // EXCLUDE the boss from Zone Memory (it's spawned inside the tagging window, so
          // clear the flag): re-entry should re-spawn it FRESH (full HP, replaying from
          // Phase I on a regenerated grid) — not restore a wounded body that would
          // phase-JUMP to the apex with stale flood/crack paint. Also keeps the arena
          // cleanly re-fightable (a killed Unmade respawns on the next entry).
          boss.fromZoneGen = false;
          const m = 70;
          host.bossRun = {
            bossId: o.id, anchor: vec(dais.x, dais.y),
            rect: { x0: m, y0: m, x1: host.arena.w - m, y1: host.arena.h - m },
          };
        } else if (layout.bossSeat) {
          // THE BOSS SEAT (GeneratedLayout.bossSeat — the dais law, generalized):
          // the recipe named where its ask stands — the vent cauldron seats
          // its maw IN the heart vent (engine/ventcauldron.ts); the dweller
          // sweep then finds that vent from the body's own seat.
          boss.pos = host.clampPos(vec(layout.bossSeat.x, layout.bossSeat.y), boss.radius);
        } else {
          boss.pos = host.clampPos(host.farPoint(720), boss.radius);
        }
        // OPT-IN difficulty spike (any boss): promote to an elite rarity, optionally
        // STACKED. Absent = a plain boss. The lever to crank a boss harder via data.
        if (o.promote) host.promoteRarityStacked(boss, o.promote.rarity, o.promote.stacks ?? 1);
        host.actors.push(boss);
      }
    }
    if (o.kind === 'spawners') {
      const n = rng.int(o.count[0], o.count[1]);
      for (let i = 0; i < n; i++) {
        const s = host.createMonster(o.spawnerId, def.level, 'enemy');
        const at = pois.length
          ? pois.splice(rng.int(0, pois.length - 1), 1)[0]
          : host.farPoint(740, false, host.seededDraw());
        s.pos = host.clampPos(vec(at.x, at.y), s.radius);
        host.actors.push(s);
      }
    }
    // SURVEY SPIRES (beacon): the objective fixtures stand at POIs — dormant
    // stone until a hero holds ground beside one (updateObjective drives the
    // charge, the lure, and the survey). count 1 = the lone spire; 2+ = the
    // ATTUNEMENT CIRCUIT's smaller waystones. A finished zone keeps LIT
    // stones (scenery — proof the ground is surveyed); remembered charges
    // resume exactly, stone by stone. Placement rides the layout rng, so a
    // remembered seed puts every stone back where it stood.
    if (o.kind === 'beacon') {
      const count = Math.max(1, o.count ?? 1);
      const circuit = count > 1;
      const bodyR = circuit ? BEACON_CFG.wayRadius : BEACON_CFG.radius;
      const need = o.chargeSec ?? transitDwell('beacon', BEACON_CFG.chargeSec);
      const charges = memory?.spireCharges
        ?? (memory?.spireCharge !== undefined ? [memory.spireCharge] : undefined);
      for (let i = 0; i < count; i++) {
        const at = host.interactSpot(pois, rng, 620, BEACON_CFG.portalClear);
        const pos = host.clampPos(vec(at.x, at.y), bodyR);
        const charge = host.objectiveDone ? need : Math.min(charges?.[i] ?? 0, need);
        const spireDoodad: Doodad = {
          pos: vec(pos.x, pos.y), radius: bodyR,
          kind: charge >= need
            ? (circuit ? BEACON_CFG.kindWayLit : BEACON_CFG.kindLit)
            : (circuit ? BEACON_CFG.kindWay : BEACON_CFG.kind),
        };
        host.doodads.push(spireDoodad);
        host.spires.push({ pos: vec(pos.x, pos.y), charge, doodad: spireDoodad, pourAt: 0, recoup: 0 });
      }
    }
    // THE CONTEST-LAW KIN (rifts / pyres / dig sites): the spire's placement
    // discipline verbatim — fixtures at POIs off the layout rng (a remembered
    // seed re-places every one on the same ground), remembered charges resume
    // fixture by fixture, and a finished zone stands them in their finished
    // face (sealed seam / burning bowl / opened mound — proof of work done).
    const placeHolds = (
      count: [number, number], need: number, bodyR: number, clear: number,
      kinds: { open: string; done: string }, charges: number[] | undefined,
      into: HoldFixture[],
    ): void => {
      const n = rng.int(count[0], count[1]);
      for (let i = 0; i < n; i++) {
        const at = host.interactSpot(pois, rng, 620, clear);
        const pos = host.clampPos(vec(at.x, at.y), bodyR);
        const charge = host.objectiveDone ? need : Math.min(charges?.[i] ?? 0, need);
        const d: Doodad = {
          pos: vec(pos.x, pos.y), radius: bodyR,
          kind: charge >= need ? kinds.done : kinds.open,
        };
        host.doodads.push(d);
        into.push({ pos: vec(pos.x, pos.y), charge, doodad: d, pourAt: 0, recoup: 0 });
      }
    };
    if (o.kind === 'rifts') {
      placeHolds(o.count ?? RIFT_CFG.count, o.sealSec ?? transitDwell('rift', RIFT_CFG.sealSec),
        RIFT_CFG.radius, RIFT_CFG.portalClear,
        { open: RIFT_CFG.kind, done: RIFT_CFG.kindSealed }, memory?.riftCharges, host.rifts);
    }
    if (o.kind === 'pyres') {
      placeHolds(o.count ?? PYRE_CFG.count, o.kindleSec ?? transitDwell('pyre', PYRE_CFG.kindleSec),
        PYRE_CFG.radius, PYRE_CFG.portalClear,
        { open: PYRE_CFG.kind, done: PYRE_CFG.kindLit }, memory?.pyreCharges, host.pyres);
    }
    if (o.kind === 'unearth') {
      placeHolds(o.count ?? DIG_CFG.count, o.digSec ?? transitDwell('digsite', DIG_CFG.digSec),
        DIG_CFG.radius, DIG_CFG.portalClear,
        { open: DIG_CFG.kind, done: DIG_CFG.kindDug }, memory?.digCharges, host.digs);
    }
    // THE BESIEGED WAYPOINT ('leyline'): the SIPHON seats at its own POI —
    // it taps the vein wherever it runs, and the drawn tether spans back to
    // the starved stone (the beam is the map to the fight). A promoted,
    // NAMED champion of the zone's own table by default (every biome's thief
    // is native; spec `id` pins a def), posted at its tap so nothing wanders
    // the objective away. Spawned inside the tagging window: the wounded
    // thief rides Zone Memory like any body, and a fallen one stays fallen
    // via completedObjectives. A rosterless zone spawns nothing — the
    // objective completes vacuously (the puzzle's no-wedge law).
    if (o.kind === 'leyline' && !host.objectiveDone) {
      let type = o.id && MONSTERS[o.id] ? o.id : undefined;
      if (!type && def.packs) {
        const e = host.effectiveSpawn(def, host.baseTable(def));
        const eligible = e.table.filter(en => {
          const d = MONSTERS[en.id];
          return !!d && !d.passive && !d.noObjective && !d.spawner;
        });
        // THE STATURE FLOOR (LEYLINE_CFG.siphonMinXp): the thief is a body
        // worth promoting — livestock-grade fauna stay in the flock. The
        // floor degrades gracefully: an all-critter table rolls unfiltered.
        const statured = eligible.filter(en =>
          (MONSTERS[en.id]?.xp ?? 0) >= LEYLINE_CFG.siphonMinXp);
        const pool = statured.length ? statured : eligible;
        if (pool.length) type = host.weightedPick(pool, def.level);
      }
      if (type) {
        const m = host.createMonster(type,
          Math.max(1, def.level + (o.levelBonus ?? LEYLINE_CFG.levelBonus)), 'enemy');
        const at = host.interactSpot(pois, rng, 640, LEYLINE_CFG.portalClear);
        m.pos = host.clampPos(host.findFreeSpot(vec(at.x, at.y), m.radius + 2) ?? vec(at.x, at.y), m.radius);
        host.promoteRarityStacked(m, o.rarity ?? LEYLINE_CFG.rarity, o.stacks ?? LEYLINE_CFG.stacks);
        const fac = m.faction ?? (m.defId ? MONSTERS[m.defId]?.faction : undefined) ?? '';
        m.name = `${mintNemesisName(fac, () => rng.next())}, ${rng.pick(LEYLINE_CFG.titles)}`;
        m.tag = 'ley_siphon';
        // Posted at the tap (the duty-post fabric): a displaced thief walks
        // back to the vein it drinks from.
        m.aiPost = vec(m.pos.x, m.pos.y);
        m.postSpec = { slack: LEYLINE_CFG.leash, hold: false };
        host.actors.push(m);
      }
    }
    // PROCESSION (escort): the caravan waits DORMANT beside the gate you came
    // in by — immobile, immune cargo until the rally dwell sets it rolling
    // (updateObjective owns the march, the robbers, the arrival, the loss).
    // The memory rider re-stages a left march exactly: same crossing, cart
    // re-waiting where you left it at its remembered health; a LOST caravan
    // stays lost until the memory lapses and the zone deals a fresh one.
    if (o.kind === 'procession' && !host.objectiveDone) {
      const rider = memory?.procession;
      if (rider?.lost) {
        host.objectiveLost = true;
      } else {
        const destIdx = def.exitRoads?.findIndex(r => r !== undefined) ?? -1;
        const destExit = destIdx >= 0 ? host.exits.find(x => x.defIndex === destIdx) : undefined;
        // Roadless fallback (a dead-end pocket): the farthest POI stands in
        // for the crossing — the escort runs, only the carved way is absent.
        const dest = destExit ? vec(destExit.pos.x, destExit.pos.y)
          : (pois.length ? vec(pois[pois.length - 1].x, pois[pois.length - 1].y)
            : host.farPoint(700, false, host.seededDraw()));
        const cart = host.createMonster(PROCESSION_CFG.cartId, Math.max(1, def.level), 'player');
        const pool = Math.round(PROCESSION_CFG.lifeBase + Math.max(1, def.level) * PROCESSION_CFG.lifePerLevel);
        cart.sheet.setSource('procession_cart', [{ stat: 'life', kind: 'flat', value: Math.max(0, pool - cart.maxLife()) }]);
        cart.fillResources();
        const spawnAt = rider?.x !== undefined && rider?.y !== undefined
          ? vec(rider.x, rider.y)
          : vec(host.zoneEntry.x + rand(-26, 26), host.zoneEntry.y + 44 + rand(-10, 10));
        cart.pos = host.clampPos(host.findFreeSpot(spawnAt, cart.radius + 2) ?? spawnAt, cart.radius);
        if (rider?.life !== undefined) cart.life = Math.max(1, Math.min(cart.maxLife(), rider.life));
        cart.untargetable = true; // dormant cargo — nothing chews it before the rally
        cart.invulnerable = true;
        cart.tag = 'procession_cart';
        cart.eventKey = `procession:${def.id}`;
        host.actors.push(cart);
        host.procession = {
          cartId: cart.id, rolling: false, started: !!rider?.started,
          startPos: rider?.sx !== undefined && rider?.sy !== undefined
            ? vec(rider.sx, rider.sy) : vec(cart.pos.x, cart.pos.y),
          dest, destIdx: destIdx >= 0 ? destIdx : null,
          dwellStart: 0, puffAt: 0, heading: angleTo(cart.pos, dest),
        };
      }
    }
    // AMBIENT SCENERY + THE PUZZLE PLACER (engine/puzzles.ts): the zone's
    // planted object-actors and activity riddles stand up HERE, each on its
    // own salted stream + the leftover POIs — never a generation concern,
    // never a draw off layout/spawn rng.
    host.bootScenery(def, pois);
    host.bootPuzzles(def, pois, memory);
    // THE THRONG POCKET BOOT (engine/throng.ts): finite gatherable husks
    // stand up on their own salted stream — same discipline as the two
    // lines above; claimed seats (throngClaimed, run-long) stay empty.
    host.bootThrong(pois);
    // THE LITE POOL BOOT (engine/lite.ts): carry keeper-owned rows across,
    // zero the pool, pour the theme's ambient swarms on their own salted
    // stream, re-field the carried roster — same boot discipline again.
    host.bootLite(def, pois);
    // THE RESOURCE HARVEST (engine/harvest.ts): the biome's gatherable
    // nodes stand up on their own salted stream — the same boot discipline,
    // placed LAST so every prior lane's pool draws stay byte-frozen.
    host.bootHarvest(def, pois, memory);
    // A trace never crosses a boundary either — the writ endures.
    host.traceAbortAll();
    // THE GEYSER FABRIC (engine/geysers.ts): timed vents + their current
    // bands stand up on their own salted stream — appended AFTER the lanes
    // above so their draws stay byte-frozen (the harvest seat's own law).
    // Authored rows (GeneratedLayout.authoredVents — the lake's metronome)
    // ride in beside the theme's counts.
    host.bootGeysers(def, pois, layout.authoredVents);
    // THE VENT SEAT (LiteSwarmRow.seat 'vents' — the steam-wisp tide): the
    // lite rows bootLite deferred seat at the vents that now stand, on
    // their own salted lane (no POI draw moved).
    host.bootLiteVentSeats();
    // THE ESCAPE SEAM (FrontSpawnRow.heels): under an 'escape' objective the
    // Char's chase lanes field at the party's heels the moment the zone
    // stands (creep field + party placement both done above).
    host.bootEscapeChase();
    spawnNativeFieldInhabitants(host.nativeInhabitantHost(), host.nativeInhabitantSources, def, layout);
    // BOUNTY WRITS: `count` of the zone's own bodies walk it as MARKED QUARRY —
    // named from the nemesis vocabulary, promoted, tagged, roaming with the
    // population. Spawned INSIDE the tagging window, so Zone Memory resumes a
    // half-claimed hunt with the SAME named marks at the same wounds (names,
    // rarity, tags and HP all ride ZoneEnemyMemo — no rider needed). A
    // completed zone posts no new writs; the board is settled.
    if (o.kind === 'bounty' && !host.objectiveDone) {
      const n = rng.int(o.count?.[0] ?? BOUNTY_CFG.count[0], o.count?.[1] ?? BOUNTY_CFG.count[1]);
      const { table } = host.effectiveSpawn(def, host.baseTable(def));
      const eligible = table.filter(en => {
        const md = MONSTERS[en.id];
        return !!md && !md.passive && !md.noObjective && !md.spawner && !md.npcRole;
      });
      for (let i = 0; i < n; i++) {
        let m: Actor | null;
        if (eligible.length) {
          const type = host.weightedPick(eligible, Math.max(1, def.level));
          m = host.createMonster(type, Math.max(1, def.level), 'enemy');
          m.pos = host.spawnPoint(24);
          host.actors.push(m);
        } else {
          // No eligible roster (a strange zone) — post the writ on an existing
          // counted body instead; an empty zone simply posts fewer writs.
          m = host.countedEnemies().find(a =>
            a.tag !== 'bounty_mark' && (a.rarity ?? 'normal') === 'normal') ?? null;
          if (!m) break;
        }
        host.promoteRarityStacked(m, o.rarity ?? BOUNTY_CFG.rarity, o.stacks ?? BOUNTY_CFG.stacks);
        // Two writs must never name the same quarry (a small pool re-rolls a
        // few times, then concedes — a rare double is livable, a common one
        // reads as a bug).
        const fac = m.faction ?? (m.defId ? MONSTERS[m.defId]?.faction : undefined) ?? '';
        let name = mintNemesisName(fac, () => rng.next());
        for (let tries = 0; tries < 4 && host.actors.some(a => a !== m && a.tag === 'bounty_mark' && a.name === name); tries++) {
          name = mintNemesisName(fac, () => rng.next());
        }
        m.name = name;
        m.tag = 'bounty_mark';
      }
    }
    // WILDLIFE: the biome's ambient fauna (WILDLIFE registry) — hares that
    // exist to be chased, the wolf packs that chase them. AMBIENT_TAGS
    // bearers all, so no objective ever waits on a rabbit. Spawned inside
    // the tagging window: the meadow you left is the meadow you return to.
    host.spawnWildlife(def);
    // ARRIVAL GRACE (purchased pockets): the sold ground has exactly ONE
    // portal and the buyer arrives through it — a fair landing is part of
    // the promise. Fresh gens sweep hostiles off the entry ring (gen-time
    // camps/garrisons can seat anywhere; the samplers already keep away);
    // remembered re-entries are exempt on purpose — bodies the PLAYER led to
    // the door are history, not generation.
    if (def.pocket && !memory) host.enforceArrivalGrace();
    // Close the Zone Memory tagging window: the base population is placed. On a
    // remembered re-entry, swap the freshly-spawned base enemies for the ones we
    // left (cleared stays cleared; survivors keep their wounds + positions).
    host.zoneGenTagging = false;
    if (memory) host.restoreZoneEnemies(memory);
    // THE CULL's marks (bounty board M1): a held cull posting targeting
    // THIS zone posts its quarry through the promote-and-name grammar —
    // AFTER the memory swap, or a remembered re-entry would swallow the
    // fresh marks (the posting is usually taken after the ground was first
    // walked, so the memo knows none). Only the REMAINDER posts (count −
    // claimed − standing), so wiped ground, remembered ground and fresh
    // ground all deal the hunt back honestly — the claim ledger rides the
    // POSTING, never the population. (Marks may re-mint with fresh names
    // between visits; the ledger, not the fiction, is the law here.)
    host.seedCullMarks(def, rng);
    // THE GATHER's ground (first-writ W2): a held gather posting targeting
    // this zone plants its remainder of nodes — the cull's remote-writ law
    // on the harvest fabric.
    host.seedGatherNodes(def, pois);
    // THE ERRAND's deed is the walk itself: arriving in a held errand's
    // zone flips the hand ready and speaks the withhold prompt.
    host.noteBountyArrivals(def, firstVisit, from);
    // THE OCCURRENCE FABRIC (engine/occurrences.ts): adopt the mint's planted
    // triggers — armed spots carry NO standing state (invisible by
    // construction); a remembered SPRUNG spot re-stands its seeded wound +
    // fixture. Outside the tagging window on purpose: poured kin are
    // transient population, never memory-captured twice.
    host.occs = bootOccSites(def.id, memory?.occSprung);
    for (const s of host.occs) if (s.state === 'sprung') reviveOccSite(host.occHost(), s);
    // THE WORLD-CLOCK WAKE (engine/occurrences.ts): seed every armed clock
    // site's watermark from this ground's own leave-stamp — the first driven
    // frame settles the windows the absence spanned, exact arithmetic, no
    // world sweep — then wake any dormant-tagged resident a sprung
    // rouseResident occurrence names: this zone's own sites, or the parent
    // ring's when this ground is its den (the caveDepth-gated exit peek).
    // Pure reads over standing sprung state; with no rouse row, no-ops.
    seedOccClockMarks(host.occs, memory?.savedAt, host.time);
    wakeRousedResidents(host.occHost(), def, host.occs,
      zid => host.zoneMemory.get(zid)?.occSprung, host.actors);
    // WAVES REMEMBERED: a left assault resumes where it stood — the counter and
    // the mid-wave survivors both ride Zone Memory (exits no longer seal on
    // waves, so an open road must never reset the gauntlet). A completed arena
    // stays completed via completedObjectives; past the TTL the fight re-arms
    // fresh, like every other forgotten ground.
    if (memory && o.kind === 'waves' && !host.objectiveDone) {
      host.wave = Math.max(0, Math.floor(memory.wave ?? 0));
      host.waveActive = !!memory.waveActive;
    }
    // THE CULL (kind 'clear'): stamp the ask. A remembered ground resumes its
    // OWN ask + tally (the need must never re-derive from a thinned field);
    // fresh ground derives it here — after the base population stands, so a
    // frac share reads the true fresh count. `all: true` stamps nothing (the
    // classic full clear: updateObjective's empty-floor rule is the whole
    // law there), and neither does a completed zone.
    if (o.kind === 'clear' && !o.all && !host.objectiveDone) {
      const remembered = Math.floor(memory?.cullNeed ?? 0);
      const need = remembered > 0 ? remembered : host.rollCullNeed(o, rng);
      if (need > 0) {
        host.cull = { need, kills: clamp(Math.floor(memory?.cullKills ?? 0), 0, need) };
      }
    }
    // A CLEARED side area stays cleared PERMANENTLY (run-long), even past the memory
    // TTL: drop its base population so re-entry never re-stocks a one-time cave (the
    // objective is already done; exits are already open). Surface zones still refresh.
    if (isCave && host.objectiveDone) {
      host.actors = host.actors.filter(a => !(a.fromZoneGen && a.team === 'enemy' && !(a.defId && MONSTERS[a.defId]?.passive)));
    }

    // Leftover points of interest hold treasure, shrines, and altars. (A SPECIAL
    // arena gets NONE of this clutter — it's a clean boss stage.)
    host.shrines = [];
    host.altars = [];
    if (!def.special && o.kind !== 'waves' && o.kind !== 'safe') {
      // PLACEMENT HYGIENE: every interactive stand keeps the data-driven door
      // clearance (INTERACT_PLACE_CFG / def.portalClear) — no altar atop a
      // portal, however cramped the isles (interactSpot degrades gracefully).
      const rollAltar = (): AltarDef =>
        rng.weighted(ALTARS.map(d => ({ d, weight: d.weight ?? 1 }))).d;
      // THE OFFERING ALTAR (kind 'offering'): the objective's centerpiece takes
      // the FIRST spot — an altar from the registry (spec-pinned or weight-
      // rolled, so a storm or gilded row reshapes the whole ask), hungry for
      // `need` deaths inside its field. Offered progress rides Zone Memory;
      // a finished zone keeps no hungering altar (the ground is sated).
      if (o.kind === 'offering' && !host.objectiveDone) {
        const adef = (o.altarId && ALTARS.find(a => a.id === o.altarId)) || rollAltar();
        const at = host.interactSpot(pois, rng, 650, adef.portalClear ?? INTERACT_PLACE_CFG.portalClear);
        host.altars.push({
          pos: host.clampPos(vec(at.x, at.y), 16), def: adef,
          affected: new Set(), objective: true,
        });
        const need = rng.int(o.need?.[0] ?? OFFERING_CFG.need[0], o.need?.[1] ?? OFFERING_CFG.need[1]);
        host.offering = {
          altarIdx: host.altars.length - 1,
          offered: Math.min(memory?.altarOffered ?? 0, need),
          need,
        };
      }
      const caches = (rng.chance(0.5) ? 1 : 0) + (rng.chance(0.15) ? 1 : 0);
      for (let i = 0; i < caches; i++) {
        const c = host.createMonster(FIXTURE_IDS.gem_cache, def.level, 'enemy');
        c.fromZoneGen = true;
        const at = host.interactSpot(pois, rng, 600, INTERACT_PLACE_CFG.portalClear);
        c.pos = host.clampPos(vec(at.x, at.y), c.radius);
        if (!memory?.contents) host.actors.push(c);
      }
      if (rng.chance(0.65)) {
        const sdef = rng.pick(SHRINES);
        const at = host.interactSpot(pois, rng, 500, sdef.portalClear ?? INTERACT_PLACE_CFG.portalClear);
        host.shrines.push({ pos: host.clampPos(vec(at.x, at.y), 14), def: sdef, used: false });
      }
      if (rng.chance(0.45)) {
        const adef = rollAltar();
        const at = host.interactSpot(pois, rng, 600, adef.portalClear ?? INTERACT_PLACE_CFG.portalClear);
        host.altars.push({ pos: host.clampPos(vec(at.x, at.y), 16), def: adef, affected: new Set() });
      }
    }
    host.syncAltarBodies();
    // The purchased ground's FORM (data/pocketForms.ts): a pocket wears the
    // shape it was minted with — the treasure litter below and the ambient-
    // event gate both read it. Null on ordinary ground.
    const pform = def.pocket ? pocketFormOf(def.pocketForm) : null;
    // Reward chests: gated objectives earn a locked treasure; the wilds
    // sometimes hide a timed chest — and some chests bite back. (Not in a special
    // arena — its reward is the quest turn-in, not a zone chest.)
    host.chests = [];
    if (!def.special && o.kind !== 'safe') {
      // Chest-worthiness is its own policy row (objectiveEarnsChest) — DECOUPLED
      // from exit-sealing, so an unsealed waves/spawners zone still stakes its
      // locked treasure on the objective.
      const gated = objectiveEarnsChest(o);
      // No objective chest on a zone whose reward was already claimed this run.
      if (gated && !host.completedObjectives.has(def.id) && rng.chance(0.75)) {
        const at = host.interactSpot(pois, rng, 500, INTERACT_PLACE_CFG.portalClear);
        host.chests.push({
          pos: host.clampPos(vec(at.x, at.y), 14),
          kind: 'objective', mimic: false, opened: false, lockTime: 0, maxLock: 0,
        });
      }
      if (o.kind !== 'waves' && rng.chance(0.3)) {
        const at = host.interactSpot(pois, rng, 550, INTERACT_PLACE_CFG.portalClear);
        host.chests.push({
          pos: host.clampPos(vec(at.x, at.y), 14),
          kind: 'timed', mimic: rng.chance(0.25), opened: false,
          lockTime: 3, maxLock: 3,
        });
      }
    }

    // PURCHASED-POCKET TREASURE (the form's litter): the hoard's whole point
    // is walking in ON the plunder. Extra gem-caches seed the POIs, and a
    // guaranteed chest stakes the centerpiece — kind 'objective' seals it on
    // the zone's own ask (fell the guard, take the hoard), deliberately
    // bypassing objectiveEarnsChest: the FORM stakes the treasure, that's
    // what the toll bought. Same rng/POI discipline as the rolls above, so
    // revisits replay the same litter.
    if (pform && !def.special && o.kind !== 'safe') {
      if (pform.caches) {
        const n = rng.int(pform.caches[0], pform.caches[1]);
        for (let i = 0; i < n; i++) {
          const c = host.createMonster(FIXTURE_IDS.gem_cache, def.level, 'enemy');
          c.fromZoneGen = true;
          const at = host.interactSpot(pois, rng, 520, INTERACT_PLACE_CFG.portalClear);
          c.pos = host.clampPos(vec(at.x, at.y), c.radius);
          if (!memory?.contents) host.actors.push(c);
        }
      }
      if (pform.chest && !host.completedObjectives.has(def.id)
        && !host.chests.some(c => c.kind === pform.chest)) {
        const at = host.interactSpot(pois, rng, 520, INTERACT_PLACE_CFG.portalClear);
        host.chests.push({
          pos: host.clampPos(vec(at.x, at.y), 14),
          kind: pform.chest, mimic: false, opened: false,
          lockTime: pform.chest === 'timed' ? 3 : 0, maxLock: pform.chest === 'timed' ? 3 : 0,
          // THE THEMED CACHE: a tinted toll's promised gear rarity rides the
          // staked chest (ZoneDef.cacheRarity, baked at the pocket mint).
          ...(def.cacheRarity ? { rarity: def.cacheRarity } : {}),
        });
      }
    }

    if (memory?.contents) host.restoreZoneContents(memory.contents);

    // THE ARRIVAL LATCH re-arms per zone: every station must see its disc
    // EMPTY once before its dwell may fire (stationDwellArmed).
    host.stationArmed.clear();
    // Sacrificial Font placement follows the shared settlement service policy.
    // The town seat is a REAL site (townBuild.ts FONT_SITE — shared with
    // nearFont's reach), not the old centre-plaza formula: the centre is
    // the waypoint + bounty board's working ground.
    host.fonts = [];
    if (fontStandsIn(def)) {
      const at = def.id === START_ZONE
        ? host.townSeat('font')
        : (pois.length ? pois.splice(rng.int(0, pois.length - 1), 1)[0]
          : host.farPoint(450, false, host.seededDraw()));
      host.fonts.push({ pos: host.clampPos(vec(at.x, at.y), 18) });
    }
    // The waypoint, for zones that carry one (the town's always burns).
    // A WAYPOINTLESS DIMENSION (DimensionDef.waypoints: false) heals any
    // persisted def that predates the vow — the flag strips, the attunement
    // forgets, and no ring ever lights up here again (save tolerance: older
    // Aetherial saves carried a Firmament waypoint).
    if (def.waypoint && dimensionDef(def.dimension).waypoints === false) {
      def.waypoint = false;
      host.discoveredWaypoints.delete(def.id);
    }
    host.waypointPos = null;
    if (def.waypoint) {
      const at = def.id === START_ZONE
        ? host.townSeat('waypoint')
        : (pois.length ? pois.splice(rng.int(0, pois.length - 1), 1)[0]
          : host.farPoint(420, false, host.seededDraw()));
      host.waypointPos = host.clampPos(vec(at.x, at.y), 18);
      // You know the way home: the town's waypoint starts attuned.
      if (def.id === START_ZONE) host.discoveredWaypoints.add(def.id);
    }
    // The normal arrival and developer unlock share one idempotent range mint.
    host.syncTrainingYard();
    // THE TRACKER: the Bestiary's keeper camps at the west edge once his
    // Vault feature is bought (townBuild raised his fire; the body and the
    // fixture line up at TRACKER_SITE).
    if (def.id === START_ZONE && featureEnabled(host.account, FEATURE.TRACKER)) {
      const t = host.createMonster(FIXTURE_IDS.townsfolk_tracker, 1, 'player');
      // South of his fire, facing it — clear of the camp's own rocks (the
      // old north-east stand overlapped a rock and got shoved off its seat).
      t.pos = host.clampPos(host.townSeat('tracker', 0, 34), t.radius);
      host.actors.push(t);
    }
    // THE RECRUITER'S TABLE (FEATURE.MERC_RECRUITER): the Vault's officer
    // sets up in the east quarter — a PORT-identical counter (template
    // blades, no retirement) whose single-serve sheet is dealt once per
    // world and locked (THE MUSTER-ROLL LAW; armLastlightRecruiter). The
    // merc-state reset further down SPARES an armed port counter whose
    // captain stands in this zone's actors — this one, exactly like the
    // quay boot's.
    if (def.id === START_ZONE && featureEnabled(host.account, FEATURE.MERC_RECRUITER)) {
      const officer = host.createMonster(FIXTURE_IDS.merc_captain, 1, 'player');
      officer.name = 'the Recruiting Officer';
      officer.pos = host.clampPos(host.townSeat('recruiter', 24, -18), officer.radius);
      host.actors.push(officer);
      host.doodads.push({
        pos: host.clampPos(host.townSeat('recruiter', -20, 14), 10),
        radius: 9, kind: 'merc_banner', rot: 0,
      });
      host.armLastlightRecruiter(officer, def.id);
    }
    // THE RESIDENTS (data/boroughs.ts TOWN_RESIDENTS): the families the
    // Boroughs sent home stand at their cottage doors in the ward — every row
    // whose gate the account holds AND whose cottage this tier raises. Named
    // + given their line at the seat (the recruiting officer's rename idiom);
    // nothing persists — the town re-lays from the account at every load.
    if (def.id === START_ZONE) {
      // `unlock` avenues resolve through the catalog (the gatework's closure
      // shape — boroughs.ts stays a leaf and never imports the catalog).
      const owned = (id: string): boolean => {
        const u = allUnlockables().find(x => x.id === id);
        return !!u && isUnlockOwned(host.account, u);
      };
      for (const { row, pos: at } of townResidentsHere(host.account, host.townTierIdx, owned)) {
        const r = host.createMonster(row.def, 1, 'player');
        r.name = row.name;
        r.pos = host.clampPos(vec(at.x, at.y), r.radius);
        host.actors.push(r);
        // THE TRANSIENT TELLING's 'resident' lane (speechTell) + THE SPEECH
        // GRAMMAR's WARD company: every family is one named speaker.
        host.speakerRows.set(r.id, makeSpeakerRow(r.id, row.line, 'resident', {
          key: `ward:${row.id}`, company: 'ward', name: row.name, roles: row.roles ?? ['resident'], own: [row.line],
        }));
      }
    }
    // The entered place is visible in its terrain and the existing location readout.
    rand(-10, 10); // retain the retired native entry-title jitter draw
    // If a warband is storming this ground as you arrive, you'll know it.
    const invader = host.sim.zoneStatus(def).invadedBy;
    if (invader && FACTIONS[invader]) {
      host.text(vec(p.pos.x, p.pos.y - 92),
        `${FACTIONS[invader].name} storms ${def.name}!`, '#e8a050', 16);
    }

    // A faction's WARLORD rules its capital — walking in is a boss fight, and
    // cutting it down is how you break that faction's grip on the world.
    const lord = host.sim.warlord.lordAt(def.id);
    if (lord && o.kind !== 'boss' && host.sim.faction.owner(def.id).faction === lord.faction) {
      const bossId = host.sim.warlord.bossId(lord.faction);
      if (bossId && MONSTERS[bossId]) {
        const wl = host.createMonster(bossId, def.level + 2, 'enemy');
        wl.faction = lord.faction;
        wl.xpValue = Math.max(wl.xpValue, 120); // a warlord's bounty (the top
        // bar itself is the authored-boss contract — World.bossBarInfo)
        wl.tag = 'warlord';
        wl.pos = host.clampPos(host.farPoint(700), wl.radius);
        host.actors.push(wl);
        const wname = (FACTIONS[lord.faction]?.name ?? lord.faction).replace(/^the /, '');
        host.text(vec(p.pos.x, p.pos.y - 116), `${wname} warlord rules ${def.name}!`, '#e85050', 16);
      }
    }

    // THE THEATER FABRIC (engine/theater.ts): the zone's own life may already
    // be playing here — the owner's patrol on its beat, a siege at a camp,
    // hell's grind-column on the march. Texture, never objective: skipped in
    // town, the arenas, and hand-authored war zones; a pocket FORM may
    // decline it outright (ambientEvents: false — a bought strongroom hosts
    // no patrols). The ENTRY beat (beat 0) skips on a REMEMBERED re-entry (a
    // fresh patrol every time you cross back would itself be a "re-entry
    // punish"); THE DWELL CADENCE (updateTheater) keeps drawing while you
    // stay — lingering provides the world's life, as the world does not
    // revolve around the player. Every draw is a pure keyed hash (seed ×
    // zone × visit × kind × beat — engine/theater.ts THE DRAW LAW), so the
    // fabric consumes NOTHING from the global die and kinds can never
    // starve each other (the old one-shared-roll first-bite cascade is
    // dead). Mycelia suppression still smothers the beat (the bloom choking
    // out competing turmoil), folded inside runTheaterBeat off its own
    // keyed stream.
    host.theaterSpots = {
      camps: layout.camps.map(c => vec(c.x, c.y)),
      pois: layout.pois.map(c => vec(c.x, c.y)),
    };
    // The ambient envelope THE POUR LEDGER bands replacement kinds against:
    // the zone's own booted counted population, stamped ONCE per visit —
    // emptying the floor never regrows the band.
    host.theaterAmbientBudget = host.countedEnemies().length;
    host.theaterVisit = (host.theaterVisitSeq.get(def.id) ?? 0) + 1;
    host.theaterVisitSeq.set(def.id, host.theaterVisit);
    host.theaterQuiet = o.kind === 'safe' || o.kind === 'waves' || !!def.factionWar
      || pform?.ambientEvents === false;
    if (!host.theaterQuiet && !memory) {
      // MYCELIA suppression gates the entry beat on the LIVE die, exactly as
      // the old lane's roll did (a spore-smothered zone stays smothered);
      // dwell beats re-check it keyed inside theaterRunBeat.
      const sup = host.sim.myceliaField?.suppressionAt(def.id) ?? 1;
      if (sup >= 1 || Math.random() < sup) {
        // THE PARITY DRAW: the old shared entry roll spent one global draw
        // HERE on every eligible fresh entry — seated or not — and every
        // seed-pinned mint downstream of a zone entry is tuned against
        // that spend (probe_lairs' pinnacle scan and probe_straying's
        // fold pins caught its removal). The fabric's own draws are keyed
        // and spend nothing, so the old spend is preserved — and
        // discarded — to keep the world stream where the world left it.
        // Retiring this burn is a deliberate world-wide re-pin, never a
        // drive-by.
        void Math.random();
        host.theaterRunBeat(0);
      }
    }

    // In-zone ENCOUNTERS (Breach diamonds): rolled per package gate (pressure +
    // start level), so they begin appearing once a feature is live (Breach at L10).
    host.placeEncounters(def);

    // SECRET VOCATION SITES: a qualifying zone may host a hidden calling's
    // shrine (deterministic per zone + run seed) — see data/vocations.ts.
    host.placeVocationSites(def);

    // MERCENARY OUTPOST: a qualifying wild zone may host the market's camp
    // (same deterministic per-zone/run roll as the shrine sites). The reset
    // SPARES a PORT-POLICY counter whose captain stands in THIS zone's
    // actor list — the hold boot armed the quay's a step earlier
    // (refreshHoldServices), the town boot the recruiter's table, and the
    // unconditional null used to stomp them (an open town's captain woke
    // inert until the next live state transition — the quay boot made the
    // latent stomp load-bearing). A stale counter from the previous zone
    // still clears: its captain is not among the fresh actors.
    if (!(host.mercOutpost?.port && host.actors.includes(host.mercOutpost.captain))) {
      host.mercOutpost = null;
    }
    host.mercDwell = 0;
    host.mercDwellFired = false;
    if (!isCave) host.placeMercOutpost(def);

    // THE WORLD'S MEMORY: a remembered foe may step out of it (manifestation),
    // and a grudged faction's members fight the name a little harder.
    if (!isCave) {
      host.manifestNemeses(def);
      host.applyGrudgeEffects(def);
    }

    // CORPSE RUN: spawn any prior death whose coordinate matches this zone.
    host.spawnPlayerCorpses(def);

    // THE NETHER TIE (DimensionDef.over): a realm that HANGS OVER another
    // resolves the ground beneath it — the nearest charted zone of the world
    // below at THIS zone's own coordinate. Falls drop into it (proportional
    // landing) and the understory's windows look down on its true terrain.
    // Authored anchors (ZoneDef.below — launch shelves) outrank the resolver.
    host.skyBelow = null;
    {
      const over = dimensionDef(def.dimension).over;
      if (over !== undefined && !def.below) {
        const id = host.nearestZoneOf(over, def.map);
        if (id) host.skyBelow = { zoneId: id };
      }
    }

    // THE LIVING COLLAPSE (engine/collapse.ts): stand this zone's dissolving
    // ground up when its theme asks for it. Rolls on a SALTED copy of the
    // zone seed (never layout/spawn rng — the fog contract); the goal (the
    // never-melting platform the spine runs to) is the spec's named doodad,
    // else the exit standing farthest from the entry. Convex zones (no walk
    // grid) can't melt — buildZoneCollapse declines them.
    host.collapse = null;
    const cspec = host.zone.theme.collapse;
    if (cspec && host.walk instanceof GridWalkField) {
      let goal: Vec2 | null = null;
      if (cspec.goal?.doodad) {
        const g = host.doodads.find(d => d.kind === cspec.goal!.doodad);
        if (g) goal = vec(g.pos.x, g.pos.y);
      }
      if (!goal) {
        let bd = -1;
        for (const e of host.exits) {
          const d = dist(e.pos, host.zoneEntry);
          if (d > bd) { bd = d; goal = vec(e.pos.x, e.pos.y); }
        }
      }
      host.collapse = buildZoneCollapse(cspec, host.walk,
        new Rng((host.currentZoneSeed ^ COLLAPSE_CFG.salt) >>> 0), host.zoneEntry, goal,
        // Every exit portal HOLDS its ground (the anti-soft-lock floor): the
        // melt may strand you from a door tactically, never permanently.
        host.exits.map(e => vec(e.pos.x, e.pos.y)));
    }

    // THE LIVING FLUX (engine/flux.ts): stand this zone's shifting ground up
    // when its theme asks for it — pads, lanes and carriers all derive from
    // the kinds the layout painted; the salted stream keeps the fog contract.
    // The ladder anchor is the spec's named doodad, else the farthest exit.
    host.flux = null;
    const fspec = host.zone.theme.flux;
    if (fspec && host.walk instanceof GridWalkField) {
      let fgoal: Vec2 | null = null;
      if (fspec.goal?.doodad) {
        const g = host.doodads.find(d => d.kind === fspec.goal!.doodad);
        if (g) fgoal = vec(g.pos.x, g.pos.y);
      }
      if (!fgoal) {
        let bd = -1;
        for (const e of host.exits) {
          const d = dist(e.pos, host.zoneEntry);
          if (d > bd) { bd = d; fgoal = vec(e.pos.x, e.pos.y); }
        }
      }
      host.flux = buildZoneFlux(fspec, host.walk,
        new Rng((host.currentZoneSeed ^ FLUX_CFG.salt) >>> 0), host.zoneEntry, fgoal,
        host.exits.map(e => vec(e.pos.x, e.pos.y)));
    }

    // EPHEMERAL SPANS (engine/spans.ts): stand this zone's condition-held
    // ground up when its theme asks for it — sunbridges, star-spans, prism
    // walks. State derives from (world time, sky front, skyOf) alone, so a
    // resume or a co-op client re-derives the identical bridges. Painted to
    // the honest state IMMEDIATELY (arriving at night shows no sunbridge).
    host.spans = null;
    const sspec = host.zone.theme.spans;
    if (sspec?.length && host.walk instanceof GridWalkField) {
      host.spans = buildZoneSpans(sspec, host.walk, (c) => host.radianceCondHeld(c));
    }

    // CONJURED GROUND: every grid zone gets the ledger (conjurable region
    // kinds gate where it actually works — data, not a biome check). Wired
    // to whichever fabrics stood up so annexed cells melt/phase honestly.
    // EVERY zone gets the ledger (a convex interior holds presences with no
    // walkable half — the cells simply never place; conjurable region kinds
    // gate where the bridge half works — data, not a biome check).
    host.conjured = new ConjuredGround(
      host.walk instanceof GridWalkField ? host.walk : null,
      id => !!regionKind(id)?.conjurable,
      { collapse: host.collapse, flux: host.flux },
      // Side:'enemies' grants read the world's own hostility, not bare
      // team inequality (neutral fauna keeps out of other people's storms).
      (o, a) => host.hostileTo(o as Actor, a as Actor));

    // THE ZONE-RUNTIME REGISTRY (see buildZoneRuntimes): every package's
    // per-zone reset runs, then — on ordinary ground — every enter() fires.
    // A SPECIAL arena hosts NO overlay content on entry — mirror the
    // materializeLiveZoneEvents `host.zone.special` guard so the on-entry path
    // can't squat a Balor/crusade/hunt/fracture on the clean boss stage (the
    // eventOwned contract). The overlay SELECTORS also exclude it, but this is
    // the central catch. Rows flagged `ownedGround` are the one exception:
    // the event that MINTED a special arena must still stand its fight up
    // there (its selector only ever fires in zones its own overlay bound,
    // so nothing forfeits the contract).
    for (const r of host.zoneRuntimes) r.reset?.();
    if (!isCave && def.special) {
      for (const r of host.zoneRuntimes) {
        if (r.ownedGround) r.enter?.(def, false);
      }
    }
    if (!isCave && !def.special) {
      for (const r of host.zoneRuntimes) r.enter?.(def, false);
    } else {
      // POCKET-NATIVE runtimes (rows flagged `inCaves`): a package whose
      // whole mechanic LIVES in registered side-zones (the Unsealing's tomb
      // pockets) still stages on cave ground — the one sanctioned, opt-in
      // exception to the caves-are-invisible doctrine (the ownedGround
      // idiom; every other row keeps the classic silence below).
      if (isCave && !def.special) {
        for (const r of host.zoneRuntimes) {
          if (r.inCaves) r.enter?.(def, false);
        }
      }
      // DESCENT: a normal cave may host a Delver (rolled per mouth, gated). The
      // DESCENT abyss itself (cave_descent_*) never hosts one — it IS the dive.
      host.placeDescentDelver(def);
      // Arriving in the abyss: light the lamp + raise the climb-out shaft. (descend()
      // sets descentRun before loadZone, so this fires on the first descent frame.)
      if (host.descentRun && host.descentRun.caveId === def.id) host.enterDescentZone();
    }
    // RESUME A SUSPENDED VOYAGE: stepping off the Wraithsail's decks pops the
    // way-home stack back onto the sea — re-arm the stashed run exactly where
    // the boat was left (the resurfaceFromDescent idiom: any non-sea load
    // nulled `voyage`, so the stash IS the crossing). Fresh cast-off grace so
    // the hull's shadow can't dwell you straight back aboard, and the ghost
    // ship releases her boarding hold (the re-board cooldown arms).
    if (zoneId === VOYAGE_ZONE_ID && host.wraithsailSeaStash) {
      const stash = host.wraithsailSeaStash;
      host.wraithsailSeaStash = null;
      host.voyage = stash.run;
      host.voyage.grace = VOYAGE_CFG.castOffGrace;
      host.voyage.landDwell = 0;
      host.voyage.lastStreamAt = vec(Infinity, Infinity);
      host.player.pos = vec(stash.pos.x, stash.pos.y);
      host.sim.wraithsailField?.onBoardingLeft();
      host.streamCoast(true);
    }
    // POOLED-AMBIENT lightwells wake with the zone (after every doodad source
    // above — generation, memory restore, package dressing — has finished).
    host.attachZoneWells();
}

export type NativeAreaBirthArguments = Parameters<typeof birthNativeArea> extends [unknown,...infer Args]?Args:never;
