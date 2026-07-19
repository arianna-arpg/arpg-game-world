// ---------------------------------------------------------------------------
// ONE-OFF PROBE — THE COLLECTIVE PASS on the real engine (docs/engine/lite.md):
// THE REGROWTH LAW (an unmolested pour pocket trickles back to its cap; every
// tear/kill/promotion stamps the quiet clock; a hostile seat inside the calm
// radius pauses regrowth outright; regrowth draws NO global rand), THE
// EXTERMINATION LAW (an ambient pocket wiped to zero never breeds back; its
// burrow tell seals), THE COLONY (MonsterDef.colony anchors a pocket on a
// living body — seeded on discovery, heart FOLLOWS the anchor, dies with it),
// THE VENT (the litePour skill effect pours pool bodies at the resolution
// point — a colony anchor pours into its own pocket; a projectile pours at
// IMPACT), THE TRAMPLE LANE (a qualified mover's crossing kills — speed gate,
// weight gate, the trample stat, flier exemption, cross-team symmetry,
// credit), and PLY REND (extra plies torn per blow at the real ply gate and
// the pool carve; the Exterminator support grants it).
// Run: npx tsx balance/probe_swarm.ts
// ---------------------------------------------------------------------------

import { bootSimEngine, makeSimWorld } from '../src/sim/arena';
import { seedGlobalRandom } from '../src/sim/rng';
import { MONSTERS } from '../src/data/monsters';
import { SKILLS } from '../src/data/skills';
import { SUPPORTS } from '../src/data/supports';
import { PASSIVE_NODES } from '../src/data/passives';
import { ITEM_AFFIXES } from '../src/data/itemaffixes';
import { STAT_DEFS, mod } from '../src/engine/stats';
import { makeSkillInstance, type SkillDef } from '../src/engine/skills';
import { LITE_CFG, resolveLiteKind } from '../src/engine/lite';
import { updateAI } from '../src/engine/ai';
import type { World } from '../src/engine/world';
import { vec } from '../src/core/math';

let failed = 0;
const check = (name: string, ok: boolean, detail = ''): void => {
  console.log(`${ok ? 'PASS' : 'FAIL'}  ${name}${detail ? ' — ' + detail : ''}`);
  if (!ok) failed++;
};

bootSimEngine();
seedGlobalRandom(0x5a17b);

/** The host loop verbatim (sim/runner.ts). */
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
// The far rig: pockets sit past aggro + calm (550 px) — the bolt must reach.
const farBolt = {
  ...nova, id: 'probe_farbolt', name: 'Probe Farbolt',
  delivery: { type: 'projectile', speed: 900, radius: 6, range: 1100 },
} as SkillDef;

// --- 0) Resolution + wiring laws -------------------------------------------
{
  const vt = resolveLiteKind(MONSTERS.vermin_tide, 1, 0.8)!;
  check('resolve: vermin_tide tramples at the CONFIG defaults (retrofit)',
    vt.trampleMinSpeed === LITE_CFG.trample.minSpeed
    && vt.trampleMinWeight === LITE_CFG.trample.minWeight
    && vt.regen !== null);
  const hs = resolveLiteKind(MONSTERS.husk_swarmer, 1, 0.8)!;
  check('resolve: chitin texture — husk_swarmer wants a heavier step',
    hs.trampleMinWeight === 1.6 && hs.trampleMinSpeed < Infinity);
  const bat = resolveLiteKind(MONSTERS.cave_bat, 1, 0.8)!;
  check('resolve: a FLIER never resolves a finite trample gate (structural)',
    bat.flier && bat.trampleMinSpeed === Infinity);
  const tick = resolveLiteKind(MONSTERS.vault_tick, 1, 0.8)!;
  check('resolve: vault_tick is 2-ply armored crawl, juggernaut-gated',
    tick.plies0 === 2 && tick.trampleMinWeight === 2.4);
  check('wiring: the colony anchors point at lite kinds (validator law, live)',
    ['warren_nest', 'ember_rift', 'hive_node', 'bat_roost', 'marrow_midden',
      'tick_reliquary', 'barrow_shambler'].every(id => {
      const col = MONSTERS[id]?.colony;
      return !!col && !!MONSTERS[col.monsterId]?.lite;
    }));
  check('wiring: the vent kit pours lite kinds (litePour effects)',
    ['vent_vermin', 'vent_mites', 'vent_ticks', 'hurl_swarmpod'].every(id =>
      SKILLS[id]?.effects.some(fx =>
        fx.type === 'litePour' && !!MONSTERS[fx.monsterId]?.lite)));
  check('wiring: stats + support + passives + affixes seated',
    !!STAT_DEFS.trample && !!STAT_DEFS.plyRend
    && SUPPORTS.exterminator.mods.some(m => m.stat === 'plyRend')
    && !!PASSIVE_NODES.mass_s3 && !!PASSIVE_NODES.mass_n2
    && !!ITEM_AFFIXES.trample_mass && !!ITEM_AFFIXES.ply_rend);
}

