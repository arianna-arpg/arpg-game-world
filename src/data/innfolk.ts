// ---------------------------------------------------------------------------
// THE FOLK ROSTER — rostered townsfolk as data (the living town's second
// lever, beside THE HAUNT — engine/ai.ts updateHaunt).
//
// A structure may declare FOLK SEATS (StructureDef.folk): a seat names a POOL
// and a stand (an offset, a story, a chance). At every zone load the world
// rolls each seat — a ROW from the pool by weight, a NAME, a COLOUR and a
// LINE from the row's own lists — on a seed of (zone, seat, DAY), so
// the same guests keep their chairs through one day and the next dawn deals
// new faces: the inn is inhabited, and its company turns. The bodies are
// STROLLING SCENERY (passive + a haunt): untargeted, uncounted, unshoved,
// and alive between the furniture their row names.
//
// A pool is a registry entry (registerFolkPool): every row mints ONE
// MonsterDef (`folk_<pool>_<row>`) into the roster the moment it registers
// (the Mu hub's apparition idiom), so a pool anywhere — a chapel's
// congregation, a port's dockhands, a manor's household — is a data file
// away. Rows carry no world knowledge; the world carries the seed.
// ---------------------------------------------------------------------------

import { MONSTERS, type MonsterDef } from './monsters';
import type { HauntSpec } from '../engine/brain';

/** One kind of guest a pool may seat. */
export interface FolkRow {
  id: string;
  /** Roll weight within the pool (default 1). */
  weight?: number;
  /** Names the body may wear (one rolled per seating). */
  names: string[];
  /** The look (data/looks.ts npc_* rows) and the colours it may wear. */
  look: string;
  colors: string[];
  /** Lines the body may speak (one rolled per seating — the spoken seat;
   *  THE SPEECH GRAMMAR keeps every one as the body's own slotless
   *  templates, the rolled one its FIRST WORD). */
  lines: string[];
  /** THE SPEECH GRAMMAR's role pools this row draws its talk from
   *  (data/speechGrammar.ts — 'patron', 'traveler', 'merchant' …). */
  roles?: string[];
  /** Where it drifts (BehaviorSpec.haunt — the furniture it keeps to). */
  haunt: HauntSpec;
  /** Walking pace (default FOLK_CFG.moveSpeed). */
  moveSpeed?: number;
  radius?: number;
}

export interface FolkPool { id: string; rows: FolkRow[] }

export const FOLK_CFG = {
  moveSpeed: 62,
  radius: 12,
  /** The rostered body's def id shape. */
  defId: (pool: string, row: string): string => `folk_${pool}_${row}`,
};

const FOLK_POOLS: Record<string, FolkPool> = {};

/** Register a pool: its rows' defs mint into MONSTERS at once (passive,
 *  invulnerable strolling scenery wearing the row's haunt), so validation
 *  and the bestiary's exclusions read them like any townsfolk. */
export function registerFolkPool(id: string, rows: FolkRow[]): void {
  if (FOLK_POOLS[id]) console.warn(`[innfolk] re-registering folk pool '${id}' — overriding`);
  FOLK_POOLS[id] = { id, rows };
  for (const r of rows) {
    const defId = FOLK_CFG.defId(id, r.id);
    const def: MonsterDef = {
      id: defId, name: r.names[0] ?? 'Guest',
      color: r.colors[0] ?? '#b0a090', shape: 'circle', radius: r.radius ?? FOLK_CFG.radius, look: r.look, npcRole: 'resident',
      ...(r.roles ? { speechRoles: r.roles } : {}),
      base: { life: 100, moveSpeed: r.moveSpeed ?? FOLK_CFG.moveSpeed, mana: 0 },
      skills: [],
      xp: 0,
      passive: true,
      invulnerable: true,
      brain: { behavior: { haunt: r.haunt } },
    };
    MONSTERS[defId] = def;
  }
}

export function folkPool(id: string): FolkPool | undefined { return FOLK_POOLS[id]; }
export function folkPoolIds(): string[] { return Object.keys(FOLK_POOLS); }

/** One seating rolled off a pool: the def to mint, the name it wears, the
 *  colour it wears (per body — the def's is only the first), the line it
 *  speaks. `rnd` is the caller's stream (the world seeds it per seat + day).
 *  Null on an unknown or empty pool. */
export function rollFolk(poolId: string, rnd: () => number): { defId: string; row: FolkRow; name: string; color: string; line: string } | null {
  const pool = FOLK_POOLS[poolId];
  if (!pool || !pool.rows.length) return null;
  const total = pool.rows.reduce((s, r) => s + (r.weight ?? 1), 0);
  let t = rnd() * total;
  let row = pool.rows[pool.rows.length - 1];
  for (const r of pool.rows) { t -= r.weight ?? 1; if (t <= 0) { row = r; break; } }
  const pick = <T>(xs: T[], fb: T): T => xs.length ? xs[Math.min(xs.length - 1, Math.floor(rnd() * xs.length))] : fb;
  return {
    defId: FOLK_CFG.defId(poolId, row.id), row,
    name: pick(row.names, 'Guest'),
    color: pick(row.colors, row.colors[0] ?? '#b0a090'),
    line: pick(row.lines, ''),
  };
}

