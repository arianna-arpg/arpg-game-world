import assert from 'node:assert/strict';
import { ARTWORK_CATALOGUES, type ArtworkCatalogues } from '../src/ui/artworkCatalogues';
import { PASSIVE_TREE_ART_CFG as config, type PassiveTreeArtConfig } from '../src/ui/passiveTreeArtConfig';
import { selectPassiveTreeArtwork, type PassiveTreeArtContext } from '../src/ui/passiveTreeArtSelection';

const owner = (classId: string, ...vocations: string[]): PassiveTreeArtContext => ({
  subjects: { class: [classId], vocation: vocations }, variant: classId, color: '#ffffff',
});
const select = (context: PassiveTreeArtContext, cfg = config, catalogues = ARTWORK_CATALOGUES,
  urlFor = (src: string): string | undefined => src) => selectPassiveTreeArtwork(context, cfg, catalogues, urlFor);

assert.equal(select(owner('warrior'))?.catalogue, 'class');
assert.equal(select(owner('warrior', 'warbringer'))?.id, 'warbringer');
assert.equal(select(owner('warrior', 'warbringer'))?.catalogue, 'vocation');
assert.equal(select(owner('warrior'))?.id, 'warrior', 'removing a calling restores class art');
assert.equal(select(owner('warrior', 'future-calling'))?.id, 'warrior');
assert.equal(select(owner('future-class', 'future-calling')), undefined);

// Character-specific imagery comes from the shared catalogue, not renderer cases.
const summoner = select(owner('summoner', 'gravebinder'))!;
const necromancer = select(owner('necromancer', 'gravebinder'))!;
assert.equal(summoner.variant, 'summoner');
assert.match(summoner.url, /gravebinder-summoner\.webp/);
assert.notEqual(summoner.url, necromancer.url);
assert.equal(select(owner('warrior', 'gravebinder'))?.url, necromancer.url,
  'an earned cross-class calling is independent of website offer eligibility');
assert.equal(select(owner('summoner', 'gravebinder'), config, ARTWORK_CATALOGUES,
  src => src.includes('gravebinder-summoner') ? undefined : src)?.url, necromancer.url,
  'an unbundled variant falls back to the base image');
assert.equal(select(owner('warrior', 'warbringer'), config, ARTWORK_CATALOGUES,
  src => src.includes('/vocations/') ? undefined : src)?.catalogue, 'class');

const multiple = owner('ranger', 'wildstalker', 'greenwarden', 'future-calling');
const unchanged = JSON.stringify(multiple);
assert.equal(select(multiple)?.id, 'greenwarden', 'latest available earned calling wins');
const first: PassiveTreeArtConfig = { ...config, sources: [{ catalogue: 'vocation', order: 'first' }] };
assert.equal(select(multiple, first)?.id, 'wildstalker');
assert.equal(JSON.stringify(multiple), unchanged, 'selection never reorders saved identities');
assert.equal(select(multiple, { ...config, sources: [...config.sources].reverse() })?.catalogue, 'class');

// A third source works through the same public contract, including custom framing.
const extended: ArtworkCatalogues = { ...ARTWORK_CATALOGUES, patron: {
  moon: { src: 'moon.webp', alt: 'Moon patron' },
} };
const custom: PassiveTreeArtConfig = { ...config,
  sources: [{ catalogue: 'patron', order: 'first', style: { width: 480, opacity: 0.4 } }, ...config.sources],
  artworks: { 'patron:moon': { opacity: 0.5 }, 'class:spellblade': { width: 420 } },
};
const patron = select({ ...multiple, subjects: { ...multiple.subjects, patron: ['moon'] } }, custom, extended)!;
assert.equal(patron.catalogue, 'patron');
assert.equal(patron.url, 'moon.webp');
assert.equal(patron.style.width, 480);
assert.equal(patron.style.opacity, 0.5);
assert.equal(patron.style.height, config.defaults.height);
assert.equal(select(owner('spellblade'), custom)?.style.width, 420);
assert.equal(select(owner('magician', 'spellblade'), custom)?.style.width, config.defaults.width,
  'a class and calling with the same ID keep distinct framing');
assert.equal(select(owner('constructor', 'toString')), undefined);
assert.equal(select({ ...multiple, subjects: Object.create({ vocation: ['warbringer'] }) }), undefined);
console.log('PASS passive tree artwork: priorities, fallbacks, lineage variants, cross-class callings, multiple identities, extensible sources, framing and immutable state');
