// ---------------------------------------------------------------------------
// THE SUITES — station dialogs that belong together, as data.
//
// A counter's dialog (the folio leaf 'vendor') is an ANCHOR: when it comes to
// the front, the folio SUMMONS every member station that STANDS in this zone
// — raised here and genuinely unlocked (World.stationStands) — as quiet tabs
// behind it, so the player at Brandt's counter can buy, sell, break, craft
// and commune without walking the yard. THE REACH LAW (World.stationReach)
// is the engine half: a member's WORK is allowed from its anchor's counter
// exactly as at the station itself — one predicate for every action gate,
// never a view-only tab. Summoned members arrive quiet (never fresh), never
// take the front, close WITH their anchor (one Esc leaves the workbench), and
// a member the player dismissed stays dismissed while the anchor stands.
//
// The engine folds counters × members × "stands here" (World.suiteSummons);
// the UI only knows how to open each station for the seat at the counter.
// A new suite is one row; a new member station is one id on the union type
// plus its stands/near reads in world.ts.
// ---------------------------------------------------------------------------

/** Station dialogs a suite may summon. Each has a `has*` (stands here) and a
 *  `near*` (at it) read on World, folded by stationStands / stationNear. */
export type SuiteStation = 'salvage' | 'oracle';

export interface SuiteDef {
  id: string;
  /** The dialog whose front summons the members. Counters today; a future
   *  anchor kind is a type extension here plus its near-read in suitesAt. */
  anchor: 'vendor';
  /** Which counters anchor it (VendorDef ids); omit = every counter. */
  counters?: readonly string[];
  /** Summoned in this order (tab order) when they stand in the zone. */
  members: readonly SuiteStation[];
}

/** THE CRAFTING SUITE: Brandt's counter gathers the breaker's bench and the
 *  Oracle stone. The bench and the stone stand only in Lastlight, so a port's
 *  chandler summons nothing — no zone list, the stands-reads decide. */
export const SUITES: SuiteDef[] = [
  { id: 'crafting', anchor: 'vendor', counters: ['brandt'], members: ['salvage', 'oracle'] },
];

export function registerSuite(def: SuiteDef): void {
  if (SUITES.some(s => s.id === def.id)) throw new Error(`suite '${def.id}' registered twice`);
  SUITES.push(def);
}
