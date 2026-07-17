// ---------------------------------------------------------------------------
// ONE-OFF PROBE — THE ADVANCING FRONT end to end on the real engine
// (docs/engine/creep.md § fronts): classic-creep byte-identity when no
// front lever is set (pinned pre-change fingerprint), directional march,
// affinity weighting + the clearway firebreak, consumption (remnant swap,
// removal, kin), conversion-behind (ashfield; the flood's shallow wake),
// the yieldWays causeway mask (drawn == tested), quench/feed through the
// real blast tap, undertow drag + the breath ramp, and ambient wave lanes.
// Run: npx tsx balance/probe_front.ts
// ---------------------------------------------------------------------------

import { bootSimEngine, makeSimWorld } from '../src/sim/arena';
import { applyBuild } from '../src/sim/builds';
import { seedGlobalRandom } from '../src/sim/rng';
import { buildZoneCreep, CreepField, CREEPS, CREEP_CFG, registerCreep } from '../src/engine/creep';
import type { Doodad } from '../src/engine/levelgen';
import { vec } from '../src/core/math';
import { Rng } from '../src/core/rng';
import type { BuildSpec } from '../src/sim/types';

let failed = 0;
const check = (name: string, ok: boolean, detail = ''): void => {
  console.log(`${ok ? 'PASS' : 'FAIL'}  ${name}${detail ? ' — ' + detail : ''}`);
  if (!ok) failed++;
};

bootSimEngine();
seedGlobalRandom(0xf407);

const fnv = (text: string): string => {
  let h = 0x811c9dc5;
  for (let i = 0; i < text.length; i++) {
    h ^= text.charCodeAt(i);
    h = Math.imul(h, 0x01000193) >>> 0;
  }
  return `0x${h.toString(16).padStart(8, '0')}`;
};

// --- 0) CLASSIC BYTE-IDENTITY: the exact pre-change scenario, pinned ------
// Captured on the committed tree BEFORE any front code existed
// (balance/reports/_fp_creep_classic.ts). A creep row with no front levers
// must tick byte-identically forever.
{
  const world = makeSimWorld('warrior', 133742);
  const f = world.creepEnsure()!;
  const heart = { dead: false };
  f.addSource(CREEPS['caulflesh'], 600, 500, { bornFrac: 0 });
  f.addSource(CREEPS['blightgrowth'], 900, 700, { bornFrac: 0.5 });
  f.addSource(CREEPS['caulflesh'], 400, 800, { reach: 180, bornFrac: 1, ambient: true });
  f.addSource(CREEPS['blightgrowth'], 1200, 400, { bornFrac: 0.25, boundTo: heart });
  const PROBES: [number, number][] = [
    [650, 520], [880, 690], [410, 795], [1180, 410], [30, 30], [700, 640],
  ];
  const lines: string[] = [];
  const dt = 1 / 60;
  let t = 0;
  for (let sec = 0; sec < 8; sec++) {
    for (let i = 0; i < 60; i++) {
      world.update(dt);
      t += dt;
      if (heart.dead === false && t >= 3) heart.dead = true;
    }
    for (const s of f.sources) {
      lines.push([
        s.def.id, s.state, s.ambient ? 1 : 0,
        s.pos.x.toFixed(3), s.pos.y.toFixed(3),
        s.cur.toFixed(3), s.maxReach.toFixed(3), s.bound.toFixed(3),
        s.seed, s.phase.toFixed(6),
        s.harm.map(h => `${h.k}:${h.a.toFixed(6)}:${h.p.toFixed(6)}`).join('|'),
      ].join(','));
    }
    for (const [px, py] of PROBES) lines.push(`c:${f.coverAt(px, py).toFixed(6)}:${f.onCreep(px, py) ? 1 : 0}`);
    lines.push(`n:${f.sources.length}`);
  }
  const hash = fnv(lines.join('\n'));
  check('classic: byte-identical fingerprint (no lever set = yesterday\'s creep)',
    hash === '0x04e4055d', `got ${hash}, want 0x04e4055d over ${lines.length} lines`);
}

