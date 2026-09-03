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
//   E. THE SMITH'S YARD + THE INN SQUARE — the crafting flow reads west →
//      east through the forge; the alcove stands a stride from the inn door
//      and outside its roof.
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
// Run: npx tsx balance/probe_towngrowth.ts   (exit 0 = all PASS)
// ---------------------------------------------------------------------------

import { bootSimEngine, classById } from '../src/sim/arena';
import { resetActorIdCounter } from '../src/engine/actor';
import { World } from '../src/engine/world';
import { buildManifest } from '../src/packages/manifest';
import { CLASSES } from '../src/data/classes';
import { FEATURE, LEDGER_SOULS_SHELTERED, makeAccount, type Account } from '../src/meta/account';
import { START_ZONE, ZONES } from '../src/data/zones';
import {
  TOWN_ADDITIONS, TOWN_SITES, TOWN_TIERS, expandedTown, townBaseFixtures, townLayoutFor,
  townSiteAt, townStationFeatures, townTier, type TownSiteId,
} from '../src/data/townBuild';
import { TOWN_RESIDENTS, noteSoulsSheltered, townResidentsHere } from '../src/data/boroughs';
import { STRUCTURES } from '../src/data/structures';
import { MONSTERS } from '../src/data/monsters';
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

// ------------------------------- E. THE SMITH'S YARD + THE INN SQUARE
{
  let flow = true, yard = true, alcove = true, outsideRoof = true, apart = true;
  const YARD_REACH = 560; // DIAL: how far a crafting station may stand from the forge
  const DOOR_STRIDE = 260; // DIAL: the board within this of Mireille's door
  const inn = STRUCTURES.inn, alc = STRUCTURES.bounty_alcove;
  for (let tier = 0; tier < TOWN_TIERS.length; tier++) {
    const forge = townSiteAt(tier, 'blacksmith')!, bench = townSiteAt(tier, 'salvage')!;
    const stones = townSiteAt(tier, 'oracle')!, font = townSiteAt(tier, 'font')!;
    // The yard FORMS from the village up (the hamlet holds one station at
    // most, and its north road runs where the yard would stand).
    if (tier >= 1 && !(bench.x < stones.x && stones.x < font.x)) flow = false;
    if (tier >= 1 && [bench, stones, font].some(p => d2(p, forge) > YARD_REACH)) yard = false;
    const innAt = townSiteAt(tier, 'inn')!, board = townSiteAt(tier, 'bounty_board')!;
    // house plan: the inn's door is the bottom row's centre-right cell.
    const door = { x: innAt.x + 13, y: innAt.y + inn.halfH };
    if (d2(board, door) > DOOR_STRIDE) { alcove = false; console.log(`   tier ${tier}: board ${d2(board, door).toFixed(0)} from the inn door`); }
    if (inRect(board, rectOf('inn', innAt))) outsideRoof = false;
    if (rectsOverlap(rectOf('bounty_alcove', board), rectOf('inn', innAt))) apart = false;
  }
  check('E: the crafting flow reads west → east (bench, stones, Font)', flow);
  check('E: every crafting station stands in the forge\'s yard', yard);
  check('E: the alcove stands a stride from Mireille\'s door at every tier', alcove);
  check('E: the board stands outside the inn\'s roof (her counter serves under it)', outsideRoof);
  check('E: the alcove\'s footprint never touches the inn\'s', apart);
  check('E: the alcove is a roofed nook with an open front (rooms — never wraps the reader)',
    alc.confineVision === 'rooms' && alc.roofs === 'auto' && (alc.plan?.[alc.plan.length - 1].startsWith('_') ?? false));
  check('E: the alcove pins its board to the back wall (the N cell under the roof)',
    (alc.plan?.[1].includes('N') ?? false));
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
  check('H: exactly one board stands, pinned to the alcove\'s wall a half-row above its seat',
    board.length === 1 && d2(board[0].pos, w.townSeat('bounty_board')) < 30);
  check('H: the boards-here census reads the alcove\'s seat',
    w.bountyBoardsHere().some(b => b.id === BOUNTY_BOARD_CFG.boardId && d2(b.pos, w.townSeat('bounty_board')) < 1));
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
  // Each verb is probed along an OPEN bearing from its seat (the alcove's
  // board is read from its open front — its side walls honestly block a
  // sight-reach from the flank, which is the roof/wall law, not a miss).
  const verbs: { id: TownSiteId; near: () => boolean; dial: number; dir: { x: number; y: number } }[] = [
    { id: 'salvage', near: () => w.nearSalvage(), dial: SALVAGE_CFG.stationRadius, dir: { x: 1, y: 0 } },
    { id: 'oracle', near: () => w.nearOracle(), dial: SALVAGE_CFG.stationRadius, dir: { x: 1, y: 0 } },
    { id: 'tracker', near: () => w.nearTracker(), dial: SALVAGE_CFG.stationRadius, dir: { x: 1, y: 0 } },
    { id: 'campfire', near: () => w.nearCampfire(), dial: TOWN_SITES.find(s => s.id === 'campfire')!.dwell!, dir: { x: 1, y: 0 } },
    { id: 'bounty_board', near: () => w.nearBountyBoard(), dial: BOUNTY_BOARD_CFG.dwell.radius, dir: { x: 0, y: 1 } },
    { id: 'font', near: () => w.nearFont(), dial: TOWN_SITES.find(s => s.id === 'font')!.press!, dir: { x: 1, y: 0 } },
  ];
  for (const v of verbs) {
    const at = w.townSeat(v.id);
    park(at.x, at.y);
    const here = v.near();
    park(at.x + v.dir.x * (v.dial + 8), at.y + v.dir.y * (v.dial + 8));
    const past = v.near();
    park(at.x + v.dir.x * (v.dial - 8), at.y + v.dir.y * (v.dial - 8));
    const edge = v.near();
    check(`H: ${v.id} answers at its seat, inside its dial, and refuses a step past it`,
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
  const residents = w.actors.filter(a => a.defId && MONSTERS[a.defId]?.npcRole === 'resident');
  check('I: every family stands in the township', residents.length === TOWN_RESIDENTS.length);
  check('I: each family wears its own name at its cottage door',
    TOWN_RESIDENTS.every(r => residents.some(a => a.name === r.name && d2(a.pos, townSiteAt(TOP, r.cottage)!) < 120)));
  const first = residents.find(a => a.name === TOWN_RESIDENTS[0].name)!;
  w.player.pos.x = first.pos.x + 30; w.player.pos.y = first.pos.y + 30;
  check('I: a family speaks its line when the hero stands at the door', w.residentPrompt(first) === TOWN_RESIDENTS[0].line);
  w.player.pos.x = first.pos.x + 600; w.player.pos.y = first.pos.y + 600;
  check('I: and says nothing across the square', w.residentPrompt(first) === null);
  const w0 = mkTownWorld(fullAccount());
  check('I: the same township with no souls sheltered seats no family',
    !w0.actors.some(a => a.defId && MONSTERS[a.defId]?.npcRole === 'resident'));
}

console.log(failed ? `\n${failed} FAILED` : '\nALL PASS');
process.exit(failed ? 1 : 0);
