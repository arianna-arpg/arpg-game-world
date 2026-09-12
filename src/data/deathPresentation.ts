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
  flashLeadSec: 0.07, // gather just before the break; peak at fragmentation
  flashSec: 0.28, // decay after the break; zero disables the flash
  flashAlpha: 0.9,
  flashRadiusScale: 5.5, // multiples of the body's radius
  flashColor: '#f4eaff',
  screenFlashAlpha: 0.42, // same pulse across the whole view; zero keeps it body-only
  dimBeforeBreak: 0.2,
};
