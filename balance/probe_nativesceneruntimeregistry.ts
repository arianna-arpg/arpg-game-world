/** Ordered native registry: branch matrix plus complete real-area materialization. */
import assert from 'node:assert/strict';
import fs from 'node:fs';
import ts from 'typescript';
import {createHash} from 'node:crypto';
import {spawnSync} from 'node:child_process';
import {fileURLToPath} from 'node:url';
import {fixtures,run,snap} from './nativeRuntimeFixture';
import {makeSimWorld} from '../src/sim/arena';
import {withSeededRandom} from '../src/core/rng';
import {NativeAreaSceneTitans} from '../src/worldmass/nativeAreaSceneTitans';
import {NativeAreaSceneRuntimeRegistry,freshSceneRuntimeRegistryState} from '../src/worldmass/nativeAreaSceneRuntimeRegistry';
import {buildNativeSceneRuntimes,materializeNativeLiveZoneEvents} from '../src/engine/nativeSceneRuntimeRegistry';
const archive=[
  {
    "name": "buildZoneRuntimes",
    "source": "private buildZoneRuntimes(): { id: string; reset?: () => void; enter?: (def: ZoneDef, live: boolean) => void; noLive?: boolean; ownedGround?: boolean; inCaves?: boolean }[] {\n    return [\n      {\n        // ASCENT: an eligible open-sky zone may vent a sky geyser (rolled\n        // per zone, gated + ignition-scaled through the overlay). On-entry\n        // only — a geyser is discovered, never erupts under your feet.\n        id: 'ascent', noLive: true,\n        enter: (def) => this.placeAscentGeyser(def),\n      },\n      {\n        // Fresh zone visit → no host materialized yet. If a host has ALREADY\n        // reached this zone (you walked into an invasion in progress), its\n        // warband stands at the entry it marched in by. On-entry only —\n        // live arrivals are driven by the update loop's arrivals drain.\n        id: 'warbands', noLive: true,\n        reset: () => { this.materializedHosts.clear(); this.warbandMarches.length = 0; },\n        enter: (def) => {\n          const host = this.sim.invasion.hosts.find(h => h.arrived && h.targetZoneId === def.id);\n          if (host) this.spawnWarband(host);\n        },\n      },\n      {\n        // You walked into (or a live eruption seized) a Demon Invasion's\n        // epicenter — the Balor holds court. Resolved against the instance\n        // governing THIS zone's dimension; a live eruption gets the\n        // meteor-storm warning entrance (the `live` flag).\n        id: 'demon_invasion',\n        reset: () => { this.materializedEpicenters.clear(); this.demonPortals.length = 0; },\n        enter: (def, live) => {\n          const inv = this.sim.demonFieldFor(def.dimension)?.invasionOn(def.id);\n          if (inv?.isEpicenter && (!live || !this.materializedEpicenters.has(inv.id))) this.spawnEpicenter(inv, live);\n        },\n      },\n      {\n        // A Crusade's field holds this ground — raise its works (camp /\n        // fortress / city) and post its garrison, scaled to its local control.\n        id: 'crusade',\n        reset: () => { this.materializedCrusades.clear(); this.crusadePortals.length = 0; },\n        enter: (def, live) => {\n          const cru = this.sim.crusadeField?.crusadeOn(def.id);\n          if (cru && (!live || !this.materializedCrusades.has(def.id))) this.materializeCrusade(cru);\n        },\n      },\n      {\n        // THE WAR BELOW: a HOT front fields the attacker's MARSHAL (the armies\n        // themselves arrive through the owner/rival spawn injection); deep in\n        // a lord's SANCTUM the lord itself MANIFESTS — in whatever zone the\n        // player actually walked into (thrones are anchors, never zones).\n        // Live re-invokes cover a front drifting onto the standing ground.\n        id: 'underworld_war',\n        reset: () => this.materializedHellWar.clear(),\n        enter: (def) => {\n          const hw = this.sim.hellWarField;\n          if (!hw || def.dimension !== hw.dimension) return;\n          if (hw.manifestHere(def.id)) this.spawnHellCourt(def);\n          else if (hw.frontStage(def.id)) this.spawnHellMarshal(def);\n        },\n      },\n      {\n        // THE DEADWAKE pours in via the per-frame updateDeadwakeStream (a\n        // relentless stream while a tide covers this zone) — reset only.\n        id: 'deadwake',\n        reset: () => { this.materializedDeadwakes.clear(); this.deadwakeStreamTimer = 0; this.necropolisPortals.length = 0; },\n      },\n      {\n        // THE WRAITHSAIL alongside walks her court ashore via the per-frame\n        // updateWraithsailDock (once per layover, never a stream) — reset only.\n        id: 'wraithsail',\n        reset: () => { this.materializedDocks.clear(); },\n      },\n      {\n        // The herd pours via updateMigrationStream — reset only.\n        id: 'migration',\n        reset: () => { this.materializedMigrations.clear(); this.migrationStreamTimer = 0; },\n      },\n      {\n        // Titans project their durable journey into local terrain. The live\n        // update owns the cadence; entry only primes the warning pass.\n        id: 'titans', noLive: true, reset: () => this.titans.reset(), enter: () => this.titans.update(0.25),\n      },\n      {\n        // WORLD BOSSES: a settled serpent head / manifest apparition /\n        // enthroned lair fields its fight — including one that manifests on\n        // the standing zone live. Coil walls + the passing body are driven\n        // per-frame by updateWorldBosses (they grow/move with time).\n        // ownedGround: the minted arenas are SPECIAL zones — this row is\n        // their owner and must fire there (fightAt only ever matches zones\n        // this overlay bound, so foreign special stages stay clean).\n        id: 'worldboss', ownedGround: true,\n        reset: () => {\n          this.materializedWorldBoss.clear();\n          this.wbWalls.clear();\n          this.wbPassing = null; this.wbPassingKey = ''; this.wbPassingGoal = null;\n          this.wbBoss = null; this.wbBossKey = '';\n        },\n        enter: (def) => this.materializeWorldBossFight(def),\n      },\n      {\n        // Haunts re-stand on re-entry (anchor / walking Wailing One at their\n        // overlay-remembered wounds) via the per-frame updateHauntStream —\n        // mid-play spawns are never zone-memory captured, so without this\n        // reset a revisited haunt stood empty and unbreakable.\n        id: 'haunting',\n        reset: () => { this.materializedHaunts.clear(); this.hauntStreamTimer = 0; },\n      },\n      {\n        // The Straying's scene is zone-local body refs — a zone change drops\n        // them (the overlay keeps the head ledger; re-entry re-stages from it).\n        id: 'straying',\n        reset: () => { this.materializedStrayings.clear(); this.strayScene = null; },\n      },\n      {\n        // The Drove's scene is zone-local body refs — a zone change drops\n        // them (the overlay keeps the head ledger AND the pen's seat;\n        // re-entry re-stages the wreck exactly where it fell).\n        id: 'drove',\n        reset: () => { this.materializedDroves.clear(); this.droveScene = null; this.droveDressChecked = null; },\n      },\n      {\n        // The Wisplight's scene is zone-local body refs — a zone change drops\n        // them (the overlay keeps the slot ledger; re-entry re-stages from it,\n        // adopting a remembered ridden host by its ride mark).\n        id: 'wisplight',\n        reset: () => { this.materializedWisplights.clear(); this.wispScene = null; },\n      },\n      {\n        // Long Night grounds re-stand on re-entry (the parked coach — and a\n        // seated Countess — at their overlay-remembered wounds) via the\n        // per-frame updateLongNight; the haunting row's exact contract.\n        id: 'long_night',\n        reset: () => { this.materializedLongNights.clear(); this.longNightStreamTimer = 0; },\n      },\n      {\n        // Extraction: the seam itself re-rolls with the zone (encounter\n        // fabric), but standing DISPERSAL ORDERS are zone-local state.\n        id: 'extraction',\n        reset: () => { this.extractionDepartures.length = 0; },\n      },\n      {\n        // Harborhold: the hold STATE rides the def (persisted); the LIVE\n        // defense is zone-local and transient by design — a resume or a\n        // walk-away folds the fight back to 'besieged' (the transience law).\n        id: 'harborhold',\n        reset: () => { this.holdDefense = null; this.holdDwellRequested = false; },\n      },\n      {\n        // Borough: the settlement re-rolls with the zone (encounter fabric),\n        // but the refugees' walk and the arming-panel ask are zone-local.\n        id: 'borough',\n        reset: () => {\n          this.boroughRefugees.length = 0;\n          this.boroughArmRequested = false;\n          this.boroughArmFolkId = -1;\n        },\n      },\n      {\n        // The band pours via updateBrigandRaid — reset only.\n        id: 'brigands',\n        reset: () => { this.materializedBrigands.clear(); this.brigandLingerLeft = 0; this.brigandsDrifting = false; },\n      },\n      {\n        // CONTAGION: a corrupted zone fields its plague (+ Patient Zero at the\n        // source) — and one that SPREAD onto the standing zone fields it live.\n        id: 'contagion',\n        reset: () => { this.materializedContagion.clear(); },\n        enter: (def) => this.materializeContagion(def),\n      },\n      {\n        // DEEPWINTER: a frost-converted zone wakes CONVERTED — snow held at\n        // the frozen floor, whiteout banks, court packs (+ the Winter King\n        // at the glacial heart). Dressing re-applies every entry; the muster\n        // is once per visit.\n        id: 'deepwinter',\n        reset: () => { this.materializedDeepwinter.clear(); },\n        enter: (def) => this.materializeDeepwinter(def),\n      },\n      {\n        id: 'verminfall',\n        reset: () => { this.materializedInfestation.clear(); },\n        enter: (def) => this.materializeInfestation(def),\n      },\n      {\n        // THE SWARMING: a brood-claimed zone fields its standing hive\n        // throats (the visible clock); a wake zone fields its royal-jelly\n        // caches. The airborne stream itself pours via updateSwarmStream.\n        id: 'swarming',\n        reset: () => {\n          this.materializedBroods.clear();\n          this.materializedSwarmWake.clear();\n          this.swarmStreamTimer = 0;\n        },\n        enter: (def) => { this.materializeBrood(def); this.materializeSwarmWake(def); },\n      },\n      {\n        id: 'longcandle',\n        reset: () => { this.materializedCandle.clear(); },\n        enter: (def) => this.materializeCandle(def),\n      },\n      {\n        id: 'starfall',\n        reset: () => { this.materializedStarfall.clear(); },\n        enter: (def) => this.materializeStarfall(def),\n      },\n      {\n        // MYCELIA: a spore-laced zone fields its fungal horde (+ the\n        // Heartbloom at the core); a bloom that spread here fields it live.\n        id: 'mycelia',\n        reset: () => { this.materializedMycelia.clear(); },\n        enter: (def) => this.materializeMycelia(def),\n      },\n      {\n        // HOLDFAST: raise the toll-gate + its wardens around a sealed bonus\n        // exit (rolled at the zone's first load; raised live if not yet built).\n        id: 'holdfast',\n        reset: () => { this.materializedHoldfasts.clear(); this.holdfastSite = null; this.holdfastDwellKey = ''; },\n        enter: (def) => this.placeHoldfast(def),\n      },\n      {\n        // THE UNSEALING: a Sepulcher Sands pocket stages its rolled role —\n        // the Regent's sealed door behind its talisman braziers, or a\n        // canopic seal-bearer's court — and the tomb site LIVE-SYNCS its\n        // flares, door state, and the Regent's wake every frame. POCKET-\n        // NATIVE (inCaves): the whole mechanic lives in side-zones, the\n        // one sanctioned exception to the caves-are-invisible doctrine.\n        id: 'unsealing', inCaves: true,\n        reset: () => { this.materializedUnsealing.clear(); this.unsealingSite = null; },\n        enter: (def, live) => this.materializeUnsealing(def, live),\n      },\n      {\n        // THE HUNT: place a footprint (while the beast is untracked) or spawn\n        // the beast itself where it stands (health preserved) — including a\n        // locate/relocate that resolves onto the standing zone.\n        id: 'hunt',\n        reset: () => {\n          this.huntFootprint = null; this.huntFootprintDwell = 0;\n          this.huntBeast = null; this.materializedHunts.clear();\n        },\n        enter: (def) => this.placeHuntContent(def),\n      },\n      {\n        // FRACTURES: the volatile fracture object if one sits (or diverted)\n        // here, and — on entry only — a PENDING capstone rift's portal.\n        id: 'fractures',\n        reset: () => { this.fractureRun = null; this.materializedFractures.clear(); this.fractureRifts.length = 0; },\n        enter: (def, live) => {\n          if (!live || !this.fractureRun) this.placeFractureContent(def);\n          if (!live) this.placeFractureRiftContent(def);\n        },\n      },\n      {\n        // CONCLAVE: raise the Occult ritual site (pentagram + cultists) —\n        // including one that opened on the standing zone.\n        id: 'conclave',\n        reset: () => { this.ritualSite = null; this.materializedRituals.clear(); },\n        enter: (def) => { if (!this.ritualSite) this.placeRitualSite(def); },\n      },\n      {\n        // AMALGAMATION: the Bonewright (+ graves / risen boss) and any\n        // rare-undead miniboss — including a build that migrated here.\n        id: 'amalgamation',\n        reset: () => {\n          this.amalgamSite = null; this.materializedAmalgam.clear();\n          this.materializedAmalgamMobs.clear(); this.amalgamNecroDwell = 0; this.amalgamPickDwell = [];\n        },\n        enter: (def) => {\n          if (!this.amalgamSite) this.placeAmalgamation(def);\n          this.placeAmalgamMiniboss(def);\n        },\n      },\n      {\n        // DESCENT: the Delver site + dwell/stream timers reset per zone\n        // (re-rolled on cave re-entry); the Delver itself is CAVE content\n        // (the loadZone else-branch). descentRun is NOT reset here —\n        // descend()/resurfaceFromDescent() own it.\n        id: 'descent',\n        reset: () => { this.descentSite = null; this.descentShaftDwell = 0; this.descentSpawnTimer = 0; },\n      },\n      {\n        // INCURSION: the Eldritch Observer, if this is an epicenter zone —\n        // including a reach that bound the standing zone.\n        id: 'incursion',\n        reset: () => { this.materializedObservers.clear(); this.eventAnchors.length = 0; },\n        enter: (def) => this.materializeObserver(def),\n      },\n      {\n        // VENDETTA: a standing writ may spring its hunter squad on the entered\n        // (or stood-in) zone — the ambush the reprisal promised. The roll is\n        // one-shot per zone visit (materializedWrits).\n        id: 'vendetta',\n        reset: () => { this.materializedWrits.clear(); },\n        enter: (def) => this.springVendettaAmbush(def),\n      },\n      {\n        // The Caravanner waiting at a minted caravan destination (the\n        // round-trip home) — on-entry only.\n        id: 'caravan_return', noLive: true,\n        enter: (def) => this.placeCaravanReturn(def),\n      },\n    ];\n  }",
    "roots": [
      "placeAscentGeyser",
      "materializedHosts",
      "warbandMarches",
      "sim",
      "spawnWarband",
      "materializedEpicenters",
      "demonPortals",
      "spawnEpicenter",
      "materializedCrusades",
      "crusadePortals",
      "materializeCrusade",
      "materializedHellWar",
      "spawnHellCourt",
      "spawnHellMarshal",
      "materializedDeadwakes",
      "deadwakeStreamTimer",
      "necropolisPortals",
      "materializedDocks",
      "materializedMigrations",
      "migrationStreamTimer",
      "titans",
      "materializedWorldBoss",
      "wbWalls",
      "wbPassing",
      "wbPassingKey",
      "wbPassingGoal",
      "wbBoss",
      "wbBossKey",
      "materializeWorldBossFight",
      "materializedHaunts",
      "hauntStreamTimer",
      "materializedStrayings",
      "strayScene",
      "materializedDroves",
      "droveScene",
      "droveDressChecked",
      "materializedWisplights",
      "wispScene",
      "materializedLongNights",
      "longNightStreamTimer",
      "extractionDepartures",
      "holdDefense",
      "holdDwellRequested",
      "boroughRefugees",
      "boroughArmRequested",
      "boroughArmFolkId",
      "materializedBrigands",
      "brigandLingerLeft",
      "brigandsDrifting",
      "materializedContagion",
      "materializeContagion",
      "materializedDeepwinter",
      "materializeDeepwinter",
      "materializedInfestation",
      "materializeInfestation",
      "materializedBroods",
      "materializedSwarmWake",
      "swarmStreamTimer",
      "materializeBrood",
      "materializeSwarmWake",
      "materializedCandle",
      "materializeCandle",
      "materializedStarfall",
      "materializeStarfall",
      "materializedMycelia",
      "materializeMycelia",
      "materializedHoldfasts",
      "holdfastSite",
      "holdfastDwellKey",
      "placeHoldfast",
      "materializedUnsealing",
      "unsealingSite",
      "materializeUnsealing",
      "huntFootprint",
      "huntFootprintDwell",
      "huntBeast",
      "materializedHunts",
      "placeHuntContent",
      "fractureRun",
      "materializedFractures",
      "fractureRifts",
      "placeFractureContent",
      "placeFractureRiftContent",
      "ritualSite",
      "materializedRituals",
      "placeRitualSite",
      "amalgamSite",
      "materializedAmalgam",
      "materializedAmalgamMobs",
      "amalgamNecroDwell",
      "amalgamPickDwell",
      "placeAmalgamation",
      "placeAmalgamMiniboss",
      "descentSite",
      "descentShaftDwell",
      "descentSpawnTimer",
      "materializedObservers",
      "eventAnchors",
      "materializeObserver",
      "materializedWrits",
      "springVendettaAmbush",
      "placeCaravanReturn"
    ],
    "writes": [
      "deadwakeStreamTimer",
      "migrationStreamTimer",
      "wbPassing",
      "wbPassingKey",
      "wbPassingGoal",
      "wbBoss",
      "wbBossKey",
      "hauntStreamTimer",
      "strayScene",
      "droveScene",
      "droveDressChecked",
      "wispScene",
      "longNightStreamTimer",
      "holdDefense",
      "holdDwellRequested",
      "boroughArmRequested",
      "boroughArmFolkId",
      "brigandLingerLeft",
      "brigandsDrifting",
      "swarmStreamTimer",
      "holdfastSite",
      "holdfastDwellKey",
      "unsealingSite",
      "huntFootprint",
      "huntFootprintDwell",
      "huntBeast",
      "fractureRun",
      "ritualSite",
      "amalgamSite",
      "amalgamNecroDwell",
      "amalgamPickDwell",
      "descentSite",
      "descentShaftDwell",
      "descentSpawnTimer"
    ]
  },
  {
    "name": "materializeLiveZoneEvents",
    "source": "private materializeLiveZoneEvents(): void {\n    if (this.inCave) {\n      // Pocket ground: ONLY pocket-native rows (inCaves) re-fire — the\n      // Unsealing's tomb site live-syncs its flares/door/wake down here.\n      for (const r of this.zoneRuntimes) {\n        if (r.inCaves && !r.noLive) r.enter?.(this.zone, true);\n      }\n      return;\n    }\n    // Every zone runtime's enter() re-fires with live=true (unless it opted\n    // out via noLive) — each is idempotent by its own guards, so an overlay\n    // that binds/spreads onto the standing zone materializes the moment it\n    // lands, exactly once. A special arena hosts no FOREIGN overlay events\n    // (only ownedGround rows — the arena's own minter — may fire there).\n    for (const r of this.zoneRuntimes) {\n      if (r.noLive) continue;\n      if (this.zone.special && !r.ownedGround) continue;\n      r.enter?.(this.zone, true);\n    }\n  }",
    "roots": [
      "inCave",
      "zoneRuntimes",
      "zone"
    ],
    "writes": []
  }
];
const original=Function(ts.transpileModule('return {'+archive.map((r:any)=>r.source.replace(/^private\s+/, '')).join(',\n')+'};',{compilerOptions:{target:99,module:99}}).outputText)();
const stateKeys=Object.keys(freshSceneRuntimeRegistryState());
function driver(lane:string,course:any){return (c:any)=>{
 const {w,local,scene,geometry,population,campaign,owner,genState}=c;
 const carried=freshSceneRuntimeRegistryState(),descent={inCave:!!course.cave,descentStock:[],descentSpawnTimer:0};
 genState.inCave=!!course.cave;w.caveReturn=course.cave?{zoneId:'lastlight',pos:{...scene.player.pos},entryFrom:null}:null;assert.equal(w.inCave,!!course.cave);if(!local){Object.assign(w,carried);w.descentSpawnTimer=0;}
 if(course.method==='materializeUnsealing'){Object.assign(scene.zone,c.args[0]);}
 if(course.special)scene.zone.special='registry-fixture';
 const titans=local?new NativeAreaSceneTitans({scene,geometry,population,campaign:{...campaign,get time(){return c.clock.time;}}}):null;
 if(lane==='archive')Object.assign(w,original);
 const registry=local?new NativeAreaSceneRuntimeRegistry({scene,geometry,birth:owner,titans:titans!,descentState:descent,state:carried}):null;
 if(!local)w.zoneRuntimes=w.buildZoneRuntimes();
 const host=registry?.host??w,rows=registry?.rows??w.zoneRuntimes;
 assert.equal(rows.length,36);assert.equal(new Set(rows.map((r:any)=>r.id)).size,36);
 if(registry){
  assert(Object.isFrozen(registry.host)&&Object.isFrozen(registry.input));assert.deepEqual(Object.keys(registry),[]);
  let reads=0;for(const key of ['scene','geometry','birth','titans','descentState','state']){const bad:any={...registry.input};Object.defineProperty(bad,key,{get(){reads++;throw Error('invalid getter');}});assert.throws(()=>new NativeAreaSceneRuntimeRegistry(bad),/own object binding/);}assert.equal(reads,0);
  assert.throws(()=>new NativeAreaSceneRuntimeRegistry({...registry.input,scene:{...scene}}),/identical/);
  for(const key of stateKeys){const bad:any={...carried};delete bad[key];Object.setPrototypeOf(bad,carried);assert.throws(()=>new NativeAreaSceneRuntimeRegistry({...registry.input,state:bad}),/carried state/);}
  for(const key of ['inCave','descentStock','descentSpawnTimer']){const bad:any={...descent};delete bad[key];assert.throws(()=>new NativeAreaSceneRuntimeRegistry({...registry.input,descentState:bad}),/carried descent state/);}
  assert.throws(()=>new NativeAreaSceneRuntimeRegistry({...registry.input,titans:new NativeAreaSceneTitans({...titans!.input,campaign:{...titans!.input.campaign,sim:{} as any}})}),/identical campaign/);
  assert.equal(host.sim,campaign.sim);assert.equal(host.titans,titans!.runtime);assert.equal(host.zoneRuntimes,rows);
  for(const key of Object.keys(host)){if(typeof (host as any)[key]!=='function')continue;const provider:any=owner,prior=Object.getOwnPropertyDescriptor(provider,key),calls:any[]=[];try{Object.defineProperty(provider,key,{configurable:true,value:function(...args:any[]){calls.push([this===provider,args]);return 31;}});const selected=(host as any)[key];Object.defineProperty(provider,key,{configurable:true,value:()=>{throw Error('late selection');}});assert.equal(selected('receipt',undefined),31);assert.deepEqual(calls,[[true,['receipt',undefined]]]);}finally{if(prior)Object.defineProperty(provider,key,prior);else delete provider[key];}}
 }
 const record=()=>snap({state:Object.fromEntries(stateKeys.map(k=>[k,host[k]])),descentSpawnTimer:host.descentSpawnTimer,geometry:Object.fromEntries(['demonPortals','crusadePortals','necropolisPortals','fractureRifts','descentSite','eventAnchors'].map(k=>[k,host[k]])),rows:rows.map((r:any)=>({id:r.id,noLive:r.noLive,inCaves:r.inCaves,ownedGround:r.ownedGround})),titans:Object.fromEntries(Object.entries(host.titans).filter(([k])=>k!=='world'))});
 let entered=false;
 return {record,invoke(){
  if(!entered){entered=true;for(const r of rows)r.reset?.();for(const r of rows)if(!course.cave?(!scene.zone.special||r.ownedGround):(!scene.zone.special&&r.inCaves))r.enter?.(scene.zone,false);}
  else {
   if(registry){const before=JSON.stringify(record());const another=new NativeAreaSceneRuntimeRegistry(registry.input);assert.equal(JSON.stringify(record()),before,'binding a carried area never resets controllers');for(const key of stateKeys)assert.equal((another.host as any)[key],host[key]);assert.equal(another.host.titans,host.titans);}
   if(registry)registry.materializeLiveZoneEvents();else w.materializeLiveZoneEvents();
  }
 }};
};}
const lane=process.argv.find(a=>a.startsWith('--registry-lane='))?.slice('--registry-lane='.length);
if(lane){
 assert(['archive','current','local'].includes(lane));const digest=createHash('sha256');let count=0,bytes=0,bodies=0,errors=0;digest.update('[');bytes++;
 const courses=[
  {method:'materializeContagion'}, {method:'materializeDeepwinter'}, {method:'materializeBrood'}, {method:'materializeMycelia'},
  {method:'materializeWorldBossFight',special:true}, {method:'materializeUnsealing',mechanism:'tomb',cave:true},
  {method:'materializeUnsealing',mechanism:'canopic',cave:true}, {method:'placeFractureContent'},
  {method:'materializeWorldBossFight',cave:true,special:true,empty:true},
 ];
 for(const f of fixtures)for(const base of courses)for(const kind of base.empty?['repeat']:base.method==='placeFractureContent'?['repeat','terrain-failure']:['repeat','factory-failure']){
  const course={mechanism:'native',...base,kind},out=run(f,lane,course,driver(lane,course));
  if(kind==='repeat')assert.equal(out.error,undefined,JSON.stringify(course));else assert.equal(out.error,kind==='terrain-failure'?'after actual native terrain clamp':'after actual native factory',JSON.stringify(course)+' reached actual partial effect');
  if(!base.empty&&base.method!=='placeFractureContent')assert(out.bodies>0,JSON.stringify(course)+' positive native materialization');
  const text=(count?',':'')+JSON.stringify(out);digest.update(text);bytes+=Buffer.byteLength(text);count++;bodies+=out.bodies;if(out.error)errors++;
 }
 digest.update(']');bytes++;console.log('NATIVE_RUNTIME_REGISTRY_COLD='+JSON.stringify({count,bytes,bodies,errors,sha256:digest.digest('hex')}));
}else{
 const norm=(s:string)=>ts.transpileModule(s,{compilerOptions:{target:99,module:99,removeComments:true}}).outputText;
 const core=ts.createSourceFile('core.ts',fs.readFileSync(new URL('../src/engine/nativeSceneRuntimeRegistry.ts',import.meta.url),'utf8'),99,true);
 for(const r of archive){const sf=ts.createSourceFile('old.ts','class Old{'+r.source+'}',99,true),m=(sf.statements[0] as ts.ClassDeclaration).members[0] as ts.MethodDeclaration,name=r.name==='buildZoneRuntimes'?'buildNativeSceneRuntimes':'materializeNativeLiveZoneEvents',fn=core.statements.find(n=>ts.isFunctionDeclaration(n)&&n.name?.text===name) as ts.FunctionDeclaration;assert.equal(norm(fn.body!.getText(core).replaceAll('nativeHost.','this.')),norm(m.body!.getText(sf)),r.name+' complete original body');}
 withSeededRandom(1097,()=>{const w:any=makeSimWorld('warrior',1097),keys=Object.keys(w),host=w.nativeRuntimeRegistryHost();assert.equal(w.nativeRuntimeRegistryHost(),host);assert(Object.isFrozen(host));assert.deepEqual(Object.keys(w),keys);assert.equal(Object.getOwnPropertyDescriptor(w,'nativeRuntimeRegistryView')?.enumerable,false);
  for(const key of Object.keys(host)){const prior=Object.getOwnPropertyDescriptor(w,key),old=w[key];try{if(typeof old==='function'){const calls:any[]=[];Object.defineProperty(w,key,{configurable:true,value:function(...args:any[]){calls.push([this===w,args]);return 41;}});const selected=host[key];Object.defineProperty(w,key,{configurable:true,value:()=>{throw Error('late World selection');}});assert.equal(selected('receipt',undefined),41);assert.deepEqual(calls,[[true,['receipt',undefined]]]);}else {const value={key};Object.defineProperty(w,key,{configurable:true,writable:true,value});assert.equal(host[key],value);if(Object.getOwnPropertyDescriptor(host,key)?.set){const changed={key,changed:true};host[key]=changed;assert.equal(w[key],changed);}}}finally{if(prior)Object.defineProperty(w,key,prior);else delete w[key];}}
 });
 // Exhaustive central eligibility/order checks use tracing rows, independent of event birth logic.
 for(const cave of [false,true])for(const special of [false,true])for(const fail of [-1,0,1,3]){
  const exercise=(current:boolean)=>{const tape:any[]=[],zone={id:'matrix',special};const rows=[{id:'ordinary'},{id:'owned',ownedGround:true},{id:'cave',inCaves:true},{id:'both',inCaves:true,ownedGround:true},{id:'entry',noLive:true},{id:'cave-entry',inCaves:true,noLive:true},{id:'empty'}].map((r,i)=>({...r,...(r.id==='empty'?{}:{enter:(z:any,live:any)=>{tape.push([r.id,z===zone,live]);if(i===fail)throw Error('selected partial');}})}));const host:any={zone,inCave:cave,zoneRuntimes:rows};let error;try{if(current)materializeNativeLiveZoneEvents(host);else original.materializeLiveZoneEvents.call(host);}catch(e){error=(e as Error).message;}return {tape,error};};assert.deepEqual(exercise(true),exercise(false));
 }
 assert.equal(typeof buildNativeSceneRuntimes,'function');
 const receipts:any[]=[];for(const mode of ['archive','current','local']){const child=spawnSync(process.execPath,['node_modules/tsx/dist/cli.mjs',fileURLToPath(import.meta.url),'--registry-lane='+mode],{encoding:'utf8',maxBuffer:4*1024*1024,timeout:180000});assert.equal(child.status,0,mode+' '+String(child.error??'')+' '+child.stderr.slice(-3500)+' '+child.stdout.slice(-1500));const line=child.stdout.split(/\r?\n/).find(s=>s.startsWith('NATIVE_RUNTIME_REGISTRY_COLD='));assert(line);receipts.push(JSON.parse(line.slice('NATIVE_RUNTIME_REGISTRY_COLD='.length)));}
 assert.deepEqual(receipts[1],receipts[0],'classic complete original registry');assert.deepEqual(receipts[2],receipts[0],'local complete original registry');console.log('PASS native runtime registry',receipts[0]);
}
