// ---------------------------------------------------------------------------
// RemoteInput — the input source for a seat driven OVER THE NETWORK. Unlike a
// LocalInput or ScriptedInput, it produces nothing on poll(): a remote peer's
// intent arrives asynchronously through the transport's input pump and is keyed
// by seat id in drainInputs(), which World.applyInputs consumes directly. So the
// host's per-frame "poll every non-local seat" loop sees null here and skips it,
// while the seat is still driven by whatever the wire delivered that tick.
// ---------------------------------------------------------------------------

import type { Actor } from '../engine/actor';
import type { World } from '../engine/world';
import type { PlayerInput, PlayerInputSource } from './intent';

export class RemoteInput implements PlayerInputSource {
  constructor(readonly seatId: string) {}
  poll(_actor: Actor, _world: World): PlayerInput | null { return null; }
}
