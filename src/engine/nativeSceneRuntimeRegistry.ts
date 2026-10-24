/** Complete native ordered event registry and live-entry dispatch. */
import type {World} from './world';
export interface NativeSceneRuntimeRegistryHost {
placeAscentGeyser:World['placeAscentGeyser'];
materializedHosts:World['materializedHosts'];
warbandMarches:World['warbandMarches'];
sim:World['sim'];
spawnWarband:World['spawnWarband'];
materializedEpicenters:World['materializedEpicenters'];
demonPortals:World['demonPortals'];
spawnEpicenter:World['spawnEpicenter'];
materializedCrusades:World['materializedCrusades'];
crusadePortals:World['crusadePortals'];
materializeCrusade:World['materializeCrusade'];
materializedHellWar:World['materializedHellWar'];
spawnHellCourt:World['spawnHellCourt'];
spawnHellMarshal:World['spawnHellMarshal'];
materializedDeadwakes:World['materializedDeadwakes'];
deadwakeStreamTimer:World['deadwakeStreamTimer'];
necropolisPortals:World['necropolisPortals'];
materializedDocks:World['materializedDocks'];
materializedMigrations:World['materializedMigrations'];
migrationStreamTimer:World['migrationStreamTimer'];
titans:World['titans'];
materializedWorldBoss:World['materializedWorldBoss'];
wbWalls:World['wbWalls'];
wbPassing:World['wbPassing'];
wbPassingKey:World['wbPassingKey'];
wbPassingGoal:World['wbPassingGoal'];
wbBoss:World['wbBoss'];
wbBossKey:World['wbBossKey'];
materializeWorldBossFight:World['materializeWorldBossFight'];
materializedHaunts:World['materializedHaunts'];
hauntStreamTimer:World['hauntStreamTimer'];
materializedStrayings:World['materializedStrayings'];
strayScene:World['strayScene'];
materializedDroves:World['materializedDroves'];
droveScene:World['droveScene'];
droveDressChecked:World['droveDressChecked'];
materializedWisplights:World['materializedWisplights'];
wispScene:World['wispScene'];
materializedLongNights:World['materializedLongNights'];
longNightStreamTimer:World['longNightStreamTimer'];
extractionDepartures:World['extractionDepartures'];
holdDefense:World['holdDefense'];
holdDwellRequested:World['holdDwellRequested'];
boroughRefugees:World['boroughRefugees'];
boroughArmRequested:World['boroughArmRequested'];
boroughArmFolkId:World['boroughArmFolkId'];
materializedBrigands:World['materializedBrigands'];
brigandLingerLeft:World['brigandLingerLeft'];
brigandsDrifting:World['brigandsDrifting'];
materializedContagion:World['materializedContagion'];
materializeContagion:World['materializeContagion'];
materializedDeepwinter:World['materializedDeepwinter'];
materializeDeepwinter:World['materializeDeepwinter'];
materializedInfestation:World['materializedInfestation'];
materializeInfestation:World['materializeInfestation'];
materializedBroods:World['materializedBroods'];
materializedSwarmWake:World['materializedSwarmWake'];
swarmStreamTimer:World['swarmStreamTimer'];
materializeBrood:World['materializeBrood'];
materializeSwarmWake:World['materializeSwarmWake'];
materializedCandle:World['materializedCandle'];
materializeCandle:World['materializeCandle'];
materializedStarfall:World['materializedStarfall'];
materializeStarfall:World['materializeStarfall'];
materializedMycelia:World['materializedMycelia'];
materializeMycelia:World['materializeMycelia'];
materializedHoldfasts:World['materializedHoldfasts'];
holdfastSite:World['holdfastSite'];
holdfastDwellKey:World['holdfastDwellKey'];
placeHoldfast:World['placeHoldfast'];
materializedUnsealing:World['materializedUnsealing'];
unsealingSite:World['unsealingSite'];
materializeUnsealing:World['materializeUnsealing'];
huntFootprint:World['huntFootprint'];
huntFootprintDwell:World['huntFootprintDwell'];
huntBeast:World['huntBeast'];
materializedHunts:World['materializedHunts'];
placeHuntContent:World['placeHuntContent'];
fractureRun:World['fractureRun'];
materializedFractures:World['materializedFractures'];
fractureRifts:World['fractureRifts'];
placeFractureContent:World['placeFractureContent'];
placeFractureRiftContent:World['placeFractureRiftContent'];
ritualSite:World['ritualSite'];
materializedRituals:World['materializedRituals'];
placeRitualSite:World['placeRitualSite'];
amalgamSite:World['amalgamSite'];
materializedAmalgam:World['materializedAmalgam'];
materializedAmalgamMobs:World['materializedAmalgamMobs'];
amalgamNecroDwell:World['amalgamNecroDwell'];
amalgamPickDwell:World['amalgamPickDwell'];
placeAmalgamation:World['placeAmalgamation'];
placeAmalgamMiniboss:World['placeAmalgamMiniboss'];
descentSite:World['descentSite'];
descentShaftDwell:World['descentShaftDwell'];
descentSpawnTimer:World['descentSpawnTimer'];
materializedObservers:World['materializedObservers'];
eventAnchors:World['eventAnchors'];
materializeObserver:World['materializeObserver'];
materializedWrits:World['materializedWrits'];
springVendettaAmbush:World['springVendettaAmbush'];
placeCaravanReturn:World['placeCaravanReturn'];
inCave:World['inCave'];
zoneRuntimes:World['zoneRuntimes'];
zone:World['zone'];
}
export type NativeSceneRuntimeRow=World['zoneRuntimes'][number];
export function buildNativeSceneRuntimes(nativeHost:NativeSceneRuntimeRegistryHost):NativeSceneRuntimeRow[] {
    return [
      {
        // ASCENT: an eligible open-sky zone may vent a sky geyser (rolled
        // per zone, gated + ignition-scaled through the overlay). On-entry
        // only — a geyser is discovered, never erupts under your feet.
        id: 'ascent', noLive: true,
        enter: (def) => nativeHost.placeAscentGeyser(def),
      },
      {
        // Fresh zone visit → no host materialized yet. If a host has ALREADY
        // reached this zone (you walked into an invasion in progress), its
        // warband stands at the entry it marched in by. On-entry only —
        // live arrivals are driven by the update loop's arrivals drain.
        id: 'warbands', noLive: true,
        reset: () => { nativeHost.materializedHosts.clear(); nativeHost.warbandMarches.length = 0; },
        enter: (def) => {
          const host = nativeHost.sim.invasion.hosts.find(h => h.arrived && h.targetZoneId === def.id);
          if (host) nativeHost.spawnWarband(host);
        },
      },
      {
        // You walked into (or a live eruption seized) a Demon Invasion's
        // epicenter — the Balor holds court. Resolved against the instance
        // governing THIS zone's dimension; a live eruption gets the
        // meteor-storm warning entrance (the `live` flag).
        id: 'demon_invasion',
        reset: () => { nativeHost.materializedEpicenters.clear(); nativeHost.demonPortals.length = 0; },
        enter: (def, live) => {
          const inv = nativeHost.sim.demonFieldFor(def.dimension)?.invasionOn(def.id);
          if (inv?.isEpicenter && (!live || !nativeHost.materializedEpicenters.has(inv.id))) nativeHost.spawnEpicenter(inv, live);
        },
      },
      {
        // A Crusade's field holds this ground — raise its works (camp /
        // fortress / city) and post its garrison, scaled to its local control.
        id: 'crusade',
        reset: () => { nativeHost.materializedCrusades.clear(); nativeHost.crusadePortals.length = 0; },
        enter: (def, live) => {
          const cru = nativeHost.sim.crusadeField?.crusadeOn(def.id);
          if (cru && (!live || !nativeHost.materializedCrusades.has(def.id))) nativeHost.materializeCrusade(cru);
        },
      },
      {
        // THE WAR BELOW: a HOT front fields the attacker's MARSHAL (the armies
        // themselves arrive through the owner/rival spawn injection); deep in
        // a lord's SANCTUM the lord itself MANIFESTS — in whatever zone the
        // player actually walked into (thrones are anchors, never zones).
        // Live re-invokes cover a front drifting onto the standing ground.
        id: 'underworld_war',
        reset: () => nativeHost.materializedHellWar.clear(),
        enter: (def) => {
          const hw = nativeHost.sim.hellWarField;
          if (!hw || def.dimension !== hw.dimension) return;
          if (hw.manifestHere(def.id)) nativeHost.spawnHellCourt(def);
          else if (hw.frontStage(def.id)) nativeHost.spawnHellMarshal(def);
        },
      },
      {
        // THE DEADWAKE pours in via the per-frame updateDeadwakeStream (a
        // relentless stream while a tide covers this zone) — reset only.
        id: 'deadwake',
        reset: () => { nativeHost.materializedDeadwakes.clear(); nativeHost.deadwakeStreamTimer = 0; nativeHost.necropolisPortals.length = 0; },
      },
      {
        // THE WRAITHSAIL alongside walks her court ashore via the per-frame
        // updateWraithsailDock (once per layover, never a stream) — reset only.
        id: 'wraithsail',
        reset: () => { nativeHost.materializedDocks.clear(); },
      },
      {
        // The herd pours via updateMigrationStream — reset only.
        id: 'migration',
        reset: () => { nativeHost.materializedMigrations.clear(); nativeHost.migrationStreamTimer = 0; },
      },
      {
        // Titans project their durable journey into local terrain. The live
        // update owns the cadence; entry only primes the warning pass.
        id: 'titans', noLive: true, reset: () => nativeHost.titans.reset(), enter: () => nativeHost.titans.update(0.25),
      },
      {
        // WORLD BOSSES: a settled serpent head / manifest apparition /
        // enthroned lair fields its fight — including one that manifests on
        // the standing zone live. Coil walls + the passing body are driven
        // per-frame by updateWorldBosses (they grow/move with time).
        // ownedGround: the minted arenas are SPECIAL zones — this row is
        // their owner and must fire there (fightAt only ever matches zones
        // this overlay bound, so foreign special stages stay clean).
        id: 'worldboss', ownedGround: true,
        reset: () => {
          nativeHost.materializedWorldBoss.clear();
          nativeHost.wbWalls.clear();
          nativeHost.wbPassing = null; nativeHost.wbPassingKey = ''; nativeHost.wbPassingGoal = null;
          nativeHost.wbBoss = null; nativeHost.wbBossKey = '';
        },
        enter: (def) => nativeHost.materializeWorldBossFight(def),
      },
      {
        // Haunts re-stand on re-entry (anchor / walking Wailing One at their
        // overlay-remembered wounds) via the per-frame updateHauntStream —
        // mid-play spawns are never zone-memory captured, so without this
        // reset a revisited haunt stood empty and unbreakable.
        id: 'haunting',
        reset: () => { nativeHost.materializedHaunts.clear(); nativeHost.hauntStreamTimer = 0; },
      },
      {
        // The Straying's scene is zone-local body refs — a zone change drops
        // them (the overlay keeps the head ledger; re-entry re-stages from it).
        id: 'straying',
        reset: () => { nativeHost.materializedStrayings.clear(); nativeHost.strayScene = null; },
      },
      {
        // The Drove's scene is zone-local body refs — a zone change drops
        // them (the overlay keeps the head ledger AND the pen's seat;
        // re-entry re-stages the wreck exactly where it fell).
        id: 'drove',
        reset: () => { nativeHost.materializedDroves.clear(); nativeHost.droveScene = null; nativeHost.droveDressChecked = null; },
      },
      {
        // The Wisplight's scene is zone-local body refs — a zone change drops
        // them (the overlay keeps the slot ledger; re-entry re-stages from it,
        // adopting a remembered ridden host by its ride mark).
        id: 'wisplight',
        reset: () => { nativeHost.materializedWisplights.clear(); nativeHost.wispScene = null; },
      },
      {
        // Long Night grounds re-stand on re-entry (the parked coach — and a
        // seated Countess — at their overlay-remembered wounds) via the
        // per-frame updateLongNight; the haunting row's exact contract.
        id: 'long_night',
        reset: () => { nativeHost.materializedLongNights.clear(); nativeHost.longNightStreamTimer = 0; },
      },
      {
        // Extraction: the seam itself re-rolls with the zone (encounter
        // fabric), but standing DISPERSAL ORDERS are zone-local state.
        id: 'extraction',
        reset: () => { nativeHost.extractionDepartures.length = 0; },
      },
      {
        // Harborhold: the hold STATE rides the def (persisted); the LIVE
        // defense is zone-local and transient by design — a resume or a
        // walk-away folds the fight back to 'besieged' (the transience law).
        id: 'harborhold',
        reset: () => { nativeHost.holdDefense = null; nativeHost.holdDwellRequested = false; },
      },
      {
        // Borough: the settlement re-rolls with the zone (encounter fabric),
        // but the refugees' walk and the arming-panel ask are zone-local.
        id: 'borough',
        reset: () => {
          nativeHost.boroughRefugees.length = 0;
          nativeHost.boroughArmRequested = false;
          nativeHost.boroughArmFolkId = -1;
        },
      },
      {
        // The band pours via updateBrigandRaid — reset only.
        id: 'brigands',
        reset: () => { nativeHost.materializedBrigands.clear(); nativeHost.brigandLingerLeft = 0; nativeHost.brigandsDrifting = false; },
      },
      {
        // CONTAGION: a corrupted zone fields its plague (+ Patient Zero at the
        // source) — and one that SPREAD onto the standing zone fields it live.
        id: 'contagion',
        reset: () => { nativeHost.materializedContagion.clear(); },
        enter: (def) => nativeHost.materializeContagion(def),
      },
      {
        // DEEPWINTER: a frost-converted zone wakes CONVERTED — snow held at
        // the frozen floor, whiteout banks, court packs (+ the Winter King
        // at the glacial heart). Dressing re-applies every entry; the muster
        // is once per visit.
        id: 'deepwinter',
        reset: () => { nativeHost.materializedDeepwinter.clear(); },
        enter: (def) => nativeHost.materializeDeepwinter(def),
      },
      {
        id: 'verminfall',
        reset: () => { nativeHost.materializedInfestation.clear(); },
        enter: (def) => nativeHost.materializeInfestation(def),
      },
      {
        // THE SWARMING: a brood-claimed zone fields its standing hive
        // throats (the visible clock); a wake zone fields its royal-jelly
        // caches. The airborne stream itself pours via updateSwarmStream.
        id: 'swarming',
        reset: () => {
          nativeHost.materializedBroods.clear();
          nativeHost.materializedSwarmWake.clear();
          nativeHost.swarmStreamTimer = 0;
        },
        enter: (def) => { nativeHost.materializeBrood(def); nativeHost.materializeSwarmWake(def); },
      },
      {
        id: 'longcandle',
        reset: () => { nativeHost.materializedCandle.clear(); },
        enter: (def) => nativeHost.materializeCandle(def),
      },
      {
        id: 'starfall',
        reset: () => { nativeHost.materializedStarfall.clear(); },
        enter: (def) => nativeHost.materializeStarfall(def),
      },
      {
        // MYCELIA: a spore-laced zone fields its fungal horde (+ the
        // Heartbloom at the core); a bloom that spread here fields it live.
        id: 'mycelia',
        reset: () => { nativeHost.materializedMycelia.clear(); },
        enter: (def) => nativeHost.materializeMycelia(def),
      },
      {
        // HOLDFAST: raise the toll-gate + its wardens around a sealed bonus
        // exit (rolled at the zone's first load; raised live if not yet built).
        id: 'holdfast',
        reset: () => { nativeHost.materializedHoldfasts.clear(); nativeHost.holdfastSite = null; nativeHost.holdfastDwellKey = ''; },
        enter: (def) => nativeHost.placeHoldfast(def),
      },
      {
        // THE UNSEALING: a Sepulcher Sands pocket stages its rolled role —
        // the Regent's sealed door behind its talisman braziers, or a
        // canopic seal-bearer's court — and the tomb site LIVE-SYNCS its
        // flares, door state, and the Regent's wake every frame. POCKET-
        // NATIVE (inCaves): the whole mechanic lives in side-zones, the
        // one sanctioned exception to the caves-are-invisible doctrine.
        id: 'unsealing', inCaves: true,
        reset: () => { nativeHost.materializedUnsealing.clear(); nativeHost.unsealingSite = null; },
        enter: (def, live) => nativeHost.materializeUnsealing(def, live),
      },
      {
        // THE HUNT: place a footprint (while the beast is untracked) or spawn
        // the beast itself where it stands (health preserved) — including a
        // locate/relocate that resolves onto the standing zone.
        id: 'hunt',
        reset: () => {
          nativeHost.huntFootprint = null; nativeHost.huntFootprintDwell = 0;
          nativeHost.huntBeast = null; nativeHost.materializedHunts.clear();
        },
        enter: (def) => nativeHost.placeHuntContent(def),
      },
      {
        // FRACTURES: the volatile fracture object if one sits (or diverted)
        // here, and — on entry only — a PENDING capstone rift's portal.
        id: 'fractures',
        reset: () => { nativeHost.fractureRun = null; nativeHost.materializedFractures.clear(); nativeHost.fractureRifts.length = 0; },
        enter: (def, live) => {
          if (!live || !nativeHost.fractureRun) nativeHost.placeFractureContent(def);
          if (!live) nativeHost.placeFractureRiftContent(def);
        },
      },
      {
        // CONCLAVE: raise the Occult ritual site (pentagram + cultists) —
        // including one that opened on the standing zone.
        id: 'conclave',
        reset: () => { nativeHost.ritualSite = null; nativeHost.materializedRituals.clear(); },
        enter: (def) => { if (!nativeHost.ritualSite) nativeHost.placeRitualSite(def); },
      },
      {
        // AMALGAMATION: the Bonewright (+ graves / risen boss) and any
        // rare-undead miniboss — including a build that migrated here.
        id: 'amalgamation',
        reset: () => {
          nativeHost.amalgamSite = null; nativeHost.materializedAmalgam.clear();
          nativeHost.materializedAmalgamMobs.clear(); nativeHost.amalgamNecroDwell = 0; nativeHost.amalgamPickDwell = [];
        },
        enter: (def) => {
          if (!nativeHost.amalgamSite) nativeHost.placeAmalgamation(def);
          nativeHost.placeAmalgamMiniboss(def);
        },
      },
      {
        // DESCENT: the Delver site + dwell/stream timers reset per zone
        // (re-rolled on cave re-entry); the Delver itself is CAVE content
        // (the loadZone else-branch). descentRun is NOT reset here —
        // descend()/resurfaceFromDescent() own it.
        id: 'descent',
        reset: () => { nativeHost.descentSite = null; nativeHost.descentShaftDwell = 0; nativeHost.descentSpawnTimer = 0; },
      },
      {
        // INCURSION: the Eldritch Observer, if this is an epicenter zone —
        // including a reach that bound the standing zone.
        id: 'incursion',
        reset: () => { nativeHost.materializedObservers.clear(); nativeHost.eventAnchors.length = 0; },
        enter: (def) => nativeHost.materializeObserver(def),
      },
      {
        // VENDETTA: a standing writ may spring its hunter squad on the entered
        // (or stood-in) zone — the ambush the reprisal promised. The roll is
        // one-shot per zone visit (materializedWrits).
        id: 'vendetta',
        reset: () => { nativeHost.materializedWrits.clear(); },
        enter: (def) => nativeHost.springVendettaAmbush(def),
      },
      {
        // The Caravanner waiting at a minted caravan destination (the
        // round-trip home) — on-entry only.
        id: 'caravan_return', noLive: true,
        enter: (def) => nativeHost.placeCaravanReturn(def),
      },
    ];
  }
export function materializeNativeLiveZoneEvents(nativeHost:NativeSceneRuntimeRegistryHost):void {
    if (nativeHost.inCave) {
      // Pocket ground: ONLY pocket-native rows (inCaves) re-fire — the
      // Unsealing's tomb site live-syncs its flares/door/wake down here.
      for (const r of nativeHost.zoneRuntimes) {
        if (r.inCaves && !r.noLive) r.enter?.(nativeHost.zone, true);
      }
      return;
    }
    // Every zone runtime's enter() re-fires with live=true (unless it opted
    // out via noLive) — each is idempotent by its own guards, so an overlay
    // that binds/spreads onto the standing zone materializes the moment it
    // lands, exactly once. A special arena hosts no FOREIGN overlay events
    // (only ownedGround rows — the arena's own minter — may fire there).
    for (const r of nativeHost.zoneRuntimes) {
      if (r.noLive) continue;
      if (nativeHost.zone.special && !r.ownedGround) continue;
      r.enter?.(nativeHost.zone, true);
    }
  }