// --- 1) THE REGROWTH LAW: quiet clock, calm gate, cap ----------------------
{
  const w = makeSimWorld('summoner', 0x5a01);
  const p = w.player;
  const heart = vec(p.pos.x + 550, p.pos.y);
  const pk = w.devLitePocket('vermin_tide', heart, 12);
  check('pocket: the dev seam pours the collective full, burrow tell planted',
    pk >= 0 && w.lite.liveCount === 12
    && w.doodads.some(d => d.kind === 'colony_burrow' && !d.evap),
    `live ${w.lite.liveCount}`);
  // A bolt through the pocket: two die (pierce 1), the quiet clock stamps.
  p.useLock = 0; p.mana = p.maxMana(); p.facing = 0;
  w.executeSkill(p, makeSkillInstance(farBolt, 1), vec(heart.x, heart.y));
  const pj = w.projectiles[w.projectiles.length - 1];
  if (pj) pj.pierce = 1;
  step(w, 1.6);
  const afterShot = w.lite.liveCount;
  check('disturb: the shot thinned the pocket and stamped the clock',
    afterShot < 12 && w.litePockets[pk].disturbedUntil > w.time,
    `live ${afterShot}`);
  step(w, 3);
  check('regrowth: NOTHING breeds inside the quiet clock',
    w.lite.liveCount === afterShot, `live ${w.lite.liveCount}`);
  step(w, LITE_CFG.regen.quietSec + 4);
  check('regrowth: past the quiet the collective trickles back',
    w.lite.liveCount > afterShot, `live ${w.lite.liveCount}`);
  step(w, 14);
  check('cap: regrowth ceases AT the poured cap, never past it',
    w.lite.liveCount === 12 && w.litePockets[pk].live === 12,
    `live ${w.lite.liveCount}`);
  // THE CALM GATE: park the seat on the heart, thin the pocket, wait long —
  // nothing breeds under a predator's shadow.
  p.pos.x = heart.x; p.pos.y = heart.y;
  p.useLock = 0; p.mana = p.maxMana();
  w.executeSkill(p, makeSkillInstance(nova, 1), vec(p.pos.x, p.pos.y));
  const thinned = w.lite.liveCount;
  step(w, LITE_CFG.regen.quietSec + 6);
  check('calm gate: a seat within calmRadius holds regrowth at zero',
    thinned < 12 && w.lite.liveCount <= thinned,
    `thinned ${thinned}, after ${w.lite.liveCount}`);
}

