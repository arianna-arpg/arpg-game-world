// ---------------------------------------------------------------------------
// PROBE: THE TOWN THAT GROWS — Lastlight as a tiered charter
// (docs/design/town-growth.md v2, data/townBuild.ts, data/boroughs.ts).
//
// Boots the real engine headless and pins, over EVERY tier of the size
// ladder and EVERY arrival side the road may roll onto:
//   A. THE LADDER — count-based, monotone; the hamlet is the ZONES row.
//   B. THE ONE-TRUTH SITE LAW — every seat inside its arena; the resolver.
//   C. THE APRON LAW — no dwell disc contains an arrival apron, a portal or
//      the waypoint; from the village up no two dwell discs overlap.
//   D. THE QUARTER LAW — a site keeps its compass quarter across the ladder.
//   E. THE SMITH'S YARD + THE INN FRONT — the crafting flow reads west →
//      east through the forge, the Font a stride from the stones (THE
//      MAGICAL PAIR); the board front stands out front of the inn door,
//      wholly south of its wall, open air, dressed as a locale.
//   F. THE FOOTPRINTS — no two raised structures overlap at any tier; the
//      training line's bodies stand on open ground.
//   G. THE BROOK — the authored course keeps clear of every seat and apron;
//      no random river or fountain row survives on the base layout.
//   H. LIVE — a World at the hamlet and at the township: arena, fixtures,
//      the Font, the waypoint, the dummies, the tracker, the officer, the
//      board, the spans; every near* verb answers AT its site and refuses a
//      step past its dial (drawn == dwelt).
//   I. THE RESIDENTS — the ledger seats families at their doors once the
//      ward stands; the stamp lands on the account; the line speaks near.
//   J. THE INN'S FLOORS + THE INN KIT — the public house on the kit (a
//      rule + a face + a brush + a plan char per piece), the stair up into
//      the minted rooms above, the spoken seats (a plan npc's line).
// Run: npx tsx balance/probe_towngrowth.ts   (exit 0 = all PASS)
// ---------------------------------------------------------------------------

import { bootSimEngine, classById } from '../src/sim/arena';
import { resetActorIdCounter } from '../src/engine/actor';
import { World } from '../src/engine/world';
import { speechWindowFor } from '../src/engine/speech'; // THE TRANSIENT TELLING — a resident line's window (probe_speech rig J pins the clock)
import { buildManifest } from '../src/packages/manifest';
import { CLASSES } from '../src/data/classes';
import { FEATURE, LEDGER_SOULS_SHELTERED, makeAccount, type Account } from '../src/meta/account';
import { START_ZONE, ZONES } from '../src/data/zones';
import {
  TOWN_ADDITIONS, TOWN_SITES, TOWN_TIERS, expandedTown, townBaseFixtures, townLayoutFor,
  townSiteAt, townStationFeatures, townTier, type TownSiteId,
} from '../src/data/townBuild';
import { TOWN_RESIDENTS, noteSoulsSheltered, townResidentsHere } from '../src/data/boroughs';
import { STRUCTURES, legendCell } from '../src/data/structures';
import { MONSTERS } from '../src/data/monsters';
import { DOODAD_VISUALS } from '../src/data/doodadVisuals';
import { PAINTERS } from '../src/render/vis/painters';
import '../src/render/vis/paintersInn';
import { doodadRuleOf } from '../src/engine/levelgen';
import { tierFloorAt } from '../src/engine/tiers'; // (rig H — the door under the storey)
import { transitReach } from '../src/data/transit';
import { sidezoneOf } from '../src/data/sidezones';
import { updateAI } from '../src/engine/ai';
import { DAY_LENGTH } from '../src/world/daynight';
import { SALVAGE_CFG } from '../src/data/essences';
import { BOUNTY_BOARD_CFG } from '../src/data/bountyboard';
import { LEYLINE_CFG } from '../src/data/leyline';
import { PORTAL_EDGE_INSET, PORTAL_RADIUS } from '../src/engine/worldgen';

let failed = 0;
const check = (name: string, ok: boolean, detail = ''): void => {
  console.log(`${ok ? 'PASS' : 'FAIL'}  ${name}${detail ? ' — ' + detail : ''}`);
  if (!ok) failed++;
};
const d2 = (a: { x: number; y: number }, b: { x: number; y: number }): number => Math.hypot(a.x - b.x, a.y - b.y);

bootSimEngine();

// The arrival step from a back-portal to where the party stands (World.loadZone).
const ENTRY_STEP = 120;
// Clearance the apron law demands beyond a station's own dial (DIAL).
const APRON_MARGIN = 30;

const SIDES = ['n', 's', 'w', 'e'] as const;
const portalOf = (tier: number, side: typeof SIDES[number]): { x: number; y: number } => {
  const { w, h } = TOWN_TIERS[tier];
  const i = PORTAL_EDGE_INSET;
  return side === 'n' ? { x: w / 2, y: i } : side === 's' ? { x: w / 2, y: h - i }
    : side === 'w' ? { x: i, y: h / 2 } : { x: w - i, y: h / 2 };
};
const apronOf = (tier: number, side: typeof SIDES[number]): { x: number; y: number } => {
  const p = portalOf(tier, side);
  const { w, h } = TOWN_TIERS[tier];
  const ang = Math.atan2(h / 2 - p.y, w / 2 - p.x);
  return { x: p.x + Math.cos(ang) * ENTRY_STEP, y: p.y + Math.sin(ang) * ENTRY_STEP };
};

/** A dwell/press station's disc CENTRE at a tier: the site, or the counter
 *  body's own stand where a structure seats the body (the caravanner, the
 *  quartermaster — read off the structure's npcs row; the recruiting
 *  officer's stand is the World's own offset, verified live in rig H). */
const OFFICER_STAND = { x: 24, y: -18 };
function discCentre(tier: number, id: TownSiteId): { x: number; y: number } | null {
  const p = townSiteAt(tier, id);
  if (!p) return null;
  const add = TOWN_ADDITIONS.find(a => a.fixtures.some(f => f.site === id));
  const fx = add?.fixtures.find(f => f.site === id);
  const npc = fx ? STRUCTURES[fx.structure]?.npcs?.[0] : undefined;
  if (npc) return { x: p.x + (fx?.dx ?? 0) + npc.x, y: p.y + (fx?.dy ?? 0) + npc.y };
  if (id === 'recruiter') return { x: p.x + OFFICER_STAND.x, y: p.y + OFFICER_STAND.y };
  return p;
}

/** A structure's footprint rect at a seat (half-extents off the def). */
function rectOf(structure: string, at: { x: number; y: number }): { x0: number; y0: number; x1: number; y1: number } {
  const s = STRUCTURES[structure];
  return { x0: at.x - s.halfW, y0: at.y - s.halfH, x1: at.x + s.halfW, y1: at.y + s.halfH };
}
const rectsOverlap = (a: ReturnType<typeof rectOf>, b: ReturnType<typeof rectOf>): boolean =>
  a.x0 < b.x1 && b.x0 < a.x1 && a.y0 < b.y1 && b.y0 < a.y1;
const inRect = (p: { x: number; y: number }, r: ReturnType<typeof rectOf>, pad = 0): boolean =>
  p.x > r.x0 - pad && p.x < r.x1 + pad && p.y > r.y0 - pad && p.y < r.y1 + pad;

/** Every structure a tier raises when the account owns EVERY station. */
function allFixturesAt(tier: number): { structure: string; x: number; y: number; site?: TownSiteId }[] {
  const out: { structure: string; x: number; y: number; site?: TownSiteId }[] =
    townBaseFixtures(tier).map(f => ({ ...f }));
  for (const add of TOWN_ADDITIONS) {
    for (const f of add.fixtures) {
      const p = townSiteAt(tier, f.site);
      if (p) out.push({ structure: f.structure, x: p.x + (f.dx ?? 0), y: p.y + (f.dy ?? 0), site: f.site });
    }
  }
  return out;
}

/** The training line's bodies (World.loadZone's rack + gauntlet + stub). */
function trainingBodies(tier: number): { x: number; y: number }[] {
  const y = townSiteAt(tier, 'training_yard');
  if (!y) return [];
  const pts = [{ x: y.x, y: y.y }];
  for (let i = 0; i < 5; i++) pts.push({ x: y.x + 52 * (i + 1), y: y.y });
  for (let i = 0; i < 3; i++) pts.push({ x: y.x + 340 + 130 * i, y: y.y });
  pts.push({ x: y.x + 690, y: y.y - 16 }, { x: y.x + 690, y: y.y + 18 });
  return pts;
}

