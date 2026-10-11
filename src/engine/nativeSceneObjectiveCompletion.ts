/** Exact original native completion, XP, quest detection and text bodies over an explicit retained owner. */
import type {World,Seat} from './world';
import {dist,rand,vec,type Vec2} from '../core/math';
import {COOP_SCALING} from '../data/coop';
import {PROGRESSION} from '../data/classes';
import {objectiveRewardXp} from '../data/objectiveRewards';
import {saveAccountDurable} from '../meta/persistence';
import {reliquaryExperience} from './accountReliquary';
import {bumpLedger} from '../packages/ledger';
import {CLASS_LEVEL_MILESTONES,classLevelLedgerKey,reachedLevelKey} from '../meta/account';
import {catalogClassLevelMilestones,catalogLevelMilestones} from '../meta/unlocks';
const MIREILLE_XP_BUFF_MULT = 0.05;
export interface NativeSceneObjectiveCompletionHost {
 objectiveDone:World['objectiveDone'];
 zone:World['zone'];
 metaProgressionActive:World['metaProgressionActive'];
 account:World['account'];
 questOnZone:World['questOnZone'];
 completedObjectives:World['completedObjectives'];
 text:World['text'];
 player:World['player'];
 onQuestZoneFieldCleared:World['onQuestZoneFieldCleared'];
 grantXp:World['grantXp'];
 localSeat:World['localSeat'];
 objectivePlaces:World['objectivePlaces'];
 spires:World['spires'];
 rifts:World['rifts'];
 pyres:World['pyres'];
 digs:World['digs'];
 actors:World['actors'];
 objectiveFallAt:World['objectiveFallAt'];
 actingSeat:World['actingSeat'];
 seatHero:World['seatHero'];
 seats:World['seats'];
 sameParty:World['sameParty'];
 grantSeatXp:World['grantSeatXp'];
 mireilleSeatBuff:World['mireilleSeatBuff'];
 time:World['time'];
 mireilleXpBuff:World['mireilleXpBuff'];
 markMetaDirty:World['markMetaDirty'];
 recalcSeat:World['recalcSeat'];
 resyncMercenary:World['resyncMercenary'];
 flashes:World['flashes'];
 accountSeat:World['accountSeat'];
 ledger:World['ledger'];
 activeQuests:World['activeQuests'];
 questLedgerOf:World['questLedgerOf'];
 texts:World['texts'];
}

export function sceneCompleteObjective(owner:NativeSceneObjectiveCompletionHost,label: string): void {
    if (owner.objectiveDone) return;
    const visibleHold = ['beacon', 'rifts', 'pyres', 'unearth', 'procession'].includes(owner.zone.objective.kind);
    owner.objectiveDone = true; // per-load latch: unseals this zone's exits
    // ONE-SHOT UBER: record an account-scoped kill so the boss is forever dead.
    // Meta-progression — a sealed (Undying) character's trophy is its own; the
    // account never learns of it (and the uber re-spawns for mortal successors).
    const obj = owner.zone.objective;
    if (obj.kind === 'boss' && obj.uber?.scope === 'account' && owner.metaProgressionActive()) {
      owner.account.ledger[obj.uber.key ?? `uber:${obj.id}`] = 1;
      saveAccountDurable(owner.account); // a forever-dead uber must survive a permadeath wipe
    }
    // The QUEST hook is INDEPENDENT of the one-time bounty latch: an accepted quest
    // zone advances the chain + pays its reward on clear even if the generic bounty
    // was already claimed (onQuestZoneCleared is idempotent — it removes the entry).
    // Quest state never survives a resume (serializeCharacter strips quest_ ids from
    // completedObjectives; activeQuests/completedQuests are per-run, re-offered from
    // the account ledger), so this guards only a WITHIN-run re-clear of an
    // already-cleared quest zone (the 'already cleared' branch below).
    const isQuestZone = owner.questOnZone(owner.zone.id); // THE CHARACTER'S QUESTS: any ledger here holding this ground
    // One-time REWARD: a re-cleared zone pays no bounty (it still unseals above so
    // the player can leave). First clear pays the bounty.
    if (owner.completedObjectives.has(owner.zone.id)) {
      if (!visibleHold) owner.text(vec(owner.player.pos.x, owner.player.pos.y - 50),
        `${label} (already cleared)`, '#9a9a9a', 16);
      else if (obj.kind === 'procession') rand(-10, 10); // retired native procession completion floater
      if (isQuestZone) owner.onQuestZoneFieldCleared(owner.zone.id);
      return;
    }
    owner.completedObjectives.add(owner.zone.id);
    const bonus = objectiveRewardXp(owner.zone.level);
    owner.grantXp(bonus, owner.localSeat.keeper ? owner.objectivePlaces() : undefined); // XP BY PLACE: where the objective was done (hosted worlds)
    if (!visibleHold) owner.text(vec(owner.player.pos.x, owner.player.pos.y - 50),
      `${label} +${bonus} xp`, '#ffd700', 18);
    else if (obj.kind === 'procession') rand(-10, 10); // retired native procession completion floater
    if (isQuestZone) owner.onQuestZoneFieldCleared(owner.zone.id);
  }

