// ---------------------------------------------------------------------------
// THE UNSEALING — shared types (the holdfast.ts idiom: the def and the
// overlay both speak these; neither imports the other).
// ---------------------------------------------------------------------------

/** One canopic WARD: a talisman on the Regent's door, keyed to the miniboss
 *  whose fall flares it. The stopper index picks the jar silhouette (the
 *  canopicJar painter's vocabulary) so each ward reads at a glance. */
export interface UnsealingWard {
  id: string;
  /** The seal-bearer this ward answers to (MonsterDef id). */
  monsterId: string;
  /** HUD strings ("the Jackal talisman flares…"). */
  label: string;
}

/** What a Sepulcher Sands pocket's seed rolled (UnsealingField.roleFor). */
export type UnsealingRole =
  | { kind: 'none' }
  | { kind: 'tomb' }
  | { kind: 'canopic'; ward: string };

/** Every count, chance, radius and id the mechanic uses — one data blob on
 *  the def (nothing tunable lives inside the overlay or the engine bridge). */
export interface UnsealingSurge {
  /** Chance a Sepulcher Sands pocket IS the Regent's tomb (per pocket seed). */
  tombChance: number;
  /** Chance it hosts a canopic seal-bearer instead (exclusive with the tomb). */
  canopicChance: number;
  /** The four wards, in door-arc order. */
  wards: UnsealingWard[];
  /** The sealed door site inside a tomb pocket. */
  door: {
    /** The door slab's body radius. */
    radius: number;
    /** Player proximity (px) to the OPEN door that wakes the Regent. */
    wakeRadius: number;
    /** Talisman brazier body radius + their arc's distance from the door. */
    brazierRadius: number;
    brazierRing: number;
    /** Door guards (posted, sworn to the threshold): def id + count band. */
    guardId: string;
    guards: [number, number];
  };
  /** A canopic host's court: the seal-bearer's honor guard. */
  canopic: {
    guardId: string;
    guards: [number, number];
    /** Rarity the seal-bearer is promoted to at spawn. */
    rarity: 'champion' | 'crowned';
  };
  /** The boss behind the door. */
  regent: { monsterId: string; rarity: 'crowned' };
  /** The dynasty's gold — every flash/toast this feature paints. */
  gold: string;
}
