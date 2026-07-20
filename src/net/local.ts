// ---------------------------------------------------------------------------
// LocalTransport — the single-machine, host-authoritative stub that satisfies
// NetTransport with NO networking. Single-player IS "host with one seat": the
// frame loop sends the local intent in and drains it straight back out. There is
// no wire, so sendState/onState are no-ops and join() can't connect.
//
// addLocalSeat registers a stand-in peer so the multi-seat engine path (targeting,
// downed/revive, party strip, shared loot) can be exercised today; the matching
// hero actor + ScriptedInput are created on the World side (see World.addSeat).
// ---------------------------------------------------------------------------

import type { NetTransport, PeerInfo, SessionMsg, StateSnapshot, ZoneMsg } from './transport';
import type { PlayerId, PlayerInput } from './intent';

export class LocalTransport implements NetTransport {
  readonly self: PlayerId = 'p0';
  readonly isHost = true;

  private peerList: PeerInfo[] = [{ id: 'p0', name: 'You', classId: '', isHost: true }];
  private pending = new Map<PlayerId, PlayerInput>();

  peers(): PeerInfo[] { return this.peerList; }

  host(info: Omit<PeerInfo, 'id' | 'isHost'>): Promise<{ code: string; self: PlayerId }> {
    this.peerList[0] = { id: this.self, isHost: true, ...info };
    return Promise.resolve({ code: 'LOCAL', self: this.self });
  }

  // A local host has no one to join.
  join(): Promise<{ self: PlayerId }> { return Promise.resolve({ self: this.self }); }

  leave(): void { this.pending.clear(); }

  sendInput(seat: PlayerId, input: PlayerInput): void { this.pending.set(seat, input); }

  /** Swap-on-read: hand back this frame's intents and start a fresh buffer. */
  drainInputs(): Map<PlayerId, PlayerInput> {
    const out = this.pending;
    this.pending = new Map();
    return out;
  }

  sendState(_snapshot: StateSnapshot): void { /* host is local — nothing to send */ }
  onState(_cb: (snapshot: StateSnapshot) => void): () => void { return () => { /* no wire */ }; }
  sendZone(_zone: ZoneMsg): void { /* host is local — nothing to send */ }
  onZone(_cb: (zone: ZoneMsg) => void): () => void { return () => { /* no wire */ }; }
  onPeerJoin(_cb: (peer: PeerInfo) => void): () => void { return () => { /* no wire */ }; }
  onPeerLeave(_cb: (id: PlayerId) => void): () => void { return () => { /* no wire */ }; }
  sendSession(_msg: SessionMsg, _to?: PlayerId): void { /* no wire (single machine) */ }
  onSession(_cb: (msg: SessionMsg, from: PlayerId) => void): () => void { return () => { /* no wire */ }; }

  // --- local stand-in seam (no network) -----------------------------------
  /** Register a stand-in peer (the hero actor is created by World.addSeat). */
  addLocalSeat(info: Omit<PeerInfo, 'isHost'>): void {
    if (!this.peerList.some(p => p.id === info.id)) {
      this.peerList.push({ ...info, isHost: false });
    }
  }

  /** Unregister a stand-in peer (a couch guest left) + drop any staged intent. */
  removeLocalSeat(id: PlayerId): void {
    this.peerList = this.peerList.filter(p => p.id !== id);
    this.pending.delete(id);
  }
}
