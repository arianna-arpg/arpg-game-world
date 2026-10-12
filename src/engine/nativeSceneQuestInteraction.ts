/** Exact native quest interaction bodies; explicit character writer projection. */
import {dist,randInt} from '../core/math';
import {MASS_ZONE} from '../worldmass/preset';
import {describeItem,itemGridSize} from './itemgen';
import {ITEM_RARITIES} from './items';
import {MONSTERS} from '../data/monsters';
import {CLASSES} from '../data/classes';
import {VOCATIONS,vocationStepKey} from '../data/vocations';
import {npcDwellReach} from '../data/transit';
import {expertiseRank} from './crafting';
import {ITEM_AFFIXES} from '../data/itemaffixes';
import {QUEST_GIVER_IDS,ZONE_QUEST_GIVER_IDS,QUESTS} from '../quests/defs';
import {massQuestDestination,massQuestTarget} from '../worldmass/quests';
import {RELIQUARY_LESSON} from '../quests/reliquary';
import type {QuestDef,QuestGateCtx} from '../quests/types';
import {imbuedItem,imbueOptions} from './questImbue';
import {questRewardChoices} from './questRewardChoices';
import {QUEST_CATEGORY_CAPS,DEFAULT_QUEST_CATEGORY} from '../quests/types';
import {Rng} from '../core/rng';
import {FEATURE} from '../meta/account';
import {saveCharacter} from '../meta/character';
import {type SavedQuestEntry} from '../meta/worldstate';
import {hashStr} from './nativeSceneConfig';
import type {World,Seat} from './world';
import {QUESTGIVER_RADIUS} from './nativeSceneQuests';
export {QUESTGIVER_RADIUS} from './nativeSceneQuests';
export const QUESTGIVER_DWELL = 0.9;
export interface NativeSceneQuestInteractionHost {
 time:World['time'];
 acceptOdysseyCompatibleQuest:World["acceptOdysseyCompatibleQuest"];
 acceptQuest:World["acceptQuest"];
 acceptableQuests:World["acceptableQuests"];
 account:World["account"];
 actingSeat:World["actingSeat"];
 activeCategoryCounts:World["activeCategoryCounts"];
 activeQuests:World["activeQuests"];
 actors:World["actors"];
 bagItem:World["bagItem"];
 charDirty:World["charDirty"];
 clientActionHook:World["clientActionHook"];
 completedQuests:World["completedQuests"];
 dwellReachable:World["dwellReachable"];
 eligibleQuestCandidates:World["eligibleQuestCandidates"];
 ensureQuestCargo:World["ensureQuestCargo"];
 getQuestGiver:World["getQuestGiver"];
 giverPresent:World["giverPresent"];
 graphWorkAvailable:World["graphWorkAvailable"];
 handSeats:World["handSeats"];
 heroKnown:World["heroKnown"];
 isVocationChoice:World["isVocationChoice"];
 journalDirty:World["journalDirty"];
 localSeat:World["localSeat"];
 manifest:World["manifest"];
 markMetaDirty:World["markMetaDirty"];
 massRuntime:World["massRuntime"];
 meta:World["meta"];
 nearAnyQuestGiver:World["nearAnyQuestGiver"];
 nearQuestGiver:World["nearQuestGiver"];
 netJournal:World["netJournal"];
 nextAcceptableQuest:World["nextAcceptableQuest"];
 notice:World["notice"];
 odyssey:Pick<World['odyssey'],'hasLocalLeads'|'localLeads'>;
 onQuestZoneCleared:World["onQuestZoneCleared"];
 pendingTurnIns:World["pendingTurnIns"];
 player:World["player"];
 playerIdle:World["playerIdle"];
 questDefOf:World["questDefOf"];
 questGateCtx:World["questGateCtx"];
 questGiverDwell:World["questGiverDwell"];
 questGiverDwells:World["questGiverDwells"];
 questGiverStep:World["questGiverStep"];
 questHand:World["questHand"];
 questImbues:World["questImbues"];
 questLedgerOf:World["questLedgerOf"];
 questOfferChoices:World["questOfferChoices"];
 questOfferLevel:World["questOfferLevel"];
 questRewardItem:World["questRewardItem"];
 questRewardOffers:World["questRewardOffers"];
 questRewardShown:World["questRewardShown"];
 questRunLedger:World["questRunLedger"];
 questStamp:World["questStamp"];
 reliquaryLesson:World["reliquaryLesson"];
 seatIdle:World["seatIdle"];
 settleHeroMassQuests:World["settleHeroMassQuests"];
 storyPair:World["storyPair"];
 vocationChoiceOffers:World["vocationChoiceOffers"];
 vocationEngaged:World["vocationEngaged"];
 vocationOfferDeclined:World["vocationOfferDeclined"];
 vocationOfferRequested:World["vocationOfferRequested"];
 withQuestHand:World["withQuestHand"];
 characterWriter:World;
}
export function sceneNearQuestGiver(host:NativeSceneQuestInteractionHost):boolean { return host.getQuestGiver() !== null; }

