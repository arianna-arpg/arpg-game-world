import { registerCosmetic, type CosmeticDef, type CosmeticSlot, type CosmeticPaint } from '../engine/cosmetics';
import { CLASSES } from './classes';
import { COSMETIC_MODELS } from './cosmeticModels';
import { COSMETIC_WISPS } from './cosmeticExpansionModels';
import { SUMMON_LEGACY_COSMETICS } from './summonCosmetics';

for (const cosmetic of SUMMON_LEGACY_COSMETICS) registerCosmetic(cosmetic);

export const COSMETIC_CFG = {
  footprints: { spacing: 15, lifetime: 2.4, maxPerActor: 24, teleportDistance: 110 },
  effect: { radiusScale: 1.35, orbitCount: 5, opacity: 0.65 },
  cast: { radiusScale: 1.8, lifetime: 0.35, count: 5, opacity: 0.75, glintRadius: 3.5 },
  preview: { width: 360, height: 230, summonRadius: 38 },
};

const add = (id: string, name: string, slot: CosmeticSlot, paint: CosmeticPaint,
  description: string, acquire: CosmeticDef['acquire'] = { kind: 'starter' }, collection = 'First Light'): void =>
  registerCosmetic({ id, name, slot, paint, description, acquire, collection, author: 'Hollow Wake' });

registerCosmetic({ id: 'legacy_golems', name: 'Legacy Golems', slot: 'skillSkin',
  description: 'The original stone, fire, ice, blood and bone golem designs. Wear them together, or keep a favorite on one summoning skill.',
  collection: 'Legacy Wardrobe', author: 'Hollow Wake', acquire: { kind: 'starter' },
  skills: ['summon_stone_golem', 'summon_fire_golem', 'summon_ice_golem', 'summon_blood_golem', 'summon_bone_golem'],
  paint: { summonBodies: {
    stone_golem: { look: 'golem', color: '#a8a090', material: 'stone' },
    fire_golem: { look: 'golem', color: '#e86a3a', material: 'ember' },
    ice_golem: { look: 'golem_ice', color: '#7ac8e8', material: 'ice' },
    blood_golem: { look: 'golem', color: '#b03848', material: 'flesh' },
    bone_golem: { look: 'bone_colossus', color: '#d8d0c0', material: 'bone' },
  } },
});

// Every class look participates automatically; wearing one grants no class progression.
for (const c of CLASSES) if (c.look) add(`model_${c.id}`, c.name, 'playerModel', { look: c.look, color: c.color },
  `Wear the ${c.name} model with any class. Your skills and attributes stay your own.`, { kind: 'starter' }, 'Class silhouettes');
for (const m of COSMETIC_MODELS) add(`model_${m.id}`, m.name, 'playerModel', { look: `cosmetic_${m.id}`, color: m.color },
  m.description, { kind: 'starter' }, 'Wanderers of the Wake');
for (const m of COSMETIC_WISPS) add(`wisp_${m.id}`, m.name, 'wispSkin', { look: `cosmetic_wisp_${m.id}`, color: m.color },
  m.description, { kind: 'starter' }, 'Souls of Mu');

add('portal_astral', 'Astral Iris', 'portalSkin', { portal: 'astral_iris' }, 'Counter-turning rings and five stars frame your passage.');
add('portal_runic', 'Runic Gate', 'portalSkin', { portal: 'runic_gate' }, 'Rotating hexagonal seals hold a doorway between places.');
add('portal_petals', 'Petal Door', 'portalSkin', { portal: 'petal_door' }, 'An unfurling wreath of blossoms encircles your passage.');
add('portal_rose', 'Rose Passage', 'portalRecolor', { color: '#edaccf' }, 'Color your Town Portal with soft rose light.');
add('portal_jade', 'Jade Passage', 'portalRecolor', { color: '#83e0b5' }, 'Color your Town Portal with living jade light.');
add('portal_gold', 'Golden Passage', 'portalRecolor', { color: '#f1cc82' }, 'Color your Town Portal with warm gold light.');
add('hotbar_moon', 'Moon Silver', 'hotbarSkin', { hotbar: 'moon_silver', color: '#c8e5f0' }, 'Silver-edged slots on a midnight rail, with star inlays.');
add('hotbar_rose', 'Rose Vellum', 'hotbarSkin', { hotbar: 'rose_vellum', color: '#e5b2cd' }, 'Rose borders and floral corner ornaments for your skills.');
add('hotbar_ember', 'Ember Forge', 'hotbarSkin', { hotbar: 'ember_forge', color: '#e9b575' }, 'Warm bronze frames and ember inlays for your skills.');
for (const [id, name, projectile, skills, description] of [
  ['flame_fletching', 'Flame Fletching', 'feathered_arrow', ['flame_arrow'], 'Flame Arrow becomes a feathered arrow with a blazing arrowhead.'],
  ['flame_sunlance', 'Sunlance Arrow', 'sun_lance', ['flame_arrow'], 'Flame Arrow becomes a long, luminous sun-metal dart.'],
  ['fireball_comet', 'Ember Comet', 'ember_comet', ['fireball'], 'Fireball becomes a bright comet wrapped in a flowing flame tail.'],
  ['crystal_projectiles', 'Crystal Flight', 'crystal_bolt', undefined, 'Dress projectile skills in gently turning crystal shards.'],
] as const) registerCosmetic({ id, name, slot: 'skillSkin', paint: { projectile }, skills,
  description, acquire: { kind: 'starter' }, collection: 'Flights of Fancy', author: 'Hollow Wake' });

