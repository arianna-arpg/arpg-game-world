import { supportMeters, type SupportMark } from '../../engine/supportPresentation';
import type { BuffRow } from '../../engine/buffPresentation';
import type { ProcCueRow } from '../../engine/procCues';
import { CHARGE_DEFS } from '../../engine/charges';
import { instanceChargeCost, instanceMeta, type SkillInstance } from '../../engine/skills';
import type { BuffIconRect } from './buffIcons';
import { VIS_CFG } from './visConfig';
import { supportCounterLayout } from './supportCounterLayout';

export interface BuffMagazine { buff: BuffRow; bank: ProcCueRow; rect: BuffIconRect; }

/** One visual home per positive effect. Placement reads the live skill bar
 * every draw, so swapping a skill while rounds remain moves its one indicator. */
export function buffAddendum(rows: readonly BuffRow[], cues: readonly ProcCueRow[],
  slots: readonly (SkillInstance | null)[], left: number, barY: number, slotWidth: number, gap: number, supports:readonly (readonly SupportMark[])[] = []) {
  const strip: BuffRow[] = [];
  const mounted:{slot:number; buff:BuffRow; bank:ProcCueRow}[]=[];
  const stored = new Map(cues.filter(c => c.phase === 'stored' && !c.id.startsWith('rune:')).map(c => [c.id,c]));
  const legacyBanks = new Map(stored);
  for (const buff of rows) {
    if (buff.kind === 'charge' && CHARGE_DEFS[buff.id]?.hud === 'slot'
      && (slots.some(inst => inst && instanceChargeCost(inst)?.charge === buff.id) || supports.some(ms=>ms.some(m=>m.meter && m.fuelBank===buff.id)))) continue;
    const bank = buff.kind === 'buff' ? stored.get(buff.id) : undefined;
    if (bank) legacyBanks.delete(buff.id);
    const sourceId = buff.source?.id;
    const slot = bank && buff.skillMagazine && sourceId ? slots.findIndex(inst => inst?.def.id === sourceId) : -1;
    if (!bank || slot < 0) { strip.push(buff); continue; }
    mounted.push({slot,buff,bank});
  }
  const common={strip,stored,legacyBanks:[...legacyBanks.values()]};
  if(!mounted.length && !supports.some(marks=>marks.some(m=>m.meter)))
    return {...common,meters:[],magazines:[],links:[],clearance:VIS_CFG.buffIcons.barClearance};
  const groups=slots.map((inst,i)=>({
    marks:supportMeters(supports[i] ?? []), banks:[] as Omit<BuffMagazine,'rect'>[], meta:!!inst && !!instanceMeta(inst),
  }));
  for(const {slot,buff,bank} of mounted) groups[slot].banks.push({buff,bank});
  const layout=supportCounterLayout(groups.map(g=>({meters:g.marks.length,magazines:g.banks.length,meta:g.meta})),left,barY,slotWidth,gap);
  const meters=groups.flatMap((g,i)=>g.marks.map((mark,j)=>({mark,rect:layout.groups[i].meters[j]})));
  const magazines=groups.flatMap((g,i)=>g.banks.map((bank,j)=>({...bank,rect:layout.groups[i].magazines[j]})));
  return { ...common, magazines, meters, clearance:layout.clearance, links:layout.links };
}
