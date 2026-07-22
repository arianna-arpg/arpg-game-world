// ---------------------------------------------------------------------------
// VENDORS — the counter registry behind the Vendor screen.
//
// A vendor is one row here: who they are, WHEN they're at hand (proximity
// gate), what they stock, what currency prices it, which buy intent moves
// the goods — and whether their counter also BUYS YOUR SCRAP (salvage: the
// sell half of the essence economy; flipping the scrap wheel in the panel
// turns clicks into salvages, exactly as at the station). The Vendor screen
// renders every near vendor as a section, so a future NPC who deals only in
// belts, or a Vault unlock that opens a relic-monger, is ONE more row — the
// panel, the dwell, and the wiring never change.
//
// Functions take the World (type-only import — no runtime cycle); prices
// resolve through world methods so tunables stay where they live.
// ---------------------------------------------------------------------------

import type { EssenceCost } from './essences';
import type { Seat, VendorEntry, World } from '../engine/world';
import { FEATURE } from '../meta/account';

/** THE PATRON'S HOLD — every counter-hold tunable in one place (the MERC_CFG
 *  stance: the law lives beside the registry it governs, world.ts reads it).
 *  Holds are per-counter state persisted in WorldStateSave.vendorHolds under
 *  the counter's hold key. */
export const VENDOR_CFG = {
  /** Which level BRACKET the counters' GEM rolls read (the minDropLevel
   *  gate): 'shopper' = max(the counter's ground, the local hero) — the
   *  gear shelf's own anchoring ("rolls at the buyer's level"), so the gem
   *  half of the counter grows with the shopper instead of staying
   *  starter-bracket forever; 'zone' = the ground alone (the pre-hold
   *  behavior, verbatim). World DROPS never read this — it brackets only
   *  the shelves and THE STANDING ORDER's odds (one bracket, one truth). */
  gemBracket: 'shopper' as 'shopper' | 'zone',
  /** The support-gem share of each gem slot once Brandt sells supports
   *  (FEATURE.BRANDT_SELL_SUPPORTS) — the shelf builder's roll AND the
   *  standing order's odds read this ONE number (they can never disagree). */
  supportShare: 0.25,
  lock: {
    /** The reserve LADDER: each owned Vault rung grants one more lockable
     *  slot at every holding counter (the cap = owned rungs, counted across
     *  that counter's whole shelf). Raising the ceiling to N is appending a
     *  row here — unlocks.ts DERIVES its catalog rows (ids, chaining, these
     *  costs) from THIS list, and World.vendorLockCap folds it; no literal
     *  anywhere counts to three. */
    ladder: [
      { flag: FEATURE.VENDOR_LOCK_1, cost: 80 },
      { flag: FEATURE.VENDOR_LOCK_2, cost: 160 },
      { flag: FEATURE.VENDOR_LOCK_3, cost: 280 },
    ] as readonly { flag: string; cost: number }[],
  },
  commission: {
    /** The Vault price of THE STANDING ORDER's rung (the catalog row is
     *  derived, like the ladder's). */
    cost: 240,
    /** Genuine mints of a gem the DROP INDEX must have witnessed before the
     *  account may commission it (gemDropKey — knowledge earned in the
     *  field, the bestiary's own doctrine). */
    need: 3,
    /** Lifetime genuine mints, ALL gems folded (LEDGER_GEMDROP_TOTAL), the
     *  rung's discovery gate — an index must have seen loot to mean much. */
    discoverTotal: 25,
    /** Multiplier over the counter's TRUE per-restock odds (1 = the honest
     *  shelf distribution; a kindness dial, never a different distribution). */
    oddsMult: 1,
    /** Longest away-catchup resolved per arming, in restock beats — a
     *  bound on the beat loop, generous past any real session. */
    maxCatchup: 4000,
  },
} as const;

/** Which hold services a counter offers (absent = a plain counter). Pure
 *  capability data: the delver's per-descent shelf opts out of persistence
 *  by simply not wearing the flags. */