// --- 1) THE FLOODCREST: march, wake, undertow, breath ----------------------
{
  const world = makeSimWorld('warrior', 24603);
  const cx = world.arena.w / 2, cy = world.arena.h / 2;
  const f = world.creepEnsure()!;
  const p = world.player;
  const src = f.addFront(CREEPS['floodcrest'], cx - 600, cy, 0, { reach: 120, bornFrac: 1 })!;
  check('flood: addFront plants a marching section', !!src?.front);
  const startX = src.pos.x;
  const dt = 1 / 60;
  // Phase 1 — IN the crest: pin the hero at the surge's heart (the undertow
  // would otherwise shove them out to surf the skirt — that's phase 2's
  // assert) and let the water dress and drown them properly.
  let swimSeen = false;
  for (let i = 0; i < 60 * 3; i++) {
    p.pos.x = src.pos.x + 10;
    p.pos.y = src.pos.y;
    world.update(dt);
    if (!swimSeen && p.statuses.some(s => s.id === 'swimming')) swimSeen = true;
  }
  check('flood: swimming granted inside the crest (the marine pass\'s own slow)', swimSeen);
  const breath = p.survival?.get('breath');
  check('flood: breath drained on the deep-water ramp', breath !== undefined && breath < 11,
    `breath ${breath?.toFixed(1) ?? 'full'} after 3s under`);
  // Phase 2 — AHEAD of the crest: a free body is caught and CARRIED.
  p.pos.x = src.pos.x + 180;
  p.pos.y = cy;
  const heroAt = p.pos.x;
  let dragSeen = false;
  for (let i = 0; i < 60 * 22; i++) {
    world.update(dt);
    if (!dragSeen && p.pos.x > heroAt + 40) dragSeen = true;
  }
  check('flood: the crest MARCHES its bearing', src.pos.x - startX > 200,
    `advanced ${(src.pos.x - startX).toFixed(0)} east, drifted ${(src.pos.y - cy).toFixed(1)} lateral`);
  check('flood: no lateral wander on a fixed bearing', Math.abs(src.pos.y - cy) < 1);
  // Scan the marched-over stretch: stamp clocks stagger by seed, so the
  // wake's first pool lands SOMEWHERE along the path, never at a fixed x.
  let wakeShallow = false, wakeDeep = false;
  for (let off = 40; off <= 420; off += 20) {
    const g = world.groundAt(vec(startX + off, cy));
    if (g?.kind === 'water') { wakeShallow ||= !g.deep; wakeDeep ||= g.deep; }
  }
  check('flood: a wadeable SHALLOW wake behind (the ford contract, never a new deep)',
    wakeShallow && !wakeDeep, `shallow ${wakeShallow}, deep ${wakeDeep}`);
  // POOLS NEVER STACK: overlapping shallow discs pile their per-disc ford
  // lightening into a flat wash that erases the mottle (the "ground goes
  // flat past a line" playtest read) — geometry spaces them and the stamp
  // adapter refuses the rest; this pin holds both honest.
  const pools = world.doodads.filter(d => d.kind === 'water' && d.shallow === true);
  let stacked = 0;
  for (let i = 0; i < pools.length; i++) {
    for (let j = i + 1; j < pools.length; j++) {
      const dd = Math.hypot(pools[i].pos.x - pools[j].pos.x, pools[i].pos.y - pools[j].pos.y);
      if (dd < (pools[i].radius + pools[j].radius) * 0.95) stacked++;
    }
  }
  check('flood: wake pools never overlap (the ford-wash bug stays dead)',
    pools.length > 0 && stacked === 0, `${pools.length} pools, ${stacked} stacked pairs`);
  check('flood: wake discs are real terrain (doodad list carries shallow water)',
    world.doodads.some(d => d.kind === 'water' && d.shallow === true));
  check('flood: the undertow CARRIED the hero downstream', dragSeen,
    `hero ${heroAt.toFixed(0)} → ${p.pos.x.toFixed(0)}`);
  // The deep's kin ride the tow for free: a faction on the drag's waiver
  // list holds its ground where the unlisted hero was swept away.
  const before = f.sources.length;
  p.faction = 'deep';
  const px0 = p.pos.x;
  for (let i = 0; i < 60; i++) world.update(dt);
  check('flood: the deep-sworn are NOT dragged (drag.notFactions)',
    f.sources.length === 0 || Math.abs(p.pos.x - px0) < 8,
    `drift ${(p.pos.x - px0).toFixed(1)} over 1s (sources live: ${before})`);
  delete p.faction;
}

