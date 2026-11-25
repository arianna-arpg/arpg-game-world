import type { BuffRow } from '../../engine/buffPresentation';

export type BuffBehavior = 'proc' | 'stack' | 'condition' | 'duration' | 'active';

/** A proc can carry stacks and a timer. Those values remain separate readouts. */
export function buffBehavior(row: Pick<BuffRow, 'kind' | 'triggered' | 'count' | 'remaining'>): BuffBehavior {
  if (row.triggered) return 'proc';
  if (row.count !== undefined || row.kind === 'charge') return 'stack';
  if (row.kind === 'passive' || row.kind === 'stance') return 'condition';
  if (row.remaining !== undefined && Number.isFinite(row.remaining)) return 'duration';
  return 'active';
}

export const BUFF_SHAPES = { proc:'diamond', stack:'circle', condition:'diamond', duration:'square', active:'hexagon' } as const;
