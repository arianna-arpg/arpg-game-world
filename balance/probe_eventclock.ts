// ---------------------------------------------------------------------------
// ONE-OFF PROBE — THE WANING LAW on the real engine: no in-zone event can be
// held open ad infinitum. The kill-fed encounter clock (Breach, the Mirror
// Rift, and every future kill-fed def — the rigs enumerate the registry, so
// new defs enroll themselves) draws bonus time from a FINITE, cumulative well
// (scale.maxBonusTime); the REACHABLE CEILING (timer + unspent well) falls at
// wall-clock rate however hard the field is farmed, so total life can never
// exceed baseTime + maxBonusTime. The moment the well runs dry the def's wane
// tell speaks, once. The deadwake tide's POUR WELL (the ebb) rides the same
// law at the overlay: holding + pouring spends a finite budget; roaming spends
// nothing.
// Run: npx tsx balance/probe_eventclock.ts
// ---------------------------------------------------------------------------

import { makeSimWorld } from '../src/sim/arena';
import { allEncounterSpecs, PACKAGE_BY_ID } from '../src/packages/registry';
import { FACTIONS } from '../src/data/monsters';
import { vec, type Vec2 } from '../src/core/math';
import type { ActiveEncounter } from '../src/engine/encounter';
import type { EncounterDef } from '../src/packages/encounters';
import type { Actor } from '../src/engine/actor';
import type { OverlayView } from '../src/world/overlay';

let failed = 0;
const check = (name: string, ok: boolean, detail = ''): void => {
  console.log(`${ok ? 'PASS' : 'FAIL'}  ${name}${detail ? ' — ' + detail : ''}`);
  if (!ok) failed++;
};

const dt = 1 / 60;

/** The private engine seams the rigs drive (TS-private is compile-time only —
 *  the probe reaches the same members the engine itself runs). */
interface WorldInternals {
  encounters: ActiveEncounter[];
  openEncounter(e: ActiveEncounter): void;
  clampPos(p: Vec2, r: number): Vec2;
  createMonster(type: string, level: number, team: 'enemy'): Actor;
  texts: { text: string }[];
}

// Boot once so the package factions are grafted before we enumerate rosters.
makeSimWorld('juggernaut', 1);

// === A. ENROLLMENT ===========================================================
// The registry census proper lives in eventqa (the waning group); here we only
// prove the rigs below actually cover the kill-fed lane.
const killFed = allEncounterSpecs().filter(e => e.timePerKill > 0 && !e.extract && !e.borough);
check('A1 enrollment: the kill-fed lane is populated (breach + mirror rift at least)',
  killFed.length >= 2, killFed.map(e => e.id).join(', '));
check('A2 enrollment: every kill-fed def carries its wane tell',
  killFed.every(e => !!e.waneText), killFed.filter(e => !e.waneText).map(e => e.id).join(', ') || 'all told');

