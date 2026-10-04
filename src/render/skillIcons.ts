import type { SkillDef } from '../engine/skills';

/** One 24-unit vector vocabulary for the canvas bar, Memory tiles and build rack.
 * A skill opts in by registry key; omissions/unknown keys retain its initials. */
export interface SkillIcon {
  source: string;
  layers: { path: string; fill?: 'tint' | 'ink'; stroke?: 'tint' | 'ink'; width?: number }[];
}
export const SKILL_ICONS: Record<string, SkillIcon> = {
  lifeFlask: {source:'hollow-wake/skills/life-flask',layers:[
    {path:'M9 2H15V7L19 12Q22 21 16 22H8Q2 21 5 12L9 7Z',fill:'tint',stroke:'ink'},
    {path:'M8 5H16M7 13H17M12 14V19M9.5 16.5H14.5',stroke:'ink'},
  ]},
  manaFlask: {source:'hollow-wake/skills/mana-flask',layers:[
    {path:'M9 2H15V7L19 12Q22 21 16 22H8Q2 21 5 12L9 7Z',fill:'tint',stroke:'ink'},
    {path:'M8 5H16M7 13H17M12 14L9.5 17L12 20L14.5 17Z',stroke:'ink'},
  ]},
  catalystFlask: {source:'hollow-wake/skills/catalyst-flask',layers:[
    {path:'M9 2H15V7L19 12Q22 21 16 22H8Q2 21 5 12L9 7Z',fill:'tint',stroke:'ink'},
    {path:'M8 5H16M7 13H17M12 14L13 16L16 17L13 18L12 21L11 18L8 17L11 16Z',stroke:'ink'},
  ]},
  sweep: {source:'hollow-wake/skills/sweep',layers:[
    {path:'M5 17L17 3L21 3L21 7L8 20Z',fill:'tint',stroke:'ink'},
    {path:'M4 14L11 21M4 20L6 18M3 8Q8 1 14 3M2 11L3 8L6 9',stroke:'ink'},
  ]},
  guard: {source:'hollow-wake/skills/guard',layers:[
    {path:'M12 3L20 6L19 14Q17 19 12 22Q7 19 5 14L4 6Z',fill:'tint',stroke:'ink'},
    {path:'M12 6V18M7 9H17',stroke:'ink'},
  ]},
  rally: {source:'hollow-wake/skills/rally',layers:[
    {path:'M4 10L8 10L15 5V19L8 14H4Z',fill:'tint',stroke:'ink'},
    {path:'M18 8Q22 12 18 16M8 14L9 20H6L5 14',stroke:'ink'},
  ]},
  ember: {source:'hollow-wake/skills/ember',layers:[
    {path:'M16 2Q9 4 9 10L5 7Q3 14 6 18Q10 23 16 20Q23 16 18 9Q18 14 15 14Q12 10 16 2Z',fill:'tint',stroke:'ink'},
    {path:'M12 13Q8 17 12 19Q17 19 15 15',stroke:'ink'},
  ]},
  frost: {source:'hollow-wake/skills/frost',layers:[
    {path:'M12 2V22M3 7L21 17M3 17L21 7M8 4L12 7L16 4M8 20L12 17L16 20M3 11L7 9L6 5M18 19L17 15L21 13M3 13L7 15L6 19M18 5L17 9L21 11',stroke:'ink'},
  ]},
  chain: {source:'hollow-wake/skills/chain',layers:[
    {path:'M14 2L5 13H11L9 22L20 10H13Z',fill:'tint',stroke:'ink'},
    {path:'M4 5L2 7L5 9M20 16L22 18L19 20',stroke:'ink'},
  ]},
  knife: {source:'hollow-wake/skills/knife',layers:[
    {path:'M7 15L18 3L21 3L20 9L10 18Z',fill:'tint',stroke:'ink'},
    {path:'M5 13L12 20M3 21L7 17M10 14L17 7M3 6L4 4L6 3M16 21L18 20L20 18',stroke:'ink'},
  ]},
  veil: {source:'hollow-wake/skills/veil',layers:[
    {path:'M4 20Q5 7 12 3Q19 7 20 20Q12 16 4 20Z',fill:'tint',stroke:'ink'},
    {path:'M8 13Q12 7 16 13L14 16H10ZM3 22H21',stroke:'ink'},
  ]},
  step: {source:'hollow-wake/skills/step',layers:[
    {path:'M15 4Q19 4 19 8L17 13L13 15L12 19L9 20L9 15L12 11L12 7Z',fill:'tint',stroke:'ink'},
    {path:'M3 6H8M2 10H7M2 14H6M17 18L21 18M19 16L21 18L19 20',stroke:'ink'},
  ]},
};
export const SKILL_ICON_VIEW = {
  enabled:true, background:'#111820', ink:'#f4ebd7', rim:'#070c12',
  tintAlpha:.24, lineWidth:1.5, rimWidth:1.4, bakeSize:96, cacheLimit:64,
};
type Face = Pick<SkillDef,'icon'|'color'>;
function definition(face:Face):SkillIcon|undefined {
  return SKILL_ICON_VIEW.enabled && face.icon && Object.hasOwn(SKILL_ICONS,face.icon)
    ? SKILL_ICONS[face.icon] : undefined;
}
const cache=new Map<string,HTMLCanvasElement>();
/** Bake the whole face before applying the caller's affordability alpha, just
 * like an SVG tile. Bounded cached faces avoid per-frame vector allocation. */
