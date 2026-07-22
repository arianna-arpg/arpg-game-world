// ---------------------------------------------------------------------------
// ONE-OFF PROBE — THE LITE TIER end to end on the real engine
// (docs/engine/lite.md): pool spawn/free/reuse + the capacity refusal, kind
// resolution off MonsterDef.lite (plies at level, the xp bounty formula),
// THE CARVE both ways (a nova's exact geometry mows the crowd; bodies
// outside it stand — and the projectile sweep spends its pierce budget
// front-first, stopping the flight on the body that exhausts it), THE
// POOLED BITE (staggered per-victim beats, the per-kind count cap, real
// mitigation, and the one-tear-per-beat law on ply-bearing victims),
// credited-death aggregation (xp + bestiary flush), the throng lite tier
// (full bodies DEMOTE into the pool when quiet, the direct sweep stamps
// the cloud's order, the LATCH boundary promotes real clingers, and the
// round trip is lossless for plies/kind/owner), the GRAB boundary (a
// seize with no full body promotes the row into the hand), the disband
// re-wild (rows become claimable husks, never a silent delete), the co-op
// wire shape, and byte determinism under a fixed seed.
// Run: npx tsx balance/probe_lite.ts
// ---------------------------------------------------------------------------

import { bootSimEngine, makeSimWorld } from '../src/sim/arena';
import { seedGlobalRandom } from '../src/sim/rng';
import { MONSTERS } from '../src/data/monsters';
import { SKILLS } from '../src/data/skills';
import { makeSkillInstance, type SkillDef } from '../src/engine/skills';
import { LITE_CFG, LitePool, liteNoise, resolveLiteKind } from '../src/engine/lite';
import { updateAI } from '../src/engine/ai';
import { serializeSnapshot } from '../src/net/snapshot';
import type { World } from '../src/engine/world';
import { vec } from '../src/core/math';

let failed = 0;
const check = (name: string, ok: boolean, detail = ''): void => {
  console.log(`${ok ? 'PASS' : 'FAIL'}  ${name}${detail ? ' — ' + detail : ''}`);
  if (!ok) failed++;
};

bootSimEngine();
seedGlobalRandom(0x117e5);

/** The host loop verbatim (sim/runner.ts): inputs → AI per actor → update.
 *  A w.update-only probe leaves every promoted brain frozen. */
const step = (w: World, seconds: number): void => {
  const dt = 1 / 60;
  for (let t = 0; t < seconds - 1e-9; t += dt) {
    w.applyInputs(new Map(), dt);
    for (const a of [...w.actors]) updateAI(a, w, dt);
    w.update(dt);
  }
};

const nova = {
  id: 'probe_nova', name: 'Probe Nova', noDrop: true, description: '',
  tags: ['spell'], color: '#fff',
  manaCost: 0, cooldown: 0, useTime: 0,
  baseDamage: { physical: [50, 50] as [number, number] },
  delivery: { type: 'nova', radius: 120 },
  effects: [{ type: 'damage' }],
} as SkillDef;
const bolt = {
  ...nova, id: 'probe_bolt', name: 'Probe Bolt',
  delivery: { type: 'projectile', speed: 600, radius: 6, range: 420 },
} as SkillDef;

// --- 0) Pure laws: kinds, noise, the pool itself ---------------------------
{
  const k = resolveLiteKind(MONSTERS.vermin_tide, 1, 0.8)!;
  check('resolve: vermin_tide reads off its def (radius/speed/plies/bite)',
    !!k && k.radius === 5 && k.plies0 === 1 && k.contactDamage === 2
    && k.xpValue === Math.round(1 * 0.8 * 1.15) && !k.clings);
  const g = resolveLiteKind(MONSTERS.gnatling, 4, 0.8)!;
  check('resolve: gnatling is a flier that CLINGS (the latch boundary arms)',
    !!g && g.clings && g.flier && g.plies0 === 1);
  check('registry: the debut kinds + the lite-tier anchor are wired',
    !!MONSTERS.vermin_tide.lite && !!MONSTERS.gnatling.lite
    && SKILLS.raise_gnatveil.throng?.tier === 'lite');
  check('noise: integer-hashed, deterministic, bounded',
    liteNoise(7, 31) === liteNoise(7, 31)
    && liteNoise(7, 31) !== liteNoise(8, 31)
    && Math.abs(liteNoise(123, 456)) <= 1);

  const pool = new LitePool(8);
  pool.reset(1000, 1000);
  const a = pool.spawn(0, 10, 10, 0, 0, 1);
  const b = pool.spawn(0, 20, 20, 1, 42, 3);
  check('pool: rows mint with their columns', a === 0 && b === 1
    && pool.liveCount === 2 && pool.team[b] === 1 && pool.owner[b] === 42 && pool.plies[b] === 3);
  pool.free(a);
  const c = pool.spawn(1, 30, 30, 0, 0, 1);
  check('pool: freed rows recycle (freelist), live census holds',
    c === a && pool.liveCount === 2 && pool.kind[c] === 1);
  for (let i = 0; i < 12; i++) pool.spawn(0, i, i, 0, 0, 1);
  check('pool: capacity refuses gracefully — never overwrites a live row',
    pool.liveCount === 8 && pool.spawn(0, 5, 5, 0, 0, 1) === -1
    && pool.x[c] === 30);
}

