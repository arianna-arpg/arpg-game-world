import { registerCosmetic, type CosmeticDef, type CosmeticSlot, type CosmeticPaint } from '../engine/cosmetics';

export const COSMETIC_CFG = {
  footprints: { spacing: 15, lifetime: 2.4, maxPerActor: 24, teleportDistance: 110 },
  effect: { radiusScale: 1.35, orbitCount: 5, opacity: 0.65 },
  cast: { radiusScale: 1.8, lifetime: 0.35, count: 5, opacity: 0.75, glintRadius: 3.5 },
  preview: { width: 360, height: 230 },
};

const add = (id: string, name: string, slot: CosmeticSlot, paint: CosmeticPaint,
  description: string, acquire: CosmeticDef['acquire'] = { kind: 'starter' }, collection = 'First Light'): void =>
  registerCosmetic({ id, name, slot, paint, description, acquire, collection, author: 'Hollow Wake' });

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
