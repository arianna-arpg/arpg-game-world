import { procCueStyle, type ProcCueRow } from '../../engine/procCues';
import { PROC_CUE_CFG as C, procReceiptMark } from '../../data/procCues';
import type { BuffMagazine } from './buffAddendum';
import type { CosmeticHotbarStyle } from '../../data/cosmeticStyles';
import { drawBuffMark } from './buffMantle';
import { drawCountSeal } from './hotbarSeals';
import { VIS_CFG } from './visConfig';
const TAU = Math.PI * 2;
const clamp = (n: number) => Math.max(0, Math.min(1, n));

function glyph(ctx: CanvasRenderingContext2D, row: ProcCueRow, x: number, y: number, size: number, fill = 1, emptyAlpha = .45) {
  const shape = procCueStyle(row.profile).shape;
  ctx.save(); ctx.translate(x, y); ctx.lineJoin = 'round'; ctx.lineCap = 'round'; ctx.beginPath();
  if (shape === 'flame') {
    ctx.moveTo(0, -size); ctx.quadraticCurveTo(size * 0.1, -size * 0.2, size * 0.7, size * 0.1);
    ctx.quadraticCurveTo(size, size, 0, size); ctx.quadraticCurveTo(-size, size, -size * 0.5, 0); ctx.closePath();
  } else if (shape === 'bolt') {
    ctx.moveTo(size * 0.5, -size); ctx.lineTo(-size * 0.65, size * 0.1); ctx.lineTo(0, size * 0.1);
    ctx.lineTo(-size * 0.4, size); ctx.lineTo(size * 0.65, -size * 0.15); ctx.lineTo(0, -size * 0.15); ctx.closePath();
  } else if (shape === 'bead') {
    ctx.ellipse(0, 0, size * 0.7, size, 0, 0, TAU);
  } else {
    ctx.moveTo(0, -size); ctx.lineTo(size * (shape === 'blade' ? 0.35 : 0.6), 0);
    ctx.lineTo(0, size); ctx.lineTo(-size * 0.6, 0); ctx.closePath();
  }
  ctx.strokeStyle = C.outline; ctx.lineWidth = C.width + 2; ctx.stroke();
  ctx.fillStyle = C.outline; ctx.fill();
  ctx.save(); ctx.clip(); ctx.fillStyle = row.color; ctx.fillRect(-size, size - 2 * size * clamp(fill), size * 2, size * 2); ctx.restore();
  if (fill <= 0) ctx.globalAlpha *= emptyAlpha;
  ctx.strokeStyle = row.color; ctx.lineWidth = C.width; ctx.stroke();
  if (shape === 'rune') { ctx.beginPath(); ctx.moveTo(-size * 0.3, 0); ctx.lineTo(size * 0.3, 0); ctx.strokeStyle = C.outline; ctx.stroke(); }
  ctx.restore();
}
/** Existing buff slots retain their hover reference; the payload supplies the shape. */
export function drawProcBuff(ctx: CanvasRenderingContext2D, row: ProcCueRow, x: number, y: number): void {
  glyph(ctx, row, x, y, 5, row.count / Math.max(1, row.cap));
}
/** An exact balance and proportional dial on the granting skill. */
export function drawBuffMagazine(ctx: CanvasRenderingContext2D, {buff,bank,rect}: BuffMagazine,
  skin?: CosmeticHotbarStyle): void {
  const cfg = VIS_CFG.buffMagazine, {x,y,w,h} = rect, capacity = Math.max(1,bank.cap);
  ctx.save();
  const cx=x+w/2, cy=y+h/2;
  ctx.fillStyle=skin?.rail ?? cfg.plate; ctx.fillRect(x,cy-2,w,4);
  ctx.fillStyle=skin?.border ?? cfg.rim; ctx.fillRect(x,cy-.5,w,1);
  drawCountSeal(ctx,cx,cy,h/2-1,bank.count,bank.color,capacity);
  const warn = VIS_CFG.buffIcons.warningSeconds;
  if (buff.remaining !== undefined && buff.remaining < warn && warn > 0) {
    ctx.fillStyle=bank.color; ctx.fillRect(x+1,y+h-2,(w-2)*clamp(buff.remaining/warn),1);
  }
  ctx.restore();
}
export function drawProcBody(ctx: CanvasRenderingContext2D, rows: readonly ProcCueRow[], radius: number): void {
  let lane = 0, rune = 0;
  for (const row of rows) {
    if (row.phase !== 'stored') continue;
    const isRune = row.id.startsWith('rune:');
    if (!isRune && lane >= C.bodyRows) continue;
    if (isRune && rune >= C.bodyPips) continue;
    const n = Math.min(C.bodyPips, Math.ceil(row.cap)), size = procCueStyle(row.profile).size;
    for (let i = 0; i < n; i++) {
      // Loaded material hugs the lower silhouette, away from drink/ammo rows.
      const x = isRune ? (rune++ - 2) * 9 : (i - (n - 1) / 2) * 9;
      const y = radius + C.bodyPad + (isRune ? C.bodyRows : lane) * C.rowGap;
      ctx.save(); ctx.globalAlpha *= C.alpha;
      glyph(ctx, row, x, y, size, row.count / Math.max(1, row.cap) * n - i); ctx.restore();
    }
    if (!isRune) lane++;
  }
  for (const row of rows.filter(r => r.phase !== 'stored').slice(-C.pulses)) {
    const rem = clamp(row.remaining ?? 0), t = 1 - rem;
    const n = Math.min(C.bodyPips, Math.max(3, row.count));
    const inward = row.phase === 'gain' || row.phase === 'invoke';
    const d = radius * 0.6 + C.travel * (inward ? rem : t);
    ctx.save(); ctx.globalAlpha *= rem * C.alpha;
    for (let i = 0; i < n; i++) {
      const angle = i * TAU / n;
      glyph(ctx, row, Math.cos(angle) * d, Math.sin(angle) * d, procCueStyle(row.profile).size * (0.6 + rem * 0.4));
    }
    ctx.restore();
  }
}
/** Short releases sit above the bank strip. Persistent buffs and ordered
 * runes retain their established slots, including short three-skill bars. */
