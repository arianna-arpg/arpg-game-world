// ---------------------------------------------------------------------------
// ONE-OFF PROBE — THE FORECHART FABRIC end to end on the real engine
// (world/forechart.ts + the world sweep; docs/engine/forechart.md). Pins:
//   - THE HALO: standing in the starter web, the sweep MINTS veiled zones
//     ahead of the walker (budgeted, inside FORECHART_CFG.ring), through the
//     REAL chartFrontier path — and every veiled zone is invisible at the
//     one fog seam (world.visible === false),
//   - THE VEIL INVARIANT: no veiled zone is ever adjacent to VISITED ground
//     (the classic one-ring map preview is always unveiled),
//   - THE RING-1 UNVEIL: entering a zone lifts the veil on every direct
//     neighbour — walking IS discovery, with the same map presentation the
//     eager web always had,
//   - THE SEAT FABRIC (world/seats.ts): pickSeat honors the eventTargetable
//     floor, the range envelope, and the known/unknown/veiled weights (a
//     999× unknown lean statistically lands on unknown ground),
//   - THE OMEN FABRIC (world/omens.ts): reach WIDENS with age (the
//     findability guarantee), whisper lines expand {bearing}/{dist}, and the
//     engine's reveal pass SURVEYS a registered omen's seat onto the map,
//   - SOUNDINGS: a far request grows a veiled cluster around the coordinate
//     (floating anchor + budding web), all of it veiled,
//   - WORLDSTATE: veiled flags ride the save verbatim — a serialize/adopt
//     round-trip keeps the halo veiled and the invariant intact,
//   - THE HARBOR BOARD (data/ports.ts): World.harborHearsay is the EXACT
//     read the Sail panel consumes — far surface omens priced by the chart
//     law, THE CANCHART SPLIT (a row charts only when it names a zone the
//     world KNOWS — both refusal legs pinned), the max cap, THE ROUND TRIP
//     (a serialize/adopt resume reads the SAME board — the hearsay never
//     loses knowledge across a save), and THE CHART PURCHASE through the
//     real intent path (requestMeta 'harborChart'): poverty refuses,
//     unchartable rows refuse wallet-untouched, the real buy pays exact
//     change, surveys the seat, and retires the row for good,
//   - THE WATER OMENS (world/seas.ts + world/voyage.ts, batch 52): the
//     guarantee past the shoreline — an unminted spot and an unfound island
//     whisper COORD-ONLY (pure reads that never mint), a minted veiled
//     harbor seats its omen ON the port zone, and the engine pass reveals
//     it through the registered source; a found harbor goes silent.
// Run: npx tsx balance/probe_forechart.ts
// ---------------------------------------------------------------------------

import { bootSimEngine, makeSimWorld } from '../src/sim/arena';
import { seedGlobalRandom } from '../src/sim/rng';
import type { World } from '../src/engine/world';
import type { ZoneDef } from '../src/data/zones';
import { HUB_ZONE, START_ZONE } from '../src/data/zones';
import { Rng } from '../src/core/rng';
import { FORECHART_CFG } from '../src/world/forechart';
import { SEA_CLASSES } from '../src/data/seas';
import { PORT_CFG } from '../src/data/ports';
import { ESSENCE_IDS } from '../src/data/essences';
import { cellKind, continentSeedFrom } from '../src/world/continents';
import { SEA_OMEN, clearSeaMemo, seaOfCell, seaSpotOmensAt, seaSpotsNear, type Sea, type SeaPortSpot } from '../src/world/seas';
import { islandOmens, islandOmensAt, islandsNear, type IslandSpot } from '../src/world/voyage';
import { placeZoneAt } from '../src/engine/worldgen';
import { pickSeat, seatCandidates } from '../src/world/seats';
import { bearingWord, collectOmens, distWord, omenLine, omenReach, registerOmenSource, type Omen } from '../src/world/omens';
import type { OverlayView } from '../src/world/overlay';
import { coordDist } from '../src/world/coords';

let failed = 0;
const check = (name: string, ok: boolean, detail = ''): void => {
  console.log(`${ok ? 'PASS' : 'FAIL'}  ${name}${detail ? ' — ' + detail : ''}`);
  if (!ok) failed++;
};

bootSimEngine();
seedGlobalRandom(0xf03e);

// THE PINNED GOVERNOR (the harness half of the TIME GOVERNOR's law): under
// sim boot the beat budget is COUNT alone — wall clock steering the halo made
// every seeded probe's web state load-dependent (probe_objectives G1).
check('A: the harness pins the TIME GOVERNOR (count-budgeted beats — load never steers the halo)',
  FORECHART_CFG.beatBudgetMs === Infinity);

const step = (w: World, dt: number, n = 1): void => { for (let i = 0; i < n; i++) w.update(dt); };
const veiledOf = (w: World): ZoneDef[] => Object.values(w.zoneMap).filter(z => z.veiled);
const invariantBreaks = (w: World): number =>
  veiledOf(w).filter(z => z.exits.some(e => e.to !== '?' && w.visited.has(e.to))).length;