// === B. THE FARM RIG =========================================================
// Perpetual screen-wipe: three minted casualties per tick (≈180 kills/sec —
// far beyond any real clear rate), every one fed through the REAL kill() path
// (credited to the player; noBounty so the arena isn't buried in loot). The
// field must still close by baseTime + maxBonusTime.
function farmRig(def: EncounterDef): void {
  const world = makeSimWorld('juggernaut', 4242);
  const w = world as unknown as WorldInternals;
  world.player.invulnerable = true; // the field's own spawns fight back — the clock is the subject
  const scale = def.scales[0];
  const enc: ActiveEncounter = {
    def, scale, pos: w.clampPos(vec(world.player.pos.x + 220, world.player.pos.y), 24),
    phase: 'dormant', radius: scale.startRadius, timer: 0, maxTimer: 0, spawnTimer: 0,
    kills: 0, bonusUsed: 0, spawned: new Set(),
  };
  w.encounters.push(enc);
  w.openEncounter(enc);

  const ceiling = scale.baseTime + scale.maxBonusTime;
  const table = FACTIONS[def.factions[0]]?.table ?? [];
  check(`B0 ${def.id}: the def's lead faction fields bodies`, table.length > 0, def.factions[0]);

  let frames = 0, timerCapOk = true, bonusOk = true, reachOk = true;
  let lastBonus = 0, lastReach = Infinity, waneFlips = 0, prevWaned = false, sawWaneText = false;
  const maxFrames = Math.ceil((ceiling + 30) / dt);
  while (enc.phase === 'open' && frames < maxFrames) {
    for (let k = 0; k < 3 && table.length; k++) {
      const m = w.createMonster(table[0].id, Math.max(1, world.zone.level), 'enemy');
      m.noBounty = true; // no loot/xp spam — kill() feeds the clock before the bounty gate
      m.pos = vec(enc.pos.x, enc.pos.y);
      enc.spawned.add(m.id);
      world.actors.push(m);
      world.kill(m, false, world.player);
    }
    world.update(dt);
    frames++;
    if (enc.timer > enc.maxTimer + 1e-6) timerCapOk = false;
    if (enc.bonusUsed < lastBonus - 1e-6 || enc.bonusUsed > scale.maxBonusTime + 1e-6) bonusOk = false;
    lastBonus = enc.bonusUsed;
    // THE THEOREM: the reachable ceiling (timer + unspent well) only ever
    // falls — kills move time between the two pools, never mint it.
    const reach = enc.timer + (scale.maxBonusTime - enc.bonusUsed);
    if (reach > lastReach + 1e-3) reachOk = false;
    lastReach = reach;
    if (enc.waned && !prevWaned) {
      waneFlips++;
      if (def.waneText && w.texts.some(t => t.text === def.waneText)) sawWaneText = true;
    }
    prevWaned = !!enc.waned;
  }
  const elapsed = frames * dt;

  check(`B1 ${def.id}: perpetual farming cannot hold the field open`,
    enc.phase !== 'open', `phase='${enc.phase}' after ${elapsed.toFixed(1)}s`);
  check(`B2 ${def.id}: it lived exactly its authored ceiling (${ceiling}s)`,
    Math.abs(elapsed - ceiling) <= 0.6, `elapsed=${elapsed.toFixed(2)}s`);
  check(`B3 ${def.id}: timer never exceeded maxTimer`, timerCapOk);
  check(`B4 ${def.id}: the well is cumulative — monotone, capped, fully spent`,
    bonusOk && enc.bonusUsed >= scale.maxBonusTime - 1e-6,
    `bonusUsed=${enc.bonusUsed.toFixed(2)}/${scale.maxBonusTime}`);
  check(`B5 ${def.id}: the reachable ceiling only ever fell`, reachOk);
  check(`B6 ${def.id}: the wane latched exactly once, at the dry well`,
    waneFlips === 1 && !!enc.waned, `flips=${waneFlips}`);
  check(`B7 ${def.id}: the wane tell spoke (def.waneText floated)`, sawWaneText);

  // Post-open phases refuse the feed: a kill during the collapse moves nothing.
  if (enc.phase === 'collapsing' && table.length) {
    const t0 = enc.timer, b0 = enc.bonusUsed;
    const m = w.createMonster(table[0].id, Math.max(1, world.zone.level), 'enemy');
    m.noBounty = true;
    m.pos = vec(enc.pos.x, enc.pos.y);
    enc.spawned.add(m.id);
    world.actors.push(m);
    world.kill(m, false, world.player);
    check(`B8 ${def.id}: a kill during the collapse feeds nothing`,
      enc.timer === t0 && enc.bonusUsed === b0);
  }
  // The end state is terminal and bounded: the collapse (or plain close) lands.
  const tailFrames = Math.ceil(((def.veil?.collapseSec ?? 0) + 8) / dt);
  let tail = 0;
  while (w.encounters.includes(enc) && enc.phase !== 'closing' && enc.phase !== 'door' && tail < tailFrames) {
    world.update(dt);
    tail++;
  }
  check(`B9 ${def.id}: the field ended in a terminal phase`,
    !w.encounters.includes(enc) || enc.phase === 'closing' || enc.phase === 'door',
    `phase='${enc.phase}'`);
}
for (const def of killFed) farmRig(def);

// === C. THE UNFED CONTROL ====================================================
// No kills at all: the clock is honest — the field closes at baseTime.
function unfedRig(def: EncounterDef): void {
  const world = makeSimWorld('juggernaut', 4242);
  const w = world as unknown as WorldInternals;
  world.player.invulnerable = true;
  const scale = def.scales[0];
  const enc: ActiveEncounter = {
    def, scale, pos: w.clampPos(vec(world.player.pos.x + 220, world.player.pos.y), 24),
    phase: 'dormant', radius: scale.startRadius, timer: 0, maxTimer: 0, spawnTimer: 0,
    kills: 0, bonusUsed: 0, spawned: new Set(),
  };
  w.encounters.push(enc);
  w.openEncounter(enc);
  let frames = 0;
  const maxFrames = Math.ceil((scale.baseTime + 10) / dt);
  while (enc.phase === 'open' && frames < maxFrames) { world.update(dt); frames++; }
  const elapsed = frames * dt;
  check(`C1 ${def.id}: unfed, it closes at baseTime (${scale.baseTime}s)`,
    enc.phase !== 'open' && Math.abs(elapsed - scale.baseTime) <= 0.5, `elapsed=${elapsed.toFixed(2)}s`);
  check(`C2 ${def.id}: unfed, the wane never speaks (no kills, no dry well)`, !enc.waned);
}
for (const def of killFed) unfedRig(def);

