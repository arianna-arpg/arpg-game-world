// ---------------------------------------------------------------------------
// ONE-OFF PROBE — THE CRUSADE WARFRONT end to end on the real overlay
// (docs/engine/crusade-warfront.md). Pins:
//   - UNBEKNOWNST ignition: a war kindles off a random charted node and the
//     map shows NOTHING (no wash, no markers-feed, no bulletins) until the
//     player walks its ground,
//   - the POWER ARC on the shipped dials: ember → growth → ANCHOR (one-way),
//     the pre-anchor tide breathing the territory, the anchored floor
//     ("beaten back, never extinguished") vs the un-anchored SNUFF,
//   - DISCOVERY: walking covered ground reveals the whole warfront (wash +
//     extent + bulletin) and only then,
//   - the CONTROL GRADIENT ladder: city at the heart (tier 4 only in the
//     heartland), fortress/camp/outpost falling off with distance, null
//     beyond the edge — and the throne gate (sanctumReady) only in anchored
//     heart ground within gateRange,
//   - the Daresso purity as AUTHORED DATA: sanctum packs null, garrison
//     [0,0], the crowd's champion-calls present,
//   - LIBERATION: resolveCrusadeZone suppresses the field locally (and it
//     HEALS), nicks power, and sustained pressure snuffs an unrooted war,
//   - CLASH: rival fields contest ground (both factions injected), the
//     stronger drains the weaker at its heart, and a pressed ember is
//     snuffed by a rival alone,
//   - policy: sanctuaries / special arenas / caves never read the field,
//   - the durable pledge: same seed + same ticks ⇒ byte-identical snapshots;
//     restore → snapshot roundtrips exactly; a v1 (spreading-state-machine)
//     snapshot is dropped without a throw.
// Run: npx tsx balance/probe_crusade.ts
// ---------------------------------------------------------------------------

import { bootSimEngine } from '../src/sim/arena';
import { seedGlobalRandom } from '../src/sim/rng';
import type { ZoneDef } from '../src/data/zones';
import type { OverlayView } from '../src/world/overlay';
import type { PackageGate } from '../src/packages/types';
import { CrusadeField, type CrusadeSurge } from '../src/packages/overlays/crusade';
import { CRUSADE_SURGE } from '../src/packages/defs/crusade';

let failed = 0;
const check = (name: string, ok: boolean, detail = ''): void => {
  console.log(`${ok ? 'PASS' : 'FAIL'}  ${name}${detail ? ' — ' + detail : ''}`);
  if (!ok) failed++;
};

bootSimEngine();
seedGlobalRandom(0xc205);

const GATE: PackageGate = { active: true, share: 1, pressure: 1, ignitionMul: 1, severityMul: 1, concurrencyMul: 1 };

const mkZone = (id: string, x: number, y: number, kind = 'clear', extra: Partial<ZoneDef> = {}): ZoneDef => ({
  id, name: id, map: { x, y }, exits: [], objective: { kind }, level: 12, ...extra,
} as unknown as ZoneDef);

const mkView = (nodes: ZoneDef[], currentZoneId: string): OverlayView => ({
  nodes, byId: Object.fromEntries(nodes.map(n => [n.id, n])), allNodes: nodes,
  terrain: () => 'land', currentZoneId, time: 0, census: {}, charLevel: 20,
  gates: new Map(), visited: new Set(nodes.map(n => n.id)),
});

const tick = (f: CrusadeField, view: OverlayView, seconds: number): void => {
  for (let i = 0; i < seconds * 2; i++) f.update(0.5, view);
};

const S = CRUSADE_SURGE;
const zones = [
  mkZone('lastlight', 0, 0, 'safe'),
  mkZone('za', 180, 40), mkZone('zb', 430, -60), mkZone('zc', 540, 90),
  mkZone('zd', 240, 260), mkZone('ze', -200, 160), mkZone('zf', 60, -240),
];