// --- 2) THE EXTERMINATION LAW: zero is forever (ambient) --------------------
{
  const w = makeSimWorld('summoner', 0x5a02);
  const p = w.player;
  const heart = vec(p.pos.x + 550, p.pos.y);
  const pk = w.devLitePocket('vermin_tide', heart, 6);
  p.pos.x = heart.x; p.pos.y = heart.y;
  p.useLock = 0; p.mana = p.maxMana();
  w.executeSkill(p, makeSkillInstance(nova, 1), vec(p.pos.x, p.pos.y));
  check('wipe: the nova exterminates the pocket', w.lite.liveCount === 0);
  p.pos.x = heart.x - 900; p.pos.y = heart.y; // leave — calm, quiet elapses
  step(w, LITE_CFG.regen.quietSec + 8);
  const pkt = w.litePockets[pk];
  check('extermination: zero is FOREVER — extinct, nothing breeds back',
    w.lite.liveCount === 0 && pkt.extinct,
    `live ${w.lite.liveCount} extinct ${pkt.extinct}`);
  check('the burrow seals: the tell evaporates with the pocket',
    w.doodads.every(d => d.kind !== 'colony_burrow' || !!d.evap || !!d.gone));
}

// --- 3) THE COLONY: seeded on discovery, heart follows, dies with anchor ----
{
  const w = makeSimWorld('summoner', 0x5a03);
  const p = w.player;
  MONSTERS.probe_nest = {
    id: 'probe_nest', name: 'Probe Nest', color: '#fff', shape: 'circle',
    radius: 12, base: { life: 60, moveSpeed: 0, mana: 0 }, skills: [], xp: 0,
    colony: { monsterId: 'vermin_tide', cap: 8, radius: 40, seedFrac: 0.5 },
  };
  const at = vec(p.pos.x + 550, p.pos.y);
  const nest = w.createMonster('probe_nest', 1, 'enemy');
  nest.pos = vec(at.x, at.y);
  w.actors.push(nest);
  step(w, 0.4); // the PRIMED discovery sweep alone (regen.every hasn't turned)
  const pk = w.litePockets.findIndex(q => q.anchorId === nest.id);
  check('colony: discovery registers the pocket, seeded at seedFrac × cap',
    pk >= 0 && w.litePockets[pk].live === 4 && w.lite.liveCount === 4,
    `live ${w.lite.liveCount}`);
  check('colony: the anchor plants no burrow (the anchor IS the tell)',
    w.doodads.every(d => d.kind !== 'colony_burrow'));
  step(w, 12);
  check('colony: the collective fills to cap while unmolested',
    w.litePockets[pk].live === 8, `live ${w.litePockets[pk].live}`);
  // The heart WALKS: displace the anchor, the pocket follows.
  nest.pos.x += 300;
  step(w, LITE_CFG.regen.every + 0.1);
  check('colony: the heart follows a living anchor',
    Math.abs(w.litePockets[pk].x - nest.pos.x) < 1);
  // Kill the nest: the pocket dies with it; wipe the strays — zero forever.
  w.kill(nest, true);
  step(w, LITE_CFG.regen.every + 0.1);
  check('colony: the anchor\'s death extinguishes the pocket',
    w.litePockets[pk].extinct);
  p.pos.x = nest.pos.x; p.pos.y = nest.pos.y;
  p.useLock = 0; p.mana = p.maxMana();
  w.executeSkill(p, makeSkillInstance(nova, 1), vec(p.pos.x, p.pos.y));
  w.executeSkill(p, makeSkillInstance(nova, 1), vec(p.pos.x, p.pos.y));
  const strays = w.lite.liveCount;
  p.pos.x -= 900;
  step(w, LITE_CFG.regen.quietSec + 6);
  check('colony: no anchor, no regrowth — the strays are all that remain',
    w.lite.liveCount <= strays, `live ${w.lite.liveCount}`);
  delete MONSTERS.probe_nest;
}

