import { isOwnedTerrainRecord } from './ownedTerrain';

// Execution policy only. A stream captures this choice when constructed;
// changing the default never replaces storage in an existing stream.
let dependencyCacheDefault = false;
export function installMassDependencyCacheDefault(enabled: boolean): void { dependencyCacheDefault = enabled === true; }
export function massDependencyCacheDefault(): boolean { return dependencyCacheDefault; }

export type DependencyCacheVisitor = (key: unknown, value: unknown) => void;
/** A stable, side-effect-free predicate over one scanner's permanent certificate
 * WeakSet. A different predicate starts a fresh classification domain. */
export type DependencyCacheCertificate = (value: object) => boolean;

interface Domain<K, V> {
  certificate: DependencyCacheCertificate;
  approved: WeakSet<object>;
  /** Null means that the original complete traversal is still required. */
  frontier: Map<K, V> | null;
}
interface FrontierFrame<K, V> { key: K; continuation?: MapIterator<[K, V]> }

const scanners = new WeakMap<object,
  (visit: DependencyCacheVisitor, certificate: DependencyCacheCertificate) => void>();

/** Recognizes only the real owner, never a property, prototype or Proxy claim.
 * The caller supplies the ordinary Map-entry traversal, including numeric keys.
 * This is a collection adapter, not an exemption for its enclosing owner. */
export function scanOwnedDependencyCache(value: object, visit: DependencyCacheVisitor,
  certificate: DependencyCacheCertificate): boolean {
  const scan = scanners.get(value);
  if (!scan) return false;
  scan(visit, certificate);
  return true;
}

/** A cache owns both its storage and its dependency frontier. The backing Map
 * never escapes, so Map.prototype mutators cannot bypass frontier maintenance.
 * Only already-certified, internally constructed ordinary records may disappear
 * from the frontier. Unknown values and possible dependency keys stay live.
 * The owner must expose this exact identity: wrapping the cache itself in a
 * Proxy is unsupported because generic reflection cannot discover private
 * storage. This does not restrict Proxy keys/values, which retain full fallback.
 * MassStream keeps the cache private and does not publish a wrapping Proxy. */
export class OwnedDependencyCache<K, V> implements Iterable<[K, V]> {
  #data = new Map<K, V>();
  #domain: Domain<K, V> | undefined;
  #scanDepth = 0;
  #scanChanged = false;
  #frontierFrame: FrontierFrame<K, V> | undefined;