const fullAccount = (): Account => {
  const a = makeAccount();
  for (const f of townStationFeatures()) a.features.add(f);
  return a;
};
const TOP = TOWN_TIERS.length - 1;

function mkTownWorld(account: Account, seed = 0x70a1): World {
  resetActorIdCounter();
  for (const c of CLASSES) account.unlockedClasses.add(c.id);
  const manifest = buildManifest(account, seed);
  for (const p of manifest.packages) p.enabled = false;
  const w = new World(account, Object.freeze(manifest));
  w.createPlayer(classById('warrior'));
  w.loadZone(START_ZONE);
  return w;
}

// ------------------------------------------------------------- A. THE LADDER
{
  check('A: the ladder has more than one rung', TOWN_TIERS.length >= 2);
  let monotone = true;
  for (let i = 1; i < TOWN_TIERS.length; i++) {
    const a = TOWN_TIERS[i - 1], b = TOWN_TIERS[i];
    if (!(b.stations > a.stations && b.w > a.w && b.h > a.h && b.scatter >= a.scatter)) monotone = false;
  }
  check('A: the ladder is monotone (stations, size, scatter)', monotone);
  check('A: the first rung asks for nothing', TOWN_TIERS[0].stations === 0);
  check('A: the hamlet can never host two stations (the second rung opens by the second station)',
    TOWN_TIERS[1].stations <= 2);
  const bare = makeAccount();
  check('A: a bare account stands on the hamlet', townTier(bare) === 0);
  const feats = townStationFeatures();
  check('A: every station feature is a real FEATURE flag', feats.every(f => (Object.values(FEATURE) as string[]).includes(f)));
  check('A: the top rung is reachable with every station owned', townTier(fullAccount()) === TOP
    && feats.length >= TOWN_TIERS[TOP].stations);
  // Each rung opens at exactly its count, in any order.
  let climbs = true;
  for (let n = 0; n <= feats.length; n++) {
    const a = makeAccount();
    for (const f of [...feats].reverse().slice(0, n)) a.features.add(f);
    let want = 0;
    for (let i = 0; i < TOWN_TIERS.length; i++) if (n >= TOWN_TIERS[i].stations) want = i;
    if (townTier(a) !== want) climbs = false;
  }
  check('A: the rung is the count, whatever the order', climbs);
  // THE HAMLET IS THE ZONES ROW (one truth, pinned).
  const base = ZONES[START_ZONE];
  const t0 = expandedTown(bare, base);
  check('A: the hamlet keeps the row\'s size', t0.size.w === TOWN_TIERS[0].w && t0.size.h === TOWN_TIERS[0].h
    && base.size.w === TOWN_TIERS[0].w && base.size.h === TOWN_TIERS[0].h);
  check('A: the hamlet\'s fixtures ARE the row\'s fixtures (order included)',
    JSON.stringify(t0.fixtures) === JSON.stringify(base.fixtures)
    && JSON.stringify(townBaseFixtures(0)) === JSON.stringify(base.fixtures));
  const rows0 = townLayoutFor(0, base.layout);
  check('A: the hamlet\'s scatter rows are the row\'s scatter rows byte-for-byte',
    JSON.stringify(rows0.slice(0, base.layout.length)) === JSON.stringify(base.layout));
  check('A: the town def is never mutated (a fresh fixtures array per build)',
    t0.fixtures !== base.fixtures && expandedTown(fullAccount(), base).fixtures !== t0.fixtures);
  const grown = expandedTown(fullAccount(), base);
  check('A: the township wears the top rung\'s size + every addition',
    grown.size.w === TOWN_TIERS[TOP].w && grown.size.h === TOWN_TIERS[TOP].h
    && TOWN_ADDITIONS.every(a => a.fixtures.every(f => grown.fixtures!.some(g => g.structure === f.structure))));
}

// ---------------------------------------------------- B. THE ONE-TRUTH SITES
{
  let inside = true, spans = true;
  for (const s of TOWN_SITES) {
    if (s.tiers.length !== TOWN_TIERS.length) spans = false;
    s.tiers.forEach((p, i) => {
      if (!p) return;
      const t = TOWN_TIERS[i];
      if (p.x < 40 || p.y < 40 || p.x > t.w - 40 || p.y > t.h - 40) { inside = false; console.log(`   ${s.id} @ tier ${i} outside`); }
    });
  }
  check('B: every site row spans the whole ladder', spans);
  check('B: every authored seat stands inside its tier\'s arena (40 in from the rim)', inside);
  const font = TOWN_SITES.find(s => s.id === 'font')!;
  const last = font.tiers[font.tiers.length - 1]!;
  const beyond = townSiteAt(99, 'font');
  check('B: the resolver clamps above the ladder to the last authored seat', !!beyond && beyond.x === last.x && beyond.y === last.y);
  check('B: ground that does not exist yet resolves null (the mill at the hamlet)', townSiteAt(0, 'mill_bank') === null);
  check('B: a resolved seat is a fresh object (never the table\'s own)', townSiteAt(1, 'font') !== font.tiers[1]);
  const always: TownSiteId[] = ['font', 'waypoint', 'plaza', 'salvage', 'oracle', 'bounty_board', 'caravan',
    'recruiter', 'quest_house', 'campfire', 'tracker', 'training_yard', 'blacksmith', 'inn', 'waking_house'];
  check('B: every seat the engine reads unconditionally is authored at every rung',
    always.every(id => TOWN_TIERS.every((_, i) => townSiteAt(i, id) !== null)));
}

// -------------------------------------------------------- C. THE APRON LAW
{
  let clearAprons = true, clearPortals = true, clearWaypoint = true, noOverlap = true;
  const dwellers = TOWN_SITES.filter(s => s.dwell || s.press);
  for (let tier = 0; tier < TOWN_TIERS.length; tier++) {
    const wp = townSiteAt(tier, 'waypoint')!;
    for (const s of dwellers) {
      const c = discCentre(tier, s.id);
      if (!c) continue;
      const r = (s.dwell ?? s.press)!;
      for (const side of SIDES) {
        if (d2(c, apronOf(tier, side)) < r + APRON_MARGIN) {
          clearAprons = false; console.log(`   ${s.id} @ tier ${tier}: disc reaches the ${side} apron (${d2(c, apronOf(tier, side)).toFixed(0)} < ${r + APRON_MARGIN})`);
        }
        if (d2(c, portalOf(tier, side)) < r + PORTAL_RADIUS) {
          clearPortals = false; console.log(`   ${s.id} @ tier ${tier}: disc reaches the ${side} portal`);
        }
      }
      if (d2(c, wp) < r + LEYLINE_CFG.attuneRadius) {
        clearWaypoint = false; console.log(`   ${s.id} @ tier ${tier}: disc reaches the waypoint (${d2(c, wp).toFixed(0)})`);
      }
    }
    // From the village up, no two DWELL stations share ground (a press may
    // overlap: its hint shows, nothing fires).
    if (tier >= 1) {
      const ds = dwellers.filter(s => s.dwell);
      for (let i = 0; i < ds.length; i++) for (let j = i + 1; j < ds.length; j++) {
        const a = discCentre(tier, ds[i].id), b = discCentre(tier, ds[j].id);
        if (!a || !b) continue;
        if (d2(a, b) < ds[i].dwell! + ds[j].dwell!) {
          noOverlap = false; console.log(`   ${ds[i].id} × ${ds[j].id} @ tier ${tier}: dwell discs overlap (${d2(a, b).toFixed(0)} < ${ds[i].dwell! + ds[j].dwell!})`);
        }
      }
    }
  }
  check('C: no station\'s disc contains an arrival apron, any side, any tier', clearAprons);
  check('C: no station\'s disc reaches a portal, any side, any tier', clearPortals);
  check('C: no station\'s disc reaches the waypoint\'s attune ring, any tier', clearWaypoint);
  check('C: from the village up, no two dwell stations overlap', noOverlap);
  // The dials the rows mirror (the engine reads these; the rows must agree).
  check('C: the salvage/oracle/tracker rows carry the station dial',
    ['salvage', 'oracle', 'tracker'].every(id => TOWN_SITES.find(s => s.id === id)!.dwell === SALVAGE_CFG.stationRadius));
  check('C: the board row carries the board\'s dwell dial',
    TOWN_SITES.find(s => s.id === 'bounty_board')!.dwell === BOUNTY_BOARD_CFG.dwell.radius);
}

