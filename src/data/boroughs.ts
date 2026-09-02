// ---------------------------------------------------------------------------
// BOROUGHS — the town-side half of the Borough package: LASTLIGHT'S POPULATION.
//
// Villagers saved at a borough emigrate to Lastlight and the run's population
// counter grows (it lives on the BoroughField overlay and rides the world
// save). Population is designed as an open ECONOMIC INPUT: any system may read
// `world.sim.boroughField?.population` and scale itself by a curve declared
// HERE — the first consumer is Brandt's shelf (a fuller town attracts finer
// wares), and future consumers (scouting parties, town-build gates, new
// settlements) should follow the same shape: one exported curve per consumer,
// tuned in this file, never inline in the engine.
//
// The in-zone event's own numbers (folk, muster, arming, assault) live on the
// package def (packages/defs/borough.ts) — this file is only what the TOWN
// reads, kept engine-importable without touching the package layer.
// ---------------------------------------------------------------------------

import type { ItemRarity } from '../engine/items';
import { VENDOR_ITEM_CFG } from './essences';
import { LEDGER_SOULS_SHELTERED, type Account } from '../meta/account';
import { gateMet, type GateRow } from '../meta/gates';
import { townSiteAt, type TownSiteId } from './townBuild';

export const POPULATION_CFG = {
  /** Lastlight's founding souls (Brandt, Mireille, Aldric, Weslan, Soraya,
   *  and the keeper of the light) — the DISPLAY floor the refugee count sits
   *  on. Perk curves read the refugee count itself, not this. */
  base: 6,

  /** BRANDT'S PROSPERITY CURVE — how the shelf richens as the town fills.
   *  Weights are relative (they sit beside VENDOR_ITEM_CFG.rarityWeights'
   *  commons), so growth shifts the MIX rather than inflating the shelf. */
  vendor: {
    /** Roll weight added per refugee, by rarity. */
    perPop: { magic: 0.9, rare: 0.6 } as Partial<Record<ItemRarity, number>>,
    /** Legends reach the counter only once the town is truly a town: below
     *  this population uniques keep their authored weight (0 — found, not
     *  bought); at and past it, each further soul adds uniquePerPop. */
    uniqueAt: 10,
    uniquePerPop: 0.2,
    /** Ceilings per rarity so a metropolis never drowns the commons. */
    caps: { magic: 70, rare: 40, unique: 6 } as Partial<Record<ItemRarity, number>>,
  },
};

/** Brandt's live rarity table: the authored VENDOR_ITEM_CFG.rarityWeights
 *  lifted by the prosperity curve at the given refugee population. Pure —
 *  buildVendorStock passes the result straight into rollItem. */
export function boroughVendorWeights(population: number): Partial<Record<ItemRarity, number>> {
  const base = VENDOR_ITEM_CFG.rarityWeights;
  if (population <= 0) return base;
  const v = POPULATION_CFG.vendor;
  const out: Partial<Record<ItemRarity, number>> = { ...base };
  for (const [rarity, per] of Object.entries(v.perPop) as [ItemRarity, number][]) {
    const cap = v.caps[rarity] ?? Infinity;
    out[rarity] = Math.min(cap, (out[rarity] ?? 0) + per * population);
  }
  const past = population - v.uniqueAt;
  if (past >= 0) {
    out.unique = Math.min(v.caps.unique ?? Infinity, (out.unique ?? 0) + v.uniquePerPop * (past + 1));
  }
  return out;
}

// ---------------------------------------------------------------------------
// THE RESIDENTS — the second town-side consumer (docs/design/town-growth.md
// v2): the souls the Boroughs send home TAKE UP RESIDENCE. Each row is one
// family: a cottage site in the ward (townBuild TOWN_SITES — the ground
// stands from the tier that authors it), an open GATE in the gatework's own
// vocabulary (any-of: the account's lifetime sheltered count is the debut
// avenue; a quest, a level, another unlock are one row each), the body that
// stands at the door and the line it speaks. World.loadZone seats every row
// whose gate holds AND whose cottage exists at the town's tier — a family
// with no house yet waits (the map pin already counts them); nothing here
// is saved: the town re-lays from the account at every load.
// Names, lines and thresholds are DIALs (unblessed).
// ---------------------------------------------------------------------------

