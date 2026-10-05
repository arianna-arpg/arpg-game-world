import type { SkillDef } from '../engine/skills';

/** One 24-unit vector vocabulary for the canvas bar, Memory tiles and build rack.
 * Explicit artwork overrides ordered semantic rules. Every definition receives
 * a visual face, including future content and unknown legacy icon keys. */
export interface SkillIcon {
  source: string;
  layers: { path: string; fill?: 'tint' | 'ink'; stroke?: 'tint' | 'ink'; width?: number }[];
}
export const SKILL_ICONS: Record<string, SkillIcon> = {
  arcane: {source:'hollow-wake/skills/arcane',layers:[{path:'M12 2L15 9L22 12L15 15L12 22L9 15L2 12L9 9ZM8 12H16M12 8V16',stroke:'ink'}]},
  projectile: {source:'hollow-wake/skills/projectile',layers:[{path:'M3 18L16 5M9 5H19V15M2 11L6 7M11 22L16 17',stroke:'ink'}]},
  nova: {source:'hollow-wake/skills/nova',layers:[{path:'M12 7A5 5 0 1 0 12 17A5 5 0 1 0 12 7M12 1V4M12 20V23M1 12H4M20 12H23M4 4L6 6M18 18L20 20M4 20L6 18M18 6L20 4',stroke:'ink'}]},
  cone: {source:'hollow-wake/skills/cone',layers:[{path:'M3 12L20 3Q14 12 20 21ZM7 12H16',stroke:'ink'}]},
  target: {source:'hollow-wake/skills/target',layers:[{path:'M12 3V7M12 17V21M3 12H7M17 12H21M12 7A5 5 0 1 0 12 17A5 5 0 1 0 12 7',stroke:'ink'}]},
  ground: {source:'hollow-wake/skills/ground',layers:[{path:'M3 16L12 11L21 16L12 21ZM12 3V14M8 10L12 14L16 10',stroke:'ink'}]},
  summon: {source:'hollow-wake/skills/summon',layers:[{path:'M7 12Q2 7 5 4Q8 3 9 8M15 8Q16 3 19 4Q22 7 17 12M12 9Q7 11 5 18Q8 22 12 19Q16 22 19 18Q17 11 12 9Z',stroke:'ink'}]},
  construct: {source:'hollow-wake/skills/construct',layers:[{path:'M5 21V10L12 6L19 10V21ZM3 10L12 3L21 10M9 21V15H15V21',stroke:'ink'}]},
  trap: {source:'hollow-wake/skills/trap',layers:[{path:'M3 9L7 15L10 9L14 15L17 9L21 15M3 18H21M5 5L7 8M19 5L17 8',stroke:'ink'}]},
  aura: {source:'hollow-wake/skills/aura',layers:[{path:'M12 5A3 3 0 1 0 12 11A3 3 0 1 0 12 5M8 20V16Q12 12 16 16V20M5 7Q0 12 5 19M19 7Q24 12 19 19',stroke:'ink'}]},
  storm: {source:'hollow-wake/skills/storm',layers:[{path:'M4 11Q1 5 7 5Q12 0 16 5Q23 4 21 11ZM13 12L8 17H13L11 22L18 15H13',stroke:'ink'}]},
  curse: {source:'hollow-wake/skills/curse',layers:[{path:'M3 12Q12 2 21 12Q12 22 3 12ZM12 8L15 12L12 16L9 12ZM3 3L6 6M21 3L18 6M3 21L6 18M21 21L18 18',stroke:'ink'}]},
  heal: {source:'hollow-wake/skills/heal',layers:[{path:'M9 3H15V9H21V15H15V21H9V15H3V9H9Z',stroke:'ink'}]},
  corpse: {source:'hollow-wake/skills/corpse',layers:[{path:'M5 10Q4 2 12 2Q20 2 19 10L16 15V20H8V15ZM8 8L10 10M14 10L16 8M9 16H15M12 16V20',stroke:'ink'}]},
  buff: {source:'hollow-wake/skills/buff',layers:[{path:'M12 2L20 9H16V20H8V9H4ZM9 13H15M9 17H15',stroke:'ink'}]},
  detonate: {source:'hollow-wake/skills/detonate',layers:[{path:'M12 2L14 8L20 4L17 11L23 13L16 15L19 22L12 18L5 22L8 15L1 13L7 11L4 4L10 8Z',stroke:'ink'}]},
  recall: {source:'hollow-wake/skills/recall',layers:[{path:'M4 10Q5 2 13 3Q23 4 21 14Q20 21 12 21H7M4 3V10H11M8 17L4 21L8 23',stroke:'ink'}]},
  support: {source:'hollow-wake/skills/support',layers:[{path:'M9 5L4 10Q1 13 4 16Q7 19 10 16L13 13M11 11L14 8Q17 5 20 8Q23 11 20 14L16 18M8 14L16 10',stroke:'ink'}]},
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
  background:'#111820', ink:'#f4ebd7', rim:'#070c12',
  tintAlpha:.24, lineWidth:1.5, rimWidth:1.4, bakeSize:96, cacheLimit:64,
};
export type SkillIconFace = Pick<SkillDef,'color'> & Partial<Pick<SkillDef,'name'|'icon'|'tags'|'delivery'|'effects'>>;
/** Ordered visual vocabulary; content can add rules without editing any UI.
 * Gameplay identity supplies the picture, never display-name spelling. */