// ------------------------------------------------------- C2. THE ROAD LAW
//  The straight way from every portal to the waypoint (the arrival walk)
//  runs through no raised structure and past no training body — whatever
//  side the road rolls onto. The plaza itself is the destination (its
//  furniture is walked around); the hamlet's training line straddles the
//  south road with its own gap, a body's width clear.
{
  const segDist = (p: { x: number; y: number }, a: { x: number; y: number }, b: { x: number; y: number }): number => {
    const vx = b.x - a.x, vy = b.y - a.y;
    const L2 = vx * vx + vy * vy || 1;
    const t = Math.max(0, Math.min(1, ((p.x - a.x) * vx + (p.y - a.y) * vy) / L2));
    return Math.hypot(p.x - (a.x + vx * t), p.y - (a.y + vy * t));
  };
  const rectHit = (r: ReturnType<typeof rectOf>, a: { x: number; y: number }, b: { x: number; y: number }, pad: number): boolean => {
    // sample the segment finely; a hit = any sample inside the padded rect
    const n = Math.ceil(d2(a, b) / 6);
    for (let k = 0; k <= n; k++) {
      const p = { x: a.x + (b.x - a.x) * k / n, y: a.y + (b.y - a.y) * k / n };
      if (inRect(p, r, pad)) return true;
    }
    return false;
  };
  let open = true, bodiesClear = true;
  for (let tier = 0; tier < TOWN_TIERS.length; tier++) {
    const wp = townSiteAt(tier, 'waypoint')!;
    const fx = allFixturesAt(tier).filter(f => f.structure !== 'plaza_square');
    for (const side of SIDES) {
      const from = portalOf(tier, side);
      for (const f of fx) {
        if (rectHit(rectOf(f.structure, f), from, wp, 20)) {
          open = false; console.log(`   tier ${tier}: the ${side} road runs through ${f.structure}@${f.x},${f.y}`);
        }
      }
      for (const b of trainingBodies(tier)) {
        if (segDist(b, from, wp) < 14 + 14) {
          bodiesClear = false; console.log(`   tier ${tier}: the ${side} road runs over a training body at ${b.x},${b.y}`);
        }
      }
    }
  }
  check('C2: every road from every portal to the waypoint runs through no structure, any tier', open);
  check('C2: no road runs over a training body, any tier', bodiesClear);
}

// ------------------------------------------------------ D. THE QUARTER LAW
{
  let kept = true;
  for (const s of TOWN_SITES) {
    s.tiers.forEach((p, i) => {
      if (!p) return;
      const t = TOWN_TIERS[i];
      const dx = p.x - t.w / 2, dy = p.y - t.h / 2;
      const q = s.quarter;
      const okX = q.includes('w') ? dx < 0 : q.includes('e') ? dx > 0 : true;
      const okY = q.includes('n') ? dy < 0 : q.includes('s') ? dy > 0 : true;
      const okC = q === 'c' ? Math.hypot(dx, dy) < 220 : true;
      if (!(okX && okY && okC)) { kept = false; console.log(`   ${s.id} @ tier ${i} left its quarter '${q}' (${dx.toFixed(0)}, ${dy.toFixed(0)})`); }
    });
  }
  check('D: every site keeps its compass quarter across the ladder', kept);
}

// ------------------------------- E. THE SMITH'S YARD + THE INN FRONT
{
  let flow = true, yard = true, pair = true, front = true, outsideRoof = true, apart = true, before = true;
  const YARD_REACH = 560; // DIAL: how far a crafting station may stand from the forge
  const PAIR_STRIDE = 150; // DIAL: the Font within this of the stones (THE MAGICAL PAIR)
  const DOOR_STRIDE = 260; // DIAL: the board within this of Mireille's door
  const inn = STRUCTURES.inn, bf = STRUCTURES.bounty_front;
  for (let tier = 0; tier < TOWN_TIERS.length; tier++) {
    const forge = townSiteAt(tier, 'blacksmith')!, bench = townSiteAt(tier, 'salvage')!;
    const stones = townSiteAt(tier, 'oracle')!, font = townSiteAt(tier, 'font')!;
    // The yard FORMS from the village up (the hamlet holds one station at
    // most, and its north road runs where the yard would stand).
    if (tier >= 1 && !(bench.x < stones.x && stones.x < font.x)) flow = false;
    if (tier >= 1 && [bench, stones, font].some(p => d2(p, forge) > YARD_REACH)) yard = false;
    // THE MAGICAL PAIR: the Font a stride from the stones at EVERY rung, the
    // hamlet's corner past the inn included — and never inside their ring.
    if (d2(font, stones) > PAIR_STRIDE || d2(font, stones) < STRUCTURES.oracle_site.halfW) { pair = false; console.log(`   tier ${tier}: Font ${d2(font, stones).toFixed(0)} from the stones`); }
    const innAt = townSiteAt(tier, 'inn')!, board = townSiteAt(tier, 'bounty_board')!;
    // house plan: the inn's door is the bottom row's centre-right cell.
    const door = { x: innAt.x + 13, y: innAt.y + inn.halfH };
    if (d2(board, door) > DOOR_STRIDE) { front = false; console.log(`   tier ${tier}: board ${d2(board, door).toFixed(0)} from the inn door`); }
    if (inRect(board, rectOf('inn', innAt))) outsideRoof = false;
    if (rectsOverlap(rectOf('bounty_front', board), rectOf('inn', innAt))) apart = false;
    // OUT FRONT: the whole front stands SOUTH of the inn's wall (before the
    // door, between it and the square), never beside or behind the house.
    if (board.y - bf.halfH < innAt.y + inn.halfH) before = false;
  }
  check('E: the crafting flow reads west → east (bench, stones, Font)', flow);
  check('E: every crafting station stands in the forge\'s yard', yard);
  check('E: THE MAGICAL PAIR — the Font stands a stride from the stones at every tier', pair);
  check('E: the board front stands a stride from Mireille\'s door at every tier', front);
  check('E: the board stands outside the inn\'s roof (her counter serves under it)', outsideRoof);
  check('E: the front\'s footprint never touches the inn\'s', apart);
  check('E: the front stands OUT FRONT — wholly south of the inn\'s wall, every tier', before);
  check('E: the front is OPEN AIR — no roof, no confinement (nothing hides the slate)',
    bf.roofs === undefined && bf.confineVision === undefined && !bf.plan!.some(row => row.includes('#')));
  check('E: the front sets its board into the back rail (the N cell on the top row) with the apron open below',
    bf.plan![0].includes('N') && /^_+$/.test(bf.plan![bf.plan!.length - 1]));
  check('E: the front is dressed as a locale (rails, benches; ONE wall lantern hung off the board\'s post — no post, no flower box: those stand under the inn\'s windows, her word 2026-09-06)',
    ['y', 'b'].every(ch => bf.plan!.some(row => row.includes(ch))) && !bf.plan!.some(row => /[uL]/.test(row))
    && (bf.props ?? []).filter(p => p.kind === 'wall_lantern').length === 1
    && (bf.props ?? []).some(p => p.kind === 'wall_lantern' && Math.abs(p.x) > 16 && Math.abs(p.x) < 34 && Math.abs((p.rot ?? 0) + Math.PI / 2) < 0.01));
  // THE DOOR LANE LAW (her walk, 2026-09-05 — a post out front of the door
  // made the inn a chore to enter): the door's approach column, from the
  // wall down to the square, holds NOTHING of the front — not its rect, not
  // a post; the inn lights its own step with wall lanterns (inert to feet).
  const LANE_HALF = 40, LANE_DEPTH = 120; // DIALs: the column's half width + reach
  let lane = true;
  for (let tier = 0; tier < TOWN_TIERS.length; tier++) {
    const innAt = townSiteAt(tier, 'inn')!, board = townSiteAt(tier, 'bounty_board')!;
    const door = { x: innAt.x + 13, y: innAt.y + inn.halfH };
    const col = { x0: door.x - LANE_HALF, y0: door.y, x1: door.x + LANE_HALF, y1: door.y + LANE_DEPTH };
    if (rectsOverlap(rectOf('bounty_front', board), col)) { lane = false; console.log(`   tier ${tier}: the front stands in the door lane`); }
  }
  check('E: THE DOOR LANE LAW — the front never stands in the door\'s approach column, any tier', lane);
  check('E: the front\'s east end (the door\'s side) is open ground — and no post stands anywhere on the front (the lamps stand along the ways)',
    !bf.plan!.some(row => row.includes('L')) && bf.plan![1].endsWith('..'));
  check('E: the inn hangs wall lanterns either side of its door (inert to feet, a light on the step)',
    (inn.props ?? []).filter(p => p.kind === 'wall_lantern').length === 2
    && (inn.props ?? []).filter(p => p.kind === 'wall_lantern').every(p => p.y > inn.halfH && Math.abs(p.x - 13) < 60 && Math.abs(p.x - 13) > 20)
    && doodadRuleOf('wall_lantern').overlap === 'inert');
  // THE INN wears the kit: a counter run, the stairway up, the hearth, tables
  // — and its rooms above ride THE STOREY FABRIC (a storey plan, not a pocket).
  check('E: the inn plan keeps its door seat (bottom row, centre-right cell = +13)',
    inn.plan![inn.plan!.length - 1].indexOf('D') === inn.plan![0].length / 2);
  check('E: the inn plan seats the stairway ("AA" + its landing "^^"), a counter run, the hearth, tables and chairs',
    inn.plan!.some(r => r.includes('AA')) && inn.plan!.some(r => r.includes('^^')) && inn.plan!.some(r => r.includes('aaa'))
    && inn.plan!.some(r => r.includes('h')) && inn.plan!.some(r => r.includes('t')) && inn.plan!.some(r => r.includes('c'))
    && legendCell('A')?.region === 'storey_stair' && legendCell('^')?.region === 'storey_landing');
  check('E: the inn carries ONE storey plan of the ground plan\'s exact dimensions (the rooms above)',
    inn.storeys?.length === 1 && inn.storeys[0].plan.length === inn.plan!.length
    && inn.storeys[0].plan.every(r => r.length === inn.plan![0].length));
  check('E: the inn confines by room, roofed and boarded (the interior fabric)',
    inn.confineVision === 'rooms' && inn.roofs === 'auto' && inn.floorStyle === 'boards');
}