// --- 2) THE WILDFIRE: fuel, remnants, ashfield, the firebreak --------------
{
  seedGlobalRandom(0xa11ce);
  const world = makeSimWorld('warrior', 24604);
  const cx = world.arena.w / 2, cy = world.arena.h / 2;
  // Fuel in the fire's path — BEFORE creepEnsure, so the terrain window's
  // way snapshot and doodad index both see the finished ground.
  const fuels: Doodad[] = [];
  for (let i = 0; i < 6; i++) fuels.push({ pos: vec(cx - 140 + i * 55, cy + (i % 2 ? 24 : -24)), radius: 12, kind: 'brush' });
  fuels.push({ pos: vec(cx + 40, cy), radius: 16, kind: 'tree' });
  fuels.push({ pos: vec(cx + 120, cy - 20), radius: 16, kind: 'tree' });
  // A kept road crossing the path at cx+330: the FIREBREAK.
  for (let y = cy - 260; y <= cy + 260; y += 34) fuels.push({ pos: vec(cx + 330, y), radius: 22, kind: 'road' });
  world.doodads.push(...fuels);
  const f = world.creepEnsure()!;
  const src = f.addFront(CREEPS['wildfire'], cx - 300, cy, 0, { reach: 100, bornFrac: 1 })!;
  const dt = 1 / 60;
  let gutteredBy = -1;
  for (let i = 0; i < 60 * 34; i++) {
    world.update(dt);
    if (gutteredBy < 0 && (src.state === 'recede' || !f.sources.includes(src))) gutteredBy = i / 60;
  }
  const brushLeft = world.doodads.filter(d => d.kind === 'brush').length;
  const snags = world.doodads.filter(d => d.kind === 'charred_snag').length;
  const treesLeft = world.doodads.filter(d => d.kind === 'tree').length;
  check('fire: kindling consumed outright', brushLeft === 0, `${brushLeft} brush left of 6`);
  check('fire: timber left as CHARRED SNAGS (kind swap)', snags === 2 && treesLeft === 0,
    `${snags} snags, ${treesLeft} live trees`);
  let ashSeen = false;
  for (let off = -220; off <= 120; off += 20) {
    if (world.groundAt(vec(cx + off, cy))?.kind === 'ashfield') { ashSeen = true; break; }
  }
  check('fire: ASHFIELD laid behind the trailing rim', ashSeen);
  check('fire: the road is a FIREBREAK (clearway 0 walls the march; starve gutters it)',
    gutteredBy > 0, gutteredBy > 0 ? `guttered at ${gutteredBy.toFixed(1)}s` : 'still marching');
  const overRoad = world.groundAt(vec(cx + 470, cy));
  check('fire: nothing burned past the break', overRoad?.kind !== 'ashfield',
    `beyond-road ground: ${overRoad?.kind ?? 'bare'}`);
  const kin = world.actors.filter(a => a.defId === 'cinderling' || a.defId === 'emberwisp');
  check('fire: consumption may birth kin, capped (consume.spawn)',
    kin.length <= CREEP_CFG.front.spawnMax, `${kin.length} born (cap ${CREEP_CFG.front.spawnMax})`);
}

