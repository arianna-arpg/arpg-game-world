import { address, neighborCell, type MassCell } from './address';
import type { MassRange, MassSpec } from './contracts';
import { matchesMassRanges, type MassGenerator } from './generator';
import { canonical, massHash, streamSeed } from './random';

/** Choose an existing geographical neighbourhood for a new settlement.
 * Coordinates stay local to the chosen address; no noise, land or seed is edited. */
export interface MassOriginSpec {
  source: string;
  base: MassCell;
  candidates: number;
  spacingCells: number;
  sample: { minX: number; minY: number; maxX: number; maxY: number; step: number };
  when: MassRange[];
  minimumFraction: number;
}
export interface MassOriginChoice { origin: MassCell; matched: number; samples: number; candidate: number; satisfied: boolean }

export function validateMassOrigin(spec: MassOriginSpec, terrain: MassSpec): void {
  const integer=(n:number,min:number,max:number)=>Number.isSafeInteger(n)&&n>=min&&n<=max;
  if(!spec || typeof spec.source!=='string' || !spec.source || spec.source.length>256
    || !integer(spec.candidates,1,128) || !integer(spec.spacingCells,1,4096)
    || !Number.isFinite(spec.minimumFraction) || spec.minimumFraction<=0 || spec.minimumFraction>1
    || !spec.sample || ![spec.sample.minX,spec.sample.minY,spec.sample.maxX,spec.sample.maxY].every(n=>integer(n,-65536,65536))
    || !integer(spec.sample.step,30,16384) || spec.sample.minX>=spec.sample.maxX || spec.sample.minY>=spec.sample.maxY
    || !Array.isArray(spec.when) || !spec.when.length || spec.when.length>16)
    throw Error('Invalid worldmass origin selection');
  const b=spec.base;
  if(!b)throw Error('Invalid worldmass origin base');
  address(b.dimension,b.cx,b.cy,0,0,terrain.addressSpan);
  const sample=spec.sample;
  const count=(Math.floor((sample.maxX-sample.minX)/sample.step)+1)*(Math.floor((sample.maxY-sample.minY)/sample.step)+1);
  if(count>1024)throw Error('Worldmass origin sample budget exceeded');
  for(const r of spec.when)if(!r || !terrain.fields.some(f=>f.id===r.field)
    || r.min!==undefined&&!Number.isFinite(r.min) || r.max!==undefined&&!Number.isFinite(r.max)
    || (r.min??-Infinity)>=(r.max??Infinity))throw Error('Invalid worldmass origin field range');
  // Refuse an address-edge search before sampling rather than wrap its candidates.
  const reach=Math.ceil(Math.sqrt(spec.candidates))*spec.spacingCells;
  neighborCell(b,reach,reach);neighborCell(b,-reach,-reach);
}
export function scoreMassOrigin(generator: MassGenerator, spec: MassOriginSpec, origin: MassCell): {matched:number;samples:number} {
  let matched=0,samples=0;
  const b=spec.sample,span=generator.spec.addressSpan;
  for(let y=b.minY;y<=b.maxY;y+=b.step)for(let x=b.minX;x<=b.maxX;x+=b.step){
    const fields=generator.fieldsAt(address(origin.dimension,origin.cx,origin.cy,x,y,span));
    matched+=Number(matchesMassRanges(spec.when,fields));samples++;
  }
  return {matched,samples};
}
export function chooseMassOrigin(generator: MassGenerator, spec: MassOriginSpec | undefined): MassOriginChoice {
  if(spec===undefined)return {origin:{dimension:'surface',cx:'0',cy:'0'},matched:0,samples:0,candidate:0,satisfied:true};
  validateMassOrigin(spec,generator.spec);
  const offsets=[{x:0,y:0}],salt=streamSeed(generator.run.seed,[spec.source,'candidate-order']);
  for(let ring=1;offsets.length<spec.candidates;ring++){
    const rows:{x:number;y:number;rank:number}[]=[];
    for(let y=-ring;y<=ring;y++)for(let x=-ring;x<=ring;x++)if(Math.max(Math.abs(x),Math.abs(y))===ring)
      rows.push({x,y,rank:massHash(canonical([x,y]),salt)});
    rows.sort((a,b)=>a.rank-b.rank||a.y-b.y||a.x-b.x);
    offsets.push(...rows.slice(0,spec.candidates-offsets.length));
  }
  let best:MassOriginChoice|undefined;
  for(const [candidate,offset] of offsets.entries()){
    const origin=neighborCell(spec.base,offset.x*spec.spacingCells,offset.y*spec.spacingCells);
    const score=scoreMassOrigin(generator,spec,origin),row={origin,...score,candidate,satisfied:score.matched/score.samples>=spec.minimumFraction};
    if(!best||row.matched>best.matched)best=row;
    if(row.satisfied)return row;
  }
  // A mod may ask for an impossible landscape. Bounded best effort is explicit;
  // no silent terrain repainting, seed retry or unbounded search follows.
  return best!;
}
