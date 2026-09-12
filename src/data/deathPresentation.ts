/** Run-ending death presentation, in seconds/world pixels. No gameplay effects.
 * A zero duration skips a phase; disabling restores the immediate epilogue. */
export const DEATH_PRESENTATION = {
  enabled: true,
  riseSec: 0.95,
  crackSec: 0.65,
  shatterSec: 1.35,
  revealDelaySec: 0.2, // after the body breaks
  revealSec: 1.15,
  lift: 26,
  shardCount: 16,
  shardSpeed: 48,
  gravity: 32,
  spin: 1.8,
  crackColor: '#f0d9ff',
  crackWidth: 1.1,
  dimBeforeBreak: 0.2,
};
