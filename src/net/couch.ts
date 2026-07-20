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
  AIM_ASSIST_MODES, connectedPadIndices, padButtonDown,
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
