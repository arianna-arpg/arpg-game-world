import type { SwapReadiness } from '../engine/swapReadiness';

/** A mirror without a host clock must not invent a recovery countdown. */
export function swapReadinessText(state: SwapReadiness, authoritative = true, showReady = false): string {
  if (!state.reason) return !showReady ? '' : authoritative ? 'Supports can be changed here.' : 'Support changes require a lull in combat.';
  if (authoritative && state.remaining !== undefined) {
    const seconds = (Math.ceil(Math.max(0, state.remaining) * 10) / 10).toFixed(1);
    return 'Socket changes unavailable: ' + state.reason + ' (recent combat). ' + seconds
      + 's of recovery remain. Further hits restart the timer.';
  }
  return 'Socket changes unavailable: ' + state.reason + '.';
}