export function sceneObjectivePlaces(owner:NativeSceneObjectiveCompletionHost): Vec2[] {
    const out: Vec2[] = [];
    for (const f of [...owner.spires, ...owner.rifts, ...owner.pyres, ...owner.digs]) out.push(f.pos);
    const o = owner.zone.objective;
    if (o.kind === 'boss') for (const a of owner.actors) if (a.defId === o.id) out.push(a.pos);
    const fall = owner.objectiveFallAt;
    if (!out.length && fall?.zone === owner.zone.id) out.push(fall.pos);
    return out;
  }

export function sceneGrantXp(owner:NativeSceneObjectiveCompletionHost,amount: number, at?: Vec2 | readonly Vec2[], to?: Seat): void {
    // XP BY PLACE (THE COUNTERS AND THE JOURNAL): a grant may name several places (an
    // objective's fixtures). On a hosted world a grant naming none pays the acting seat's
    // party near the act (a meta act, a credited kill's handler), so a player AFK at the
    // hearth never levels off the field; with no act and no place it pays as before.
    if (at === undefined && owner.localSeat.keeper && COOP_SCALING.shareRadius > 0) {
      const acting = owner.actingSeat;
      if (acting && !acting.keeper && !acting.merc) { at = owner.seatHero(acting).pos; to ??= acting; }
    }
    const places = at === undefined ? null : 'x' in at ? [at] : at.length ? at : null;
    for (const seat of owner.seats) {
      if (seat.actor.dead) continue;
      // THE NEAR LAW (keeperSeat lane, data/coop.ts shareRadius): a kill with a
      // place pays only the seats within reach of it; radius 0 = everyone. THE
      // KILLER'S DUE (her ruling 2026-10-08: the single-player law until parties):
      // with a radius set and a killing seat known, only that seat is paid.
      if (places && COOP_SCALING.shareRadius > 0 && to && !owner.sameParty(to, seat)) continue; // keeperSeat: the killer's due — its party within reach (card 23)
      if (places && COOP_SCALING.shareRadius > 0 && !places.some(p => dist(p, owner.seatHero(seat).pos) <= COOP_SCALING.shareRadius)) continue; // SOVEREIGNTY: census — pay is apportioned by reach, never a touch (keeperSeat lane)
      // A hired blade never earns its own levels — its power is NORMALIZED to
      // the patron (MERC_CFG.scale), re-synced on the patron's level-ups.
      if (seat.merc || seat.keeper) continue; // keeperSeat: the warden never levels
      owner.grantSeatXp(seat, amount);
    }
  }

