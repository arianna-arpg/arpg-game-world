// ---------------------------------------------------------------------------
// THE COMPANION STANCES — a bonded beast's own conduct BETWEEN orders, as data.
//
// The hunter-pet vocabulary (aggressive / defensive / passive): a stance is
// what the beast does with its own mind — whether it hunts, answers only the
// keeper's fights, or heels — and it is the floor every ORDER stands on: an
// issued command (the Assault gem's meta, the Rallying Whistle's charge, a
// Pack Crescendo lunge) outranks the stance for its moment, and the stance
// resumes the instant the order lapses. One row per stance; `conduct` names
// a registered handler (engine/companionStances.ts STANCE_CONDUCTS — open,
// so a package may add a stance wearing an existing conduct or register a
// new one), `order` is the cycle the shift walks, `glyph` + `color` the
// HUD's face on the meta button. Adding a stance = one row here.
// ---------------------------------------------------------------------------

export interface CompanionStanceDef {
  id: string;
  label: string;
  /** The one-glyph face on the meta button and the beast's floater. */
  glyph: string;
  color: string;
  /** Position in the shift cycle (ascending). */
  order: number;
  /** The registered conduct this stance runs (engine/companionStances.ts). */
  conduct: string;
  /** Whether BOND-DRIVEN automatic orders (a Pack Crescendo lunge, the
   *  Rallying Whistle's charge toward the aim) fire under this stance.
   *  Explicit keeper orders — an Assault meta, a recall — always do. */
  lunges: boolean;
  blurb: string;
}

export const COMPANION_STANCES: Record<string, CompanionStanceDef> = {
  aggressive: {
    id: 'aggressive', label: 'Aggressive', glyph: '⚔', color: '#d07a5a', order: 0, conduct: 'aggressive', lunges: true,
    blurb: 'The beast hunts on its own: it takes the nearest foe in sight and heels back only when nothing is left to fight.',
  },
  defensive: {
    id: 'defensive', label: 'Defensive', glyph: '⛨', color: '#c8a84b', order: 1, conduct: 'defensive', lunges: true,
    blurb: 'The beast keeps to your side and answers only your fights: whatever wounds you, whatever you wound, or whatever bites it.',
  },
  passive: {
    id: 'passive', label: 'Passive', glyph: '◌', color: '#8fa8d8', order: 2, conduct: 'passive', lunges: false,
    blurb: 'The beast heels and never strikes of its own accord. Only a direct order sends it in.',
  },
};

/** Register a new stance (packages) — the cycle re-sorts by `order`. */
export function registerCompanionStance(def: CompanionStanceDef): void {
  COMPANION_STANCES[def.id] = def;
}

/** Every stance id in shift order. */
export function companionStanceIds(): string[] {
  return Object.values(COMPANION_STANCES).sort((a, b) => a.order - b.order).map(s => s.id);
}
