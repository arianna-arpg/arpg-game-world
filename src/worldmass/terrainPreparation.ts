/** Pure base-terrain preparation transport. Regional/native/patch composition,
 * edits, overlays, residency and publication remain synchronous host operations.
 * The internal worker is trusted to execute this source. Identity/checksums bind
 * requests; they are not independent proofs that arbitrary terrain is correct. */
import { address, type MassAddress } from './address';
import type { MassRun, MassSpec, MassTerrain } from './contracts';
import { MassGenerator } from './generator';
import type { PreparedMassOpening } from './openingPreparation';
import { MassNativeSubstrate } from './nativeSubstrate';
import { MassNativeGeography } from './nativeGeography';
import { canonical, freezeData, isMassFrozenData, massDigest } from './random';
import { isOwnedTerrainRecord, ownedBaseTerrain, ownedTerrainSource } from './ownedTerrain';

export const TERRAIN_PREPARATION_COMPILER = 'terrain-base-generator-v1';
export const TERRAIN_PREPARATION_MAX_ADDRESSES = 64;
export const TERRAIN_PREPARATION_MAX_REPLY_BYTES = 1024 * 1024;
export const TERRAIN_PREPARATION_MAX_SOURCE_BYTES = 8 * 1024 * 1024;
export const TERRAIN_PREPARATION_MAX_FIELDS = 128;
export const TERRAIN_PREPARATION_MAX_STRING = 16384;
export const TERRAIN_PREPARATION_MAX_FIELD_KEY = 256;
export const TERRAIN_PREPARATION_MAX_ROW_BYTES = 128 * 1024;
const terrainKeys = ['region', 'color', 'biome', 'fields', 'source'] as const;
// MassTerrain currently has FIVE own fields (three scalar values and two records).
const sourceKeys = ['generator', 'version', 'rule', 'source', 'stream'] as const;
export interface TerrainPreparationSource {
  protocol: 1; compiler: typeof TERRAIN_PREPARATION_COMPILER; sourceId: string;
  run: Readonly<MassRun>; spec: Readonly<MassSpec>;
}
export interface TerrainPreparationJob {
  protocol: 1; sourceId: string; token: number; addresses: readonly MassAddress[];
}
interface Shape {
  keys: readonly string[]; nullPrototype: boolean; frozen: boolean; massFrozen: boolean; owned: boolean;
}
type WireNumber = number | 'nan' | '+infinity' | '-infinity' | '-zero';
export interface TerrainPacket {
  shape: Shape; fields: Shape; source: Shape;
  region: string; color: string; biome: string;
  values: readonly WireNumber[];
  provenance: readonly [string, number, string, string, string];
}
export interface TerrainPreparationReply {
  protocol: 1; sourceId: string; token: number; rows: readonly (TerrainPacket | null)[]; bytes: number;
}

const text = (v: unknown): v is string => typeof v === 'string' && v.length <= TERRAIN_PREPARATION_MAX_STRING;
const sameKeys = (a: readonly string[], b: readonly string[]): boolean => a.length === b.length && a.every((k, i) => k === b[i]);
function ownValue(value: object, key: string): unknown {
  const d = Object.getOwnPropertyDescriptor(value, key);
  if (d) { if (!('value' in d)) throw Error('Accessor is not preparation data'); return d.value; }
  if (key in value) throw Error('Inherited preparation property');
  return undefined;
}
function record(value: unknown, keys: readonly string[]): value is Record<string, unknown> {
  if (!value || typeof value !== 'object' || Array.isArray(value)) return false;
  const proto = Object.getPrototypeOf(value);
  if (proto !== Object.prototype && proto !== null) return false;
  const names = Reflect.ownKeys(value);
  return names.length === keys.length && names.every(k => typeof k === 'string' && keys.includes(k)
    && !!Object.getOwnPropertyDescriptor(value, k)?.enumerable
    && 'value' in Object.getOwnPropertyDescriptor(value, k)!);
}
function array(value: unknown, maximum: number): value is unknown[] {
  if (!Array.isArray(value) || Object.getPrototypeOf(value) !== Array.prototype || value.length > maximum) return false;
  // Check length before enumerating: oversized row/field arrays are rejected early.
  const keys = Reflect.ownKeys(value);
  if (keys.length !== value.length + 1) return false;
  for (let i = 0; i < value.length; i++) {
    const d = Object.getOwnPropertyDescriptor(value, String(i));
    if (!d || !('value' in d) || !d.enumerable) return false;
  }
  return true;
}

