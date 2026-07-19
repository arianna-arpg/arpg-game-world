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
//     round-trip keeps the halo veiled and the invariant intact.
// Run: npx tsx balance/probe_forechart.ts
// ---------------------------------------------------------------------------

import { bootSimEngine, makeSimWorld } from '../src/sim/arena';
import { seedGlobalRandom } from '../src/sim/rng';
import type { World } from '../src/engine/world';
import type { ZoneDef } from '../src/data/zones';
import { HUB_ZONE, START_ZONE } from '../src/data/zones';
import { Rng } from '../src/core/rng';
import { FORECHART_CFG } from '../src/world/forechart';
import { pickSeat, seatCandidates } from '../src/world/seats';
import { bearingWord, distWord, omenLine, omenReach, registerOmenSource, type Omen } from '../src/world/omens';
import type { OverlayView } from '../src/world/overlay';
import { coordDist } from '../src/world/coords';

let failed = 0;
const check = (name: string, ok: boolean, detail = ''): void => {
  console.log(`${ok ? 'PASS' : 'FAIL'}  ${name}${detail ? ' — ' + detail : ''}`);
  if (!ok) failed++;
};

bootSimEngine();
seedGlobalRandom(0xf03e);

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
check('A: the budget holds', veiled.length <= FORECHART_CFG.maxVeiled,
  `${veiled.length} ≤ ${FORECHART_CFG.maxVeiled}`);
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

console.log(failed ? `\n${failed} CHECK(S) FAILED` : '\nALL PASS');
process.exit(failed ? 2 : 0);
