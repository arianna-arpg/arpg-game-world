import type { SkillFlightVisual } from './skillFlightVoice';
import type { SpellFlightCore } from '../../data/skillFlightVisuals';
import { PROJ_FORM_GEO as G } from '../../engine/projForms';
import { shade, withAlpha } from './color';

const TAU = Math.PI * 2;
type Brush = CanvasRenderingContext2D;

/** All dimensions below are in the normalized frame of the real head. */
function crystal(ctx: Brush, v: Extract<SpellFlightCore, {form:'crystal'}>, color: string) {
  for (let i = 0; i < Math.min(5, v.prongs); i++) {
    const side = i === 0 ? 0 : (i % 2 ? -1 : 1) * Math.ceil(i / 2);
    ctx.save(); ctx.translate(-Math.abs(side) * .26, side * .18);
    ctx.rotate(side * .37); ctx.scale(1 - Math.abs(side) * .2, v.width);
    ctx.fillStyle = shade(color,-.42);
    ctx.beginPath(); ctx.moveTo(-.92,0); ctx.lineTo(-.36,-.8); ctx.lineTo(.98,0); ctx.lineTo(-.48,.72); ctx.closePath(); ctx.fill();
    ctx.fillStyle = shade(color,.55);
    ctx.beginPath(); ctx.moveTo(-.36,-.8); ctx.lineTo(.98,0); ctx.lineTo(-.48,.08); ctx.closePath(); ctx.fill();
    ctx.strokeStyle = color; ctx.lineWidth = .12;
    ctx.beginPath(); ctx.moveTo(-.87,0); ctx.lineTo(-.48,.08); ctx.lineTo(.94,0); ctx.stroke(); ctx.restore();
  }
  if (v.bound) {
    ctx.strokeStyle = shade(color,.74); ctx.lineWidth = .15;
    for (const x of [-.69,-.43]) { ctx.beginPath(); ctx.moveTo(x+.18,-.58); ctx.lineTo(x,.54); ctx.stroke(); }
  }
}

function reservoir(ctx: Brush, shell: 'geode'|'charge'|'whirlpool', color: string, age: number) {
  const light = shade(color,.72);
  ctx.rotate(age * (shell === 'whirlpool' ? 4 : 1.2));
  const arms = shell === 'geode' ? 6 : shell === 'charge' ? 3 : 2;
  for (let i = 0; i < arms; i++) {
    ctx.save(); ctx.rotate(i * TAU / arms);
    if (shell === 'geode') {
      ctx.fillStyle = i%2 ? color : light; ctx.beginPath(); ctx.moveTo(.22,0);
      ctx.lineTo(.58,-.3); ctx.lineTo(.94,0); ctx.lineTo(.52,.14); ctx.closePath(); ctx.fill();
    } else if (shell === 'charge') {
      ctx.strokeStyle = light; ctx.lineWidth = .15; ctx.beginPath(); ctx.moveTo(.08,0);
      ctx.lineTo(.45,-.33); ctx.lineTo(.38,.02); ctx.lineTo(.83,-.18); ctx.stroke();
      ctx.fillStyle = color; ctx.beginPath(); ctx.arc(.82,-.18,.14,0,TAU); ctx.fill();
    } else {
      ctx.fillStyle = i ? color : light;
      ctx.beginPath(); ctx.moveTo(.18,.07); ctx.bezierCurveTo(.18,-.61,.94,-.62,.91,.09);
      ctx.bezierCurveTo(.63,-.31,.37,-.04,.18,.28); ctx.closePath(); ctx.fill();
    }
    ctx.restore();
  }
  ctx.fillStyle = shell === 'whirlpool' ? shade(color,-.65) : light;
  ctx.beginPath(); ctx.arc(0,0,shell === 'charge' ? .24 : .19,0,TAU); ctx.fill();
}

function strand(ctx: Brush, weave: Extract<SpellFlightCore,{form:'strand'}>['weave'], color: string, age: number) {
  const light = shade(color,.68), t = age * 7;
  if (weave === 'flame' || weave === 'tongue') {
    ctx.fillStyle = color; ctx.beginPath(); ctx.moveTo(.98,0);
    if (weave === 'flame') {
      ctx.quadraticCurveTo(.22,.78,-.92,.6); ctx.lineTo(-.38,.12); ctx.lineTo(-1,-.24);
      ctx.lineTo(-.22,-.27); ctx.lineTo(-.56,-.79);
    } else {
      ctx.bezierCurveTo(.58,-.72,.32,-.82,.37,-.24); ctx.quadraticCurveTo(-.38,-.5,-1,.19);
      ctx.quadraticCurveTo(-.26,-.02,.38,.28); ctx.lineTo(.22,.76);
    }
    ctx.closePath(); ctx.fill(); ctx.strokeStyle = light; ctx.lineWidth = .12;
    ctx.beginPath(); ctx.moveTo(-.52,.13); ctx.quadraticCurveTo(.2,-.09,.91,0); ctx.stroke(); return;
  }
  const loops = weave === 'coil' ? 2.5 : weave === 'steam' ? 1.5 : .8;
  const ribbons = weave === 'current' || weave === 'steam' ? 3 : weave === 'coil' ? 2 : 1;
  for (let j=0; j<ribbons; j++) {
    ctx.beginPath();
    for (let i=0; i<=18; i++) {
      const u=i/18, x=u*2-1;
      const offset=(j-(ribbons-1)/2)*(weave === 'coil' ? 0 : .43);
      const y=offset + Math.sin(u*TAU*loops - t + j*2.4) * (weave === 'coil' ? .72 : .34);
      if (i) ctx.lineTo(x,y); else ctx.moveTo(x,y);
    }
    ctx.lineWidth = ribbons === 1 ? .39 : .18; ctx.strokeStyle = j%2 ? light : color; ctx.stroke();
  }
  if (weave === 'vine' || weave === 'pustules') for (let j=0; j<4; j++) {
    const u=(j+.5)/4, x=2*u-1, y=Math.sin(u*TAU*loops-t)*.34, sign=j%2 ? 1 : -1;
    ctx.beginPath();
    if (weave === 'pustules') ctx.ellipse(x,y+.24*sign,.14,.34,0,0,TAU);
    else { ctx.moveTo(x-.2,y); ctx.quadraticCurveTo(x-.1,y+.8*sign,x+.18,y+.64*sign); ctx.lineTo(x+.1,y); }
    ctx.fillStyle = j%2 ? light : color; ctx.fill();
  }
}

