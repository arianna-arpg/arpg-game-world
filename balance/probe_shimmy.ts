// ---------------------------------------------------------------------------
// ONE-OFF PROBE — THE SHIMMY LAW (engine/world.ts Dwell.rearmIfWilled +
// Seat.lastMovedAt; her ask 2026-09-11): a station dwell that fired stays
// spent while the seat merely STANDS there (closing the dialog alone never
// re-opens it), stays spent through an UNWILLED displacement (a gust, a
// shove — the body moved, the player did not), and RE-ARMS on a willed step
// taken in range, so the next still linger re-opens the dialog without
// walking out of range and back. The Font is the rig's station (Lastlight
// always raises one); every Dwell-class gate shares the law by construction.
//
//   npx tsx balance/probe_shimmy.ts
// ---------------------------------------------------------------------------

import { makeSimWorld } from '../src/sim/arena';
import { seedGlobalRandom } from '../src/sim/rng';
import { START_ZONE } from '../src/data/zones';
import { SALVAGE_CFG } from '../src/data/essences';

let pass = 0, fail = 0;
const check = (name: string, ok: boolean, detail = ''): void => {
  if (ok) { pass++; console.log(`  ok  ${name}`); }
  else { fail++; console.log(`FAIL  ${name}${detail ? ` — ${detail}` : ''}`); }
};

seedGlobalRandom(9111);
const w = makeSimWorld('warrior', 9111);
w.loadZone(START_ZONE);
const f = w.fonts[0];
check('A1 Lastlight raises the rig\'s station (a Font)', !!f);
if (f) {
  const poll = (dt: number): void => (w as unknown as { updateFont(dt: number): void }).updateFont(dt);
  const still = (): void => { w.player.push = null; w.player.casting = null; w.localSeat.lastActedAt = -100; };
  const linger = (): boolean => { w.fontDwellRequested = false; still(); poll(0); poll(SALVAGE_CFG.stationDwell + 0.1); return w.fontDwellRequested; };
  // The approach: from outside range (arms the station latch), onto the Font.
  w.player.pos = { x: f.pos.x + 500, y: f.pos.y }; poll(0);
  w.player.pos = { ...f.pos };
  check('A2 a deliberate linger at the Font asks for the dialog', linger());
  w.time += 1;
  check('A3 standing there, still, asks nothing more (closing the dialog alone never re-opens it)', !linger());
  // THE GUST: the body moves, the player did not — no stamp, no re-arm.
  w.time += 1;
  w.player.pos = { x: f.pos.x + 6, y: f.pos.y + 2 };
  check('A4 an unwilled displacement in range asks nothing (a gust is not a shimmy)', !linger());
  // THE SHIMMY: a willed step (moveActor — the input's own path) in range.
  w.time += 1;
  const before = w.localSeat.lastMovedAt;
  w.moveActor(w.player, 1, 0, 0.05);
  check('A5 a willed step stamps the seat\'s lastMovedAt', w.localSeat.lastMovedAt === w.time && w.localSeat.lastMovedAt > before);
  check('A6 the step alone does not fire (the linger must still end and build)', !w.fontDwellRequested);
  check('A7 …then a still linger re-opens the dialog without leaving range', linger());
  w.time += 1;
  check('A8 and the latch is spent again until the next willed step', !linger());
  // Out and back still works exactly as before.
  w.time += 1;
  w.player.pos = { x: f.pos.x + 500, y: f.pos.y }; poll(0);
  w.player.pos = { ...f.pos };
  check('A9 stepping out of range and back re-arms as it always did', linger());
}

console.log(`\nprobe_shimmy: ${pass} pass, ${fail} fail`);
process.exit(fail ? 1 : 0);