export interface VendorHoldCaps {
  /** Shelf rows may be RESERVED (the lock checkbox; capacity = the ladder). */
  locks?: boolean;
  /** THE STANDING ORDER: one pre-selected gem watched for across restocks. */
  commission?: boolean;
}

export interface VendorPrice {
  /** Essence costs, ALL required (a one-tint price is a list of one) — the
   *  mixed-essence seam that lets a shelf item ask coarse AND its tint. */
  essences?: EssenceCost[];
  echoes?: number;
}

export interface VendorDef {
  id: string;
  label: string;
  accent: string;
  bg: string;
  /** Is this counter at hand for the seat? */
  near(w: World, seat: Seat): boolean;
  stock(w: World): VendorEntry[];
  priceOf(w: World, entry: VendorEntry): VendorPrice;
  /** Which META intent buys stock index N. */
  buyT: 'buyVendor' | 'buyChandler' | 'buyDelver';
  /** This counter also buys scrap (the SELL lane: anything → coarse essence)
   *  — WHEN the predicate holds. A gate as data: Brandt's opens with the
   *  Vault's Salvage Station; a future fence could open on reputation. */
  salvage?: (w: World) => boolean;
  /** Shown in place of the scrap wheel while `salvage` says no — the counter
   *  explains its own lock (and where the key is sold). */
  salvageLocked?: string;
  /** Contextual header line (restock countdown, held echoes …). */
  headline?(w: World): string;
  /** THE PATRON'S HOLD capabilities (absent = plain counter, nothing persists). */
  holds?: VendorHoldCaps;
  /** The persisted hold's key — default the vendor id (town singletons). A
   *  per-site counter (a future delver hold) would scope itself
   *  `${id}@${w.zone.id}`; the worldstate sanitizer already tolerates both
   *  spellings. */
  holdKey?(w: World): string;
}

export const VENDORS: VendorDef[] = [
  {
    id: 'brandt', label: "BRANDT'S WARES", accent: '#e8c87a', bg: 'rgba(232,200,122,0.05)',
    near: (w, seat) => w.nearSmith(seat),
    stock: w => w.vendorStock,
    priceOf: (w, e) => ({ essences: w.vendorPrice(e) }),
    buyT: 'buyVendor',
    // The smith BUYS scrap (sell lane: coarse by quality) — but only once the
    // account owns the Salvage Station: one Vault purchase opens both doors.
    salvage: w => w.salvageUnlocked(),
    salvageLocked: 'Brandt eyes your scrap, shrugs — the Vault\'s SALVAGE STATION would teach him its worth.',
    headline: w => `restock ${Math.max(0, Math.ceil(w.vendorRestockAt - w.time))}s`,
    holds: { locks: true, commission: true },
  },
  {
    // THE CHANDLER (data/harborholds.ts service row): a harborhold's port
    // counter — its OWN stock on the shared restock clock, essence-priced
    // like Brandt's. Stands only in an OPEN town at prosperity ≥ its rung.
    id: 'chandler', label: "CORMAC'S CHANDLERY", accent: '#c8b06e', bg: 'rgba(200,176,110,0.05)',
    near: (w, seat) => w.nearChandler(seat),
    stock: w => w.chandlerStock,
    priceOf: (w, e) => ({ essences: w.vendorPrice(e) }),
    buyT: 'buyChandler',
    headline: w => `restock ${Math.max(0, Math.ceil(w.vendorRestockAt - w.time))}s`,
    holds: { locks: true, commission: true },
  },
  {
    id: 'delver', label: "THE DELVER'S WARES", accent: '#7fe0d8', bg: 'rgba(127,224,216,0.06)',
    near: (w, seat) => w.nearDelver(seat),
    stock: w => w.descentStock,
    priceOf: w => ({ echoes: w.delverPrice() }),
    buyT: 'buyDelver',
    headline: w => `◈ ${w.descentEchoes} Echoes held`,
  },
];