// --- 3) YIELDWAYS: the causeway is dry in the hit test ---------------------
{
  const world = makeSimWorld('warrior', 24605);
  const cx = world.arena.w / 2, cy = world.arena.h / 2;
  const road: Doodad[] = [];
  for (let y = cy - 300; y <= cy + 300; y += 34) road.push({ pos: vec(cx + 100, y), radius: 22, kind: 'road' });
  world.doodads.push(...road);
  const f = world.creepEnsure()!;
  const src = f.addFront(CREEPS['floodcrest'], cx - 80, cy, 0, { reach: 130, bornFrac: 1 })!;
  const dt = 1 / 60;
  // March until the crest is centered over the causeway.
  let steps = 0;
  while (src.pos.x < cx + 100 && steps++ < 60 * 20) world.update(dt);
  const onDeck = f.onCreep(cx + 100, cy);
  const besideDeck = f.onCreep(cx + 100 - 60, cy);
  check('causeway: the DECK is dry in the hit test while the water covers it', !onDeck && besideDeck,
    `deck ${onDeck ? 'wet' : 'dry'}, verge ${besideDeck ? 'wet' : 'dry'} (crest at ${src.pos.x.toFixed(0)})`);
  for (let i = 0; i < 60 * 6; i++) world.update(dt);
  const deckGround = world.groundAt(vec(cx + 100, cy));
  check('causeway: the wake never stamped the deck wet', deckGround?.kind === 'road',
    `deck ground: ${deckGround?.kind ?? 'bare'}`);
}

// --- 4) QUENCH & FEED: typed damage on the skin, through the real tap ------
{
  const world = makeSimWorld('sorcerer', 24606);
  const cx = world.arena.w / 2, cy = world.arena.h / 2;
  const f = world.creepEnsure()!;
  const src = f.addFront(CREEPS['wildfire'], cx + 40, cy, 0, { reach: 110, bornFrac: 1 })!;
  const run = src.front!;
  const spec: BuildSpec = {
    id: 'front_probe', classId: 'sorcerer', level: 9,
    skills: [{ id: 'frost_nova', level: 3 }],
  };
  const warnings = applyBuild(world, spec, 7);
  if (warnings.length) console.log('build warnings:', warnings.join(' | '));
  const p = world.player;
  p.pos.x = cx - 40;
  p.pos.y = cy;
  const dt = 1 / 60;
  for (let i = 0; i < 30; i++) world.update(dt);
  const vigor0 = run.vigor;
  const nova = p.skills.find(s => s?.def.id === 'frost_nova');
  check('build: frost nova on the bar', !!nova);
  world.useSkill(p, nova!, { x: p.pos.x, y: p.pos.y });
  for (let i = 0; i < 60; i++) world.update(dt);
  check('quench: a real cold cast through the blast tap stalls the section',
    run.vigor < vigor0, `vigor ${vigor0.toFixed(3)} → ${run.vigor.toFixed(3)}`);
  // The quantitative lane: enough cold gutters the section outright.
  f.damageSkin(src.pos.x, src.pos.y, 60, { cold: 9999 });
  check('quench: guttered at zero vigor (state recede)', src.state === 'recede',
    `vigor ${run.vigor.toFixed(2)}, state ${src.state}`);
  // FEED mirrors on its own lever, deliberately heavy-handed to move:
  const src2 = f.addFront(CREEPS['wildfire'], cx - 200, cy + 300, 0, { reach: 100, bornFrac: 1 })!;
  const stoke0 = src2.front!.stoke;
  f.damageSkin(src2.pos.x, src2.pos.y, 60, { fire: 450 });
  check('feed: fire STOKES a burning section (high power — a stray splash barely moves it)',
    src2.front!.stoke > stoke0 && src2.front!.stoke <= CREEP_CFG.front.stokeMax,
    `stoke ${stoke0.toFixed(2)} → ${src2.front!.stoke.toFixed(2)}`);
  const src3 = f.addFront(CREEPS['floodcrest'], cx - 200, cy - 300, 0, { reach: 100, bornFrac: 1 })!;
  f.damageSkin(src3.pos.x, src3.pos.y, 60, { fire: 9999 });
  check('anti-goal: fire does NOTHING to the flood (no reaction matrix — unlisted types are silence)',
    src3.front!.vigor === 1 && src3.state !== 'recede');
}

