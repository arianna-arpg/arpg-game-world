import type { Altar, World } from '../engine/world';
import { ALTARS, type AltarDef } from '../data/shrines';
import { STAT_DEFS } from '../engine/stats';
import { SKILLS } from '../data/skills';
import type { MassPlace } from './contracts';
import { canonical } from './random';
import { siteOffset } from './sites';

export interface MassAltarSpec { id: string; source: string; x: number; y: number; def: AltarDef }
export interface MassFieldSave { id: string; mendTimer?: number; boltTimer?: number }
/** Copy the native rule into the expedition; later registry edits cannot move or
 * retune an already saved place. Native updateAltars remains its sole simulation. */
export function nativeMassAltar(id: string, x: number, y: number): MassAltarSpec {
  const def = ALTARS.find(d => d.id === id);
  if (!def) throw new Error('Unknown native altar: ' + id);
  return { id, source: 'altars/' + id, x, y, def: JSON.parse(JSON.stringify(def)) };
}
export function validateMassAltar(row: MassAltarSpec, radius: number): void {
  const d=row.def;
  if (!row.id || !row.source || !d || !ALTARS.some(a=>a.id===d.id) || !d.name
    || !/^#[0-9a-f]{6}$/i.test(d.color) || ![row.x,row.y,d.radius].every(Number.isFinite)
    || d.radius < 24 || Math.hypot(row.x,row.y)+d.radius >= radius
    || !Array.isArray(d.mods) || d.mods.length>16
    || d.mods.some(m=>!STAT_DEFS[m.stat] || !['flat','increased','more','override'].includes(m.kind) || !Number.isFinite(m.value))
    || d.influenceCue!==undefined && typeof d.influenceCue!=='boolean'
    || d.killGems
    || d.bolts && (!Object.hasOwn(SKILLS,d.bolts.skillId)
      || ![d.bolts.radius,d.bolts.telegraph,d.bolts.ratePerSec].every(Number.isFinite)
      || d.bolts.radius<=0 || d.bolts.radius>d.radius
      || d.bolts.telegraph<=0 || d.bolts.telegraph>10
      || d.bolts.ratePerSec<=0 || d.bolts.ratePerSec>10
      || d.bolts.throughRoofs!==undefined && typeof d.bolts.throughRoofs!=='boolean'
      || d.bolts.fx!==undefined && (typeof d.bolts.fx!=='string' || !d.bolts.fx || d.bolts.fx.length>128))
    || d.mend && (![d.mend.every,d.mend.base,d.mend.perLevel].every(Number.isFinite)
      || d.mend.every<=0 || d.mend.base<0 || d.mend.perLevel<0))
    throw new Error('Unsupported worldmass altar field');
}
/** Finite journey fields stay resident like Lastlight. No array-index identity:
 * a field's modifier source follows its geographic owner across Continue. */
export class MassFields {
  private live = new Map<string, Altar>();
  private saved = new Map<string, MassFieldSave>();
  constructor(saved: readonly MassFieldSave[] = []) {
    if(!Array.isArray(saved) || saved.length>16)throw new Error('Invalid worldmass field count');
    for(const row of saved) {
      if(!row.id || this.saved.has(row.id) || row.mendTimer!==undefined
        && (!Number.isFinite(row.mendTimer) || row.mendTimer<0)
        || row.boltTimer!==undefined && (!Number.isFinite(row.boltTimer) || row.boltTimer<0))
        throw new Error('Invalid worldmass field checkpoint');
      this.saved.set(row.id,{...row});
    }
  }
  admit(world: World, place: MassPlace, rows: readonly MassAltarSpec[], center: {x:number;y:number}, level: number): void {
    for(const row of rows) {
      const id=canonical([place.id,'altar',row.id]);
      if(this.live.has(id))continue;
      const offset=siteOffset(place,row.x,row.y);
      const altar:Altar={pos:{x:center.x+offset.x,y:center.y+offset.y},def:row.def,
        massSource:id, level, affected:new Set<number>()};
      const saved=this.saved.get(id);
      if(saved?.mendTimer!==undefined && row.def.mend)
        altar.mendTimer=Math.min(saved.mendTimer,row.def.mend.every);
      if(saved?.boltTimer!==undefined && row.def.bolts)
        altar.boltTimer=Math.min(saved.boltTimer,1/row.def.bolts.ratePerSec);
      this.live.set(id,altar);world.altars.push(altar);
    }
  }
  restoreAdmitted(world: World, places: readonly MassPlace[],
    resolve: (p:MassPlace)=>{rows:readonly MassAltarSpec[];center:{x:number;y:number};level:number}): void {
    const known=new Set<string>();
    for(const place of places) {
      const {rows,center,level}=resolve(place);
      for(const row of rows) {
        const id=canonical([place.id,'altar',row.id]);known.add(id);
        if(this.saved.has(id))this.admit(world,place,[row],center,level);
      }
    }
    if([...this.saved.keys()].some(id=>!known.has(id)))throw new Error('Unknown saved worldmass field');
  }
  snapshot(): MassFieldSave[] {
    return [...this.live].map(([id,a])=>({id,...(a.mendTimer!==undefined?{mendTimer:Math.max(0,a.mendTimer)}:{}),
      ...(a.boltTimer!==undefined?{boltTimer:Math.max(0,a.boltTimer)}:{})}))
      .sort((a,b)=>a.id.localeCompare(b.id));
  }
}
