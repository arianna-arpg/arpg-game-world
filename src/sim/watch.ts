// ---------------------------------------------------------------------------
// THE EPISODE WATCH — the seam between the episode loop and whoever guards it.
//
// An engine can stop returning: a loop that never ends, or a world growing so fast
// that one episode takes hours. Nothing inside a stuck thread can notice that, so the
// guard lives outside (balance/farm/watchdog.ts, on a worker thread). The loop only
// says when an episode starts, each tick it finishes, and when it ends.
//
// Browser-safe, and costs a null check when nothing armed it. Observe-only: it never
// reads the clock or the dice, so a guarded run measures exactly what an unguarded one
// does.
// ---------------------------------------------------------------------------

export interface EpisodeWatch {
  /** An episode begins. Throws an EpisodeStalled error if this same episode stopped
   *  returning on an earlier attempt, which every lane already handles as a row that
   *  threw. */
  enter(scenario: { id: string }, seed: number): void;
  /** One simulated tick came back. */
  beat(): void;
  /** The episode finished or threw. */
  leave(): void;
  /** The command a person would run to see the current row again. */
  note(repro: string): void;
}

/** Every stalled row's message starts with this, so reports can group them. */
export const STALL_PREFIX = 'EpisodeStalled';

let WATCH: EpisodeWatch | null = null;

export function setEpisodeWatch(w: EpisodeWatch | null): void { WATCH = w; }
export function episodeWatch(): EpisodeWatch | null { return WATCH; }

export interface StallRecord {
  /** 'hung': a tick never came back. 'slow': ticks kept coming, past the episode cap. */
  kind: 'hung' | 'slow';
  /** Seconds it had been stuck, or running, when the watch stepped in. */
  secs: number;
  scenario: string;
  seed: number;
  /** Identifies this exact episode on a later attempt. */
  key: string;
  repro?: string;
  /** Innermost function first, read from the stuck thread. Empty if it could not be paused. */
  stack: string[];
}

/** One name per way of getting stuck: a spin always shows the same innermost frames,
 *  and a slow episode's sample means nothing beyond its being slow. */
export function stallSignature(r: Pick<StallRecord, 'kind' | 'stack'>): string {
  if (r.kind === 'slow') return `${STALL_PREFIX}: an episode ran past its time cap`;
  const frames = r.stack.slice(0, 3);
  return `${STALL_PREFIX}: hung in ${frames.length ? frames.join(' < ') : 'an unknown frame'}`;
}
