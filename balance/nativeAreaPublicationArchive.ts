/** Exact publication successor over the captured phase44 coordinator; originals are unchanged. */
export const nativeAreaPublicationArchive = {
  "coordinator": {
    "file": "src/worldmass/nativeAreaSceneTransitionCoordinator.ts",
    "beforeHash": "c69b3ca1df38019b7514479a32d28a6f077c19eff00c1238ff6b172cbf4d405b",
    "afterHash": "d3bd985bdc56b61d2eca6eeff611d7c93f60df1f12020b88e090a9d58c846e74",
    "hunks": [
      {
        "before": "/** Retained-area selection and synchronous physical handoff. Unlike legacy\n * World.loadZone, revisits retain the area's actual stores and controllers.\n * Destination creation and complete frame/UI publication are separate duties. */\n",
        "after": "import {extendNativeAreaPublication} from './nativeAreaScenePublication';\n/** Retained-area selection and synchronous physical handoff. Unlike legacy\n * World.loadZone, revisits retain the area's actual stores and controllers.\n * Destination creation and complete frame/UI publication are separate duties. */\n"
      },
      {
        "before": "  for(const key of ['projectiles','zones'])field(key,()=>area().progression.input.state);\n  field('tethers',()=>this.#published!.combat.tethers.input.state);\n  bindings.set('companionBonds',{get:()=>area().progression.companionBonds});\n  field('adoptedZonePending',()=>this.#published!.departure);field('forgetMemoryOnLeave',()=>this.#published!.departure);\n  field('caveExitGrace',()=>this.#published!.roads);field('entryFrom',()=>this.#published!.roads);field('caveReturn',()=>this.#published!.roads);field('caveStack',()=>this.#published!.roads);\n  bindings.set('inCave',{get:()=>assembly().transition.inCave});field('scene',()=>area().quests.input.state);\n",
        "after": "  for(const key of ['projectiles','zones'])field(key,()=>area().progression.input.state);\n  field('tethers',()=>this.#published!.combat.tethers.input.state);\n  bindings.set('companionBonds',{get:()=>area().progression.companionBonds});\n  extendNativeAreaPublication(bindings,area);\n  field('adoptedZonePending',()=>this.#published!.departure);field('forgetMemoryOnLeave',()=>this.#published!.departure);\n  field('caveExitGrace',()=>this.#published!.roads);field('entryFrom',()=>this.#published!.roads);field('caveReturn',()=>this.#published!.roads);field('caveStack',()=>this.#published!.roads);\n  bindings.set('inCave',{get:()=>assembly().transition.inCave});field('scene',()=>area().quests.input.state);\n"
      }
    ]
  },
  "publication": {
    "file": "src/worldmass/nativeAreaScenePublication.ts",
    "sha256": "4e3a89a32e43cd739048fa038cfe3a956c7699093d9436175da70d35f3cee005",
    "mappingLines": [
      " field('airPockets',()=>area().assembly.input.geometry);",
      " field('arenaWash',()=>area().assembly.input.geometry);",
      " field('collapse',()=>area().assembly.input.geometry);",
      " field('conjured',()=>area().assembly.input.geometry);",
      " field('creep',()=>area().assembly.input.geometry);",
      " field('doodads',()=>area().assembly.input.geometry);",
      " field('flux',()=>area().assembly.input.geometry);",
      " field('fog',()=>area().assembly.input.geometry);",
      " field('snowCover',()=>area().assembly.input.geometry);",
      " field('structures',()=>area().assembly.input.geometry);",
      " field('tracks',()=>area().assembly.input.geometry);",
      " field('trapworks',()=>area().assembly.input.geometry);",
      " field('waypointPos',()=>area().assembly.input.geometry);",
      " field('zoneHollows',()=>area().assembly.input.geometry);",
      " field('openedHollows',()=>area().assembly.input.geometry);",
      " field('zoneAnnexSpecs',()=>area().assembly.input.geometry);",
      " field('shake',()=>area().assembly.input.geometry);",
      " field('syncedGrantedPockets',()=>area().assembly.input.geometry);",
      " field('chests',()=>area().assembly.input.physical.input.state);",
      " field('shrines',()=>area().assembly.input.physical.input.state);",
      " field('altars',()=>area().assembly.input.physical.input.state);",
      " field('corpses',()=>area().combat.runtimeState);",
      " field('dissolves',()=>area().combat.runtimeState);",
      " field('pendingPersists',()=>area().combat.runtimeState);",
      " field('ownWalk',()=>area().combat.runtimeState.motion);",
      " field('pings',()=>area().combat.runtimeState.frame);",
      " field('emergences',()=>area().progression.input.state);",
      " field('deathBursts',()=>area().combat.killAftermath.input.state);",
      " field('remnants',()=>area().combat.killAftermath.input.state);",
      " field('fonts',()=>area().assembly.input.state);",
      " field('geysers',()=>area().assembly.input.environment.input.state);",
      " field('playerCorpses',()=>area().assembly.input.history.input.state);",
      " field('magicPackEffects',()=>area().assembly.input.population.input.state);",
      " field('annexOpen',()=>area().assembly.input.openings.input.state);",
      " field('liteKinds',()=>area().assembly.input.ecology.input.state);",
      " field('wave',()=>area().assembly.input.objectives);",
      " field('waveActive',()=>area().assembly.input.objectives);",
      " field('waveTimer',()=>area().assembly.input.objectives);",
      " field('zoneEnteredAt',()=>area().watching.input.state);",
      " fixed('auroras',()=>area().combat.runtimeState.auroras);",
      " fixed('creepers',()=>area().combat.runtimeState.creepers);",
      " fixed('guardians',()=>area().combat.runtimeState.guardians);",
      " fixed('satellites',()=>area().combat.runtimeState.satellites);",
      " fixed('lite',()=>area().progression.lite);",
      " fixed('guardArts',()=>area().progression.guardArts);",
      " fixed('titans',()=>area().assembly.input.registry.input.titans.runtime);",
      " fixed('npcDialogues',()=>area().assembly.input.residents.npcDialogues);",
      " query('skyFront',()=>area().assembly.sky);",
      " query('actorById',()=>area().assembly.input.ecology);",
      " query('hostileTo',()=>area().assembly.input.population);",
      " query('liteKindOf',()=>area().assembly.input.ecology);"
    ]
  }
} as const;
