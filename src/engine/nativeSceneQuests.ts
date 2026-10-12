/** Native quest field, reward, scope and graph mutations; one audited writer-identity projection. */
import {ODYSSEY_CFG,odysseyFaction,odysseyQuestId} from '../data/odyssey';
import {dist,vec,type Vec2} from '../core/math';
import {Actor} from './actor';
import {makeSkillGem} from './skills';
import {autoPlace,removeFromBag} from './inventory';
import {makeSkillGemItem} from './gemitems';
import {nextItemUid,forgeItem} from './itemgen';
import {type ItemInstance} from './items';
import {SKILLS} from '../data/skills';
import {COOP_SCALING} from '../data/coop';
import {VOCATIONS,VOCATION_CFG,vocationLedgerKey,vocationRootId} from '../data/vocations';
import {START_ZONE,type ZoneDef} from '../data/zones';
import {npcDwellReach} from '../data/transit';
import {countRoads,placeZoneAt,projectCoord,nearestNode,roadBudgetOf} from './worldgen';
import {BOUNTY_BOARD_CFG,describeBountyPay} from '../data/bountyboard';
import {QUESTS} from '../quests/defs';
import {resolveQuestZone} from '../quests/reliquary';
import type {QuestDef} from '../quests/types';
import {mintQuestImbue} from './questImbue';
import {type QuestLedger} from './questLedger';
import {questRewardChoices} from './questRewardChoices';
import {type QuestStanding} from '../quests/types';
import {Rng,withSeededRandom} from '../core/rng';
import {coordDist,type MapCoord} from '../world/coords';
import {isRoadlessGateHub} from '../world/dimensions';
import {authoredMapOf,authoredZoneSpec,definedSpec,sealAuthoredZone} from './authoredMaps';
import type {ZoneSpec} from './worldgen';
import {bumpLedger} from '../packages/ledger';
import {questDoneKey,LEDGER_BOUNTY_DONE,bountyDoneKindKey} from '../meta/account';
import {saveCharacter} from '../meta/character';
import {saveAccount} from '../meta/persistence';
import {type SavedQuestEntry} from '../meta/worldstate';
import {hashStr} from './nativeSceneConfig';
import type {World,Seat} from './world';
export const QUESTGIVER_RADIUS = 150;
export const APPROACH_RADIUS = 150;
export interface NativeSceneQuestHost {
 acceptOdysseyCompatibleQuest:World['acceptOdysseyCompatibleQuest'];
 account:World['account'];
 accountDirty:World['accountDirty'];
 actingSeat:World['actingSeat'];
 activeQuests:World['activeQuests'];
 actors:World['actors'];
 biomeDepthFor:World['biomeDepthFor'];
 biomeFor:World['biomeFor'];
 bountyHands:World['bountyHands'];
 charDirty:World['charDirty'];
 clientActionHook:World['clientActionHook'];
 climateFor:World['climateFor'];
 completeQuestField:World['completeQuestField'];
 completedQuests:World['completedQuests'];
 creditedHands:World['creditedHands'];
 deedHand:World['deedHand'];
 dropEssenceAt:World['dropEssenceAt'];
 dropGearAt:World['dropGearAt'];
 dropGemAt:World['dropGemAt'];
 drops:World['drops'];
 dwellReachable:World['dwellReachable'];
 ensureQuestCargo:World['ensureQuestCargo'];
 ensureSeatCargo:World['ensureSeatCargo'];
 eventLevel:World['eventLevel'];
 failNote:World['failNote'];
 failNoteAt:World['failNoteAt'];
 findBandCoord:World['findBandCoord'];
 forechartSounding:World['forechartSounding'];
 getQuestGiver:World['getQuestGiver'];
 giverPresent:World['giverPresent'];
 grantVocation:World['grantVocation'];
 grantXp:World['grantXp'];
 graphWorkAvailable:World['graphWorkAvailable'];
 handSeats:World['handSeats'];
 handState:World['handState'];
 hasNpcRole:World['hasNpcRole'];
 invalidateZonesSaveMemo:World['invalidateZonesSaveMemo'];
 ledger:World['ledger'];
 levelFor:World['levelFor'];
 localHumanSeats:World['localHumanSeats'];
 localSeat:World['localSeat'];
 manifest:World['manifest'];
 markMetaDirty:World['markMetaDirty'];
 massAway:World['massAway'];
 massRuntime:World['massRuntime'];
 meta:World['meta'];
 metaProgressionActive:World['metaProgressionActive'];
 nearestHand:World['nearestHand'];
 nextGenId:World['nextGenId'];
 notarizeRoad:World['notarizeRoad'];
 noteBountyReady:World['noteBountyReady'];
 notice:World['notice'];
 objectivePlaces:World['objectivePlaces'];
 odyssey:Pick<World['odyssey'],'questCompleted'>;
 onQuestZoneCleared:World['onQuestZoneCleared'];
 ownQuestLedger:World['ownQuestLedger'];
 pendingTurnIns:World['pendingTurnIns'];
 player:World['player'];
 pullToLand:World['pullToLand'];
 questDefOf:World['questDefOf'];
 questHand:World['questHand'];
 questImbues:World['questImbues'];
 questLedgerOf:World['questLedgerOf'];
 questLedgerOverride:World['questLedgerOverride'];
 questLocalAnchor:World['questLocalAnchor'];
 questRescues:Pick<World['questRescues'],'free'>;
 questRewardItem:World['questRewardItem'];
 questRewardItems:World['questRewardItems'];
 questRewardRequested:World['questRewardRequested'];
 questRewardShown:World['questRewardShown'];
 questSeat:World['questSeat'];
 questStamp:World['questStamp'];
 questStanding:World['questStanding'];
 recalcSeat:World['recalcSeat'];
 refreshExitLabels:World['refreshExitLabels'];
 revealQuestGround:World['revealQuestGround'];
 roadIsWet:World['roadIsWet'];
 sameParty:World['sameParty'];
 seatHero:World['seatHero'];
 seatHudOf:World['seatHudOf'];
 seatNoteAt:World['seatNoteAt'];
 seatOf:World['seatOf'];
 seats:World['seats'];
 sim:World['sim'];
 simView:World['simView'];
 storyPair:World['storyPair'];
 surveyed:World['surveyed'];
 text:World['text'];
 time:World['time'];
 visited:World['visited'];
 withQuestHand:World['withQuestHand'];
 zone:World['zone'];
 zoneMap:World['zoneMap'];
 zoneMemory:World['zoneMemory'];
 readonly characterWriter:World;
}

