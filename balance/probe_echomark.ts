// ---------------------------------------------------------------------------
// THE ECHO'S MARK — a 'target' delivery strikes only what targeting
// RESOLVED, and the repeat train (Spell Echo, Unleash, Resounding Echo,
// Cascade, Crescendo) kept only the aim point: every echo of a targeted
// strike or mend landed on nobody while its malus still billed the press.
// The train now carries the press's body and the drain re-resolves through
// the skill's own targeting spec, anchored on it.
//   A  Solar Brand + Spell Echo: the echo strikes the press's mark again
//   B  Solar Brand + Unleash: every banked seal strikes the mark
//   C  the mark dies to the press: the echo finds what a fresh press would,
//      and with nothing left in reach it strikes nothing
//   D  Mend + Spell Echo mends the ally again; alone, it mends the caster
//   E  a CLAIM keeps one roll per press: Tame Beast's echo carries no mark
// ---------------------------------------------------------------------------
import { makeSimWorld } from '../src/sim/arena';
import { seedGlobalRandom } from '../src/sim/rng';
import { makeSkillInstance } from '../src/engine/skills';
import { mod } from '../src/engine/stats';
import { setSimTap } from '../src/engine/tap';
import { SKILLS } from '../src/data/skills';
import { SUPPORTS } from '../src/data/supports';
import type { Actor } from '../src/engine/actor';
import type { SkillInstance } from '../src/engine/skills';
import type { World } from '../src/engine/world';

let failed = 0;
function check(name: string, ok: boolean, detail = ''): void {
  console.log(`${ok ? 'PASS' : 'FAIL'} ${name}${!ok && detail ? ` (${detail})` : ''}`);
  if (!ok) failed++;
}
const step = (w: World, seconds: number): void => { for (let t = 0; t < seconds; t += 1 / 60) w.update(1 / 60); };
// A body that neither evades nor blocks, so every resolved strike lands.
const open = (a: Actor): void => a.sheet.setSource('echomark-probe', [mod('evasion', 'override', 0), mod('blockChance', 'override', 0)]);
const durable = (a: Actor): void => { a.maxLife = () => 1e6; a.life = 1e6; };
// onHeal also fires for every frame of life regeneration; a mend lands at
// least its flat 16, a regen frame a sliver of one point.
const MEND_FLOOR = 5;
const body = (w: World, defId: string, team: 'enemy' | 'player', dx: number): Actor => {
  const a = w.createMonster(defId, 1, team);
  a.aiCooldown = 9999; open(a);
  a.pos = { x: w.player.pos.x + dx, y: w.player.pos.y };
  w.actors.push(a);
  return a;
};
const brandWith = (gem?: string): SkillInstance => {
  const inst = makeSkillInstance(SKILLS.solar_brand, 1);
  if (gem) inst.sockets[0] = { def: SUPPORTS[gem], level: 1 };
  return inst;
};
// Landed strikes from the hero, per victim.
const strikes = (w: World): Map<Actor, number> => {
  const out = new Map<Actor, number>();
  setSimTap({ onHit: (from, to, r) => { if (from === w.player && !r.evaded && !r.immune && r.total > 0) out.set(to, (out.get(to) ?? 0) + 1); } });
  return out;
};

seedGlobalRandom(0xec40);

// A: the echo strikes the press's mark again.
{
  for (const gem of [undefined, 'spell_echo']) {
    const w = makeSimWorld('pyromancer', 0xec40);
    const mark = body(w, 'plains_wolf', 'enemy', 220); durable(mark);
    const landed = strikes(w);
    check(`A: ${gem ?? 'a bare brand'} accepts the press`, w.useSkill(w.player, brandWith(gem), mark.pos));
    step(w, 1.5);
    setSimTap(null);
    const want = gem ? 2 : 1;
    check(`A: ${gem ?? 'a bare brand'} lands ${want} strike(s) on the mark`, landed.get(mark) === want, `landed=${landed.get(mark) ?? 0}`);
  }
}

// B: Unleash's banked seals each strike the mark (a first press finds a full bank).
{
  const w = makeSimWorld('pyromancer', 0xec40);
  const mark = body(w, 'plains_wolf', 'enemy', 220); durable(mark);
  const brand = brandWith('unleash');
  const landed = strikes(w);
  check('B: the unleashed brand accepts the press', w.useSkill(w.player, brand, mark.pos));
  let seals = 0;
  for (let t = 0; t < 1.5; t += 1 / 60) {
    w.update(1 / 60);
    seals = Math.max(seals, w.pendingRepeats.find(r => r.inst === brand)?.n ?? 0);
  }
  setSimTap(null);
  check('B: the press banks at least one seal', seals >= 1, `seals=${seals}`);
  check('B: the press and every seal strike the mark', landed.get(mark) === 1 + seals, `landed=${landed.get(mark) ?? 0}, seals=${seals}`);
}

