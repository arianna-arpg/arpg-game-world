import { BUFF_POSE_COLORS, BUFF_WEAR, type BuffLook } from '../../data/buffLooks';
import type { BuffRow } from '../../engine/buffPresentation';
import { ICON_SUBJECTS } from '../skillIconArt';
import { statusInkPath } from './statusInk';

/** Use the original icon artwork as enamel and highlighted metal, with an
 * outer dark edge so pale ice and bright tiles do not swallow the silhouette. */
export function drawBuffMark(ctx: CanvasRenderingContext2D, look: BuffLook, x: number, y: number, size: number, angle = 0): void {
  const layers = ICON_SUBJECTS[look.subject] ?? ICON_SUBJECTS.rune;
  ctx.save(); ctx.translate(x,y); ctx.rotate(angle); ctx.scale(size/24,size/24); ctx.translate(-12,-12);
  ctx.lineJoin = 'round'; ctx.lineCap = 'round';
  for (const layer of layers) {
    const path = statusInkPath(layer.path);
    ctx.strokeStyle = BUFF_WEAR.outline; ctx.lineWidth = (layer.width ?? 1.35) + 3; ctx.stroke(path);
    if (layer.fill) { ctx.fillStyle = look.color ?? BUFF_POSE_COLORS[look.pose]; ctx.fill(path); }
    ctx.lineWidth = (layer.width ?? 1.35) + .5;
    ctx.strokeStyle = layer.fill ? BUFF_WEAR.ink : look.color ?? BUFF_POSE_COLORS[look.pose]; ctx.stroke(path);
  }
  ctx.restore();
}

/** Body-space attachments. Trailing feathers follow movement/facing, plates
 * clasp both shoulders, recovery drifts upward, hand effects fan at the weapon.
 * Sort by actual bank and identity so a refresh never shuffles a crowded body. */
export function drawBuffMantle(ctx: CanvasRenderingContext2D, rows: readonly BuffRow[], radius: number,
  facing: number, time: number): void {
  if (!rows.length) return;
  const priority = (r: BuffRow) => (r.count !== undefined ? 2 : 0) + (r.kind !== 'passive' ? 1 : 0);
  const worn = rows.filter(r => r.look.pose !== 'native').sort((a,b) => priority(b)-priority(a)
    || a.kind.localeCompare(b.kind) || a.id.localeCompare(b.id)).slice(0, BUFF_WEAR.maxLayers);
  const r = Math.max(7, Math.min(30,radius)), size = Math.max(10,Math.min(18,r));
  const used = new Map<string,number>();
  for (const row of worn) {
    const {look} = row, slot = used.get(look.pose) ?? 0; used.set(look.pose,slot+1);
    const units = Math.max(1, Math.min(BUFF_WEAR.maxPieces,row.count ?? 1));
    const beat = Math.sin(time*2.3 + slot);
    ctx.save();
    if (look.pose === 'shoulder' || look.pose === 'hand' || look.pose === 'trail') ctx.rotate(facing);
    if (look.pose === 'shoulder') {
      for (const side of [-1,1]) for (let i=0; i<units; i++) {
        ctx.save(); ctx.translate(-r*.18-i*3-slot*7,side*(r*.82+i)); ctx.rotate(-facing+side*.2);
        drawBuffMark(ctx,look,0,0,size*.92); ctx.restore();
      }
    } else if (look.pose === 'hand') {
      for (let i=0; i<units; i++) {
        const arc = -.6 + slot*.85 + (i-(units-1)/2)*.42;
        drawBuffMark(ctx,look,Math.cos(arc)*(r+3),Math.sin(arc)*(r+3),size,-facing+beat*.12);
      }
    } else if (look.pose === 'trail') {
      for (let i=1; i>=0; i--) {
        ctx.save(); ctx.globalAlpha *= i ? .55 : .94;
        drawBuffMark(ctx,look,-r*(.8+i*.5),r*(slot*.65-.32)+i*4+beat*1.5,size*(i ? .65 : 1),-.65); ctx.restore();
      }
    } else if (look.pose === 'rise') {
      for (let i=0; i<Math.max(2,units); i++) {
        const t = (time*.49+i/Math.max(2,units))%1;
        ctx.save(); ctx.globalAlpha *= .35+.65*Math.sin(Math.PI*t);
        drawBuffMark(ctx,look,r*(.65+slot*.6)+Math.sin(t*4)*3,r*(.7-t*1.9),size*.85); ctx.restore();
      }
    } else {
      drawBuffMark(ctx,look,(slot%2 ? -1 : 1)*Math.ceil(slot/2)*size,-r-3+beat*1.5,size);
    }
    ctx.restore();
  }
}