// --- 5) DETERMINISM: same seed, same march, same ground --------------------
{
  const trace = (seed: number): string => {
    seedGlobalRandom(seed);
    const world = makeSimWorld('warrior', 777001);
    const cx = world.arena.w / 2, cy = world.arena.h / 2;
    const fuels: Doodad[] = [];
    for (let i = 0; i < 5; i++) fuels.push({ pos: vec(cx - 100 + i * 60, cy + (i % 2 ? 20 : -20)), radius: 12, kind: 'brush' });
    fuels.push({ pos: vec(cx + 100, cy), radius: 16, kind: 'tree' });
    world.doodads.push(...fuels);
    const f = world.creepEnsure()!;
    f.addFront(CREEPS['wildfire'], cx - 260, cy, 0.1, { reach: 100, bornFrac: 1 });
    const dt = 1 / 60;
    for (let i = 0; i < 60 * 8; i++) world.update(dt);
    const lines: string[] = [];
    for (const s of f.sources) {
      lines.push(`${s.def.id},${s.pos.x.toFixed(3)},${s.pos.y.toFixed(3)},${s.cur.toFixed(3)},${s.state},`
        + `${s.front ? `${s.front.vigor.toFixed(4)},${s.front.stoke.toFixed(4)},${s.front.mult.toFixed(4)},${s.front.stamps}` : ''}`);
    }
    for (const d of world.doodads) {
      if (d.kind === 'ashfield' || d.kind === 'charred_snag' || d.kind === 'brush' || d.kind === 'tree') {
        lines.push(`${d.kind}@${d.pos.x.toFixed(2)},${d.pos.y.toFixed(2)},${d.radius.toFixed(2)}`);
      }
    }
    lines.push(...world.actors.filter(a => a.defId === 'cinderling' || a.defId === 'emberwisp')
      .map(a => `kin:${a.defId}`).sort());
    return fnv(lines.join('\n'));
  };
  const a = trace(11);
  const b = trace(11);
  check('determinism: twice-run front leaves identical ground, march and kin', a === b, `${a} vs ${b}`);
}

// --- 6) AMBIENT LANES: waves break in, die out, return ---------------------
{
  const world = makeSimWorld('warrior', 24607);
  const f = world.creepEnsure()!;
  f.installLanes([{ id: 'floodcrest', line: [3, 3], bearing: 0, delay: [1, 1], waves: [2, 2] }]);
  const dt = 1 / 60;
  for (let i = 0; i < 90; i++) world.update(dt);
  const wave1 = f.sources.filter(s => s.front?.rowIdx === 0).length;
  check('lanes: the first wave breaks in on its delay, a picket line abreast', wave1 === 3, `${wave1} sections`);
  // Cleanse the wave (the payoff verb force-recedes it) and wait: the lane
  // owes its next wave.
  world.creep!.cleanseAt(0, 0, 1e9);
  let returned = 0;
  for (let i = 0; i < 60 * 8; i++) {
    world.update(dt);
    const n = f.sources.filter(s => s.front?.rowIdx === 0 && s.state !== 'recede').length;
    if (n === 3) { returned = n; break; }
  }
  check('lanes: the next wave RETURNS on the row\'s cadence (waves lever)', returned === 3);
}

