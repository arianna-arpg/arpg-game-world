/** Exact native restore/add-seat bodies. Real ownership and staged publication are composed separately. */
import {parseNativeCrusadeFixtureMemory} from './nativeCrusadeFixtureMemory';
import type {World,Seat,PlayerMeta,VendorEntry,VendorHoldRow,VendorHold} from './world';
import {restoreMovementTether} from './movementTether';
import {rand,vec} from '../core/math';
import {Actor} from './actor';
import {type PlayerInputSource} from '../net/intent';
import {ZONE_MEMORY_CFG,savedZoneContents} from './zonecontents';
import {readTownPortals} from './townportal';
import {autoPlace} from './inventory';
import {CONTAINERS,containerBoard,containerMisfits} from './containers';
import {migrateRelicCarry,migrateRelicCorpses} from './accountReliquary';
import {rebuildItem} from './itemgen';
import {MONSTERS} from '../data/monsters';
import {CLASSES,type ClassDef} from '../data/classes';
import {SUPPORTS} from '../data/supports';
import {START_ZONE} from '../data/zones';
import {countRoads,roadBudgetOf,settleWeb} from './worldgen';
import {TOWN_TIERS} from '../data/townBuild';
import {BOUNTY_BOARD_CFG} from '../data/bountyboard';
import {QUESTS} from '../quests/defs';
import {validMassQuestEntry} from '../worldmass/quests';
import {restoreQuestImbues} from './questImbue';
import {OCEAN_BIOME} from '../world/biomes';
import {fieldCoreRect,FIELD_GEN} from '../world/fieldRegion';
import {isSoulriverId,soulriverKeyOf} from '../world/soulriver';
import {zoneKindOf} from '../data/zoneKinds';
import {wornThrongDefOfSkillId} from './throng';
import {coordDist} from '../world/coords';
import {SEA_CFG} from '../data/seas';
import {sanitizeHoldState} from '../data/harborholds';
import {RARITY_DEFS,type MonsterRarity} from './rarity';
import {readMagicPack} from './magicPacks';
import {readEncounterGroup} from './encounterGroups';
import {claimedZonesFromBag} from '../world/overlay';
import {type MercSnapshot} from '../meta/mercs';
import {MercInput} from './mercbrain';
import {rebuildSkill} from './nativeProgressionMeta';
import {saveAccount} from '../meta/persistence';
import {type SavedLoot} from '../meta/death';
import {WORLD_SCHEMA_VERSION,sanitizeBountyBoard,sanitizeEnemyMemo,sanitizeMercSheets,sanitizeProcessionMemo,sanitizeVendorHolds,sanitizeWorldZones,type WorldStateRestore,type SavedZoneMemory,type VendorHoldSave} from '../meta/worldstate';
import {padBar} from './nativeProgressionMeta';

type ZoneEnemyMemo=NonNullable<ReturnType<World["zoneMemorySnapshot"]>>["enemies"][number];

export interface NativeCharacterRestorationHost {
 admitRestoredSeat:(seat:Seat)=>void;
 account:World["account"];
 activeQuests:World["activeQuests"];
 actors:World["actors"];
 addSeat:World["addSeat"];
 adoptSeatMeta:World["adoptSeatMeta"];
 adoptedZonePending:World["adoptedZonePending"];
 applyMercNormalization:World["applyMercNormalization"];
 biomeFor:World["biomeFor"];
 boardStateOf:World["boardStateOf"];
 bountyBoardState:World["bountyBoardState"];
 bountyHands:World["bountyHands"];
 bountyOffers:World["bountyOffers"];
 charDeaths:World["charDeaths"];
 charVendorHolds:World["charVendorHolds"];
 chartsBought:World["chartsBought"];
 clampPos:World["clampPos"];
 clientActionHook:World["clientActionHook"];
 completedObjectives:World["completedObjectives"];
 completedQuests:World["completedQuests"];
 dealVeteranFlasks:World["dealVeteranFlasks"];
 discoveredWaypoints:World["discoveredWaypoints"];
 dropGearAt:World["dropGearAt"];
 events:World["events"];
 grantStartingCompanions:World["grantStartingCompanions"];
 handState:World["handState"];
 hiredMercs:World["hiredMercs"];
 indexSeats:World["indexSeats"];
 linkBackTo:World["linkBackTo"];
 lite:World["lite"];
 liteKindOf:World["liteKindOf"];
 liteKinds:World["liteKinds"];
 liteOpenAt:World["liteOpenAt"];
 localSeat:World["localSeat"];
 makePlayerSeat:World["makePlayerSeat"];
 manifest:World["manifest"];
 markMetaDirty:World["markMetaDirty"];
 mercSheets:World["mercSheets"];
 minionNeedsFullDurability:World["minionNeedsFullDurability"];
 mintThrongBody:World["mintThrongBody"];
 nearestRiverPort:World["nearestRiverPort"];
 nextGenId:World["nextGenId"];
 odyssey:World["odyssey"];
 player:World["player"];
 questDefOf:World["questDefOf"];
 questImbues:World["questImbues"];
 questRescues:World["questRescues"];
 rebuildVendorHolds:World["rebuildVendorHolds"];
 recalcSeat:World["recalcSeat"];
 reconcileContainers:World["reconcileContainers"];
 removeSeat:World["removeSeat"];
 restockSeconds:World["restockSeconds"];
 restoreAccountRelics:World["restoreAccountRelics"];
 roadIsWet:World["roadIsWet"];
 scrubStaleObjectives:World["scrubStaleObjectives"];
 seatHero:World["seatHero"];
 seatSkillById:World["seatSkillById"];
 seats:World["seats"];
 severFootprintCrossers:World["severFootprintCrossers"];
 sim:World["sim"];
 simView:World["simView"];
 soulriverPorts:World["soulriverPorts"];
 spawnMercSeat:World["spawnMercSeat"];
 spawnPlayerCorpses:World["spawnPlayerCorpses"];
 surveyed:World["surveyed"];
 throngRecruitCap:World["throngRecruitCap"];
 throngRosterCount:World["throngRosterCount"];
 time:World["time"];
 townPortalArrival:World["townPortalArrival"];
 townPortalDestination:World["townPortalDestination"];
 townPortalDwell:World["townPortalDwell"];
 townPortals:World["townPortals"];
 townStationKey:World["townStationKey"];
 townTierIdx:World["townTierIdx"];
 vendorArmedBeat:World["vendorArmedBeat"];
 vendorHolds:World["vendorHolds"];
 vendorLootToEntry:World["vendorLootToEntry"];
 visited:World["visited"];
 wornThrongAnchorsOf:World["wornThrongAnchorsOf"];
 zone:World["zone"];
 zoneMap:World["zoneMap"];
 zoneMemory:World["zoneMemory"];
}

