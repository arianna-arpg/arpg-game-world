import type { Actor } from '../../engine/actor';
import type { World } from '../../engine/world';
import type { Settings } from '../../meta/settings';
import { guardBashReady } from '../../engine/skills';
import { castingCompletion, castingDamageTags } from '../../engine/castingCues';
import { castMovementHeld, drawCastName } from './castReadout';
import { drawFocusFrame } from './castingCueLayer';
import { drawStrikeTimingBar } from './strikeTimingBar';
import { combatRectsOverlap, type CombatRect } from './combatFocus';
import type { CastBarOutline } from './castBarContrast';
import { VIS_CFG } from './visConfig';

export interface CastBar {
  actor: Actor;
  key: object;
  rect: CombatRect;
  meter: CombatRect;
  color: string;
  colors: readonly string[];
  paint: (ctx: CanvasRenderingContext2D) => void;
}

export function castBarPriority(world: World, actor: Actor): number {
  const p = VIS_CFG.castReadout.overlay.priority;
  if (actor === world.localSeat.actor) return p.self;
  if (world.localHumanSeats().some(s => s.actor === actor)) return p.local;
  if (world.seats.some(s => s.actor === actor)) return p.party;
  return actor.team === 'enemy' ? p.enemy : p.ally;
}

/** Readouts stay at their native actor anchor. Only paint order changes. */
export class CastBarOverlay {
  private rows: CastBar[] = [];
  begin(): void { this.rows.length = 0; }
  add(bar: CastBar): void { this.rows.push(bar); }
  has(actor: Actor): boolean { return this.rows.some(bar => bar.actor === actor); }
  get active(): boolean { return this.rows.length > 0; }

  paint(ctx: CanvasRenderingContext2D, world: World, bounds: CombatRect, visible: (actor: Actor) => boolean,
    contrast: (bar: CastBar) => CastBarOutline | null = () => null): void {
    const local = new Set(world.localHumanSeats().map(s => s.actor));
    const rows = this.rows.filter(bar => !bar.actor.dead && !bar.actor.downed && bar.actor.casting === bar.key
      && (local.has(bar.actor) || visible(bar.actor)) && combatRectsOverlap(bar.rect, bounds))
      .sort((a, b) => castBarPriority(world, a.actor) - castBarPriority(world, b.actor) || b.actor.id-a.actor.id);
    ctx.save(); ctx.globalAlpha = 1; ctx.globalCompositeOperation = 'source-over';
    for (const bar of rows) {
      ctx.save();
      const outline = contrast(bar);
      if (outline) {
        const c = VIS_CFG.castReadout.contrast, r = bar.meter;
        ctx.globalAlpha = outline.alpha; ctx.strokeStyle = outline.color; ctx.lineWidth = c.width;
        ctx.strokeRect(r.x-c.pad,r.y-c.pad,r.w+2*c.pad,r.h+2*c.pad);
        ctx.globalAlpha = 1;
      }
      // Native art comes last, including white timing tics and gold windows.
      bar.paint(ctx);
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
  const cfg = VIS_CFG.castReadout.tagColors;
  const colors = cfg.enabled ? castingDamageTags(cs).map(type => cfg.palette[type]) : [cs.inst.def.color];
  if (!colors.length) colors.push(cfg.neutral);
  const color = colors[0];
  // Each band spans the same clock, so every tag reads even at the start of a cast.
  const fillBands = (ctx: CanvasRenderingContext2D, width: number): void => {
    colors.forEach((ink, i) => {
      const top = Math.round(bh * i / colors.length), bottom = Math.round(bh * (i + 1) / colors.length);
      ctx.fillStyle = ink; ctx.fillRect(bx2, by2 + top, width, bottom - top);
    });
  };
  const meterRise=cs.mode==='overcharge'?Math.max(0,cs.stage??0)*4:4;
  const meterWidth=bw+(['overcharge','channel','multitude'].includes(cs.mode)?52:6);
  const labelHalf=(showName||movement)?VIS_CFG.castReadout.labelWidth/2+3:0;
  const meterLeft=Math.min(bx2-3,x-labelHalf),meterRight=Math.max(bx2-3+meterWidth,x+labelHalf);
  return { actor: a, key: cs,
    meter: { x: bx2, y: by2, w: bw, h: bh }, color, colors,
    rect: { x: meterLeft, y: by2-6-meterRise-nameHeight, w: meterRight-meterLeft, h: bh+8+meterRise+nameHeight },
    paint: ctx => {
      if (showName || movement) drawCastName(ctx, a, x, by2-6-meterRise, VIS_CFG.castReadout.labelWidth, movement, showName);
      ctx.fillStyle = 'rgba(0,0,0,0.7)';
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
      if (cfg.enabled) {
        ctx.globalAlpha = cfg.trackAlpha; fillBands(ctx, bw); ctx.globalAlpha = 1;
      }
      fillBands(ctx, bw * frac);
      // Mode decorations
      if (cs.mode === 'channel') {
        // CAPPED / BRIM channels wear their COMPLETION above the pulse
        // bar (the overcharge stacked-bar idiom): the gather's walk to
        // its ceiling, gold the instant it truly finishes. Enemies wear
        // it too — the whole room reads the doom-cast burning in.
        const holdFrac = castingCompletion(a) ?? null;
        if (holdFrac !== null) {
          const hy = by2 - 4;
          ctx.fillStyle = 'rgba(0,0,0,0.7)';
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
          ctx.fillStyle = 'rgba(0,0,0,0.7)';
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
          ctx.fillStyle = 'rgba(0,0,0,0.7)';
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
