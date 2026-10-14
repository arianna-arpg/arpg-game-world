import { Rng } from '../core/rng';
// Only plain data recursively frozen HERE can be memoized. Object.freeze on an
// outer record alone says nothing about its children or live accessor values.
const massFrozenData=new WeakSet<object>();
const massCanonicalMemo=new WeakMap<object,string>(),massDigestMemo=new WeakMap<object,string>();
export function isMassFrozenData(value:unknown):boolean{return !!value&&typeof value==='object'&&massFrozenData.has(value);}

// A shared visitor avoids creating/naming recursive and record callbacks for
// every terrain key. Array.from keeps its original custom-iterator semantics;
// the receiver carries only this serialization's cycle-detection set.
function canonicalVisit(this: Set<object>, v: unknown): string {
  const seen = this;
  if (v === null || typeof v === 'boolean' || typeof v === 'string') return JSON.stringify(v);
  if (typeof v === 'number' && Number.isFinite(v)) return JSON.stringify(v);
  if (typeof v !== 'object' || v === null) throw new Error('Manifest must contain finite JSON data');
  if(massFrozenData.has(v)){const cached=massCanonicalMemo.get(v);if(cached!==undefined)return cached;}
  if (seen.has(v)) throw new Error('Manifest must not contain cycles');
  if (!Array.isArray(v) && Object.getPrototypeOf(v) !== Object.prototype && Object.getPrototypeOf(v) !== null)
    throw new Error('Manifest must contain plain records');
  seen.add(v);
  let text: string;
  if (Array.isArray(v)) text = '[' + Array.from(v, canonicalVisit, seen).join(',') + ']';
  else {
    const entries = Object.keys(v).sort();
    for (let i = 0; i < entries.length; i++) {
      const k = entries[i];
      entries[i] = JSON.stringify(k) + ':' + canonicalVisit.call(seen, (v as Record<string, unknown>)[k]);
    }
    text = '{' + entries.join(',') + '}';
  }
  seen.delete(v);
  return text;
}

/** Stable manifest JSON. Non-JSON values are errors, never omitted identity inputs. */
export function canonical(value: unknown): string {
  const seen = new Set<object>();
  const text = canonicalVisit.call(seen, value);
  if(isMassFrozenData(value))massCanonicalMemo.set(value as object,text);
  return text;
}
/** Internal coordinate keys are dense triples of primitive strings. Under the
 * same stable standard intrinsics as generation math, native JSON preserves
 * their exact escaping without a recursive walk. Other inputs keep canonical's
 * ordinary validation, getter, iterator and error behavior. */
export function canonicalStringTriple(a: unknown, b: unknown, c: unknown): string {
  const tuple = [a, b, c];
  return typeof a === 'string' && typeof b === 'string' && typeof c === 'string'
    ? JSON.stringify(tuple) : canonical(tuple);
}
// Immutable string inputs recur across independent terrain/reservation queries.
// Bound both tuple count and retained UTF-16 units; this cache is never content
// authority. Eviction only repeats the original arithmetic. Object-like inputs
// retain the original reads, and seed coercion always precedes the lookup.
// As with generated noise, arithmetic assumes stable standard JS intrinsics.
const hashMemo = new Map<number, Map<string, number>>();
const hashMemoOrder: ({ seed: number; text: string } | undefined)[] = new Array(4096);
let hashMemoHead = 0, hashMemoCount = 0, hashMemoUnits = 0;
function rememberHash(text: string, seed: number, value: number): void {
  while (hashMemoCount === hashMemoOrder.length || hashMemoUnits + text.length > 1048576) {
    const old = hashMemoOrder[hashMemoHead]!;
    const bucket = hashMemo.get(old.seed)!;
    bucket.delete(old.text);
    if (!bucket.size) hashMemo.delete(old.seed);
    hashMemoOrder[hashMemoHead] = undefined;
    hashMemoHead = (hashMemoHead + 1) % hashMemoOrder.length;
    hashMemoCount--; hashMemoUnits -= old.text.length;
  }
  let bucket = hashMemo.get(seed);
  if (!bucket) { bucket = new Map(); hashMemo.set(seed, bucket); }
  bucket.set(text, value);
  hashMemoOrder[(hashMemoHead + hashMemoCount) % hashMemoOrder.length] = { seed, text };
  hashMemoCount++; hashMemoUnits += text.length;
}
/** Sampling hash, not a unique ID or security digest. Full coordinate text is
 * hashed; coordinates are never narrowed to a 32-bit integer first. */