// --- 7) THE TIDAL SPAN: the wall crosses, THE CORRIDOR HOLDS ---------------
{
  const world = makeSimWorld('warrior', 24608);
  const W = world.arena.w, H = world.arena.h;
  const f = world.creepEnsure()!;
  f.installLanes([{
    id: 'tidalwall', line: 'span', bearing: 0, delay: [0.5, 0.5],
    spacing: 0.8, reach: [90, 120], gap: { width: 140 },
  }]);
  const dt = 1 / 60;
  for (let i = 0; i < 90; i++) world.update(dt);
  const secs = f.sources.filter(s => s.front?.rowIdx === 0);
  check('span: the wall fields wall-to-wall (a line, not a picket)', secs.length >= 4,
    `${secs.length} sections across H=${H}`);
  check('span: the lane reach override held', secs.every(s => s.maxReach >= 90 && s.maxReach <= 120),
    secs.map(s => s.maxReach.toFixed(0)).join(','));
  check('span: bearings exactly parallel (spanning lanes never jitter)',
    secs.every(s => s.front!.bearing === 0));
  // Find the promised corridor from the fielded geometry: the widest hole
  // between adjacent rim CEILINGS (maxReach × (1+Σa) × stretch).
  const st = Math.max(1, CREEPS['tidalwall'].front!.stretch ?? 1);
  const rows = secs.map(s => {
    let sum = 0;
    for (const h of s.harm) sum += h.a;
    return { y: s.pos.y, ceil: s.maxReach * (1 + sum) * st };
  }).sort((a, b) => a.y - b.y);
  let gapY = -1, gapW = 0;
  for (let i = 0; i + 1 < rows.length; i++) {
    const lo = rows[i].y + rows[i].ceil, hi = rows[i + 1].y - rows[i + 1].ceil;
    if (hi - lo > gapW) { gapW = hi - lo; gapY = (lo + hi) / 2; }
  }
  check('span: a clear corridor at least gap.width wide exists between rim ceilings',
    gapW >= 140, `widest hole ${gapW.toFixed(0)} at y=${gapY.toFixed(0)}`);
  // March the whole crossing: the corridor must NEVER read on-creep while
  // the wall's own tracks flood solid — the weave lane is a promise about
  // the hit test, held for the wave's entire life. The hero PARKS in the
  // corridor for the duration: standing in the weave lane must be fully
  // survivable (no cover → no undertow, no breath drain — and no drowned
  // hero stalling the sim, which is exactly what parking him mid-wall did).
  const p = world.player;
  const wallY = rows[0].y;
  let corridorMax = 0, wallMax = 0, t = 0, tick = 0;
  while (f.sources.some(s => s.front?.rowIdx === 0) && t < 140) {
    p.pos.x = 400;
    p.pos.y = gapY;
    world.update(dt); t += dt; tick++;
    if (tick % 30 === 0) {
      for (let x = 20; x < W; x += 30) {
        corridorMax = Math.max(corridorMax, f.coverAt(x, gapY));
        wallMax = Math.max(wallMax, f.coverAt(x, wallY));
      }
    }
  }
  check('span: THE CORRIDOR HELD the whole crossing (never on-creep anywhere along it)',
    corridorMax < CREEP_CFG.hitFloor, `max corridor cover ${corridorMax.toFixed(3)} vs floor ${CREEP_CFG.hitFloor}`);
  check('span: the wall itself flooded solid on its own track', wallMax >= 0.99,
    `max wall cover ${wallMax.toFixed(3)}`);
  check('span: the wave crossed and left (no lingering sections)',
    !f.sources.some(s => s.front?.rowIdx === 0), `crossed in ${t.toFixed(0)}s`);
  const breathRow = p.survival?.get('breath');
  check('span: the hero LIVED in the weave lane (no drown, no undertow)',
    !p.dead && (breathRow === undefined || breathRow > 10),
    `alive ${!p.dead}, breath ${breathRow?.toFixed(1) ?? 'full'}`);
}

