// ---------------------------------------------------------------------------
// PLAYER INTENT — the universal per-frame currency that drives every player-kind
// actor, whoever (or whatever) is controlling it. One shape serves the local
// hero (read from the OS), a scripted stand-in ally (computed), and — next
// milestone — a remote player (drained from the network transport).
//
// Camera-independence is the whole point: `aim` is in WORLD coordinates, so an
// intent means the same thing regardless of whose screen it came from. That is
// what lets the same intent cross the wire to the host and resolve identically.
// ---------------------------------------------------------------------------

import type { Vec2 } from '../core/math';
import type { Actor } from '../engine/actor';
import type { World } from '../engine/world';

export type PlayerId = string;

/** One frame of a seat's intent. `dx/dy` is the raw move axis (the engine
 *  normalizes); `aim` is WORLD space; `held`/`edge` are per skill-bar slot. */
export interface PlayerInput {
  dx: number;
  dy: number;
  /** Aim point in WORLD coordinates (already through renderer.toWorld). */
  aim: Vec2;
  /** Per slot: the button is held this frame (repeats / channels). */
  held: boolean[];
  /** Per slot: the button was pressed THIS frame (edge — toggles, presses). */
  edge: boolean[];
  /** Per slot: the META button (shift+key) was pressed this frame — fires
   *  the slot skill's meta-action (Detonate / Enrage / Attack!). Optional
   *  for wire compatibility; absent = no meta presses. */
  metaEdge?: boolean[];
  /** Client→host monotonic input sequence (movement PREDICTION). The host echoes
   *  the last-applied seq per seat in SeatW; the client replays its unacked inputs
   *  forward from the authoritative position. Absent for host/scripted seats. */
  seq?: number;
}

/** Produces a seat's intent each frame, or null when the seat is idle. The
 *  controlling actor + the world are enough for any source (OS read, follow-AI,
 *  network drain) — no Seat coupling, so this stays a clean leaf interface. */
export interface PlayerInputSource {
  poll(actor: Actor, world: World, dt: number): PlayerInput | null;
}

/** The inert placeholder a seat carries until a real source is wired (Phase 4).
 *  Always idle — a seat with this source neither moves nor acts. */
export class NullInput implements PlayerInputSource {
  poll(): PlayerInput | null { return null; }
}

/** A discrete META mutation a player requests — spend points, manage the skill
 *  book / passive tree, trade gems. On the host / single-player it's applied
 *  immediately to the local seat; a render-shell CLIENT ships it to the host as
 *  an INTENT (the host owns every meta mutation), which applies it to the
 *  client's OWN seat (world.applyAction) and re-replicates the result.
 *
 *  Addresses are by index/id (never object refs — those don't cross the wire);
 *  the host resolves them inside the target seat's meta. */
export type MetaAction =
  | { t: 'learn'; index: number }                              // skillInv idx → known
  | { t: 'unlearn'; skillId: string }                          // known → skillInv
  | { t: 'sacrifice'; index: number }                          // skillInv idx → font
  | { t: 'buyVendor'; index: number }                          // vendorStock idx
  | { t: 'buyDelver'; index: number }                          // descentStock idx (Echoes)
  | { t: 'levelSkill'; skillId: string; pay?: 'points' | 'essence' }
  | { t: 'levelSupportInv'; index: number; pay?: 'points' | 'essence' } // loose support gem
  | { t: 'levelSupportSocket'; skillId: string; socket: number; pay?: 'points' | 'essence' } // socketed support
  | { t: 'reacquireSkill'; skillId: string }                   // re-kindle a lost class starter (GRANTED copy)
  | { t: 'attuneSpectre'; skillId: string; formId: string }    // grimoire: bind a mastered bestiary form ('' releases)
  | { t: 'untameCompanion'; actorId: number }                  // the Tracker's release counter
  | { t: 'socket'; index: number; skillId: string }            // inv gem → skill socket
  | { t: 'unsocket'; skillId: string; socket: number }
  | { t: 'allocate'; nodeId: string; optionId?: string } // optionId: choice-node pick (data/passiveChoices.ts)
  | { t: 'bindGraft'; key: string; skillId: string | null } // graft key → carrier skill (null unbinds)
  | { t: 'bindSkill'; slot: number; skillId: string | null }   // action-bar slot
  | { t: 'dropSkill'; index: number }                          // skillInv idx → world
  | { t: 'dropSupport'; index: number }                        // inventory idx → world
  | { t: 'caravanTo'; band: number }                           // Caravan: escort to band N (0 = home)
  | { t: 'payToll'; index: number }                            // Holdfast: surrender support idx (-1 = random) to open the gate
  | { t: 'vocationQuest'; questId: string }                    // Vocation menu: undertake a chain step
  // GEAR (items are addressed by uid — stable across bag re-sorts and the wire).
  | { t: 'equipItem'; uid: number; slot?: string }             // bag OR worn item → doll slot (auto-picks when omitted; worn→worn swaps through the vacated slot)
  | { t: 'unequipItem'; slot: string; x?: number; y?: number } // doll slot → bag (x/y: exact cell, fails blocked; omitted: first fit, fails full)
  | { t: 'moveItem'; uid: number; x: number; y: number }       // bag re-place (swap when exactly one blocker)
  | { t: 'dropItem'; uid: number }                             // bag OR worn item → ground
  | { t: 'pickupItem' }                                        // nearest ground gear within reach → bag
  // SALVAGE (dwell-gated, TWO LANES): 'break' at the bench pays the rarity's
  // essence + craft lore; 'sell' at a scrap counter pays coarse volume only.
  // Absent lane = legacy pick (bench when near, else counter).
  | { t: 'salvageItem'; uid: number; lane?: 'break' | 'sell' } // bag gear → essence (+ lore on 'break')
  | { t: 'salvageSkill'; index: number; lane?: 'break' | 'sell' }  // skillInv gem (granted: nothing)
  | { t: 'salvageSupport'; index: number; lane?: 'break' | 'sell' } // loose support
  | { t: 'craftAffix'; uid: number; affixId: string; score?: number } // essence + SMITHING score → a studied affix
  | { t: 'rerollAffix'; uid: number; affix: number; score: number }   // Oracle COMMUNION: reroll + seal one line
  // SOCKETS & VESTIGES (deterministic craft):
  | { t: 'socketVestige'; uid: number; socket: number; vestigeId: string } // consume a vestige into a socket (overwrites destroy)
  | { t: 'craftSocket'; uid: number };                                // bench-chisel +1 socket (shares the crafted slot)
