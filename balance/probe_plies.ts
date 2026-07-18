// ---------------------------------------------------------------------------
// ONE-OFF PROBE — THE PLY FABRIC end to end on the real engine
// (docs/engine/plies.md): the magnitude-blind eat (a 500-damage slam and a
// gnat nip each cost exactly one ply, no life moves), the exposed phase
// (spent plies = ordinary wounds), the thud floor (sub-floor hits tear
// nothing and wound nothing), the spentStatus bracket, DoTs piercing to
// the live life pool underneath (the anti-swarm lane), kill() ignoring
// plies entirely (self-destruction stays sovereign), the minionPlies
// owner lever under the throng's batch scale (QUANTA LAW: +2 plies is +2
// on every body, never 2/batch), and rebake idempotence (spent plies stay
// spent through the live investment refresh).
// Run: npx tsx balance/probe_plies.ts
// ---------------------------------------------------------------------------

import { bootSimEngine, makeSimWorld } from '../src/sim/arena';
import { seedGlobalRandom } from '../src/sim/rng';
import { MONSTERS } from '../src/data/monsters';
import { makeSkillInstance, type SkillDef } from '../src/engine/skills';
import { PLY_CFG, plyCountOf } from '../src/engine/plies';
import { mod } from '../src/engine/stats';
import { vec } from '../src/core/math';

let failed = 0;
const check = (name: string, ok: boolean, detail = ''): void => {
  console.log(`${ok ? 'PASS' : 'FAIL'}  ${name}${detail ? ' — ' + detail : ''}`);
  if (!ok) failed++;
};

bootSimEngine();
seedGlobalRandom(0x971e5);

// A deterministic striker kit: flat rolls, no crit surprises.
const slam = {
  id: 'probe_slam', name: 'Probe Slam', noDrop: true, description: '',
  tags: ['spell'], color: '#fff',
  manaCost: 0, cooldown: 0, useTime: 0,
  baseDamage: { physical: [500, 500] as [number, number] },
  delivery: { type: 'melee', range: 80, arcDeg: 180 },
  effects: [{ type: 'damage' }],
} as SkillDef;
const tickle = {
  ...slam, id: 'probe_tickle', name: 'Probe Tickle',
  baseDamage: { physical: [3, 3] as [number, number] },
} as SkillDef;

// --- 0) Pure laws + shipped wear -------------------------------------------
{
  check('pure: plyCountOf = count + floor(perLevel × (level-1))',
    plyCountOf({ count: 2 }, 9) === 2
    && plyCountOf({ count: 2, perLevel: 0.5 }, 9) === 6);
  check('registry: the throng kinds wear the model (4 / 2 / 1)',
    MONSTERS.cinderkin.plies?.count === 4
    && MONSTERS.palewisp.plies?.count === 2
    && MONSTERS.gnatling.plies?.count === 1);
}

// --- 1) The magnitude-blind eat + the exposed phase ------------------------
{
  const w = makeSimWorld('summoner', 0x9e11);
  const p = w.player;
  w.devThrongGrant('gather_cinderkin');
  w.devThrongMint('gather_cinderkin', 1);
  const b = w.throngBodiesOf(p, 'gather_cinderkin')[0];
  const brute = w.createMonster('zombie', 8, 'enemy');
  brute.pos = vec(b.pos.x + 30, b.pos.y);
  brute.sheet.setSource('probe', [mod('accuracy', 'increased', 30)]);
  w.actors.push(brute);

  const lifeFull = b.life;
  check('mint: a claimed cinderkin stands at 4/4 plies, full life',
    b.plies === 4 && b.pliesMax === 4 && lifeFull === b.maxLife());
  const swing = (def: SkillDef): void => {
    brute.useLock = 0; brute.mana = brute.maxMana();
    w.executeSkill(brute, makeSkillInstance(def, 1), vec(b.pos.x, b.pos.y));
  };
  swing(slam);
  check('eat: a 500-damage slam tears ONE ply and moves NO life',
    b.plies === 3 && b.life === lifeFull, `plies ${b.plies}, life ${b.life}/${lifeFull}`);
  swing(slam); swing(slam); swing(slam);
  check('spent: four blows strip the coat, life still whole',
    b.plies === 0 && b.life === lifeFull && !b.dead);
  swing(tickle);
  check('exposed: with plies spent, hits wound life normally',
    b.life < lifeFull && b.life > 0, `life ${b.life.toFixed(1)}`);
}