export function sceneAddSeat(nativeHost:Pick<NativeCharacterRestorationHost,"admitRestoredSeat"|"actors"|"clampPos"|"dealVeteranFlasks"|"events"|"grantStartingCompanions"|"indexSeats"|"makePlayerSeat"|"markMetaDirty"|"player"|"seats">,id: string, classDef: ClassDef, input: PlayerInputSource, opts?: { startingCompanions?: boolean; startingFlasks?: boolean }): Seat {
    const pos = nativeHost.clampPos(vec(nativeHost.player.pos.x + 50, nativeHost.player.pos.y), 16);
    const seat = nativeHost.makePlayerSeat(id, classDef, input, pos);
    nativeHost.seats.push(seat);
    nativeHost.indexSeats();
    nativeHost.actors.push(seat.actor);
    nativeHost.admitRestoredSeat(seat);
    // CO-OP: a freshly-joined seat needs its FULL meta on the wire (the client
    // boots with nothing) — force-dirty so the next snapshot ships it whole.
    nativeHost.markMetaDirty(seat);
    nativeHost.events.emit('party/join', { actor: seat.actor, seat: id });
    if (opts?.startingCompanions !== false) nativeHost.grantStartingCompanions(seat);
    if (opts?.startingFlasks !== false) nativeHost.dealVeteranFlasks(seat);
    return seat;
  }

export function sceneAdoptSavedMeta(nativeHost:Pick<NativeCharacterRestorationHost,"adoptSeatMeta"|"localSeat"|"spawnPlayerCorpses"|"zone">,meta: PlayerMeta, bar: (string | null)[], level: number): void {
    nativeHost.adoptSeatMeta(nativeHost.localSeat, meta, bar, level);
    // The graft may have CHANGED the corpse ring (mode stage + own-ring
    // records land here, after createPlayer's loadZone already spawned from
    // fresh-character defaults) — re-spawn this zone's corpses from the truth.
    nativeHost.spawnPlayerCorpses(nativeHost.zone);
  }

export function sceneAdoptSeatMeta(nativeHost:Pick<NativeCharacterRestorationHost,"account"|"charDeaths"|"clientActionHook"|"localSeat"|"manifest"|"markMetaDirty"|"recalcSeat"|"reconcileContainers"|"restoreAccountRelics"|"seatHero"|"seatSkillById">,seat: Seat, meta: PlayerMeta, bar: (string | null)[], level: number): void {
    seat.meta = meta;
    if (seat === nativeHost.localSeat && !nativeHost.clientActionHook) {
      migrateRelicCarry(nativeHost.account, meta, meta.relicScope ?? (meta.charId || 'run:' + nativeHost.manifest.seed), meta.legacyRelics ?? true);
      migrateRelicCorpses(nativeHost.account, nativeHost.charDeaths);
      nativeHost.restoreAccountRelics(seat);
      saveAccount(nativeHost.account);
    }
    const hero = nativeHost.seatHero(seat);
    hero.name = meta.name;   // the save's name is the actor's name
    hero.level = level;
    // A fresh build wears fresh grants: the granted lane re-derives from
    // the adopted gear (seatSkillById mints the bar's granted ids on
    // demand; the recalc below folds their true levels onto them).
    seat.grantedInsts = undefined;
    seat.grantedSkills = undefined;
    hero.skills = padBar(bar.map(id => (id ? nativeHost.seatSkillById(seat, id) : null)));
    // THE CONTAINER FABRIC: a saved board is settled against the LIVE fold
    // before it folds — a retuned frame, a lost rung, an unknown container
    // all evict to the bag (or the floor), never silently.
    nativeHost.reconcileContainers(seat);
    nativeHost.recalcSeat(seat);
    hero.fillResources();
    nativeHost.markMetaDirty(seat);
  }

