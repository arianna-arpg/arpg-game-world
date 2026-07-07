// ---------------------------------------------------------------------------
// PILOTS — PlayerInputSource policies that drive the hero seat in a sim.
//
// A pilot is deliberately SIMPLE and LEGIBLE: reproducible measurements need a
// driver whose behavior you can describe in one sentence, not a superhuman
// micro bot. All pilots share one loop:
//
//   1. pick the nearest living foe (real threats before passive scenery, so a
//      training dummy is targeted exactly when nothing is trying to kill you),
//   2. move per the policy (stand / close / hold a band),
//   3. work the buttons: OPENERS are edged once (auras, summon contracts,
//      trigger arming), the PRIMARY is held like a mouse button (channels
//      spool, repeats repeat), SECONDARIES are tapped when usable, one per
//      tick, in rotation order.
//
// Slot semantics mirror a human hand exactly (edge on the press frame, held
// while down) — the engine cannot tell a pilot from a player, which is the
// point: World.applyInputs is the same artery either way.
// ---------------------------------------------------------------------------

import { dist } from '../core/math';
import type { Actor } from '../engine/actor';
import type { World } from '../engine/world';
import { instanceTrigger } from '../engine/skills';
import type { PlayerInput, PlayerInputSource } from '../net/intent';
import type { PilotSpec } from './types';

/** Open pilot knobs. */
export const PILOT_CFG = {
  /** brawler: extra gap beyond touching radii before it stops advancing. */
  meleeGap: 26,
  /** caster: default hold range + the band's tolerance around it. */
  casterRange: 180,
  bandLow: 0.8,
  bandHigh: 1.15,
};

/** Nearest living foe; real (non-passive) threats win over scenery/dummies. */
function nearestFoe(world: World, actor: Actor): Actor | null {
  let best: Actor | null = null;
  let bestD = Infinity;
  let bestPassive = true;
  for (const e of world.enemiesOf(actor)) {
    if (e.dead || e.untargetable) continue;
    const passive = !!e.passive;
    const d = dist(actor.pos, e.pos);
    // A real threat beats any passive target regardless of distance.
    if (passive && !bestPassive) continue;
    if (!passive && bestPassive) { best = e; bestD = d; bestPassive = false; continue; }
    if (d < bestD) { best = e; bestD = d; bestPassive = passive; }
  }
  return best;
}

class Pilot implements PlayerInputSource {
  private opened = new Set<number>();
  private heldLast: boolean[] = [];
  private rotationCursor = 0;

  constructor(private spec: Exclude<PilotSpec, { kind: 'idle' }>) {}

  poll(actor: Actor, world: World, _dt: number): PlayerInput | null {
    const n = actor.skills.length;
    const held: boolean[] = new Array(n).fill(false);
    const edge: boolean[] = new Array(n).fill(false);
    if (this.heldLast.length !== n) this.heldLast = new Array(n).fill(false);

    const foe = nearestFoe(world, actor);
    const aim = foe ? { x: foe.pos.x, y: foe.pos.y } : { x: actor.pos.x + Math.cos(actor.facing) * 60, y: actor.pos.y + Math.sin(actor.facing) * 60 };

    // ---- movement -----------------------------------------------------------
    let dx = 0, dy = 0;
    if (foe) {
      const gap = dist(actor.pos, foe.pos);
      if (this.spec.kind === 'brawler') {
        const want = actor.radius + foe.radius + (this.spec.engage ?? PILOT_CFG.meleeGap);
        if (gap > want) { dx = foe.pos.x - actor.pos.x; dy = foe.pos.y - actor.pos.y; }
      } else if (this.spec.kind === 'caster') {
        const range = this.spec.range ?? PILOT_CFG.casterRange;
        if (gap > range * PILOT_CFG.bandHigh) { dx = foe.pos.x - actor.pos.x; dy = foe.pos.y - actor.pos.y; }
        else if (gap < range * PILOT_CFG.bandLow) { dx = actor.pos.x - foe.pos.x; dy = actor.pos.y - foe.pos.y; }
      }
      // 'turret' stands its ground.
    }

    // ---- buttons ------------------------------------------------------------
    // Default layout, derived from the LIVE bar: trigger-socketed and toggle
    // deliveries are OPENERS (edge once); everything else joins the rotation,
    // first entry as the held PRIMARY.
    const openers = this.spec.openers ?? [];
    const rotation = this.spec.rotation ?? [];
    const autoOpeners: number[] = [];
    const autoRotation: number[] = [];
    for (let i = 0; i < n; i++) {
      const inst = actor.skills[i];
      if (!inst) continue;
      if (openers.includes(i) || rotation.includes(i)) continue; // explicitly placed
      if (this.spec.openers || this.spec.rotation) continue;     // explicit spec = no autos
      const dv = inst.def.delivery as { type?: string; mode?: string };
      const toggleish = instanceTrigger(inst) !== undefined
        || (dv.type === 'aura' && dv.mode === 'toggle')
        || (dv.type === 'summon');
      (toggleish ? autoOpeners : autoRotation).push(i);
    }
    const allOpeners = [...openers, ...autoOpeners];
    const allRotation = rotation.length || this.spec.rotation ? rotation : autoRotation;

    if (foe) {
      // Openers: one edge each, once per episode, one per tick (deliberate).
      const pending = allOpeners.find(i => !this.opened.has(i) && actor.skills[i]);
      if (pending !== undefined) {
        const inst = actor.skills[pending]!;
        if (actor.canUse(inst) || instanceTrigger(inst)) {
          edge[pending] = true; held[pending] = true;
          this.opened.add(pending);
        }
      } else if (allRotation.length) {
        // SECONDARIES FIRST (cooldowns/utilities), one tap per tick, round-
        // robin over usable slots — a held primary would otherwise monopolize
        // the cast bar and the rest of the kit would never fire.
        let tapped = false;
        for (let k = 1; k <= allRotation.length - 1; k++) {
          const slot = allRotation[1 + ((this.rotationCursor + k - 1) % (allRotation.length - 1))];
          const inst = actor.skills[slot];
          if (inst && actor.canUse(inst)) {
            edge[slot] = true; held[slot] = true;
            this.rotationCursor = (this.rotationCursor + k) % Math.max(1, allRotation.length - 1);
            tapped = true;
            break;
          }
        }
        // Primary: the FILLER, held like a mouse button (edge on the press
        // frame). Released for one tick when a secondary taps, so the tap's
        // cast actually starts instead of losing the race to the filler.
        const primary = allRotation[0];
        if (actor.skills[primary] && !tapped) {
          held[primary] = true;
          if (!this.heldLast[primary]) edge[primary] = true;
        }
      }
    }

    this.heldLast = held;
    return { dx, dy, aim, held, edge };
  }
}

/** An always-idle seat (the punching-bag baseline). */
class IdlePilot implements PlayerInputSource {
  poll(): PlayerInput | null { return null; }
}

export function makePilot(spec: PilotSpec | undefined): PlayerInputSource {
  const s = spec ?? { kind: 'brawler' };
  if (s.kind === 'idle') return new IdlePilot();
  return new Pilot(s);
}