// ------------------------------------------------ A. the halo grows, veiled
const w = makeSimWorld('warrior', 0xf03e01);
w.loadZone(HUB_ZONE); // stand at the crossroads — the starter web's live heart
const before = Object.keys(w.zoneMap).length;
step(w, 0.25, 400); // ~100s of world time — dozens of sweeps
const veiled = veiledOf(w);
const after = Object.keys(w.zoneMap).length;
check('A: the sweep MINTS ahead of the walker', after > before + 20,
  `${before} → ${after} zones (${veiled.length} veiled)`);
check('A: a healthy halo stands', veiled.length >= 20, `${veiled.length} veiled`);
check('A: every veiled zone is INVISIBLE at the fog seam',
  veiled.every(z => !w.visible(z)), `${veiled.filter(z => w.visible(z)).length} leaks`);
// Ring discipline: a mint projects ~86u past its source, and a FIELD zone
// re-centres its node on the whole region's middle (fieldifyZone) — so the
// rim is ragged by up to a field span where an expanse straddles it. SEA
// SYSTEMS are exempt by design (the foreordained law, world/seas.ts): a
// frontier touching any water mints that sea's WHOLE port system, and its
// far-side harbors stand wherever the water runs — the ring governs the
// LAND sweep alone. The guard is against RUNAWAY growth, never honest
// geometry.
check('A: the halo respects the ring (+ field-span slack; sea systems exempt)',
  veiled.filter(z => !z.seaId).every(z => coordDist(z.map, w.zone.map) <= FORECHART_CFG.ring + 700),
  'every veiled LAND zone within ring + a field span');
// maxVeiled is SOFT backpressure (checked at sweep start): one sweep's
// hustled batch — or an ATOMIC sea-system mint (the foreordained law: a
// whole harbor-pair set at one water touch) — may land past it before the
// gate closes. Slack = a hustled sweep + the largest sea's pair set, both
// derived from live data, so the guard still catches RUNAWAY growth.
const SOFT_SLACK = Math.ceil(FORECHART_CFG.perSweep * FORECHART_CFG.hustleMul)
  + Math.max(...SEA_CLASSES.map(c => c.ports[1])) * 2;
check('A: the budget holds (soft cap + one atomic batch)',
  veiled.length <= FORECHART_CFG.maxVeiled + SOFT_SLACK,
  `${veiled.length} ≤ ${FORECHART_CFG.maxVeiled} + ${SOFT_SLACK}`);
check('A: town + hub stay visible',
  w.visible(w.zoneMap[START_ZONE]) && w.visible(w.zoneMap[HUB_ZONE]));
check('A: THE VEIL INVARIANT — no veiled zone borders visited ground',
  invariantBreaks(w) === 0, `${invariantBreaks(w)} breaks`);

// ------------------------------------------------ B. the ring-1 unveil law
{
  // Walk one step out: a hub neighbour (unveiled ring-1 by the invariant).
  const ring1 = w.zoneMap[HUB_ZONE].exits
    .map(e => w.zoneMap[e.to]).filter((z): z is ZoneDef => !!z && !z.veiled && z.id !== START_ZONE);
  check('B: the hub has unveiled ring-1 neighbours', ring1.length > 0, `${ring1.length}`);
  const dest = ring1[0];
  const veiledBefore = dest.exits.map(e => w.zoneMap[e.to]).filter(z => z?.veiled).length;
  w.loadZone(dest.id);
  const veiledAfter = dest.exits.map(e => w.zoneMap[e.to]).filter(z => z?.veiled).length;
  check('B: ENTERING unveils the whole ring-1', veiledAfter === 0,
    `${veiledBefore} veiled neighbours → ${veiledAfter}`);
  check('B: deeper country STAYS veiled', veiledOf(w).length > 0,
    `${veiledOf(w).length} still veiled beyond the ring`);
  check('B: the invariant holds after travel', invariantBreaks(w) === 0);
}

