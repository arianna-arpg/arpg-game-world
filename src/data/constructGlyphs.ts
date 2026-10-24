import type { GlyphDef } from '../render/vis/parts';

/** Reusable device anatomy in body-radius units, +X forward. Solid structures
 * bake once; source color lives in inlays rather than drowning the silhouette.
 * Original Hollow Wake vector work; no external assets or simulation state. */
export const CONSTRUCT_GLYPHS: Record<string, GlyphDef> = {
  devicePressurePlate: { ops: [
    { kind: 'poly', pts: [[-.7,-.5],[.7,-.5],[.85,0],[.7,.5],[-.7,.5],[-.85,0]], role: 'metal', shade: -.1, outline: true },
    { kind: 'poly', pts: [[-.38,-.26],[.38,-.26],[.38,.26],[-.38,.26]], role: 'glow' },
    { kind: 'path', pts: [[-.56,-.36],[-.56,.36]], role: 'metal', shade: .3, wR: .12 },
  ] },
  deviceFuseCrown: { ops: [
    { kind: 'poly', pts: [[-.34,-.64],[.3,-.64],[.3,.64],[-.34,.64]], role: 'metal', shade: -.25, outline: true },
    { kind: 'path', pts: [[-.27,-.42],[.35,-.42]], role: 'glow', wR: .12, mirror: true },
    { kind: 'path', pts: [[-.27,0],[.35,0]], role: 'glow', wR: .12 },
  ] },
  deviceFuseLight: { ops: [
    { kind: 'poly', pts: [[-.8,-.3],[.8,-.3],[.8,.3],[-.8,.3]], role: 'glow', outline: true },
  ] },
  deviceVessel: { ops: [
    { kind: 'poly', pts: [[-.62,-.44],[-.82,-.28],[-.86,.32],[-.5,.7],[.35,.7],[.72,.32],[.72,-.3],[.46,-.5],[.37,-.78],[-.5,-.78]], role: 'metal', shade: -.15, outline: true },
    { kind: 'path', pts: [[-.49,-.6],[.4,-.6]], role: 'metal', shade: .35, wR: .18 },
    { kind: 'poly', pts: [[-.42,-.27],[.28,-.27],[.42,.12],[.19,.42],[-.4,.38],[-.57,.08]], role: 'glow', shade: -.18, outline: true },
  ] },
  deviceSun: { ops: [
    { kind: 'poly', pts: Array.from({ length: 12 }, (_, i): [number, number] => {
      const a = i * Math.PI / 6, r = i % 2 ? .57 : 1.03;
      return [Math.cos(a) * r, Math.sin(a) * r];
    }), role: 'accent', shade: .12, outline: true },
    { kind: 'disc', rx: .42, role: 'glow', shade: .15, outline: true },
  ] },
  deviceBinding: { ops: [
    { kind: 'path', pts: [[.08,-.65],[-.15,-.65],[-.3,-.35]], wR: .11, mirror: true },
    { kind: 'poly', pts: [[-.24,0],[-.4,-.13],[-.56,0],[-.4,.13]] },
  ] },
  deviceFractures: { ops: [
    { kind: 'path', pts: [[-.6,-.75],[-.2,-.37],[-.35,-.04],[.06,.35],[-.08,.77]], role: 'dark', wR: .07 },
    { kind: 'path', pts: [[-.35,-.04],[.23,-.12],[.55,-.49]], role: 'dark', wR: .05 },
  ] },
  devicePlinth: { ops: [
    { kind: 'poly', pts: [[-.82,-.57],[.46,-.57],[.8,0],[.46,.57],[-.82,.57],[-1,0]], role: 'metal', shade: -.3, outline: true },
    { kind: 'poly', pts: [[-.66,-.39],[.35,-.39],[.58,0],[.35,.39],[-.66,.39],[-.8,0]], role: 'metal', shade: .12 },
    { kind: 'path', pts: [[-.51,-.25],[.29,-.25]], role: 'glow', wR: .07, mirror: true },
  ] },
  deviceFork: { ops: [
    { kind: 'poly', pts: [[-.65,-.22],[-.23,-.53],[.57,-.7],[.98,-.43],[.62,-.45],[.03,-.25],[-.18,-.12]], role: 'metal', outline: true, mirror: true },
    { kind: 'path', pts: [[-.27,-.36],[.52,-.53],[.77,-.43]], role: 'glow', wR: .065, mirror: true },
  ] },
  deviceBrazier: { ops: [
    { kind: 'poly', pts: [[-.72,-.62],[.24,-.57],[.65,0],[.24,.57],[-.72,.62],[-.46,0]], role: 'metal', shade: -.12, outline: true },
    { kind: 'poly', pts: [[-.5,-.38],[.14,-.36],[.4,0],[.14,.36],[-.5,.38],[-.28,0]], role: 'dark' },
    { kind: 'poly', pts: [[-.27,-.21],[.15,-.26],[.29,0],[.15,.26],[-.27,.21]], role: 'glow' },
  ] },
  deviceRail: { ops: [
    { kind: 'poly', pts: [[-1,-.28],[.86,-.2],[1.17,0],[.86,.2],[-1,.28]], role: 'wood', outline: true },
    { kind: 'path', pts: [[-.82,0],[1.03,0]], role: 'metal', shade: .22, wR: .1 },
    { kind: 'path', pts: [[-.65,-.41],[-.4,-.16]], role: 'metal', wR: .16, mirror: true },
    { kind: 'poly', pts: [[.91,-.18],[1.24,0],[.91,.18]], role: 'bone', outline: true },
  ] },
  deviceJaw: { ops: [
    { kind: 'poly', pts: [[-.88,-.2],[-.65,-.66],[.18,-.73],[.83,-.33],[.62,-.18],[.37,-.45],[.12,-.27],[-.15,-.49],[-.41,-.26],[-.58,-.39]], role: 'metal', shade: .06, outline: true, mirror: true },
    { kind: 'path', pts: [[-.59,-.51],[.14,-.57],[.54,-.36]], role: 'glow', wR: .065, mirror: true },
    { kind: 'poly', pts: [[-.45,0],[0,-.21],[.44,0],[0,.21]], role: 'metal', shade: -.3, outline: true },
  ] },
  deviceCanister: { ops: [
    { kind: 'poly', pts: [[-.62,-.54],[.46,-.54],[.71,-.27],[.71,.27],[.46,.54],[-.62,.54],[-.78,.28],[-.78,-.28]], role: 'metal', shade: -.17, outline: true },
    { kind: 'path', pts: [[-.45,-.48],[-.45,.48]], role: 'metal', shade: .32, wR: .16 },
    { kind: 'path', pts: [[.38,-.47],[.38,.47]], role: 'metal', shade: .25, wR: .16 },
    { kind: 'poly', pts: [[-.19,-.25],[.18,0],[-.19,.25],[-.4,0]], role: 'glow', outline: true },
    { kind: 'path', pts: [[.71,0],[.96,-.15],[1.05,-.43]], role: 'wood', wR: .1 },
  ] },
  deviceArch: { ops: [
    { kind: 'poly', pts: [[-.73,-.62],[-.45,-.99],[.33,-.89],[.84,-.37],[.98,0],[.84,.37],[.33,.89],[-.45,.99],[-.73,.62],[-.4,.57],[.14,.58],[.57,.25],[.65,0],[.57,-.25],[.14,-.58],[-.4,-.57]], role: 'metal', outline: true },
    { kind: 'path', pts: [[-.49,-.76],[.25,-.73],[.72,-.28]], role: 'glow', wR: .07, mirror: true },
  ] },
  deviceSlit: { ops: [
    { kind: 'poly', pts: [[-.91,0],[-.32,-.25],[.1,-.16],[.8,-.34],[.48,0],[.1,.18],[-.31,.12],[-.67,.3]], role: 'dark', outline: true },
    { kind: 'path', pts: [[-.78,0],[-.3,-.14],[.12,-.07],[.61,-.22]], role: 'glow', wR: .09 },
  ] },
  deviceButtress: { ops: [
    { kind: 'poly', pts: [[-.62,-.94],[.24,-.94],[.63,-.63],[.63,.63],[.24,.94],[-.62,.94],[-.43,.48],[-.43,-.48]], role: 'base', shade: -.12, outline: true },
    { kind: 'poly', pts: [[-.39,-.7],[.17,-.7],[.39,-.49],[.39,.49],[.17,.7],[-.39,.7]], role: 'base', shade: .2 },
    { kind: 'path', pts: [[-.34,-.28],[.38,-.28]], role: 'dark', wR: .065, mirror: true },
  ] },
  deviceStandard: { ops: [
    { kind: 'path', pts: [[-.95,0],[1.08,0]], role: 'wood', wR: .14 },
    { kind: 'poly', pts: [[.58,0],[.46,-.89],[-.65,-.99],[-.4,-.56],[-.76,-.2],[-.48,0]], role: 'cloth', shade: -.12, outline: true },
    { kind: 'path', pts: [[.29,-.2],[.22,-.67],[-.34,-.74]], role: 'glow', wR: .085 },
    { kind: 'poly', pts: [[1.02,-.18],[1.32,0],[1.02,.18]], role: 'metal', outline: true },
  ] },
  deviceCoffer: { ops: [
    { kind: 'poly', pts: [[-.7,-.54],[.52,-.54],[.85,0],[.52,.54],[-.7,.54],[-.89,0]], role: 'metal', shade: -.2, outline: true },
    { kind: 'poly', pts: [[-.51,-.37],[.4,-.37],[.64,0],[.4,.37],[-.51,.37],[-.67,0]], role: 'bone', shade: .05, outline: true },
    { kind: 'path', pts: [[-.2,-.36],[-.2,.36]], role: 'metal', wR: .15 },
    { kind: 'poly', pts: [[-.36,0],[-.14,-.19],[.08,0],[-.14,.19]], role: 'glow', outline: true },
  ] },
  deviceHourglass: { ops: [
    { kind: 'poly', pts: [[-.74,-.49],[-.24,-.43],[.19,0],[-.24,.43],[-.74,.49],[-.38,0]], role: 'glow', alpha: .8, outline: true },
    { kind: 'poly', pts: [[.74,-.49],[.24,-.43],[-.19,0],[.24,.43],[.74,.49],[.38,0]], role: 'glow', alpha: .8, outline: true },
    { kind: 'path', pts: [[-.73,-.58],[-.73,.58]], role: 'metal', wR: .16 },
    { kind: 'path', pts: [[.73,-.58],[.73,.58]], role: 'metal', wR: .16 },
  ] },
};
