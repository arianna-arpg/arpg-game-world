import { materialOf, rampOf } from './materials';
import { shade, withAlpha } from './color';

/** Shared material palette and size dials for container silhouettes. */
export const CONTAINER_ART = { wood: '#715137', metal: '#af9567', stone: '#4f5963', memory: '#89b5cf' };
const wood = rampOf(CONTAINER_ART.wood, materialOf('wood'));
const metal = rampOf(CONTAINER_ART.metal, materialOf('metal'));
const stone = rampOf(CONTAINER_ART.stone, materialOf('stone'));
function face(ctx: CanvasRenderingContext2D, points: number[][], color: string): void {
  ctx.fillStyle = color; ctx.beginPath();
  points.forEach(([x, y], i) => i ? ctx.lineTo(x, y) : ctx.moveTo(x, y));
  ctx.closePath(); ctx.fill();
}

/** A timber coffer with a bevelled lid, brass bindings and an actual dark cavity. */
export function drawTreasureChest(ctx: CanvasRenderingContext2D, x: number, y: number,
  opened: boolean, opening: number, locked: boolean, time: number, accent = '#e8c87a'): void {
  ctx.save(); ctx.translate(x, y);
  ctx.fillStyle = 'rgba(0,0,0,0.35)'; ctx.beginPath(); ctx.ellipse(1, 10, 21, 7, 0, 0, Math.PI * 2); ctx.fill();
  face(ctx, [[-16,-5],[15,-5],[17,9],[-15,11]], wood.shadow);
  face(ctx, [[-16,-5],[-12,-10],[18,-10],[15,-5]], wood.light);
  ctx.strokeStyle = wood.outline; ctx.lineWidth = 1;
  for (let yy = 0; yy <= 8; yy += 4) { ctx.beginPath(); ctx.moveTo(-14, yy); ctx.lineTo(15, yy-1); ctx.stroke(); }
  for (const xx of [-11,9]) {
    ctx.fillStyle = metal.shadow; ctx.fillRect(xx,-7,3,17);
    ctx.fillStyle = metal.light; ctx.fillRect(xx,-6,1,15);
    ctx.fillStyle = metal.light; ctx.fillRect(xx+1,6,1,1);
  }
  if (opened) face(ctx, [[-13,-6],[13,-6],[13,2],[-13,3]], '#141311');
  const k = opened ? Math.max(0,Math.min(1,opening)) : 0;
  const lift = k * 12;
  if (opened) {
    ctx.strokeStyle = metal.shadow; ctx.lineWidth = 2;
    for (const xx of [-11, 10]) { ctx.beginPath(); ctx.moveTo(xx, -7); ctx.lineTo(xx, -lift-5); ctx.stroke(); }
  }
  ctx.save();ctx.translate(0,-lift);ctx.scale(1,1-k*0.45);
  face(ctx, [[-16,-4],[-16,-10],[-12,-14],[13,-14],[17,-10],[17,-4]], wood.base);
  face(ctx, [[-16,-10],[-12,-14],[13,-14],[17,-10]], wood.light);
  face(ctx, [[-16,-10],[17,-10],[17,-4],[-16,-4]], shade(wood.base,0.08));
  ctx.strokeStyle=wood.outline;ctx.lineWidth=1;
  for(const xx of [-5,4]){ctx.beginPath();ctx.moveTo(xx,-13);ctx.lineTo(xx,-5);ctx.stroke();}
  for(const xx of [-11,9]){ctx.fillStyle=metal.base;ctx.fillRect(xx,-13,3,9);ctx.fillStyle=metal.light;ctx.fillRect(xx,-12,1,7);}
  ctx.strokeStyle=metal.light;ctx.beginPath();ctx.moveTo(-15,-4);ctx.lineTo(16,-4);ctx.stroke();ctx.restore();
  if(!opened){
    ctx.fillStyle=metal.shadow;ctx.fillRect(-3,-4,6,7);ctx.fillStyle=metal.light;ctx.fillRect(-2,-3,4,4);
    ctx.fillStyle=wood.outline;ctx.fillRect(0,-2,1,3);
    if(locked){
      ctx.strokeStyle='#555b65';ctx.lineWidth=3;ctx.beginPath();ctx.moveTo(-17,-9);ctx.lineTo(16,8);ctx.moveTo(-16,8);ctx.lineTo(17,-9);ctx.stroke();
      ctx.strokeStyle='#a0a5ae';ctx.lineWidth=1;ctx.stroke();
      for(let i=-12;i<=12;i+=6){ctx.fillStyle='#c4c6c9';ctx.fillRect(i,i*.5-1,2,2);}
    }else{
      ctx.strokeStyle=withAlpha(accent,0.4+0.15*Math.sin(time*2));ctx.lineWidth=1.4;
      ctx.beginPath();ctx.moveTo(-13,-3);ctx.lineTo(-4,-3);ctx.moveTo(4,-3);ctx.lineTo(14,-3);ctx.stroke();
    }
  }
  ctx.restore();
}

/** A stone socket clasping a fractured memory crystal; distinct from a timber chest. */
export function drawMemoryCache(ctx: CanvasRenderingContext2D, radius: number, color = CONTAINER_ART.memory): void {
  ctx.save();ctx.scale(radius/13,radius/13);
  face(ctx,[[-13,2],[-8,-7],[8,-7],[14,2],[9,10],[-8,10]],stone.shadow);
  face(ctx,[[-13,2],[-8,-7],[8,-7],[14,2],[7,6],[-7,6]],stone.base);
  ctx.strokeStyle=stone.light;ctx.lineWidth=1;ctx.beginPath();ctx.moveTo(-12,2);ctx.lineTo(-7,-6);ctx.lineTo(7,-6);ctx.stroke();
  for(const [x,y,h,w] of [[-7,1,12,4],[6,2,14,4],[0,1,22,6]]){
    face(ctx,[[x-w,y],[x-w*.7,y-h*.65],[x,y-h],[x+w,y-h*.6],[x+w*.65,y+2]],shade(color,-.2));
    face(ctx,[[x-w*.7,y-h*.65],[x,y-h],[x,y+1],[x-w,y]],shade(color,.22));
    face(ctx,[[x,y-h],[x+w,y-h*.6],[x,y-h*.35]],shade(color,.5));
    ctx.strokeStyle=withAlpha('#e8f7ff',.65);ctx.lineWidth=.8;ctx.beginPath();ctx.moveTo(x,y-h+2);ctx.lineTo(x,y-3);ctx.stroke();
  }
  for(const xx of [-10,8]){face(ctx,[[xx,3],[xx+3,2],[xx+3,8],[xx,9]],metal.base);ctx.fillStyle=metal.light;ctx.fillRect(xx,3,1,4);}
  ctx.strokeStyle=stone.outline;ctx.lineWidth=1;ctx.beginPath();ctx.moveTo(-4,6);ctx.lineTo(-1,8);ctx.lineTo(0,6);ctx.lineTo(4,9);ctx.stroke();
  ctx.restore();
}