// --- 1) THE CARVE: a nova's exact geometry, xp + bestiary flush ------------
{
  const w = makeSimWorld('summoner', 0xd301);
  const p = w.player;
  const near = w.devLitePour('vermin_tide', 10);            // ≤ ~82 px out
  const far = w.devLitePour('vermin_tide', 10, vec(p.pos.x + 400, p.pos.y));
  check('pour: the dev lever seats bodies', near === 10 && far === 10
    && w.lite.liveCount === 20);
  const xp0 = w.seats[0].meta.xp + 0;
  p.useLock = 0; p.mana = p.maxMana();
  w.executeSkill(p, makeSkillInstance(nova, 1), vec(p.pos.x, p.pos.y));
  check('carve: the nova obliterates the crowd INSIDE its ring only',
    w.lite.liveCount === 10, `live ${w.lite.liveCount}`);
  step(w, 0.1); // one sweep: the aggregate flush
  check('credit: pool deaths accrue the kind\'s xp bounty (flushed)',
    w.seats[0].meta.xp > xp0, `xp ${xp0} → ${w.seats[0].meta.xp}`);
  check('credit: the bestiary learns from the tide (recording rule)',
    (w.account.ledger['bestiary:vermin_tide'] ?? 0) >= 10,
    `ledger ${w.account.ledger['bestiary:vermin_tide']}`);
}

// --- 2) THE CARVE, projectile half: the pierce budget, front-first ---------
{
  const w = makeSimWorld('summoner', 0xd302);
  const p = w.player;
  // A stationary probe kind: speed 0 pins the firing line in place (live
  // kinds would converge on the seat mid-test — motion is its own PASS).
  MONSTERS.probe_pylon = {
    id: 'probe_pylon', name: 'Probe Pylon', color: '#fff', shape: 'circle',
    radius: 5, base: { life: 5, moveSpeed: 0, mana: 0 }, skills: [], xp: 0,
    plies: { count: 1 },
    lite: { contact: { damage: 0 }, speed: 0 },
  };
  const kindIdx = w.liteKindOf('probe_pylon');
  for (const dx of [70, 100, 130, 160]) {
    w.lite.spawn(kindIdx, p.pos.x + dx, p.pos.y, 0, 0, 1);
  }
  w.update(1 / 60); // buckets stand
  const fire = (): void => {
    p.useLock = 0; p.mana = p.maxMana();
    p.facing = 0;
    w.executeSkill(p, makeSkillInstance(bolt, 1), vec(p.pos.x + 300, p.pos.y));
  };
  fire();
  step(w, 0.6);
  check('pierce 0: the arrow spends on the FIRST body and dies there',
    w.lite.liveCount === 3 && w.projectiles.length === 0, `live ${w.lite.liveCount}`);
  fire();
  w.projectiles[w.projectiles.length - 1].pierce = 2;
  step(w, 0.6);
  check('pierce 2: the bolt mows a three-body furrow, then stops',
    w.lite.liveCount === 0, `live ${w.lite.liveCount}`);
  delete MONSTERS.probe_pylon;
}