// --- 8) THE EVAPORATING WAKE: pools dry, the floor reverts -----------------
{
  const world = makeSimWorld('warrior', 24609);
  const cx = world.arena.w / 2, cy = world.arena.h / 2;
  const f = world.creepEnsure()!;
  f.addFront(CREEPS['brinesurge'], cx - 500, cy, 0, { reach: 90, bornFrac: 1 });
  const dt = 1 / 60;
  for (let i = 0; i < 60 * 20; i++) world.update(dt);
  const pools = world.doodads.filter(d => d.kind === 'tide_pool' && d.evap);
  check('evap: the wake stamps DRYING tide pools (convert.fade)', pools.length >= 2,
    `${pools.length} pools`);
  const p0 = pools[0];
  const center = vec(p0.pos.x, p0.pos.y);
  const r0 = p0.radius;
  check('evap: a live pool is real sensed ground', world.groundAt(center)?.kind === 'tide_pool');
  const radii = new Set<number>([p0.radius]);
  let gone = -1;
  for (let i = 0; i < 60 * 80 && gone < 0; i++) {
    world.update(dt);
    radii.add(p0.radius);
    if (!world.doodads.includes(p0)) gone = i / 60;
  }
  check('evap: the pool contracted then vanished (the zone reverts)', gone > 0,
    gone > 0 ? `r0 ${r0.toFixed(0)} gone at ${gone.toFixed(1)}s` : `still r=${p0.radius.toFixed(1)}`);
  check('evap: contraction is QUANTIZED steps (a bounded stale trickle, never per-frame churn)',
    radii.size >= 3 && radii.size <= 20, `${radii.size} distinct radii`);
  check('evap: the floor reverted under it', world.groundAt(center)?.kind !== 'tide_pool',
    `now: ${world.groundAt(center)?.kind ?? 'bare'}`);
  // addTempGround's evaporate option: the patch DRIES at expiry instead of
  // popping — the same fabric, opened to every temp-ground caller.
  const at = vec(cx + 320, cy + 320);
  world.addTempGround(at, 'ashfield', 40, 1.0, { evaporate: { rate: 30 } });
  const patch = world.doodads.find(d => d.kind === 'ashfield' && d.pos.x === at.x && d.pos.y === at.y)!;
  for (let i = 0; i < 72; i++) world.update(dt); // 1.2s: dwell served, drying begun
  check('evap: addTempGround evaporate DRIES instead of popping',
    world.doodads.includes(patch) && patch.radius < 40,
    `r ${patch.radius.toFixed(1)} at 1.2s (was 40)`);
  let patchGone = false;
  for (let i = 0; i < 60 * 4 && !patchGone; i++) {
    world.update(dt);
    patchGone = !world.doodads.includes(patch);
  }
  check('evap: the temp patch finished drying away', patchGone);
}

// --- 9) STRETCH: one ellipse truth for hit test and bound ------------------
{
  registerCreep({ id: 'probe_stretch', lobing: 0, front: { speed: 10, stretch: 2.5 } });
  const world = makeSimWorld('warrior', 24610);
  const cx = world.arena.w / 2, cy = world.arena.h / 2;
  const f = world.creepEnsure()!;
  const src = f.addFront(CREEPS['probe_stretch'], cx, cy, 0, { reach: 100, bornFrac: 1 })!;
  const along = f.rimAt(src, 0), across = f.rimAt(src, Math.PI / 2);
  check('stretch: across-rim = along-rim × stretch (rimMulOf, lobing 0 exact)',
    Math.abs(across / along - 2.5) < 1e-9, `${along.toFixed(1)} → ${across.toFixed(1)}`);
  check('stretch: the broad-phase bound covers the across axis', src.bound >= across,
    `bound ${src.bound.toFixed(1)} vs across ${across.toFixed(1)}`);
  const on = f.coverAt(cx, cy + across * 0.9);
  const off = f.coverAt(cx, cy + across * 1.05);
  const offAlong = f.coverAt(cx + across * 0.9, cy);
  check('stretch: cover rides the stretched rim (in wet, out dry)',
    on >= CREEP_CFG.hitFloor && off === 0, `in ${on.toFixed(2)}, out ${off.toFixed(2)}`);
  check('stretch: the along axis stays UNstretched (a wall, not a bigger circle)',
    offAlong === 0, `cover at 2.25R along: ${offAlong.toFixed(2)}`);
}

