import type { GlyphDef } from '../render/vis/parts';
import { EXPANDED_COSMETIC_GLYPHS } from './cosmeticExpansionGlyphs';

/** Reusable wardrobe parts in the same vector grammar as creatures and classes.
 *  +X faces forward. Hair/head/garment can be recomposed independently by mods. */
export const COSMETIC_GLYPHS: Record<string, GlyphDef> = {
  ...EXPANDED_COSMETIC_GLYPHS,
  wardrobeCoat: { ops: [
    { kind: 'poly', pts: [[.45,-.58],[.6,-.28],[.18,-.25],[-.45,-.34],[-1.25,-.75],[-1.1,-.05],[-.6,0],[-1.1,.05],[-1.25,.75],[-.45,.34],[.18,.25],[.6,.28],[.45,.58]], role: 'cloth', outline: true },
    { kind: 'path', pts: [[.3,-.48],[-.35,-.22],[-1.08,-.54]], role: 'accent', wR: .055, mirror: true },
    { kind: 'path', pts: [[-.26,-.34],[-.18,0],[-.26,.34]], role: 'metal', wR: .1 },
    { kind: 'disc', x: -.18, rx: .1, role: 'accent', outline: true },
  ] },
  wardrobeGown: { ops: [
    { kind: 'poly', pts: [[.3,-.42],[.1,-.28],[-.38,-.35],[-1.45,-1.04],[-1.55,-.55],[-1.72,0],[-1.55,.55],[-1.45,1.04],[-.38,.35],[.1,.28],[.3,.42]], role: 'cloth', smooth: true, outline: true },
    { kind: 'path', pts: [[-.26,-.27],[-.8,-.52],[-1.48,-.74]], role: 'accent', wR: .045, smooth: true, mirror: true },
    { kind: 'path', pts: [[-.33,-.1],[-.9,-.2],[-1.6,-.2]], role: 'cloth', shade: .25, wR: .045, smooth: true, mirror: true },
    { kind: 'path', pts: [[-.23,-.3],[-.13,0],[-.23,.3]], role: 'metal', wR: .09 },
  ] },
  wardrobeHair: { ops: [
    { kind: 'poly', pts: [[.45,-.33],[.16,-.54],[-.6,-.48],[-1.28,-.72],[-1.02,-.24],[-1.42,-.06],[-.83,.17],[-1.16,.5],[-.49,.47],[.13,.49],[.45,.33]], role: 'base', smooth: true, outline: true },
    { kind: 'path', pts: [[.13,-.32],[-.44,-.27],[-1.08,-.45]], role: 'base', shade: .28, wR: .045, smooth: true },
    { kind: 'path', pts: [[.13,.31],[-.48,.25],[-.95,.3]], role: 'base', shade: .22, wR: .045, smooth: true },
  ] },
  wardrobeBraid: { ops: [
    ...Array.from({ length: 7 }, (_, i) => ({ kind: 'disc' as const, x: -.05 - i * .17, y: .38 + (i % 2) * .08, rx: .145 - i * .009, ry: .12, role: 'base' as const, shade: (i % 2) * .15, outline: true })),
    { kind: 'path', pts: [[-1.06,.38],[-1.04,.53]], role: 'metal', wR: .09 },
  ] },
  wardrobeHead: { ops: [
    { kind: 'disc', x: .39, rx: .31, ry: .3, role: 'base', outline: true },
    { kind: 'disc', x: .7, rx: .09, ry: .1, role: 'base', shade: .08, outline: true },
    { kind: 'path', pts: [[.57,-.17],[.62,-.09]], role: 'dark', wR: .035, mirror: true },
  ] },
  wardrobeDiadem: { ops: [
    { kind: 'ring', x: .26, rx: .34, ry: .4, a0: -1.7, a1: 1.7, role: 'metal', shade: .25, wR: .08 },
    { kind: 'poly', pts: [[.54,0],[.71,-.1],[.87,0],[.71,.1]], role: 'glow', outline: true },
  ] },
  wardrobeLantern: { ops: [
    { kind: 'path', pts: [[.2,0],[.2,.35]], role: 'metal', wR: .07 },
    { kind: 'poly', pts: [[.04,.35],[.36,.35],[.43,.77],[-.03,.77]], role: 'glow', outline: true },
    { kind: 'path', pts: [[.2,.37],[.2,.75]], role: 'metal', wR: .05 },
    { kind: 'path', pts: [[-.06,.79],[.46,.79]], role: 'metal', wR: .08 },
  ] },
};

// Named palette variants are data, composed from the same reusable geometry.
// Glyph ops own their palette; explicit hair/complexion colors survive cloth skins.
const cosmeticGlyphTints: [string, string, string][] = [
  ['wardrobeHairSilver', 'wardrobeHair', '#dce2ef'], ['wardrobeBraidSilver', 'wardrobeBraid', '#dce2ef'],
  ['wardrobeHairCopper', 'wardrobeHair', '#a85832'], ['wardrobeBraidCopper', 'wardrobeBraid', '#a85832'],
  ['wardrobeHairDark', 'wardrobeHair', '#342e50'],
  ['wardrobeHeadWarm', 'wardrobeHead', '#dba681'], ['wardrobeHeadBronze', 'wardrobeHead', '#a66d50'],
  ['wardrobeHeadUmber', 'wardrobeHead', '#8f5d48'], ['wardrobeHeadTan', 'wardrobeHead', '#c08f70'],
];
for (const [id, source, color] of cosmeticGlyphTints) COSMETIC_GLYPHS[id] = {
  ops: COSMETIC_GLYPHS[source].ops.map(op => op.role === 'base' ? { ...op, color } : { ...op }),
};
