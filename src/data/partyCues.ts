// THE PARTY THAT READS (docs/engine/shard.md; charter cards 23 and 28): how a hosted
// world SHOWS its party to the players in it, as data. An invitation standing, a
// held down, the reach that holds it and the clock that ends the wait are drawn in
// the world (renderer drawPartyMarks / drawDownReads), never told: no caption names
// them. Paint and timing only; nothing here moves a body. Her palette (memory:
// her-palette-ruling): gold #c8a84b, ether #8fa8d8.

export const PARTY_CUE = {
  /** THE INVITE TELL: a beckon over the inviter's head while its invitation stands, in the
   *  inviter's own class color: a shard (the ping's beacon, smaller) bobbing above the name,
   *  under arcs breathing upward like a call. `lift` seats it above the name (px over the
   *  scalp); the arcs breathe `arcs` at a time over `arcSec`, out to `arcR`. */
  beckon: { lift: 24, h: 11, w: 4, bobPx: 3, bobHz: 0.9, arcs: 2, arcSec: 1.2, arcR: 12, lineW: 2, alpha: 0.95 },
  /** THE WIPE RADIUS, SHOWN: THE NEAR LAW's ring around a held down (the group law's reach
   *  made visible) for the downed player and the mates whose standing holds it: faint,
   *  dashed, breathing slowly. */
  wipe: { ink: '#c8a84b', alpha: 0.18, breath: 0.07, hz: 0.45, lineW: 2.5, dash: [22, 16] },
  /** THE BLEED-OUT: a ring just outside the revive ring that drains as the wait runs out; its
   *  last `urgentSec` pulse at `urgentHz`. */
  bleed: { ink: '#b0453a', gap: 7, lineW: 3, alpha: 0.85, urgentSec: 10, urgentHz: 2.2 },
  /** THE HOLDERS: the mates whose standing holds your down wear brackets flanking their name
   *  (HERO_NAME_CUE's seat and font; `gap` from the name, triangles of `size`), and one
   *  off-screen wears an edge chevron on the frame's inset edge, facing it. */
  holder: { ink: '#c8a84b', gap: 5, size: 4, edge: { pad: 30, size: 11 } },
};