// --- 10) NOTAQUATIC: no water within water ---------------------------------
{
  const dry = buildZoneCreep(
    { pockets: [0, 0], kinds: [], fronts: [{ id: 'tidalwall' }] },
    { w: 2000, h: 1400 }, new Rng(7));
  const wet = buildZoneCreep(
    { pockets: [0, 0], kinds: [], fronts: [{ id: 'tidalwall' }] },
    { w: 2000, h: 1400, aquatic: true }, new Rng(7));
  check('aquatic: the tidal lane is refused under the sea (structural, not authorial)',
    dry !== null && wet === null, `dry ${dry ? 'field' : 'null'}, aquatic ${wet ? 'field' : 'null'}`);
  const wet2 = buildZoneCreep(
    { pockets: [2, 3], kinds: [{ id: 'brinesurge' }, { id: 'caulflesh' }] },
    { w: 2000, h: 1400, aquatic: true }, new Rng(9));
  check('aquatic: sea-forsworn pocket kinds filtered; unflagged kinds still grow',
    wet2 !== null && wet2.sources.length > 0 && wet2.sources.every(s => s.def.id === 'caulflesh'),
    wet2 ? `${wet2.sources.length} pockets: ${[...new Set(wet2.sources.map(s => s.def.id))].join(',')}` : 'null');
}

// --- 11) CHANCE: the intra-zone-event dial ---------------------------------
{
  const mk = (seed: number): number => {
    const f2 = buildZoneCreep(
      { pockets: [0, 0], kinds: [], fronts: [{ id: 'floodcrest', chance: 0.5 }] },
      { w: 1500, h: 1000 }, new Rng(seed));
    return f2 ? f2.laneCount() : 0;
  };
  check('chance: per-visit roll is deterministic per seed',
    mk(41) === mk(41) && mk(97) === mk(97));
  let on = 0;
  for (let s = 0; s < 30; s++) on += mk(1000 + s) ? 1 : 0;
  check('chance: both outcomes occur across seeds (an event, not a fixture)',
    on > 4 && on < 26, `${on}/30 visits fielded the lane`);
  const always = buildZoneCreep(
    { pockets: [0, 0], kinds: [], fronts: [{ id: 'floodcrest' }] },
    { w: 1500, h: 1000 }, new Rng(5));
  check('chance: absent = fixture (and chance-less rows draw no extra rng)',
    always?.laneCount() === 1);
}

// --- 12) ANNOUNCE: one arrival line per fielding wave ----------------------
{
  const f = new CreepField(new Rng(77), 1600, 1200);
  const seen: string[] = [];
  f.setTerrain({
    groundKindAt: () => null,
    eachFuelNear: () => {},
    consume: () => {},
    stamp: () => {},
    drag: () => {},
    drown: () => {},
    announce: text => seen.push(text),
  });
  f.installLanes([
    { id: 'tidalwall', line: 'span', bearing: 0, delay: [0, 0], announce: { text: 'the sea rises!' } },
    { id: 'floodcrest', line: [2, 2], bearing: 0, delay: [0, 0] },
  ]);
  f.update(0.1, 0, []);
  check('announce: one line per announcing wave — silent rows stay silent',
    seen.length === 1 && seen[0] === 'the sea rises!', seen.join('|') || 'none');
}

console.log(failed ? `\n${failed} CHECK(S) FAILED` : '\nALL FRONT CHECKS PASSED');
process.exit(failed ? 1 : 0);
