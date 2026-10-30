import type { GlyphDef } from '../render/vis/parts';

/** Original Hollow Wake parts for fixtures and field creatures. */
export const FIELD_ACTOR_GLYPHS: Record<string, GlyphDef> = {
  timberSlats: { ops: [
    { kind: 'poly', pts: [[-.78,-.94],[.7,-.94],[.82,-.7],[.82,.94],[-.78,.94]], role: 'wood', outline: true },
    { kind: 'path', pts: [[-.3,-.87],[-.3,.87]], role: 'dark', wR: .06 },
    { kind: 'path', pts: [[.28,-.87],[.28,.87]], role: 'dark', wR: .06 },
    { kind: 'path', pts: [[-.67,-.63],[.68,-.63]], role: 'metal', wR: .14, mirror: true },
  ] },
  timberBrace: { ops: [
    { kind: 'path', pts: [[-.67,-.75],[.65,.72]], role: 'wood', shade: .4, wR: .2 },
    { kind: 'poly', pts: [[-.82,-.13],[.91,-.13],[.91,.13],[-.82,.13]], role: 'metal', outline: true },
    { kind: 'disc', x: .58, rx: .13, role: 'dark', outline: true },
  ] },
  foldedSlabWing: { ops: [
    { kind: 'poly', pts: [[-.85,-.28],[-1.05,-.92],[-.72,-1.22],[.32,-1.1],[.78,-.64],[.2,-.53],[-.45,-.66],[-.27,-.27]], shade: -.08, outline: true, mirror: true },
    { kind: 'path', pts: [[-.73,-.97],[-.5,-.76],[.2,-.66]], role: 'bone', wR: .075, mirror: true },
  ] },
  huskPalm: { ops: [
    { kind: 'poly', pts: [[-1.1,-.25],[-.4,-.43],[.07,-.61],[.5,-.51],[.77,-.23],[.8,.25],[.4,.57],[-.13,.52],[-.53,.31],[-1.1,.21]], outline: true },
    { kind: 'path', pts: [[-.89,0],[-.32,-.1],[.29,0]], role: 'bone', wR: .14 },
    { kind: 'poly', pts: [[.26,-.49],[.72,-.83],[1.23,-.79],[.86,-.55],[.63,-.19]], role: 'bone', outline: true, mirror: true },
    { kind: 'poly', pts: [[.61,-.15],[1.32,0],[.61,.15]], role: 'bone', outline: true },
  ] },
};
