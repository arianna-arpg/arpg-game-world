// ---------------------------------------------------------------------------
// TOWN-BUILDING FRAMEWORK — THE TOWN THAT GROWS (docs/design/town-growth.md).
//
// Lastlight is a LADDER. Its size derives from how many town STATIONS the
// account owns (TOWN_TIERS — count-based, so no unlock order matters and every
// purchase pushes the town toward its next stage), and every seat in it —
// the base buildings, the plaza's waypoint, each station, the residents'
// cottages, the brook's course — is a per-tier row in ONE site table
// (TOWN_SITES) read through ONE resolver (townSiteAt). The fixture raised at a
// site, the World's `near*` dwell check, the NPC spawn and the renderer's
// prompt all read the same row, so drawn == dwelt by construction and no seat
// is ever derived from the arena's size (the retired centre formulas walked
// the waypoint into the bounty board's disc the moment the town grew).
//
// THE QUARTER LAW: a site keeps its compass quarter across tiers — it may
// slide OUTWARD as the ground stretches, never cross town — so the player's
// mental map survives every unlock. THE APRON LAW: no station's dwell disc may
// contain an arrival apron (any side — the road's side is rolled per run), a
// portal, or the waypoint. Both are pinned by balance/probe_towngrowth.ts over
// every tier × every side; the arrival latch (World.stationDwellArmed) stays
// the runtime backstop beneath them.
//
// Applied at World construction by CLONE-replace of the per-run town def —
// never mutating the static ZONES row (cloneZones shares the fixtures array
// by reference, so we always build fresh arrays). The tier reads ONCE at
// construction (a mid-run purchase takes effect next run, like every town
// feature); co-op reads the keeper's account.
//
// Adding a station = one TOWN_SITES row (its seat per tier) + one
// TOWN_ADDITIONS row (its feature + structure). Adding a tier = one
// TOWN_TIERS row + a coordinate per site.
// ---------------------------------------------------------------------------

import { FEATURE, type Account } from '../meta/account';
import type { StampSpec, ZoneDef } from './zones';

export interface Pt { x: number; y: number }

/** One rung of the size ladder. */
export interface TownTierDef {
  id: string;
  /** The stage's spoken name (the map card, the charter). */
  name: string;
  /** Owned town-station features needed to reach this stage (monotone). */
  stations: number;
  w: number;
  h: number;
  /** Scatter multiplier over the base ZONES row's layout counts (trees,
   *  grass, lanterns, benches…): a bigger stage dresses proportionally. */
  scatter: number;
  /** THE BROOK — the town's authored watercourse for this stage (retiring
   *  the random `river` stamp, which re-rolled against the arena size and
   *  could cut any station). A polyline in zone coordinates + the plank
   *  spans laid across it (path fractions). Absent = a dry stage. */
  brook?: { path: Pt[]; radius: [number, number]; spans: number[] };
}

/** THE SIZE LADDER (DIALs — every number unblessed). Count-based: the town
 *  stands at the highest rung whose `stations` the account meets. */
export const TOWN_TIERS: TownTierDef[] = [
  {
    id: 'hamlet', name: 'Lastlight, a hamlet', stations: 0, w: 1400, h: 1000, scatter: 1,
    brook: { path: [{ x: 0, y: 840 }, { x: 110, y: 880 }, { x: 200, y: 950 }, { x: 250, y: 1000 }], radius: [22, 28], spans: [0.5] },
  },
  {
    id: 'village', name: 'Lastlight, a village', stations: 2, w: 1700, h: 1200, scatter: 1.4,
    brook: { path: [{ x: 0, y: 900 }, { x: 130, y: 940 }, { x: 250, y: 1010 }, { x: 330, y: 1100 }, { x: 380, y: 1200 }], radius: [24, 30], spans: [0.5] },
  },
  {
    id: 'town', name: 'Lastlight, a town', stations: 5, w: 2100, h: 1500, scatter: 1.8,
    brook: { path: [{ x: 0, y: 1130 }, { x: 150, y: 1170 }, { x: 290, y: 1250 }, { x: 380, y: 1360 }, { x: 430, y: 1500 }], radius: [26, 32], spans: [0.5] },
  },
  {
    id: 'township', name: 'Lastlight, a township', stations: 8, w: 2600, h: 1800, scatter: 2.3,
    brook: { path: [{ x: 0, y: 1390 }, { x: 170, y: 1430 }, { x: 330, y: 1520 }, { x: 430, y: 1650 }, { x: 480, y: 1800 }], radius: [28, 34], spans: [0.5] },
  },
];

