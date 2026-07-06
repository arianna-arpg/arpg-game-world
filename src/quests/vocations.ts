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
  VOCATION_CFG, VOCATION_LIST, vocationLedgerKey, vocationStepKey,
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
    // Own-class chains are always offered; foreign chains need the account unlock.
    if (ctx.classId !== v.classId && !vocationUnlockedOnAccount(ctx.accountLedger, v.id)) return false;
    // Steps 2+ require the PREVIOUS step completed THIS RUN (per-character chains).
    if (stepIndex > 0 && (ctx.runLedger[vocationStepKey(v.id, stepIndex)] ?? 0) < 1) return false;
    return true;
  };
}

function stepQuest(v: VocationDef, stepIndex: number): QuestDef {
  const step = v.quest.steps[stepIndex];
  const last = stepIndex === v.quest.steps.length - 1;
  const stepNo = stepIndex + 1;
  return {
    id: vocationStepQuestId(v.id, stepNo),
    giver: VOCATION_CFG.giver,
    offerLabel: step.offerLabel,
    category: 'vocation',
    vocation: v.id,
    offerAtLevel: v.quest.offerAtLevel ?? VOCATION_CFG.offerAtLevel,
    gate: stepGate(v, stepIndex),
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
      giver: VOCATION_CFG.giver,
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
