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
import type { GateRow } from '../meta/gates';

/** One rung of THE BROADER-WARES ladder: the flag ownership rides, the Vault
 *  price, and what the rung ADDS to every counter's stock — gem slots on the
 *  Gems tab, rolled pieces in the Wares grid. `gate` is the GATEWORK seam
 *  (meta/gates.ts): ANY listed avenue held opens the rung for purchase — the
 *  unlocks OF the unlocks, authored per rung, fulfilled in the player's own
 *  order. unlocks.ts DERIVES the catalog rows (ids, chaining, tease cards,
 *  level-milestone stamps) from THIS list; appending a rung here grows the
 *  whole family with no edit anywhere else. */
export interface WaresRung {
  flag: string;
  cost: number;
  /** Gem slots this rung adds to the Gems tab's shelf. */
  gems: number;
  /** Rolled gear pieces this rung adds to the Wares grid. */
  gear: number;
  /** GATEWORK avenues (any-of) that must open before this rung sells. */
  gate?: readonly GateRow[];
}

/** A counter tab: the face the panel renders. `unlock` seals the tab behind
 *  an account feature flag — sealed tabs stay VISIBLE (a named, clickable
 *  face that says where the key is sold); absent = open from the first day. */
export interface VendorTabSpec {
  id: 'wares' | 'gems';
  unlock?: string;
}

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
  /** THE BEAT LAW — the counters' one clock. Restocks land on the lattice
   *  floor(worldTime / restockSeconds()): the panel countdown, the live
   *  re-roll, the standing order's away-resolution and the shelf's own
   *  seed all read the SAME beat — no second clock to drift against.
   *  baseSec is deliberately unhurried (a restock should be an EVENT the
   *  player plans around, never background noise); the RUSH ladder below
   *  shortens the beat per owned rung, floored at minSec whatever the
   *  ladder grows to. unlocks.ts DERIVES the catalog rows (Rush Order
   *  I/II — rung 1 wears the LEGACY brandt_fast_restock flag, so accounts
   *  that bought the old 15s rush keep their edge in the new economy). */
  restock: {
    baseSec: 300,
    minSec: 60,
    ladder: [
      { flag: FEATURE.BRANDT_FAST_RESTOCK, cost: 100, cutSec: 60 },
      { flag: FEATURE.VENDOR_RESTOCK_2, cost: 220, cutSec: 60 },
    ] as readonly { flag: string; cost: number; cutSec: number }[],
  },
  /** The support-gem share of each gem slot once Brandt sells supports
   *  (FEATURE.BRANDT_SELL_SUPPORTS) — the shelf builder's roll AND the
   *  standing order's odds read this ONE number (they can never disagree). */
  supportShare: 0.25,
  /** THE TRADE GATE: no counter SELLS until every listed avenue holds (all-of;
   *  the default asks one thing — the account owns the Salvage Station, the
   *  essence economy's front door). Browsing stays free: the dwell opens the
   *  panel, the stock shows, the hint names the key. World.vendorTradeRefusal
   *  is the ONE predicate — engine buy handlers refuse through it and the
   *  panel disables through it, same words everywhere. A counter opts out
   *  with VendorDef.tradeGate === false (the delver's echo shelf: echoes are
   *  earned in-descent, outside this economy by construction). */
  trade: {
    gate: [{ feature: FEATURE.SALVAGE_STATION, label: 'own the Salvage Station' }] as readonly GateRow[],
    hint: 'You have no way to pay — essence means nothing to you yet. The Vault\'s SALVAGE STATION teaches worth.',
  },
  /** THE BROADER-WARES LADDER (see WaresRung): rung 1 wears the LEGACY flag
   *  (accounts that bought "Brandt: +2 Wares" own it outright — ownership
   *  rides flags, never catalog ids); rung 3 debuts the GATEWORK: level 15,
   *  OR a vocation completed, OR a quest turned in — whichever the player's
   *  own road crosses first. baseGems is the shelf every account starts
   *  with; the gear base is VENDOR_ITEM_CFG.slots (the shelf's own home). */
  wares: {
    baseGems: 4,
    ladder: [
      { flag: FEATURE.BRANDT_EXTRA_GEMS, cost: 60,  gems: 2, gear: 1 },
      { flag: FEATURE.VENDOR_WARES_2,    cost: 140, gems: 1, gear: 2 },
      { flag: FEATURE.VENDOR_WARES_3,    cost: 260, gems: 1, gear: 2,
        gate: [{ level: 15 }, { vocation: true }, { quest: true }] },
    ] as readonly WaresRung[],
  },
  /** THE COUNTER GLASS: every counter's rolled GEAR packs into a real grid
   *  (the player bag's own cell law — footprints, first-fit, drawn == held),
   *  these dims for every counter unless a VendorDef.grid overrides. Sized
   *  so the widest ladder + the largest base footprint can NEVER overflow —
   *  balance/probe_vendorlocker.ts derives the worst case from the catalog
   *  and fails the build if content outgrows the glass. */
  gearGrid: { w: 12, h: 6 },
  /** The default tab faces (VendorDef.tabs overrides per counter): the Wares
   *  grid opens first — equippable goods are the counter's first face — and
   *  the Gems tab stands SEALED until the account owns THE GEM COUNTER
   *  (FEATURE.VENDOR_GEMS): visible, named, pointing at the Vault. */
  tabs: {
    default: [{ id: 'wares' }, { id: 'gems', unlock: FEATURE.VENDOR_GEMS }] as readonly VendorTabSpec[],
    gemsSealedCopy: 'The gem case is shuttered — its glass dark. The Vault\'s GEM COUNTER unlock opens it at every market you\'ll ever trade in.',
    /** The terse float the ENGINE refuses a sealed-case buy with (failNote —
     *  the panel face carries the long copy above; two surfaces, one config). */
    gemsSealedNote: 'the gem case is sealed',
  },
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
     *  field, the bestiary's own doctrine). The SAME threshold gates the
     *  Vault row's surfacing (a gemdrop:* prefix avenue in unlocks.ts): the
     *  standing order sells exactly when at least one gem is orderable —
     *  never a purchase with nothing to name. */
    need: 3,
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
  /** The counter's tab faces (absent = VENDOR_CFG.tabs.default: the Wares
   *  grid + the sealed Gems tab). A counter that deals only in gems lists
   *  one face and, by listing it BARE, opts out of the account seal — the
   *  delver's echo shelf. */
  tabs?: readonly VendorTabSpec[];
  /** The Wares grid dims (absent = VENDOR_CFG.gearGrid). */
  grid?: { w: number; h: number };
  /** false = THE TRADE GATE never binds this counter (the delver: echoes are
   *  earned in-descent, outside the essence economy by construction). */
  tradeGate?: false;
  /** The persisted hold's key — default the vendor id (town singletons). A
   *  per-site counter (a future delver hold) would scope itself
   *  `${id}@${w.zone.id}`; the worldstate sanitizer already tolerates both
   *  spellings. */
  holdKey?(w: World): string;
}

