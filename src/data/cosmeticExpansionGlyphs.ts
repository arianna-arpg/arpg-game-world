import type { GlyphDef } from '../render/vis/parts';

export const EXPANDED_COSMETIC_GLYPHS: Record<string, GlyphDef> = {
  wardrobePonytail: { ops: [
    { kind: 'poly', pts: [[.35,-.34],[-.1,-.42],[-.4,-.28],[-.8,-.58],[-1.4,-.24],[-1.8,-.38],[-1.6,.03],[-.95,.05],[-.42,-.03],[.25,.3]], color: '#412d28', smooth: true, outline: true },
    { kind: 'path', pts: [[-.4,-.24],[-.44,-.03]], role: 'metal', wR: .12 },
  ] },
  wardrobeFeatherCape: { ops: [
    { kind: 'poly', pts: [[.2,-.65],[-.2,-.76],[-1.5,-1.1],[-1.1,-.55],[-1.6,-.55],[-1.2,-.12],[-1.5,0],[-.3,.12]], role: 'cloth', outline: true, mirror: true },
    { kind: 'path', pts: [[-.2,-.52],[-1.1,-.8]], role: 'accent', wR: .05, mirror: true },
  ] },
  wardrobeTricorn: { ops: [
    { kind: 'poly', pts: [[.85,0],[-.05,-.85],[-.28,0],[-.05,.85]], role: 'cloth', outline: true },
    { kind: 'path', pts: [[.66,0],[0,-.65],[-.13,0],[0,.65],[.66,0]], role: 'accent', wR: .07 },
    { kind: 'disc', x: .24, rx: .28, ry: .36, role: 'cloth', shade: .18, outline: true },
  ] },
  wardrobeBow: { ops: [
    { kind: 'path', pts: [[-.85,0],[-.6,-.4],[0,-.64],[.6,-.4],[.85,0]], role: 'wood', smooth: true, wR: .13 },
    { kind: 'path', pts: [[-.85,0],[.85,0]], color: '#e3d2b0', wR: .035 },
    { kind: 'path', pts: [[0,-.68],[0,-.47]], role: 'metal', wR: .18 },
  ] },
  wardrobeChakram: { ops: [
    { kind: 'ring', rx: .42, role: 'metal', shade: .35, wR: .15 },
    { kind: 'ring', rx: .31, role: 'glow', wR: .045 },
    { kind: 'poly', pts: [[.35,-.08],[.65,0],[.35,.08]], role: 'metal', mirror: true },
  ] },
  wardrobeFrostCollar: { ops: [
    { kind: 'poly', pts: [[.1,-.35],[-.2,-.9],[-.5,-.55],[-.9,-.95],[-.9,-.2],[-.3,0]], role: 'accent', outline: true, mirror: true },
    { kind: 'path', pts: [[-.2,-.64],[-.5,-.4],[-.7,-.6]], role: 'glow', wR: .05, mirror: true },
  ] },
  wispMoth: { ops: [
    { kind: 'poly', pts: [[.5,0],[.9,-1.05],[.1,-1.7],[-.3,-.8],[-1,-1.1],[-.8,-.2],[0,0]], role: 'base', alpha: .8, smooth: true, outline: true, mirror: true },
    { kind: 'disc', x: .18, y: -.87, rx: .22, role: 'glow', mirror: true },
    { kind: 'path', pts: [[-.6,0],[.65,0]], role: 'glow', wR: .25 },
    { kind: 'path', pts: [[.5,0],[.9,-.3]], role: 'accent', wR: .06, mirror: true },
  ] },
  wispLantern: { ops: [
    { kind: 'ring', x: .9, rx: .25, role: 'accent', wR: .09 },
    { kind: 'poly', pts: [[.65,-.55],[-.7,-.68],[-1,0],[-.7,.68],[.65,.55]], role: 'base', alpha: .7, outline: true },
    { kind: 'disc', rx: .4, role: 'glow' },
    { kind: 'path', pts: [[.66,-.55],[-.7,-.68],[-1,0],[-.7,.68],[.66,.55]], role: 'accent', wR: .12 },
    { kind: 'path', pts: [[.6,-.3],[-.75,-.35]], role: 'accent', wR: .08, mirror: true },
  ] },
  wispPrism: { ops: [
    { kind: 'poly', pts: [[1.3,0],[.1,-.65],[-1.2,0],[.1,.65]], role: 'base', outline: true },
    { kind: 'poly', pts: [[1.3,0],[.1,-.65],[-.2,0]], role: 'glow' },
    { kind: 'path', pts: [[-.5,-.85],[-1.5,-.55]], role: 'accent', wR: .12, mirror: true },
  ] },
};
