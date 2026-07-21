// ---------------------------------------------------------------------------
// COUCH GUEST INPUT — the second controller as a PlayerInputSource.
//
// A couch guest (data/couch.ts) is an ordinary Seat whose intent comes from a
// SECOND PadState bound to its claimed pad slot. poll() mirrors main.ts
// readLocalInput's pad half exactly — the same analog move fold, the same
// deflection-scaled world-space aim with the same soft assist and sticky
// write-back, the same held/edge/meta slot grammar — so a guest's hands feel
// byte-for-byte like the hero's pad. No mouse half: a couch guest IS a pad.
//
// Device polling stays in main.ts's tick (the guest pad polls beside the
// hero's, same wall clock); this source only READS the polled state — the
// exact split readLocalInput already has.
//
// PadClaimScanner is the join panel's "press Ⓐ on the joining controller"
// primitive: a per-frame raw-button edge scan over unclaimed pad slots,
// self-contained so no gameplay press state is disturbed.
// ---------------------------------------------------------------------------

import {
  AIM_ASSIST_MODES, connectedPadIndices, padButtonDown, padCode, padIdAt,
  type AimAssistMode, type PadButton, type PadState, type PadTuning,
} from '../core/gamepad';
import { AIM_ASSIST, assistAim } from '../engine/aimassist';
import type { Actor } from '../engine/actor';
import type { World } from '../engine/world';
import type { Settings } from '../meta/settings';
import type { PlayerInput, PlayerInputSource } from './intent';

/** Everything a guest source reads from the machine each frame — thunks so
 *  live Settings edits (options screen) land immediately, like the hero's. */
export interface CouchInputDeps {
  tuning: () => PadTuning;
  binds: () => Settings['padBinds'];
  assist: () => { mode: AimAssistMode; strength: number };
  improvisedStrike: () => boolean;
  invertMove: () => boolean;
  /** Gameplay parks while true — the guest's pointer owns their pad (their
   *  panels are up) or a blocking surface (pause menu, join panel) is. */
  suspended: () => boolean;
}

const SLOT_ACTS = [
  'skillSlot0', 'skillSlot1', 'skillSlot2', 'skillSlot3',
  'skillSlot4', 'skillSlot5', 'skillSlot6', 'skillSlot7',
] as const;

export class PadSeatInput implements PlayerInputSource {
  /** The soft assist's held target (this guest's own lock — never the hero's). */
  private padLock: number | null = null;
  /** Last delivered aim point — re-served on zero-length frames so a timer
   *  twin can't wipe the lock (the same guard readLocalInput carries). */
  private lastAim: { x: number; y: number } | null = null;

  constructor(readonly pad: PadState, private readonly deps: CouchInputDeps) {}

  /** The guest's live aim + soft-lock (the renderer draws their reticle and
   *  lock brackets from this — what you see IS what their casts receive). */
  aimView(): { x: number; y: number; lockId: number | null } | null {
    return this.lastAim ? { x: this.lastAim.x, y: this.lastAim.y, lockId: this.padLock } : null;
  }