// --------------------------------------------------------- F. THE FOOTPRINTS
{
  let disjoint = true, openLine = true;
  for (let tier = 0; tier < TOWN_TIERS.length; tier++) {
    const fx = allFixturesAt(tier);
    const rects = fx.map(f => ({ f, r: rectOf(f.structure, f) }));
    for (let i = 0; i < rects.length; i++) for (let j = i + 1; j < rects.length; j++) {
      if (rectsOverlap(rects[i].r, rects[j].r)) {
        disjoint = false; console.log(`   tier ${tier}: ${rects[i].f.structure}@${rects[i].f.x},${rects[i].f.y} overlaps ${rects[j].f.structure}@${rects[j].f.x},${rects[j].f.y}`);
      }
    }
    for (const b of trainingBodies(tier)) {
      for (const { f, r } of rects) {
        if (f.structure === 'training_yard') continue;
        if (inRect(b, r, 14)) { openLine = false; console.log(`   tier ${tier}: a training body at ${b.x},${b.y} stands in ${f.structure}`); }
      }
    }
  }
  check('F: no two raised structures overlap at any tier (every station owned)', disjoint);
  check('F: the training line\'s bodies stand on open ground at every tier', openLine);
}

// ------------------------------------------------------------ G. THE BROOK
{
  const base = ZONES[START_ZONE];
  check('G: the base row carries no random river or fountain (the brook + the plaza retired them)',
    !base.layout.some(r => r.kind === 'river' || r.kind === 'fountain'));
  let clear = true, clearAprons = true, spanned = true, ways = true;
  for (let tier = 0; tier < TOWN_TIERS.length; tier++) {
    const rows = townLayoutFor(tier, base.layout);
    const water = rows.filter(r => r.kind === 'course' && r.lay === 'water');
    if (water.length !== (TOWN_TIERS[tier].brook ? 1 : 0)) spanned = false;
    for (const row of water) {
      if (!row.spans?.length) spanned = false;
      const rHi = row.radius?.[1] ?? 30;
      // densify the polyline
      const pts: { x: number; y: number }[] = [];
      for (let i = 0; i + 1 < row.path!.length; i++) {
        const a = row.path![i], b = row.path![i + 1];
        const n = Math.max(1, Math.ceil(d2(a, b) / 12));
        for (let k = 0; k <= n; k++) pts.push({ x: a.x + (b.x - a.x) * k / n, y: a.y + (b.y - a.y) * k / n });
      }
      for (const s of TOWN_SITES.filter(x => x.dwell || x.press)) {
        const c = discCentre(tier, s.id);
        if (!c) continue;
        const need = (s.dwell ?? s.press)! + rHi + 10;
        if (pts.some(p => d2(p, c) < need)) { clear = false; console.log(`   tier ${tier}: the brook runs into ${s.id}'s disc`); }
      }
      for (const f of allFixturesAt(tier)) {
        const r = rectOf(f.structure, f);
        if (f.structure === 'mill_bank') continue; // the mill stands ON the bank on purpose
        if (pts.some(p => inRect(p, r, rHi + 10))) { clear = false; console.log(`   tier ${tier}: the brook runs into ${f.structure}@${f.x},${f.y}`); }
      }
      for (const side of SIDES) {
        if (pts.some(p => d2(p, apronOf(tier, side)) < rHi + 160)) { clearAprons = false; console.log(`   tier ${tier}: the brook reaches the ${side} apron`); }
      }
    }
    // the ways follow the sites (every named site resolves at every tier
    // the way appears, and a way never starts where its sites do not stand)
    const wayRows = rows.filter(r => r.kind === 'course' && r.lay !== 'water');
    if (wayRows.some(r => (r.path?.length ?? 0) < 2)) ways = false;
  }
  check('G: the brook keeps clear of every station disc and every structure, at every tier', clear);
  check('G: the brook keeps clear of every arrival apron', clearAprons);
  check('G: every brook carries its plank span', spanned);
  check('G: the traveled ways resolve from their sites at every tier', ways);
}

