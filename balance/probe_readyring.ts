// ---------------------------------------------------------------------------
// THE READY RING. keepDistance is what a skill prefers, and it only speaks while that
// skill can fire. Pinned on the real engine against a hero who stands still:
//   1. A body held off by a skill that does not hit now swings when that skill rests.
//   2. It still uses the skill that keeps distance: the ranged game is not lost.
//   3. Closer tokens hold a pack to a few bodies walking in on one prey.
//   4. The player's court and a body under an encounter order keep the old read.
//   5. A skill with no possible target asks for no distance, and costs no press.
// docs/design/npc-ai-direction.md is the plan. Run: npx tsx balance/probe_readyring.ts
// ---------------------------------------------------------------------------

import { makeSimWorld } from '../src/sim/arena';
import { seedGlobalRandom } from '../src/sim/rng';
import { mod } from '../src/engine/stats';
import { BEHAVIOR_CFG } from '../src/engine/brain';
import { claimCloser, skillCanFire, updateAI } from '../src/engine/ai';
import { setSimTap } from '../src/engine/tap';
import { runEpisode } from '../src/sim/runner';
import { matchupDuel, pilotFor } from '../src/sim/data/scenarios';
import { ensureTierBuild } from '../src/sim/data/builds';
import type { Actor } from '../src/engine/actor';
import type { World } from '../src/engine/world';

let failed = 0;
const check = (name: string, ok: boolean, detail = ''): void => {
  console.log(`${ok ? 'PASS' : 'FAIL'}  ${name}${detail ? ' — ' + detail : ''}`);
  if (!ok) failed++;
};

function rig(seed: number): { w: World; p: Actor } {
  seedGlobalRandom(seed);
  const w = makeSimWorld('warrior', seed), p = w.player;
  p.skills = []; p.casting = null;
  p.sheet.setSource('probe-rig', [mod('life', 'override', 1e7), mod('moveSpeed', 'override', 0)]);
  p.fillResources();
  w.actors = [p];
  return { w, p };
}

function field(w: World, p: Actor, id: string, gap: number, team: 'enemy' | 'player' = 'enemy', at = 0): Actor {
  const body = w.createMonster(id, 12, team);
  body.pos = { x: p.pos.x + Math.cos(at) * gap, y: p.pos.y + Math.sin(at) * gap };
  body.tier = p.tier;
  body.facing = at + Math.PI;
  w.actors.push(body);
  return body;
}

function run(w: World, seconds: number, each?: (t: number) => void): void {
  const dt = 1 / 60;
  for (let t = 0; t < seconds; t += dt) {
    w.applyInputs(new Map(), dt);
    for (const a of [...w.actors]) updateAI(a, w, dt);
    w.update(dt);
    each?.(t);
  }
}

/** One body on an idle hero: what it pressed, whether it hurt him, and how long it stood in reach. */
function solo(id: string, seed: number, seconds = 25) {
  const { w, p } = rig(seed);
  const body = field(w, p, id, 240);
  const casts = new Map<string, number>(), refused = new Map<string, number>();
  setSimTap({
    onCast: (a, inst) => { if (a === body) casts.set(inst.def.id, (casts.get(inst.def.id) ?? 0) + 1); },
    onRefused: (a, inst) => { if (a === body) refused.set(inst.def.id, (refused.get(inst.def.id) ?? 0) + 1); },
  });
  const full = p.life;
  let first = -1;
  try {
    run(w, seconds, t => { if (first < 0 && p.life < full) first = t; });
  } finally { setSimTap(null); }
  return { casts, refused, first, gap: Math.hypot(body.pos.x - p.pos.x, body.pos.y - p.pos.y) };
}

// --- 1, 2) The last three open defects, and the ranged game --------------------------
{
  const knight = solo('oblivion_knight', 0x71);
  const melee = (knight.casts.get('heavy_strike') ?? 0) + (knight.casts.get('cleave') ?? 0);
  check('oblivion_knight walks in and swings once its curse rests', melee > 0 && knight.first >= 0, JSON.stringify([...knight.casts]));
  check('and it still curses', (knight.casts.get('despair') ?? 0) > 0);
  for (const id of ['formic_tender', 'wickling']) {
    const body = solo(id, 0x72);
    check(`${id} lands a hit on a hero who stands still`, body.first >= 0, `first ${body.first.toFixed(1)}s, ${JSON.stringify([...body.casts])}`);
  }
  const imp = solo('imp', 0x73);
  check('imp volleys, then claws once mana runs dry', (imp.casts.get('fireball') ?? 0) > 0 && (imp.casts.get('claw') ?? 0) > 0, JSON.stringify([...imp.casts]));
  const duel = runEpisode(matchupDuel(ensureTierBuild('geared', 'warrior', 12), 'imp', { level: 12, duration: 25, pilot: pilotFor('warrior'), idTag: 'probe' }), 0x73);
  check('against a hero who fights back it keeps its ranged game', (duel.metrics.melee_share ?? 1) < 0.5, `melee ${duel.metrics.melee_share} of ${duel.metrics.enemy_casts} casts`);
}

