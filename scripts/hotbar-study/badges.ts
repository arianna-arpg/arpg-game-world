import { drawBuffMark } from '../../src/render/vis/buffMantle';
import { buffBehavior } from '../../src/render/vis/buffBehavior';
import type { BuffRow } from '../../src/engine/buffPresentation';
import { behaviorNames, shapes, type Look } from './looks';
import type { Sample } from './catalogue';

const glyphs = new Map<string,string>();
export function markImage(row: NonNullable<Sample['row']>) {
  const key=JSON.stringify([row.look,row.gateMark]);
  const cached=glyphs.get(key); if (cached) return cached;
  const canvas=document.createElement('canvas'); canvas.width=canvas.height=64;
  const ctx=canvas.getContext('2d')!;
  drawBuffMark(ctx,row.look,32,32,47);
  if (row.gateMark) {
    ctx.fillStyle='#30283a';ctx.fillRect(4,36,23,23);
    drawBuffMark(ctx,{subject:row.gateMark,pose:'crown',color:'#e7cd89'},16,48,20);
  }
  const src=canvas.toDataURL(); glyphs.set(key,src); return src;
}
export function actualImage(src:string) {
  const image=document.createElement('img'); image.src=src; image.alt=''; image.draggable=false; return image;
}
export function badge(name:string, src:string, look:Look,
  row:Pick<BuffRow,'kind'|'triggered'|'count'|'remaining'|'duration'>, origin?:string, supportArt?:string, multipleBuffs=false) {
  const type=buffBehavior(row), shape=look[type], seconds=row.remaining, count=row.count;
  const node=document.createElement('div');
  node.className='buff '+look.stacks; node.dataset.buff=name; node.dataset.behavior=type; node.dataset.shape=shape;
  const time=seconds === undefined ? '' : (seconds>=60 ? Math.ceil(seconds/60)+'m' : seconds.toFixed(1)+'s');
  const label=[name,origin,behaviorNames[type],shapes[shape],count!==undefined ? count+' stacks' : '',time && time+' remaining'].filter(Boolean).join(' · ');
  node.title=label; node.setAttribute('role','img'); node.setAttribute('aria-label',label);
  const face=document.createElement('span'); face.className='buff-art';
  const art=document.createElement('span'); art.className='enamel'; art.append(actualImage(supportArt ?? src));
  if(supportArt) {
    node.classList.add('support-grant');
    if(multipleBuffs) {
      const emblem=actualImage(src);emblem.className='effect-emblem';art.append(emblem);
    }
  }
  face.append(art);
  if (seconds !== undefined && (look.expiry==='wick' || seconds < 5)) {
    node.dataset.expiry=look.expiry; node.style.setProperty('--color-part',(Math.min(1,Math.max(0,seconds)/(look.expiry==='wick' ? row.duration || 5 : 5))*100)+'%');
    if (look.expiry==='wipe') { const gray=actualImage(supportArt ?? src);gray.className='gray';art.append(gray); }
    else { const clock=document.createElement('i');clock.className='expiry-mark';face.append(clock); }
  }
  node.append(face);
  if(look.stacks==='ledger') {
    const label=document.createElement('span');label.className='buff-name';label.textContent=name;node.append(label);
  }
  if(count!==undefined) {
    const stack=document.createElement('span');stack.className='stack';
    const sign=document.createElement('em');sign.textContent='×';stack.append(sign,String(count));node.append(stack);
  }
  if(time && look.timers==='shown') {
    const clock=document.createElement('span');clock.className='clock';clock.textContent=time;node.append(clock);
  }
  return node;
}
