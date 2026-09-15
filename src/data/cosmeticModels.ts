import type { LookDef } from '../render/vis/parts';
import { EXPANDED_COSMETIC_MODELS } from './cosmeticExpansionModels';

/** Cosmetic-only identities: no class, stats, skills, sex flags or actor mutation. */
export const COSMETIC_MODELS: { id: string; name: string; color: string; description: string; body: LookDef }[] = [
  ...EXPANDED_COSMETIC_MODELS,
  { id: 'moon_duelist', name: 'Mooncourt Duelist', color: '#798ebf',
    description: 'A feminine duelist with a silver braid, a fitted split-tail coat and a slender blade.',
    body: { parts: [
      { kind: 'wardrobeCoat' }, { kind: 'sword', x: .12, y: -.69, scale: .8 },
      { kind: 'wardrobeBraidSilver', y: .06 },
      { kind: 'wardrobeHeadWarm' },
      { kind: 'wardrobeHairSilver', scale: .54, x: .05 },
      { kind: 'wardrobeDiadem', scale: .82 },
    ] } },
  { id: 'rose_valkyrie', name: 'Roseguard Valkyrie', color: '#b56e87',
    description: 'A feminine guardian in broad rose-steel armor, with copper braids, a laurel crown and a heavy shield.',
    body: { parts: [
      { kind: 'wardrobeCoat', scale: .85 }, { kind: 'torso', role: 'metal', scale: .85 },
      { kind: 'pauldrons', scale: 1.05 }, { kind: 'sword', y: -.85, scale: .86 },
      { kind: 'shield', y: .95, scale: .9 },
      { kind: 'wardrobeBraidCopper', y: .12 },
      { kind: 'wardrobeBraidCopper', mirror: true, y: -.15 },
      { kind: 'wardrobeHeadBronze' },
      { kind: 'wardrobeHairCopper', scale: .48, x: .04 },
      { kind: 'wardrobeDiadem' }, { kind: 'laurelCrown', scale: .7, x: .06 },
    ] } },
  { id: 'veilweaver', name: 'Amethyst Veilweaver', color: '#a58acb',
    description: 'A feminine mystic with dark flowing hair, a sweeping layered gown and a jeweled moon staff.',
    body: { parts: [
      { kind: 'wardrobeGown' }, { kind: 'staff', y: -.92, params: { orb: true }, role: 'wood' },
      { kind: 'wardrobeHairDark', scale: 1.1, x: -.13 },
      { kind: 'wardrobeHeadUmber' },
      { kind: 'wardrobeHairDark', scale: .5, x: .12 },
      { kind: 'wardrobeDiadem', scale: 1.15 },
    ] } },
  { id: 'lantern_nomad', name: 'Lantern Nomad', color: '#7da79f',
    description: 'An androgynous traveler in a sea-green coat, with a cropped hood, weathered pack and warm lantern.',
    body: { parts: [
      { kind: 'wardrobeCoat', scale: 1.05 }, { kind: 'torso', x: -.45, scale: .64, role: 'wood' },
      { kind: 'wardrobeLantern', x: -.12, y: .42, color: '#edbc70' },
      { kind: 'staff', y: -.85, scale: .85 },
      { kind: 'wardrobeHeadTan' }, { kind: 'hood', x: .1, scale: .69 },
    ] } },
];
export const COSMETIC_LOOKS: Record<string, LookDef> = Object.fromEntries(COSMETIC_MODELS.map(m => [`cosmetic_${m.id}`, m.body]));
