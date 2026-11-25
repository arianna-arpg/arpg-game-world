import type { SupportCounter } from '../../data/supportVisuals';
import type { CosmeticHotbarStyle } from '../../data/cosmeticStyles';
import type { SupportMark } from '../../engine/supportPresentation';
import type { BuffIconRect } from './buffIcons';
import { VIS_CFG } from './visConfig';
import { ICON_SUBJECTS } from '../skillIconArt';
import { drawSupportEmblem } from './supportEmblems';
import { statusInkPath } from './statusInk';

type Ink = CanvasRenderingContext2D;
type Readout = {count:number; cap:number};
type Style = Pick<CosmeticHotbarStyle,'rail'|'trim'>;
const dark='#10171b', gold='#f4c66f', pearl='#fff2cf', socket='#313e43';

function plate(c:Ink,path:string,fill:string,edge:string,width=.9) {
  const p=statusInkPath(path);
  c.fillStyle=fill;c.fill(p);c.lineWidth=width;c.strokeStyle=edge;c.stroke(p);
}
function line(c:Ink,path:string,color:string,width=1) {
  c.strokeStyle=color;c.lineWidth=width;c.stroke(statusInkPath(path));
}
function dot(c:Ink,x:number,y:number,r:number,fill:string) {
  c.beginPath();c.arc(x,y,r,0,Math.PI*2);c.fillStyle=fill;c.fill();
}
/** Use whole, familiar denominations. The final group holds only the remaining capacity. */
export function counterGroupSize(capacity:number,places:number):number {
  const needed=Math.ceil(capacity/Math.max(1,Math.floor(places)));
  if(needed<=1) return 1;
  const decade=10**Math.floor(Math.log10(needed));
  if(needed<=decade) return decade;
  return needed<=2*decade ? 2*decade : needed<=5*decade ? 5*decade : 10*decade;
}