// --- 4) THE VENT: litePour at the resolution point --------------------------
{
  const w = makeSimWorld('summoner', 0x5a04);
  const p = w.player;
  // An enemy piper vents WILD team-0 bodies around itself.
  const piper = w.createMonster('vermin_piper', 3, 'enemy');
  piper.pos = vec(p.pos.x + 700, p.pos.y);
  w.actors.push(piper);
  const inst = piper.skills.find(s => s?.def.id === 'vent_vermin');
  check('vent: the piper carries the call', !!inst);
  piper.useLock = 0; piper.mana = piper.maxMana();
  w.executeSkill(piper, inst!, vec(piper.pos.x, piper.pos.y));
  const made = w.lite.liveCount;
  check('vent: the call pours wild pool bodies in the row\'s count band',
    made >= 5 && made <= 8, `made ${made}`);
  // The lobbed bundle: a projectile pour lands AT IMPACT, not at the hand.
  const inst2 = piper.skills.find(s => s?.def.id === 'hurl_swarmpod');
  piper.useLock = 0; piper.mana = piper.maxMana();
  const aim = vec(piper.pos.x - 300, piper.pos.y);
  w.executeSkill(piper, inst2!, aim);
  // The pod flies ~0.95s (range 400 @ 420); count RIGHT at the burst —
  // the poured rats aggro the seat and walk off the mark within a second.
  step(w, 1.1);
  const pool = w.lite;
  let nearAim = 0;
  for (let i = 0; i < pool.used; i++) {
    if (!pool.alive[i]) continue;
    const dx = pool.x[i] - aim.x, dy = pool.y[i] - aim.y;
    if (dx * dx + dy * dy < 160 * 160) nearAim++;
  }
  check('vent: the bundle bursts WHERE IT LANDS (projectile pours at impact)',
    w.lite.liveCount > made && nearAim >= 3,
    `live ${w.lite.liveCount}, near aim ${nearAim}`);
  // A colony anchor's vent joins ITS OWN pocket (cap sees the call).
  MONSTERS.probe_venter = {
    id: 'probe_venter', name: 'Probe Venter', color: '#fff', shape: 'circle',
    radius: 12, base: { life: 60, moveSpeed: 0, mana: 999, manaRegen: 50 },
    skills: ['vent_vermin'], xp: 0,
    colony: { monsterId: 'vermin_tide', cap: 6, radius: 40, seedFrac: 0.5 },
  };
  const w2 = makeSimWorld('summoner', 0x5a05);
  const p2 = w2.player;
  const venter = w2.createMonster('probe_venter', 1, 'enemy');
  venter.pos = vec(p2.pos.x + 900, p2.pos.y);
  w2.actors.push(venter);
  step(w2, LITE_CFG.regen.every + 0.1);
  const vpk = w2.litePockets.findIndex(q => q.anchorId === venter.id);
  const seeded = w2.litePockets[vpk].live;
  const vinst = venter.skills.find(s => s?.def.id === 'vent_vermin');
  venter.useLock = 0; venter.mana = venter.maxMana();
  w2.executeSkill(venter, vinst!, vec(venter.pos.x, venter.pos.y));
  check('vent: a colony anchor pours INTO its own pocket (the cap sees it)',
    w2.litePockets[vpk].live > seeded && w2.litePockets[vpk].live === w2.lite.liveCount,
    `pocket ${seeded} → ${w2.litePockets[vpk].live}`);
  delete MONSTERS.probe_venter;
}

