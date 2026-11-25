import { ICON_SUBJECTS } from '../skillIconArt';
import { OBJECT_EMBLEMS, SUPPORT_ICON_CATALOG } from '../supportIconCatalog';
import { drawSkillIcon, SKILL_ICONS, supportIconFace } from '../skillIcons';
import { statusInkPath } from './statusInk';

type Face = {id:string; name:string; color:string};
const cache = new Map<string, HTMLCanvasElement>();
/** At most 128 small bitmaps, shared by socket rails, meters and the workshop. */
export function drawSupportEmblem(ctx:CanvasRenderingContext2D, face:Face, x:number, y:number, size:number) {
  const scale=ctx.getTransform();
  const tile=emblemTile(face,Math.max(8,Math.min(96,Math.ceil(size*Math.hypot(scale.a,scale.b)))));
  if (tile) ctx.drawImage(tile,x,y,size,size);
  else drawSkillIcon(ctx,supportIconFace(face),x,y,size);
}
const urls=new WeakMap<HTMLCanvasElement,string>();
export function supportEmblemUrl(face:Face):string|undefined {
  const tile=emblemTile(face,40);
  if (!tile) return;
  let url=urls.get(tile);
  if (!url) {url=tile.toDataURL();urls.set(tile,url);}
  return url;
}
function emblemTile(face:Face,px:number) {
  if (!Object.hasOwn(SUPPORT_ICON_CATALOG,face.id)) return;
  const recipe=SUPPORT_ICON_CATALOG[face.id];
  const key=face.id+'|'+face.color+'|'+px;
  let tile=cache.get(key);
  if (!tile) {
    tile=document.createElement('canvas');tile.width=tile.height=px;
    const ink=tile.getContext('2d')!;
    ink.scale(px/24,px/24);ink.lineCap='round';ink.lineJoin='round';
    const object=OBJECT_EMBLEMS.has(recipe[0]);
    const layers=object ? ICON_SUBJECTS[recipe[0]] : SKILL_ICONS['support:'+face.id].layers;
    for (const layer of layers) {
      ink.save();
      if (layer.transform) ink.transform(...layer.transform);
      const path=statusInkPath(layer.path);
      ink.strokeStyle='#091017';ink.lineWidth=(layer.width ?? 1.4)+(px<16?2.3:1.6);ink.stroke(path);
      if (layer.fill) { ink.fillStyle=face.color;ink.fill(path,'evenodd'); }
      ink.lineWidth=(layer.width ?? 1.4)+(px<16?.6:0);
      ink.strokeStyle=layer.stroke==='tint'?face.color:'#fff0ce';ink.stroke(path);
      ink.restore();
    }
    if (cache.size>=128) cache.delete(cache.keys().next().value!);
    cache.set(key,tile);
  }
  return tile;
}
