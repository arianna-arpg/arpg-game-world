import type { SkillFieldProfile } from '../../data/skillFlightVisuals';
import type { SkillFieldVisual } from '../../engine/skillFieldVisual';
import { hash01, shade, withAlpha } from './color';

/** Draw in the field's clipped local frame. All three layers use the same wind. */
export function drawBlizzard(ctx: CanvasRenderingContext2D, field: SkillFieldVisual, time: number,
  weather: NonNullable<SkillFieldProfile['blizzard']>): void {
  const r = field.radius, seed = Math.floor(field.pos.x * 17 + field.pos.y * 31);
  const strength = Math.min(1, Math.max(0, field.strength ?? 0));
  const speed = .95 + strength * .5, drift = weather.wind;
  const pale = shade(field.color, .77), dark = shade(field.color, -.47);
  const clock = (field.flowAt ?? 0) + time * speed;
  ctx.lineCap = 'round';
  ctx.lineJoin = 'round';
  // Crescent ribbons of spindrift, tapered at both ends. The ground remains visible between gusts.
  for (let i = 0; i < Math.min(12, weather.streaks); i++) {
    const u = (clock * .65 + hash01(i, seed + 11)) % 1;
    const x = r * ((u - .5) * 2.15 + (hash01(i, seed + 5) - .5) * .45);
    const y = r * ((hash01(i, seed + 19) - .5) * 1.7 + (u - .5) * .48);
    const length = r * (.25 + drift * .55), bend = r * (.075 + .035 * Math.sin(i + clock * 4));
    const weight = Math.min(5, r * .032) * (1 + strength * .36);
    ctx.fillStyle = withAlpha(field.color, (.18 + .14 * strength) * Math.sin(Math.PI * u));
    ctx.beginPath(); ctx.moveTo(x - length, y - bend);
    ctx.bezierCurveTo(x - length * .45, y + bend, x - length * .25, y - bend, x, y);
    ctx.quadraticCurveTo(x - length * .35, y - bend + weight, x - length, y - bend); ctx.fill();
    ctx.strokeStyle = withAlpha(pale, .40 * Math.sin(Math.PI * u));
    ctx.lineWidth = Math.max(.7, Math.min(1.6, r * .013));
    ctx.beginPath(); ctx.moveTo(x - length * .84, y - bend * .56);
    ctx.bezierCurveTo(x - length * .49, y + bend * .94, x - length * .21, y - bend, x, y); ctx.stroke();
  }
  // Fine snow travels with the wind between the larger fragments. Batch the
  // near and far grains into two strokes, independent of radius and frame rate.
  for (let layer = 0; layer < 2; layer++) {
    const grains = Math.min(26, Math.round(weather.shards * (.8 + .8 * strength)));
    ctx.strokeStyle = withAlpha(pale, layer ? .76 : .42);
    ctx.lineWidth = layer ? 1.45 : .9;
    ctx.beginPath();
    for (let i = 0; i < grains; i++) {
      const key = i + layer * 31, u = (hash01(key, seed + 61) + clock * (.72 + .16 * layer)) % 1;
      const x = (u * 2.4 - 1.2) * r;
      const y = (hash01(key, seed + 63) * 2 - 1.1 + .28 * u + .045 * Math.sin(u * 6 + key)) * r;
      const length = Math.min(5, r * .035) * (.6 + .5 * hash01(key, seed + 65));
      ctx.moveTo(x - drift * length, y - .45 * length); ctx.lineTo(x, y);
    }
    ctx.stroke();
  }
  // Falling two-facet needles each touch a fixed point, then split into rime on that spot.
  const n = Math.min(22, Math.round(weather.shards * (.75 + .65 * strength)));
  for (let i = 0; i < n; i++) {
    const a = hash01(seed, i * 7 + 41) * Math.PI * 2;
    const dist = Math.sqrt(hash01(seed, i * 7 + 42)) * r * .97;
    const landingX = Math.cos(a) * dist, landingY = Math.sin(a) * dist;
    const u = (clock * 1.8 + hash01(seed, i * 7 + 43)) % 1;
    const length = Math.min(21, r * (.09 + .08 * hash01(seed, i * 7 + 44)));
    if (u < .75) {
      const fall = 1 - u / .75;
      const x = landingX - fall * r * drift, y = landingY - fall * r * .64;
      const h = length * (1 + strength * .2), w = h * .19;
      if (i % 3 === 0) {
        // Flakes tumble broadside among the sleet. Forks retain their silhouette under a Wardrobe tint.
        const size = Math.min(8.5, length * .52);
        ctx.beginPath();
        for (let arm = 0; arm < 6; arm++) {
          const angle = a + arm * Math.PI / 3 + clock * .78;
          const dx = Math.cos(angle) * size, dy = Math.sin(angle) * size;
          ctx.moveTo(x, y); ctx.lineTo(x + dx, y + dy);
          ctx.moveTo(x + dx * .55, y + dy * .55);
          ctx.lineTo(x + dx * .76 - dy * .22, y + dy * .76 + dx * .22);
        }
        ctx.strokeStyle = withAlpha(dark, .75); ctx.lineWidth = 2.4; ctx.stroke();
        ctx.strokeStyle = pale; ctx.lineWidth = 1.1; ctx.stroke();
        continue;
      }
      ctx.fillStyle = dark;
      ctx.beginPath(); ctx.moveTo(x, y); ctx.lineTo(x - h * drift - w, y - h * .72);
      ctx.lineTo(x - h * drift, y - h); ctx.lineTo(x - h * drift + w, y - h * .72); ctx.closePath(); ctx.fill();
      ctx.fillStyle = pale;
      ctx.beginPath(); ctx.moveTo(x, y); ctx.lineTo(x - h * drift, y - h);
      ctx.lineTo(x - h * drift + w, y - h * .72); ctx.closePath(); ctx.fill();
    } else {
      const spread = (u - .75) * 4, lengthNow = length * (.3 + spread * .65);
      ctx.strokeStyle = withAlpha(pale, .86 * (1 - spread)); ctx.lineWidth = Math.max(.8, r * .011);
      ctx.beginPath();
      for (let k = 0; k < 3; k++) {
        const angle = a + k * 2.1;
        ctx.moveTo(landingX, landingY);
        ctx.lineTo(landingX + Math.cos(angle) * lengthNow, landingY + Math.sin(angle) * lengthNow * .56);
      }
      ctx.stroke();
    }
  }
}