export function sceneOnQuestZoneFieldCleared(host:NativeSceneQuestHost,zoneId: string,places?: readonly Vec2[],to?: Seat | null):void {
    // Every row on host ground (THE JUICING LEAN stacks boards' postings on
    // one zone beside an authored quest's own arena).
    const fieldRows = (): void => {
      for (const aq of host.activeQuests.filter(e => !e.placeId && e.zoneId === zoneId)) host.completeQuestField(aq);
    };
    // THE CHARACTER'S QUESTS (card 24): on a hosted world the deed completes the field leg
    // in the ledger of every seat it credits (THE NEAR LAW), each in its own hand.
    if (host.localSeat.keeper) {
      const acting = host.actingSeat;
      const author = to ?? (acting && !acting.keeper && !acting.merc ? acting : null);
      for (const seat of host.creditedHands(places ?? host.objectivePlaces(), author)) host.withQuestHand(seat, fieldRows);
      return;
    }
    // THE QUEST HAND: a deed the sim noticed pays the act's seat, else the player nearest it.
    host.deedHand(() => host.objectivePlaces(), fieldRows);
  }

export function sceneDeedHand<T>(host:NativeSceneQuestHost,places: () => readonly Vec2[],fn: () => T):T {
    if (!host.questHand().keeper) return fn();
    const near = host.nearestHand(places());
    return near ? host.withQuestHand(near, fn) : fn();
  }

export function sceneCompleteQuestField(host:NativeSceneQuestHost,aq: SavedQuestEntry):void {
    // A generated posting still owns its deed predicate; a zone clear can
    // only ask its native readiness fold, never replace that requirement.
    const posting = host.bountyHands.find(h => h.id === aq.questId);
    if (posting) { host.noteBountyReady(posting); return; }
    const q = host.questDefOf(aq.questId);
    if (q?.turnIn) {
      if (!aq.fieldDone) {
        aq.fieldDone = true;
        host.questRescues.free(q);
        host.ensureQuestCargo();
        host.charDirty = true;
        host.notice(q.turnIn.prompt ?? 'Objective complete — return to the quartermaster to claim your reward.', '#ffd700', 16, 'civic');
      }
      return;
    }
    host.onQuestZoneCleared(aq);
  }