export function sceneGrantSeatXp(owner:NativeSceneObjectiveCompletionHost,seat: Seat, amount: number): void {
    const m = seat.meta;
    const p = owner.seatHero(seat);
    // Mireille's Traveller's Rest blessing boosts experience while it lasts (a hosted
    // world's blessing is each seat's own: THE COUNTERS AND THE JOURNAL).
    if (owner.localSeat.keeper ? (owner.mireilleSeatBuff.get(seat) ?? 0) > owner.time : owner.mireilleXpBuff > 0) amount = Math.round(amount * (1 + MIREILLE_XP_BUFF_MULT));
    amount *= reliquaryExperience(m.containers.reliquary ?? [], m.relicEnabled !== false);
    m.xp += amount;
    // Any XP change re-replicates this seat's meta (xp bar + level + points). The
    // dirty Set coalesces, so a kill-storm still ships at most one meta/snapshot.
    owner.markMetaDirty(seat);
    const levelUpCueStart = p.level;
    while (m.xp >= m.xpNeeded) {
      m.xp -= m.xpNeeded;
      p.level++;
      m.xpNeeded = PROGRESSION.xpForLevel(p.level);
      // The level-up beat grants the PASSIVE point only (the skill-point
      // lane retired with M-ECON — skill levels are Ability-Essence-fed).
      m.passivePoints += PROGRESSION.passivePointsPerLevel;
      owner.recalcSeat(seat);
      // A DOWNED seat banks XP and levels, but must NOT auto-heal off 0 — only an
      // ally's revive restores it (to REVIVE_LIFE_FRAC). Mirrors the regen guard.
      if (!p.downed) p.fillResources();
      // Preserve the retired LEVEL UP! floater's random draw per level.
      rand(-10, 10);
      // LIVE PARITY: the patron levelled — re-normalize the hired blade.
      if (seat === owner.localSeat) owner.resyncMercenary();
    }
    // One physical level-up burst per grant, including multi-level rewards.
    if (p.level > levelUpCueStart) owner.flashes.push({ pos: { ...seat.actor.pos }, radius: 80, color: '#ffd700', life: .65, maxLife: .65, fx: 'sparkle' });
    // Reaching character level 5 surfaces the Quest Package in the Vault next run.
    // Account-level progression belongs to THIS MACHINE's account — the local
    // hero always, and a couch guest too (both characters are the account's
    // own; remote peers and mercs never). The ledger flag merges in on death.
    if (owner.accountSeat(seat) && p.level >= 5 && !owner.ledger.reached_level_5) {
      bumpLedger(owner.ledger, 'reached_level_5');
    }
    // Reaching the level cap (100) surfaces the META-META global event-frequency
    // crank in the Vault. Same once-per-run flag shape as reached_level_5 (merges
    // in on death; the unlock predicate tests >= 1).
    if (owner.accountSeat(seat) && p.level >= 100 && !owner.ledger.reached_level_100) {
      bumpLedger(owner.ledger, 'reached_level_100');
    }
    // Every 10-level milestone — the Caravan tiers (and future unlocks) gate on these.
    // Same once-per-run, account-seat shape; merges into account.ledger on death.
    if (owner.accountSeat(seat)) {
      for (let m10 = 10; m10 <= 90; m10 += 10) {
        const key = reachedLevelKey(m10);
        if (p.level >= m10 && !owner.ledger[key]) bumpLedger(owner.ledger, key);
      }
      // THE MILESTONE DERIVATION (meta/unlocks.ts catalogLevelMilestones):
      // every level the unlock catalog's own gates ask about stamps here —
      // authoring a level gate IS registering its signal, so a gate whose
      // key never fires (the old reached_level_15 hole) is structurally
      // impossible. Stamps ALL milestones ≤ the current level, so a
      // character already past one back-fills it on their next level-up.
      for (const ms of catalogLevelMilestones()) {
        const key = reachedLevelKey(ms);
        if (p.level >= ms && !owner.ledger[key]) bumpLedger(owner.ledger, key);
      }
    }
    // PER-CLASS milestones — THE OBJECTIVE WEB's play thresholds and THE
    // MASTERY LADDER's rungs (account.ts CLASS_LEVEL_MILESTONES → unlocks.ts
    // ClassUnlockSpec objectives / CLASS_TIERS): playing a class deep is how
    // the account earns that class's kin and its own mastery. The standing
    // list PLUS every level the catalog asks of THIS class (the class-
    // milestone derivation — authoring a classLevel gate registers its
    // stamp). Same once-per-run, account-seat, merge-on-death shape as the
    // sweep above.
    if (owner.accountSeat(seat)) {
      const levels = new Set([...CLASS_LEVEL_MILESTONES, ...catalogClassLevelMilestones(m.classDef.id)]);
      for (const ms of levels) {
        const key = classLevelLedgerKey(m.classDef.id, ms);
        if (p.level >= ms && !owner.ledger[key]) bumpLedger(owner.ledger, key);
      }
    }
  }

export function sceneQuestOnZone(owner:NativeSceneObjectiveCompletionHost,zoneId: string): boolean {
    if (!owner.localSeat.keeper) return owner.activeQuests.some(e => e.zoneId === zoneId);
    return owner.seats.some(s => !s.keeper && !s.merc && owner.questLedgerOf(s).active.some(e => e.zoneId === zoneId));
  }

export function sceneText(owner:NativeSceneObjectiveCompletionHost,at: Vec2, text: string, color: string, size = 13, kind?: string, life = 1, yieldToCombat = false, dropUid?: number): void {
    owner.texts.push({
      pos: vec(at.x + rand(-10, 10), at.y - 16), text, color,
      life, maxLife: life, size, kind, ...(yieldToCombat ? { yieldToCombat: true } : {}),
      ...(dropUid === undefined ? {} : { dropUid }),
    });
  }
