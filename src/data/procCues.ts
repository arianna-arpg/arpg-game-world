import { PASSIVE_STAT_SYMBOLS } from './passiveNodeSymbols';
import type { IconSubject } from '../render/skillIconArt';

/** Material grammar for stored and consumed payloads. Presentation only. */
export interface ProcCueSpec { profile?: string; color?: string; subject?:IconSubject; }
const RECEIPT_MARKS: Readonly<Record<string,IconSubject>> = {
  parasite_sip:'fangs', guarded_heart:'heart', second_wind:'wind', executioners_rhythm:'blades',
  bastion_fortify:'shield', communion_tithe:'chalice', votive_spark:'sun', desperate_ward:'helm',
  unbound:'wings', misers_whisper:'eye', mourning_bell_toll:'bell', faultline_return:'rock',
  cinder_answer:'flame', cinder_conductor:'capacitor', relic_guard_refrain:'note',
  relic_wayfarer:'boot', relic_widows_wick:'candle',
};
export function procReceiptMark(id:string): IconSubject | undefined {
  return PASSIVE_STAT_SYMBOLS['proc_'+id]?.icon ?? (Object.hasOwn(RECEIPT_MARKS,id) ? RECEIPT_MARKS[id] : undefined);
}
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
  clock: { ink:'#fff2cc', inset:.085, width:1.6, radius:.092 },
};
