// ---------------------------------------------------------------------------
// Shared colors for the minimap overlays. Pure data, no logic — kept apart so
// weather and faction rendering draw from one consistent palette.
// ---------------------------------------------------------------------------

import type { WeatherKind } from './weather';

/** The one neutral tint for a faction with no FACTION_COLORS entry — every
 *  overlay falls back to THIS, not its own literal. */
export const FALLBACK_FACTION_COLOR = '#9ab0c8';

/** Assigned to grafted package factions that declare no colour of their own
 *  (factionGen). Distinct from the render-time fallback above: this one is
 *  written INTO the table at boot. */
export const GRAFTED_FACTION_COLOR = '#a64dd8';

/** Banner color per monster faction (territory washes, contest rings). */
export const FACTION_COLORS: Record<string, string> = {
  goblin: '#8fae3a',
  undead: '#9a86c4',
  gnoll: '#c89a4a',
  elemental: '#4aa6c8',
  sylvan: '#4ec88a',
  wild: '#c85a4a',
  demon: '#e23a2a',
  deep: '#3a8ad8',
};

/** The Contagion overlay's sickly palette — a necrotic green that brightens toward
 *  the source (the glow gradient) plus a rot-purple accent for the Patient Zero
 *  glyph. Kept here beside the faction/weather colours so the minimap reads one
 *  consistent set. (FACTION_COLORS['plague'] is grafted at boot by factionGen from
 *  the package's FactionSpec.color — that drives the spawn-contest wash; these drive
 *  the bespoke glow/pulse the overlay paints.) */
export const CONTAGION_COLORS = {
  /** Bright, virulent green — a zone close to Patient Zero (high intensity). */
  strong: '#8fd24a',
  /** Dim, sickly green — a far, faint edge of the spread (low intensity). */
  weak: '#5e7a40',
  /** Necrotic purple — the Patient Zero source glyph. */
  accent: '#9a5ad0',
};

/** The Mycelia spore-bloom palette — bioluminescent fungal green brightening toward
 *  the dense core, with a luminous accent for the spore wash + the Heartbloom glyph.
 *  (FACTION_COLORS['fungal'] is grafted at boot from the package FactionSpec.) */
export const SPORE_COLORS = {
  /** Virulent green — a zone thick with spores (high density / near the core). */
  strong: '#8fd06f',
  /** Dim, decaying green — the faint creeping edge of the bloom. */
  weak: '#3f5a32',
  /** Luminous spore-light — the Heartbloom glyph + the densest haze. */
  accent: '#c8ffa0',
};

/** Cell color per weather kind ('clear' is the absence of a front). */
export const WEATHER_COLORS: Record<WeatherKind, string> = {
  clear: '#000000',
  rain: '#4a6a9a',
  storm: '#6a5ab0',
  fog: '#9aa0a8',
  ashfall: '#b06a3a',
  bloodmoon: '#b03038',
};
