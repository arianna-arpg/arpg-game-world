// ---------------------------------------------------------------------------
// THE ONE CROSSING (docs/engine/shard.md, the charter §7e): a hosted world's
// arrival under ONE cover. A server-bound wake (the vessel's character flush),
// the connect, the shell standing (startAsClient), the shard's zone message,
// the first snapshot that holds the hero in that zone and the first page ring
// around it are one crossing: nothing of the world is drawn and no input
// leaves until the hero stands on streamed ground. The same lease covers a
// direct join, a reload's return and a HAND-OFF (a pocket and back: a short
// hold while the zone message and the first snapshot land, then the ring); a
// zone message that keeps the zone the shell already shows (THE RETURN in
// place, THE DRESS BEAT) never covers.
//
// A pure state machine: main.ts feeds it the events and mirrors its view onto
// the Mu crossing (ui/loadingScreen.ts); balance/probe_shardcrossing.ts drives
// it. It never touches a World, the DOM or the wire.
// ---------------------------------------------------------------------------

export const CROSSING_CFG = {
  /** A hand-off holds the last drawn frame this long before the crossing's
   *  screen rises, so a quick pocket hand-off never flashes it. */
  handoffGraceMs: 250,
};
export type CrossingCfg = typeof CROSSING_CFG;

/** wake: the vessel's flush; connect: the socket and the shard's welcome; zone:
 *  the shell stands and the shard's zone message is awaited; snapshot: the first
 *  snapshot holding the hero in that zone; ring: the first page ring around the
 *  hero (the wilds surface alone). */
export type CrossingPhase = 'idle' | 'wake' | 'connect' | 'zone' | 'snapshot' | 'ring';

/** The status line each phase shows: what is truly being prepared. */
export const CROSSING_LABELS: Readonly<Record<Exclude<CrossingPhase, 'idle'>, string>> = {
  wake: 'Taking form', connect: 'Reaching the world', zone: 'Laying the land',
  snapshot: 'Opening the world', ring: 'Crossing the veil',
};

export interface CrossingView {
  /** The world is held: no input leaves, nothing of it is drawn. */
  covered: boolean;
  /** The crossing's screen stands (a hand-off's rises after its grace). */
  shown: boolean;
  /** 'entry' descends (a wake, a join, a return); 'travel' crosses (a hand-off). */
  kind: 'entry' | 'travel';
  label: string;
  detail?: string;
  /** The ring's measured units (pages published of the pages the cover waits for). */
  completed?: number;
  total?: number;
}

export class ShardCrossing {
  phase: CrossingPhase = 'idle';
  /** Every phase entered, in order (the probe's read; capped). */
  readonly trail: CrossingPhase[] = [];
  private handoff = false;
  private since = 0;
  private target: string | null = null;
  private surface = false;
  private pending = 0;
  private total = 0;

  constructor(readonly cfg: CrossingCfg = CROSSING_CFG) {}

  get covered(): boolean { return this.phase !== 'idle'; }
  /** The zone the crossing waits to stand in (null before the zone message). */
  get zone(): string | null { return this.target; }

  private go(phase: CrossingPhase): void {
    if (phase === this.phase) return;
    this.phase = phase;
    this.trail.push(phase);
    if (this.trail.length > 64) this.trail.splice(0, 32);
  }
  private open(phase: CrossingPhase, nowMs: number, handoff: boolean): void {
    if (this.phase === 'idle') { this.since = nowMs; this.handoff = handoff; }
    this.go(phase);
  }

  /** A server-bound wake begins: the vessel is written down before it travels. */
  wake(nowMs: number): void { if (this.phase === 'idle') this.open('wake', nowMs, false); }
  /** The socket opens (a wake's connect keeps the wake's cover; a join opens one). */
  connect(nowMs: number): void { if (this.phase === 'idle' || this.phase === 'wake') this.open('connect', nowMs, false); }
  /** The shard seated us: the shell stands and its zone message is awaited. */
  welcome(): void { if (this.phase === 'connect') this.go('zone'); }

  /** A zone message landed. `shown`: the zone the shell showed before it (its
   *  appliedZoneId). Mid-crossing it names the zone to stand in; on a live shell a
   *  new zone is a HAND-OFF and the zone already shown is a re-ship (no cover). */
  zoneMsg(zoneId: string, surface: boolean, shown: string | null | undefined, nowMs: number): void {
    if (this.phase === 'wake') return; // no shell stands yet
    if (this.phase === 'idle') {
      if (zoneId === shown) return; // THE RETURN in place, THE DRESS BEAT: the shell never left
      this.open('snapshot', nowMs, true);
    } else if (zoneId === this.target && (this.phase === 'snapshot' || this.phase === 'ring')) return;
    this.target = zoneId; this.surface = surface; this.pending = 0; this.total = 0;
    this.go('snapshot');
  }

  /** A snapshot was adopted: `seated` when it holds our own seat. */
  snapshot(zoneId: string, seated: boolean): void {
    if (this.phase !== 'snapshot' || !seated || zoneId !== this.target) return;
    if (this.surface) this.go('ring'); else this.end();
  }

  /** The frame's page ring around the hero (the surface): ready releases the cover.
   *  `total`: the pages the ring holds (the measured progress). */
  ring(ready: boolean, pending: number, total = 0): void {
    if (this.phase !== 'ring') return;
    this.pending = Math.max(0, pending);
    this.total = Math.max(this.pending, total);
    if (ready) this.end();
  }

  /** The crossing ends (the far side reached, a cancel, a failure, a leave). */
  end(): void {
    this.go('idle');
    this.target = null; this.surface = false; this.handoff = false; this.pending = 0; this.total = 0;
  }

  view(nowMs: number): CrossingView {
    if (this.phase === 'idle') return { covered: false, shown: false, kind: 'entry', label: '' };
    const shown = !this.handoff || nowMs - this.since >= this.cfg.handoffGraceMs;
    const ring = this.phase === 'ring' && this.total > 0;
    const detail = this.phase === 'ring' && this.pending > 0 ? `${this.pending} nearby world pages remaining` : undefined;
    return { covered: true, shown, kind: this.handoff ? 'travel' : 'entry', label: CROSSING_LABELS[this.phase],
      ...(detail ? { detail } : {}), ...(ring ? { completed: this.total - this.pending, total: this.total } : {}) };
  }
}