// --- 2) The thud floor + the spentStatus bracket ---------------------------
{
  // A probe-only kind: high floor, a worn-open tell. Registered live —
  // createMonster reads the registry at mint.
  MONSTERS.probe_plyling = {
    id: 'probe_plyling', name: 'Probe Plyling',
    color: '#ffffff', shape: 'circle', radius: 8, material: 'chitin',
    base: { life: 30, moveSpeed: 100, mana: 0 },
    skills: [], xp: 0,
    plies: { count: 2, floor: 10, spentStatus: 'harried' },
  };
  const w = makeSimWorld('summoner', 0x9e22);
  const p = w.player;
  const b = w.createMonster('probe_plyling', 1, 'enemy');
  b.pos = vec(p.pos.x + 30, p.pos.y);
  w.actors.push(b);
  p.sheet.setSource('probe', [mod('accuracy', 'increased', 30)]);
  const lifeFull = b.life;
  const swing = (def: SkillDef): void => {
    p.useLock = 0; p.mana = p.maxMana();
    w.executeSkill(p, makeSkillInstance(def, 1), vec(b.pos.x, b.pos.y));
  };
  swing(tickle);
  check('thud: a sub-floor hit tears NOTHING and wounds NOTHING',
    b.plies === 2 && b.life === lifeFull, `plies ${b.plies}, life ${b.life}`);
  swing(slam);
  check('floor: a real blow past the floor tears normally', b.plies === 1);
  swing(slam);
  check('bracket: the LAST tear stamps the spentStatus (worn open)',
    b.plies === 0 && b.statuses.some(s => s.id === 'harried'));
  delete MONSTERS.probe_plyling;
}

// --- 3) DoTs pierce; kill() is sovereign -----------------------------------
{
  const w = makeSimWorld('summoner', 0x9e33);
  const p = w.player;
  w.devThrongGrant('gather_cinderkin');
  w.devThrongMint('gather_cinderkin', 2);
  const [a, b] = w.throngBodiesOf(p, 'gather_cinderkin');
  const lifeFull = a.life;
  a.applyStatus('burn', 12, 1, 'probe');
  for (let t = 0; t < 2; t += 1 / 60) w.update(1 / 60);
  check('dots pierce: the burn drips LIFE while plies stand untouched',
    a.plies === a.pliesMax && a.life < lifeFull,
    `plies ${a.plies}/${a.pliesMax}, life ${a.life.toFixed(1)}/${lifeFull}`);
  check('kill() is sovereign: full plies never stop deliberate unmaking',
    (w.kill(b, true), b.dead === true));
}

// --- 4) The minionPlies lever: quanta under the batch scale ----------------
{
  const w = makeSimWorld('summoner', 0x9e44);
  const p = w.player;
  p.sheet.setSource('probe', [mod('minionPlies', 'flat', 2)]);
  w.devThrongGrant('gather_cinderkin');
  w.devThrongMint('gather_cinderkin', 1); // bakes at 1/batch — plies must NOT scale
  const b = w.throngBodiesOf(p, 'gather_cinderkin')[0];
  check('quanta law: +2 minionPlies is +2 on the body, never 2/batch',
    b.pliesMax === 6 && b.plies === 6, `pliesMax ${b.pliesMax}`);
  // Spend one, rebake (the live investment refresh) — spent stays spent.
  b.plies = 5;
  const inst = p.skills.find(s => s?.def.id === 'gather_cinderkin')!;
  w.bakeMinionOwnerStats(b, p, inst, 1 / 5);
  check('rebake idempotence: spent plies stay spent through the refresh',
    b.pliesMax === 6 && b.plies === 5, `${b.plies}/${b.pliesMax}`);
  // The lever withdrawn: ceiling falls, spent count preserved.
  p.sheet.setSource('probe', []);
  w.bakeMinionOwnerStats(b, p, inst, 1 / 5);
  check('withdrawal: the ceiling follows the sheet down, spent preserved',
    b.pliesMax === 4 && b.plies === 3, `${b.plies}/${b.pliesMax}`);
}

// --- 5) The pip contract (renderer reads these exact fields) ---------------
{
  check('cfg: pip row levers exist (renderer contract)',
    PLY_CFG.pip.r > 0 && PLY_CFG.pip.gap > 0 && PLY_CFG.floor >= 0);
}

console.log(failed ? `\n${failed} FAILURE(S)` : '\nALL PASS');
process.exit(failed ? 2 : 0);