export function sceneNearAnyQuestGiver(host:NativeSceneQuestInteractionHost):boolean {
    const givers = host.massRuntime ? QUEST_GIVER_IDS : ZONE_QUEST_GIVER_IDS;
    const p = host.questHand().actor; // THE QUEST HAND
    return host.actors.some(a => !a.dead && a.defId && givers.has(a.defId)
      && dist(a.pos, p.pos) <= QUESTGIVER_RADIUS
      && host.dwellReachable(p.pos, a.pos, npcDwellReach('questgiver'), host.storyPair(p, a)));
  }

export function sceneQuestGiverPrompt(host:NativeSceneQuestInteractionHost):string | null {
    if (!host.nearAnyQuestGiver()) return null;
    if (host.questImbues.some(r => host.giverPresent(QUESTS[r.questId]?.turnIn?.giver ?? []) !== null)) return 'Your imbue awaits. Show me the magic piece you would like me to work on.';
    if (host.questRewardOffers().length) return 'Your keepsake awaits. Choose what you will carry.';
    if (host.reliquaryLesson()) return 'A keepsake needs a home. Open your inventory and seat your charm in the Reliquary.';
    if (host.graphWorkAvailable() && host.nearQuestGiver() && host.odyssey.hasLocalLeads()) return 'Linger — I can mark the Odyssey leaders and their supply operations.';
    if (host.pendingTurnIns().length) return 'Linger — a bounty is yours to claim.';
    if (host.questOfferChoices().length) return 'I have work if you want it.';
    if (host.nextAcceptableQuest()) return host.heroKnown()
      ? 'Linger, {name} — I have work for you…'
      : 'Linger, and I have work for you…';
    if (host.vocationChoiceOffers().length) return host.heroKnown()
      ? 'Linger — a CALLING awaits you, {name}.'
      : 'Linger — a CALLING awaits you.';
    if (host.activeQuests.some(q => !host.massRuntime || q.placeId)) return 'Your hunts await out in the wilds.';
    const upcoming = host.eligibleQuestCandidates().filter(q => q.offerLevelHint && host.questOfferLevel(q) > host.player.level)
      .sort((a,b) => host.questOfferLevel(a) - host.questOfferLevel(b) || a.id.localeCompare(b.id))[0];
    if (upcoming) return upcoming.offerLevelHint!.replaceAll('{level}', String(host.questOfferLevel(upcoming)));
    if (!host.graphWorkAvailable()) return 'No hunts are posted for this country yet.';
    return 'No work for you yet, traveller.';
  }

export function sceneActiveCategoryCounts(host:NativeSceneQuestInteractionHost):Record<string, number> {
    const c: Record<string, number> = {};
    for (const e of host.activeQuests) {
      const cat = host.questDefOf(e.questId)?.category ?? DEFAULT_QUEST_CATEGORY;
      c[cat] = (c[cat] ?? 0) + 1;
    }
    return c;
  }

export function sceneQuestGateCtx(host:NativeSceneQuestInteractionHost):QuestGateCtx {
    const m = host.questHand().meta; // THE QUEST HAND
    return {
      features: host.account.features,
      classId: m.classDef.id,
      vocations: m.vocations,
      runLedger: host.questRunLedger(), // THE CHARACTER'S QUESTS: the hand's own quest keys over the run ledger
      accountLedger: host.account.ledger,
    };
  }

