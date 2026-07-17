// ---------------------------------------------------------------------------
// ONE-OFF PROBE — THE WAYFARING FABRIC end to end on the real engine
// (docs/engine/los-pathing.md § travel preference). Pins:
//   - registry pricing: explicit pathCost rows + the mechanical derivation
//     (standDamage / survival / moveScale) + the clamps,
//   - UNIFORM PARITY: a uniform profile's flow field is byte-identical to
//     the classic unweighted one (heedless minds and hazard-free grids pay
//     nothing for the machinery),
//   - the weighted detour: a default mind routes AROUND a lava band through
//     the gap; deterrence stays FINITE (no gap → it crosses, begrudgingly),
//   - relish: a lava-relishing profile CHOOSES the lava corridor (the magma
//     worm's bath), while the default mind takes the dry one,
//   - linePreferred: hazards break the any-angle beeline the way walls do;
//     roads (cheaper than floor) never break it; lineWalkable is untouched,
//   - profiles on the real World: default / insured / override / heedless,
//     all through the ONE insurance predicate terrain damage uses,
//   - convex-nav ground pricing: addTempGround discs exist to pathField
//     (lava priced, water's deep core priced as deep_water),
//   - the behavioral arc: a wolf crosses the caldera rim DRY while the
//     magma worm bathes straight through the same pools,
//   - THE SELF-PRESERVATION VETO: an 'avoid' mind (and a HEEDLESS one) at
//     an uncrossable void band holds the rim — zero falls, zero fall damage
//     — while a 'lemming' clone of the same body walks off and dies (the
//     old suicide loop, now authored-only),
//   - determinism: identical inputs walk identical paths, twice.
// Run: npx tsx balance/probe_pathpref.ts
// ---------------------------------------------------------------------------

import { bootSimEngine, makeSimWorld } from '../src/sim/arena';
import { seedGlobalRandom } from '../src/sim/rng';
import { updateAI } from '../src/engine/ai';
import { MONSTERS } from '../src/data/monsters';
import type { Doodad } from '../src/engine/levelgen';
import type { RecoveryPolicy } from '../src/world/regions';
import { GridWalkField, PATH_SCALE } from '../src/world/gridWalk';
import { regionPathCost, PATH_CFG } from '../src/world/regions';
import type { PathProfile } from '../src/world/walk';
import { vec, type Vec2 } from '../src/core/math';
import type { World } from '../src/engine/world';

let failed = 0;
const check = (name: string, ok: boolean, detail = ''): void => {
  console.log(`${ok ? 'PASS' : 'FAIL'}  ${name}${detail ? ' — ' + detail : ''}`);
  if (!ok) failed++;
};

bootSimEngine();
seedGlobalRandom(0x9a7f);

// The three priced views the pure-grid pins walk with.
const DEF: PathProfile = { key: 'probe_default', costOf: regionPathCost };
const UNI: PathProfile = { key: 'probe_uniform', costOf: () => 1 };
const RELISH: PathProfile = { key: 'probe_relish', costOf: k => (k === 'lava' ? 0.5 : regionPathCost(k)) };

/** Hop cell-to-cell along pathStep until `to` (or give up). */
function walkPath(g: GridWalkField, from: Vec2, to: Vec2, prof?: PathProfile):
  { pts: Vec2[]; kinds: string[]; reached: boolean } {
  let pos = vec(from.x, from.y);
  const pts: Vec2[] = [];
  const kinds: string[] = [];
  for (let i = 0; i < 400; i++) {
    const step = prof ? g.pathStep(pos, to, prof) : g.pathStep(pos, to);
    if (!step) return { pts, kinds, reached: false };
    pos = vec(step.x, step.y);
    pts.push(pos);
    kinds.push(g.regionAt(pos.x, pos.y));
    if (Math.hypot(to.x - pos.x, to.y - pos.y) < 1) return { pts, kinds, reached: true };
  }
  return { pts, kinds, reached: false };
}

// ------------------------------------------------------ registry pricing pins
{
  check('pricing: plain ground is neutral', regionPathCost('ground') === 1);
  check('pricing: lava explicit row', regionPathCost('lava') === 14, `${regionPathCost('lava')}`);
  check('pricing: road pulls below neutral', regionPathCost('road') === 0.9);
  check('pricing: deep_water derives from its survival drain',
    regionPathCost('deep_water') === PATH_CFG.survivalCost, `${regionPathCost('deep_water')}`);
  check('pricing: softsand derives from its moveScale',
    Math.abs(regionPathCost('softsand') - 1 / 0.82) < 1e-9, `${regionPathCost('softsand')}`);
  check('pricing: non-walkable kinds price neutral (mask owns them)',
    regionPathCost('void') === 1 && regionPathCost('wall') === 1);
}