// ------------------------------------------- A. unbeknownst ignition + arc --
{
  const surge: CrusadeSurge = { ...S, triggerChance: 1, maxConcurrent: 1 };
  const f = new CrusadeField({ seed: 0x11, gate: () => GATE, biomeSeed: 1 }, surge);
  const view = mkView(zones, 'za');
  tick(f, view, 3);
  check('A: a war kindles (natural ignition, capped at maxConcurrent)', f.activeCount() === 1);
  const c0 = f.peek()[0];
  check('A: the heart plants off the charted web (never ON a node)',
    !!c0 && zones.every(z => Math.hypot(z.map.x - c0.heart.x, z.map.y - c0.heart.y) > 40),
    c0 ? `heart (${Math.round(c0.heart.x)},${Math.round(c0.heart.y)})` : 'no crusade');
  check('A: UNBEKNOWNST — not discovered, zero bulletins', !!c0 && !c0.discovered && f.bulletins.length === 0);
  const layer = f.renderMap(zones);
  check('A: the map shows NOTHING of an unfound war', layer.under === '' && layer.over === '' && f.mapExtent().length === 0);
  check('A: young ember is un-anchored', !!c0 && !c0.anchored && c0.power < surge.power.anchorAt);
  // Tick to anchor, watching the discovery edge: it may only ever flip at the
  // moment the growing front GENUINELY covers the player's standing zone.
  let flipPower = 0, flipPresence = 0;
  for (let i = 0; i < 1800; i++) {
    const wasFound = f.peek()[0]?.discovered ?? false;
    f.update(0.5, view);
    const c = f.peek()[0];
    if (!wasFound && (c?.discovered ?? false)) {
      flipPower = c?.power ?? 0;
      flipPresence = f.activityAt('za');
    }
  }
  const c2 = f.peek()[0];
  check('A: power GROWS on its own clock', !!c2 && c2.power > (c0?.power ?? 99) + 30);
  check('A: the war ANCHORS past the threshold (one-way)', !!c2 && c2.anchored && c2.power >= surge.power.anchorAt,
    c2 ? `power ${c2.power.toFixed(1)}` : 'died?');
  check('A: discovery fires ONLY when the front truly reaches the player',
    flipPower === 0 || (flipPresence > 0 && flipPower > 35),
    flipPower ? `front arrived at power ${flipPower.toFixed(0)} (presence ${flipPresence.toFixed(2)})` : 'never found (stayed far)');
}

// -------------------------------------------------- B. discovery + gradient --
// (Sections B-G pin triggerChance 0 — no natural ignitions muddying staged wars.)
const S0: CrusadeSurge = { ...S, triggerChance: 0 };
const fB = new CrusadeField({ seed: 0x22, gate: () => GATE, biomeSeed: 1 }, S0);
{
  // Plant a known, anchored war at za and WALK ring zones at set distances.
  const heart = zones[1].map; // za (180, 40)
  const ring = [
    mkZone('r150', heart.x + 150, heart.y),
    mkZone('r300', heart.x + 300, heart.y),
    mkZone('r900', heart.x + 900, heart.y),
    mkZone('cave', heart.x + 60, heart.y, 'clear', { caveDepth: 1 } as Partial<ZoneDef>),
    mkZone('arena', heart.x + 60, heart.y - 40, 'clear', { special: true } as Partial<ZoneDef>),
  ];
  const all = [...zones, ...ring];
  const viewFar = mkView(all, 'zf');
  check('B: devIgnite refuses a sanctuary', !fB.devIgnite(viewFar, 'lastlight'));
  check('B: devIgnite plants at the named zone', fB.devIgnite(viewFar, 'za'));
  fB.update(0.5, viewFar);
  const info0 = fB.crusadeOn('za');
  check('B: heart ground reads tier 4 (the faction city) + throne gate',
    !!info0 && info0.tier === 4 && info0.isStronghold && info0.sanctumReady && !!info0.cityFill,
    info0 ? `control ${(info0.control * 100).toFixed(0)}%` : 'null');
  const i150 = fB.crusadeOn('r150');
  const i300 = fB.crusadeOn('r300');
  const i900 = fB.crusadeOn('r900');
  check('B: the GRADIENT ladder falls off with distance',
    !!i150 && !!i300 && i150.tier < 4 && i300.tier <= i150.tier && i900 === null,
    `150u→${i150?.tier ?? '·'} 300u→${i300?.tier ?? '·'} 900u→${i900?.tier ?? '·'}`);
  check('B: outside the heartland the city never rises (tier cap)',
    !i150 || (i150.tier <= S.control.nonHeartMaxTier && !i150.sanctumReady));
  check('B: caves and special arenas never read the field',
    fB.crusadeOn('cave') === null && fB.crusadeOn('arena') === null);
  const wash = fB.renderMap(all);
  check('B: a FOUND war paints the gradient + the throne sigil',
    wash.under.includes('fill-opacity') && wash.over.includes('☗') && fB.mapExtent().length > 0);
  // Deeper cells wash denser: compare a heart-adjacent cell's opacity to a rim cell's.
  const ops = [...wash.under.matchAll(/fill-opacity="([\d.]+)"/g)].map(m => parseFloat(m[1]));
  check('B: the wash is a real GRADIENT (deep > rim)', ops.length > 4 && Math.max(...ops) > Math.min(...ops) * 1.8,
    `${ops.length} cells, ${Math.min(...ops).toFixed(3)}..${Math.max(...ops).toFixed(3)}`);
}

