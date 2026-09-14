/** Account-lived combat facts; encounter state deliberately never enters a save.
 * Callers supply attributable events, rules supply meaning. No class logic here. */
export type DeedEventKind = 'block' | 'evade' | 'hurt' | 'heal' | 'crisis' | 'hit' | 'poise' | 'kill' | 'cast' | 'indirect';
export interface DeedEvent {
  kind: DeedEventKind;
  value?: number;
  tags?: readonly string[];
  flags?: readonly string[];
  keys?: readonly string[];
  distance?: number;
  subject?: object;
}
export interface DeedFilter {
  event: DeedEventKind;
  tagsAny?: readonly string[];
  flagsAll?: readonly string[];
  minDistance?: number;
}
export interface DeedRule extends DeedFilter {
  id: string;
  mode?: 'count' | 'sum' | 'distinct' | 'subjectMax';
  /** Distinct keys qualify after this many matching events (default one). */
  minOccurrences?: number;
  /** One qualifying response per trigger, within world seconds. */
  after?: DeedFilter & { within: number };
}
export const deedKey = (id: string): string => `deed:${id}`;

/** Re-evaluate saved practice when tuning lowers a per-key requirement.
 * Completed steps are a floor: ownership and already earned credit survive.
 * This does not infer practice from the old one-hit breadth counters. */
export function reconcileDeedProgress(ledger: Record<string, number>, rules: readonly DeedRule[]): void {
  for (const rule of rules) {
    if (rule.mode !== 'distinct' || rule.minOccurrences === undefined) continue;
    const key = deedKey(rule.id), prefix = `${key}:seen:`;
    const qualified = Object.entries(ledger).filter(([k, n]) =>
      k.startsWith(prefix) && Number.isFinite(n) && n >= rule.minOccurrences!).length;
    if (qualified > (ledger[key] ?? 0)) ledger[key] = qualified;
  }
}

function matches(filter: DeedFilter, event: DeedEvent): boolean {
  return filter.event === event.kind
    && (!filter.tagsAny || filter.tagsAny.some(t => event.tags?.includes(t)))
    && (!filter.flagsAll || filter.flagsAll.every(f => event.flags?.includes(f)))
    && (filter.minDistance === undefined || (event.distance ?? 0) >= filter.minDistance);
}

export class DeedTracker {
  private subjects = new WeakMap<object, Map<string, number>>();
  private openings = new Map<string, number>();
  private crisis = false;
  private crisisMaxLife = 0;
  private wounds = 0;
  private readonly byEvent = new Map<DeedEventKind, DeedRule[]>();
  private readonly triggers = new Map<DeedEventKind, DeedRule[]>();
  constructor(rules: readonly DeedRule[]) {
    for (const rule of rules) {
      const rows = this.byEvent.get(rule.event) ?? [];
      rows.push(rule);
      this.byEvent.set(rule.event, rows);
      if (rule.after) {
        const triggers = this.triggers.get(rule.after.event) ?? [];
        triggers.push(rule);
        this.triggers.set(rule.after.event, triggers);
      }
    }
  }
  record(ledger: Record<string, number>, event: DeedEvent, now?: number): boolean {
    let changed = false;
    for (const rule of this.byEvent.get(event.kind) ?? []) {
      if (!matches(rule, event)) continue;
      if (rule.after) {
        const opened = this.openings.get(rule.id);
        if (opened === undefined || now === undefined || !Number.isFinite(now)
          || now < opened || now - opened > rule.after.within) continue;
      }
      const key = deedKey(rule.id);
      const before = ledger[key] ?? 0;
      let after = before;
      let practiced = false;
      switch (rule.mode ?? 'count') {
        case 'count': after++; break;
        case 'sum': after += Number.isFinite(event.value) ? Math.max(0, event.value!) : 0; break;
        case 'distinct':
          for (const id of new Set(event.keys ?? [])) {
            const seen = `${key}:seen:${id}`;
            const needed = rule.minOccurrences ?? 1;
            const count = ledger[seen] ?? 0;
            if (count < needed) {
              ledger[seen] = count + 1;
              practiced = true;
              changed = true; // Partial practice must also survive the save cadence.
              if (count + 1 >= needed) after++;
            }
          }
          break;
        case 'subjectMax': {
          if (!event.subject) break;
          const counts = this.subjects.get(event.subject) ?? new Map<string, number>();
          const n = (counts.get(rule.id) ?? 0) + 1;
          counts.set(rule.id, n);
          this.subjects.set(event.subject, counts);
          after = Math.max(before, n);
          break;
        }
      }
      if (after !== before) {
        ledger[key] = after; changed = true;
      }
      if (rule.after && (after !== before || practiced)) this.openings.delete(rule.id);
    }
    // Arm after scoring: an event cannot answer its own opening. Repeated
    // triggers refresh one window; they never stockpile responses for a cleave.
    if (now !== undefined && Number.isFinite(now)) {
      for (const rule of this.triggers.get(event.kind) ?? []) {
        if (matches(rule.after!, event)) this.openings.set(rule.id, now);
      }
    }
    return changed;
  }
  /** Only enemy-caused loss is eligible for mending; self costs grant no budget. */
  hurt(before: number, after: number, maxLife: number, enterFraction: number): number {
    const lost = Math.max(0, before - Math.max(0, after));
    if (after <= 0) { this.reset(); return 0; }
    this.wounds += lost;
    if (lost > 0 && before > maxLife * enterFraction && after <= maxLife * enterFraction) {
      this.crisis = true;
      this.crisisMaxLife = Math.max(this.crisisMaxLife, maxLife);
    }
    return lost;
  }
  heal(amount: number): number {
    const eligible = Math.min(this.wounds, Math.max(0, amount));
    this.wounds -= eligible;
    return eligible;
  }
  recovered(life: number, maxLife: number, recoverFraction: number): boolean {
    if (!this.crisis || life < Math.max(maxLife, this.crisisMaxLife) * recoverFraction) return false;
    this.crisis = false;
    this.crisisMaxLife = 0;
    return true;
  }
  reset(): void {
    this.crisis = false;
    this.crisisMaxLife = 0;
    this.wounds = 0;
    this.subjects = new WeakMap();
    this.openings.clear();
  }
}