// --- 5) THE TRAMPLE LANE: speed, weight, the stat, fliers, symmetry ---------
{
  const w = makeSimWorld('summoner', 0x5a06);
  const p = w.player;
  MONSTERS.probe_squish = {
    id: 'probe_squish', name: 'Probe Squish', color: '#fff', shape: 'circle',
    radius: 5, base: { life: 5, moveSpeed: 0, mana: 0 }, skills: [], xp: 2,
    plies: { count: 1 },
    lite: { contact: { damage: 0 }, speed: 0, trample: {} },
  };
  MONSTERS.probe_shellback = {
    id: 'probe_shellback', name: 'Probe Shellback', color: '#fff', shape: 'circle',
    radius: 5, base: { life: 5, moveSpeed: 0, mana: 0 }, skills: [], xp: 0,
    plies: { count: 2 },
    lite: { contact: { damage: 0 }, speed: 0, trample: { minWeight: 2.4 } },
  };
  MONSTERS.probe_flit = {
    id: 'probe_flit', name: 'Probe Flit', color: '#fff', shape: 'circle',
    radius: 5, base: { life: 5, moveSpeed: 0, mana: 0 }, skills: [], xp: 0,
    flier: true,
    lite: { contact: { damage: 0 }, speed: 0, trample: {} },
  };
  const ks = w.liteKindOf('probe_squish');
  const ka = w.liteKindOf('probe_shellback');
  const kf = w.liteKindOf('probe_flit');
  // Three rows UNDER the seat, one of each kind.
  w.lite.spawn(ks, p.pos.x + 2, p.pos.y, 0, 0, 1);
  w.lite.spawn(ka, p.pos.x - 2, p.pos.y, 0, 0, 2);
  w.lite.spawn(kf, p.pos.x, p.pos.y + 2, 0, 0, 1);
  // Standing still: nobody dies underfoot (the speed gate).
  p.velEst.x = 0; p.velEst.y = 0;
  w.update(1 / 60);
  check('trample: standing among the crawl kills nothing (speed gate)',
    w.lite.liveCount === 3);
  // Moving at a walk: the soft kind dies; armor and wings survive.
  const xp0 = w.seats[0].meta.xp + 0;
  p.velEst.x = 200; p.velEst.y = 0;
  w.update(1 / 60);
  check('trample: a walking crossing crushes the soft kind ONLY',
    w.lite.liveCount === 2, `live ${w.lite.liveCount}`);
  step(w, 0.1);
  check('trample: the crush pays the kind\'s xp bounty (credited kill)',
    w.seats[0].meta.xp > xp0, `xp ${xp0} → ${w.seats[0].meta.xp}`);
  // The trample STAT: added mass meets the juggernaut gate; wings never.
  p.sheet.setSource('probe', [mod('trample', 'flat', 2)]);
  p.velEst.x = 200;
  w.update(1 / 60);
  check('trample: the trample stat carries the shellback gate — fliers NEVER',
    w.lite.liveCount === 1, `live ${w.lite.liveCount}`);
  p.velEst.x = 200;
  step(w, 0.5);
  check('trample: the flier stands whatever crosses beneath it',
    w.lite.liveCount === 1);
  p.sheet.setSource('probe', []);
  // SYMMETRY: a moving foe scatters the PLAYER-SIDE crawl. Rows seated
  // UNDER the foe (touching rims — the crush needs true overlap), team 1
  // wild (owner 0 dodges the orphan-disband law's re-wilding). The small
  // foe is honestly too LIGHT to crush anything (weight derives from the
  // body — 0.24 for this frame): the trample STAT carries the monster
  // side of the lane exactly as it carries the player's.
  const ogre = w.createMonster('probe_squish', 1, 'enemy');
  ogre.pos = vec(p.pos.x + 500, p.pos.y);
  w.actors.push(ogre);
  for (const dx of [-2, 0, 2]) {
    w.lite.spawn(ks, ogre.pos.x + dx, ogre.pos.y, 1, 0, 1);
  }
  const countMine = (): number => {
    let n = 0;
    for (let i = 0; i < w.lite.used; i++) {
      if (w.lite.alive[i] && w.lite.team[i] === 1 && w.lite.kind[i] === ks) n++;
    }
    return n;
  };
  check('trample: the light foe cannot crush (weight honesty, monster side)',
    countMine() === 3 && (ogre.velEst.x = 220, w.update(1 / 60), countMine() === 3),
    `mine ${countMine()}`);
  ogre.sheet.setSource('probe', [mod('trample', 'flat', 2)]);
  ogre.velEst.x = 220;
  w.update(1 / 60);
  check('trample: symmetric — the STAT carries a foe over your crawl',
    countMine() === 0, `mine ${countMine()}`);
  delete MONSTERS.probe_squish;
  delete MONSTERS.probe_shellback;
  delete MONSTERS.probe_flit;
}

