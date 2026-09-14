import { bootSimEngine, makeSimWorld } from '../src/sim/arena';
import { seedGlobalRandom } from '../src/sim/rng';
import { vec, dist } from '../src/core/math';
import { Rng } from '../src/core/rng';
import { attackPatternPoints } from '../src/engine/attackPatterns';
import { runAIActions } from '../src/engine/aiActions';
import { updateAI } from '../src/engine/ai';
import { generateLayout } from '../src/engine/levelgen';
import { lairLandmarkRolls } from '../src/engine/lairs';
import { mod } from '../src/engine/stats';
import { ARENA_BOSS_HABITATS } from '../src/data/arenaBossHabitats';
import { ARENA_BOSS_LOOKS, ARENA_BOSS_PATTERNS } from '../src/data/arenaBosses';
import { MONSTERS } from '../src/data/monsters';
import { SKILLS } from '../src/data/skills';
import { sidezoneOf } from '../src/data/sidezones';
import { DOODAD_VISUALS } from '../src/data/doodadVisuals';
import { PART_PAINTERS } from '../src/render/vis/parts';

let fails = 0;
function check(name: string, ok: boolean): void {
  console.log(`${ok ? 'PASS' : 'FAIL'} ${name}`);
  if (!ok) fails++;
}
bootSimEngine();
seedGlobalRandom(0xa8e4);
const w = makeSimWorld('warrior', 0xa8e4);
const home = w.zone.id;
const enter = (kind: string) => (w as unknown as { enterSidezone(p: {
  pos: { x: number; y: number }; seed: number; kind: string;
}): void }).enterSidezone({ pos: vec(400, 400), seed: 1234, kind });
const seenPatterns = new Set<number>();
const step = (seconds: number) => {
  for (let i = 0; i < Math.ceil(seconds * 30); i++) {
    for (const a of w.actors) if (!a.dead) updateAI(a, w, 1 / 30);
    for (const z of w.zones) if (z.attackPattern) seenPatterns.add(z.caster.id);
    w.update(1 / 30);
  }
};
w.player.sheet.setSource('arenaProbe', [mod('life', 'flat', 1e7), mod('lifeRegen', 'flat', 1e6)]);
w.player.life = w.player.maxLife();
for (const id of ['sweep', 'backwash'] as const) {
  const p = ARENA_BOSS_PATTERNS[id];
  check(`${id}: a real player fits between ranks`, p.points.every(q =>
    Math.hypot(q.x - 180, q.y) > p.radius + w.player.radius));
}

for (const row of ARENA_BOSS_HABITATS) {
  const mouth = `${row.id}_gate`;
  const sz = sidezoneOf(mouth)!;
  check(`${row.id}: door is registered and painted`, !!sz && !!DOODAD_VISUALS[mouth]);
  const ctx = { parent: w.zone, seed: 1234, id: `probe_${row.id}`, pos: vec(400, 400),
    playerLevel: 20, pkgActive: () => false };
  const def = sz.mint(ctx);
  check(`${row.id}: deterministic mint`, JSON.stringify(def) === JSON.stringify(sz.mint(ctx)));
  check(`${row.id}: boss objective and sealed den`, def.objective.kind === 'boss'
    && def.objective.id === row.boss && def.noDeeper === true && def.fauna?.length === 0);
  const floor = generateLayout(def, def.size, new Rng(1234), vec(540, 980), [vec(540, 980)]);
  check(`${row.id}: boss on walkable reserved seat`, !!floor.bossSeat && !!floor.walk
    && floor.walk.isWalkable(floor.bossSeat.x, floor.bossSeat.y));
  for (const p of Object.values(ARENA_BOSS_PATTERNS)) {
    const marks = attackPatternPoints(p, floor.bossSeat!, Math.PI / 2);
    check(`${row.id}: every authored mark stays on floor`, marks.every(m => floor.walk!.isWalkable(m.pos.x, m.pos.y)));
  }
  const seats = (level: number, biome = row.biomes[0]) => lairLandmarkRolls({
    place: 'surface', biome, level, tileset: biome,
  }).some(r => r.landmark === `${row.id}_mouth`);
  check(`${row.id}: regional level gate`, !seats(row.level - 1) && seats(row.level + 3) && !seats(30, 'meadow'));
  for (const look of Object.values(ARENA_BOSS_LOOKS)) {
    check(`${row.id}: anatomy painters exist`, [...look.parts, ...(look.live ?? [])].every(p => !!PART_PAINTERS[p.kind]));
  }

  w.player.pos = vec(400, 400);
  enter(mouth);
  const boss = w.actors.find(a => a.defId === row.boss)!;
  check(`${row.id}: live root is stationary`, !!boss && !!boss.stationary && boss.anchored);
  const start = vec(boss.pos.x, boss.pos.y);
  w.player.pos = vec(start.x, start.y + 230);
  step(1);
  // No artificial wake: real proximity must open this fight.
  check(`${row.id}: approach wakes the arena`, !boss.ambushArmed);
  w.pushActor(boss, 0, 900, w.player);
  w.moveActor(boss, 1, 1, 1);
  step(3);
  check(`${row.id}: no pursuit or forced displacement`, dist(start, boss.pos) < 0.01);
  check(`${row.id}: fixed anatomy faces the court`, Math.abs(boss.facing - Math.PI / 2) < 0.001);
  check(`${row.id}: live choreography warns`, seenPatterns.has(boss.id));

  if (row.boss === 'arena_boss_organ') {
    check('organ: two hittable pipes', boss.partActors?.length === 2);
    const bass = boss.partActors?.find(a => a.defId === 'arena_boss_bass_pipe');
    if (bass) w.kill(bass, false, w.player);
    check('organ: breaking bass bans only its own voice', !!boss.aiSkillBans?.has('arena_boss_bass')
      && !boss.aiSkillBans?.has('arena_boss_treble'));
    step(0.1);
    check('organ: broken voice clears its warnings', !w.zones.some(z => z.caster === boss
      && z.attackPattern && z.inst.def.id === 'arena_boss_bass'));
  }
  boss.life = boss.maxLife() * 0.35;
  const phases = new Set<string>();
  for (let i = 0; i < 22; i++) {
    step(1);
    phases.add(boss.brain?.script?.[boss.aiScriptIdx]?.id ?? '');
  }
  check(`${row.id}: wounded phase reached`, [...phases].some(p => ['requiem', 'hot', 'bloom_banks'].includes(p)));
  if (row.boss === 'arena_boss_mireheart') check('mire: tide and recovery cycle', phases.has('bloom_channel') && phases.has('bloom_drained'));
  if (row.boss === 'arena_boss_crucible') check('crucible: reverse sweep and opening cycle', phases.has('hot_backwash') && phases.has('hot_breath'));
  w.kill(boss, false, w.player);
  step(0.2);
  check(`${row.id}: victory completes objective and clears patterns`, w.objectiveDone
    && !w.zones.some(z => z.caster === boss && z.attackPattern));
  const exit = w.exits.find(e => e.to === home);
  check(`${row.id}: a return exit exists`, !!exit);
  if (exit) {
    w.player.pos = vec(exit.pos.x, exit.pos.y);
    (w as unknown as { travelThrough(e: typeof exit): void }).travelThrough(exit);
  }
  check(`${row.id}: return reaches original zone`, w.zone.id === home);
  enter(mouth);
  check(`${row.id}: cleared fight stays cleared on re-entry`, w.objectiveDone
    && !w.actors.some(a => !a.dead && a.defId === row.boss));
  const returnExit = w.exits.find(e => e.to === home)!;
  (w as unknown as { travelThrough(e: typeof returnExit): void }).travelThrough(returnExit);
}

