// ---------------------------------------------------------------------------
// EventBus — the tiny synchronous pub/sub the co-op roster/party framework
// hangs its hooks on. Deliberately MICROSCOPIC: a handful of typed lifecycle
// events, no queue, no async, no priorities, no wildcards. Only RARE roster
// moments belong here (a player joins, a member is downed/revived, later a
// mercenary is hired or a minion summoned) — never per-frame or combat traffic,
// which stays direct method calls for performance.
//
// This is the "hook into an event system" the party/mercenary design turns on:
// adding a new kind of party member is just one more emit at its spawn site.
// ---------------------------------------------------------------------------

import type { Actor } from './actor';

/** The lifecycle events emitted by the World. Keys are namespaced so future
 *  additions (mercenary/hire, minion/summon, party/wipe) read at a glance. */
export interface GameEvents {
  /** A player-kind member entered the roster (local player, co-op join, …). */
  'party/join': { actor: Actor; seat: string };
  /** A member left the roster (disconnect, despawn). */
  'party/leave': { actor: Actor; seat: string };
  /** A player seat dropped to a downed (not dead) state — co-op only. */
  'player/downed': { actor: Actor; killer?: Actor };
  /** A downed seat was revived by an ally's dwell. */
  'player/revived': { actor: Actor; seat: string };
}

type Handler<K extends keyof GameEvents> = (payload: GameEvents[K]) => void;
type AnyHandler = Handler<keyof GameEvents>;

/** A typed pub/sub. `on()` returns a disposer; `emit()` snapshots the listener
 *  set (so a handler may (un)subscribe mid-dispatch) and isolates throws — one
 *  bad listener never breaks the others or the emitter. */
export class EventBus {
  private readonly map = new Map<keyof GameEvents, Set<AnyHandler>>();

  on<K extends keyof GameEvents>(name: K, fn: Handler<K>): () => void {
    let set = this.map.get(name);
    if (!set) { set = new Set(); this.map.set(name, set); }
    set.add(fn as AnyHandler);
    return () => { this.map.get(name)?.delete(fn as AnyHandler); };
  }

  emit<K extends keyof GameEvents>(name: K, payload: GameEvents[K]): void {
    const set = this.map.get(name);
    if (!set) return;
    for (const fn of [...set]) {
      try { (fn as Handler<K>)(payload); }
      catch (err) { console.error('EventBus handler for ' + String(name) + ' threw', err); }
    }
  }
}
