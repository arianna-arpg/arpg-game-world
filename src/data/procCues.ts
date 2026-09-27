/** Material grammar for stored and consumed payloads. Presentation only. */
export interface ProcCueSpec { profile?: string; color?: string; }
export interface ProcCueStyle {
  shape: 'flame' | 'shard' | 'bolt' | 'blade' | 'bead' | 'rune';
  color: string; life: number; size: number;
  /** World-space payout afterimage, which can outlive the victim. */
  pop?: string;
}
export const PROC_CUE_STYLES: Record<string, ProcCueStyle> = {
  physical: { shape: 'blade', color: '#dec69b', life: 0.45, size: 4 },
  fire: { shape: 'flame', color: '#ff9955', life: 0.5, size: 4.5 },
  cold: { shape: 'shard', color: '#a8e4fa', life: 0.5, size: 4.5 },
  lightning: { shape: 'bolt', color: '#ffe776', life: 0.4, size: 4.5 },
  chaos: { shape: 'bead', color: '#ba92db', life: 0.55, size: 4 },
  blood: { shape: 'bead', color: '#ed6676', life: 0.5, size: 4 },
  mend: { shape: 'bead', color: '#9ae4b2', life: 0.55, size: 4 },
  rune: { shape: 'rune', color: '#cfb3eb', life: 0.5, size: 4.5 },
};
export const PROC_CUE_CFG = {
  bodyRows: 3, bodyPips: 6, pulses: 4,
  bodyPad: 12, popPad: 12, rowGap: 9, travel: 17, alpha: 0.85,
  outline: '#151822', width: 1.5,
};
