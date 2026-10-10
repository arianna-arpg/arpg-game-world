import { Rng } from '../core/rng';
// Only plain data recursively frozen HERE can be memoized. Object.freeze on an
// outer record alone says nothing about its children or live accessor values.
const massFrozenData=new WeakSet<object>();
const massCanonicalMemo=new WeakMap<object,string>(),massDigestMemo=new WeakMap<object,string>();
export function isMassFrozenData(value:unknown):boolean{return !!value&&typeof value==='object'&&massFrozenData.has(value);}

/** Stable manifest JSON. Non-JSON values are errors, never omitted identity inputs. */
export function canonical(value: unknown): string {
  const seen = new Set<object>();
  const visit = (v: unknown): string => {
    if (v === null || typeof v === 'boolean' || typeof v === 'string') return JSON.stringify(v);
    if (typeof v === 'number' && Number.isFinite(v)) return JSON.stringify(v);
    if (typeof v !== 'object' || v === null) throw new Error('Manifest must contain finite JSON data');
    if(massFrozenData.has(v)){const cached=massCanonicalMemo.get(v);if(cached!==undefined)return cached;}
    if (seen.has(v)) throw new Error('Manifest must not contain cycles');
    if (!Array.isArray(v) && Object.getPrototypeOf(v) !== Object.prototype && Object.getPrototypeOf(v) !== null)
      throw new Error('Manifest must contain plain records');
    seen.add(v);
    const text = Array.isArray(v) ? '[' + Array.from(v, visit).join(',') + ']'
      : '{' + Object.keys(v).sort().map(k => JSON.stringify(k) + ':' + visit((v as Record<string, unknown>)[k])).join(',') + '}';
    seen.delete(v);
    return text;
  };
  const text=visit(value);
  if(isMassFrozenData(value))massCanonicalMemo.set(value as object,text);
  return text;
}
/** Sampling hash, not a unique ID or security digest. Full coordinate text is
 * hashed; coordinates are never narrowed to a 32-bit integer first. */
export function massHash(text: string, seed = 0x811c9dc5): number {
  let h = seed >>> 0;
  for (let i = 0; i < text.length; i++) h = Math.imul(h ^ text.charCodeAt(i), 0x01000193) >>> 0;
  h ^= h >>> 16; h = Math.imul(h, 0x85ebca6b); h ^= h >>> 13;
  h = Math.imul(h, 0xc2b2ae35); h ^= h >>> 16;
  return h >>> 0;
}
export function massDigest(value: unknown): string {
  if(isMassFrozenData(value)){const cached=massDigestMemo.get(value as object);if(cached)return cached;}
  const text = canonical(value);
  const digest=massHash(text).toString(16).padStart(8, '0') + massHash(text, 0x9e3779b9).toString(16).padStart(8, '0');
  if(isMassFrozenData(value))massDigestMemo.set(value as object,digest);
  return digest;
}
export function streamSeed(seed: number, namespace: readonly (string | number)[]): number {
  return massHash(canonical([seed, ...namespace]));
}
export function massRandom(seed: number, namespace: readonly (string | number)[]): Rng {
  return new Rng(streamSeed(seed, namespace));
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
