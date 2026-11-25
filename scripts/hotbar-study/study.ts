import { abilityArtworkUrl } from '../../src/render/abilityArtwork';
import { loadAbilityArtwork } from '../../src/render/abilityArtworkCache';
import { VIS_CFG } from '../../src/render/vis/visConfig';
import { compactChargeCounters, supportCounterLayout, drawCounterLinks } from '../../src/render/vis/supportCounterLayout';
import { SUPPORT_ROLES } from '../../src/data/supportVisuals';
import { drawGuardDial, drawVitalOrb, guardLayout } from '../../src/render/vis/vitalHud';
import { drawSupportRail, drawSupportMeter } from '../../src/render/vis/supportRail';
import { drawSupportCounter } from '../../src/render/vis/supportCounters';
import { drawSupportEmblem } from '../../src/render/vis/supportEmblems';
import { supportMeters, type SupportMark } from '../../src/engine/supportPresentation';
import socketStates, {counterExamples,slotFit} from 'study:sockets';
import reload from 'study-skill:re_energize';
import { drawCosmeticMotif } from '../../src/render/vis/cosmeticMotif';
import { buffBehavior } from '../../src/render/vis/buffBehavior';
import { banks, behaviorNames, chargeStyles, effectShapes, encounters, expiry, finishes, lookKeys, lookName, metals, options, originalSignet, presets, sameLook, shapes, skills, skins, stackStyles, startingMix,
  type Look, type Skill, type Snapshot } from './looks';
import { actualImage, badge, markImage } from './badges';
import samples from 'study:effects';
import warCry from 'study-skill:war_cry';
import cleave from 'study-skill:cleave';
import carve from 'study-skill:deep_carve';
import flame from 'study-skill:flame_imbuement';
import frenzy from 'study-skill:frenzy';
import ward from 'study-skill:iron_ward';
import dash from 'study-skill:dash';
import lifeFlask from 'study-skill:life_flask';
import manaFlask from 'study-skill:mana_flask';
import quiet from '../../site/assets/art/world/conflict.webp?inline';
import battle from './combat.webp?inline';
import insignia from '../../site/assets/brand/insignia.svg?inline';

const el = <T extends HTMLElement = HTMLElement>(id: string) => document.getElementById(id) as T;
const select = (id: string) => el<HTMLSelectElement>(id);
const box = (id: string) => el<HTMLInputElement>(id);
const button = (id: string) => el<HTMLButtonElement>(id);
const art: Record<Skill, string> = { cleave, deep_carve: carve, flame_imbuement: flame, frenzy,
  iron_ward: ward, dash, life_flask: lifeFlask, mana_flask: manaFlask };