export function sceneReconcileContainers(nativeHost:Pick<NativeCharacterRestorationHost,"clientActionHook"|"dropGearAt"|"localSeat"|"restoreAccountRelics">,seat: Seat): void {
    const m = seat.meta;
    for (const cid of Object.keys(m.containers)) {
      if (cid === 'reliquary' && seat === nativeHost.localSeat && !nativeHost.clientActionHook) {
        nativeHost.restoreAccountRelics(seat); continue;
      }
      const def = CONTAINERS[cid];
      const held = m.containers[cid];
      const misfits = def ? containerMisfits(containerBoard(def), held) : [...held];
      if (!misfits.length) continue;
      m.containers[cid] = held.filter(i => !misfits.includes(i));
      for (const it of misfits) {
        delete it.x; delete it.y;
        if (!autoPlace(m.items, it)) nativeHost.dropGearAt(seat.actor.pos, it, seat.id, true);
      }
      if (!def || !m.containers[cid].length) delete m.containers[cid];
    }
  }

export function sceneSpawnMercSeat(nativeHost:Pick<NativeCharacterRestorationHost,"addSeat"|"applyMercNormalization"|"removeSeat"|"seats">,
    snapshot: MercSnapshot, name: string, ref: { mercId?: string; templateId?: string },
  ): Seat | null {
    const classDef = CLASSES.find(c => c.id === snapshot.classId);
    if (!classDef) return null;
    // First free m-index: a company of blades seats 'm0','m1',… — ids stay
    // unique across hires and mid-run dismissals.
    let mi = 0;
    while (nativeHost.seats.some(s => s.id === `m${mi}`)) mi++;
    const seat = nativeHost.addSeat(`m${mi}`, classDef, new MercInput(), { startingCompanions: false, startingFlasks: false });
    seat.merc = { name, ...ref };
    seat.actor.name = name;
    if (!nativeHost.applyMercNormalization(seat, snapshot, true)) {
      nativeHost.removeSeat(seat.id);
      return null;
    }
    return seat;
  }

export function sceneRestoreHiredMerc(nativeHost:Pick<NativeCharacterRestorationHost,"hiredMercs"|"spawnMercSeat">,m: { name: string; snapshot: MercSnapshot; mercId?: string; templateId?: string }): void {
    const seat = nativeHost.spawnMercSeat(m.snapshot, m.name,
      m.mercId ? { mercId: m.mercId } : { templateId: m.templateId });
    if (seat) nativeHost.hiredMercs.push({ seat, name: m.name, snapshot: m.snapshot, mercId: m.mercId, templateId: m.templateId });
  }

export function sceneRestoreThrong(nativeHost:Pick<NativeCharacterRestorationHost,"liteKindOf"|"liteKinds"|"liteOpenAt"|"minionNeedsFullDurability"|"mintThrongBody"|"player"|"throngRecruitCap"|"throngRosterCount"|"wornThrongAnchorsOf">&{lite:Pick<NativeCharacterRestorationHost["lite"],"spawn">},
    list: { skillId: string; defId: string; level: number; count: number }[],
    keeper: Actor = nativeHost.player,
  ): void {
    for (const row of list) {
      // A WORN roster's anchor rebuilds only if the keeper still wears the
      // granting stat (adoptSavedMeta baked the sheet before this runs) —
      // gone gear, gone roster: the bar-anchor law's exact shape.
      const inst = keeper.skills.find(s => s?.def.id === row.skillId && s.def.throng)
        ?? (wornThrongDefOfSkillId(row.skillId)
          ? nativeHost.wornThrongAnchorsOf(keeper).find(a => a.inst.def.id === row.skillId)?.inst
          : undefined);
      if (!inst || !MONSTERS[row.defId]) continue;
      const n = Math.max(0, Math.min(row.count, nativeHost.throngRecruitCap(keeper, inst) - nativeHost.throngRosterCount(keeper, inst)));
      // A lite-tier roster resumes as POOL ROWS (fresh plies — wear does
      // not persist across a save, matching a classic roster's full-life
      // re-field). Classic rosters mint real bodies exactly as before.
      const spec = inst.def.throng!;
      if (spec.tier === 'lite' && row.defId === spec.monsterId && !nativeHost.minionNeedsFullDurability(keeper, inst)) {
        const kindIdx = nativeHost.liteKindOf(spec.monsterId);
        if (kindIdx < 0) continue;
        for (let i = 0; i < n; i++) {
          const ang = (i / Math.max(1, n)) * Math.PI * 2;
          const bx = keeper.pos.x + Math.cos(ang) * 50, by = keeper.pos.y + Math.sin(ang) * 50;
          const open = nativeHost.liteOpenAt(bx, by);
          nativeHost.lite.spawn(kindIdx, open ? bx : keeper.pos.x, open ? by : keeper.pos.y,
            1, keeper.id, nativeHost.liteKinds[kindIdx].plies0);
        }
        continue;
      }
      for (let i = 0; i < n; i++) {
        const ang = rand(0, Math.PI * 2);
        nativeHost.mintThrongBody(keeper, inst, vec(
          keeper.pos.x + Math.cos(ang) * rand(30, 70),
          keeper.pos.y + Math.sin(ang) * rand(30, 70)), Math.max(1, row.level), row.defId);
      }
    }
  }

