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
  // THE RESIDENCE (skill-items M1): loose gems are 1×1 bag ITEMS — every
  // loose-gem intent addresses the wrapper by uid (the gear address space);
  // learn seats (learned = seated; slot omitted = first free), unlearn
  // mints the wrapper back into the bag (x/y = an aimed cell, unequip-law).
  | { t: 'learn'; uid: number; slot?: number }                 // bag skill item → rack seat
  | { t: 'unlearn'; skillId: string; x?: number; y?: number }  // seat → bag item
  // THE SACRIFICIAL FONT (data/essences.ts FONT_CFG — merge / convert / reset):
  | { t: 'fontMerge'; skillId: string; rarity: 'common' | 'magic' | 'rare' | 'legendary' } // N alike → 1 at +1 rarity
  | { t: 'fontConvert'; tier: number; dir: 'up' | 'down' }     // Ability Essence tier up/down (wallet math)
  | { t: 'fontReset'; skillId: string }                        // unmake a skill's tree picks (band-priced)
  | { t: 'buyAbilityEss'; vendor: string; tier: number }       // the vendors' Ability Essence sell lane
  | { t: 'buyVendor'; index: number }                          // vendorStock idx
  | { t: 'buyChandler'; index: number }                        // chandlerStock idx (a harborhold's port counter)
  | { t: 'buyDelver'; index: number }                          // descentStock idx (Echoes)
  // THE PATRON'S HOLD (data/vendors.ts): reserve/release one shelf row;
  // place/release the standing gem commission (null = release).
  | { t: 'vendorLock'; vendor: string; index: number; on: boolean }
  | { t: 'vendorCommission'; vendor: string; gem: { kind: 'skill' | 'support'; id: string } | null }
  // Level-ups pay Ability Essences — the ONE lane (the point lane retired).
  | { t: 'levelSkill'; skillId: string }
  | { t: 'levelSupportInv'; uid: number }                      // loose support gem (bag item)
  | { t: 'levelSupportSocket'; skillId: string; socket: number } // socketed support
  | { t: 'reacquireSkill'; skillId: string }                   // re-kindle a lost class starter (GRANTED copy)
  | { t: 'attuneSpectre'; skillId: string; formId: string }    // grimoire: bind a mastered bestiary form ('' releases)
  | { t: 'mimicSelect'; sid: string }                          // mimicry: select a captured art (engine/mimic.ts bank)
  | { t: 'pickTreeNode'; skillId: string; nodeId: string }     // skill-mode tree: spend/replace the pick (World.pickTreeNode)
  | { t: 'untameCompanion'; actorId: number }                  // the Tracker's release counter
  | { t: 'socket'; uid: number; skillId: string }              // bag support item → skill socket
  | { t: 'unsocket'; skillId: string; socket: number }         // socket → bag item (needs room)
  | { t: 'allocate'; nodeId: string; optionId?: string } // optionId: choice-node pick (data/passiveChoices.ts)
  | { t: 'bindGraft'; key: string; skillId: string | null } // graft key → carrier skill (null unbinds)
  | { t: 'bindSkill'; slot: number; skillId: string | null }   // action-bar slot (internal re-seat; unlearn is the unseat)
  | { t: 'swapSkillSlots'; a: number; b: number }              // THE RACK's reorder: exchange two bar seats atomically
  | { t: 'recallMemory'; uid: number; dropper: string; facet?: string } // THE STONE: recall ONE unit of a dropper group from the pouch item (FIFO); facet = the Preformed pouch's chosen triad (its lead attribute id)
  | { t: 'caravanTo'; band: number }                           // Caravan: escort to band N (0 = home)
  | { t: 'harborChart'; omen: string }                         // Harbor board: buy the chart of a rumored seat (carried essence at the exchange → survey pulse)
  | { t: 'bountyAccept'; id: string }                          // Bounty board: take a posting off the slate (THE ONE-HAND LAW, folded per board)
  | { t: 'bountyAbandon'; id: string }                         // Bounty board: forfeit a taken posting (the hand frees; it never returns to the slate)
  | { t: 'bountyTurnIn'; id: string }                          // Bounty board: turn a done/failed hand in AT the board (the payout point — walk-1's collect)
  | { t: 'holdMuster' }                                        // Harborhold: sound the horn — arm the standing zone's siege defense
  | { t: 'holdRestore' }                                       // Harborhold: pay the carried-Essence restoration at a fallen hold's wreckage
  | { t: 'payToll'; index: number }                            // Holdfast: pay the keeper's toll (essence/gem per the guardian's UnlockSpec; index = legacy wire shape)
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
  | { t: 'salvageItem'; uid: number; lane?: 'break' | 'sell' } // bag gear OR gem wrapper → essence (+ lore on 'break', gear only)
  // THE SWEEP (salvageBulk): break/sell one whole CATEGORY in a blow,
  // optionally narrowed to a rarity ('legendary' is the gem-side orange).
  // 'item' = gear tiles; 'skill'/'support' = the bag's gem wrappers.
  // Locked things and granted sparks are skipped host-side.
  | { t: 'salvageBulk'; cat: 'item' | 'skill' | 'support';
      rarity?: 'common' | 'magic' | 'rare' | 'unique' | 'legendary'; lane?: 'break' | 'sell' }
  // THE KEEPER'S MARK (salvageLock): flip the salvage lock on any carried
  // thing by uid — gear (bag OR doll) and gem wrappers share the one
  // address space now (M1). Pure bookkeeping; no station gate.
  | { t: 'salvageLock'; uid: number; on: boolean }
  | { t: 'craftAffix'; uid: number; affixId: string; score?: number } // essence + SMITHING score → a studied affix
  | { t: 'rerollAffix'; uid: number; affix: number; score: number }   // Oracle COMMUNION: reroll + seal one line
  // SOCKETS & VESTIGES (deterministic craft):
  | { t: 'socketVestige'; uid: number; socket: number; vestigeId: string } // consume a vestige into a socket (overwrites destroy)
  | { t: 'craftSocket'; uid: number }                                 // bench-chisel +1 socket (shares the crafted slot)
  // BOROUGH (the arming panel — folk are addressed by actor id, items by uid):
  | { t: 'armFolkItem'; folkId: number; uid: number }                 // gift a bag item → its mods graft onto the villager
  | { t: 'armFolkEssence'; folkId: number; essence: string };         // spend one essence-package application on the villager
