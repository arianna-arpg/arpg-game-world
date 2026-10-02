import type { Altar, World } from '../engine/world';
import { ALTARS, type AltarDef } from '../data/shrines';
import { STAT_DEFS } from '../engine/stats';
import { SKILLS } from '../data/skills';
import type { MassPlace } from './contracts';
import { canonical } from './random';
import { siteOffset } from './sites';

export interface MassAltarSpec { id: string; source: string; x: number; y: number; def: AltarDef }
export interface MassFieldSave { id: string; mendTimer?: number; boltTimer?: number; resident?: boolean; place?: { id: string; center: import('./address').MassAddress } }
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
export interface MassFieldResidency { source: string; retainRadius: number; maxResident: number }
export function validateMassFieldResidency(spec: MassFieldResidency, populationRadius: number): void {
  if (!spec || typeof spec!=='object' || typeof spec.source!=='string' || !spec.source || !Number.isFinite(spec.retainRadius) || spec.retainRadius < populationRadius + 512
    || spec.retainRadius > 8192 || !Number.isSafeInteger(spec.maxResident)
    || spec.maxResident < 1 || spec.maxResident > 128) throw Error('Invalid worldmass field residency');
}
type FieldOwner = { id: string; center: import('./address').MassAddress };
type FieldContext = { rows: readonly MassAltarSpec[]; center: {x:number;y:number}; level: number };
const fieldId = (place: Pick<MassPlace,'id'>, row: MassAltarSpec) => canonical([place.id,'altar',row.id]);

/** Removing geographic fields must not silently rename the remaining ordinary
 * array-index sources. Move their existing modifiers before the next native tick. */
function detachFields(world: World, removed: Set<Altar>): void {
  const remaining = world.altars.filter(a=>!removed.has(a));
  const rekey: { actor: (typeof world.actors)[number]; source: string; mods: NonNullable<ReturnType<(typeof world.actors)[number]['sheet']['getSourceMods']>> }[] = [];
  world.altars.forEach((altar,index)=>{
    const next=remaining.indexOf(altar);
    if (!removed.has(altar) && (altar.massSource || next===index)) return;
    const source='altar:'+(altar.massSource??index);
    for(const actor of world.actors){
      const mods=actor.sheet.getSourceMods(source);
      if(next>=0&&mods)rekey.push({actor,source:'altar:'+next,mods});
      actor.sheet.removeSource(source);
    }
    if(removed.has(altar))altar.affected.clear();
  });
  world.altars=remaining;
  for(const row of rekey)row.actor.sheet.setSource(row.source,row.mods);
}

/** Optional residency freezes only an unoccupied field's remaining cadence.
 * Already emitted native attacks keep their own lifetimes and source actors.
 * Legacy finite expeditions retain their original always-resident policy. */
