import { STRUCTURES, legendCell, type StructureDef } from '../data/structures';

/** A saved authored plan keeps the base's identity, legend, services and footprint. */
export interface StructurePlanOverride { source: string; rows: string[] }
export type StructurePlanOverrides = Record<string, StructurePlanOverride>;

export function validateStructurePlans(plans: StructurePlanOverrides | undefined): void {
  if (plans === undefined) return;
  if (!plans || typeof plans !== 'object' || Array.isArray(plans) || Object.keys(plans).length > 32)
    throw Error('Invalid structure plan overrides');
  for (const [id, variant] of Object.entries(plans)) {
    const base = STRUCTURES[id];
    if (!base?.plan || base.generator || !variant || typeof variant.source !== 'string'
      || !variant.source.trim() || variant.source.length > 256 || !Array.isArray(variant.rows)
      || variant.rows.length !== base.plan.length
      || variant.rows.some((row,i) => typeof row !== 'string' || row.length !== base.plan![i].length
        || [...row].some(c => !legendCell(c, base.legend))))
      throw Error('Invalid structure plan override: ' + id);
  }
}

/** Snapshot a native plan plus authored rows; never mutate the shared registry. */
export function nativeStructurePlan(id: string, source: string, rows: Record<number,string>): StructurePlanOverride {
  const base = STRUCTURES[id];
  if (!base?.plan || Object.keys(rows).some(k => !/^(0|[1-9]\d*)$/.test(k) || Number(k) >= base.plan!.length))
    throw Error('Invalid native structure plan rows');
  const variant = { source, rows: base.plan.map((row,i) => rows[i] ?? row) };
  validateStructurePlans({[id]:variant});
  return variant;
}

export function structurePlanOf(def: StructureDef, plans: StructurePlanOverrides | undefined): StructureDef {
  const variant = plans?.[def.id];
  return variant ? { ...def, plan: variant.rows } : def;
}
