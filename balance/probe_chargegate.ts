// ---------------------------------------------------------------------------
// ONE-OFF PROBE — CHARGE DISCIPLINE (the gorer's manners): point-blank
// charging stops being the STANDARD tactic at BOTH grains while never
// becoming a ban ("not necessarily an absolute" — the commission):
//   THE NEAR DISCOUNT (ai.ts pickSkill, weighted mode): an ai hint's
//     authored minRange collapses the skill's pick weight inside that
//     distance (× nearWeight ?? BEHAVIOR_CFG.nearDiscount). Rigs: the
//     census teeth (every hinted knockback dash wears a floor; floors stay
//     inside their own envelopes), the LIVE collapse on a real kit at
//     melee range, the residual kept alive, the only-option fire and the
//     hand-press pass (soft gate ≠ hard refusal, hints never gate casts),
//     and the un-authored control at full weight (absent == identical).
//   THE GORE FLOOR (ai.ts chargeKernel): inside chargeNear.floor the
//     locked rush waits on a residual roll window (rollSec × chance) —
//     collapse near, moments kept over a long stand, unbroken commit from
//     range, and chargeFloor: 0 the exact old-behavior restore.
// AI is CALLER-DRIVEN in sim rigs (updateAI per subject + w.update per
// frame — the readers' idiom); the subjects fight a player-team POST at
// arena center with the hero parked out of acquisition range.
// Run: npx tsx balance/probe_chargegate.ts
// ---------------------------------------------------------------------------

import { bootSimEngine, makeSimWorld } from '../src/sim/arena';
import { seedGlobalRandom } from '../src/sim/rng';
import { MONSTERS } from '../src/data/monsters';
import { SKILLS } from '../src/data/skills';
import { BEHAVIOR_CFG } from '../src/engine/brain';
import { updateAI } from '../src/engine/ai';
import { vec } from '../src/core/math';
import type { Actor } from '../src/engine/actor';

let failed = 0;
const check = (name: string, ok: boolean, detail = ''): void => {
  console.log(`${ok ? 'PASS' : 'FAIL'}  ${name}${detail ? ' — ' + detail : ''}`);
  if (!ok) failed++;
};

bootSimEngine();
seedGlobalRandom(0xC0DE);

const DT = 1 / 60;

// Probe bodies — PINNED (moveSpeed 0) so every trial's geometry is exact.
// probe_cd_gorer mirrors the tusker shape (charge + heavy_strike, weighted
// default); probe_cd_ctrl swaps the authored floor for an un-authored dash
// (dash_strike carries NO minRange — the absent==identical control);
// probe_cd_bull wears the aurochs' exact charge-kernel row.
MONSTERS.probe_cd_gorer = {
  id: 'probe_cd_gorer', name: 'Probe Gorer', color: '#aa8855', shape: 'octagon',
  radius: 16, base: { life: 400, moveSpeed: 0, accuracy: 100, mana: 200, manaRegen: 20 },
  skills: ['charge', 'heavy_strike'], xp: 1, faction: 'beast',
  brain: { type: 'basic' },
};
MONSTERS.probe_cd_solo = {
  id: 'probe_cd_solo', name: 'Probe Solo', color: '#aa8855', shape: 'octagon',
  radius: 16, base: { life: 400, moveSpeed: 0, accuracy: 100, mana: 200, manaRegen: 20 },
  skills: ['charge'], xp: 1, faction: 'beast',
  brain: { type: 'basic' },
};
MONSTERS.probe_cd_ctrl = {
  id: 'probe_cd_ctrl', name: 'Probe Control', color: '#77aa88', shape: 'octagon',
  radius: 16, base: { life: 400, moveSpeed: 0, accuracy: 100, mana: 200, manaRegen: 20 },
  skills: ['dash_strike', 'heavy_strike'], xp: 1, faction: 'beast',
  brain: { type: 'basic' },
};
MONSTERS.probe_cd_bull = {
  id: 'probe_cd_bull', name: 'Probe Bull', color: '#9c7a4e', shape: 'hexagon',
  radius: 16, base: { life: 400, moveSpeed: 0, accuracy: 100, mana: 30, manaRegen: 4 },
  skills: ['heavy_strike'], xp: 1, faction: 'beast',
  detection: 3, // rig F stands at 300px — the lock, not the commit gate, is under test
  brain: { type: 'juggernaut', move: { style: 'charge', commitRange: 340, chargeSpeed: 2.6 } },
};
MONSTERS.probe_cd_bull_floor0 = {
  id: 'probe_cd_bull_floor0', name: 'Probe Bull Unfloored', color: '#9c7a4e', shape: 'hexagon',
  radius: 16, base: { life: 400, moveSpeed: 0, accuracy: 100, mana: 30, manaRegen: 4 },
  skills: ['heavy_strike'], xp: 1, faction: 'beast',
  brain: {
    type: 'juggernaut',
    move: { style: 'charge', commitRange: 340, chargeSpeed: 2.6, chargeFloor: 0 },
  },
};
// The standing prey: a big still player-team body the subjects lock onto.
MONSTERS.probe_cd_post = {
  id: 'probe_cd_post', name: 'Probe Post', color: '#8899aa', shape: 'circle',
  radius: 13, base: { life: 6000, moveSpeed: 0, accuracy: 100, mana: 0 },
  skills: ['heavy_strike'], xp: 1, faction: 'beast',
  brain: { type: 'basic' },
};