/** Every site the town seats. */
export type TownSiteId =
  | 'waking_house' | 'blacksmith' | 'inn' | 'cottage_west' | 'cellar_house' | 'wayside_camp'
  | 'plaza' | 'waypoint' | 'font'
  | 'salvage' | 'oracle' | 'bounty_board' | 'caravan' | 'recruiter' | 'quest_house'
  | 'campfire' | 'tracker' | 'training_yard'
  | 'mill_bank' | 'green' | 'cottage_1' | 'cottage_2' | 'cottage_3' | 'cottage_4' | 'cottage_5';

export interface TownSiteDef {
  id: TownSiteId;
  /** The compass quarter the site keeps (documentation + THE QUARTER LAW's
   *  probe: the site's bearing from the town centre stays in this quarter
   *  at every tier). */
  quarter: 'nw' | 'n' | 'ne' | 'w' | 'c' | 'e' | 'sw' | 's' | 'se';
  /** The seat per tier (index = TOWN_TIERS index). A site authored to fewer
   *  tiers than the ladder holds its LAST seat on the rungs above (the
   *  resolver clamps); a site that does not exist yet at a rung is null. */
  tiers: (Pt | null)[];
  /** A structure raised at the site by the TOWN ITSELF (base buildings,
   *  cottages, the plaza) — not by a station feature (those come through
   *  TOWN_ADDITIONS). */
  structure?: string;
  /** An open-air DWELL station's reach (the disc THE APRON LAW clears;
   *  mirrors the engine dial that governs the verb — probe-pinned live). */
  dwell?: number;
  /** A PRESS station's reach (the Font): the apron law clears it, but a
   *  press may overlap a dwell disc (its hint shows; nothing fires). */
  press?: number;
}

/** THE SITE TABLES. Coordinates are zone units at each tier's arena; the
 *  base tier is the hand-authored hamlet the ZONES row also carries (probe-
 *  pinned equal). Arrival aprons per tier sit 210 in from each side's
 *  midpoint (PORTAL_EDGE_INSET + the 120-unit entry step). */