registerCosmetic({ id: 'prismatic_ink', name: 'Prismatic Ink', slot: 'skillRecolor',
  paint: { color: '#c4b2f2' }, consume: { target: 'skillColor', starterCharges: 2 },
  acquire: { kind: 'credits', cost: 20 }, collection: 'Your own palette', author: 'Hollow Wake',
  description: 'Use one ink on a learned or account-unlocked skill to choose its color forever. Change that color as often as you like. Two inks are included with your account.' });

add('cinder_cloak', 'Cinderweave', 'playerSkin', { color: '#d89160', material: 'cloth' }, 'A warm woven mantle for a new journey.');
add('moon_glass', 'Moonglass', 'playerSkin', { color: '#8fd8e6', material: 'crystal', adorn: 'wings' }, 'Faceted moonlight with delicate crystalline wings.');
add('verdant_kin', 'Verdant Kin', 'summonSkin', { color: '#89bc82', material: 'verdant' }, 'Dress your summoned companions in living moss.');
add('astral_kin', 'Astral Kin', 'summonSkin', { color: '#b5a0ee', material: 'crystal' }, 'A constellation bound into every companion.',
  { kind: 'achievement', rows: [{ quest: true, label: 'Complete a quest' }], mode: 'all' }, 'Starbound');
add('waking_stars', 'Waking Stars', 'playerEffect', { color: '#c4b2f2', motif: 'stars' }, 'Five quiet stars circle their keeper.');
add('ember_crown', 'Ember Crown', 'playerEffect', { color: '#efa46a', motif: 'embers' }, 'An orbit of sparks earned by walking the world.',
  { kind: 'achievement', rows: [{ ledger: 'zones_explored', n: 5, label: 'Explore 5 zones' }], mode: 'all' }, 'Wayfarer');
add('petal_steps', 'Petal Steps', 'footprints', { color: '#dcb0cf', motif: 'petals' }, 'A brief trail of soft petals follows your steps.');
add('star_steps', 'Starfall Steps', 'footprints', { color: '#b6cafa', motif: 'stars' }, 'Leave fading constellations in your wake.',
  { kind: 'credits', cost: 35 }, 'Starbound');
add('ember_steps', 'Cinder Steps', 'footprints', { color: '#eea16e', motif: 'embers' }, 'Small, harmless embers mark where you have been.',
  { kind: 'achievement', rows: [{ ledger: 'zones_explored', n: 10, label: 'Explore 10 zones' }], mode: 'all' }, 'Wayfarer');
add('star_sigil', 'Evening Star', 'avatar', { color: '#c4b2f2', motif: 'stars' }, 'Your personal star, shown beside your character.');
add('petal_sigil', 'Wildflower', 'avatar', { color: '#e6bdd1', motif: 'petals' }, 'A small bloom to call your own.');
add('ember_sigil', 'Lastlight Ember', 'avatar', { color: '#edaa70', motif: 'embers' }, 'A keepsake of your first completed quest.',
  { kind: 'achievement', rows: [{ quest: true, label: 'Complete a quest' }], mode: 'all' }, 'Wayfarer');
add('starlit_skills', 'Starlit', 'skillSkin', { motif: 'stars' }, 'Star glints dress your skill casts and projectiles.');
add('bloom_skills', 'Wild Bloom', 'skillSkin', { motif: 'petals' }, 'Petals dress your skill casts and projectiles.',
  { kind: 'credits', cost: 25 }, 'Wayfarer');
add('moon_tint', 'Moonlit Blue', 'skillRecolor', { color: '#91d6ef' }, 'A cool blue color for your skills.');
add('rose_tint', 'Dusk Rose', 'skillRecolor', { color: '#e8a8ca' }, 'A dusky rose color for your skills.');
add('gold_tint', 'Dawn Gold', 'skillRecolor', { color: '#f1cb81' }, 'A golden color earned on the open road.',
  { kind: 'achievement', rows: [{ ledger: 'zones_explored', n: 3, label: 'Explore 3 zones' }], mode: 'all' }, 'Wayfarer');