const w = makeSimWorld('warrior', 0xC0DE1);
// Park the hero out of acquisition range: the subjects must lock the POST.
for (const a of w.actors) if (w.seatOf(a)) a.pos = vec(60, 60);
const C = vec(w.arena.w / 2, w.arena.h / 2);

const post = w.createMonster('probe_cd_post', 6, 'player');
post.pos = vec(C.x, C.y);
w.actors.push(post);

const spawnAt = (id: string, d: number): Actor => {
  post.pos = vec(C.x, C.y);
  post.life = post.maxLife();
  const m = w.createMonster(id, 6, 'enemy');
  m.pos = vec(C.x + d, C.y);
  w.actors.push(m);
  return m;
};
const despawn = (m: Actor): void => {
  const i = w.actors.indexOf(m);
  if (i >= 0) w.actors.splice(i, 1);
};

// First skill the AI PICKS from a cold spawn at distance d ('' = none yet).
const firstPick = (id: string, d: number, frames = 120): string => {
  const m = spawnAt(id, d);
  let picked = '';
  for (let f = 0; f < frames && !picked; f++) {
    updateAI(m, w, DT);
    w.update(DT);
    picked = m.aiLastSkill?.id ?? '';
  }
  despawn(m);
  return picked;
};

// --- A) The census teeth (pure data) ----------------------------------------
{
  const dashHinted = Object.values(SKILLS)
    .filter(s => s.delivery.type === 'dash' && !!s.ai);
  const shovers = dashHinted
    .filter(s => (s.effects ?? []).some(e => e.type === 'knockback'));
  const bare = shovers.filter(s => !((s.ai!.minRange ?? 0) > 0)).map(s => s.id);
  check('census: every hinted KNOCKBACK dash wears a minRange floor (the propel law)',
    shovers.length >= 3 && bare.length === 0,
    `${shovers.length} shovers${bare.length ? '; bare: ' + bare.join(',') : ''}`);
  const trio = ['charge', 'shield_charge', 'dune_surge'];
  check('census: the three authored floors stand (charge 140 / shield_charge 120 / dune_surge 120)',
    trio.every(id => (SKILLS[id]?.ai?.minRange ?? 0) > 0),
    trio.map(id => `${id}:${SKILLS[id]?.ai?.minRange ?? 0}`).join(' '));
  const swallowed = dashHinted
    .filter(s => s.ai!.minRange !== undefined && s.ai!.minRange >= s.ai!.range)
    .map(s => s.id);
  check('census: no floor swallows its own envelope (minRange < range)',
    swallowed.length === 0, swallowed.join(','));
  const badNear = Object.values(SKILLS)
    .filter(s => s.ai?.nearWeight !== undefined
      && !(s.ai.nearWeight > 0 && s.ai.nearWeight <= 1))
    .map(s => s.id);
  check('census: authored nearWeight stays a DISCOUNT in (0, 1]', badNear.length === 0,
    badNear.join(','));
  const cn = BEHAVIOR_CFG.chargeNear;
  check('census: the kernel dials are sane (floor > 0, chance in (0,1), rollSec > 0)',
    cn.floor > 0 && cn.chance > 0 && cn.chance < 1 && cn.rollSec > 0
    && BEHAVIOR_CFG.nearDiscount > 0 && BEHAVIOR_CFG.nearDiscount < 1,
    `floor ${cn.floor} chance ${cn.chance} roll ${cn.rollSec} discount ${BEHAVIOR_CFG.nearDiscount}`);
}