/** The countdown's clock face — m:ss above a minute, bare seconds below.
 *  ONE formatter: both counter headlines and any future clock read it. */
export function fmtRestock(sec: number): string {
  const s = Math.max(0, Math.ceil(sec));
  return s >= 60 ? `${Math.floor(s / 60)}:${String(s % 60).padStart(2, '0')}` : `${s}s`;
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
    headline: w => `restock ${fmtRestock(w.vendorRestockAt - w.time)}`,
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
    headline: w => `restock ${fmtRestock(w.vendorRestockAt - w.time)}`,
    holds: { locks: true, commission: true },
  },
  {
    id: 'delver', label: "THE DELVER'S WARES", accent: '#7fe0d8', bg: 'rgba(127,224,216,0.06)',
    near: (w, seat) => w.nearDelver(seat),
    stock: w => w.descentStock,
    priceOf: w => ({ echoes: w.delverPrice() }),
    buyT: 'buyDelver',
    headline: w => `◈ ${w.descentEchoes} Echoes held`,
    // The descent's shelf is gems ALONE (its arm site rolls no gear — the
    // one face below is the whole counter), echo-priced outside the essence
    // economy: no trade gate, no account seal. Deliberate, not omission.
    tabs: [{ id: 'gems' }],
    tradeGate: false,
  },
];
