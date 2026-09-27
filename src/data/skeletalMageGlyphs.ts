import type { GlyphDef } from '../render/vis/parts';

/** Scholar equipment in the shared vector grammar: +X forward, radius units.
 * Geometry and palette roles are reusable; none of these parts own gameplay. */
export const SKELETAL_MAGE_GLYPHS: Record<string, GlyphDef> = {
  scholarMantle: { ops: [
    { kind: 'poly', pts: [[.43,-.54],[.09,-.78],[-.45,-.69],[-1.19,-.51],[-.94,-.2],[-1.29,0],[-.98,.2],[-1.13,.61],[-.37,.72],[.4,.53]], role: 'cloth', shade: -.23, outline: true },
    { kind: 'poly', pts: [[.25,-.49],[-.25,-.58],[-.89,-.41],[-.66,-.12],[-.13,-.16]], role: 'base', shade: -.12, mirror: true },
    { kind: 'path', pts: [[-.96,-.46],[-.47,-.57],[.22,-.49]], role: 'accent', wR: .055, mirror: true },
  ] },
  cinderCowl: { ops: [
    { kind: 'poly', pts: [[.14,-.4],[.01,-.89],[-.23,-.67],[-.45,-1.05],[-.61,-.58],[-.71,-.27],[-.73,.27],[-.61,.58],[-.45,1.05],[-.23,.67],[.01,.89],[.14,.4]], role: 'cloth', shade: -.35, outline: true },
    { kind: 'path', pts: [[-.12,-.58],[-.35,-.48],[-.53,-.15]], role: 'glow', wR: .065, mirror: true },
  ] },
  brazierFocus: { ops: [
    { kind: 'path', pts: [[-1.22,0],[.7,0]], role: 'wood', wR: .13 },
    { kind: 'poly', pts: [[.39,-.14],[.79,-.4],[.87,-.35],[.69,0],[.87,.35],[.79,.4],[.39,.14]], role: 'metal', shade: -.2, outline: true },
    { kind: 'path', pts: [[.48,-.3],[.48,.3]], role: 'bone', wR: .08 },
  ] },
  rimeFocus: { ops: [
    { kind: 'path', pts: [[-1.04,0],[.63,0]], role: 'metal', wR: .1 },
    { kind: 'poly', pts: [[1.5,0],[.78,-.27],[.45,0],[.78,.27]], role: 'base', outline: true },
    { kind: 'poly', pts: [[1.5,0],[.78,-.27],[.65,0]], role: 'glow' },
    { kind: 'poly', pts: [[.86,-.17],[.7,-.54],[.47,-.35],[.54,-.06]], role: 'accent', mirror: true, outline: true },
    { kind: 'path', pts: [[.17,-.18],[.17,.18]], role: 'bone', wR: .07 },
  ] },
  stormYoke: { ops: [
    { kind: 'poly', pts: [[-.42,-.47],[-.1,-.86],[.53,-1.07],[.72,-.92],[.13,-.67],[.04,-.43]], role: 'metal', shade: -.1, mirror: true, outline: true },
    { kind: 'path', pts: [[-.2,-.51],[.04,-.73],[.52,-.93]], role: 'glow', wR: .055, mirror: true },
  ] },
  conductorFocus: { ops: [
    { kind: 'path', pts: [[-1.06,0],[.48,0]], role: 'metal', wR: .11 },
    { kind: 'path', pts: [[.41,0],[.78,-.32],[1.13,-.31],[.87,-.13]], role: 'metal', wR: .13, mirror: true },
    { kind: 'poly', pts: [[.96,0],[.7,-.14],[.45,0],[.7,.14]], role: 'glow', outline: true },
    ...[-.65,-.4,-.15].map(x => ({ kind: 'path' as const, pts: [[x,-.12],[x,.12]] as [number,number][], role: 'base' as const, wR: .08 })),
  ] },
  conductorArc: { ops: [
    { kind: 'path', pts: [[.91,-.26],[1.07,-.13],[.91,0],[1.05,.12],[.91,.26]], role: 'glow', wR: .045, alpha: .85,
      sway: { ax: .035, ay: .035, freq: 8 } },
  ] },
  retortCrook: { ops: [
    { kind: 'path', pts: [[-1.1,0],[.38,0],[.76,-.22],[1.09,-.1],[1.13,.22],[.93,.36]], smooth: true, role: 'wood', wR: .14 },
    { kind: 'path', pts: [[.92,.22],[.67,.22]], role: 'metal', wR: .055 },
    { kind: 'poly', pts: [[.73,.1],[.57,.1],[.48,-.02],[.14,.01],[.02,.2],[.1,.42],[.47,.44],[.57,.33],[.73,.33]], role: 'base', smooth: true, outline: true },
    { kind: 'poly', pts: [[.4,.06],[.22,.08],[.14,.23],[.23,.34],[.4,.31]], role: 'glow', smooth: true, alpha: .75 },
  ] },
  scholarVials: { ops: [
    ...[-.24,.24].flatMap(y => [
      { kind: 'poly' as const, pts: [[.36,y-.09],[.12,y-.09],[.02,y-.16],[-.39,y-.16],[-.53,y],[-.39,y+.16],[.02,y+.16],[.12,y+.09],[.36,y+.09]] as [number,number][], role: 'base' as const, outline: true },
      { kind: 'path' as const, pts: [[-.35,y],[0,y]] as [number,number][], role: 'glow' as const, wR: .08 },
      { kind: 'path' as const, pts: [[.3,y-.12],[.3,y+.12]] as [number,number][], role: 'wood' as const, wR: .1 },
    ]),
  ] },
  plagueBeak: { ops: [
    { kind: 'poly', pts: [[-.26,-.31],[.35,-.18],[.85,0],[.35,.18],[-.26,.31],[-.06,0]], role: 'bone', shade: -.1, outline: true },
    { kind: 'path', pts: [[.12,0],[.71,0]], role: 'dark', wR: .05 },
    { kind: 'disc', x: .08, y: -.18, rx: .05, role: 'dark', mirror: true },
  ] },
  regentMantle: { ops: [
    { kind: 'poly', pts: [[.5,-.71],[.05,-1.06],[-.65,-1.18],[-.59,-.72],[-1.3,-.76],[-1.06,-.23],[-1.38,0],[-1.06,.23],[-1.3,.76],[-.59,.72],[-.65,1.18],[.05,1.06],[.5,.71]], role: 'cloth', shade: -.32, outline: true },
    { kind: 'poly', pts: [[.18,-.64],[-.15,-.78],[-.81,-.55],[-.88,-.19],[-.43,-.29]], role: 'base', shade: -.08, mirror: true },
    { kind: 'path', pts: [[.4,-.69],[-.1,-.89],[-.48,-.89]], role: 'bone', wR: .09, mirror: true },
    { kind: 'path', pts: [[-.98,-.62],[-.73,-.41],[-1.08,-.02]], role: 'accent', wR: .05, mirror: true },
  ] },
  ossuaryDiadem: { ops: [
    { kind: 'poly', pts: [[-.35,-.58],[.18,-.77],[.03,-.43],[.49,-.47],[.27,-.2],[.69,0],[.27,.2],[.49,.47],[.03,.43],[.18,.77],[-.35,.58],[-.11,0]], role: 'bone', outline: true },
    { kind: 'poly', pts: [[.32,0],[.09,-.13],[-.06,0],[.09,.13]], role: 'glow', outline: true },
    { kind: 'path', pts: [[-.18,-.47],[-.02,-.31]], role: 'dark', wR: .045, mirror: true },
  ] },
};