export function sceneAdoptWorldState(nativeHost:Pick<NativeCharacterRestorationHost,"activeQuests"|"adoptedZonePending"|"boardStateOf"|"bountyBoardState"|"bountyHands"|"bountyOffers"|"charVendorHolds"|"chartsBought"|"completedQuests"|"discoveredWaypoints"|"handState"|"mercSheets"|"nextGenId"|"odyssey"|"questDefOf"|"questImbues"|"questRescues"|"rebuildVendorHolds"|"scrubStaleObjectives"|"sim"|"simView"|"surveyed"|"time"|"townPortalArrival"|"townPortalDestination"|"townPortalDwell"|"townPortals"|"townStationKey"|"townTierIdx"|"vendorArmedBeat"|"vendorHolds"|"visited"|"zoneMap"|"zoneMemory">,ws: WorldStateRestore | undefined | null): boolean {
    if (!ws || ws.schemaVersion !== WORLD_SCHEMA_VERSION) return false;
    if (typeof ws.time !== 'number' || !Number.isFinite(ws.time)) return false;
    // Event zones survive only while CLAIMED — by a still-active quest whose
    // def still exists, or by an overlay snapshot's ownedZones (the claim
    // convention in world/overlay.ts). The bag is scanned RAW here — no
    // overlay has restored yet, so a save that fails to stand up leaves
    // every field untouched (the fail-safe contract).
    const claimed = new Set(
      (ws.quests?.active ?? [])
        .filter(q => q && typeof q.questId === 'string' && QUESTS[q.questId] && typeof q.zoneId === 'string')
        .map(q => q.zoneId));
    for (const id of claimedZonesFromBag(ws.overlays)) claimed.add(id);
    const healed = sanitizeWorldZones(ws.zones, claimed);
    if (!healed) return false;
    nativeHost.zoneMap = healed;
    nativeHost.townStationKey = '';
    const savedTownTier = TOWN_TIERS.findIndex(t => t.w === healed[START_ZONE].size.w && t.h === healed[START_ZONE].size.h);
    nativeHost.townTierIdx = Math.max(nativeHost.townTierIdx, savedTownTier);
    // HARBORHOLD state rides the defs verbatim — sanitize each (foreign
    // saves, hand edits, renamed classes): a malformed state drops to a
    // bare quay, valid ones clamp to the data ladder. Never a crash.
    for (const z of Object.values(healed)) {
      if (z.harborhold === undefined) continue;
      const s = sanitizeHoldState(z.harborhold);
      if (s) z.harborhold = s;
      else delete z.harborhold;
    }
    // The mint counter resumes past every persisted gen_<n> id (belt: scan
    // them too, so a hand-edited save can never mint a colliding id).
    nativeHost.nextGenId = Math.max(1, Math.floor(ws.nextGenId) || 1);
    for (const id of Object.keys(healed)) {
      const m = /^gen_(\d+)$/.exec(id);
      if (m) nativeHost.nextGenId = Math.max(nativeHost.nextGenId, Number(m[1]) + 1);
    }
    nativeHost.time = Math.max(0, ws.time);
    nativeHost.visited = new Set((ws.visited ?? []).filter(id => typeof id === 'string' && healed[id]));
    nativeHost.surveyed = new Set((ws.surveyed ?? []).filter(id => typeof id === 'string' && healed[id]));
    nativeHost.discoveredWaypoints = new Set(
      (ws.discoveredWaypoints ?? []).filter(id => typeof id === 'string' && healed[id]));
    // Bought harbor charts: OMEN ids (cross-registry, not zone ids), so the
    // scrub is keep-what-stands — a stale id simply never matches a hearsay
    // row again (the completedQuests idiom).
    nativeHost.chartsBought = new Set(
      (ws.chartsBought ?? []).filter((id): id is string => typeof id === 'string'));
    // Zone memory: structural scrub per memo; unknown monster defs stay in the
    // list (restoreZoneEnemies already skips them — one tolerance point);
    // rarity re-validates against the live registry.
    nativeHost.zoneMemory.clear();
    nativeHost.townPortals = readTownPortals(ws.townPortals);
    nativeHost.townPortalDwell.clear();
    nativeHost.townPortalArrival.clear();
    for (const p of nativeHost.townPortals) nativeHost.townPortalArrival.add(p.owner);
    nativeHost.townPortalDestination = typeof ws.townPortalDestination === 'string' ? ws.townPortalDestination : undefined;
    for (const raw of ws.memory ?? []) {
      const m = raw as SavedZoneMemory | null;
      if (!m || typeof m.zoneId !== 'string' || !Array.isArray(m.enemies)) continue;
      if (!healed[m.zoneId] && !m.zoneId.startsWith('cave_')) continue;
      if (typeof m.seed !== 'number' || !Number.isFinite(m.seed)
        || typeof m.savedAt !== 'number' || !Number.isFinite(m.savedAt)) continue;
      if (nativeHost.time - m.savedAt >= ZONE_MEMORY_CFG.ttl) continue;
      const enemies: ZoneEnemyMemo[] = [];
      for (const e of m.enemies) {
        const memo = sanitizeEnemyMemo(e);
        if (!memo) continue;
        enemies.push({
          defId: memo.defId, level: memo.level, x: memo.x, y: memo.y, life: memo.life,
          ...(memo.faction ? { faction: memo.faction } : {}),
          ...(readMagicPack(memo.magicPack) ? { magicPack: readMagicPack(memo.magicPack) } : {}),
          ...(memo.rarity && RARITY_DEFS[memo.rarity as MonsterRarity] ? { rarity: memo.rarity as MonsterRarity } : {}),
          ...(memo.tag ? { tag: memo.tag } : {}),
          ...(memo.name ? { name: memo.name } : {}),
          ...(memo.tier ? { tier: memo.tier } : {}),
          ...(memo.aiAwakened ? { aiAwakened: 1 as const } : {}),
          ...(parseNativeCrusadeFixtureMemory(memo.crusadeFixture)?{crusadeFixture:parseNativeCrusadeFixtureMemory(memo.crusadeFixture)}:{}),
          movementTether: restoreMovementTether(memo.movementTether),
          ...(readEncounterGroup(memo.encounterGroup) ? { encounterGroup: readEncounterGroup(memo.encounterGroup) } : {}),
        });
      }
      const doorState: Record<string, 'open' | 'broken'> = {};
      let doors = 0;
      for (const [id, st] of Object.entries(m.doorState ?? {})) {
        if (st === 'open' || st === 'broken') { doorState[id] = st; doors++; }
      }
      const hollows = Array.isArray(m.hollows)
        ? m.hollows.filter((x): x is string => typeof x === 'string') : [];
      // Revealed annex pieces: string ids only (keep-what-stands — an id
      // whose def row left the registry simply finds no piece at revive).
      const annexOpen = Array.isArray(m.annexOpen)
        ? m.annexOpen.filter((x): x is string => typeof x === 'string') : [];
      const procMemo = sanitizeProcessionMemo(m.procession);
      nativeHost.zoneMemory.set(m.zoneId, {
        seed: m.seed, savedAt: m.savedAt, enemies,
        contents: savedZoneContents(m.contents),
        ...(doors ? { doorState } : {}),
        ...(hollows.length ? { hollows } : {}),
        ...(annexOpen.length ? { annexOpen } : {}),
        // Objective-progress riders (waves counter, stone charges, the
        // escort): finite, clamped-at-use numbers; malformed rows drop.
        ...(typeof m.wave === 'number' && Number.isFinite(m.wave)
          ? { wave: Math.max(0, Math.floor(m.wave)), waveActive: !!m.waveActive } : {}),
        ...(Array.isArray(m.spireCharges)
          ? { spireCharges: m.spireCharges.map(c => typeof c === 'number' && Number.isFinite(c) ? Math.max(0, c) : 0) }
          : typeof m.spireCharge === 'number' && Number.isFinite(m.spireCharge)
            ? { spireCharges: [Math.max(0, m.spireCharge)] } : {}),
        ...(Array.isArray(m.riftCharges)
          ? { riftCharges: m.riftCharges.map(c => typeof c === 'number' && Number.isFinite(c) ? Math.max(0, c) : 0) } : {}),
        ...(Array.isArray(m.pyreCharges)
          ? { pyreCharges: m.pyreCharges.map(c => typeof c === 'number' && Number.isFinite(c) ? Math.max(0, c) : 0) } : {}),
        ...(Array.isArray(m.digCharges)
          ? { digCharges: m.digCharges.map(c => typeof c === 'number' && Number.isFinite(c) ? Math.max(0, c) : 0) } : {}),
        ...(Array.isArray(m.occSprung)
          ? { occSprung: m.occSprung.map(c => typeof c === 'number' && c > 0 ? 1 : 0) } : {}),
        // Harvest spent flags: honest 0/1 only (the occSprung scrub).
        ...(Array.isArray(m.harvestSpent)
          ? { harvestSpent: m.harvestSpent.map(c => typeof c === 'number' && c > 0 ? 1 : 0) } : {}),
        ...(procMemo ? { procession: procMemo } : {}),
        ...(typeof m.altarOffered === 'number' && Number.isFinite(m.altarOffered)
          ? { altarOffered: Math.max(0, Math.floor(m.altarOffered)) } : {}),
        ...(typeof m.cullKills === 'number' && Number.isFinite(m.cullKills)
          ? { cullKills: Math.max(0, Math.floor(m.cullKills)) } : {}),
        ...(typeof m.cullNeed === 'number' && Number.isFinite(m.cullNeed) && m.cullNeed >= 1
          ? { cullNeed: Math.floor(m.cullNeed) } : {}),
        ...(Array.isArray(m.puzzlesDone)
          ? { puzzlesDone: m.puzzlesDone.filter((x): x is string => typeof x === 'string') }
          : {}),
        // The regrowth cycle's clock: a finite world time, else dropped
        // (a fresh entry re-ages from now — the ground is merely younger).
        ...(typeof m.charBorn === 'number' && Number.isFinite(m.charBorn)
          ? { charBorn: m.charBorn } : {}),
      });
    }
    // THE BOUNTY BOARD's slate stands up BEFORE the quest filter runs —
    // questDefOf resolves a taken posting's generated def only while its
    // hand is seated (the resolver seam; docs/design/bounty-board.md §2:
    // without this order every accepted bounty silently dies on reload).
    const bb = sanitizeBountyBoard(ws.bountyBoard, healed, ws.worldmass);
    nativeHost.bountyBoardState = {};
    nativeHost.boardStateOf(BOUNTY_BOARD_CFG.boardId).armedBeat = bb?.armedBeat ?? -1;
    nativeHost.boardStateOf(BOUNTY_BOARD_CFG.boardId).refreshSeq = bb?.refreshSeq ?? 0;
    for (const [k, v] of Object.entries(bb?.boards ?? {})) {
      nativeHost.bountyBoardState[k] = { armedBeat: v.armedBeat, refreshSeq: v.refreshSeq ?? 0 };
    }
    nativeHost.bountyOffers = bb?.offers ?? [];
    nativeHost.bountyHands = bb?.hands ?? [];
    // Quests: active entries whose def AND zone both still stand; the
    // completed set rides verbatim (stale ids gate nothing — questDefOf
    // lookups simply miss them).
    nativeHost.odyssey.restore(ws.odyssey);
    nativeHost.activeQuests = (ws.quests?.active ?? [])
      .filter(q => q && typeof q.questId === 'string' && nativeHost.questDefOf(q.questId)
        && typeof q.zoneId === 'string' && (q.placeId === undefined ? healed[q.zoneId] : validMassQuestEntry(q, ws.worldmass)))
      .map(q => ({ questId: q.questId, zoneId: q.zoneId, fieldDone: !!q.fieldDone, directionsKnown: q.directionsKnown,
        ...(q.placeId !== undefined ? { placeId: q.placeId } : {}) }));
    // A hand whose quest row a stale save dropped re-seats it (the row is
    // derivable from the posting — the announce latch re-reads off the
    // kind's own standing so the withhold notice never replays a resolved
    // ask; THE READINESS LAW: the standing itself is never stored).
    for (const h of nativeHost.bountyHands) {
      if (!nativeHost.activeQuests.some(e => e.questId === h.id)) {
        nativeHost.activeQuests.push({
          questId: h.id, zoneId: h.zoneId,
          fieldDone: nativeHost.handState(h) !== 'afield',
        });
      }
    }
    nativeHost.completedQuests = new Set(
      (ws.quests?.completed ?? []).filter((id): id is string => typeof id === 'string'));
    nativeHost.questImbues = restoreQuestImbues(ws.questImbues)
      .filter(r => !!QUESTS[r.questId]?.reward.imbue && nativeHost.completedQuests.has(r.questId));
    // THE MUSTER-ROLL LAW: the locked officer sheets stand back up (registry-
    // tolerant; empty sheets survive — a sold-out officer never re-mints).
    // The next arm's supply reconcile squares veteran rows with the LIVE
    // roster; nothing rerolls here or ever.
    nativeHost.mercSheets = sanitizeMercSheets(ws.mercSheets, healed);
    // THE PATRON'S HOLD stands back up beside the muster roll (the same
    // tolerance doctrine: a hold row whose gem left the registry drops, a
    // site-scoped hold drops with its ground, nothing rerolls here).
    nativeHost.vendorHolds = nativeHost.rebuildVendorHolds(sanitizeVendorHolds(ws.vendorHolds, healed));
    // THE SHELF PER BUYER: each character's holds stand back up the same way (absent = none).
    nativeHost.charVendorHolds = Object.fromEntries(Object.entries(ws.charVendorHolds ?? {})
      .map(([who, holds]) => [who, nativeHost.rebuildVendorHolds(sanitizeVendorHolds(holds, healed))] as const)
      .filter(([, holds]) => Object.keys(holds).length));
    // …and THE STANDING SHELF yields to what stood back up: the armed-beat
    // memory clears, so the next zone arm re-deals this beat's shelf WITH
    // the restored reservations seated. (The world CONSTRUCTS into town —
    // its boot arm ran before this save's holds existed; same beat, same
    // seed, same wares, but the overlay must run again to seat the rows.
    // A same-beat re-arm re-deals the identical seeded shelf, so this can
    // never become a re-roll lever.)
    nativeHost.vendorArmedBeat = {};
    // Objective clears survive only for ground that actually persisted: event
    // overlays re-seed DETERMINISTICALLY (same run seed ⇒ same crusade/demon
    // zone keys), so a stale clear-key would pre-clear the freshly re-rolled
    // event — the exact bug the old save-strip prefix filter existed to close.
    nativeHost.scrubStaleObjectives();
    nativeHost.questRescues.reconcile();
    // Overlays: each opted-in field takes its snapshot back; everything else
    // is re-seeded over the restored graph exactly as mint-time charting
    // would have (floating zones excepted — they chart when a road forms).
    // The prune pass then drops any restored row whose zone the sanitizer
    // culled, so a ghost entry can never hold a cap slot or pin a marker.
    const restored = nativeHost.sim.restoreOverlays(ws.overlays);
    nativeHost.sim.pruneOverlayZones(id => !!healed[id]);
    nativeHost.sim.reseedGraph(Object.values(healed), nativeHost.simView(), restored);
    nativeHost.adoptedZonePending = true;
    return true;
  }