// ------------------------------------------------ C. the seat fabric (pure)
{
  const mk = (id: string, x: number, y: number, extra?: Partial<ZoneDef>): ZoneDef => ({
    id, name: id, level: 5, size: { w: 1000, h: 800 }, shape: 'rect',
    theme: w.zoneMap[HUB_ZONE].theme, layout: [], objective: { kind: 'clear' },
    exits: [], map: { x, y }, ...extra,
  } as ZoneDef);
  const nodes = [
    mk('home', 0, 0),
    mk('near_known', 100, 0),
    mk('far_known', 500, 0),
    mk('far_unknown', 0, 500),
    mk('far_veiled', -500, 0, { veiled: true }),
    mk('sanctuary', 300, 300, { objective: { kind: 'safe' } }),
    mk('too_far', 3000, 0),
  ];
  const view: OverlayView = {
    nodes, byId: Object.fromEntries(nodes.map(n => [n.id, n])), allNodes: nodes,
    terrain: () => 'land', currentZoneId: 'home', time: 0, census: {},
    charLevel: 10, gates: new Map(), visited: new Set(['home', 'near_known', 'far_known']),
    surveyed: new Set<string>(),
  };
  const rng = new Rng(0x5ea7);
  const cands = seatCandidates(view, { event: 'crusade', range: { min: 150, max: 900 } });
  check('C: candidates honor range + the eventTargetable floor',
    cands.every(z => z.id !== 'sanctuary' && z.id !== 'too_far' && z.id !== 'near_known'),
    cands.map(z => z.id).join(','));
  let unknown = 0, veiledHits = 0;
  for (let i = 0; i < 300; i++) {
    const s = pickSeat(view, {
      event: 'crusade', range: { min: 150, max: 900 }, unknownMul: 999, veiledMul: 1,
    }, rng);
    if (s && !view.visited.has(s.id)) unknown++;
    if (s?.veiled) veiledHits++;
  }
  check('C: a 999× unknown lean lands on unknown ground', unknown >= 295, `${unknown}/300`);
  check('C: veiled ground IS in the unknown pool', veiledHits > 50, `${veiledHits}/300 veiled`);
  const none = pickSeat(view, { event: 'crusade', range: { min: 2500, max: 2600 } }, rng);
  check('C: an empty envelope yields null (no forced seat)', none === null);
}

// ------------------------------------------------ D. the omen fabric
{
  const o: Omen = {
    id: 'probe_omen', at: { x: 0, y: -400 }, zoneId: '',
    lines: ['trouble to the {bearing}, {dist}'], whisper: 100, reveal: 40,
    widenPerMin: 60, age: 0,
  };
  const r0 = omenReach(o);
  o.age = 120; // two minutes stood
  const r2 = omenReach(o);
  check('D: reach WIDENS with age (the findability guarantee)',
    r2.whisper === r0.whisper + 120 && r2.reveal === r0.reveal + 120,
    `whisper ${r0.whisper}→${r2.whisper}, reveal ${r0.reveal}→${r2.reveal}`);
  check('D: bearings read as compass words',
    bearingWord({ x: 0, y: 0 }, { x: 0, y: -400 }) === 'north'
    && bearingWord({ x: 0, y: 0 }, { x: 400, y: 0 }) === 'east');
  const line = omenLine(o, o.lines[0], { x: 0, y: 0 });
  check('D: {bearing}/{dist} expand in place',
    line.includes('north') && line.includes(distWord(400)), line);

  // THE ENGINE REVEAL: register a live omen source pointed at a real veiled
  // zone far from the player; age it loud enough that the reveal radius
  // covers the standing zone → the seat must be SURVEYED onto the map.
  const target = veiledOf(w).sort((a, b) =>
    coordDist(a.map, w.zone.map) - coordDist(b.map, w.zone.map)).pop();
  check('D: a far veiled target stands for the reveal rig', !!target);
  if (target) {
    const live: Omen = {
      id: 'probe_live_omen', at: { x: target.map.x, y: target.map.y }, zoneId: target.id,
      lines: ['the probe murmurs, {bearing}'], whisper: 40, reveal: 20,
      widenPerMin: 100000, age: 60, // one minute old → reveal reach ~100k: covers anywhere
    };
    registerOmenSource(() => live.id ? [live] : []);
    step(w, 0.5, 12); // past the omen cadence — the reveal pass runs
    check('D: the reveal SURVEYS the seat (veil pierced, map marked)',
      !target.veiled && w.surveyed.has(target.id),
      `veiled=${!!target.veiled} surveyed=${w.surveyed.has(target.id)}`);
    live.id = ''; // silence the source for the rigs below
  }
}

// ------------------------------------------------ E. soundings (the far arm)
{
  const at = { x: w.zone.map.x + 2400, y: w.zone.map.y + 2400 }; // far past the halo
  const countNear = (): number => Object.values(w.zoneMap)
    .filter(z => coordDist(z.map, at) <= FORECHART_CFG.sounding.radius).length;
  const before = countNear();
  w.forechartSounding(at);
  step(w, 0.25, 600); // let the queue work
  const after = countNear();
  check('E: a sounding grows real ground at the far coordinate', after > before,
    `${before} → ${after} zones near the sounding`);
  const cluster = Object.values(w.zoneMap).filter(z => coordDist(z.map, at) <= FORECHART_CFG.sounding.radius);
  check('E: the cluster is fully veiled (unfound country)',
    cluster.every(z => z.veiled), `${cluster.filter(z => !z.veiled).length} unveiled`);
}