export function sceneQuestOfferLevel(host:NativeSceneQuestInteractionHost,q: QuestDef):number {
    const range = q.offerLevelRange;
    return range ? range[0] + Math.floor(new Rng((host.manifest.seed ^ hashStr(`offer:${q.id}`)) >>> 0).next()
      * (range[1] - range[0] + 1)) : q.offerAtLevel;
  }

export function sceneAcceptableQuests(host:NativeSceneQuestInteractionHost):QuestDef[] {
    const level = host.questHand().actor.level; // THE QUEST HAND: work opens at the asking seat's level
    return host.eligibleQuestCandidates().filter(q => level >= host.questOfferLevel(q));
  }

export function sceneEligibleQuestCandidates(host:NativeSceneQuestInteractionHost):QuestDef[] {
    const counts = host.activeCategoryCounts();
    const gateCtx = host.questGateCtx();
    return Object.values(QUESTS).filter(q => {
      if (q.geographies && !q.geographies.includes(host.massRuntime ? 'continuous' : 'zones')) return false;
      if (host.massRuntime && !massQuestDestination(host.massRuntime, q.id)) return false;
      if (host.completedQuests.has(q.id)) return false;
      if (host.activeQuests.some(e => e.questId === q.id)) return false;
      if (host.giverPresent(q.giver) === null) return false; // one of its offering NPCs must be present
      if (q.requiresLedger
        && (gateCtx.runLedger[q.requiresLedger] ?? 0) < 1 // THE CHARACTER'S QUESTS: the hand's own keys (questGateCtx)
        && (host.account.ledger[q.requiresLedger] ?? 0) < 1) return false;
      if (q.requiresQuests?.some(id => !host.completedQuests.has(id))) return false;
      if (q.gate && !q.gate(gateCtx)) return false;
      const cat = q.category ?? DEFAULT_QUEST_CATEGORY;
      const cap = QUEST_CATEGORY_CAPS[cat];
      if (cap != null && (counts[cat] ?? 0) >= cap) return false;
      return true;
    });
  }

export function sceneVocationEngaged(host:NativeSceneQuestInteractionHost,vocId: string):boolean {
    const v = VOCATIONS[vocId];
    if (!v) return false;
    return v.quest.steps.some((_, i) => (host.questRunLedger()[vocationStepKey(vocId, i + 1)] ?? 0) >= 1); // THE CHARACTER'S QUESTS
  }

export function sceneIsVocationChoice(host:NativeSceneQuestInteractionHost,q: QuestDef):boolean {
    return q.vocation !== undefined && !host.vocationEngaged(q.vocation);
  }

export function sceneVocationChoiceOffers(host:NativeSceneQuestInteractionHost):QuestDef[] {
    return host.acceptableQuests().filter(q => host.isVocationChoice(q));
  }

export function sceneNextAcceptableQuest(host:NativeSceneQuestInteractionHost):QuestDef | null {
    if (host.massRuntime?.config.settlement?.quests?.acceptance === 'journal') return null;
    const avail = host.acceptableQuests().filter(q => !host.isVocationChoice(q));
    if (!avail.length) return null;
    for (let i = avail.length - 1; i > 0; i--) { const j = randInt(0, i); [avail[i], avail[j]] = [avail[j], avail[i]]; }
    avail.sort((a, b) => a.offerAtLevel - b.offerAtLevel); // stable → equal-level ties keep shuffled order
    return avail[0];
  }