// --- B) The pick collapse at melee range (the commission's complaint) -------
// Kit charge (w2, floored) + heavy_strike (w3) at d=50 (< minRange 140):
// full weights would pick charge 2/5 = 40% of cold spawns; the discount
// leaves 0.3/3.3 ≈ 9%. Assert the collapse AND the residual both alive.
{
  const TRIALS = 200;
  let charges = 0, none = 0;
  for (let i = 0; i < TRIALS; i++) {
    const p = firstPick('probe_cd_gorer', 50);
    if (p === 'charge') charges++;
    else if (p === '') none++;
  }
  check('pick: point-blank charge COLLAPSES below standard (< 22% of picks; was 40% at full weight)',
    none === 0 && charges / TRIALS < 0.22, `${charges}/${TRIALS} charges, ${none} no-pick`);
  check('pick: the residual still fires (soft gate, never a ban)', charges >= 1,
    `${charges}/${TRIALS}`);
}

// --- C) Absent == identical: the un-authored control keeps full weight ------
// dash_strike (w2, NO minRange) + heavy_strike (w3) at the same d=50: the
// dash keeps its honest 40% share — the discount only engages where authored.
{
  const TRIALS = 120;
  let dashes = 0, none = 0;
  for (let i = 0; i < TRIALS; i++) {
    const p = firstPick('probe_cd_ctrl', 50);
    if (p === 'dash_strike') dashes++;
    else if (p === '') none++;
  }
  check('pick: an un-authored dash hint keeps FULL point-blank weight (absent == identical)',
    none === 0 && dashes / TRIALS > 0.28, `${dashes}/${TRIALS} dashes, ${none} no-pick`);
}

// --- D) Soft ≠ hard: the only usable skill fires, and presses never gate ----
{
  let fired = 0;
  for (let i = 0; i < 10; i++) if (firstPick('probe_cd_solo', 50) === 'charge') fired++;
  check('pick: charge as the ONLY usable skill still fires point-blank (10/10)', fired === 10,
    `${fired}/10`);
  const m = spawnAt('probe_cd_solo', 30);
  const inst = m.skills.find(s => s?.def.id === 'charge');
  const pressed = !!inst && w.useSkill(m, inst, vec(C.x, C.y));
  check('press: useSkill ignores hints entirely — a point-blank charge CAST is never refused',
    pressed);
  despawn(m);
}

// --- E) THE GORE FLOOR: the kernel balks point-blank but keeps its moments --
// The aurochs' exact spec row, pinned at d=80 (inside floor 130, outside the
// touching refusal): the old kernel committed on the FIRST tick, every time.
// Now the commit waits on the residual clock — and over a long stand it must
// still land at least once (the moment) without becoming the standard again.
{
  const m = spawnAt('probe_cd_bull', 80);
  let commits = 0, prev = '';
  let firstAt = -1;
  const SECONDS = 90;
  for (let f = 0; f < SECONDS * 60; f++) {
    updateAI(m, w, DT);
    w.update(DT);
    const ph = m.aiPhase ?? '';
    if (ph === 'charge_recover' && prev !== 'charge_recover') {
      commits++;
      if (firstAt < 0) firstAt = f * DT;
    }
    prev = ph;
    m.pos = vec(C.x + 80, C.y); // hold the stand: the roll clock is the subject
    post.pos = vec(C.x, C.y);
    post.life = post.maxLife();
  }
  check('kernel: point-blank commits are RARE, not instant (first commit ≥ 1.2s, was tick one)',
    firstAt < 0 || firstAt >= 1.2, `first at ${firstAt.toFixed(2)}s`);
  check('kernel: the gorer keeps its MOMENTS over a 90s stand (≥ 1 commit, ≤ 20)',
    commits >= 1 && commits <= 20, `${commits} commits`);
  despawn(m);
}

// --- F) From range the charge is UNBROKEN (the identity stays) --------------
{
  const m = spawnAt('probe_cd_bull', 300);
  let at = -1;
  for (let f = 0; f < 120 && at < 0; f++) {
    updateAI(m, w, DT);
    w.update(DT);
    if (m.dash || m.aiPhase === 'charge_recover') at = f * DT;
  }
  check('kernel: from 300px (past the floor) the commit fires within a second', at >= 0 && at < 1,
    `at ${at.toFixed(2)}s`);
  despawn(m);
}

// --- G) chargeFloor: 0 restores the old launch-from-anywhere EXACTLY --------
{
  const m = spawnAt('probe_cd_bull_floor0', 80);
  let at = -1;
  for (let f = 0; f < 60 && at < 0; f++) {
    updateAI(m, w, DT);
    w.update(DT);
    if (m.dash || m.aiPhase === 'charge_recover') at = f * DT;
  }
  check('kernel: chargeFloor 0 = the old point-blank instant commit (the restore lever)',
    at >= 0 && at < 0.2, `at ${at.toFixed(2)}s`);
  despawn(m);
}

console.log(failed ? `PROBE FAIL (${failed})` : 'PROBE OK');
process.exit(failed ? 1 : 0);
