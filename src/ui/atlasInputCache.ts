/** Small owner-scoped LRU. Keys describe all inputs, including layer and reveal
 * changes; switching worlds releases closures over the old simulation. */
export class AtlasInputCache<T> {
  private owner: object | null = null;
  private entries = new Map<string, T>();
  constructor(private capacity = 4) {}
  get(owner: object, key: string, create: () => T): T {
    if (owner !== this.owner) { this.entries.clear(); this.owner = owner; }
    if (this.entries.has(key)) {
      const value = this.entries.get(key)!;
      this.entries.delete(key); this.entries.set(key, value); return value;
    }
    const value = create(); this.entries.set(key, value);
    while (this.entries.size > this.capacity) this.entries.delete(this.entries.keys().next().value!);
    return value;
  }
}
