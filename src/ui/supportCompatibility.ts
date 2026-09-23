import { supportFitsInstOrCrew, type SkillInstance, type SummonCrew, type SupportInstance } from '../engine/skills';
import { esc } from './dom';

/** Presentation only; admission always belongs to the shared socket gate. */
export const SUPPORT_COMPATIBILITY_CFG = {
  compatible: { glyph: '✓', label: 'Compatible', color: '#6fc06f' },
  incompatible: { glyph: '—', label: 'Incompatible', color: '#9a94a8' },
  capacityColor: '#c8b06a',
};

/** Read the owner's equipped bar in slot order, including seated item grants.
 * Full sockets do not change compatibility; they get a separate capacity note.
 * The caller supplies the live hero bar and crew census, never catalog copies. */
export function supportCompatibilityHtml(
  gem: Pick<SupportInstance, 'def' | 'rolled'>,
  skills: readonly (SkillInstance | null)[],
  crewOf: (inst: SkillInstance) => SummonCrew,
): string {
  const cfg = SUPPORT_COMPATIBILITY_CFG;
  const rows = skills.flatMap((inst, slot) => {
    if (!inst) return [];
    const fits = supportFitsInstOrCrew(gem.def, inst, crewOf(inst), gem.rolled);
    const face = fits ? cfg.compatible : cfg.incompatible;
    const capacity = fits && !inst.sockets.includes(null)
      ? `<span style="color:${cfg.capacityColor};font-size:9px">${inst.sockets.length ? 'Sockets full' : 'No sockets'}</span>` : '';
    return [`<div data-support-fit="${fits}" data-skill-slot="${slot}"
      style="display:flex;align-items:baseline;gap:8px;line-height:1.5">
      <span style="flex:1;min-width:0;overflow-wrap:anywhere;color:${face.color}">${esc(inst.def.name)}</span>
      ${capacity}<span aria-label="${face.label}" style="color:${face.color};flex:none">${face.glyph}</span>
    </div>`];
  });
  return `<div class="support-compatibility" style="margin-top:6px;padding-top:5px;border-top:1px solid var(--panel-border);font-size:10px">
    <div style="color:var(--gold);margin-bottom:2px">Equipped skills
      <span style="color:${cfg.compatible.color};font-size:9px"> · ${cfg.compatible.glyph} compatible</span></div>
    ${rows.join('') || '<div style="color:var(--text-dim)">No equipped skills.</div>'}
  </div>`;
}