// --- 3) THE POOLED BITE: cap, cadence, mitigation, the ply law -------------
{
  const w = makeSimWorld('summoner', 0xd303);
  const p = w.player;
  MONSTERS.probe_soak = {
    id: 'probe_soak', name: 'Probe Soak', color: '#fff', shape: 'circle',
    radius: 12, base: { life: 500, moveSpeed: 0, mana: 0 }, skills: [], xp: 0,
  };
  MONSTERS.probe_plywall = {
    id: 'probe_plywall', name: 'Probe Plywall', color: '#fff', shape: 'circle',
    radius: 12, base: { life: 100, moveSpeed: 0, mana: 0 }, skills: [], xp: 0,
    // Plies sized past the window's worst-case beat count: the tide's beat
    // stagger is a seeded-stream phase, and a 3-ply wall could legally be
    // SPENT by a 4th beat inside the 2s window — after which the dual pool
    // bites LIFE by design and the never-moves pin read as a defect.
    plies: { count: 8 },
  };
  const at = vec(p.pos.x + 780, p.pos.y); // out of the tide's seat-aggro
  const soak = w.createMonster('probe_soak', 1, 'player');
  soak.pos = vec(at.x, at.y);
  w.actors.push(soak);
  w.devLitePour('vermin_tide', 40, at);
  const life0 = soak.life;
  let worstBite = 0, prev = soak.life;
  const dt = 1 / 60;
  for (let t = 0; t < 2; t += dt) {
    w.applyInputs(new Map(), dt);
    w.update(dt);
    if (prev - soak.life > worstBite) worstBite = prev - soak.life;
    prev = soak.life;
  }
  const cap = 2 * LITE_CFG.contact.countCap;
  check('bite: the crowd wounds on the beat, mitigated, count-CAPPED',
    soak.life < life0 && worstBite > 0 && worstBite <= cap + 0.01,
    `worst bite ${worstBite.toFixed(1)} (cap ${cap}), life ${life0} → ${soak.life.toFixed(1)}`);
  check('bite: one bite per beat, never per body per frame',
    life0 - soak.life <= cap * 5, `total ${(life0 - soak.life).toFixed(1)} over 2s`);

  const wall = w.createMonster('probe_plywall', 1, 'player');
  wall.pos = vec(at.x + 30, at.y);
  w.actors.push(wall);
  const wallLife = wall.life;
  for (let t = 0; t < 2; t += dt) { w.applyInputs(new Map(), dt); w.update(dt); }
  check('ply law: a plied victim eats ONE TEAR per beat — life never moves',
    wall.plies < 8 && wall.plies >= 0 && wall.life === wallLife,
    `plies 8 → ${wall.plies}, life ${wall.life}/${wallLife}`);
  delete MONSTERS.probe_soak;
  delete MONSTERS.probe_plywall;
}

// --- 4) THE THRONG LITE TIER: demote, order, LATCH promote, round trip -----
{
  const w = makeSimWorld('summoner', 0xd304);
  const p = w.player;
  w.devThrongGrant('raise_gnatveil');
  w.devThrongMint('raise_gnatveil', 5); // full bodies — the sweep must FOLD them
  check('mint: five full gnatlings stand', w.throngBodiesOf(p, 'raise_gnatveil').length === 5);
  step(w, 1.2);
  const gnatKind = w.liteKindOf('gnatling');
  check('DEMOTE: quiet full bodies fold into the pool (rows, not minions)',
    w.throngBodiesOf(p, 'raise_gnatveil').length === 0
    && w.lite.countOwned(p.id, gnatKind) === 5,
    `actors ${w.throngBodiesOf(p, 'raise_gnatveil').length}, rows ${w.lite.countOwned(p.id, gnatKind)}`);
  const inst = p.skills.find(s => s?.def.id === 'raise_gnatveil')!;
  check('census: throngRosterCount reads rows + bodies as ONE roster',
    w.throngRosterCount(p, inst) === 5);

  // The direct sweep: a probe wrapper fires ONE throngDirect (the channel's
  // pulse) at a pinned quarry — the order stamps, the cloud marches, the
  // LATCH boundary promotes real clingers at the rim.
  const zombie = w.createMonster('zombie', 3, 'enemy');
  zombie.pos = vec(p.pos.x + 190, p.pos.y);
  zombie.skills = []; // defanged: conservation is the law under test, not attrition
  w.actors.push(zombie);
  const sweep = {
    id: 'probe_sweep', name: 'Probe Sweep', noDrop: true, description: '',
    tags: ['spell'], color: '#fff', manaCost: 0, cooldown: 0, useTime: 0,
    delivery: { type: 'self' },
    effects: [{ type: 'throngDirect' }],
    throng: SKILLS.raise_gnatveil.throng,
  } as SkillDef;
  p.useLock = 0;
  w.executeSkill(p, makeSkillInstance(sweep, 1), vec(zombie.pos.x, zombie.pos.y));
  step(w, 4);
  const riders = w.actors.filter(a => !a.dead && a.clingTo?.id === zombie.id);
  const promoted = w.throngBodiesOf(p, 'raise_gnatveil').length;
  check('LATCH: the marching cloud PROMOTES real clingers onto the quarry',
    promoted > 0 && riders.length > 0,
    `promoted ${promoted}, riding ${riders.length}, rows ${w.lite.countOwned(p.id, gnatKind)}`);
  check('census: the roster is CONSERVED across the crossing',
    w.throngRosterCount(p, inst) === 5,
    `${w.throngRosterCount(p, inst)}`);

  // The quarry falls + the order lapses: everyone comes home to the pool.
  w.kill(zombie, true);
  step(w, 9);
  check('ROUND TRIP: quiet bodies all fold back — rows 5, actors 0',
    w.lite.countOwned(p.id, gnatKind) === 5
    && w.throngBodiesOf(p, 'raise_gnatveil').length === 0,
    `rows ${w.lite.countOwned(p.id, gnatKind)}, actors ${w.throngBodiesOf(p, 'raise_gnatveil').length}`);

  // THE DISBAND: the anchor leaves the bar — rows re-wild as HUSKS.
  const slot = p.skills.findIndex(s => s?.def.id === 'raise_gnatveil');
  p.skills[slot] = null;
  step(w, 1.2);
  // ≥ 5: the anchor's own MOTE clock may have condensed a stray wild husk
  // or two during the long fight — the law under test is the five ROWS.
  check('DISBAND: orphaned rows re-wild as claimable husks (never deleted)',
    w.lite.countOwned(p.id, gnatKind) === 0
    && w.actors.filter(a => !a.dead && a.throngWild === 'gnatling').length >= 5,
    `husks ${w.actors.filter(a => !a.dead && a.throngWild === 'gnatling').length}`);
}

