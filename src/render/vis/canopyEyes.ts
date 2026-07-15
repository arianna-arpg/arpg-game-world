// ---------------------------------------------------------------------------
// CANOPY EYES — pinprick regard from the sealed roof (the Gloamwood's
// ambience, and any wood that wants it): pairs of eyes that blink in the
// crowns and exist ONLY where nobody is near enough to check. Walk toward
// them and they are simply not there when you arrive — the fade smooths the
// denial, and the crown itself keeps its bake and its composite slices (this
// is a sparse LIVE overlay, never a crown-painter swap).
//
// Data-driven: a DoodadVisualDef.canopy.eyes spec opts a kind in; every
// field defaults from VIS_CFG.canopyEyes. Self-contained by design — own
// fade smoothing (WeakMap; gone when the doodad is), world handed in per
// frame (type-only import: the vis layer never runtime-imports the engine).
// ---------------------------------------------------------------------------

import type { Doodad } from '../../engine/levelgen';
import type { World } from '../../engine/world';
import type { CrownEyesSpec } from './painters';
import { withAlpha } from './color';
import { VIS_CFG } from './visConfig';

const hash01 = (a: number, b: number): number => {
  let h = (a * 374761393 + b * 668265263) | 0;
  h = (h ^ (h >> 13)) * 1274126177;
  return ((h ^ (h >> 16)) >>> 0) / 4294967296;
};

export interface EyedGroup {
  spec: CrownEyesSpec;
  list: readonly Doodad[];
}

export class CanopyEyes {
  /** Per-crown presence fade (1 = eyes out, 0 = denied). WeakMap: state
   *  evaporates with the doodad — zone hops leak nothing. */
  private fade = new WeakMap<Doodad, number>();

  /** Draw under the caller's world-space transform, AFTER the crowns. */
  draw(ctx: CanvasRenderingContext2D, world: World, dt: number, groups: readonly EyedGroup[]): void {
    const C = VIS_CFG.canopyEyes;
    const hero = world.player;
    const t = world.time;
    for (const g of groups) {
      const reach = g.spec.reach ?? C.reach;
      const n = g.spec.count ?? C.count;
      const blinkRate = g.spec.blinkRate ?? C.blinkRate;
      const size = g.spec.size ?? C.size;
      const color = g.spec.color ?? C.color;
      for (const o of g.list) {
        const d = Math.hypot(hero.pos.x - o.pos.x, hero.pos.y - o.pos.y);
        // The rule of the wood: never show when a walker is near. The fade
        // eases the denial so the eyes withdraw rather than pop.
        const target = d > reach ? 1 : 0;
        const f0 = this.fade.get(o) ?? target;
        const f = f0 + (target - f0) * Math.min(1, dt * C.fadeRate);
        this.fade.set(o, f);
        if (f < 0.05) continue;
        const seed = ((o.pos.x * 13 + o.pos.y * 31) | 0) >>> 0;
        for (let i = 0; i < n; i++) {
          const a = hash01(i, seed) * Math.PI * 2;
          const rr = o.radius * (0.25 + hash01(i, seed + 7) * 0.55);
          const ex = o.pos.x + Math.cos(a) * rr;
          const ey = o.pos.y + Math.sin(a) * rr * 0.8;
          // Long-lidded: open most of the cycle, one slow wink at the end.
          const cyc = (t * blinkRate + hash01(i, seed + 13)) % 1;
          const open = cyc < 0.82 ? 1 : cyc < 0.9 ? 1 - (cyc - 0.82) / 0.08 : (cyc - 0.9) / 0.1;
          if (open < 0.1) continue;
          const gap = 2.6 + hash01(i, seed + 17) * 1.6;
          const er = (0.9 + hash01(i, seed + 23) * 0.7) * size;
          ctx.fillStyle = withAlpha(color, f * open * C.alpha);
          ctx.beginPath();
          ctx.ellipse(ex - gap, ey, er, er * open, 0, 0, Math.PI * 2);
          ctx.ellipse(ex + gap, ey, er, er * open, 0, 0, Math.PI * 2);
          ctx.fill();
        }
      }
    }
  }
}
