/** Exact native vessel setup algorithms; area ownership is supplied separately. */
import type {World,Seat} from './world';
import {findBagGem} from './gemitems';
import {LEDGER_FLASK_LESSON} from '../meta/account';
import {newQuestLedger,type QuestLedgerSave} from './questLedger';
import {sanitizeBountyBoard} from '../meta/worldstate';
import type {BountyPosting} from '../data/bountyboard';
import {massQuestDestination} from '../worldmass/quests';
import {restoreQuestImbues} from './questImbue';
import {QUESTS} from '../quests/defs';
const MIREILLE_GIFT_SKILLS = ['life_flask', 'mana_flask'];
const MIREILLE_GIFT_LEDGER = 'mireille_flasks_given';
const MIREILLE_FILL_LEDGER = LEDGER_FLASK_LESSON;
const MIREILLE_LESSON_LEDGER = 'mireille_lesson_lived';
export type NativeServerVesselHost=Pick<World,'dealVeteranFlasks'|'localSeat'|'massRuntime'|'zoneMap'|'withQuestHand'|'questDefOf'|'handState'>&{seatQuests:Pick<World['seatQuests'],'set'>;veteranFlaskDeals:Pick<World['veteranFlaskDeals'],'has'|'add'>};
export function sceneDealTravellerFlasks(nativeHost:Pick<NativeServerVesselHost,'dealVeteranFlasks'|'veteranFlaskDeals'>, seat: Seat, ledger: Record<string, number>):boolean {
    if (ledger[MIREILLE_GIFT_LEDGER] || ledger[MIREILLE_FILL_LEDGER] || ledger[MIREILLE_LESSON_LEDGER]) return false;
    if (MIREILLE_GIFT_SKILLS.some(sid => seat.meta.knownSkills.has(sid) || findBagGem(seat.meta.items, 'skill', sid))) return false;
    nativeHost.dealVeteranFlasks(seat, true);
    if (!nativeHost.veteranFlaskDeals.has(seat)) return false;
    ledger[MIREILLE_GIFT_LEDGER] = 1;
    ledger[MIREILLE_FILL_LEDGER] = 1;
    return true;
  }
export function sceneAdoptQuestLedger(nativeHost:Omit<NativeServerVesselHost,'dealVeteranFlasks'|'veteranFlaskDeals'>, seat: Seat, saved: QuestLedgerSave | undefined):void {
    if (!nativeHost.localSeat.keeper || seat.keeper) return;
    const l = newQuestLedger();
    nativeHost.seatQuests.set(seat.id, l);
    if (!saved) return;
    // A country posting (the Unbroken Wilds' board) stands while its run stands (the
    // claim tier: a well-formed vessel is believed); every other posting re-validates.
    const run = nativeHost.massRuntime?.generator.run.runId;
    const country = (p: BountyPosting): boolean => !!p?.massBounty;
    const ours = (ps: BountyPosting[] | undefined): BountyPosting[] =>
      run === undefined ? [] : (ps ?? []).filter(p => country(p) && p.massBounty!.run === run).map(p => structuredClone(p));
    const bb = sanitizeBountyBoard({ armedBeat: -1, offers: (saved.offers ?? []).filter(p => !country(p)),
      hands: (saved.hands ?? []).filter(p => !country(p)), boards: saved.boards }, nativeHost.zoneMap);
    for (const [k, v] of Object.entries(saved.boards ?? {})) {
      if (v && Number.isFinite(v.armedBeat)) l.boards[k] = { armedBeat: Math.floor(v.armedBeat), refreshSeq: Math.max(0, Math.floor(v.refreshSeq ?? 0)) };
    }
    l.offers = [...(bb?.offers ?? []), ...ours(saved.offers)];
    l.hands = [...(bb?.hands ?? []), ...ours(saved.hands)]
      .map(h => ({ ...h, holder: seat.id, ...(seat.meta.charId ? { holderChar: seat.meta.charId } : {}) }));
    nativeHost.withQuestHand(seat, () => {
      l.active = saved.active.filter(q => nativeHost.questDefOf(q.questId)
        && (q.placeId === undefined ? !!nativeHost.zoneMap[q.zoneId]
          : !!nativeHost.massRuntime && massQuestDestination(nativeHost.massRuntime, q.questId)?.id === q.placeId))
        .map(q => ({ ...q }));
      for (const h of l.hands) if (!l.active.some(e => e.questId === h.id)) l.active.push({ questId: h.id, zoneId: h.zoneId, fieldDone: nativeHost.handState(h) !== 'afield' });
    });
    l.completed = new Set(saved.completed);
    l.imbues = restoreQuestImbues(saved.imbues).filter(r => !!QUESTS[r.questId]?.reward.imbue && l.completed.has(r.questId));
    l.keys = { ...(saved.keys ?? {}) };
    l.leads = [...new Set(saved.leads ?? [])];
  }