export const TOWN_SITES: TownSiteDef[] = [
  // --- the base buildings (THE QUARTER LAW: each keeps its corner) ---------
  { id: 'waking_house', quarter: 'nw', structure: 'waking_house',
    tiers: [{ x: 210, y: 180 }, { x: 230, y: 200 }, { x: 250, y: 220 }, { x: 270, y: 240 }] },
  { id: 'blacksmith', quarter: 'nw', structure: 'blacksmith',
    tiers: [{ x: 450, y: 320 }, { x: 500, y: 360 }, { x: 600, y: 420 }, { x: 700, y: 480 }] },
  { id: 'inn', quarter: 'ne', structure: 'inn',
    tiers: [{ x: 960, y: 300 }, { x: 1120, y: 340 }, { x: 1350, y: 400 }, { x: 1620, y: 470 }] },
  { id: 'cottage_west', quarter: 'sw', structure: 'house_small',
    tiers: [{ x: 420, y: 700 }, { x: 400, y: 820 }, { x: 440, y: 1000 }, { x: 480, y: 1180 }] },
  //     (The cellar house keeps the WEST: at the hamlet it stands below the
  //      waking house, clear of the south road — the 1400-wide rung's south
  //      belongs to the training line and the road.)
  { id: 'cellar_house', quarter: 'w', structure: 'cellar_house',
    tiers: [{ x: 200, y: 400 }, { x: 660, y: 890 }, { x: 730, y: 1080 }, { x: 900, y: 1280 }] },
  { id: 'wayside_camp', quarter: 'se', structure: 'wayside_camp',
    tiers: [{ x: 1010, y: 670 }, { x: 1160, y: 760 }, { x: 1400, y: 900 }, { x: 1700, y: 1060 }] },

  // --- THE PLAZA (the plaza fold: civic ground, authored per tier) --------
  //     The waypoint (arrival) and the fountain square; nothing else claims
  //     the centre. The waypoint's old centre formula retired here.
  //     THE CENTRE CARVE: a fresh run's geometric entry is the arena's exact
  //     centre and generateLayout cuts every blocking prop within its
  //     portal clearance of that point — so the square stands a fountain's
  //     reach south-east of the crossing (probe-pinned), never ON it.
  { id: 'plaza', quarter: 'c', structure: 'plaza_square',
    tiers: [{ x: 730, y: 630 }, { x: 900, y: 700 }, { x: 1100, y: 850 }, { x: 1360, y: 1010 }] },
  { id: 'waypoint', quarter: 'c',
    tiers: [{ x: 630, y: 630 }, { x: 800, y: 700 }, { x: 1000, y: 850 }, { x: 1260, y: 1010 }] },

  // --- THE SMITH'S YARD (the crafting flow, west → east): break at the
  //     bench, buy/craft at Brandt's counter, commune at the stones, merge
  //     at the Font. The yard opens off the forge's open east + south faces.
  //     (At the hamlet the yard cannot form — the north road runs through
  //      it — so the bench stands south of the forge and the stones keep a
  //      corner past the inn; each rung from the village up seats the flow.)
  { id: 'salvage', quarter: 'w', dwell: 120,
    tiers: [{ x: 450, y: 480 }, { x: 460, y: 560 }, { x: 520, y: 640 }, { x: 600, y: 740 }] },
  { id: 'oracle', quarter: 'n', dwell: 120,
    tiers: [{ x: 1210, y: 330 }, { x: 720, y: 390 }, { x: 870, y: 450 }, { x: 1040, y: 520 }] },
  { id: 'font', quarter: 'n', press: 150,
    tiers: [{ x: 740, y: 400 }, { x: 920, y: 440 }, { x: 1090, y: 530 }, { x: 1200, y: 620 }] },

  // --- THE INN SQUARE: the bounty alcove beside Mireille's door (restock,
  //     turn in, take the next writ — one stop), the caravan north of the
  //     inn, the recruiter's corner beyond it. (At the hamlet the nook
  //     stands WEST of the door — the east apron is too close; from the
  //     village up it stands east, and the door lane rides its west side.)
  { id: 'bounty_board', quarter: 'e', dwell: 120,
    tiers: [{ x: 850, y: 470 }, { x: 1230, y: 520 }, { x: 1470, y: 600 }, { x: 1760, y: 680 }] },
  { id: 'caravan', quarter: 'ne', dwell: 160,
    tiers: [{ x: 1260, y: 140 }, { x: 1300, y: 110 }, { x: 1560, y: 130 }, { x: 1880, y: 150 }] },
  { id: 'recruiter', quarter: 'e', dwell: 160,
    tiers: [{ x: 1300, y: 930 }, { x: 1560, y: 300 }, { x: 1900, y: 340 }, { x: 2350, y: 380 }] },
  { id: 'quest_house', quarter: 'e', dwell: 150,
    tiers: [{ x: 1260, y: 760 }, { x: 1450, y: 800 }, { x: 1780, y: 940 }, { x: 2150, y: 1080 }] },

  // --- THE SOUTH: the hearth, the training line; THE WEST: the tracker ---
  { id: 'campfire', quarter: 's', dwell: 80,
    tiers: [{ x: 880, y: 785 }, { x: 1000, y: 975 }, { x: 930, y: 1180 }, { x: 1160, y: 1400 }] },
  { id: 'tracker', quarter: 'w', dwell: 120,
    tiers: [{ x: 150, y: 680 }, { x: 200, y: 770 }, { x: 220, y: 930 }, { x: 240, y: 1100 }] },
  // (The hamlet's line straddles the south road: the rack ends and the
  //  gauntlet begins either side of the portal's column, a body's width
  //  clear of the ring — the 1400-wide rung cannot hold a 690-unit line
  //  anywhere else; from the village up the line stands east of the road.)
  { id: 'training_yard', quarter: 's',
    tiers: [{ x: 390, y: 880 }, { x: 550, y: 1085 }, { x: 1250, y: 1330 }, { x: 1500, y: 1620 }] },

  // --- THE BROOK'S FAR BANK: a mill, from the village up ------------------
  { id: 'mill_bank', quarter: 'sw', structure: 'mill_bank',
    tiers: [null, { x: 130, y: 1090 }, { x: 140, y: 1320 }, { x: 160, y: 1600 }] },

  // --- THE WARD: cottages for the souls the Boroughs send home (data/
  //     boroughs.ts TOWN_RESIDENTS) — the ground stands from the town stage;
  //     the folk arrive as the account's sheltered count climbs.
  { id: 'green', quarter: 'se', structure: 'town_green',
    tiers: [null, null, { x: 1755, y: 1200 }, { x: 2170, y: 1400 }] },
  { id: 'cottage_1', quarter: 'se', structure: 'house_small',
    tiers: [null, null, { x: 1950, y: 1180 }, { x: 2380, y: 1380 }] },
  { id: 'cottage_2', quarter: 'se', structure: 'house_small',
    tiers: [null, null, { x: 1560, y: 1200 }, { x: 1960, y: 1380 }] },
  { id: 'cottage_3', quarter: 's', structure: 'house_small',
    tiers: [null, null, null, { x: 1560, y: 1260 }] },
  { id: 'cottage_4', quarter: 'e', structure: 'house_small',
    tiers: [null, null, null, { x: 2380, y: 700 }] },
  { id: 'cottage_5', quarter: 's', structure: 'house_small',
    tiers: [null, null, null, { x: 1120, y: 1600 }] },
];