// ----------------------------------------------- uniform parity (byte-for-byte)
{
  const g = new GridWalkField(1200, 600, 30);
  g.fillRect(0, 0, 1200, 600, true);
  g.fillRegion(570, 90, 660, 600, 'lava'); // band with a clean lane at the top
  const from = vec(315, 315), to = vec(915, 315);
  const plain = walkPath(g, from, to);
  const uni = walkPath(g, from, to, UNI);
  const same = plain.pts.length === uni.pts.length
    && plain.pts.every((p, i) => p.x === uni.pts[i].x && p.y === uni.pts[i].y);
  check('uniform profile === classic field (byte parity)', same && plain.reached,
    `${plain.pts.length} vs ${uni.pts.length} steps`);
  check('classic beeline judgment untouched (lineWalkable crosses lava)',
    g.lineWalkable(from, to) === true);
  check('linePreferred breaks the beeline at the lava band',
    g.linePreferred(from, to, DEF) === false);
  check('linePreferred with a uniform view delegates to lineWalkable',
    g.linePreferred(from, to, UNI) === true);

  // The weighted detour: the default mind threads the clean lane at the top
  // and never stands in the melt; the uniform mind marches straight through.
  const def = walkPath(g, from, to, DEF);
  check('weighted detour: default mind reaches without a lava step',
    def.reached && !def.kinds.includes('lava'), `${def.pts.length} steps`);
  check('uniform mind crosses the band directly (and shorter)',
    uni.reached && uni.kinds.includes('lava') && uni.pts.length < def.pts.length,
    `${uni.pts.length} < ${def.pts.length}`);

  // Determinism: the same ask twice is the same walk twice.
  const def2 = walkPath(g, from, to, DEF);
  check('determinism: identical walks, twice',
    JSON.stringify(def.pts) === JSON.stringify(def2.pts));
}

// ------------------------------------------------- finite deterrence (no wall)
{
  const g = new GridWalkField(1200, 600, 30);
  g.fillRect(0, 0, 1200, 600, true);
  g.fillRegion(570, 0, 660, 600, 'lava'); // full-height band: no way around
  const def = walkPath(g, vec(315, 315), vec(915, 315), DEF);
  check('finite deterrence: no gap → the mind still crosses (cost, never a wall)',
    def.reached && def.kinds.includes('lava'), `${def.pts.length} steps`);
}

// ---------------------------------------------- relish (the worm picks its bath)
{
  const g = new GridWalkField(1200, 270, 30);
  g.fillRect(0, 0, 1200, 270, true);
  g.fillRegion(90, 105, 1110, 165, 'wall');  // spine wall between two corridors
  g.fillRegion(90, 165, 1110, 270, 'lava');  // the south corridor runs molten
  const from = vec(45, 135), to = vec(1155, 135);
  const dry = walkPath(g, from, to, DEF);
  const bath = walkPath(g, from, to, RELISH);
  check('relish: the default mind takes the dry corridor',
    dry.reached && !dry.kinds.includes('lava'));
  check('relish: the lava-relishing mind chooses the melt',
    bath.reached && bath.kinds.includes('lava'));
  // A road is cheaper than floor — it must NOT break the beeline shortcut.
  const g2 = new GridWalkField(600, 300, 30);
  g2.fillRect(0, 0, 600, 300, true);
  g2.fillRegion(240, 0, 330, 300, 'road');
  check('roads never break the beeline (cheap is not a hazard)',
    g2.linePreferred(vec(75, 150), vec(525, 150), DEF) === true);
}