const storageKey = 'hollow-wake.hotbar-study.v1';
const root = el('hotbar-workshop');
root.style.setProperty('--battle-art', `url("${battle}")`);
root.style.setProperty('--quiet-art', `url("${quiet}")`);
el<HTMLImageElement>('insignia').src = insignia;
const samplesById=new Map(samples.map(s=>[s.key,s]));
function example(key:string) {
  const found=samplesById.get(key); if(!found?.row)throw Error('Missing workshop example '+key); return {...found,row:found.row};
}
const cry=example('skill/war_cry/war_cry'), tempo=example('support/metronome/proc/tempo');
const still=example('node/weave_rooted_still_mercy/stationary|||');
const stillProc=example('node/weave_rooted_still_mercy/proc/weave_still_mercy');
const verse=example('choice/crossroads_chorus/verse_shelter/||charge:verse|');
const verseMark=markImage(verse.row);
function copyLook(look:Look):Look {
  const {charges,stacks,metal,skin,expiry,proc,stack,condition,duration,active,timers,tint}=look;
  return {charges,stacks,metal,skin,expiry,proc,stack,condition,duration,active,timers,tint};
}
function restoreLook(value:unknown):Look|undefined {
  if (!value || typeof value!=='object') return;
  const v=value as Partial<Look>;
  if (!Object.hasOwn(chargeStyles,v.charges ?? '') || !Object.hasOwn(stackStyles,v.stacks ?? '') || !Object.hasOwn(metals,v.metal ?? '')) return;
  const base=presets.find(p=>p.charges===v.charges && p.stacks===v.stacks && p.metal===v.metal) ?? originalSignet;
  const result=copyLook(base);
  if (typeof v.tint==='string' && /^#[0-9a-f]{6}$/i.test(v.tint)) result.tint=v.tint;
  if (!v.timers) result.timers=v.skin ? 'hidden' : 'shown';
  // Legacy mixes stored the color with their bevel. Keep both when splitting the fields.
  if (!v.skin) result.skin=({brass:'armory_brass',silver:'signet_silver',iron:'watchtower_iron',inherit:'inventory'})[v.metal!];
  if (!v.proc) {
    const shape=v.stacks==='coin' ? 'circle' : 'square';
    for (const key of Object.keys(behaviorNames) as (keyof typeof behaviorNames)[]) result[key]=shape;
  }
  for(const k of lookKeys) if(Object.hasOwn(options[k],v[k] ?? '')) Object.assign(result,{[k]:v[k]});
  return result;
}
let current=copyLook(startingMix),reference=copyLook(originalSignet);
for (const key of lookKeys) {
  for (const [value,label] of Object.entries(options[key])) select(key).add(new Option(label,value));
}
const encounter = select('encounter');
for (const label of Object.keys(encounters)) encounter.add(new Option(label, label));
try {
  const saved = JSON.parse(localStorage.getItem(storageKey) ?? '{}');
  current = restoreLook(saved.current) ?? current;
  reference = restoreLook(saved.reference) ?? reference;
  if (Object.hasOwn(encounters, saved.encounter)) encounter.value = saved.encounter;
  for (const key of ['crowd','compact','compare']) if (typeof saved[key] === 'boolean') box(key).checked = saved[key];
} catch { /* Private and embedded browsing can disable persistence. */ }
function persist() {
  try { localStorage.setItem(storageKey, JSON.stringify({current, reference, encounter:encounter.value,
    crowd:box('crowd').checked, compact:box('compact').checked, compare:box('compare').checked})); } catch { /* Optional. */ }
}
let state: Snapshot = { ...encounters[encounter.value] };
let stationary=true, stillTime=0, stillCooldown=0, tempoCount=0, tempoTime=0, cryTime=0;
function resetEffects() {
  const active=encounter.value!=='Spent & expired';
  stationary=active; stillTime=active ? Math.min(4,state.wardSeconds) : 0;
  stillCooldown=active ? Math.max(0,(stillProc.cooldown ?? 0)-(stillProc.row.remaining ?? 0)+stillTime) : 0;
  tempoCount=active ? Math.min(8,state.frenzy) : 0; tempoTime=active ? 5 : 0;
  cryTime=active ? state.wardSeconds : 0;
}
resetEffects();
const motifs=new Map<string,string>();
function dress(node:HTMLElement,skin:string,tint?:string) {
  const finish=finishes[skin];
  node.style.setProperty('--edge',tint ?? finish.border);node.style.setProperty('--shine',tint ?? finish.trim);
  node.style.setProperty('--skin-fill',finish.fill);node.style.setProperty('--rail',finish.rail);
  if(!motifs.has(skin)) {
    const canvas=document.createElement('canvas');canvas.width=canvas.height=20;
    drawCosmeticMotif(canvas.getContext('2d')!,finish.motif,finish.trim,10,10,9);
    motifs.set(skin,'url('+canvas.toDataURL()+')');
  }
  node.style.setProperty('--motif',motifs.get(skin)!);
}

function charge(look: Look, bank: typeof banks[keyof typeof banks], held: number) {
  const node = document.createElement('span');
  node.className = ['charge',look.charges,held === 0 ? 'empty' : held === 1 ? 'low' : ''].join(' ');
  node.style.setProperty('--tint', bank.tint);
  node.style.setProperty('--held', (100 * held / bank.cap) + '%');
  node.dataset.held = String(held);
  if (look.charges === 'rail' || look.charges === 'beads' || look.charges === 'tabs') {
    const rounds = document.createElement('span'); rounds.className = 'rounds';
    for (let i = 0; i < bank.cap; i++) {
      const socket = document.createElement('i'); if (i < held) socket.className = 'on';
      if (look.charges==='beads') socket.style.setProperty('--lift',Math.round(Math.sin(Math.PI*(i+.5)/bank.cap)*4)+'px');
      rounds.append(socket);
    }
    node.append(rounds);
  }
  const count = document.createElement('strong'); count.textContent = String(held); node.append(count);
  if (look.charges === 'fraction') {
    const capacity = document.createElement('small'); capacity.textContent = '/' + bank.cap; node.append(capacity);
  }
  return node;
}
for (const preset of presets) {
  const choice = document.createElement('button'); choice.type = 'button'; choice.className = 'direction metal-' + preset.metal;
  choice.setAttribute('aria-label', preset.name + ', ' + chargeStyles[preset.charges] + ', ' + stackStyles[preset.stacks]);
  const sample = document.createElement('span'); sample.className = 'mini-face'; sample.setAttribute('aria-hidden','true');
  sample.append(actualImage(flame), charge(preset, banks.flame_imbuement, 4));
  const name = document.createElement('span');
  const caption=preset.name===startingMix.name ? 'Effect silhouettes' : chargeStyles[preset.charges];
  name.innerHTML = `<span class="direction-name">${preset.name}</span><small>${caption}</small>`;
  dress(choice,preset.skin); choice.append(sample, name); el('directions').append(choice);
  choice.onclick = () => { current = copyLook(preset); update(); persist(); };
}
const castState=select('socket-state'), socketArt=select('socket-art');
try { if (localStorage.getItem(storageKey+'.sockets')==='engraved') socketArt.value='engraved'; } catch { /* Offline storage is optional. */ }
socketStates.forEach((s,i)=>castState.add(new Option(i ? 'After '+i+(i===1?' cast':' casts') : 'Before casting',String(i))));
castState.value='1';
function drawWorkshopSockets(face:HTMLElement,look:Look,marks:readonly SupportMark[],bank:{count:number;cap:number}) {
  const skin=finishes[look.skin], width=face.offsetWidth || 54;
  const meters=supportMeters(compactChargeCounters(marks,width,()=>bank));
  const {groups,clearance,links}=supportCounterLayout([{meters:meters.length,magazines:0,meta:false}],0,0,width,0);
  const h=width+clearance;
  const canvas=document.createElement('canvas');canvas.width=width*2;canvas.height=h*2;canvas.className='socket-overlay';
  canvas.style.width=width+'px';canvas.style.height=h+'px';canvas.style.top=(-clearance-1)+'px';
  const ctx=canvas.getContext('2d')!;ctx.scale(2,2);ctx.translate(0,clearance);
  const style={...skin,border:look.tint ?? skin.border,trim:look.tint ?? skin.trim};
  drawCounterLinks(ctx,links,style.trim);
  meters.forEach((m,i)=>drawSupportMeter(ctx,m,groups[0].meters[i],style));
  const grant=marks.find(m=>m.useBank);
  if(grant && width>=VIS_CFG.buffMagazine.minFaceWidth) drawSupportCounter(ctx,grant,bank,{x:2,y:1,w:Math.min(32,width-14),h:15},style);
  drawSupportRail(ctx,marks,3,width-1,width-6,style,socketArt.value==='engraved'?'engraved':undefined);
  face.append(canvas);
  return clearance;
}
function socketPreview(face:HTMLElement,look:Look) {
  const state=socketStates[castState.selectedIndex];
  const clearance=drawWorkshopSockets(face,look,state.marks,{count:state.rounds,cap:state.capacity});
  face.closest<HTMLElement>('.rack')!.style.paddingTop=clearance+'px';
  const image=face.querySelector('img')!;
  image.src=state.rounds ? cleave : reload;
  const meters=state.marks.filter(m=>m.meter);
  return [state.face,state.rounds+' / '+state.capacity+' rounds',...meters.map(m=>m.name+' '+m.meter!.count+' / '+m.meter!.cap)].join(', ');
}
function setupScene(id: string, label: string) {
  const scene = el(id);
  scene.innerHTML = `<div class="scene-content"><div class="combat-ink" aria-hidden="true"></div>
    <div class="scene-heading"><small>${label}</small><h2></h2></div>
    <div class="cluster"><canvas class="orb life" width="200" height="208" role="img" aria-label="Life at 74 percent"></canvas>
    <div class="center"><div class="buffs" role="group" aria-label="Active buffs"></div><div class="rack" role="group" aria-label="Equipped skills"></div></div>
    <canvas class="orb mana" width="200" height="208" role="img" aria-label="Mana at 61 percent"></canvas></div>
    <div class="shape-key" aria-label="Shape key"></div></div>`;
  const combat = scene.querySelector('.combat-ink')!;
  const hits = [[16,30,143],[28,53,286],[46,24,68],[54,37,2410],[62,55,132],[75,28,386],[85,47,94],[38,66,128],[13,73,216],[72,72,675]];
  const colors = ['#e9c595','#ed9d65','#b6ced5'];
  hits.forEach(([x,y,v],i) => {
    const n = document.createElement('i'); n.style.left=x+'%'; n.style.top=y+'%'; n.textContent=v.toLocaleString('en-US');
    n.style.setProperty('--fx', colors[i % colors.length]); if (v > 900) n.style.fontSize='23px'; combat.append(n);
    if (i % 2 === 0) { const spark=document.createElement('b'); spark.style.left=(x+2)+'%'; spark.style.top=(y+7)+'%';
      spark.style.setProperty('--fx',colors[i % colors.length]); combat.append(spark); }
  });
  const rack = scene.querySelector('.rack')!;
  const slots = skills.map(([id, name, key]) => {
    const slot = document.createElement('div'); slot.className='slot'; slot.dataset.skill=id;
    const face = document.createElement('div'); face.className='face'; face.append(actualImage(art[id]));
    const binding = document.createElement('span'); binding.className='binding'; binding.textContent=key;
    slot.append(face,binding); rack.append(slot); slot.setAttribute('role','img');
    return { id, name, key, face, slot };
  });
  for (const orb of ['life','mana'] as const) {
    const ctx = scene.querySelector<HTMLCanvasElement>('.orb.'+orb)!.getContext('2d')!;
    ctx.setTransform(2,0,0,2,100,101);
    drawVitalOrb(ctx,orb,0,0,38,orb === 'life' ? 1776 : 488,orb === 'life' ? 2400 : 800,0,2.5);
    if (orb === 'life') for (const sector of guardLayout({es:.8,poise:.5}))
      drawGuardDial(ctx, sector, 0,0,38,sector.id === 'es' ? .8 : .5);
  }
  return (look: Look) => {
    const profile=look.metal==='inherit' ? {rounded:'silver',chased:'brass',flat:'iron'}[finishes[look.skin].frame] : look.metal;
    scene.className='scene metal-'+profile; dress(scene,look.skin,look.tint);
    scene.dataset.field=box('crowd').checked ? 'crowd' : 'quiet'; scene.dataset.size=box('compact').checked ? 'compact' : 'standard';
    scene.querySelector('h2')!.textContent=lookName(look);
    const key=scene.querySelector('.shape-key')!;
    const groups=new Map<string,string[]>();
    for (const k of Object.keys(behaviorNames) as (keyof typeof behaviorNames)[]) {
      const labels=groups.get(look[k]) ?? []; labels.push(behaviorNames[k]);groups.set(look[k],labels);
    }
    key.replaceChildren(...[...groups].map(([shape,names])=>{
      const entry=document.createElement('span'), glyph=document.createElement('i');
      glyph.dataset.shape=shape;entry.append(glyph,names.join(' / '));entry.title=shape;return entry;
    }));
    const effects = [];
    if (state.carve) effects.push(badge('Deep Carve',carve,look,{kind:'buff',count:state.carve}));
    if (state.frenzy) effects.push(badge('Frenzy',frenzy,look,{kind:'buff',count:state.frenzy}));
    if (state.verse) effects.push(badge('Verse Shelter',verseMark,look,{kind:'passive',count:state.verse},'Passive tree'));
    if (state.wardSeconds>0) effects.push(badge('Iron Ward',ward,look,{kind:'buff',remaining:state.wardSeconds}));
    if (cryTime>0) effects.push(badge('War Cry',warCry,look,{...cry.row,remaining:cryTime},cry.source));
    if (stationary) effects.push(badge('The Still Hand',markImage(still.row),look,still.row,'While stationary'));
    if (stillTime>0) effects.push(badge('The Still Hand',markImage(stillProc.row),look,{...stillProc.row,remaining:stillTime},'On becoming stationary'));
    if (tempoCount>0) effects.push(badge('Tempo',markImage(tempo.row),look,{...tempo.row,count:tempoCount,remaining:tempoTime},'Metronome support',abilityArtworkUrl('support','metronome')));
    scene.querySelector('.buffs')!.replaceChildren(...effects);
    for (const {id,name,key,face,slot} of slots) {
      face.querySelectorAll('.charge,.clock,.socket-overlay').forEach(n=>n.remove());
      let label = name + ', ' + key;
      const bank = Object.hasOwn(banks,id) ? banks[id as keyof typeof banks] : undefined;
      const held = bank ? state[bank.field] : 0;
      face.dataset.empty = String(bank?.persistent && held === 0);
      if (bank) {
        if (held || bank.persistent) face.append(charge(look,bank,held));
        label += `, ${held} of ${bank.cap} ${bank.unit}`;
      }
      if (id === 'dash' && state.dashSeconds > 0) {
        const clock = document.createElement('span'); clock.className='clock'; clock.textContent=state.dashSeconds.toFixed(1)+'s';
        clock.style.setProperty('--cd',(state.dashSeconds/2.5*100)+'%'); face.append(clock);
        label += ', cooldown ' + clock.textContent;
      }
      if (id==='cleave') label=socketPreview(face,look)+', '+key;
      slot.title=label; slot.setAttribute('aria-label',label);
    }
  };
}
const paintCurrent = setupScene('current', 'Current mix'), paintReference = setupScene('reference','Pinned reference');
const libraryGroup=select('library-group'), libraryItem=select('library-item'), search=box('library-search');
libraryGroup.add(new Option('All sources',''));
for (const group of new Set(samples.map(s=>s.group))) libraryGroup.add(new Option(group,group));
const supportRole=select('support-role');
const byRole=new Map<string,Set<string>>();
for (const s of samples) for (const role of s.supportRoles ?? []) {
  const ids=byRole.get(role) ?? new Set<string>();
  ids.add(s.key.split('/')[1]);byRole.set(role,ids);
}
supportRole.add(new Option('All mechanics',''));
for (const [role,ids] of [...byRole].sort(([a],[b])=>a.localeCompare(b))) supportRole.add(new Option(role+' · '+ids.size,role));
function emblem(id:string,name:string,color:string,size:number) {
  const canvas=document.createElement('canvas');
  canvas.className='support-emblem';canvas.setAttribute('aria-label',name+' socket symbol');canvas.setAttribute('role','img');
  canvas.style.width=canvas.style.height=size+'px';canvas.width=canvas.height=size*2;
  const ink=canvas.getContext('2d')!;ink.scale(2,2);drawSupportEmblem(ink,{id,name,color},0,0,size);
  return canvas;
}
function portrait(id:string,name:string) {
  const image=actualImage(abilityArtworkUrl('support',id)!);
  image.className='support-portrait';image.title=name;
  return image;
}
const pageSize=12;
let supportItems:typeof samples=[], page=0;
function paintGallery() {
  const browser=el('support-browser');
  browser.hidden=libraryGroup.value!=='Supports';
  if (browser.hidden) return;
  const start=page*pageSize;
  const buttons=supportItems.slice(start,start+pageSize).map(s=>{
    const b=document.createElement('button');b.type='button';b.dataset.support=s.supportId!;
    b.setAttribute('aria-pressed',String(samplesById.get(libraryItem.value)?.supportId===s.supportId));
    b.append(portrait(s.supportId!,s.source),s.source,emblem(s.supportId!,s.source,s.supportColor!,20));
    b.onclick=()=>{libraryItem.value=s.key;paintLibrary();paintGallery();};return b;
  });
  el('support-gallery').replaceChildren(...buttons);
  el('support-range').textContent=supportItems.length ? (start+1)+'–'+(start+buttons.length)+' of '+supportItems.length+' supports' : 'No supports';
  button('support-prev').disabled=!page;button('support-next').disabled=start+pageSize>=supportItems.length;
}
button('support-prev').onclick=()=>{page--;paintGallery();};
button('support-next').onclick=()=>{page++;paintGallery();};
let matches=0;
function filterLibrary() {
  const previous=libraryItem.value || tempo.key, term=search.value.trim().toLowerCase();
  const supports=libraryGroup.value==='Supports';
  el('support-role-field').hidden=!supports;
  const matching=samples.filter(s=>(!libraryGroup.value || s.group===libraryGroup.value)
    && (!supports || !supportRole.value || s.supportRoles?.includes(supportRole.value))
    && (!term || [s.source,s.label,s.context].join(' ').toLowerCase().includes(term)));
  const seen=new Set<string>();
  supportItems=supports ? matching.filter(s=>{
    if(!s.supportId || seen.has(s.supportId)) return false;
    seen.add(s.supportId);return true;
  }) : [];
  page=0;
  matches=matching.length;
  libraryItem.replaceChildren(...matching.map(s=>{
    const name=s.source===s.label ? s.label : s.source+' · '+s.label;
    return new Option(name+(s.row ? ' · '+behaviorNames[buffBehavior(s.row)] : ''),s.key);
  }));
  if(matching.some(s=>s.key===previous)) libraryItem.value=previous;
  libraryItem.disabled=matches===0;
  const selectedId=samplesById.get(libraryItem.value)?.supportId;
  const index=supportItems.findIndex(s=>s.supportId===selectedId);
  if (index>=0) page=Math.floor(index/pageSize);
  paintGallery();
  paintLibrary();
}
function paintLibrary() {
  const sample=samplesById.get(libraryItem.value), preview=el('library-badge');
  preview.replaceChildren(); dress(preview,current.skin,current.tint);
  el('library-total').textContent=libraryGroup.value==='Supports' ? supportItems.length+' supports' : matches+' of '+samples.length+' entries';
  el('library-context').textContent=sample ? [sample.group,sample.source,sample.supportId && sample.row?.kind==='passive' ? 'Condition on the linked skill' : sample.row ? behaviorNames[buffBehavior(sample.row)] : 'Mechanic description',sample.context].filter(Boolean).join(' · ') : 'No matching effects.';
  if(sample?.supportId) preview.append(portrait(sample.supportId,sample.source),emblem(sample.supportId,sample.source,sample.supportColor!,32));
  if(sample?.row) preview.append(badge(sample.label,markImage(sample.row),current,sample.row,sample.source,
    sample.supportId && sample.row.kind!=='passive' ? abilityArtworkUrl('support',sample.supportId) : undefined,
    sample.multipleBuffs));
}
supportRole.onchange=filterLibrary;libraryGroup.onchange=filterLibrary;search.oninput=filterLibrary;libraryItem.onchange=()=>{
  const id=samplesById.get(libraryItem.value)?.supportId;
  const index=supportItems.findIndex(s=>s.supportId===id);
  if(index>=0) page=Math.floor(index/pageSize);
  paintLibrary();paintGallery();
};
function openSupportLink() {
  if (location.hash!=='#supports') return;
  const library=el('supports') as HTMLDetailsElement;
  library.open=true;
  libraryGroup.value='Supports';
  filterLibrary();
  requestAnimationFrame(()=>library.scrollIntoView({block:'start'}));
}
filterLibrary();
openSupportLink();
window.addEventListener('hashchange',openSupportLink);
const featured=socketStates[0].marks.filter(m=>m.useBank || m.meter).map(m=>m.id);
const order=(id:string)=>featured.includes(id)?featured.indexOf(id):featured.length;
const exampleNodes=[...counterExamples].sort((a,b)=>order(a.mark.id)-order(b.mark.id) || a.mark.name.localeCompare(b.mark.name)).map(({mark,cap,host,level})=>{
  const tile=document.createElement('div');tile.className='counter-tile';
  const label=document.createElement('span');label.textContent=mark.name;
  const canvas=document.createElement('canvas');
  const multiple=counterExamples.filter(e=>e.mark.id===mark.id).length>1;
  if (multiple) label.textContent+=' · '+mark.readout?.split(' · ')[0];
  canvas.setAttribute('role','img');
  tile.title=host+' · level '+level;tile.append(canvas,label);el('counter-grid').append(tile);
  return {canvas,mark,cap};
});
const fitWidth=select('fit-width'), fitDensity=select('fit-density');
function paintCounterFit(ratio:number) {
  const views=[{id:'fit-solo',slots:[slotFit.solo]},{id:'fit-pair',slots:slotFit.pair}];
  for(const view of views) {
    const rack=el(view.id), readouts:string[]=[];
    rack.replaceChildren();rack.style.setProperty('--slot',fitWidth.value+'px');
    let headroom=0;
    for(const slot of view.slots) {
      const face=document.createElement('div');face.className='face';rack.append(face);
      face.append(actualImage(art[slot.id as Skill]));
      const marks=slot.marks.map(m=>m.meter ? {...m,meter:{cap:m.meter.cap,count:Math.floor(ratio*m.meter.cap)}} : m);
      const bank={cap:slot.cap,count:Math.floor(ratio*slot.cap)};
      headroom=Math.max(headroom,drawWorkshopSockets(face,current,marks,bank));
      const balances=marks.flatMap(m=>m.useBank ? [m.name+' '+bank.count+'/'+bank.cap] :
        m.meter ? [m.name+' '+m.meter.count+'/'+m.meter.cap] : []);
      face.title=slot.name+' · '+balances.join(' · ');face.setAttribute('role','img');face.setAttribute('aria-label',face.title);
      readouts.push(...balances);
    }
    rack.style.paddingTop=headroom+'px';
    el(view.id+'-values').textContent=[...new Set(readouts)].join(' · ');
  }
}
function paintCounters() {
  const slider=box('counter-fill'), ratio=Number(slider.value)/100;
  const style=finishes[current.skin];
  el('counter-fill-label').textContent=slider.value+'%';
  paintCounterFit(ratio);
  for (const {canvas,mark,cap} of exampleNodes) {
    const count=ratio===1?cap:Math.floor(ratio*cap), ink=canvas.getContext('2d')!;
    const seat=Number(fitWidth.value), n=Number(fitDensity.value);
    const onFace=mark.useBank && seat>=VIS_CFG.buffMagazine.minFaceWidth;
    const r=supportCounterLayout([{meters:n,magazines:0,meta:false}],0,0,seat,0).groups[0].meters[0];
    const w=onFace?Math.min(32,seat-14):r.w, h=onFace?15:r.h;
    canvas.width=Math.round(w*4);canvas.height=Math.round(h*4);
    canvas.style.width=w*1.65+'px';canvas.style.height=h*1.65+'px';
    ink.setTransform(4,0,0,4,0,0);ink.clearRect(0,0,w,h);
    drawSupportCounter(ink,mark,{count,cap},{x:0,y:0,w,h},{...style,trim:current.tint ?? style.trim});
    canvas.title=mark.name+' · '+count+' of '+cap;canvas.setAttribute('aria-label',canvas.title);
  }
}
box('counter-fill').oninput=paintCounters;
fitWidth.onchange=paintCounters;
fitDensity.onchange=paintCounters;
function update() {
  paintCounters();
  for(const key of lookKeys) select(key).value=current[key];
  box('stationary').checked=stationary;
  box('frame-tint').value=current.tint ?? finishes[current.skin].border;
  const cast=socketStates[castState.selectedIndex];
  const notes=cast.marks.map(m=>{
    const li=document.createElement('li'), name=document.createElement('b');name.textContent=m.name;
    const source=m.graft?'Equipment graft':'Socket';
    const info=m.meter ? m.meter.count+' / '+m.meter.cap+' on Cleave' : m.readout ??
      (m.roles ?? [m.role]).map(role=>SUPPORT_ROLES[role]).join(' / ');
    const text=document.createElement('span'), detail=document.createElement('small');
    detail.textContent=source+' · '+info;text.append(name,detail);li.append(emblem(m.id,m.name,m.color,24),text);return li;
  });
  el('socket-list').replaceChildren(...notes);
  el('socket-readout').textContent='First slot · '+cast.face+' · '+cast.rounds+' / '+cast.capacity+' rounds. Four legendary sockets and one glove graft.';
  paintLibrary();
  const picked = presets.find(p=>sameLook(current,p));
  el('direction-detail').textContent=picked?.detail ?? 'Custom mix';
  [...el('directions').children].forEach((b,i)=>b.setAttribute('aria-pressed',String(sameLook(current,presets[i]))));
  const comparing=box('compare').checked;
  el('views').classList.toggle('compare',comparing); el('reference').hidden=!comparing;
  paintCurrent(current); if (comparing) paintReference(reference);
  el('readout').textContent=`${state.flame} imbued strikes, ${state.life} life sips, ${state.mana} mana sips, ${state.carve} Deep Carve stacks, ${state.frenzy} Frenzy stacks, ${state.verse} Verse Shelter stacks.`;
}
for (const key of lookKeys) select(key).onchange=()=>{
  current=restoreLook({...current,[key]:select(key).value}) ?? current; update(); persist();
};
castState.onchange=update;
socketArt.onchange=()=>{
  try { localStorage.setItem(storageKey+'.sockets',socketArt.value); } catch { /* Optional. */ }
  update();
};
box('frame-tint').oninput=()=>{current.tint=box('frame-tint').value;update();persist();};
button('reset-tint').onclick=()=>{delete current.tint;update();persist();};
button('effect-shapes').onclick=()=>{
  Object.assign(current,effectShapes);
  update();persist();
};
box('stationary').onchange=()=>{
  stationary=box('stationary').checked;
  if(stationary && stillCooldown===0) {stillTime=stillProc.row.remaining ?? 0;stillCooldown=stillProc.cooldown ?? 0;}
  update();
};
for (const id of ['compare','crowd','compact']) box(id).onchange=()=>{update();persist();};
const status = el('status');
function strike() {
  state.flame=Math.max(0,state.flame-1); state.carve=Math.min(12,state.carve+1);
}
let timer: ReturnType<typeof setInterval> | undefined;
function stop() { clearInterval(timer); timer=undefined; button('replay').textContent='Replay exchange'; }
encounter.onchange=()=>{stop(); state={...encounters[encounter.value]}; resetEffects(); status.textContent=''; update(); persist();};
button('strike').onclick=()=>{stop(); strike(); update(); status.textContent=`Deep Carve · ${state.flame} imbued strikes left · ×${state.carve} stacks`;};
button('replay').onclick=()=>{
  if (timer !== undefined) { stop(); status.textContent='Exchange paused.'; return; }
  state={...encounters[encounter.value]}; resetEffects(); let step=0;
  status.textContent='Replaying the selected combat state.'; button('replay').textContent='Stop exchange'; update();
  timer=setInterval(()=>{
    step++; stillTime=Math.max(0,stillTime-1); stillCooldown=Math.max(0,stillCooldown-1);
    cryTime=Math.max(0,cryTime-1); tempoTime=Math.max(0,tempoTime-1);
    if(tempoTime===0)tempoCount=0;
    state.dashSeconds=Math.max(0,state.dashSeconds-1); state.wardSeconds=Math.max(0,state.wardSeconds-1);
    if (step === 2) state.life=Math.max(0,state.life-1); else strike();
    update();
    if (step === 6) {stop(); status.textContent='Exchange complete.';}
  },1000);
};
document.addEventListener('visibilitychange',()=>{ if (document.hidden && timer !== undefined) { stop(); status.textContent='Exchange paused.'; } });
button('pin').onclick=()=>{ reference=copyLook(current); box('compare').checked=true; update(); persist(); status.textContent='Reference pinned. Choose another mix to compare.'; };
button('copy').onclick=async()=>{
  const categories=(Object.keys(behaviorNames) as (keyof typeof behaviorNames)[]).map(k=>behaviorNames[k]+' '+shapes[current[k]]);
  const summary=[lookName(current),chargeStyles[current.charges],stackStyles[current.stacks],metals[current.metal],skins[current.skin],expiry[current.expiry],options.timers[current.timers],current.tint ?? 'Finish color',...categories].join(' · ');
  try { await navigator.clipboard.writeText(summary); status.textContent='Copied '+summary; }
  catch { status.textContent=summary; const range=document.createRange(); range.selectNodeContents(status);
    const selection=getSelection(); selection?.removeAllRanges(); selection?.addRange(range); }
};
update();
const resized=new ResizeObserver(()=>update());
for (const id of ['current','reference']) resized.observe(el(id).querySelector('.face')!);
const previewIds=new Set([...socketStates[0].marks,...slotFit.pair.flatMap(s=>s.marks)].map(m=>m.id));
void Promise.all([...previewIds].map(id=>loadAbilityArtwork(abilityArtworkUrl('support',id)!))).then(update);