function spirit(ctx: Brush, v: Extract<SpellFlightCore,{form:'spirit'}>, color: string, age: number) {
  const tails = Math.min(4, v.tails);
  for (let i=0; i<tails; i++) {
    const y = (i-(tails-1)/2)*.42, swing = .31*Math.sin(age*6+i);
    ctx.fillStyle = i%2 ? shade(color,.42) : color; ctx.beginPath(); ctx.moveTo(.38,y-.25);
    ctx.bezierCurveTo(-.18,y-.32,-.48,y+swing,-.99,y+swing-.18);
    ctx.quadraticCurveTo(-.53,y+swing+.54,.32,y+.24); ctx.closePath(); ctx.fill();
  }
  ctx.fillStyle = v.hollow ? shade(color,-.61) : shade(color,.44);
  ctx.strokeStyle = shade(color,.78); ctx.lineWidth = .12;
  ctx.beginPath(); ctx.ellipse(.32,0,v.mask ? .43 : .36,v.mask ? .7 : .38,0,0,TAU); ctx.fill(); ctx.stroke();
  if (v.mask) {
    ctx.strokeStyle = shade(color,-.76); ctx.lineWidth = .17;
    for (const sign of [-1,1]) { ctx.beginPath(); ctx.moveTo(.25,.38*sign); ctx.lineTo(.46,.16*sign); ctx.stroke(); }
  }
}

export function drawSpellFlightCore(ctx: Brush, p: SkillFlightVisual, core: SpellFlightCore): boolean {
  const r=p.radius;
  if (!['circle','triangle','octagon','line','square'].includes(p.shape)) return false;
  ctx.save(); ctx.rotate(p.dir); ctx.scale(r,r); ctx.beginPath();
  switch (p.shape) {
    case 'line': ctx.scale(G.line.hAlong,G.line.hAcross); ctx.rect(-1,-1,2,2); break;
    case 'triangle': ctx.moveTo(1,0); ctx.lineTo(-1,G.triangle.base); ctx.lineTo(-1,-G.triangle.base); ctx.closePath(); break;
    case 'octagon':
      for (let i=0;i<8;i++) { const a=i*TAU/8+p.age*G.octagon.spinRate-p.dir;
        if (i) ctx.lineTo(Math.cos(a),Math.sin(a)); else ctx.moveTo(Math.cos(a),Math.sin(a)); }
      ctx.closePath(); break;
    case 'square': ctx.rotate(p.age*G.square.tumbleRate); ctx.scale(G.square.half,G.square.half); ctx.rect(-1,-1,2,2); break;
    default: ctx.arc(0,0,1,0,TAU);
  }
  ctx.clip();
  if (p.shape !== 'circle') {
    ctx.fillStyle = withAlpha(p.color,.13); ctx.fill();
    ctx.strokeStyle = withAlpha(p.color,.58); ctx.lineWidth = .13; ctx.stroke();
  }
  ctx.lineCap='round'; ctx.lineJoin='round';
  switch (core.form) {
    case 'crystal': crystal(ctx,core,p.color); break;
    case 'reservoir': reservoir(ctx,core.shell,p.color,p.age); break;
    case 'strand': strand(ctx,core.weave,p.color,p.age); break;
    case 'spirit': spirit(ctx,core,p.color,p.age); break;
    case 'silk': {
      ctx.rotate(p.age*1.6); ctx.strokeStyle=shade(p.color,.45); ctx.lineWidth=.12;
      const spokes = Math.min(8, core.spokes);
      for (let i=0;i<spokes;i++) {
        const a=i*TAU/spokes, b=(i+1)*TAU/spokes;
        ctx.beginPath(); ctx.moveTo(0,0); ctx.lineTo(Math.cos(a)*.96,Math.sin(a)*.96);
        ctx.moveTo(Math.cos(a)*.77,Math.sin(a)*.77); ctx.quadraticCurveTo(Math.cos((a+b)/2)*.38,Math.sin((a+b)/2)*.38,Math.cos(b)*.77,Math.sin(b)*.77); ctx.stroke();
      }
      break;
    }
  }
  ctx.restore(); return true;
}
