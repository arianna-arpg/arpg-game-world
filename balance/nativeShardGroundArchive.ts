export interface NativeShardGroundRow {file:string;predecessor:string;beforeHash:string;afterHash:string;crlfLines:readonly number[];hunks:readonly {before:string;after:string}[]}
export const nativeShardGroundArchive:{parent:string;rows:readonly NativeShardGroundRow[];archives:readonly {file:string;normalSha256:string}[];current:readonly {file:string;normalSha256:string}[]} = {
  "parent": "c76f0bae0931b628db71501b4ad06dc92aea94cb",
  "rows": [
    {
      "file": "balance/nativeDesktopPerfFixture.ts",
      "predecessor": "c76f0bae0931b628db71501b4ad06dc92aea94cb",
      "beforeHash": "e320b863dd64b38c25a95908561365d1b8952ded82caec495256aa265d0b60ac",
      "afterHash": "03148f2354f1732a03e06b2ec8e02f69b8917576ace07d1a8d970fe5d0efe3ff",
      "crlfLines": [],
      "hunks": [
        {
          "before": "import assert from 'node:assert/strict';\nimport fs from 'node:fs';\nimport path from 'node:path';\nimport {fileURLToPath} from 'node:url';\nimport {createHash} from 'node:crypto';\n",
          "after": "import assert from 'node:assert/strict';\nimport * as fs from './nativeShardGroundFS';\nimport path from 'node:path';\nimport {fileURLToPath} from 'node:url';\nimport {createHash} from 'node:crypto';\n"
        }
      ]
    },
    {
      "file": "balance/check_nativedesktopperfsource.ts",
      "predecessor": "c76f0bae0931b628db71501b4ad06dc92aea94cb",
      "beforeHash": "8029ea6078e5df3e1bd2520903ee4c934ee285ab94e9dc7b450c993c8abb13a1",
      "afterHash": "1aedcb3484ac7d90f8fdd0594e30eca77f2f3211a4acd4956ee21a86f69ba53a",
      "crlfLines": [],
      "hunks": [
        {
          "before": "/** Mutation, byte identity and filesystem controls for the desktop performance source boundary. */\nimport assert from 'node:assert/strict';\nimport fs from 'node:fs';\nimport {execFileSync} from 'node:child_process';\nimport {createHash} from 'node:crypto';\nimport {fileURLToPath} from 'node:url';\n",
          "after": "/** Mutation, byte identity and filesystem controls for the desktop performance source boundary. */\nimport assert from 'node:assert/strict';\nimport * as fs from './nativeShardGroundFS';\nimport {execFileSync} from 'node:child_process';\nimport {createHash} from 'node:crypto';\nimport {fileURLToPath} from 'node:url';\n"
        }
      ]
    },
    {
      "file": "server/nativeShardSeats.ts",
      "predecessor": "c76f0bae0931b628db71501b4ad06dc92aea94cb",
      "beforeHash": "df3ecb5cc5957388135319204212577e88172830637c0ee512b0ad79e57c2f4f",
      "afterHash": "59a73b3ee6a8814e089ecbadd4c9f84130a9cec93766b29f3c4743d8411f9f0f",
      "crlfLines": [],
      "hunks": [
        {
          "before": " #seatIn(area:NativeAreaSceneOngoing,seat:Seat):Selection{const selected=this.#lookup(own(seat,'id'));if(!selected||selected.seat!==seat||selected.area!==area)throw Error('Native server operation needs the seat in its actual selected area');return selected;}\n #view(area:NativeAreaSceneOngoing,scope:Scope):VesselArea{const c=area.combat,campaign=c.input.campaign,geometry=area.assembly.input.geometry,roads=this.#coordinator.roadsFor(c),state=NativeAreaCampaignFrameState.forWriter(this.#writer),view={} as VesselArea;\n const fields=(provider:object,keys:readonly string[])=>{for(const key of keys)Object.defineProperty(view,key,{enumerable:true,get:()=>{this.#scope(area,scope);const value=Reflect.get(provider,key);this.#scope(area,scope);return value;}});};\n fields(c.scene,['actors','zone']);fields(campaign,['manifest','massRuntime','zoneMap','time','ledger','annexFound']);fields(area.assembly.transition,['inCave']);fields(area.assembly.lootController.input.physical.input.state,['drops']);fields(state,['pickupFeed']);\n const nested=(provider:object,key:string,method:string)=>Object.defineProperty(view,key,{get:()=>{this.#scope(area,scope);const receiver=Reflect.get(provider,key);this.#scope(area,scope);return Object.freeze(Object.defineProperty({},method,{get:()=>{this.#scope(area,scope);const fn=Reflect.get(receiver,method);this.#scope(area,scope);return(...args:unknown[])=>{this.#scope(area,scope);const result=Reflect.apply(fn,receiver,args);this.#scope(area,scope);return result;};}}));}});\n nested(area.progression,'companionBonds','saved');nested(area.progression,'lite','countOwned');\n Object.defineProperty(view,'addCorpseFlash',{get:()=>{this.#scope(area,scope);const target=geometry.flashes,fn=target.push;this.#scope(area,scope);return(...items:Parameters<World['flashes']['push']>)=>{this.#scope(area,scope);if(geometry.flashes!==target)throw Error('Native corpse flash storage changed');const result=Reflect.apply(fn,target,items);this.#scope(area,scope);return result;};}});\n",
          "after": " #seatIn(area:NativeAreaSceneOngoing,seat:Seat):Selection{const selected=this.#lookup(own(seat,'id'));if(!selected||selected.seat!==seat||selected.area!==area)throw Error('Native server operation needs the seat in its actual selected area');return selected;}\n #view(area:NativeAreaSceneOngoing,scope:Scope):VesselArea{const c=area.combat,campaign=c.input.campaign,geometry=area.assembly.input.geometry,roads=this.#coordinator.roadsFor(c),state=NativeAreaCampaignFrameState.forWriter(this.#writer),view={} as VesselArea;\n const fields=(provider:object,keys:readonly string[])=>{for(const key of keys)Object.defineProperty(view,key,{enumerable:true,get:()=>{this.#scope(area,scope);const value=Reflect.get(provider,key);this.#scope(area,scope);return value;}});};\n fields(c.scene,['actors','zone']);fields(campaign,['manifest','massRuntime','zoneMap','time','ledger','annexFound']);fields(area.assembly.transition,['inCave']);fields(area.assembly.lootController.input.physical.input.state,['drops']);fields(state,['pickupFeed','seatQuests']);/* THE OFFLINE HERO'S GROUND (W12): the vessel desk notes a seat's quest ground off its live journal */\n const nested=(provider:object,key:string,method:string)=>Object.defineProperty(view,key,{get:()=>{this.#scope(area,scope);const receiver=Reflect.get(provider,key);this.#scope(area,scope);return Object.freeze(Object.defineProperty({},method,{get:()=>{this.#scope(area,scope);const fn=Reflect.get(receiver,method);this.#scope(area,scope);return(...args:unknown[])=>{this.#scope(area,scope);const result=Reflect.apply(fn,receiver,args);this.#scope(area,scope);return result;};}}));}});\n nested(area.progression,'companionBonds','saved');nested(area.progression,'lite','countOwned');\n Object.defineProperty(view,'addCorpseFlash',{get:()=>{this.#scope(area,scope);const target=geometry.flashes,fn=target.push;this.#scope(area,scope);return(...items:Parameters<World['flashes']['push']>)=>{this.#scope(area,scope);if(geometry.flashes!==target)throw Error('Native corpse flash storage changed');const result=Reflect.apply(fn,target,items);this.#scope(area,scope);return result;};}});\n"
        }
      ]
    },
    {
      "file": "server/nativeShardRuntime.ts",
      "predecessor": "c76f0bae0931b628db71501b4ad06dc92aea94cb",
      "beforeHash": "c912a647674edcf82b29f0e7901f41b6a250ad4f615d44a969159ed74a6f1e1b",
      "afterHash": "f91fb914c7c88804d6b99412675638b6b4649e42e65141de5dd3ecf43ceb4997",
      "crlfLines": [],
      "hunks": [
        {
          "before": "import {serializeCharacter,type CharacterSave} from '../src/meta/character';\nimport {NativeAreaCharacterResume} from '../src/worldmass/nativeAreaCharacterResume';\nimport {readNativeRetainedSave} from '../src/worldmass/nativeRetainedSave';\nimport {CLASSES,type ClassDef} from '../src/data/classes';\nimport {START_ZONE,type ZoneDef} from '../src/data/zones';\nimport {buildManifest} from '../src/packages/manifest';\n",
          "after": "import {serializeCharacter,type CharacterSave} from '../src/meta/character';\nimport {NativeAreaCharacterResume} from '../src/worldmass/nativeAreaCharacterResume';\nimport {readNativeRetainedSave} from '../src/worldmass/nativeRetainedSave';\nimport {QUEST_GROUND_LEDGER} from '../src/engine/questLedger';\nimport {CLASSES,type ClassDef} from '../src/data/classes';\nimport {START_ZONE,type ZoneDef} from '../src/data/zones';\nimport {buildManifest} from '../src/packages/manifest';\n"
        },
        {
          "before": "export class NativeShardRuntime {\n readonly writer:World;readonly geography:MassNativeGeography;readonly catalog:NativeGeographyCatalog;readonly definition:ZoneDef;readonly hosted:NativeAreaHostedSnapshots;\n readonly #session:NativeAreaCampaignSession;readonly #authority:NativeAreaActorAuthority<NativeAreaOngoingRuntime>;readonly #coordinator:NativeAreaSceneTransitionCoordinator;readonly #creation:NativeAreaCharacterCreation;\n readonly #preparation:NativeAreaScenePreparation;readonly #resume:NativeAreaCharacterResume|undefined;readonly #restore=NativeAreaCharacterResume.prototype.install;readonly #discardResume=NativeAreaCharacterResume.prototype.discard;\n readonly #keeperClass:ClassDef;readonly #keeperName:string;readonly #reviveSec:number;readonly #controller=new AbortController();\n readonly #allowHold=()=>false;readonly #chronoScope:{radius:number};readonly #timeflow:World['timeflow'];readonly #previousHold:PropertyDescriptor|undefined;readonly #previousScope:PropertyDescriptor|undefined;\n readonly #close=NativeAreaSceneTransitionCoordinator.prototype.retire;readonly #retireAuthority=NativeAreaActorAuthority.prototype.retire;readonly #retireMemory=NativeAreaMemoryRegistry.prototype.retire;\n",
          "after": "export class NativeShardRuntime {\n readonly writer:World;readonly geography:MassNativeGeography;readonly catalog:NativeGeographyCatalog;readonly definition:ZoneDef;readonly hosted:NativeAreaHostedSnapshots;\n readonly #session:NativeAreaCampaignSession;readonly #authority:NativeAreaActorAuthority<NativeAreaOngoingRuntime>;readonly #coordinator:NativeAreaSceneTransitionCoordinator;readonly #creation:NativeAreaCharacterCreation;\n readonly #preparation:NativeAreaScenePreparation;readonly #resume:NativeAreaCharacterResume|undefined;readonly #startupGround:unknown;readonly #restore=NativeAreaCharacterResume.prototype.install;readonly #discardResume=NativeAreaCharacterResume.prototype.discard;\n readonly #keeperClass:ClassDef;readonly #keeperName:string;readonly #reviveSec:number;readonly #controller=new AbortController();\n readonly #allowHold=()=>false;readonly #chronoScope:{radius:number};readonly #timeflow:World['timeflow'];readonly #previousHold:PropertyDescriptor|undefined;readonly #previousScope:PropertyDescriptor|undefined;\n readonly #close=NativeAreaSceneTransitionCoordinator.prototype.retire;readonly #retireAuthority=NativeAreaActorAuthority.prototype.retire;readonly #retireMemory=NativeAreaMemoryRegistry.prototype.retire;\n"
        },
        {
          "before": "  if(!isNativeWorld(writer)||installed.has(writer)||hasNativeAreaCampaignSession(writer)||hasNativeAreaMemoryRegistry(writer)||hasNativeAreaSceneTransitionCoordinator(writer))throw Error('Native shard needs its one empty actual campaign writer');assertNativeRetainedMassState(writer);\n  if(own(writer,'clientActionHook')!==undefined||own(writer,'shardWorld')!==undefined||own<Seat[]>(writer,'seats').length||own<unknown[]>(writer,'actors').length||own(writer,'localSeat')!==undefined)throw Error('Native shard cannot adopt a render shell, legacy unit or already-created character');\n  bindNativeRetainedWriterCancellation(writer,this.#controller.signal);\n  this.writer=writer;this.#resume=save?new NativeAreaCharacterResume(writer,save):undefined;this.#keeperClass=keeperClass;this.#keeperName=SHARD_CFG.keeper.name;this.#reviveSec=SHARD_CFG.keeper.reviveSec;\n  this.catalog=record?.catalog??Reflect.apply(this.#policies,writer,[()=>new NativeGeographyCatalog(makeNativeGeographyCatalogSpec(createNativeGeographyReader(captureNativeGeographySource(seed)).identity))]);this.geography=this.catalog.initial;this.definition=writer.zoneMap[START_ZONE];\n  this.#timeflow=own<World['timeflow']>(writer,'timeflow');this.#previousHold=Object.getOwnPropertyDescriptor(this.#timeflow,'allowHold');this.#previousScope=Object.getOwnPropertyDescriptor(this.#timeflow,'chronoScope');this.#chronoScope=Object.freeze({radius:SHARD_CFG.chronoRadius});\n  if(this.#previousHold&&!this.#previousHold.configurable||this.#previousScope&&!this.#previousScope.configurable)throw Error('Native shard timeflow policy slots must be replaceable');\n",
          "after": "  if(!isNativeWorld(writer)||installed.has(writer)||hasNativeAreaCampaignSession(writer)||hasNativeAreaMemoryRegistry(writer)||hasNativeAreaSceneTransitionCoordinator(writer))throw Error('Native shard needs its one empty actual campaign writer');assertNativeRetainedMassState(writer);\n  if(own(writer,'clientActionHook')!==undefined||own(writer,'shardWorld')!==undefined||own<Seat[]>(writer,'seats').length||own<unknown[]>(writer,'actors').length||own(writer,'localSeat')!==undefined)throw Error('Native shard cannot adopt a render shell, legacy unit or already-created character');\n  bindNativeRetainedWriterCancellation(writer,this.#controller.signal);\n  this.writer=writer;this.#resume=save?new NativeAreaCharacterResume(writer,save):undefined;this.#startupGround=this.#resume?structuredClone(this.#resume.record.world.overlays?.[QUEST_GROUND_LEDGER]):undefined;this.#keeperClass=keeperClass;this.#keeperName=SHARD_CFG.keeper.name;this.#reviveSec=SHARD_CFG.keeper.reviveSec;\n  this.catalog=record?.catalog??Reflect.apply(this.#policies,writer,[()=>new NativeGeographyCatalog(makeNativeGeographyCatalogSpec(createNativeGeographyReader(captureNativeGeographySource(seed)).identity))]);this.geography=this.catalog.initial;this.definition=writer.zoneMap[START_ZONE];\n  this.#timeflow=own<World['timeflow']>(writer,'timeflow');this.#previousHold=Object.getOwnPropertyDescriptor(this.#timeflow,'allowHold');this.#previousScope=Object.getOwnPropertyDescriptor(this.#timeflow,'chronoScope');this.#chronoScope=Object.freeze({radius:SHARD_CFG.chronoRadius});\n  if(this.#previousHold&&!this.#previousHold.configurable||this.#previousScope&&!this.#previousScope.configurable)throw Error('Native shard timeflow policy slots must be replaceable');\n"
        },
        {
          "before": "   const tag={reviveSec:this.#reviveSec};keeper.keeper=tag;body.untargetable=true;body.passive=true;body.invulnerable=true;this.#keeper=keeper;this.#keeperBody=body;this.#keeperTag=tag;this.#live();this.#state='ready';\n  }catch(error){this.#busy=false;this.#retire();throw error;}finally{this.#busy=false;if(signal)Reflect.apply(EventTarget.prototype.removeEventListener,signal,['abort',abort]);}\n }\n /** Capture the real native world memories and keeper build under one idle owner. */\n capture():NativeShardState{this.#idle();this.#busy=true;try{if(this.#state!=='ready')throw Error('Native shard capture needs an installed keeper');return Reflect.apply(this.#policies,this.writer,[()=>{this.#live();const keeper=serializeCharacter(this.writer);this.#live();const account=serializeAccount(this.writer.account);this.#live();return structuredClone({account,keeper});}]);}finally{this.#busy=false;if(this.#controller.signal.aborted)this.#retire();}}\n /** Original server warden maintenance, restricted to this actual idle keeper. */\n",
          "after": "   const tag={reviveSec:this.#reviveSec};keeper.keeper=tag;body.untargetable=true;body.passive=true;body.invulnerable=true;this.#keeper=keeper;this.#keeperBody=body;this.#keeperTag=tag;this.#live();this.#state='ready';\n  }catch(error){this.#busy=false;this.#retire();throw error;}finally{this.#busy=false;if(signal)Reflect.apply(EventTarget.prototype.removeEventListener,signal,['abort',abort]);}\n }\n /** THE OFFLINE HERO'S GROUND (shard W12): the reserved ground row of the startup record alone\n  * (NativeAreaCharacterResume.record, the one validated record the graph restore reads), read once at\n  * construction, never from the file again, never from the rebuilt overlay registry; undefined on a\n  * fresh world. A copy each read: the record stays private. The host adopts it into its vessel desk. */\n get startupQuestGround():unknown{return structuredClone(this.#startupGround);}\n /** Capture the real native world memories and keeper build under one idle owner. */\n capture():NativeShardState{this.#idle();this.#busy=true;try{if(this.#state!=='ready')throw Error('Native shard capture needs an installed keeper');return Reflect.apply(this.#policies,this.writer,[()=>{this.#live();const keeper=serializeCharacter(this.writer);this.#live();const account=serializeAccount(this.writer.account);this.#live();return structuredClone({account,keeper});}]);}finally{this.#busy=false;if(this.#controller.signal.aborted)this.#retire();}}\n /** Original server warden maintenance, restricted to this actual idle keeper. */\n"
        }
      ]
    },
    {
      "file": "server/nativeShardHost.ts",
      "predecessor": "c76f0bae0931b628db71501b4ad06dc92aea94cb",
      "beforeHash": "a2bc0e63d42a1c4b825a4f658602e85e7f93d05daf367a0059cca1bcb09b85e5",
      "afterHash": "369860c9b2277d647faf5206f2c87c4c56fcaaa1549b700fb804d317b092ea16",
      "crlfLines": [],
      "hunks": [
        {
          "before": "  this.world.partyMates=id=>this.parties.membersOf(id);\n  this.world.dropRuleOf=id=>this.#dropRuleOf(id);\n  this.world.partyDowns={release:id=>this.vessels.release(id),waitEnded:id=>this.vessels.waitEnded(id),view:id=>this.vessels.downView(id)};\n  this.net.reclaim=(account,char)=>this.vessels.dormantSeatOf(account,char,id=>this.net.isDormant(id));\n  this.net.identitySeat=(account,char)=>this.vessels.seatOfIdentity(account,char);\n  this.net.leaveHolds=id=>this.vessels.inCombat(id);\n",
          "after": "  this.world.partyMates=id=>this.parties.membersOf(id);\n  this.world.dropRuleOf=id=>this.#dropRuleOf(id);\n  this.world.partyDowns={release:id=>this.vessels.release(id),waitEnded:id=>this.vessels.waitEnded(id),view:id=>this.vessels.downView(id)};\n  // THE OFFLINE HERO'S GROUND (W12, server/vessel.ts): the startup record's held ground stands back up in the desk, and the\n  // keeper writer's checkpoint claims every hero's quest ground through the one serializeWorldState hook (capture reads it\n  // live: the desk's reads ride NativeShardSeats, never the runtime's own door, so the busy capture is never re-entered).\n  this.vessels.adoptGround(this.runtime.startupQuestGround);this.world.heldQuestGround=()=>this.vessels.groundLedger();\n  this.net.reclaim=(account,char)=>this.vessels.dormantSeatOf(account,char,id=>this.net.isDormant(id));\n  this.net.identitySeat=(account,char)=>this.vessels.seatOfIdentity(account,char);\n  this.net.leaveHolds=id=>this.vessels.inCombat(id);\n"
        }
      ]
    },
    {
      "file": "docs/engine/shard.md",
      "predecessor": "c76f0bae0931b628db71501b4ad06dc92aea94cb",
      "beforeHash": "7720da291ce92e5d0a100825e7f075b61553f67088e7b2c13843d800388fd959",
      "afterHash": "bac54dc4ae8bfc74937a6988e15663c7f9e28929b97583bf1a07c5e92c68476d",
      "crlfLines": [],
      "hunks": [
        {
          "before": "| THE COUNTERS AND THE JOURNAL | `World.questHand` / `withQuestHand` / `handSeats` / `handOwns` / `deedHand` / `updateClientCounters` / `counterOwned` / `seatHarvestView` (world.ts), `net/journalWire.ts` (`journalRowOf`, `harvestRowOf`, `applyCounterRows`, `counterZoneOf`, `applyCounterZone`), `snapshot.ts` `SEAT_OWN_ROWS` (`jn`, `hv`), `main.ts` `pollClientCounters`, `ShardHost` (`seatCorpseMarks`) | the gap sweep's items 3, 4, 8, 13, 16 and 25: a hosted world's counters, quests, bounty board, harvest rites and objective pay answer the seat whose hands are on them, never the parked keeper. THE CLIENT'S COUNTERS: the zone message ships (hosted worlds alone) each station's piece as the host resolved it (its spot, structure, town site and story: a shell's own town may stand at another rung, so it never re-derives a site; `World.netStationAnchors`), the Sacrificial Fonts and the station features the host owns (`counters`: THE KEEPER'S GATE, a shell reads them through `counterOwned` and never its own account, so a hosted shell never offers the campfire, whose refresh stays the world's). The shell runs its own seat's lingers at the bench, the board, the Font, the Tracker, the Oracle and the counters (`updateClientCounters`, the Caravanner's idiom: the arrival latch re-arms per adopted zone, and the seat index follows the pooled own body so the idle clock reads the steps prediction replays) and opens the same panels; every act inside them stays a host-judged request, and the board's take, pin and coast writs now ask the seat's own reach. Mireille's care (life, mana, founts, her blessing on the seat's own clock) and the giver's linger run on the host for every standing player, each on its own dwell. THE QUEST HAND: quest STATE is the hand's own ledger (card 24 ruled: THE CHARACTER'S QUESTS, the next row); every quest read and act answers the hand, the scoped seat (`withQuestHand`: a journal row, a giver linger, a claim), else on a hosted world the acting seat, else the hero. The giver stands by the hand, the gates and the offer level read its class, vocations and level, a collect quest's cargo is in its bag (each hero's own cargo on a hosted world: THE CHARACTER'S QUESTS), and the pay is its own: the chosen piece into its bag, its passive and vocation points, its gem and essence pay at its feet, its XP by the credit law (its party within the near radius of the giver). A deed the sim noticed with no act behind it (a field cleared, a place satisfied) pays the standing player nearest its place (`deedHand`; on a hosted world THE CHARACTER'S QUESTS credits every seat THE NEAR LAW pays). THE JOURNAL ROW (`SeatW.jn`, THE OWN ENTRY): the seat's quest log, offers, rewards and imbues, completed ids, its own map pins (its quests' targets and turn-ins, its own remembered bodies off the corpse desk, the surface pins on the wilds) and the bounty boards within `boardReach`, recomputed every `everySnapshots` or after the seat's own act (one snapshot's pass reads each board's route searches once, `World.withApproachPass`), shipped on a change and on the beat; an empty journal never rides (an emptied one rides `emptyBeats` beats more). A shell adopts it once per arrival (THE SPLIT's arrival half, `adoptSnapshot`), and its quest reads, the board panel, the map's pins, the HUD's quest compass and a waiting reward's journal answer from it; its station lingers run beside the Caravanner's, outside both halves. THE BOARD PER SEAT: one hand per seat per board (`BountyPosting.holder`, and `holderChar` for a hero that travels), only the holder sees, abandons and turns in its hand, the pay lands at the turning seat's feet, its receipt prints for it alone, its \"return to the board\" notice reaches its party, and a hand travels with its character (THE CHARACTER'S QUESTS: never unheld); each character is dealt its own slate at the board on the shared beat (THE BOARD PER CHARACTER, card 24; the Unbroken Wilds' country boards keep each slate in its hero's own ledger, their draw awaiting the foundation's character limb, charter card 24). THE HARVEST: the arming scan reads every standing player (its own combat clock for the calm), the rite rides its own row (`SeatW.hv`: the nodes within `harvestReach`, its own arming, its own rite) and holds its hands (`SeatW.rooted`), and its symbol presses ride the input path. XP BY PLACE: `grantXp` takes several places; on a hosted world a grant naming none pays the acting seat's party near the act, and the encounter, extraction, borough, fracture, ritual, straying, drove, wisplight, harborhold, zone objective (`objectivePlaces`: its hold fixtures, its quarry's body, else the field's last counted fall), geographic objective and cleared-site payouts name their places, so a player AFK at the hearth never levels off the field. `balance/probe_shardcounters.ts`. |\n| THE CHARACTER'S QUESTS | `engine/questLedger.ts` (`QuestLedger`, `QuestLedgerSave`, `questWorldKey`, `charKeyOf`, `withQuestWorld`, `QUEST_LEDGER_CFG`) / `World.questLedger`, `questLedgerOf`, `ownQuestLedger`, `seatQuests`, `questStamp`, `questRunLedger`, `questHandLevel`, `questCharKey`, `creditedHands`, `openWritHand`, `seedHeroWrits`, `noteSeatArrival`, `ensureSeatCargo`, `settleHeroMassQuests`, `adoptQuestLedger`, `packQuestLedger`, `odysseyLeads`, `keeperCampaign` (world.ts) / `OdysseyRuntime` (`updateHeroes`, `enrollHero`, `leaderQuestDone`, `campaign`) / `CharacterSave.quests`, `PlayerMeta.questWorlds` (meta/character.ts) / `VesselDesk` (the graft, `serializeIn`, `questWorld`) | card 24 as ruled (2026-10-10): the unit of a quest is the CHARACTER, exactly as single player. A hero's quest log (held and finished), its imbues, its own rolled bounty postings and the boards they were dealt at (the slate, the hands, each board's armed beat and refresh limb), the run-ledger keys its quest acts stamp (`quest_done:`, a reward's chain keys, a vocation's, the board's counters: `questStamp`) and its Odyssey leads are ONE ledger. Solo and the co-op host: the local seat's ledger IS the run's quest state (`ownQuestLedger`; `activeQuests`, `completedQuests`, `questImbues`, `bountyOffers`, `bountyHands` and the board states are accessors over the quest hand's ledger, and off a hosted world every hand reads the one), saved with the world half as ever: THE SOLO INVARIANT, THE SOLO DIGEST pinned by the probe. A hosted world: every player seat holds its own (`seatQuests`, a SEAT row THE HAND-OFF moves; THE OCCUPIED LAW lets a keeper sweep read a seat standing in a unit), every quest read and act answers the hand's (THE QUEST HAND), the keeper's own ledger is a sink no character's quest lands in, and an offer's gates read the world's run ledger under the hand's own keys (`questRunLedger`) at the hand's own level (`questHandLevel`). A zone objective completes the field leg in the ledger of every seat THE NEAR LAW credits (`creditedHands`: the standing seats within the near radius of its places, its author, and with an author only its party; the shard escape's and the wilds' place quests the same, `settleHeroMassQuests`); a writ's claim (THE CULL's mark, THE GATHER's rite) credits its author's own open posting first, then any hand's here (`openWritHand`); a zone's writ ground seeds the sum of every hero's remainders, each posting at its own level (`seedHeroWrits`); an arrival is each seat's own deed (`noteSeatArrival` from THE HAND-OFF's attach: an errand's entry, a survey's new ground, a trail's crossing; the wake's first visit is the seat's that woke it); a collect quest's cargo is each hero's own (`ensureSeatCargo`); the bounty watch walks every hero's hands, and its slate while it stands at a board in its own World (the solo watch's own condition); a hand travels with its character (W5's unheld hand is retired). THE WORLD'S HALF stays the keeper's: the Odyssey's campaign (roster, receipts, preparations, assaults and pressure; a sim unit reads the keeper's campaign, `keeperCampaign`), world events and sieges. The campaign enrolls its rows into every standing hero's own ledger (`enrollHero`, idempotent; a fallen leader's pursuit and a prepared operation are never offered anew and end quietly in a log that held them); the giver marks the lingerer's own leads; a kill's lead is the killer's; a leader quest done pays every hero whose own pursuit the deed credited (the leader falls once, the world's). THE VESSEL: `CharacterSave.quests` carries one ledger per hosted world the hero walked, keyed by `questWorldKey` (the hosted seed and lane, as the save file is named); the graft adopts this world's, re-validated (a posting whose ground or kind left, a quest whose def or zone left, drops; the hands re-stamped to the seat); every other world's rides `PlayerMeta.questWorlds` through every save (a solo run's quests ride its world half as ever); the mirror writes this world's as it stands (`withQuestWorld`: the newest `worldsKept`); the judgment refuses a malformed ledger. The journal row reads the seat's ledger, and the map's pins, the offers and the board's view follow. `balance/probe_shardcharacter.ts` A to D and Z. |\n| THE SHELF PER BUYER | `World.withBuyer`, `seatShelves` (`BuyerShelf`), `charVendorHolds`, `ownVendorHolds`, `ownVendorStock`, `ownChandlerStock`, `armBuyerShelves`, `shelfCharKey`, `buyerSettlementHost`, `smithCounterHere`, `gateAccountOf`, `serializeCharVendorHolds` (world.ts) / `snapshot.ts` (`SeatW.vd`, `ShelfW`, `ownShelfOf`, `shelfRowsFor`) / `WorldStateSave.charVendorHolds` | card 29 as ruled (2026-10-10): a hosted world's counters roll per buyer, the way Path of Exile's vendors are each player's own. Inside a counter act (`withBuyer`: the buy, the reserve, the standing order, the arm) the shelf, the armed beats, THE PATRON'S HOLD and THE STANDING ORDER, the roll's level, the carried gems and the gates are the buyer's own: the same restock beat, the buyer's own draw (the counters' native rolls, `vendorshelf:<counter>:<beat>` and the standing order's `vendorhold:<counter>:<gem>:<beat>`, read a host whose world seed is folded with `vendorbuyer:<character>`: `buyerSettlementHost`, the native bodies verbatim), its hero's level (the gear shelf's ilvl and the gem bracket), and the gates of the account the seat claims through ONE resolver (`gateAccountOf`: the trade gate, the wares, quality and lock rungs, the support share, the rush rungs; today every seat reads the shard's open account, THE KEEPER'S GATE, and M2's account gate re-points the one line). Every standing player in a counter's zone is dealt its own shelf when the beat turns (`armBuyerShelves`; the `BuyerShelf` is a SEAT row the hand-off carries, so THE STANDING SHELF holds per buyer); the counter's own restock re-deals every buyer's there; a purchase splices the buyer's shelf alone. THE PATRON'S HOLD and THE STANDING ORDER key by character (`charVendorHolds`, saved as `WorldStateSave.charVendorHolds` beside the World's own book). THE OWN ENTRY ships each buyer its own shelf as `SeatW.vd` (`{ v, at, cap }`: its wares wearing its own hold flags, the shared restock mark, its capacity) on a change and on THE SHELF BEAT (a change a throttled socket skipped rides THE WIRE DIET's carry into the frame that resumes it), wherever Brandt's counter stands (`smithCounterHere`: the shelf travels with its buyer and rides nowhere else, the client keeping its last), and a hosted world ships no root vendor rows; a shell reads its own row (`shelfRowsFor`) where the co-op lane reads the root rows. Solo and the co-op host: one local buyer, and the shelf, the seeds and the rows are what they were, byte for byte (THE SOLO DIGEST). `balance/probe_shardcharacter.ts` E and Z, `balance/probe_shardwire.ts` G. |\n| THE SPOKEN QUESTS (W12) | `net/spokenQuests.ts` (`spokenReads` / `spokenReadsOf`, `spokenRowOf`, `spokenEmpty`, `questDialogueView`, `spokenDialogueHost`: the World's own dialogue director's host), `net/journalWire.ts` (`JournalW.sq`, `JournalW.voc`, `applyCounterRows`), `World.vocationAskOf` / `questGiverStep` / `updateVocationSites` / `vocationMenuOffers` / `heldQuestGround` (world.ts), `main.ts` `pollClientCounters`, `engine/questLedger.ts` (`QUEST_GROUND_LEDGER`, `QuestGroundSave`, `sanitizeQuestGround`), `VesselDesk` (`noteGround`, `groundLedger`, `adoptGround`, `heldGround`), `ShardHost` (the resumed ledger) | W9's three findings (2026-10-10), closed. THE HEARD LINE: the authored dialogue (data/npcDialogues.ts) gates on the hearer's quests, its run ledger and its account, which a render shell never holds for its own seat, so a hosted hero heard the ungated lines only. The journal row now carries what the conditions read (`JournalW.sq`): the seat's held quests with their standing and field leg, the run view of the named ledger keys (the world's run ledger under the seat's own quest keys, `questRunLedger`), the account view and the named features through THE SEAT'S GATE (`gateAccountOf`: the shard's account today, the seat's own once M2 re-points the one line), and the account level while a condition reads one. The key list is derived from the dialogue data's conditions at its first read (`spokenReads`), never a hand list: only a key a condition names rides, and a row with nothing in it rests like an empty journal. `questDialogueView(world, seatId)` is THE ONE RESOLVER the dialogue director evaluates through (the World builds its director over `spokenDialogueHost`, so the director's source stays the foundation's pinned original): a hosted world's shell answers its own seat from its newest journal row (nothing held before one lands) and keeps every other read its own (a local receipt, the hero's place, a fact's world state); solo, the co-op host and a co-op client get the World itself (THE SOLO DIGEST). The speech focus the renderer drives each frame beside `pollClientCounters`, `npcDialogueReachable` and the reward check all ride the director, so every client road to an authored line reads the seat's own state. `NPC_APPEARANCES` never ride: a look is one body every hearer sees. THE CALLING PER SEAT: a secret vocation site tests every standing player seat's own body (THE ACTING SEAT's toucher law; the keeper's parked body never discovers) and the discovery is the seeker's: its own ledger's key (THE CHARACTER'S QUESTS, mirrored home), the account copy its run's end would have paid, through its own gate, and its silence or its calling on its own note row (`SeatW.fn`). A hosted seat's linger at a giver with a fresh calling on offer asks its own menu once per visit (the solo dwell's one request): the ask rides its journal row (`JournalW.voc`: the ask's world time and the cards, read for the asking hand's class), its client opens the solo menu off the row (`pollClientCounters`) and the pick comes home as its own `vocationQuest` word; stepping away ends the ask. THE OFFLINE HERO'S GROUND: the world save's claim read only the standing heroes on its write side and the keeper's own log on its resume, so a quest's event ground (a special arena) fell at a restart and the hero's graft dropped the quest. The vessel desk notes each vessel's held event ground at its mirror and its leave (by hero, wall-clock stamped), and the keeper's World publishes every hero's ground into the save's overlay bag (`QUEST_GROUND_LEDGER`, `:questGround`) with THE ZONE-CLAIM CONVENTION's `ownedZones`, so the transience scrub keeps it on both sides of the save; a resumed ledger stands back up in the desk. A quest ended (the next mirror names it no more), a mortal fall, or a hero gone longer than `VESSEL_CFG.groundKeptDays` releases the ground. The claim is the engine's (world.ts and world/overlay.ts), never the foundation's: the Unbroken Wilds' quest grounds are places, pure functions of the seed, never culled. `SHARD_WIRE_PROTOCOL` 7 (upstream took 6 for the skill fields). `balance/probe_shardspoken.ts`. |\n| THE SIM UNITS, W1 | `src/engine/shardUnits.ts` (`UNIT_CFG`, `RoadTicket`, `ShardWorldLink`, `SeatPacket`, `SHARD_UNIT_FIELDS`, `pinIn` / `pinOut`, `detachSeat` / `attachSeat`) / `server/simUnits.ts` (`UnitRegistry`, `SimUnit`, `SeatWorlds`) / `World.shardWorld`, `shardUnitHost`, `landSeatAt`, `captureLiveMemory`, `sleepZone`, `atZone` / `ShardTransport.sendStateTo`, `sendZoneToMany` / `ShardSave.run` | M1's first wave (the plan is `docs/design/shard-m1-plan.md`): one World per live zone. THE KEEPER is the World a shard always had (`ShardHost.world`: the chart, the WorldSim, the clock, the account, the world sweeps); every other live zone is a UNIT: a staged World under a throwaway account, booted into its zone with `createPlayer({ load: false })` and its own parked warden (keeper-tagged, invulnerable, untargetable, passive, levitating), wearing the host's published fields (the timeflow policies, the party, `World.shardWorld = { role, key, enqueue, dispatch }`). THE PIN: at every entry into a unit the keeper's world-level fields (the census's alias and counter rows: the chart and the pockets, the memories, the run ledger (the quests and the slate are each hero's own SEAT row since THE CHARACTER'S QUESTS), the once-latches, the notice feed, `nextGenId`) are copied onto it, and at its exit every one the unit reassigned is copied back, so a runtime reassignment in either World is never lost and two units minting in one tick never share a `gen_` id; THE ONE CLOCK pins `time` and `inputClock` in at the keeper's tick-start reading, so every unit lands where the keeper lands. THE PRIMARY GATE (`World.update`'s `unitWorld`, `updateHarborholds`): a unit skips the keeper's world sweeps (the sim, the odyssey, the forechart, the web settle, the omens, the deed recovery, the class claims, the mycelia, the deepwinter reconcile, the bulletins, the mint and ignition drains, the warband arrivals, the warp sweep, the floating zones); the keeper ticks first and drains every world queue, so until W3 splits them a unit only misses what belongs to its own zone. THE ALIAS CENSUS (`SHARD_UNIT_FIELDS`, derived each run by the probe from world.ts): every field whose own container is a string-keyed map, set or record, a WorldSim, a ledger or an account, every field the world save touches (THE SAVE LAW: never per-unit) and every field the gated sweeps write one call deep (THE SWEEP LAW) carries a row: alias, counter, clock, keeper (the keeper's copy is the one its sweeps and save read), host, seat (moved or dropped by the hand-off) or unit with a reason (per-visit, zone-local, memo, seat-keyed, warden-only, dev, shell); a row naming a missing field fails. THE HAND-OFF moves a seat as the same Actor objects, ids kept: `detachSeat` (in the source, under its pin) refuses a held seat or one mid-harvest or mid-trace, ejects a borrowed body, takes THE CARRY SET (the hero and every living, non-construct body whose whole owner chain to it is carried; the rest of the chain is culled quietly, as a zone change drops it), clears the hero's chain now in the controllers that tear down on absence (the companion bond exported whole, assault courts, challenges, attack sequences, guard arts, satellites, auroras, guardians, creepers), purges every flight, field (a toggled one refunded through `expireZone`), band and pending row the chain owns, strips the sources keyed by the source's own counters (domains, auras both ways, altars), releases grips, drops the source's target refs on the court and lifts the seat rows (the ack, the spent presses, the kill tally, companion grants, replenishment clocks, tree buff sources, trace rests, pips, the timers; the lite-tier throng rows are freed and re-spawned beside the hero); `attachSeat` resets the court at the door (the cue arrays, THE BLINK LAW, marks, the retinue's AI and orders), re-binds the status relays, lands it through THE FILTERED HOST (`World.landSeatAt`: the one landing law over a view of that seat and its court alone; 'entry' applies loadZone's back-portal rule to the destination's live exits), installs the rows and re-derives the build. The arrival wears THE SPAWN GRACE for `UNIT_CFG.arrivalGraceSec` (or until its first willed input) and hears its unit's zone message at once. THE REGISTRY (`UnitRegistry`): THE SEAT LEDGER (where every seat stands; a join lands in the keeper), THE HEARTH ALIAS (the keeper hosts the zone it stands in, read live) and THE WILDS LAW (on the Unbroken Wilds the keeper hosts the whole surface and only pockets wake), THE HAND-OFF QUEUE (tickets drained after every unit ticked; the direct `travel(seatId, zoneId)` door serves the probes and the dev lane until W2's roads emit tickets), THE WAKE (the ladder installed, the placeholder hearth never captured), THE LINGER (a unit seatless for `unitLinger` runs the departure's leave verbs, its zone memory captured exactly as a departure captures it, and drops; the hearth never sleeps, a dormant or downed seat keeps its unit), THE SOFT CAP (`maxUnits`: the longest-seatless unit sleeps at once; a wake is never refused), THE UNIT BREAKER (a unit faulting `SHARD_CFG.faultBreakerTicks` ticks running sends its seats to the hearth and drops uncaptured; the keeper keeps THE BREAKER), THE PERSIST CAPTURE (every awake unit writes its live memory row before the world save), and the status page's `units` and each seat's `unit`. THE UNIT WARDEN and THE UNIT SHADOW: every unit's warden stands its flags each tick on its unit's focus seat; the keeper mirrors the highest standing level shard-wide, a unit the highest in it. THE WIRE PER UNIT: each unit ships its own snapshot (one `snapTick` per beat across the shard) and its own zone message (a change, THE DRESS BEAT) to its own seats (`sendStateTo`, `sendZoneToMany`); the party rows are world-wide, published into every unit (beside THE CORPSE ON THE CHART's marks hook, re-published when a refused wilds save replaces the keeper's World); each seat's journal and harvest rows (THE COUNTERS AND THE JOURNAL) are judged in its own unit, and a hand-off marks the arrival's journal so its new zone's boards and pins ride the first snapshot it hears there; pings stay unit-local. THE DESKS PER UNIT: the vessel and corpse desks read each seat's own unit through `SeatWorlds` (a body records its unit's zone and spot, and a pocket leaves none; a pocket mirror carries its companions; THE GROUP LAW's kneel needs a mate in the same unit; THE DEATH COVENANT judges every seat in its own unit), THE DORMANT SEAT resumes with its unit's zone, and THE MERCY stands up a downed Immortal in any unit. THE RUN ROW: `ShardSave.run` persists the keeper's clears, run ledger, throng claims and annex finds, restored after the world half stands (a clear off the chart drops; absent = today). W2 opened the roads one seat at a time (THE ROADS PER PLAYER, the next row). THE SOLO INVARIANT: no sim or co-op World ever carries the link, and THE ROAD-WALK DIGEST of a seeded solo walk (an exit, a cave mouth, the climb-out, a town portal round trip) is pinned. `balance/probe_shardunits.ts`. |\n| THE ROADS PER PLAYER, W2 | `src/engine/shardRoads.ts` (`scanShardRoads`, `SHARD_ROADS_CFG`, `seatDoorOf` / `seatLadderOf`, `shardRoadArrive` / `shardRoadDepart`, `roadDwellRow`, `shardSpotOf` / `ladderOfSpot`) / `World.mouthUnder`, `mouthRefusalUnder`, `realmGates` / `gateUnder`, `wardSealUnder`, `holdfastNear`, `exitUnder` / `exitLockHint`, `isExitLocked(e, from)`, `shardExitRoad` / `shardMouthRoad`, `sealedRoadUnder`, `shardRoadHost`, `netRoadDwell` / `SeatW.rd` / the `waypoint` intent / `ShardWorldLink.liveSeed`, `hearth` / `UnitRegistry.liveSeedOf` | M1's second wave: every road off a zone judged per seat (the catalog is the section below). THE LIFT: the road block's scans (the mouth under a body and a shut mouth's refusal, the realm gates and the gate under a body, the ward seal, the holdfast's parley ring, the exits under a body and a lock's own word) are named World methods the solo block calls with the local hero in its old order, pinned by two road-walk digests taken before the lift (W1's solo walk and the co-op host's walk with a second seat carried along, a sealed door's word included). THE SHARD SCANNER (`scanShardRoads`, one gated call at the end of the road block on a hosted world): every standing player seat holds at most one road dwell, read with its own body and built only while it is idle and unshoved; a finished dwell builds the road's ticket in the source (`shardExitRoad`, travelThrough's twin: the seat's own ladder's climb-out, the far span mouth resolved in the destination, a `?` frontier charted in place, the escape credit judged from the seat's door and paid to its party within reach; `shardMouthRoad`, enterSidezone's twin: the pocket minted in the source, on the wilds the keeper's native mint, the traveller's level for a character pocket, the seat's own ladder one rung deeper), and THE HAND-OFF QUEUE moves that seat alone. Per-seat road state lives beside each unit World (never a World field): THE SEAT'S DOOR (THE RETREAT LAW: `isExitLocked` spares each seat its own edge, so a second arriver from another side keeps its way back), THE SEAT'S LADDER (a seat with none reads its unit's), THE EXIT GRACE (a climbed-out seat on its mouth never dwells straight back down), the holdfast's parley and the words already heard. The intents re-opened: `townPortal` (the seat's own spot, ladder and door are the portal's origin; the dwell enqueues instead of loading and the unit's other seats keep their frame; the way back reads an awake source's live seed), `caravanTo` and the new `waypoint` (the asking seat judged, a render shell's map asks through the intent); THE HEARTH ALIAS lands each in the keeper (its waypoint, else THE HEARTH SEAT). THE SEALED WORDS: the dock, the harbor board's passage, the Wraithsail lying alongside and the Delver's shaft stay sealed (each owns a per-World singleton run), as does a realm gate until W4 builds its road; each says its word once per approach on the seat's own note row (THE ACTING SEAT) and builds no dwell, so no ring. THE ROAD RING (`SeatW.rd`, THE OWN ENTRY): the dwell the host fills rides its own seat's row and a shell draws it (`World.netRoadDwell`). The executor resolves a landing in the destination after its wake, installs the road's per-seat rows there, runs the road's after-word (the escape's word, the waypoint's clear bubble) and takes one road per seat per drain. `balance/probe_shardunits.ts` B (the digests), F and H; the wilds pocket road is `balance/probe_shardslow.ts` S. |\n| THE WORLD SWEEP (THE SIM UNITS, W3) | `World.atZone` / `presentWorlds` / `occupiedAudience` (world.ts) / `ShardWorldLink.dispatch` / `worlds`, `UNIT_CFG.freezeLinger` (engine/shardUnits.ts) / `UnitRegistry.dispatch` / `worlds` / `frozen` / `beginTick` (server/simUnits.ts) / `OverlayView.presentZoneIds` / `censusByZone`, `zonePresent` / `presentCensus` (world/overlay.ts) / `nativeSimView` (engine/nativePopulationResolution.ts) / `WorldBulletin.to` (world/bulletins.ts) | M1's third wave: the world sweeps that drain a world queue and then act on one zone reach every awake sim unit, and the overlays learn where players stand. THE SPLIT DISPATCH: `World.atZone(zoneId, fn)` runs `fn` on the World standing in the zone and returns its answer; solo and the co-op host it is the conditional it replaced (this zone, else nothing), byte for byte; on a shard the keeper's sweeps reach the unit standing there through the link's `dispatch`, under that unit's pin at THE ONE CLOCK's tick-start reading (a frozen unit included: its zone is awake ground), and a call made from inside another unit waits for THE HAND-OFF QUEUE's drain (a pin never opens inside a pin, and the keeper is never entered with a unit's stale alias fields). The registry resolves the World that STANDS in the zone, never THE WILDS LAW's travel alias. The keeper drains each world queue once and dispatches the zone half: warband arrivals (the pack lands in the unit standing in its target zone and nowhere else), the haunt's dawn dissolutions (the fade in the grief's unit), the harborhold lifecycle (the dress, the services, the gate reseal, the in-zone word and the overrun text in the hold's unit; THE MUSTER's pause belt asks the hosting unit's live defense; a hold no World stands in hears \"word comes\"), the deadwake's ebbs (one notice to the seats of every occupied zone within the tide's reach). The keeper's alone, with their in-zone halves left to each World: the world-boss mints (walls, passing, fight sync stay), the Long Night's sky feed, announcements and warp reconcile (the ground, the coach, the pour stay), the quickening's stamps (the materialize beat, the kin pulse, the echo stay), the bounty watch (the slate's reconcile; its holder sweep reads every unit's seats, so a hand is unheld only when its holder left the world). The gloaming's outlasted edge is watched by every World (each floats the word over its own players) and banked once, by the keeper. The bloom's activity map is built once, each zone's engine-local term (theater runs, encounters) read in the World standing there. The bulletins drain once; the war below is heard by the seats standing in its plane (`WorldBulletin.to`, the notice's audience), and so is a demon rift's tearing. THE OCCUPIED LAW: on a hosted world `nativeSimView` reports `presentZoneIds` (every live World's zone, the keeper's first) and `censusByZone` (each one's own live census) beside the keeper's `currentZoneId`; exactly the five readers whose job is never acting on ground a player stands in read them, through `zonePresent` and `presentCensus` (the warband pump's throttle, the deadwake's consume, the faction field's live-census diffusion, the plague's patient zero, the conclave's targeting); every owner-centric read keeps the keeper's (M3's). MANY ORIGINS: the forechart's halo round-robins over the occupied zones, one origin a sweep; the omens murmur to every occupied zone within reach (one whisper an omen, each zone its own bearing over its own player; the reveal reads from the nearest); a floating zone wires in near any occupied zone; the conclave's ignite level reads every occupied zone. THE ACTING SEAT's audience (a line a seat's act caused reaches its party) is gathered over every unit's seats: the feed is one. THE LINGER FREEZE (`UNIT_CFG.freezeLinger`, default on): a seatless unit takes no step and ships nothing through its whole linger, its bodies and flights holding where the last seat left them; a seat's return resumes it under THE ONE CLOCK's re-pin of `time` and `inputClock` (the semantics of a sleep and a wake: the world moved on while nobody watched); a dormant or a downed seat is a seat, so its unit ticks on; the status page marks a frozen unit. THE SOLO INVARIANT: THE SWEEP-WALK DIGEST of a seeded solo expedition that lights every split sweep's event was pinned before the split and holds after it. `balance/probe_shardunits.ts` J. |\n",
          "after": "| THE COUNTERS AND THE JOURNAL | `World.questHand` / `withQuestHand` / `handSeats` / `handOwns` / `deedHand` / `updateClientCounters` / `counterOwned` / `seatHarvestView` (world.ts), `net/journalWire.ts` (`journalRowOf`, `harvestRowOf`, `applyCounterRows`, `counterZoneOf`, `applyCounterZone`), `snapshot.ts` `SEAT_OWN_ROWS` (`jn`, `hv`), `main.ts` `pollClientCounters`, `ShardHost` (`seatCorpseMarks`) | the gap sweep's items 3, 4, 8, 13, 16 and 25: a hosted world's counters, quests, bounty board, harvest rites and objective pay answer the seat whose hands are on them, never the parked keeper. THE CLIENT'S COUNTERS: the zone message ships (hosted worlds alone) each station's piece as the host resolved it (its spot, structure, town site and story: a shell's own town may stand at another rung, so it never re-derives a site; `World.netStationAnchors`), the Sacrificial Fonts and the station features the host owns (`counters`: THE KEEPER'S GATE, a shell reads them through `counterOwned` and never its own account, so a hosted shell never offers the campfire, whose refresh stays the world's). The shell runs its own seat's lingers at the bench, the board, the Font, the Tracker, the Oracle and the counters (`updateClientCounters`, the Caravanner's idiom: the arrival latch re-arms per adopted zone, and the seat index follows the pooled own body so the idle clock reads the steps prediction replays) and opens the same panels; every act inside them stays a host-judged request, and the board's take, pin and coast writs now ask the seat's own reach. Mireille's care (life, mana, founts, her blessing on the seat's own clock) and the giver's linger run on the host for every standing player, each on its own dwell. THE QUEST HAND: quest STATE is the hand's own ledger (card 24 ruled: THE CHARACTER'S QUESTS, the next row); every quest read and act answers the hand, the scoped seat (`withQuestHand`: a journal row, a giver linger, a claim), else on a hosted world the acting seat, else the hero. The giver stands by the hand, the gates and the offer level read its class, vocations and level, a collect quest's cargo is in its bag (each hero's own cargo on a hosted world: THE CHARACTER'S QUESTS), and the pay is its own: the chosen piece into its bag, its passive and vocation points, its gem and essence pay at its feet, its XP by the credit law (its party within the near radius of the giver). A deed the sim noticed with no act behind it (a field cleared, a place satisfied) pays the standing player nearest its place (`deedHand`; on a hosted world THE CHARACTER'S QUESTS credits every seat THE NEAR LAW pays). THE JOURNAL ROW (`SeatW.jn`, THE OWN ENTRY): the seat's quest log, offers, rewards and imbues, completed ids, its own map pins (its quests' targets and turn-ins, its own remembered bodies off the corpse desk, the surface pins on the wilds) and the bounty boards within `boardReach`, recomputed every `everySnapshots` or after the seat's own act (one snapshot's pass reads each board's route searches once, `World.withApproachPass`), shipped on a change and on the beat; an empty journal never rides (an emptied one rides `emptyBeats` beats more). A shell adopts it once per arrival (THE SPLIT's arrival half, `adoptSnapshot`), and its quest reads, the board panel, the map's pins, the HUD's quest compass and a waiting reward's journal answer from it; its station lingers run beside the Caravanner's, outside both halves. THE BOARD PER SEAT: one hand per seat per board (`BountyPosting.holder`, and `holderChar` for a hero that travels), only the holder sees, abandons and turns in its hand, the pay lands at the turning seat's feet, its receipt prints for it alone, its \"return to the board\" notice reaches its party, and a hand travels with its character (THE CHARACTER'S QUESTS: never unheld); each character is dealt its own slate at the board on the shared beat (THE BOARD PER CHARACTER, card 24; the Unbroken Wilds' country boards keep each slate in its hero's own ledger, their draw awaiting the foundation's character limb, charter card 24). THE HARVEST: the arming scan reads every standing player (its own combat clock for the calm), the rite rides its own row (`SeatW.hv`: the nodes within `harvestReach`, its own arming, its own rite) and holds its hands (`SeatW.rooted`), and its symbol presses ride the input path. XP BY PLACE: `grantXp` takes several places; on a hosted world a grant naming none pays the acting seat's party near the act, and the encounter, extraction, borough, fracture, ritual, straying, drove, wisplight, harborhold, zone objective (`objectivePlaces`: its hold fixtures, its quarry's body, else the field's last counted fall), geographic objective and cleared-site payouts name their places, so a player AFK at the hearth never levels off the field. `balance/probe_shardcounters.ts`. |\n| THE CHARACTER'S QUESTS | `engine/questLedger.ts` (`QuestLedger`, `QuestLedgerSave`, `questWorldKey`, `charKeyOf`, `withQuestWorld`, `QUEST_LEDGER_CFG`) / `World.questLedger`, `questLedgerOf`, `ownQuestLedger`, `seatQuests`, `questStamp`, `questRunLedger`, `questHandLevel`, `questCharKey`, `creditedHands`, `openWritHand`, `seedHeroWrits`, `noteSeatArrival`, `ensureSeatCargo`, `settleHeroMassQuests`, `adoptQuestLedger`, `packQuestLedger`, `odysseyLeads`, `keeperCampaign` (world.ts) / `OdysseyRuntime` (`updateHeroes`, `enrollHero`, `leaderQuestDone`, `campaign`) / `CharacterSave.quests`, `PlayerMeta.questWorlds` (meta/character.ts) / `VesselDesk` (the graft, `serializeIn`, `questWorld`) | card 24 as ruled (2026-10-10): the unit of a quest is the CHARACTER, exactly as single player. A hero's quest log (held and finished), its imbues, its own rolled bounty postings and the boards they were dealt at (the slate, the hands, each board's armed beat and refresh limb), the run-ledger keys its quest acts stamp (`quest_done:`, a reward's chain keys, a vocation's, the board's counters: `questStamp`) and its Odyssey leads are ONE ledger. Solo and the co-op host: the local seat's ledger IS the run's quest state (`ownQuestLedger`; `activeQuests`, `completedQuests`, `questImbues`, `bountyOffers`, `bountyHands` and the board states are accessors over the quest hand's ledger, and off a hosted world every hand reads the one), saved with the world half as ever: THE SOLO INVARIANT, THE SOLO DIGEST pinned by the probe. A hosted world: every player seat holds its own (`seatQuests`, a SEAT row THE HAND-OFF moves; THE OCCUPIED LAW lets a keeper sweep read a seat standing in a unit), every quest read and act answers the hand's (THE QUEST HAND), the keeper's own ledger is a sink no character's quest lands in, and an offer's gates read the world's run ledger under the hand's own keys (`questRunLedger`) at the hand's own level (`questHandLevel`). A zone objective completes the field leg in the ledger of every seat THE NEAR LAW credits (`creditedHands`: the standing seats within the near radius of its places, its author, and with an author only its party; the shard escape's and the wilds' place quests the same, `settleHeroMassQuests`); a writ's claim (THE CULL's mark, THE GATHER's rite) credits its author's own open posting first, then any hand's here (`openWritHand`); a zone's writ ground seeds the sum of every hero's remainders, each posting at its own level (`seedHeroWrits`); an arrival is each seat's own deed (`noteSeatArrival` from THE HAND-OFF's attach: an errand's entry, a survey's new ground, a trail's crossing; the wake's first visit is the seat's that woke it); a collect quest's cargo is each hero's own (`ensureSeatCargo`); the bounty watch walks every hero's hands, and its slate while it stands at a board in its own World (the solo watch's own condition); a hand travels with its character (W5's unheld hand is retired). THE WORLD'S HALF stays the keeper's: the Odyssey's campaign (roster, receipts, preparations, assaults and pressure; a sim unit reads the keeper's campaign, `keeperCampaign`), world events and sieges. The campaign enrolls its rows into every standing hero's own ledger (`enrollHero`, idempotent; a fallen leader's pursuit and a prepared operation are never offered anew and end quietly in a log that held them); the giver marks the lingerer's own leads; a kill's lead is the killer's; a leader quest done pays every hero whose own pursuit the deed credited (the leader falls once, the world's). THE VESSEL: `CharacterSave.quests` carries one ledger per hosted world the hero walked, keyed by `questWorldKey` (the hosted seed and lane, as the save file is named); the graft adopts this world's, re-validated (a posting whose ground or kind left, a quest whose def or zone left, drops; the hands re-stamped to the seat); every other world's rides `PlayerMeta.questWorlds` through every save (a solo run's quests ride its world half as ever); the mirror writes this world's as it stands (`withQuestWorld`: the newest `worldsKept`); the judgment refuses a malformed ledger. The journal row reads the seat's ledger, and the map's pins, the offers and the board's view follow. `balance/probe_shardcharacter.ts` A to D and Z. |\n| THE SHELF PER BUYER | `World.withBuyer`, `seatShelves` (`BuyerShelf`), `charVendorHolds`, `ownVendorHolds`, `ownVendorStock`, `ownChandlerStock`, `armBuyerShelves`, `shelfCharKey`, `buyerSettlementHost`, `smithCounterHere`, `gateAccountOf`, `serializeCharVendorHolds` (world.ts) / `snapshot.ts` (`SeatW.vd`, `ShelfW`, `ownShelfOf`, `shelfRowsFor`) / `WorldStateSave.charVendorHolds` | card 29 as ruled (2026-10-10): a hosted world's counters roll per buyer, the way Path of Exile's vendors are each player's own. Inside a counter act (`withBuyer`: the buy, the reserve, the standing order, the arm) the shelf, the armed beats, THE PATRON'S HOLD and THE STANDING ORDER, the roll's level, the carried gems and the gates are the buyer's own: the same restock beat, the buyer's own draw (the counters' native rolls, `vendorshelf:<counter>:<beat>` and the standing order's `vendorhold:<counter>:<gem>:<beat>`, read a host whose world seed is folded with `vendorbuyer:<character>`: `buyerSettlementHost`, the native bodies verbatim), its hero's level (the gear shelf's ilvl and the gem bracket), and the gates of the account the seat claims through ONE resolver (`gateAccountOf`: the trade gate, the wares, quality and lock rungs, the support share, the rush rungs; today every seat reads the shard's open account, THE KEEPER'S GATE, and M2's account gate re-points the one line). Every standing player in a counter's zone is dealt its own shelf when the beat turns (`armBuyerShelves`; the `BuyerShelf` is a SEAT row the hand-off carries, so THE STANDING SHELF holds per buyer); the counter's own restock re-deals every buyer's there; a purchase splices the buyer's shelf alone. THE PATRON'S HOLD and THE STANDING ORDER key by character (`charVendorHolds`, saved as `WorldStateSave.charVendorHolds` beside the World's own book). THE OWN ENTRY ships each buyer its own shelf as `SeatW.vd` (`{ v, at, cap }`: its wares wearing its own hold flags, the shared restock mark, its capacity) on a change and on THE SHELF BEAT (a change a throttled socket skipped rides THE WIRE DIET's carry into the frame that resumes it), wherever Brandt's counter stands (`smithCounterHere`: the shelf travels with its buyer and rides nowhere else, the client keeping its last), and a hosted world ships no root vendor rows; a shell reads its own row (`shelfRowsFor`) where the co-op lane reads the root rows. Solo and the co-op host: one local buyer, and the shelf, the seeds and the rows are what they were, byte for byte (THE SOLO DIGEST). `balance/probe_shardcharacter.ts` E and Z, `balance/probe_shardwire.ts` G. |\n| THE SPOKEN QUESTS (W12) | `net/spokenQuests.ts` (`spokenReads` / `spokenReadsOf`, `spokenRowOf`, `spokenEmpty`, `questDialogueView`, `spokenDialogueHost`: the World's own dialogue director's host), `net/journalWire.ts` (`JournalW.sq`, `JournalW.voc`, `applyCounterRows`), `World.vocationAskOf` / `questGiverStep` / `updateVocationSites` / `vocationMenuOffers` / `heldQuestGround` (world.ts), `main.ts` `pollClientCounters`, `engine/questLedger.ts` (`QUEST_GROUND_LEDGER`, `QuestGroundSave`, `sanitizeQuestGround`), `VesselDesk` (`noteGround`, `groundLedger`, `adoptGround`, `heldGround`), `ShardHost` (the resumed ledger) | W9's three findings (2026-10-10), closed. THE HEARD LINE: the authored dialogue (data/npcDialogues.ts) gates on the hearer's quests, its run ledger and its account, which a render shell never holds for its own seat, so a hosted hero heard the ungated lines only. The journal row now carries what the conditions read (`JournalW.sq`): the seat's held quests with their standing and field leg, the run view of the named ledger keys (the world's run ledger under the seat's own quest keys, `questRunLedger`), the account view and the named features through THE SEAT'S GATE (`gateAccountOf`: the shard's account today, the seat's own once M2 re-points the one line), and the account level while a condition reads one. The key list is derived from the dialogue data's conditions at its first read (`spokenReads`), never a hand list: only a key a condition names rides, and a row with nothing in it rests like an empty journal. `questDialogueView(world, seatId)` is THE ONE RESOLVER the dialogue director evaluates through (the World builds its director over `spokenDialogueHost`, so the director's source stays the foundation's pinned original): a hosted world's shell answers its own seat from its newest journal row (nothing held before one lands) and keeps every other read its own (a local receipt, the hero's place, a fact's world state); solo, the co-op host and a co-op client get the World itself (THE SOLO DIGEST). The speech focus the renderer drives each frame beside `pollClientCounters`, `npcDialogueReachable` and the reward check all ride the director, so every client road to an authored line reads the seat's own state. `NPC_APPEARANCES` never ride: a look is one body every hearer sees. THE CALLING PER SEAT: a secret vocation site tests every standing player seat's own body (THE ACTING SEAT's toucher law; the keeper's parked body never discovers) and the discovery is the seeker's: its own ledger's key (THE CHARACTER'S QUESTS, mirrored home), the account copy its run's end would have paid, through its own gate, and its silence or its calling on its own note row (`SeatW.fn`). A hosted seat's linger at a giver with a fresh calling on offer asks its own menu once per visit (the solo dwell's one request): the ask rides its journal row (`JournalW.voc`: the ask's world time and the cards, read for the asking hand's class), its client opens the solo menu off the row (`pollClientCounters`) and the pick comes home as its own `vocationQuest` word; stepping away ends the ask. THE OFFLINE HERO'S GROUND: the world save's claim read only the standing heroes on its write side and the keeper's own log on its resume, so a quest's event ground (a special arena) fell at a restart and the hero's graft dropped the quest. The vessel desk notes each vessel's held event ground at its mirror and its leave (by hero, wall-clock stamped), and the keeper's World publishes every hero's ground into the save's overlay bag (`QUEST_GROUND_LEDGER`, `:questGround`) with THE ZONE-CLAIM CONVENTION's `ownedZones`, so the transience scrub keeps it on both sides of the save; a resumed ledger stands back up in the desk. A quest ended (the next mirror names it no more), a mortal fall, or a hero gone longer than `VESSEL_CFG.groundKeptDays` releases the ground. The claim is the engine's (world.ts and world/overlay.ts), never the foundation's: the Unbroken Wilds' quest grounds are places, pure functions of the seed, never culled. `SHARD_WIRE_PROTOCOL` 7 (upstream took 6 for the skill fields). `balance/probe_shardspoken.ts`. THE NATIVE HOST (`server/nativeShardHost.ts`) wires the same desk ledger: the native vessel view carries `seatQuests` (the desk's `noteGround` reads it on every mirror and standing leave), the keeper writer's `heldQuestGround` claims every hero's ground through the one `serializeWorldState` hook inside `NativeShardRuntime.capture`'s genuine `serializeCharacter` (no checkpoint schema change; the desk's reads ride `NativeShardSeats`, never the runtime's own door), and a restart adopts the row from the startup record alone (`NativeShardRuntime.startupQuestGround`, the validated `NativeAreaCharacterResume.record` the graph restore reads, never the file again). Original stamps survive the restart, equality at `groundKeptDays` is kept and one millisecond past it released, a refused foreign replacement keeps the desk's completed claim effects with no rollback and no re-stamp. `balance/check_nativeshardground.ts`. |\n| THE SIM UNITS, W1 | `src/engine/shardUnits.ts` (`UNIT_CFG`, `RoadTicket`, `ShardWorldLink`, `SeatPacket`, `SHARD_UNIT_FIELDS`, `pinIn` / `pinOut`, `detachSeat` / `attachSeat`) / `server/simUnits.ts` (`UnitRegistry`, `SimUnit`, `SeatWorlds`) / `World.shardWorld`, `shardUnitHost`, `landSeatAt`, `captureLiveMemory`, `sleepZone`, `atZone` / `ShardTransport.sendStateTo`, `sendZoneToMany` / `ShardSave.run` | M1's first wave (the plan is `docs/design/shard-m1-plan.md`): one World per live zone. THE KEEPER is the World a shard always had (`ShardHost.world`: the chart, the WorldSim, the clock, the account, the world sweeps); every other live zone is a UNIT: a staged World under a throwaway account, booted into its zone with `createPlayer({ load: false })` and its own parked warden (keeper-tagged, invulnerable, untargetable, passive, levitating), wearing the host's published fields (the timeflow policies, the party, `World.shardWorld = { role, key, enqueue, dispatch }`). THE PIN: at every entry into a unit the keeper's world-level fields (the census's alias and counter rows: the chart and the pockets, the memories, the run ledger (the quests and the slate are each hero's own SEAT row since THE CHARACTER'S QUESTS), the once-latches, the notice feed, `nextGenId`) are copied onto it, and at its exit every one the unit reassigned is copied back, so a runtime reassignment in either World is never lost and two units minting in one tick never share a `gen_` id; THE ONE CLOCK pins `time` and `inputClock` in at the keeper's tick-start reading, so every unit lands where the keeper lands. THE PRIMARY GATE (`World.update`'s `unitWorld`, `updateHarborholds`): a unit skips the keeper's world sweeps (the sim, the odyssey, the forechart, the web settle, the omens, the deed recovery, the class claims, the mycelia, the deepwinter reconcile, the bulletins, the mint and ignition drains, the warband arrivals, the warp sweep, the floating zones); the keeper ticks first and drains every world queue, so until W3 splits them a unit only misses what belongs to its own zone. THE ALIAS CENSUS (`SHARD_UNIT_FIELDS`, derived each run by the probe from world.ts): every field whose own container is a string-keyed map, set or record, a WorldSim, a ledger or an account, every field the world save touches (THE SAVE LAW: never per-unit) and every field the gated sweeps write one call deep (THE SWEEP LAW) carries a row: alias, counter, clock, keeper (the keeper's copy is the one its sweeps and save read), host, seat (moved or dropped by the hand-off) or unit with a reason (per-visit, zone-local, memo, seat-keyed, warden-only, dev, shell); a row naming a missing field fails. THE HAND-OFF moves a seat as the same Actor objects, ids kept: `detachSeat` (in the source, under its pin) refuses a held seat or one mid-harvest or mid-trace, ejects a borrowed body, takes THE CARRY SET (the hero and every living, non-construct body whose whole owner chain to it is carried; the rest of the chain is culled quietly, as a zone change drops it), clears the hero's chain now in the controllers that tear down on absence (the companion bond exported whole, assault courts, challenges, attack sequences, guard arts, satellites, auroras, guardians, creepers), purges every flight, field (a toggled one refunded through `expireZone`), band and pending row the chain owns, strips the sources keyed by the source's own counters (domains, auras both ways, altars), releases grips, drops the source's target refs on the court and lifts the seat rows (the ack, the spent presses, the kill tally, companion grants, replenishment clocks, tree buff sources, trace rests, pips, the timers; the lite-tier throng rows are freed and re-spawned beside the hero); `attachSeat` resets the court at the door (the cue arrays, THE BLINK LAW, marks, the retinue's AI and orders), re-binds the status relays, lands it through THE FILTERED HOST (`World.landSeatAt`: the one landing law over a view of that seat and its court alone; 'entry' applies loadZone's back-portal rule to the destination's live exits), installs the rows and re-derives the build. The arrival wears THE SPAWN GRACE for `UNIT_CFG.arrivalGraceSec` (or until its first willed input) and hears its unit's zone message at once. THE REGISTRY (`UnitRegistry`): THE SEAT LEDGER (where every seat stands; a join lands in the keeper), THE HEARTH ALIAS (the keeper hosts the zone it stands in, read live) and THE WILDS LAW (on the Unbroken Wilds the keeper hosts the whole surface and only pockets wake), THE HAND-OFF QUEUE (tickets drained after every unit ticked; the direct `travel(seatId, zoneId)` door serves the probes and the dev lane until W2's roads emit tickets), THE WAKE (the ladder installed, the placeholder hearth never captured), THE LINGER (a unit seatless for `unitLinger` runs the departure's leave verbs, its zone memory captured exactly as a departure captures it, and drops; the hearth never sleeps, a dormant or downed seat keeps its unit), THE SOFT CAP (`maxUnits`: the longest-seatless unit sleeps at once; a wake is never refused), THE UNIT BREAKER (a unit faulting `SHARD_CFG.faultBreakerTicks` ticks running sends its seats to the hearth and drops uncaptured; the keeper keeps THE BREAKER), THE PERSIST CAPTURE (every awake unit writes its live memory row before the world save), and the status page's `units` and each seat's `unit`. THE UNIT WARDEN and THE UNIT SHADOW: every unit's warden stands its flags each tick on its unit's focus seat; the keeper mirrors the highest standing level shard-wide, a unit the highest in it. THE WIRE PER UNIT: each unit ships its own snapshot (one `snapTick` per beat across the shard) and its own zone message (a change, THE DRESS BEAT) to its own seats (`sendStateTo`, `sendZoneToMany`); the party rows are world-wide, published into every unit (beside THE CORPSE ON THE CHART's marks hook, re-published when a refused wilds save replaces the keeper's World); each seat's journal and harvest rows (THE COUNTERS AND THE JOURNAL) are judged in its own unit, and a hand-off marks the arrival's journal so its new zone's boards and pins ride the first snapshot it hears there; pings stay unit-local. THE DESKS PER UNIT: the vessel and corpse desks read each seat's own unit through `SeatWorlds` (a body records its unit's zone and spot, and a pocket leaves none; a pocket mirror carries its companions; THE GROUP LAW's kneel needs a mate in the same unit; THE DEATH COVENANT judges every seat in its own unit), THE DORMANT SEAT resumes with its unit's zone, and THE MERCY stands up a downed Immortal in any unit. THE RUN ROW: `ShardSave.run` persists the keeper's clears, run ledger, throng claims and annex finds, restored after the world half stands (a clear off the chart drops; absent = today). W2 opened the roads one seat at a time (THE ROADS PER PLAYER, the next row). THE SOLO INVARIANT: no sim or co-op World ever carries the link, and THE ROAD-WALK DIGEST of a seeded solo walk (an exit, a cave mouth, the climb-out, a town portal round trip) is pinned. `balance/probe_shardunits.ts`. |\n| THE ROADS PER PLAYER, W2 | `src/engine/shardRoads.ts` (`scanShardRoads`, `SHARD_ROADS_CFG`, `seatDoorOf` / `seatLadderOf`, `shardRoadArrive` / `shardRoadDepart`, `roadDwellRow`, `shardSpotOf` / `ladderOfSpot`) / `World.mouthUnder`, `mouthRefusalUnder`, `realmGates` / `gateUnder`, `wardSealUnder`, `holdfastNear`, `exitUnder` / `exitLockHint`, `isExitLocked(e, from)`, `shardExitRoad` / `shardMouthRoad`, `sealedRoadUnder`, `shardRoadHost`, `netRoadDwell` / `SeatW.rd` / the `waypoint` intent / `ShardWorldLink.liveSeed`, `hearth` / `UnitRegistry.liveSeedOf` | M1's second wave: every road off a zone judged per seat (the catalog is the section below). THE LIFT: the road block's scans (the mouth under a body and a shut mouth's refusal, the realm gates and the gate under a body, the ward seal, the holdfast's parley ring, the exits under a body and a lock's own word) are named World methods the solo block calls with the local hero in its old order, pinned by two road-walk digests taken before the lift (W1's solo walk and the co-op host's walk with a second seat carried along, a sealed door's word included). THE SHARD SCANNER (`scanShardRoads`, one gated call at the end of the road block on a hosted world): every standing player seat holds at most one road dwell, read with its own body and built only while it is idle and unshoved; a finished dwell builds the road's ticket in the source (`shardExitRoad`, travelThrough's twin: the seat's own ladder's climb-out, the far span mouth resolved in the destination, a `?` frontier charted in place, the escape credit judged from the seat's door and paid to its party within reach; `shardMouthRoad`, enterSidezone's twin: the pocket minted in the source, on the wilds the keeper's native mint, the traveller's level for a character pocket, the seat's own ladder one rung deeper), and THE HAND-OFF QUEUE moves that seat alone. Per-seat road state lives beside each unit World (never a World field): THE SEAT'S DOOR (THE RETREAT LAW: `isExitLocked` spares each seat its own edge, so a second arriver from another side keeps its way back), THE SEAT'S LADDER (a seat with none reads its unit's), THE EXIT GRACE (a climbed-out seat on its mouth never dwells straight back down), the holdfast's parley and the words already heard. The intents re-opened: `townPortal` (the seat's own spot, ladder and door are the portal's origin; the dwell enqueues instead of loading and the unit's other seats keep their frame; the way back reads an awake source's live seed), `caravanTo` and the new `waypoint` (the asking seat judged, a render shell's map asks through the intent); THE HEARTH ALIAS lands each in the keeper (its waypoint, else THE HEARTH SEAT). THE SEALED WORDS: the dock, the harbor board's passage, the Wraithsail lying alongside and the Delver's shaft stay sealed (each owns a per-World singleton run), as does a realm gate until W4 builds its road; each says its word once per approach on the seat's own note row (THE ACTING SEAT) and builds no dwell, so no ring. THE ROAD RING (`SeatW.rd`, THE OWN ENTRY): the dwell the host fills rides its own seat's row and a shell draws it (`World.netRoadDwell`). The executor resolves a landing in the destination after its wake, installs the road's per-seat rows there, runs the road's after-word (the escape's word, the waypoint's clear bubble) and takes one road per seat per drain. `balance/probe_shardunits.ts` B (the digests), F and H; the wilds pocket road is `balance/probe_shardslow.ts` S. |\n| THE WORLD SWEEP (THE SIM UNITS, W3) | `World.atZone` / `presentWorlds` / `occupiedAudience` (world.ts) / `ShardWorldLink.dispatch` / `worlds`, `UNIT_CFG.freezeLinger` (engine/shardUnits.ts) / `UnitRegistry.dispatch` / `worlds` / `frozen` / `beginTick` (server/simUnits.ts) / `OverlayView.presentZoneIds` / `censusByZone`, `zonePresent` / `presentCensus` (world/overlay.ts) / `nativeSimView` (engine/nativePopulationResolution.ts) / `WorldBulletin.to` (world/bulletins.ts) | M1's third wave: the world sweeps that drain a world queue and then act on one zone reach every awake sim unit, and the overlays learn where players stand. THE SPLIT DISPATCH: `World.atZone(zoneId, fn)` runs `fn` on the World standing in the zone and returns its answer; solo and the co-op host it is the conditional it replaced (this zone, else nothing), byte for byte; on a shard the keeper's sweeps reach the unit standing there through the link's `dispatch`, under that unit's pin at THE ONE CLOCK's tick-start reading (a frozen unit included: its zone is awake ground), and a call made from inside another unit waits for THE HAND-OFF QUEUE's drain (a pin never opens inside a pin, and the keeper is never entered with a unit's stale alias fields). The registry resolves the World that STANDS in the zone, never THE WILDS LAW's travel alias. The keeper drains each world queue once and dispatches the zone half: warband arrivals (the pack lands in the unit standing in its target zone and nowhere else), the haunt's dawn dissolutions (the fade in the grief's unit), the harborhold lifecycle (the dress, the services, the gate reseal, the in-zone word and the overrun text in the hold's unit; THE MUSTER's pause belt asks the hosting unit's live defense; a hold no World stands in hears \"word comes\"), the deadwake's ebbs (one notice to the seats of every occupied zone within the tide's reach). The keeper's alone, with their in-zone halves left to each World: the world-boss mints (walls, passing, fight sync stay), the Long Night's sky feed, announcements and warp reconcile (the ground, the coach, the pour stay), the quickening's stamps (the materialize beat, the kin pulse, the echo stay), the bounty watch (the slate's reconcile; its holder sweep reads every unit's seats, so a hand is unheld only when its holder left the world). The gloaming's outlasted edge is watched by every World (each floats the word over its own players) and banked once, by the keeper. The bloom's activity map is built once, each zone's engine-local term (theater runs, encounters) read in the World standing there. The bulletins drain once; the war below is heard by the seats standing in its plane (`WorldBulletin.to`, the notice's audience), and so is a demon rift's tearing. THE OCCUPIED LAW: on a hosted world `nativeSimView` reports `presentZoneIds` (every live World's zone, the keeper's first) and `censusByZone` (each one's own live census) beside the keeper's `currentZoneId`; exactly the five readers whose job is never acting on ground a player stands in read them, through `zonePresent` and `presentCensus` (the warband pump's throttle, the deadwake's consume, the faction field's live-census diffusion, the plague's patient zero, the conclave's targeting); every owner-centric read keeps the keeper's (M3's). MANY ORIGINS: the forechart's halo round-robins over the occupied zones, one origin a sweep; the omens murmur to every occupied zone within reach (one whisper an omen, each zone its own bearing over its own player; the reveal reads from the nearest); a floating zone wires in near any occupied zone; the conclave's ignite level reads every occupied zone. THE ACTING SEAT's audience (a line a seat's act caused reaches its party) is gathered over every unit's seats: the feed is one. THE LINGER FREEZE (`UNIT_CFG.freezeLinger`, default on): a seatless unit takes no step and ships nothing through its whole linger, its bodies and flights holding where the last seat left them; a seat's return resumes it under THE ONE CLOCK's re-pin of `time` and `inputClock` (the semantics of a sleep and a wake: the world moved on while nobody watched); a dormant or a downed seat is a seat, so its unit ticks on; the status page marks a frozen unit. THE SOLO INVARIANT: THE SWEEP-WALK DIGEST of a seeded solo expedition that lights every split sweep's event was pinned before the split and holds after it. `balance/probe_shardunits.ts` J. |\n"
        }
      ]
    },
    {
      "file": ".github/workflows/ci.yml",
      "predecessor": "c76f0bae0931b628db71501b4ad06dc92aea94cb",
      "beforeHash": "ea5dab46e932efcf9c46f99d1da34ebd1ca379a9c408d137186e8b6863b09215",
      "afterHash": "1cd864767ef645aa885928f80a5888b7e71bcef6a2bcfe2a7572d202d5c7a52c",
      "crlfLines": [],
      "hunks": [
        {
          "before": "          npx tsx balance/check_nativeperftravel.ts\n          npx tsx balance/check_nativedesktopperfsource.ts\n\n      - name: Probes (green roster, fast lane)\n        run: npm run probe\n",
          "after": "          npx tsx balance/check_nativeperftravel.ts\n          npx tsx balance/check_nativedesktopperfsource.ts\n\n      - name: Retained offline quest ground regression\n        run: |\n          npx tsx balance/check_nativeshardground.ts\n          npx tsx balance/check_nativeshardgroundsource.ts\n          npx tsx balance/check_nativefullgaterepairsource.ts\n\n      - name: Probes (green roster, fast lane)\n        run: npm run probe\n"
        }
      ]
    },
    {
      "file": "docs/design/seamless-world-foundation.md",
      "predecessor": "e7320eca08ab7bf74219f0cba2ed493e9ab4c8e8",
      "beforeHash": "a9469c0cdbeeb233d68d1cb968d0c0094f77de45783f4eeeae224ed91ae637f9",
      "afterHash": "a6624ddf4911c4e8df339c05ced23ad81cc353825d8b2940b0c2c323c0f1c6d4",
      "crlfLines": [],
      "hunks": [
        {
          "before": "\n| Gate | Accountable owner; collaborating lane | Completion evidence | Status |\n| --- | --- | --- | --- |\n| Loading repair and honest CI | Foundation; performance reproduces | Five regressions repaired with original assertions; complete probe gate and four type lanes; older reds individually resolved or explicitly adjudicated. | Repair in verification; full green not established. |\n| Single integration branch | Foundation and shard | Exact-parent conflict ledger, joint resolutions, ownership gate, both native and shard courses, full probe gate; retire old branches only after merged history is verified. | Planned; no merge performed. |\n| Geographic area identity | Foundation; shard tenancy review | Durable place/dimension/instance keys independent of zone adjacency, worker and renderer page; private instances do not share stores or claims. | Open. |\n| Native export/adopt | Foundation; shard W2 | Complete dependency graph capture and reconstruction, exact body state, epoch-fenced commit, unsupported-state refusal and fault cases. | Contract written; implementation open. |\n| Main gameplay/content parity | Foundation; main content owners | Versioned main baseline and feature census; quests, factions, encounters, progression, rewards, services, death/recovery and repeat-event lifetimes exercised through real retained play. New main content enters the census before adoption. | Partial; broad acceptance open. |\n",
          "after": "\n| Gate | Accountable owner; collaborating lane | Completion evidence | Status |\n| --- | --- | --- | --- |\n| Loading repair and honest CI | Foundation; performance reproduces | Five regressions repaired with original assertions; complete probe gate and four type lanes; older reds individually resolved or explicitly adjudicated. | Baseline e7320eca passed local and hosted fast suite 906/906 with zero retries; later changes require their own verification. Slow/excluded lanes remain separate. |\n| Single integration branch | Foundation and shard | Exact-parent conflict ledger, joint resolutions, ownership gate, both native and shard courses, full probe gate; retire old branches only after merged history is verified. | Merged at dd1e95a5 with exact parents 059a0bd1 and ee680532; verified canonical follow-up e7320eca. Old lane refs remain pending coordinated retirement. |\n| Geographic area identity | Foundation; shard tenancy review | Durable place/dimension/instance keys independent of zone adjacency, worker and renderer page; private instances do not share stores or claims. | Open. |\n| Native export/adopt | Foundation; shard W2 | Complete dependency graph capture and reconstruction, exact body state, epoch-fenced commit, unsupported-state refusal and fault cases. | Contract written; implementation open. |\n| Main gameplay/content parity | Foundation; main content owners | Versioned main baseline and feature census; quests, factions, encounters, progression, rewards, services, death/recovery and repeat-event lifetimes exercised through real retained play. New main content enters the census before adoption. | Partial; broad acceptance open. |\n"
        }
      ]
    }
  ],
  "archives": [
    {
      "file": "balance/nativeActiveDescentArchive.ts",
      "normalSha256": "2cc00a0f0582cf2ff5273a2fcadcb4f6d77cfb677d9582112e1e5e5d78adfae8"
    },
    {
      "file": "balance/nativeAdmissionCompositionArchive.ts",
      "normalSha256": "4aa3ecff37b3f7d888299701b65647c0ca2eb4b4a4f46d0999c7c898b57d3b1d"
    },
    {
      "file": "balance/nativeAICompositionArchive.ts",
      "normalSha256": "9d04f472dd7e89ced1738e1f964fafad814366f3f2971649692209731157b14f"
    },
    {
      "file": "balance/nativeAITargetContinuityArchive.ts",
      "normalSha256": "4743046af09dc6112165f47f6b399eec9d1bab644cf5f174a2d2068fbde31e0a"
    },
    {
      "file": "balance/nativeAmalgamationStageArchive.ts",
      "normalSha256": "48528ec62621be10c8fedcd035e32f3fc09b28147201ee5333b1ef5d0ff64f04"
    },
    {
      "file": "balance/nativeAreaMenuArchive.ts",
      "normalSha256": "0cbd9c2d9450dd3d9b653b391a718a8abf308b4d0defad541da08167d973b870"
    },
    {
      "file": "balance/nativeAreaPublicationArchive.ts",
      "normalSha256": "2af6f41679ef425c1a56aa8b837be289d2006ae7057c927e7fe99fc0842efa48"
    },
    {
      "file": "balance/nativeAreaUIActionArchive.ts",
      "normalSha256": "1b22b430fb8a9e5569656e3334b23563c8f2dbacea2bf15948326cc213e073a8"
    },
    {
      "file": "balance/nativeAreaViewQueryArchive.ts",
      "normalSha256": "12eaec6fe7d4de0d49a483dec51765f8a43d23ebfddd43c9aa8b4e2b7d9a8a31"
    },
    {
      "file": "balance/nativeArrivalCompositionArchive.ts",
      "normalSha256": "ef4411ee9b54d9608d2e6c7870e97f7c10328cbdbf5a3d09654b5b0493b9ce40"
    },
    {
      "file": "balance/nativeBirthLifetimeArchive.ts",
      "normalSha256": "321d3adac731c07ab921d65b243b507dbdb090f526fbf8ebfff9049337298a22"
    },
    {
      "file": "balance/nativeBirthLifetimeSourceArchive.ts",
      "normalSha256": "07c68824930c715eb9da12a6e060b39b01048456dbd33c52df7a3dcf4d45fb6c"
    },
    {
      "file": "balance/nativeBountyArrivalArchive.ts",
      "normalSha256": "37575f470131363aa00d387ab5f6b6707aed2dc740f441859d6b5bc6e48ffe5b"
    },
    {
      "file": "balance/nativeBrowserEntryCompositionArchive.ts",
      "normalSha256": "0c432b547b9aad768a2c950d7c9c9f080cca2e24b647a4755dd9d56c6f0e3918"
    },
    {
      "file": "balance/nativeBrowserHostedCompositionArchive.ts",
      "normalSha256": "00627e3c5c66e35bec3be42d0afac343a8335ef75d5ebaea31f1e8b3c31582e6"
    },
    {
      "file": "balance/nativeCampaignCompositionArchive.ts",
      "normalSha256": "435834a0d1ef0bfcebb3bcb35d328ac5c488e1d2cfcd456305c24de598ba460a"
    },
    {
      "file": "balance/nativeCanvasReleaseArchive.ts",
      "normalSha256": "be35c2be7d3c25a12e0c12e52c1e4f8b0728bc48c3368af67dcc34889393b6e7"
    },
    {
      "file": "balance/nativeCaravanCompositionArchive.ts",
      "normalSha256": "3b17477db84246c21cd0c72aa1135e3776502f4480fbc77ad004bd8ae826ccb4"
    },
    {
      "file": "balance/nativeCaravanExtractedReadArchive.ts",
      "normalSha256": "bf891b3e2e85efb447bf2a6c2d16981d75dc9ca67e8f96ffa5571ad77be40ea0"
    },
    {
      "file": "balance/nativeCaravanNewsArchive.ts",
      "normalSha256": "c3bf9d38e69cd006feb52d4a208591486b2ad7aacbb87b5c6c3f7324c00bf37f"
    },
    {
      "file": "balance/nativeCarriedAdmissionFinalArchive.ts",
      "normalSha256": "48e5501c1cf3fb9c691c5c2b15ea946c95e7e42b2d2d887be4941c37ff10ad32"
    },
    {
      "file": "balance/nativeCarriedControlArchive.ts",
      "normalSha256": "a734e47ca7548e045b428221b03bce6c69ee167b68f58b67fd931597bcd36f66"
    },
    {
      "file": "balance/nativeClientConclusionCompositionArchive.ts",
      "normalSha256": "1c70e2bc5319ab015c52af1a950129a4a219097cc527fb5fa5de85221db07b41"
    },
    {
      "file": "balance/nativeClientContinueArchive.ts",
      "normalSha256": "0e4091d7c095fea24ec6e36d57f42118f856915721fdbbf1816e60f1296f4fb0"
    },
    {
      "file": "balance/nativeClientContinuityCompositionArchive.ts",
      "normalSha256": "acc61c797fa225b7760a6d2e1792d036db8eaf4fc760f4a9857cd3a1fdeac945"
    },
    {
      "file": "balance/nativeClientMenuCompositionArchive.ts",
      "normalSha256": "efd75a960bcc25da8cad27d8d5f0cb19132f60e0f07ac7b14b856b73f72de496"
    },
    {
      "file": "balance/nativeClientPublicationCompositionArchive.ts",
      "normalSha256": "e5a371c6b597b3d287e40633c221d921778088537156d27f9eb6916fbb96b34f"
    },
    {
      "file": "balance/nativeClientRuntimeArchive.ts",
      "normalSha256": "f2cc42ac508a641419bd762bca04c1b5376432570cf2fb8ece8f1b2b9ad6f30a"
    },
    {
      "file": "balance/nativeClientStartActionsCompositionArchive.ts",
      "normalSha256": "c396defb8e4c12c908481365c387877eadf21c325015949b53aebf20511c40e1"
    },
    {
      "file": "balance/nativeClientStartArchive.ts",
      "normalSha256": "f6d4685b778c1f0bfa5123a9ce6cb8ccf7fb52cbec978c4035265f151945345f"
    },
    {
      "file": "balance/nativeClientStartMenuCompositionArchive.ts",
      "normalSha256": "082eec02642c97233e58f9559a80792e81d4580c5437b46582973f6a591be9a1"
    },
    {
      "file": "balance/nativeCombatLeafVisualArchive.ts",
      "normalSha256": "bdb7b256c80fb2b3ae391cce76c70504506523c85b50f1e1bf3ca8092687f505"
    },
    {
      "file": "balance/nativeCombatPresentationArchive.ts",
      "normalSha256": "423d2ae8c65f92c34820c457fa666cd24dbec865127c6a163b24296ea1da315c"
    },
    {
      "file": "balance/nativeCompilerPlatformReceiptArchive.ts",
      "normalSha256": "f8d389a09bbcd3438f089bd6d50a333f87d01fc5dac32d31f04f5c1fa40d02a4"
    },
    {
      "file": "balance/nativeCompleteBirthArchive.ts",
      "normalSha256": "f30b214f0695f6121e0ec503f399af0a908975efb5520502c0baf47a3655f206"
    },
    {
      "file": "balance/nativeConclaveCompositionArchive.ts",
      "normalSha256": "48a1c1497986350fb1a5e0552684b5a607964325c0f72be5df9dde5c66d2f6bb"
    },
    {
      "file": "balance/nativeContinuityCompositionArchive.ts",
      "normalSha256": "fd76bb64e449e2b7401f62cb87effacf74966e8bdc585237c01996beea084405"
    },
    {
      "file": "balance/nativeConvergenceRepairArchive.ts",
      "normalSha256": "b9b71e137161348e2051aa5069b9c8bba2d7e5d9be84adeda1af15b18ef04598"
    },
    {
      "file": "balance/nativeCouchJoinLifetimeArchive.ts",
      "normalSha256": "322372701694276912e31418a83547b0903aa67c00f65aa0c7b3f22095ae619e"
    },
    {
      "file": "balance/nativeCrusadeTerrainArchive.ts",
      "normalSha256": "f093dfdad3fbdec6eabfb1471b246a52d372b7ec95e36cface0c5497cbe80f16"
    },
    {
      "file": "balance/nativeDelayedArrivalSourceArchive.ts",
      "normalSha256": "0e3542f31ff53651d5508f626e0367ba966e05d77791364170ae551238f3289d"
    },
    {
      "file": "balance/nativeDesktopPerfArchive.ts",
      "normalSha256": "2cb79307ec1fb32f4c0598681cec065fc46cda019295375d86ad7b6e4cf12833"
    },
    {
      "file": "balance/nativeDimensionCatalogArchive.ts",
      "normalSha256": "8d1c7d5bd6139cc1f5cb9bbd48560401e0ab88a742569cf3e09f17865679d107"
    },
    {
      "file": "balance/nativeDirectorBirthSourceArchive.ts",
      "normalSha256": "0038617d587101a650b2dadd757a1befd4263fa5e3635523a318f215afa8e112"
    },
    {
      "file": "balance/nativeEncounterArrivalSourceArchive.ts",
      "normalSha256": "6e8047eaa9ca5b269a1ba67822d18d885fcc7196d8e849c130decc09b554b3ed"
    },
    {
      "file": "balance/nativeEncounterInsertionSourceArchive.ts",
      "normalSha256": "9b35ac0c14cdac1a751c87a0d7b0a936e02d3352bcdf24585776d0f128c503e6"
    },
    {
      "file": "balance/nativeExactAnchorArchive.ts",
      "normalSha256": "b284b8a270d8db0c69cff2104e4e503ff791c99a2c8963e2525629bfeb78b49d"
    },
    {
      "file": "balance/nativeFractureCompositionArchive.ts",
      "normalSha256": "2feba0bba34ebfe31fa6979d4c223b392fdf04d78d548471a0863a4bb68c3eb6"
    },
    {
      "file": "balance/nativeFrameContactSourceArchive.ts",
      "normalSha256": "c75a7696e3a5e0097caeb6ce19158840f113b2ca0882d3c2a1c803e66c0edceb"
    },
    {
      "file": "balance/nativeFramePhysicalSeatsArchive.ts",
      "normalSha256": "2fe68045e1da5b1651b28d00d3819afc1b753506f15b798769436fc6760f24db"
    },
    {
      "file": "balance/nativeFullGateRepairArchive.ts",
      "normalSha256": "f1e63e5a9476c14ff847e21e0800e79ce0a62185e2a5172b167e0671ec81c19d"
    },
    {
      "file": "balance/nativeGraphArchive.ts",
      "normalSha256": "3d4391ed68d981594de329fe47620929953308584da7bb6801fdf5c72e6ed84e"
    },
    {
      "file": "balance/nativeGroundCurrentSourceArchive.ts",
      "normalSha256": "0dab06bf2a2e8030ad4687fe8e28ce6bb822df036af049cfc0e165645fbbbba5"
    },
    {
      "file": "balance/nativeGroundFollowUpsOwnerArchive.ts",
      "normalSha256": "f68e036be0fa1dd1adeed16e901d8cf13b210d4ce15d36611f361bf0b8d3d51b"
    },
    {
      "file": "balance/nativeHarborArrivalArchive.ts",
      "normalSha256": "187b2fcd938e020a007e625b7067a79417b147cc71c4c9c1c894bb5d25b49842"
    },
    {
      "file": "balance/nativeHarborServicesArchive.ts",
      "normalSha256": "4cea3e4ab48004810401c6383ecf7fe0aba47d5bcd2a40f68084528147ead2a8"
    },
    {
      "file": "balance/nativeHistoricalCleaveArchive.ts",
      "normalSha256": "baecb1b47520fae584f6e7f1f23e8a8cb155040aec49c7c75a335642f55b7ecd"
    },
    {
      "file": "balance/nativeHistoricalConcealmentArchive.ts",
      "normalSha256": "1749618f0aab8fb81bdc6fa982bf4a5176f945fd853913fd7052cc3f2c28f53c"
    },
    {
      "file": "balance/nativeHistoryArrivalArchive.ts",
      "normalSha256": "04b08574d23dd360dd6dfbc20fc3a9b7764f75e7a86c8c14780c657fe53ba450"
    },
    {
      "file": "balance/nativeHostClosureArchive.ts",
      "normalSha256": "9c79682e31cc6f743c25799e376668742526a9714fa0d1484962001ab6f4114e"
    },
    {
      "file": "balance/nativeHostedPublicationArchive.ts",
      "normalSha256": "8eaf39d21fd8a54a6d1f600c1fff912913e2ed3e14ca58a0591969aade473858"
    },
    {
      "file": "balance/nativeHostPerformanceArchive.ts",
      "normalSha256": "fa23475869c4d5a204aeeb45edfc8b16973e9db8541cf5196587681fe4a76607"
    },
    {
      "file": "balance/nativeHuntMigrationArchive.ts",
      "normalSha256": "be9e859a9ef5713ee23cb06d7dc715debdd48eccec9e3484811ef9ff8413d1d5"
    },
    {
      "file": "balance/nativeInstalledSourcesArchive.ts",
      "normalSha256": "5a7edcd9e8696e6a1387fdc120309e9be1cbbc50deb373584c1c14ced9629b16"
    },
    {
      "file": "balance/nativeJourneyCompositionArchive.ts",
      "normalSha256": "ad8a0fd9aa37cf34b9e29f73fe168735dc8cd88d0ab53bc21402b816c16c5e07"
    },
    {
      "file": "balance/nativeLegacySourceRepairArchive.ts",
      "normalSha256": "25e8f1034399e80b7174a140b0f8206d8b451f7d084e13a7a41391e31a6d696d"
    },
    {
      "file": "balance/nativeLiveSiteArchive.ts",
      "normalSha256": "fdf1af8f0add679d6787112999272e4126fe7afd9ee9432b2b89c30a4c5b57b8"
    },
    {
      "file": "balance/nativeLoadingResponsivenessArchive.ts",
      "normalSha256": "3417fb2ef0ab8bcdd536b1a45adb448d091b6a5e9f411bfea0ddf60ad356ff90"
    },
    {
      "file": "balance/nativeLocalInputArchive.ts",
      "normalSha256": "b4def88aa507c45fa70882fbd4d08cce9e8f8bd4b6a491e617427d2dd04f355a"
    },
    {
      "file": "balance/nativeLocalInputFinalArchive.ts",
      "normalSha256": "4cc21d1012b1b0fc6dc8a3aa99bc635602048d0399fb1c115e571cc1707cee4f"
    },
    {
      "file": "balance/nativeMainCastSourceArchive.ts",
      "normalSha256": "fa34fce7eed513ec0394bcf5dca88fa68fe2df1ddaa6baa259e97a5984e118fe"
    },
    {
      "file": "balance/nativeMainContentArchive.ts",
      "normalSha256": "884c762fa9a0c4b54c0dd23185053763bab9d09aeed762bef55de0607f386604"
    },
    {
      "file": "balance/nativeMainHostCompositionArchive.ts",
      "normalSha256": "ce8cffeb63107d1cbb8a098ce55975beb27440a2afe0d7f92d29182be50e8c84"
    },
    {
      "file": "balance/nativeMainProofSourceArchive.ts",
      "normalSha256": "e946f50eaca9e98baea655f6b224bcbc4cb24dd1603a8370b296866c906bf441"
    },
    {
      "file": "balance/nativeMainRosterCancellationArchive.ts",
      "normalSha256": "7ca74e59120fcb55d685c89caed580a00430a195834c1df2d255a64e5baa9726"
    },
    {
      "file": "balance/nativeMainVisualSourceArchive.ts",
      "normalSha256": "336b4c66cbcbab84ef987cb559176fc62766da79943b32afe7a4c0c999e5e49d"
    },
    {
      "file": "balance/nativeMergeSourceArchive.ts",
      "normalSha256": "5e58ee5acba68c3f1493f53933b957ee766f9c339cb4c6bb4e59748d818ac7eb"
    },
    {
      "file": "balance/nativeNearScaleSelectionArchive.ts",
      "normalSha256": "536e486c5ebc7298de5072a93311b5bf98fec9e34b285197a2ae6c39a68f86c5"
    },
    {
      "file": "balance/nativeNemesisDepartureArchive.ts",
      "normalSha256": "4a5608bb4d572ec0bb08950c1408850465c86f9ba189c7d4147bc64c41d68e9c"
    },
    {
      "file": "balance/nativeOdysseyGroundAdmissionArchive.ts",
      "normalSha256": "9095fec65c4a2d8d90f9f2d3e8f59dfe265423bcf79c3d1fb79bd738dec82a92"
    },
    {
      "file": "balance/nativeOdysseyGroundArchive.ts",
      "normalSha256": "67ea0e0685bc04f90d1b978f5cb2b35a2b000dbd208772684e0db801d6eb1223"
    },
    {
      "file": "balance/nativeOdysseyHistoricalRescueArchive.ts",
      "normalSha256": "525e6dc6efa6c44ce16c7aa3c2c69a975fa4ae065cb61192bd276fd8296a57b4"
    },
    {
      "file": "balance/nativeOdysseyPressureArchive.ts",
      "normalSha256": "e106ad853f6a1a7328257860ad7caf363c24c8638c041ec894002897143ddfc1"
    },
    {
      "file": "balance/nativePartyArchive.ts",
      "normalSha256": "fd369d0b5060b2dfbd72e9e0c240c64d44915e09a6864976ccfbb456cb52b582"
    },
    {
      "file": "balance/nativePartyDeathArchive.ts",
      "normalSha256": "0c46f7d7e1add36add8a5c2303874b651bf4eeacd4e0f1ee754c52a4e89c981d"
    },
    {
      "file": "balance/nativeRealmContextArchive.ts",
      "normalSha256": "49c0c7a42e044f4cc03fe1dbfe695147675bbabb3c49ebe3d67a4a8f32621da6"
    },
    {
      "file": "balance/nativeRepeatEventArchive.ts",
      "normalSha256": "1c87579238125a790b59f430894d4786e9675927e3b099637713536ebef159e8"
    },
    {
      "file": "balance/nativeRescueAnchorArchive.ts",
      "normalSha256": "6572686b759dbbfb11f9dceee3fd72ff0236ad5b6b839091779a18b4c4bf5c05"
    },
    {
      "file": "balance/nativeRunConclusionArchive.ts",
      "normalSha256": "bbf69496104381ec9ffddc595831dc0686c3f0eb2b777d1b9097f93f8f6f920d"
    },
    {
      "file": "balance/nativeRuntimeBirthLifetimeArchive.ts",
      "normalSha256": "029c67b6bde5b515ec7a0e9557c6e5c44ec6eee6a8d429f7ed5d9304104c05e0"
    },
    {
      "file": "balance/nativeSaveWriteOrderArchive.ts",
      "normalSha256": "5899d18582e5a49d0b0f715a786a1d2c5801494998d25650b5a80d0d51d52b14"
    },
    {
      "file": "balance/nativeSceneAIArchive.ts",
      "normalSha256": "f4dd09eac0657d3ddc4ae5a36d90ebea962e88a3449d6746cb2dae18840bac7a"
    },
    {
      "file": "balance/nativeSceneCampaignFrameArchive.ts",
      "normalSha256": "543717c09b80875cb8f4c442120822f7a988630c508af0ac3f1531103a4970ad"
    },
    {
      "file": "balance/nativeSceneCampaignFrameAttendanceArchive.ts",
      "normalSha256": "4a2bdaaa534acaed565d04de385a9e116fe82bd6f48437b11e1b8680b5e83fd1"
    },
    {
      "file": "balance/nativeSceneCampaignFrameClosureArchive.ts",
      "normalSha256": "71cdc0f7a8e7d2aa674192274cbb2a41ff3125a4ef777e644ae6d03c92fb02eb"
    },
    {
      "file": "balance/nativeSceneCampaignTransitionsArchive.ts",
      "normalSha256": "d31a54e6c7177bf34df06c24aa1d184e018040f316680ece489212cae82a89da"
    },
    {
      "file": "balance/nativeSceneCastingPreparationArchive.ts",
      "normalSha256": "775a8850f3e03bb1b2a04fc3980f849c8073fb5c0866ac1565ff7aaeb8325b11"
    },
    {
      "file": "balance/nativeSceneCastingPreparationIntegrationArchive.ts",
      "normalSha256": "fe13fe988faedcac419c360438f845c521e7657c19651cecdc03fe993aa6d41a"
    },
    {
      "file": "balance/nativeSceneCombatCampaignArenaArchive.ts",
      "normalSha256": "192c5e134436bf3f628a60e7b5ed3dceb1e749e4d124c22b0a8c7c94c1a58160"
    },
    {
      "file": "balance/nativeSceneCombatHooksArchive.ts",
      "normalSha256": "e31a353e03e6e2ff16a18bbeb1b10b635d79f1661b48273cbb921a30bfcdc52e"
    },
    {
      "file": "balance/nativeSceneCombatKernelArchive.ts",
      "normalSha256": "bada0545f79d050bdb7e44bc5494348900acd334132550bb10517dd42d66e8af"
    },
    {
      "file": "balance/nativeSceneCombatMotionArchive.ts",
      "normalSha256": "e6ae0fa37ac1486d27efbcf9cdc272d6e1d2741709edfa6c9675c67a5ad1c69a"
    },
    {
      "file": "balance/nativeSceneCombatMotionHooksArchive.ts",
      "normalSha256": "dcd7676dfb0c3e9c89bf2ecb3dee5f61254637863327ea1df2a81cf2302ccc50"
    },
    {
      "file": "balance/nativeSceneCombatRecordSelectionArchive.ts",
      "normalSha256": "7437942fcc35bd859e0971c5934e4ad2663f341a729c0f9d166a12d395cc1a86"
    },
    {
      "file": "balance/nativeSceneCombatStateArchive.ts",
      "normalSha256": "ee2bc2ac3e89fd71d0eeed3d71ea5d8f83b4eb031c28d4133b2b7c61501c31df"
    },
    {
      "file": "balance/nativeSceneCombatStateIntegrationArchive.ts",
      "normalSha256": "7a8d0cb4acefe258a20e6b7822c932575ca6f21dc93913275e5d286b95871b22"
    },
    {
      "file": "balance/nativeSceneDefensePreparationArchive.ts",
      "normalSha256": "002e8c43fc805b7d3118f6f4ef1f55842a44b43590a939c5085f19981355837f"
    },
    {
      "file": "balance/nativeSceneDefensePreparationIntegrationArchive.ts",
      "normalSha256": "a62d978ae87d9474300403b5ee3aeb0db71877a04431868ec8d295f90aa91e02"
    },
    {
      "file": "balance/nativeSceneDisplacementArchive.ts",
      "normalSha256": "2891a29ea0ce99886e7ef9c36fc09a161ae597a10c0ba9a0052eb7ef0eb7f01a"
    },
    {
      "file": "balance/nativeSceneDisplacementIntegrationArchive.ts",
      "normalSha256": "b6c8afe0407a70b152fb1e7b37cbe016aa28b73f0cafa5bc1fd09c9951f3f8c2"
    },
    {
      "file": "balance/nativeSceneFrameArchive.ts",
      "normalSha256": "01134266002591568b9eabbbba6cb7dbe78602cf6481399331306e2b15dc2bba"
    },
    {
      "file": "balance/nativeSceneFrameAttendanceArchive.ts",
      "normalSha256": "6d3888269abd37eaf98165b0cc0248de83290971e1d5ea5f30c93378c4dcae71"
    },
    {
      "file": "balance/nativeSceneFrameCallbacksArchive.ts",
      "normalSha256": "19419cf13a54dca4e5e4420821645c957d45d0ab33a765e053cb35b4268844f0"
    },
    {
      "file": "balance/nativeSceneFrameClosureArchive.ts",
      "normalSha256": "d690f559cbfaf25045c37fae7058b22a86bdc955e18e39478f2c334a27f47c58"
    },
    {
      "file": "balance/nativeSceneFrameHooksArchive.ts",
      "normalSha256": "a874f9baafd85fa93e6f32272db2d3e18bfb16384df595d7f4d9b8eebd75e4b5"
    },
    {
      "file": "balance/nativeSceneFrameInterfacesArchive.ts",
      "normalSha256": "27cf07963bb4ea796de4217b8492a62cc07cdcb6fd9ed3a9955f4ae6c255dc77"
    },
    {
      "file": "balance/nativeSceneGroundFollowUpsArchive.ts",
      "normalSha256": "ac1e1765be90f0c04dc3a63f953f6b1dac664126f288ddf2e63b85835949e31c"
    },
    {
      "file": "balance/nativeSceneGroundFollowUpsIntegrationArchive.ts",
      "normalSha256": "f25d81b6680f7bc27391f5504d2bcd2cfa0d43d60fa6f35d0240faa5fec4b2d8"
    },
    {
      "file": "balance/nativeSceneInputArchive.ts",
      "normalSha256": "bef0e227ade30b6e4f64f6a10d22ce35ee56d2ed8cf5a4b34dc2270666b7e3b1"
    },
    {
      "file": "balance/nativeSceneKillAftermathArchive.ts",
      "normalSha256": "1ee10922ff568ef7f8537e9628298a4b69c3572d8534f209ce1ad7907fe80cf8"
    },
    {
      "file": "balance/nativeSceneKillAftermathIntegrationArchive.ts",
      "normalSha256": "b94e4d71694bee1bb2cd54c3a63c78c2d63dfab37f6d8a80c5cc5f7a35a8c7c7"
    },
    {
      "file": "balance/nativeSceneLootArchive.ts",
      "normalSha256": "c0aabffe690bd6c005f120b0305ad0544d09a113d94aaa0ac480ac5fa40dda20"
    },
    {
      "file": "balance/nativeSceneMemoryArchive.ts",
      "normalSha256": "184ccb97a58023fcf20eda1d47a40ae6a4e712baffa75f840f6609aa1c11ab5e"
    },
    {
      "file": "balance/nativeSceneObjectiveCompletionArchive.ts",
      "normalSha256": "b04f297e8543a496cb9df061640468d6659eb3d231db1695b250010128373cbe"
    },
    {
      "file": "balance/nativeSceneObjectiveWatchingArchive.ts",
      "normalSha256": "4cb5018b6f09bdd280a4df5e6087f18a31f8a2aa738ff9eda67104ccc3ea232d"
    },
    {
      "file": "balance/nativeSceneProgressionArchive.ts",
      "normalSha256": "25f3b69b5556b78c055c51cebc17cb4170084560b3b6fc503179249ade2d6a7f"
    },
    {
      "file": "balance/nativeSceneProjectileArchive.ts",
      "normalSha256": "4b693049351d73abd8b089ef37099e976373b301d4e294b5750c863648bf9b33"
    },
    {
      "file": "balance/nativeScenePuzzleArchive.ts",
      "normalSha256": "62f45e38950127f15c455e9ec99c3c54a30fd0e6f561ba4e97844f84a9ae0443"
    },
    {
      "file": "balance/nativeSceneQuestArchive.ts",
      "normalSha256": "b482df1bf726a1266f209ddf9ffc4147709c85885f3c0608c834a52ca4e0f12c"
    },
    {
      "file": "balance/nativeSceneQuestAuxArchive.ts",
      "normalSha256": "e869b8942bfb68eb0dfe3607f8c10290bdc926dab40515e83ce5534af20ab04a"
    },
    {
      "file": "balance/nativeSceneQuestInteractionArchive.ts",
      "normalSha256": "d747716c8691d549afe58302166dcc599bac1610d00e147933b3db194ba66062"
    },
    {
      "file": "balance/nativeSceneRestorationArchive.ts",
      "normalSha256": "a859c1c5558b2844645adff7ffc6f5e4882eed47dfc3dd8f41fb903776eef1b0"
    },
    {
      "file": "balance/nativeSceneRestorationIntegrationArchive.ts",
      "normalSha256": "334adceb41233a58f307c9497ddf850dca5ecb34020b28d9c70c6ef53c03e36b"
    },
    {
      "file": "balance/nativeSceneSummonPreparationArchive.ts",
      "normalSha256": "0caa0ae9bb250bea4c8a39b52e8baa2f3a2b712ef6063a46c0aa0b2900981c3c"
    },
    {
      "file": "balance/nativeSceneSummonPreparationIntegrationArchive.ts",
      "normalSha256": "0646c173036fe44562900ae35f740bdbabaaf236f6364e2c5260c2f5ccdbddca"
    },
    {
      "file": "balance/nativeSceneTetherArchive.ts",
      "normalSha256": "4fcf252ff97bed0954e2b0557a0b6ec310932f9047da336c916fab6ca897b101"
    },
    {
      "file": "balance/nativeSeamlessConsolidationArchive.ts",
      "normalSha256": "cd887e3ff558e684038a23ebbc64d6a436eab6ccccf88bc3a518031ff467ef9d"
    },
    {
      "file": "balance/nativeShardEntryLifetimeArchive.ts",
      "normalSha256": "1dbbf8def17126a7c530c862be8102e6ae103933cc6d56d4e62924a4abf683aa"
    },
    {
      "file": "balance/nativeShardFoundationArchive.ts",
      "normalSha256": "831898e76223802e8461fc15c2ab7b1bb057a55a825ac75bd2b243bec80ce17f"
    },
    {
      "file": "balance/nativeShardKeeperArchive.ts",
      "normalSha256": "a08f2ed82646d930961c296de3ce0c6dc5be0b02d209f311c5d7c6702d308518"
    },
    {
      "file": "balance/nativeShardKeeperCompositionArchive.ts",
      "normalSha256": "418acd51a60e2a991306fd874ef2a232490ba0c7b457f466bad6441bae10b4b8"
    },
    {
      "file": "balance/nativeShardMusterArchive.ts",
      "normalSha256": "1772daf966a45349a58c7e031d6eb5821091cec01f5dac89d64f673942a68837"
    },
    {
      "file": "balance/nativeShardProbeDeliveryArchive.ts",
      "normalSha256": "cb71b3250ecd21d7a0cc327583337dbb57a72bb36b304aaf08ab9a5733880b8c"
    },
    {
      "file": "balance/nativeShardPublicationArchive.ts",
      "normalSha256": "62a682cd93bc277f5950c2d3687825367e2ff93fe9a814eba61a20f2e0eebbc4"
    },
    {
      "file": "balance/nativeShardsCompositionArchive.ts",
      "normalSha256": "7b0b7ebc7b157a5413a4c0be69bd6c52163c665de5d7f07a65811ec9380d463b"
    },
    {
      "file": "balance/nativeShardSeatCompositionArchive.ts",
      "normalSha256": "1c1646e1eb1c61e459ea000ba8ac96ac386918703a7a1bfa2bc0e0c7350c0b01"
    },
    {
      "file": "balance/nativeShardSeatsArchive.ts",
      "normalSha256": "04fc1d4fab7a737b6f184fba895dbfe450db370288525c0d83de20539f8a589c"
    },
    {
      "file": "balance/nativeShardsLegacySourceArchive.ts",
      "normalSha256": "87f3b4efd01a469b5f0a582966e765c161ed0237b82ca7e129e1ac00a32ff8cd"
    },
    {
      "file": "balance/nativeSidezoneFurnishArchive.ts",
      "normalSha256": "66fbe4c4d9b0a998e7c2365237814be3376aad3c2576cb6b20dad769cfbdbc75"
    },
    {
      "file": "balance/nativeSkyArchive.ts",
      "normalSha256": "f0425ccfee92ddb795a0e2a946210c4af96f09543d9908c0b2dfe7eb073e745b"
    },
    {
      "file": "balance/nativeSummonAsyncBoundaryArchive.ts",
      "normalSha256": "e5b2b531a4c2bc951669a6ccf22dfcc12c8037192f79217e4c2effd021b5435b"
    },
    {
      "file": "balance/nativeSurfaceArrivalOrderArchive.ts",
      "normalSha256": "f3392161a4cc2b6028e82872ead8773503f9f440db0e6247df777ea8ac73bb0f"
    },
    {
      "file": "balance/nativeSurfaceArrivalSourceArchive.ts",
      "normalSha256": "febe4557c8c691b214766b4654d6bfaf88c4db763f9ef9c4ccfdcf06c81875d0"
    },
    {
      "file": "balance/nativeTitanAttendanceArchive.ts",
      "normalSha256": "1b7079001974f57cbe2f810da64ca5cffdaf3045e48490f5dbc74879f091d1d8"
    },
    {
      "file": "balance/nativeTitanReceiptArchive.ts",
      "normalSha256": "4df613a4eaef0b299c2949cb47fe8dcb7676fe14367f1f8f3e17704d5c1192cc"
    },
    {
      "file": "balance/nativeTownClientCompositionArchive.ts",
      "normalSha256": "14ec4f631c5dc08c78514472c721a34ed2b3b1be978b52f12939d696a86bea1b"
    },
    {
      "file": "balance/nativeTownConclusionCompositionArchive.ts",
      "normalSha256": "b6727accddc426fb52bdcc62a85703a89a100233be2e144c3f9de98be311b3ff"
    },
    {
      "file": "balance/nativeTownFreshFoldArchive.ts",
      "normalSha256": "3008a5027ed9a90a1d0d7457b498b2c111e116d129fc3dd4d4764e1cb176784f"
    },
    {
      "file": "balance/nativeTownLocalInputCompositionArchive.ts",
      "normalSha256": "30263bc28d23f49f4dfc1487be37eec302e49b26409602310fbe2fb9b2271da8"
    },
    {
      "file": "balance/nativeTownStationArchive.ts",
      "normalSha256": "1726a5c367697a8f7ca8600231976c49631242353e74faf8709b3dda9d0629d4"
    },
    {
      "file": "balance/nativeVendettaCompositionArchive.ts",
      "normalSha256": "b9dd6eb5354813c5fe9fd02cedc0b9420e6f82b47c9870ff150c9c4080c6dcc6"
    },
    {
      "file": "balance/nativeVoyageTransitionArchive.ts",
      "normalSha256": "66a6df59a10d0008767dcf40f93f4a17d72483f0da65681da9bffa7f7fd688ac"
    },
    {
      "file": "balance/nativeWarlordArrivalArchive.ts",
      "normalSha256": "035058712b0aad13a58f776fc855cd279c2cc2409f897f606860212f82c142b8"
    }
  ],
  "current": [
    {
      "file": "balance/nativeShardGroundFixture.ts",
      "normalSha256": "47ee521a0a020690a9febaff3038d9461aa6aa795f102e833046c5fe2e1669f6"
    },
    {
      "file": "balance/nativeShardGroundFS.ts",
      "normalSha256": "e2cd5d6201babd94f21dbdb587bd90174be833ebcf2a52980d2ababf98088682"
    },
    {
      "file": "balance/check_nativeshardgroundsource.ts",
      "normalSha256": "c6e4f5831f14afa234970cbbc030c4d149bf25a98dd15671b0d76889db58d930"
    },
    {
      "file": "balance/nativeDesktopPerfFixture.ts",
      "normalSha256": "03148f2354f1732a03e06b2ec8e02f69b8917576ace07d1a8d970fe5d0efe3ff"
    },
    {
      "file": "balance/check_nativedesktopperfsource.ts",
      "normalSha256": "1aedcb3484ac7d90f8fdd0594e30eca77f2f3211a4acd4956ee21a86f69ba53a"
    },
    {
      "file": "server/nativeShardSeats.ts",
      "normalSha256": "59a73b3ee6a8814e089ecbadd4c9f84130a9cec93766b29f3c4743d8411f9f0f"
    },
    {
      "file": "server/nativeShardRuntime.ts",
      "normalSha256": "f91fb914c7c88804d6b99412675638b6b4649e42e65141de5dd3ecf43ceb4997"
    },
    {
      "file": "server/nativeShardHost.ts",
      "normalSha256": "369860c9b2277d647faf5206f2c87c4c56fcaaa1549b700fb804d317b092ea16"
    },
    {
      "file": "balance/check_nativeshardground.ts",
      "normalSha256": "d08d060175313279a9dacacd094feba9808c873d26e2bcdcb6e18969f0bb750a"
    },
    {
      "file": "docs/engine/shard.md",
      "normalSha256": "bac54dc4ae8bfc74937a6988e15663c7f9e28929b97583bf1a07c5e92c68476d"
    },
    {
      "file": ".github/workflows/ci.yml",
      "normalSha256": "1cd864767ef645aa885928f80a5888b7e71bcef6a2bcfe2a7572d202d5c7a52c"
    },
    {
      "file": "docs/design/seamless-world-foundation.md",
      "normalSha256": "a6624ddf4911c4e8df339c05ced23ad81cc353825d8b2940b0c2c323c0f1c6d4"
    }
  ]
};