// ------------------------------------------------ F. the latent grief
// (haunting's dormancy-until-found — THE template for dormant seats): an
// unknown seat settles LATENT (clock frozen, invisible, activity 0) and
// RISES the moment its ground becomes known. Direct-overlay rig (the
// probe_crusade style): a custom always-hour surge, a hand-built view.
{
  const { HauntField } = await import('../src/packages/overlays/haunting');
  const gate = { active: true, share: 1, pressure: 1, ignitionMul: 1000, severityMul: 1, concurrencyMul: 1 };
  const hf = new HauntField({ seed: 0xdead, gate: () => gate, biomeSeed: 1 }, {
    igniteChance: 1, maxConcurrent: 1,
    seat: { unknownMul: 999 },
    latentOnUnknown: true,
    omen: { whisper: 100, reveal: 40, widenPerMin: 10, lines: ['x {bearing}'] },
    ttlSeconds: [5, 5], streamInterval: [4, 6], maxAlive: 3, levelBonus: 0,
    roster: [], anchorId: 'grave_anchor', bossId: 'wailing_one', bossLevelBonus: 0,
    // NO beginPhases/holdPhases — any hour, so the rig needs no day-wheel math.
  } as never);
  const home = w.zoneMap[START_ZONE];
  const far = { ...home, id: 'far_unknown', name: 'Far', map: { x: 400, y: 0 }, objective: { kind: 'clear' as const }, exits: [] };
  const view: OverlayView = {
    nodes: [home, far as ZoneDef], byId: { [home.id]: home, far_unknown: far as ZoneDef },
    allNodes: [home, far as ZoneDef], terrain: () => 'land', currentZoneId: home.id,
    time: 0, census: {}, charLevel: 20, gates: new Map(),
    visited: new Set([home.id]), surveyed: new Set<string>(),
  };
  for (let i = 0; i < 8 && hf.activeCount() === 0; i++) hf.update(0.5, view);
  const seated = hf.peek()[0];
  check('F: a grief seats on the unknown ground', !!seated && seated.zoneId === 'far_unknown',
    seated ? seated.zoneId : 'none');
  check('F: …and settles LATENT (invisible, inert)',
    !!seated?.latent && hf.hauntOn('far_unknown') === null && hf.activityAt('far_unknown') === 0);
  const ttl0 = 5;
  for (let i = 0; i < 40; i++) hf.update(0.5, view); // 20s — four ttls' worth
  check('F: the LATENT clock is FROZEN (no lapse unfound)',
    hf.activeCount() === 1, `still standing after ${ttl0 * 4}s`);
  (view.visited as Set<string>).add('far_unknown'); // the ground becomes known
  hf.update(0.5, view);
  const risen = hf.peek()[0];
  check('F: known ground RISES the grief (latent clears, the haunt lives)',
    !!risen && !risen.latent && hf.hauntOn('far_unknown') !== null);
  gate.active = false; // silence ignition — a 100%-chance rig would instantly re-seat
  for (let i = 0; i < 24; i++) hf.update(0.5, view); // 12s > ttl 5s
  check('F: a risen grief lapses on its ordinary clock again', hf.activeCount() === 0);
}

// ------------------------------------------------ G. worldstate round-trip
{
  const veiledIds = new Set(veiledOf(w).map(z => z.id));
  const state = w.serializeWorldState();
  const w2 = makeSimWorld('warrior', 0xf03e02);
  const ok = w2.adoptWorldState(state);
  check('G: the saved world stands back up', ok === true);
  if (ok) {
    const veiled2 = veiledOf(w2);
    check('G: the veil RIDES the save', veiled2.length > 0 && veiled2.every(z => veiledIds.has(z.id)),
      `${veiledIds.size} saved → ${veiled2.length} restored veiled`);
    check('G: every restored veiled zone is still invisible',
      veiled2.every(z => !w2.visible(z)));
    check('G: the invariant holds after resume', invariantBreaks(w2) === 0);
  }
}

