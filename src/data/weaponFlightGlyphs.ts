import type { GlyphDef } from '../render/vis/parts';

/** Original Hollow Wake throwable anatomy. Centered parts fit the ordinary
 * projectile disc when scaled by their profile; long weapons trail aft. */
export const WEAPON_FLIGHT_GLYPHS: Record<string, GlyphDef> = {
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
    { kind: 'path', pts: [[-1.1,0],[.2,0],[.58,-.18],[.73,-.57],[.4,-.83],[.05,-.65],[.11,-.35]], role: 'metal', shade: .25, wR: .19 },
    { kind: 'poly', pts: [[-.07,-.49],[.34,-.29],[.06,-.12]], role: 'metal', shade: .3, outline: true },
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
