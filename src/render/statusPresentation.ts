import {STATUS_DEFS,type ActiveStatus,type StatusDef} from '../engine/status';

export type ScreenFxKind = 'vignette' | 'frost' | 'stars' | 'pall' | 'darken' | 'spin' | 'framecage';

export interface ScreenFxDef {
  kind: ScreenFxKind;
  /** Shape family from AFFLICTION_MOTIFS; unknown families use a neutral notch. */
  motif?: string;
  /** Colour override; defaults to the status's STATUS_DEFS colour. */
  color?: string;
  /** 0..1 strength of the overlay. */
  intensity?: number;
  /** Scale strength by the status's CURRENT stack fraction (stacks/maxStacks)
   *  — a buildup ladder reads as pressure rising, not a binary flicker. */
  stacksScale?: true;
  /** THE FALTER — 0..1 strength of the DELIBERATE simulated stutter (scaled
   *  by this fx's live k like every other channel). While worn, the
   *  renderer HOLDS whole presented frames on a jittered cadence
   *  (VIS_CFG.statusFx.falter dials): the game itself seems to lag — a
   *  fake, bounded hitch, the vasovagal skip. THIS IS INTENDED BEHAVIOR,
   *  designed and documented (docs/render/falter.md), not a performance
   *  defect: a light-headed hero is MEANT to make the player doubt their
   *  frame rate for a beat. Presentation-only by construction — the sim,
   *  inputs and the co-op wire never falter — and settings.statusFalter is
   *  the player's off switch. Any status may wear it; it debuts on the
   *  faintness ladder. */
  falter?: number;
}


/** Shared visual vocabulary. Native status definitions own labels, colors,
 * timing and mechanics; this table pairs optional icon shapes and screen cues.
 * Missing entries inherit both presentations without an extra renderer branch. */
export const STATUS_PRESENTATION:Record<string,{glyph?:string;screen?:ScreenFxDef}>={
  burn: {screen:{ kind: 'vignette', intensity: 0.85, motif: 'fire' },glyph:"M12 3 Q15 9 18 11 Q22 19 12 21 Q3 20 6 12 L9 16 Q7 9 12 3 Z"},
  poison: {screen:{ kind: 'vignette', intensity: 0.7, motif: 'toxin' },glyph:"M12 3 Q9 9 6 13 Q2 21 12 21 Q22 21 18 13 Z M8 15 L10 17 M14 17 L16 15"},
  bleed: {screen:{ kind: 'vignette', intensity: 0.7, motif: 'wound' },glyph:"M9 3 L4 16 M15 4 L10 19 M21 6 L16 21"},
  shock: {screen:{ kind: 'vignette', intensity: 0.6 },glyph:"M14 2 L5 14 L11 14 L9 22 L20 9 L13 9 Z"},
  decay: {screen:{ kind: 'vignette', intensity: 0.6 }},
  chill: {screen:{ kind: 'frost', intensity: 0.55 },glyph:"M12 3 L12 21 M4 7 L20 17 M4 17 L20 7 M9 5 L12 8 L15 5 M9 19 L12 16 L15 19"},
  frozen: {screen:{ kind: 'frost', intensity: 1.0 },glyph:"M12 2 L21 12 L12 22 L3 12 Z M12 6 L12 18 M6 12 L18 12"},
  stun: {screen:{ kind: 'stars', intensity: 0.9 },glyph:"M5 7 Q13 2 19 8 Q23 17 12 16 Q5 15 11 10 Q16 7 16 12 M8 20 L16 20"},
  caroming: {screen:{ kind: 'framecage', intensity: 0.9 }},
  faintness: {screen:{ kind: 'pall', intensity: 0.55, stacksScale: true, falter: 0.55 }},
  swoon: {screen:{ kind: 'pall', intensity: 1.0, falter: 1 }},
  queasy: {screen:{ kind: 'vignette', intensity: 0.4, stacksScale: true }},
  retching: {screen:{ kind: 'vignette', intensity: 0.7 }},
  blind: {screen:{ kind: 'darken', intensity: 0.9 }},
  seen: {screen:{ kind: 'vignette', intensity: 0.4 }},
  disoriented: {screen:{ kind: 'vignette', intensity: 0.45, stacksScale: true }},
  widdershins: {screen:{ kind: 'spin', intensity: 0.9 }},
  addled: {screen:{ kind: 'vignette', intensity: 0.45 }},
  petrifying: {screen:{ kind: 'pall', color: '#8f8a80', intensity: 0.5, stacksScale: true }},
  petrified: {screen:{ kind: 'pall', color: '#b8b2a4', intensity: 0.9 }},
  harrowing: {screen:{ kind: 'pall', color: '#9a86c8', intensity: 0.45, stacksScale: true }},
  horrified: {screen:{ kind: 'pall', color: '#b8a4e8', intensity: 0.85 }},
  mired: {glyph:"M4 17 L20 17 M7 21 L17 21 M9 3 L9 10 L16 12 L17 15 L6 15 L6 12"},
  vulnerable: {glyph:"M5 4 L11 6 L9 12 L12 16 L9 21 L4 16 Z M14 6 L20 4 L21 16 L14 21 L16 15 L13 11 Z"},
  befuddlement: {glyph:"M8 7 Q8 2 14 3 Q20 4 17 9 L12 13 L12 16 M12 20 L12 21"},
};
/** Compatibility view for existing authored-screen-cue consumers. */
export const STATUS_FX_REGISTRY:Record<string,ScreenFxDef>=Object.fromEntries(
  Object.entries(STATUS_PRESENTATION).flatMap(([id,p])=>p.screen?[[id,p.screen]]:[]));

/** One admission rule shared by the icon/readout and screen effect paths. */
export function activeDebuffs(statuses:readonly ActiveStatus[]):ActiveStatus[] {
  return statuses.filter(s=>s.remaining>0 && s.stacks>0 && (!!STATUS_DEFS[s.id] || s.dps>0 || s.screenDot===true) && !STATUS_DEFS[s.id]?.beneficial);
}
export function statusPresentation(s:Pick<ActiveStatus,'id'> & Partial<Pick<ActiveStatus,'dps'|'screenDot'>>) {
  const status:Partial<StatusDef>=STATUS_DEFS[s.id]??{};
  if(status.beneficial || (!STATUS_DEFS[s.id] && !((s.dps??0)>0 || s.screenDot)))return;
  const view=STATUS_PRESENTATION[s.id],authored=status.screenCue;
  const damaging=!!(status.dotType || status.cullsAtLethal || (s.dps??0)>0 || s.screenDot);
  const screen:ScreenFxDef|undefined=authored===false?undefined:authored?{kind:'vignette',...authored}
    :view?.screen ?? (damaging?{kind:'vignette',intensity:.7,motif:status.cullsAtLethal?'doom':status.dotType==='fire'?'fire':'generic'}
      :{kind:'vignette',intensity:.5,motif:'soft'});
  return {id:s.id,label:status.label??s.id.replace(/_/g,' '),color:status.color??'#ffffff',glyph:view?.glyph,screen};
}