// ----------------------------------------------- C. the Daresso purity data --
check('C: the throne arena is authored ONE-ON-ONE (packs null, garrison [0,0], crowd calls live)',
  S.sanctum.packs === null
  && S.sanctum.garrison.count[0] === 0 && S.sanctum.garrison.count[1] === 0
  && (S.sanctum.arena?.crowd?.championCalls?.length ?? 0) >= 2
  && !!S.sanctum.arena?.crowd?.disperseOnBossDeathSec);

// ------------------------------------------------- D. liberation + healing --
{
  const heart = zones[1].map;
  const near = mkZone('n120', heart.x + 120, heart.y);
  const all = [...zones, near];
  const view = mkView(all, 'zf');
  fB.update(0.5, view);
  const before = fB.crusadeOn('n120');
  const power0 = fB.peek()[0]?.power ?? 0;
  const mul = fB.resolveCrusadeZone('n120');
  const power1 = fB.peek()[0]?.power ?? 99; // read BEFORE the next tick regrows
  fB.update(0.5, view);
  const after = fB.crusadeOn('n120');
  check('D: liberation pays a tier bounty + nicks the campaign', mul > 1
    && power1 <= power0 - S.suppress.powerNick + 0.001,
    `mul ×${mul.toFixed(1)}, power ${power0.toFixed(0)}→${power1.toFixed(0)}`);
  check('D: the field COLLAPSES locally', (after?.control ?? 0) < (before?.control ?? 0) * 0.55,
    `control ${(before?.control ?? 0).toFixed(2)}→${(after?.control ?? 0).toFixed(2)}`);
  tick(fB, view, S.suppress.forSec + 20);
  const healed = fB.crusadeOn('n120');
  check('D: …and HEALS once the suppression fades', (healed?.control ?? 0) > (after?.control ?? 0) * 1.4,
    `→${(healed?.control ?? 0).toFixed(2)}`);
}

// ------------------------------------------- E. snuff vs the anchored floor --
{
  const f = new CrusadeField({ seed: 0x33, gate: () => GATE, biomeSeed: 1 }, S0);
  const view = mkView(zones, 'zf');
  f.devIgnite(view, 'za', 30);            // an un-rooted ember
  f.update(0.5, view);
  for (let i = 0; i < 4; i++) { f.resolveCrusadeZone('za'); f.update(0.5, view); }
  check('E: sustained pressure SNUFFS an un-anchored war', f.activeCount() === 0
    && f.bulletins.some(b => b.text.includes('gutters out')));
  f.devIgnite(view, 'zb', S.power.devIgnite); // an anchored throne
  f.update(0.5, view);
  for (let i = 0; i < 20; i++) { f.resolveCrusadeZone('zb'); f.update(0.5, view); }
  const c = f.peek()[0];
  check('E: an ANCHORED throne is beaten back to its floor, never snuffed',
    f.activeCount() === 1 && !!c && c.anchored && Math.abs(c.power - S.power.anchoredFloor) < 2,
    c ? `power ${c.power.toFixed(1)} (floor ${S.power.anchoredFloor})` : 'died!');
}

