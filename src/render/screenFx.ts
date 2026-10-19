// ---------------------------------------------------------------------------
// STATUS → SCREEN-FX registry — a full-screen visual per ailment, as data.
//
// When the player is afflicted, the renderer draws an EDGE-hugging overlay so
// you know at a glance what's on you: a pulsing coloured vignette for DoTs, a
// frosty/snowflake wash when chilled or frozen, circling stars when stunned.
//
// Extensible: StatusDef.screenCue selects/opts out of an independent layer;
// statusPresentation pairs icons and screen cues through the same live-debuff
// rule. DoTs keep their material fallback; other debuffs inherit a soft edge.
// Specialized control cues remain intact. The vignette channel dispatches
// material layers in afflictionEdge.ts; blessings remain quiet.
// ---------------------------------------------------------------------------

import { STATUS_DEFS, type ActiveStatus } from '../engine/status';

import {activeDebuffs,statusPresentation,type ScreenFxDef} from './statusPresentation';
export {STATUS_FX_REGISTRY,type ScreenFxDef,type ScreenFxKind} from './statusPresentation';

export interface ActiveFx { id: string; def: ScreenFxDef; color: string; k: number; }

/** Shared empty result — the statusless frame (the overwhelming common case)
 *  allocates nothing. Callers never mutate collectActiveFx results. */
const EMPTY_FX: ActiveFx[] = [];

/** The screen effects to draw for the player's current statuses (combat only). */
export function collectActiveFx(statuses: ActiveStatus[]): ActiveFx[] {
  if (!statuses.length) return EMPTY_FX;
  let out: ActiveFx[] | null = null;
  const live=activeDebuffs(statuses),seen=new Set<string>();
  for(const s of live) {
    if(seen.has(s.id))continue;seen.add(s.id);
    const lanes=live.filter(lane=>lane.id===s.id);
    const presentation=statusPresentation({...s,dps:Math.max(...lanes.map(lane=>lane.dps)),screenDot:lanes.some(lane=>lane.screenDot)?true:undefined});
    const def=presentation?.screen;if(!def)continue;
    const cap=STATUS_DEFS[s.id]?.maxStacks??1;
    const k=def.stacksScale?Math.min(1,Math.max(...lanes.map(lane=>lane.stacks))/cap):1;
    (out??=[]).push({id:s.id,def,color:def.color??presentation!.color,k});
  }
  return out ?? EMPTY_FX;
}

/** The strongest live falter strength across the active fx (0 = none): each
 *  row's authored `falter` scaled by its k, so a climbing faintness ladder
 *  stutters harder as it climbs. The renderer's hold gate is the one reader. */
export function collectFalterK(fx: ActiveFx[]): number {
  let k = 0;
  for (const f of fx) if (f.def.falter) k = Math.max(k, f.def.falter * f.k);
  return k;
}
