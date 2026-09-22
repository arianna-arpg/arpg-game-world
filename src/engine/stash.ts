import type { ItemInstance } from './items';
import { autoPlace, canPlaceAt, overlappingItems, type BoardDims } from './inventory';

/** Storage owns addresses; its caller owns bodies, access and persistence.
 * This lets account collections and character lockers share the same rules. */
export interface StashCell { page: number; x: number; y: number }
export interface StashState { pages: number; cells: Record<string, StashCell>; invested: number }
export interface StashDef {
  id: string;
  board: BoardDims;
  initialPages: number;
  maxPages: number;
  pageCostBase: number;
  accepts(item: ItemInstance): boolean;
}
export interface StashEntry { key: string; item: ItemInstance }
export interface PersonalStash { items: ItemInstance[]; layout: StashState }
export const personalStashEntries = (s: PersonalStash): StashEntry[] => s.items.map(item => ({ key: String(item.uid), item }));
export const emptyStash = (def: StashDef): StashState => ({ pages: def.initialPages, cells: {}, invested: 0 });
export const stashPageCost = (def: StashDef, s: StashState): number => def.pageCostBase * (s.pages - def.initialPages + 1) ** 2;
const validCell = (s: StashState, c: StashCell): boolean => !!c && Number.isInteger(c.page)
  && c.page >= 0 && c.page < s.pages && Number.isInteger(c.x) && Number.isInteger(c.y);
const copyCell = (c: StashCell): StashCell => ({ page: c.page, x: c.x, y: c.y });

export function stashPage(entries: readonly StashEntry[], s: StashState, page: number): ItemInstance[] {
  return entries.flatMap(({ key, item }) => s.cells[key]?.page === page ? [{ ...item, x: s.cells[key].x, y: s.cells[key].y }] : []);
}
export const stashOverflow = (entries: readonly StashEntry[], s: StashState): StashEntry[] => entries.filter(e => !s.cells[e.key]);

/** Restore/retune without loss: preserve legal cells, first-fit the remainder.
 * Items that cannot fit remain recovery-only, never extra deposit capacity. */
export function restoreStash(def: StashDef, entries: readonly StashEntry[], value?: StashState): StashState {
  const s = emptyStash(def);
  if (Number.isInteger(value?.pages)) s.pages = Math.max(def.initialPages, Math.min(def.maxPages, value!.pages));
  if (Number.isSafeInteger(value?.invested)) s.invested = Math.max(0, Math.min(stashPageCost(def, s) - 1, value!.invested));
  for (const e of entries) {
    const c = value?.cells?.[e.key];
    if (c && validCell(s, c) && def.accepts(e.item) && canPlaceAt(stashPage(entries, s, c.page), e.item, c.x, c.y, def.board)) s.cells[e.key] = copyCell(c);
  }
  for (const e of entries) if (!s.cells[e.key] && def.accepts(e.item)) {
    const cell = firstStashFit(def, entries, s, e.item);
    if (cell) s.cells[e.key] = cell;
  }
  return s;
}

export function firstStashFit(def: StashDef, entries: readonly StashEntry[], s: StashState, item: ItemInstance): StashCell | undefined {
  if (!def.accepts(item)) return;
  for (let page = 0; page < s.pages; page++) {
    const trial = { ...item }; delete trial.x; delete trial.y;
    if (autoPlace(stashPage(entries, s, page), trial, def.board)) return { page, x: trial.x!, y: trial.y! };
  }
}

/** A transaction plan, also the UI landing verdict. Supports exact moves,
 * cross-page swaps, and exchanging equipment into a vacated storage cell. */
export function planStashMove(def: StashDef, entries: readonly StashEntry[], s: StashState,
  entry: StashEntry, target?: StashCell, vacate?: string): StashState | undefined {
  if (!def.accepts(entry.item)) return;
  const next: StashState = { ...s, cells: { ...s.cells } };
  const from = s.cells[vacate ?? entry.key];
  delete next.cells[entry.key];
  if (vacate) delete next.cells[vacate];
  // Recovery cannot be turned into a second, unlimited deposit lane.
  const existing = entries.some(e => e.key === entry.key || e.key === vacate);
  if (!existing && stashOverflow(entries, next).length) return;
  const rest = entries.filter(e => e.key !== entry.key && e.key !== vacate);
  if (!target) {
    if (from && canPlaceAt(stashPage(rest, next, from.page), entry.item, from.x, from.y, def.board)) target = from;
    else target = firstStashFit(def, rest, next, entry.item);
  }
  if (!target || !validCell(next, target)) return;
  const page = stashPage(rest, next, target.page);
  const blockers = overlappingItems(page, entry.item, target.x, target.y);
  if (blockers.length > 1) return;
  if (blockers.length) {
    const other = rest.find(e => e.item.uid === blockers[0].uid)!;
    if (!from || vacate) return;
    delete next.cells[other.key];
    if (!canPlaceAt(stashPage(rest, next, target.page), entry.item, target.x, target.y, def.board)) return;
    next.cells[entry.key] = copyCell(target);
    if (!canPlaceAt(stashPage([...rest, entry], next, from.page), other.item, from.x, from.y, def.board)) return;
    next.cells[other.key] = copyCell(from);
  } else {
    if (!canPlaceAt(page, entry.item, target.x, target.y, def.board)) return;
    next.cells[entry.key] = copyCell(target);
  }
  return next;
}
