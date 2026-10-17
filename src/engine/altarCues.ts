import type { Actor } from './actor';
import type { Altar } from './world';

export interface AltarInfluence { source: string; color: string; x: number; y: number }
/** Read the native membership ledger, never a second radius test. Only persistent
 * modifier fields use this cue; a healing pulse already has its measured transfer.
 * A granted source is not a claim that every conditional modifier currently wins. */
export function altarInfluences(a: Actor, altars: readonly Altar[]): AltarInfluence[] {
  if (a.dead) return [];
  return altars.flatMap((al,i) => {
    const source='altar:'+(al.massSource??i);
    return al.def.influenceCue!==false && al.def.mods.length>0
      && al.affected.has(a.id) && a.tier===(al.tier??0) && a.sheet.hasSource(source)
      ? [{source,color:al.def.color,x:al.pos.x,y:al.pos.y}] : [];
  });
}