export function drawSkillIcon(ctx:CanvasRenderingContext2D,face:Face,x:number,y:number,size:number):boolean {
  const icon=definition(face);if(!icon)return false;
  const c=SKILL_ICON_VIEW,key=JSON.stringify([icon,face.color,c]);
  let image=cache.get(key);
  if(!image){image=bakeSkillIcon(icon,face.color);cache.set(key,image);}
  else {cache.delete(key);cache.set(key,image);}
  while(cache.size>Math.max(0,Math.floor(c.cacheLimit)))cache.delete(cache.keys().next().value!);
  ctx.drawImage(image,x,y,size,size);return true;
}
function bakeSkillIcon(icon:SkillIcon,color:string):HTMLCanvasElement {
  const c=SKILL_ICON_VIEW,image=document.createElement('canvas');
  image.width=image.height=Math.max(24,Math.min(192,Math.round(c.bakeSize)));
  const ctx=image.getContext('2d')!;ctx.scale(image.width/24,image.height/24);
  ctx.fillStyle=c.background;ctx.fillRect(0,0,24,24);
  ctx.fillStyle=color;ctx.globalAlpha=c.tintAlpha;ctx.fillRect(0,0,24,24);
  ctx.globalAlpha=1;ctx.lineCap='round';ctx.lineJoin='round';
  for(const layer of icon.layers){
    const path=new Path2D(layer.path);
    if(layer.fill){ctx.fillStyle=layer.fill==='tint'?color:c.ink;ctx.fill(path);}
    if(layer.stroke){
      const width=layer.width??c.lineWidth;
      ctx.strokeStyle=c.rim;ctx.lineWidth=width+c.rimWidth;ctx.stroke(path);
      ctx.strokeStyle=layer.stroke==='tint'?color:c.ink;ctx.lineWidth=width;ctx.stroke(path);
    }
  }
  return image;
}
const escape=(value:string)=>value.replace(/[&<>"']/g,ch=>({'&':'&amp;','<':'&lt;','>':'&gt;','"':'&quot;',"'":'&#39;'}[ch]!));
/** Same paths, paint order and proportions as the canvas icon; caller owns its label. */
export function skillIconSvg(face:Face,size=24):string {
  const icon=definition(face);if(!icon)return '';
  const c=SKILL_ICON_VIEW,tint=escape(face.color),ink=escape(c.ink),rim=escape(c.rim);
  const layers=icon.layers.map(layer=>{
    const d=escape(layer.path),fill=layer.fill==='tint'?tint:layer.fill==='ink'?ink:'none';
    const width=layer.width??c.lineWidth;
    return '<path d="'+d+'" fill="'+fill+'"/>'
      +(layer.stroke?'<path d="'+d+'" fill="none" stroke="'+rim+'" stroke-width="'+(width+c.rimWidth)+'"/>'
        +'<path d="'+d+'" fill="none" stroke="'+(layer.stroke==='tint'?tint:ink)+'" stroke-width="'+width+'"/>':'');
  }).join('');
  return '<svg xmlns="http://www.w3.org/2000/svg" width="'+size+'" height="'+size
    +'" viewBox="0 0 24 24" aria-hidden="true" focusable="false" style="display:block;flex:none;pointer-events:none"'
    +' stroke-linecap="round" stroke-linejoin="round"><rect width="24" height="24" fill="'+escape(c.background)
    +'"/><rect width="24" height="24" fill="'+tint+'" opacity="'+c.tintAlpha+'"/>'+layers+'</svg>';
}