// ------------------------------------------------- profiles on the real World
const world = makeSimWorld('warrior', 1337);
const p = world.player;
p.invulnerable = true;
// The host frame, verbatim (updateAI lives OUTSIDE world.update — main.ts/runner.ts).
const step = (w: World, s: number): void => {
  for (let t = 0; t < s; t += 1 / 60) {
    for (const a of w.actors) updateAI(a, w, 1 / 60);
    w.update(1 / 60);
  }
};
{
  const wolf = world.createMonster('plains_wolf', 5, 'enemy');
  wolf.pos = vec(p.pos.x + 200, p.pos.y);
  world.actors.push(wolf);
  const worm = world.createMonster('magma_worm', 8, 'enemy');
  worm.pos = vec(p.pos.x - 200, p.pos.y);
  world.actors.push(worm);
  const zed = world.createMonster('zombie', 5, 'enemy');
  zed.pos = vec(p.pos.x, p.pos.y + 200);
  world.actors.push(zed);
  step(world, 0.2); // let the AI stamp hazard modes
  check('profile: the wolf prices lava at the registry row',
    world.pathProfileFor(wolf).costOf('lava') === 14);
  check('profile: the magma worm RELISHES lava (override beats insurance)',
    world.pathProfileFor(worm).costOf('lava') === 0.5);
  check('profile: insurance alone neutralizes (worm × magma_core)',
    world.pathProfileFor(worm).costOf('magma_core') === 1);
  check('profile: the heedless zombie prices everything neutral',
    world.pathProfileFor(zed).costOf('lava') === 1 && zed.aiHazardMode === 'heedless');
  check('ONE insurance predicate: pathing and pain agree',
    world.groundInsured(worm, 'lava') && !world.groundInsured(wolf, 'lava'));
  check('profiles intern: same deviations, same object',
    world.pathProfileFor(wolf) === world.pathProfileFor(world.createMonster('plains_wolf', 5, 'enemy')));
  wolf.dead = true; worm.dead = true; zed.dead = true;
  step(world, 0.5);
}

// --------------------------------------- convex-nav pricing (the caldera's rim)
{
  const aw = world.arena.w, ah = world.arena.h;
  world.addTempGround(vec(aw * 0.5, ah * 0.5), 'lava', 90, 1e9);
  world.addTempGround(vec(aw * 0.3, ah * 0.3), 'water', 150, 1e9);
  const pf = world.pathField()!;
  check('convex nav senses the lava disc', pf.regionAt!(aw * 0.5, ah * 0.5) === 'lava');
  check('convex nav prices the deep core as deep_water',
    pf.regionAt!(aw * 0.3, ah * 0.3) === 'deep_water');
  check('convex nav: the water shore ring stays wadeable water',
    pf.regionAt!(aw * 0.3 + 140, ah * 0.3) === 'water');
  check('convex nav: clean floor stays plain ground', pf.regionAt!(aw * 0.8, ah * 0.8) === 'ground');
}

// -------------------------------- the behavioral arc: dry wolf, bathing worm
function calderaRig(): { w: World; gapY: number } {
  const w = makeSimWorld('warrior', 777);
  w.player.invulnerable = true;
  const aw = w.arena.w, ah = w.arena.h;
  w.player.pos = vec(aw * 0.62, ah * 0.55);
  // A lava band across the approach, with one dry pass to the north.
  for (let y = ah * 0.34; y <= ah + 90; y += 100) {
    w.addTempGround(vec(aw * 0.47, y), 'lava', 90, 1e9);
  }
  return { w, gapY: ah * 0.34 - 90 };
}
{
  const { w } = calderaRig();
  const wolf = w.createMonster('plains_wolf', 5, 'enemy');
  wolf.pos = vec(w.arena.w * 0.32, w.arena.h * 0.55);
  w.actors.push(wolf);
  let lavaTicks = 0, ticks = 0, minD = Infinity;
  for (let t = 0; t < 14; t += 1 / 60) {
    step(w, 1 / 60);
    if (wolf.dead) break;
    ticks++;
    if (wolf.groundKind === 'lava') lavaTicks++;
    minD = Math.min(minD, Math.hypot(w.player.pos.x - wolf.pos.x, w.player.pos.y - wolf.pos.y));
  }
  check('the wolf closes on its prey across the caldera rim', minD < 100, `minD ${minD.toFixed(0)}`);
  check('…and stays DRY doing it (routes the pass, never wades the melt)',
    lavaTicks <= Math.ceil(ticks * 0.02), `${lavaTicks}/${ticks} lava ticks`);
  check('…unburnt (no standDamage bled off it)', wolf.life >= wolf.maxLife() * 0.9,
    `${Math.round(wolf.life)}/${Math.round(wolf.maxLife())}`);
}
{
  const { w } = calderaRig();
  const worm = w.createMonster('magma_worm', 8, 'enemy');
  worm.pos = vec(w.arena.w * 0.32, w.arena.h * 0.55);
  w.actors.push(worm);
  let lavaTicks = 0, maxX = -Infinity;
  for (let t = 0; t < 14; t += 1 / 60) {
    step(w, 1 / 60);
    if (worm.dead) break;
    if (worm.groundKind === 'lava') lavaTicks++;
    maxX = Math.max(maxX, worm.pos.x);
  }
  check('the magma worm BATHES: it crosses through the pools by choice',
    lavaTicks > 10, `${lavaTicks} lava ticks`);
  // A caster: once its firebolt range covers the prey it HOLDS — from inside
  // the pool, happily. The pin is that it waded INTO the band (a default
  // mind never does — see the wolf) and the insurance held through the soak.
  check('…and holds its bath alive (insurance held through the soak)',
    !worm.dead && maxX > w.arena.w * 0.47 - 60 && worm.life === worm.maxLife(),
    `maxX ${maxX.toFixed(0)}, life ${Math.round(worm.life)}/${Math.round(worm.maxLife())}`);
}

