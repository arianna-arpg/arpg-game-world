import { bestiaryEligible, bestiaryKey } from '../data/bestiary';
import { CODEX_CFG } from '../data/codex';
import { MONSTERS } from '../data/monsters';
import type { Account } from '../meta/account';
import { perceiveTarget } from './perception';
import { sameStory } from './tiers';
import type { World } from './world';

export const codexSightingKey = (id: string): string => `codex:sighted:${id}`;
/** Old kill records are already proof of an encounter; no save migration is needed. */
export function codexEncountered(a: Account, id: string): boolean {
  return (a.ledger[codexSightingKey(id)] ?? 0) > 0 || (a.ledger[bestiaryKey(id)] ?? 0) > 0;
}

/** Host/account-owned observations. Never grant kill credit, research or unlocks.
 * Uses the shared senses/LOS gates; distant, invisible and other-floor bodies teach nothing. */
export class CodexSightings {
  private remaining = 0;
  update(w: World, dt: number): void {
    if (w.clientActionHook || w.scene || !w.metaProgressionActive() || !w.localSeat?.actor) return;
    this.remaining -= dt;
    if (this.remaining > 0) return;
    this.remaining = CODEX_CFG.sightingsEverySec;
    const hero = w.localSeat.actor;
    if (hero.dead || hero.downed) return;
    for (const a of w.actors) {
      if (a.team !== 'enemy' || a.noBounty || !a.defId || !bestiaryEligible(MONSTERS[a.defId])
        || codexEncountered(w.account, a.defId) || !sameStory(hero, a)) continue;
      if (!perceiveTarget(hero, a, w, { perception: CODEX_CFG.perception })) continue;
      w.account.ledger[codexSightingKey(a.defId)] = 1;
      w.accountDirty = true;
    }
  }
}
