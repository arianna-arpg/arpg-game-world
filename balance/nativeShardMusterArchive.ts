/** Exact phase84 predecessor and finite native Muster delta. Inherited archives remain unchanged. */
export const nativeShardMusterArchive={
  "parentInput": "c8be8cba46c16be013d7cc8b59b59d0375cc180896535641b04647a2933fdcf5",
  "presentationInput": {
    "input": "2488fb9319744cfc3ab6113a78ebcf931fa15ffb7a173b8e9a4e0fd3c246be9c",
    "sourceDirectory": "C:\\Users\\John\\.codex\\worktrees\\seamless-world\\ARPG Game - World\\.claude\\native-shard-presentation-phase88.local.work\\review-successor-snapshot",
    "files": [
      {
        "file": "src/worldmass/nativeAreaHostedPresentation.ts",
        "sha256": "f998370e452d841ce24bcbb4994e0ab27452990b53e014f2a2c3ca21d59598a1"
      }
    ],
    "scope": "Exact accepted owner module only; parent composes wire getters and spoils separately."
  },
  "rows": [
    {
      "file": "server/muster.ts",
      "before": "// ---------------------------------------------------------------------------\n// THE MUSTER RING (shard M1, W4; docs/design/shard-m1-plan.md 4.6, card 15 B:\n// RULED 2026-10-08 \"a party's road waits for the party at a visible muster\n// ring; two independent players in one place are never moved together\", its\n// detail RULED 2026-10-10 as these dials). The host half, the party desk's\n// sibling: the rings stand here, the engine only draws them\n// (engine/shardMuster.ts, World.musterRings, the snapshot's `mu` row).\n//\n//   THE RAISE    a party member's finished travel road (an exit, a cave mouth,\n//                a realm gate: THE SHARD SCANNER's) waits at a ring on the\n//                road when another member of its party stands, undowned, in\n//                the same unit; an independent, or a party alone in its unit,\n//                travels at once. MUSTER_CFG.raise: 'any' member raises it, or\n//                the 'leader' alone (a non-leader's road then takes that seat\n//                alone: card 8 A's free movement). One ring per party per unit.\n//   THE WAIT     the ring fires the moment every member standing in its unit\n//                stands inside it (at once if they already do), else at\n//                MUSTER_CFG.waitSec with whoever stands inside it; the rest stay\n//                where they are and take the road on their own later (into the\n//                same unit: shared tenancy; or the party's own instance). Downed\n//                and dormant members never block it; members in other units are\n//                never waited for. While it stands, the party's members in the\n//                unit take no road of their own: standing on it is joining it.\n//   THE LAPSE    the raiser walking off it (or falling, or leaving the unit),\n//                the party dissolving or the raiser leaving it, the unit gone.\n//   THE FIRE     one ticket per member on the ring, each made by the road\n//                itself for that member (its own door, its own ladder), all\n//                drained the same tick, so the party arrives together, side by\n//                side (MUSTER_CFG.landSpreadPx), in one unit (a party pocket:\n//                the party's own instance).\n//\n// Shown, never told: a ring on the ground whose wash fills with the gathered\n// share and whose rim closes with the wait left, gold for the viewer's party\n// and faint for a stranger's (renderer drawMusterRings, MUSTER_CUE). No word.\n// ---------------------------------------------------------------------------\n\nimport type { Seat, World } from '../src/engine/world';\nimport type { MusterRingRow, MusterRoad } from '../src/engine/shardMuster';\nimport { entryLanding, type LandingSpot, type RoadLanding } from '../src/engine/shardUnits';\nimport type { SimUnit, UnitRegistry } from './simUnits';\nimport type { PartyDesk } from './party';\n\n/** The muster's dials (card 15 B's detail, RULED 2026-10-10; docs/engine/shard.md \"Dials\"). */\nexport const MUSTER_CFG = {\n  /** Who may raise a ring: 'any' member's road, or the 'leader''s alone. */\n  raise: 'any' as 'any' | 'leader',\n  /** The ring's radius around the road it waits at (px): standing inside it is\n   *  standing on it. */\n  radiusPx: 400,\n  /** Seconds a ring waits for the whole party before it moves whoever stands on it. */\n  waitSec: 20,\n  /** How far apart the party lands (px): each member after the first stands\n   *  this far out along a golden-angle spiral from the road's own landing. */\n  landSpreadPx: 36,\n};\n\n/** One standing ring: a party's road waiting in one unit. */\ninterface Ring {\n  party: string;\n  unit: SimUnit;\n  /** The unit's zone when it was raised (a unit that changed zones lapses it). */\n  zoneId: string;\n  raiser: string;\n  road: MusterRoad;\n  raisedAt: number;\n}\n\nexport interface MusterHooks {\n  /** A seat that counts for the muster: alive, undowned, not dormant. */\n  standing(seat: Seat): boolean;\n  log(line: string): void;\n}\n\n/** The golden angle: successive landings never stack on one bearing. */\nconst GOLDEN = Math.PI * (3 - Math.sqrt(5));\n\n/** THE FIRE's landing: the road's own landing, resolved in the destination,\n *  then the member's slot out along the spiral (the landing law clamps it). */\nfunction spreadLanding(inner: RoadLanding | undefined, from: string | null, slot: number): RoadLanding {\n  return (w: World): LandingSpot => {\n    const spot = typeof inner === 'function' ? inner(w) : inner ?? 'entry';\n    const base = spot === 'entry' ? { at: entryLanding(w, from) } : spot;\n    const ang = slot * GOLDEN, r = MUSTER_CFG.landSpreadPx * Math.sqrt(slot);\n    return { ...base, at: { x: base.at.x + Math.cos(ang) * r, y: base.at.y + Math.sin(ang) * r } };\n  };\n}\n\nexport class MusterDesk {\n  /** The standing rings, keyed `${party}@${unit}`. */\n  private readonly rings = new Map<string, Ring>();\n  /** Ledgers since boot (the status page's and the probe's read). */\n  raised = 0;\n  fired = 0;\n  lapsed = 0;\n  moved = 0;\n\n  constructor(private readonly units: UnitRegistry, private readonly parties: PartyDesk, private readonly hooks: MusterHooks) {}\n\n  get size(): number { return this.rings.size; }\n\n  /** THE RAISE (ShardWorldLink.muster, inside the seat's unit's run): true when\n   *  the road waits at its party's ring, false when the seat travels alone now. */\n  offer(seat: Seat, road: MusterRoad): boolean {\n    const party = this.parties.partyOf(seat.id);\n    if (!party) return false; // an independent travels alone\n    const u = this.units.unitOf(seat.id);\n    if (!u) return false;\n    const key = `${party.id}@${u.key}`;\n    if (this.rings.has(key)) return true; // the party's ring stands here: its road is the ring's\n    if (MUSTER_CFG.raise === 'leader' && party.leader !== seat.id) return false; // card 8 A: a non-leader goes alone\n    if (!this.standingIn(party.members, u).some(s => s.id !== seat.id)) return false; // nobody here to wait for\n    this.rings.set(key, { party: party.id, unit: u, zoneId: u.world.zone.id, raiser: seat.id,\n      road: { ...road, pos: { x: road.pos.x, y: road.pos.y } }, raisedAt: u.world.time });\n    this.raised++;\n    return true;\n  }\n\n  /** ShardWorldLink.mustering: a ring of this seat's party stands in its unit. */\n  mustering(seatId: string): boolean {\n    if (!this.rings.size) return false;\n    const party = this.parties.partyOf(seatId);\n    const u = party ? this.units.unitOf(seatId) : undefined;\n    return !!party && !!u && this.rings.has(`${party.id}@${u.key}`);\n  }\n\n  /** THE WAIT, THE LAPSE and THE FIRE, after every unit ticked and before THE\n   *  HAND-OFF QUEUE drains (so a fired party travels this very tick); then the\n   *  rings standing are published into every unit for the wire. */\n  judge(now: number): void {\n    for (const [key, ring] of [...this.rings]) {\n      const verdict = this.verdict(ring, now);\n      if (verdict === 'stand') continue;\n      this.rings.delete(key);\n      if (verdict === 'lapse') { this.lapsed++; continue; }\n      this.fire(ring, verdict);\n    }\n    this.publish(now);\n  }\n\n  /** THE STATUS PAGE's rings. */\n  status(now: number): Record<string, unknown>[] {\n    return [...this.rings.values()].map(r => {\n      const { standing, on } = this.count(r);\n      return { party: r.party, unit: r.unit.key, road: r.road.key, raiser: r.raiser, have: on.length, need: standing.length,\n        leftSec: +Math.max(0, MUSTER_CFG.waitSec - (now - r.raisedAt)).toFixed(1) };\n    });\n  }\n\n  // ---- internals ------------------------------------------------------------\n  /** The party's members standing in a unit, in the party's own order. */\n  private standingIn(members: readonly string[], u: SimUnit): Seat[] {\n    const out: Seat[] = [];\n    for (const id of members) {\n      const s = u.world.seats.find(x => x.id === id && !x.keeper);\n      if (s && this.hooks.standing(s)) out.push(s);\n    }\n    return out;\n  }\n  private inside(seat: Seat, ring: Ring): boolean {\n    const p = seat.actor.pos;\n    return Math.hypot(p.x - ring.road.pos.x, p.y - ring.road.pos.y) <= MUSTER_CFG.radiusPx;\n  }\n  /** The members standing in the ring's unit, and those standing on the ring. */\n  private count(ring: Ring): { standing: Seat[]; on: Seat[] } {\n    const party = this.parties.partyOf(ring.raiser);\n    const standing = party && party.id === ring.party ? this.standingIn(party.members, ring.unit) : [];\n    return { standing, on: standing.filter(s => this.inside(s, ring)) };\n  }\n\n  private verdict(ring: Ring, now: number): 'stand' | 'lapse' | Seat[] {\n    const u = ring.unit;\n    if (this.units.unit(u.key) !== u || u.broken || u.world.zone.id !== ring.zoneId) return 'lapse'; // its ground is gone\n    const party = this.parties.partyOf(ring.raiser);\n    if (!party || party.id !== ring.party) return 'lapse'; // the party dissolved, or its raiser left it\n    const raiser = u.world.seats.find(s => s.id === ring.raiser && !s.keeper);\n    if (!raiser || !this.hooks.standing(raiser) || !this.inside(raiser, ring)) return 'lapse'; // the raiser walked off it\n    const { standing, on } = this.count(ring);\n    if (on.length < standing.length && now - ring.raisedAt < MUSTER_CFG.waitSec) return 'stand';\n    // Every member standing here stands on it, or the wait ran out: whoever stands on it goes, the raiser first.\n    return [raiser, ...on.filter(s => s !== raiser)];\n  }\n\n  /** One ticket per member on the ring, each made by the road for that member\n   *  inside the ring's unit (under its pin), queued for this tick's drain. */\n  private fire(ring: Ring, members: Seat[]): void {\n    let slot = 0;\n    for (const seat of members) {\n      const t = this.units.run(ring.unit, () => ring.road.make(seat));\n      if (!t) continue;\n      t.muster = { party: ring.party, slot };\n      if (slot > 0) t.landing = spreadLanding(t.landing, t.from === undefined ? ring.zoneId : t.from, slot);\n      this.units.enqueue(t);\n      slot++;\n    }\n    this.fired++;\n    this.moved += slot;\n    this.hooks.log(`[shard] the muster of ${ring.party} fired at ${ring.road.key} in ${ring.unit.key}: ${slot} member(s) travel together`);\n  }\n\n  /** The rings as drawn, into every unit's World (null where none stands). */\n  private publish(now: number): void {\n    const rows = new Map<SimUnit, MusterRingRow[]>();\n    for (const ring of this.rings.values()) {\n      const { standing, on } = this.count(ring);\n      const row: MusterRingRow = {\n        x: Math.round(ring.road.pos.x), y: Math.round(ring.road.pos.y), r: MUSTER_CFG.radiusPx, party: ring.party,\n        have: on.length, need: standing.length,\n        left: Math.round(Math.max(0, MUSTER_CFG.waitSec - (now - ring.raisedAt)) * 10) / 10, wait: MUSTER_CFG.waitSec,\n      };\n      const list = rows.get(ring.unit);\n      if (list) list.push(row); else rows.set(ring.unit, [row]);\n    }\n    for (const u of this.units.each()) {\n      const r = rows.get(u) ?? null;\n      if (r || u.world.musterRings) u.world.musterRings = r;\n    }\n  }\n}\n",
      "beforeHash": "0972b1832b48f7d42400f2c9d84773dd3958cfbcf592b3a185f7b16f635858f3",
      "afterHash": "95c4a357235b2af0364841c3df80a317cb0dfba9d06f3f81676fa034a5edfa27",
      "normalizedBefore": "0972b1832b48f7d42400f2c9d84773dd3958cfbcf592b3a185f7b16f635858f3",
      "normalizedAfter": "95c4a357235b2af0364841c3df80a317cb0dfba9d06f3f81676fa034a5edfa27"
    },
    {
      "file": "src/worldmass/nativeAreaRoadDestination.ts",
      "before": "/** Narrow callback surface for a real retained destination during ticket execution.\n * This type does not issue authority; only the actual coordinator's private\n * synchronous ticket frame may expose its implementation to selected callbacks. */\nimport type {World} from '../engine/world';\nimport type {ShardWorldLink} from '../engine/shardUnits';\nimport type {NativeAreaDirectoryView} from './nativeAreaDirectoryView';\nexport interface NativeAreaRoadDestination extends NativeAreaDirectoryView {\n readonly waypointPos:World['waypointPos'];\n readonly caveEntrances:World['caveEntrances'];\n readonly massRuntime:null;\n readonly shardWorld:ShardWorldLink<NativeAreaRoadDestination,NativeAreaDirectoryView>|undefined;\n readonly findFreeSpot:World['findFreeSpot'];\n readonly seatHero:World['seatHero'];\n realmContext:World['realmContext'];\n crusadeRealmContext:World['crusadeRealmContext'];\n necropolisRealmContext:World['necropolisRealmContext'];\n fractureRealmContext:World['fractureRealmContext'];\n}\nexport type NativeAreaRealmContextTarget=Pick<NativeAreaRoadDestination,'realmContext'|'crusadeRealmContext'|'necropolisRealmContext'|'fractureRealmContext'>;\n",
      "beforeHash": "ce25b748f63bf90bcf67af7c73bb1533d1705bc984f5e5bef759753601736c58",
      "afterHash": "b1ee42339d9e427dfecbf9bb247e84095291a0b84344ffa9a27be68465342f43",
      "normalizedBefore": "ce25b748f63bf90bcf67af7c73bb1533d1705bc984f5e5bef759753601736c58",
      "normalizedAfter": "b1ee42339d9e427dfecbf9bb247e84095291a0b84344ffa9a27be68465342f43"
    },
    {
      "file": "src/worldmass/nativeAreaSceneCampaignFrame.ts",
      "before": "import * as uiTravel from '../engine/nativeSceneUIActions';\nimport type {NativeSceneUITravelHost} from '../engine/nativeSceneUIActionHost';\nimport {assertNativeRetainedMassState} from './nativeAreaRetainedMassState';\n/** The actual campaign frame's travel/service owner. Local combat keeps its\n * stable area host; travel-capable native bodies select actual retained owners\n * after each handoff. No World local driver or public host escapes this owner. */\nimport type {Seat} from '../engine/world';\nimport type {Actor} from '../engine/actor';\nimport type {NativeSceneRetainedCampaignFrameHost as ClosureHost,NativeFrameMethod} from '../engine/nativeSceneCampaignFrameClosureHost';\nimport type {NativeSceneRoadScanHost} from '../engine/nativeSceneRoadScan';\nimport type {NativeAreaRoadDestination} from './nativeAreaRoadDestination';\nimport type {ShardRoadHost,RealmGateRow} from '../engine/shardRoads';\nimport {NativeAreaActorAuthority} from './nativeAreaActorAuthority';\nimport type {NativeAreaTransitionFrame} from './nativeAreaSceneTransitionCoordinator';\nconst finalPhysical=NativeAreaActorAuthority.prototype.assertFinalPhysical;\nfunction members<T>(rows:readonly T[]):T[]{const n=own<number>(rows,'length'),out:T[]=[];for(let i=0;i<n;i++)out.push(own<T>(rows,i));return out;}\nimport * as services from '../engine/nativeSceneFrameServices';\nimport * as frameCore from '../engine/nativeSceneCampaignFrame';\nimport * as frameSteps from '../engine/nativeSceneCampaignFrameSteps';\nimport * as director from '../engine/scenes';\nimport type {NativeSceneDirectorHost,NativeSceneDirectorBodies} from '../engine/nativeSceneDirectorHost';\nexport type NativeAreaCampaignFrameHost=NativeSceneUITravelHost & ClosureHost & NativeSceneRoadScanHost & frameCore.NativeFrameBeginHost & frameCore.NativeFrameRawAreaHost & frameCore.NativeFrameClockHost & frameCore.NativeFramePrepareHost & frameCore.NativeFramePendingTransitionsHost & frameCore.NativeFrameFadesHost & frameCore.NativeFrameInteractionsBeforeHarborHost & frameCore.NativeFrameHarborholdsHost & frameCore.NativeFrameInteractionsAfterHarborHost & frameCore.NativeFrameWipeHost & frameCore.NativeFrameWorldRoleHost & frameCore.NativeFrameWorldSimHost & frameCore.NativeFrameQuestRescuesHost & frameCore.NativeFrameWorldLedgerHost & frameCore.NativeFrameContagionHost & frameCore.NativeFrameDeepwinterHost & frameCore.NativeFrameLocalStreamsHost & frameCore.NativeFrameBulletinsHost & frameCore.NativeFrameWorldBridgesHost & frameCore.NativeFrameWarbandMarchesHost & frameCore.NativeFrameWorldMintsHost & frameCore.NativeFrameRoadTailHost;\ntype Host=NativeAreaCampaignFrameHost;\nconst ticking=new WeakSet<NativeAreaSceneTransitionCoordinator>();\nconst campaignPhaseOwner=new WeakMap<NativeAreaSceneTransitionCoordinator,NativeAreaSceneCombat>();\nconst roadFrameKeys=[\"frameSeats\",\"isPresentLocalPlayer\",\"updateTownPortals\",\"waypointPos\",\"discoveredWaypoints\",\"zone\",\"touchers\",\"waypointBesieged\",\"time\",\"wpRefusedAt\",\"flashes\",\"player\",\"traversal\",\"mouthUnder\",\"caveExitGrace\",\"caveDwellIdx\",\"shardWorld\",\"doorRefusalAt\",\"mouthRefusalUnder\",\"text\",\"playerIdle\",\"caveDwellStart\",\"caveEntrances\",\"mintSidezone\",\"beginTraversal\",\"enterSidezone\",\"seats\",\"seatIdle\",\"doodads\",\"dwellReachable\",\"doorDwellId\",\"doorDwellStart\",\"doorDwellPos\",\"setDoorState\",\"account\",\"accountDirty\",\"trapworks\",\"storyPair\",\"springTrapwork\",\"realmGates\",\"gateUnder\",\"realmDwellKey\",\"realmDwellKind\",\"realmDwellPos\",\"realmDwellStart\",\"arenaWard\",\"wardSealUnder\",\"wardDwellSeal\",\"wardDwellStart\",\"breakArenaSeal\",\"holdfastNear\",\"holdfastDwellKey\",\"holdfastDwellPos\",\"holdfastDwellStart\",\"onHoldfastDwell\",\"encounters\",\"openEncounter\",\"fractureRun\",\"triggerFracture\",\"exitUnder\",\"lockHint\",\"exitLockHint\",\"exitDwellIdx\",\"exitDwellStart\",\"travelThrough\",\"scanShardRoads\"] as const satisfies readonly (keyof Host)[];\nconst directorKeys=[\"manifest\",\"account\",\"accountDirty\",\"actors\",\"ambientCamShift\",\"applyWaveFrenzy\",\"arena\",\"caveMap\",\"caveReturn\",\"charDirty\",\"clampPos\",\"createMonster\",\"doodads\",\"loadZone\",\"markDoodadsChanged\",\"player\",\"playerIdle\",\"recalcPlayer\",\"scene\",\"screenFade\",\"shake\",\"swarmEntryPoint\",\"text\",\"time\",\"timeflow\",\"useSkill\",\"zone\",\"seats\"] as const satisfies readonly (keyof Host)[];\nimport * as travel from '../engine/nativeSceneFrameTravel';\nimport {isNativeAreaSceneCombat,type NativeAreaSceneCombat} from './nativeAreaSceneCombat';\nimport {issueNativeRealmEntryBridge,type NativeRealmEntryBridge,type NativeRealmContextKey,isNativeAreaSceneTransitionCoordinator,NativeAreaSceneTransitionCoordinator} from './nativeAreaSceneTransitionCoordinator';\nimport {assertNativeCombatOwnerEntry,type NativeAreaCombatOwnerEntry} from './nativeAreaCombatOperation';\nimport {issueNativeRoadOwnerBridge,type NativeRoadOwnerBridge} from './nativeAreaRoadOwnerBridge';\nexport interface NativeAreaSceneCampaignFrameInput {combat:NativeAreaSceneCombat;coordinator:NativeAreaSceneTransitionCoordinator;entry:NativeAreaCombatOwnerEntry;fixedHost:Host & NativeSceneRoadScanHost}\nconst actualFrames=new WeakSet<object>();\nconst travelNames=new Set<keyof Host>([\"chartCourse\",\"sailTo\",\"updateModeRespawn\",\"updateBountyBoard\",\"updateSail\",\"updateDelver\",\"updateSailing\",\"performModeRespawn\",\"requestMeta\",\"enterSailing\",\"descend\",\"landAshore\",\"enterSidezone\",\"onHoldfastDwell\",\"realmGates\",\"travelThrough\",\"updateTownPortals\",\"applyAction\",\"enterDimension\",\"enterDemonRealm\",\"enterCrusadeSanctum\",\"enterNecropolis\",\"enterFractureRift\",\"enterCourtDomain\",\"beginWraithsailBoarding\",\"resumeSpawn\",\"applyActionAs\",\"enterRealmArena\",\"resumeCaveLadder\",\"startCaravan\",\"travelToWaypoint\",\"realmArenaWake\"]);\nconst hostKeys=[\"realmContext\",\"crusadeRealmContext\",\"necropolisRealmContext\",\"fractureRealmContext\",\"chartCourse\",\"sailTo\",\"abandonBounty\",\"acceptBounty\",\"acceptQuestOffer\",\"acceptVocationQuest\",\"account\",\"actingSeat\",\"activeQuests\",\"actors\",\"allocateNode\",\"applyAction\",\"applyActionAs\",\"applySidezoneFurnish\",\"arenaCrowd\",\"armBountyBoard\",\"armFolkWithEssence\",\"armFolkWithItem\",\"attuneSpectre\",\"bagItem\",\"beginHoldMuster\",\"beginTraversal\",\"beginWraithsailBoarding\",\"bindGraft\",\"bindSkill\",\"boardStateOf\",\"bountyBeat\",\"bountyBoardsHere\",\"bountyDwellBoardId\",\"bountyDwellRequested\",\"bountyDwellSeatId\",\"bountyGate\",\"breachPos\",\"bridges\",\"buyAbilityEssence\",\"buyChandlerGem\",\"buyDelverGem\",\"buyHarborChart\",\"buyHoldRestore\",\"buyVendorGem\",\"canSail\",\"caravanBandUnlocked\",\"castTownPortal\",\"caveEntrances\",\"caveExitGrace\",\"caveMap\",\"caveReturn\",\"caveStack\",\"chartFrontier\",\"claimQuestImbue\",\"claimQuestReward\",\"clampPos\",\"clientActionHook\",\"clientOptimistic\",\"completedObjectives\",\"containerMove\",\"containerPlace\",\"containerTake\",\"continentFor\",\"courtRealmPlan\",\"craftAffix\",\"craftSocket\",\"crusadePortals\",\"crusadeRealmPlan\",\"cycleCompanionStance\",\"demonPortals\",\"demonRealmPlan\",\"descend\",\"descentRun\",\"descentShaftDwell\",\"descentSite\",\"descentSpent\",\"dimGates\",\"dimensionCrossing\",\"dimensionRoad\",\"discoveredWaypoints\",\"dropGearFromBag\",\"dropRuleOf\",\"drops\",\"dwellReachable\",\"encounters\",\"enemiesOf\",\"ensureSeaPorts\",\"enterCourtDomain\",\"enterCrusadeSanctum\",\"enterDemonRealm\",\"enterDimension\",\"enterFractureRift\",\"enterNecropolis\",\"enterRealmArena\",\"enterSailing\",\"entryFrom\",\"equipItem\",\"eventLevel\",\"farPoint\",\"findFreeSpot\",\"flashes\",\"fontConvertEssence\",\"fontMergeSkill\",\"fontResetTree\",\"forgeBegin\",\"forgeCancel\",\"fractureRealmPlan\",\"fractureRifts\",\"gameOver\",\"grantXp\",\"grounds\",\"handSeats\",\"harvestConsent\",\"harvestSessions\",\"inCave\",\"isAmbientTag\",\"isCampaignFrameOwner\",\"isPresentActor\",\"isPresentLocalPlayer\",\"islandDefIdOf\",\"journalDirty\",\"landAshore\",\"landPartyAt\",\"landingSiteFor\",\"lastRespawnPayout\",\"learnSkill\",\"ledger\",\"levelUpSkill\",\"levelUpSupport\",\"loadZone\",\"localHumanSeats\",\"localSeat\",\"manifest\",\"markMetaDirty\",\"massAway\",\"massCaveIds\",\"massRuntime\",\"massSideareaRoots\",\"mimicSelectFor\",\"mintCaravanRoute\",\"mintIslandZone\",\"mintSidezone\",\"modeDef\",\"modeStageDef\",\"moveBagItem\",\"nativeWorldReady\",\"nearBountyBoard\",\"nearCaravan\",\"nearMusterHorn\",\"nearestShore\",\"necropolisPortals\",\"necropolisRealmPlan\",\"nodeFromSea\",\"notice\",\"objectiveDone\",\"oceanBearing\",\"onQuestZoneFieldCleared\",\"oracleAttune\",\"oracleRelic\",\"ownSpoils\",\"partyDowns\",\"partyRows\",\"payHoldfastToll\",\"pendingRespawn\",\"performModeRespawn\",\"personalStash\",\"pickTreeNode\",\"pickupNearestGear\",\"placePing\",\"player\",\"playerIdle\",\"portDock\",\"postHoldWrits\",\"raiseArenaWards\",\"reacquireSkill\",\"realmArenaMint\",\"realmArenaWake\",\"realmRoad\",\"recallMemory\",\"refundPassiveNode\",\"releaseCompanion\",\"relicStashMove\",\"reliquaryToggle\",\"requestMeta\",\"rerollAffix\",\"resolvedHandsAt\",\"resumeCaveLadder\",\"resumeSpawn\",\"resurfaceFromDescent\",\"resyncMinionSupports\",\"sailGate\",\"sailing\",\"salvageBulk\",\"salvageItem\",\"salvageLockSet\",\"screenFade\",\"seaFromNode\",\"seatIdle\",\"seatNote\",\"seats\",\"setBountyLock\",\"setVendorCommission\",\"setVendorLock\",\"shardRealmRoad\",\"shardWorld\",\"sidezoneIdFor\",\"sim\",\"socketSupport\",\"socketVestige\",\"sortBag\",\"spawnArenaBoss\",\"startCaravan\",\"stationArmed\",\"stationDwellArmed\",\"storyPair\",\"streamCoast\",\"swapSkillSlots\",\"text\",\"time\",\"townLayoutChangedOnLoad\",\"townPortalArrival\",\"townPortalDwell\",\"townPortalViews\",\"townPortals\",\"travelToWaypoint\",\"traversal\",\"turnInBounty\",\"uiActionSeatId\",\"unequipItem\",\"unlearnSkill\",\"unsocketBagSkill\",\"unsocketSupport\",\"updateWraithsailAtSea\",\"voyage\",\"voyageZoneDef\",\"watchBountyHands\",\"waypointPos\",\"withQuestHand\",\"withdrawRelic\",\"wraithsailSeaStash\",\"wraithsailSighted\",\"zone\",\"zoneMap\",\"zoneMemory\"] as const satisfies readonly (keyof Host)[];\nfunction own<T>(o:object,k:PropertyKey):T{const d=Object.getOwnPropertyDescriptor(o,k);if(!d||!Object.hasOwn(d,'value'))throw Error('Native campaign frame needs ordinary concrete input: '+String(k));return d.value as T;}\nexport class NativeAreaSceneCampaignFrame {\n readonly #retiredVoyage=NativeAreaSceneTransitionCoordinator.prototype.isRetiredVoyage;\n readonly #retiredGround=NativeAreaSceneTransitionCoordinator.prototype.isRetiredGround;\n readonly input:Readonly<Pick<NativeAreaSceneCampaignFrameInput,'combat'|'coordinator'>>;\n readonly #realm:NativeRealmEntryBridge;#realmKind:NativeRealmContextKey|null=null;\n readonly #entry:NativeAreaCombatOwnerEntry;readonly #fixed:Host & NativeSceneRoadScanHost;readonly #road:NativeRoadOwnerBridge;readonly #scanHost:NativeSceneRoadScanHost;\n constructor(raw:NativeAreaSceneCampaignFrameInput){\n  const combat=own<NativeAreaSceneCombat>(raw,'combat'),coordinator=own<NativeAreaSceneTransitionCoordinator>(raw,'coordinator'),entry=own<NativeAreaCombatOwnerEntry>(raw,'entry'),fixedHost=own<Host & NativeSceneRoadScanHost>(raw,'fixedHost');\n  if(!isNativeAreaSceneCombat(combat)||!isNativeAreaSceneTransitionCoordinator(coordinator)||!fixedHost||typeof fixedHost!=='object')throw Error('Native campaign frame needs actual runtime owners');assertNativeCombatOwnerEntry(combat,entry);\n  for(const key of ['campaign','characterWriter','authority'] as const)if(combat.input[key]!==coordinator.input[key])throw Error('Native campaign frame roots differ: '+key);\n  assertNativeRetainedMassState(combat.input.characterWriter);\n  this.input=Object.freeze({combat,coordinator});Object.defineProperty(this,'input',{writable:false,configurable:false});this.#entry=entry;this.#fixed=fixedHost;actualFrames.add(this);this.#road=issueNativeRoadOwnerBridge(coordinator,this,combat,entry);this.#realm=issueNativeRealmEntryBridge(coordinator,this,combat,entry);\n  const self=this;this.#scanHost=Object.freeze({\n   get seatDoorOf(){return self.#fixed.seatDoorOf;},\n   get applyAction(){return self.#fixed.applyAction;},\n   get exitLockHint(){return self.#fixed.exitLockHint;},\n   get exitUnder(){return self.#fixed.exitUnder;},\n   get gateUnder(){return self.#fixed.gateUnder;},\n   get holdfastNear(){return self.#fixed.holdfastNear;},\n   get mouthRefusalUnder(){return self.#fixed.mouthRefusalUnder;},\n   get mouthUnder(){return self.#fixed.mouthUnder;},\n   get realmGates(){return self.#fixed.realmGates;},\n   get seatIdle(){return self.#fixed.seatIdle;},\n   get seats(){return self.#selectedFrameSeats();},\n   get shardRoadHost(){return self.#fixed.shardRoadHost;},\n   get shardWorld(){return self.#fixed.shardWorld;},\n   get time(){return self.#fixed.time;},\n   get wardSealUnder(){return self.#fixed.wardSealUnder;}\n  });\n  \n }\n #assertInstalled():void{const {combat,coordinator}=this.input;assertNativeRetainedMassState(combat.input.characterWriter);if(own(combat,'campaignFrame')!==this||coordinator.areaFor(combat).combat!==combat)throw Error('Native campaign frame owner was replaced or unregistered');}\n #assertFrame(issued:NativeAreaTransitionFrame):void{const coordinator=this.input.coordinator;if(!issued.active||coordinator.frame!==issued){if(!coordinator.allowsTraversalContinuation(issued)&&!coordinator.allowsRoadContinuation(issued))throw Error('Expired native campaign service frame');}}\n #host(physicalSeats=false):Host{const issued=this.input.coordinator.frame,host={} as Host;for(const key of hostKeys)Object.defineProperty(host,key,{enumerable:true,get:()=>{this.#assertFrame(issued);return physicalSeats&&key==='seats'?this.#selectedFrameSeats():this.#read(key,issued);},set:value=>{this.#assertFrame(issued);this.#write(key,value);}});return Object.freeze(host);}\n #selected():NativeAreaSceneCampaignFrame{this.#assertInstalled();const {coordinator}=this.input,frame=coordinator.frame;if(!frame.active)throw Error('Native campaign service frame expired');const owner=own<NativeAreaSceneCampaignFrame>(frame.current.combat,'campaignFrame');if(!actualFrames.has(owner)||owner.input.coordinator!==coordinator)throw Error('Native campaign selected a foreign owner');owner.#assertInstalled();return owner;}\n #inSelected<T>(action:()=>T):T{this.#assertInstalled();const {coordinator,combat}=this.input;if(coordinator.frame.current!==coordinator.areaFor(combat))throw Error('Native campaign service needs its exact current area');return this.#entry(this,{permission:'proc',physical:[],sources:[]},action);}\n #run<T>(action:()=>T):T{this.#assertInstalled();const {coordinator,combat}=this.input;return coordinator.runFrom(coordinator.areaFor(combat),()=>this.#inSelected(action));}\n #withRealmEntry<T>(key:NativeRealmContextKey,action:()=>T):T{if(this.#realmKind)throw Error(\"Native realm entry cannot reenter\");this.#realmKind=key;try{return action();}finally{this.#realmKind=null;}}\n #read<K extends keyof Host>(key:K,issued:NativeAreaTransitionFrame):Host[K]{const owner=this.#selected();if(travelNames.has(key)){const fn=Reflect.get(owner,key,owner);if(typeof fn!=='function')throw Error('Native campaign travel method is missing');return ((...args:unknown[])=>{this.#assertFrame(issued);if(this.#selected()!==owner)throw Error('Native selected travel receiver changed');return Reflect.apply(fn,owner,args);}) as Host[K];}\n  const value=owner.#inSelected(()=>Reflect.get(owner.#fixed,key,owner.#fixed)) as Host[K];if(typeof value!=='function')return value;return ((...args:unknown[])=>{this.#assertFrame(issued);if(this.#selected()!==owner)throw Error('Native selected service receiver changed');return owner.#inSelected(()=>Reflect.apply(value,owner.#fixed,args));}) as Host[K];\n }\n #write<K extends keyof Host>(key:K,value:Host[K]):void{const owner=this.#selected();owner.#inSelected(()=>{if(!Reflect.set(owner.#fixed,key,value,owner.#fixed))throw new TypeError('Native campaign field is not writable: '+key);});}\n #selectedFrameSeats():Seat[]{const {coordinator}=this.input,issued=coordinator.frame,area=issued.current,rows=members(issued.seats);for(const seat of rows)this.#selectedSeat(seat);Reflect.apply(finalPhysical,coordinator.input.authority,[area.binding,rows.map(seat=>own<Actor>(seat,'actor'))]);if(coordinator.frame!==issued||issued.current!==area)throw Error('Native captured travel cohort changed');return rows;}\n #selectedSeat(seat:Seat):Actor{const {coordinator}=this.input,body=own<Actor>(seat,'actor'),id=own<string>(seat,'id'),frame=coordinator.frame,area=frame.current,campaign=coordinator.input.campaign,rows=campaign.seats;if(!members(rows).includes(seat)||!members(frame.seats).includes(seat))throw Error('Native campaign action needs its actual local seat');const finalRows=campaign.seats;if(finalRows!==rows||!members(finalRows).includes(seat)||!members(frame.seats).includes(seat)||own(seat,'id')!==id||own(seat,'actor')!==body||coordinator.frame!==frame||frame.current!==area)throw Error('Native campaign action seat changed during admission');Reflect.apply(finalPhysical,coordinator.input.authority,[area.binding,[body]]);if(own(seat,'actor')!==body||own(seat,'id')!==id)throw Error('Native campaign action seat changed during final validation');return body;}\n #gateRows(rows:RealmGateRow<NativeAreaRoadDestination>[]):RealmGateRow<NativeAreaRoadDestination>[] {const issued=this.input.coordinator.frame,origin=issued.current;for(const row of rows){for(const key of ['enter','road'] as const){const selected=Object.getOwnPropertyDescriptor(row,key);if(!selected)continue;if(!Object.hasOwn(selected,'value')||typeof selected.value!=='function')throw Error('Native realm gate requires its actual selected callable');const fn=selected.value,owner=this;let used=false;const roadUsers=new WeakSet<Seat>();const call=function(this:unknown,...args:unknown[]){if(!issued.active||owner.input.coordinator.frame!==issued)throw Error('Expired native realm gate frame');if(owner.input.coordinator.current!==origin||Object.getOwnPropertyDescriptor(row,key)?.value!==call)throw Error('Expired or changed native realm gate');const seat=key==='road'?args[0] as Seat:owner.input.coordinator.input.campaign.localSeat;owner.#selectedSeat(seat);if(key==='road'){if(roadUsers.has(seat))throw Error('Native realm road already issued for this seat');roadUsers.add(seat);}else{if(used)throw Error('Native realm gate already entered');used=true;}return Reflect.apply(fn,this,args);};Object.defineProperty(row,key,{...selected,value:call});}}return rows;}\n\n\n #owner(combat:NativeAreaSceneCombat):NativeAreaSceneCampaignFrame {const owner=own<NativeAreaSceneCampaignFrame>(combat,'campaignFrame');if(!actualFrames.has(owner)||owner.input.coordinator!==this.input.coordinator)throw Error('Native frame selected a foreign retained owner');owner.#assertInstalled();return owner;}\n #published():NativeAreaSceneCampaignFrame{return this.#owner(this.input.coordinator.published.combat);}\n #currentStep<T>(step:(host:Host)=>T):T {const owner=this.#published();return owner.#run(()=>step(owner.#fixed));}\n #areaStep(step:(host:Host)=>void):void {const {coordinator}=this.input,rows=coordinator.residentAreas().map(area=>this.#owner(area.combat));const anchor=coordinator.published.combat;campaignPhaseOwner.set(coordinator,anchor);try{for(const owner of rows){if((Reflect.apply(this.#retiredVoyage,coordinator,[owner.input.combat])||Reflect.apply(this.#retiredGround,coordinator,[owner.input.combat])))continue;owner.#run(()=>step(owner.#fixed));}}finally{campaignPhaseOwner.delete(coordinator);}}\n #combatStep(step:(combat:NativeAreaSceneCombat)=>void):void {const rows=this.input.coordinator.residentAreas().map(area=>this.#owner(area.combat));for(const owner of rows){if((Reflect.apply(this.#retiredVoyage,this.input.coordinator,[owner.input.combat])||Reflect.apply(this.#retiredGround,this.input.coordinator,[owner.input.combat])))continue;owner.#run(()=>step(owner.input.combat));}}\n #dynamicHost(keys:readonly (keyof Host)[]):Host {const issued=this.input.coordinator.frame,host={} as Host;for(const key of keys)Object.defineProperty(host,key,{enumerable:true,get:()=>{this.#assertFrame(issued);return this.#read(key,issued);},set:value=>{this.#assertFrame(issued);this.#write(key,value);}});return host;}\n #directorHost():NativeSceneDirectorHost {const issued=this.input.coordinator.frame,host=this.#dynamicHost(directorKeys);const bodies={} as NativeSceneDirectorBodies;\n  const bind=<K extends keyof NativeSceneDirectorBodies>(key:K,fn:(fixed:Host,...args:never[])=>unknown):void=>{Object.defineProperty(bodies,key,{enumerable:true,get:()=>{this.#assertFrame(issued);const owner=this.#selected();return(...args:never[])=>{this.#assertFrame(issued);if(this.#selected()!==owner)throw Error('Native Director birth receiver changed');return owner.#inSelected(()=>fn(owner.#fixed,...args));};}});};\n  bind('spawnBody',director.nativeSceneSpawnBody);bind('spawnColossus',director.nativeSceneSpawnColossus);bind('spawnApparitions',director.nativeSceneSpawnApparitions);bind('emptyField',director.nativeSceneEmptyField);\n  Object.defineProperty(host,'nativeSceneBodies',{value:Object.freeze(bodies),enumerable:true});return Object.freeze(host);\n }\n beginScene(id:string):boolean {return this.#run(()=>director.sceneBegin(this.#directorHost(),id));}\n updateDirector(rawDt:number):void {this.#run(()=>{if(this.isCampaignFrameOwner()&&this.#fixed.isPresentLocalPlayer())director.updateScene(this.#directorHost(),rawDt);});}\n #pendingTransitions(dt:number):boolean {const current=()=>this.#published(),coordinator=this.input.coordinator;const host:frameCore.NativeFramePendingTransitionsHost={\n  get massRuntime(){return current().#fixed.massRuntime;},get pendingRespawn(){return current().#fixed.pendingRespawn;},get traversal(){return current().#fixed.traversal;},\n  updateModeRespawn(step){current().updateModeRespawn(step);},updateTraversal(step){current().input.combat.campaignTransitions.updateTraversal(step);},nativeWorldReady(){return coordinator.nativeWorldReady();}\n };return frameCore.sceneNativeFramePendingTransitions(host,dt);}\n #wipe():void {this.#currentStep(fixed=>{\n  const host=Object.create(null) as frameCore.NativeFrameWipeHost;for(const key of ['gameOver','pendingRespawn','scene','concludeWipe'] as const)Object.defineProperty(host,key,{get:()=>Reflect.get(fixed,key,fixed)});Object.defineProperty(host,'seats',{get:()=>this.input.coordinator.current.combat.campaignTransitions.partySeats()});frameCore.sceneNativeFrameWipe(host);\n });}\n /** One native campaign frame, with a fresh finite resident cohort at every\n  * original statement boundary. Shared clocks and sweeps run once. */\n tick(rawSeconds:number):void {\n  this.#assertInstalled();const {coordinator}=this.input;coordinator.assertIdleFrame();if(ticking.has(coordinator))throw Error('Native campaign frame cannot reenter');ticking.add(coordinator);\n  try {\n   const timing=this.#currentStep(host=>frameCore.sceneNativeFrameBegin(host,rawSeconds));if(!timing)return;const {dt,rawDt,doorPressIntents}=timing;\n   this.#published().updateDirector(rawDt);\n   this.#areaStep(host=>frameSteps.sceneNativeFrameStep008(host,rawDt,dt));\n   if(!this.#currentStep(host=>frameCore.sceneNativeFrameClock(host,dt)))return;\n   this.#areaStep(frameCore.sceneNativeFramePrepare);\n   if(!this.#pendingTransitions(dt))return;\n   this.#currentStep(host=>frameCore.sceneNativeFrameFades(host,dt));\n   this.#areaStep(host=>frameSteps.sceneNativeFrameStep022(host,dt));\n   this.#areaStep(host=>frameSteps.sceneNativeFrameStep023(host,dt));\n   this.#areaStep(host=>frameSteps.sceneNativeFrameStep024(host,dt));\n   this.#areaStep(host=>frameSteps.sceneNativeFrameStep025(host,dt));\n   this.#areaStep(host=>frameSteps.sceneNativeFrameStep026(host,dt));\n   this.#areaStep(host=>frameSteps.sceneNativeFrameStep027(host,dt));\n   this.#areaStep(host=>frameSteps.sceneNativeFrameStep028(host,dt));\n   this.#areaStep(host=>frameSteps.sceneNativeFrameStep029(host,dt));\n   this.#areaStep(host=>frameSteps.sceneNativeFrameStep030(host,dt));\n   this.#areaStep(host=>frameSteps.sceneNativeFrameStep031(host,dt));\n   this.#areaStep(host=>frameSteps.sceneNativeFrameStep032(host,dt));\n   this.#areaStep(host=>frameSteps.sceneNativeFrameStep033(host,dt));\n   this.#areaStep(host=>frameSteps.sceneNativeFrameStep034(host,dt));\n   this.#areaStep(host=>frameSteps.sceneNativeFrameStep035(host,dt));\n   this.#areaStep(host=>frameSteps.sceneNativeFrameStep036(host,dt));\n   this.#areaStep(host=>frameSteps.sceneNativeFrameStep037(host,dt));\n   this.#areaStep(host=>frameSteps.sceneNativeFrameStep038(host,dt));\n   this.#currentStep(frameCore.sceneNativeFrameHarborholds);\n   this.#areaStep(host=>frameSteps.sceneNativeFrameStep040(host,dt));\n   this.#areaStep(host=>frameSteps.sceneNativeFrameStep041(host,dt));\n   this.#areaStep(host=>frameSteps.sceneNativeFrameStep042(host,dt));\n   this.#areaStep(host=>frameSteps.sceneNativeFrameStep043(host,dt));\n   this.#areaStep(host=>frameSteps.sceneNativeFrameStep044(host,dt));\n   this.#areaStep(host=>frameSteps.sceneNativeFrameStep045(host,dt));\n   this.#areaStep(host=>frameSteps.sceneNativeFrameStep046(host,dt));\n   this.#areaStep(host=>frameSteps.sceneNativeFrameStep047(host,dt));\n   this.#areaStep(host=>frameSteps.sceneNativeFrameStep048(host,dt));\n   this.#areaStep(host=>frameSteps.sceneNativeFrameStep049(host,dt));\n   this.#areaStep(host=>frameSteps.sceneNativeFrameStep050(host,dt));\n   this.#areaStep(host=>frameSteps.sceneNativeFrameStep051(host,dt));\n   this.#areaStep(host=>frameSteps.sceneNativeFrameStep052(host,dt));\n   this.#areaStep(host=>frameSteps.sceneNativeFrameStep053(host,dt));\n   this.#areaStep(host=>frameSteps.sceneNativeFrameStep054(host,dt));\n   this.#areaStep(host=>frameSteps.sceneNativeFrameStep055(host,dt));\n   this.#wipe();\n   // This coordinator ticks the entire campaign, including all retained road units.\n   // The published destination's road role never suppresses shared campaign work.\n   const unitWorld=false;\n   this.#currentStep(host=>frameCore.sceneNativeFrameWorldSim(host,dt,unitWorld));\n   this.#areaStep(frameCore.sceneNativeFrameQuestRescues);\n   this.#currentStep(host=>frameCore.sceneNativeFrameWorldLedger(host,unitWorld));\n   this.#areaStep(frameCore.sceneNativeFrameContagion);\n   this.#currentStep(host=>frameCore.sceneNativeFrameDeepwinter(host,unitWorld));\n   this.#areaStep(host=>frameSteps.sceneNativeFrameStep070(host,dt));\n   this.#areaStep(host=>frameSteps.sceneNativeFrameStep071(host,dt));\n   this.#areaStep(host=>frameSteps.sceneNativeFrameStep072(host,dt));\n   this.#areaStep(host=>frameSteps.sceneNativeFrameStep073(host,dt));\n   this.#areaStep(host=>frameSteps.sceneNativeFrameStep074(host,dt));\n   this.#areaStep(host=>frameSteps.sceneNativeFrameStep075(host,dt));\n   this.#areaStep(host=>frameSteps.sceneNativeFrameStep076(host,dt));\n   this.#areaStep(host=>frameSteps.sceneNativeFrameStep077(host,dt));\n   this.#areaStep(host=>frameSteps.sceneNativeFrameStep078(host,dt));\n   this.#areaStep(host=>frameSteps.sceneNativeFrameStep079(host,dt));\n   this.#areaStep(host=>frameSteps.sceneNativeFrameStep080(host,dt));\n   this.#areaStep(host=>frameSteps.sceneNativeFrameStep081(host,dt));\n   this.#areaStep(host=>frameSteps.sceneNativeFrameStep082(host,dt));\n   this.#areaStep(host=>frameSteps.sceneNativeFrameStep083(host,dt));\n   this.#areaStep(host=>frameSteps.sceneNativeFrameStep084(host,dt));\n   this.#areaStep(host=>frameSteps.sceneNativeFrameStep085(host,dt));\n   this.#areaStep(host=>frameSteps.sceneNativeFrameStep086(host,dt));\n   this.#areaStep(host=>frameSteps.sceneNativeFrameStep087(host,dt));\n   this.#areaStep(host=>frameSteps.sceneNativeFrameStep088(host,dt));\n   this.#areaStep(host=>frameSteps.sceneNativeFrameStep089(host,dt));\n   this.#areaStep(host=>frameSteps.sceneNativeFrameStep090(host,dt));\n   this.#areaStep(host=>frameSteps.sceneNativeFrameStep091(host,dt));\n   this.#areaStep(host=>frameSteps.sceneNativeFrameStep092(host,dt));\n   this.#currentStep(host=>frameCore.sceneNativeFrameBulletins(host,unitWorld));\n   this.#currentStep(host=>frameCore.sceneNativeFrameWorldBridges(host,unitWorld));\n   this.#areaStep(frameCore.sceneNativeFrameWarbandMarches);\n   this.#currentStep(host=>frameCore.sceneNativeFrameWorldMints(host,dt,unitWorld));\n   this.#combatStep(combat=>combat.framePreActors(dt));\n   this.#combatStep(combat=>combat.frameActors(dt,rawDt));\n   this.#combatStep(combat=>combat.frameEffects(dt));\n   this.#combatStep(combat=>combat.frameLateBodies(dt));\n   const rows=coordinator.residentAreas().map(area=>this.#owner(area.combat));for(const owner of rows){if((Reflect.apply(this.#retiredVoyage,coordinator,[owner.input.combat])||Reflect.apply(this.#retiredGround,coordinator,[owner.input.combat])))continue;owner.#run(()=>frameCore.sceneNativeFrameRoadTail(Object.freeze(owner.#dynamicHost(roadFrameKeys)),dt,doorPressIntents));}\n   const roadOwner=(Reflect.apply(this.#retiredVoyage,coordinator,[this.input.combat])||Reflect.apply(this.#retiredGround,coordinator,[this.input.combat]))?this.#published():this;if(roadOwner.#road.link)roadOwner.drainShardRoads();\n  } finally {campaignPhaseOwner.delete(coordinator);ticking.delete(coordinator);}\n }\n\n isCampaignFrameOwner():boolean{this.#assertInstalled();const {coordinator,combat}=this.input;return (campaignPhaseOwner.get(coordinator)??coordinator.published.combat)===combat;}\n get shardRoadView():ShardRoadHost<NativeAreaRoadDestination>|undefined{this.#assertInstalled();return this.#road.view;}\n cacheShardRoadHost(host:ShardRoadHost<NativeAreaRoadDestination>):void{this.#assertInstalled();this.#road.cache(host);}\n enableHostedRoads():void{this.#assertInstalled();this.#road.enableHosted();}\n drainShardRoads():ReturnType<NativeRoadOwnerBridge['drain']>{this.#assertInstalled();return this.#road.drain();}\n scanShardRoads():void{this.#run(()=>this.#road.scan(this.#scanHost));}\n updateModeRespawn(...args:Parameters<NativeFrameMethod<typeof services.sceneUpdateModeRespawn>>):ReturnType<NativeFrameMethod<typeof services.sceneUpdateModeRespawn>>{return this.#run(()=>{return services.sceneUpdateModeRespawn(this.#host(),...args);});}\n updateBountyBoard(...args:Parameters<NativeFrameMethod<typeof services.sceneUpdateBountyBoard>>):ReturnType<NativeFrameMethod<typeof services.sceneUpdateBountyBoard>>{return this.#run(()=>{return services.sceneUpdateBountyBoard(this.#host(),...args);});}\n updateSail(...args:Parameters<NativeFrameMethod<typeof services.sceneUpdateSail>>):ReturnType<NativeFrameMethod<typeof services.sceneUpdateSail>>{return this.#run(()=>{return services.sceneUpdateSail(this.#host(),...args);});}\n updateDelver(...args:Parameters<NativeFrameMethod<typeof services.sceneUpdateDelver>>):ReturnType<NativeFrameMethod<typeof services.sceneUpdateDelver>>{return this.#run(()=>{return services.sceneUpdateDelver(this.#host(),...args);});}\n updateSailing(...args:Parameters<NativeFrameMethod<typeof services.sceneUpdateSailing>>):ReturnType<NativeFrameMethod<typeof services.sceneUpdateSailing>>{return this.#run(()=>{return services.sceneUpdateSailing(this.#host(),...args);});}\n performModeRespawn(...args:Parameters<NativeFrameMethod<typeof services.scenePerformModeRespawn>>):ReturnType<NativeFrameMethod<typeof services.scenePerformModeRespawn>>{return this.#run(()=>{return this.input.coordinator.current.combat.campaignTransitions.performModeRespawn(...args);});}\n requestMeta(...args:Parameters<NativeFrameMethod<typeof services.sceneRequestMeta>>):ReturnType<NativeFrameMethod<typeof services.sceneRequestMeta>>{return this.#run(()=>{return services.sceneRequestMeta(this.#host(),...args);});}\n enterSailing(...args:Parameters<NativeFrameMethod<typeof services.sceneEnterSailing>>):ReturnType<NativeFrameMethod<typeof services.sceneEnterSailing>>{return this.#run(()=>{return services.sceneEnterSailing(this.#host(),...args);});}\n descend(...args:Parameters<NativeFrameMethod<typeof services.sceneDescend>>):ReturnType<NativeFrameMethod<typeof services.sceneDescend>>{return this.#run(()=>{return services.sceneDescend(this.#host(),...args);});}\n landAshore(...args:Parameters<NativeFrameMethod<typeof services.sceneLandAshore>>):ReturnType<NativeFrameMethod<typeof services.sceneLandAshore>>{return this.#run(()=>{return services.sceneLandAshore(this.#host(),...args);});}\n enterSidezone(...args:Parameters<NativeFrameMethod<typeof travel.sceneEnterSidezone>>):ReturnType<NativeFrameMethod<typeof travel.sceneEnterSidezone>>{return this.#run(()=>{return travel.sceneEnterSidezone(this.#host(),...args);});}\n onHoldfastDwell(...args:Parameters<NativeFrameMethod<typeof travel.sceneOnHoldfastDwell>>):ReturnType<NativeFrameMethod<typeof travel.sceneOnHoldfastDwell>>{return this.#run(()=>{return travel.sceneOnHoldfastDwell(this.#host(),...args);});}\n realmGates(...args:Parameters<NativeFrameMethod<typeof travel.sceneRealmGates>>):ReturnType<NativeFrameMethod<typeof travel.sceneRealmGates>>{return this.#run(()=>{return this.#gateRows(travel.sceneRealmGates(this.#host(),...args));});}\n travelThrough(...args:Parameters<NativeFrameMethod<typeof travel.sceneTravelThrough>>):ReturnType<NativeFrameMethod<typeof travel.sceneTravelThrough>>{return this.#run(()=>{return travel.sceneTravelThrough(this.#host(),...args);});}\n updateTownPortals(...args:Parameters<NativeFrameMethod<typeof travel.sceneUpdateTownPortals>>):ReturnType<NativeFrameMethod<typeof travel.sceneUpdateTownPortals>>{return this.#run(()=>{return travel.sceneUpdateTownPortals(this.#host(),...args);});}\n applyAction(...args:Parameters<NativeFrameMethod<typeof travel.sceneApplyAction>>):ReturnType<NativeFrameMethod<typeof travel.sceneApplyAction>>{return this.#run(()=>{this.#selectedSeat(args[0]);return travel.sceneApplyAction(this.#host(),...args);});}\n enterDimension(...args:Parameters<NativeFrameMethod<typeof travel.sceneEnterDimension>>):ReturnType<NativeFrameMethod<typeof travel.sceneEnterDimension>>{return this.#run(()=>{return travel.sceneEnterDimension(this.#host(),...args);});}\n enterDemonRealm(...args:Parameters<NativeFrameMethod<typeof travel.sceneEnterDemonRealm>>):ReturnType<NativeFrameMethod<typeof travel.sceneEnterDemonRealm>>{return this.#run(()=>{return this.#withRealmEntry(\"realmContext\",()=>travel.sceneEnterDemonRealm(this.#host(),...args));});}\n enterCrusadeSanctum(...args:Parameters<NativeFrameMethod<typeof travel.sceneEnterCrusadeSanctum>>):ReturnType<NativeFrameMethod<typeof travel.sceneEnterCrusadeSanctum>>{return this.#run(()=>{return this.#withRealmEntry(\"crusadeRealmContext\",()=>travel.sceneEnterCrusadeSanctum(this.#host(),...args));});}\n enterNecropolis(...args:Parameters<NativeFrameMethod<typeof travel.sceneEnterNecropolis>>):ReturnType<NativeFrameMethod<typeof travel.sceneEnterNecropolis>>{return this.#run(()=>{return this.#withRealmEntry(\"necropolisRealmContext\",()=>travel.sceneEnterNecropolis(this.#host(),...args));});}\n enterFractureRift(...args:Parameters<NativeFrameMethod<typeof travel.sceneEnterFractureRift>>):ReturnType<NativeFrameMethod<typeof travel.sceneEnterFractureRift>>{return this.#run(()=>{return this.#withRealmEntry(\"fractureRealmContext\",()=>travel.sceneEnterFractureRift(this.#host(),...args));});}\n enterCourtDomain(...args:Parameters<NativeFrameMethod<typeof travel.sceneEnterCourtDomain>>):ReturnType<NativeFrameMethod<typeof travel.sceneEnterCourtDomain>>{return this.#run(()=>{return travel.sceneEnterCourtDomain(this.#host(),...args);});}\n beginWraithsailBoarding(...args:Parameters<NativeFrameMethod<typeof travel.sceneBeginWraithsailBoarding>>):ReturnType<NativeFrameMethod<typeof travel.sceneBeginWraithsailBoarding>>{return this.#run(()=>{return travel.sceneBeginWraithsailBoarding(this.#host(),...args);});}\n resumeSpawn(...args:Parameters<NativeFrameMethod<typeof travel.sceneResumeSpawn>>):ReturnType<NativeFrameMethod<typeof travel.sceneResumeSpawn>>{return this.#run(()=>{return travel.sceneResumeSpawn(this.#host(),...args);});}\n applyActionAs(...args:Parameters<NativeFrameMethod<typeof travel.sceneApplyActionAs>>):ReturnType<NativeFrameMethod<typeof travel.sceneApplyActionAs>>{return this.#run(()=>{this.#selectedSeat(args[0]);return travel.sceneApplyActionAs(this.#host(),...args);});}\n enterRealmArena(...args:Parameters<NativeFrameMethod<typeof travel.sceneEnterRealmArena>>):ReturnType<NativeFrameMethod<typeof travel.sceneEnterRealmArena>>{return this.#run(()=>{return this.#realmKind?this.#realm.enter(this.#realmKind,own<string>(args[0],\"caveId\"),()=>travel.sceneEnterRealmArena(this.#host(),...args)):travel.sceneEnterRealmArena(this.#host(),...args);});}\n resumeCaveLadder(...args:Parameters<NativeFrameMethod<typeof travel.sceneResumeCaveLadder>>):ReturnType<NativeFrameMethod<typeof travel.sceneResumeCaveLadder>>{return this.#run(()=>{return travel.sceneResumeCaveLadder(this.#host(),...args);});}\n startCaravan(...args:Parameters<NativeFrameMethod<typeof travel.sceneStartCaravan>>):ReturnType<NativeFrameMethod<typeof travel.sceneStartCaravan>>{return this.#run(()=>{return travel.sceneStartCaravan(this.#host(),...args);});}\n travelToWaypoint(...args:Parameters<NativeFrameMethod<typeof travel.sceneTravelToWaypoint>>):ReturnType<NativeFrameMethod<typeof travel.sceneTravelToWaypoint>>{return this.#run(()=>{return travel.sceneTravelToWaypoint(this.#host(),...args);});}\n realmArenaWake(...args:Parameters<NativeFrameMethod<typeof travel.sceneRealmArenaWake>>):ReturnType<NativeFrameMethod<typeof travel.sceneRealmArenaWake>>{return this.#run(()=>{return this.#realm.wake(()=>travel.sceneRealmArenaWake(this.#host(),...args));});}\n chartCourse(...args:Parameters<NativeFrameMethod<typeof uiTravel.sceneChartCourse>>):ReturnType<NativeFrameMethod<typeof uiTravel.sceneChartCourse>>{return this.#run(()=>uiTravel.sceneChartCourse(this.#host(),...args));}\n sailTo(...args:Parameters<NativeFrameMethod<typeof uiTravel.sceneSailTo>>):ReturnType<NativeFrameMethod<typeof uiTravel.sceneSailTo>>{return this.#run(()=>uiTravel.sceneSailTo(this.#host(),...args));}\n}\n",
      "beforeHash": "9202b11dde23442157a31057e74d261014c7a68cf469466f25bfaba3dfd92a2f",
      "afterHash": "d41081b0a47d5685b0196a13e05ad7c6e54e7993260ee8a45b21f1696a3cb4dd",
      "normalizedBefore": "9202b11dde23442157a31057e74d261014c7a68cf469466f25bfaba3dfd92a2f",
      "normalizedAfter": "d41081b0a47d5685b0196a13e05ad7c6e54e7993260ee8a45b21f1696a3cb4dd"
    },
    {
      "file": "src/worldmass/nativeAreaSceneTransitionCoordinator.ts",
      "before": "import type {NativeZoneMemory} from '../engine/nativeSceneMemory';\nimport {installNativeGroundCoordinatorResolver,type NativeGroundCoordinatorCalls} from './nativeOdysseyGroundRegistration';\nimport {NativeAreaSceneQuests} from './nativeAreaSceneQuests';\nimport {ODYSSEY_FACTIONS,odysseyQuestId} from '../data/odyssey';\nimport {ZONE_MEMORY_CFG} from '../engine/zonecontents';\nimport type {NativeOdysseyGroundRefresh,NativeOdysseyGroundTarget} from './nativeOdysseyGroundRefresh';\nimport {VOYAGE_ZONE_ID} from '../world/voyage';\nimport {sceneAbandonVoyageAtSurface} from '../engine/nativeSceneVoyageArrival';\nimport {sceneNecropolisSurfaceArrival} from '../engine/nativeSceneRealmArrival';\nimport {installNativeHostedCoordinator} from './nativeHostedSerialization';\nimport {extendNativeAreaUIActions} from './nativeAreaUIActions';\nimport {extendNativeAreaMenuQueries} from './nativeAreaMenuQueries';\nimport {extendNativeAreaMenuPublication} from './nativeAreaMenuPublication';\nimport {extendNativeAreaViewQueries} from './nativeAreaViewQueries';\nimport {extendNativeAreaPublication} from './nativeAreaScenePublication';\nimport {NativeAreaSceneEcology} from './nativeAreaSceneEcology';\nimport {LitePool} from '../engine/lite';\nimport {sceneCaptureLiteCarry,type NativeLiteCarryRow} from '../engine/nativeSceneEcology';\nimport {assertNativeCharacterResume,type NativeCharacterResumeReceipt,type NativeAreaCharacterResume} from './nativeAreaCharacterResume';\nimport {sceneCaptureZoneMemory} from '../engine/nativeSceneDepartureMemory';\n/** Retained-area selection and synchronous physical handoff. Unlike legacy\n * World.loadZone, revisits retain the area's actual stores and controllers.\n * Destination creation and complete frame/UI publication are separate duties. */\nimport {World,isNativeWorld,type Seat} from '../engine/world';\nimport {assertNativeRetainedMassState} from './nativeAreaRetainedMassState';\nimport {saveCharacter as saveNativeCharacter} from '../meta/character';\nimport {nativeSimView,type NativePopulationHost} from '../engine/nativePopulationResolution';\nimport type {Actor} from '../engine/actor';\nimport type {TraversalState} from '../engine/traversal';\nimport type {RoadTicket,ShardWorldLink,LandingSpot} from '../engine/shardUnits';\nimport type {NativeAreaRoadDestination} from './nativeAreaRoadDestination';\nimport {assertNativeCombatOwnerEntry,assertNativeCombatOperationsIdle,type NativeAreaCombatOwnerEntry} from './nativeAreaCombatOperation';\nimport {retireNativeRetainedWriter} from './nativeAreaRetainedLifetime';\nimport {angleTo,vec,rand,type Vec2} from '../core/math';\nimport {NativeAreaScenePreparation,isNativeAreaScenePreparation} from './nativeAreaScenePreparation';\nimport {nativeBirthAsyncResult,NativeAreaScenePopulation} from './nativeAreaScenePopulation';\nimport {NativeAreaSceneCombatCampaign} from './nativeAreaSceneCombatCampaign';\nimport {harborLandPartyAt,type NativeSceneHarborHost} from '../engine/nativeSceneHarbor';\nimport {NativeAreaSceneOngoing,type NativeAreaOngoingCampaign} from './nativeAreaSceneOngoing';\nimport {NativeAreaSceneCombat,isNativeAreaSceneCombat} from './nativeAreaSceneCombat';\nimport {NativeAreaActorAuthority,type NativeAreaAuthorityBinding} from './nativeAreaActorAuthority';\nimport {NativeAreaSceneMemory} from './nativeAreaSceneMemory';\nimport {NativeAreaSceneDepartureMemory} from './nativeAreaSceneDepartureMemory';\nimport {NativeAreaMemoryRegistry} from './nativeAreaMemoryRegistry';\nimport {NativeAreaRoadContext,installNativeRoadLink} from './nativeAreaRoadContext';\nimport {NativeAreaSceneDirectory} from './nativeAreaSceneDirectory';\nimport type {NativeAreaDirectoryView} from './nativeAreaDirectoryView';\nexport interface NativeAreaTransitionInput {campaign:NativeAreaOngoingCampaign;characterWriter:World;authority:NativeAreaActorAuthority<object>;memoryRegistry:NativeAreaMemoryRegistry}\nexport interface NativeRoadDrainResult {readonly seatId:string;readonly dest:string;readonly outcome:'moved'|'same-area'|'duplicate'|'failed';readonly error?:unknown}\ninterface RoadReceipt {readonly ticket:RoadTicket<NativeAreaRoadDestination>;readonly source:Registered;readonly capture:SeatCapture;readonly seat:Seat;readonly id:string;readonly dest:string;readonly instance:string|undefined;readonly origin:NativeAreaTransitionFrame|null;used:boolean}\ninterface ActiveRoad {readonly receipt:RoadReceipt;readonly frame:Frame;body:Actor;destination:Registered|null;readonly woke:boolean}\nexport interface NativeRoadQueueBridge {enableHosted():void;enqueue(ticket:RoadTicket<NativeAreaRoadDestination>):void;drain():readonly NativeRoadDrainResult[]}\nconst roadQueueIssuers=new WeakMap<NativeAreaSceneTransitionCoordinator,(owner:object,combat:NativeAreaSceneCombat)=>NativeRoadQueueBridge>();\nconst roadQueueBridges=new WeakMap<NativeAreaSceneCombat,NativeRoadQueueBridge>();\nexport function issueNativeRoadQueueBridge(coordinator:NativeAreaSceneTransitionCoordinator,owner:object,combat:NativeAreaSceneCombat,entry:NativeAreaCombatOwnerEntry):NativeRoadQueueBridge{\n if(!isNativeAreaSceneTransitionCoordinator(coordinator)||!isNativeAreaSceneCombat(combat)||!owner||typeof owner!=='object')throw Error('Native road queue needs actual owners');assertNativeCombatOwnerEntry(combat,entry);\n for(const key of ['campaign','characterWriter','authority'] as const)if(combat.input[key]!==coordinator.input[key])throw Error('Native road queue roots differ: '+key);\n if(roadQueueBridges.has(combat))throw Error('Native road queue bridge already issued');const bridge=roadQueueIssuers.get(coordinator)!(owner,combat);roadQueueBridges.set(combat,bridge);return bridge;\n}\nexport type NativeRealmContextKey='realmContext'|'crusadeRealmContext'|'necropolisRealmContext'|'fractureRealmContext';\nexport interface NativeRealmEntryBridge {enter<T>(key:NativeRealmContextKey,destination:string,action:()=>T):T;wake(action:()=>void):void}\nconst realmEntryIssuers=new WeakMap<NativeAreaSceneTransitionCoordinator,(owner:object,combat:NativeAreaSceneCombat)=>NativeRealmEntryBridge>();\nconst realmEntryBridges=new WeakMap<NativeAreaSceneCombat,NativeRealmEntryBridge>();\n/** This bridge is retained only by the genuine CampaignFrame with its private\n * operation entry. A plan's original context write and stamp still run first. */\nexport function issueNativeRealmEntryBridge(coordinator:NativeAreaSceneTransitionCoordinator,owner:object,combat:NativeAreaSceneCombat,entry:NativeAreaCombatOwnerEntry):NativeRealmEntryBridge{\n if(!isNativeAreaSceneTransitionCoordinator(coordinator)||!isNativeAreaSceneCombat(combat)||!owner||typeof owner!=='object')throw Error('Native realm entry needs actual owners');assertNativeCombatOwnerEntry(combat,entry);\n for(const key of ['campaign','characterWriter','authority'] as const)if(combat.input[key]!==coordinator.input[key])throw Error('Native realm entry roots differ');\n if(realmEntryBridges.has(combat))throw Error('Native realm entry bridge already issued');const bridge=realmEntryIssuers.get(coordinator)!(owner,combat);realmEntryBridges.set(combat,bridge);return bridge;\n}\ninterface RealmEntry {readonly frame:Frame;readonly source:Registered;readonly key:NativeRealmContextKey;readonly value:NonNullable<World[NativeRealmContextKey]>;readonly destination:string;prepared:NativeAreaSceneCombat|null;definition:World['zone']|null;previous:unknown;revisit:boolean;completed:boolean;wakeCalled:boolean;consumed:boolean}\ninterface GroundPending {data:NativeOdysseyGroundTarget;definition:World['zone'];row?:Registered;awaitVisit:boolean;preserved?:NativeZoneMemory}\ninterface Registered {readonly ongoing:NativeAreaSceneOngoing;readonly combat:NativeAreaSceneCombat;readonly memory:NativeAreaSceneMemory;readonly departure:NativeAreaSceneDepartureMemory;readonly roads:NativeAreaRoadContext;readonly binding:NativeAreaAuthorityBinding<object>;readonly id:string}\nexport interface NativeAreaTransitionFrame {readonly source:NativeAreaSceneOngoing;readonly current:NativeAreaSceneOngoing;readonly seats:readonly Seat[];readonly active:boolean}\ninterface Frame {source:Registered;current:Registered;seats:readonly Seat[];active:boolean;view:NativeAreaTransitionFrame}\nconst arrayPush=Array.prototype.push,arraySplice=Array.prototype.splice,arrayIncludes=Array.prototype.includes,arrayIndexOf=Array.prototype.indexOf;\nconst authorityTransfer=NativeAreaActorAuthority.prototype.transfer,authorityFinalPhysical=NativeAreaActorAuthority.prototype.assertFinalPhysical,authorityFinalClaimed=NativeAreaActorAuthority.prototype.assertFinalClaimed;\nconst partySelectActors=NativeAreaActorAuthority.prototype.selectActors,partyFinalSelections=NativeAreaActorAuthority.prototype.assertFinalSelections;\nconst coordinatedWriters=new WeakMap<World,NativeAreaSceneTransitionCoordinator>();\nconst actualCoordinators=new WeakSet<object>();\nexport interface NativeTransitionOwnerBridge {nemesisDeparture():Actor;selectDescentRecovery(run:NonNullable<World['descentRun']>):{combat:NativeAreaSceneCombat;player:Actor};partySeats():readonly Seat[];loadPartyZone(zoneId:string,from?:string):void;bindTraversal(record:TraversalState):void;finishTraversal(record:TraversalState):void;runTraversalStep(action:()=>void):void}\nconst bridgeIssuers=new WeakMap<NativeAreaSceneTransitionCoordinator,(owner:object,combat:NativeAreaSceneCombat)=>NativeTransitionOwnerBridge>();\nconst combatBridges=new WeakMap<NativeAreaSceneCombat,NativeTransitionOwnerBridge>();\n/** The privately issued operation entry, not structural shape, authorizes this\n * one bridge. Only the actual transition owner retains its resulting object. */\nexport function issueNativeTransitionOwnerBridge(coordinator:NativeAreaSceneTransitionCoordinator,owner:object,combat:NativeAreaSceneCombat,entry:NativeAreaCombatOwnerEntry):NativeTransitionOwnerBridge {\n if(!isNativeAreaSceneTransitionCoordinator(coordinator)||!isNativeAreaSceneCombat(combat)||!owner||typeof owner!=='object')throw Error('Native transition bridge needs actual runtime owners');assertNativeCombatOwnerEntry(combat,entry);\n for(const key of ['campaign','characterWriter','authority'] as const)if(combat.input[key]!==coordinator.input[key])throw Error('Native transition bridge roots differ: '+key);\n if(combatBridges.has(combat))throw Error('Native combat already issued its transition bridge');const bridge=bridgeIssuers.get(coordinator)!(owner,combat);combatBridges.set(combat,bridge);return bridge;\n}\nexport function hasNativeAreaSceneTransitionCoordinator(writer:World):boolean{return coordinatedWriters.has(writer);}\nexport function isNativeAreaSceneTransitionCoordinator(value:unknown):value is NativeAreaSceneTransitionCoordinator{return !!value&&typeof value==='object'&&actualCoordinators.has(value);}\nfunction own<T>(value:object,key:PropertyKey):T {const d=Object.getOwnPropertyDescriptor(value,key);if(!d||!Object.hasOwn(d,'value'))throw Error('Native transition requires an ordinary own-data field: '+String(key));return d.value as T;}\nfunction optionalOwn<T>(value:object,key:PropertyKey):T|undefined {const d=Object.getOwnPropertyDescriptor(value,key);if(!d)return undefined;if(!Object.hasOwn(d,'value'))throw Error('Native transition refuses an accessor field: '+String(key));return d.value as T;}\nfunction writable(value:object,key:PropertyKey):void {const d=Object.getOwnPropertyDescriptor(value,key);if(d?(!Object.hasOwn(d,'value')||!d.writable):!Object.isExtensible(value))throw Error('Native transition needs writable ordinary field: '+String(key));}\nfunction mutableCensus(value:unknown):asserts value is Actor[]{if(!Array.isArray(value)||Object.getPrototypeOf(value)!==Array.prototype||Object.hasOwn(value,'includes')||Object.getOwnPropertyDescriptor(Array.prototype,'includes')?.value!==arrayIncludes)throw Error('Native transition needs an ordinary raw census');const length=Object.getOwnPropertyDescriptor(value,'length');if(!length?.writable||!Object.isExtensible(value))throw Error('Native transition needs a mutable raw census');for(let i=0;i<value.length;i++){const d=Object.getOwnPropertyDescriptor(value,i);if(!d||!Object.hasOwn(d,'value')||!d.writable||!d.configurable)throw Error('Native transition needs mutable census elements');}}\ninterface SeatCapture {readonly campaign:NativeAreaOngoingCampaign;readonly seats:readonly Seat[];readonly rows:readonly {seat:Seat;id:string;body:Actor}[]}\ninterface TraversalContinuation {readonly origin:NativeAreaTransitionFrame;readonly record:TraversalState;readonly source:Registered;current:Registered;seats:readonly Seat[];readonly swap:(()=>void)|undefined;readonly done:(()=>void)|undefined;swapWrapper:(()=>void)|undefined;doneWrapper:(()=>void)|undefined;swapUsed:boolean;doneUsed:boolean;expired:boolean}\nfunction rawValues<T>(value:unknown):T[]{if(!Array.isArray(value))throw Error('Native transition needs a raw array');const n=own<number>(value,'length'),out:T[]=[];for(let i=0;i<n;i++)out.push(own<T>(value,i));return out;}\nfunction captureSeats(campaign:NativeAreaOngoingCampaign,seats?:readonly Seat[]):SeatCapture {const original=campaign.seats,all=rawValues<Seat>(original),ids=new Set<string>(),selected=seats??all,rows:{seat:Seat;id:string;body:Actor}[]=[];for(const seat of all){const id=own<string>(seat,'id');if(typeof id!=='string'||ids.has(id))throw Error('Native transition needs unique actual seat IDs');ids.add(id);}for(const seat of selected){if(!all.includes(seat))throw Error('Native transition cohort seat left campaign');rows.push({seat,id:own<string>(seat,'id'),body:own<Actor>(seat,'actor')});}return {campaign,seats:original,rows};}\nfunction finalSeats(capture:SeatCapture):void {if(capture.campaign.seats!==capture.seats)throw Error('Native transition campaign seats replaced during admission');const members=rawValues<Seat>(capture.seats);for(const row of capture.rows)if(!members.includes(row.seat)||own(row.seat,'id')!==row.id||own(row.seat,'actor')!==row.body)throw Error('Native transition seat changed during admission');}\n/** One coordinator is retained beside the one real character writer. */\ndeclare const packedTravelReceipt:unique symbol;\nexport interface NativePackedTravelReceipt {readonly [packedTravelReceipt]:true}\ninterface PackedTravel {active:boolean;consumed:boolean;source:NativeAreaSceneEcology;destination:NativeAreaSceneEcology;actors:readonly Actor[];ids:readonly number[];authority:NativeAreaTransitionInput['authority'];binding:Registered['binding']}\nconst packedTravel=new WeakMap<object,PackedTravel>();\nconst freePacked=LitePool.prototype.free;\nexport function assertNativePackedTravel(token:NativePackedTravelReceipt,destination:NativeAreaSceneEcology):void{const r=packedTravel.get(token);if(!r?.active||r.consumed||r.destination!==destination)throw Error('Native packed arrival is foreign or expired');}\nexport function consumeNativePackedTravel(token:NativePackedTravelReceipt,destination:NativeAreaSceneEcology):NativeLiteCarryRow[]{const r=packedTravel.get(token);if(!r?.active||r.consumed||r.destination!==destination)throw Error('Native packed arrival is foreign or expired');Reflect.apply(authorityFinalClaimed,r.authority,[r.binding,r.actors]);for(let i=0;i<r.actors.length;i++)if(own(r.actors[i],'id')!==r.ids[i])throw Error('Native packed keeper identity changed');const state=r.source.input.state,pool=own<LitePool>(state,'lite'),kinds=own<World['liteKinds']>(state,'liteKinds');if(pool===own(destination.input.state,'lite')||kinds===own(destination.input.state,'liteKinds'))throw Error('Native packed areas cannot share source stores');if(!(pool instanceof LitePool)||!Array.isArray(kinds)||Object.getPrototypeOf(kinds)!==Array.prototype)throw Error('Native packed source stores differ');const selected=new Set(r.ids),rows=sceneCaptureLiteCarry(r.source.host,pool).filter(row=>selected.has(row.owner));Reflect.apply(authorityFinalClaimed,r.authority,[r.binding,r.actors]);if(own(state,'lite')!==pool||own(state,'liteKinds')!==kinds)throw Error('Native packed source changed during capture');for(let i=0;i<r.actors.length;i++)if(own(r.actors[i],'id')!==r.ids[i])throw Error('Native packed keeper changed during capture');r.consumed=true;for(let i=0;i<pool.used;i++)if(pool.alive[i]&&selected.has(pool.owner[i]))Reflect.apply(freePacked,pool,[i]);return rows;}\nconst groundResolvers=new WeakMap<NativeAreaSceneTransitionCoordinator,NativeGroundCoordinatorCalls>();\ninstallNativeGroundCoordinatorResolver(owner=>{if(!isNativeAreaSceneTransitionCoordinator(owner))throw Error('Native ground needs the genuine coordinator');let calls=groundResolvers.get(owner);if(!calls){calls=Object.freeze({assertQuests:(quests:NativeAreaSceneQuests)=>Reflect.apply(groundMethods.assertQuests,owner,[quests]),capture:(memory:NativeAreaSceneMemory)=>Reflect.apply(groundMethods.capture,owner,[memory]),save:()=>Reflect.apply(groundMethods.save,owner,[]),retirement:(memory:NativeAreaSceneMemory)=>Reflect.apply(groundMethods.retirement,owner,[memory]),areaRetirement:(area:NativeAreaSceneOngoing)=>Reflect.apply(groundMethods.areaRetirement,owner,[area])});groundResolvers.set(owner,calls);}return calls;});\nexport class NativeAreaSceneTransitionCoordinator {\n readonly input:Readonly<NativeAreaTransitionInput>;\n readonly #groundCalls={registryBind:NativeAreaMemoryRegistry.prototype.bindGroundRefresh,bind:NativeAreaSceneQuests.prototype.bindGroundReset,release:NativeAreaScenePreparation.prototype.releaseGround,forget:NativeAreaMemoryRegistry.prototype.unregisterGround};\n readonly #grounds=new Map<string,GroundPending>();readonly #retiredGrounds=new WeakSet<NativeAreaSceneCombat>();#groundRegistration:NativeAreaSceneQuests|null=null;#retiringGround:Registered|null=null;\n readonly #lifecycle={packed:NativeAreaSceneEcology.prototype.withPackedArrival,release:NativeAreaActorAuthority.prototype.release,unregister:NativeAreaActorAuthority.prototype.unregister,discardRestore:NativeAreaMemoryRegistry.prototype.discardProvisionalRestore,setRestore:NativeAreaScenePreparation.prototype.setProvisionalRestore,finishRestore:NativeAreaScenePreparation.prototype.finishProvisionalRestore,preparation:NativeAreaScenePreparation.prototype.retire,authority:NativeAreaActorAuthority.prototype.retire,memory:NativeAreaMemoryRegistry.prototype.retire,memoryIdle:NativeAreaMemoryRegistry.prototype.assertRetirable,memoryUnregister:NativeAreaMemoryRegistry.prototype.unregister,releaseVoyage:NativeAreaScenePreparation.prototype.releaseVoyage,population:NativeAreaScenePopulation.prototype.retire,deeds:NativeAreaSceneCombatCampaign.prototype.retireCallbacks};\n #voyageArea:Registered|null=null;#voyageCompleted:Registered|null=null;#retiringVoyage:Registered|null=null;readonly #retiredVoyages=new WeakSet<NativeAreaSceneCombat>();\n #voyageCrossing:{source:Registered;destinationId:string;run:World['voyage'];stash:World['wraithsailSeaStash'];surface:boolean;surfaceHandled:boolean}|null=null;#voyageArrival:NativeAreaSceneCombat|null=null;\n readonly #areas=new Map<string,Registered>();readonly #combats=new WeakMap<NativeAreaSceneCombat,Registered>();\n readonly #projection=new Map<string,PropertyDescriptor>();\n readonly #previousProjection=new Map<string,PropertyDescriptor|undefined>();\n #retired=false;#retirement:readonly string[]=Object.freeze([]);\n readonly #directories=new WeakMap<NativeAreaSceneCombat,NativeAreaSceneDirectory>();\n #restore:{owner:NativeAreaCharacterResume;source:Registered;arriving:boolean;token?:NativeCharacterResumeReceipt}|null=null;\n #realmEntry:RealmEntry|null=null;\n readonly #realmContexts=new WeakMap<NativeAreaSceneCombat,{key:NativeRealmContextKey;definition:World['zone'];value:unknown}>();\n #nemesisDeparture:{frame:Frame;source:Registered;capture:SeatCapture;seat:Seat;body:Actor}|null=null;\n #published:Registered|null=null;#frame:Frame|null=null;#moving=false;#partyMoving=false;#preparation:NativeAreaScenePreparation|null=null;\n readonly #traversals=new WeakMap<TraversalState,TraversalContinuation>();\n #executingTraversalCallback:TraversalContinuation|null=null;\n #traversalStep:{continuation:TraversalContinuation;finished:boolean}|null=null;\n #traversalValue:TraversalState|null=null;\n readonly #roadQueue:RoadReceipt[]=[];readonly #deferredRoadDispatch:{source:Registered;zoneId:string;fn:(view:NativeAreaDirectoryView)=>unknown}[]=[];\n readonly #roadLinks=new WeakMap<NativeAreaSceneCombat,ShardWorldLink<NativeAreaRoadDestination,NativeAreaDirectoryView>>();readonly #roadInstances=new Map<string,string|undefined>();\n #hostedRoads=false;#roadKeeper:Registered|null=null;#roadDraining=false;#activeRoad:ActiveRoad|null=null;#roadCallback:ActiveRoad|null=null;\n constructor(raw:NativeAreaTransitionInput){\n  const campaign=own<NativeAreaOngoingCampaign>(raw,'campaign'),characterWriter=own<World>(raw,'characterWriter'),authority=own<NativeAreaActorAuthority<object>>(raw,'authority'),memoryRegistry=own<NativeAreaMemoryRegistry>(raw,'memoryRegistry');\n  if(!isNativeWorld(characterWriter)||!(authority instanceof NativeAreaActorAuthority)||!(memoryRegistry instanceof NativeAreaMemoryRegistry)||memoryRegistry.writer!==characterWriter||authority.campaign!==campaign)throw Error('Native transition needs the actual writer, memory registry and campaign authority');\n  assertNativeRetainedMassState(characterWriter);\n  if(characterWriter.account!==campaign.account||characterWriter.localSeat!==campaign.localSeat||characterWriter.sim!==campaign.sim||characterWriter.zoneMap!==campaign.zoneMap||characterWriter.caveMap!==campaign.caveMap)throw Error('Native transition campaign differs from its character writer');\n  if(coordinatedWriters.has(characterWriter))throw Error('Native campaign already has a transition coordinator');\n  this.input=Object.freeze({campaign,characterWriter,authority,memoryRegistry});Object.defineProperty(this,'input',{writable:false,configurable:false});coordinatedWriters.set(characterWriter,this);actualCoordinators.add(this);Reflect.apply(this.#groundCalls.registryBind,this.input.memoryRegistry,[this]);\n  realmEntryIssuers.set(this,(owner,combat)=>Object.freeze({enter:<T>(key:NativeRealmContextKey,destination:string,action:()=>T):T=>{if(own(combat,\"campaignFrame\")!==owner)throw Error(\"Native realm entry owner changed\");const source=this.#combat(combat),frame=this.#frame;if(!frame?.active||frame.current!==source||this.#realmEntry)throw Error(\"Native realm entry needs its exact current frame\");const value=own<World[NativeRealmContextKey]>(source.combat.campaignOwner.state,key);if(!value)throw Error(\"Native realm entry lost its original context\");const receipt:RealmEntry={frame,source,key,value,destination,prepared:null,definition:null,previous:null,revisit:false,completed:false,wakeCalled:false,consumed:false};this.#realmEntry=receipt;try{return action();}finally{this.#realmEntry=null;}},wake:(action:()=>void):void=>{if(own(combat,\"campaignFrame\")!==owner)throw Error(\"Native realm wake owner changed\");const r=this.#realmEntry;if(!r){action();return;}if(this.#frame!==r.frame||r.frame.current.combat!==combat||!r.consumed||r.wakeCalled||own(combat.campaignOwner.state,r.key)!==(r.completed?null:r.value))throw Error(\"Native realm wake differs from its exact arrival\");r.wakeCalled=true;if(!r.revisit)action();}}));\n  roadQueueIssuers.set(this,(owner,combat)=>{const current=()=>{if(own(combat,'campaignFrame')!==owner)throw Error('Native road queue owner changed');return this.#combat(combat);};return Object.freeze({enableHosted:()=>{current();this.#enableHostedRoads();},enqueue:(ticket:RoadTicket<NativeAreaRoadDestination>)=>this.#enqueueRoad(current(),ticket),drain:()=>{current();return this.#drainRoads();}});});\n  bridgeIssuers.set(this,(owner,combat)=>{const current=()=>{if(own(combat,'campaignTransitions')!==owner||this.#combats.get(combat)?.combat!==combat)throw Error('Native transition bridge owner was replaced or unregistered');};return Object.freeze({nemesisDeparture:()=>{current();return this.#selectNemesisDeparture(combat);},selectDescentRecovery:(run:NonNullable<World['descentRun']>)=>{current();return this.#selectDescentRecovery(run);},partySeats:()=>{current();return this.#partySeats();},loadPartyZone:(zoneId:string,from?:string)=>{current();this.#loadPartyZone(zoneId,from);},bindTraversal:(record:TraversalState)=>{current();this.#bindTraversal(record);},finishTraversal:(record:TraversalState)=>{current();this.#finishTraversal(record);},runTraversalStep:(action:()=>void):void=>{current();this.#runTraversalStep(action);}});});\n }\n attachPreparation(preparation:NativeAreaScenePreparation):(area:NativeAreaSceneOngoing)=>void {\n  if(!isNativeAreaScenePreparation(preparation)||preparation.input.coordinator!==this||preparation.input.session.campaign!==this.input.campaign||preparation.input.authority!==this.input.authority||this.#preparation)throw Error('Native transition needs its one actual campaign preparer');this.#preparation=preparation;\n  // The constructor receives this private callback once. It stages context on\n  // the authentic unresolved destination before layout, without moving authority.\n  return area=>{const r=this.#realmEntry;if(!r)return;if(this.#preparation!==preparation||!this.#moving||this.#frame!==r.frame||r.frame.current!==r.source||r.prepared||area.assembly.input.scene.zone!==r.definition||area.assembly.input.scene.zone.id!==r.destination||area.assembly.phase!=='fresh'||!isNativeAreaSceneCombat(area.combat)||area.combat.input.coordinator!==this)throw Error('Native realm preparation differs from its exact entry');if(own(r.source.combat.campaignOwner.state,r.key)!==r.value)throw Error('Native realm context changed before preparation');const state=area.combat.campaignOwner.state;writable(state,r.key);if(own(state,r.key)!==null)throw Error('Native prepared realm already owns context');Reflect.set(state,r.key,r.value);r.prepared=area.combat;};\n }\n /** Scheduler preflight is callback-free and runs before any clock write. */\n assertIdleFrame():void{this.#finishVoyage();this.#finishGrounds();if(this.#retired)throw Error('Native coordinator is retired');assertNativeRetainedMassState(this.input.characterWriter);if(this.#frame||this.#moving||this.#traversalStep||this.#roadDraining)throw Error('Native campaign frame is busy');}\n get current():NativeAreaSceneOngoing{const r=this.#frame?.current??this.#published;if(!r)throw Error('Native transition has no selected actual area');return r.ongoing;}\n get published():NativeAreaSceneOngoing{if(!this.#published)throw Error('Native transition has no published actual area');return this.#published.ongoing;}\n /** Terminal retirement: no save/capture and no native gameplay rollback. */\n retire():readonly string[] {\n  if(this.#retired)return this.#retirement;\n  if(this.#frame||this.#moving||this.#traversalStep||this.#roadDraining)throw Error('Native campaign frame is busy');assertNativeCombatOperationsIdle();Reflect.apply(this.#lifecycle.memoryIdle,this.input.memoryRegistry,[]);\n  const writer=this.input.characterWriter;\n  // Retire even if publication was corrupted. Restore only our still-installed\n  // configurable views; report newer/locked slots without overwriting them.\n  const restore=new Map<string,PropertyDescriptor|undefined>(),unrestored:string[]=[];\n  for(const [key,expected]of this.#projection){const current=Object.getOwnPropertyDescriptor(writer,key);if(current?.configurable&&current.get===expected.get&&current.set===expected.set)restore.set(key,this.#previousProjection.get(key));else unrestored.push(key);}\n  const areas=this.#preparation?Reflect.apply(this.#lifecycle.preparation,this.#preparation,[]):Object.freeze([...this.#areas.values()].map(row=>row.ongoing));\n  // No callback executes after this terminal revocation begins.\n  this.#retired=true;retireNativeRetainedWriter(writer);Reflect.apply(this.#lifecycle.authority,this.input.authority,[]);Reflect.apply(this.#lifecycle.memory,this.input.memoryRegistry,[]);\n  const traversal=this.#traversalValue;if(traversal){const continuation=this.#traversals.get(traversal);if(continuation)continuation.expired=true;}this.#traversalValue=null;\n  this.#roadQueue.length=0;this.#deferredRoadDispatch.length=0;this.#roadInstances.clear();this.#hostedRoads=false;this.#roadKeeper=null;\n  for(const area of areas){Reflect.apply(this.#lifecycle.population,area.assembly.input.population,[]);Reflect.apply(this.#lifecycle.deeds,area.combat.campaignOwner,[]);}\n  for(const [key,previous]of restore){if(previous)Object.defineProperty(writer,key,previous);else Reflect.deleteProperty(writer,key);}\n  this.#projection.clear();this.#previousProjection.clear();this.#areas.clear();this.#published=null;this.#preparation=null;this.#retirement=Object.freeze(unrestored);return this.#retirement;\n }\n /** Only exact completed sea owners may be skipped by a previously captured barrier. */\n isRetiredVoyage(combat:NativeAreaSceneCombat):boolean{return this.#retiredVoyages.has(combat);}\n assertVoyageRetirement(area:NativeAreaSceneOngoing):void {if(this.#retiringVoyage?.ongoing!==area||this.#frame||this.#moving)throw Error('Native voyage retirement needs its exact completed episode');}\n assertVoyageArrival(combat:NativeAreaSceneCombat):void {if(!this.#moving||!this.#frame?.active||this.#voyageArrival!==combat||this.#frame.current.combat!==combat)throw Error('Native voyage arrival needs its exact selected destination');}\n /** Surface consequences precede preparation as one retained phase: native\n  * stash abandonment first, then Necropolis cull. Later layout only validates. */\n #abandonVoyageSurface():void {\n  const crossing=this.#voyageCrossing;if(!crossing?.surface)return;\n  if(!this.#moving||!this.#frame?.active||this.#frame.current!==crossing.source||crossing.surfaceHandled)throw Error('Native voyage surface crossing changed');\n  if(own(crossing.source.ongoing.assembly.transition,'voyage')!==crossing.run||own(crossing.source.ongoing.assembly.input.state,'wraithsailSeaStash')!==crossing.stash)throw Error('Native voyage changed before surface abandonment');\n  crossing.surfaceHandled=true;sceneAbandonVoyageAtSurface(crossing.source.ongoing.assembly.host);\n  crossing.stash=own(crossing.source.ongoing.assembly.input.state,'wraithsailSeaStash');\n }\n prepareVoyageSurface(area:NativeAreaSceneOngoing):void {\n  Reflect.apply(NativeAreaScenePreparation.prototype.assertVoyagePreparation,this.#preparation!,[area]);const crossing=this.#voyageCrossing;if(!crossing?.surface)return;\n  if(!this.#moving||!this.#frame?.active||this.#frame.current!==crossing.source||!crossing.surfaceHandled||area.assembly.input.scene.zone.id!==crossing.destinationId||area.assembly.input.campaign!==this.input.campaign)throw Error('Native voyage surface preparation changed');\n  if(own(crossing.source.ongoing.assembly.transition,'voyage')!==crossing.run||own(crossing.source.ongoing.assembly.input.state,'wraithsailSeaStash')!==crossing.stash)throw Error('Native voyage changed after surface abandonment');\n }\n #finishVoyage():void {const row=this.#voyageCompleted;if(!row||this.#frame||this.#moving)return;if(this.#retiringVoyage)throw Error('Native voyage retirement cannot reenter');this.#retiringVoyage=row;try{assertNativeCombatOperationsIdle();this.#ready(row);if(this.#published===row||this.#voyageArea!==row)throw Error('Native voyage is still published or replaced');const captured=captureSeats(this.input.campaign),census=own<Actor[]>(row.binding.scene,'actors'),actors=rawValues<Actor>(census);if(captured.rows.some(r=>actors.includes(r.body)))throw Error('Native voyage retirement refuses occupied sea');mutableCensus(census);finalSeats(captured);Reflect.apply(authorityFinalPhysical,this.input.authority,[row.binding,actors]);\n  // Native boundless sea has no memory row; unregister before revoking the actual binding.\n  Reflect.apply(this.#lifecycle.memoryUnregister,this.input.memoryRegistry,[row.memory,()=>{finalSeats(captured);const finalRoster=rawValues<Seat>(captured.seats);if(finalRoster.length!==captured.rows.length||finalRoster.some((seat,i)=>seat!==captured.rows[i].seat))throw Error('Native voyage retirement cohort changed during final capture');Reflect.apply(authorityFinalPhysical,this.input.authority,[row.binding,actors]);if(own(row.binding.scene,'actors')!==census||rawValues<Actor>(census).some((a,i)=>a!==actors[i])||census.length!==actors.length)throw Error('Native voyage census changed during final capture');}]);\n  Reflect.apply(this.#lifecycle.releaseVoyage,this.#preparation!,[row.ongoing]);Reflect.apply(this.#lifecycle.release,this.input.authority,[row.binding,actors]);Reflect.apply(this.#lifecycle.unregister,this.input.authority,[row.binding]);Reflect.apply(this.#lifecycle.population,row.ongoing.assembly.input.population,[]);this.#areas.delete(row.id);this.#combats.delete(row.combat);this.#roadInstances.delete(row.id);this.#retiredVoyages.add(row.combat);this.#voyageArea=null;this.#voyageCompleted=null;}finally{this.#retiringVoyage=null;}\n }\n /** All real resident areas, including those continuing without an avatar. */\n\n assertGroundRegistration(quests:NativeAreaSceneQuests):void {if(this.#groundRegistration!==quests)throw Error('Native ground observer needs exact registration');}\n #bindGround(row:Registered):void {this.#groundRegistration=row.ongoing.quests;try{Reflect.apply(this.#groundCalls.bind,row.ongoing.quests,[this,(definition:World['zone'])=>this.#recordGround(row,definition)]);}finally{this.#groundRegistration=null;}const pending=this.#grounds.get(row.id);if(pending){if(pending.definition!==row.memory.definition)throw Error('Restored pending ground definition changed');pending.row=row;}}\n #recordGround(source:Registered,definition:World['zone']):void {if(this.#areas.get(source.id)!==source)throw Error('Native ground reset source is retired');this.#ready(source);const faction=ODYSSEY_FACTIONS.find(f=>'quest_'+odysseyQuestId(f.id,'leader')===definition.id);if(!faction||this.input.campaign.zoneMap[definition.id]!==definition)throw Error('Native ground reset needs exact installed definition');const row=this.#areas.get(definition.id),prior=this.#grounds.get(definition.id);if(!row&&!prior)return;if(row&&row.memory.definition!==definition)throw Error('Native ground reset definition replaced');const data={zoneId:definition.id,faction:faction.id,level:definition.level,escortCount:definition.packs!.count[0]};if(!row&&prior?.preserved){Reflect.apply(Map.prototype.set,this.input.characterWriter['zoneMemory'],[definition.id,prior.preserved]);}this.#grounds.set(definition.id,{data,definition,row,awaitVisit:prior?.awaitVisit??false,preserved:prior?.preserved});}\n #pruneGrounds():void {const state=this.input.characterWriter.odyssey.state;for(const [id,pending]of this.#grounds){if(state?.defeated.includes(pending.data.faction)){this.#grounds.delete(id);continue;}if(!pending.row){const memory=this.input.characterWriter['zoneMemory'].get(id);if(!memory||this.input.characterWriter.time-memory.savedAt>=ZONE_MEMORY_CFG.ttl)this.#grounds.delete(id);}}}\n #groundAttendance(row:Registered):{empty:boolean;final:()=>void} {this.#ready(row);const capture=captureSeats(this.input.campaign),census=own<Actor[]>(row.binding.scene,'actors'),actors=rawValues<Actor>(census),definitions=own<World['zoneMap']>(this.input.characterWriter,'zoneMap'),definition=row.memory.definition;finalSeats(capture);const final=()=>{if(own(this.input.characterWriter,'zoneMap')!==definitions||own(definitions,row.id)!==definition||own(row.binding.scene,'zone')!==definition||own(definition,'id')!==row.id)throw Error('Native ground retirement definition changed');const roster=rawValues<Seat>(capture.seats);if(own(this.input.characterWriter,'seats')!==capture.seats||roster.length!==capture.rows.length||roster.some((s,i)=>s!==capture.rows[i].seat||own(s,'actor')!==capture.rows[i].body||own(s,'id')!==capture.rows[i].id))throw Error('Native ground retirement roster changed');if(own(row.binding.scene,'actors')!==census||census.length!==actors.length||rawValues<Actor>(census).some((a,i)=>a!==actors[i]))throw Error('Native ground retirement census changed');Reflect.apply(authorityFinalPhysical,this.input.authority,[row.binding,actors]);};final();return{empty:!capture.rows.some(r=>actors.includes(r.body)),final};}\n shouldCaptureGround(memory:NativeAreaSceneMemory):boolean {this.#pruneGrounds();const pending=this.#grounds.get(memory.id);if(!pending||pending.row?.memory!==memory)return true;if(pending.definition!==memory.definition)throw Error('Native pending ground definition changed');const attendance=this.#groundAttendance(pending.row);if(!attendance.empty)pending.awaitVisit=false;return pending.awaitVisit||!attendance.empty||this.#published===pending.row;}\n groundRefreshForSave():NativeOdysseyGroundRefresh|undefined {this.#pruneGrounds();const pending:NativeOdysseyGroundTarget[]=[];for(const row of this.#grounds.values()){if(row.row&&!this.shouldCaptureGround(row.row.memory))continue;pending.push({...row.data});}return pending.length?{version:1,pending}:undefined;}\n isRetiredGround(combat:NativeAreaSceneCombat):boolean{return this.#retiredGrounds.has(combat);}\n assertGroundMemoryRetirement(memory:NativeAreaSceneMemory):void {const row=this.#retiringGround;if(!row||row.memory!==memory)throw Error('Native ground memory retirement differs');Reflect.apply(groundMethods.areaRetirement,this,[row.ongoing]);}\n assertGroundRetirement(area:NativeAreaSceneOngoing):void {if(this.#retiringGround?.ongoing!==area||this.#frame||this.#moving||this.#grounds.get(this.#retiringGround.id)?.row!==this.#retiringGround)throw Error('Native ground retirement needs its exact invalidated owner');}\n #finishGrounds():void {if(this.#frame||this.#moving||this.#retired)return;if(this.#retiringGround)throw Error('Native ground retirement cannot reenter');this.#pruneGrounds();for(const [id,pending]of this.#grounds){const row=pending.row;if(!row)continue;if(this.#areas.get(id)!==row||row.memory.definition!==pending.definition)throw Error('Native pending ground owner replaced');const attendance=this.#groundAttendance(row);if(!attendance.empty){pending.awaitVisit=false;continue;}if(pending.awaitVisit||this.#published===row)continue;assertNativeCombatOperationsIdle();this.#retiringGround=row;try{Reflect.apply(this.#groundCalls.forget,this.input.memoryRegistry,[row.memory,()=>{attendance.final();const packs=own<NonNullable<World['zone']['packs']>>(pending.definition,'packs'),count=own<number[]>(packs,'count'),size=own<number[]>(packs,'size');if(this.#grounds.get(id)!==pending||own(pending.definition,'level')!==pending.data.level||own(count,0)!==pending.data.escortCount||own(count,1)!==pending.data.escortCount||own(size,0)!==1||own(size,1)!==1)throw Error('Native ground retirement target changed');}]);Reflect.apply(this.#groundCalls.release,this.#preparation!,[row.ongoing]);const actors=rawValues<Actor>(own(row.binding.scene,'actors'));Reflect.apply(this.#lifecycle.release,this.input.authority,[row.binding,actors]);Reflect.apply(this.#lifecycle.unregister,this.input.authority,[row.binding]);Reflect.apply(this.#lifecycle.population,row.ongoing.assembly.input.population,[]);this.#areas.delete(id);this.#combats.delete(row.combat);this.#roadInstances.delete(id);this.#retiredGrounds.add(row.combat);this.#grounds.delete(id);}finally{this.#retiringGround=null;}}}\n residentAreas():readonly NativeAreaSceneOngoing[]{const rows=[...this.#areas.values()];for(const row of rows)this.#ready(row);return Object.freeze(rows.map(row=>row.ongoing));}\n /** Occupied audience and campaign-origin scans use actual controlled bodies. */\n occupiedAreas():readonly NativeAreaSceneOngoing[]{\n  const capture=captureSeats(this.input.campaign),rows=[...this.#areas.values()];if(this.#published){const i=rows.indexOf(this.#published);if(i>=0)rows.unshift(...rows.splice(i,1));}\n  const result:NativeAreaSceneOngoing[]=[];for(const row of rows){this.#ready(row);const actors=rawValues<Actor>(own(row.binding.scene,'actors'));if(capture.rows.some(s=>actors.includes(s.body)))result.push(row.ongoing);}\n  finalSeats(capture);for(const row of rows)this.input.authority.assertFinalPhysical(row.binding);return Object.freeze(result);\n }\n /** State dispatch reaches every retained resident; audience enumeration only\n  * exposes areas with actual controlled bodies, including downed/dormant seats. */\n atZone<T>(zoneId:string,fn:(area:NativeAreaDirectoryView)=>T):T|undefined {const row=this.#areas.get(zoneId);if(!row)return undefined;this.#ready(row);const result=fn(this.#directory(row));if(nativeBirthAsyncResult(result))throw Error('Native directory dispatch must be synchronous');return result;}\n presentWorlds():readonly NativeAreaDirectoryView[]{return Object.freeze(this.occupiedAreas().map(area=>this.#directory(this.#combat(area.combat))));}\n #directory(row:Registered):NativeAreaDirectoryView{this.#ready(row);let directory=this.#directories.get(row.combat);if(!directory){directory=new NativeAreaSceneDirectory(this,row.combat);this.#directories.set(row.combat,directory);}return directory.view;}\n occupiedAudience(where:Parameters<World['occupiedAudience']>[0]):ReturnType<World['occupiedAudience']>{\n  if(!this.#hostedRoads&&!this.input.characterWriter.shardWorld){const area=this.#published;if(!area||!this.presentationActorFor(area.combat))return null;return where(area.ongoing.assembly.input.scene.zone)?undefined:null;}\n  let any=false;const to:string[]=[];for(const area of this.presentWorlds()){if(!where(area.zone))continue;any=true;for(const seat of area.seats)if(!seat.keeper)to.push(seat.id);}return any?to:null;\n }\n noticeOccupied(to:string[]|undefined,text:string,color?:string,size?:number,channel?:string):void {if(to&&!to.length)return;const writer=this.input.characterWriter,fn=writer.notice;Reflect.apply(fn,writer,[text,color,size,channel]);if(to)writer.notices[writer.notices.length-1].to=to;}\n /** Read-only physical audience; never a departed preparation observer. */\n seatsFor(combat:NativeAreaSceneCombat):readonly Seat[]{return this.#presence(this.#combat(combat)).seats;}\n presentationActorFor(combat:NativeAreaSceneCombat):Actor|null{return this.#presence(this.#combat(combat)).actor;}\n #presence(row:Registered):{seats:readonly Seat[];actor:Actor|null}{\n  const capture=captureSeats(this.input.campaign),census=rawValues<Actor>(own(row.binding.scene,'actors')),present=capture.rows.filter(s=>census.includes(s.body));\n  const representative=own<Actor>(row.binding.scene,'player'),selected=present.find(s=>s.body===representative)??present[0];\n  finalSeats(capture);this.input.authority.assertFinalPhysical(row.binding,present.map(s=>s.body));\n  return{seats:Object.freeze(present.map(s=>s.seat)),actor:selected?.body??null};\n }\n nativeWorldReady():boolean {if(this.#retired)return false;if(!this.#published||this.#moving)return false;this.#ready(this.#published);this.#assertProjection();return true;}\n simView():ReturnType<World['devOverlayView']>{\n  const area=this.current,row=this.#combat(area.combat),population=area.assembly.input.population.population,self=this;\n  const host:NativePopulationHost={get zone(){return population.zone;},get actors(){return population.actors;},get player(){return population.player;},get zoneMap(){return population.zoneMap;},get time(){return population.time;},get sim(){return population.sim;},get visited(){return population.visited;},get surveyed(){return population.surveyed;},get continentFor(){const fn=population.continentFor;return(...args:Parameters<NativePopulationHost['continentFor']>)=>Reflect.apply(fn,population,args);},simView:()=>self.simView(),presence:()=>self.occupiedAreas().map(a=>({zone:a.assembly.input.scene.zone,actors:a.assembly.input.scene.actors}))};\n  this.#ready(row);return nativeSimView(host);\n }\n /** The existing native writer performs its one registry capture while serializing.\n  * No pre-capture, second writer, or scene-local World driver is introduced. */\n saveCharacter():void {\n  if(!this.#published||this.#moving)throw Error('Native character save needs a completed published area');this.#assertProjection();this.#ready(this.#published);\n  const capture=captureSeats(this.input.campaign,[this.input.campaign.localSeat]),body=capture.rows[0].body,selected=this.input.authority.selectActors([body]);\n  if(selected[0].binding!==this.#published.binding)throw Error('Native character save local seat left the published area');finalSeats(capture);this.input.authority.assertFinalSelections(selected);\n  saveNativeCharacter(this.input.characterWriter);\n }\n /** Only the selected genuine swap/done callback can resume its originating\n  * dynamic host. A traversal step, later frame, or forged view grants nothing. */\n allowsTraversalContinuation(originalFrame:NativeAreaTransitionFrame):boolean {const c=this.#executingTraversalCallback;return !!c&&c.origin===originalFrame&&!c.expired&&this.#traversalStep?.continuation===c&&this.#frame?.active===true;}\n /** The exact originating dynamic host may resume only inside its selected\n  * real queued ticket callback, never during a whole drain or unrelated road. */\n allowsRoadContinuation(originalFrame:NativeAreaTransitionFrame):boolean {const road=this.#roadCallback;return !!road&&road===this.#activeRoad&&road.receipt.origin===originalFrame&&road.frame===this.#frame&&road.frame.active;}\n get frame():NativeAreaTransitionFrame{if(!this.#frame?.active)throw Error('Native transition frame is expired');return this.#frame.view;}\n areaFor(combat:NativeAreaSceneCombat):NativeAreaSceneOngoing{return this.#combat(combat).ongoing;}\n roadsFor(combat:NativeAreaSceneCombat):NativeAreaRoadContext{return this.#combat(combat).roads;}\n departureFor(combat:NativeAreaSceneCombat):NativeAreaSceneDepartureMemory{return this.#combat(combat).departure;}\n #combat(combat:NativeAreaSceneCombat):Registered{const r=this.#combats.get(combat);if(!r||r.combat!==combat)throw Error('Unregistered native transition combat owner');this.#ready(r);return r;}\n #ready(r:Registered):void{\n  if(this.#retired)throw Error('Native coordinator is retired');\n  assertNativeRetainedMassState(this.input.characterWriter);\n  const a=r.ongoing.assembly,input=a.input,authority=this.input.authority;\n  if(a.phase!=='born'||input.scene.zone.id!==r.id||((this.input.campaign.zoneMap[r.id]??this.input.campaign.caveMap[r.id])!==input.scene.zone&&this.#restore?.source!==r)||r.ongoing.authority!==authority||authority.bindingFor(input.scene)!==r.binding||own(r.binding.services,'combat')!==r.combat)throw Error('Native transition registration changed');\n  if(this.#restore?.source!==r)r.memory.assertReady();r.roads.assertReady();authority.assertFinalPhysical(r.binding);assertNativeRetainedMassState(this.input.characterWriter);\n }\n register(ongoing:NativeAreaSceneOngoing,memory:NativeAreaSceneMemory,roads?:NativeAreaRoadContext):void{\n  if(this.#moving)throw Error('Native transition registration is busy');\n  if(!(ongoing instanceof NativeAreaSceneOngoing)||!isNativeAreaSceneCombat(ongoing.combat)||!(memory instanceof NativeAreaSceneMemory))throw Error('Native transition needs actual runtime owners');\n  const id=ongoing.assembly.input.scene.zone.id,prior=this.#areas.get(id);roads??=prior?.roads??new NativeAreaRoadContext(ongoing.assembly,this.input.authority,this.input.campaign);if(!(roads instanceof NativeAreaRoadContext))throw Error('Native transition needs actual area roads');\n  const combat=ongoing.combat,assembly=ongoing.assembly,{authority,campaign,characterWriter}=this.input;\n  if(combat.input.assembly!==assembly||combat.input.authority!==authority||combat.input.campaign!==campaign||combat.input.characterWriter!==characterWriter||ongoing.authority!==authority||memory.assembly!==assembly||memory.authority!==authority||roads.input.assembly!==assembly||roads.input.authority!==authority||roads.input.campaign!==campaign)throw Error('Native transition owner roots differ');\n  \n  if(prior){if(prior.ongoing!==ongoing||prior.memory!==memory||prior.roads!==roads)throw Error('Native transition area ID already belongs to another owner');this.#ready(prior);return;}\n  const departure=new NativeAreaSceneDepartureMemory(ongoing,memory),row=Object.freeze({ongoing,combat,memory,departure,roads,binding:ongoing.binding,id});this.#ready(row);\n  this.input.memoryRegistry.register(memory);this.#ready(row);this.#areas.set(id,row);this.#combats.set(combat,row);this.#roadInstances.set(id,undefined);this.#bindGround(row);if(this.#hostedRoads)this.#installRoadLink(row);\n }\n publishInitial(ongoing:NativeAreaSceneOngoing):void{\n  if(this.#published||this.#frame||this.#moving)throw Error('Native initial publication already occurred or is busy');\n  const row=this.#areas.get(ongoing.assembly.input.scene.zone.id);if(!row||row.ongoing!==ongoing)throw Error('Native initial publication requires registered area');this.#ready(row);\n  const local=this.input.campaign.localSeat,capture=captureSeats(this.input.campaign,[local]),body=capture.rows[0].body,selected=this.input.authority.selectActors([body]);\n  if(selected[0].binding!==row.binding)throw Error('Native initial publication must contain the real local seat');\n  const w=this.input.characterWriter;\n  // Adopt the real writer's initial solo ladder before installing live views.\n  const caveReturn=w.caveReturn,caveStack=w['caveStack'],caveExitGrace=Reflect.get(w,'caveExitGrace') as boolean,adoptedZonePending=own<boolean>(w,'adoptedZonePending'),forgetMemoryOnLeave=own<boolean>(w,'forgetMemoryOnLeave');\n  this.#prepareProjection();finalSeats(capture);this.input.authority.assertFinalSelections(selected);this.input.authority.assertFinalPhysical(row.binding,[body]);\n  row.ongoing.assembly.input.scene.player=body;row.roads.caveReturn=caveReturn;row.roads.caveStack=caveStack;row.roads.caveExitGrace=caveExitGrace;row.departure.adoptedZonePending=adoptedZonePending;row.departure.forgetMemoryOnLeave=forgetMemoryOnLeave;\n  this.#published=row;for(const [key,d]of this.#projection)Object.defineProperty(w,key,d);\n }\n #prepareProjection():void{\n  const bindings=new Map<string,{get:()=>unknown;set?:(v:unknown)=>void}>();\n  const field=(key:string,provider:()=>object,slot=key)=>bindings.set(key,{get:()=>Reflect.get(provider(),slot),set:v=>{if(!Reflect.set(provider(),slot,v))throw new TypeError('Native published field is not writable: '+key);}});\n  const area=()=>this.published,assembly=()=>area().assembly;\n  field('zone',()=>assembly().input.scene);field('actors',()=>assembly().input.scene);\n  for(const key of ['arena','arenaHull','walk','zoneEntry','currentZoneSeed','exits','flashes'])field(key,()=>assembly().input.geometry);\n  for(const key of ['objectiveDone','objectiveLost','objectiveLatch'])field(key,()=>assembly().input.objectives);\n  field('drops',()=>assembly().input.physical.input.state);field('orbs',()=>assembly().lootController.input.state);field('texts',()=>assembly().objectiveController.input.state);\n  for(const key of ['projectiles','zones'])field(key,()=>area().progression.input.state);\n  field('tethers',()=>this.#published!.combat.tethers.input.state);\n  bindings.set('companionBonds',{get:()=>area().progression.companionBonds});\n  extendNativeAreaPublication(bindings,area);\n  extendNativeAreaViewQueries(bindings,area);\n  extendNativeAreaMenuPublication(bindings,area);\n  extendNativeAreaMenuQueries(bindings,area);\n  extendNativeAreaUIActions(bindings,area);\n  for(const key of ['reckonRunEssence','recordDeath'] as const){if(bindings.has(key))throw Error('Duplicate native death publication: '+key);bindings.set(key,{get:()=>{const selected=area(),owner=selected.combat.campaignTransitions,fn=owner[key];return(...args:unknown[])=>{this.#assertProjection();this.#ready(this.#combat(selected.combat));if(this.#published?.ongoing!==selected)throw Error('Native death publication selection expired');return Reflect.apply(fn,owner,args);};}});}\n  field('adoptedZonePending',()=>this.#published!.departure);field('forgetMemoryOnLeave',()=>this.#published!.departure);\n  field('caveExitGrace',()=>this.#published!.roads);field('entryFrom',()=>this.#published!.roads);field('caveReturn',()=>this.#published!.roads);field('caveStack',()=>this.#published!.roads);\n  bindings.set('inCave',{get:()=>assembly().transition.inCave});field('scene',()=>area().quests.input.state);\n  // Definition and arena identities are selected, never reassigned through the writer.\n  for(const key of ['zone','arena']){const b=bindings.get(key)!;bindings.set(key,{get:b.get,set:v=>{if(v!==b.get())throw Error('Native published identity cannot be reassigned: '+key);}});}\n  const writer=this.input.characterWriter,prepared=new Map<string,PropertyDescriptor>();\n  this.#traversalValue=own<TraversalState|null>(writer,'traversal');bindings.set('traversal',{get:()=>this.#traversalValue,set:value=>this.#replaceTraversal(value as TraversalState|null)});\n  for(const [key,b]of bindings){const d=Object.getOwnPropertyDescriptor(writer,key);if(d?(!d.configurable||!Object.hasOwn(d,'value')):!Object.isExtensible(writer))throw Error('Native publication requires configurable ordinary writer slots: '+key);prepared.set(key,{enumerable:d?.enumerable??false,configurable:true,...b});}\n  this.#projection.clear();for(const [key,value]of prepared){this.#previousProjection.set(key,Object.getOwnPropertyDescriptor(writer,key));this.#projection.set(key,value);}\n }\n #assertProjection():void{if(!this.#published)return;for(const [key,expected]of this.#projection){const actual=Object.getOwnPropertyDescriptor(this.input.characterWriter,key);if(!actual||actual.get!==expected.get||actual.set!==expected.set)throw Error('Native writer publication changed: '+key);}}\n runFrom<T>(source:NativeAreaSceneOngoing,action:()=>T):T{\n  if(this.#retiringVoyage||this.#retiringGround)throw Error('Native area retirement cannot enter gameplay');if(!this.#frame){this.#finishVoyage();this.#finishGrounds();}\n  assertNativeRetainedMassState(this.input.characterWriter);\n  const row=this.#areas.get(source.assembly.input.scene.zone.id);if(!row||row.ongoing!==source)throw Error('Native transition source is not registered');this.#ready(row);this.#assertProjection();\n  if(this.#frame){if(!this.#frame.active||this.#frame.current!==row||(this.#moving&&this.#roadCallback?.frame!==this.#frame))throw Error('Native transition cannot enter a foreign or moving frame');const result=action();if(nativeBirthAsyncResult(result))throw Error('Native transition must be synchronous');return result;}\n  const capture=captureSeats(this.input.campaign),census=rawValues<Actor>(own(row.binding.scene,'actors')),local=capture.rows.filter(r=>census.includes(r.body)),seats=Object.freeze(local.map(r=>r.seat));\n  finalSeats(capture);this.input.authority.assertFinalPhysical(row.binding,local.map(r=>r.body));\n  const state={source:row,current:row,seats,active:true} as Frame;state.view=Object.freeze({get source(){return state.source.ongoing;},get current(){if(!state.active)throw Error('Native transition frame is expired');return state.current.ongoing;},get seats(){if(!state.active)throw Error('Native transition frame is expired');return state.seats;},get active(){return state.active;}});this.#frame=state;\n  let result:T;try{result=action();if(nativeBirthAsyncResult(result))throw Error('Native transition must be synchronous');}finally{state.active=false;this.#frame=null;}this.#finishVoyage();this.#finishGrounds();return result;\n }\n #harborArrival:{row:Registered;capture:SeatCapture;seat:Seat;body:Actor;meta:Seat['meta'];definition:World['zone']}|null=null;\n assertHarborArrival(combat:NativeAreaSceneCombat):World['zone'] {\n  const r=this.#harborArrival,frame=this.#frame;if(!r||!this.#moving||!frame?.active||frame.current!==r.row||r.row.combat!==combat)throw Error('Native harbor needs its selected genuine revisit');\n  this.#ready(r.row);finalSeats(r.capture);Reflect.apply(authorityFinalPhysical,this.input.authority,[r.row.binding,[r.body]]);\n  if(this.#harborArrival!==r||this.#frame!==frame||!frame.active||frame.current!==r.row||!Reflect.apply(arrayIncludes,frame.seats,[r.seat])||own(r.seat,'actor')!==r.body||own(r.seat,'meta')!==r.meta||own(r.row.binding.scene,'player')!==r.body||own(r.row.binding.scene,'zone')!==r.definition)throw Error('Native harbor arrival lost its actual hand or ground');\n  return r.definition;\n }\n #historyArrival:{row:Registered;seat:Seat;body:Actor;definition:World['zone']}|null=null;\n assertHistoryArrival(combat:NativeAreaSceneCombat):World['zone'] {\n  const receipt=this.#historyArrival,frame=this.#frame;if(!receipt||!this.#moving||!frame?.active||frame.current!==receipt.row||receipt.row.combat!==combat)throw Error('Native history needs its selected genuine revisit');\n  this.#ready(receipt.row);const graph=this.input.campaign.zoneMap;\n  Reflect.apply(authorityFinalPhysical,this.input.authority,[receipt.row.binding,[receipt.body]]);\n  if(this.#historyArrival!==receipt||this.#frame!==frame||!frame.active||frame.current!==receipt.row||!Reflect.apply(arrayIncludes,frame.seats,[receipt.seat])||own(this.input.characterWriter,'localSeat')!==receipt.seat||own(receipt.seat,'actor')!==receipt.body||own(receipt.row.binding.scene,'player')!==receipt.body||own(receipt.row.binding.scene,'zone')!==receipt.definition||own(graph,receipt.row.id)!==receipt.definition)throw Error('Native history arrival lost its actual local hand or ground');\n  return receipt.definition;\n }\n #warlordArrival:{row:Registered;capture:SeatCapture;seat:Seat;body:Actor;meta:Seat['meta'];definition:World['zone'];arriving:readonly Actor[]}|null=null;\n assertWarlordArrival(combat:NativeAreaSceneCombat):World['zone'] {\n  const r=this.#warlordArrival,frame=this.#frame;if(!r||!this.#moving||!frame?.active||frame.current!==r.row||r.row.combat!==combat)throw Error('Native crown needs its selected genuine revisit');\n  this.#ready(r.row);finalSeats(r.capture);Reflect.apply(authorityFinalPhysical,this.input.authority,[r.row.binding,[r.body]]);\n  if(this.#warlordArrival!==r||this.#frame!==frame||!frame.active||frame.current!==r.row||!Reflect.apply(arrayIncludes,frame.seats,[r.seat])||own(r.seat,'actor')!==r.body||own(r.seat,'meta')!==r.meta||own(r.row.binding.scene,'player')!==r.body||own(r.row.binding.scene,'zone')!==r.definition)throw Error('Native crown arrival lost its actual hand or ground');return r.definition;\n }\n /** The new arrival cohort has not occupied this fight; every other physical seat does, including downed hands. */\n warlordOccupied(arrival:NativeAreaSceneCombat,target:NativeAreaSceneCombat):boolean {\n  this.assertWarlordArrival(arrival);const r=this.#warlordArrival!,presence=this.#presence(this.#combat(target));this.assertWarlordArrival(arrival);\n  return presence.seats.some(seat=>target!==arrival||!Reflect.apply(arrayIncludes,r.arriving,[own(seat,'actor')]));\n }\n #bountyArrival:{combat:NativeAreaSceneCombat;from:string|undefined}|null=null;\n bountyArrivalFrom(combat:NativeAreaSceneCombat):string|undefined {if(!this.#moving||!this.#frame?.active||this.#frame.current.combat!==combat||this.#bountyArrival?.combat!==combat)throw Error('Native bounty arrival needs its selected genuine revisit');return this.#bountyArrival.from;}\n #delayedArrival:{combat:NativeAreaSceneCombat;kind:'corpse'|'delver'|'merc'|'ascent'|'encounter';capture:SeatCapture;seat:Seat;body:Actor;local:Seat;meta:Seat['meta']}|null=null;\n delayedArrivalBody(combat:NativeAreaSceneCombat,kind:'corpse'|'delver'|'merc'|'ascent'|'encounter'):Actor {\n  const r=this.#delayedArrival,frame=this.#frame;if(!r||r.kind!==kind||r.combat!==combat||!this.#moving||!frame?.active||frame.current.combat!==combat)throw Error('Native delayed arrival needs its exact selected destination');\n  const row=this.#combat(combat);this.#ready(row);const local=this.input.campaign.localSeat;finalSeats(r.capture);\n  if(local!==r.local||own(this.input.characterWriter,'localSeat')!==r.local||own(r.seat,'actor')!==r.body||own(r.seat,'meta')!==r.meta||!frame.seats.includes(r.seat)||own(row.binding.scene,'player')!==r.body||kind==='corpse'&&r.seat!==r.local)throw Error('Native delayed arrival character changed');\n  Reflect.apply(authorityFinalPhysical,this.input.authority,[row.binding,[r.body]]);return r.body;\n }\n #furnishArrival:NativeAreaSceneCombat|null=null;\n #townArrival:NativeAreaSceneCombat|null=null;\n assertFurnishArrival(combat:NativeAreaSceneCombat):void {if(!this.#moving||!this.#frame?.active||this.#furnishArrival!==combat)throw Error('Native furnishing needs its selected arrival');}\n assertTownArrival(combat:NativeAreaSceneCombat):void {if(!this.#moving||!this.#frame?.active||this.#townArrival!==combat)throw Error('Native town refresh needs its selected genuine arrival');}\n /** Campaign death policy sees every genuine admitted hand. The returned roster\n  * is a finite identity snapshot; native alive/merc/account rules still decide. */\n /** The shared dive identifies its actual source even when the final down was elsewhere.\n  * Its one player cleanup still belongs to the genuine campaign-local controlled body. */\n #selectDescentRecovery(run:NonNullable<World['descentRun']>):{combat:NativeAreaSceneCombat;player:Actor}{\n  const frame=this.#frame,writer=this.input.characterWriter;if(!frame?.active||this.#moving||this.#partyMoving||this.#activeRoad||own(writer,'descentRun')!==run)throw Error('Native descent recovery needs its actual active campaign run');\n  const caveId=own<string>(run,'caveId'),source=this.#areas.get(caveId);if(!source)throw Error('Native descent recovery needs its registered abyss');this.#ready(source);\n  const capture=captureSeats(this.input.campaign),local=own<Seat>(writer,'localSeat'),selections=Reflect.apply(partySelectActors,this.input.authority,[capture.rows.map(r=>r.body)]);\n  for(const selected of selections){const area=[...this.#areas.values()].find(row=>row.binding===selected.binding);if(!area)throw Error('Native descent party has no registered physical owner');this.#ready(area);}\n  const hero=capture.rows.find(row=>row.seat===local)?.body;if(!hero)throw Error('Native descent lost the actual local hand');finalSeats(capture);Reflect.apply(partyFinalSelections,this.input.authority,[selections]);\n  if(own(writer,'descentRun')!==run||own(run,'caveId')!==caveId||own(writer,'localSeat')!==local)throw Error('Native descent run changed during selection');\n  frame.current=source;frame.seats=Object.freeze(capture.rows.filter((_,i)=>selections[i].binding===source.binding).map(row=>row.seat));return{combat:source.combat,player:hero};\n }\n #partySeats():readonly Seat[]{\n  const frame=this.#frame;if(!frame?.active||this.#moving)throw Error('Native party policy needs its active transition');\n  const capture=captureSeats(this.input.campaign);if(new Set(capture.rows.map(r=>r.body)).size!==capture.rows.length)throw Error('Native party has duplicate controlled bodies');const selected=Reflect.apply(partySelectActors,this.input.authority,[capture.rows.map(r=>r.body)]);\n  for(const row of selected){const registered=[...this.#areas.values()].find(area=>area.binding===row.binding);if(!registered||registered.binding!==row.binding)throw Error('Native party seat lacks its actual registered area');this.#ready(registered);}\n  finalSeats(capture);Reflect.apply(partyFinalSelections,this.input.authority,[selected]);\n  return Object.freeze(capture.rows.map(r=>r.seat));\n }\n /** Death/respawn uses the ordinary physical handoff for each actual source.\n  * This private bridge neither creates road tickets nor borrows another frame. */\n #loadPartyZone(zoneId:string,from?:string):void{\n  const frame=this.#frame;if(!frame?.active||this.#moving||this.#partyMoving||this.#activeRoad)throw Error('Native party handoff needs an idle current transition');\n  const seats=this.#partySeats(),capture=captureSeats(this.input.campaign,seats),selected=Reflect.apply(partySelectActors,this.input.authority,[capture.rows.map(r=>r.body)]);\n  if(new Set(capture.rows.map(r=>r.body)).size!==capture.rows.length)throw Error('Native party handoff has duplicate bodies');const groups=new Map<Registered,Seat[]>();for(let i=0;i<capture.rows.length;i++){const row=[...this.#areas.values()].find(area=>area.binding===selected[i].binding)!;const group=groups.get(row)??[];group.push(capture.rows[i].seat);groups.set(row,group);}\n  finalSeats(capture);Reflect.apply(partyFinalSelections,this.input.authority,[selected]);this.#partyMoving=true;\n  try{\n   for(const [source,cohort]of groups){this.#ready(source);const now=captureSeats(this.input.campaign,cohort),current=Reflect.apply(partySelectActors,this.input.authority,[now.rows.map(r=>r.body)]);finalSeats(now);Reflect.apply(partyFinalSelections,this.input.authority,[current]);if(current.some(r=>r.binding!==source.binding))throw Error('Native party handoff source changed');frame.current=source;frame.seats=Object.freeze([...cohort]);this.loadZone(zoneId,from??source.id);}\n   const destination=this.#areas.get(zoneId);if(!destination)throw Error('Native party handoff has no completed destination');\n   const now=captureSeats(this.input.campaign,seats),current=Reflect.apply(partySelectActors,this.input.authority,[now.rows.map(r=>r.body)]);finalSeats(now);Reflect.apply(partyFinalSelections,this.input.authority,[current]);if(current.some(r=>r.binding!==destination.binding))throw Error('Native party did not reach its destination');\n   const local=own<Seat>(this.input.characterWriter,'localSeat'),hero=now.rows.find(r=>r.seat===local)?.body;if(!hero)throw Error('Native party handoff lost its local hand');writable(destination.binding.scene,'player');\n   destination.binding.scene.player=hero;frame.current=destination;frame.seats=Object.freeze([...seats]);this.#published=destination;\n  }finally{this.#partyMoving=false;}\n }\n\n /** A Continue shell alone may replace its entire recorded graph. Its old row\n  * stays physically scoped until native arrival transfers the real cohort. */\n restoreCharacterGraph(token:NativeCharacterResumeReceipt,world:Parameters<World['adoptWorldState']>[0]):void {\n  const r=assertNativeCharacterResume(token,'graph');this.assertIdleFrame();const source=this.#published;if(!source||source.ongoing!==r.area||r.preparation!==this.#preparation||r.writer!==this.input.characterWriter||this.#areas.size!==1||this.#restore||this.#hostedRoads||this.#roadQueue.length)throw Error('Native Continue requires its only provisional local area');this.#ready(source);this.#restore={owner:r.owner,source,arriving:false};Reflect.apply(this.#lifecycle.setRestore,this.#preparation!,[token]);\n  if(!source.combat.restoreCharacterGraph(token,world))throw Error('Native recorded world could not be restored');\n  for(const data of r.owner.record.groundRefresh?.pending??[]){const definition=this.input.campaign.zoneMap[data.zoneId];if(!definition)throw Error('Restored pending ground definition is absent');const preserved=this.input.characterWriter['zoneMemory'].get(data.zoneId);if(!preserved)throw Error('Restored pending ground has no exact memory row');this.#grounds.set(data.zoneId,{data,definition,awaitVisit:true,preserved});}\n }\n resumeCharacterArrival(token:NativeCharacterResumeReceipt,...args:Parameters<World['resumeSpawn']>):void {\n  const r=assertNativeCharacterResume(token,'arrival'),restore=this.#restore;this.assertIdleFrame();if(!restore||restore.owner!==r.owner||restore.source.ongoing!==r.area||r.preparation!==this.#preparation||restore.arriving)throw Error('Native Continue arrival lost its provisional receipt');restore.arriving=true;restore.token=token;\n  restore.source.combat.campaignFrame.resumeSpawn(...args);\n  if(this.#published===restore.source)throw Error('Native Continue did not replace its provisional area');\n  // The original source operation must finish its native finally before its\n  // binding can be revoked. No source driver remains active beyond this point.\n  assertNativeCombatOperationsIdle();const source=restore.source,remaining=rawValues<Actor>(own(source.binding.scene,'actors'));Reflect.apply(authorityFinalPhysical,this.input.authority,[source.binding]);Reflect.apply(this.#lifecycle.release,this.input.authority,[source.binding,remaining]);Reflect.apply(this.#lifecycle.unregister,this.input.authority,[source.binding]);Reflect.apply(this.#lifecycle.population,source.ongoing.assembly.input.population,[]);Reflect.apply(this.#lifecycle.deeds,source.combat.campaignOwner,[]);this.#combats.delete(source.combat);if(this.#areas.get(source.id)===source)this.#areas.delete(source.id);Reflect.apply(this.#lifecycle.finishRestore,this.#preparation!,[source.ongoing,token]);this.#restore=null;\n }\n assertProvisionalRestoreSource(owner:NativeAreaCharacterResume,area:NativeAreaSceneOngoing):void {if(this.#restore?.owner!==owner||this.#restore.source.ongoing!==area||!this.#restore.arriving)throw Error('Native provisional restore source is not selected');}\n #selectNemesisDeparture(combat:NativeAreaSceneCombat):Actor {\n  const r=this.#nemesisDeparture;if(!r||!this.#moving||!r.frame.active||this.#frame!==r.frame||r.frame.current!==r.source||r.source.combat!==combat)throw Error('Native Nemesis scan needs its actual selected departure');\n  const local=this.input.campaign.localSeat;finalSeats(r.capture);\n  if(local!==r.seat||own(this.input.characterWriter,'localSeat')!==r.seat||own(r.seat,'actor')!==r.body||!Reflect.apply(arrayIncludes,r.frame.seats,[r.seat])||!r.capture.rows.some(row=>row.seat===r.seat&&row.body===r.body))throw Error('Native Nemesis departure lost its actual local story subject');\n  Reflect.apply(authorityFinalPhysical,this.input.authority,[r.source.binding,[r.body]]);return r.body;\n }\n loadZone(zoneId:string,from?:string):void{\n  assertNativeRetainedMassState(this.input.characterWriter);\n  const frame=this.#frame;if(!frame?.active||this.#moving)throw Error('Native area handoff needs its current synchronous transition frame');\n  const realm=this.#realmEntry;if(realm&&(realm.frame!==frame||realm.source!==frame.current||realm.destination!==zoneId||realm.consumed))throw Error('Native realm handoff differs from its selected entry');\n  const source=frame.current,restoring=this.#restore?.source===frame.current&&this.#restore.arriving;let destination=this.#areas.get(zoneId);if(restoring&&destination===source)destination=undefined;\n  this.#ready(source);if(destination)this.#ready(destination);this.#assertProjection();if(source===destination)return;\n  if(realm){realm.definition=own<World['zone']>(this.input.campaign.caveMap,zoneId);if(!realm.definition||realm.definition.id!==zoneId)throw Error('Native realm entry lost its minted definition');}\n  if(!destination&&!this.#preparation)throw Error('Native destination needs the actual campaign preparation owner');\n  this.#moving=true;\n  try{\n   this.input.characterWriter['townLayoutChangedOnLoad']=false;if(destination)destination.combat.runtimeState.frame.townLayoutChangedOnLoad=false;\n   for(const seat of frame.seats)if(optionalOwn<Actor>(seat,'home'))source.combat.control.seatEject(seat,'travel');\n   const capture=captureSeats(this.input.campaign,frame.seats),bodies=capture.rows.map(r=>r.body),seatBodies=new Set(bodies),localSeat=this.input.campaign.localSeat,scene=source.ongoing.assembly.input.scene;\n   const activeRoad=this.#activeRoad;if(activeRoad){if(activeRoad.frame!==frame||activeRoad.receipt.dest!==zoneId||frame.seats.length!==1||frame.seats[0]!==activeRoad.receipt.seat)throw Error('Native road handoff changed its exact ticket');activeRoad.body=bodies[0];}\n   const onGraph=!!this.input.campaign.zoneMap[zoneId],publish=frame.seats.includes(localSeat),sourceCensus=own<Actor[]>(scene,'actors');mutableCensus(sourceCensus);\n   const cohort=rawValues<Actor>(sourceCensus).filter(a=>seatBodies.has(a)||!!optionalOwn<Actor>(a,'owner')&&seatBodies.has(optionalOwn<Actor>(a,'owner')!)&&!own<boolean>(a,'dead')&&!optionalOwn<boolean>(a,'construct'));\n   if(!bodies.length||bodies.some(body=>!cohort.includes(body)))throw Error('Native transition lost a selected controlled body');\n   Object.freeze(cohort);const selected=this.input.authority.selectActors(cohort),incoming=capture.rows.find(r=>r.seat===localSeat)?.body??bodies[0];\n   if(selected.some(s=>s.binding!==source.binding))throw Error('Native transition cohort is foreign');\n   const carriedScene=publish?own<World['scene']>(source.ongoing.quests.input.state,'scene'):null;\n   const run=own<World['voyage']>(source.ongoing.assembly.transition,'voyage'),stash=own<World['wraithsailSeaStash']>(source.ongoing.assembly.input.state,'wraithsailSeaStash');\n   if((run||stash||zoneId===VOYAGE_ZONE_ID||source===this.#voyageArea)&&!publish)throw Error('Native solo voyage needs its genuine campaign-local crossing');\n   const crossing=publish&&(run||stash||zoneId===VOYAGE_ZONE_ID||source===this.#voyageArea||onGraph&&this.#voyageArea)?{source,destinationId:zoneId,run,stash,surface:onGraph,surfaceHandled:false}:null;this.#voyageCrossing=crossing;\n   const ladder={caveReturn:source.roads.caveReturn,caveStack:[...source.roads.caveStack]};\n   source.combat.transitionDeparture(cohort);\n   if(publish){const story=capture.rows.find(row=>row.seat===localSeat);if(!story)throw Error('Native Nemesis departure lost its selected local seat');this.#nemesisDeparture={frame,source,capture,seat:story.seat,body:story.body};try{source.combat.campaignTransitions.scanNemesisSurvivors();}finally{this.#nemesisDeparture=null;}}\n   if(restoring){if(!source.departure.adoptedZonePending)throw Error('Native restored departure lost its adopted-world suppression');sceneCaptureZoneMemory(source.departure.host);}else source.departure.captureZoneMemory();\n   if(onGraph){this.#abandonVoyageSurface();sceneNecropolisSurfaceArrival(this.input.campaign);}\n   // Native pre-layout cancellation. The source queues remain retained, while\n   // actor-carried casting and marks cannot migrate into the destination.\n   incoming.dash=null;incoming.casting=null;\n   const meta=capture.rows.find(r=>r.body===incoming)!.seat.meta;\n   for(const inst of meta.knownSkills.values())if(inst.state?.markPos)inst.state.markPos=null;\n   const firstBirth=!destination;if(realm)realm.revisit=!firstBirth;\n   if(!destination){\n    const ongoing=this.#preparation!.prepareDestination(source.ongoing,zoneId,from,incoming),memory=new NativeAreaSceneMemory(ongoing.assembly,this.input.authority),roads=new NativeAreaRoadContext(ongoing.assembly,this.input.authority,this.input.campaign),departure=new NativeAreaSceneDepartureMemory(ongoing,memory);\n    destination=Object.freeze({ongoing,combat:ongoing.combat,memory,roads,departure,binding:ongoing.binding,id:zoneId});\n    const observers=ongoing.assembly.input.scene.actors;mutableCensus(observers);if(observers.length!==1||observers[0]!==incoming)throw Error('Native prepared destination observer changed');Reflect.apply(arraySplice,observers,[0,1]);\n   }\n   const destinationVoyage=crossing?own<World['voyage']>(destination.ongoing.assembly.transition,'voyage'):null,destinationStash=crossing?own<World['wraithsailSeaStash']>(destination.ongoing.assembly.input.state,'wraithsailSeaStash'):null;\n   if(crossing&&((destinationVoyage&&destinationVoyage!==crossing.run)||(destinationStash&&destinationStash!==crossing.stash)))throw Error('Native destination already owns a distinct voyage');\n   if(crossing){writable(source.ongoing.assembly.transition,'voyage');writable(source.ongoing.assembly.input.state,'wraithsailSeaStash');writable(destination.ongoing.assembly.transition,'voyage');writable(destination.ongoing.assembly.input.state,'wraithsailSeaStash');if(!firstBirth&&crossing.surface)this.prepareVoyageSurface(destination.ongoing);}\n   if(!firstBirth){this.#furnishArrival=destination.combat;try{destination.combat.refreshSidezoneFurnish();}finally{this.#furnishArrival=null;}}\n   if(!firstBirth){this.#townArrival=destination.combat;try{destination.combat.refreshTownStations(incoming);}finally{this.#townArrival=null;}}\n   const destScene=destination.ongoing.assembly.input.scene,destCensus=own<Actor[]>(destScene,'actors'),relay=destination.ongoing.assembly.input.population.factory.relayStatus;mutableCensus(destCensus);\n   const destinationScene=own<World['scene']>(destination.ongoing.quests.input.state,'scene');\n   if(realm){writable(source.combat.campaignOwner.state,realm.key);writable(destination.combat.campaignOwner.state,realm.key);const existing=own(destination.combat.campaignOwner.state,realm.key),issued=this.#realmContexts.get(destination.combat);if(issued&&(issued.key!==realm.key||issued.definition!==realm.definition))throw Error('Native realm destination receipt differs');if(existing!==(realm.prepared===destination.combat?realm.value:null)&&!(issued&&issued.value===existing))throw Error('Native realm destination already owns an unissued or replaced context');realm.previous=existing;realm.completed=!!issued&&existing===null;}\n   if(carriedScene){if(destinationScene&&destinationScene!==carriedScene)throw Error('Native destination already owns a distinct running scene');writable(source.ongoing.quests.input.state,'scene');writable(destination.ongoing.quests.input.state,'scene');}\n   if(cohort.some(a=>Reflect.apply(arrayIncludes,destCensus,[a])))throw Error('Native transition destination already contains moving body');\n   writable(destScene,'player');for(const a of cohort)writable(a,'statusRelay');\n   this.#ready(source);if(!firstBirth)this.#ready(destination);this.#assertProjection();finalSeats(capture);this.input.authority.assertFinalSelections(selected);this.input.authority.assertFinalPhysical(destination.binding);\n   if(own(scene,'actors')!==sourceCensus||own(destScene,'actors')!==destCensus)throw Error('Native transition census replaced before commit');\n   mutableCensus(sourceCensus);mutableCensus(destCensus);\n   const geometry=destination.ongoing.assembly.input.geometry,prepared=destination.ongoing.assembly.preparedPlacement;if(!prepared)throw Error('Native destination lost its actual prepared placement');\n   const back=from?geometry.exits.find(e=>e.to===from):undefined,center=vec(geometry.arena.w/2,geometry.arena.h/2);let entry:Vec2=vec(prepared.entry.x,prepared.entry.y);if(back){const angle=angleTo(back.pos,center);entry=vec(back.pos.x+Math.cos(angle)*120,back.pos.y+Math.sin(angle)*120);}const landing=!back&&prepared.spawnAt?prepared.spawnAt:entry;\n   // Exact native motion/tier reset statements, before destination birth. Quiet\n   // carom teardown uses the real source operation while the body is still\n   // physically source-owned; that native branch touches only the actor.\n   incoming.pos=geometry.clampPos(vec(landing.x,landing.y),incoming.radius);incoming.push=null;incoming.dash=null;\n   incoming.tier=0;incoming.onTierLink=false;incoming.aiTierGoal=undefined;source.combat.endCarom(incoming,{quiet:true});incoming.frameLockRect=null;\n   for(const a of cohort){if(a===incoming)continue;a.dash=null;a.casting=null;a.push=null;if(a.caromRun)source.combat.endCarom(a,{quiet:true});a.frameLockRect=null;a.tier=0;a.onTierLink=false;a.aiTierGoal=undefined;a.pos=geometry.clampPos(vec(landing.x+rand(-80,80),landing.y+rand(-80,80)),a.radius);}\n   // Native callbacks above may fail after their earlier motion writes. Recheck\n   // all authority before committing raw census transfer; never roll them back.\n   finalSeats(capture);this.input.authority.assertFinalSelections(selected);this.input.authority.assertFinalPhysical(destination.binding);\n   if(own(scene,'actors')!==sourceCensus||own(destScene,'actors')!==destCensus)throw Error('Native transition census changed during landing');mutableCensus(sourceCensus);mutableCensus(destCensus);\n   if(carriedScene&&(own(source.ongoing.quests.input.state,'scene')!==carriedScene||own(destination.ongoing.quests.input.state,'scene')!==destinationScene))throw Error('Native scene identity changed during handoff');\n   if(crossing&&(own(source.ongoing.assembly.transition,'voyage')!==crossing.run||own(source.ongoing.assembly.input.state,'wraithsailSeaStash')!==crossing.stash))throw Error('Native voyage crossing state changed before transfer');\n   if(crossing&&(own(destination.ongoing.assembly.transition,'voyage')!==destinationVoyage||own(destination.ongoing.assembly.input.state,'wraithsailSeaStash')!==destinationStash))throw Error('Native destination voyage changed before transfer');\n   if(realm){\n    if(own(source.combat.campaignOwner.state,realm.key)!==realm.value||own(destination.combat.campaignOwner.state,realm.key)!==realm.previous)throw Error('Native realm context changed during handoff');\n    if(own(this.input.campaign.caveMap,zoneId)!==realm.definition||destScene.zone!==realm.definition)throw Error('Native realm destination definition changed during handoff');\n    writable(source.combat.campaignOwner.state,realm.key);writable(destination.combat.campaignOwner.state,realm.key);\n   }\n   for(const a of cohort){const index=Reflect.apply(arrayIndexOf,sourceCensus,[a]);Reflect.apply(arraySplice,sourceCensus,[index,1]);Reflect.apply(arrayPush,destCensus,[a]);Reflect.apply(authorityTransfer,this.input.authority,[a,source.binding,destination.binding]);}\n   // World.loadZone retains its exact scene record. Only the actual local\n   // presentation cohort carries that record; remote travel cannot steal it.\n   if(carriedScene){destination.ongoing.quests.input.state.scene=carriedScene;source.ongoing.quests.input.state.scene=null;}\n   if(crossing){destination.ongoing.assembly.transition.voyage=crossing.run;destination.ongoing.assembly.input.state.wraithsailSeaStash=crossing.stash;source.ongoing.assembly.transition.voyage=null;source.ongoing.assembly.input.state.wraithsailSeaStash=null;}\n   // The exact realm entry belongs to its destination, including during native\n   // birth. Empty source areas retain neither the reward nor its portal gate.\n   if(realm){const value=realm.completed?null:realm.value;if(!Reflect.set(destination.combat.campaignOwner.state,realm.key,value)||!Reflect.set(source.combat.campaignOwner.state,realm.key,null))throw Error('Native realm context is no longer writable');this.#realmContexts.set(destination.combat,{key:realm.key,definition:realm.definition!,value});realm.consumed=true;}\n   destScene.player=incoming;for(const a of cohort)a.statusRelay=relay;frame.current=destination;if(publish)this.#published=destination;\n   destination.roads.entryFrom=from??null;destination.roads.caveReturn=onGraph?null:ladder.caveReturn;destination.roads.caveStack=onGraph?[]:ladder.caveStack;\n   if(activeRoad){activeRoad.destination=destination;const selectedLadder=activeRoad.receipt.ticket.ladder;if(selectedLadder){destination.roads.caveReturn=selectedLadder.caveReturn;destination.roads.caveStack=[...selectedLadder.caveStack];}}\n   const arriving=destination;\n   const packedToken=Object.freeze({}) as NativePackedTravelReceipt,packed:PackedTravel={active:true,consumed:false,source:source.ongoing.assembly.input.ecology,destination:arriving.ongoing.assembly.input.ecology,actors:cohort,ids:cohort.map(actor=>own<number>(actor,'id')),authority:this.input.authority,binding:arriving.binding};packedTravel.set(packedToken,packed);\n   try{Reflect.apply(this.#lifecycle.packed,packed.destination,[packedToken,firstBirth,()=>{if(firstBirth){this.#preparation!.birthTransferred(arriving.ongoing);this.#ready(arriving);if(restoring)Reflect.apply(this.#lifecycle.discardRestore,this.input.memoryRegistry,[source.memory,this.#restore!.token!]);this.input.memoryRegistry.register(arriving.memory);this.#ready(arriving);this.#areas.set(zoneId,arriving);this.#combats.set(arriving.combat,arriving);this.#roadInstances.set(zoneId,activeRoad?.receipt.instance);this.#bindGround(arriving);if(this.#hostedRoads)this.#installRoadLink(arriving);}}]);if(!packed.consumed)throw Error('Native destination did not consume its packed arrival');}finally{packed.active=false;}\n   if(crossing&&zoneId===VOYAGE_ZONE_ID){if(this.#voyageArea&&this.#voyageArea!==destination)throw Error('Native voyage episode already owns another sea');this.#voyageArea=destination;if(!firstBirth){this.#voyageArrival=destination.combat;try{destination.combat.resumeVoyageArrival();}finally{this.#voyageArrival=null;}}}\n   if(crossing?.surface&&this.#voyageArea&&this.#voyageArea!==destination)this.#voyageCompleted=this.#voyageArea;\n   if(activeRoad)this.#roadBeforeArrival(activeRoad,firstBirth);\n   for(const seat of frame.seats){source.roads.depart(seat);destination.roads.arrive(seat,activeRoad?activeRoad.receipt.ticket:{seatId:own<string>(seat,'id'),dest:zoneId,...(!onGraph?{ladder}:{})},from??null);}\n   destination.combat.transitionArrival(cohort);\n   if(!firstBirth){const selectedHarbor=capture.rows.find(row=>row.body===incoming);if(!selectedHarbor)throw Error('Native harbor arrival lost its selected seat');this.#harborArrival={row:destination,capture,seat:selectedHarbor.seat,body:incoming,meta:own(selectedHarbor.seat,'meta'),definition:destScene.zone};try{destination.combat.harborServices.arrive();}finally{this.#harborArrival=null;}}\n   if(!firstBirth){const selected=capture.rows.find(row=>row.body===incoming);if(!selected)throw Error('Native crown arrival lost its incoming seat');this.#warlordArrival={row:destination,capture,seat:selected.seat,body:incoming,meta:own(selected.seat,'meta'),definition:destScene.zone,arriving:Object.freeze([...cohort])};try{destination.combat.warlordArrival.arrive();}finally{this.#warlordArrival=null;}}\n   if(!firstBirth){this.#bountyArrival={combat:destination.combat,from};try{destination.combat.arriveBounties();}finally{this.#bountyArrival=null;}}\n   if(!firstBirth){const selected=capture.rows.find(row=>row.body===incoming);if(!selected)throw Error('Native encounter arrival lost its incoming seat');this.#delayedArrival={combat:destination.combat,kind:'encounter',capture,seat:selected.seat,body:incoming,local:localSeat,meta:selected.seat.meta};try{destination.combat.encounterArrival.arrive();}finally{this.#delayedArrival=null;}}\n   if(!firstBirth){const selected=capture.rows.find(row=>row.body===incoming);if(!selected)throw Error('Native surface arrival lost its incoming seat');this.#delayedArrival={combat:destination.combat,kind:'merc',capture,seat:selected.seat,body:incoming,local:localSeat,meta:selected.seat.meta};try{destination.combat.surfaceArrival.arriveMerc();}finally{this.#delayedArrival=null;}}\n   if(!firstBirth&&publish&&onGraph){this.#historyArrival={row:destination,seat:localSeat,body:incoming,definition:destScene.zone};try{destination.combat.historyArrival.arrive();}finally{this.#historyArrival=null;}}\n   if(!firstBirth){\n    const selectedArrival=capture.rows.find(row=>row.body===incoming);if(!selectedArrival)throw Error('Native delayed arrival lost its actual incoming seat');\n    // Native arrival orders history, then corpse projection, then the Delver.\n    // Retained arrival keeps that order after the existing controller handoff.\n    if(publish){this.#delayedArrival={combat:destination.combat,kind:'corpse',capture,seat:selectedArrival.seat,body:incoming,local:localSeat,meta:selectedArrival.seat.meta};try{destination.combat.arrivePlayerCorpses();}finally{this.#delayedArrival=null;}}\n    this.#delayedArrival={combat:destination.combat,kind:'delver',capture,seat:selectedArrival.seat,body:incoming,local:localSeat,meta:selectedArrival.seat.meta};try{destination.combat.arriveDelver();}finally{this.#delayedArrival=null;}\n   }\n\n\n   if(!firstBirth){const selected=capture.rows.find(row=>row.body===incoming);if(!selected)throw Error('Native surface arrival lost its incoming seat');this.#delayedArrival={combat:destination.combat,kind:'ascent',capture,seat:selected.seat,body:incoming,local:localSeat,meta:selected.seat.meta};try{destination.combat.surfaceArrival.arriveAscent();}finally{this.#delayedArrival=null;}}\n   if(activeRoad){const after=activeRoad.receipt.ticket.after;if(after!==undefined)this.#invokeRoad(activeRoad,after,activeRoad.receipt.ticket,[activeRoad.receipt.seat,firstBirth]);this.#roadCheck(activeRoad);}\n  }finally{this.#voyageCrossing=null;this.#moving=false;}\n }\n\n /** Query only: an external structural link cannot acquire installation rights. */\n ownsRoadLink(combat:NativeAreaSceneCombat,link:ShardWorldLink<NativeAreaRoadDestination,NativeAreaDirectoryView>):boolean{return this.#roadLinks.get(combat)===link;}\n #enableHostedRoads():void{\n  this.assertIdleFrame();this.#assertProjection();if(this.#hostedRoads)return;if(!this.#published)throw Error('Native hosted roads need a published campaign');\n  for(const row of this.#areas.values())this.#ready(row);this.#hostedRoads=true;this.#roadKeeper=this.#published;for(const row of this.#areas.values())this.#installRoadLink(row);\n }\n #installRoadLink(row:Registered):void{\n  if(this.#roadLinks.has(row.combat))return;const self=this;\n  const link:ShardWorldLink<NativeAreaRoadDestination,NativeAreaDirectoryView>=Object.freeze({role:row===this.#roadKeeper?'keeper':'unit',key:row.id,\n   enqueue(ticket:RoadTicket<NativeAreaRoadDestination>){self.#enqueueRoad(row,ticket);},\n   dispatch<T>(zoneId:string,fn:(view:NativeAreaDirectoryView)=>T):T|undefined{self.#ready(row);if(self.#frame||self.#moving){self.#deferredRoadDispatch.push({source:row,zoneId,fn});return undefined;}return self.atZone(zoneId,fn);},\n   worlds(){self.#ready(row);return Object.freeze(self.residentAreas().map(area=>self.#directory(self.#combat(area.combat))));},\n   liveSeed(zoneId:string,seatId?:string){self.#ready(row);const dest=self.#areas.get(zoneId);if(!dest)return undefined;if(seatId!==undefined){const capture=captureSeats(self.input.campaign);if(!capture.rows.some(r=>r.id===seatId))return undefined;finalSeats(capture);}self.#ready(dest);return dest.ongoing.assembly.input.geometry.currentZoneSeed;},\n  });\n  this.#roadLinks.set(row.combat,link);installNativeRoadLink(this,row.combat,link);\n }\n #ticketIdentity(receipt:RoadReceipt):void{const t=receipt.ticket;if(own(t,'seatId')!==receipt.id||own(t,'dest')!==receipt.dest||optionalOwn(t,'instance')!==receipt.instance)throw Error('Native queued ticket identity changed');}\n #enqueueRoad(source:Registered,ticket:RoadTicket<NativeAreaRoadDestination>):void{\n  if(!this.#hostedRoads)throw Error('Native hosted roads are not enabled');if(!ticket||typeof ticket!=='object')throw Error('Native road needs an actual ticket');\n  const id=own<string>(ticket,'seatId'),dest=own<string>(ticket,'dest'),instance=optionalOwn<string>(ticket,'instance');if(typeof id!=='string'||typeof dest!=='string'||(instance!==undefined&&typeof instance!=='string'))throw Error('Native road needs primitive ticket identity');\n  const campaignCapture=captureSeats(this.input.campaign),selectedSeat=campaignCapture.rows.find(row=>row.id===id);if(!selectedSeat||optionalOwn(selectedSeat.seat,'keeper'))throw Error('Native road needs an actual travelling seat');\n  this.#ready(source);const capture=captureSeats(this.input.campaign,[selectedSeat.seat]),body=capture.rows[0].body,selections=this.input.authority.selectActors([body]);\n  if(selections[0].binding!==source.binding)throw Error('Native ticket seat is not in its source');finalSeats(campaignCapture);finalSeats(capture);this.input.authority.assertFinalSelections(selections);\n  const receipt:RoadReceipt={ticket,source,capture,seat:selectedSeat.seat,id,dest,instance,origin:this.#frame?.view??null,used:false};this.#ticketIdentity(receipt);this.#roadQueue.push(receipt);\n }\n #drainRoads():readonly NativeRoadDrainResult[]{\n  this.assertIdleFrame();if(!this.#hostedRoads)throw Error('Native hosted roads are not enabled');this.#roadDraining=true;const out:NativeRoadDrainResult[]=[],moved=new Set<Seat>();\n  try{\n   while(this.#deferredRoadDispatch.length){const d=this.#deferredRoadDispatch.shift()!;try{this.#ready(d.source);this.atZone(d.zoneId,d.fn);}catch(error){out.push({seatId:'',dest:d.zoneId,outcome:'failed',error});}}\n   while(this.#roadQueue.length){const receipt=this.#roadQueue.shift()!;if(receipt.used)throw Error('Native road receipt already consumed');receipt.used=true;\n    if(moved.has(receipt.seat)){out.push({seatId:receipt.id,dest:receipt.dest,outcome:'duplicate'});continue;}\n    try{const outcome=this.#executeRoad(receipt);moved.add(receipt.seat);out.push({seatId:receipt.id,dest:receipt.dest,outcome});}catch(error){out.push({seatId:receipt.id,dest:receipt.dest,outcome:'failed',error});}\n   }\n   return Object.freeze(out.map(row=>Object.freeze(row)));\n  }finally{this.#roadDraining=false;}\n }\n #executeRoad(receipt:RoadReceipt):'moved'|'same-area'{\n  this.#ready(receipt.source);this.#assertProjection();this.#ticketIdentity(receipt);finalSeats(receipt.capture);\n  const body=receipt.capture.rows[0].body,selections=this.input.authority.selectActors([body]);if(selections[0].binding!==receipt.source.binding)throw Error('Native queued seat left its original area');finalSeats(receipt.capture);this.#ticketIdentity(receipt);this.input.authority.assertFinalSelections(selections);\n  if(!(this.input.campaign.zoneMap[receipt.dest]??this.input.campaign.caveMap[receipt.dest]))throw Error('Native road destination is unknown');\n  const dest=this.#areas.get(receipt.dest);if(dest&&this.#roadInstances.get(receipt.dest)!==receipt.instance)throw Error('Native retained zone already belongs to a different instance');if(dest===receipt.source)return 'same-area';\n  const frame={source:receipt.source,current:receipt.source,seats:Object.freeze([receipt.seat]),active:true} as Frame;frame.view=Object.freeze({get source(){return frame.source.ongoing;},get current(){if(!frame.active)throw Error('Native road frame expired');return frame.current.ongoing;},get seats(){if(!frame.active)throw Error('Native road frame expired');return frame.seats;},get active(){return frame.active;}});\n  const active:ActiveRoad={receipt,frame,body,destination:null,woke:!dest};this.#frame=frame;this.#activeRoad=active;\n  try{const from=receipt.ticket.from;this.#ticketIdentity(receipt);finalSeats(receipt.capture);this.input.authority.assertFinalSelections(selections);this.loadZone(receipt.dest,from===undefined?receipt.source.id:from??undefined);}\n  finally{frame.active=false;this.#frame=null;this.#activeRoad=null;this.#roadCallback=null;}\n  this.#finishGrounds();return 'moved';\n }\n #roadCheck(active:ActiveRoad):Registered{\n  if(this.#activeRoad!==active||this.#frame!==active.frame||!active.frame.active||!active.destination||active.frame.current!==active.destination)throw Error('Native road destination scope is expired');\n  const row=active.destination,capture=captureSeats(this.input.campaign,[active.receipt.seat]);this.#ready(row);finalSeats(capture);this.#ticketIdentity(active.receipt);\n  if(capture.seats!==active.receipt.capture.seats||capture.rows[0].body!==active.body||own(active.receipt.seat,'id')!==active.receipt.id)throw Error('Native road traveller changed during callback');Reflect.apply(authorityFinalPhysical,this.input.authority,[row.binding,[active.body]]);return row;\n }\n #roadDestination(active:ActiveRoad):NativeAreaRoadDestination{\n  const self=this,row=this.#roadCheck(active),directory=this.#directory(row),view=Object.create(null) as NativeAreaRoadDestination;\n  const check=()=>{if(self.#roadCallback!==active)throw Error('Native road callback capability expired');return self.#roadCheck(active);};\n  for(const key of Reflect.ownKeys(directory))Object.defineProperty(view,key,{enumerable:true,get(){check();const value=Reflect.get(directory,key);check();return typeof value==='function'?(...args:unknown[])=>{check();return Reflect.apply(value,directory,args);}:value;}});\n  for(const key of ['waypointPos','caveEntrances'] as const)Object.defineProperty(view,key,{enumerable:true,get(){return check().ongoing.assembly.input.geometry[key];}});\n  Object.defineProperty(view,'massRuntime',{enumerable:true,get(){check();return null;}});Object.defineProperty(view,'shardWorld',{enumerable:true,get(){return check().roads.shardWorld;}});\n  Object.defineProperty(view,'findFreeSpot',{enumerable:true,get(){const geometry=check().ongoing.assembly.input.geometry,fn=geometry.findFreeSpot;check();return(...args:Parameters<World['findFreeSpot']>)=>{check();return Reflect.apply(fn,geometry,args);};}});\n  Object.defineProperty(view,'seatHero',{enumerable:true,get(){check();const campaign=self.input.campaign,fn=campaign.seatHero;check();return(seat:Seat)=>{check();if(seat!==active.receipt.seat)throw Error('Native road cannot select another seat');return Reflect.apply(fn,campaign,[seat]);};}});\n  for(const key of ['realmContext','crusadeRealmContext','necropolisRealmContext','fractureRealmContext'] as const)Object.defineProperty(view,key,{enumerable:true,get(){return check().combat.campaignOwner.state[key];},set(value:unknown){const selected=check(),state=selected.combat.campaignOwner.state;if(!Reflect.set(state,key,value))throw new TypeError('Native realm context is not writable');self.#realmContexts.set(selected.combat,{key,definition:selected.ongoing.assembly.input.scene.zone,value});}});\n  return Object.freeze(view);\n }\n #invokeRoad(active:ActiveRoad,fn:unknown,receiver:unknown,rest:unknown[]=[]):unknown{\n  if(typeof fn!=='function')throw new TypeError('Native road selected a noncallable callback');this.#roadCheck(active);const previous=this.#roadCallback;this.#roadCallback=active;\n  try{const destination=this.#roadDestination(active);this.#roadCheck(active);const result=Reflect.apply(fn,receiver,[destination,...rest]);if(nativeBirthAsyncResult(result))throw Error('Native road callback must be synchronous');this.#roadCheck(active);return result;}\n  finally{this.#roadCallback=previous;}\n }\n #roadBeforeArrival(active:ActiveRoad,woke:boolean):void{\n  if(woke){const callback=active.receipt.ticket.onFirstWake;if(callback!==undefined)this.#invokeRoad(active,callback,active.receipt.ticket);}\n  this.#roadCheck(active);const requested=active.receipt.ticket.landing;this.#roadCheck(active);\n  const landing=(typeof requested==='function'?this.#invokeRoad(active,requested,undefined):requested) as LandingSpot|undefined;this.#roadCheck(active);\n  if(landing&&landing!=='entry'){const at=landing.at,opts={...(landing.spread!==undefined?{spread:landing.spread}:{}),...(landing.band?{band:landing.band}:{}),...(landing.tier!==undefined?{tier:landing.tier}:{})};this.#roadCheck(active);this.landPartyAt(at,opts);}\n }\n\n /** The real global removeSeat calls this only after it removes and releases\n  * the actual bodies. A captured cohort can shrink, never acquire new seats. */\n retireSeat(seat:Seat):void {\n  const seats=rawValues<Seat>(this.input.campaign.seats);if(seats.includes(seat))throw Error('Native retired seat still belongs to campaign');\n  const body=own<Actor>(seat,'actor');this.input.authority.assertUnclaimed(body);\n  const without=(rows:readonly Seat[])=>Object.freeze(rows.filter(row=>row!==seat));if(this.#frame?.active)this.#frame.seats=without(this.#frame.seats);\n  const pending=this.#traversalValue&&this.#traversals.get(this.#traversalValue);if(pending)pending.seats=without(pending.seats);\n  const step=this.#traversalStep?.continuation;if(step&&step!==pending)step.seats=without(step.seats);\n }\n #replaceTraversal(next:TraversalState|null):void {\n  const previous=this.#traversalValue;\n  if(previous!==next&&previous){const continuation=this.#traversals.get(previous);if(continuation&&!(next===null&&this.#traversalStep?.continuation===continuation&&this.#traversalStep.finished))continuation.expired=true;}\n  this.#traversalValue=next;\n }\n /** Called only at the shared native assignment seam. The record keeps its\n  * real callbacks; these wrappers add an exact, synchronous continuation. */\n #bindTraversal(record:TraversalState):void {\n  const frame=this.#frame;if(!frame?.active||!this.#published)throw Error('Native traversal binding needs an active actual transition');this.#assertProjection();\n  if(this.#traversalValue!==record||this.#traversals.has(record))throw Error('Native traversal binding needs the newly installed exact record');\n  const swap=optionalOwn<(()=>void)>(record,'swap'),done=optionalOwn<(()=>void)>(record,'done');\n  if((swap!==undefined&&typeof swap!=='function')||(done!==undefined&&typeof done!=='function'))throw Error('Native traversal callbacks must be ordinary callable fields');\n  if(swap)writable(record,'swap');if(done)writable(record,'done');\n  const continuation:TraversalContinuation={origin:frame.view,record,source:frame.source,current:frame.current,seats:frame.seats,swap,done,swapWrapper:undefined,doneWrapper:undefined,swapUsed:false,doneUsed:false,expired:false},self=this;\n  if(swap)continuation.swapWrapper=function(this:TraversalState){return self.#invokeTraversal(continuation,'swap',this);};\n  if(done)continuation.doneWrapper=function(this:TraversalState){return self.#invokeTraversal(continuation,'done',this);};\n  this.#traversals.set(record,continuation);if(swap)Object.defineProperty(record,'swap',{value:continuation.swapWrapper,writable:false,configurable:false});if(done)Object.defineProperty(record,'done',{value:continuation.doneWrapper,writable:false,configurable:false});\n }\n /** Actual updateTraversal owner calls this around its exact shared body.\n  * It is reachable only through the privately issued actual owner bridge. */\n #runTraversalStep(action:()=>void):void {\n  if(this.#frame||this.#traversalStep||this.#moving)throw Error('Native traversal step is already active');this.#assertProjection();\n  const record=this.#traversalValue;if(record===null)return;const continuation=this.#traversals.get(record);if(!continuation||continuation.expired)throw Error('Native traversal step has no live bound record');\n  if(optionalOwn(record,'swap')!==continuation.swapWrapper||optionalOwn(record,'done')!==continuation.doneWrapper)throw Error('Native traversal callback identity changed');\n  this.#ready(continuation.current);const capture=captureSeats(this.input.campaign,continuation.seats),subjects=capture.rows.map(row=>row.body),selected=this.input.authority.selectActors(subjects);\n  if(selected.some(row=>row.binding!==continuation.current.binding))throw Error('Native traversal cohort left its selected area');finalSeats(capture);this.input.authority.assertFinalSelections(selected);\n  if(this.#traversalValue!==record||continuation.expired)throw Error('Native traversal record changed during admission');\n  const state={source:continuation.source,current:continuation.current,seats:continuation.seats,active:true} as Frame;\n  state.view=Object.freeze({get source(){return state.source.ongoing;},get current(){if(!state.active)throw Error('Native transition frame is expired');return state.current.ongoing;},get seats(){if(!state.active)throw Error('Native transition frame is expired');return state.seats;},get active(){return state.active;}});\n  const step={continuation,finished:false};this.#frame=state;this.#traversalStep=step;\n  try{const result=action();if(nativeBirthAsyncResult(result))throw Error('Native traversal step must be synchronous');}\n  finally{continuation.current=state.current;if(this.#traversalValue!==record)continuation.expired=true;state.active=false;this.#frame=null;this.#traversalStep=null;}\n }\n /** Exact pre-null hook in the real native completion branch. Permission is\n  * consumed by done and expires at the end of this very same native step. */\n #finishTraversal(record:TraversalState):void {\n  const step=this.#traversalStep;if(!step||step.finished||step.continuation.record!==record||step.continuation.expired||this.#traversalValue!==record||own(record,'phase')!=='land')throw Error('Native traversal finish needs its exact selected native step');\n  step.finished=true;\n }\n #invokeTraversal(continuation:TraversalContinuation,kind:'swap'|'done',receiver:TraversalState):void {\n  const step=this.#traversalStep,frame=this.#frame,record=continuation.record;\n  if(!step||step.continuation!==continuation||!frame?.active||continuation.expired||receiver!==record)throw Error('Native traversal callback is expired or foreign');\n  if(kind==='swap'){\n   if(step.finished||continuation.swapUsed||continuation.doneUsed||this.#traversalValue!==record||optionalOwn(record,'swap')!==continuation.swapWrapper)throw Error('Native traversal swap is stale or repeated');continuation.swapUsed=true;\n  }else{\n   if(!step.finished||continuation.doneUsed||this.#traversalValue!==null||optionalOwn(record,'done')!==continuation.doneWrapper||(continuation.swap!==undefined&&!continuation.swapUsed))throw Error('Native traversal completion is stale or out of order');continuation.doneUsed=true;\n  }\n  const callback=kind==='swap'?continuation.swap:continuation.done;\n  const previous=this.#executingTraversalCallback;this.#executingTraversalCallback=continuation;\n  try{const result=Reflect.apply(callback!,receiver,[]);if(nativeBirthAsyncResult(result))throw Error('Native traversal callback must be synchronous');}\n  finally{this.#executingTraversalCallback=previous;continuation.current=frame.current;if(kind==='done')continuation.expired=true;}\n }\n landPartyAt(at:Vec2,opts?:Parameters<World['landPartyAt']>[1]):void{\n  const frame=this.#frame;if(!frame?.active)throw Error('Native party landing needs its exact transition cohort');const row=frame.current;this.#ready(row);\n  const capture=captureSeats(this.input.campaign,frame.seats),subjects=capture.rows.map(r=>r.body),selected=this.input.authority.selectActors(subjects);\n  if(selected.some(s=>s.binding!==row.binding))throw Error('Native transition landing contains a foreign seat');finalSeats(capture);this.input.authority.assertFinalSelections(selected);\n  const host=Object.create(row.ongoing.assembly.input.harbor.host) as NativeSceneHarborHost;\n  Object.defineProperty(host,'seats',{get:()=>frame.seats});harborLandPartyAt(host,at,opts);\n }\n}\n\ninstallNativeHostedCoordinator({is:isNativeAreaSceneTransitionCoordinator,idle:NativeAreaSceneTransitionCoordinator.prototype.assertIdleFrame,ready:NativeAreaSceneTransitionCoordinator.prototype.nativeWorldReady,areaFor:NativeAreaSceneTransitionCoordinator.prototype.areaFor});\n\nconst groundMethods=Object.freeze({assertQuests:NativeAreaSceneTransitionCoordinator.prototype.assertGroundRegistration,capture:NativeAreaSceneTransitionCoordinator.prototype.shouldCaptureGround,save:NativeAreaSceneTransitionCoordinator.prototype.groundRefreshForSave,retirement:NativeAreaSceneTransitionCoordinator.prototype.assertGroundMemoryRetirement,areaRetirement:NativeAreaSceneTransitionCoordinator.prototype.assertGroundRetirement});\n",
      "beforeHash": "06ef24ba3433629042d73996da1f5f33afd12ae56c696bc4cc499b69cb93af7c",
      "afterHash": "34f9d2a5f15856615bb8868f66c5b1cbe82f1b2fe9f7fb2b61e5a311fc618600",
      "normalizedBefore": "06ef24ba3433629042d73996da1f5f33afd12ae56c696bc4cc499b69cb93af7c",
      "normalizedAfter": "34f9d2a5f15856615bb8868f66c5b1cbe82f1b2fe9f7fb2b61e5a311fc618600"
    }
  ],
  "newRuntime": [
    {
      "file": "server/musterAreas.ts",
      "sha256": "9771b9675a29ca1a01d3cdeef66a637f64ed11d7057697a77d243a9261e6b40f"
    },
    {
      "file": "server/nativeShardMuster.ts",
      "sha256": "63b8a27919888e02a43a124a1a9eca8dd9d84704221276d5c75bfcef9ed4db38"
    },
    {
      "file": "src/worldmass/nativeAreaHostedRoadSupport.ts",
      "sha256": "84d1e4c31a945246ef2aba40bde53ba0bd81f25e7da11e3f4073c48b87e97821"
    },
    {
      "file": "src/worldmass/nativeAreaHostedPresentation.ts",
      "sha256": "f998370e452d841ce24bcbb4994e0ab27452990b53e014f2a2c3ca21d59598a1"
    }
  ],
  "unchangedMethods": [
    {
      "file": "server/muster.ts",
      "name": "MusterDesk.size:get",
      "sha256": "93bcc23a5ea7e15faff4c45e8459b4a21ae3cf298f124efbe377e31d7bc935e4"
    },
    {
      "file": "server/muster.ts",
      "name": "MusterDesk.offer",
      "sha256": "8613ba3286e5476267fb36bfbd3554730bfb9669d308b8730ae84a8991ac3218"
    },
    {
      "file": "server/muster.ts",
      "name": "MusterDesk.mustering",
      "sha256": "c99708d8bc2695098eeeab384a76c0f81d193213bf3f2e17fe19d6e0fc056bb5"
    },
    {
      "file": "server/muster.ts",
      "name": "MusterDesk.judge",
      "sha256": "e0f8eec309b7d7995e91b8126afd568b818b7fb705e14011a610e3335ed3e3d9"
    },
    {
      "file": "server/muster.ts",
      "name": "MusterDesk.status",
      "sha256": "cfd09fedce3171d846c125373c28c1e1327915c00354080e00610bd53091dcd5"
    },
    {
      "file": "server/muster.ts",
      "name": "MusterDesk.standingIn",
      "sha256": "2cce00aab8f67c1a109418ead81eafc5d1f88536869a82cd309b120879fa4c2f"
    },
    {
      "file": "server/muster.ts",
      "name": "MusterDesk.inside",
      "sha256": "9ff172fb9ab7424791cd91afb4d1084afc3c4263052d5be920971111273147cf"
    },
    {
      "file": "server/muster.ts",
      "name": "MusterDesk.count",
      "sha256": "0733fe8170504b3cee4cdc276b45543b7a481e8b17ce7bac991de7ab9aa74809"
    },
    {
      "file": "server/muster.ts",
      "name": "MusterDesk.verdict",
      "sha256": "623b1a603000f67f7091d4ea8bb132e223cf9b85567b224bbfdd9b6804665e5e"
    },
    {
      "file": "src/worldmass/nativeAreaSceneCampaignFrame.ts",
      "name": "members",
      "sha256": "721f0f9a2adf891dbe82b3e1891a7dfc372b41a6bb9b99c0afdb3a7c22c5415b"
    },
    {
      "file": "src/worldmass/nativeAreaSceneCampaignFrame.ts",
      "name": "own",
      "sha256": "14dc6c30cda760dc2fced5a603aff3012c2d09bc141dcfec0218182801b776e5"
    },
    {
      "file": "src/worldmass/nativeAreaSceneCampaignFrame.ts",
      "name": "NativeAreaSceneCampaignFrame.constructor",
      "sha256": "bc1829242af4b77fa2dfed8df42c58abf53ae76df461b427eb497224d1823178"
    },
    {
      "file": "src/worldmass/nativeAreaSceneCampaignFrame.ts",
      "name": "NativeAreaSceneCampaignFrame.#assertInstalled",
      "sha256": "b4ac22f0a1ec9a3b1955ff305300fe10b53d888a19489110da0a5b567c824444"
    },
    {
      "file": "src/worldmass/nativeAreaSceneCampaignFrame.ts",
      "name": "NativeAreaSceneCampaignFrame.#host",
      "sha256": "7f36848c2a094b0e859a50d00b89056c1ec0dc8000968b7aa3651431ca148686"
    },
    {
      "file": "src/worldmass/nativeAreaSceneCampaignFrame.ts",
      "name": "NativeAreaSceneCampaignFrame.#selected",
      "sha256": "95adf7ca1bbca672d58886dd1ce7d63e20ce34ff80f1088878a9ba17d374816b"
    },
    {
      "file": "src/worldmass/nativeAreaSceneCampaignFrame.ts",
      "name": "NativeAreaSceneCampaignFrame.#inSelected",
      "sha256": "e40141495f61231b6452cfbbc1dd7c6b066b0048e32e46fbfd37e7d89319b722"
    },
    {
      "file": "src/worldmass/nativeAreaSceneCampaignFrame.ts",
      "name": "NativeAreaSceneCampaignFrame.#run",
      "sha256": "d03c5aae19d9ef5c591a250ca4e2f357b45314722a03b344b44a8999daba22a1"
    },
    {
      "file": "src/worldmass/nativeAreaSceneCampaignFrame.ts",
      "name": "NativeAreaSceneCampaignFrame.#withRealmEntry",
      "sha256": "9a70f0ba93ee5d1659af2d3e68cf372e9deb6fe7e7bc33857cbea50974bba5f0"
    },
    {
      "file": "src/worldmass/nativeAreaSceneCampaignFrame.ts",
      "name": "NativeAreaSceneCampaignFrame.#read",
      "sha256": "a61a3bc3747a8275412a5aac34c069f595d18793a32a36088a763be840def3e8"
    },
    {
      "file": "src/worldmass/nativeAreaSceneCampaignFrame.ts",
      "name": "NativeAreaSceneCampaignFrame.#write",
      "sha256": "d30b1a3529ee82b739319c638b17fd699002a3c816a7bfd108f72a6e63c09ae9"
    },
    {
      "file": "src/worldmass/nativeAreaSceneCampaignFrame.ts",
      "name": "NativeAreaSceneCampaignFrame.#selectedFrameSeats",
      "sha256": "77133e20ea7beee33e9ebd2225a6d11b3148d41e741fe7c435ce56bcd7705d45"
    },
    {
      "file": "src/worldmass/nativeAreaSceneCampaignFrame.ts",
      "name": "NativeAreaSceneCampaignFrame.#selectedSeat",
      "sha256": "863e5013890fe2647e353fbcf7713a309794003b119a40b4fa03fc6c9e254cd9"
    },
    {
      "file": "src/worldmass/nativeAreaSceneCampaignFrame.ts",
      "name": "NativeAreaSceneCampaignFrame.#owner",
      "sha256": "5479cd6bf2eb27c02c0a5723145eb3d05b5f5b01620b22df768fb0255d9dab37"
    },
    {
      "file": "src/worldmass/nativeAreaSceneCampaignFrame.ts",
      "name": "NativeAreaSceneCampaignFrame.#published",
      "sha256": "986d4ea834703538b3efa5be0680f421ff06d8a420c748c4bf3f4d1964b16ec3"
    },
    {
      "file": "src/worldmass/nativeAreaSceneCampaignFrame.ts",
      "name": "NativeAreaSceneCampaignFrame.#currentStep",
      "sha256": "32e153102a89f8669039fe59f32ec29ad57b5f6240c9fd83438a6c3ac0742395"
    },
    {
      "file": "src/worldmass/nativeAreaSceneCampaignFrame.ts",
      "name": "NativeAreaSceneCampaignFrame.#areaStep",
      "sha256": "14abb0ac47ec9c5959284adf96004a644c72b36450cc9807708325a2d13cd213"
    },
    {
      "file": "src/worldmass/nativeAreaSceneCampaignFrame.ts",
      "name": "NativeAreaSceneCampaignFrame.#combatStep",
      "sha256": "0d0c2ca8357e4de326bf0399e1f504496892b02da30d8bd6f8f98e5e9381bdbb"
    },
    {
      "file": "src/worldmass/nativeAreaSceneCampaignFrame.ts",
      "name": "NativeAreaSceneCampaignFrame.#dynamicHost",
      "sha256": "39dc691927600284f9dc5457728b703738cce8e26b142aeb871a5e8decf2d09d"
    },
    {
      "file": "src/worldmass/nativeAreaSceneCampaignFrame.ts",
      "name": "NativeAreaSceneCampaignFrame.#directorHost",
      "sha256": "e328ea678005e6b4f5f0ce1074fea7bb6c6af5375f57faaf855d68bbad5a07cc"
    },
    {
      "file": "src/worldmass/nativeAreaSceneCampaignFrame.ts",
      "name": "NativeAreaSceneCampaignFrame.beginScene",
      "sha256": "f02d50f00adce9f330f25bc2dc415d16a3b8ec86d93dd86d746ff8b734e940ad"
    },
    {
      "file": "src/worldmass/nativeAreaSceneCampaignFrame.ts",
      "name": "NativeAreaSceneCampaignFrame.updateDirector",
      "sha256": "0037da4a82c75040e61c519d8b09c6da59d9f5c22ecc4f083392f21f53599493"
    },
    {
      "file": "src/worldmass/nativeAreaSceneCampaignFrame.ts",
      "name": "NativeAreaSceneCampaignFrame.#pendingTransitions",
      "sha256": "969c22df961fddb0c548085068a50595f81b1db0e9535cc3c1d0f8ac2fcb93de"
    },
    {
      "file": "src/worldmass/nativeAreaSceneCampaignFrame.ts",
      "name": "NativeAreaSceneCampaignFrame.#wipe",
      "sha256": "344710f1580548e9cbd23190cb48e55f0b97147ea0253b362b3bbe12001441d9"
    },
    {
      "file": "src/worldmass/nativeAreaSceneCampaignFrame.ts",
      "name": "NativeAreaSceneCampaignFrame.isCampaignFrameOwner",
      "sha256": "5068cb2503d2455ad78c105e1aed1cb47996565e24646db33b9b5a740539b973"
    },
    {
      "file": "src/worldmass/nativeAreaSceneCampaignFrame.ts",
      "name": "NativeAreaSceneCampaignFrame.shardRoadView:get",
      "sha256": "1c61a65747e9054ca3dcbdca5ba9108586aa4fc4a752780cc260385d721aad85"
    },
    {
      "file": "src/worldmass/nativeAreaSceneCampaignFrame.ts",
      "name": "NativeAreaSceneCampaignFrame.cacheShardRoadHost",
      "sha256": "d14c546afd8eec8e1768d1f5645cafed96c7f149e9061180407393f543b20e2b"
    },
    {
      "file": "src/worldmass/nativeAreaSceneCampaignFrame.ts",
      "name": "NativeAreaSceneCampaignFrame.enableHostedRoads",
      "sha256": "419a68caf62cc6945ccc08e4580c8148345b9b00ce70f1daa56298cd0a11eaae"
    },
    {
      "file": "src/worldmass/nativeAreaSceneCampaignFrame.ts",
      "name": "NativeAreaSceneCampaignFrame.drainShardRoads",
      "sha256": "98adc580fe650c7e8b02f2f159d8b5693b3c18a3d46ef199600fab4c01294c7d"
    },
    {
      "file": "src/worldmass/nativeAreaSceneCampaignFrame.ts",
      "name": "NativeAreaSceneCampaignFrame.scanShardRoads",
      "sha256": "35bf577172491614881d39211ccefb5ad105d02194878fd17fab7f94c6e4bb65"
    },
    {
      "file": "src/worldmass/nativeAreaSceneCampaignFrame.ts",
      "name": "NativeAreaSceneCampaignFrame.updateModeRespawn",
      "sha256": "ba305d5be597dad8194ae914300dfac570248a4989d09fd058f1e0dafb23adc7"
    },
    {
      "file": "src/worldmass/nativeAreaSceneCampaignFrame.ts",
      "name": "NativeAreaSceneCampaignFrame.updateBountyBoard",
      "sha256": "697cf06ae11a545008c8aeba737c14364d4de3690289d75857316792a4302f0e"
    },
    {
      "file": "src/worldmass/nativeAreaSceneCampaignFrame.ts",
      "name": "NativeAreaSceneCampaignFrame.updateSail",
      "sha256": "e171a14ed324a24b53e6e3d1f0a28ed48433666e7f12ff08919962b88c819599"
    },
    {
      "file": "src/worldmass/nativeAreaSceneCampaignFrame.ts",
      "name": "NativeAreaSceneCampaignFrame.updateDelver",
      "sha256": "158d708e26c2c6a1bff8e28c57ad94e9ce3137a5958617c37eb81fd154e71bec"
    },
    {
      "file": "src/worldmass/nativeAreaSceneCampaignFrame.ts",
      "name": "NativeAreaSceneCampaignFrame.updateSailing",
      "sha256": "4def9443453689e029e2addb03c4b9c6be53a9dcbb6318304ed60fec52e24aba"
    },
    {
      "file": "src/worldmass/nativeAreaSceneCampaignFrame.ts",
      "name": "NativeAreaSceneCampaignFrame.performModeRespawn",
      "sha256": "2209d7901a9189c88e80d8abd6953f2547c8b6dea986bab334fd09fafc471edb"
    },
    {
      "file": "src/worldmass/nativeAreaSceneCampaignFrame.ts",
      "name": "NativeAreaSceneCampaignFrame.requestMeta",
      "sha256": "84bf6aa5951079d08a9d0114ad407cd9df049e4b5e0399be7445905cfa2ac520"
    },
    {
      "file": "src/worldmass/nativeAreaSceneCampaignFrame.ts",
      "name": "NativeAreaSceneCampaignFrame.enterSailing",
      "sha256": "8def2c5915b48e184b771b9487447b469be6f253c4975d105955b959b81340ff"
    },
    {
      "file": "src/worldmass/nativeAreaSceneCampaignFrame.ts",
      "name": "NativeAreaSceneCampaignFrame.descend",
      "sha256": "76e2057f218f01222385f89d4ba3a87c2149d3f9d23edee4fb5ef9df61446ab5"
    },
    {
      "file": "src/worldmass/nativeAreaSceneCampaignFrame.ts",
      "name": "NativeAreaSceneCampaignFrame.landAshore",
      "sha256": "f0289fdb5751ff37f47a1857c68c3c0092f094dadca4bd8340f08b30b3d986ba"
    },
    {
      "file": "src/worldmass/nativeAreaSceneCampaignFrame.ts",
      "name": "NativeAreaSceneCampaignFrame.enterSidezone",
      "sha256": "4c6ec060826bd835c1ee24dde598a8cb8f8038c6701005585c6f1b4f6a1d7b9e"
    },
    {
      "file": "src/worldmass/nativeAreaSceneCampaignFrame.ts",
      "name": "NativeAreaSceneCampaignFrame.onHoldfastDwell",
      "sha256": "0399c590861b131fa87987bbe9ee579bdb87d3a46ec26bbfbd047c335ce30d93"
    },
    {
      "file": "src/worldmass/nativeAreaSceneCampaignFrame.ts",
      "name": "NativeAreaSceneCampaignFrame.realmGates",
      "sha256": "3a3fa7500ff5b2a91bac9579530d0834bf9c574e22e8820b52da9c67add000b3"
    },
    {
      "file": "src/worldmass/nativeAreaSceneCampaignFrame.ts",
      "name": "NativeAreaSceneCampaignFrame.travelThrough",
      "sha256": "02c3621c1523f73c9cb5bca8b13720a0c0cb071afeb14fe39deca4f4db351160"
    },
    {
      "file": "src/worldmass/nativeAreaSceneCampaignFrame.ts",
      "name": "NativeAreaSceneCampaignFrame.updateTownPortals",
      "sha256": "fb4581f07d1918e4c21e590d14882f7272603e6d017cafed7b67b20bc81ac027"
    },
    {
      "file": "src/worldmass/nativeAreaSceneCampaignFrame.ts",
      "name": "NativeAreaSceneCampaignFrame.applyAction",
      "sha256": "23535393dd346cbb557bf0ba6d385dfa0efc26a0f9e843d32189c8114c941f14"
    },
    {
      "file": "src/worldmass/nativeAreaSceneCampaignFrame.ts",
      "name": "NativeAreaSceneCampaignFrame.enterDimension",
      "sha256": "d75fc0f13219d9912494a36189157e4ba5887878e806d24915f497f0a863f2fd"
    },
    {
      "file": "src/worldmass/nativeAreaSceneCampaignFrame.ts",
      "name": "NativeAreaSceneCampaignFrame.enterDemonRealm",
      "sha256": "2c0c582b8fb014bc40994c87bb18e2a3c2961e1e17d8733e076e511130e5d7fe"
    },
    {
      "file": "src/worldmass/nativeAreaSceneCampaignFrame.ts",
      "name": "NativeAreaSceneCampaignFrame.enterCrusadeSanctum",
      "sha256": "7102a8961a5899d6847f2213df09108195ecd4558371c56d1d77fb167d9f4943"
    },
    {
      "file": "src/worldmass/nativeAreaSceneCampaignFrame.ts",
      "name": "NativeAreaSceneCampaignFrame.enterNecropolis",
      "sha256": "2c462b50ab8364098732abb8d85af0efa697c8248dd819ce4fa75da8107de984"
    },
    {
      "file": "src/worldmass/nativeAreaSceneCampaignFrame.ts",
      "name": "NativeAreaSceneCampaignFrame.enterFractureRift",
      "sha256": "e1a9e6e03bc6487a8076b331c7f6a79dadd8cfb5ccd3581cee63be322d818cc8"
    },
    {
      "file": "src/worldmass/nativeAreaSceneCampaignFrame.ts",
      "name": "NativeAreaSceneCampaignFrame.enterCourtDomain",
      "sha256": "e69c65765ce8b4de3d22515a4b1215f20b844f63971de675707d9f28a80996bc"
    },
    {
      "file": "src/worldmass/nativeAreaSceneCampaignFrame.ts",
      "name": "NativeAreaSceneCampaignFrame.beginWraithsailBoarding",
      "sha256": "291134c2a556e2f83af8d6b808c2487345a89f9731e8f1a18e1449ab48c7ccf6"
    },
    {
      "file": "src/worldmass/nativeAreaSceneCampaignFrame.ts",
      "name": "NativeAreaSceneCampaignFrame.resumeSpawn",
      "sha256": "208d3f831002cf6b562372c07766537d5af5a928a15efd283afde785070a7dc7"
    },
    {
      "file": "src/worldmass/nativeAreaSceneCampaignFrame.ts",
      "name": "NativeAreaSceneCampaignFrame.applyActionAs",
      "sha256": "f684503e0a2c528e1a8cba412f77c78cafa2b781179b771eaeb40ab61c84f2ab"
    },
    {
      "file": "src/worldmass/nativeAreaSceneCampaignFrame.ts",
      "name": "NativeAreaSceneCampaignFrame.enterRealmArena",
      "sha256": "844a2eda4dfd51076359b3567777bfed91e3f4329e2c9cd4cb9ab0d116d40ad3"
    },
    {
      "file": "src/worldmass/nativeAreaSceneCampaignFrame.ts",
      "name": "NativeAreaSceneCampaignFrame.resumeCaveLadder",
      "sha256": "58b0ef71a7e0c59fcb251a786d0dcb6e8e5504bcdcf7a4bd30dcdd36f4b0a3c7"
    },
    {
      "file": "src/worldmass/nativeAreaSceneCampaignFrame.ts",
      "name": "NativeAreaSceneCampaignFrame.startCaravan",
      "sha256": "812ac3eb6c79b020e11cde12a9cb59e9f72ea16dad11b761e39d8db7fbfa4240"
    },
    {
      "file": "src/worldmass/nativeAreaSceneCampaignFrame.ts",
      "name": "NativeAreaSceneCampaignFrame.travelToWaypoint",
      "sha256": "6e744e86a887fc0d2f11708e3374e29acd69f58cdc5393518d1d81debdeb36fe"
    },
    {
      "file": "src/worldmass/nativeAreaSceneCampaignFrame.ts",
      "name": "NativeAreaSceneCampaignFrame.realmArenaWake",
      "sha256": "b53efacb10bf799e1c500d60f5fb13fb6555c7a20d7728985bcd15fa987e3394"
    },
    {
      "file": "src/worldmass/nativeAreaSceneCampaignFrame.ts",
      "name": "NativeAreaSceneCampaignFrame.chartCourse",
      "sha256": "1bc0015357c9e268fae4c8d87c7e6246353833af5ad05500fdc948a46e848b60"
    },
    {
      "file": "src/worldmass/nativeAreaSceneCampaignFrame.ts",
      "name": "NativeAreaSceneCampaignFrame.sailTo",
      "sha256": "6dee642e06a94ac01db89a8236cf1e257ac6f369006022f44d29a12211c387e5"
    },
    {
      "file": "src/worldmass/nativeAreaSceneTransitionCoordinator.ts",
      "name": "issueNativeRoadQueueBridge",
      "sha256": "48d74ce17592c9509a042627c39c3f7ccd11b3bb8f5fdd45cb61e672916cca87"
    },
    {
      "file": "src/worldmass/nativeAreaSceneTransitionCoordinator.ts",
      "name": "issueNativeRealmEntryBridge",
      "sha256": "67580ca1450817899232c3742088fb02ac471299b1c03adb55c9a55fe0f42c1b"
    },
    {
      "file": "src/worldmass/nativeAreaSceneTransitionCoordinator.ts",
      "name": "issueNativeTransitionOwnerBridge",
      "sha256": "095336d0d8a5f4cedfc5c9b1670a1e2e9a306c518bf25d58e529baf7629db5e1"
    },
    {
      "file": "src/worldmass/nativeAreaSceneTransitionCoordinator.ts",
      "name": "hasNativeAreaSceneTransitionCoordinator",
      "sha256": "099b44563c9dc7195baf1103a72f55c843a7cabfaea626cdea93127c058d3b76"
    },
    {
      "file": "src/worldmass/nativeAreaSceneTransitionCoordinator.ts",
      "name": "isNativeAreaSceneTransitionCoordinator",
      "sha256": "16bab6d70264763c6b3a3a934762d4930bb7e1bebeb741d9b98c2a5520711f34"
    },
    {
      "file": "src/worldmass/nativeAreaSceneTransitionCoordinator.ts",
      "name": "own",
      "sha256": "d772626c14d764e00c9aa5ab88673c7b96f2bd407937408e27d9773611b3707e"
    },
    {
      "file": "src/worldmass/nativeAreaSceneTransitionCoordinator.ts",
      "name": "optionalOwn",
      "sha256": "6b215e03ba25ff2b24152af6b2ac2ee3d7d2745a9964ea6e27b523cbe3ac78c5"
    },
    {
      "file": "src/worldmass/nativeAreaSceneTransitionCoordinator.ts",
      "name": "writable",
      "sha256": "016f6ec15efb3a7ebfff6c3964b3851e82cb50ecd8c7f8cfd8f23f1e3d79a3d1"
    },
    {
      "file": "src/worldmass/nativeAreaSceneTransitionCoordinator.ts",
      "name": "mutableCensus",
      "sha256": "4e4bb8c7dced867703a36c8c8b86e0899e1d99cba6cff139b2355801e53a0da0"
    },
    {
      "file": "src/worldmass/nativeAreaSceneTransitionCoordinator.ts",
      "name": "rawValues",
      "sha256": "e7d9f17df9b163e281230ff309d1677e05acb649b3666344119b2c7496429acf"
    },
    {
      "file": "src/worldmass/nativeAreaSceneTransitionCoordinator.ts",
      "name": "captureSeats",
      "sha256": "d2869bf49655188e67e7c33f57965def5cc91fb54c2a68ba8ec15abbfe586f07"
    },
    {
      "file": "src/worldmass/nativeAreaSceneTransitionCoordinator.ts",
      "name": "finalSeats",
      "sha256": "a2ba3e2ad2c895fb06d80f0da9d17444e0af6ce37aa3cbffd4f948bc8fc44780"
    },
    {
      "file": "src/worldmass/nativeAreaSceneTransitionCoordinator.ts",
      "name": "assertNativePackedTravel",
      "sha256": "898502c5fcc5574049c6c70bce2ccea96f4699d7710c8fa374f015daf2be5fe1"
    },
    {
      "file": "src/worldmass/nativeAreaSceneTransitionCoordinator.ts",
      "name": "consumeNativePackedTravel",
      "sha256": "3a28702ff68827cbd23c2306c2a19f48d7484c7964c1ae657d3c9731924b2f79"
    },
    {
      "file": "src/worldmass/nativeAreaSceneTransitionCoordinator.ts",
      "name": "NativeAreaSceneTransitionCoordinator.constructor",
      "sha256": "0a4acb3b18684347da4e0cb55a88e99bbf96b5207759ab69efced3bb001cb848"
    },
    {
      "file": "src/worldmass/nativeAreaSceneTransitionCoordinator.ts",
      "name": "NativeAreaSceneTransitionCoordinator.attachPreparation",
      "sha256": "e6ad6bbde75d7b8b08faa32adbb53adb14263b1800e53cbe788d96ef33312eb1"
    },
    {
      "file": "src/worldmass/nativeAreaSceneTransitionCoordinator.ts",
      "name": "NativeAreaSceneTransitionCoordinator.assertIdleFrame",
      "sha256": "4b1e88541b68edf2704cec4c715a85ae86635424aa22bcf935d39cd0c7f1fb9e"
    },
    {
      "file": "src/worldmass/nativeAreaSceneTransitionCoordinator.ts",
      "name": "NativeAreaSceneTransitionCoordinator.current:get",
      "sha256": "b20bf18273b075471cebfccf605930169a0f72b0a2f260a51e70fd9303e7e198"
    },
    {
      "file": "src/worldmass/nativeAreaSceneTransitionCoordinator.ts",
      "name": "NativeAreaSceneTransitionCoordinator.published:get",
      "sha256": "4ae97147e511045c5380044470bab1af02ff5057cc600a3ed70d914fa9d85588"
    },
    {
      "file": "src/worldmass/nativeAreaSceneTransitionCoordinator.ts",
      "name": "NativeAreaSceneTransitionCoordinator.retire",
      "sha256": "6d9a2641383385af593760967c8a804adc092cdbf027b7993088e9036bb027cc"
    },
    {
      "file": "src/worldmass/nativeAreaSceneTransitionCoordinator.ts",
      "name": "NativeAreaSceneTransitionCoordinator.isRetiredVoyage",
      "sha256": "083d2c5f2f61795d810b4d4a3d8fae8e44902e2c9e354bf8e470a3915c1b83eb"
    },
    {
      "file": "src/worldmass/nativeAreaSceneTransitionCoordinator.ts",
      "name": "NativeAreaSceneTransitionCoordinator.assertVoyageRetirement",
      "sha256": "7f6979c096b3dd003994e87e4e5e0f12329cff11e653bdbd912d95951d3fa2a4"
    },
    {
      "file": "src/worldmass/nativeAreaSceneTransitionCoordinator.ts",
      "name": "NativeAreaSceneTransitionCoordinator.assertVoyageArrival",
      "sha256": "876b063793a6d9a656aae23854bee8f2694487866e008c52b68172539c8fde30"
    },
    {
      "file": "src/worldmass/nativeAreaSceneTransitionCoordinator.ts",
      "name": "NativeAreaSceneTransitionCoordinator.#abandonVoyageSurface",
      "sha256": "317f755b5cad766360cea0df7cd74cc5d57afa3b078d38bd388d30d5982ebe29"
    },
    {
      "file": "src/worldmass/nativeAreaSceneTransitionCoordinator.ts",
      "name": "NativeAreaSceneTransitionCoordinator.prepareVoyageSurface",
      "sha256": "f32d54c5274099f7187ace8baac33f4538c3957c52b9c51305560f4a38b0e615"
    },
    {
      "file": "src/worldmass/nativeAreaSceneTransitionCoordinator.ts",
      "name": "NativeAreaSceneTransitionCoordinator.#finishVoyage",
      "sha256": "1fc92ed0261ac441b891053ecd8f57965cebb8efd45b072454889e3a7cb1819e"
    },
    {
      "file": "src/worldmass/nativeAreaSceneTransitionCoordinator.ts",
      "name": "NativeAreaSceneTransitionCoordinator.assertGroundRegistration",
      "sha256": "3e3114d0f9c8a83d43c661e81ae578449c04011343f403fafdda703429055a9a"
    },
    {
      "file": "src/worldmass/nativeAreaSceneTransitionCoordinator.ts",
      "name": "NativeAreaSceneTransitionCoordinator.#bindGround",
      "sha256": "18e8173928e0a8d2a7c3bc7420623a5a907b04df2f73b0813ecd0c7f2578cbe1"
    },
    {
      "file": "src/worldmass/nativeAreaSceneTransitionCoordinator.ts",
      "name": "NativeAreaSceneTransitionCoordinator.#recordGround",
      "sha256": "9aced34c7fa9f86a386e3c9103a01a316f9788f3e625c188a16e59c66c933452"
    },
    {
      "file": "src/worldmass/nativeAreaSceneTransitionCoordinator.ts",
      "name": "NativeAreaSceneTransitionCoordinator.#pruneGrounds",
      "sha256": "aa23ccbd64e7803fda329b80e16b66b3e4a998c73f7048e90a17f3318f698fa9"
    },
    {
      "file": "src/worldmass/nativeAreaSceneTransitionCoordinator.ts",
      "name": "NativeAreaSceneTransitionCoordinator.#groundAttendance",
      "sha256": "0c81b83b4b79593b3262c062452d4f0715f799c47db4b4686ab072a504626c21"
    },
    {
      "file": "src/worldmass/nativeAreaSceneTransitionCoordinator.ts",
      "name": "NativeAreaSceneTransitionCoordinator.shouldCaptureGround",
      "sha256": "7b1b7915b718b889478968d5024fc4b933980cea2fc4571487b3c336c2a2dfe8"
    },
    {
      "file": "src/worldmass/nativeAreaSceneTransitionCoordinator.ts",
      "name": "NativeAreaSceneTransitionCoordinator.groundRefreshForSave",
      "sha256": "d14ac0c55e0645f57282200993924d8587ca99299db7102f5e3ece29d988e704"
    },
    {
      "file": "src/worldmass/nativeAreaSceneTransitionCoordinator.ts",
      "name": "NativeAreaSceneTransitionCoordinator.isRetiredGround",
      "sha256": "2fc900a4f5bdee71506b5e8313995da54dfde8ded5ed85079bc8d791a121fe77"
    },
    {
      "file": "src/worldmass/nativeAreaSceneTransitionCoordinator.ts",
      "name": "NativeAreaSceneTransitionCoordinator.assertGroundMemoryRetirement",
      "sha256": "2482a71d997a5a3a17b1c06d1464532d5a3d800fc0a66f9c2977e3b87291f1d1"
    },
    {
      "file": "src/worldmass/nativeAreaSceneTransitionCoordinator.ts",
      "name": "NativeAreaSceneTransitionCoordinator.assertGroundRetirement",
      "sha256": "02435231f9077b02c24ba3eccb5ff6b42c62ce3614defd61bc06098dcde4e2cc"
    },
    {
      "file": "src/worldmass/nativeAreaSceneTransitionCoordinator.ts",
      "name": "NativeAreaSceneTransitionCoordinator.#finishGrounds",
      "sha256": "e09cea0e55f0c87e7ddd0adc01ade63f1af04268d26401622a0103f5c4a9d998"
    },
    {
      "file": "src/worldmass/nativeAreaSceneTransitionCoordinator.ts",
      "name": "NativeAreaSceneTransitionCoordinator.residentAreas",
      "sha256": "3a79d825dc65a4e7ec00f874a6a4aca93184366bce330a069a5acc8bd5cd2ffd"
    },
    {
      "file": "src/worldmass/nativeAreaSceneTransitionCoordinator.ts",
      "name": "NativeAreaSceneTransitionCoordinator.occupiedAreas",
      "sha256": "70d0efd41d99f290b0678f218ede11de94b260b280ace62179caba1f3a478ecc"
    },
    {
      "file": "src/worldmass/nativeAreaSceneTransitionCoordinator.ts",
      "name": "NativeAreaSceneTransitionCoordinator.atZone",
      "sha256": "aeaaf8fa489203a036cc0df7a49f18d9ddfe3fbf47670d8de0849e42d585b37e"
    },
    {
      "file": "src/worldmass/nativeAreaSceneTransitionCoordinator.ts",
      "name": "NativeAreaSceneTransitionCoordinator.presentWorlds",
      "sha256": "b6e757e18d094b563943befadbd4bacaac9e41112c9fdb4f577d14ee8fffde6b"
    },
    {
      "file": "src/worldmass/nativeAreaSceneTransitionCoordinator.ts",
      "name": "NativeAreaSceneTransitionCoordinator.#directory",
      "sha256": "dcecd84e1808122d7e9e155afd98a80a9f7e467c0139424c7861d593855cac57"
    },
    {
      "file": "src/worldmass/nativeAreaSceneTransitionCoordinator.ts",
      "name": "NativeAreaSceneTransitionCoordinator.occupiedAudience",
      "sha256": "06e835570498a019e972daf04c5bd2809089f1f4bbb83450a9d7192a0a1cf966"
    },
    {
      "file": "src/worldmass/nativeAreaSceneTransitionCoordinator.ts",
      "name": "NativeAreaSceneTransitionCoordinator.noticeOccupied",
      "sha256": "94a2effce08aaea4f99f14ba43f991f0bac451ec5696c36977eb84eca547ac3b"
    },
    {
      "file": "src/worldmass/nativeAreaSceneTransitionCoordinator.ts",
      "name": "NativeAreaSceneTransitionCoordinator.seatsFor",
      "sha256": "462da8fed87bbf1d3fd32e89e9b37b69cd4f10f43e41d3af3912ffeb273f3938"
    },
    {
      "file": "src/worldmass/nativeAreaSceneTransitionCoordinator.ts",
      "name": "NativeAreaSceneTransitionCoordinator.presentationActorFor",
      "sha256": "7bcf4350113e7bbbcbec3cb1d31649769ab05e96ae6e2cb88532be45c743a8a3"
    },
    {
      "file": "src/worldmass/nativeAreaSceneTransitionCoordinator.ts",
      "name": "NativeAreaSceneTransitionCoordinator.#presence",
      "sha256": "625e7d08bcb6e5f9c2ee41408948416e786dad133e435fda74196aa4919de682"
    },
    {
      "file": "src/worldmass/nativeAreaSceneTransitionCoordinator.ts",
      "name": "NativeAreaSceneTransitionCoordinator.nativeWorldReady",
      "sha256": "5cd82b3df4e371df9cb05de3afc1c0c41903642d515937041d1c5071f46a320c"
    },
    {
      "file": "src/worldmass/nativeAreaSceneTransitionCoordinator.ts",
      "name": "NativeAreaSceneTransitionCoordinator.simView",
      "sha256": "1ef5fdfd27cdfdc16b773181877289955a11d945c9300c4e8e32b32e2a47bf38"
    },
    {
      "file": "src/worldmass/nativeAreaSceneTransitionCoordinator.ts",
      "name": "NativeAreaSceneTransitionCoordinator.saveCharacter",
      "sha256": "d472a84e10712569eeb5b111cd8e0d9a14431516181f4e6fdaa806cc03b1337a"
    },
    {
      "file": "src/worldmass/nativeAreaSceneTransitionCoordinator.ts",
      "name": "NativeAreaSceneTransitionCoordinator.allowsTraversalContinuation",
      "sha256": "73823b2d5a12f53b0bfcb8a1d895c2225fb0405a3868415a76d82b92dc979a8f"
    },
    {
      "file": "src/worldmass/nativeAreaSceneTransitionCoordinator.ts",
      "name": "NativeAreaSceneTransitionCoordinator.allowsRoadContinuation",
      "sha256": "e462fde80df077830a842b7639701a8244308b1546aa33a416127a85a1252ac6"
    },
    {
      "file": "src/worldmass/nativeAreaSceneTransitionCoordinator.ts",
      "name": "NativeAreaSceneTransitionCoordinator.frame:get",
      "sha256": "6e2ab720b24504e2ee43d1d96be7a41e9f73bee60ea3e0bf35665ae8951315d5"
    },
    {
      "file": "src/worldmass/nativeAreaSceneTransitionCoordinator.ts",
      "name": "NativeAreaSceneTransitionCoordinator.areaFor",
      "sha256": "fba566dd23304595b1fdb75ca113bd94a0b0809a0e0077cd7cd60bb15328295e"
    },
    {
      "file": "src/worldmass/nativeAreaSceneTransitionCoordinator.ts",
      "name": "NativeAreaSceneTransitionCoordinator.roadsFor",
      "sha256": "9b8574855d1a7564b5594f793ee49c0e2597550142e10d2fe0a4ce302b1e26bc"
    },
    {
      "file": "src/worldmass/nativeAreaSceneTransitionCoordinator.ts",
      "name": "NativeAreaSceneTransitionCoordinator.departureFor",
      "sha256": "7d2d948c7ca37d063db1f53619c8247c389abde75bc12788ce4298196dd5e6bc"
    },
    {
      "file": "src/worldmass/nativeAreaSceneTransitionCoordinator.ts",
      "name": "NativeAreaSceneTransitionCoordinator.#combat",
      "sha256": "1f169c3efa44438dea7f99bd950319cd0b2b42dba0f57627b280513da023b4de"
    },
    {
      "file": "src/worldmass/nativeAreaSceneTransitionCoordinator.ts",
      "name": "NativeAreaSceneTransitionCoordinator.#ready",
      "sha256": "37c9a28ac6a919b3be8de39377c677cdf4da01d71728ffa397da09166ddca3c1"
    },
    {
      "file": "src/worldmass/nativeAreaSceneTransitionCoordinator.ts",
      "name": "NativeAreaSceneTransitionCoordinator.register",
      "sha256": "87e376c8eb77319d3cac2bf9f5eeb24a3c47362678187791daad0cd5e3d1826a"
    },
    {
      "file": "src/worldmass/nativeAreaSceneTransitionCoordinator.ts",
      "name": "NativeAreaSceneTransitionCoordinator.publishInitial",
      "sha256": "7f7b3f72123659628633b9d3308081d01759d95243a4bb045794c15449962488"
    },
    {
      "file": "src/worldmass/nativeAreaSceneTransitionCoordinator.ts",
      "name": "NativeAreaSceneTransitionCoordinator.#prepareProjection",
      "sha256": "e8580700232b39a6eda72f5480ae1aa40625c97bc8a5d53a1beb11273c04781b"
    },
    {
      "file": "src/worldmass/nativeAreaSceneTransitionCoordinator.ts",
      "name": "NativeAreaSceneTransitionCoordinator.#assertProjection",
      "sha256": "3114e1b687df02e75ad3b65a1cdc4a8673e40db8c443b29f484d9bcd38974935"
    },
    {
      "file": "src/worldmass/nativeAreaSceneTransitionCoordinator.ts",
      "name": "NativeAreaSceneTransitionCoordinator.runFrom",
      "sha256": "e032ff6787a53550b0cdaa41c3aaee7d263cad7562e5354d2ea42cf414b2cc31"
    },
    {
      "file": "src/worldmass/nativeAreaSceneTransitionCoordinator.ts",
      "name": "NativeAreaSceneTransitionCoordinator.assertHarborArrival",
      "sha256": "83c929f34e55e398ace05a3af0905a708dc4454b38c733e0ec2f82f5d0e4b5b6"
    },
    {
      "file": "src/worldmass/nativeAreaSceneTransitionCoordinator.ts",
      "name": "NativeAreaSceneTransitionCoordinator.assertHistoryArrival",
      "sha256": "4e08aa974f1bf04c860f9eb7ccb3c7ce4d1c6c217f3da9c7dbba3dcac86171bc"
    },
    {
      "file": "src/worldmass/nativeAreaSceneTransitionCoordinator.ts",
      "name": "NativeAreaSceneTransitionCoordinator.assertWarlordArrival",
      "sha256": "9b6cdf515b9731c97ca3d516fe594e51b435b009138d417f1f8f12896029d213"
    },
    {
      "file": "src/worldmass/nativeAreaSceneTransitionCoordinator.ts",
      "name": "NativeAreaSceneTransitionCoordinator.warlordOccupied",
      "sha256": "52cda98e5dbd94b0ebb1ac0678b7314fdc44550a67f16090d9f8bb86e8930df2"
    },
    {
      "file": "src/worldmass/nativeAreaSceneTransitionCoordinator.ts",
      "name": "NativeAreaSceneTransitionCoordinator.bountyArrivalFrom",
      "sha256": "48707927e1abe88efe955eaf46d1555e9bc4ea4be5c388891251fb94db2655f2"
    },
    {
      "file": "src/worldmass/nativeAreaSceneTransitionCoordinator.ts",
      "name": "NativeAreaSceneTransitionCoordinator.delayedArrivalBody",
      "sha256": "44c93c2bbb1916a10fc9993de61e1cffbd6454032b5e9e4306020d77007f6938"
    },
    {
      "file": "src/worldmass/nativeAreaSceneTransitionCoordinator.ts",
      "name": "NativeAreaSceneTransitionCoordinator.assertFurnishArrival",
      "sha256": "bb234d867af4690efc9673609a6c69ccf6bbe155bb49c7c38e7ab2ad4a55ca6d"
    },
    {
      "file": "src/worldmass/nativeAreaSceneTransitionCoordinator.ts",
      "name": "NativeAreaSceneTransitionCoordinator.assertTownArrival",
      "sha256": "1f50f27a332b98f8cdfa6c4b1ac92b94c4ded3e272a9bd310528634f33157c07"
    },
    {
      "file": "src/worldmass/nativeAreaSceneTransitionCoordinator.ts",
      "name": "NativeAreaSceneTransitionCoordinator.#selectDescentRecovery",
      "sha256": "f4543a634c3146fbeb8902183f54d58a529a5ed674baffca6db6826b1a7b9e94"
    },
    {
      "file": "src/worldmass/nativeAreaSceneTransitionCoordinator.ts",
      "name": "NativeAreaSceneTransitionCoordinator.#partySeats",
      "sha256": "4e4f6bac86c04e3431f639f3793d7fa4b1b8e08a1a2ae5e1852cbe1febe2cfb1"
    },
    {
      "file": "src/worldmass/nativeAreaSceneTransitionCoordinator.ts",
      "name": "NativeAreaSceneTransitionCoordinator.#loadPartyZone",
      "sha256": "40d11c064446bf98cb92cce2f210a531f57fbdfc6722679295ee5c9503aedbdf"
    },
    {
      "file": "src/worldmass/nativeAreaSceneTransitionCoordinator.ts",
      "name": "NativeAreaSceneTransitionCoordinator.restoreCharacterGraph",
      "sha256": "ce49e70debfc8ac1023722adf0bdc8f4734f96e596f9c1cf60ce103bb3c7ff8f"
    },
    {
      "file": "src/worldmass/nativeAreaSceneTransitionCoordinator.ts",
      "name": "NativeAreaSceneTransitionCoordinator.resumeCharacterArrival",
      "sha256": "a2351733a3cd5349cd7f8c4b90cc79b70e665d5e891c8b28d315cd0495cd59a4"
    },
    {
      "file": "src/worldmass/nativeAreaSceneTransitionCoordinator.ts",
      "name": "NativeAreaSceneTransitionCoordinator.assertProvisionalRestoreSource",
      "sha256": "ef7ad099d73f7acbe620d06d211da156faceba866336cbe82e2bdb4f6217cf80"
    },
    {
      "file": "src/worldmass/nativeAreaSceneTransitionCoordinator.ts",
      "name": "NativeAreaSceneTransitionCoordinator.#selectNemesisDeparture",
      "sha256": "b79c15030728b7b87cac1685b753c206e4521d22f44cf0f0ede829d4243a10e8"
    },
    {
      "file": "src/worldmass/nativeAreaSceneTransitionCoordinator.ts",
      "name": "NativeAreaSceneTransitionCoordinator.ownsRoadLink",
      "sha256": "3d1e4554af1f3e7e634c6ed9ab58d4a9e0812e3d54188a7cb4a034e4f8d1b74f"
    },
    {
      "file": "src/worldmass/nativeAreaSceneTransitionCoordinator.ts",
      "name": "NativeAreaSceneTransitionCoordinator.#enableHostedRoads",
      "sha256": "d312b2e3246a2664eb2c063b823718690b207f3315607e646245c5d01db9ec9b"
    },
    {
      "file": "src/worldmass/nativeAreaSceneTransitionCoordinator.ts",
      "name": "NativeAreaSceneTransitionCoordinator.#drainRoads",
      "sha256": "f0a61c9ad5061a7799e34c63d156d03bf620c01e7f0041fc429c567077fa6024"
    },
    {
      "file": "src/worldmass/nativeAreaSceneTransitionCoordinator.ts",
      "name": "NativeAreaSceneTransitionCoordinator.#executeRoad",
      "sha256": "5f3cbc31ef5cf3899630a8703ffa876d8a6d2427577d52d9e813fc9c888ec5a4"
    },
    {
      "file": "src/worldmass/nativeAreaSceneTransitionCoordinator.ts",
      "name": "NativeAreaSceneTransitionCoordinator.#roadCheck",
      "sha256": "9530ff09c4597b86fdd80b501208858b41ae97804ee376ef97cb5a28e4cdb977"
    },
    {
      "file": "src/worldmass/nativeAreaSceneTransitionCoordinator.ts",
      "name": "NativeAreaSceneTransitionCoordinator.#invokeRoad",
      "sha256": "7b6aa5dc03b0e367dda4c058e995978cab62177756bdb81d049b1f49d99324eb"
    },
    {
      "file": "src/worldmass/nativeAreaSceneTransitionCoordinator.ts",
      "name": "NativeAreaSceneTransitionCoordinator.#roadBeforeArrival",
      "sha256": "74b6e311691c44264177b7bddbb4791b52a912855c5a1eeea7e605cc162267d9"
    },
    {
      "file": "src/worldmass/nativeAreaSceneTransitionCoordinator.ts",
      "name": "NativeAreaSceneTransitionCoordinator.retireSeat",
      "sha256": "bb2b687bf4eeaee6ed718f3b4e2769fc1d8afd11fdab1fd7870e698fe75ce954"
    },
    {
      "file": "src/worldmass/nativeAreaSceneTransitionCoordinator.ts",
      "name": "NativeAreaSceneTransitionCoordinator.#replaceTraversal",
      "sha256": "18bf7cf4f2ba26ddf2fa50a79b0f392dcc191fb449956b8fbb73b7464552101b"
    },
    {
      "file": "src/worldmass/nativeAreaSceneTransitionCoordinator.ts",
      "name": "NativeAreaSceneTransitionCoordinator.#bindTraversal",
      "sha256": "a5b4f4c5cbd9f1041d8ef13a5546dbd8d0860510f2f8cf0a38168cdb0927272f"
    },
    {
      "file": "src/worldmass/nativeAreaSceneTransitionCoordinator.ts",
      "name": "NativeAreaSceneTransitionCoordinator.#runTraversalStep",
      "sha256": "e03b28e7d9fead21bf0abf4f516e46477f2be43b77dc02b2b7f041fff65b761d"
    },
    {
      "file": "src/worldmass/nativeAreaSceneTransitionCoordinator.ts",
      "name": "NativeAreaSceneTransitionCoordinator.#finishTraversal",
      "sha256": "34a9ca1f736de28e3f347346630e3c9f1e861eaf045473937ed8908e2e152f23"
    },
    {
      "file": "src/worldmass/nativeAreaSceneTransitionCoordinator.ts",
      "name": "NativeAreaSceneTransitionCoordinator.#invokeTraversal",
      "sha256": "4cff85769c1ba7580164931cbb5d664ee5bad685a4e9dd4cc21aed4b2a68af16"
    },
    {
      "file": "src/worldmass/nativeAreaSceneTransitionCoordinator.ts",
      "name": "NativeAreaSceneTransitionCoordinator.landPartyAt",
      "sha256": "6de930ebb8f2d13542e094f8d01c695b9eee951cfad5f190ae48de36101eec7e"
    }
  ],
  "changedMethods": [
    {
      "file": "server/muster.ts",
      "name": "spreadLanding"
    },
    {
      "file": "server/muster.ts",
      "name": "MusterDesk.constructor"
    },
    {
      "file": "server/muster.ts",
      "name": "MusterDesk.fire"
    },
    {
      "file": "server/muster.ts",
      "name": "MusterDesk.publish"
    },
    {
      "file": "src/worldmass/nativeAreaSceneCampaignFrame.ts",
      "name": "NativeAreaSceneCampaignFrame.#assertFrame"
    },
    {
      "file": "src/worldmass/nativeAreaSceneCampaignFrame.ts",
      "name": "NativeAreaSceneCampaignFrame.#gateRows"
    },
    {
      "file": "src/worldmass/nativeAreaSceneCampaignFrame.ts",
      "name": "NativeAreaSceneCampaignFrame.tick"
    },
    {
      "file": "src/worldmass/nativeAreaSceneTransitionCoordinator.ts",
      "name": "NativeAreaSceneTransitionCoordinator.loadZone"
    },
    {
      "file": "src/worldmass/nativeAreaSceneTransitionCoordinator.ts",
      "name": "NativeAreaSceneTransitionCoordinator.#installRoadLink"
    },
    {
      "file": "src/worldmass/nativeAreaSceneTransitionCoordinator.ts",
      "name": "NativeAreaSceneTransitionCoordinator.#ticketIdentity"
    },
    {
      "file": "src/worldmass/nativeAreaSceneTransitionCoordinator.ts",
      "name": "NativeAreaSceneTransitionCoordinator.#enqueueRoad"
    },
    {
      "file": "src/worldmass/nativeAreaSceneTransitionCoordinator.ts",
      "name": "NativeAreaSceneTransitionCoordinator.#roadDestination"
    }
  ],
  "untouched": [
    {
      "file": "balance/muReliquarySourceFixture.ts",
      "sha256": "2bb001ad2f1a4c2888904001cd38b0b36e14244f2940bb4d4b8e1db8a91a108b"
    },
    {
      "file": "balance/nativeAICompositionArchive.ts",
      "sha256": "9d04f472dd7e89ced1738e1f964fafad814366f3f2971649692209731157b14f"
    },
    {
      "file": "balance/nativeAICompositionFixture.ts",
      "sha256": "ff101f70e68d0ad911d0c21adbee136243b1a8f31a39155fb2ed735dec0d399f"
    },
    {
      "file": "balance/nativeAIExtractionFixture.ts",
      "sha256": "03a12b29610ffab38886ecdc8b3a22b32c66fe1548d06dbdb503534063aa853a"
    },
    {
      "file": "balance/nativeAITargetContinuityArchive.ts",
      "sha256": "4743046af09dc6112165f47f6b399eec9d1bab644cf5f174a2d2068fbde31e0a"
    },
    {
      "file": "balance/nativeAITargetContinuityFixture.ts",
      "sha256": "0a281f6d2aca9d7bda384dc2ddecf0531887a29b02cc1672c0bd5b2cdb416e46"
    },
    {
      "file": "balance/nativeActiveDescentArchive.ts",
      "sha256": "2cc00a0f0582cf2ff5273a2fcadcb4f6d77cfb677d9582112e1e5e5d78adfae8"
    },
    {
      "file": "balance/nativeAdmissionCompositionArchive.ts",
      "sha256": "4aa3ecff37b3f7d888299701b65647c0ca2eb4b4a4f46d0999c7c898b57d3b1d"
    },
    {
      "file": "balance/nativeAdmissionCompositionFixture.ts",
      "sha256": "2a080e042457ac828b7169ef4b3c4bd69bb20e72e6fa80b0c271ffb7304787ca"
    },
    {
      "file": "balance/nativeAreaMenuArchive.ts",
      "sha256": "0cbd9c2d9450dd3d9b653b391a718a8abf308b4d0defad541da08167d973b870"
    },
    {
      "file": "balance/nativeAreaMenuFixture.ts",
      "sha256": "455a0155a9ea702b51589eb552c3f4cf1c5dafebb90286b89e8855e8b900ebaf"
    },
    {
      "file": "balance/nativeAreaPublicationArchive.ts",
      "sha256": "2af6f41679ef425c1a56aa8b837be289d2006ae7057c927e7fe99fc0842efa48"
    },
    {
      "file": "balance/nativeAreaUIActionArchive.ts",
      "sha256": "1b22b430fb8a9e5569656e3334b23563c8f2dbacea2bf15948326cc213e073a8"
    },
    {
      "file": "balance/nativeAreaUIActionFixture.ts",
      "sha256": "999c948fe5ccd6093a3ad07497eab91564c84304f9960a08f2dd5955766c6935"
    },
    {
      "file": "balance/nativeAreaViewQueryArchive.ts",
      "sha256": "12eaec6fe7d4de0d49a483dec51765f8a43d23ebfddd43c9aa8b4e2b7d9a8a31"
    },
    {
      "file": "balance/nativeAreaViewQueryFixture.ts",
      "sha256": "c563c3e417ba09e66356c0031f4143d29382cb794df963db471f8a68b458f109"
    },
    {
      "file": "balance/nativeArrivalCompositionArchive.ts",
      "sha256": "ef4411ee9b54d9608d2e6c7870e97f7c10328cbdbf5a3d09654b5b0493b9ce40"
    },
    {
      "file": "balance/nativeArrivalCompositionFixture.ts",
      "sha256": "1c910a3711a12da0a2f62b7a0f8efe16d2d7f1d5f25aec27842667f7c53f8ad3"
    },
    {
      "file": "balance/nativeBirthLifetimeArchive.ts",
      "sha256": "321d3adac731c07ab921d65b243b507dbdb090f526fbf8ebfff9049337298a22"
    },
    {
      "file": "balance/nativeBirthLifetimeFixture.ts",
      "sha256": "8eded6a6fd04e8a2cc9c16824d31d97ad42f6ba93b883f11b114745afb450ad4"
    },
    {
      "file": "balance/nativeBirthLifetimeSourceArchive.ts",
      "sha256": "07c68824930c715eb9da12a6e060b39b01048456dbd33c52df7a3dcf4d45fb6c"
    },
    {
      "file": "balance/nativeBirthLifetimeSourceFixture.ts",
      "sha256": "273cf1074928b2ff4520948a6711019bb7d89057e0a6b17df164ad2629c58c63"
    },
    {
      "file": "balance/nativeBountyArrivalArchive.ts",
      "sha256": "37575f470131363aa00d387ab5f6b6707aed2dc740f441859d6b5bc6e48ffe5b"
    },
    {
      "file": "balance/nativeBountyArrivalFixture.ts",
      "sha256": "ecac93fa50fecb96be3951b6f5c48e6efeae920d87588a5f5dedf5c5332a3429"
    },
    {
      "file": "balance/nativeBrowserEntryCompositionArchive.ts",
      "sha256": "0c432b547b9aad768a2c950d7c9c9f080cca2e24b647a4755dd9d56c6f0e3918"
    },
    {
      "file": "balance/nativeBrowserEntryCompositionFixture.ts",
      "sha256": "1df8a818224af45af45af6b05eb3a08f35d411ced25f0cd22bcd3bf1127e1760"
    },
    {
      "file": "balance/nativeBrowserHostedCompositionArchive.ts",
      "sha256": "00627e3c5c66e35bec3be42d0afac343a8335ef75d5ebaea31f1e8b3c31582e6"
    },
    {
      "file": "balance/nativeBrowserHostedCompositionFixture.ts",
      "sha256": "5ccebaf96b6eb55a1c28e9f2aa3706ae4135e8056da9d91d52a59607c35cd191"
    },
    {
      "file": "balance/nativeCampaignCompositionArchive.ts",
      "sha256": "435834a0d1ef0bfcebb3bcb35d328ac5c488e1d2cfcd456305c24de598ba460a"
    },
    {
      "file": "balance/nativeCampaignCompositionFixture.ts",
      "sha256": "8e49862b5b5fbade7a315a6b542c2dfb6624185aa9f888f71bae78da83c5ba13"
    },
    {
      "file": "balance/nativeCarriedAdmissionFinalArchive.ts",
      "sha256": "48e5501c1cf3fb9c691c5c2b15ea946c95e7e42b2d2d887be4941c37ff10ad32"
    },
    {
      "file": "balance/nativeCarriedAdmissionFinalFixture.ts",
      "sha256": "3980c441c4e72245eca45d9df8d9e2a836a7207bcda0e9c1d4771c746942b919"
    },
    {
      "file": "balance/nativeCarriedControlArchive.ts",
      "sha256": "a734e47ca7548e045b428221b03bce6c69ee167b68f58b67fd931597bcd36f66"
    },
    {
      "file": "balance/nativeCarriedControlFixture.ts",
      "sha256": "ef0b77f9f2146c03cbac30850cfc907fda2f5b753f1192548e0a1806fbbd0c39"
    },
    {
      "file": "balance/nativeClientConclusionCompositionArchive.ts",
      "sha256": "1c70e2bc5319ab015c52af1a950129a4a219097cc527fb5fa5de85221db07b41"
    },
    {
      "file": "balance/nativeClientConclusionCompositionFixture.ts",
      "sha256": "06b0f78ba1930101c8ae616e7307355d7cdc65b6e699837d5dc3ab74d19dc3af"
    },
    {
      "file": "balance/nativeClientContinueArchive.ts",
      "sha256": "0e4091d7c095fea24ec6e36d57f42118f856915721fdbbf1816e60f1296f4fb0"
    },
    {
      "file": "balance/nativeClientContinueFixture.ts",
      "sha256": "20d253e8d2c2065e7bd327cf04e98669ef020ce372b6fa35d9e4dd84ec774988"
    },
    {
      "file": "balance/nativeClientContinuityCompositionArchive.ts",
      "sha256": "acc61c797fa225b7760a6d2e1792d036db8eaf4fc760f4a9857cd3a1fdeac945"
    },
    {
      "file": "balance/nativeClientContinuityCompositionFixture.ts",
      "sha256": "6b40bb9c2c5459d64581a25241c1b8b82ad999675254ba8afaae7fe407353754"
    },
    {
      "file": "balance/nativeClientMenuCompositionArchive.ts",
      "sha256": "efd75a960bcc25da8cad27d8d5f0cb19132f60e0f07ac7b14b856b73f72de496"
    },
    {
      "file": "balance/nativeClientMenuCompositionFixture.ts",
      "sha256": "1eace6139ae7a693cbbe2be33ad34cfbcf6516fea2f59f4c7894a2b01ae5a4d8"
    },
    {
      "file": "balance/nativeClientPublicationCompositionArchive.ts",
      "sha256": "e5a371c6b597b3d287e40633c221d921778088537156d27f9eb6916fbb96b34f"
    },
    {
      "file": "balance/nativeClientPublicationCompositionFixture.ts",
      "sha256": "1323865546d48d10581b25293c303963b9e27dd4a32d2cfe408535a13d037b69"
    },
    {
      "file": "balance/nativeClientRuntimeArchive.ts",
      "sha256": "f2cc42ac508a641419bd762bca04c1b5376432570cf2fb8ece8f1b2b9ad6f30a"
    },
    {
      "file": "balance/nativeClientRuntimeFixture.ts",
      "sha256": "706a0a53f7ad60756c416b6b84f8c164b1fde6ed0deef3ad903a0ef5af497990"
    },
    {
      "file": "balance/nativeClientStartActionsCompositionArchive.ts",
      "sha256": "c396defb8e4c12c908481365c387877eadf21c325015949b53aebf20511c40e1"
    },
    {
      "file": "balance/nativeClientStartActionsCompositionFixture.ts",
      "sha256": "4ebc18e4f746411184fb7194ff8f4f169661bef32f224a77e846d0b9cfec8632"
    },
    {
      "file": "balance/nativeClientStartArchive.ts",
      "sha256": "f6d4685b778c1f0bfa5123a9ce6cb8ccf7fb52cbec978c4035265f151945345f"
    },
    {
      "file": "balance/nativeClientStartFixture.ts",
      "sha256": "db494d0b5bf0433fda21e8486bcd920be4b904c049276ff4c6fe2d0c1a3c1715"
    },
    {
      "file": "balance/nativeClientStartMenuCompositionArchive.ts",
      "sha256": "082eec02642c97233e58f9559a80792e81d4580c5437b46582973f6a591be9a1"
    },
    {
      "file": "balance/nativeClientStartMenuCompositionFixture.ts",
      "sha256": "90da75966389f79bc3967947f710d95ed041700659c94db78568bfd37c63a4ba"
    },
    {
      "file": "balance/nativeCombatKernelHooksFixture.ts",
      "sha256": "f5eb4a7df03d9f57305cfc2fe4fd5196d47244e7b75f7a11b650b659724dad3d"
    },
    {
      "file": "balance/nativeCombatLeafVisualArchive.ts",
      "sha256": "bdb7b256c80fb2b3ae391cce76c70504506523c85b50f1e1bf3ca8092687f505"
    },
    {
      "file": "balance/nativeCombatLeafVisualFixture.ts",
      "sha256": "92e34dd56b0a1b58964d71eaef890908559962d8b24776e3ff55b856e19fdf5d"
    },
    {
      "file": "balance/nativeCombatMotionHooksFixture.ts",
      "sha256": "1f3c26f7113d1f561e6721df9ae11ab702b2810bf5c453d25849768dc43c096f"
    },
    {
      "file": "balance/nativeCombatPresentationArchive.ts",
      "sha256": "423d2ae8c65f92c34820c457fa666cd24dbec865127c6a163b24296ea1da315c"
    },
    {
      "file": "balance/nativeCombatPresentationFixture.ts",
      "sha256": "daf8c1c47af325858b7f02055c561b0f88661b4f295c0783ff4b5ace4b0aaa60"
    },
    {
      "file": "balance/nativeCombatRecordSelectionFixture.ts",
      "sha256": "1ccaaf05ccf4baad7c75246c65a2d82092cb11c447a98cda93d899da12b0c468"
    },
    {
      "file": "balance/nativeCombatRetainedFixture.ts",
      "sha256": "e2f85e1c409c48178bdb2e7dce908c45db243eb8f849419c1ea068e25da3c722"
    },
    {
      "file": "balance/nativeCompleteBirthArchive.ts",
      "sha256": "f30b214f0695f6121e0ec503f399af0a908975efb5520502c0baf47a3655f206"
    },
    {
      "file": "balance/nativeContinuityCompositionArchive.ts",
      "sha256": "fd76bb64e449e2b7401f62cb87effacf74966e8bdc585237c01996beea084405"
    },
    {
      "file": "balance/nativeContinuityCompositionFixture.ts",
      "sha256": "dff23be4a45d99edc1a6e6aecb2d6e0f40e076843c4fafe8301196570cae800f"
    },
    {
      "file": "balance/nativeCouchJoinBrowserFixture.ts",
      "sha256": "cec56eedb821cdff53e441f9f3f96bab584baa380372f35d63fa6ac0806f56e8"
    },
    {
      "file": "balance/nativeCouchJoinLifetimeArchive.ts",
      "sha256": "322372701694276912e31418a83547b0903aa67c00f65aa0c7b3f22095ae619e"
    },
    {
      "file": "balance/nativeCouchJoinLifetimeFixture.ts",
      "sha256": "82eabba7a5802405c96b219acbf118ee1c7f66a6a7ddfc8626676182d876bf26"
    },
    {
      "file": "balance/nativeDelayedArrivalFixture.ts",
      "sha256": "8cc1aad8f75be9455dfdef374aecf987e665603f09ac2253f0224c71ddacb72f"
    },
    {
      "file": "balance/nativeDelayedArrivalSourceArchive.ts",
      "sha256": "0e3542f31ff53651d5508f626e0367ba966e05d77791364170ae551238f3289d"
    },
    {
      "file": "balance/nativeDelayedArrivalSourceFixture.ts",
      "sha256": "4df5d62ed7746a996fbc8df2df6a308443dfaed92cea1b2662fcc7248dc764ae"
    },
    {
      "file": "balance/nativeDimensionCatalogArchive.ts",
      "sha256": "8d1c7d5bd6139cc1f5cb9bbd48560401e0ab88a742569cf3e09f17865679d107"
    },
    {
      "file": "balance/nativeDimensionCatalogFixture.ts",
      "sha256": "ad6e14269b4731133e1fb3618ec1e47943d144363092d66052e4c976825ee17f"
    },
    {
      "file": "balance/nativeDirectorBirthSourceArchive.ts",
      "sha256": "0038617d587101a650b2dadd757a1befd4263fa5e3635523a318f215afa8e112"
    },
    {
      "file": "balance/nativeDirectorRetirementFixture.ts",
      "sha256": "66d1c82480ea15af19e6946567032ea3b3b5ab6979422c874b5a262654f63601"
    },
    {
      "file": "balance/nativeEncounterArrivalSourceArchive.ts",
      "sha256": "6e8047eaa9ca5b269a1ba67822d18d885fcc7196d8e849c130decc09b554b3ed"
    },
    {
      "file": "balance/nativeEncounterArrivalSourceFixture.ts",
      "sha256": "800371bc5f1c3f21723eafc8d7a70e2d8b121e38f4e35ae09d9289eddc71eff2"
    },
    {
      "file": "balance/nativeEncounterInsertionSourceArchive.ts",
      "sha256": "9b35ac0c14cdac1a751c87a0d7b0a936e02d3352bcdf24585776d0f128c503e6"
    },
    {
      "file": "balance/nativeEncounterInsertionSourceFixture.ts",
      "sha256": "11e4d8b92d30c42515b62109c704d565e6856a26115a98223a74883ee6504bbb"
    },
    {
      "file": "balance/nativeExactAnchorArchive.ts",
      "sha256": "b284b8a270d8db0c69cff2104e4e503ff791c99a2c8963e2525629bfeb78b49d"
    },
    {
      "file": "balance/nativeFrameAttendanceFixture.ts",
      "sha256": "1fd13bc485cebf8ee4a57982b7e5b6b5bd319cce983f4031f33c1494694207b0"
    },
    {
      "file": "balance/nativeFrameContactSourceArchive.ts",
      "sha256": "c75a7696e3a5e0097caeb6ce19158840f113b2ca0882d3c2a1c803e66c0edceb"
    },
    {
      "file": "balance/nativeFrameContactSourceFixture.ts",
      "sha256": "c71dceeaa841ed6116b5ff0342bbe7fa1942c379fbb770f24121462c6d2cb511"
    },
    {
      "file": "balance/nativeFrameHooksFixture.ts",
      "sha256": "5de5c0547fc7978d1a8c6bd4a0e0fefb602e86598cbafcc9413d7d8adf27b9a4"
    },
    {
      "file": "balance/nativeFramePhysicalSeatsArchive.ts",
      "sha256": "2fe68045e1da5b1651b28d00d3819afc1b753506f15b798769436fc6760f24db"
    },
    {
      "file": "balance/nativeFramePhysicalSeatsFixture.ts",
      "sha256": "53f11c05c40e2751603999f839ca21549280abfa58bc96f666e27b2482d1c49c"
    },
    {
      "file": "balance/nativeFreshAssemblyFixture.ts",
      "sha256": "eed33a6f51655b39fd9685164a9850c60c56307cdd20bca192686e91fd7000ed"
    },
    {
      "file": "balance/nativeGraphArchive.ts",
      "sha256": "3d4391ed68d981594de329fe47620929953308584da7bb6801fdf5c72e6ed84e"
    },
    {
      "file": "balance/nativeGroundCurrentSourceArchive.ts",
      "sha256": "0dab06bf2a2e8030ad4687fe8e28ce6bb822df036af049cfc0e165645fbbbba5"
    },
    {
      "file": "balance/nativeGroundCurrentSourceFixture.ts",
      "sha256": "907caf958d33563bbae144d06f0ec907daa03b9b25154a650895892021724ea2"
    },
    {
      "file": "balance/nativeGroundFollowUpsOwnerArchive.ts",
      "sha256": "f68e036be0fa1dd1adeed16e901d8cf13b210d4ce15d36611f361bf0b8d3d51b"
    },
    {
      "file": "balance/nativeHarborArrivalArchive.ts",
      "sha256": "187b2fcd938e020a007e625b7067a79417b147cc71c4c9c1c894bb5d25b49842"
    },
    {
      "file": "balance/nativeHarborArrivalFixture.ts",
      "sha256": "21aa5f36627400813088488e5e162894b71458a2943c36eecc83e928bef96a43"
    },
    {
      "file": "balance/nativeHarborServicesArchive.ts",
      "sha256": "4cea3e4ab48004810401c6383ecf7fe0aba47d5bcd2a40f68084528147ead2a8"
    },
    {
      "file": "balance/nativeHarborServicesFixture.ts",
      "sha256": "e72ad2b5b297d155ad26ee5e76f66cbb07f2c9253bfab95ed25dbd0047a1119a"
    },
    {
      "file": "balance/nativeHistoricalCleaveArchive.ts",
      "sha256": "baecb1b47520fae584f6e7f1f23e8a8cb155040aec49c7c75a335642f55b7ecd"
    },
    {
      "file": "balance/nativeHistoricalConcealmentArchive.ts",
      "sha256": "1749618f0aab8fb81bdc6fa982bf4a5176f945fd853913fd7052cc3f2c28f53c"
    },
    {
      "file": "balance/nativeHistoryArrivalArchive.ts",
      "sha256": "04b08574d23dd360dd6dfbc20fc3a9b7764f75e7a86c8c14780c657fe53ba450"
    },
    {
      "file": "balance/nativeHistoryArrivalFixture.ts",
      "sha256": "966865e993529a2a90785c5492b6f7dd69adc701da23de60fa5872bcfead3d95"
    },
    {
      "file": "balance/nativeHostedPublicationArchive.ts",
      "sha256": "8eaf39d21fd8a54a6d1f600c1fff912913e2ed3e14ca58a0591969aade473858"
    },
    {
      "file": "balance/nativeHostedPublicationFixture.ts",
      "sha256": "96eab56172dfd94fd4d0fa3c24fd2ee0440fd916cf1b5c7a2f4a3af53a027173"
    },
    {
      "file": "balance/nativeInstalledSourceFixture.ts",
      "sha256": "c14d72a9551d0934ba88cfca8ef8e7973f9e7634760373af92667b1aa78e6283"
    },
    {
      "file": "balance/nativeInstalledSourcesArchive.ts",
      "sha256": "5a7edcd9e8696e6a1387fdc120309e9be1cbbc50deb373584c1c14ced9629b16"
    },
    {
      "file": "balance/nativeJourneyCompositionArchive.ts",
      "sha256": "ad8a0fd9aa37cf34b9e29f73fe168735dc8cd88d0ab53bc21402b816c16c5e07"
    },
    {
      "file": "balance/nativeJourneyCompositionFixture.ts",
      "sha256": "2bbdd855b9b3e8c711579a53cf6e250c17c3ec78497616279d4c1adefc9f5266"
    },
    {
      "file": "balance/nativeLateEncounterFixture.ts",
      "sha256": "fdf5e1c32a779f22635fe8995a2dc449ee8569d824d0101cd0287688c881de68"
    },
    {
      "file": "balance/nativeLiveSiteArchive.ts",
      "sha256": "fdf1af8f0add679d6787112999272e4126fe7afd9ee9432b2b89c30a4c5b57b8"
    },
    {
      "file": "balance/nativeLiveSiteFixture.ts",
      "sha256": "f15b3107f6cc8724dec7cfcb9eea2a36ea38c9dd6865612abb9cfe71a31cb064"
    },
    {
      "file": "balance/nativeLocalInputArchive.ts",
      "sha256": "b4def88aa507c45fa70882fbd4d08cce9e8f8bd4b6a491e617427d2dd04f355a"
    },
    {
      "file": "balance/nativeLocalInputFinalArchive.ts",
      "sha256": "4cc21d1012b1b0fc6dc8a3aa99bc635602048d0399fb1c115e571cc1707cee4f"
    },
    {
      "file": "balance/nativeLocalInputFinalFixture.ts",
      "sha256": "7417eb3e2274f9bf41328cc32ebdbe43277dacf5b1c95b29fcaff17eeef2d87e"
    },
    {
      "file": "balance/nativeLocalInputFixture.ts",
      "sha256": "ffe62e38b44fc4ca56d91c502c9a6d4dd0137e5eb7714aee55dba854537cc22b"
    },
    {
      "file": "balance/nativeMainCastSourceArchive.ts",
      "sha256": "fa34fce7eed513ec0394bcf5dca88fa68fe2df1ddaa6baa259e97a5984e118fe"
    },
    {
      "file": "balance/nativeMainCastSourceFixture.ts",
      "sha256": "89aedcc3ab319d6cd58b6b500f538715615646454d76e34390b57a55a825f0e9"
    },
    {
      "file": "balance/nativeMainContentArchive.ts",
      "sha256": "884c762fa9a0c4b54c0dd23185053763bab9d09aeed762bef55de0607f386604"
    },
    {
      "file": "balance/nativeMainContentFixture.ts",
      "sha256": "cbf2dc68e5e0645b8a6596743b1ddbc88e52355169334128d5f4537c17af9614"
    },
    {
      "file": "balance/nativeMainProofHistoricalFixture.ts",
      "sha256": "c5012d2c40e48e4dbd78cde58f1870f84d45b2f903ac2eee057de6cd0b6cc7ee"
    },
    {
      "file": "balance/nativeMainProofSourceArchive.ts",
      "sha256": "e946f50eaca9e98baea655f6b224bcbc4cb24dd1603a8370b296866c906bf441"
    },
    {
      "file": "balance/nativeMainProofSourceFixture.ts",
      "sha256": "158258ba1ca4f213e906979fc4757957fc0918af2cad42ef1c6fab796fb8877a"
    },
    {
      "file": "balance/nativeMainVisualSourceArchive.ts",
      "sha256": "336b4c66cbcbab84ef987cb559176fc62766da79943b32afe7a4c0c999e5e49d"
    },
    {
      "file": "balance/nativeMainVisualSourceFixture.ts",
      "sha256": "36b885c89f60e7507cfe16c5c542874057eef17a0f2dede19bcb18585c2756bd"
    },
    {
      "file": "balance/nativeNemesisDepartureArchive.ts",
      "sha256": "4a5608bb4d572ec0bb08950c1408850465c86f9ba189c7d4147bc64c41d68e9c"
    },
    {
      "file": "balance/nativeNemesisDepartureFixture.ts",
      "sha256": "68135190db0e032313bc9678fe4c1f9ab9744157ab4f78123d45a42801a8a405"
    },
    {
      "file": "balance/nativeOdysseyGroundAdmissionArchive.ts",
      "sha256": "9095fec65c4a2d8d90f9f2d3e8f59dfe265423bcf79c3d1fb79bd738dec82a92"
    },
    {
      "file": "balance/nativeOdysseyGroundAdmissionFixture.ts",
      "sha256": "49af8629bae83ce0d12fe25733de58fdce05481e1c1238d555006829adfb7592"
    },
    {
      "file": "balance/nativeOdysseyGroundArchive.ts",
      "sha256": "67ea0e0685bc04f90d1b978f5cb2b35a2b000dbd208772684e0db801d6eb1223"
    },
    {
      "file": "balance/nativeOdysseyHistoricalRescueArchive.ts",
      "sha256": "525e6dc6efa6c44ce16c7aa3c2c69a975fa4ae065cb61192bd276fd8296a57b4"
    },
    {
      "file": "balance/nativeOdysseyPressureArchive.ts",
      "sha256": "e106ad853f6a1a7328257860ad7caf363c24c8638c041ec894002897143ddfc1"
    },
    {
      "file": "balance/nativePartyArchive.ts",
      "sha256": "fd369d0b5060b2dfbd72e9e0c240c64d44915e09a6864976ccfbb456cb52b582"
    },
    {
      "file": "balance/nativePartyDeathArchive.ts",
      "sha256": "0c46f7d7e1add36add8a5c2303874b651bf4eeacd4e0f1ee754c52a4e89c981d"
    },
    {
      "file": "balance/nativePartyDeathFixture.ts",
      "sha256": "3970fa58f5676f3d1494b1aeffb463c7dabcffef9185162a55f45ba35fe09370"
    },
    {
      "file": "balance/nativePartyFixture.ts",
      "sha256": "0bfb7057f14bb7d1168039ef1360d82c08762340f22f26825d4cbbecfb734253"
    },
    {
      "file": "balance/nativePartySourceFixture.ts",
      "sha256": "ad54967fe242d285e52372d7d458e9b966a74256fa996394f9e25583c8ced554"
    },
    {
      "file": "balance/nativeRealmContextArchive.ts",
      "sha256": "49c0c7a42e044f4cc03fe1dbfe695147675bbabb3c49ebe3d67a4a8f32621da6"
    },
    {
      "file": "balance/nativeRealmContextFixture.ts",
      "sha256": "9a712ccb030345b8e477b3b1c819dda56ceec6a387f59a542032d6bfa697ffcd"
    },
    {
      "file": "balance/nativeRealmEntryFixture.ts",
      "sha256": "28c549e413749abb4c3831baa43c69983d2a6a4690fbe55fcbd90a67fcb684c5"
    },
    {
      "file": "balance/nativeRunConclusionArchive.ts",
      "sha256": "bbf69496104381ec9ffddc595831dc0686c3f0eb2b777d1b9097f93f8f6f920d"
    },
    {
      "file": "balance/nativeRunConclusionFixture.ts",
      "sha256": "e185488ad95469481162a8b68eec1ee7c8c47acc973abd072251ebb30651b41f"
    },
    {
      "file": "balance/nativeRuntimeBirthLifetimeArchive.ts",
      "sha256": "029c67b6bde5b515ec7a0e9557c6e5c44ec6eee6a8d429f7ed5d9304104c05e0"
    },
    {
      "file": "balance/nativeRuntimeBirthLifetimeFixture.ts",
      "sha256": "2df0ec04f7f1de8f8f32fe241366bab37c2475c1985dc6ed2300214c86668e4f"
    },
    {
      "file": "balance/nativeRuntimeFixture.ts",
      "sha256": "8f1284eda1dac162579d6129ae875276bd74d072297065e34d9ed399f16c105d"
    },
    {
      "file": "balance/nativeSaveWriteOrderArchive.ts",
      "sha256": "5899d18582e5a49d0b0f715a786a1d2c5801494998d25650b5a80d0d51d52b14"
    },
    {
      "file": "balance/nativeSaveWriteOrderFixture.ts",
      "sha256": "d4b6cd6cab3673668335d7548ec4c4879f79dcc3f4d3696ead4215a7e1e965de"
    },
    {
      "file": "balance/nativeSceneAIArchive.ts",
      "sha256": "f4dd09eac0657d3ddc4ae5a36d90ebea962e88a3449d6746cb2dae18840bac7a"
    },
    {
      "file": "balance/nativeSceneBirthFixture.ts",
      "sha256": "b4fe4933a6c1560ae4197d85806af9913059a38e7c5586fc246debef99a9ceb4"
    },
    {
      "file": "balance/nativeSceneCampaignFrameArchive.ts",
      "sha256": "543717c09b80875cb8f4c442120822f7a988630c508af0ac3f1531103a4970ad"
    },
    {
      "file": "balance/nativeSceneCampaignFrameAttendanceArchive.ts",
      "sha256": "4a2bdaaa534acaed565d04de385a9e116fe82bd6f48437b11e1b8680b5e83fd1"
    },
    {
      "file": "balance/nativeSceneCampaignFrameClosureArchive.ts",
      "sha256": "71cdc0f7a8e7d2aa674192274cbb2a41ff3125a4ef777e644ae6d03c92fb02eb"
    },
    {
      "file": "balance/nativeSceneCampaignTransitionsArchive.ts",
      "sha256": "d31a54e6c7177bf34df06c24aa1d184e018040f316680ece489212cae82a89da"
    },
    {
      "file": "balance/nativeSceneCastingPreparationArchive.ts",
      "sha256": "775a8850f3e03bb1b2a04fc3980f849c8073fb5c0866ac1565ff7aaeb8325b11"
    },
    {
      "file": "balance/nativeSceneCastingPreparationIntegrationArchive.ts",
      "sha256": "fe13fe988faedcac419c360438f845c521e7657c19651cecdc03fe993aa6d41a"
    },
    {
      "file": "balance/nativeSceneCastingPreparationIntegrationFixture.ts",
      "sha256": "f6e3a77adda20db47f347986273da7d01454060fe43dcadcfb2992c26ed5dd9b"
    },
    {
      "file": "balance/nativeSceneCombatCampaignArenaArchive.ts",
      "sha256": "192c5e134436bf3f628a60e7b5ed3dceb1e749e4d124c22b0a8c7c94c1a58160"
    },
    {
      "file": "balance/nativeSceneCombatHooksArchive.ts",
      "sha256": "e31a353e03e6e2ff16a18bbeb1b10b635d79f1661b48273cbb921a30bfcdc52e"
    },
    {
      "file": "balance/nativeSceneCombatKernelArchive.ts",
      "sha256": "bada0545f79d050bdb7e44bc5494348900acd334132550bb10517dd42d66e8af"
    },
    {
      "file": "balance/nativeSceneCombatMotionArchive.ts",
      "sha256": "e6ae0fa37ac1486d27efbcf9cdc272d6e1d2741709edfa6c9675c67a5ad1c69a"
    },
    {
      "file": "balance/nativeSceneCombatMotionHooksArchive.ts",
      "sha256": "dcd7676dfb0c3e9c89bf2ecb3dee5f61254637863327ea1df2a81cf2302ccc50"
    },
    {
      "file": "balance/nativeSceneCombatRecordSelectionArchive.ts",
      "sha256": "7437942fcc35bd859e0971c5934e4ad2663f341a729c0f9d166a12d395cc1a86"
    },
    {
      "file": "balance/nativeSceneCombatStateArchive.ts",
      "sha256": "ee2bc2ac3e89fd71d0eeed3d71ea5d8f83b4eb031c28d4133b2b7c61501c31df"
    },
    {
      "file": "balance/nativeSceneCombatStateIntegrationArchive.ts",
      "sha256": "7a8d0cb4acefe258a20e6b7822c932575ca6f21dc93913275e5d286b95871b22"
    },
    {
      "file": "balance/nativeSceneCombatStateIntegrationFixture.ts",
      "sha256": "bd8d58c949a4ab43ff6edc78eb5ab0784fab07fee467ccfc6b81c689bf2dd75c"
    },
    {
      "file": "balance/nativeSceneDefensePreparationArchive.ts",
      "sha256": "002e8c43fc805b7d3118f6f4ef1f55842a44b43590a939c5085f19981355837f"
    },
    {
      "file": "balance/nativeSceneDefensePreparationIntegrationArchive.ts",
      "sha256": "a62d978ae87d9474300403b5ee3aeb0db71877a04431868ec8d295f90aa91e02"
    },
    {
      "file": "balance/nativeSceneDefensePreparationIntegrationFixture.ts",
      "sha256": "604bdf5fb0f534fbceadc4ee1234e59d83c82b5434468b40f47cf7a7d1ce370e"
    },
    {
      "file": "balance/nativeSceneDisplacementArchive.ts",
      "sha256": "2891a29ea0ce99886e7ef9c36fc09a161ae597a10c0ba9a0052eb7ef0eb7f01a"
    },
    {
      "file": "balance/nativeSceneDisplacementIntegrationArchive.ts",
      "sha256": "b6c8afe0407a70b152fb1e7b37cbe016aa28b73f0cafa5bc1fd09c9951f3f8c2"
    },
    {
      "file": "balance/nativeSceneDisplacementIntegrationFixture.ts",
      "sha256": "694ef5393a05e842fb32e7ba10082c285670027cb05bb965ffb2321ed969879a"
    },
    {
      "file": "balance/nativeSceneFrameArchive.ts",
      "sha256": "01134266002591568b9eabbbba6cb7dbe78602cf6481399331306e2b15dc2bba"
    },
    {
      "file": "balance/nativeSceneFrameAttendanceArchive.ts",
      "sha256": "6d3888269abd37eaf98165b0cc0248de83290971e1d5ea5f30c93378c4dcae71"
    },
    {
      "file": "balance/nativeSceneFrameCallbacksArchive.ts",
      "sha256": "19419cf13a54dca4e5e4420821645c957d45d0ab33a765e053cb35b4268844f0"
    },
    {
      "file": "balance/nativeSceneFrameClosureArchive.ts",
      "sha256": "d690f559cbfaf25045c37fae7058b22a86bdc955e18e39478f2c334a27f47c58"
    },
    {
      "file": "balance/nativeSceneFrameHooksArchive.ts",
      "sha256": "a874f9baafd85fa93e6f32272db2d3e18bfb16384df595d7f4d9b8eebd75e4b5"
    },
    {
      "file": "balance/nativeSceneFrameInterfacesArchive.ts",
      "sha256": "27cf07963bb4ea796de4217b8492a62cc07cdcb6fd9ed3a9955f4ae6c255dc77"
    },
    {
      "file": "balance/nativeSceneGroundFollowUpsArchive.ts",
      "sha256": "ac1e1765be90f0c04dc3a63f953f6b1dac664126f288ddf2e63b85835949e31c"
    },
    {
      "file": "balance/nativeSceneGroundFollowUpsIntegrationArchive.ts",
      "sha256": "f25d81b6680f7bc27391f5504d2bcd2cfa0d43d60fa6f35d0240faa5fec4b2d8"
    },
    {
      "file": "balance/nativeSceneGroundFollowUpsIntegrationFixture.ts",
      "sha256": "1cfa5b810ad1ef0fc9daafe13cfd76f3b46a4cc5c4fa127a20c3d3e2a8a88b9d"
    },
    {
      "file": "balance/nativeSceneInputArchive.ts",
      "sha256": "bef0e227ade30b6e4f64f6a10d22ce35ee56d2ed8cf5a4b34dc2270666b7e3b1"
    },
    {
      "file": "balance/nativeSceneInputFixture.ts",
      "sha256": "c5e4143bee56232c64efe900b3e831bcc7f529d757803fb54867499b4e4bf499"
    },
    {
      "file": "balance/nativeSceneKillAftermathArchive.ts",
      "sha256": "1ee10922ff568ef7f8537e9628298a4b69c3572d8534f209ce1ad7907fe80cf8"
    },
    {
      "file": "balance/nativeSceneKillAftermathIntegrationArchive.ts",
      "sha256": "b94e4d71694bee1bb2cd54c3a63c78c2d63dfab37f6d8a80c5cc5f7a35a8c7c7"
    },
    {
      "file": "balance/nativeSceneKillAftermathIntegrationFixture.ts",
      "sha256": "377aedb7fa946b495ef99b4600c53d9e16e797e36428b49d7aaf06e7aadcc042"
    },
    {
      "file": "balance/nativeSceneLootArchive.ts",
      "sha256": "c0aabffe690bd6c005f120b0305ad0544d09a113d94aaa0ac480ac5fa40dda20"
    },
    {
      "file": "balance/nativeSceneLootFixture.ts",
      "sha256": "36d7d93b58605c76a50feb30cdab4851e39e0853cb7e74cf434dd78fa863b873"
    },
    {
      "file": "balance/nativeSceneMemoryArchive.ts",
      "sha256": "184ccb97a58023fcf20eda1d47a40ae6a4e712baffa75f840f6609aa1c11ab5e"
    },
    {
      "file": "balance/nativeSceneMemoryFixture.ts",
      "sha256": "5b07106d14e937ff84fc1b1c8cce1b715721eb13f0fe2e2b4e946b323666b6fd"
    },
    {
      "file": "balance/nativeSceneObjectiveCompletionArchive.ts",
      "sha256": "b04f297e8543a496cb9df061640468d6659eb3d231db1695b250010128373cbe"
    },
    {
      "file": "balance/nativeSceneObjectiveCompletionFixture.ts",
      "sha256": "d41ed9ebf12284704ed619ed6308b28e772d947db4b79d3b00e6016bc50e0d59"
    },
    {
      "file": "balance/nativeSceneObjectiveWatchingArchive.ts",
      "sha256": "4cb5018b6f09bdd280a4df5e6087f18a31f8a2aa738ff9eda67104ccc3ea232d"
    },
    {
      "file": "balance/nativeSceneObjectiveWatchingFixture.ts",
      "sha256": "6a378cbea1175e26c56a9af2f630b556301889c8b9b7f04d0e472e554feebd97"
    },
    {
      "file": "balance/nativeSceneProgressionArchive.ts",
      "sha256": "25f3b69b5556b78c055c51cebc17cb4170084560b3b6fc503179249ade2d6a7f"
    },
    {
      "file": "balance/nativeSceneProgressionFixture.ts",
      "sha256": "0fa6e78f3d0476bdc8af63c1801b093f7c45f8ba5096a3429feca3827c66f94d"
    },
    {
      "file": "balance/nativeSceneProjectileArchive.ts",
      "sha256": "4b693049351d73abd8b089ef37099e976373b301d4e294b5750c863648bf9b33"
    },
    {
      "file": "balance/nativeSceneProjectileFixture.ts",
      "sha256": "d75c49a754f714eb4a52eacf890726cf3d279b1bd3fcf7d058a605568c040e50"
    },
    {
      "file": "balance/nativeScenePuzzleArchive.ts",
      "sha256": "62f45e38950127f15c455e9ec99c3c54a30fd0e6f561ba4e97844f84a9ae0443"
    },
    {
      "file": "balance/nativeScenePuzzleFixture.ts",
      "sha256": "4d4786debe93e4727c83428196bfc87f34220afbb305404bbcf90a19736acf13"
    },
    {
      "file": "balance/nativeSceneQuestArchive.ts",
      "sha256": "b482df1bf726a1266f209ddf9ffc4147709c85885f3c0608c834a52ca4e0f12c"
    },
    {
      "file": "balance/nativeSceneQuestAuxArchive.ts",
      "sha256": "e869b8942bfb68eb0dfe3607f8c10290bdc926dab40515e83ce5534af20ab04a"
    },
    {
      "file": "balance/nativeSceneQuestFixture.ts",
      "sha256": "5b13f253727b1e4f90cafec22bfe4cd4467a7662bd572a699a322842bd78134b"
    },
    {
      "file": "balance/nativeSceneQuestInteractionArchive.ts",
      "sha256": "d747716c8691d549afe58302166dcc599bac1610d00e147933b3db194ba66062"
    },
    {
      "file": "balance/nativeSceneQuestInteractionFixture.ts",
      "sha256": "74d1d113ee629e8603e1f44810f176fc9c714c5ff1260c2761cce836cde75cf0"
    },
    {
      "file": "balance/nativeSceneRestorationArchive.ts",
      "sha256": "a859c1c5558b2844645adff7ffc6f5e4882eed47dfc3dd8f41fb903776eef1b0"
    },
    {
      "file": "balance/nativeSceneRestorationIntegrationArchive.ts",
      "sha256": "334adceb41233a58f307c9497ddf850dca5ecb34020b28d9c70c6ef53c03e36b"
    },
    {
      "file": "balance/nativeSceneRestorationIntegrationFixture.ts",
      "sha256": "78f359ad0999957ce41ac13ac5eb40527b970c07573374512a9966c0059a17f8"
    },
    {
      "file": "balance/nativeSceneSummonPreparationArchive.ts",
      "sha256": "0caa0ae9bb250bea4c8a39b52e8baa2f3a2b712ef6063a46c0aa0b2900981c3c"
    },
    {
      "file": "balance/nativeSceneSummonPreparationIntegrationArchive.ts",
      "sha256": "0646c173036fe44562900ae35f740bdbabaaf236f6364e2c5260c2f5ccdbddca"
    },
    {
      "file": "balance/nativeSceneSummonPreparationIntegrationFixture.ts",
      "sha256": "b47018d77d3562b4bda9bcf27ec3665adb45b14d3098e8aa3073f72d045b5acb"
    },
    {
      "file": "balance/nativeSceneTetherArchive.ts",
      "sha256": "4fcf252ff97bed0954e2b0557a0b6ec310932f9047da336c916fab6ca897b101"
    },
    {
      "file": "balance/nativeSceneTetherFixture.ts",
      "sha256": "4da719a345d6997d7b8cf4c21dabea9c4bf87b840777afde63731b9dab740618"
    },
    {
      "file": "balance/nativeShardEntryLifetimeArchive.ts",
      "sha256": "1dbbf8def17126a7c530c862be8102e6ae103933cc6d56d4e62924a4abf683aa"
    },
    {
      "file": "balance/nativeShardEntryLifetimeFixture.ts",
      "sha256": "f976b5c1b3abb072e3eb13f2f751edb0ea3cbc565452eb1b2dfe8abf4b534468"
    },
    {
      "file": "balance/nativeShardKeeperArchive.ts",
      "sha256": "a08f2ed82646d930961c296de3ce0c6dc5be0b02d209f311c5d7c6702d308518"
    },
    {
      "file": "balance/nativeShardKeeperCompositionArchive.ts",
      "sha256": "418acd51a60e2a991306fd874ef2a232490ba0c7b457f466bad6441bae10b4b8"
    },
    {
      "file": "balance/nativeShardKeeperCompositionFixture.ts",
      "sha256": "c86dd19bb2941d1f96e9702797e1268469b88eaffe60f4afd03367e75243b2de"
    },
    {
      "file": "balance/nativeShardKeeperFixture.ts",
      "sha256": "5279b94a3770db5cd575424079b23a9a0ab8853e466a439e81686d3ea6322524"
    },
    {
      "file": "balance/nativeShardSeatCompositionArchive.ts",
      "sha256": "1c1646e1eb1c61e459ea000ba8ac96ac386918703a7a1bfa2bc0e0c7350c0b01"
    },
    {
      "file": "balance/nativeShardSeatCompositionFixture.ts",
      "sha256": "8c83cefb429e26babb1a62d0ebfa8617f81f8d6e9e1da2b25c242a5a15cec4a2"
    },
    {
      "file": "balance/nativeShardSeatsArchive.ts",
      "sha256": "04fc1d4fab7a737b6f184fba895dbfe450db370288525c0d83de20539f8a589c"
    },
    {
      "file": "balance/nativeShardSeatsFixture.ts",
      "sha256": "936b7ff94fca3a6b93e09b13ca105a76296212d70c10bf7307736a52e2698946"
    },
    {
      "file": "balance/nativeSidezoneFurnishArchive.ts",
      "sha256": "66fbe4c4d9b0a998e7c2365237814be3376aad3c2576cb6b20dad769cfbdbc75"
    },
    {
      "file": "balance/nativeSidezoneFurnishFixture.ts",
      "sha256": "4226887cd49f16f6fa6bd0be7c3b7434be42da6ef6e141a299745c601997cf6f"
    },
    {
      "file": "balance/nativeSkyArchive.ts",
      "sha256": "f0425ccfee92ddb795a0e2a946210c4af96f09543d9908c0b2dfe7eb073e745b"
    },
    {
      "file": "balance/nativeSummonAsyncBoundaryArchive.ts",
      "sha256": "e5b2b531a4c2bc951669a6ccf22dfcc12c8037192f79217e4c2effd021b5435b"
    },
    {
      "file": "balance/nativeSurfaceArrivalFixture.ts",
      "sha256": "388bf9fac0859711ef2dad5f5f88607dbcb37fc86839425ac6dba44dc6412cc4"
    },
    {
      "file": "balance/nativeSurfaceArrivalOrderArchive.ts",
      "sha256": "f3392161a4cc2b6028e82872ead8773503f9f440db0e6247df777ea8ac73bb0f"
    },
    {
      "file": "balance/nativeSurfaceArrivalOrderFixture.ts",
      "sha256": "4c7de28f8b148b7b6a71c1abae3381202ea974b4f8cee6a0c811f351dbc171fd"
    },
    {
      "file": "balance/nativeSurfaceArrivalSourceArchive.ts",
      "sha256": "febe4557c8c691b214766b4654d6bfaf88c4db763f9ef9c4ccfdcf06c81875d0"
    },
    {
      "file": "balance/nativeSurfaceArrivalSourceFixture.ts",
      "sha256": "e0926bd3a8c9f3fc1da4ad41509236c7d441fd10dda2c48e934442837c683ae0"
    },
    {
      "file": "balance/nativeTitanAttendanceArchive.ts",
      "sha256": "1b7079001974f57cbe2f810da64ca5cffdaf3045e48490f5dbc74879f091d1d8"
    },
    {
      "file": "balance/nativeTitanAttendanceFixture.ts",
      "sha256": "f9d411071ec8074c5dae04b270a65de36bc6662a993beb26f5c6d5ae5da6deee"
    },
    {
      "file": "balance/nativeTownClientCompositionArchive.ts",
      "sha256": "14ec4f631c5dc08c78514472c721a34ed2b3b1be978b52f12939d696a86bea1b"
    },
    {
      "file": "balance/nativeTownClientCompositionFixture.ts",
      "sha256": "cbc550bd7dd74f2e4f81be36b6b23cbc1965925fc6240510d407e18e85808666"
    },
    {
      "file": "balance/nativeTownConclusionCompositionArchive.ts",
      "sha256": "b6727accddc426fb52bdcc62a85703a89a100233be2e144c3f9de98be311b3ff"
    },
    {
      "file": "balance/nativeTownConclusionCompositionFixture.ts",
      "sha256": "bb90a8255913a8f9498e9a9b0f00eb093e919633d6b30b8935ad04b48ca948c6"
    },
    {
      "file": "balance/nativeTownFreshFoldArchive.ts",
      "sha256": "3008a5027ed9a90a1d0d7457b498b2c111e116d129fc3dd4d4764e1cb176784f"
    },
    {
      "file": "balance/nativeTownFreshFoldFixture.ts",
      "sha256": "f354cdc949901d8c023fc64c5e62de58bde00c43bbc575ab68133dfeb26a5901"
    },
    {
      "file": "balance/nativeTownLocalInputCompositionArchive.ts",
      "sha256": "30263bc28d23f49f4dfc1487be37eec302e49b26409602310fbe2fb9b2271da8"
    },
    {
      "file": "balance/nativeTownLocalInputCompositionFixture.ts",
      "sha256": "1db1233a00fcd41db31561a318eb6d5deee163175fb19d3ba503603e8237b400"
    },
    {
      "file": "balance/nativeTownStationArchive.ts",
      "sha256": "1726a5c367697a8f7ca8600231976c49631242353e74faf8709b3dda9d0629d4"
    },
    {
      "file": "balance/nativeTownStationFixture.ts",
      "sha256": "0cefa3d12d6cd25a015df327d5fa67eb0ab2c4defdb0c0711935ba100bb34b64"
    },
    {
      "file": "balance/nativeVoyageFixture.ts",
      "sha256": "db7de3c7a18aa3eaec02e032f262ac3a585ee986c4554cd53a3b45f6854ff49d"
    },
    {
      "file": "balance/nativeVoyageTransitionArchive.ts",
      "sha256": "66a6df59a10d0008767dcf40f93f4a17d72483f0da65681da9bffa7f7fd688ac"
    },
    {
      "file": "balance/nativeVoyageTransitionFixture.ts",
      "sha256": "c0784a7b8b5165a573110a0a1d1907b1f67a2fd46278d21c78af853533e4b425"
    },
    {
      "file": "balance/nativeWarlordArrivalArchive.ts",
      "sha256": "035058712b0aad13a58f776fc855cd279c2cc2409f897f606860212f82c142b8"
    },
    {
      "file": "balance/nativeWarlordArrivalFixture.ts",
      "sha256": "393077de90a905f0b616aa599f6b4c67eb1b061556cfb5ca8638e1d19b07e09b"
    },
    {
      "file": "balance/questInteractionFixture.ts",
      "sha256": "d4cb6f6c0a167f6b5c0018826b77c6de02ebc320723ff53df1d2306abff07e85"
    },
    {
      "file": "balance/visibilityFixture.ts",
      "sha256": "8bd5eb99fb84d8fb524ad166418a865c1c41d53dbd994442d5c76b547615bbd3"
    },
    {
      "file": "balance/visibilityFrameFixture.ts",
      "sha256": "464cf6e7256a7d0135238ee0f57041f0b133ccd3df96f66bd524b48f5df7f831"
    },
    {
      "file": "server/simUnits.ts",
      "sha256": "d7ee9a7fbd4b9b1d59c166b29500312eddf1102c5ba99be52e25db59dd535b27"
    },
    {
      "file": "src/engine/nativeSceneHarbor.ts",
      "sha256": "9ec52f62351f1dc3cc3ac77c43c02acd89959a9552db1f4a07ffa91bcca8b459"
    },
    {
      "file": "src/engine/shardRoads.ts",
      "sha256": "3beab6820e34f01d65adcdbe681032d1234f5f47f691dffbdd5b093c7366b1fc"
    },
    {
      "file": "src/engine/shardUnits.ts",
      "sha256": "ec14c0c7f0e32ac892bb9a1f37e0e0644e7012f4b34b151e78393a90abf700ff"
    }
  ],
  "entryLanding": {
    "file": "src/engine/shardUnits.ts",
    "body": "{\n  const back = from ? w.exits.find(e => e.to === from) : undefined;\n  if (!back) { const e = w.shardUnitHost().zoneEntry; return vec(e.x, e.y); }\n  const ang = angleTo(back.pos, vec(w.arena.w / 2, w.arena.h / 2));\n  return vec(back.pos.x + Math.cos(ang) * 120, back.pos.y + Math.sin(ang) * 120);\n}"
  }
} as const;