function groupFill(b:Readout,index:number,units:number) {
  const start=index*units;
  return Math.max(0,Math.min(1,(b.count-start)/Math.max(1,Math.min(units,b.cap-start))));
}
function chamber(c:Ink,w:number,b:Readout,trim:string) {
  c.save();
  const k=Math.min(1,w/25);
  c.translate((w-25*k)/2,(18-18*k)/2);c.scale(k,k);
  // The fluted side and offset rear collar distinguish the drum from a coin.
  plate(c,'M5 2L12 1H18L24 5V11L20 15L13 17H6Z','#5c6057',trim,1);
  line(c,'M16 4L21 3M19 7L24 6M19 11L24 10M16 14L20 13','#282d2a',1.3);
  plate(c,'M1 6L5 2H13L18 6V12L14 16H5L1 12Z','#353b39',trim,1.15);
  line(c,'M2 6L6 3H13L16 5',pearl,.8);
  const units=counterGroupSize(b.cap,VIS_CFG.supportCounter.maxBores);
  const n=Math.max(1,Math.ceil(b.cap/units)), r=n<4?2.35:1.8;
  if(units>1) line(c,'M17 2L21 4V7M19 2L23 4V7',gold,.9);
  for (let i=0;i<n;i++) {
    const a=-Math.PI/2+i*2*Math.PI/n;
    const x=n===1?9.5:9.5+Math.cos(a)*5,y=n===1?9:9+Math.sin(a)*4.25;
    const fill=groupFill(b,i,units);
    dot(c,x,y,r+.55,'#080d0d');dot(c,x,y,r,socket);
    if(fill===1) {
      dot(c,x,y,r,gold);dot(c,x-.35,y-.4,r*.45,pearl);dot(c,x,y,.48,'#785926');
    } else if(fill>0) {
      c.save();c.beginPath();c.arc(x,y,r,0,Math.PI*2);c.clip();
      c.fillStyle=gold;c.fillRect(x-r,y+r-2*r*fill,2*r,2*r*fill);c.restore();
    }
  }
  c.restore();
}
function staffNote(c:Ink,x:number,y:number,step:number,color:string) {
  c.fillStyle=color;c.fillRect(x+.65,y-5.6,1.1,5.6);
  c.beginPath();c.ellipse(x,y,Math.min(2,step*.39),1.55,-.32,0,Math.PI*2);c.fill();
}
function score(c:Ink,w:number,b:Readout,color:string) {
  const end=w-1, cap=Math.max(1,b.cap), complete=b.cap>0 && b.count>=b.cap;
  const places=Math.max(1,Math.floor((end-3)/VIS_CFG.supportCounter.staffPitch));
  const units=counterGroupSize(cap,Math.min(8,places)), cells=Math.ceil(cap/units);
  // Keep the signature only when every playable note still has its own space.
  const signature=end>=13+cells*VIS_CFG.supportCounter.staffPitch;
  const start=signature?13:1, stop=end-2, step=(stop-start)/cells;
  if(complete) {
    c.save();c.fillStyle=color;c.globalAlpha*=.15;c.fillRect(start,3,end-start,13);
    c.fillRect(start,6,end-start,7);c.restore();
  }
  c.fillStyle=complete?'#a87c3f':'#51514a';
  for(const y of [6,9,12]) c.fillRect(start,y,stop-start,.8);
  if(signature) {
    c.save();c.translate(0,2);c.scale(.48,.48);
    plate(c,ICON_SUBJECTS.beamedNotes[0].path,color,pearl,.9);c.restore();
  }
  for(let i=0;i<cells;i++) {
    const x=start+(i+.5)*step, y=12.5-(i%3)*1.55;
    const fill=groupFill(b,i,units);
    staffNote(c,x,y,step,fill===1 ? (complete?pearl:color) : '#718079');
    if(fill>0 && fill<1) {
      c.save();c.beginPath();c.rect(x-step/2,0,step*fill,18);c.clip();staffNote(c,x,y,step,color);c.restore();
    }
  }
  // The double bar and warm light are reserved for the exact final beat.
  if(complete) {
    c.fillStyle=color;c.fillRect(start,14.8,end-start,2.2);
    c.fillRect(end-2.7,4,1,11);c.fillStyle=pearl;c.fillRect(end-.9,3,1.3,13);
    c.fillStyle=pearl;c.fillRect(start,15.1,end-start,.7);
  }
}
function pressure(c:Ink,w:number,frac:number,color:string,trim:string) {
  c.save();const sx=Math.min(1.45,w/21);c.translate((w-21*sx)/2,0);c.scale(sx,1);
  plate(c,'M1 14V9A9.5 8 0 0 1 20 9V14ZM5 15H16V17H5Z','#303a3b',trim);
  c.beginPath();c.arc(10.5,10,6,-Math.PI,0);c.strokeStyle='#a49c80';c.lineWidth=1.4;c.stroke();
  const a=Math.PI*(1+frac);c.beginPath();c.moveTo(10.5,10);c.lineTo(10.5+Math.cos(a)*7.5,10+Math.sin(a)*7.5);
  c.strokeStyle=color;c.lineWidth=1.8;c.stroke();dot(c,10.5,10,1.8,pearl);c.restore();
}
function cistern(c:Ink,w:number,frac:number,color:string,trim:string) {
  c.save();const sx=Math.min(1.5,w/21);c.translate((w-21*sx)/2,0);c.scale(sx,1);
  plate(c,'M2 4L5 2H16L19 4V13L16 15H5L2 13Z',dark,trim);
  c.fillStyle='#334244';c.fillRect(4,5,13,7);
  c.fillStyle=color;c.fillRect(4,12-7*frac,13,7*frac);
  line(c,'M1 4H20M1 13H20M7 4V13M14 4V13',trim,1.25);c.restore();
}