  poll(actor: Actor, world: World, dt: number): PlayerInput | null {
    if (actor.dead || actor.downed) return null;
    if (this.deps.suspended()) return null;
    const pad = this.pad;
    if (!pad.connected) return null;
    const pb = this.deps.binds();

    // --- movement: bound buttons OR the analog stick, inverted per the
    // machine's own standard (one flip for every local hand — see main.ts). ---
    let dx = 0, dy = 0;
    if (pad.isDown(pb.moveUp)) dy -= 1;
    if (pad.isDown(pb.moveDown)) dy += 1;
    if (pad.isDown(pb.moveLeft)) dx -= 1;
    if (pad.isDown(pb.moveRight)) dx += 1;
    dx += pad.move.x; dy += pad.move.y;
    if (this.deps.invertMove()) { dx = -dx; dy = -dy; }

    // --- aim: stick direction at deflection-scaled reach from the guest's
    // own hero, sticky on release, bent by the soft assist — the reticle the
    // renderer draws IS what every castAtCursor skill receives. ---
    const t = this.deps.tuning();
    const reach = pad.aimReach(pad.aimMag > 0 ? pad.aimMag : pad.lastAimMag, t);
    const raw = { x: actor.pos.x + pad.lastAimDir.x * reach, y: actor.pos.y + pad.lastAimDir.y * reach };
    let aim = raw;
    if (dt <= 0 && this.lastAim) {
      aim = { x: this.lastAim.x, y: this.lastAim.y };
    } else {
      const as = this.deps.assist();
      // 'cursor' mode compounds the write-back on stick-at-rest frames —
      // correct the blend so settle/track rates are monitor-independent
      // (the identical correction readLocalInput applies).
      const strength = (as.mode === 'cursor' && pad.aimMag === 0 && as.strength < 1)
        ? 1 - Math.pow(1 - as.strength, dt * AIM_ASSIST.glideRefHz)
        : as.strength;
      const assisted = assistAim(world, actor, raw, this.padLock, strength);
      this.padLock = assisted.targetId;
      aim = { x: assisted.x, y: assisted.y };
      if (as.mode === 'cursor' && this.padLock !== null) {
        // THE ASSIST MOVES THE CURSOR: fold the assisted point back into this
        // pad's sticky aim (hero-relative dir + reach), so a broken lock
        // continues from where the guest's reticle visibly is.
        const ax = aim.x - actor.pos.x, ay = aim.y - actor.pos.y;
        const d = Math.hypot(ax, ay);
        if (d > 1e-3) {
          const mag = (d - t.aimMinRadius) / Math.max(1, t.aimMaxRadius - t.aimMinRadius);
          pad.setStickyAim({ x: ax / d, y: ay / d }, mag);
        }
      }
      this.lastAim = { x: aim.x, y: aim.y };
    }

    // --- slots: held/edge per bar slot from the shared pad binds. ---
    const held = SLOT_ACTS.map(actId => pad.isDown(pb[actId]));
    const edge = SLOT_ACTS.map(actId => pad.justPressed(pb[actId]));
    // The unarmed-floor opt-out shapes THIS machine's hands, hero and guest
    // alike (it's a keybind-grade preference, not a per-seat rule).
    if (!this.deps.improvisedStrike()) {
      for (let i = 0; i < held.length; i++) {
        if (!actor.skills[i]) { held[i] = false; edge[i] = false; }
      }
    }

    // --- meta layer: modifier+slot reroutes fresh EDGES to the slot's
    // meta-action; held states survive (a guard must not drop for a meta
    // reach) — and a modifier press ALONE during a held cast fires the held
    // skill's meta, scoped to exactly that slot. Mirrors readLocalInput. ---
    const metaEdgePressed = pad.justPressed(pb.metaModifier);
    if (pad.isDown(pb.metaModifier)) {
      const metaEdge = edge.map(() => false);
      for (let i = 0; i < edge.length; i++) if (edge[i]) metaEdge[i] = true;
      if (metaEdgePressed && actor.casting
        && ['guard', 'channel', 'charge', 'overcharge', 'concentration'].includes(actor.casting.mode)) {
        const ci = actor.skills.findIndex(s => s === actor.casting!.inst);
        if (ci >= 0) metaEdge[ci] = true;
      }
      return { dx, dy, aim, held, edge: edge.map(() => false), metaEdge };
    }
    return { dx, dy, aim, held, edge };
  }
}

/** Sanitize a stored assist-mode id against the registry (guests share the
 *  machine's Settings; a stale save degrades to the registry default). */
export function assistModeOf(id: string): AimAssistMode {
  return (AIM_ASSIST_MODES.some(m => m.id === id) ? id : AIM_ASSIST_MODES[0].id) as AimAssistMode;
}

/** The join panel's claim scan: which unclaimed pad slot freshly pressed the
 *  claim button this frame? Raw-read + self-edge-detected, so scanning never
 *  consumes gameplay press state and needs no PadState. */
export class PadClaimScanner {
  private prev = new Set<number>();
  scan(button: PadButton, exclude: ReadonlySet<number>): number | null {
    const down = new Set<number>();
    for (const i of connectedPadIndices()) {
      if (exclude.has(i)) continue;
      if (padButtonDown(i, button)) down.add(i);
    }
    let hit: number | null = null;
    for (const i of down) if (!this.prev.has(i)) { hit = i; break; }
    this.prev = down;
    return hit;
  }
  reset(): void { this.prev.clear(); }
}