interface MethodBinding { object: object; prototype: object | null; methods: [string, unknown, boolean][] }
interface IssuedBinding { methods: MethodBinding[]; children: [object, string, unknown][] }
interface SourceBinding extends IssuedBinding { generator: MassGenerator }
const sources = new WeakMap<object, SourceBinding>();
const issued = new WeakMap<MassGenerator, IssuedBinding>();
const generatorBaseMethods = new Set(['baseTerrainAt', 'fieldsAt', 'noise', 'surfacePlacesInCell', 'placesInCell',
  'collectPlacesInCell', 'candidate', 'makeCandidate', 'candidateFieldsMatch', 'accepted', 'acceptCandidate']);
const generatorBaseData = new Set(['run', 'spec', 'nativeSubstrate', 'surfaces', 'surfaceRecipes', 'salts',
  'candidates', 'decisions', 'placePages', 'surfacePages']);
const originalPrototypes = new Map<object, [string, PropertyDescriptor][]>([
  MassGenerator.prototype, MassNativeSubstrate.prototype, MassNativeGeography.prototype,
].map(prototype => [prototype, Object.entries(Object.getOwnPropertyDescriptors(prototype))] as [object, [string, PropertyDescriptor][]]));
function methodBindings(generator: MassGenerator): MethodBinding[] | null {
  if (Object.getPrototypeOf(generator) !== MassGenerator.prototype) return null;
  const objects: object[] = [generator];
  for (const child of [generator.nativeSubstrate, generator.nativeSubstrate?.geography]) if (child) objects.push(child);
  const result: MethodBinding[] = [];
  for (const object of objects) {
    const methods: [string, unknown, boolean][] = [];
    for (const [key, d] of Object.entries(Object.getOwnPropertyDescriptors(object))) if ('value' in d && typeof d.value === 'function') methods.push([key, d.value, false]);
    const prototype = Object.getPrototypeOf(object);
    const original = originalPrototypes.get(prototype); if (!original) return null;
    for (const [key, d] of original) {
      if (key === 'constructor' || object === generator && !generatorBaseMethods.has(key)) continue;
      const current = Object.getOwnPropertyDescriptor(prototype, key);
      if (!current || current.value !== d.value || current.get !== d.get || current.set !== d.set || Object.hasOwn(object, key)) return null;
      methods.push(['prototype:' + key, 'value' in d ? d.value : d.get, !('value' in d)]);
    }
    result.push({ object, prototype, methods });
  }
  const geography = generator.nativeSubstrate?.geography;
  if (geography) {
    const reader = ownValue(geography, 'reader');
    if (!reader || typeof reader !== 'object' || Object.getPrototypeOf(reader) !== Object.prototype) return null;
    const methods: [string, unknown, boolean][] = [];
    for (const [key, d] of Object.entries(Object.getOwnPropertyDescriptors(reader))) {
      if (!('value' in d)) return null;
      if (typeof d.value === 'function') methods.push([key, d.value, false]);
    }
    result.push({ object: reader, prototype: Object.prototype, methods });
  }
  return result;
}
/** Issuance happens before the new generator escapes to callers. Only exact
 * constructor-created children/callbacks can subsequently issue worker sources.
 * No serialization or worker setup occurs for browser users. */
export function createTerrainPreparationGenerator(run: MassRun, spec: MassSpec, opening?: PreparedMassOpening): MassGenerator {
  const generator = new MassGenerator(run, spec, opening);
  try {
    const methods = methodBindings(generator);
    if (methods) {
      const children: [object, string, unknown][] = [];
      for (const row of methods) for (const [key, d] of Object.entries(Object.getOwnPropertyDescriptors(row.object))) {
        if (row.object === generator && !generatorBaseData.has(key)) continue;
        if (!('value' in d)) return generator;
        children.push([row.object, key, d.value]);
      }
      issued.set(generator, { methods, children });
    }
  } catch { /* Capability refusal leaves the ordinary generator usable. */ }
  return generator;
}
function bindingMatches(binding: IssuedBinding): boolean {
  for (const [parent, key, child] of binding.children) if (ownValue(parent, key) !== child) return false;
  for (const row of binding.methods) {
    if (Object.getPrototypeOf(row.object) !== row.prototype) return false;
    for (const [key, value, getter] of row.methods) {
      const inherited = key.startsWith('prototype:'), name = inherited ? key.slice(10) : key;
      if (inherited && Object.hasOwn(row.object, name)) return false;
      const d = Object.getOwnPropertyDescriptor(inherited ? row.prototype! : row.object, name);
      if (!d || ('value' in d) === getter || ('value' in d ? d.value : d.get) !== value || d.set) return false;
    }
  }
  return true;
}
/** Only an issued ordinary generator may supply immutable base terrain. Live
 * region material rules are intentionally absent: host composition reads them
 * at the original query position, retaining its exact admission/cache history. */
