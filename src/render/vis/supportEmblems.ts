import { ICON_SUBJECTS } from '../skillIconArt';
import { OBJECT_EMBLEMS, SUPPORT_ICON_CATALOG } from '../supportIconCatalog';
import { drawSkillIcon, SKILL_ICONS, supportIconFace } from '../skillIcons';
import { registerVisCache } from './caches';
import { releaseCanvas } from './sprites';
import { statusInkPath } from './statusInk';

type Face = {id:string; name:string; color:string};
const MAX_EMBLEM_CACHE = 128;
const cache = new Map<string, HTMLCanvasElement>();

registerVisCache({
  id: 'supportEmblems',
  count: () => cache.size,
  bytes: () => { let b = 0; for (const c of cache.values()) b += c.width * c.height * 4; return b; },
  onRunSwap: () => {
    for (const c of cache.values()) releaseCanvas(c);
    cache.clear();
  },
});

/** At most 128 small bitmaps, shared by socket rails, meters and the workshop. */
export function drawSupportEmblem(ctx:CanvasRenderingContext2D, face:Face, x:number, y:number, size:number, pixelScale?:number) {
  let scale: number;
  if (pixelScale !== undefined) {
    scale = pixelScale;
  } else {
    const xf = ctx.getTransform();
    scale = Math.hypot(xf.a, xf.b);
  }
  const tile=emblemTile(face,Math.max(8,Math.min(96,Math.ceil(size*scale))));
  if (tile) ctx.drawImage(tile,x,y,size,size);
  else drawSkillIcon(ctx,supportIconFace(face),x,y,size,false,pixelScale);
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
  if (tile) {
    if (cache.size >= (MAX_EMBLEM_CACHE * 7) >> 3) {
      cache.delete(key);
      cache.set(key, tile);
    }
    return tile;
  }
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
  if (cache.size>=MAX_EMBLEM_CACHE) {
    const oldest = cache.keys().next().value;
    if (oldest !== undefined) {
      const victim = cache.get(oldest);
      if (victim) releaseCanvas(victim);
      cache.delete(oldest);
    }
  }
  cache.set(key,tile);
  return tile;
}