// ------------------------------------------------ H. the harbor board
// (data/ports.ts): the hearsay lane end to end. World.harborHearsay() is the
// EXACT read ui/panels' Sail surface consumes — these rigs read that, never a
// re-derivation (drawn == tested). The fixture is the probe_seas idiom: hunt
// a world whose field keeps a multi-port sea with a FAR pair, then stage a
// DEADLINE siege on the far anchor (the probe_harborholds idiom — state +
// fallAt ride ZoneDef.harborhold, sanitizer-proof), so ONE board row derives
// WHOLLY from persisted world state.
{
  const H = PORT_CFG.hearsay;
  function firstSeaWithPorts(fs: number, min = 1): Sea | null {
    const contSeed = continentSeedFrom(fs);
    for (let r = 0; r <= 12; r++) {
      for (let gy = -r; gy <= r; gy++) {
        for (let gx = -r; gx <= r; gx++) {
          if (Math.max(Math.abs(gx), Math.abs(gy)) !== r) continue;
          if (cellKind(gx, gy, contSeed) !== 'ocean') continue;
          const s = seaOfCell(gx, gy, contSeed);
          if (s.ports.length >= min) return s;
        }
      }
    }
    return null;
  }
  // THE PROBE SOURCE — registered ONCE, rebound per hunt candidate (the
  // module-global source list has no unregister; the closure reads whatever
  // fixture currently stands, and the kill switch silences it for later
  // rigs — the D-rig idiom). Injected rows: the canChart split's two REFUSAL
  // legs plus the two gate filters, all placed clear of the farBeyond
  // boundary. The CHARTABLE witness is never injected — the staged deadline
  // siege's own row is the known-zone half of the split, derived wholly from
  // world state.
  const fix = { on: true, burst: false, stance: { x: 0, y: 0 }, rows: [] as Omen[] };
  registerOmenSource(() => {
    if (!fix.on) return [];
    const burst: Omen[] = fix.burst
      ? Array.from({ length: 8 }, (_, i): Omen => ({
          id: `hearsay_burst_${i}`, at: { x: fix.stance.x, y: fix.stance.y - (H.farBeyond + 400) - i * 12 },
          lines: ['crowd talk'], whisper: 10, age: 0 }))
      : [];
    return [...fix.rows, ...burst];
  });
  // The hunt: first seed whose minted system offers a stance port with a
  // partner ANCHOR (hold state standing — the pair-mint law) past the
  // farBeyond gate, AND room on the board for the whole fixture — sources
  // registered at import time (island whispers, span voices) outrank a
  // probe's under the max cap, so the staged row and both injected legs must
  // be SEEN seated before a candidate wins. First qualifying seed wins —
  // deterministic every run.
  let wH: World | null = null;
  let stancePort: ZoneDef | null = null;
  let farAnchor: ZoneDef | null = null;
  let huntSeed = 0;
  for (const ws of [0x8ea701, 0x8ea702, 0x8ea703, 0x8ea704, 0x8ea705, 0x8ea706, 0x8ea707, 0x8ea708]) {
    const cand = makeSimWorld('warrior', ws);
    clearSeaMemo();
    const sea = firstSeaWithPorts(cand.sim.biomeField.fieldSeed, 2);
    if (!sea) continue;
    const info = cand.devEnsureSea(sea.ports[0].shore);
    if (!info) continue;
    const zones = info.ports.map(p => cand.zoneMap[p.id]).filter((z): z is ZoneDef => !!z);
    let best: { port: ZoneDef; anchor: ZoneDef; d: number } | null = null;
    for (const pz of zones) {
      for (const qz of zones) {
        if (pz === qz) continue;
        const anchor = qz.holdAnchor ? cand.zoneMap[qz.holdAnchor] : undefined;
        if (!anchor?.harborhold) continue;
        const d = coordDist(anchor.map, pz.map);
        if (d >= H.farBeyond + 60 && (!best || d > best.d)) best = { port: pz, anchor, d };
      }
    }
    if (!best) continue;
    cand.loadZone(best.port.id);
    if (cand.zone.id !== best.port.id) continue;
    // Stage THE DEADLINE SIEGE: a recurring siege's fall clock on the far
    // anchor's persisted state — harborholdOmens murmurs it (world state in,
    // hearsay row out; nothing probe-local in the derivation).
    best.anchor.harborhold!.state = 'besieged';
    best.anchor.harborhold!.fallAt = cand.time + 600;
    const at = cand.zone.map;
    const off = H.farBeyond + 400;
    fix.stance = at;
    fix.rows = [
      // canChart FALSE, leg one: a coord-only rumor (a marching column).
      { id: 'hearsay_coord', at: { x: at.x + off, y: at.y }, lines: ['a column marches {bearing}'], whisper: 10, age: 0 },
      // canChart FALSE, leg two: names ground the world does NOT know.
      { id: 'hearsay_ghost', at: { x: at.x - off, y: at.y }, zoneId: 'hearsay_no_such_zone',
        lines: ['a door nobody can place'], whisper: 10, age: 0 },
      // Filtered: near talk is the land's own business, even chartable talk.
      { id: 'hearsay_near', at: { x: at.x + Math.max(40, H.farBeyond - 60), y: at.y },
        zoneId: best.port.id, lines: ['near talk'], whisper: 10, age: 0 },
      // Filtered: harbors are surface ears.
      { id: 'hearsay_below', at: { x: at.x, y: at.y + off }, dimension: 'probe_depths',
        lines: ['not surface talk'], whisper: 10, age: 0 },
    ];
    const seated = new Set(cand.harborHearsay().map(r => r.id));
    if (!seated.has(`harborhold:${best.anchor.id}`) || !seated.has('hearsay_coord') || !seated.has('hearsay_ghost')) continue;
    wH = cand; stancePort = best.port; farAnchor = best.anchor; huntSeed = ws;
    break;
  }
  check('H: a far harbor pair stands for the board rig (fixture rows seated under the cap)',
    !!wH && !!stancePort && !!farAnchor,
    wH && stancePort && farAnchor
      ? `seed 0x${huntSeed.toString(16)}: stance ${stancePort.id}, far anchor ${farAnchor.id} at d=${Math.round(coordDist(farAnchor.map, stancePort.map))}`
      : 'no qualifying sea across the seed hunt');
  if (wH && stancePort && farAnchor) {
    check('H: the walker stands at the quay (the ground the board serves)', wH.zone.id === stancePort.id);
    const holdRowId = `harborhold:${farAnchor.id}`;
    const stance = wH.zone.map;

    // --- the rows the panel reads: the split, the gates, the pricing law ---
    const rows = wH.harborHearsay();
    const byId = new Map(rows.map(r => [r.id, r] as const));
    // The known-zone half of the split: the staged row names the far anchor,
    // a zone the world knows — chartable BY the law, no injection involved.
    check('H: the staged deadline siege murmurs onto the board, chartable',
      byId.get(holdRowId)?.canChart === true, byId.get(holdRowId)?.line ?? 'row missing');
    check('H: a coord-only row is NOT chartable (the canChart split, leg one)',
      byId.has('hearsay_coord') && byId.get('hearsay_coord')?.canChart === false);
    check('H: a row naming UNKNOWN ground is NOT chartable (leg two)',
      byId.has('hearsay_ghost') && byId.get('hearsay_ghost')?.canChart === false);
    check('H: near talk stays off the board (farBeyond), chartable or not', !byId.has('hearsay_near'));
    check('H: off-surface talk stays off the board (surface ears)', !byId.has('hearsay_below'));
    // The whole board re-derived against the omen substrate: gate, price,
    // line, and the split as LAW — every row, organic ones included.
    const omens = new Map(collectOmens(wH).map(o => [o.id, o] as const));
    check('H: every row is a far surface omen', rows.every(r => {
      const o = omens.get(r.id);
      return !!o && (o.dimension ?? 'surface') === 'surface' && coordDist(o.at, stance) >= H.farBeyond;
    }), `${rows.length} rows`);
    check('H: every row prices by the chart law and speaks its own first line', rows.every(r => {
      const o = omens.get(r.id);
      if (!o) return false;
      const want = Math.max(H.chartPriceMin, Math.round(coordDist(o.at, stance) * H.chartPricePerDist));
      return r.price === want
        && r.line === (o.lines.length ? omenLine(o, o.lines[0], stance) : 'something waits out there');
    }));
    check('H: canChart IS "names a zone the world knows" — the law over every row', rows.every(r => {
      const o = omens.get(r.id);
      return !!o && r.canChart === (!!o.zoneId && !!wH!.zoneMap[o.zoneId ?? '']);
    }));
    // The cap: crowd the sources past max and the board stops at max.
    fix.burst = true;
    check('H: the board caps at hearsay.max under a crowd', wH.harborHearsay().length === H.max,
      `${wH.harborHearsay().length} of ${H.max}`);
    fix.burst = false;

    // --- THE ROUND TRIP: the board never loses knowledge across a save ---
    // The resumed world stands on the SAME sim seed (the real loader rebuilds
    // the world on the account's own identity — a fresh seed would re-roll
    // mint-on-sight ground and the comparison would lie about the board).
    const rowsA = wH.harborHearsay();
    const save = wH.serializeWorldState();
    const w2 = makeSimWorld('warrior', huntSeed);
    const adopted = w2.adoptWorldState(save);
    check('H: the harbor world stands back up from its save', adopted === true);
    if (adopted) {
      w2.loadZone(stancePort.id);
      check('H: the resumed walker stands at the same quay', w2.zone.id === stancePort.id);
      const rowsB = w2.harborHearsay();
      check('H: the board reads IDENTICALLY across the save (rows, lines, prices, chartability)',
        JSON.stringify(rowsB) === JSON.stringify(rowsA),
        `${rowsA.length} rows before, ${rowsB.length} after`);
      const byId2 = new Map(rowsB.map(r => [r.id, r] as const));
      // The sharp half: this row's WHOLE derivation (state, deadline, seat,
      // chartability) came out of the adopted save — nothing probe-local.
      check('H: the persisted deadline siege still murmurs, still chartable',
        byId2.get(holdRowId)?.canChart === true);
      check('H: the canChart split survives the resume',
        byId2.get('hearsay_coord')?.canChart === false && byId2.get('hearsay_ghost')?.canChart === false);
    }

    // --- THE CHART PURCHASE (the real intent path: requestMeta 'harborChart') ---
    const holdRow = byId.get(holdRowId);
    if (holdRow) {
      for (const id of ESSENCE_IDS) wH.localSeat.meta.essences[id] = 0;
      check('H: the fixture walker is destitute (the poverty gate can bite)', wH.mortalValueOf() === 0);
      check('H: the far seat starts unfound (the survey has something to buy)',
        farAnchor.veiled === true && !wH.surveyed.has(farAnchor.id));
      wH.requestMeta({ t: 'harborChart', omen: holdRowId });
      check('H: poverty refuses the chart — row stays, nothing surveyed, wallet untouched',
        wH.harborHearsay().some(r => r.id === holdRowId)
        && !wH.surveyed.has(farAnchor.id) && farAnchor.veiled === true && wH.mortalValueOf() === 0);
      wH.localSeat.meta.essences.coarse = holdRow.price + 7;
      wH.requestMeta({ t: 'harborChart', omen: 'hearsay_coord' });
      wH.requestMeta({ t: 'harborChart', omen: 'hearsay_ghost' });
      wH.requestMeta({ t: 'harborChart', omen: 'hearsay_no_such_omen' });
      check('H: unchartable rows and unknown omens refuse wallet-untouched',
        wH.mortalValueOf() === holdRow.price + 7
        && wH.harborHearsay().some(r => r.id === 'hearsay_coord')
        && wH.harborHearsay().some(r => r.id === 'hearsay_ghost'));
      wH.requestMeta({ t: 'harborChart', omen: holdRowId });
      check('H: the chart buys — exact change at the mortal exchange', wH.mortalValueOf() === 7,
        `${wH.mortalValueOf()} left of a ${holdRow.price}+7 purse`);
      check('H: the bought row leaves the board; the rest stand',
        !wH.harborHearsay().some(r => r.id === holdRowId)
        && wH.harborHearsay().some(r => r.id === 'hearsay_coord')
        && wH.harborHearsay().some(r => r.id === 'hearsay_ghost'));
      check('H: the chart SURVEYS the rumored seat (map marked, veil pierced)',
        wH.surveyed.has(farAnchor.id) && farAnchor.veiled !== true);
      wH.requestMeta({ t: 'harborChart', omen: holdRowId });
      check('H: a second press buys nothing twice', wH.mortalValueOf() === 7);
    }
    fix.on = false; // silence the source for any rig below
  }
}

