import type { Actor } from '../../engine/actor';
import type { World } from '../../engine/world';
import type { Settings } from '../../meta/settings';
import type { Vec2 } from '../../core/math';
import { guardBashReady } from '../../engine/skills';
import { castingCompletion } from '../../engine/castingCues';
import { castMovementHeld, drawCastName } from './castReadout';
import { drawFocusFrame } from './castingCueLayer';
import { drawStrikeTimingBar } from './strikeTimingBar';
import { CombatTextLayout, combatRectsOverlap, type CombatRect } from './combatFocus';
import { VIS_CFG } from './visConfig';

export interface CastBar {
  actor: Actor;
  key: object;
  rect: CombatRect;
  paint: (ctx: CanvasRenderingContext2D) => void;
}

export function castBarPriority(world: World, actor: Actor): number {
  const p = VIS_CFG.castReadout.overlay.priority;
  if (actor === world.localSeat.actor) return p.self;
  if (world.localHumanSeats().some(s => s.actor === actor)) return p.local;
  if (world.seats.some(s => s.actor === actor)) return p.party;
  return actor.team === 'enemy' ? p.enemy : p.ally;
}

/** Native actor admission and grouped-meter offsets arrive here first. Only
 * the painting is deferred; this class never advances or resolves a cast. */
export class CastBarOverlay {
  private rows: { bar: CastBar; offset: Vec2 }[] = [];
  private layout = new CombatTextLayout(() => ({ ...VIS_CFG.castReadout.overlay,
    enabled: VIS_CFG.castReadout.overlay.avoidOverlap }));
  begin(): void { this.rows.length = 0; }
  add(bar: CastBar, offset: Vec2): void { this.rows.push({ bar, offset }); }
  has(actor: Actor): boolean { return this.rows.some(row => row.bar.actor === actor); }

  paint(ctx: CanvasRenderingContext2D, world: World, bounds: CombatRect, visible: (actor: Actor) => boolean): void {
    const c = VIS_CFG.castReadout.overlay;
    const local = new Set(world.localHumanSeats().map(s => s.actor));
    const rows = this.rows.filter(({ bar }) => !bar.actor.dead && !bar.actor.downed && bar.actor.casting === bar.key
      && (local.has(bar.actor) || visible(bar.actor)))
      .sort((a, b) => castBarPriority(world, b.bar.actor) - castBarPriority(world, a.bar.actor)
        || a.bar.actor.id - b.bar.actor.id);
    this.layout.begin([], bounds);
    const placed: { bar: CastBar; rect: CombatRect; offset: Vec2 }[] = [];
    for (const { bar, offset } of rows) {
      const r = { ...bar.rect, x: bar.rect.x + offset.x, y: bar.rect.y + offset.y };
      if (!local.has(bar.actor) && !combatRectsOverlap(r, bounds)) continue;
      if (local.has(bar.actor)) {
        // Re-evaluate a local anchor instead of retaining an old displacement
        // once another local caster clears it. Lower-priority bars yield to it.
        this.layout.forget(bar.key);
        r.x = Math.max(bounds.x+c.gap, Math.min(r.x, bounds.x+bounds.w-r.w-c.gap));
        r.y = Math.max(bounds.y+c.gap, Math.min(r.y, bounds.y+bounds.h-r.h-c.gap));
      }
      const pos = { x: r.x+r.w/2, y: r.y+r.h };
      const at = this.layout.place(bar.key, pos, r.w, r.h);
      r.x += at.x-pos.x; r.y += at.y-pos.y;
      placed.push({ bar, rect: r, offset: { x: r.x-bar.rect.x, y: r.y-bar.rect.y } });
    }
    ctx.save(); ctx.globalAlpha = 1; ctx.globalCompositeOperation = 'source-over';
    // Leaders explain displaced readouts, and cannot paint over any bar.
    for (const { bar, rect, offset } of placed) if (offset.x || offset.y) {
      const a = bar.actor, end = { x: rect.x+rect.w/2, y: rect.y+rect.h+c.pad };
      const dx = end.x-a.pos.x, dy = end.y-a.pos.y, length = Math.hypot(dx,dy);
      if (length <= a.radius+c.gap) continue;
      const t = (a.radius+c.gap)/length;
      ctx.beginPath(); ctx.moveTo(a.pos.x+dx*t,a.pos.y+dy*t); ctx.lineTo(end.x,end.y);
      ctx.strokeStyle = c.background; ctx.lineWidth = c.linkWidth+2; ctx.stroke();
      ctx.strokeStyle = c.link; ctx.lineWidth = c.linkWidth; ctx.stroke();
    }
    // Reserve high priority first, paint it last. Saturation keeps every cast
    // and lets the local player's timing markers remain the foremost read.
    for (const { bar, rect, offset } of placed.reverse()) {
      ctx.save();
      ctx.fillStyle = c.background; ctx.fillRect(rect.x-c.pad,rect.y-c.pad,rect.w+2*c.pad,rect.h+2*c.pad);
      ctx.strokeStyle = c.edge; ctx.lineWidth = c.edgeWidth;
      ctx.strokeRect(rect.x-c.pad,rect.y-c.pad,rect.w+2*c.pad,rect.h+2*c.pad);
      ctx.translate(offset.x,offset.y); bar.paint(ctx);
      ctx.restore();
    }
    ctx.restore();
  }
}