// ------------------------------------------------------------- F. the clash --
{
  const f = new CrusadeField({ seed: 0x44, gate: () => GATE, biomeSeed: 1 }, S0);
  const wa = mkZone('wa', 0, 0), wb = mkZone('wb', 250, 0), mid = mkZone('mid', 125, 0);
  const view = mkView([wa, wb, mid], 'wa');
  check('F: rival banners plant (pinned factions)',
    f.devIgnite(view, 'wa', 180, 'crusade') && f.devIgnite(view, 'wb', 140, 'goblin'));
  f.update(0.5, view);
  const bias = f.affectSpawns(mid);
  check('F: contested ground fields BOTH rosters (the in-zone warfront)',
    bias.injectFactions.includes('crusade') && bias.injectFactions.includes('goblin'));
  const weak0 = f.peek().find(c => c.faction === 'goblin')?.power ?? 0;
  tick(f, view, 60);
  const weak1 = f.peek().find(c => c.faction === 'goblin')?.power ?? 0;
  const strong1 = f.peek().find(c => c.faction === 'crusade')?.power ?? 0;
  check('F: the stronger field DRAINS the weaker at its heart', weak1 < weak0 && strong1 > 100,
    `weak ${weak0.toFixed(0)}→${weak1.toFixed(0)}, strong ${strong1.toFixed(0)}`);
  // Decisive end: with a harder drain dial the rival alone snuffs the ember.
  const fast: CrusadeSurge = { ...S0, clash: { ...S.clash, drainPerSec: 4 } };
  const g = new CrusadeField({ seed: 0x45, gate: () => GATE, biomeSeed: 1 }, fast);
  g.devIgnite(view, 'wa', 180, 'crusade');
  g.devIgnite(view, 'wb', 40, 'goblin');
  tick(g, view, 240);
  check('F: a pressed ember is SNUFFED by a rival alone (no player)',
    g.activeCount() === 1 && g.peek()[0]?.faction === 'crusade');
}

// -------------------------------------- G. determinism + the durable pledge --
{
  const mk = (): { f: CrusadeField; view: OverlayView } => {
    const f = new CrusadeField({ seed: 0x55, gate: () => GATE, biomeSeed: 1 }, S0);
    const view = mkView(zones, 'za');
    f.devIgnite(view, 'za', 80);
    tick(f, view, 90);
    f.resolveCrusadeZone('za');
    tick(f, view, 30);
    return { f, view };
  };
  const a = mk(), b = mk();
  const ja = JSON.stringify(a.f.snapshot()), jb = JSON.stringify(b.f.snapshot());
  check('G: same seed + same ticks ⇒ byte-identical snapshots', ja === jb);
  check('G: snapshot is pure JSON', ja === JSON.stringify(JSON.parse(ja)));
  const fresh = new CrusadeField({ seed: 0x55, gate: () => GATE, biomeSeed: 1 }, S0);
  fresh.restore(JSON.parse(ja));
  check('G: restore → snapshot roundtrips exactly', JSON.stringify(fresh.snapshot()) === ja);
  fresh.update(0.5, a.view);
  check('G: a restored war keeps living', fresh.activeCount() === 1);
  const legacy = new CrusadeField({ seed: 0x56, gate: () => GATE, biomeSeed: 1 }, S0);
  legacy.restore({
    ownedZones: ['crusade_cru_0'], seq: 3,
    crusades: [{ id: 'cru_0', faction: 'goblin', strongholdCoord: { x: 0, y: 0 }, age: 10, mints: 1, claimAcc: 0 }],
    held: [{ zid: 'crusade_cru_0', crusadeId: 'cru_0', faction: 'goblin', ageHeld: 50, netFactor: 1, isStronghold: true }],
  });
  check('G: a v1 (pre-field) snapshot is DROPPED tolerantly (fresh war, no throw)', legacy.activeCount() === 0);
}

console.log(failed ? `\n${failed} CHECK(S) FAILED` : '\nALL CHECKS PASSED');
process.exit(failed ? 2 : 0);
