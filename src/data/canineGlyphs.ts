import type { GlyphDef } from '../render/vis/parts';

/** Canine anatomy in body-radius units, +X forward. Limbs, coats, jaws,
 * ears and tack are independent parts for the shared baked-body grammar. */
export const CANINE_GLYPHS: Record<string, GlyphDef> = {
  coursingTrunk: { ops: [
    { kind: 'poly', pts: [[.65,0],[.5,-.48],[.02,-.53],[-.43,-.32],[-.89,-.4],[-1.05,0],[-.89,.4],[-.43,.32],[.02,.53],[.5,.48]], smooth: true, outline: true },
    { kind: 'poly', pts: [[.42,0],[.19,-.32],[-.32,-.2],[-.85,0],[-.32,.2],[.19,.32]], smooth: true, shade: .22 },
    { kind: 'path', pts: [[.22,0],[-.54,0]], role: 'cloth', shade: -.32, wR: .14 },
  ] },
  runningHaunch: { ops: [
    { kind: 'poly', pts: [[.21,-.08],[.23,-.39],[-.05,-.64],[.17,-.75],[.37,-.71],[.28,-.89],[-.04,-.91],[-.38,-.58],[-.24,-.2]], smooth: true, shade: -.12, outline: true },
    { kind: 'path', pts: [[-.12,-.28],[-.16,-.55],[.05,-.7]], shade: .2, wR: .09 },
    { kind: 'path', pts: [[.14,-.79],[.27,-.81]], role: 'bone', wR: .045 },
  ] },
  reachingPaw: { ops: [
    { kind: 'poly', pts: [[-.21,-.12],[.05,-.09],[.18,-.5],[.57,-.54],[.68,-.66],[.57,-.8],[.19,-.78],[-.13,-.59]], smooth: true, outline: true },
    { kind: 'path', pts: [[-.03,-.22],[.03,-.52],[.39,-.64]], shade: .23, wR: .1 },
    { kind: 'path', pts: [[.52,-.63],[.64,-.64]], role: 'bone', wR: .045 },
    { kind: 'path', pts: [[.48,-.72],[.6,-.75]], role: 'bone', wR: .045 },
  ] },
  brushTail: { ops: [
    { kind: 'poly', pts: [[.14,-.17],[-.36,-.31],[-.67,-.16],[-1.17,-.26],[-.94,.04],[-.57,.24],[-.19,.2],[.14,.12]], outline: true },
    { kind: 'poly', pts: [[-.51,-.18],[-.67,-.16],[-1.17,-.26],[-.94,.04],[-.61,.18],[-.72,.01]], role: 'cloth', shade: -.33 },
    { kind: 'path', pts: [[-.05,-.05],[-.46,-.1],[-.69,-.04]], smooth: true, shade: .27, wR: .075 },
  ] },
  canineMuzzle: { ops: [
    { kind: 'poly', pts: [[-.42,-.37],[.02,-.35],[.3,-.18],[.64,-.13],[.72,0],[.64,.13],[.3,.18],[.02,.35],[-.42,.37]], smooth: true, outline: true },
    { kind: 'poly', pts: [[-.19,-.18],[.18,-.12],[.49,0],[.18,.12],[-.19,.18],[.03,0]], shade: .32 },
    { kind: 'disc', x: .58, rx: .14, ry: .12, role: 'dark' },
    { kind: 'path', pts: [[.02,-.24],[.18,-.18]], role: 'dark', wR: .075, mirror: true },
    { kind: 'disc', x: .08, y: -.21, rx: .045, ry: .035, role: 'bone', mirror: true },
  ] },
  prickedEar: { ops: [
    { kind: 'poly', pts: [[-.3,-.16],[.16,-.14],[.05,-.7],[-.3,-.5]], outline: true },
    { kind: 'poly', pts: [[-.2,-.26],[.04,-.24],[0,-.54]], role: 'cloth', shade: -.35 },
  ] },
  foldedEar: { ops: [
    { kind: 'poly', pts: [[-.28,-.14],[.15,-.19],[.13,-.47],[-.34,-.65],[-.46,-.45]], smooth: true, shade: -.25, outline: true },
    { kind: 'path', pts: [[.05,-.28],[-.25,-.47],[-.33,-.41]], shade: .22, wR: .085 },
  ] },
  shaggyRuff: { ops: [
    { kind: 'poly', pts: [[.55,0],[.43,-.36],[.04,-.56],[-.16,-.79],[-.2,-.52],[-.58,-.65],[-.42,-.35],[-.77,-.36],[-.49,0],[-.77,.36],[-.42,.35],[-.58,.65],[-.2,.52],[-.16,.79],[.04,.56],[.43,.36]], shade: .13, outline: true },
    { kind: 'path', pts: [[.29,-.2],[-.12,-.42],[-.39,-.39]], shade: -.25, wR: .065, mirror: true },
  ] },
  reedLocks: { ops: [
    { kind: 'poly', pts: [[.35,-.29],[-.02,-.62],[-.08,-.36],[-.44,-.65],[-.43,-.34],[-.78,-.52],[-.65,-.11],[-.34,-.17]], shade: -.18, outline: true, mirror: true },
    { kind: 'path', pts: [[.08,-.29],[-.19,-.43]], shade: .3, wR: .05, mirror: true },
    { kind: 'path', pts: [[-.35,-.27],[-.62,-.38]], shade: .24, wR: .05, mirror: true },
  ] },
  droverCollar: { ops: [
    { kind: 'path', pts: [[.03,-.43],[-.11,-.27],[-.16,0],[-.11,.27],[.03,.43]], smooth: true, role: 'wood', shade: -.22, wR: .19 },
    { kind: 'path', pts: [[.03,-.43],[-.11,-.27],[-.16,0],[-.11,.27],[.03,.43]], smooth: true, role: 'bone', shade: -.25, wR: .035 },
    { kind: 'poly', pts: [[-.28,-.13],[-.05,-.13],[-.05,.13],[-.28,.13]], role: 'metal', shade: .28, outline: true },
    { kind: 'path', pts: [[-.2,0],[-.07,0]], role: 'dark', wR: .065 },
  ] },
  scavengerJaw: { ops: [
    { kind: 'poly', pts: [[-.47,-.36],[.08,-.4],[.55,-.3],[.76,-.12],[.63,0],[.76,.12],[.55,.3],[.08,.4],[-.47,.36]], outline: true },
    { kind: 'poly', pts: [[-.12,-.27],[.51,-.21],[.67,-.08],[.28,-.02],[-.2,-.11]], role: 'dark', mirror: true },
    ...[-.02,.22,.45].map(x => ({ kind: 'poly' as const, pts: [[x,-.23],[x+.13,-.2],[x+.08,-.07]] as [number,number][], role: 'bone' as const, mirror: true })),
    { kind: 'disc', x: .63, rx: .14, ry: .08, role: 'dark' },
    { kind: 'path', pts: [[-.31,-.27],[-.11,-.31]], role: 'bone', wR: .06, mirror: true },
  ] },
  emberHackles: { ops: [
    { kind: 'poly', pts: [[.54,0],[.29,-.39],[-.03,-.78],[-.05,-.36],[-.4,-.62],[-.35,-.21],[-.85,-.39],[-.57,0],[-.85,.39],[-.35,.21],[-.4,.62],[-.05,.36],[-.03,.78],[.29,.39]], role: 'cloth', shade: -.5, outline: true },
    { kind: 'path', pts: [[.26,-.2],[.04,-.44],[-.1,-.17],[-.39,-.28]], role: 'glow', wR: .065, mirror: true },
    { kind: 'poly', pts: [[.33,0],[.04,-.12],[-.59,0],[.04,.12]], role: 'glow', shade: .3 },
  ] },
};