// --- 3) Closer tokens ------------------------------------------------------------------
{
  const { w, p } = rig(0x74);
  for (let i = 0; i < 6; i++) field(w, p, 'abyssal_crawler', 300, 'enemy', (i / 6) * Math.PI * 2);
  let peak = 0;
  run(w, 25, () => { peak = Math.max(peak, p.aiCloserClaims?.size ?? 0); });
  const cap = BEHAVIOR_CFG.closers.perPrey;
  check('tokens hold to the cap on one prey', peak <= cap && peak > 0, `peak ${peak}, cap ${cap}`);

  const { w: w2, p: p2 } = rig(0x75);
  const holders = Array.from({ length: cap }, () => field(w2, p2, 'imp', 300));
  const late = field(w2, p2, 'imp', 300);
  check('the first bodies take the tokens', holders.every(h => claimCloser(p2, h, w2)));
  check('the next one waits', !claimCloser(p2, late, w2));
  check('a holder keeps its token while it keeps asking', claimCloser(p2, holders[0], w2));
  w2.seats.push({ ...w2.seats[0], id: 'probe-second' });
  check('a second seat means one more token', claimCloser(p2, late, w2));
  w2.seats.pop();
  w2.actors = [p2];
  w2.update(BEHAVIOR_CFG.closers.claimSec + 0.2);
  const next = field(w2, p2, 'imp', 300);
  check('an unrefreshed token frees', claimCloser(p2, next, w2));
}

// --- 4) Who keeps the old read ---------------------------------------------------------
{
  const { w, p } = rig(0x76);
  const pet = field(w, p, 'imp', 240, 'player');
  const fireball = pet.skills.find(s => s?.def.id === 'fireball');
  check('a pet exists for this rig', !!fireball);
  const foe = field(w, p, 'target_dummy', 0);
  foe.pos = { x: pet.pos.x + 240, y: pet.pos.y };
  const start = { ...pet.pos };
  pet.cooldowns.set('fireball', 999);
  run(w, 3);
  const moved = Math.hypot(pet.pos.x - start.x, pet.pos.y - start.y);
  check('the player\'s court is not asked to close when a skill rests', moved < 200, `moved ${moved.toFixed(0)}`);
}

// --- 5) The truth gate -------------------------------------------------------------------
{
  const behemoth = solo('tundra_behemoth', 0x77);
  check('tundra_behemoth closes and slams with nothing to freeze', (behemoth.casts.get('ground_slam') ?? 0) > 0 && behemoth.gap < 120, `${behemoth.gap.toFixed(0)} away, ${JSON.stringify([...behemoth.casts])}`);
  check('and no press was refused', behemoth.refused.size === 0, JSON.stringify([...behemoth.refused]));
  for (const id of ['emerald_mantis', 'gravemaw_hound', 'grave_shaman']) {
    const body = solo(id, 0x78);
    check(`${id} wastes no decisions on a skill with no target`, body.refused.size === 0, JSON.stringify([...body.refused]));
  }
  const { w, p } = rig(0x79);
  const matron = field(w, p, 'gnoll_matron', 240);
  const mend = matron.skills.find(s => s?.def.id === 'greater_mending')!;
  check('a heal with nobody hurt cannot fire', !skillCanFire(matron, w, mend, p));
  matron.life = matron.maxLife() * 0.5;
  check('and with someone hurt it can', skillCanFire(matron, w, mend, p));
  matron.cooldowns.set('greater_mending', 5);
  check('a skill resting on its cooldown cannot', !skillCanFire(matron, w, mend, p));
}

// --- Same seed, same fight ---------------------------------------------------------------
{
  const a = solo('oblivion_knight', 0x7a), b = solo('oblivion_knight', 0x7a);
  check('no randomness was added: the same seed fights the same fight', JSON.stringify([...a.casts]) === JSON.stringify([...b.casts]) && a.gap === b.gap);
}

console.log(failed ? `\n${failed} FAILURE(S)` : '\nALL PASS');
process.exit(failed ? 2 : 0);