const SITE_BY_ID: Map<string, TownSiteDef> = new Map(TOWN_SITES.map(s => [s.id, s]));

export function townSiteDef(id: TownSiteId): TownSiteDef {
  const s = SITE_BY_ID.get(id);
  if (!s) throw new Error(`townBuild: unknown town site '${id}'`);
  return s;
}

/** THE ONE RESOLVER: a site's seat at a tier (null = the site does not
 *  exist at that stage). A site authored short of the ladder holds its last
 *  seat on the rungs above. */
export function townSiteAt(tier: number, id: TownSiteId): Pt | null {
  const s = townSiteDef(id);
  const t = Math.max(0, Math.min(tier, s.tiers.length - 1));
  const p = s.tiers[t];
  return p ? { x: p.x, y: p.y } : null;
}

/** The town-station features: every TOWN_ADDITIONS row's flag (the count the
 *  ladder reads — derived, never a second list). */
export function townStationFeatures(): string[] {
  return TOWN_ADDITIONS.map(a => a.feature);
}

/** How many town stations the account owns. */
export function townStationCount(account: Account): number {
  return townStationFeatures().filter(f => account.features.has(f)).length;
}

/** The ladder rung the account stands on (index into TOWN_TIERS). */
export function townTier(account: Account): number {
  const n = townStationCount(account);
  let tier = 0;
  for (let i = 0; i < TOWN_TIERS.length; i++) if (n >= TOWN_TIERS[i].stations) tier = i;
  return tier;
}