/** The existing cast clock and decorations, independent of the surface painting them. */
export function prepareCastBar(a: Actor, world: World, settings?: Settings): CastBar | null {
  const cs = a.casting;
  if (!cs || a.dead || a.downed) return null;
  const { x, y } = a.pos;
  const castReadout = VIS_CFG.castReadout.enabled && world.seats.some(s => s.actor === a);
  const bw = VIS_CFG.castReadout.width, bh = VIS_CFG.castReadout.height;
  const movement = castReadout && (settings?.castMovementHint ?? VIS_CFG.castReadout.showMovement) && castMovementHeld(world,a)
    ? VIS_CFG.castReadout.plantedText : undefined;
  const showName = castReadout && (settings?.castNameHint ?? VIS_CFG.castReadout.showName);
  const nameHeight = (showName ? VIS_CFG.castReadout.nameHeight : 0) + (movement ? VIS_CFG.castReadout.movementHeight : 0);
  const bx2 = x - bw / 2, by2 = y - a.radius - 18;
  const color = cs.inst.def.color;
  const meterRise=cs.mode==='overcharge'?Math.max(0,cs.stage??0)*4:4;
  const meterWidth=bw+(['overcharge','channel','multitude'].includes(cs.mode)?52:6);
  const labelHalf=(showName||movement)?VIS_CFG.castReadout.labelWidth/2+3:0;
  const meterLeft=Math.min(bx2-3,x-labelHalf),meterRight=Math.max(bx2-3+meterWidth,x+labelHalf);
  return { actor: a, key: cs,
    rect: { x: meterLeft, y: by2-6-meterRise-nameHeight, w: meterRight-meterLeft, h: bh+8+meterRise+nameHeight },
    paint: ctx => {
      if (showName || movement) drawCastName(ctx, a, x, by2-6-meterRise, VIS_CFG.castReadout.labelWidth, movement, showName);
      ctx.fillStyle = VIS_CFG.castReadout.overlay.background;
      ctx.fillRect(bx2 - 1, by2 - 1, bw + 2, bh + 2);
      let frac: number;
      if (cs.mode === 'channel') {
        frac = cs.total > 0 ? 1 - Math.max(0, cs.pulseTimer ?? 0) / cs.total : 1;
      } else if (cs.mode === 'guard') {
        // The guard bar IS the shield's remaining health.
        frac = Math.max(0, (cs.shield ?? 0) / (cs.maxShield ?? 1));
      } else {
        frac = cs.total > 0 ? Math.min(1, cs.elapsed / cs.total) : 1;
      }
      ctx.fillStyle = color;
      ctx.fillRect(bx2, by2, bw * frac, bh);
      // Mode decorations
      if (cs.mode === 'channel') {
        // CAPPED / BRIM channels wear their COMPLETION above the pulse
        // bar (the overcharge stacked-bar idiom): the gather's walk to
        // its ceiling, gold the instant it truly finishes. Enemies wear
        // it too — the whole room reads the doom-cast burning in.
        const holdFrac = castingCompletion(a) ?? null;
        if (holdFrac !== null) {
          const hy = by2 - 4;
          ctx.fillStyle = VIS_CFG.castReadout.overlay.background;
          ctx.fillRect(bx2 - 1, hy - 1, bw + 2, 4);
          ctx.fillStyle = holdFrac >= 1 ? '#ffd700' : color;
          ctx.fillRect(bx2, hy, bw * holdFrac, 3);
        }
      }
      if (cs.mode === 'perfect' || cs.mode === 'timed') drawStrikeTimingBar(ctx, cs, bx2, by2, bw, bh);
      if (cs.mode === 'guard' && cs.bashAt !== undefined) {
        // THE BASH TIC: the live arming line — release on the ARMED side
        // of it and the stance converts into the blow. The value is
        // refreshGuardBash's (one resolver: supports, buffs and the
        // inverted contract all move it), shipped over the co-op wire, so
        // what this draws is exactly what the release check will decide.
        // The faint underline marks the armed side: right of the tic
        // normally, LEFT of it inverted (Hollow Answer — the bar reads
        // "cash what the wall has lost"). No tic = no bash on this stance.
        // THE ARM METER + THE READIED GOLD (2026-09-16): guardBashReady is
        // the ONE read the release decides by. The thin bar above the
        // guard bar is the arm clock walking (the capped-channel idiom —
        // hidden when the clock is 0), and the moment the bash is truly
        // READY (clock run AND wall on the armed side) meter, tic and
        // underline turn gold together; until then the tic sits dim — a
        // quick release just drops the wall. Enemy guards draw it too.
        const ready = guardBashReady(cs);
        const gold = '#ffd700';
        if ((cs.bashArmAt ?? 0) > 0) {
          const hy = by2 - 4;
          ctx.fillStyle = VIS_CFG.castReadout.overlay.background;
          ctx.fillRect(bx2 - 1, hy - 1, bw + 2, 4);
          ctx.fillStyle = ready.ready ? gold : color;
          ctx.fillRect(bx2, hy, bw * ready.clock, 3);
        }
        const tx = bx2 + bw * cs.bashAt;
        const x0 = cs.bashLow ? bx2 : tx;
        const x1 = cs.bashLow ? tx : bx2 + bw;
        ctx.fillStyle = ready.ready ? gold : '#ffffff';
        ctx.globalAlpha = ready.ready ? 0.8 : 0.35;
        ctx.fillRect(x0, by2 + bh + 1, Math.max(0, x1 - x0), 1);
        ctx.globalAlpha = ready.ready ? 1 : 0.55;
        ctx.fillRect(tx - 1, by2 - 2, 2, bh + 4);
        ctx.globalAlpha = 1;
      } else if (cs.mode === 'multitude') {
        ctx.strokeStyle = color;
        ctx.lineWidth = 1.5;
        ctx.strokeRect(bx2 - 3, by2 - 3, bw + 6, bh + 6);
        ctx.fillStyle = '#fff';
        ctx.font = 'bold 10px Verdana';
        ctx.textAlign = 'left';
        ctx.fillText(`×${cs.presses ?? 1}`, bx2 + bw + 6, by2 + bh);
        ctx.textAlign = 'center';
      } else if (cs.mode === 'charge' && frac >= 1) {
        ctx.strokeStyle = '#ffd700';
        ctx.lineWidth = 2;
        ctx.strokeRect(bx2 - 2, by2 - 2, bw + 4, bh + 4);
      } else if (cs.mode === 'concentration') {
        drawFocusFrame(ctx, bx2, by2, bw, bh, !!cs.focusBroken);
      } else if (cs.mode === 'overcharge') {
        // STACKED bars: every banked stage is a thin filled bar laid on
        // top of the refilling one — the old JRPG hold, made literal.
        const stages = cs.stage ?? 0;
        for (let s = 0; s < stages; s++) {
          const sy = by2 - 4 - s * 4;
          ctx.fillStyle = VIS_CFG.castReadout.overlay.background;
          ctx.fillRect(bx2 - 1, sy - 1, bw + 2, 4);
          ctx.fillStyle = '#ffd700';
          ctx.fillRect(bx2, sy, bw, 3);
        }
        drawStrikeTimingBar(ctx, cs, bx2, by2, bw, bh);
        // The SPARK: a bright flare right as a stage banks — and while a
        // spark WINDOW is invested (Spark Discipline), a golden border
        // marks the open release window after each bank.
        const since = cs.sinceStage ?? 999;
        if (since < 0.15 && stages > 0) {
          ctx.fillStyle = '#ffffff';
          ctx.beginPath();
          ctx.arc(bx2 + bw + 8, by2 + bh / 2, 4, 0, Math.PI * 2);
          ctx.fill();
        }
        if (stages > 0 && (cs.sparkWindow ?? 0) > 0 && since <= (cs.sparkWindow ?? 0)) {
          ctx.strokeStyle = '#ffd700';
          ctx.lineWidth = 2;
          ctx.strokeRect(bx2 - 2, by2 - 2, bw + 4, bh + 4);
        }
        ctx.fillStyle = '#fff';
        ctx.font = 'bold 9px Verdana';
        ctx.textAlign = 'left';
        if (stages > 0) ctx.fillText(`+${stages}`, bx2 + bw + 5, by2 - 4);
        ctx.textAlign = 'center';
      } else if (cs.mode === 'channel') {
        ctx.fillStyle = '#fff';
        ctx.font = '9px Verdana';
        ctx.textAlign = 'left';
        ctx.fillText(`${(cs.channelTime ?? 0).toFixed(1)}s`, bx2 + bw + 5, by2 + bh);
        ctx.textAlign = 'center';
      }
    },
  };
}
