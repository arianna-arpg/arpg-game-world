import type { GlyphDef } from '../render/vis/parts';

/** Reusable burial equipment and spirit anatomy. +X faces forward; all
 * geometry is in body-radius units and uses the shared palette/motion grammar. */
export const UNDEAD_COURT_GLYPHS: Record<string, GlyphDef> = {
  ossuaryPavise: { ops: [
    { kind: 'poly', pts: [[.82,-.3],[.98,0],[.82,.3],[-.71,.37],[-1.05,0],[-.71,-.37]], role: 'metal', shade: -.23, outline: true },
    { kind: 'poly', pts: [[.72,-.21],[.84,0],[.72,.21],[-.62,.26],[-.84,0],[-.62,-.26]], role: 'cloth', shade: -.18, outline: true },
    { kind: 'path', pts: [[-.72,0],[.74,0]], role: 'bone', wR: .1 },
    ...[-.4,-.12,.16,.44].map(x => ({ kind: 'path' as const, pts: [[x-.12,-.2],[x,0],[x-.12,.2]] as [number,number][], role: 'bone' as const, wR: .065 })),
    { kind: 'disc', rx: .16, ry: .13, role: 'metal', shade: .27, outline: true },
  ] },
  duelingSaber: { ops: [
    { kind: 'path', pts: [[-.59,0],[-.18,0]], role: 'bone', wR: .13 },
    { kind: 'poly', pts: [[-.17,-.13],[.47,-.12],[1.18,-.4],[.97,-.01],[.52,.12],[-.17,.12]], role: 'metal', outline: true },
    { kind: 'path', pts: [[-.07,-.05],[.47,-.05],[1.05,-.3]], role: 'bone', shade: .25, wR: .055 },
    { kind: 'path', pts: [[-.24,-.26],[-.13,0],[-.24,.26]], role: 'metal', shade: .16, wR: .1 },
  ] },
  burialHarness: { ops: [
    { kind: 'path', pts: [[.45,-.6],[.11,-.35],[-.33,.14],[-.67,.54]], role: 'dark', wR: .25 },
    { kind: 'path', pts: [[.45,-.6],[.11,-.35],[-.33,.14],[-.67,.54]], role: 'cloth', shade: -.35, wR: .17 },
    { kind: 'path', pts: [[-.55,-.59],[-.56,-.12],[-.45,.31],[-.29,.65]], role: 'dark', wR: .09, smooth: true },
    ...[-.4,-.16,.08,.32,.51].map((y,i) => ({ kind: 'path' as const, pts: [[-.66+i*.035,y],[-.43+i*.035,y-.035]] as [number,number][], role: 'bone' as const, wR: .055 })),
    { kind: 'ring', x: -.09, y: -.13, rx: .14, ry: .14, role: 'metal', wR: .07 },
  ] },
  frenziedJaw: { ops: [
    { kind: 'poly', pts: [[-.47,-.52],[.02,-.63],[.53,-.46],[.68,-.18],[.43,-.19],[.29,-.35],[-.05,-.39],[-.37,-.34]], role: 'bone', outline: true, mirror: true },
    { kind: 'poly', pts: [[.27,-.39],[.51,-.2],[.17,-.21]], role: 'bone', shade: .23, mirror: true },
  ] },
  vigilCage: { ops: [
    { kind: 'poly', pts: [[.56,-.52],[.05,-1.06],[-.58,-.63],[-1.03,-.23],[-.56,-.31],[-.12,-.73],[.36,-.4]], role: 'metal', shade: -.16, outline: true, mirror: true },
    { kind: 'path', pts: [[.47,-.48],[.03,-.91],[-.49,-.51],[-.81,-.3]], role: 'bone', wR: .08, mirror: true },
    { kind: 'poly', pts: [[-.52,-.48],[-.66,0],[-.52,.48],[-.29,.36],[-.38,0],[-.29,-.36]], role: 'metal', outline: true },
    { kind: 'path', pts: [[-.43,-.47],[-.22,-.66],[.15,-.64],[.39,-.42]], role: 'metal', wR: .085, mirror: true },
  ] },
  hexVeil: { ops: [
    { kind: 'poly', pts: [[.58,-.37],[.25,-.89],[-.39,-1.1],[-.72,-.88],[-.47,-.6],[-1.35,-.37],[-1.1,-.03],[-1.46,.26],[-.51,.51],[-.24,1.03],[.23,.85],[.54,.37]], role: 'cloth', shade: -.31, outline: true },
    { kind: 'poly', pts: [[.24,-.49],[-.27,-.72],[-.43,-.49],[-1.04,-.27],[-.75,.1],[-.18,.48],[.28,.36]], role: 'base', shade: -.12 },
    { kind: 'path', pts: [[.16,-.67],[-.22,-.84],[-.43,-.79]], role: 'accent', wR: .07, mirror: true },
    { kind: 'path', pts: [[-.28,-.46],[-.65,-.16],[-.38,.14],[-.05,-.14],[-.28,-.46]], role: 'glow', alpha: .65, wR: .045 },
    { kind: 'path', pts: [[-.76,.13],[-.99,.31],[-.61,.37]], role: 'glow', alpha: .65, wR: .045 },
  ] },
  hexSpindle: { ops: [
    { kind: 'poly', pts: [[.38,0],[0,-.24],[-.38,0],[0,.24]], role: 'glow', outline: true,
      sway: { ax: .045, ay: .065, freq: 1.8 } },
    { kind: 'path', pts: [[-.32,-.36],[-.51,0],[-.27,.36]], role: 'accent', wR: .06,
      sway: { ax: .045, ay: .065, freq: 1.8 } },
  ] },
  reapingMantle: { ops: [
    { kind: 'poly', pts: [[.33,-.39],[-.09,-.73],[-.58,-.45],[-1.56,-.7],[-1.13,-.19],[-1.75,.19],[-.94,.26],[-1.31,.73],[-.51,.55],[-.1,.73],[.38,.38]], role: 'cloth', shade: -.37, outline: true },
    { kind: 'poly', pts: [[.14,-.36],[-.29,-.45],[-1.09,-.46],[-.69,-.13],[-1.22,.16],[-.41,.19],[-.05,.44],[.24,.25]], role: 'base', alpha: .7 },
    { kind: 'path', pts: [[-.3,-.36],[-.77,-.28],[-1.03,-.34]], role: 'glow', alpha: .6, wR: .06 },
  ] },
  soulScythe: { ops: [
    { kind: 'path', pts: [[-1.04,0],[1.02,0]], role: 'bone', shade: -.2, wR: .13 },
    { kind: 'poly', pts: [[.7,-.12],[.95,-.53],[1.2,-.33],[1.28,.26],[1.12,.83],[.72,1.48],[.78,.9],[.93,.29],[.84,-.02]], role: 'metal', outline: true },
    { kind: 'path', pts: [[1.05,-.36],[1.16,.23],[1.01,.79],[.74,1.4]], role: 'glow', wR: .07, smooth: true },
    { kind: 'path', pts: [[-.45,-.13],[-.45,.13]], role: 'metal', wR: .1 },
    { kind: 'disc', x: .85, rx: .11, ry: .11, role: 'glow' },
  ] },
};
