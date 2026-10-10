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
};