export function sceneEnsureQuestCargo(host:NativeSceneQuestHost):void {
    if (host.localSeat.keeper) { host.ensureSeatCargo(); return; } // THE CHARACTER'S QUESTS
    for (const aq of host.activeQuests) {
      if (aq.placeId || !aq.fieldDone || aq.zoneId !== host.zone.id) continue;
      const q = host.questDefOf(aq.questId);
      if (!q?.collect) continue;
      // THE QUEST HAND (a hosted world): the one cargo is carried when any player's bag holds it.
      const carried = host.localSeat.keeper
        ? host.seats.some(s => !s.keeper && s.meta.items.some(i => i.questId === q.id))
        : host.meta.items.some(i => i.questId === q.id);
      if (carried || host.drops.some(d => d.item.kind === 'gear' && d.item.item.questId === q.id)) continue;
      const item: ItemInstance = { uid: nextItemUid(), baseId: q.collect.baseId,
        name: q.collect.name, questId: q.id, rarity: 'common', ilvl: host.zone.level,
        tier: 1, baseRoll: 0, affixes: [], implicitRolls: [] };
      const boss = host.zone.objective.kind === 'boss' ? host.zone.objective.id : undefined;
      const deed = host.localSeat.keeper ? host.objectivePlaces()[0] : undefined; // XP BY PLACE's own: where the deed was done, never the keeper's spot
      const at = host.actors.find(a => a.defId === boss && a.dead)?.pos ?? deed ?? host.player.pos;
      host.dropGearAt(at, item, undefined, true);
      host.charDirty = true;
    }
  }

export function sceneEnsureSeatCargo(host:NativeSceneQuestHost):void {
    let lying: Map<string, number> | null = null; // the ground's cargo, counted once a hand is owed (never per tick)
    for (const seat of host.handSeats()) {
      for (const aq of host.questLedgerOf(seat).active) {
        if (aq.placeId || !aq.fieldDone || aq.zoneId !== host.zone.id) continue;
        const q = host.withQuestHand(seat, () => host.questDefOf(aq.questId));
        if (!q?.collect || seat.meta.items.some(i => i.questId === q.id)) continue;
        if (!lying) {
          lying = new Map<string, number>();
          for (const d of host.drops) {
            if (d.item.kind === 'gear' && d.item.item.questId) lying.set(d.item.item.questId, (lying.get(d.item.item.questId) ?? 0) + 1);
          }
        }
        const standing = lying.get(q.id) ?? 0;
        if (standing > 0) { lying.set(q.id, standing - 1); continue; }
        const item: ItemInstance = { uid: nextItemUid(), baseId: q.collect.baseId,
          name: q.collect.name, questId: q.id, rarity: 'common', ilvl: host.zone.level,
          tier: 1, baseRoll: 0, affixes: [], implicitRolls: [] };
        const boss = host.zone.objective.kind === 'boss' ? host.zone.objective.id : undefined;
        const at = host.actors.find(a => a.defId === boss && a.dead)?.pos ?? host.objectivePlaces()[0] ?? host.seatHero(seat).pos;
        host.dropGearAt(at, item, undefined, true);
        host.charDirty = true;
      }
    }
  }