const CELLS = {
  ripostes:'M8 0L9 2L5 7L7 8L6 9L4 8L2 10L1 9L3 7L1 6L2 5L4 6Z',
  scales:'M4.5 0H6V2H10L9 3L10 6Q8 8 6.5 6L8 3H6V8L8 10H2L4.5 8V3H2.5L4 6Q2 8 0 6L1.5 3L0 2H4.5Z',
  crawlers:'M1 3L3 4L4 2H7L8 4L10 3L9 6L10 8L7 7L6 10L5 8L3 10L3 7L0 8L2 5Z',
  spirits:'M2 5Q1 0 5 1Q9 1 8 5Q7 8 10 8Q7 11 4 8L1 10Z',
  crowns:'M0 3L3 5L5 1L7 5L10 3L8 9H2Z',
  brood:'M5 1L7 3L10 2L8 5L10 7L7 6L8 9L5 8L2 10L3 6L0 7L2 5L0 2L3 3Z',
  shrouds:'M1 9L3 3L5 0L8 3L10 9L7 8L6 10L4 8ZM4 4L6 3L7 5L5 6Z',
  hatchlings:'M0 5L3 7L4 5L6 7L9 5Q10 10 5 10Q1 10 0 5ZM3 4L4 1L7 0L8 3L6 2L5 4Z',
  shadows:'M2 8L4 6L3 4L4 1H7L8 3L7 6L10 9L6 8L1 10Z',
  mirrors:'M0 3L4 0L7 2L3 5V9L0 7ZM4 5L8 2L10 4V8L6 10L4 9Z',
  ancestors:'M4 1L7 0L8 2L7 4L10 3L7 6L5 7L1 10L3 6L0 6L4 4Z',
  totems:'M2 1H8L9 4L7 5L8 7L6 8L8 10H2L4 8L2 6L3 5L1 4Z',
  effigies:'M3 1L6 0L7 2L6 4L10 3L9 5L6 6L7 10L4 9L3 6L0 5L1 3L4 4Z',
  mires:'M1 7Q4 5 3 3L5 5L6 1Q9 4 7 6L10 7Q10 10 5 10Q0 10 1 7Z',
  hive:'M1 4L3 1H7L10 4L9 8L6 10L2 8ZM3 4H7L8 6H2Z',
  embers:'M5 0Q6 3 8 4L9 2Q12 8 6 10Q0 10 1 5Q4 5 5 0Z',
  venom:'M4 1H7V3H6.5L9 7Q10 10 5 10Q0 10 2 7L4.5 3H4Z',
  wounds:'M4 1L1 8L6 3L3 10L10 1L5 5Z',
  bolts:'M5 0H9L6 4H9L2 11L4 6H1Z',
  barbs:'M0 8L6 2L4 1L10 0L9 6L8 4L2 10Z',
  feathers:'M1 8Q3 2 10 1Q9 6 3 8L1 9ZM2 7L7 3',
  runes:'M5 0L9 5L5 10L1 5ZM5 2V8',
  clutch:'M2 6Q2 3 5 1Q8 3 8 6Q8 10 5 10Q2 10 2 6Z',
  fangs:'M1 1Q5 3 9 1Q8 6 4 10Q5 6 1 1Z',
  gate:'M2 1H7V7L4.5 10L2 7Z',
} as const;
function cellPlaces(w:number) {
  return Math.max(1,Math.floor((w-2)/VIS_CFG.supportCounter.fangPitch));
}
function bankCells(c:Ink,w:number,b:Readout,style:keyof typeof CELLS,color:string) {
  const capacity=Math.max(1,Math.floor(b.cap));
  // Give teeth room to read in a single row. Other tall banks can use two ranks.
  const places=cellPlaces(w);
  const rows=style!=='fangs' && capacity>places ? 2 : 1;
  const units=counterGroupSize(capacity,places*rows), cells=Math.ceil(capacity/units);
  const columns=Math.ceil(cells/rows), step=(w-2)/columns;
  if (style==='gate') {c.fillStyle='#9da7a2';c.fillRect(1,3,w-2,2);}
  for(let i=0;i<cells;i++) {
    const s=Math.min(rows===2?.75:1.3,step/10), row=Math.floor(i/columns);
    const x=1+(i%columns)*step+(step-10*s)/2, y=(rows===2?5+row*8:9)-5*s;
    const fill=groupFill(b,i,units);
    c.save();c.translate(x,y);c.scale(s,s);
    plate(c,CELLS[style],fill===1?color:socket,fill===1?pearl:'#75827c',1);
    if(fill>0 && fill<1) {
      c.save();c.clip(statusInkPath(CELLS[style]));c.fillStyle=color;c.fillRect(0,0,11,1+9*fill);c.restore();
    }
    c.restore();
    // Denomination inlays also expose partial groups in a narrow second rank.
    if(units>1) {
      const baseY=rows===2 ? (row+1)*8.5 : 15.5, height=rows===2?1:1.7;
      const base=x, span=10*s, capacityHere=Math.min(units,capacity-i*units);
      c.fillStyle='#48514e';c.fillRect(base,baseY,span,height);
      c.fillStyle=color;c.fillRect(base,baseY,span*fill,height);
      if(span/capacityHere>=1.6) {
        c.fillStyle=dark;
        for(let j=1;j<capacityHere;j++) c.fillRect(base+span*j/capacityHere-.35,baseY,.7,height);
      }
    }
  }
}
function brew(c:Ink,w:number,frac:number,color:string,trim:string) {
  c.save();const sx=Math.min(1.2,w/24);c.translate((w-24*sx)/2,0);c.scale(sx,1);
  const pot='M3 6H19Q21 10 18 14Q16 17 10 16Q4 16 3 12Z';
  plate(c,pot,dark,trim);
  c.save();c.clip(statusInkPath(pot));c.fillStyle=color;c.fillRect(2,16-frac*10,19,frac*10);c.restore();
  line(c,'M5 6Q5 -1 11 1Q17 1 17 6M20 9Q24 6 22 10L19 13M2 6H20',trim,1.2);c.restore();
}