  constructor(entries?: Iterable<readonly [K, V]> | null) {
    scanners.set(this, (visit, certificate) => this.#scan(visit, certificate));
    if (entries !== undefined && entries !== null)
      for (const [key, value] of entries) this.set(key, value);
  }

  get size(): number { return this.#data.size; }
  has(key: K): boolean { return this.#data.has(key); }
  get(key: K): V | undefined { return this.#data.get(key); }

  /** Move an existing unchanged entry to the end, as native get/delete/set.
   * Membership already encodes whether this key needs traversal; promotion
   * neither admits a new value nor grants a certificate. */
  promote(key: K): boolean {
    const value = this.#data.get(key);
    if (value === undefined && !this.#data.has(key)) return false;
    this.#preserveContinuation();
    this.#data.delete(key);
    this.#data.set(key, value as V);
    const frontier = this.#domain?.frontier;
    if (frontier?.delete(key)) frontier.set(key, value as V);
    return true;
  }

  set(key: K, value: V): this {
    this.#preserveContinuation();
    const domain = this.#domain;
    if (domain?.frontier) {
      if (!this.#needsVisit(key, value, domain)) domain.frontier.delete(key);
      else if (!domain.frontier.has(key) && this.#data.has(key)) {
        // Replacing an omitted entry must not move its original Map position.
        domain.frontier = null;
      } else domain.frontier.set(key, value);
    }
    this.#data.set(key, value);
    return this;
  }

  delete(key: K): boolean {
    this.#preserveContinuation();
    this.#domain?.frontier?.delete(key);
    return this.#data.delete(key);
  }

  clear(): void {
    this.#preserveContinuation();
    this.#data.clear();
    this.#domain?.frontier?.clear();
  }

  keys(): MapIterator<K> { return this.#data.keys(); }
  values(): MapIterator<V> { return this.#data.values(); }
  entries(): MapIterator<[K, V]> { return this.#data.entries(); }
  [Symbol.iterator](): MapIterator<[K, V]> { return this.#data.entries(); }

  /** Only a callback can mutate this synchronous scan. Before its first mutation,
   * park a native iterator immediately after the still-present current key.
   * That iterator then supplies the original Map's live continuation, including
   * replacements, delete/reinsert and clear. Ordinary cache traffic pays no row
   * allocation or insertion counter; this linear fallback is deliberately rare. */
  #preserveContinuation(): void {
    if (this.#scanDepth > 0) this.#scanChanged = true;
    const frame = this.#frontierFrame;
    if (!frame || frame.continuation) return;
    const iterator = this.#data.entries();
    for (let next = iterator.next(); !next.done; next = iterator.next()) {
      const key = next.value[0];
      // Map keys use SameValueZero, including NaN and signed zero.
      if (key === frame.key || key !== key && frame.key !== frame.key) break;
    }
    frame.continuation = iterator;
  }

  #needsVisit(key: K, value: V, domain: Domain<K, V>): boolean {
    return typeof key === 'number' || key !== null && typeof key === 'object'
      || value === null || typeof value !== 'object' || !domain.approved.has(value);
  }

  #visit(key: K, value: V, visit: DependencyCacheVisitor, domain: Domain<K, V>): void {
    visit(key, value);
    if (value !== null && typeof value === 'object' && isOwnedTerrainRecord(value)
      && domain.certificate(value)) {
      domain.approved.add(value);
      // The callback may replace, delete or reinsert this same key.
      // Reinsertions of this exact approved immutable value are safe to omit;
      // numeric/object keys still require their independent ordinary traversal.
      // V3b: a cold scan has no existing frontier to prune. This value is now
      // approved, so only dependency keys can keep it active. The captured
      // entry still occupies its key unless a callback mutated or reentered.
      if (this.#domain === domain && domain.frontier
        && typeof key !== 'number' && (key === null || typeof key !== 'object')
        && (!this.#scanChanged || this.#data.get(key) === value)) domain.frontier.delete(key);
    }
  }

  #scan(visit: DependencyCacheVisitor, certificate: DependencyCacheCertificate): void {
    // A nested scan may earn new certificates even without mutating the Map.
    // Only the outer entry resets this flag; nested exits cannot clear it.
    this.#scanChanged = this.#scanDepth > 0;
    let domain = this.#domain;
    if (!domain || domain.certificate !== certificate) {
      this.#preserveContinuation();
      domain = { certificate, approved: new WeakSet(), frontier: null };
      this.#domain = domain;
    }
    this.#scanDepth++;
    try {
      let continuation: MapIterator<[K, V]> | undefined;
      const frontier = this.#scanDepth === 1 ? domain.frontier : null;
      if (frontier) {
        const frame: FrontierFrame<K, V> = { key: undefined as K };
        try {
          for (const [key, value] of frontier) {
            frame.key = key; this.#frontierFrame = frame;
            this.#visit(key, value, visit, domain);
            if (frame.continuation || this.#domain !== domain || domain.frontier !== frontier) break;
          }
        } finally { if (this.#frontierFrame === frame) this.#frontierFrame = undefined; }
        continuation = frame.continuation;
        if (!continuation && this.#domain === domain && domain.frontier === frontier) return;
      }
      // Cold/reentrant scans and a mutated frontier all use real Map iterators.
      const next = this.#scanDepth === 1 && !frontier ? new Map<K, V>() : undefined;
      for (const [key, value] of continuation ?? this.#data.entries()) {
        this.#visit(key, value, visit, domain);
        // Publish only after the full original traversal succeeds. A callback
        // mutation/reentry invalidates the inline result and takes the old full
        // rebuild. Approval can only grow: a later alias may leave an earlier
        // certified wrapper here. Each retained alias then costs at most one
        // extra permanent-certificate hit before #visit removes it; this is a
        // conservative frontier, not necessarily the smallest possible one.
        if (next && !this.#scanChanged && this.#needsVisit(key, value, domain)) next.set(key, value);
      }
      if (this.#domain === domain && this.#scanDepth === 1) {
        if (next && !this.#scanChanged) domain.frontier = next;
        else {
          const rebuilt = new Map<K, V>();
          for (const [key, value] of this.#data)
            if (this.#needsVisit(key, value, domain)) rebuilt.set(key, value);
          domain.frontier = rebuilt;
        }
      }
    } finally { this.#scanDepth--; }
  }
}