// ----------------------------------------------------------------- H. LIVE
{
  // THE HAMLET: a bare account.
  const w0 = mkTownWorld(makeAccount());
  check('H0: the hamlet\'s arena is the first rung', w0.arena.w === TOWN_TIERS[0].w && w0.arena.h === TOWN_TIERS[0].h);
  const wp0 = w0.townSeat('waypoint');
  check('H0: the waypoint stands at its authored plaza seat (the centre formula is dead)',
    !!w0.waypointPos && d2(w0.waypointPos, wp0) < 1);
  check('H0: the Font stands at its yard seat', w0.fonts.length === 1 && d2(w0.fonts[0].pos, w0.townSeat('font')) < 1);
  const waking = rectOf('waking_house', w0.townSeat('waking_house'));
  check('H0: a fresh run still wakes at the bedside (the S cell exports through the tier build)',
    inRect(w0.player.pos, waking));
  check('H0: no station body stands in a hamlet with no stations',
    !w0.actors.some(a => a.defId === 'townsfolk_tracker' || a.defId === 'merc_captain' || a.defId === 'target_dummy'));
  check('H0: the brook laid water + its span, and the plaza its fountain',
    w0.doodads.some(d => d.kind === 'water') && w0.doodads.some(d => d.kind === 'bridge') && w0.doodads.some(d => d.kind === 'fountain'));

  // THE TOWNSHIP: every station owned.
  const acct = fullAccount();
  const w = mkTownWorld(acct);
  check('H: the township\'s arena is the top rung', w.arena.w === TOWN_TIERS[TOP].w && w.arena.h === TOWN_TIERS[TOP].h
    && w.townTierIndex() === TOP);
  check('H: the waypoint stands at the top rung\'s plaza seat', !!w.waypointPos && d2(w.waypointPos, w.townSeat('waypoint')) < 1);
  check('H: the Font stands at the top rung\'s yard seat', w.fonts.length === 1 && d2(w.fonts[0].pos, w.townSeat('font')) < 1);
  const dummy = w.actors.find(a => a.defId === 'target_dummy');
  check('H: the training post stands at its seat', !!dummy && d2(dummy.pos, w.townSeat('training_yard')) < 1);
  const tracker = w.actors.find(a => a.defId === 'townsfolk_tracker');
  check('H: the tracker stands by his fire (south of it, clear of the camp\'s rocks)',
    !!tracker && d2(tracker.pos, w.townSeat('tracker', 0, 34)) < 1);
  const officer = w.actors.find(a => a.defId === 'merc_captain');
  check('H: the officer stands at his corner (the stand the apron law measured)',
    !!officer && d2(officer.pos, w.townSeat('recruiter', OFFICER_STAND.x, OFFICER_STAND.y)) < 1);
  const board = w.doodads.filter(d => d.kind === 'bounty_board');
  check('H: exactly one board stands, set into the front\'s rail a row above its seat',
    board.length === 1 && d2(board[0].pos, w.townSeat('bounty_board')) < 30);
  check('H: THE ANCHORED DWELL — the boards-here census reads the BOARD itself (its anchor piece), never the site\'s coordinate',
    w.bountyBoardsHere().some(b => b.id === BOUNTY_BOARD_CFG.boardId && d2(b.pos, board[0].pos) < 1)
    && w.stationAnchor('bounty_board')?.doodad === board[0] && board[0].anchor === 'bounty_front');
  check('H: the front raised its locale (rails, the board\'s own wall lantern, benches) — no post, no flower box, no roof over it',
    w.doodads.some(d => d.kind === 'rail_fence' && d2(d.pos, w.townSeat('bounty_board')) < 120)
    && !w.doodads.some(d => d.kind === 'planter' && inRect(d.pos, rectOf('bounty_front', w.townSeat('bounty_board'))))
    && !w.doodads.some(d => d.kind === 'lantern_post' && inRect(d.pos, rectOf('bounty_front', w.townSeat('bounty_board'))))
    && w.doodads.filter(d => d.kind === 'wall_lantern' && d2(d.pos, board[0].pos) < 40 && Math.abs((d.rot ?? 0) + Math.PI / 2) < 0.01).length === 1
    && w.doodads.filter(d => d.kind === 'bench' && d2(d.pos, w.townSeat('bounty_board')) < 120).length >= 2
    && !w.roofedStructureAt(w.townSeat('bounty_board')));
  // THE ANCHORED DWELL, live: the dwell is the BOARD's — it follows the
  // piece and is gone while the piece is down — and THE SAME-STORY LAW
  // keeps a storey walker over it out of reach. (Her word 2026-09-06: the
  // dwell belongs to the object, so a felled object takes its dwell down.)
  {
    const hero = w.player;
    const keep = { x: hero.pos.x, y: hero.pos.y, tier: hero.tier };
    const bd = board[0];
    const home = { x: bd.pos.x, y: bd.pos.y };
    hero.pos.x = bd.pos.x; hero.pos.y = bd.pos.y + 30; hero.tier = 0;
    const hintAt = (): { x: number; y: number } => w.bountyBoardHint()?.pos ?? { x: -1e9, y: -1e9 };
    check('H: THE ANCHORED DWELL — at the board the dwell answers and the prompt seats ON the board',
      w.nearBountyBoard() && d2(hintAt(), bd.pos) < 1);
    bd.pos.x -= 150;
    const gone = !w.nearBountyBoard();
    hero.pos.x = bd.pos.x;
    check('H: THE ANCHORED DWELL — move the board and the dwell moves with it (the old stand falls out of the dial, the new one answers, the prompt follows)',
      gone && w.nearBountyBoard() && d2(hintAt(), bd.pos) < 1);
    bd.pos.x = home.x; hero.pos.x = home.x;
    bd.felled = { at: 0, wake: 1 };
    check('H: THE ANCHORED DWELL — a felled board is no board (no census, no dwell, no prompt) until it stands again',
      w.bountyBoardsHere().length === 0 && !w.nearBountyBoard() && w.bountyBoardHint() === null);
    delete bd.felled;
    check('H: … and it stands again', w.nearBountyBoard());
    hero.tier = 1;
    check('H: THE SAME-STORY LAW — a hero on the storey over the board is not at the board', !w.nearBountyBoard() && w.bountyBoardHint() === null);
    // … and the inn's DOOR (its own town, so the live dwell disturbs nothing
    // here): the sweep's own gate is dwellReachable's story pair — a hero on
    // the storey never swings the ground door beneath it; the ground hero does.
    {
      const wd = mkTownWorld(fullAccount(), 0x70d0);
      const hd = wd.player;
      const innSt = wd.structures.find(s => s.defId === 'inn')!;
      const ics = innSt.cellSize;
      const door = wd.doodads.find(d => d.door && d.pos.x > innSt.rect.x && d.pos.x < innSt.rect.x + innSt.rect.w
        && Math.abs(d.pos.y - (innSt.rect.y + innSt.rect.h)) < ics);
      const premise = !!door && !door.door!.open && (door.door!.mode === 'dwell' || door.door!.mode === 'both');
      check('H: the door premise — the inn\'s ground door stands closed in dwell mode', premise, `mode=${door?.door?.mode} open=${String(door?.door?.open)}`);
      if (door && premise) {
        // The stand: one cell inside the door on the common room's floor —
        // within the push's reach by construction.
        const front = { x: door.pos.x, y: door.pos.y - ics };
        check('H: THE SAME-STORY LAW at the door sweep\'s own gate — a story-1 hero over the door is refused, the ground hero admitted',
          !wd.dwellReachable(front, door.pos, transitReach('door'), wd.storyPair({ tier: 1 }, door))
          && wd.dwellReachable(front, door.pos, transitReach('door'), wd.storyPair({ tier: 0 }, door)));
        const dwellAt = (tier: number, at: { x: number; y: number }): void => {
          hd.pos.x = at.x; hd.pos.y = at.y; hd.tier = tier; hd.onTierLink = false; hd.push = null;
          for (let i = 0; i < 30; i++) wd.update(1 / 30); // 1s: the idle grace + the door's 0.45s dwell
        };
        // The nearest clear story-1 stand to the door.
        let stand: { x: number; y: number; d: number } | null = null;
        for (let cy = 0; cy < STRUCTURES.inn.plan!.length; cy++) {
          for (let cx = 0; cx < STRUCTURES.inn.plan![0].length; cx++) {
            for (const [ox, oy] of [[0.5, 0.5], [0.25, 0.75], [0.75, 0.75], [0.5, 0.8]] as const) {
              const x = innSt.rect.x + (cx + ox) * ics, y = innSt.rect.y + (cy + oy) * ics;
              if (!tierFloorAt(wd.walk!.regionAt!(x, y), 1)) continue;
              if (d2(wd.findFreeSpot({ x, y }, hd.radius, 1), { x, y }) > 1) continue;
              const d = d2({ x, y }, door.pos);
              if (!stand || d < stand.d) stand = { x, y, d };
            }
          }
        }
        if (stand) {
          dwellAt(1, stand);
          check('H: … live: a hero on the storey lingering as near the door as the story allows never swings it', !door.door!.open, `open=${String(door.door!.open)} at ${stand.d.toFixed(0)}px`);
        }
        dwellAt(0, front);
        check('H: … live: the same dwell on the ground floor swings it (the sweep is alive, never vacuous)', door.door!.open === true, `open=${String(door.door!.open)}`);
      }
    }
    hero.tier = keep.tier;
    hero.pos.x = keep.x; hero.pos.y = keep.y;
  }
  // THE LAMPS ALONG THE WAYS at the top rung: the wayside fabric lights the
  // long lanes (the hamlet's short ones seat one — rig J), each lamp a
  // stride off the pavement, never on it, none on the front, none in the
  // door lane (THE DOOR LANE LAW — the door way is bare).
  {
    const lanes = w.doodads.filter(d => d.kind === 'paved_way');
    const lamps = w.doodads.filter(d => d.kind === 'lantern_post');
    const offLane = (l: { pos: { x: number; y: number } }): number => Math.min(...lanes.map(p => d2(l.pos, p.pos) - p.radius));
    const wayLamps = lamps.filter(l => offLane(l) < 40);
    const innAt = w.townSeat('inn');
    const doorAt = { x: innAt.x + 13, y: innAt.y + STRUCTURES.inn.halfH };
    check('H: THE LAMPS ALONG THE WAYS — the township\'s lanes wear their lamps (at least six beside the pavement, each a stride off it, none on the front, none in the door lane)',
      wayLamps.length >= 6 && wayLamps.every(l => offLane(l) >= l.radius)
      && !lamps.some(l => inRect(l.pos, rectOf('bounty_front', w.townSeat('bounty_board'))))
      && !lamps.some(l => Math.abs(l.pos.x - doorAt.x) < 40 && l.pos.y >= doorAt.y && l.pos.y <= doorAt.y + 120),
      `${wayLamps.length} lamp(s) beside lanes of ${lamps.length}`);
  }
  check('H: every fixture the township authored was raised (structures resolve)',
    expandedTown(acct, ZONES[START_ZONE]).fixtures!.every(f => !!STRUCTURES[f.structure]));
  // THE BROOK, live: water + spans laid; no water disc inside any dwell disc.
  const water = w.doodads.filter(d => d.kind === 'water');
  check('H: the township\'s brook laid its water and its span',
    water.length >= 6 && w.doodads.some(d => d.kind === 'bridge'));
  let dry = true;
  for (const s of TOWN_SITES.filter(x => x.dwell)) {
    const c = discCentre(TOP, s.id)!;
    if (water.some(d => d2(d.pos, c) < s.dwell! + d.radius)) { dry = false; console.log(`   water inside ${s.id}'s disc`); }
  }
  check('H: no water disc lies inside any station\'s dwell disc (live)', dry);
  check('H: the paved ways were laid (the forge way, the inn way, the hearth way)',
    w.doodads.filter(d => d.kind === 'paved_way').length >= 12);
  // DRAWN == DWELT: every near* verb answers AT its seat and refuses a step
  // past its dial. (Park, ask; nobody dwells — the arrival latch is not in
  // play for a bare near* read.)
  const park = (x: number, y: number): void => { w.player.pos.x = x; w.player.pos.y = y; };
  // Each verb is probed along an OPEN bearing from its seat (the Font's
  // east now runs into the stones' ring, so it reads south toward the
  // square; the board front is open air — it reads from EVERY bearing,
  // and the flank read is pinned below).
  const verbs: { id: TownSiteId; near: () => boolean; dial: number; dir: { x: number; y: number } }[] = [
    { id: 'salvage', near: () => w.nearSalvage(), dial: SALVAGE_CFG.stationRadius, dir: { x: 1, y: 0 } },
    { id: 'oracle', near: () => w.nearOracle(), dial: SALVAGE_CFG.stationRadius, dir: { x: 0, y: 1 } },
    { id: 'tracker', near: () => w.nearTracker(), dial: SALVAGE_CFG.stationRadius, dir: { x: 1, y: 0 } },
    { id: 'campfire', near: () => w.nearCampfire(), dial: TOWN_SITES.find(s => s.id === 'campfire')!.dwell!, dir: { x: 1, y: 0 } },
    { id: 'bounty_board', near: () => w.nearBountyBoard(), dial: BOUNTY_BOARD_CFG.dwell.radius, dir: { x: 0, y: 1 } },
    { id: 'bounty_board', near: () => w.nearBountyBoard(), dial: BOUNTY_BOARD_CFG.dwell.radius, dir: { x: 1, y: 0 } },
    { id: 'font', near: () => w.nearFont(), dial: TOWN_SITES.find(s => s.id === 'font')!.press!, dir: { x: 0, y: 1 } },
  ];
  for (const v of verbs) {
    // THE ANCHORED DWELL (2026-09-06): a station's dial is centred on its
    // ANCHOR piece (the board, the slab, the fire) where one stands — the
    // seat's coordinate otherwise.
    const at = w.stationAnchor(v.id)?.pos ?? w.townSeat(v.id);
    park(at.x, at.y);
    const here = v.near();
    park(at.x + v.dir.x * (v.dial + 8), at.y + v.dir.y * (v.dial + 8));
    const past = v.near();
    park(at.x + v.dir.x * (v.dial - 8), at.y + v.dir.y * (v.dial - 8));
    const edge = v.near();
    check(`H: ${v.id} answers at its seat, inside its dial, and refuses a step past it (bearing ${v.dir.x},${v.dir.y})`,
      here && !past && edge, `${here}/${!past}/${edge}`);
  }
  // The caravan's counter is its body — seated by the structure at the site.
  const cara = w.actors.find(a => a.defId === 'townsfolk_caravanner');
  check('H: the caravanner stands at the caravan\'s seat', !!cara && d2(cara.pos, w.townSeat('caravan')) < 40);
  park(cara!.pos.x, cara!.pos.y + 20);
  check('H: the caravan answers at its body', w.nearCaravan());
}

