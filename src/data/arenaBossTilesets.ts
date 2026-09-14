import type { TilesetDef } from './tilesets';
import type { DoodadVisualDef } from '../render/vis/painters';

/** One shared floor contract, three regional palettes. The sidezone registry
 * owns which boss occupies it; the layout knows nothing about monster ids. */
const court = (id: string, accent: string, floor: string, wall: string): TilesetDef => ({
  id, frontier: false, perfProbe: true, sky: 'sheltered', camera: 'zone',
  nameFirst: ['Silent'], nameSecond: ['Court'],
  sizeW: [1080, 1080], sizeH: [1080, 1080], ellipseChance: 0,
  forceLayout: 'arena_court', caveLayouts: { arena_court: 1 },
  layoutParams: { courtMargin: 70, courtSeat: { x: 0.5, y: 0.18 } },
  theme: { floor, grid: floor, border: wall, obstacle: wall, obstacleEdge: accent,
    accent, wall, ambientDark: 0.2 },
  layout: [], packs: { count: [0, 0], size: [1, 1], table: [{ id: 'skeleton_warrior', weight: 1 }] },
  spawnerId: 'bone_altar', objectives: [{ kind: 'clear', weight: 1 }],
});

export const ARENA_BOSS_TILESETS: Record<string, TilesetDef> = {
  arena_boss_ossuary: court('arena_boss_ossuary', '#c5ac80', '#282524', '#51483c'),
  arena_boss_kiln: court('arena_boss_kiln', '#ee945c', '#2a2323', '#51403a'),
  arena_boss_sump: court('arena_boss_sump', '#a8bc69', '#202b28', '#3b4a3e'),
};

export const ARENA_BOSS_DOORS: Record<string, DoodadVisualDef> = Object.fromEntries(
  Object.values(ARENA_BOSS_TILESETS).map(ts => [`${ts.id}_gate`, {
    painter: 'caveMouth', order: 55,
    params: { color: '#363535', edge: ts.theme.accent, material: 'stone',
      glow: ts.theme.accent, throat: '#111318' },
    light: { radius: -2, color: ts.theme.accent, intensity: 0.3, flicker: 1.1 },
  }]),
);
