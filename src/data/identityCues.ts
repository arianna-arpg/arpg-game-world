// THE IDENTITY CUES (docs/design/shard-world.md card 17 A — her ruling 2026-10-08:
// "a name entered once, overhead names on heroes, world-anchored pings (a visible
// cue, SHOW DON'T TELL)"): how a hosted world shows WHO is beside you and WHERE a
// mate is pointing, as data. Paint and timing only — nothing here moves a body.
// Her palette (memory: her-palette-ruling): gold #c8a84b, ether #8fa8d8.

export type HeroNameMode = 'all' | 'party' | 'off';

/** THE NAME OVER THE HERO: every other player's hero wears the name it entered
 *  once (the Mu card's naming; a vessel-less join's lobby name). The local hero
 *  never wears its own — the strip and the sheet know it. */
export const HERO_NAME_CUE = {
  /** The shipped default; `Settings.heroNames` overrides it per player. */
  mode: 'all' as HeroNameMode,
  /** Label seat above the scalp (renderer queueLabel dy — 8 hugs the head). */
  dy: 8,
  font: '10px Verdana',
  /** A party mate's name: her gold. */
  inkMate: '#c8a84b',
  /** An independent neighbour's name: her ether. */
  inkStranger: '#8fa8d8',
  /** A downed or dead hero's name. */
  inkDown: '#7a7390',
};

/** THE PING: a world-anchored mark a player sets for its party — rings breathing
 *  out of the point, a beacon standing on it, a chevron on the frame's edge when
 *  it stands off-screen. ONE standing per seat (a new press replaces it);
 *  host-judged for reach and cadence; it expires on the world clock. */
export const PING_CUE = {
  /** Seconds between two presses of one seat (a refused press changes nothing). */
  cooldownSec: 1.0,
  /** Seconds a mark stands. */
  lifeSec: 5,
  /** The farthest point a seat may mark, in px from its body — a farther aim lands
   *  ON the reach ring along the same bearing (clamped, never refused). */
  maxReach: 2200,
  /** The rings: count breathing at once, the breath's period, the full radius. */
  rings: 3,
  ringSec: 1.2,
  ringRadius: 48,
  lineW: 2.5,
  /** The beacon: a tapered shard standing on the point, bobbing. */
  beacon: { h: 52, w: 5, bobPx: 3, bobHz: 0.7 },
  /** Off-screen: the chevron's inset from the frame's edge and its size (screen px). */
  edge: { pad: 28, size: 13 },
  /** Fade-out seconds at the end of the life, fade-in at its start. */
  fadeOutSec: 0.6,
  fadeInSec: 0.15,
  /** Your own mark; a mate's mark (her gold). */
  inkSelf: '#e8e2c8',
  inkMate: '#c8a84b',
};