export function captureTerrainPreparationSource(generator: MassGenerator): TerrainPreparationSource | null {
  try {
    const capability = issued.get(generator);
    if (!capability || !bindingMatches(capability) || !isMassFrozenData(generator.spec) || !isMassFrozenData(generator.run)) return null;
    const body = { protocol: 1, compiler: TERRAIN_PREPARATION_COMPILER, run: generator.run, spec: generator.spec } as const;
    if (canonical(body).length * 2 > TERRAIN_PREPARATION_MAX_SOURCE_BYTES) return null;
    const source = freezeData({ ...body, sourceId: massDigest(body) });
    sources.set(source, { generator, ...capability }); return source;
  } catch { return null; }
}
export function terrainPreparationGeneratorMatches(generator: MassGenerator, source: TerrainPreparationSource): boolean {
  try {
    const binding = sources.get(source);
    if (!binding || binding.generator !== generator || ownValue(generator, 'spec') !== source.spec || ownValue(generator, 'run') !== source.run) return false;
    return bindingMatches(binding);
  } catch { return false; }
}

function describe(value: unknown, required: readonly string[] | null): Shape | null {
  if (!value || typeof value !== 'object' || Array.isArray(value)) return null;
  const proto = Object.getPrototypeOf(value); if (proto !== null && proto !== Object.prototype) return null;
  const keys = Reflect.ownKeys(value);
  if (keys.length > TERRAIN_PREPARATION_MAX_FIELDS || keys.some(k => typeof k !== 'string' || k.length > TERRAIN_PREPARATION_MAX_FIELD_KEY)) return null;
  if (required && (keys.length !== required.length || keys.some(k => !required.includes(k as string)))) return null;
  const frozen = Object.isFrozen(value);
  if (!frozen && !Object.isExtensible(value)) return null;
  for (const key of keys) {
    const d = Object.getOwnPropertyDescriptor(value, key)!;
    if (!('value' in d) || !d.enumerable || d.configurable === frozen || d.writable === frozen) return null;
  }
  return { keys: keys as string[], nullPrototype: proto === null, frozen, massFrozen: isMassFrozenData(value), owned: isOwnedTerrainRecord(value) };
}
function wireNumber(value: number): WireNumber {
  return Number.isNaN(value) ? 'nan' : value === Infinity ? '+infinity' : value === -Infinity ? '-infinity' : Object.is(value, -0) ? '-zero' : value;
}
function readNumber(value: unknown): number | undefined {
  if (typeof value === 'number' && Number.isFinite(value) && !Object.is(value, -0)) return value;
  if (value === 'nan') return NaN; if (value === '+infinity') return Infinity;
  if (value === '-infinity') return -Infinity; if (value === '-zero') return -0;
  return undefined;
}
/** No truncation: extra/non-enumerable/symbol/accessor/custom records miss. */
export function prepareTerrainPacket(terrain: MassTerrain): TerrainPacket | null {
  try {
    const shape = describe(terrain, terrainKeys); if (!shape) return null;
    const fieldValue = ownValue(terrain, 'fields'), sourceValue = ownValue(terrain, 'source');
    const fields = describe(fieldValue, null), source = describe(sourceValue, sourceKeys);
    if (!fields || !source || fields.owned) return null;
    const region = ownValue(terrain, 'region'), color = ownValue(terrain, 'color'), biome = ownValue(terrain, 'biome');
    if (!text(region) || !text(color) || !text(biome)) return null;
    const values: WireNumber[] = [];
    for (const key of fields.keys) { const value = ownValue(fieldValue as object, key); if (typeof value !== 'number') return null; values.push(wireNumber(value)); }
    const provenance = sourceKeys.map(key => ownValue(sourceValue as object, key));
    if (!provenance.every((v, i) => i === 1 ? typeof v === 'number' && Number.isSafeInteger(v) && v >= 1 : text(v))) return null;
    const packet: TerrainPacket = { shape, fields, source, region, color, biome, values, provenance: provenance as unknown as TerrainPacket['provenance'] };
    // Reuse the bounded validator, including impossible brand/shape combinations.
    return restoreTerrainPacket(packet) && JSON.stringify(packet).length * 2 <= TERRAIN_PREPARATION_MAX_ROW_BYTES ? packet : null;
  } catch { return null; }
}
function shapeValid(value: unknown, expected: readonly string[] | null): value is Shape {
  if (!record(value, ['keys', 'nullPrototype', 'frozen', 'massFrozen', 'owned'])
    || !array(value.keys, TERRAIN_PREPARATION_MAX_FIELDS) || !value.keys.every(k => typeof k === 'string' && k.length <= TERRAIN_PREPARATION_MAX_FIELD_KEY)
    || new Set(value.keys).size !== value.keys.length
    || !['nullPrototype', 'frozen', 'massFrozen', 'owned'].every(k => typeof value[k] === 'boolean')) return false;
  if (expected && (value.keys.length !== expected.length || value.keys.some(k => !expected.includes(k as string)))) return false;
  return !(value.massFrozen && !value.frozen || value.owned && (!value.frozen || value.nullPrototype));
}
function makeRecord(shape: Shape, values: Record<string, unknown>): Record<string, unknown> {
  const result: Record<string, unknown> = Object.create(shape.nullPrototype ? null : Object.prototype);
  for (const key of shape.keys) Object.defineProperty(result, key, { value: values[key], enumerable: true, writable: true, configurable: true });
  if (shape.massFrozen) freezeData(result); else if (shape.frozen) Object.freeze(result);
  return result;
}
export function restoreTerrainPacket(raw: unknown): MassTerrain | null {
  try {
    if (!record(raw, ['shape', 'fields', 'source', 'region', 'color', 'biome', 'values', 'provenance'])
      || !shapeValid(raw.shape, terrainKeys) || !shapeValid(raw.fields, null) || !shapeValid(raw.source, sourceKeys)
      || !text(raw.region) || !text(raw.color) || !text(raw.biome)
      || !array(raw.values, TERRAIN_PREPARATION_MAX_FIELDS) || raw.values.length !== raw.fields.keys.length
      || !array(raw.provenance, 5) || raw.provenance.length !== 5
      || !raw.provenance.every((v, i) => i === 1 ? typeof v === 'number' && Number.isSafeInteger(v) && v >= 1 : text(v))
      || raw.fields.owned) return null;
    const packet = raw as unknown as TerrainPacket;
    if (packet.source.owned && !sameKeys(packet.source.keys, sourceKeys)
      || packet.shape.owned && !sameKeys(packet.shape.keys, terrainKeys)) return null;
    const numeric: Record<string, unknown> = Object.create(null);
    for (let i = 0; i < packet.values.length; i++) {
      const n = readNumber(packet.values[i]); if (n === undefined) return null; numeric[packet.fields.keys[i]] = n;
    }
    const fields = makeRecord(packet.fields, numeric) as Readonly<Record<string, number>>;
    const [generator, version, rule, sourceName, stream] = packet.provenance;
    const source = packet.source.owned ? ownedTerrainSource(generator, version, rule, sourceName, stream)
      : makeRecord(packet.source, { generator, version, rule, source: sourceName, stream });
    if (packet.source.massFrozen) freezeData(source);
    const terrain = packet.shape.owned ? ownedBaseTerrain(packet.region, packet.color, packet.biome, fields, source as MassTerrain['source'])
      : makeRecord(packet.shape, { region: packet.region, color: packet.color, biome: packet.biome, fields, source });
    if (packet.shape.massFrozen) freezeData(terrain);
    // freezeData can recursively mark children; those changes must match the packet.
    for (const [value, shape] of [[terrain, packet.shape], [fields, packet.fields], [source, packet.source]] as const)
      if (!sameKeys(Object.keys(value), shape.keys) || Object.isFrozen(value) !== shape.frozen
        || isMassFrozenData(value) !== shape.massFrozen || isOwnedTerrainRecord(value) !== shape.owned) return null;
    return terrain as unknown as MassTerrain;
  } catch { return null; }
}