/** Detached, outlined type keeps the silhouette intact and remains exact on large banks. */
export function drawSupportNumber(c:Ink,count:number,x:number,mid:number,height:number,maxWidth:number) {
  c.font='bold '+Math.max(8,Math.round(height))+'px Verdana';c.textAlign='right';c.textBaseline='middle';
  c.lineJoin='round';c.lineWidth=2.5;c.strokeStyle='#070b10';c.strokeText(String(count),x,mid,maxWidth);
  c.fillStyle='#fff4d9';c.fillText(String(count),x,mid,maxWidth);
}

function numeralGutter(b:Readout,physicalWidth:number,width:number) {
  const count=Math.max(0,Math.floor(b.count));
  // Reserve digits against capacity so spending 10 → 9 cannot move the artwork.
  const digits=String(Math.max(count,Math.ceil(b.cap))).length;
  const gutter=3+digits*8.3;
  return physicalWidth>=VIS_CFG.supportCounter.numberMinWidth && width-gutter-3>=VIS_CFG.supportCounter.minPicture ? gutter : 0;
}
export function chamberGroupHint(cap:number) {
  const units=counterGroupSize(cap,VIS_CFG.supportCounter.maxBores);
  return units>1 ? 'Up to '+units+' rounds per bore' : undefined;
}
export function counterGroupHint(mark:SupportMark,r:BuffIconRect) {
  const bank=mark.meter;
  if(!bank) return;
  if(mark.counter==='chamber') return chamberGroupHint(bank.cap);
  const width=r.w*18/r.h, picture=width-numeralGutter(bank,r.w,width)-3;
  const type=mark.counter;
  const places=cellPlaces(picture);
  const marks=type==='score' ? Math.min(8,Math.max(1,Math.floor((picture-4)/VIS_CFG.supportCounter.staffPitch))) :
    type && Object.hasOwn(CELLS,type) ? places*(type!=='fangs' && bank.cap>places ? 2 : 1) : 0;
  if (!marks) return;
  const units=counterGroupSize(bank.cap,marks);
  return units>1 ? 'Up to '+units+(type==='fangs'?' charges per fang':type==='score'?' beats per note':' units per symbol') : undefined;
}

