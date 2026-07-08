// ---------------------------------------------------------------------------
// FACTION TRAITS — each faction's TEXTURE, as data.
//
// The same overlays (invasion, warlord, events) drive every faction, but this
// table makes them FEEL different. A roamer like the goblins marches its wars
// from anywhere it holds; the undead are ROOTED — their warbands, events, and
// warlord all stem from their grave biome, barely venturing out. The demons
// are rift-born and aggressive but seat their tyrant at home. Adding the next
// faction's texture is one row here — the overlays never change.
//
// Pure data + tiny pure helpers; the overlays import these (one-way leaf).
// ---------------------------------------------------------------------------

import { FACTIONS } from '../data/monsters';
import type { ZoneDef } from '../data/zones';

/** Display name without the leading article ("Goblin Warband", not "the …") —
 *  the one place HUD/map strings shorten a faction id. */
export function factionShortName(f: string): string {
  return (FACTIONS[f]?.name ?? f).replace(/^the /, '');
}

export type WarlordHome = 'capital' | 'origin';

export interface FactionTraits {
  /** Appetite to march. 1 = roams freely; ~0.15 = rooted. Scales invasion chance. */
  roaming: number;
  /** Extra invasion-chance multiplier (demons are rift-aggressive at 1.6). */
  aggression: number;
  /** 'capital' = throne drifts to the strongest hold (roamers). 'origin' = the
   *  throne seats only on the faction's home ground. */
  warlordHome: WarlordHome;
  /** Authored home zone id (rooted factions). */
  originZone?: string;
  /** Biome tag this faction reads as home (matches ZoneDef.biome). */
  homeBiome?: string;
  /** Node-distance from home within which it stages zone events (undefined =
   *  anywhere it holds — roamers). */
  eventRange?: number;
  /** SPAWN CONTEXTS this faction may appear in (omitted = `['baseline']`). A
   *  generalized gate on WHERE a faction is allowed to be fielded: 'baseline' =
   *  ordinary procedural generation (zone packs, contests, war zones, biome
   *  patron, garrisons); 'crusade' = eligible to lead / fill a Crusade. A faction
   *  that lists 'crusade' but NOT 'baseline' (the dedicated zealots) is summoned
   *  ONLY by a Crusade and never leaks into normal generation. */
  contexts?: string[];
}

export const DEFAULT_TRAITS: FactionTraits = { roaming: 1, aggression: 1, warlordHome: 'capital' };

/** Contexts assumed when a faction declares none — present in ordinary world gen. */
const DEFAULT_CONTEXTS = ['baseline'];

export const FACTION_TRAITS: Record<string, FactionTraits> = {
  // The mortal & beast war-hosts are baseline natives that can ALSO be raised
  // into a Crusade (Warbands leading the vanguard). Demons keep their own event.
  goblin: { roaming: 1.0, aggression: 1.1, warlordHome: 'capital', contexts: ['baseline', 'crusade'] },
  gnoll: { roaming: 0.9, aggression: 1.0, warlordHome: 'capital', contexts: ['baseline', 'crusade'] },
  wild: { roaming: 0.7, aggression: 0.8, warlordHome: 'capital', contexts: ['baseline', 'crusade'] },
  elemental: { roaming: 0.55, aggression: 0.8, warlordHome: 'capital', contexts: ['baseline', 'crusade', 'fractures'] },
  sylvan: { roaming: 0.35, aggression: 0.6, warlordHome: 'origin', homeBiome: 'grove', eventRange: 160, contexts: ['baseline', 'crusade'] },
  undead: { roaming: 0.18, aggression: 0.5, warlordHome: 'origin', originZone: 'forsaken_graveyard', homeBiome: 'grave', eventRange: 150, contexts: ['baseline', 'crusade'] },
  demon: { roaming: 0.85, aggression: 1.6, warlordHome: 'origin', originZone: 'infernal_rift', homeBiome: 'rift', eventRange: 240, contexts: ['baseline', 'fractures'] },
  // The Deep — marine-only (contexts:['marine'], NOT baseline), so it never seeds
  // ordinary war/territory; it appears purely via the marine tilesets' pack tables.
  deep: { roaming: 0.3, aggression: 1.0, warlordHome: 'origin', homeBiome: 'deepsea', contexts: ['marine'] },
  // The Horned Tribes — highland raiders: they march far and gladly (the
  // gnolls' allies on the winter roads), throne wherever the strongest holds.
  beastkin: { roaming: 0.95, aggression: 1.1, warlordHome: 'capital', contexts: ['baseline', 'crusade'] },
  // The Glut — rooted meat: it barely marches, it ACCRETES. Wars stem only
  // from its own dripping halls.
  flesh: { roaming: 0.2, aggression: 0.7, warlordHome: 'origin', homeBiome: 'flesh', eventRange: 150, contexts: ['baseline'] },
  // The Night Court — patient predators: they range at their own pace and
  // throne wherever the feeding is richest.
  nightkin: { roaming: 0.6, aggression: 1.2, warlordHome: 'capital', contexts: ['baseline', 'crusade'] },
};

export function traitsOf(faction: string): FactionTraits {
  return FACTION_TRAITS[faction] ?? DEFAULT_TRAITS;
}

/** May this faction be fielded in the given spawn CONTEXT? Absent `contexts` ⇒
 *  baseline-only (every built-in faction's prior behavior is unchanged). The one
 *  generalized switch that keeps a crusade-only faction out of ordinary gen. */
export function factionAllowsContext(faction: string, ctx: string): boolean {
  return (traitsOf(faction).contexts ?? DEFAULT_CONTEXTS).includes(ctx);
}

/** Every faction eligible to be fielded in `ctx` (used to build a Crusade's
 *  ignition pool from data, never a hardcoded id list). */
export function factionsInContext(ctx: string): string[] {
  return Object.keys(FACTION_TRAITS).filter(f => factionAllowsContext(f, ctx));
}

/** Is `zone` valid WAR ORIGIN ground for `faction`? Roamers march from anywhere;
 *  rooted factions only from their authored origin zone or a home-biome zone —
 *  and never from ground they merely CONQUERED (a frontier seat ≠ home). */
export function isWarOrigin(faction: string, zone: ZoneDef, conqueredBy: string | null): boolean {
  const t = traitsOf(faction);
  if (t.warlordHome !== 'origin') return true;
  if (conqueredBy === faction) return false;
  if (t.originZone && zone.id === t.originZone) return true;
  if (t.homeBiome && zone.biome === t.homeBiome) return true;
  return false;
}

/** Node-distance from a faction's home anchor to `zone`. 0 (always-near) for
 *  roamers, or when the home zone isn't charted yet (don't strand them). */
export function distFromHome(faction: string, zone: ZoneDef, byId: Record<string, ZoneDef>): number {
  const t = traitsOf(faction);
  if (!t.originZone) return 0;
  const home = byId[t.originZone];
  if (!home) return 0;
  return Math.hypot(zone.map.x - home.map.x, zone.map.y - home.map.y);
}
