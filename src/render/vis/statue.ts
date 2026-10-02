import type { GroupPainter, ColorSpec } from './painters';
import { resolveColor } from './painters';
import { hash01, shade, withAlpha } from './color';

/** Carved, clothed figure and stepped plinth. The outer square stays exactly
 * within the native statue's ±radius hit surface; relief is paint, not height.
 * One registry recipe serves small roadside pieces and larger monuments. */
export const paintStatue: GroupPainter = (env, group, def) => {
  const p = (def.params ?? {}) as { stone?: ColorSpec; moss?: ColorSpec; relief?: number; weathering?: number };
  const { ctx, theme } = env;
  const stone = resolveColor(p.stone, theme, '#aca28e');
  const moss = resolveColor(p.moss, theme, '#5a6e42');
  const relief = Math.max(0, Math.min(.65, p.relief ?? .32));
  const weathering = Math.max(0, Math.min(1, p.weathering ?? .55));
  const edge = shade(stone, -.55), light = shade(stone, relief);
  for (const o of group) {
    const r = o.radius, seed = ((o.pos.x * 17 + o.pos.y * 5) | 0) >>> 0;
    ctx.save();
    ctx.translate(o.pos.x, o.pos.y);
    ctx.rotate(o.rot ?? 0);
    // The square's two shallow chamfers catch light without inventing a
    // protruding silhouette that the existing collision surface cannot own.
    const step = (outer: number, inner: number, tone: string) => {
      ctx.fillStyle = shade(tone, -.22);
      ctx.fillRect(-outer, -outer, outer * 2, outer * 2);
      ctx.fillStyle = shade(tone, relief);
      ctx.beginPath(); ctx.moveTo(-outer, outer); ctx.lineTo(-outer, -outer);
      ctx.lineTo(outer, -outer); ctx.lineTo(inner, -inner);
      ctx.lineTo(-inner, -inner); ctx.lineTo(-inner, inner); ctx.closePath(); ctx.fill();
      ctx.fillStyle = tone; ctx.fillRect(-inner, -inner, inner * 2, inner * 2);
      ctx.strokeStyle = withAlpha(edge, .55); ctx.lineWidth = Math.max(.6, r * .025);
      ctx.strokeRect(-inner, -inner, inner * 2, inner * 2);
    };
    step(r, r * .87, shade(stone, -.17));
    step(r * .74, r * .65, shade(stone, -.03));
    // Incised memorial lines on the foot of the plinth, deliberately not text.
    ctx.strokeStyle = withAlpha(edge, .65); ctx.lineWidth = Math.max(.6, r * .025);
    for (let i = 0; i < 3; i++) {
      const half = r * (.22 - i * .035), y = r * (.49 + i * .052);
      ctx.beginPath(); ctx.moveTo(-half, y); ctx.lineTo(half, y); ctx.stroke();
    }
    const lean = (hash01(1, seed) - .5) * r * .14;
    ctx.translate(lean, -r * .09);
    // Robed shoulders and folded arms form a figure even at a steep overhead
    // view. A cast recess separates the silhouette from the stone beneath it.
    const figure = () => {
      ctx.beginPath(); ctx.moveTo(-r * .12, -r * .3);
      ctx.quadraticCurveTo(-r * .39, -r * .27, -r * .43, -r * .05);
      ctx.lineTo(-r * .29, r * .34); ctx.quadraticCurveTo(0, r * .43, r * .29, r * .34);
      ctx.lineTo(r * .43, -r * .05); ctx.quadraticCurveTo(r * .39, -r * .27, r * .12, -r * .3);
      ctx.closePath();
    };
    ctx.save(); ctx.translate(r * .035, r * .055); figure();
    ctx.fillStyle = withAlpha(edge, .65); ctx.fill(); ctx.restore();
    figure(); ctx.fillStyle = shade(stone, .08); ctx.fill();
    ctx.strokeStyle = edge; ctx.lineWidth = Math.max(.8, r * .035); ctx.stroke();
    ctx.strokeStyle = light; ctx.lineWidth = Math.max(.7, r * .026);
    ctx.beginPath(); ctx.moveTo(-r * .34, -.12 * r); ctx.lineTo(-r * .25, .29 * r);
    ctx.moveTo(-r * .14, .05 * r); ctx.lineTo(-r * .1, .34 * r);
    ctx.moveTo(r * .08, .08 * r); ctx.lineTo(r * .15, .34 * r); ctx.stroke();
    // Folded forearms cross a small tablet; they remain sculpture, not a weapon cue.
    ctx.strokeStyle = shade(stone, -.22); ctx.lineWidth = Math.max(1.3, r * .085);
    ctx.beginPath(); ctx.moveTo(-r * .31, -r * .08); ctx.lineTo(-r * .08, r * .07);
    ctx.lineTo(r * .2, r * .03); ctx.moveTo(r * .3, -r * .1);
    ctx.lineTo(r * .1, r * .08); ctx.stroke();
    ctx.fillStyle = shade(stone, -.04); ctx.fillRect(-r * .11, -r * .005, r * .22, r * .17);
    ctx.strokeStyle = light; ctx.lineWidth = Math.max(.6, r * .02);
    ctx.strokeRect(-r * .11, -r * .005, r * .22, r * .17);
    // Hood shell and recessed face: a distinct head above the shoulders.
    ctx.fillStyle = light; ctx.beginPath();
    ctx.ellipse(0, -r * .24, r * .17, r * .2, -.09, 0, Math.PI * 2); ctx.fill();
    ctx.fillStyle = shade(stone, -.34); ctx.beginPath();
    ctx.ellipse(r * .025, -r * .19, r * .105, r * .095, -.15, 0, Math.PI * 2); ctx.fill();
    ctx.strokeStyle = shade(stone, -.15); ctx.lineWidth = Math.max(.6, r * .025);
    ctx.beginPath(); ctx.moveTo(-r * .025, -r * .4); ctx.lineTo(-r * .07, -r * .28); ctx.stroke();
    ctx.translate(-lean, r * .09);
    // Small chips and moss stay off the face and preserve the carving's read.
    ctx.strokeStyle = withAlpha(edge, weathering * .8);
    ctx.lineWidth = Math.max(.7, r * .022);
    for (let i = 0; i < 3; i++) {
      const x = (-.65 + hash01(i + 3, seed) * 1.3) * r;
      const sign = i % 2 ? -1 : 1;
      ctx.beginPath(); ctx.moveTo(x, sign * r * .96);
      ctx.lineTo(x + r * .035, sign * r * .83);
      ctx.lineTo(x - r * .025, sign * r * .78); ctx.stroke();
    }
    ctx.fillStyle = withAlpha(moss, weathering * .7);
    for (let i = 0; i < 4; i++) {
      ctx.beginPath();
      ctx.ellipse(-r * .61 + hash01(i + 8, seed) * r * .19, -r * .55 + hash01(i + 15, seed) * r * .27,
        r * (.035 + hash01(i + 21, seed) * .07), r * .045, -.6, 0, Math.PI * 2);
      ctx.fill();
    }
    ctx.restore();
  }
};