export function drawSupportCounter(c:Ink,mark:SupportMark,b:Readout,r:BuffIconRect,skin:Style) {
  if (r.w<6 || r.h<4) return;
  const scale=r.h/18, width=r.w/scale, count=Math.max(0,Math.floor(b.count));
  const numberWidth=numeralGutter(b,r.w,width), picture=width-numberWidth-3;
  const frac=Math.max(0,Math.min(1,b.count/Math.max(1,b.cap)));
  c.save();c.translate(r.x,r.y);c.scale(scale,scale);
  c.beginPath();c.rect(0,0,width,18);c.clip();
  c.fillStyle=skin.rail;c.beginPath();c.roundRect(0,0,width,18,3);c.fill();
  c.lineJoin='round';c.lineCap='round';
  const type:SupportCounter|undefined=mark.counter;
  c.save();c.translate(1,0);
  if(type==='score') score(c,picture,b,mark.color);
  else if(type==='chamber') chamber(c,picture,b,skin.trim);
  else if(type==='pressure') pressure(c,picture,frac,mark.color,skin.trim);
  else if(type==='cistern') cistern(c,picture,frac,mark.color,skin.trim);
  else if(type==='brew') brew(c,picture,frac,mark.color,skin.trim);
  else if(type==='shield' || type==='husks' || type==='bobbin' || type==='glass' || type==='carapace') {
    // A continuous fill behind the silhouette keeps damage and husk points readable at large caps.
    const motif=type==='shield' ? 'M2 3L10 1L18 3V8Q18 13 10 17Q2 13 2 8Z'
      : type==='husks' ? 'M3 4L7 1L10 3L14 1L17 4V10L13 15L10 17L7 15L3 10Z'
      : type==='glass' ? 'M3 1H17L16 4L12 8V10L16 14L17 17H3L4 14L8 10V8L4 4Z'
      : type==='carapace' ? 'M1 11L4 5L9 2L15 3L19 7L17 14L13 12L10 16L7 13L3 15Z'
      : 'M2 2H18V4H15V14H18V16H2V14H5V4H2Z';
    const k=Math.min(1,picture/20);
    c.translate((picture-20*k)/2,(18-18*k)/2);c.scale(k,k);
    plate(c,motif,socket,skin.trim);
    c.save();c.clip(statusInkPath(motif));c.fillStyle=mark.color;c.fillRect(1,17-16*frac,18,16*frac);c.restore();
    line(c,type==='shield'?'M11 3L8 8L12 9L9 14':type==='husks'?'M5 6L8 8M15 6L12 8M9 13H11':type==='glass'?'M4 2H16M5 15H15M10 8V12':type==='carapace'?'M2 11L9 6L18 7M9 6L10 15':'M6 5L14 7L6 9L14 11L6 13',pearl,1.1);
  }
  else if(type && Object.hasOwn(CELLS,type)) bankCells(c,picture,b,type,mark.color);
  else {
    const side=Math.min(16,picture);drawSupportEmblem(c,mark,(picture-side)/2,0,side);
    c.fillStyle=mark.color;c.fillRect(0,16,picture*frac,1.5);
  }
  c.restore();
  // A steady bright edge marks exact capacity, including gauges with sub-pixel last steps.
  if (b.cap>0 && b.count>=b.cap && type!=='score') {
    c.fillStyle=mark.color;c.fillRect(1,16.4,picture,1.6);
    c.fillStyle=pearl;c.fillRect(1,16.4,picture,.65);
  }
  if (mark.threshold && mark.threshold<b.cap) {
    const x=1+picture*Math.min(1,mark.threshold/b.cap);
    c.fillStyle=b.count>=mark.threshold ? pearl : '#81908e';c.fillRect(x-1,0,2,2.4);
  }
  if(numberWidth) drawSupportNumber(c,count,width-1.5,9.6,13,numberWidth-1);
  c.restore();
}