/** THE CLAIM SESSION — the join overlay's whole pad policy in one object.
 *
 *  The deadlock it exists to kill (found live on the Steam Deck): the hero's
 *  unbound read ROAMS to the freshest-timestamp pad, so the joining pad's
 *  very first Ⓐ press was adopted as "the hero's pad" in the same frame —
 *  and the claim scan, excluding the hero's recently-active slot, could then
 *  never see it. Every press re-sealed the exclusion; the claim was
 *  structurally impossible on real hardware. (Indexed fakes carried no
 *  timestamps, so the browser rig's first-slot-wins roam pinned the flow
 *  green while hardware deadlocked — FakePad.timestamp now closes that gap.)
 *
 *  The law: while the claim scan is ARMED, the hero's roaming read is PINNED
 *  where it stood when the overlay opened — its recently-active slot, else
 *  no pad at all (a keyboard hero) — so the scan and the roam can never race
 *  for the same press, and a joining press can never click through the
 *  hero's pointer. The pin LIFTS the moment a pad claims: the claimed pad
 *  must be free to drive the pick phase's pointer (the joining player
 *  chooses their own hero), and it leaves the hero's pool for good only at
 *  seat mint. */
export class CouchClaimSession {
  private scanner = new PadClaimScanner();
  private hold: number | 'none' | null = null;
  constructor(private readonly heroPad: PadState) {}

  /** Armed = the claim phase is live (the pin is standing). */
  get armed(): boolean { return this.hold !== null; }
  /** The pinned hero slot (null while unarmed, or a keyboard hero). */
  get heroSlot(): number | null { return typeof this.hold === 'number' ? this.hold : null; }

  /** Arm at overlay open: freeze the hero's read where it stands. Clock-free
   *  — "recently active" is judged on the pad's own poll clock, so harness
   *  time and wall time can never disagree about the pin. THE DEAD-CLAIM
   *  GUARD: the ceremony must never arm into a claim nothing can answer —
   *  if pinning the hero's live slot would leave ZERO claimable pads (the
   *  keyboard-and-one-controller household, minPads dialed to 1), the pin
   *  falls to 'none' and the hero's own pad becomes the joiner: pressing Ⓐ
   *  hands it to the guest and the hero plays on keys — exactly that
   *  household's intended shape. */
  arm(claimed: ReadonlySet<number> = new Set()): void {
    let hold: number | 'none' = this.heroPad.sourceIndex !== null && this.heroPad.activeAtLastPoll()
      ? this.heroPad.sourceIndex : 'none';
    if (typeof hold === 'number') {
      const h = hold;
      if (!connectedPadIndices().some(i => i !== h && !claimed.has(i))) hold = 'none';
    }
    this.hold = hold;
    this.heroPad.padPin = hold;
    this.scanner.reset();
  }

  /** Per-frame while the overlay says "press Ⓐ": which unclaimed pad freshly
   *  pressed? A hit releases the pin and returns the claimed slot. The
   *  claiming press itself is swallowed from the hero's next read — the
   *  roam adopts the claimed pad MID-HOLD, and that press must not also
   *  click the pick overlay through the hero's pointer. */
  scan(button: PadButton, claimed: ReadonlySet<number>): number | null {
    if (this.hold === null) return null;
    const exclude = typeof this.hold === 'number'
      ? new Set([...claimed, this.hold]) : claimed;
    const hit = this.scanner.scan(button, exclude);
    if (hit !== null) {
      this.heroPad.suppressNextEdge(padCode(button));
      this.release();
    }
    return hit;
  }

  /** Disarm + unpin — claim landed, overlay closed, or session torn down.
   *  Idempotent; the one door every exit path funnels through. */
  release(): void {
    this.hold = null;
    this.heroPad.padPin = null;
    this.scanner.reset();
  }
}

/** THE IDENTITY RE-BIND's match (main.ts couch sweep): a lost guest pad may
 *  re-bind only to a slot that (a) wears the SAME device identity, (b) is
 *  not claimed by any seat, and (c) was NOT already connected when the loss
 *  was noticed (lostSeen) — the returning device arrives as a NEWCOMER, so a
 *  standing pad (the hero's, even an idle one) can never be stolen.
 *  Identical twin controllers share an id string; the newcomer rule is the
 *  best identity the Gamepad API allows (no serials are exposed). */
export function findRebindSlot(
  padId: string | null,
  lostSeen: ReadonlySet<number>,
  claimed: ReadonlySet<number>,
): number | null {
  if (!padId) return null;
  for (const i of connectedPadIndices()) {
    if (claimed.has(i) || lostSeen.has(i)) continue;
    if (padIdAt(i) === padId) return i;
  }
  return null;
}
