/** Exact native hiring bodies. Physical creation/admission belongs to the actual party owner. */
import type {World,Seat} from './world';
import {vec} from '../core/math';
import {CLASSES} from '../data/classes';
import type {Attributes} from './stats';
import {classStartNode} from '../data/passives';
import {MERC_TEMPLATE_BY_ID,type MercTemplateDef} from '../data/mercenaries';
import {MERC_CFG,type MercSnapshot,engageMerc} from '../meta/mercs';
import {CLASS_KIT_RARITY,SKILL_RARITIES} from './skills';
import {ESSENCES,essenceUnitsForValue} from '../data/essences';
export interface NativeSceneSeatHiringHost {
 account:World["account"];
 accountDirty:World["accountDirty"];
 charDirty:World["charDirty"];
 clientActionHook:World["clientActionHook"];
 grantEssence:World["grantEssence"];
 hiredMercs:World["hiredMercs"];
 localSeat:World["localSeat"];
 markMetaDirty:World["markMetaDirty"];
 mercHireCap:World["mercHireCap"];
 mercHireCost:World["mercHireCost"];
 mercOfferBlocked:World["mercOfferBlocked"];
 mercOutpost:World["mercOutpost"];
 mercTargetLevel:World["mercTargetLevel"];
 meta:World["meta"];
 mortalValueOf:World["mortalValueOf"];
 player:World["player"];
 spawnMercSeat:World["spawnMercSeat"];
 spendEssence:World["spendEssence"];
 spendMortalValue:World["spendMortalValue"];
 templateSnapshot:World["templateSnapshot"];
 text:World["text"];
 saveCharacter:()=>void;
}
export function sceneTemplateSnapshot(t: MercTemplateDef, targetLevel: number):MercSnapshot {
    const classDef = CLASSES.find(c => c.id === t.classId);
    const bar = [...(t.bar ?? classDef?.bar ?? [])];
    const cap = MERC_CFG.scale.gemLevelCap(targetLevel);
    return {
      classId: t.classId,
      level: targetLevel,
      baseAttrs: { ...(classDef?.attributes ?? { }) } as Attributes,
      allocated: [classStartNode(t.classId)],
      vocations: [],
      // The class kit AS the class kit: tier + sockets read the same
      // CLASS_KIT_RARITY dial a fresh hero's starters mint at.
      knownSkills: [...new Set(bar.filter((s): s is string => !!s))].map(sid => ({
        skillId: sid, level: cap, rarity: CLASS_KIT_RARITY,
        sockets: new Array<null>(SKILL_RARITIES[CLASS_KIT_RARITY].sockets).fill(null),
      })),
      bar,
      equipped: {},
    };
  }

export function sceneHireMercenary(nativeHost:Pick<NativeSceneSeatHiringHost,"account"|"accountDirty"|"charDirty"|"clientActionHook"|"grantEssence"|"hiredMercs"|"localSeat"|"markMetaDirty"|"mercHireCap"|"mercHireCost"|"mercOfferBlocked"|"mercOutpost"|"mercTargetLevel"|"meta"|"mortalValueOf"|"player"|"spawnMercSeat"|"spendEssence"|"spendMortalValue"|"templateSnapshot"|"text"|"saveCharacter">, index: number, seat: Seat = nativeHost.localSeat):boolean {
    const post = nativeHost.mercOutpost;
    const offer = post?.offers[index];
    if (!post || !offer) return false;
    // THE LIVE-AVAILABILITY GATE: a locked sheet keeps its veteran rows
    // while their retiree rides with another patron — the row refuses with
    // the same words the panel shows (one check serves both faces).
    const blocked = nativeHost.mercOfferBlocked(offer);
    if (blocked) {
      nativeHost.text(vec(nativeHost.player.pos.x, nativeHost.player.pos.y - 30), blocked, '#c8b048', 13);
      return false;
    }
    if (nativeHost.hiredMercs.length >= nativeHost.mercHireCap()) {
      nativeHost.text(vec(nativeHost.player.pos.x, nativeHost.player.pos.y - 30),
        nativeHost.mercHireCap() > 1 ? 'Your company is full.' : 'One retainer at a time.', '#c8b048', 13);
      return false;
    }
    const cost = nativeHost.mercHireCost(offer);
    // THE VETERAN'S COIN (MERC_CFG.retiredTint): a player-made blade is
    // priced in ONE fine-grained essence — the ME cost converts to units at
    // the mortal exchange (essenceUnitsForValue) and only that tint pays.
    // Template sellswords keep the mixed-wallet price.
    const tint = offer.kind === 'retired' ? MERC_CFG.retiredTint : null;
    const tintUnits = tint ? essenceUnitsForValue(tint, cost) : 0;
    if (tint) {
      if ((seat.meta.essences[tint] ?? 0) < tintUnits) {
        nativeHost.text(vec(nativeHost.player.pos.x, nativeHost.player.pos.y - 30),
          `A veteran's contract is inked in ${ESSENCES[tint].label}: ${tintUnits}× wanted.`, '#c8b048', 13);
        return false;
      }
    } else if (nativeHost.mortalValueOf(seat) < cost) {
      nativeHost.text(vec(nativeHost.player.pos.x, nativeHost.player.pos.y - 30),
        `The captain wants essence worth ${cost}.`, '#c8b048', 13);
      return false;
    }
    const snapshot = offer.kind === 'retired'
      ? nativeHost.account.mercRoster.find(r => r.mercId === offer.refId)?.snapshot
      : nativeHost.templateSnapshot(MERC_TEMPLATE_BY_ID[offer.refId], nativeHost.mercTargetLevel());
    if (!snapshot) return false;
    const ref = offer.kind === 'retired' ? { mercId: offer.refId } : { templateId: offer.refId };
    // Pay first (the wallet was checked this same frame — this cannot
    // refuse), then field; a refused field hands EXACT change back — the
    // tinted lane refunds its own tint, the wallet lane coarse (the change
    // law makes both value-perfect).
    if (tint) {
      if (!nativeHost.spendEssence(seat, { essence: tint, count: tintUnits }, 'merc:hire')) return false;
      nativeHost.markMetaDirty(seat);
      if (seat === nativeHost.localSeat && !nativeHost.clientActionHook) nativeHost.saveCharacter();
    } else if (!nativeHost.spendMortalValue(seat, cost, 'merc:hire')) {
      return false;
    }
    const mercSeat = nativeHost.spawnMercSeat(snapshot, offer.name, ref);
    if (!mercSeat) {
      nativeHost.grantEssence(seat, tint
        ? { essence: tint, count: tintUnits }
        : { essence: 'coarse', count: cost });
      return false;
    }
    if (offer.kind === 'retired') engageMerc(nativeHost.account, offer.refId, nativeHost.meta.charId);
    nativeHost.accountDirty = true;
    nativeHost.hiredMercs.push({ seat: mercSeat, name: offer.name, snapshot, ...ref });
    nativeHost.charDirty = true;   // the contracts ride the character save
    post.offers.splice(index, 1);
    nativeHost.text(vec(nativeHost.player.pos.x, nativeHost.player.pos.y - 34),
      `${offer.name} takes your coin.`, '#c8b048', 15);
    return true;
  }
