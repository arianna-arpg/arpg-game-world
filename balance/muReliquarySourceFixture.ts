import assert from 'node:assert/strict';

/** Reverse only the intentional Mu rule while checking immutable extraction
 * receipts. Living-actor parity still executes the current core and owners;
 * suppressed actors have separate behavior checks against the new contract. */
export function beforeMuReliquary(text: string, lane: 'fold' | 'xp'): string {
  const before = lane === 'fold'
    ? "if (def.id === 'reliquary' && m.relicEnabled === false) continue;"
    : 'amount *= reliquaryExperience(m.containers.reliquary ?? [], m.relicEnabled !== false);';
  const after = lane === 'fold'
    ? "if (def.id === 'reliquary' && !relicPowerActive(p, m.relicEnabled)) continue;"
    : 'amount *= reliquaryExperience(m.containers.reliquary ?? [], relicPowerActive(p, m.relicEnabled));';
  assert.equal(text.split(after).length, 2, 'one exact Mu Reliquary ' + lane + ' rule');
  return text.replace(after, before);
}
