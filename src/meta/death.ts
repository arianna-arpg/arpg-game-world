// ---------------------------------------------------------------------------
// DEATH RECORDS — the corpse-run layer that COMPOUNDS on permadeath.
//
// When a character dies, the run still ends and the character is wiped — but we
// first snapshot WHERE it fell (the death zone's world-graph map coordinate +
// in-zone position) and WHAT it carried (a serialized, EXTENSIBLE loot payload)
// onto the ACCOUNT, which survives the wipe. The next run coordinate-matches the
// record, spawns a corpse in that zone, marks it on the world map, and lets the
// player dwell on it to reclaim their EXACT lost gems — a corpse run.
//
// The two extensibility hinges the design turns on:
//  (1) WHAT drops is a configurable DeathLootPolicy, never hardcoded. THE GEAR
//      ERA RULE: only EQUIPPED items ride the corpse — skills, supports, and
//      the carried bag are lost to the death (a build's knowledge dies with
//      its bearer; only worn steel survives). Yesterday's skills-drop rule is
//      one flag away, as is adding future carries (currency, relics, idols…).
//  (2) WHAT is recorded is gated by a run-end REASON (only 'death' for now) — a
//      future "Retire" event (corpse → mercenary) or re-including forfeit is just
//      another reason, not a rewrite.
//
// Pure data + a pure capture helper. Type-only imports keep it acyclic.
// ---------------------------------------------------------------------------

import type { ItemInstance } from '../engine/items';
import type { SkillInstance, SkillRarity } from '../engine/skills';
import type { PlayerMeta } from '../engine/world';

export const DEATH_SCHEMA = 1;
/** Newest-first ring buffer of recent deaths kept on the account. */
export const MAX_DEATH_RECORDS = 3;
/** A GENERATED/quest zone death (its id churns each run) re-binds by coordinate:
 *  the corpse spawns in a new-run zone whose node is within this radius. Kept
 *  below the worldgen anti-crowd floor (52) so it can't reach a neighbour. STATIC
 *  zone deaths ignore this and re-match by their stable id (see world.ts). */
export const CORPSE_MATCH_RADIUS = 40;

/** A socketed support, captured by id+level (same shape as character.ts). */
export interface SavedSocket { supportId: string; level: number; }

/** One recoverable loot item. A DISCRIMINATED UNION so future kinds (equipment,
 *  currency, flasks…) are PURELY ADDITIVE — one arm here, one branch in
 *  captureLoot, one branch in the engine's drop rebuild. */
export type SavedLoot =
  | { kind: 'skill'; skillId: string; level: number; rarity: SkillRarity; sockets: (SavedSocket | null)[] }
  | { kind: 'support'; supportId: string; level: number }
  // Equipped gear rides VERBATIM (ItemInstance is already pure JSON — ids +
  // 0..1 rolls); the reclaim rebuilds it through rebuildItem, so a data patch
  // between death and reclaim retunes (or tolerantly drops) it like any load.
  | { kind: 'gear'; item: ItemInstance };

/** The carried bundle — a flat ordered array the corpse drops one by one. */
export interface LootPayload { items: SavedLoot[]; }

/** Which sources of the character's carry are captured into the corpse. NOT
 *  hardcoded so the design can change (drop no skills, drop items instead). */
export interface DeathLootPolicy {
  /** The Learned Skills tab: bar gems WITH their socketed supports. */
  knownSkills: boolean;
  /** Unsocketed skill-gem backpack. */
  skillInv: boolean;
  /** Unsocketed support gems. */
  inventory: boolean;
  /** EQUIPPED gear (the doll — never the carried bag). */
  equipment: boolean;
  // FUTURE: bagItems?: boolean; currency?: boolean; relics?: boolean; …
}

/** THE GEAR ERA: the corpse carries only what was WORN. Skills, supports, and
 *  the carried bag are lost to the death. Tune freely; this is the single knob. */
export const DEFAULT_LOOT_POLICY: DeathLootPolicy = {
  knownSkills: false,
  skillInv: false,
  inventory: false,
  equipment: true,
};

/** The persistent, attributable death spot carried on the account across the
 *  character wipe. Matched to a new run by MAP COORDINATE (id is just a static-
 *  zone fast path), so generated/quest zone-id churn is irrelevant. */
export interface DeathRecord {
  schema: number;
  /** Death zone's world-graph node coordinate — THE durable anchor. */
  mapX: number; mapY: number;
  /** Local-to-zone position (clamped on spawn against a reshaped arena). */
  pos: { x: number; y: number };
  /** Informational; trusted only as an exact-match fast path for STATIC zones. */
  zoneId: string;
  loot: LootPayload;
  // Attribution — feeds the map tooltip + a future death-screen line.
  classId: string; charLevel: number; zoneName: string;
  /** Optional killer monster/skill id (future). */
  cause?: string;
  /** Multiplayer seat that owns the corpse; 'p0' single-player (gates reclaim). */
  owner: string;
  /** Wall-clock at capture — FIFO ordering + "fell N runs ago" UI. */
  timestamp: number;
}

/** Pack one learned/inventory skill instance into a SavedLoot 'skill' (the exact
 *  shape character.ts already serializes — socketed supports ride in sockets[]).
 *  Exported: THE PATRON'S HOLD serializes reserved counter rows through the
 *  same one packer (one spelling of "a skill, saved"). */
export function skillToLoot(inst: SkillInstance): SavedLoot {
  return {
    kind: 'skill', skillId: inst.def.id, level: inst.level, rarity: inst.rarity ?? 'common',
    sockets: inst.sockets.map(s => s ? { supportId: s.def.id, level: s.level } : null),
  };
}

/** Snapshot the character's carried loot per the policy. Empty if nothing
 *  qualifies (the caller then skips recording — an empty corpse is pointless). */
export function captureLoot(meta: PlayerMeta, policy: DeathLootPolicy = DEFAULT_LOOT_POLICY): LootPayload {
  const items: SavedLoot[] = [];
  if (policy.knownSkills) for (const inst of meta.knownSkills.values()) items.push(skillToLoot(inst));
  if (policy.skillInv) for (const inst of meta.skillInv) items.push(skillToLoot(inst));
  if (policy.inventory) for (const g of meta.inventory) items.push({ kind: 'support', supportId: g.def.id, level: g.level });
  if (policy.equipment) {
    for (const worn of Object.values(meta.equipped)) {
      if (!worn) continue;
      const { x: _x, y: _y, ...item } = worn; // a corpse item has no bag cell
      items.push({ kind: 'gear', item });
    }
  }
  return { items };
}