// --- 5) Plies survive the crossing (the lossless law, wounded) -------------
{
  const w = makeSimWorld('summoner', 0xd305);
  MONSTERS.probe_plit = {
    id: 'probe_plit', name: 'Probe Plit', color: '#fff', shape: 'circle',
    radius: 6, base: { life: 10, moveSpeed: 80, mana: 0 }, skills: [], xp: 0,
    plies: { count: 3 },
    lite: { contact: { damage: 1 } },
  };
  const kindIdx = w.liteKindOf('probe_plit');
  const row = w.lite.spawn(kindIdx, w.player.pos.x + 300, w.player.pos.y, 0, 0, 3);
  w.lite.plies[row] = 1; // two plies SPENT in the pool
  const body = w.promoteLite(row)!;
  check('PROMOTE carries wounds: 2 spent in the pool = 2 spent on the body',
    !!body && body.plies === 1 && body.pliesMax === 3 && w.lite.liveCount === 0,
    `plies ${body?.plies}/${body?.pliesMax}`);
  delete MONSTERS.probe_plit;
}

// --- 6) THE GRAB BOUNDARY: the hand closes on a promoted row ---------------
{
  const w = makeSimWorld('summoner', 0xd306);
  const p = w.player;
  p.facing = 0;
  w.devLitePour('vermin_tide', 3, vec(p.pos.x + 55, p.pos.y));
  w.update(1 / 60);
  p.useLock = 0; p.mana = p.maxMana();
  w.executeSkill(p, makeSkillInstance(SKILLS.seize, 1), vec(p.pos.x + 60, p.pos.y));
  const held = p.gripping ? w.actors.find(a => a.id === p.gripping!.id) : undefined;
  check('grab: a seize with no full body PROMOTES the row into the hand',
    !!held && held.defId === 'vermin_tide',
    held ? `holding ${held.defId}` : 'nothing held');
}

// --- 7) The co-op wire: kind table + flat rounded triples ------------------
{
  const w = makeSimWorld('summoner', 0xd307);
  w.devLitePour('vermin_tide', 15);
  const snap = serializeSnapshot(w, 0);
  check('wire: lt ships (kindIdx, x, y) triples for every live row',
    !!snap.lt && snap.lt.b.length === 15 * 3
    && snap.lt.k[snap.lt.b[0]] === 'vermin_tide'
    && Number.isInteger(snap.lt.b[1]) && Number.isInteger(snap.lt.b[2]));
  const w2 = makeSimWorld('summoner', 0xd308);
  const snap2 = serializeSnapshot(w2, 0);
  check('wire: an empty pool ships zero bytes (undefined lt)', snap2.lt === undefined);
}

// --- 8) Byte determinism under a fixed seed --------------------------------
{
  const run = (): Float32Array => {
    seedGlobalRandom(0x5eed);
    const w = makeSimWorld('summoner', 0xd309);
    w.devLitePour('vermin_tide', 80);
    for (let t = 0; t < 120; t++) { w.applyInputs(new Map(), 1 / 60); w.update(1 / 60); }
    const out = new Float32Array(w.lite.used * 4);
    for (let i = 0; i < w.lite.used; i++) {
      out[i * 4] = w.lite.x[i]; out[i * 4 + 1] = w.lite.y[i];
      out[i * 4 + 2] = w.lite.vx[i]; out[i * 4 + 3] = w.lite.vy[i];
    }
    return out;
  };
  const a = run(), b = run();
  let same = a.length === b.length && a.length > 0;
  for (let i = 0; same && i < a.length; i++) same = a[i] === b[i];
  check('determinism: two seeded runs are BYTE-IDENTICAL (x/y/vx/vy)', same,
    `${a.length / 4} rows compared`);
}

console.log(failed ? `\n${failed} FAILURE(S)` : '\nALL PASS');
process.exit(failed ? 2 : 0);
