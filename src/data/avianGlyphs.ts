import type { GlyphDef } from '../render/vis/parts';

/** Feathered anatomy, +X forward in body-radius units. Separate pinions,
 * tails, necks and bills can be recombined without bird-specific painters. */
export const AVIAN_GLYPHS: Record<string, GlyphDef> = {
  sweptPinion: { ops: [
    { kind: 'poly', pts: [[.32,-.13],[.48,-.55],[.08,-1.09],[-.62,-1.85],[-.47,-1.14],[-.78,-1.08],[-.5,-.68],[-.48,-.24]], outline: true },
    { kind: 'poly', pts: [[.23,-.29],[.3,-.56],[.01,-.96],[-.42,-1.53],[-.29,-.93],[-.39,-.54]], shade: .22 },
    { kind: 'poly', pts: [[-.05,-1.09],[-.62,-1.85],[-.47,-1.14],[-.78,-1.08],[-.58,-.85],[-.34,-.77]], role: 'cloth', shade: -.38 },
    { kind: 'path', pts: [[.07,-.66],[-.45,-1.27]], role: 'bone', alpha: .5, wR: .045 },
    { kind: 'path', pts: [[-.09,-.53],[-.48,-.91]], role: 'dark', alpha: .6, wR: .055 },
  ] },
  splayedPinion: { ops: [
    { kind: 'poly', pts: [[.32,-.17],[.43,-.88],[.35,-1.58],[.07,-1.98],[-.03,-1.5],[-.22,-2.04],[-.34,-1.51],[-.52,-1.94],[-.57,-1.36],[-.81,-1.68],[-.74,-1.02],[-.85,-.73],[-.5,-.22]], role: 'cloth', shade: -.24, outline: true },
    { kind: 'poly', pts: [[.25,-.25],[.28,-.9],[.13,-1.41],[-.22,-1.29],[-.54,-.99],[-.65,-.64],[-.37,-.3]], role: 'base', shade: .17 },
    { kind: 'path', pts: [[.16,-.52],[.02,-.98],[-.25,-1.13],[-.54,-.93]], smooth: true, role: 'bone', shade: -.16, alpha: .8, wR: .09 },
    ...[0,1,2].map(i => ({ kind: 'path' as const, pts: [[.05-i*.18,-.77-i*.015],[-.18-i*.18,-1.23+i*.12]] as [number,number][], role: 'dark' as const, alpha: .5, wR: .05 })),
  ] },
  barredPinion: { ops: [
    { kind: 'poly', pts: [[.28,-.16],[.38,-.61],[.07,-1.09],[-.39,-1.45],[-.38,-1.12],[-.61,-1.27],[-.58,-.91],[-.78,-1],[-.6,-.53],[-.38,-.18]], role: 'cloth', shade: -.4, outline: true },
    { kind: 'poly', pts: [[.21,-.34],[.25,-.63],[-.04,-.91],[-.31,-1.04],[-.39,-.81],[-.32,-.48]], role: 'base', shade: .15 },
    { kind: 'path', pts: [[.02,-.66],[-.17,-.64],[-.49,-.73]], role: 'bone', wR: .15 },
    { kind: 'path', pts: [[-.05,-.88],[-.44,-1.17]], role: 'base', shade: .3, wR: .045 },
  ] },
  avianKeel: { ops: [
    { kind: 'poly', pts: [[.7,0],[.39,-.35],[-.11,-.5],[-.68,-.37],[-1.03,0],[-.68,.37],[-.11,.5],[.39,.35]], smooth: true, outline: true },
    { kind: 'poly', pts: [[.43,0],[.08,-.3],[-.49,-.24],[-.8,0],[-.49,.24],[.08,.3]], smooth: true, shade: .23 },
    { kind: 'path', pts: [[.18,0],[-.69,0]], role: 'cloth', shade: -.25, wR: .055 },
    ...[-.26,-.5].map(x => ({ kind: 'path' as const, pts: [[x+.13,-.22],[x,0],[x+.13,.22]] as [number,number][], shade: -.24, wR: .045 })),
  ] },
  hookedBeak: { ops: [
    { kind: 'poly', pts: [[-.24,-.2],[.31,-.17],[.66,0],[.42,.2],[.48,.02],[.05,.16],[-.24,.2]], role: 'bone', shade: -.07, outline: true },
    { kind: 'poly', pts: [[-.13,-.1],[.26,-.08],[.53,0],[.04,.02]], role: 'bone', shade: .27 },
    { kind: 'disc', x: .06, y: -.06, rx: .045, ry: .035, role: 'dark' },
  ] },
  bareCrop: { ops: [
    { kind: 'poly', pts: [[-.49,-.32],[-.13,-.24],[.02,-.39],[.44,-.31],[.65,-.1],[.51,.14],[.18,.2],[-.08,.12],[-.44,.32]], smooth: true, role: 'bone', shade: -.16, outline: true },
    { kind: 'path', pts: [[-.29,-.16],[-.08,-.05],[.16,-.1],[.39,-.12]], smooth: true, role: 'base', shade: -.2, wR: .07 },
    { kind: 'path', pts: [[-.24,-.2],[-.31,.17]], role: 'dark', alpha: .5, wR: .045 },
  ] },
  quillFan: { ops: [
    { kind: 'poly', pts: [[.13,-.18],[-.65,-.45],[-1.15,-.35],[-1.22,0],[-1.15,.35],[-.65,.45],[.13,.18]], outline: true },
    { kind: 'poly', pts: [[-.73,-.39],[-1.15,-.35],[-1.22,0],[-1.15,.35],[-.73,.39],[-.83,0]], role: 'cloth', shade: -.38 },
    { kind: 'path', pts: [[-.16,-.11],[-1.08,-.2]], role: 'bone', alpha: .6, wR: .045, mirror: true },
    { kind: 'path', pts: [[-.15,0],[-1.15,0]], role: 'bone', alpha: .65, wR: .045 },
  ] },
  splitQuills: { ops: [
    { kind: 'poly', pts: [[.17,-.19],[-1.2,-.4],[-1.53,-.32],[-1.09,0],[-1.53,.32],[-1.2,.4],[.17,.19]], role: 'cloth', shade: -.4, outline: true },
    { kind: 'path', pts: [[-.16,-.12],[-1.3,-.28]], role: 'bone', alpha: .85, wR: .075, mirror: true },
    { kind: 'poly', pts: [[-.13,-.12],[-.66,-.15],[-.87,0],[-.66,.15],[-.13,.12]], role: 'base', shade: .2 },
  ] },
  raptorMask: { ops: [
    { kind: 'poly', pts: [[.22,-.39],[.56,-.23],[.6,-.08],[.35,-.12],[-.11,-.31],[-.31,-.4],[.01,-.4]], role: 'dark', mirror: true },
    { kind: 'disc', x: .31, y: -.26, rx: .1, ry: .065, role: 'bone', shade: .2, mirror: true },
    { kind: 'disc', x: .35, y: -.26, rx: .055, ry: .05, role: 'dark', mirror: true },
  ] },
  graspingTalons: { ops: [
    { kind: 'path', pts: [[-.44,-.1],[-.14,.01],[.09,-.06],[.35,-.26]], role: 'bone', shade: -.18, wR: .1 },
    { kind: 'path', pts: [[.05,-.02],[.44,0],[.3,.11]], role: 'bone', wR: .075 },
    { kind: 'path', pts: [[.02,.03],[.27,.27],[.32,.12]], role: 'bone', wR: .075 },
    { kind: 'path', pts: [[-.12,.01],[-.29,.21]], role: 'bone', shade: -.2, wR: .07 },
  ] },
};
