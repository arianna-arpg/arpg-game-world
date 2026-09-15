import type { LookDef } from '../render/vis/parts';

interface CosmeticModelRow { id: string; name: string; color: string; description: string; body: LookDef }
export const EXPANDED_COSMETIC_MODELS: CosmeticModelRow[] = [
  { id: 'fern_huntress', name: 'Fernveil Huntress', color: '#80a279',
    description: 'A female ranger with a silver braid, a feather-cut forest cape and a recurved bow.', body: { parts: [
      { kind: 'wardrobeFeatherCape' }, { kind: 'wardrobeCoat', scale: .7 },
      { kind: 'wardrobeBow', y: -.9, rot: .3 }, { kind: 'wardrobeHeadBronze' },
      { kind: 'wardrobeBraidSilver', scale: .85, y: .15 }, { kind: 'hood', x: .08, scale: .58 },
    ] } },
  { id: 'tide_corsair', name: 'Tideglass Corsair', color: '#6c9db8',
    description: 'A female corsair in a sea-blue split coat, with copper hair, a sweeping tricorn and a curved blade.', body: { parts: [
      { kind: 'wardrobeCoat' }, { kind: 'sword', y: -.82, rot: -.3 },
      { kind: 'wardrobeHeadTan' }, { kind: 'wardrobeHairCopper', scale: .8, x: -.13 },
      { kind: 'wardrobeTricorn', x: .17, scale: .92 },
    ] } },
  { id: 'sun_dancer', name: 'Sundancer Adept', color: '#dbab60',
    description: 'A female martial artist with a high dark ponytail, a light split tunic and paired sun-ring blades.', body: { parts: [
      { kind: 'wardrobeCoat', scale: .73 }, { kind: 'torso', scale: .58, role: 'cloth' },
      { kind: 'wardrobeChakram', y: -.83 }, { kind: 'wardrobeChakram', y: .83 },
      { kind: 'wardrobeHeadUmber' }, { kind: 'wardrobePonytail', scale: .9, x: .04 },
      { kind: 'wardrobeDiadem', scale: .65, x: .15 },
    ] } },
  { id: 'winter_matriarch', name: 'Winter Matriarch', color: '#a1b8d8',
    description: 'A female sovereign with pale flowing hair, a layered winter gown and a high crystalline collar.', body: { parts: [
      { kind: 'wardrobeGown', scale: 1.08 }, { kind: 'wardrobeFrostCollar' },
      { kind: 'staff', y: -.96, params: { orb: true } },
      { kind: 'wardrobeHeadWarm' }, { kind: 'wardrobeHairSilver', scale: .85, x: -.15 },
      { kind: 'wardrobeDiadem', scale: 1.05 },
    ] } },
];
export const COSMETIC_WISPS: CosmeticModelRow[] = [
  { id: 'lunar_moth', name: 'Lunar Moth', color: '#c6b5ef', description: 'A drifting spirit moth, with luminous eyes on translucent wings.',
    body: { parts: [{ kind: 'wispMoth' }], live: [{ kind: 'wisps', scale: 1.15, alpha: .5 }], shadowScale: .25 } },
  { id: 'guiding_lantern', name: 'Guiding Lantern', color: '#ecc689', description: 'A little lantern soul, warm light carried in an ethereal cage.',
    body: { parts: [{ kind: 'wispLantern' }], shadowScale: .25 } },
  { id: 'wandering_prism', name: 'Wandering Prism', color: '#8fd9de', description: 'A faceted mote with twin ribbons of light. Your vessel between lives.',
    body: { parts: [{ kind: 'wispPrism' }], shadowScale: .25 } },
];
export const COSMETIC_WISP_LOOKS: Record<string, LookDef> = Object.fromEntries(COSMETIC_WISPS.map(m => [`cosmetic_wisp_${m.id}`, m.body]));
