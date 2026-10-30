import type { GlyphDef } from '../render/vis/parts';

/** Original Hollow Wake throwable anatomy. Centered parts fit the ordinary
 * projectile disc when scaled by their profile; long weapons trail aft. */
export const WEAPON_FLIGHT_GLYPHS: Record<string, GlyphDef> = {
  thrownHammer: { ops: [
    { kind: 'poly', pts: [[-.95,-.1],[.4,-.1],[.4,.1],[-.95,.1]], role: 'wood', outline: true },
    { kind: 'poly', pts: [[.15,-.62],[.7,-.62],[.84,-.43],[.84,.43],[.7,.62],[.15,.62]], role: 'metal', shade: .2, outline: true },
    { kind: 'path', pts: [[.28,-.47],[.28,.47]], role: 'glow', wR: .1 },
  ] },
  thrownBone: { ops: [
    { kind: 'path', pts: [[-.72,-.12],[.54,.12]], role: 'bone', wR: .3 },
    { kind: 'disc', x: -.73, y: -.24, rx: .23, role: 'bone', outline: true },
    { kind: 'disc', x: -.76, y: .08, rx: .23, role: 'bone', outline: true },
    { kind: 'poly', pts: [[.4,-.1],[1,.04],[.66,.15],[.78,.31],[.37,.25]], role: 'bone', outline: true },
  ] },
  thornShard: { ops: [
    { kind: 'poly', pts: [[-.95,-.28],[-.36,-.38],[.22,-.22],[1.15,0],[.13,.18],[-.72,.42],[-.4,.08]], outline: true },
    { kind: 'path', pts: [[-.58,-.13],[.85,0]], role: 'bone', wR: .065 },
  ] },
  seedWing: { ops: [
    { kind: 'poly', pts: [[-.46,.23],[-.66,-.09],[-.62,-.63],[-.1,-.96],[.89,-.75],[.55,-.43],[-.08,-.24]], role: 'cloth', outline: true },
    { kind: 'path', pts: [[-.37,-.05],[-.3,-.58],[.52,-.72]], role: 'wood', wR: .07 },
    { kind: 'disc', x: -.4, y: .2, rx: .26, ry: .38, role: 'wood', outline: true },
  ] },
  lanternFrame: { ops: [
    { kind: 'path', pts: [[-.25,-.62],[-.25,-.97],[.25,-.97],[.25,-.62]], role: 'metal', wR: .1 },
    { kind: 'poly', pts: [[-.55,-.68],[.55,-.68],[.42,.63],[-.42,.63]], role: 'metal', outline: true },
    { kind: 'poly', pts: [[-.35,-.42],[.35,-.42],[.25,.42],[-.25,.42]], role: 'dark' },
    { kind: 'poly', pts: [[0,-.38],[.2,.12],[0,.37],[-.2,.12]], role: 'glow' },
    { kind: 'path', pts: [[-.39,.68],[.39,.68]], role: 'metal', wR: .14 },
  ] },
  tiedBundle: { ops: [
    { kind: 'poly', pts: [[-.7,-.37],[-.22,-.75],[.51,-.48],[.83,.2],[.47,.69],[-.38,.68],[-.81,.2]], role: 'cloth', outline: true },
    { kind: 'path', pts: [[-.65,-.28],[.56,.49]], role: 'wood', wR: .14 },
    { kind: 'path', pts: [[-.41,.53],[.42,-.5]], role: 'wood', wR: .14 },
    { kind: 'path', pts: [[-.05,-.71],[-.27,-1.04],[.11,-.97],[.18,-.64]], role: 'cloth', wR: .14 },
    { kind: 'path', pts: [[.46,.03],[.8,-.12],[1.04,.08]], role: 'bone', wR: .075 },
  ] },
  thrownAxe: { ops: [
    { kind: 'poly', pts: [[-1.1,-.1],[.6,-.1],[.6,.1],[-1.1,.1]], role: 'wood', outline: true },
    { kind: 'poly', pts: [[.1,-.21],[.06,-.84],[.63,-1],[1,-.65],[.6,-.39],[.5,.2]], role: 'metal', shade: .3, outline: true },
    { kind: 'path', pts: [[.2,-.79],[.6,-.9],[.86,-.64]], role: 'bone', wR: .08 },
  ] },
  throwingKnife: { ops: [
    { kind: 'poly', pts: [[-1,-.1],[-.3,-.1],[-.3,.1],[-1,.1]], role: 'wood', outline: true },
    { kind: 'poly', pts: [[-.28,-.21],[.32,-.19],[1.16,0],[.32,.2],[-.28,.2]], role: 'metal', shade: .3, outline: true },
    { kind: 'path', pts: [[-.33,-.35],[-.33,.35]], role: 'metal', wR: .16 },
  ] },
  barbedHook: { ops: [
    { kind: 'path', pts: [[-1.1,0],[.2,0],[.58,-.18],[.73,-.57],[.4,-.83],[.05,-.65],[.11,-.35]], shade: .25, wR: .19 },
    { kind: 'poly', pts: [[-.07,-.49],[.34,-.29],[.06,-.12]], shade: .3, outline: true },
    { kind: 'path', pts: [[-.92,-.23],[-.92,.23]], role: 'wood', wR: .14 },
  ] },
  throwingCard: { ops: [
    { kind: 'poly', pts: [[-.72,-.96],[.72,-.96],[.72,.96],[-.72,.96]], role: 'bone', outline: true },
    { kind: 'poly', pts: [[-.49,-.71],[.49,-.71],[.49,.71],[-.49,.71]], role: 'dark' },
    { kind: 'poly', pts: [[0,-.5],[.33,0],[0,.5],[-.33,0]], role: 'glow', outline: true },
  ] },
  thrownShuriken: { ops: [
    { kind: 'poly', pts: [[1.12,0],[.27,.22],[.18,.61],[0,1.12],[-.22,.27],[-.61,.18],[-1.12,0],[-.27,-.22],[-.18,-.61],[0,-1.12],[.22,-.27],[.61,-.18]], shade: .25, outline: true },
    { kind: 'disc', rx: .18, role: 'dark', outline: true },
  ] },
  thrownStone: { ops: [
    { kind: 'poly', pts: [[-.74,-.48],[.01,-.79],[.76,-.3],[.62,.46],[-.13,.69],[-.8,.22]], shade: .05, outline: true },
    { kind: 'path', pts: [[-.59,-.31],[-.07,-.52],[.49,-.2]], role: 'bone', wR: .12 },
    { kind: 'path', pts: [[-.31,.25],[.15,.09],[.39,.38]], role: 'dark', wR: .1 },
  ] },
  shotSlug: { ops: [
    { kind: 'poly', pts: [[-.72,-.31],[.23,-.31],[.7,0],[.23,.31],[-.72,.31]], role: 'metal', shade: .3, outline: true },
    { kind: 'path', pts: [[-.46,-.26],[-.46,.26]], role: 'dark', wR: .1 },
  ] },
  razorFeather: { ops: [
    { kind: 'poly', pts: [[-1.1,0],[-.65,-.4],[.23,-.48],[1.1,0],[.2,.38],[-.57,.28]], role: 'bone', outline: true },
    { kind: 'path', pts: [[-1.2,0],[.9,0]], role: 'metal', wR: .08 },
    { kind: 'path', pts: [[-.48,-.29],[-.19,0],[-.46,.22]], role: 'dark', wR: .05 },
  ] },
};