export class MassFields {
  private live = new Map<string, Altar>();
  private saved = new Map<string, MassFieldSave>();
  private owners = new Map<string, FieldOwner>();
  constructor(saved: readonly MassFieldSave[] = [], readonly policy?: MassFieldResidency) {
    if(!Array.isArray(saved) || !policy && saved.length>16)throw new Error('Invalid worldmass field count');
    for(const row of saved) {
      if(!row || typeof row!=='object' || typeof row.id!=='string' || !row.id || this.saved.has(row.id)
        || row.resident!==undefined && (!policy || typeof row.resident!=='boolean') || row.mendTimer!==undefined
        && (!Number.isFinite(row.mendTimer) || row.mendTimer<0)
        || row.boltTimer!==undefined && (!Number.isFinite(row.boltTimer) || row.boltTimer<0)
        || row.place!==undefined && (!policy || !row.place || typeof row.place!=='object' || typeof row.place.id!=='string' || !row.place.id || !row.place.center))
        throw new Error('Invalid worldmass field checkpoint');
      this.saved.set(row.id,JSON.parse(canonical(row)));
    }
  }
  private needed(world: World, pos: {x:number;y:number}, radius: number): boolean {
    if(!this.policy)return true;
    if(Math.hypot(world.player.pos.x-pos.x,world.player.pos.y-pos.y)<=this.policy.retainRadius)return true;
    return world.actors.some(a=>!a.dead && Math.hypot(a.pos.x-pos.x,a.pos.y-pos.y)<=radius+a.radius+128);
  }
  canAdmit(place: Pick<MassPlace,'id'>, rows: readonly MassAltarSpec[]): boolean {
    return !this.policy || this.live.size+rows.filter(row=>!this.live.has(fieldId(place,row))).length<=this.policy.maxResident;
  }
  private remember(id: string, altar: Altar): MassFieldSave {
    const owner=this.owners.get(id);
    return {id,...(owner?{resident:true,place:{id:owner.id,center:{...owner.center}}}:{}),
      ...(altar.mendTimer!==undefined?{mendTimer:Math.max(0,altar.mendTimer)}:{}),
      ...(altar.boltTimer!==undefined?{boltTimer:Math.max(0,altar.boltTimer)}:{})};
  }
  sync(world: World): void {
    if(!this.policy)return;
    const removed=new Set<Altar>();
    for(const [id,altar] of this.live){
      if(this.needed(world,altar.pos,altar.def.radius))continue;
      this.saved.set(id,{...this.remember(id,altar),resident:false});this.live.delete(id);removed.add(altar);
    }
    if(removed.size)detachFields(world,removed);
  }
  admit(world: World, place: MassPlace, rows: readonly MassAltarSpec[], center: {x:number;y:number}, level: number): void {
    if(!this.canAdmit(place,rows))throw Error('Worldmass field capacity must be reserved before its encounter');
    for(const row of rows) {
      const id=fieldId(place,row);
      if(this.live.has(id))continue;
      const offset=siteOffset(place,row.x,row.y);
      const altar:Altar={pos:{x:center.x+offset.x,y:center.y+offset.y},def:row.def,
        massSource:id, level, affected:new Set<number>()};
      const saved=this.saved.get(id);
      if(saved?.mendTimer!==undefined && row.def.mend)
        altar.mendTimer=Math.min(saved.mendTimer,row.def.mend.every);
      if(saved?.boltTimer!==undefined && row.def.bolts)
        altar.boltTimer=Math.min(saved.boltTimer,1/row.def.bolts.ratePerSec);
      if(this.policy)this.owners.set(id,{id:place.id,center:{...place.center}});
      this.live.set(id,altar);world.altars.push(altar);
    }
  }
  restoreAdmitted(world: World, places: readonly MassPlace[], resolve: (p:MassPlace)=>FieldContext,
    locate?: (owner: FieldOwner)=>MassPlace | undefined): void {
    const owners=new Map<string,MassPlace>();
    for(const place of places)for(const row of resolve(place).rows)owners.set(fieldId(place,row),place);
    for(const saved of this.saved.values()){
      const place=saved.place?locate?.(saved.place):owners.get(saved.id);
      if(!place)throw new Error('Unknown saved worldmass field');
      const {rows,center,level}=resolve(place),row=rows.find(row=>fieldId(place,row)===saved.id);
      if(!row)throw new Error('Unknown saved worldmass field');
      if(this.policy)this.owners.set(saved.id,{id:place.id,center:{...place.center}});
      const offset=siteOffset(place,row.x,row.y),pos={x:center.x+offset.x,y:center.y+offset.y};
      if(saved.resident!==false && this.needed(world,pos,row.def.radius))this.admit(world,place,[row],center,level);
    }
  }
  snapshot(): MassFieldSave[] {
    const result=new Map(this.saved);
    for(const [id,altar] of this.live)result.set(id,this.remember(id,altar));
    return [...result.values()].map(row=>JSON.parse(canonical(row)) as MassFieldSave)
      .sort((a,b)=>a.id.localeCompare(b.id));
  }
  get residentCount(): number { return this.live.size; }
}
