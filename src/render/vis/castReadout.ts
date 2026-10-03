import type { Actor } from '../../engine/actor';
import type { SkillInstance } from '../../engine/skills';
import { skillInstanceName } from '../../engine/skillEmpowerment';
import { VIS_CFG } from './visConfig';

/** Name the work actually running, not the last key pressed or a queued wish. */
export function drawCastName(ctx: CanvasRenderingContext2D, a: Actor, x: number, y: number, width: number): void {
  if (!a.casting) return;
  const c = VIS_CFG.castReadout;
  ctx.save(); ctx.font = c.font; ctx.textAlign = 'center';
  let name = skillInstanceName(a.casting.inst);
  if (ctx.measureText(name).width > width) {
    while (name.length && ctx.measureText(name + '…').width > width) name = name.slice(0, -1);
    name += '…';
  }
  ctx.lineJoin = 'round'; ctx.lineWidth = c.outline; ctx.strokeStyle = c.edge;
  ctx.strokeText(name, x, y); ctx.fillStyle = c.text; ctx.fillText(name, x, y);
  ctx.restore();
}

/** Same owner relationship as input feeding: minted meta/converted casts
 * belong to their host slot. A repeated definition in another slot stays quiet. */
export function activeCastSlot(a: Actor, inst: SkillInstance | null): boolean {
  const cs = a.casting;
  if (!VIS_CFG.castReadout.enabled || !cs || !inst || a.dead || a.downed || a.isStunned()) return false;
  const owner = a.skills.includes(cs.inst) ? cs.inst : cs.inst.hostSkillId === undefined ? undefined
    : a.skills.find(s => s?.def.id === cs.inst.hostSkillId);
  return owner === inst;
}
export function drawCastSlot(ctx: CanvasRenderingContext2D, a: Actor, inst: SkillInstance | null,
  x: number, y: number, size: number): void {
  if (!activeCastSlot(a, inst)) return;
  const c = VIS_CFG.castReadout;
  ctx.save(); ctx.strokeStyle = c.slotEdge; ctx.lineWidth = c.slotWidth;
  ctx.strokeRect(x - c.slotPad, y - c.slotPad, size + c.slotPad * 2, size + c.slotPad * 2);
  ctx.restore();
}
