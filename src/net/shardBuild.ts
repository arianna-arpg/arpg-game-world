// ---------------------------------------------------------------------------
// THE BUILD STAMP (THE ACTING SEAT, docs/engine/shard.md "The pieces"): the
// shard and its clients each say which build they run. The join carries the
// client's stamp and the shard refuses another one at the door (one word, on
// the lobby, before any seat is made); the welcome carries the shard's, and a
// client refuses a world that answers with another (or none: an older shard).
// The stamp is the save-compatibility pair (meta/saveCompatibility.ts: a save
// bump is a build that reads characters differently) and the wire protocol.
// ---------------------------------------------------------------------------

import { SAVE_COMPATIBILITY } from '../meta/saveCompatibility';

/** Bump when the shard's wire grammar changes in a way an older peer cannot read.
 *  2: THE WIRE DIET (net/wireDiet.ts): the codec's rows, the dress delta and the acks. */
export const SHARD_WIRE_PROTOCOL = 2;

/** This build's stamp, as the join and the welcome carry it. */
export function shardBuildStamp(): string {
  return `a${SAVE_COMPATIBILITY.account}.r${SAVE_COMPATIBILITY.run}.w${SHARD_WIRE_PROTOCOL}`;
}

/** The words a refused join hears (shown on the lobby, or where the refused hero lands). */
export const SHARD_REFUSAL = {
  build: 'this world runs another build',
  /** THE RETURN (THE SMOOTH SHELL): a join that wanted its seat back found none to take. */
  resume: 'the world holds no seat to return to',
  /** THE FRONT DOOR (W7): every seat of the world is taken (SHARD_WIRE_CFG.maxSeats). */
  full: 'this world is full',
  /** THE FRONT DOOR (W7): the hero's save is larger than a world carries (SHARD_VESSEL_MAX_CHARS). */
  heroTooLarge: 'this hero is too large to travel',
};

/** THE FRONT DOOR (W7): the largest vessel (JSON characters, its world half
 *  dropped) a hosted world grafts. THE JUDGMENT reads it (server/vessel.ts
 *  VESSEL_CFG.maxBytes) and a client checks it before it travels, so a hero
 *  over it hears SHARD_REFUSAL.heroTooLarge at the lobby instead of a silent
 *  close; it stays under the wire's own frame cap (SHARD_WIRE_CFG.maxClientMessage). */
export const SHARD_VESSEL_MAX_CHARS = 240 * 1024;

/** THE UNLOAD BEACON (W7): the path a page going away posts `{ seat, token }` to
 *  (navigator.sendBeacon), beside THE UNLOAD WORD on its socket. */
export const SHARD_UNLOAD_BEACON_PATH = '/leave';

/** THE HONEST LEAVING (W7): the word a deliberate leave hears when the shard
 *  holds the hero in a fight (THE ACTING SEAT's leave mid-fight). It rides the
 *  seat's own note row (SeatW.fn); the shard appends the seconds. */
export const SHARD_LEAVE_WORD = {
  held: 'your hero stands its ground',
};
