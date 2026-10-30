import { copyNativeGeographyData, restoreNativeGeographySource } from '../world/geographySource';
import type { MassAddress } from './address';
import { cellKey, moveAddress } from './address';
import type { MassSpec, MassRun, MassTerrain, MassSurfaceRule, MassRange } from './contracts';
import { MassNativeGeography, type MassNativeGeographySpec } from './nativeGeography';
import { canonical, freezeData, massDigest } from './random';

/** Explicit substrate policy beside legacy noise. Surface material/palette rows
 * are authored saved policy, not proof of a native area or a selected face. */
export interface NativeSubstrate {
  schema: 1; policy: 'native-field-substrate-v1'; geography: MassNativeGeographySpec;
}
const own = (v: unknown, key: string) => !!v && typeof v === 'object' && Object.hasOwn(v, key);
const required = (v: unknown, keys: readonly string[]) => keys.every(k => own(v, k));
/** Native climate owns every range input. Each captured biome must have its own
 * unconditional material row; unsupported biomes never alias a convenient face.
 * This first substrate has no old independent place lottery or noise fields. */
export function validateNativeSubstrate(input: MassSpec, seed?: number): MassNativeGeography | undefined {
  if (!own(input, 'nativeSubstrate')) return;
  const spec = copyNativeGeographyData(input), binding = spec.nativeSubstrate!;
  if (!required(spec, ['nativeSubstrate', 'id', 'version', 'addressSpan', 'terrainCell', 'fields', 'surfaces', 'places'])
    || typeof spec.id !== 'string' || !spec.id || !Number.isSafeInteger(spec.version) || spec.version < 1
    || !Number.isSafeInteger(spec.terrainCell) || spec.terrainCell < 1 || spec.addressSpan % spec.terrainCell
    || !Array.isArray(spec.fields) || !Array.isArray(spec.surfaces) || !Array.isArray(spec.places)) throw Error('Incomplete native substrate policy');
  if (!binding || binding.schema !== 1 || binding.policy !== 'native-field-substrate-v1'
    || Object.keys(binding).length !== 3 || !['schema', 'policy', 'geography'].every(k => own(binding, k))) throw Error('Invalid native substrate binding');
  const geography = new MassNativeGeography(binding.geography);
  if (geography.spec.mapping.addressSpan !== spec.addressSpan || seed !== undefined && geography.seed !== seed)
    throw Error('Native substrate address span or explicit seed differs from its geography');
  const source = restoreNativeGeographySource(geography.spec.sourceJson);
  if (source.climate.axes.some(([, axis]) => axis.id === 'nativeDepth')) throw Error('Native substrate depth name conflicts with climate');
  const fields = [...new Set(source.climate.axes.map(([, axis]) => axis.id)), 'nativeDepth'];
  if (spec.fields.length !== fields.length || fields.some(id => !spec.fields.some(f => f.id === id))
    || spec.fields.some(f => !required(f, ['id', 'base', 'layers']) || f.base !== 0 || !Array.isArray(f.layers) || f.layers.length)) throw Error('Native substrate forbids independent climate/noise fields');
  if (spec.places.length) throw Error('Native substrate requires canonical native area placement');
  const biomes = new Set(source.biomes.map(([id]) => id));
  if (spec.surfaces.some(row => !required(row, ['id', 'biome', 'source', 'priority', 'when', 'region', 'color'])
    || typeof row.id !== 'string' || !row.id || !Number.isFinite(row.priority) || typeof row.region !== 'string' || !row.region
    || typeof row.color !== 'string' || !/^#[0-9a-f]{6}$/i.test(row.color) || !Array.isArray(row.when)
    || row.when.some((w: MassRange) => !required(w, ['field']) || !fields.includes(w.field)
      || own(w, 'min') && !Number.isFinite(w.min) || own(w, 'max') && !Number.isFinite(w.max)
      || (own(w, 'min') ? w.min! : -Infinity) >= (own(w, 'max') ? w.max! : Infinity))
    || !biomes.has(row.biome) || !own(row, 'source') || typeof row.source !== 'string' || !row.source)
    || new Set(spec.surfaces.map(r => r.id)).size !== spec.surfaces.length
    || [...biomes].some(id => !spec.surfaces.some(row => row.biome === id && row.when.length === 0)))
    throw Error('Native substrate needs an explicit material and fallback for every captured biome');
  // Ordinary outside-area land must not impose continuous mire. Broad hazards
  // belong to complete area owners with their own navigation and activity.
  if (spec.surfaces.some(row => ['bog', 'swamp', 'mud'].includes(row.region)))
    throw Error('Native substrate slowing mire must use localized patches or a complete area owner');
  return geography;
}
export class MassNativeSubstrate {
  readonly geography: MassNativeGeography;
  private readonly rows: readonly MassSurfaceRule[];
  private readonly run: Readonly<MassRun>;
  constructor(run: MassRun, spec: MassSpec) {
    run = freezeData(copyNativeGeographyData(run));
    if (!own(spec, 'nativeSubstrate')) throw Error('Missing native substrate binding');
    const clean = freezeData(copyNativeGeographyData(spec));
    this.geography = validateNativeSubstrate(clean, run.seed)!;
    if (!required(run, ['schema', 'seed', 'runId', 'generator', 'version', 'manifest', 'addressSpan']) || run.schema !== 1 || run.generator !== clean.id || run.version !== clean.version || run.addressSpan !== clean.addressSpan
      || typeof run.runId !== 'string' || !run.runId || run.manifest !== massDigest(clean)) throw Error('Native substrate run identity mismatch');
    this.rows = [...clean.surfaces].sort((a, b) => b.priority - a.priority || (a.id < b.id ? -1 : a.id > b.id ? 1 : 0));
    this.run = freezeData(copyNativeGeographyData(run));
  }
  /** Whole optional patch cells must fit the declared mapping domain. At a
   * finite edge, refuse the candidate, retaining the valid queried base ground.
   * No outside terrain is sampled, clamped or invented. */
  supportsPatchCell(origin: MassAddress, size: number): boolean {
    try {
      for (const [x, y] of [[0, 0], [size, 0], [0, size], [size, size]])
        this.geography.nativePoint(moveAddress(origin, { x, y }, this.run.addressSpan));
      return true;
    } catch (error) { if (error instanceof RangeError) return false; throw error; }
  }
  pointAt(at: MassAddress) { return this.geography.pointAt(at); }
  fieldsAt(at: MassAddress): Readonly<Record<string, number>> {
    const point = this.pointAt(at); return freezeData({ ...point.climate, nativeDepth: point.depth });
  }
  sample(at: MassAddress): MassTerrain {
    const point = this.pointAt(at), fields: Readonly<Record<string, number>> = freezeData({ ...point.climate, nativeDepth: point.depth });
    const row = this.rows.find(r => r.biome === point.biome && r.when.every(w => fields[w.field] >= (own(w, 'min') ? w.min! : -Infinity) && fields[w.field] < (own(w, 'max') ? w.max! : Infinity)));
    if (!row) throw Error('Native substrate lost the physical material for its actual biome');
    return freezeData({ region: row.region, color: row.color, biome: point.biome, fields,
      source: { generator: this.run.generator, version: this.run.version, rule: row.id, source: row.source!,
        stream: canonical([this.run.seed, 'native-substrate-v1', this.geography.spec.sourceHash, this.geography.spec.mappingHash, cellKey(at)]) } });
  }
}