// --- THE INN'S POOLS (the debut) ------------------------------------------------
// The common room's company drifts between the bar, the tables, the benches
// and the hearth; the lodgers above keep between the bed, the washstand,
// the dresser and the chest. Every line is in the world's own voice — a
// guest tells you something about the country, never about the menu.

const COMMON: HauntSpec = { kinds: ['bar_counter', 'tavern_table', 'bench', 'hearth', 'chair', 'keg'], reach: 250, linger: [6, 16] };
const ROOMS: HauntSpec = { kinds: ['bed', 'washstand', 'dresser', 'linen_chest', 'shelf', 'candle_stand', 'bench'], reach: 260, linger: [8, 20] };

registerFolkPool('inn_common', [
  { id: 'drover', weight: 3, roles: ['patron', 'traveler'], look: 'npc_trader', colors: ['#b89a6a', '#8a7a52', '#a08860'],
    names: ['Corran Vale', 'Old Hesk', 'Wenna Tull', 'Bryce Adair'],
    lines: [
      'Drove forty head down from the fells. Lost two to the dark. Mireille poured for the rest of us.',
      'The road past the crossroads is quieter than it was. That worries me more than the noise did.',
      'If you see a fold with the gate torn off, that one was mine.',
    ], haunt: COMMON },
  { id: 'tinker', weight: 2, roles: ['patron', 'merchant'], look: 'npc_smith', colors: ['#8a8a7a', '#6a7a8a'],
    names: ['Pim Sallow', 'Juna Wick', 'Fennick'],
    lines: [
      'Kettles mended, pots patched. The ones that come back from the wilds need it most.',
      'Brandt won’t touch a pot. Says the bench is for steel. So I sit here.',
    ], haunt: COMMON },
  { id: 'pilgrim', weight: 2, roles: ['patron', 'pilgrim'], look: 'npc_scholar', colors: ['#c8c0b0', '#a8a090'],
    names: ['Sister Aude', 'Brother Talen', 'Mothwyn'],
    lines: [
      'Walking to every waypoint before I die. Yours burns warm.',
      'The Font drank a gem from me once. I still dream the colour.',
    ], haunt: COMMON },
  { id: 'courier', weight: 2, roles: ['patron', 'traveler'], look: 'npc_trader', colors: ['#6a8a9a', '#5a7a6a'],
    names: ['Tamsin Reed', 'Dace', 'Orrin Fell'],
    lines: [
      'Three writs in my satchel and none of them mine. The board out front pays better.',
      'I run the caravan road. Ask me where it isn’t safe, not where it is.',
    ], haunt: COMMON },
  { id: 'warden', weight: 2, roles: ['patron', 'warden'], look: 'npc_captain', colors: ['#8a6a5a', '#7a5a4a'],
    names: ['Halvard', 'Berrin Stane', 'Marta Coyle'],
    lines: [
      'Off the wall till dawn. The first ale is the only one that tastes of anything.',
      'Something walked the brook last night. Big. Didn’t cross. I counted the spans twice.',
    ], haunt: COMMON },
  { id: 'gambler', weight: 1, roles: ['patron'], look: 'npc_keeper', colors: ['#9a6a8a', '#7a5a8a'],
    names: ['Sly Kettering', 'Vinca Doule'],
    lines: [
      'Dice on the table, coin in the boot. Sit, if you have either.',
      'I never bet against the board. The board always collects.',
    ], haunt: COMMON },
]);

registerFolkPool('inn_rooms', [
  { id: 'scholar', weight: 2, roles: ['lodger', 'visitor'], look: 'npc_scholar', colors: ['#9aa8b8', '#8898a8'],
    names: ['Idris Maw', 'Perenna Voss', 'Lorcan Bede'],
    lines: [
      'Took the corner room for the light. The scratching in the walls keeps me company.',
      'I copy the runes off the vestiges. Mireille thinks I am mad. She is not wrong.',
    ], haunt: ROOMS },
  { id: 'merchant', weight: 2, roles: ['lodger', 'merchant'], look: 'npc_trader', colors: ['#c8a058', '#b09048'],
    names: ['Aldous Pring', 'Sabra Keel'],
    lines: [
      'Selling nothing till the caravan comes. A bed and a locked chest will do till then.',
      'Every room in this house creaks in a different key. I have learned all three.',
    ], haunt: ROOMS },
  { id: 'midwife', weight: 1, roles: ['lodger', 'visitor'], look: 'npc_keeper', colors: ['#c8b8a8', '#a89888'],
    names: ['Goody Marrow', 'Elsbet Crane'],
    lines: [
      'Two births in the ward this month. The town is deciding to live.',
      'Wash your hands before you touch anyone here. I mean it kindly.',
    ], haunt: ROOMS },
  { id: 'veteran', weight: 2, roles: ['lodger', 'mercenary'], look: 'npc_captain', colors: ['#6a6a5a', '#5a5a4a'],
    names: ['Cadoc', 'Rusk Anselm', 'Old Tebbe'],
    lines: [
      'Slept under a roof three nights running. I keep waking to check the door.',
      'The stair creaks on the fourth tread. Learn it. You will want to know who is coming up.',
    ], haunt: ROOMS },
]);