export function sceneUpdateQuestGiver(host:NativeSceneQuestInteractionHost,dt: number):void {
    host.ensureQuestCargo();
    // THE QUEST HAND (a hosted world): every standing player lingers at the giver for
    // itself, on its own clock; the act and its pay are its own (the keeper never asks).
    if (host.localSeat.keeper) {
      for (const seat of host.handSeats()) host.questGiverStep(seat, dt);
      // THE CHARACTER'S QUESTS on the Unbroken Wilds: every hero's own country quests settle
      // at their places (the runtime's own settle walks the run's one ledger, the keeper's).
      if (host.massRuntime) host.settleHeroMassQuests();
      return;
    }
    if (!host.nearAnyQuestGiver()) host.questRewardShown = null;
    if (host.player.dead || host.player.downed || !host.playerIdle()) {
      host.questGiverDwell = 0;
      // Stepping away re-arms the choice menu (a decline lasts one visit).
      host.vocationOfferDeclined = false;
      return;
    }
    const turnIns = host.pendingTurnIns();
    const next = turnIns.length ? null : host.nextAcceptableQuest();
    const choices = (!turnIns.length && !next && !host.vocationOfferDeclined)
      ? host.vocationChoiceOffers() : [];
    const odysseyLeads = host.graphWorkAvailable() && host.odyssey.hasLocalLeads() && host.nearQuestGiver();
    if (!turnIns.length && !next && !choices.length && !odysseyLeads) { host.questGiverDwell = 0; return; }
    host.questGiverDwell += dt;
    if (host.questGiverDwell < QUESTGIVER_DWELL) return;
    host.questGiverDwell = 0;
    if (odysseyLeads) host.odyssey.localLeads();
    if (turnIns.length) host.onQuestZoneCleared(turnIns[0]);
    else if (next) host.acceptQuest(next);
    else if (choices.length) host.vocationOfferRequested = true; // main loop opens the menu (once per dwell)
  }

export function sceneQuestGiverStep(host:NativeSceneQuestInteractionHost,seat: Seat,dt: number):void {
    host.withQuestHand(seat, () => {
      if (!host.seatIdle(seat) || !host.nearAnyQuestGiver()) { host.questGiverDwells.delete(seat); return; }
      const turnIns = host.pendingTurnIns();
      const next = turnIns.length ? null : host.nextAcceptableQuest();
      const leads = host.graphWorkAvailable() && host.odyssey.hasLocalLeads() && host.nearQuestGiver();
      if (!turnIns.length && !next && !leads) { host.questGiverDwells.delete(seat); return; }
      const t = (host.questGiverDwells.get(seat) ?? 0) + dt;
      if (t < QUESTGIVER_DWELL) { host.questGiverDwells.set(seat, t); return; }
      host.questGiverDwells.delete(seat);
      const was = host.actingSeat;
      host.actingSeat = seat; // THE ACTING SEAT: the linger is this seat's act (its party hears the news)
      try {
        if (leads) host.odyssey.localLeads();
        if (turnIns.length) host.onQuestZoneCleared(turnIns[0]);
        else if (next) host.acceptQuest(next);
      } finally { host.actingSeat = was; }
      host.journalDirty.add(seat.id); // THE JOURNAL ROW: the act re-ships at once
    });
  }

export function sceneQuestOfferChoices(host:NativeSceneQuestInteractionHost):import('../net/journalWire').JournalOfferW[] {
    if (host.clientActionHook) return host.netJournal?.offers ?? []; // THE JOURNAL ROW: the host's judgment for this seat
    const mass = host.massRuntime;
    const hand = host.questHand().actor; // THE QUEST HAND
    if (mass?.config.settlement?.quests?.acceptance !== 'journal'
      || hand.dead || hand.downed) return [];
    return host.acceptableQuests().filter(q => !host.isVocationChoice(q))
      .sort((a,b) => host.questOfferLevel(a) - host.questOfferLevel(b) || a.id.localeCompare(b.id))
      .map(q => {
        const place = massQuestDestination(mass, q.id)!;
        const giver = host.giverPresent(q.giver)!;
        return {
          questId: q.id, label: q.offerLabel, giver: MONSTERS[giver.defId!]?.name ?? giver.name,
          target: massQuestTarget(mass, {questId:q.id,zoneId:MASS_ZONE,placeId:place.id,fieldDone:false}, hand.pos)!,
          returnTo: q.turnIn ? (Array.isArray(q.turnIn.giver) ? q.turnIn.giver : [q.turnIn.giver])
            .map(id => MONSTERS[id]?.name ?? id).join(' or ') : null,
          xp: q.reward.xp ?? 0, passivePoints: q.reward.passivePoints ?? 0,
          rewards: q.reward.choices?.map(c => c.name) ?? [],
        };
      });
  }