export function massHash(text: string, seed = 0x811c9dc5): number {
  let h = seed >>> 0;
  const initial = h, memoizable = typeof text === 'string' && text.length <= 65536;
  if (memoizable) {
    const hit = hashMemo.get(initial)?.get(text);
    if (hit !== undefined) return hit;
  }
  for (let i = 0; i < text.length; i++) h = Math.imul(h ^ text.charCodeAt(i), 0x01000193) >>> 0;
  h ^= h >>> 16; h = Math.imul(h, 0x85ebca6b); h ^= h >>> 13;
  h = Math.imul(h, 0xc2b2ae35); h ^= h >>> 16;
  const result = h >>> 0;
  if (memoizable) rememberHash(text, initial, result);
  return result;
}
/** Oversized digest text bypasses both hash memo lookups. Share only its UTF-16
 * traversal; keep both independent uint32 folds and final avalanche arithmetic.
 * The caller supplies canonical's primitive string under stable JS intrinsics. */
function oversizedMassDigestPair(text: string): string {
  let first = 0x811c9dc5 >>> 0, second = 0x9e3779b9 >>> 0;
  for (let i = 0; i < text.length; i++) {
    const code = text.charCodeAt(i);
    first = Math.imul(first ^ code, 0x01000193) >>> 0;
    second = Math.imul(second ^ code, 0x01000193) >>> 0;
  }
  first ^= first >>> 16; first = Math.imul(first, 0x85ebca6b); first ^= first >>> 13;
  first = Math.imul(first, 0xc2b2ae35); first ^= first >>> 16;
  second ^= second >>> 16; second = Math.imul(second, 0x85ebca6b); second ^= second >>> 13;
  second = Math.imul(second, 0xc2b2ae35); second ^= second >>> 16;
  return (first >>> 0).toString(16).padStart(8, '0') + (second >>> 0).toString(16).padStart(8, '0');
}
export function massDigest(value: unknown): string {
  if(isMassFrozenData(value)){const cached=massDigestMemo.get(value as object);if(cached)return cached;}
  const text = canonical(value);
  const digest=text.length > 65536 ? oversizedMassDigestPair(text)
    : massHash(text).toString(16).padStart(8, '0') + massHash(text, 0x9e3779b9).toString(16).padStart(8, '0');
  if(isMassFrozenData(value))massDigestMemo.set(value as object,digest);
  return digest;
}
export function streamSeed(seed: number, namespace: readonly (string | number)[]): number {
  return massHash(canonical([seed, ...namespace]));
}
export function massRandom(seed: number, namespace: readonly (string | number)[]): Rng {
  return new Rng(streamSeed(seed, namespace));
}
/** Same immutable-data admission, spread across browser tasks by the caller. */
export function* freezeDataSteps(data: unknown): Generator<void, void> {
  if (!data || typeof data !== 'object' || massFrozenData.has(data)) return;
  for (const value of Object.values(data)) yield* freezeDataSteps(value);
  freezeData(data); yield;
}
export function freezeData<T>(data: T): Readonly<T> {
  if (data && typeof data === 'object') {
    if(massFrozenData.has(data))return data;
    for (const v of Object.values(data)) freezeData(v);
    Object.freeze(data);
    const plain=Array.isArray(data)||Object.getPrototypeOf(data)===Object.prototype||Object.getPrototypeOf(data)===null;
    let dense=true;if(Array.isArray(data))for(let i=0;i<data.length;i++)if(!Object.hasOwn(data,i)){dense=false;break;}
    if(plain&&dense&&Object.values(Object.getOwnPropertyDescriptors(data)).every(d=>'value'in d&&(
      d.value===null||typeof d.value==='string'||typeof d.value==='boolean'||typeof d.value==='number'&&Number.isFinite(d.value)||isMassFrozenData(d.value))))massFrozenData.add(data);
  }
  return data;
}
