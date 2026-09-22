import type { World } from './world';
import type { QuestDef } from '../quests/types';
import { MONSTERS } from '../data/monsters';
import { QUESTS } from '../quests/defs';

/** Authored rescue objectives use ordinary NPC bodies, dialogue and account
 * receipts. A return reward, a random kill or a developer-spawned boss cannot
 * free a prisoner: only the owning quest's completed ground can do so. */
export class QuestRescues {
  constructor(private readonly w: World) {}

  /** Upgrade old saves from actual quest receipts, never level/crafting totals. */
  reconcile(): void {
    const w = this.w;
    if (w.clientActionHook || w.scene || !w.metaProgressionActive()) return;
    for (const q of Object.values(QUESTS)) {
      const r = q.rescue;
      if (!r) continue;
      const cleared = w.activeQuests.some(a => a.questId === q.id && a.fieldDone && w.completedObjectives.has(a.zoneId));
      if (!w.account.ledger[r.ledger] && !(r.legacyLedger && w.account.ledger[r.legacyLedger] > 0)
        && !w.completedQuests.has(q.id) && !cleared) continue;
      if (!w.account.ledger[r.ledger] || r.features.some(f => !w.account.features.has(f))) {
        w.account.ledger[r.ledger] = 1;
        for (const feature of r.features) w.account.features.add(feature);
        w.accountDirty = true;
      }
    }
  }

  free(q: QuestDef): void {
    const w = this.w, r = q.rescue;
    if (!r || w.clientActionHook || w.scene) return;
    const aq = w.activeQuests.find(a => a.questId === q.id && a.fieldDone);
    if (!aq || !w.completedObjectives.has(aq.zoneId)) return;
    if (w.account.ledger[r.ledger] || w.ledger[r.ledger]) return;
    // Presence receipts are deliberately idempotent under the death merge.
    w.ledger[r.ledger] = 1;
    if (w.metaProgressionActive()) {
      w.account.ledger[r.ledger] = 1;
      for (const feature of r.features) w.account.features.add(feature);
      w.accountDirty = true;
    }
    w.markMetaDirty(w.localSeat);
    w.notice(r.message, '#c7adeb', 17, 'civic');
  }

  update(): void {
    const w = this.w;
    if (w.clientActionHook || w.scene || !w.player || w.player.dead || w.player.downed) return;
    const aq = w.activeQuests.find(a => a.zoneId === w.zone.id && w.questDefOf(a.questId)?.rescue);
    const q = aq && w.questDefOf(aq.questId), r = q?.rescue;
    if (!aq || !q || !r) return;
    if (aq.fieldDone) this.free(q); // a saved field completion heals the same receipt
    const freed = !!(w.account.ledger[r.ledger] || w.ledger[r.ledger]);
    // A resident is never recaptured in a later life.
    if (freed && !w.ledger[r.ledger]) return;
    const tag = `quest_rescue:${q.id}`;
    let npc = w.actors.find(a => a.tag === tag && !a.dead);
    if (!npc) {
      npc = w.createMonster(r.npc, 1, 'player');
      const bossId = w.zone.objective.kind === 'boss' ? w.zone.objective.id : undefined;
      const boss = w.actors.find(a => a.defId === bossId);
      const anchor = boss?.pos ?? w.player.pos;
      npc.pos = w.findFreeSpot({ x: anchor.x + r.offset.x, y: anchor.y + r.offset.y }, npc.radius);
      npc.tag = tag; npc.fromZoneGen = false; w.actors.push(npc);
    }
    npc.name = freed ? MONSTERS[r.npc].name : r.captiveName;
    npc.look = freed ? r.freeLook : r.captiveLook;
  }
}
