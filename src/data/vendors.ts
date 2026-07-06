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
  essence?: EssenceCost;
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
  /** This counter also buys scrap: the panel offers SALVAGE mode here. */
  salvage?: boolean;
  /** Contextual header line (restock countdown, held echoes …). */
  headline?(w: World): string;
}

export const VENDORS: VendorDef[] = [
  {
    id: 'brandt', label: "BRANDT'S WARES", accent: '#e8c87a', bg: 'rgba(232,200,122,0.05)',
    near: (w, seat) => w.nearSmith(seat),
    stock: w => w.vendorStock,
    priceOf: (w, e) => ({ essence: w.vendorPrice(e) }),
    buyT: 'buyVendor',
    salvage: true, // the smith breaks scrap as gladly as he sells — one-stop shop
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