// --- 6) PLY REND: the exterminator's edge, both gates -----------------------
{
  const w = makeSimWorld('summoner', 0x5a07);
  const p = w.player;
  MONSTERS.probe_plywall = {
    id: 'probe_plywall', name: 'Probe Plywall', color: '#fff', shape: 'circle',
    radius: 12, base: { life: 100, moveSpeed: 0, mana: 0 }, skills: [], xp: 0,
    plies: { count: 3 },
  };
  const wall = w.createMonster('probe_plywall', 1, 'enemy');
  wall.pos = vec(p.pos.x + 60, p.pos.y);
  w.actors.push(wall);
  p.useLock = 0; p.mana = p.maxMana();
  w.executeSkill(p, makeSkillInstance(nova, 1), vec(p.pos.x, p.pos.y));
  check('plyRend 0: one blow, one tear (the standing law)',
    wall.plies === 2, `plies ${wall.plies}`);
  p.sheet.setSource('probe', [mod('plyRend', 'flat', 2)]);
  p.useLock = 0; p.mana = p.maxMana();
  w.executeSkill(p, makeSkillInstance(nova, 1), vec(p.pos.x, p.pos.y));
  check('plyRend 2: one blow tears three — the wall is SPENT, life untouched',
    wall.plies === 0 && wall.life === wall.maxLife(),
    `plies ${wall.plies}`);
  // The pool carve: a 2-ply row dies to ONE rended carve.
  MONSTERS.probe_shellrow = {
    id: 'probe_shellrow', name: 'Probe Shellrow', color: '#fff', shape: 'circle',
    radius: 5, base: { life: 5, moveSpeed: 0, mana: 0 }, skills: [], xp: 0,
    plies: { count: 2 },
    lite: { contact: { damage: 0 }, speed: 0 },
  };
  const kr = w.liteKindOf('probe_shellrow');
  w.lite.spawn(kr, p.pos.x + 40, p.pos.y, 0, 0, 2);
  p.useLock = 0; p.mana = p.maxMana();
  w.executeSkill(p, makeSkillInstance(nova, 1), vec(p.pos.x, p.pos.y));
  check('plyRend: the carve rends too — a 2-ply row dies to one blow',
    w.lite.liveCount === 0, `live ${w.lite.liveCount}`);
  p.sheet.setSource('probe', []);
  delete MONSTERS.probe_plywall;
  delete MONSTERS.probe_shellrow;
}

// --- 7) DETERMINISM: regrowth draws no global rand --------------------------
{
  const run = (): string => {
    seedGlobalRandom(0xd37e12);
    const w = makeSimWorld('summoner', 0x5a08);
    const p = w.player;
    const heart = vec(p.pos.x + 550, p.pos.y);
    w.devLitePocket('vermin_tide', heart, 10);
    // Thin it (disturb), leave, let it regrow — the full law in one arc.
    p.useLock = 0; p.mana = p.maxMana(); p.facing = 0;
    w.executeSkill(p, makeSkillInstance(farBolt, 1), heart);
    step(w, LITE_CFG.regen.quietSec + 8);
    const pool = w.lite;
    const rows: string[] = [];
    for (let i = 0; i < pool.used; i++) {
      if (!pool.alive[i]) continue;
      rows.push(`${pool.kind[i]}:${pool.x[i].toFixed(3)},${pool.y[i].toFixed(3)}:${pool.plies[i]}:${pool.pocket[i]}`);
    }
    return `${w.lite.liveCount}|${rows.sort().join(';')}`;
  };
  const a = run(), b = run();
  check('determinism: two seeded arcs are byte-identical through regrowth',
    a === b && a.length > 8);
}

console.log(failed ? `\n${failed} FAILED` : '\nALL PASS');
process.exit(failed ? 1 : 0);
