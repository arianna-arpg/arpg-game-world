import type { GlyphDef } from '../render/vis/parts';

/** Reusable assembled anatomy. Unit = body radius, +X faces forward.
 * These parts use palette roles, so skins and the Part Forge can reuse them. */
export const GOLEM_GLYPHS: Record<string, GlyphDef> = {
  quarriedBlock: { ops: [
    { kind: 'poly', pts: [[-.85,-.63],[-.42,-.94],[.63,-.84],[.92,-.35],[.79,.66],[.23,.9],[-.76,.72]], shade: -.16, outline: true },
    { kind: 'poly', pts: [[-.65,-.48],[-.34,-.76],[.5,-.64],[.66,-.24],[.52,.48],[-.57,.51]], shade: .15 },
    { kind: 'poly', pts: [[-.85,-.63],[-.42,-.94],[.63,-.84],[.5,-.64],[-.34,-.76],[-.65,-.48]], shade: .32 },
    { kind: 'path', pts: [[-.28,-.72],[-.12,-.25],[-.34,.02],[-.24,.4]], shade: -.42, wR: .055 },
    { kind: 'path', pts: [[-.12,-.25],[.18,-.32],[.31,-.58]], shade: -.36, wR: .04 },
  ] },
  hewnFace: { ops: [
    { kind: 'poly', pts: [[-.7,-.62],[.36,-.72],[.87,-.38],[.87,.38],[.36,.72],[-.7,.62]], outline: true },
    { kind: 'poly', pts: [[-.56,-.47],[.25,-.53],[.54,-.24],[.36,.35],[-.56,.41]], shade: .22 },
    { kind: 'path', pts: [[.59,-.46],[.44,-.18]], role: 'dark', wR: .22, mirror: true },
    { kind: 'path', pts: [[.59,-.43],[.49,-.2]], role: 'glow', wR: .08, mirror: true },
    { kind: 'path', pts: [[.8,-.23],[.7,0],[.8,.23]], shade: -.3, wR: .055 },
  ] },
  frostPrism: { ops: [
    { kind: 'poly', pts: [[-1.04,-.35],[-.42,-.78],[.65,-.56],[1.08,0],[.47,.65],[-.64,.61]], shade: -.14, outline: true },
    { kind: 'poly', pts: [[-1.04,-.35],[-.42,-.78],[.65,-.56],[.19,-.05]], shade: .4 },
    { kind: 'poly', pts: [[.19,-.05],[.65,-.56],[1.08,0],[.47,.65]], shade: .12 },
    { kind: 'path', pts: [[-.84,-.34],[.19,-.05],[.48,.52]], role: 'glow', wR: .04 },
    { kind: 'path', pts: [[.19,-.05],[.59,-.48]], role: 'glow', wR: .06 },
  ] },
  frostFan: { ops: [
    { kind: 'poly', pts: [[-.57,-.12],[-.74,-1.06],[-.23,-.4],[.04,-1.28],[.3,-.38],[.71,-.87],[.61,.16]], shade: .04, outline: true },
    { kind: 'path', pts: [[-.57,-.8],[-.35,-.03]], role: 'glow', wR: .055 },
    { kind: 'path', pts: [[.04,-1.02],[.13,-.02]], role: 'glow', wR: .055 },
  ] },
  kindledMass: { ops: [
    { kind: 'poly', pts: [[.87,0],[.59,-.58],[-.06,-.72],[-.92,-1.02],[-.59,-.35],[-1.25,-.1],[-.65,.25],[-.93,.89],[-.08,.66],[.62,.5]], smooth: true, shade: -.12, outline: true },
    { kind: 'poly', pts: [[.62,0],[.24,-.42],[-.63,-.64],[-.4,-.12],[-.83,.09],[-.36,.23],[-.53,.57],[.32,.35]], smooth: true, role: 'accent', shade: .18 },
    { kind: 'poly', pts: [[.48,0],[.09,-.2],[-.45,-.24],[-.19,.01],[-.38,.3],[.19,.22]], smooth: true, role: 'glow', shade: .32 },
  ] },
  vitaeLobe: { ops: [
    { kind: 'poly', pts: [[.99,-.1],[.63,-.7],[.01,-.9],[-.75,-.59],[-.94,.03],[-.68,.78],[.06,.88],[.81,.6]], smooth: true, shade: -.18, outline: true },
    { kind: 'poly', pts: [[.53,-.27],[.22,-.64],[-.38,-.57],[-.66,-.13],[-.33,.43],[.24,.51]], smooth: true, shade: .1 },
    { kind: 'path', pts: [[-.52,-.1],[-.38,-.43],[.02,-.49],[.3,-.35]], smooth: true, shade: .55, wR: .075 },
    { kind: 'path', pts: [[.65,.18],[.4,.48],[.05,.54]], smooth: true, shade: -.4, wR: .06 },
  ] },
  clotSinews: { ops: [
    { kind: 'poly', pts: [[-.64,-.43],[-.52,-.94],[.08,-1.05],[.42,-.84],[.71,-.79],[.45,-.52],[-.06,-.56]], smooth: true, shade: -.4, mirror: true },
    { kind: 'path', pts: [[-.36,-.56],[-.05,-.85],[.53,-.81]], smooth: true, shade: .22, wR: .07, mirror: true },
    { kind: 'path', pts: [[-.39,-.3],[-.7,-.37]], wR: .18, mirror: true },
  ] },
  kindledVisage: { ops: [
    { kind: 'poly', pts: [[.85,0],[.44,-.62],[-.44,-.81],[-.95,-.5],[-.53,-.17],[-1.08,.11],[-.46,.39],[-.73,.81],[.39,.62]], smooth: true, shade: .12, outline: true },
    { kind: 'poly', pts: [[.65,0],[.1,-.41],[-.64,-.46],[-.21,-.06],[-.52,.48],[.19,.31]], smooth: true, role: 'glow', shade: .35 },
    { kind: 'path', pts: [[.43,-.5],[.28,-.18]], role: 'dark', wR: .13, mirror: true },
  ] },
  vitaeHeart: { ops: [
    { kind: 'poly', pts: [[-.6,0],[-.53,-.51],[.11,-.56],[.63,0],[.11,.56],[-.53,.51]], smooth: true, role: 'accent', outline: true },
    { kind: 'path', pts: [[-.29,-.3],[.02,-.25],[.32,0]], smooth: true, role: 'glow', wR: .1,
      sway: { ax: .035, freq: 3.2 } },
  ] },
  vitaeDrops: { ops: [
    { kind: 'disc', x: -.78, y: -.57, rx: .1, ry: .065, shade: .15, sway: { ax: .07, ay: .03, freq: 1.8 } },
    { kind: 'disc', x: -.58, y: .64, rx: .07, ry: .1, shade: .32, sway: { ax: .04, ay: .05, freq: 2.1, phase: 2 } },
    { kind: 'disc', x: -.92, y: .27, rx: .075, ry: .045, shade: -.1, sway: { ax: .08, freq: 1.5, phase: 1 } },
  ] },
  boundBones: { ops: [
    ...[-.4, 0, .4].flatMap(y => [
      { kind: 'path' as const, pts: [[-.66,y],[.69,y]] as [number, number][], role: 'bone' as const, shade: -.18, wR: .25 },
      { kind: 'path' as const, pts: [[-.6,y-.055],[.63,y-.055]] as [number, number][], role: 'bone' as const, shade: .2, wR: .09 },
      ...[-.68, .68].map(x => ({ kind: 'disc' as const, x, y, rx: .2, ry: .18, role: 'bone' as const, outline: true })),
    ]),
    { kind: 'path', pts: [[-.13,-.59],[-.22,0],[-.13,.59]], role: 'dark', wR: .085 },
  ] },
};
