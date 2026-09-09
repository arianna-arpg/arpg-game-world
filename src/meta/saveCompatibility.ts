// Update policy, independent of release numbers. Bump only for breaking changes.
// A run bump resets all characters/worlds; an account bump also resets progression.
export const SAVE_COMPATIBILITY = {
  account: 1,
  run: 2,
  reason: 'World geography and exploration have changed.',
} as const;

export interface CharacterCompatibility {
  schemaVersion: number;
  accountVersion: number;
}
export function isCurrentCharacterSave(raw: unknown): boolean {
  const s = raw as Partial<CharacterCompatibility> | null;
  return !!s && s.schemaVersion === SAVE_COMPATIBILITY.run && s.accountVersion === SAVE_COMPATIBILITY.account;
}

let resetScope: 'account' | 'run' | undefined;
/** Called by boot loaders only after choosing the authoritative stored copy. */
export function noteSaveReset(scope: 'account' | 'run'): void {
  if (resetScope !== 'account') resetScope = scope;
}
export function saveResetNotice(): string | undefined {
  if (!resetScope) return undefined;
  return resetScope === 'account'
    ? 'This update resets account progress and saved characters. ' + SAVE_COMPATIBILITY.reason
    : 'This update resets saved characters and worlds. Your account progress is kept. ' + SAVE_COMPATIBILITY.reason;
}