export function sceneOnQuestZoneCleared(host:NativeSceneQuestHost,aq: { questId: string; zoneId: string; fieldDone: boolean },questRewardChoice?: string):void {
    const idx = host.activeQuests.indexOf(aq);
    if (idx < 0) return;
    host.odyssey.questCompleted(aq.questId);
    const q = host.questDefOf(aq.questId);
    // THE QUEST HAND: the seat that turns the quest in (or whose deed paid it) carries
    // the cargo and takes the pay: its bag, its points, its feet. The hero off a hosted world.
    const hand = host.questHand();
    const hm = hand.meta, hp = hand.actor.pos;
    if (q?.collect) {
      const cargo = hm.items.find(i => i.questId === q.id && i.baseId === q.collect!.baseId);
      if (!cargo || host.questStanding(aq) !== 'ready' || host.giverPresent(q.turnIn?.giver ?? []) === null) return;
    }
    if (q && (q.reward.choices?.length || q.reward.skillChoice)) {
      // No XP, chain stamp or case until a real choice fits in the bag.
      if (questRewardChoice === undefined) {
        if (host.questRewardShown !== q.id) {
          host.questRewardShown = q.id;
          host.questRewardRequested = true;
        }
        return;
      }
      const choice = questRewardChoices(host.account, q).find(c => c.id === questRewardChoice);
      if (!choice) return;
      const questReward = host.questRewardItem(q, choice.id, choice);
      if (!questReward) return;
      if (!autoPlace(hm.items, questReward)) {
        host.failNote(hand.actor, 'questReward', 'Make room in your pack, then choose your reward again.');
        return;
      }
    }
    // A GENERATED posting's payout (the taken hand still seated — turnInBounty
    // removes it after host returns): the shared-stamp branch below.
    const posting = host.bountyHands.find(h => h.id === aq.questId) ?? null;
    if (q) {
      if (q.collect) {
        const cargo = hm.items.find(i => i.questId === q.id && i.baseId === q.collect!.baseId)!;
        removeFromBag(hm.items, cargo.uid);
      }
      if (q.reward.imbue) {
        host.questImbues.push(mintQuestImbue(q.id, host.manifest.seed, q.reward.imbue.level, q.reward.imbue.choices));
        host.questRewardRequested = true;
      }
      for (const feature of q.reward.features ?? []) host.account.features.add(feature);
      if (q.reward.features?.length) host.accountDirty = true;
      // XP BY PLACE (the credit law): the hand's party near the giver; off a hosted world the
      // near radius is 0 and the grant pays every seat as before.
      if (q.reward.xp) host.grantXp(q.reward.xp, hp, hand.keeper ? undefined : hand);
      // OWED pay: a quest's gems are earned of the writ, not of the ground
      // underfoot — they land even where THE SPOILS LAW seals local mints.
      // THE MEMORY LAW: unnamed gem pay falls as Memories of the writ (the
      // 'quest' provenance word); a quest that NAMES its gem is an offered
      // reward and would mint it whole — none does today.
      for (let i = 0; i < (q.reward.gems ?? 0); i++) host.dropGemAt(hp, undefined, true, 'quest');
      // R1 ESSENCE (bounty board M0; any authored quest may pay it too):
      // ground packets at the payout site. Turn-in quests pay at the giver
      // — town for the board — so the spoils seal never bites; a future
      // non-turn-in essence quest paying on sealed ground would need the
      // owed lever grown onto dropEssenceAt (charter pitfall 4, recorded).
      for (const c of q.reward.essence ?? []) host.dropEssenceAt(hp, c);
      if (q.reward.passivePoints) {
        hm.passivePoints += q.reward.passivePoints;
        host.text(vec(hp.x, hp.y - 64),
          `+${q.reward.passivePoints} passive point`, '#a0e0ff', 16);
      }
      if (q.reward.vocationPoints) {
        hm.vocationPoints += q.reward.vocationPoints;
        const vocColor = q.vocation ? VOCATIONS[q.vocation]?.color : undefined;
        host.text(vec(hp.x, hp.y - 44),
          `+${q.reward.vocationPoints} vocation point${q.reward.vocationPoints > 1 ? 's' : ''}`,
          vocColor ?? '#e8c860', 16);
        host.markMetaDirty(hand);
      }
      if (q.reward.grantVocation) host.grantVocation(q.reward.grantVocation, hand);
      if (q.reward.ledger) {
        for (const [k, v] of Object.entries(q.reward.ledger)) host.questStamp(k, v); // THE CHARACTER'S QUESTS: the chain keys are the hand's own
      }
      if (posting) {
        // THE SHARED-STAMP LAW (charter §2): a GENERATED posting never
        // stamps a per-id quest_done: key (fresh ids per posting would grow
        // the account ledger without bound) — the shared counters carry the
        // deed instead, run + account, same durability precedent.
        host.questStamp(LEDGER_BOUNTY_DONE); // THE CHARACTER'S QUESTS
        host.questStamp(bountyDoneKindKey(posting.kind));
        if (host.metaProgressionActive()) {
          const kk = bountyDoneKindKey(posting.kind);
          host.account.ledger[LEDGER_BOUNTY_DONE] = (host.account.ledger[LEDGER_BOUNTY_DONE] ?? 0) + 1;
          host.account.ledger[kk] = (host.account.ledger[kk] ?? 0) + 1;
          host.accountDirty = true;
        }
        host.notice(`Bounty complete: ${q.offerLabel} — ${describeBountyPay(posting.pay)}.`,
          BOUNTY_BOARD_CFG.accent, 18, 'civic');
      } else {
        // THE QUEST LEDGER CONTRACT (meta/account.ts questDoneKey): a presence
        // key per quest, stamped at turn-in — to the run ledger AND straight to
        // the account under metaProgression (the grantVocation durability
        // precedent: quit-without-death keeps the deed; the death-merge's later
        // add is harmless, every reader tests ≥ 1). Gatework `quest` avenues
        // read these the moment the deed lands, never a death later.
        host.questStamp(questDoneKey(aq.questId)); // THE CHARACTER'S QUESTS: the quest-done key gates the hand's own offers
        if (host.metaProgressionActive()) {
          host.account.ledger[questDoneKey(aq.questId)] =
            (host.account.ledger[questDoneKey(aq.questId)] ?? 0) + 1;
          host.accountDirty = true;
        }
        host.notice(`Quest complete: ${q.offerLabel}!`, '#ffd700', 18, 'civic');
      }
    }
    // Generated ids never join completedQuests: fresh ids can't re-offer
    // anyway, and the set (journal + save) would only hoard raw posting ids
    // — the bounty_done counters are the record (the shared-stamp law).
    if (!posting) host.completedQuests.add(aq.questId);
    host.activeQuests.splice(idx, 1);
    host.markMetaDirty(hand); // THE QUEST HAND: the paid seat's build re-ships (the hero off a hosted world)
    if ((q?.reward.choices?.length || q?.reward.skillChoice || q?.reward.imbue) && !host.clientActionHook) {
      saveAccount(host.account);
      saveCharacter(host.characterWriter);
    }
  }