export function sceneAcceptQuestOffer(host:NativeSceneQuestInteractionHost,questId: string,seat: Seat = host.localSeat):boolean {
    if (seat !== host.localSeat && !host.localSeat.keeper) return false; // keeperSeat: on a shard any seat may take a contract
    return host.withQuestHand(seat, () => { // THE QUEST HAND: the giver, the gates and the level are the taker's
      if (!host.questOfferChoices().some(q => q.questId === questId)) return false;
      host.acceptQuest(QUESTS[questId]);
      return host.activeQuests.some(q => q.questId === questId);
    });
  }

export function sceneAcceptVocationQuest(host:NativeSceneQuestInteractionHost,questId: string,seat: Seat = host.localSeat):boolean {
    const q = QUESTS[questId];
    if (!q || q.vocation === undefined) return false;
    // THE QUEST HAND (a hosted world): the chain opens to the asking seat's gates and level.
    return host.withQuestHand(host.localSeat.keeper ? seat : host.localSeat, () => {
      if (!host.acceptableQuests().some(x => x.id === questId)) return false;
      host.acceptQuest(q);
      return true;
    });
  }

export function sceneVocationMenuOffers(host:NativeSceneQuestInteractionHost):{
    questId: string; vocationId: string; name: string; blurb: string; color: string;
    className: string; ownClass: boolean; steps: number; offerLabel: string;
    secret: boolean; flavor?: string;
  }[] {
    return host.vocationChoiceOffers().map(q => {
      const v = VOCATIONS[q.vocation!];
      return {
        questId: q.id, vocationId: v.id, name: v.name, blurb: v.blurb, color: v.color,
        className: CLASSES.find(c => c.id === v.classId)?.name ?? v.classId,
        ownClass: v.classId === host.meta.classDef.id,
        steps: v.quest.steps.length, offerLabel: q.offerLabel,
        secret: v.secret !== undefined, flavor: v.secret?.offerFlavor,
      };
    });
  }

export function sceneDeclineVocationOffer(host:NativeSceneQuestInteractionHost):void { host.vocationOfferDeclined = true; }

export function sceneAcceptQuest(host:NativeSceneQuestInteractionHost,q: QuestDef):void {
    if (host.massRuntime) {
      const place = massQuestDestination(host.massRuntime, q.id);
      if (!place || host.completedQuests.has(q.id) || host.activeQuests.some(e => e.questId === q.id)) return;
      const entry: SavedQuestEntry = { questId: q.id, zoneId: MASS_ZONE, placeId: place.id,
        fieldDone: false, directionsKnown: true };
      host.activeQuests.push(entry);
      host.questStamp('quests_accepted'); host.charDirty = true; // THE CHARACTER'S QUESTS
      host.notice('Quest: ' + q.offerLabel + ' · ' + massQuestTarget(host.massRuntime, entry, host.questHand().actor.pos), '#c8a8e8', 16, 'civic'); // THE QUEST HAND
      return;
    }
    if (q.geographies && !q.geographies.includes('zones')) return;
    host.acceptOdysseyCompatibleQuest(q, true);
  }

export function sceneQuestRewardOffers(host:NativeSceneQuestInteractionHost):{ questId: string; label: string; prompt: string; xp: number;
    choices: (NonNullable<QuestDef['reward']['choices']>[number] & { lines: string[]; footprint: string })[] }[] {
    if (host.clientActionHook && host.netJournal) return host.netJournal.rewards; // THE JOURNAL ROW
    return host.pendingTurnIns().flatMap(aq => {
      const q = host.questDefOf(aq.questId);
      return q && (q.reward.choices?.length || q.reward.skillChoice) ? [{ questId: q.id, label: q.offerLabel,
        prompt: q.reward.choicePrompt ?? 'Choose one item as your quest reward.', xp: q.reward.xp ?? 0,
        choices: questRewardChoices(host.account, q).map(c => {
          const item = host.questRewardItem(q, c.id, c);
          const size = item ? itemGridSize(item) : { w: 1, h: 1 };
          const rewardDescription = item ? describeItem(item) : undefined;
          return { ...c, lines: rewardDescription ? [...rewardDescription.defense.map(l => l.text),
            ...rewardDescription.implicit, ...rewardDescription.affix.map(l => l.text), ...rewardDescription.unique] : [],
            footprint: `${size.w} × ${size.h}` };
        }) }] : [];
    });
  }

