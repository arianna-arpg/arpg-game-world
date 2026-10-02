import type { BodyActionPose } from '../../engine/bodyAction';
import { bodyKey, spriteHalf, type BodyLook } from './body';
import { lookPalette, PART_PAINTERS, type LookDef, type PartSpec } from './parts';
import { baked } from './sprites';
import { VIS_CFG } from './visConfig';

/** One cached native part, never re-rasterized for an animation angle. */
function partSprite(look: BodyLook, spec: PartSpec, index: number, tint?: string): HTMLCanvasElement {
  const half = spriteHalf(look.radius), key = 'actionPart|' + bodyKey(look) + '|' + index;
  const sprite = baked(key, half*2, half*2, ctx => {
    PART_PAINTERS[spec.kind]?.(ctx,look.radius,spec,lookPalette(look.color,look.material));
  });
  if (!tint) return sprite;
  const outline=VIS_CFG.hitFlash.mode==='outline',px=VIS_CFG.hitFlash.outlinePx;
  return baked(key+'|flash|'+tint+'|'+outline+'|'+px,half*2,half*2,ctx=>{
    if(outline){
      for(let i=0;i<8;i++){const angle=i*Math.PI/4;ctx.drawImage(sprite,-half+Math.cos(angle)*px,-half+Math.sin(angle)*px);}
      ctx.globalCompositeOperation='destination-out';ctx.drawImage(sprite,-half,-half);
    }else ctx.drawImage(sprite,-half,-half);
    ctx.globalCompositeOperation='source-in';
    ctx.fillStyle=outline?'#ffffff':tint;ctx.fillRect(-half,-half,half*2,half*2);
  });
}
/** Already in body-facing space. Only authored joints move; their complete
 * neutral geometry remains in book/corpse/forge sprites outside this lane. */
export function drawActionParts(ctx: CanvasRenderingContext2D, look: BodyLook,
  def: LookDef, pose?: BodyActionPose, flashAlpha = 0, tint = '#ffffff'): void {
  const half=spriteHalf(look.radius), prepare=pose?.prepare??0,strike=pose?.strike??0;
  def.parts.forEach((spec,index)=>{
    const joint=spec.action;if(!joint)return;
    const x=joint.pivotX*look.radius,y=joint.pivotY*look.radius;
    ctx.save();ctx.translate(x+(joint.reach??0)*strike*look.radius,y);
    ctx.rotate(joint.windTurn*prepare+joint.strikeTurn*strike);ctx.translate(-x,-y);
    ctx.drawImage(partSprite(look,spec,index),-half,-half);
    if(flashAlpha>0){ctx.globalAlpha=flashAlpha;ctx.drawImage(partSprite(look,spec,index,tint),-half,-half);}
    ctx.restore();
  });
}