// A fresh seed is a fresh encounter. Abandoning a wounded, disarmed boss
// restarts the whole body, not just its already-paid breakable limbs.
const retryWorld = makeSimWorld('warrior', 0xbe4a);
const retryHome = retryWorld.zone.id;
const retryEnter = () => (retryWorld as unknown as { enterSidezone(p: {
  pos: { x: number; y: number }; seed: number; kind: string;
}): void }).enterSidezone({ pos: vec(400, 400), seed: 5678, kind: 'arena_boss_ossuary_gate' });
retryEnter();
let retryBoss = retryWorld.actors.find(a => a.defId === 'arena_boss_organ')!;
retryWorld.player.pos = vec(retryBoss.pos.x, retryBoss.pos.y + 180);
for (let i = 0; i < 30; i++) retryWorld.update(1 / 30);
const pipe = retryBoss.partActors?.[0];
check('retry: breakable limb exists', !!pipe);
if (pipe) retryWorld.kill(pipe, false, retryWorld.player);
retryBoss.life = retryBoss.maxLife() * 0.5;
retryWorld.loadZone(retryHome); // leave-time capture, as death/travel does
retryEnter();
retryBoss = retryWorld.actors.find(a => a.defId === 'arena_boss_organ')!;
check('retry: full health and no inherited part bans', retryBoss.life === retryBoss.maxLife()
  && !retryBoss.aiSkillBans?.size && retryBoss.aiScriptIdx === -1);

// Aim locks at the warning and the source owns both damage and cancellation.
w.loadZone(home);
const caster = w.createMonster('arena_boss_crucible', 1, 'enemy');
caster.pos = vec(700, 400); caster.aiAnchor = vec(700, 400);
w.actors.push(caster);
w.player.pos = vec(900, 400);
w.zones.length = 0;
runAIActions(w, caster, [{ do: 'attackPattern', skill: 'arena_boss_furnace',
  bearing: 'target', pattern: { points: [{ x: 200, y: 0 }], radius: 55, delay: 1.4 } }], w.player);
const mark = w.zones[0];
check('pattern: skill and source identity preserved', mark.caster === caster && mark.inst.def === SKILLS.arena_boss_furnace);
const warned = vec(mark.pos.x, mark.pos.y);
w.player.pos = vec(700, 600);
check('pattern: dodging does not move a warning', dist(warned, mark.pos) === 0);
const life = w.player.life;
const tickZones = (dt: number) => (w as unknown as { updateZones(dt: number): void }).updateZones(dt);
tickZones(1.5);
check('pattern: a dodged mark deals no damage', w.player.life === life);
w.player.pos = vec(900, 400);
runAIActions(w, caster, [{ do: 'attackPattern', skill: 'arena_boss_furnace',
  bearing: 0, pattern: { points: [{ x: 200, y: 0 }], radius: 55, delay: 1.4 } }], w.player);
tickZones(1);
check('pattern: warning does not hurt early', w.player.life === life);
tickZones(0.5);
check('pattern: standing in the impact deals real damage', w.player.life < life);
runAIActions(w, caster, [{ do: 'attackPattern', skill: 'arena_boss_furnace',
  bearing: 0, pattern: { points: [{ x: 200, y: 0 }], radius: 55, delay: 1.4, linger: 3 } }], w.player);
caster.dead = true;
tickZones(2);
check('pattern: source death cancels pending impacts', !w.zones.some(z => z.caster === caster && z.attackPattern));
check('bosses: ordinary lair reward table', ARENA_BOSS_HABITATS.every(r => MONSTERS[r.boss].loot === 'lair_hoard'));
console.log(`Arena bosses: ${fails} failure(s)`);
process.exitCode = fails ? 1 : 0;
