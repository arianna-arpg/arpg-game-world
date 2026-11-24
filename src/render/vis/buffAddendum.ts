import type { BuffRow } from '../../engine/buffPresentation';
import type { ProcCueRow } from '../../engine/procCues';
import { CHARGE_DEFS } from '../../engine/charges';
import { instanceChargeCost, instanceMeta, type SkillInstance } from '../../engine/skills';
import type { BuffIconRect } from './buffIcons';
import { VIS_CFG } from './visConfig';

export interface BuffMagazine { buff: BuffRow; bank: ProcCueRow; rect: BuffIconRect; }

/** One visual home per positive effect. Placement reads the live skill bar
 * every draw, so swapping a skill while rounds remain moves its one indicator. */
export function buffAddendum(rows: readonly BuffRow[], cues: readonly ProcCueRow[],
  slots: readonly (SkillInstance | null)[], left: number, barY: number, slotWidth: number, gap: number) {
  const strip: BuffRow[] = [], magazines: BuffMagazine[] = [];
  const stored = new Map(cues.filter(c => c.phase === 'stored' && !c.id.startsWith('rune:')).map(c => [c.id,c]));
  const legacyBanks = new Map(stored);
  const depth = new Map<number,number>(), cfg = VIS_CFG.buffMagazine;
  let clearance: number = VIS_CFG.buffIcons.barClearance;
  for (const buff of rows) {
    if (buff.kind === 'charge' && CHARGE_DEFS[buff.id]?.hud === 'slot'
      && slots.some(inst => inst && instanceChargeCost(inst)?.charge === buff.id)) continue;
    const bank = buff.kind === 'buff' ? stored.get(buff.id) : undefined;
    if (bank) legacyBanks.delete(buff.id);
    const sourceId = buff.source?.id;
    const slot = bank && buff.skillMagazine && sourceId ? slots.findIndex(inst => inst?.def.id === sourceId) : -1;
    if (!bank || slot < 0) { strip.push(buff); continue; }
    const level = depth.get(slot) ?? 0;
    const bottom = barY - (instanceMeta(slots[slot]!) ? cfg.metaClearance : cfg.slotClearance) - level*(cfg.height+cfg.gap);
    const rect = { x:left+slot*(slotWidth+gap)+cfg.inset, y:bottom-cfg.height, w:slotWidth-2*cfg.inset, h:cfg.height };
    magazines.push({buff,bank,rect}); depth.set(slot,level+1);
    clearance = Math.max(clearance, barY - rect.y + VIS_CFG.buffIcons.gap);
  }
  return { strip, magazines, stored, legacyBanks: [...legacyBanks.values()], clearance };
}