// === D. THE DEADWAKE EBB (overlay-pure) ======================================
// The tide's pour well: holding + pouring spends it; roaming spends nothing;
// at zero the wake recedes on its own and the engine's drain hears it once.
{
  const gate = { active: true, share: 1, pressure: 1, ignitionMul: 1, severityMul: 1, concurrencyMul: 1 };
  interface DwField {
    update(d: number, v: OverlayView): void;
    devIgnite(v: OverlayView, z: string): boolean;
    deadwakeOn(z: string): { pourFrac: number; streamCap: number } | null;
    drainEbbed(): { x: number; y: number }[];
    peek(): ReadonlyArray<{ pourFrac: number }>;
    surge(): { pourBudgetSec: number; falterFrac: number; radius: number };
    snapshot(): unknown;
    restore(s: unknown): void;
  }
  const mk = (): DwField => PACKAGE_BY_ID['deadwake'].world!.overlay!(
    { seed: 0xdead, gate: () => gate, biomeSeed: 0xdead }) as unknown as DwField;
  // Two fake charted nodes far apart; z1 hosts the tide, z2 is "elsewhere".
  const zone = (id: string, x: number): unknown =>
    ({ id, name: id, map: { x, y: 0 }, level: 12, objective: { kind: 'clear' } });
  const mkView = (time: number, currentZoneId: string): OverlayView => ({
    time, currentZoneId,
    byId: { z1: zone('z1', 0), z2: zone('z2', 400) },
    nodes: [zone('z1', 0), zone('z2', 400)],
    visited: new Set(['z1', 'z2']),
    terrain: () => 'land',
  } as unknown as OverlayView);

  // ENGAGED: the well drains and the tide ebbs at its budget, exactly once.
  const f = mk();
  const budget = f.surge().pourBudgetSec;
  check('D0 deadwake: devIgnite plants the tide on the fake ground', f.devIgnite(mkView(0, 'z1'), 'z1'));
  let t = 0;
  const step = 0.5;
  // Just short of the budget: still pouring, and reading FALTERING by now.
  while (t < budget - step) { f.update(step, mkView(t, 'z1')); t += step; }
  const nearDry = f.deadwakeOn('z1');
  check('D1 deadwake: just short of the budget the tide still pours', !!nearDry);
  check('D2 deadwake: the pour well drained toward empty (pre-ebb falter tell live)',
    !!nearDry && nearDry.pourFrac <= f.surge().falterFrac, `pourFrac=${nearDry?.pourFrac.toFixed(3)}`);
  // Snapshot mid-pour → a fresh field restores the SPENT well (no free refill).
  const g = mk();
  g.restore(f.snapshot());
  check('D3 deadwake: a restored tide keeps its spent well (no save-scum refill)',
    g.peek().length === 1 && g.peek()[0].pourFrac <= f.surge().falterFrac,
    `restored pourFrac=${g.peek()[0]?.pourFrac.toFixed(3)}`);
  // Over the line: the wake recedes, and the drain hears exactly one ebb.
  while (t < budget + 2) { f.update(step, mkView(t, 'z1')); t += step; }
  check('D4 deadwake: at its budget the tide EBBS (no wake stands)', f.deadwakeOn('z1') === null && f.peek().length === 0);
  const ebbs = f.drainEbbed();
  check('D5 deadwake: the engine drain hears the ebb exactly once', ebbs.length === 1 && f.drainEbbed().length === 0);

  // ROAMING: the well never drains — the stalking identity stands untouched.
  // (The player stands on ground the tide does not cover: currentZoneId names
  // a zone outside the view, so the drifting wake can never read as engaged —
  // a wake that WANDERS onto the player's zone pours, and pouring spends,
  // which is the law working, not roaming.)
  const r = mk();
  r.devIgnite(mkView(0, 'z1'), 'z1');
  let rt = 0;
  while (rt < budget + 60) { r.update(step, mkView(rt, 'nowhere')); rt += step; }
  check('D6 deadwake: a ROAMING tide spends nothing (persists past the budget, well full)',
    r.peek().length === 1 && r.peek()[0].pourFrac === 1, `pourFrac=${r.peek()[0]?.pourFrac}`);
}

console.log(failed ? `\nprobe_eventclock: ${failed} FAILURE(S)` : '\nprobe_eventclock: ALL PASS');
process.exit(failed ? 1 : 0);
