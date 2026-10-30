import type { GlyphDef } from '../render/vis/parts';

/** Original Hollow Wake anatomy, in body-radius units, +X forward.
 * Solid shafts, open flukes and broad heads survive small sizes and recolors.
 * These paint no trigger area, progress or other invented mechanical state. */
export const SECONDARY_GLYPHS: Record<string, GlyphDef> = {
  weaponShaft: { ops: [
    { kind: 'poly', pts: [[-1.42,-.09],[.53,-.09],[.53,.09],[-1.42,.09]], outline: true },
    { kind: 'path', pts: [[-1.28,-.04],[.45,-.04]], role: 'bone', wR: .045 },
  ] },
  weaponLeaf: { ops: [
    { kind: 'poly', pts: [[.32,0],[.49,-.29],[.77,-.2],[1.2,0],[.77,.2],[.49,.29]], shade: .3, outline: true },
    { kind: 'path', pts: [[.4,0],[1.08,0]], role: 'bone', wR: .07 },
  ] },
  weaponBarb: { ops: [
    { kind: 'poly', pts: [[.28,-.43],[.53,-.22],[.65,-.32],[1.23,0],[.65,.32],[.53,.22],[.28,.43],[.38,0]], outline: true },
    { kind: 'path', pts: [[.48,0],[1.08,0]], role: 'glow', wR: .08 },
  ] },
  weaponArrowhead: { ops: [
    { kind: 'poly', pts: [[.46,-.29],[1.15,0],[.46,.29],[.62,0]], shade: .4, outline: true },
  ] },
  weaponWrap: { ops: [
    { kind: 'path', pts: [[.05,-.13],[.18,.13]], role: 'cloth', wR: .11 },
    { kind: 'path', pts: [[.23,-.13],[.36,.13]], role: 'cloth', wR: .11 },
  ] },
  weaponFletch: { ops: [
    { kind: 'poly', pts: [[-1.38,-.08],[-1.54,-.38],[-1.02,-.29],[-.78,-.07]], shade: .12, outline: true, mirror: true },
  ] },
  weaponConductor: { ops: [
    { kind: 'path', pts: [[-.75,-.12],[-.45,-.48],[-.2,-.12]], role: 'metal', wR: .12, mirror: true },
    { kind: 'path', pts: [[-.61,-.2],[-.45,-.37],[-.29,-.2]], role: 'glow', wR: .075, mirror: true },
  ] },
  spiritCage: { ops: [
    { kind: 'poly', pts: [[-.8,0],[-.55,-.67],[.35,-.67],[.82,0],[.35,.67],[-.55,.67]], role: 'wood', outline: true },
    { kind: 'poly', pts: [[-.54,0],[-.36,-.43],[.23,-.43],[.56,0],[.23,.43],[-.36,.43]], role: 'dark' },
    { kind: 'path', pts: [[-.4,-.5],[-.1,0],[-.4,.5]], role: 'bone', wR: .13 },
    { kind: 'path', pts: [[.28,-.5],[.05,0],[.28,.5]], role: 'bone', wR: .13 },
    { kind: 'poly', pts: [[-.24,0],[0,-.28],[.3,0],[0,.28]], role: 'glow', outline: true },
  ] },
  ritualTripod: { ops: [
    { kind: 'path', pts: [[-.65,-.85],[0,0],[-.65,.85]], role: 'metal', wR: .2 },
    { kind: 'path', pts: [[0,0],[.98,0]], role: 'metal', wR: .2 },
    { kind: 'poly', pts: [[-.61,0],[-.23,-.54],[.4,-.42],[.64,0],[.4,.42],[-.23,.54]], role: 'metal', outline: true },
    { kind: 'poly', pts: [[-.39,0],[-.13,-.32],[.24,-.26],[.42,0],[.24,.26],[-.13,.32]], role: 'dark' },
    { kind: 'path', pts: [[-.15,-.19],[.2,0],[-.15,.19]], role: 'glow', wR: .12 },
  ] },
  effigyFork: { ops: [
    { kind: 'path', pts: [[-.93,0],[.48,0]], role: 'wood', wR: .26 },
    { kind: 'path', pts: [[-.25,-.95],[.02,0],[-.25,.95]], role: 'wood', wR: .2 },
    { kind: 'poly', pts: [[.1,-.42],[.65,-.52],[1,.0],[.65,.52],[.1,.42],[.3,0]], role: 'bone', outline: true },
    { kind: 'path', pts: [[.58,-.28],[.7,-.13]], role: 'dark', wR: .14, mirror: true },
    { kind: 'path', pts: [[-.3,-.12],[-.08,.12]], role: 'cloth', wR: .12 },
  ] },
  burrowRidge: { ops: [
    { kind: 'poly', pts: [[-1.12,0],[-.73,-.56],[-.32,-.37],[.02,-.64],[.44,-.4],[1,0],[.44,.4],[.02,.64],[-.32,.37],[-.73,.56]], role: 'base', shade: -.1, outline: true },
    { kind: 'path', pts: [[-.88,0],[-.42,-.19],[.04,0],[.39,-.14],[.75,0]], role: 'bone', wR: .14 },
    { kind: 'path', pts: [[-.55,-.2],[-.45,-.4]], role: 'dark', wR: .09, mirror: true },
  ] },
};