export const SKILL_ICON_RULES: {icon:string;tags?:readonly string[];deliveries?:readonly string[];effects?:readonly string[]}[] = [
  {icon:'guard',tags:['guard']}, {icon:'rally',tags:['warcry']},
  {icon:'heal',tags:['heal'],effects:['heal','restore','restoreOverTime','cleanse']},
  {icon:'step',tags:['movement'],deliveries:['dash','blink','leap','carom','mark']},
  {icon:'summon',tags:['summon','minion'],deliveries:['summon']},
  {icon:'trap',tags:['trap','mine']}, {icon:'construct',tags:['construct','totem'],deliveries:['construct']},
  {icon:'curse',tags:['curse']}, {icon:'corpse',tags:['corpse']},
  {icon:'aura',tags:['aura'],deliveries:['aura']}, {icon:'storm',tags:['storm'],deliveries:['storm']},
  {icon:'detonate',deliveries:['detonate','detonateProjectile']},
  {icon:'nova',deliveries:['nova']}, {icon:'cone',deliveries:['cone']},
  {icon:'ground',deliveries:['ground']}, {icon:'sweep',tags:['melee'],deliveries:['melee']},
  {icon:'ember',tags:['fire']}, {icon:'frost',tags:['cold']}, {icon:'chain',tags:['lightning']},
  {icon:'curse',tags:['chaos']}, {icon:'buff',tags:['buff'],deliveries:['self']},
  {icon:'target',deliveries:['target']}, {icon:'projectile',tags:['projectile'],deliveries:['projectile']},
];
export function skillIconKey(face:SkillIconFace):string {
  if (face.icon && Object.hasOwn(SKILL_ICONS,face.icon)) return face.icon;
  return SKILL_ICON_RULES.find(rule => rule.tags?.some(t=>face.tags?.some(tag=>tag===t))
    || rule.deliveries?.includes(face.delivery?.type ?? '')
    || rule.effects?.some(type=>face.effects?.some(effect=>effect.type===type)))?.icon ?? 'arcane';
}
function definition(face:SkillIconFace):SkillIcon {
  return SKILL_ICONS[skillIconKey(face)] ?? SKILL_ICONS.arcane;
}
// One live preference for Canvas, rack, vendor, Memory and preparation faces.
let artworkPreference:()=>boolean=()=>false;
export function configureSkillArtwork(preference:()=>boolean):void { artworkPreference=preference; }
export function skillAcronym(face:SkillIconFace):string {
  if(face.icon==='recall') return 'R';
  return (face.name?.trim().split(/[\s-]+/).filter(Boolean).map(word=>[...word][0]).join('') || '?').toUpperCase();
}
const cache=new Map<string,HTMLCanvasElement>();
/** Bake the whole face before applying the caller's affordability alpha, just
 * like an SVG tile. Bounded cached faces avoid per-frame vector allocation. */
export function drawSkillIcon(ctx:CanvasRenderingContext2D,face:SkillIconFace,x:number,y:number,size:number):boolean {
  if(!artworkPreference()) {
    const label=skillAcronym(face),fontSize=size*(label.length>2?.32:.44);
    ctx.save();ctx.textAlign='center';ctx.textBaseline='middle';
    ctx.font='bold '+fontSize+'px Verdana';ctx.lineJoin='round';
    ctx.strokeStyle=SKILL_ICON_VIEW.rim;ctx.lineWidth=Math.max(1,size*.055);
    ctx.fillStyle=SKILL_ICON_VIEW.ink;
    ctx.strokeText(label,x+size/2,y+size/2,size*.94);ctx.fillText(label,x+size/2,y+size/2,size*.94);
    ctx.restore();return true;
  }
  const icon=definition(face);
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
export function skillIconSvg(face:SkillIconFace,size=24):string {
  if(!artworkPreference()) {
    const label=skillAcronym(face),fontSize=label.length>2?7.7:10.6;
    return '<svg xmlns="http://www.w3.org/2000/svg" width="'+size+'" height="'+size
      +'" viewBox="0 0 24 24" aria-hidden="true" focusable="false" data-skill-acronym="'+escape(label)
      +'" style="display:block;flex:none;pointer-events:none"><text x="12" y="12" text-anchor="middle" dominant-baseline="central"'
      +' font-family="Verdana" font-weight="bold" font-size="'+fontSize+'" fill="'+SKILL_ICON_VIEW.ink
      +'" stroke="'+SKILL_ICON_VIEW.rim+'" stroke-width="1" paint-order="stroke"'
      +(label.length>3?' textLength="22" lengthAdjust="spacingAndGlyphs"':'')+'>'+escape(label)+'</text></svg>';
  }
  const icon=definition(face);
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