// ------------------------------------------------------------ I. RESIDENTS
{
  check('I: every resident names a real body wearing the resident role + a real cottage',
    TOWN_RESIDENTS.every(r => MONSTERS[r.def]?.npcRole === 'resident' && TOWN_SITES.some(s => s.id === r.cottage)));
  check('I: every resident row gates (never an open door)', TOWN_RESIDENTS.every(r => r.gate.length > 0));
  const bare = makeAccount();
  check('I: a bare account seats nobody, at any tier', TOWN_TIERS.every((_, i) => townResidentsHere(bare, i).length === 0));
  const some = makeAccount();
  noteSoulsSheltered(some, 3);
  check('I: the stamp lands on the account', some.ledger[LEDGER_SOULS_SHELTERED] === 3);
  noteSoulsSheltered(some, 0); noteSoulsSheltered(some, -4);
  check('I: a non-positive stamp writes nothing', some.ledger[LEDGER_SOULS_SHELTERED] === 3);
  const firstTier = TOWN_SITES.find(s => s.id === TOWN_RESIDENTS[0].cottage)!.tiers.findIndex(p => !!p);
  check('I: the first family waits while their cottage has no ground',
    townResidentsHere(some, Math.max(0, firstTier - 1)).length === 0);
  const seated = townResidentsHere(some, firstTier);
  check('I: three souls seat the first family at their doorstep once the ward stands',
    seated.length === 1 && seated[0].row.id === TOWN_RESIDENTS[0].id
    && d2(seated[0].pos, townSiteAt(firstTier, TOWN_RESIDENTS[0].cottage)!) < 120);
  const many = makeAccount();
  noteSoulsSheltered(many, 999);
  check('I: with every soul home, the top rung seats every family', townResidentsHere(many, TOP).length === TOWN_RESIDENTS.length);
  check('I: a lower rung seats only the families whose cottages stand',
    townResidentsHere(many, firstTier).length === TOWN_RESIDENTS.filter(r => !!townSiteAt(firstTier, r.cottage)).length
    && townResidentsHere(many, firstTier).length < TOWN_RESIDENTS.length);
  // LIVE: the township with every soul home.
  const acct = fullAccount();
  noteSoulsSheltered(acct, 999);
  const w = mkTownWorld(acct);
  // (The inn's patron wears the resident ROLE too — the spoken-seat lane —
  //  so the ward's census reads the families by NAME, never by role alone.)
  const isFamily = (a: { name: string }): boolean => TOWN_RESIDENTS.some(r => r.name === a.name);
  const residents = w.actors.filter(a => a.defId && MONSTERS[a.defId]?.npcRole === 'resident' && isFamily(a));
  check('I: every family stands in the township', residents.length === TOWN_RESIDENTS.length);
  check('I: each family wears its own name at its cottage door',
    TOWN_RESIDENTS.every(r => residents.some(a => a.name === r.name && d2(a.pos, townSiteAt(TOP, r.cottage)!) < 120)));
  const first = residents.find(a => a.name === TOWN_RESIDENTS[0].name)!;
  w.player.pos.x = first.pos.x + 30; w.player.pos.y = first.pos.y + 30;
  check('I: a family speaks its line when the hero stands at the door', w.residentPrompt(first) === TOWN_RESIDENTS[0].line);
  // THE TRANSIENT TELLING (engine/speech.ts; probe_speech rig J pins the
  // clock): the line stands its window wherever the hero walks, THEN holds
  // its tongue — the read past the window, across the square, is null.
  w.time += speechWindowFor('resident', TOWN_RESIDENTS[0].line).holdSec + 0.05;
  w.player.pos.x = first.pos.x + 600; w.player.pos.y = first.pos.y + 600;
  check('I: and says nothing across the square once the telling has run its window', w.residentPrompt(first) === null);
  const w0 = mkTownWorld(fullAccount());
  check('I: the same township with no souls sheltered seats no family',
    !w0.actors.some(a => a.defId && MONSTERS[a.defId]?.npcRole === 'resident' && isFamily(a)));
}

