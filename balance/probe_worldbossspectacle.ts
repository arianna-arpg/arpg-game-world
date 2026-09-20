import { bootSimEngine, makeSimWorld } from '../src/sim/arena';
import { seedGlobalRandom } from '../src/sim/rng';
import { vec, dist } from '../src/core/math';
import { runAIActions } from '../src/engine/aiActions';
import { updateAI } from '../src/engine/ai';
import { attackPatternPoints } from '../src/engine/attackPatterns';
import { MONSTERS } from '../src/data/monsters';
import { SKILLS } from '../src/data/skills';
import { WORLDBOSS_ENCOUNTER_PATTERNS as P } from '../src/data/worldBossEncounters';

let fails = 0;
const check = (name: string, ok: boolean) => {
  console.log(`${ok ? 'PASS' : 'FAIL'} ${name}`);
  if (!ok) fails++;
};
bootSimEngine(); seedGlobalRandom(0xc01055);
const w = makeSimWorld('warrior', 0xc01055);
w.player.invulnerable = true;
const tickZones = (dt: number) => (w as unknown as { updateZones(dt: number): void }).updateZones(dt);
const tickParts = () => (w as unknown as { updateParts(): void }).updateParts();

// Escape routes include the player's whole body, not just its center.
const bothHands = [...P.leftHand.points, ...P.rightHand.points];
check('mountain: full-body central approach stays clear', [150, 250, 350, 450, 550].every(x =>
  bothHands.every(p => Math.hypot(x - p.x, p.y) > P.leftHand.radius + w.player.radius)));
check('wyrm: full-body seam between fissures', [180, 340, 500, 660].every(x =>
  P.fault.points.every(p => Math.hypot(x - p.x, p.y) > P.fault.radius + w.player.radius)));
const ringGap = vec(Math.cos(Math.PI / 10) * 290, Math.sin(Math.PI / 10) * 290);
check('upheaval: full-body radial escape through a gap', P.upheaval.points.every(p =>
  dist(p, ringGap) > P.upheaval.radius + w.player.radius));
check('upheaval: inner refuge is outside every blast', P.upheaval.points.every(p =>
  Math.hypot(p.x, p.y) > P.upheaval.radius + 170 + w.player.radius));
check('patterns: bounded marks and readable warnings', Object.values(P).every(p =>
  p.points.length <= 10 && attackPatternPoints(p, vec(0, 0), 0).every(q =>
    Number.isFinite(q.delay) && q.delay >= 1.7)));

for (const id of ['primeval_cragmaw', 'primeval_wyrm_head']) {
  w.actors = [w.player]; w.zones.length = 0;
  const b = w.createMonster(id, 1, 'enemy');
  b.pos = vec(750, 600); b.aiAnchor = vec(750, 600); b.facing = 0;
  w.springAmbush(b, true); b.invulnerable = true;
  w.actors.push(b); tickParts(); w.player.pos = vec(1050, 600);
  const script = b.brain!.script!;
  const first = script[0];
  runAIActions(w, b, first.onEnter!, w.player);
  check(`${id}: warnings preserve source and skill identity`, w.zones.length > 0
    && w.zones.every(z => z.attackPattern && z.caster === b && z.inst.def === SKILLS[z.inst.def.id]));
  const positions = w.zones.map(z => vec(z.pos.x, z.pos.y));
  b.pos = vec(740, 590); b.facing = 1.5; w.player.pos = vec(990, 640);
  check(`${id}: turning and dodging cannot move warnings`, w.zones.every((z, i) => dist(z.pos, positions[i]) === 0));
  const part = b.partActors!.find(p => p.partLink?.def.breakDisables?.length)!;
  check(`${id}: real attack organ exists`, !!part);
  const skill = id === 'primeval_cragmaw' ? 'primeval_left_hand' : 'primeval_venom_well';
  tickZones(2.05); w.kill(part, false, w.player);
  check(`${id}: part death bans its own skill`, !!b.aiSkillBans?.has(skill));
  tickZones(0.01);
  check(`${id}: part death clears pending and lingering attacks`, !w.zones.some(z => z.inst.def.id === skill));
  w.zones.length = 0; runAIActions(w, b, first.onEnter!, w.player);
  check(`${id}: later cycles cannot regrow the attack`, !w.zones.some(z => z.inst.def.id === skill));
  check(`${id}: other attacks survive the break`, w.zones.length > 0);

  // Real AI clock: never assign phase indexes. Burst damage still owes
  // every opening, and low life must eventually reach the final act.
  const visited = new Set<string>(); b.life = b.maxLife() * 0.15;
  let gemDrops = 0;
  const dropGem = w.dropGemAt;
  w.dropGemAt = () => { gemDrops++; };
  for (let i = 0; i < 60 * 30; i++) {
    w.time += 1 / 30; updateAI(b, w, 1 / 30);
    visited.add(script[b.aiScriptIdx]?.id ?? ''); tickZones(1 / 30);
  }
  w.dropGemAt = dropGem;
  const final = id === 'primeval_cragmaw' ? 'landslide' : 'fury';
  check(`${id}: AI reaches final attack and recovery`, visited.has(final) && visited.has(`${final}_open`));
  check(`${id}: every promised opening occurs`, script.filter(p => p.id?.endsWith('_open')).every(p => visited.has(p.id!)));
  check(`${id}: looping phases cannot farm gems`, gemDrops === 0);
  if (id === 'primeval_wyrm_head') check('wyrm: brood called once across cycles',
    w.actors.filter(a => a.tag === 'wyrm_brood').length === 5);
  w.kill(b, false, w.player); tickZones(0.01);
  check(`${id}: death cancels owned patterns`, !w.zones.some(z => z.caster === b));
}

w.actors = [w.player]; w.zones.length = 0;
const caster = w.createMonster('primeval_cragmaw', 1, 'enemy');
caster.pos = vec(600, 600); w.actors.push(caster);
w.player.pos = vec(900, 600); w.player.invulnerable = false;
const cast = () => runAIActions(w, caster, [{ do: 'attackPattern', skill: 'primeval_crownfall',
  at: 'target', pattern: P.crownfall }], w.player);
cast(); const life = w.player.life; tickZones(1);
check('crownfall: warning never damages early', w.player.life === life);
w.player.pos = vec(1100, 600); tickZones(1.1);
check('crownfall: leaving the mark avoids damage', w.player.life === life);
cast(); tickZones(2.1);
check('crownfall: impact deals real damage', w.player.life < life);
check('scale: mountain dwarfs hero without extra base life',
  caster.radius >= w.player.radius * 6 && MONSTERS.primeval_cragmaw.base.life === 1050);
console.log(`World boss spectacle: ${fails} failure(s)`);
process.exitCode = fails ? 1 : 0;