export function sceneScrubStaleObjectives(nativeHost:Pick<NativeCharacterRestorationHost,"completedObjectives"|"zoneMap">,): void {
    nativeHost.completedObjectives = new Set(
      [...nativeHost.completedObjectives].filter(id => nativeHost.zoneMap[id] || id.startsWith('cave_')));
  }

export function sceneRebuildVendorHolds(nativeHost:Pick<NativeCharacterRestorationHost,"restockSeconds"|"time"|"vendorLootToEntry">,saved: Record<string, VendorHoldSave>): Record<string, VendorHold> {
    const out: Record<string, VendorHold> = {};
    for (const [key, h] of Object.entries(saved)) {
      const locks: VendorHoldRow[] = [];
      for (const r of h.locks) {
        const entry = nativeHost.vendorLootToEntry(r.loot);
        if (entry) locks.push({ entry, idx: r.idx, ...(r.commission ? { commission: true } : {}) });
      }
      out[key] = {
        locks,
        ...(h.commission ? { commission: { ...h.commission } } : {}),
        // Wall-time anchor preferred; a LEGACY beat index converts under
        // the current quantum (approximate, tolerant); absent both (a
        // foreign/hand-edited save) the watch starts NOW — never a
        // retroactive windfall.
        watchedSec: h.watchedSec
          ?? (h.ordinal !== undefined ? h.ordinal * nativeHost.restockSeconds() : nativeHost.time),
      };
    }
    return out;
  }

