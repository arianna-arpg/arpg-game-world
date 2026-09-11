/** Account-lived combat facts; encounter state deliberately never enters a save.
 * Callers supply attributable events, rules supply meaning. No class logic here. */
export type DeedEventKind = 'block' | 'evade' | 'hurt' | 'heal' | 'crisis' | 'hit' | 'poise' | 'kill' | 'cast';
export interface DeedEvent {
  kind: DeedEventKind;
  value?: number;
  tags?: readonly string[];
  flags?: readonly string[];
  keys?: readonly string[];
  distance?: number;
  subject?: object;
}
export interface DeedRule {
  id: string;
  event: DeedEventKind;
  mode?: 'count' | 'sum' | 'distinct' | 'subjectMax';
  tagsAny?: readonly string[];
  flagsAll?: readonly string[];
  minDistance?: number;
}
export const deedKey = (id: string): string => `deed:${id}`;

export class DeedTracker {
  private subjects = new WeakMap<object, Map<string, number>>();
  private crisis = false;
  private crisisMaxLife = 0;
  private wounds = 0;
  private readonly byEvent = new Map<DeedEventKind, DeedRule[]>();
  constructor(rules: readonly DeedRule[]) {
    for (const rule of rules) {
      const rows = this.byEvent.get(rule.event) ?? [];
      rows.push(rule);
      this.byEvent.set(rule.event, rows);
    }
  }
  record(ledger: Record<string, number>, event: DeedEvent): boolean {
    let changed = false;
    for (const rule of this.byEvent.get(event.kind) ?? []) {
      if (rule.tagsAny && !rule.tagsAny.some(t => event.tags?.includes(t))) continue;
      if (rule.flagsAll && !rule.flagsAll.every(f => event.flags?.includes(f))) continue;
      if (rule.minDistance !== undefined && (event.distance ?? 0) < rule.minDistance) continue;
      const key = deedKey(rule.id);
      const before = ledger[key] ?? 0;
      let after = before;
      switch (rule.mode ?? 'count') {
        case 'count': after++; break;
        case 'sum': after += Number.isFinite(event.value) ? Math.max(0, event.value!) : 0; break;
        case 'distinct':
          for (const id of new Set(event.keys ?? [])) {
            const seen = `${key}:seen:${id}`;
            if (!ledger[seen]) { ledger[seen] = 1; after++; }
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
      if (after !== before) { ledger[key] = after; changed = true; }
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
  }
}