/** The middle of the bezel stays clear of the charge face and socket rail.
 * A rewinding clock means time returned; bright open brackets mean ready. */
export function drawCooldownReturn(ctx:CanvasRenderingContext2D,rows:readonly ProcCueRow[],skill:string,x:number,y:number,slot:number):void {
  for(let i=rows.length-1;i>=0;i--) {
    const row=rows[i], state=row.cooldowns?.[skill];
    if (!state) continue;
    const remaining=row.remaining??0;
    if (remaining<=0) return;
    const cfg=C.clock, radius=slot*cfg.radius, cy=y+slot*.53;
    ctx.save();ctx.globalAlpha*=Math.min(1,remaining*2);
    ctx.lineCap='round';ctx.lineJoin='round';ctx.beginPath();
    if (state==='shortened') {
      const cx=x+slot*cfg.inset+radius;
      ctx.arc(cx,cy,radius,-Math.PI*.84,Math.PI*.83);
      ctx.moveTo(cx-radius,cy-radius*.8);ctx.lineTo(cx-radius*.86,cy-radius*.1);ctx.lineTo(cx-radius*.22,cy-radius*.46);
      ctx.moveTo(cx,cy-radius*.56);ctx.lineTo(cx,cy);ctx.lineTo(cx+radius*.42,cy+.2*radius);
    } else {
      for (const side of [-1,1]) {
        const edge=x+slot*(side===-1?cfg.inset:1-cfg.inset), inward=-side;
        ctx.moveTo(edge+inward*radius,cy-radius);ctx.lineTo(edge,cy);ctx.lineTo(edge+inward*radius,cy+radius);
      }
    }
    ctx.strokeStyle=C.outline;ctx.lineWidth=cfg.width+2;ctx.stroke();
    ctx.strokeStyle=state==='ready'?cfg.ink:row.color;ctx.lineWidth=cfg.width;ctx.stroke();
    ctx.restore();return;
  }
}
export function drawProcHud(ctx: CanvasRenderingContext2D, rows: readonly ProcCueRow[], x: number, y: number): void {
  const events = rows.filter(r => r.phase !== 'stored').slice(-3);
  events.forEach((row, j) => {
    const rem = clamp(row.remaining ?? 0), d = 3 + (1 - rem) * 8;
    ctx.save(); ctx.globalAlpha *= rem;
    const cx=x+(j-(events.length-1)/2)*28;
    const subject=row.subject ?? procReceiptMark(row.id);
    if (subject) drawBuffMark(ctx,{subject,pose:'native',color:row.color},cx,y,15+2*(1-rem));
    else for (let i = 0; i < 3; i++) glyph(ctx, row, cx+(i-1)*d,y,3.5);
    ctx.restore();
  });
}