export function sceneVendorLootToEntry(nativeHost:Pick<NativeCharacterRestorationHost,never>,it: SavedLoot): VendorEntry | null {
    if (it.kind === 'skill') {
      const inst = rebuildSkill(it);
      return inst ? { kind: 'skill', inst } : null;
    }
    if (it.kind === 'support') {
      const def = SUPPORTS[it.supportId];
      // Rehydration: the saved cut rides back verbatim, never re-rolled.
      return def
        ? { kind: 'support', gem: { def, level: it.level, ...(it.rolled ? { rolled: { ...it.rolled } } : {}) } }
        : null;
    }
    const item = rebuildItem(it.item);
    return item ? { kind: 'item', item } : null;
  }

export function sceneReconcileSoulrivers(nativeHost:Pick<NativeCharacterRestorationHost,"linkBackTo"|"nearestRiverPort"|"soulriverPorts"|"zoneMap">,): void {
    for (const z of Object.values(nativeHost.zoneMap)) {
      if (!isSoulriverId(z.id)) continue;
      // Identity re-assert (the sanitizer's authored-zone idiom): a keyed
      // river ALWAYS wears the kind — the sealed-shores law rides it.
      if (soulriverKeyOf(z.id)) z.kind = 'soulriver';
      nativeHost.soulriverPorts(z);
    }
    // Heal stale ONE-WAY roads: a neighbor still pointing at a sealed river
    // (an older save's accumulated discovery edges) REWIRES to the nearest
    // landing port — the sea-harbor law applied retroactively, connectivity
    // kept, the wall of doors gone. A reciprocal edge is a true pier (the
    // port pairs) and stays; legacy bare-id rivers are untouched.
    for (const z of Object.values(nativeHost.zoneMap)) {
      if (isSoulriverId(z.id)) continue;
      for (let i = z.exits.length - 1; i >= 0; i--) {
        const e = z.exits[i];
        if (e.to === '?' || !isSoulriverId(e.to)) continue;
        const river = nativeHost.zoneMap[e.to];
        const key = soulriverKeyOf(e.to);
        if (!river || !key) continue;
        if (river.exits.some(x => x.to === z.id)) continue;
        const port = nativeHost.nearestRiverPort(key, z.map);
        if (port && port.id !== z.id && !z.exits.some(x => x.to === port.id)) {
          e.to = port.id;
          nativeHost.linkBackTo(port, z);
        } else {
          z.exits.splice(i, 1);
        }
      }
    }
  }

