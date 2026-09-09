import { registerMapFeature, type FeatureFinder } from '../world/atlas';

const names = { first: ['Still', 'Silver', 'Hollow', 'Black', 'Windworn', 'Hidden', 'Grey', 'Old'], second: ['Water'] };
const land = (salt: number, span: number, chance: number, min: number, max: number): Extract<FeatureFinder, { kind: 'strewn' }> =>
  ({ kind: 'strewn', span, chance, salt, jitter: 0.7, gates: [{ axis: 'elevation', min, max }] });
for (const row of [
  { id: 'pond', label: 'pond', locale: 'woodland_pond', glyph: 'lake', color: '#70a99c', find: land(0x901d, 820, 0.44, 0.1, 0.62), size: 28, reach: 145, words: ['Pond', 'Pool'], read: 'a sheltered pool with wooded shores and a small island' },
  { id: 'inland_lake', label: 'inland lake', locale: 'lake_shores', glyph: 'lake', color: '#5fa6d9', find: land(0x1a4e, 1500, 0.40, 0.1, 0.55), size: 76, reach: 220, words: ['Lake', 'Mere', 'Loch'], read: 'open water, encircling shores, and an island reached by a narrow way' },
  { id: 'tarn', label: 'highland tarn', locale: 'alpine_tarn', glyph: 'lake', color: '#91b8d0', find: land(0x7a21, 980, 0.48, 0.55, 1), size: 40, reach: 170, words: ['Tarn', 'Mirror'], read: 'a high-country basin with rocky shores and sheltered hollows' },
  { id: 'valley', label: 'valley', locale: 'green_valley', glyph: 'hill', color: '#9cac72', find: land(0x7a11, 1100, 0.45, 0.1, 0.50), size: 54, reach: 190, words: ['Vale', 'Valley'], read: 'broad low ground branches toward a sheltered head and a rocky overlook' },
  { id: 'hills', label: 'hills', locale: 'wind_hills', glyph: 'hill', color: '#c4b78c', find: land(0x4115, 1050, 0.48, 0.42, 0.74), size: 52, reach: 180, words: ['Downs', 'Hills'], read: 'winding ridges, open crests, and a cavern route through the hollow' },
  { id: 'canyon', label: 'canyon', locale: 'dry_canyon', glyph: 'ruin', color: '#be956d', find: { ...land(0xca170, 1150, 0.45, 0.38, 0.80), gates: [{ axis: 'elevation', min: 0.38, max: 0.80 }, { axis: 'moisture', max: 0.50 }] } as FeatureFinder, size: 56, reach: 190, words: ['Canyon', 'Narrows'], read: 'stone narrows divide the direct route from a winding shelf bypass' },
]) registerMapFeature({ id: row.id, label: row.label, icon: row.glyph === 'lake' ? '◉' : '⛰',
  glyph: row.glyph, color: row.color, find: row.find, reach: row.reach, size: row.size,
  destination: { locale: row.locale }, names: { ...names, second: row.words }, read: row.read });

for (const row of [
  { id: 'headwaters', label: 'headwaters', locale: 'spring_headwaters', progress: [0.02, 0.16], salt: 0x5a21, words: ['Springs', 'Headwaters'], read: 'narrow spring-fed channels, stone hollows, and a cave near the source' },
  { id: 'ford', label: 'river ford', locale: 'river_ford', progress: [0.18, 0.42], salt: 0xf02d, words: ['Ford', 'Crossing'], read: 'a shallow reach with several approaches across the stream' },
  { id: 'gorge', label: 'river gorge', locale: 'river_gorge', progress: [0.40, 0.68], salt: 0x6026e, words: ['Gorge', 'Defile'], read: 'a broadening river between broken ribs of stone and a cavern bypass' },
  { id: 'river_isles', label: 'river islands', locale: 'river_islands', progress: [0.72, 0.96], salt: 0x151e5, words: ['Islands', 'Reaches'], read: 'wide lower waters, island pools, and branching bank routes' },
]) registerMapFeature({ id: row.id, label: row.label, icon: '≈', glyph: 'wave', color: '#7fb6d5',
  find: { kind: 'river-sites', minRun: 6, progress: row.progress as [number, number], chance: 0.65, salt: row.salt, interpolate: true },
  reach: 155, size: 42, destination: { locale: row.locale }, names: { ...names, second: row.words }, read: row.read });

registerMapFeature({ id: 'volcano', label: 'volcano', glyph: 'summit', icon: '⛰', color: '#b7a698',
  find: land(0x701ca10, 1500, 0.48, 0.56, 1), reach: 220, size: 64,
  names: { first: ['Cinder', 'Sleeping', 'Ashen', 'Ember', 'Red', 'Hollow'], second: ['Crown', 'Mountain', 'Caldera', 'Throat'] },
  destination: { locale: 'volcano_caldera' }, activity: 'volcanism',
  inherit: { relief: { lift: 0.16, dome: 0.30 } },
  read: 'a sleeping mountain with a crater rim and lava tubes; tremors warn before its next eruption' });