export function sceneQuestRewardItem(host:NativeSceneQuestHost,q: QuestDef,choiceId: string,preview?: NonNullable<QuestDef['reward']['choices']>[number]):ItemInstance | null {
    const key = `${q.id}:${choiceId}`;
    const c = preview ?? questRewardChoices(host.account, q).find(c => c.id === choiceId);
    if (!c) return null;
    const cached = host.questRewardItems.get(key);
    if (cached) return cached;
    if (c.skillId && q.reward.skillChoice) {
      const inst = withSeededRandom(host.manifest.seed ^ hashStr(key), () =>
        makeSkillGem(SKILLS[c.skillId!], q.reward.skillChoice!.level, q.reward.skillChoice!.rarity));
      const item = makeSkillGemItem(inst);
      host.questRewardItems.set(key, item);
      return item;
    }
    const item = forgeItem({ ilvl: 1, baseId: c.baseId, rarity: 'magic',
      affixes: c.affixes.map(id => ({ id })), quality: 1, sockets: 0, rng: () => 0.5 });
    if (!item) return null;
    item.name = c.name;
    host.questRewardItems.set(key, item);
    return item;
  }

export function sceneClaimQuestReward(host:NativeSceneQuestHost,questId: string,choiceId: string,seat: Seat = host.localSeat):boolean {
    // Authored quests belong to the host's journey; a guest cannot claim its pay.
    if ((seat !== host.localSeat && !host.localSeat.keeper) || host.clientActionHook || seat.actor.dead || seat.actor.downed) return false; // keeperSeat: the acting seat's own body
    return host.withQuestHand(seat, () => { // THE QUEST HAND: the giver by the claimant, the reward into its bag
      const aq = host.pendingTurnIns().find(e => e.questId === questId);
      const q = aq && host.questDefOf(aq.questId);
      if (!aq || !q || !questRewardChoices(host.account, q).some(c => c.id === choiceId)) return false;
      host.onQuestZoneCleared(aq, choiceId);
      return !host.activeQuests.includes(aq);
    });
  }

export function sceneQuestStanding(host:NativeSceneQuestHost,e: { questId: string; fieldDone: boolean }):QuestStanding {
    const p = host.bountyHands.find(h => h.id === e.questId);
    if (p) return host.handState(p);
    const q = QUESTS[e.questId];
    // THE QUEST HAND: the cargo is collected when the asking seat carries it.
    const collected = !q?.collect || host.questHand().meta.items.some(i => i.questId === e.questId && i.baseId === q.collect!.baseId);
    return e.fieldDone && collected && !!q?.turnIn ? 'ready' : 'afield';
  }

export function scenePendingTurnIns(host:NativeSceneQuestHost):{ questId: string; zoneId: string; fieldDone: boolean }[] {
    // questDefOf: generated bounty postings resolve too, but their giver is
    // the board sentinel no NPC carries — giverPresent excludes them, so
    // the board's own panel stays their whole counter (by construction).
    return host.activeQuests
      .filter(e => {
        const q = host.questDefOf(e.questId);
        return host.questStanding(e) === 'ready' && q?.turnIn && host.giverPresent(q.turnIn.giver) !== null;
      })
      .sort((a, b) => (host.questDefOf(a.questId)?.offerAtLevel ?? 0) - (host.questDefOf(b.questId)?.offerAtLevel ?? 0));
  }

export function sceneGiverPresent(host:NativeSceneQuestHost,g: string | string[]):Actor | null {
    for (const id of Array.isArray(g) ? g : [g]) {
      const a = host.getQuestGiver(id);
      if (a) return a;
    }
    return null;
  }

export function sceneGetQuestGiver(host:NativeSceneQuestHost,defId?: string):Actor | null {
    const p = host.questHand().actor; // THE QUEST HAND: the giver stands by the seat that asks (the hero off a hosted world)
    return host.actors.find(a =>
      (defId ? a.defId === defId && !a.dead : host.hasNpcRole(a, 'questgiver'))
      && !a.tag?.startsWith('quest_rescue:') // rescued prisoners transact after arriving home
      && dist(a.pos, p.pos) <= QUESTGIVER_RADIUS
      && host.dwellReachable(p.pos, a.pos, npcDwellReach('questgiver'), host.storyPair(p, a))) ?? null;
  }

