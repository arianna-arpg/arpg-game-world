// ---------------------------------------------------------------------------
// THE COUCH FABRIC — local shared-screen co-op as data.
//
// A second player on the same machine is a SEAT (engine/world.ts) whose input
// is a second physical gamepad and whose UI lives on this screen's other
// flank — nothing else. Every hard problem is already solved by the standing
// co-op fabrics and simply composes:
//
//   • intent      — PadSeatInput (net/couch.ts) fills the same PlayerInput
//                   every human/remote/scripted seat fills; the frame loop's
//                   existing non-self poll drives it with ZERO new paths.
//   • sim         — applyInputs / XP share / free-for-all loot / downed +
//                   revive / party enemy scaling: the multi-seat engine,
//                   verbatim.
//   • camera      — the shared frame widens to hold both heroes (couchFit in
//                   render/camera.ts) up to a hard stretch cap; past it THE
//                   EDGE LAW holds the runners inside the frame (world.
//                   couchConfine) — you keep running, the world stops giving.
//   • UI          — the canvas HUD cluster mirrors onto each seat's flank;
//                   DOM panels dock to their opener's half; the world map
//                   stays ONE shared chart (it always was).
//
// THE SOLO INVARIANT (the fabric's first law): with no couch seats, every
// branch below short-circuits — no state, no draw, no clamp, no menu row.
// Single-player is byte-identical; the couch does not exist until a second
// controller both EXISTS and SPEAKS.
//
// THE LANE LAW (run types stay compartmentalized): a mortal run seats a
// fresh, disposable second hero (the net-co-op join's Tier-0 idiom); an
// IMMORTAL run seats another immortal VESSEL from this account's roster —
// possible only once the account has bought a second immortal slot
// (unlocks.ts feat_immortal_slot_2). A vessel keeps everything it earns and
// PAYS ITS OWN COVENANT on a wipe (stage advance + carry strip + death
// record) — the couch must never be a cheaper way to die.
// ---------------------------------------------------------------------------

/** The couch identity riding a guest Seat (Seat.couch). Absent on the local
 *  hero's seat and every non-couch seat — its absence IS the solo invariant. */
export interface CouchSeatTag {
  /** Physical gamepad index (navigator.getGamepads() slot) driving this seat. */
  pad: number;
  /** Which screen flank this seat's HUD + panels claim. */
  side: 'left' | 'right';
  /** Roster vessel identity when the guest persists (the immortal lane).
   *  Undefined = a disposable run-scoped hero (the mortal lane's fresh pick). */
  charId?: string;
  /** The vessel's disk slot (meta/modes.ts RosterEntry.slot), when persistent. */
  rosterSlot?: number;
}

export const COUCH_CFG = {
  join: {
    /** Connected controllers required before the couch offer EXISTS anywhere —
     *  below this, no menu row, no claim listener, no trace. Two controllers
     *  is the fabric's home use-case; a machine that wants keyboard-hero +
     *  one-pad-guest couch play turns this dial to 1. */
    minPads: 2,
    /** Local human seats the screen budget serves (the local hero + guests).
     *  The engine's seat roster goes higher; this is couch estate, not sim. */
    maxLocal: 2,
    /** The claim button: the JOINING pad presses this on the join panel to
     *  bind itself to the guest seat ("press Ⓐ on the second controller"). */
    claimButton: 'a' as const,
    /** Immortal-lane gate: this many immortal roster SLOTS must be unlocked
     *  on the account before a second vessel can even exist to join with. */
    immortalSlotsNeeded: 2,
    /** Seat flanks in claim order: the local hero takes the first, the first
     *  guest the second. Left-for-P1 is the fabric default, not a law. */
    sides: ['left', 'right'] as ReadonlyArray<'left' | 'right'>,
  },
  camera: {
    /** World-unit breathing room kept around each hero inside the frame —
     *  the fit solves for hero spread + twice this. */
    fitMarginWu: 130,
    /** THE STRETCH CAP: the shared frame may widen (zoom fall) to base ×
     *  this and no further. Past it the frame stops growing and the edge
     *  law below holds the runners. 0.72 ≈ nearly double the solo view's
     *  area at the classic 1.3 base. */
    maxStretch: 0.72,
    /** Zoom smoothing rate (fraction per second toward the fit) — the frame
     *  breathes, it never snaps. */
    zoomLerp: 3.2,
    /** World-unit inset from the frame's edge the EDGE LAW confines couch
     *  heroes inside (world.couchConfine). Deliberately smaller than
     *  fitMarginWu: while the frame can still stretch, the fit answers
     *  first and the wall is never felt; only at the cap does it hold. */
    confineMarginWu: 40,
  },
  hud: {
    /** Screen-px inset (pre-UI-scale) of each side-anchored HUD cluster from
     *  its flank. Solo keeps the classic centered cluster untouched. */
    sideInset: 26,
  },
  panels: {
    /** Fraction of the viewport width a side-docked panel half may claim. */
    sideWidthFrac: 0.48,
  },
  render: {
    /** The positional veils (sight veil / room veil) are single-eye fabrics;
     *  under a shared couch frame they SUSPEND ('off') — both players see
     *  what the camera sees, the genre's shared-screen norm — until a
     *  union-of-eyes pass exists. 'p1' pins them to the local hero's eye
     *  instead (the guest plays inside the host's shadow). Render-only
     *  either way: engine LoS keeps its own honest ray. */
    sightVeil: 'off' as 'off' | 'p1',
    roomVeil: 'off' as 'off' | 'p1',
  },
} as const;