function jobValid(source: TerrainPreparationSource, raw: unknown): raw is TerrainPreparationJob {
  if (!record(raw, ['protocol', 'sourceId', 'token', 'addresses']) || raw.protocol !== 1 || raw.sourceId !== source.sourceId
    || !Number.isSafeInteger(raw.token) || (raw.token as number) < 1 || !array(raw.addresses, TERRAIN_PREPARATION_MAX_ADDRESSES)) return false;
  const cell = source.spec.terrainCell, half = cell / 2, span = source.spec.addressSpan;
  return raw.addresses.every(at => {
    if (!record(at, ['dimension', 'cx', 'cy', 'x', 'y']) || typeof at.dimension !== 'string' || at.dimension.length > 128
      || typeof at.cx !== 'string' || at.cx.length > 20 || typeof at.cy !== 'string' || at.cy.length > 20
      || typeof at.x !== 'number' || typeof at.y !== 'number' || (at.x - half) % cell !== 0 || (at.y - half) % cell !== 0) return false;
    const clean = address(at.dimension, at.cx, at.cy, at.x, at.y, span);
    return clean.cx === at.cx && clean.cy === at.cy && Object.is(clean.x, at.x) && Object.is(clean.y, at.y);
  });
}
export function createTerrainPreparationCompiler(source: TerrainPreparationSource): { prepare(job: TerrainPreparationJob): TerrainPreparationReply } {
  if (!record(source, ['protocol', 'compiler', 'sourceId', 'run', 'spec']) || source.protocol !== 1
    || source.compiler !== TERRAIN_PREPARATION_COMPILER || !text(source.sourceId)) throw Error('Invalid terrain preparation source');
  const body = { protocol: source.protocol, compiler: source.compiler, run: source.run, spec: source.spec };
  if (canonical(body).length * 2 > TERRAIN_PREPARATION_MAX_SOURCE_BYTES || massDigest(body) !== source.sourceId) throw Error('Terrain preparation source mismatch');
  const generator = new MassGenerator(source.run, source.spec);
  const boundSource: TerrainPreparationSource = freezeData({ protocol: 1, compiler: TERRAIN_PREPARATION_COMPILER,
    sourceId: source.sourceId, run: generator.run, spec: generator.spec });
  return { prepare(job) {
    if (!jobValid(boundSource, job)) throw Error('Invalid terrain preparation job');
    const rows: (TerrainPacket | null)[] = [];
    let bytes = 0;
    for (const at of job.addresses) {
      let packet: TerrainPacket | null = null;
      try { packet = prepareTerrainPacket(generator.baseTerrainAt(at)); } catch { /* Original host miss retains its own error/effects. */ }
      let size = JSON.stringify(packet).length * 2;
      if (bytes + size > TERRAIN_PREPARATION_MAX_REPLY_BYTES) { packet = null; size = 8; }
      rows.push(packet); bytes += size;
    }
    // Include array framing/commas in the exact logical row payload count.
    bytes = JSON.stringify(rows).length * 2;
    if (bytes > TERRAIN_PREPARATION_MAX_REPLY_BYTES) { rows.fill(null); bytes = JSON.stringify(rows).length * 2; }
    return { protocol: 1, sourceId: boundSource.sourceId, token: job.token, rows, bytes };
  } };
}
/** Queue owns session/interest matching and rechecks base-generator bindings
 * at the point it hands a value to the original synchronous base query. */
