import type { GlyphDef } from '../render/vis/parts';

/** Longlimb anatomy in body-radius units, +X forward. Single-sided limbs,
 * crests and fins mirror through the ordinary placement grammar. */
export const STALKER_GLYPHS: Record<string, GlyphDef> = {
  longlimbTrunk: { ops: [
    { kind: 'poly', pts: [[.68,0],[.41,-.45],[-.03,-.42],[-.4,-.21],[-.89,-.36],[-1.05,0],[-.89,.36],[-.4,.21],[-.03,.42],[.41,.45]], smooth: true, outline: true },
    { kind: 'poly', pts: [[.47,0],[.17,-.24],[-.38,-.1],[-.88,0],[-.38,.1],[.17,.24]], smooth: true, shade: .25 },
    { kind: 'path', pts: [[.14,-.33],[-.18,-.25],[-.39,-.17]], shade: -.35, wR: .065, mirror: true },
  ] },
  stiltHindleg: { ops: [
    { kind: 'poly', pts: [[.18,-.05],[.09,-.38],[-.37,-.69],[-.27,-1.22],[.18,-1.42],[-.17,-1.41],[-.38,-1.55],[-.4,-1.3],[-.57,-.7],[-.18,-.22]], outline: true },
    { kind: 'path', pts: [[-.04,-.25],[-.44,-.71],[-.34,-1.22]], shade: .29, wR: .075 },
    { kind: 'path', pts: [[-.3,-1.31],[-.12,-1.38]], role: 'bone', wR: .055 },
  ] },
  bladeForelimb: { ops: [
    { kind: 'poly', pts: [[-.14,-.02],[.12,-.08],[.26,-.55],[.84,-.86],[1.07,-.68],[1.02,-1.08],[.84,-1.23],[.21,-.8],[-.13,-.48]], outline: true },
    { kind: 'path', pts: [[.01,-.2],[.11,-.61],[.71,-.99]], shade: .28, wR: .08 },
    { kind: 'poly', pts: [[.83,-.99],[1.07,-.68],[1.02,-1.08],[.87,-1.19]], role: 'bone', shade: -.1 },
    { kind: 'poly', pts: [[.83,-.85],[.84,-.59],[.68,-.79]], role: 'bone', shade: -.25 },
  ] },
  knuckleForelimb: { ops: [
    { kind: 'poly', pts: [[-.25,-.05],[.14,-.12],[.27,-.54],[.63,-.72],[.66,-1.03],[.4,-1.17],[.08,-.91],[-.19,-.7]], smooth: true, outline: true },
    { kind: 'poly', pts: [[-.08,-.2],[.05,-.6],[.35,-.8],[.32,-.98],[.1,-.85],[-.08,-.64]], shade: .22, smooth: true },
    { kind: 'poly', pts: [[.38,-.89],[.68,-.89],[.78,-1.07],[.57,-.99]], role: 'bone' },
    { kind: 'poly', pts: [[.21,-1.03],[.46,-1.06],[.49,-1.29],[.31,-1.14]], role: 'bone' },
  ] },
  wedgeSkull: { ops: [
    { kind: 'poly', pts: [[-.43,-.3],[-.01,-.37],[.29,-.21],[.69,0],[.29,.21],[-.01,.37],[-.43,.3],[-.26,0]], outline: true },
    { kind: 'poly', pts: [[-.23,0],[.05,-.2],[.53,0],[.05,.2]], shade: .28 },
    { kind: 'poly', pts: [[-.08,-.24],[.32,-.14],[.13,-.03]], role: 'dark', mirror: true },
    { kind: 'path', pts: [[.01,-.18],[.2,-.12]], role: 'bone', wR: .05, mirror: true },
    { kind: 'path', pts: [[.43,-.065],[.57,0],[.43,.065]], shade: -.45, wR: .05 },
  ] },
  forkedCrest: { ops: [
    { kind: 'poly', pts: [[-.21,-.12],[.13,-.1],[.32,-.56],[.59,-.85],[.24,-.73],[-.06,-.3],[-.27,-.63],[-.32,-.35]], outline: true },
    { kind: 'path', pts: [[.01,-.21],[.25,-.61],[.45,-.78]], shade: .35, wR: .06 },
  ] },
  whipTail: { ops: [
    { kind: 'poly', pts: [[.17,-.18],[-.33,-.27],[-.73,-.06],[-.94,.37],[-1.26,.44],[-1.42,.23],[-1.34,.58],[-.92,.57],[-.57,.13],[-.23,.1],[.17,.17]], smooth: true, outline: true },
    { kind: 'path', pts: [[-.07,-.07],[-.45,-.09],[-.79,.24],[-1.03,.45]], smooth: true, shade: .3, wR: .065 },
  ] },
  veilFin: { ops: [
    { kind: 'poly', pts: [[.59,-.17],[.21,-.78],[-.15,-1.15],[-.12,-.66],[-.55,-.94],[-.41,-.4],[-1.11,-.62],[-.73,-.07],[-.06,-.22]], role: 'cloth', shade: .05, alpha: .7, outline: true },
    { kind: 'path', pts: [[.45,-.2],[-.15,-1.15]], role: 'glow', alpha: .75, wR: .045 },
    { kind: 'path', pts: [[.17,-.23],[-.55,-.94]], role: 'glow', alpha: .7, wR: .045 },
    { kind: 'path', pts: [[-.11,-.2],[-1.11,-.62]], role: 'glow', alpha: .65, wR: .045 },
  ] },
  dorsalScutes: { ops: [
    { kind: 'poly', pts: [[.45,0],[.12,-.3],[-.07,-.51],[-.09,-.19],[-.53,-.42],[-.38,-.1],[-.93,-.26],[-.64,0],[-.93,.26],[-.38,.1],[-.53,.42],[-.09,.19],[-.07,.51],[.12,.3]], outline: true, shade: -.22 },
    { kind: 'path', pts: [[.21,0],[-.11,-.1],[-.09,0],[-.46,-.08],[-.39,0],[-.76,0]], shade: .3, wR: .07 },
  ] },
};
