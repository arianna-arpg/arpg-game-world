import type { GlyphDef } from '../render/vis/parts';

/** Summon anatomy authored in the shared vector grammar. +X is forward.
 * Palette roles, placement and motion remain reusable by creatures and mods. */
export const SUMMON_GLYPHS: Record<string, GlyphDef> = {
  graftTrunk: { ops: [
    { kind: 'poly', pts: [[.64,-.32],[.34,-.89],[-.3,-1.02],[-.89,-.61],[-1.02,.09],[-.73,.64],[-.06,.86],[.58,.61],[.8,.12]], smooth: true, shade: -.22, outline: true },
    { kind: 'poly', pts: [[.41,-.36],[.08,-.68],[-.44,-.65],[-.79,-.24],[-.47,.29],[.05,.37],[.55,.12]], smooth: true, shade: .12 },
    { kind: 'poly', pts: [[-.8,-.15],[-.53,-.57],[-.26,-.51],[-.15,-.08],[-.39,.19]], smooth: true, role: 'cloth', shade: .07, outline: true },
    { kind: 'path', pts: [[.13,-.73],[-.03,-.23],[.13,.1],[-.02,.62]], smooth: true, role: 'dark', wR: .065 },
    ...[-.5,-.27,0,.25,.48].map((y,i) => ({ kind: 'path' as const, pts: [[-.06,y],[.18,y+.08]] as [number,number][], role: 'bone' as const, shade: -.2, wR: .045, alpha: i%2 ? .85 : 1 })),
  ] },
  graftArm: { ops: [
    { kind: 'poly', pts: [[-.9,-.29],[-.57,-.48],[.04,-.36],[.42,-.64],[.95,-.49],[1.18,-.02],[.95,.49],[.39,.5],[.02,.28],[-.57,.36]], smooth: true, shade: -.1, outline: true },
    { kind: 'path', pts: [[-.64,-.19],[-.19,-.17],[.17,-.24],[.62,-.35]], smooth: true, shade: .3, wR: .1 },
    { kind: 'path', pts: [[.3,-.44],[.18,-.08],[.3,.38]], role: 'dark', wR: .065 },
    { kind: 'path', pts: [[.08,-.28],[.39,-.19]], role: 'bone', wR: .055 },
    { kind: 'path', pts: [[.09,.08],[.37,.15]], role: 'bone', wR: .055 },
    ...[-.23,0,.23].map(y => ({ kind: 'path' as const, pts: [[.85,y],[1.07,y+.02]] as [number,number][], shade: -.42, wR: .05 })),
  ] },
  graftSpurs: { ops: [
    { kind: 'poly', pts: [[-.45,-.2],[-1.1,-.69],[-.64,-.05],[-1.28,.13],[-.47,.25]], role: 'bone', outline: true },
    { kind: 'poly', pts: [[-.46,-.08],[-.85,-.35],[-.63,.06]], role: 'bone', shade: .25 },
  ] },
  pactTail: { ops: [
    { kind: 'poly', pts: [[-.25,-.32],[-.95,-.6],[-1.42,-.26],[-1.59,.32],[-1.27,.69],[-.97,.44],[-1.2,.14],[-.85,-.01],[-.38,.32]], smooth: true, shade: -.13, outline: true },
    { kind: 'path', pts: [[-.46,-.13],[-.93,-.31],[-1.24,-.12],[-1.3,.29]], smooth: true, role: 'glow', wR: .07 },
  ] },
  pactMask: { ops: [
    { kind: 'poly', pts: [[.99,0],[.53,-.36],[.08,-.52],[-.46,-.86],[-.34,-.18],[-.53,0],[-.34,.18],[-.46,.86],[.08,.52],[.53,.36]], outline: true },
    { kind: 'poly', pts: [[.74,0],[.12,-.3],[-.11,0],[.12,.3]], shade: .23 },
    { kind: 'poly', pts: [[-.3,-.63],[-.03,-.42],[-.2,-.26]], role: 'glow', mirror: true },
    { kind: 'path', pts: [[.47,-.29],[.27,-.18]], role: 'dark', wR: .16, mirror: true },
    { kind: 'path', pts: [[.44,-.27],[.3,-.19]], role: 'glow', wR: .065, mirror: true },
    { kind: 'disc', x: .78, rx: .085, ry: .065, role: 'dark' },
  ] },
  pactSatellites: { ops: [
    { kind: 'poly', pts: [[-.38,-1.02],[-.57,-1.22],[-.76,-1.02],[-.57,-.8]], role: 'glow', outline: true,
      sway: { ax: .07, ay: .06, freq: 1.6 }, mirror: true },
  ] },
  votiveWing: { ops: [
    { kind: 'poly', pts: [[.25,-.14],[.67,-.79],[.22,-1.43],[-.03,-1.02],[-.37,-1.48],[-.46,-.95],[-.85,-1.21],[-.77,-.64],[-1.12,-.73],[-.72,-.25],[-.25,0]], role: 'base', outline: true },
    { kind: 'poly', pts: [[.27,-.32],[.39,-.75],[.13,-1.05],[-.18,-.62],[-.64,-.42],[-.39,-.19]], role: 'glow', shade: .1 },
    { kind: 'path', pts: [[.13,-.96],[-.2,-.51]], role: 'accent', shade: -.24, wR: .05 },
    { kind: 'path', pts: [[-.27,-1.13],[-.38,-.55]], role: 'accent', shade: -.24, wR: .05 },
    { kind: 'path', pts: [[-.66,-.93],[-.56,-.51]], role: 'accent', shade: -.24, wR: .05 },
  ] },
  votiveFace: { ops: [
    { kind: 'disc', rx: .4, ry: .43, shade: .15, outline: true },
    { kind: 'poly', pts: [[-.07,-.4],[-.38,-.3],[-.47,.07],[-.27,.41],[-.15,.26],[-.25,0]], smooth: true, role: 'glow' },
    { kind: 'path', pts: [[.21,-.26],[.29,-.13]], role: 'dark', wR: .065, mirror: true },
    { kind: 'disc', x: .36, rx: .07, ry: .08, role: 'glow' },
  ] },
  mendingCradle: { ops: [
    { kind: 'poly', pts: [[.91,-.51],[.38,-.91],[-.43,-.9],[-1.16,-.31],[-1.41,0],[-.74,.03],[-.23,-.48],[.31,-.48]], smooth: true, shade: -.07, outline: true, mirror: true },
    { kind: 'path', pts: [[.59,-.62],[.17,-.7],[-.44,-.51],[-1.08,-.1]], smooth: true, role: 'glow', wR: .07, mirror: true },
  ] },
  spiritSeed: { ops: [
    { kind: 'poly', pts: [[.73,0],[.2,-.41],[-.49,-.3],[-.73,0],[-.49,.3],[.2,.41]], smooth: true, role: 'glow', outline: true },
    { kind: 'path', pts: [[-.38,0],[.37,0]], shade: -.2, wR: .06 },
    { kind: 'path', pts: [[.02,0],[-.11,-.19]], shade: -.2, wR: .04, mirror: true },
  ] },
  spiritSeedGlint: { ops: [
    { kind: 'disc', x: .15, rx: .12, ry: .065, role: 'glow', shade: .4, alpha: .8,
      sway: { ax: .15, freq: 2.1 } },
  ] },
  cometTresses: { ops: [
    { kind: 'poly', pts: [[.16,-.44],[-.55,-.65],[-1.46,-.91],[-1.08,-.4],[-1.9,-.14],[-1.21,.09],[-1.59,.59],[-.72,.47],[.12,.38]], smooth: true, role: 'accent', alpha: .9 },
    { kind: 'poly', pts: [[.08,-.2],[-.46,-.4],[-1.22,-.53],[-.91,-.11],[-1.44,.13],[-.82,.23],[-1.04,.46],[-.23,.26]], smooth: true, role: 'glow', alpha: .8 },
  ] },
  emberWings: { ops: [
    { kind: 'poly', pts: [[.18,-.22],[.29,-.77],[-.28,-1.28],[-.17,-.68],[-.86,-.81],[-.51,-.29]], smooth: true, role: 'accent', outline: true, mirror: true },
    { kind: 'poly', pts: [[.06,-.37],[.03,-.65],[-.2,-.86],[-.19,-.49],[-.48,-.55]], smooth: true, role: 'glow', mirror: true },
  ] },
};
