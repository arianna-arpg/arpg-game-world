import { DEFENSE_CUE_CFG, DEFENSE_CUE_STYLES, type DefenseCueStyle } from '../data/defenseCues';

export type DefenseCueEvent = 'break' | 'reform' | 'impact' | 'bash';
export type DefenseCueKind = 'shell' | 'poise' | 'guard';
/** Frozen event geometry travels with the ordinary flash, including co-op.
 * The persistent state separately reads the real pool/guard/status. */
export interface DefenseCue {
  kind: DefenseCueKind; event: DefenseCueEvent; style: string;
  facing: number; arc: number;
}

function hasStyle(id: string | undefined): id is string {
  return id !== undefined && Object.prototype.hasOwnProperty.call(DEFENSE_CUE_STYLES, id);
}

export function defenseStyle(id: string | undefined, fallback = 'shell'): DefenseCueStyle {
  return hasStyle(id) ? DEFENSE_CUE_STYLES[id]
    : hasStyle(fallback) ? DEFENSE_CUE_STYLES[fallback] : DEFENSE_CUE_STYLES.shell;
}

export function defenseCueFlash(
  body: { pos: { x: number; y: number }; radius: number; facing: number },
  kind: DefenseCueKind, event: DefenseCueEvent, color: string,
  opts: { style?: string; facing?: number; arc?: number } = {},
) {
  const style = hasStyle(opts.style) ? opts.style : kind;
  const cfg = defenseStyle(style, kind);
  const life = event === 'break' ? cfg.breakLife : event === 'reform' ? cfg.reformLife
    : event === 'bash' ? DEFENSE_CUE_CFG.bashLife : cfg.impactLife;
  const pad = kind === 'shell' ? DEFENSE_CUE_CFG.shellPad : kind === 'guard' ? DEFENSE_CUE_CFG.guardPad : DEFENSE_CUE_CFG.poisePad;
  return { pos: { ...body.pos }, radius: body.radius + pad, color, life, maxLife: life,
    fx: 'defenseCue', defenseCue: { kind, event, style,
      facing: opts.facing ?? body.facing, arc: opts.arc ?? Math.PI * 2 } satisfies DefenseCue };
}
