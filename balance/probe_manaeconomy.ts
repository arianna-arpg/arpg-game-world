// ---------------------------------------------------------------------------
// THE MANA POOLS (src/data/monsterMana.ts; decision C20): a caster runs dry only in a
// long fight or against a build that drains it, never routinely. Pinned on the engine:
//   A. Every row names a real monster and raises its pool above the def's own.
//   B. Only enemy mints wear it: the same body summoned for the player, or claimed,
//      keeps its def's pool.
//   C. A tuned body casts for at least 40 s against a hero who stands in its reach, and
//      still runs dry within 120 s.
//   D. A kit whose dry-out is its identity keeps it: the imp runs out of fire and claws.
//   E. Kits paced by mana alone are left to their pacing, on purpose.
// docs/design/npc-ai-direction.md records the pass. Run: npx tsx balance/probe_manaeconomy.ts
// ---------------------------------------------------------------------------

import { bootSimEngine, makeSimWorld } from '../src/sim/arena';
import { seedGlobalRandom } from '../src/sim/rng';
import { updateAI } from '../src/engine/ai';
import { mod } from '../src/engine/stats';
import { MONSTERS } from '../src/data/monsters';
import { MONSTER_MANA_TUNED } from '../src/data/monsterMana';

let failed = 0;
const check = (name: string, ok: boolean, detail = ''): void => {
  console.log(`${ok ? 'PASS' : 'FAIL'}  ${name}${detail ? ' — ' + detail : ''}`);
  if (!ok) failed++;
};

bootSimEngine();

/** One body against a hero who stands in its reach and cannot die: when it first could not
 *  afford its cheapest mana skill, or -1 if it never ran dry. */
function firstDry(id: string, seconds: number): number {
  seedGlobalRandom(0x3a7a);
  const w = makeSimWorld('warrior', 0x3a7a), p = w.player;
  p.skills = []; p.casting = null;
  p.sheet.setSource('probe-rig', [mod('life', 'override', 1e7), mod('moveSpeed', 'override', 0)]);
  p.fillResources();
  const b = w.createMonster(id, 12, 'enemy');
  const costs = b.skills.filter(s => s?.def.ai).map(s => b.skillCost(s!).mana).filter(c => c > 0);
  const cheapest = Math.min(...costs);
  b.pos = { x: p.pos.x + 200, y: p.pos.y }; b.tier = p.tier; b.facing = Math.PI;
  w.actors = [p, b];
  const dt = 1 / 60;
  for (let t = 0; t < seconds; t += dt) {
    w.applyInputs(new Map(), dt);
    for (const a of [...w.actors]) updateAI(a, w, dt);
    w.update(dt);
    if (b.mana < cheapest) return t;
  }
  return -1;
}

const rows = Object.entries(MONSTER_MANA_TUNED);

// --- A) The rows ------------------------------------------------------------------------------
{
  const bad = rows.filter(([id, pool]) => !MONSTERS[id] || !(pool > (MONSTERS[id].base.mana ?? 0)));
  check('every row names a real monster and raises its pool', rows.length > 0 && !bad.length, bad.map(([id]) => id).join(', ') || `${rows.length} rows`);
}

// --- B) Enemy mints only ------------------------------------------------------------------------
{
  const [id, pool] = rows[0];
  const w = makeSimWorld('warrior', 9);
  const enemy = w.createMonster(id, 12, 'enemy'), ally = w.createMonster(id, 12, 'player');
  check(`an enemy ${id} brings its tuned pool`, Math.round(enemy.maxMana()) === pool, `${Math.round(enemy.maxMana())} of ${pool}`);
  check('the same body on the player\'s side keeps its def\'s pool', Math.round(ally.maxMana()) === (MONSTERS[id].base.mana ?? 0), String(Math.round(ally.maxMana())));
  w.tameCompanion(w.player, enemy, 'tame_beast');
  check('and so does one the player claims', Math.round(enemy.maxMana()) === (MONSTERS[id].base.mana ?? 0), String(Math.round(enemy.maxMana())));
}

// --- C) An ordinary fight does not drain it; a long one does --------------------------------------
{
  const sample = rows.map(([id]) => id).sort().filter((_, i) => i % 5 === 0);
  const read = sample.map(id => ({ id, dry: firstDry(id, 120) }));
  const early = read.filter(r => r.dry >= 0 && r.dry < 40), never = read.filter(r => r.dry < 0);
  check('a tuned body casts for at least 40 s against a hero in its reach', !early.length,
    early.map(r => `${r.id} ${r.dry.toFixed(1)}s`).join(', ') || read.map(r => `${r.id} ${r.dry.toFixed(0)}s`).join(', '));
  check('and still runs dry in a fight of two minutes', !never.length, never.map(r => r.id).join(', '));
}

// --- D) The imp keeps its rhythm ---------------------------------------------------------------------
{
  const dry = firstDry('imp', 30);
  check('the imp still runs out of fire early and turns to its claw', !('imp' in MONSTER_MANA_TUNED) && dry >= 0 && dry < 20, `${dry.toFixed(1)}s`);
}

// --- E) Paced by mana alone, on purpose ---------------------------------------------------------------
{
  const paced = ['saint_crown', 'goetic_binder', 'regents_urn', 'reliquary_ark', 'wagon_gunner', 'crusade_culverin', 'breach_rimehusk', 'mirage_dancer', 'abyssal_render'];
  const tuned = paced.filter(id => id in MONSTER_MANA_TUNED);
  check('kits paced by mana alone keep their pacing', !tuned.length, tuned.join(', '));
}

console.log(failed ? `\n${failed} FAILURE(S)` : '\nALL PASS');
process.exit(failed ? 2 : 0);