export function sceneGrantVocation(host:NativeSceneQuestHost,vocId: string,seat: Seat = host.localSeat):boolean {
    const v = VOCATIONS[vocId];
    if (!v) return false;
    const m = seat.meta;
    if (m.vocations.includes(vocId)) return false;
    if (m.vocations.length >= VOCATION_CFG.maxPerCharacter) return false;
    m.vocations.push(vocId);
    m.allocated.add(vocationRootId(vocId)); // the crest is free — its NODES cost points
    host.withQuestHand(seat, () => host.questStamp(vocationLedgerKey(vocId))); // THE CHARACTER'S QUESTS: the granted seat's own chain
    // THE CHARACTER always receives the vocation (tree, points, title). The
    // ACCOUNT-wide unlock is meta-progression — an Undying character earns it
    // for itself alone (the user's canonical example of the sealed ledger).
    if (host.metaProgressionActive()) {
      host.account.ledger[vocationLedgerKey(vocId)] = 1;
      host.accountDirty = true; // main.ts persists — the unlock must survive a quit-without-dying
    }
    host.recalcSeat(seat);
    host.markMetaDirty(seat);
    host.text(vec(seat.actor.pos.x, seat.actor.pos.y - 40),
      `VOCATION: ${v.name}!`, v.color, 24);
    host.text(vec(seat.actor.pos.x, seat.actor.pos.y - 12),
      'Its tree awakens at the heart of the star (P).', '#d8d4c8', 13);
    return true;
  }

export function sceneQuestHand(host:Pick<NativeSceneQuestHost,'questSeat'|'actingSeat'|'localSeat'>):Seat {
    if (host.questSeat) return host.questSeat;
    const acting = host.actingSeat;
    return host.localSeat.keeper && acting && !acting.keeper && !acting.merc ? acting : host.localSeat;
  }

export function sceneWithQuestHand<T>(host:NativeSceneQuestHost,seat: Seat,fn: () => T):T {
    const was = host.questSeat;
    host.questSeat = seat;
    try { return fn(); } finally { host.questSeat = was; }
  }

export function sceneQuestLedger(host:NativeSceneQuestHost):QuestLedger {
    if (!host.localSeat?.keeper) return host.ownQuestLedger;
    if (host.questLedgerOverride) return host.questLedgerOverride;
    return host.questLedgerOf(host.questHand());
  }

export function sceneQuestStamp(host:NativeSceneQuestHost,key: string,n = 1):void {
    const hand = host.localSeat.keeper ? host.questHand() : null;
    bumpLedger(hand && !hand.keeper && !hand.merc ? host.questLedgerOf(hand).keys : host.ledger, key, n);
  }

export function sceneQuestRunLedger(host:NativeSceneQuestHost):Readonly<Record<string, number>> {
    const hand = host.localSeat.keeper ? host.questHand() : null;
    if (!hand || hand.keeper || hand.merc) return host.ledger;
    const keys = host.questLedgerOf(hand).keys;
    return Object.keys(keys).length ? { ...host.ledger, ...keys } : host.ledger;
  }

export function sceneCreditedHands(host:NativeSceneQuestHost,places: readonly Vec2[],to?: Seat | null):Seat[] {
    const r = COOP_SCALING.shareRadius;
    const out = to && !to.keeper && !to.merc ? [to] : [];
    for (const s of host.handSeats()) {
      if (out.includes(s)) continue;
      if (places.length && r > 0 && !places.some(p => dist(p, host.seatHero(s).pos) <= r)) continue;
      if (to && places.length && r > 0 && !host.sameParty(to, s)) continue;
      out.push(s);
    }
    return out;
  }

export function sceneHandSeats(host:NativeSceneQuestHost):Seat[] {
    if (!host.localSeat.keeper) return host.localHumanSeats();
    return host.seats.filter(s => !s.keeper && !s.merc && !s.actor.dead && !s.actor.downed);
  }

export function sceneNearestHand(host:NativeSceneQuestHost,places: readonly Vec2[]):Seat | null {
    let best: Seat | null = null, bd = Infinity;
    for (const s of host.handSeats()) {
      for (const p of places) {
        const d = dist(host.seatHero(s).pos, p);
        if (d < bd) { bd = d; best = s; }
      }
    }
    return best;
  }

export function sceneLocalHumanSeats(host:NativeSceneQuestHost):Seat[] { return host.seats.filter(s => s === host.localSeat || s.couch); }