// ------------------------------------------------ I. the water omens
// (world/seas.ts seaSpotOmensAt + world/voyage.ts islandOmensAt — batch 52:
// the findability guarantee past the shoreline; MODULE-LOCAL sources by the
// seat notes in each file, not World methods). Pins:
//   - an UNMINTED spot's omen is a COORD-ONLY whisper (no zoneId, no reveal
//     — the engine's reveal branch is structurally unreachable),
//   - the reads are PURE (two reads byte-identical; zoneMap untouched — a
//     pure read never mints; ensureSeaPorts stays the World's own),
//   - a MINTED veiled harbor seats its omen ON the port zone (zoneId +
//     reveal — the board's canChart feeds off the same row shape),
//   - the omen ID rides across the mint (whisper memory carries),
//   - the ENGINE pass reveals the harbor through the REGISTERED source
//     (veil pierced, surveyed — the quay beacon's walking cousin),
//   - a FOUND harbor goes silent (the unfound law),
//   - islands are coord-only BY CONSTRUCTION (mint-on-sight ground has no
//     zone to seat an omen on).
{
  const fieldSeed = w.sim.biomeField.fieldSeed;
  // A virgin coast: ring-scan outward from the walker for a spot with no
  // minted zone (the halo may already have minted the near seas).
  let found: SeaPortSpot | undefined;
  for (let R = 1500; R <= 12000 && !found; R += 1500) {
    found = seaSpotsNear(w.zone.map, R, fieldSeed).find(s => !w.zoneMap[s.id]);
  }
  const spot = found;
  check('I: a virgin port spot stands within scan reach', !!spot,
    spot ? `${spot.id} (${spot.tier})` : 'every spot within 12000u is minted');
  if (spot) {
    // --- pre-mint: the coord-only law + purity -----------------------------
    const keys0 = Object.keys(w.zoneMap).length;
    const pre1 = seaSpotOmensAt(w, spot.coord);
    const pre2 = seaSpotOmensAt(w, spot.coord);
    check('I: the sea read is PURE (two reads byte-identical, nothing minted)',
      JSON.stringify(pre1) === JSON.stringify(pre2) && Object.keys(w.zoneMap).length === keys0,
      `${pre1.length} rows, zoneMap ${keys0} → ${Object.keys(w.zoneMap).length}`);
    const preRow = pre1.find(o => o.id === `seaspot:${spot.id}`);
    check('I: an UNMINTED spot whispers COORD-ONLY (no zoneId, no reveal, a live pool)',
      !!preRow && preRow.zoneId === undefined && (preRow.reveal ?? 0) === 0
      && preRow.whisper > 0 && preRow.lines.length > 0 && omenReach(preRow).reveal === 0,
      preRow ? `zoneId=${String(preRow.zoneId)} reveal=${String(preRow.reveal)}` : 'row missing');

    // --- the island half: coord-only BY CONSTRUCTION -----------------------
    let isleFound: IslandSpot | undefined;
    for (let R = 1000; R <= 9000 && !isleFound; R += 1000) {
      isleFound = islandsNear(spot.shore, R, fieldSeed).find(i => !w.zoneMap[i.id]);
    }
    const isle = isleFound;
    check('I: a voyage island stands in the field', !!isle, isle ? isle.id : 'none within 9000u');
    if (isle) {
      const i1 = islandOmensAt(w, isle.coord);
      const i2 = islandOmensAt(w, isle.coord);
      const iRow = i1.find(o => o.id === `isle:${isle.id}`);
      check('I: an unfound island whispers COORD-ONLY by construction (pure, no zoneId, no reveal)',
        !!iRow && iRow.zoneId === undefined && (iRow.reveal ?? 0) === 0
        && omenReach(iRow).reveal === 0 && JSON.stringify(i1) === JSON.stringify(i2),
        iRow ? 'coord-only, pure' : 'row missing');
    }

    // --- the mint (the probe's scaffolding hand — devEnsureSea, the board
    // rig's own seam; the SOURCE itself never minted, pinned above) ---------
    const info = w.devEnsureSea(spot.shore);
    const portZ = w.zoneMap[spot.id];
    check('I: the harbor pair minted VEILED (the foreordained law)',
      !!info && !!portZ && portZ.veiled === true && portZ.portTier !== undefined,
      portZ ? `${portZ.id} tier=${String(portZ.portTier)}` : 'port zone missing');
    const post = seaSpotOmensAt(w, spot.coord);
    const postRow = post.find(o => o.id === `seaspot:${spot.id}`);
    check('I: a MINTED veiled harbor seats its omen ON the zone (zoneId + reveal — chartable)',
      !!postRow && !!portZ && postRow.zoneId === spot.id && (postRow.reveal ?? 0) > 0
      && postRow.at.x === portZ.map.x && postRow.at.y === portZ.map.y,
      postRow ? `zoneId=${String(postRow.zoneId)} reveal=${String(postRow.reveal)}` : 'row missing');
    check('I: the omen ID rides across the mint (whisper memory carries)',
      !!preRow && !!postRow && preRow.id === postRow.id);
    check('I: the age rides the world clock under the widen cap',
      !!postRow && postRow.age === Math.min(w.time, SEA_OMEN.widenCapMin * 60));

    // --- the engine reveal, through the REGISTERED source ------------------
    if (portZ) {
      // THE PERCH: real ground minted beside the hold anchor (the ground-
      // builder idiom, probe_objectives RIG B) — offset PERPENDICULAR to the
      // landward ray so it crowds neither the anchor node nor the pinned
      // port, yet stands inside reveal reach of the quay. Its ring-1 holds
      // no causeway, so only the OMEN may lift the port's veil here.
      const anchor = w.zoneMap[`${spot.id}_hold`];
      check('I: the pair minted its hold anchor', !!anchor);
      const ln = Math.hypot(spot.coord.x - spot.shore.x, spot.coord.y - spot.shore.y) || 1;
      const px = -(spot.coord.y - spot.shore.y) / ln, py = (spot.coord.x - spot.shore.x) / ln;
      const base = anchor?.map ?? spot.coord;
      const perchAt = { x: base.x + px * 180, y: base.y + py * 180 };
      const perch = placeZoneAt(perchAt, null, w.zoneMap,
        (w as unknown as { nextGenId: number }).nextGenId++, {
          tileset: 'grassland', level: 3, seed: 0x5ea0be, noBackEdge: true,
        } as any);
      (w.zoneMap as Record<string, ZoneDef>)[perch.id] = perch;
      w.loadZone(perch.id);
      check('I: entering the perch leaves the port veiled (no land ring-1 reaches a quay)',
        w.zoneMap[spot.id]?.veiled === true);
      const d = coordDist(w.zone.map, portZ.map);
      check('I: rig geometry — the perch stands inside reveal reach', d <= SEA_OMEN.reveal,
        `${Math.round(d)}u ≤ ${SEA_OMEN.reveal}u`);
      step(w, 0.5, 12); // past the omen cadence — the murmuring pass runs
      check('I: the ENGINE reveals the harbor through the registered source (veil pierced, surveyed)',
        w.zoneMap[spot.id]?.veiled === false && w.surveyed.has(spot.id),
        `veiled=${String(w.zoneMap[spot.id]?.veiled)} surveyed=${w.surveyed.has(spot.id)}`);
      check('I: a FOUND harbor goes silent (the unfound law)',
        seaSpotOmensAt(w, w.zone.map).every(o => o.id !== `seaspot:${spot.id}`));
      // THE SAILOR'S-EARS LAW (voyage.ts): island talk airs only on watery
      // ground. The perch is plain grassland — the registered island source
      // refuses BY LAW (an inland whisper would also cost an engine
      // Math.random draw and drift seeded sim streams — probe_straying H8);
      // the port zone is seaId ground — the gate passes the geographic read
      // through byte-identical. (The SEA source's inland whisper is the
      // deliberate coastward breadcrumb — the reveal above fired FROM this
      // plain-ground perch, which pins that half.)
      check('I: plain ground hears no island talk (the sailor\'s-ears law refuses)',
        !w.zone.seaId && !w.zone.port && !w.zone.aquatic && islandOmens(w).length === 0,
        `perch seaId=${String(w.zone.seaId)} rows=${islandOmens(w).length}`);
      w.loadZone(spot.id); // the revealed port — watery ground, real zone
      check('I: watery ground opens the ears (the gate is a passthrough on seaId ground)',
        w.zone.id === spot.id && !!w.zone.seaId
        && JSON.stringify(islandOmens(w)) === JSON.stringify(islandOmensAt(w, w.zone.map)),
        `${islandOmens(w).length} rows at the quay`);
    }
  }
}

console.log(failed ? `\n${failed} CHECK(S) FAILED` : '\nALL PASS');
// The roster's law (runprobes `passed`): the EXIT CODE is the verdict — a
// FAIL line without a nonzero exit would never gate.
process.exit(failed ? 2 : 0);
