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
  buyT: 'buyVendor' | 'buyDelver';
  /** This counter also buys scrap (the SELL lane: anything → coarse essence)
   *  — WHEN the predicate holds. A gate as data: Brandt's opens with the
   *  Vault's Salvage Station; a future fence could open on reputation. */
  salvage?: (w: World) => boolean;
  /** Shown in place of the scrap wheel while `salvage` says no — the counter
   *  explains its own lock (and where the key is sold). */
  salvageLocked?: string;
  /** Contextual header line (restock countdown, held echoes …). */
  headline?(w: World): string;
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