export function sceneFailNote(host:NativeSceneQuestHost,a: Actor,key: string,msg: string):void {
    if (a !== host.player) {
      // THE ACTING SEAT: a refusal speaks to the seat that pressed, on that
      // seat's own throttle. A couch guest floats it over its own head on the
      // shared screen; every other player seat (a shard player, a co-op guest)
      // gets it as its own HUD row (SeatW.fn, net/seatView.ts), shipped to that
      // seat alone. Monsters, hired blades and the keeper stay silent.
      const seat = host.seatOf(a);
      if (!seat || seat.keeper || seat.merc) return;
      let noteAt = host.seatNoteAt.get(seat);
      if (!noteAt) host.seatNoteAt.set(seat, noteAt = new Map());
      if (host.time - (noteAt.get(key) ?? -9) < 1.4) return;
      noteAt.set(key, host.time);
      if (seat.couch) host.text(a.pos, msg, '#8a8678', 11);
      else host.seatHudOf(seat).fn = { text: msg, at: host.time };
      return;
    }
    const last = host.failNoteAt.get(key) ?? -9;
    if (host.time - last < 1.4) return;
    host.failNoteAt.set(key, host.time);
    host.text(a.pos, msg, '#8a8678', 11);
  }

export function sceneLearnQuestDirections(host:NativeSceneQuestHost,zoneId: string):void {
    for (const q of host.activeQuests) if (q.zoneId === zoneId) q.directionsKnown = true;
  }

export function scenePrepareOdysseyGround(host:NativeSceneQuestHost,faction: string,level: number,prepared: boolean,act: number):void {
    const z = host.zoneMap[`quest_${odysseyQuestId(faction, 'leader')}`];
    if (!z) return;
    const count = prepared ? 0 : ODYSSEY_CFG.escortPerAct[Math.min(3, act)];
    if (z.level === level && z.packs?.count[0] === count && z.packs?.size[0] === 1) return;
    z.level = level;
    z.packs = { count: [count, count], size: [1, 1], table: [{ id: odysseyFaction(faction).escort, weight: 1 }] };
    host.zoneMemory.delete(z.id);
    host.invalidateZonesSaveMemo();
  }

export function sceneEnrollOdysseyQuest(host:NativeSceneQuestHost,q: QuestDef,reveal: boolean):void {
    if (host.completedQuests.has(q.id) || host.activeQuests.some(a => a.questId === q.id)) return;
    host.acceptOdysseyCompatibleQuest(q, reveal);
  }

export function sceneAcceptOdysseyCompatibleQuest(host:NativeSceneQuestHost,q: QuestDef,reveal: boolean):void {
    if (!host.graphWorkAvailable() || q.geographies && !q.geographies.includes('zones')) return;
    const questSeed = (host.manifest.seed ^ hashStr(q.id)) >>> 0;
    q = { ...q, zone: resolveQuestZone(q, questSeed) };
    const town = host.zoneMap[START_ZONE];
    // ANCHOR 'accept': the projection starts from the zone the player STOOD IN
    // when accepting (a field-given chain unfolds around its site), else town.
    const from = q.zone.anchor === 'accept' ? (host.zoneMap[host.zone.id] ?? town) : town;
    // BAND PLACEMENT: the location is dictated by the LEVEL field — the zone lands where
    // the radial difficulty ≈ its level, so it sits in its proper band surrounded by
    // same-level zones (not a fixed cardinal distance that could put a lvl-20 arena one
    // step from town). Else the classic directional projection.
    const target = (q.zone.bandPlacement && typeof q.zone.level === 'number')
      ? host.findBandCoord(q.zone.level, questSeed)
      : projectCoord(from.map, q.zone.direction, q.zone.distance ?? 1);
    const zoneId = `quest_${q.id}`;
    // Existing enrollments never mint another approach. Explicit find-it arenas
    // keep their floating lifecycle; ordinary quests connect to local country.
    const anchor = (host.zoneMap[zoneId] || q.zone.floating) ? null : host.questLocalAnchor(target);
    // 'character' quests now obey the radial field at the quest's coord (the standard
    // ruleset) instead of flat-locking to the player's level; an authored number wins.
    const lvl = q.zone.level === 'character' ? host.eventLevel(target) : q.zone.level;
    // THE AUTHORED LANE (engine/authoredMaps.ts): a quest naming a hand-made
    // map spreads the map's own words FIRST — dress, exact size, recipe,
    // objective, pack/dress policies — and the quest's explicit fields win
    // over them (undefined fields defer to the map).
    const amap = q.zone.map ? authoredMapOf(q.zone.map) : undefined;
    if (q.zone.map && !amap) console.warn(`[quests] '${q.id}' names unregistered authored map '${q.zone.map}' — minting the tileset's own ground`);
    if (!host.zoneMap[zoneId]) {
      const over: ZoneSpec = {
        id: zoneId, name: q.zone.name, tileset: q.zone.tileset ?? amap?.tileset ?? 'field', level: lvl,
        objective: q.zone.objective, packsOverride: q.zone.packsOverride,
        // Quests carry a waypoint home by default; an arena can opt out (forceWaypoint:false).
        // An authored map keeps the doors it drew (its exits), else the classic one frontier.
        forceWaypoint: q.zone.forceWaypoint ?? true, forceFrontiers: amap ? (amap.exits?.length ?? 0) : 1, noFactionWar: true,
        // A set-piece arena forces its layout, ignores biome (special), seals waypoints.
        layoutType: q.zone.layoutType, wpExclusionRadius: q.zone.wpExclusionRadius, special: q.zone.special,
        // A floating quest mints DISCONNECTED (find-it); else force-connect as today.
        linkBack: !q.zone.floating, floating: q.zone.floating,
        // Keep the placement biased in the quest's compass direction.
        nudgeDir: projectCoord({ x: 0, y: 0 }, q.zone.direction),
        seed: questSeed,
        biomeFor: host.biomeFor,
      };
      const def = placeZoneAt(target, anchor, host.zoneMap, host.nextGenId++,
        amap ? authoredZoneSpec(amap, definedSpec(over)) : over);
      if (amap) sealAuthoredZone(def, amap);
      host.zoneMap[zoneId] = def;
      // A FLOATING zone is off-graph until the player explores to it: defer charting
      // its territory to connectFloatingZone on approach (charting it now would corrupt
      // the off-graph territory sim). A connected mint seeds its territory immediately.
      if (!q.zone.floating) host.sim.onNodeCharted(def, host.simView());
      if (anchor && !q.zone.floating) host.notarizeRoad(anchor, def);
    }
    host.activeQuests.push({ questId: q.id, zoneId, fieldDone: false, directionsKnown: reveal });
    if (reveal && q.zone.mapReveal === 'survey') host.revealQuestGround(zoneId);
    host.questStamp('quests_accepted'); // THE CHARACTER'S QUESTS
    // Name the bearing from the actual placement (band placement has no fixed compass).
    const ddx = target.x - from.map.x, ddy = target.y - from.map.y;
    const dirName = Math.abs(ddx) > Math.abs(ddy) ? (ddx > 0 ? 'east' : 'west') : (ddy > 0 ? 'south' : 'north');
    if (reveal) host.notice(`Quest: ${q.offerLabel} — head ${dirName}.`, '#c8a8e8', 16, 'civic');
  }