export function validateTerrainPreparationReply(source: TerrainPreparationSource, job: TerrainPreparationJob, raw: unknown): readonly (MassTerrain | null)[] | null {
  try {
    if (!jobValid(source, job) || !record(raw, ['protocol', 'sourceId', 'token', 'rows', 'bytes'])
      || raw.protocol !== 1 || raw.sourceId !== source.sourceId || raw.token !== job.token
      || !Number.isSafeInteger(raw.bytes) || (raw.bytes as number) < 0 || (raw.bytes as number) > TERRAIN_PREPARATION_MAX_REPLY_BYTES
      || !array(raw.rows, TERRAIN_PREPARATION_MAX_ADDRESSES) || raw.rows.length !== job.addresses.length) return null;
    const result: (MassTerrain | null)[] = []; let bytes = 4 + Math.max(0, raw.rows.length - 1) * 2;
    // Only bounded, structurally checked packets reach JSON serialization.
    for (const row of raw.rows) {
      const terrain = row === null ? null : restoreTerrainPacket(row); if (row !== null && !terrain) return null;
      const size = JSON.stringify(row).length * 2;
      if (size > TERRAIN_PREPARATION_MAX_ROW_BYTES || (bytes += size) > TERRAIN_PREPARATION_MAX_REPLY_BYTES) return null;
      result.push(terrain);
    }
    if (bytes !== raw.bytes) return null;
    return result;
  } catch { return null; }
}