export function sceneReconcileSeaPorts(nativeHost:Pick<NativeCharacterRestorationHost,"roadIsWet"|"zoneMap">,): void {
    for (const z of Object.values(nativeHost.zoneMap)) {
      if (z.dimension) continue;
      if (z.holdAnchor && z.port) {
        z.kind = 'port'; // identity re-assert (the sanitizer's authored-zone idiom)
        // The quay's NEAR-SANCTUARY face is registry truth too: an older
        // save's 'clear' port re-reads as the objective-less harbor, and
        // the sparse-texture dial re-stamps at the live value.
        if (z.objective.kind !== 'none') z.objective = { kind: 'none', label: 'a harbor' };
        z.packDensity = SEA_CFG.pair.portPackDensity;
        if (!z.fauna) z.fauna = SEA_CFG.pair.quayFauna.map(f => ({ ...f }));
        const a = nativeHost.zoneMap[z.holdAnchor];
        if (a && a.holdPort !== z.id) a.holdPort = z.id;
      }
      if (z.holdPort) {
        const gate = z.exits.find(x => x.to === z.holdPort);
        if (gate && gate.lock !== 'harborhold') gate.lock = 'harborhold';
        // THE DEGREE TRIM: a saved anchor that collected spokes past the
        // cap (the pre-cap hub leak) sheds its FARTHEST un-notarized dry
        // roads back down to budget — reciprocals healed, the belt kept
        // (never a neighbour's last road, never the causeway).
        const cap = SEA_CFG.pair.anchorMaxRoads;
        const shed = (): boolean => {
          const real = z.exits.filter(x => x.to !== '?');
          if (real.length <= cap) return false;
          const cands = real
            .filter(x => x.notarized !== true && x.to !== z.holdPort)
            .map(x => ({ x, d: nativeHost.zoneMap[x.to] ? coordDist(nativeHost.zoneMap[x.to].map, z.map) : 0 }))
            .sort((a2, b2) => b2.d - a2.d);
          for (const c of cands) {
            const dest = nativeHost.zoneMap[c.x.to];
            if (!dest) { z.exits.splice(z.exits.indexOf(c.x), 1); return true; }
            if (dest.exits.some(x2 => x2.to === z.id && x2.notarized === true)) continue;
            if (dest.exits.filter(x2 => x2.to !== '?').length <= 1) continue; // the belt
            z.exits.splice(z.exits.indexOf(c.x), 1);
            const back = dest.exits.findIndex(x2 => x2.to === z.id);
            if (back >= 0) dest.exits.splice(back, 1);
            return true;
          }
          return false;
        };
        for (let guard = 0; guard < 16 && shed(); guard++) { /* trims to cap */ }
      }
      if (z.kind === 'port' && zoneKindOf(z)?.staticExits) {
        for (let i = z.exits.length - 1; i >= 0; i--) {
          const e = z.exits[i];
          if (e.to !== '?' && e.notarized !== true) z.exits.splice(i, 1);
        }
      }
    }
    for (const z of Object.values(nativeHost.zoneMap)) {
      if (z.dimension) continue;
      for (let i = z.exits.length - 1; i >= 0; i--) {
        const e = z.exits[i];
        if (e.to === '?' || e.notarized === true) continue;
        const dest = nativeHost.zoneMap[e.to];
        if (!dest || dest.dimension) continue;
        // THE DEED RIDES EITHER SIDE: a frontier child's unavoidable wet
        // back-edge is notarized at mint, but its source's forward edge is
        // a mutated '?' that carries no mark — one deed protects the road.
        if (dest.exits.some(x => x.to === z.id && x.notarized === true)) continue;
        if (!nativeHost.roadIsWet(z.map, dest.map)) continue;
        if (z.exits.filter(x => x.to !== '?').length <= 1) continue; // the belt
        z.exits.splice(i, 1);
        const back = dest.exits.findIndex(x => x.to === z.id && x.notarized !== true);
        if (back >= 0 && dest.exits.filter(x => x.to !== '?').length > 1) {
          dest.exits.splice(back, 1);
        }
      }
    }
  }