// C: the press kills its mark, so the echo re-resolves like a fresh press.
{
  const w = makeSimWorld('pyromancer', 0xec40);
  const mark = body(w, 'plains_wolf', 'enemy', 220); mark.life = 1;
  const next = body(w, 'plains_wolf', 'enemy', 340); durable(next);
  const landed = strikes(w);
  check('C: the brand accepts the press', w.useSkill(w.player, brandWith('spell_echo'), mark.pos));
  step(w, 1.5);
  setSimTap(null);
  check('C: the press kills its mark', mark.dead);
  check('C: the echo strikes the next body in reach', landed.get(next) === 1, `next=${landed.get(next) ?? 0}`);
}
{
  const w = makeSimWorld('pyromancer', 0xec40);
  const mark = body(w, 'plains_wolf', 'enemy', 220); mark.life = 1;
  const landed = strikes(w);
  w.useSkill(w.player, brandWith('spell_echo'), mark.pos);
  step(w, 1.5);
  setSimTap(null);
  const total = [...landed.values()].reduce((s, n) => s + n, 0);
  check('C: with nothing left in reach the echo strikes nothing', mark.dead && total === 1, `dead=${mark.dead}, strikes=${total}`);
}

// D: the mend lane. The echo mends the press's ally, or the caster when alone.
{
  for (const gem of [undefined, 'spell_echo']) {
    const w = makeSimWorld('cleric', 0xec40), p = w.player;
    const ally = body(w, 'plains_wolf', 'player', 160); durable(ally); ally.life = 1e5;
    let mends = 0;
    setSimTap({ onHeal: (t, landed) => { if (t === ally && landed >= MEND_FLOOR) mends++; } });
    const mend = makeSkillInstance({ ...SKILLS.mend, requirements: undefined }, 1);
    if (gem) mend.sockets[0] = { def: SUPPORTS[gem], level: 1 };
    check(`D: ${gem ?? 'a bare mend'} accepts the press on the ally`, w.useSkill(p, mend, ally.pos));
    step(w, 1);
    setSimTap(null);
    const want = gem ? 2 : 1;
    check(`D: ${gem ?? 'a bare mend'} mends the ally ${want} time(s)`, mends === want, `mends=${mends}`);
  }
  const w = makeSimWorld('cleric', 0xec40), p = w.player;
  p.life = Math.max(1, p.maxLife() * 0.3);
  let mends = 0;
  setSimTap({ onHeal: (t, landed) => { if (t === p && landed >= MEND_FLOOR) mends++; } });
  const mend = makeSkillInstance({ ...SKILLS.mend, requirements: undefined }, 1);
  mend.sockets[0] = { def: SUPPORTS.spell_echo, level: 1 };
  check('D: alone, the mend falls back on its caster', w.useSkill(p, mend, p.pos));
  step(w, 1);
  setSimTap(null);
  check('D: alone, the echo mends the caster again', mends === 2, `mends=${mends}`);
}

// E: a claim keeps one roll per press. The echo still queues; it carries no mark.
{
  const w = makeSimWorld('pyromancer', 0xec40);
  const beast = body(w, 'plains_wolf', 'enemy', 200);
  const tame = makeSkillInstance({ ...SKILLS.tame_beast, requirements: undefined }, 20, 3);
  tame.sockets[0] = { def: SUPPORTS.spell_echo, level: 1 };
  check('E: the tame press accepts a beast in reach', w.useSkill(w.player, tame, beast.pos));
  let queued = false, marked = false;
  for (let t = 0; t < 3; t += 1 / 60) {
    w.update(1 / 60);
    for (const r of w.pendingRepeats) {
      if (r.inst !== tame) continue;
      queued = true;
      if (r.mark) marked = true;
    }
  }
  check('E: Spell Echo queues an echo of the claim', queued);
  check('E: the claim\'s echo carries no mark (no free re-roll)', queued && !marked);
}

console.log(failed ? `\n${failed} FAILED` : '\nALL PASS');
process.exit(failed ? 1 : 0);
