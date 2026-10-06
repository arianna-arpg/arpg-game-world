import { doodadRuleKinds, doodadRuleOf, type Doodad, type DoodadEffect } from '../engine/levelgen';
import { STATUS_DEFS, type StatusDef } from '../engine/status';
import { canonical, freezeData, massDigest } from './random';

export interface NativeEffectSource {
  index: number; kind: string; origin: 'explicit' | 'rule';
  effect: DoodadEffect;
  status?: { id: string; definition: StatusDef };
}
export interface NativeEffectSources {
  schema: 1; registryHash: string; rows: NativeEffectSource[];
}
const copy = <T>(value: T): T => JSON.parse(JSON.stringify(value)) as T;
const nativeCloudhaven = canonical(copy(STATUS_DEFS.cloudhaven));

/** Rule effects are attached by finite loadZone AFTER generation. Include that
 * otherwise invisible registry in the worker's source identity, including the
 * native status semantics the real Actor.applyStatus will read. */
export function nativeEffectRegistryHash(): string {
  return massDigest(doodadRuleKinds().sort().flatMap(kind => {
    const effect = doodadRuleOf(kind).effect;
    return effect ? [{ kind, effect: copy(effect), status: effect.statusId ? copy(STATUS_DEFS[effect.statusId] ?? null) : null }] : [];
  }));
}

export function captureNativeEffectSources(doodads: readonly Doodad[]): Readonly<NativeEffectSources> {
  const rows: NativeEffectSource[] = [];
  doodads.forEach((d, index) => {
    const effect = d.effect ?? doodadRuleOf(d.kind).effect;
    if (!effect) return;
    const status = effect.statusId && STATUS_DEFS[effect.statusId];
    rows.push({ index, kind: d.kind, origin: d.effect ? 'explicit' : 'rule', effect: copy(effect),
      ...(status ? { status: { id: effect.statusId!, definition: copy(status) } } : {}) });
  });
  const result: NativeEffectSources = { schema: 1, registryHash: nativeEffectRegistryHash(), rows };
  validateNativeEffectSources(result, doodads);
  return freezeData(result);
}

/** Historical records validate against their frozen geometry, not a fresh
 * generation pass. Live native status compatibility is checked on admission. */
export function validateNativeEffectSources(value: Readonly<NativeEffectSources>, doodads: readonly Doodad[]): void {
  if (!value || value.schema !== 1 || !/^[0-9a-f]{16}$/.test(value.registryHash) || !Array.isArray(value.rows)
    || value.rows.length > doodads.length) throw Error('Invalid native effect source contract');
  canonical(value);
  const indices = new Set<number>();
  let last = -1;
  for (const row of value.rows) {
    const d = doodads[row.index], e = row.effect;
    if (!Number.isSafeInteger(row.index) || row.index <= last || !d || d.kind !== row.kind
      || !['explicit', 'rule'].includes(row.origin) || !e || typeof e.id !== 'string' || !e.id
      || ![e.interval, e.radius, e.chance, e.power].every(Number.isFinite) || e.interval <= 0 || e.radius < 0
      || e.chance < 0 || e.chance > 1 || e.cd !== undefined && (!Number.isFinite(e.cd) || e.cd < 0)
      || row.origin === 'explicit' && (!d.effect || canonical(d.effect) !== canonical(e))
      || row.origin === 'rule' && !!d.effect
      || row.status && (row.status.id !== e.statusId || !row.status.definition))
      throw Error('Invalid native effect source row');
    indices.add(row.index); last = row.index;
  }
  if (doodads.some((d, index) => (d.effect || doodadRuleOf(d.kind).effect) && !indices.has(index)))
    throw Error('Native effect source lost scenery mechanism');
}

export function nativeEffectRequirements(value: Readonly<NativeEffectSources>): string[] {
  return [...new Set(value.rows.flatMap(row => ['native-effects', 'native-effect:' + row.effect.id + ':' + (row.effect.statusId ?? '-')]))].sort();
}

/** This slice binds the actual haven stone. A beneficial flag alone is not an
 * ownership certificate for arbitrary status handlers, projectiles or actors. */
export function nativeHavenEffectSupported(row: Readonly<NativeEffectSource>): boolean {
  const e = row.effect;
  return row.kind === 'haven_stone' && e.id === 'status_wash' && e.statusId === 'cloudhaven'
    && e.interval === .8 && e.radius === 52 && e.chance === 1 && e.power === 2.5
    && Object.keys(e).every(k => ['id', 'statusId', 'interval', 'radius', 'chance', 'power', 'cd'].includes(k))
    && (row.origin === 'explicit' || e.cd === undefined)
    && !!row.status && row.status.id === 'cloudhaven'
    && canonical(row.status.definition) === nativeCloudhaven
    && canonical(row.status.definition) === canonical(copy(STATUS_DEFS.cloudhaven));
}
