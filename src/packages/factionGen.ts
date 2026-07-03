// ---------------------------------------------------------------------------
// FACTION EXPANSION GENERATOR — adding a faction is one declarative spec.
//
// registerFactions() grafts each package's FactionSpec[] into the four data
// registries the world overlays already read BY ID: the roster (FACTIONS), the
// texture (FACTION_TRAITS), the warlord (WARLORD_OF), the minimap colour
// (FACTION_COLORS), and diplomacy (RELATIONS). Because every consumer — invasion
// marches, warlord rises, territory/conquest, events, spawn tables — looks these
// up generically at runtime, a registered faction immediately marches, crowns a
// warlord, conquers, paints the map, and brawls, with ZERO overlay code change.
//
// MUST run once at boot, BEFORE the first World/WorldSim and BEFORE
// validateContent(), since it mutates shared registries. Id-collision safe
// (never clobbers a built-in faction).
// ---------------------------------------------------------------------------

import { addRelation, FACTIONS } from '../data/monsters';
import { FACTION_COLORS, GRAFTED_FACTION_COLOR } from '../world/palette';
import { FACTION_TRAITS, factionAllowsContext } from '../world/traits';
import { WARLORD_OF } from '../world/warlord';
import { PACKAGES } from './registry';
import type { FactionSpec } from './types';

export function registerFactions(specs: FactionSpec[]): void {
  for (const s of specs) {
    if (!FACTIONS[s.id]) FACTIONS[s.id] = { name: s.name, table: s.roster };
    if (!FACTION_TRAITS[s.id]) FACTION_TRAITS[s.id] = s.traits;
    if (s.warlord && !WARLORD_OF[s.id]) WARLORD_OF[s.id] = s.warlord;
    if (!FACTION_COLORS[s.id]) FACTION_COLORS[s.id] = s.color ?? GRAFTED_FACTION_COLOR;
    for (const rel of s.relations ?? []) {
      if (rel.kind === 'ally' || rel.kind === 'hostile') {
        // A hostile pair seeds a procedural WAR ZONE only if BOTH factions live in
        // the baseline context. A crusade-only faction (the zealots) brawls when a
        // Crusade fields it, but must never spawn an ordinary war zone — so its
        // hostilities are registered for combat WITHOUT seeding WAR_PAIRS.
        const seedWar = factionAllowsContext(rel.a, 'baseline') && factionAllowsContext(rel.b, 'baseline');
        addRelation(rel.a, rel.b, rel.kind, seedWar);
      }
    }
  }
}

/** Graft EVERY package's factions at boot (independent of purchase), so the
 *  registries + the content validator always see a complete world. */
export function registerAllPackageFactions(): void {
  const specs: FactionSpec[] = [];
  for (const p of PACKAGES) if (p.factions) specs.push(...p.factions);
  registerFactions(specs);
}