export function sceneReconcileWebLaws(nativeHost:Pick<NativeCharacterRestorationHost,"biomeFor"|"severFootprintCrossers"|"zoneMap">,): void {
    for (const z of Object.values(nativeHost.zoneMap)) {
      if (z.dimension || !z.field) continue;
      const f = z.field;
      // THE DWARF FLOOR, retroactive: a saved expanse below the minimum span
      // (minted before the floor) stands down to ORDINARY country — its tiny
      // rect protected nothing and deadlocked the settling.
      {
        const r = fieldCoreRect(f, z.size);
        if (Math.min(r.x1 - r.x0, r.y1 - r.y0) < FIELD_GEN.minSpanCells * FIELD_GEN.step) {
          delete z.field;
          delete z.berths;
          continue;
        }
      }
      if (!z.berths?.length && f.nodeW && f.nodeH) {
        z.berths = [];
        for (const at of FIELD_GEN.hubSpread) {
          z.berths.push(
            { x: f.originX + f.nodeW * at, y: f.originY },
            { x: f.originX + f.nodeW * at, y: f.originY + f.nodeH },
            { x: f.originX, y: f.originY + f.nodeH * at },
            { x: f.originX + f.nodeW, y: f.originY + f.nodeH * at },
          );
        }
      }
      const cap = roadBudgetOf(z);
      const shed = (): boolean => {
        const real = z.exits.filter(x => x.to !== '?');
        if (real.length <= cap) return false;
        const cands = real
          .filter(x => x.notarized !== true)
          .map(x => ({ x, d: nativeHost.zoneMap[x.to] ? coordDist(nativeHost.zoneMap[x.to].map, z.map) : 0 }))
          .sort((a, b) => b.d - a.d);
        for (const c of cands) {
          const dest = nativeHost.zoneMap[c.x.to];
          if (!dest) { z.exits.splice(z.exits.indexOf(c.x), 1); return true; }
          if (dest.exits.some(x2 => x2.to === z.id && x2.notarized === true)) continue;
          if (dest.exits.filter(x2 => x2.to !== '?').length <= 1) continue; // the belt
          z.exits.splice(z.exits.indexOf(c.x), 1);
          const back = dest.exits.findIndex(x2 => x2.to === z.id);
          if (back >= 0) dest.exits.splice(back, 1);
          return true;
        }
        return false;
      };
      for (let guard = 0; guard < 24 && shed(); guard++) { /* trims to budget */ }
      // Fold surplus promises too: at/over budget, an unlocked '?' will only
      // be dropped by the resolution gate later — clear the clutter now.
      if (countRoads(z) >= cap) {
        for (let i = z.exits.length - 1; i >= 0; i--) {
          const e = z.exits[i];
          if (e.to === '?' && !e.lock) z.exits.splice(i, 1);
        }
      }
      // …and the FOOTPRINT sweep: saved roads cutting across the expanse
      // (forged before the law, or before this expanse minted) heal away.
      nativeHost.severFootprintCrossers(z);
    }
    // THE SETTLING, retroactive: a saved chart's overlapping nodes (pre-law
    // directed mints, field re-centres, event drops) relax to the hover
    // floor — the same bounded force-directed pass every fresh mint rides,
    // run once over the whole graph (the cheap no-violation gate exits fast
    // on a clean chart).
    settleWeb(nativeHost.zoneMap, null, {
      canStand: (z, pt) => (z.dimension ? true : nativeHost.biomeFor(pt) !== OCEAN_BIOME),
    });
  }
