// ---------------------------------------------------------------------------
// ZONE POLICY — the ONE resolver for "may this faction / event appear in this
// zone", per the zone's BIOME and (Phase-2) LAYOUT.
//
// The user's ask: whitelist/blacklist events and factions per biome and per
// layout type — "no goblins in the deep sea, but maybe an Eldritch one; no land
// crusade marches into the ocean." Every gate routes through these two functions,
// so the DATA SOURCE is swappable with zero caller churn: today it reads the
// static BIOMES table; a later pass can read a run-locked manifest policy instead
// (the user's "static to start, not locked-in"). Callers never change.
//
// Semantics (composed): a deny list FORBIDS; a non-empty allow list is a strict
// WHITELIST (only listed pass). Biome policy and layout policy AND together.
// Pure leaf: imports only the BIOMES data + the structural zone shape.
// ---------------------------------------------------------------------------

import { BIOMES } from './biomes';

/** The minimal zone shape the policy reads (so this never pulls in ZoneDef). */
export interface PolicyZone {
  biome?: string;
  layoutType?: string;
}

function passes(id: string, deny?: string[], allow?: string[]): boolean {
  if (deny && deny.includes(id)) return false;
  if (allow && allow.length > 0 && !allow.includes(id)) return false;
  return true;
}

/** May this FACTION appear (as a native, a patron, an ambient pack, or an event
 *  spawn) in this zone? Composed across the zone's biome (+ layout later). */
export function factionAllowed(faction: string, zone: PolicyZone): boolean {
  const b = zone.biome ? BIOMES[zone.biome] : undefined;
  if (b && !passes(faction, b.denyFactions, b.allowFactions)) return false;
  // (Phase-2 LayoutDef faction policy ANDs in here.)
  return true;
}

/** May this EVENT (an overlay id: 'demon_invasion' | 'crusade' | 'fractures' |
 *  'hunt' | 'conclave' | 'breach' | …) target this zone? Callers compose this with
 *  their existing objective.kind/cave/floating checks. */
export function eventAllowed(eventId: string, zone: PolicyZone): boolean {
  const b = zone.biome ? BIOMES[zone.biome] : undefined;
  if (b && !passes(eventId, b.denyEvents, b.allowEvents)) return false;
  // (Phase-2 LayoutDef event policy ANDs in here.)
  return true;
}