export interface TownResidentRow {
  id: string;
  /** The family's spoken name (the nameplate). */
  name: string;
  /** The MonsterDef standing at the door (data/monsters.ts townsfolk_resident_*). */
  def: string;
  /** The cottage site whose door they keep (townBuild TOWN_SITES). */
  cottage: TownSiteId;
  /** Where they stand, relative to the cottage's seat (the doorstep by
   *  default: house_small's door is the bottom row's centre cell). */
  at?: { x: number; y: number };
  /** ANY held avenue seats the family (gates.ts GateRow — the family law). */
  gate: GateRow[];
  /** The line they speak when the hero stands near (the speech fabric). */
  line: string;
}

/** The doorstep of a house_small (7×5 cells of 26: the door is row 4, col 3
 *  → (−13, +52) from the centre; the family stands a step outside it). */
const DOORSTEP = { x: -13, y: 84 };

export const TOWN_RESIDENTS: TownResidentRow[] = [
  { id: 'vell', name: 'Hesper Vell', def: 'townsfolk_resident_matron', cottage: 'cottage_1',
    gate: [{ ledger: LEDGER_SOULS_SHELTERED, n: 3, label: 'three souls sheltered in Lastlight' }],
    line: 'We came from the borough by the ford. The walls here hold.' },
  { id: 'ashcroft', name: 'Tobin Ashcroft', def: 'townsfolk_resident_crofter', cottage: 'cottage_2',
    gate: [{ ledger: LEDGER_SOULS_SHELTERED, n: 6, label: 'six souls sheltered in Lastlight' }],
    line: 'Brandt says the bench takes anything. He is not wrong.' },
  { id: 'mauve', name: 'Old Mauve', def: 'townsfolk_resident_scribe', cottage: 'cottage_3',
    gate: [{ ledger: LEDGER_SOULS_SHELTERED, n: 10, label: 'ten souls sheltered in Lastlight' }],
    line: 'I keep the count. Six founders, and every soul you brought after.' },
  { id: 'pell', name: 'The Pell Twins', def: 'townsfolk_resident_crofter', cottage: 'cottage_4',
    gate: [{ ledger: LEDGER_SOULS_SHELTERED, n: 14, label: 'fourteen souls sheltered in Lastlight' }],
    line: 'Two of us, one roof. We will take the east wall if it comes to that.' },
  { id: 'rook', name: 'Sabine Rook', def: 'townsfolk_resident_matron', cottage: 'cottage_5',
    gate: [{ ledger: LEDGER_SOULS_SHELTERED, n: 18, label: 'eighteen souls sheltered in Lastlight' }],
    line: 'The fire by the south road burns all night now. Someone keeps it.' },
];

/** The families standing in Lastlight at this tier: every row whose gate the
 *  account holds and whose cottage the tier raises, each with its resolved
 *  doorstep. `ownedUnlock` resolves `unlock` avenues (the caller's catalog
 *  closure — this file stays a leaf). */
export function townResidentsHere(
  account: Account, tier: number, ownedUnlock: (id: string) => boolean = () => false,
): { row: TownResidentRow; pos: { x: number; y: number } }[] {
  const out: { row: TownResidentRow; pos: { x: number; y: number } }[] = [];
  for (const row of TOWN_RESIDENTS) {
    const seat = townSiteAt(tier, row.cottage);
    if (!seat) continue;
    if (!gateMet(account, row.gate, 'any', ownedUnlock)) continue;
    const at = row.at ?? DOORSTEP;
    out.push({ row, pos: { x: seat.x + at.x, y: seat.y + at.y } });
  }
  return out;
}

/** THE STAMP: souls reaching Lastlight land on the account the moment they
 *  arrive (called beside BoroughField.addRefugees by the encounter's close).
 *  Pure on the account object; the caller marks it dirty. */
export function noteSoulsSheltered(account: Account, souls: number): void {
  if (!(souls > 0)) return;
  account.ledger[LEDGER_SOULS_SHELTERED] = (account.ledger[LEDGER_SOULS_SHELTERED] ?? 0) + Math.floor(souls);
}