// ------------------------------------- the self-preservation veto at the rim
/** A fresh world with a full-height VOID band installed between west ground
 *  and the player's east ground (a real GridWalkField as world.walk). */
function voidRig(monsterId: string): { w: World; m: import('../src/engine/actor').Actor; bandX: number } {
  const w = makeSimWorld('warrior', 4242);
  w.player.invulnerable = true;
  const aw = w.arena.w, ah = w.arena.h;
  const grid = new GridWalkField(aw, ah, 30);
  grid.fillRect(0, 0, aw, ah, true);
  const bandX = aw * 0.5;
  grid.fillRegion(bandX, 0, bandX + 120, ah, 'void');
  w.walk = grid;
  w.player.pos = vec(bandX + 420, ah * 0.5);
  const m = w.createMonster(monsterId, 5, 'enemy');
  m.pos = vec(bandX - 300, ah * 0.5);
  w.actors.push(m);
  return { w, m, bandX };
}
{
  const { w, m, bandX } = voidRig('plains_wolf');
  let maxX = -Infinity;
  for (let t = 0; t < 8; t += 1 / 60) { step(w, 1 / 60); if (m.dead) break; maxX = Math.max(maxX, m.pos.x); }
  check('the veto rig is live (the wolf actually marched on the band)', maxX > bandX - 300 + 60,
    `maxX ${maxX.toFixed(0)} from ${(bandX - 300).toFixed(0)}`);
  check('the veto: an avoid mind at the void holds the rim (no falls, no damage)',
    !m.dead && m.lastFall === undefined && m.life === m.maxLife(),
    `life ${Math.round(m.life)}/${Math.round(m.maxLife())}`);
  check('…and never carries its body past the lip', maxX < bandX + 15, `maxX ${maxX.toFixed(0)} vs band ${bandX}`);
}
{
  const { w, m } = voidRig('zombie'); // heedless ≠ suicidal: the veto still holds
  for (let t = 0; t < 8; t += 1 / 60) { step(w, 1 / 60); if (m.dead) break; }
  check('heedless is not lemming: the zombie holds the rim too',
    !m.dead && m.lastFall === undefined && m.life === m.maxLife());
}
{
  // The control that proves the veto is what saves them: a lemming clone of
  // the same wolf — authored self-destruction — walks off and pays for it.
  MONSTERS['probe_lemming'] = {
    ...MONSTERS['plains_wolf'], id: 'probe_lemming', name: 'Probe Lemming',
    brain: { type: 'basic', move: { pathing: 'none', hazards: 'lemming' } },
  };
  const { w, m } = voidRig('probe_lemming');
  for (let t = 0; t < 8; t += 1 / 60) { step(w, 1 / 60); if (m.dead) break; }
  check('the lemming control FALLS (authored self-destruction still exists)',
    m.lastFall !== undefined && (m.dead || m.life < m.maxLife()));
  delete MONSTERS['probe_lemming'];
}