// ------------------------------------- J. THE INN'S FLOORS + THE INN KIT
// The inn wave (2026-09-05): the public house on the kit, the rooms above on
// THE STOREY FABRIC (the same map one story up — probe_storey.ts pins the
// fabric's own laws; this rig pins the inn wearing it), the spoken seats,
// and the kit's own census — every piece a rule + a face + a brush + a plan
// character, so any plan anywhere may furnish with it.
{
  const KIT = ['tavern_table', 'chair', 'bar_counter', 'keg', 'dresser', 'linen_chest',
    'candle_stand', 'washstand', 'coat_rack', 'planter', 'wall_lantern'];
  const SOLID = KIT.filter(k => k !== 'chair' && k !== 'wall_lantern');
  check('J: every standing INN KIT kind carries a collision rule (never the ground fallback)',
    SOLID.every(k => doodadRuleOf(k).overlap === 'solid' && doodadRuleOf(k).blocksMove === true), SOLID.filter(k => doodadRuleOf(k).overlap !== 'solid').join(','));
  check('J: a chair is walk-over decor (her word: a room of pushed-back chairs stays walkable), drawn under the bodies that cross it',
    doodadRuleOf('chair').overlap === 'ground' && doodadRuleOf('chair').walkOnly === true
    && (DOODAD_VISUALS.chair.order ?? 50) < 50 && (DOODAD_VISUALS.chair.order ?? 0) > (DOODAD_VISUALS.rug.order ?? 0));
  check('J: every INN KIT kind wears a face, and every face names a real brush',
    KIT.every(k => !!DOODAD_VISUALS[k] && !!PAINTERS[DOODAD_VISUALS[k].painter])
    && DOODAD_VISUALS.bounty_board.painter === 'noticeBoard' && !!PAINTERS.noticeBoard
    && DOODAD_VISUALS.stairway.painter === 'stairway' && !!PAINTERS.stairway && !!PAINTERS.wallLantern);
  check('J: the waist-high pieces stop feet, never the eye or the arrow (the counter, the candle, the flower box)',
    ['bar_counter', 'candle_stand', 'planter'].every(k => doodadRuleOf(k).blocksShot === false));
  check('J: the plan vocabulary grew the kit (t c a K j x i J u y l all resolve to the kit\'s kinds)',
    legendCell('t')?.doodad?.kind === 'tavern_table' && legendCell('c')?.doodad?.kind === 'chair'
    && legendCell('a')?.doodad?.kind === 'bar_counter' && legendCell('K')?.doodad?.kind === 'keg'
    && legendCell('j')?.doodad?.kind === 'dresser' && legendCell('x')?.doodad?.kind === 'linen_chest'
    && legendCell('i')?.doodad?.kind === 'candle_stand' && legendCell('J')?.doodad?.kind === 'coat_rack'
    && legendCell('u')?.doodad?.kind === 'planter' && legendCell('y')?.doodad?.kind === 'rail_fence'
    && legendCell('l')?.doodad?.kind === 'wall_lantern');
  check('J: the stairway is a walk-over face (the crossing under it is the tier fabric\'s), never a pocket door',
    doodadRuleOf('stairway').overlap === 'ground' && doodadRuleOf('stairway').walkOnly === true
    && sidezoneOf('inn_stair') === undefined && !DOODAD_VISUALS.stairway.params?.label);
  // LIVE: the hamlet's inn — the kit on the boards, the stairway in the
  // corner, Mireille behind her counter, the patron speaking the stair.
  const w = mkTownWorld(makeAccount());
  const innAt = w.townSeat('inn');
  const innRect = rectOf('inn', innAt);
  const inInn = (d: { pos: { x: number; y: number } }): boolean => inRect(d.pos, innRect);
  const ground = w.doodads.filter(d => inInn(d) && (d.tier ?? 0) === 0);
  const kindsInInn = new Set(ground.map(d => d.kind));
  check('J: the inn raised its ground-floor furniture (counter run, kegs, tables, chairs, hearth, rugs, the stairway)',
    ['bar_counter', 'keg', 'tavern_table', 'chair', 'hearth', 'rug', 'coat_rack', 'candle_stand', 'stairway'].every(k => kindsInInn.has(k)),
    [...kindsInInn].join(','));
  check('J: the counter is a RUN (five chained cells)', ground.filter(d => d.kind === 'bar_counter').length === 5);
  check('J: the wall lanterns hang OUTSIDE the south wall, either side of the door, off the floor',
    w.doodads.filter(d => d.kind === 'wall_lantern' && d.pos.y > innAt.y + STRUCTURES.inn.halfH && Math.abs(d.pos.x - innAt.x) < 80).length === 2);
  check('J: THE FLOWER BOXES stand under the inn\'s two windows, outside the south wall (off the front\'s walkway — her word 2026-09-06)',
    w.doodads.filter(d => d.kind === 'planter' && d.pos.y > innAt.y + STRUCTURES.inn.halfH && Math.abs(Math.abs(d.pos.x - innAt.x) - 66) < 2).length === 2
    && !w.doodads.some(d => d.kind === 'planter' && inRect(d.pos, rectOf('bounty_front', w.townSeat('bounty_board')))));
  const stair = w.doodads.find(d => d.kind === 'stairway')!;
  check('J: exactly one stairway stands in the inn, under its roof, climbing NORTH to its landing (the foot by the door, the head at the hall — her word 2026-09-06)',
    w.doodads.filter(d => d.kind === 'stairway').length === 1 && !!w.roofedStructureAt(stair.pos)
    && Math.abs((stair.rot ?? 0) + Math.PI / 2) < 0.01 && stair.radius >= 26);
  // THE LAMPS ALONG THE WAYS (her word 2026-09-06): lampposts stand beside
  // the paved lanes — a stride off the pavement, never on it, none on the
  // board's front, none in the door lane (THE DOOR LANE LAW).
  const lanes = w.doodads.filter(d => d.kind === 'paved_way');
  const lamps = w.doodads.filter(d => d.kind === 'lantern_post');
  const offLane = (l: { pos: { x: number; y: number } }): number => Math.min(...lanes.map(p => d2(l.pos, p.pos) - p.radius));
  const wayLamps = lamps.filter(l => offLane(l) < 40);
  const doorAt = { x: innAt.x + 13, y: innAt.y + STRUCTURES.inn.halfH };
  check('J: THE LAMPS ALONG THE WAYS — the hamlet\'s short lanes seat at least one lamppost beside the pavement (a stride off it, never on it), none on the board\'s front, none in the door lane',
    wayLamps.length >= 1 && wayLamps.every(l => offLane(l) >= l.radius)
    && !lamps.some(l => inRect(l.pos, rectOf('bounty_front', w.townSeat('bounty_board'))))
    && !lamps.some(l => Math.abs(l.pos.x - doorAt.x) < 40 && l.pos.y >= doorAt.y && l.pos.y <= doorAt.y + 120),
    `${wayLamps.length} lamp(s) beside lanes of ${lamps.length}`);
  const mireille = w.actors.find(a => a.defId === 'townsfolk_innkeep')!;
  const counter = ground.filter(d => d.kind === 'bar_counter');
  check('J: Mireille stands BEHIND her counter (north of the run, within a step of it)',
    !!mireille && counter.every(c => c.pos.y > mireille.pos.y) && counter.some(c => d2(c.pos, mireille.pos) < 40));
  w.player.pos.x = mireille.pos.x; w.player.pos.y = mireille.pos.y + 60;
  check('J: her counter still serves across the run (the roof reach)', w.nearMireille());
  const patron = w.actors.find(a => a.defId === 'townsfolk_patron')!;
  check('J: THE SPOKEN SEAT — the patron stands in the inn and speaks the stair when the hero is near',
    !!patron && inInn(patron) && (w.player.pos.x = patron.pos.x + 24, w.player.pos.y = patron.pos.y + 24, true)
    && (w.residentPrompt(patron) ?? '').includes('stair'));
  // THE TRANSIENT TELLING (engine/speech.ts; probe_speech rig J pins the
  // clock): the telling stands its window, then the tongue is held.
  w.time += speechWindowFor('seat', w.residentPrompt(patron) ?? '').holdSec + 0.05;
  w.player.pos.x = patron.pos.x + 700; w.player.pos.y = patron.pos.y + 500;
  check('J: and holds his tongue across the square once the telling has run its window', w.residentPrompt(patron) === null);
  // THE FOLK ROSTER (data/innfolk.ts) + THE HAUNT (engine/ai.ts): the inn's
  // company is rolled per day off the pools, named, lined, coloured, and
  // STROLLS between its furniture — passive still (scenery with legs).
  const folk = w.actors.filter(a => a.defId?.startsWith('folk_'));
  check('J: the inn seats rostered guests (rolled off the folk pools, each a real def wearing a haunt)',
    folk.length >= 2 && folk.every(a => inInn(a) && MONSTERS[a.defId!]?.passive === true && !!MONSTERS[a.defId!]?.brain?.behavior?.haunt),
    folk.map(a => `${a.name}(${a.defId})`).join(', '));
  check('J: every guest wears a rolled name and speaks a rolled line (the spoken seat)',
    folk.every(a => a.name.length > 2) && folk.every(a => {
      w.player.pos.x = a.pos.x + 18; w.player.pos.y = a.pos.y + 18; w.player.tier = a.tier;
      return (w.residentPrompt(a) ?? '').length > 10;
    }));
  w.player.tier = 0; w.player.pos.x = 60; w.player.pos.y = 60;
  const w2 = mkTownWorld(makeAccount());
  const company = (x: World): string => x.actors.filter(a => a.defId?.startsWith('folk_')).map(a => `${a.name}|${a.defId}|${a.tier}`).join(',');
  check('J: the same world on the same day seats the same company (seeded per seat + day)', company(w2) === company(w));
  const w3 = mkTownWorld(makeAccount()); w3.time = DAY_LENGTH * 2 + 3; w3.loadZone(START_ZONE);
  check('J: a new day deals new faces (the roll rides the day)', company(w3) !== company(w) || company(w3).length === 0);
  // The stroll: sixty seconds under the AI drive — the patron and every guest
  // move, linger at seats, stay in the inn, and keep their stories.
  const strollers = [patron, ...folk];
  const start = strollers.map(a => ({ x: a.pos.x, y: a.pos.y, tier: a.tier }));
  let lingered = 0;
  for (let i = 0; i < 30 * 60; i++) {
    w.update(1 / 30);
    for (const a of w.actors) updateAI(a, w, 1 / 30);
    for (const a of strollers) if (a.hauntSeat?.until !== undefined) lingered++;
  }
  check('J: THE HAUNT — the patron and the guests stroll (every one moved, and lingered at a seat facing it)',
    strollers.every((a, i) => Math.hypot(a.pos.x - start[i].x, a.pos.y - start[i].y) > 6) && lingered > 0,
    strollers.map((a, i) => `${a.name}:${Math.hypot(a.pos.x - start[i].x, a.pos.y - start[i].y).toFixed(0)}`).join(' '));
  check('J: THE STORY LAW — a stroller keeps its story and its roof (nobody wandered downstairs, upstairs, or out the door)',
    strollers.every((a, i) => a.tier === start[i].tier && inInn(a)));
  check('J: strolling scenery is still scenery (passive, invulnerable, untargeted by the count)',
    strollers.every(a => a.passive && a.invulnerable));
  // THE ROOMS ABOVE — the same map, one story up (probe_storey pins the
  // fabric; here: the inn's storey stands, furnished, the lodger on it).
  const innSt = w.structures.find(s => s.defId === 'inn')!;
  const rec = innSt.storeys?.[0];
  check('J: the inn stands ONE storey above on the tier fabric (the zone declares an interior stack)',
    !!rec && rec.tier === 1 && w.zone.tiers?.interior === true && w.zone.tiers.levels === 1);
  const up = new Map<string, number>();
  for (const d of w.doodads) if (inInn(d) && (d.tier ?? 0) === 1) up.set(d.kind, (up.get(d.kind) ?? 0) + 1);
  check('J: three guest rooms furnished a story up (beds, dressers, chests, rugs, candles, a washstand, a shelf) — every piece wearing tier 1',
    (up.get('bed') ?? 0) === 3 && (up.get('dresser') ?? 0) >= 2 && (up.get('linen_chest') ?? 0) >= 2
    && (up.get('rug') ?? 0) >= 4 && (up.get('candle_stand') ?? 0) >= 3 && (up.get('washstand') ?? 0) === 1 && (up.get('shelf') ?? 0) >= 1,
    [...up.entries()].map(([k, n]) => `${k}:${n}`).join(','));
  check('J: every guest room is a sealed room of its own behind an archway (three sealed + the hall)',
    (rec?.rooms?.filter(r => r.enclosed).length ?? 0) >= 3 && (rec?.doors.length ?? 0) === 3);
  const lodger = w.actors.find(a => a.defId === 'townsfolk_lodger')!;
  // Meet at the resident's walkable seat: after strolling, an arbitrary
  // diagonal offset can put the player inside an upstairs partition.
  check('J: the lodger keeps the hall above (tier 1, on the storey\'s floor) and speaks the house',
    !!lodger && lodger.tier === 1 && inInn(lodger)
    && (w.player.pos.x = lodger.pos.x, w.player.pos.y = lodger.pos.y, w.player.tier = 1, true)
    && (w.residentPrompt(lodger) ?? '').includes('room'));
  if (lodger) {
    // Main's speech window intentionally lets an already-started utterance
    // finish after the hero moves away. Test a NEW telling across stories,
    // after that window and its cooldown, rather than cancelling old speech.
    const window = speechWindowFor('seat', w.residentPrompt(lodger) ?? '');
    w.time += window.holdSec + window.cooldownSec + 0.05;
    w.player.tier = 0;
    check('J: sharing a map position across stories does not start fresh resident speech',
      w.residentPrompt(lodger) === null);
    w.player.tier = 1;
  }
  w.player.tier = 0;
  // THE CLIMB: walk onto the flight from its foot and off its head — the
  // mover's own crossing law carries the hero up; back down the same way.
  // THE FLIPPED FLIGHT (her word 2026-09-06): the foot is SOUTH of the run
  // (by the door), the landing NORTH, opening straight into the hall.
  const p = w.player;
  p.pos.x = stair.pos.x; p.pos.y = stair.pos.y + stair.radius + 18; p.tier = 0; p.onTierLink = false;
  let landed = false;
  for (let i = 0; i < 90 && !landed; i++) { w.moveActor(p, 0, -1, 1 / 30); landed = w.walk?.regionAt?.(p.pos.x, p.pos.y) === 'storey_landing'; }
  check('J: walking up the stairway carries the hero to the rooms above (tier 1 at the landing)',
    p.tier === 1 && landed, `tier ${p.tier} on ${w.walk?.regionAt?.(p.pos.x, p.pos.y)}`);
  for (let i = 0; i < 40; i++) w.moveActor(p, 0, -1, 1 / 30);
  check('J: the hall above walks as the story\'s own floor (straight north off the landing — no furniture between the top step and the rooms)', p.tier === 1 && w.walk?.regionAt?.(p.pos.x, p.pos.y) === 'storey_floor');
  for (let i = 0; i < 120; i++) w.moveActor(p, 0, 1, 1 / 30);
  check('J: and walking back down the flight lands the hero on the common room\'s floor (tier 0)', p.tier === 0);
  check('J: the inn no longer mints a pocket (no cave was entered, no ledger stamped)',
    w.zone.id === START_ZONE && w.caveReturn === null && (w.ledger.inn_climbed ?? 0) === 0);
}

console.log(failed ? `\n${failed} FAILED` : '\nALL PASS');
process.exit(failed ? 1 : 0);
