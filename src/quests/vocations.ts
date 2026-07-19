// ---------------------------------------------------------------------------
// VOCATION QUEST GENERATION — VocationDefs → ordinary QuestDefs (pure data).
//
// Each vocation's authored steps become a sequential chain on the standard
// quest machinery. The RULES live in the generated gates:
//
//   AVAILABILITY (every step): the character's OWN class's vocation is always
//   offered; any OTHER vocation only once the ACCOUNT has unlocked it (a past
//   character completed its chain — vocationLedgerKey). A character that has
//   reached VOCATION_CFG.maxPerCharacter granted vocations is offered nothing.
//
//   CHAIN (steps 2+): the previous step's key must be in the RUN ledger — chain
//   progress is strictly per-character (deliberately NOT the requiresLedger
//   run-OR-account check, which would let a dead character's half-finished
//   chain skip a fresh character straight to step 2).
//
//   COMPLETION (final step): reward.grantVocation hands the character the
//   vocation (root crest allocated, account unlock key written) — from then on
//   EVERY future character may take this chain, whatever their class.
//
// Steps pay vocation points (reward.vocationPoints); the shared caps/colors of
// category 'vocation' route fresh chains through the giver's CHOICE MENU
// instead of dwell auto-accept (see world.updateQuestGiver).
// ---------------------------------------------------------------------------

import {
  VOCATION_CFG, VOCATION_LIST, vocationDiscoveryKey, vocationLedgerKey, vocationStepKey,
  vocationUnlockedOnAccount, type VocationDef,
} from '../data/vocations';
import type { QuestDef, QuestGateCtx } from './types';

/** The generated quest id for a vocation's step N (1-based). */
export function vocationStepQuestId(vocId: string, step: number): string {
  return `voc_${vocId}_${step}`;
}

function stepGate(v: VocationDef, stepIndex: number): (ctx: QuestGateCtx) => boolean {
  return (ctx) => {
    // Already ascended into this vocation → its chain is spent for this character.
    if (ctx.vocations.includes(v.id)) return false;
    // Per-character cap: a fully-vocationed character is offered no more chains.
    if (ctx.vocations.length >= VOCATION_CFG.maxPerCharacter) return false;
    const unlocked = vocationUnlockedOnAccount(ctx.accountLedger, v.id);
    if (v.secret) {
      // SECRET chains exist only for those who have FOUND them. Pre-unlock:
      // the calling must be received THIS RUN (the site's discovery key) and —
      // with classLockedDiscovery (default) — only the home class hears it.
      // Post-unlock: 'menu' behaves like any earned vocation; 'site' still
      // demands the pilgrimage every run.
      const discovered = (ctx.runLedger[vocationDiscoveryKey(v.id)] ?? 0) >= 1;
      if (!unlocked) {
        if (!discovered) return false;
        if ((v.secret.classLockedDiscovery ?? true) && ctx.classId !== v.classId) return false;
        return stepIndex === 0 || (ctx.runLedger[vocationStepKey(v.id, stepIndex)] ?? 0) >= 1;
      }
      if ((v.secret.unlockedOffer ?? 'menu') === 'site' && !discovered) return false;
    } else if (ctx.classId !== v.classId && !unlocked) {
      // Ordinary chains: own class always; foreign classes need the unlock.
      return false;
    }
    // Steps 2+ require the PREVIOUS step completed THIS RUN (per-character chains).
    if (stepIndex > 0 && (ctx.runLedger[vocationStepKey(v.id, stepIndex)] ?? 0) < 1) return false;
    return true;
  };
}

function stepQuest(v: VocationDef, stepIndex: number): QuestDef {
  const step = v.quest.steps[stepIndex];
  const last = stepIndex === v.quest.steps.length - 1;
  const stepNo = stepIndex + 1;
  // A secret chain is offered (and turned in) at its SITE first, with the
  // quartermaster as the home fallback — the discovery gate keeps the town
  // silent until the calling has actually been received.
  const givers = v.secret ? [v.secret.site.npc, VOCATION_CFG.giver] : VOCATION_CFG.giver;
  return {
    id: vocationStepQuestId(v.id, stepNo),
    giver: givers,
    offerLabel: step.offerLabel,
    category: 'vocation',
    vocation: v.id,
    offerAtLevel: v.quest.offerAtLevel ?? VOCATION_CFG.offerAtLevel,
    gate: stepGate(v, stepIndex),
    // A step may additionally gate on a DEED (run-OR-account — the standard
    // QuestDef.requiresLedger check): the Harborwarden opens for siege-
    // breakers, not passers-by.
    ...(step.requiresLedger ? { requiresLedger: step.requiresLedger } : {}),
    zone: step.zone,
    reward: {
      xp: step.xp,
      gems: step.gems,
      vocationPoints: step.vocationPoints ?? VOCATION_CFG.pointsPerStep,
      // The final step ASCENDS the character. The account-wide unlock key is
      // written by grantVocation itself (plus the run ledger merge on death).
      grantVocation: last ? v.id : undefined,
      ledger: { [vocationStepKey(v.id, stepNo)]: 1, quests_completed: 1 },
    },
    turnIn: {
      giver: givers,
      prompt: step.turnInPrompt
        ?? `The deed is done — return to the quartermaster (${v.name}, step ${stepNo}).`,
    },
    next: last ? undefined : vocationStepQuestId(v.id, stepNo + 1),
  };
}

/** Every vocation chain, flattened to QuestDefs — spread into the QUESTS
 *  registry (quests/defs.ts). Purely derived: a new VocationDef needs nothing
 *  here. The account unlock key each chain ultimately writes is
 *  `vocationLedgerKey(id)`; exported alongside for UI/debug convenience. */
export function vocationQuestDefs(): QuestDef[] {
  return VOCATION_LIST.flatMap(v => v.quest.steps.map((_, i) => stepQuest(v, i)));
}

export { vocationLedgerKey };