// -------------------- the veto at fall-able pit DOODADS (the pitfall fabric)
// The named seam, closed: pit doodads stopped being walls (drops now — the
// pitfall pass), so the veto must see their surfaces or a steered mind
// grinds the classic-fall recovery to death at the rim (measured: a wolf
// died in <8s pressing a chasm band before the fix).
function pitRig(monsterId: string, descend = false):
  { w: World; m: import('../src/engine/actor').Actor; bandX: number } {
  const w = makeSimWorld('warrior', 31337);
  w.player.invulnerable = true;
  const aw = w.arena.w, ah = w.arena.h;
  const bandX = aw * 0.5;
  for (let y = -60; y <= ah + 90; y += 100) {
    const d: Doodad = { pos: vec(bandX, y), radius: 80, kind: 'chasm' };
    w.doodads.push(d);
  }
  if (descend) (w.zone.theme as { pitfall?: RecoveryPolicy }).pitfall = { kind: 'descend' };
  w.player.pos = vec(bandX + 400, ah * 0.5);
  const m = w.createMonster(monsterId, 5, 'enemy');
  m.pos = vec(bandX - 400, ah * 0.5);
  w.actors.push(m);
  return { w, m, bandX };
}
{
  const { w, m, bandX } = pitRig('plains_wolf');
  let maxX = -Infinity;
  for (let t = 0; t < 8; t += 1 / 60) { step(w, 1 / 60); if (m.dead) break; maxX = Math.max(maxX, m.pos.x); }
  check('pit doodads: an avoid mind holds short of the lip — alive, unhurt, no falls',
    !m.dead && m.lastFall === undefined && m.life === m.maxLife(),
    `life ${Math.round(m.life)}/${Math.round(m.maxLife())}`);
  check('…vetoed BEFORE the rim (no lip-grinding against the pit confine)',
    maxX > bandX - 400 + 60 && maxX < bandX - 80 + 15, `maxX ${maxX.toFixed(0)} vs lip ${(bandX - 80).toFixed(0)}`);
  // The predicate itself, both sides of the insurance.
  check('fallHazardAt sees the pit surface for the uninsured',
    w.fallHazardAt(m, bandX, w.arena.h * 0.5) === true);
  MONSTERS['probe_pitproof'] = {
    ...MONSTERS['plains_wolf'], id: 'probe_pitproof', name: 'Probe Pitproof',
    immuneGround: ['chasm'],
  };
  const proof = w.createMonster('probe_pitproof', 5, 'enemy');
  w.actors.push(proof);
  check('…and stays silent for a body HOME in the pit (insurance, one predicate)',
    w.fallHazardAt(proof, bandX, w.arena.h * 0.5) === false);
  delete MONSTERS['probe_pitproof'];
}
{
  // Classic-fall zones are where the grind KILLED: only the lemming still may.
  MONSTERS['probe_lemming'] = {
    ...MONSTERS['plains_wolf'], id: 'probe_lemming', name: 'Probe Lemming',
    brain: { type: 'basic', move: { pathing: 'none', hazards: 'lemming' } },
  };
  const { w, m } = pitRig('probe_lemming');
  for (let t = 0; t < 8; t += 1 / 60) { step(w, 1 / 60); if (m.dead) break; }
  check('pit doodads: the lemming control still grinds the classic fall (authored-only)',
    m.lastFall !== undefined && (m.dead || m.life < m.maxLife()));
  // On a DESCEND zone the pitfall fabric's own forced-only gate holds even a
  // lemming pressed at the rim unharmed (steering never walks a body off).
  const d = pitRig('probe_lemming', true);
  for (let t = 0; t < 8; t += 1 / 60) { step(d.w, 1 / 60); if (d.m.dead) break; }
  check('descend pits: even a pressed lemming is HELD by the forced-only swallow gate',
    !d.m.dead && d.m.life === d.m.maxLife(),
    `life ${Math.round(d.m.life)}/${Math.round(d.m.maxLife())}`);
  delete MONSTERS['probe_lemming'];
}
{
  // The payoff lane must stay lethal: a hostile SHOVED past its support on a
  // descend zone is swallowed, with the kill credited to the shover.
  const { w, m, bandX } = pitRig('plains_wolf', true);
  m.pos = vec(bandX - 92, w.arena.h * 0.5); // toes at the lip
  const xpBefore = w.seats[0].meta.xp; // xp is SEAT meta, never an actor field
  for (let i = 0; i < 30 && !m.dead; i++) {
    w.pushActor(m, 0, 900, w.player); // due east, into the dark
    step(w, 0.1);
  }
  check('the shove still swallows (the veto never gates forced displacement)', m.dead);
  check('…with full credit to the shover', w.seats[0].meta.xp > xpBefore,
    `xp ${xpBefore} -> ${w.seats[0].meta.xp}`);
}

console.log(failed ? `\n${failed} CHECK(S) FAILED` : '\nALL CHECKS PASSED');
process.exit(failed ? 1 : 0);
