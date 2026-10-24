import type { PlayerInput } from '../src/net/intent';

/** The soak may cut only a hero whose current life actually acted on the host.
 * A rejoin's first standing snapshot can still carry its previous life's ack. */
export class SoakLifeInput {
  private firstWilledSeq: number | null = null;
  private acknowledged = false;

  reset(): void { this.firstWilledSeq = null; this.acknowledged = false; }

  sent(input: PlayerInput): void {
    if (this.firstWilledSeq !== null || !Number.isSafeInteger(input.seq)) return;
    const willed = input.dx !== 0 || input.dy !== 0 || input.held.some(Boolean) || input.edge.some(Boolean)
      || (input.metaEdge?.some(Boolean) ?? false) || (input.moves?.some(m => m[0] !== 0 || m[1] !== 0) ?? false);
    if (willed) this.firstWilledSeq = input.seq!;
  }

  observe(seq: number | undefined): void {
    if (this.firstWilledSeq !== null && Number.isSafeInteger(seq) && seq! >= this.firstWilledSeq)
      this.acknowledged = true;
  }

  get canCut(): boolean { return this.acknowledged; }
}
