/** Presentation only. Deadlines, protected sides and attack reach come from
 * the mechanic; changing a profile never changes a plan or a hit test. */
export interface EncounterCueSpec { style: string; color?: string; }
export interface EncounterCueStyle {
  gesture: 'cover' | 'split' | 'pincer' | 'withdraw' | 'gather' | 'focus';
  extent: number; width: number; lean: number; pieces: number;
}
export const ENCOUNTER_CUE_STYLES: Record<string, EncounterCueStyle> = {
  cover: { gesture: 'cover', extent: 1.5, width: 2.5, lean: -0.3, pieces: 3 },
  split: { gesture: 'split', extent: 1.7, width: 2, lean: -0.35, pieces: 2 },
  pincer: { gesture: 'pincer', extent: 1.8, width: 2.3, lean: -0.45, pieces: 2 },
  withdraw: { gesture: 'withdraw', extent: 1.5, width: 2, lean: 0.25, pieces: 2 },
  gather: { gesture: 'gather', extent: 1.55, width: 2.2, lean: -0.4, pieces: 5 },
  focus: { gesture: 'focus', extent: 1.8, width: 2.4, lean: -0.4, pieces: 3 },
};
export const WARNING_CUE_CFG = {
  bash: { width: 2.2, fill: 0.07, rim: 0.48, pullback: 0.8, shieldPull: 0.32, ribs: 3 },
  encounter: { warningAlpha: 0.8, commitAlpha: 0.35, recoverAlpha: 0.45,
    leaderScale: 1.35, recoverLean: 0.22, recoverColor: '#a6b7bf' },
};
export function encounterCueStyle(id: string | undefined): EncounterCueStyle {
  return id !== undefined && Object.prototype.hasOwnProperty.call(ENCOUNTER_CUE_STYLES,id)
    ? ENCOUNTER_CUE_STYLES[id] : ENCOUNTER_CUE_STYLES.gather;
}