export function sceneQuestImbueOffers(host:NativeSceneQuestInteractionHost):import('../net/journalWire').JournalImbueW[] {
    if (host.clientActionHook && host.netJournal) return host.netJournal.imbues; // THE JOURNAL ROW
    const items = host.questHand().meta.items; // THE QUEST HAND: the asking seat's own magic pieces
    return host.questImbues.map(reward => {
      const q = QUESTS[reward.questId];
      const near = !!q && host.giverPresent(q.turnIn?.giver ?? q.giver) !== null;
      const givers = q?.turnIn?.giver ?? q?.giver;
      const giverId = Array.isArray(givers) ? givers[0] : givers;
      const giver = giverId ? MONSTERS[giverId]?.name ?? 'The giver' : 'The giver';
      return { questId: reward.questId, level: reward.level, near, giver,
        prompt: q?.reward.imbue?.prompt ?? 'Choose a magic piece to make finer.',
        items: items.filter(item => item.rarity === 'magic' && !item.gem && !item.mem).map(item => ({
          uid: item.uid, name: item.name, current: describeItem(item).affix.map(l => l.text),
          options: imbueOptions(reward, item).map(a => ({ id: a.id,
            lines: describeItem({ ...item, affixes: [a] }).affix.map(l => l.text),
            unstudied: expertiseRank(host.account.craftLore, ITEM_AFFIXES[a.id].family) < 1,
          })),
        })),
      };
    });
  }

export function sceneClaimQuestImbue(host:NativeSceneQuestInteractionHost,questId: string,uid: number,affixId: string,seat: Seat = host.localSeat):boolean {
    if ((seat !== host.localSeat && !host.localSeat.keeper) || host.clientActionHook || seat.actor.dead || seat.actor.downed) return false; // keeperSeat
    const book = host.questLedgerOf(seat); // THE CHARACTER'S QUESTS: the claimant's own imbues (the run's one off a hosted world)
    const reward = book.imbues.find(r => r.questId === questId), q = QUESTS[questId];
    const giver = q && host.withQuestHand(seat, () => host.giverPresent(q.turnIn?.giver ?? q.giver)); // THE QUEST HAND: the giver by the claimant
    if (!reward || !q || !giver) return false;
    const item = host.bagItem(seat, uid);
    const affix = item && imbueOptions(reward, item).find(a => a.id === affixId);
    if (!item || !affix) return false;
    const result = imbuedItem(item, affix);
    seat.meta.items = seat.meta.items.map(i => i.uid === uid ? result : i);
    book.imbues = book.imbues.filter(r => r !== reward);
    host.markMetaDirty(seat);
    host.notice(`${result.name} — ${giver.name ?? 'the giver'}’s promise is kept.`, ITEM_RARITIES.rare.color, 16, 'civic');
    saveCharacter(host.characterWriter);
    return true;
  }

export function sceneReliquaryLesson(host:Pick<NativeSceneQuestInteractionHost,'account'>):boolean {
    return host.account.features.has(FEATURE.RELIQUARY)
      && (host.account.ledger[RELIQUARY_LESSON] ?? 0) < 1;
  }

export const DWELL_IDLE_GRACE = 0.15;
export function sceneSeatIdle(host:NativeSceneQuestInteractionHost,seat: Seat):boolean {
    return host.time - seat.lastActedAt >= DWELL_IDLE_GRACE
      && seat.actor.isQuiescent();
  }
export function scenePlayerIdle(host:NativeSceneQuestInteractionHost):boolean {
    return host.seatIdle(host.localSeat);
  }