/** A site's seat for the account's tier (the resolver, account-keyed). */
export function townSiteOf(account: Account, id: TownSiteId): Pt | null {
  return townSiteAt(townTier(account), id);
}

export interface TownAddition {
  /** The account FEATURE flag that enables this addition. */
  feature: string;
  /** The structures the feature raises, each at a town SITE (+ an offset in
   *  zone units — the structure's own footprint centred on the seat). */
  fixtures: { structure: string; site: TownSiteId; dx?: number; dy?: number }[];
}

export const TOWN_ADDITIONS: TownAddition[] = [
  // The Quest Package: the quartermaster's house in the east quarter.
  { feature: FEATURE.QUEST_GIVER, fixtures: [{ structure: 'quest_house', site: 'quest_house' }] },
  // The Training Dummy's yard — the south line (the rack + gauntlet run east
  // of the post; World spawns the bodies at the same site).
  { feature: FEATURE.TARGET_DUMMY, fixtures: [{ structure: 'training_yard', site: 'training_yard' }] },
  // The Campfire — south of the plaza. Dwell to refresh the wilds.
  { feature: FEATURE.CAMPFIRE, fixtures: [{ structure: 'campfire_site', site: 'campfire' }] },
  // The Caravan — north of the inn. Gated on the BASE Caravan tier; higher
  // tiers only widen the menu, never the town.
  { feature: FEATURE.CARAVAN, fixtures: [{ structure: 'caravan', site: 'caravan' }] },
  // The Salvage Station — the smith's yard: break your loot, then spend it
  // at Brandt's counter a few steps away.
  { feature: FEATURE.SALVAGE_STATION, fixtures: [{ structure: 'salvage_bench', site: 'salvage' }] },
  // THE BOUNTY BOARD — its own ALCOVE beside the inn door (a roofed reading
  // nook: the board, a lantern, benches — a locale, not one post).
  { feature: FEATURE.BOUNTY_BOARD, fixtures: [{ structure: 'bounty_alcove', site: 'bounty_board' }] },
  // The Tracker's camp — the west edge, half in the wilds.
  { feature: FEATURE.TRACKER, fixtures: [{ structure: 'wayside_camp', site: 'tracker' }] },
  // The Oracle Stone — the smith's yard, off the forge's open east face.
  { feature: FEATURE.ORACLE_STONE, fixtures: [{ structure: 'oracle_site', site: 'oracle' }] },
  // The Mercenary Recruiter — no structure of his own (World seats the
  // officer + banner at the site); the town grows so his corner exists.
  { feature: FEATURE.MERC_RECRUITER, fixtures: [] },
];

/** THE TRAVELED WAYS — paved lanes joining the sites the player walks between
 *  most, laid as authored courses that follow the sites across tiers (no
 *  per-tier coordinates: a way is a list of sites). The forge way IS the
 *  crafting flow, walked in order. */
export interface TownWay {
  id: string;
  /** The ground laid (a registered walk-only kind: paved_way, road). */
  lay: string;
  /** The rungs this lane exists on (inclusive; absent = every rung). The
   *  hamlet lays its own short lanes — its stones stand past the inn and
   *  its nook west of the door, so the village's lanes would zig-zag. */
  from?: number;
  until?: number;
  points: { site: TownSiteId; dx?: number; dy?: number }[];
}

