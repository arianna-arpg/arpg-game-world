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

/** The structural shape eventTargetable reads on top of PolicyZone — every
 *  field optional, matching ZoneDef's own optionality, so any ZoneDef passes
 *  straight in. */
export interface TargetableZone extends PolicyZone {
  caveDepth?: number;
  special?: boolean;
  floating?: boolean;
  eventOwned?: boolean;
  pocket?: boolean;
  /** The transient/unanchored classes holdfastHostable reads on top of the
   *  event floor (eventTargetable itself ignores them — overlay targeting is
   *  unchanged): a cave-ladder breach maw, boundless streamed ground, a
   *  still-concealed mint. */
  breach?: boolean;
  boundless?: boolean;
  concealed?: boolean;
  objective?: { kind: string };
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
 *  their existing objective.kind/cave/floating checks — or better, call
 *  eventTargetable below, which composes them for you. */
export function eventAllowed(eventId: string, zone: PolicyZone): boolean {
  const b = zone.biome ? BIOMES[zone.biome] : undefined;
  if (b && !passes(eventId, b.denyEvents, b.allowEvents)) return false;
  // (Phase-2 LayoutDef event policy ANDs in here.)
  return true;
}

/** THE ONE TARGET-ELIGIBILITY PREDICATE — "may this event LAND on this zone".
 *
 *  Composes the structural invariants every event must respect (no caves, no
 *  floating un-roaded nodes, no event-owned ground — another event already
 *  holds it, and special arenas are eventOwned by mint — no sanctuaries) with
 *  the per-biome event policy above. Before this existed, each overlay
 *  copy-pasted the chain and the copies DRIFTED (some dropped `!special`, some
 *  skipped eventAllowed entirely); every overlay now routes here, so a new
 *  structural invariant lands in ONE line and holds for every event at once.
 *  Site-specific extras (visited-only, needs-packs, level bands) stay at the
 *  call site — this is the floor, not the whole gate. */
export function eventTargetable(eventId: string, zone: TargetableZone): boolean {
  // A purchased POCKET is bought ground with an authored promise (its FORM —
  // data/pocketForms.ts): world events never land on it, both because the
  // promise is the point and because a dead-end can't honor event traffic
  // (marches, roving fronts, epicenter growth all assume roads onward).
  if (zone.caveDepth != null || zone.floating || zone.eventOwned || zone.special || zone.pocket) return false;
  if (zone.objective && zone.objective.kind === 'safe') return false;
  return eventAllowed(eventId, zone);
}

/** May a HOLDFAST rise here — the locked bonus exit that MINTS a purchased
 *  pocket off this zone? ONE law for every asker: the natural first-visit
 *  roll (World.rollHoldfast), the dev-tools force (World.devForceHoldfast),
 *  and the overlay's own belt (HoldfastField), so a QA sighting always means
 *  what a player sighting means. Composes the event floor — off-graph ground
 *  (caves, sidezones, sepulcher pockets: caveDepth), event-owned or floating
 *  mints, special arenas, sanctuaries, and purchased pockets can never
 *  honestly anchor a FRESH minted zone, and biome data may deny the
 *  'holdfast' id like any event (deny/allowEvents) — with the transient or
 *  unanchored classes the floor doesn't name: a breach maw, boundless
 *  streamed ground, a still-concealed mint. A gate raised on any of these
 *  would sell a zone minted off ground the world graph can't stand behind
 *  (or, in a cave, a ghost portal with no wardens to pay). */
export function holdfastHostable(zone: TargetableZone): boolean {
  if (zone.breach || zone.boundless || zone.concealed) return false;
  return eventTargetable('holdfast', zone);
}
