import type { GlyphDef } from '../render/vis/parts';

/** Spider anatomy and silk structures, in body-radius units with +X forward.
 * Single-sided limbs/fangs mirror through the ordinary placement grammar. */
export const ARACHNID_GLYPHS: Record<string, GlyphDef> = {
  arachnidLeg: { ops: [
    { kind: 'poly', pts: [[-.12,.07],[.13,-.05],[.4,-.53],[.29,-1.01],[.64,-1.5],[.39,-1.37],[.14,-1.02],[.21,-.57]], outline: true },
    { kind: 'path', pts: [[.02,-.1],[.29,-.55],[.22,-.98]], shade: .3, wR: .06 },
    { kind: 'disc', x: .3, y: -.56, rx: .105, ry: .09, shade: .16 },
  ] },
  bracedSpiderLeg: { ops: [
    { kind: 'poly', pts: [[-.17,.07],[.2,-.08],[.48,-.58],[.34,-1.03],[.63,-1.42],[.39,-1.35],[.12,-1.02],[.22,-.6]], outline: true },
    { kind: 'path', pts: [[.02,-.08],[.33,-.59],[.22,-1]], shade: .28, wR: .1 },
    { kind: 'poly', pts: [[.38,-.45],[.58,-.51],[.39,-.69]], shade: -.25 },
  ] },
  spiderThorax: { ops: [
    { kind: 'poly', pts: [[.53,0],[.36,-.4],[-.1,-.48],[-.44,-.24],[-.48,0],[-.44,.24],[-.1,.48],[.36,.4]], smooth: true, outline: true },
    { kind: 'poly', pts: [[.34,0],[.2,-.22],[-.19,-.26],[-.31,0],[-.19,.26],[.2,.22]], smooth: true, shade: .28 },
    { kind: 'path', pts: [[.18,0],[-.22,0]], shade: -.3, wR: .065 },
  ] },
  pearAbdomen: { ops: [
    { kind: 'poly', pts: [[.6,0],[.39,-.36],[-.21,-.64],[-.68,-.48],[-.87,0],[-.68,.48],[-.21,.64],[.39,.36]], smooth: true, outline: true },
    { kind: 'poly', pts: [[.34,0],[.02,-.33],[-.42,-.39],[-.67,-.09],[-.28,.19]], smooth: true, shade: .22 },
    { kind: 'path', pts: [[.22,-.25],[-.08,-.16],[-.47,-.4]], smooth: true, role: 'cloth', shade: -.23, wR: .09, mirror: true },
  ] },
  orbAbdomen: { ops: [
    { kind: 'disc', rx: .82, ry: .78, outline: true },
    { kind: 'disc', x: .13, y: -.13, rx: .56, ry: .5, shade: .19 },
    { kind: 'poly', pts: [[.67,0],[.21,-.18],[-.06,-.53],[-.38,-.35],[-.57,0],[-.38,.35],[-.06,.53],[.21,.18]], role: 'cloth', shade: -.34, smooth: true },
  ] },
  dorsalChevron: { ops: [
    { kind: 'path', pts: [[.32,-.32],[.03,0],[.32,.32]], role: 'bone', wR: .14 },
    { kind: 'path', pts: [[-.09,-.39],[-.39,0],[-.09,.39]], role: 'bone', wR: .1 },
  ] },
  spiderFangs: { ops: [
    { kind: 'poly', pts: [[-.19,-.08],[.12,-.05],[.39,-.24],[.55,-.12],[.44,-.42],[.17,-.47],[-.12,-.3]], smooth: true, outline: true },
    { kind: 'poly', pts: [[.36,-.31],[.55,-.12],[.44,-.42],[.29,-.43]], role: 'bone' },
  ] },
  spinneretFan: { ops: [
    { kind: 'poly', pts: [[.16,-.17],[-.22,-.3],[-.52,-.24],[-.25,-.13],[.03,0]], outline: true, mirror: true },
    { kind: 'path', pts: [[-.22,-.23],[-.45,-.27]], role: 'bone', wR: .07, mirror: true },
  ] },
  silkBrood: { ops: [
    { kind: 'disc', x: -.23, y: -.28, rx: .28, ry: .26, role: 'bone', shade: -.15, outline: true, mirror: true },
    { kind: 'disc', x: .2, rx: .31, ry: .32, role: 'bone', outline: true },
    { kind: 'disc', x: -.2, y: -.32, rx: .13, ry: .11, role: 'bone', shade: .3, mirror: true },
    { kind: 'path', pts: [[-.53,-.07],[.12,-.37],[.43,0],[.12,.37],[-.53,.07]], role: 'cloth', wR: .07 },
  ] },
  widowMark: { ops: [
    { kind: 'poly', pts: [[.4,-.31],[.4,.31],[0,.08],[-.36,.31],[-.36,-.31],[0,-.08]] },
    { kind: 'path', pts: [[.28,-.16],[.06,0],[-.22,-.15]], shade: .32, wR: .055 },
  ] },
  silkCradle: { ops: [
    { kind: 'poly', pts: [[.86,-.24],[.47,-.75],[-.26,-.84],[-.87,-.3],[-.72,.48],[-.15,.81],[.59,.62]], smooth: true, role: 'cloth', shade: -.4, outline: true },
    { kind: 'ring', rx: .72, ry: .62, role: 'bone', shade: -.2, wR: .12 },
    { kind: 'path', pts: [[.77,-.22],[-.64,.24],[.48,.56],[-.28,-.7],[.09,.67],[.7,-.38]], role: 'bone', wR: .055 },
  ] },
  silkAnchors: { ops: [
    { kind: 'path', pts: [[-.29,-.47],[-1.29,-1.06],[-.7,-.23],[-1.53,.23],[-.56,.35],[-.92,1.21],[.14,.61],[.65,1.25],[.52,.07],[1.41,.37],[.58,-.27],[.92,-1.1],[.08,-.57],[-.17,-1.41],[-.29,-.47]], role: 'bone', shade: -.18, wR: .05, closed: true },
    { kind: 'path', pts: [[-.96,-.89],[-.72,-.59],[-.95,-.05],[-.58,.66],[.28,.87],[.93,.22],[.74,-.55],[.18,-.84],[-.16,-1.05]], smooth: true, role: 'bone', alpha: .65, wR: .04 },
  ] },
};