export const TOWN_WAYS: TownWay[] = [
  // Every way leaves the square from beside the WAYPOINT (the plaza's west
  // half) or east of the fountain — never through the fountain square, whose
  // props the clearway sweep would otherwise route out from under the lane.
  // THE FORGE WAY is the crafting flow, walked: Font → stones → bench.
  { id: 'forge_way', lay: 'paved_way', from: 1,
    points: [{ site: 'waypoint', dy: -70 }, { site: 'font', dy: 50 }, { site: 'oracle', dy: 76 }, { site: 'salvage', dx: 70 }] },
  { id: 'hamlet_forge_way', lay: 'paved_way', until: 0,
    points: [{ site: 'waypoint', dy: -70 }, { site: 'font', dy: 50 }, { site: 'salvage', dx: 70 }] },
  // THE INN WAY ends at the nook's open front (the reading stop); THE DOOR
  // LANE runs up the nook's free side to Mireille's door.
  { id: 'inn_way', lay: 'paved_way',
    points: [{ site: 'plaza', dx: 175 }, { site: 'bounty_board', dy: 84 }] },
  { id: 'door_way', lay: 'paved_way', from: 1,
    points: [{ site: 'bounty_board', dx: -125, dy: 60 }, { site: 'inn', dx: 13, dy: 108 }] },
  { id: 'hamlet_door_way', lay: 'paved_way', until: 0,
    points: [{ site: 'bounty_board', dx: 125, dy: 60 }, { site: 'inn', dx: 13, dy: 108 }] },
  { id: 'hearth_way', lay: 'paved_way',
    points: [{ site: 'waypoint', dy: 110 }, { site: 'campfire', dx: -40, dy: -40 }] },
];

/** The fixtures the TOWN ITSELF raises at a tier: every site row carrying a
 *  structure that exists at the rung. (The ZONES row's own fixtures are the
 *  base tier's authored copy — probe-pinned equal — so the def stays the
 *  truth anything reading ZONES directly sees.) */
export function townBaseFixtures(tier: number): { structure: string; x: number; y: number }[] {
  const out: { structure: string; x: number; y: number }[] = [];
  for (const s of TOWN_SITES) {
    if (!s.structure) continue;
    const p = townSiteAt(tier, s.id);
    if (p) out.push({ structure: s.structure, x: p.x, y: p.y });
  }
  return out;
}

/** The layout rows for a tier: the base row's scatter scaled by the rung,
 *  the brook, and the traveled ways (authored `course` stamps). */
export function townLayoutFor(tier: number, base: StampSpec[]): StampSpec[] {
  const t = TOWN_TIERS[Math.max(0, Math.min(tier, TOWN_TIERS.length - 1))];
  const rows: StampSpec[] = base.map(r => ({
    ...r,
    count: [Math.round(r.count[0] * t.scatter), Math.round(r.count[1] * t.scatter)] as [number, number],
  }));
  if (t.brook) {
    rows.push({ kind: 'course', count: [1, 1], path: t.brook.path.map(p => ({ ...p })),
      radius: t.brook.radius, lay: 'water', spans: [...t.brook.spans] });
  }
  for (const w of TOWN_WAYS) {
    if ((w.from !== undefined && tier < w.from) || (w.until !== undefined && tier > w.until)) continue;
    const path: Pt[] = [];
    for (const pt of w.points) {
      const p = townSiteAt(tier, pt.site);
      if (!p) { path.length = 0; break; }
      path.push({ x: p.x + (pt.dx ?? 0), y: p.y + (pt.dy ?? 0) });
    }
    if (path.length >= 2) rows.push({ kind: 'course', count: [1, 1], path, radius: [16, 20], lay: w.lay });
  }
  return rows;
}

/** Build the per-run town def for the account's tier: the tier's size, the
 *  town's own fixtures at their tier seats, every owned addition's fixtures
 *  at THEIR sites, and the tier's layout. Returns a NEW def. */
export function expandedTown(account: Account, base: ZoneDef): ZoneDef {
  const tier = townTier(account);
  const t = TOWN_TIERS[tier];
  let fixtures = townBaseFixtures(tier);
  for (const add of TOWN_ADDITIONS) {
    if (!account.features.has(add.feature)) continue;
    for (const f of add.fixtures) {
      const p = townSiteAt(tier, f.site);
      if (!p) continue;
      fixtures = [...fixtures, { structure: f.structure, x: p.x + (f.dx ?? 0), y: p.y + (f.dy ?? 0) }];
    }
  }
  return { ...base, size: { w: t.w, h: t.h }, fixtures, layout: townLayoutFor(tier, base.layout) };
}