export function sceneQuestLocalAnchor(host:NativeSceneQuestHost,target: MapCoord):ZoneDef {
    const suitable = (z: ZoneDef): boolean => !z.concealed && !z.eventOwned
      && !z.id.startsWith('quest_') && !isRoadlessGateHub(z)
      && countRoads(z) < roadBudgetOf(z) && coordDist(z.map, target) <= APPROACH_RADIUS
      && !host.roadIsWet(target, z.map);
    const local = nearestNode(host.zoneMap, target, undefined, 'surface',
      z => suitable(z) && !host.visited.has(z.id))
      ?? nearestNode(host.zoneMap, target, undefined, 'surface', suitable);
    if (local) return local;
    const anchor = placeZoneAt(target, null, host.zoneMap, host.nextGenId++, {
      biomeFor: host.biomeFor, levelFor: host.levelFor, biomeDepthFor: host.biomeDepthFor,
      climateFor: host.climateFor, fieldBiome: true, floating: true, veiled: true,
      forceFrontiers: 3,
    });
    host.zoneMap[anchor.id] = anchor;
    host.sim.onNodeCharted(anchor, host.simView());
    host.forechartSounding(anchor.map);
    return anchor;
  }

export function sceneFindBandCoord(host:NativeSceneQuestHost,targetLevel: number,seed: number):{ x: number; y: number } {
    const town = host.zoneMap[START_ZONE].map;
    const ang = new Rng(seed).range(0, Math.PI * 2);
    // Use the radial BAND distance (the inverse of the difficulty floor) — not a step-
    // search for the first high reading, which would snap onto a rare local +5 SPIKE
    // far short of the band. The variance/spike noise then makes the exact coord read
    // ~target ± a few, which is correct: it's genuinely IN the level-20 band.
    const r = host.sim.levelField.radiusForLevel(targetLevel);
    // Pulled ashore: a radial band coord over open OCEAN would strand a quest/
    // caravan destination (and its whole waystation trail) at sea.
    return host.pullToLand({ x: town.x + Math.cos(ang) * r, y: town.y + Math.sin(ang) * r });
  }

export function sceneRevealQuestGround(host:NativeSceneQuestHost,zoneId: string):void {
    const zone = host.zoneMap[zoneId];
    if (!zone) return;
    zone.veiled = false;
    host.surveyed.add(zoneId);
    host.refreshExitLabels();
    host.invalidateZonesSaveMemo();
  }

export function sceneGraphWorkAvailable(host:NativeSceneQuestHost):boolean { return !host.massRuntime && !host.massAway; }
